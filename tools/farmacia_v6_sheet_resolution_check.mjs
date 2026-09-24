#!/usr/bin/env node
// tools/farmacia_v6_sheet_resolution_check.mjs
// Frozen acceptance oracle for FH-DEBT-002 (v6-sheet-lookup-split-brain) and
// FH-DEBT-003 (v6-sheet-name-normalization) — docs/ops/FARMACIA_DEBT_REGISTER.md.
//
// Property under test: the physical workbook sheet names are resolved ONCE to
// the three canonical v6 clinical services and that single resolution map is
// reused by detection (isEnfermeriaV6Workbook) and parsing (parseWorkbook).
//
// Frozen contract (closure criteria of the debt register):
//  A) API resolveEnfermeriaV6ClinicalSheets(workbook) resolves physical names
//     to canonical services. Closed alias policy: a physical sheet matches a
//     service iff enfermeriaV6Token(name) equals the token of the canonical
//     name (case/accent/whitespace/punctuation only; no substring, prefix,
//     suffix or fuzzy matching).
//  B) Supported variants (accents, case, spaces, punctuation) resolve AND
//     parse end-to-end identically to the canonical workbook.
//  C) Exactly one physical sheet per service: duplicate/ambiguous aliases are
//     rejected fail-closed (resolver status 'ambiguous', detection false,
//     parseWorkbook throws naming the collision) — never silently ignored.
//  D) Incomplete service sets are not v6 and keep falling through to legacy
//     branches exactly as before.
//  E) Legacy INICIO_BIOLOGICO workbooks and canonical-name workbooks keep
//     their existing behavior (regression guard).
//
// Synthetic data only. No real patient data.

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
function assertThrows(fn, needles, label) {
  let threw = null;
  try { fn(); } catch (err) { threw = err; }
  if (!threw) { fail(`${label}: se esperaba un throw fail-closed`); return; }
  ok(label);
  const msg = String((threw && threw.message) || threw);
  for (const needle of needles) {
    assertContains(msg, needle, `${label} — mensaje contiene "${needle}"`);
  }
}

function section(name, fn) {
  try { fn(); } catch (err) { fail('Sección ' + name + ' abortada: ' + (err && err.message || err)); }
}
// ─── Load scripts in VM sandbox ──────────────────────────────────────────────
const requireNode = createRequire(import.meta.url);
const XLSX = requireNode(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const coreSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_export_v2_core.js'), 'utf8');
const readerSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_bridge_v2_reader.js'), 'utf8');
const commonSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_common.js'), 'utf8');

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

function buildSandbox() {
  const sandbox = {
    window: {
      localStorage: makeStorageMock(),
      sessionStorage: makeStorageMock()
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
  return sandbox;
}

const F = buildSandbox().window.FarmaciaDemo;

// ─── Synthetic v6 fixtures ───────────────────────────────────────────────────
const V6_HEADER = ['CIP', 'Paciente', 'Patología', 'Fármaco', 'Fecha alta', 'Analítica', 'Mantoux', 'IGRA', 'VHB', 'VHC', 'VIH', 'Med. Preventiva', 'Apto para iniciar desde', 'Estado', 'Fecha OK', 'Observación prebiológico', 'Servicio', 'solicitud_id'];

const V6_ROWS = {
  'DERMATOLOGÍA': ['CIPDEMO0001', 'Paciente Demo Derma', 'Psoriasis', 'Fármaco Demo A', '2026-01-10', 'Pendiente', 'No realizado', 'No realizado', 'Pendiente', 'Pendiente', 'Pendiente', 'Pendiente', '', 'Pendiente', '', 'Demo sintética', 'DERMATOLOGÍA', 'SOL-DER-000001'],
  'REUMATOLOGÍA': ['CIPDEMO0002', 'Paciente Demo Reuma', 'Artritis', 'Fármaco Demo B', '2026-01-11', 'Pendiente', 'No realizado', 'No realizado', 'Pendiente', 'Pendiente', 'Pendiente', 'Pendiente', '', 'Pendiente', '', 'Demo sintética', 'REUMATOLOGÍA', 'SOL-REU-000001'],
  'DIGESTIVO': ['CIPDEMO0003', 'Paciente Demo Digestivo', 'EII', 'Fármaco Demo C', '2026-01-12', 'Pendiente', 'No realizado', 'No realizado', 'Pendiente', 'Pendiente', 'Pendiente', 'Pendiente', '', 'Pendiente', '', 'Demo sintética', 'DIGESTIVO', 'SOL-DIG-000001']
};

const V6_AUX_SHEETS = ['PANEL_ENFERMERIA', 'LISTAS', 'INSTRUCCIONES'];
const EXPECTED_SOLICITUDES = ['SOL-DER-000001', 'SOL-REU-000001', 'SOL-DIG-000001'];

// Local fixture-only normalizer: maps a (possibly variant) sheet name back to
// its canonical service so the synthetic clinical row can be attached. This is
// fixture construction, not the property under test.
function localFixtureToken(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
const CANONICAL_BY_TOKEN = {};
for (const service of Object.keys(V6_ROWS)) CANONICAL_BY_TOKEN[localFixtureToken(service)] = service;

function buildWorkbook(sheetNames) {
  const wb = XLSX.utils.book_new();
  for (const name of sheetNames) {
    const canonical = CANONICAL_BY_TOKEN[localFixtureToken(name)];
    const row = canonical ? V6_ROWS[canonical] : null;
    if (row) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([V6_HEADER, row]), name);
    } else {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['dato'], ['auxiliar']]), name);
    }
  }
  return wb;
}

