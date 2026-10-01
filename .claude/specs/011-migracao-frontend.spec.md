---
title: Migração do frontend para as rotas e nomes em português
number: 011
priority: high
tags: [migration, portal, frontend]
dependencies: [010-migracao-backend.spec.md]
related_prd: .claude/prd/002-identidade-e-ptbr.md
status: pending
created: 2026-09-30
---

# 011 - Migração do frontend para as rotas e nomes em português

## Overview
Atualiza HTML, JS e CSS do portal e do mapa para consumir a API nova e usar nomes em português.

## Related PRD
- **Source**: [Identidade do Arca e português total](../prd/002-identidade-e-ptbr.md)
- **Section Reference**: User Stories 13-14; Implementation Decisions (Frontend)

## Prerequisites
- [ ] Spec 010 concluído

## Dependencies
- `010-migracao-backend.spec.md` - API nova

## Implementation Tasks
### 1. Portal
- [ ] Atualizar `app.js` e `common.js` para `/api/servicos`, `/api/favoritos`, `/api/biblioteca`, `/api/saude` e campos novos
- [ ] Renomear funções, variáveis, ids e classes CSS próprias; textos e comentários em português
### 2. Mapas e ajuda
- [ ] Atualizar `mapas.js` (lista de PMTiles vinda de `/api/biblioteca`), `ajuda/index.html` e referências internas
### 3. Verificação
- [ ] Conferir no navegador: painel, favoritos (criar/editar/remover), inventário, mapa e ajuda funcionando

## Acceptance Criteria
### Must Have
- [ ] Painel, favoritos, inventário e mapa funcionam sem erro no console
- [ ] Nenhuma chamada às rotas antigas

### Should Have
- [ ] Sem alteração visual além da identidade (spec 013)

## Testing Requirements
```bash
make test-smoke   # após a spec 012; antes, verificação manual no navegador
```

## Rollback Plan
Restaurar os arquivos de `portal/app/static/site` anteriores (junto com o rollback da spec 010).
