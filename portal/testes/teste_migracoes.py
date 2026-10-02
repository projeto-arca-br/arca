from pathlib import Path

from app import banco
from app.configuracao import configuracoes

REVERSA_003 = (
    Path(configuracoes.diretorio_migracoes) / "down" / "003_traducao_para_portugues.down.sql"
)
REVERSA_005 = (
    Path(configuracoes.diretorio_migracoes) / "down" / "005_tradutor_no_portal.down.sql"
)


REVERSA_006 = (
    Path(configuracoes.diretorio_migracoes)
    / "down"
    / "006_wikipedia_e_notas_no_portal.down.sql"
)


def _tabelas() -> set[str]:
    with banco.cursor() as cur:
        cur.execute("SHOW TABLES")
        return {list(r.values())[0] for r in cur.fetchall()}


def _reverter_003() -> None:
    with banco.cursor() as cur:
        for instrucao in banco.dividir_instrucoes(REVERSA_003.read_text(encoding="utf-8")):
            cur.execute(instrucao)


def teste_rodar_duas_vezes_e_idempotente(cliente):
    assert banco.rodar_migracoes() == []
    assert banco.rodar_migracoes() == []
    with banco.cursor() as cur:
        cur.execute("SELECT versao FROM migracoes_aplicadas ORDER BY versao")
        assert [r["versao"] for r in cur.fetchall()] == ["001", "002", "003", "004", "005", "006"]


def teste_tabelas_e_semente_existem(cliente):
    tabelas = _tabelas()
    assert {"servicos", "favoritos", "configuracoes", "itens_conteudo", "registro_saude"} <= tabelas
    assert not {"services", "bookmarks", "settings", "content_items", "health_log"} & tabelas
    with banco.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM servicos")
        assert cur.fetchone()["n"] >= 7


def teste_dividir_instrucoes_respeita_aspas():
    sql = "-- c\nINSERT INTO t VALUES ('a;b'); SELECT 1;"
    assert banco.dividir_instrucoes(sql) == ["INSERT INTO t VALUES ('a;b')", "SELECT 1"]


def teste_servicos_extras_perfis_e_verificacoes_com_prefixo(cliente):
    with banco.cursor() as cur:
        cur.execute("SELECT identificador, perfil, url_verificacao FROM servicos WHERE perfil IS NOT NULL")
        linhas = {r["identificador"]: r for r in cur.fetchall()}
    assert {s: r["perfil"] for s, r in linhas.items()} == {
        "traducao": "traducao",
        "cursos": "cursos",
        "livros": "midia",
        "midia": "midia",
    }
    assert linhas["midia"]["url_verificacao"].endswith("/midia/health")


def teste_verificacao_do_mapa_aponta_para_rota_de_saude_nova(cliente):
    with banco.cursor() as cur:
        cur.execute("SELECT url_verificacao FROM servicos WHERE identificador = 'mapas'")
        assert cur.fetchone()["url_verificacao"].endswith("/api/saude")


def teste_reversa_e_nova_aplicacao_preservam_favoritos(cliente):
    """Reverte a 003 (esquema antigo, com dados), confere e reaplica a 003 pelo corredor normal."""
    criado = cliente.post(
        "/api/favoritos", json={"titulo": "Primeiros socorros", "url": "/notas/socorro", "categoria": "saude"}
    ).json()
    try:
        _reverter_003()
        tabelas = _tabelas()
        assert {"services", "bookmarks", "settings", "content_items", "health_log", "schema_migrations"} <= tabelas
        assert "favoritos" not in tabelas and "migracoes_aplicadas" not in tabelas
        with banco.cursor() as cur:
            cur.execute("SELECT title, url, category FROM bookmarks")
            assert [(r["title"], r["url"], r["category"]) for r in cur.fetchall()] == [
                ("Primeiros socorros", "/notas/socorro", "saude")
            ]
            cur.execute("SELECT version FROM schema_migrations ORDER BY version")
            assert [r["version"] for r in cur.fetchall()] == ["001", "002", "004", "005", "006"]
            cur.execute("SELECT check_url FROM services WHERE slug = 'mapas'")
            assert cur.fetchone()["check_url"].endswith("/api/health")
    finally:
        aplicadas = banco.rodar_migracoes()
    assert aplicadas == ["003_traducao_para_portugues.sql"]

    favoritos = cliente.get("/api/favoritos").json()
    assert [(f["id"], f["titulo"], f["url"], f["categoria"]) for f in favoritos] == [
        (criado["id"], "Primeiros socorros", "/notas/socorro", "saude")
    ]
    assert "servicos" in _tabelas() and "services" not in _tabelas()


def _caminho_traducao() -> str:
    with banco.cursor() as cur:
        cur.execute("SELECT caminho FROM servicos WHERE identificador = 'traducao'")
        return cur.fetchone()["caminho"]


def teste_migracao_005_aponta_cartao_para_o_tradutor(cliente):
    assert _caminho_traducao() == "/tradutor/"


def teste_reversa_da_005_volta_para_traducao_e_reaplica(cliente):
    try:
        with banco.cursor() as cur:
            for instrucao in banco.dividir_instrucoes(REVERSA_005.read_text(encoding="utf-8")):
                cur.execute(instrucao)
        assert _caminho_traducao() == "/traducao/"
        with banco.cursor() as cur:
            cur.execute("SELECT versao FROM migracoes_aplicadas ORDER BY versao")
            assert "005" not in [r["versao"] for r in cur.fetchall()]
    finally:
        aplicadas = banco.rodar_migracoes()
    assert aplicadas == ["005_tradutor_no_portal.sql"]
    assert _caminho_traducao() == "/tradutor/"


def _caminho_servico(identificador: str) -> str:
    with banco.cursor() as cur:
        cur.execute("SELECT caminho FROM servicos WHERE identificador = %s", (identificador,))
        return cur.fetchone()["caminho"]


def teste_migracao_006_aponta_cartoes_para_wikipedia_e_anotacoes(cliente):
    assert _caminho_servico("wiki") == "/wikipedia/"
    assert _caminho_servico("notas") == "/anotacoes/"


def teste_reversa_da_006_volta_para_wiki_e_notas_e_reaplica(cliente):
    try:
        with banco.cursor() as cur:
            for instrucao in banco.dividir_instrucoes(REVERSA_006.read_text(encoding="utf-8")):
                cur.execute(instrucao)
        assert _caminho_servico("wiki") == "/wiki/"
        assert _caminho_servico("notas") == "/notas/"
        with banco.cursor() as cur:
            cur.execute("SELECT versao FROM migracoes_aplicadas ORDER BY versao")
            assert "006" not in [r["versao"] for r in cur.fetchall()]
    finally:
        aplicadas = banco.rodar_migracoes()
    assert aplicadas == ["006_wikipedia_e_notas_no_portal.sql"]
    assert _caminho_servico("wiki") == "/wikipedia/"
    assert _caminho_servico("notas") == "/anotacoes/"
