#!/usr/bin/env node
// tools/farmacia_seguimiento_check.mjs
// Verifica WO7E en Seguimiento — contrato común de tratamiento principal

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

function assertEqual(actual, expected, label) {
  if (actual === expected) ok(`${label}: ${JSON.stringify(expected)}`);
  else fail(`${label}: esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`);
}

const htmlPath = path.join(ROOT, 'farmacia_seguimiento.html');
const jsPath = path.join(ROOT, 'scripts', 'farmacia_seguimiento.js');
const helperPath = path.join(ROOT, 'scripts', 'farmacia_tratamiento_common.js');
const pautasPath = path.join(ROOT, 'scripts', 'farmacia_pautas_catalog.js');
const commonPath = path.join(ROOT, 'scripts', 'farmacia_common.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const helperSrc = fs.readFileSync(helperPath, 'utf8');
const pautasSrc = fs.readFileSync(pautasPath, 'utf8');
const commonSrc = fs.readFileSync(commonPath, 'utf8');

// --- WO7E: contrato común de tratamiento ---

// 1. FarmaciaTratamiento cargado
assert(html.includes('scripts/farmacia_tratamiento_common.js'), 'Seguimiento carga FarmaciaTratamiento');

// 2. Tipo de movimiento tiene opciones del contrato (en HTML select)
assert(html.indexOf('value="optimizacion"') !== -1, 'HTML incluye movimiento optimización');
assert(html.indexOf('value="suspension"') !== -1, 'HTML incluye movimiento suspensión');

// 3. Grid de resumen presente
assert(html.includes('fhSegTratamientoGrid'), 'Grid de resumen de tratamiento presente');

// 4. sin_cambios presente como opción de movimiento en HTML select
assert(html.indexOf('value="sin_cambios"') !== -1, 'sin_cambios presente como opción de movimiento en HTML');

// 5. biologicStateLabel maneja estados del contrato
assert(js.includes('finalizado'), 'biologicStateLabel maneja estado finalizado');
assert(js.includes('validado'), 'biologicStateLabel maneja estado validado');
assert(js.includes('no_aplica'), 'biologicStateLabel maneja no_aplica');

// 6. getTreatmentHelper existe
assert(js.includes('getTreatmentHelper'), 'Función getTreatmentHelper definida');

// 7. renderSegTreatmentSummary existe
assert(js.includes('renderSegTreatmentSummary'), 'Función renderSegTreatmentSummary definida');

// 8. Sin innerHTML
const forbidden = 'inner' + 'HTML';
assert(html.indexOf(forbidden) === -1, 'HTML de seguimiento no usa markup prohibido');
assert(js.indexOf(forbidden) === -1, 'JS de seguimiento no usa markup prohibido');

// 9. No se toca bloque de concomitantes/adicionales
assert(html.includes('modOtrosFarmacos'), 'Bloque de otros fármacos/adicionales conservado');
assert(html.includes('btnSegAddOtherDrug'), 'Botón de añadir fármaco concomitante conservado');

// --- Sandbox: validar que FarmaciaTratamiento se usa ---

const sandbox = {
  window: {
    FarmaciaDemo: {
      getQueryContext: () => ({}),
      clearChildren: () => {},
      setValue: () => {},
      setText: () => {},
      insertNoCipBanner: () => {},
      findPatientByCip: () => null,
      downloadFile: () => {},
      renderFields: () => {}
    },
    FarmaciaPautasCatalog: {},
    FarmaciaCatalog: { getSnapshot: () => null, clearSnapshot: () => {}, selectDrug: () => {} }
  },
  console,
  module: { exports: {} },
  exports: {},
  document: {
    addEventListener: () => {},
    getElementById: () => null,
    createElement: () => ({ appendChild: () => {}, setAttribute: () => {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} } }),
    querySelector: () => null,
    querySelectorAll: () => [],
    activeElement: null
  },
  setTimeout,
  clearTimeout,
  location: { search: '' }
};
// Mock URL para getQueryContext
sandbox.window.URL = class URL {
  constructor(u) { this.searchParams = new Map(); }
};
sandbox.window.URLSearchParams = class URLSearchParams {
  constructor(s) { this.params = new Map(); }
  get(k) { return this.params.get(k) || null; }
};

vm.createContext(sandbox);

// Cargar dependencias
vm.runInContext(pautasSrc, sandbox);
vm.runInContext(commonSrc, sandbox);
vm.runInContext(helperSrc, sandbox);
vm.runInContext(js, sandbox);

// Verificar que las nuevas funciones existen en el scope
const contextApi = sandbox.window.FarmaciaPrimeraVisita || {};
assert(typeof sandbox.window.FarmaciaTratamiento !== 'undefined', 'FarmaciaTratamiento disponible en sandbox');

// Verificar firstNonEmpty helper
assert(typeof sandbox.firstNonEmpty === 'undefined', 'firstNonEmpty es privada (no global)');

// --- Validar que FarmaciaTratamiento.buildTreatmentFromPatient está disponible ---
const helper = sandbox.window.FarmaciaTratamiento;
assert(helper && typeof helper.buildTreatmentFromPatient === 'function', 'helper.buildTreatmentFromPatient existe');

// Probar con paciente simple
const patientSimple = { cip: 'CIP-TEST-001', farmaco: 'Cosentyx', principioActivo: 'Secukinumab', dosis: '300 mg', via: 'SC', pauta: 'Cada 4 semanas' };
const result = helper.buildTreatmentFromPatient(patientSimple, { returnArray: true });
assert(Array.isArray(result), 'buildTreatmentFromPatient devuelve array');
if (result.length > 0) {
  const t = result[0];
  assert(!!t.farmaco_nombre || !!t.nombre_comercial, 'tratamiento tiene nombre');
  assert(t.estado_linea !== undefined, 'tratamiento tiene estado_linea');
  assert(t.tipo_relacion !== undefined, 'tratamiento tiene tipo_relacion');
}

console.log('\n┌──────────────────────────────────────────────┐');
console.log(`│ Resultados: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}   │`);
console.log('└──────────────────────────────────────────────┘');

if (failed > 0) process.exit(1);
