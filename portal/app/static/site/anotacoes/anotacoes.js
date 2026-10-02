// Página de notas: editor visual com salvamento automático, sobre a API do FlatNotes na mesma
// origem (/notas/api/), sem autenticação e sem recursos externos.
import { criarEditor } from './editor.js';
import { normalizarEtiqueta, extrairEtiquetas, montarMarkdown, listarNomesDeEtiquetas } from './etiquetas.js';
import { validarArquivo, anexoDaResposta } from './anexos.js';

const API = '/notas/api';
const ESPERA_BUSCA_MS = 300;
const ESPERA_SALVAR_MS = 1500;
const LIMITE_ENVIO_FINAL = 60000; // o fetch com keepalive aceita até ~64 KB
const TITULO_INVALIDO = /[<>:"/\\|?*]/;
const CHAVE_LISTA = 'arca-notas-lista-recolhida';

const $ = (id) => document.getElementById(id);
const estado = {
  etiquetas: [], // etiquetas da nota aberta (a linha "#a #b" fica oculta na folha)
  etiquetasConhecidas: [], // etiquetas que o FlatNotes já conhece (sugestões e filtro)
  filtro: '', // etiqueta usada como filtro da lista
  enviando: 0, // anexos em envio
  notaAtual: null, // título da nota aberta (null = nenhuma ou nota nova)
  aberta: false, // há uma nota (existente ou nova) na folha
  nova: false,
  sujo: false, // há alterações ainda não salvas
  versao: 0, // aumenta a cada alteração, para saber se algo mudou durante um salvamento
  ultimoEnviado: '', // Markdown da última versão salva ou carregada
  emVoo: null, // salvamento em andamento
  refazer: false,
  abertura: 0,
  temporizadorBusca: null,
  temporizadorSalvar: null,
};
let editor = null;

function mostrarMensagem(texto, erro) {
  const m = $('mensagem');
  m.textContent = texto || '';
  m.classList.toggle('err', Boolean(erro));
}

function indicar(texto, erro) {
  const e = $('estado-salvamento');
  e.textContent = texto || '';
  e.classList.toggle('err', Boolean(erro));
}

// Erro de requisição com o status HTTP (0 = falha de rede).
async function requisicao(caminho, opcoes) {
  let resp;
  try {
    resp = await fetch(API + caminho, opcoes);
  } catch (e) {
    const erro = new Error('rede'); erro.status = 0; throw erro;
  }
  if (!resp.ok) { const erro = new Error('http'); erro.status = resp.status; throw erro; }
  if (resp.status === 204) return null;
  const tipo = resp.headers.get('content-type') || '';
  return tipo.includes('json') ? resp.json() : resp.text();
}

function textoDoErro(e, acao) {
  if (e.status === 401 || e.status === 403) return 'A nota não pôde ser ' + acao + ' por falta de permissão no FlatNotes.';
  if (e.status === 0 || e.status === 502 || e.status === 503 || e.status === 504) return 'O serviço de notas está indisponível no momento. Tente de novo em instantes.';
  if (e.status === 404) return 'A nota não foi encontrada.';
  return 'Não foi possível concluir a operação (erro ' + e.status + ').';
}

function dataLegivel(segundos) {
  if (!segundos) return '';
  return new Date(segundos * 1000).toLocaleString('pt-BR');
}

// ---- Lista e busca ----

// Os destaques da API vêm com marcas HTML: só texto e <mark> montados pelo DOM, nunca inseridos como HTML.
function decodificar(texto) {
  return new DOMParser().parseFromString(texto, 'text/html').documentElement.textContent || '';
}
function aplicarDestaques(no, bruto) {
  no.textContent = '';
  let marcado = false;
  String(bruto).split(/(<[^>]*>)/).forEach((parte) => {
    if (!parte) return;
    if (parte.startsWith('<') && parte.endsWith('>')) { marcado = !parte.startsWith('</'); return; }
    const texto = decodificar(parte);
    if (marcado) { const mk = document.createElement('mark'); mk.textContent = texto; no.appendChild(mk); } else no.appendChild(document.createTextNode(texto));
  });
}

function termoDeBusca() {
  const texto = $('busca').value.trim();
  const etiqueta = estado.filtro;
  const partes = [];
  if (etiqueta) partes.push('#' + etiqueta);
  if (texto) partes.push(texto);
  return partes.join(' ') || '*';
}

function itemDaLista(nota) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.setAttribute('class', 'item-nota');
  a.setAttribute('href', hashDaNota(nota.title));
  if (nota.title === estado.notaAtual) a.setAttribute('aria-current', 'true');
  const titulo = document.createElement('strong');
  if (nota.titleHighlights) aplicarDestaques(titulo, nota.titleHighlights); else titulo.textContent = nota.title;
  a.appendChild(titulo);
  if (nota.contentHighlights) {
    const trecho = document.createElement('span');
    trecho.setAttribute('class', 'trecho');
    aplicarDestaques(trecho, nota.contentHighlights);
    a.appendChild(trecho);
  }
  const data = document.createElement('small');
  data.textContent = dataLegivel(nota.lastModified);
  a.appendChild(data);
  li.appendChild(a);
  return li;
}

