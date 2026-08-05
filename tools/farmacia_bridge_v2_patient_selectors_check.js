#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
require(path.join(ROOT, 'scripts/farmacia_bridge_v2_patient_selectors.js'));

const selectorsModule = global.FarmaciaBridgeV2PatientSelectors;
let passed = 0;

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function test(name, callback) {
    try {
        callback();
        passed += 1;
        console.log(`PASS ${name}`);
    } catch (error) {
        console.error(`FAIL ${name}`);
        throw error;
    }
}

function expectTypeErrorCode(code, callback) {
    assert.throws(callback, error => error instanceof TypeError && new RegExp(code).test(error.message));
}

function reorderedObject(object, keys) {
    const result = {};
    keys.forEach(key => { result[key] = object[key]; });
    return result;
}

function row(overrides = {}) {
    return Object.assign({
        row_id: `row-${overrides.row_index || 1}`,
        row_index: 1,
        row_count: 1,
        occurred_at: '2026-01-01T09:00:00Z',
        recorded_at: '2026-01-01T10:00:00Z',
        identifier_system: 'urn:cip:demo',
        identifier_value: 'SAME-VALUE',
        patient_id: 'patient-a',
        service_code: 'DERMA',
        service_label: 'Dermatología',
        pathology_code: 'HS',
        pathology_label: 'Hidradenitis supurativa',
        request_id: null,
        request_origin: null,
        request_date: null,
        requested_drug_name: null,
        requested_active_ingredient: null,
        requested_presentation: null,
        requested_dose_text: null,
        requested_route: null,
        requested_schedule_code: null,
        requested_schedule_label: null,
        requested_schedule_other_text: null,
        requested_induction_status: null,
        requested_weight_text: null,
        requested_justification: null,
        request_source_observations: null,
        requested_selected_drug_id: null,
        requested_catalog_source: null,
        requested_national_code: null,
        requested_registration_number: null,
        validation_id: null,
        validation_type: null,
        validation_result: null,
        validation_pending_reason: null,
        validation_denial_reason: null,
        validated_treatment_relation: null,
        validated_drug_name: null,
        validated_active_ingredient: null,
        validated_presentation: null,
        validated_dose_text: null,
        validated_route: null,
        validated_schedule_code: null,
        validated_schedule_label: null,
        validated_schedule_other_text: null,
        validated_induction_status: null,
        validated_selected_drug_id: null,
        validated_catalog_source: null,
        validated_national_code: null,
        validated_registration_number: null,
        validated_treatment_id: null,
        validated_line_id: null,
        line_creation_status: null,
        treatment_id: null,
        line_id: null,
        active_at_event: null,
        line_drug_name: null,
        line_dose_text: null,
        line_route: null,
        line_schedule_label: null,
        proms_json: null,
        adherence_collection_status: null,
        adherence_instrument: null,
        adherence_result: null,
        adherence_answers_json: null,
        adverse_event_id: null,
        adverse_event_status: null,
        adverse_event_description: null,
        adverse_event_severity: null,
        adverse_event_resolution_status: null,
        adverse_event_action: null,
        adverse_event_suspects_json: null,
        causality_assessments_json: null
    }, overrides);
}

function event(sourceEventId, eventType, rows, patientId = 'patient-a') {
    return {
        source_event_id: sourceEventId,
        event_id: `event-${sourceEventId}`,
        event_type: eventType,
        patient_id: patientId,
        source_sheet: '01_DERMA',
        source_table: 'tblBridgeDermaInput',
        physical_row_numbers: rows.map((unused, index) => index + 2),
        rows: rows.map((canonicalRow, index) => ({
            source_sheet: '01_DERMA',
            source_table: 'tblBridgeDermaInput',
            physical_row_number: index + 2,
            canonical_row: Object.assign({}, canonicalRow, {
                source_event_id: sourceEventId,
                event_id: `event-${sourceEventId}`,
                event_type: eventType,
                patient_id: patientId
            })
        }))
    };
}

