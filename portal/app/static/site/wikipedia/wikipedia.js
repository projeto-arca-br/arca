/* Página da Wikipédia: usa a API do Kiwix na mesma origem (/wiki/), sem chave e sem recursos externos. */
const CHAVE_ZIM = 'arca-wikipedia-zim';
const BASE = '/wiki';
const POR_PAGINA = 20;
const ESPERA_SUGESTAO_MS = 250;
const TEXTO_SEM_ZIM = 'Nenhum conteúdo da Wikipédia foi encontrado. Peça ao administrador para rodar "make baixar-dados" (com internet, uma vez) e reiniciar o serviço kiwix com "make subir".';
const TEXTO_INDISPONIVEL = 'O serviço da Wikipédia (Kiwix) está fora do ar ou ainda iniciando. Tente de novo em instantes ou peça ajuda ao administrador.';

const $ = (id) => document.getElementById(id);
const estado = { zims: [], zim: null, temporizador: null, sugestoes: [], ativa: -1, contagem: 0 };

class ErroHttp extends Error {
  constructor(status) { super('HTTP ' + status); this.status = status; }
}

function mostrarMensagem(texto, erro) {
  const m = $('mensagem');
  m.textContent = texto || '';
  m.classList.toggle('err', Boolean(erro));
}

function indisponivel(e) {
  return !e.status || [502, 503, 504].includes(e.status);
}

function mostrarErro(e) {
  mostrarMensagem(indisponivel(e) ? TEXTO_INDISPONIVEL : 'Não foi possível concluir a operação. Tente novamente.', true);
}

function lerZimGuardado() {
  try { return localStorage.getItem(CHAVE_ZIM); } catch (e) { return null; }
}
function guardarZim(id) {
  try { localStorage.setItem(CHAVE_ZIM, id); } catch (e) { /* ignora */ }
}

async function buscarTexto(url) {
  let resp;
  try { resp = await fetch(url, { headers: { Accept: '*/*' } }); } catch (e) { throw new ErroHttp(0); }
  if (!resp.ok) throw new ErroHttp(resp.status);
  return resp.text();
}

