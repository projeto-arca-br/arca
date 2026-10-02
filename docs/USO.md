# Uso de cada serviço e problemas conhecidos

Guia de uso do que o Arca publica. Visão geral, instalação e comandos: [README da raiz](../README.md).
Preparação e instalação sem internet: [OFFLINE.md](OFFLINE.md).

## Nome local `arca.local`

O nome fácil sugerido é `http://arca.local/`. O Arca **não** faz descoberta de nome sozinho
(mDNS/DNS estão fora do escopo do MVP); você precisa configurar uma das opções:

- **Roteador/DNS da rede**: crie um registro `arca.local` (ou `arca.lan`) apontando para o IP do servidor. É a opção mais robusta.
- **mDNS (Avahi) no servidor Linux**: com `avahi-daemon` instalado, dar ao servidor o hostname `arca`
  (`sudo hostnamectl set-hostname arca`) o anuncia como `arca.local` nas máquinas com suporte a mDNS.
  Nem todo Android resolve `.local`. (Não verificado neste projeto.)
- **Arquivo hosts** em cada cliente: `192.168.1.10  arca.local`.
- Sempre funciona: usar o IP (`http://192.168.1.10/`). Reserve o IP no roteador para ele não mudar.

Como o Caddy só publica o IP de `ARCA_ENDERECO`, troque-o se o IP do servidor mudar (`.env`, depois `make subir`).

## Serviços

### Painel (`/`)
Cartões de cada ferramenta com status (`online`, `offline`, `desativado`), atualizado a cada 15 s.
Também tem favoritos (links para páginas da wiki, notas, locais), inventário do conteúdo
instalado (ZIMs, mapas, modelos, com tamanho e data) e tema claro/escuro. Tudo funciona sem internet.
A página `/ajuda/` explica cada ferramenta offline.

### Notas (`/anotacoes/`)
Página do portal com editor visual: escreva e formate como em um editor de texto comum, sem
precisar saber markdown. Por trás está o FlatNotes (sem login), que continua em `/notas/`
(link "Abrir no FlatNotes"). As notas são arquivos `.md` em `data/flatnotes` e entram no backup.

- **Escrever**: a barra de ferramentas tem negrito, itálico, riscado, títulos, listas, tarefas,
  citação, código, link, anexo, divisor e tabela. Digite `/` em uma linha vazia para abrir o menu de
  blocos. Atalhos: `Ctrl+B`, `Ctrl+I`, `Ctrl+K` (link) e `Ctrl+S` (salvar agora); também funcionam
  `# `, `- `, `1. `, `[] ` e `> ` no começo da linha. Colar insere só o texto, sem formatação.
- **Salvar**: automático, 1,5 s depois da última alteração; o canto da folha mostra "Salvando…",
  "Salvo" ou "Erro ao salvar". Ao trocar de nota ou sair, o Arca espera o salvamento terminar.
  A nota nova só é criada depois que tem título. Mudar o título renomeia a nota.
- **Etiquetas**: digite o nome sob o título e tecle `Enter` ou vírgula; o "×" remove. As etiquetas
  ficam sem acentos, em minúsculas e sem espaços (`#ação` não funcionaria no FlatNotes). No
  arquivo viram uma linha `#a #b` no começo da nota (escondida na folha, visível em `/notas/`).
  Na lateral, toque em uma etiqueta para filtrar a lista; ela combina com a busca. A lista de
  etiquetas pode manter nomes antigos até o FlatNotes reiniciar (`docker compose restart flatnotes`).
- **Anexos**: o botão de clipe, arrastar arquivos para a folha ou colar uma captura de tela enviam o
  arquivo ao servidor. Imagens aparecem na nota; outros tipos viram um link com o nome do arquivo
  (limite de 50 MB por arquivo nesta página). Anexos ficam em `data/flatnotes/attachments` e **não
  são apagados** quando a nota é excluída.
- **Excluir**: botão "Excluir" (pede confirmação).

### Wikipédia (`/wikipedia/`)
Página do portal com busca (sugestões ao digitar e lista de resultados paginada), leitura do
artigo na própria página e botão de artigo aleatório; funciona com todos os ZIMs instalados.
Por trás está o Kiwix, que serve todos os `.zim` de `data/zim` e continua em `/wiki/`
(link "Abrir em tela cheia"). **Ao adicionar um ZIM novo, reinicie o Kiwix:**
`docker compose restart kiwix`. Os artigos podem ter links externos (citações); eles não
carregam nada sozinhos, mas só abrem se o dispositivo tiver internet.

