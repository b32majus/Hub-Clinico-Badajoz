#!/usr/bin/env node
// tools/farmacia_solicitud_id_transport_check.mjs
// Issue #366 (N2 of train #364) — solicitud_id transport for FH Validación.
// Covers: exact identity write/export, manual/no-ID absence (never inferred),
// non-validation acts never transport the ID, canonical denial write value,
// request_id canonical bridge alias mapping, and multisheet legacy FH reading
// (01_DERMA / 02_REUMA / 03_DIGESTIVO with sheet provenance; 04_ONCO untouched).
// Frozen oracle semantics: /srv/kairos-lab/oracles/promueve-fh-enfermeria-v6-20260916/acceptance_contract_v1.json
// All data are synthetic — no real patient data.

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];
const DOMContentLoadedCallbacks = [];

function ok(msg) { console.log('  \u2713 ' + msg); passed++; }
function fail(msg) { console.log('  \u2717 ' + msg); failed++; errors.push(msg); }
function assert(condition, label) { if (condition) ok(label); else fail(label); }
function assertEqual(actual, expected, label) {
  if (actual === expected) ok(label + ': ' + JSON.stringify(expected));
  else fail(label + ': esperado ' + JSON.stringify(expected) + ', recibido ' + JSON.stringify(actual));
}
function assertNotEqual(actual, expected, label) {
  if (actual !== expected) ok(label + ': ' + JSON.stringify(actual) + ' !== ' + JSON.stringify(expected));
  else fail(label + ': no debe ser ' + JSON.stringify(expected));
}
function assertTruthy(actual, label) {
  if (actual) ok(label + ': ' + JSON.stringify(actual));
  else fail(label + ': se esperaba valor truthy');
}
function validation_buildExportData() { return validation.buildValidationExcelExportData(); }
function validation_buildV2Input(context) { return validation.buildValidationV2Input(context); }

// ─── Mock DOM (same proven pattern as farmacia_validacion_enfermeria_import_check) ──


function createMockElement(tag, attrs) {
  var listeners = {};
  var el = {
    tagName: (tag || 'div').toUpperCase(),
    id: (attrs && attrs.id) || '',
    className: (attrs && attrs.className) || '',
    value: (attrs && attrs.value !== undefined) ? attrs.value : '',
    checked: false,
    textContent: (attrs && attrs.textContent !== undefined) ? attrs.textContent : '',
    disabled: false,
    placeholder: '',
    style: {},
    type: (attrs && attrs.type) ? attrs.type : 'text',
    classList: {
      _classes: ((attrs && attrs.className) || '').split(/\s+/).filter(function (c) { return c; }),
      add: function (c) { if (this._classes.indexOf(c) === -1) this._classes.push(c); },
      remove: function (c) { var i = this._classes.indexOf(c); if (i !== -1) this._classes.splice(i, 1); },
      contains: function (c) { return this._classes.indexOf(c) !== -1; },
      toggle: function (c, force) {
        if (force === true) { this.add(c); return true; }
        if (force === false) { this.remove(c); return false; }
        if (this.contains(c)) { this.remove(c); return false; }
        this.add(c); return true;
      }
    },
    options: [],
    children: [],
    appendChild: function (child) {
      this.children.push(child);
      if (child && child.tagName === 'OPTION') {
        this.options.push(child);
      }
    },
    removeChild: function (child) {
      var i = this.children.indexOf(child);
      if (i !== -1) this.children.splice(i, 1);
    },
    addEventListener: function (type, callback) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(callback);
    },
    removeEventListener: function () {},
    dispatchEvent: function (event) {
      var type = event && event.type ? event.type : String(event || '');
      (listeners[type] || []).forEach(function (callback) { callback.call(el, event); });
      return true;
    },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    append: function () {},
    getAttribute: function (name) { return this._attrs && this._attrs[name]; },
    setAttribute: function (name, val) { if (!this._attrs) this._attrs = {}; this._attrs[name] = val; },
    removeAttribute: function (name) { if (this._attrs) delete this._attrs[name]; },
    _attrs: {},
    _parentSelect: null,
    closest: function () { return null; },
    contains: function () { return false; },
    focus: function () {},
    blur: function () {}
  };
  if (el.tagName === 'OPTION') {
    el.selected = false;
    el.label = '';
  }
  Object.defineProperty(el, 'firstChild', { get: function () { return el.children.length ? el.children[0] : null; } });
  return el;
}

