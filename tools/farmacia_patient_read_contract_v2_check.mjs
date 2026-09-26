#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let contract;
try {
    await import(path.join(ROOT, 'scripts/farmacia_patient_read_contract_v2.js'));
    contract = globalThis.FarmaciaPatientReadContractV2;
} catch (error) {
    console.error('farmacia_patient_read_contract_v2_check: FAIL — module scripts/farmacia_patient_read_contract_v2.js could not be loaded');
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
}
if (!contract || typeof contract !== 'object') {
    console.error('farmacia_patient_read_contract_v2_check: FAIL — globalThis.FarmaciaPatientReadContractV2 was not published');
    process.exit(1);
}

await import(path.join(ROOT, 'scripts/farmacia_application_data_port.js'));

let passed = 0;

function test(name, callback) {
    callback();
    passed += 1;
    console.log(`PASS ${name}`);
}

const CONTRACT_VERSION = '2.0.0';
const ENVELOPE_KEYS = ['outcome', 'value', 'errorCode', 'completeness', 'provenance', 'scope'];
const PROVENANCE_KEYS = ['source_kind', 'contract_version', 'source_version', 'patient_id', 'event_ids'];
const IDENTIFIER_SYSTEM = 'urn:cip:synthetic';

const EXPECTED_OUTCOMES = ['ok', 'not_found', 'ambiguous', 'unavailable', 'error'];
const EXPECTED_ERROR_CODES = [
    null, 'IDENTIFIER_INVALID', 'PATIENT_ID_INVALID', 'SOURCE_METHOD_UNAVAILABLE', 'SOURCE_READ_FAILED', 'IDENTIFIER_AMBIGUOUS'
];
const EXPECTED_COMPLETENESS = ['complete', 'partial', 'unknown'];
const EXPECTED_FORBIDDEN_DTO_KEYS = [
    'canonical_row', 'rows', 'source_sheet', 'source_table', 'physical_row_number', 'physical_row_numbers',
    'row_index', 'row_id', 'source_event_id', 'workbook', 'bytes', 'timeline', 'snapshot', 'storage',
    'file_name', 'imported_at', 'read_model_version', 'sessionStorage', 'localStorage'
];
const EXPECTED_EVENT_IDS = ['adherence-a', 'ae-a', 'causality-a', 'line-a', 'prom-a', 'visit-a'];

// The source summary sorts identities by system then value once normalized to {system, value}.
const SOURCE_IDENTIFIERS = [
    { identifier_system: 'urn:nhc', identifier_value: 'NHC-2' },
    { identifier_system: IDENTIFIER_SYSTEM, identifier_value: 'CIP-B' },
    { identifier_system: IDENTIFIER_SYSTEM, identifier_value: 'CIP-A' }
];
const SORTED_IDENTIFIERS = [
    { system: IDENTIFIER_SYSTEM, value: 'CIP-A' },
    { system: IDENTIFIER_SYSTEM, value: 'CIP-B' },
    { system: 'urn:nhc', value: 'NHC-2' }
];

/* ------------------------------------------------------------------ *
 * Shared helpers (used both by the contract checks and the guard     *
 * self-falsification case, so the guard cannot silently pass).       *
 * ------------------------------------------------------------------ */

// Accepts either a frozen array of the literal vocabulary or an object map whose
// values are the literal vocabulary; both conventions appear in this repository.
function vocabularyValues(vocabulary) {
    assert.ok(vocabulary && typeof vocabulary === 'object', 'vocabulary must be an array or object');
    return Array.isArray(vocabulary) ? vocabulary.slice() : Object.values(vocabulary);
}

function assertSameVocabulary(vocabulary, expected, label) {
    const actual = vocabularyValues(vocabulary).map((value) => (value === null ? 'null' : String(value))).sort();
    const target = expected.map((value) => (value === null ? 'null' : String(value))).sort();
    assert.deepEqual(actual, target, label);
}

// Recursively walks every own key of a returned DTO (including keys nested in
// plain objects and inside arrays) and reports paths whose key is a forbidden
// physical/read-model carrier.
function scanForbiddenKeys(value) {
    const forbidden = new Set(vocabularyValues(contract.FORBIDDEN_DTO_KEYS).map(String));
    const hits = [];
    const visited = new WeakSet();
    function walk(node, pathText) {
        if (node === null || typeof node !== 'object') return;
        if (visited.has(node)) return;
        visited.add(node);
        if (Array.isArray(node)) {
            node.forEach((item, index) => walk(item, `${pathText}[${index}]`));
            return;
        }
        Object.keys(node).forEach((key) => {
            if (forbidden.has(key)) hits.push(`${pathText}.${key}`);
            walk(node[key], `${pathText}.${key}`);
        });
    }
    walk(value, 'value');
    return hits;
}

