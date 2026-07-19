#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORE_PATH = path.join(ROOT, 'scripts', 'farmacia_multitreatment_core.js');
const DATASET_PATH = path.join(ROOT, 'data', 'demo', 'farmacia', 'farmacia_wo8_runtime_v1.json');
const source = fs.readFileSync(CORE_PATH, 'utf8');
let passed = 0;

function test(label, operation) {
    operation();
    passed += 1;
    console.log(`  ✓ ${label}`);
}

function throws(label, operation, pattern) {
    test(label, () => assert.throws(operation, pattern));
}

function exactKeys(value, keys) {
    assert.deepEqual(Object.keys(value), keys);
}

function json(value) {
    return JSON.parse(JSON.stringify(value));
}

const storageWritesOnLoad = [];
const sandbox = {
    window: {},
    console,
    Uint8Array,
    module: { exports: {} },
    exports: {},
    sessionStorage: {
        getItem() { return null; },
        setItem(key) { storageWritesOnLoad.push(key); }
    },
    localStorage: new Proxy({}, {
        get() { throw new Error('localStorage must not be accessed'); }
    })
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: CORE_PATH });
const api = sandbox.window.FarmaciaMultitreatmentCore;

test('exports the eight canonical operations on window', () => {
    assert.ok(api);
    for (const name of [
        'createTreatmentRequest', 'createValidationAct', 'createTreatmentLineFromValidatedRequest',
        'createPreHubTreatmentLine', 'createTreatmentMovement', 'createEmptySessionState',
        'createSessionStore', 'validatePatientState'
    ]) assert.equal(typeof api[name], 'function', name);
});
test('module load performs no session write and never accesses localStorage', () => assert.deepEqual(storageWritesOnLoad, []));

let sequence = 0;
const ids = { idFactory: (prefix) => `${prefix}opaque-${++sequence}` };
const requestInput = {
    patient_id: 'patient-synthetic-A',
    request_type: 'new_start',
    origin: 'manual_fh_capture',
    requested_at: '2026-07-19T08:00:00Z',
    professional_demo_id: 'professional-demo-1',
    drug: { drug_name: 'Synthetic medicine A', active_ingredient: 'Synthetic ingredient A' },
    therapy: {},
    observations: 'Synthetic request',
    created_at: '2026-07-19T08:00:00Z',
    updated_at: '2026-07-19T08:00:00Z'
};
const requestSnapshot = JSON.stringify(requestInput);
const request = api.createTreatmentRequest(requestInput, ids);

test('request has exact minimum shape, req_ prefix, and creates no act/line/movement', () => {
    exactKeys(request, [
        'request_id', 'patient_id', 'request_type', 'origin', 'from_line_id', 'base_line_id',
        'requested_at', 'professional_demo_id', 'drug', 'therapy', 'observations', 'created_at', 'updated_at'
    ]);
    assert.match(request.request_id, /^req_/);
    assert.ok(!('validation_act' in request) && !('line' in request) && !('movement' in request));
});
test('request keeps drug identity and therapy separate', () => {
    const separated = api.createTreatmentRequest({
        patient_id: 'p', request_type: 'new_start', origin: 'unknown',
        drug: { drug_name: 'Identity only', dose_text: 'must not enter drug identity' },
        therapy: { dose_text: 'explicit therapy' }
    }, ids);
    assert.equal(separated.drug.drug_name, 'Identity only');
    assert.ok(!('dose_text' in separated.drug));
    assert.equal(separated.therapy.dose_text, 'explicit therapy');
});
test('request ID is opaque and excludes patient and medicine values', () => {
    assert.ok(!request.request_id.includes(request.patient_id));
    assert.ok(!request.request_id.includes(request.drug.drug_name));
});
test('request creation does not mutate supplied input', () => assert.equal(JSON.stringify(requestInput), requestSnapshot));
throws('switch request requires explicit from_line_id', () => api.createTreatmentRequest({
    patient_id: 'p', request_type: 'switch', origin: 'unknown'
}, ids), /from_line_id/);
throws('add_on request requires explicit base_line_id', () => api.createTreatmentRequest({
    patient_id: 'p', request_type: 'add_on', origin: 'unknown'
}, ids), /base_line_id/);