function fixture() {
    const events = [
        event('src-follow-b', 'pharmacy_followup', [
            row({
                row_id: 'row-follow-b-1', row_index: 1, row_count: 2,
                occurred_at: '2026-04-01T09:00:00Z', recorded_at: '2026-04-01T10:00:00Z',
                treatment_id: 'treatment-1', line_id: 'line-1', active_at_event: null,
                line_drug_name: 'Fármaco sintético A', line_dose_text: 0,
                proms_json: { instrument: 'PROM-DEMO', value: 0 },
                adherence_collection_status: 'yes', adherence_instrument: 'DEMO',
                adherence_result: '', adherence_answers_json: { answer: false },
                adverse_event_status: null, adverse_event_description: '',
                causality_assessments_json: { explicit: false }
            }),
            row({
                row_id: 'row-follow-b-2', row_index: 2, row_count: 2,
                occurred_at: '2026-04-01T09:00:00Z', recorded_at: '2026-04-01T10:00:00Z',
                treatment_id: 'treatment-3', line_id: 'line-3', active_at_event: true,
                line_drug_name: 'Fármaco sintético C', proms_json: { instrument: 'PROM-DEMO', value: 0 },
                adherence_collection_status: 'no', adherence_instrument: '', adherence_result: null,
                adherence_answers_json: [], adverse_event_id: 'ae-1', adverse_event_status: 'present',
                adverse_event_description: 'EA sintético', adverse_event_suspects_json: ['line-3'],
                causality_assessments_json: [{ suspect: 'line-3', result: 'explicit-demo' }]
            })
        ]),
        event('src-missing-date', 'pharmacy_validation', [row({
            row_id: 'row-missing', occurred_at: null, recorded_at: null,
            requested_drug_name: 'Sin fecha', line_drug_name: 'No crear línea'
        })]),
        event('src-first', 'pharmacy_first_visit', [
            row({
                row_id: 'row-first-1', row_index: 1, row_count: 2,
                occurred_at: '2026-02-01T09:00:00Z', recorded_at: '2026-02-01T10:00:00Z',
                treatment_id: 'treatment-1', line_id: 'line-1', active_at_event: true,
                line_drug_name: 'Fármaco sintético A', proms_json: [{ instrument: 'ARRAY-PROM', value: false }]
            }),
            row({
                row_id: 'row-first-2', row_index: 2, row_count: 2,
                occurred_at: '2026-02-01T09:00:00Z', recorded_at: '2026-02-01T10:00:00Z',
                treatment_id: 'treatment-2', line_id: 'line-2', active_at_event: false,
                line_drug_name: 'Fármaco sintético B', proms_json: [{ instrument: 'ARRAY-PROM', value: false }]
            })
        ]),
        event('src-follow-a', 'pharmacy_followup', [row({
            row_id: 'row-follow-a', occurred_at: '2026-04-01T09:00:00Z', recorded_at: '2026-04-01T09:30:00Z',
            treatment_id: 'treatment-1', line_id: 'line-1', active_at_event: false,
            line_drug_name: 'Fármaco sintético A'
        })]),
        event('src-follow-aa', 'pharmacy_followup', [row({
            row_id: 'row-follow-aa', occurred_at: '2026-04-01T09:00:00Z', recorded_at: '2026-04-01T10:00:00Z',
            treatment_id: null, line_id: null, active_at_event: null,
            line_drug_name: 'Nombre sin identidad de línea'
        })]),
        event('src-validation-old', 'pharmacy_validation', [row({
            row_id: 'row-validation-old', occurred_at: '2026-01-01T09:00:00Z', recorded_at: '2026-01-01T10:00:00Z',
            request_id: 'request-old', requested_drug_name: 'Solicitado antiguo',
            validation_id: 'validation-old', validation_result: 'pending'
        })]),
        event('src-validation-new', 'pharmacy_validation', [row({
            row_id: 'row-validation-new', occurred_at: '2026-05-01T09:00:00Z', recorded_at: '2026-05-01T10:00:00Z',
            request_id: 'request-new', request_origin: 'synthetic', requested_drug_name: 'Solicitado explícito',
            requested_dose_text: '', validation_id: 'validation-new', validation_type: 'initial',
            validation_result: 'validated', validated_drug_name: 'Validado explícito',
            validated_dose_text: null, line_creation_status: 'not_created'
        })]),
        event('src-b', 'pharmacy_validation', [row({
            row_id: 'row-b', patient_id: 'patient-b', identifier_system: 'urn:nhc:demo',
            identifier_value: 'SAME-VALUE', service_code: 'DIG', service_label: 'Digestivo',
            pathology_code: 'EC', pathology_label: 'Enfermedad sintética'
        })], 'patient-b'),
        event('src-c', 'pharmacy_validation', [row({
            row_id: 'row-c', patient_id: 'patient-c', identifier_system: 'urn:cip:demo',
            identifier_value: 'ZZZ-VALUE', service_code: null, service_label: null,
            pathology_code: null, pathology_label: null
        })], 'patient-c')
    ];
    return {
        read_model_version: '1.0.0',
        metadata: {
            format: 'farmacia_bridge_v2_raw', reader_version: '1.0.0', file_name: 'synthetic-bridge.xlsx',
            imported_at: '2026-08-05T10:00:00Z', row_count: 12, event_count: 9,
            patient_count: 3, excluded_event_count: 1
        },
        patients: {
            'patient-c': { patient_id: 'patient-c', identifiers: [{ identifier_system: 'urn:cip:demo', identifier_value: 'ZZZ-VALUE' }], source_event_ids: ['src-c'] },
            'patient-b': { patient_id: 'patient-b', identifiers: [{ identifier_system: 'urn:nhc:demo', identifier_value: 'SAME-VALUE' }], source_event_ids: ['src-b'] },
            'patient-a': { patient_id: 'patient-a', identifiers: [{ identifier_system: 'urn:cip:demo', identifier_value: 'SAME-VALUE' }], source_event_ids: events.filter(item => item.patient_id === 'patient-a').map(item => item.source_event_id) }
        },
        identifiers: [
            { identifier_system: 'urn:cip:demo', identifier_value: 'SAME-VALUE', patient_id: 'patient-a' },
            { identifier_system: 'urn:nhc:demo', identifier_value: 'SAME-VALUE', patient_id: 'patient-b' },
            { identifier_system: 'urn:cip:demo', identifier_value: 'ZZZ-VALUE', patient_id: 'patient-c' }
        ],
        events,
        indexes: {
            by_patient_id: {
                'patient-a': events.filter(item => item.patient_id === 'patient-a').map(item => item.source_event_id),
                'patient-b': ['src-b'], 'patient-c': ['src-c']
            },
            by_identifier: {
                'urn:cip:demo': {
                    'SAME-VALUE': { patient_id: 'patient-a', source_event_ids: ['src-validation-old'] },
                    'ZZZ-VALUE': { patient_id: 'patient-c', source_event_ids: ['src-c'] }
                },
                'urn:nhc:demo': {
                    'SAME-VALUE': { patient_id: 'patient-b', source_event_ids: ['src-b'] }
                }
            }
        },
        warnings: [
            { code: 'PATIENT-WARNING', patient_id: 'patient-a' },
            { code: 'OTHER-WARNING', patient_id: 'patient-b' }
        ],
        excluded_events: [event('src-excluded-a', 'pharmacy_followup', [row({ row_id: 'row-excluded' })])],
        source_errors: [
            { code: 'SOURCE-A', source_event_id: 'src-excluded-a' },
            { code: 'SOURCE-OTHER', source_event_id: 'src-not-attributed' }
        ]
    };
}

