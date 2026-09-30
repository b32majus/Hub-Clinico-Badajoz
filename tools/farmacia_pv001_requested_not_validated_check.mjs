#!/usr/bin/env node
// tools/farmacia_pv001_requested_not_validated_check.mjs
// WO-NEXUS-FARMACIA-PV-001 (#482) — Oracle focalizado PV-001.
//
// Invariante clínico congelado (no debilitable para hacer pasar el fix):
//   tratamiento solicitado != tratamiento validado;
//   tratamiento previo != nuevo tratamiento capturado;
//   la mera existencia de ctx.patient NO implica validado;
//   es_validado_farmacia=true requiere evidencia explícita soportada;
//   requested-only NO prehidrata la captura de Primera Visita;
//   seleccionar catálogo no autovalida.
//
// R1 — caso blocker CIP-DEMO-FH-002 (pending/requested-only, dataset demo real):
//      nunca 'validado', nunca es_validado_farmacia=true, captura no prehidratada.
// R2 — control explícitamente validado (FH-003 estado 'validated'; FH-001
//      estado 'followup' con tratamiento propio): comportamiento conservado.
// R3 — camino V2/raw: raw con tratamientoValidado → 'validado'; raw sin
//      tratamientoValidado → 'principal' (regresión guardada).
// R4 — selección profesional: la selección de catálogo no autovalida y la
//      captura manual sigue funcionando.
//
// Los casos legacy usan los pacientes demo REALES cargados de
// scripts/farmacia_common.js (sin fixtures inventados); las aserciones de
// anclaje (G1–G4) congelan los campos del contrato publicado que hacen
// ejecutable cada caso.

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];

function ok(msg) { console.log(`  ✓ ${msg}`); passed++; }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; errors.push(msg); }
function assert(condition, label) { condition ? ok(label) : fail(label); }
function assertEqual(actual, expected, label) {
  if (actual === expected) ok(`${label}: ${JSON.stringify(expected)}`);
  else fail(`${label}: esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`);
}

const readScript = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const pautasSrc = readScript('scripts/farmacia_pautas_catalog.js');
const helperSrc = readScript('scripts/farmacia_tratamiento_common.js');
const excelSrc = readScript('scripts/farmacia_excel_row_export.js');
const commonSrc = readScript('scripts/farmacia_common.js');
const jsSrc = readScript('scripts/farmacia_primera_visita.js');

// ---------- sandbox ----------
function makeStorageMock() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(String(k), String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; }
  };
}

function makeNode(tag = 'div') {
  const node = {
    tagName: String(tag).toUpperCase(),
    value: '',
    textContent: '',
    className: '',
    children: [],
    options: [],
    id: '',
    closest: () => null,
    appendChild(child) { this.children.push(child); if (this.tagName === 'SELECT') this.options.push(child); return child; },
    append(...kids) { kids.forEach((k) => this.appendChild(k)); },
    insertAdjacentElement() {},
    removeChild(child) { const i = this.children.indexOf(child); if (i !== -1) this.children.splice(i, 1); return child; },
    get firstChild() { return this.children[0] || null; },
    get parentNode() { return { removeChild() {} }; },
    setAttribute(name, value) { this[`attr_${name}`] = String(value); },
    addEventListener() {},
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      toggle(c, force) { (force === undefined ? !this._set.has(c) : force) ? this._set.add(c) : this._set.delete(c); },
      contains(c) { return this._set.has(c); }
    }
  };
  return node;
}