### Mapas (`/mapas/`)
Mapa com tiles, fontes e ícones locais. Os tiles ficam em `data/maps/*.pmtiles` e são servidos
pelo Caddy em `/mapas/data/<arquivo>` com suporte a range requests (HTTP 206, sem compressão).
Novos `.pmtiles` aparecem ao recarregar a página (lista vinda de `/api/biblioteca`).
Limitações: a **busca por nome só encontra o que já está carregado na tela** (PMTiles não tem
índice de busca), e cada arquivo cobre só a região extraída (o `baixar-dados` mini baixa Belo
Horizonte até zoom 14; o completo, Minas Gerais até zoom 12; ajustável com `ARCA_MAPA_AREA`, `ARCA_MAPA_ZOOM_MAXIMO`).

### Tradução (`/tradutor/`, API em `/traducao/`, perfil `traducao`)
Abra o cartão "Tradução" do painel (página `/tradutor/`, do próprio portal). Escolha o idioma de origem e o de destino
entre português (Brasil), inglês e espanhol, digite ou cole o texto e clique em traduzir. O texto fica só na sua rede.
A tradução em si é feita pelo LibreTranslate (perfil `traducao`); sem o perfil ligado a página abre, mas avisa que o
serviço está indisponível. Sem `make modelos-traducao` executado antes (com internet), ele não traduz; com os modelos
presentes nunca baixa nada. A interface web do LibreTranslate está desligada: `/traducao/` é só a API
(`/traducao/languages` e `/traducao/translate`; o português do Brasil usa o código `pb`).

### Cursos (`/cursos/`, perfil `cursos`)
Kolibri. No primeiro acesso aparece o assistente de configuração: crie o "facility" e o
administrador. Canais vêm de `make baixar-dados ARGUMENTOS='--somente kolibri'` (usa o Kolibri Studio, precisa de internet).

### Livros e quadrinhos (`/livros/`, perfil `midia`)
Kavita. Coloque arquivos em `data/books` e `data/comics`; no primeiro acesso crie o administrador
e adicione as bibliotecas apontando para `/books` e `/comics` (caminhos dentro do container).
O prefixo `/livros/` vem do arquivo `data/kavita/appsettings.json` (`"BaseUrl": "/livros/"`), copiado
por `make subir` a partir de `kavita/appsettings.json` se ainda não existir. Se já existia um
`appsettings.json` sem BaseUrl, a interface quebra sob `/livros/`: ajuste-o.

### Filmes e música (`/midia/`, perfil `midia`)
Jellyfin. Coloque arquivos em `data/media/movies` e `data/media/music`; no assistente do primeiro
acesso crie o usuário e adicione as bibliotecas em `/media/movies` e `/media/music`. O prefixo
`/midia` vem de `data/jellyfin/config/network.xml` (semente em `jellyfin/network.xml`). Transcodificação
só por software e limitada a 2 CPUs: prefira mídia em formatos que o navegador toca direto.

Dica de URL: as rotas `/traducao`, `/cursos`, `/livros` e `/midia` sem a barra final redirecionam
(308) para a versão com barra; favoritos devem usar a barra final.

## API do portal

`/api/docs` (Swagger local). Endpoints: `GET /api/saude`, `GET /api/servicos`,
CRUD em `/api/favoritos`, `GET /api/biblioteca`. Migrações SQL ficam em `portal/migrations/` e são
aplicadas na inicialização do portal.

## Problemas conhecidos e fallback por subdomínio

- Todos os serviços tratam o prefixo de caminho por conta própria (o Caddy não reescreve caminhos).
  Se um app numa versão futura deixar de suportar base URL, o fallback é servi-lo num subdomínio local,
  por exemplo (**exemplo não testado**, exige o nome resolver para o servidor):

  ```caddyfile
  http://livros.arca.local {
  	reverse_proxy kavita:5000
  }
  ```

  Nesse caso remova o `BaseUrl` do app e o bloco `handle /livros*`.
- Kolibri serve conteúdo HTML5 por uma origem separada (porta 8081 "zipcontent"); esse caminho
  não foi verificado atrás do Caddy, então alguns exercícios/apps HTML5 do Kolibri podem não abrir.
- Sem porta 80 livre (outro servidor web no host), use `ARCA_PORTA=8088` (ou outra) no `.env`.
- O navegador e o sistema dos clientes podem tentar acessar a internet por conta própria
  (verificação de conectividade, atualizações); isso não vem do Arca.

