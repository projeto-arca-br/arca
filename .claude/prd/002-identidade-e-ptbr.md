---
title: Identidade do Arca e português total (v0.2)
status: ready-for-agent
labels: [ready-for-agent]
---

## Problem Statement

O Arca é um projeto brasileiro, pensado para o "mundo pós-apocalíptico" no Brasil, mas hoje mistura idiomas: textos, comentários e documentação estão em português, enquanto identificadores de código, rotas da API, campos JSON, tabelas e colunas do banco, scripts e alvos do Makefile estão em inglês. Quem contribui não tem uma regra escrita (não existe `CLAUDE.md`), a raiz do projeto não tem `README.md` que explique o projeto e sua arquitetura, e o produto não tem identidade visual (logo, paleta, favicon). Isso dificulta a adoção por brasileiros sem inglês técnico, que é justamente o público que pode precisar do Arca em uma crise.

## Solution

Adotar e impor uma regra única: **tudo em português do Brasil**, inclusive identificadores, rotas, banco, scripts e comandos. Registrar a regra, as exceções e um glossário no `CLAUDE.md`. Migrar todo o código existente para essa regra sem perder dados de instalações existentes. Criar o `README.md` da raiz com a explicação completa do projeto e da arquitetura. Criar a identidade visual "arca-farol" (casco de arca com farol emitindo sinal) com paleta terra e ferrugem com verde-mata, aplicada ao portal, ao favicon e à documentação, sem nenhum recurso externo.

## User Stories

1. Como contribuidor brasileiro, quero abrir o `CLAUDE.md` e ver a regra de idioma, para saber como nomear e escrever tudo.
2. Como contribuidor, quero uma lista clara de exceções (nomes impostos por terceiros), para não renomear o que não pode ser renomeado.
3. Como contribuidor, quero um glossário inglês→português, para nomear de forma consistente (favorito, serviço, biblioteca...).
4. Como agente de IA trabalhando no repositório, quero que o `CLAUDE.md` me obrigue a escrever código, comentários, commits e docs em português, para não reintroduzir inglês.
5. Como desenvolvedor, quero rotas da API em português (`/api/favoritos`, `/api/servicos`, `/api/biblioteca`, `/api/saude`), para que a API seja coerente com o resto.
6. Como desenvolvedor, quero campos JSON em português, para ler as respostas sem tradução mental.
7. Como desenvolvedor, quero tabelas e colunas do MariaDB em português, para que consultas e migrações sigam a mesma regra.
8. Como administrador com instalação existente, quero que a migração renomeie tabelas e colunas sem perder favoritos nem configurações, para atualizar sem medo.
9. Como administrador, quero uma migração reversa documentada, para voltar atrás se algo falhar.
10. Como administrador, quero alvos do Makefile em português (`subir`, `derrubar`, `baixar-dados`, `empacotar`, `carregar`, `restaurar`), para operar o Arca no meu idioma.
11. Como administrador, quero scripts e variáveis próprias do projeto em português, para entender o `.env` sem dicionário.
12. Como administrador, quero mensagens de erro e logs em português, para diagnosticar problemas rapidamente.
13. Como usuário do portal, quero que o painel continue funcionando igual após a migração, para não perceber a mudança.
14. Como usuário do portal, quero meus favoritos antigos preservados, para não perder meus atalhos.
15. Como usuário, quero ver a logo do Arca no cabeçalho do portal, para reconhecer o projeto.
16. Como usuário, quero um favicon legível em 16 px, para identificar a aba do Arca entre outras.
17. Como usuário, quero cores consistentes e com bom contraste (AA) em tema claro e escuro, para ler em qualquer luz, inclusive no celular.
18. Como usuário, quero que logo e fontes sejam locais, para nada ser carregado da internet.
19. Como visitante do repositório, quero um `README.md` na raiz com logo, para entender o que é o Arca em um minuto.
20. Como visitante, quero ler o cenário e o público-alvo (pós-apocalíptico/crise no Brasil, sem internet), para saber se o Arca serve para mim.
21. Como leitor, quero um aviso de segurança destacado (sem autenticação, só LAN), para não expor o servidor por engano.
22. Como leitor, quero uma tabela de serviços, rotas e perfis, para saber o que cada caminho entrega.
23. Como leitor, quero um diagrama de arquitetura (dispositivo → Caddy → serviços → MariaDB/volumes), para entender como as peças se conectam.
24. Como leitor, quero as decisões de arquitetura explicadas (por que Caddy, FastAPI, MariaDB só para o portal, perfis, imagens com digest), para avaliar e evoluir o projeto.
25. Como leitor, quero a estrutura de pastas do repositório descrita, para achar cada coisa.
26. Como administrador, quero um início rápido com os comandos já em português, para instalar sem ler toda a documentação.
27. Como administrador, quero o fluxo offline (empacotar → pendrive → carregar) resumido no README, para preparar o servidor antes da crise.
28. Como administrador, quero backup e restauração descritos no README, para proteger os dados.
29. Como desenvolvedor, quero saber como rodar os testes e o que cada seam cobre, para contribuir com segurança.
30. Como desenvolvedor, quero a paleta e os tokens de cor documentados, para manter a identidade ao criar telas.
31. Como mantenedor, quero um teste automático de convenção que falhe quando surgirem termos em inglês fora das exceções, para manter a regra ao longo do tempo.
32. Como mantenedor, quero um teste que valide os links do README e dos docs, para evitar documentação quebrada.
33. Como mantenedor, quero que o smoke valide as novas rotas e a ausência de recursos externos (incluindo logo e favicon), para garantir o offline.
34. Como mantenedor, quero que backup→restaurar e empacotar→carregar sigam funcionando com os nomes novos, para não quebrar a operação.
35. Como leitor, quero que `docs/README.md` seja um índice que aponta para o README da raiz, OFFLINE e RELEASE, para não haver documentação duplicada e divergente.
36. Como mantenedor, quero as decisões registradas em `.claude/learnings/`, para que sessões futuras herdem o contexto.

