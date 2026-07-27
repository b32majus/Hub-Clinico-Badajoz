#!/usr/bin/env node
// Focused contract check for WO-FH-PR57C-EA-CAUSALITY-BY-SUSPECT-01.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'farmacia_seguimiento.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_seguimiento.js'), 'utf8');
const model = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_validacion_model.js'), 'utf8');
let passed = 0; let failed = 0;
function check(value, label) { console.log(`  ${value ? '✓' : '✗'} ${label}`); value ? passed++ : failed++; }

class ClassList {
  constructor(value = '') { this.values = new Set(value.split(/\s+/).filter(Boolean)); }
  add(...values) { values.forEach((value) => this.values.add(value)); }
  remove(...values) { values.forEach((value) => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) { const next = force === undefined ? !this.contains(value) : force; next ? this.add(value) : this.remove(value); return next; }
}
class Node {
  constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.value = ''; this.textContent = ''; this.checked = false; this.disabled = false; this.children = []; this.options = []; this.dataset = {}; this.attrs = {}; this.classList = new ClassList(); this.listeners = {}; }
  set className(value) { this._className = value; this.classList = new ClassList(value); }
  get className() { return this._className || ''; }
  get text() { return this.textContent; }
  get selectedIndex() { const index = this.options.findIndex((option) => option.value === this.value); return index < 0 ? 0 : index; }
  appendChild(child) { this.children.push(child); if (this.tagName === 'SELECT') this.options.push(child); return child; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key] ?? null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatchEvent(event) { event.target = this; (this.listeners[event.type] || []).forEach((fn) => fn.call(this, event)); }
  closest() { return null; }
  querySelector(selector) { return selector === '.causality-chip--active' ? this.children.find((child) => child.classList.contains('causality-chip--active')) || null : null; }
  querySelectorAll(selector) { return selector === '.causality-chip' ? this.children : []; }
}

const nodes = new Map();
const node = (id, tag = 'div') => { if (!nodes.has(id)) nodes.set(id, new Node(tag)); return nodes.get(id); };
['fhSegLineaPrincipal', 'fhSeguimientoEaPresente', 'fhSeguimientoEaGravedad', 'fhSeguimientoEaResuelto', 'fhSeguimientoEaCorregido', 'fhSeguimientoEaFarmacoSospechoso', 'fhCausalidadFinal'].forEach((id) => node(id, 'select'));
['fhSeguimientoEaObservaciones'].forEach((id) => node(id, 'textarea'));
['fhSeguimientoEaSuspectCandidates', 'fhSeguimientoEaFarmacoRow', 'naranjoScore', 'naranjoCategoria', 'klCategoria', 'resumenNaranjo', 'resumenKl', 'fhSegExportTxt', 'fhSegExportCsv', 'fhSegExcelExportBtn', 'fhSegMultilineExportWarning', 'fhSegMultiSuspectExportWarning'].forEach((id) => node(id));
node('fhSeguimientoEaPresente').value = 'no_consta'; node('fhSeguimientoEaResuelto').value = 'no_consta'; node('fhSeguimientoEaCorregido').value = 'no_consta'; node('fhCausalidadFinal').value = 'No evaluada';

