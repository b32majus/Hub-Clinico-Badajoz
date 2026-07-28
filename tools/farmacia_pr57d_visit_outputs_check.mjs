#!/usr/bin/env node
// Executable regression contract for issue #170 / PR57D visit outputs.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const js = read('scripts/farmacia_seguimiento.js');
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
  constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.value = ''; this.textContent = ''; this.checked = false; this.disabled = false; this.children = []; this.options = []; this.attributes = {}; this.dataset = {}; this.classList = new ClassList(); this.listeners = {}; }
  set className(value) { this._className = value; this.classList = new ClassList(value); }
  get className() { return this._className || ''; }
  get text() { return this.textContent; }
  get selectedIndex() { const found = this.options.findIndex((item) => item.value === this.value); return found < 0 ? 0 : found; }
  appendChild(child) { this.children.push(child); if (this.tagName === 'SELECT') this.options.push(child); return child; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatchEvent(event) { event.target = this; (this.listeners[event.type] || []).forEach((fn) => fn.call(this, event)); }
  closest(selector) { if (selector !== '.form-group') return null; return this.formGroup ||= new Node(); }
  querySelector(selector) { return selector === '.causality-chip--active' ? this.children.find((child) => child.classList.contains('causality-chip--active')) || null : null; }
  querySelectorAll(selector) { return selector === '.causality-chip' ? this.children : []; }
}

const nodes = new Map();
const node = (id, tag = 'div') => { if (!nodes.has(id)) nodes.set(id, new Node(tag)); return nodes.get(id); };
const selects = [
  'fhSegLineaPrincipal', 'fhSegDispensado', 'fhSegTipoRelacionTerapia', 'fhSegOptimiza', 'fhSegNuevaPauta', 'fhSegMotivoOpt', 'fhSegSuspension', 'fhSegMotivoSusp',
  'fhSegVia', 'fhSegPautaActual', 'fhSegProms', 'fhSeguimientoEaPresente', 'fhSeguimientoEaGravedad', 'fhSeguimientoEaResuelto', 'fhSeguimientoEaCorregido', 'fhSeguimientoEaFarmacoSospechoso', 'fhCausalidadFinal'
];
selects.forEach((id) => node(id, 'select'));
const addOptions = (id, values) => values.forEach((value) => { const option = new Node('option'); option.value = value; option.textContent = value; node(id).appendChild(option); });
addOptions('fhSegOptimiza', ['No', 'Sí']); addOptions('fhSegSuspension', ['No', 'Sí']);
addOptions('fhSegMotivoOpt', ['No aplica', 'Respuesta clínica adecuada', 'Respuesta insuficiente', 'Ajuste por peso', 'Efecto adverso', 'Adherencia', 'Criterio farmacoterapéutico', 'Otro']);
addOptions('fhSegMotivoSusp', ['No aplica', 'Efecto adverso', 'Falta de eficacia', 'Decisión clínica', 'Preferencia paciente', 'Problema de adherencia', 'Otro']);
[
  'fhSegNuevaDosis', 'fhSegNuevaPautaOtro', 'fhSegObservacionesLinea', 'fhSegEstadoLinea', 'fhSegLineCards', 'fhSegTratamientoGrid', 'fhSegMoriskyResultado', 'fhSegLineEditorHelp',
  'fhSegExportTxt', 'fhSegExportCsv', 'fhSegExcelExportBtn', 'fhSegDispenseExportNotice', 'fhSegFarmaco', 'fhSegPrincipioActivo', 'fhSegPresentacion', 'fhSegDosisActual', 'fhSegFechaInicio',
  'fhSegCimaContextPrincipioActivo', 'fhSegCodigoNacional', 'fhSegNregistro', 'fhSegEtiquetas', 'fhSegOrigenCatalogo', 'fhSegCip', 'fhSegFecha', 'fhSegServicio', 'fhSegPatologia', 'currentProfessional',
  'fhSeguimientoEaObservaciones', 'fhSeguimientoEaSuspectCandidates', 'fhSeguimientoEaFarmacoRow', 'fhSeguimientoEaGravedadRow', 'fhSeguimientoEaResueltoRow', 'fhSeguimientoEaCorregidoRow',
  'fhSeguimientoEaObservacionesRow', 'fhSeguimientoEaNoCausalidad', 'fhSeguimientoEaActivationNotice', 'naranjoScore', 'naranjoCategoria', 'klCategoria', 'resumenNaranjo', 'resumenKl',
  'modSeguimientoCausalidad', 'modNaranjo', 'modKarchLasagna', 'modResumenCausalidad', 'segOtrosFarmacosList', 'segOtrosFarmacosEmpty'
].forEach((id) => node(id));
node('fhSeguimientoEaPresente').value = 'no_consta'; node('fhSeguimientoEaResuelto').value = 'no_consta'; node('fhSeguimientoEaCorregido').value = 'no_consta'; node('fhCausalidadFinal').value = 'No evaluada';

