#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coreSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_export_v2_core.js'), 'utf8');
const adapterSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_export_v2_first_visit_adapter.js'), 'utf8');
const sandbox = { console };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(coreSource, sandbox);
vm.runInContext(adapterSource, sandbox);
const core = sandbox.FarmaciaExportV2Core;
const adapter = sandbox.FarmaciaExportV2FirstVisitAdapter;

assert.deepEqual(Object.keys(adapter).sort(), [
  'ADAPTER_VERSION', 'buildFirstVisitEvent', 'buildFirstVisitProjection', 'normalizeTriState', 'validateFirstVisitInput'
].sort(), 'exact five-member public API');
assert.equal(adapter.ADAPTER_VERSION, '1.0.0-draft.1');
assert.doesNotMatch(adapterSource, /document\.|localStorage|sessionStorage|fetch\(|XMLHttpRequest|Date\.|new Date|Math\.random|crypto\./, 'adapter is browser-pure and has no clock, storage, network, DOM or randomness');

const nullLineValues = {
  drugName: null, activeIngredient: null, presentation: null, doseText: null, route: null,
  scheduleCode: null, scheduleLabel: null, scheduleOtherText: null, selectedDrugId: null,
  catalogSource: null, nationalCode: null, registrationNumber: null
};
function line(overrides = {}) {
  return {
    rowKey: 'line-row-1', treatmentId: 'treatment-syn-1', lineId: 'line-syn-1', lineRole: 'principal',
    isPrimaryLine: true, lineStatusAtEvent: 'active', activeAtEvent: true,
    ...nullLineValues, drugName: 'Fármaco sintético A', activeIngredient: 'Activo sintético A', ...overrides
  };
}
function baseInput() {
  return {
    technical: {
      eventId: 'evt-first-syn-1', sourceEventId: 'src-first-syn-1', firstVisitId: 'first-syn-1', patientId: 'patient-syn-1',
      occurredAt: '2026-08-03T09:00:00Z', recordedAt: '2026-08-03T09:05:00Z', demoFlag: false, eventStatus: 'completed',
      hospitalCode: 'H-SYN', professionalRef: 'prof-syn', identifierSystem: 'urn:synthetic'
    },
    context: {
      identifierValue: 'CIP-SYN-FIRST-1', serviceCode: 'DERM', serviceLabel: 'Dermatología', pathologyCode: 'SYN-HS',
      pathologyLabel: 'Hidradenitis supurativa', professionalDisplay: 'Profesional sintético'
    },
    visit: {
      firstVisitDate: '2026-08-03', inductionPerformedStatus: 'no', stratificationLevel: null,
      baselinePromsCollectionStatus: 'not_recorded', pharmacyVisitNotes: null
    },
    proms: null,
    lines: [line()]
  };
}
function resultWith(mutator) {
  const value = baseInput();
  mutator(value);
  const before = JSON.stringify(value);
  const result = adapter.validateFirstVisitInput(value);
  assert.equal(JSON.stringify(value), before, 'validator does not mutate input');
  return { value, result };
}
function expectCode(mutator, code, label) {
  const { value, result } = resultWith(mutator);
  assert.equal(result.valid, false, label);
  assert.ok(result.errors.some(error => error.code === code), `${label}: ${code}`);
  return value;
}

const input = baseInput();
const before = JSON.stringify(input);
const validResult = adapter.validateFirstVisitInput(input);
assert.equal(validResult.valid, true);
assert.equal(validResult.errors.length, 0);
assert.equal(JSON.stringify(input), before, 'valid input remains unchanged');
const event = adapter.buildFirstVisitEvent(input);
assert.equal(event.event_type, 'pharmacy_first_visit');
assert.equal(event.first_visit_id, input.technical.firstVisitId);
assert.equal(event.first_visit_date, input.visit.firstVisitDate);
assert.equal(event.induction_performed_status, 'no');
assert.equal(event.stratification_level, null, 'absent stratification remains null');
assert.equal(event.baseline_proms_collection_status, 'not_recorded');
assert.equal(event.proms_json, null);
assert.equal(event.demo_flag, false, 'false is preserved');
for (const forbidden of ['request_id', 'validation_id', 'visit_id', 'adverse_event_id', 'validation_result', 'dispensation_status', 'adverse_event_status', 'causality_assessments_json', 'line_id', 'line_drug_name']) {
  assert.equal(event[forbidden], undefined, `${forbidden} is not generated in First Visit event`);
}

const projection = adapter.buildFirstVisitProjection(input);
assert.deepEqual(Object.keys(projection).sort(), ['event', 'rows', 'tsv']);
assert.equal(projection.rows.length, 1);
assert.equal(projection.rows[0].row_role, 'first_visit_line');
assert.equal(projection.rows[0].bridge_status, 'PENDIENTE');
assert.equal(projection.rows[0].line_status_at_event, 'active');
assert.equal(projection.rows[0].active_at_event, true);
assert.equal(projection.rows[0].is_primary_line, true);
assert.equal(projection.rows[0].row_count, 1);
assert.equal(core.validateRow(projection.rows[0]).valid, true, 'projected row validates against core');
assert.equal(core.stableStringify(core.parseTsvRows(projection.tsv)), core.stableStringify(projection.rows), 'TSV is reversible');
assert.equal(core.stableStringify(adapter.buildFirstVisitProjection(input)), core.stableStringify(projection), 'projection is deterministic');

expectCode(value => { value.unexpected = {}; }, 'UNKNOWN_FIELD', 'top-level input is closed');
expectCode(value => { value.visit.followupStatus = 'performed'; }, 'UNKNOWN_FIELD', 'follow-up field is rejected');
expectCode(value => { value.technical.validationId = 'forbidden'; }, 'UNKNOWN_FIELD', 'validation field is rejected');
expectCode(value => { value.lines[0].adverseEventId = 'forbidden'; }, 'UNKNOWN_FIELD', 'adverse-event field is rejected');
expectCode(value => { value.lines[0].causality = 'forbidden'; }, 'UNKNOWN_FIELD', 'causality field is rejected');
const typedInvalid = expectCode(value => { delete value.technical.eventId; }, 'MISSING_REQUIRED', 'explicit event ID is required');
assert.throws(() => adapter.buildFirstVisitEvent(typedInvalid), error => error.name === 'FarmaciaExportV2FirstVisitAdapterError' && error.code === 'INVALID_FIRST_VISIT_INPUT' && Array.isArray(error.details), 'build errors are typed with details');
for (const field of ['sourceEventId', 'firstVisitId', 'patientId', 'occurredAt', 'recordedAt']) {
  expectCode(value => { delete value.technical[field]; }, 'MISSING_REQUIRED', `${field} is never generated`);
}
expectCode(value => { value.technical.occurredAt = 'today'; }, 'INVALID_ISO_DATE', 'occurredAt must be explicit ISO context');
expectCode(value => { value.technical.recordedAt = '2026-08-03T25:00:00Z'; }, 'INVALID_ISO_DATE', 'recordedAt rejects invalid ISO time');
expectCode(value => { value.visit.firstVisitDate = null; }, 'INVALID_FIRST_VISIT_DATE', 'First Visit date is required');
expectCode(value => { value.visit.firstVisitDate = '2026-02-30'; }, 'INVALID_FIRST_VISIT_DATE', 'First Visit date must be a real ISO date-only value');
expectCode(value => { value.visit.firstVisitDate = '2026-08-03T00:00:00Z'; }, 'INVALID_FIRST_VISIT_DATE', 'First Visit date rejects timestamps');
for (const [raw, normalized] of [['Sí', 'yes'], ['no', 'no'], ['not_recorded', 'not_recorded'], ['No informado', null], ['', null], [null, null]]) {
  assert.equal(adapter.normalizeTriState(raw), normalized, `tristate ${String(raw)}`);
}
expectCode(value => { value.visit.inductionPerformedStatus = 'inferida'; }, 'INVALID_ENUM', 'induction is a closed tristate');
for (const field of ['inductionPerformedStatus', 'baselinePromsCollectionStatus']) {
  const candidate = baseInput();
  candidate.visit[field] = 'No informado';
  const result = adapter.validateFirstVisitInput(candidate);
  assert.equal(result.valid, true, `${field} accepts the visible No informado literal`);
  const normalizedEvent = adapter.buildFirstVisitEvent(candidate);
  const eventField = field === 'inductionPerformedStatus' ? 'induction_performed_status' : 'baseline_proms_collection_status';
  assert.equal(normalizedEvent[eventField], null, `${field} builds as null`);
}
for (const [label, mutator] of [
  ['context service', value => { value.context.serviceLabel = 'No informado'; }],
  ['stratification', value => { value.visit.stratificationLevel = 'No informado'; }],
  ['line dose', value => { value.lines[0].doseText = 'No informado'; }]
]) {
  expectCode(mutator, 'PLACEHOLDER_NOT_ALLOWED', `No informado remains rejected in non-tristate ${label}`);
}

const partialDlqi = {
  instrument: 'DLQI', value: 0, complete: false, answeredCount: 1,
  answers: [{ item: 1, score: 0, response: 'Nada' }]
};
const completeZeroDlqi = {
  instrument: 'DLQI', value: 0, complete: true, answeredCount: 10,
  answers: Array.from({ length: 10 }, (_, index) => ({ item: index + 1, score: 0, response: 'Nada' }))
};
const explicitZeroEva = { instrument: 'EVA_DOLOR', value: 0, complete: true, answeredCount: 1, answers: null };
expectCode(value => {
  value.visit.baselinePromsCollectionStatus = 'yes';
  value.proms = [{ instrument: 'DLQI', value: 0, complete: false, answeredCount: 0, answers: [] }];
}, 'EMPTY_DLQI_ANSWERS', 'DLQI requires at least one explicit answer');
expectCode(value => {
  const sparseAnswers = [];
  sparseAnswers.length = 1;
  value.visit.baselinePromsCollectionStatus = 'yes';
  value.proms = [{ instrument: 'DLQI', value: 0, complete: false, answeredCount: 1, answers: sparseAnswers }];
}, 'SPARSE_DLQI_ANSWERS', 'DLQI rejects sparse answer-array holes');
const explicitZeroDlqiInput = baseInput();
explicitZeroDlqiInput.visit.baselinePromsCollectionStatus = 'yes';
explicitZeroDlqiInput.proms = [structuredClone(partialDlqi)];
assert.equal(adapter.validateFirstVisitInput(explicitZeroDlqiInput).valid, true, 'DLQI zero with an explicit zero-score answer remains valid');
assert.equal(adapter.buildFirstVisitEvent(explicitZeroDlqiInput).proms_json[0].value, 0, 'explicit DLQI zero builds as zero');
for (const [status, proms, valid] of [
  ['yes', [partialDlqi], true], ['yes', [], false], ['no', null, true], ['not_recorded', null, true], [null, null, true], ['no', [partialDlqi], false]
]) {
  const { result } = resultWith(value => { value.visit.baselinePromsCollectionStatus = status; value.proms = proms; });
  assert.equal(result.valid, valid, `PROM matrix status=${String(status)} proms=${proms === null ? 'null' : proms.length}`);
}
for (const prom of [partialDlqi, completeZeroDlqi, explicitZeroEva]) {
  const candidate = baseInput();
  candidate.visit.baselinePromsCollectionStatus = 'yes';
  candidate.proms = [structuredClone(prom)];
  const projected = adapter.buildFirstVisitProjection(candidate);
  assert.equal(projected.event.proms_json[0].value, 0, `${prom.instrument} explicit zero preserved`);
  assert.equal(projected.event.proms_json[0].complete, prom.complete, `${prom.instrument} complete boolean preserved`);
}
const untouchedEva = baseInput();
untouchedEva.visit.baselinePromsCollectionStatus = 'yes';
untouchedEva.proms = [structuredClone(partialDlqi)];
assert.equal(adapter.buildFirstVisitEvent(untouchedEva).proms_json.some(prom => prom.instrument.startsWith('EVA_')), false, 'untouched EVA is absent');
expectCode(value => {
  value.visit.baselinePromsCollectionStatus = 'yes'; value.proms = [{ ...explicitZeroEva, value: Number.NaN }];
}, 'INVALID_FINITE_NUMBER', 'non-finite PROM values are rejected');
expectCode(value => {
  value.visit.baselinePromsCollectionStatus = 'yes'; value.proms = [{ ...partialDlqi, unexpected: true }];
}, 'UNKNOWN_FIELD', 'PROM objects are closed');
expectCode(value => {
  value.visit.baselinePromsCollectionStatus = 'yes'; value.proms = [{ ...partialDlqi, answers: [{ item: 1, score: 0, response: '—' }] }];
}, 'INVALID_DLQI_RESPONSE', 'PROM placeholders are rejected');

const twoLines = baseInput();
twoLines.lines = [
  line(),
  line({ rowKey: 'line-row-2', treatmentId: 'treatment-syn-2', lineId: 'line-syn-2', lineRole: 'additional', isPrimaryLine: false, drugName: null, activeIngredient: 'Activo sintético B' })
];
const twoProjection = adapter.buildFirstVisitProjection(twoLines);
assert.equal(twoProjection.rows.length, 2);
assert.deepEqual(Array.from(twoProjection.rows, row => row.line_id), ['line-syn-1', 'line-syn-2'], 'input order remains stable');
assert.deepEqual(Array.from(twoProjection.rows, row => row.row_index), [1, 2]);
assert.deepEqual(Array.from(twoProjection.rows, row => row.row_count), [2, 2]);
assert.equal(twoProjection.rows[1].is_primary_line, false, 'secondary false remains false');
for (const field of ['event_id', 'first_visit_id', 'first_visit_date', 'proms_json']) {
  assert.equal(core.stableStringify(twoProjection.rows[0][field]), core.stableStringify(twoProjection.rows[1][field]), `${field} is common across rows`);
}
assert.equal(core.validateRowSet(twoProjection.rows).valid, true);
assert.equal(core.stableStringify(core.parseTsvRows(twoProjection.tsv)), core.stableStringify(twoProjection.rows));
expectCode(value => { value.lines.push(line({ rowKey: 'line-row-2', lineId: 'line-syn-2', isPrimaryLine: true })); }, 'PRIMARY_LINE_COUNT', 'exactly one primary line is required');
expectCode(value => { value.lines[0].isPrimaryLine = false; }, 'PRIMARY_LINE_COUNT', 'zero primary lines are rejected');
expectCode(value => { value.lines.push(line({ lineId: 'line-syn-2', isPrimaryLine: false })); }, 'DUPLICATE_ROW_KEY', 'rowKey is unique');
expectCode(value => { value.lines.push(line({ rowKey: 'line-row-2', isPrimaryLine: false })); }, 'DUPLICATE_LINE_ID', 'lineId is unique');
for (const field of ['rowKey', 'treatmentId', 'lineId']) expectCode(value => { delete value.lines[0][field]; }, 'MISSING_REQUIRED', `${field} is explicit`);
expectCode(value => { value.lines[0].drugName = null; value.lines[0].activeIngredient = null; }, 'LINE_NOT_IDENTIFIABLE', 'line needs drug or active ingredient identity');
expectCode(value => { value.lines[0] = line({ drugName: null, activeIngredient: null, doseText: '100 mg', selectedDrugId: 'CAT-SYN' }); }, 'LINE_NOT_IDENTIFIABLE', 'dose and metadata alone do not identify a line');
expectCode(value => { value.lines[0].lineStatusAtEvent = null; }, 'FIRST_VISIT_LINE_STATUS', 'active line status is explicit');
expectCode(value => { value.lines[0].activeAtEvent = false; }, 'FIRST_VISIT_LINE_MUST_BE_ACTIVE', 'activeAtEvent=true is explicit');

console.log('PASS: Farmacia Export v2 First Visit adapter contract.');
