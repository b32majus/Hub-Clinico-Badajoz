#!/usr/bin/env node
// tools/farmacia_reconcil_check.mjs
// Issue #367 (N3 of train #364) — deterministic reconciliation by exact
// solicitud_id between Enfermería v6 Excel and Farmacia FH Excel.
//
// Frozen oracle (READ-ONLY):
//   /srv/kairos-lab/oracles/promueve-fh-enfermeria-v6-20260916/acceptance_contract_v1.json
//   Its n3_cases are binding minimum acceptance and are asserted here.
//
// Covers:
// - the 7 frozen oracle n3_cases;
// - same CIP with distinct requests stays independent (no collapse);
// - same drug + distinct IDs never collapse (no CIP/drug/heuristic matching);
// - same ID with only non-validation acts (primera_visita/seguimiento) stays pending;
// - duplicate terminal same-result semantics (documented decision, no false
//   conflict) and pendiente + validado (pendiente is non-terminal);
// - incompatible terminals → RECONCILIATION_CONFLICT, row-order independent;
// - legacy records without solicitud_id are never closed heuristically
//   (LEGACY_NO_ID, distinguishable, legacy inbox behavior intact);
// - non-OK-FARMACIA Enfermería with terminal FH validation → reconciliation
//   inconsistency, fail closed, never ready-to-cite;
// - wiring: PENDING_FH stays in the pending validation inbox; READY/DENIED/
//   CONFLICT leave it; board visibility recomputes;
// - order independence both directions (nursing→farmacia and farmacia→nursing);
// - import substitution recomputes from the two active sources;
// - rejected import preserves the previous active source and reconciliation.

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];

function ok(msg) { console.log('  \u2713 ' + msg); passed++; }
function fail(msg) { console.log('  \u2717 ' + msg); failed++; errors.push(msg); }
function assert(condition, label) { if (condition) ok(label); else fail(label); }
function assertEqual(actual, expected, label) {
  if (actual === expected) ok(label + ': ' + JSON.stringify(expected));
  else fail(label + ': esperado ' + JSON.stringify(expected) + ', recibido ' + JSON.stringify(actual));
}

// ─── Frozen oracle integrity + n3_cases ──────────────────────────────────
const ORACLE_PATH = '/srv/kairos-lab/oracles/promueve-fh-enfermeria-v6-20260916/acceptance_contract_v1.json';
const ORACLE_SHA256 = '7eee21ed349dac274ba86441a6ed7f6eddfa18425d83a8f96b4926e53abc853d';
const oracleRaw = fs.readFileSync(ORACLE_PATH, 'utf8');
assertEqual(createHash('sha256').update(oracleRaw, 'utf8').digest('hex'), ORACLE_SHA256, 'Hash del frozen oracle intacto');
/* The frozen artifact has a truncated final closing brace (it ends right
   after the last n3_case object); it is read for semantics only and never
   modified. */
let oracleText = oracleRaw.trim();
if (oracleText.endsWith(',')) oracleText = oracleText.slice(0, -1);
if (oracleText.endsWith('}')) oracleText += ']'; // close n3_cases array
const ORACLE = JSON.parse(oracleText + '}');
assert(Array.isArray(ORACLE.n3_cases) && ORACLE.n3_cases.length === 7, 'Oracle n3_cases disponibles (7 casos)');

// ─── Load scripts in VM sandbox ──────────────────────────────────────────
const catalogSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_pautas_catalog.js'), 'utf8');
const commonSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_common.js'), 'utf8');
const requireNode = createRequire(import.meta.url);
const XLSX = requireNode(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

function makeStorageMock() {
  const store = {};
  return {
    getItem: (key) => (store[key] === undefined ? null : store[key]),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; }
  };
}
const mockDoc = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: () => null,
  createElement: () => ({}),
  documentElement: { style: {} },
  querySelector: () => null,
  querySelectorAll: () => [],
  dispatchEvent: () => true,
  body: { classList: { add: () => {}, remove: () => {} } }
};
class MockCustomEvent {
  constructor(type, opts) { this.type = type; this.detail = opts && opts.detail; }
}
const sandbox = {
  window: { localStorage: makeStorageMock(), sessionStorage: makeStorageMock() },
  XLSX,
  console,
  document: mockDoc,
  CustomEvent: MockCustomEvent,
  location: { search: '' }
};
vm.createContext(sandbox);
vm.runInContext(catalogSrc, sandbox);
vm.runInContext(commonSrc, sandbox);

