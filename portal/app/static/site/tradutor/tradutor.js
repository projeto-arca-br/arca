/* Página do tradutor: usa a API do LibreTranslate na mesma origem (/traducao/), sem chave e sem recursos externos. */
const CHAVE_PAR = 'arca-tradutor-par';
const NOMES = { en: 'Inglês', pb: 'Português (Brasil)', 'pt-BR': 'Português (Brasil)', pt: 'Português (Brasil)', es: 'Espanhol' };
const ORDEM = ['pb', 'en', 'es'];
// Variantes de português que a API pode listar, da preferida para a menos preferida.
const VARIANTES_PT = ['pb', 'pt-BR', 'pt'];
const AUTO = 'auto';

const $ = (id) => document.getElementById(id);
const estado = { idiomas: [], traduzindo: false, pronto: false };

function mostrarMensagem(texto, erro) {
  const m = $('mensagem');
  m.textContent = texto || '';
  m.classList.toggle('err', Boolean(erro));
}

function lerPar() {
  try { return JSON.parse(localStorage.getItem(CHAVE_PAR) || 'null'); } catch (e) { return null; }
}
function guardarPar() {
  try { localStorage.setItem(CHAVE_PAR, JSON.stringify({ origem: $('idioma-origem').value, destino: $('idioma-destino').value })); } catch (e) { /* ignora */ }
}

// Reduz a lista da API a Inglês, Português (Brasil) e Espanhol, com o código que a API aceita.
function normalizarIdiomas(lista) {
  const porCodigo = {};
  lista.forEach((i) => { porCodigo[i.code] = i; });
  const pt = VARIANTES_PT.find((c) => porCodigo[c]);
  const escolhidos = [];
  ['en', 'es'].forEach((c) => { if (porCodigo[c]) escolhidos.push(c); });
  if (pt) escolhidos.push(pt);
  const alvosDe = (cod) => {
    const alvos = new Set();
    (porCodigo[cod].targets || []).forEach((t) => {
      if (VARIANTES_PT.includes(t)) { if (t === pt) alvos.add(pt); } else alvos.add(t);
    });
    // Se a API listou uma variante diferente de português nos alvos, usa a que ela mesma aceita para este par.
    if (pt && (porCodigo[cod].targets || []).some((t) => VARIANTES_PT.includes(t))) alvos.add(pt);
    return alvos;
  };
  const rank = (c) => ORDEM.indexOf(VARIANTES_PT.includes(c) ? 'pb' : c);
  return escolhidos
    .map((c) => ({ codigo: c, nome: NOMES[c] || c, alvos: alvosDe(c) }))
    .sort((a, b) => rank(a.codigo) - rank(b.codigo));
}

function opcao(valor, texto) {
  const o = document.createElement('option');
  o.value = valor; o.textContent = texto; return o;
}

function preencherOrigem() {
  const sel = $('idioma-origem');
  sel.textContent = '';
  sel.appendChild(opcao(AUTO, 'Detectar idioma'));
  estado.idiomas.forEach((i) => sel.appendChild(opcao(i.codigo, i.nome)));
}

function preencherDestino(preferido) {
  const origem = $('idioma-origem').value;
  const sel = $('idioma-destino');
  const anterior = preferido || sel.value;
  const validos = estado.idiomas.filter((i) => {
    if (origem === AUTO) return true;
    const o = estado.idiomas.find((x) => x.codigo === origem);
    return i.codigo !== origem && o && o.alvos.has(i.codigo);
  });
  sel.textContent = '';
  validos.forEach((i) => sel.appendChild(opcao(i.codigo, i.nome)));
  if (validos.some((i) => i.codigo === anterior)) sel.value = anterior;
  atualizarAviso();
}

function ehPt(c) { return VARIANTES_PT.includes(c); }
function atualizarAviso() {
  const o = $('idioma-origem').value, d = $('idioma-destino').value;
  $('aviso-pivo').hidden = !((o === 'es' && ehPt(d)) || (ehPt(o) && d === 'es') || (o === AUTO && ehPt(d)));
}

function atualizarContador() {
  $('contador').textContent = $('texto-entrada').value.length.toLocaleString('pt-BR');
}

function ligarControles(ligado) {
  $('idioma-origem').disabled = !ligado;
  $('idioma-destino').disabled = !ligado;
  $('trocar-idiomas').disabled = !ligado;
  $('botao-traduzir').disabled = !ligado || estado.traduzindo;
}

