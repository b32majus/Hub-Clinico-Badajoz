#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await import(path.join(ROOT, 'scripts/farmacia_current_patient_session.js'));
const sessionModule = globalThis.FarmaciaCurrentPatientSession;
const KEY = 'promueve.fh.currentPatientSession.v1';
let passed = 0;

function test(name, callback) {
    callback();
    passed += 1;
    console.log(`PASS ${name}`);
}

function memoryStorage() {
    const values = Object.create(null);
    const operations = [];
    return {
        getItem(key) { operations.push(`get:${key}`); return Object.hasOwn(values, key) ? values[key] : null; },
        setItem(key, value) { operations.push(`set:${key}`); values[key] = String(value); },
        removeItem(key) { operations.push(`remove:${key}`); delete values[key]; },
        values,
        operations
    };
}

function patient(letter, generation = `generation-${letter}`) {
    return {
        identifier: { identifier_system: 'urn:cip:synthetic', identifier_value: `CIP-${letter}` },
        patient_id: `patient-${letter.toLowerCase()}`,
        generation,
        patient_projection: {
            patient_id: `patient-${letter.toLowerCase()}`,
            latest_request: { dose: null, route: '', induction: false, duration: 0 }
        },
        explicit_data: { null_value: null, empty_value: '', false_value: false, zero_value: 0 },
        provenance: [{ source_event_id: `source-${letter}`, physical_row_number: 2 }],
        dirty: false
    };
}

function handoff(input) {
    return { identifier: input.identifier, patient_id: input.patient_id, generation: input.generation };
}

function stored(storage) {
    return JSON.parse(storage.values[KEY]);
}

const storage = memoryStorage();
let session = sessionModule.create({ sessionStorage: storage });
const patientA = patient('A');

test('starts patient A and preserves null, empty, false and zero', () => {
    const result = session.replacePatient(patientA, true);
    assert.equal(result.status, 'active');
    assert.deepEqual(stored(storage).explicit_data, patientA.explicit_data);
});
test('same patient navigation updates safely and drafts stay isolated by page', () => {
    session.saveDraft('validation', { note: '', accepted: false, count: 0, absent: null });
    session.saveDraft('followup', { note: 'synthetic' });
    assert.deepEqual(session.getDraft('validation'), { note: '', accepted: false, count: 0, absent: null });
    assert.deepEqual(session.getDraft('followup'), { note: 'synthetic' });
    const updated = Object.assign({}, patientA, { explicit_data: { combined: true } });
    assert.equal(session.replacePatient(updated, false).status, 'active');
    assert.deepEqual(session.getDraft('validation'), { note: '', accepted: false, count: 0, absent: null });
});
test('reload requires an explicit pending resume decision and continue hydrates', () => {
    session = sessionModule.create({ sessionStorage: storage });
    const boot = session.bootstrap(handoff(patientA));
    assert.equal(boot.status, 'pending_resume_decision');
    assert.equal(Object.hasOwn(boot, 'patient_projection'), false);
    assert.deepEqual(session.getState(), { status: 'pending_resume_decision' });
    const continued = session.resolveResume('continue');
    assert.equal(continued.status, 'active');
    assert.equal(continued.envelope.patient_id, 'patient-a');
});
test('reload restart removes the envelope', () => {
    session = sessionModule.create({ sessionStorage: storage });
    assert.equal(session.bootstrap(handoff(patientA)).status, 'pending_resume_decision');
    assert.equal(session.resolveResume('restart').status, 'empty');
    assert.equal(storage.getItem(KEY), null);
});
test('direct replacement after reload cannot resume stored drafts', () => {
    session.replacePatient(patientA, true);
    session.saveDraft('validation', { previous: true });
    const reloaded = sessionModule.create({ sessionStorage: storage });
    assert.equal(reloaded.replacePatient(patientA, true).status, 'active');
    assert.equal(reloaded.getDraft('validation'), null);
});
test('patient change checks dirty state then purges A before storing B', () => {
    session.replacePatient(patientA, true);
    session.updateCurrent({ dirty: true });
    const patientB = patient('B');
    assert.equal(session.replacePatient(patientB, false).status, 'pending_changes');
    assert.equal(stored(storage).patient_id, 'patient-a');
    storage.operations.length = 0;
    assert.equal(session.replacePatient(patientB, true).status, 'active');
    assert.equal(stored(storage).patient_id, 'patient-b');
    assert.equal(storage.values[KEY].includes('patient-a'), false);
    const removeIndex = storage.operations.indexOf(`remove:${KEY}`);
    const setIndex = storage.operations.indexOf(`set:${KEY}`);
    assert(removeIndex !== -1 && setIndex !== -1 && removeIndex < setIndex);
});
test('storage contains one current patient and no forbidden payload', () => {
    assert.deepEqual(Object.keys(storage.values), [KEY]);
    const raw = storage.values[KEY];
    assert.equal(raw.includes('patient-a'), false);
    assert.doesNotMatch(raw, /workbook|read_model|population|bytes/i);
});
test('new or duplicated tab without handoff starts empty', () => {
    const duplicate = sessionModule.create({ sessionStorage: storage });
    assert.equal(duplicate.bootstrap({}).status, 'empty');
    assert.equal(storage.getItem(KEY), null);
});

