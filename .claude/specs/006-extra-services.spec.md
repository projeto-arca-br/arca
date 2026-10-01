---
title: Serviços extras (LibreTranslate, Kolibri, Kavita, Jellyfin)
number: 006
priority: medium
tags: [feature, infra, docker, translate, learn, media]
dependencies: [001-stack-skeleton.spec.md, 003-portal-backend.spec.md]
related_prd: .claude/prd/001-arca-mvp.md
status: pending
created: 2026-09-30
---

# 006 - Serviços extras (LibreTranslate, Kolibri, Kavita, Jellyfin)

## Overview
Adiciona tradutor, cursos, biblioteca de livros/quadrinhos e mídia como serviços opcionais via profiles do Compose, com limites de memória e rotas no Caddy.

## Related PRD
- **Source**: [Arca MVP](../prd/001-arca-mvp.md)
- **Section Reference**: User Stories 11–14, 19, 20, 29; Implementation Decisions (LibreTranslate, Kolibri/Kavita/Jellyfin, Recursos)

## Prerequisites
- [ ] Specs 001 e 003 concluídos

## Dependencies
- `001-stack-skeleton.spec.md` - Compose/Caddy
- `003-portal-backend.spec.md` - status dos serviços

## Implementation Tasks
### 1. LibreTranslate (profile `translate`)
- [ ] `LT_LOAD_ONLY=en,pt,es`, `LT_UPDATE_MODELS=false`, volume de modelos; rota `/traducao`
### 2. Kolibri (profile `learn`)
- [ ] Volume `data/kolibri`; rota `/cursos`
### 3. Kavita (profile `media`)
- [ ] Volumes `data/books`, `data/comics`; rota `/livros`
### 4. Jellyfin (profile `media`)
- [ ] Volumes `data/media/movies`, `data/media/music`; `BaseUrl=/midia`; transcodificação por software limitada; rota `/midia`
### 5. Geral
- [ ] `mem_limit`, healthchecks, versões fixas; fallback de subdomínio documentado para base URL
- [ ] Registrar serviços no catálogo do portal (status `disabled` quando profile off)
### 6. Testing
- [ ] Smoke por profile: rotas respondem quando ativos

## Acceptance Criteria
### Must Have
- [ ] Cada profile sobe e responde na rota definida
- [ ] Stack base funciona sem nenhum profile extra
### Should Have
- [ ] Tradução pt↔en↔es funcional offline

## Testing Requirements
```bash
docker compose --profile translate --profile learn --profile media up -d
for p in traducao cursos livros midia; do curl -sf -o /dev/null http://localhost/$p/ || echo FAIL $p; done
```

## Rollback Plan
`docker compose --profile ... down`; remover serviços e rotas.
