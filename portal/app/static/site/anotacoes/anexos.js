// Anexos das notas (funções puras): tipo do arquivo, limite de tamanho e endereço no editor.
// O FlatNotes responde ao envio com { filename, url } (url relativa, já codificada, "attachments/x");
// aqui a resposta vira { arquivo, endereco, nomeDoArquivo, imagem } com o endereço do portal.

export const LIMITE_ANEXO_BYTES = 50 * 1024 * 1024;
const EXTENSOES_IMAGEM = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;
const TIPOS_IMAGEM = /^image\/(png|jpeg|gif|webp|avif|bmp|svg\+xml)$/i;

export function ehImagem(arquivo) {
  const tipo = String((arquivo && arquivo.type) || '');
  if (tipo) return TIPOS_IMAGEM.test(tipo);
  return EXTENSOES_IMAGEM.test(String((arquivo && arquivo.name) || ''));
}

export function formatarTamanho(bytes) {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
}

// Mensagem em português quando o arquivo não pode ser enviado; vazio quando está tudo certo.
export function validarArquivo(arquivo) {
  if (!arquivo || !arquivo.size) return 'O arquivo "' + ((arquivo && arquivo.name) || '') + '" está vazio.';
  if (arquivo.size > LIMITE_ANEXO_BYTES) {
    return 'O arquivo "' + arquivo.name + '" é grande demais (' + formatarTamanho(arquivo.size) + '). O limite é ' + formatarTamanho(LIMITE_ANEXO_BYTES) + '.';
  }
  return '';
}

// Descrição para o texto alternativo da imagem: o nome sem a extensão.
export function descricaoDoArquivo(nome) {
  return String(nome || '').replace(/\.[^.]+$/, '').replace(/[[\]]/g, '').trim() || 'imagem';
}

// resposta = JSON do FlatNotes ({ filename, url }); original = File enviado.
export function anexoDaResposta(resposta, original) {
  const arquivo = String((resposta && resposta.filename) || '');
  if (!arquivo) return null;
  const relativo = String((resposta && resposta.url) || '') || 'attachments/' + encodeURIComponent(arquivo);
  const caminho = relativo.startsWith('attachments/') ? relativo : 'attachments/' + encodeURIComponent(arquivo);
  return {
    arquivo,
    endereco: '/notas/' + caminho,
    nomeDoArquivo: arquivo,
    imagem: ehImagem(original || { name: arquivo }),
  };
}
