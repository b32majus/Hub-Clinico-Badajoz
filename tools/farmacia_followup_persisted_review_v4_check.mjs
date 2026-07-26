#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const drafts = require(path.join(ROOT, 'scripts/farmacia_followup_drafts_v4.js'));
const review = require(path.join(ROOT, 'scripts/farmacia_followup_persisted_review_v4.js'));
const html = fs.readFileSync(path.join(ROOT, 'farmacia_seguimiento.html'), 'utf8');
const reviewSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_followup_persisted_review_v4.js'), 'utf8');
const draftSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_followup_drafts_v4.js'), 'utf8');

let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log(`ok ${passed} - ${name}`); }
function draft(patient = 'patient-a', line = 'line-a', overrides = {}) {
  return { draft_id: `followup:${line}`, patient_id: patient, line_id: line, kind: 'followup', notes: 'Persistido',
    mg1: 'si', mg2: 'no', mg3: '', mg4: '', ae_present: 'si', ae_description: 'Dato sintético', ae_severity: 'leve', ae_resolution: 'en_seguimiento',
    proms_collected: 'si', dlqi_total: 0, eva_dolor: 0, eva_prurito: 7,
    saved_at: '2026-07-26T10:00:00.000Z', saved_by_demo: 'Profesional FH-01', ...overrides };
}
function state(...items) {
  const value = drafts.emptyState();
  for (const item of items) { value.patients[item.patient_id] ||= { lines: {} }; value.patients[item.patient_id].lines[item.line_id] = item; }
  return value;
}
function memory(raw, options = {}) {
  const data = new Map(raw === undefined ? [] : [[drafts.STORE_KEY, raw]]); const reads = []; const writes = [];
  return { data, reads, writes,
    getItem(key) { reads.push(key); if (options.failRead) throw new Error('denied'); return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { writes.push(key); if (options.failWrite) throw new Error('denied'); data.set(key, String(value)); },
    removeItem(key) { writes.push(key); data.delete(key); }, clear() { writes.push('*'); data.clear(); } };
}
function element(id) { return { id, value: '', textContent: '', disabled: false, attributes: {}, setAttribute(name, value) { this.attributes[name] = String(value); }, getAttribute(name) { return this.attributes[name] ?? null; } }; }
function reviewApp(storage = memory()) {
  const ids = ['fhSegPersistedReviewCard', 'fhSegPersistedReviewStatus', ...Object.values(review.FIELD_IDS)];
  const elements = Object.fromEntries(ids.map((id) => [id, element(id)]));
  const env = { sessionStorage: storage, FarmaciaFollowupDraftsV4: drafts, document: { getElementById: (id) => elements[id] || null } };
  return { storage, elements, renderer: review.createRenderer(env) };
}
function eventDetail(overrides = {}) { return { patient_id: 'patient-a', line_id: 'line-a', ready: true, dirty: false, storage_error: '', has_saved: true, reason: 'TEST', ...overrides }; }
function shown(app, field) { return app.elements[review.FIELD_IDS[field]].textContent; }

test('review store key is exactly the canonical v4 key', () => assert.equal(review.STORE_KEY, 'farmaciaDemo.followupDrafts.v4'));
test('module is statically read-only and has no alternate store', () => { assert.doesNotMatch(reviewSource, /sessionStorage\.(?:setItem|removeItem|clear)\s*\(|createStore\s*\(/); assert.equal((reviewSource.match(/farmaciaDemo\.followupDrafts\.v4/g) || []).length, 1); });
test('reader uses direct getItem JSON parse and canonical validation', () => { assert.match(reviewSource, /sessionStorage\.getItem\(STORE_KEY\)/); assert.match(reviewSource, /JSON\.parse\(raw\)/); assert.match(reviewSource, /drafts\.validateState\(parsed\)/); });
test('reader does not mutate validated state', () => { const value = state(draft()); const before = JSON.stringify(value); const backing = memory(before); assert.equal(review.readExact({ sessionStorage: backing, FarmaciaFollowupDraftsV4: drafts }, 'patient-a', 'line-a').draft.notes, 'Persistido'); assert.equal(JSON.stringify(value), before); assert.deepEqual(backing.writes, []); });
test('blocked context clears all values', () => { const app = reviewApp(memory(JSON.stringify(state(draft())))); const result = app.renderer.render(eventDetail({ ready: false })); assert.equal(result.code, 'REVIEW_CONTEXT_BLOCKED'); for (const field of Object.keys(review.FIELD_IDS)) assert.equal(shown(app, field), 'No informado'); });
test('active context without a saved draft is empty', () => { const app = reviewApp(); assert.equal(app.renderer.render(eventDetail({ has_saved: false })).code, 'REVIEW_EMPTY'); });
test('saved clean context is ready with exact text', () => { const app = reviewApp(memory(JSON.stringify(state(draft())))); assert.equal(app.renderer.render(eventDetail()).code, 'REVIEW_READY'); assert.equal(app.elements.fhSegPersistedReviewStatus.textContent, review.READY_TEXT); });
test('saved dirty context is stale with exact text and persisted content only', () => { const app = reviewApp(memory(JSON.stringify(state(draft(undefined, undefined, { notes: 'Guardado exacto' }))))); assert.equal(app.renderer.render(eventDetail({ dirty: true })).code, 'REVIEW_STALE_UNSAVED_CHANGES'); assert.equal(app.elements.fhSegPersistedReviewStatus.textContent, review.STALE_TEXT); assert.equal(shown(app, 'notes'), 'Guardado exacto'); });
test('dirty without a persisted draft remains empty', () => { const app = reviewApp(); assert.equal(app.renderer.render(eventDetail({ dirty: true, has_saved: false })).code, 'REVIEW_EMPTY'); assert.equal(shown(app, 'notes'), 'No informado'); });
test('numeric zero is displayed as 0 while missing stays exact', () => { const app = reviewApp(memory(JSON.stringify(state(draft(undefined, undefined, { eva_prurito: '' }))))); app.renderer.render(eventDetail()); assert.deepEqual([shown(app, 'dlqi_total'), shown(app, 'eva_dolor'), shown(app, 'eva_prurito'), shown(app, 'mg3')], ['0', '0', 'No informado', 'No informado']); });
test('explicit code labels are neutral and there is no interpretation', () => { const app = reviewApp(memory(JSON.stringify(state(draft())))); app.renderer.render(eventDetail()); assert.deepEqual([shown(app, 'mg1'), shown(app, 'mg2'), shown(app, 'ae_severity'), shown(app, 'ae_resolution')], ['Sí', 'No', 'Leve', 'En seguimiento']); assert.doesNotMatch(reviewSource, /score|umbral|recomendaci[oó]n|causalidad|resultado clínico/i); });
test('identity audit and all contracted persisted fields are displayed', () => { const app = reviewApp(memory(JSON.stringify(state(draft())))); app.renderer.render(eventDetail()); assert.deepEqual([shown(app, 'patient_id'), shown(app, 'line_id'), shown(app, 'saved_at'), shown(app, 'saved_by_demo')], ['patient-a', 'line-a', '2026-07-26T10:00:00.000Z', 'Profesional FH-01']); assert.deepEqual(Object.keys(review.FIELD_IDS).sort(), ['patient_id', 'line_id', 'saved_at', 'saved_by_demo', 'notes', 'mg1', 'mg2', 'mg3', 'mg4', 'ae_present', 'ae_description', 'ae_severity', 'ae_resolution', 'proms_collected', 'dlqi_total', 'eva_dolor', 'eva_prurito'].sort()); });
test('exact partition lookup cannot leak adjacent line or patient', () => { const app = reviewApp(memory(JSON.stringify(state(draft('patient-a', 'line-a', { notes: 'A' }), draft('patient-a', 'line-b', { notes: 'B' }), draft('patient-b', 'line-a', { notes: 'C' }))))); app.renderer.render(eventDetail({ line_id: 'line-b' })); assert.equal(shown(app, 'notes'), 'B'); app.renderer.render(eventDetail({ patient_id: 'patient-b' })); assert.equal(shown(app, 'notes'), 'C'); app.renderer.render(eventDetail({ line_id: 'missing' })); assert.equal(shown(app, 'notes'), 'No informado'); });
test('historical unknown mismatch and incoherent states never leak', () => { const app = reviewApp(memory(JSON.stringify(state(draft())))); for (const reason of ['LINE_NOT_ACTIVE', 'PATIENT_NOT_FOUND', 'PATIENT_MISMATCH', 'HUB_GRAPH_INCOHERENT']) { assert.equal(app.renderer.render(eventDetail({ ready: false, reason })).code, 'REVIEW_CONTEXT_BLOCKED'); assert.equal(shown(app, 'notes'), 'No informado'); } });
test('corrupt incompatible and unavailable storage fail closed and clear', () => { for (const backing of [memory('{'), memory(JSON.stringify({ schema: 'wrong', patients: {} })), memory(undefined, { failRead: true })]) { const app = reviewApp(backing); assert.equal(app.renderer.render(eventDetail()).code, 'REVIEW_STORAGE_ERROR'); assert.equal(shown(app, 'notes'), 'No informado'); assert.deepEqual(backing.writes, []); } });
test('draft-reported storage failure takes precedence over blocked state', () => { const app = reviewApp(); assert.equal(app.renderer.render(eventDetail({ ready: false, storage_error: 'DRAFT_STORAGE_UNAVAILABLE' })).code, 'REVIEW_STORAGE_ERROR'); });
test('renderer writes through textContent only', () => { assert.doesNotMatch(reviewSource, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/); });

const DRAFT_IDS = ['fhSegDraftNotes', 'fhSegDraftAdherence', 'fhSegDraftAdherenceStatus', 'fhSegDraftMg1', 'fhSegDraftMg2', 'fhSegDraftMg3', 'fhSegDraftMg4', 'fhSegDraftAe', 'fhSegDraftAeStatus', 'fhSegDraftAePresent', 'fhSegDraftAeDescription', 'fhSegDraftAeSeverity', 'fhSegDraftAeResolution', 'fhSegDraftProms', 'fhSegDraftPromsStatus', 'fhSegDraftPromsCollected', 'fhSegDraftDlqiTotal', 'fhSegDraftEvaDolor', 'fhSegDraftEvaPrurito', 'fhSegDraftSave', 'fhSegDraftDiscard', 'fhSegDraftStatus', 'currentProfessional'];
function controllerApp(backing = memory()) {
  const elements = Object.fromEntries(DRAFT_IDS.map((id) => [id, element(id)])); elements.currentProfessional.textContent = 'Profesional FH-01';
  const events = [];
  class CustomEvent { constructor(type, init) { this.type = type; this.detail = init.detail; } }
  const document = { getElementById: (id) => elements[id] || null, dispatchEvent(event) { events.push(event); } };
  const env = { sessionStorage: backing, document, CustomEvent, __farmaciaFollowupContextV4: null };
  const controller = drafts.createController(env, { storage: backing, now: () => '2026-07-26T12:00:00.000Z', confirm: () => true });
  function apply(code = 'CANONICAL_ACTIVE_CONTEXT_READY', patient_id = 'patient-a', line_id = 'line-a') { const ok = code === 'CANONICAL_ACTIVE_CONTEXT_READY'; const detail = { ok, code, patient_id, line_id, status: ok ? 'active' : '' }; env.__farmaciaFollowupContextV4 = { ...detail, line: ok ? { status: 'active' } : null }; controller.applyContext(detail); }
  return { backing, elements, events, env, controller, apply };
}
function lastDetail(app) { return app.events.at(-1).detail; }
test('event name and payload keys are exact with no clinical data', () => { const app = controllerApp(); app.apply(); assert.equal(app.events.at(-1).type, 'farmacia:followup-draft-state-v4'); assert.deepEqual(Object.keys(lastDetail(app)).sort(), ['patient_id', 'line_id', 'ready', 'dirty', 'storage_error', 'has_saved', 'reason'].sort()); assert.deepEqual(lastDetail(app), { patient_id: 'patient-a', line_id: 'line-a', ready: true, dirty: false, storage_error: '', has_saved: false, reason: 'CONTEXT_APPLIED' }); });
test('dirty save discard and context application emit current state', () => { const app = controllerApp(); app.apply(); app.elements.fhSegDraftNotes.value = 'persistir'; app.controller.onInput(); assert.equal(lastDetail(app).dirty, true); app.controller.save(); assert.deepEqual([lastDetail(app).reason, lastDetail(app).dirty, lastDetail(app).has_saved], ['SAVE', false, true]); app.controller.discard(); assert.deepEqual([lastDetail(app).reason, lastDetail(app).has_saved], ['DISCARD', false]); app.apply('PATIENT_NOT_FOUND', '', ''); assert.deepEqual([lastDetail(app).reason, lastDetail(app).ready], ['CONTEXT_APPLIED', false]); });
test('read and write failures emit storage_error without nested data', () => { const read = controllerApp(memory(undefined, { failRead: true })); read.apply(); assert.deepEqual([lastDetail(read).reason, lastDetail(read).storage_error], ['STORAGE_READ_ERROR', 'DRAFT_STORAGE_UNAVAILABLE']); const write = controllerApp(memory(undefined, { failWrite: true })); write.apply(); write.elements.fhSegDraftNotes.value = 'x'; write.controller.onInput(); write.controller.save(); assert.deepEqual([lastDetail(write).reason, lastDetail(write).storage_error], ['STORAGE_WRITE_ERROR', 'DRAFT_STORAGE_UNAVAILABLE']); });
test('same identity blocked to active emits ready and restores persisted only', () => { const app = controllerApp(memory(JSON.stringify(state(draft(undefined, undefined, { notes: 'retorno' }))))); app.apply('PATIENT_MISMATCH'); app.apply(); assert.deepEqual([lastDetail(app).ready, lastDetail(app).has_saved, app.elements.fhSegDraftNotes.value], [true, true, 'retorno']); });
test('event source never adds clinical audit or nested payload fields', () => { const start = draftSource.indexOf("new EventConstructor('farmacia:followup-draft-state-v4'"); const body = draftSource.slice(start, draftSource.indexOf('} }', start)); for (const forbidden of ['notes', 'mg1', 'ae_present', 'proms_collected', 'saved_at', 'baseline']) assert.doesNotMatch(body, new RegExp(forbidden)); });
test('HTML card is a div between context and draft and scripts have required order', () => { assert.match(html, /<div class="dashboard-card" id="fhSegPersistedReviewCard"/); assert.ok(html.indexOf('fhSegCanonicalContext') < html.indexOf('fhSegPersistedReviewCard')); assert.ok(html.indexOf('fhSegPersistedReviewCard') < html.indexOf('fhSegDraftCard')); const scripts = ['farmacia_followup_drafts_v4.js', 'farmacia_followup_persisted_review_v4.js', 'farmacia_followup_context_v4.js'].map((name) => html.indexOf(name)); assert.deepEqual(scripts, scripts.slice().sort((a, b) => a - b)); });
test('card explicitly says persisted draft review and not care record', () => { const start = html.indexOf('id="fhSegPersistedReviewCard"'); const end = html.indexOf('</div><section', start); const card = html.slice(start, end); assert.match(card, /Revisión del último borrador persistido/); assert.match(card, /No constituye un registro asistencial/); assert.doesNotMatch(card, /<input|<select|<textarea|<button/); });

assert.ok(passed >= 24);
console.log(`farmacia_followup_persisted_review_v4_check: PASSED_${passed}_READ_ONLY_REVIEW_EVENT_PARTITION_STATE_CASES`);
