---
title: Editor visual, layout e salvar automático das notas
number: 023
priority: high
tags: [feature, portal, frontend, notes]
dependencies: [022-conversor-markdown-notas.spec.md, 017-tradutor-portal.spec.md]
related_prd: .claude/prd/005-editor-visual-de-notas.md
status: done
created: 2026-10-01
---

# 023 - Editor visual, layout e salvar automático das notas

## Overview
Refaz `/anotacoes/` no padrão visual do tradutor, com barra lateral e folha, editor visual (texto formatado, barra de ferramentas, atalhos e menu "/") e salvamento automático. A nota abre direto editável; o modo leitura separado deixa de existir. Etiquetas editáveis e anexos ficam para a spec 024.

## Related PRD
- **Source**: [Editor visual de notas no portal](../prd/005-editor-visual-de-notas.md)
- **Section Reference**: User Stories 1-12, 16-29, 35-42, 45-47; Implementation Decisions (Editor visual, Menu "/", Salvar automático, Título, Layout, Remoção do modo leitura, Segurança)

## Prerequisites
- [ ] Spec 022 concluída (conversores e learning da API)
- [ ] Stack no ar para testar no navegador

## Dependencies
- `022-conversor-markdown-notas.spec.md` - `conversor.js`
- `017-tradutor-portal.spec.md` - padrão visual (cabeçalho, `.botao`, `.cartao`, `.nota`, `.mensagem`)

## Implementation Tasks
### 1. Layout (`anotacoes/index.html`, `anotacoes.css`)
- [ ] Manter `<title>` "Arca - Notas", o texto "Nova nota" e o cabeçalho, `main.miolo`, `p#mensagem[role=status]` e rodapé do tradutor; Ajuda em `/ajuda/#notas`
- [ ] Barra lateral (`.cartao`, retrátil): busca com destaques, botão "Nova nota" (`.botao.primario`), lista da mais recente à mais antiga, link "Abrir no FlatNotes" (`/notas/`)
- [ ] Folha (`.cartao`): campo de título grande, barra de ferramentas, área editável, indicador de estado, botão Excluir (`.botao.perigo`) com `confirm`
- [ ] Celular: uma coluna por vez, botão Voltar à lista, barra de ferramentas rolável na horizontal
- [ ] Remover do `anotacoes.css` as regras repetidas de `.campo`, `.acoes`, `.contador`, `.mensagem`, `.nota`, `.botao:disabled` e o `max-width` de 1100px; usar `css/style.css`; temas claro e escuro pelas variáveis; foco visível; sem recursos externos
- [ ] Se usar `position:` no CSS da página, registrar a exceção em `scripts/convencao-excecoes.txt`

### 2. Ícones (`js/common.js`)
- [ ] Acrescentar ao mapa `ICONES` (SVG inline, sem recursos externos): negrito, itálico, riscado, título, lista, lista numerada, tarefa, citação, código, link, imagem, tabela, divisor, lixeira, menu, voltar; usar `icone(nome)` e `aria-label` em português

### 3. Editor `anotacoes/editor.js` (módulo ES, sem bibliotecas)
- [ ] Área `contenteditable` com `role="textbox"`, `aria-multiline` e rótulo; conteúdo inicial vindo de `markdownParaHtml`; conteúdo salvo vindo de `htmlParaMarkdown`
- [ ] Barra de ferramentas: negrito, itálico, riscado, títulos 1-3, lista, lista numerada, tarefas (caixa marcável com clique), citação, código, link, divisor, tabela simples; botões com estado ativo conforme a seleção
- [ ] Atalhos: Ctrl+B, Ctrl+I, Ctrl+K, Ctrl+S, Ctrl+Z/Y (desfazer/refazer nativos)
- [ ] Menu "/" no começo da linha: títulos, listas, tarefas, citação, código, tabela, divisor; navegação por setas/Enter/Esc, `role="listbox"`
- [ ] Atalhos de digitação: `# `, `## `, `- `, `1. `, `[] `, `> ` no começo da linha viram o bloco correspondente
- [ ] Colar sempre como texto limpo (`paste` com `text/plain`); sem HTML externo
- [ ] Listas aninhadas com Tab/Shift+Tab
- [ ] Expor eventos/callbacks `aoAlterar` e métodos `carregar(markdown)` e `obterMarkdown()`; se usar `document.execCommand`, encapsular em um único ponto

### 4. Aplicação `anotacoes.js`
- [ ] Manter busca, listagem, roteamento por hash (`#/nota/<titulo>`, `#/nova`), tratamento de erros em português (401/403 sem permissão; 502/503/504 ou rede = serviço indisponível) e `requisicao`
- [ ] Remover o modo leitura/edição separados: ao abrir uma nota, carrega-a no editor
- [ ] Salvar automático: depois de ~1,5 s sem digitar, `PATCH /notas/api/notes/<titulo>` com `{newContent}` (**não** `content`); indicador "Salvando…", "Salvo", "Erro ao salvar"; Ctrl+S salva na hora
- [ ] Nota nova: criada no primeiro salvamento com título válido (`POST {title, content}`), com checagem de título duplicado (GET 404 = livre) e `TITULO_INVALIDO`; título fixo após criar, a menos que o learning da 022 mostre que `newTitle` funciona
- [ ] Salvar ao trocar de nota, voltar à lista e `beforeunload`; se o salvamento falhar, avisar e impedir a troca silenciosa (`confirm`)
- [ ] Excluir com `confirm`; destaques de busca continuam sem `innerHTML` (nós de texto + `<mark>`)
- [ ] Atualizar `teste_anotacoes.py` e `scripts/fumaca.sh` para incluir `editor.js` (rota 200, sem `http(s)://`, varredura de externos)

### 5. Convenção
- [ ] Identificadores em português sem acento (`salvarNota`, `abrirNota`, `alternarNegrito`...); `setAttribute('class', ...)`; exceções só com justificativa e em uso; `make teste-convencao` passa

## Acceptance Criteria
### Must Have
- [ ] A página tem o mesmo padrão visual do tradutor, em tema claro e escuro, e funciona no celular
- [ ] A pessoa escreve texto formatado sem ver símbolos de Markdown, usa a barra, os atalhos e o menu "/"
- [ ] A nota abre direto editável; é salva sozinha com indicador de estado; Ctrl+S salva na hora
- [ ] Nota nova só é criada no primeiro salvamento; título duplicado ou inválido avisa
- [ ] O Markdown salvo abre corretamente em `/notas/` (FlatNotes) e notas antigas abrem corretamente no editor
- [ ] Nenhum HTML ou `javascript:` do texto é executado; nenhum recurso externo
- [ ] `make teste`, `make teste-convencao` e `make teste-fumaca` passam

### Should Have
- [ ] Barra lateral retrátil
- [ ] Utilizável só com teclado e com leitor de tela

## Testing Requirements
```bash
make teste-portal
make teste-convencao
make teste-fumaca
make subir
curl -sI http://127.0.0.1:8088/anotacoes/ | head -1
# manual: criar nota, formatar com barra, menu "/", atalhos, esperar o "Salvo", recarregar, abrir a mesma nota em /notas/, tema escuro, celular, teclado
```

## Rollback Plan
Reverter `anotacoes/`, as linhas da fumaça, os ícones e os testes com `git revert`; o cartão do painel e a migração 006 permanecem. Sem mudanças em banco, compose ou Caddy.
