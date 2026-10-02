---
title: Conversor Markdown e verificação da API do FlatNotes
number: 022
priority: high
tags: [feature, portal, frontend, notes, testing]
dependencies: [020-anotacoes-portal.spec.md, 021-migracao-cartoes-docs.spec.md]
related_prd: .claude/prd/005-editor-visual-de-notas.md
status: done
created: 2026-10-01
---

# 022 - Conversor Markdown e verificação da API do FlatNotes

## Overview
Confirma, contra o FlatNotes em execução, os formatos de etiquetas, anexos e renomeação; e cria os dois conversores puros (Markdown para HTML seguro e conteúdo do editor para Markdown) com teste de ida e volta. É a base do editor visual das specs 023 e 024. Nenhuma tela muda nesta spec.

## Related PRD
- **Source**: [Editor visual de notas no portal](../prd/005-editor-visual-de-notas.md)
- **Section Reference**: User Stories 17-26, 43-46; Implementation Decisions (Dois conversores puros, Ida e volta estável, Segurança); Testing Decisions (Seam 2); Further Notes

## Prerequisites
- [ ] Specs 020 e 021 concluídas
- [ ] Stack no ar (`make subir`) para a verificação da API
- [ ] `node` disponível no ambiente de teste (se não houver, o teste do conversor é pulado com aviso)

## Dependencies
- `020-anotacoes-portal.spec.md` - `markdown.js` atual e API usada
- `021-migracao-cartoes-docs.spec.md` - exceções de convenção e learnings

## Implementation Tasks
### 1. Verificar a API real do FlatNotes (sem tocar em notas reais)
- [ ] Com nota temporária de título exclusivo (ex.: "Verificação 022"), confirmar com `curl` e registrar em `.claude/learnings/editor-visual-de-notas.md`:
  - [ ] formato de `GET /notas/api/tags` com ao menos uma etiqueta (lista de texto ou objetos) e como o FlatNotes extrai etiquetas do corpo (`#etiqueta` em linha própria, no começo ou em qualquer lugar)
  - [ ] `POST /notas/api/attachments` (multipart, campo `file`): código, corpo da resposta e URL de download (`/notas/attachments/<arquivo>`); tamanho máximo; nome em caso de colisão
  - [ ] se `PATCH /notas/api/notes/<titulo>` aceita `newTitle` (renomear)
  - [ ] se existe `DELETE` de anexo
- [ ] Apagar a nota e os anexos de teste ao final; só mexer em arquivos que a própria verificação criou (não tocar em `data/` além disso)

### 2. Módulo `portal/app/static/site/anotacoes/conversor.js` (módulo ES, sem bibliotecas)
- [ ] `markdownParaHtml(texto)`: escapa todo HTML antes de formatar; suporta títulos 1-6, negrito, itálico, riscado, código em linha e em bloco (cerca), citações, listas com e sem número **aninhadas**, tarefas `- [ ]`/`- [x]`, tabelas, divisor `---`, links e imagens
- [ ] URLs aceitas: `http:`/`https:` (regex sem protocolo literal), caminhos que começam com `/`, `./`, `../`, `#` e o prefixo de anexos; `//` e `javascript:` bloqueados; sem `)` sobrando no texto (corrige o defeito cosmético conhecido)
- [ ] `htmlParaMarkdown(raiz)`: percorre o DOM do editor e emite Markdown suportado pelo FlatNotes (mesmos elementos acima); espaços e linhas em branco normalizados
- [ ] Reaproveitar a lógica de `markdown.js`; manter `markdown.js` exportando o que `anotacoes.js` atual usa até a spec 023 substituí-lo (ou reexportar de `conversor.js`)
- [ ] Sem `http://` nem `https://` literais; identificadores em português sem acento (`escaparHtml`, `analisarLinha`...); usar `setAttribute('class', ...)`
- [ ] Linhas com `.title`, `name`, `path`, `position` evitadas ou registradas em `scripts/convencao-excecoes.txt` com justificativa

### 3. Testes
- [ ] `portal/testes/teste_conversor.py`: chama `node` (módulo ES, `--input-type=module`) sobre `conversor.js` com um DOM mínimo (ex.: `linkedom`/`jsdom` **não** são permitidos; usar um DOM de teste escrito à mão em um script de apoio em `portal/testes/apoio/` ou limitar `htmlParaMarkdown` a uma interface de nós simples testável sem navegador); pula com aviso se não houver `node`
- [ ] Casos: ida e volta (Markdown → HTML → Markdown) estável para títulos, listas aninhadas, tarefas, tabelas, código, links, imagens, riscado, divisor; `<script>` fica escapado; `javascript:` e `//host` bloqueados; texto de nota antiga do FlatNotes abre sem perda
- [ ] `portal/testes/teste_anotacoes.py`: incluir `conversor.js` na lista de estáticos (200) e na checagem de ausência de `http://`/`https://`
- [ ] `scripts/fumaca.sh`: incluir `/anotacoes/conversor.js` nas rotas via Caddy e na varredura de recursos externos

### 4. Convenção
- [ ] Rodar `make teste-convencao`; novas exceções só com justificativa e em uso

## Acceptance Criteria
### Must Have
- [ ] Learning com os formatos reais de etiquetas, anexos, `newTitle` e `DELETE` de anexo
- [ ] Conversores com ida e volta estável nos casos listados
- [ ] Nenhum HTML ou `javascript:` do texto é executado
- [ ] `make teste` e `make teste-fumaca` passam

### Should Have
- [ ] Teste do conversor roda no `make teste-portal` quando houver `node`

## Testing Requirements
```bash
make teste-portal
make teste-convencao
make teste-fumaca
```

## Rollback Plan
Remover `conversor.js`, o teste novo e as linhas da fumaça com `git revert`. Nada em banco, compose ou Caddy é alterado.
