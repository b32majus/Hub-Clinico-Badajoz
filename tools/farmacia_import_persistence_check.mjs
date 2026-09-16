#!/usr/bin/env node
// tools/farmacia_import_persistence_check.mjs
// Issue #368 (N5 of train #364) — fail closed when import persistence is
// unavailable. Property under test: FAILED PERSISTENCE => NEW DATASET NOT ACTIVE.
//  A) No previous source + deterministic setItem failure => import rejected;
//     no new active importStates, no candidate fallback, no "Excel cargado"
//     claim, explicit message, zero fabricated identity.
//  B) Valid previous source A (confirmed persistence) + failing persistence
//     for workbook B => B rejected; A stays byte-for-byte active (functional
//     state, persisted snapshot, UI text, derived patients); no A/B mixing.
//  C) Happy path unchanged: confirmed persistence keeps current behavior and
//     still resolves on a simulated next page (fresh sandbox, same store).
//  E) farmacia_bridge_v2_raw keeps its runtime_memory contract: bridge import
//     neither persists nor requires persistence (works with failing storage).
// D (safety: same CIP/two solicitudes, unknown ID/CIP mismatch, manual origin)
// stays covered by farmacia_solicitud_id_transport_check.mjs and
// farmacia_reconcil_check.mjs; here we only assert that failed persistence
// never mutates previously derived patients.

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];

function ok(msg) { console.log('  \u2713 ' + msg); passed++; }
function fail(msg) { console.log('  \u2717 ' + msg); failed++; errors.push(msg); }
function assert(condition, label) { if (condition) ok(label); else fail(label); }
function assertEqual(actual, expected, label) {
  if (actual === expected) ok(`${label}: ${JSON.stringify(expected)}`);
  else fail(`${label}: esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`);
}
function assertTruthy(actual, label) {
  if (actual) ok(`${label}: ${JSON.stringify(actual)}`);
  else fail(`${label}: se esperaba valor truthy`);
}
function assertContains(haystack, needle, label) {
  if (typeof haystack === 'string' && haystack.indexOf(needle) !== -1) ok(label);
  else fail(`${label}: no se encontró "${needle}" en ${JSON.stringify(haystack)}`);
}
function assertNotContains(haystack, needle, label) {
  if (typeof haystack !== 'string' || haystack.indexOf(needle) === -1) ok(label);
  else fail(`${label}: se encontró "${needle}" prohibido en ${JSON.stringify(haystack)}`);
}

// ─── Load scripts in VM sandbox ──────────────────────────────────────────────
const requireNode = createRequire(import.meta.url);
const XLSX = requireNode(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const coreSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_export_v2_core.js'), 'utf8');
const readerSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_bridge_v2_reader.js'), 'utf8');
const commonSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_common.js'), 'utf8');

const FIX_V6_A = path.join(ROOT, 'tools', 'fixtures', 'enfermeria_v6_sintetico_v1.xlsx');
const FIX_V6_B = path.join(ROOT, 'tools', 'fixtures', 'farmacia_reconcil_enfermeria_v6_sintetico_v1.xlsx');
const FIX_LEGACY = path.join(ROOT, 'templates', 'enfermeria_inicio_biologico_PROMueve_sintetico_v1.xlsx');
for (const f of [FIX_V6_A, FIX_V6_B, FIX_LEGACY]) {
  if (!fs.existsSync(f)) { console.error('FATAL: falta fixture ' + f); process.exit(1); }
}

function makeStorageMock() {
  const store = {};
  const mock = {
    getItem: function (key) { return store[key] === undefined ? null : store[key]; },
    setItem: function (key, value) { store[key] = String(value); },
    removeItem: function (key) { delete store[key]; }
  };
  mock._store = store;
  return mock;
}

/* Deterministic fault injection over an EXISTING storage: reads keep working
   over the same backing store (previously persisted keys survive) and every
   write throws QuotaExceededError like a saturated real browser
   sessionStorage. */
function degradeToFailingStorage(sourceMock) {
  const store = sourceMock._store;
  const quotaError = typeof DOMException === 'function'
    ? new DOMException('QuotaExceededError', 'QuotaExceededError')
    : new Error('QuotaExceededError');
  return {
    getItem: function (key) { return store[key] === undefined ? null : store[key]; },
    setItem: function () { throw quotaError; },
    removeItem: function (key) { delete store[key]; }
  };
}

function makeMockDoc() {
  return {
    addEventListener: function () {},
    removeEventListener: function () {},
    getElementById: function () { return null; },
    createElement: function () { return {}; },
    documentElement: { style: {} },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    dispatchEvent: function () { return true; },
    body: { classList: { add: function () {}, remove: function () {} } }
  };
}

class MockCustomEvent {
  constructor(type, opts) { this.type = type; this.detail = opts && opts.detail; }
}

function buildSandbox(options) {
  const opts = options || {};
  const sessionStorageMock = opts.failing
    ? degradeToFailingStorage(opts._baseStorageMock || makeStorageMock())
    : (opts.sessionStorageMock || makeStorageMock());
  const sandbox = {
    window: {
      localStorage: makeStorageMock(),
      sessionStorage: sessionStorageMock
    },
    XLSX: XLSX,
    console: console,
    document: makeMockDoc(),
    CustomEvent: MockCustomEvent,
    location: { search: '' }
  };
  vm.createContext(sandbox);
  sandbox.window.XLSX = XLSX;
  vm.runInContext(coreSrc, sandbox);
  vm.runInContext(readerSrc, sandbox);
  vm.runInContext(commonSrc, sandbox);
  if (opts.stubBridgeReader) {
    sandbox.window.FarmaciaBridgeV2Reader = { readWorkbook: function () { return null; } };
  }
  return sandbox;
}

// Bridge demo workbook built from the repository's own synthetic export_v2
// fixtures (no real patient data), same projection pattern as
// tools/farmacia_bridge_v2_reader_check.js.
requireNode(path.join(ROOT, 'scripts', 'farmacia_export_v2_core.js'));
const coreNode = globalThis.FarmaciaExportV2Core;
if (!coreNode) { console.error('FATAL: FarmaciaExportV2Core no disponible en Node'); process.exit(1); }

function bridgeFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'demo', 'farmacia', 'export_v2', name), 'utf8'));
}

