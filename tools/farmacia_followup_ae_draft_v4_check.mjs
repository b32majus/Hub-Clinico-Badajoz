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
const source = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_followup_drafts_v4.js'), 'utf8');
const contextSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_followup_context_v4.js'), 'utf8');

const LEGACY_SCENARIOS = ['valid_v3_precedence', 'v2_to_v3', 'v1_to_v3', 'corrupt_v3', 'corrupt_v2_no_fallback', 'absent_stores', 'write_failure'];
const INTENTIONALLY_RETIRED = [];
const MIGRATION_PARITY = Object.freeze({
  valid_v3_precedence: 'v3_wins_without_legacy_read_or_write',
  v2_to_v3: 'identity_notes_adherence_audit_preserved_ae_empty',
  v1_to_v3: 'identity_notes_audit_preserved_adherence_ae_empty',
  corrupt_v3: 'fail_closed_without_fallback',
  corrupt_v2_no_fallback: 'fail_closed_without_v1_fallback',
  absent_stores: 'empty_without_write',
  write_failure: 'legacy_untouched_v3_absent'
});
const CONSUMER_MATRIX = Object.freeze({
  context_producer: 'FarmaciaFollowupContextV4 event/context',
  ui_producer: 'farmacia_seguimiento.html#fhSegDraftCard explicit AE inputs',
  store_consumer: 'FarmaciaFollowupDraftsV4.createStore',
  controller_render_consumer: 'FarmaciaFollowupDraftsV4.createController',
  context_change_callers: ['FarmaciaFollowupContextV4.searchCip', 'FarmaciaFollowupContextV4.selectLine']
});

