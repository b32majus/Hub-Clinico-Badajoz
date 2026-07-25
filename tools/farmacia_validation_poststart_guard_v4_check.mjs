#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GUARD_PATH = path.join(ROOT, 'scripts/farmacia_validation_export_truth_v4_transition_guard.js');
const RECTIFICATION_PATH = path.join(ROOT, 'scripts/farmacia_validation_state_v4_rectification.js');
const guardSource = fs.readFileSync(GUARD_PATH, 'utf8');
const rectificationSource = fs.readFileSync(RECTIFICATION_PATH, 'utf8');
const core = require(path.join(ROOT, 'scripts/farmacia_multitreatment_core.js'));
const model = require(path.join(ROOT, 'scripts/farmacia_validation_state_v4_model.js'));
const NOTE = 'El tratamiento ya está iniciado. Los cambios posteriores requieren un movimiento clínico trazable.';

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

let sequence = 0;
const ids = { idFactory: (prefix) => `${prefix}poststart-${++sequence}` };
const storage = memoryStorage();
const store = core.createSessionStore(storage);
const patientId = 'patient-poststart-synthetic-001';
const request = core.createTreatmentRequest({
  patient_id: patientId,
  request_type: 'new_start',
  origin: 'imported_nursing',
  drug: { drug_name: 'Synthetic medicine' },
  therapy: {},
  created_at: '2026-07-25T08:00:00.000Z',
  updated_at: '2026-07-25T08:00:00.000Z'
}, ids);
let state = store.createEmpty();
state = store.upsertRequest(state, patientId, request);
store.save(state);

const emptyIdentity = model.emptyCatalogIdentity();
const explicit = {
  saved_at: '2026-07-25T08:05:00.000Z',
  drug: { drug_name: 'Synthetic medicine', active_ingredient: '', catalog_identity: emptyIdentity, catalog_snapshot: emptyIdentity },
  therapy: { dose_text: '', presentation: '', route: '', pauta_codigo: '', pauta_label: '', pauta_otro_texto: '' },
  line: {
    relationship: 'primary', drug_name: 'Synthetic medicine', active_ingredient: '', dose_text: '', presentation: '', route: '',
    pauta_codigo: '', pauta_label: '', pauta_otro_texto: '', catalog_identity: emptyIdentity, catalog_snapshot: emptyIdentity,
    start_date: '', end_date: ''
  }
};

const validated = model.saveDecision({
  core, store, patientId, result: 'validated', explicit,
  professionalDemoId: 'professional-demo-validator', performedAt: '2026-07-25T08:10:00.000Z'
});
const lineId = validated.line.line_id;
const startDate = '2026-07-25';
const started = core.confirmTreatmentStart({
  store,
  patient_id: patientId,
  line_id: lineId,
  start_date: startDate,
  declared_by_demo: 'professional-demo-fh',
  created_at: '2026-07-25T09:00:00.000Z'
}, ids);

const restoredPatient = started.state.patients[patientId];
const starts = Object.values(restoredPatient.movements).filter((movement) => (
  movement.movement_type === 'start' && movement.target_line_id === lineId
));
assert.equal(started.line.line_id, lineId, 'start must activate the same canonical line');
assert.equal(started.line.start_date, startDate, 'start date must remain explicit');
assert.equal(starts.length, 1, 'active line must have exactly one start movement');

const rectificationRoot = { FarmaciaValidationStateV4Model: model };
vm.runInNewContext(rectificationSource, { window: rectificationRoot, globalThis: rectificationRoot }, { filename: RECTIFICATION_PATH });
assert.equal(model.__v4RectificationPatched, true, 'rectification barrier must be installed');
assert.equal(rectificationRoot.FarmaciaValidationRectificationV4.mayRectifyBeforeStart(started.line), false);
const beforeRectification = JSON.stringify(store.load());
assert.throws(() => model.saveDecision({
  core, store, patientId, result: 'pending', explicit,
  performedAt: '2026-07-25T09:05:00.000Z'
}), /La línea ya se inició/);
assert.equal(JSON.stringify(store.load()), beforeRectification, 'rejected active-line rectification must change nothing');

