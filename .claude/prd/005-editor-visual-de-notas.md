---
title: Editor visual de notas no portal (v0.5)
status: ready-for-agent
labels: [ready-for-agent]
---

## Problem Statement

A página de Notas do portal (`/anotacoes/`) funciona, mas é difícil de usar. A edição é uma caixa de texto com símbolos de Markdown (`#`, `**`, `-`), que quem não entende Markdown não sabe usar. Leitura e edição ficam em telas separadas, a aparência foge do padrão da página do tradutor, não há barra de formatação, não há como pôr etiquetas, anexar imagens ou arquivos, e é preciso lembrar de clicar em Salvar. O público do Arca são brasileiros sem inglês técnico, em cenário de crise, e precisa de um caderno simples, que lembre Notion ou Obsidian, sem exigir que a pessoa saiba o que é Markdown.

## Solution

Refazer a página de Notas no padrão visual da página do tradutor (cabeçalho, botões, cartões, mensagens, tema claro e escuro) com um editor visual. A pessoa escreve direto no texto já formatado, usa uma barra de ferramentas, atalhos e um menu "/" para inserir títulos, listas, tarefas, citações, código, tabelas e divisores. As etiquetas são adicionadas e removidas como "chips". Imagens e arquivos são anexados por botão, arrastar ou colar. A nota é salva sozinha, com indicador "Salvo". O texto continua guardado como Markdown no FlatNotes, então as notas seguem abrindo na tela nativa `/notas/`. A tela fica com uma barra lateral (busca, etiquetas, lista de notas) e a folha da nota ao lado; no celular, uma coluna por vez.

## User Stories

### Aparência e navegação
1. Como morador, quero que a página de Notas tenha a mesma aparência da página do tradutor, para me sentir no mesmo sistema.
2. Como morador, quero o cabeçalho do portal (logo, Painel, Ajuda, tema) na página de Notas, para voltar ao painel a qualquer momento.
3. Como morador, quero que o botão Ajuda leve à seção de Notas, para aprender a usar o caderno.
4. Como morador, quero o tema claro e escuro, para escrever com conforto de dia e de noite.
5. Como morador, quero usar a página no celular, para anotar do aparelho que tiver.
6. Como morador, quero uma barra lateral com a lista de notas e a nota ao lado, para trocar de nota sem perder o lugar.
7. Como morador no celular, quero ver uma coluna por vez, com botão Voltar à lista, para não apertar a tela.
8. Como morador, quero recolher a barra lateral, para ter mais espaço de escrita.
9. Como administrador, quero um link "Abrir no FlatNotes", para usar recursos avançados da tela nativa.

### Lista, busca e etiquetas
10. Como morador, quero ver as notas da mais recente para a mais antiga, para achar o que escrevi há pouco.
11. Como morador, quero buscar por título e conteúdo, com os trechos encontrados destacados, para localizar a nota certa.
12. Como morador, quero filtrar as notas por etiqueta, para ver só um assunto.
13. Como morador, quero adicionar etiquetas à nota digitando o nome e apertando Enter, sem escrever `#`.
14. Como morador, quero remover uma etiqueta clicando no "x" do chip, para corrigir um engano.
15. Como morador, quero sugestões das etiquetas que já existem enquanto digito, para não criar duplicadas.
16. Como morador, quero uma mensagem clara quando não houver notas ou resultados, para saber o que fazer.

### Escrever sem saber Markdown
17. Como morador, quero escrever direto no texto formatado, sem ver símbolos de Markdown, para não precisar aprender a sintaxe.
18. Como morador, quero uma barra de ferramentas com negrito, itálico, riscado, títulos, listas, tarefas, citação, código, link, imagem, tabela e divisor, para formatar com cliques.
19. Como morador, quero atalhos do teclado (negrito, itálico, link, salvar), para escrever mais rápido.
20. Como morador, quero digitar "/" e escolher um bloco de um menu, como no Notion, para inserir elementos sem procurar na barra.
21. Como morador, quero que digitar "# ", "- " ou "[] " no começo da linha vire título, lista ou tarefa, para quem já conhece o atalho.
22. Como morador, quero listas de tarefas com caixas que eu marco com um clique, para controlar o que falta fazer.
23. Como morador, quero listas dentro de listas, para organizar em níveis.
24. Como morador, quero criar tabelas simples, para organizar dados.
25. Como morador, quero colar texto de outro lugar sem trazer estilos estranhos, para a nota não ficar bagunçada.
26. Como morador, quero desfazer e refazer, para recuperar de erros.
27. Como morador, quero escrever o título da nota em um campo grande no topo, para identificá-la bem.
28. Como morador, quero títulos com acentos e espaços (por exemplo "Água e luz"), para nomear como falo.
29. Como morador, quero ser avisado se o título já existe ou tem caracteres inválidos, para não sobrescrever outra nota.