function indisponivel(e) {
  return !e.status || [502, 503, 504].includes(e.status);
}
const TEXTO_INDISPONIVEL = 'O serviço de tradução está desligado ou sem modelos. Peça ao administrador para rodar "make modelos-traducao" (com internet, uma vez) e incluir "traducao" na lista de perfis do arquivo .env, depois rodar "make subir".';

async function carregarIdiomas() {
  mostrarMensagem('Carregando idiomas...');
  ligarControles(false);
  try {
    const lista = await Arca.api('GET', '/traducao/languages');
    estado.idiomas = normalizarIdiomas(Array.isArray(lista) ? lista : []);
    if (estado.idiomas.length < 2) throw new Error('sem idiomas');
  } catch (e) {
    mostrarMensagem(e.message === 'sem idiomas' || !indisponivel(e)
      ? 'Nenhum idioma de tradução foi encontrado. Peça ao administrador para rodar "make modelos-traducao".'
      : TEXTO_INDISPONIVEL, true);
    return;
  }
  preencherOrigem();
  const par = lerPar();
  if (par && (par.origem === AUTO || estado.idiomas.some((i) => i.codigo === par.origem))) $('idioma-origem').value = par.origem;
  preencherDestino(par && par.destino);
  estado.pronto = true;
  ligarControles(true);
  mostrarMensagem('');
}

async function traduzir() {
  if (!estado.pronto || estado.traduzindo) return;
  const texto = $('texto-entrada').value;
  if (!texto.trim()) { mostrarMensagem('Digite ou cole um texto para traduzir.', true); $('texto-entrada').focus(); return; }
  estado.traduzindo = true;
  $('botao-traduzir').disabled = true;
  mostrarMensagem('Traduzindo...');
  try {
    const r = await Arca.api('POST', '/traducao/translate', {
      q: texto, source: $('idioma-origem').value, target: $('idioma-destino').value, format: 'text'
    });
    $('texto-saida').value = (r && r.translatedText) || '';
    $('botao-copiar').disabled = !$('texto-saida').value;
    mostrarMensagem('Tradução pronta.');
    guardarPar();
  } catch (e) {
    $('texto-saida').value = ''; $('botao-copiar').disabled = true;
    mostrarMensagem(indisponivel(e) ? TEXTO_INDISPONIVEL
      : 'Não foi possível traduzir o texto. Tente de novo; se continuar, avise o administrador.', true);
  } finally {
    estado.traduzindo = false;
    $('botao-traduzir').disabled = !estado.pronto;
  }
}

function trocarIdiomas() {
  const o = $('idioma-origem').value, d = $('idioma-destino').value;
  if (o === AUTO) { mostrarMensagem('Escolha um idioma de origem para poder trocar.', true); return; }
  $('idioma-origem').value = d;
  preencherDestino(o);
  // Leva a tradução para a entrada, para traduzir de volta com um toque.
  const saida = $('texto-saida').value;
  if (saida) { $('texto-entrada').value = saida; $('texto-saida').value = ''; $('botao-copiar').disabled = true; atualizarContador(); }
  guardarPar();
  mostrarMensagem('');
}

async function copiar() {
  const campo = $('texto-saida');
  if (!campo.value) return;
  try {
    await navigator.clipboard.writeText(campo.value);
    mostrarMensagem('Tradução copiada.');
  } catch (e) {
    campo.focus(); campo.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e2) { /* ignora */ }
    mostrarMensagem(ok ? 'Tradução copiada.' : 'O texto foi selecionado; use Ctrl+C para copiar.');
  }
}

function limpar() {
  $('texto-entrada').value = ''; $('texto-saida').value = '';
  $('botao-copiar').disabled = true;
  atualizarContador(); mostrarMensagem('');
  $('texto-entrada').focus();
}

$('form-traducao').addEventListener('submit', (ev) => { ev.preventDefault(); traduzir(); });
$('trocar-idiomas').addEventListener('click', trocarIdiomas);
$('botao-copiar').addEventListener('click', copiar);
$('botao-limpar').addEventListener('click', limpar);
$('texto-entrada').addEventListener('input', atualizarContador);
$('idioma-origem').addEventListener('change', () => { preencherDestino(); guardarPar(); });
$('idioma-destino').addEventListener('change', () => { atualizarAviso(); guardarPar(); });
$('texto-entrada').addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); traduzir(); } });
atualizarContador();
carregarIdiomas();