function buildMockDom() {
  var mockElements = {};
  var chipGroups = {};

  var ctxCip = createMockElement('strong');
  ctxCip._attrs = ctxCip._attrs || {};
  ctxCip._attrs['data-context'] = 'cip';

  var ctxServ = createMockElement('strong');
  ctxServ._attrs = ctxServ._attrs || {};
  ctxServ._attrs['data-context'] = 'servicio';

  var ctxPat = createMockElement('strong');
  ctxPat._attrs = ctxPat._attrs || {};
  ctxPat._attrs['data-context'] = 'patologia';

  var formDerma = createMockElement('section', { id: 'formDerma', className: 'dashboard-card hidden' });
  mockElements['formDerma'] = formDerma;
  var formReuma = createMockElement('section', { id: 'formReuma', className: 'dashboard-card hidden' });
  mockElements['formReuma'] = formReuma;
  var formHS = createMockElement('section', { id: 'formHS', className: 'dashboard-card hidden' });
  mockElements['formHS'] = formHS;
  var formServicioManual = createMockElement('section', { id: 'formServicioManual', className: 'dashboard-card hidden' });
  mockElements['formServicioManual'] = formServicioManual;
  var formManualSolicitud = createMockElement('section', { id: 'formManualSolicitud', className: 'dashboard-card hidden' });
  mockElements['formManualSolicitud'] = formManualSolicitud;
  var formDigestivo = createMockElement('section', { id: 'formDigestivo', className: 'dashboard-card hidden' });
  mockElements['formDigestivo'] = formDigestivo;
  // Issue #340 mock repair (issue #366 prerequisite): the shared analítica/
  // vacunación surface exists in the real page; mostrarFormulario toggles it.
  var formAnaliticaVacunacion = createMockElement('section', { id: 'formAnaliticaVacunacion', className: 'dashboard-card hidden' });
  mockElements['formAnaliticaVacunacion'] = formAnaliticaVacunacion;
  var validationBlock = createMockElement('section', { id: 'validationBlock', className: 'dashboard-card hidden' });
  mockElements['validationBlock'] = validationBlock;

  // Header title
  var dermaTitle = createMockElement('h2', { className: 'section-title' });
  dermaTitle.textContent = '';
  var initialIcon = createMockElement('i', { className: 'fas fa-disease' });
  initialIcon.setAttribute('aria-hidden', 'true');
  var initialText = { nodeType: 3, textContent: ' Datos de solicitud — Dermatología' };
  dermaTitle.appendChild(initialIcon);
  dermaTitle.appendChild(initialText);
  formDerma.children.push(dermaTitle);

  // All form fields
  var allIds = [
    'fhDermaCip', 'fhDermaPatologia', 'fhDermaFecha', 'fhDermaFarmaco',
    'fhDermaDosis', 'fhDermaPrincipioActivo', 'fhDermaVia', 'fhDermaPauta',
    'fhDermaPautaOtro', 'fhDermaInduccion', 'fhDermaPeso',
    'fhDermaJustificacion', 'fhDermaObservaciones', 'fhDermaAnalitica',
    'fhDermaServicioOrigen',
    'fhAnaliticaFecha', 'fhAnaliticaReciente', 'fhAnaliticaMantoux',
    'fhAnaliticaSerologiasVhb', 'fhAnaliticaSerologiasVhc',
    'fhAnaliticaSerologiasVih', 'fhAnaliticaVacunacion', 'fhAnaliticaObservaciones',
    'fhAnaliticaHemograma', 'fhAnaliticaBioquimica',
    'fhHSIhs4', 'fhHSHurley', 'fhHSDlqi', 'fhHSLocalizacion',
    'fhHSTiempoEvolucion', 'fhHSTratamientosPrevios', 'fhHSMotivoClinico',
    'fhHSComorbImc', 'fhHSComorbTabaquismo', 'fhHSComorbPaquetes',
    'fhHSComorbDiabetes', 'fhHSComorbHba1c', 'fhHSComorbSdMetabolico',
    'fhHSComorbOtras', 'fhHSComorbilidades',
    'fhValEstado', 'fhValCita', 'fhValMotivo', 'fhValObservaciones',
    'fhValFarmaceutico',
    'fhOrigenEntrada', 'fhTipoValidacion', 'fhTipoValidacionNotice',
    'fhServicioManual', 'fhPatologiaManual', 'fhManualCip', 'fhManualFecha',
    'fhManualFarmaco', 'fhManualPrincipioActivo', 'fhManualDosis', 'fhManualVia',
    'fhManualPauta', 'fhManualPautaOtro', 'fhManualInduccion', 'fhManualPeso',
    'fhManualJustificacion', 'fhManualObservaciones',
    'fhValidadoFarmaco', 'fhValidadoPrincipioActivo', 'fhValidadoDosis',
    'fhValidadoVia', 'fhValidadoPauta', 'fhValidadoPautaOtro',
    'fhValidadoInduccion', 'fhValidadoPresentacion', 'fhValidadoJustificacion',
    'fhValMotivoRow', 'fhValPendingReasonRow', 'fhValPendingReason',
    'fhValidatedTreatmentRelation', 'btnValidateRequestedSame',
    'fhTipoSolicitud',
    'fhEaNotificado', 'fhCausalidadFinal',
    'fhEaActivationNotice',
    'btnApplyNaranjo', 'btnApplyKl',
    'naranjoQ1', 'naranjoQ2', 'naranjoQ3', 'naranjoQ4', 'naranjoQ5',
    'naranjoQ6', 'naranjoQ7', 'naranjoQ8', 'naranjoQ9', 'naranjoQ10',
    'klTemporal', 'klConocido', 'klAlternativa', 'klSuspendido',
    'klMejoraRetirada', 'klReadministracion', 'klReaparece',
    'fhHSBioAda', 'fhHSBioAdaDuracion', 'fhHSBioAdaMotivo',
    'fhHSBioOtros', 'fhHSBioOtrosFarmaco', 'fhHSBioOtrosMotivo',
    'fhHSTtoDoxiClinda', 'fhHSTtoRifClinda', 'fhHSTtoOtrosAb', 'fhHSTtoOtrosAbTxt',
    'noFindDrugRow', 'btnNoFindDrug',
    'fhValExcelExportBtn', 'fhGoSeguimientoLink',
    'otrosFarmacosList', 'otrosFarmacosEmpty', 'btnAddOtherDrug',
    'fhValExportTxt', 'fhValExportCsv',
    'modEfectoAdverso', 'modNaranjo', 'modKarchLasagna', 'modResumenCausalidad',
    'modPrebiologico', 'modTratamientoPrincipal', 'modOtrosFarmacos',
    'modSeguimientoEaHandoff', 'modExportacion',
    'autocompleteDropdown', 'autocompleteWrapper', 'autocompleteValidadoDropdown',
    'fhResumenFarmaco', 'fhResumenPrincipioActivo', 'fhResumenDosis',
    'fhResumenVia', 'fhResumenPauta', 'fhResumenInduccion', 'fhResumenJustificacion',
    'fhResumenAnaliticaFecha', 'fhResumenAnaliticaReciente',
    'fhResumenMantoux', 'fhResumenVhb', 'fhResumenVhc', 'fhResumenVih',
    'fhResumenVacunacion', 'fhResumenHemograma', 'fhResumenBioquimica',
    'fhResumenVacunacionObs',
    'fhSolicitadoFarmaco', 'fhSolicitadoPrincipioActivo', 'fhSolicitadoDosis',
    'fhSolicitadoVia', 'fhSolicitadoPauta', 'fhSolicitadoInduccion',
    'fhSolicitadoJustificacion', 'fhSolicitadoInduccionRow',
    'naranjoScore', 'naranjoCategoria', 'klCategoria',
    'resumenNaranjo', 'resumenKl',
    'fhEnfermeriaResumen',
    // WO8.1c.12 — spans dinámicos de formReuma
    'fhReumaCip', 'fhReumaPatologia', 'fhReumaIndicacion', 'fhReumaOrigen',
    'fhReumaFecha', 'fhReumaFarmaco', 'fhReumaDosis', 'fhReumaVia',
    'fhReumaPauta', 'fhReumaPrebiologico'
  ];
  allIds.forEach(function (id) {
    var el = createMockElement('input');
    el.id = id;
    mockElements[id] = el;
    if (id === 'fhDermaServicioOrigen') el.value = 'Dermatología';
    formDerma.children.push(el);
  });

  // formReuma dynamic spans: use span elements with readable textContent
  [
    'fhReumaCip', 'fhReumaPatologia', 'fhReumaIndicacion', 'fhReumaOrigen',
    'fhReumaFecha', 'fhReumaFarmaco', 'fhReumaDosis', 'fhReumaVia',
    'fhReumaPauta', 'fhReumaPrebiologico'
  ].forEach(function (id) {
    var span = createMockElement('span', { id: id, className: 'info-field__value' });
    delete span.value;
    span.textContent = '—';
    mockElements[id] = span;
    formReuma.children.push(span);
  });

  // modSeguimientoEaHandoff starts hidden (matches HTML)
  mockElements['modSeguimientoEaHandoff'].className = 'validation-module hidden';
  mockElements['modSeguimientoEaHandoff'].classList._classes = ['validation-module', 'hidden'];

  // Farmacéutico responsable wrapper uses validation-meta-line
  mockElements['fhValFarmaceutico'].className = 'validation-meta-value';
  var metaLine = createMockElement('div', { className: 'validation-meta-line' });
  metaLine.appendChild(mockElements['fhValFarmaceutico']);
  formDerma.children.push(metaLine);

  // Make select-like elements for selects
  ['fhDermaPatologia', 'fhDermaVia', 'fhDermaPauta',
    'fhDermaInduccion', 'fhAnaliticaReciente',
    'fhOrigenEntrada', 'fhTipoValidacion', 'fhServicioManual', 'fhPatologiaManual',
    'fhManualVia', 'fhManualPauta', 'fhManualInduccion',
    'fhValidadoVia', 'fhValidadoPauta', 'fhValidadoInduccion',
   'fhValEstado', 'fhTipoSolicitud',
   'fhEaNotificado', 'fhCausalidadFinal'].forEach(function (id) {
    mockElements[id].tagName = 'SELECT';
    mockElements[id].options = [];
  });
  mockElements['fhDermaVia'].options = ['', 'SC', 'IV', 'Oral', 'Otra'].map(function (value) { return { value: value, text: value, textContent: value }; });
  mockElements['fhManualVia'].options = ['', 'SC', 'IV', 'Oral', 'Otra'].map(function (value) { return { value: value, text: value, textContent: value }; });
  mockElements['fhValidadoVia'].options = ['', 'SC', 'IV', 'Oral', 'IM', 'Otra'].map(function (value) { return { value: value, text: value, textContent: value }; });

  // Naranjo/KL selects
  ['naranjoQ1','naranjoQ2','naranjoQ3','naranjoQ4','naranjoQ5',
   'naranjoQ6','naranjoQ7','naranjoQ8','naranjoQ9','naranjoQ10',
   'klTemporal','klConocido','klAlternativa','klSuspendido',
   'klMejoraRetirada','klReadministracion','klReaparece'].forEach(function (id) {
    mockElements[id].tagName = 'SELECT';
    mockElements[id].options = [];
  });

  // Chip radio groups
  var chipMappings = [
    { id: 'fhAnaliticaMantoux', values: ['Negativo', 'Positivo - tratado', 'Pendiente'] },
    { id: 'fhAnaliticaSerologiasVhb', values: ['Negativo', 'Positivo', 'Pendiente'] },
    { id: 'fhAnaliticaSerologiasVhc', values: ['Negativo', 'Positivo', 'Pendiente'] },
    { id: 'fhAnaliticaSerologiasVih', values: ['Negativo', 'Positivo', 'Pendiente'] },
    { id: 'fhAnaliticaVacunacion', values: ['si', 'no', 'pendiente'] },
    { id: 'fhAnaliticaReciente', values: ['si', 'no'] }
  ];
  chipMappings.forEach(function (cm) {
    var group = createMockElement('div', { className: 'analitica-chip-group' });
    group.setAttribute('data-chip-target', cm.id);
    group._chipTarget = cm.id;
    cm.values.forEach(function (v) {
      var radio = createMockElement('input', { type: 'radio' });
      radio.value = v;
      radio.name = cm.id + '_rb';
      group.appendChild(radio);
    });
    chipGroups[cm.id] = group;
    formDerma.children.push(group);
  });

  var mockDoc = {
    documentElement: { style: {} },
    body: {
      classList: { add: function () {}, remove: function () {}, contains: function () { return false; } },
      appendChild: function () {}
    },
    head: { appendChild: function () {} },
    addEventListener: function (event, cb) {
      if (event === 'DOMContentLoaded') DOMContentLoadedCallbacks.push(cb);
    },
    getElementById: function (id) { return mockElements[id] || null; },
    querySelector: function (sel) {
      if (sel === '#formDerma h2.section-title') return dermaTitle;
      if (sel === '[data-context="cip"]') return ctxCip;
      if (sel === '[data-context="servicio"]') return ctxServ;
      if (sel === '[data-context="patologia"]') return ctxPat;
      if (sel.indexOf('.analitica-chip-group[data-chip-target="') === 0) {
        var tid = sel.replace('.analitica-chip-group[data-chip-target="', '').replace('"]', '');
        return chipGroups[tid] || null;
      }
      if (sel === '#modPrebiologico .card-body' || sel === '#modPrebiologico') return null;
      return null;
    },
    querySelectorAll: function (sel) {
      if (sel.indexOf('.analitica-chip-group') !== -1) {
        return Object.keys(chipGroups).map(function (k) { return chipGroups[k]; });
      }
      if (sel === '[data-chip-target]') {
        return Object.keys(chipGroups).map(function (k) { return chipGroups[k]; });
      }
      return [];
    },
    createElement: function (tag) { return createMockElement(tag, {}); },
    createTextNode: function (text) { return { nodeType: 3, textContent: text }; },
    dispatchEvent: function () { return true; }
  };

  return { doc: mockDoc, dermaTitle: dermaTitle, ctxCip: ctxCip, ctxServ: ctxServ, ctxPat: ctxPat,
           chipGroups: chipGroups, elements: mockElements, formDerma: formDerma, formReuma: formReuma };
}

