"""Conversor Markdown <-> HTML das notas (spec 022). Chama `node` sobre conversor.js."""
import json
import shutil
import subprocess
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent
CONVERSOR = RAIZ.parent / "app" / "static" / "site" / "anotacoes" / "conversor.js"
EXECUTOR = RAIZ / "apoio" / "rodar_conversor.mjs"

if shutil.which("node") is None:
    pytest.skip("AVISO: node não encontrado; teste do conversor pulado", allow_module_level=True)


def _rodar(pedido):
    # o .js do portal é módulo ES: o node precisa de --input-type só para texto de entrada,
    # e o executor (.mjs) importa o módulo por URL de arquivo.
    proc = subprocess.run(
        ["node", str(EXECUTOR), str(CONVERSOR)],
        input=json.dumps(pedido),
        capture_output=True, text=True, timeout=60,
    )
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)


def _html(texto):
    return _rodar({"casos": [texto]})["casos"][0]["html"]


def _ida_e_volta(texto):
    return _rodar({"casos": [texto]})["casos"][0]["markdown"]


def _editor(html):
    return _rodar({"dom": [html]})["dom"][0]


CASOS_ESTAVEIS = {
    "titulos": "# Um\n\n## Dois\n\n### Três\n\n#### Quatro\n\n##### Cinco\n\n###### Seis\n",
    "paragrafos_e_enfase": "Texto com **negrito**, *itálico*, ~~riscado~~ e `código`.\n\nOutro parágrafo.\n",
    "quebra_de_linha": "linha um\nlinha dois\n",
    "listas": "- um\n- dois\n- três\n\n1. primeiro\n2. segundo\n",
    "listas_aninhadas": "- a\n  - a1\n    - a11\n  - a2\n- b\n  1. b1\n  2. b2\n",
    "ordenada_com_filhos": "1. um\n   - x\n   - y\n2. dois\n",
    "tarefas": "- [ ] pendente\n- [x] feita\n  - [ ] filha\n",
    "citacao": "> uma citação\n> em duas linhas\n\n> outra\n>\n> com parágrafo\n",
    "codigo_em_bloco": "```js\nconst x = 1 < 2;\n\nconsole.log(\"<b>\");\n```\n",
    "codigo_sem_idioma": "```\n# não é título\n- nem lista\n```\n",
    "tabela": "| Item | Qtd |\n| --- | ---: |\n| Água | 10 |\n| Arroz | 2 |\n",
    "tabela_alinhada": "| a | b | c |\n| :--- | :---: | ---: |\n| 1 | 2 | 3 |\n",
    "divisor": "antes\n\n---\n\ndepois\n",
    "links": "Veja [a página](/ajuda/) e [outro](https://exemplo.org/a?b=1&c=2) e [âncora](#topo).\n",
    "imagens": "![foto](attachments/foto.png)\n\nTexto ![ícone](attachments/i.png) no meio.\n",
    "anexo_como_link": "[manual.pdf](attachments/manual.pdf)\n",
    "caracteres_especiais": "Preço: 2 \\* 3 = 6, snake_case e a_b e 5 < 6 & mais.\n",
    "escapes": "\\*não é itálico\\* e # não é título e \\[não é link]\n",
    "titulo_com_acentos_e_emoji": "# Água e luz ☀\n\nAção: mantê-la.\n",
}


@pytest.mark.parametrize("nome", sorted(CASOS_ESTAVEIS))
def teste_ida_e_volta_e_estavel(nome):
    texto = CASOS_ESTAVEIS[nome]
    assert _ida_e_volta(texto) == texto
    # estável também na segunda volta (idempotente)
    assert _ida_e_volta(_ida_e_volta(texto)) == texto


def teste_nota_antiga_do_flatnotes_abre_sem_perda():
    antigo = (
        "# Receita\n\n#cozinha #familia\n\nMisture *tudo* e asse por **40 min**.\n\n"
        "* farinha\n* ovos\n   * claras\n+ leite\n\n1) primeiro\n2) segundo\n\n"
        "```\nforno 180\n```\n\n***\n\nFim.\n"
    )
    html = _html(antigo)
    for trecho in ("<h1>Receita</h1>", "<em>tudo</em>", "<strong>40 min</strong>", "<pre><code>forno 180</code></pre>", "<hr>"):
        assert trecho in html
    assert "#cozinha #familia" in html  # linha de etiquetas continua texto (a spec 024 cuida delas)
    assert html.count("<li>") == 6
    assert "<ol>" in html
    volta = _ida_e_volta(antigo)
    assert "#cozinha #familia" in volta  # etiquetas não são escapadas
    for trecho in ("# Receita", "- farinha", "  - claras", "1. primeiro", "```\nforno 180\n```", "---", "Fim."):
        assert trecho in volta


