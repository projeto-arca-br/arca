#!/usr/bin/env bash
# Baixa o conteúdo do Arca UMA vez (precisa de internet). Depois tudo roda offline.
# Uso: scripts/baixar-dados.sh [mini|completo] [--simular] [--somente zim,mapas,modelos,kolibri]
#
#   mini      Wikipédia pt (mini, ~1,7 GB) + mapas de Belo Horizonte (~5 MB)
#             + modelos de tradução en/pt/es (~700 MB) + canal Kolibri Ciênsação
#   completo  Wikipédia pt (nopic, vários GB) + mapas do estado de MG
#             + modelos de tradução + canais Kolibri (Khan Academy pt-BR, Sikana, PhET...)
#
# Retomável: downloads usam arquivo .part e 'curl -C -'; rode de novo após uma queda.
# Idempotente: o que já existe e confere (sha256) é pulado.
# Variáveis para sobrescrever (URLs/dados): ARCA_ZIM_URL, ARCA_ZIM_VARIANTE, ARCA_MAPA_NOME, ARCA_MAPA_AREA,
#   ARCA_MAPA_ZOOM_MAXIMO, ARCA_PROTOMAPS_URL, ARCA_CANAIS_KOLIBRI (ids separados por espaço),
#   ARCA_ACEITAR_SEM_SOMA=1 (aceita ZIM sem .sha256), ARCA_OPCOES_CURL.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

PERFIL=mini; SIMULAR=0; SOMENTE="zim,mapas,modelos,kolibri"
while [ $# -gt 0 ]; do
  case "$1" in
    mini|completo) PERFIL="$1";;
    --simular|-n) SIMULAR=1;;
    --somente) shift; SOMENTE="${1:-}";;
    -h|--ajuda) sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    *) falhar "argumento desconhecido: $1 (use mini|completo, --simular, --somente LISTA)";;
  esac
  shift
done
tem() { case ",$SOMENTE," in *",$1,"*) return 0;; esac; return 1; }

DADOS="$ARCA_RAIZ/data"
BASE_ZIM="https://download.kiwix.org/zim/wikipedia/"
BASE_PROTOMAPS="${ARCA_PROTOMAPS_URL:-https://build.protomaps.com}"
ARCA_IMAGEM_PMTILES="${ARCA_IMAGEM_PMTILES:-ghcr.io/protomaps/go-pmtiles:v1.31.2}"
case "$PERFIL" in
  mini)
    ARCA_ZIM_VARIANTE="${ARCA_ZIM_VARIANTE:-mini}"
    ARCA_MAPA_NOME="${ARCA_MAPA_NOME:-belo-horizonte}"; ARCA_MAPA_AREA="${ARCA_MAPA_AREA:--44.15,-20.05,-43.85,-19.75}"; ARCA_MAPA_ZOOM_MAXIMO="${ARCA_MAPA_ZOOM_MAXIMO:-14}"
    CANAIS="${ARCA_CANAIS_KOLIBRI:-265e242783c947ccbc1aafbe4bd64194}";; # Ciênsação (pt)
  completo)
    ARCA_ZIM_VARIANTE="${ARCA_ZIM_VARIANTE:-nopic}"
    ARCA_MAPA_NOME="${ARCA_MAPA_NOME:-minas-gerais}"; ARCA_MAPA_AREA="${ARCA_MAPA_AREA:--51.1,-22.95,-39.8,-14.2}"; ARCA_MAPA_ZOOM_MAXIMO="${ARCA_MAPA_ZOOM_MAXIMO:-12}"
    CANAIS="${ARCA_CANAIS_KOLIBRI:-2ac071c4672354f2aa78953448f81e50 c367b7d7cf625b9aa525972cad27c602 aa25450559b55bd79bc90c09dfb805d2 265e242783c947ccbc1aafbe4bd64194}";;
    # Khan Academy (pt-BR), Sikana (pt-BR), PhET (pt), Ciênsação (pt)
esac

