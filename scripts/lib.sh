#!/usr/bin/env bash
# Funções comuns dos scripts operacionais do Arca. Use com `source`.

# Raiz do projeto = pasta pai de scripts/ (ou ARCA_RAIZ, se definida).
ARCA_RAIZ="${ARCA_RAIZ:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

if [ -t 2 ]; then _R=$'\033[31m'; _Y=$'\033[33m'; _G=$'\033[32m'; _N=$'\033[0m'; else _R=; _Y=; _G=; _N=; fi
informar() { printf '%s\n' "$*" >&2; }
sucesso()   { printf '%s[ok]%s %s\n' "$_G" "$_N" "$*" >&2; }
avisar() { printf '%s[aviso]%s %s\n' "$_Y" "$_N" "$*" >&2; }
falhar()  { printf '%s[erro]%s %s\n' "$_R" "$_N" "$*" >&2; exit 1; }

exigir_comando() { command -v "$1" >/dev/null 2>&1 || falhar "comando '$1' não encontrado: ${2:-instale-o e tente de novo}."; }

exigir_docker() {
  exigir_comando docker "instale o Docker Engine"
  docker info >/dev/null 2>&1 || falhar "o daemon do Docker não responde (está rodando? seu usuário está no grupo docker?)."
  docker compose version >/dev/null 2>&1 || falhar "plugin 'docker compose' não encontrado."
}

# Carrega o .env da raiz (cria a partir do exemplo se faltar e $1 = criar).
carregar_env() {  # carregar_env [criar]
  if [ ! -f "$ARCA_RAIZ/.env" ]; then
    [ "${1:-}" = criar ] || falhar ".env não encontrado em $ARCA_RAIZ (rode 'make ambiente')."
    make -C "$ARCA_RAIZ" --no-print-directory ambiente >&2
  fi
  set -a; . "$ARCA_RAIZ/.env"; set +a
}

# docker compose em todos os perfis (para listar imagens e serviços de perfis desligados).
compose_todos() {
  docker compose --project-directory "$ARCA_RAIZ" --profile traducao --profile cursos --profile midia "$@"
}
compose() { docker compose --project-directory "$ARCA_RAIZ" "$@"; }

humano() { numfmt --to=iec --suffix=B "$1" 2>/dev/null || echo "${1}B"; }

# Gera um tar de $1 (diretório) em stdout usando a imagem do Caddy (alpine/busybox),
# lendo como root: funciona mesmo com arquivos de dono root/uid de container.
# Uso: dtar_criar DIRETORIO [--exclude=PADRÃO ...] > arquivo.tar
dtar_criar() {
  local diretorio="$1"; shift
  docker run --rm --network none -v "$diretorio:/src:ro" --entrypoint tar "$ARCA_IMAGEM_CADDY" -C /src "$@" -cf - .
}
# Extrai um tar (stdin) em $1, como root, preservando dono e permissões.
# Uso: dtar_extrair DIRETORIO < arquivo.tar
dtar_extrair() {
  local diretorio="$1"
  mkdir -p "$diretorio"
  docker run --rm -i --network none -v "$diretorio:/dst" --entrypoint tar "$ARCA_IMAGEM_CADDY" -C /dst -xpf -
}

# Remove arquivos -wal/-shm órfãos do SQLite em $1 (evita corromper um .db restaurado).
dlimpar_auxiliares_sqlite() {
  docker run --rm --network none -v "$1:/dst" --entrypoint sh "$ARCA_IMAGEM_CADDY" -c \
    'find /dst -type f \( -name "*.sqlite3-wal" -o -name "*.sqlite3-shm" -o -name "*.db-wal" -o -name "*.db-shm" \) -delete'
}

# Diretórios de estado do usuário (além das notas) salvos no backup: "nome|caminho|exclusões do tar..."
DIRETORIOS_ESTADO=(
  "kolibri|data/kolibri|--exclude=./content --exclude=./process_cache --exclude=./logs"
  "kavita|data/kavita|--exclude=./cache --exclude=./cache-long --exclude=./logs --exclude=./temp --exclude=./backups"
  "jellyfin|data/jellyfin/config|--exclude=./log --exclude=./logs --exclude=./data/transcodes"
)