test('default ID source prefers crypto.randomUUID', () => {
    let randomCalls = 0;
    let fallbackCalls = 0;
    const made = api.createTreatmentRequest({ patient_id: 'p', request_type: 'new_start', origin: 'unknown' }, {
        crypto: {
            randomUUID() { randomCalls += 1; return '00000000-0000-4000-8000-000000000001'; },
            getRandomValues() { fallbackCalls += 1; }
        }
    });
    assert.equal(made.request_id, 'req_00000000-0000-4000-8000-000000000001');
    assert.equal(randomCalls, 1);
    assert.equal(fallbackCalls, 0);
});
test('secure getRandomValues fallback creates prefixed opaque IDs', () => {
    const made = api.createTreatmentRequest({ patient_id: 'p', request_type: 'new_start', origin: 'unknown' }, {
        crypto: { getRandomValues(bytes) { bytes.fill(7); return bytes; } }
    });
    assert.match(made.request_id, /^req_[0-9a-f]{32}$/);
});
throws('identity creation fails without a secure crypto source', () => api.createTreatmentRequest({
    patient_id: 'p', request_type: 'new_start', origin: 'unknown'
}, { crypto: null }), /Secure crypto source unavailable/);
test('identity implementation contains no Date.now or Math.random', () => {
    assert.ok(!source.includes('Date.now'));
    assert.ok(!source.includes('Math.random'));
});

const validationInput = {
    patient_id: request.patient_id,
    request_id: request.request_id,
    result: 'validated',
    performed_at: '2026-07-19T09:00:00Z',
    professional_demo_id: 'professional-demo-2',
    observations: 'Explicit synthetic validation',
    origin: 'manual_fh_capture',
    created_at: '2026-07-19T09:00:00Z'
};
const validationSnapshot = JSON.stringify(validationInput);
const validation = api.createValidationAct(validationInput, ids);
test('validation act has exact immutable-record shape and val_ prefix', () => {
    exactKeys(validation, [
        'validation_act_id', 'patient_id', 'request_id', 'produced_line_id', 'performed_at', 'result',
        'professional_demo_id', 'observations', 'origin', 'created_at'
    ]);
    assert.match(validation.validation_act_id, /^val_/);
    assert.equal(validation.produced_line_id, '');
});
test('validation creation does not mutate supplied input', () => assert.equal(JSON.stringify(validationInput), validationSnapshot));

for (const result of ['pending', 'denied']) {
    throws(`${result} validation rejects nonempty produced_line_id`, () => api.createValidationAct({
        patient_id: request.patient_id, request_id: request.request_id, result, origin: 'unknown',
        produced_line_id: 'line_impossible'
    }, ids), /cannot have produced_line_id/);
    const act = api.createValidationAct({
        patient_id: request.patient_id, request_id: request.request_id, result, origin: 'unknown'
    }, ids);
    throws(`${result} validation cannot produce a line`, () => api.createTreatmentLineFromValidatedRequest(
        request, act, { relationship: 'primary' }, ids
    ), /only a validated act/);
}

