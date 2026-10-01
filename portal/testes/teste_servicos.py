from app.configuracao import configuracoes


def por_identificador(resp):
    assert resp.status_code == 200
    return {s["identificador"]: s for s in resp.json()}


def teste_estado_online_offline_desativado(cliente, catalogo, servidor_http, monkeypatch):
    monkeypatch.setattr(configuracoes, "perfis_ativos", frozenset())
    catalogo(
        [
            ("no_ar", f"{servidor_http}/ok", None),
            ("autenticado", f"{servidor_http}/auth", None),  # 401 = serviço respondeu
            ("erro", f"{servidor_http}/boom", None),  # 5xx = offline
            ("fora", "http://127.0.0.1:1/", None),
            ("desligado", f"{servidor_http}/ok", "midia"),  # perfil desligado
        ]
    )
    s = por_identificador(cliente.get("/api/servicos"))
    assert s["no_ar"]["estado"] == "online" and s["no_ar"]["latencia_ms"] is not None
    assert s["autenticado"]["estado"] == "online"
    assert s["erro"]["estado"] == "offline"
    assert s["fora"]["estado"] == "offline" and s["fora"]["latencia_ms"] is None
    assert s["desligado"]["estado"] == "desativado"


def teste_perfil_ativo_e_verificado(cliente, catalogo, servidor_http, monkeypatch):
    monkeypatch.setattr(configuracoes, "perfis_ativos", frozenset({"midia"}))
    catalogo([("m", f"{servidor_http}/ok", "midia")])
    assert por_identificador(cliente.get("/api/servicos"))["m"]["estado"] == "online"


def teste_servicos_com_falha_nao_quebram_a_rota(cliente, catalogo, servidor_http):
    catalogo(
        [
            ("bom", f"{servidor_http}/ok", None),
            ("host_ruim", "http://nao-existe.invalid:9/", None),
            ("url_ruim", "isto-nao-e-url", None),
            ("esquema_ruim", "ftp://x/", None),
        ]
    )
    s = por_identificador(cliente.get("/api/servicos"))
    assert s["bom"]["estado"] == "online"
    assert {s[k]["estado"] for k in ("host_ruim", "url_ruim", "esquema_ruim")} == {"offline"}


def teste_verificacoes_em_paralelo_com_limite_curto(cliente, catalogo, monkeypatch):
    import time

    monkeypatch.setattr(configuracoes, "tempo_limite_verificacao", 0.5)
    # 10.255.255.1 normalmente não responde: força o timeout
    catalogo([(f"s{i}", "http://10.255.255.1:81/", None) for i in range(6)])
    t = time.monotonic()
    s = por_identificador(cliente.get("/api/servicos"))
    assert time.monotonic() - t < 3
    assert all(v["estado"] == "offline" for v in s.values())


def teste_registro_saude_gravado(cliente, catalogo, servidor_http):
    from app import banco

    catalogo([("a", f"{servidor_http}/ok", None)])
    cliente.get("/api/servicos")
    with banco.cursor() as cur:
        cur.execute("SELECT estado FROM registro_saude WHERE servico_identificador = 'a'")
        assert [r["estado"] for r in cur.fetchall()] == ["online"]


def teste_catalogo_padrao_tem_as_rotas_esperadas(cliente):
    s = por_identificador(cliente.get("/api/servicos"))
    assert {"notas", "wiki", "mapas", "traducao", "cursos", "livros", "midia"} <= set(s)
    assert s["notas"]["caminho"] == "/notas/"
    assert s["traducao"]["caminho"] == "/tradutor/"
