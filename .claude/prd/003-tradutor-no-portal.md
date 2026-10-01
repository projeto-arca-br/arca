---
title: Tradutor dentro do portal e modelos de tradução em português do Brasil (v0.3)
status: ready-for-agent
labels: [ready-for-agent]
---

## Problem Statement

Quem usa o Arca precisa traduzir textos sem internet, mas hoje tem dois problemas. Primeiro, o comando que baixa os modelos de tradução (`make modelos-traducao`) para no meio: depois de trocar o português de Portugal (`pt`) pelo português do Brasil (`pb`), o download termina logo após "Downloading model: es", sem concluir. O segmentador de frases (MiniSBD) usa códigos de idioma ISO e não conhece o código `pb`, que é uma invenção do Argos Translate; os modelos de segmentação instalados são só `en`, `es` e `pt`. Segundo, a única tela de tradução é a interface web do LibreTranslate: ela está em inglês, tem visual diferente do resto do Arca e leva a pessoa para fora do portal. O público do Arca são brasileiros sem inglês técnico, em um cenário de crise, e precisa de uma tela simples, em português, com a mesma cara do portal.

## Solution

Corrigir o download para que os modelos de tradução en, pb e es sejam baixados por completo, uma única vez, com internet, e funcionem depois sem nenhuma conexão. Criar uma página de tradução própria do Arca, dentro do portal, em `/tradutor/`, que usa a API do LibreTranslate (mesma origem, sem chave) e substitui a interface dele. A interface do LibreTranslate é desligada. O cartão "Tradução" do painel passa a abrir a nova página. A página é toda em português, funciona em tema claro e escuro, no celular, e não carrega nada da internet.

## User Stories

