// H-28: farmacia_style.css ya no tiene reglas .form-* y ninguna página ni script de Farmacia las usa.
import fs from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
let fallos = 0;
function ok(c, m) { if (!c) { fallos++; console.log('FAIL ' + m); } }
const css = fs.readFileSync(root + 'farmacia_style.css', 'utf8');
const reglas = css.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /\.form-[a-z]/.test(l));
ok(reglas.length === 0, 'farmacia_style.css aún tiene reglas .form-* en las líneas ' + reglas.map(([x]) => x).slice(0, 8).join(','));
const viejo = /\bform-(group|grid|actions|label|control|select|textarea|hint)\b/;
const ficheros = fs.readdirSync(root).filter(f => /^farmacia_.*\.html$/.test(f)).map(f => f)
  .concat(fs.readdirSync(root + 'scripts').filter(f => /^farmacia.*\.js$/.test(f)).map(f => 'scripts/' + f));
for (const f of ficheros) {
  const usos = fs.readFileSync(root + f, 'utf8').split('\n').map((l, i) => [i + 1, l])
    .filter(([, l]) => viejo.test(l) && !/closest\(/.test(l));
  ok(usos.length === 0, f + ' aún nombra clases form-* en las líneas ' + usos.map(([x]) => x).slice(0, 5).join(','));
}
console.log(fallos ? 'RESULT FAIL ' + fallos : 'RESULT OK');
process.exit(fallos ? 1 : 0);
