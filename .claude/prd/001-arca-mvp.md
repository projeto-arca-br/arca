---
title: Arca MVP (v0.1)
status: ready-for-agent
labels: [ready-for-agent]
---

## Problem Statement

Em cenários sem internet (desastres, áreas remotas, apagões de infraestrutura), pessoas perdem acesso a conhecimento, mapas, tradução, cursos, livros e mídia. Soluções existentes (como o Project NOMAD) são pesadas, exigem MySQL só para o painel, não trazem tradutor nem mídia integrados e não foram pensadas para hardware modesto. Falta uma solução única, instalável sem internet, acessível pelo navegador por qualquer dispositivo da rede local.

## Solution

**Arca**: um servidor de conhecimento 100% offline, distribuído como stack Docker Compose para x86_64 (8GB+ RAM). Um portal unificado (backend leve + frontend) dá acesso, pela rede local, a notas (FlatNotes), Wikipédia e livros (Kiwix), mapas (MapLibre + PMTiles), tradução (LibreTranslate), cursos (Kolibri), livros e quadrinhos (Kavita) e filmes e música (Jellyfin). MariaDB guarda os dados do portal. Um proxy reverso (Caddy) expõe tudo em uma única porta. Scripts permitem baixar conteúdo uma vez (com internet), empacotar tudo em um pendrive e instalar/restaurar sem internet.

## User Stories

1. As a usuário, I want abrir o endereço do Arca no navegador do celular ou notebook, so that eu acesse todas as ferramentas sem instalar nada.
2. As a usuário, I want um painel inicial com cartões de cada ferramenta, so that eu encontre rapidamente o que preciso.
3. As a usuário, I want ver no painel se cada serviço está online ou offline, so that eu saiba o que está disponível.
4. As a usuário, I want que o painel funcione sem nenhuma requisição à internet, so that nada quebre durante um apagão de rede.
5. As a usuário, I want criar, editar, buscar e organizar notas em markdown, so that eu registre informações importantes.
6. As a usuário, I want que as notas persistam após reiniciar o servidor, so that eu não perca dados.
7. As a usuário, I want ler artigos da Wikipédia offline em português, so that eu consulte conhecimento geral.
8. As a usuário, I want buscar textos dentro dos ZIMs instalados, so that eu ache respostas rapidamente.
9. As a usuário, I want navegar em um mapa da minha região com zoom e pan, so that eu me oriente sem internet.
10. As a usuário, I want que o mapa use tiles, fontes e ícones locais, so that nenhum recurso externo seja carregado.
11. As a usuário, I want traduzir textos entre português, inglês e espanhol offline, so that eu me comunique com outras pessoas.
12. As a estudante, I want acessar cursos no Kolibri, so that eu continue aprendendo sem internet.
13. As a leitor, I want uma biblioteca de livros e quadrinhos no Kavita, so that eu leia por navegador.
14. As a usuário, I want assistir filmes e ouvir música pelo Jellyfin, so that eu tenha entretenimento durante a crise.
15. As a usuário, I want favoritos no portal (links para páginas de wiki, notas, locais), so that eu volte rápido ao que uso mais.
16. As a usuário, I want ver a lista de ZIMs, mapas e conteúdos instalados com tamanho e data, so that eu saiba o que o servidor contém.
17. As a usuário, I want uma página de ajuda offline explicando cada ferramenta, so that eu use o Arca sem documentação externa.
18. As a administrador, I want subir toda a stack com um único comando, so that a instalação seja simples.
19. As a administrador, I want ativar apenas perfis (learn, media, translate) compatíveis com meu hardware, so that a RAM não estoure.
20. As a administrador, I want limites de memória por serviço, so that um serviço não derrube os outros.
21. As a administrador, I want baixar uma vez, com internet, ZIM, tiles, modelos de tradução e canais Kolibri por um script com perfis (mini/completo), so that eu prepare o servidor.
22. As a administrador, I want empacotar imagens Docker e dados num diretório/pendrive (bundle), so that eu instale em outra máquina sem internet.
23. As a administrador, I want carregar o bundle e subir a stack em uma máquina limpa offline, so that eu replique o Arca rapidamente.
24. As a administrador, I want fazer backup (dump do MariaDB + notas) e restaurar em volume limpo, so that eu recupere dados após falha.
25. As a administrador, I want versões de imagens fixadas, so that o comportamento seja reproduzível.
26. As a administrador, I want healthchecks em todos os serviços, so that falhas sejam detectadas e reiniciadas automaticamente.
27. As a administrador, I want que os serviços reiniciem sozinhos após queda de energia, so that o Arca volte sem intervenção.
28. As a administrador, I want que a porta do Arca escute só na rede local, so that o servidor sem autenticação não seja exposto à internet.
29. As a administrador, I want configurar mídia, livros e quadrinhos colocando arquivos em pastas conhecidas, so that o conteúdo seja indexado.
30. As a administrador, I want documentação de instalação offline e de uso, so that outra pessoa consiga operar o Arca.
31. As a desenvolvedor, I want uma API HTTP documentada do portal (serviços, status, favoritos, biblioteca), so that eu estenda o frontend e teste o comportamento.
32. As a desenvolvedor, I want migrações SQL versionadas para o MariaDB, so that o esquema evolua com segurança.
33. As a desenvolvedor, I want smoke tests da stack, so that eu valide cada release.
34. As a usuário, I want que o portal seja responsivo em telas de celular, so that eu o use em qualquer dispositivo.
35. As a usuário, I want que o Arca tenha um nome local fácil (ex.: arca.local) documentado, so that eu lembre do endereço.