// Serialized-token guard: a physical carrier that survived projection would also
// leave its name in the serialized DTO.
function scanForbiddenTokens(value) {
    let text;
    try {
        text = JSON.stringify(value);
    } catch (error) {
        return ['<unserializable>'];
    }
    return ['source_sheet', 'physical_row', 'workbook', 'source_event_id'].filter((token) => text.includes(token));
}

function assertEnvelopeShape(envelope) {
    assert.ok(envelope && typeof envelope === 'object' && !Array.isArray(envelope), 'envelope must be an object');
    assert.deepEqual(Object.keys(envelope), ENVELOPE_KEYS, 'envelope keys and order');
    assert.ok(vocabularyValues(contract.OUTCOMES).includes(envelope.outcome), `unknown outcome ${envelope.outcome}`);
    assert.ok(vocabularyValues(contract.ERROR_CODES).includes(envelope.errorCode), `unknown errorCode ${envelope.errorCode}`);
    assert.ok(vocabularyValues(contract.COMPLETENESS).includes(envelope.completeness), `unknown completeness ${envelope.completeness}`);
    assert.notEqual(envelope.completeness, 'complete', 'complete must never be returned by contract 2.0.0');
    assert.ok(envelope.provenance && typeof envelope.provenance === 'object', 'provenance must be an object');
    assert.deepEqual(Object.keys(envelope.provenance), PROVENANCE_KEYS, 'provenance keys and order');
    assert.equal(envelope.provenance.source_kind, 'application_read_contract_v2');
    assert.equal(envelope.provenance.contract_version, CONTRACT_VERSION);
    assert.ok(envelope.provenance.source_version === null || typeof envelope.provenance.source_version === 'string');
    assert.ok(envelope.provenance.patient_id === null || typeof envelope.provenance.patient_id === 'string');
    assert.ok(Array.isArray(envelope.provenance.event_ids), 'event_ids must be an array');
    envelope.provenance.event_ids.forEach((id) => assert.equal(typeof id, 'string', 'event_ids entries must be logical strings'));
    assert.deepEqual(envelope.provenance.event_ids, [...new Set(envelope.provenance.event_ids)].sort(), 'event_ids must be sorted and unique');
    assert.equal(envelope.scope, null, 'scope must always be null in contract 2.0.0');
}

/* ------------------------------------------------------------------ *
 * Inline V1-raw-source-shaped fixtures.                              *
 * The module must consume the real V1 read source: logical values    *
 * live on canonical rows, and physical carriers (canonical_row,      *
 * source_sheet, source_table, physical_row_number(s), row_index,     *
 * row_id, source_event_id, snapshot, workbook, timeline, file_name,  *
 * imported_at, read_model_version, storage) must never reach the DTO.*
 * ------------------------------------------------------------------ */

const REQUEST_FIELDS = [
    'request_id', 'request_origin', 'request_date', 'requested_drug_name', 'requested_active_ingredient',
    'requested_presentation', 'requested_dose_text', 'requested_route', 'requested_schedule_code',
    'requested_schedule_label', 'requested_schedule_other_text', 'requested_induction_status',
    'requested_weight_text', 'requested_justification', 'request_source_observations',
    'requested_selected_drug_id', 'requested_catalog_source', 'requested_national_code',
    'requested_registration_number'
];

const VALIDATION_FIELDS = [
    'validation_id', 'validation_type', 'validation_result', 'validation_pending_reason', 'validation_denial_reason',
    'validated_treatment_relation', 'validated_drug_name', 'validated_active_ingredient', 'validated_presentation',
    'validated_dose_text', 'validated_route', 'validated_schedule_code', 'validated_schedule_label',
    'validated_schedule_other_text', 'validated_induction_status', 'validated_selected_drug_id',
    'validated_catalog_source', 'validated_national_code', 'validated_registration_number',
    'validated_treatment_id', 'validated_line_id', 'line_creation_status'
];

function baseSummary(patientId, identifiers) {
    return {
        patient_id: patientId,
        identifiers: identifiers || SOURCE_IDENTIFIERS,
        event_count: 6
    };
}

function v1Event(patientId, eventId, eventType, canonicalFields, eventExtra) {
    const canonicalRow = Object.assign({
        row_id: eventId + '-row',
        row_index: 1,
        patient_id: patientId,
        event_id: eventId,
        event_type: eventType
    }, canonicalFields || {});
    return Object.assign({
        source_event_id: 'raw-' + eventId,
        event_id: eventId,
        event_type: eventType,
        patient_id: patientId,
        source_sheet: '01_DERMA',
        source_table: 'tblBridgeDermaInput',
        physical_row_numbers: [2],
        rows: [{
            source_sheet: '01_DERMA',
            source_table: 'tblBridgeDermaInput',
            physical_row_number: 2,
            canonical_row: canonicalRow
        }]
    }, eventExtra || {});
}