### Anexos
30. Como morador, quero anexar uma imagem por botão, para ilustrar a nota.
31. Como morador, quero arrastar uma imagem para a nota, para anexar mais rápido.
32. Como morador, quero colar uma imagem da área de transferência, para guardar capturas de tela.
33. Como morador, quero anexar outros arquivos (PDF, documentos) que aparecem como link, para guardar tudo junto.
34. Como morador, quero uma mensagem clara se o envio falhar ou o arquivo for grande demais, para tentar de novo.

### Salvar e segurança dos dados
35. Como morador, quero que a nota seja salva sozinha depois que paro de digitar, para nunca perder trabalho.
36. Como morador, quero ver "Salvando…", "Salvo" ou "Erro ao salvar", para saber o estado.
37. Como morador, quero salvar na hora com Ctrl+S, para ter certeza.
38. Como morador, quero que a nota seja salva ao trocar de nota ou fechar a página, para não perder o que escrevi.
39. Como morador, quero ser avisado se não foi possível salvar, para não sair sem perceber.
40. Como morador, quero criar uma nota nova com um botão "Nova nota", que é criada no primeiro salvamento, para não ficar com notas vazias.
41. Como morador, quero excluir uma nota depois de confirmar, para não apagar por acidente.
42. Como morador, quero mensagens em português quando faltar permissão ou o serviço estiver fora do ar, para entender o que houve.

### Compatibilidade e segurança
43. Como administrador, quero que o conteúdo continue em Markdown no FlatNotes, para abrir as mesmas notas em `/notas/`.
44. Como administrador, quero que notas antigas, escritas em Markdown, abram corretamente no editor, para não perder o que já existe.
45. Como administrador, quero que o texto da nota nunca execute HTML ou `javascript:`, para a página ser segura mesmo com conteúdo malicioso colado.
46. Como administrador, quero que nada seja carregado da internet, para o portal funcionar offline.
47. Como pessoa que usa leitor de tela ou só teclado, quero botões com rótulo, foco visível e menus acessíveis por teclado, para usar o caderno sem mouse.
48. Como mantenedor, quero que a ajuda e o guia de uso descrevam o editor, para o público aprender sozinho.

## Implementation Decisions

- **Editor visual sem bibliotecas externas.** A área de escrita edita o texto já formatado no próprio navegador; o Markdown é só o formato salvo. Nenhuma biblioteca de terceiros, nada de CDN, tudo servido pelo portal.
- **Dois conversores puros.** Um converte Markdown em HTML seguro para exibir no editor; o outro converte o conteúdo do editor de volta em Markdown. São independentes da interface e testáveis isoladamente. O primeiro escapa todo HTML antes de formatar e só aceita links `http(s)`, caminhos relativos e o endereço dos anexos; o segundo só emite Markdown suportado pelo FlatNotes.
- **Ida e volta estável.** Abrir e salvar uma nota sem editar não deve alterar o Markdown de forma relevante. Recursos suportados: títulos, negrito, itálico, riscado, listas (inclusive aninhadas), tarefas, citações, código em linha e em bloco, links, imagens, tabelas e divisor.
- **Menu "/" e atalhos de digitação** inserem blocos; a barra de ferramentas e os atalhos de teclado cobrem as mesmas ações. Colar sempre entra como texto limpo.
- **Etiquetas como chips.** São gravadas no Markdown no formato que o FlatNotes entende (linha de `#etiquetas`) e ocultadas na folha. A lista de etiquetas existentes alimenta o filtro e as sugestões. O formato real precisa ser confirmado contra o FlatNotes em execução.
- **Anexos pela API do FlatNotes.** O envio vai para a API de anexos do FlatNotes, na mesma origem. Imagens viram imagem na nota; outros tipos viram link. O formato da resposta e o endereço de download precisam ser confirmados contra o serviço em execução.
- **Salvar automático.** Salva depois de uma pausa curta na digitação, com indicador de estado e salvamento imediato por atalho, ao trocar de nota e ao sair. Falha de salvamento avisa e impede perda silenciosa. A nota nova só é criada no primeiro salvamento com título válido, mantendo a checagem de título duplicado e de caracteres inválidos. Na atualização, o FlatNotes espera o campo `newContent` (com `content` devolve 200 mas não grava).
- **Título.** Campo grande no topo. Renomear depois de criada só entra se o FlatNotes aceitar; caso contrário o título fica fixo após a criação (comportamento atual).
- **Layout.** Barra lateral retrátil (busca, etiquetas, lista, "Nova nota", link para o FlatNotes) e folha da nota; uma coluna por vez no celular. Reusa as classes e variáveis de `style.css` (botões, cartões, mensagens, temas) em vez de redefini-las; o CSS da página guarda só o específico. Ícones novos entram no mapa de ícones compartilhado.
- **Remoção do modo leitura.** A nota abre direto editável; o modo de leitura separado deixa de existir. Um modo avançado "ver Markdown" é opcional, em fase final.
- **Segurança.** Nenhum HTML do conteúdo é executado; links `javascript:` são bloqueados; imagens e anexos só do prefixo de anexos do FlatNotes; a rede continua sem autenticação e só para a LAN.
- **Convenção de idioma.** Identificadores em português sem acento; os campos impostos pelas APIs de terceiros (`title`, `name` do anexo, `lastModified`) entram em `scripts/convencao-excecoes.txt` com justificativa, ou são acessados por apelidos em português. Não há resíduos de `http://` ou `https://` literais nos arquivos da página.
- **Sem mudanças de banco, Compose ou Caddy.** O cartão do painel já aponta para `/anotacoes/`.
- **Documentação.** Atualizar a seção de Notas da Ajuda, o guia de uso e registrar aprendizados.