// ─── Mock DOM instance ────────────────────────────────────────────────────────
var dom = buildMockDom();

// ─── Section 1: Excel row export frontier ─────────────────────────────────────
console.log('');
console.log('=== Issue #366 — N2 solicitud_id transport ===');

function $(id) { return dom.elements[id]; }
function v(id) { var e = $(id); return e ? e.value : ''; }

const exporterPath = path.join(ROOT, 'scripts', 'farmacia_excel_row_export.js');
const exporterSrc = fs.readFileSync(exporterPath, 'utf8');
const exportSandbox = { window: {}, navigator: {}, document: { getElementById: () => null, createElement: () => ({ style: {} }), body: { appendChild: () => {} } }, setTimeout: () => 0, Date, console };
exportSandbox.window = exportSandbox;
vm.createContext(exportSandbox);
vm.runInContext(exporterSrc, exportSandbox);
const exp = exportSandbox.FarmaciaExcelRowExport;

console.log('\n[Section 1] Export frontier (farmacia_excel_row_export.js)');
assertEqual(exp.WO8_COLUMNS.length, 62, '1.1 WO8_COLUMNS tiene 62 columnas');
assertEqual(exp.WO8_COLUMNS[61], 'solicitud_id', '1.2 solicitud_id appended como última columna');
assertEqual(exp.WO8_COLUMNS[60], 'observaciones_generales', '1.3 orden contractual previo preservado');

