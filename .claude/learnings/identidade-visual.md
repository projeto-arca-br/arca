# Identidade visual (spec 013)

- Ativos aprovados em `.claude/previa-identidade/` (prévia mantida); cópias em `portal/app/static/site/imagens/` (servido em `/imagens/`) e `docs/assets/`.
- O portal serve `static/site` na raiz via `StaticFiles` (FastAPI) e o Caddy encaminha `/` ao portal; o Dockerfile copia `app/` inteiro, então novos arquivos estáticos não exigem ajuste.
- Tokens em `css/style.css`, todos em português: paleta (`--carvao`, `--musgo`, `--folha`, `--ferrugem`, `--brasa`, `--osso`, `--argila`, `--argila-clara`) e aliases semânticos (`--fundo`, `--superficie`, `--texto`, `--texto-suave`, `--link`, `--titulo`, `--acento`, `--sobre-acento`, `--borda`, `--foco`, `--no-ar`, `--fora-do-ar`, `--desativado`, `--sombra`).
- Tema escuro: `prefers-color-scheme` (exceto `data-tema="claro"`) e `data-tema="escuro"`, mesmo mecanismo do botão de tema (`common.js`). `mapas.css` só usa os aliases, sem cores fixas.
- Logo no cabeçalho: duas `<img>` (`.logo-claro` e `.logo-escuro`) alternadas por CSS conforme o tema; o SVG de `xmlns` é permitido pela fumaça (`www.w3.org`).
- Contraste: `contraste.py` (razão WCAG). Valores ajustados para AA: ferrugem `#A8471F`, argila `#6E5540`, folha `#7FA363`. Estados: `--no-ar` claro `#2F6B3A` (5,1:1), `--fora-do-ar` claro `#A32117` e escuro `#FF9A8F` (>=7:1). Ao mudar uma cor, recalcule antes.
- Prefira ferrugem no claro e brasa no escuro para links e acentos; brasa sobre osso NÃO passa em AA.
