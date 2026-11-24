// H-26/H-03: las hojas propias de Reuma, Farmacia y dashboards (style*.css, farmacia_style.css) y los <style> en línea van dentro de @layer modulo y ya no llevan reglas .form-group*/.form-actions.
import fs from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FAIL ' + m); } };
for (const h of ['style.css', 'style_primera_visita.css', 'style_seguimiento.css', 'farmacia_style.css', 'style_dashboard.css', 'style_estadisticas.css']) {
  const css = fs.readFileSync(root + h, 'utf8');
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
  ok(/^\s*@layer nx\.vendor, nx\.tokens, nx\.base, nx\.piezas, modulo;/.test(sinComentarios), h + ': falta el orden de capas al principio');
  ok(/@layer modulo\s*\{/.test(sinComentarios), h + ': falta @layer modulo { ... }');
  const viejas = sinComentarios.match(/\.form-(group|group-checkbox|group-grid|actions)(?![\w-])/g) || [];
  ok(viejas.length === 0, h + ': ' + viejas.length + ' selectores .form-* sin uso');
  const llaves = (sinComentarios.match(/\{/g) || []).length - (sinComentarios.match(/\}/g) || []).length;
  ok(llaves === 0, h + ': llaves descuadradas (' + llaves + ')');
}
const seg = fs.readFileSync(root + 'style_seguimiento.css', 'utf8');
ok(/@import url\('style_primera_visita\.css'\);/.test(seg), 'style_seguimiento.css debe importar style_primera_visita.css sin layer() (esa hoja ya trae su capa)');
for (const h of ['farmacia_seguimiento.html', 'farmacia_primera_visita.html']) {
  const html = fs.readFileSync(root + h, 'utf8');
  for (const m of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) if (!/^\s*@layer nx\.vendor/.test(m[1])) ok(/^\s*(\/\*[\s\S]*?\*\/\s*)*@layer modulo\s*\{/.test(m[1]), h + ': <style> en línea sin @layer modulo');
}
console.log(fallos ? 'RESULT FAIL ' + fallos : 'RESULT OK');
process.exit(fallos ? 1 : 0);
