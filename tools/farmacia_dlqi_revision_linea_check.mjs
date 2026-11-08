#!/usr/bin/env node
// tools/farmacia_dlqi_revision_linea_check.mjs
// Decisiones de Sil 08-11: (1) DLQI con la misma redacción en Quick View y
// dashboards (11–20 «Efecto grave», 21–30 «Efecto muy grave»);
// (2) «Revisión de línea» fuera del desplegable de Seguimiento (los datos
// antiguos con ese valor se siguen leyendo).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const decode = (s) => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

let failed = 0;
function check(name, ok) {
  if (!ok) failed++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
}

// 1. Quick View: la función DLQI de farmacia_index.js
const indexJs = read('scripts', 'farmacia_index.js');
const dlqiLine = (indexJs.match(/^\s*DLQI:\s*function[^\n]*$/m) || [''])[0];
let dlqi = null;
try { dlqi = new Function('return ({' + dlqiLine.replace(/,\s*$/, '') + '}).DLQI;')(); } catch (e) { dlqi = null; }
check('Quick View: existe la función DLQI', typeof dlqi === 'function');
const expected = [[0, 'Sin efecto'], [1, 'Sin efecto'], [2, 'Efecto pequeño'], [5, 'Efecto pequeño'],
  [6, 'Efecto moderado'], [10, 'Efecto moderado'], [11, 'Efecto grave'], [20, 'Efecto grave'],
  [21, 'Efecto muy grave'], [30, 'Efecto muy grave']];
expected.forEach(([v, label]) => {
  check(`Quick View: DLQI ${v} → «${label}»`, typeof dlqi === 'function' && dlqi(v) === label);
});

// 2. Dashboards: leyenda de tramos idéntica
const LEYENDA = 'DLQI: 0-1 sin efecto · 2-5 efecto pequeño · 6-10 efecto moderado · 11-20 efecto grave · 21-30 efecto muy grave';
['farmacia_dashboard_paciente.js', 'farmacia_dashboard_longitudinal.js'].forEach((f) => {
  const src = decode(read('scripts', f));
  check(`${f}: leyenda DLQI con la redacción acordada`, src.includes(LEYENDA));
  check(`${f}: sin «muy importante» ni «extremadamente»`, !/efecto muy importante|efecto extremadamente/.test(src));
});

// 3. Seguimiento: desplegable de movimiento terapéutico
const html = read('farmacia_seguimiento.html');
const select = (html.match(/<select class="form-select" id="fhSegTipoRelacionTerapia">[\s\S]*?<\/select>/) || [''])[0];
const values = [...select.matchAll(/value="([^"]*)"/g)].map((m) => m[1]);
check('Seguimiento: desplegable = sin_cambios, optimizacion, suspension', JSON.stringify(values) === JSON.stringify(['sin_cambios', 'optimizacion', 'suspension']));
check('Seguimiento: sin el texto «Revisión de línea» en el HTML', !html.includes('Revisión de línea'));

// 4. Datos antiguos: el valor sigue reconocido al leer/exportar
check('Lector: revision_linea sigue en TIPO_MOVIMIENTO_VALUES', /TIPO_MOVIMIENTO_VALUES\s*=\s*\[[^\]]*"revision_linea"/.test(read('scripts', 'farmacia_tratamiento_common.js')));
check('Exportador: revision_linea sigue mapeado', read('scripts', 'farmacia_seguimiento.js').includes("relation === 'revision_linea'"));

if (failed) {
  console.error(`\n${failed} comprobación(es) fallida(s)`);
  process.exit(1);
}
console.log('\nOK');