## Implementation Decisions

- **Regra de idioma**: português do Brasil em tudo (texto com acentos; identificadores em ASCII sem acento). Vale para código, identificadores, rotas, campos JSON, tabelas/colunas, scripts, alvos do Makefile, variáveis `ARCA_*`, comentários, logs, mensagens, UI, testes, docs, commits, PRs, specs e learnings.
- **Exceções** (nomes impostos por terceiros): palavras-chave de linguagens e SQL; chaves do Docker Compose; métodos e cabeçalhos HTTP; API do FastAPI/Pydantic; variáveis de imagens de terceiros (`MARIADB_*`, `FLATNOTES_*`, `LT_*`, `KOLIBRI_*` etc.); nomes-padrão de arquivo (`README.md`, `CLAUDE.md`, `Makefile`, `Dockerfile`, `pyproject.toml`); termos técnicos sem tradução estabelecida podem aparecer em texto corrido, mas nomes próprios do projeto seguem em português.
- **Glossário**: bookmark→favorito, service→servico, library→biblioteca, health→saude, check→verificar, content_items→itens_conteudo, health_log→registro_saude, settings→configuracoes, created_at→criado_em, updated_at→atualizado_em, modified_at→modificado_em, size_bytes→tamanho_bytes, latency_ms→latencia_ms, title→titulo, category→categoria, slug→identificador, profile→perfil, position→posicao, kind→tipo, name→nome, description→descricao, path→caminho. O glossário completo vive no `CLAUDE.md`.
- **Banco**: migrações já aplicadas não são editadas. Uma nova migração renomeia tabelas, colunas e índices preservando os dados, com migração reversa correspondente. O registro de migrações aplicadas continua funcionando.
- **API**: rotas e campos renomeados conforme o glossário, sem aliases para as rotas antigas (não há clientes externos no MVP). A documentação OpenAPI local acompanha. O healthcheck do Compose, o catálogo de serviços e o frontend passam a usar as rotas novas.
- **Frontend**: consome a API nova; textos já em português permanecem; aplica logo, favicon e tokens de cor da paleta; tema claro e escuro.
- **Operação**: scripts, alvos do Makefile e variáveis próprias do projeto renomeados; `.env.example`, Compose, smoke e docs atualizados. Sem alias dos alvos antigos.
- **Identidade visual**: conceito arca-farol (casco de arca com farol/antena central emitindo arcos de sinal). Paleta inicial: carvão `#1C2421`, musgo `#3F5A43`, folha `#7A9E5F`, ferrugem `#C4582A` (acento primário), brasa `#E8873F` (destaque), osso `#EDE6D6`, argila `#8A6E54`; valores sujeitos a ajuste para garantir contraste AA. Entregas: logo completa, símbolo, favicon (SVG e PNG/ICO), variantes para fundo claro e escuro, tudo servido localmente. Uma prévia é mostrada ao usuário antes de aplicar na interface.
- **Documentação**: `CLAUDE.md` na raiz (regra, exceções, glossário, comandos, convenções); `README.md` na raiz com logo, cenário, aviso de segurança, serviços, diagrama de arquitetura, decisões, estrutura, instalação, fluxo offline, backup, testes e identidade; `docs/README.md` vira índice.
- **Ordem**: CLAUDE.md primeiro (fixa regra e glossário), depois backend, frontend, operação, identidade visual, README e, por fim, o teste de convenção.

