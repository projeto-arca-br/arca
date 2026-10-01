import re
import time
from contextlib import contextmanager

import pymysql
import pymysql.cursors

from .configuracao import configuracoes


def conectar():
    return pymysql.connect(
        host=configuracoes.bd_host,
        port=configuracoes.bd_porta,
        user=configuracoes.bd_usuario,
        password=configuracoes.bd_senha,
        database=configuracoes.bd_nome,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        connect_timeout=5,
        init_command="SET time_zone = '+00:00'",
    )


@contextmanager
def cursor():
    conexao = conectar()
    try:
        with conexao.cursor() as cur:
            yield cur
    finally:
        conexao.close()


def esperar_banco(tempo_limite: int | None = None) -> None:
    prazo = time.monotonic() + (configuracoes.bd_espera_segundos if tempo_limite is None else tempo_limite)
    ultimo: Exception | None = None
    while time.monotonic() < prazo:
        try:
            conectar().close()
            return
        except pymysql.MySQLError as exc:
            ultimo = exc
            time.sleep(1)
    raise RuntimeError(f"MariaDB indisponível: {ultimo}")


def dividir_instrucoes(sql: str) -> list[str]:
    """Divide um script SQL em instruções (respeita aspas e comentários --)."""
    sql = re.sub(r"^\s*--.*$", "", sql, flags=re.MULTILINE)
    saida, buf, aspas = [], [], None
    for ch in sql:
        if aspas:
            buf.append(ch)
            if ch == aspas:
                aspas = None
        elif ch in ("'", '"', "`"):
            aspas = ch
            buf.append(ch)
        elif ch == ";":
            instrucao = "".join(buf).strip()
            if instrucao:
                saida.append(instrucao)
            buf = []
        else:
            buf.append(ch)
    resto = "".join(buf).strip()
    if resto:
        saida.append(resto)
    return saida


def _tabela_existe(cur, nome: str) -> bool:
    cur.execute("SHOW TABLES LIKE %s", (nome,))
    return cur.fetchone() is not None


def _preparar_tabela_migracoes(cur) -> None:
    """Garante `migracoes_aplicadas`; renomeia a antiga `schema_migrations` preservando o histórico."""
    if _tabela_existe(cur, "schema_migrations") and not _tabela_existe(cur, "migracoes_aplicadas"):
        cur.execute("RENAME TABLE schema_migrations TO migracoes_aplicadas")
        cur.execute(
            "ALTER TABLE migracoes_aplicadas "
            "CHANGE COLUMN version versao VARCHAR(20) NOT NULL, "
            "CHANGE COLUMN filename arquivo VARCHAR(255) NOT NULL, "
            "CHANGE COLUMN applied_at aplicada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        )
    cur.execute(
        "CREATE TABLE IF NOT EXISTS migracoes_aplicadas ("
        "versao VARCHAR(20) NOT NULL PRIMARY KEY, "
        "arquivo VARCHAR(255) NOT NULL, "
        "aplicada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    )


def rodar_migracoes() -> list[str]:
    """Aplica migrações NNN_*.sql pendentes. Idempotente; serializada por GET_LOCK."""
    arquivos = sorted(
        p for p in configuracoes.diretorio_migracoes.glob("*.sql") if re.match(r"^\d+_.+\.sql$", p.name)
    )
    aplicadas_agora: list[str] = []
    conexao = conectar()
    try:
        with conexao.cursor() as cur:
            cur.execute("SELECT GET_LOCK('arca_migracoes', 60) AS obteve")
            if not cur.fetchone()["obteve"]:
                raise RuntimeError("Não obteve o bloqueio de migrações")
            try:
                _preparar_tabela_migracoes(cur)
                cur.execute("SELECT versao FROM migracoes_aplicadas")
                feitas = {r["versao"] for r in cur.fetchall()}
                for caminho in arquivos:
                    versao = caminho.name.split("_", 1)[0]
                    if versao in feitas:
                        continue
                    for instrucao in dividir_instrucoes(caminho.read_text(encoding="utf-8")):
                        cur.execute(instrucao)
                    cur.execute(
                        "INSERT INTO migracoes_aplicadas (versao, arquivo) VALUES (%s, %s)",
                        (versao, caminho.name),
                    )
                    aplicadas_agora.append(caminho.name)
            finally:
                cur.execute("SELECT RELEASE_LOCK('arca_migracoes')")
    finally:
        conexao.close()
    return aplicadas_agora
