#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'farmacia_validacion.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_validacion.js'), 'utf8');

let passed = 0;
let failed = 0;

function check(condition, label) {
  if (condition) {
    console.log('  ✓ ' + label);
    passed++;
  } else {
    console.log('  ✗ ' + label);
    failed++;
  }
}

function tagById(id) {
  const match = html.match(new RegExp('<[^>]+id=["\']' + id + '["\'][^>]*>', 'i'));
  return match ? match[0] : '';
}

function elementById(id) {
  const match = html.match(new RegExp('<([a-z0-9]+)[^>]+id=["\']' + id + '["\'][^>]*>[\\s\\S]*?<\\/\\1>', 'i'));
  return match ? match[0] : '';
}

function optionByValue(value) {
  const match = html.match(new RegExp('<option[^>]+value=["\']' + value + '["\'][^>]*>', 'i'));
  return match ? match[0] : '';
}

console.log('\n=== Validación FH — limpieza funcional mínima ===');

const originSelect = tagById('fhOrigenEntrada');
check(originSelect !== '', 'Control de origen se conserva');
check(/value=["']manual_farmacia["']/.test(html), 'Origen manual Farmacia se conserva');
check(/value=["']excel_enfermeria["']/.test(html), 'Origen contextual de Enfermería se conserva');
check(/hidden|disabled/.test(optionByValue('servicio_clinico_compatible')), 'Origen futuro no se ofrece como opción operativa');
check(/hidden|disabled/.test(optionByValue('demo_formacion')), 'Origen de formación no se ofrece como opción operativa');
check(js.includes('origenSel.addEventListener("change"'), 'Handler de cambio de origen se conserva');
check(js.includes('mostrarFormulario(this.value)'), 'Flujo manual sigue conectado al selector de origen');

check(!/hidden/.test(tagById('modPrebiologico')), 'Bloque prebiológico canónico permanece visible');
check(/hidden/.test(tagById('upperPrebioChips')), 'Duplicado superior de chips queda oculto');
check(/hidden/.test(tagById('upperPrebioGlobalStatus')), 'Resumen prebiológico superior queda oculto');
check(js.includes("replace('pbChip', 'upperPbChip')"), 'Sincronización del duplicado superior se conserva');

check(!html.includes('Profesional FH-01'), 'La pantalla no presenta una identidad profesional nominal');
check(html.includes('Profesional FH demo — identidad no nominal'), 'Responsable se identifica como demo no nominal');
check(html.includes('No constituye firma electrónica ni controla permisos'), 'Responsable aclara ausencia de firma y permisos');

check(elementById('fhValExportTxt').includes('Copiar texto para JARA'), 'Botón JARA comunica copia manual');
check(elementById('fhValExcelExportBtn').includes('Copiar fila Excel FH'), 'Botón Excel conserva copia de fila FH');
check(html.includes('Copia manual; no integración automática'), 'Exportación aclara que no existe integración automática');
check(js.includes('byId("fhValExportTxt").addEventListener("click"'), 'Handler JARA se conserva');
check(/fhValExcelExportBtn["'][\s\S]{0,120}addEventListener\(["']click["']/.test(js), 'Handler Excel se conserva');
check(elementById('btnValidateRequestedSame').includes('Validar tratamiento solicitado sin cambios'), 'Copia solicitado→validado usa el texto operativo exacto');
check(/id=["']fhValidatedTreatmentRelation["'][\s\S]*value=["']same_as_requested["'][\s\S]*value=["']modified_from_requested["'][\s\S]*value=["']no_treatment_validated["']/.test(html), 'Relación validada ofrece los tres valores canónicos');
check(elementById('fhValidatedTreatmentRelation').includes('<option value="no_treatment_validated">No se valida tratamiento</option>'), 'No tratamiento validado usa el texto exacto');
check(html.includes('<label for="fhValPendingReason">Motivo / información pendiente</label>'), 'Motivo pendiente usa la etiqueta exacta y separada');
const denialReasonRow = elementById('fhValMotivoRow');
check(tagById('fhValMotivo') !== '', 'Motivo de denegación conserva fhValMotivo');
check(denialReasonRow.includes('<label for="fhValMotivo">Motivo de denegación</label>'), 'Motivo de denegación conserva la etiqueta exacta');
check(!/\brequired\b/i.test(denialReasonRow), 'Motivo de denegación no se presenta como obligatorio');
check(html.includes('Selección de catálogo con propuesta regulatoria editable por Farmacia') && !html.includes('Precargado desde catalogo'), 'Badge describe selección/propuesta editable sin afirmar precarga');
check(!js.includes('function updateValidadoSummary'), 'No existe precarga automática de tratamiento validado');
for (const id of ['fhManualInduccion', 'fhDermaInduccion', 'fhValidadoInduccion']) {
  const markup = (html.match(new RegExp('<select[^>]+id=["\\\']' + id + '["\\\'][^>]*>[\\s\\S]*?<\\/select>', 'i')) || [''])[0];
  check(/<option value=["']?["']>No informado<\/option>/.test(markup), id + ' comienza sin valor clínico por defecto');
}
check(/farmacia_export_v2_core\.js\?v=2\.0\.0-draft\.1[\s\S]*farmacia_export_v2_validation_adapter\.js\?v=1\.0\.0-draft\.1[\s\S]*farmacia_validacion\.js/.test(html), 'Core y adaptador v2 cargan antes del controlador DOM');
check(!/id=["'][^"']*(?:Export|Download)[^"']*v2/i.test(html), 'No se activa botón o descarga pública v2');

check(/fhReumaFarmaco["'], explicitRequestedDrug\(patient\)/.test(js), 'Vista Reuma usa solo fármaco solicitado explícito');
const requestedSummary = js.match(/function requestedTreatmentSummary\(\)[\s\S]*?\n    \}/);
check(Boolean(requestedSummary) && requestedSummary[0].includes('explicitRequestedDrug(p)'), 'Resumen solicitado usa fármaco solicitado explícito');
check(Boolean(requestedSummary) && !/p\.farmaco(?!_solicitado)/.test(requestedSummary[0]), 'Resumen solicitado no usa patient.farmaco genérico');
const explicitRequested = js.match(/function explicitRequestedDrug\(patient\)[\s\S]*?\n    \}/);
check(Boolean(explicitRequested) && explicitRequested[0].includes('rawImport.farmaco_solicitado'), 'Solicitud explícita admite el shape real del importador');
check(Boolean(explicitRequested) && !/patient\.farmaco(?!_solicitado)/.test(explicitRequested[0]), 'Solicitud explícita nunca cae en patient.farmaco genérico');

const htmlIds = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
check(new Set(htmlIds).size === htmlIds.length, 'HTML de Validación no contiene IDs duplicados');
check(/<select[^>]+id=["']fhManualVia["']/.test(html) && /<select[^>]+id=["']fhDermaVia["']/.test(html), 'Vías solicitadas son selects canónicos');
['fhManualVia', 'fhDermaVia', 'fhValidadoVia'].forEach((id) => {
  const markup = (html.match(new RegExp('<select[^>]+id=["\']' + id + '["\'][\\s\\S]*?<\\/select>', 'i')) || [''])[0];
  const labels = [...markup.matchAll(/<option[^>]*>([^<]*)<\/option>/g)].map((match) => match[1].trim());
  check(JSON.stringify(labels) === JSON.stringify(['Seleccionar…', 'SC', 'IV', 'Oral', 'IM', 'Otra']), id + ' usa exactamente las rutas canónicas');
});

class FakeClassList {
  constructor(initial = '') { this.values = new Set(String(initial).split(/\s+/).filter(Boolean)); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) { const next = force === undefined ? !this.contains(value) : force; next ? this.add(value) : this.remove(value); return next; }
}
class FakeElement {
  constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.value = ''; this.textContent = ''; this.children = []; this.listeners = {}; this.dataset = {}; this.options = []; this.classList = new FakeClassList(); }
  set className(value) { this._className = value; this.classList = new FakeClassList(value); }
  get className() { return this._className || ''; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatchEvent(event) { event.target = this; event.currentTarget = this; (this.listeners[event.type] || []).forEach((handler) => handler.call(this, event)); }
  click() { this.dispatchEvent({ type: 'click', preventDefault() {} }); }
  appendChild(child) { this.children.push(child); if (this.tagName === 'SELECT') this.options.push(child); return child; }
  querySelectorAll(selector) { return selector === '.autocomplete-item' ? this.children.filter((child) => child.classList.contains('autocomplete-item')) : []; }
  contains(node) { return node === this || this.children.some((child) => child.contains && child.contains(node)); }
  setAttribute(name, value) { this[name] = String(value); }
}
const dom = new Map();
function addElement(id, tag = 'input') { const element = new FakeElement(tag); element.id = id; dom.set(id, element); return element; }
[
  'fhOrigenEntrada', 'fhManualCip', 'fhManualFarmaco', 'fhManualPrincipioActivo', 'fhManualDosis', 'fhManualVia', 'fhManualPauta', 'fhManualPautaOtro', 'fhManualInduccion', 'fhManualJustificacion',
  'fhDermaCip', 'fhDermaFarmaco', 'fhDermaPrincipioActivo', 'fhDermaDosis', 'fhDermaVia', 'fhDermaPauta', 'fhDermaPautaOtro', 'fhDermaInduccion', 'fhDermaJustificacion', 'fhHSMotivoClinico'
].forEach((id) => addElement(id, /Via|Pauta|Induccion|Origen/.test(id) ? 'select' : 'input'));
addElement('autocompleteDropdown', 'div').classList.add('hidden');
addElement('fhManualAutocompleteDropdown', 'div').classList.add('hidden');
['fhManualVia', 'fhDermaVia'].forEach((id) => { dom.get(id).options = ['', 'SC', 'IV', 'Oral', 'IM', 'Otra'].map((value) => ({ value, text: value, textContent: value })); });
const snapshots = new Map();
const persistenceCalls = { getSnapshot: 0, selectDrug: 0 };
const products = [
  { drug_id: 'CIMA-SYN-A', source_type: 'CIMA', display_name: 'Marca sintética A', nombre_comercial: 'Marca sintética A', nombre_presentacion: 'Marca sintética A 300 mg vial', principio_activo: 'Activo A', dosis: '300 mg', via: 'IV', codigo_nacional: '700001' },
  { drug_id: 'CIMA-SYN-B', source_type: 'CIMA', display_name: 'Marca sintética B', nombre_comercial: 'Marca sintética B', nombre_presentacion: 'Marca sintética B 120 mg jeringa', principio_activo: 'Activo B', dosis: '120 mg', via: 'VÍA INTRAMUSCULAR', codigo_nacional: '700002' }
];
const catalog = {
  loaded: true,
  search: () => products,
  isConcreteCatalogSelection: (drug) => Boolean(drug && drug.drug_id && drug.nombre_presentacion),
  snapshotContextKey: (ctx) => ctx && ctx.slot && ctx.cip ? `${ctx.slot}|${ctx.cip}` : '',
  getSnapshot: (ctx) => { persistenceCalls.getSnapshot++; return snapshots.get(`${ctx.slot}|${ctx.cip}`) || null; },
  mapCatalogViaToSelect: (value) => /intramus/i.test(value) ? 'IM' : (/^IV$/i.test(value) ? 'IV' : (/subcut|^SC$/i.test(value) ? 'SC' : (/oral|^VO$/i.test(value) ? 'Oral' : (value ? 'Otra' : '')))),
  reconcileCatalogSelection(current, previous, drug) {
    const prior = previous?.proposal_values || {};
    const canApply = (field) => !current[field] || current[field] === prior[field];
    const values = { ...current, farmaco_nombre: drug.display_name || drug.nombre_comercial || drug.principio_activo, principio_activo: drug.principio_activo };
    const proposal_values = {};
    if (canApply('dosis_texto')) { values.dosis_texto = drug.dosis || ''; if (drug.dosis) proposal_values.dosis_texto = drug.dosis; }
    if (canApply('via')) { values.via = this.mapCatalogViaToSelect(drug.via); if (values.via) proposal_values.via = values.via; }
    return { values, proposal_values };
  },
  selectDrug(drug, ctx, metadata) { persistenceCalls.selectDrug++; snapshots.set(`${ctx.slot}|${ctx.cip}`, { context: ctx, proposal_values: { ...metadata.proposal_values } }); }
};
const validationSandbox = {
  window: {
    FarmaciaCatalog: catalog,
    FarmaciaDemo: {
      clearChildren: (element) => { element.children = []; },
      setValue: (id, value) => { if (dom.has(id)) dom.get(id).value = value || ''; }
    }
  },
  document: {
    getElementById: (id) => dom.get(id) || null,
    createElement: (tag) => new FakeElement(tag),
    addEventListener() {},
    activeElement: null
  },
  console, setTimeout, clearTimeout, Event: function Event(type) { this.type = type; }, Array
};
vm.createContext(validationSandbox);
vm.runInContext(js, validationSandbox);
validationSandbox.window.FarmaciaValidacion.enableRequestedAutocomplete();

dom.get('fhOrigenEntrada').value = '';
dom.get('fhDermaCip').value = '';
dom.get('fhDermaDosis').value = '';
dom.get('fhDermaVia').value = '';
dom.get('fhDermaPauta').value = 'PAUTA-MANUAL';
dom.get('fhDermaInduccion').value = 'si';
dom.get('fhDermaJustificacion').value = 'Justificación profesional';
dom.get('fhDermaFarmaco').value = 'marca';
dom.get('fhDermaFarmaco').dispatchEvent({ type: 'input' });
check(dom.get('fhDermaDosis').value === '' && dom.get('fhDermaVia').value === '', 'Escribir en solicitado Dermatología no muta dosis ni vía');
dom.get('autocompleteDropdown').children[0].click();
check(dom.get('fhDermaFarmaco').value === products[0].display_name && dom.get('fhDermaPrincipioActivo').value === 'Activo A' && dom.get('fhDermaDosis').value === '300 mg' && dom.get('fhDermaVia').value === 'IV', 'Click con contexto vacío aplica identidad, principio activo, dosis y vía visibles');
check(persistenceCalls.getSnapshot === 0 && persistenceCalls.selectDrug === 0 && snapshots.size === 0, 'Contexto vacío omite lectura y persistencia de snapshot');
check(dom.get('fhDermaPauta').value === 'PAUTA-MANUAL' && dom.get('fhDermaInduccion').value === 'si', 'Selección con contexto vacío preserva pauta e inducción');

dom.get('fhDermaCip').value = 'CIP-SYN-DERMA';
dom.get('fhDermaFarmaco').value = 'marca';
dom.get('fhDermaFarmaco').dispatchEvent({ type: 'input' });
dom.get('autocompleteDropdown').children[1].click();
check(persistenceCalls.getSnapshot === 1 && persistenceCalls.selectDrug === 1 && snapshots.size === 1, 'Selección concreta posterior con contexto válido persiste por el flujo público');
check(dom.get('fhDermaPauta').value === 'PAUTA-MANUAL' && dom.get('fhDermaInduccion').value === 'si', 'Selección posterior preserva pauta e inducción');

dom.get('fhDermaDosis').value = 'Dosis profesional';
dom.get('fhDermaVia').value = 'Oral';
dom.get('fhDermaFarmaco').value = 'marca';
dom.get('fhDermaFarmaco').dispatchEvent({ type: 'input' });
dom.get('autocompleteDropdown').children[0].click();
check(dom.get('fhDermaFarmaco').value === products[0].display_name && dom.get('fhDermaPrincipioActivo').value === 'Activo A', 'Click en Dermatología sustituye el fragmento por la identidad de catálogo');
check(dom.get('fhDermaDosis').value === 'Dosis profesional' && dom.get('fhDermaVia').value === 'Oral' && dom.get('fhDermaPauta').value === 'PAUTA-MANUAL' && dom.get('fhDermaInduccion').value === 'si' && dom.get('fhDermaJustificacion').value === 'Justificación profesional', 'Selección Dermatología preserva edición profesional, pauta, inducción y justificación');

dom.get('fhOrigenEntrada').value = 'manual_farmacia';
dom.get('fhManualCip').value = 'CIP-SYN-MANUAL';
dom.get('fhManualPauta').value = 'PAUTA-MANUAL';
dom.get('fhManualInduccion').value = 'no';
dom.get('fhManualJustificacion').value = 'Texto profesional';
dom.get('fhManualDosis').value = 'Dosis antes de buscar';
dom.get('fhManualVia').value = 'Oral';
dom.get('fhManualFarmaco').value = 'activo';
dom.get('fhManualFarmaco').dispatchEvent({ type: 'input' });
check(dom.get('fhManualDosis').value === 'Dosis antes de buscar' && dom.get('fhManualVia').value === 'Oral' && dom.get('fhManualPauta').value === 'PAUTA-MANUAL' && dom.get('fhManualInduccion').value === 'no' && dom.get('fhManualJustificacion').value === 'Texto profesional', 'Escribir en solicitado manual no muta dosis, vía, pauta, inducción ni justificación');
dom.get('fhManualDosis').value = '';
dom.get('fhManualVia').value = '';
dom.get('fhManualFarmaco').dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault() {} });
dom.get('fhManualFarmaco').dispatchEvent({ type: 'keydown', key: 'Enter', preventDefault() {} });
check(dom.get('fhManualFarmaco').value === products[0].display_name && dom.get('fhManualDosis').value === '300 mg' && dom.get('fhManualVia').value === 'IV', 'Teclado en solicitado manual selecciona y propone concentración/vía');
check(dom.get('fhManualPauta').value === 'PAUTA-MANUAL' && dom.get('fhManualInduccion').value === 'no' && dom.get('fhManualJustificacion').value === 'Texto profesional', 'Selección manual preserva pauta, inducción y justificación');

console.log('\nTotal: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
