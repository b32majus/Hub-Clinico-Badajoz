#!/usr/bin/env node
// tools/farmacia_primera_visita_check.mjs
// Verifica WO7D en Primera visita

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

const htmlPath = path.join(ROOT, 'farmacia_primera_visita.html');
const jsPath = path.join(ROOT, 'scripts', 'farmacia_primera_visita.js');
const helperPath = path.join(ROOT, 'scripts', 'farmacia_tratamiento_common.js');
const pautasPath = path.join(ROOT, 'scripts', 'farmacia_pautas_catalog.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const helperSrc = fs.readFileSync(helperPath, 'utf8');
const pautasSrc = fs.readFileSync(pautasPath, 'utf8');

function countMatches(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

assert(countMatches(html, /id="fhPvFarmaco"/g) === 1, 'solo hay un campo fhPvFarmaco editable');
assert(countMatches(html, /id="fhPvDosis"/g) === 1, 'solo hay un campo fhPvDosis editable');
assert(countMatches(html, /id="fhPvPauta"/g) === 1, 'solo hay un campo fhPvPauta editable');
assert(countMatches(html, /id="fhPvVia"/g) === 1, 'solo hay un campo fhPvVia editable');

const treatmentSectionPos = html.indexOf('Tratamiento validado por Farmacia');
const farmacoPos = html.indexOf('id="fhPvFarmaco"');
assert(treatmentSectionPos !== -1 && farmacoPos > treatmentSectionPos, 'el bloque editable de tratamiento está en la tarjeta de tratamiento validado');
assert(html.includes('scripts/farmacia_tratamiento_common.js'), 'Primera visita carga FarmaciaTratamiento');

// WO7D.1: no debe existir tarjeta azul informativa
assert(!html.includes('fhPvTreatmentNotice'), 'no existe la tarjeta azul informativa');
// WO7D.1: no debe existir subbloque redundante de búsqueda
assert(!html.includes('fhPvAutocompleteBlock'), 'no existe subbloque redundante Buscar fármaco en catálogo');
// WO7D.1: fhPvFarmaco debe estar dentro de autocomplete-wrapper
const wrapperStart = html.indexOf('autocomplete-wrapper');
const farmacoInWrapper = wrapperStart !== -1 && html.indexOf('id="fhPvFarmaco"') > wrapperStart;
assert(farmacoInWrapper, 'fhPvFarmaco está dentro de autocomplete-wrapper');
// WO7D.1: dropdown debe existir junto a fhPvFarmaco
assert(html.includes('fhPvAutocompleteDropdown'), 'dropdown autocomplete presente en HTML');
// WO7D.1: no debe referenciar fhPvDrugSearch en JS (eliminado)
assert(!js.includes('fhPvDrugSearch'), 'JS no referencia fhPvDrugSearch (eliminado)');
// WO7D.1: z-index style para dropdown
assert(html.includes('z-index: 1000'), 'estilo z-index para dropdown presente');
// WO7D.2: servicio origen como select con opciones
assert(html.indexOf('id=\"fhPvServicio\"') !== -1 && html.indexOf('select') < html.indexOf('id=\"fhPvServicio\"'), 'Servicio origen es un select');
assert(html.includes('Dermatología') && html.includes('Reumatología') && html.includes('Digestivo'), 'Servicio origen tiene opciones guiadas');
assert(html.includes('fhPvServicioOtro'), 'Servicio origen tiene campo Otro');
// WO7D.2: patología como select con opciones guiadas
assert(html.indexOf('id=\"fhPvPatologia\"') !== -1 && html.indexOf('select') < html.indexOf('id=\"fhPvPatologia\"'), 'Patología / indicación es un select');
assert(html.includes('fhPvPatologiaOtro'), 'Patología tiene campo Otra');
// WO7D.2: tratamiento no se ha eliminado
assert(html.includes('fhPvFarmaco'), 'Campo fhPvFarmaco sigue presente');
assert(html.includes('fhPvAutocompleteDropdown'), 'Dropdown autocomplete sigue presente');

const sandbox = {
  window: {
    FarmaciaDemo: {
      getQueryContext: () => ({}),
      clearChildren: () => {},
      renderFields: () => {},
      setValue: () => {},
      insertNoCipBanner: () => {},
      findPatientByCip: () => null,
      downloadFile: () => {}
    }
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
  clearTimeout
};
vm.createContext(sandbox);
vm.runInContext(pautasSrc, sandbox);
vm.runInContext(helperSrc, sandbox);
vm.runInContext(js, sandbox);

const api = sandbox.window.FarmaciaPrimeraVisita;
assert(api && typeof api.buildPrimaryTreatmentFromContext === 'function', 'FarmaciaPrimeraVisita expone API de tratamiento');
assert(sandbox.window.FarmaciaTratamiento, 'FarmaciaTratamiento está disponible en el entorno cargado');

const ctxTreatment = api.buildPrimaryTreatmentFromContext({ cip: 'CIP-PV-001', patient: null });
assertEqual(ctxTreatment.paciente_cip, 'CIP-PV-001', 'paciente sin tratamiento conserva paciente_cip');
assert('tratamiento_id' in ctxTreatment && 'pauta_codigo' in ctxTreatment && 'tipo_relacion' in ctxTreatment, 'seleccion genera objeto con shape común');

const selectedTreatment = api.buildPrimaryTreatmentFromSelection({
  display_name: 'Secukinumab 300 mg',
  nombre_comercial: 'Cosentyx',
  principio_activo: 'Secukinumab',
  nombre_presentacion: '300 mg pluma',
  dosis: '300 mg',
  via: 'SC',
  codigo_nacional: '123456',
  nregistro: 'EU/1/99/999',
  drug_id: 'CIMA-TEST',
  source_type: 'CIMA'
}, { cip: 'CIP-PV-002' });
assertEqual(selectedTreatment.paciente_cip, 'CIP-PV-002', 'paciente con CIP conserva paciente_cip');
assertEqual(selectedTreatment.source_type, 'CIMA', 'selección catálogo conserva source_type');
assertEqual(selectedTreatment.tipo_relacion, 'principal', 'selección manual desde primera visita usa relación principal');
assertEqual(selectedTreatment.codigo_nacional, '123456', 'selección catálogo conserva CN');

const sandboxNoHelper = {
  window: {
    FarmaciaDemo: sandbox.window.FarmaciaDemo,
    FarmaciaPautasCatalog: sandbox.window.FarmaciaPautasCatalog
  },
  console,
  module: { exports: {} },
  exports: {},
  document: sandbox.document,
  setTimeout,
  clearTimeout
};
vm.createContext(sandboxNoHelper);
vm.runInContext(js, sandboxNoHelper);
const fallbackApi = sandboxNoHelper.window.FarmaciaPrimeraVisita;
const fallbackTreatment = fallbackApi.buildPrimaryTreatmentFromContext({ cip: 'CIP-PV-003', patient: null });
assertEqual(fallbackTreatment.paciente_cip, 'CIP-PV-003', 'degrada de forma controlada sin helper común');
assertEqual(fallbackTreatment.farmaco_nombre, '', 'sin tratamiento no genera tratamiento fantasma');

const forbidden = 'inner' + 'HTML';
assert(html.indexOf(forbidden) === -1, 'HTML de primera visita no usa markup prohibido');
assert(js.indexOf(forbidden) === -1, 'JS de primera visita no usa markup prohibido');

console.log('\n┌──────────────────────────────────────────────┐');
console.log(`│ Resultados: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}   │`);
console.log('└──────────────────────────────────────────────┘');

if (failed > 0) process.exit(1);