const lineInput = {
    relationship: 'primary',
    created_at: '2026-07-19T09:01:00Z',
    updated_at: '2026-07-19T09:01:00Z'
};
const requestBeforeLine = JSON.stringify(request);
const validationBeforeLine = JSON.stringify(validation);
const line = api.createTreatmentLineFromValidatedRequest(request, validation, lineInput, ids);
test('validated act explicitly produces one exact line with line_ prefix', () => {
    exactKeys(line, [
        'line_id', 'patient_id', 'source_request_id', 'source_validation_act_id', 'relationship', 'status',
        'provenance', 'catalog_identity', 'catalog_snapshot', 'drug_name', 'active_ingredient', 'dose_text',
        'presentation', 'route', 'pauta_codigo', 'pauta_label', 'pauta_otro_texto', 'start_date', 'end_date',
        'created_at', 'updated_at'
    ]);
    assert.match(line.line_id, /^line_/);
    assert.equal(line.source_request_id, request.request_id);
    assert.equal(line.source_validation_act_id, validation.validation_act_id);
});
test('produced line is validated_not_started and never inferred active', () => {
    assert.equal(line.status, 'validated_not_started');
    assert.notEqual(line.status, 'active');
    assert.equal(line.provenance, 'validated_in_hub');
});
test('line creation does not mutate request, act, or line input', () => {
    assert.equal(JSON.stringify(request), requestBeforeLine);
    assert.equal(JSON.stringify(validation), validationBeforeLine);
    assert.deepEqual(lineInput, { relationship: 'primary', created_at: '2026-07-19T09:01:00Z', updated_at: '2026-07-19T09:01:00Z' });
});
throws('a validated act can produce at most one line', () => api.createTreatmentLineFromValidatedRequest(
    request, validation, lineInput, { ...ids, existingLines: [line] }
), /already produced/);
throws('produced_line_id also prevents a second line', () => api.createTreatmentLineFromValidatedRequest(
    request, { ...validation, produced_line_id: line.line_id }, lineInput, ids
), /already produced/);
throws('cross-patient request and validation are rejected', () => api.createTreatmentLineFromValidatedRequest(
    request, { ...validation, patient_id: 'patient-synthetic-B' }, lineInput, ids
), /patient mismatch/);

test('absent therapy remains empty on a validated line', () => {
    for (const field of ['dose_text', 'presentation', 'route', 'pauta_codigo', 'pauta_label', 'pauta_otro_texto', 'start_date', 'end_date']) {
        assert.equal(line[field], '', field);
    }
});
test('catalog identity stays separate and cannot fill therapy or status fields', () => {
    const catalogRequest = api.createTreatmentRequest({
        patient_id: 'catalog-patient', request_type: 'new_start', origin: 'unknown',
        drug: {
            drug_name: 'Explicit catalog name',
            catalog_identity: {
                selected_drug_id: 'drug-synthetic-1', source_type: 'CIMA', national_code: 'NC-SYN',
                registration_number: 'REG-SYN', drug_name: 'Catalog descriptive name',
                active_ingredient: 'Catalog descriptive ingredient', dose_text: 'must be ignored', route: 'must be ignored'
            }
        },
        therapy: {}
    }, ids);
    const catalogAct = api.createValidationAct({
        patient_id: 'catalog-patient', request_id: catalogRequest.request_id, result: 'validated', origin: 'unknown'
    }, ids);
    const catalogLine = api.createTreatmentLineFromValidatedRequest(catalogRequest, catalogAct, { relationship: 'additional' }, ids);
    assert.equal(catalogLine.catalog_identity.selected_drug_id, 'drug-synthetic-1');
    exactKeys(catalogLine.catalog_identity, ['selected_drug_id', 'source_type', 'national_code', 'registration_number', 'drug_name', 'active_ingredient']);
    assert.equal(catalogLine.dose_text, '');
    assert.equal(catalogLine.presentation, '');
    assert.equal(catalogLine.route, '');
    assert.equal(catalogLine.pauta_codigo, '');
    assert.equal(catalogLine.relationship, 'additional');
    assert.equal(catalogLine.status, 'validated_not_started');
});

