#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_evaluation_ledger.js'), 'utf8');

function createStorage(shared = new Map()) {
  return {
    getItem(key) { return shared.has(key) ? shared.get(key) : null; },
    setItem(key, value) { shared.set(key, String(value)); },
    removeItem(key) { shared.delete(key); },
    clear() { shared.clear(); }
  };
}

function createContext(sharedStorage, storageOverride = null) {
  const listeners = new Map();
  const document = {
    addEventListener(type, handler) { listeners.set(type, handler); },
    dispatchEvent() { return true; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    createElement() { throw new Error('DOM creation not expected in unit check'); },
    createTextNode() { throw new Error('DOM creation not expected in unit check'); }
  };
  const window = {
    localStorage: storageOverride || createStorage(sharedStorage),
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
    setTimeout,
    clearTimeout,
    confirm: () => true
  };
  const context = {
    window,
    document,
    location: { pathname: '/farmacia_index.html', search: '' },
    URLSearchParams,
    CustomEvent: class CustomEvent { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    Event: class Event { constructor(type, options) { this.type = type; this.bubbles = options?.bubbles; } },
    console,
    Date,
    Math,
    JSON,
    String,
    Boolean,
    Array,
    Object,
    Promise,
    Map,
    Error,
    setTimeout,
    clearTimeout
  };
  window.window = window;
  window.document = document;
  window.location = context.location;
  window.URLSearchParams = URLSearchParams;
  window.CustomEvent = context.CustomEvent;
  window.Event = context.Event;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'farmacia_evaluation_ledger.js' });
  return context.window.FarmaciaEvaluationLedger;
}

const shared = new Map();
const ledger = createContext(shared);
ledger.clearAll();

const patientA = ledger.patientIdForCip(' cip-ficticio-01 ');
assert.match(patientA, /^SYN-PAT-[0-9A-F]{8}$/);
assert.equal(patientA, ledger.patientIdForCip('CIP-FICTICIO-01'), 'patient_id is stable and case-insensitive');
assert.equal(ledger.patientIdForCip(''), '', 'empty CIP does not invent a patient_id');

assert.throws(() => ledger.saveEvent({
  synthetic_cip: 'CIP-FICTICIO-01',
  event_type: 'pharmacy_validation'
}), /exclusivamente datos ficticios/, 'explicit synthetic acknowledgement is mandatory');

const first = ledger.saveEvent({
  synthetic_acknowledged: true,
  synthetic_cip: 'CIP-FICTICIO-01',
  event_type: 'pharmacy_validation',
  source_event_id: 'pharmacy_validation:test:2026-08-01',
  occurred_on: '2026-08-01',
  service_code: 'derma',
  pathology_code: 'hs',
  record_status: 'draft',
  payload: { form_state: [{ key_kind: 'id', key: 'field', value: 'uno' }] }
});
assert.equal(first.created, true);
assert.equal(ledger.listEvents().length, 1);

const updated = ledger.saveEvent({
  synthetic_acknowledged: true,
  synthetic_cip: 'CIP-FICTICIO-01',
  event_type: 'pharmacy_validation',
  source_event_id: 'pharmacy_validation:test:2026-08-01',
  occurred_on: '2026-08-01',
  service_code: 'derma',
  pathology_code: 'hs',
  record_status: 'recorded',
  payload: { form_state: [{ key_kind: 'id', key: 'field', value: 'dos' }] }
});
assert.equal(updated.created, false, 'same source_event_id updates the act');
assert.equal(updated.event.event_id, first.event.event_id, 'idempotent update preserves event_id');
assert.equal(ledger.listEvents().length, 1, 'idempotent update does not duplicate');
assert.equal(ledger.getEvent(first.event.event_id).payload.form_state[0].value, 'dos');

