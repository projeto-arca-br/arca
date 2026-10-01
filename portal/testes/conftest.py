import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest
from fastapi.testclient import TestClient

from app import banco
from app.configuracao import configuracoes
from app.principal import app


@pytest.fixture(scope="session")
def cliente():
    with TestClient(app) as c:  # dispara o ciclo de vida: espera o banco e migra
        yield c


@pytest.fixture(autouse=True)
def limpar_banco(cliente):
    with banco.cursor() as cur:
        for t in ("favoritos", "itens_conteudo", "registro_saude"):
            cur.execute(f"DELETE FROM {t}")
    yield


@pytest.fixture
def diretorios_biblioteca(tmp_path, monkeypatch):
    for atributo, nome in (
        ("diretorio_zim", "zim"),
        ("diretorio_mapas", "mapas"),
        ("diretorio_modelos", "modelos"),
    ):
        d = tmp_path / nome
        d.mkdir()
        monkeypatch.setattr(configuracoes, atributo, d)
    return tmp_path


class _Atendente(BaseHTTPRequestHandler):
    def do_GET(self):
        codigo = {"/ok": 200, "/auth": 401, "/boom": 500}.get(self.path, 404)
        self.send_response(codigo)
        self.end_headers()
        self.wfile.write(b"x")

    def log_message(self, *a):
        pass


@pytest.fixture(scope="session")
def servidor_http():
    srv = HTTPServer(("127.0.0.1", 0), _Atendente)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_port}"
    srv.shutdown()


@pytest.fixture
def catalogo(cliente):
    """Substitui o catálogo de serviços por um controlado pelo teste e restaura depois."""
    with banco.cursor() as cur:
        cur.execute("SELECT * FROM servicos")
        original = cur.fetchall()
        cur.execute("DELETE FROM servicos")

    def colocar(linhas):
        with banco.cursor() as cur:
            for i, (identificador, url, perfil) in enumerate(linhas):
                cur.execute(
                    "INSERT INTO servicos (identificador, nome, descricao, caminho, url_verificacao, perfil, posicao) "
                    "VALUES (%s, %s, 'd', %s, %s, %s, %s)",
                    (identificador, identificador.title(), f"/{identificador}/", url, perfil, i),
                )

    yield colocar
    with banco.cursor() as cur:
        cur.execute("DELETE FROM servicos")
        for r in original:
            colunas = list(r)
            cur.execute(
                f"INSERT INTO servicos ({','.join(colunas)}) VALUES ({','.join(['%s'] * len(colunas))})",
                [r[c] for c in colunas],
            )