## Implementation Decisions

- **Topologia**: Docker Compose com serviços: mariadb, portal, caddy, flatnotes, kiwix, libretranslate, kolibri, kavita, jellyfin. Rede interna; apenas o Caddy publica porta no host.
- **Proxy reverso (Caddy)**: HTTP puro (`auto_https off`). Roteamento por caminho: `/` portal, `/notas`, `/wiki`, `/traducao`, `/cursos`, `/livros`, `/midia`, `/mapas`. Suporte a range requests para tiles PMTiles. Fallback documentado para subdomínios locais se algum serviço não suportar base URL.
- **Portal backend**: Python/FastAPI. Responsabilidades: catálogo de serviços, checagem de status por HTTP, favoritos, listagem de conteúdo instalado (ZIMs, mapas, modelos), página de ajuda. Acessa MariaDB.
- **Portal frontend**: estático, sem CDN, sem build em runtime, responsivo; todos os assets (incluindo MapLibre GL JS, glyphs e sprites) vendorizados.
- **Mapas**: arquivo PMTiles regional servido pelo Caddy/portal; estilo MapLibre local.
- **MariaDB**: apenas para dados do portal (serviços, favoritos, configurações, inventário de conteúdo, log de saúde). Tuning leve. Migrações SQL numeradas aplicadas na inicialização do portal.
- **FlatNotes**: sem autenticação (rede local), notas em arquivos markdown em volume; incluído no backup.
- **Kiwix**: serve todos os ZIMs do diretório de dados, com `urlRootLocation` sob `/wiki`.
- **LibreTranslate**: idiomas limitados a en/pb/es, modelos pré-baixados, sem atualização de modelos em runtime.
- **Kolibri, Kavita, Jellyfin**: ativados por profiles do Compose (`learn`, `media`); conteúdo fornecido pelo usuário em pastas conhecidas; Jellyfin com transcodificação por software limitada.
- **Recursos**: `mem_limit` por serviço; `restart: unless-stopped`; healthchecks em todos.
- **Contrato da API do portal** (alto nível): listar serviços com status; CRUD de favoritos; listar inventário de conteúdo; healthcheck do próprio portal.
- **Scripts**: fetch-data (online, perfis mini/completo), bundle/load (docker save/load + dados), backup/restore (dump MariaDB + volume de notas). Todos expostos via Makefile.
- **Reprodutibilidade**: imagens com versão/digest fixos; configuração via `.env`.
- **Segurança**: sem autenticação no MVP; escuta somente na LAN; documentar o risco.

## Testing Decisions

- Bons testes validam comportamento externo (respostas HTTP, dados persistidos, stack offline), não detalhes de implementação.
- **Seam 1 – Smoke E2E da stack**: sobe o Compose e verifica via HTTP no Caddy que cada rota responde e que não há tráfego externo (rede isolada/sem saída).
- **Seam 2 – API HTTP do portal**: pytest contra MariaDB real (container de teste) cobrindo serviços/status, favoritos e inventário.
- **Seam 3 – Scripts ponta a ponta**: backup→restore em volume limpo; bundle→load em daemon limpo.
- Sem testes unitários de UI no MVP. Não há prior art no repositório (projeto novo); estabelecer o padrão: pytest para API, scripts shell de smoke (`make test`).

## Out of Scope

- IA local (Ollama/Qdrant), comunicação (Meshtastic, Reticulum, Matrix/Mumble, ponto de acesso Wi-Fi).
- Autenticação/multiusuário, HTTPS, suporte a ARM64.
- Fornecimento de conteúdo de mídia/livros/música (responsabilidade do usuário).
- Gerenciamento de containers pela interface do portal.
- Descoberta mDNS/DNS automática (apenas documentação).

## Further Notes

- FlatNotes não usa banco; o MariaDB é do portal. Decisão do usuário.
- Kavita escolhido sobre Calibre-Web (cobre livros e quadrinhos); Jellyfin sobre Navidrome (cobre filmes e música). Navidrome/Calibre-Web podem entrar depois.
- Riscos: tamanho dos dados, RAM com todos os perfis ativos, suporte a base URL em Kavita/Jellyfin/Kolibri/FlatNotes.
- Plano técnico completo em `/home/ailton/.claude/plans/a-ideia-desse-projeto-playful-magpie.md`.
