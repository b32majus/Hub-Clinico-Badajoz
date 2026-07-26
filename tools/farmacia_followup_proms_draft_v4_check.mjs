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

let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log(`ok ${passed} - ${name}`); }
function memory(seed = {}, failWrite = false) {
  const data = new Map(Object.entries(seed)); const reads = []; const writes = [];
  return {
    data, reads, writes,
    getItem(key) { reads.push(key); return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { if (failWrite) throw new Error('denied'); writes.push(key); data.set(key, String(value)); }
  };
}
function v4Draft(patient = 'patient-a', line = 'line-a', overrides = {}) {
  return { draft_id: `followup:${line}`, patient_id: patient, line_id: line, kind: 'followup', notes: 'notes',
    mg1: '', mg2: '', mg3: '', mg4: '', ae_present: '', ae_description: '', ae_severity: '', ae_resolution: '',
    proms_collected: '', dlqi_total: '', eva_dolor: '', eva_prurito: '', saved_at: '2026-07-26T10:00:00.000Z', saved_by_demo: 'Profesional FH-01', ...overrides };
}
function without(value, fields) { const copy = { ...value }; fields.forEach((field) => delete copy[field]); return copy; }
function v3Draft(overrides = {}) { return without(v4Draft('patient-a', 'line-a', overrides), ['proms_collected', 'dlqi_total', 'eva_dolor', 'eva_prurito']); }
function v2Draft(overrides = {}) { return without(v3Draft(overrides), ['ae_present', 'ae_description', 'ae_severity', 'ae_resolution']); }
function v1Draft(overrides = {}) { return without(v2Draft(overrides), ['mg1', 'mg2', 'mg3', 'mg4']); }
function state(schema, ...items) {
  const value = { schema, patients: {} };
  for (const item of items) { value.patients[item.patient_id] ||= { lines: {} }; value.patients[item.patient_id].lines[item.line_id] = item; }
  return value;
}
function element(id) {
  return { id, value: '', textContent: id === 'currentProfessional' ? 'Profesional FH-01' : '', disabled: true, attributes: {},
    setAttribute(name, value) { this.attributes[name] = String(value); }, getAttribute(name) { return this.attributes[name] ?? null; } };
}
const UI_IDS = ['fhSegDraftNotes', 'fhSegDraftAdherence', 'fhSegDraftAdherenceStatus', 'fhSegDraftMg1', 'fhSegDraftMg2', 'fhSegDraftMg3', 'fhSegDraftMg4',
  'fhSegDraftAe', 'fhSegDraftAeStatus', 'fhSegDraftAePresent', 'fhSegDraftAeDescription', 'fhSegDraftAeSeverity', 'fhSegDraftAeResolution',
  'fhSegDraftProms', 'fhSegDraftPromsStatus', 'fhSegDraftPromsCollected', 'fhSegDraftDlqiTotal', 'fhSegDraftEvaDolor', 'fhSegDraftEvaPrurito',
  'fhSegDraftSave', 'fhSegDraftDiscard', 'fhSegDraftStatus', 'currentProfessional'];
function app(backing = memory(), confirm = () => true) {
  const elements = Object.fromEntries(UI_IDS.map((id) => [id, element(id)]));
  const env = { sessionStorage: backing, confirm, document: { getElementById: (id) => elements[id] || null }, __farmaciaFollowupContextV4: null };
  const controller = drafts.createController(env, { storage: backing, confirm, now: () => '2026-07-26T11:00:00.000Z' });
  function apply(patient_id = 'patient-a', line_id = 'line-a', code = 'CANONICAL_ACTIVE_CONTEXT_READY', status = 'active') {
    const ok = code === 'CANONICAL_ACTIVE_CONTEXT_READY'; const detail = { ok, code, patient_id, line_id, status };
    env.__farmaciaFollowupContextV4 = { ok, code, patient_id, line_id, line: status ? { status } : null }; controller.applyContext(detail);
  }
  function change(id, value, field) { elements[id].value = String(value); controller.onInput(field); }
  return { backing, elements, env, controller, apply, change };
}

test('v4 is the exact current store', () => assert.equal(drafts.STORE_KEY, 'farmaciaDemo.followupDrafts.v4'));
test('valid v4 wins without reading or rewriting older stores', () => { const backing = memory({ [drafts.STORE_KEY]: JSON.stringify(state(drafts.SCHEMA, v4Draft())), [drafts.V3_STORE_KEY]: '{' }); assert.equal(drafts.createStore(backing).read().ok, true); assert.deepEqual(backing.reads, [drafts.STORE_KEY]); assert.deepEqual(backing.writes, []); });
test('corrupt v4 fails closed without older fallback', () => { const backing = memory({ [drafts.STORE_KEY]: '{', [drafts.V3_STORE_KEY]: JSON.stringify(state(drafts.V3_STORE_KEY, v3Draft())) }); assert.equal(drafts.createStore(backing).read().code, 'DRAFT_STORAGE_CORRUPT'); assert.deepEqual(backing.reads, [drafts.STORE_KEY]); });
test('incompatible v4 fails closed without older fallback', () => { const backing = memory({ [drafts.STORE_KEY]: JSON.stringify({ schema: 'wrong', patients: {} }), [drafts.V3_STORE_KEY]: '{}' }); assert.equal(drafts.createStore(backing).read().code, 'DRAFT_SCHEMA_MISMATCH'); assert.deepEqual(backing.reads, [drafts.STORE_KEY]); });
test('valid v3 migrates all prior data and audit with empty PROM fields while leaving v3', () => { const old = JSON.stringify(state(drafts.V3_STORE_KEY, v3Draft({ notes: 'v3', mg1: 'si', ae_present: 'si', ae_description: 'EA', ae_severity: 'leve', ae_resolution: 'no' }))); const backing = memory({ [drafts.V3_STORE_KEY]: old }); const loaded = drafts.createStore(backing).read(); assert.deepEqual(loaded.state.patients['patient-a'].lines['line-a'], v4Draft('patient-a', 'line-a', { notes: 'v3', mg1: 'si', ae_present: 'si', ae_description: 'EA', ae_severity: 'leve', ae_resolution: 'no' })); assert.equal(backing.data.get(drafts.V3_STORE_KEY), old); assert.deepEqual(backing.writes, [drafts.STORE_KEY]); });
test('corrupt v3 fails closed without v2 fallback', () => { const backing = memory({ [drafts.V3_STORE_KEY]: '{', [drafts.LEGACY_STORE_KEY]: JSON.stringify(state(drafts.LEGACY_STORE_KEY, v2Draft())) }); assert.equal(drafts.createStore(backing).read().code, 'DRAFT_STORAGE_CORRUPT'); assert.equal(backing.reads.includes(drafts.LEGACY_STORE_KEY), false); });
test('valid v2 migrates identity notes adherence audit with AE and PROM empty', () => { const old = JSON.stringify(state(drafts.LEGACY_STORE_KEY, v2Draft({ notes: 'v2', mg4: 'no' }))); const backing = memory({ [drafts.LEGACY_STORE_KEY]: old }); const value = drafts.createStore(backing).read().state.patients['patient-a'].lines['line-a']; assert.deepEqual(value, v4Draft('patient-a', 'line-a', { notes: 'v2', mg4: 'no' })); assert.equal(backing.data.get(drafts.LEGACY_STORE_KEY), old); });
test('corrupt v2 fails closed without v1 fallback', () => { const backing = memory({ [drafts.LEGACY_STORE_KEY]: '{', [drafts.V1_STORE_KEY]: JSON.stringify(state(drafts.V1_STORE_KEY, v1Draft())) }); assert.equal(drafts.createStore(backing).read().code, 'DRAFT_STORAGE_CORRUPT'); assert.equal(backing.reads.includes(drafts.V1_STORE_KEY), false); });
test('valid v1 migrates identity notes audit with adherence AE and PROM empty', () => { const old = JSON.stringify(state(drafts.V1_STORE_KEY, v1Draft({ notes: 'v1' }))); const backing = memory({ [drafts.V1_STORE_KEY]: old }); assert.deepEqual(drafts.createStore(backing).read().state.patients['patient-a'].lines['line-a'], v4Draft('patient-a', 'line-a', { notes: 'v1' })); assert.equal(backing.data.get(drafts.V1_STORE_KEY), old); });
test('all stores absent is empty and performs no write', () => { const backing = memory(); assert.equal(drafts.createStore(backing).read().code, 'DRAFT_EMPTY'); assert.deepEqual(backing.writes, []); });
test('migration write failure leaves every store byte untouched and v4 absent', () => { const old = JSON.stringify(state(drafts.V3_STORE_KEY, v3Draft())); const backing = memory({ [drafts.V3_STORE_KEY]: old }, true); assert.equal(drafts.createStore(backing).read().code, 'DRAFT_STORAGE_UNAVAILABLE'); assert.equal(backing.data.get(drafts.V3_STORE_KEY), old); assert.equal(backing.data.has(drafts.STORE_KEY), false); });

test('numeric schema accepts missing and zero at exact bounds', () => { for (const values of [{}, { dlqi_total: 0, eva_dolor: 0, eva_prurito: 0 }, { dlqi_total: 30, eva_dolor: 10, eva_prurito: 10 }]) assert.equal(drafts.validateState(state(drafts.SCHEMA, v4Draft('p', 'l', { proms_collected: 'si', ...values }))).ok, true); });
test('numeric schema rejects strings fractions and out of bounds', () => { for (const overrides of [{ dlqi_total: '0' }, { dlqi_total: 1.5 }, { dlqi_total: 31 }, { eva_dolor: -1 }, { eva_prurito: 11 }]) assert.equal(drafts.validateState(state(drafts.SCHEMA, v4Draft('p', 'l', { proms_collected: 'si', ...overrides }))).code, 'DRAFT_STATE_INVALID'); });
test('non-si persisted PROM values must be empty', () => assert.equal(drafts.validateState(state(drafts.SCHEMA, v4Draft('p', 'l', { proms_collected: 'no', dlqi_total: 0 }))).code, 'DRAFT_STATE_INVALID'));
test('PROM state mapping and exact final uninterpreted text are deterministic', () => { const value = app(); value.apply(); const status = value.elements.fhSegDraftPromsStatus; assert.equal(status.attributes['data-status-code'], 'PROMS_EMPTY'); value.change('fhSegDraftPromsCollected', 'no_consta', 'proms_collected'); assert.equal(status.attributes['data-status-code'], 'PROMS_NOT_RECORDED'); value.change('fhSegDraftPromsCollected', 'no', 'proms_collected'); assert.equal(status.attributes['data-status-code'], 'PROMS_NO_COLLECTION'); value.change('fhSegDraftPromsCollected', 'si', 'proms_collected'); assert.equal(status.attributes['data-status-code'], 'PROMS_RECORDED_INCOMPLETE'); value.change('fhSegDraftDlqiTotal', 0, 'dlqi_total'); assert.equal(status.attributes['data-status-code'], 'PROMS_RECORDED_UNINTERPRETED'); assert.equal(status.textContent, 'PROMs documentados en borrador. Interpretación clínica no evaluada en esta versión.'); });
test('non-si selection clears disables and persists no numeric residue', () => { const value = app(); value.apply(); value.change('fhSegDraftPromsCollected', 'si', 'proms_collected'); value.change('fhSegDraftDlqiTotal', 12, 'dlqi_total'); value.change('fhSegDraftEvaDolor', 0, 'eva_dolor'); value.change('fhSegDraftPromsCollected', 'no', 'proms_collected'); for (const id of ['fhSegDraftDlqiTotal', 'fhSegDraftEvaDolor', 'fhSegDraftEvaPrurito']) { assert.equal(value.elements[id].value, ''); assert.equal(value.elements[id].disabled, true); } const saved = value.controller.save().draft; assert.deepEqual([saved.dlqi_total, saved.eva_dolor, saved.eva_prurito], ['', '', '']); });
test('invalid numeric UI is not written and remains dirty', () => { const value = app(); value.apply(); value.change('fhSegDraftPromsCollected', 'si', 'proms_collected'); value.change('fhSegDraftDlqiTotal', 31, 'dlqi_total'); assert.equal(value.controller.save().code, 'DRAFT_VALUES_INVALID'); assert.equal(value.backing.data.has(drafts.STORE_KEY), false); assert.equal(value.controller.state().dirty, true); });
test('all PROM fields participate in dirty and successful persistence including zero', () => { const value = app(); value.apply(); value.change('fhSegDraftPromsCollected', 'si', 'proms_collected'); value.change('fhSegDraftEvaDolor', 0, 'eva_dolor'); value.change('fhSegDraftEvaPrurito', 7, 'eva_prurito'); assert.equal(value.controller.state().dirty, true); const saved = value.controller.save().draft; assert.deepEqual([saved.proms_collected, saved.eva_dolor, saved.eva_prurito], ['si', 0, 7]); assert.equal(value.controller.state().dirty, false); });
test('patient and line partitions restore independently', () => { const value = app(); value.apply(); value.change('fhSegDraftPromsCollected', 'si', 'proms_collected'); value.change('fhSegDraftDlqiTotal', 4, 'dlqi_total'); value.controller.save(); value.apply('patient-a', 'line-b'); assert.equal(value.elements.fhSegDraftPromsCollected.value, ''); value.change('fhSegDraftPromsCollected', 'no', 'proms_collected'); value.controller.save(); value.apply('patient-b', 'line-a'); assert.equal(value.elements.fhSegDraftPromsCollected.value, ''); value.apply(); assert.equal(value.elements.fhSegDraftDlqiTotal.value, '4'); });
test('S12 cancel preserves unsaved PROM values and accept restores saved-only values', () => { const cancelled = app(memory(), () => false); cancelled.apply(); cancelled.change('fhSegDraftPromsCollected', 'si', 'proms_collected'); cancelled.change('fhSegDraftDlqiTotal', 5, 'dlqi_total'); assert.equal(cancelled.controller.beforeContextChange({ next: { patient_id: 'p2', line_id: 'l2' } }), 'cancel'); assert.equal(cancelled.elements.fhSegDraftDlqiTotal.value, '5'); const accepted = app(memory(), () => true); accepted.apply(); accepted.change('fhSegDraftPromsCollected', 'si', 'proms_collected'); accepted.change('fhSegDraftDlqiTotal', 3, 'dlqi_total'); accepted.controller.save(); accepted.change('fhSegDraftDlqiTotal', 9, 'dlqi_total'); assert.equal(accepted.controller.beforeContextChange({ next: { patient_id: 'p2', line_id: 'l2' } }), 'proceed'); assert.equal(accepted.elements.fhSegDraftDlqiTotal.value, '3'); });
test('historical incoherent unknown and contradictory contexts keep PROM capture empty blocked', () => { for (const [code, status] of [['LINE_NOT_ACTIVE', 'historical'], ['HUB_GRAPH_INCOHERENT', 'active'], ['PATIENT_NOT_FOUND', ''], ['CANONICAL_ACTIVE_CONTEXT_READY', 'historical']]) { const value = app(); value.apply('patient-a', 'line-a', code, status); assert.equal(value.elements.fhSegDraftPromsCollected.disabled, true); assert.equal(value.elements.fhSegDraftPromsCollected.value, ''); } });
test('PATIENT_NOT_FOUND and MISMATCH accepted block then same identity active restores persisted PROM only', () => { for (const code of ['PATIENT_NOT_FOUND', 'PATIENT_MISMATCH']) { const raw = JSON.stringify(state(drafts.SCHEMA, v4Draft('patient-a', 'line-a', { proms_collected: 'si', dlqi_total: 6 }))); const backing = memory({ [drafts.STORE_KEY]: raw }); const value = app(backing, () => true); value.apply(); value.change('fhSegDraftDlqiTotal', 8, 'dlqi_total'); value.controller.beforeContextChange({ next: { patient_id: '', line_id: '' } }); value.apply('patient-a', 'line-a', code, ''); assert.equal(value.elements.fhSegDraftPromsCollected.value, ''); assert.equal(backing.data.get(drafts.STORE_KEY), raw); value.apply(); assert.equal(value.elements.fhSegDraftDlqiTotal.value, '6'); } });
test('write failure preserves exact UI baseline dirty flags and old bytes while blocking', () => { const raw = JSON.stringify(state(drafts.SCHEMA, v4Draft('patient-a', 'line-a', { proms_collected: 'si', dlqi_total: 2 }))); const backing = memory({ [drafts.STORE_KEY]: raw }, true); const value = app(backing); value.apply(); const baseline = { ...value.controller.state().baseline }; value.change('fhSegDraftDlqiTotal', 7, 'dlqi_total'); assert.equal(value.controller.save().code, 'DRAFT_STORAGE_UNAVAILABLE'); assert.equal(value.elements.fhSegDraftDlqiTotal.value, '7'); assert.deepEqual(value.controller.state().baseline, baseline); assert.equal(value.controller.state().dirty, true); assert.equal(backing.data.get(drafts.STORE_KEY), raw); assert.equal(value.elements.fhSegDraftPromsCollected.disabled, true); });
test('migration write failure discovered during save preserves UI baseline dirty flags and legacy bytes', () => { const currentRaw = JSON.stringify(state(drafts.SCHEMA, v4Draft('patient-a', 'line-a', { proms_collected: 'si', dlqi_total: 2 }))); const legacyRaw = JSON.stringify(state(drafts.V3_STORE_KEY, v3Draft({ notes: 'legacy' }))); const backing = memory({ [drafts.STORE_KEY]: currentRaw }, true); const value = app(backing); value.apply(); const baseline = { ...value.controller.state().baseline }; value.change('fhSegDraftDlqiTotal', 7, 'dlqi_total'); backing.data.delete(drafts.STORE_KEY); backing.data.set(drafts.V3_STORE_KEY, legacyRaw); assert.equal(value.controller.save().code, 'DRAFT_STORAGE_UNAVAILABLE'); assert.equal(value.elements.fhSegDraftDlqiTotal.value, '7'); assert.deepEqual(value.controller.state().baseline, baseline); assert.equal(value.controller.state().dirty, true); assert.equal(backing.data.get(drafts.V3_STORE_KEY), legacyRaw); assert.equal(backing.data.has(drafts.STORE_KEY), false); });
test('canonical card exposes only explicit manual raw PROM capture and no interpretation', () => { const card = html.slice(html.indexOf('id="fhSegDraftCard"'), html.indexOf('</section>', html.indexOf('id="fhSegDraftCard"'))); for (const id of ['fhSegDraftPromsCollected', 'fhSegDraftDlqiTotal', 'fhSegDraftEvaDolor', 'fhSegDraftEvaPrurito', 'fhSegDraftPromsStatus']) assert.match(card, new RegExp(`id="${id}"`)); assert.match(card, /manual/); assert.doesNotMatch(card, /impacto|clasificaci[oó]n|umbral|alerta|recomendaci[oó]n|tendencia|comparaci[oó]n/i); });
test('legacy PROM and output modules remain inert and unconnected', () => { assert.match(contextSource, /section\.inert = true/); assert.match(contextSource, /protect\(env\.FarmaciaDemo, 'copyTextToClipboard'\)/); assert.doesNotMatch(source, /fhSegPromsExpanded|fhSegDlqiQuestions|fhSegDlqiInterp|FarmaciaExcelRowExport|copyTextToClipboard/); });

assert.ok(passed >= 25);
console.log(`farmacia_followup_proms_draft_v4_check: PASSED_${passed}_PROMS_STORE_MIGRATION_STATE_GATING_AND_S12_CASES`);