// Exact identity kept through supported context, exported without transformation
const solContext = exp.buildContextFromValidacion(null, {
  cip: 'CIP-SYN-366-A',
  resultado: 'validado',
  solicitudId: 'SOL-DER-000101'
});
assertEqual(solContext.solicitudId, 'SOL-DER-000101', '1.3 contexto conserva el ID exacto');
const solRow = exp.buildExcelRowObject(solContext);
assertEqual(solRow.solicitud_id, 'SOL-DER-000101', '1.4 fila exporta el mismo ID sin transformación');
assertEqual(exp.toTSVRow(exp.buildExcelRowArray(solRow)).split('\t')[61], 'SOL-DER-000101', '1.5 TSV col 62 = SOL-DER-000101');

// Manual / other-origin without explicit solicitud_id exports empty; never derived
const bareContext = exp.buildContextFromValidacion(null, {
  cip: 'CIP-SYN-366-B',
  resultado: 'validado',
  fechaActo: '2026-09-16'
});
assertEqual(bareContext.solicitudId, '', '1.6 ausencia de solicitud_id queda vacía');
const bareRow = exp.buildExcelRowObject(bareContext);
assertEqual(bareRow.solicitud_id, '', '1.7 fila sin solicitud_id exporta vacío (sin heurística)');
assertNotEqual(bareRow.solicitud_id, bareRow.cip_demo_o_hash, '1.8 nunca deriva el ID del CIP');

// Same CIP, two different requests: IDs are never mixed
const rowA = exp.buildExcelRowObject(exp.buildContextFromValidacion(null, { cip: 'CIP-SYN-366-MIX', resultado: 'validado', solicitudId: 'SOL-DER-000101' }));
const rowB = exp.buildExcelRowObject(exp.buildContextFromValidacion(null, { cip: 'CIP-SYN-366-MIX', resultado: 'validado', solicitudId: 'SOL-DER-000102' }));
assertEqual(rowA.solicitud_id, 'SOL-DER-000101', '1.9 misma CIP solicitud A conserva su ID');
assertEqual(rowB.solicitud_id, 'SOL-DER-000102', '1.10 misma CIP solicitud B conserva su ID');
assertNotEqual(rowA.solicitud_id, rowB.solicitud_id, '1.11 misma CIP con solicitudes distintas no mezcla IDs');

// Canonical write values: validado / pendiente / denegado (denial uses denegado)
[['validado', 'validado'], ['pendiente', 'pendiente'], ['denegado', 'denegado']].forEach(function (sample) {
  const normalized = exp.normalizeValidationResult(sample[0]);
  assertEqual(normalized.resultado, sample[1], '1.12 escritura canónica ' + sample[0]);
});
const rechazadoWrite = exp.normalizeValidationResult('rechazado');
assertEqual(rechazadoWrite.resultado, '', '1.13 escritura nunca emite rechazado (solo alias de lectura)');

// Non-validation acts never transport the ID
const syntheticPatient = { cip: 'CIP-SYN-366-NV', servicio: 'Dermatología', patologia: 'HS', solicitud_id: 'SOL-DER-000999' };
[['Primera Visita', exp.buildContextFromPrimeraVisita(syntheticPatient, {})],
 ['Seguimiento', exp.buildContextFromSeguimiento(syntheticPatient, {})],
 ['Dashboard', exp.buildContextFromDashboard(syntheticPatient, {})]].forEach(function (sample) {
  assertEqual(sample[1].solicitudId, undefined, sample[0] + ' no transporta solicitud_id');
  assertEqual(exp.buildExcelRowObject(sample[1]).solicitud_id, '', sample[0] + ' exporta solicitud_id vacío');
});

