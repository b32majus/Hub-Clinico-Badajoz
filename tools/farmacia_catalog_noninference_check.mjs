#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    console.log(`  PASS ${label}: ${JSON.stringify(expected)}`);
    passed++;
  } else {
    console.log(`  FAIL ${label}: esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assert(condition, label) {
  assertEqual(Boolean(condition), true, label);
}

function element(tag = 'input') {
  const listeners = {};
  return {
    tagName: tag.toUpperCase(), value: '', textContent: '', children: [], options: [], checked: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(child) { this.children.push(child); if (child.tagName === 'OPTION') this.options.push(child); },
    append(...children) { children.forEach((child) => this.appendChild(child)); },
    addEventListener(type, listener) { listeners[type] = listener; },
    dispatchEvent(event) { if (listeners[event.type]) listeners[event.type].call(this, event); },
    click() { if (listeners.click) listeners.click.call(this, { target: this }); },
    querySelector() { return null; }, querySelectorAll() { return []; }, contains() { return false; },
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; }, closest() { return null; }
  };
}

function loadSource(file, injection = '') {
  const source = fs.readFileSync(path.join(ROOT, 'scripts', file), 'utf8');
  const end = source.lastIndexOf('})();');
  return end >= 0 ? source.slice(0, end) + injection + source.slice(end) : source;
}

const values = new Map();
const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
const elements = new Map();
const rendered = [];
const context = { cip: 'CIP-SYN-01', tipo_relacion: '', estado_linea: '', tipo_movimiento: '', patient: null };
function byId(id) {
  if (!elements.has(id)) elements.set(id, element(id.includes('Dropdown') || id.includes('Grid') ? 'div' : 'input'));
  return elements.get(id);
}
const F = {
  getQueryContext: () => context,
  setValue: (id, value) => { byId(id).value = value || ''; },
  setText: (id, value) => { byId(id).textContent = value || ''; },
  clearChildren: (target) => { if (target) { target.children = []; target.options = []; } },
  renderFields: (target, fields) => { rendered.push({ target, fields }); },
  insertNoCipBanner() {}, isEnfermeriaPatient: () => false, downloadFile() {}
};
const sandbox = {
  window: {
    FarmaciaDemo: F,
    FarmaciaDataSource: { ready: Promise.resolve(), getPersons: () => [], getActsByPatientId: () => [], getValidationsByPatientId: () => [], getTreatmentLinesByPatientId: () => [], getVisitsByPatientId: () => [], getFollowupsByPatientId: () => [], getAdverseEventsByPatientId: () => [] },
    sessionStorage: storage, localStorage: storage
  },
  document: { addEventListener() {}, getElementById: byId, createElement: element, createTextNode: (text) => ({ textContent: text, tagName: '#TEXT' }), querySelector: () => null, querySelectorAll: () => [], activeElement: null, head: element('head'), documentElement: element('html'), body: element('body') },
  sessionStorage: storage, localStorage: storage, URLSearchParams, console, setTimeout, clearTimeout,
  Event: function Event(type) { this.type = type; }, CustomEvent: function CustomEvent(type) { this.type = type; }, Array
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'scripts/farmacia_common.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'scripts/farmacia_pautas_catalog.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'scripts/farmacia_tratamiento_common.js'), 'utf8'), sandbox);
const catalog = sandbox.window.FarmaciaCatalog;
const catalogCalls = [];
const realSelectDrug = catalog.selectDrug;
catalog.selectDrug = (drug, selectionContext) => {
  const snapshot = realSelectDrug(drug, selectionContext);
  catalogCalls.push(snapshot);
  return snapshot;
};

vm.runInContext(loadSource('farmacia_primera_visita.js', '\nwindow.__catalogPv = { selectDrugPV, applyTratamientoValidado, getCurrentPrimaryTreatment };\n'), sandbox);
vm.runInContext(loadSource('farmacia_validacion.js', '\nwindow.__catalogValidation = { selectDrug, selectValidadoDrug, updateValidationModuleSummaries, updateValidadoSummary };\n'), sandbox);
vm.runInContext(loadSource('farmacia_seguimiento.js', '\nwindow.__catalogSeguimiento = { selectDrugSeg, applySelectedBiologicLine, getSnapshotMetaForExportSeg, setState: function (patient, lines) { currentSegPatient = patient; currentBiologicLines = lines; } };\n'), sandbox);

const drug = { display_name: 'Marca catálogo 15 mg', nombre_comercial: 'Marca catálogo', principio_activo: 'Principio catálogo', dosis: '15 mg', nombre_presentacion: 'Pluma CIMA', via: 'SC', pauta: 'Cada 2 semanas', induccion: 'Sí', source_type: 'CIMA', drug_id: 'CIMA-SYN-01', codigo_nacional: '123456', nregistro: 'REG-01' };
console.log('\n=== Primera Visita: interacción productiva ===');
byId('fhPvCip').value = 'CIP-SYN-01';
byId('fhPvDosis').value = '30 mg profesional';
byId('fhPvVia').value = 'Oral';
byId('fhPvPauta').value = 'CADA_4_SEMANAS';
byId('fhPvFecha').value = '2026-07-18';
byId('fhPvInduccionRealizada').value = 'No';
sandbox.window.__catalogPv.selectDrugPV(drug);
sandbox.window.__catalogPv.applyTratamientoValidado(context);
const pv = sandbox.window.__catalogPv.getCurrentPrimaryTreatment(context);
assertEqual(catalogCalls.at(-1).context.slot, 'primera_visita.tratamiento', 'PV usa slot aprobado');
assertEqual(pv.dosis_texto, '30 mg profesional', 'PV conserva dosis profesional tras rerender');
assertEqual(pv.via, 'Oral', 'PV conserva vía profesional tras rerender');
assertEqual(pv.pauta, 'Cada 4 semanas', 'PV conserva pauta profesional tras rerender');
assertEqual(pv.tipo_relacion, '', 'PV no crea relación');
assertEqual(pv.estado_linea, '', 'PV no crea estado');
assertEqual(pv.es_validado_farmacia, false, 'PV no crea validación');
assert(byId('fhPvTratamientoGrid').children.length > 0, 'PV ejecuta renderFields real');

console.log('\n=== Validación: solicitado y validado reales ===');
['fhManualFarmaco', 'fhManualPrincipioActivo', 'fhManualDosis', 'fhManualVia', 'fhManualPauta', 'fhManualPautaOtro', 'fhManualInduccion', 'fhManualJustificacion', 'fhHSMotivoClinico', 'fhValidadoFarmaco', 'fhValidadoPrincipioActivo', 'fhValidadoPresentacion', 'fhValidadoDosis', 'fhValidadoVia', 'fhValidadoPauta', 'fhValidadoPautaOtro', 'fhValidadoInduccion', 'fhValidadoJustificacion'].forEach(byId);
byId('fhManualDosis').value = '40 mg manual'; byId('fhManualVia').value = 'Oral'; byId('fhManualPauta').value = 'CADA_4_SEMANAS';
byId('fhValidadoDosis').value = '50 mg manual'; byId('fhValidadoPresentacion').value = 'Presentación manual'; byId('fhValidadoVia').value = 'IV'; byId('fhValidadoPauta').value = 'CADA_8_SEMANAS'; byId('fhValidadoInduccion').value = 'no';
sandbox.window.__catalogValidation.selectDrug(drug);
assertEqual(catalogCalls.at(-1).context.slot, 'validacion.solicitado', 'Validación solicitada usa slot aprobado');
assertEqual(byId('fhManualDosis').value, '40 mg manual', 'Solicitado conserva dosis manual');
assertEqual(byId('fhManualVia').value, 'Oral', 'Solicitado conserva vía manual');
assertEqual(byId('fhManualPauta').value, 'CADA_4_SEMANAS', 'Solicitado conserva pauta manual');
assertEqual(byId('fhValidadoFarmaco').value, '', 'Solicitado no se convierte en validado');
sandbox.window.__catalogValidation.selectValidadoDrug(drug);
sandbox.window.__catalogValidation.updateValidationModuleSummaries();
sandbox.window.__catalogValidation.updateValidadoSummary();
assertEqual(catalogCalls.at(-1).context.slot, 'validacion.validado', 'Validación validada usa slot aprobado');
assertEqual(byId('fhValidadoDosis').value, '50 mg manual', 'Validado conserva dosis manual');
assertEqual(byId('fhValidadoPresentacion').value, 'Presentación manual', 'Validado conserva presentación manual');
assertEqual(byId('fhValidadoVia').value, 'IV', 'Validado conserva vía manual');
assertEqual(byId('fhValidadoPauta').value, 'CADA_8_SEMANAS', 'Validado conserva pauta manual');
assertEqual(byId('fhValidadoInduccion').value, 'no', 'Validado conserva inducción manual');
assertEqual(byId('fhResultadoValidacion').value, '', 'Validado no crea resultado profesional');

console.log('\n=== Seguimiento: interacción y exportación productivas ===');
const line = { linea_id: 'L-SYN-01', tratamiento_id: 'T-SYN-01', farmaco_nombre: 'Tratamiento manual', principio_activo: 'Principio manual', dosis_texto: '60 mg manual', presentacion: 'Presentación manual', via: 'Oral', pauta: 'Cada 4 semanas', tipo_relacion: 'validado', estado_linea: 'activo', tipo_movimiento: 'revision_linea', es_principal: true };
sandbox.window.__catalogSeguimiento.setState({ cip: 'CIP-SYN-01' }, [line]);
byId('fhSegCip').value = 'CIP-SYN-01'; byId('fhSegDosisActual').value = '60 mg manual'; byId('fhSegPresentacion').value = 'Presentación manual'; byId('fhSegVia').value = 'Oral'; byId('fhSegPautaActual').value = 'CADA_4_SEMANAS'; byId('fhSegTipoRelacionTerapia').value = 'revision_linea';
sandbox.window.__catalogSeguimiento.selectDrugSeg(drug);
sandbox.window.__catalogSeguimiento.applySelectedBiologicLine();
assertEqual(catalogCalls.at(-1).context.slot, 'seguimiento.tratamiento', 'Seguimiento usa slot aprobado');
assertEqual(catalogCalls.at(-1).context.linea_id, 'L-SYN-01', 'Seguimiento persiste línea');
assertEqual(byId('fhSegDosisActual').value, '60 mg manual', 'Seguimiento conserva dosis actual');
assertEqual(byId('fhSegPresentacion').value, 'Presentación manual', 'Seguimiento conserva presentación actual');
assertEqual(byId('fhSegVia').value, 'Oral', 'Seguimiento conserva vía actual');
assertEqual(byId('fhSegPautaActual').value, 'CADA_4_SEMANAS', 'Seguimiento conserva pauta actual');
assertEqual(byId('fhSegTipoRelacionTerapia').value, 'revision_linea', 'Seguimiento no crea movimiento');
assertEqual(sandbox.window.__catalogSeguimiento.getSnapshotMetaForExportSeg().selected_drug_id, 'CIMA-SYN-01', 'Seguimiento exporta identidad contextual');
assertEqual(catalog.getSnapshot({ ...catalogCalls.at(-1).context, linea_id: 'L-OTHER' }), null, 'Seguimiento rechaza snapshot de otra línea');
assertEqual(storage.getItem('farmacia_drug_snapshot'), null, 'Seguimiento limpia snapshot incompatible');

console.log('\n=== Identidad y legacy ===');
const helper = sandbox.window.FarmaciaTratamiento;
const second = helper.buildTreatmentFromCatalogSelection({ display_name: 'Segundo medicamento' }, { selected_drug_id: 'OLD', codigo_nacional: 'OLD-CN', nregistro: 'OLD-REG', source_type: 'CIMA' });
assertEqual(second.selected_drug_id, '', 'Segunda selección vacía ID anterior');
assertEqual(second.codigo_nacional, '', 'Segunda selección vacía código anterior');
assertEqual(second.nregistro, '', 'Segunda selección vacía registro anterior');
assertEqual(helper.buildTreatmentSnapshot({ nombre_snapshot: 'Legacy', dosis_presentacion: '90 mg', via_snapshot: 'IV' }).dosis_texto, '', 'Legacy explícito aporta solo identidad');
values.set('farmacia_drug_snapshot', JSON.stringify({ selected_drug_id: 'LEGACY', dosis_presentacion: '90 mg' }));
assertEqual(catalog.getSnapshot({ slot: 'primera_visita.tratamiento', paciente_cip: 'CIP-SYN-01', tratamiento_id: '', linea_id: '' }), null, 'Legacy implícito se rechaza');
assertEqual(helper.buildTreatmentSnapshot({ snapshot_kind: 'clinical_treatment', dosis_presentacion: '90 mg', via_snapshot: 'IV' }).via, '', 'clinical_treatment no registrado no obtiene privilegios');
assertEqual(helper.buildTreatmentSnapshot({ snapshot_kind: 'clinical_treatmnt', dosis_presentacion: '90 mg' }).dosis_texto, '', 'Typo no obtiene privilegios');

console.log(`\nTotal: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