for (const provenance of ['pre_hub_validated', 'pre_hub_existing']) {
    test(`pre-Hub creates one line only and preserves ${provenance}`, () => {
        const pre = api.createPreHubTreatmentLine({
            patient_id: 'pre-hub-patient', drug_name: 'Explicit pre-Hub medicine', relationship: 'additional',
            status: 'historical', provenance
        }, ids);
        assert.equal(pre.provenance, provenance);
        assert.equal(pre.source_request_id, '');
        assert.equal(pre.source_validation_act_id, '');
        assert.equal(pre.dose_text, '');
        assert.equal(pre.route, '');
        assert.ok(!('request' in pre) && !('validation_act' in pre) && !('movement' in pre));
    });
}
test('historical pre-Hub line creates no acts or movements', () => {
    const historical = api.createPreHubTreatmentLine({
        patient_id: 'historical-patient', drug_name: 'Historical synthetic medicine', relationship: 'additional',
        status: 'historical', provenance: 'pre_hub_existing'
    }, ids);
    assert.equal(historical.status, 'historical');
    assert.equal(historical.source_validation_act_id, '');
    assert.ok(!Object.keys(historical).some((key) => key.includes('movement')));
});

throws('switch movement requires both line references', () => api.createTreatmentMovement({
    patient_id: 'p', movement_type: 'switch', from_line_id: 'line-from'
}, ids), /from_line_id and to_line_id/);
throws('add_on movement requires base and added line reference', () => api.createTreatmentMovement({
    patient_id: 'p', movement_type: 'add_on', base_line_id: 'line-base'
}, ids), /added line reference/);
for (const type of ['suspension', 'pause', 'resume', 'optimization', 'completion']) {
    throws(`${type} movement requires target_line_id`, () => api.createTreatmentMovement({
        patient_id: 'p', movement_type: type
    }, ids), /target_line_id/);
}
test('movement has exact mov_ record shape and applies no line state change', () => {
    const suppliedLine = { ...line, status: 'active' };
    const before = JSON.stringify(suppliedLine);
    const movement = api.createTreatmentMovement({
        patient_id: line.patient_id, movement_type: 'pause', target_line_id: line.line_id,
        effective_at: '2026-07-20', reason: 'Explicit synthetic reason', validation_act_id: validation.validation_act_id,
        declared_by_demo: 'professional-demo-3', created_at: '2026-07-19', line: suppliedLine
    }, ids);
    exactKeys(movement, [
        'movement_id', 'patient_id', 'movement_type', 'target_line_id', 'from_line_id', 'to_line_id',
        'base_line_id', 'effective_at', 'reason', 'validation_act_id', 'declared_by_demo', 'created_at'
    ]);
    assert.match(movement.movement_id, /^mov_/);
    assert.equal(JSON.stringify(suppliedLine), before);
    assert.ok(!('status' in movement));
});

function stateWithLines(lines) {
    const state = api.createEmptySessionState();
    state.patients.p = { requests: {}, validation_acts: {}, lines: {}, movements: {}, drafts: {}, selected_line_id: '' };
    for (const item of lines) state.patients.p.lines[item.line_id] = item;
    return state.patients.p;
}
for (const [provenance, status] of [
    ['pre_hub_validated', 'active'],
    ['pre_hub_existing', 'active'],
    ['pre_hub_existing', 'historical']
]) {
    test(`${provenance} remains valid with explicit ${status} status`, () => {
        const preHubLine = {
            ...line, line_id: `line_${provenance}-${status}`, patient_id: 'p', relationship: 'additional',
            provenance, status, source_request_id: '', source_validation_act_id: ''
        };
        assert.equal(api.validatePatientState(stateWithLines([preHubLine])).valid, true);
    });
}
const activePrimary = {
    ...line, line_id: 'line_primary-active', patient_id: 'p', relationship: 'primary', status: 'active',
    provenance: 'pre_hub_existing', source_request_id: '', source_validation_act_id: ''
};
const activeAdditional = {
    ...line, line_id: 'line_additional-active', patient_id: 'p', relationship: 'additional', status: 'active',
    provenance: 'pre_hub_existing', source_request_id: '', source_validation_act_id: ''
};
test('multiple active lines are accepted with explicit relationships', () => {
    assert.equal(api.validatePatientState(stateWithLines([activePrimary, activeAdditional])).valid, true);
});
test('more than one active primary line is rejected', () => {
    const secondPrimary = { ...activePrimary, line_id: 'line_primary-active-2' };
    assert.equal(api.validatePatientState(stateWithLines([activePrimary, secondPrimary])).valid, false);
});
test('unknown is not active', () => {
    const unknownPrimary = { ...activePrimary, line_id: 'line_primary-unknown', status: 'unknown' };
    assert.equal(api.validatePatientState(stateWithLines([activePrimary, unknownPrimary])).valid, true);
});
test('line state is independent from relationship', () => {
    const historicalPrimary = { ...activePrimary, line_id: 'line_historical-primary', status: 'historical' };
    const activeAdditionalOnly = { ...activeAdditional, line_id: 'line_active-additional-only' };
    assert.equal(api.validatePatientState(stateWithLines([historicalPrimary, activeAdditionalOnly])).valid, true);
    assert.equal(historicalPrimary.relationship, 'primary');
    assert.equal(historicalPrimary.status, 'historical');
});

function fakeStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        reads: 0, writes: 0,
        getItem(key) { this.reads += 1; return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { this.writes += 1; values.set(key, String(value)); },
        value(key) { return values.get(key); }
    };
}

const memory = fakeStorage();
const store = api.createSessionStore(memory);
let state = store.createEmpty();
test('empty session state uses the exact key and schema', () => {
    assert.equal(store.key, 'farmaciaDemo.multitreatment.v1');
    assert.deepEqual(json(state), { schema: 'farmaciaDemo.multitreatment.v1', patients: {} });
});
test('session reads do not write', () => {
    assert.deepEqual(json(store.load()), json(store.createEmpty()));
    assert.equal(memory.writes, 0);
});
state = store.upsertRequest(state, request.patient_id, request);
const firstUpsert = JSON.stringify(state);
state = store.upsertRequest(state, request.patient_id, request);
test('repeated collection upsert is idempotent and indexed by ID', () => {
    assert.equal(JSON.stringify(state), firstUpsert);
    assert.equal(state.patients[request.patient_id].requests[request.request_id].request_id, request.request_id);
});
throws('entity patient mismatch is rejected', () => store.upsertRequest(state, 'wrong-patient', request), /patient_id mismatch/);
throws('upsert rejects invalid ID prefix', () => store.upsertRequest(state, request.patient_id, {
    ...request, request_id: 'bad-prefix'
}), /invalid requests entity/);
throws('upsert rejects missing exact-minimum field', () => {
    const malformed = { ...request };
    delete malformed.origin;
    return store.upsertRequest(state, request.patient_id, malformed);
}, /invalid requests entity/);
throws('upsert rejects extra entity field', () => store.upsertRequest(state, request.patient_id, {
    ...request, unexpected: true
}), /invalid requests entity/);
throws('upsert rejects invalid request enum', () => store.upsertRequest(state, request.patient_id, {
    ...request, request_type: 'renewal'
}), /invalid requests entity/);
throws('validation upsert rejects dangling same-patient request reference', () => store.upsertValidationAct(state, request.patient_id, {
    ...validation, request_id: 'req_missing'
}), /invalid patient graph/);

state = store.upsertValidationAct(state, request.patient_id, validation);
const stateWithValidatedLine = store.upsertLine(state, request.patient_id, line);

test('fresh validated-in-Hub line remains canonically valid as validated_not_started without creating other records', () => {
    const before = state.patients[request.patient_id];
    const after = stateWithValidatedLine.patients[request.patient_id];
    assert.equal(after.lines[line.line_id].status, 'validated_not_started');
    assert.equal(api.validatePatientState(after, request.patient_id).valid, true);
    assert.equal(Object.keys(after.requests).length, Object.keys(before.requests).length);
    assert.equal(Object.keys(after.validation_acts).length, Object.keys(before.validation_acts).length);
    assert.equal(Object.keys(after.movements).length, Object.keys(before.movements).length);
});
for (const status of ['active', 'paused', 'suspended', 'completed', 'historical', 'unknown']) {
    throws(`validated-in-Hub line upsert rejects same line changed to ${status}`, () => store.upsertLine(stateWithValidatedLine, request.patient_id, {
        ...line, status
    }), /invalid lines entity/);
}