// ─── Section 2: Validación page transport ─────────────────────────────────────
const catalogPath = path.join(ROOT, 'scripts', 'farmacia_pautas_catalog.js');
const commonPath = path.join(ROOT, 'scripts', 'farmacia_common.js');
const validacionPath = path.join(ROOT, 'scripts', 'farmacia_validacion.js');
const modelPath = path.join(ROOT, 'scripts', 'farmacia_validacion_model.js');

function makeStorageMock() {
  var store = {};
  return { getItem: function (k) { return store[k] === undefined ? null : store[k]; },
           setItem: function (k, v) { store[k] = String(v); },
           removeItem: function (k) { delete store[k]; } };
}

var sandbox = {
  window: Object.assign({
    localStorage: makeStorageMock(),
    sessionStorage: makeStorageMock(),
    location: { search: '?cip=CIP-SYN-366-V6&servicio=derma&patologia=HS&entrada=validacion' },
    fetch: globalThis.fetch,
    setTimeout: globalThis.setTimeout,
    dispatchEvent: function () { return true; }
  }, dom.doc),
  console: console,
  document: dom.doc,
  fetch: globalThis.fetch,
  setTimeout: globalThis.setTimeout,
  location: { search: '?cip=CIP-SYN-366-V6&servicio=derma&patologia=HS&entrada=validacion' },
  URLSearchParams: function (qs) {
    var params = {};
    var s = String(qs || '').replace(/^\?/, '');
    s.split('&').forEach(function (pair) {
      var parts = pair.split('=');
      if (parts[0]) params[decodeURIComponent(parts[0])] = decodeURIComponent(parts.slice(1).join('=') || '');
    });
    return { get: function (k) { return params[k] || null; }, has: function (k) { return params[k] !== undefined; }, set: function (k, v) { params[k] = String(v); }, toString: function () { return Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&'); } };
  },
  XLSX: { utils: { sheet_to_json: function () { return []; } } },
  CustomEvent: globalThis.CustomEvent || function() { return {}; },
  Event: function Event(type, options) { this.type = type; this.bubbles = !!(options && options.bubbles); }
};
vm.createContext(sandbox);

sandbox.window.FarmaciaCatalog = { search: function () { return []; }, selectDrug: function () {}, getSnapshot: function () { return {}; }, loaded: true };

vm.runInContext(fs.readFileSync(catalogPath, 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(commonPath, 'utf8'), sandbox);
if (fs.existsSync(modelPath)) vm.runInContext(fs.readFileSync(modelPath, 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(validacionPath, 'utf8'), sandbox);
for (var di = 0; di < DOMContentLoadedCallbacks.length; di++) { DOMContentLoadedCallbacks[di](); }

const F = sandbox.window.FarmaciaDemo;
const validation = sandbox.window.FarmaciaValidacion;

console.log('\n[Section 2] Validación page keeps and exports the exact ID');
const v6Patient = {
  cip: 'CIP-SYN-366-V6',
  nombre: 'Paciente sintético 366',
  servicio: 'Dermatología',
  servicioSlug: 'dermatologia',
  patologia: 'Hidrosadenitis supurativa (HS)',
  farmaco_solicitado: 'Fármaco solicitado sintético',
  estado: 'ok_farmacia',
  estadoLabel: 'OK Farmacia',
  origen_solicitud: 'enfermeria',
  tipo_origen: 'enfermeria_v6_multisheet',
  source_type: 'ENFERMERIA',
  solicitud_id: 'SOL-DER-000101',
  importSource: 'Excel Enfermería'
};
F.patients[v6Patient.cip] = v6Patient;

function rerunWithContext(context) {
  F.getQueryContext = function () { return context; };
  DOMContentLoadedCallbacks[DOMContentLoadedCallbacks.length - 1]();
}

rerunWithContext({ cip: v6Patient.cip, servicio: 'Derma', servicioSlug: 'dermatologia', patologia: 'HS', patient: v6Patient });
assertEqual(v('fhOrigenEntrada'), 'excel_enfermeria', '2.1 origen = excel_enfermeria');
const exportDataV6 = validation_buildExportData();
assertEqual(exportDataV6.solicitudId, 'SOL-DER-000101', '2.2 export data conserva el ID exacto');
const pageContext = exp.buildContextFromValidacion(null, {
  cip: exportDataV6.cip,
  resultado: exportDataV6.resultadoValidacion,
  solicitudId: exportDataV6.solicitudId
});
const pageRow = exp.buildExcelRowObject(pageContext);
assertEqual(pageRow.solicitud_id, 'SOL-DER-000101', '2.3 fila Excel del acto de Validación transporta el ID');
const v2Input = validation_buildV2Input({});
assertEqual(v2Input.technical.requestId, 'SOL-DER-000101', '2.4 solicitud_id mapea explícitamente a request_id canónico v2');

// Same CIP different request through the page path stays separated
const v6PatientB = Object.assign({}, v6Patient, { solicitud_id: 'SOL-DER-000102' });
rerunWithContext({ cip: v6Patient.cip, servicio: 'Derma', servicioSlug: 'dermatologia', patologia: 'HS', patient: v6PatientB });
assertEqual(validation_buildExportData().solicitudId, 'SOL-DER-000102', '2.5 misma CIP, otra solicitud: el ID visible cambia con la solicitud cargada');

// Enfermería patient without solicitud_id → empty, never invented
const v6NoId = Object.assign({}, v6Patient, { solicitud_id: undefined });
delete v6NoId.solicitud_id;
rerunWithContext({ cip: v6Patient.cip, servicio: 'Derma', servicioSlug: 'dermatologia', patologia: 'HS', patient: v6NoId });
assertEqual(validation_buildExportData().solicitudId, '', '2.6 paciente sin solicitud_id exporta vacío');
const v2NoId = validation_buildV2Input({});
assertEqual(v2NoId.technical.requestId, null, '2.7 ausencia no se mapea a request_id derivado (null)');

// Manual Farmacia origin never exports the ID even if a stale patient carries it
rerunWithContext({ cip: 'CIP-SYN-366-MAN', servicio: 'Derma', servicioSlug: 'dermatologia', patologia: 'HS', entrada: 'validacion', patient: null });
assertEqual(v('fhOrigenEntrada'), 'manual_farmacia', '2.8 origen manual reconocido');
assertEqual(validation_buildExportData().solicitudId, '', '2.9 origen manual exporta solicitud_id vacío');

// ─── Section 3: multisheet legacy FH reading ─────────────────────────────────
console.log('\n[Section 3] Multisheet FH reading (farmacia_common.js legacy path)');
const requireNode = createRequire(import.meta.url);
const XLSX = requireNode(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));
sandbox.XLSX = XLSX;
sandbox.window.XLSX = XLSX;
sandbox.window.FarmaciaBridgeV2Reader = { readWorkbook: function () { return null; } };

function fhServiceSheetRow(cells) { return cells; }

function buildFhWorkbook() {
  const headers = ['cip', 'farmaco', 'tipo_acto_fh', 'resultado_validacion', 'estado_registro', 'solicitud_id'];
  const wb = XLSX.utils.book_new();
  const derma = [
    headers,
    ['CIP-SYN-366-D1', 'Fármaco DER sintético', 'validacion_inicial', 'validado', 'completado', 'SOL-DER-000101'],
    ['CIP-SYN-366-D2', 'Fármaco DER sintético', 'validacion_inicial', 'rechazado', 'completado', 'SOL-DER-000102'],
    ['CIP-SYN-366-D3', 'Fármaco DER sintético', 'primera_visita', '', 'completado', 'SOL-DER-000103'],
    ['CIP-SYN-366-D4', 'Fármaco DER sintético', 'validacion_inicial', 'pendiente', 'pendiente_revision', '']
  ];
  const reuma = [
    headers,
    ['CIP-SYN-366-R1', 'Fármaco REU sintético', 'validacion_inicial', '', 'pendiente_revision', 'SOL-REU-000005']
  ];
  const digestivo = [
    headers,
    ['CIP-SYN-366-G1', 'Fármaco DIG sintético', 'nueva_validacion_adicion', 'denegado', 'completado', 'SOL-DIG-000006']
  ];
  const onco = [
    headers,
    ['CIP-SYN-366-O1', 'Fármaco ONCO sintético', 'validacion_inicial', 'validado', 'completado', 'SOL-ONC-000001']
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(derma), '01_DERMA');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(reuma), '02_REUMA');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(digestivo), '03_DIGESTIVO');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(onco), '04_ONCO');
  return wb;
}

