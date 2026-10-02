// Conversores puros das notas (sem bibliotecas, sem acesso à rede):
//   markdownParaHtml(texto)  Markdown -> HTML seguro (todo HTML do texto é escapado);
//   htmlParaMarkdown(raiz)   DOM do editor -> Markdown que o FlatNotes entende.
// htmlParaMarkdown só usa: nodeType, tagName, childNodes, data, getAttribute, hasAttribute e checked.

const PREFIXO_ANEXOS = 'attachments/';
const PREFIXO_ANEXOS_PORTAL = '/notas/attachments/';
const ESCAPAVEIS = '\\`*_{}[]()#+-.!~>|<&';

export function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---- Endereços ----

// Só http(s), caminhos do próprio servidor, âncoras e anexos. Bloqueia javascript:, data:, // e barra invertida.
const ENDERECO_WEB = /^https?:/i;
export function enderecoSeguro(endereco) {
  const e = String(endereco).trim();
  if (!e || /[\u0000-\u001f\s\\]/.test(e)) return false;
  if (ENDERECO_WEB.test(e)) return true;
  if (e.startsWith('//')) return false;
  return /^(\/|\.\/|\.\.\/|#)/.test(e) || e.startsWith(PREFIXO_ANEXOS);
}

// Dentro do portal, o prefixo de anexos relativo do FlatNotes aponta para /notas/attachments/.
function enderecoParaPagina(endereco) {
  return endereco.startsWith(PREFIXO_ANEXOS) ? '/notas/' + endereco : endereco;
}
function enderecoParaMarkdown(endereco) {
  return endereco.startsWith(PREFIXO_ANEXOS_PORTAL) ? endereco.slice('/notas/'.length) : endereco;
}

// ---- Markdown -> HTML ----

const PADRAO_ENDERECO = '([^()\\s]*(?:\\([^()\\s]*\\)[^()\\s]*)*)';
const RE_IMAGEM = new RegExp('!\\[([^\\]]*)\\]\\(\\s*' + PADRAO_ENDERECO + '\\s*\\)', 'g');
const RE_LINK = new RegExp('\\[((?:[^\\[\\]]|\\[[^\\]]*\\])*)\\]\\(\\s*' + PADRAO_ENDERECO + '\\s*\\)', 'g');
const PALAVRA = '[\\p{L}\\p{N}]';

function aplicarEnfase(texto) {
  let t = escaparHtml(texto);
  t = t.replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<strong>$1</strong>');
  t = t.replace(new RegExp('(^|[^\\p{L}\\p{N}_])__(?=\\S)(.+?)(?<=\\S)__(?!' + PALAVRA + ')', 'gu'), '$1<strong>$2</strong>');
  t = t.replace(/~~(?=\S)(.+?)(?<=\S)~~/g, '<del>$1</del>');
  t = t.replace(/\*(?=\S)([^*]+?)(?<=\S)\*/g, '<em>$1</em>');
  t = t.replace(new RegExp('(^|[^\\p{L}\\p{N}_])_(?=\\S)([^_]+?)(?<=\\S)_(?!' + PALAVRA + ')', 'gu'), '$1<em>$2</em>');
  return t;
}

function tagLink(texto, endereco) {
  const bruto = endereco.trim();
  if (!enderecoSeguro(bruto)) return aplicarEnfase(texto);
  const externo = ENDERECO_WEB.test(bruto);
  const extra = externo ? ' target="_blank" rel="noopener noreferrer"' : '';
  const origem = enderecoParaPagina(bruto) !== bruto ? ' data-origem="' + escaparHtml(bruto) + '"' : '';
  return '<a href="' + escaparHtml(enderecoParaPagina(bruto)) + '"' + origem + extra + '>' + aplicarEnfase(texto) + '</a>';
}

function tagImagem(alternativo, endereco) {
  const bruto = endereco.trim();
  if (!enderecoSeguro(bruto)) return escaparHtml(alternativo);
  const origem = enderecoParaPagina(bruto) !== bruto ? ' data-origem="' + escaparHtml(bruto) + '"' : '';
  return '<img src="' + escaparHtml(enderecoParaPagina(bruto)) + '" alt="' + escaparHtml(alternativo) + '"' + origem + '>';
}

export function formatarEmLinha(linha) {
  const guardados = [];
  const guardar = (html) => { guardados.push(html); return '\u0000' + (guardados.length - 1) + '\u0000'; };
  let t = String(linha).replace(/\u0000/g, '');
  t = t.replace(/\\([\\`*_{}[\]()#+\-.!~>|<&])/g, (_, c) => guardar(escaparHtml(c)));
  t = t.replace(/(`+)(.+?)\1(?!`)/g, (_, _cerca, c) => guardar('<code>' + escaparHtml(/^ .*[^ ].* $/.test(c) ? c.slice(1, -1) : c) + '</code>'));
  t = t.replace(RE_IMAGEM, (_, alternativo, endereco) => guardar(tagImagem(alternativo, endereco)));
  t = t.replace(RE_LINK, (_, texto, endereco) => guardar(tagLink(texto, endereco)));
  t = aplicarEnfase(t);
  let anterior;
  do {
    anterior = t;
    t = t.replace(/\u0000(\d+)\u0000/g, (_, i) => guardados[Number(i)]);
  } while (t !== anterior && t.includes('\u0000'));
  return t;
}

const RE_CERCA = /^\s*(`{3,}|~{3,})\s*([^\s`]*)/;
const RE_TITULO = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const RE_DIVISOR = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const RE_CITACAO = /^ {0,3}>\s?(.*)$/;
const RE_ITEM = /^(\s*)([-*+]|\d+[.)])(?:\s+(.*))?$/;
const RE_SEPARADOR_TABELA = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function dividirCelulas(linha) {
  let t = linha.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1);
  const celulas = [];
  let atual = '';
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '\\' && t[i + 1] === '|') { atual += '|'; i++; } else if (t[i] === '|') { celulas.push(atual.trim()); atual = ''; } else atual += t[i];
  }
  celulas.push(atual.trim());
  return celulas;
}

function ehInicioDeTabela(linhas, i) {
  return linhas[i].includes('|') && i + 1 < linhas.length && linhas[i + 1].includes('|') && RE_SEPARADOR_TABELA.test(linhas[i + 1]);
}

function ehInicioDeBloco(linhas, i) {
  const linha = linhas[i];
  return RE_CERCA.test(linha) || RE_TITULO.test(linha) || RE_DIVISOR.test(linha) || RE_CITACAO.test(linha)
    || RE_ITEM.test(linha) || ehInicioDeTabela(linhas, i);
}

function htmlTabela(linhas, i) {
  const cabecalho = dividirCelulas(linhas[i]);
  const alinhamentos = dividirCelulas(linhas[i + 1]).map((s) => {
    const e = s.startsWith(':'); const d = s.endsWith(':');
    return e && d ? 'center' : d ? 'right' : e ? 'left' : '';
  });
  const celula = (tag, texto, k) => '<' + tag + (alinhamentos[k] ? ' align="' + alinhamentos[k] + '"' : '') + '>' + formatarEmLinha(texto) + '</' + tag + '>';
  let html = '<table><thead><tr>' + cabecalho.map((c, k) => celula('th', c, k)).join('') + '</tr></thead>';
  let j = i + 2;
  const corpo = [];
  while (j < linhas.length && linhas[j].trim() && linhas[j].includes('|')) {
    const cs = dividirCelulas(linhas[j]);
    corpo.push('<tr>' + cabecalho.map((_, k) => celula('td', cs[k] || '', k)).join('') + '</tr>');
    j++;
  }
  html += (corpo.length ? '<tbody>' + corpo.join('') + '</tbody>' : '') + '</table>';
  return { html, proximo: j };
}

function montarLista(itens, inicio) {
  const nivel = itens[inicio].indentacao;
  const tipo = itens[inicio].tipo;
  let html = '';
  let i = inicio;
  let temTarefa = false;
  while (i < itens.length && itens[i].indentacao >= nivel) {
    const item = itens[i];
    if (item.indentacao === nivel && item.tipo !== tipo) break;
    i++;
    let filhos = '';
    while (i < itens.length && itens[i].indentacao > nivel) {
      const r = montarLista(itens, i);
      filhos += r.html;
      i = r.posicao;
    }
    const tarefa = item.texto.match(/^\[([ xX])\]\s+([\s\S]*)$/);
    const corpo = formatarEmLinha(tarefa ? tarefa[2] : item.texto).replace(/\n/g, '<br>');
    if (tarefa) {
      temTarefa = true;
      const feita = tarefa[1] !== ' ';
      html += '<li class="tarefa" data-feita="' + (feita ? '1' : '0') + '"><input type="checkbox"' + (feita ? ' checked' : '') + '> ' + corpo + filhos + '</li>';
    } else {
      html += '<li>' + corpo + filhos + '</li>';
    }
  }
  const marca = temTarefa ? ' class="tarefas"' : '';
  return { html: '<' + tipo + marca + '>' + html + '</' + tipo + '>', posicao: i };
}

function converterBlocos(linhas) {
  const saida = [];
  let paragrafo = [];
  const fecharParagrafo = () => {
    if (paragrafo.length) { saida.push('<p>' + paragrafo.map(formatarEmLinha).join('<br>') + '</p>'); paragrafo = []; }
  };
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    let m = linha.match(RE_CERCA);
    if (m) {
      fecharParagrafo();
      const cerca = m[1];
      const bloco = [];
      i++;
      while (i < linhas.length && !(new RegExp('^\\s*' + cerca[0] + '{' + cerca.length + ',}\\s*$')).test(linhas[i])) { bloco.push(linhas[i]); i++; }
      const idioma = m[2].replace(/[^\w+#.-]/g, '');
      saida.push('<pre><code' + (idioma ? ' class="linguagem-' + idioma + '"' : '') + '>' + escaparHtml(bloco.join('\n')) + '</code></pre>');
      continue;
    }
    if (!linha.trim()) { fecharParagrafo(); continue; }
    m = linha.match(RE_TITULO);
    if (m) { fecharParagrafo(); saida.push('<h' + m[1].length + '>' + formatarEmLinha(m[2]) + '</h' + m[1].length + '>'); continue; }
    if (RE_DIVISOR.test(linha)) { fecharParagrafo(); saida.push('<hr>'); continue; }
    if (RE_CITACAO.test(linha)) {
      fecharParagrafo();
      const interno = [];
      while (i < linhas.length && RE_CITACAO.test(linhas[i])) { interno.push(linhas[i].match(RE_CITACAO)[1]); i++; }
      i--;
      saida.push('<blockquote>' + converterBlocos(interno) + '</blockquote>');
      continue;
    }
    if (ehInicioDeTabela(linhas, i)) {
      fecharParagrafo();
      const r = htmlTabela(linhas, i);
      saida.push(r.html);
      i = r.proximo - 1;
      continue;
    }
    if (RE_ITEM.test(linha)) {
      fecharParagrafo();
      const itens = [];
      while (i < linhas.length) {
        const atual = linhas[i];
        const it = !RE_DIVISOR.test(atual) && atual.match(RE_ITEM);
        if (it) {
          itens.push({ indentacao: it[1].length, tipo: /^\d/.test(it[2]) ? 'ol' : 'ul', texto: it[3] || '' });
          i++;
        } else if (!atual.trim()) {
          // uma linha em branco só continua a lista se o próximo conteúdo for outro item
          let j = i + 1;
          while (j < linhas.length && !linhas[j].trim()) j++;
          if (j < linhas.length && !RE_DIVISOR.test(linhas[j]) && RE_ITEM.test(linhas[j])) i = j; else break;
        } else if (/^\s+\S/.test(atual) && !ehInicioDeBloco(linhas, i)) {
          itens[itens.length - 1].texto += '\n' + atual.trim();
          i++;
        } else break;
      }
      i--;
      let pos = 0;
      while (pos < itens.length) { const r = montarLista(itens, pos); saida.push(r.html); pos = r.posicao; }
      continue;
    }
    paragrafo.push(linha.trim());
    if (i + 1 < linhas.length && ehInicioDeBloco(linhas, i + 1)) fecharParagrafo();
  }
  fecharParagrafo();
  return saida.join('');
}

export function markdownParaHtml(texto) {
  const linhas = String(texto || '').replace(/\r\n?/g, '\n').split('\n')
    .map((l) => l.replace(/^[ \t]+/, (e) => e.replace(/\t/g, '    ')));
  return converterBlocos(linhas);
}

// ---- DOM do editor -> Markdown ----

const TAGS_EM_LINHA = new Set(['B', 'STRONG', 'I', 'EM', 'S', 'STRIKE', 'DEL', 'CODE', 'A', 'IMG', 'BR', 'SPAN', 'U', 'MARK', 'SUB', 'SUP', 'FONT', 'INPUT', 'LABEL', 'SMALL', 'ABBR']);
const TAGS_BLOCO = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'TABLE', 'HR', 'LI', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER', 'FIGURE']);

const ehTexto = (no) => no.nodeType === 3;
const ehElemento = (no) => no.nodeType === 1;
const etiqueta = (no) => String(no.tagName || '').toUpperCase();
const atributo = (no, chave) => (no.getAttribute ? no.getAttribute(chave) : null);

function escaparTexto(texto) {
  let t = texto.replace(/[\u00a0\u200b]/g, (c) => (c === '\u00a0' ? ' ' : ''));
  t = t.replace(/\\(?=[\\`*_{}[\]()#+\-.!~>|<&]|$)/g, '\\\\');
  t = t.replace(/[*`[]/g, '\\$&');
  t = t.replace(/~(?=~)|(?<=~)~/g, '\\~');
  t = t.replace(/(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/gu, '\\_');
  t = t.replace(/<(?=[A-Za-z/!?])/g, '\\<');
  t = t.replace(/&(?=#?\w+;)/g, '\\&');
  return t;
}

// Evita que o começo de uma linha de texto vire título, lista, citação, cerca ou divisor.
function protegerInicioDeLinha(linha) {
  if (RE_DIVISOR.test(linha)) return linha.replace(/^(\s*)/, '$1\\');
  if (/^\s*(#{1,6}\s|[-+*]\s|[-+*]$|>|```|~~~)/.test(linha)) return linha.replace(/^(\s*)/, '$1\\');
  return linha.replace(/^(\s*\d+)([.)])(\s|$)/, '$1\\$2$3');
}

function textoBruto(no) {
  if (ehTexto(no)) return no.data;
  if (etiqueta(no) === 'BR') return '\n';
  return Array.from(no.childNodes || []).map(textoBruto).join('');
}

function envolver(marca, miolo) {
  if (!miolo.trim()) return miolo;
  const inicio = miolo.match(/^\s*/)[0];
  const fim = miolo.match(/\s*$/)[0];
  const nucleo = miolo.slice(inicio.length, miolo.length - fim.length);
  return inicio + nucleo.split('\n').map((p) => (p.trim() ? marca + p.trim() + marca : p)).join('\n') + fim;
}

function codigoEmLinha(no) {
  const t = textoBruto(no).replace(/\n/g, ' ');
  if (!t) return '';
  const maior = Math.max(0, ...(t.match(/`+/g) || []).map((s) => s.length));
  const cerca = '`'.repeat(maior + 1);
  return maior ? cerca + ' ' + t + ' ' + cerca : cerca + t + cerca;
}

function enderecoDoNo(no, chave) {
  const origem = atributo(no, 'data-origem');
  const bruto = origem || enderecoParaMarkdown((atributo(no, chave) || '').trim());
  return enderecoSeguro(bruto) ? bruto.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29') : '';
}

function emitirNo(no) {
  if (ehTexto(no)) return escaparTexto(no.data.replace(/[ \t\r\n]+/g, ' '));
  if (!ehElemento(no)) return '';
  const tag = etiqueta(no);
  const filhos = () => emitirFilhos(no);
  switch (tag) {
    case 'BR': return '\n';
    case 'B': case 'STRONG': return envolver('**', filhos());
    case 'I': case 'EM': return envolver('*', filhos());
    case 'S': case 'STRIKE': case 'DEL': return envolver('~~', filhos());
    case 'CODE': return codigoEmLinha(no);
    case 'A': {
      const interno = filhos();
      const endereco = enderecoDoNo(no, 'href');
      return endereco ? '[' + interno.replace(/\]/g, '\\]') + '](' + endereco + ')' : interno;
    }
    case 'IMG': {
      const endereco = enderecoDoNo(no, 'src');
      const alternativo = (atributo(no, 'alt') || '').replace(/[\]\n]/g, ' ');
      return endereco ? '![' + alternativo + '](' + endereco + ')' : alternativo;
    }
    case 'INPUT': return '';
    default: return filhos();
  }
}

function emitirFilhos(no) {
  return Array.from(no.childNodes || []).map((f) => emitirNo(f)).join('');
}

function limparLinhas(texto) {
  return texto.split('\n').map((l) => l.replace(/^[ \t]+|[ \t]+$/g, '')).join('\n').replace(/^\n+|\n+$/g, '');
}

function paragrafoDe(nos) {
  const texto = limparLinhas(nos.map((n) => emitirNo(n)).join(''));
  return texto.split('\n').map(protegerInicioDeLinha).join('\n');
}

const temFilhoBloco = (no) => Array.from(no.childNodes || []).some((f) => ehElemento(f) && TAGS_BLOCO.has(etiqueta(f)));

function ehTarefa(li) {
  if ((atributo(li, 'class') || '').split(/\s+/).includes('tarefa')) return true;
  return Array.from(li.childNodes || []).some((f) => etiqueta(f) === 'INPUT');
}
function tarefaFeita(li) {
  const caixa = Array.from(li.childNodes || []).find((f) => etiqueta(f) === 'INPUT');
  if (caixa) return caixa.checked === true || (caixa.hasAttribute ? caixa.hasAttribute('checked') : false);
  return atributo(li, 'data-feita') === '1';
}

function emitirLista(lista, indentacao) {
  const ordenada = etiqueta(lista) === 'OL';
  let numero = parseInt(atributo(lista, 'start'), 10);
  if (!Number.isFinite(numero)) numero = 1;
  const linhas = [];
  for (const li of Array.from(lista.childNodes || [])) {
    if (!ehElemento(li) || etiqueta(li) !== 'LI') continue;
    const marcador = ordenada ? (numero++) + '. ' : '- ';
    const recuo = ' '.repeat(marcador.length);
    const proprios = [];
    const sublistas = [];
    for (const f of Array.from(li.childNodes || [])) {
      if (ehElemento(f) && (etiqueta(f) === 'UL' || etiqueta(f) === 'OL')) sublistas.push(f);
      else if (ehElemento(f) && (etiqueta(f) === 'P' || etiqueta(f) === 'DIV')) { proprios.push(f); proprios.push({ nodeType: 3, data: '\n' }); } else proprios.push(f);
    }
    let texto = limparLinhas(proprios.map((n) => (n.nodeType === 3 && n.data === '\n' ? '\n' : emitirNo(n))).join(''));
    texto = texto.replace(/\n{2,}/g, '\n');
    const prefixo = ehTarefa(li) ? (tarefaFeita(li) ? '[x] ' : '[ ] ') : '';
    const partes = texto.split('\n');
    linhas.push(indentacao + marcador + prefixo + partes[0]);
    for (const extra of partes.slice(1)) linhas.push(indentacao + recuo + extra);
    for (const sub of sublistas) linhas.push(emitirLista(sub, indentacao + recuo));
  }
  return linhas.filter((l) => l !== '').join('\n');
}

function emitirTabela(tabela) {
  const linhas = [];
  const visitar = (no) => {
    for (const f of Array.from(no.childNodes || [])) {
      if (!ehElemento(f)) continue;
      if (etiqueta(f) === 'TR') linhas.push(f);
      else visitar(f);
    }
  };
  visitar(tabela);
  if (!linhas.length) return '';
  const matriz = linhas.map((tr) => Array.from(tr.childNodes || []).filter((c) => ehElemento(c) && (etiqueta(c) === 'TH' || etiqueta(c) === 'TD'))
    .map((c) => ({ texto: limparLinhas(emitirFilhos(c)).replace(/\n+/g, ' ').replace(/\|/g, '\\|'), alinhar: atributo(c, 'align') || '' })));
  const colunas = Math.max(...matriz.map((l) => l.length));
  if (!colunas) return '';
  const completa = (l) => Array.from({ length: colunas }, (_, k) => l[k] || { texto: '', alinhar: '' });
  const [cabecalho, ...corpo] = matriz.map(completa);
  const formatar = (l) => '| ' + l.map((c) => c.texto).join(' | ') + ' |';
  const separador = '| ' + cabecalho.map((c) => (c.alinhar === 'center' ? ':---:' : c.alinhar === 'right' ? '---:' : c.alinhar === 'left' ? ':---' : '---')).join(' | ') + ' |';
  return [formatar(cabecalho), separador, ...corpo.map(formatar)].join('\n');
}

function emitirBloco(nos) {
  const saida = [];
  let abertos = [];
  const fechar = () => {
    if (abertos.length) { const t = paragrafoDe(abertos); if (t) saida.push(t); abertos = []; }
  };
  for (const no of nos) {
    if (!ehElemento(no) || TAGS_EM_LINHA.has(etiqueta(no))) {
      if (ehTexto(no) || ehElemento(no)) abertos.push(no);
      continue;
    }
    fechar();
    const tag = etiqueta(no);
    const nivel = /^H([1-6])$/.test(tag) ? Number(tag[1]) : 0;
    if (nivel) {
      const t = limparLinhas(emitirFilhos(no)).replace(/\n+/g, ' ');
      if (t) saida.push('#'.repeat(nivel) + ' ' + t);
    } else if (tag === 'UL' || tag === 'OL') {
      const t = emitirLista(no, '');
      if (t) saida.push(t);
    } else if (tag === 'BLOCKQUOTE') {
      const interno = emitirBloco(Array.from(no.childNodes || [])).join('\n\n');
      if (interno) saida.push(interno.split('\n').map((l) => (l ? '> ' + l : '>')).join('\n'));
    } else if (tag === 'PRE') {
      const codigo = Array.from(no.childNodes || []).find((f) => etiqueta(f) === 'CODE');
      const idioma = ((codigo && atributo(codigo, 'class')) || '').split(/\s+/).map((c) => c.match(/^linguagem-(.+)$/)).find(Boolean);
      const corpo = textoBruto(no).replace(/\n$/, '');
      const maior = Math.max(2, ...(corpo.match(/`{3,}/g) || []).map((s) => s.length));
      const cerca = '`'.repeat(maior + 1);
      saida.push(cerca + (idioma ? idioma[1] : '') + '\n' + corpo + '\n' + cerca);
    } else if (tag === 'TABLE') {
      const t = emitirTabela(no);
      if (t) saida.push(t);
    } else if (tag === 'HR') {
      saida.push('---');
    } else if (temFilhoBloco(no)) {
      saida.push(...emitirBloco(Array.from(no.childNodes || [])));
    } else {
      const t = paragrafoDe(Array.from(no.childNodes || []));
      if (t) saida.push(t);
    }
  }
  fechar();
  return saida;
}

export function htmlParaMarkdown(raiz) {
  const texto = emitirBloco(Array.from(raiz.childNodes || [])).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  return texto ? texto + '\n' : '';
}

export { markdownParaHtml as renderizarMarkdown };
