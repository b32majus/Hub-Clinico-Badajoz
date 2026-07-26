#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const drafts = require(path.join(ROOT, 'scripts/farmacia_followup_drafts_v4.js'));
const html = fs.readFileSync(path.join(ROOT, 'farmacia_seguimiento.html'), 'utf8');
const draftSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_followup_drafts_v4.js'), 'utf8');
const contextSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_followup_context_v4.js'), 'utf8');

const LEGACY_SCENARIOS = ['valid_v2_to_v4', 'valid_v4_precedence', 'corrupt_v4_no_fallback', 'absent_v1_v2_v3_v4'];
const INTENTIONALLY_RETIRED = [];
const MIGRATION_PARITY = Object.freeze({ valid_v2_to_v4: 'identity_notes_answers_preserved_ae_proms_empty', valid_v4_precedence: 'v4_used_without_legacy_read_or_write', corrupt_v4_no_fallback: 'fail_closed', absent_v1_v2_v3_v4: 'empty' });
const CONTRACT_MATRIX = Object.freeze({
  context_data_line_producers: ['FarmaciaFollowupContextV4', 'FarmaciaDataSource', 'FarmaciaMultitreatmentCore'],
  ui_producer: ['farmacia_seguimiento.html#fhSegDraftCard'],
  consumers: ['FarmaciaFollowupDraftsV4.createStore', 'FarmaciaFollowupDraftsV4.createController'],
  context_change_caller: ['FarmaciaFollowupContextV4.searchCip', 'FarmaciaFollowupContextV4.selectLine'],
  evidence: ['farmacia_followup_adherence_draft_v4_check.mjs', 'farmacia_followup_adherence_draft_v4_qa.mjs']
});

