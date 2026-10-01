# Serviços extras (spec 006)

- Perfis Compose: `traducao` (libretranslate), `cursos` (kolibri), `midia` (kavita + jellyfin). Ativar em `COMPOSE_PROFILES` no `.env`; o portal repassa como `ARCA_PERFIS_ATIVOS` e mostra `desativado` se off. Migração `002_extra_services.sql` ajusta `check_url` (com prefixo) e `profile`.
- Caddy NÃO tem depends_on dos extras. `reverse_proxy` resolve o upstream por requisição; quando o serviço não existe retorna 502 e o `handle_errors` (502/503/504) devolve página 503 amigável. `redir /x /x/ 308` para as quatro rotas (Kolibri/LibreTranslate dão 404 sem a barra).
- Base URL (sem strip no Caddy):
  - LibreTranslate: `LT_URL_PREFIX=/traducao`; healthcheck `/traducao/languages`.
  - Kolibri: `KOLIBRI_URL_PATH_PREFIX=/cursos/`. A imagem EXIGE volume montado em `/kolibri` (não `/root/.kolibri`), senão sai em loop. Sobe como root e faz chown interno.
  - Kavita: base URL vem de `appsettings.json` (`"BaseUrl": "/livros/"`), NÃO de env. Semente em `kavita/appsettings.json`, copiada para `data/kavita` pelo `make diretorios-extras` se não existir (Kavita completa o TokenKey no 1º start). Sem isso serve em `/` e o `<base href>` fica errado. Roda como root (arquivos root em data/kavita).
  - Jellyfin: `BaseUrl` em `config/network.xml` (semente `jellyfin/network.xml`; `encoding.xml` limita threads=2, sem aceleração). `user: ARCA_UID`, `cpus: 2`, `mem_limit 1g`. Health `/midia/health`.
- Imagens (tag@digest do índice): libretranslate v1.9.6, kolibri 0.19.5, kavita 0.9.1, jellyfin 10.11.11.
- LibreTranslate offline: `make modelos-traducao` (uma vez, com internet) baixa modelos Argos + MiniSBD (`en/pt/es`) para `data/models/argos` (~700 MB). Sem os MiniSBD (`minisbd/*.onnx`) o 1º /translate tenta baixar do GitHub e falha offline. Com `LT_UPDATE_MODELS=false` e modelos presentes não baixa nada; verificado com `docker run --network none`. `user: ARCA_UID`, `XDG_DATA_HOME=/data`, `HOME=/tmp`.
- Armadilha de ambiente: a bridge do Docker nesta máquina trava no handshake TLS (MTU); por isso `modelos-traducao` usa `docker run --network host`. O portal lista `argos` como item `model` em /api/library.
- `make derrubar` derruba todos os perfis (`--profile` x3 + `--remove-orphans`). Memória medida em repouso: LT ~400 MB, Kavita ~330 MB, Jellyfin ~150 MB, Kolibri ~150 MB.