const fhWb = buildFhWorkbook();
const fhState = sandbox.window.FarmaciaDataImports.parseWorkbook('farmacia', fhWb, 'fh_sintetico_366.xlsx');
assertTruthy(fhState, '3.1 parseWorkbook acepta el workbook FH legacy');
assertEqual(fhState.rows.length, 6, '3.2 reúne los 6 registros DER/REU/DIG (04_ONCO no entra)');
const hojas = fhState.rows.map(function (r) { return r.servicio_hoja; });
assert(hojas.indexOf('01_DERMA') !== -1 && hojas.indexOf('02_REUMA') !== -1 && hojas.indexOf('03_DIGESTIVO') !== -1, '3.3 procedencia servicio/hoja preservada (DER/REU/DIG)');
assert(hojas.indexOf('04_ONCO') === -1, '3.4 04_ONCO no se usa para este train (sin nuevo alcance)');
const fhIds = fhState.rows.map(function (r) { return r.solicitud_id; });
assert(fhIds.indexOf('SOL-DER-000101') !== -1 && fhIds.indexOf('SOL-REU-000005') !== -1 && fhIds.indexOf('SOL-DIG-000006') !== -1, '3.5 solicitud_id preservado en lectura multisheet');
assertEqual(fhState.mappedFields.solicitudId, 'solicitud_id', '3.6 solicitud_id mapeado por alias de importación');

const fhCandidates = sandbox.window.FarmaciaDataImports.getImportedPatients();
const candById = {};
fhCandidates.forEach(function (c) { candById[c.cip] = c; });
const candValidado = candById['CIP-SYN-366-D1'];
assertEqual(candValidado.solicitud_id, 'SOL-DER-000101', '3.7 candidato DER conserva solicitud_id');
assertEqual(candValidado.tipo_acto_fh, 'validacion_inicial', '3.8 candidato DER conserva tipo_acto_fh');
assertEqual(candValidado.resultado_validacion, 'validado', '3.9 candidato DER conserva resultado_validacion');
assertEqual(candValidado.estado_registro, 'completado', '3.10 candidato DER conserva estado_registro');
assertEqual(candValidado.servicio_hoja, '01_DERMA', '3.11 candidato DER conserva hoja de procedencia');
const candRechazado = candById['CIP-SYN-366-D2'];
assertEqual(candRechazado.resultado_validacion, 'denegado', '3.12 rechazado legacy se lee como alias de denegado');
const candFirstVisit = candById['CIP-SYN-366-D3'];
assertEqual(candFirstVisit.tipo_acto_fh, 'primera_visita', '3.13 acto no-validación conserva tipo_acto_fh');
assertEqual(candFirstVisit.solicitud_id, 'SOL-DER-000103', '3.14 lectura preserva identidad en filas no-validación (N3 filtra)');
const candPendingNoId = candById['CIP-SYN-366-D4'];
assert(!('solicitud_id' in candPendingNoId) || !candPendingNoId.solicitud_id, '3.15 fila sin solicitud_id no recibe ID');
assertEqual(candPendingNoId.estado, 'pending', '3.16 validación pendiente explícita sigue apareciendo');
const candReumaNoResult = candById['CIP-SYN-366-R1'];
assert(!('resultado_validacion' in candReumaNoResult) || !candReumaNoResult.resultado_validacion, '3.17 sin resultado_validación explícito no se infiere');

