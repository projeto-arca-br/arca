# Decisões do Arca

- Arca = servidor de conhecimento 100% offline em Docker Compose, x86_64 com 8GB+ RAM.
- FlatNotes guarda notas em arquivos markdown (sem banco). MariaDB serve só o portal (FastAPI).
- Kavita (livros + quadrinhos) em vez de Calibre-Web; Jellyfin (filmes + música) em vez de Navidrome.
- MVP exclui IA local e comunicação (Meshtastic/Matrix/Wi-Fi AP).
- Seams de teste: smoke E2E via Caddy, API do portal com pytest + MariaDB real, backup/restore e bundle/load ponta a ponta.
- PRD e specs ficam em `.claude/prd/` e `.claude/specs/` (sem issue tracker; projeto não é git).
- Risco: suporte a base URL (`/notas`, `/livros`, `/midia`, `/cursos`) varia por app; fallback = subdomínios locais no Caddy.
- Spec-to-spec: a skill to-spec assume arquitetura DDD/Laravel; aqui foi adaptada para infra Docker + FastAPI.

## Fechamento do MVP (spec 008)

- Docs em `docs/` (pt-BR): `README.md` (visão, requisitos, instalação, perfis, uso, `arca.local`, aviso de segurança), `OFFLINE.md` (bundle, instalação sem internet, backup/restore, RAM por perfil, o que o teste de offline cobre) e `RELEASE.md` (checklist).
- `make teste` = `test-portal` + `teste-operacao` + `teste-fumaca` (`scripts/fumaca.sh`, 64 verificações). O smoke roda numa cópia descartável (projeto `arca-fumaca`, porta `ARCA_PORTA_FUMACA`=8099, independente de `ARCA_PORTA`), precisa de um `.zim` em `data/zim` (Kiwix não sobe sem; Caddy depende do Kiwix) e não baixa nada.
- Isolamento offline: `docker-compose.fumaca.yml` torna a rede `internal` `internal: true` e põe só o Caddy numa rede extra `edge` (porta publicada não funciona em rede internal). Os serviços sobem saudáveis sem rota de saída e o teste tenta conexão/DNS externo a partir de portal, flatnotes e kiwix (tem que falhar). Não cobre: tráfego do Caddy/MariaDB, perfis opcionais (só 308 + página 503), links externos dentro de conteúdo de terceiros. Se a máquina de teste já estiver sem internet o teste de conexão é vacuoso; a garantia real é `internal: true` + checagem de config. Não aplicado ao compose de produção de propósito.
- Varredura de URLs externas ignora `vendor/` e `assets/`; permitidos: namespaces `www.w3.org` (XML do Jellyfin) e o link de atribuição `openstreetmap.org/copyright` (só um `<a>`, nada é carregado).
- Armadilhas para quem documenta/opera: base URL por serviço (Kavita só por `appsettings.json`, Jellyfin por `network.xml`, Kolibri exige barra final, LibreTranslate `LT_URL_PREFIX`); RAM: soma dos `mem_limit` ~4,4 GB com todos os perfis; `restore.sh` sobe o MariaDB sozinho e para/religa os demais serviços; ZIM novo exige `docker compose restart kiwix`; bind em IP da LAN não atende `127.0.0.1`.
- Não verificados: downloads completos do `fetch-data completo`, mDNS `arca.local`, Kolibri zipcontent (porta 8081) atrás do Caddy, perfis opcionais dentro do smoke.