const patientBLine = api.createPreHubTreatmentLine({
    patient_id: 'patient-synthetic-B', drug_name: 'Synthetic medicine B', relationship: 'additional',
    status: 'active', provenance: 'pre_hub_existing'
}, ids);
state = store.upsertLine(state, request.patient_id, line);
state = store.upsertLine(state, patientBLine.patient_id, patientBLine);
throws('save rejects a manipulated active validated-in-Hub line', () => {
    const invalid = json(state);
    invalid.patients[request.patient_id].lines[line.line_id].status = 'active';
    return store.save(invalid);
}, /invalid session state/);
test('load treats an active validated-in-Hub line as corrupt without writing or correcting its payload', () => {
    const invalid = json(state);
    invalid.patients[request.patient_id].lines[line.line_id].status = 'active';
    const raw = JSON.stringify(invalid);
    const invalidStorage = fakeStorage({ 'farmaciaDemo.multitreatment.v1': raw });
    const invalidStore = api.createSessionStore(invalidStorage);
    assert.deepEqual(json(invalidStore.load()), json(invalidStore.createEmpty()));
    assert.equal(invalidStorage.writes, 0);
    assert.equal(invalidStorage.value('farmaciaDemo.multitreatment.v1'), raw);
});
test('validatePatientState rejects a manipulated active validated-in-Hub line', () => {
    const invalidPatient = json(state.patients[request.patient_id]);
    invalidPatient.lines[line.line_id].status = 'active';
    assert.equal(api.validatePatientState(invalidPatient, request.patient_id).valid, false);
});
const secondCandidate = api.createTreatmentLineFromValidatedRequest(request, validation, {
    relationship: 'additional'
}, ids);
throws('canonical upsert rejects a second line for the same validation act without constructor context', () => {
    return store.upsertLine(state, request.patient_id, secondCandidate);
}, /invalid patient graph/);
throws('validated-in-Hub line upsert rejects dangling request reference', () => store.upsertLine(state, request.patient_id, {
    ...line, line_id: 'line_dangling-request', source_request_id: 'req_missing'
}), /invalid patient graph/);
throws('validated-in-Hub line upsert rejects dangling act reference', () => store.upsertLine(state, request.patient_id, {
    ...line, line_id: 'line_dangling-act', source_validation_act_id: 'val_missing'
}), /invalid patient graph/);
throws('line upsert rejects invalid provenance and status', () => store.upsertLine(state, request.patient_id, {
    ...line, line_id: 'line_invalid-enums', provenance: 'legacy', status: 'started'
}), /invalid lines entity/);
throws('line upsert rejects invalid relationship', () => store.upsertLine(state, request.patient_id, {
    ...line, line_id: 'line_invalid-relationship', relationship: 'concomitant'
}), /invalid lines entity/);
throws('line upsert rejects cross-patient entity leakage', () => store.upsertLine(
    state, request.patient_id, patientBLine
), /entity patient_id mismatch/);
state = store.selectLine(state, request.patient_id, line.line_id);
state = store.selectLine(state, patientBLine.patient_id, patientBLine.line_id);
test('patient partitions and selections remain isolated', () => {
    assert.equal(store.getPatientState(state, request.patient_id).selected_line_id, line.line_id);
    assert.equal(store.getPatientState(state, patientBLine.patient_id).selected_line_id, patientBLine.line_id);
    assert.ok(!store.getPatientState(state, request.patient_id).lines[patientBLine.line_id]);
});
const clearedA = store.clearPatientSelection(state, request.patient_id);
test('clearing one selection does not clear another patient', () => {
    assert.equal(clearedA.patients[request.patient_id].selected_line_id, '');
    assert.equal(clearedA.patients[patientBLine.patient_id].selected_line_id, patientBLine.line_id);
});
test('draft deletion is explicit and limited to the named draft', () => {
    let draftState = store.upsertDraft(state, request.patient_id, 'draft-1', { patient_id: request.patient_id, note: 'one' });
    draftState = store.upsertDraft(draftState, request.patient_id, 'draft-2', { patient_id: request.patient_id, note: 'two' });
    const deleted = store.deleteDraft(draftState, request.patient_id, 'draft-1');
    assert.ok(!deleted.patients[request.patient_id].drafts['draft-1']);
    assert.ok(deleted.patients[request.patient_id].drafts['draft-2']);
});
throws('draft with a different patient_id is rejected', () => store.upsertDraft(
    state, request.patient_id, 'draft-cross-patient', { patient_id: patientBLine.patient_id }
), /draft patient_id mismatch/);

