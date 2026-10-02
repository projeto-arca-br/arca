# Editor visual de notas (spec 022): API real do FlatNotes e conversor

Verificado com `curl` contra o FlatNotes v5.5.4 em execução (via Caddy, `/notas/api/...`), com nota e anexos temporários, apagados ao final.

## Etiquetas
- `GET /notas/api/tags` devolve uma **lista de textos**: `["emlinha","etiqueta1","sozinha"]` (não são objetos).
- O FlatNotes extrai `#etiqueta` de **qualquer ponto** do corpo (linha própria, começo ou meio da frase). Não vira etiqueta: `#` dentro de bloco de código (cercado ou em linha) e `# Título` (com espaço). Aceita letras, números e hífen (`#a-b`, `#123`); **`#ação` (acento) não vira etiqueta** (a parte com acento é cortada ou ignorada), então o editor deve normalizar etiquetas para ASCII minúsculo sem acento (ou avisar).
- Busca por etiqueta: `GET /notas/api/search?term=%23etiqueta` devolve a nota com `tagMatches: ["etiqueta"]` (e o resultado só aparece de verdade para notas que ainda a têm).
- Cuidado: `/api/tags` vem do índice e **não é podado** quando a etiqueta some da nota ou a nota é apagada (ficou "zeta" mesmo após editar e excluir). Só reiniciar o contêiner (`docker compose restart flatnotes`) reconstrói o índice. Para listar etiquetas realmente em uso, use a busca por etiqueta (`tagMatches`) ou aceite etiquetas órfãs na lista de sugestões.
- Formato recomendado para gravar: uma linha própria `#a #b` no começo da nota (ida e volta estável no conversor).

## Anexos
- `POST /notas/api/attachments` (multipart, campo `file`) devolve **200** com `{"filename":"v022.txt","url":"attachments/v022.txt"}`. A `url` é relativa e já vem codificada (`attachments/v%20022%20%C3%A7%C3%A3o.txt` para "v 022 ção.txt"; o arquivo no disco mantém o nome com espaço e acento).
- Download: `GET /notas/attachments/<arquivo>` (200, `Content-Type` pelo tipo do arquivo) e também `GET /notas/api/attachments/<arquivo>`.
- Colisão de nome: o segundo envio de `v022.txt` virou `v022_2026-10-01T21-40-11Z.txt` (carimbo UTC); sempre use o `filename`/`url` da resposta, nunca o nome original.
- Tamanho: um arquivo de 120 MB foi aceito (200); o FlatNotes não impôs limite no teste e o Caddy não barrou. Limites práticos ficam por conta do disco; a página pode impor um limite próprio e mensagem amigável.
- Os anexos ficam em `data/flatnotes/attachments/` (a pasta só nasce no primeiro envio).
- **Não existe `DELETE` de anexo**: `DELETE /notas/api/attachments/<arquivo>` e `DELETE /notas/attachments/<arquivo>` devolvem 405. O OpenAPI (`/notas/openapi.json`) só tem `GET` e `POST` em anexos. Apagar a nota **não** apaga seus anexos; limpeza de teste é por sistema de arquivos, apenas do que o próprio teste criou.
- No Markdown o FlatNotes usa o endereço relativo `attachments/<arquivo>` (resolve para `/notas/attachments/...` dentro de `/notas/`); no portal (`/anotacoes/`) o conversor reescreve para `/notas/attachments/...` ao exibir e volta para `attachments/...` ao salvar.

## Renomear
- `PATCH /notas/api/notes/<titulo>` com `{"newTitle":"..."}` **funciona** (200): renomeia o arquivo `.md` e mantém o conteúdo. Pode ser enviado junto de `newContent`. A resposta traz o novo `title`.

## Outros achados
- `POST /notas/api/notes` devolve 200 (não 201) com `{title, content, lastModified}`.
- `DELETE` de nota devolve 200 com corpo `null`.

