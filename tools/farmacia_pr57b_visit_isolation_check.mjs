#!/usr/bin/env node
// Focused contract check for WO-FH-PR57B-INMEMORY-LINE-ISOLATION-01.

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'farmacia_seguimiento.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_seguimiento.js'), 'utf8');
let failed = 0;
let passed = 0;

function check(condition, label) {
  console.log(`  ${condition ? '✓' : '✗'} ${label}`);
  condition ? passed++ : failed++;
}

class FakeClassList {
  constructor(value = '') { this.values = new Set(String(value).split(/\s+/).filter(Boolean)); }
  add(...values) { values.forEach((value) => this.values.add(value)); }
  remove(...values) { values.forEach((value) => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    const next = force === undefined ? !this.contains(value) : force;
    next ? this.add(value) : this.remove(value);
    return next;
  }
}

class FakeNode {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.value = ''; this.textContent = ''; this.disabled = false;
    this.checked = false; this.children = []; this.options = []; this.dataset = {}; this.attributes = {};
    this.listeners = {}; this.classList = new FakeClassList();
  }
  set className(value) { this._className = value; this.classList = new FakeClassList(value); }
  get className() { return this._className || ''; }
  appendChild(child) { this.children.push(child); if (this.tagName === 'SELECT') this.options.push(child); return child; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatchEvent(event) { event.target = this; (this.listeners[event.type] || []).forEach((handler) => handler.call(this, event)); }
  closest() { return null; }
}

const ids = new Map();
const addNode = (id, tag = 'div') => { const node = new FakeNode(tag); ids.set(id, node); return node; };
[
  'fhSegLineaPrincipal', 'fhSegTipoRelacionTerapia', 'fhSegOptimiza', 'fhSegNuevaPauta',
  'fhSegMotivoOpt', 'fhSegSuspension', 'fhSegMotivoSusp', 'fhSegVia', 'fhSegPautaActual'
].forEach((id) => addNode(id, 'select'));
[
  'fhSegNuevaDosis', 'fhSegNuevaPautaOtro', 'fhSegObservacionesLinea', 'fhSegEstadoLinea',
  'fhSegLineCards', 'fhSegTratamientoGrid', 'fhSegMoriskyResultado', 'fhSegLineEditorHelp',
  'fhSegMultilineExportWarning', 'fhSegExportTxt', 'fhSegExportCsv', 'fhSegExcelExportBtn',
  'fhSegFarmaco', 'fhSegPrincipioActivo', 'fhSegPresentacion', 'fhSegDosisActual',
  'fhSegFechaInicio', 'fhSegCimaContextPrincipioActivo', 'fhSegCodigoNacional', 'fhSegNregistro',
  'fhSegEtiquetas', 'fhSegOrigenCatalogo', 'fhSegFecha', 'fhSegServicio', 'fhSegPatologia'
].forEach((id) => addNode(id));
ids.get('fhSegMultilineExportWarning').classList.add('hidden');

const chips = [];
['mg1', 'mg2', 'mg3', 'mg4'].forEach((name) => ['si', 'no'].forEach((value) => {
  const chip = new FakeNode('button');
  chip.className = 'mg-chip';
  chip.setAttribute('data-mg-name', name);
  chip.setAttribute('data-mg-value', value);
  chips.push(chip);
}));
const activeFor = (name) => chips.find((chip) => chip.getAttribute('data-mg-name') === name && chip.classList.contains('mg-chip--active')) || null;
const fakeDocument = {
  addEventListener() {},
  getElementById: (id) => ids.get(id) || null,
  createElement: (tag) => new FakeNode(tag),
  createTextNode: (text) => ({ textContent: text }),
  querySelector(selector) {
    const name = selector.match(/data-mg-name="([^"]+)"/)?.[1];
    return name ? { querySelector: () => activeFor(name) } : null;
  },
  querySelectorAll(selector) {
    if (selector === '.mg-chip') return chips;
    if (selector === '.mg-chip--active') return chips.filter((chip) => chip.classList.contains('mg-chip--active'));
    return [];
  }
};
const fakeF = {
  clearChildren(node) { if (node) { node.children = []; node.options = []; } },
  setText(id, value) { const node = ids.get(id); if (node) node.textContent = value || ''; },
  renderFields() {}
};
let confirmResult = true;
let confirmCalls = 0;
let randomValue = 0.1;
const deterministicMath = Object.create(Math);
deterministicMath.random = () => { randomValue += 0.1; return randomValue; };
const sandbox = {
  window: { FarmaciaDemo: fakeF, confirm: () => { confirmCalls++; return confirmResult; } },
  document: fakeDocument, console, Math: deterministicMath,
  Event: function Event(type) { this.type = type; }, setTimeout, clearTimeout
};
vm.createContext(sandbox);
vm.runInContext(js, sandbox);
const api = sandbox.window.FarmaciaSeguimiento;
const fh004 = {
  cip: 'CIP-DEMO-FH-004', biologicos: [
    { linea_id: 'BIO-FH-004-L1', nombre_linea: 'L1' },
    { linea_id: 'BIO-FH-004-L2', nombre_linea: 'L2' },
    { linea_id: 'BIO-FH-004-L3', nombre_linea: 'L3' }
  ]
};
const defaults = {
  fhSegTipoRelacionTerapia: 'sin_cambios', fhSegOptimiza: 'No', fhSegNuevaDosis: '',
  fhSegNuevaPauta: '', fhSegNuevaPautaOtro: '', fhSegMotivoOpt: 'No aplica',
  fhSegSuspension: 'No', fhSegMotivoSusp: 'No aplica', fhSegObservacionesLinea: ''
};
const setChip = (name, value) => {
  chips.filter((chip) => chip.getAttribute('data-mg-name') === name).forEach((chip) => chip.classList.toggle('mg-chip--active', chip.getAttribute('data-mg-value') === value));
};
const controlsMatch = (expected) => Object.entries(expected).every(([id, value]) => ids.get(id).value === value);

