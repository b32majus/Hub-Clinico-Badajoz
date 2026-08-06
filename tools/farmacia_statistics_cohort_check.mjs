#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await import(pathToFileURL(path.join(ROOT, 'scripts/farmacia_statistics_cohort.js')).href);
await import(pathToFileURL(path.join(ROOT, 'scripts/farmacia_statistics_handoff.js')).href);
const Cohort = globalThis.FarmaciaStatisticsCohort;
const Handoff = globalThis.FarmaciaStatisticsHandoff;

const clone = value => JSON.parse(JSON.stringify(value));
const event = (patientId, sourceId, type, date, rows = [{}]) => ({
  patient_id: patientId,
  source_event_id: sourceId,
  event_id: `${sourceId}-event`,
  event_type: type,
  source_sheet: '01_DERMA',
  source_table: 'tblBridgeDermaInput',
  rows: rows.map((row, index) => ({
    source_sheet: '01_DERMA', source_table: 'tblBridgeDermaInput', physical_row_number: index + 2,
    canonical_row: { patient_id: patientId, source_event_id: sourceId, event_id: `${sourceId}-event`, event_type: type, occurred_at: `${date}T10:00:00Z`, recorded_at: `${date}T11:00:00Z`, ...row }
  }))
});

const events = {
  p1Validation: event('patient-1', 'p1-validation', 'pharmacy_validation', '2026-01-01', [{ request_date: '2026-01-01' }]),
  p1First: event('patient-1', 'p1-first', 'pharmacy_first_visit', '2026-01-02', [{ first_visit_date: '2026-01-02' }]),
  p1Old: event('patient-1', 'p1-old', 'pharmacy_followup', '2026-01-03', [{ visit_date: '2026-01-03', therapeutic_movement_type: 'no_change_recorded' }]),
  p1New: event('patient-1', 'p1-new', 'pharmacy_followup', '2026-01-04', [
    { visit_date: '2026-01-04', line_id: 'line-active-a', treatment_id: 'treatment-a', therapeutic_movement_type: 'schedule_change', new_schedule_code: 'Q14D', new_schedule_label: 'Cada 14 días', movement_effective_date: '2026-01-04' },
    { visit_date: '2026-01-04', line_id: 'line-active-b', treatment_id: 'treatment-b', therapeutic_movement_type: 'not_recorded', suspension_status: 'yes', suspension_reason: 'Motivo explícito de suspensión', suspension_effective_date: '2026-01-05' },
    { visit_date: '2026-01-04', line_id: 'line-susp-explicita', treatment_id: 'treatment-e', therapeutic_movement_type: 'suspension', suspension_reason: 'Suspensión por type explícito', suspension_effective_date: '2026-01-06' },
    { visit_date: '2026-01-04', line_id: 'line-inactive', treatment_id: 'treatment-f', active_at_event: false, line_status_at_event: 'inactive', line_drug_name: 'Inactivo sin suspensión explícita' }
  ]),
  p2Validation: event('patient-2', 'p2-validation', 'pharmacy_validation', '2026-02-01', [{ request_date: '2026-02-01' }]),
  p3Validation: event('patient-3', 'p3-validation', 'pharmacy_validation', '2026-03-01', [{ request_date: '2026-03-01' }]),
  p3Followup: event('patient-3', 'p3-followup', 'pharmacy_followup', '2026-03-02', [{ visit_date: '2026-03-02' }])
};

