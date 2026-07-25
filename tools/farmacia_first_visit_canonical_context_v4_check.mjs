#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = require(path.join(ROOT, 'scripts/farmacia_multitreatment_core.js'));
const adapter = require(path.join(ROOT, 'scripts/farmacia_first_visit_identity_v4.js'));

function memoryStorage() {
    const data = new Map();
    return {
        getItem(key) { return data.has(key) ? data.get(key) : null; },
        setItem(key, value) { data.set(key, String(value)); },
        removeItem(key) { data.delete(key); }
    };
}

function idFactory(prefix) {
    return `${prefix}canonical_context_001`;
}

function buildValidatedNotStartedStore() {
    const storage = memoryStorage();
    const store = core.createSessionStore(storage);
    const patientId = 'fhv4-import-nursing-000000003';
    let state = core.createEmptySessionState();
    const request = core.createTreatmentRequest({
        patient_id: patientId,
        request_type: 'new_start',
        origin: 'imported_nursing',
        requested_at: '2026-07-25T16:00:00.000Z',
        professional_demo_id: 'Profesional FH-01',
        drug: { drug_name: 'Upadacitinib', active_ingredient: '', catalog_identity: {}, catalog_snapshot: {} },
        therapy: {},
        observations: '',
        created_at: '2026-07-25T16:00:00.000Z',
        updated_at: '2026-07-25T16:00:00.000Z'
    }, { idFactory });
    state = store.upsertRequest(state, patientId, request);

    const validation = core.createValidationAct({
        patient_id: patientId,
        request_id: request.request_id,
        produced_line_id: '',
        performed_at: '2026-07-25T16:01:00.000Z',
        result: 'validated',
        professional_demo_id: 'Profesional FH-01',
        observations: '',
        origin: 'imported_nursing',
        created_at: '2026-07-25T16:01:00.000Z'
    }, { idFactory });
    state = store.upsertValidationAct(state, patientId, validation);

    const line = core.createTreatmentLineFromValidatedRequest(request, validation, {
        relationship: 'primary',
        drug_name: 'Upadacitinib',
        active_ingredient: '',
        dose_text: '',
        presentation: '',
        route: '',
        pauta_codigo: '',
        pauta_label: '',
        pauta_otro_texto: '',
        start_date: '',
        end_date: '',
        created_at: '2026-07-25T16:01:00.000Z',
        updated_at: '2026-07-25T16:01:00.000Z'
    }, { idFactory, existingLines: [] });
    state = store.upsertLine(state, patientId, line);
    state = store.upsertValidationAct(state, patientId, { ...validation, produced_line_id: line.line_id });
    store.save(state);
    return { storage, store, patientId, line };
}

const seeded = buildValidatedNotStartedStore();
const identity = adapter.readIdentity(`?cip=000000003&patient_id=${seeded.patientId}&line_id=${seeded.line.line_id}`);
assert.deepEqual(identity, {
    patient_id: seeded.patientId,
    line_id: seeded.line.line_id,
    cip: '000000003'
});

const ready = adapter.resolveCanonicalContext({ identity, core, storage: seeded.storage });
assert.equal(ready.ok, true);
assert.equal(ready.code, 'CANONICAL_CONTEXT_READY');
assert.equal(ready.patient_id, seeded.patientId);
assert.equal(ready.line_id, seeded.line.line_id);
assert.equal(ready.line.line_id, seeded.line.line_id);
assert.equal(ready.line.patient_id, seeded.patientId);
assert.equal(ready.line.status, 'validated_not_started');
assert.equal(ready.line.start_date, '');
assert.equal(ready.line.drug_name, 'Upadacitinib');
assert.equal(ready.validation_act.result, 'validated');
assert.equal(ready.validation_act.produced_line_id, seeded.line.line_id);

assert.equal(adapter.resolveCanonicalContext({ identity: { patient_id: '', line_id: '' }, core, storage: seeded.storage }).code, 'MISSING_IDENTITY');
assert.equal(adapter.resolveCanonicalContext({ identity: { patient_id: seeded.patientId, line_id: '' }, core, storage: seeded.storage }).code, 'MISSING_IDENTITY');
assert.equal(adapter.resolveCanonicalContext({ identity: { patient_id: 'missing-patient', line_id: seeded.line.line_id }, core, storage: seeded.storage }).code, 'PATIENT_NOT_FOUND');
assert.equal(adapter.resolveCanonicalContext({ identity: { patient_id: seeded.patientId, line_id: 'line_missing' }, core, storage: seeded.storage }).code, 'LINE_NOT_FOUND');
assert.equal(adapter.resolveCanonicalContext({ identity, core: null, storage: seeded.storage }).code, 'CORE_UNAVAILABLE');

const started = core.confirmTreatmentStart({
    store: seeded.store,
    patient_id: seeded.patientId,
    line_id: seeded.line.line_id,
    start_date: '2026-07-25',
    declared_by_demo: 'Profesional FH-01',
    created_at: '2026-07-25T16:05:00.000Z'
}, { idFactory: (prefix) => `${prefix}started_context_001` });
assert.equal(started.line.status, 'active');
const active = adapter.resolveCanonicalContext({ identity, core, storage: seeded.storage });
assert.equal(active.ok, true);
assert.equal(active.code, 'CANONICAL_START_CONFIRMED');
assert.equal(active.line.status, 'active');
assert.equal(active.line.start_date, '2026-07-25');
assert.equal(active.start_movement.movement_type, 'start');
assert.equal(active.start_movement.target_line_id, seeded.line.line_id);

const source = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_first_visit_identity_v4.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'farmacia_primera_visita.html'), 'utf8');
assert.match(source, /state\.patients\[patientId\]/);
assert.match(source, /patient\.lines\[lineId\]/);
assert.match(source, /validationAct\.produced_line_id/);
assert.doesNotMatch(source, /lines\s*\[\s*0\s*\]/);
assert.doesNotMatch(source, /Object\.values\([^)]*lines[^)]*\)\s*\[\s*0\s*\]/);
assert.doesNotMatch(source, /drug_name\s*===/);
assert.match(html, /id="fhPvCanonicalContext"/);
assert.match(html, /id="fhPvCanonicalPatientId"/);
assert.match(html, /id="fhPvCanonicalLineId"/);
assert.match(html, /scripts\/farmacia_multitreatment_core\.js/);
assert.match(html, /scripts\/farmacia_first_visit_identity_v4\.js/);
assert.ok(html.indexOf('scripts/farmacia_multitreatment_core.js') < html.indexOf('scripts/farmacia_first_visit_identity_v4.js'), 'core must load before the First Visit identity adapter');

console.log('farmacia_first_visit_canonical_context_v4_check: PASSED_EXACT_PATIENT_LINE_AND_ACTIVE_RESTORE');
