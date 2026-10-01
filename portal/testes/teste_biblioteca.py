import os

from app import banco


def teste_biblioteca_lista_volumes(cliente, diretorios_biblioteca):
    base = diretorios_biblioteca
    (base / "zim" / "wiki.zim").write_bytes(b"z" * 1000)
    (base / "zim" / "notas.txt").write_bytes(b"ignorar")
    (base / "mapas" / "regiao.pmtiles").write_bytes(b"p" * 50)
    m = base / "modelos" / "en_pt"
    m.mkdir()
    (m / "a.bin").write_bytes(b"m" * 20)
    (m / "b.bin").write_bytes(b"m" * 30)
    os.utime(base / "zim" / "wiki.zim", (1_700_000_000, 1_700_000_000))

    dados = cliente.get("/api/biblioteca").json()
    itens = {(i["tipo"], i["nome"]): i for i in dados["itens"]}
    assert set(itens) == {("zim", "wiki.zim"), ("pmtiles", "regiao.pmtiles"), ("modelo", "en_pt")}
    assert itens[("zim", "wiki.zim")]["tamanho_bytes"] == 1000
    assert itens[("zim", "wiki.zim")]["modificado_em"] == "2023-11-14T22:13:20Z"
    assert itens[("modelo", "en_pt")]["tamanho_bytes"] == 50
    assert dados["total_bytes"] == 1100
    assert dados["varrido_em"].endswith("Z")


def teste_biblioteca_espelha_no_banco_e_remove_sumidos(cliente, diretorios_biblioteca):
    z = diretorios_biblioteca / "zim" / "a.zim"
    z.write_bytes(b"1")
    cliente.get("/api/biblioteca")
    with banco.cursor() as cur:
        cur.execute("SELECT tipo, nome FROM itens_conteudo")
        assert [(r["tipo"], r["nome"]) for r in cur.fetchall()] == [("zim", "a.zim")]
    z.unlink()
    assert cliente.get("/api/biblioteca").json()["itens"] == []
    with banco.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM itens_conteudo")
        assert cur.fetchone()["n"] == 0


def teste_biblioteca_sem_diretorios_fica_vazia(cliente, tmp_path, monkeypatch):
    from app.configuracao import configuracoes

    for atributo in ("diretorio_zim", "diretorio_mapas", "diretorio_modelos"):
        monkeypatch.setattr(configuracoes, atributo, tmp_path / "nao-existe")
    dados = cliente.get("/api/biblioteca").json()
    assert dados["itens"] == [] and dados["total_bytes"] == 0
