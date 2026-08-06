#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await import(path.join(ROOT, 'scripts/farmacia_current_patient_session.js'));
await import(path.join(ROOT, 'scripts/farmacia_patient_flow_runtime.js'));

const runtimeModule = globalThis.FarmaciaPatientFlowRuntime;
const sessionModule = globalThis.FarmaciaCurrentPatientSession;
let passed = 0;

function test(name, callback) {
  callback();
  passed += 1;
  console.log(`PASS ${name}`);
}

function storage() {
  const values = new Map();
  const operations = [];
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { operations.push(`get:${key}`); return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { operations.push(`set:${key}`); values.set(key, String(value)); },
    removeItem(key) { operations.push(`remove:${key}`); values.delete(key); },
    values,
    operations
  };
}

function event(patientId, type, row) {
  return {
    patient_id: patientId,
    event_type: type,
    source_event_id: `${patientId}-${type}`,
    rows: [{ canonical_row: { patient_id: patientId, event_type: type, ...row } }]
  };
}

function line(id, active, name) {
  return {
    line_id: id,
    treatment_id: `t-${id}`,
    snapshot: {
      line_id: id,
      active_at_event: active,
      line_status_at_event: active === true ? 'active' : active === false ? 'completed' : 'active',
      line_role: 'primary',
      is_primary_line: true,
      line_drug_name: name,
      line_active_ingredient: `${name} PA`,
      line_dose_text: active === true ? 0 : null,
      line_route: null,
      line_schedule_label: '',
      line_selected_drug_id: null
    }
  };
}

const summaries = [
  { patient_id: 'patient-a', identifiers: [{ identifier_system: 'urn:cip:a', identifier_value: 'CIP-A' }] },
  { patient_id: 'patient-b', identifiers: [{ identifier_system: 'urn:cip:b', identifier_value: 'CIP-B' }] },
  { patient_id: 'patient-c', identifiers: [{ identifier_system: 'urn:cip:c', identifier_value: 'CIP-C' }] },
  { patient_id: 'patient-x', identifiers: [{ identifier_system: 'urn:one', identifier_value: 'CIP-X' }] },
  { patient_id: 'patient-y', identifiers: [{ identifier_system: 'urn:two', identifier_value: 'CIP-X' }] }
];

const records = {
  'patient-a': {
    request: { request_date: '2026-08-01', requested_drug_name: 'Solicitado A', requested_induction_status: null },
    validation: { validation_result: 'validated', validated_drug_name: 'Validado A', validated_dose_text: '', validated_induction_status: null },
    lines: [line('line-a', true, 'Activo A')]
  },
  'patient-b': {
    request: { requested_drug_name: 'Solicitado B' },
    validation: { validation_result: 'validated', validated_drug_name: 'Validado B' },
    lines: [line('line-b1', true, 'Activo B1'), line('line-b2', true, 'Activo B2')]
  },
  'patient-c': {
    request: { requested_drug_name: 'Solicitado C', requested_dose_text: '10 mg' },
    validation: { validation_result: 'validated', validated_drug_name: 'Validado C', validated_dose_text: '20 mg' },
    lines: []
  },
  'patient-x': { request: {}, validation: {}, lines: [] },
  'patient-y': { request: {}, validation: {}, lines: [] }
};

function port() {
  return {
    listPatients: () => structuredClone(summaries),
    getPatientProjection(patientId) {
      return { patient_id: patientId, services: [{ code: 'DERM', label: 'Dermatología' }], pathologies: [{ code: 'HS', label: 'Hidradenitis supurativa' }] };
    },
    getLatestRequestValidation(patientId) {
      const item = records[patientId];
      return { latest_request: structuredClone(item.request), latest_validation: structuredClone(item.validation) };
    },
    getVisitsAndLines(patientId) {
      const item = records[patientId];
      return { visits: [], latest_first_visit: null, latest_followup: null, lines: structuredClone(item.lines) };
    },
    getPatientEvents(patientId) {
      return [event(patientId, 'pharmacy_validation', { hemogram_verified: false, analysis_recent_status: null })];
    },
    getProms: () => [],
    getAdherence: () => [],
    getAdverseEventsAndCausality: () => ({ adverse_events: [], causality_assessments: [] }),
    getInternalProvenance: patientId => [{ patient_id: patientId, source_event_id: `${patientId}-source` }]
  };
}