const store = {
  population: [
    { patient_id: 'patient-3', identifiers: [{ identifier_system: 'cip', identifier_value: 'CIP-003' }], event_count: 2 },
    { patient_id: 'patient-1', identifiers: [{ identifier_system: 'cip', identifier_value: 'CIP-001' }, { identifier_system: 'secondary', identifier_value: 'ALT-001' }], event_count: 4 },
    { patient_id: 'patient-2', identifiers: [{ identifier_system: 'cip', identifier_value: 'CIP-002' }], event_count: 1 },
    { patient_id: 'patient-1', identifiers: [{ identifier_system: 'cip', identifier_value: 'CIP-001' }], event_count: 4 },
    { patient_id: 'patient-4', identifiers: [], event_count: 0 }
  ],
  projections: {
    'patient-1': {
      patient_id: 'patient-1', identifiers: [{ identifier_system: 'cip', identifier_value: 'CIP-001' }, { identifier_system: 'secondary', identifier_value: 'ALT-001' }],
      services: [{ code: 'DERM', label: 'Dermatología' }, { code: 'FH', label: 'Farmacia' }],
      pathologies: [{ code: 'HS', label: 'Hidradenitis supurativa' }, { code: 'PSO', label: 'Psoriasis' }],
      valid_event_count: 4, excluded_event_count: 1, source_error_count: 1, warnings: [{ code: 'TEST_WARNING' }]
    },
    'patient-2': { patient_id: 'patient-2', identifiers: [{ identifier_system: 'cip', identifier_value: 'CIP-002' }], services: [{ code: 'REU', label: 'Reumatología' }], pathologies: [{ code: 'AR', label: 'Artritis reumatoide' }], valid_event_count: 1, excluded_event_count: 0, source_error_count: 0, warnings: [] },
    'patient-3': { patient_id: 'patient-3', identifiers: [{ identifier_system: 'cip', identifier_value: 'CIP-003' }], services: [], pathologies: [], valid_event_count: 2, excluded_event_count: 0, source_error_count: 0, warnings: [] },
    'patient-4': { patient_id: 'patient-4', identifiers: [], services: [], pathologies: [], valid_event_count: 0, excluded_event_count: 0, source_error_count: 0, warnings: [] }
  },
  events: {
    'patient-1': [events.p1Validation, events.p1First, events.p1Old, events.p1New],
    'patient-2': [events.p2Validation],
    'patient-3': [events.p3Validation, events.p3Followup],
    'patient-4': []
  },
  requestValidation: {
    'patient-1': { latest_request: { request_id: 'request-1', request_date: '2026-01-01', requested_drug_name: 'Solicitado no validado' }, latest_validation: { validation_id: 'validation-1', validation_result: 'validated', validated_drug_name: 'Validado explícito' } },
    'patient-2': { latest_request: { request_id: 'request-2', request_date: '2026-02-01', requested_drug_name: 'Solo solicitado' }, latest_validation: { validation_id: 'validation-2', validation_result: 'pending' } },
    'patient-3': { latest_request: null, latest_validation: { validation_id: 'validation-3', validation_result: 'denied' } },
    'patient-4': { latest_request: null, latest_validation: null }
  },
  visits: {
    'patient-1': {
      latest_first_visit: events.p1First, latest_followup: events.p1New,
      lines: [
        { source_event_id: 'p1-new', event_id: 'p1-new-event', event_type: 'pharmacy_followup', treatment_id: 'treatment-a', line_id: 'line-active-a', snapshot: { line_role: 'primary', is_primary_line: true, active_at_event: true, line_status_at_event: 'active', line_drug_name: '=FORMULA-DRUG', line_active_ingredient: 'Activo A', line_presentation: 'Presentación A', line_dose_text: '0 mg', line_route: 'SC', line_schedule_code: 'Q14D', line_schedule_label: 'Cada 14 días' } },
        { source_event_id: 'p1-new', event_id: 'p1-new-event', event_type: 'pharmacy_followup', treatment_id: 'treatment-b', line_id: 'line-active-b', snapshot: { active_at_event: true, line_status_at_event: 'active', line_drug_name: 'Activo B', line_active_ingredient: 'Activo B', line_presentation: '', line_dose_text: '', line_route: '', line_schedule_code: '', line_schedule_label: '' } },
        { source_event_id: 'p1-old', event_id: 'p1-old-event', event_type: 'pharmacy_followup', treatment_id: 'treatment-c', line_id: 'line-false', snapshot: { active_at_event: false, line_status_at_event: 'historical', line_drug_name: 'Inactivo explícito' } },
        { source_event_id: 'p1-new', event_id: 'p1-new-event', event_type: 'pharmacy_followup', treatment_id: 'treatment-d', line_id: 'line-unknown', snapshot: { active_at_event: null, line_status_at_event: 'unknown', line_drug_name: 'Actividad no registrada' } }
      ]
    },
    'patient-2': { latest_first_visit: null, latest_followup: null, lines: [{ source_event_id: 'p2-validation', event_id: 'p2-validation-event', event_type: 'pharmacy_validation', treatment_id: 'treatment-p2', line_id: 'line-p2', snapshot: { active_at_event: false, line_status_at_event: 'inactive', line_drug_name: 'No activo' } }] },
    'patient-3': { latest_first_visit: null, latest_followup: events.p3Followup, lines: [] },
    'patient-4': { latest_first_visit: null, latest_followup: null, lines: [] }
  },
  proms: {
    'patient-1': [
      { source_event_id: 'p1-new', event_id: 'p1-new-event', row_index: 0, values: { proms_json: { measurements: [{ instrument: 'PROM-LATEST-A', value: 0, answered: false }, { instrument: 'PROM-LATEST-B', value: false, answered: true }] } } },
      { source_event_id: 'p1-new', event_id: 'p1-new-event', row_index: 1, values: { proms_json: { measurements: [{ instrument: 'PROM-LATEST-A', value: 0, answered: false }, { instrument: 'PROM-LATEST-B', value: false, answered: true }] } } },
      { source_event_id: 'p1-old', event_id: 'p1-old-event', row_index: 0, values: { proms_json: { measurements: [{ instrument: 'PROM-HISTORICAL', value: 9, answered: true }] } } }
    ],
    'patient-2': [], 'patient-3': [], 'patient-4': []
  },
  adherence: {
    'patient-1': [
      { source_event_id: 'p1-new', event_id: 'p1-new-event', row_index: 0, values: { adherence_collection_status: 'yes', adherence_instrument: 'Instrumento A', adherence_result: 'resultado-a', adherence_answers_json: [{ answer: false }] } },
      { source_event_id: 'p1-new', event_id: 'p1-new-event', row_index: 1, values: { adherence_collection_status: 'yes', adherence_instrument: 'Instrumento B', adherence_result: 'resultado-b', adherence_answers_json: [{ answer: 0 }] } }
    ],
    'patient-2': [
      { source_event_id: 'p2-old', event_id: 'p2-old-event', row_index: 0, values: { adherence_collection_status: 'yes', adherence_instrument: 'Histórico', adherence_result: 'resultado-histórico', adherence_answers_json: true } },
      { source_event_id: 'p2-validation', event_id: 'p2-validation-event', row_index: 0, values: { adherence_collection_status: 'yes', adherence_instrument: 'Único', adherence_result: 0, adherence_answers_json: false } }
    ],
    'patient-3': [], 'patient-4': []
  },
  safety: {
    'patient-1': {
      adverse_events: [
        { source_event_id: 'p1-old', event_id: 'p1-old-event', row_index: 0, values: { adverse_event_id: 'ae-1', adverse_event_status: 'present', adverse_event_description: 'versión antigua', adverse_event_severity: 'leve', adverse_event_resolution_status: 'open', adverse_event_action: 'old', adverse_event_suspects_json: [{ suspect_ref: 'line-active-a' }] } },
        { source_event_id: 'p1-new', event_id: 'p1-new-event', row_index: 0, values: { adverse_event_id: 'ae-1', adverse_event_status: 'present', adverse_event_description: 'versión nueva', adverse_event_severity: 'moderado', adverse_event_resolution_status: 'open', adverse_event_action: 'new', adverse_event_suspects_json: [{ suspect_ref: 'line-active-a' }] } }
      ],
      causality_assessments: [{ source_event_id: 'p1-new', event_id: 'p1-new-event', row_index: 0, values: { causality_assessments_json: [{ adverse_event_id: 'ae-1', suspect_ref: 'line-active-a', method: 'explicit', score: 0, assessed: false }] } }]
    },
    'patient-2': { adverse_events: [], causality_assessments: [] },
    'patient-3': { adverse_events: [{ source_event_id: 'p3-followup', event_id: 'p3-followup-event', row_index: 0, values: { adverse_event_id: null, adverse_event_status: 'absent' } }], causality_assessments: [] },
    'patient-4': { adverse_events: [], causality_assessments: [] }
  }
};