ledger.saveEvent({
  synthetic_acknowledged: true,
  synthetic_cip: 'CIP-FICTICIO-01',
  event_type: 'pharmacy_first_visit',
  source_event_id: 'pharmacy_first_visit:test:2026-08-02',
  occurred_on: '2026-08-02',
  payload: { form_state: [] }
});
ledger.saveEvent({
  synthetic_acknowledged: true,
  synthetic_cip: 'CIP-FICTICIO-01',
  event_type: 'pharmacy_follow_up',
  source_event_id: 'pharmacy_follow_up:test:2026-08-03',
  occurred_on: '2026-08-03',
  line_ids: ['LINE-1', 'LINE-2'],
  payload: { form_state: [] }
});
assert.deepEqual(ledger.listEvents().map(event => event.event_type).sort(), [
  'pharmacy_first_visit', 'pharmacy_follow_up', 'pharmacy_validation'
]);

const reloaded = createContext(shared);
assert.equal(reloaded.listEvents().length, 3, 'events survive a module reload through browser storage');
assert.equal(reloaded.listEvents({ synthetic_cip: 'cip-ficticio-01' }).length, 3);
assert.match(reloaded.eventUrl(reloaded.listEvents()[0]), /^farmacia_.*ledger_event_id=/);

assert.equal(reloaded.removePatient(patientA), 3, 'patient deletion removes all its synthetic acts');
assert.equal(reloaded.listEvents().length, 0);

const blockedStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
  removeItem() { throw new Error('blocked'); }
};
const memoryOnlyLedger = createContext(new Map(), blockedStorage);
const memoryOnly = memoryOnlyLedger.saveEvent({
  synthetic_acknowledged: true,
  synthetic_cip: 'CIP-MEMORY-ONLY',
  event_type: 'pharmacy_validation',
  source_event_id: 'pharmacy_validation:memory-only'
});
assert.equal(memoryOnly.persistent, false, 'blocked localStorage falls back to memory');
assert.equal(memoryOnly.persistence_mode, 'memory_fallback');
assert.equal(memoryOnlyLedger.listEvents().length, 1, 'memory fallback remains usable in the current page context');

const followupSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_seguimiento.js'), 'utf8');
assert.match(source, /restoreDomainState\(event\)/, 'ledger restores follow-up dynamic domain after form controls');
assert.match(followupSource, /function restoreEvaluationState\(snapshot\)/, 'follow-up exposes dynamic state restoration');
assert.match(followupSource, /getCurrentCanonicalLines:/, 'follow-up exposes the currently edited line set');
assert.match(followupSource, /captureEditingLineState\(\);[\s\S]*captureCommonAdverseEvent\(\);[\s\S]*captureCausalityEditor\(\);/, 'follow-up snapshot captures visible line and causality edits');

for (const htmlName of ['farmacia_index.html', 'farmacia_validacion.html', 'farmacia_primera_visita.html', 'farmacia_seguimiento.html']) {
  const html = fs.readFileSync(path.join(ROOT, htmlName), 'utf8');
  assert.match(html, /scripts\/farmacia_evaluation_ledger\.js\?v=20260801-ledger-01/, `${htmlName} loads the ledger after its page script`);
}
for (const htmlName of ['farmacia_validacion.html', 'farmacia_primera_visita.html', 'farmacia_seguimiento.html']) {
  const html = fs.readFileSync(path.join(ROOT, htmlName), 'utf8');
  assert.match(html, /persistencia local exclusivamente ficticia/, `${htmlName} explains the local synthetic boundary`);
}

const previewManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'previews/caceres-fh/deployment-manifest.json'), 'utf8'));
assert.equal(previewManifest.version, 'CÁCERES-REVIEW-0.3', 'current Cáceres snapshot remains unchanged');
assert.equal(fs.readFileSync(path.join(ROOT, 'previews/caceres-fh/farmacia_index.html'), 'utf8').includes('farmacia_evaluation_ledger.js'), false, 'this WO does not modify the stable snapshot');

console.log('farmacia_evaluation_ledger_check: PASSED');
console.log('3 act types; stable patient_id; idempotent update; reload; delete; DOM wiring; snapshot untouched.');
