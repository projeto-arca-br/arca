# Tradutor dentro do portal

- A página `/tradutor/` é estática do portal (`portal/app/static/site/tradutor/`); o cartão "Tradução" do painel aponta
  para ela (migração 005, com reversa manual em `portal/migrations/down/`). A verificação de estado do cartão continua
  na API do LibreTranslate.
- A interface web do LibreTranslate está desligada (`LT_DISABLE_WEB_UI="true"`): `/traducao/` é só API
  (`/traducao/languages`, `/traducao/translate`). Com a interface desligada, `/traducao/` dá 404.
- O Argos usa `pb` para português do Brasil, mas `/traducao/languages` lista `pt`/`pt-BR`; `/translate` aceita as duas formas.
- A página `/tradutor/` abre mesmo sem o perfil `traducao`; a fumaça padrão só confere a página. A API é conferida com
  `ARCA_FUMACA_TRADUCAO=1 make teste-fumaca` (precisa dos modelos locais).
- Teste da 005: aplica (caminho `/tradutor/`), roda a reversa (caminho `/traducao/`, versão 005 removida) e reaplica
  pelo corredor normal. Contagens de migrações aplicadas em `teste_migracoes.py` incluem a 005.
- `make teste-convencao` falha com exceção sem uso: remova exceções do `convencao-excecoes.txt` quando o termo some da documentação.
- `docs/RELEASE.md` existe como checklist enxuto com comandos reais; não invente procedimentos nele.