const originalStore = clone(store);
const calls = [];
const dataPort = {
  getPopulationProjection() { calls.push('getPopulationProjection'); return store.population; },
  getPatientProjection(id) { calls.push('getPatientProjection'); return store.projections[id]; },
  getPatientEvents(id) { calls.push('getPatientEvents'); return store.events[id]; },
  getLatestRequestValidation(id) { calls.push('getLatestRequestValidation'); return store.requestValidation[id]; },
  getVisitsAndLines(id) { calls.push('getVisitsAndLines'); return store.visits[id]; },
  getProms(id) { calls.push('getProms'); return store.proms[id]; },
  getAdherence(id) { calls.push('getAdherence'); return store.adherence[id]; },
  getAdverseEventsAndCausality(id) { calls.push('getAdverseEventsAndCausality'); return store.safety[id]; }
};

const cohort = Cohort.buildRawCohort(dataPort, { fileName: 'raw-sintético.xlsx', importedAt: '2026-08-06T10:00:00Z' });
assert.equal(cohort.length, 4, 'one entry per patient_id and duplicate population summaries ignored');
assert.deepEqual(store, originalStore, 'Data Port results are not mutated');
assert.deepEqual([...new Set(calls)].sort(), [
  'getAdherence', 'getAdverseEventsAndCausality', 'getLatestRequestValidation', 'getPatientEvents',
  'getPatientProjection', 'getPopulationProjection', 'getProms', 'getVisitsAndLines'
].sort(), 'only approved Data Port reads are used');

