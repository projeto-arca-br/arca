---
title: Migração de scripts, Makefile, Compose e .env
number: 012
priority: high
tags: [migration, ops, infra, scripts]
dependencies: [010-migracao-backend.spec.md, 011-migracao-frontend.spec.md]
related_prd: .claude/prd/002-identidade-e-ptbr.md
status: pending
created: 2026-09-30
---

# 012 - Migração de scripts, Makefile, Compose e .env

## Overview
Renomeia scripts, alvos do Makefile e variáveis próprias do projeto e atualiza smoke, backup/restauração e empacotamento para os nomes novos.

## Related PRD
- **Source**: [Identidade do Arca e português total](../prd/002-identidade-e-ptbr.md)
- **Section Reference**: User Stories 10-12, 33-34; Implementation Decisions (Operação); Testing Seams 1 e 3

## Prerequisites
- [ ] Specs 010 e 011 concluídos

## Dependencies
- `010-migracao-backend.spec.md` - tabelas e rotas novas
- `011-migracao-frontend.spec.md` - frontend novo

## Implementation Tasks
### 1. Makefile e scripts
- [ ] Alvos: `subir`, `derrubar`, `estado`, `logs`, `baixar-dados`, `empacotar`, `carregar`, `backup`, `restaurar`, `teste`, `teste-portal`, `teste-operacao`, `teste-fumaca`, `modelos-traducao`
- [ ] Renomear scripts (`baixar-dados.sh`, `empacotar.sh`, `carregar.sh`, `restaurar.sh`, `fumaca.sh`, `teste-operacao.sh`, `lib.sh`) e funções internas; mensagens em português
- [ ] Atualizar referências a tabelas (backup/restauração) e rotas (smoke)
### 2. Configuração
- [ ] `.env.example`, `docker-compose*.yml`, `Caddyfile`: renomear variáveis próprias; manter as de terceiros
- [ ] Atualizar o smoke: rotas novas, sem recurso externo
### 3. Verificação
- [ ] Rodar backup→restaurar e empacotar→carregar com os nomes novos

## Acceptance Criteria
### Must Have
- [ ] `make teste` completo passa
- [ ] Nenhum alvo, script ou variável própria em inglês

### Should Have
- [ ] Nota de atualização (mudança de nomes no `.env`) no README/docs

## Testing Requirements
```bash
make teste
```

## Rollback Plan
Restaurar Makefile, scripts e `.env.example` anteriores; o `.env` do usuário precisa ser ajustado manualmente (documentar).
