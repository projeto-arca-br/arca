---
title: CLAUDE.md com a regra de português total
number: 009
priority: high
tags: [docs, convention]
dependencies: []
related_prd: .claude/prd/002-identidade-e-ptbr.md
status: pending
created: 2026-09-30
---

# 009 - CLAUDE.md com a regra de português total

## Overview
Cria o `CLAUDE.md` na raiz com a regra de idioma, as exceções e o glossário. É a base de todos os specs seguintes.

## Related PRD
- **Source**: [Identidade do Arca e português total](../prd/002-identidade-e-ptbr.md)
- **Section Reference**: User Stories 1-4; Implementation Decisions (Regra de idioma, Exceções, Glossário)

## Prerequisites
- [ ] Nenhum (primeiro spec da iniciativa)

## Dependencies
- Nenhuma

## Implementation Tasks
### 1. Conteúdo
- [ ] Criar `CLAUDE.md` na raiz em português: visão do projeto (3 linhas) e ponteiros para `README.md` e `docs/`
- [ ] Regra de idioma inegociável (texto com acentos; identificadores em ASCII sem acento) cobrindo código, rotas, JSON, SQL, scripts, Makefile, `ARCA_*`, comentários, logs, UI, testes, docs, commits, PRs, specs e learnings
- [ ] Lista de exceções (terceiros, palavras-chave, nomes-padrão de arquivo)
- [ ] Tabela do glossário inglês→português (a do PRD, completa)
### 2. Operação
- [ ] Comandos `make` (já com os nomes novos da spec 012), convenções de teste, regra de não tocar em `data/`, aviso de rede sem autenticação
- [ ] Estrutura de pastas e regra: aprendizados em `.claude/learnings/`, nunca no `CLAUDE.md`

## Acceptance Criteria
### Must Have
- [ ] `CLAUDE.md` existe na raiz, todo em português, com regra, exceções e glossário
- [ ] Nenhum termo de instrução ambíguo: a regra diz explicitamente que vale para identificadores

### Should Have
- [ ] Exemplos certo/errado de nomeação

## Testing Requirements
```bash
test -s CLAUDE.md && grep -q 'Glossário' CLAUDE.md
```

## Rollback Plan
Remover `CLAUDE.md`.
