#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const drafts = require(path.join(ROOT, 'scripts/farmacia_followup_drafts_v4.js'));
const guard = require(path.join(ROOT, 'scripts/farmacia_followup_navigation_guard_v4.js'));
const html = fs.readFileSync(path.join(ROOT, 'farmacia_seguimiento.html'), 'utf8');
const draftSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_followup_drafts_v4.js'), 'utf8');
const guardSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_followup_navigation_guard_v4.js'), 'utf8');
let passed = 0;
function test(name, run) { run(); passed += 1; console.log(`ok ${passed} - ${name}`); }

function memory(values = {}) {
  const data = new Map(Object.entries(values));
  return { data, getItem: (key) => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) };
}
function node(id) { return { id, value: '', textContent: id === 'currentProfessional' ? 'Profesional FH-01' : '', disabled: false, attributes: {}, setAttribute(name, value) { this.attributes[name] = String(value); } }; }
const DRAFT_IDS = ['fhSegDraftNotes','fhSegDraftSave','fhSegDraftDiscard','fhSegDraftStatus','currentProfessional'];
function draftFixture({ confirm = () => true, storage = memory() } = {}) {
  const elements = Object.fromEntries(DRAFT_IDS.map((id) => [id, node(id)]));
  const env = { sessionStorage: storage, confirm, document: { getElementById: (id) => elements[id] || null }, __farmaciaFollowupContextV4: null };
  const controller = drafts.createController(env, { storage, confirm, now: () => '2026-07-26T10:00:00.000Z' });
  const context = { ok: true, code: 'CANONICAL_ACTIVE_CONTEXT_READY', patient_id: 'synthetic-patient', line_id: 'synthetic-line', status: 'active' };
  env.__farmaciaFollowupContextV4 = context; controller.applyContext(context);
  return { controller, elements, storage };
}
function anchor(raw, options = {}) {
  let current = raw;
  return { get href() { return options.finalHref || new URL(current, 'http://127.0.0.1:4173/farmacia_seguimiento.html').href; },
    setRaw(value) { current = value; }, getAttribute(name) { if (name === 'href') return current; if (name === 'target') return options.target || ''; return null; },
    hasAttribute(name) { return name === 'download' && !!options.download; } };
}
function click(link, options = {}) {
  return { button: options.button ?? 0, defaultPrevented: !!options.defaultPrevented, metaKey: !!options.metaKey, ctrlKey: !!options.ctrlKey, shiftKey: !!options.shiftKey, altKey: !!options.altKey,
    target: options.noClosest ? {} : { closest: () => link }, prevented: 0, stopped: 0, immediate: 0,
    preventDefault() { this.prevented += 1; }, stopPropagation() { this.stopped += 1; }, stopImmediatePropagation() { this.immediate += 1; } };
}
function guardEnv(href = 'http://127.0.0.1:4173/farmacia_seguimiento.html?x=1') { return { URL, location: { href, assign() {} } }; }

test('controller exposes read-only dirty and zero-argument page-exit APIs', () => { const app = draftFixture(); assert.equal(app.controller.isDirty(), false); assert.equal(app.controller.isDirty.length, 0); assert.equal(app.controller.beforePageExit.length, 0); });
test('real input is the exclusive dirty source', () => { const app = draftFixture(); app.elements.fhSegDraftNotes.value = 'real supported input'; app.controller.onInput(); assert.equal(app.controller.isDirty(), true); });
test('clean page exit has no prompt and no mutation', () => { let prompts = 0; const app = draftFixture({ confirm: () => { prompts += 1; return true; } }); const before = app.controller.state(); assert.equal(app.controller.beforePageExit(), 'proceed'); assert.equal(prompts, 0); assert.deepEqual(app.controller.state(), before); });
test('dirty cancelled page exit preserves URL-independent controller state and UI', () => { const app = draftFixture({ confirm: () => false }); app.elements.fhSegDraftNotes.value = 'dirty'; app.controller.onInput(); const before = app.controller.state(); assert.equal(app.controller.beforePageExit(), 'cancel'); assert.deepEqual(app.controller.state(), before); assert.equal(app.elements.fhSegDraftNotes.value, 'dirty'); });
test('dirty accepted page exit restores baseline and preserves three stores byte-identical', () => {
  const draftState = drafts.emptyState(); draftState.patients['synthetic-patient'] = { lines: { 'synthetic-line': {
    draft_id: 'followup:synthetic-line', patient_id: 'synthetic-patient', line_id: 'synthetic-line', kind: 'followup', notes: 'persisted baseline',
    mg1: '', mg2: '', mg3: '', mg4: '', ae_present: '', ae_description: '', ae_severity: '', ae_resolution: '',
    proms_collected: '', dlqi_total: '', eva_dolor: '', eva_prurito: '', saved_at: '2026-07-26T09:00:00.000Z', saved_by_demo: 'Profesional FH-01'
  } } };
  const values = { [drafts.STORE_KEY]: JSON.stringify(draftState), 'farmaciaDemo.followupConfirmedVisits.v1': '{"visits":"synthetic"}', 'farmaciaDemo.multitreatment.v1': '{"lines":"synthetic"}' };
  const storage = memory(values); const app = draftFixture({ storage }); app.elements.fhSegDraftNotes.value = 'unsaved only'; app.controller.onInput(); const before = Object.fromEntries(storage.data);
  assert.equal(app.controller.beforePageExit(), 'proceed'); assert.equal(app.controller.isDirty(), false); assert.equal(app.elements.fhSegDraftNotes.value, 'persisted baseline'); assert.deepEqual(Object.fromEntries(storage.data), before);
});
test('installed global wrappers expose the real installed controller only', () => { assert.match(draftSource, /function isDirty\(\) \{ return controller \? controller\.isDirty\(\) : false; \}/); assert.match(draftSource, /function beforePageExit\(\) \{ return controller \? controller\.beforePageExit\(\) : 'proceed'; \}/); });

