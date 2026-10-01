# Notas e Wiki (spec 002)

- FlatNotes v5.5.4 suporta base path nativo: `FLATNOTES_PATH_PREFIX=/notas`. Caddy NÃO faz strip (`reverse_proxy flatnotes:8080`); healthcheck em `/notas/health` (curl existe na imagem). Sem auth: `FLATNOTES_AUTH_TYPE=none`. Arquivos `.md` em `data/flatnotes`; `PUID/PGID` (`ARCA_UID/ARCA_GID`, preenchidos pelo `make env`) evitam arquivos de root.
- kiwix-serve 3.7.0 (`ghcr.io/kiwix/kiwix-serve`): `command: ["--urlRootLocation=/wiki", "/data/*.zim"]`; o glob é expandido pelo start.sh da imagem (sem .zim em data/zim o kiwix falha ao subir). Healthcheck `wget /wiki/`. Sem strip no Caddy.
- Busca: `/wiki/search?content=<nome-do-zim-sem-.zim>&pattern=termo` (o parâmetro `content`, nome vem de `/wiki/catalog/v2/entries`). Novos ZIMs exigem `docker compose restart kiwix`.
- Páginas de artigos Kiwix trazem `<a href>` externos (citações), mas nenhum recurso externo é carregado automaticamente.
- Imagens: ARCA_IMAGEM_FLATNOTES e ARCA_IMAGEM_KIWIX em `.env.example` (tag@digest).
