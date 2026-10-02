# Wikipédia e Notas dentro do portal (specs 019, 020 e 021)

## Kiwix (página `/wikipedia/`)
- O identificador do ZIM é o nome do arquivo sem `.zim` (último trecho do link `text/html` do catálogo, `/wiki/content/<id>`), e não o `<name>` do catálogo OPDS.
- O `label` do `/wiki/suggest` vem com marcação escapada; trate como texto, nunca como HTML.
- Busca: `/wiki/search?content=<id>&pattern=...&format=xml` (RSS); sugestões: `/wiki/suggest?content=<id>&term=...`.
- Caddy: `handle /wiki*` engolia `/wikipedia/`; o matcher correto é `@wiki path /wiki /wiki/*`.
- Iframe de artigo de mesma origem (`/wiki/content/...`) é permitido, sem recurso externo.

## FlatNotes (página `/anotacoes/`)
- A API não pede token com `FLATNOTES_AUTH_TYPE=none`.
- A listagem de notas usa `GET /notas/api/search?term=*`.
- `HEAD /notas/` devolve 404 (use `GET` ou `/notas/health` para verificar).
- Edição: o PATCH usa `{"newContent": ...}`. Com `{"content": ...}` devolve 200 mas **não grava** (a spec 020 dizia `content`, o que está errado).
- `DELETE` devolve 200 (não 204).
- Os destaques da busca vêm como `<b class=...>`; a página monta nós de texto + `<mark>` em vez de usar `innerHTML`.
- O formato de `/notas/api/tags` não foi observado (lista vazia); o JS aceita strings ou `{name}`.
- Notas com acento e espaço no título: o caminho da URL precisa de `encodeURIComponent`; o arquivo `.md` leva o título como nome.

## Painel e migração 006
- Os cartões "Wikipédia" e "Notas" apontam para `/wikipedia/` e `/anotacoes/` pela migração 006 (reversa em `portal/migrations/down/`); `url_verificacao` segue apontando para Kiwix e FlatNotes reais, então o cartão continua "desativado" se o serviço cair.
- As telas nativas `/wiki/` e `/notas/` seguem funcionando e a fumaça continua verificando-as.

## Teste de convenção
- Os campos impostos por APIs de terceiros (`title`, `name`, `kind`, `path`, `description`) e a propriedade CSS `position` têm exceções com justificativa em `scripts/convencao-excecoes.txt`; toda exceção precisa ser usada.

## Editor visual de notas
- O editor visual, as etiquetas e os anexos (specs 022-024) estão em `.claude/learnings/editor-visual-de-notas.md`. O PATCH de nota usa `newContent`.