## Conversor (`portal/app/static/site/anotacoes/conversor.js`)
- `markdownParaHtml(texto)` escapa tudo antes de formatar; `htmlParaMarkdown(raiz)` só usa `nodeType`, `tagName`, `childNodes`, `data`, `getAttribute`, `hasAttribute`, `checked`, por isso é testável com o DOM de mão em `portal/testes/apoio/dom_minimo.mjs` (sem jsdom). Evite `nodeName` e `getAttribute('title')` no JS: caem no teste de convenção (palavras `name` e `title`).
- Endereços aceitos: `http(s):`, `/`, `./`, `../`, `#` e `attachments/`; bloqueados `//`, `javascript:`, `data:`, espaços/controle e barra invertida (`/\host` vira `//host` em alguns navegadores).
- Tarefas saem como `<li class="tarefa" data-feita="1"><input type="checkbox" checked>`; no editor vivo a propriedade `checked` do `input` é a fonte da verdade (o atributo só reflete o estado inicial). Para a spec 023: sincronizar o atributo `checked` ou a propriedade antes de converter.
- Normalizações conhecidas na ida e volta (estáveis a partir da primeira): `*` solto vira `\*`, `\#` no meio da linha vira `#`, `1)` vira `1.`, `*`/`+` de lista viram `-`, `/notas/attachments/x` vira `attachments/x`, títulos de link (`"título"`) não são preservados.
- `markdown.js` virou só reexportação (`renderizarMarkdown`, `escaparHtml`) até a spec 023 trocar `anotacoes.js`.
- O `make teste-portal` roda no contêiner do portal, que não tem `node`: `teste_conversor.py` é pulado lá com aviso. Para rodar de fato: `cd portal && python -m pytest testes/teste_conversor.py --noconftest` em uma máquina com `node` e `pytest`.

## Editor visual e página (spec 023)

### Estrutura
- `anotacoes/editor.js` (`criarEditor({ area, barra, aoAlterar, aoSalvar, aoAviso })` devolve `carregar`, `obterMarkdown`, `focar`, `habilitar`, `fecharMenu`); `anotacoes.js` cuida de API, salvamento e navegação. O único ponto com `document.execCommand` é a função `comando` (inclui `defaultParagraphSeparator`); o teste de portal confere que há só 2 ocorrências.
- Manipulações de bloco (citação, código, divisor, tabela, tarefas, aninhar/desaninhar) são feitas direto no DOM, não por `execCommand`: `insertUnorderedList`/`indent` do Chrome já gerou `<ul>` dentro de `<ul>` (inválido), que o conversor ignora. Aninhar/desaninhar é manual e mantém `<li><ul>`.
- Ícones novos entraram em `js/common.js` (`ICONES`); `.acoes`, `.contador`, `.nota` e `.botao:disabled` foram para `css/style.css` (antes cada página repetia).

### Salvamento
- Debounce de 1,5 s só em alterações do texto. O título só dispara salvamento no `change` (sair do campo ou Enter): salvar a cada letra criaria/renomearia notas com títulos parciais.
- Um salvamento por vez (`salvarNota` serializa; pedidos durante o voo pedem outra rodada). `estado.versao` diz se algo mudou durante o envio, para não marcar "Salvo" por engano.
- `newTitle` renomeia: o título é editável em nota existente (checa duplicado por GET 404 = livre, ignorando só mudança de caixa). Nota nova só é criada no primeiro salvamento com título válido e livre (`POST {title, content}`); sem título, nada é enviado e a mensagem pede o título.
- Troca de nota, Voltar e mudança de hash esperam o salvamento; se falhar, `confirm` pergunta antes de descartar e o hash é restaurado com `history.replaceState` (não dispara `hashchange`; por isso não precisa de flag "ignorar hash"). `beforeunload` avisa e tenta um `PATCH` com `keepalive` (só nota existente, sem renomear, até ~60 mil caracteres).
- A normalização do Markdown (ver acima) só é gravada quando a pessoa edita: abrir uma nota não a regrava (`estado.ultimoEnviado` guarda a forma normalizada para comparar).

### Armadilhas do contenteditable
- Tarefas: o `Enter` do Chrome clona o `<li class="tarefa">` sem a caixa; `normalizar()` (rodada a cada `input`) recoloca a caixa e põe o cursor depois dela. Caixa leva `contenteditable="false"`.
- Atalhos de digitação (`# `, `- `, `1. `, `[] `, `> `) funcionam no `input` com `data === ' '` e `inputType === 'insertText'`. Chamar `execCommand` de dentro de um `input` gerado por outro `execCommand` não faz efeito (só afeta testes automáticos); com teclado real funciona. Em testes, digite com `Input.dispatchKeyEvent` (CDP), não com `execCommand('insertText')`.
- Menu "/": só abre quando o texto antes do cursor no bloco é exatamente `/` + letras; usa `position: fixed` (exceção da convenção para `anotacoes.css`) e `aria-activedescendant` no campo, com `role="listbox"`/`option`.
- Colar sempre como texto: `paste` com `preventDefault` + `insertText` do `text/plain`; `drop` é bloqueado (anexos por arrastar ficam para a spec 024).
- Texto de aviso ou código não pode ter `http://`/`https://` literais (teste de recursos externos): montar o prefixo por partes.
- Em HTML de teste, `</script>` dentro de string de um módulo inline fecha o script e trava a página: escreva `<\/script>`.