// Legacy fallback without FH service sheets: first-sheet behavior unchanged
const legacyWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(legacyWb, XLSX.utils.aoa_to_sheet([['cip', 'farmaco'], ['CIP-SYN-366-L1', 'Fármaco legacy sintético']]), 'Datos');
const legacyState = sandbox.window.FarmaciaDataImports.parseWorkbook('farmacia', legacyWb, 'fh_legacy_366.xlsx');
assertTruthy(legacyState, '3.18 workbook sin hojas de servicio se acepta');
assertEqual(legacyState.sheetName, 'Datos', '3.19 comportamiento legacy de primera hoja preservado');

// ─── Section 4: template contract ─────────────────────────────────────────────
console.log('\n[Section 4] Legacy FH Excel contract (generator)');
const generatorSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'build_excel_template.py'), 'utf8');
assert(generatorSrc.includes('("solicitud_id", "H", "string", False)'), '4.1 generador añade solicitud_id (H, opcional)');
assert(generatorSrc.includes('"resultado_validacion": ["validado", "pendiente", "denegado"]'), '4.2 generador escribe valores canónicos (denegado, no rechazado)');
assert(!generatorSrc.includes('"rechazado"'), '4.3 generador ya no ofrece rechazado como escritura');
const sinteticoSrc = fs.readFileSync(path.join(ROOT, 'tools', 'generate_farmacia_excel_sintetico.py'), 'utf8');
assert(sinteticoSrc.includes('"solicitud_id"'), '4.4 generador sintético incluye solicitud_id');
assert(sinteticoSrc.includes('sol_id,'), '4.5 generador sintético reserva la columna en cada fila');

// ─── Section 5: N4 — Inicio→Validación solicitud_id handoff ───────────────
// Issue #367 N4 of train #364: the imported dataset survives navigation
// (no longer a single-use handoff), the supported context URL carries the
// exact solicitud_id, and the Validación page resolves THAT request —
// same CIP with two distinct requests never collapses. Fail closed:
// unknown ID or CIP mismatch resolves NO patient and never falls back
// by CIP. All data synthetic.
console.log('\n[Section 5] N4 — handoff Inicio→Validación (persistence + exact resolution)');

const N4_HEADERS = ['CIP', 'Paciente', 'Patología', 'Fármaco', 'Fecha alta', 'Analítica', 'Mantoux', 'IGRA',
    'VHB', 'VHC', 'VIH', 'Med. Preventiva', 'Apto para iniciar desde', 'Estado', 'Fecha OK',
    'Observación prebiológico', 'Servicio', 'solicitud_id'];
function n4Row(cip, nombre, sid, estado, servicio) {
    return [cip, nombre, 'Hidradenitis supurativa', 'Adalimumab', '2026-09-01', 'OK', 'NEGATIVO', 'NO PRECISA',
        'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'OK', '2026-09-10', estado, '2026-09-10', 'Demo N4 handoff',
        servicio, sid];
}
const N4_SHARED_CIP = 'CIP-SYN-402-SHARED';
const N4_ID_A = 'SOL-DER-000201';
const N4_ID_B = 'SOL-DER-000202';
const handoffWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(handoffWb, XLSX.utils.aoa_to_sheet([N4_HEADERS,
    n4Row(N4_SHARED_CIP, 'Paciente Sintético A', N4_ID_A, 'OK FARMACIA', 'Dermatología'),
    n4Row(N4_SHARED_CIP, 'Paciente Sintético B', N4_ID_B, 'OK FARMACIA', 'Dermatología')]), 'DERMATOLOGÍA');
XLSX.utils.book_append_sheet(handoffWb, XLSX.utils.aoa_to_sheet([N4_HEADERS,
    n4Row('CIP-SYN-402-R1', 'Paciente Sintético R', 'SOL-REU-000201', 'EN VIGILANCIA', 'Reumatología')]), 'REUMATOLOGÍA');
XLSX.utils.book_append_sheet(handoffWb, XLSX.utils.aoa_to_sheet([N4_HEADERS,
    n4Row('CIP-SYN-402-G1', 'Paciente Sintético G', 'SOL-DIG-000201', 'BLOQUEADO', 'Digestivo')]), 'DIGESTIVO');

const handoffState = sandbox.window.FarmaciaDataImports.parseWorkbook('enfermeria', handoffWb, 'handoff_v6_402.xlsx');
assertTruthy(handoffState, '5.1 parseWorkbook acepta el workbook v6 del handoff');
assertEqual(handoffState.rowCount, 4, '5.2 cuatro registros v6 (2 DER misma CIP + 1 REU + 1 DIG)');

// Dataset persisted in sessionStorage (no longer single-use)
const persistedRaw = sandbox.window.sessionStorage.getItem('farmaciaDemo.enfermeriaImport');
assertTruthy(persistedRaw, '5.3 dataset v6 persistido en sessionStorage (ya no se borra tras la primera lectura)');
const persisted = JSON.parse(persistedRaw || 'null');
assertTruthy(persisted && Array.isArray(persisted.rows), '5.3b snapshot persistido parseable con rows');
const persistedIds = (persisted && persisted.rows ? persisted.rows : []).map(function (r) { return r.solicitud_id; });
assert(persistedIds.indexOf(N4_ID_A) !== -1 && persistedIds.indexOf(N4_ID_B) !== -1, '5.3c ambas solicitudes del mismo CIP persistidas con su identidad');

