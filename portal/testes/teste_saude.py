def teste_saude(cliente):
    r = cliente.get("/api/saude")
    assert r.status_code == 200
    assert r.json()["status"] == "ok" and r.json()["banco"] is True


def teste_documentacao_usa_assets_locais(cliente):
    r = cliente.get("/api/docs")
    assert r.status_code == 200
    assert "cdn" not in r.text and "http" not in r.text.replace("http-equiv", "")
    assert cliente.get("/api/docs-assets/swagger-ui-bundle.js").status_code == 200
    assert cliente.get("/api/openapi.json").json()["info"]["title"] == "API do Portal Arca"


def teste_openapi_so_tem_rotas_em_portugues(cliente):
    caminhos = set(cliente.get("/api/openapi.json").json()["paths"])
    assert caminhos == {
        "/api/saude",
        "/api/servicos",
        "/api/favoritos",
        "/api/favoritos/{favorito_id}",
        "/api/biblioteca",
    }


def teste_raiz_serve_indice_estatico(cliente):
    r = cliente.get("/")
    assert r.status_code == 200 and "Arca" in r.text
