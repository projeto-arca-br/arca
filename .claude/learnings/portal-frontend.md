# Portal frontend (spec 004)

- Estático em `portal/app/static/site/` (index.html painel; `ajuda/index.html` ajuda com âncoras `#<identificador>`; `css/style.css`; `js/common.js` tema/ícones/helpers `window.Arca`; `js/app.js` painel). Sem CDN, sem fontes externas (system font stack, ícones SVG inline em `common.js`, chave = identificador).
- Rebuild: `make subir` (arquivos são copiados na imagem do portal).
- Novo serviço (ex.: mapas spec 005): slug novo na tabela `services` já aparece sozinho como cartão; adicionar ícone em `ICONS` (common.js), slug em `HELP` (app.js) e seção `<section id="slug">` em ajuda. Nova página (ex.: `/mapas/`) = nova pasta em `site/` reutilizando `/css/style.css` e `/js/common.js` (Caddy ainda tem 503 placeholder para /mapas).
- Tema: `data-tema` (`claro`|`escuro`) em `<html>` + localStorage `arca-tema`; padrão segue `prefers-color-scheme`.
- Polling de `/api/services` a cada 15s (pausa com aba oculta). Dados da API entram só via `textContent` (sem innerHTML).
- Teste sem rede: `google-chrome --headless=new --host-resolver-rules="MAP * ~NOTFOUND, EXCLUDE localhost" --dump-dom URL`. O grep `https?://` não deve casar (namespace SVG montado por concatenação).
