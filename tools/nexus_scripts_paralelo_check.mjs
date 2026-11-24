// Comprueba que ninguna página de la app carga scripts en fila (24-11-2026).
//
// Por qué: la política de seguridad va en <meta http-equiv="Content-Security-Policy">
// (GitHub Pages no deja poner cabeceras). Con ese <meta>, Chromium deja de pedir por
// adelantado los <script src> clásicos: se descargan de uno en uno y con red lenta la
// carga pasa de ~2 s a 6-7 s. Con `defer` (o type="module") se piden todos a la vez y
// se ejecutan en el mismo orden.
//
// Regla: en cada .html de la raíz, todo <script src> lleva `defer`, `async` o
// type="module"; y no hay scripts escritos en el HTML salvo los que solo esperan a
// DOMContentLoaded (si se ejecutaran antes que los `defer`, cambiaría el orden).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const pages = readdirSync(root).filter((f) => f.endsWith('.html')).sort();
const fallos = [];
let conCsp = 0;

for (const page of pages) {
  const html = readFileSync(path.join(root, page), 'utf8');
  if (html.includes('http-equiv="Content-Security-Policy"')) conCsp++;
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1];
    const body = m[2].trim();
    if (/\bsrc=/.test(attrs)) {
      const ok = /\bdefer\b/.test(attrs) || /\basync\b/.test(attrs) || /type="module"/.test(attrs);
      if (!ok) fallos.push(`${page}: <script${attrs}> bloquea (falta defer)`);
    } else if (body && !/type="application\/(ld\+)?json"/.test(attrs)) {
      const soloEspera = /^window\.addEventListener\('DOMContentLoaded',\s*function\s*\(\)\s*\{[^{}]*\}\);$/.test(body.replace(/\s+/g, ' '));
      if (!soloEspera) fallos.push(`${page}: script escrito en el HTML (llévalo a un fichero con defer): ${body.slice(0, 60)}…`);
    }
  }
}

if (pages.length < 19) fallos.push(`solo ${pages.length} páginas en la raíz; se esperaban 19 o más`);
if (conCsp === 0) fallos.push('ninguna página tiene la política de seguridad: revisar el check');

if (fallos.length) {
  console.log(`FALLA nexus_scripts_paralelo_check: ${fallos.length} problemas`);
  for (const f of fallos.slice(0, 15)) console.log('  ' + f);
  process.exit(1);
}
console.log(`ok nexus_scripts_paralelo_check: ${pages.length} páginas, todos los scripts en paralelo`);
