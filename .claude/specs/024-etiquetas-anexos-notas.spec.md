---
title: Etiquetas editáveis, anexos e documentação do editor de notas
number: 024
priority: medium
tags: [feature, portal, frontend, notes, docs, testing, convention]
dependencies: [023-editor-visual-notas.spec.md]
related_prd: .claude/prd/005-editor-visual-de-notas.md
status: done
created: 2026-10-01
---

# 024 - Etiquetas editáveis, anexos e documentação do editor de notas

## Overview
Acrescenta ao editor visual as etiquetas como chips (adicionar, remover, sugerir, filtrar) e os anexos (imagem por botão, arrastar e colar; outros arquivos como link), e fecha com fumaça ponta a ponta, convenção, ajuda, guia de uso e aprendizados.

## Related PRD
- **Source**: [Editor visual de notas no portal](../prd/005-editor-visual-de-notas.md)
- **Section Reference**: User Stories 12-15, 30-34, 43, 46-48; Implementation Decisions (Etiquetas, Anexos, Convenção, Documentação); Testing Decisions (Seams 3-5)

## Prerequisites
- [ ] Spec 023 concluída
- [ ] Formatos reais de etiquetas e anexos registrados no learning da spec 022

## Dependencies
- `023-editor-visual-notas.spec.md` - editor, layout e salvar automático
- `022-conversor-markdown-notas.spec.md` - conversor (imagens, links) e formatos da API

## Implementation Tasks
### 1. Etiquetas
- [ ] Chips na folha: adicionar (digitar e Enter/vírgula, sem `#`), remover pelo "x", sugestões a partir de `GET /notas/api/tags`; aceitar o formato real documentado (lista de texto ou objetos)
- [ ] Gravar no Markdown no formato que o FlatNotes entende (conforme o learning da 022) e ocultar essa linha na folha; ao abrir, ler as etiquetas do texto e montar os chips; ida e volta sem duplicar linhas
- [ ] Filtro por etiqueta na barra lateral (chips), combinado com a busca
- [ ] Normalizar etiqueta (sem espaços, sem `#`, tamanho máximo) com mensagem em português

### 2. Anexos
- [ ] Botão "Anexar" (seletor de arquivo), arrastar e colar (`paste` com arquivos) → `POST /notas/api/attachments` (multipart, campo `file`)
- [ ] Imagem vira `![descrição](/notas/attachments/<arquivo>)` no editor (exibida); outros tipos viram link com o nome do arquivo; o conversor aceita só esse prefixo para imagens
- [ ] Estado "Enviando…", erro e arquivo grande demais com mensagens em português; salvar automático dispara depois da inserção
- [ ] Usar identificadores em português para os campos da resposta (`arquivo`, `nomeDoArquivo`); campos impostos pela API de terceiros só com exceção justificada

### 3. Testes e fumaça
- [ ] `portal/testes/teste_conversor.py`: casos de etiquetas (linha de `#etiquetas` oculta/recuperada) e de imagem/link de anexo; `javascript:` ainda bloqueado
- [ ] `portal/testes/teste_anotacoes.py` e `scripts/fumaca.sh`: incluir qualquer arquivo estático novo (rota 200, sem `http(s)://`, varredura de externos)
- [ ] `scripts/fumaca.sh`: estender o ciclo de notas — criar nota com etiqueta, confirmar em `/notas/api/tags`, anexar um arquivo pequeno, baixar por `/notas/attachments/<arquivo>`, buscar, excluir a nota e confirmar 404; título e arquivo exclusivos da fumaça e limpeza ao final, só no ambiente de teste; não tocar em notas reais

### 4. Convenção
- [ ] `scripts/convencao-excecoes.txt`: uma exceção por padrão realmente usado, com justificativa, para campos de terceiros (`title`, `name` etc.); nenhuma sem uso; `make teste-convencao` passa, inclusive links dos `docs/*.md`

### 5. Ajuda e documentação
- [ ] `portal/app/static/site/ajuda/index.html` (`#notas`): como escrever, usar a barra, o menu "/", atalhos, etiquetas, anexos, salvar automático, excluir, e o link para a tela nativa
- [ ] `docs/USO.md`: atualizar a seção de Notas; `README.md` e `docs/README.md` só se citarem comportamento antigo
- [ ] `.claude/learnings/editor-visual-de-notas.md` (continuar o da 022): decisões do editor (contenteditable, conversores puros, colar como texto), `newContent` no PATCH, etiquetas e anexos reais, salvar automático, armadilhas da convenção
- [ ] `.claude/learnings/wikipedia-notas-no-portal.md`: ponteiro para o novo learning
- [ ] `.claude/specs/INDEX.md`: 022-024 em `done` ao concluir; corrigir o texto da spec 020 (`content` → `newContent`)

## Acceptance Criteria
### Must Have
- [ ] Etiquetas adicionadas e removidas por chips aparecem em `/notas/` (FlatNotes) e filtram a lista no portal
- [ ] Imagem anexada por botão, arrastar e colar aparece na nota e em `/notas/`; outros arquivos viram link que baixa
- [ ] Mensagens em português para falha de envio e arquivo grande
- [ ] Fumaça ponta a ponta passa e limpa o que criou
- [ ] `make teste` e `make teste-fumaca` passam; ajuda, guia de uso e learnings atualizados

### Should Have
- [ ] Sugestões de etiquetas existentes
- [ ] Modo avançado "ver Markdown" (opcional)

## Testing Requirements
```bash
make teste
make teste-fumaca
make subir
curl -s "http://127.0.0.1:8088/notas/api/tags" | head
# manual: criar nota com etiquetas, anexar imagem por botão/arrastar/colar, recarregar, abrir em /notas/, tema escuro, celular, teclado e leitor de tela
```

## Rollback Plan
Reverter os arquivos da página, o teste, a fumaça, as exceções, a ajuda e os learnings com `git revert`. Notas e anexos já criados continuam válidos no FlatNotes (Markdown padrão). Sem mudanças em banco, compose ou Caddy.