function classList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...items) => items.forEach((item) => values.add(item)),
    remove: (...items) => items.forEach((item) => values.delete(item)),
    toggle(item, force) {
      if (force === true) values.add(item);
      else if (force === false) values.delete(item);
      else if (values.has(item)) values.delete(item);
      else values.add(item);
      return values.has(item);
    },
    contains: (item) => values.has(item)
  };
}

function element({ id = '', value = '', options = [], classes = [] } = {}) {
  const attrs = new Map();
  return {
    id,
    value,
    options,
    disabled: false,
    textContent: '',
    parentNode: null,
    classList: classList(classes),
    setAttribute(name, valueToSet) { attrs.set(name, String(valueToSet)); },
    getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; },
    removeAttribute(name) { attrs.delete(name); },
    matches(selector) { return selector.split(',').some((part) => part.trim() === `#${this.id}`); },
    closest(selector) { return selector === `#${this.id}` ? this : null; }
  };
}

function harness(initialSnapshot) {
  let snapshot = structuredClone(initialSnapshot);
  const listeners = {};
  const options = ['pending', 'validated', 'denied'].map((value) => element({ value }));
  const elements = {
    fhValEstado: element({ id: 'fhValEstado', value: 'validated', options }),
    fhValSaveV4: element({ id: 'fhValSaveV4' }),
    fhValGoFirstVisitV4: element({ id: 'fhValGoFirstVisitV4', classes: ['hidden'] }),
    fhValV4Status: element({ id: 'fhValV4Status' })
  };
  const parent = {
    appendChild(child) {
      elements[child.id] = child;
      child.parentNode = parent;
    }
  };
  elements.fhValEstado.parentNode = parent;
  const document = {
    getElementById(id) { return elements[id] || null; },
    createElement() { return element(); },
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); }
  };
  const root = {
    document,
    sessionStorage: {},
    URLSearchParams,
    location: { assign() {} },
    FarmaciaDemo: {
      getQueryContext() {
        return { patient: { patient_id: patientId, cip: 'CIP-MUST-NOT-RESOLVE-STATE', drug: 'IGNORED' } };
      }
    },
    FarmaciaMultitreatmentCore: { createSessionStore() { return {}; } },
    FarmaciaValidationStateV4Model: { restoreDecision() { return structuredClone(snapshot); } },
    setTimeout(callback) { callback(); }
  };
  vm.runInNewContext(guardSource, { window: root, globalThis: root, URLSearchParams, Promise, Array }, { filename: GUARD_PATH });
  return {
    api: root.FarmaciaValidationTransitionGuardV4,
    elements,
    options,
    setSnapshot(value) { snapshot = structuredClone(value); },
    on(type, handler) { (listeners[type] ||= []).push(handler); },
    dispatch(type, target) {
      const event = {
        target,
        defaultPrevented: false,
        immediateStopped: false,
        preventDefault() { this.defaultPrevented = true; },
        stopImmediatePropagation() { this.immediateStopped = true; }
      };
      for (const handler of listeners[type] || []) {
        handler(event);
        if (event.immediateStopped) break;
      }
      return event;
    }
  };
}

const activeSnapshot = {
  result: 'validated',
  produced_line_id: lineId,
  line: { ...started.line },
  lines: [{ line_id: 'line-decoy-must-not-be-used', status: 'active', start_date: startDate }],
  drug: { cip: 'MISLEADING', catalog_id: 'MISLEADING' }
};
const prestartSnapshot = {
  result: 'validated',
  produced_line_id: lineId,
  line: { ...started.line, status: 'validated_not_started', start_date: '' }
};
const ui = harness(prestartSnapshot);
ui.api.refresh();
assert.equal(ui.elements.fhValSaveV4.disabled, false, 'prestart save must remain enabled');
assert.ok(ui.options.every((option) => option.disabled === false), 'all prestart result options must remain enabled');
assert.equal(ui.elements.fhValTransitionGuardNote.classList.contains('hidden'), true, 'prestart must not show poststart note');

