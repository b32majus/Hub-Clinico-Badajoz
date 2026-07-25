#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = require(path.join(ROOT, 'scripts/farmacia_multitreatment_core.js'));
const model = require(path.join(ROOT, 'scripts/farmacia_validation_state_v4_model.js'));

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

const rectificationSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_validation_state_v4_rectification.js'), 'utf8');
const context = { FarmaciaValidationStateV4Model: model };
vm.runInNewContext(rectificationSource, context);
assert.ok(context.FarmaciaValidationRectificationV4);

const storage = memoryStorage();
const store = core.createSessionStore(storage);
const patientId = 'fhv4-rectification-check';
const identity = model.emptyCatalogIdentity();
const explicit = {
  saved_at: '2026-07-25T10:00:00.000Z',
  drug: { drug_name: 'Upadacitinib', active_ingredient: '', catalog_identity: identity, catalog_snapshot: identity },
  therapy: { dose_text: '', presentation: '', route: '', pauta_codigo: '', pauta_label: '', pauta_otro_texto: '' },
  line: { relationship: 'primary', drug_name: 'Upadacitinib', active_ingredient: '', dose_text: '', presentation: '', route: '', pauta_codigo: '', pauta_label: '', pauta_otro_texto: '', catalog_identity: identity, catalog_snapshot: identity, start_date: '', end_date: '' }
};

model.seedPatientState({
  core,
  store,
  patientId,
  dataSource: {
    getRequestsByPatientId() {
      return [{ request_id: 'req-rectification', request_type: 'new_start', origin: 'imported_nursing', requested_drug_name: 'Upadacitinib' }];
    },
    getValidationActsByPatientId() { return []; },
    getCanonicalLinesByPatientId() { return []; }
  }
});

let saved = model.saveDecision({ core, store, patientId, result: 'validated', explicit, performedAt: '2026-07-25T10:01:00.000Z' });
assert.equal(saved.validation_act.result, 'validated');
assert.equal(Object.keys(saved.patient.lines).length, 1);
assert.equal(saved.line.status, 'validated_not_started');

saved = model.saveDecision({ core, store, patientId, result: 'pending', explicit, performedAt: '2026-07-25T10:02:00.000Z' });
assert.equal(saved.validation_act.result, 'pending');
assert.equal(saved.validation_act.produced_line_id, '');
assert.equal(Object.keys(saved.patient.lines).length, 0);

saved = model.saveDecision({ core, store, patientId, result: 'validated', explicit, performedAt: '2026-07-25T10:03:00.000Z' });
assert.equal(Object.keys(saved.patient.lines).length, 1);

saved = model.saveDecision({ core, store, patientId, result: 'denied', denialReason: 'Error de selección demo', explicit, performedAt: '2026-07-25T10:04:00.000Z' });
assert.equal(saved.validation_act.result, 'denied');
assert.equal(saved.validation_act.produced_line_id, '');
assert.equal(Object.keys(saved.patient.lines).length, 0);

saved = model.saveDecision({ core, store, patientId, result: 'validated', explicit, performedAt: '2026-07-25T10:05:00.000Z' });
let activeState = store.load();
const activePatient = activeState.patients[patientId];
const activeLineId = Object.keys(activePatient.lines)[0];
activePatient.lines[activeLineId].status = 'active';
activePatient.lines[activeLineId].start_date = '2026-07-25';
store.save(activeState);
assert.throws(() => model.saveDecision({ core, store, patientId, result: 'pending', explicit, performedAt: '2026-07-25T10:06:00.000Z' }), /ya se inició/);

console.log('farmacia_validation_rectification_v4_check: PASSED_REVERSIBLE_BEFORE_FIRST_VISIT');
