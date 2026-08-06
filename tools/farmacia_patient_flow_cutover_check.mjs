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

function control(id, { tagName = 'INPUT', type = 'text', value = '', checked = false, readOnly = false } = {}) {
  return { id, tagName, type, value, checked, readOnly, closest: () => null };
}

function draftScope(controls) {
  const listeners = { input: [], change: [] };
  return {
    querySelectorAll: () => controls,
    addEventListener(type, listener) { listeners[type].push(listener); },
    emit(type, target) { listeners[type].forEach(listener => listener({ target })); }
  };
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

test('raw patient name and visible treatment records contain no invented provenance', () => {
  const { runtime } = harness();
  const patient = runtime.selectByCip('CIP-A').patient;
  assert.equal(patient.nombre, '');
  assert.equal(Object.hasOwn(patient.biologicos[0], 'fuente'), false);
  assert.equal(Object.hasOwn(patient.tratamientoValidado, 'fuente'), false);
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

test('dirty A to B requires explicit discard and preserves A when cancelled', () => {
  const shared = storage();
  const observedPort = port();
  let loadedB = false;
  const originalProjection = observedPort.getPatientProjection;
  observedPort.getPatientProjection = patientId => {
    if (patientId === 'patient-b') loadedB = true;
    return originalProjection(patientId);
  };
  const { runtime } = harness(shared, '', () => true, observedPort);
  const selectedA = runtime.selectByCip('CIP-A');
  const generationA = selectedA.envelope.generation;
  const note = control('draft-note', { value: 'A draft' });
  const checkbox = control('draft-check', { type: 'checkbox', checked: false });
  const file = control('draft-file', { type: 'file', value: 'ignored.xlsx' });
  const readonly = control('draft-readonly', { value: 'original', readOnly: true });
  const scope = draftScope([note, checkbox, file, readonly]);
  assert.equal(runtime.bindPageDraft('validacion', scope), true);
  checkbox.checked = true;
  scope.emit('change', checkbox);
  const pending = runtime.selectByCip('CIP-B');
  assert.equal(pending.status, 'pending_changes');
  assert.equal(loadedB, false, 'B is not read before discard confirmation');
  assert.equal(runtime.getCurrentPatient().cip, 'CIP-A');
  assert.equal(runtime.getCurrentEnvelope().generation, generationA);
  assert.equal(runtime.getPageDraft('validacion').controls['draft-note'].value, 'A draft');
  assert.equal(Object.hasOwn(runtime.getPageDraft('validacion').controls, 'draft-file'), false);

  note.value = '';
  checkbox.checked = false;
  readonly.value = 'changed';
  assert.equal(runtime.restorePageDraft('validacion', scope), true);
  assert.equal(note.value, 'A draft');
  assert.equal(checkbox.checked, true);
  assert.equal(readonly.value, 'changed', 'readonly controls are not manipulated during restore');

  const selectedB = runtime.selectByCip('CIP-B', { discardPendingChanges: true });
  assert.equal(selectedB.status, 'selected');
  assert.equal(loadedB, true);
  assert.equal(runtime.getCurrentPatient().cip, 'CIP-B');
  assert.equal(JSON.stringify([...shared.values.values()]).includes('CIP-A'), false);
  assert.equal(runtime.getPageDraft('validacion'), null);
});

test('same CIP keeps generation and page draft', () => {
  const { runtime } = harness();
  const first = runtime.selectByCip('CIP-A');
  const scope = draftScope([control('same-cip-note', { value: 'keep me' })]);
  runtime.savePageDraft('seguimiento', scope);
  const second = runtime.selectByCip(' cip-a ');
  assert.equal(second.envelope.generation, first.envelope.generation);
  assert.equal(runtime.getPageDraft('seguimiento').controls['same-cip-note'].value, 'keep me');
  assert.equal(runtime.markCurrentClean().dirty, false);
});

test('explicit induction, prebiologic, PROM, adherence, adverse event and causality remain separate', () => {
  const explicitPort = port();
  explicitPort.getLatestRequestValidation = () => ({
    latest_request: { requested_drug_name: 'Requested explicit', requested_induction_status: 'yes' },
    latest_validation: {
      validation_result: 'validated', validated_treatment_relation: 'modified_from_requested',
      validated_drug_name: 'Validated explicit', validated_induction_status: 'no'
    }
  });
  explicitPort.getPatientEvents = patientId => [event(patientId, 'pharmacy_validation', {
    analysis_date: '2026-08-04', analysis_recent_status: 'not_recorded', hemogram_verified: false,
    biochemistry_verified: true, tb_status: 'negative', hbv_status: 'pending', hcv_status: 'negative',
    hiv_status: 'negative', vaccination_status: 'no', vaccination_observations: 'Explicit observation'
  })];
  explicitPort.getProms = () => [{ values: { proms_json: { measurements: [{ instrument: 'RAW_PROM', value: 0, date: '2026-08-04' }] } } }];
  explicitPort.getAdherence = () => [{ values: { adherence_result: '0', adherence_answers_json: { answer: false } } }];
  explicitPort.getAdverseEventsAndCausality = () => ({
    adverse_events: [{ source_event_id: 'followup-a', values: {
      adverse_event_id: 'ea-a', adverse_event_status: 'present', adverse_event_description: 'Explicit AE',
      adverse_event_severity: 'mild', adverse_event_resolution_status: 'not_recorded',
      adverse_event_action: 'Observed', adverse_event_suspects_json: [{ suspect_ref: 'line-a' }]
    } }],
    causality_assessments: [{ source_event_id: 'followup-a', values: {
      causality_assessments_json: [{ suspect_ref: 'line-a', method: 'EXPLICIT_METHOD', score: 0, assessed: false }]
    } }]
  });
  const patient = harness(storage(), '', () => true, explicitPort).runtime.selectByCip('CIP-A').patient;
  assert.equal(patient.induccion_solicitada, 'yes');
  assert.equal(patient.tratamientoValidado.induccion, 'no');
  assert.deepEqual(patient.analiticaEstruct, {
    fecha: '2026-08-04', reciente: 'not_recorded', hemograma: false, bioquimica: true,
    mantoux: 'negative', serologiasVhb: 'pending', serologiasVhc: 'negative',
    serologiasVih: 'negative', vacunacion: 'no', observaciones: 'Explicit observation'
  });
  assert.deepEqual(patient.proms, [{ tipo_prom: 'RAW_PROM', valor: 0, fecha: '2026-08-04' }]);
  assert.equal(patient.adherencia, '0');
  assert.equal(patient.eventos_adversos.length, 1);
  assert.equal(patient.eventos_adversos[0].tipo, 'Explicit AE');
  assert.equal(patient.eventos_adversos[0].evaluaciones_causalidad[0].score, 0);
  assert.equal(patient.eventos_adversos[0].evaluaciones_causalidad[0].assessed, false);
});

test('not_recorded adverse event never materializes an event', () => {
  const explicitPort = port();
  explicitPort.getAdverseEventsAndCausality = () => ({
    adverse_events: [{ source_event_id: 'followup-empty', values: { adverse_event_status: 'not_recorded' } }],
    causality_assessments: []
  });
  const patient = harness(storage(), '', () => true, explicitPort).runtime.selectByCip('CIP-A').patient;
  assert.equal(patient.eventos_adversos.length, 0);
  assert.equal(patient.efectosAdversos, 'No registrado');
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
  const longitudinalSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_dashboard_longitudinal.js'), 'utf8');
  const validationSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_validacion.js'), 'utf8');
  const firstVisitSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_primera_visita.js'), 'utf8');
  const followupSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_seguimiento.js'), 'utf8');
  const runtimeSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_patient_flow_runtime.js'), 'utf8');
  assert.doesNotMatch(indexSource, /openBridgeDashboard|window\.open\(/);
  assert.doesNotMatch(dashboardSource, /initializeBridgeDashboard|window\.opener|postMessage/);
  assert.match(indexSource, /discardPendingChanges:\s*true/);
  assert.doesNotMatch(runtimeSource, /nombre:\s*['"]Paciente ['"]\s*\+/);
  assert.doesNotMatch(runtimeSource, /fuente:\s*['"]farmacia_raw['"]/);
  assert.match(firstVisitSource, /solicitud\s*&&\s*ctx\.patient\.solicitud\.requested_induction_status/);
  assert.doesNotMatch(firstVisitSource, /tratamientoValidado\s*&&\s*ctx\.patient\.tratamientoValidado\.induccion/);
  assert.match(longitudinalSource, /proms:\s*patient\.proms\s*\|\|\s*\[\]/);
  for (const [source, pageKey] of [[validationSource, 'validacion'], [firstVisitSource, 'primera_visita'], [followupSource, 'seguimiento']]) {
    assert.match(source, new RegExp(`restorePageDraft\\('${pageKey}'`));
    assert.match(source, new RegExp(`bindPageDraft\\('${pageKey}'`));
  }
});

console.log(`farmacia_patient_flow_cutover_check: PASS (${passed} cases)`);