const F = sandbox.window.FarmaciaDemo;
const Imports = sandbox.window.FarmaciaDataImports;

// ─── Builders through the real candidate pipeline ────────────────────────
const V6_MAP = { cip: 'cip_demo_o_hash', nombre: 'paciente_nombre', servicio: 'servicio_origen', patologia: 'patologia_indicacion', farmaco: 'farmaco_solicitado', fecha: 'fecha_alta' };
const FH_MAP = { cip: 'cip_demo_o_hash', tipoActoFH: 'tipo_acto_fh', resultadoValidacion: 'resultado_validacion', estadoRegistro: 'estado_registro', estadoLinea: 'estado_linea', tipoRelacion: 'tipo_relacion', solicitudId: 'solicitud_id' };

function v6Candidate(cip, estado, sid, extra) {
  return F.buildImportedPatientCandidate(Object.assign({
    cip_demo_o_hash: cip,
    paciente_nombre: 'Paciente ' + (sid || cip),
    servicio_origen: 'Dermatología',
    patologia_indicacion: 'Patología demo',
    farmaco_solicitado: 'Fármaco demo',
    fecha_alta: '2026-09-01',
    estado: estado,
    estado_prebiologico_enfermeria: estado,
    servicio_hoja: 'DERMATOLOGÍA',
    tipo_origen: 'enfermeria_v6_multisheet',
    solicitud_id: sid
  }, extra || {}), V6_MAP, 'Enfermería', 0);
}
function fhCandidate(fields) {
  return F.buildImportedPatientCandidate({
    cip_demo_o_hash: fields.cip,
    tipo_acto_fh: fields.tipoActo || '',
    resultado_validacion: fields.resultado || '',
    estado_registro: fields.estadoRegistro === undefined ? 'completado' : fields.estadoRegistro,
    solicitud_id: fields.sid || '',
    servicio_hoja: '01_DERMA'
  }, FH_MAP, 'Farmacia', 0);
}

const FIX_NURSING = path.join(ROOT, 'tools', 'fixtures', 'farmacia_reconcil_enfermeria_v6_sintetico_v1.xlsx');
const FIX_FH = path.join(ROOT, 'tools', 'fixtures', 'farmacia_reconcil_fh_sintetico_v1.xlsx');
assert(fs.existsSync(FIX_NURSING) && fs.existsSync(FIX_FH), 'Fixtures sintéticos N3 existen');

// ─── 1. API surface ───────────────────────────────────────────────────────
console.log('\n[Section 1] API superficie de reconciliación');
assert(typeof F.reconcileEnfermeriaSolicitud === 'function', 'reconcileEnfermeriaSolicitud exportada');
assert(typeof F.reconcileEnfermeriaSolicitudes === 'function', 'reconcileEnfermeriaSolicitudes exportada');
assert(typeof F.collectFHValidationActsBySolicitudId === 'function', 'collectFHValidationActsBySolicitudId exportada');
assert(typeof F.isFHValidationActCandidate === 'function', 'isFHValidationActCandidate exportada');
assert(typeof F.isEnfermeriaImportCandidate === 'function', 'isEnfermeriaImportCandidate exportada');
const snapshot1 = JSON.stringify(F.reconcileEnfermeriaSolicitudes([v6Candidate('CIP-P', 'OK FARMACIA', 'SOL-DER-000001')], []));
const snapshot2 = JSON.stringify(F.reconcileEnfermeriaSolicitudes([v6Candidate('CIP-P', 'OK FARMACIA', 'SOL-DER-000001')], []));
assertEqual(snapshot1, snapshot2, 'Función pura: resultado determinista y sin estado');
assert(!('reconciliacion_fh' in v6Candidate('CIP-P', 'OK FARMACIA', 'SOL-DER-000001')), 'La reconciliación no muta las filas de entrada');

