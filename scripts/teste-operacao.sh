#!/usr/bin/env bash
# Testes dos scripts operacionais (spec 007). Não toca nos dados reais: tudo roda em
# pastas temporárias e projetos Compose descartáveis (arca-operacao-a / arca-operacao-b).
#   A) baixar-dados: checksum, retomada de download (.part + Range) e idempotência
#   B) backup -> restaurar em um projeto limpo (exige --confirmar; notas e portal voltam)
# Uso: scripts/teste-operacao.sh [baixar|restaurar]   (padrão: ambos)
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
QUE="${1:-tudo}"
TRABALHO="$(mktemp -d "${TMPDIR:-/tmp}/arca-operacao-teste.XXXXXX")"
PORTA_A="${ARCA_PORTA_TESTE_A:-8097}"; PORTA_B="${ARCA_PORTA_TESTE_B:-8098}"
PID_SERVIDOR=""
PASSARAM=0
verificar() { # verificar "descrição" comando...
  local descricao="$1"; shift
  if "$@" >/dev/null 2>&1; then sucesso "$descricao"; PASSARAM=$((PASSARAM+1)); else falhar "FALHOU: $descricao"; fi
}
limpar() {
  [ -n "$PID_SERVIDOR" ] && kill "$PID_SERVIDOR" 2>/dev/null || true
  for par in a b; do
    [ -d "$TRABALHO/$par" ] && (cd "$TRABALHO/$par" && COMPOSE_PROJECT_NAME="arca-operacao-$par" docker compose --profile traducao --profile cursos --profile midia down -v --remove-orphans >/dev/null 2>&1) || true
  done
  # data/mariadb pertence ao uid do container: remove via docker
  if [ -d "$TRABALHO" ]; then
    docker run --rm -v "$TRABALHO:/w" --entrypoint sh "${ARCA_IMAGEM_CADDY:-caddy:2.9.1-alpine}" -c 'rm -rf /w/*' >/dev/null 2>&1 || true
    rm -rf "$TRABALHO" 2>/dev/null || true
  fi
}
trap limpar EXIT

teste_baixar() {
  informar "== A) baixar-dados =="
  exigir_comando python3
  local web="$TRABALHO/web" raiz="$TRABALHO/baixar"; mkdir -p "$web" "$raiz"
  head -c 3000000 /dev/urandom > "$web/teste.zim"
  (cd "$web" && sha256sum teste.zim > teste.zim.sha256)
  # Servidor HTTP mínimo com suporte a Range (python -m http.server não tem)
  cat > "$TRABALHO/servidor.py" <<'PY'
import http.server, os, re, sys
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): open(os.environ["LOG_SERVIDOR"], "a").write((self.headers.get("Range") or "-") + " " + self.path + "\n")
    def send_head(self):
        p = self.translate_path(self.path)
        if not os.path.isfile(p): self.send_error(404); return None
        size = os.path.getsize(p); r = self.headers.get("Range"); m = re.match(r"bytes=(\d+)-", r or "")
        f = open(p, "rb")
        if m:
            s = int(m.group(1)); f.seek(s)
            self.send_response(206); self.send_header("Content-Range", f"bytes {s}-{size-1}/{size}")
            self.send_header("Content-Length", str(size - s))
        else:
            self.send_response(200); self.send_header("Content-Length", str(size))
        self.send_header("Accept-Ranges", "bytes"); self.end_headers(); return f
os.chdir(sys.argv[2]); http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
PY
  export LOG_SERVIDOR="$TRABALHO/srv.log"; : > "$LOG_SERVIDOR"
  python3 "$TRABALHO/servidor.py" 18765 "$web" & PID_SERVIDOR=$!
  sleep 1
  local script="$ARCA_RAIZ/scripts/baixar-dados.sh"
  export ARCA_RAIZ_ORIGINAL="$ARCA_RAIZ"
  baixar_teste() { ARCA_RAIZ="$raiz" ARCA_ZIM_URL="http://127.0.0.1:18765/teste.zim" "$script" mini --somente zim "$@"; }

  verificar "simulação não baixa nada" bash -c "$(declare -f baixar_teste); raiz='$raiz' script='$script'; baixar_teste --simular && [ ! -e '$raiz/data/zim/teste.zim' ]"
  # retomada: .part com o começo do arquivo
  mkdir -p "$raiz/data/zim"; head -c 1000000 "$web/teste.zim" > "$raiz/data/zim/teste.zim.part"
  baixar_teste >/dev/null 2>&1 || falhar "FALHOU: download retomado"
  verificar "arquivo final confere com o original" cmp "$web/teste.zim" "$raiz/data/zim/teste.zim"
  verificar "download foi retomado com Range bytes=1000000-" grep -q 'bytes=1000000-' "$LOG_SERVIDOR"
  verificar ".part removido" test ! -e "$raiz/data/zim/teste.zim.part"
  : > "$LOG_SERVIDOR"; baixar_teste >/dev/null 2>&1
  verificar "segunda execução é idempotente (não baixa o ZIM de novo)" bash -c "! grep -q ' /teste.zim$' \"$LOG_SERVIDOR\""
  # checksum errado -> falha e descarta
  rm -f "$raiz/data/zim/teste.zim"; printf '%064d  teste.zim\n' 1 > "$web/teste.zim.sha256"
  verificar "checksum incorreto é rejeitado" bash -c "! ARCA_RAIZ='$raiz' ARCA_ZIM_URL=http://127.0.0.1:18765/teste.zim '$script' mini --somente zim"
  verificar "arquivo corrompido não permanece" test ! -e "$raiz/data/zim/teste.zim"
  # sem .sha256 -> erro claro, a menos que permitido
  rm -f "$web/teste.zim.sha256"
  verificar "sem .sha256 falha por padrão" bash -c "! ARCA_RAIZ='$raiz' ARCA_ZIM_URL=http://127.0.0.1:18765/teste.zim '$script' mini --somente zim"
  verificar "ARCA_ACEITAR_SEM_SOMA=1 aceita" env ARCA_RAIZ="$raiz" ARCA_ZIM_URL=http://127.0.0.1:18765/teste.zim ARCA_ACEITAR_SEM_SOMA=1 "$script" mini --somente zim
  kill "$PID_SERVIDOR"; PID_SERVIDOR=""
}

