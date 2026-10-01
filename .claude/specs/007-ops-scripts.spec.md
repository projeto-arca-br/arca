---
title: Scripts operacionais (fetch, bundle, backup)
number: 007
priority: high
tags: [feature, ops, scripts]
dependencies: [001-stack-skeleton.spec.md, 002-notes-wiki.spec.md]
related_prd: .claude/prd/001-arca-mvp.md
status: pending
created: 2026-09-30
---

# 007 - Scripts operacionais (fetch, bundle, backup)

## Overview
Scripts para preparar e replicar o Arca offline: baixar conteúdo, empacotar imagens e dados, carregar em máquina limpa, backup e restore.

## Related PRD
- **Source**: [Arca MVP](../prd/001-arca-mvp.md)
- **Section Reference**: User Stories 21–24; Testing Seam 3

## Prerequisites
- [ ] Specs 001 e 002 concluídos (idealmente 005 e 006)

## Dependencies
- `001-stack-skeleton.spec.md`
- `002-notes-wiki.spec.md`

## Implementation Tasks
### 1. fetch-data
- [ ] `scripts/fetch-data.sh` com perfis `mini`/`completo`: ZIM da Wikipédia pt, PMTiles regional, modelos LibreTranslate, canais Kolibri; retomável, com checksum
### 2. bundle/load
- [ ] `scripts/bundle.sh`: `docker save` de todas as imagens + dados em diretório de destino com manifesto
- [ ] `scripts/load.sh`: `docker load` + verificação + `make up`
### 3. backup/restore
- [ ] `scripts/backup.sh`: dump MariaDB + tar das notas (e configs), com timestamp
- [ ] `scripts/restore.sh`: restaura em volume limpo
### 4. Makefile
- [ ] Alvos `fetch-data`, `bundle`, `load`, `backup`, `restore`, `test`
### 5. Testing
- [ ] E2E: backup→restore em volume limpo; bundle→load em daemon limpo sem rede

## Acceptance Criteria
### Must Have
- [ ] Restore recupera notas e dados do portal
- [ ] Load sobe a stack sem acesso à internet
### Should Have
- [ ] Scripts idempotentes e com mensagens claras de erro

## Testing Requirements
```bash
make backup && make restore
make bundle DEST=/tmp/arca-bundle && make load SRC=/tmp/arca-bundle
```

## Rollback Plan
Scripts não alteram dados existentes sem confirmação; restore exige flag `--force`.