// ─── 2. Frozen oracle n3_cases ────────────────────────────────────────────
console.log('\n[Section 2] Frozen oracle n3_cases (7 casos mínimos vinculantes)');
ORACLE.n3_cases.forEach(function (caso) {
  const sid = caso.id;
  const nursing = v6Candidate('CIP-ORACLE-' + sid, caso.nursing, sid);
  const pharmacy = (caso.pharmacy || []).map(function (resultado, i) {
    return fhCandidate({
      cip: 'CIP-ORACLE-' + sid,
      tipoActo: i === 0 ? 'validacion_inicial' : 'nueva_validacion_cambio',
      resultado: resultado,
      estadoRegistro: resultado === 'pendiente' ? 'pendiente_revision' : 'completado',
      sid: sid
    });
  });
  const res = F.reconcileEnfermeriaSolicitudes([nursing], pharmacy)[0];
  assertEqual(res.estado, caso.expected, 'Oracle ' + sid + ' (' + caso.nursing + ' + [' + (caso.pharmacy || []).join(',') + '])');
});

// ─── 3. Same CIP with distinct requests stays independent ────────────────
console.log('\n[Section 3] Same CIP + solicitudes distintas permanecen independientes');
const sameCipRes = F.reconcileEnfermeriaSolicitudes(
  [
    v6Candidate('CIP-SHARED', 'OK FARMACIA', 'SOL-DER-000008'),
    v6Candidate('CIP-SHARED', 'OK FARMACIA', 'SOL-DER-000009')
  ],
  [fhCandidate({ cip: 'CIP-SHARED', tipoActo: 'validacion_inicial', resultado: 'validado', sid: 'SOL-DER-000008' })]
);
assertEqual(sameCipRes.length, 2, 'Mismo CIP con dos IDs → dos solicitudes independientes');
assertEqual(sameCipRes[0].estado, 'READY_TO_CITE', 'Solicitud A validada por SU ID');
assertEqual(sameCipRes[1].estado, 'PENDING_FH', 'Solicitud B del mismo CIP NO se cierra por el acto de A');

// ─── 4. Same drug + distinct IDs never collapse ───────────────────────────
console.log('\n[Section 4] Same fármaco + IDs distintos no se colapsan');
const sameDrugRes = F.reconcileEnfermeriaSolicitudes(
  [
    v6Candidate('CIP-A', 'OK FARMACIA', 'SOL-DER-000101'),
    v6Candidate('CIP-A', 'OK FARMACIA', 'SOL-DER-000102')
  ],
  [
    fhCandidate({ cip: 'CIP-A', tipoActo: 'validacion_inicial', resultado: 'validado', sid: 'SOL-DER-000101' }),
    fhCandidate({ cip: 'CIP-A', tipoActo: 'validacion_inicial', resultado: 'validado', sid: 'SOL-ONC-999999' })
  ]
);
assertEqual(sameDrugRes[0].estado, 'READY_TO_CITE', 'ID 101 resuelto por su acto con el mismo ID');
assertEqual(sameDrugRes[1].estado, 'PENDING_FH', 'ID 102 no se cierra por CIP/fármaco ni por acto de otra solicitud');

// ─── 5. Only non-validation acts stay pending ─────────────────────────────
console.log('\n[Section 5] Solo actos no validación (primera_visita/seguimiento) → pendiente');
const noValidationRes = F.reconcileEnfermeriaSolicitudes(
  [v6Candidate('CIP-010', 'OK FARMACIA', 'SOL-DER-000010')],
  [
    fhCandidate({ cip: 'CIP-010', tipoActo: 'primera_visita', resultado: 'validado', sid: 'SOL-DER-000010' }),
    fhCandidate({ cip: 'CIP-010', tipoActo: 'seguimiento', sid: 'SOL-DER-000010' })
  ]
)[0];
assertEqual(noValidationRes.estado, 'PENDING_FH', 'Actos no validación nunca resuelven aunque lleven resultado');
assertEqual(noValidationRes.actos_no_validacion, 2, 'Actos no validación contados para detalle explícito');
assertEqual(noValidationRes.actos_validacion, 0, 'Ningún acto de validación FH contado');

// ─── 6. Duplicate terminal same-result + pendiente semantics ─────────────
console.log('\n[Section 6] Duplicado terminal con mismo resultado (decisión documentada)');
/* DECISIÓN (#367): terminales duplicados con el MISMO valor explícito
   (validado + validado, denegado + denegado) son semánticamente UNA resolución
   y NO producen falso conflicto; 'pendiente' no es terminal y no compite.
   Solo terminales INCOMPATIBLES (validado + denegado) son conflicto. */
