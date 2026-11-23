// H-28: Seguimiento de Farmacia usa las piezas nx-campo / nx-formulario / nx-acciones y ya no las clases form-*.
import fs from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const html = fs.readFileSync(root + 'farmacia_seguimiento.html', 'utf8');
const js = fs.readFileSync(root + 'scripts/farmacia_seguimiento.js', 'utf8');
const viejo = /\bform-(group|grid|actions|label|control|select|textarea)\b/;
let fallos = 0;
function ok(c, m) { if (!c) { fallos++; console.log('FAIL ' + m); } }
const clasesHtml = [...html.matchAll(/class="([^"]*)"/g)].map(m => m[1]).filter(c => viejo.test(c));
ok(clasesHtml.length === 0, 'el HTML aún usa clases form-* (' + clasesHtml.length + ')');
const nCampos = (html.match(/class="[^"]*\bnx-campo\b/g) || []).length;
ok(nCampos >= 46, 'el HTML tiene ' + nCampos + ' nx-campo (se esperan al menos 46)');
ok(/class="[^"]*\bnx-formulario\b/.test(html), 'falta nx-formulario en el HTML');
ok(/class="[^"]*\bnx-acciones\b/.test(html), 'falta nx-acciones en el HTML');
const lineasJs = js.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => viejo.test(l));
ok(lineasJs.length === 0, 'el JS aún nombra form-* en las líneas ' + lineasJs.map(([n]) => n).slice(0, 8).join(','));
ok(js.includes(".closest('.nx-campo')"), "el JS debe buscar el campo con closest('.nx-campo')");
console.log(fallos ? 'RESULT FAIL ' + fallos : 'RESULT OK');
process.exit(fallos ? 1 : 0);