function location(search = '') {
  return { href: `http://local/farmacia_index.html${search}`, pathname: '/farmacia_index.html', search, hash: '' };
}

function harness(sharedStorage = storage(), search = '', confirm = () => true, dataPort = port()) {
  const loc = location(search);
  const history = {
    replaceState(_state, _title, url) {
      const parsed = new URL(url, loc.href);
      loc.href = parsed.href;
      loc.pathname = parsed.pathname;
      loc.search = parsed.search;
      loc.hash = parsed.hash;
    }
  };
  const runtime = runtimeModule.create({
    sessionModule,
    sessionStorage: sharedStorage,
    dataPort,
    location: loc,
    history,
    confirm,
    crypto: { randomUUID: () => `generation-${Math.random().toString(16).slice(2)}` }
  });
  return { runtime, storage: sharedStorage, location: loc };
}

test('requested, validated and active treatment remain separate', () => {
  const { runtime } = harness();
  const result = runtime.selectByCip('CIP-C');
  assert.equal(result.patient.farmaco_solicitado, 'Solicitado C');
  assert.equal(result.patient.tratamientoValidado.farmaco_nombre, 'Validado C');
  assert.equal(result.patient.farmaco, '');
  assert.equal(result.patient.biologicos.length, 0);
});

test('one explicitly active line is selected and zero is preserved', () => {
  const { runtime } = harness();
  const patient = runtime.selectByCip('CIP-A').patient;
  assert.equal(patient.lineasActivas.length, 1);
  assert.equal(patient.lineaActiva.linea_id, 'line-a');
  assert.equal(patient.farmaco, 'Activo A');
  assert.equal(patient.dosis, 0);
  assert.equal(patient.induccion_solicitada, '');
});

test('multiple active lines never autoselect a current treatment', () => {
  const { runtime } = harness();
  const patient = runtime.selectByCip('CIP-B').patient;
  assert.equal(patient.lineasActivas.length, 2);
  assert.equal(patient.lineaActiva, null);
  assert.equal(patient.farmaco, '');
});

test('an active-looking status without explicit activity stays unknown', () => {
  records['patient-c'].lines = [line('line-c', null, 'No inferir C')];
  const { runtime } = harness();
  const patient = runtime.selectByCip('CIP-C').patient;
  assert.equal(patient.biologicos[0].estado_linea, 'unknown');
  assert.equal(patient.lineasActivas.length, 0);
  records['patient-c'].lines = [];
});

test('same CIP across identifier systems fails closed', () => {
  const { runtime } = harness();
  const result = runtime.selectByCip('CIP-X');
  assert.equal(result.status, 'ambiguous');
  assert.equal(runtime.getCurrentPatient(), null);
});

test('A to B purges A before storing B and leaves no A residue', () => {
  const shared = storage();
  const observedPort = port();
  let sessionPresentWhileLoadingB = null;
  const originalProjection = observedPort.getPatientProjection;
  observedPort.getPatientProjection = patientId => {
    if (patientId === 'patient-b') sessionPresentWhileLoadingB = shared.getItem(sessionModule.STORAGE_KEY) !== null;
    return originalProjection(patientId);
  };
  const { runtime } = harness(shared, '', () => true, observedPort);
  runtime.selectByCip('CIP-A');
  shared.setItem('patient-draft', JSON.stringify({ cip: 'CIP-A', note: 'synthetic' }));
  shared.operations.length = 0;
  runtime.selectByCip('CIP-B');
  const serialized = [...shared.values.values()].join('\n');
  assert.equal(serialized.includes('CIP-A'), false);
  assert.equal(sessionPresentWhileLoadingB, false, 'A is purged before any B projection is loaded');
  const removeIndex = shared.operations.findIndex(operation => operation.startsWith('remove:'));
  const finalSetIndex = shared.operations.map((operation, index) => [operation, index]).filter(([operation]) => operation === `set:${sessionModule.STORAGE_KEY}`).at(-1)[1];
  assert(removeIndex !== -1 && removeIndex < finalSetIndex);
});