def teste_etiquetas_em_linha_propria_voltam_como_estao():
    texto = "#cozinha #familia\n\nCorpo.\n"
    assert _ida_e_volta(texto) == texto


def teste_html_do_texto_fica_escapado():
    html = _html('<script>alert(1)</script> e <img src=x onerror="alert(2)"> **ok**')
    assert "<script" not in html and "<img" not in html
    assert "&lt;script&gt;" in html and "&lt;img" in html
    assert "<strong>ok</strong>" in html
    em_codigo = _html("```\n<script>x</script>\n```")
    assert "<script" not in em_codigo and "&lt;script&gt;" in em_codigo
    em_titulo = _html("# <b onmouseover=1>x</b>")
    assert "<b " not in em_titulo and "&lt;b" in em_titulo
    em_tabela = _html("| <i>a</i> |\n| --- |\n| <u>b</u> |")
    assert "<i>" not in em_tabela and "<u>" not in em_tabela


@pytest.mark.parametrize("endereco", [
    "javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "//host.exemplo/x", "data:text/html,x",
    "vbscript:x", "/\\\\host.exemplo", "arquivo.html", "java\tscript:alert(1)",
])
def teste_enderecos_perigosos_sao_bloqueados(endereco):
    html = _html(f"[clique]({endereco}) e ![img]({endereco})")
    assert "href=" not in html and "src=" not in html
    assert "javascript:" not in html.lower().replace("&", "") or "href" not in html
    assert "clique" in html


def teste_enderecos_permitidos_viram_link():
    html = _html("[a](https://x.org/p) [b](/ajuda/) [c](./d) [d](../e) [f](#g) [h](attachments/arq.pdf)")
    assert html.count("<a ") == 6
    assert 'href="https://x.org/p" target="_blank" rel="noopener noreferrer"' in html
    assert 'href="/notas/attachments/arq.pdf"' in html  # anexo relativo do FlatNotes aponta para /notas/
    assert 'href="/ajuda/"' in html and "target" not in html.split('href="/ajuda/"')[1].split(">")[0]


def teste_parenteses_sobrando_nao_viram_lixo():
    html = _html("(veja [a página](https://x.org/p)) e [wiki](https://x.org/a_(b)).")
    assert "(veja <a" in html
    assert ">a página</a>)" in html  # só o ")" do texto fica; o do link é consumido
    assert 'href="https://x.org/a_(b)"' in html
    assert html.count(")") == 2  # o do texto e o do endereço com parênteses; os dos links são consumidos


def teste_link_bloqueado_nao_deixa_parentese_no_texto():
    html = _html("[clique](javascript:alert(1))")
    assert html == "<p>clique</p>"


def teste_editor_converte_para_markdown_do_flatnotes():
    html = (
        "<div>Olá <b>mundo</b> e <i>você</i> <strike>velho</strike></div>"
        "<div><br></div><div>Linha<br>quebrada</div>"
        "<h2>Seção</h2>"
        '<ul><li>um<ul><li>dois</li></ul></li></ul>'
        '<ul class="tarefas"><li class="tarefa"><input type="checkbox" checked> feita</li>'
        '<li class="tarefa"><input type="checkbox"> falta</li></ul>'
        '<p><a href="javascript:alert(1)">mau</a> <a href="https://x.org">bom</a></p>'
        '<p><img src="/notas/attachments/f.png" alt="foto"></p>'
    )
    md = _editor(html)
    assert md == (
        "Olá **mundo** e *você* ~~velho~~\n\nLinha\nquebrada\n\n## Seção\n\n- um\n  - dois\n\n"
        "- [x] feita\n- [ ] falta\n\nmau [bom](https://x.org)\n\n![foto](attachments/f.png)\n"
    )


def teste_editor_escapa_simbolos_digitados():
    md = _editor("<p>2 * 3 e `x` e [a](b) e # não e &lt;tag&gt; e a_b</p><p># solto</p><p>- solto</p><p>1. solto</p>")
    assert md.startswith("2 \\* 3 e \\`x\\` e \\[a](b) e # não e \\<tag> e a_b")
    assert "\\# solto" in md and "\\- solto" in md and "1\\. solto" in md
    # e voltam como texto, sem virar formatação
    html = _html(md)
    assert "<h1>" not in html and "<ul>" not in html and "<ol>" not in html and "<em>" not in html


def teste_editor_ignora_script_e_estilo_estranho():
    md = _editor('<p><span style="color:red">texto</span></p><script>x</script>')
    assert md.startswith("texto")


def teste_asterisco_solto_e_normalizado_sem_mudar_o_sentido():
    volta = _ida_e_volta("Preço: 2 * 3 = 6\n")
    assert volta == "Preço: 2 \\* 3 = 6\n"
    assert _ida_e_volta(volta) == volta


