---
title: Esqueleto da stack (Compose, Caddy, MariaDB)
number: 001
priority: high
tags: [feature, infra, docker]
dependencies: []
related_prd: .claude/prd/001-arca-mvp.md
status: pending
created: 2026-09-30
---

# 001 - Esqueleto da stack (Compose, Caddy, MariaDB)

## Overview
Cria a base do Arca: `docker-compose.yml`, `.env`, Caddy como único ponto de entrada e MariaDB com tuning leve. Todos os specs seguintes se apoiam nesta base.

## Related PRD
- **Source**: [Arca MVP](../prd/001-arca-mvp.md)
- **Section Reference**: Implementation Decisions (Topologia, Proxy, MariaDB, Recursos, Segurança); User Stories 18, 25–28

## Prerequisites
- [ ] Docker e Docker Compose instalados
- [ ] Diretório `data/` gitignored

## Dependencies
Nenhuma.

## Implementation Tasks
### 1. Compose e configuração
- [ ] `docker-compose.yml` com rede interna; só o Caddy publica porta
- [ ] `.env.example` (porta, bind LAN, senhas MariaDB, versões das imagens)
- [ ] Imagens com versão/digest fixos; `restart: unless-stopped`; `mem_limit` por serviço
### 2. MariaDB
- [ ] `mariadb:lts` com `innodb_buffer_pool_size=128M`, volume em `data/mariadb`, healthcheck
### 3. Caddy
- [ ] `caddy/Caddyfile` com `auto_https off`, compressão, placeholder de rotas `/notas /wiki /traducao /cursos /livros /midia /mapas`
- [ ] Bind configurável do host (padrão: IP da LAN, não 0.0.0.0 público)
### 4. Makefile
- [ ] Alvos `up`, `down`, `ps`, `logs`
### 5. Testing
- [ ] Smoke: `docker compose up -d` deixa mariadb e caddy healthy

## Acceptance Criteria
### Must Have
- [ ] `make up` sobe mariadb e caddy healthy
- [ ] Apenas a porta do Caddy é publicada no host
### Should Have
- [ ] `.gitignore` cobre `data/` e `.env`

## Testing Requirements
```bash
docker compose up -d && docker compose ps
curl -sf http://localhost:${ARCA_PORT:-80}/ -o /dev/null
```

## Rollback Plan
`docker compose down -v` e remover arquivos criados.