function v1Line(patientId, eventId, canonicalFields) {
    const snapshot = Object.assign({
        row_id: eventId + '-row',
        row_index: 1,
        patient_id: patientId,
        event_id: eventId,
        event_type: 'pharmacy_followup'
    }, canonicalFields || {});
    return {
        source_event_id: 'raw-' + eventId,
        event_id: eventId,
        event_type: 'pharmacy_followup',
        source_sheet: '01_DERMA',
        source_table: 'tblBridgeDermaInput',
        physical_row_number: 2,
        treatment_id: 'treatment-a',
        line_id: 'line-a',
        snapshot: snapshot
    };
}

function rowRecord(eventId, values, rowIndex) {
    return { source_event_id: 'raw-' + eventId, event_id: eventId, row_index: rowIndex, values: values };
}

function makeSource(overrides) {
    const summary = baseSummary('patient-a');
    const request = {
        request_id: 'request-a',
        request_origin: 'e-orden',
        request_date: '2026-08-01',
        requested_drug_name: 'Farmaco A',
        requested_active_ingredient: 'Principio A',
        requested_presentation: 'Comprimido',
        requested_dose_text: '',
        requested_route: null,
        requested_schedule_code: '',
        requested_schedule_label: null,
        requested_schedule_other_text: null,
        requested_induction_status: 'induction',
        requested_weight_text: '70',
        requested_justification: '',
        request_source_observations: null,
        requested_selected_drug_id: null,
        requested_catalog_source: null,
        requested_national_code: null,
        requested_registration_number: null
    };
    const validation = {
        validation_id: 'validation-a',
        validation_type: 'farmacia',
        validation_result: 'validated',
        validation_pending_reason: null,
        validation_denial_reason: null,
        validated_treatment_relation: 'same_as_requested',
        validated_drug_name: 'Farmaco A',
        validated_active_ingredient: 'Principio A',
        validated_presentation: 'Comprimido',
        validated_dose_text: null,
        validated_route: null,
        validated_schedule_code: '',
        validated_schedule_label: null,
        validated_schedule_other_text: null,
        validated_induction_status: 'induction',
        validated_selected_drug_id: null,
        validated_catalog_source: null,
        validated_national_code: null,
        validated_registration_number: null,
        validated_treatment_id: 'treatment-a',
        validated_line_id: 'line-a',
        line_creation_status: 'created'
    };

    const visits = [v1Event('patient-a', 'visit-a', 'pharmacy_followup', {
        visit_note: 'follow-up visit',
        followup_plan: '',
        weight_kg: 0,
        workbook: { file_name: 'synthetic.xlsx' },
        read_model_version: '1.0.0',
        timeline: ['visit-a']
    }, {
        workbook: { file_name: 'synthetic.xlsx' },
        timeline: ['visit-a']
    })];

    const lines = [v1Line('patient-a', 'line-a', {
        treatment_id: 'treatment-a',
        line_id: 'line-a',
        active_at_event: false,
        line_status_at_event: null,
        line_dose_text: 0,
        physical_row_number: 2
    })];

    const proms = [rowRecord('prom-a', {
        proms_json: { score: 0 },
        source_table: 'tblProms',
        read_model_version: '1.0.0'
    }, 2)];

    const adherence = [rowRecord('adherence-a', {
        adherence_collection_status: 'yes',
        adherence_instrument: 'MARS-5',
        adherence_result: '',
        adherence_answers_json: { answer: false },
        storage: 'runtime_memory'
    }, 3)];

    const adverse = [rowRecord('ae-a', {
        adverse_event_id: 'ae-1',
        adverse_event_status: null,
        adverse_event_description: '',
        adverse_event_severity: null,
        adverse_event_resolution_status: null,
        adverse_event_action: null,
        adverse_event_suspects_json: null,
        file_name: 'synthetic.xlsx'
    }, 4)];

    const causality = [rowRecord('causality-a', {
        causality_assessments_json: { assessed: false },
        timeline: [],
        imported_at: '2026-08-06T00:00:00Z'
    }, 5)];

    const base = {
        data_source_version: '1.0.0',
        findByIdentifier: () => summary,
        findByPatientId: () => summary,
        getLatestRequestValidation: () => ({ latest_request: request, latest_validation: validation }),
        getVisitsAndLines: () => ({ visits: visits, latest_first_visit: null, latest_followup: null, lines: lines }),
        getProms: () => proms,
        getAdherence: () => adherence,
        getAdverseEventsAndCausality: () => ({ adverse_events: adverse, causality_assessments: causality })
    };
    const source = Object.assign(base, overrides || {});
    return { source: source, raw: { summary, request, validation, visits, lines, proms, adherence, adverse, causality } };
}