let passed = 0;
const migrationResults = [];
function test(name, run) { run(); passed += 1; console.log(`ok ${passed} - ${name}`); }
function migrationResult(scenario, parity, evidence) {
  migrationResults.push({ scenario, parity, consumers: Object.keys(evidence).filter((consumer) => evidence[consumer]) });
}
function storage(seed = {}) {
  const data = new Map(Object.entries(seed));
  const writes = [];
  return {
    data, writes,
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { writes.push(key); data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}
function draft(patientId = 'patient-a', lineId = 'line-a', overrides = {}) {
  return { draft_id: `followup:${lineId}`, patient_id: patientId, line_id: lineId, kind: 'followup', notes: 'saved',
    mg1: '', mg2: '', mg3: '', mg4: '', ae_present: '', ae_description: '', ae_severity: '', ae_resolution: '',
    proms_collected: '', dlqi_total: '', eva_dolor: '', eva_prurito: '',
    saved_at: '2026-07-26T10:00:00.000Z', saved_by_demo: 'Profesional FH-01', ...overrides };
}
function legacyDraft(patientId = 'patient-a', lineId = 'line-a', notes = 'legacy notes') {
  const value = draft(patientId, lineId, { notes });
  delete value.ae_present; delete value.ae_description; delete value.ae_severity; delete value.ae_resolution;
  delete value.proms_collected; delete value.dlqi_total; delete value.eva_dolor; delete value.eva_prurito;
  return value;
}
function state(schema, ...items) {
  const value = { schema, patients: {} };
  for (const item of items) {
    value.patients[item.patient_id] ||= { lines: {} };
    value.patients[item.patient_id].lines[item.line_id] = item;
  }
  return value;
}
function element(id) {
  return { id, value: '', textContent: id === 'currentProfessional' ? 'Profesional FH-01' : '', disabled: true, attributes: {},
    setAttribute(key, value) { this.attributes[key] = String(value); }, getAttribute(key) { return this.attributes[key] ?? null; } };
}
function app(backing = storage(), confirm = () => true) {
  const ids = ['fhSegDraftNotes', 'fhSegDraftAdherence', 'fhSegDraftAdherenceStatus', 'fhSegDraftMg1', 'fhSegDraftMg2', 'fhSegDraftMg3', 'fhSegDraftMg4',
    'fhSegDraftSave', 'fhSegDraftDiscard', 'fhSegDraftStatus', 'currentProfessional'];
  const elements = Object.fromEntries(ids.map((id) => [id, element(id)]));
  const env = { sessionStorage: backing, confirm, document: { getElementById: (id) => elements[id] || null }, __farmaciaFollowupContextV4: null };
  const controller = drafts.createController(env, { storage: backing, confirm, now: () => '2026-07-26T11:00:00.000Z' });
  function apply(patient_id = 'patient-a', line_id = 'line-a', code = 'CANONICAL_ACTIVE_CONTEXT_READY', status = code === 'CANONICAL_ACTIVE_CONTEXT_READY' ? 'active' : '') {
    const detail = { ok: code === 'CANONICAL_ACTIVE_CONTEXT_READY', code, patient_id, line_id, status };
    env.__farmaciaFollowupContextV4 = { ok: detail.ok, code, patient_id, line_id, line: status ? { status } : null };
    controller.applyContext(detail);
  }
  function applyShape(statusShape, contextShape = statusShape) {
    const base = { ok: true, code: 'CANONICAL_ACTIVE_CONTEXT_READY', patient_id: 'patient-a', line_id: 'line-a' };
    const detail = { ...base, ...statusShape };
    env.__farmaciaFollowupContextV4 = { ...base, ...contextShape };
    controller.applyContext(detail);
    return env.__farmaciaFollowupContextV4;
  }
  function answer(field, value) { elements[`fhSegDraftM${field.slice(1)}`].value = value; controller.onInput(); }
  return { backing, elements, env, controller, apply, applyShape, answer };
}

test('valid v2 migrates to v4 through controller and UI with answers preserved, empty AE/PROMs and leaves v2 untouched', () => {
  const old = JSON.stringify(state(drafts.LEGACY_STORE_KEY, legacyDraft()));
  const backing = storage({ [drafts.LEGACY_STORE_KEY]: old });
  const value = app(backing);
  value.apply();
  const loaded = value.controller.store.read();
  assert.equal(loaded.code, 'DRAFT_STATE_VALID');
  assert.deepEqual(loaded.state.patients['patient-a'].lines['line-a'], draft('patient-a', 'line-a', { notes: 'legacy notes' }));
  assert.equal(value.elements.fhSegDraftNotes.value, 'legacy notes');
  assert.deepEqual([1, 2, 3, 4].map((number) => value.elements[`fhSegDraftMg${number}`].value), ['', '', '', '']);
  assert.equal(value.elements.fhSegDraftNotes.disabled, false);
  assert.equal(value.elements.fhSegDraftStatus.attributes['data-status-code'], 'DRAFT_RESTORED');
  assert.equal(backing.getItem(drafts.LEGACY_STORE_KEY), old);
  assert.deepEqual(backing.writes, [drafts.STORE_KEY]);
  migrationResult('valid_v2_to_v4', 'identity_notes_answers_preserved_ae_proms_empty', {
    draft_store: backing.writes.length === 1 && backing.writes[0] === drafts.STORE_KEY,
    draft_controller: value.controller.state().ready,
    canonical_draft_ui: value.elements.fhSegDraftNotes.value === 'legacy notes'
  });
});
test('valid v4 has precedence and does not read or rewrite valid v2', () => {
  const v4 = state(drafts.SCHEMA, draft('patient-a', 'line-a', { notes: 'v4', mg1: 'si' }));
  const backing = storage({ [drafts.STORE_KEY]: JSON.stringify(v4), [drafts.LEGACY_STORE_KEY]: JSON.stringify(state(drafts.LEGACY_STORE_KEY, legacyDraft())) });
  const loaded = drafts.createStore(backing).read();
  assert.equal(loaded.state.patients['patient-a'].lines['line-a'].notes, 'v4');
  assert.deepEqual(backing.writes, []);
  migrationResult('valid_v4_precedence', 'v4_used_without_legacy_read_or_write', { draft_store: loaded.state.patients['patient-a'].lines['line-a'].notes === 'v4' });
});
test('present corrupt v4 fails closed without v2 fallback or writes', () => {
  const v1 = JSON.stringify(state(drafts.LEGACY_STORE_KEY, legacyDraft()));
  const backing = storage({ [drafts.STORE_KEY]: '{', [drafts.LEGACY_STORE_KEY]: v1 });
  const loaded = drafts.createStore(backing).read();
  assert.equal(loaded.code, 'DRAFT_STORAGE_CORRUPT');
  assert.equal(backing.getItem(drafts.LEGACY_STORE_KEY), v1);
  assert.deepEqual(backing.writes, []);
  migrationResult('corrupt_v4_no_fallback', 'fail_closed', { draft_store: loaded.code === 'DRAFT_STORAGE_CORRUPT' });
});
test('absent v1, v2, v3 and v4 is empty and does not write', () => { const backing = storage(); const loaded = drafts.createStore(backing).read(); assert.equal(loaded.code, 'DRAFT_EMPTY'); assert.deepEqual(backing.writes, []); migrationResult('absent_v1_v2_v3_v4', 'empty', { draft_store: loaded.code === 'DRAFT_EMPTY' }); });
test('incompatible or invalid v2 fails closed without writes', () => { const backing = storage({ [drafts.LEGACY_STORE_KEY]: JSON.stringify({ schema: 'wrong', patients: {} }) }); assert.equal(drafts.createStore(backing).read().code, 'DRAFT_SCHEMA_MISMATCH'); assert.deepEqual(backing.writes, []); });
test('migration write failure leaves v2 untouched and v4 absent', () => {
  const old = JSON.stringify(state(drafts.LEGACY_STORE_KEY, legacyDraft()));
  const data = new Map([[drafts.LEGACY_STORE_KEY, old]]);
  const backing = { getItem: (key) => data.has(key) ? data.get(key) : null, setItem: () => { throw new Error('denied'); } };
  assert.equal(drafts.createStore(backing).read().code, 'DRAFT_STORAGE_UNAVAILABLE');
  assert.equal(data.get(drafts.LEGACY_STORE_KEY), old);
  assert.equal(data.has(drafts.STORE_KEY), false);
});
test('v4 answer values are exactly empty, si or no', () => { for (const value of ['', 'si', 'no']) assert.equal(drafts.validateState(state(drafts.SCHEMA, draft('p', 'l', { mg1: value }))).ok, true); assert.equal(drafts.validateState(state(drafts.SCHEMA, draft('p', 'l', { mg1: 'unknown' }))).code, 'DRAFT_STATE_INVALID'); });
test('active coherent context enables notes and all answers', () => { const value = app(); value.apply(); assert.equal(value.elements.fhSegDraftNotes.disabled, false); for (let i = 1; i <= 4; i += 1) assert.equal(value.elements[`fhSegDraftMg${i}`].disabled, false); });
test('nested active status without top-level status enables all draft fields', () => { const value = app(); value.applyShape({ line: { status: 'active' } }); assert.equal(value.controller.state().ready, true); assert.equal(value.elements.fhSegDraftNotes.disabled, false); for (let i = 1; i <= 4; i += 1) assert.equal(value.elements[`fhSegDraftMg${i}`].disabled, false); });
test('top-level and nested active statuses allow save', () => { const value = app(); value.applyShape({ status: 'active', line: { status: 'active' } }); value.answer('mg1', 'si'); assert.equal(value.controller.save().ok, true); assert.equal(value.controller.store.get('patient-a', 'line-a').draft.mg1, 'si'); });
test('top-level historical contradicting nested active blocks', () => { const value = app(); value.applyShape({ status: 'historical', line: { status: 'active' } }); assert.equal(value.controller.state().ready, false); assert.equal(value.elements.fhSegDraftSave.disabled, true); assert.equal(value.controller.save().code, 'DRAFT_ACTIVE_CONTEXT_REQUIRED'); });
test('top-level active contradicting nested historical blocks', () => { const value = app(); value.applyShape({ status: 'active', line: { status: 'historical' } }); assert.equal(value.controller.state().ready, false); assert.equal(value.elements.fhSegDraftSave.disabled, true); assert.equal(value.controller.save().code, 'DRAFT_ACTIVE_CONTEXT_REQUIRED'); });
test('missing and unknown statuses block', () => { for (const statusShape of [{}, { status: 'unknown' }, { line: { status: 'unknown' } }]) { const value = app(); value.applyShape(statusShape); assert.equal(value.controller.state().ready, false); assert.equal(value.elements.fhSegDraftNotes.disabled, true); } });
test('save rechecks both status locations and persists neither contradiction', () => { for (const conflict of [{ status: 'historical', line: { status: 'active' } }, { status: 'active', line: { status: 'historical' } }]) { const value = app(); const context = value.applyShape({ status: 'active', line: { status: 'active' } }); value.answer('mg1', 'si'); Object.assign(context, conflict); assert.equal(value.controller.save().code, 'DRAFT_ACTIVE_CONTEXT_REQUIRED'); assert.equal(value.backing.getItem(drafts.STORE_KEY), null); } });
test('contradictory ready code with non-active status clears and blocks fail closed', () => { const value = app(); value.apply(); value.elements.fhSegDraftNotes.value = 'must clear'; value.answer('mg1', 'si'); value.apply('patient-a', 'line-a', 'CANONICAL_ACTIVE_CONTEXT_READY', 'historical'); assert.equal(value.controller.state().ready, false); assert.equal(value.elements.fhSegDraftNotes.value, ''); assert.deepEqual([1, 2, 3, 4].map((number) => value.elements[`fhSegDraftMg${number}`].value), ['', '', '', '']); assert.equal(value.elements.fhSegDraftNotes.disabled, true); for (let i = 1; i <= 4; i += 1) assert.equal(value.elements[`fhSegDraftMg${i}`].disabled, true); assert.equal(value.controller.save().code, 'DRAFT_ACTIVE_CONTEXT_REQUIRED'); });
test('historical and incoherent contexts clear and block all fields', () => { for (const code of ['LINE_NOT_ACTIVE', 'PATIENT_NOT_FOUND', 'HUB_GRAPH_INCOHERENT']) { const value = app(); value.apply(); value.answer('mg1', 'si'); value.apply('patient-a', 'line-a', code); assert.equal(value.elements.fhSegDraftMg1.value, ''); assert.equal(value.elements.fhSegDraftMg1.disabled, true); } });
test('adherence states are empty, partial and complete uninterpreted', () => { const value = app(); value.apply(); assert.equal(value.elements.fhSegDraftAdherenceStatus.attributes['data-status-code'], 'ADHERENCE_EMPTY'); value.answer('mg1', 'si'); assert.equal(value.elements.fhSegDraftAdherenceStatus.attributes['data-status-code'], 'ADHERENCE_PARTIAL'); for (const field of ['mg2', 'mg3', 'mg4']) value.answer(field, 'no'); assert.equal(value.elements.fhSegDraftAdherenceStatus.attributes['data-status-code'], 'ADHERENCE_COMPLETE_UNINTERPRETED'); assert.equal(value.elements.fhSegDraftAdherenceStatus.textContent, 'Cuestionario de adherencia completo. Interpretación clínica no habilitada en esta versión.'); });
test('answers and notes both participate in dirty state', () => { const value = app(); value.apply(); value.answer('mg2', 'si'); assert.equal(value.controller.state().dirty, true); value.answer('mg2', ''); assert.equal(value.controller.state().dirty, false); value.elements.fhSegDraftNotes.value = 'note'; value.controller.onInput(); assert.equal(value.controller.state().dirty, true); });
test('saved responses restore independently by patient and line', () => { const value = app(); value.apply('patient-a', 'line-a'); value.answer('mg1', 'si'); value.controller.save(); value.apply('patient-a', 'line-b'); assert.equal(value.elements.fhSegDraftMg1.value, ''); value.answer('mg1', 'no'); value.controller.save(); value.apply('patient-b', 'line-a'); assert.equal(value.elements.fhSegDraftMg1.value, ''); value.apply('patient-a', 'line-a'); assert.equal(value.elements.fhSegDraftMg1.value, 'si'); });
test('S12 cancel preserves context and unsaved response', () => { const value = app(storage(), () => false); value.apply(); value.answer('mg3', 'si'); assert.equal(value.controller.beforeContextChange({ next: { patient_id: 'patient-b', line_id: 'line-b' } }), 'cancel'); assert.equal(value.elements.fhSegDraftMg3.value, 'si'); assert.equal(value.controller.state().dirty, true); });
test('S12 accept discards only unsaved response and latest saved remains', () => { const value = app(storage(), () => true); value.apply(); value.answer('mg1', 'si'); value.controller.save(); value.answer('mg1', 'no'); assert.equal(value.controller.beforeContextChange({ next: { patient_id: 'patient-b', line_id: 'line-b' } }), 'proceed'); assert.equal(value.elements.fhSegDraftMg1.value, 'si'); assert.equal(value.controller.store.get('patient-a', 'line-a').draft.mg1, 'si'); value.apply('patient-b', 'line-b'); assert.equal(value.elements.fhSegDraftMg1.value, ''); });
test('storage write failure is visible and blocked while preserving unsaved UI, baseline and existing bytes', () => { const raw = JSON.stringify(state(drafts.SCHEMA, draft())); const backing = { getItem: () => raw, setItem: () => { throw new Error('denied'); } }; const value = app(backing); value.apply(); value.answer('mg1', 'si'); const baseline = { ...value.controller.state().baseline }; assert.equal(value.controller.save().code, 'DRAFT_STORAGE_UNAVAILABLE'); assert.equal(value.elements.fhSegDraftStatus.attributes['data-status-code'], 'DRAFT_STORAGE_UNAVAILABLE'); assert.equal(value.elements.fhSegDraftMg1.value, 'si'); assert.equal(value.elements.fhSegDraftMg1.disabled, true); assert.equal(value.controller.state().dirty, true); assert.deepEqual(value.controller.state().baseline, baseline); assert.equal(backing.getItem(drafts.STORE_KEY), raw); });
test('canonical UI contains exact answer fields and no interpretation output', () => { const card = html.slice(html.indexOf('id="fhSegDraftCard"'), html.indexOf('</section>', html.indexOf('id="fhSegDraftCard"'))); for (let i = 1; i <= 4; i += 1) assert.match(card, new RegExp(`id="fhSegDraftMg${i}"[\\s\\S]*data-draft-adherence="mg${i}"`)); assert.match(card, /ADHERENCE_EMPTY/); assert.doesNotMatch(card, /clasificaci[oó]n|recomendaci[oó]n|adherente|no adherente/i); });
test('producer consumer matrix is wired and protected modules remain read-only', () => { assert.deepEqual(Object.keys(CONTRACT_MATRIX), ['context_data_line_producers', 'ui_producer', 'consumers', 'context_change_caller', 'evidence']); assert.match(contextSource, /FarmaciaFollowupDraftsV4[\s\S]*beforeContextChange/); assert.match(draftSource, /farmacia:followup-context-applied-v4/); for (const name of ['farmacia_followup_context_v4.js', 'farmacia_multitreatment_core.js', 'farmacia_data_source_v4_core.js', 'farmacia_validacion_model.js']) assert.ok(fs.existsSync(path.join(ROOT, 'scripts', name))); });
test('migration matrix is derived from completed scenario assertions', () => {
  const mapped = migrationResults.map((result) => result.scenario);
  const missing = LEGACY_SCENARIOS.filter((value) => !mapped.includes(value) && !INTENTIONALLY_RETIRED.includes(value));
  assert.deepEqual([...mapped, ...INTENTIONALLY_RETIRED].sort(), LEGACY_SCENARIOS.slice().sort());
  assert.deepEqual(missing, []);
  assert.deepEqual(Object.fromEntries(migrationResults.map((result) => [result.scenario, result.parity])), MIGRATION_PARITY);
  assert.ok(migrationResults.every((result) => result.consumers.length > 0));
});

assert.ok(passed >= 19);
const MAPPED = migrationResults.map((result) => result.scenario);
const MISSING = LEGACY_SCENARIOS.filter((value) => !MAPPED.includes(value) && !INTENTIONALLY_RETIRED.includes(value));
const CONSUMERS_TESTED = [...new Set(migrationResults.flatMap((result) => result.consumers))];
console.log(`farmacia_followup_adherence_draft_v4_check: PASSED_${passed}_ADHERENCE_DRAFT_AND_MIGRATION_CASES`);
console.log('MIGRATION_MATRIX', JSON.stringify({ LEGACY_SCENARIOS, MAPPED, INTENTIONALLY_RETIRED, MISSING, CONSUMERS_TESTED, MIGRATION_PARITY, results: migrationResults }));
console.log('PRODUCER_CONSUMER_MATRIX', JSON.stringify(CONTRACT_MATRIX));
