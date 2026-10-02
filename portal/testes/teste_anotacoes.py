def teste_pagina_de_anotacoes_responde_com_titulo_em_portugues(cliente):
    resp = cliente.get("/anotacoes/")
    assert resp.status_code == 200
    assert "Arca - Notas" in resp.text
    assert "Nova nota" in resp.text


def teste_estaticos_de_anotacoes_sao_servidos(cliente):
    for caminho in ("anotacoes.css", "anotacoes.js", "editor.js", "markdown.js", "conversor.js", "etiquetas.js", "anexos.js"):
        assert cliente.get(f"/anotacoes/{caminho}").status_code == 200


def teste_anotacoes_nao_usam_recurso_externo(cliente):
    for caminho in ("", "anotacoes.css", "anotacoes.js", "editor.js", "markdown.js", "conversor.js", "etiquetas.js", "anexos.js"):
        corpo = cliente.get(f"/anotacoes/{caminho}").text
        assert "http://" not in corpo and "https://" not in corpo, caminho


def teste_pagina_de_anotacoes_tem_layout_do_editor_visual(cliente):
    corpo = cliente.get("/anotacoes/").text
    assert 'role="status"' in corpo
    assert 'href="/notas/"' in corpo and "Abrir no FlatNotes" in corpo
    assert 'href="/ajuda/#notas"' in corpo
    for ancora in ('id="busca"', 'id="botao-nova"', 'id="titulo-nota"', 'id="barra-ferramentas"', 'id="editor"', 'id="botao-excluir"'):
        assert ancora in corpo, ancora
    # o modo leitura separado e a caixa de Markdown deixaram de existir
    assert "painel-leitura" not in corpo and "<textarea" not in corpo


def teste_editor_e_aplicacao_usam_o_contrato_do_flatnotes(cliente):
    app = cliente.get("/anotacoes/anotacoes.js").text
    assert "from './editor.js'" in app
    assert "newContent" in app and "content: conteudo" in app  # PATCH usa newContent; POST usa content
    assert "innerHTML" not in app  # destaques de busca só com nós de texto
    editor = cliente.get("/anotacoes/editor.js").text
    assert "contenteditable" in editor and "role" in editor and "listbox" in editor
    assert "from './conversor.js'" in editor
    assert editor.count("execCommand(") == 2  # o uso fica concentrado em um único ponto


def teste_pagina_tem_chips_de_etiquetas_e_filtro_na_lateral(cliente):
    corpo = cliente.get("/anotacoes/").text
    for ancora in ('id="chips-etiquetas"', 'id="nova-etiqueta"', 'id="sugestoes-etiquetas"', 'id="filtro-etiquetas"'):
        assert ancora in corpo, ancora
    assert "filtro-etiqueta\"" not in corpo  # o seletor antigo deu lugar aos chips


def teste_anexos_usam_o_contrato_do_flatnotes(cliente):
    app = cliente.get("/anotacoes/anotacoes.js").text
    assert "'/attachments'" in app and "append('file'" in app and "from './etiquetas.js'" in app
    editor = cliente.get("/anotacoes/editor.js").text
    assert "aoArquivos" in editor and "clipboardData" in editor and "dataTransfer" in editor
    assert editor.count("execCommand(") == 2  # inserir anexo também passa por `comando`
    anexos = cliente.get("/anotacoes/anexos.js").text
    assert "filename" in anexos and "/notas/" in anexos


def teste_icones_do_editor_existem_no_mapa_compartilhado(cliente):
    comum = cliente.get("/js/common.js").text
    for nome in ("negrito", "italico", "riscado", "titulo", "lista", "listanum", "tarefa", "citacao", "codigo", "link", "imagem", "anexo", "tabela", "divisor", "lixeira", "menu", "voltar"):
        assert f"{nome}:" in comum, nome