ui.elements.fhValEstado.value = 'pending';
ui.api.refresh();
assert.match(ui.elements.fhValTransitionGuardNote.textContent, /retirará la línea pendiente de inicio/);
ui.elements.fhValEstado.value = 'validated';
ui.api.refresh();
assert.equal(ui.elements.fhValTransitionGuardNote.classList.contains('hidden'), true, 'rectification note only applies to pending or denied');

ui.setSnapshot(activeSnapshot);
ui.api.refresh();
assert.equal(ui.api.isCoherentPoststart(activeSnapshot), true);
assert.equal(ui.elements.fhValEstado.value, 'validated');
assert.equal(ui.options.find((option) => option.value === 'validated').disabled, false);
assert.equal(ui.options.find((option) => option.value === 'pending').disabled, true);
assert.equal(ui.options.find((option) => option.value === 'denied').disabled, true);
assert.equal(ui.elements.fhValSaveV4.disabled, true);
assert.equal(ui.elements.fhValSaveV4.getAttribute('aria-disabled'), 'true');
assert.equal(ui.elements.fhValSaveV4.getAttribute('title'), NOTE);
assert.equal(ui.elements.fhValTransitionGuardNote.textContent, NOTE);
assert.equal(ui.elements.fhValTransitionGuardNote.getAttribute('role'), 'note');
assert.equal(ui.elements.fhValTransitionGuardNote.classList.contains('hidden'), false);

ui.elements.fhValEstado.value = 'pending';
const attemptedRectification = ui.dispatch('change', ui.elements.fhValEstado);
assert.equal(attemptedRectification.defaultPrevented, true, 'supported result change must be blocked');
assert.equal(ui.elements.fhValEstado.value, 'validated');
let saveDecisionCalls = 0;
ui.on('click', () => { saveDecisionCalls += 1; });
const attemptedSave = ui.dispatch('click', ui.elements.fhValSaveV4);
assert.equal(attemptedSave.defaultPrevented, true, 'active save event must be blocked');
assert.equal(saveDecisionCalls, 0, 'poststart guard must prevent downstream saveDecision');

ui.elements.fhValSaveV4.disabled = false;
ui.options.forEach((option) => { option.disabled = false; });
ui.elements.fhValEstado.value = 'pending';
ui.api.refresh();
assert.equal(ui.elements.fhValSaveV4.disabled, true, 'repeated refresh must not unlock active state');
assert.equal(ui.elements.fhValEstado.value, 'validated');
assert.equal(ui.elements.fhValTransitionGuardNote.textContent, NOTE);

for (const incomplete of [
  { ...activeSnapshot, line: null },
  { ...activeSnapshot, line: { ...activeSnapshot.line, line_id: 'line-mismatch' } },
  { ...activeSnapshot, line: { ...activeSnapshot.line, start_date: '' } },
  { ...activeSnapshot, result: 'pending' }
]) {
  ui.setSnapshot(incomplete);
  ui.api.refresh();
  assert.equal(ui.elements.fhValSaveV4.disabled, false, 'incomplete or mismatched snapshot must not lock');
  assert.equal(ui.elements.fhValTransitionGuardNote.textContent, '');
}

const rebuilt = harness(activeSnapshot);
rebuilt.api.refresh();
assert.equal(rebuilt.elements.fhValSaveV4.disabled, true, 'fresh runtime must rebuild lock from canonical snapshot');
assert.equal(rebuilt.elements.fhValTransitionGuardNote.textContent, NOTE);
assert.doesNotMatch(guardSource, /lines\s*\[\s*0\s*\]/, 'guard must never resolve through lines[0]');

console.log('farmacia_validation_poststart_guard_v4_check: PASSED_COHERENT_ACTIVE_LOCK_AND_RECTIFICATION_BARRIER');
