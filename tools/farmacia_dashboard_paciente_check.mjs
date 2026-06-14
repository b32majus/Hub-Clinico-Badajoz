#!/usr/bin/env node
// tools/farmacia_dashboard_paciente_check.mjs
// Verifica WO7G.1 — Dashboard: tratamiento principal y líneas biológicas desde contrato común

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];

function ok(msg) {
  console.log(`  ✓ ${msg}`);
  passed++;
}

function fail(msg) {
  console.log(`  ✗ ${msg}`);
  failed++;
  errors.push(msg);
}

function assert(condition, label) {
  if (condition) ok(label);
  else fail(label);
}

const htmlPath = path.join(ROOT, 'farmacia_dashboard_paciente.html');
const jsPath = path.join(ROOT, 'scripts', 'farmacia_dashboard_paciente.js');
const helperPath = path.join(ROOT, 'scripts', 'farmacia_tratamiento_common.js');
const pautasPath = path.join(ROOT, 'scripts', 'farmacia_pautas_catalog.js');
const commonPath = path.join(ROOT, 'scripts', 'farmacia_common.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const helperSrc = fs.readFileSync(helperPath, 'utf8');
const pautasSrc = fs.readFileSync(pautasPath, 'utf8');
const commonSrc = fs.readFileSync(commonPath, 'utf8');

const forbidden = 'inner' + 'HTML';

// --- WO7G.1: Dashboard desde contrato común ---

// 1. Carga FarmaciaTratamiento en HTML
assert(html.includes('scripts/farmacia_tratamiento_common.js'), 'Dashboard carga FarmaciaTratamiento');

// 2. JS referencia FarmaciaTratamiento
assert(js.includes('FarmaciaTratamiento'), 'Dashboard JS referencia FarmaciaTratamiento');
assert(js.includes('buildTreatmentFromPatient'), 'Dashboard usa buildTreatmentFromPatient');

// 3. getPatientBiologicLines ya no es lógica paralela pura (primero intenta helper)
assert(js.indexOf('window.FarmaciaTratamiento') !== -1, 'getPatientBiologicLines consulta helper primero');

// 4. Summary no usa join(' + ') para colapsar
assert(!js.includes("join(' + ')"), 'Summary no colapsa multibiológico con join +');
assert(!js.includes('activeLines.map'), 'Summary no usa activeLines.map');

// 5. Summary separa tratamiento principal de otras líneas
assert(js.includes('Tratamiento principal'), 'Summary tiene campo Tratamiento principal');
assert(js.includes('Otras líneas activas'), 'Summary tiene campo Otras líneas activas');

// 6. renderBiologicLines muestra más de una línea si existen
assert(js.includes('getPatientBiologicLines(patient)'), 'renderBiologicLines usa getPatientBiologicLines');
assert(js.includes('lines.forEach'), 'renderBiologicLines itera líneas');

// 7. Estado y relación desde el helper/contrato
assert(js.includes('biologicStateLabel(line.estado_linea)'), 'renderBiologicLines usa estado_linea del contrato');
assert(js.includes('biologicRelationLabel(line.tipo_relacion)'), 'renderBiologicLines usa tipo_relacion del contrato');

// 8. Nota incluye dosis/presentación, vía y pauta
assert(js.includes('line.dosis'), 'renderBiologicLines nota incluye dosis');
assert(js.includes('line.dosis_texto'), 'renderBiologicLines nota incluye dosis_texto');
assert(js.includes('line.via'), 'renderBiologicLines nota incluye vía');
assert(js.includes('line.pauta'), 'renderBiologicLines nota incluye pauta');
assert(js.includes('line.fecha_inicio'), 'renderBiologicLines nota incluye fecha inicio');
assert(js.includes('line.fecha_fin'), 'renderBiologicLines nota incluye fecha fin');

// 9. Sin innerHTML
assert(html.indexOf(forbidden) === -1, 'HTML dashboard no usa innerHTML');
assert(js.indexOf(forbidden) === -1, 'JS dashboard no usa innerHTML');

// 10. Dashboard no escribe tratamiento (solo lectura)
assert(js.includes('renderDashboard'), 'Dashboard renderiza sin mutar datos');
assert(js.includes('F.renderFields'), 'Dashboard usa F.renderFields (solo lectura)');

// 11. Timeline no tocado
assert(js.includes('renderTimelineTratamiento'), 'renderTimelineTratamiento conservada');
assert(js.includes('patient.tratamientos'), 'Código de timeline conservado');

// 12. Biológicos previos no colapsan como activos
assert(js.includes("line.estado_linea !== 'historico'"), 'renderDashboard filtra históricos correctamente');

console.log(`\n Total: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}`);

if (failed > 0) process.exit(1);
