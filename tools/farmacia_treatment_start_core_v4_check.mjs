#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../scripts/farmacia_multitreatment_core.js');
let passed = 0;

function test(label, operation) {
  operation();
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function throws(label, operation, pattern) {
  test(label, () => assert.throws(operation, pattern));
}

function memoryStorage() {
  const data = new Map();
  let writes = 0;
  let failWrites = false;
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) {
      if (failWrites) throw new Error('synthetic storage failure');
      writes += 1;
      data.set(key, String(value));
    },
    snapshot() { return new Map(data); },
    writes() { return writes; },
    fail(value) { failWrites = !!value; }
  };
}

let seq = 0;
const ids = { idFactory: (prefix) => `${prefix}start-${++seq}` };

function seedValidatedLine(storage, patientId = 'patient-start-A') {
  const store = core.createSessionStore(storage);
  let state = store.createEmpty();
  const request = core.createTreatmentRequest({
    patient_id: patientId,
    request_type: 'new_start',
    origin: 'imported_nursing',
    drug: { drug_name: 'Synthetic medicine' },
    therapy: {},
    created_at: '2026-07-25T09:00:00Z',
    updated_at: '2026-07-25T09:00:00Z'
  }, ids);
  let act = core.createValidationAct({
    patient_id: patientId,
    request_id: request.request_id,
    result: 'validated',
    performed_at: '2026-07-25T09:10:00Z',
    professional_demo_id: 'professional-demo-validator',
    origin: 'imported_nursing',
    created_at: '2026-07-25T09:10:00Z'
  }, ids);
  const line = core.createTreatmentLineFromValidatedRequest(request, act, {
    relationship: 'primary',
    created_at: '2026-07-25T09:11:00Z',
    updated_at: '2026-07-25T09:11:00Z'
  }, ids);
  state = store.upsertRequest(state, patientId, request);
  state = store.upsertValidationAct(state, patientId, act);
  state = store.upsertLine(state, patientId, line);
  act = { ...act, produced_line_id: line.line_id };
  state = store.upsertValidationAct(state, patientId, act);
  store.save(state);
  return { store, request, act, line };
}

const storage = memoryStorage();
const seeded = seedValidatedLine(storage);
const beforeWrites = storage.writes();

const started = core.confirmTreatmentStart({
  store: seeded.store,
  patient_id: seeded.line.patient_id,
  line_id: seeded.line.line_id,
  start_date: '2026-07-25',
  declared_by_demo: 'professional-demo-fh',
  created_at: '2026-07-25T10:00:00Z'
}, ids);

test('exports confirmTreatmentStart', () => assert.equal(typeof core.confirmTreatmentStart, 'function'));
test('activates the same canonical line', () => {
  assert.equal(started.line.line_id, seeded.line.line_id);
  assert.equal(started.line.status, 'active');
  assert.equal(started.line.start_date, '2026-07-25');
  assert.equal(started.idempotent, false);
});
test('creates exactly one explicit start movement', () => {
  const patient = started.state.patients[seeded.line.patient_id];
  const starts = Object.values(patient.movements).filter((movement) => movement.movement_type === 'start');
  assert.equal(starts.length, 1);
  assert.equal(starts[0].target_line_id, seeded.line.line_id);
  assert.equal(starts[0].effective_at, '2026-07-25');
  assert.equal(starts[0].validation_act_id, seeded.act.validation_act_id);
  assert.equal(starts[0].declared_by_demo, 'professional-demo-fh');
});
test('persists the transaction exactly once', () => assert.equal(storage.writes(), beforeWrites + 1));
test('restores active line and start movement from storage', () => {
  const restored = seeded.store.load();
  const patient = restored.patients[seeded.line.patient_id];
  assert.equal(patient.lines[seeded.line.line_id].status, 'active');
  assert.equal(Object.values(patient.movements).filter((movement) => movement.movement_type === 'start').length, 1);
});
test('repeating the same confirmation is idempotent and performs no write', () => {
  const writes = storage.writes();
  const repeated = core.confirmTreatmentStart({
    store: seeded.store,
    patient_id: seeded.line.patient_id,
    line_id: seeded.line.line_id,
    start_date: '2026-07-25',
    declared_by_demo: 'professional-demo-fh',
    created_at: '2026-07-25T10:05:00Z'
  }, ids);
  assert.equal(repeated.idempotent, true);
  assert.equal(repeated.line.line_id, seeded.line.line_id);
  assert.equal(storage.writes(), writes);
});
throws('rejects changing an already confirmed start date', () => core.confirmTreatmentStart({
  store: seeded.store,
  patient_id: seeded.line.patient_id,
  line_id: seeded.line.line_id,
  start_date: '2026-07-26',
  declared_by_demo: 'professional-demo-fh',
  created_at: '2026-07-25T10:06:00Z'
}, ids), /cannot be changed/);
throws('rejects empty clinical start date', () => core.confirmTreatmentStart({
  store: seeded.store,
  patient_id: seeded.line.patient_id,
  line_id: seeded.line.line_id,
  start_date: '',
  declared_by_demo: 'professional-demo-fh',
  created_at: '2026-07-25T10:07:00Z'
}, ids), /start_date is required/);
throws('rejects empty demo professional', () => core.confirmTreatmentStart({
  store: seeded.store,
  patient_id: seeded.line.patient_id,
  line_id: seeded.line.line_id,
  start_date: '2026-07-25',
  declared_by_demo: '',
  created_at: '2026-07-25T10:07:00Z'
}, ids), /declared_by_demo is required/);
throws('rejects unknown line', () => core.confirmTreatmentStart({
  store: seeded.store,
  patient_id: seeded.line.patient_id,
  line_id: 'line_unknown',
  start_date: '2026-07-25',
  declared_by_demo: 'professional-demo-fh',
  created_at: '2026-07-25T10:07:00Z'
}, ids), /line not found/);
throws('rejects wrong patient partition', () => core.confirmTreatmentStart({
  store: seeded.store,
  patient_id: 'patient-other',
  line_id: seeded.line.line_id,
  start_date: '2026-07-25',
  declared_by_demo: 'professional-demo-fh',
  created_at: '2026-07-25T10:07:00Z'
}, ids), /patient not found/);