const happy = makeSource();
const happyInstance = contract.create({ source: happy.source });
const happyEnvelope = happyInstance.readPatientContext('patient-a');
const happyResolved = happyInstance.resolvePatient(IDENTIFIER_SYSTEM, 'CIP-A');

/* ------------------------------------------------------------------ *
 * Case 1 — module contracts                                          *
 * ------------------------------------------------------------------ */

test('module publishes a frozen contract at version 2.0.0', () => {
    assert.equal(contract.CONTRACT_VERSION, CONTRACT_VERSION);
    assert.equal(typeof contract.create, 'function');
    assert.ok(Object.isFrozen(contract), 'published contract must be frozen');
});

test('outcome, error code and completeness vocabularies are exact', () => {
    assertSameVocabulary(contract.OUTCOMES, EXPECTED_OUTCOMES, 'OUTCOMES');
    assertSameVocabulary(contract.ERROR_CODES, EXPECTED_ERROR_CODES, 'ERROR_CODES');
    assertSameVocabulary(contract.COMPLETENESS, EXPECTED_COMPLETENESS, 'COMPLETENESS');
    assert.ok(vocabularyValues(contract.COMPLETENESS).includes('complete'), 'complete stays declared but must never be returned');
});

test('FORBIDDEN_DTO_KEYS is the frozen deep-scan list', () => {
    assertSameVocabulary(contract.FORBIDDEN_DTO_KEYS, EXPECTED_FORBIDDEN_DTO_KEYS, 'FORBIDDEN_DTO_KEYS');
    if (Array.isArray(contract.FORBIDDEN_DTO_KEYS)) {
        assert.ok(Object.isFrozen(contract.FORBIDDEN_DTO_KEYS), 'FORBIDDEN_DTO_KEYS must be frozen');
    }
});

test('create rejects missing or invalid source and returns a frozen surface', () => {
    const instance = contract.create({ source: makeSource().source });
    assert.equal(instance.contract_version, CONTRACT_VERSION);
    assert.equal(typeof instance.resolvePatient, 'function');
    assert.equal(typeof instance.readPatientContext, 'function');
    assert.ok(Object.isFrozen(instance), 'contract instance must be frozen');

    [undefined, null, 'options', 42, true].forEach((badOptions) => {
        assert.throws(() => contract.create(badOptions), TypeError, `options ${String(badOptions)} must be rejected`);
    });
    [undefined, null, 'source', 42, true].forEach((badSource) => {
        assert.throws(() => contract.create({ source: badSource }), TypeError, `source ${String(badSource)} must be rejected`);
    });
});

/* ------------------------------------------------------------------ *
 * Cases 2-5 — resolvePatient                                         *
 * ------------------------------------------------------------------ */

test('resolvePatient returns the exact envelope and normalizes a single V1 summary', () => {
    assertEnvelopeShape(happyResolved);
    assert.equal(happyResolved.outcome, 'ok');
    assert.equal(happyResolved.errorCode, null);
    assert.equal(happyResolved.provenance.patient_id, 'patient-a');
    assert.equal(happyResolved.provenance.source_version, '1.0.0');
    assert.deepEqual(Object.keys(happyResolved.value), ['patient_id', 'identifiers']);
    assert.deepEqual(happyResolved.value, { patient_id: 'patient-a', identifiers: SORTED_IDENTIFIERS });
    assert.deepEqual(Object.keys(happyResolved.value.identifiers[0]), ['system', 'value']);
    assert.equal(Object.hasOwn(happyResolved.value, 'event_count'), false);

    const single = contract.create({ source: makeSource({ findByIdentifier: () => [baseSummary('patient-a')] }).source });
    const arrayEnvelope = single.resolvePatient(IDENTIFIER_SYSTEM, 'CIP-A');
    assertEnvelopeShape(arrayEnvelope);
    assert.equal(arrayEnvelope.outcome, 'ok');
    assert.equal(arrayEnvelope.value.patient_id, 'patient-a');
    assert.deepEqual(arrayEnvelope.value.identifiers, SORTED_IDENTIFIERS);
});

test('resolvePatient fails closed for a null or an empty-array source answer', () => {
    const nullInstance = contract.create({ source: makeSource({ findByIdentifier: () => null }).source });
    const nullEnvelope = nullInstance.resolvePatient(IDENTIFIER_SYSTEM, 'CIP-A');
    assertEnvelopeShape(nullEnvelope);
    assert.equal(nullEnvelope.outcome, 'not_found');
    assert.equal(nullEnvelope.errorCode, null);
    assert.equal(nullEnvelope.value, null);

    const emptyInstance = contract.create({ source: makeSource({ findByIdentifier: () => [] }).source });
    const emptyEnvelope = emptyInstance.resolvePatient(IDENTIFIER_SYSTEM, 'CIP-A');
    assertEnvelopeShape(emptyEnvelope);
    assert.equal(emptyEnvelope.outcome, 'not_found');
    assert.equal(emptyEnvelope.errorCode, null);
    assert.equal(emptyEnvelope.value, null);
});

