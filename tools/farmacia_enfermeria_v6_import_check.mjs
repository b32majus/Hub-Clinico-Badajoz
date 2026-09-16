#!/usr/bin/env node
// tools/farmacia_enfermeria_v6_import_check.mjs
// Verifica issue #365 (N1 of train #364) — Enfermería v6 multisheet importer
// Ingestion/normalization only: no FH export, no reconciliation.
// Frozen oracle semantics: /srv/kairos-lab/oracles/promueve-fh-enfermeria-v6-20260916/acceptance_contract_v1.json

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

// ─── Load scripts in VM sandbox ──────────────────────────────────────────────
const catalogPath = path.join(ROOT, 'scripts', 'farmacia_pautas_catalog.js');
const commonPath = path.join(ROOT, 'scripts', 'farmacia_common.js');
const catalogSrc = fs.readFileSync(catalogPath, 'utf8');
const commonSrc = fs.readFileSync(commonPath, 'utf8');

const requireNode = createRequire(import.meta.url);
const XLSX = requireNode(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

function makeStorageMock() {
  const store = {};
  return {
    getItem: function (key) { return store[key] === undefined ? null : store[key]; },
    setItem: function (key, value) { store[key] = String(value); },
    removeItem: function (key) { delete store[key]; }
  };
}

const mockDoc = {
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

class MockCustomEvent {
  constructor(type, opts) { this.type = type; this.detail = opts && opts.detail; }
}

const sandbox = {
  window: {
    localStorage: makeStorageMock(),
    sessionStorage: makeStorageMock()
  },
  XLSX: XLSX,
  console: console,
  document: mockDoc,
  CustomEvent: MockCustomEvent,
  location: { search: '' }
};
vm.createContext(sandbox);
vm.runInContext(catalogSrc, sandbox);
vm.runInContext(commonSrc, sandbox);

const F = sandbox.window.FarmaciaDemo;
const Imports = sandbox.window.FarmaciaDataImports;

const ORACLE_N1 = {
  clinical_sheets: ['DERMATOLOGÍA', 'REUMATOLOGÍA', 'DIGESTIVO'],
  ignored_sheets: ['PANEL_ENFERMERIA', 'LISTAS', 'INSTRUCCIONES'],
  required_headers: ['CIP', 'Patología', 'Fármaco', 'Fecha alta', 'Analítica', 'Mantoux', 'IGRA', 'VHB', 'VHC', 'VIH', 'Med. Preventiva', 'Apto para iniciar desde', 'Estado', 'Fecha OK', 'Observación prebiológico', 'Servicio', 'solicitud_id'],
  id_patterns: { 'DERMATOLOGÍA': '^SOL-DER-[0-9]{6}$', 'REUMATOLOGÍA': '^SOL-REU-[0-9]{6}$', 'DIGESTIVO': '^SOL-DIG-[0-9]{6}$' }
};

// ─── 1. v6 API exists ────────────────────────────────────────────────────────
console.log('\n[Section 1] v6 API surface');
assert(typeof F.isEnfermeriaV6Workbook === 'function', 'isEnfermeriaV6Workbook existe');
assert(typeof F.buildEnfermeriaV6HeaderMap === 'function', 'buildEnfermeriaV6HeaderMap existe');
assert(typeof F.normalizeEnfermeriaV6Row === 'function', 'normalizeEnfermeriaV6Row existe');
assert(typeof F.parseEnfermeriaV6Sheet === 'function', 'parseEnfermeriaV6Sheet existe');
assert(typeof F.collectEnfermeriaV6Candidates === 'function', 'collectEnfermeriaV6Candidates existe');
assert(typeof F.getEnfermeriaV6ClinicalSheetNames === 'function', 'getEnfermeriaV6ClinicalSheetNames existe');
assert(Array.isArray(F.getEnfermeriaV6ClinicalSheetNames()), 'getEnfermeriaV6ClinicalSheetNames devuelve array');
assertEqual(F.getEnfermeriaV6ClinicalSheetNames().join('|'), ORACLE_N1.clinical_sheets.join('|'), 'Hojas clínicas coinciden con oracle (orden incluido)');

// ─── 2. v6 recognition ───────────────────────────────────────────────────────
console.log('\n[Section 2] v6 workbook recognition');
const v6Workbook = { SheetNames: ['DERMATOLOGÍA', 'REUMATOLOGÍA', 'DIGESTIVO', 'PANEL_ENFERMERIA', 'LISTAS', 'INSTRUCCIONES'] };
assert(F.isEnfermeriaV6Workbook(v6Workbook), 'Reconoce v6 con 3 hojas clínicas + auxiliares');
assert(!F.isEnfermeriaV6Workbook({ SheetNames: ['DERMATOLOGÍA', 'REUMATOLOGÍA'] }), 'Rechaza sin las 3 hojas clínicas (falta DIGESTIVO)');
assert(!F.isEnfermeriaV6Workbook({ SheetNames: ['INICIO_BIOLOGICO', 'LISTAS'] }), 'Legacy INICIO_BIOLOGICO no es v6');
assert(!F.isEnfermeriaV6Workbook(null), 'Maneja null');
assert(!F.isEnfermeriaV6Workbook({}), 'Maneja objeto vacío');

// ─── 3. Header map per frozen oracle ─────────────────────────────────────────
console.log('\n[Section 3] v6 header map (frozen headers)');
const v6HeaderRow = ['CIP', 'Paciente', 'Patología', 'Fármaco', 'Fecha alta', 'Analítica', 'Mantoux', 'IGRA', 'VHB', 'VHC', 'VIH', 'Med. Preventiva', 'Apto para iniciar desde', 'Estado', 'Fecha OK', 'Observación prebiológico', 'Servicio', 'solicitud_id'];
const v6HeaderMap = F.buildEnfermeriaV6HeaderMap(v6HeaderRow);
assertTruthy(v6HeaderMap, 'Header map v6 construido');
assertEqual(v6HeaderMap.cip, 0, 'CIP columna 0');
assertEqual(v6HeaderMap.solicitudId, 17, 'solicitud_id columna 17');
assertEqual(v6HeaderMap.fechaAlta, 4, 'Fecha alta columna 4');
assertEqual(v6HeaderMap.aptoDesde, 12, 'Apto para iniciar desde columna 12');
assertEqual(v6HeaderMap.servicio, 16, 'Servicio columna 16');
assertEqual(v6HeaderMap.estado, 13, 'Estado columna 13');
assertEqual(v6HeaderMap.fechaOk, 14, 'Fecha OK columna 14');
assertEqual(v6HeaderMap.observacion, 15, 'Observación prebiológico columna 15');
assertEqual(v6HeaderMap.medPreventiva, 11, 'Med. Preventiva columna 11');

const missing = F.missingEnfermeriaV6RequiredHeaders(v6HeaderRow);
assert(Array.isArray(missing) && missing.length === 0, 'No faltan headers congelados');
const headerWithoutId = v6HeaderRow.filter(function (h) { return h !== 'solicitud_id'; });
assert(F.buildEnfermeriaV6HeaderMap(headerWithoutId) === null, 'Header map exige solicitud_id');
assert(F.missingEnfermeriaV6RequiredHeaders(headerWithoutId).indexOf('solicitud_id') !== -1, 'missing headers detecta solicitud_id ausente');

// ─── 4. Row normalization: identity + field preservation ─────────────────────
console.log('\n[Section 4] normalizeEnfermeriaV6Row');
const derSheet = ORACLE_N1.clinical_sheets[0];
const v6RowCells = ['CIP-DEMO-ENF-001', 'Paciente Demo ENF-001', 'Hidradenitis supurativa', 'Adalimumab', '2026-09-01', 'OK', 'NEGATIVO', 'NO PRECISA', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'PENDIENTE', '2026-09-10', 'EN VIGILANCIA', '', 'Pendiente cita Preventiva', 'Dermatología', 'SOL-DER-000001'];
const v6Row = F.normalizeEnfermeriaV6Row(v6RowCells, v6HeaderMap, derSheet);
assertTruthy(v6Row, 'Fila v6 normalizada');
assertEqual(v6Row.solicitud_id, 'SOL-DER-000001', 'solicitud_id preservado exactamente');
assertEqual(v6Row.cip_demo_o_hash, 'CIP-DEMO-ENF-001', 'CIP preservado');
assertEqual(v6Row.servicio_origen, 'Dermatología', 'Servicio preservado');
assertEqual(v6Row.servicio_hoja, 'DERMATOLOGÍA', 'Procedencia de hoja (servicio_hoja)');
assertEqual(v6Row.patologia_indicacion, 'Hidradenitis supurativa', 'Patología preservada');
assertEqual(v6Row.farmaco_solicitado, 'Adalimumab', 'Fármaco preservado como solicitado (farmaco_solicitado)');
assertEqual(v6Row.fecha_alta, '2026-09-01', 'Fecha alta preservada');
assertEqual(v6Row.analitica_estado, 'OK', 'Analítica preservada');
assertEqual(v6Row.mantoux_estado, 'NEGATIVO', 'Mantoux preservado');
assertEqual(v6Row.igra_estado, 'NO PRECISA', 'IGRA preservado');
assertEqual(v6Row.vhb_estado, 'NEGATIVO', 'VHB preservado');
assertEqual(v6Row.vhc_estado, 'NEGATIVO', 'VHC preservado');
assertEqual(v6Row.vih_estado, 'NEGATIVO', 'VIH preservado');
assertEqual(v6Row.medicina_preventiva_estado, 'PENDIENTE', 'Med. Preventiva preservada');
assertEqual(v6Row.apto_iniciar_desde, '2026-09-10', 'Apto para iniciar desde preservado');
assertEqual(v6Row.estado, 'EN VIGILANCIA', 'Estado leído del workbook (no recalculado)');
assertEqual(v6Row.estado_prebiologico_enfermeria, 'EN VIGILANCIA', 'estado_prebiologico_enfermeria = Estado leído');
assertEqual(v6Row.fecha_ok_farmacia, '', 'Fecha OK preservada (vacía)');
assertEqual(v6Row.observaciones_prebiologico, 'Pendiente cita Preventiva', 'Observación prebiológico preservada');
assertEqual(v6Row.source_type, 'ENFERMERIA', 'source_type ENFERMERIA');
assertEqual(v6Row.origen_solicitud, 'enfermeria', 'origen_solicitud enfermeria');
assertEqual(v6Row.tipo_origen, 'enfermeria_v6_multisheet', 'tipo_origen v6 distinguible del legacy');

// Row without CIP → null (vacuous even with formulas/formatting)
const vacuousCells = ['', 'Paciente Fantasma', 'HS', '=HOY()', 'OK', '', '', '', '', '', '', '', '', 'OK FARMACIA', '', 'texto', 'Dermatología', 'SOL-DER-999999'];
assertEqual(F.normalizeEnfermeriaV6Row(vacuousCells, v6HeaderMap, derSheet), null, 'Fila sin CIP no genera registro aunque tenga fórmula/formato');

// ─── 5. All three sheets contribute; union preserves provenance ──────────────
console.log('\n[Section 5] three clinical sheets union');
function sheetFromRows(headerRow, dataRows) {
  return [headerRow].concat(dataRows);
}
const derRows = sheetFromRows(v6HeaderRow, [
  ['CIP-DEMO-ENF-001', 'Paciente Demo ENF-001', 'Hidradenitis supurativa', 'Adalimumab', '2026-09-01', 'OK', 'NEGATIVO', 'NO PRECISA', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'PENDIENTE', '2026-09-10', 'EN VIGILANCIA', '', 'Pendiente cita Preventiva', 'Dermatología', 'SOL-DER-000001'],
  ['CIP-DEMO-ENF-001', 'Paciente Demo ENF-001', 'Hidradenitis supurativa', 'Secukinumab', '2026-09-02', 'OK', 'NEGATIVO', 'NO PRECISA', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'OK', '2026-09-12', 'OK FARMACIA', '2026-09-12', 'Prebiológico completo demo', 'Dermatología', 'SOL-DER-000002']
]);
const reuRows = sheetFromRows(v6HeaderRow, [
  ['CIP-DEMO-ENF-002', 'Paciente Demo ENF-002', 'Artritis Reumatoide (AR)', 'Etanercept', '2026-09-03', 'OK', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'OK', '2026-09-15', 'EN VIGILANCIA', '', '', 'Reumatología', 'SOL-REU-000003']
]);
const digRows = sheetFromRows(v6HeaderRow, [
  ['CIP-DEMO-ENF-003', 'Paciente Demo ENF-003', 'Enfermedad de Crohn', 'Infliximab', '2026-09-04', 'PENDIENTE', 'PENDIENTE', 'PENDIENTE', 'PENDIENTE', 'PENDIENTE', 'PENDIENTE', 'PENDIENTE', '', 'BLOQUEADO', '', 'Espera Mantoux', 'Digestivo', 'SOL-DIG-000004'],
  ['CIP-DEMO-ENF-004', 'Paciente Demo ENF-004', 'Colitis ulcerosa', 'Vedolizumab', '2026-09-05', 'OK', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'OK', '2026-09-20', 'OK FARMACIA', '2026-09-20', '', 'Digestivo', 'SOL-DIG-000005']
]);
const v6SheetsOk = [
  { name: 'DERMATOLOGÍA', rows: derRows },
  { name: 'REUMATOLOGÍA', rows: reuRows },
  { name: 'DIGESTIVO', rows: digRows }
];
const collected = F.collectEnfermeriaV6Candidates(v6SheetsOk);
assertTruthy(collected, 'collectEnfermeriaV6Candidates devuelve resultado');
assert(collected.ok === true, 'Importación v6 válida aceptada');
assertEqual(collected.rows.length, 5, 'Las tres hojas aportan registros (2 DER + 1 REU + 2 DIG)');
const ids = collected.rows.map(function (r) { return r.solicitud_id; });
assertEqual(ids.join(','), 'SOL-DER-000001,SOL-DER-000002,SOL-REU-000003,SOL-DIG-000004,SOL-DIG-000005', 'Unión en orden canónico de hojas');
const hojas = collected.rows.map(function (r) { return r.servicio_hoja; });
assertEqual(hojas.join('|'), 'DERMATOLOGÍA|DERMATOLOGÍA|REUMATOLOGÍA|DIGESTIVO|DIGESTIVO', 'Procedencia/servicio preservado por fila');

// Same CIP + two distinct IDs → two independent requests at import layer
const sameCipRows = collected.rows.filter(function (r) { return r.cip_demo_o_hash === 'CIP-DEMO-ENF-001'; });
assertEqual(sameCipRows.length, 2, 'Mismo CIP con dos IDs → dos solicitudes independientes');
assert(sameCipRows[0].solicitud_id !== sameCipRows[1].solicitud_id, 'IDs distintos para el mismo CIP');

// ─── 6. Rejections ───────────────────────────────────────────────────────────
console.log('\n[Section 6] safe rejections');
function collectVariant(mutator) {
  const sheets = [
    { name: 'DERMATOLOGÍA', rows: JSON.parse(JSON.stringify(derRows)) },
    { name: 'REUMATOLOGÍA', rows: JSON.parse(JSON.stringify(reuRows)) },
    { name: 'DIGESTIVO', rows: JSON.parse(JSON.stringify(digRows)) }
  ];
  mutator(sheets);
  return F.collectEnfermeriaV6Candidates(sheets);
}

// 6a. missing ID with CIP
const noId = collectVariant(function (sheets) { sheets[0].rows[1][17] = ''; });
assert(noId.ok === false, 'ID ausente con CIP → import rechazado');
assert(String(noId.reason || '').indexOf('SOLICITUD_ID') !== -1, 'Motivo de rechazo menciona solicitud_id');

// 6b. malformed ID
const badId = collectVariant(function (sheets) { sheets[0].rows[1][17] = 'SOL-DER-12'; });
assert(badId.ok === false, 'ID malformado → import rechazado');

// 6c. wrong service prefix (cross-sheet)
const wrongPrefix = collectVariant(function (sheets) { sheets[1].rows[1][17] = 'SOL-DER-000002'; });
assert(wrongPrefix.ok === false, 'ID duplicado cross-sheet con prefijo incorrecto → import rechazado');

// 6d. wrong prefix without duplication
const wrongPrefixOnly = collectVariant(function (sheets) { sheets[1].rows[1][17] = 'SOL-DER-900001'; });
assert(wrongPrefixOnly.ok === false, 'Prefijo de servicio incorrecto → import rechazado');

// 6e. duplicate cross-sheet ID (same prefix style impossible across sheets; use DER duplicated in DIG)
const crossDup = collectVariant(function (sheets) { sheets[2].rows[2][17] = 'SOL-DER-000001'; });
assert(crossDup.ok === false, 'solicitud_id repetido entre hojas → import rechazado');

// 6f. duplicate within same sheet
const intraDup = collectVariant(function (sheets) { sheets[0].rows[2] = ['CIP-DEMO-ENF-009', 'Paciente Demo ENF-009', 'Psoriasis', 'Secukinumab', '2026-09-06', 'OK', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'OK', '2026-09-21', 'OK FARMACIA', '2026-09-21', '', 'Dermatología', 'SOL-DER-000001']; });
assert(intraDup.ok === false, 'solicitud_id duplicado en la misma hoja → import rechazado');

// 6g. missing required header in one sheet
const missingHeader = collectVariant(function (sheets) { sheets[1].rows[0] = sheets[1].rows[0].filter(function (h) { return h !== 'VHC'; }); });
assert(missingHeader.ok === false, 'Header congelado ausente en hoja clínica → import rechazado');

// 6h. sheet missing entirely (partial v6)
const partial = F.collectEnfermeriaV6Candidates([
  { name: 'DERMATOLOGÍA', rows: derRows },
  { name: 'REUMATOLOGÍA', rows: reuRows }
]);
assert(partial.ok === false, 'Hoja clínica faltante → import rechazado');

// 6i. non-numeric suffix
const nonNumeric = collectVariant(function (sheets) { sheets[0].rows[1][17] = 'SOL-DER-ABC123'; });
assert(nonNumeric.ok === false, 'Sufijo no numérico → import rechazado');

// ─── 7. Legacy adapter untouched ─────────────────────────────────────────────
console.log('\n[Section 7] legacy INICIO_BIOLOGICO compatibility');
const legacyRows = [
  ['Título de la hoja'],
  [],
  ['CIP', 'Paciente', 'Servicio', 'Patología', 'Fármaco', 'Analítica', 'Mantoux', 'IGRA', 'VHB', 'VHC', 'VIH', 'Med. Preventiva', 'Estado', 'Fecha OK', 'Observación prebiológico'],
  ['000000001', 'Paciente A', 'Derma', 'HS', 'Secukinumab', 'OK', 'NEGATIVO', 'NO PRECISA', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'PENDIENTE', 'EN VIGILANCIA', '', 'Pendiente cita Preventiva']
];
const legacyParsed = F.parseEnfermeriaInicioBiologicoSheet(legacyRows, 'INICIO_BIOLOGICO');
assertEqual(legacyParsed.length, 1, 'Legacy parse sigue extrayendo filas');
assert(!('solicitud_id' in legacyParsed[0]), 'Legacy no exige ni añade solicitud_id');
assertEqual(legacyParsed[0].tipo_origen, 'enfermeria_inicio_biologico', 'Legacy mantiene tipo_origen propio (distinguible de v6)');
assert(F.isEnfermeriaInicioBiologicoWorkbook({ SheetNames: ['INICIO_BIOLOGICO'] }), 'Detección legacy intacta');

// ─── 8. Candidate build keeps Estado read-only and request-only drug ─────────
console.log('\n[Section 8] candidate build (Estado READ only, drug REQUESTED only)');
const buildCandidate = F.buildImportedPatientCandidate;
const candVig = buildCandidate(v6Row, { cip: 'cip_demo_o_hash', nombre: 'paciente_nombre', servicio: 'servicio_origen', patologia: 'patologia_indicacion', farmaco: 'farmaco_solicitado', fecha: 'fecha_alta' }, 'Enfermería', 0);
assertEqual(candVig.estado, 'en_vigilancia', 'Estado EN VIGILANCIA → en_vigilancia (leído, no recalculado)');
assertEqual(candVig.solicitud_id, 'SOL-DER-000001', 'solicitud_id viaja al candidato');
assertEqual(candVig.fechaSolicitud, '2026-09-01', 'Fecha alta mapeada a fechaSolicitud');
assertEqual(candVig.farmaco_solicitado || candVig.farmaco, 'Adalimumab', 'Fármaco solo como solicitado');
assert(candVig.estado !== 'validated', 'Importar no convierte tratamiento en validado');
const candOk = buildCandidate(
  { cip_demo_o_hash: 'CIP-DEMO-ENF-004', estado: 'OK FARMACIA', estado_prebiologico_enfermeria: 'OK FARMACIA', solicitud_id: 'SOL-DIG-000005' },
  { cip: 'cip_demo_o_hash' }, 'Enfermería', 1
);
assertEqual(candOk.estado, 'ok_farmacia', 'Estado OK FARMACIA → ok_farmacia (leído)');
assertEqual(candOk.solicitud_id, 'SOL-DIG-000005', 'solicitud_id preservado en candidato OK FARMACIA');
assert(!F.shouldEnfermeriaRowAppearInValidationInbox({ estado: 'EN VIGILANCIA' }), 'EN VIGILANCIA no entra en bandeja de validación');
assert(F.shouldEnfermeriaRowAppearInValidationInbox({ estado: 'OK FARMACIA' }), 'OK FARMACIA entra en bandeja de validación');

// ─── 9. End-to-end parseWorkbook with synthetic v6 fixture ───────────────────
console.log('\n[Section 9] end-to-end parseWorkbook (synthetic v6 fixture)');
const fixtureOk = path.join(ROOT, 'tools', 'fixtures', 'enfermeria_v6_sintetico_v1.xlsx');
const fixtureDup = path.join(ROOT, 'tools', 'fixtures', 'enfermeria_v6_sintetico_invalido_duplicado_v1.xlsx');
assert(fs.existsSync(fixtureOk), 'Fixture v6 sintético existe');
assert(fs.existsSync(fixtureDup), 'Fixture v6 inválido (duplicado cross-sheet) existe');

if (fs.existsSync(fixtureOk)) {
  const wbOk = XLSX.read(fs.readFileSync(fixtureOk), { type: 'array' });
  const state = Imports.parseWorkbook('enfermeria', wbOk, 'enfermeria_v6_sintetico_v1.xlsx');
  assertTruthy(state, 'parseWorkbook acepta v6 válido');
  assertEqual(state.format, 'enfermeria_v6_multisheet', 'Estado marcado como v6 multisheet');
  assertEqual(state.rowCount, 5, '5 registros de las 3 hojas clínicas');
  const e2eIds = state.rows.map(function (r) { return r.solicitud_id; });
  assert(e2eIds.indexOf('SOL-DER-000001') !== -1 && e2eIds.indexOf('SOL-REU-000003') !== -1 && e2eIds.indexOf('SOL-DIG-000004') !== -1, 'Las tres hojas clínicas aportan registros (e2e)');
  assert(state.rows.every(function (r) { return /^SOL-(DER|REU|DIG)-[0-9]{6}$/.test(r.solicitud_id); }), 'Todos los solicitud_id válidos en e2e');
  assert(state.rows.every(function (r) { return r.cip_demo_o_hash.indexOf('CIP-PANEL-NO') === -1; }), 'PANEL_ENFERMERIA no crea registros (e2e)');
  assertEqual(state.rows.filter(function (r) { return r.servicio_hoja === 'DIGESTIVO'; }).length, 2, 'DIGESTIVO aporta 2 registros (e2e)');
  const e2eOkState = Imports.getState('enfermeria');
  assertEqual(e2eOkState.fileName, 'enfermeria_v6_sintetico_v1.xlsx', 'Estado activo actualizado tras v6 válido');

  // Rejection preserves previously active Excel state
  if (fs.existsSync(fixtureDup)) {
    const wbDup = XLSX.read(fs.readFileSync(fixtureDup), { type: 'array' });
    let threw = false;
    try {
      Imports.parseWorkbook('enfermeria', wbDup, 'enfermeria_v6_sintetico_invalido_duplicado_v1.xlsx');
    } catch (err) {
      threw = true;
      assert(String(err.message || err).indexOf('Excel Enfermería v6 rechazado') === 0, 'Rechazo con mensaje claro: ' + (err.message || err));
    }
    assert(threw, 'parseWorkbook rechaza workbook inválido (e2e)');
    const afterState = Imports.getState('enfermeria');
    assertEqual(afterState.fileName, 'enfermeria_v6_sintetico_v1.xlsx', 'Estado Excel previo preservado tras rechazo');
    assertEqual(afterState.rowCount, 5, 'Registros previos intactos tras rechazo');
  }
} else {
  fail('No se puede ejecutar e2e sin fixture');
}

// Legacy end-to-end regression through parseWorkbook
const legacyTemplatePath = path.join(ROOT, 'templates', 'enfermeria_inicio_biologico_PROMueve_sintetico_v1.xlsx');
if (fs.existsSync(legacyTemplatePath)) {
  const wbLegacy = XLSX.read(fs.readFileSync(legacyTemplatePath), { type: 'array' });
  const legacyState = Imports.parseWorkbook('enfermeria', wbLegacy, 'enfermeria_inicio_biologico_PROMueve_sintetico_v1.xlsx');
  assertTruthy(legacyState, 'parseWorkbook acepta legacy INICIO_BIOLOGICO');
  assert(legacyState.format !== 'enfermeria_v6_multisheet', 'Legacy no se marca como v6');
  const legacyCandidates = (legacyState.rows || []).filter(function (r) { return r.tipo_origen === 'enfermeria_inicio_biologico'; });
  assert(legacyCandidates.length > 0, 'Legacy mantiene tipo_origen enfermeria_inicio_biologico (e2e)');
  assert(legacyState.rows.every(function (r) { return !('solicitud_id' in r); }), 'Legacy no introduce solicitud_id silenciosamente');
} else {
  console.log('  ~ plantilla legacy no encontrada; skip e2e legacy');
}


    // ─── 9b. N4: coherencia hoja/Servicio/prefijo fail-closed ────────────────────
    console.log('\n[Section 9b] N4 sheet/Servicio/prefix coherence (fail closed, no autocorrection)');
    // El Servicio se lee tal cual: la ausencia ya no se autocorrige con el
    // nombre de la hoja.
    const rowServicioVacio = F.normalizeEnfermeriaV6Row(
      v6RowCells.map(function (c, idx) { return idx === 16 ? '' : c; }),
      v6HeaderMap, derSheet
    );
    assertTruthy(rowServicioVacio, 'Fila con Servicio vacío se normaliza (la validación es de workbook)');
    assertEqual(rowServicioVacio.servicio_origen, '', 'Servicio vacío NO se autocorrige con el nombre de la hoja');
    assertEqual(rowServicioVacio.servicio_hoja, 'DERMATOLOGÍA', 'servicio_hoja conserva la procedencia real de la hoja');
    function collectVariantN4(mutator) {
      const sheets = [
        { name: 'DERMATOLOGÍA', rows: JSON.parse(JSON.stringify(derRows)) },
        { name: 'REUMATOLOGÍA', rows: JSON.parse(JSON.stringify(reuRows)) },
        { name: 'DIGESTIVO', rows: JSON.parse(JSON.stringify(digRows)) }
      ];
      mutator(sheets);
      return F.collectEnfermeriaV6Candidates(sheets);
    }
    const servicioVacio = collectVariantN4(function (sheets) { sheets[0].rows[1][16] = ''; });
    assert(servicioVacio.ok === false, 'N4.S1 Servicio vacío con CIP → import rechazado (fail closed)');
    assert(String(servicioVacio.reason || '').indexOf('SERVICIO') !== -1, 'N4.S1b motivo menciona SERVICIO');
    const servicioOtraHoja = collectVariantN4(function (sheets) { sheets[0].rows[1][16] = 'Reumatología'; });
    assert(servicioOtraHoja.ok === false, 'N4.S2 Servicio incoherente con la hoja → import rechazado');
    assert(String(servicioOtraHoja.reason || '').indexOf('Reumatología') !== -1 && String(servicioOtraHoja.reason || '').indexOf('DERMATOLOGÍA') !== -1, 'N4.S2b motivo nombra hoja esperada y Servicio leído');
    const servicioBasura = collectVariantN4(function (sheets) { sheets[2].rows[1][16] = 'Cardiología'; });
    assert(servicioBasura.ok === false, 'N4.S3 Servicio de otro servicio clínico → import rechazado');
    const servicioVariante = collectVariantN4(function (sheets) { sheets[0].rows[1][16] = 'DERMATOLOGIA'; });
    assert(servicioVariante.ok === true, 'N4.S4 Servicio equivalente (mayúsculas/sin acento) del MISMO servicio → aceptado');
    const servicioEspacios = collectVariantN4(function (sheets) { sheets[1].rows[1][16] = '  Reumatología  '; });
    assert(servicioEspacios.ok === true, 'N4.S5 Servicio con espacios periféricos → aceptado');
    // La coherencia no debilita las validaciones existentes: prefijo cruzado sigue rechazado
    const prefijoCruzadoN4 = collectVariantN4(function (sheets) { sheets[1].rows[1][17] = 'SOL-DER-900001'; });
    assert(prefijoCruzadoN4.ok === false, 'N4.S6 prefijo de solicitud_id cruzado con la hoja sigue rechazado');
    // Combinación coherente pero duplicada sigue rechazada
    const duplicadoN4 = collectVariantN4(function (sheets) { sheets[0].rows[2] = JSON.parse(JSON.stringify(derRows[1])); sheets[0].rows[2][17] = 'SOL-DER-000001'; });
    assert(duplicadoN4.ok === false, 'N4.S7 duplicado dentro de hoja sigue rechazado');

// ─── 10. innerHTML check ─────────────────────────────────────────────────────
const innerMatches = commonSrc.match(/innerHTML/g);
const innerCount = innerMatches ? innerMatches.length : 0;
assert(innerCount <= 3, `innerHTML en farmacia_common.js: ${innerCount} (máx 3)`);

console.log(`\n Total: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}`);
if (failed > 0) process.exit(1);
