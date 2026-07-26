#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const drafts = require(path.join(ROOT, 'scripts/farmacia_followup_drafts_v4.js'));
const html = fs.readFileSync(path.join(ROOT, 'farmacia_seguimiento.html'), 'utf8');
const draftSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_followup_drafts_v4.js'), 'utf8');
const contextSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_followup_context_v4.js'), 'utf8');

let passed = 0;
function test(name, run) { run(); passed += 1; console.log(`ok ${passed} - ${name}`); }
function storage(raw) {
  const data = new Map(raw === undefined ? [] : [[drafts.STORE_KEY, raw]]);
  return { getItem: (key) => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key), data };
}
function object(patientId = 'patient-a', lineId = 'line-a', notes = 'saved') {
  return { draft_id: `followup:${lineId}`, patient_id: patientId, line_id: lineId, kind: 'followup', notes,
    mg1: '', mg2: '', mg3: '', mg4: '',
    saved_at: '2026-07-26T10:00:00.000Z', saved_by_demo: 'Profesional FH-01' };
}
function state(...items) {
  const result = drafts.emptyState();
  for (const item of items) {
    result.patients[item.patient_id] ||= { lines: {} };
    result.patients[item.patient_id].lines[item.line_id] = item;
  }
  return result;
}
function uiEnvironment(store = storage(), confirm = () => true) {
  const elements = Object.fromEntries(['fhSegDraftNotes', 'fhSegDraftSave', 'fhSegDraftDiscard', 'fhSegDraftStatus', 'currentProfessional'].map((id) => [id, {
    id, value: '', textContent: id === 'currentProfessional' ? 'Profesional FH-01' : '', disabled: true,
    attributes: {}, setAttribute(key, value) { this.attributes[key] = String(value); }
  }]));
  const env = { sessionStorage: store, confirm, document: { getElementById: (id) => elements[id] || null }, __farmaciaFollowupContextV4: null };
  const controller = drafts.createController(env, { storage: store, confirm, now: () => '2026-07-26T10:00:00.000Z' });
  function apply(patient_id = 'patient-a', line_id = 'line-a', code = 'CANONICAL_ACTIVE_CONTEXT_READY') {
    const detail = { ok: code === 'CANONICAL_ACTIVE_CONTEXT_READY', code, patient_id, line_id, status: code === 'CANONICAL_ACTIVE_CONTEXT_READY' ? 'active' : '' };
    env.__farmaciaFollowupContextV4 = detail;
    controller.applyContext(detail);
  }
  return { env, elements, controller, apply, store };
}

