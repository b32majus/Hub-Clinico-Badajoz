#!/usr/bin/env node

import assert from 'node:assert/strict';
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

let sequence = 0;
function idFactory(prefix) {
    sequence += 1;
    return `${prefix}followup_${sequence}`;
}

function seedPendingStart() {
    const storage = memoryStorage();
    const store = core.createSessionStore(storage);
    const patientId = 'fhv4-import-nursing-000000003';
    let state = core.createEmptySessionState();
    const request = core.createTreatmentRequest({
        patient_id: patientId,
        request_type: 'new_start',
        origin: 'imported_nursing',
        requested_at: '2026-07-25T17:00:00.000Z',
        professional_demo_id: 'Profesional FH-01',
        drug: { drug_name: 'Upadacitinib', active_ingredient: '', catalog_identity: {}, catalog_snapshot: {} },
        therapy: {},
        observations: '',
        created_at: '2026-07-25T17:00:00.000Z',
        updated_at: '2026-07-25T17:00:00.000Z'
    }, { idFactory });
    state = store.upsertRequest(state, patientId, request);
    const validation = core.createValidationAct({
        patient_id: patientId,
        request_id: request.request_id,
        produced_line_id: '',
        performed_at: '2026-07-25T17:01:00.000Z',
        result: 'validated',
        professional_demo_id: 'Profesional FH-01',
        observations: '',
        origin: 'imported_nursing',
        created_at: '2026-07-25T17:01:00.000Z'
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
        created_at: '2026-07-25T17:01:00.000Z',
        updated_at: '2026-07-25T17:01:00.000Z'
    }, { idFactory, existingLines: [] });
    state = store.upsertLine(state, patientId, line);
    state = store.upsertValidationAct(state, patientId, { ...validation, produced_line_id: line.line_id });
    store.save(state);
    return { storage, store, patientId, line };
}

const seeded = seedPendingStart();
const search = `?cip=000000003&patient_id=${seeded.patientId}&line_id=${seeded.line.line_id}&servicio=reumatologia&patologia=Artritis%20reumatoide&entrada=primera_visita`;
const identity = adapter.readIdentity(search);
const pending = adapter.resolveCanonicalContext({ identity, core, storage: seeded.storage });
assert.equal(pending.ok, true);
assert.equal(pending.line.status, 'validated_not_started');
assert.equal(adapter.buildFollowupHref({ location: { search }, URLSearchParams }, pending), '', 'Follow-up must remain blocked before explicit start');

core.confirmTreatmentStart({
    store: seeded.store,
    patient_id: seeded.patientId,
    line_id: seeded.line.line_id,
    start_date: '2026-07-21',
    declared_by_demo: 'Profesional FH-01',
    created_at: '2026-07-25T17:05:00.000Z'
}, { idFactory });

const active = adapter.resolveCanonicalContext({ identity, core, storage: seeded.storage });
assert.equal(active.ok, true);
assert.equal(active.line.status, 'active');
const href = adapter.buildFollowupHref({ location: { search }, URLSearchParams }, active);
const url = new URL(href, 'https://example.invalid/');
assert.equal(url.pathname, '/farmacia_seguimiento.html');
assert.equal(url.searchParams.get('cip'), '000000003');
assert.equal(url.searchParams.get('patient_id'), seeded.patientId);
assert.equal(url.searchParams.get('line_id'), seeded.line.line_id);
assert.equal(url.searchParams.get('servicio'), 'reumatologia');
assert.equal(url.searchParams.get('patologia'), 'Artritis reumatoide');
assert.equal(url.searchParams.get('entrada'), 'seguimiento');

const mismatch = { ...active, line_id: 'line_other' };
assert.equal(adapter.buildFollowupHref({ location: { search }, URLSearchParams }, mismatch).includes('line_id=line_other'), true, 'builder must use the resolved canonical result passed to it');
assert.equal(adapter.buildFollowupHref({ location: { search }, URLSearchParams }, { ok: false, patient_id: seeded.patientId, line_id: seeded.line.line_id, line: null }), '');
assert.equal(typeof adapter.setFollowupAccess, 'function');

console.log('farmacia_first_visit_followup_handoff_v4_check: PASSED_ACTIVE_ONLY_CANONICAL_HANDOFF');