const elementStore = new Map();
const knownIds = [
  'fhPvCip', 'fhPvServicio', 'fhPvServicioOtro', 'fhPvPatologia', 'fhPvPatologiaOtro',
  'fhPvFechaValidacion', 'fhPvInduccionSolicitada', 'fhPvAnalitica',
  'fhPvFarmaco', 'fhPvDosis', 'fhPvVia', 'fhPvPauta', 'fhPvPautaOtro',
  'fhPvFecha', 'fhPvInduccionRealizada', 'fhPvEstratificacion', 'fhPvProms', 'fhPvNotas',
  'fhPvTratamientoGrid', 'fhPvNoCipBanner', 'fhPvCipSearchNotice',
  'fhPvAutocompleteDropdown', 'fhPvExportV2Btn', 'fhPvExportV2Status',
  'fhPvExportTxt', 'fhPvExportCsv', 'fhPvExcelExportBtn',
  'fhPvEvaDolorRange', 'fhPvEvaPruritoRange', 'fhPvEvaDolorValue', 'fhPvEvaPruritoValue',
  'fhPvDlqiTotal', 'fhPvDlqiInterp'
];
knownIds.forEach((id) => { const n = makeNode(id === 'fhPvTratamientoGrid' ? 'div' : 'input'); n.id = id; elementStore.set(id, n); });

const documentMock = {
  getElementById: (id) => elementStore.get(id) || null,
  createElement: (tag) => makeNode(tag),
  createTextNode: (text) => ({ textContent: String(text) }),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  activeElement: null,
  documentElement: { style: {} },
  body: { classList: { add() {}, remove() {} } }
};

const sessionStorageMock = makeStorageMock();
const sandbox = {
  window: {
    localStorage: makeStorageMock(),
    sessionStorage: sessionStorageMock
  },
  sessionStorage: sessionStorageMock,
  localStorage: makeStorageMock(),
  console,
  document: documentMock,
  location: { search: '' },
  navigator: { userAgent: 'pv001-oracle' },
  setTimeout, clearTimeout,
  XLSX: undefined
};
sandbox.window.confirm = () => true;
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

vm.runInContext(pautasSrc, sandbox);
vm.runInContext(helperSrc, sandbox);
vm.runInContext(excelSrc, sandbox);
vm.runInContext(commonSrc, sandbox);
if (!sandbox.window.FarmaciaDemo) {
  console.error('FATAL: FarmaciaDemo no disponible en el sandbox');
  process.exit(1);
}
vm.runInContext(jsSrc, sandbox);

const api = sandbox.window.FarmaciaDemo;
const PV = sandbox.window.FarmaciaPrimeraVisita;
if (!PV || typeof PV.buildPrimaryTreatmentFromContext !== 'function') {
  console.error('FATAL: FarmaciaPrimeraVisita no disponible en el sandbox');
  process.exit(1);
}

function gridText(node) {
  let out = node.textContent || '';
  (node.children || []).forEach((child) => { out += ' ' + gridText(child); });
  return out;
}
const el = (id) => elementStore.get(id);

// ---------- anclaje al contrato demo publicado (G1–G4) ----------
console.log('\nANCLAJE — dataset demo publicado (sin fixtures inventados)');
const fh1 = api.findPatientByCip('CIP-DEMO-FH-001');
const fh2 = api.findPatientByCip('CIP-DEMO-FH-002');
const fh3 = api.findPatientByCip('CIP-DEMO-FH-003');
assert(fh2 && fh2.estado === 'pending', 'G1: CIP-DEMO-FH-002 es estado pending (paciente pendiente)');
assert(fh2 && !!fh2.farmaco_solicitado && fh2.farmaco_solicitado === fh2.farmaco,
  'G1b: FH-002 tiene tratamiento solicitado explícito (requested-only, sin acto de validación)');
assert(fh3 && fh3.estado === 'validated', 'G2: CIP-DEMO-FH-003 es estado validated (evidencia explícita ya publicada)');
assert(fh1 && fh1.estado === 'followup', 'G3: CIP-DEMO-FH-001 es estado followup (tratamiento propio validado en seguimiento)');
const seamRead = api.readPatientByCipSync('CIP-DEMO-FH-002');
assert(seamRead && seamRead.status === 'loaded' && seamRead.patient && seamRead.patient.cip === 'CIP-DEMO-FH-002',
  'G4: el seam sync publicado (readPatientByCipSync) resuelve FH-002');