async function listarNotas() {
  const termo = termoDeBusca();
  const consulta = '/search?term=' + encodeURIComponent(termo) + (termo === '*' || termo.startsWith('#') ? '&sort=lastModified&order=desc' : '');
  try {
    const notas = await requisicao(consulta);
    const lista = $('lista');
    lista.textContent = '';
    (notas || []).forEach((n) => lista.appendChild(itemDaLista(n)));
    const total = (notas || []).length;
    $('resumo-lista').textContent = total === 0 ? (termo === '*' ? 'Nenhuma nota ainda. Crie a primeira.' : 'Nenhuma nota encontrada.') : (total === 1 ? '1 nota' : total + ' notas');
  } catch (e) {
    $('lista').textContent = '';
    $('resumo-lista').textContent = '';
    mostrarMensagem(textoDoErro(e, 'lida'), true);
  }
}

function montarChip(texto, rotuloRemover, aoClicar, pressionado) {
  const li = document.createElement('li');
  li.setAttribute('class', 'chip');
  if (pressionado === undefined) {
    const span = document.createElement('span');
    span.textContent = '#' + texto;
    li.appendChild(span);
    const b = document.createElement('button');
    b.setAttribute('type', 'button');
    b.setAttribute('aria-label', rotuloRemover);
    b.textContent = '×';
    b.addEventListener('click', aoClicar);
    li.appendChild(b);
  } else {
    const b = document.createElement('button');
    b.setAttribute('type', 'button');
    b.setAttribute('aria-pressed', pressionado ? 'true' : 'false');
    b.textContent = '#' + texto;
    b.addEventListener('click', aoClicar);
    li.appendChild(b);
  }
  return li;
}

function desenharFiltro() {
  const ul = $('filtro-etiquetas');
  ul.textContent = '';
  const nomes = estado.etiquetasConhecidas.slice();
  if (estado.filtro && !nomes.includes(estado.filtro)) nomes.push(estado.filtro);
  nomes.forEach((nome) => {
    ul.appendChild(montarChip(nome, '', () => {
      estado.filtro = estado.filtro === nome ? '' : nome;
      desenharFiltro();
      listarNotas();
    }, nome === estado.filtro));
  });
  ul.hidden = nomes.length === 0;
  $('rotulo-filtro').hidden = nomes.length === 0;
}

function desenharSugestoes() {
  const lista = $('sugestoes-etiquetas');
  lista.textContent = '';
  estado.etiquetasConhecidas.filter((n) => !estado.etiquetas.includes(n)).forEach((nome) => {
    const o = document.createElement('option');
    o.value = nome;
    lista.appendChild(o);
  });
}

async function carregarEtiquetas() {
  try {
    estado.etiquetasConhecidas = listarNomesDeEtiquetas(await requisicao('/tags'));
  } catch (e) { /* o filtro e as sugestões são opcionais; a lista mostra o erro principal */ }
  desenharFiltro();
  desenharSugestoes();
}

