#!/usr/bin/env bash
# Restaura um backup do Arca (gerado por scripts/backup.sh) neste projeto.
# Uso: scripts/restaurar.sh --confirmar [--com-config] [ARQUIVO.tar.gz]
#   --confirmar    obrigatório: restaurar SOBRESCREVE notas, estado e banco atuais.
#   --com-config   também restaura .env, compose, Caddyfile... (originais ficam em *.pre-restauracao-*).
#   ARQUIVO        padrão: o backup mais recente em ./backups.
# Segurança: antes de sobrescrever, salva um dump do banco atual em backups/ e move a
# pasta de notas atual para data/flatnotes.pre-restauracao-<data>. Nada é apagado.
# Para "volume limpo": use um checkout/pasta nova do projeto (sem data/) e rode aqui.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

CONFIRMAR=0; COM_CONFIG=0; ARQUIVO=""
while [ $# -gt 0 ]; do
  case "$1" in
    --confirmar) CONFIRMAR=1;;
    --com-config) COM_CONFIG=1;;
    -h|--ajuda) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    -*) falhar "opção desconhecida: $1 (veja --ajuda)";;
    *) [ -z "$ARQUIVO" ] || falhar "informe apenas um arquivo de backup."; ARQUIVO="$1";;
  esac
  shift
done

if [ -z "$ARQUIVO" ]; then
  ARQUIVO="$(ls -1t "${ARCA_DIRETORIO_BACKUP:-$ARCA_RAIZ/backups}"/arca-backup-*.tar.gz 2>/dev/null | head -1 || true)"
  [ -n "$ARQUIVO" ] || falhar "nenhum backup encontrado em ${ARCA_DIRETORIO_BACKUP:-$ARCA_RAIZ/backups}. Informe o arquivo."
fi
[ -f "$ARQUIVO" ] || falhar "arquivo não encontrado: $ARQUIVO"
ARQUIVO="$(cd "$(dirname "$ARQUIVO")" && pwd)/$(basename "$ARQUIVO")"

if [ "$CONFIRMAR" != 1 ]; then
  informar "Restaurar $ARQUIVO sobrescreveria notas, estado dos serviços e o banco do portal."
  falhar "nada foi alterado. Repita com --confirmar (make restaurar CONFIRMAR=1)."
fi

exigir_docker; exigir_comando tar; carregar_env criar
CARIMBO="$(date +%Y%m%d-%H%M%S)"
TEMPORARIO="$(mktemp -d "${TMPDIR:-/tmp}/arca-restauracao.XXXXXX")"
trap 'rm -rf "$TEMPORARIO"' EXIT

informar "Verificando backup..."
tar -xzf "$ARQUIVO" -C "$TEMPORARIO" || falhar "arquivo de backup ilegível/corrompido."
PASTA="$(find "$TEMPORARIO" -mindepth 1 -maxdepth 1 -type d | head -1)"
[ -n "$PASTA" ] && [ -f "$PASTA/manifesto.txt" ] && [ -f "$PASTA/SOMAS_SHA256" ] || falhar "não parece um backup do Arca (manifesto.txt/SOMAS_SHA256 ausentes)."
(cd "$PASTA" && sha256sum -c --quiet SOMAS_SHA256) || falhar "checksum inválido: o backup está corrompido. Nada foi alterado."
[ -f "$PASTA/mariadb.sql" ] || falhar "backup sem mariadb.sql."
sucesso "backup íntegro"

# Estado atual da stack, para devolvê-la como estava
ESTAVA_RODANDO="$(compose_todos ps --status running --services 2>/dev/null | grep -vx mariadb || true)"
MARIA_ESTAVA_NO_AR=0; compose ps --status running --services 2>/dev/null | grep -qx mariadb && MARIA_ESTAVA_NO_AR=1

if [ -n "$ESTAVA_RODANDO" ]; then
  informar "Parando serviços (exceto MariaDB)..."
  # shellcheck disable=SC2086
  compose_todos stop $ESTAVA_RODANDO >/dev/null
fi

