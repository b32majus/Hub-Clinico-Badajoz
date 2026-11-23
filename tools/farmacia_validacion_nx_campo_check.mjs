// H-28: Validación de Farmacia usa nx-campo / nx-formulario / nx-acciones / nx-casilla y ya no las clases form-* ni checklist-chip.
import fs from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const html = fs.readFileSync(root + 'farmacia_validacion.html', 'utf8');
const js = fs.readFileSync(root + 'scripts/farmacia_validacion.js', 'utf8');
const viejo = /\b(form-(group|grid|actions|label|control|select|textarea)|checklist-chip)\b/;
let fallos = 0;
function ok(c, m) { if (!c) { fallos++; console.log('FAIL ' + m); } }
const clasesHtml = [...html.matchAll(/class="([^"]*)"/g)].map(m => m[1]).filter(c => viejo.test(c));
ok(clasesHtml.length === 0, 'el HTML aún usa clases viejas (' + clasesHtml.length + ')');
const n = (re) => (html.match(re) || []).length;
ok(n(/class="[^"]*\bnx-campo\b/g) >= 100, 'nx-campo en el HTML: ' + n(/class="[^"]*\bnx-campo\b/g) + ' (se esperan al menos 100)');
ok(/class="[^"]*\bnx-formulario\b/.test(html), 'falta nx-formulario');
ok(/class="[^"]*\bnx-acciones\b/.test(html), 'falta nx-acciones');
ok(n(/<label class="nx-casilla"><input type="checkbox"/g) >= 5, 'faltan casillas nx-casilla (hay ' + n(/<label class="nx-casilla"><input type="checkbox"/g) + ', se esperan al menos 5)');
const lineasJs = js.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => viejo.test(l));
ok(lineasJs.length === 0, 'el JS aún nombra clases viejas en las líneas ' + lineasJs.map(([x]) => x).slice(0, 8).join(','));
console.log(fallos ? 'RESULT FAIL ' + fallos : 'RESULT OK');
process.exit(fallos ? 1 : 0);
