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

let uuidCounter = 0;

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
    crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, '0')}` },
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

function dynamicRadio(checked) {
  return {
    id: '', name: 'dlqi_q1', tagName: 'INPUT', type: 'radio', value: 'on', checked,
    disabled: false,
    closest() { return null; },
    dispatchEvent() { return true; }
  };
}
const dlqiRadios = [dynamicRadio(false), dynamicRadio(false), dynamicRadio(true), dynamicRadio(false)];
const dlqiRoot = {
  querySelectorAll(selector) {
    if (selector === 'input, select, textarea' || selector === '[name]') return dlqiRadios;
    return [];
  }
};
const dlqiState = ledger.captureFormState(dlqiRoot);
assert.deepEqual(dlqiState.map(entry => entry.name_index), [0, 1, 2, 3], 'same-name dynamic radios receive stable ordinal identities');
dlqiRadios.forEach(radio => { radio.checked = false; });
await ledger.restoreFormState(dlqiState, dlqiRoot);
assert.deepEqual(dlqiRadios.map(radio => radio.checked), [false, false, true, false], 'radio restoration preserves the exact selected option even when every HTML value is on');

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

const continuedAsNew = reloaded.saveEvent({
  synthetic_acknowledged: true,
  synthetic_cip: 'CIP-FICTICIO-01',
  event_type: 'pharmacy_validation',
  source_event_id: 'pharmacy_validation:test:DISTINCT-SOURCE',
  occurred_on: '2026-08-01',
  payload: { form_state: [] }
});
assert.equal(continuedAsNew.created, true, 'a distinct source identity creates a new act for the same patient and type');
assert.notEqual(continuedAsNew.event.event_id, first.event.event_id, 'continuing as new cannot overwrite the previous event');

assert.equal(reloaded.removePatient(patientA), 4, 'patient deletion removes all its synthetic acts');
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
assert.match(source, /restoreFormState\([^;]+\)\.then\(function \(\) \{\s*restoreDomainState\(event\);/, 'ledger strictly restores form state before the follow-up dynamic domain');
assert.match(followupSource, /function restoreEvaluationState\(snapshot\)/, 'follow-up exposes dynamic state restoration');
assert.match(followupSource, /getCurrentCanonicalLines:/, 'follow-up exposes the currently edited line set');
assert.match(followupSource, /captureEditingLineState\(\);[\s\S]*captureCommonAdverseEvent\(\);[\s\S]*captureCausalityEditor\(\);/, 'follow-up snapshot captures visible line and causality edits');

const indexHtml = fs.readFileSync(path.join(ROOT, 'farmacia_index.html'), 'utf8');
assert.doesNotMatch(indexHtml, /farmacia_evaluation_(ledger|workbook)\.js/, 'Inicio loads neither ledger nor workbook module');
assert.match(indexHtml, /vendor\/sheetjs\/xlsx\.full\.min\.js/, 'Inicio retains SheetJS for normal Excel imports');

const clinicalPages = [
  ['farmacia_validacion.html', 'scripts/farmacia_validacion.js', ['fhValExportTxt', 'fhValExcelExportBtn']],
  ['farmacia_primera_visita.html', 'scripts/farmacia_primera_visita.js', ['fhPvExportTxt', 'fhPvExcelExportBtn']],
  ['farmacia_seguimiento.html', 'scripts/farmacia_seguimiento.js', ['fhSegExportTxt', 'fhSegExportCsv', 'fhSegExcelExportBtn']]
];
for (const [htmlName, pageScript, outputIds] of clinicalPages) {
  const html = fs.readFileSync(path.join(ROOT, htmlName), 'utf8');
  assert.ok(html.indexOf(pageScript) < html.indexOf('scripts/farmacia_evaluation_ledger.js'), `${htmlName} loads ledger after its page script`);
  assert.match(html, /Demo con datos sintéticos/, `${htmlName} retains the general demo/synthetic warning`);
  for (const outputId of outputIds) assert.match(source, new RegExp(`"${outputId}"`), `${outputId} is bound by the ledger`);
  assert.doesNotMatch(html, /Guardar acto ficticio|Cohorte ficticia local|fhEvaluationLedgerSyntheticConfirm|fhEvaluationLedgerSave/, `${htmlName} has no synthetic save/cohort UI`);
}
assert.doesNotMatch(source, /fhValExportCsv|fhPvExportCsv/, 'hidden Validation and First Visit CSV controls are not bound');
assert.doesNotMatch(source, /Descarga el libro de evaluación/, 'storage-limit guidance does not instruct users to download the evaluation workbook');
assert.doesNotMatch(source, /elimina actos antiguos/, 'storage-limit guidance does not instruct users to delete old acts');
assert.doesNotMatch(source, /preventDefault|stopPropagation|stopImmediatePropagation|copyTextToClipboard|downloadFile|writeFile/, 'ledger does not intercept or mutate normal outputs');
assert.match(source, /eligibleAtActivation = isVisibleEnabled\(control\)/, 'persistence requires a visible enabled output at activation');
assert.match(source, /persistAfterNormalOutput\(config\);\s*\}, true\);/, 'capture-phase binding persists before existing bubble output handlers');
assert.doesNotMatch(source, /setTimeout\([^)]*persistAfterNormalOutput/, 'normal-output persistence is not deferred until after exporter normalization');
assert.doesNotMatch(source, /injectWorkflowPanel|renderIndexPanel|fhEvaluationLedgerPanel|fhEvaluationLedgerSyntheticConfirm|fhEvaluationLedgerSave|Guardar acto ficticio|Cohorte ficticia local/, 'parallel cohort, consent and fake-save runtime are removed');
assert.match(source, /history\.replaceState/, 'persistent saves and restores adopt ledger_event_id without navigation');
assert.match(source, /Acto local restaurado\. Revise los datos antes de volver a exportar\./, 'direct URL restoration gives the required compact review warning');
assert.match(source, /Existe un acto local anterior de este tipo para este paciente\./, 'same-patient/type reopening is explicit');
assert.match(source, /Recuperar último acto/, 'explicit latest-act recovery is available');
assert.match(source, /Continuar con un acto nuevo/, 'explicit continue-as-new action is available');
assert.match(source, /Retención temporal en memoria; el acto no se conservará al recargar\./, 'fallback status truthfully states that reload retention is unavailable');
assert.doesNotMatch(source.match(/function restoreSpecificEvent[\s\S]*?function restoreRequestedEvent/)[0], /persistAfterNormalOutput|\.click\(/, 'direct restoration neither persists nor triggers an export');

const previewManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'previews/caceres-fh/deployment-manifest.json'), 'utf8'));
assert.equal(previewManifest.version, 'CÁCERES-REVIEW-0.3', 'current Cáceres snapshot remains unchanged');
assert.equal(fs.readFileSync(path.join(ROOT, 'previews/caceres-fh/farmacia_index.html'), 'utf8').includes('farmacia_evaluation_ledger.js'), false, 'this WO does not modify the stable snapshot');

console.log('farmacia_evaluation_ledger_check: PASSED');
console.log('normal-output wiring; stable schema/API; exact radios; URL restore; explicit recover/continue; fallback; snapshot untouched.');
