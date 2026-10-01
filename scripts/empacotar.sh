#!/usr/bin/env bash
# Empacota o Arca para instalar em outra máquina SEM internet (o "pacote").
# Uso: scripts/empacotar.sh DESTINO [--perfis traducao,cursos,midia|nenhum]
# Gera em DESTINO:
#   imagens.tar   docker save de todas as imagens da stack (inclui o portal construído)
#   projeto.tar   compose, Caddyfile, portal, scripts, Makefile, .env.example (sem data/ nem .env)
#   dados.tar     conteúdo: zim, maps, models, kolibri, books, comics, media
#                 (NÃO inclui estado/dados de usuário: use backup.sh para isso)
#   manifesto.txt, SOMAS_SHA256, carregar.sh (+ lib.sh)   -> na máquina alvo: ./carregar.sh .
# --perfis: perfis cujas imagens entram (padrão: todos; 'nenhum' = só o núcleo).
# Precisa das imagens no daemon local (puxa as que faltarem; o portal é construído).
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

DESTINO=""; PERFIS="traducao,cursos,midia"
while [ $# -gt 0 ]; do
  case "$1" in
    --perfis) shift; PERFIS="${1:-}";;
    -h|--ajuda) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    -*) falhar "opção desconhecida: $1";;
    *) [ -z "$DESTINO" ] || falhar "informe apenas um destino."; DESTINO="$1";;
  esac
  shift
done
[ -n "$DESTINO" ] || falhar "informe o destino: scripts/empacotar.sh DESTINO (make empacotar DESTINO=/caminho)."

exigir_docker; exigir_comando tar; exigir_comando sha256sum; carregar_env criar
mkdir -p "$DESTINO"; DESTINO="$(cd "$DESTINO" && pwd)"
if [ -e "$DESTINO/manifesto.txt" ]; then
  avisar "$DESTINO já contém um pacote; será substituído."
fi

# 1. Imagens (perfis escolhidos; o núcleo sempre entra)
PERFIS_COMPOSE=()
if [ "$PERFIS" != nenhum ]; then IFS=, read -ra _p <<<"$PERFIS"; for p in "${_p[@]}"; do PERFIS_COMPOSE+=(--profile "$p"); done; fi
informar "Construindo imagens locais (portal)..."
docker compose --project-directory "$ARCA_RAIZ" "${PERFIS_COMPOSE[@]}" build --quiet >&2
mapfile -t REFERENCIAS < <(docker compose --project-directory "$ARCA_RAIZ" "${PERFIS_COMPOSE[@]}" config --images | sort -u)
[ "${#REFERENCIAS[@]}" -gt 0 ] || falhar "nenhuma imagem encontrada no compose."

SALVAS=(); LISTADAS=()
for referencia in "${REFERENCIAS[@]}"; do
  etiqueta="${referencia%%@*}"; digest=""; [[ "$referencia" == *@sha256:* ]] && digest="${referencia##*@}"
  if ! docker image inspect "$etiqueta" >/dev/null 2>&1; then
    informar "Puxando $referencia..."; docker pull "$referencia" >&2 || falhar "não consegui obter a imagem $referencia (sem internet?)."
  fi
  if [ -n "$digest" ] && ! docker image inspect "$etiqueta" --format '{{join .RepoDigests " "}}' | grep -q "${digest#sha256:}"; then
    avisar "$etiqueta local não tem o digest fixado ($digest); empacotando a versão local."
  fi
  SALVAS+=("$etiqueta"); LISTADAS+=("$referencia")
done
# A imagem auxiliar de tar dos scripts (ARCA_IMAGEM_CADDY) já faz parte do núcleo.

informar "docker save de ${#SALVAS[@]} imagens..."
docker save -o "$DESTINO/imagens.tar.part" "${SALVAS[@]}"
mv "$DESTINO/imagens.tar.part" "$DESTINO/imagens.tar"; chmod 644 "$DESTINO/imagens.tar"
sucesso "imagens.tar ($(humano "$(stat -c %s "$DESTINO/imagens.tar")"))"

# 2. Projeto
informar "Empacotando projeto..."
tar -C "$ARCA_RAIZ" -cf "$DESTINO/projeto.tar" \
  --exclude=./data --exclude=./.env --exclude=./backups --exclude=./.claude --exclude=./.git \
  --exclude='__pycache__' --exclude='.pytest_cache' .
sucesso "projeto.tar ($(humano "$(stat -c %s "$DESTINO/projeto.tar")"))"

# 3. Conteúdo (sem mariadb/notas/estado: isso é backup, não pacote)
informar "Empacotando dados de conteúdo..."
mkdir -p "$ARCA_RAIZ/data"
tar -C "$ARCA_RAIZ/data" -cf "$DESTINO/dados.tar" \
  --exclude=./mariadb --exclude=./flatnotes --exclude=./kavita --exclude=./jellyfin \
  --exclude='./kolibri/logs' --exclude='./kolibri/process_cache' .
sucesso "dados.tar ($(humano "$(stat -c %s "$DESTINO/dados.tar")"))"

# 4. Scripts de carga + manifesto + checksums
cp "$ARCA_RAIZ/scripts/carregar.sh" "$ARCA_RAIZ/scripts/lib.sh" "$DESTINO/"
{
  echo "arca_pacote_versao=1"
  echo "criado_em=$(date -Iseconds)"
  echo "maquina=$(hostname)"
  echo "perfis=$PERFIS"
  echo "imagens:"
  for i in "${!SALVAS[@]}"; do echo "  ${SALVAS[$i]}  (fixada: ${LISTADAS[$i]})"; done
  echo "entradas_dados:"
  (cd "$ARCA_RAIZ/data" && ls -1 | grep -v -x -e mariadb -e flatnotes -e kavita -e jellyfin | sed 's/^/  /') || true
} > "$DESTINO/manifesto.txt"
(cd "$DESTINO" && sha256sum imagens.tar projeto.tar dados.tar manifesto.txt carregar.sh lib.sh > SOMAS_SHA256)
sucesso "Pacote pronto em $DESTINO ($(du -sh "$DESTINO" | cut -f1)). Na máquina alvo: cd $DESTINO && ./carregar.sh ."
