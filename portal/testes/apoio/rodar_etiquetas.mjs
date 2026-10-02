// Lê JSON da entrada padrão e chama as funções puras de etiquetas.js e anexos.js:
//   { "extrair": [texto, ...] }                -> [{ etiquetas, corpo }]
//   { "montar": [[etiquetas, corpo], ...] }    -> [texto]
//   { "normalizar": [texto, ...] }             -> [{ valor, aviso, erro }]
//   { "anexos": [[resposta, { name, type }], ...] } -> [anexo | null]
// Uso: node rodar_etiquetas.mjs <caminho de etiquetas.js> <caminho de anexos.js>
import { pathToFileURL } from 'node:url';

const etiquetas = await import(pathToFileURL(process.argv[2]).href);
const anexos = await import(pathToFileURL(process.argv[3]).href);
let entrada = '';
for await (const pedaco of process.stdin) entrada += pedaco;
const pedido = JSON.parse(entrada);
const saida = {};
if (pedido.extrair) saida.extrair = pedido.extrair.map((t) => etiquetas.extrairEtiquetas(t));
if (pedido.montar) saida.montar = pedido.montar.map(([e, c]) => etiquetas.montarMarkdown(e, c));
if (pedido.normalizar) saida.normalizar = pedido.normalizar.map((t) => etiquetas.normalizarEtiqueta(t));
if (pedido.anexos) saida.anexos = pedido.anexos.map(([r, o]) => anexos.anexoDaResposta(r, o));
process.stdout.write(JSON.stringify(saida));
