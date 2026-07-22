#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coreSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_multitreatment_core.js'), 'utf8');
const followupSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_seguimiento.js'), 'utf8');

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
}

const storage = memoryStorage();
const sandbox = {
  window: { FarmaciaDemo: {}, sessionStorage: storage },
  globalThis: null,
  console,
  Uint8Array,
  document: {
    addEventListener() {}, getElementById() { return null; }, querySelector() { return null; },
    querySelectorAll() { return []; }, createElement() { return {}; }
  },
  Event: function Event(type) { this.type = type; },
  setTimeout,
  clearTimeout
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(coreSource, sandbox);
vm.runInContext(followupSource, sandbox);

const core = sandbox.window.FarmaciaMultitreatmentCore;
const followup = sandbox.window.FarmaciaSeguimiento;
assert.equal(typeof followup.createCanonicalController, 'function', 'Seguimiento publishes its canonical controller');

let seq = 0;
const ids = { idFactory: (prefix) => `${prefix}followup-${++seq}` };
const makeLine = (patient_id, drug_name, status = 'active', relationship = 'additional') =>
  core.createPreHubTreatmentLine({ patient_id, drug_name, status, relationship, provenance: 'pre_hub_existing' }, ids);

const p1 = 'patient-followup-A';
const p2 = 'patient-followup-B';
const lineA = makeLine(p1, 'Synthetic same drug');
const lineB = makeLine(p1, 'Synthetic same drug');
const pending = makeLine(p1, 'Synthetic pending', 'validated_not_started');
const historical = makeLine(p1, 'Synthetic historical', 'historical');
const sameIdOtherPatient = { ...makeLine(p2, 'Synthetic isolated'), line_id: lineA.line_id };

const store = core.createSessionStore(storage);
let state = store.createEmpty();
for (const line of [lineA, lineB, pending, historical]) state = store.upsertLine(state, p1, line);
state = store.upsertLine(state, p2, sameIdOtherPatient);
store.save(state);

const controller = followup.createCanonicalController(core, storage, ids);
let view = controller.loadPatient(p1);
assert.equal(view.lines.length, 4, 'all canonical lines are visible');
assert.equal(view.selected_line_id, '', 'two active lines never imply first-by-order selection');
assert.equal(view.lines.find((line) => line.line_id === pending.line_id).status_label, 'Validado · pendiente de inicio');
assert.equal(view.lines.find((line) => line.line_id === pending.line_id).followup_enabled, false);
assert.equal(view.lines.find((line) => line.line_id === historical.line_id).followup_enabled, false);

assert.throws(() => controller.selectLine(p1, pending.line_id), /active canonical line/);
assert.throws(() => controller.selectLine(p1, historical.line_id), /active canonical line/);
controller.selectLine(p1, lineB.line_id);
view = controller.loadPatient(p1);
assert.equal(view.selected_line_id, lineB.line_id, 'explicit canonical selection is restored');

const payload = controller.buildPayload({
  patient_id: p1,
  line_id: lineB.line_id,
  tratamiento_id: lineA.line_id,
  movement: { type: 'optimization' },
  adverse_effect: { present: true, suspect_line_id: lineB.line_id }
});
assert.equal(payload.patient_id, p1);
assert.equal(payload.line_id, lineB.line_id, 'contradictory tratamiento_id cannot redirect line_id');
assert.equal(payload.movement.target_line_id, lineB.line_id);
assert.equal(payload.adverse_effect.suspect_line_id, lineB.line_id);
assert.ok(!Object.hasOwn(payload, 'tratamiento_id'), 'tratamiento_id is not required or generated');
controller.selectLine(p1, lineA.line_id);
const duplicateLegacyA = controller.buildPayload({ patient_id: p1, line_id: lineA.line_id, tratamiento_id: 'legacy-duplicate' });
controller.selectLine(p1, lineB.line_id);
const duplicateLegacyB = controller.buildPayload({ patient_id: p1, line_id: lineB.line_id, tratamiento_id: 'legacy-duplicate' });
assert.equal(duplicateLegacyA.line_id, lineA.line_id);
assert.equal(duplicateLegacyB.line_id, lineB.line_id, 'duplicate legacy tratamiento_id never selects a canonical line');

controller.saveDraft(p1, lineB.line_id, { note: 'line B only', treatment_name: 'Synthetic same drug', movement: 'optimization', causality: 'pending' });
assert.equal(JSON.stringify(controller.restoreDraft(p1, lineB.line_id)), JSON.stringify({ note: 'line B only', treatment_name: 'Synthetic same drug', movement: 'optimization', causality: 'pending' }));
assert.equal(controller.restoreDraft(p1, lineA.line_id), null, 'same drug/catalog identity cannot restore another line draft');
assert.throws(() => controller.selectLine(p2, lineB.line_id), /active canonical line/, 'same line ID cannot cross patient boundaries');

controller.clearPatient(p1);
assert.equal(controller.loadPatient(p1).selected_line_id, '', 'CIP cleanup clears prior canonical selection');
assert.equal(controller.restoreDraft(p1, lineB.line_id), null, 'CIP cleanup clears line draft and related context');

const beforeRegistration = store.load();
const preHub = controller.registerPreHubActiveLine({ patient_id: p1, drug_name: 'Explicit prior therapy', relationship: 'additional' });
const afterRegistration = store.load().patients[p1];
assert.equal(preHub.status, 'active');
assert.equal(preHub.provenance, 'pre_hub_existing');
assert.equal(Object.keys(afterRegistration.requests).length, Object.keys(beforeRegistration.patients[p1].requests).length);
assert.equal(Object.keys(afterRegistration.validation_acts).length, Object.keys(beforeRegistration.patients[p1].validation_acts).length);
assert.equal(Object.keys(afterRegistration.movements).length, Object.keys(beforeRegistration.patients[p1].movements).length);

const stateSnapshot = JSON.stringify(store.load());
controller.loadPatient(p1);
controller.loadPatient(p1);
assert.equal(JSON.stringify(store.load()), stateSnapshot, 'load/rerender does not mutate clinical state');

const catalogLine = controller.registerPreHubActiveLine({
  patient_id: p1,
  drug_name: 'Explicit catalog identity',
  relationship: 'additional',
  catalog_identity: { selected_drug_id: 'synthetic-catalog', source_type: 'CIMA' },
  dose_text: '', presentation: '', route: '', pauta_label: '', start_date: ''
});
assert.equal(catalogLine.dose_text, '');
assert.equal(catalogLine.presentation, '');
assert.equal(catalogLine.route, '');
assert.equal(catalogLine.pauta_label, '');
assert.equal(catalogLine.start_date, '', 'catalog identity does not infer therapy or dates');

assert.equal(followup.legacyMovementLabel('tratamiento_anadido'), 'Add-on terapéutico');
assert.equal(followup.legacyMovementLabel('cambio_terapeutico'), 'Switch terapéutico');

// Productive DOM boundaries: selector/change, reset, exports, suspect, rerender and CIP cleanup.
const allDomElements = [];

function matchesSelector(el, selector) {
  if (!el || selector.includes(' ')) return false;
  const inputMatch = selector.match(/^input\[name="([^"]+)"\](:checked)?$/);
  if (inputMatch) return el.tagName === 'INPUT' && el.name === inputMatch[1] && (!inputMatch[2] || el.checked);
  const classAttr = selector.match(/^\.([\w-]+)(?:\[([\w-]+)(\^?=)"([^"]*)"\])?$/);
  if (classAttr) {
    if (!el.classList) return false;
    if (!el.classList.contains(classAttr[1])) return false;
    if (!classAttr[2]) return true;
    const actual = el.getAttribute(classAttr[2]) || '';
    return classAttr[3] === '^=' ? actual.startsWith(classAttr[4]) : actual === classAttr[4];
  }
  return false;
}

function descendants(el) {
  const result = [];
  (el.children || []).forEach((child) => {
    result.push(child);
    result.push(...descendants(child));
  });
  return result;
}

function domElement(tagName = 'input') {
  const listeners = new Map();
  const attrs = new Map();
  const classes = new Set();
  const el = {
    tagName: tagName.toUpperCase(), value: '', textContent: '', children: [], options: [],
    checked: false, disabled: false, readOnly: false, dataset: {}, style: {}, offsetWidth: 1, parentNode: { removeChild() {} },
    classList: {
      add(...names) { names.forEach((name) => classes.add(name)); },
      remove(...names) { names.forEach((name) => classes.delete(name)); },
      toggle(name, force) { if (force === undefined ? !classes.has(name) : force) classes.add(name); else classes.delete(name); },
      contains(name) { return classes.has(name); }
    },
    appendChild(child) { this.children.push(child); child.parentElement = this; if (child.tagName === 'OPTION') this.options.push(child); return child; },
    append(...children) { children.forEach((child) => this.appendChild(child)); },
    remove(index) { if (Number.isInteger(index)) { this.options.splice(index, 1); this.children.splice(index, 1); } },
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(listener); },
    dispatchEvent(event) { if (!event.target) event.target = this; (listeners.get(event.type) || []).forEach((listener) => listener.call(this, event)); return true; },
    click() { if (!this.disabled) this.dispatchEvent({ type: 'click', target: this, preventDefault() {} }); },
    setAttribute(name, value) { attrs.set(name, String(value)); },
    getAttribute(name) { return attrs.get(name) || null; },
    hasAttribute(name) { return attrs.has(name); },
    removeAttribute(name) { attrs.delete(name); },
    querySelector(selector) { return descendants(this).find((candidate) => matchesSelector(candidate, selector)) || null; },
    querySelectorAll(selector) { return descendants(this).filter((candidate) => matchesSelector(candidate, selector)); }, select() {},
    closest(selector) { if (matchesSelector(this, selector)) return this; return this.parentElement && this.parentElement.closest ? this.parentElement.closest(selector) : { classList: this.classList, insertAdjacentElement() {} }; }, scrollIntoView() {}
  };
  Object.defineProperty(el, 'className', {
    get() { return Array.from(classes).join(' '); },
    set(value) { classes.clear(); String(value || '').split(/\s+/).filter(Boolean).forEach((name) => classes.add(name)); }
  });
  Object.defineProperty(el, 'selectedIndex', {
    get() { const found = this.options.findIndex((option) => option.value === this.value); return found >= 0 ? found : 0; }
  });
  Object.defineProperty(el, 'text', { get() { return this.textContent; }, set(value) { this.textContent = value; } });
  allDomElements.push(el);
  return el;
}

const domStorage = memoryStorage();
domStorage.removeItem = function removeItem(key) { this.values?.delete?.(key); };
const domElements = new Map();
const selectIds = new Set([
  'fhSegLineaPrincipal', 'fhSegServicio', 'fhSegPatologia', 'fhSegPautaActual', 'fhSegNuevaPauta',
  'fhSegTipoRelacionTerapia', 'fhSegCambiaNivel', 'fhSegOptimiza', 'fhSegSuspension', 'fhSegProms',
  'fhSeguimientoEaPresente', 'fhSeguimientoEaGravedad', 'fhSeguimientoEaResuelto',
  'fhSeguimientoEaCorregido', 'fhSeguimientoEaFarmacoSospechoso', 'fhCausalidadFinal'
]);
function domById(id) {
  if (!domElements.has(id)) {
    const tag = selectIds.has(id) ? 'select' : (id.includes('Export') || id.includes('Btn') ? 'button' : 'input');
    const el = domElement(tag);
    el.id = id;
    domElements.set(id, el);
  }
  return domElements.get(id);
}
const domReadyListeners = [];
const clipboardWrites = [];
const downloads = [];
const alerts = [];
const patients = {
  [p1]: { cip: p1, patient_id: p1, servicio: 'Dermatología', patologia: 'Sintética', proms: null },
  [p2]: { cip: p2, patient_id: p2, servicio: 'Dermatología', patologia: 'Sintética', proms: null }
};
const domDocument = {
  addEventListener(type, listener) { if (type === 'DOMContentLoaded') domReadyListeners.push(listener); },
  getElementById: domById,
  createElement: domElement,
  createTextNode(text) { return { tagName: '#TEXT', textContent: text }; },
  querySelector(selector) { return allDomElements.find((candidate) => matchesSelector(candidate, selector)) || null; },
  querySelectorAll(selector) { return allDomElements.filter((candidate) => matchesSelector(candidate, selector)); },
  activeElement: null, head: domElement('head'), documentElement: domElement('html'), body: domElement('body')
};
const domF = {
  whenReady(callback) { callback(); },
  getQueryContext() { return { cip: p1, patient: patients[p1], servicio: patients[p1].servicio, patologia: patients[p1].patologia }; },
  findPatientByCip(cip) { return patients[cip] || null; },
  resolvePatientContextSwitch(current, requested, hasContext, confirmed) {
    if (current === requested) return { action: 'same' };
    if (hasContext && confirmed === undefined) return { action: 'confirm' };
    return confirmed === false ? { action: 'cancel' } : { action: 'switch' };
  },
  setValue(id, value) { domById(id).value = value || ''; },
  setText(id, value) { domById(id).textContent = value || ''; },
  clearChildren(el) { if (el) { el.children = []; el.options = []; } },
  renderFields(target, fields) { target.fields = fields; },
  insertNoCipBanner() {}, isEnfermeriaPatient() { return false; },
  copyTextToClipboard(text) { clipboardWrites.push(text); },
  downloadFile(name, content) { downloads.push({ name, content }); }
};
const domSandbox = {
  window: {
    FarmaciaDemo: domF, sessionStorage: domStorage, localStorage: domStorage,
    FarmaciaCatalog: { loaded: true, getSnapshot() { return null; }, clearSnapshot() {}, autoLoad() { return Promise.resolve(); }, search() { return []; } },
    confirm() { return true; }, alert(message) { alerts.push(message); }
  },
  document: domDocument, console, Uint8Array, Array, URLSearchParams,
  navigator: { clipboard: { writeText(text) { clipboardWrites.push(text); return Promise.resolve(); } } },
  Event: function Event(type) { this.type = type; }, CustomEvent: function CustomEvent(type) { this.type = type; },
  setTimeout, clearTimeout, Blob: globalThis.Blob, URL: globalThis.URL
};
domSandbox.window.navigator = domSandbox.navigator;
domSandbox.window.window = domSandbox.window;
domSandbox.globalThis = domSandbox;
vm.createContext(domSandbox);
vm.runInContext(coreSource, domSandbox);
domSandbox.window.FarmaciaMultitreatmentCore = domSandbox.window.FarmaciaMultitreatmentCore;

const domCore = domSandbox.window.FarmaciaMultitreatmentCore;
const domStore = domCore.createSessionStore(domStorage);
let domState = domStore.createEmpty();
const detailedA = { ...lineA, drug_name: 'Synthetic A', dose_text: '10 mg A', presentation: 'Presentation A', route: 'SC', pauta_label: 'Cada 2 semanas' };
const detailedB = { ...lineB, drug_name: 'Synthetic B', dose_text: '20 mg B', presentation: 'Presentation B', route: 'IV', pauta_label: 'Cada 4 semanas' };
for (const line of [detailedA, detailedB, pending, historical]) domState = domStore.upsertLine(domState, p1, line);
domState = domStore.upsertLine(domState, p2, sameIdOtherPatient);
domStore.save(domState);
for (const name of ['mg1', 'mg2', 'mg3', 'mg4']) {
  const group = domElement('div');
  group.className = 'mg-chip-group';
  group.setAttribute('data-mg-name', name);
  for (const value of ['si', 'no']) {
    const chip = domElement('button');
    chip.className = 'mg-chip';
    chip.setAttribute('data-mg-value', value);
    group.appendChild(chip);
  }
}
vm.runInContext(fs.readFileSync(path.join(ROOT, 'scripts/farmacia_excel_row_export.js'), 'utf8'), domSandbox);
vm.runInContext(followupSource, domSandbox);
domReadyListeners.forEach((listener) => listener());

const lineSelector = domById('fhSegLineaPrincipal');
assert.equal(lineSelector.value, '', 'visible selector starts without inferred line');
assert.equal(domById('fhSegFarmaco').value, '', 'legacy line projection is cleared without selection');
assert.equal(domById('fhSegExportTxt').disabled, true, 'JARA is disabled without selected active line');
assert.equal(domById('fhSegExportCsv').disabled, true, 'hidden CSV is disabled without selected active line');
assert.equal(domById('fhSegExcelExportBtn').disabled, true, 'Excel is disabled without selected active line');
assert.equal(domById('fhSegEvaDolorRange').disabled, true, 'line-bound EVA is disabled without selected active line');
assert.equal(domById('fhSegFecha').disabled, true, 'line-bound follow-up date is disabled without selected active line');
assert.equal(domById('fhSegFecha').value, '', 'line-bound follow-up date is neutral without selected active line');
assert.equal(domById('fhSegEvaPruritoRange').disabled, true, 'both line-bound EVA controls are disabled without selected active line');
assert.ok(domDocument.querySelectorAll('.mg-chip').every((control) => control.disabled), 'all explicit Morisky controls are disabled without selected active line');
assert.ok(domDocument.querySelectorAll('input[name="dlqi_q1"]').every((control) => control.disabled), 'explicit DLQI controls are disabled without selected active line');
assert.equal(domById('btnSegAddOtherDrug').disabled, false, 'explicit pre-Hub registration entry remains enabled');
assert.equal(lineSelector.options.find((option) => option.value === pending.line_id).disabled, true, 'validated_not_started remains visible and nonactive');
assert.equal(lineSelector.options.find((option) => option.value === historical.line_id).disabled, true, 'historical remains visible and nonactive');

lineSelector.value = detailedA.line_id;
lineSelector.dispatchEvent(new domSandbox.Event('change'));
assert.equal(domById('fhSegFarmaco').value, 'Synthetic A', 'visible selection projects exact line A');
assert.equal(domById('fhSeguimientoEaFarmacoSospechoso').value, detailedA.line_id, 'suspect selector value is exact canonical line_id A');
domById('fhSegNuevaDosis').value = 'A draft only';
domById('fhSegNuevaDosis').dispatchEvent(new domSandbox.Event('change'));
domById('fhSegExportTxt').click();
domById('fhSegExportCsv').click();
domById('fhSegExcelExportBtn').click();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.match(clipboardWrites[0], new RegExp(`${p1} \\+ ${detailedA.line_id}`), 'JARA consumes canonical A context');
assert.match(downloads.at(-1).content, new RegExp(`${p1} \\+ ${detailedA.line_id}`), 'hidden CSV consumes canonical A context');
assert.ok(clipboardWrites.some((text) => text.includes(detailedA.line_id) && text.includes(p1)), 'Excel FH consumes canonical A context');

lineSelector.value = detailedB.line_id;
lineSelector.dispatchEvent(new domSandbox.Event('change'));
assert.equal(domById('fhSegFarmaco').value, 'Synthetic B', 'visible selector change projects exact line B');
assert.equal(domById('fhSegNuevaDosis').value, '', 'line B does not inherit line A draft');
assert.equal(domById('fhSeguimientoEaFarmacoSospechoso').value, detailedB.line_id, 'suspect selector changes coherently to B');
const payloadB = domSandbox.window.FarmaciaSeguimiento.buildCanonicalPayload();
assert.equal(payloadB.patient_id, p1);
assert.equal(payloadB.line_id, detailedB.line_id);
assert.equal(payloadB.adverse_effect.suspect_line_id, detailedB.line_id, 'suspect UI and payload share patient_id + line_id');
domById('fhSegNuevaDosis').value = 'B draft only';
domById('fhSegNuevaDosis').dispatchEvent(new domSandbox.Event('change'));
lineSelector.value = detailedA.line_id;
lineSelector.dispatchEvent(new domSandbox.Event('change'));
assert.equal(domById('fhSegNuevaDosis').value, 'A draft only', 'line A restores only its own draft');
lineSelector.value = detailedB.line_id;
lineSelector.dispatchEvent(new domSandbox.Event('change'));
assert.equal(domById('fhSegNuevaDosis').value, 'B draft only', 'line B restores only its own draft');

function chooseMorisky(answers) {
  Object.entries(answers).forEach(([name, value]) => {
    const group = domDocument.querySelector(`.mg-chip-group[data-mg-name="${name}"]`);
    const chip = group.querySelectorAll('.mg-chip').find((candidate) => candidate.getAttribute('data-mg-value') === value);
    group.dispatchEvent({ type: 'click', target: chip, preventDefault() {} });
  });
}

function chooseDlqi(name, index) {
  const controls = domDocument.querySelectorAll(`input[name="${name}"]`);
  controls.forEach((control) => { control.checked = false; });
  controls[index].checked = true;
  controls[index].dispatchEvent(new domSandbox.Event('change'));
}

function q7FollowupIsHidden() {
  return domDocument.querySelector('.dlqi-card__followup').classList.contains('hidden');
}

function selectedQ7bIndex() {
  return domDocument.querySelectorAll('input[name="dlqi_q7_b"]').findIndex((control) => control.checked);
}

function fillClinicalDraft(profile) {
  domById('fhSegFecha').value = profile.date;
  domById('fhSegFecha').dispatchEvent(new domSandbox.Event('change'));
  domById('fhSegProms').value = 'Sí, recoger DLQI + EVA dolor/prurito';
  domById('fhSegProms').dispatchEvent(new domSandbox.Event('change'));
  chooseMorisky(profile.morisky);
  for (const name of ['dlqi_q1', 'dlqi_q2', 'dlqi_q3', 'dlqi_q4', 'dlqi_q5', 'dlqi_q6', 'dlqi_q8', 'dlqi_q9', 'dlqi_q10']) {
    const controls = domDocument.querySelectorAll(`input[name="${name}"]`);
    chooseDlqi(name, profile.dlqiHigh ? 0 : controls.length - 1);
  }
  chooseDlqi('dlqi_q7_a', profile.dlqiHigh ? 0 : 1);
  if (!profile.dlqiHigh) {
    const q7b = domDocument.querySelectorAll('input[name="dlqi_q7_b"]');
    chooseDlqi('dlqi_q7_b', q7b.length - 1);
  }
  domById('fhSegEvaDolorRange').value = profile.evaDolor;
  domById('fhSegEvaDolorRange').dispatchEvent(new domSandbox.Event('input'));
  domById('fhSegEvaPruritoRange').value = profile.evaPrurito;
  domById('fhSegEvaPruritoRange').dispatchEvent(new domSandbox.Event('input'));
  domById('fhSeguimientoEaObservaciones').value = profile.observation;
  domById('fhSeguimientoEaObservaciones').dispatchEvent(new domSandbox.Event('input'));
}

const profileA = {
  morisky: { mg1: 'no', mg2: 'si', mg3: 'no', mg4: 'no' }, dlqiHigh: true,
  evaDolor: '3', evaPrurito: '4', observation: 'Synthetic observation A', date: '2026-07-20'
};
const profileB = {
  morisky: { mg1: 'si', mg2: 'no', mg3: 'si', mg4: 'si' }, dlqiHigh: false,
  evaDolor: '7', evaPrurito: '8', observation: 'Synthetic observation B', date: '2026-07-21'
};

lineSelector.value = detailedA.line_id;
lineSelector.dispatchEvent(new domSandbox.Event('change'));
fillClinicalDraft(profileA);
assert.match(domById('fhSegMoriskyResultado').textContent, /alta adherencia/);
assert.equal(domById('fhSegDlqiTotal').textContent, '30');
assert.equal(q7FollowupIsHidden(), true, 'line A Q7a Sí keeps Q7b hidden');
assert.equal(selectedQ7bIndex(), -1, 'line A Q7a Sí keeps visible Q7b empty');

lineSelector.value = detailedB.line_id;
lineSelector.dispatchEvent(new domSandbox.Event('change'));
assert.equal(domDocument.querySelectorAll('.mg-chip--active').length, 0, 'first clinical entry to B is Morisky-neutral');
assert.equal(domDocument.querySelectorAll('input[name="dlqi_q1"]:checked').length, 0, 'first clinical entry to B is DLQI-neutral');
assert.equal(domById('fhSegEvaDolorRange').value, '0', 'first clinical entry to B is EVA-neutral');
assert.equal(domById('fhSegFecha').value, '', 'first clinical entry to B has no A follow-up date');
assert.equal(domById('fhSeguimientoEaObservaciones').value, '', 'first clinical entry to B has no A adverse-effect data');
fillClinicalDraft(profileB);
assert.match(domById('fhSegMoriskyResultado').textContent, /baja adherencia/);
assert.equal(domById('fhSegDlqiTotal').textContent, '0');
assert.equal(q7FollowupIsHidden(), false, 'line B Q7a No shows Q7b');
const lineBQ7bIndex = selectedQ7bIndex();
assert.notEqual(lineBQ7bIndex, -1, 'line B saves its Q7b answer');

lineSelector.value = detailedA.line_id;
lineSelector.dispatchEvent(new domSandbox.Event('change'));
assert.match(domById('fhSegMoriskyResultado').textContent, /alta adherencia/, 'A restores only A Morisky');
assert.equal(domById('fhSegDlqiTotal').textContent, '30', 'A restores only A DLQI');
assert.equal(domById('fhSegEvaDolorRange').value, '3', 'A restores only A EVA');
assert.equal(domById('fhSegFecha').value, profileA.date, 'A restores only A follow-up date');
assert.equal(domById('fhSeguimientoEaObservaciones').value, profileA.observation, 'A restores its remaining line-bound fields');
assert.equal(q7FollowupIsHidden(), true, 'returning to A hides Q7b without B visual leakage');
assert.equal(selectedQ7bIndex(), -1, 'returning to A leaves visible Q7b empty');
lineSelector.value = detailedB.line_id;
lineSelector.dispatchEvent(new domSandbox.Event('change'));
assert.match(domById('fhSegMoriskyResultado').textContent, /baja adherencia/, 'B retains only B Morisky');
assert.equal(domById('fhSegDlqiTotal').textContent, '0', 'B retains only B DLQI');
assert.equal(domById('fhSegEvaDolorRange').value, '7', 'B retains only B EVA');
assert.equal(domById('fhSegFecha').value, profileB.date, 'B retains only B follow-up date');
assert.equal(domById('fhSeguimientoEaObservaciones').value, profileB.observation, 'B retains its remaining line-bound fields');
assert.equal(q7FollowupIsHidden(), false, 'returning to B shows Q7b');
assert.equal(selectedQ7bIndex(), lineBQ7bIndex, 'returning to B restores only B Q7b answer');
const clinicalPayloadB = domSandbox.window.FarmaciaSeguimiento.buildCanonicalPayload();
assert.equal(clinicalPayloadB.patient_id, p1);
assert.equal(clinicalPayloadB.line_id, detailedB.line_id);
assert.match(clinicalPayloadB.followup.morisky.result, /baja adherencia/);
assert.equal(clinicalPayloadB.followup.dlqi.total, '0');
assert.equal(clinicalPayloadB.followup.eva.dolor, '7');
assert.equal(clinicalPayloadB.followup.values.fhSeguimientoEaObservaciones, profileB.observation);

async function exportCurrentLine(expected) {
  domById('fhSegExportTxt').click();
  const jara = clipboardWrites.at(-1);
  domById('fhSegExportCsv').click();
  const csv = downloads.at(-1).content;
  domById('fhSegExcelExportBtn').click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const excel = clipboardWrites.at(-1);
  for (const output of [jara, csv, excel]) {
    assert.match(output, new RegExp(expected.lineId), 'each export contains only the selected canonical line identity');
    assert.match(output, new RegExp(expected.morisky), 'each export consumes matching-line Morisky');
  }
  assert.match(jara, new RegExp(`DLQI total: ${expected.dlqi}/30`));
  assert.match(jara, new RegExp(`EVA Dolor: ${expected.evaDolor}/10`));
  assert.match(jara, new RegExp(`EVA Prurito: ${expected.evaPrurito}/10`));
  assert.match(csv, new RegExp(`"${expected.dlqi}",[^\n]*"${expected.evaDolor}","${expected.evaPrurito}"`));
  assert.ok(excel.split('\t').includes(expected.dlqi), 'Excel consumes matching-line DLQI');
  assert.ok(excel.split('\t').includes(expected.evaDolor), 'Excel consumes matching-line EVA dolor');
}

await exportCurrentLine({ lineId: detailedB.line_id, morisky: 'baja adherencia', dlqi: '0', evaDolor: '7', evaPrurito: '8' });
lineSelector.value = detailedA.line_id;
lineSelector.dispatchEvent(new domSandbox.Event('change'));
const clinicalPayloadA = domSandbox.window.FarmaciaSeguimiento.buildCanonicalPayload();
assert.match(clinicalPayloadA.followup.morisky.result, /alta adherencia/);
assert.equal(clinicalPayloadA.followup.dlqi.total, '30');
assert.equal(clinicalPayloadA.followup.eva.dolor, '3');
await exportCurrentLine({ lineId: detailedA.line_id, morisky: 'alta adherencia', dlqi: '30', evaDolor: '3', evaPrurito: '4' });

const exportCounts = { clipboard: clipboardWrites.length, downloads: downloads.length };
lineSelector.value = '';
lineSelector.dispatchEvent(new domSandbox.Event('change'));
assert.equal(domDocument.querySelectorAll('.mg-chip--active').length, 0, 'deselection clears Morisky');
assert.equal(domDocument.querySelectorAll('input[name="dlqi_q1"]:checked').length, 0, 'deselection clears DLQI');
assert.equal(q7FollowupIsHidden(), true, 'deselection hides Q7b');
assert.equal(selectedQ7bIndex(), -1, 'deselection clears visible Q7b');
assert.equal(domById('fhSegEvaDolorRange').value, '0', 'deselection clears EVA');
assert.equal(domById('fhSegEvaDolorRange').disabled, true, 'deselection disables EVA');
assert.ok(domDocument.querySelectorAll('.mg-chip').every((control) => control.disabled), 'deselection disables Morisky');
assert.ok(domDocument.querySelectorAll('input[name="dlqi_q1"]').every((control) => control.disabled), 'deselection disables DLQI');
assert.equal(domById('fhSeguimientoEaFarmacoSospechoso').value, '', 'deselection clears suspect');
assert.equal(domById('fhSegTratamientoGrid').children.length, 0, 'deselection clears line summary');
domById('fhSegExportTxt').click();
domById('fhSegExportCsv').click();
domById('fhSegExcelExportBtn').click();
assert.deepEqual({ clipboard: clipboardWrites.length, downloads: downloads.length }, exportCounts, 'disabled exports produce nothing without selection');
assert.equal(domById('btnSegAddOtherDrug').disabled, false, 'pre-Hub active-line registration remains available after deselection');

lineSelector.value = detailedB.line_id;
lineSelector.dispatchEvent(new domSandbox.Event('change'));

domReadyListeners.forEach((listener) => listener());
assert.equal(domById('fhSegLineaPrincipal').value, detailedB.line_id, 'rerender restores explicit canonical selection');
assert.equal(domById('fhSegNuevaDosis').value, 'B draft only', 'rerender restores exact line draft');

domById('fhSegCip').value = p2;
domById('fhSegCipSearchBtn').click();
assert.equal(domById('fhSegLineaPrincipal').value, '', 'CIP change clears selected line');
assert.equal(domById('fhSegFarmaco').value, '', 'CIP change clears line projection');
assert.equal(domById('fhSegNuevaDosis').value, '', 'CIP change clears visible draft');
assert.equal(domById('fhSeguimientoEaFarmacoSospechoso').value, '', 'CIP change clears suspect');
assert.equal(domDocument.querySelectorAll('.mg-chip--active').length, 0, 'CIP change clears Morisky');
assert.equal(domDocument.querySelectorAll('input[name="dlqi_q1"]:checked').length, 0, 'CIP change clears DLQI');
assert.equal(q7FollowupIsHidden(), true, 'CIP change hides Q7b');
assert.equal(selectedQ7bIndex(), -1, 'CIP change clears visible Q7b');
assert.equal(domById('fhSegEvaDolorRange').value, '0', 'CIP change clears EVA');
assert.equal(domById('fhSegEvaDolorRange').disabled, true, 'CIP change leaves line-bound controls disabled without p2 selection');
assert.equal(domById('fhSegTratamientoGrid').children.length, 0, 'CIP change clears treatment summary');
assert.equal(domStore.getPatientState(domStore.load(), p1).selected_line_id, '', 'CIP change discards old patient selection');
assert.equal(domStore.getPatientState(domStore.load(), p1).drafts[`seguimiento:${detailedB.line_id}`], undefined, 'CIP change discards old patient line drafts');
lineSelector.value = sameIdOtherPatient.line_id;
lineSelector.dispatchEvent(new domSandbox.Event('change'));
assert.equal(domDocument.querySelectorAll('.mg-chip--active').length, 0, 'same line_id on p2 cannot restore p1 Morisky');
assert.equal(domDocument.querySelectorAll('input[name="dlqi_q1"]:checked').length, 0, 'same line_id on p2 cannot restore p1 DLQI');
assert.equal(domById('fhSegEvaDolorRange').value, '0', 'same line_id on p2 cannot restore p1 EVA');
assert.equal(alerts.length, 0, 'productive boundary harness has no context errors');

console.log('\nTotal: canonical follow-up line contract passed');
