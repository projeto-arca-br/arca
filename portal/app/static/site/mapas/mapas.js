/* Tela de mapas: MapLibre GL JS + PMTiles, tudo vendorizado em /mapas/vendor. */
import * as maplibregl from '/mapas/vendor/maplibre-gl.mjs';

var $ = function (id) { return document.getElementById(id); };
var A = window.Arca;
var CHAVE_LS = 'arca-mapa-estado';
var DADOS = '/mapas/data/';
var RECURSOS = location.origin + '/mapas/assets';
var CAMADAS = ['places', 'pois', 'roads'];
var FONTE = 'protomaps';

var protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

var mapa = null, atual = null, cabecalhos = {};

function lerSalvo() { try { return JSON.parse(localStorage.getItem(CHAVE_LS)) || {}; } catch (e) { return {}; } }
function gravar(o) { try { localStorage.setItem(CHAVE_LS, JSON.stringify(o)); } catch (e) { /* ignora */ } }
function dizer(texto, erro) { var m = $('mensagem'); m.textContent = texto || ''; m.className = 'mensagem' + (erro ? ' erro' : ''); }

function escuro() {
  var t = document.documentElement.getAttribute('data-tema');
  return t ? t === 'escuro' : window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function montarEstilo(arquivo) {
  var variante = escuro() ? 'dark' : 'light';
  return {
    version: 8,
    glyphs: RECURSOS + '/fonts/{fontstack}/{range}.pbf',
    sprite: RECURSOS + '/sprites/v4/' + variante,
    sources: {
      protomaps: {
        type: 'vector',
        url: 'pmtiles://' + location.origin + DADOS + encodeURIComponent(arquivo),
        attribution: '<a href="https://www.openstreetmap.org/copyright">&copy; OpenStreetMap</a>'
      }
    },
    layers: basemaps.layers(FONTE, basemaps.namedFlavor(variante), { lang: 'pt' })
  };
}

function dentroDosLimites(h, lng, lat) {
  return lng >= h.minLon && lng <= h.maxLon && lat >= h.minLat && lat <= h.maxLat;
}

function persistir() {
  if (!mapa || !atual) return;
  var c = mapa.getCenter();
  gravar({ arquivo: atual, lng: c.lng, lat: c.lat, zoom: mapa.getZoom() });
}

function abrirArquivo(arquivo, usarSalvo) {
  atual = arquivo;
  var p = new pmtiles.PMTiles(location.origin + DADOS + encodeURIComponent(arquivo));
  protocol.add(p);
  dizer('Carregando ' + arquivo + '...');
  return p.getHeader().then(function (h) {
    cabecalhos[arquivo] = h;
    var s = lerSalvo(), vista;
    if (usarSalvo && s.arquivo === arquivo && isFinite(s.lng) && dentroDosLimites(h, s.lng, s.lat)) {
      vista = { center: [s.lng, s.lat], zoom: s.zoom };
    } else {
      vista = null; // sem posição salva válida: enquadra o arquivo inteiro
    }
    var limites = [[h.minLon, h.minLat], [h.maxLon, h.maxLat]];
    var padLng = (h.maxLon - h.minLon) * 0.25, padLat = (h.maxLat - h.minLat) * 0.25;
    var limite = [[h.minLon - padLng, h.minLat - padLat], [h.maxLon + padLng, h.maxLat + padLat]];
    if (!mapa) {
      mapa = new maplibregl.Map({
        container: 'mapa', style: montarEstilo(arquivo),
        bounds: vista ? undefined : limites, fitBoundsOptions: { padding: 8 },
        center: vista ? vista.center : undefined, zoom: vista ? vista.zoom : undefined, maxBounds: limite,
        maxZoom: h.maxZoom + 2, attributionControl: { compact: true }, hash: false
      });
      mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
      mapa.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
      mapa.on('moveend', persistir);
      mapa.on('error', function (e) {
        var msg = e && e.error && e.error.message ? e.error.message : 'erro desconhecido';
        dizer('Erro ao carregar o mapa: ' + msg, true);
      });
      mapa.on('load', function () { dizer(''); });
      window.__mapaArca = mapa;
    } else {
      mapa.setStyle(montarEstilo(arquivo));
      mapa.setMaxZoom(h.maxZoom + 2);
      mapa.setMaxBounds(limite);
      if (vista) mapa.jumpTo(vista); else mapa.fitBounds(limites, { padding: 8, animate: false });
    }
    persistir();
  }).catch(function (e) {
    dizer('Não foi possível abrir ' + arquivo + ': ' + (e && e.message ? e.message : e), true);
  });
}

/* ---- busca por nome nas feições já carregadas (PMTiles não tem índice de busca) ---- */
function normalizar(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
function primeiroPonto(g) {
  var c = g.coordinates;
  while (Array.isArray(c) && Array.isArray(c[0])) {
    c = g.type === 'Polygon' || g.type === 'MultiPolygon' ? c[0] : c[Math.floor(c.length / 2)] || c[0];
  }
  return c;
}
function buscar(q) {
  var n = normalizar(q.trim()), vistos = {}, saida = [];
  if (!n || !mapa || !mapa.getSource(FONTE)) return saida;
  CAMADAS.forEach(function (camada) {
    mapa.querySourceFeatures(FONTE, { sourceLayer: camada }).forEach(function (f) {
      var nome = f.properties && (f.properties['name:pt'] || f.properties.name);
      if (!nome || normalizar(nome).indexOf(n) < 0) return;
      var pt = primeiroPonto(f.geometry);
      if (!pt || !isFinite(pt[0])) return;
      var key = nome + '|' + camada;
      if (vistos[key]) return; vistos[key] = true;
      saida.push({ nome: nome, camada: camada, tipo: f.properties.kind || f.properties.kind_detail || '', pt: pt });
    });
  });
  var ordem = { places: 0, pois: 1, roads: 2 };
  saida.sort(function (a, b) {
    return (normalizar(a.nome).indexOf(n) === 0 ? 0 : 1) - (normalizar(b.nome).indexOf(n) === 0 ? 0 : 1) || ordem[a.camada] - ordem[b.camada];
  });
  return saida.slice(0, 20);
}
var TEXTO_CAMADA = { places: 'Lugar', pois: 'Ponto de interesse', roads: 'Via' };
function mostrarResultados(lista) {
  var ul = $('resultados'); ul.textContent = '';
  ul.hidden = false;
  if (!lista.length) {
    ul.appendChild(A.el('li', { 'class': 'empty', text: 'Nada encontrado na área carregada. Aproxime ou desloque o mapa e tente de novo.' }));
    return;
  }
  lista.forEach(function (r) {
    var b = A.el('button', { type: 'button' }, [
      A.el('span', { text: r.nome }),
      A.el('span', { 'class': 'subtitulo', text: TEXTO_CAMADA[r.camada] })
    ]);
    b.addEventListener('click', function () {
      mapa.flyTo({ center: r.pt, zoom: Math.max(mapa.getZoom(), r.camada === 'places' ? 13 : 16) });
      $('mapa').scrollIntoView({ block: 'nearest' });
    });
    ul.appendChild(A.el('li', {}, [b]));
  });
}

function iniciar() {
  A.api('GET', '/api/biblioteca').then(function (bib) {
    var arquivos = ((bib && bib.itens) || []).filter(function (i) { return i.tipo === 'pmtiles'; });
    if (!arquivos.length) { $('vazio').hidden = false; $('mapa').hidden = true; $('form-busca').hidden = true; return; }
    var selecao = $('arquivo-mapa');
    arquivos.forEach(function (f) {
      selecao.appendChild(A.el('option', { value: f.nome, text: f.nome + ' (' + A.formatarBytes(f.tamanho_bytes) + ')' }));
    });
    var s = lerSalvo();
    var inicial = arquivos.some(function (f) { return f.nome === s.arquivo; }) ? s.arquivo : arquivos[0].nome;
    selecao.value = inicial; selecao.disabled = false;
    selecao.addEventListener('change', function () { $('resultados').hidden = true; abrirArquivo(selecao.value, false); });
    abrirArquivo(inicial, true);
  }).catch(function () {
    dizer('Não foi possível consultar a biblioteca de mapas (portal fora do ar?).', true);
  });

  $('form-busca').addEventListener('submit', function (ev) {
    ev.preventDefault();
    mostrarResultados(buscar($('busca-texto').value));
  });
  // Troca de tema: estilo claro/escuro (inclui sprites) sem recarregar a página.
  new MutationObserver(function () { if (mapa && atual) mapa.setStyle(montarEstilo(atual)); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
}
iniciar();
