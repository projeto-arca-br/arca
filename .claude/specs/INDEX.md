# Specs do Arca

| # | Título | Prioridade | Status | Tags | Dependências |
|---|--------|-----------|--------|------|--------------|
| 001 | Esqueleto da stack (Compose, Caddy, MariaDB) | high | done | feature, infra, docker | - |
| 002 | FlatNotes e Kiwix | high | done | feature, notes, wiki | 001 |
| 003 | Portal backend (FastAPI + MariaDB) | high | done | feature, portal, api, database | 001 |
| 004 | Portal frontend (dashboard offline) | high | done | feature, portal, frontend | 003 |
| 005 | Mapas offline (MapLibre + PMTiles) | medium | done | feature, maps, frontend | 004 |
| 006 | Serviços extras (LibreTranslate, Kolibri, Kavita, Jellyfin) | medium | done | feature, infra, translate, learn, media | 001, 003 |
| 007 | Scripts operacionais (fetch, bundle, backup) | high | done | feature, ops, scripts | 001, 002 |
| 008 | Documentação e smoke tests | medium | done | docs, testing, infra | 004, 005, 006, 007 |
| 009 | CLAUDE.md com a regra de português total | high | done | docs, convention | - |
| 010 | Migração do backend para português | high | done | migration, portal, api, database | 009 |
| 011 | Migração do frontend | high | done | migration, portal, frontend | 010 |
| 012 | Migração de scripts, Makefile, Compose e .env | high | done | migration, ops, infra, scripts | 010, 011 |
| 013 | Logo arca-farol e paleta | medium | done | feature, design, frontend | 011 |
| 014 | README da raiz com arquitetura | high | done | docs | 012, 013 |
| 015 | Teste de convenção e fechamento | medium | done | testing, convention, docs | 014 |
