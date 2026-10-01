#!/usr/bin/env bash
# Teste de fumaça E2E da stack do Arca (spec 008). Não toca nos dados reais: roda numa cópia
# descartável do projeto (projeto Compose arca-fumaca, porta ARCA_PORTA_FUMACA, pasta temporária).
# Uso: scripts/fumaca.sh [estatico|tudo]   (padrão: tudo; 'estatico' não precisa de Docker em execução
#      além do 'docker compose config' e não sobe nada)
# Variáveis: ARCA_PORTA_FUMACA (padrão 8099), ARCA_MANTER_FUMACA=1 (não derruba a stack ao final).
# Requisitos: Docker + Compose, imagens já locais (ou internet só para o pull), e pelo menos um
# .zim em data/zim (o Kiwix não sobe sem ZIM). Não baixa nada durante o teste.
# O que cobre: configuração (só o Caddy publica porta, imagens fixadas, limites), rotas,
# healthchecks, 206 nos tiles, favoritos, persistência de notas, páginas sem recurso externo,
# e a stack rodando com a rede interna sem saída (internal: true).
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

QUE="${1:-tudo}"
PORTA="${ARCA_PORTA_FUMACA:-8099}"
PROJETO=arca-fumaca
BASE="http://127.0.0.1:$PORTA"
TRABALHO=""
PASSARAM=0; FALHARAM=0
passou() { sucesso "$1"; PASSARAM=$((PASSARAM+1)); }
falhou() { printf '%s[FALHOU]%s %s\n' "$_R" "$_N" "$1" >&2; FALHARAM=$((FALHARAM+1)); }
verificar() { local descricao="$1"; shift; if "$@" >/dev/null 2>&1; then passou "$descricao"; else falhou "$descricao"; fi; }
# code URL [curl args...] -> imprime o status HTTP
codigo() { local url="$1"; shift; curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$@" "$url" || true; }
esperar_codigo() { # esperar_codigo ESPERADO "descricao" URL [curl args]
  local esperado="$1" descricao="$2" url="$3"; shift 3
  local veio; veio="$(codigo "$url" "$@")"
  if [ "$veio" = "$esperado" ]; then passou "$descricao ($veio)"; else falhou "$descricao: esperado $esperado, veio $veio"; fi
}

dc() { (cd "$TRABALHO" && COMPOSE_PROJECT_NAME=$PROJETO docker compose -f docker-compose.yml -f docker-compose.fumaca.yml "$@"); }

limpar() {
  if [ -n "$TRABALHO" ] && [ -d "$TRABALHO" ]; then
    if [ "${ARCA_MANTER_FUMACA:-0}" = 1 ]; then avisar "ARCA_MANTER_FUMACA=1: stack $PROJETO mantida em $TRABALHO"; return; fi
    dc --profile traducao --profile cursos --profile midia down -v --remove-orphans >/dev/null 2>&1 || true
    # data/mariadb pertence ao uid do container: remove via docker
    docker run --rm -v "$TRABALHO:/w" --entrypoint sh "${ARCA_IMAGEM_CADDY:-caddy:2.9.1-alpine}" -c 'rm -rf /w/* /w/.[!.]*' >/dev/null 2>&1 || true
    rm -rf "$TRABALHO" 2>/dev/null || true
  fi
}
trap limpar EXIT

# ---------------------------------------------------------------- 1. Estático
verificacoes_estaticas() {
  informar "== 1) Configuração (sem subir nada) =="
  exigir_comando python3
  local config; config="$(mktemp)"
  # .env do exemplo: a verificação não depende do .env local
  ( cd "$ARCA_RAIZ" && env -i PATH="$PATH" HOME="$HOME" docker compose --env-file .env.example \
      --profile traducao --profile cursos --profile midia config --format json ) > "$config" 2>/dev/null \
    || falhar "docker compose config falhou."
  local resultado
  resultado="$(python3 - "$config" <<'PY'
import json, sys
c = json.load(open(sys.argv[1])); s = c["services"]; saida = []
pub = [n for n, v in s.items() if v.get("ports")]
saida.append(("só o caddy publica porta no host (publicam: %s)" % (pub or "nenhum"), pub == ["caddy"]))
p = s["caddy"]["ports"][0]
saida.append(("caddy publica somente a porta 80 do container, com bind explícito (%s)" % p.get("host_ip"), p["target"] == 80 and bool(p.get("host_ip"))))
saida.append(("nenhum serviço usa network_mode/privileged/expose extra", not any(v.get("network_mode") or v.get("privileged") for v in s.values())))
saida.append(("todos os serviços só na rede 'internal'", all(list(v.get("networks", {})) == ["internal"] for v in s.values())))
saida.append(("todos com healthcheck", all("healthcheck" in v for v in s.values())))
saida.append(("todos com restart: unless-stopped", all(v.get("restart") == "unless-stopped" for v in s.values())))
saida.append(("todos com limite de memória", all(v.get("mem_limit") for v in s.values())))
saida.append(("perfis opcionais: libretranslate=traducao, kolibri=cursos, kavita/jellyfin=midia",
  s["libretranslate"]["profiles"] == ["traducao"] and s["kolibri"]["profiles"] == ["cursos"]
  and s["kavita"]["profiles"] == ["midia"] and s["jellyfin"]["profiles"] == ["midia"]))
saida.append(("volumes de conteúdo do portal e do kiwix são somente leitura",
  all(v.get("read_only") for n in ("portal", "kiwix") for v in s[n]["volumes"] if "/biblioteca" in v["target"] or v["target"] == "/data")))
for nome, deu_certo in saida: print(("OK " if deu_certo else "NO ") + nome)
PY
)"
  while IFS= read -r linha; do
    case "$linha" in OK\ *) passou "${linha#OK }";; NO\ *) falhou "${linha#NO }";; esac
  done <<< "$resultado"
  rm -f "$config"

  # imagens fixadas por digest no .env.example
  local ruins; ruins="$(grep -E '^ARCA_IMAGEM_[A-Z_]+=' "$ARCA_RAIZ/.env.example" | grep -v '@sha256:' || true)"
  [ -z "$ruins" ] && passou "todas as ARCA_IMAGEM_* do .env.example têm etiqueta@digest" || falhou "imagens sem digest: $ruins"

  # nenhum endereço externo nas configs e no código do portal (vendor/fontes de terceiros ficam de fora)
  local arquivos achados
  arquivos=("$ARCA_RAIZ/caddy/Caddyfile" "$ARCA_RAIZ/docker-compose.yml" "$ARCA_RAIZ/jellyfin" "$ARCA_RAIZ/kavita")
  achados="$(grep -rnE --exclude-dir=vendor 'https?://' "${arquivos[@]}" 2>/dev/null | grep -vE 'https?://(127\.0\.0\.1|localhost|arca\.local|www\.w3\.org)' || true)"
  [ -z "$achados" ] && passou "configs (Caddyfile, compose, jellyfin, kavita) sem URL externa" || falhou "URL externa em config: $achados"
  achados="$(grep -rnE --include='*.html' --include='*.css' --include='*.js' --exclude-dir=vendor --exclude-dir=assets \
    'https?://|//cdn|@import +url\(' "$ARCA_RAIZ/portal/app/static/site" 2>/dev/null \
    | grep -vE 'https?://(127\.0\.0\.1|localhost|arca\.local|www\.w3\.org)|openstreetmap\.org/copyright|placeholder|exemplo|example' || true)"
  [ -z "$achados" ] && passou "frontend do portal (fora de vendor/) sem URL externa" || falhou "URL externa no frontend: $achados"
}

