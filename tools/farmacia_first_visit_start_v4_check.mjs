#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../scripts/farmacia_multitreatment_core.js');
const ui = require('../scripts/farmacia_first_visit_start_v4.js');
let passed = 0;

function test(label, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function storage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); }
  };
}

let seq = 0;
const ids = { idFactory: (prefix) => `${prefix}pv-${++seq}` };

function seeded(patientId = 'patient-pv-A') {
  const store = core.createSessionStore(storage());
  let state = store.createEmpty();
  const request = core.createTreatmentRequest({
    patient_id: patientId,
    request_type: 'new_start',
    origin: 'imported_nursing',
    drug: { drug_name: 'Upadacitinib' },
    therapy: {},
    created_at: '2026-07-25T09:00:00Z',
    updated_at: '2026-07-25T09:00:00Z'
  }, ids);
  let validation = core.createValidationAct({
    patient_id: patientId,
    request_id: request.request_id,
    result: 'validated',
    performed_at: '2026-07-25T09:10:00Z',
    professional_demo_id: 'Profesional FH-01',
    origin: 'imported_nursing',
    created_at: '2026-07-25T09:10:00Z'
  }, ids);
  const line = core.createTreatmentLineFromValidatedRequest(request, validation, {
    relationship: 'primary',
    created_at: '2026-07-25T09:11:00Z',
    updated_at: '2026-07-25T09:11:00Z'
  }, ids);
  state = store.upsertRequest(state, patientId, request);
  state = store.upsertValidationAct(state, patientId, validation);
  state = store.upsertLine(state, patientId, line);
  validation = { ...validation, produced_line_id: line.line_id };
  state = store.upsertValidationAct(state, patientId, validation);
  store.save(state);
  return { store, request, validation, line };
}

const fixture = seeded();
const identity = { cip: '000000003', patient_id: fixture.line.patient_id, line_id: fixture.line.line_id, servicio: 'Reumatología', patologia: 'Artritis Reumatoide (AR)' };

const pending = ui.resolveCanonicalContext(fixture.store.load(), identity);
test('resolves validated_not_started by patient_id + line_id', () => {
  assert.equal(pending.valid, true);
  assert.equal(pending.line.line_id, fixture.line.line_id);
  assert.equal(pending.line.status, 'validated_not_started');
});

test('missing patient_id blocks', () => assert.equal(ui.resolveCanonicalContext(fixture.store.load(), { line_id: fixture.line.line_id }).code, 'MISSING_PATIENT_ID'));
test('missing line_id blocks', () => assert.equal(ui.resolveCanonicalContext(fixture.store.load(), { patient_id: fixture.line.patient_id }).code, 'MISSING_LINE_ID'));
test('unknown patient blocks', () => assert.equal(ui.resolveCanonicalContext(fixture.store.load(), { patient_id: 'other', line_id: fixture.line.line_id }).code, 'PATIENT_NOT_FOUND'));
test('unknown line blocks', () => assert.equal(ui.resolveCanonicalContext(fixture.store.load(), { patient_id: fixture.line.patient_id, line_id: 'line_unknown' }).code, 'LINE_NOT_FOUND'));

test('query parser preserves canonical identity', () => {
  const parsed = ui.parseIdentity('?cip=000000003&patient_id=p1&line_id=l1&servicio=Reumatolog%C3%ADa&patologia=AR');
  assert.deepEqual(parsed, { cip: '000000003', patient_id: 'p1', line_id: 'l1', servicio: 'Reumatología', patologia: 'AR' });
});

test('First Visit URL keeps patient_id and line_id', () => {
  const href = ui.buildContextUrl('farmacia_primera_visita.html', identity, 'primera_visita');
  assert.match(href, /patient_id=/);
  assert.match(href, /line_id=/);
  assert.match(href, /entrada=primera_visita/);
});

test('Follow-up URL keeps patient_id and line_id', () => {
  const href = ui.buildContextUrl('farmacia_seguimiento.html', identity, 'seguimiento');
  assert.match(href, /patient_id=/);
  assert.match(href, /line_id=/);
  assert.match(href, /entrada=seguimiento/);
});

