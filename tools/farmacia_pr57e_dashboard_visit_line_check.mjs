#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const helperSource = read('scripts', 'farmacia_longitudinal_normalizer.js');
const context = { window: {} };
vm.runInNewContext(helperSource, context, { filename: 'farmacia_longitudinal_normalizer.js' });
const normalize = context.window.FarmaciaLongitudinal.normalizePatient;
let failures = 0;

function check(condition, label) {
  console.log(`${condition ? '✓' : '✗'} ${label}`);
  if (!condition) failures++;
}

const input = {
  marker: { keep: true },
  proms: [
    { visit_id: 'V1', tipo_prom: 'DLQI', valor: 11 },
    { visit_id: 'V1', tipo_prom: 'DLQI', valor: 12 },
    { visit_id: 'VX', tipo_prom: 'HAQ', valor: 2 },
    { tipo_prom: 'EVA dolor', valor: 6 },
    { tipo_prom: 'EVA prurito', valor: 'No recogido' }
  ],
  filas_fh: [
    { visit_id: 'V2', fecha: '2026-07-02', line_id: 'L2', tratamiento: 0, estado: false, evaluated: true, dispensed: false, prom: { tipo_prom: 'DLQI', valor: 0 }, evento_adverso: { ea_id: 'EA-1', tipo: 'EA' } },
    { visit_id: 'V1', fecha: '2026-07-01', line_id: 'L1', tratamiento: 'Tratamiento A', estado_linea: 'activo', evaluated: true, dispensed: true, prom: { tipo_prom: 'DLQI', valor: 0 }, evento_adverso: { ea_id: 'EA-2', tipo: 'EA 2' } },
    { visit_id: 'V1', fecha: '2026-07-01', line_id: 'L3', tratamiento: 'Tratamiento B', evaluated: true, dispensed: false, prom: { tipo_prom: 'DLQI', valor: 99 }, evento_adverso: { ea_id: 'EA-2', tipo: 'duplicado' } },
    { visit_id: 'V1', fecha: '2026-07-01', line_id: 'L3', tratamiento: null, estado: 'anadido', prom: { tipo_prom: 'HAQ', valor: 1 }, evento_adverso: { tipo: 'sin id A' } },
    { visit_id: 'V3', fecha: '2026-07-01', prom: { tipo_prom: 'DLQI', valor: 4 }, evento_adverso: { tipo: 'sin id A' } },
    { visit_id: 'V4', fecha: '2026-07-01' },
    { fecha: '2026-07-03', prom: { tipo_prom: 'DLQI', valor: 4 }, evento_adverso: { tipo: 'sin id B' } }
  ]
};
const before = JSON.stringify(input);
const result = normalize(input);

check(typeof normalize === 'function' && result !== input && result.marker !== input.marker && JSON.stringify(input) === before, 'helper puro: devuelve copia y no muta la entrada');
check(result.visitas_fh.length === 5 && result.visitas_fh[0].visit_id === 'V1' && result.visitas_fh[1].visit_id === 'V3' && result.visitas_fh[2].visit_id === 'V4', 'agrupa solo visit_id explícito y ordena fecha/entrada estable en empates');
check(result.visitas_fh[0].lineas.length === 2 && result.visitas_fh[0].lineas.map((line) => line.line_id).join(',') === 'L1,L3', 'una visita compartida conserva dos identidades line_id separadas');
check(result.visitas_fh[0].lineas[0].tratamiento === 'Tratamiento A' && result.visitas_fh[0].lineas[0].estado_linea === 'activo' && result.visitas_fh[0].lineas[1].tratamiento === 'Tratamiento B' && result.visitas_fh[0].lineas[1].estado === 'anadido', 'cada line_id combina primeros campos explícitos repartidos entre filas sin fuga ni borrado por ausentes');
check(result.proms.length === 8 && result.visitas_fh[0].proms.length === 2 && result.visitas_fh[0].proms[0].valor === 11 && result.visitas_fh[0].proms[1].tipo_prom === 'HAQ', 'PROM superior se deduplica y adjunta una vez antes del PROM de fila coincidente');
check(result.proms.some((prom) => prom.visit_id === 'VX') && result.visitas_fh.every((visit) => visit.visit_id !== 'VX'), 'PROM superior sin visita coincidente sigue global y no inventa visita');
check(result.eventos_adversos.length === 5 && result.visitas_fh[0].eventos_adversos.length === 2, 'EA deduplica solo ea_id explícito y conserva eventos sin ea_id separados');
check(result.visitas_fh.find((visit) => visit.visit_id === 'V1').lineas[0].dispensed === true && result.visitas_fh.find((visit) => visit.visit_id === 'V2').lineas[0].dispensed === false, 'dispensación explícita conserva un true y un false');
check(result.visitas_fh.find((visit) => visit.visit_id === 'V2').proms[0].valor === 0, 'PROM explícito conserva el valor cero');
check(result.proms.some((prom) => !Object.hasOwn(prom, 'visit_id') && prom.tipo_prom === 'EVA prurito' && prom.valor === 'No recogido'), 'PROM independiente sin identidad FH conserva “No recogido” literal');
check(result.visitas_fh[4].visit_id === undefined && result.visitas_fh[4].lineas[0].line_id === undefined, 'no se inventan visit_id ni line_id ausentes');
check(result.visitas_fh[1].lineas[0].line_id === undefined && !Object.hasOwn(result.eventos_adversos[4], 'ea_id'), 'identidades de línea y EA ausentes permanecen ausentes');
check(result.visitas_fh.find((visit) => visit.visit_id === 'V2').lineas[0].tratamiento === 0 && result.visitas_fh.find((visit) => visit.visit_id === 'V2').lineas[0].estado === false, 'tratamiento cero y estado false se preservan sin coerción');

