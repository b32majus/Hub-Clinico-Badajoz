#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await import(path.join(ROOT, 'scripts/farmacia_bridge_v2_patient_selectors.js'));
await import(path.join(ROOT, 'scripts/farmacia_application_data_port.js'));
await import(path.join(ROOT, 'scripts/farmacia_raw_excel_data_source.js'));

const dataPort = globalThis.FarmaciaApplicationDataPort;
const dataSource = globalThis.FarmaciaRawExcelDataSource;
let passed = 0;

function test(name, callback) {
    callback();
    passed += 1;
    console.log(`PASS ${name}`);
}

function canonicalRow(patientId, sourceEventId, eventType, overrides = {}) {
    return Object.assign({
        row_id: `${sourceEventId}-row`, row_index: 1, row_count: 1,
        patient_id: patientId, source_event_id: sourceEventId, event_id: `${sourceEventId}-event`, event_type: eventType,
        occurred_at: '2026-08-01T10:00:00Z', recorded_at: '2026-08-01T10:05:00Z',
        identifier_system: 'urn:cip:synthetic', identifier_value: patientId === 'patient-a' ? 'CIP-A' : 'CIP-B',
        service_code: 'SYN', service_label: 'Servicio sintético', pathology_code: 'SYN', pathology_label: 'Patología sintética'
    }, overrides);
}

function event(patientId, sourceEventId, eventType, overrides) {
    const row = canonicalRow(patientId, sourceEventId, eventType, overrides);
    return {
        source_event_id: sourceEventId, event_id: row.event_id, event_type: eventType, patient_id: patientId,
        source_sheet: '01_DERMA', source_table: 'tblBridgeDermaInput', physical_row_numbers: [2],
        rows: [{ source_sheet: '01_DERMA', source_table: 'tblBridgeDermaInput', physical_row_number: 2, canonical_row: row }]
    };
}

function fixture() {
    const events = [
        event('patient-a', 'validation-a', 'pharmacy_validation', {
            request_id: 'request-a', requested_dose_text: '', validation_id: 'validation-a', validation_result: 'validated',
            validated_dose_text: null
        }),
        event('patient-a', 'visit-a', 'pharmacy_followup', {
            line_id: 'line-a', treatment_id: 'treatment-a', active_at_event: false, line_dose_text: 0,
            proms_json: { score: 0 }, adherence_collection_status: 'yes', adherence_result: '',
            adherence_answers_json: { answer: false }, adverse_event_status: null,
            adverse_event_description: '', causality_assessments_json: { assessed: false }
        }),
        event('patient-b', 'validation-b', 'pharmacy_validation', {})
    ];
    return {
        read_model_version: '1.0.0',
        metadata: { format: 'farmacia_bridge_v2_raw', file_name: 'synthetic.xlsx', imported_at: '2026-08-06T00:00:00Z', row_count: 3, event_count: 3, patient_count: 2 },
        patients: {
            'patient-a': { patient_id: 'patient-a', identifiers: [{ identifier_system: 'urn:cip:synthetic', identifier_value: 'CIP-A' }] },
            'patient-b': { patient_id: 'patient-b', identifiers: [{ identifier_system: 'urn:cip:synthetic', identifier_value: 'CIP-B' }] }
        },
        events,
        indexes: {
            by_patient_id: { 'patient-a': ['validation-a', 'visit-a'], 'patient-b': ['validation-b'] },
            by_identifier: { 'urn:cip:synthetic': { 'CIP-A': { patient_id: 'patient-a' }, 'CIP-B': { patient_id: 'patient-b' } } }
        },
        warnings: [], excluded_events: [], source_errors: []
    };
}

const model = fixture();
const baseline = JSON.stringify(model);
const source = dataSource.create(model);

