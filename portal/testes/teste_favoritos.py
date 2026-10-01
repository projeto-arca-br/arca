def teste_ciclo_completo(cliente):
    r = cliente.post(
        "/api/favoritos", json={"titulo": "Wikipédia", "url": "/wiki/", "categoria": "wiki"}
    )
    assert r.status_code == 201
    f = r.json()
    assert f["id"] and f["criado_em"].endswith("Z")

    assert cliente.get(f"/api/favoritos/{f['id']}").json()["titulo"] == "Wikipédia"
    assert [x["id"] for x in cliente.get("/api/favoritos").json()] == [f["id"]]

    r = cliente.put(
        f"/api/favoritos/{f['id']}", json={"titulo": "Novo", "url": "https://x.org/a", "categoria": None}
    )
    assert r.status_code == 200 and r.json()["titulo"] == "Novo" and r.json()["categoria"] is None

    assert cliente.delete(f"/api/favoritos/{f['id']}").status_code == 204
    assert cliente.get(f"/api/favoritos/{f['id']}").status_code == 404
    assert cliente.get("/api/favoritos").json() == []


def teste_unicode_ida_e_volta(cliente):
    r = cliente.post("/api/favoritos", json={"titulo": "Sinalização de emergência ✚", "url": "/notas/ação"})
    assert cliente.get(f"/api/favoritos/{r.json()['id']}").json()["titulo"] == "Sinalização de emergência ✚"


def teste_validacao(cliente):
    for corpo in (
        {"titulo": "", "url": "/x"},
        {"titulo": "   ", "url": "/x"},
        {"titulo": "t", "url": "javascript:alert(1)"},
        {"titulo": "t", "url": "//evil.com"},
        {"titulo": "t"},
    ):
        assert cliente.post("/api/favoritos", json=corpo).status_code == 422, corpo


def teste_nao_encontrado(cliente):
    assert cliente.get("/api/favoritos/999999").status_code == 404
    assert cliente.put("/api/favoritos/999999", json={"titulo": "t", "url": "/x"}).status_code == 404
    assert cliente.delete("/api/favoritos/999999").status_code == 404