const pauseMovement = api.createTreatmentMovement({
    patient_id: request.patient_id, movement_type: 'pause', target_line_id: line.line_id,
    validation_act_id: validation.validation_act_id
}, ids);
test('movement upsert accepts existing same-patient line and validation references', () => {
    const withMovement = store.upsertMovement(state, request.patient_id, pauseMovement);
    assert.equal(withMovement.patients[request.patient_id].movements[pauseMovement.movement_id].target_line_id, line.line_id);
});
throws('movement upsert rejects dangling required line reference', () => store.upsertMovement(state, request.patient_id, {
    ...pauseMovement, movement_id: 'mov_dangling-line', target_line_id: 'line_missing'
}), /invalid patient graph/);
throws('movement upsert cannot reference another patient partition line', () => store.upsertMovement(state, request.patient_id, {
    ...pauseMovement, movement_id: 'mov_cross-patient-line', target_line_id: patientBLine.line_id
}), /invalid patient graph/);
throws('movement upsert rejects dangling validation reference', () => store.upsertMovement(state, request.patient_id, {
    ...pauseMovement, movement_id: 'mov_dangling-validation', validation_act_id: 'val_missing'
}), /invalid patient graph/);
throws('movement upsert rejects invalid movement enum', () => store.upsertMovement(state, request.patient_id, {
    ...pauseMovement, movement_id: 'mov_invalid-enum', movement_type: 'renewal'
}), /invalid movements entity/);

store.save(state);
test('save writes only canonical session key and round-trips state', () => {
    assert.equal(memory.writes, 1);
    assert.deepEqual(json(store.load()), json(state));
});
test('validated act may be linked later to its exact existing line', () => {
    const linked = store.upsertValidationAct(state, request.patient_id, {
        ...validation, produced_line_id: line.line_id
    });
    assert.equal(linked.patients[request.patient_id].validation_acts[validation.validation_act_id].produced_line_id, line.line_id);
    assert.doesNotThrow(() => store.save(linked));
});
throws('save rejects inconsistent produced_line_id', () => {
    const invalid = json(state);
    invalid.patients[request.patient_id].validation_acts[validation.validation_act_id].produced_line_id = 'line_missing';
    return store.save(invalid);
}, /invalid session state/);
throws('save rejects duplicate line linkage for one validation act', () => {
    const invalid = json(state);
    invalid.patients[request.patient_id].lines[secondCandidate.line_id] = secondCandidate;
    return store.save(invalid);
}, /invalid session state/);
throws('save rejects more than one active primary', () => {
    const invalid = json(state);
    const first = api.createPreHubTreatmentLine({
        patient_id: request.patient_id, drug_name: 'Primary one', relationship: 'primary', status: 'active', provenance: 'pre_hub_existing'
    }, ids);
    const second = api.createPreHubTreatmentLine({
        patient_id: request.patient_id, drug_name: 'Primary two', relationship: 'primary', status: 'active', provenance: 'pre_hub_existing'
    }, ids);
    invalid.patients[request.patient_id].lines[first.line_id] = first;
    invalid.patients[request.patient_id].lines[second.line_id] = second;
    return store.save(invalid);
}, /invalid session state/);
test('restorePatient restores only the exact patient partition', () => {
    let changed = store.clearPatientSelection(state, request.patient_id);
    changed = store.clearPatientSelection(changed, patientBLine.patient_id);
    const restored = store.restorePatient(changed, request.patient_id);
    assert.equal(restored.patients[request.patient_id].selected_line_id, line.line_id);
    assert.equal(restored.patients[patientBLine.patient_id].selected_line_id, '');
});

