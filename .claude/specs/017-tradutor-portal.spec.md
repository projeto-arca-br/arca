---
title: Página do tradutor dentro do portal
number: 017
priority: high
tags: [feature, portal, frontend, translate]
dependencies: [004-portal-frontend.spec.md, 006-extra-services.spec.md, 016-corrigir-modelos-traducao.spec.md]
related_prd: .claude/prd/003-tradutor-no-portal.md
status: done
created: 2026-10-01
---

# 017 - Página do tradutor dentro do portal

## Overview
Cria a página `/tradutor/` no portal, que usa a API do LibreTranslate em `/traducao/` (mesma origem, sem chave), desliga a interface web do LibreTranslate e aponta o cartão "Tradução" do painel para a nova página por meio de uma migração com reversa.

## Related PRD
- **Source**: [Tradutor dentro do portal](../prd/003-tradutor-no-portal.md)
- **Section Reference**: User Stories 8-43; Implementation Decisions (Página própria, API reutilizada, Interface desligada, Nomes dos idiomas, Migração 005, Página no padrão do portal, Estados da página, Ajuda)

## Prerequisites
- [ ] Specs 004, 006 e 016 concluídos (modelos de tradução baixados)

## Dependencies
- `004-portal-frontend.spec.md` - padrão de páginas, tema e objeto `Arca`
- `006-extra-services.spec.md` - serviço e rota `/traducao`
- `016-corrigir-modelos-traducao.spec.md` - modelos en, pb, es

## Implementation Tasks
### 1. Compose
- [ ] `docker-compose.yml`: `LT_DISABLE_WEB_UI` passa a `true` no serviço `libretranslate`; a API e o teste de saúde do contêiner (`/traducao/languages`) continuam
- [ ] Caddy: sem mudança; conferir que `/tradutor` redireciona para `/tradutor/` e cai no portal

### 2. Migração 005
- [ ] `portal/migrations/005_tradutor_no_portal.sql`: `UPDATE servicos SET caminho='/tradutor/' WHERE identificador='traducao'`
- [ ] `portal/migrations/down/005_tradutor_no_portal.down.sql`: devolve `/traducao/`
- [ ] Manter `url_verificacao` apontando para a API do LibreTranslate
- [ ] Não editar migrações já aplicadas

### 3. Página `portal/app/static/site/tradutor/`
- [ ] `index.html` no padrão de `mapas/index.html`: mesmo `<head>`, cabeçalho com logo, navegação (Painel, Ajuda em `/ajuda/#traducao`, botão de tema), `main`, bloco `p#mensagem[role=status]`, rodapé; textos em português
- [ ] Controles: seleção de origem (com "Detectar idioma"), botão de trocar, seleção de destino, área de texto de entrada, área de saída somente leitura, botões Traduzir, Copiar tradução e Limpar, contador de caracteres, aviso sobre es↔pb via inglês
- [ ] `tradutor.js` (módulo, sem bibliotecas externas): carrega idiomas com `GET /traducao/languages`; mapeia `en`/`pb`/`es` para Inglês/Português (Brasil)/Espanhol; envia `POST /traducao/translate` com texto, origem, destino e formato texto; trata origem `auto`
- [ ] Estados: carregando idiomas, pronta, "Traduzindo...", texto vazio, serviço indisponível (502/503/504 ou falha de rede, com instrução de rodar `make modelos-traducao` e subir o perfil `traducao`), erro genérico
- [ ] Guardar o último par de idiomas no `localStorage` (chave própria, com `try/catch`); copiar usando a API de área de transferência com alternativa de seleção do texto
- [ ] `tradutor.css`: layout em duas colunas no desktop e uma no celular, temas claro e escuro com as variáveis de `css/style.css`, foco visível, sem recursos externos
- [ ] Identificadores em ASCII e em português (ex.: `traduzir`, `trocarIdiomas`, `mostrarMensagem`)

### 4. Painel e ajuda
- [ ] `ajuda/index.html`: seção `#traducao` descreve a página do Arca (escolher idiomas, traduzir, copiar, aviso es↔pb)
- [ ] `js/app.js`: nenhuma mudança esperada (o cartão usa `caminho`); confirmar que o link de ajuda continua em `#traducao` e que o cartão fica desativado com o perfil desligado

## Acceptance Criteria
### Must Have
- [ ] O cartão "Tradução" abre `/tradutor/`
- [ ] A página traduz en→pb, pb→en e es→pb usando `/traducao/translate`
- [ ] A interface web do LibreTranslate não é mais servida em `/traducao/`; `/traducao/languages` e `/traducao/translate` continuam
- [ ] Com o serviço desligado, aparece a mensagem de indisponível em português
- [ ] Nenhum recurso externo (CDN, fonte, imagem)
- [ ] Migração 005 aplica e reverte sem erro

### Should Have
- [ ] Último par de idiomas lembrado
- [ ] Página utilizável em celular, com teclado e leitor de tela

## Testing Requirements
```bash
make subir
curl -sI localhost/tradutor/ | head -1
curl -s localhost/traducao/languages
curl -s -X POST localhost/traducao/translate -d q="Hello" -d source=en -d target=pb
# manual: abrir http://localhost/tradutor/ e traduzir en→pb, pb→en, es→pb; desligar o perfil e ver a mensagem
```

## Rollback Plan
Aplicar a migração reversa 005 (volta o cartão para `/traducao/`), pôr `LT_DISABLE_WEB_UI` em `false` e remover a pasta `tradutor/` e as mudanças da ajuda com `git revert`.
