// Lê JSON da entrada padrão ({ "casos": [texto, ...] }) e imprime, para cada texto,
// { html, markdown } onde markdown = htmlParaMarkdown(analisarHtml(markdownParaHtml(texto))).
// Com { "dom": [html, ...] } imprime htmlParaMarkdown direto sobre o HTML dado (como se viesse do editor).
import { pathToFileURL } from 'node:url';
import { analisarHtml } from './dom_minimo.mjs';

const conversor = await import(pathToFileURL(process.argv[2]).href);
let entrada = '';
for await (const pedaco of process.stdin) entrada += pedaco;
const pedido = JSON.parse(entrada);
const saida = {};
if (pedido.casos) {
  saida.casos = pedido.casos.map((texto) => {
    const html = conversor.markdownParaHtml(texto);
    return { html, markdown: conversor.htmlParaMarkdown(analisarHtml(html)) };
  });
}
if (pedido.dom) saida.dom = pedido.dom.map((html) => conversor.htmlParaMarkdown(analisarHtml(html)));
process.stdout.write(JSON.stringify(saida));