const p1 = cohort.find(patient => patient.patient_id === 'patient-1');
const p2 = cohort.find(patient => patient.patient_id === 'patient-2');
const p3 = cohort.find(patient => patient.patient_id === 'patient-3');
const p4 = cohort.find(patient => patient.patient_id === 'patient-4');
assert.equal(p1.primary_identifier_value, '', 'multiple identifiers leave primary empty');
assert.equal(p2.primary_identifier_value, 'CIP-002', 'single explicit identifier is primary');
assert.equal(p1.services.length, 2, 'multiple explicit services preserved');
assert.equal(p1.pathologies.length, 2, 'multiple explicit pathologies preserved');
assert.equal(p1.lines.length, 4, 'all lines preserved');
assert.equal(p1.lines.filter(line => line.active_at_event === true).length, 2, 'only true is active');
assert.equal(p1.lines.find(line => line.line_id === 'line-false').activity_state, 'inactive', 'false is distinct from unknown');
assert.equal(p1.lines.find(line => line.line_id === 'line-unknown').activity_state, 'not_recorded', 'unknown is not suspended or active');
assert.equal(p2.lines.filter(line => line.active_at_event === true).length, 0, 'no fallback to last line');
assert.equal(p2.latest_request.requested_drug_name, 'Solo solicitado');
assert.equal(p2.latest_validation.validation_result, 'pending', 'requested remains separate from pending validation');
assert.equal(p1.latest_validation.validation_result, 'validated');
assert.equal(p3.latest_validation.validation_result, 'denied');
assert.equal(p1.latest_first_visit.event_date, '2026-01-02');
assert.equal(p1.latest_followup.event_date, '2026-01-04');
assert.equal(p1.proms.length, 3, 'PROMs repeated across lines are deduplicated and history is retained');
assert.deepEqual(p1.latest_proms.map(prom => prom.instrument), ['PROM-LATEST-A', 'PROM-LATEST-B'], 'all measurements from the latest stable act are retained');
assert.equal(p1.latest_proms[0].value, 0, 'PROM zero preserved');
assert.equal(p1.latest_proms[0].content.answered, false, 'PROM false preserved');
assert.equal(p1.latest_proms[1].value, false, 'second explicit latest-act PROM preserved');
assert.equal(p1.latest_proms.some(prom => prom.instrument === 'PROM-HISTORICAL'), false, 'historical PROM excluded from latest act without removing history');
assert.equal(p1.adherence_summary.result, 'multiple', 'different explicit adherence results remain multiple');
assert.equal(p2.adherence_summary.result, 0, 'single adherence result including zero preserved');
assert.equal(p2.adherence_summary.instrument, 'Único', 'latest adherence act supersedes historical results');
assert.equal(p4.adherence_summary.result, 'not_recorded', 'missing adherence is not recorded');
assert.equal(p1.adverse_event_overall_status, 'present');
assert.equal(p1.adverse_events.length, 1, 'same adverse event updates collapse to latest');
assert.equal(p1.adverse_events[0].action, 'new', 'latest chronological adverse update wins');
assert.equal(p3.adverse_event_overall_status, 'absent', 'explicit absence is preserved');
assert.equal(p4.adverse_event_overall_status, 'not_recorded', 'no rows is not absence');
assert.equal(p1.causality_assessments.length, 1, 'only explicit causality assessment counted');
assert.equal(p1.causality_assessments[0].assessment.score, 0);
assert.equal(p1.causality_assessments[0].assessment.assessed, false);
assert.equal(p1.name, '');
assert.equal(p1.age, '');
assert.equal(p1.sex, '');
assert.deepEqual(cohort.map(patient => patient.patient_id), ['patient-1', 'patient-4', 'patient-2', 'patient-3'], 'deterministic primary identifier then patient_id ordering');
const p1Movements = p1.therapeutic_movements;
assert.deepEqual(p1Movements.map(movement => movement.type), ['schedule_change', 'suspension', 'suspension'], 'explicit movement and structured suspensions retained');
assert.equal(p1Movements.some(movement => movement.type === 'no_change_recorded'), false, 'explicit absence of change is not a movement');
const suspensionByStatus = p1Movements.find(movement => movement.suspension_status === 'yes');
assert(suspensionByStatus, 'suspension driven by suspension_status "yes" is retained as a movement');
assert.equal(suspensionByStatus.type, 'suspension');
assert.equal(suspensionByStatus.suspension_reason, 'Motivo explícito de suspensión', 'explicit suspension reason preserved');
assert.equal(suspensionByStatus.suspension_effective_date, '2026-01-05', 'explicit suspension effective date preserved');
assert.equal(suspensionByStatus.event_date, '2026-01-05', 'suspension event_date uses the explicit suspension_effective_date');
const suspensionByType = p1Movements.find(movement => movement.line_id === 'line-susp-explicita');
assert(suspensionByType, 'suspension driven by explicit therapeutic_movement_type is retained');
assert.equal(suspensionByType.type, 'suspension');
assert.equal(suspensionByType.suspension_reason, 'Suspensión por type explícito', 'suspension by explicit type preserves reason');
assert.equal(suspensionByType.event_date, '2026-01-06', 'explicit suspension by type uses its effective date');
const scheduleChange = p1Movements.find(movement => movement.type === 'schedule_change');
assert.equal(scheduleChange.event_date, '2026-01-04', 'non-suspension movement keeps its movement_effective_date');
assert.equal(scheduleChange.suspension_status, '', 'non-suspension movement carries no suspension status');
assert.equal(scheduleChange.suspension_reason, '', 'non-suspension movement carries no suspension reason');
assert.equal(scheduleChange.suspension_effective_date, '', 'non-suspension movement carries no suspension effective date');
assert.equal(p1Movements.some(movement => movement.line_id === 'line-inactive'), false, 'inactive line without explicit suspension generates no suspension movement');

