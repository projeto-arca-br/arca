#!/usr/bin/env bash
# Instala o Arca a partir de um pacote (scripts/empacotar.sh), sem internet.
# Uso: carregar.sh [PASTA_DO_PACOTE] [--destino DIR] [--sem-subir]
#   PASTA_DO_PACOTE  padrão: a pasta deste script (pacote) ou $ORIGEM
#   --destino   onde instalar (padrão: a raiz do projeto, se este script está em <projeto>/scripts;
#               senão ./arca)
#   --sem-subir  só carrega imagens e arquivos, não sobe a stack
# Passos: verifica SOMAS_SHA256 -> docker load -> extrai projeto/dados (sem sobrescrever
# arquivos existentes) -> confere imagens -> make subir (sem build e sem pull) -> saúde.
set -euo pipefail
_here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$_here/lib.sh"

ORIGEM="${ORIGEM:-}"; ALVO=""; SUBIR=1
while [ $# -gt 0 ]; do
  case "$1" in
    --destino) shift; ALVO="${1:-}";;
    --sem-subir) SUBIR=0;;
    -h|--ajuda) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    -*) falhar "opção desconhecida: $1";;
    *) ORIGEM="$1";;
  esac
  shift
done
[ -n "$ORIGEM" ] || { [ -f "$_here/SOMAS_SHA256" ] && ORIGEM="$_here"; }
[ -n "$ORIGEM" ] || falhar "informe o pacote: carregar.sh PASTA_DO_PACOTE (make carregar ORIGEM=/caminho)."
[ -d "$ORIGEM" ] || falhar "diretório do pacote não existe: $ORIGEM"
ORIGEM="$(cd "$ORIGEM" && pwd)"
if [ -z "$ALVO" ]; then
  if [ -f "$_here/../docker-compose.yml" ]; then ALVO="$(cd "$_here/.." && pwd)"; else ALVO="$PWD/arca"; fi
fi
mkdir -p "$ALVO"; ALVO="$(cd "$ALVO" && pwd)"

exigir_docker; exigir_comando tar; exigir_comando sha256sum; exigir_comando make
for f in SOMAS_SHA256 imagens.tar projeto.tar dados.tar manifesto.txt; do
  [ -f "$ORIGEM/$f" ] || falhar "pacote incompleto: falta $f em $ORIGEM."
done

informar "Verificando integridade do pacote..."
(cd "$ORIGEM" && sha256sum -c --quiet SOMAS_SHA256) || falhar "checksum inválido: pacote corrompido ou cópia incompleta."
sucesso "pacote íntegro"

informar "docker load (pode demorar)..."
docker load -i "$ORIGEM/imagens.tar" >&2 || falhar "docker load falhou."

informar "Instalando em $ALVO..."
tar -C "$ALVO" --skip-old-files -xf "$ORIGEM/projeto.tar"
mkdir -p "$ALVO/data"
tar -C "$ALVO/data" --skip-old-files -xf "$ORIGEM/dados.tar"
sucesso "projeto e dados extraídos (arquivos existentes foram preservados)"

# .env (cria se faltar) e verificação das imagens exigidas
export ARCA_RAIZ="$ALVO"
[ -f "$ALVO/.env" ] || make -C "$ALVO" --no-print-directory ambiente >&2
set -a; . "$ALVO/.env"; set +a
FALTANDO=0
while IFS= read -r linha; do
  var="${linha%%=*}"; referencia="${linha#*=}"
  case "$var" in ARCA_IMAGEM_PYTHON) continue;; ARCA_IMAGEM_*) ;; *) continue;; esac  # ARCA_IMAGEM_PYTHON só serve ao build do portal
  # Após docker save/load as imagens mantêm a etiqueta mas perdem o RepoDigest; sem ajuste o
  # compose tentaria puxar 'etiqueta@sha256:...' da internet. Usa a referência só com a etiqueta.
  if docker image inspect "$referencia" >/dev/null 2>&1; then continue; fi
  etiqueta="${referencia%%@*}"
  if [ "$etiqueta" != "$referencia" ] && docker image inspect "$etiqueta" >/dev/null 2>&1; then
    sed -i "s|^$var=.*|$var=$etiqueta|" "$ALVO/.env"
    informar "  $var: digest ausente após o carregamento, usando a etiqueta $etiqueta"
  else
    avisar "imagem ausente: $referencia"; FALTANDO=1
  fi
done < <(grep -E '^ARCA_IMAGEM_[A-Z_]+=' "$ALVO/.env")
docker image inspect arca-portal:0.1.0 >/dev/null 2>&1 || { avisar "imagem arca-portal:0.1.0 ausente"; FALTANDO=1; }
[ "$FALTANDO" = 0 ] || falhar "faltam imagens (veja avisos). O pacote foi feito com --perfis que não cobrem o COMPOSE_PROFILES do .env?"
sucesso "imagens verificadas"

if [ "$SUBIR" = 0 ]; then sucesso "Carregado. Suba com: cd $ALVO && make subir OPCOES_SUBIR='--no-build --pull never'"; exit 0; fi

informar "Subindo a stack (make subir, sem build/pull)..."
make -C "$ALVO" --no-print-directory subir OPCOES_SUBIR="--no-build --pull never" >&2 || falhar "make subir falhou; veja 'docker compose logs'."
ENDERECO="${ARCA_ENDERECO:-127.0.0.1}"; PORTA="${ARCA_PORTA:-80}"
for _ in $(seq 1 30); do
  if curl -fs "http://$ENDERECO:$PORTA/api/saude" >/dev/null 2>&1 || wget -q -O /dev/null "http://$ENDERECO:$PORTA/api/saude" 2>/dev/null; then
    sucesso "Arca no ar em http://$ENDERECO:$PORTA/"; exit 0
  fi
  sleep 2
done
falhar "a stack subiu mas /api/saude em http://$ENDERECO:$PORTA não respondeu."