// ─── Section A: resolver API and canonical resolution ────────────────────────
console.log('\n[Section A] resolver API — resolución única a servicios canónicos');
section('A', function () {
assert(typeof F.resolveEnfermeriaV6ClinicalSheets === 'function', 'A.1 resolveEnfermeriaV6ClinicalSheets existe');

{
  const canonical = F.resolveEnfermeriaV6ClinicalSheets(buildWorkbook(['DERMATOLOGÍA', 'REUMATOLOGÍA', 'DIGESTIVO'].concat(V6_AUX_SHEETS)));
  assertTruthy(canonical, 'A.2 resolución canónica devuelve resultado');
  if (canonical) {
    assertEqual(canonical.ok, true, 'A.3 workbook canónico resuelve ok');
    if (canonical.ok) {
      assertEqual(Object.keys(canonical.sheets).length, 3, 'A.4 exactamente tres servicios resueltos');
      for (const service of ['DERMATOLOGÍA', 'REUMATOLOGÍA', 'DIGESTIVO']) {
        assertEqual(canonical.sheets[service], service, 'A.5 servicio ' + service + ' resuelto a su hoja física');
      }
    }
  }
  assert(F.isEnfermeriaV6Workbook(buildWorkbook(['DERMATOLOGÍA', 'REUMATOLOGÍA', 'DIGESTIVO'].concat(V6_AUX_SHEETS))), 'A.6 detección canónica sigue reconociendo v6 (regresión)');
  assert(!F.resolveEnfermeriaV6ClinicalSheets(null).ok, 'A.7 null falla cerrado');
  assert(!F.resolveEnfermeriaV6ClinicalSheets({}).ok, 'A.8 workbook vacío falla cerrado');
}
});

// ─── Section B: closed alias policy — supported variants ─────────────────────
console.log('\n[Section B] política cerrada de aliases — variantes soportadas');
section('B', function () {
  // Accent, case, whitespace and punctuation variants of each canonical name.
  const variants = {
    'DERMATOLOGÍA': ['DERMATOLOGIA', 'dermatología', '  Dermatología  ', 'Dermatología.'],
    'REUMATOLOGÍA': ['Reumatologia', 'REUMATOLOGÍA ', ' reumatología', 'Reumatología-'],
    'DIGESTIVO': ['digestivo', 'DIGESTIVO.', ' Digestivo ', 'DIGESTIVO_']
  };
  for (const service of Object.keys(variants)) {
    for (const variant of variants[service]) {
      const otherNames = Object.keys(variants).filter(function (s) { return s !== service; });
      const wb = buildWorkbook([variant].concat(otherNames));
      const resolved = F.resolveEnfermeriaV6ClinicalSheets(wb);
      assert(resolved && resolved.ok === true && resolved.sheets[service] === variant,
        'B variante "' + variant + '" resuelve al servicio ' + service);
      assert(F.isEnfermeriaV6Workbook(wb),
        'B variante "' + variant + '" es reconocida por detección (mismo mapa)');
    }
  }

  // A sheet that merely contains the service name as substring must NOT match.
  const notAliases = ['PANEL_DERMATOLOGIA', 'HOJA_REUMATOLOGIA_2026', 'DIGESTIVO_EXTERNO'];
  for (const notAlias of notAliases) {
    const wb = buildWorkbook(['DERMATOLOGÍA', 'REUMATOLOGÍA', 'DIGESTIVO', notAlias]);
    const resolved = F.resolveEnfermeriaV6ClinicalSheets(wb);
    assert(resolved && resolved.ok === true && resolved.sheets['DERMATOLOGÍA'] === 'DERMATOLOGÍA',
      'B hoja no-alias "' + notAlias + '" no interfiere en la resolución');
  }
});

