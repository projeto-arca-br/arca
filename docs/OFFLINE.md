# Arca offline: preparar, instalar sem internet, backup e hardware

O ciclo é: uma máquina **com internet** baixa e empacota tudo; a máquina alvo **sem internet**
só precisa de Docker, `make`, `tar` e `sha256sum` e recebe o pacote por pendrive.

## 1. Preparar o pacote (máquina com internet)

Pré-requisito: o projeto `arca/` e o Docker funcionando.

```bash
make ambiente                                   # .env (troque as senhas)
make baixar-dados PERFIL=mini               # ou PERFIL=completo
make modelos-traducao                      # se for usar o perfil traducao (~700 MB)
# Opcional: liste o que será baixado sem baixar: make baixar-dados ARGUMENTOS='--simular'
```

O que o `baixar-dados` baixa:

| Perfil | Wikipédia pt | Mapa | Kolibri |
|---|---|---|---|
| `mini` (padrão) | `wikipedia_pt_all_mini` (~1,7 GB) | Belo Horizonte, zoom até 14 (~5 MB) | canal Ciênsação |
| `completo` | `wikipedia_pt_all_nopic` (vários GB; `ARCA_ZIM_VARIANTE` muda) | Minas Gerais, zoom até 12 | mais canais (Khan Academy pt-BR, Sikana, PhET) |

Personalização por variável: `ARCA_ZIM_URL`, `ARCA_MAPA_AREA` (`minlon,minlat,maxlon,maxlat`), `ARCA_MAPA_ZOOM_MAXIMO`,
`ARCA_CANAIS_KOLIBRI`. `--somente zim,mapas,modelos,kolibri` baixa só uma parte. Os downloads de ZIM são
retomáveis (`.part`) e conferidos por SHA-256. Observação: os downloads completos (perfil
`completo`) não foram exercitados de ponta a ponta durante o desenvolvimento, apenas o modo
`--simular` e execuções reais pequenas; o mini foi o caminho usado.

Para **mídia, livros e quadrinhos**, copie seus arquivos para `data/media/movies`,
`data/media/music`, `data/books`, `data/comics` (o Arca não fornece esse conteúdo).

Suba e confira uma vez (`make subir`, abra o painel), depois gere o pacote:

```bash
make empacotar DESTINO=/media/pendrive/arca-pacote                       # todos os perfis
make empacotar DESTINO=/media/pendrive/arca-pacote ARGUMENTOS='--perfis nenhum' # só o núcleo (menor)
```

O diretório de destino recebe:

| Arquivo | Conteúdo |
|---|---|
| `imagens.tar` | `docker save` de todas as imagens (inclui o portal já construído) |
| `projeto.tar` | compose, Caddyfile, portal, scripts, Makefile, `.env.example` (sem `data/`, `.env`, `.claude`) |
| `dados.tar` | conteúdo: zim, maps, models, kolibri, books, comics, media |
| `manifesto.txt`, `SOMAS_SHA256` | inventário e checksums |
| `carregar.sh`, `lib.sh` | o instalador (roda direto do pendrive) |

O `dados.tar` **não** inclui dados de usuário (MariaDB, notas, estado do Kavita/Jellyfin): esses vão no
backup (seção 3). O tamanho do pacote completo de exemplo foi de ~4,6 GB; verifique se o pendrive
comporta (prefira exFAT/ext4; FAT32 limita arquivos a 4 GB).

## 2. Instalar sem internet (máquina alvo)

Requisitos na máquina alvo: Linux x86_64, Docker Engine + Compose v2 já instalados (instale antes,
ou leve os pacotes `.deb`/`.rpm` no pendrive: o Arca não instala o Docker), `make`, `tar`, `sha256sum`.

```bash
cd /media/pendrive/arca-pacote
./carregar.sh . --destino /opt/arca       # equivale a: make carregar ORIGEM=. ARGUMENTOS='--destino /opt/arca'
```

O `carregar.sh` faz, sem acessar a internet: confere `SOMAS_SHA256` -> `docker load` -> extrai o projeto e os dados
(sem sobrescrever arquivos existentes) -> cria o `.env` se faltar (`make ambiente`: detecta o IP da LAN) ->
verifica as imagens -> `make subir` com `--no-build --pull never` -> espera a stack responder.

Depois:

1. Edite `/opt/arca/.env`: troque as senhas do MariaDB **antes do primeiro start real** (a senha é gravada no banco na primeira
   inicialização), confira `ARCA_ENDERECO` e `ARCA_PORTA` e defina `COMPOSE_PROFILES` (as imagens dos perfis só existem
   se o pacote foi feito com eles). Se mudou algo, rode `make subir OPCOES_SUBIR='--no-build --pull never'`.
2. Abra `http://<IP>:<porta>/` de outro dispositivo da LAN.
3. Para restaurar dados de uso (notas, favoritos), veja a seção 3.

Detalhe importante: depois de `docker save`/`docker load` as imagens perdem o digest (ficam só com a tag).
O `carregar.sh` ajusta os `ARCA_IMAGEM_*` do `.env` da máquina alvo para a referência só com a tag quando o digest
não existe; por isso o `.env` do alvo pode diferir do original nessas linhas. `ARCA_IMAGEM_PYTHON` é só base
de build e não precisa existir na máquina alvo.

Se o `carregar.sh` disser "faltam imagens", o pacote foi feito com `--perfis` que não cobre o
`COMPOSE_PROFILES` do `.env`: refaça o pacote ou desative o perfil.

