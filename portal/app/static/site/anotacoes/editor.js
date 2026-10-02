// Editor visual das notas (spec 023): área editável com barra de ferramentas, atalhos, menu "/"
// e atalhos de digitação. Sem bibliotecas e sem recursos externos. O texto é guardado como Markdown:
//   carregar(markdown)  mostra o Markdown já formatado (HTML sempre escapado pelo conversor);
//   obterMarkdown()     devolve o Markdown que o FlatNotes entende.
// O único ponto que usa document.execCommand é a função `comando`.
import { markdownParaHtml, htmlParaMarkdown, enderecoSeguro, escaparHtml } from './conversor.js';
import { descricaoDoArquivo } from './anexos.js';

const TAGS_TEXTO = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'PRE', 'TD', 'TH'];
const BLOCOS = new Set([...TAGS_TEXTO, 'UL', 'OL', 'BLOCKQUOTE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'HR']);
// Prefixo de endereço montado por partes: o teste de recursos externos procura o texto literal.
const ESQUEMA_PADRAO = 'https' + ':' + '//';
const SEM_SAIDA = new Set(['PRE', 'TABLE', 'HR']); // blocos que precisam de um parágrafo depois

export function normalizarBusca(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const ehElemento = (no) => Boolean(no) && no.nodeType === 1;
const ehEmLinha = (no) => no.nodeType === 3 || (no.nodeType === 1 && !BLOCOS.has(no.tagName));

// ---- Auxiliares de estrutura (sem seleção; testáveis separadamente) ----

export function criarCaixaDeTarefa(doc, feita) {
  const caixa = doc.createElement('input');
  caixa.setAttribute('type', 'checkbox');
  caixa.setAttribute('contenteditable', 'false');
  caixa.setAttribute('aria-label', 'Tarefa concluída');
  if (feita) { caixa.setAttribute('checked', ''); caixa.checked = true; }
  return caixa;
}

function caixaDoItem(li) {
  return Array.from(li.childNodes).find((f) => ehElemento(f) && f.tagName === 'INPUT') || null;
}

export function marcarTarefa(doc, li) {
  li.setAttribute('class', 'tarefa');
  if (!caixaDoItem(li)) li.insertBefore(criarCaixaDeTarefa(doc, false), li.firstChild);
  if (li.parentNode && ehElemento(li.parentNode)) li.parentNode.setAttribute('class', 'tarefas');
}

export function desmarcarTarefa(li) {
  li.removeAttribute('class');
  li.removeAttribute('data-feita');
  const caixa = caixaDoItem(li);
  if (caixa) li.removeChild(caixa);
}

// A propriedade `checked` é a fonte da verdade no editor vivo: espelha no atributo antes de converter.
export function sincronizarTarefas(raiz) {
  raiz.querySelectorAll('input').forEach((caixa) => {
    if (caixa.checked) caixa.setAttribute('checked', ''); else caixa.removeAttribute('checked');
    const li = caixa.parentNode;
    if (ehElemento(li) && li.tagName === 'LI') li.setAttribute('data-feita', caixa.checked ? '1' : '0');
  });
}

export function indentarItem(doc, li) {
  const anterior = li.previousElementSibling;
  if (!anterior || anterior.tagName !== 'LI') return false;
  const lista = li.parentNode;
  let sub = anterior.lastElementChild;
  if (!sub || sub.tagName !== lista.tagName) {
    sub = doc.createElement(lista.tagName.toLowerCase());
    anterior.appendChild(sub);
  }
  sub.appendChild(li);
  return true;
}

export function desindentarItem(doc, li) {
  const lista = li.parentNode;
  const pai = lista && lista.parentNode;
  if (!pai || !ehElemento(pai) || pai.tagName !== 'LI') return false;
  const seguintes = [];
  for (let n = li.nextElementSibling; n; n = n.nextElementSibling) seguintes.push(n);
  if (seguintes.length) {
    const sub = doc.createElement(lista.tagName.toLowerCase());
    seguintes.forEach((n) => sub.appendChild(n));
    li.appendChild(sub);
  }
  pai.parentNode.insertBefore(li, pai.nextSibling);
  if (!lista.firstElementChild) lista.parentNode.removeChild(lista);
  return true;
}

export function criarTabela(doc, colunas, linhas) {
  const tabela = doc.createElement('table');
  const cabeca = doc.createElement('thead');
  const corpo = doc.createElement('tbody');
  const celulas = (tr, tag) => {
    for (let i = 0; i < colunas; i++) { const c = doc.createElement(tag); c.appendChild(doc.createElement('br')); tr.appendChild(c); }
  };
  const tr0 = doc.createElement('tr'); celulas(tr0, 'th'); cabeca.appendChild(tr0);
  for (let j = 0; j < linhas; j++) { const tr = doc.createElement('tr'); celulas(tr, 'td'); corpo.appendChild(tr); }
  tabela.appendChild(cabeca); tabela.appendChild(corpo);
  return tabela;
}

// ---- Editor ----

export function criarEditor(opcoes) {
  const area = opcoes.area;
  const doc = area.ownerDocument;
  const janela = doc.defaultView;
  let ultimaSelecao = null;
  let carregando = false;
  let menu = null; // { elemento, itens, indice }
  const botoes = {};

  // Único ponto de uso de document.execCommand.
  function comando(nome, valor) {
    try {
      doc.execCommand('styleWithCSS', false, false);
      return doc.execCommand(nome, false, valor === undefined ? null : valor);
    } catch (e) { return false; }
  }

  function notificar() {
    if (carregando) return;
    atualizarBarra();
    if (opcoes.aoAlterar) opcoes.aoAlterar();
  }
  function avisar(texto) { if (opcoes.aoAviso) opcoes.aoAviso(texto); }

  // ---- Seleção ----
  const selecao = () => janela.getSelection();
  function noDaSelecao() {
    const s = selecao();
    return s && s.rangeCount ? s.anchorNode : null;
  }
  function selecaoNoEditor() {
    const s = selecao();
    return Boolean(s && s.rangeCount && area.contains(s.anchorNode) && area.contains(s.focusNode));
  }
  function ancestral(no, tags) {
    for (let n = no; n && n !== area; n = n.parentNode) {
      if (ehElemento(n) && tags.includes(n.tagName)) return n;
    }
    return null;
  }
  function posicionar(no, deslocamento) {
    const r = doc.createRange();
    r.setStart(no, deslocamento); r.collapse(true);
    const s = selecao(); s.removeAllRanges(); s.addRange(r);
    ultimaSelecao = r.cloneRange();
  }
  function posicionarNoFim(no) {
    const r = doc.createRange();
    r.selectNodeContents(no); r.collapse(false);
    const s = selecao(); s.removeAllRanges(); s.addRange(r);
    ultimaSelecao = r.cloneRange();
  }
  function preservarSelecao(fn) {
    const s = selecao();
    const salvo = s && s.rangeCount ? [s.anchorNode, s.anchorOffset, s.focusNode, s.focusOffset] : null;
    fn();
    if (salvo && area.contains(salvo[0]) && area.contains(salvo[2])) {
      try { s.setBaseAndExtent(salvo[0], salvo[1], salvo[2], salvo[3]); } catch (e) { /* deslocamento inválido: mantém o que o navegador deixou */ }
    }
  }
  function prepararSelecao() {
    if (doc.activeElement !== area) area.focus();
    if (selecaoNoEditor()) return;
    if (ultimaSelecao && area.contains(ultimaSelecao.startContainer)) {
      const s = selecao(); s.removeAllRanges(); s.addRange(ultimaSelecao);
    } else posicionarNoFim(area);
  }
  const topoDe = (no) => { let n = no; while (n && n.parentNode !== area) n = n.parentNode; return n; };

  // Parágrafo que envolve texto solto no topo da área.
  function envolverSolto(topo) {
    if (!topo || !ehEmLinha(topo)) return topo;
    let inicio = topo;
    while (inicio.previousSibling && ehEmLinha(inicio.previousSibling)) inicio = inicio.previousSibling;
    const grupo = [];
    for (let n = inicio; n && ehEmLinha(n); n = n.nextSibling) grupo.push(n);
    const p = doc.createElement('p');
    preservarSelecao(() => { area.insertBefore(p, inicio); grupo.forEach((n) => p.appendChild(n)); });
    return p;
  }

  // Bloco de texto onde está o cursor (parágrafo, título, item, código, célula).
  function blocoAtual() {
    let no = noDaSelecao();
    if (!no || !area.contains(no)) return null;
    if (no === area) {
      if (!area.firstChild) area.appendChild(novoParagrafo());
      const s = selecao();
      no = area.childNodes[s.anchorOffset] || area.lastChild;
    }
    const b = ancestral(no, TAGS_TEXTO);
    if (b) return b;
    const topo = topoDe(no);
    return ehEmLinha(topo) ? envolverSolto(topo) : topo;
  }
  function novoParagrafo() {
    const p = doc.createElement('p');
    p.appendChild(doc.createElement('br'));
    return p;
  }
  function esvaziarBloco(b) {
    while (b.firstChild) b.removeChild(b.firstChild);
    b.appendChild(doc.createElement('br'));
    posicionar(b, 0);
  }

  // ---- Normalização depois de cada alteração ----
  function normalizar() {
    if (!area.firstChild) {
      const p = novoParagrafo(); area.appendChild(p); posicionar(p, 0);
    }
    area.querySelectorAll('input').forEach((caixa) => {
      const li = caixa.parentNode;
      if (!ehElemento(li) || li.tagName !== 'LI') caixa.parentNode.removeChild(caixa);
    });
    area.querySelectorAll('li.tarefa').forEach((li) => {
      if (caixaDoItem(li)) return;
      const s = selecao();
      const caretNoItem = s && s.rangeCount && s.isCollapsed && s.anchorNode === li && s.anchorOffset === 0;
      li.insertBefore(criarCaixaDeTarefa(doc, false), li.firstChild);
      if (caretNoItem) posicionar(li, 1);
    });
    area.querySelectorAll('li').forEach((li) => {
      if (!li.classList.contains('tarefa') && caixaDoItem(li)) li.setAttribute('class', 'tarefa');
    });
    const ultimo = area.lastElementChild;
    if (ultimo && SEM_SAIDA.has(ultimo.tagName)) area.appendChild(novoParagrafo());
  }

  // ---- Formatação em linha ----
  const alternarNegrito = () => { prepararSelecao(); comando('bold'); notificar(); };
  const alternarItalico = () => { prepararSelecao(); comando('italic'); notificar(); };
  const alternarRiscado = () => { prepararSelecao(); comando('strikeThrough'); notificar(); };

  // ---- Blocos ----
  function alternarTitulo(nivel) {
    prepararSelecao();
    const atual = ancestral(noDaSelecao(), ['H' + nivel]);
    comando('formatBlock', atual ? '<p>' : '<h' + nivel + '>');
    notificar();
  }

  function alternarLista(tipo) {
    prepararSelecao();
    const li = ancestral(noDaSelecao(), ['LI']);
    if (li && li.classList.contains('tarefa') && tipo === 'UL') {
      itensDaSelecao().forEach((item) => desmarcarTarefa(item));
    } else {
      comando(tipo === 'UL' ? 'insertUnorderedList' : 'insertOrderedList');
    }
    normalizar();
    notificar();
  }

  function itensDaSelecao() {
    const s = selecao();
    if (!s || !s.rangeCount) return [];
    const r = s.getRangeAt(0);
    const itens = Array.from(area.querySelectorAll('li')).filter((li) => r.intersectsNode(li));
    return itens.filter((li) => !itens.some((o) => o !== li && li.contains(o)));
  }

  function alternarTarefas() {
    prepararSelecao();
    let itens = itensDaSelecao();
    if (!itens.length) { comando('insertUnorderedList'); itens = itensDaSelecao(); }
    if (!itens.length) return;
    const todas = itens.every((li) => li.classList.contains('tarefa'));
    itens.forEach((li) => { if (todas) desmarcarTarefa(li); else marcarTarefa(doc, li); });
    normalizar();
    notificar();
  }

  function alternarCitacao() {
    prepararSelecao();
    const no = noDaSelecao();
    const citacao = ancestral(no, ['BLOCKQUOTE']);
    preservarSelecao(() => {
      if (citacao) {
        if (!Array.from(citacao.children).some((c) => BLOCOS.has(c.tagName))) {
          const p = doc.createElement('p');
          while (citacao.firstChild) p.appendChild(citacao.firstChild);
          citacao.appendChild(p);
        }
        while (citacao.firstChild) citacao.parentNode.insertBefore(citacao.firstChild, citacao);
        citacao.parentNode.removeChild(citacao);
        return;
      }
      const b = blocoAtual();
      if (!b) return;
      const r = selecao().getRangeAt(0);
      const primeiro = topoDe(b);
      let ultimo = topoDe(r.endContainer) || primeiro;
      if (ultimo === area) ultimo = primeiro;
      const envoltorio = doc.createElement('blockquote');
      area.insertBefore(envoltorio, primeiro);
      for (let n = primeiro; n; ) {
        const proximo = n === ultimo ? null : n.nextSibling;
        envoltorio.appendChild(n);
        n = proximo;
      }
    });
    normalizar();
    notificar();
  }

  function alternarCodigo() {
    prepararSelecao();
    const s = selecao();
    const r = s.getRangeAt(0);
    const pre = ancestral(noDaSelecao(), ['PRE']);
    if (pre) {
      const linhas = pre.textContent.replace(/\n$/, '').split('\n');
      const fragmento = doc.createDocumentFragment();
      let primeiro = null;
      linhas.forEach((linha) => {
        const p = doc.createElement('p');
        if (linha) p.appendChild(doc.createTextNode(linha)); else p.appendChild(doc.createElement('br'));
        fragmento.appendChild(p);
        if (!primeiro) primeiro = p;
      });
      pre.parentNode.replaceChild(fragmento, pre);
      posicionarNoFim(primeiro);
      normalizar(); notificar();
      return;
    }
    const codigoLinha = ancestral(noDaSelecao(), ['CODE']);
    if (codigoLinha) {
      preservarSelecao(() => {
        while (codigoLinha.firstChild) codigoLinha.parentNode.insertBefore(codigoLinha.firstChild, codigoLinha);
        codigoLinha.parentNode.removeChild(codigoLinha);
      });
      notificar();
      return;
    }
    const b = blocoAtual();
    if (!b) return;
    const parcial = !r.collapsed && ancestral(r.startContainer, TAGS_TEXTO) === ancestral(r.endContainer, TAGS_TEXTO)
      && r.toString().trim() !== b.textContent.trim();
    if (parcial) {
      const codigo = doc.createElement('code');
      try {
        r.surroundContents(codigo);
        const novo = doc.createRange(); novo.selectNodeContents(codigo);
        s.removeAllRanges(); s.addRange(novo);
      } catch (e) { comando('insertHTML', '<code>' + escaparHtml(r.toString()) + '</code>'); }
      notificar();
      return;
    }
    if (b.tagName === 'LI' || b.tagName === 'TD' || b.tagName === 'TH') return;
    const bloco = doc.createElement('pre');
    const codigo = doc.createElement('code');
    const texto = b.textContent;
    if (texto) codigo.appendChild(doc.createTextNode(texto)); else codigo.appendChild(doc.createElement('br'));
    bloco.appendChild(codigo);
    b.parentNode.replaceChild(bloco, b);
    posicionarNoFim(codigo);
    normalizar(); notificar();
  }

  function inserirLink() {
    prepararSelecao();
    const s = selecao();
    const salvo = s.getRangeAt(0).cloneRange();
    const ancora = ancestral(noDaSelecao(), ['A']);
    const resposta = janela.prompt('Endereço do link (deixe vazio para remover o link):', ancora ? ancora.getAttribute('href') : ESQUEMA_PADRAO);
    s.removeAllRanges(); s.addRange(salvo);
    if (resposta === null) return;
    let endereco = resposta.trim();
    if (!endereco || endereco === ESQUEMA_PADRAO) {
      if (ancora) { comando('unlink'); notificar(); }
      return;
    }
    if (!enderecoSeguro(endereco) && /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(endereco)) endereco = ESQUEMA_PADRAO + endereco;
    if (!enderecoSeguro(endereco)) {
      avisar('Endereço inválido. Use um site (https), um endereço do próprio servidor (começa com /) ou uma âncora (#).');
      return;
    }
    if (ancora && salvo.collapsed) ancora.setAttribute('href', endereco);
    else if (salvo.collapsed) comando('insertHTML', '<a href="' + escaparHtml(endereco) + '">' + escaparHtml(endereco) + '</a>');
    else comando('createLink', endereco);
    notificar();
  }

  // Insere blocos depois do bloco atual (ou no lugar de um parágrafo vazio) e devolve o parágrafo final.
  function inserirBlocos(nos) {
    prepararSelecao();
    const b = blocoAtual();
    const topo = b ? topoDe(b) : area.lastChild;
    const vazio = topo && topo.tagName === 'P' && !topo.textContent.trim() && !topo.querySelector('img');
    const referencia = vazio ? topo : (topo ? topo.nextSibling : null);
    nos.forEach((n) => area.insertBefore(n, referencia));
    let depois = nos[nos.length - 1].nextSibling;
    if (!depois || depois.tagName !== 'P') { depois = novoParagrafo(); area.insertBefore(depois, nos[nos.length - 1].nextSibling); }
    return depois;
  }

  function inserirDivisor() {
    const depois = inserirBlocos([doc.createElement('hr')]);
    posicionar(depois, 0);
    normalizar(); notificar();
  }

  function inserirTabela() {
    const tabela = criarTabela(doc, 3, 2);
    inserirBlocos([tabela]);
    posicionar(tabela.querySelector('th'), 0);
    normalizar(); notificar();
  }

  // ---- Anexos ----
  // Insere uma imagem (exibida) ou um link com o nome do arquivo na posição do cursor.
  // anexo = { endereco, nomeDoArquivo, imagem }; o endereço vem da página, nunca do texto digitado.
  function inserirAnexo(anexo) {
    if (!anexo || !enderecoSeguro(anexo.endereco)) return false;
    prepararSelecao();
    const endereco = escaparHtml(anexo.endereco);
    const nome = escaparHtml(anexo.nomeDoArquivo);
    const html = anexo.imagem
      ? '<img src="' + endereco + '" alt="' + escaparHtml(descricaoDoArquivo(anexo.nomeDoArquivo)) + '">'
      : '<a href="' + endereco + '">' + nome + '</a>';
    comando('insertHTML', html + ' ');
    normalizar(); notificar();
    return true;
  }

  const entradaArquivo = doc.createElement('input');
  function pedirArquivo() {
    prepararSelecao();
    entradaArquivo.click();
  }

  // ---- Barra de ferramentas ----
  function estadoAtual() {
    const no = selecaoNoEditor() ? noDaSelecao() : null;
    const li = ancestral(no, ['LI']);
    const tarefa = Boolean(li && li.classList.contains('tarefa'));
    const lista = li ? li.parentNode.tagName : '';
    return {
      negrito: Boolean(ancestral(no, ['B', 'STRONG'])),
      italico: Boolean(ancestral(no, ['I', 'EM'])),
      riscado: Boolean(ancestral(no, ['S', 'STRIKE', 'DEL'])),
      t1: Boolean(ancestral(no, ['H1'])),
      t2: Boolean(ancestral(no, ['H2'])),
      t3: Boolean(ancestral(no, ['H3'])),
      lista: Boolean(li) && !tarefa && lista === 'UL',
      listanum: Boolean(li) && lista === 'OL',
      tarefa,
      citacao: Boolean(ancestral(no, ['BLOCKQUOTE'])),
      codigo: Boolean(ancestral(no, ['CODE', 'PRE'])),
      link: Boolean(ancestral(no, ['A'])),
    };
  }
  function atualizarBarra() {
    const estado = estadoAtual();
    Object.keys(botoes).forEach((id) => {
      if (id in estado) botoes[id].setAttribute('aria-pressed', estado[id] ? 'true' : 'false');
    });
  }

  const FERRAMENTAS = [
    { id: 'negrito', rotulo: 'Negrito (Ctrl+B)', icone: 'negrito', acao: alternarNegrito },
    { id: 'italico', rotulo: 'Itálico (Ctrl+I)', icone: 'italico', acao: alternarItalico },
    { id: 'riscado', rotulo: 'Riscado', icone: 'riscado', acao: alternarRiscado },
    null,
    { id: 't1', rotulo: 'Título grande', texto: 'T1', acao: () => alternarTitulo(1) },
    { id: 't2', rotulo: 'Título médio', texto: 'T2', acao: () => alternarTitulo(2) },
    { id: 't3', rotulo: 'Título pequeno', texto: 'T3', acao: () => alternarTitulo(3) },
    null,
    { id: 'lista', rotulo: 'Lista', icone: 'lista', acao: () => alternarLista('UL') },
    { id: 'listanum', rotulo: 'Lista numerada', icone: 'listanum', acao: () => alternarLista('OL') },
    { id: 'tarefa', rotulo: 'Lista de tarefas', icone: 'tarefa', acao: alternarTarefas },
    null,
    { id: 'citacao', rotulo: 'Citação', icone: 'citacao', acao: alternarCitacao },
    { id: 'codigo', rotulo: 'Código', icone: 'codigo', acao: alternarCodigo },
    { id: 'link', rotulo: 'Link (Ctrl+K)', icone: 'link', acao: inserirLink },
    { id: 'anexar', rotulo: 'Anexar arquivo ou imagem', icone: 'anexo', acao: pedirArquivo },
    { id: 'divisor', rotulo: 'Divisor', icone: 'divisor', acao: inserirDivisor },
    { id: 'tabela', rotulo: 'Tabela', icone: 'tabela', acao: inserirTabela },
  ];

  function montarBarra() {
    const barra = opcoes.barra;
    if (!barra) return;
    barra.setAttribute('role', 'toolbar');
    barra.setAttribute('aria-label', 'Formatação do texto');
    if (area.getAttribute('id')) barra.setAttribute('aria-controls', area.getAttribute('id'));
    const lista = [];
    FERRAMENTAS.forEach((f) => {
      if (!f) {
        const sep = doc.createElement('span');
        sep.setAttribute('class', 'separador'); sep.setAttribute('role', 'separator');
        barra.appendChild(sep);
        return;
      }
      const b = doc.createElement('button');
      b.setAttribute('type', 'button');
      b.setAttribute('class', 'botao pequeno ferramenta');
      b.setAttribute('aria-label', f.rotulo);
      b.setAttribute('title', f.rotulo);
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('tabindex', '-1');
      const arca = janela.Arca;
      if (f.icone && arca && arca.icone) b.appendChild(arca.icone(f.icone));
      else b.appendChild(doc.createTextNode(f.texto || f.rotulo));
      b.addEventListener('mousedown', (ev) => ev.preventDefault()); // não tira o foco do texto
      b.addEventListener('click', () => { f.acao(); if (doc.activeElement !== area) area.focus(); });
      barra.appendChild(b);
      botoes[f.id] = b;
      lista.push(b);
    });
    // um só botão na ordem de Tab; setas movem entre os botões
    if (lista[0]) lista[0].setAttribute('tabindex', '0');
    entradaArquivo.setAttribute('type', 'file');
    entradaArquivo.setAttribute('multiple', '');
    entradaArquivo.setAttribute('hidden', '');
    entradaArquivo.setAttribute('tabindex', '-1');
    entradaArquivo.setAttribute('aria-hidden', 'true');
    entradaArquivo.addEventListener('change', () => {
      const arquivos = Array.from(entradaArquivo.files || []);
      entradaArquivo.value = '';
      if (arquivos.length && opcoes.aoArquivos) opcoes.aoArquivos(arquivos);
    });
    barra.appendChild(entradaArquivo);
    barra.addEventListener('keydown', (ev) => {
      const k = ev.key;
      if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'Home' && k !== 'End') return;
      const i = lista.indexOf(doc.activeElement);
      if (i < 0) return;
      ev.preventDefault();
      const j = k === 'Home' ? 0 : k === 'End' ? lista.length - 1 : (i + (k === 'ArrowRight' ? 1 : -1) + lista.length) % lista.length;
      lista.forEach((b) => b.setAttribute('tabindex', '-1'));
      lista[j].setAttribute('tabindex', '0'); lista[j].focus();
    });
  }

  // ---- Menu "/" ----
  const ITENS_MENU = [
    { id: 't1', rotulo: 'Título 1', dica: '#', palavras: 'titulo grande cabecalho h1', acao: () => alternarTitulo(1) },
    { id: 't2', rotulo: 'Título 2', dica: '##', palavras: 'titulo medio cabecalho h2', acao: () => alternarTitulo(2) },
    { id: 't3', rotulo: 'Título 3', dica: '###', palavras: 'titulo pequeno cabecalho h3', acao: () => alternarTitulo(3) },
    { id: 'lista', rotulo: 'Lista', dica: '-', palavras: 'marcadores topicos', acao: () => alternarLista('UL') },
    { id: 'listanum', rotulo: 'Lista numerada', dica: '1.', palavras: 'numeros ordenada', acao: () => alternarLista('OL') },
    { id: 'tarefa', rotulo: 'Lista de tarefas', dica: '[]', palavras: 'tarefas caixas checklist afazeres', acao: alternarTarefas },
    { id: 'citacao', rotulo: 'Citação', dica: '>', palavras: 'citacao quote', acao: alternarCitacao },
    { id: 'codigo', rotulo: 'Bloco de código', dica: '', palavras: 'codigo programa', acao: alternarCodigo },
    { id: 'tabela', rotulo: 'Tabela', dica: '', palavras: 'grade colunas linhas', acao: inserirTabela },
    { id: 'divisor', rotulo: 'Divisor', dica: '', palavras: 'linha separador', acao: inserirDivisor },
  ];

  function menuAberto() { return menu !== null; }

  function fecharMenu() {
    if (!menu) return;
    if (menu.elemento.parentNode) menu.elemento.parentNode.removeChild(menu.elemento);
    area.removeAttribute('aria-activedescendant');
    area.removeAttribute('aria-controls');
    menu = null;
  }

  function marcarOpcao(indice) {
    if (!menu) return;
    menu.indice = (indice + menu.itens.length) % menu.itens.length;
    Array.from(menu.elemento.children).forEach((li, i) => {
      const ativo = i === menu.indice;
      li.setAttribute('aria-selected', ativo ? 'true' : 'false');
      if (ativo) {
        area.setAttribute('aria-activedescendant', li.getAttribute('id'));
        if (li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function posicionarMenu(elemento, retangulo) {
    const altura = elemento.offsetHeight || 240;
    const largura = elemento.offsetWidth || 240;
    const abaixo = retangulo.bottom + 4;
    const topo = abaixo + altura > janela.innerHeight && retangulo.top - altura - 4 > 0 ? retangulo.top - altura - 4 : abaixo;
    elemento.style.top = Math.max(4, topo) + 'px';
    elemento.style.left = Math.max(4, Math.min(retangulo.left, janela.innerWidth - largura - 4)) + 'px';
  }

  function mostrarMenu(itens, retangulo) {
    const indiceAnterior = menu && menu.itens.length === itens.length ? menu.indice : 0;
    fecharMenu();
    const ul = doc.createElement('ul');
    ul.setAttribute('role', 'listbox');
    ul.setAttribute('id', 'menu-comandos');
    ul.setAttribute('class', 'menu-comandos');
    ul.setAttribute('aria-label', 'Inserir bloco');
    itens.forEach((item) => {
      const li = doc.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('id', 'opcao-' + item.id);
      li.setAttribute('aria-selected', 'false');
      const rotulo = doc.createElement('span'); rotulo.textContent = item.rotulo; li.appendChild(rotulo);
      if (item.dica) { const d = doc.createElement('kbd'); d.textContent = item.dica; li.appendChild(d); }
      li.addEventListener('mousedown', (ev) => { ev.preventDefault(); escolherOpcao(item); });
      ul.appendChild(li);
    });
    doc.body.appendChild(ul);
    menu = { elemento: ul, itens, indice: 0 };
    area.setAttribute('aria-controls', 'menu-comandos');
    posicionarMenu(ul, retangulo);
    marcarOpcao(indiceAnterior);
  }

  function escolherOpcao(item) {
    const b = blocoAtual();
    fecharMenu();
    if (b && (b.tagName === 'P' || b.tagName === 'DIV')) esvaziarBloco(b);
    item.acao();
  }

  function retanguloDoCursor(r, b) {
    let ret = r.getBoundingClientRect ? r.getBoundingClientRect() : null;
    if (!ret || (!ret.width && !ret.height && !ret.top)) ret = b.getBoundingClientRect();
    return ret;
  }

  // Abre, filtra ou fecha o menu conforme o texto antes do cursor no bloco atual.
  function atualizarMenu(podeAbrir) {
    const s = selecao();
    const b = selecaoNoEditor() ? blocoAtual() : null;
    if (!b || (b.tagName !== 'P' && b.tagName !== 'DIV') || !s.isCollapsed) { fecharMenu(); return; }
    const r = s.getRangeAt(0);
    const antes = doc.createRange();
    antes.selectNodeContents(b);
    antes.setEnd(r.endContainer, r.endOffset);
    const m = antes.toString().replace(/ /g, ' ').match(/^\/(\S*)$/);
    if (!m || (!menu && !podeAbrir)) { fecharMenu(); return; }
    const filtro = normalizarBusca(m[1]);
    const itens = ITENS_MENU.filter((i) => normalizarBusca(i.rotulo + ' ' + i.palavras).includes(filtro));
    if (!itens.length) { fecharMenu(); return; }
    mostrarMenu(itens, retanguloDoCursor(r, b));
  }

  // ---- Atalhos de digitação: "# ", "- ", "1. ", "[] ", "> " no começo da linha ----
  function atalhoDeDigitacao() {
    const b = blocoAtual();
    if (!b || (b.tagName !== 'P' && b.tagName !== 'DIV')) return false;
    const m = b.textContent.replace(/ /g, ' ').match(/^(#{1,3}|-|\*|\d+\.|\[ ?\]|>) $/);
    if (!m) return false;
    const marca = m[1];
    esvaziarBloco(b);
    if (marca[0] === '#') alternarTitulo(marca.length);
    else if (marca === '-' || marca === '*') alternarLista('UL');
    else if (marca === '>') alternarCitacao();
    else if (marca[0] === '[') alternarTarefas();
    else alternarLista('OL');
    return true;
  }

  // ---- Teclado ----
  function aoTeclar(ev) {
    if (menu) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); marcarOpcao(menu.indice + 1); return; }
      if (ev.key === 'ArrowUp') { ev.preventDefault(); marcarOpcao(menu.indice - 1); return; }
      if (ev.key === 'Enter') { ev.preventDefault(); escolherOpcao(menu.itens[menu.indice]); return; }
      if (ev.key === 'Escape') { ev.preventDefault(); fecharMenu(); return; }
      if (ev.key === 'Tab') fecharMenu();
    }
    const atalho = (ev.ctrlKey || ev.metaKey) && !ev.altKey;
    if (atalho) {
      const k = ev.key.toLowerCase();
      if (k === 'b') { ev.preventDefault(); alternarNegrito(); return; }
      if (k === 'i') { ev.preventDefault(); alternarItalico(); return; }
      if (k === 'k') { ev.preventDefault(); inserirLink(); return; }
      if (k === 's') { ev.preventDefault(); if (opcoes.aoSalvar) opcoes.aoSalvar(); return; }
      return;
    }
    if (ev.key === 'Tab') aoTabular(ev);
    else if (ev.key === 'Enter' && !ev.shiftKey && ancestral(noDaSelecao(), ['PRE'])) {
      ev.preventDefault();
      comando('insertLineBreak');
      notificar();
    }
  }

  function aoTabular(ev) {
    const no = noDaSelecao();
    const li = ancestral(no, ['LI']);
    if (li) {
      let feito = false;
      preservarSelecao(() => { feito = ev.shiftKey ? desindentarItem(doc, li) : indentarItem(doc, li); });
      if (feito) { ev.preventDefault(); notificar(); }
      return;
    }
    const celula = ancestral(no, ['TD', 'TH']);
    if (!celula) return;
    const celulas = Array.from(celula.closest('table').querySelectorAll('th,td'));
    const i = celulas.indexOf(celula);
    if (ev.shiftKey) {
      if (i > 0) { ev.preventDefault(); posicionarNoFim(celulas[i - 1]); }
      return;
    }
    ev.preventDefault();
    if (i < celulas.length - 1) { posicionarNoFim(celulas[i + 1]); return; }
    const linha = celula.parentNode;
    const nova = doc.createElement('tr');
    Array.from(linha.children).forEach(() => { const c = doc.createElement('td'); c.appendChild(doc.createElement('br')); nova.appendChild(c); });
    const corpo = linha.parentNode.tagName === 'THEAD' ? (linha.parentNode.nextElementSibling || linha.parentNode.parentNode.appendChild(doc.createElement('tbody'))) : linha.parentNode;
    corpo.appendChild(nova);
    posicionar(nova.firstChild, 0);
    notificar();
  }

  function aoDigitar(ev) {
    let transformou = false;
    if (ev.inputType === 'insertText' && ev.data === ' ') transformou = atalhoDeDigitacao();
    normalizar();
    if (!transformou) atualizarMenu(ev.inputType === 'insertText' && ev.data === '/');
    notificar();
  }

  function aoColar(ev) {
    ev.preventDefault();
    const dados = ev.clipboardData;
    const texto = dados ? dados.getData('text/plain') : '';
    if (texto) { comando('insertText', texto.replace(/\r\n?/g, '\n')); return; }
    // sem texto, mas com arquivos (ex.: captura de tela): vira anexo
    const arquivos = dados ? Array.from(dados.files || []) : [];
    if (arquivos.length && opcoes.aoArquivos) { prepararSelecao(); opcoes.aoArquivos(arquivos); }
  }

  const temArquivos = (ev) => Boolean(ev.dataTransfer && Array.from(ev.dataTransfer.types || []).includes('Files'));
  function aoSoltar(ev) {
    ev.preventDefault();
    area.classList.remove('soltando');
    const arquivos = ev.dataTransfer ? Array.from(ev.dataTransfer.files || []) : [];
    if (!arquivos.length || !opcoes.aoArquivos) return;
    // o anexo entra onde o arquivo foi solto, quando o navegador informa o ponto
    const ponto = doc.caretRangeFromPoint ? doc.caretRangeFromPoint(ev.clientX, ev.clientY) : null;
    if (ponto && area.contains(ponto.startContainer)) { const s = selecao(); s.removeAllRanges(); s.addRange(ponto); }
    prepararSelecao();
    opcoes.aoArquivos(arquivos);
  }

  function aoMudarSelecao() {
    if (!selecaoNoEditor()) return;
    const s = selecao();
    ultimaSelecao = s.getRangeAt(0).cloneRange();
    atualizarBarra();
    if (menu) atualizarMenu(false);
  }

  // ---- API pública ----
  function carregar(markdown) {
    carregando = true;
    fecharMenu();
    area.innerHTML = markdownParaHtml(markdown || '');
    area.querySelectorAll('input').forEach((caixa) => {
      caixa.setAttribute('contenteditable', 'false');
      caixa.setAttribute('aria-label', 'Tarefa concluída');
      caixa.removeAttribute('disabled');
    });
    if (!area.firstChild) area.appendChild(novoParagrafo());
    const ultimo = area.lastElementChild;
    if (ultimo && SEM_SAIDA.has(ultimo.tagName)) area.appendChild(novoParagrafo());
    ultimaSelecao = null;
    carregando = false;
    atualizarBarra();
  }

  function obterMarkdown() {
    sincronizarTarefas(area);
    return htmlParaMarkdown(area);
  }

  function focar() {
    area.focus();
    const primeiro = area.firstElementChild;
    if (primeiro) posicionarNoFim(primeiro.tagName === 'TABLE' || primeiro.tagName === 'HR' ? area : primeiro);
  }

  function habilitar(sim) {
    area.setAttribute('contenteditable', sim ? 'true' : 'false');
    Object.keys(botoes).forEach((id) => { if (sim) botoes[id].removeAttribute('disabled'); else botoes[id].setAttribute('disabled', ''); });
  }

  area.setAttribute('contenteditable', 'true');
  area.setAttribute('role', 'textbox');
  area.setAttribute('aria-multiline', 'true');
  area.setAttribute('aria-label', 'Texto da nota');
  area.setAttribute('spellcheck', 'true');
  comando('defaultParagraphSeparator', 'p');
  montarBarra();
  area.addEventListener('keydown', aoTeclar);
  area.addEventListener('input', aoDigitar);
  area.addEventListener('paste', aoColar);
  area.addEventListener('drop', aoSoltar); // texto arrastado é bloqueado; só arquivos viram anexo
  area.addEventListener('dragover', (ev) => { if (temArquivos(ev)) { ev.preventDefault(); area.classList.add('soltando'); } });
  area.addEventListener('dragleave', () => area.classList.remove('soltando'));
  area.addEventListener('change', (ev) => {
    const alvo = ev.target;
    if (ehElemento(alvo) && alvo.tagName === 'INPUT') { sincronizarTarefas(area); notificar(); }
  });
  area.addEventListener('blur', () => { setTimeout(() => { if (menu && doc.activeElement !== area) fecharMenu(); }, 0); });
  doc.addEventListener('selectionchange', aoMudarSelecao);
  janela.addEventListener('resize', fecharMenu);

  return { carregar, obterMarkdown, focar, habilitar, fecharMenu, menuAberto, notificar, inserirAnexo };
}
