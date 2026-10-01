---
title: Documentação e suíte de smoke tests
number: 008
priority: medium
tags: [docs, testing, infra]
dependencies: [004-portal-frontend.spec.md, 005-maps.spec.md, 006-extra-services.spec.md, 007-ops-scripts.spec.md]
related_prd: .claude/prd/001-arca-mvp.md
status: pending
created: 2026-09-30
---

# 008 - Documentação e suíte de smoke tests

## Overview
Fecha o MVP com documentação de instalação/uso offline e `make test` rodando smoke E2E da stack (incluindo verificação de isolamento de rede).

## Related PRD
- **Source**: [Arca MVP](../prd/001-arca-mvp.md)
- **Section Reference**: User Stories 4, 28, 30, 33, 35; Testing Decisions (Seam 1)

## Prerequisites
- [ ] Specs 004–007 concluídos

## Dependencies
- `004-portal-frontend.spec.md`, `005-maps.spec.md`, `006-extra-services.spec.md`, `007-ops-scripts.spec.md`

## Implementation Tasks
### 1. Smoke tests
- [ ] `scripts/smoke.sh`: sobe stack, valida rotas, healthchecks, 206 nos tiles
- [ ] Verificação offline: rede Docker `internal: true` e/ou bloqueio de saída; falha se houver tentativa externa
- [ ] `make test` executa smoke + pytest do portal
### 2. Documentação
- [ ] `docs/README.md`: visão, requisitos, instalação, perfis, uso
- [ ] `docs/OFFLINE.md`: preparar bundle, instalar sem internet, backup/restore, hardware e RAM por perfil
- [ ] Aviso de segurança (sem autenticação, somente LAN) e nome local (`arca.local`)
### 3. Learnings
- [ ] `.claude/learnings/arca-decisions.md` com decisões e armadilhas (base URLs, RAM)

## Acceptance Criteria
### Must Have
- [ ] `make test` passa em máquina limpa
- [ ] Docs permitem instalar sem consultar a internet
### Should Have
- [ ] Checklist de release

## Testing Requirements
```bash
make test
```

## Rollback Plan
Remover `scripts/smoke.sh` e docs; sem impacto em runtime.