function cellsForRow(row) {
  return coreNode.serializeRowToTsv(row).split('\t');
}

function buildBridgeWorkbook() {
  const validation = bridgeFixture('validation_event_v2.json');
  validation.event.identifier_system = 'urn:promueve:demo';
  validation.event.identifier_value = 'DEMO-001';
  const firstVisit = bridgeFixture('first_visit_event_v2.json');
  firstVisit.event.identifier_system = null;
  firstVisit.event.identifier_value = null;
  const followup = bridgeFixture('followup_event_v2.json');
  followup.event.identifier_system = 'urn:promueve:demo';
  followup.event.identifier_value = 'DEMO-003';

  const validationRows = coreNode.projectEventRows(validation.event, validation.rowPayloads);
  validationRows.forEach(function (row) { row.bridge_status = 'PROCESADA'; });
  const firstVisitRows = coreNode.projectEventRows(firstVisit.event, firstVisit.rowPayloads);
  const followupRows = coreNode.projectEventRows(followup.event, followup.rowPayloads);

  const wb = XLSX.utils.book_new();
  const header = coreNode.ROW_COLUMNS.slice();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header].concat(validationRows.map(cellsForRow))), '01_DERMA');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header].concat(firstVisitRows.concat(followupRows).map(cellsForRow))), '03_DIGESTIVO');
  return wb;
}

const IMPORT_KEY_ENF = 'farmaciaDemo.enfermeriaImport';
const IMPORT_KEY_FH = 'farmaciaDemo.farmaciaImport';

// ─── [N5-A] No previous source + deterministic setItem failure ───────────────
console.log('\n[N5-A] no previous source + failing persistence => import rejected, nothing active');