const csvRows = Cohort.buildCsvRows(cohort);
assert.equal(Cohort.CSV_COLUMNS.length, 37);
assert.deepEqual(Object.keys(csvRows[0]), Cohort.CSV_COLUMNS);
const expanded = Array.from({ length: 55 }, (_, index) => {
  const patient = clone(p1);
  patient.patient_id = `patient-export-${String(index + 1).padStart(2, '0')}`;
  patient.identifiers = [{ identifier_system: 'cip', identifier_value: `CIP-EXPORT-${index + 1}` }];
  patient.primary_identifier_value = patient.identifiers[0].identifier_value;
  return patient;
});
const csv = Cohort.serializeCsv(expanded);
assert.equal(csv.charCodeAt(0), 0xFEFF, 'CSV starts with UTF-8 BOM marker');
assert.equal((csv.match(/\r\n/g) || []).length, 56, 'CSV has header plus all 55 filtered patients');
assert.equal(/[^\r]\n/.test(csv), false, 'CSV uses CRLF only');
assert.match(csv, /""/, 'RFC 4180 quote escaping is present in JSON cells');
assert.match(csv, /"'=FORMULA-DRUG \|/, 'formula-like text is neutralized only in CSV');
assert.equal(p1.lines[0].drug_name, '=FORMULA-DRUG', 'formula neutralization does not mutate cohort');
const controlPrefixed = clone(p1);
controlPrefixed.source_file_name = '\t=CONTROL-PREFIX';
assert.match(Cohort.serializeCsv([controlPrefixed]), /"'\t=CONTROL-PREFIX"/, 'control prefixes before formula markers are neutralized');
JSON.parse(csvRows[0].treatment_lines_json);
JSON.parse(csvRows[0].proms_json);
JSON.parse(csvRows[0].adverse_events_json);
JSON.parse(csvRows[0].causality_assessments_json);
JSON.parse(csvRows[0].provenance_json);
const csvMovements = JSON.parse(csvRows[0].therapeutic_movements_json);
assert.equal(csvMovements.length, 3, 'therapeutic_movements_json travels through the CSV');
assert.equal(csvMovements.find(movement => movement.suspension_status === 'yes').suspension_reason, 'Motivo explícito de suspensión', 'suspension reason survives the CSV export');

const demoDataset = JSON.parse(readFileSync(path.join(ROOT, 'data/demo/farmacia/farmacia_longitudinal_demo_v0_3.json'), 'utf8'));
const demo = Cohort.buildDemoCohort(demoDataset, { fileName: 'farmacia_longitudinal_demo_v0_3.json', importedAt: '' });
assert.equal(demo.length, demoDataset.pacientes.length);
assert.equal(demo.length, 3, 'demo contains only the three versioned JSON patients');
assert.equal(demo.some(patient => /^CIP-DEMO-FH-0(1[1-9]|2|3)/.test(patient.primary_identifier_value)), false, 'the 28 generated patients are absent');
assert(demo.every(patient => patient.source_mode === 'demo'));

class FakeWindow {
  constructor(origin = 'https://hub.test', pathname = '/farmacia_estadisticas.html', search = '?fh_stats_handoff=1') {
    this.location = { origin, href: `${origin}${pathname}${search}`, pathname, search, hash: '', replace: value => { this.replaced = value; } };
    this.history = { replaceState: (_state, _title, value) => { this.historyValue = value; } };
    this.listeners = new Set();
    this.sent = [];
    this.closed = false;
    this.document = { nodes: {}, getElementById: id => this.document.nodes[id] || null };
  }
  addEventListener(type, listener) { if (type === 'message') this.listeners.add(listener); }
  removeEventListener(type, listener) { if (type === 'message') this.listeners.delete(listener); }
  dispatch(data, origin, source) { [...this.listeners].forEach(listener => listener({ data, origin, source })); }
  postMessage(data, targetOrigin) { this.sent.push({ data, targetOrigin }); }
  setTimeout(callback, ms) { return setTimeout(callback, ms); }
  clearTimeout(handle) { clearTimeout(handle); }
  close() { this.closed = true; }
}

const validPayload = {
  contract_version: Cohort.VERSION,
  source_mode: 'raw',
  source_file_name: 'raw-sintético.xlsx',
  imported_at: '2026-08-06T10:00:00Z',
  patient_count: cohort.length,
  event_count: cohort.reduce((sum, patient) => sum + patient.valid_event_count, 0),
  cohort
};
assert.equal(Handoff._test.validatePayload(validPayload), validPayload);
assert.throws(() => Handoff._test.validatePayload({ ...validPayload, workbook: {} }), /HANDOFF_PAYLOAD_KEY_INVALID|HANDOFF_FORBIDDEN/);
assert.throws(() => Handoff._test.validatePayload({ ...validPayload, patient_count: 99 }), /HANDOFF_COUNTS_INVALID/);
const mixedPayload = clone(validPayload);
mixedPayload.cohort[0].source_mode = 'demo';
assert.throws(() => Handoff._test.validatePayload(mixedPayload), /HANDOFF_COHORT_RECORD_INVALID/);
const duplicatePayload = clone(validPayload);
duplicatePayload.cohort[1].patient_id = duplicatePayload.cohort[0].patient_id;
assert.throws(() => Handoff._test.validatePayload(duplicatePayload), /HANDOFF_PATIENT_ID_INVALID/);
for (const mutation of [
  patient => { patient.stats_schema_version = 'wrong'; },
  patient => { patient.source_file_name = 'other.xlsx'; },
  patient => { patient.name = 'Invented'; },
  patient => { patient.age = 40; },
  patient => { patient.sex = 'Invented'; }
]) {
  const invalidRecordPayload = clone(validPayload);
  mutation(invalidRecordPayload.cohort[0]);
  assert.throws(() => Handoff._test.validatePayload(invalidRecordPayload), /HANDOFF_COHORT_RECORD_INVALID/);
}
const oversizedPayload = { contract_version: Cohort.VERSION, source_mode: 'raw', source_file_name: 'x'.repeat(Handoff.MAX_PAYLOAD_BYTES + 1), imported_at: '', patient_count: 0, event_count: 0, cohort: [] };
assert.throws(() => Handoff._test.validatePayload(oversizedPayload), /HANDOFF_PAYLOAD_TOO_LARGE/);
const unicodeOversizedPayload = { contract_version: Cohort.VERSION, source_mode: 'raw', source_file_name: 'é'.repeat(Math.floor(Handoff.MAX_PAYLOAD_BYTES / 2) + 1), imported_at: '', patient_count: 0, event_count: 0, cohort: [] };
assert.throws(() => Handoff._test.validatePayload(unicodeOversizedPayload), /HANDOFF_PAYLOAD_TOO_LARGE/, 'payload limit counts UTF-8 bytes, not UTF-16 units');
const deepPayload = clone(validPayload);
let deepCursor = deepPayload.cohort[0];
for (let depth = 0; depth < 35; depth += 1) {
  deepCursor.extra = {};
  deepCursor = deepCursor.extra;
}
assert.throws(() => Handoff._test.validatePayload(deepPayload), /HANDOFF_PAYLOAD_DEPTH_EXCEEDED/);
const nodeHeavyPayload = clone(validPayload);
nodeHeavyPayload.cohort[0].extra_nodes = new Array(250001).fill(0);
assert.throws(() => Handoff._test.validatePayload(nodeHeavyPayload), /HANDOFF_PAYLOAD_NODES_EXCEEDED/);

const parent = new FakeWindow('https://hub.test', '/farmacia_index.html', '');
const child = new FakeWindow();
const senderErrors = [];
const sender = Handoff.createSender({ windowObject: parent, childWindow: child, payload: validPayload, ttlMs: 1000, onError: code => senderErrors.push(code) });
parent.dispatch({ type: 'FARMACIA_STATISTICS_READY', protocol_version: Handoff.VERSION, child_nonce: 'nonce-valid-00000001' }, 'https://evil.test', child);
parent.dispatch({ type: 'FARMACIA_STATISTICS_READY', protocol_version: Handoff.VERSION, child_nonce: 'nonce-valid-00000001' }, 'https://hub.test', new FakeWindow());
assert.equal(child.sent.length, 0, 'wrong origin and source are rejected');
parent.dispatch({ type: 'FARMACIA_STATISTICS_READY', protocol_version: Handoff.VERSION, child_nonce: 'nonce-valid-00000001' }, 'https://hub.test', child);
assert.equal(child.sent.length, 1);
assert.equal(sender.isActive(), false, 'sender is one-shot');
assert.equal(parent.listeners.size, 0, 'sender listener removed');
parent.dispatch({ type: 'FARMACIA_STATISTICS_READY', protocol_version: Handoff.VERSION, child_nonce: 'nonce-valid-00000001' }, 'https://hub.test', child);
assert.equal(child.sent.length, 1, 'payload cannot be reused');
assert.deepEqual(senderErrors, []);

const protocolParent = new FakeWindow('https://hub.test', '/farmacia_index.html', '');
const protocolChild = new FakeWindow();
const protocolErrors = [];
Handoff.createSender({ windowObject: protocolParent, childWindow: protocolChild, payload: validPayload, ttlMs: 1000, onError: code => protocolErrors.push(code) });
protocolParent.dispatch({ type: 'FARMACIA_STATISTICS_READY', protocol_version: 'wrong', child_nonce: 'nonce-valid-00000002' }, 'https://hub.test', protocolChild);
assert.deepEqual(protocolErrors, ['HANDOFF_PROTOCOL_VERSION_INVALID']);

async function receiverHarness({ nonce = 'receiver-nonce-0001', ttlMs = 1000 } = {}) {
  const opener = new FakeWindow('https://hub.test', '/farmacia_index.html', '');
  const receiver = new FakeWindow();
  receiver.opener = opener;
  const promise = Handoff.receive({ windowObject: receiver, openerWindow: opener, crypto: { randomUUID: () => nonce }, ttlMs });
  assert.equal(opener.sent.length, 1);
  return { opener, receiver, promise, ready: opener.sent[0].data };
}

const accepted = await receiverHarness();
accepted.receiver.dispatch({ type: 'FARMACIA_STATISTICS_COHORT', protocol_version: Handoff.VERSION, child_nonce: accepted.ready.child_nonce, payload: validPayload, payload_digest: Handoff._test.payloadDigest(validPayload) }, 'https://hub.test', accepted.opener);
assert.equal((await accepted.promise).patient_count, cohort.length);
assert.equal(accepted.receiver.listeners.size, 0, 'receiver listener removed after adoption');

const badOrigin = await receiverHarness({ nonce: 'receiver-nonce-0002' });
badOrigin.receiver.dispatch({ type: 'FARMACIA_STATISTICS_COHORT', protocol_version: Handoff.VERSION, child_nonce: badOrigin.ready.child_nonce, payload: validPayload, payload_digest: Handoff._test.payloadDigest(validPayload) }, 'https://evil.test', badOrigin.opener);
await assert.rejects(badOrigin.promise, /HANDOFF_ORIGIN_INVALID/);

const badNonce = await receiverHarness({ nonce: 'receiver-nonce-0003' });
badNonce.receiver.dispatch({ type: 'FARMACIA_STATISTICS_COHORT', protocol_version: Handoff.VERSION, child_nonce: 'wrong-nonce-000000', payload: validPayload, payload_digest: Handoff._test.payloadDigest(validPayload) }, 'https://hub.test', badNonce.opener);
await assert.rejects(badNonce.promise, /HANDOFF_NONCE_INVALID/);

const badVersion = await receiverHarness({ nonce: 'receiver-nonce-0004' });
badVersion.receiver.dispatch({ type: 'FARMACIA_STATISTICS_COHORT', protocol_version: 'wrong', child_nonce: badVersion.ready.child_nonce, payload: validPayload, payload_digest: Handoff._test.payloadDigest(validPayload) }, 'https://hub.test', badVersion.opener);
await assert.rejects(badVersion.promise, /HANDOFF_PROTOCOL_VERSION_INVALID/);

const altered = await receiverHarness({ nonce: 'receiver-nonce-0005' });
altered.receiver.dispatch({ type: 'FARMACIA_STATISTICS_COHORT', protocol_version: Handoff.VERSION, child_nonce: altered.ready.child_nonce, payload: validPayload, payload_digest: 'altered' }, 'https://hub.test', altered.opener);
await assert.rejects(altered.promise, /HANDOFF_PAYLOAD_INTEGRITY_INVALID/);

const wrongSource = await receiverHarness({ nonce: 'receiver-nonce-0006' });
wrongSource.receiver.dispatch({ type: 'FARMACIA_STATISTICS_COHORT', protocol_version: Handoff.VERSION, child_nonce: wrongSource.ready.child_nonce, payload: validPayload, payload_digest: Handoff._test.payloadDigest(validPayload) }, 'https://hub.test', new FakeWindow());
assert.equal(wrongSource.receiver.listeners.size, 1, 'wrong source cannot consume receiver');
wrongSource.receiver.dispatch({ type: 'FARMACIA_STATISTICS_COHORT', protocol_version: Handoff.VERSION, child_nonce: wrongSource.ready.child_nonce, payload: validPayload, payload_digest: Handoff._test.payloadDigest(validPayload) }, 'https://hub.test', wrongSource.opener);
await wrongSource.promise;

const timeout = await receiverHarness({ nonce: 'receiver-nonce-0007', ttlMs: 1 });
await assert.rejects(timeout.promise, /HANDOFF_TIMEOUT/);
assert.equal(timeout.receiver.listeners.size, 0, 'timeout removes receiver listener');

const isolatedA = await receiverHarness({ nonce: 'receiver-isolated-a' });
const isolatedB = await receiverHarness({ nonce: 'receiver-isolated-b' });
assert.notEqual(isolatedA.ready.child_nonce, isolatedB.ready.child_nonce);
isolatedA.receiver.dispatch({ type: 'FARMACIA_STATISTICS_COHORT', protocol_version: Handoff.VERSION, child_nonce: isolatedB.ready.child_nonce, payload: validPayload, payload_digest: Handoff._test.payloadDigest(validPayload) }, 'https://hub.test', isolatedB.opener);
assert.equal(isolatedA.receiver.listeners.size, 1, 'two windows cannot cross-consume');
isolatedA.receiver.dispatch({ type: 'FARMACIA_STATISTICS_COHORT', protocol_version: Handoff.VERSION, child_nonce: isolatedA.ready.child_nonce, payload: validPayload, payload_digest: Handoff._test.payloadDigest(validPayload) }, 'https://hub.test', isolatedA.opener);
isolatedB.receiver.dispatch({ type: 'FARMACIA_STATISTICS_COHORT', protocol_version: Handoff.VERSION, child_nonce: isolatedB.ready.child_nonce, payload: validPayload, payload_digest: Handoff._test.payloadDigest(validPayload) }, 'https://hub.test', isolatedB.opener);
await Promise.all([isolatedA.promise, isolatedB.promise]);

const popupParent = new FakeWindow('https://hub.test', '/farmacia_index.html', '');
popupParent.open = () => null;
popupParent.document.nodes.detalleCargaFarmacia = { textContent: '' };
const popupResult = Handoff.startRawHandoff({ href: 'https://hub.test/farmacia_estadisticas.html' }, { format: 'farmacia_bridge_v2_raw', dataPort }, { windowObject: popupParent, documentObject: popupParent.document });
assert.equal(popupResult.status, 'popup_blocked');
assert.match(popupParent.document.nodes.detalleCargaFarmacia.textContent, /bloqueó la ventana emergente/);

const handoffSource = readFileSync(path.join(ROOT, 'scripts/farmacia_statistics_handoff.js'), 'utf8');
assert.doesNotMatch(handoffSource, /\.(?:sessionStorage|localStorage)\b|indexedDB\s*\./, 'handoff makes zero storage calls');
assert.doesNotMatch(JSON.stringify(validPayload), /bridgeReadModel|dataPort|workbook|ArrayBuffer|CurrentPatientSession|drafts/);

console.log('farmacia_statistics_cohort_check: PASS');
console.log('cohort/CSV: 30 scenarios; handoff: origin/source/nonce/version/integrity/timeout/one-shot/isolation/popup/storage PASS');