test('validated_not_started graph is valid before start', () => {
  const freshStorage = memoryStorage();
  const fresh = seedValidatedLine(freshStorage, 'patient-start-B');
  const graph = fresh.store.load().patients['patient-start-B'];
  assert.deepEqual(core.validatePatientState(graph, 'patient-start-B'), { valid: true, errors: [] });
});

test('active validated-in-Hub line without start movement is invalid', () => {
  const freshStorage = memoryStorage();
  const fresh = seedValidatedLine(freshStorage, 'patient-start-C');
  const graph = fresh.store.load().patients['patient-start-C'];
  graph.lines[fresh.line.line_id].status = 'active';
  graph.lines[fresh.line.line_id].start_date = '2026-07-25';
  const result = core.validatePatientState(graph, 'patient-start-C');
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /exactly one start movement/.test(error)));
});

test('validated_not_started line with a start movement is invalid', () => {
  const freshStorage = memoryStorage();
  const fresh = seedValidatedLine(freshStorage, 'patient-start-D');
  const graph = fresh.store.load().patients['patient-start-D'];
  const movement = core.createTreatmentMovement({
    patient_id: 'patient-start-D',
    movement_type: 'start',
    target_line_id: fresh.line.line_id,
    effective_at: '2026-07-25',
    validation_act_id: fresh.act.validation_act_id,
    declared_by_demo: 'professional-demo-fh',
    created_at: '2026-07-25T10:00:00Z'
  }, ids);
  graph.movements[movement.movement_id] = movement;
  const result = core.validatePatientState(graph, 'patient-start-D');
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /cannot have start movement/.test(error)));
});

for (const field of ['target_line_id', 'effective_at', 'validation_act_id', 'declared_by_demo']) {
  throws(`start movement requires ${field}`, () => {
    const input = {
      patient_id: 'p', movement_type: 'start', target_line_id: 'line_x', effective_at: '2026-07-25',
      validation_act_id: 'val_x', declared_by_demo: 'professional-demo', created_at: '2026-07-25T10:00:00Z'
    };
    input[field] = '';
    core.createTreatmentMovement(input, ids);
  }, new RegExp(field));
}
throws('start movement rejects unrelated line references', () => core.createTreatmentMovement({
  patient_id: 'p', movement_type: 'start', target_line_id: 'line_x', from_line_id: 'line_y',
  effective_at: '2026-07-25', validation_act_id: 'val_x', declared_by_demo: 'professional-demo'
}, ids), /cannot include/);

test('storage failure leaves the original validated_not_started graph untouched', () => {
  const failingStorage = memoryStorage();
  const fresh = seedValidatedLine(failingStorage, 'patient-start-E');
  const before = failingStorage.snapshot();
  failingStorage.fail(true);
  assert.throws(() => core.confirmTreatmentStart({
    store: fresh.store,
    patient_id: 'patient-start-E',
    line_id: fresh.line.line_id,
    start_date: '2026-07-25',
    declared_by_demo: 'professional-demo-fh',
    created_at: '2026-07-25T10:00:00Z'
  }, ids), /synthetic storage failure/);
  assert.deepEqual([...failingStorage.snapshot().entries()], [...before.entries()]);
  failingStorage.fail(false);
  const restored = fresh.store.load().patients['patient-start-E'];
  assert.equal(restored.lines[fresh.line.line_id].status, 'validated_not_started');
  assert.equal(Object.keys(restored.movements).length, 0);
});

console.log(`farmacia_treatment_start_core_v4_check: ${passed} assertions passed`);
