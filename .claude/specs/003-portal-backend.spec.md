---
title: Portal backend (FastAPI + MariaDB)
number: 003
priority: high
tags: [feature, portal, api, database]
dependencies: [001-stack-skeleton.spec.md]
related_prd: .claude/prd/001-arca-mvp.md
status: pending
created: 2026-09-30
---

# 003 - Portal backend (FastAPI + MariaDB)

## Overview
API do portal: catálogo de serviços com status, favoritos, inventário de conteúdo instalado e healthcheck, com migrações SQL no MariaDB.

## Related PRD
- **Source**: [Arca MVP](../prd/001-arca-mvp.md)
- **Section Reference**: User Stories 3, 15, 16, 31, 32; Implementation Decisions (Portal backend, Contrato da API, MariaDB); Testing Seam 2

## Prerequisites
- [ ] Spec 001 concluído

## Dependencies
- `001-stack-skeleton.spec.md` - MariaDB, Caddy

## Implementation Tasks
### 1. Projeto
- [ ] `portal/Dockerfile` (imagem pequena, dependências vendorizadas/pinadas para build offline via bundle), `pyproject.toml`
- [ ] Serviço `portal` no Compose, rota `/` e `/api` no Caddy
### 2. Banco
- [ ] `portal/migrations/001_init.sql`: tabelas `services`, `bookmarks`, `settings`, `content_items`, `health_log`
- [ ] Runner de migrações na inicialização (idempotente, espera MariaDB)
### 3. API
- [ ] `GET /api/health`
- [ ] `GET /api/services` com status via HTTP check (timeout curto, paralelo); serviços de profiles desligados aparecem como `disabled`
- [ ] CRUD `/api/bookmarks`
- [ ] `GET /api/library` (ZIMs, PMTiles, modelos, tamanho e data, lido de volumes somente leitura)
### 4. Testing
- [ ] pytest contra MariaDB real (container de teste): serviços/status, favoritos, inventário, migrações idempotentes

## Acceptance Criteria
### Must Have
- [ ] Endpoints acima funcionam e persistem dados após restart
- [ ] Falha de um serviço não derruba `/api/services`
- [ ] `pytest` passa
### Should Have
- [ ] OpenAPI disponível offline em `/api/docs` (assets locais)

## Testing Requirements
```bash
docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm portal pytest
```

## Rollback Plan
Remover serviço `portal`; `DROP` das tabelas via migração reversa documentada.
