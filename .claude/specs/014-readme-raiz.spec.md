---
title: README da raiz com arquitetura
number: 014
priority: high
tags: [docs]
dependencies: [012-migracao-operacao.spec.md, 013-logo-paleta.spec.md]
related_prd: .claude/prd/002-identidade-e-ptbr.md
status: pending
created: 2026-09-30
---

# 014 - README da raiz com arquitetura

## Overview
Cria o `README.md` da raiz com logo, cenário, segurança, serviços, arquitetura e operação, e transforma `docs/README.md` em índice.

## Related PRD
- **Source**: [Identidade do Arca e português total](../prd/002-identidade-e-ptbr.md)
- **Section Reference**: User Stories 19-30, 35; Implementation Decisions (Documentação)

## Prerequisites
- [ ] Specs 012 e 013 concluídos

## Dependencies
- `012-migracao-operacao.spec.md` - comandos finais
- `013-logo-paleta.spec.md` - logo e paleta

## Implementation Tasks
### 1. README
- [ ] Logo no topo; o que é e por quê (cenário de crise sem internet no Brasil); aviso de segurança destacado
- [ ] Tabela de serviços, rotas e perfis
- [ ] Diagrama de arquitetura (Mermaid): dispositivo → Caddy → portal/notas/wiki/mapas/tradução/cursos/livros/mídia → MariaDB e volumes de `data/`
- [ ] Decisões: Caddy, FastAPI, MariaDB só do portal, perfis, imagens com digest, offline por construção
- [ ] Estrutura de pastas, requisitos, início rápido, fluxo offline, backup/restauração, testes (3 seams), paleta, limitações, licenças de terceiros
### 2. Docs
- [ ] `docs/README.md` vira índice apontando para o README, OFFLINE e RELEASE; atualizar comandos nos três
- [ ] Conferir cada comando citado contra o Makefile real

## Acceptance Criteria
### Must Have
- [ ] README completo, em português, com diagrama renderizável
- [ ] Sem duplicação divergente entre README e docs

### Should Have
- [ ] Seção de atualização (nomes novos do `.env`/Makefile)

## Testing Requirements
```bash
make teste-convencao   # links e termos (spec 015)
```

## Rollback Plan
Restaurar `docs/README.md` anterior e remover o `README.md` da raiz.
