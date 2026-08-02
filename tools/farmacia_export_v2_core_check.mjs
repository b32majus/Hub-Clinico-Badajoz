import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readText = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const readJson = (relative) => JSON.parse(readText(relative));
const coreSource = readText('scripts/farmacia_export_v2_core.js');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(coreSource, sandbox, { filename: 'farmacia_export_v2_core.js' });
const core = sandbox.window.FarmaciaExportV2Core;

const expectedApi = [
  'EVENT_SCHEMA_VERSION', 'ROW_SCHEMA_VERSION', 'ROW_COLUMNS', 'FIELD_DEFINITIONS',
  'createEventEnvelope', 'createRow', 'projectEventRows', 'validateEvent',
  'validateRow', 'validateRowSet', 'buildRowId', 'stableStringify',
  'serializeRowToTsv', 'serializeRowsToTsv', 'parseTsvRow', 'parseTsvRows'
].sort();
assert.deepEqual(Object.keys(core).sort(), expectedApi, 'public API must contain exactly the 16 contracted names');
assert.equal(core.EVENT_SCHEMA_VERSION, '2.0.0-draft.1');
assert.equal(core.ROW_SCHEMA_VERSION, '2.0.0-draft.1');

const forbiddenCapabilities = [
  [/\bdocument\b/, 'DOM document'], [/\bnavigator\b/, 'navigator'],
  [/\blocalStorage\b|\bsessionStorage\b/, 'browser storage'],
  [/\bfetch\s*\(|\bXMLHttpRequest\b/, 'network'],
  [/\bDate\.now\s*\(|\bnew\s+Date\s*\(/, 'clock'],
  [/\bMath\.random\s*\(|\bcrypto\b/, 'randomness']
];
for (const [pattern, label] of forbiddenCapabilities) assert.doesNotMatch(coreSource, pattern, `core must not access ${label}`);

const rowSchema = readJson('schemas/farmacia_export_row_v2.schema.json');
const eventSchema = readJson('schemas/farmacia_export_event_v2.schema.json');
const validCalendarDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  if (year < 1 || month < 1 || month > 12) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= days[month - 1];
};
const validSchemaFormat = (value, format) => {
  if (format === 'date') return validCalendarDate(value);
  if (format === 'date-time') {
    const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:0\d|1[0-3]):[0-5]\d|[+-]14:00)$/.exec(value);
    return Boolean(match && validCalendarDate(match[1]));
  }
  return true;
};
const schemaErrors = (value, schema, schemaRoot = schema) => {
  if (schema.$ref) return schemaErrors(value, schemaRoot.$defs[schema.$ref.split('/').at(-1)], schemaRoot);
  const errors = [];
  const typeOf = (item) => item === null ? 'null' : Array.isArray(item) ? 'array' : Number.isInteger(item) ? 'integer' : typeof item;
  if (schema.oneOf) {
    if (!schema.oneOf.some((candidate) => schemaErrors(value, candidate, schemaRoot).length === 0)) errors.push('oneOf');
    return errors;
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.includes(typeOf(value))) return [`type:${types.join('|')}`];
  }
  if (schema.const !== undefined && value !== schema.const) errors.push('const');
  if (schema.enum && !schema.enum.includes(value)) errors.push('enum');
  if (typeof value === 'string' && schema.minLength && value.length < schema.minLength) errors.push('minLength');
  if (typeof value === 'string' && schema.pattern && !(new RegExp(schema.pattern)).test(value)) errors.push('pattern');
  if (typeof value === 'string' && schema.format && !validSchemaFormat(value, schema.format)) errors.push('format');
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) errors.push('minimum');
  if (typeOf(value) === 'object') {
    for (const required of schema.required || []) if (!Object.hasOwn(value, required)) errors.push(`required:${required}`);
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!Object.hasOwn(schema.properties, key)) errors.push(`additional:${key}`);
    for (const [key, child] of Object.entries(value)) if (schema.properties?.[key]) errors.push(...schemaErrors(child, schema.properties[key], schemaRoot).map((error) => `${key}:${error}`));
  }
  for (const child of schema.allOf || []) errors.push(...schemaErrors(value, child, schemaRoot));
  return errors;
};
assert.equal(rowSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(eventSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(rowSchema.additionalProperties, false);
assert.equal(eventSchema.additionalProperties, false);
assert.equal(core.ROW_COLUMNS.length, 152, 'candidate must have 152 columns');
assert.equal(new Set(core.ROW_COLUMNS).size, 152, 'candidate columns must be unique');
assert.deepEqual([...core.ROW_COLUMNS], rowSchema['x-column-order'], 'x-column-order parity');
assert.deepEqual(Object.keys(rowSchema.properties), [...core.ROW_COLUMNS], 'schema property order parity');
assert.deepEqual([...core.FIELD_DEFINITIONS].map((item) => item.name), [...core.ROW_COLUMNS], 'FIELD_DEFINITIONS parity');

const dereference = (property) => property.$ref ? rowSchema.$defs[property.$ref.split('/').at(-1)] : property;
for (const definition of core.FIELD_DEFINITIONS) {
  const schema = dereference(rowSchema.properties[definition.name]);
  const types = schema.type ? (Array.isArray(schema.type) ? schema.type : [schema.type]) : schema.oneOf.map((item) => item.type);
  const expectedType = definition.type === 'json' ? ['array', 'object'] : [definition.type];
  for (const type of expectedType) assert.ok(types.includes(type), `${definition.name} schema type parity`);
  assert.equal(types.includes('null'), definition.nullable, `${definition.name} nullability parity`);
  if (definition.enum) assert.deepEqual(schema.enum.filter((value) => value !== null), [...definition.enum], `${definition.name} enum parity`);
}
const fieldDefinition = (name) => [...core.FIELD_DEFINITIONS].find((item) => item.name === name);
assert.deepEqual([...fieldDefinition('tb_status').enum], ['negative', 'positive_treated', 'pending', 'not_recorded']);
for (const field of ['hbv_status', 'hcv_status', 'hiv_status']) assert.deepEqual([...fieldDefinition(field).enum], ['negative', 'positive', 'pending', 'not_recorded']);
assert.deepEqual([...fieldDefinition('vaccination_status').enum], ['yes', 'no', 'pending', 'not_recorded']);
assert.equal(fieldDefinition('preventive_medicine_status').enum, null, 'preventive medicine status remains unconstrained');

const requiredRow = ['bridge_status', 'event_schema_version', 'row_schema_version', 'event_id', 'source_event_id', 'row_id', 'row_role', 'row_index', 'row_count', 'event_type', 'event_status', 'occurred_at', 'recorded_at', 'demo_flag', 'patient_id'];
const requiredEvent = ['event_schema_version', 'event_id', 'source_event_id', 'event_type', 'event_status', 'occurred_at', 'recorded_at', 'demo_flag', 'patient_id'];
assert.deepEqual(rowSchema.required, requiredRow, 'required row fields');
assert.deepEqual(eventSchema.required, requiredEvent, 'required event fields');
for (const field of requiredEvent) assert.ok(eventSchema.properties[field], `event schema property ${field}`);
for (const schema of [rowSchema, eventSchema]) {
  const serializedEnums = JSON.stringify(schema);
  assert.doesNotMatch(serializedEnums, /Pendiente de completar por Farmacia/, 'visual placeholder cannot be canonical');
  for (const value of Object.values(schema.$defs || {}).flatMap((item) => item.enum || [])) {
    assert.notEqual(value, '—', 'visual dash cannot be an enum value');
  }
}

const fixtures = [
  'data/demo/farmacia/export_v2/validation_event_v2.json',
  'data/demo/farmacia/export_v2/first_visit_event_v2.json',
  'data/demo/farmacia/export_v2/followup_event_v2.json'
].map(readJson);
const projected = fixtures.map((fixture) => {
  assert.equal(fixture.fixture_version, '1.0.0');
  assert.equal(core.validateEvent(fixture.event).valid, true, JSON.stringify(core.validateEvent(fixture.event).errors));
  assert.deepEqual(schemaErrors(fixture.event, eventSchema), [], 'fixture event must satisfy the static event schema');
  const rows = core.projectEventRows(fixture.event, fixture.rowPayloads);
  assert.equal(core.validateRowSet(rows).valid, true, JSON.stringify(core.validateRowSet(rows).errors));
  for (const row of rows) assert.deepEqual(schemaErrors(row, rowSchema), [], 'projected row must satisfy the static row schema');
  return rows;
});
const badDateEvent = { ...fixtures[0].event, request_date: 'not-an-iso-date' };
assert.ok(schemaErrors(badDateEvent, eventSchema).some((error) => error.includes('request_date:oneOf')), 'event schema enforces ISO dates');
assert.equal(rowSchema.$defs.date.format, 'date');
assert.equal(rowSchema.$defs.dateTime.format, 'date-time');
assert.equal(eventSchema.$defs.date.format, 'date');
assert.equal(eventSchema.$defs.dateTime.format, 'date-time');
assert.deepEqual(fixtures.map((item) => item.event.event_type), ['pharmacy_validation', 'pharmacy_first_visit', 'pharmacy_followup']);
assert.equal(projected[0].length, 1);
assert.equal(projected[1].length, 1);
assert.equal(projected[2].length, 2);
assert.notEqual(projected[2][0].row_id, projected[2][1].row_id, 'two lines need stable distinct row IDs');
assert.equal(projected[2][0].event_id, projected[2][1].event_id, 'follow-up rows share event identity');
assert.equal(projected[2][0].visit_id, projected[2][1].visit_id, 'follow-up rows share visit identity');
assert.notEqual(projected[2][0].line_id, projected[2][1].line_id, 'follow-up line identities differ');
assert.equal(projected[2][0].active_at_event, true);
assert.equal(projected[2][0].dispensation_status, 'dispensed');
assert.equal(projected[2][0].specific_review_status, 'not_performed');
assert.equal(projected[2][1].active_at_event, true);
assert.equal(projected[2][1].dispensation_status, 'not_dispensed');
assert.equal(projected[2][1].specific_review_status, 'performed');
assert.equal(projected[2][1].therapeutic_movement_type, 'schedule_change');
assert.equal(projected[2][0].adverse_event_id, 'adverse-event-demo-followup-001');
assert.equal(projected[2][1].adverse_event_id, projected[2][0].adverse_event_id, 'adverse_event_id is shared event context');
assert.equal(projected.flat().every((row) => row.bridge_status === 'PENDIENTE'), true, 'projection always starts at PENDIENTE');
assert.equal(core.stableStringify(core.projectEventRows(fixtures[2].event, fixtures[2].rowPayloads)), core.stableStringify(projected[2]), 'projection is deterministic');

assert.equal(projected[0][0].tb_status, 'pending', 'TB pending is preserved');
assert.equal(projected[0][0].vaccination_status, 'pending', 'vaccination pending is preserved');
assert.equal(projected[0][0].preventive_medicine_status, 'synthetic_review_scheduled', 'preventive medicine remains an unconstrained string');
const tbTreatedEvent = { ...fixtures[0].event, event_id: 'evt-tb-treated', source_event_id: 'src-tb-treated', tb_status: 'positive_treated' };
const tbTreatedRow = core.projectEventRows(tbTreatedEvent, [{ rowKey: 'validation-main' }])[0];
assert.equal(core.parseTsvRow(core.serializeRowToTsv(tbTreatedRow)).tb_status, 'positive_treated', 'TB positive_treated survives TSV');
const invalidTbEvent = { ...fixtures[0].event, event_id: 'evt-tb-invalid', source_event_id: 'src-tb-invalid', tb_status: 'yes' };
assert.equal(core.validateEvent(invalidTbEvent).valid, false, 'generic yes is invalid for TB');
assert.ok(core.validateEvent(invalidTbEvent).errors.some((error) => error.code === 'INVALID_ENUM' && error.field === 'tb_status'));
assert.ok(schemaErrors(invalidTbEvent, eventSchema).length > 0, 'event schema rejects generic TB yes');
for (const field of ['hbv_status', 'hcv_status', 'hiv_status']) {
  for (const status of ['positive', 'negative', 'pending']) {
    const event = { ...fixtures[0].event, event_id: `evt-${field}-${status}`, source_event_id: `src-${field}-${status}`, [field]: status };
    assert.equal(core.validateEvent(event).valid, true, `${field} ${status} is valid`);
    assert.deepEqual(schemaErrors(event, eventSchema), [], `${field} ${status} satisfies schema`);
    const row = core.projectEventRows(event, [{ rowKey: 'validation-main' }])[0];
    assert.equal(core.parseTsvRow(core.serializeRowToTsv(row))[field], status, `${field} ${status} is preserved`);
  }
}

const allRows = projected.flat();
for (const rows of projected) {
  const tsv = core.serializeRowsToTsv(rows);
  assert.equal(tsv.split('\n').length, rows.length, 'one physical line per row');
  assert.deepEqual(JSON.parse(JSON.stringify(core.parseTsvRows(tsv))), JSON.parse(JSON.stringify(rows)), 'typed TSV row-set roundtrip');
}
const validationRoundtrip = core.parseTsvRow(core.serializeRowToTsv(projected[0][0]));
const validationCells = core.serializeRowToTsv(projected[0][0]).split('\t');
assert.equal(validationCells[core.ROW_COLUMNS.indexOf('bridge_processed_at')], '', 'null is an empty TSV cell');
assert.equal(validationCells[core.ROW_COLUMNS.indexOf('request_source_observations')], '""', 'empty string remains distinct from null');
assert.equal(validationCells[core.ROW_COLUMNS.indexOf('demo_flag')], 'TRUE', 'TSV boolean uses Excel-safe TRUE');
assert.equal(validationCells[core.ROW_COLUMNS.indexOf('hemogram_verified')], 'FALSE', 'false is preserved as Excel-safe FALSE');
assert.equal(validationRoundtrip.requested_justification, fixtures[0].event.requested_justification, 'tabs/newlines/backslashes/quotes/Unicode survive');
assert.equal(validationRoundtrip.request_source_observations, '');
assert.equal(validationRoundtrip.clinical_observations_json.score_zero, 0);
assert.equal(validationRoundtrip.clinical_observations_json.confirmed, false);
assert.equal(validationRoundtrip.clinical_observations_json.empty_text, '');
assert.equal(validationRoundtrip.clinical_observations_json.absent, null);
assert.equal(validationRoundtrip.related_treatments_json.length, 2);
assert.equal(projected[2][0].adverse_event_suspects_json.length, 2);
assert.equal(projected[2][0].causality_assessments_json.length, 2);
assert.equal(projected[2][1].adherence_answers_json[0].answer, false);
assert.equal(projected[2][1].adherence_answers_json[1].answer, 0);
assert.equal(core.stableStringify({ z: 0, a: { y: false, x: null } }), '{"a":{"x":null,"y":false},"z":0}');

const transportStrings = {
  requested_drug_name: '=1+1',
  requested_active_ingredient: '+SUM(A1:A2)',
  requested_presentation: '-2+3',
  requested_dose_text: '@command',
  requested_route: 'tab\tline\nslash\\quote" Unicode Ω Cáceres',
  requested_schedule_other_text: '',
  requested_weight_text: null
};
const transportRow = core.createRow({ ...projected[0][0], ...transportStrings });
const transportTsv = core.serializeRowToTsv(transportRow);
assert.equal(transportTsv.split('\n').length, 1, 'transport row has one physical line');
const transportCells = transportTsv.split('\t');
assert.equal(transportCells.length, 152, 'escaped text introduces no physical TSV delimiters');
for (const [field, value] of Object.entries(transportStrings)) {
  const cell = transportCells[core.ROW_COLUMNS.indexOf(field)];
  if (typeof value === 'string') {
    assert.equal(cell.startsWith('"'), true, `${field} string cell begins with a literal double quote`);
    assert.doesNotMatch(cell, /^[=+\-@]/, `${field} is formula-neutral under verbatim cell transport`);
    assert.doesNotMatch(cell, /[\t\r\n]/, `${field} has no physical control delimiter`);
  }
}
assert.equal(transportCells[core.ROW_COLUMNS.indexOf('requested_schedule_other_text')], '""');
assert.equal(transportCells[core.ROW_COLUMNS.indexOf('requested_weight_text')], '');
assert.notEqual(transportCells[core.ROW_COLUMNS.indexOf('requested_schedule_other_text')], transportCells[core.ROW_COLUMNS.indexOf('requested_weight_text')], 'empty string and null cells remain distinct');
assert.deepEqual(JSON.parse(JSON.stringify(core.parseTsvRow(transportTsv))), JSON.parse(JSON.stringify(transportRow)), 'formula-neutral transport remains reversible');

const sparseRows = projected[0].map((row) => {
  const sparse = {};
  for (const field of requiredRow) sparse[field] = row[field];
  return sparse;
});
sparseRows.push({ ...sparseRows[0], row_id: 'sparse-validation-row-2', row_index: 2, row_count: 2, service_code: null });
sparseRows[0].row_count = 2;
assert.equal(core.validateRow(sparseRows[0]).valid, true, 'sparse schema-valid row validates');
let sparseResult;
assert.doesNotThrow(() => { sparseResult = core.validateRowSet(sparseRows); }, 'sparse row set validator never throws');
assert.deepEqual(JSON.parse(JSON.stringify(sparseResult)), { valid: true, errors: [] }, 'omitted and explicit-null optional common values share absence semantics');
for (const row of sparseRows) assert.deepEqual(schemaErrors(row, rowSchema), [], 'sparse row satisfies static schema');

const invalidDates = [
  '2026-13-01', '2026-00-10', '2026-04-31', '2025-02-29', '1900-02-29',
  '2026-01-01T24:00:00Z', '2026-01-01T23:60:00Z', '2026-01-01T23:59:60Z',
  '2026-01-01T12:00:00+14:01', '2026-01-01T12:00:00+15:00', '2026-01-01T12:00:00+01:60'
];
for (const value of invalidDates) {
  const runtime = core.validateEvent({ ...fixtures[0].event, occurred_at: value });
  assert.equal(runtime.valid, false, `${value} rejected by runtime`);
  assert.ok(runtime.errors.some((error) => error.code === 'INVALID_ISO_DATE'), `${value} has structured date error`);
  assert.ok(schemaErrors({ ...fixtures[0].event, occurred_at: value }, eventSchema).length > 0, `${value} rejected by schema constraints`);
}
for (const value of ['2024-02-29', '2000-02-29T23:59:59.123456789Z', '2024-02-29T00:00:00+14:00', '2024-02-29T00:00:00-13:59']) {
  assert.equal(core.validateEvent({ ...fixtures[0].event, occurred_at: value }).valid, true, `${value} accepted by runtime`);
  assert.deepEqual(schemaErrors({ ...fixtures[0].event, occurred_at: value }, eventSchema), [], `${value} accepted by schema constraints`);
}

const cyclicRow = { ...projected[0][0] };
cyclicRow.clinical_observations_json = {};
cyclicRow.clinical_observations_json.self = cyclicRow.clinical_observations_json;
let cyclicValidation;
assert.doesNotThrow(() => { cyclicValidation = core.validateRow(cyclicRow); }, 'row validator returns structured errors for non-JSON values');
assert.equal(cyclicValidation.valid, false);
assert.ok(cyclicValidation.errors.some((error) => error.code === 'CYCLIC_VALUE'));
let cyclicSetValidation;
assert.doesNotThrow(() => { cyclicSetValidation = core.validateRowSet([cyclicRow]); }, 'row-set validator always returns a structured result');
assert.equal(cyclicSetValidation.valid, false);

const expectTypedError = (operation, code) => assert.throws(operation, (error) => error.name === 'FarmaciaExportV2CoreError' && error.code === code);
expectTypedError(() => core.buildRowId('source', 'followup_line', ''), 'MISSING_ROW_ID_PART');
expectTypedError(() => core.createEventEnvelope({}), 'INVALID_EVENT');
expectTypedError(() => core.createRow({ extra: 'forbidden' }), 'INVALID_ROW');
assert.ok(schemaErrors({ extra: 'forbidden' }, rowSchema).some((error) => error === 'additional:extra'), 'row schema rejects extra columns');
expectTypedError(() => core.projectEventRows(fixtures[2].event, [{ rowKey: 'duplicate', line_id: 'line-a' }, { rowKey: 'duplicate', line_id: 'line-b' }]), 'DUPLICATE_ROW_KEY');
expectTypedError(() => core.projectEventRows(fixtures[2].event, [{ rowKey: 'explicit-but-no-line' }]), 'MISSING_LINE_ID');
expectTypedError(() => core.projectEventRows(fixtures[0].event, [{ rowKey: 'key', row_id: 'caller-row-id' }]), 'COMMON_FIELD_OVERRIDE');
expectTypedError(() => core.projectEventRows(fixtures[0].event, [{ rowKey: 'key', bridge_status: 'PROCESADA' }]), 'COMMON_FIELD_OVERRIDE');
for (const field of ['bridge_processed_at', 'bridge_error_code', 'bridge_error_detail']) {
  expectTypedError(() => core.projectEventRows(fixtures[0].event, [{ rowKey: 'key', [field]: 'forbidden' }]), 'COMMON_FIELD_OVERRIDE');
}
expectTypedError(() => core.projectEventRows(fixtures[2].event, [{ ...fixtures[2].rowPayloads[0], adverse_event_id: 'payload-override' }]), 'COMMON_FIELD_OVERRIDE');
const processedRow = core.createRow({ ...projected[0][0], bridge_status: 'PROCESADA', bridge_processed_at: '2026-08-02T12:00:00Z' });
const errorRow = core.createRow({ ...projected[0][0], bridge_status: 'ERROR', bridge_error_code: 'SYNTHETIC_ERROR', bridge_error_detail: 'Synthetic bridge error' });
assert.equal(core.validateRow(processedRow).valid, true, 'createRow accepts subsequent PROCESADA state');
assert.equal(core.validateRow(errorRow).valid, true, 'createRow accepts subsequent ERROR state');
assert.equal(core.parseTsvRow(core.serializeRowToTsv(processedRow)).bridge_status, 'PROCESADA');
assert.equal(core.parseTsvRow(core.serializeRowToTsv(errorRow)).bridge_status, 'ERROR');
const duplicateRows = JSON.parse(JSON.stringify(projected[2]));
duplicateRows[1].row_id = duplicateRows[0].row_id;
assert.ok(core.validateRowSet(duplicateRows).errors.some((error) => error.code === 'DUPLICATE_ROW_ID'));
const badCardinality = JSON.parse(JSON.stringify(projected[2]));
badCardinality[1].row_index = 1;
assert.ok(core.validateRowSet(badCardinality).errors.some((error) => error.code === 'ROW_INDEX_SEQUENCE'));
const duplicateLines = JSON.parse(JSON.stringify(projected[2]));
duplicateLines[1].line_id = duplicateLines[0].line_id;
assert.ok(core.validateRowSet(duplicateLines).errors.some((error) => error.code === 'DUPLICATE_LINE_ID'));
const inconsistentIdentity = JSON.parse(JSON.stringify(projected[2]));
inconsistentIdentity[1].patient_id = 'different-synthetic-patient';
assert.ok(core.validateRowSet(inconsistentIdentity).errors.some((error) => error.code === 'COMMON_IDENTITY_MISMATCH'));
const inconsistentAdverseEvent = JSON.parse(JSON.stringify(projected[2]));
inconsistentAdverseEvent[1].adverse_event_id = 'different-adverse-event';
assert.ok(core.validateRowSet(inconsistentAdverseEvent).errors.some((error) => error.code === 'COMMON_IDENTITY_MISMATCH' && error.field === 'adverse_event_id'));

const noInferenceEvent = { ...fixtures[0].event, event_id: 'evt-no-inference', source_event_id: 'src-no-inference', requested_drug_name: 'Only requested', validation_result: 'validated' };
delete noInferenceEvent.validated_drug_name;
delete noInferenceEvent.validated_treatment_id;
delete noInferenceEvent.validated_line_id;
const noInferenceRow = core.projectEventRows(noInferenceEvent, [{ rowKey: 'explicit-key' }])[0];
assert.equal(noInferenceRow.validated_drug_name, null, 'requested drug must not populate validated drug');
assert.equal(noInferenceRow.validated_treatment_id, null, 'drug name must not create treatment identity');
assert.equal(noInferenceRow.validated_line_id, null, 'drug name must not create line identity');
assert.equal(noInferenceRow.line_id, null, 'drug name must not create projected line identity');
assert.equal(noInferenceRow.demo_flag, true, 'explicit false/true only; no generated demo flag');
assert.equal(allRows.every((row) => row.event_id && row.source_event_id && row.row_id), true);

console.log('farmacia_export_v2_core_check: PASS');
console.log(`API=${Object.keys(core).length} COLUMNS=${core.ROW_COLUMNS.length} FIXTURES=${fixtures.length} ROWS=${allRows.length}`);