test('missing key is valid empty state', () => assert.deepEqual(drafts.createStore(storage()).read().state, drafts.emptyState()));
test('existing empty string is corrupt storage', () => assert.equal(drafts.createStore(storage('')).read().code, 'DRAFT_STORAGE_CORRUPT'));
test('save does not overwrite existing empty-string corruption', () => { const backing = storage(''); assert.equal(drafts.createStore(backing).save(object()).code, 'DRAFT_STORAGE_CORRUPT'); assert.equal(backing.getItem(drafts.STORE_KEY), ''); });
test('discard does not overwrite existing empty-string corruption', () => { const backing = storage(''); assert.equal(drafts.createStore(backing).discard('patient-a', 'line-a').code, 'DRAFT_STORAGE_CORRUPT'); assert.equal(backing.getItem(drafts.STORE_KEY), ''); });
test('corrupt JSON is distinguished', () => assert.equal(drafts.createStore(storage('{')).read().code, 'DRAFT_STORAGE_CORRUPT'));
test('wrong schema is distinguished', () => assert.equal(drafts.createStore(storage(JSON.stringify({ schema: 'wrong', patients: {} }))).read().code, 'DRAFT_SCHEMA_MISMATCH'));
test('invalid root shape fails closed', () => assert.equal(drafts.validateState({ schema: drafts.SCHEMA, patients: [] }).code, 'DRAFT_STATE_INVALID'));
test('draft_id mismatch fails closed', () => { const value = state(object()); value.patients['patient-a'].lines['line-a'].draft_id = 'bad'; assert.equal(drafts.validateState(value).code, 'DRAFT_STATE_INVALID'); });
test('patient identity mismatch fails closed', () => { const value = state(object()); value.patients['patient-a'].lines['line-a'].patient_id = 'other'; assert.equal(drafts.validateState(value).code, 'DRAFT_STATE_INVALID'); });
test('line identity mismatch fails closed', () => { const value = state(object()); value.patients['patient-a'].lines['line-a'].line_id = 'other'; assert.equal(drafts.validateState(value).code, 'DRAFT_STATE_INVALID'); });
test('extra draft fields fail closed', () => { const value = state({ ...object(), therapy: 'forbidden' }); assert.equal(drafts.validateState(value).code, 'DRAFT_STATE_INVALID'); });
test('extra root fields fail closed', () => assert.equal(drafts.validateState({ ...drafts.emptyState(), extra: '' }).code, 'DRAFT_STATE_INVALID'));
test('all draft fields are required strings', () => { const value = state(object()); delete value.patients['patient-a'].lines['line-a'].saved_at; assert.equal(drafts.validateState(value).code, 'DRAFT_STATE_INVALID'); });
test('kind must be followup', () => { const value = state(object()); value.patients['patient-a'].lines['line-a'].kind = 'clinical'; assert.equal(drafts.validateState(value).code, 'DRAFT_STATE_INVALID'); });
test('save requires active applied context', () => { const app = uiEnvironment(); assert.equal(app.controller.save().code, 'DRAFT_ACTIVE_CONTEXT_REQUIRED'); });
test('URL-like identity without applied result is insufficient', () => { const app = uiEnvironment(); app.env.location = { search: '?patient_id=patient-a&line_id=line-a' }; assert.equal(app.controller.save().code, 'DRAFT_ACTIVE_CONTEXT_REQUIRED'); });
test('Hub and pre-Hub use the same independent v2 store', () => assert.equal(drafts.STORE_KEY, 'farmaciaDemo.followupDrafts.v2'));
test('draft module does not copy multitreatment core', () => assert.doesNotMatch(draftSource, /FarmaciaMultitreatmentCore|multitreatment\.v1/));
test('draft module has no localStorage or autosave path', () => assert.doesNotMatch(draftSource, /localStorage|autosave/i));
test('save and restore partition A', () => { const app = uiEnvironment(); app.apply(); app.elements.fhSegDraftNotes.value = 'A'; app.controller.onInput(); assert.equal(app.controller.save().ok, true); const again = uiEnvironment(app.store); again.apply(); assert.equal(again.elements.fhSegDraftNotes.value, 'A'); });
test('partition B starts empty', () => { const app = uiEnvironment(storage(JSON.stringify(state(object('patient-a', 'line-a', 'A'))))); app.apply('patient-a', 'line-b'); assert.equal(app.elements.fhSegDraftNotes.value, ''); });
test('partition B can save independently', () => { const app = uiEnvironment(storage(JSON.stringify(state(object('patient-a', 'line-a', 'A'))))); app.apply('patient-a', 'line-b'); app.elements.fhSegDraftNotes.value = 'B'; app.controller.onInput(); app.controller.save(); assert.equal(app.controller.store.get('patient-a', 'line-a').draft.notes, 'A'); });
test('patient partitions remain independent', () => { const value = state(object('patient-a', 'line-a', 'A'), object('patient-b', 'line-a', 'B')); assert.equal(drafts.createStore(storage(JSON.stringify(value))).get('patient-b', 'line-a').draft.notes, 'B'); });
test('historical result keeps draft disabled', () => { const app = uiEnvironment(); app.apply('patient-a', 'old', 'LINE_NOT_ACTIVE'); assert.equal(app.elements.fhSegDraftNotes.disabled, true); });
test('baseline defines dirty exactly', () => { const app = uiEnvironment(storage(JSON.stringify(state(object())))); app.apply(); app.elements.fhSegDraftNotes.value = 'saved'; app.controller.onInput(); assert.equal(app.controller.state().dirty, false); app.elements.fhSegDraftNotes.value += '!'; app.controller.onInput(); assert.equal(app.controller.state().dirty, true); });
test('same identity does not prompt or clear', () => { let prompts = 0; const app = uiEnvironment(storage(), () => { prompts += 1; return true; }); app.apply(); app.elements.fhSegDraftNotes.value = 'working'; app.controller.onInput(); assert.equal(app.controller.beforeContextChange({ next: { patient_id: 'patient-a', line_id: 'line-a' } }), 'same'); assert.equal(prompts, 0); assert.equal(app.elements.fhSegDraftNotes.value, 'working'); });
test('same identity applied event preserves dirty text', () => { const app = uiEnvironment(); app.apply(); app.elements.fhSegDraftNotes.value = 'working'; app.controller.onInput(); app.apply(); assert.equal(app.elements.fhSegDraftNotes.value, 'working'); });
test('dirty patient change can cancel', () => { const app = uiEnvironment(storage(), () => false); app.apply(); app.elements.fhSegDraftNotes.value = 'dirty'; app.controller.onInput(); assert.equal(app.controller.beforeContextChange({ next: { patient_id: 'patient-b', line_id: 'line-b' } }), 'cancel'); });
test('dirty navigation confirmation copy is exact', () => assert.equal(drafts.CHANGE_MESSAGE, 'Hay cambios sin guardar en el borrador de esta línea. Cambiar de paciente o línea descartará esos cambios. El último borrador guardado se conservará. ¿Quieres continuar?'));
test('dirty patient change can proceed', () => { const app = uiEnvironment(storage(), () => true); app.apply(); app.elements.fhSegDraftNotes.value = 'dirty'; app.controller.onInput(); assert.equal(app.controller.beforeContextChange({ next: { patient_id: 'patient-b', line_id: 'line-b' } }), 'proceed'); });
test('saved origin survives accepted navigation', () => { const app = uiEnvironment(); app.apply(); app.elements.fhSegDraftNotes.value = 'saved'; app.controller.onInput(); app.controller.save(); app.elements.fhSegDraftNotes.value = 'unsaved'; app.controller.onInput(); app.controller.beforeContextChange({ next: { patient_id: 'patient-b', line_id: 'line-b' } }); assert.equal(app.controller.store.get('patient-a', 'line-a').draft.notes, 'saved'); });
test('unknown navigation can cancel', () => { const app = uiEnvironment(storage(), () => false); app.apply(); app.elements.fhSegDraftNotes.value = 'dirty'; app.controller.onInput(); assert.equal(app.controller.beforeContextChange({ next: {} }), 'cancel'); });
test('unknown navigation can proceed', () => { const app = uiEnvironment(storage(), () => true); app.apply(); app.elements.fhSegDraftNotes.value = 'dirty'; app.controller.onInput(); assert.equal(app.controller.beforeContextChange({ next: {} }), 'proceed'); });
test('dirty line change can cancel', () => { const app = uiEnvironment(storage(), () => false); app.apply(); app.elements.fhSegDraftNotes.value = 'dirty'; app.controller.onInput(); assert.equal(app.controller.beforeContextChange({ next: { patient_id: 'patient-a', line_id: 'line-b' } }), 'cancel'); });
test('dirty line change can proceed', () => { const app = uiEnvironment(storage(), () => true); app.apply(); app.elements.fhSegDraftNotes.value = 'dirty'; app.controller.onInput(); assert.equal(app.controller.beforeContextChange({ next: { patient_id: 'patient-a', line_id: 'line-b' } }), 'proceed'); });
test('discard removes only exact current draft', () => { const value = state(object('patient-a', 'line-a', 'A'), object('patient-a', 'line-b', 'B')); const app = uiEnvironment(storage(JSON.stringify(value))); app.apply(); app.controller.discard(); assert.equal(app.controller.store.get('patient-a', 'line-a').draft, null); assert.equal(app.controller.store.get('patient-a', 'line-b').draft.notes, 'B'); });
test('discard cancellation preserves exact draft', () => { const app = uiEnvironment(storage(JSON.stringify(state(object()))), () => false); app.apply(); assert.equal(app.controller.discard().code, 'DRAFT_DISCARD_CANCELLED'); assert.ok(app.controller.store.get('patient-a', 'line-a').draft); });
test('sessionStorage read failure is visible and blocks', () => { const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } }; const app = uiEnvironment(bad); app.apply(); assert.equal(app.controller.state().storageError, 'DRAFT_STORAGE_UNAVAILABLE'); assert.equal(app.elements.fhSegDraftNotes.disabled, true); });
test('corruption is never overwritten by save or discard', () => { const app = uiEnvironment(storage('{')); app.apply(); assert.equal(app.controller.save().code, 'DRAFT_ACTIVE_CONTEXT_REQUIRED'); assert.equal(app.controller.discard().code, 'DRAFT_STORAGE_CORRUPT'); assert.equal(app.store.getItem(drafts.STORE_KEY), '{'); });
test('draft schema contains only identity, notes, adherence answers and audit strings', () => { assert.deepEqual(Object.keys(object()).sort(), ['draft_id', 'kind', 'line_id', 'notes', 'patient_id', 'mg1', 'mg2', 'mg3', 'mg4', 'saved_at', 'saved_by_demo'].sort()); assert.doesNotMatch(draftSource, /drug_name|dose_text|route|pauta|therapy/); });
test('outputs remain directly guarded', () => assert.match(contextSource, /protect\(env\.FarmaciaDemo, 'copyTextToClipboard'\)[\s\S]*protect\(env\.FarmaciaExcelRowExport/));
test('legacy clinical cards remain inert and draft card is excluded', () => { assert.match(contextSource, /section\.inert = true/); assert.match(contextSource, /section\.id === 'fhSegDraftCard'/); });
test('context event has the exact five-field detail', () => assert.match(contextSource, /var detail = \{ ok: !!result\.ok, code: result\.code, patient_id: result\.patient_id \|\| '', line_id: result\.line_id \|\| '', status:/));
test('card copy and all exact IDs are present in required position', () => { for (const id of ['fhSegDraftCard', 'fhSegDraftNotes', 'fhSegDraftSave', 'fhSegDraftDiscard', 'fhSegDraftStatus']) assert.match(html, new RegExp(`id="${id}"`)); assert.ok(html.indexOf('fhSegCanonicalContext') < html.indexOf('fhSegDraftCard')); assert.ok(html.indexOf('fhSegDraftCard') < html.indexOf('modTratamientoPrincipal')); assert.match(html, /Este contenido es un borrador de sesión\. No constituye un registro asistencial y no se incluye en JARA, CSV ni Excel\./); });
test('script order keeps core legacy drafts context', () => { const names = ['farmacia_multitreatment_core.js', 'farmacia_seguimiento.js', 'farmacia_followup_drafts_v4.js', 'farmacia_followup_context_v4.js']; const positions = names.map((name) => html.indexOf(name)); assert.deepEqual(positions, positions.slice().sort((a, b) => a - b)); });
test('three protected scripts have no working-tree diff', () => { execFileSync('git', ['diff', '--quiet', '--', 'scripts/farmacia_seguimiento.js', 'scripts/farmacia_multitreatment_core.js', 'scripts/farmacia_data_source_v4_core.js'], { cwd: ROOT }); });

assert.ok(passed >= 33);
console.log(`farmacia_followup_line_drafts_s12_v4_check: PASSED_${passed}_LINE_DRAFT_GUARD_CASES`);