// Chips das etiquetas da nota aberta.
function desenharEtiquetas() {
  const ul = $('chips-etiquetas');
  ul.textContent = '';
  estado.etiquetas.forEach((nome) => {
    ul.appendChild(montarChip(nome, 'Remover a etiqueta ' + nome, () => removerEtiqueta(nome)));
  });
  desenharSugestoes();
}

function definirEtiquetas(lista) {
  estado.etiquetas = lista.slice();
  desenharEtiquetas();
}

// Aceita várias etiquetas separadas por vírgula; devolve true se todas entraram.
function adicionarEtiqueta(texto) {
  const partes = String(texto).split(',').filter((t) => t.trim());
  if (partes.length > 1) return partes.map(adicionarUmaEtiqueta).every(Boolean);
  return adicionarUmaEtiqueta(partes[0] || '');
}

function adicionarUmaEtiqueta(texto) {
  const r = normalizarEtiqueta(texto);
  if (r.erro) { mostrarMensagem(r.erro, true); return false; }
  if (estado.etiquetas.includes(r.valor)) { mostrarMensagem('A nota já tem a etiqueta "' + r.valor + '".', true); return false; }
  estado.etiquetas.push(r.valor);
  desenharEtiquetas();
  mostrarMensagem(r.aviso, false);
  aoAlterar();
  return true;
}

function removerEtiqueta(nome) {
  estado.etiquetas = estado.etiquetas.filter((e) => e !== nome);
  desenharEtiquetas();
  mostrarMensagem('');
  aoAlterar();
  $('nova-etiqueta').focus();
}

// Markdown completo da nota: linha de etiquetas (oculta na folha) e corpo.
function conteudoDaNota() { return montarMarkdown(estado.etiquetas, editor.obterMarkdown()); }

// ---- Folha ----

function hashDaNota(titulo) { return '#/nota/' + encodeURIComponent(titulo); }

function hashAtual() {
  if (estado.nova) return '#/nova';
  return estado.notaAtual ? hashDaNota(estado.notaAtual) : '#/';
}

// Troca o endereço sem criar entrada no histórico nem disparar hashchange.
function substituirHash(novo) {
  if (location.hash !== novo) history.replaceState(null, '', novo);
}

function mostrarFolha(aberta) {
  estado.aberta = aberta;
  $('painel-vazio').hidden = aberta;
  $('painel-nota').hidden = !aberta;
  $('botao-excluir').hidden = !aberta || estado.nova;
  $('anotacoes').classList.toggle('mostrando-folha', aberta);
}

function telaGrande() { return window.matchMedia('(min-width: 721px)').matches; }

function aoAlterar() {
  if (!estado.aberta) return;
  estado.sujo = true;
  estado.versao++;
  indicar('Não salvo');
  clearTimeout(estado.temporizadorSalvar);
  estado.temporizadorSalvar = setTimeout(() => { salvarNota(); }, ESPERA_SALVAR_MS);
}

async function abrirNota(titulo) {
  const ficha = ++estado.abertura;
  try {
    const nota = await requisicao('/notes/' + encodeURIComponent(titulo));
    if (ficha !== estado.abertura) return;
    estado.notaAtual = nota.title;
    estado.nova = false;
    $('titulo-nota').value = nota.title;
    const partes = extrairEtiquetas(nota.content);
    definirEtiquetas(partes.etiquetas);
    editor.carregar(partes.corpo);
    estado.ultimoEnviado = conteudoDaNota();
    estado.sujo = false;
    clearTimeout(estado.temporizadorSalvar);
    indicar('');
    mostrarMensagem('');
    mostrarFolha(true);
    if (telaGrande()) editor.focar();
    listarNotas();
  } catch (e) {
    if (ficha !== estado.abertura) return;
    fecharNota();
    substituirHash('#/');
    mostrarMensagem(e.status === 404 ? 'A nota "' + titulo + '" não existe mais.' : textoDoErro(e, 'lida'), true);
  }
}