test('resolvePatient reports ambiguity instead of picking a match', () => {
    const matches = [baseSummary('patient-b'), baseSummary('patient-a'), baseSummary('patient-a')];
    const instance = contract.create({ source: makeSource({ findByIdentifier: () => matches }).source });
    const envelope = instance.resolvePatient(IDENTIFIER_SYSTEM, 'CIP-A');
    assertEnvelopeShape(envelope);
    assert.equal(envelope.outcome, 'ambiguous');
    assert.equal(envelope.errorCode, 'IDENTIFIER_AMBIGUOUS');
    assert.equal(envelope.outcome === 'ok', false, 'ambiguity must never resolve silently');
    assert.deepEqual(Object.keys(envelope.value), ['candidate_patient_ids']);
    assert.equal(Object.hasOwn(envelope.value, 'patient_id'), false, 'ambiguity must not select the first match');
    assert.deepEqual(envelope.value.candidate_patient_ids, ['patient-a', 'patient-b']);
});

test('resolvePatient reports an unavailable source, read failures and a non-string version', () => {
    const missingInstance = contract.create({ source: makeSource({ findByIdentifier: undefined }).source });
    const missingEnvelope = missingInstance.resolvePatient(IDENTIFIER_SYSTEM, 'CIP-A');
    assertEnvelopeShape(missingEnvelope);
    assert.equal(missingEnvelope.outcome, 'unavailable');
    assert.equal(missingEnvelope.errorCode, 'SOURCE_METHOD_UNAVAILABLE');
    assert.equal(missingEnvelope.value, null);

    const throwingInstance = contract.create({ source: makeSource({ findByIdentifier: () => { throw new Error('boom'); } }).source });
    const throwingEnvelope = throwingInstance.resolvePatient(IDENTIFIER_SYSTEM, 'CIP-A');
    assertEnvelopeShape(throwingEnvelope);
    assert.equal(throwingEnvelope.outcome, 'error');
    assert.equal(throwingEnvelope.errorCode, 'SOURCE_READ_FAILED');
    assert.equal(throwingEnvelope.value, null);

    const nonStringVersion = contract.create({ source: makeSource({ data_source_version: 42 }).source });
    const nsEnvelope = nonStringVersion.resolvePatient(IDENTIFIER_SYSTEM, 'CIP-A');
    assertEnvelopeShape(nsEnvelope);
    assert.equal(nsEnvelope.provenance.source_version, null, 'a non-string data_source_version must project to null');
});

test('resolvePatient rejects invalid identifiers without touching the source', () => {
    let calls = 0;
    const instance = contract.create({ source: makeSource({ findByIdentifier: () => { calls += 1; return null; } }).source });
    const invalidArguments = [
        [null, 'CIP-A'], [undefined, 'CIP-A'], [1, 'CIP-A'], ['', 'CIP-A'], ['   ', 'CIP-A'],
        [IDENTIFIER_SYSTEM, null], [IDENTIFIER_SYSTEM, undefined], [IDENTIFIER_SYSTEM, 2], [IDENTIFIER_SYSTEM, '   ']
    ];
    invalidArguments.forEach((args) => {
        const envelope = instance.resolvePatient(args[0], args[1]);
        assertEnvelopeShape(envelope);
        assert.equal(envelope.outcome, 'error', `args ${JSON.stringify(args)}`);
        assert.equal(envelope.errorCode, 'IDENTIFIER_INVALID', `args ${JSON.stringify(args)}`);
        assert.equal(envelope.value, null);
        assert.equal(envelope.completeness, 'unknown');
        assert.equal(envelope.provenance.patient_id, null);
    });
    assert.equal(calls, 0, 'invalid identifiers must not reach the source');
});

/* ------------------------------------------------------------------ *
 * Cases 6-8 — readPatientContext                                     *
 * ------------------------------------------------------------------ */