api.syncLinesForPatient(fh004);
const firstVisitId = api.getCurrentVisit().visit_id;
check(api.getCurrentVisit().selected_line_ids.length === 0 && !api.getCurrentVisit().editing_line_id, 'FH-004 starts without selection or editor');
check(ids.get('fhSegExportTxt').disabled && ids.get('fhSegExportCsv').disabled && ids.get('fhSegExcelExportBtn').disabled, 'zero selected lines disable all current exports');

api.toggleLineSelection('BIO-FH-004-L2', true);
check(controlsMatch(defaults), 'fresh L2 restores visible baseline defaults');
check(!ids.get('fhSegExportTxt').disabled && !ids.get('fhSegExcelExportBtn').disabled, 'one selected line enables existing exports');
const beforeEmptyDeselect = confirmCalls;
api.toggleLineSelection('BIO-FH-004-L2', false);
check(confirmCalls === beforeEmptyDeselect && api.getCurrentVisit().selected_line_ids.length === 0, 'empty baseline line deselects immediately without confirm');

api.toggleLineSelection('BIO-FH-004-L2', true);
const l2 = { ...defaults, fhSegTipoRelacionTerapia: 'optimizacion', fhSegOptimiza: 'Sí', fhSegNuevaDosis: 'L2 dose', fhSegNuevaPauta: 'OTRO', fhSegNuevaPautaOtro: 'L2 pauta', fhSegMotivoOpt: 'Adherencia', fhSegSuspension: 'No', fhSegObservacionesLinea: 'L2 observations' };
Object.entries(l2).forEach(([id, value]) => { ids.get(id).value = value; });
setChip('mg1', 'no'); setChip('mg2', 'si');
ids.get('fhSegFecha').value = '2026-07-27'; ids.get('fhSegServicio').value = 'Reumatología'; ids.get('fhSegPatologia').value = 'LES';
api.toggleLineSelection('BIO-FH-004-L3', true);
check(controlsMatch(l2) && api.getCurrentVisit().editing_line_id === 'BIO-FH-004-L2', 'adding L3 preserves the current L2 editor and values');
check(ids.get('fhSegExportTxt').disabled && !ids.get('fhSegMultilineExportWarning').classList.contains('hidden'), 'two selected lines disable exports and show warning');