test('versioned contract exposes every required operation', () => {
    assert.equal(source.port_version, dataPort.PORT_VERSION);
    dataPort.METHODS.forEach(method => assert.equal(typeof source[method], 'function'));
});
test('lists and resolves explicit patient identities', () => {
    assert.deepEqual(source.listPatients().map(item => item.patient_id), ['patient-a', 'patient-b']);
    assert.equal(source.findByIdentifier('urn:cip:synthetic', 'CIP-A').patient_id, 'patient-a');
    assert.equal(source.findByPatientId('patient-b').patient_id, 'patient-b');
});
test('patient projection excludes source-container metadata', () => {
    const projection = source.getPatientProjection('patient-a');
    assert.equal(projection.patient_id, 'patient-a');
    assert.equal(Object.hasOwn(projection, 'workbook'), false);
    assert.equal(Object.hasOwn(projection, 'timeline'), false);
});
test('events and latest request-validation delegate without inference', () => {
    assert.equal(source.getPatientEvents('patient-a').length, 2);
    const latest = source.getLatestRequestValidation('patient-a');
    assert.equal(latest.latest_request.requested_dose_text, '');
    assert.equal(latest.latest_validation.validated_dose_text, null);
});
test('visits and explicit lines remain separate', () => {
    const result = source.getVisitsAndLines('patient-a');
    assert.equal(result.visits.length, 1);
    assert.equal(result.lines[0].line_id, 'line-a');
    assert.equal(result.lines[0].snapshot.active_at_event, false);
    assert.equal(result.lines[0].snapshot.line_dose_text, 0);
});
test('PROMs, adherence, adverse events and causality preserve explicit values', () => {
    assert.equal(source.getProms('patient-a')[0].values.proms_json.score, 0);
    assert.equal(source.getAdherence('patient-a')[0].values.adherence_result, '');
    const safety = source.getAdverseEventsAndCausality('patient-a');
    assert.equal(safety.adverse_events[0].values.adverse_event_status, null);
    assert.equal(safety.adverse_events[0].values.adverse_event_description, '');
    assert.equal(safety.causality_assessments[0].values.causality_assessments_json.assessed, false);
});
test('population projection is in-memory and detached', () => {
    const population = source.getPopulationProjection();
    assert.equal(population.length, 2);
    population[0].patient_id = 'changed';
    assert.equal(source.findByPatientId('patient-a').patient_id, 'patient-a');
});
test('provenance is retained per current patient', () => {
    const provenance = source.getInternalProvenance('patient-a');
    assert.equal(provenance.length, 2);
    assert.equal(provenance[0].rows[0].physical_row_number, 2);
});
test('reader and current selectors are delegated to rather than reimplemented', () => {
    let calls = 0;
    const reader = { readWorkbook(workbook) { calls += 1; assert.equal(workbook.marker, true); return fixture(); } };
    const delegated = dataSource.readWorkbook({ marker: true }, { reader, selectors: globalThis.FarmaciaBridgeV2PatientSelectors, dataPort });
    assert.equal(calls, 1);
    assert.equal(delegated.listPatients().length, 2);
    const sourceText = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_raw_excel_data_source.js'), 'utf8');
    assert.match(sourceText, /FarmaciaBridgeV2PatientSelectors/);
    assert.match(sourceText, /FarmaciaBridgeV2Reader/);
    assert.doesNotMatch(sourceText, /ROW_COLUMNS|parseTsvRow|normalizedIdentifierKey/);
});
test('contract stays backend-agnostic and source remains runtime-only', () => {
    const contractText = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_application_data_port.js'), 'utf8');
    assert.doesNotMatch(contractText, /bridge|excel|postgres/i);
    assert.equal(JSON.stringify(model), baseline);
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'scripts/farmacia_raw_excel_data_source.js'), 'utf8'), /localStorage|sessionStorage|setItem/);
});
test('missing contract operations fail closed', () => {
    assert.throws(() => dataPort.create({}), /DATA_PORT_METHOD_REQUIRED/);
    assert.equal(source.findByPatientId('missing'), null);
});

console.log(`farmacia_application_data_port_check: PASS (${passed} cases)`);