# ---------------------------------------------------------------- 2. Stack
criar_projeto() {
  TRABALHO="$(mktemp -d "${TMPDIR:-/tmp}/arca-fumaca.XXXXXX")"
  tar -C "$ARCA_RAIZ" -cf - --exclude=./data --exclude=./.env --exclude=./backups --exclude=./.claude \
    --exclude=__pycache__ --exclude=.pytest_cache . | tar -C "$TRABALHO" -xf -
  cp "$ARCA_RAIZ/.env.example" "$TRABALHO/.env"
  sed -i "s/^ARCA_PORTA=.*/ARCA_PORTA=$PORTA/; s/^ARCA_ENDERECO=.*/ARCA_ENDERECO=127.0.0.1/; s/^COMPOSE_PROFILES=.*/COMPOSE_PROFILES=/; \
s/^ARCA_UID=.*/ARCA_UID=$(id -u)/; s/^ARCA_GID=.*/ARCA_GID=$(id -g)/; s/^MARIADB_ROOT_PASSWORD=.*/MARIADB_ROOT_PASSWORD=fumaca-root/; \
s/^MARIADB_PASSWORD=.*/MARIADB_PASSWORD=fumaca-arca/" "$TRABALHO/.env"
  mkdir -p "$TRABALHO"/data/{mariadb,flatnotes,zim,maps,models}
  ls "$ARCA_RAIZ"/data/zim/*.zim >/dev/null 2>&1 \
    || falhar "preciso de pelo menos um .zim em data/zim (o Kiwix não sobe sem ZIM). Rode 'make baixar-dados' ou copie um."
  cp "$ARCA_RAIZ"/data/zim/*.zim "$TRABALHO/data/zim/"
  # "tiles" sintéticos: o teste só exercita Range/206, não o conteúdo
  head -c 2097152 /dev/urandom > "$TRABALHO/data/maps/fumaca.pmtiles"
}

verificacoes_pilha() {
  informar "== 2) Stack: subida e healthchecks =="
  exigir_docker; exigir_comando curl; exigir_comando python3
  criar_projeto
  informar "Subindo projeto $PROJETO na porta $PORTA (build local, sem pull)..."
  if ! dc up -d --build --pull never --wait >&2 2>"$TRABALHO/up.err"; then
    cat "$TRABALHO/up.err" >&2; dc ps >&2 || true; falhar "a stack não subiu saudável."
  fi
  passou "docker compose up --wait: todos os serviços do núcleo saudáveis"
  local servico estado_saude
  for servico in mariadb flatnotes kiwix portal caddy; do
    estado_saude="$(docker inspect -f '{{.State.Health.Status}}' "$(dc ps -q "$servico")" 2>/dev/null || echo none)"
    [ "$estado_saude" = healthy ] && passou "healthcheck $servico = healthy" || falhou "healthcheck $servico = $estado_saude"
  done
  verificar "perfis opcionais NÃO estão rodando por padrão" bash -c "[ -z \"\$(cd '$TRABALHO' && COMPOSE_PROJECT_NAME=$PROJETO docker compose ps -q libretranslate kolibri kavita jellyfin)\" ]"

  informar "== 3) Rotas via Caddy =="
  esperar_codigo 200 "/saude-proxy" "$BASE/saude-proxy"
  esperar_codigo 200 "/ (painel)" "$BASE/"
  esperar_codigo 200 "/ajuda/" "$BASE/ajuda/"
  esperar_codigo 200 "/mapas/" "$BASE/mapas/"
  esperar_codigo 200 "/api/saude" "$BASE/api/saude"
  esperar_codigo 200 "/api/docs (Swagger local)" "$BASE/api/docs"
  esperar_codigo 200 "/api/servicos" "$BASE/api/servicos"
  esperar_codigo 200 "/api/biblioteca" "$BASE/api/biblioteca"
  esperar_codigo 200 "/notas/ (FlatNotes)" "$BASE/notas/" -L
  esperar_codigo 200 "/wiki/ (Kiwix)" "$BASE/wiki/" -L
  esperar_codigo 200 "/wiki/catalog/v2/entries (catálogo de ZIMs)" "$BASE/wiki/catalog/v2/entries"
  esperar_codigo 404 "rota inexistente" "$BASE/nao-existe-xyz"

  local corpo
  corpo="$(curl -fs "$BASE/api/saude" || true)"
  echo "$corpo" | grep -q '"banco"' && passou "/api/saude reporta o banco: $corpo" || falhou "/api/saude sem campo banco: $corpo"
  corpo="$(curl -fs "$BASE/api/servicos" || true)"
  verificar "/api/servicos lista os 7 serviços; extras 'desativado' sem perfil" python3 - "$corpo" <<'PY'
import json, sys
d = {s["identificador"]: s["estado"] for s in json.loads(sys.argv[1])}
assert {"notas", "wiki", "mapas", "traducao", "cursos", "livros", "midia"} <= set(d), d
assert all(d[k] == "desativado" for k in ("traducao", "cursos", "livros", "midia")), d
assert d["notas"] == d["wiki"] == d["mapas"] == "online", d
PY
  verificar "/api/biblioteca inventaria o ZIM e o PMTiles" bash -c "curl -fs '$BASE/api/biblioteca' | python3 -c 'import json,sys; k={i[\"tipo\"] for i in json.load(sys.stdin)[\"itens\"]}; assert {\"zim\",\"pmtiles\"}<=k, k'"

  informar "== 4) Tiles (range requests) =="
  local cabecalho
  cabecalho="$(curl -s -D - -o /dev/null -r 0-99 "$BASE/mapas/data/fumaca.pmtiles" || true)"
  echo "$cabecalho" | head -1 | grep -q ' 206' && passou "tiles: Range devolve 206" || falhou "tiles sem 206: $(echo "$cabecalho" | head -1)"
  echo "$cabecalho" | grep -qi '^content-range: bytes 0-99/2097152' && passou "tiles: Content-Range correto" || falhou "tiles sem Content-Range 0-99/2097152"
  echo "$cabecalho" | grep -qi '^content-encoding:' && falhou "tiles não deveriam ser comprimidos" || passou "tiles sem Content-Encoding"
  esperar_codigo 404 "/mapas/data/ não lista diretório" "$BASE/mapas/data/"

  informar "== 5) Perfis desligados: redirecionamento e página 503 =="
  local rota redirecao
  for rota in traducao cursos livros midia; do
    redirecao="$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE/$rota")"
    [ "$redirecao" = "308 $BASE/$rota/" ] && passou "/$rota -> 308 /$rota/" || falhou "/$rota: esperado '308 $BASE/$rota/', veio '$redirecao'"
    esperar_codigo 503 "/$rota/ com perfil desligado" "$BASE/$rota/"
  done
  curl -s "$BASE/livros/" | grep -q 'Serviço indisponível' && passou "página 503 amigável em português" || falhou "503 sem página amigável"

  informar "== 6) Favoritos e persistência =="
  local favorito_id
  favorito_id="$(curl -fs -X POST "$BASE/api/favoritos" -H 'content-type: application/json' \
        -d '{"titulo":"fumaca","url":"/wiki/","categoria":"fumaca"}' | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' || true)"
  [ -n "$favorito_id" ] && passou "POST /api/favoritos (id $favorito_id)" || falhou "POST /api/favoritos"
  dc restart portal mariadb >/dev/null 2>&1 || true
  dc up -d --wait >/dev/null 2>&1 || true
  curl -fs "$BASE/api/favoritos" | grep -q '"fumaca"' && passou "favorito persiste após reiniciar portal e MariaDB" || falhou "favorito perdido após restart"
  [ -n "$favorito_id" ] && esperar_codigo 204 "DELETE /api/favoritos/$favorito_id" "$BASE/api/favoritos/$favorito_id" -X DELETE

  local codigo_nota
  codigo_nota="$(codigo "$BASE/notas/api/notes" -X POST -H 'content-type: application/json' -d '{"title":"fumaca-nota","content":"marcador-fumaca"}')"
  [ "$codigo_nota" = 200 ] || [ "$codigo_nota" = 201 ] && passou "FlatNotes: criar nota ($codigo_nota)" || falhou "FlatNotes: criar nota ($codigo_nota)"
  verificar "nota gravada como .md em data/flatnotes" test -f "$TRABALHO/data/flatnotes/fumaca-nota.md"
  dc restart flatnotes >/dev/null 2>&1; dc up -d --wait >/dev/null 2>&1 || true
  curl -fs "$BASE/notas/api/notes/fumaca-nota" | grep -q marcador-fumaca && passou "nota persiste após reiniciar o FlatNotes" || falhou "nota perdida após restart"

  informar "== 7) Páginas sem recurso externo =="
  local pagina recurso_pagina ruins n=0
  for pagina in / /ajuda/ /mapas/; do
    ruins=""
    # todos os href/src/import relativos resolvem (200) e nenhum aponta para host externo
    while IFS= read -r recurso_pagina; do
      [ -z "$recurso_pagina" ] && continue
      case "$recurso_pagina" in
        http://*|https://*|//*) ruins="$ruins $recurso_pagina";;
        data:*|\#*|mailto:*|javascript:*) ;;
        /*) [ "$(codigo "$BASE${recurso_pagina%%[?#]*}")" = 200 ] || ruins="$ruins(404:$recurso_pagina)";;
        *) [ "$(codigo "$BASE${pagina%/}/${recurso_pagina%%[?#]*}")" = 200 ] || [ "$(codigo "$BASE/${recurso_pagina%%[?#]*}")" = 200 ] || ruins="$ruins(404:$recurso_pagina)";;
      esac
      n=$((n+1))
    done < <(curl -fs "$BASE$pagina" | grep -oE '(href|src)="[^"]+"' | sed -E 's/^(href|src)="//; s/"$//' | sort -u)
    [ -z "$ruins" ] && passou "$pagina: recursos locais resolvem e nenhum é externo" || falhou "$pagina: problemas:$ruins"
  done
  local recurso externos=""
  for recurso in /css/style.css /js/common.js /js/app.js /mapas/mapas.js /mapas/mapas.css; do
    # nenhuma URL absoluta http(s) fora do próprio host (links de atribuição do OSM são só texto clicável)
    curl -fs "$BASE$recurso" | grep -oE 'https?://[A-Za-z0-9./-]+' | grep -vE '^https?://(127\.0\.0\.1|localhost|arca\.local|www\.w3\.org|www\.openstreetmap\.org/copyright)' >/dev/null && externos="$externos $recurso" || true
  done
  [ -z "$externos" ] && passou "CSS/JS próprios sem URL externa" || falhou "URL externa em:$externos"

  informar "== 8) Isolamento de rede (rede interna sem saída) =="
  local nome_rede="${PROJETO}_internal"
  [ "$(docker network inspect -f '{{.Internal}}' "$nome_rede" 2>/dev/null)" = true ] \
    && passou "rede $nome_rede tem internal: true (stack de teste rodou toda sem rota de saída)" || falhou "rede $nome_rede não é internal"
  # portas publicadas no host: só o Caddy
  local publicadas; publicadas="$(docker ps --filter "label=com.docker.compose.project=$PROJETO" --format '{{.Label "com.docker.compose.service"}}={{.Ports}}' | grep -E '=.*->' | cut -d= -f1 | sort -u | tr '\n' ' ')"
  [ "$publicadas" = "caddy " ] && passou "containers com porta publicada: apenas caddy" || falhou "portas publicadas por: $publicadas"
  # tentativa real de saída dos serviços internos: tem que falhar
  local saida_py="import socket,sys
try:
    socket.create_connection(('1.1.1.1',443),timeout=3); sys.exit(0)
except Exception: sys.exit(1)"
  if dc exec -T portal python -c "$saida_py" >/dev/null 2>&1; then falhou "portal conseguiu abrir conexão externa (1.1.1.1:443)"; else passou "portal não alcança a internet (1.1.1.1:443)"; fi
  if dc exec -T portal python -c "import socket,sys
try: socket.gethostbyname('example.org'); sys.exit(0)
except Exception: sys.exit(1)" >/dev/null 2>&1; then falhou "portal resolveu DNS externo"; else passou "portal não resolve DNS externo"; fi
  if dc exec -T flatnotes curl -s --max-time 3 -o /dev/null http://1.1.1.1/ >/dev/null 2>&1; then falhou "flatnotes alcançou a internet"; else passou "flatnotes não alcança a internet"; fi
  if dc exec -T kiwix wget -q -T 3 -O /dev/null http://1.1.1.1/ >/dev/null 2>&1; then falhou "kiwix alcançou a internet"; else passou "kiwix não alcança a internet"; fi
  # nada quebrou por falta de saída
  dc ps --format '{{.Service}} {{.Health}}' | grep -v ' healthy$' | grep -q . && falhou "serviço não saudável após os testes: $(dc ps --format '{{.Service}} {{.Health}}' | grep -v ' healthy$')" || passou "todos os serviços seguem saudáveis ao final"
}

case "$QUE" in
  estatico) verificacoes_estaticas;;
  tudo) verificacoes_estaticas; verificacoes_pilha;;
  *) falhar "uso: fumaca.sh [estatico|tudo]";;
esac
informar ""
if [ "$FALHARAM" -gt 0 ]; then falhar "fumaça: $FALHARAM verificação(ões) falharam, $PASSARAM passaram."; fi
sucesso "fumaça: $PASSARAM verificações passaram."
