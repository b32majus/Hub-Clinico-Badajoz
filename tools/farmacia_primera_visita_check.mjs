#!/usr/bin/env node
// tools/farmacia_primera_visita_check.mjs
// Verifica WO7D en Primera visita

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];

function ok(msg) {
  console.log(`  ✓ ${msg}`);
  passed++;
}

function fail(msg) {
  console.log(`  ✗ ${msg}`);
  failed++;
  errors.push(msg);
}

function assert(condition, label) {
  if (condition) ok(label);
  else fail(label);
}

function assertEqual(actual, expected, label) {
  if (actual === expected) ok(`${label}: ${JSON.stringify(expected)}`);
  else fail(`${label}: esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`);
}

const htmlPath = path.join(ROOT, 'farmacia_primera_visita.html');
const jsPath = path.join(ROOT, 'scripts', 'farmacia_primera_visita.js');
const helperPath = path.join(ROOT, 'scripts', 'farmacia_tratamiento_common.js');
const pautasPath = path.join(ROOT, 'scripts', 'farmacia_pautas_catalog.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const helperSrc = fs.readFileSync(helperPath, 'utf8');
const pautasSrc = fs.readFileSync(pautasPath, 'utf8');

function countMatches(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

assert(countMatches(html, /id="fhPvFarmaco"/g) === 1, 'solo hay un campo fhPvFarmaco editable');
assert(countMatches(html, /id="fhPvDosis"/g) === 1, 'solo hay un campo fhPvDosis editable');
assert(countMatches(html, /id="fhPvPauta"/g) === 1, 'solo hay un campo fhPvPauta editable');
assert(countMatches(html, /id="fhPvVia"/g) === 1, 'solo hay un campo fhPvVia editable');
const pvIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
assert(new Set(pvIds).size === pvIds.length, 'HTML de Primera Visita no contiene IDs duplicados');
const pvViaMarkup = (html.match(/<select[^>]+id="fhPvVia"[\s\S]*?<\/select>/) || [''])[0];
const pvViaLabels = [...pvViaMarkup.matchAll(/<option[^>]*>([^<]*)<\/option>/g)].map((match) => match[1].trim());
assert(JSON.stringify(pvViaLabels) === JSON.stringify(['Seleccionar…', 'SC', 'IV', 'Oral', 'IM', 'Otra']), 'fhPvVia ofrece exactamente las rutas canónicas visibles');

const treatmentSectionPos = html.indexOf('Tratamiento validado por Farmacia');
const farmacoPos = html.indexOf('id="fhPvFarmaco"');
assert(treatmentSectionPos !== -1 && farmacoPos > treatmentSectionPos, 'el bloque editable de tratamiento está en la tarjeta de tratamiento validado');
assert(html.includes('scripts/farmacia_tratamiento_common.js'), 'Primera visita carga FarmaciaTratamiento');

// WO7D.1: no debe existir tarjeta azul informativa
assert(!html.includes('fhPvTreatmentNotice'), 'no existe la tarjeta azul informativa');
// WO7D.1: no debe existir subbloque redundante de búsqueda
assert(!html.includes('fhPvAutocompleteBlock'), 'no existe subbloque redundante Buscar fármaco en catálogo');
// WO7D.1: fhPvFarmaco debe estar dentro de autocomplete-wrapper
const wrapperStart = html.indexOf('autocomplete-wrapper');
const farmacoInWrapper = wrapperStart !== -1 && html.indexOf('id="fhPvFarmaco"') > wrapperStart;
assert(farmacoInWrapper, 'fhPvFarmaco está dentro de autocomplete-wrapper');
// WO7D.1: dropdown debe existir junto a fhPvFarmaco
assert(html.includes('fhPvAutocompleteDropdown'), 'dropdown autocomplete presente en HTML');
// WO7D.1: no debe referenciar fhPvDrugSearch en JS (eliminado)
assert(!js.includes('fhPvDrugSearch'), 'JS no referencia fhPvDrugSearch (eliminado)');
// WO7D.1: z-index style para dropdown
assert(html.includes('z-index: 1000'), 'estilo z-index para dropdown presente');
// WO7D.2: servicio origen como select con opciones
assert(html.indexOf('id=\"fhPvServicio\"') !== -1 && html.indexOf('select') < html.indexOf('id=\"fhPvServicio\"'), 'Servicio origen es un select');
assert(html.includes('Dermatología') && html.includes('Reumatología') && html.includes('Digestivo'), 'Servicio origen tiene opciones guiadas');
assert(html.includes('fhPvServicioOtro'), 'Servicio origen tiene campo Otro');
// WO7D.2: patología como select con opciones guiadas
assert(html.indexOf('id=\"fhPvPatologia\"') !== -1 && html.indexOf('select') < html.indexOf('id=\"fhPvPatologia\"'), 'Patología / indicación es un select');
assert(html.includes('fhPvPatologiaOtro'), 'Patología tiene campo Otra');
// WO7D.2: tratamiento no se ha eliminado
assert(html.includes('fhPvFarmaco'), 'Campo fhPvFarmaco sigue presente');
assert(html.includes('fhPvAutocompleteDropdown'), 'Dropdown autocomplete sigue presente');

const sandbox = {
  window: {
    FarmaciaDemo: {
      getQueryContext: () => ({}),
      clearChildren: () => {},
      renderFields: () => {},
      setValue: () => {},
      insertNoCipBanner: () => {},
      findPatientByCip: () => null,
      downloadFile: () => {}
    }
  },
  console,
  module: { exports: {} },
  exports: {},
  document: {
    addEventListener: () => {},
    getElementById: () => null,
    createElement: () => ({ appendChild: () => {}, setAttribute: () => {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} } }),
    querySelector: () => null,
    querySelectorAll: () => [],
    activeElement: null
  },
  setTimeout,
  clearTimeout
};
vm.createContext(sandbox);
vm.runInContext(pautasSrc, sandbox);
vm.runInContext(helperSrc, sandbox);
vm.runInContext(js, sandbox);

const api = sandbox.window.FarmaciaPrimeraVisita;
assert(api && typeof api.buildPrimaryTreatmentFromContext === 'function', 'FarmaciaPrimeraVisita expone API de tratamiento');
assert(api && typeof api.searchCIP === 'function' && typeof api.setActivePatientCip === 'function', 'Primera visita exposes testable guarded CIP search');
assert(sandbox.window.FarmaciaTratamiento, 'FarmaciaTratamiento está disponible en el entorno cargado');
if (api && typeof api.searchCIP === 'function') {
  const ids = ['fhPvCip', 'fhPvServicio', 'fhPvPatologia', 'fhPvFechaValidacion', 'fhPvInduccionSolicitada', 'fhPvAnalitica', 'fhPvFarmaco', 'fhPvDosis', 'fhPvVia', 'fhPvPauta', 'fhPvPautaOtro', 'fhPvProms', 'fhPvNotas', 'fhPvTratamientoGrid'];
  const elements = Object.fromEntries(ids.map((id) => [id, { id, value: '', textContent: '', children: [], readOnly: false, classList: { add: () => {}, remove: () => {}, toggle: () => {} }, closest: () => null }]));
  elements.fhPvCip.value = 'CIP-B';
  elements.fhPvProms.value = 'No';
  sandbox.document.getElementById = (id) => elements[id] || null;
  sandbox.document.createTextNode = (text) => ({ textContent: text });
  sandbox.window.FarmaciaDemo.setValue = (id, value) => { if (elements[id]) elements[id].value = value || ''; };
  sandbox.window.FarmaciaDemo.clearChildren = (el) => { if (el) el.children = []; };
  sandbox.window.FarmaciaDemo.findPatientByCip = (cip) => cip.trim().toUpperCase() === 'CIP-B' ? { cip: 'CIP-B', servicio: 'Reumatología', patologia: 'LES', farmaco: 'Drug B', dosis: '20 mg', via: 'SC', pauta: 'Cada 4 semanas' } : null;
  sandbox.window.FarmaciaDemo.resolvePatientContextSwitch = (current, requested, hasContext, confirmed) => {
    if (String(current).trim().toUpperCase() === String(requested).trim().toUpperCase()) return { action: 'same' };
    if (hasContext && confirmed === undefined) return { action: 'confirm' };
    if (hasContext && confirmed === false) return { action: 'cancel' };
    return { action: 'switch' };
  };
  sandbox.window.FarmaciaCatalog = { clearSnapshot: () => {} };
  let confirmation = false;
  let confirmationCalls = 0;
  sandbox.window.confirm = () => { confirmationCalls++; return confirmation; };
  api.searchCIP();
  assertEqual(confirmationCalls, 0, 'Primera visita fresh screen ignores neutral PROM default');
  elements.fhPvNotas.value = 'A-only note';
  elements.fhPvFarmaco.value = 'A-only drug';
  elements.fhPvCip.value = 'CIP-B';
  api.setActivePatientCip('CIP-A');
  api.searchCIP();
  assertEqual(elements.fhPvCip.value, 'CIP-A', 'Primera visita cancel restores previous CIP');
  assertEqual(elements.fhPvNotas.value, 'A-only note', 'Primera visita cancel preserves edits');
  confirmation = true;
  elements.fhPvCip.value = 'CIP-B';
  api.searchCIP();
  assertEqual(elements.fhPvFarmaco.value, 'Drug B', 'Primera visita confirmed switch loads patient B');
  assertEqual(elements.fhPvNotas.value, '', 'Primera visita confirmed switch clears A-only notes');
  elements.fhPvCip.value = 'CIP-UNKNOWN';
  api.searchCIP();
  assertEqual(elements.fhPvCip.value, 'CIP-UNKNOWN', 'Primera visita unknown CIP remains typed');
  assertEqual(elements.fhPvFarmaco.value, '', 'Primera visita unknown CIP enters clean manual mode');

  const makeInteractive = (element) => {
    element.listeners = {};
    element.dataset = {};
    element.addEventListener = function (type, handler) { (this.listeners[type] ||= []).push(handler); };
    element.dispatchEvent = function (event) { event.target = this; (this.listeners[event.type] || []).forEach((handler) => handler.call(this, event)); };
    element.querySelectorAll = function (selector) { return selector === '.autocomplete-item' ? this.children.filter((child) => child.classList.contains('autocomplete-item')) : []; };
    element.contains = function (node) { return node === this || this.children.includes(node); };
    return element;
  };
  Object.values(elements).forEach(makeInteractive);
  const makeNode = (tag = 'div') => {
    const node = makeInteractive({ tagName: tag.toUpperCase(), value: '', textContent: '', children: [], options: [], classNames: new Set(), setAttribute(name, value) { this[name] = String(value); }, appendChild(child) { this.children.push(child); if (this.tagName === 'SELECT') this.options.push(child); return child; } });
    node.classList = { add: (name) => node.classNames.add(name), remove: (name) => node.classNames.delete(name), contains: (name) => node.classNames.has(name), toggle: (name, force) => force ? node.classNames.add(name) : node.classNames.delete(name) };
    Object.defineProperty(node, 'className', { set(value) { node.classNames = new Set(String(value).split(/\s+/).filter(Boolean)); }, get() { return [...node.classNames].join(' '); } });
    node.click = () => node.dispatchEvent({ type: 'click', preventDefault() {} });
    return node;
  };
  elements.fhPvAutocompleteDropdown = makeNode('div');
  elements.fhPvAutocompleteDropdown.classList.add('hidden');
  elements.fhPvVia.options = ['', 'SC', 'IV', 'Oral', 'IM', 'Otra'].map((value) => ({ value, text: value, textContent: value }));
  sandbox.document.createElement = makeNode;
  sandbox.document.activeElement = null;
  sandbox.window.FarmaciaDemo.clearChildren = (el) => { if (el) { el.children = []; el.options = el.tagName === 'SELECT' ? [] : el.options; } };
  const pvSnapshots = new Map();
  const pvProducts = [
    { drug_id: 'CIMA-PV-A', source_type: 'CIMA', display_name: 'Producto PV A', nombre_comercial: 'Producto PV A', nombre_presentacion: 'Producto PV A 300 mg vial', principio_activo: 'Activo PV A', dosis: '300 mg', via: 'IV' },
    { drug_id: 'CIMA-PV-B', source_type: 'CIMA', display_name: 'Producto PV B', nombre_comercial: 'Producto PV B', nombre_presentacion: 'Producto PV B 120 mg jeringa', principio_activo: 'Activo PV B', dosis: '120 mg', via: 'VÍA INTRAMUSCULAR' }
  ];
  sandbox.window.FarmaciaCatalog = {
    loaded: true,
    autoLoad() {},
    search: () => pvProducts,
    isConcreteCatalogSelection: (drug) => Boolean(drug?.drug_id && drug?.nombre_presentacion),
    snapshotContextKey: (ctx) => ctx?.slot && ctx?.cip ? `${ctx.slot}|${ctx.cip}` : '',
    getSnapshot: (ctx) => pvSnapshots.get(`${ctx.slot}|${ctx.cip}`) || null,
    selectDrug: (drug, ctx, metadata) => pvSnapshots.set(`${ctx.slot}|${ctx.cip}`, { context: { ...ctx }, proposal_values: { ...metadata.proposal_values } }),
    mapCatalogViaToSelect: (value) => /intramus|^IM$/i.test(value) ? 'IM' : (/intraven|^IV$/i.test(value) ? 'IV' : (/subcut|^SC$/i.test(value) ? 'SC' : (/oral|^VO$/i.test(value) ? 'Oral' : (value ? 'Otra' : ''))))
  };
  elements.fhPvCip.value = 'CIP-PV-EVENT';
  elements.fhPvFarmaco.value = 'prod';
  elements.fhPvDosis.value = 'Dosis profesional PV';
  elements.fhPvVia.value = 'Oral';
  api.initDrugAutocomplete();
  elements.fhPvFarmaco.dispatchEvent({ type: 'input' });
  assert(elements.fhPvDosis.value === 'Dosis profesional PV' && elements.fhPvVia.value === 'Oral', 'PV typing does not mutate combined dose or route');
  elements.fhPvAutocompleteDropdown.children[0].click();
  assert(elements.fhPvFarmaco.value === 'Producto PV A', 'PV click replaces partial query with catalog product identity');
  assert(elements.fhPvDosis.value === 'Dosis profesional PV' && elements.fhPvVia.value === 'Oral', 'PV click preserves professional combined dose and route edits');
  elements.fhPvDosis.value = '';
  elements.fhPvVia.value = '';
  elements.fhPvFarmaco.value = 'segundo';
  elements.fhPvFarmaco.dispatchEvent({ type: 'input' });
  elements.fhPvAutocompleteDropdown.children[1].click();
  assert(elements.fhPvDosis.value === 'Producto PV B 120 mg jeringa' && elements.fhPvVia.value === 'IM', 'PV selection proposes one full presentation and canonical route');
}

const ctxTreatment = api.buildPrimaryTreatmentFromContext({ cip: 'CIP-PV-001', patient: null });
assertEqual(ctxTreatment.paciente_cip, 'CIP-PV-001', 'paciente sin tratamiento conserva paciente_cip');
assert('tratamiento_id' in ctxTreatment && 'pauta_codigo' in ctxTreatment && 'tipo_relacion' in ctxTreatment, 'seleccion genera objeto con shape común');

const selectedTreatment = api.buildPrimaryTreatmentFromSelection({
  display_name: 'Secukinumab 300 mg',
  nombre_comercial: 'Cosentyx',
  principio_activo: 'Secukinumab',
  nombre_presentacion: '300 mg pluma',
  dosis: '300 mg',
  via: 'SC',
  codigo_nacional: '123456',
  nregistro: 'EU/1/99/999',
  drug_id: 'CIMA-TEST',
  source_type: 'CIMA'
}, { cip: 'CIP-PV-002' });
assertEqual(selectedTreatment.paciente_cip, 'CIP-PV-002', 'paciente con CIP conserva paciente_cip');
assertEqual(selectedTreatment.source_type, 'CIMA', 'selección catálogo conserva source_type');
assertEqual(selectedTreatment.tipo_relacion, 'principal', 'selección manual desde primera visita usa relación principal');
assertEqual(selectedTreatment.codigo_nacional, '123456', 'selección catálogo conserva CN');

const sandboxNoHelper = {
  window: {
    FarmaciaDemo: sandbox.window.FarmaciaDemo,
    FarmaciaPautasCatalog: sandbox.window.FarmaciaPautasCatalog
  },
  console,
  module: { exports: {} },
  exports: {},
  document: sandbox.document,
  setTimeout,
  clearTimeout
};
vm.createContext(sandboxNoHelper);
vm.runInContext(js, sandboxNoHelper);
const fallbackApi = sandboxNoHelper.window.FarmaciaPrimeraVisita;
const fallbackTreatment = fallbackApi.buildPrimaryTreatmentFromContext({ cip: 'CIP-PV-003', patient: null });
assertEqual(fallbackTreatment.paciente_cip, 'CIP-PV-003', 'degrada de forma controlada sin helper común');
assertEqual(fallbackTreatment.farmaco_nombre, '', 'sin tratamiento no genera tratamiento fantasma');

const forbidden = 'inner' + 'HTML';
assert(html.indexOf(forbidden) === -1, 'HTML de primera visita no usa markup prohibido');
assert(js.indexOf(forbidden) === -1, 'JS de primera visita no usa markup prohibido');

console.log('\n┌──────────────────────────────────────────────┐');
console.log(`│ Resultados: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}   │`);
console.log('└──────────────────────────────────────────────┘');

if (failed > 0) process.exit(1);
