---
title: Corrigir o download dos modelos de tradução (en, pb, es)
number: 016
priority: high
tags: [bugfix, ops, translate]
dependencies: [006-extra-services.spec.md, 007-ops-scripts.spec.md]
related_prd: .claude/prd/003-tradutor-no-portal.md
status: pending
created: 2026-10-01
---

# 016 - Corrigir o download dos modelos de tradução (en, pb, es)

## Overview
`make modelos-traducao` para após "Downloading model: es" depois da troca de `pt` por `pb`. A causa provável é o segmentador de frases (MiniSBD), que só conhece códigos ISO e não tem `pb`. Este spec separa as listas de idiomas, confirma a causa, conclui o download e valida a tradução offline.

## Related PRD
- **Source**: [Tradutor dentro do portal](../prd/003-tradutor-no-portal.md)
- **Section Reference**: User Stories 1-7, 44; Implementation Decisions (Dois idiomas de segmentação, Idiomas carregados no serviço, Causa a confirmar)

## Prerequisites
- [ ] Specs 006 e 007 concluídos
- [ ] Internet disponível durante a execução do download (uma vez)

## Dependencies
- `006-extra-services.spec.md` - serviço LibreTranslate
- `007-ops-scripts.spec.md` - scripts de baixar e empacotar

## Implementation Tasks
### 1. Diagnóstico
- [ ] Rodar `make modelos-traducao` e capturar o erro completo (traceback) do passo que falha
- [ ] Confirmar se a falha vem de `download_models` do MiniSBD com o código `pb`

### 2. Makefile (alvo `modelos-traducao`)
- [ ] Usar duas listas independentes: Argos `['en','pb','es']` em `boot(...)` e MiniSBD `['en','pt','es']` em `download_models(...)`
- [ ] Atualizar o comentário do alvo explicando a diferença (`pb` só existe no Argos)
- [ ] Mensagem de erro do alvo em português quando o download falhar
- [ ] Não editar nada em `data/` manualmente; apenas o alvo grava lá

### 3. Compose e .env
- [ ] Confirmar `LT_LOAD_ONLY=en,pb,es` em `docker-compose.yml` e `.env.example`
- [ ] Se o serviço offline tentar baixar o segmentador de `pb` e falhar, avaliar incluir `pt` em `LT_LOAD_ONLY` e registrar a decisão

### 4. Validação offline
- [ ] Após o download: `ls data/models/argos/packages` contém os pacotes de en↔pb e en↔es
- [ ] Subir o LibreTranslate com `--network none` (procedimento em `.claude/learnings/extra-services.md`) e traduzir en→pb, pb→en e es→pb

### 5. Documentação e aprendizado
- [ ] `scripts/baixar-dados.sh`: manter a chamada e as mensagens em português
- [ ] `docs/OFFLINE.md`: explicar que quem tinha modelos `pt` deve rodar `make modelos-traducao` de novo
- [ ] `.claude/learnings/extra-services.md`: registrar a causa, a correção e o resultado do teste offline

## Acceptance Criteria
### Must Have
- [ ] `make modelos-traducao` termina com código 0
- [ ] `/traducao/languages` lista en, pb e es
- [ ] Traduções en→pb, pb→en e es→pb funcionam sem internet
- [ ] Nenhum arquivo de `data/` foi versionado ou editado à mão

### Should Have
- [ ] Mensagem de falha clara, em português
- [ ] Learning registrado

## Testing Requirements
```bash
make modelos-traducao
ls data/models/argos/packages
docker compose --profile traducao up -d libretranslate
curl -s localhost/traducao/languages
curl -s -X POST localhost/traducao/translate -d q="Good morning" -d source=en -d target=pb
make teste-convencao
```

## Rollback Plan
Reverter a alteração do `Makefile` (e de `LT_LOAD_ONLY`, se mudou) com `git revert`. Os modelos baixados em `data/` não são versionados e podem permanecer.