assertEqual(F.reconcileEnfermeriaSolicitudes(
  [v6Candidate('CIP-D1', 'OK FARMACIA', 'SOL-DER-000201')],
  [
    fhCandidate({ cip: 'CIP-D1', tipoActo: 'validacion_inicial', resultado: 'validado', sid: 'SOL-DER-000201' }),
    fhCandidate({ cip: 'CIP-D1', tipoActo: 'nueva_validacion_cambio', resultado: 'validado', sid: 'SOL-DER-000201' })
  ]
)[0].estado, 'READY_TO_CITE', 'Decisión: validado+validado es UNA resolución (no conflicto)');
assertEqual(F.reconcileEnfermeriaSolicitudes(
  [v6Candidate('CIP-D2', 'OK FARMACIA', 'SOL-DER-000202')],
  [
    fhCandidate({ cip: 'CIP-D2', tipoActo: 'validacion_inicial', resultado: 'pendiente', estadoRegistro: 'pendiente_revision', sid: 'SOL-DER-000202' }),
    fhCandidate({ cip: 'CIP-D2', tipoActo: 'nueva_validacion_cambio', resultado: 'validado', sid: 'SOL-DER-000202' })
  ]
)[0].estado, 'READY_TO_CITE', 'Decisión: pendiente no compite con terminal validado');
assertEqual(F.reconcileEnfermeriaSolicitudes(
  [v6Candidate('CIP-D3', 'OK FARMACIA', 'SOL-DER-000203')],
  [
    fhCandidate({ cip: 'CIP-D3', tipoActo: 'validacion_inicial', resultado: 'denegado', sid: 'SOL-DER-000203' }),
    fhCandidate({ cip: 'CIP-D3', tipoActo: 'nueva_validacion_adicion', resultado: 'denegado', sid: 'SOL-DER-000203' })
  ]
)[0].estado, 'DENIED_DO_NOT_CITE', 'Decisión: denegado+denegado es UNA resolución (no conflicto)');

// ─── 7. Incompatible terminals → conflict, row-order independent ─────────
console.log('\n[Section 7] Terminales incompatibles → conflicto fail closed, sin orden de filas');
const conflictingActs = [
  fhCandidate({ cip: 'CIP-007', tipoActo: 'validacion_inicial', resultado: 'validado', sid: 'SOL-DER-000007' }),
  fhCandidate({ cip: 'CIP-007', tipoActo: 'nueva_validacion_cambio', resultado: 'denegado', sid: 'SOL-DER-000007' })
];
[conflictingActs, conflictingActs.slice().reverse(), [conflictingActs[1], conflictingActs[1], conflictingActs[0]]].forEach(function (orden, idx) {
  const res = F.reconcileEnfermeriaSolicitudes([v6Candidate('CIP-007', 'OK FARMACIA', 'SOL-DER-000007')], orden)[0];
  assertEqual(res.estado, 'RECONCILIATION_CONFLICT', 'Conflicto invariante ante orden/duplicación de filas (variante ' + idx + ')');
  assert(res.estado !== 'READY_TO_CITE', 'Nunca listo para citar (variante ' + idx + ')');
  assertEqual(res.terminales.slice().sort().join('|'), 'denegado|validado', 'Terminales leídos explícitamente (variante ' + idx + ')');
});

// ─── 8. Legacy without solicitud_id never closed heuristically ───────────
console.log('\n[Section 8] Legacy sin solicitud_id: nunca cierre por heurística');
const legacyNursing = v6Candidate('CIP-LEGACY', 'OK FARMACIA', '');
assert(!('solicitud_id' in legacyNursing) || legacyNursing.solicitud_id === undefined, 'Legacy no inventa solicitud_id');
const heuristicDecoy = [
  fhCandidate({ cip: 'CIP-LEGACY', tipoActo: 'validacion_inicial', resultado: 'validado', sid: '' }),
  fhCandidate({ cip: 'CIP-LEGACY', tipoActo: 'validacion_inicial', resultado: 'validado', sid: 'SOL-ONC-888888' })
];
const legacyRes = F.reconcileEnfermeriaSolicitudes([legacyNursing], heuristicDecoy)[0];
assertEqual(legacyRes.estado, 'LEGACY_NO_ID', 'Legacy sin ID → LEGACY_NO_ID (distinguible, no reconciliable por identidad)');
assertEqual(legacyRes.reconciliable, false, 'Legacy marcado explícitamente no reconciliable');
assertEqual(F.shouldEnfermeriaRowAppearInValidationInbox(
  Object.assign(mergeRecordForTest(legacyNursing), { reconciliacion_fh: legacyRes })
), true, 'Legacy OK FARMACIA sigue pendiente aunque existan actos validados con mismo CIP/fármaco');
function mergeRecordForTest(patient) { return patient; }