executar() { if [ "$SIMULAR" = 1 ]; then informar "  [simulação] $*"; else "$@"; fi; }
exigir_comando curl

# baixar URL DESTINO SHA256_ESPERADO  (retomável; confere checksum; idempotente)
baixar() {
  local url="$1" destino="$2" esperado="$3" obtido
  if [ -f "$destino" ] && [ -z "$esperado" ]; then sucesso "$(basename "$destino") já existe; pulando (sem checksum)."; return 0; fi
  if [ -f "$destino" ]; then
    obtido="$(sha256sum "$destino" | cut -d' ' -f1)"
    if [ "$obtido" = "$esperado" ]; then sucesso "$(basename "$destino") já existe e confere; pulando."; return 0; fi
    avisar "$(basename "$destino") existe mas o checksum difere; baixando de novo."
    rm -f "$destino"
  fi
  mkdir -p "$(dirname "$destino")"
  informar "Baixando $url"
  # shellcheck disable=SC2086
  curl -fL --retry 5 --retry-delay 3 --retry-all-errors -C - ${ARCA_OPCOES_CURL:-} -o "$destino.part" "$url" \
    || falhar "o download falhou; rode o script de novo para retomar de onde parou ($destino.part)."
  obtido=""; [ -z "$esperado" ] || obtido="$(sha256sum "$destino.part" | cut -d' ' -f1)"
  if [ -n "$esperado" ] && [ "$obtido" != "$esperado" ]; then
    rm -f "$destino.part"
    falhar "checksum sha256 NÃO confere para $(basename "$destino") (esperado $esperado, obtido $obtido). Arquivo descartado; tente de novo."
  fi
  mv "$destino.part" "$destino"
  sucesso "$(basename "$destino") baixado${esperado:+ e verificado}."
}

# ---------- 1. ZIM da Wikipédia pt ----------
baixar_zim() {
  informar "== Wikipédia pt ($ARCA_ZIM_VARIANTE) =="
  local url url_soma nome esperado
  if [ -n "${ARCA_ZIM_URL:-}" ]; then
    url="$ARCA_ZIM_URL"
  else
    nome="$(curl -fsSL --retry 3 "$BASE_ZIM" | grep -o "wikipedia_pt_all_${ARCA_ZIM_VARIANTE}_[0-9-]*\.zim" | sort -u | tail -1)" \
      || falhar "não consegui listar $BASE_ZIM (sem internet?)."
    [ -n "$nome" ] || falhar "nenhum ZIM wikipedia_pt_all_${ARCA_ZIM_VARIANTE}_* encontrado em $BASE_ZIM."
    url="$BASE_ZIM$nome"
  fi
  nome="$(basename "$url")"; url_soma="${ARCA_ZIM_SHA256_URL:-$url.sha256}"
  if [ "$SIMULAR" = 1 ]; then
    informar "  [simulação] baixar $url (+ $url_soma) -> data/zim/$nome; depois 'docker compose restart kiwix'"
    return 0
  fi
  esperado="$(curl -fsSL --retry 3 "$url_soma" 2>/dev/null | awk '{print $1}' | head -1 || true)"
  if ! [[ "$esperado" =~ ^[0-9a-f]{64}$ ]]; then
    [ "${ARCA_ACEITAR_SEM_SOMA:-0}" = 1 ] || falhar "não consegui obter o sha256 em $url_soma (defina ARCA_ACEITAR_SEM_SOMA=1 para aceitar sem verificação)."
    avisar "sem checksum publicado; arquivo NÃO será verificado."
    esperado=""
  fi
  baixar "$url" "$DADOS/zim/$nome" "$esperado"
  informar "Dica: se a stack está rodando, 'docker compose restart kiwix' para servir o novo ZIM."
}