test('readPatientContext keeps request and validation independent and stays partial', () => {
    assertEnvelopeShape(happyEnvelope);
    assert.equal(happyEnvelope.outcome, 'ok');
    assert.equal(happyEnvelope.errorCode, null);
    assert.equal(happyEnvelope.completeness, 'partial');
    assert.notEqual(happyEnvelope.completeness, 'complete');
    assert.equal(happyEnvelope.provenance.patient_id, 'patient-a');
    assert.equal(happyEnvelope.provenance.source_version, '1.0.0');

    const value = happyEnvelope.value;
    assert.deepEqual(Object.keys(value),
        ['patient', 'request', 'validation', 'visits', 'lines', 'proms', 'adherence', 'safety']);
    assert.deepEqual(Object.keys(value.patient), ['patient_id', 'identifiers']);
    assert.deepEqual(value.patient.identifiers, SORTED_IDENTIFIERS);
    assert.deepEqual(Object.keys(value.safety), ['adverse_events', 'causality_assessments']);

    // Every DTO collection item is exactly { event_id, values }.
    [value.visits[0], value.lines[0], value.proms[0], value.adherence[0],
        value.safety.adverse_events[0], value.safety.causality_assessments[0]].forEach((item) => {
        assert.deepEqual(Object.keys(item), ['event_id', 'values']);
    });

    // request and validation stay separate and never merged.
    assert.equal(value.request.request_id, 'request-a');
    assert.equal(value.validation.validation_id, 'validation-a');
    assert.notEqual(value.request, value.validation, 'request and validation must not be merged');
    assert.equal(Object.hasOwn(value.request, 'validated_dose_text'), false);
    assert.equal(Object.hasOwn(value.validation, 'requested_dose_text'), false);
    assert.equal(Object.hasOwn(value.request, 'line_creation_status'), false);
    assert.equal(Object.hasOwn(value.validation, 'requested_route'), false);

    // provenance.event_ids is exactly the sorted unique logical event ids of the DTO.
    const dtoEventIds = [...new Set([].concat(
        value.visits.map((item) => item.event_id),
        value.lines.map((item) => item.event_id),
        value.proms.map((item) => item.event_id),
        value.adherence.map((item) => item.event_id),
        value.safety.adverse_events.map((item) => item.event_id),
        value.safety.causality_assessments.map((item) => item.event_id)
    ))].sort();
    assert.deepEqual(dtoEventIds, EXPECTED_EVENT_IDS);
    assert.deepEqual(happyEnvelope.provenance.event_ids, EXPECTED_EVENT_IDS);
});

test('readPatientContext preserves explicit falsey values through projection', () => {
    const value = happyEnvelope.value;
    assert.ok(Object.is(value.request.requested_dose_text, ''));
    assert.ok(Object.is(value.request.requested_route, null));
    assert.ok(Object.is(value.request.requested_schedule_code, ''));
    assert.ok(Object.is(value.validation.validated_dose_text, null));
    assert.ok(Object.is(value.validation.validated_route, null));
    assert.ok(Object.is(value.validation.validated_schedule_code, ''));

    assert.equal(value.visits.length, 1);
    assert.equal(value.visits[0].values.visit_note, 'follow-up visit');
    assert.ok(Object.is(value.visits[0].values.followup_plan, ''));
    assert.ok(Object.is(value.visits[0].values.weight_kg, 0));

    assert.equal(value.lines.length, 1);
    assert.equal(value.lines[0].values.treatment_id, 'treatment-a');
    assert.equal(value.lines[0].values.line_id, 'line-a');
    assert.ok(Object.is(value.lines[0].values.active_at_event, false));
    assert.ok(Object.is(value.lines[0].values.line_status_at_event, null));
    assert.ok(Object.is(value.lines[0].values.line_dose_text, 0));

    assert.ok(Object.is(value.proms[0].values.proms_json.score, 0));
    assert.ok(Object.is(value.adherence[0].values.adherence_result, ''));
    assert.ok(Object.is(value.adherence[0].values.adherence_answers_json.answer, false));
    assert.ok(Object.is(value.safety.adverse_events[0].values.adverse_event_status, null));
    assert.ok(Object.is(value.safety.adverse_events[0].values.adverse_event_description, ''));
    assert.ok(Object.is(value.safety.causality_assessments[0].values.causality_assessments_json.assessed, false));

    assert.ok(Object.hasOwn(value.request, 'requested_dose_text'));
    assert.ok(Object.hasOwn(value.validation, 'validated_dose_text'));
    assert.ok(Object.hasOwn(value.visits[0].values, 'followup_plan'));
    assert.ok(Object.hasOwn(value.lines[0].values, 'active_at_event'));
    assert.ok(Object.hasOwn(value.safety.adverse_events[0].values, 'adverse_event_status'));
});