// ─── 9. Non-OK-FARMACIA with terminal FH → inconsistency, fail closed ────
console.log('\n[Section 9] Terminal FH con Enfermería no OK FARMACIA → incidencia fail closed');
const vigRes = F.reconcileEnfermeriaSolicitudes(
  [v6Candidate('CIP-REU8', 'EN VIGILANCIA', 'SOL-REU-000008')],
  [fhCandidate({ cip: 'CIP-REU8', tipoActo: 'validacion_inicial', resultado: 'validado', sid: 'SOL-REU-000008' })]
)[0];
assertEqual(vigRes.estado, 'NURSING_SURVEILLANCE', 'EN VIGILANCIA se conserva (solo lectura, nunca recalculado)');
assertEqual(vigRes.inconsistencia, true, 'Incidencia de reconciliación explícita');
assert(vigRes.estado !== 'READY_TO_CITE', 'NUNCA listo para citar desde vigilancia');
const bloqRes = F.reconcileEnfermeriaSolicitudes(
  [v6Candidate('CIP-DIG6', 'BLOQUEADO', 'SOL-DIG-000006')],
  [fhCandidate({ cip: 'CIP-DIG6', tipoActo: 'validacion_inicial', resultado: 'validado', sid: 'SOL-DIG-000006' })]
)[0];
assertEqual(bloqRes.estado, 'NURSING_BLOCKED', 'BLOQUEADO se conserva');
assertEqual(bloqRes.inconsistencia, true, 'BLOQUEADO + terminal FH → incidencia fail closed');
const vigSinActos = F.reconcileEnfermeriaSolicitudes(
  [v6Candidate('CIP-REU5', 'EN VIGILANCIA', 'SOL-REU-000005')],
  []
)[0];
assertEqual(vigSinActos.estado, 'NURSING_SURVEILLANCE', 'Vigilancia sin actos → estado propio sin incidencia');
assertEqual(vigSinActos.inconsistencia, false, 'Sin incidencia cuando no hay terminal FH');

