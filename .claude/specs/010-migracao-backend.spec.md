---
title: Migração do backend para português
number: 010
priority: high
tags: [migration, portal, api, database]
dependencies: [009-claude-md.spec.md]
related_prd: .claude/prd/002-identidade-e-ptbr.md
status: pending
created: 2026-09-30
---

# 010 - Migração do backend para português

## Overview
Renomeia tabelas, colunas, rotas, campos JSON e identificadores do portal para português, com migração SQL nova e reversa que preserva dados.

## Related PRD
- **Source**: [Identidade do Arca e português total](../prd/002-identidade-e-ptbr.md)
- **Section Reference**: User Stories 5-9, 13-14; Implementation Decisions (Banco, API); Testing Seam 2

## Prerequisites
- [ ] Spec 009 concluído

## Dependencies
- `009-claude-md.spec.md` - glossário

## Implementation Tasks
### 1. Banco
- [ ] Não editar as migrações `001` e `002`; conferir como `db.py` registra migrações aplicadas
- [ ] Criar `003_traducao_para_portugues.sql`: `RENAME TABLE` e `CHANGE COLUMN` (e índices) conforme o glossário, preservando dados; criar a migração reversa correspondente em `down/`
- [ ] Atualizar o catálogo de serviços (check do mapa aponta para a rota de saúde nova)
### 2. API
- [ ] Renomear rotas: `/api/saude`, `/api/servicos`, `/api/favoritos`, `/api/biblioteca`; campos JSON pelo glossário
- [ ] Renomear funções, classes, variáveis, configurações e módulos (`checks`, `library`, `config`, `db`); mensagens e logs em português
- [ ] Atualizar o healthcheck do `docker-compose.yml` para `/api/saude`
### 3. Testes
- [ ] Renomear e adaptar os testes do portal (saúde, serviços, favoritos, biblioteca, migrações)
- [ ] Novo teste: aplicar `001`+`002` com dados, aplicar `003`, verificar favoritos preservados; testar a reversa

## Acceptance Criteria
### Must Have
- [ ] `pytest` do portal passa
- [ ] Favoritos criados no esquema antigo aparecem em `/api/favoritos` após a migração
- [ ] Nenhum identificador em inglês fora das exceções em `portal/app` e `portal/tests`

### Should Have
- [ ] OpenAPI local (`/api/docs`) coerente com os nomes novos

## Testing Requirements
```bash
make teste-portal   # (ou o alvo atual até a spec 012: make test-portal)
```

## Rollback Plan
Aplicar a migração reversa `down/003` e restaurar o código anterior; fazer backup de `data/mariadb` antes de atualizar.