// ─── Section B2: end-to-end parseWorkbook with variant names ─────────────────
console.log('\n[Section B2] parseWorkbook reutiliza el mapa de resolución (end-to-end)');
section('B2', function () {
  const canonicalState = buildSandbox().window.FarmaciaDataImports.parseWorkbook(
    'enfermeria', buildWorkbook(['DERMATOLOGÍA', 'REUMATOLOGÍA', 'DIGESTIVO', 'LISTAS']), 'canonico_sintetico.xlsx');
  assertTruthy(canonicalState, 'B2.1 workbook canónico parsea end-to-end');
  assertEqual(canonicalState && canonicalState.format, 'enfermeria_v6_multisheet', 'B2.2 formato v6 multisheet');

  const variantNames = ['dermatología ', 'Reumatologia', 'DIGESTIVO.', 'LISTAS'];
  const variantState = buildSandbox().window.FarmaciaDataImports.parseWorkbook(
    'enfermeria', buildWorkbook(variantNames), 'variantes_sinteticas.xlsx');
  assertTruthy(variantState, 'B2.3 workbook con nombres variante parsea end-to-end (sin split-brain)');
  assertEqual(variantState && variantState.format, 'enfermeria_v6_multisheet', 'B2.4 formato v6 multisheet con variantes');
  assertEqual(variantState && variantState.rowCount, canonicalState.rowCount, 'B2.5 mismo número de filas que el canónico');
  assertEqual(JSON.stringify(variantState && variantState.rows), JSON.stringify(canonicalState.rows), 'B2.6 filas idénticas al parseo canónico (resolución única reutilizada)');
  const solicitudes = (variantState.rows || []).map(function (r) { return r.solicitud_id; }).sort();
  assertEqual(JSON.stringify(solicitudes), JSON.stringify(EXPECTED_SOLICITUDES.slice().sort()), 'B2.7 solicitud_id esperados por servicio');
});