test('supported sidebar and dynamic handoff links resolve at click time', () => { const env = guardEnv(); for (const route of ['farmacia_index.html','farmacia_validacion.html','farmacia_primera_visita.html','farmacia_dashboard_paciente.html','index.html']) assert.equal(guard.resolvedNavigation(click(anchor(route)), env).href, `http://127.0.0.1:4173/${route}`); const dynamic = anchor('old.html'); dynamic.setRaw('farmacia_validacion.html?patient_id=synthetic'); assert.match(guard.resolvedNavigation(click(dynamic), env).href, /farmacia_validacion\.html\?patient_id=synthetic$/); });
test('link classification excludes hashes download non-self modifiers non-primary javascript empty exact and unusable protocols', () => {
  const env = guardEnv(); const excluded = [click(anchor('#local')), click(anchor('farmacia_index.html', { download: true })), click(anchor('farmacia_index.html', { target: '_blank' })), click(anchor('farmacia_index.html'), { ctrlKey: true }), click(anchor('farmacia_index.html'), { button: 1 }), click(anchor('javascript:void(0)')), click(anchor('')), click(anchor(env.location.href)), click(anchor('mailto:demo@example.invalid'))];
  for (const event of excluded) assert.equal(guard.resolvedNavigation(event, env), null);
});
test('target _self and absolute same-tab links are supported exactly', () => { const env = guardEnv(); assert.equal(guard.resolvedNavigation(click(anchor('/farmacia_index.html?z=1#final', { target: '_self' })), env).href, 'http://127.0.0.1:4173/farmacia_index.html?z=1#final'); });
test('HTTP pages reject cross-scheme file navigation before any guard decision', () => { const env = guardEnv('https://hospital.example/farmacia_seguimiento.html'); assert.equal(guard.resolvedNavigation(click(anchor('file:///tmp/farmacia_index.html', { finalHref: 'file:///tmp/farmacia_index.html' })), env), null); });
test('file mode preserves usable same-mode file navigation', () => { const env = guardEnv('file:///demo/farmacia_seguimiento.html'); assert.equal(guard.resolvedNavigation(click(anchor('farmacia_index.html', { finalHref: 'file:///demo/farmacia_index.html' })), env).href, 'file:///demo/farmacia_index.html'); });
test('clean click preserves native navigation without prompt or interception', () => { let decisions = 0; const env = guardEnv(); const controller = guard.createGuard(env, { drafts: { isDirty: () => false, beforePageExit: () => { decisions += 1; } } }); const event = click(anchor('farmacia_index.html')); controller.onClick(event); assert.deepEqual([event.prevented, decisions, controller.state().navigationCount], [0, 0, 0]); });
test('dirty cancel absorbs downstream handling and preserves navigation', () => { let navigations = 0; const env = guardEnv(); const controller = guard.createGuard(env, { drafts: { isDirty: () => true, beforePageExit: () => 'cancel' }, navigate: () => { navigations += 1; } }); const event = click(anchor('farmacia_index.html')); controller.onClick(event); assert.deepEqual([event.prevented,event.stopped,event.immediate,navigations], [1,1,1,0]); });
test('dirty accept absorbs downstream handling and navigates once to exact href', () => { const destinations = []; const env = guardEnv(); const controller = guard.createGuard(env, { drafts: { isDirty: () => true, beforePageExit: () => 'proceed' }, navigate: (href) => destinations.push(href) }); const event = click(anchor('farmacia_validacion.html?patient_id=synthetic#line')); controller.onClick(event); assert.deepEqual(destinations, ['http://127.0.0.1:4173/farmacia_validacion.html?patient_id=synthetic#line']); assert.equal(controller.state().navigationCount, 1); assert.equal(event.immediate, 1); });
test('one-use bypass suppresses only the navigation beforeunload', () => { const env = guardEnv(); const draftApi = { isDirty: () => true, beforePageExit: () => 'proceed' }; const controller = guard.createGuard(env, { drafts: draftApi, navigate() {} }); controller.onClick(click(anchor('farmacia_index.html'))); const first = { returnValue: 'sentinel', preventDefault() { throw new Error('must bypass'); } }; assert.equal(controller.onBeforeUnload(first), undefined); const second = { returnValue: 'sentinel', prevented: 0, preventDefault() { this.prevented += 1; } }; assert.equal(controller.onBeforeUnload(second), ''); assert.equal(second.prevented, 1); });
test('beforeunload is inert when clean and never calls mutating page-exit API', () => { let decisions = 0; const env = guardEnv(); const controller = guard.createGuard(env, { drafts: { isDirty: () => false, beforePageExit: () => { decisions += 1; } } }); const event = { returnValue: 'sentinel', prevented: 0, preventDefault() { this.prevented += 1; } }; assert.equal(controller.onBeforeUnload(event), undefined); assert.deepEqual([event.prevented,event.returnValue,decisions], [0,'sentinel',0]); });
test('guard uses explicit draft APIs without identity invention, context guard reuse, stores, DOM dirty inference or global patching', () => { assert.match(guardSource, /drafts\.isDirty\(\)/); assert.match(guardSource, /drafts\.beforePageExit\(\)/); assert.doesNotMatch(guardSource, /beforeContextChange|patient_id|line_id|sessionStorage|localStorage|followupDrafts|confirmedVisits|multitreatment|querySelector|getElementById|history\.|pushState|replaceState|popstate|prototype\s*=|\.onclick\s*=/); });
test('HTML loads the guard immediately after drafts and before context', () => { const order = ['farmacia_followup_drafts_v4.js','farmacia_followup_navigation_guard_v4.js','farmacia_followup_context_v4.js'].map((name) => html.indexOf(name)); assert.ok(order.every((position) => position > 0)); assert.deepEqual(order, order.slice().sort((a,b) => a-b)); });
test('only exact WO routes are changed locally or against the explicit CI base', () => {
  const allowed = new Set(['farmacia_seguimiento.html','scripts/farmacia_followup_drafts_v4.js','scripts/farmacia_followup_navigation_guard_v4.js','tools/farmacia_followup_e2e_navigation_guard_v4_check.mjs','tools/farmacia_followup_e2e_navigation_guard_v4_qa.mjs','tools/farmacia_followup_persisted_review_v4_qa.mjs','.github/workflows/farmacia-v4-followup-e2e-navigation-guard.yml']);
  const base = process.env.FARMACIA_CHANGED_ROUTES_BASE || '';
  let files;
  if (base) {
    assert.match(base, /^(?:origin\/)?[A-Za-z0-9._\/-]+$/, 'safe explicit base ref');
    assert.equal(spawnSync('git', ['rev-parse','--verify','--quiet',base], { cwd: ROOT }).status, 0, `missing base ref ${base}`);
    const changed = spawnSync('git', ['diff','--name-only','--no-renames',`${base}...HEAD`], { cwd: ROOT, encoding: 'utf8' }); assert.equal(changed.status, 0); files = changed.stdout.split('\n').filter(Boolean);
    assert.ok(files.length > 0, `no committed changes found against ${base}`);
  } else {
    const status = spawnSync('git', ['status','--porcelain'], { cwd: ROOT, encoding: 'utf8' }); assert.equal(status.status, 0);
    files = status.stdout.split('\n').filter(Boolean).flatMap((line) => line.slice(3).split(' -> '));
  }
  for (const file of files) assert.ok(allowed.has(file), file);
});
test('substantive NO TOCA routes have no local or committed PR-base diff', () => { const base = process.env.FARMACIA_CHANGED_ROUTES_BASE || ''; for (const file of ['scripts/farmacia_seguimiento.js','scripts/farmacia_followup_context_v4.js','scripts/farmacia_followup_persisted_review_v4.js','scripts/farmacia_followup_confirmed_visit_v4.js','scripts/farmacia_followup_outputs_v4.js','scripts/farmacia_multitreatment_core.js','scripts/farmacia_excel_row_export.js']) { const args = base ? ['diff','--quiet',`${base}...HEAD`,'--',file] : ['diff','--quiet','--',file]; assert.equal(spawnSync('git', args, { cwd: ROOT }).status, 0, file); } });

assert.ok(passed >= 20);
console.log(`farmacia_followup_e2e_navigation_guard_v4_check: PASSED_${passed}_EXPLICIT_DIRTY_PAGE_EXIT_LINK_CLASSIFICATION_UNLOAD_STORE_INVARIANCE_CASES`);
