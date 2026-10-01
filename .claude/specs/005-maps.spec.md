---
title: Mapas offline (MapLibre + PMTiles)
number: 005
priority: medium
tags: [feature, maps, frontend]
dependencies: [004-portal-frontend.spec.md]
related_prd: .claude/prd/001-arca-mvp.md
status: pending
created: 2026-09-30
---

# 005 - Mapas offline (MapLibre + PMTiles)

## Overview
Tela `/mapas` com MapLibre GL JS vendorizado, tiles PMTiles regionais servidos localmente com range requests, estilo, glyphs e sprites locais.

## Related PRD
- **Source**: [Arca MVP](../prd/001-arca-mvp.md)
- **Section Reference**: User Stories 9, 10; Implementation Decisions (Mapas)

## Prerequisites
- [ ] Spec 004 concluído
- [ ] Um `.pmtiles` regional em `data/maps/` (manual até o spec 007)

## Dependencies
- `004-portal-frontend.spec.md` - Frontend

## Implementation Tasks
### 1. Assets
- [ ] Vendorizar MapLibre GL JS, protocolo PMTiles, glyphs e sprites
- [ ] Estilo Protomaps local apontando para o `.pmtiles`
### 2. Servir tiles
- [ ] Caddy serve `data/maps` com `Accept-Ranges`/206 e cache
### 3. UI
- [ ] Tela `/mapas` com zoom/pan, busca simples por nome (se viável com dados locais), seletor de arquivo PMTiles instalado
### 4. Testing
- [ ] Smoke: requisição de range ao `.pmtiles` retorna 206; mapa renderiza sem chamadas externas

## Acceptance Criteria
### Must Have
- [ ] Mapa da região navegável offline
- [ ] Nenhum recurso externo
### Should Have
- [ ] Persistir última posição (localStorage)

## Testing Requirements
```bash
curl -s -o /dev/null -w '%{http_code}' -H 'Range: bytes=0-1023' http://localhost/mapas/data/regiao.pmtiles   # 206
```

## Rollback Plan
Remover rota `/mapas` e assets vendorizados.