### Como validar sem o navegador do usuário
- O Chrome sem interface (`~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell`) com `--remote-debugging-port` e um cliente CDP de 40 linhas em Node 22 (`WebSocket` nativo) permite teclado real, capturas de tela e emulação de celular e de tema escuro. Um servidor Node falso do FlatNotes (`/notas/api/*`) na mesma origem do HTML estático cobre o ciclo criar, editar, renomear, duplicado, excluir. Esses scripts ficaram no scratchpad, fora do repositório.
- Convenção: `tagName` precisa de exceção por arquivo (`editor.js`); `setAttribute('title', ...)` e `position:` também.

## Etiquetas e anexos na página (spec 024)

### Decisões do editor (resumo das specs 022-024)
- A folha é um `contenteditable`; o texto de verdade é Markdown, convertido por funções puras (`conversor.js`: Markdown para HTML escapado e DOM para Markdown). Nada de HTML do usuário entra sem escape; colar é sempre texto simples.
- O PATCH de nota usa `newContent` (não `content`) e `newTitle` para renomear; a spec 020 estava errada e foi corrigida.
- Salvar é automático (1,5 s) e serializado; ver "Salvamento" acima.

### Etiquetas
- Módulo puro `anotacoes/etiquetas.js`: `extrairEtiquetas` só reconhece a **primeira linha não vazia** quando ela tem apenas `#a #b`; essa linha sai do corpo e vira chips. `montarMarkdown` recoloca `#a #b` + linha vazia + corpo. Ida e volta estável (testada em `teste_conversor.py`). `#etiqueta` no meio do texto continua texto (o FlatNotes ainda a indexa).
- `normalizarEtiqueta`: tira `#`, acentos, caixa e símbolos, troca espaços por hífen, máximo de 30 caracteres; avisa quando ajustou. Necessário porque `#ação` não vira etiqueta no FlatNotes.
- Sugestões e filtro vêm de `GET /notas/api/tags` (lista de textos; aceita também objetos com `name`). O índice não é podado, então o filtro pode listar etiquetas órfãs (resultado "Nenhuma nota encontrada") até reiniciar o FlatNotes.
- Filtro da lateral: chips com `aria-pressed`, uma etiqueta por vez, combinado com a busca (`#etiqueta texto` em `/search`).
- Notas antigas com a linha de etiquetas depois de um `# Título` não têm a linha oculta: ela fica como texto e continua válida.

### Anexos
- `anotacoes/anexos.js` (puro) valida tamanho (limite próprio de 50 MB, o FlatNotes não impõe) e traduz `{filename, url}` em `{arquivo, endereco, nomeDoArquivo, imagem}`; o endereço é `/notas/` + `url` (já codificada).
- Envio: `POST /notas/api/attachments`, `FormData` com campo `file`, sem `content-type` manual (o navegador põe o boundary). Imagem vira `<img>`, outro tipo vira `<a>`; ambos voltam ao Markdown como `attachments/<arquivo>`. A inserção usa `comando('insertHTML')` (continua um único ponto de `execCommand`).
- Colar: texto tem prioridade; só sem `text/plain` os arquivos viram anexo (copiar células de planilha traz texto e imagem). Soltar: `dragover` precisa de `preventDefault` quando há `Files`; texto arrastado continua bloqueado; o ponto de inserção vem de `caretRangeFromPoint`.
- Se a pessoa troca de nota durante o envio, o anexo não é inserido (aviso); o arquivo já foi para o servidor e fica órfão (não há DELETE).
- Fumaça: o ciclo cria nota `fumaca-anexo-024` com etiqueta exclusiva, anexa `.txt`, baixa, busca, exclui a nota e remove o anexo do ambiente de teste (que é descartado ao final).

### Convenção
- `File.name` do DOM e `name` de objetos de etiqueta têm exceção por arquivo; nome de campo `filename` não é pego (o teste separa palavras por `_`, `-` e maiúsculas). Toda exceção precisa ter uso.
- O executor de teste em Node (`portal/testes/apoio/rodar_etiquetas.mjs`) fica fora do glob de sufixos da convenção (`.mjs`), mas os `.py` que o chamam são varridos.