{
  const sandbox = buildSandbox({ failing: true, stubBridgeReader: true });
  const Imports = sandbox.window.FarmaciaDataImports;

  // v6 multisheet path
  let v6Threw = null;
  try {
    Imports.parseWorkbook('enfermeria', XLSX.read(fs.readFileSync(FIX_V6_A), { type: 'array' }), 'n5_a_v6.xlsx');
  } catch (err) { v6Threw = err; }
  assert(!!v6Threw, 'A.1 v6: parseWorkbook rechaza la importación cuando sessionStorage no puede escribir');
  if (v6Threw) {
    assertContains(String(v6Threw.message || v6Threw), 'almacenamiento', 'A.2 mensaje explícito menciona el almacenamiento de sesión');
    assertContains(String(v6Threw.message || v6Threw), 'no pudo conservar', 'A.3 mensaje explícito explica que no se pudo conservar el Excel');
  }
  assertEqual(Imports.getState('enfermeria'), null, 'A.4 sin nuevo importStates activo (enfermería)');
  assertEqual(Imports.formatImportStatus('enfermeria'), 'No se ha cargado Excel de Enfermería', 'A.5 sin UI afirmando Excel cargado');
  assertEqual(Imports.getImportedPatients().length, 0, 'A.6 cero pacientes derivados (cero identidad fabricada)');
  assertEqual(sandbox.window.sessionStorage.getItem(IMPORT_KEY_ENF), null, 'A.7 nada escrito en sessionStorage');

  // legacy INICIO_BIOLOGICO path
  let legacyThrew = null;
  try {
    Imports.parseWorkbook('enfermeria', XLSX.read(fs.readFileSync(FIX_LEGACY), { type: 'array' }), 'n5_a_legacy.xlsx');
  } catch (err) { legacyThrew = err; }
  assert(!!legacyThrew, 'A.8 legacy: importación rechazada con almacenamiento fallido');
  if (legacyThrew) assertContains(String(legacyThrew.message || legacyThrew), 'no pudo conservar', 'A.9 mensaje explícito en rechazo legacy');
  assertEqual(Imports.getState('enfermeria'), null, 'A.10 sin dataset activo tras rechazo legacy');
  assertEqual(Imports.getImportedPatients().length, 0, 'A.11 sin pacientes fabricados tras rechazo legacy');

  // generic farmacia path (bridge reader stubbed to force the generic branch)
  let genericThrew = null;
  try {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['cip', 'farmaco', 'tipo_acto_fh'],
      ['CIP-N5-A-1', 'Fármaco sintético N5', 'validacion_inicial']
    ]), 'Datos');
    Imports.parseWorkbook('farmacia', wb, 'n5_a_generic.xlsx');
  } catch (err) { genericThrew = err; }
  assert(!!genericThrew, 'A.12 generic farmacia: importación rechazada con almacenamiento fallido');
  if (genericThrew) assertContains(String(genericThrew.message || genericThrew), 'no pudo conservar', 'A.13 mensaje explícito en rechazo generic');
  assertEqual(Imports.getState('farmacia'), null, 'A.14 sin dataset farmacia activo');
  assertEqual(Imports.formatImportStatus('farmacia'), 'No se ha cargado Excel de Farmacia', 'A.15 sin UI farmacia afirmando carga');
  assertEqual(Imports.getImportedPatients().length, 0, 'A.16 cero pacientes tras los tres rechazos');
}

// ─── [N5-B] Replacement over a confirmed previous source ─────────────────────
console.log('\n[N5-B] replacement failure keeps previous source byte-for-byte');

function assertPreviousIntact(Imports, kind, label, snapshot) {
  assertEqual(JSON.stringify(Imports.getState(kind)), snapshot.stateJson, label + ': estado funcional previo intacto byte-for-byte');
  assertEqual(Imports.formatImportStatus(kind), snapshot.statusText, label + ': UI sigue derivada de la fuente anterior');
  const patients = Imports.getImportedPatients().map(function (p) { return p.solicitud_id; }).sort();
  assertEqual(JSON.stringify(patients), snapshot.patientIdsJson, label + ': pacientes derivados intactos (sin mezcla A/B)');
}

