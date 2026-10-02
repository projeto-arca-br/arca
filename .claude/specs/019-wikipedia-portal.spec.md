---
title: Página da Wikipédia dentro do portal
number: 019
priority: high
tags: [feature, portal, frontend, wiki]
dependencies: [002-notes-wiki.spec.md, 004-portal-frontend.spec.md, 017-tradutor-portal.spec.md]
related_prd: .claude/prd/004-wikipedia-e-notas-no-portal.md
status: done
created: 2026-10-01
---

# 019 - Página da Wikipédia dentro do portal

## Overview
Cria a página `/wikipedia/` no portal, que usa a API do Kiwix em `/wiki/` (mesma origem, sem chave) para descobrir o ZIM, sugerir termos, buscar e listar resultados, e exibe o artigo em um iframe de mesma origem. O cartão só é apontado para a nova página na spec 021.

## Related PRD
- **Source**: [Wikipédia e Notas dentro do portal](../prd/004-wikipedia-e-notas-no-portal.md)
- **Section Reference**: User Stories 1-27, 44-46; Implementation Decisions (Páginas próprias, Descoberta do ZIM, Busca, Leitura, Padrão visual)

## Prerequisites
- [ ] Specs 002, 004 e 017 concluídos
- [ ] Stack no ar com pelo menos um ZIM em `data/zim` (não alterar `data/`)

## Dependencies
- `002-notes-wiki.spec.md` - serviço Kiwix e rota `/wiki`
- `004-portal-frontend.spec.md` - tema e objeto `Arca`
- `017-tradutor-portal.spec.md` - modelo de página própria (copiar a estrutura)

## Implementation Tasks
### 1. Página `portal/app/static/site/wikipedia/`
- [ ] `index.html` no padrão de `tradutor/index.html`: mesmo `<head>`, cabeçalho (logo, Painel, Ajuda em `/ajuda/#wiki`, botão de tema), `main`, `p#mensagem[role=status]`, rodapé; título "Arca - Wikipédia"; textos em português
- [ ] Controles: seletor de ZIM (oculto com um só), campo de busca com lista de sugestões, botão Buscar, botão "Artigo aleatório", área de resultados com paginação e total, quadro `iframe` do artigo, link "Abrir em tela cheia" para `/wiki/`
- [ ] `wikipedia.js` (módulo, sem bibliotecas externas): 
  - Descoberta: `GET /wiki/catalog/v2/entries` (Atom, `DOMParser`); identificador do ZIM = último trecho do `href` do link `text/html` (`/wiki/content/<id>`), **não** o `<name>`
  - Sugestões: `GET /wiki/suggest?content=<id>&term=<t>&count=8` (JSON), com atraso (debounce) de ~250 ms; ignorar o item de tipo `pattern`; `label` tratado como texto (`textContent`), nunca `innerHTML`
  - Resultados: `GET /wiki/search?content=<id>&pattern=<t>&format=xml&pageLength=20&start=<n>` (RSS); ler `opensearch:totalResults` e cada `item` (título, link, descrição); descrição como texto
  - Artigo: `iframe.src = /wiki/content/<id>/<caminho>`; aleatório via `/wiki/random?content=<id>`
  - Estado em `location.hash` (`#/busca/<termo>/<pagina>` e `#/artigo/<id>/<caminho>`), reagindo a `hashchange` para o botão Voltar
- [ ] Estados: carregando catálogo, pronta, "Buscando...", sem resultados, sem ZIM (instrução de `make baixar-dados` e reiniciar o Kiwix), serviço indisponível (502/503/504 ou falha de rede, mensagem em português), erro genérico
- [ ] Guardar o último ZIM escolhido no `localStorage` (chave própria `arca-wikipedia-zim`, com `try/catch`)
- [ ] `wikipedia.css`: busca no topo, resultados em lista, iframe com altura útil (≈ viewport menos cabeçalho), temas claro e escuro com as variáveis de `css/style.css`, foco visível, responsivo, sem recursos externos
- [ ] Identificadores em ASCII e português (ex.: `descobrirZim`, `buscarSugestoes`, `mostrarResultados`, `abrirArtigo`)

### 2. Testes (pytest, seam HTTP do portal)
- [ ] `portal/testes/teste_wikipedia.py` no padrão de `teste_tradutor.py`: `/wikipedia/` devolve 200 com "Arca - Wikipédia"; `wikipedia.css` e `wikipedia.js` devolvem 200; a página, o CSS e o JS não contêm `http://` nem `https://`

### 3. Fumaça
- [ ] `scripts/fumaca.sh`: incluir `/wikipedia/`, `/wikipedia/wikipedia.js` e `/wikipedia/wikipedia.css` nas rotas via Caddy e na varredura de recursos externos (seção 7 e lista de recursos próprios)
- [ ] Verificar via Caddy `GET /wiki/catalog/v2/entries` (já existe), `GET /wiki/suggest?content=<id>&term=a` e `GET /wiki/search?content=<id>&pattern=a&format=xml` (200) usando o ZIM da fumaça; se a fumaça não tiver ZIM, só validar o catálogo

### 4. Convenção
- [ ] Rodar `make teste-convencao`; se o JS usar `.title`, `.name` ou `path` vindos de APIs de terceiros, **não** editar aqui: registrar o que falhou para a spec 021 (que concentra as exceções) ou, se bloquear, adicionar a exceção com justificativa em `scripts/convencao-excecoes.txt`

## Acceptance Criteria
### Must Have
- [ ] `/wikipedia/` abre, descobre o ZIM sozinho e busca "brasil" com sugestões e resultados paginados
- [ ] Clicar em um resultado abre o artigo no iframe; links internos do artigo funcionam
- [ ] "Artigo aleatório" abre um artigo
- [ ] Botão Voltar do navegador retorna da leitura para a busca
- [ ] Sem ZIM ou com o Kiwix fora do ar, aparece mensagem em português
- [ ] Nenhum recurso externo; funciona nos temas claro e escuro
- [ ] `/wiki/` nativo continua funcionando

### Should Have
- [ ] Último ZIM lembrado; seletor aparece só com mais de um ZIM
- [ ] Utilizável em celular, com teclado e leitor de tela

## Testing Requirements
```bash
make teste-portal
make teste-convencao
make teste-fumaca
make subir
curl -sI http://127.0.0.1:8088/wikipedia/ | head -1
curl -s "http://127.0.0.1:8088/wiki/catalog/v2/entries" | head
# manual: abrir /wikipedia/, buscar "brasil", abrir artigo, aleatório, Voltar, tema escuro, celular
```

## Rollback Plan
Remover a pasta `wikipedia/`, o teste novo e as linhas da fumaça com `git revert`. Nada em banco, compose ou Caddy foi alterado nesta spec.