// Second page load (fresh VM = nueva página) over the SAME session storage:
// the persisted dataset resolves the patient on the destination page.
const sandbox2 = {
    window: Object.assign({
        localStorage: makeStorageMock(),
        sessionStorage: sandbox.window.sessionStorage,
        location: { search: '' },
        setTimeout: globalThis.setTimeout
    }, dom.doc),
    console: console,
    document: dom.doc,
    setTimeout: globalThis.setTimeout,
    location: { search: '' },
    URLSearchParams: function (qs) {
        var params = {};
        var s2 = String(qs || '').replace(/^\?/, '');
        s2.split('&').forEach(function (pair) {
            var parts = pair.split('=');
            if (parts[0]) params[decodeURIComponent(parts[0])] = decodeURIComponent(parts.slice(1).join('=') || '');
        });
        return { get: function (k) { return params[k] || null; }, has: function (k) { return params[k] !== undefined; }, set: function (k, v) { params[k] = String(v); }, toString: function () { return Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&'); } };
    },
    XLSX: { utils: { sheet_to_json: function () { return []; } } },
    CustomEvent: globalThis.CustomEvent || function () { return {}; },
    Event: function Event(type, options) { this.type = type; this.bubbles = !!(options && options.bubbles); }
};
vm.createContext(sandbox2);
sandbox2.window.FarmaciaCatalog = { search: function () { return []; }, selectDrug: function () {}, getSnapshot: function () { return {}; }, loaded: true };
sandbox2.window.FarmaciaBridgeV2Reader = { readWorkbook: function () { return null; } };
vm.runInContext(fs.readFileSync(catalogPath, 'utf8'), sandbox2);
vm.runInContext(fs.readFileSync(commonPath, 'utf8'), sandbox2);
const F2 = sandbox2.window.FarmaciaDemo;
const Imports2 = sandbox2.window.FarmaciaDataImports;
assertTruthy(Imports2.getState('enfermeria'), '5.4 segunda página resuelve el dataset persistido (handoff Inicio→Validación)');
assertEqual(Imports2.getState('enfermeria').rows.length, 4, '5.4b las cuatro solicitudes v6 siguen activas en la página destino');

function ctx2With(query) {
    sandbox2.location.search = query;
    sandbox2.window.location.search = query;
    return F2.getQueryContext();
}

const ctxA = ctx2With('?cip=' + N4_SHARED_CIP + '&solicitud_id=' + N4_ID_A);
assertTruthy(ctxA.patient, '5.5 solicitud A del mismo CIP resuelve paciente en la página destino');
assertEqual(ctxA.patient.solicitud_id, N4_ID_A, '5.5b la solicitud A resuelve SU PROPIO registro');
assertEqual(ctxA.solicitud_id, N4_ID_A, '5.5c el contexto transporta la solicitud_id explícita');

const ctxB = ctx2With('?cip=' + N4_SHARED_CIP + '&solicitud_id=' + N4_ID_B);
assertTruthy(ctxB.patient, '5.6 solicitud B del mismo CIP resuelve paciente');
assertEqual(ctxB.patient.solicitud_id, N4_ID_B, '5.6b la solicitud B resuelve SU PROPIO registro (nunca el de la A)');

const ctxUnknown = ctx2With('?cip=' + N4_SHARED_CIP + '&solicitud_id=SOL-DER-999999');
assertEqual(ctxUnknown.patient, null, '5.7 solicitud_id desconocida → SIN paciente (fail closed, sin fallback por CIP)');
assertEqual(ctxUnknown.status, 'not_found', '5.7b estado del contexto not_found');

const ctxMismatch = ctx2With('?cip=CIP-OTRO-SINTETICO&solicitud_id=' + N4_ID_A);
assertEqual(ctxMismatch.patient, null, '5.8 CIP transportado incoherente con la solicitud → SIN paciente (fail closed)');

// Legacy behavior intact: no solicitud_id in URL → CIP resolution unchanged
const ctxLegacy = ctx2With('?cip=' + N4_SHARED_CIP);
assertTruthy(ctxLegacy.patient, '5.9 sin solicitud_id la resolución por CIP se conserva (comportamiento legacy)');
assert(ctxLegacy.patient.solicitud_id === N4_ID_A || ctxLegacy.patient.solicitud_id === N4_ID_B, '5.9b por CIP resuelve una de las solicitudes (compatibilidad legacy documentada)');

// makeContextUrl transports the request identity (runtime absent in sandbox)
const urlA = F2.makeContextUrl('farmacia_validacion.html', { cip: N4_SHARED_CIP, entrada: 'validacion', solicitud_id: N4_ID_A });
assert(String(urlA).indexOf('farmacia_validacion.html') === 0 && urlA.indexOf('solicitud_id=' + encodeURIComponent(N4_ID_A)) !== -1, '5.10 makeContextUrl transporta solicitud_id: ' + urlA);
const urlNoSid = F2.makeContextUrl('farmacia_validacion.html', { cip: N4_SHARED_CIP, entrada: 'validacion' });
assert(String(urlNoSid).indexOf('solicitud_id=') === -1, '5.11 sin solicitud_id el parámetro no se emite (no hay inferencia): ' + urlNoSid);
const urlAIndex = sandbox.window.FarmaciaDemo.makeContextUrl('farmacia_validacion.html', { cip: N4_SHARED_CIP, solicitud_id: N4_ID_B });
assert(String(urlAIndex).indexOf('solicitud_id=' + encodeURIComponent(N4_ID_B)) !== -1, '5.12 makeContextUrl (página Inicio) transporta la solicitud_id');

// Identity-only resolution with FH acts loaded: the Farmacia act with the
// same ID never shadows the Enfermería request record.
const fhHandoffHeaders = ['cip', 'tipo_acto_fh', 'resultado_validacion', 'estado_registro', 'solicitud_id'];
const fhHandoffWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(fhHandoffWb, XLSX.utils.aoa_to_sheet([fhHandoffHeaders,
    [N4_SHARED_CIP, 'validacion_inicial', 'pendiente', 'pendiente_revision', N4_ID_A]]), 'Datos');
const fhHandoffState = sandbox2.window.FarmaciaDataImports.parseWorkbook('farmacia', fhHandoffWb, 'handoff_fh_402.xlsx');
assertTruthy(fhHandoffState, '5.13 acto Farmacia pendiente cargado en la página destino');
const ctxAWithAct = ctx2With('?cip=' + N4_SHARED_CIP + '&solicitud_id=' + N4_ID_A);
assertTruthy(ctxAWithAct.patient, '5.14 con acto FH cargado la solicitud sigue resolviendo');
assertEqual(ctxAWithAct.patient.solicitud_id, N4_ID_A, '5.13b el acto Farmacia NO sustituye al registro Enfermería de la solicitud');
assert(!ctxAWithAct.patient.tipo_acto_fh, '5.13c el registro resuelto es la solicitud Enfermería (no un acto Farmacia)');

console.log('\nTotal: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