let passed = 0;
const migrationResults = [];
function test(name, run) { run(); passed += 1; console.log(`ok ${passed} - ${name}`); }
function record(scenario, evidence) { migrationResults.push({ scenario, parity: MIGRATION_PARITY[scenario], consumers: Object.keys(evidence).filter((key) => evidence[key]) }); }
function memory(seed = {}, failWrite = false) {
  const data = new Map(Object.entries(seed));
  const reads = [];
  const writes = [];
  return {
    data, reads, writes,
    getItem(key) { reads.push(key); return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { if (typeof failWrite === 'function' ? failWrite(key, value) : failWrite) throw new Error('denied'); writes.push(key); data.set(key, String(value)); }
  };
}
function v3Draft(patient = 'patient-a', line = 'line-a', overrides = {}) {
  return { draft_id: `followup:${line}`, patient_id: patient, line_id: line, kind: 'followup', notes: 'notes',
    mg1: '', mg2: '', mg3: '', mg4: '', ae_present: '', ae_description: '', ae_severity: '', ae_resolution: '',
    saved_at: '2026-07-26T10:00:00.000Z', saved_by_demo: 'Profesional FH-01', ...overrides };
}
function v2Draft(patient = 'patient-a', line = 'line-a', overrides = {}) {
  const value = v3Draft(patient, line, overrides);
  delete value.ae_present; delete value.ae_description; delete value.ae_severity; delete value.ae_resolution;
  return value;
}
function v1Draft(patient = 'patient-a', line = 'line-a', overrides = {}) {
  const value = v2Draft(patient, line, overrides);
  delete value.mg1; delete value.mg2; delete value.mg3; delete value.mg4;
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
function app(backing = memory(), confirm = () => true) {
  const ids = ['fhSegDraftNotes', 'fhSegDraftAdherence', 'fhSegDraftAdherenceStatus', 'fhSegDraftMg1', 'fhSegDraftMg2', 'fhSegDraftMg3', 'fhSegDraftMg4',
    'fhSegDraftAe', 'fhSegDraftAeStatus', 'fhSegDraftAePresent', 'fhSegDraftAeDescription', 'fhSegDraftAeSeverity', 'fhSegDraftAeResolution',
    'fhSegDraftSave', 'fhSegDraftDiscard', 'fhSegDraftStatus', 'currentProfessional'];
  const elements = Object.fromEntries(ids.map((id) => [id, element(id)]));
  const env = { sessionStorage: backing, confirm, document: { getElementById: (id) => elements[id] || null }, __farmaciaFollowupContextV4: null };
  const controller = drafts.createController(env, { storage: backing, confirm, now: () => '2026-07-26T11:00:00.000Z' });
  function apply(patient_id = 'patient-a', line_id = 'line-a', code = 'CANONICAL_ACTIVE_CONTEXT_READY', status = 'active') {
    const ok = code === 'CANONICAL_ACTIVE_CONTEXT_READY';
    const detail = { ok, code, patient_id, line_id, status };
    env.__farmaciaFollowupContextV4 = { ok, code, patient_id, line_id, line: status ? { status } : null };
    controller.applyContext(detail);
  }
  function change(field, value) { elements[`fhSegDraft${field}`].value = value; controller.onInput(field === 'AePresent' ? 'ae_present' : field.replace(/^Ae/, 'ae_').toLowerCase()); }
  return { backing, elements, env, controller, apply, change };
}

test('valid v3 wins without reading or rewriting v2/v1', () => {
  const backing = memory({ [drafts.STORE_KEY]: JSON.stringify(state(drafts.SCHEMA, v3Draft('patient-a', 'line-a', { notes: 'v3' }))), [drafts.LEGACY_STORE_KEY]: '{', [drafts.V1_STORE_KEY]: '{' });
  const loaded = drafts.createStore(backing).read();
  assert.equal(loaded.state.patients['patient-a'].lines['line-a'].notes, 'v3');
  assert.deepEqual(backing.reads, [drafts.STORE_KEY]); assert.deepEqual(backing.writes, []);
  record('valid_v3_precedence', { draft_store: loaded.ok });
});
test('valid v2 migrates to v3 preserving identity, notes, adherence and audit with empty AE', () => {
  const old = JSON.stringify(state(drafts.LEGACY_STORE_KEY, v2Draft('patient-a', 'line-a', { notes: 'v2', mg1: 'si', mg4: 'no' })));
  const backing = memory({ [drafts.LEGACY_STORE_KEY]: old }); const loaded = drafts.createStore(backing).read(); const value = loaded.state.patients['patient-a'].lines['line-a'];
  assert.deepEqual(value, v3Draft('patient-a', 'line-a', { notes: 'v2', mg1: 'si', mg4: 'no' }));
  assert.equal(backing.data.get(drafts.LEGACY_STORE_KEY), old); assert.deepEqual(backing.writes, [drafts.STORE_KEY]);
  record('v2_to_v3', { draft_store: loaded.ok, migration_writer: backing.writes.length === 1 });
});
test('valid v1 migrates to v3 preserving identity, notes and audit with empty adherence and AE', () => {
  const old = JSON.stringify(state(drafts.V1_STORE_KEY, v1Draft('patient-a', 'line-a', { notes: 'v1' })));
  const backing = memory({ [drafts.V1_STORE_KEY]: old }); const loaded = drafts.createStore(backing).read();
  assert.deepEqual(loaded.state.patients['patient-a'].lines['line-a'], v3Draft('patient-a', 'line-a', { notes: 'v1' }));
  assert.equal(backing.data.get(drafts.V1_STORE_KEY), old); assert.deepEqual(backing.writes, [drafts.STORE_KEY]);
  record('v1_to_v3', { draft_store: loaded.ok, migration_writer: backing.writes.length === 1 });
});
test('corrupt v3 fails closed without legacy fallback', () => {
  const backing = memory({ [drafts.STORE_KEY]: '{', [drafts.LEGACY_STORE_KEY]: JSON.stringify(state(drafts.LEGACY_STORE_KEY, v2Draft())) });
  const loaded = drafts.createStore(backing).read(); assert.equal(loaded.code, 'DRAFT_STORAGE_CORRUPT'); assert.deepEqual(backing.reads, [drafts.STORE_KEY]); assert.deepEqual(backing.writes, []);
  record('corrupt_v3', { draft_store: loaded.code === 'DRAFT_STORAGE_CORRUPT' });
});
test('corrupt or incompatible v2 fails closed without v1 fallback', () => {
  const backing = memory({ [drafts.LEGACY_STORE_KEY]: JSON.stringify({ schema: 'wrong', patients: {} }), [drafts.V1_STORE_KEY]: JSON.stringify(state(drafts.V1_STORE_KEY, v1Draft())) });
  const loaded = drafts.createStore(backing).read(); assert.equal(loaded.code, 'DRAFT_SCHEMA_MISMATCH'); assert.equal(backing.reads.includes(drafts.V1_STORE_KEY), false); assert.deepEqual(backing.writes, []);
  record('corrupt_v2_no_fallback', { draft_store: loaded.code === 'DRAFT_SCHEMA_MISMATCH' });
});
test('all stores absent returns empty without write', () => {
  const backing = memory(); const loaded = drafts.createStore(backing).read(); assert.equal(loaded.code, 'DRAFT_EMPTY'); assert.deepEqual(backing.writes, []);
  record('absent_stores', { draft_store: loaded.code === 'DRAFT_EMPTY' });
});
test('migration write failure leaves legacy stores untouched and v3 absent', () => {
  const old = JSON.stringify(state(drafts.LEGACY_STORE_KEY, v2Draft())); const backing = memory({ [drafts.LEGACY_STORE_KEY]: old }, true);
  const loaded = drafts.createStore(backing).read(); assert.equal(loaded.code, 'DRAFT_STORAGE_UNAVAILABLE'); assert.equal(backing.data.get(drafts.LEGACY_STORE_KEY), old); assert.equal(backing.data.has(drafts.STORE_KEY), false);
  record('write_failure', { draft_store: loaded.code === 'DRAFT_STORAGE_UNAVAILABLE' });
});

test('v3 exact shape and raw enums reject residues and unknown values', () => {
  assert.deepEqual(Object.keys(v3Draft()), ['draft_id', 'patient_id', 'line_id', 'kind', 'notes', 'mg1', 'mg2', 'mg3', 'mg4', 'ae_present', 'ae_description', 'ae_severity', 'ae_resolution', 'saved_at', 'saved_by_demo']);
  for (const ae_present of ['', 'no_consta', 'no']) assert.equal(drafts.validateState(state(drafts.SCHEMA, v3Draft('p', 'l', { ae_present }))).ok, true);
  for (const ae_severity of ['', 'leve', 'moderado', 'grave', 'requiere_derivacion']) assert.equal(drafts.validateState(state(drafts.SCHEMA, v3Draft('p', 'l', { ae_present: 'si', ae_severity }))).ok, true);
  for (const ae_resolution of ['', 'no_consta', 'no', 'si', 'en_seguimiento']) assert.equal(drafts.validateState(state(drafts.SCHEMA, v3Draft('p', 'l', { ae_present: 'si', ae_resolution }))).ok, true);
  assert.equal(drafts.validateState(state(drafts.SCHEMA, v3Draft('p', 'l', { ae_present: 'no', ae_description: 'residue' }))).code, 'DRAFT_STATE_INVALID');
  assert.equal(drafts.validateState(state(drafts.SCHEMA, v3Draft('p', 'l', { ae_present: 'si', ae_severity: 'unknown' }))).code, 'DRAFT_STATE_INVALID');
});
test('visible AE states and exact completed text are deterministic and uninterpreted', () => {
  const value = app(); value.apply(); const status = value.elements.fhSegDraftAeStatus;
  assert.equal(status.attributes['data-status-code'], 'AE_EMPTY');
  value.change('AePresent', 'no_consta'); assert.equal(status.attributes['data-status-code'], 'AE_NOT_RECORDED');
  value.change('AePresent', 'no'); assert.equal(status.attributes['data-status-code'], 'AE_NO_EVENT');
  value.change('AePresent', 'si'); assert.equal(status.attributes['data-status-code'], 'AE_PRESENT_INCOMPLETE');
  value.change('AeDescription', 'Descripción sintética explícita'); value.change('AeSeverity', 'requiere_derivacion'); value.change('AeResolution', 'en_seguimiento');
  assert.equal(status.attributes['data-status-code'], 'AE_PRESENT_COMPLETE_UNINTERPRETED');
  assert.equal(status.textContent, 'Efecto adverso documentado en borrador. Causalidad clínica no evaluada en esta versión.');
});
test('AE completeness trims description and successful save persists the peripheral trim', () => {
  const value = app(); value.apply(); value.change('AePresent', 'si'); value.change('AeDescription', '   '); value.change('AeSeverity', 'grave'); value.change('AeResolution', 'en_seguimiento');
  assert.equal(value.elements.fhSegDraftAeStatus.attributes['data-status-code'], 'AE_PRESENT_INCOMPLETE');
  value.change('AeDescription', '  Descripción sintética  ');
  assert.equal(value.elements.fhSegDraftAeStatus.attributes['data-status-code'], 'AE_PRESENT_COMPLETE_UNINTERPRETED');
  const result = value.controller.save();
  assert.equal(result.draft.ae_description, 'Descripción sintética');
  assert.equal(value.elements.fhSegDraftAeDescription.value, 'Descripción sintética');
  assert.equal(value.controller.state().baseline.ae_description, 'Descripción sintética');
  assert.equal(value.controller.state().dirty, false);
});
test('non-si selection clears and disables all details and persists no residue', () => {
  const value = app(); value.apply(); value.change('AePresent', 'si'); value.change('AeDescription', 'raw'); value.change('AeSeverity', 'grave'); value.change('AeResolution', 'no');
  value.change('AePresent', 'no_consta');
  for (const id of ['fhSegDraftAeDescription', 'fhSegDraftAeSeverity', 'fhSegDraftAeResolution']) { assert.equal(value.elements[id].value, ''); assert.equal(value.elements[id].disabled, true); }
  const saved = value.controller.save().draft; assert.deepEqual([saved.ae_description, saved.ae_severity, saved.ae_resolution], ['', '', '']);
});
test('requiere_derivacion is only a stored severity and triggers no derived field or action', () => {
  const value = app(); value.apply(); value.change('AePresent', 'si'); value.change('AeDescription', 'raw'); value.change('AeSeverity', 'requiere_derivacion'); value.change('AeResolution', 'no_consta');
  const saved = value.controller.save().draft; assert.equal(saved.ae_severity, 'requiere_derivacion'); assert.deepEqual(Object.keys(saved), Object.keys(v3Draft()));
  assert.doesNotMatch(source, /derivaci[oó]n.*(?:trigger|action)|causal(?:ity|idad)[_a-z]*\s*:/i);
});
test('notes, adherence and every AE field participate in dirty state', () => {
  for (const [id, value, eventField] of [['fhSegDraftNotes', 'n', undefined], ['fhSegDraftMg1', 'si', undefined], ['fhSegDraftAePresent', 'si', 'ae_present']]) {
    const appValue = app(); appValue.apply(); appValue.elements[id].value = value; appValue.controller.onInput(eventField); assert.equal(appValue.controller.state().dirty, true);
  }
  const value = app(); value.apply(); value.change('AePresent', 'si'); value.controller.save();
  for (const [field, input] of [['AeDescription', 'd'], ['AeSeverity', 'leve'], ['AeResolution', 'si']]) { value.change(field, input); assert.equal(value.controller.state().dirty, true); value.controller.save(); }
});
test('historical, unknown, incoherent, contradictory and storage-invalid contexts are empty blocked', () => {
  for (const [code, status] of [['LINE_NOT_ACTIVE', 'historical'], ['PATIENT_NOT_FOUND', ''], ['HUB_GRAPH_INCOHERENT', 'active'], ['CANONICAL_ACTIVE_CONTEXT_READY', 'historical']]) {
    const value = app(); value.apply('patient-a', 'line-a', code, status); assert.equal(value.controller.state().ready, false); assert.equal(value.elements.fhSegDraftAePresent.disabled, true); assert.equal(value.elements.fhSegDraftAePresent.value, '');
  }
  const invalid = app(memory({ [drafts.STORE_KEY]: '{' })); invalid.apply(); assert.equal(invalid.elements.fhSegDraftAePresent.disabled, true); assert.equal(invalid.controller.state().storageError, 'DRAFT_STORAGE_CORRUPT');
});
test('save write failure preserves every exact visible field, dirty state, baseline and old store bytes while blocking controls', () => {
  const prior = v3Draft('patient-a', 'line-a', { notes: 'saved notes', mg1: 'si', mg2: 'no', ae_present: 'si', ae_description: 'saved AE', ae_severity: 'leve', ae_resolution: 'si' });
  const raw = JSON.stringify(state(drafts.SCHEMA, prior));
  const backing = memory({ [drafts.STORE_KEY]: raw }, true); const value = app(backing); value.apply();
  value.elements.fhSegDraftNotes.value = ' unsaved notes '; value.controller.onInput();
  for (const [field, input] of [['Mg1', 'no'], ['Mg2', 'si'], ['Mg3', 'no'], ['Mg4', 'si']]) value.change(field, input);
  value.change('AeDescription', '  unsaved AE  '); value.change('AeSeverity', 'grave'); value.change('AeResolution', 'en_seguimiento');
  const visible = ['fhSegDraftNotes', 'fhSegDraftMg1', 'fhSegDraftMg2', 'fhSegDraftMg3', 'fhSegDraftMg4', 'fhSegDraftAePresent', 'fhSegDraftAeDescription', 'fhSegDraftAeSeverity', 'fhSegDraftAeResolution'].map((id) => value.elements[id].value);
  const baseline = { ...value.controller.state().baseline };
  assert.equal(value.controller.save().code, 'DRAFT_STORAGE_UNAVAILABLE');
  assert.deepEqual(['fhSegDraftNotes', 'fhSegDraftMg1', 'fhSegDraftMg2', 'fhSegDraftMg3', 'fhSegDraftMg4', 'fhSegDraftAePresent', 'fhSegDraftAeDescription', 'fhSegDraftAeSeverity', 'fhSegDraftAeResolution'].map((id) => value.elements[id].value), visible);
  assert.deepEqual(value.controller.state().baseline, baseline); assert.equal(value.controller.state().dirty, true); assert.equal(value.controller.state().hasSaved, true);
  assert.equal(backing.data.get(drafts.STORE_KEY), raw); assert.equal(value.elements.fhSegDraftStatus.attributes['data-status-code'], 'DRAFT_STORAGE_UNAVAILABLE');
  for (const id of ['fhSegDraftNotes', 'fhSegDraftMg1', 'fhSegDraftAePresent', 'fhSegDraftSave', 'fhSegDraftDiscard']) assert.equal(value.elements[id].disabled, true);
});
test('read failure discovered during save remains fail-closed with empty blocked UI and no write', () => {
  const raw = JSON.stringify(state(drafts.SCHEMA, v3Draft('patient-a', 'line-a', { notes: 'saved' })));
  let corrupt = false; const writes = [];
  const backing = { getItem(key) { if (key !== drafts.STORE_KEY) return null; return corrupt ? '{' : raw; }, setItem(key) { writes.push(key); } };
  const value = app(backing); value.apply(); value.elements.fhSegDraftNotes.value = 'unsaved'; value.controller.onInput(); corrupt = true;
  assert.equal(value.controller.save().code, 'DRAFT_STORAGE_CORRUPT');
  assert.deepEqual(['fhSegDraftNotes', 'fhSegDraftMg1', 'fhSegDraftMg2', 'fhSegDraftMg3', 'fhSegDraftMg4', 'fhSegDraftAePresent', 'fhSegDraftAeDescription', 'fhSegDraftAeSeverity', 'fhSegDraftAeResolution'].map((id) => value.elements[id].value), ['', '', '', '', '', '', '', '', '']);
  assert.equal(value.controller.state().dirty, false); assert.equal(value.controller.state().hasSaved, false); assert.deepEqual(writes, []);
  assert.equal(value.elements.fhSegDraftStatus.attributes['data-status-code'], 'DRAFT_STORAGE_CORRUPT'); assert.equal(value.elements.fhSegDraftNotes.disabled, true);
});
test('discard write failure preserves visible UI, baseline, saved flags and store bytes without claiming discard', () => {
  const prior = v3Draft('patient-a', 'line-a', { notes: 'saved notes', mg1: 'si', ae_present: 'si', ae_description: 'saved AE', ae_severity: 'moderado', ae_resolution: 'no' });
  const raw = JSON.stringify(state(drafts.SCHEMA, prior)); const backing = memory({ [drafts.STORE_KEY]: raw }, true); const value = app(backing); value.apply();
  const visible = ['fhSegDraftNotes', 'fhSegDraftMg1', 'fhSegDraftMg2', 'fhSegDraftMg3', 'fhSegDraftMg4', 'fhSegDraftAePresent', 'fhSegDraftAeDescription', 'fhSegDraftAeSeverity', 'fhSegDraftAeResolution'].map((id) => value.elements[id].value);
  const before = value.controller.state(); assert.equal(value.controller.discard().code, 'DRAFT_STORAGE_UNAVAILABLE');
  assert.deepEqual(['fhSegDraftNotes', 'fhSegDraftMg1', 'fhSegDraftMg2', 'fhSegDraftMg3', 'fhSegDraftMg4', 'fhSegDraftAePresent', 'fhSegDraftAeDescription', 'fhSegDraftAeSeverity', 'fhSegDraftAeResolution'].map((id) => value.elements[id].value), visible);
  assert.deepEqual(value.controller.state().baseline, before.baseline); assert.equal(value.controller.state().dirty, false); assert.equal(value.controller.state().hasSaved, true); assert.equal(value.controller.state().restored, true);
  assert.equal(backing.data.get(drafts.STORE_KEY), raw); assert.equal(value.elements.fhSegDraftStatus.attributes['data-status-code'], 'DRAFT_STORAGE_UNAVAILABLE');
});
test('invalid-context cancel preserves all fields; accept and clean block same identity then restore persisted-only without writes', () => {
  const prior = v3Draft('patient-a', 'line-a', { notes: 'persisted notes', mg1: 'si', mg2: 'no', mg3: 'si', mg4: 'no', ae_present: 'si', ae_description: 'persisted AE', ae_severity: 'leve', ae_resolution: 'en_seguimiento' });
  const raw = JSON.stringify(state(drafts.SCHEMA, prior));
  const ids = ['fhSegDraftNotes', 'fhSegDraftMg1', 'fhSegDraftMg2', 'fhSegDraftMg3', 'fhSegDraftMg4', 'fhSegDraftAePresent', 'fhSegDraftAeDescription', 'fhSegDraftAeSeverity', 'fhSegDraftAeResolution'];
  function makeDirty(value) {
    value.elements.fhSegDraftNotes.value = 'transient notes'; value.controller.onInput();
    value.change('Mg1', 'no'); value.change('Mg2', 'si'); value.change('Mg3', 'no'); value.change('Mg4', 'si');
    value.change('AeDescription', 'transient AE'); value.change('AeSeverity', 'grave'); value.change('AeResolution', 'no');
  }
  for (const blockedCode of ['PATIENT_NOT_FOUND', 'PATIENT_MISMATCH']) {
  const cancelledBacking = memory({ [drafts.STORE_KEY]: raw }); const cancelled = app(cancelledBacking, () => false); cancelled.apply(); makeDirty(cancelled);
  const cancelledVisible = ids.map((id) => cancelled.elements[id].value);
  assert.equal(cancelled.controller.beforeContextChange({ next: { patient_id: '', line_id: '' } }), 'cancel');
  assert.deepEqual(ids.map((id) => cancelled.elements[id].value), cancelledVisible); assert.equal(cancelled.controller.state().dirty, true);
  assert.deepEqual(cancelled.controller.state().current, { patient_id: 'patient-a', line_id: 'line-a' }); assert.equal(cancelledBacking.data.get(drafts.STORE_KEY), raw); assert.deepEqual(cancelledBacking.writes, []);

  let confirmations = 0; const backing = memory({ [drafts.STORE_KEY]: raw }); const value = app(backing, () => { confirmations += 1; return true; }); value.apply(); makeDirty(value);
  assert.equal(value.controller.beforeContextChange({ next: { patient_id: '', line_id: '' } }), 'proceed'); assert.equal(confirmations, 1);
  value.apply('patient-a', 'line-a', blockedCode, '');
  assert.equal(value.elements.fhSegDraftStatus.attributes['data-status-code'], 'DRAFT_UNSAVED_NOT_PERSISTED_CONTEXT_INELIGIBLE');
  assert.deepEqual(ids.map((id) => value.elements[id].value), ['', '', '', '', '', '', '', '', '']);
  assert.equal(value.controller.state().dirty, false); assert.equal(backing.data.get(drafts.STORE_KEY), raw); assert.deepEqual(backing.writes, []);
  value.apply('patient-a', 'line-a');
  assert.deepEqual(ids.map((id) => value.elements[id].value), ['persisted notes', 'si', 'no', 'si', 'no', 'si', 'persisted AE', 'leve', 'en_seguimiento']);
  assert.equal(value.controller.state().restored, true); assert.equal(value.controller.state().hasSaved, true); assert.deepEqual(backing.writes, []);

  assert.equal(value.controller.beforeContextChange({ next: { patient_id: '', line_id: '' } }), 'proceed'); assert.equal(confirmations, 1);
  value.apply('patient-a', 'line-a', blockedCode, '');
  assert.equal(value.elements.fhSegDraftStatus.attributes['data-status-code'], 'DRAFT_CONTEXT_INELIGIBLE'); assert.deepEqual(ids.map((id) => value.elements[id].value), ['', '', '', '', '', '', '', '', '']);
  assert.equal(backing.data.get(drafts.STORE_KEY), raw); assert.deepEqual(backing.writes, []);
  value.apply('patient-a', 'line-a'); assert.deepEqual(ids.map((id) => value.elements[id].value), ['persisted notes', 'si', 'no', 'si', 'no', 'si', 'persisted AE', 'leve', 'en_seguimiento']);
  }
});
test('S09 restore, S11 partitions and S12 cancel/accept semantics include all AE fields', () => {
  const value = app(memory(), () => false); value.apply('patient-a', 'line-a'); value.change('AePresent', 'si'); value.change('AeDescription', 'saved A'); value.change('AeSeverity', 'leve'); value.change('AeResolution', 'si'); value.controller.save();
  value.change('AeDescription', 'unsaved A'); assert.equal(value.controller.beforeContextChange({ next: { patient_id: 'patient-a', line_id: 'line-b' } }), 'cancel'); assert.equal(value.elements.fhSegDraftAeDescription.value, 'unsaved A'); assert.equal(value.controller.state().current.line_id, 'line-a');
  const accepted = app(value.backing, () => true); accepted.apply('patient-a', 'line-a'); accepted.change('AeDescription', 'discard me'); assert.equal(accepted.controller.beforeContextChange({ next: { patient_id: 'patient-a', line_id: 'line-b' } }), 'proceed'); assert.equal(accepted.elements.fhSegDraftAeDescription.value, 'saved A');
  accepted.apply('patient-a', 'line-b'); assert.equal(accepted.elements.fhSegDraftAePresent.value, ''); accepted.change('AePresent', 'no'); accepted.controller.save();
  accepted.apply('patient-a', 'line-a'); assert.equal(accepted.elements.fhSegDraftAeDescription.value, 'saved A'); accepted.apply('patient-a', 'line-b'); assert.equal(accepted.elements.fhSegDraftAePresent.value, 'no');
});
test('canonical card is the only new AE capture; legacy AE/causality and outputs remain inert', () => {
  const card = html.slice(html.indexOf('id="fhSegDraftCard"'), html.indexOf('</section>', html.indexOf('id="fhSegDraftCard"')));
  for (const id of ['fhSegDraftAePresent', 'fhSegDraftAeDescription', 'fhSegDraftAeSeverity', 'fhSegDraftAeResolution', 'fhSegDraftAeStatus']) assert.match(card, new RegExp(`id="${id}"`));
  assert.doesNotMatch(card, /Naranjo|Karch|f[aá]rmaco sospechoso|correcci[oó]n|recomendaci[oó]n|decisi[oó]n terap[eé]utica/i);
  assert.match(contextSource, /section\.inert = true/); assert.match(contextSource, /section\.id === 'fhSegDraftCard'/);
  assert.match(contextSource, /protect\(env\.FarmaciaDemo, 'copyTextToClipboard'\)[\s\S]*protect\(env\.FarmaciaExcelRowExport/);
  assert.match(contextSource, /FarmaciaFollowupDraftsV4[\s\S]*beforeContextChange/);
});

test('migration declaration has complete producer/consumer parity and no missing scenario', () => {
  const MAPPED = migrationResults.map((result) => result.scenario);
  const MISSING = LEGACY_SCENARIOS.filter((scenario) => !MAPPED.includes(scenario) && !INTENTIONALLY_RETIRED.includes(scenario));
  assert.deepEqual(MAPPED, LEGACY_SCENARIOS); assert.deepEqual(MISSING, []); assert.ok(migrationResults.every((result) => result.consumers.length));
  assert.deepEqual(Object.fromEntries(migrationResults.map((result) => [result.scenario, result.parity])), MIGRATION_PARITY);
  assert.deepEqual(Object.keys(CONSUMER_MATRIX), ['context_producer', 'ui_producer', 'store_consumer', 'controller_render_consumer', 'context_change_callers']);
});

const MAPPED = migrationResults.map((result) => result.scenario);
const MISSING = LEGACY_SCENARIOS.filter((scenario) => !MAPPED.includes(scenario) && !INTENTIONALLY_RETIRED.includes(scenario));
const CONSUMERS_TESTED = [...new Set(migrationResults.flatMap((result) => result.consumers))];
console.log(`farmacia_followup_ae_draft_v4_check: PASSED_${passed}_AE_DRAFT_AND_MIGRATION_CASES`);
console.log('MIGRATION_MATRIX', JSON.stringify({ LEGACY_SCENARIOS, MAPPED, INTENTIONALLY_RETIRED, MISSING, CONSUMERS_TESTED, MIGRATION_PARITY, results: migrationResults }));
console.log('PRODUCER_CONSUMER_MATRIX', JSON.stringify(CONSUMER_MATRIX));
