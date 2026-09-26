#!/usr/bin/env node
'use strict';
/**
 * Oracle for `scripts/reuma_patient_read_port.js` (F5.1 / #429 — WU-A).
 *
 * The checker sandboxes the real, unmodified legacy modules (`modules/hubTools.js`,
 * `modules/fieldNormalizer.js`, `modules/dataManager.js`) with the frozen synthetic
 * corpus (`tools/fixtures/reuma_read/corpus_v1.json`) through `tools/reuma_read_harness.mjs`,
 * loads the port module in the SAME sandbox, and asserts the frozen contract in
 * `wu-429-frozen-interface.md` PART 2 cases 1-13 (case 14 belongs to WU-B).
 *
 * Parity is proved against the real legacy read surface, never a second read model.
 * The oracle can disagree: cases 6/7/8/11 plant negatives that MUST be detected.
 *
 * Exit codes: 0 = every case PASS, 1 = at least one case FAIL.
 * Usage: node tools/reuma_patient_read_port_check.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createLegacySandbox } from './reuma_read_harness.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const CORPUS_FILE = path.join(ROOT, 'tools', 'fixtures', 'reuma_read', 'corpus_v1.json');
const PORT_FILE = path.join(ROOT, 'scripts', 'reuma_patient_read_port.js');
const PORT_RELATIVE = 'scripts/reuma_patient_read_port.js';
const CORPUS_RAW = fs.readFileSync(CORPUS_FILE, 'utf8');
const CORPUS = JSON.parse(CORPUS_RAW);
const SHEET_ORDER = ['ESPA', 'APS', 'AR', 'LES', 'SJOGREN'];
const PATIENT_IDS = SHEET_ORDER
  .flatMap((sheet) => (CORPUS.sheets[sheet] || []).map((row) => row.ID_Paciente))
  .filter((id, index, all) => all.indexOf(id) === index);
const ID_SHAPE = /^(ESP|APS|AR)-\d{4}-\d{3}$/i;
const REQUIRED_METHODS = ['getAllPatients', 'findPatientById', 'getPatientHistory'];
const PORT_METHODS = ['listPatients', 'resolvePatient', 'readPatientBundle'];

let PORT_SOURCE = null;
let ctx = null;

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function canonical(value) {
  return JSON.stringify(value);
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function foldTerm(value) {
  // Exact legacy consumer normalize(): lowercase, strip accents, keep [a-z0-9].
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function loadPortModule(sandbox, source) {
  vm.runInContext(source, sandbox, { filename: PORT_RELATIVE });
  const Port = sandbox.ReumaPatientReadPort;
  assert.ok(Port, `${PORT_RELATIVE} must expose globalThis.ReumaPatientReadPort`);
  return Port;
}

function createSandbox(options = {}) {
  const { sandbox, sink } = createLegacySandbox();
  if (options.ready) sandbox.sessionStorage.setItem('hubClinicoDB', JSON.stringify({ synthetic: true }));
  const Port = loadPortModule(sandbox, PORT_SOURCE);
  return { sandbox, sink, Port };
}

async function loadCorpusInto(sandbox) {
  const workbook = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(CORPUS.sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
  }
  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const file = {
    name: 'reuma_read_port_check.xlsx',
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
  return sandbox.HubTools.data.loadDatabase(file);
}

function delegateWith(overrides = {}) {
  const allPatients = overrides.allPatients || [];
  const recordById = overrides.recordById || (() => null);
  const historyById = overrides.historyById || (() => ({
    allVisits: [], latestVisit: null, firstVisit: null, pathology: null, treatmentHistory: [], keyEvents: [],
  }));
  return {
    getAllPatients: () => allPatients,
    findPatientById: (id) => recordById(id),
    getPatientHistory: (id) => historyById(id),
  };
}

function installEventBus(sandbox) {
  // The harness collapses window === globalThis while document is a separate stub,
  // so a databaseLoaded event is delivered to listeners registered on either target.
  const listeners = new Map();
  const add = (type, handler) => {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(handler);
  };
  sandbox.document.addEventListener = add;
  sandbox.addEventListener = add;
  sandbox.window.addEventListener = add;
  const dispatch = (event) => {
    for (const handler of listeners.get(event.type) || []) handler(event);
    return true;
  };
  sandbox.dispatchEvent = dispatch;
  sandbox.window.dispatchEvent = dispatch;
  return { dispatch: (type, detail) => dispatch(new sandbox.CustomEvent(type, { detail })) };
}

// ---------------------------------------------------------------------------
// Oracle for the frozen read semantics (independent of the port implementation)
// ---------------------------------------------------------------------------

function projectListRow(normalizer, row) {
  const normalized = normalizer.normalizeRecord(row);
  return {
    id: normalized.idPaciente || row.ID || row.id,
    nombre: normalized.nombrePaciente || row.Nombre || row.nombre,
  };
}

function expectedPatientList(normalizer, rows) {
  const out = [];
  for (const row of rows) {
    const { id, nombre } = projectListRow(normalizer, row);
    if (!id || !nombre) continue;
    out.push({ id, nombre });
  }
  return out;
}

function expectedIndex(normalizer, rows) {
  const out = [];
  for (const row of rows) {
    const normalized = normalizer.normalizeRecord(row);
    const id = normalized.idPaciente || row.ID || row.id;
    const nombre = normalized.nombrePaciente || row.Nombre || row.nombre;
    const diagnostico = normalized.diagnosticoPrimario || row.Diagnostico;
    if (!id || !nombre) continue;
    const folded = foldTerm(id);
    if (!folded) continue;
    if (out.some((entry) => foldTerm(entry.id) === folded)) continue;
    out.push({ id, nombre, patologia: normalizer.normalizePathology(diagnostico) || null });
  }
  return out;
}

function expectedResolve(index, term) {
  const folded = foldTerm(term);
  if (!folded) return { status: 'error', error_code: 'empty_term' };
  const exact = index.find((entry) => foldTerm(entry.id) === folded);
  if (exact) return { status: 'ok', patient: { id: exact.id, nombre: exact.nombre, patologia: exact.patologia } };
  const matchingByName = index.filter((entry) => foldTerm(entry.nombre).includes(folded));
  if (matchingByName.length === 1) {
    const only = matchingByName[0];
    return { status: 'ok', patient: { id: only.id, nombre: only.nombre, patologia: only.patologia } };
  }
  if (matchingByName.length > 1) {
    // Additive contract: `total` is the true match count; `candidates` stays capped at 3 in index order.
    return {
      status: 'ambiguous',
      total: matchingByName.length,
      candidates: matchingByName.slice(0, 3).map((e) => ({ id: e.id, nombre: e.nombre })),
    };
  }
  if (ID_SHAPE.test(term)) return { status: 'not_found', reason: 'id_not_found' };
  return { status: 'not_found', reason: 'no_match' };
}

// ---------------------------------------------------------------------------
// Falsifiable predicates used positively and as planted negatives
// ---------------------------------------------------------------------------

function bundleViolations(actual, expectedRecord, expectedHistory) {
  const violations = [];
  if (!actual || actual.status !== 'ok') {
    violations.push(`status ${actual && actual.status} instead of ok`);
    return violations;
  }
  if (canonical(plain(actual.patient.record)) !== canonical(plain(expectedRecord))) violations.push('record differs from the legacy baseline');
  if (canonical(plain(actual.patient.history)) !== canonical(plain(expectedHistory))) violations.push('history differs from the legacy baseline');
  return violations;
}

function isolationViolations(bundle, expectedId) {
  const violations = [];
  if (!bundle || bundle.status !== 'ok') return violations;
  const recordId = String(bundle.patient.record.ID_Paciente ?? bundle.patient.record.idPaciente ?? '');
  if (recordId && recordId !== expectedId) violations.push(`record id ${recordId} !== ${expectedId}`);
  for (const visit of bundle.patient.history.allVisits || []) {
    const visitId = String(visit.ID_Paciente ?? visit.idPaciente ?? '');
    if (visitId && visitId !== expectedId) violations.push(`visit id ${visitId} !== ${expectedId}`);
  }
  return violations;
}

function sentinelViolations(bundle, expectedRecord, expectedHistory) {
  const fields = ['FR', 'APCC', 'PCR', 'NAD_Total', 'NAT_Total', 'Dactilitis_Total', 'Decision_Terapeutica_SEG'];
  const pairs = [[bundle.patient.record, expectedRecord, 'record']];
  const visits = bundle.patient.history.allVisits || [];
  const expectedVisits = expectedHistory.allVisits || [];
  visits.forEach((visit, index) => pairs.push([visit, expectedVisits[index], `visit[${index}]`]));
  const violations = [];
  for (const [actual, expected, label] of pairs) {
    if (!expected) continue;
    for (const field of fields) {
      if (field in expected && !Object.is(actual[field], expected[field])) {
        violations.push(`${label}.${field}: ${canonical(actual[field])} !== ${canonical(expected[field])}`);
      }
    }
  }
  return violations;
}

function hygieneViolations(corpus) {
  const violations = [];
  if (corpus.syntheticOnly !== true) violations.push('corpus.syntheticOnly must be true');
  for (const [sheet, rows] of Object.entries(corpus.sheets || {})) {
    for (const row of rows) {
      const id = row.ID_Paciente;
      if (typeof id !== 'string' || !id.startsWith('SYN-')) violations.push(`${sheet}: ${canonical(id)}`);
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// PART 2 cases 1-13
// ---------------------------------------------------------------------------

const CASES = [
  {
    name: 'case 1: create() fails closed on a missing method; the port and every result are frozen',
    async run() {
      for (const missing of REQUIRED_METHODS) {
        const delegate = delegateWith();
        delete delegate[missing];
        assert.throws(
          () => ctx.Port.create(delegate),
          // Realm-safe: the vm-realm error is not an instance of the host `Error`.
          (error) => new RegExp(`ReumaPatientReadPort: missing implementation method ${missing}`).test(String((error && error.message) || error)),
          `create() must reject a delegate missing ${missing}`
        );
      }
      assert.throws(() => ctx.Port.create({}), /ReumaPatientReadPort: missing implementation method/);
      const port = ctx.Port.create(delegateWith());
      assert.equal(Object.isFrozen(port), true, 'create() must return a frozen port');
      for (const method of PORT_METHODS) assert.equal(typeof port[method], 'function');
      assert.equal(typeof port.listPatients().then, 'function', 'methods must be async');
      const results = [
        await port.listPatients(),
        await port.resolvePatient('Sintetico'),
        await port.resolvePatient(''),
        await port.readPatientBundle(PATIENT_IDS[0]),
      ];
      for (const result of results) assert.equal(Object.isFrozen(result), true, `every result must be an own frozen value: ${canonical(result)}`);
    },
  },
  {
    name: 'case 2: getPort() is null without HubTools.data and a stable singleton with it',
    async run() {
      const { sandbox, Port } = createSandbox();
      sandbox.HubTools.data = undefined;
      assert.equal(Port.getPort(), null, 'getPort() must be null without HubTools.data');
      sandbox.HubTools.data = { getAllPatients() { return []; } };
      assert.equal(Port.getPort(), null, 'getPort() must be null when methods are missing');
      sandbox.HubTools.data = { getAllPatients() { return []; }, findPatientById() { return null; } };
      assert.equal(Port.getPort(), null, 'getPort() must be null without getPatientHistory');
      sandbox.HubTools.data = delegateWith();
      const first = Port.getPort();
      assert.ok(first, 'getPort() must build a port from an ambient HubTools.data exposing all three methods');
      assert.equal(Object.isFrozen(first), true);
      assert.equal(Port.getPort(), first, 'getPort() must cache one singleton');
      assert.equal(Port.getPort(), first);
      assert.deepEqual(plain(await first.listPatients()), { status: 'unavailable' }, 'without a readiness signal an empty delegate is unavailable');
      const ready = createSandbox({ ready: true });
      ready.sandbox.HubTools.data = delegateWith();
      const readyPort = ready.Port.getPort();
      assert.ok(readyPort, 'getPort() must build from the ambient HubTools.data with a readiness signal');
      assert.deepEqual(plain(await readyPort.listPatients()), { status: 'ok', patients: [] }, 'with a readiness signal an empty delegate is an empty ok list');
    },
  },
  {
    name: 'case 3: listPatients() matches the legacy projection (order, count, no dedupe, empty-field skips)',
    async run() {
      const expected = expectedPatientList(ctx.normalizer, ctx.rows);
      const result = await ctx.port.listPatients();
      assert.equal(result.status, 'ok');
      assert.equal(Object.isFrozen(result), true);
      assert.deepEqual(plain(result.patients), expected, 'listPatients() must project the delegate rows faithfully');
      assert.equal(result.patients.length, 8, 'every corpus row is identity-complete');
      assert.equal(result.patients.length, ctx.rows.length, 'listPatients() must not dedupe (one entry per non-empty row)');
      const incomplete = ctx.Port.create(delegateWith({
        allPatients: [
          { ID_Paciente: '', Nombre_Paciente: 'Sin id' },
          { ID_Paciente: 'SYN-X-001', Nombre_Paciente: '' },
          { ID_Paciente: 'SYN-X-002', Nombre_Paciente: 'Con nombre' },
        ],
      }));
      const skipped = await incomplete.listPatients();
      assert.deepEqual(plain(skipped.patients), [{ id: 'SYN-X-002', nombre: 'Con nombre' }], 'rows with an empty id or nombre must be skipped');
    },
  },
  {
    name: 'case 4: resolvePatient(term) matches every legacy index branch (case/accent insensitive)',
    async run() {
      const index = expectedIndex(ctx.normalizer, ctx.rows);
      const terms = [
        ...PATIENT_IDS,
        'syn-espa-001', 'syn espa 001',
        'Sintetico Aps', 'SINTÉTICO APS',
        'Sintetico',
        'ESP-2026-999',
        'zzz-sin-coincidencias',
        '', '   ',
      ];
      for (const term of terms) {
        const result = await ctx.port.resolvePatient(term);
        assert.deepEqual(plain(result), expectedResolve(index, term), `resolvePatient(${canonical(term)})`);
        assert.equal(Object.isFrozen(result), true, 'every resolvePatient result must be frozen');
      }
      const ok = await ctx.port.resolvePatient('SYN-ESPA-001');
      assert.deepEqual(Object.keys(plain(ok.patient)).sort(), ['id', 'nombre', 'patologia']);
      const ambiguous = await ctx.port.resolvePatient('Sintetico');
      assert.equal(ambiguous.status, 'ambiguous');
      assert.equal(ambiguous.candidates.length, 3, 'ambiguous must expose at most three examples');
      assert.deepEqual(plain(ambiguous.candidates), index.slice(0, 3).map((e) => ({ id: e.id, nombre: e.nombre })), 'candidates must keep index order');
      // Additive contract (#429 one-touch): the true match total travels alongside the capped examples.
      const trueMatches = index.filter((entry) => foldTerm(entry.nombre).includes(foldTerm('Sintetico')));
      assert.ok(trueMatches.length > 3, `the fixture must exercise more than three matches (got ${trueMatches.length})`);
      assert.deepEqual(Object.keys(plain(ambiguous)).sort(), ['candidates', 'status', 'total']);
      assert.equal(ambiguous.total, trueMatches.length, 'ambiguous.total must be the true number of matching index entries');
      assert.equal(ambiguous.candidates.length, 3, 'candidates must stay capped at three even when total exceeds three');
      assert.deepEqual(plain(ambiguous.candidates), trueMatches.slice(0, 3).map((e) => ({ id: e.id, nombre: e.nombre })), 'candidates must keep index order when total exceeds three');
      assert.deepEqual(plain(await ctx.port.resolvePatient('ESP-2026-999')), { status: 'not_found', reason: 'id_not_found' });
      assert.deepEqual(plain(await ctx.port.resolvePatient('zzz-sin-coincidencias')), { status: 'not_found', reason: 'no_match' });
      assert.deepEqual(plain(await ctx.port.resolvePatient('   ')), { status: 'error', error_code: 'empty_term' });
      assert.deepEqual(plain(await ctx.port.resolvePatient('SINTÉTICO APS')), plain(await ctx.port.resolvePatient('Sintetico Aps')), 'accent-insensitivity must match the consumer');
      assert.deepEqual(plain(await ctx.port.resolvePatient('syn espa 001')), plain(await ctx.port.resolvePatient('SYN-ESPA-001')), 'case/punctuation-insensitivity must match the consumer');
    },
  },
  {
    name: 'case 5: readPatientBundle(id) deep-equals the delegate record and history for every corpus patient',
    async run() {
      for (const id of PATIENT_IDS) {
        const result = await ctx.port.readPatientBundle(id);
        assert.equal(result.status, 'ok', `${id} must resolve`);
        assert.equal(Object.isFrozen(result), true);
        assert.deepEqual(plain(result.patient.record), plain(ctx.baselines[id].record), `${id} record parity`);
        assert.deepEqual(plain(result.patient.history), plain(ctx.baselines[id].history), `${id} history parity`);
      }
      const espa = await ctx.port.readPatientBundle('SYN-ESPA-001');
      const history = espa.patient.history;
      assert.equal(history.allVisits.length, 2);
      assert.deepEqual(plain(history.allVisits.map((v) => String(v.Fecha_Visita)).sort()), ['01/03/2026', '15/01/2026']);
      assert.equal(String(history.latestVisit.Fecha_Visita), '01/03/2026', 'latestVisit parity');
      assert.equal(String(history.firstVisit.Fecha_Visita), '15/01/2026', 'firstVisit parity');
      assert.equal(history.pathology, 'espa', 'history.pathology must be exactly the delegate value');
      assert.equal(espa.patient.record.pathology, 'espa', 'record.pathology must be exactly the delegate value');
      assert.ok(Array.isArray(history.treatmentHistory), 'treatmentHistory must be preserved');
      assert.ok(Array.isArray(history.keyEvents), 'keyEvents must be preserved');
    },
  },
  {
    name: 'case 6: sentinels 0, empty string, NA and ND reach the DTO unchanged',
    async run() {
      const record = ctx.baselines['SYN-ESPA-001'].record;
      const history = ctx.baselines['SYN-ESPA-001'].history;
      const result = await ctx.port.readPatientBundle('SYN-ESPA-001');
      assert.equal(sentinelViolations(result, record, history).length, 0, 'no sentinel may be collapsed, trimmed or coerced');
      assert.strictEqual(result.patient.record.FR, 0, 'FR 0 must stay the number 0');
      assert.strictEqual(result.patient.record.APCC, 'NA');
      assert.strictEqual(result.patient.record.PCR, 'ND');
      assert.strictEqual(result.patient.record.Dactilitis_Total, 0);
      assert.strictEqual(result.patient.record.Decision_Terapeutica_SEG, '');
      const firstVisit = result.patient.history.allVisits.find((v) => String(v.Fecha_Visita) === '15/01/2026');
      assert.ok(firstVisit, 'the first ESPA visit must be present');
      assert.strictEqual(firstVisit.FR, 0);
      assert.strictEqual(firstVisit.Dactilitis_Total, 0);
      assert.strictEqual(firstVisit.Decision_Terapeutica_SEG, '');
      assert.strictEqual(result.patient.record.NAD_Total, record.NAD_Total, 'numeric sentinels must be preserved exactly');
      const mangled = plain(result);
      mangled.patient.record.FR = '0';
      mangled.patient.record.Decision_Terapeutica_SEG = null;
      assert.ok(sentinelViolations(mangled, record, history).length > 0, 'a delegate mutating a sentinel must be caught');
    },
  },
  {
    name: 'case 7: a bundle never leaks another ID_Paciente (planted crossed patient is caught)',
    async run() {
      for (const id of PATIENT_IDS) {
        const result = await ctx.port.readPatientBundle(id);
        assert.deepEqual(isolationViolations(result, id), [], `${id} bundle must stay isolated`);
      }
      const crossedHistory = {
        allVisits: [{ ID_Paciente: 'SYN-LES-001', Fecha_Visita: '01/01/2026' }],
        latestVisit: null, firstVisit: null, pathology: 'les', treatmentHistory: [], keyEvents: [],
      };
      const crossed = ctx.Port.create(delegateWith({
        allPatients: [{ ID_Paciente: 'SYN-ESPA-001', Nombre_Paciente: 'Sintetico Espa Uno' }],
        recordById: () => ({ ID_Paciente: 'SYN-ESPA-001' }),
        historyById: () => crossedHistory,
      }));
      const crossedResult = await crossed.readPatientBundle('SYN-ESPA-001');
      assert.ok(isolationViolations(crossedResult, 'SYN-ESPA-001').length > 0, 'a crossed patient must be caught');
      assert.ok(
        bundleViolations(crossedResult, ctx.baselines['SYN-ESPA-001'].record, ctx.baselines['SYN-ESPA-001'].history).length > 0,
        'a crossed bundle must fail legacy parity'
      );
    },
  },
  {
    name: 'case 8: a delegate dropping one visit fails legacy parity (planted negative)',
    async run() {
      const baselineRecord = ctx.baselines['SYN-ESPA-001'].record;
      const baselineHistory = ctx.baselines['SYN-ESPA-001'].history;
      const droppedHistory = plain(baselineHistory);
      droppedHistory.allVisits = droppedHistory.allVisits.filter((v) => String(v.Fecha_Visita) !== '01/03/2026');
      const dropped = ctx.Port.create(delegateWith({
        allPatients: [{ ID_Paciente: 'SYN-ESPA-001', Nombre_Paciente: 'Sintetico Espa Uno' }],
        recordById: () => plain(baselineRecord),
        historyById: () => droppedHistory,
      }));
      const droppedResult = await dropped.readPatientBundle('SYN-ESPA-001');
      assert.ok(bundleViolations(droppedResult, baselineRecord, baselineHistory).length > 0, 'a lost visit must fail parity');
      const intact = ctx.Port.create(delegateWith({
        allPatients: [{ ID_Paciente: 'SYN-ESPA-001', Nombre_Paciente: 'Sintetico Espa Uno' }],
        recordById: () => plain(baselineRecord),
        historyById: () => plain(baselineHistory),
      }));
      const intactResult = await intact.readPatientBundle('SYN-ESPA-001');
      assert.deepEqual(bundleViolations(intactResult, baselineRecord, baselineHistory), [], 'the control delegate must pass parity');
    },
  },
  {
    name: 'case 9: an absent id is never invented; MockPatients is never consulted',
    async run() {
      let mockGetById = 0;
      let mockList = 0;
      let mockSearch = 0;
      ctx.sandbox.MockPatients = {
        list() { mockList += 1; return [{ id: 'MOCK-1', nombre: 'Mock', pathology: 'mock' }]; },
        getById() { mockGetById += 1; return { id: 'MOCK-1', nombre: 'Mock', pathology: 'mock' }; },
        search() { mockSearch += 1; return [{ id: 'MOCK-1', nombre: 'Mock', pathology: 'mock' }]; },
      };
      const unknown = await ctx.port.readPatientBundle('SYN-UNKNOWN-999');
      assert.equal(unknown.status, 'not_found');
      assert.equal(unknown.reason, 'unknown_id');
      const unknownByName = await ctx.port.resolvePatient('SYN-UNKNOWN-999');
      assert.equal(unknownByName.status, 'not_found');
      const listed = await ctx.port.listPatients();
      assert.ok(listed.patients.every((p) => !String(p.id).startsWith('MOCK-')), 'a mock patient must never be listed');
      assert.deepEqual([mockGetById, mockList, mockSearch], [0, 0, 0], 'the port must never consult MockPatients');
      const nullPort = ctx.Port.create(delegateWith({ recordById: () => null, historyById: () => ({ allVisits: [] }) }));
      const nulled = await nullPort.readPatientBundle('SYN-UNKNOWN-999');
      assert.deepEqual(plain(nulled), { status: 'not_found', reason: 'unknown_id' }, 'a null-returning delegate is not_found, never a fabricated success');
      assert.deepEqual(plain(await nullPort.listPatients()), { status: 'ok', patients: [] }, 'an empty delegate is not filled with mock data');
      assert.deepEqual([mockGetById, mockList, mockSearch], [0, 0, 0]);
      // Amendment C: with the hostile mock spy still armed, a real MEMBER read must go
      // through the corpus-backed delegate and succeed without consulting MockPatients.
      const member = await ctx.port.readPatientBundle('SYN-ESPA-001');
      assert.equal(member.status, 'ok', 'a member read must still delegate and succeed while MockPatients is armed');
      assert.deepEqual([mockGetById, mockList, mockSearch], [0, 0, 0], 'a real member read must never consult MockPatients');
      assert.equal(/MockPatients/.test(PORT_SOURCE), false, 'the port source must not reference MockPatients on any path, not even behind the membership gate');
    },
  },
  {
    name: 'case 10: the port mutates nothing (delegate structures, corpus, storage, appState)',
    async run() {
      assert.equal(fs.readFileSync(CORPUS_FILE, 'utf8'), CORPUS_RAW, 'the corpus fixture must be untouched');
      const sharedRows = [{ ID_Paciente: 'SYN-MUT-001', Nombre_Paciente: 'Sintetico Mut Uno' }];
      const sharedRecord = { ID_Paciente: 'SYN-MUT-001', Nombre_Paciente: 'Sintetico Mut Uno', FR: 0, Decision_Terapeutica_SEG: '' };
      const sharedHistory = {
        allVisits: [{ ID_Paciente: 'SYN-MUT-001', FR: 0, Decision_Terapeutica_SEG: '' }],
        latestVisit: { ID_Paciente: 'SYN-MUT-001', FR: 0 },
        firstVisit: { ID_Paciente: 'SYN-MUT-001', FR: 0 },
        pathology: 'espa', treatmentHistory: [], keyEvents: [],
      };
      const rowsSnapshot = canonical(sharedRows);
      const recordSnapshot = canonical(sharedRecord);
      const historySnapshot = canonical(sharedHistory);
      const { sandbox, Port } = createSandbox({ ready: true });
      const port = Port.create(delegateWith({
        allPatients: sharedRows,
        recordById: () => sharedRecord,
        historyById: () => sharedHistory,
      }));
      const counters = { set: 0, remove: 0, clear: 0 };
      const storage = sandbox.sessionStorage;
      const original = {
        getItem: storage.getItem.bind(storage),
        setItem: storage.setItem.bind(storage),
        removeItem: storage.removeItem.bind(storage),
        clear: storage.clear.bind(storage),
      };
      storage.setItem = (key, value) => { counters.set += 1; return original.setItem(key, value); };
      storage.removeItem = (key) => { counters.remove += 1; return original.removeItem(key); };
      storage.clear = () => { counters.clear += 1; return original.clear(); };
      const appStateSnapshot = canonical(sandbox.appState);
      const listed = await port.listPatients();
      const bundle = await port.readPatientBundle('SYN-MUT-001');
      await port.resolvePatient('Sintetico Mut Uno');
      assert.equal(canonical(sharedRows), rowsSnapshot, 'the delegate rows array was mutated');
      assert.equal(canonical(sharedRecord), recordSnapshot, 'the delegate record was mutated');
      assert.equal(canonical(sharedHistory), historySnapshot, 'the delegate history was mutated');
      assert.notEqual(bundle.patient.record, sharedRecord, 'the DTO must not alias the live delegate record');
      assert.notEqual(bundle.patient.history, sharedHistory, 'the DTO must not alias the live delegate history');
      assert.notEqual(bundle.patient.history.allVisits, sharedHistory.allVisits, 'visits must be deep copied');
      assert.notEqual(bundle.patient.history.allVisits[0], sharedHistory.allVisits[0], 'visit objects must be deep copied');
      assert.notEqual(listed.patients, sharedRows, 'the patient list must be a fresh array');
      assert.notEqual(listed.patients[0], sharedRows[0], 'patient projections must be fresh objects');
      assert.deepEqual([counters.set, counters.remove, counters.clear], [0, 0, 0], 'the port must never write sessionStorage');
      assert.equal(canonical(sandbox.appState), appStateSnapshot, 'the port must not write appState');
    },
  },
  {
    name: 'case 11: the corpus stays synthetic (a contaminated non-synthetic id is caught)',
    async run() {
      assert.equal(CORPUS.syntheticOnly, true);
      assert.deepEqual(hygieneViolations(CORPUS), [], 'the frozen corpus must be 100% synthetic');
      const contaminated = JSON.parse(CORPUS_RAW);
      contaminated.sheets.SJOGREN[0].ID_Paciente = '12345678Z';
      assert.ok(hygieneViolations(contaminated).length > 0, 'a contaminated non-synthetic id must be caught');
      const listed = await ctx.port.listPatients();
      assert.ok(listed.patients.every((p) => String(p.id).startsWith('SYN-')), 'the read output must only expose synthetic ids');
    },
  },
  {
    name: 'case 12: a delegate that throws yields status error with no partial clinical data',
    async run() {
      const boom = () => { throw new Error('synthetic delegate failure'); };
      const port = ctx.Port.create({ getAllPatients: boom, findPatientById: boom, getPatientHistory: boom });
      const results = [
        ['listPatients', await port.listPatients()],
        ['resolvePatient', await port.resolvePatient('Sintetico')],
        ['readPatientBundle', await port.readPatientBundle('SYN-ESPA-001')],
      ];
      for (const [label, result] of results) {
        assert.equal(result.status, 'error', `${label} must fail closed on a throwing delegate`);
        assert.equal(typeof result.error_code, 'string', `${label} must expose an error_code`);
        assert.ok(result.error_code.length > 0, `${label} error_code must be non-empty`);
        assert.equal(Object.isFrozen(result), true);
        for (const key of ['patient', 'patients', 'record', 'history']) {
          assert.equal(key in result, false, `${label} must not leak partial clinical data (${key})`);
        }
      }
    },
  },
  {
    name: 'case 13: no_visits with zero visits; unavailable without a readiness signal',
    async run() {
      const record = { ID_Paciente: 'SYN-NOVISIT-001', Nombre_Paciente: 'Sintetico Sin Visitas' };
      const emptyHistory = { allVisits: [], latestVisit: null, firstVisit: null, pathology: 'espa', treatmentHistory: [], keyEvents: [] };
      const noVisitsPort = ctx.Port.create(delegateWith({
        allPatients: [{ ID_Paciente: 'SYN-NOVISIT-001', Nombre_Paciente: 'Sintetico Sin Visitas' }],
        recordById: () => record,
        historyById: () => emptyHistory,
      }));
      assert.deepEqual(plain(await noVisitsPort.readPatientBundle('SYN-NOVISIT-001')), { status: 'not_found', reason: 'no_visits' });

      const { sandbox, Port } = createSandbox();
      assert.equal(sandbox.sessionStorage.getItem('hubClinicoDB'), null, 'the sandbox must start without a readiness signal');
      const darkPort = Port.getPort();
      assert.ok(darkPort, 'getPort() must still build from the ambient HubTools.data');
      const darkBundle = await darkPort.readPatientBundle('SYN-ESPA-001');
      assert.deepEqual(plain(darkBundle), { status: 'unavailable' }, 'no readiness signal must yield unavailable');
      assert.equal(Object.isFrozen(darkBundle), true);
      assert.deepEqual(plain(await darkPort.resolvePatient('Sintetico')), { status: 'unavailable' });
      assert.deepEqual(plain(await darkPort.listPatients()), { status: 'unavailable' });

      const bus = installEventBus(sandbox);
      await darkPort.readPatientBundle('SYN-ESPA-001');
      bus.dispatch('databaseLoaded', {});
      assert.deepEqual(plain(await darkPort.listPatients()), { status: 'ok', patients: [] }, 'an observed databaseLoaded event must enable readiness');
      assert.deepEqual(plain(await darkPort.readPatientBundle('SYN-ESPA-001')), { status: 'not_found', reason: 'unknown_id' });
    },
  },
];

// ---------------------------------------------------------------------------

async function buildParityContext() {
  const { sandbox, sink } = createLegacySandbox();
  await loadCorpusInto(sandbox);
  const Port = loadPortModule(sandbox, PORT_SOURCE);
  const port = Port.getPort();
  assert.ok(port, 'getPort() must build a port from the ambient HubTools.data after the corpus is loaded');
  const legacy = sandbox.HubTools.data;
  const rows = legacy.getAllPatients();
  const baselines = {};
  for (const id of PATIENT_IDS) {
    baselines[id] = { record: legacy.findPatientById(id), history: legacy.getPatientHistory(id) };
  }
  return { sandbox, sink, Port, port, legacy, normalizer: sandbox.HubTools.normalizer, rows, baselines };
}

async function main() {
  console.log('Reuma patient read port check (F5.1 WU-A, synthetic corpus, legacy parity)');
  try {
    PORT_SOURCE = fs.readFileSync(PORT_FILE, 'utf8');
  } catch (error) {
    const detail = error && error.code ? `${error.code}: ${error.message}` : String(error);
    console.log(`  [FAIL] load ${PORT_RELATIVE} -> ${detail}`);
    console.log(`reuma_patient_read_port_check: FAIL (0/${CASES.length} cases)`);
    process.exitCode = 1;
    return;
  }
  try {
    ctx = await buildParityContext();
  } catch (error) {
    console.log(`  [FAIL] parity sandbox setup -> ${error && error.message ? error.message : String(error)}`);
    console.log(`reuma_patient_read_port_check: FAIL (0/${CASES.length} cases)`);
    process.exitCode = 1;
    return;
  }
  const failures = [];
  for (const testCase of CASES) {
    try {
      await testCase.run();
      console.log(`  [OK ] ${testCase.name}`);
    } catch (error) {
      failures.push(testCase.name);
      console.log(`  [FAIL] ${testCase.name} -> ${error && error.message ? error.message : String(error)}`);
    }
  }
  console.log('');
  if (failures.length === 0) {
    console.log(`reuma_patient_read_port_check: PASS (${CASES.length} cases)`);
  } else {
    console.log(`reuma_patient_read_port_check: FAIL (${CASES.length - failures.length}/${CASES.length} cases)`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('reuma_patient_read_port_check crashed:', error);
  process.exitCode = 1;
});