1. Como administrador, quero que `make modelos-traducao` termine com sucesso, para ter a tradução funcionando offline.
2. Como administrador, quero que o download baixe os modelos de en, pb e es, para traduzir entre português do Brasil, inglês e espanhol.
3. Como administrador, quero ver uma mensagem clara em português se o download falhar, para saber o que fazer.
4. Como administrador, quero que o download seja feito uma única vez, para depender de internet só nesse momento.
5. Como administrador, quero que o LibreTranslate suba sem acessar a internet depois do download, para ele funcionar em uma crise.
6. Como administrador, quero que os modelos já baixados em `data/` não sejam apagados nem editados pelo projeto, para não perder dados.
7. Como administrador, quero que a documentação explique o que fazer depois de trocar `pt` por `pb`, para atualizar uma instalação existente.
8. Como usuário, quero abrir a tradução a partir do painel do portal, para não precisar saber o endereço do serviço.
9. Como usuário, quero que o cartão "Tradução" do painel leve para a página de tradução do Arca, para ficar dentro do portal.
10. Como usuário, quero uma página de tradução toda em português, para usar sem saber inglês.
11. Como usuário, quero escolher o idioma de origem e o de destino, para traduzir entre os idiomas disponíveis.
12. Como usuário, quero ver os idiomas com nomes em português (Inglês, Português (Brasil), Espanhol), para reconhecê-los sem esforço.
13. Como usuário, quero a opção "Detectar idioma", para quando eu não souber qual é o idioma do texto.
14. Como usuário, quero trocar origem e destino com um botão, para traduzir de volta com um toque.
15. Como usuário, quero digitar ou colar o texto em uma área grande, para traduzir parágrafos inteiros.
16. Como usuário, quero ver a tradução em uma segunda área, para ler e conferir o resultado.
17. Como usuário, quero um botão "Traduzir", para disparar a tradução de forma explícita.
18. Como usuário, quero que as quebras de linha do meu texto sejam mantidas na tradução, para não bagunçar listas e parágrafos.
19. Como usuário, quero um botão "Copiar tradução", para levar o resultado a outro lugar.
20. Como usuário, quero um botão "Limpar", para começar outro texto.
21. Como usuário, quero um contador de caracteres, para saber o tamanho do que estou enviando.
22. Como usuário, quero que o último par de idiomas escolhido seja lembrado neste aparelho, para não escolher de novo toda vez.
23. Como usuário, quero ver que a tradução está em andamento (por exemplo "Traduzindo..."), para saber que o aparelho não travou.
24. Como usuário, quero uma mensagem clara quando o serviço de tradução estiver desligado ou sem modelos, dizendo o que fazer, para não ficar sem resposta.
25. Como usuário, quero uma mensagem clara quando o texto estiver vazio, para entender por que nada aconteceu.
26. Como usuário, quero uma mensagem clara quando a tradução falhar, para tentar de novo.
27. Como usuário, quero um aviso de que traduzir entre espanhol e português do Brasil passa pelo inglês e pode ficar menos preciso, para interpretar o resultado com cuidado.
28. Como usuário de celular, quero que a página se ajuste à tela pequena, para usar no telefone.
29. Como usuário, quero tema claro e escuro com bom contraste, para ler em qualquer luz.
30. Como usuário, quero usar a página só com teclado e leitor de tela (rótulos, foco visível, mensagens com `role=status`), para que ela seja acessível.
31. Como usuário, quero o mesmo cabeçalho, logo e botão de tema das outras páginas, para reconhecer o Arca.
32. Como usuário, quero um link de Ajuda na página que leve à seção de tradução, para aprender a usar.
33. Como usuário, quero que o texto da Ajuda de tradução descreva a página do Arca, e não a interface do LibreTranslate, para não me confundir.
34. Como usuário, quero que o texto que digito fique somente na rede local, para ter privacidade.
35. Como administrador, quero que a interface do LibreTranslate fique desligada, para existir só uma tela de tradução.
36. Como administrador, quero que a API do LibreTranslate continue disponível em `/traducao/`, para a página e o painel de estado funcionarem.
37. Como administrador, quero que o painel continue mostrando o estado do serviço de tradução, para saber se ele está no ar.
38. Como administrador, quero que o cartão de tradução fique desativado quando o perfil `traducao` estiver desligado, para não levar a uma página quebrada.
39. Como administrador, quero que a mudança do endereço do cartão seja uma migração com reversa, para poder voltar atrás.
40. Como administrador, quero que `make teste` cubra a migração, a página e a rota da API, para detectar regressões.
41. Como contribuidor, quero que a página e o código sigam a regra de português total (identificadores em ASCII), para manter a convenção.
42. Como contribuidor, quero que `make teste-convencao` passe sem exceções novas desnecessárias, para a regra continuar valendo.
43. Como administrador, quero que nada seja carregado de CDN, fonte ou imagem da internet, para o Arca funcionar offline.
44. Como administrador, quero que `make empacotar` e `make carregar` continuem levando os modelos de tradução, para instalar em outro lugar sem internet.

## Implementation Decisions

