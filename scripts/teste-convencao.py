#!/usr/bin/env python3
"""Verificação da convenção do Arca (português total) e dos links da documentação.

1. Procura termos em inglês do glossário (CLAUDE.md) em código, SQL, scripts,
   Makefile, compose, Caddy e documentação, ignorando as exceções versionadas em
   scripts/convencao-excecoes.txt.
2. Valida os links relativos de README.md e docs/*.md (arquivo e âncora).

Uso: scripts/teste-convencao.py [--raiz DIR]    Saída 0 = tudo certo, 1 = problemas.
"""
import argparse
import fnmatch
import re
import sys
from pathlib import Path

# Termos do glossário (CLAUDE.md). Simples: casam como palavra de um identificador
# (separado por _, - ou maiúsculas), também no plural. Compostos: casam como trecho.
TERMOS_SIMPLES = [
    "bookmark", "service", "library", "health", "check", "settings", "title",
    "category", "slug", "profile", "position", "kind", "name", "description", "path",
]
TERMOS_COMPOSTOS = [
    "content_items", "health_log", "created_at", "updated_at", "modified_at",
    "size_bytes", "latency_ms",
]

# O que é varrido (relativo à raiz) e o que é ignorado.
PADROES_INCLUIDOS = [
    "Makefile", "README.md", "docker-compose*.yml", ".env.example", "caddy/*",
    "docs/*.md", "scripts/*", "portal/Dockerfile", "portal/pyproject.toml",
    "portal/app/**/*", "portal/testes/**/*", "portal/migrations/**/*",
    "jellyfin/*", "kavita/*",
]
SUFIXOS_TEXTO = {
    "", ".py", ".sql", ".sh", ".md", ".yml", ".yaml", ".toml", ".json", ".js",
    ".css", ".html", ".xml", ".example",
}
PARTES_IGNORADAS = {"data", "wheels", "__pycache__", ".git", "backups", "node_modules"}
# Este script e o arquivo de exceções falam dos termos de propósito.
# Código de terceiros embutido (sem rede, por isso vendorizado): não é nosso para renomear.
PREFIXOS_TERCEIROS = (
    "portal/app/static/vendor/",
    "portal/app/static/site/mapas/vendor/",
    "portal/app/static/site/mapas/assets/",
)
ARQUIVOS_PROPRIOS = {"scripts/teste-convencao.py", "scripts/convencao-excecoes.txt"}

RE_IDENTIFICADOR = re.compile(r"[A-Za-z][A-Za-z0-9_]*")
RE_MAIUSCULA = re.compile(r"(?<=[a-z0-9])(?=[A-Z])")


def carregar_excecoes(arquivo: Path):
    """Linhas `glob | termo | justificativa`.

    `termo` pode ser `*` (qualquer termo) e pode trazer `~regex`: a exceção só vale
    nas linhas em que a regex casa (ex.: `name ~className`)."""
    excecoes = []
    for n, linha in enumerate(arquivo.read_text(encoding="utf-8").splitlines(), 1):
        linha = linha.strip()
        if not linha or linha.startswith("#"):
            continue
        partes = re.split(r"\s+\|\s+", linha)
        if len(partes) != 3 or not all(partes):
            sys.exit(f"{arquivo}:{n}: formato inválido (use 'glob | termo | justificativa')")
        termo, _, regex = partes[1].partition("~")
        excecoes.append((partes[0], termo.strip().lower(), re.compile(regex.strip()) if regex.strip() else None, partes[2]))
    return excecoes


def termos_da_linha(linha: str):
    achados = set()
    for ident in RE_IDENTIFICADOR.findall(linha):
        baixo = ident.lower()
        for composto in TERMOS_COMPOSTOS:
            if composto in baixo:
                achados.add(composto)
        palavras = [p.lower() for trecho in ident.split("_") for p in RE_MAIUSCULA.split(trecho)]
        for p in palavras:
            for termo in TERMOS_SIMPLES:
                if p == termo or p == termo + "s":
                    achados.add(termo)
    return achados