function novaNota() {
  estado.abertura++;
  estado.notaAtual = null;
  estado.nova = true;
  estado.sujo = false;
  clearTimeout(estado.temporizadorSalvar);
  $('titulo-nota').value = '';
  definirEtiquetas([]);
  editor.carregar('');
  estado.ultimoEnviado = '';
  indicar('');
  mostrarMensagem('');
  mostrarFolha(true);
  $('titulo-nota').focus();
  listarNotas();
}

function fecharNota() {
  estado.abertura++;
  estado.notaAtual = null;
  estado.nova = false;
  estado.sujo = false;
  clearTimeout(estado.temporizadorSalvar);
  indicar('');
  mostrarFolha(false);
  listarNotas();
}

// ---- Salvamento ----

function validarTitulo(titulo) {
  if (!titulo) return 'Dê um título à nota.';
  if (TITULO_INVALIDO.test(titulo)) return 'O título não pode ter os caracteres < > : " / \\ | ? *';
  return '';
}

// Devolve true se o título está livre (GET 404); false se já existe; lança nos demais erros.
async function tituloLivre(titulo) {
  try {
    await requisicao('/notes/' + encodeURIComponent(titulo));
    return false;
  } catch (e) {
    if (e.status === 404) return true;
    throw e;
  }
}

function falhaAoSalvar(texto) {
  indicar('Erro ao salvar', true);
  mostrarMensagem(texto, true);
  return false;
}

