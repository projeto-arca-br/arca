---
title: Portal frontend (dashboard offline)
number: 004
priority: high
tags: [feature, portal, frontend]
dependencies: [003-portal-backend.spec.md]
related_prd: .claude/prd/001-arca-mvp.md
status: pending
created: 2026-09-30
---

# 004 - Portal frontend (dashboard offline)

## Overview
Interface estática, responsiva e sem CDN: painel de cartões com status, favoritos, biblioteca instalada e página de ajuda.

## Related PRD
- **Source**: [Arca MVP](../prd/001-arca-mvp.md)
- **Section Reference**: User Stories 1–4, 15–17, 34, 35

## Prerequisites
- [ ] Spec 003 concluído

## Dependencies
- `003-portal-backend.spec.md` - API

## Implementation Tasks
### 1. Dashboard
- [ ] Cartões por ferramenta com indicador online/offline/disabled (polling leve)
- [ ] Layout responsivo (mobile first), fontes e ícones locais
### 2. Favoritos e biblioteca
- [ ] Adicionar/remover favoritos; listar inventário de conteúdo
### 3. Ajuda
- [ ] Página de ajuda offline por ferramenta
### 4. Testing
- [ ] Smoke: `/` carrega e nenhuma requisição sai do host (verificar logs/rede isolada)

## Acceptance Criteria
### Must Have
- [ ] Zero requisições externas
- [ ] Utilizável em viewport de 360px
### Should Have
- [ ] Modo escuro

## Testing Requirements
```bash
curl -sf http://localhost/ | grep -qi arca
grep -RInE 'https?://' portal/app/static --include=*.html --include=*.js --include=*.css | grep -v localhost
```

## Rollback Plan
Reverter `portal/app/static` ao placeholder.
