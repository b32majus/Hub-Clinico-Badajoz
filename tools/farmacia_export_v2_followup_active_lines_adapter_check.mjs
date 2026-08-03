#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coreSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_export_v2_core.js'), 'utf8');
const adapterSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_export_v2_followup_active_lines_adapter.js'), 'utf8');
const sandbox = { console };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(coreSource, sandbox);
vm.runInContext(adapterSource, sandbox);
const core = sandbox.FarmaciaExportV2Core;
const adapter = sandbox.FarmaciaExportV2FollowupActiveLinesAdapter;

assert.deepEqual(Object.keys(adapter).sort(), [
  'ADAPTER_VERSION', 'buildFollowupEvent', 'buildFollowupProjection', 'validateFollowupInput'
].sort(), 'exact four-member public API');
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
      eventId: 'evt-follow-syn-1', sourceEventId: 'src-follow-syn-1', visitId: 'visit-syn-1', patientId: 'patient-syn-1',
      occurredAt: '2026-08-03T09:00:00Z', recordedAt: '2026-08-03T09:05:00Z', demoFlag: false, eventStatus: 'recorded',
      hospitalCode: 'H-SYN', professionalRef: 'prof-syn', identifierSystem: 'urn:synthetic'
    },
    context: {
      identifierValue: 'CIP-SYN-FOLLOW-1', serviceCode: 'REU', serviceLabel: 'Reumatología', pathologyCode: 'SYN-RA',
      pathologyLabel: 'Artritis reumatoide', professionalDisplay: 'Profesional sintético'
    },
    visit: { visitDate: '2026-08-03' },
    activeLines: [line()]
  };
}
function resultWith(mutator) {
  const value = baseInput();
  mutator(value);
  const before = JSON.stringify(value);
  const result = adapter.validateFollowupInput(value);
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
const validResult = adapter.validateFollowupInput(input);
assert.equal(validResult.valid, true);
assert.equal(validResult.errors.length, 0);
assert.equal(JSON.stringify(input), before, 'valid input remains unchanged');
const event = adapter.buildFollowupEvent(input);
assert.equal(event.event_type, 'pharmacy_followup');
assert.equal(event.visit_id, input.technical.visitId);
assert.equal(event.visit_date, input.visit.visitDate);
assert.equal(event.identifier_value, input.context.identifierValue);
assert.equal(event.service_label, input.context.serviceLabel);
assert.equal(event.professional_display, input.context.professionalDisplay);
assert.equal(event.demo_flag, false, 'false is preserved');
const FORBIDDEN_EVENT_FIELDS = ['request_id', 'validation_id', 'first_visit_id', 'adverse_event_id', 'validation_result', 'dispensation_status',
  'specific_review_status', 'therapeutic_movement_type', 'suspension_status', 'adherence_result', 'adverse_event_status',
  'causality_assessments_json', 'proms_json', 'related_treatments_json', 'visit_general_observations', 'stratification_review_status'];
for (const forbidden of FORBIDDEN_EVENT_FIELDS) {
  assert.equal(event[forbidden], undefined, `${forbidden} is not generated in Followup event`);
}

const projection = adapter.buildFollowupProjection(input);
assert.deepEqual(Object.keys(projection).sort(), ['event', 'rows', 'tsv']);
assert.equal(projection.rows.length, 1);
assert.equal(projection.rows[0].row_role, 'followup_line');
assert.equal(projection.rows[0].bridge_status, 'PENDIENTE');
assert.equal(projection.rows[0].line_status_at_event, 'active');
assert.equal(projection.rows[0].active_at_event, true);
assert.equal(projection.rows[0].is_primary_line, true);
assert.equal(projection.rows[0].row_count, 1);
assert.equal(projection.rows[0].visit_date, '2026-08-03');
assert.equal(core.validateRow(projection.rows[0]).valid, true, 'projected row validates against core');
assert.equal(core.stableStringify(core.parseTsvRows(projection.tsv)), core.stableStringify(projection.rows), 'TSV is reversible');
assert.equal(core.stableStringify(adapter.buildFollowupProjection(input)), core.stableStringify(projection), 'projection is deterministic');
for (const forbidden of FORBIDDEN_EVENT_FIELDS) {
  assert.equal(projection.rows[0][forbidden], null, `row never populates ${forbidden}`);
  const columnIndex = core.ROW_COLUMNS.indexOf(forbidden);
  assert.ok(columnIndex >= 0, `${forbidden} is a known column`);
  assert.equal(projection.tsv.split('\t')[columnIndex], '', `TSV keeps ${forbidden} empty`);
}
assert.equal(projection.rows[0].line_id, 'line-syn-1');
assert.equal(projection.rows[0].line_drug_name, 'Fármaco sintético A');

expectCode(value => { value.unexpected = {}; }, 'UNKNOWN_FIELD', 'top-level input is closed');
expectCode(value => { value.technical.validationId = 'forbidden'; }, 'UNKNOWN_FIELD', 'validation field is rejected');
expectCode(value => { value.visit.stratificationReviewStatus = 'performed'; }, 'UNKNOWN_FIELD', 'follow-up review field is rejected');
expectCode(value => { value.context.promsJson = []; }, 'UNKNOWN_FIELD', 'PROM field is rejected in context');
expectCode(value => { value.proms = null; }, 'UNKNOWN_FIELD', 'top-level proms block is rejected');
expectCode(value => { value.activeLines[0].adverseEventId = 'forbidden'; }, 'UNKNOWN_FIELD', 'adverse-event field is rejected');
expectCode(value => { value.activeLines[0].dispensationStatus = 'dispensed'; }, 'UNKNOWN_FIELD', 'dispensation field is rejected');
expectCode(value => { value.activeLines[0].causality = 'forbidden'; }, 'UNKNOWN_FIELD', 'causality field is rejected');
const typedInvalid = expectCode(value => { delete value.technical.eventId; }, 'MISSING_REQUIRED', 'explicit event ID is required');
assert.throws(() => adapter.buildFollowupEvent(typedInvalid), error => error.name === 'FarmaciaExportV2FollowupActiveLinesAdapterError' && error.code === 'INVALID_FOLLOWUP_INPUT' && Array.isArray(error.details), 'build errors are typed with details');
for (const field of ['sourceEventId', 'visitId', 'patientId', 'occurredAt', 'recordedAt', 'eventStatus']) {
  expectCode(value => { delete value.technical[field]; }, 'MISSING_REQUIRED', `${field} is never generated`);
}
expectCode(value => { value.technical.demoFlag = 'si'; }, 'INVALID_TYPE', 'demoFlag must be boolean');
expectCode(value => { value.technical.occurredAt = 'today'; }, 'INVALID_ISO_DATE', 'occurredAt must be explicit ISO context');
expectCode(value => { value.technical.recordedAt = '2026-08-03T25:00:00Z'; }, 'INVALID_ISO_DATE', 'recordedAt rejects invalid ISO time');
expectCode(value => { value.visit.visitDate = null; }, 'INVALID_VISIT_DATE', 'visit date is required');
expectCode(value => { delete value.visit.visitDate; }, 'MISSING_REQUIRED', 'visit date is explicit');
expectCode(value => { value.visit.visitDate = '2026-02-30'; }, 'INVALID_VISIT_DATE', 'visit date must be a real ISO date-only value');
expectCode(value => { value.visit.visitDate = '2026-08-03T00:00:00Z'; }, 'INVALID_VISIT_DATE', 'visit date rejects timestamps');
expectCode(value => { value.visit.visitDate = '03/08/2026'; }, 'INVALID_VISIT_DATE', 'visit date rejects non-ISO formats');

expectCode(value => { delete value.activeLines; }, 'EMPTY_ACTIVE_LINES', 'missing activeLines is rejected');
expectCode(value => { value.activeLines = null; }, 'EMPTY_ACTIVE_LINES', 'null activeLines is rejected');
const emptyLines = expectCode(value => { value.activeLines = []; }, 'EMPTY_ACTIVE_LINES', 'zero active lines are rejected');
assert.throws(() => adapter.buildFollowupEvent(emptyLines), error => error.name === 'FarmaciaExportV2FollowupActiveLinesAdapterError' && error.code === 'INVALID_FOLLOWUP_INPUT' && error.details.some(detail => detail.code === 'EMPTY_ACTIVE_LINES'), 'zero active lines fail with EMPTY_ACTIVE_LINES');
assert.throws(() => adapter.buildFollowupProjection(emptyLines), error => error.name === 'FarmaciaExportV2FollowupActiveLinesAdapterError', 'empty projection never returns a valid empty result');

const twoLines = baseInput();
twoLines.activeLines = [
  line(),
  line({ rowKey: 'line-row-2', treatmentId: 'treatment-syn-2', lineId: 'line-syn-2', lineRole: 'additional', isPrimaryLine: false, drugName: null, activeIngredient: 'Activo sintético B' })
];
const twoProjection = adapter.buildFollowupProjection(twoLines);
assert.equal(twoProjection.rows.length, 2);
assert.deepEqual(Array.from(twoProjection.rows, row => row.line_id), ['line-syn-1', 'line-syn-2'], 'input order remains stable');
assert.deepEqual(Array.from(twoProjection.rows, row => row.row_index), [1, 2]);
assert.deepEqual(Array.from(twoProjection.rows, row => row.row_count), [2, 2]);
assert.equal(twoProjection.rows[1].is_primary_line, false, 'secondary false remains false');
assert.equal(twoProjection.rows[1].line_role, 'additional');
for (const field of ['event_id', 'visit_id', 'visit_date', 'identifier_value']) {
  assert.equal(core.stableStringify(twoProjection.rows[0][field]), core.stableStringify(twoProjection.rows[1][field]), `${field} is common across rows`);
}
assert.equal(core.validateRowSet(twoProjection.rows).valid, true);
assert.equal(core.stableStringify(core.parseTsvRows(twoProjection.tsv)), core.stableStringify(twoProjection.rows));

const unordered = baseInput();
unordered.activeLines = [
  line({ rowKey: 'line-row-z', lineId: 'line-syn-2', lineRole: 'additional', isPrimaryLine: false, drugName: null, activeIngredient: 'Activo sintético B' }),
  line({ rowKey: 'line-row-a', lineId: 'line-syn-1' })
];
const unorderedProjection = adapter.buildFollowupProjection(unordered);
assert.deepEqual(Array.from(unorderedProjection.rows, row => row.line_id), ['line-syn-2', 'line-syn-1'], 'explicit activeLines order is preserved');
assert.deepEqual(Array.from(unorderedProjection.rows, row => row.row_key ? row.rowKey : row.line_id), ['line-syn-2', 'line-syn-1'], 'rowKey never reorders the projection');
assert.deepEqual(Array.from(unorderedProjection.rows, row => row.row_index), [1, 2], 'row_index follows preserved order');

expectCode(value => { value.activeLines.push(line({ rowKey: 'line-row-2', lineId: 'line-syn-2', isPrimaryLine: true })); }, 'MULTIPLE_PRIMARY_LINES', 'two primary lines are rejected');
expectCode(value => { value.activeLines.push(line({ lineId: 'line-syn-2', isPrimaryLine: false })); }, 'DUPLICATE_ROW_KEY', 'rowKey is unique');
expectCode(value => { value.activeLines.push(line({ rowKey: 'line-row-2', isPrimaryLine: false })); }, 'DUPLICATE_LINE_ID', 'lineId is unique');
const zeroPrimary = baseInput();
zeroPrimary.activeLines = [
  line({ lineRole: 'additional', isPrimaryLine: false }),
  line({ rowKey: 'line-row-2', lineId: 'line-syn-2', lineRole: 'additional', isPrimaryLine: false, drugName: null, activeIngredient: 'Activo sintético B' })
];
assert.equal(adapter.validateFollowupInput(zeroPrimary).valid, true, 'zero primary lines remain valid');
const onePrimary = baseInput();
onePrimary.activeLines = [
  line({ lineRole: 'additional', isPrimaryLine: false }),
  line({ rowKey: 'line-row-2', lineId: 'line-syn-2', lineRole: 'principal', isPrimaryLine: true, drugName: null, activeIngredient: 'Activo sintético B' })
];
assert.equal(adapter.validateFollowupInput(onePrimary).valid, true, 'one primary line remains valid');
expectCode(value => { value.activeLines[0].isPrimaryLine = true; value.activeLines[0].lineRole = 'additional'; }, 'INVALID_PRIMARY_COHERENCE', 'isPrimaryLine=true requires role principal');
expectCode(value => { value.activeLines[0].lineRole = 'principal'; value.activeLines[0].isPrimaryLine = false; }, 'INVALID_PRIMARY_COHERENCE', 'role principal requires isPrimaryLine=true');
expectCode(value => { value.activeLines[0].lineRole = 'primary'; }, 'INVALID_LINE_ROLE', 'English primary is not in the closed published enum');
expectCode(value => { value.activeLines[0].lineRole = 'sospechoso_ea'; }, 'INVALID_LINE_ROLE', 'lineRole outside the closed enum is rejected');
for (const field of ['rowKey', 'treatmentId', 'lineId', 'lineRole', 'lineStatusAtEvent']) {
  expectCode(value => { delete value.activeLines[0][field]; }, 'MISSING_REQUIRED', `${field} is explicit`);
}
for (const field of ['rowKey', 'treatmentId', 'lineId', 'lineRole']) {
  expectCode(value => { value.activeLines[0][field] = ''; }, 'EMPTY_REQUIRED', `empty ${field} is rejected`);
}
expectCode(value => { value.activeLines[0].rowKey = '   '; }, 'EMPTY_REQUIRED', 'whitespace-only rowKey is rejected');
expectCode(value => { value.activeLines[0].drugName = null; value.activeLines[0].activeIngredient = null; }, 'LINE_NOT_IDENTIFIABLE', 'line needs drug or active ingredient identity');
expectCode(value => { value.activeLines[0].drugName = ''; value.activeLines[0].activeIngredient = '  '; }, 'LINE_NOT_IDENTIFIABLE', 'empty strings do not identify a line');
expectCode(value => { value.activeLines[0] = line({ drugName: null, activeIngredient: null, doseText: '100 mg', selectedDrugId: 'CAT-SYN' }); }, 'LINE_NOT_IDENTIFIABLE', 'dose and metadata alone do not identify a line');
expectCode(value => { value.activeLines[0].lineStatusAtEvent = 'inactive'; }, 'FOLLOWUP_LINE_STATUS', 'active line status is explicit');
expectCode(value => { value.activeLines[0].lineStatusAtEvent = null; }, 'FOLLOWUP_LINE_STATUS', 'null line status is rejected');
expectCode(value => { value.activeLines[0].activeAtEvent = false; }, 'FOLLOWUP_LINE_MUST_BE_ACTIVE', 'activeAtEvent=true is explicit');

const emptyOptionals = baseInput();
emptyOptionals.activeLines[0].presentation = '';
emptyOptionals.activeLines[0].doseText = '   ';
emptyOptionals.activeLines[0].route = ' ';
const emptyOptionalsProjection = adapter.buildFollowupProjection(emptyOptionals);
assert.equal(emptyOptionalsProjection.rows[0].line_presentation, null, 'empty optional string builds as null');
assert.equal(emptyOptionalsProjection.rows[0].line_dose_text, null, 'whitespace optional string builds as null');
assert.equal(emptyOptionalsProjection.rows[0].line_route, null, 'whitespace-only optional string builds as null');
const whitespaceIdentity = baseInput();
whitespaceIdentity.activeLines[0].drugName = '   ';
whitespaceIdentity.activeLines[0].activeIngredient = 'Activo sintético A';
assert.equal(adapter.validateFollowupInput(whitespaceIdentity).valid, true, 'whitespace-only drugName with ingredient remains valid');
assert.equal(adapter.buildFollowupProjection(whitespaceIdentity).rows[0].line_drug_name, null, 'whitespace-only drugName builds as null');
expectCode(value => { value.activeLines[0].drugName = '—'; }, 'PLACEHOLDER_NOT_ALLOWED', 'visible dash placeholder is rejected in line identity');
expectCode(value => { value.context.serviceLabel = 'No informado'; }, 'PLACEHOLDER_NOT_ALLOWED', 'No informado remains rejected in non-tristate context');
const zeroContext = baseInput();
zeroContext.technical.demoFlag = false;
zeroContext.context.serviceLabel = '';
zeroContext.context.professionalDisplay = '   ';
const zeroContextEvent = adapter.buildFollowupEvent(zeroContext);
assert.equal(zeroContextEvent.demo_flag, false, 'false is preserved in the event');
assert.equal(zeroContextEvent.service_label, null, 'empty optional context string builds as null');
assert.equal(zeroContextEvent.professional_display, null, 'whitespace optional context string builds as null');
assert.equal(adapter.buildFollowupProjection(zeroContext).rows[0].demo_flag, false, 'false survives the row projection');

const notNull = baseInput();
notNull.activeLines[0].isPrimaryLine = false;
notNull.activeLines[0].lineRole = 'additional';
const notNullRow = adapter.buildFollowupProjection(notNull).rows[0];
assert.equal(notNullRow.is_primary_line, false, 'false stays false in the row');
assert.equal(notNullRow.line_role, 'additional');
assert.ok(adapter.buildFollowupProjection(notNull).tsv.includes('FALSE'), 'false serializes as FALSE in TSV');
assert.ok(!adapter.buildFollowupProjection(notNull).tsv.includes('line_presentation\tTRUE') && notNullRow.line_presentation === null, 'absent optional stays null in TSV');
assert.equal(core.parseTsvRows(adapter.buildFollowupProjection(notNull).tsv)[0].is_primary_line, false, 'TSV round-trip preserves false');
expectCode(value => { value.activeLines[0].presentation = 0; }, 'INVALID_TYPE', 'numeric 0 is not coerced into an optional string field');

const mutation = baseInput();
const activeLinesBefore = JSON.stringify(mutation.activeLines);
const inputBefore = JSON.stringify(mutation);
adapter.buildFollowupProjection(mutation);
assert.equal(JSON.stringify(mutation.activeLines), activeLinesBefore, 'builder does not mutate activeLines');
assert.equal(JSON.stringify(mutation), inputBefore, 'builder does not mutate input');

const firstVisitCheckerSource = fs.readFileSync(path.join(ROOT, 'tools/farmacia_export_v2_first_visit_adapter_check.mjs'), 'utf8');
const firstVisitBrowserSource = fs.readFileSync(path.join(ROOT, 'tools/farmacia_export_v2_first_visit_browser_check.mjs'), 'utf8');
const followupContractDoc = fs.readFileSync(path.join(ROOT, 'docs/contracts/FARMACIA_EXPORT_V2_FOLLOWUP_ACTIVE_LINES_ADAPTER_CONTRACT.md'), 'utf8');
const firstVisitContractDoc = fs.readFileSync(path.join(ROOT, 'docs/contracts/FARMACIA_EXPORT_V2_FIRST_VISIT_ADAPTER_CONTRACT.md'), 'utf8');
assert.ok(firstVisitCheckerSource.includes("lineRole: 'principal'"), 'first visit published checker uses the principal vocabulary');
assert.ok(firstVisitBrowserSource.includes("lineRole: 'principal'"), 'first visit published browser QA uses the principal vocabulary');
assert.match(followupContractDoc, /lineRole.*\bprincipal\b/, 'followup contract documents principal as canonical primary value');
assert.match(followupContractDoc, /primary[^a-z]/, 'followup contract rejects the English primary vocabulary');
assert.match(firstVisitContractDoc, /principal/, 'first visit contract documents the principal vocabulary');

console.log('PASS: Farmacia Export v2 Followup active-lines adapter contract.');
