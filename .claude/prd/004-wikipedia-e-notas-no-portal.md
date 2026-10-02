---
title: Wikipédia e Notas dentro do portal (v0.4)
status: ready-for-agent
labels: [ready-for-agent]
---

## Problem Statement

Quem usa o Arca abre a Wikipédia e as Notas pelo painel e cai nas telas nativas do Kiwix e do FlatNotes. Essas telas têm visual próprio, diferente do resto do Arca, não seguem o tema claro/escuro do portal, e levam a pessoa para fora da navegação do portal (sem o cabeçalho, sem o botão de ajuda). Mapas e Tradução já ficam dentro do portal, com a mesma cara. O público do Arca são brasileiros sem inglês técnico, em um cenário de crise, e precisa de telas simples, em português e consistentes.

## Solution

Criar duas páginas próprias dentro do portal, no mesmo padrão da página do tradutor: uma para a Wikipédia e outra para as Notas. Elas usam as APIs que o Kiwix e o FlatNotes já oferecem na mesma origem, sem chave e sem internet, e ficam com o cabeçalho, o tema e a ajuda do portal. Na Wikipédia, a busca, as sugestões e a lista de resultados são do Arca; o texto do artigo é exibido em um quadro embutido (iframe) dentro da página, porque já vem pronto do arquivo ZIM. Nas Notas, a lista, a busca, a leitura, a criação, a edição e a exclusão são do Arca. As telas nativas continuam disponíveis por um link. Os cartões "Wikipédia" e "Notas" do painel passam a abrir as novas páginas.

## User Stories

### Painel e navegação
1. Como morador, quero que o cartão "Wikipédia" abra uma página do próprio Arca, para não sair do portal.
2. Como morador, quero que o cartão "Notas" abra uma página do próprio Arca, para ter a mesma aparência do resto.
3. Como morador, quero o cabeçalho do portal (logo, Painel, Ajuda, tema) nas duas páginas, para voltar ao painel a qualquer momento.
4. Como morador, quero que o botão Ajuda leve à seção certa (Wikipédia ou Notas), para entender como usar.
5. Como morador, quero o tema claro e escuro nas duas páginas, para ler com conforto de dia e de noite.
6. Como morador, quero usar as páginas no celular, para consultar do aparelho que tiver.
7. Como morador, quero que o cartão fique desativado com mensagem clara quando o serviço estiver fora do ar, como acontece hoje.
8. Como administrador, quero que as telas nativas (`/wiki/` e `/notas/`) continuem funcionando, para recursos avançados.

### Wikipédia: busca
9. Como leitor, quero um campo de busca em português, para achar artigos pelo nome.
10. Como leitor, quero ver sugestões enquanto digito, para chegar mais rápido ao artigo.
11. Como leitor, quero que a busca tolere acentos e maiúsculas, para não errar por detalhe.
12. Como leitor, quero uma lista de resultados com título e trecho, para escolher o artigo certo.
13. Como leitor, quero paginar os resultados, para ver além dos primeiros.
14. Como leitor, quero ver o total de resultados, para saber o tamanho da busca.
15. Como leitor, quero uma mensagem clara quando nada for encontrado, para tentar outra palavra.
16. Como leitor, quero buscar com Enter e com botão, para usar teclado ou toque.

### Wikipédia: leitura
17. Como leitor, quero abrir o artigo dentro da página, para ler sem perder a navegação do portal.
18. Como leitor, quero que os links entre artigos funcionem no quadro embutido, para seguir a leitura.
19. Como leitor, quero um botão "Artigo aleatório", para descobrir assuntos.
20. Como leitor, quero que o botão Voltar do navegador volte à busca ou ao artigo anterior, para me orientar.
21. Como leitor, quero copiar o endereço de um artigo e abri-lo depois, para compartilhar na rede local.
22. Como leitor, quero um link "Abrir em tela cheia" para o Kiwix nativo, para ler com mais espaço.
23. Como leitor, quero que imagens e estilos do artigo venham do arquivo ZIM, para tudo funcionar offline.

### Wikipédia: arquivos ZIM
24. Como administrador, quero que a página descubra sozinha qual ZIM está instalado, para não configurar nada.
25. Como administrador, quero escolher entre vários ZIM quando houver mais de um, para consultar o que preciso.
26. Como administrador, quero uma mensagem em português dizendo como baixar os dados quando não houver ZIM, para resolver sozinho.
27. Como administrador, quero que adicionar um ZIM novo e reiniciar o Kiwix seja suficiente, para manter a rotina atual.