const model = fixture();
const baseline = clone(model);
const selectors = selectorsModule.create(model);

test('valid read model', () => assert(selectors));
test('create does not mutate read model', () => assert.deepStrictEqual(clone(model), baseline));
test('patients are sorted deterministically', () => assert.deepStrictEqual(selectors.listPatientSummaries().map(item => item.patient_id), ['patient-a', 'patient-c', 'patient-b']));
test('search uses explicit system and value', () => assert.strictEqual(selectors.findByIdentifier('urn:cip:demo', 'SAME-VALUE').patient_id, 'patient-a'));
test('search trims both identifier components', () => assert.strictEqual(selectors.findByIdentifier(' urn:cip:demo ', ' SAME-VALUE ').patient_id, 'patient-a'));
test('same value remains distinct across systems', () => assert.strictEqual(selectors.findByIdentifier('urn:nhc:demo', 'SAME-VALUE').patient_id, 'patient-b'));
test('identifier matching preserves case', () => assert.strictEqual(selectors.findByIdentifier('urn:cip:demo', 'same-value'), null));
test('technical patient lookup is separate', () => assert.strictEqual(selectors.findByPatientId('patient-a').patient_id, 'patient-a'));
test('events sort by occurred_at with missing values first', () => assert.strictEqual(selectors.getPatientEvents('patient-a')[0].source_event_id, 'src-missing-date'));
test('recorded_at breaks occurred_at ties', () => {
    const ids = selectors.getPatientEvents('patient-a').map(item => item.source_event_id);
    assert(ids.indexOf('src-follow-a') < ids.indexOf('src-follow-aa'));
});
test('source_event_id breaks date ties', () => {
    const ids = selectors.getPatientEvents('patient-a').map(item => item.source_event_id);
    assert(ids.indexOf('src-follow-aa') < ids.indexOf('src-follow-b'));
});
test('latest validation is deterministic', () => assert.strictEqual(selectors.getLatestEventOfType('patient-a', 'pharmacy_validation').source_event_id, 'src-validation-new'));
test('latest first visit is returned', () => assert.strictEqual(selectors.getLatestEventOfType('patient-a', 'pharmacy_first_visit').source_event_id, 'src-first'));
test('latest followup is returned', () => assert.strictEqual(selectors.getLatestEventOfType('patient-a', 'pharmacy_followup').source_event_id, 'src-follow-b'));
test('request projection is separate', () => {
    const request = selectors.getPatientQuickView('patient-a').latest_request;
    assert.strictEqual(request.requested_drug_name, 'Solicitado explícito');
    assert(!Object.keys(request).some(key => key.startsWith('validation_') || key.startsWith('validated_') || key === 'line_creation_status'));
});
test('validation projection is separate', () => {
    const validation = selectors.getPatientQuickView('patient-a').latest_validation;
    assert.strictEqual(validation.validated_drug_name, 'Validado explícito');
    assert(!Object.keys(validation).some(key => key.startsWith('request_') || key.startsWith('requested_')));
});
test('multiline act preserves every row', () => assert.strictEqual(selectors.getLatestEventOfType('patient-a', 'pharmacy_first_visit').rows.length, 2));
test('several explicit lines are returned', () => assert.deepStrictEqual(selectors.getLatestLineSnapshots('patient-a').map(item => item.line_id), ['line-1', 'line-2', 'line-3']));
test('latest snapshot wins within line_id', () => assert.strictEqual(selectors.getLatestLineSnapshots('patient-a').find(item => item.line_id === 'line-1').source_event_id, 'src-follow-b'));
test('treatment_id and line_id remain separate', () => {
    const line = selectors.getLatestLineSnapshots('patient-a')[0];
    assert.strictEqual(line.treatment_id, 'treatment-1');
    assert.strictEqual(line.line_id, 'line-1');
});
test('explicit true is preserved', () => assert.strictEqual(selectors.getLatestLineSnapshots('patient-a').find(item => item.line_id === 'line-3').snapshot.active_at_event, true));
test('explicit false is preserved', () => assert.strictEqual(selectors.getLatestLineSnapshots('patient-a').find(item => item.line_id === 'line-2').snapshot.active_at_event, false));
test('explicit null is preserved', () => assert.strictEqual(selectors.getLatestLineSnapshots('patient-a').find(item => item.line_id === 'line-1').snapshot.active_at_event, null));
test('zero is preserved', () => assert.strictEqual(selectors.getLatestLineSnapshots('patient-a').find(item => item.line_id === 'line-1').snapshot.line_dose_text, 0));
test('empty string is preserved', () => assert.strictEqual(selectors.getPatientQuickView('patient-a').latest_request.requested_dose_text, ''));
test('PROM array is preserved', () => assert(Array.isArray(selectors.getPatientQuickView('patient-a').structured_proms.find(item => item.source_event_id === 'src-first').values.proms_json)));
test('PROM object is preserved', () => assert.deepStrictEqual(selectors.getPatientQuickView('patient-a').structured_proms.find(item => item.source_event_id === 'src-follow-b').values.proms_json, { instrument: 'PROM-DEMO', value: 0 }));
test('adherence fields are preserved without interpretation', () => assert.strictEqual(selectors.getPatientQuickView('patient-a').adherence.find(item => item.source_event_id === 'src-follow-b').values.adherence_result, ''));
test('adverse event fields are explicit', () => assert.strictEqual(selectors.getPatientQuickView('patient-a').adverse_events.find(item => item.values.adverse_event_id === 'ae-1').values.adverse_event_status, 'present'));
test('causality JSON is explicit', () => assert(Array.isArray(selectors.getPatientQuickView('patient-a').causality_assessments.find(item => Array.isArray(item.values.causality_assessments_json)).values.causality_assessments_json)));
test('patient warnings are attributed', () => assert.deepStrictEqual(selectors.getPatientQuickView('patient-a').warnings.map(item => item.code), ['PATIENT-WARNING']));
test('excluded events are counted but not timeline events', () => {
    const quickView = selectors.getPatientQuickView('patient-a');
    assert.strictEqual(quickView.excluded_event_count, 1);
    assert(!quickView.timeline.some(item => item.source_event_id === 'src-excluded-a'));
});
test('source errors linked through excluded events are counted', () => assert.strictEqual(selectors.getPatientQuickView('patient-a').source_error_count, 1));
test('quick view is JSON serializable', () => assert.doesNotThrow(() => JSON.stringify(selectors.getPatientQuickView('patient-a'))));
test('services and pathologies remain explicit structures', () => {
    const quickView = selectors.getPatientQuickView('patient-a');
    assert.deepStrictEqual(quickView.services, [{ code: 'DERMA', label: 'Dermatología' }]);
    assert.deepStrictEqual(quickView.pathologies, [{ code: 'HS', label: 'Hidradenitis supurativa' }]);
});
test('workbook metadata is minimal and runtime-only', () => {
    const workbook = selectors.getPatientQuickView('patient-a').workbook;
    assert.strictEqual(workbook.file_name, 'synthetic-bridge.xlsx');
    assert.strictEqual(workbook.storage, 'runtime_memory');
    assert.strictEqual(workbook.read_model_version, '1.0.0');
    assert(!Object.prototype.hasOwnProperty.call(workbook, 'events'));
});
test('absent read model fails closed', () => assert.throws(() => selectorsModule.create(null), TypeError));
test('invalid patients fails closed', () => {
    const invalid = fixture(); invalid.patients = [];
    assert.throws(() => selectorsModule.create(invalid), TypeError);
});
test('invalid events fails closed', () => {
    const invalid = fixture(); invalid.events = {};
    assert.throws(() => selectorsModule.create(invalid), TypeError);
});
test('missing patient index fails closed', () => {
    const invalid = fixture(); delete invalid.indexes.by_patient_id;
    assert.throws(() => selectorsModule.create(invalid), TypeError);
});
test('missing identifier index fails closed', () => {
    const invalid = fixture(); delete invalid.indexes.by_identifier;
    assert.throws(() => selectorsModule.create(invalid), TypeError);
});
test('unsupported version fails closed', () => {
    const invalid = fixture(); invalid.read_model_version = '2.0.0';
    assert.throws(() => selectorsModule.create(invalid), TypeError);
});
test('empty event rows fail closed', () => {
    const invalid = fixture(); invalid.events[0].rows = [];
    assert.throws(() => selectorsModule.create(invalid), TypeError);
});
test('patient and event identity mismatch fails closed', () => {
    const invalid = fixture(); invalid.events[0].rows[0].canonical_row.patient_id = 'patient-b';
    assert.throws(() => selectorsModule.create(invalid), TypeError);
});
test('patient index mismatch fails closed', () => {
    const invalid = fixture(); invalid.indexes.by_patient_id['patient-a'] = [];
    assert.throws(() => selectorsModule.create(invalid), TypeError);
});
test('identifier mapping to unknown patient fails closed', () => {
    const invalid = fixture(); invalid.indexes.by_identifier['urn:cip:demo']['SAME-VALUE'].patient_id = 'missing';
    assert.throws(() => selectorsModule.create(invalid), TypeError);
});
test('incomplete identifier pair is not searchable', () => {
    assert.strictEqual(selectors.findByIdentifier('', 'SAME-VALUE'), null);
    assert.strictEqual(selectors.findByIdentifier('urn:cip:demo', ''), null);
});
test('absent identifier is not found', () => assert.strictEqual(selectors.findByIdentifier('urn:cip:demo', 'ABSENT'), null));
test('patient_id is not an operational identifier value', () => assert.strictEqual(selectors.findByIdentifier('urn:cip:demo', 'patient-a'), null));
test('events from another patient are excluded', () => assert(!selectors.getPatientEvents('patient-a').some(item => item.patient_id === 'patient-b')));
test('row without line_id does not become a line', () => assert(!selectors.getLatestLineSnapshots('patient-a').some(item => item.snapshot.row_id === 'row-follow-aa')));
test('drug name never generates line identity', () => assert(!selectors.getLatestLineSnapshots('patient-a').some(item => item.line_id === 'Nombre sin identidad de línea')));
test('line activity is not inferred', () => assert.strictEqual(selectors.getLatestLineSnapshots('patient-a').find(item => item.line_id === 'line-1').snapshot.active_at_event, null));
test('multiline event projection does not select one winning row', () => assert.strictEqual(selectors.getPatientQuickView('patient-a').latest_first_visit.rows.length, 2));
test('returned projections cannot mutate read model', () => {
    const projection = selectors.getPatientQuickView('patient-a');
    projection.timeline[0].rows[0].canonical_row.patient_id = 'changed';
    projection.identifiers[0].identifier_value = 'changed';
    assert.deepStrictEqual(clone(model), baseline);
});
test('source errors never enter clinical timeline', () => assert(!selectors.getPatientQuickView('patient-a').timeline.some(item => item.source_event_id === 'src-not-attributed')));
test('equal-date ordering is stable across calls', () => assert.deepStrictEqual(selectors.getPatientEvents('patient-a').map(item => item.source_event_id), selectors.getPatientEvents('patient-a').map(item => item.source_event_id)));
test('unknown technical patient returns null', () => assert.strictEqual(selectors.findByPatientId('missing'), null));
test('unknown quick view returns null', () => assert.strictEqual(selectors.getPatientQuickView('missing'), null));