function mismatchCase(name, mutate) {
    test(name, () => {
        const localStorage = memoryStorage();
        const initial = sessionModule.create({ sessionStorage: localStorage });
        initial.replacePatient(patientA, true);
        const candidate = handoff(patientA);
        mutate(candidate, localStorage);
        const reloaded = sessionModule.create({ sessionStorage: localStorage });
        assert.equal(reloaded.bootstrap(candidate).status, 'empty');
        assert.equal(localStorage.getItem(KEY), null);
    });
}

mismatchCase('identifier mismatch purges and fails closed', candidate => { candidate.identifier = { identifier_system: 'urn:cip:synthetic', identifier_value: 'OTHER' }; });
mismatchCase('patient_id mismatch purges and fails closed', candidate => { candidate.patient_id = 'patient-other'; });
mismatchCase('generation mismatch purges and fails closed', candidate => { candidate.generation = 'generation-other'; });
mismatchCase('incompatible version purges and fails closed', (candidate, localStorage) => {
    const envelope = JSON.parse(localStorage.values[KEY]); envelope.version = '9.0.0'; localStorage.values[KEY] = JSON.stringify(envelope);
});
mismatchCase('invalid structure purges and fails closed', (candidate, localStorage) => {
    const envelope = JSON.parse(localStorage.values[KEY]); delete envelope.drafts; localStorage.values[KEY] = JSON.stringify(envelope);
});
test('corrupt JSON purges and fails closed', () => {
    const localStorage = memoryStorage();
    localStorage.values[KEY] = '{broken';
    const reloaded = sessionModule.create({ sessionStorage: localStorage });
    assert.equal(reloaded.bootstrap(handoff(patientA)).status, 'empty');
    assert.equal(localStorage.getItem(KEY), null);
});
test('unverifiable purge raises an error and keeps memory empty', () => {
    const localStorage = memoryStorage();
    localStorage.values[KEY] = '{broken';
    localStorage.removeItem = function () { this.operations.push(`ignored-remove:${KEY}`); };
    const reloaded = sessionModule.create({ sessionStorage: localStorage });
    assert.throws(() => reloaded.bootstrap(handoff(patientA)), /SESSION_PURGE_FAILED/);
    assert.deepEqual(reloaded.getState(), { status: 'empty' });
});
test('forbidden source containers are rejected with empty state', () => {
    const localStorage = memoryStorage();
    const localSession = sessionModule.create({ sessionStorage: localStorage });
    const invalid = patient('A');
    invalid.patient_projection.workbook = { rows: [] };
    assert.throws(() => localSession.replacePatient(invalid, true), /SESSION_FORBIDDEN_DATA/);
    assert.equal(localStorage.getItem(KEY), null);
    assert.deepEqual(localSession.getState(), { status: 'empty' });
});
test('module uses only the approved sessionStorage key', () => {
    assert.equal(sessionModule.STORAGE_KEY, KEY);
    assert.equal(sessionModule.SESSION_VERSION, '1.0.0');
});

console.log(`farmacia_current_patient_session_check: PASS (${passed} cases)`);
