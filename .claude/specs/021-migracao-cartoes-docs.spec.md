---
title: Migração dos cartões, convenção e documentação
number: 021
priority: medium
tags: [feature, portal, database, testing, docs, convention]
dependencies: [019-wikipedia-portal.spec.md, 020-anotacoes-portal.spec.md]
related_prd: .claude/prd/004-wikipedia-e-notas-no-portal.md
status: done
created: 2026-10-01
---

# 021 - Migração dos cartões, convenção e documentação

## Overview
Aponta os cartões "Wikipédia" e "Notas" do painel para `/wikipedia/` e `/anotacoes/` por meio da migração 006 (com reversa), ajusta os testes de migração e de catálogo, registra as exceções do teste de convenção e atualiza ajuda, guia de uso e aprendizados.

## Related PRD
- **Source**: [Wikipédia e Notas dentro do portal](../prd/004-wikipedia-e-notas-no-portal.md)
- **Section Reference**: User Stories 1-2, 4, 7-8, 48-51; Implementation Decisions (Painel e dados, Idioma e convenção, Ajuda e documentação)

## Prerequisites
- [ ] Specs 019 e 020 concluídos e páginas funcionando

## Dependencies
- `019-wikipedia-portal.spec.md` - página `/wikipedia/`
- `020-anotacoes-portal.spec.md` - página `/anotacoes/`

## Implementation Tasks
### 1. Migração 006
- [ ] `portal/migrations/006_wikipedia_e_notas_no_portal.sql`: `UPDATE servicos SET caminho='/wikipedia/' WHERE identificador='wiki'` e `UPDATE servicos SET caminho='/anotacoes/' WHERE identificador='notas'`
- [ ] `portal/migrations/down/006_wikipedia_e_notas_no_portal.down.sql`: devolve `/wiki/` e `/notas/`
- [ ] Manter `url_verificacao` apontando para Kiwix e FlatNotes reais
- [ ] Não editar migrações já aplicadas (seguir o formato da 005)

### 2. Testes de portal
- [ ] `portal/testes/teste_migracoes.py`: lista de migrações aplicadas passa a `001`-`006`; adicionar teste de aplicar, reverter e reaplicar a 006 no padrão de `REVERSA_005`; ajustar contagens dependentes
- [ ] `portal/testes/teste_servicos.py`: `wiki.caminho == "/wikipedia/"` e `notas.caminho == "/anotacoes/"` em `teste_catalogo_padrao_tem_as_rotas_esperadas`; manter o conjunto dos 7 serviços
- [ ] `scripts/fumaca.sh`: ajustar verificações que assumem os caminhos antigos nos cartões (manter as de `/wiki/` e `/notas/` como serviços nativos)

### 3. Convenção
- [ ] `scripts/convencao-excecoes.txt`: uma exceção por padrão realmente usado, com justificativa, para os JS novos (`wikipedia.js`, `anotacoes.js`, `markdown.js`): campos impostos pelas APIs de Kiwix e FlatNotes (`title`, `lastModified`), `.name` ou `path` do DOM/URL; `*.html` já cobre `<meta name>` e `<title>`
- [ ] Conferir que nenhuma exceção ficou sem uso (o teste falha nesse caso) e que `make teste-convencao` passa, inclusive a validação de links dos `docs/*.md`

### 4. Ajuda e documentação
- [ ] `portal/app/static/site/ajuda/index.html`: seções `#notas` e `#wiki` descrevem as páginas novas (buscar, abrir artigo, aleatório; criar/editar/excluir nota, etiquetas) e o link para as telas nativas
- [ ] `docs/USO.md`: atualizar Notas e Wikipédia; `README.md` e `docs/README.md` só se citarem os caminhos antigos
- [ ] `.claude/learnings/wikipedia-notas-no-portal.md` (novo, em português): ZIM id = nome do arquivo sem `.zim` (não o `<name>` do catálogo), `label` do suggest escapado, listagem de notas via `search?term=*`, `HEAD /notas/` 404, iframe de mesma origem permitido, API do FlatNotes sem token com `AUTH_TYPE=none`
- [ ] Atualizar `.claude/learnings/notes-wiki.md` com ponteiro para o novo arquivo
- [ ] `.claude/specs/INDEX.md`: linhas 019, 020 e 021 (status `done` ao concluir) e, opcionalmente, corrigir `status: done` no frontmatter da 017

## Acceptance Criteria
### Must Have
- [ ] Cartões "Wikipédia" e "Notas" abrem `/wikipedia/` e `/anotacoes/`; continuam desativados quando o serviço estiver fora do ar
- [ ] Migração 006 aplica, reverte e reaplica sem erro
- [ ] `make teste` e `make teste-fumaca` passam
- [ ] Ajuda e guia de uso descrevem as páginas novas; learnings registrados

### Should Have
- [ ] INDEX atualizado e frontmatter da 017 corrigido

## Testing Requirements
```bash
make teste
make teste-fumaca
make subir
curl -s http://127.0.0.1:8088/api/servicos | grep -E '"/(wikipedia|anotacoes)/"'
# manual: no painel, clicar nos cartões Wikipédia e Notas; abrir Ajuda de cada um
```

## Rollback Plan
Aplicar a migração reversa 006 (cartões voltam para `/wiki/` e `/notas/`) e reverter os testes, a ajuda e as exceções com `git revert`. As páginas das specs 019 e 020 podem permanecer acessíveis diretamente.
