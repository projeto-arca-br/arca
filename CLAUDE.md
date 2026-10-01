# Arca

O Arca é uma pilha offline-first e auto-hospedada, pensada para funcionar sem internet no Brasil (cenário de crise ou "mundo pós-apocalíptico").
Um proxy Caddy publica na rede local um portal FastAPI (MariaDB) e serviços opcionais (Kiwix, FlatNotes, Kavita, Jellyfin, Kolibri, LibreTranslate), orquestrados por Docker Compose.
O público-alvo são brasileiros sem inglês técnico; por isso o projeto inteiro é em português.

Ponteiros: visão geral e arquitetura em `README.md`; operação offline em `docs/OFFLINE.md`; publicação em `docs/RELEASE.md`; índice em `docs/README.md`.

## Regra de idioma (inegociável)

Tudo em **português do Brasil**: texto com acentos; **identificadores em ASCII, sem acento**.
A regra vale explicitamente para identificadores (variáveis, funções, classes, arquivos, pastas), e não apenas para textos.

Cobre: código, rotas da API, campos JSON, tabelas e colunas SQL, scripts, alvos do Makefile, variáveis `ARCA_*`, comentários, logs, mensagens de erro, interface (UI), testes, documentação, commits, PRs, specs e learnings.

Exemplos certos e errados:

| Errado | Certo |
|---|---|
| `/api/bookmarks` | `/api/favoritos` |
| `created_at` | `criado_em` |
| `def get_services()` | `def listar_servicos()` |
| `make up` | `make subir` |
| `# fetch the health status` | `# busca o estado de saúde` |
| `def data_criação()` (acento em identificador) | `def data_criacao()`; "criação" com acento só em texto |
| `git commit -m "add bookmark route"` | `git commit -m "adiciona rota de favoritos"` |

## Exceções (nomes impostos por terceiros)

Não renomeie:
- palavras-chave de linguagens e SQL (`def`, `class`, `SELECT`, `CREATE TABLE`...);
- chaves do Docker Compose (`services`, `volumes`, `depends_on`...);
- métodos e cabeçalhos HTTP (`GET`, `POST`, `Content-Type`...);
- API do FastAPI/Pydantic (`APIRouter`, `BaseModel`, `Depends`...);
- variáveis de imagens de terceiros (`MARIADB_*`, `FLATNOTES_*`, `LT_*`, `KOLIBRI_*` etc.);
- nomes-padrão de arquivo (`README.md`, `CLAUDE.md`, `Makefile`, `Dockerfile`, `pyproject.toml`).

Termos técnicos sem tradução estabelecida podem aparecer em texto corrido, mas nomes próprios do projeto seguem em português.
Conteúdo e interfaces de apps de terceiros não são traduzidos.

## Glossário (inglês → português)

| Inglês | Português |
|---|---|
| bookmark | favorito |
| service | servico |
| library | biblioteca |
| health | saude |
| check | verificar |
| content_items | itens_conteudo |
| health_log | registro_saude |
| settings | configuracoes |
| created_at | criado_em |
| updated_at | atualizado_em |
| modified_at | modificado_em |
| size_bytes | tamanho_bytes |
| latency_ms | latencia_ms |
| title | titulo |
| category | categoria |
| slug | identificador |
| profile | perfil |
| position | posicao |
| kind | tipo |
| name | nome |
| description | descricao |
| path | caminho |

## Comandos `make`

- `make subir` / `make derrubar` / `make estado` / `make logs`: sobe, derruba, lista e acompanha a stack.
- `make baixar-dados`: baixa os dados offline (precisa de internet, uma vez).
- `make empacotar` / `make carregar`: gera o pacote para pendrive e instala a partir dele.
- `make backup` / `make restaurar`: backup e restauração dos dados.
- `make modelos-traducao`: baixa os modelos do LibreTranslate.
- `make teste`: roda tudo; `make teste-convencao`, `make teste-portal`, `make teste-operacao` e `make teste-fumaca` rodam cada parte.
- `make teste-convencao`: procura termos do glossário em inglês e valida links; exceções em `scripts/convencao-excecoes.txt` (cada uma com justificativa).

Os alvos antigos em inglês (`up`, `down`, `ps`, `fetch-data`, `bundle`, `load`, `restore`, `test*`) deixam de existir, sem alias.

## Convenções

- Testes: pytest do portal contra MariaDB real (`teste-portal`), scripts ponta a ponta (`teste-operacao`) e fumaça da stack (`teste-fumaca`). Testes validam comportamento externo, não detalhes de implementação.
- Não toque em `data/` (dados reais: MariaDB, notas, mídia); nunca edite, apague nem versione seu conteúdo.
- Migrações de banco já aplicadas não são editadas; mudanças entram em nova migração com reversa.
- Segurança: a rede é **sem autenticação** e destinada só à LAN; nunca exponha o servidor à internet.
- Sem recursos externos: nada de CDN, fontes ou imagens carregados da internet.

## Estrutura de pastas

- `portal/`: API FastAPI, frontend, migrações e testes.
- `caddy/`: Caddyfile do proxy.
- `jellyfin/`, `kavita/`: sementes de configuração.
- `scripts/`: scripts de operação (baixar, empacotar, carregar, backup, restaurar, fumaça).
- `docs/`: índice, guia offline e de publicação.
- `data/`: dados em execução (não tocar).
- `.claude/prd/`, `.claude/specs/`: PRDs e specs.
- `.claude/learnings/`: aprendizados.

## Aprendizados

Registre aprendizados e decisões em `.claude/learnings/{assunto}.md`, em português, um arquivo por tema. **Nunca** os escreva neste `CLAUDE.md`, que contém apenas instruções.
