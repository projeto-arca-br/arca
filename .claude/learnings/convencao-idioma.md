# Convenção de idioma e verificação automática (specs 009-015)

## Decisões
- Português do Brasil em tudo, inclusive identificadores (ASCII, sem acento). A regra e o glossário vivem em `CLAUDE.md`; mudou o glossário, atualize `TERMOS_*` em `scripts/teste-convencao.py`.
- Sem compatibilidade retroativa: rotas, alvos do Makefile e variáveis antigas deixaram de existir, sem alias. O guia de atualização está no `README.md` (tabelas "Antes -> Agora").
- Exceções são só nomes impostos por terceiros (Compose, HTTP, FastAPI, imagens, DOM/CSS, esquema dos tiles Protomaps, endpoints de saúde de FlatNotes/Kavita/Jellyfin).

## Migração de dados
- Migrações já aplicadas (001, 002) não são editadas; a 003 renomeia o esquema e a 004 os perfis, ambas com reversa em `portal/migrations/down/`. Favoritos antigos são preservados (testado em `teste_migracoes.py`).
- `data/` nunca é tocado por testes nem pela convenção.

## Identidade
- Logo, paleta e favicon locais (sem CDN); tokens em português no CSS. Detalhes em `identidade-visual.md`.

## Verificação (`make teste-convencao`, parte de `make teste`)
- `scripts/teste-convencao.py` (Python 3 puro, sem Docker): separa identificadores em palavras (`_`, camelCase), casa termos do glossário (singular/plural) e valida links relativos e âncoras de `README.md` e `docs/*.md`.
- Exceções em `scripts/convencao-excecoes.txt`: `glob | termo[~regex] | justificativa`. Prefira a forma com `~regex` (vale só na linha que casa) a exceção de arquivo inteiro; só migrações antigas e o teste de migração têm `*`.
- Exceção sem uso falha o teste, para a lista não apodrecer. Vendor de terceiros (`static/vendor`, `mapas/vendor`, `mapas/assets`), SVG e JSON ficam fora da varredura.
- Armadilha: o separador do arquivo de exceções é `" | "` (com espaços), porque a regex pode ter `|`.
- Gancho de pré-commit opcional: documentado no README (seção Testes).