## Testing Decisions

- **O que é um bom teste:** valida comportamento externo (o que o usuário e a API veem), não detalhes de implementação.
- **Seam 1 — HTTP do portal (pytest):** a página e todos os arquivos estáticos devolvem 200; o título da página está presente; nenhum arquivo contém `http://` nem `https://`. Prior art: `teste_anotacoes.py`, `teste_tradutor.py`.
- **Seam 2 — conversor Markdown↔HTML (novo, pytest chamando `node`):** ida e volta com títulos, listas aninhadas, tarefas, tabelas, código, links, imagens; escape de `<script>` e bloqueio de `javascript:`. O teste é pulado, com aviso, se não houver `node`.
- **Seam 3 — fumaça ponta a ponta (`scripts/fumaca.sh`):** contra o FlatNotes real, com título exclusivo da fumaça e limpeza ao final: criar, editar, buscar, anexar um arquivo e baixá-lo, excluir e confirmar 404. Prior art: ciclo de notas da spec 020.
- **Seam 4 — convenção (`make teste-convencao`):** nenhum termo proibido novo; toda exceção nova com justificativa e em uso.
- **Seam 5 — checklist manual no navegador:** criar e editar com barra, menu "/" e atalhos; etiquetas; anexar por botão, arrastar e colar; salvar automático e Ctrl+S; Voltar; tema escuro; celular; teclado e leitor de tela; abrir a mesma nota em `/notas/` e conferir o Markdown. Esse passo ficou sem verificar nas specs 019 a 021.

## Out of Scope

- Edição colaborativa em tempo real.
- Histórico de versões e lixeira.
- Pastas e hierarquia de notas (o FlatNotes é plano).
- Criptografia e autenticação de notas.
- Exportar e importar notas em lote.
- Fórmulas, diagramas e blocos incorporados (vídeo, mapas).
- Mudanças na Wikipédia, no tradutor ou nos outros cartões.
- Mudanças na imagem do FlatNotes ou em sua configuração.

## Further Notes

- Confirmar com `curl`, em uma nota de teste, antes de implementar: formato de `/notas/api/tags`, como o FlatNotes lê etiquetas no texto, resposta e endereço do `POST` de anexos, e se o `PATCH` aceita `newTitle`.
- A spec 020 documenta `content` no `PATCH`, mas o correto é `newContent`; a spec nova e os aprendizados devem usar o correto.
- O risco principal é o conversor visual↔Markdown; por isso ele é um módulo puro com teste próprio.
- Os testes da página (pytest) e a fumaça precisam incluir os novos arquivos estáticos.
- `data/` não deve ser tocado; testes usam apenas notas e anexos temporários no ambiente de teste.