// ─── Section C: duplicate/ambiguous aliases rejected fail-closed ─────────────
console.log('\n[Section C] rechazo fail-closed de aliases duplicados/ambiguos');
section('C', function () {
  // Two physical sheets collapsing to the same service (accent variant).
  const dupAccent = buildWorkbook(['DERMATOLOGÍA', 'Dermatología', 'REUMATOLOGÍA', 'DIGESTIVO']);
  const dupAccentResolved = F.resolveEnfermeriaV6ClinicalSheets(dupAccent);
  assertTruthy(dupAccentResolved, 'C.1 resolución de duplicado devuelve resultado');
  assertEqual(dupAccentResolved && dupAccentResolved.ok, false, 'C.2 duplicado acentuado NO resuelve ok');
  assertEqual(dupAccentResolved && dupAccentResolved.status, 'ambiguous', 'C.3 estado ambiguous');
  assert(!F.isEnfermeriaV6Workbook(dupAccent), 'C.4 detección rechaza workbook con alias duplicado');

  // Two physical sheets collapsing to the same service (case variant), even
  // with the third service missing: ambiguity wins over incompleteness.
  const dupCase = buildWorkbook(['DERMATOLOGIA', 'DERMATOLOGÍA', 'REUMATOLOGÍA']);
  const dupCaseResolved = F.resolveEnfermeriaV6ClinicalSheets(dupCase);
  assertEqual(dupCaseResolved && dupCaseResolved.ok, false, 'C.5 duplicado de mayúsculas/minúsculas NO resuelve ok');
  assertEqual(dupCaseResolved && dupCaseResolved.status, 'ambiguous', 'C.6 ambigüedad gana a incompletitud');

  // Duplicate via whitespace/punctuation normalization.
  const dupSpace = buildWorkbook(['DIGESTIVO', ' DIGESTIVO ', 'DERMATOLOGÍA', 'REUMATOLOGÍA']);
  const dupSpaceResolved = F.resolveEnfermeriaV6ClinicalSheets(dupSpace);
  assertEqual(dupSpaceResolved && dupSpaceResolved.ok, false, 'C.7 duplicado por espacios/puntuación NO resuelve ok');
  assertEqual(dupSpaceResolved && dupSpaceResolved.status, 'ambiguous', 'C.8 estado ambiguous en duplicado por espacios');

  // parseWorkbook must fail closed with an explicit message, never silently
  // drop a duplicate sheet nor fall through to a confusing legacy error.
  const sandboxC = buildSandbox();
  const ImportsC = sandboxC.window.FarmaciaDataImports;
  assertThrows(function () {
    ImportsC.parseWorkbook('enfermeria', dupAccent, 'duplicado_sintetico.xlsx');
  }, ['DERMATOLOGÍA', 'Dermatología'], 'C.9 parseWorkbook rechaza duplicado con mensaje explícito');
  assertThrows(function () {
    ImportsC.parseWorkbook('enfermeria', dupCase, 'duplicado_case_sintetico.xlsx');
  }, ['DERMATOLOGIA'], 'C.10 parseWorkbook rechaza duplicado de mayúsculas (sin caer al legacy)');
});

// ─── Section D: incomplete service sets keep legacy fall-through ─────────────
console.log('\n[Section D] servicios incompletos no son v6 (caída a legacy intacta)');
section('D', function () {
  const incomplete = buildWorkbook(['DERMATOLOGÍA', 'REUMATOLOGÍA', 'LISTAS']);
  const resolved = F.resolveEnfermeriaV6ClinicalSheets(incomplete);
  assertEqual(resolved && resolved.ok, false, 'D.1 sin las tres hojas no resuelve ok');
  assertEqual(resolved && resolved.status, 'incomplete', 'D.2 estado incomplete');
  assert(!F.isEnfermeriaV6Workbook(incomplete), 'D.3 detección no reconoce workbook incompleto (regresión)');

  const sandboxD = buildSandbox();
  let dThrew = null;
  let dState = null;
  try { dState = sandboxD.window.FarmaciaDataImports.parseWorkbook('enfermeria', incomplete, 'incompleto_sintetico.xlsx'); }
  catch (err) { dThrew = err; }
  const isV6 = !!dState && dState.format === 'enfermeria_v6_multisheet';
  assert(!isV6, 'D.4 workbook incompleto nunca se importa como v6 multisheet');
});

// ─── Section E: legacy workbook preserved ────────────────────────────────────
console.log('\n[Section E] legacy INICIO_BIOLOGICO preservado');
section('E', function () {
  const legacy = buildWorkbook(['INICIO_BIOLOGICO', 'LISTAS', 'INSTRUCCIONES']);
  const resolved = F.resolveEnfermeriaV6ClinicalSheets(legacy);
  assertEqual(resolved && resolved.ok, false, 'E.1 legacy no resuelve como v6');
  assertEqual(resolved && resolved.status, 'incomplete', 'E.2 legacy es incomplete para v6');
  assert(!F.isEnfermeriaV6Workbook(legacy), 'E.3 detección legacy no es v6 (regresión)');

  const sandboxE = buildSandbox();
  let eThrew = null;
  let eState = null;
  try { eState = sandboxE.window.FarmaciaDataImports.parseWorkbook('enfermeria', legacy, 'legacy_sintetico.xlsx'); }
  catch (err) { eThrew = err; }
  const isV6 = !!eState && eState.format === 'enfermeria_v6_multisheet';
  assert(!isV6, 'E.4 legacy nunca se importa como v6 multisheet');
});

// ─── Result ──────────────────────────────────────────────────────────────────
console.log('\n========================================');
console.log(`PASS: ${passed}  FAIL: ${failed}`);
if (failed > 0) {
  console.error('Errores:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