api.selectLineById('BIO-FH-004-L3');
check(controlsMatch(defaults), 'first L3 edit starts at baseline defaults');
const l3 = { ...defaults, fhSegTipoRelacionTerapia: 'suspension', fhSegOptimiza: 'No', fhSegSuspension: 'Sí', fhSegMotivoSusp: 'Efecto adverso', fhSegObservacionesLinea: 'L3 observations' };
Object.entries(l3).forEach(([id, value]) => { ids.get(id).value = value; });
setChip('mg1', 'si'); setChip('mg2', 'no'); setChip('mg3', 'si');
api.selectLineById('BIO-FH-004-L2');
check(controlsMatch(l2) && activeFor('mg1')?.getAttribute('data-mg-value') === 'no' && activeFor('mg2')?.getAttribute('data-mg-value') === 'si', 'exact L2→L3→L2 restores distinct L2 controls and Morisky');
api.selectLineById('BIO-FH-004-L3');
check(controlsMatch(l3) && activeFor('mg1')?.getAttribute('data-mg-value') === 'si' && activeFor('mg3')?.getAttribute('data-mg-value') === 'si', 'return to L3 restores distinct movement, suspension, observations and Morisky');
check(ids.get('fhSegFecha').value === '2026-07-27' && ids.get('fhSegServicio').value === 'Reumatología' && ids.get('fhSegPatologia').value === 'LES', 'common visit fields remain unchanged through editor switches');

confirmResult = false;
api.toggleLineSelection('BIO-FH-004-L3', false);
check(api.getCurrentVisit().selected_line_ids.includes('BIO-FH-004-L3') && controlsMatch(l3), 'dirty deselect cancel preserves L3 selection and data');
confirmResult = true;
api.toggleLineSelection('BIO-FH-004-L3', false);
check(!api.getCurrentVisit().selected_line_ids.includes('BIO-FH-004-L3') && !api.getCurrentVisit().line_state['BIO-FH-004-L3'], 'dirty deselect confirm discards L3 state');
api.toggleLineSelection('BIO-FH-004-L3', true);
api.selectLineById('BIO-FH-004-L3');
check(controlsMatch(defaults) && chips.every((chip) => !chip.classList.contains('mg-chip--active')), 'discarded L3 reselects visibly clean at defaults without stale Morisky');
const beforeCleanDiscard = confirmCalls;
api.toggleLineSelection('BIO-FH-004-L3', false);
check(confirmCalls === beforeCleanDiscard, 'reselected clean line deselects without another confirm');

api.syncLinesForPatient({ cip: 'CIP-DEMO-FH-001', biologicos: [{ linea_id: 'BIO-FH-001-L1', nombre_linea: 'FH-001 L1' }] });
const secondVisit = api.getCurrentVisit();
check(secondVisit.visit_id !== firstVisitId && secondVisit.selected_line_ids[0] === 'BIO-FH-001-L1' && secondVisit.editing_line_id === 'BIO-FH-001-L1', 'CIP change creates a fresh visit and FH-001 auto-selects/edits L1');
api.syncLinesForPatient(fh004);
check(api.getCurrentVisit().visit_id !== secondVisit.visit_id && api.getCurrentVisit().selected_line_ids.length === 0 && Object.keys(api.getCurrentVisit().line_state).length === 0, 'returning to FH-004 creates another empty visit with no restoration');

const visitBlock = (js.match(/function createFollowupVisit[\s\S]*?function createFollowupOtherDrug/) || [''])[0];
const syncBlock = (js.match(/function syncBiologicControls[\s\S]*?function renderBiologicLineCards/) || [''])[0];
const toggleBlock = (js.match(/function toggleBiologicLineSelection[\s\S]*?function createFollowupOtherDrug/) || [''])[0];
const editorBlock = (js.match(/function readVisibleLineState[\s\S]*?function toggleBiologicLineSelection/) || [''])[0];
const cipLifecycleBlock = (js.match(/function applyContext[\s\S]*?function initCipSearch/) || [''])[0];
const visitImplementationPaths = [visitBlock, syncBlock, cipLifecycleBlock].join('\n');

check(/visit_id: 'FH-VISIT-'.*Date\.now.*Math\.random/.test(visitBlock), 'visit_id is generated freshly in memory');
check(js.includes('createFollowupVisit(requestedCip)') && js.includes('createFollowupVisit(currentSegPatient'), 'initial and changed CIP create a visit');
check(!/sessionStorage|localStorage|indexedDB|FarmaciaMultitreatment|URLSearchParams|FARMACIA_DRUG_SNAPSHOT/.test(visitImplementationPaths), 'all visit/line-state paths avoid persistent, multitreatment, snapshot and URL storage');
check(/selected_line_ids: \[\], editing_line_id: '', line_state: \{\}/.test(visitBlock), 'visit owns selected IDs, editor ID and per-line state');