// Faz um salvamento. Devolve true se salvou ou se não havia nada a salvar.
async function executarSalvamento() {
  const titulo = $('titulo-nota').value.trim();
  const conteudo = conteudoDaNota();
  const versao = estado.versao;
  const concluir = () => {
    if (estado.versao === versao) estado.sujo = false;
    estado.ultimoEnviado = conteudo;
    indicar(estado.versao === versao ? 'Salvo' : 'Não salvo');
    mostrarMensagem('');
    return true;
  };

  if (estado.nova) {
    if (!titulo && !conteudo.trim()) { estado.sujo = false; indicar(''); return true; }
    const invalido = validarTitulo(titulo);
    if (invalido) { indicar('Não salvo', true); mostrarMensagem(invalido, true); return false; }
    indicar('Salvando…');
    try {
      if (!(await tituloLivre(titulo))) { indicar('Não salvo', true); mostrarMensagem('Já existe uma nota com o título "' + titulo + '". Escolha outro título.', true); return false; }
      await requisicao('/notes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: titulo, content: conteudo }) });
    } catch (e) { return falhaAoSalvar(textoDoErro(e, 'salva')); }
    estado.nova = false;
    estado.notaAtual = titulo;
    $('botao-excluir').hidden = false;
    substituirHash(hashDaNota(titulo));
    concluir();
    carregarEtiquetas();
    listarNotas();
    return true;
  }

  if (!estado.notaAtual) return true;
  const renomear = titulo !== estado.notaAtual;
  if (!renomear && conteudo === estado.ultimoEnviado) return concluir();
  const corpo = { newContent: conteudo };
  if (renomear) {
    const invalido = validarTitulo(titulo);
    if (invalido) { indicar('Não salvo', true); mostrarMensagem(invalido, true); return false; }
    corpo.newTitle = titulo;
  }
  indicar('Salvando…');
  try {
    if (renomear && titulo.toLowerCase() !== estado.notaAtual.toLowerCase() && !(await tituloLivre(titulo))) {
      indicar('Não salvo', true);
      mostrarMensagem('Já existe uma nota com o título "' + titulo + '". Escolha outro título.', true);
      return false;
    }
    const resposta = await requisicao('/notes/' + encodeURIComponent(estado.notaAtual), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
    if (renomear) {
      estado.notaAtual = (resposta && resposta.title) || titulo;
      substituirHash(hashDaNota(estado.notaAtual));
      listarNotas();
    }
  } catch (e) { return falhaAoSalvar(textoDoErro(e, 'salva')); }
  return concluir();
}

// Um salvamento por vez; pedidos feitos durante um salvamento pedem uma nova rodada.
function salvarNota() {
  clearTimeout(estado.temporizadorSalvar);
  if (estado.emVoo) { estado.refazer = true; return estado.emVoo; }
  estado.emVoo = (async () => {
    let ok = true;
    do {
      estado.refazer = false;
      ok = await executarSalvamento();
    } while (estado.refazer && ok);
    return ok;
  })().finally(() => { estado.emVoo = null; });
  return estado.emVoo;
}

// Salva antes de sair da nota. Se não conseguir, pergunta antes de descartar.
async function podeSair() {
  for (let tentativa = 0; estado.sujo && tentativa < 3; tentativa++) {
    clearTimeout(estado.temporizadorSalvar);
    if (!(await salvarNota())) {
      if (confirm('Não foi possível salvar esta nota. Descartar as alterações e continuar?')) { estado.sujo = false; return true; }
      return false;
    }
  }
  return true;
}

async function excluirNota() {
  if (!estado.notaAtual) return;
  const titulo = estado.notaAtual;
  if (!confirm('Excluir a nota "' + titulo + '"? Esta ação não pode ser desfeita.')) return;
  clearTimeout(estado.temporizadorSalvar);
  if (estado.emVoo) await estado.emVoo;
  try {
    await requisicao('/notes/' + encodeURIComponent(titulo), { method: 'DELETE' });
  } catch (e) { mostrarMensagem(textoDoErro(e, 'excluída'), true); return; }
  fecharNota();
  substituirHash('#/');
  await carregarEtiquetas();
  await listarNotas();
  mostrarMensagem('Nota "' + titulo + '" excluída.');
}

// ---- Anexos ----

function textoDoErroDeEnvio(e) {
  if (e.status === 413) return 'O servidor recusou o arquivo por ser grande demais.';
  if (e.status === 0 || e.status === 502 || e.status === 503 || e.status === 504) return 'O serviço de notas está indisponível no momento. O arquivo não foi enviado.';
  return 'Não foi possível enviar o arquivo (erro ' + e.status + ').';
}

// Envia um arquivo por vez para o FlatNotes e insere o resultado no ponto do cursor.
async function enviarArquivos(arquivos) {
  if (!estado.aberta) { mostrarMensagem('Abra ou crie uma nota antes de anexar arquivos.', true); return; }
  const ficha = estado.abertura;
  for (const arquivo of arquivos) {
    const problema = validarArquivo(arquivo);
    if (problema) { mostrarMensagem(problema, true); continue; }
    estado.enviando++;
    indicar('Enviando…');
    mostrarMensagem('Enviando "' + arquivo.name + '"…');
    try {
      const dados = new FormData();
      dados.append('file', arquivo);
      const anexo = anexoDaResposta(await requisicao('/attachments', { method: 'POST', body: dados }), arquivo);
      if (!anexo) throw Object.assign(new Error('resposta'), { status: 500 });
      if (ficha !== estado.abertura) {
        mostrarMensagem('O arquivo "' + anexo.nomeDoArquivo + '" foi enviado, mas a nota foi trocada e ele não foi inserido.', true);
      } else if (editor.inserirAnexo(anexo)) {
        mostrarMensagem(anexo.imagem ? 'Imagem inserida na nota.' : 'Link do arquivo "' + anexo.nomeDoArquivo + '" inserido na nota.');
      }
    } catch (e) {
      mostrarMensagem(textoDoErroDeEnvio(e), true);
    } finally {
      estado.enviando--;
      if (!estado.enviando) indicar(estado.sujo ? 'Não salvo' : '');
    }
  }
}

// ---- Navegação ----

function tituloDoHash() {
  const m = location.hash.match(/^#\/nota\/(.+)$/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch (e) { return null; }
}

function abrirPeloHash() {
  const titulo = tituloDoHash();
  if (titulo) abrirNota(titulo);
  else if (location.hash === '#/nova') novaNota();
  else fecharNota();
}

async function aoMudarHash() {
  if (estado.aberta && !(await podeSair())) { substituirHash(hashAtual()); return; }
  abrirPeloHash();
}

function alternarLista() {
  const recolhida = $('anotacoes').classList.toggle('recolhida');
  $('botao-recolher').setAttribute('aria-expanded', recolhida ? 'false' : 'true');
  $('texto-recolher').textContent = recolhida ? 'Mostrar lista' : 'Ocultar lista';
  try { localStorage.setItem(CHAVE_LISTA, recolhida ? '1' : '0'); } catch (e) { /* preferência opcional */ }
}

// Envio de última hora ao fechar a aba: só para nota já criada, sem troca de título e de tamanho pequeno.
function enviarAoSair() {
  if (!estado.sujo || estado.nova || !estado.notaAtual || $('titulo-nota').value.trim() !== estado.notaAtual) return;
  const conteudo = conteudoDaNota();
  if (conteudo.length > LIMITE_ENVIO_FINAL) return;
  try {
    fetch(API + '/notes/' + encodeURIComponent(estado.notaAtual), { method: 'PATCH', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ newContent: conteudo }) });
  } catch (e) { /* o aviso do navegador cobre este caso */ }
}

function iniciar() {
  document.querySelectorAll('[data-icone]').forEach((no) => {
    if (window.Arca && window.Arca.icone) no.appendChild(window.Arca.icone(no.getAttribute('data-icone')));
  });
  editor = criarEditor({
    area: $('editor'),
    barra: $('barra-ferramentas'),
    aoAlterar,
    aoSalvar: () => { salvarNota(); },
    aoAviso: (texto) => mostrarMensagem(texto, true),
    aoArquivos: (arquivos) => { enviarArquivos(arquivos); },
  });
  $('nova-etiqueta').addEventListener('keydown', (ev) => {
    const campo = ev.target;
    if (ev.key === 'Enter' || ev.key === ',') {
      ev.preventDefault();
      if (campo.value.trim() && adicionarEtiqueta(campo.value)) campo.value = '';
    } else if (ev.key === 'Backspace' && !campo.value && estado.etiquetas.length) {
      removerEtiqueta(estado.etiquetas[estado.etiquetas.length - 1]);
    }
  });
  // escolher uma sugestão da lista (ou sair do campo) também adiciona
  $('nova-etiqueta').addEventListener('change', (ev) => {
    const campo = ev.target;
    if (campo.value.trim() && adicionarEtiqueta(campo.value)) campo.value = '';
  });

  $('form-busca').addEventListener('submit', (ev) => { ev.preventDefault(); listarNotas(); });
  $('busca').addEventListener('input', () => { clearTimeout(estado.temporizadorBusca); estado.temporizadorBusca = setTimeout(listarNotas, ESPERA_BUSCA_MS); });
  $('botao-nova').addEventListener('click', async () => {
    if (location.hash !== '#/nova') { location.hash = '#/nova'; return; }
    if (await podeSair()) novaNota();
  });
  $('botao-voltar').addEventListener('click', async () => {
    if (!(await podeSair())) return;
    if (location.hash === '#/') fecharNota(); else location.hash = '#/';
  });
  $('botao-recolher').addEventListener('click', alternarLista);
  $('botao-excluir').addEventListener('click', excluirNota);
  $('titulo-nota').addEventListener('input', () => { if (estado.aberta) { estado.sujo = true; estado.versao++; indicar('Não salvo'); } });
  $('titulo-nota').addEventListener('change', () => { if (estado.aberta && estado.sujo) salvarNota(); });
  $('titulo-nota').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); editor.focar(); } });
  document.addEventListener('keydown', (ev) => {
    if (!ev.defaultPrevented && (ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's' && estado.aberta) { ev.preventDefault(); salvarNota(); }
  });
  window.addEventListener('beforeunload', (ev) => {
    if (!estado.sujo) return;
    enviarAoSair();
    ev.preventDefault();
    ev.returnValue = '';
  });
  window.addEventListener('hashchange', aoMudarHash);

  try {
    if (localStorage.getItem(CHAVE_LISTA) === '1') alternarLista();
  } catch (e) { /* sem preferência guardada */ }

  carregarEtiquetas();
  abrirPeloHash();
}

iniciar();
