---
title: Logo arca-farol e paleta
number: 013
priority: medium
tags: [feature, design, frontend]
dependencies: [011-migracao-frontend.spec.md]
related_prd: .claude/prd/002-identidade-e-ptbr.md
status: pending
created: 2026-09-30
---

# 013 - Logo arca-farol e paleta

## Overview
Cria a identidade visual: logo arca-farol em SVG, favicon, variantes claro/escuro e tokens de cor terra e ferrugem com verde-mata, aplicados ao portal, tudo local.

## Related PRD
- **Source**: [Identidade do Arca e português total](../prd/002-identidade-e-ptbr.md)
- **Section Reference**: User Stories 15-18, 30; Implementation Decisions (Identidade visual)

## Prerequisites
- [ ] Spec 011 concluído

## Dependencies
- `011-migracao-frontend.spec.md` - frontend já migrado

## Implementation Tasks
### 1. Logo
- [ ] Desenhar `logo.svg` (símbolo + palavra ARCA), `logo-simbolo.svg`, `favicon.svg`; casco de arca com farol central emitindo arcos de sinal
- [ ] Gerar localmente PNG 192/512 e `favicon.ico`; variantes para fundo claro e escuro
- [ ] **Mostrar prévia ao usuário e aguardar aprovação antes de aplicar**
### 2. Paleta
- [ ] Tokens CSS (`--carvao`, `--musgo`, `--folha`, `--ferrugem`, `--brasa`, `--osso`, `--argila`) com temas claro e escuro; validar contraste AA e ajustar valores
### 3. Aplicação
- [ ] Logo e favicon em `index.html`, `ajuda/`, `mapas/`; `style.css` usando os tokens; cópia dos SVGs para `docs/assets/`
- [ ] Nenhuma fonte ou recurso externo

## Acceptance Criteria
### Must Have
- [ ] Logo legível em 16 px e em fundos claro e escuro
- [ ] Contraste AA nos textos principais
- [ ] Smoke sem recurso externo passa

### Should Have
- [ ] Favicon em todas as páginas

## Testing Requirements
```bash
make teste-fumaca
```

## Rollback Plan
Remover as imagens e restaurar `style.css` e os HTMLs anteriores.