const legacy = normalize({
  proms: [{ tipo_prom: 'DLQI', valor: 7 }, { tipo_prom: 'DLQI', valor: 7 }],
  eventos_adversos: [{ tipo: 'igual' }, { tipo: 'igual' }],
  filas_fh: [{ fecha: '2026-01-01' }, { fecha: '2026-01-01' }]
});
check(legacy.proms.length === 2 && legacy.eventos_adversos.length === 2 && legacy.visitas_fh.length === 2 && legacy.visitas_fh.every((visit) => visit.lineas.length === 1), 'dataset legado sin IDs sigue visible y no se deduplica por contenido');

const fixture = JSON.parse(read('data', 'demo', 'farmacia', 'farmacia_longitudinal_demo_v0_3.json'));
const fh004 = fixture.pacientes.find((patient) => patient.cip === 'CIP-DEMO-FH-004');
const fixtureResult = normalize(fh004);
check(fh004.filas_fh.length === 2 && fh004.filas_fh[0].visit_id === fh004.filas_fh[1].visit_id && fh004.filas_fh[0].prom.tipo_prom === 'EVA dolor' && fh004.filas_fh[1].prom.tipo_prom === 'EVA dolor' && fh004.filas_fh[0].prom.valor === 0 && fh004.filas_fh[1].prom.valor === 0 && fh004.filas_fh[0].evento_adverso.ea_id === fh004.filas_fh[1].evento_adverso.ea_id, 'fixture FH-004 contiene dos filas fuente con EVA dolor cero y EA duplicados');
check(fixtureResult.visitas_fh.length === 1 && fixtureResult.visitas_fh[0].lineas.length === 2 && fixtureResult.visitas_fh[0].proms.length === 1 && fixtureResult.visitas_fh[0].proms[0].tipo_prom === 'EVA dolor' && fixtureResult.visitas_fh[0].proms[0].valor === 0 && fixtureResult.visitas_fh[0].eventos_adversos.length === 1 && fixtureResult.eventos_adversos.length === 1, 'fixture FH-004 normaliza a una visita, dos líneas, un EVA dolor cero y un EA visible');
check(fixtureResult.visitas_fh[0].lineas[0].tratamiento.includes('Belimumab') && fixtureResult.visitas_fh[0].lineas[0].estado_linea === 'activo' && fixtureResult.visitas_fh[0].lineas[1].tratamiento.includes('Rituximab') && fixtureResult.visitas_fh[0].lineas[1].estado === 'anadido', 'fixture conserva tratamiento y estado distintos por line_id');
check(fixtureResult.visitas_fh[0].lineas.filter((line) => line.dispensed === true).length === 1 && fixtureResult.visitas_fh[0].lineas.filter((line) => line.dispensed === false).length === 1, 'fixture conserva explícitamente una dispensación true y una false');

const helperName = 'scripts/farmacia_longitudinal_normalizer.js';
const consumers = [
  ['farmacia_dashboard_paciente.html', 'scripts/farmacia_dashboard_paciente.js'],
  ['farmacia_dashboard_longitudinal.html', 'scripts/farmacia_dashboard_longitudinal.js']
];
consumers.forEach(([htmlName, jsName]) => {
  const html = read(htmlName);
  const js = read(...jsName.split('/'));
  check(html.indexOf(helperName) >= 0 && html.indexOf(helperName) < html.indexOf(jsName) && html.includes(jsName + '?v=20260728-pr57e'), `${htmlName} carga helper antes del consumidor con caché PR57E`);
  check(js.includes('window.FarmaciaLongitudinal.normalizePatient') && js.includes('.map(function (patient) { return normalize(patient); })'), `${jsName} normaliza inmediatamente el dataset con la API compartida`);
  check(js.includes("parts.push('Tratamiento: '") && js.includes("parts.push('Estado: '"), `${jsName} muestra tratamiento y estado agrupados por line_id`);
});

check(!/(localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|FarmaciaSeguimiento)/.test(helperSource) && !helperSource.includes('fetch('), 'helper no conecta storage, backend ni Seguimiento en memoria');

console.log(`\nPR57E dashboard visit/line check: ${failures ? 'FAIL' : 'PASS'}`);
process.exitCode = failures ? 1 : 0;