for (const [label, raw] of [
    ['corrupt JSON', '{not-json'],
    ['unknown schema', JSON.stringify({ schema: 'farmaciaDemo.multitreatment.v0', patients: {} })],
    ['corrupt canonical data', JSON.stringify({ schema: 'farmaciaDemo.multitreatment.v1', patients: { p: { lines: [] } } })]
]) {
    test(`${label} loads as safe empty state without silent write`, () => {
        const invalidStorage = fakeStorage({ 'farmaciaDemo.multitreatment.v1': raw });
        const invalidStore = api.createSessionStore(invalidStorage);
        assert.deepEqual(json(invalidStore.load()), json(invalidStore.createEmpty()));
        assert.equal(invalidStorage.writes, 0);
    });
}
test('selection pointing outside its patient is corrupt and loads empty', () => {
    const invalid = json(state);
    invalid.patients[request.patient_id].selected_line_id = patientBLine.line_id;
    const invalidStorage = fakeStorage({ 'farmaciaDemo.multitreatment.v1': JSON.stringify(invalid) });
    const invalidStore = api.createSessionStore(invalidStorage);
    assert.deepEqual(json(invalidStore.load()), json(invalidStore.createEmpty()));
    assert.equal(invalidStorage.writes, 0);
});
test('load rejects exact-shape entity corruption and graph violations without writing', () => {
    const cases = [];
    const extra = json(state);
    extra.patients[request.patient_id].requests[request.request_id].unexpected = true;
    cases.push(extra);
    const dangling = json(state);
    dangling.patients[request.patient_id].validation_acts[validation.validation_act_id].request_id = 'req_missing';
    cases.push(dangling);
    const duplicate = json(state);
    duplicate.patients[request.patient_id].lines[secondCandidate.line_id] = secondCandidate;
    cases.push(duplicate);
    for (const invalid of cases) {
        const invalidStorage = fakeStorage({ 'farmaciaDemo.multitreatment.v1': JSON.stringify(invalid) });
        const invalidStore = api.createSessionStore(invalidStorage);
        assert.deepEqual(json(invalidStore.load()), json(invalidStore.createEmpty()));
        assert.equal(invalidStorage.writes, 0);
    }
});
test('legacy payload read does not write canonical state', () => {
    const legacy = fakeStorage({
        'farmaciaDemo.multitreatment.v1': JSON.stringify({ version: 0, treatments: [{ id: 'legacy' }] })
    });
    const legacyStore = api.createSessionStore(legacy);
    assert.deepEqual(json(legacyStore.load()), json(legacyStore.createEmpty()));
    assert.equal(legacy.writes, 0);
});
test('source is sessionStorage-only and contains no localStorage dependency', () => {
    assert.ok(source.includes('sessionStorage'));
    assert.ok(!source.includes('localStorage'));
});

test('WO8 dataset hash and embedded source hash remain unchanged', () => {
    const content = fs.readFileSync(DATASET_PATH);
    assert.equal(crypto.createHash('sha256').update(content).digest('hex'), 'f9066c89f28c4956940e5fa92b8d19e0ff13192d659e858501eddbc11767ac9d');
    const parsed = JSON.parse(content.toString('utf8'));
    assert.equal(parsed.metadata.hash, 'ef743757c43f36cf6209133f49a12705e67cba489f4ce5586acd146ea4046e6e');
});

console.log(`\nTotal: ${passed} passed, 0 failed`);