// ─── 10. Wiring: pending validation inbox + board visibility ─────────────
console.log('\n[Section 10] Wiring bandeja de pendientes y visibilidad del board');
const realGetImportedPatients = Imports.getImportedPatients;
const wiringCandidates = [
  v6Candidate('CIP-W1', 'OK FARMACIA', 'SOL-DER-000301'),
  v6Candidate('CIP-W2', 'OK FARMACIA', 'SOL-DER-000302'),
  v6Candidate('CIP-W3', 'OK FARMACIA', 'SOL-DER-000303'),
  v6Candidate('CIP-W4', 'OK FARMACIA', 'SOL-DER-000304'),
  fhCandidate({ cip: 'CIP-GENERAL', tipoActo: 'validacion_inicial', resultado: 'pendiente', estadoRegistro: 'pendiente_revision', sid: 'SOL-DER-000301' }),
  fhCandidate({ cip: 'CIP-W2', tipoActo: 'validacion_inicial', resultado: 'validado', sid: 'SOL-DER-000302' }),
  fhCandidate({ cip: 'CIP-W3', tipoActo: 'validacion_inicial', resultado: 'denegado', sid: 'SOL-DER-000303' })
];
sandbox.window.FarmaciaDataImports.getImportedPatients = function () { return wiringCandidates; };
const resolvedStillPending = F.getPendingValidationPatients().filter(function (p) {
  return p.solicitud_id && ['READY_TO_CITE', 'DENIED_DO_NOT_CITE', 'RECONCILIATION_CONFLICT'].indexOf((p.reconciliacion_fh || {}).estado) !== -1;
});
assertEqual(resolvedStillPending.length, 0, 'READY/DENIED/CONFLICT dejan de aparecer como pendientes de validar');
const stillPendingFh = F.getPendingValidationPatients().filter(function (p) {
  return p.solicitud_id && (p.reconciliacion_fh || {}).estado === 'PENDING_FH';
});
assertEqual(stillPendingFh.length, 2, 'Solo PENDING_FH sigue en la bandeja de pendientes');
const pendingSids = stillPendingFh.map(function (p) { return p.solicitud_id; }).sort();
assert(pendingSids.join('|') === 'SOL-DER-000301|SOL-DER-000304', 'Pendientes correctas (acto explícito + sin actos): ' + pendingSids.join('|'));
const visibleWiring = F.getEnfermeriaVisiblePatients().filter(function (p) {
  return p.solicitud_id && p.solicitud_id.indexOf('SOL-DER-00030') === 0;
});
assertEqual(visibleWiring.length, 4, 'Las 4 solicitudes v6 siguen visibles en el board Enfermería');
const estadosBySid = {};
visibleWiring.forEach(function (p) { estadosBySid[p.solicitud_id] = (p.reconciliacion_fh || {}).estado || null; });
assertEqual(estadosBySid['SOL-DER-000301'], 'PENDING_FH', '000301 → PENDING_FH');
assertEqual(estadosBySid['SOL-DER-000302'], 'READY_TO_CITE', '000302 → READY_TO_CITE');
assertEqual(estadosBySid['SOL-DER-000303'], 'DENIED_DO_NOT_CITE', '000303 → DENIED_DO_NOT_CITE');
assertEqual(estadosBySid['SOL-DER-000304'], 'PENDING_FH', '000304 sin actos → PENDING_FH');

// ─── 11. Order independence both directions + substitution ───────────────
console.log('\n[Section 11] Independencia de orden de carga y sustitución de importación');
const orderNursing = [
  v6Candidate('CIP-O1', 'OK FARMACIA', 'SOL-DER-000401'),
  v6Candidate('CIP-O2', 'OK FARMACIA', 'SOL-DER-000402'),
  v6Candidate('CIP-O3', 'EN VIGILANCIA', 'SOL-REU-000403')
];
const orderPharmacy = [
  fhCandidate({ cip: 'CIP-O2', tipoActo: 'validacion_inicial', resultado: 'validado', sid: 'SOL-DER-000402' }),
  fhCandidate({ cip: 'CIP-O1', tipoActo: 'validacion_inicial', resultado: 'denegado', sid: 'SOL-DER-000401' })
];
function boardSnapshot(imported) {
  sandbox.window.FarmaciaDataImports.getImportedPatients = function () { return imported; };
  const states = F.getEnfermeriaVisiblePatients().filter(function (p) { return p.solicitud_id; })
    .map(function (p) {
      const rec = p.reconciliacion_fh;
      return p.solicitud_id + '=' + (rec ? rec.estado : 'SIN_REC') + (rec && rec.inconsistencia ? '+INC' : '');
    }).sort();
  const pending = F.getPendingValidationPatients().filter(function (p) { return p.solicitud_id; })
    .map(function (p) { return p.solicitud_id; }).sort();
  return JSON.stringify({ states: states, pending: pending });
}
// Emulación de orden de carga: Enfermería primero (A) vs Farmacia primero (B)
const snapshotAB = boardSnapshot(orderNursing.concat(orderPharmacy));
const snapshotBA = boardSnapshot(orderPharmacy.concat(orderNursing));
assertEqual(snapshotBA, snapshotAB, 'Orden de carga A→B y B→A producen el mismo resultado reconciliado');
// Sustitución de importación: la fuente activa nueva recalcula
const replacementNursing = orderNursing.map(function (p) {
  return Object.assign({}, p, { solicitud_id: p.solicitud_id.replace('0004', '0005') });
});
const snapshotReplaced = boardSnapshot(orderPharmacy.concat(replacementNursing));
assert(snapshotReplaced !== snapshotAB, 'Sustitución de la fuente Enfermería recalcula la reconciliación');
assert(snapshotReplaced.indexOf('SOL-DER-000402=READY_TO_CITE') === -1, 'El estado previo no queda stale tras la sustitución');

