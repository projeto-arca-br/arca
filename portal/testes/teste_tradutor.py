def teste_pagina_do_tradutor_responde_com_titulo_em_portugues(cliente):
    resp = cliente.get("/tradutor/")
    assert resp.status_code == 200
    assert "Arca - Tradutor" in resp.text
    assert "Traduza textos entre português" in resp.text


def teste_pagina_do_tradutor_nao_usa_recurso_externo(cliente):
    corpo = cliente.get("/tradutor/").text
    assert "http://" not in corpo and "https://" not in corpo


def teste_estaticos_do_tradutor_sao_servidos(cliente):
    assert cliente.get("/tradutor/tradutor.css").status_code == 200
    assert cliente.get("/tradutor/tradutor.js").status_code == 200
