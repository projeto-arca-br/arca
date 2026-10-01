---
title: FlatNotes e Kiwix (notas e Wikipédia)
number: 002
priority: high
tags: [feature, notes, wiki, docker]
dependencies: [001-stack-skeleton.spec.md]
related_prd: .claude/prd/001-arca-mvp.md
status: pending
created: 2026-09-30
---

# 002 - FlatNotes e Kiwix

## Overview
Adiciona notas (FlatNotes) em `/notas` e Wikipédia/livros offline (Kiwix) em `/wiki`, roteados pelo Caddy.

## Related PRD
- **Source**: [Arca MVP](../prd/001-arca-mvp.md)
- **Section Reference**: User Stories 5–8; Implementation Decisions (FlatNotes, Kiwix)

## Prerequisites
- [ ] Spec 001 concluído
- [ ] Ao menos um `.zim` pequeno em `data/zim/` (manual até o spec 007)

## Dependencies
- `001-stack-skeleton.spec.md` - Compose, Caddy

## Implementation Tasks
### 1. FlatNotes
- [ ] Serviço `dullage/flatnotes` (versão fixa), `FLATNOTES_AUTH_TYPE=none`, volume `data/flatnotes`
- [ ] Rota `/notas` no Caddy; se base path falhar, usar subdomínio/porta e documentar
### 2. Kiwix
- [ ] Serviço `kiwix-serve` com `--urlRootLocation /wiki` servindo `data/zim/*.zim`
- [ ] Rota `/wiki` no Caddy; healthchecks
### 3. Testing
- [ ] Smoke: `/notas/` e `/wiki/` respondem 200
- [ ] Persistência: criar nota, reiniciar, nota existe

## Acceptance Criteria
### Must Have
- [ ] Notas criadas persistem após `docker compose restart`
- [ ] Busca Kiwix retorna resultados do ZIM
- [ ] Nenhuma requisição externa no carregamento das páginas
### Should Have
- [ ] Healthchecks ativos

## Testing Requirements
```bash
curl -sf http://localhost/notas/ && curl -sf http://localhost/wiki/
```

## Rollback Plan
Remover serviços `flatnotes`/`kiwix` e rotas; dados em `data/` preservados.
