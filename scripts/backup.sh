#!/usr/bin/env bash
# Backup do Arca: dump do MariaDB + notas + estado dos serviços + configs.
# Uso: scripts/backup.sh [DIRETORIO_DESTINO]   (padrão: ./backups ou $ARCA_DIRETORIO_BACKUP)
# Gera <destino>/arca-backup-AAAAMMDD-HHMMSS.tar.gz. Só lê dados; não altera nada.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

case "${1:-}" in -h|--ajuda) sed -n '2,4p' "$0" | sed 's/^# \{0,1\}//'; exit 0;; esac
DESTINO="${1:-${ARCA_DIRETORIO_BACKUP:-$ARCA_RAIZ/backups}}"

exigir_docker; carregar_env
mkdir -p "$DESTINO"
CARIMBO="$(date +%Y%m%d-%H%M%S)"
NOME="arca-backup-$CARIMBO"
SAIDA="$DESTINO/$NOME.tar.gz"
AREA="$(mktemp -d "$DESTINO/.$NOME.XXXXXX")"
trap 'rm -rf "$AREA"' EXIT
PASTA="$AREA/$NOME"; mkdir -p "$PASTA"

# 1. Dump do MariaDB (precisa do serviço em execução)
if ! compose ps --status running --services 2>/dev/null | grep -qx mariadb; then
  falhar "o MariaDB não está rodando. Suba a stack ('make subir') e repita o backup."
fi
informar "Dump do MariaDB..."
compose exec -T mariadb sh -c \
  'exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --triggers --databases "$MARIADB_DATABASE"' \
  > "$PASTA/mariadb.sql" || falhar "falha no dump do MariaDB."
grep -q -- '-- Dump completed' "$PASTA/mariadb.sql" || falhar "dump do MariaDB incompleto."
sucesso "mariadb.sql ($(humano "$(stat -c %s "$PASTA/mariadb.sql")"))"

# 2. Notas (FlatNotes); o índice de busca é reconstruído sozinho
if [ -d "$ARCA_RAIZ/data/flatnotes" ]; then
  informar "Notas..."
  dtar_criar "$ARCA_RAIZ/data/flatnotes" --exclude=./.flatnotes > "$PASTA/notas.tar"
  sucesso "notas.tar ($(humano "$(stat -c %s "$PASTA/notas.tar")"))"
else
  avisar "data/flatnotes não existe; notas fora do backup."
fi

# 3. Estado dos serviços opcionais (contas, progresso, bibliotecas) sem caches/conteúdo
for entrada in "${DIRETORIOS_ESTADO[@]}"; do
  IFS='|' read -r nome_estado caminho_estado exclusoes <<<"$entrada"
  if [ -d "$ARCA_RAIZ/$caminho_estado" ] && [ -n "$(ls -A "$ARCA_RAIZ/$caminho_estado" 2>/dev/null)" ]; then
    informar "Estado: $nome_estado..."
    # shellcheck disable=SC2086
    dtar_criar "$ARCA_RAIZ/$caminho_estado" $exclusoes > "$PASTA/estado-$nome_estado.tar"
    sucesso "estado-$nome_estado.tar ($(humano "$(stat -c %s "$PASTA/estado-$nome_estado.tar")"))"
  fi
done

# 4. Configs (inclui .env com senhas: o arquivo final fica com permissão 600)
informar "Configs..."
CONFIGS=()
for f in .env .env.example docker-compose.yml caddy jellyfin kavita; do [ -e "$ARCA_RAIZ/$f" ] && CONFIGS+=("$f"); done
tar -C "$ARCA_RAIZ" -cf "$PASTA/configuracao.tar" "${CONFIGS[@]}"
sucesso "configuracao.tar"

# 5. Manifesto + checksums
{
  echo "arca_backup_versao=1"
  echo "criado_em=$(date -Iseconds)"
  echo "maquina=$(hostname)"
  echo "banco=${MARIADB_DATABASE:-arca}"
  echo "perfis_compose=${COMPOSE_PROFILES:-}"
  echo "arquivos=$(cd "$PASTA" && ls | grep -v -e '^manifesto.txt$' -e '^SOMAS_SHA256$' | tr '\n' ' ')"
} > "$PASTA/manifesto.txt"
(cd "$PASTA" && sha256sum $(ls | grep -v '^SOMAS_SHA256$') > SOMAS_SHA256)

# 6. Arquivo final (escrito em .part e renomeado: nunca deixa backup parcial com nome final)
tar -C "$AREA" -czf "$SAIDA.part" "$NOME"
chmod 600 "$SAIDA.part"
mv "$SAIDA.part" "$SAIDA"
sucesso "Backup criado: $SAIDA ($(humano "$(stat -c %s "$SAIDA")"))"
echo "$SAIDA"