- **Dois idiomas de segmentação.** O download dos modelos de tradução (Argos) usa a lista en, pb, es. O download dos modelos do segmentador de frases (MiniSBD) usa uma lista separada com códigos ISO: en, pt, es. O português do Brasil é segmentado com o modelo `pt`. Os dois downloads rodam no mesmo alvo do Makefile, com listas independentes.
- **Idiomas carregados no serviço.** O LibreTranslate carrega en, pb e es. Não há par direto entre es e pb; o próprio Argos usa o inglês como intermediário. A interface avisa isso ao usuário. Se, na implementação, o serviço offline tentar baixar o segmentador de `pb` e falhar, avalia-se carregar também `pt` no serviço; essa decisão deve ser registrada em learnings.
- **Causa a confirmar.** A hipótese é que o MiniSBD não aceita `pb`. A implementação deve reproduzir a falha, ler o erro completo (o log atual não mostra o traceback) e só então aplicar a correção, ajustando a mensagem de erro do alvo para português.
- **Página própria em `/tradutor/`.** O Caddy envia todo `/traducao*` ao LibreTranslate, então a página não pode usar esse prefixo. `/tradutor/` cai no portal, que já serve páginas estáticas (como `/mapas/` e `/ajuda/`). O proxy não precisa de mudança.
- **API reutilizada.** A página chama `GET /traducao/languages` para preencher os idiomas e `POST /traducao/translate` (texto, origem, destino, formato texto) para traduzir. É a mesma origem do portal, então não há CORS, e o serviço não usa chave de API nem limite de requisições.
- **Interface do LibreTranslate desligada.** A variável de ambiente do LibreTranslate que desliga a interface web é ligada. A API e o teste de saúde do contêiner continuam funcionando.
- **Nomes dos idiomas em português.** O portal mapeia os códigos devolvidos pela API (`en`, `pb`, `es`) para nomes em português e ignora o nome em inglês devolvido pelo serviço. Código desconhecido aparece com o próprio código.
- **Migração 005.** Nova migração altera o campo de endereço (`caminho`) do serviço `traducao` na tabela `servicos` para `/tradutor/`, e a reversa devolve `/traducao/`. Migrações já aplicadas não são editadas. O endereço de verificação de estado (`url_verificacao`) continua apontando para a API do LibreTranslate.
- **Página no padrão do portal.** Mesmo cabeçalho, logo, navegação, botão de tema, bloco de mensagens e rodapé de `/mapas/`; usa o objeto global do portal (`Arca`) para tema e chamadas. Estado do par de idiomas guardado no `localStorage` do navegador, com tratamento para o caso de ele estar indisponível.
- **Estados da página.** Carregando idiomas, pronta, traduzindo, erro de serviço indisponível (respostas 502/503/504 do Caddy ou falha de rede), erro de texto vazio e erro genérico. Mensagens em português, anunciadas por região `role=status`.
- **Ajuda.** A seção de tradução da página de ajuda passa a descrever a nova página.
- **Documentação.** README (tabela de rotas e serviços), guia de uso e guia offline descrevem `/tradutor/` e a API em `/traducao/`.
- **Sem recursos externos e sem tocar em `data/`.** Nenhum arquivo de `data/` é editado. Quem já tem modelos `pt` precisa rodar de novo `make modelos-traducao` (com internet) para obter `pb`; os pacotes antigos de `pt` ficam sem uso e podem ser apagados pelo próprio usuário.

## Testing Decisions

- Um bom teste valida comportamento externo (respostas HTTP, dados no banco, páginas servidas), não detalhes de implementação como nomes de funções do JavaScript.
- **Portal (pytest contra MariaDB real).** Migração 005 aplicada: o serviço `traducao` tem `caminho` igual a `/tradutor/`; migração revertida: volta a `/traducao/`; a lista de serviços continua trazendo `traducao`. `GET /tradutor/` responde 200 e contém o título em português. Referência: os testes de migração e de serviços já existentes (`teste_migracoes.py`, `teste_servicos.py`).
- **Fumaça da stack.** Com o perfil `traducao` ativo: `/tradutor/` responde 200; `/traducao/languages` lista en, pb e es; `/traducao/` não serve mais a interface web do LibreTranslate. Referência: as verificações do perfil `traducao` já presentes no script de fumaça.
- **Convenção.** `make teste-convencao` passa; qualquer exceção nova em `scripts/convencao-excecoes.txt` vem com justificativa.
- **Manual.** A lógica do JavaScript é verificada manualmente na página (traduzir en→pb, pb→en, es→pb; serviço desligado; tema; celular). Não há teste automatizado de navegador nesta entrega.
- **Download offline.** Verificação manual guiada: após `make modelos-traducao`, subir o contêiner com `--network none` e traduzir (procedimento já registrado nos learnings de serviços extras).

## Out of Scope

- Tradução de arquivos, de páginas web ou de documentos inteiros.
- Outros idiomas além de en, pb e es.
- Tradução de voz ou reconhecimento de fala.
- Histórico de traduções salvo no banco ou favoritos de traduções.
- Treinar, ajustar ou trocar os modelos do Argos.
- Autenticação, chave de API ou limite de uso.
- Teste automatizado do JavaScript em navegador.
- Traduzir a interface ou o conteúdo de apps de terceiros.
- Apagar ou migrar automaticamente os modelos `pt` já baixados em `data/`.

## Further Notes

- O arquivo `Makefile` já contém, sem commit, a troca de `pt` para `pb` na lista única; a correção deste PRD separa as duas listas.
- Os modelos Argos de en↔pb e de pb↔en existem no índice do Argos (versão 1.9); não existem pares es↔pb.
- Este PRD continua o trabalho do PRD 001 (serviços extras) e respeita a regra de idioma do PRD 002.
