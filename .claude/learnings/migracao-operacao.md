# Migração de operação para português (spec 012)

- Renomeados: scripts (`baixar-dados`, `empacotar`, `carregar`, `restaurar`, `fumaca`, `teste-operacao`; `lib.sh` e `backup.sh` mantidos), alvos do Makefile, `docker-compose.{teste,fumaca}.yml`, funções internas (`informar`, `sucesso`, `avisar`, `falhar`, `exigir_docker`...) e variáveis (`ARCA_*`).
- Variáveis do `.env`: `ARCA_PORTA`, `ARCA_ENDERECO`, `ARCA_IMAGEM_*` (antes `*_IMAGE`). `COMPOSE_PROFILES` fica (nome do Compose), mas os valores dos perfis mudaram para `traducao`, `cursos`, `midia`. Variáveis do portal viraram `ARCA_BD_*`, `ARCA_DIRETORIO_*`, `ARCA_PERFIS_ATIVOS`, `ARCA_TEMPO_LIMITE_VERIFICACAO` (definidas só no compose).
- Renomear o perfil exigiu a migração `004_perfis_em_portugues.sql` (atualiza `servicos.perfil`) com reversa em `migrations/down/`.
- Armadilha de sed em massa: `DB_USER: ` casa dentro de `MARIADB_USER: `; rodar substituições com limite de palavra e conferir com `docker compose config`.
- Armadilha de renomeação por regex em scripts: palavras como `info`/`download` viram função e quebram comandos reais (`docker info`, `download.kiwix.org`); sempre rodar `bash -n` e ler o diff.
- Backups feitos antes da migração usam nomes de arquivo internos antigos (`notes.tar`, `SHA256SUMS`...) e não são lidos pelo `restaurar.sh` novo; o `mariadb.sql` antigo em si é migrado automaticamente pelo portal (003/004).
- Pastas em `data/` (books, comics, media/movies...) não foram renomeadas (são dados reais).
- `/healthz` do Caddy virou `/saude-proxy`.