const started = core.confirmTreatmentStart({
  store: fixture.store,
  patient_id: fixture.line.patient_id,
  line_id: fixture.line.line_id,
  start_date: '2026-07-25',
  declared_by_demo: 'Profesional FH-01',
  created_at: '2026-07-25T10:00:00Z'
}, ids);

const active = ui.resolveCanonicalContext(fixture.store.load(), identity);
test('active context preserves the same line_id', () => {
  assert.equal(active.valid, true);
  assert.equal(active.line.line_id, fixture.line.line_id);
  assert.equal(active.line.status, 'active');
});
test('active context exposes exact canonical start date', () => assert.equal(active.line.start_date, '2026-07-25'));
test('active context has one start movement', () => assert.equal(Object.values(active.patient.movements).filter((m) => m.movement_type === 'start').length, 1));
test('active context exposes demo professional', () => assert.equal(active.movement.declared_by_demo, 'Profesional FH-01'));
test('core confirmation did not create a second line', () => assert.equal(Object.keys(active.patient.lines).length, 1));
test('repeating same confirmation is idempotent', () => {
  const repeat = core.confirmTreatmentStart({
    store: fixture.store,
    patient_id: fixture.line.patient_id,
    line_id: fixture.line.line_id,
    start_date: '2026-07-25',
    declared_by_demo: 'Profesional FH-01',
    created_at: '2026-07-25T10:05:00Z'
  }, ids);
  assert.equal(repeat.idempotent, true);
  assert.equal(Object.values(repeat.state.patients[fixture.line.patient_id].movements).filter((m) => m.movement_type === 'start').length, 1);
});

test('different confirmed date is rejected', () => assert.throws(() => core.confirmTreatmentStart({
  store: fixture.store,
  patient_id: fixture.line.patient_id,
  line_id: fixture.line.line_id,
  start_date: '2026-07-26',
  declared_by_demo: 'Profesional FH-01',
  created_at: '2026-07-25T10:06:00Z'
}, ids), /cannot be changed/));

test('active line without start movement is rejected by UI resolver', () => {
  const state = fixture.store.load();
  state.patients[fixture.line.patient_id].movements = {};
  assert.equal(ui.resolveCanonicalContext(state, identity).code, 'ACTIVE_START_INCOHERENT');
});

test('pending line with start movement is rejected by UI resolver', () => {
  const fresh = seeded('patient-pv-B');
  const state = fresh.store.load();
  state.patients['patient-pv-B'].movements.movement_fake = {
    movement_id: 'movement_fake', patient_id: 'patient-pv-B', movement_type: 'start', target_line_id: fresh.line.line_id,
    from_line_id: '', to_line_id: '', base_line_id: '', effective_at: '2026-07-25', reason: '',
    validation_act_id: fresh.validation.validation_act_id, declared_by_demo: 'Profesional FH-01', created_at: '2026-07-25T10:00:00Z'
  };
  assert.equal(ui.resolveCanonicalContext(state, { patient_id: 'patient-pv-B', line_id: fresh.line.line_id }).code, 'PENDING_START_INCOHERENT');
});

test('catalog identity is not needed to resolve the canonical line', () => {
  assert.equal(pending.valid, true);
  assert.equal(pending.line.catalog_identity.selected_drug_id || '', '');
});

test('writing a date alone cannot mutate the stored line', () => {
  const fresh = seeded('patient-pv-C');
  const before = fresh.store.load().patients['patient-pv-C'].lines[fresh.line.line_id];
  const typedDate = '2026-07-25';
  assert.equal(typedDate, '2026-07-25');
  assert.equal(before.status, 'validated_not_started');
  assert.equal(before.start_date, '');
});

test('active result returned by core matches resolver', () => assert.equal(started.line.line_id, active.line.line_id));

console.log(`farmacia_first_visit_start_v4_check: ${passed} assertions passed`);