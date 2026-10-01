---
title: Teste de convenção e fechamento
number: 015
priority: medium
tags: [testing, convention, docs]
dependencies: [014-readme-raiz.spec.md]
related_prd: .claude/prd/002-identidade-e-ptbr.md
status: pending
created: 2026-09-30
---

# 015 - Teste de convenção e fechamento

## Overview
Adiciona a verificação automática da regra de idioma e dos links da documentação e fecha a iniciativa registrando as decisões.

## Related PRD
- **Source**: [Identidade do Arca e português total](../prd/002-identidade-e-ptbr.md)
- **Section Reference**: User Stories 31-32, 36; Testing Decisions

## Prerequisites
- [ ] Specs 009 a 014 concluídos

## Dependencies
- `014-readme-raiz.spec.md` - README e docs finais

## Implementation Tasks
### 1. Verificação
- [ ] Script de convenção: procurar termos do glossário em inglês em código, SQL, scripts, Makefile e docs, ignorando a lista de exceções (arquivo versionado)
- [ ] Validar links relativos do README e de `docs/`
- [ ] Alvo `make teste-convencao` e inclusão em `make teste`
### 2. Fechamento
- [ ] Atualizar `.claude/learnings/` com as decisões (regra de idioma, migração, identidade)
- [ ] Marcar specs 009-015 como `done` em `INDEX.md`

## Acceptance Criteria
### Must Have
- [ ] `make teste` passa, incluindo a convenção
- [ ] Zero ocorrências de termos proibidos fora das exceções

### Should Have
- [ ] Gancho de pré-commit opcional documentado

## Testing Requirements
```bash
make teste
```

## Rollback Plan
Remover o alvo e o script de convenção.