mkdir -p "$ARCA_RAIZ/data/mariadb" "$ARCA_RAIZ/data/flatnotes"
informar "Subindo MariaDB..."
compose up -d --wait mariadb >/dev/null || falhar "MariaDB não ficou saudável."

# Dump de segurança do banco atual (se já tiver tabelas)
BANCO="${MARIADB_DATABASE:-arca}"
NTABELAS="$(compose exec -T mariadb sh -c "mariadb -uroot -p\"\$MARIADB_ROOT_PASSWORD\" -N -e \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$BANCO'\"" 2>/dev/null | tr -d '\r' || echo 0)"
if [ "${NTABELAS:-0}" -gt 0 ] 2>/dev/null; then
  SEGURANCA="$ARCA_RAIZ/backups/pre-restauracao-$CARIMBO.sql"; mkdir -p "$ARCA_RAIZ/backups"
  compose exec -T mariadb sh -c 'exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --triggers --databases "$MARIADB_DATABASE"' > "$SEGURANCA" \
    || falhar "não consegui salvar o dump de segurança; abortando antes de alterar o banco."
  chmod 600 "$SEGURANCA"
  sucesso "dump do banco atual salvo em $SEGURANCA"
fi

informar "Restaurando banco..."
compose exec -T mariadb sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD"' < "$PASTA/mariadb.sql" \
  || falhar "falha ao importar mariadb.sql (dump de segurança do estado anterior: ${SEGURANCA:-n/a})."
sucesso "banco restaurado"

# Notas: pasta atual vai para o lado, nunca é apagada
if [ -f "$PASTA/notas.tar" ]; then
  informar "Restaurando notas..."
  if [ -n "$(ls -A "$ARCA_RAIZ/data/flatnotes" 2>/dev/null)" ]; then
    mv "$ARCA_RAIZ/data/flatnotes" "$ARCA_RAIZ/data/flatnotes.pre-restauracao-$CARIMBO"
    avisar "notas anteriores preservadas em data/flatnotes.pre-restauracao-$CARIMBO"
  fi
  dtar_extrair "$ARCA_RAIZ/data/flatnotes" < "$PASTA/notas.tar"
  sucesso "notas restauradas"
fi

# Estado dos serviços opcionais: extrai por cima (conteúdo/caches ficam intactos)
for entrada in "${DIRETORIOS_ESTADO[@]}"; do
  IFS='|' read -r nome_estado caminho_estado _ <<<"$entrada"
  if [ -f "$PASTA/estado-$nome_estado.tar" ]; then
    informar "Restaurando estado: $nome_estado..."
    mkdir -p "$ARCA_RAIZ/$caminho_estado"
    dlimpar_auxiliares_sqlite "$ARCA_RAIZ/$caminho_estado"
    dtar_extrair "$ARCA_RAIZ/$caminho_estado" < "$PASTA/estado-$nome_estado.tar"
    sucesso "estado $nome_estado restaurado"
  fi
done

if [ "$COM_CONFIG" = 1 ] && [ -f "$PASTA/configuracao.tar" ]; then
  informar "Restaurando configs..."
  for f in .env docker-compose.yml caddy/Caddyfile; do
    [ -e "$ARCA_RAIZ/$f" ] && cp -p "$ARCA_RAIZ/$f" "$ARCA_RAIZ/$f.pre-restauracao-$CARIMBO"
  done
  tar -C "$ARCA_RAIZ" -xf "$PASTA/configuracao.tar"
  sucesso "configs restauradas (originais: *.pre-restauracao-$CARIMBO)"
fi

if [ -n "$ESTAVA_RODANDO" ]; then
  informar "Reiniciando serviços..."
  # shellcheck disable=SC2086
  compose_todos up -d --wait $ESTAVA_RODANDO mariadb >/dev/null || avisar "algum serviço não ficou saudável; veja 'make estado'."
elif [ "$MARIA_ESTAVA_NO_AR" = 0 ]; then
  compose stop mariadb >/dev/null
  informar "Stack não estava rodando; suba com 'make subir'."
fi
sucesso "Restauração concluída a partir de $(basename "$ARQUIVO")."