## Testing Decisions

- Bons testes validam comportamento externo (respostas HTTP, dados persistidos, stack offline, scripts ponta a ponta), não detalhes de implementação.
- **Seam 1 - Smoke E2E da stack (existente)**: passa a validar as rotas em português, logo e favicon locais e a ausência de recurso externo. Prior art: o script de smoke atual.
- **Seam 2 - API do portal (existente)**: pytest contra MariaDB real cobrindo `/api/saude`, `/api/servicos`, `/api/favoritos`, `/api/biblioteca` e a migração nova aplicada sobre dados no esquema antigo (favoritos preservados) e revertida. Prior art: os testes atuais do portal.
- **Seam 3 - Scripts ponta a ponta (existente)**: backup→restaurar e empacotar→carregar com os nomes novos. Prior art: o teste de operação atual.
- **Verificação de convenção (nova, mesma infraestrutura de testes)**: busca por termos do glossário em inglês fora da lista de exceções e validação dos links do README e dos docs.
- Sem testes unitários de UI.

## Out of Scope

- Traduzir ou alterar o conteúdo de terceiros (Wikipédia, cursos, livros, mídia) e as interfaces de apps de terceiros (Kiwix, FlatNotes, Kavita, Jellyfin, Kolibri, LibreTranslate).
- Renomear variáveis, chaves e nomes impostos por imagens e ferramentas de terceiros.
- Internacionalização (várias línguas) do portal: o produto é só pt-BR.
- Novas funcionalidades do Arca (IA local, comunicação, autenticação, HTTPS, ARM64).
- Compatibilidade retroativa com rotas e alvos antigos.

## Further Notes

- O projeto não é repositório git e não tem issue tracker: PRD e specs ficam em `.claude/prd/` e `.claude/specs/`.
- Risco principal: a migração de banco e de rotas tocar dados reais em `data/mariadb`; mitigar com migração reversa, teste sobre dados antigos e backup antes de atualizar.
- Risco secundário: variáveis do `.env` renomeadas quebrarem instalações existentes; documentar a mudança e manter o `.env.example` como fonte de verdade.
- Plano técnico: `/home/ailton/.claude/plans/esse-um-projeto-keen-cocke.md`.