### Notas: lista e busca
28. Como morador, quero ver minhas notas em lista ordenada pela mais recente, para achar o que escrevi há pouco.
29. Como morador, quero buscar nas notas por título e conteúdo, para encontrar informações.
30. Como morador, quero ver trechos destacados nos resultados, para saber por que a nota apareceu.
31. Como morador, quero filtrar por etiqueta (tag), para agrupar assuntos.
32. Como morador, quero ver a data da última alteração de cada nota, para saber o que está atualizado.
33. Como morador, quero uma mensagem amigável quando não houver notas, para saber por onde começar.

### Notas: leitura e escrita
34. Como morador, quero abrir uma nota e vê-la formatada (títulos, listas, negrito, links, código), para ler com clareza.
35. Como morador, quero criar uma nota com título e texto, para registrar informações importantes.
36. Como morador, quero editar uma nota existente, para mantê-la atual.
37. Como morador, quero excluir uma nota com confirmação, para não apagar por engano.
38. Como morador, quero ser avisado se já existe nota com o mesmo título, para não sobrescrever sem querer.
39. Como morador, quero que títulos com acento, espaço e símbolos funcionem, para escrever naturalmente.
40. Como morador, quero ser avisado se eu sair da edição com alterações não salvas, para não perder texto.
41. Como morador, quero que minhas notas sejam salvas no mesmo lugar de sempre, para o backup do Arca continuar valendo.
42. Como morador, quero um link "Abrir no FlatNotes" para anexos e recursos avançados, para não perder nada do que a ferramenta oferece.
43. Como morador, quero que o texto das notas nunca seja executado como código na página, para a rede continuar segura.

### Erros e offline
44. Como morador, quero mensagens em português quando o serviço estiver indisponível (502/503/504 ou falha de rede), para saber que é temporário.
45. Como morador, quero que as páginas não carreguem nada da internet, para funcionar em qualquer cenário.
46. Como morador, quero que as páginas tenham foco visível e usem rótulos para leitor de tela, para serem acessíveis.
47. Como administrador, quero um aviso claro se o FlatNotes passar a exigir senha, para entender por que a página não salva.

### Operação e manutenção
48. Como administrador, quero que `make teste` e `make teste-fumaca` cubram as páginas novas, para detectar regressões.
49. Como administrador, quero a seção de Ajuda e o guia de uso atualizados, para orientar a comunidade.
50. Como mantenedor, quero a mudança de cartões feita por migração com reversa, para poder desfazer.
51. Como mantenedor, quero que o teste de convenção continue passando, com exceções justificadas, para manter o projeto 100% em português.

## Implementation Decisions