check(syncBlock.includes('activeLines.length === 1 ? [activeLines[0].linea_id] : []'), 'exactly one active line is auto-selected');
check(syncBlock.includes("editing_line_id = activeLines.length === 1 ? activeLines[0].linea_id : ''"), 'exactly one active line is auto-edited');
check(js.includes("'CIP-DEMO-FH-004'") && js.includes("'BIO-FH-004-L2'") && js.includes("'BIO-FH-004-L3'"), 'FH-004 retains two canonical active lines');
check(js.includes("control.type = 'checkbox'") && js.includes("line.estado_linea !== 'active'"), 'manual multi-selection is active-only');
check(js.includes("option.value = lineId") && js.includes('currentFollowupVisit.selected_line_ids.forEach'), 'editor options are selected-line IDs only');

['fhSegTipoRelacionTerapia', 'fhSegOptimiza', 'fhSegNuevaDosis', 'fhSegNuevaPauta', 'fhSegNuevaPautaOtro', 'fhSegMotivoOpt', 'fhSegSuspension', 'fhSegMotivoSusp', 'fhSegObservacionesLinea'].forEach((id) => {
  check(visitBlock.includes(`'${id}'`) || html.includes(`id="${id}"`), `${id} participates in line-specific UI`);
});
check(editorBlock.includes('captureEditingLineState();') && editorBlock.includes('restoreEditingLineState();'), 'L2→L3→L2 switches capture then restore line state');
check(editorBlock.includes("state.morisky") && editorBlock.includes("data-mg-name") && editorBlock.includes("data-mg-value"), 'Morisky answers are isolated by line');
check(html.includes('Observaciones de esta línea'), 'line observations use the approved exact label');

check(editorBlock.includes('el.disabled = !editing') && editorBlock.includes('clearMoriskyControls(!editing)'), 'no editor clears and disables line controls and Morisky');
check(html.includes('Seleccione una línea activa para registrar datos específicos de tratamiento.'), 'no-editor help text is exact');
check(toggleBlock.includes('lineStateIsDirty') && toggleBlock.includes('window.confirm(LINE_DISCARD_MESSAGE)'), 'dirty deselection uses native confirmation');
check(js.includes('Esta línea contiene datos introducidos en la visita actual. Si la desmarca, se perderán.'), 'deselection confirmation text is exact');
check(toggleBlock.includes('delete currentFollowupVisit.line_state[lineId]'), 'confirmed/empty deselection deletes stale line state');
check(toggleBlock.includes("ids.length === 1 ? ids[0] : ''"), 'deselected editor resolves the remaining-editor rule by exact ID');

check(js.includes('hasVisitLineData') && js.includes('lineStateIsDirty(visibleLineState)'), 'CIP guard includes current visible line data');
check(js.includes('createFollowupVisit(requestedCip)') && js.includes('currentBiologicLines = []'), 'confirmed CIP switch destroys line context before new visit use');
check(syncBlock.includes('currentFollowupVisit.line_state = {}'), 'known CIP hydration never restores prior visit state');
check(js.includes('syncBiologicControls(null)') && editorBlock.includes(": ''"), 'unknown CIP remains clean with line controls cleared');
check(js.includes('LINE_CONTROL_DEFAULTS') && editorBlock.includes('LINE_CONTROL_DEFAULTS[id]'), 'fresh and discarded lines restore explicit contract defaults');

check(js.includes("button.disabled = count !== 1 || suspectCount > 1"), 'exports require exactly one selected line and preserve the PR57C suspect gate');
check(html.includes('La exportación multilínea se incorporará en el checkpoint de salidas. Reduzca temporalmente la visita a una línea para usar las exportaciones actuales.'), 'multiline export warning is exact');
check(html.includes('fhSegExportTxt') && html.includes('fhSegExportCsv') && html.includes('fhSegExcelExportBtn'), 'JARA, CSV and Excel export anchors remain');
check(js.includes("'CIP-DEMO-FH-002': []") && js.includes("estado_linea: 'validated_not_started'"), 'FH-002/003 have no active selectable line');
check(!/selected_line_ids.*tratamiento_id|editing_line_id.*tratamiento_id/.test(js), 'visit line identity has no treatment-ID fallback');

['followupCatalogContext', 'fhSegDlqiQuestions', 'readNaranjoAnswersFromDom', 'readKarchLasagnaAnswersFromDom', 'followupOtherDrugs', 'navToDashboardPaciente', 'buildSegLines'].forEach((anchor) => {
  check(js.includes(anchor) || html.includes(anchor), `preservation anchor remains: ${anchor}`);
});

console.log(`\n Total: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