# ---- Etiquetas e anexos (spec 024) ----
ETIQUETAS = CONVERSOR.parent / "etiquetas.js"
ANEXOS = CONVERSOR.parent / "anexos.js"
EXECUTOR_ETIQUETAS = RAIZ / "apoio" / "rodar_etiquetas.mjs"


def _funcoes(pedido):
    proc = subprocess.run(
        ["node", str(EXECUTOR_ETIQUETAS), str(ETIQUETAS), str(ANEXOS)],
        input=json.dumps(pedido), capture_output=True, text=True, timeout=60,
    )
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)


def teste_linha_de_etiquetas_sai_do_corpo_e_volta_sem_duplicar():
    texto = "#cozinha #familia\n\n# Receita\n\nCorpo com #inline no meio.\n"
    parte = _funcoes({"extrair": [texto]})["extrair"][0]
    assert parte["etiquetas"] == ["cozinha", "familia"]
    assert parte["corpo"] == "# Receita\n\nCorpo com #inline no meio.\n"  # linha oculta; #inline continua texto
    refeito = _funcoes({"montar": [[parte["etiquetas"], parte["corpo"]]]})["montar"][0]
    assert refeito == texto
    # ida e volta repetida não duplica a linha
    de_novo = _funcoes({"extrair": [refeito]})["extrair"][0]
    assert _funcoes({"montar": [[de_novo["etiquetas"], de_novo["corpo"]]]})["montar"][0] == texto


def teste_etiquetas_so_valem_na_primeira_linha():
    for texto in ("# Título\n\n#solta\n", "Texto #a #b\n", "#ação\n\nx\n", "#a texto\n"):
        parte = _funcoes({"extrair": [texto]})["extrair"][0]
        assert parte["etiquetas"] == [], texto
        assert parte["corpo"] == texto


def teste_montar_sem_etiquetas_ou_sem_corpo():
    m = _funcoes({"montar": [[[], "Só corpo\n"], [["a", "b", "a"], ""], [["x"], "\n\nTexto\n"]]})["montar"]
    assert m == ["Só corpo\n", "#a #b\n", "#x\n\nTexto\n"]


def teste_normalizar_etiqueta():
    r = _funcoes({"normalizar": ["#Ação", "  Viagem Longa ", "ok", "", "###", "!!!", "x" * 31, "A-b"]})["normalizar"]
    assert r[0]["valor"] == "acao" and "ajustada" in r[0]["aviso"]
    assert r[1]["valor"] == "viagem-longa" and r[1]["aviso"]
    assert r[2] == {"valor": "ok", "aviso": "", "erro": ""}
    assert r[3]["erro"] and r[4]["erro"] and r[5]["erro"]
    assert "máximo" in r[6]["erro"] and r[6]["valor"] == ""
    assert r[7]["valor"] == "a-b"


def teste_resposta_de_anexo_vira_endereco_do_portal():
    resposta = {"filename": "v 022 ção.png", "url": "attachments/v%20022%20%C3%A7%C3%A3o.png"}
    anexos = _funcoes({"anexos": [
        [resposta, {"name": "v 022 ção.png", "type": "image/png"}],
        [{"filename": "manual.pdf", "url": "attachments/manual.pdf"}, {"name": "manual.pdf", "type": "application/pdf"}],
        [{}, {"name": "x", "type": ""}],
    ]})["anexos"]
    assert anexos[0] == {"arquivo": "v 022 ção.png", "endereco": "/notas/attachments/v%20022%20%C3%A7%C3%A3o.png", "nomeDoArquivo": "v 022 ção.png", "imagem": True}
    assert anexos[1]["imagem"] is False and anexos[1]["endereco"] == "/notas/attachments/manual.pdf"
    assert anexos[2] is None


def teste_imagem_e_link_de_anexo_voltam_como_attachments():
    md = _editor(
        '<p><img src="/notas/attachments/f%201.png" alt="f 1"> e <a href="/notas/attachments/manual.pdf">manual.pdf</a></p>'
    )
    assert md == "![f 1](attachments/f%201.png) e [manual.pdf](attachments/manual.pdf)\n"
    html = _html(md)
    assert 'src="/notas/attachments/f%201.png"' in html and 'href="/notas/attachments/manual.pdf"' in html


def teste_imagem_so_aceita_o_prefixo_de_anexos_e_bloqueia_javascript():
    html = _html("![a](javascript:alert(1)) ![b](//host.exemplo/x.png) ![c](attachments/ok.png)")
    assert "javascript:" not in html and "host.exemplo" not in html
    assert html.count("<img") == 1 and 'src="/notas/attachments/ok.png"' in html
