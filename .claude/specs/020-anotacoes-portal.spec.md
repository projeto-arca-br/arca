---
title: Página de notas dentro do portal
number: 020
priority: high
tags: [feature, portal, frontend, notes]
dependencies: [002-notes-wiki.spec.md, 004-portal-frontend.spec.md, 017-tradutor-portal.spec.md]
related_prd: .claude/prd/004-wikipedia-e-notas-no-portal.md
status: done
created: 2026-10-01
---

# 020 - Página de notas dentro do portal

## Overview
Cria a página `/anotacoes/` no portal, que usa a API do FlatNotes em `/notas/api/` (mesma origem, `FLATNOTES_AUTH_TYPE=none`) para listar, buscar, ler, criar, editar e excluir notas, com Markdown renderizado por um módulo mínimo próprio. O cartão só é apontado para a nova página na spec 021.

## Related PRD
- **Source**: [Wikipédia e Notas dentro do portal](../prd/004-wikipedia-e-notas-no-portal.md)
- **Section Reference**: User Stories 1-8, 28-47; Implementation Decisions (Páginas próprias, Notas: listagem, escrita, formatação, Autenticação, Padrão visual)

## Prerequisites
- [ ] Specs 002, 004 e 017 concluídos
- [ ] Stack no ar com FlatNotes saudável

## Dependencies
- `002-notes-wiki.spec.md` - serviço FlatNotes e prefixo `/notas`
- `004-portal-frontend.spec.md` - tema e objeto `Arca`
- `017-tradutor-portal.spec.md` - modelo de página própria

## Implementation Tasks
### 1. Página `portal/app/static/site/anotacoes/`
- [ ] `index.html` no padrão de `tradutor/index.html`: mesmo `<head>`, cabeçalho (Painel, Ajuda em `/ajuda/#notas`, tema), `main`, `p#mensagem[role=status]`, rodapé; título "Arca - Notas"; textos em português
- [ ] Layout: coluna de lista (busca, filtro de etiqueta, botão "Nova nota") e painel de leitura/edição; em celular, uma coluna por vez com botão Voltar à lista; link "Abrir no FlatNotes" para `/notas/`
- [ ] `anotacoes.js` (módulo, sem bibliotecas externas):
  - Listar: `GET /notas/api/search?term=*&sort=lastModified&order=desc`; buscar: `term=<texto>`; destaques de `titleHighlights`/`contentHighlights` como texto seguro
  - Etiquetas: `GET /notas/api/tags`
  - Ler: `GET /notas/api/notes/<titulo>` com `encodeURIComponent`
  - Criar: `POST /notas/api/notes` (`{title, content}`); antes, checar existência (GET 404 = livre) e avisar se existir
  - Editar: `PATCH /notas/api/notes/<titulo>` (`{newContent}`; `content` é ignorado pela API); excluir: `DELETE /notas/api/notes/<titulo>` após `confirm`
  - Aviso ao sair da edição com alterações não salvas (`beforeunload` e troca de nota)
  - Estado no `location.hash` (`#/nota/<titulo>`)
  - 401/403: aviso de que a nota não pôde ser lida/salva por falta de permissão; 502/503/504 ou falha de rede: serviço indisponível
- [ ] `markdown.js` (módulo próprio na mesma pasta): converte títulos, listas (com e sem número), negrito, itálico, código em linha e em bloco, citações, links e parágrafos; **escapa todo HTML** do conteúdo antes de formatar; links só aceitam `http:`, `https:` e caminhos relativos (bloquear `javascript:`)
- [ ] `anotacoes.css`: layout em duas colunas e uma no celular, temas claro e escuro com variáveis de `css/style.css`, foco visível, estilos do Markdown renderizado, sem recursos externos
- [ ] Identificadores em ASCII e português (ex.: `listarNotas`, `abrirNota`, `salvarNota`, `excluirNota`, `renderizarMarkdown`)

### 2. Testes (pytest, seam HTTP do portal)
- [ ] `portal/testes/teste_anotacoes.py` no padrão de `teste_tradutor.py`: `/anotacoes/` devolve 200 com "Arca - Notas"; `anotacoes.css`, `anotacoes.js` e `markdown.js` devolvem 200; nenhum deles contém `http://` nem `https://` (atenção: o renderizador não deve ter URLs literais; usar regex sem protocolo literal ou esquema montado, e se inevitável ajustar o texto)

### 3. Fumaça
- [ ] `scripts/fumaca.sh`: incluir `/anotacoes/` e seus três arquivos próprios nas rotas e na varredura de recursos externos
- [ ] Estender a verificação de notas existente: criar nota de teste via `POST /notas/api/notes`, editar via `PATCH`, buscar via `/notas/api/search`, excluir via `DELETE` e confirmar 404 depois; usar título exclusivo da fumaça e limpar ao final; não tocar nas notas reais

### 4. Convenção
- [ ] Rodar `make teste-convencao`; campos de terceiros (`title`, `lastModified`) e usos de `.name`/`path` serão tratados na spec 021 (exceções com justificativa); se bloquear, adicionar a exceção aqui

## Acceptance Criteria
### Must Have
- [ ] `/anotacoes/` lista as notas existentes, da mais recente para a mais antiga
- [ ] Busca por título e conteúdo, com trechos destacados
- [ ] Criar, editar e excluir funcionam e o arquivo `.md` correspondente aparece/muda/some em `data/flatnotes` (verificar só com nota de teste)
- [ ] Título com acento e espaço funciona (ex.: "Água e luz")
- [ ] Criar título duplicado avisa; excluir pede confirmação
- [ ] Markdown nunca executa HTML ou `javascript:` presente no texto
- [ ] Com o FlatNotes fora do ar ou com 401/403, aparece mensagem em português
- [ ] Nenhum recurso externo; temas claro e escuro; `/notas/` nativo continua funcionando

### Should Have
- [ ] Filtro por etiqueta
- [ ] Aviso de alterações não salvas
- [ ] Utilizável em celular, com teclado e leitor de tela

## Testing Requirements
```bash
make teste-portal
make teste-convencao
make teste-fumaca
make subir
curl -sI http://127.0.0.1:8088/anotacoes/ | head -1
curl -s "http://127.0.0.1:8088/notas/api/search?term=*" | head
# manual: criar "Água e luz", editar, buscar, excluir; testar texto com <script> e [x](javascript:alert(1)); celular e tema escuro
```

## Rollback Plan
Remover a pasta `anotacoes/`, o teste novo e as linhas da fumaça com `git revert`. Nada em banco, compose ou Caddy foi alterado nesta spec.