test('storage contains only the current-patient projection and no source containers', () => {
  const { runtime, storage: shared } = harness();
  runtime.selectByCip('CIP-A');
  const raw = shared.getItem(sessionModule.STORAGE_KEY);
  assert(raw);
  assert.doesNotMatch(raw, /workbook|read_model|population|CIP-B/i);
});

test('denied and absent validation states are not collapsed to pending', () => {
  records['patient-c'].validation.validation_result = 'denied';
  let selected = harness().runtime.selectByCip('CIP-C').patient;
  assert.equal(selected.estado, 'denied');
  assert.equal(selected.estadoLabel, 'Denegado');
  records['patient-c'].validation.validation_result = null;
  selected = harness().runtime.selectByCip('CIP-C').patient;
  assert.equal(selected.estado, 'not_recorded');
  assert.equal(selected.estadoLabel, 'No registrado');
  records['patient-c'].validation.validation_result = 'validated';
});

test('internal navigation auto-continues and removes its transient marker', () => {
  const selected = harness();
  selected.runtime.selectByCip('CIP-A');
  const url = selected.runtime.makeContextUrl('farmacia_dashboard_paciente.html', { entrada: 'dashboard' });
  const search = new URL(url, 'http://local/').search;
  let confirmations = 0;
  const reloaded = harness(selected.storage, search, () => { confirmations += 1; return false; });
  assert.equal(reloaded.runtime.bootstrap().status, 'active');
  assert.equal(confirmations, 0);
  assert.equal(new URLSearchParams(reloaded.location.search).has(runtimeModule.NAV_MARKER), false);
  assert.equal(reloaded.runtime.getCurrentPatient().cip, 'CIP-A');
});

test('reload without marker requires continue or restart', () => {
  const continuedSelection = harness();
  continuedSelection.runtime.selectByCip('CIP-A');
  const search = continuedSelection.location.search;
  let confirms = 0;
  const continued = harness(continuedSelection.storage, search, () => { confirms += 1; return true; });
  assert.equal(continued.runtime.bootstrap().status, 'active');
  assert.equal(confirms, 1);

  const restartSelection = harness();
  restartSelection.runtime.selectByCip('CIP-A');
  const restarted = harness(restartSelection.storage, restartSelection.location.search, () => false);
  assert.equal(restarted.runtime.bootstrap().status, 'empty');
  assert.equal(restartSelection.storage.getItem(sessionModule.STORAGE_KEY), null);
});

test('all normal pages load the shared runtime and no retired UI remains', () => {
  const pages = [
    'farmacia_index.html', 'farmacia_dashboard_paciente.html', 'farmacia_dashboard_longitudinal.html',
    'farmacia_validacion.html', 'farmacia_primera_visita.html', 'farmacia_seguimiento.html'
  ];
  for (const page of pages) {
    const source = fs.readFileSync(path.join(ROOT, page), 'utf8');
    assert.match(source, /farmacia_current_patient_session\.js/);
    assert.match(source, /farmacia_patient_flow_runtime\.js/);
    assert.doesNotMatch(source, />[^<]*(?:Bridge v2 activo|Buscar en Bridge|Dashboard Bridge v2|Abrir dashboard Bridge)[^<]*</i);
  }
  const indexSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_index.js'), 'utf8');
  const dashboardSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_dashboard_paciente.js'), 'utf8');
  assert.doesNotMatch(indexSource, /openBridgeDashboard|window\.open\(/);
  assert.doesNotMatch(dashboardSource, /initializeBridgeDashboard|window\.opener|postMessage/);
});

console.log(`farmacia_patient_flow_cutover_check: PASS (${passed} cases)`);
