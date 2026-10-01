# Portal backend (spec 003)

- Stack: FastAPI 0.142.2 + uvicorn 0.54.0 + PyMySQL 1.2.3 (endpoints síncronos, conexão por requisição). Base `python:3.12-slim` fixada por digest (`ARCA_IMAGEM_PYTHON` no `.env`, build arg).
- Build offline: `portal/wheels/` tem todas as wheels (runtime + teste) e o Dockerfile instala com `PIP_NO_INDEX`. Para atualizar dependências: editar `requirements*.txt` e rodar `docker run --rm -v $PWD/portal:/w -w /w python:3.12-slim pip download -r requirements-test.txt -d wheels` (depois chown para o usuário).
- Dockerfile multi-stage: `runtime` (usuário 10001) e `test` (pytest + tests/). O compose de teste usa `target: test`.
- Testes: `docker compose -f docker-compose.yml -f docker-compose.teste.yml run --rm portal pytest` (ou `make testee-portal`). `mariadb-teste` usa tmpfs e senhas próprias, sem tocar `data/mariadb`. Usa `!override` (Compose >= 2.24) para trocar depends_on/environment/volumes do portal. Depois: `docker compose -f ... rm -sf mariadb-test`.
- Migrações: `portal/migrations/NNN_*.sql`, aplicadas no startup com `GET_LOCK`, registradas em `schema_migrations`. Divisor de SQL próprio (respeita aspas): não usar `;` dentro de strings além de aspas simples, nem `DELIMITER`. Reversas manuais em `migrations/down/`.
- Catálogo de serviços fica na tabela `services` (seed com INSERT IGNORE). Novos serviços de specs futuras: nova migração `002_*.sql` com INSERT/UPDATE em `services`.
- Status: `online` (HTTP < 500, inclusive 401/404), `offline` (erro/timeout/5xx), `disabled` (profile do serviço fora de `COMPOSE_PROFILES`, repassado como `ARCA_PERFIS_ATIVOS`). Checks em paralelo, timeout 1.5s (`CHECK_TIMEOUT`).
- `/api/docs`: Swagger UI com assets locais em `app/static/vendor/swagger` (swagger-ui-dist 5.17.14); `docs_url=None` do FastAPI evita CDN.
- Frontend: StaticFiles montado em `/` a partir de `portal/app/static/site` (declarado por último para não sombrear `/api`). Caddy: `/api*` e catch-all vão para `portal:8000`.
- Volumes somente leitura: `data/zim`, `data/maps`, `data/models` em `/biblioteca/*`. `make subir` cria as pastas.
