/* Painel: serviços (consulta periódica), favoritos e biblioteca. */
(function () {
  'use strict';
  var A = window.Arca, el = A.el;
  var INTERVALO_MS = 15000;
  var TEXTO_ESTADO = { online: 'Online', offline: 'Offline', desativado: 'Desativado' };
  var COM_AJUDA = ['notas', 'wiki', 'mapas', 'traducao', 'cursos', 'livros', 'midia'];
  var $ = function (id) { return document.getElementById(id); };

  /* ---- serviços ---- */
  var cartoes = {};
  function montarCartao(s) {
    var h3 = el('h3'), li = el('li', { 'class': 'cartao' });
    var link = el('a', { href: s.caminho || '#', text: s.nome });
    h3.appendChild(link);
    var est = el('span', { 'class': 'estado' }, [el('span', { 'class': 'ponto', 'aria-hidden': 'true' }), el('span', { 'class': 'texto-estado' })]);
    li.appendChild(el('div', { 'class': 'cabeca' }, [A.icone(s.identificador, 'icone'), h3]));
    li.appendChild(el('p', { text: s.descricao || '' }));
    var rodape = el('div', { 'class': 'rodape' }, [est]);
    if (COM_AJUDA.indexOf(s.identificador) >= 0) rodape.appendChild(el('a', { href: '/ajuda/#' + s.identificador, text: 'Ajuda' }));
    li.appendChild(rodape);
    return { li: li, link: link, texto: est.querySelector('.texto-estado') };
  }
  function pintarCartao(c, s) {
    c.li.className = 'cartao e-' + s.estado;
    var t = TEXTO_ESTADO[s.estado] || s.estado;
    if (s.estado === 'online' && s.latencia_ms != null) t += ' · ' + Math.round(s.latencia_ms) + ' ms';
    c.texto.textContent = t;
    if (s.estado === 'desativado') {
      c.link.removeAttribute('href'); c.link.setAttribute('aria-disabled', 'true');
      c.link.title = 'Serviço desativado neste servidor';
    } else { c.link.setAttribute('href', s.caminho || '#'); c.link.removeAttribute('aria-disabled'); c.link.removeAttribute('title'); }
  }
  function desenharServicos(lista) {
    var ul = $('servicos');
    lista.forEach(function (s) {
      if (!cartoes[s.identificador]) { cartoes[s.identificador] = montarCartao(s); ul.appendChild(cartoes[s.identificador].li); }
      pintarCartao(cartoes[s.identificador], s);
    });
    var carregando = $('servicos-carregando'); if (carregando) carregando.remove();
  }
  function marcarTodosSemResposta() {
    Object.keys(cartoes).forEach(function (k) { var c = cartoes[k]; c.li.className = 'cartao e-offline'; c.texto.textContent = 'Sem resposta'; });
  }
  function definirAviso(ligado) { $('aviso').classList.toggle('visivel', ligado); }
  var temporizador = null;
  function consultar() {
    if (document.hidden) return agendar();
    A.api('GET', '/api/servicos').then(function (r) { definirAviso(false); desenharServicos(r); })
      .catch(function () { definirAviso(true); marcarTodosSemResposta(); })
      .then(agendar);
  }
  function agendar() { clearTimeout(temporizador); temporizador = setTimeout(consultar, INTERVALO_MS); }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { clearTimeout(temporizador); consultar(); } });

  /* ---- favoritos ---- */
  function carregarFavoritos() {
    return A.api('GET', '/api/favoritos').then(function (itens) {
      var ul = $('favoritos'); ul.textContent = '';
      if (!itens.length) { ul.appendChild(el('li', { 'class': 'vazio', text: 'Nenhum favorito ainda. Adicione abaixo um link para uma página da wiki, nota ou local.' })); return; }
      itens.forEach(function (f) {
        var info = el('span', { 'class': 'cresce' }, [el('a', { href: f.url, text: f.titulo })]);
        var sub = [f.categoria, f.url].filter(Boolean).join(' · ');
        info.appendChild(el('span', { 'class': 'subtitulo', text: sub }));
        var remover = el('button', { type: 'button', 'class': 'botao pequeno perigo', 'aria-label': 'Remover favorito ' + f.titulo });
        remover.appendChild(A.icone('lixeira')); remover.appendChild(el('span', { text: 'Remover' }));
        remover.addEventListener('click', function () {
          remover.disabled = true;
          A.api('DELETE', '/api/favoritos/' + encodeURIComponent(f.id)).then(carregarFavoritos)
            .catch(function () { $('favorito-mensagem').textContent = 'Não foi possível remover o favorito.'; remover.disabled = false; });
        });
        ul.appendChild(el('li', {}, [A.icone('estrela', 'icone-favorito'), info, remover]));
      });
    }).catch(function () { $('favoritos').textContent = ''; $('favoritos').appendChild(el('li', { 'class': 'vazio', text: 'Não foi possível carregar os favoritos.' })); });
  }
  function iniciarFormulario() {
    $('form-favorito').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var msg = $('favorito-mensagem'); msg.textContent = '';
      var titulo = $('favorito-titulo').value.trim(), url = $('favorito-url').value.trim(), categoria = $('favorito-categoria').value.trim();
      if (!titulo || !url) { msg.textContent = 'Informe título e endereço.'; return; }
      if (!/^(\/|https?:\/\/)/i.test(url)) { msg.textContent = 'O endereço deve começar com / (ex.: /wiki/...) ou http(s)://.'; return; }
      var corpo = { titulo: titulo, url: url }; if (categoria) corpo.categoria = categoria;
      A.api('POST', '/api/favoritos', corpo).then(function () { $('form-favorito').reset(); return carregarFavoritos(); })
        .catch(function (e) { msg.textContent = e.status === 422 ? 'Dados inválidos (título até 200 caracteres).' : 'Não foi possível salvar o favorito.'; });
    });
  }

  /* ---- biblioteca ---- */
  var TEXTO_TIPO = { zim: 'Wikipédia/ZIM', pmtiles: 'Mapa', modelo: 'Modelo' };
  function carregarBiblioteca() {
    return A.api('GET', '/api/biblioteca').then(function (r) {
      var caixa = $('biblioteca'); caixa.textContent = '';
      if (!r.itens.length) { caixa.appendChild(el('p', { 'class': 'vazio', text: 'Nenhum conteúdo instalado. Coloque arquivos em data/zim, data/maps ou data/models.' })); return; }
      var cabecalho = el('tr', {}, [el('th', { text: 'Nome' }), el('th', { 'class': 'oculta-p', text: 'Tipo' }), el('th', { 'class': 'numero', text: 'Tamanho' }), el('th', { 'class': 'oculta-p', text: 'Modificado' })]);
      var corpo = el('tbody');
      r.itens.forEach(function (i) {
        corpo.appendChild(el('tr', {}, [el('td', { text: i.nome }), el('td', { 'class': 'oculta-p', text: TEXTO_TIPO[i.tipo] || i.tipo }),
          el('td', { 'class': 'numero', text: A.formatarBytes(i.tamanho_bytes) }), el('td', { 'class': 'oculta-p', text: A.formatarData(i.modificado_em) })]));
      });
      var tabela = el('table', { 'class': 'tabela' }, [el('thead', {}, [cabecalho]), corpo]);
      caixa.appendChild(el('div', { 'class': 'tabela-envolta' }, [tabela]));
      caixa.appendChild(el('p', { 'class': 'destaque', text: r.itens.length + ' item(ns), total ' + A.formatarBytes(r.total_bytes) + '.' }));
    }).catch(function () { var c = $('biblioteca'); c.textContent = ''; c.appendChild(el('p', { 'class': 'vazio', text: 'Não foi possível carregar a biblioteca.' })); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    iniciarFormulario(); consultar(); carregarFavoritos(); carregarBiblioteca();
  });
})();