criar_projeto() { # criar_projeto DIRETORIO PROJETO PORTA : cópia do projeto sem dados + .env próprio
  local diretorio="$1" nome="$2" porta="$3"
  mkdir -p "$diretorio"
  tar -C "$ARCA_RAIZ" -cf - --exclude=./data --exclude=./.env --exclude=./backups --exclude=./.claude --exclude=__pycache__ . | tar -C "$diretorio" -xf -
  cp "$ARCA_RAIZ/.env" "$diretorio/.env"
  sed -i "s/^ARCA_PORTA=.*/ARCA_PORTA=$porta/; s/^ARCA_ENDERECO=.*/ARCA_ENDERECO=127.0.0.1/; s/^COMPOSE_PROFILES=.*/COMPOSE_PROFILES=/; s/^ARCA_UID=.*/ARCA_UID=$(id -u)/; s/^ARCA_GID=.*/ARCA_GID=$(id -g)/" "$diretorio/.env"
  mkdir -p "$diretorio/data/zim"
  cp "$ARCA_RAIZ"/data/zim/*.zim "$diretorio/data/zim/" 2>/dev/null || falhar "preciso de pelo menos um .zim em data/zim para o Kiwix subir."
}

teste_restaurar() {
  informar "== B) backup -> restaurar em projeto limpo =="
  exigir_docker   # não carrega o .env aqui: exportaria ARCA_PORTA etc. para os projetos de teste
  local A="$TRABALHO/a" B="$TRABALHO/b"
  criar_projeto "$A" a "$PORTA_A"; criar_projeto "$B" b "$PORTA_B"
  informar "Subindo projeto A..."
  COMPOSE_PROJECT_NAME=arca-operacao-a make -C "$A" --no-print-directory subir >/dev/null 2>&1 || falhar "projeto A não subiu."
  printf '# Nota E2E\nmarcador-%s\n' "$$" > "$A/data/flatnotes/e2e.md"
  curl -fs -X POST "http://127.0.0.1:$PORTA_A/api/favoritos" -H 'content-type: application/json' \
    -d '{"titulo":"marcador-e2e","url":"https://example.org/e2e","categoria":"e2e"}' >/dev/null || falhar "não consegui criar favorito em A."
  local saida
  saida="$(COMPOSE_PROJECT_NAME=arca-operacao-a ARCA_RAIZ="$A" "$A/scripts/backup.sh" "$TRABALHO/bk" 2>/dev/null | tail -1)"
  verificar "backup gerou arquivo" test -s "$saida"
  verificar "backup tem permissão 600" test "$(stat -c %a "$saida")" = 600
  COMPOSE_PROJECT_NAME=arca-operacao-a make -C "$A" --no-print-directory derrubar >/dev/null 2>&1

  informar "Restaurando em projeto limpo B..."
  verificar "restauração sem --confirmar é recusada" bash -c "! COMPOSE_PROJECT_NAME=arca-operacao-b '$B/scripts/restaurar.sh' '$saida'"
  verificar "restauração recusada não criou dados" test ! -e "$B/data/flatnotes/e2e.md"
  COMPOSE_PROJECT_NAME=arca-operacao-b "$B/scripts/restaurar.sh" --confirmar "$saida" >&2 || falhar "a restauração falhou."
  verificar "nota restaurada em disco" grep -q "marcador-$$" "$B/data/flatnotes/e2e.md"
  COMPOSE_PROJECT_NAME=arca-operacao-b make -C "$B" --no-print-directory subir >/dev/null 2>&1 || falhar "projeto B não subiu após a restauração."
  verificar "favorito do portal restaurado" bash -c "curl -fs http://127.0.0.1:$PORTA_B/api/favoritos | grep -q marcador-e2e"
  verificar "nota visível no FlatNotes (API)" bash -c "curl -fs 'http://127.0.0.1:$PORTA_B/notas/api/notes/e2e' | grep -q marcador-$$"
  # restauração por cima de dados existentes: preserva o anterior
  echo "alterada" > "$B/data/flatnotes/e2e.md"
  COMPOSE_PROJECT_NAME=arca-operacao-b "$B/scripts/restaurar.sh" --confirmar "$saida" >&2 || falhar "a segunda restauração falhou."
  verificar "restauração sobre dados existentes guardou cópia pre-restauracao" bash -c "ls -d '$B'/data/flatnotes.pre-restauracao-* >/dev/null"
  verificar "nota voltou ao conteúdo do backup" grep -q "marcador-$$" "$B/data/flatnotes/e2e.md"
  verificar "dump de segurança do banco foi criado" bash -c "ls '$B'/backups/pre-restauracao-*.sql >/dev/null"
  COMPOSE_PROJECT_NAME=arca-operacao-b make -C "$B" --no-print-directory derrubar >/dev/null 2>&1
}

case "$QUE" in
  baixar) teste_baixar;;
  restaurar) teste_restaurar;;
  tudo) teste_baixar; teste_restaurar;;
  *) falhar "uso: teste-operacao.sh [baixar|restaurar]";;
esac
sucesso "teste-operacao: $PASSARAM verificações passaram."