// ---------- R1: blocker pending/requested-only ----------
console.log('\nR1 — pending/requested-only (CIP-DEMO-FH-002) vía búsqueda soportada');
el('fhPvCip').value = 'CIP-DEMO-FH-002';
PV.searchCIP();
assertEqual(el('fhPvCip').value, 'CIP-DEMO-FH-002', 'R1 carga el contexto del paciente pendiente');
assertEqual(el('fhPvFarmaco').value, '', 'R1-A1: captura de fármaco NO prehidratada desde el solicitado');
assertEqual(el('fhPvDosis').value, '', 'R1-A2: captura de dosis NO prehidratada');
assertEqual(el('fhPvVia').value, '', 'R1-A3: captura de vía NO prehidratada');
assertEqual(el('fhPvPauta').value, '', 'R1-A4: captura de pauta NO prehidratada');
assertEqual(el('fhPvTratamientoGrid').children.length, 0, 'R1-A5: rejilla de tratamiento vacía (sin relación renderizada)');
assert(!/validado/i.test(gridText(el('fhPvTratamientoGrid'))), 'R1-A5b: la rejilla nunca presenta "validado"');

const tPending = PV.buildPrimaryTreatmentFromContext({ cip: 'CIP-DEMO-FH-002', patient: fh2 });
assert(tPending.tipo_relacion !== 'validado', 'R1-A6: tipo_relacion != validado');
assert(tPending.es_validado_farmacia !== true, 'R1-A7: es_validado_farmacia != true');
assertEqual(tPending.farmaco_nombre, '', 'R1-A8: el solicitado no se promociona a tratamiento primario');
assertEqual(tPending.dosis_texto, '', 'R1-A8b: dosis del solicitado no se promociona');

const curPending = PV.getCurrentPrimaryTreatment({ cip: 'CIP-DEMO-FH-002', patient: fh2 });
assert(curPending.es_validado_farmacia !== true, 'R1-A9: verdad de export es_validado_farmacia != true');
assert(curPending.tipo_relacion !== 'validado', 'R1-A10: verdad de export tipo_relacion != validado');

// ---------- R2: explícitamente validado / seguimiento propio ----------
console.log('\nR2 — control explícitamente validado (FH-003) y seguimiento propio (FH-001)');
el('fhPvCip').value = 'CIP-DEMO-FH-003';
PV.searchCIP(); // cambio de paciente: confirm aceptado por el sandbox
assertEqual(el('fhPvFarmaco').value, 'Adalimumab 40 mg', 'R2-B1: FH-003 (validated) conserva la prehidratación de su tratamiento propio');
const grid3 = gridText(el('fhPvTratamientoGrid'));
assert(/validado/.test(grid3) && /principal/i.test(grid3), 'R2-B2: FH-003 presenta relación validado · principal');
const tValidated = PV.buildPrimaryTreatmentFromContext({ cip: 'CIP-DEMO-FH-003', patient: fh3 });
assertEqual(tValidated.tipo_relacion, 'validado', 'R2-B3: FH-003 tipo_relacion = validado desde evidencia explícita');
assertEqual(tValidated.es_validado_farmacia, true, 'R2-B4: FH-003 es_validado_farmacia = true desde evidencia explícita');

el('fhPvCip').value = 'CIP-DEMO-FH-001';
PV.searchCIP();
assertEqual(el('fhPvFarmaco').value, 'Secukinumab 300 mg', 'R2-C1: FH-001 (followup) conserva la prehidratación de su registro propio');
const tFollowup = PV.buildPrimaryTreatmentFromContext({ cip: 'CIP-DEMO-FH-001', patient: fh1 });
assertEqual(tFollowup.tipo_relacion, 'validado', 'R2-C2: FH-001 conserva relación validado (estado explícito followup)');
assertEqual(tFollowup.es_validado_farmacia, true, 'R2-C3: FH-001 conserva es_validado_farmacia=true');