const controls = ['fhSegTipoRelacionTerapia', 'fhSegOptimiza', 'fhSegNuevaDosis', 'fhSegNuevaPauta', 'fhSegNuevaPautaOtro', 'fhSegMotivoOpt', 'fhSegSuspension', 'fhSegMotivoSusp', 'fhSegObservacionesLinea'];
const defaults = ['sin_cambios', 'No', '', '', '', 'No aplica', 'No', 'No aplica', ''];
controls.forEach((id, index) => { node(id).value = defaults[index]; });
const groups = new Map();
[...Array(10)].map((_, i) => `naranjoQ${i + 1}`).concat(['klTemporal', 'klConocido', 'klAlternativa', 'klSuspendido', 'klMejoraRetirada', 'klReadministracion', 'klReaparece']).forEach((id) => {
  const group = new Node(); group.setAttribute('data-answer-id', id);
  const values = id.startsWith('naranjo') ? ['si', 'no', 'desconocido'] : ['si', 'no', 'no_se_sabe', 'no_aplica'];
  values.forEach((value) => { const chip = new Node('button'); chip.classList.add('causality-chip'); chip.setAttribute('data-value', value); if (value === (id.startsWith('naranjo') ? 'desconocido' : 'no_se_sabe')) chip.classList.add('causality-chip--active'); group.appendChild(chip); });
  groups.set(id, group);
});
const descendants = (item) => [item, ...(item.children || []).flatMap(descendants)];
const rendered = () => [...nodes.values()].flatMap(descendants);
const documentListeners = {};
const document = {
  addEventListener(type, fn) { (documentListeners[type] ||= []).push(fn); }, createElement: (tag) => new Node(tag), createTextNode: (text) => ({ textContent: text }), getElementById: (id) => nodes.get(id) || null,
  querySelector(selector) { const answer = selector.match(/data-answer-id="([^"]+)"/)?.[1]; if (answer) return groups.get(answer); const uid = selector.match(/data-uid="([^"]+)"/)?.[1]; const field = selector.match(/data-field="([^"]+)"/)?.[1]; return rendered().find((item) => (!uid || item.getAttribute?.('data-uid') === uid) && (!field || item.getAttribute?.('data-field') === field)) || null; },
  querySelectorAll(selector) { if (selector.includes('data-answer-id^="naranjo"')) return [...groups.entries()].filter(([id]) => id.startsWith('naranjo')).map(([, group]) => group); if (selector.includes('data-answer-id^="kl"')) return [...groups.entries()].filter(([id]) => id.startsWith('kl')).map(([, group]) => group); if (selector === '.causality-chip-group .causality-chip') return [...groups.values()].flatMap((group) => group.children); return []; }
};
const F = { getQueryContext: () => ({}), insertNoCipBanner() {}, clearChildren(el) { if (el) { el.children = []; el.options = []; } }, setText(id, value) { node(id).textContent = value || ''; }, setValue(id, value) { const el = nodes.get(id); if (el) el.value = value || ''; }, renderFields() {} };
const sandbox = { window: { FarmaciaDemo: F, confirm: () => true }, document, console, Event: function Event(type) { this.type = type; }, setTimeout, clearTimeout };
vm.createContext(sandbox);
['scripts/farmacia_pautas_catalog.js', 'scripts/farmacia_excel_row_export.js', 'scripts/farmacia_seguimiento.js'].forEach((file) => vm.runInContext(read(file), sandbox));
(documentListeners.DOMContentLoaded || []).forEach((fn) => fn());
const api = sandbox.window.FarmaciaSeguimiento;
check(['fhSegOptimiza', 'fhSegSuspension', 'fhSegNuevaPauta'].every((id) => (node(id).listeners.change || []).length > 0), 'VM executes real DOMContentLoaded and installs productive visible-control listeners');
const columns = sandbox.window.FarmaciaExcelRowExport.WO8_COLUMNS;
const at = (row, name) => row[columns.indexOf(name)];
const setVisible = (values) => Object.entries(values).forEach(([id, value]) => { const el = node(id); if (el.tagName === 'SELECT' && el.options.length && !el.options.some((option) => option.value === value)) throw new Error(`Unsupported select value ${id}: ${value}`); el.value = value; el.dispatchEvent(new sandbox.Event('change')); });
const rows = () => api.buildFollowupExcelRows(api.buildFollowupVisitExportModel());
const modelSource = (js.match(/function buildFollowupVisitExportModel[\s\S]*?function lineControl/) || [''])[0];
check(modelSource.includes('captureEditingLineState();') && !/setEditingLine|setCausalityEditor|click\(/.test(modelSource), 'static: export captures the visible editors without traversing hidden state');
check(columns.length === 61 && js.includes('return [exp.WO8_COLUMNS].concat(buildFollowupExcelRows(model))'), 'static: canonical WO8 columns and shared CSV row builder remain');

const patient = { cip: 'CIP-SYNTHETIC-170', servicio: 'Reumatología', patologia: 'LES', biologicos: [
  { linea_id: 'LINE-A', nombre_comercial: 'Demo A', dosis: '10 mg', via: 'SC', pauta_codigo: 'DIARIA', pauta_label: 'Diaria', estado_linea: 'activo', tipo_relacion: 'principal' },
  { linea_id: 'LINE-B', nombre_comercial: 'Demo B', dosis: '20 mg', via: 'IV', pauta_codigo: 'MENSUAL', pauta_label: 'Mensual', estado_linea: 'activo', tipo_relacion: 'adicional' }
] };
api.syncLinesForPatient(patient); api.toggleLineSelection('LINE-A', true); api.toggleLineSelection('LINE-B', true);
let jara = api.buildSegLines().join('\n');
check(jara.includes('ID línea: LINE-A') && jara.includes('ID línea: LINE-B') && rows().length === 0 && api.buildFollowupCsv(api.buildFollowupVisitExportModel()).split('\n').length === 1, 'a two evaluated, zero dispensed: JARA has both and row exports have no data');

api.setLineDispensed('LINE-A', true); api.setLineDispensed('LINE-B', true);
let output = rows();
check(output.length === 2 && at(output[0], 'visita_id') === at(output[1], 'visita_id') && at(output[0], 'linea_id') !== at(output[1], 'linea_id'), 'b setLineDispensed creates two distinct rows sharing visit_id');

api.setEaPresent('si'); api.refreshEaCandidates(); api.toggleEaSuspect('line:LINE-A', true); api.toggleEaSuspect('line:LINE-B', true);
check(api.buildFollowupVisitExportModel().causalities.length === 2 && rows().length === 2, 'c public EA APIs keep multiple suspects isolated without extra rows');

const model = api.buildFollowupVisitExportModel(); jara = api.buildSegLines().join('\n'); output = rows();
const expectedIds = 'line:LINE-A | line:LINE-B'; const expectedLabels = 'Demo A — Biológico activo | Demo B — Biológico activo'; const expectedUnevaluated = 'line:LINE-A: No evaluada | line:LINE-B: No evaluada';
check(model.causalities.every((item) => item.evaluated === false) && output.every((row) => at(row, 'farmaco_sospechoso_id') === expectedIds && at(row, 'farmaco_sospechoso_nombre') === expectedLabels && at(row, 'causalidad_naranjo') === expectedUnevaluated && at(row, 'causalidad_karch') === expectedUnevaluated) && jara.match(/No evaluada/g)?.length >= 2 && !output.some((row) => at(row, 'causalidad_naranjo').includes('0 · Dudosa') || at(row, 'causalidad_karch').includes('No clasificable')), 'd false means No evaluada while real columns retain exact IDs, labels and explicit aggregates');

api.selectLineById('LINE-A'); setVisible({ fhSegOptimiza: 'Sí', fhSegNuevaDosis: '15 mg', fhSegNuevaPauta: 'SEMANAL', fhSegMotivoOpt: 'Adherencia', fhSegSuspension: 'Sí', fhSegMotivoSusp: 'Efecto adverso' }); api.captureEditingLineState();
output = rows(); const rowA = output.find((row) => at(row, 'linea_id') === 'LINE-A'); const rowB = output.find((row) => at(row, 'linea_id') === 'LINE-B'); jara = api.buildSegLines().join('\n');
check(at(rowA, 'dosis_presentacion') === '15 mg' && at(rowA, 'pauta_codigo') === 'SEMANAL' && at(rowA, 'pauta_label') === 'Semanal' && at(rowA, 'motivo_inicio_cambio_suspension') === 'Adherencia | Efecto adverso' && at(rowB, 'dosis_presentacion') === '20 mg' && jara.includes('Dosis: 15 mg') && jara.includes('Pauta: Semanal') && jara.includes('Motivo suspensión: Efecto adverso'), 'e visible Optimización/Suspensión Sí expose valid line-specific therapy and both motives');

api.selectLineById('LINE-B'); setVisible({ fhSegOptimiza: 'Sí', fhSegNuevaDosis: '999 mg', fhSegNuevaPauta: 'SEMANAL', fhSegMotivoOpt: 'Criterio farmacoterapéutico', fhSegSuspension: 'Sí', fhSegMotivoSusp: 'Decisión clínica' }); setVisible({ fhSegOptimiza: 'No', fhSegSuspension: 'No' }); api.captureEditingLineState();
output = rows(); const canonicalB = output.find((row) => at(row, 'linea_id') === 'LINE-B'); jara = api.buildSegLines().join('\n'); const jaraB = (jara.match(/ID línea: LINE-B[\s\S]*?Adherencia Morisky-Green/) || [''])[0];
check(at(canonicalB, 'dosis_presentacion') === '20 mg' && at(canonicalB, 'pauta_codigo') === 'MENSUAL' && at(canonicalB, 'pauta_label') === 'Mensual' && at(canonicalB, 'motivo_inicio_cambio_suspension') === '' && node('fhSegNuevaDosis').formGroup.classList.contains('hidden') && node('fhSegMotivoSusp').formGroup.classList.contains('hidden') && jaraB.includes('Dosis: 20 mg') && jaraB.includes('Pauta: Mensual') && !jaraB.includes('999 mg') && !jaraB.includes('Semanal') && !jaraB.includes('Criterio farmacoterapéutico') && !jaraB.includes('Decisión clínica'), 'f real visible Sí→No listeners hide retained values/motives and JARA returns to canonical therapy');

api.selectLineById('LINE-A'); setVisible({ fhSegOptimiza: 'Sí', fhSegNuevaPauta: 'OTRO', fhSegNuevaPautaOtro: 'Cada 17 días' }); api.captureEditingLineState();
const otherPauta = rows().find((row) => at(row, 'linea_id') === 'LINE-A');
check(at(otherPauta, 'pauta_codigo') === 'OTRO' && at(otherPauta, 'pauta_label') === 'Otra pauta' && at(otherPauta, 'pauta_otro_texto') === 'Cada 17 días', 'g OTRO retains the explicit visible free text');

api.addFollowupOtherDrug(); const uid = api.getFollowupOtherDrugs()[0].uid;
check(uid && rows().length === 2 && !rows().some((row) => at(row, 'linea_id') === `other:${uid}`), 'h API-created other:<uid> treatment never creates a row');

const helper = (js.match(/function resolveLineTherapeuticOutput[\s\S]*?function buildAggregatedAdverseEvent/) || [''])[0];
check(helper && !/document|byId|fv\(/.test(helper), 'therapeutic resolver is pure per line and does not read DOM');
console.log(`\nPR57D issue #170: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
