// DOM mínimo, escrito à mão, só para testar htmlParaMarkdown sem navegador nem bibliotecas.
// Entende o HTML que markdownParaHtml gera e o que um editor costuma produzir (tags simples e atributos).
const VAZIAS = new Set(['br', 'hr', 'img', 'input']);
const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodificar(texto) {
  return texto.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return e in ENTIDADES ? ENTIDADES[e] : m;
  });
}

class No {
  constructor(tipo, tagName, data) {
    this.nodeType = tipo;
    this.tagName = tagName;
    this.data = data;
    this.childNodes = [];
    this.atributos = {};
  }
  getAttribute(chave) { return chave in this.atributos ? this.atributos[chave] : null; }
  hasAttribute(chave) { return chave in this.atributos; }
  get checked() { return 'checked' in this.atributos; }
}

export function analisarHtml(html) {
  const raiz = new No(11, '#fragmento');
  const pilha = [raiz];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z0-9]+)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>|([^<]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const topo = pilha[pilha.length - 1];
    if (m[4] !== undefined) {
      const t = new No(3, undefined, decodificar(m[4]));
      topo.childNodes.push(t);
    } else if (m[1]) {
      const nome = m[1].toUpperCase();
      for (let i = pilha.length - 1; i > 0; i--) {
        if (pilha[i].tagName === nome) { pilha.length = i; break; }
      }
    } else if (m[2]) {
      const el = new No(1, m[2].toUpperCase());
      const reAtributo = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
      let a;
      while ((a = reAtributo.exec(m[3] || '')) !== null) {
        el.atributos[a[1]] = decodificar(a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : '');
      }
      topo.childNodes.push(el);
      if (!VAZIAS.has(m[2].toLowerCase())) pilha.push(el);
    }
  }
  return raiz;
}