test('readPatientContext maps a whole-null source group to null and empty collections', () => {
    const instance = contract.create({
        source: makeSource({
            getLatestRequestValidation: () => null,
            getVisitsAndLines: () => null,
            getProms: () => null,
            getAdherence: () => null,
            getAdverseEventsAndCausality: () => null
        }).source
    });
    const envelope = instance.readPatientContext('patient-a');
    assertEnvelopeShape(envelope);
    assert.equal(envelope.outcome, 'ok');
    assert.equal(envelope.errorCode, null);
    assert.equal(envelope.completeness, 'partial', 'a null group is not an unusable value');
    const value = envelope.value;
    assert.equal(value.request, null, 'a null request group must stay null, never {}');
    assert.equal(value.validation, null, 'a null validation group must stay null, never {}');
    assert.deepEqual(value.visits, []);
    assert.deepEqual(value.lines, []);
    assert.deepEqual(value.proms, []);
    assert.deepEqual(value.adherence, []);
    assert.deepEqual(value.safety, { adverse_events: [], causality_assessments: [] });
});

test('readPatientContext supports a missing request or validation side', () => {
    const instance = contract.create({
        source: makeSource({
            getLatestRequestValidation: () => ({
                latest_request: null,
                latest_validation: {
                    validation_id: 'validation-a',
                    validated_dose_text: 'dose'
                }
            })
        }).source
    });
    const envelope = instance.readPatientContext('patient-a');
    assertEnvelopeShape(envelope);
    assert.equal(envelope.outcome, 'ok');
    assert.equal(envelope.completeness, 'partial');
    assert.equal(envelope.value.request, null);
    assert.equal(envelope.value.validation.validated_dose_text, 'dose');
});

test('readPatientContext fails closed when a required group method is missing', () => {
    const instance = contract.create({ source: makeSource({ getProms: undefined }).source });
    const envelope = instance.readPatientContext('patient-a');
    assertEnvelopeShape(envelope);
    assert.equal(envelope.outcome, 'unavailable');
    assert.equal(envelope.errorCode, 'SOURCE_METHOD_UNAVAILABLE');
    assert.equal(envelope.completeness, 'unknown');
    assert.equal(envelope.value, null);
});

test('readPatientContext reports source read failures', () => {
    const instance = contract.create({ source: makeSource({ getAdherence: () => { throw new Error('boom'); } }).source });
    const envelope = instance.readPatientContext('patient-a');
    assertEnvelopeShape(envelope);
    assert.equal(envelope.outcome, 'error');
    assert.equal(envelope.errorCode, 'SOURCE_READ_FAILED');
    assert.equal(envelope.completeness, 'unknown');
    assert.equal(envelope.value, null);
});

test('readPatientContext reports unknown completeness for unusable group values', () => {
    const instance = contract.create({ source: makeSource({ getProms: () => 'not-a-collection' }).source });
    const envelope = instance.readPatientContext('patient-a');
    assertEnvelopeShape(envelope);
    assert.equal(envelope.outcome, 'ok');
    assert.equal(envelope.errorCode, null);
    assert.equal(envelope.completeness, 'unknown');
});

test('readPatientContext rejects invalid patient ids and missing patients', () => {
    const instance = contract.create({ source: makeSource().source });
    [null, undefined, 7, '', '   '].forEach((patientId) => {
        const envelope = instance.readPatientContext(patientId);
        assertEnvelopeShape(envelope);
        assert.equal(envelope.outcome, 'error', `patientId ${String(patientId)}`);
        assert.equal(envelope.errorCode, 'PATIENT_ID_INVALID');
        assert.equal(envelope.completeness, 'unknown');
        assert.equal(envelope.value, null);
    });

    const missing = contract.create({ source: makeSource({ findByPatientId: () => null }).source });
    const notFound = missing.readPatientContext('patient-a');
    assertEnvelopeShape(notFound);
    assert.equal(notFound.outcome, 'not_found');
    assert.equal(notFound.errorCode, null);
    assert.equal(notFound.completeness, 'unknown');
    assert.equal(notFound.value, null);
});

/* ------------------------------------------------------------------ *
 * Cases 9-11 — physical-detail leakage, detachment, guard falsification *
 * ------------------------------------------------------------------ */

test('read DTO exposes no forbidden physical or read-model keys', () => {
    assert.deepEqual(scanForbiddenKeys(happyEnvelope.value), [], 'read DTO must not carry forbidden keys');
    assert.deepEqual(scanForbiddenKeys(happyResolved.value), [], 'resolve DTO must not carry forbidden keys');
    assert.deepEqual(scanForbiddenTokens(happyEnvelope.value), [], 'serialized read DTO must not carry physical tokens');
    assert.equal(JSON.stringify(happyEnvelope.value).includes('source_event_id'), false,
        'source_event_id must not appear anywhere in the serialized DTO');
});