function lerXml(texto) {
  const doc = new DOMParser().parseFromString(texto, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new ErroHttp(500);
  return doc;
}

function textoDe(no, etiqueta) {
  const el = no.getElementsByTagName(etiqueta)[0];
  return el ? el.textContent.trim() : '';
}

// Descobre os ZIMs: o identificador é o último trecho do link text/html (/wiki/content/<id>), não o <name>.
async function descobrirZim() {
  const doc = lerXml(await buscarTexto(BASE + '/catalog/v2/entries'));
  const lista = [];
  Array.from(doc.getElementsByTagNameNS('*', 'entry')).forEach((entrada) => {
    const link = Array.from(entrada.getElementsByTagNameNS('*', 'link')).find((l) => (l.getAttribute('type') || '').startsWith('text/html'));
    if (!link) return;
    const id = (link.getAttribute('href') || '').split('?')[0].replace(/\/+$/, '').split('/').pop();
    if (!id) return;
    lista.push({ id, rotulo: textoDe(entrada, 'title') || id });
  });
  return lista;
}

function preencherSeletor() {
  const sel = $('seletor-zim');
  sel.textContent = '';
  estado.zims.forEach((z) => {
    const o = document.createElement('option');
    o.value = z.id; o.textContent = z.rotulo; sel.appendChild(o);
  });
  sel.value = estado.zim;
  $('campo-zim').hidden = estado.zims.length < 2;
}

function ligarControles(ligado) {
  ['seletor-zim', 'campo-busca', 'botao-buscar', 'botao-aleatorio'].forEach((id) => { $(id).disabled = !ligado; });
}

function urlArtigo(caminho) {
  return BASE + '/content/' + encodeURIComponent(estado.zim) + '/' + caminho.split('/').map(encodeURIComponent).join('/');
}

// ----- sugestões
function fecharSugestoes() {
  estado.sugestoes = []; estado.ativa = -1;
  const ul = $('lista-sugestoes');
  ul.textContent = ''; ul.hidden = true;
  $('campo-busca').setAttribute('aria-expanded', 'false');
  $('campo-busca').removeAttribute('aria-activedescendant');
}

function marcarAtiva(i) {
  estado.ativa = i;
  const itens = $('lista-sugestoes').children;
  Array.from(itens).forEach((li, k) => li.setAttribute('aria-selected', String(k === i)));
  if (i >= 0) $('campo-busca').setAttribute('aria-activedescendant', itens[i].id);
  else $('campo-busca').removeAttribute('aria-activedescendant');
}

function mostrarSugestoes(lista) {
  const ul = $('lista-sugestoes');
  ul.textContent = '';
  estado.sugestoes = lista; estado.ativa = -1;
  lista.forEach((s, i) => {
    const li = document.createElement('li');
    li.id = 'sugestao-' + i; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false');
    li.textContent = s.rotulo;
    li.addEventListener('mousedown', (ev) => { ev.preventDefault(); escolherSugestao(i); });
    ul.appendChild(li);
  });
  ul.hidden = lista.length === 0;
  $('campo-busca').setAttribute('aria-expanded', String(lista.length > 0));
}

function escolherSugestao(i) {
  const s = estado.sugestoes[i];
  if (!s) return;
  fecharSugestoes();
  $('campo-busca').value = s.rotulo;
  if (s.caminho) location.hash = '#/artigo/' + encodeURIComponent(estado.zim) + '/' + s.caminho.split('/').map(encodeURIComponent).join('/');
  else irParaBusca(s.rotulo, 1);
}

// O Kiwix devolve o rótulo com marcação de destaque escapada (&lt;b&gt;...&lt;/b&gt;):
// decodifica as entidades e remove as tags, sem inserir HTML na página.
function limparRotulo(texto) {
  const doc = new DOMParser().parseFromString(String(texto), 'text/html');
  const dec = doc.documentElement.textContent || '';
  return (new DOMParser().parseFromString(dec, 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();
}

async function buscarSugestoes(termo) {
  const url = BASE + '/suggest?content=' + encodeURIComponent(estado.zim) + '&term=' + encodeURIComponent(termo) + '&count=8';
  try {
    const dados = JSON.parse(await buscarTexto(url));
    if ($('campo-busca').value.trim() !== termo) return; // resposta atrasada
    const lista = (Array.isArray(dados) ? dados : [])
      .filter((d) => d && d.kind !== 'pattern')
      .map((d) => ({ rotulo: limparRotulo(d.label || d.value || ''), caminho: d.path ? String(d.path) : '' }))
      .filter((d) => d.rotulo);
    mostrarSugestoes(lista);
  } catch (e) { fecharSugestoes(); }
}

function agendarSugestoes() {
  clearTimeout(estado.temporizador);
  const termo = $('campo-busca').value.trim();
  if (termo.length < 2 || !estado.zim) { fecharSugestoes(); return; }
  estado.temporizador = setTimeout(() => buscarSugestoes(termo), ESPERA_SUGESTAO_MS);
}

// ----- resultados
function irParaBusca(termo, pagina) {
  location.hash = '#/busca/' + encodeURIComponent(termo) + '/' + pagina;
}

function mostrarArea(qual) {
  $('area-resultados').hidden = qual !== 'busca';
  $('area-artigo').hidden = qual !== 'artigo';
}

function caminhoDoLink(link) {
  const marca = '/content/' + estado.zim + '/';
  const i = link.indexOf(marca);
  return i >= 0 ? link.slice(i + marca.length) : '';
}

function mostrarResultados(doc, termo, pagina) {
  const total = parseInt(textoDe(doc, 'opensearch:totalResults') || (doc.getElementsByTagNameNS('*', 'totalResults')[0] || {}).textContent || '0', 10) || 0;
  const itens = Array.from(doc.getElementsByTagName('item'));
  const lista = $('lista-resultados');
  lista.textContent = '';
  mostrarArea('busca');
  if (!itens.length) {
    $('total-resultados').textContent = 'Nenhum resultado para "' + termo + '". Tente outras palavras.';
    $('paginacao').hidden = true;
    return;
  }
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  $('total-resultados').textContent = total.toLocaleString('pt-BR') + (total === 1 ? ' resultado' : ' resultados') + ' para "' + termo + '".';
  itens.forEach((item) => {
    const caminho = caminhoDoLink(textoDe(item, 'link'));
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.textContent = textoDe(item, 'title') || caminho;
    a.href = '#/artigo/' + encodeURIComponent(estado.zim) + '/' + caminho.split('/').map(encodeURIComponent).join('/');
    li.appendChild(a);
    const resumo = textoDe(item, 'description');
    if (resumo) { const p = document.createElement('p'); p.textContent = resumo; li.appendChild(p); }
    lista.appendChild(li);
  });
  $('paginacao').hidden = paginas < 2;
  $('pagina-atual').textContent = 'Página ' + pagina + ' de ' + paginas;
  $('pagina-anterior').disabled = pagina <= 1;
  $('pagina-seguinte').disabled = pagina >= paginas;
}

async function executarBusca(termo, pagina) {
  const contagem = ++estado.contagem;
  $('campo-busca').value = termo;
  mostrarMensagem('Buscando...');
  const url = BASE + '/search?content=' + encodeURIComponent(estado.zim) + '&pattern=' + encodeURIComponent(termo)
    + '&format=xml&pageLength=' + POR_PAGINA + '&start=' + ((pagina - 1) * POR_PAGINA);
  try {
    const doc = lerXml(await buscarTexto(url));
    if (contagem !== estado.contagem) return;
    mostrarResultados(doc, termo, pagina);
    mostrarMensagem('');
  } catch (e) {
    if (contagem !== estado.contagem) return;
    mostrarErro(e);
  }
}

// ----- artigo
function abrirArtigo(caminho) {
  mostrarArea('artigo');
  mostrarMensagem('');
  const url = urlArtigo(caminho);
  $('quadro-artigo').src = url;
  $('link-tela-cheia').href = url;
  $('botao-voltar-busca').hidden = false;
}

function artigoAleatorio() {
  if (!estado.zim) return;
  mostrarArea('artigo');
  mostrarMensagem('');
  const url = BASE + '/random?content=' + encodeURIComponent(estado.zim);
  $('quadro-artigo').src = url;
  $('link-tela-cheia').href = url;
  $('botao-voltar-busca').hidden = true;
}

// ----- estado na URL (#/busca/<termo>/<pagina> e #/artigo/<id>/<caminho>)
function aplicarHash() {
  if (!estado.zim) return;
  const partes = location.hash.replace(/^#\/?/, '').split('/');
  let decodificado;
  try { decodificado = partes.map(decodeURIComponent); } catch (e) { decodificado = []; }
  const [rota, a, b] = decodificado;
  if (rota === 'busca' && a) {
    executarBusca(a, Math.max(1, parseInt(b, 10) || 1));
  } else if (rota === 'artigo' && a && decodificado.length > 2) {
    if (estado.zims.some((z) => z.id === a) && a !== estado.zim) { estado.zim = a; $('seletor-zim').value = a; guardarZim(a); }
    abrirArtigo(decodificado.slice(2).join('/'));
  } else {
    estado.contagem++;
    mostrarArea(null);
    $('quadro-artigo').removeAttribute('src');
  }
}

function aoBuscar(ev) {
  ev.preventDefault();
  clearTimeout(estado.temporizador);
  fecharSugestoes();
  const termo = $('campo-busca').value.trim();
  if (!termo) { mostrarMensagem('Digite o que você quer procurar.'); return; }
  irParaBusca(termo, 1);
  if (location.hash === '#/busca/' + encodeURIComponent(termo) + '/1') aplicarHash();
}

function aoTeclar(ev) {
  const n = estado.sugestoes.length;
  if (ev.key === 'ArrowDown' && n) { ev.preventDefault(); marcarAtiva((estado.ativa + 1) % n); }
  else if (ev.key === 'ArrowUp' && n) { ev.preventDefault(); marcarAtiva((estado.ativa - 1 + n) % n); }
  else if (ev.key === 'Enter' && estado.ativa >= 0) { ev.preventDefault(); escolherSugestao(estado.ativa); }
  else if (ev.key === 'Escape') fecharSugestoes();
}

function paginaAtual() {
  const partes = location.hash.split('/');
  return Math.max(1, parseInt(partes[3], 10) || 1);
}
function mudarPagina(delta) {
  irParaBusca($('campo-busca').value.trim(), paginaAtual() + delta);
}

async function iniciar() {
  mostrarMensagem('Carregando a Wikipédia...');
  ligarControles(false);
  try {
    estado.zims = await descobrirZim();
  } catch (e) { mostrarErro(e); return; }
  if (!estado.zims.length) { mostrarMensagem(TEXTO_SEM_ZIM, true); return; }
  const guardado = lerZimGuardado();
  estado.zim = estado.zims.some((z) => z.id === guardado) ? guardado : estado.zims[0].id;
  preencherSeletor();
  ligarControles(true);
  mostrarMensagem('');
  aplicarHash();
}

$('form-busca').addEventListener('submit', aoBuscar);
$('campo-busca').addEventListener('input', agendarSugestoes);
$('campo-busca').addEventListener('keydown', aoTeclar);
$('campo-busca').addEventListener('blur', () => setTimeout(fecharSugestoes, 150));
$('botao-aleatorio').addEventListener('click', artigoAleatorio);
$('pagina-anterior').addEventListener('click', () => mudarPagina(-1));
$('pagina-seguinte').addEventListener('click', () => mudarPagina(1));
$('botao-voltar-busca').addEventListener('click', () => history.back());
$('seletor-zim').addEventListener('change', () => {
  estado.zim = $('seletor-zim').value; guardarZim(estado.zim);
  fecharSugestoes();
  const termo = $('campo-busca').value.trim();
  if (termo) { irParaBusca(termo, 1); if (location.hash === '#/busca/' + encodeURIComponent(termo) + '/1') aplicarHash(); }
});
window.addEventListener('hashchange', aplicarHash);
iniciar();
