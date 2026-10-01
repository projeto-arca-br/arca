---
title: Testes e documentação do tradutor
number: 018
priority: medium
tags: [testing, docs, convention, translate]
dependencies: [016-corrigir-modelos-traducao.spec.md, 017-tradutor-portal.spec.md]
related_prd: .claude/prd/003-tradutor-no-portal.md
status: pending
created: 2026-10-01
---

# 018 - Testes e documentação do tradutor

## Overview
Cobre com testes automatizados a migração 005, a página `/tradutor/` e a rota da API, atualiza a fumaça, mantém o teste de convenção verde e atualiza README e guias.

## Related PRD
- **Source**: [Tradutor dentro do portal](../prd/003-tradutor-no-portal.md)
- **Section Reference**: User Stories 40-44; Testing Decisions

## Prerequisites
- [ ] Specs 016 e 017 concluídos

## Dependencies
- `016-corrigir-modelos-traducao.spec.md` - modelos e idiomas
- `017-tradutor-portal.spec.md` - página e migração

## Implementation Tasks
### 1. Testes do portal (pytest, MariaDB real)
- [ ] `portal/testes/teste_migracoes.py`: aplicar a 005 e verificar `caminho` do serviço `traducao` igual a `/tradutor/`; reverter e verificar `/traducao/`; ajustar as contagens de migrações aplicadas que mudam com a 005
- [ ] `portal/testes/teste_servicos.py`: a lista de serviços continua trazendo `traducao`
- [ ] Novo teste (ex.: `teste_tradutor.py`): `GET /tradutor/` responde 200 e contém o título em português; nomes de funções `teste_<frase_em_portugues>`

### 2. Fumaça da stack
- [ ] `scripts/fumaca.sh`: com o perfil `traducao`, verificar `/tradutor/` (200), `/traducao/languages` (lista en, pb, es) e que `/traducao/` não serve mais a interface do LibreTranslate
- [ ] Mensagens em português; manter o comportamento atual quando o perfil está desligado

### 3. Convenção
- [ ] `make teste-convencao` passa; só adicionar exceção em `scripts/convencao-excecoes.txt` com justificativa e se for realmente necessária (ex.: migração que cita nomes antigos)
- [ ] Validar os links relativos dos novos PRD e specs

### 4. Documentação
- [ ] `README.md`: tabela de rotas e serviços com `/tradutor/` (página) e `/traducao/` (API); idiomas en/pb/es
- [ ] `docs/USO.md`: como usar a página de tradução
- [ ] `docs/OFFLINE.md`: baixar modelos (en/pb/es) e atualizar quem tinha `pt`
- [ ] `.claude/specs/INDEX.md`: linhas 016, 017 e 018
- [ ] `.claude/learnings/`: registrar decisões sobre a página e a interface desligada

## Acceptance Criteria
### Must Have
- [ ] `make teste` passa (convenção, portal, operação, fumaça)
- [ ] A migração 005 tem teste de aplicar e reverter
- [ ] Documentação descreve `/tradutor/` e a API em `/traducao/`

### Should Have
- [ ] Nenhuma exceção nova de convenção sem justificativa

## Testing Requirements
```bash
make teste-portal
make teste-convencao
make teste-fumaca
make teste
```

## Rollback Plan
Reverter os testes, a fumaça e a documentação com `git revert`; a reversa da migração 005 já está coberta pelo spec 017.