const groups = new Map();
const answerIds = ['naranjoQ1','naranjoQ2','naranjoQ3','naranjoQ4','naranjoQ5','naranjoQ6','naranjoQ7','naranjoQ8','naranjoQ9','naranjoQ10','klTemporal','klConocido','klAlternativa','klSuspendido','klMejoraRetirada','klReadministracion','klReaparece'];
answerIds.forEach((id) => {
  const group = new Node(); group.setAttribute('data-answer-id', id);
  const values = id.startsWith('naranjo') ? ['si','no','desconocido'] : ['si','no','no_se_sabe','no_aplica'];
  values.forEach((value) => { const chip = new Node('button'); chip.setAttribute('data-value', value); chip.classList.add('causality-chip'); if (value === (id.startsWith('naranjo') ? 'desconocido' : 'no_se_sabe')) chip.classList.add('causality-chip--active'); group.appendChild(chip); });
  groups.set(id, group);
});
const setAnswer = (id, value) => groups.get(id).children.forEach((chip) => chip.classList.toggle('causality-chip--active', chip.getAttribute('data-value') === value));
const document = {
  addEventListener() {}, createElement: (tag) => new Node(tag), createTextNode: (text) => ({ textContent: text }), getElementById: (id) => node(id),
  querySelector(selector) { const id = selector.match(/data-answer-id="([^"]+)"/)?.[1]; return id ? groups.get(id) : null; },
  querySelectorAll(selector) {
    if (selector.includes('data-answer-id^="naranjo"')) return [...groups.entries()].filter(([id]) => id.startsWith('naranjo')).map(([, group]) => group);
    if (selector.includes('data-answer-id^="kl"')) return [...groups.entries()].filter(([id]) => id.startsWith('kl')).map(([, group]) => group);
    if (selector === '.causality-chip-group .causality-chip') return [...groups.values()].flatMap((group) => group.children);
    return [];
  }
};
const F = { clearChildren(el) { if (el) { el.children = []; el.options = []; } }, setText(id, value) { node(id).textContent = value || ''; }, setValue(id, value) { node(id).value = value || ''; }, renderFields() {} };
let confirmations = []; let confirmCalls = [];
const sandbox = { window: { FarmaciaDemo: F, confirm(message) { confirmCalls.push(message); return confirmations.length ? confirmations.shift() : true; } }, document, console, Event: function Event(type) { this.type = type; }, setTimeout, clearTimeout };
vm.createContext(sandbox); vm.runInContext(model, sandbox); vm.runInContext(js, sandbox);
const api = sandbox.window.FarmaciaSeguimiento;
const patient = { cip: 'CIP-PR57C', biologicos: [
  { linea_id: 'L2', nombre_linea: 'Línea 2', estado_linea: 'activo', tipo_relacion: 'principal' },
  { linea_id: 'L3', nombre_linea: 'Línea 3', estado_linea: 'activo', tipo_relacion: 'adicional' }
] };
api.syncLinesForPatient(patient); api.setEaPresent('si'); api.refreshEaCandidates();
check(api.getCurrentVisit().adverse_event.suspect_ids.length === 0, 'no candidate is auto-marked, including a multi-line visit');
check(node('fhSeguimientoEaSuspectCandidates').children.length === 2, 'explicit L2/L3 lines render candidate checkboxes');
check(api.toggleEaSuspect('line:L2', true) && api.getCurrentVisit().adverse_event.causality_editing_id === 'line:L2', 'one explicitly marked suspect becomes editor');
setAnswer('naranjoQ1', 'si'); node('naranjoScore').textContent = '1'; node('naranjoCategoria').textContent = 'Posible'; node('fhCausalidadFinal').value = 'Probable'; api.captureCausalityEditor();
check(api.toggleEaSuspect('line:L3', true) && api.getCurrentVisit().adverse_event.causality_editing_id === '', 'two suspects require an explicit editor choice');
api.setCausalityEditor('line:L3'); setAnswer('naranjoQ2', 'no'); node('naranjoScore').textContent = '-1'; node('naranjoCategoria').textContent = 'Dudosa'; setAnswer('klTemporal', 'no'); node('klCategoria').textContent = 'Improbable'; node('fhCausalidadFinal').value = 'Definida'; api.captureCausalityEditor();
api.setCausalityEditor('line:L2');
check(groups.get('naranjoQ1').querySelector('.causality-chip--active').getAttribute('data-value') === 'si' && node('naranjoScore').textContent === '1', 'exact L2 Naranjo state restores after L2/L3 switching');
check(node('fhCausalidadFinal').value === 'Probable', 'explicit final assessment remains independent per suspect');
api.setCausalityEditor('line:L3');
check(groups.get('naranjoQ2').querySelector('.causality-chip--active').getAttribute('data-value') === 'no' && node('klCategoria').textContent === 'Improbable', 'distinct L3 Naranjo and Karch state restores exactly');

api.addFollowupOtherDrug(); const uid = api.getFollowupOtherDrugs()[0].uid; api.updateFollowupOtherDrug(uid, 'farmaco', 'Relacionado A'); api.refreshEaCandidates();
check(node('fhSeguimientoEaSuspectCandidates').children.some((label) => label.children[0].value === `other:${uid}`), 'related treatment candidate uses stable other:<uid> identity');
api.toggleEaSuspect(`other:${uid}`, true); api.setCausalityEditor(`other:${uid}`); setAnswer('klConocido', 'si'); node('klCategoria').textContent = 'Probable'; api.captureCausalityEditor(); api.updateFollowupOtherDrug(uid, 'farmaco', 'Relacionado renombrado');
check(api.getCurrentVisit().causality_by_suspect[`other:${uid}`].karch_answers.conocido === 'si' && api.getCurrentVisit().adverse_event.suspect_ids.includes(`other:${uid}`), 'rename keeps related UID and Karch state');

