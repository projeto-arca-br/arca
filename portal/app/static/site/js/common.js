/* Utilidades compartilhadas: tema, ícones e auxiliares. Sem dependências externas. */
(function () {
  'use strict';
  var CHAVE = 'arca-tema';
  function lerTema() { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } }
  function aplicar(t) { if (t) document.documentElement.setAttribute('data-tema', t); else document.documentElement.removeAttribute('data-tema'); }
  aplicar(lerTema());

  var SVG = 'http:' + '//www.w3.org/2000/svg'; // namespace XML, não é uma requisição
  // Ícones inline (traços de 24x24). Chave = identificador do serviço.
  var ICONES = {
    notas: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7',
    wiki: 'M4 5c3-1 5-1 8 1 3-2 5-2 8-1v13c-3-1-5-1-8 1-3-2-5-2-8-1z M12 6v13',
    mapas: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z M9 4v14 M15 6v14',
    traducao: 'M3 5h10 M8 3v2 M5 5c1 4 4 7 8 8 M11 5c-1 4-4 7-8 8 M13 21l4-10 4 10 M14.5 18h5',
    cursos: 'M2 9l10-5 10 5-10 5z M6 11v5c3 2 9 2 12 0v-5',
    livros: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M5 17a3 3 0 0 1 3-3h11',
    midia: 'M4 5h16v14H4z M10 9l5 3-5 3z',
    _default: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
    estrela: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    lixeira: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
    sol: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5',
    lua: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z',
    mais: 'M12 5v14 M5 12h14',
    arca: 'M3 15h18l-2 5H5z M12 15V4 M12 5l6 5h-6',
    // editor de notas (spec 023)
    negrito: 'M7 4h6a3.5 3.5 0 0 1 0 7H7z M7 11h7a3.5 3.5 0 0 1 0 7H7z',
    italico: 'M10 4h8 M6 20h8 M15 4l-6 16',
    riscado: 'M4 12h16 M16.5 7.5C16 5.5 14.3 4.5 12 4.5c-2.5 0-4.2 1.2-4.2 3 0 1.6 1.3 2.5 3.2 3 M8 16c.5 2 2.3 3 4.7 3 2.7 0 4.5-1.2 4.5-3 0-1-.5-1.6-1.2-2',
    titulo: 'M5 5v14 M13 5v14 M5 12h8 M17 10l3-2v11',
    lista: 'M9 6h11 M9 12h11 M9 18h11 M4 6h.01 M4 12h.01 M4 18h.01',
    listanum: 'M10 6h10 M10 12h10 M10 18h10 M4 5l1.5-1v5 M4 14h3l-3 3.5h3',
    tarefa: 'M4 5h5v5H4z M5 7.5l1.2 1.2L8 6.5 M12 7.5h8 M4 14h5v5H4z M12 16.5h8',
    citacao: 'M5 7h5v5l-3 5H5l2-4H5z M14 7h5v5l-3 5h-2l2-4h-2z',
    codigo: 'M8 7l-5 5 5 5 M16 7l5 5-5 5 M14 5l-4 14',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    imagem: 'M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4 M9 9h.01',
    tabela: 'M4 5h16v14H4z M4 10h16 M4 15h16 M10 5v14',
    divisor: 'M3 12h18 M7 6h10 M7 18h10',
    menu: 'M4 6h16 M4 12h16 M4 18h16',
    voltar: 'M19 12H5 M11 6l-6 6 6 6',
    // anexos e etiquetas (spec 024)
    anexo: 'M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7'
  };
  function icone(nome, cls) {
    var s = document.createElementNS(SVG, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true'); if (cls) s.setAttribute('class', cls);
    var p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', ICONES[nome] || ICONES._default); s.appendChild(p); return s;
  }
  function el(tag, attrs, filhos) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function formatarBytes(n) {
    var u = ['B', 'KB', 'MB', 'GB', 'TB'], i = 0, v = Number(n) || 0;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return v.toLocaleString('pt-BR', { maximumFractionDigits: i ? 1 : 0 }) + ' ' + u[i];
  }
  function formatarData(s) {
    var d = new Date(s); if (isNaN(d)) return '-';
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function api(metodo, url, corpo) {
    var opt = { method: metodo, headers: { Accept: 'application/json' } };
    if (corpo) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(corpo); }
    return fetch(url, opt).then(function (r) {
      if (r.status === 204) return null;
      return r.json().catch(function () { return null; }).then(function (j) {
        if (!r.ok) { var e = new Error('HTTP ' + r.status); e.status = r.status; e.corpo = j; throw e; }
        return j;
      });
    });
  }
  function iniciarTema() {
    var btn = document.getElementById('alternar-tema'); if (!btn) return;
    function escuro() {
      var t = document.documentElement.getAttribute('data-tema');
      return t ? t === 'escuro' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    function pintar() {
      var e = escuro();
      btn.textContent = ''; btn.appendChild(icone(e ? 'sol' : 'lua'));
      btn.appendChild(el('span', { 'class': 'so-leitor', text: e ? 'Usar tema claro' : 'Usar tema escuro' }));
      btn.setAttribute('aria-label', e ? 'Usar tema claro' : 'Usar tema escuro');
    }
    btn.addEventListener('click', function () {
      var t = escuro() ? 'claro' : 'escuro'; aplicar(t);
      try { localStorage.setItem(CHAVE, t); } catch (e) { /* ignora */ }
      pintar();
    });
    pintar();
  }
  document.addEventListener('DOMContentLoaded', function () {
    iniciarTema();
  });
  window.Arca = { icone: icone, el: el, formatarBytes: formatarBytes, formatarData: formatarData, api: api };
})();