test('deep-scan guard detects a deliberately contaminated sample', () => {
    const contaminated = {
        outcome: 'ok',
        value: {
            patient: { patient_id: 'patient-x' },
            visits: [{ event_id: 'visit-x', values: { source_event_id: 'raw-x' }, canonical_row: { row_id: 'row-x' } }],
            workbook: { file_name: 'x' },
            nested: [{ deeper: { source_sheet: '01_DERMA', physical_row_number: 2 } }]
        }
    };
    const hits = scanForbiddenKeys(contaminated);
    assert.ok(hits.length >= 4, `guard must report the planted keys, got ${hits.length}`);
    assert.ok(hits.some((hit) => hit.endsWith('.canonical_row')), 'canonical_row must be detected');
    assert.ok(hits.some((hit) => hit.endsWith('.workbook')), 'workbook must be detected');
    assert.ok(hits.some((hit) => hit.endsWith('.source_sheet')), 'source_sheet must be detected');
    assert.ok(hits.some((hit) => hit.endsWith('.source_event_id')), 'source_event_id must be detected');
    assert.ok(hits.some((hit) => hit.endsWith('.physical_row_number')), 'physical_row_number must be detected');
    assert.ok(scanForbiddenTokens(contaminated).length > 0, 'token guard must detect planted physical tokens');
});

test('returned DTOs are detached from the source read model', () => {
    const detached = makeSource();
    const instance = contract.create({ source: detached.source });
    const before = JSON.stringify(detached.raw);

    const envelope = instance.readPatientContext('patient-a');
    assert.equal(envelope.outcome, 'ok');
    envelope.value.patient.patient_id = 'mutated';
    envelope.value.visits[0].values.visit_note = 'mutated';
    envelope.value.lines[0].values.active_at_event = true;
    envelope.value.proms[0].values.proms_json.score = 99;

    const resolved = instance.resolvePatient(IDENTIFIER_SYSTEM, 'CIP-A');
    resolved.value.patient_id = 'mutated';
    resolved.value.identifiers[0].value = 'mutated';

    assert.equal(JSON.stringify(detached.raw), before, 'mutating a returned DTO must not change the source read model');

    const reread = instance.readPatientContext('patient-a');
    assert.equal(reread.value.patient.patient_id, 'patient-a');
    assert.equal(reread.value.visits[0].values.visit_note, 'follow-up visit');
    assert.ok(Object.is(reread.value.lines[0].values.active_at_event, false));
    assert.ok(Object.is(reread.value.proms[0].values.proms_json.score, 0));
    const rereresolved = instance.resolvePatient(IDENTIFIER_SYSTEM, 'CIP-A');
    assert.equal(rereresolved.value.patient_id, 'patient-a');
});

/* ------------------------------------------------------------------ *
 * Case 12 — V1 remains untouched and V2 does not expose physical keys *
 * ------------------------------------------------------------------ */

test('V1 application data port remains published and unmodified', () => {
    const v1 = globalThis.FarmaciaApplicationDataPort;
    assert.ok(v1 && typeof v1 === 'object', 'V1 port global must still be published');
    assert.equal(v1.PORT_VERSION, '1.0.0');
    assert.equal(typeof v1.create, 'function');

    const v1Text = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_application_data_port.js'), 'utf8');
    assert.match(v1Text, /PORT_VERSION = '1\.0\.0'/);
    const v1Methods = [
        'listPatients', 'findByIdentifier', 'findByPatientId', 'getPatientProjection', 'getPatientEvents',
        'getLatestRequestValidation', 'getVisitsAndLines', 'getProms', 'getAdherence',
        'getAdverseEventsAndCausality', 'getPopulationProjection'
    ];
    v1Methods.forEach((method) => assert.ok(v1Text.includes(method), `V1 source must still declare ${method}`));
    assert.deepEqual(v1.METHODS.slice(), v1Methods);
});

test('V2 module source does not expose physical keys', () => {
    const v2Text = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_patient_read_contract_v2.js'), 'utf8');
    // The module must read canonical_row from the V1 source and list the carriers in
    // FORBIDDEN_DTO_KEYS (quoted string tokens). What it must never do is emit one as a
    // DTO key: no unquoted object-literal key (`canonical_row:`) and no DTO property
    // assignment (`out.canonical_row = ...`). Source reads such as `rows[0].canonical_row`
    // stay legal.
    ['canonical_row', 'physical_row_number'].forEach((token) => {
        const asObjectKey = new RegExp(`(?<!['"\`])\\b${token}\\b(?!['"\`])\\s*:`);
        const asAssignment = new RegExp(`(?:\\.|^)\\s*${token}\\s*=`, 'm');
        assert.equal(asObjectKey.test(v2Text), false, `${token} must not appear as an object literal DTO key`);
        assert.equal(asAssignment.test(v2Text), false, `${token} must not be assigned as a DTO property`);
    });
});

console.log(`farmacia_patient_read_contract_v2_check: PASS (${passed} cases)`);
