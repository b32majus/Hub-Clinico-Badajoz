// H-26: Primera visita de Reuma (Seguimiento: pasar «seguimiento.html» como argumento) usan nx-campo / nx-formulario / nx-casilla y ya no las clases form-*.
import fs from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const paginas = (process.argv[2] ? process.argv[2].split(',') : ['primera_visita.html']);
let fallos = 0;
function ok(c, m) { if (!c) { fallos++; console.log('FAIL ' + m); } }
for (const p of paginas) {
  const html = fs.readFileSync(root + p, 'utf8');
  const linea = (i) => html.slice(0, i).split('\n').length;
  const viejo = [...html.matchAll(/class="([^"]*)"/g)].filter(m => /(^|\s)form-(group|group-grid|group-checkbox|actions|label|control|select|textarea)(\s|$)/.test(m[1]));
  ok(viejo.length === 0, p + ': clases viejas form-* en las líneas ' + viejo.slice(0, 8).map(m => linea(m.index)).join(','));
  const sinClase = [...html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)].filter(m => {
    const a = m[2];
    const tipo = (/type="([a-z]*)"/.exec(a) || [, 'text'])[1];
    if (m[1] === 'input' && ['checkbox', 'radio', 'hidden', 'button', 'file', 'submit', 'range'].includes(tipo)) return false;
    return !/class="[^"]*\bnx-campo__control\b/.test(a);
  });
  ok(sinClase.length === 0, p + ': ' + sinClase.length + ' controles sin nx-campo__control (líneas ' + sinClase.slice(0, 8).map(m => linea(m.index)).join(',') + ')');
  const etiquetas = [...html.matchAll(/<div class="nx-campo[^"]*"[^>]*>\s*<label\b([^>]*)>/g)].filter(m => !/\bnx-campo__etiqueta\b/.test(m[1]));
  ok(etiquetas.length === 0, p + ': ' + etiquetas.length + ' etiquetas de nx-campo sin nx-campo__etiqueta (líneas ' + etiquetas.slice(0, 8).map(m => linea(m.index)).join(',') + ')');
  const cas = [...html.matchAll(/<label\b([^>]*)>\s*<input[^>]*type="checkbox"/g)].filter(m => !/\bnx-casilla\b/.test(m[1]));
  ok(cas.length === 0, p + ': ' + cas.length + ' casillas sin nx-casilla (líneas ' + cas.slice(0, 8).map(m => linea(m.index)).join(',') + ')');
}
console.log(fallos ? 'RESULT FAIL ' + fallos : 'RESULT OK');
process.exit(fallos ? 1 : 0);