test('stored identifier with outer padding resolves normalized query', () => {
    const padded = fixture();
    padded.patients['patient-a'].identifiers = [{ identifier_system: ' urn:cip:demo ', identifier_value: ' SAME-VALUE ' }];
    padded.indexes.by_identifier = { ' urn:cip:demo ': { ' SAME-VALUE ': { patient_id: 'patient-a' } }, 'urn:nhc:demo': padded.indexes.by_identifier['urn:nhc:demo'], 'urn:cip:demo': { 'ZZZ-VALUE': padded.indexes.by_identifier['urn:cip:demo']['ZZZ-VALUE'] } };
    assert.strictEqual(selectorsModule.create(padded).findByIdentifier('urn:cip:demo', 'SAME-VALUE').patient_id, 'patient-a');
});
test('padded stored identifier also accepts padded query', () => {
    const padded = fixture();
    padded.patients['patient-a'].identifiers = [{ identifier_system: ' urn:cip:demo ', identifier_value: ' SAME-VALUE ' }];
    padded.indexes.by_identifier[' urn:cip:demo '] = { ' SAME-VALUE ': padded.indexes.by_identifier['urn:cip:demo']['SAME-VALUE'] };
    delete padded.indexes.by_identifier['urn:cip:demo']['SAME-VALUE'];
    assert.strictEqual(selectorsModule.create(padded).findByIdentifier(' urn:cip:demo ', ' SAME-VALUE ').patient_id, 'patient-a');
});
test('normalized index construction does not mutate padded model', () => {
    const padded = fixture();
    padded.patients['patient-a'].identifiers = [{ identifier_system: ' urn:cip:demo ', identifier_value: ' SAME-VALUE ' }];
    padded.indexes.by_identifier[' urn:cip:demo '] = { ' SAME-VALUE ': padded.indexes.by_identifier['urn:cip:demo']['SAME-VALUE'] };
    delete padded.indexes.by_identifier['urn:cip:demo']['SAME-VALUE'];
    const before = clone(padded);
    selectorsModule.create(padded);
    assert.deepStrictEqual(padded, before);
});
test('duplicate normalized patient declarations for same patient are accepted', () => {
    const duplicate = fixture();
    duplicate.patients['patient-a'].identifiers.push({ identifier_system: ' urn:cip:demo ', identifier_value: ' SAME-VALUE ' });
    duplicate.indexes.by_identifier[' urn:cip:demo '] = { ' SAME-VALUE ': { patient_id: 'patient-a' } };
    assert.strictEqual(selectorsModule.create(duplicate).findByIdentifier('urn:cip:demo', 'SAME-VALUE').patient_id, 'patient-a');
});
test('duplicate normalized index mappings for same patient are accepted', () => {
    const duplicate = fixture();
    duplicate.indexes.by_identifier[' urn:cip:demo '] = { ' SAME-VALUE ': { patient_id: 'patient-a' } };
    assert.strictEqual(selectorsModule.create(duplicate).findByIdentifier('urn:cip:demo', 'SAME-VALUE').patient_id, 'patient-a');
});
test('patient without identifiers remains valid', () => {
    const unidentified = fixture();
    unidentified.patients['patient-c'].identifiers = [];
    delete unidentified.indexes.by_identifier['urn:cip:demo']['ZZZ-VALUE'];
    assert(selectorsModule.create(unidentified));
});
test('patient without identifiers is not operationally searchable', () => {
    const unidentified = fixture();
    unidentified.patients['patient-c'].identifiers = [];
    delete unidentified.indexes.by_identifier['urn:cip:demo']['ZZZ-VALUE'];
    assert.strictEqual(selectorsModule.create(unidentified).findByIdentifier('urn:cip:demo', 'ZZZ-VALUE'), null);
});
test('patient without identifiers remains technically searchable', () => {
    const unidentified = fixture();
    unidentified.patients['patient-c'].identifiers = [];
    delete unidentified.indexes.by_identifier['urn:cip:demo']['ZZZ-VALUE'];
    assert.strictEqual(selectorsModule.create(unidentified).findByPatientId('patient-c').patient_id, 'patient-c');
});
test('whitespace-only patient identifier system is rejected', () => {
    const invalid = fixture(); invalid.patients['patient-a'].identifiers[0].identifier_system = '   ';
    expectTypeErrorCode('IDENTIFIER_COMPONENT_EMPTY', () => selectorsModule.create(invalid));
});
test('whitespace-only patient identifier value is rejected', () => {
    const invalid = fixture(); invalid.patients['patient-a'].identifiers[0].identifier_value = '   ';
    expectTypeErrorCode('IDENTIFIER_COMPONENT_EMPTY', () => selectorsModule.create(invalid));
});
test('whitespace-only identifier index system is rejected', () => {
    const invalid = fixture(); invalid.indexes.by_identifier['   '] = {};
    expectTypeErrorCode('IDENTIFIER_COMPONENT_EMPTY', () => selectorsModule.create(invalid));
});
test('whitespace-only identifier index value is rejected', () => {
    const invalid = fixture(); invalid.indexes.by_identifier['urn:cip:demo']['   '] = { patient_id: 'patient-a' };
    expectTypeErrorCode('IDENTIFIER_COMPONENT_EMPTY', () => selectorsModule.create(invalid));
});
test('normalized collision between patient declarations is rejected', () => {
    const invalid = fixture(); invalid.patients['patient-b'].identifiers = [{ identifier_system: ' urn:cip:demo ', identifier_value: ' SAME-VALUE ' }];
    expectTypeErrorCode('NORMALIZED_IDENTIFIER_COLLISION', () => selectorsModule.create(invalid));
});
test('patient collision is independent of patient insertion order', () => {
    const invalid = fixture();
    invalid.patients['patient-b'].identifiers = [{ identifier_system: ' urn:cip:demo ', identifier_value: ' SAME-VALUE ' }];
    invalid.patients = reorderedObject(invalid.patients, ['patient-b', 'patient-c', 'patient-a']);
    expectTypeErrorCode('NORMALIZED_IDENTIFIER_COLLISION', () => selectorsModule.create(invalid));
});
test('normalized collision between index mappings is rejected', () => {
    const invalid = fixture(); invalid.indexes.by_identifier[' urn:cip:demo '] = { ' SAME-VALUE ': { patient_id: 'patient-b' } };
    expectTypeErrorCode('NORMALIZED_IDENTIFIER_COLLISION', () => selectorsModule.create(invalid));
});
test('index collision is independent of index insertion order', () => {
    const invalid = fixture();
    invalid.indexes.by_identifier = { ' urn:cip:demo ': { ' SAME-VALUE ': { patient_id: 'patient-b' } }, 'urn:nhc:demo': invalid.indexes.by_identifier['urn:nhc:demo'], 'urn:cip:demo': invalid.indexes.by_identifier['urn:cip:demo'] };
    expectTypeErrorCode('NORMALIZED_IDENTIFIER_COLLISION', () => selectorsModule.create(invalid));
});
test('patient identifier absent from index is rejected', () => {
    const invalid = fixture(); delete invalid.indexes.by_identifier['urn:cip:demo']['SAME-VALUE'];
    expectTypeErrorCode('IDENTIFIER_NOT_INDEXED', () => selectorsModule.create(invalid));
});
test('index identifier absent from patient declarations is rejected', () => {
    const invalid = fixture(); invalid.indexes.by_identifier['urn:cip:demo']['UNDECLARED'] = { patient_id: 'patient-a' };
    expectTypeErrorCode('IDENTIFIER_INDEX_PATIENT_MISMATCH', () => selectorsModule.create(invalid));
});
test('normalized index owner different from patient declaration is rejected', () => {
    const invalid = fixture(); invalid.indexes.by_identifier['urn:cip:demo']['SAME-VALUE'].patient_id = 'patient-b';
    expectTypeErrorCode('IDENTIFIER_INDEX_PATIENT_MISMATCH', () => selectorsModule.create(invalid));
});
test('ambiguous model fails before any first-match lookup can occur', () => {
    const invalid = fixture(); invalid.patients['patient-b'].identifiers = [{ identifier_system: ' urn:cip:demo ', identifier_value: ' SAME-VALUE ' }];
    expectTypeErrorCode('NORMALIZED_IDENTIFIER_COLLISION', () => selectorsModule.create(invalid).findByIdentifier('urn:cip:demo', 'SAME-VALUE'));
});
test('non-string patient identifier system is rejected', () => {
    const invalid = fixture(); invalid.patients['patient-a'].identifiers[0].identifier_system = 1;
    expectTypeErrorCode('IDENTIFIER_COMPONENT_TYPE', () => selectorsModule.create(invalid));
});
test('non-string patient identifier value is rejected', () => {
    const invalid = fixture(); invalid.patients['patient-a'].identifiers[0].identifier_value = false;
    expectTypeErrorCode('IDENTIFIER_COMPONENT_TYPE', () => selectorsModule.create(invalid));
});
test('prototype-like normalized identifier uses null-prototype lookup safely', () => {
    const special = fixture();
    special.patients['patient-c'].identifiers = [{ identifier_system: '__proto__', identifier_value: 'constructor' }];
    delete special.indexes.by_identifier['urn:cip:demo']['ZZZ-VALUE'];
    const specialIndex = Object.create(null);
    Object.keys(special.indexes.by_identifier).forEach(system => { specialIndex[system] = special.indexes.by_identifier[system]; });
    specialIndex.__proto__ = { constructor: { patient_id: 'patient-c' } };
    special.indexes.by_identifier = specialIndex;
    assert.strictEqual(selectorsModule.create(special).findByIdentifier('__proto__', 'constructor').patient_id, 'patient-c');
});

console.log(`farmacia_bridge_v2_patient_selectors_check: PASS (${passed} cases)`);