// ---------- R3: camino V2/raw ----------
console.log('\nR3 — camino V2/raw sin regresión');
const realReadByCipSync = api.readPatientByCipSync;
api.readPatientByCipSync = (cip) => {
  if (cip === 'CIP-RAW-VAL') {
    return { status: 'loaded', source: 'excel_raw', patient_id: 'RAW-VAL', errorCode: null, patient: {
      cip: 'CIP-RAW-VAL', servicio: 'Reumatología', patologia: 'AR', estado: 'validated',
      __farmaciaRawPatient: true,
      tratamientoValidado: { farmaco_nombre: 'Validado RAW A', dosis_texto: '10 mg', via: 'SC', pauta: 'Semanal' },
      lineaActiva: { farmaco_nombre: 'Línea activa RAW' }
    } };
  }
  if (cip === 'CIP-RAW-NOVAL') {
    return { status: 'loaded', source: 'excel_raw', patient_id: 'RAW-NOVAL', errorCode: null, patient: {
      cip: 'CIP-RAW-NOVAL', servicio: 'Reumatología', patologia: 'AR', estado: 'pending',
      __farmaciaRawPatient: true, tratamientoValidado: null, lineaActiva: null
    } };
  }
  return realReadByCipSync(cip);
};

el('fhPvCip').value = 'CIP-RAW-VAL';
PV.searchCIP();
assertEqual(el('fhPvFarmaco').value, 'Validado RAW A', 'R3-D1: raw con tratamientoValidado prehidrata desde el validado');
const tRawVal = PV.buildPrimaryTreatmentFromContext(sandbox.window.FarmaciaDemo.readPatientByCipSync('CIP-RAW-VAL'));
assertEqual(tRawVal.tipo_relacion, 'validado', 'R3-D2: raw validado → relación validado');
assertEqual(tRawVal.es_validado_farmacia, true, 'R3-D3: raw validado → es_validado_farmacia true');

el('fhPvCip').value = 'CIP-RAW-NOVAL';
PV.searchCIP();
assertEqual(el('fhPvFarmaco').value, '', 'R3-E1: raw sin tratamientoValidado no prehidrata captura');
const tRawNoVal = PV.buildPrimaryTreatmentFromContext(sandbox.window.FarmaciaDemo.readPatientByCipSync('CIP-RAW-NOVAL'));
assert(tRawNoVal.tipo_relacion !== 'validado', 'R3-E2: raw sin validación → relación != validado');
assert(tRawNoVal.es_validado_farmacia !== true, 'R3-E3: raw sin validación → es_validado_farmacia != true');
api.readPatientByCipSync = realReadByCipSync;

// ---------- R4: selección profesional ----------
console.log('\nR4 — selección de catálogo no autovalida; captura manual operativa');
const drug = {
  drug_id: 'DEMO-PV-DRUG-1', source_type: 'LOCAL',
  display_name: 'Producto catálogo demo', nombre_comercial: 'Producto catálogo demo',
  principio_activo: 'Activo demo', nombre_presentacion: '30 mg jeringa', dosis: '30 mg', via: 'SC'
};
const selPending = PV.buildPrimaryTreatmentFromSelection(drug, { cip: 'CIP-DEMO-FH-002', patient: fh2 });
assertEqual(selPending.farmaco_nombre, 'Producto catálogo demo', 'R4-F1: la selección manual escribe la identidad seleccionada');
assert(selPending.es_validado_farmacia !== true, 'R4-F2: seleccionar catálogo NO autovalida (pending)');
assert(selPending.tipo_relacion !== 'validado', 'R4-F3: la selección no promueve la relación a validado');
const selValidated = PV.buildPrimaryTreatmentFromSelection(drug, { cip: 'CIP-DEMO-FH-003', patient: fh3 });
assertEqual(selValidated.tipo_relacion, 'validado', 'R4-F4: en contexto explícitamente validado la selección conserva la relación soportada');

// ---------- resultado ----------
console.log('\n┌──────────────────────────────────────────────┐');
console.log(`│ Resultados: ${passed} passed, ${failed} failed   │`);
console.log('└──────────────────────────────────────────────┘');
if (failed > 0) {
  console.log('\nFallos:');
  errors.forEach((e) => console.log(` - ${e}`));
  process.exit(1);
}
process.exit(0);