{
  // v6 A -> v6 B
  const sandbox = buildSandbox({});
  const Imports = sandbox.window.FarmaciaDataImports;
  const stateA = Imports.parseWorkbook('enfermeria', XLSX.read(fs.readFileSync(FIX_V6_A), { type: 'array' }), 'n5_b_A.xlsx');
  assertTruthy(stateA, 'B.1 importación A (persistencia confirmada) aceptada');
  assertEqual(stateA.storage, 'session_storage', 'B.2 A marcada como persistida en session_storage');
  const rawA = sandbox.window.sessionStorage.getItem(IMPORT_KEY_ENF);
  assertTruthy(rawA, 'B.3 A persistida en sessionStorage');
  const snapshot = {
    stateJson: JSON.stringify(Imports.getState('enfermeria')),
    statusText: Imports.formatImportStatus('enfermeria'),
    patientIdsJson: JSON.stringify(Imports.getImportedPatients().map(function (p) { return p.solicitud_id; }).sort())
  };
  assertEqual(Imports.getState('enfermeria').rowCount, 5, 'B.4 fuente A tiene 5 registros');

  sandbox.window.sessionStorage = degradeToFailingStorage(sandbox.window.sessionStorage);

  let threw = null;
  try {
    Imports.parseWorkbook('enfermeria', XLSX.read(fs.readFileSync(FIX_V6_B), { type: 'array' }), 'n5_b_B.xlsx');
  } catch (err) { threw = err; }
  assert(!!threw, 'B.5 sustitución B rechazada cuando la persistencia falla');
  if (threw) {
    assertContains(String(threw.message || threw), 'no pudo conservar', 'B.6 mensaje explícito en rechazo de sustitución');
  }
  assertPreviousIntact(Imports, 'enfermeria', 'B.7', snapshot);
  assertEqual(sandbox.window.sessionStorage.getItem(IMPORT_KEY_ENF), rawA, 'B.8 snapshot persistido de A intacto byte-for-byte');
  const ids = Imports.getImportedPatients().map(function (p) { return p.solicitud_id; });
  assert(ids.indexOf('SOL-DER-000007') === -1 && ids.indexOf('SOL-REU-000008') === -1, 'B.9 ninguna fila del candidato B mezclada con A');
  assertEqual(Imports.getState('enfermeria').rowCount, 5, 'B.10 rowCount sigue siendo el de A');
}

{
  // generic farmacia A -> generic farmacia B
  const sandbox = buildSandbox({ stubBridgeReader: true });
  const Imports = sandbox.window.FarmaciaDataImports;

  function buildFhWorkbook(solicitudPrefix) {
    const headers = ['cip', 'farmaco', 'tipo_acto_fh', 'resultado_validacion', 'estado_registro', 'solicitud_id'];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      headers,
      ['CIP-N5-FH-1', 'Fármaco FH sintético', 'validacion_inicial', 'validado', 'completado', solicitudPrefix + '-000001'],
      ['CIP-N5-FH-2', 'Fármaco FH sintético', 'primera_visita', '', 'completado', solicitudPrefix + '-000002']
    ]), 'Datos');
    return wb;
  }

  const stateA = Imports.parseWorkbook('farmacia', buildFhWorkbook('SOL-FH-A'), 'n5_b_fh_A.xlsx');
  assertTruthy(stateA, 'B.11 importación FH A aceptada con persistencia confirmada');
  const snapshot = {
    stateJson: JSON.stringify(Imports.getState('farmacia')),
    statusText: Imports.formatImportStatus('farmacia'),
    patientIdsJson: JSON.stringify(Imports.getImportedPatients().map(function (p) { return p.solicitud_id; }).sort())
  };
  const rawA = sandbox.window.sessionStorage.getItem(IMPORT_KEY_FH);
  assertTruthy(rawA, 'B.12 A FH persistida en sessionStorage');

  sandbox.window.sessionStorage = degradeToFailingStorage(sandbox.window.sessionStorage);

  let threw = null;
  try {
    Imports.parseWorkbook('farmacia', buildFhWorkbook('SOL-FH-B'), 'n5_b_fh_B.xlsx');
  } catch (err) { threw = err; }
  assert(!!threw, 'B.13 sustitución FH B rechazada con persistencia fallida');
  if (threw) assertContains(String(threw.message || threw), 'no pudo conservar', 'B.14 mensaje explícito en rechazo FH');
  assertPreviousIntact(Imports, 'farmacia', 'B.15', snapshot);
  assertEqual(sandbox.window.sessionStorage.getItem(IMPORT_KEY_FH), rawA, 'B.16 snapshot persistido FH de A intacto');
  const ids = Imports.getImportedPatients().map(function (p) { return p.solicitud_id; });
  assert(ids.indexOf('SOL-FH-B-000001') === -1, 'B.17 ningún dato del candidato B en los pacientes derivados');
}

{
  // legacy A -> v6 B (different format family, same fail-closed rule)
  const sandbox = buildSandbox({});
  const Imports = sandbox.window.FarmaciaDataImports;
  const stateA = Imports.parseWorkbook('enfermeria', XLSX.read(fs.readFileSync(FIX_LEGACY), { type: 'array' }), 'n5_b_legacy_A.xlsx');
  assertTruthy(stateA, 'B.18 legacy A aceptado');
  const snapshot = {
    stateJson: JSON.stringify(Imports.getState('enfermeria')),
    statusText: Imports.formatImportStatus('enfermeria'),
    patientIdsJson: JSON.stringify(Imports.getImportedPatients().map(function (p) { return p.solicitud_id; }).sort())
  };
  sandbox.window.sessionStorage = degradeToFailingStorage(sandbox.window.sessionStorage);
  let threw = null;
  try {
    Imports.parseWorkbook('enfermeria', XLSX.read(fs.readFileSync(FIX_V6_B), { type: 'array' }), 'n5_b_v6_B.xlsx');
  } catch (err) { threw = err; }
  assert(!!threw, 'B.19 v6 B rechazado tras legacy A con persistencia fallida');
  assertPreviousIntact(Imports, 'enfermeria', 'B.20', snapshot);
}