// ─── 12. E2E with real fixtures + rejected import preserves state ────────
console.log('\n[Section 12] E2E fixtures reales + importación rechazada preserva reconciliación');
sandbox.window.FarmaciaDataImports.getImportedPatients = realGetImportedPatients;
const wbNursing = XLSX.read(fs.readFileSync(FIX_NURSING), { type: 'array' });
const wbFH = XLSX.read(fs.readFileSync(FIX_FH), { type: 'array' });
sandbox.window.FarmaciaBridgeV2Reader = { readWorkbook: function () { return null; } };
Imports.parseWorkbook('farmacia', wbFH, 'farmacia_reconcil_fh_sintetico_v1.xlsx');
Imports.parseWorkbook('enfermeria', wbNursing, 'farmacia_reconcil_enfermeria_v6_sintetico_v1.xlsx');
const expectedStates = {
  'SOL-DER-000001': 'PENDING_FH',
  'SOL-DER-000002': 'PENDING_FH',
  'SOL-DER-000003': 'READY_TO_CITE',
  'SOL-DER-000004': 'DENIED_DO_NOT_CITE',
  'SOL-DER-000007': 'RECONCILIATION_CONFLICT',
  'SOL-DER-000008': 'READY_TO_CITE',
  'SOL-DER-000009': 'PENDING_FH',
  'SOL-DER-000010': 'PENDING_FH',
  'SOL-REU-000005': 'NURSING_SURVEILLANCE',
  'SOL-REU-000008': 'NURSING_SURVEILLANCE+INCIDENCIA',
  'SOL-DIG-000006': 'NURSING_BLOCKED'
};
const seenStates = {};
F.getEnfermeriaVisiblePatients().forEach(function (p) {
  if (!p.solicitud_id) return;
  const rec = p.reconciliacion_fh;
  let key = rec ? rec.estado : 'SIN_REC';
  if (rec && rec.inconsistencia) key += '+INCIDENCIA';
  seenStates[p.solicitud_id] = key;
});
Object.keys(expectedStates).forEach(function (sid) {
  assertEqual(seenStates[sid], expectedStates[sid], 'E2E fixture ' + sid);
});
const e2ePendingResolved = F.getPendingValidationPatients().filter(function (p) {
  return p.solicitud_id && ['READY_TO_CITE', 'DENIED_DO_NOT_CITE', 'RECONCILIATION_CONFLICT'].indexOf((p.reconciliacion_fh || {}).estado) !== -1;
});
assertEqual(e2ePendingResolved.length, 0, 'E2E: ninguna solicitud resuelta queda como pendiente de validar');
const e2ePendingFh = F.getPendingValidationPatients().filter(function (p) {
  return p.solicitud_id && (p.reconciliacion_fh || {}).estado === 'PENDING_FH';
});
assertEqual(e2ePendingFh.length, 4, 'E2E PENDING_FH = 4 (000001, 000002, 000009, 000010)');

const FIX_DUP = path.join(ROOT, 'tools', 'fixtures', 'enfermeria_v6_sintetico_invalido_duplicado_v1.xlsx');
if (fs.existsSync(FIX_DUP)) {
  const before = candidatesSnapshot();
  let threw = false;
  try {
    Imports.parseWorkbook('enfermeria', XLSX.read(fs.readFileSync(FIX_DUP), { type: 'array' }), 'duplicado.xlsx');
  } catch (err) {
    threw = true;
    assert(String(err.message || err).indexOf('Excel Enfermería v6 rechazado') === 0, 'Rechazo con mensaje claro: ' + (err.message || err));
  }
  assert(threw, 'Workbook v6 duplicado rechazado');
  assertEqual(candidatesSnapshot(), before, 'Rechazo preserva las fuentes activas y su reconciliación');
} else {
  console.log('  ~ fixture duplicado no encontrado; skip');
}
function candidatesSnapshot() {
  return F.getEnfermeriaVisiblePatients().filter(function (p) { return p.solicitud_id; })
    .map(function (p) { return p.solicitud_id + '=' + ((p.reconciliacion_fh || {}).estado || 'SIN_REC'); })
    .sort().join('|');
}

console.log(`\n Total: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}`);
if (failed > 0) process.exit(1);