- **Páginas próprias, sem camada nova no backend.** Cada página é estática, servida pelo próprio portal, e fala diretamente com o Kiwix e o FlatNotes na mesma origem, atrás do Caddy. Não há rota nova na API do portal nem mudança no Caddy. É o mesmo padrão já adotado pelo Tradutor e pelos Mapas.
- **Endereços das páginas.** A Wikipédia fica em `/wikipedia/` e as Notas em `/anotacoes/`, em português e em ASCII. Os caminhos nativos `/wiki/` e `/notas/` permanecem, pois a API de cada serviço vive neles.
- **Wikipédia: descoberta do ZIM.** A página lê o catálogo OPDS do Kiwix. O identificador usado nas buscas e nos artigos é o último trecho do link de conteúdo do catálogo (o nome do arquivo sem `.zim`), nunca o campo "nome" do catálogo, que é diferente e não funciona. Com mais de um ZIM, há um seletor; com nenhum, aparece orientação para rodar `make baixar-dados`.
- **Wikipédia: busca.** Sugestões vêm do endpoint de sugestão (JSON); os resultados completos vêm do endpoint de busca em formato RSS, com paginação e total de resultados. Os rótulos de sugestão chegam com HTML escapado e são tratados como texto, nunca inseridos como HTML.
- **Wikipédia: leitura.** O artigo aparece em um iframe de mesma origem. O Kiwix e o Caddy não enviam cabeçalhos que impeçam isso, e a política de segurança do conteúdo do Kiwix permite scripts e a mesma origem. O estado da página (busca e artigo) fica no fragmento da URL, para o botão Voltar e para compartilhar o endereço.
- **Notas: listagem.** O FlatNotes não tem rota de listagem; a listagem usa a busca com o termo curinga `*`, que é o que o próprio FlatNotes usa. Ordenação por última alteração, mais recente primeiro. Etiquetas vêm da rota de etiquetas.
- **Notas: escrita.** Criar, editar e excluir usam as rotas de notas do FlatNotes. O título da nota é codificado na URL; títulos com acento e símbolos devem funcionar. Criar com título já existente avisa antes de sobrescrever. A exclusão pede confirmação.
- **Notas: formatação.** A leitura usa um renderizador de Markdown mínimo e próprio (títulos, listas, negrito, itálico, código, links, citações), sem biblioteca externa e sempre escapando HTML do conteúdo. Recursos avançados (anexos, editor completo) ficam no FlatNotes nativo, com link na página.
- **Autenticação.** O projeto usa o FlatNotes sem autenticação, adequado à LAN. A página não implementa login; se a API devolver 401 ou 403, mostra um aviso explicando que a nota não pôde ser lida ou salva.
- **Painel e dados.** Os cartões "Wikipédia" e "Notas" passam a apontar para as novas páginas por uma migração nova, com reversa, no padrão da migração do Tradutor. A verificação de saúde continua apontando para os serviços reais. Migrações já aplicadas não são editadas.
- **Padrão visual.** Mesmo cabeçalho, rodapé, tema, paleta e componentes das páginas existentes; layout responsivo; foco visível; sem recursos externos; ícones já existentes para `notas` e `wiki`.
- **Idioma e convenção.** Tudo em português, com identificadores em ASCII. Os campos impostos pelas APIs de terceiros (por exemplo `title` e `lastModified`) entram como exceções justificadas no teste de convenção.
- **Ajuda e documentação.** As seções "Notas" e "Wikipédia" da Ajuda e o guia de uso passam a descrever as páginas novas; os aprendizados vão para um arquivo novo em `.claude/learnings/`.
- **Dados.** Nada em `data/` é alterado por código ou testes automatizados, exceto notas de teste criadas e removidas pela fumaça em ambiente próprio.

## Testing Decisions

- Um bom teste valida comportamento externo (o que a pessoa ou a stack enxergam), não detalhes de implementação do JavaScript.
- **Seam 1, HTTP do portal (pytest contra MariaDB real):** cada página responde 200 com título e texto esperados, seus CSS e JS respondem 200, e nenhuma delas contém `http://` ou `https://`. `/api/servicos` devolve os novos caminhos. Prior art: testes da página do Tradutor e do catálogo de serviços.
- **Seam 2, migração:** a nova migração aplica, reverte e reaplica; a lista de migrações aplicadas é atualizada. Prior art: testes da migração do Tradutor.
- **Seam 3, fumaça da stack:** as rotas novas respondem pelo Caddy; a varredura de recursos externos inclui as páginas e seus arquivos; as rotas de API do Kiwix (catálogo, sugestão, busca) e do FlatNotes (busca e CRUD de uma nota de teste) funcionam de ponta a ponta. Prior art: seções de Notas e Wiki do script de fumaça.
- **Sem seam novo para a lógica de JavaScript** (leitura do RSS, Markdown, estado no fragmento): fica coberta pela fumaça e por verificação manual, como já ocorre com Mapas e Tradutor. Se isso se mostrar insuficiente, um seam novo é decisão futura.
- O teste de convenção deve continuar passando; exceções novas têm justificativa e nenhuma fica sem uso.

## Out of Scope

- Autenticação, senhas e múltiplos usuários nas Notas.
- Anexos e imagens nas notas dentro da página do Arca (seguem no FlatNotes nativo).
- Editor Markdown rico, pré-visualização ao vivo, histórico de versões.
- Busca em vários ZIM ao mesmo tempo.
- Reescrever ou estilizar o conteúdo dos artigos da Wikipédia.
- Troca ou atualização das imagens Docker do Kiwix e do FlatNotes.
- Mudanças no Caddy, no compose ou nos volumes.
- Páginas próprias para Cursos, Livros e Mídia.

## Further Notes

- O Kiwix só enxerga ZIM novo depois de `docker compose restart kiwix`.
- `HEAD /notas/` responde 404, enquanto `GET /notas/` responde 200; verificações devem usar GET.
- A busca do Kiwix em ZIM "mini" tem só a introdução dos artigos; resultados e trechos refletem isso.
- Spec 017 ainda traz `status: pending` no frontmatter apesar de `done` no índice; correção de limpeza opcional, fora deste PRD.
- Decomposição prevista em specs: 019 (Wikipédia), 020 (Notas) e 021 (migração, testes de catálogo, convenção e documentação).