// ─── [C] Happy path unchanged ────────────────────────────────────────────────
console.log('\n[C] happy path: confirmed persistence keeps current behavior');

{
  const storage = makeStorageMock();
  const sandbox = buildSandbox({ sessionStorageMock: storage });
  const Imports = sandbox.window.FarmaciaDataImports;
  const state = Imports.parseWorkbook('enfermeria', XLSX.read(fs.readFileSync(FIX_V6_A), { type: 'array' }), 'n5_c_A.xlsx');
  assertTruthy(state, 'C.1 importación válida aceptada');
  assertEqual(state.storage, 'session_storage', 'C.2 storage marcado session_storage');
  const raw = storage.getItem(IMPORT_KEY_ENF);
  assertTruthy(raw, 'C.3 dataset persistido en sessionStorage');
  assert(JSON.parse(raw).fileName === 'n5_c_A.xlsx', 'C.4 snapshot persistido contiene el dataset completo');
  assertEqual(Imports.formatImportStatus('enfermeria'), 'Excel Enfermería cargado · 5 registros', 'C.5 UI de carga correcta conservada');

  // Simulated next page: a fresh sandbox initialized over the same store
  // resolves the persisted dataset (cross-page persistence contract).
  const sandbox2 = {
    window: { localStorage: makeStorageMock(), sessionStorage: storage },
    XLSX: XLSX,
    console: console,
    document: makeMockDoc(),
    CustomEvent: MockCustomEvent,
    location: { search: '' }
  };
  vm.createContext(sandbox2);
  vm.runInContext(coreSrc, sandbox2);
  vm.runInContext(readerSrc, sandbox2);
  vm.runInContext(commonSrc, sandbox2);
  const restored = sandbox2.window.FarmaciaDataImports.getState('enfermeria');
  assertTruthy(restored, 'C.6 página siguiente resuelve el dataset persistido');
  assertEqual(restored.fileName, 'n5_c_A.xlsx', 'C.7 dataset restaurado idéntico (fileName)');
  assertEqual(restored.rowCount, 5, 'C.8 dataset restaurado idéntico (rowCount)');
}

// ─── [E] Bridge v2 raw keeps runtime_memory ──────────────────────────────────
console.log('\n[E] farmacia_bridge_v2_raw keeps runtime_memory contract');

{
  const wb = buildBridgeWorkbook();
  // Working storage: bridge import must not persist (prior behavior).
  const sandboxOk = buildSandbox({});
  const bridgeOk = sandboxOk.window.FarmaciaDataImports.parseWorkbook('farmacia', wb, 'bridge_ok.xlsx');
  assertTruthy(bridgeOk, 'E.1 bridge import aceptado con storage operativo');
  assertEqual(bridgeOk.format, 'farmacia_bridge_v2_raw', 'E.2 formato bridge v2 raw');
  assertEqual(bridgeOk.storage, 'runtime_memory', 'E.3 bridge conserva runtime_memory');
  assertEqual(sandboxOk.window.sessionStorage.getItem(IMPORT_KEY_FH), null, 'E.4 bridge no persiste en sessionStorage');

  // Failing storage: bridge import must not require persistence.
  const sandboxFail = buildSandbox({ failing: true });
  const bridgeFail = sandboxFail.window.FarmaciaDataImports.parseWorkbook('farmacia', wb, 'bridge_fail.xlsx');
  assertTruthy(bridgeFail, 'E.5 bridge import sigue funcionando con almacenamiento fallido (runtime_memory)');
  assertEqual(bridgeFail.storage, 'runtime_memory', 'E.6 runtime_memory sin cambios');
  assertEqual(sandboxFail.window.sessionStorage.getItem(IMPORT_KEY_FH), null, 'E.7 bridge tampoco persiste con storage fallido');
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  errors.forEach(function (e) { console.error('  FAIL: ' + e); });
  process.exit(1);
}
