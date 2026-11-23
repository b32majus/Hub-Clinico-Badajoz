// H-15: los 4 ficheros JS migrados no llevan colores hex escritos a mano (usan tokens --nx-*).
import fs from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const ficheros = ['scripts/farmacia_seguimiento.js', 'scripts/farmacia_excel_row_export.js', 'modules/treatmentEventsManager.js', 'modules/dataManager.js'];
let fallos = 0;
for (const f of ficheros) {
  const lineas = fs.readFileSync(root + f, 'utf8').split('\n').map((l, i) => [i + 1, l])
    .filter(([, l]) => !/^\s*(\/\/|\/\*|\*)/.test(l) && /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-zA-Z])|'#fff'/.test(l.replace(/#\d{2,4}\b/g, '')));
  if (lineas.length) { fallos++; console.log('FAIL ' + f + ' líneas ' + lineas.map(([n]) => n).slice(0, 6).join(',')); }
}
console.log(fallos ? 'RESULT FAIL ' + fallos : 'RESULT OK');
process.exit(fallos ? 1 : 0);
