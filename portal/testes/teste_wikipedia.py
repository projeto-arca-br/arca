def teste_pagina_da_wikipedia_responde_com_titulo_em_portugues(cliente):
    resp = cliente.get("/wikipedia/")
    assert resp.status_code == 200
    assert "Arca - Wikipédia" in resp.text


def teste_estaticos_da_wikipedia_sao_servidos(cliente):
    assert cliente.get("/wikipedia/wikipedia.css").status_code == 200
    assert cliente.get("/wikipedia/wikipedia.js").status_code == 200


def teste_wikipedia_nao_usa_recurso_externo(cliente):
    for rota in ("/wikipedia/", "/wikipedia/wikipedia.css", "/wikipedia/wikipedia.js"):
        corpo = cliente.get(rota).text
        assert "http://" not in corpo and "https://" not in corpo, rota