## 3. Backup e restauração

```bash
make backup                          # ./backups/arca-backup-AAAAMMDD-HHMMSS.tar.gz (permissão 600)
make backup DIRETORIO_BACKUP=/mnt/disco    # outro destino
```

O backup precisa do MariaDB **rodando** (usa `mariadb-dump`) e contém: `mariadb.sql`, `notas.tar`,
estado do Kolibri/Kavita/Jellyfin (sem conteúdo nem caches), `configuracao.tar` (inclui o `.env`, com senhas:
guarde em local seguro), manifesto e `SOMAS_SHA256`. **Não** inclui o conteúdo pesado (ZIM, mapas, modelos, livros,
mídia): ele vem do pacote/`data/`.

Restauração (em projeto novo/vazio é o cenário limpo; em projeto existente sobrescreve):

```bash
make restaurar CONFIRMAR=1                  # usa o backup mais recente em ./backups; sobe o MariaDB sozinho
make subir                               # se a stack não estava rodando, suba-a depois
make restaurar CONFIRMAR=1 ARQUIVO=backups/arca-backup-20260930-120000.tar.gz
scripts/restaurar.sh --confirmar --com-config ARQUIVO.tar.gz   # também restaura .env/compose/Caddyfile
```

A restauração para os serviços que estavam rodando (exceto o MariaDB), restaura e os religa. Sem `CONFIRMAR=1` ele se recusa a rodar. Segurança do processo: confere o SHA-256, grava um dump do banco
atual em `backups/pre-restauracao-*.sql` e **move** (não apaga) as notas atuais para `data/flatnotes.pre-restauracao-<data>`.
Com `--com-config`, os arquivos originais ficam como `*.pre-restauracao-*`. Limitação: os bancos SQLite do Kolibri e do
Kavita são copiados com o serviço ligado; para máxima consistência, rode o backup com esses serviços parados
(`docker compose stop kolibri kavita`, mas mantenha o MariaDB ligado).

Rotina sugerida: `make backup` periódico (cron) copiando o arquivo para outro disco/pendrive.

## 4. Como o Arca garante funcionar offline (e o que o teste cobre)

- Frontend e mapas sem CDN: MapLibre, pmtiles, fontes, ícones e sprites estão vendorizados no portal;
  a API do Swagger também é local.
- Imagens Docker fixadas por versão+digest; o portal é construído com wheels locais (`portal/wheels`), sem `pip` online.
- LibreTranslate com `LT_UPDATE_MODELS=false` e modelos em `data/models/argos`.
- O `make teste-fumaca` (scripts/fumaca.sh) verifica: só o Caddy publica porta; nenhum serviço na rede do host; nenhuma URL externa
  nas configs e no frontend próprio; as páginas `/`, `/ajuda/` e `/mapas/` e seus CSS/JS só referenciam recursos locais que
  resolvem; e roda a stack inteira do núcleo com a rede `internal: true` (sem rota de saída nem DNS externo), confirmando que
  os serviços ficam saudáveis e que portal, FlatNotes e Kiwix não conseguem abrir conexão externa.
- **Não coberto**: o tráfego do Caddy e do MariaDB não é inspecionado (o Caddy precisa de rede comum para publicar a porta;
  ele não inicia conexões externas pela configuração, o que o teste só verifica lendo o Caddyfile); os perfis opcionais
  (`traducao`, `cursos`, `midia`) não sobem na fumaça (RAM e imagens grandes): o teste cobre só o redirecionamento e a página
  503 deles; links externos dentro de conteúdo de terceiros (artigos do Kiwix, canais Kolibri) não são varridos; o
  comportamento do navegador do cliente (ex.: verificação de conectividade) está fora do Arca.

## Hardware e RAM por perfil

Alvo: x86_64, 8 GB de RAM ou mais. Cada serviço tem `mem_limit` no compose; a tabela mostra o limite e,
quando medido, o uso em repouso (sem carga).

| Perfil | Serviços (limite de memória) | Soma dos limites | Em repouso (medido) |
|---|---|---|---|
| núcleo (sempre) | MariaDB 384 MB, FlatNotes 256 MB, Kiwix 256 MB, portal 128 MB, Caddy 64 MB | ~1,1 GB | não medido aqui |
| `traducao` | LibreTranslate 1 GB | +1 GB | ~400 MB |
| `cursos` | Kolibri 768 MB | +0,75 GB | ~150 MB |
| `midia` | Kavita 512 MB + Jellyfin 1 GB (2 CPUs, só software) | +1,5 GB | ~330 MB + ~150 MB |
| todos | | ~4,4 GB | |

Recomendações práticas (estimativas a partir dos limites, não benchmarks):

- 8 GB: todos os perfis cabem com folga no papel; o gargalo real é CPU na transcodificação do Jellyfin e o cache de página para ZIMs grandes.
- 4 GB: núcleo + um perfil leve (`cursos`); evite `traducao` + `midia` juntos.
- Disco: SSD melhora muito o Kiwix e o Jellyfin com ZIM grande. Conte ~1,7 GB (Wikipédia mini) a dezenas de GB (nopic/maxi) só para ZIMs.
- Se um serviço atingir o limite de memória ele é reiniciado sozinho (`restart: unless-stopped`) sem derrubar os outros.
- Mantenha o servidor ligado à energia; os serviços voltam sozinhos após queda (`restart: unless-stopped`; o Docker precisa iniciar com o sistema: `sudo systemctl enable docker`).
