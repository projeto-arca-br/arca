// Etiquetas das notas (funções puras, sem DOM e sem rede).
// O FlatNotes extrai "#etiqueta" de qualquer ponto do texto; o editor guarda as etiquetas
// numa única linha no começo da nota ("#a #b"), que fica oculta na folha e vira chips.
// Aceitam-se só letras minúsculas sem acento, números e hífen: "#ação" não vira etiqueta no FlatNotes.

export const LIMITE_ETIQUETA = 30;
const RE_LINHA_ETIQUETAS = /^\s*#[A-Za-z0-9-]+(?:[ \t]+#[A-Za-z0-9-]+)*\s*$/;

// Devolve { valor, aviso, erro }. `valor` vazio quando há erro.
export function normalizarEtiqueta(texto) {
  const original = String(texto === undefined || texto === null ? '' : texto).trim().replace(/^#+/, '');
  if (!original) return { valor: '', aviso: '', erro: 'Digite o nome da etiqueta.' };
  const valor = original
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!valor) return { valor: '', aviso: '', erro: 'A etiqueta precisa ter letras ou números.' };
  if (valor.length > LIMITE_ETIQUETA) return { valor: '', aviso: '', erro: 'A etiqueta pode ter no máximo ' + LIMITE_ETIQUETA + ' caracteres.' };
  const aviso = valor === original ? '' : 'Etiqueta ajustada para "' + valor + '" (sem acentos, espaços ou símbolos).';
  return { valor, aviso, erro: '' };
}

// Separa a linha de etiquetas do começo da nota. Só vale a primeira linha não vazia;
// "#etiqueta" no meio do texto continua sendo texto. Devolve { etiquetas, corpo }.
export function extrairEtiquetas(markdown) {
  const linhas = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  while (i < linhas.length && !linhas[i].trim()) i++;
  if (i >= linhas.length || !RE_LINHA_ETIQUETAS.test(linhas[i])) return { etiquetas: [], corpo: linhas.join('\n') };
  const etiquetas = [];
  linhas[i].trim().split(/\s+/).forEach((t) => {
    const e = t.slice(1).toLowerCase();
    if (!etiquetas.includes(e)) etiquetas.push(e);
  });
  let j = i + 1;
  while (j < linhas.length && !linhas[j].trim()) j++;
  return { etiquetas, corpo: linhas.slice(j).join('\n') };
}

// Junta a linha de etiquetas ao corpo (sem duplicar a linha na ida e volta).
export function montarMarkdown(etiquetas, corpo) {
  const unicas = [];
  (etiquetas || []).forEach((e) => { if (e && !unicas.includes(e)) unicas.push(e); });
  const texto = String(corpo || '');
  if (!unicas.length) return texto;
  const linha = unicas.map((e) => '#' + e).join(' ');
  return texto.trim() ? linha + '\n\n' + texto.replace(/^\n+/, '') : linha + '\n';
}

// Lê o formato real de GET /api/tags (lista de textos) e também uma lista de objetos com `name`.
export function listarNomesDeEtiquetas(resposta) {
  const nomes = [];
  (Array.isArray(resposta) ? resposta : []).forEach((t) => {
    const nome = typeof t === 'string' ? t : (t && t.name);
    if (nome && !nomes.includes(nome)) nomes.push(nome);
  });
  return nomes.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