# ---------- 2. PMTiles regional ----------
ultima_versao_protomaps() {
  local indice dia
  for indice in $(seq 0 30); do
    dia="$(date -d "-$indice day" +%Y%m%d)"
    if curl -fsI --max-time 20 "$BASE_PROTOMAPS/$dia.pmtiles" >/dev/null 2>&1; then echo "$dia"; return 0; fi
  done
  return 1
}
baixar_mapas() {
  informar "== Mapas ($ARCA_MAPA_NOME, bbox $ARCA_MAPA_AREA, zoom <= $ARCA_MAPA_ZOOM_MAXIMO) =="
  local saida="$DADOS/maps/$ARCA_MAPA_NOME.pmtiles" versao
  if [ -s "$saida" ]; then sucesso "$ARCA_MAPA_NOME.pmtiles já existe; pulando (apague para refazer)."; return 0; fi
  if [ "$SIMULAR" = 1 ]; then
    informar "  [simulação] pmtiles extract $BASE_PROTOMAPS/<AAAAMMDD mais recente>.pmtiles -> data/maps/$ARCA_MAPA_NOME.pmtiles (via $ARCA_IMAGEM_PMTILES)"
    return 0
  fi
  exigir_docker
  versao="$(ultima_versao_protomaps)" || falhar "nenhuma versão recente em $BASE_PROTOMAPS (sem internet?)."
  mkdir -p "$DADOS/maps"; rm -f "$DADOS/maps/.$ARCA_MAPA_NOME.partial"
  # --network host: a bridge do Docker pode travar no TLS em algumas redes (MTU/VPN).
  docker run --rm --network host --user "$(id -u):$(id -g)" -v "$DADOS/maps:/saida" "$ARCA_IMAGEM_PMTILES" \
    extract "$BASE_PROTOMAPS/$versao.pmtiles" "/saida/.$ARCA_MAPA_NOME.partial" --bbox="$ARCA_MAPA_AREA" --maxzoom="$ARCA_MAPA_ZOOM_MAXIMO" \
    || falhar "pmtiles extract falhou."
  [ -s "$DADOS/maps/.$ARCA_MAPA_NOME.partial" ] || falhar "extração vazia."
  mv "$DADOS/maps/.$ARCA_MAPA_NOME.partial" "$saida"
  sucesso "$ARCA_MAPA_NOME.pmtiles ($(humano "$(stat -c %s "$saida")"), versão $versao)"
}

# ---------- 3. Modelos do LibreTranslate ----------
baixar_modelos() {
  informar "== Modelos de tradução (Argos en/pt/es) =="
  if [ "$SIMULAR" = 1 ]; then informar "  [simulação] make modelos-traducao (~700 MB em data/models/argos)"; return 0; fi
  exigir_docker
  make -C "$ARCA_RAIZ" --no-print-directory modelos-traducao
}

# ---------- 4. Canais Kolibri ----------
baixar_kolibri() {
  informar "== Canais Kolibri: $CANAIS =="
  if [ "$SIMULAR" = 1 ]; then
    for c in $CANAIS; do informar "  [simulação] kolibri manage importchannel+importcontent network $c"; done
    return 0
  fi
  exigir_docker; carregar_env criar
  mkdir -p "$DADOS/kolibri"
  for c in $CANAIS; do
    informar "Canal $c (importchannel + importcontent; retoma se já parcial)"
    # Sobe como root (a imagem faz chown interno de /kolibri), como o serviço 'kolibri'.
    docker run --rm --network host -v "$DADOS/kolibri:/kolibri" "$ARCA_IMAGEM_KOLIBRI" sh -c \
      "kolibri manage importchannel network $c && kolibri manage importcontent network $c" \
      || falhar "importação do canal $c falhou; rode de novo para retomar."
  done
  sucesso "canais Kolibri importados (reinicie o kolibri se estiver rodando: docker compose restart kolibri)"
}

informar "Perfil: $PERFIL$([ "$SIMULAR" = 1 ] && echo ' (simulação)')"
tem zim && baixar_zim
tem mapas && baixar_mapas
tem modelos && baixar_modelos
tem kolibri && baixar_kolibri
sucesso "baixar-dados ($PERFIL) concluído."