def arquivos_varridos(raiz: Path):
    vistos = set()
    for padrao in PADROES_INCLUIDOS:
        for caminho in sorted(raiz.glob(padrao)):
            rel = caminho.relative_to(raiz)
            if not caminho.is_file() or rel in vistos:
                continue
            if PARTES_IGNORADAS & set(rel.parts) or rel.as_posix() in ARQUIVOS_PROPRIOS \
                    or rel.as_posix().startswith(PREFIXOS_TERCEIROS):
                continue
            if caminho.suffix.lower() not in SUFIXOS_TEXTO:
                continue
            vistos.add(rel)
            yield rel


def verificar_termos(raiz: Path, excecoes):
    problemas, usadas = [], set()
    for rel in arquivos_varridos(raiz):
        posix = rel.as_posix()
        try:
            linhas = (raiz / rel).read_text(encoding="utf-8").splitlines()
        except UnicodeDecodeError:
            continue
        for n, linha in enumerate(linhas, 1):
            for termo in sorted(termos_da_linha(linha)):
                regra = next((i for i, (g, t, r, _) in enumerate(excecoes)
                              if fnmatch.fnmatch(posix, g) and t in ("*", termo)
                              and (r is None or r.search(linha))), None)
                if regra is None:
                    problemas.append(f"{posix}:{n}: termo em inglês '{termo}': {linha.strip()[:100]}")
                else:
                    usadas.add(regra)
    return problemas, usadas


def ancoras_do_markdown(texto: str):
    ancoras = set()
    for m in re.finditer(r"^#{1,6}\s+(.*?)\s*#*\s*$", texto, re.M):
        t = re.sub(r"[`*_]", "", m.group(1)).lower()
        t = re.sub(r"[^\w\s-]", "", t).strip().replace(" ", "-")
        ancoras.add(t)
    ancoras.update(re.findall(r'<a\s+(?:name|id)="([^"]+)"', texto))
    return ancoras


def verificar_links(raiz: Path):
    problemas = []
    docs = [raiz / "README.md", *sorted((raiz / "docs").glob("*.md"))]
    for doc in docs:
        if not doc.is_file():
            problemas.append(f"{doc.relative_to(raiz)}: arquivo ausente")
            continue
        texto = doc.read_text(encoding="utf-8")
        sem_codigo = re.sub(r"```.*?```", lambda m: "\n" * m.group(0).count("\n"), texto, flags=re.S)
        for m in re.finditer(r"!?\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)", sem_codigo):
            alvo = m.group(1)
            linha = sem_codigo.count("\n", 0, m.start()) + 1
            if re.match(r"^[a-z][a-z0-9+.-]*:", alvo, re.I):  # http:, mailto: etc.
                continue
            caminho, _, ancora = alvo.partition("#")
            destino = doc if not caminho else (doc.parent / caminho)
            onde = f"{doc.relative_to(raiz)}:{linha}"
            if not destino.exists():
                problemas.append(f"{onde}: link quebrado '{alvo}'")
            elif ancora and destino.suffix == ".md":
                if ancora.lower() not in ancoras_do_markdown(destino.read_text(encoding="utf-8")):
                    problemas.append(f"{onde}: âncora inexistente '{alvo}'")
    return problemas, len(docs)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--raiz", default=str(Path(__file__).resolve().parent.parent))
    raiz = Path(ap.parse_args().raiz).resolve()

    excecoes = carregar_excecoes(raiz / "scripts" / "convencao-excecoes.txt")
    prob_termos, usadas = verificar_termos(raiz, excecoes)
    prob_links, n_docs = verificar_links(raiz)
    inuteis = [f"scripts/convencao-excecoes.txt: exceção sem uso: {g} | {t}"
               for i, (g, t, _, _) in enumerate(excecoes) if i not in usadas]

    for p in prob_termos + prob_links + inuteis:
        print(f"[erro] {p}", file=sys.stderr)
    if prob_termos or prob_links or inuteis:
        print(f"[erro] convenção: {len(prob_termos)} termo(s), {len(prob_links)} link(s), "
              f"{len(inuteis)} exceção(ões) sem uso", file=sys.stderr)
        sys.exit(1)
    print(f"[ok] convenção: zero termos proibidos e links válidos em {n_docs} documento(s)")


if __name__ == "__main__":
    main()