api.addFollowupOtherDrug(); const cleanUid = api.getFollowupOtherDrugs()[1].uid; api.toggleEaSuspect(`other:${cleanUid}`, true); const beforeClean = confirmCalls.length; api.toggleEaSuspect(`other:${cleanUid}`, false);
check(confirmCalls.length === beforeClean && !api.getCurrentVisit().causality_by_suspect[`other:${cleanUid}`], 'clean suspect unmarks immediately and removes clean state');
api.setCausalityEditor('line:L2'); confirmations = [false]; check(!api.toggleEaSuspect('line:L2', false) && api.getCurrentVisit().adverse_event.suspect_ids.includes('line:L2'), 'dirty unmark cancel preserves selection, editor and data');
confirmations = [true]; check(api.toggleEaSuspect('line:L2', false) && !api.getCurrentVisit().causality_by_suspect['line:L2'], 'dirty unmark accept removes ID and causality entry');
api.toggleEaSuspect('line:L2', true); check(!api.getCurrentVisit().causality_by_suspect['line:L2'], 're-marking a discarded suspect starts clean');

node('fhSeguimientoEaGravedad').value = 'Grave'; node('fhSeguimientoEaObservaciones').value = 'Común L2/L3'; api.captureCommonAdverseEvent(); api.toggleLineSelection('L2', true); api.toggleLineSelection('L3', true); api.selectLineById('L2'); api.selectLineById('L3');
check(api.getCurrentVisit().adverse_event.severity === 'Grave' && api.getCurrentVisit().adverse_event.observations === 'Común L2/L3' && !api.getCurrentVisit().line_state.L2?.adverse_event, 'EA remains visit-common across L2/L3 editors and outside line_state');
confirmations = [false]; api.setEaPresent('no'); check(api.getCurrentVisit().adverse_event.present === 'si' && api.getCurrentVisit().adverse_event.suspect_ids.length > 0, 'EA disable cancel restores enabled state and all data');
confirmations = [true]; api.setEaPresent('no'); check(api.getCurrentVisit().adverse_event.suspect_ids.length === 0 && Object.keys(api.getCurrentVisit().causality_by_suspect).length === 0, 'EA disable accept clears suspects, causality and editor');

api.setEaPresent('si'); api.toggleEaSuspect(`other:${uid}`, true); api.setCausalityEditor(`other:${uid}`); node('fhCausalidadFinal').value = 'Posible'; api.captureCausalityEditor(); confirmations = [false]; check(!api.deleteFollowupOtherDrug(uid) && api.getFollowupOtherDrugs().some((drug) => drug.uid === uid), 'linked related delete cancel preserves row and causal data');
confirmations = [true]; check(api.deleteFollowupOtherDrug(uid) && !api.getCurrentVisit().adverse_event.suspect_ids.includes(`other:${uid}`), 'linked related delete accept cleans suspect and causality references');

api.toggleLineSelection('L3', false); api.toggleEaSuspect('line:L2', true); check(!node('fhSegExportTxt').disabled, 'one selected line and one suspect preserve current exports'); api.toggleEaSuspect('line:L3', true);
check(node('fhSegExportTxt').disabled && !node('fhSegMultiSuspectExportWarning').classList.contains('hidden'), 'two suspects block exports and show the exact additional warning');

const candidateBlock = (js.match(/function getRelevantDrugCandidates[\s\S]*?function updateLegacySuspectSummary/) || [''])[0];
check(!/dom:|tratamiento_id|currentBiologicLines\[0\]|multiple:unassigned/.test(candidateBlock), 'candidate identity has no DOM, treatment-ID, index, first or multiple sentinel fallback');
check(html.includes('Fármaco cuya causalidad estás evaluando') && html.includes('La exportación con múltiples fármacos sospechosos se incorporará en el checkpoint de salidas.'), 'binding editor label and multi-suspect warning are exact');
check(js.includes('currentFollowupVisit = null') && !/sessionStorage|localStorage|indexedDB|URLSearchParams/.test((js.match(/function createFollowupVisit[\s\S]*?function clearMoriskyControls/) || [''])[0]), 'CIP/reload lifecycle is fresh runtime memory without restoration storage');
check(js.includes('fhSegDlqiQuestions') && js.includes('data-mg-name') && js.includes('FarmaciaCatalog') && js.includes('navToDashboardPaciente') && js.includes('buildSegLines'), '#57A/#57B, DLQI, Morisky, catalog, dashboard and exporter anchors remain');
check(!html.includes('Sospechoso de EA</label>') && !js.includes("relation = 'sospechoso_ea'"), 'related card has no redundant suspect control or relationship conversion');

const exactMessages = [
  'Este fármaco tiene una evaluación de causalidad en la visita actual. Si lo desmarca, se perderá.',
  'Este tratamiento está vinculado al efecto adverso o tiene una evaluación de causalidad. Si lo elimina, se perderán esos datos.',
  'Al desactivar el efecto adverso se eliminarán los sospechosos y las evaluaciones de causalidad de esta visita.'
];
check(exactMessages.every((message) => js.includes(message)), 'all three native confirmation messages are exact');
console.log(`\nPR57C EA causality: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
