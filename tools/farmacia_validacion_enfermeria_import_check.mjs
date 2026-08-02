#!/usr/bin/env node
// tools/farmacia_validacion_enfermeria_import_check.mjs
// WO8.1c.12 — Verifica hidratación formReuma para Paciente C (Reuma / AR / Upadacitinib)
// sin inferir dosis/vía/pauta, sin innerHTML, sin strings técnicos sueltos.

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];
const DOMContentLoadedCallbacks = [];

function ok(msg) { console.log('  ✓ ' + msg); passed++; }
function fail(msg) { console.log('  ✗ ' + msg); failed++; errors.push(msg); }
function assert(condition, label) { if (condition) ok(label); else fail(label); }
function assertEqual(actual, expected, label) {
  if (actual === expected) ok(label + ': ' + JSON.stringify(expected));
  else fail(label + ': esperado ' + JSON.stringify(expected) + ', recibido ' + JSON.stringify(actual));
}
function assertIncludes(str, substr, label) {
  if (typeof str === 'string' && str.indexOf(substr) !== -1) ok(label);
  else fail(label + ': no contiene "' + substr + '"');
}
function assertNotIncludes(str, substr, label) {
  if (typeof str === 'string' && str.indexOf(substr) === -1) ok(label);
  else fail(label + ': contiene "' + substr + '" (no debía)');
}

// ─── Build mock DOM for validation page ──────────────────────────────────────

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

// ─── Run simulation ──────────────────────────────────────────────────────────
var dom = buildMockDom();

var catalogPath = path.join(ROOT, 'scripts', 'farmacia_pautas_catalog.js');
var commonPath = path.join(ROOT, 'scripts', 'farmacia_common.js');
var validacionPath = path.join(ROOT, 'scripts', 'farmacia_validacion.js');

if (!fs.existsSync(catalogPath) || !fs.existsSync(commonPath) || !fs.existsSync(validacionPath)) {
  console.error('FATAL: scripts no encontrados');
  process.exit(1);
}

var catalogSrc = fs.readFileSync(catalogPath, 'utf8');
var commonSrc = fs.readFileSync(commonPath, 'utf8');
var validacionSrc = fs.readFileSync(validacionPath, 'utf8');

// Load validation model dependency
var modelPath = path.join(ROOT, 'scripts', 'farmacia_validacion_model.js');
var modelSrc = fs.existsSync(modelPath) ? fs.readFileSync(modelPath, 'utf8') : '';

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
    location: { search: '?cip=000000003&servicio=reuma&patologia=AR&entrada=validacion' },
    fetch: globalThis.fetch,
    setTimeout: globalThis.setTimeout,
    dispatchEvent: function () { return true; }
  }, dom.doc),
  console: console,
  document: dom.doc,
  fetch: globalThis.fetch,
  setTimeout: globalThis.setTimeout,
  location: { search: '?cip=000000003&servicio=reuma&patologia=AR&entrada=validacion' },
  URLSearchParams: function (qs) {
    var params = {};
    var s = String(qs || '').replace(/^\?/, '');
    s.split('&').forEach(function (pair) {
      var parts = pair.split('=');
      if (parts[0]) params[decodeURIComponent(parts[0])] = decodeURIComponent(parts.slice(1).join('=') || '');
    });
    return { get: function (k) { return params[k] || null; }, has: function (k) { return params[k] !== undefined; } };
  },
  XLSX: { utils: { sheet_to_json: function () { return []; } } },
  CustomEvent: globalThis.CustomEvent || function() { return {}; },
  Event: function Event(type, options) { this.type = type; this.bubbles = !!(options && options.bubbles); }
};
vm.createContext(sandbox);

// FarmaciaCatalog mock
sandbox.window.FarmaciaCatalog = { search: function () { return []; }, selectDrug: function () {}, getSnapshot: function () { return {}; }, loaded: true };

vm.runInContext(catalogSrc, sandbox);
vm.runInContext(commonSrc, sandbox);

// Real validation HTML does not load farmacia_tratamiento_common.js. Load a synthetic
// dual catalog through FarmaciaCatalog exactly as the page does.
sandbox.XLSX = {
  read: function () {
    return { Sheets: {
      CATALOGO_CIMA: { rows: [
        { codigo_nacional: '710001', nregistro: 'SYN/VAL/A', nombre_comercial: 'Producto Validado A', principio_activo: 'Activo A', nombre_presentacion: '100 mg pluma', dosis_presentacion: '100 mg', via: 'VÍA SUBCUTÁNEA' },
        { codigo_nacional: '710002', nregistro: 'SYN/VAL/B', nombre_comercial: 'Producto Validado B', principio_activo: 'Activo B', nombre_presentacion: '200 mg vial', dosis_presentacion: '200 mg', via: 'VÍA INTRAMUSCULAR' },
        { codigo_nacional: '710003', nregistro: 'SYN/VAL/C', nombre_comercial: 'Producto Validado C', principio_activo: 'Activo C', nombre_presentacion: '300 mg parche', dosis_presentacion: '300 mg', via: 'VÍA TRANSDÉRMICA' }
      ] },
      CATALOGO_LOCAL_ESPECIAL: { rows: [] }
    } };
  },
  utils: { sheet_to_json: function (sheet) { return sheet.rows; } }
};
sandbox.window.FarmaciaCatalog.loadFromExcel(new ArrayBuffer(0));

var F = sandbox.window.FarmaciaDemo;

// Inject Enfermería patients
var enfPatientC = {
  cip: '000000003',
  nombre: 'Paciente C',
  servicio: 'Reuma',
  servicioSlug: 'reumatologia',
  servicio_origen: 'Reuma',
  patologia: 'AR',
  patologia_indicacion: 'AR',
  farmaco: 'Fármaco genérico no solicitado',
  rawImport: { farmaco_solicitado: 'Upadacitinib' },
  dosis: '', pauta: '', via: '', induccion: 'Sí', justificacion: 'No debe inferirse',
  analitica_estado: 'OK',
  mantoux_estado: 'NEGATIVO',
  igra_estado: 'NEGATIVO',
  vhb_estado: 'NEGATIVO',
  vhc_estado: 'NEGATIVO',
  vih_estado: 'NEGATIVO',
  medicina_preventiva_estado: 'OK',
  estado_prebiologico_enfermeria: 'OK FARMACIA',
  estado: 'ok_farmacia',
  estadoLabel: 'OK Farmacia',
  origen_solicitud: 'enfermeria',
  tipo_origen: 'enfermeria_inicio_biologico',
  source_type: 'ENFERMERIA',
  fecha_ok_farmacia: '2026-06-12',
  observaciones_prebiologico: '',
  importSource: 'Excel Enfermería'
};
F.patients['000000003'] = enfPatientC;

// Demo patient FH-002 demo
F.patients['CIP-DEMO-FH-002'] = {
  cip: 'CIP-DEMO-FH-002',
  nombre: 'Paciente Demo FH-002',
  servicio: 'Derma',
  patologia: 'Hidradenitis supurativa',
  farmaco: 'Cosentyx',
  dosis: '300 mg', via: 'SC', pauta: 'Cada 4 semanas',
  estado: 'pending', estadoLabel: 'Pendiente'
};

// Mock FarmaciaDataImports
sandbox.window.FarmaciaDataImports = {
  getImportedPatients: function () { return [enfPatientC]; },
  findImportedPatientByCip: function (cip) {
    return cip === '000000003' ? enfPatientC : null;
  }
};

// Load validation model in sandbox
if (modelSrc) vm.runInContext(modelSrc, sandbox);

vm.runInContext(validacionSrc, sandbox);
// Fire DOMContentLoaded
for (var di = 0; di < DOMContentLoadedCallbacks.length; di++) { DOMContentLoadedCallbacks[di](); }

// ─── Tests ───────────────────────────────────────────────────────────────────
console.log('');
console.log('=== WO8.1c.12 — Validación desde Enfermería / formReuma ===');

function $(id) { return dom.elements[id]; }
function v(id) { var e = $(id); return e ? e.value : ''; }
function t(id) { var e = $(id); return e ? e.textContent : ''; }

// 1-3. Basic field values from Enfermería
assertEqual(v('fhDermaCip'), '000000003', '1. CIP = 000000003');
assertEqual(v('fhDermaPatologia'), 'AR', '2. Patología = AR');
assertEqual(v('fhDermaFarmaco'), 'Upadacitinib', '3. Fármaco = Upadacitinib');
assertEqual(v('fhValidadoFarmaco'), '', '3b. Fármaco validado permanece vacío');

// 4-6. Contexto explícito de origen
assertEqual(v('fhDermaCip'), '000000003', '4. Contexto conserva CIP');
assertEqual(v('fhDermaServicioOrigen'), 'Reuma', '5. Contexto conserva servicio');
assertEqual(v('fhDermaPatologia'), 'AR', '6. Contexto conserva patología');

// 7-9. Header / Servicio no son Dermatología
var headerText = '';
if (dom.dermaTitle.children && dom.dermaTitle.children.length > 1) {
  var lastChild = dom.dermaTitle.children[dom.dermaTitle.children.length - 1];
  headerText = lastChild && lastChild.textContent ? lastChild.textContent : '';
} else {
  headerText = dom.dermaTitle.textContent;
}
assertNotIncludes(headerText, 'Dermatología', '7. Header NO contiene "Dermatología"');
assertIncludes(headerText, 'Reuma', '8. Header contiene "Reuma"');
assertEqual(v('fhDermaServicioOrigen'), 'Reuma', '9. Servicio readonly = Reuma');

// 10. Modo
assertEqual(v('fhOrigenEntrada'), 'excel_enfermeria', '10. Origen = excel_enfermeria');

// 11-15. Chip values
assertEqual(v('fhAnaliticaMantoux'), 'Negativo', '11. Mantoux = Negativo');
assertEqual(v('fhAnaliticaSerologiasVhb'), 'Negativo', '12. VHB = Negativo');
assertEqual(v('fhAnaliticaSerologiasVhc'), 'Negativo', '13. VHC = Negativo');
assertEqual(v('fhAnaliticaSerologiasVih'), 'Negativo', '14. VIH = Negativo');
assertEqual(v('fhAnaliticaVacunacion'), 'si', '15. Med. Preventiva = si');

// 16-19. Validation / default fields empty
assertEqual(v('fhValEstado'), '', '16. Estado validación vacío');
assertEqual(v('fhValCita'), '', '17. Fecha cita vacío');
assertEqual(v('fhValObservaciones'), '', '18. Observaciones vacío');
assertEqual(v('fhDermaPeso'), '', '19. Peso vacío');

// 20. No demo CIP
assertNotIncludes(v('fhDermaCip'), 'CIP-DEMO', '20. No CIP demo');

// 21. Sin inferencia terapéutica desde el contexto importado
assertEqual(v('fhDermaJustificacion'), '', '21. Justificación no inferida');

// 22-27. formReuma dynamic spans
assertEqual(t('fhReumaCip'), '000000003', '22. fhReumaCip = 000000003');
assertEqual(t('fhReumaFarmaco'), 'Upadacitinib', '23. fhReumaFarmaco = Upadacitinib');
assertEqual(t('fhSolicitadoFarmaco'), 'Upadacitinib', '23b. Resumen solicitado usa farmaco_solicitado explícito');
assertEqual(t('fhSolicitadoInduccion'), '—', '23c. Resumen solicitado no infiere inducción');
assertEqual(t('fhSolicitadoJustificacion'), '—', '23d. Resumen solicitado no infiere justificación');
assertEqual(t('fhReumaDosis'), 'Pendiente de completar por Farmacia', '24. fhReumaDosis = Pendiente de completar por Farmacia');
assertEqual(t('fhReumaVia'), 'Pendiente de completar por Farmacia', '25. fhReumaVia = Pendiente de completar por Farmacia');
assertEqual(t('fhReumaPauta'), 'Pendiente de completar por Farmacia', '26. fhReumaPauta = Pendiente de completar por Farmacia');
// 28. innerHTML count in validacion.js
var vSrc = fs.readFileSync(validacionPath, 'utf8');
var ic = (vSrc.match(/innerHTML/g) || []).length;
assert(ic <= 2, '28. innerHTML en validacion.js: ' + ic + ' (max 2)');

// 29. No loose English status strings in rendered formReuma spans
var looseEnglish = /\b(unknown|pending|complete|blocked)\b/i;
var reumaSpanIds = [
  'fhReumaCip', 'fhReumaPatologia', 'fhReumaIndicacion', 'fhReumaOrigen',
  'fhReumaFecha', 'fhReumaFarmaco', 'fhReumaDosis', 'fhReumaVia',
  'fhReumaPauta', 'fhReumaPrebiologico'
];
var hasLoose = false;
var foundLoose = '';
for (var ri = 0; ri < reumaSpanIds.length; ri++) {
  var txt = t(reumaSpanIds[ri]);
  if (looseEnglish.test(txt)) {
    hasLoose = true;
    foundLoose = reumaSpanIds[ri] + ': "' + txt + '"';
    break;
  }
}
assert(!hasLoose, '29. No "unknown"/"pending"/"complete"/"blocked" sueltos en spans Reuma' + (foundLoose ? ' (' + foundLoose + ')' : ''));

// 30. modSeguimientoEaHandoff remains hidden
assert($('modSeguimientoEaHandoff').classList.contains('hidden'),
  '30. modSeguimientoEaHandoff tiene class hidden');

// 31-32. Campos Derma vacíos para Reuma Enfermería
assert(v('fhDermaDosis') === '', '31. Dosis no inferida desde Enfermería');
assert(v('fhDermaVia') === '', '32. Vía no inferida desde Enfermería');
assertEqual(v('fhDermaPauta'), '', '32b. Pauta no inferida desde Enfermería');
assertEqual(v('fhDermaInduccion'), '', '32c. Inducción no inferida desde Enfermería');
$('fhDermaInduccion').value = 'si';
assertEqual(sandbox.window.FarmaciaValidacion.buildValidationV2Input({}).requestedTreatment.inductionStatus, null, '32ca. Reuma ignora el control de inducción Derma oculto');
$('fhDermaInduccion').value = '';
assertEqual(v('fhValidadoDosis'), '', '32d. Dosis validada vacía');
assertEqual(v('fhValidadoVia'), '', '32e. Vía validada vacía');
assertEqual(v('fhValidadoPauta'), '', '32f. Pauta validada vacía');
assertEqual(v('fhValidadoPresentacion'), '', '32g. Presentación validada vacía');
var requestedSearchBody = (vSrc.match(/function handleAutocompleteInput\(\)[\s\S]*?^    \}/m) || [''])[0];
var validatedSearchBody = (vSrc.match(/function handleValidadoAutocompleteInput\(\)[\s\S]*?^    \}/m) || [''])[0];
assert(!requestedSearchBody.includes('updateValidationModuleSummaries') && !validatedSearchBody.includes('updateValidationModuleSummaries'), '32h. Escribir/buscar no precarga otros campos');
var validatedSelectionBody = (vSrc.match(/function selectValidadoDrug\(drug\)[\s\S]*?^    \}/m) || [''])[0];
assert(!validatedSelectionBody.includes('fhValidadoPauta') && !validatedSelectionBody.includes('fhValidadoInduccion'), '32i. Selección validada no propone pauta ni inducción');

// Real validated autocomplete path with exactly the scripts loaded by farmacia_validacion.html.
assertEqual(typeof sandbox.window.FarmaciaTratamiento, 'undefined', '32j. Sandbox no carga FarmaciaTratamiento');
$('fhDermaDosis').value = '';
$('fhDermaVia').value = '';
$('fhDermaPauta').value = 'Pauta solicitada profesional';
$('fhDermaInduccion').value = 'no';
$('fhDermaFarmaco').value = 'Producto Validado A';
$('fhDermaFarmaco').dispatchEvent({ type: 'input' });
$('autocompleteDropdown').firstChild.dispatchEvent({ type: 'click' });
assertEqual(v('fhDermaFarmaco'), 'Producto Validado A', '32ja. Click solicitado aplica identidad');
assertEqual(v('fhDermaPrincipioActivo'), 'Activo A', '32jb. Click solicitado aplica principio activo');
assertEqual(v('fhDermaDosis'), '100 mg', '32jc. Click solicitado propone dosis');
assertEqual(v('fhDermaVia'), 'SC', '32jd. Click solicitado propone vía');
assertEqual(v('fhDermaPauta'), 'Pauta solicitada profesional', '32je. Click solicitado mantiene pauta');
assertEqual(v('fhDermaInduccion'), 'no', '32jf. Click solicitado mantiene inducción');
$('fhDermaVia').value = '';
$('fhDermaFarmaco').value = 'Producto Validado B';
$('fhDermaFarmaco').dispatchEvent({ type: 'input' });
$('autocompleteDropdown').firstChild.dispatchEvent({ type: 'click' });
assertEqual(v('fhDermaVia'), 'Otra', '32jfa. Ruta IM no soportada se representa como Otra en solicitado');
var requestedImSnapshot = sandbox.window.FarmaciaCatalog.getSnapshot({ slot: 'validacion.solicitado', cip: '000000003' });
assertEqual(requestedImSnapshot.proposal_values.via, 'Otra', '32jfb. Solicitado almacena provenance visible Otra');
$('fhDermaFarmaco').value = 'Producto Validado A';
$('fhDermaFarmaco').dispatchEvent({ type: 'input' });
$('autocompleteDropdown').firstChild.dispatchEvent({ type: 'click' });
assertEqual(v('fhDermaVia'), 'SC', '32jfc. Otra propuesta en solicitado se actualiza después');
$('fhDermaDosis').value = 'Dosis solicitada manual';
$('fhDermaVia').value = 'Oral';
$('fhDermaFarmaco').value = 'Producto Validado B';
$('fhDermaFarmaco').dispatchEvent({ type: 'input' });
$('autocompleteDropdown').firstChild.dispatchEvent({ type: 'click' });
assertEqual(v('fhDermaFarmaco'), 'Producto Validado B', '32jg. Segunda selección solicitada reemplaza identidad');
assertEqual(v('fhDermaPrincipioActivo'), 'Activo B', '32jh. Segunda selección solicitada reemplaza principio activo');
assertEqual(v('fhDermaDosis'), 'Dosis solicitada manual', '32ji. Segunda selección solicitada preserva dosis manual');
assertEqual(v('fhDermaVia'), 'Oral', '32jj. Segunda selección solicitada preserva vía manual');
assertEqual(v('fhDermaPauta'), 'Pauta solicitada profesional', '32jk. Segunda selección solicitada mantiene pauta');
assertEqual(v('fhDermaInduccion'), 'no', '32jl. Segunda selección solicitada mantiene inducción');
$('fhValidadoPauta').value = 'Pauta profesional';
$('fhValidadoInduccion').value = 'si';
$('fhValEstado').value = 'pending';
$('fhValidadoFarmaco').value = 'Producto Validado A';
$('fhValidadoFarmaco').dispatchEvent({ type: 'input' });
assert($('autocompleteValidadoDropdown').firstChild, '32k. Autocomplete validado renderiza resultado CIMA real normalizado');
$('autocompleteValidadoDropdown').firstChild.dispatchEvent({ type: 'click' });
assertEqual(v('fhValidadoFarmaco'), 'Producto Validado A', '32l. Click aplica identidad comercial');
assertEqual(v('fhValidadoPrincipioActivo'), 'Activo A', '32m. Click aplica principio activo');
assertEqual(v('fhValidadoPresentacion'), '100 mg pluma', '32n. Click propone presentación');
assertEqual(v('fhValidadoDosis'), '100 mg', '32o. Click propone dosis');
assertEqual(v('fhValidadoVia'), 'SC', '32p. Click propone vía');
assertEqual(v('fhValidadoPauta'), 'Pauta profesional', '32q. Click no modifica pauta profesional');
assertEqual(v('fhValidadoInduccion'), 'si', '32r. Click no modifica inducción');
assertEqual(v('fhValEstado'), 'pending', '32s. Click no modifica estado de validación');
$('fhValidadoVia').value = '';
$('fhValidadoFarmaco').value = 'Producto Validado B';
$('fhValidadoFarmaco').dispatchEvent({ type: 'input' });
$('autocompleteValidadoDropdown').firstChild.dispatchEvent({ type: 'click' });
assertEqual(v('fhValidadoVia'), 'IM', '32sa. Ruta IM prefijada se representa en select validado');
$('fhValidadoVia').value = '';
$('fhValidadoFarmaco').value = 'Producto Validado C';
$('fhValidadoFarmaco').dispatchEvent({ type: 'input' });
$('autocompleteValidadoDropdown').firstChild.dispatchEvent({ type: 'click' });
assertEqual(v('fhValidadoVia'), 'Otra', '32sb. Ruta desconocida se representa como Otra');
var unknownRouteSnapshot = sandbox.window.FarmaciaCatalog.getSnapshot({ slot: 'validacion.validado', cip: '000000003' });
assert(!unknownRouteSnapshot || unknownRouteSnapshot.proposal_values.via === 'Otra', '32sc. Provenance, cuando persiste, almacena el valor visible Otra');
$('fhValidadoVia').value = '';
$('fhValidadoFarmaco').value = 'Producto Validado A';
$('fhValidadoFarmaco').dispatchEvent({ type: 'input' });
$('autocompleteValidadoDropdown').firstChild.dispatchEvent({ type: 'click' });
assertEqual(v('fhValidadoVia'), 'SC', '32sd. Otra aún propuesta se actualiza en selección posterior');
$('fhValidadoPresentacion').value = 'Presentación profesional';
$('fhValidadoDosis').value = 'Dosis profesional';
$('fhValidadoVia').value = 'Oral';
$('fhValidadoFarmaco').value = 'Producto Validado B';
$('fhValidadoFarmaco').dispatchEvent({ type: 'input' });
$('autocompleteValidadoDropdown').firstChild.dispatchEvent({ type: 'click' });
assertEqual(v('fhValidadoFarmaco'), 'Producto Validado B', '32t. Segunda selección reemplaza identidad');
assertEqual(v('fhValidadoPrincipioActivo'), 'Activo B', '32u. Segunda selección reemplaza principio activo');
assertEqual(v('fhValidadoPresentacion'), 'Presentación profesional', '32v. Segunda selección preserva presentación manual');
assertEqual(v('fhValidadoDosis'), 'Dosis profesional', '32w. Segunda selección preserva dosis manual');
assertEqual(v('fhValidadoVia'), 'Oral', '32x. Segunda selección preserva vía manual');
assertEqual(v('fhValidadoPauta'), 'Pauta profesional', '32y. Segunda selección mantiene pauta');
assertEqual(v('fhValidadoInduccion'), 'si', '32z. Segunda selección mantiene inducción');
assertEqual(v('fhValEstado'), 'pending', '32aa. Segunda selección mantiene estado');

// 33. Prebiológico Enfermería: una sola representación
var prebioResumen = $('fhEnfermeriaResumen');
assert(prebioResumen !== null, '33. fhEnfermeriaResumen existe para paciente Enfermería');

function rerunWithContext(context) {
  [
    'fhDermaCip', 'fhDermaPatologia', 'fhDermaFarmaco', 'fhDermaDosis',
    'fhDermaVia', 'fhDermaPauta', 'fhDermaInduccion', 'fhDermaJustificacion',
    'fhValidadoFarmaco', 'fhValidadoDosis', 'fhValidadoVia', 'fhValidadoPauta',
    'fhValidadoInduccion', 'fhValidadoPresentacion', 'fhManualCip'
  ].forEach(function (id) { if ($(id)) $(id).value = ''; });
  F.getQueryContext = function () { return context; };
  DOMContentLoadedCallbacks[DOMContentLoadedCallbacks.length - 1]();
}

var enfWithoutRequestedDrug = {
  cip: '000000004', servicio: 'Reuma', servicioSlug: 'reumatologia',
  patologia: 'AR', farmaco: 'Fallback no explícito', farmaco_solicitado: '',
  origen_solicitud: 'enfermeria', tipo_origen: 'enfermeria_inicio_biologico',
  source_type: 'ENFERMERIA'
};
rerunWithContext({ cip: '000000004', servicio: 'Reuma', servicioSlug: 'reumatologia', patologia: 'AR', patient: enfWithoutRequestedDrug });
assertEqual(v('fhDermaFarmaco'), '', '34. Enfermería sin fármaco explícito mantiene solicitado vacío');
assertEqual(v('fhValidadoFarmaco'), '', '35. Enfermería sin fármaco explícito mantiene validado vacío');

rerunWithContext({ cip: 'CIP-GUIADO-001', servicio: 'Reuma', servicioSlug: 'reumatologia', patologia: 'AR', entrada: 'validacion', patient: null });
assertEqual(v('fhManualCip'), 'CIP-GUIADO-001', '36. Inicio guiado conserva CIP');
assertEqual(v('fhServicioManual'), 'reuma', '37. Inicio guiado conserva servicio');
assertEqual(v('fhPatologiaManual'), 'AR', '38. Inicio guiado conserva patología');
assertEqual(v('fhOrigenEntrada'), 'manual_farmacia', '39. Inicio guiado conserva origen seguro');
assertEqual(v('fhManualFarmaco'), '', '40. Inicio guiado no infiere fármaco solicitado');
assertEqual(v('fhValidadoFarmaco'), '', '41. Inicio guiado no infiere fármaco validado');
assertEqual(v('fhManualDosis'), '', '42. Inicio guiado no infiere dosis');
assertEqual(v('fhManualVia'), '', '43. Inicio guiado no infiere vía');
assertEqual(v('fhManualPauta'), '', '44. Inicio guiado no infiere pauta');
assert(!$('formServicioManual').classList.contains('hidden'), '45. Flujo manual Farmacia sigue visible');
assert(!$('formManualSolicitud').classList.contains('hidden'), '46. Flujo manual Farmacia sigue operativo con contexto completo');

var reumaSchedulePatient = {
  cip: 'CIP-REUMA-SCHEDULE-SYN', servicio: 'Reuma', servicioSlug: 'reumatologia', patologia: 'AR',
  farmaco_solicitado: 'Tratamiento solicitado sintético', dosis: '40 mg', via: 'SC', pauta: 'Cada 2 semanas',
  origen_solicitud: 'enfermeria', tipo_origen: 'enfermeria_inicio_biologico', source_type: 'ENFERMERIA', estado: 'pending'
};
rerunWithContext({ cip: reumaSchedulePatient.cip, servicio: 'Reuma', servicioSlug: 'reumatologia', patologia: 'AR', patient: reumaSchedulePatient });
$('fhValidadoPrincipioActivo').value = '';
$('fhValidadoJustificacion').value = '';
$('fhValidatedTreatmentRelation').value = '';
var knownReumaScheduleInput = sandbox.window.FarmaciaValidacion.buildValidationV2Input({});
assertEqual(knownReumaScheduleInput.requestedTreatment.scheduleCode, 'CADA_2_SEMANAS', '47. Pauta Reuma reconocida conserva código canónico');
assertEqual(knownReumaScheduleInput.requestedTreatment.scheduleLabel, 'Cada 2 semanas', '48. Pauta Reuma reconocida conserva label canónico');
assertEqual(knownReumaScheduleInput.requestedTreatment.scheduleOtherText, null, '49. Pauta Reuma reconocida no inventa texto OTRO');
assert(sandbox.window.FarmaciaValidacion.applyRequestedAsValidatedExplicitly(), '50. Acción explícita copia pauta Reuma reconocida');
$('fhValidadoPauta').selectedIndex = $('fhValidadoPauta').options.findIndex(function (option) { return option.value === 'CADA_2_SEMANAS'; });
var knownReumaCopiedInput = sandbox.window.FarmaciaValidacion.buildValidationV2Input({});
assertEqual(v('fhValidadoPauta'), 'CADA_2_SEMANAS', '51. Validado recibe código de pauta Reuma');
assertEqual(knownReumaCopiedInput.validatedTreatment.scheduleLabel, 'Cada 2 semanas', '52. Validado reconstruye el mismo label Reuma');
assertEqual(knownReumaCopiedInput.decision.validatedTreatmentRelation, 'same_as_requested', '53. Copia Reuma fija same_as_requested');

reumaSchedulePatient = Object.assign({}, reumaSchedulePatient, { cip: 'CIP-REUMA-SCHEDULE-OTHER-SYN', pauta: 'Cada 17 días según protocolo sintético' });
rerunWithContext({ cip: reumaSchedulePatient.cip, servicio: 'Reuma', servicioSlug: 'reumatologia', patologia: 'AR', patient: reumaSchedulePatient });
$('fhValidadoPrincipioActivo').value = '';
$('fhValidatedTreatmentRelation').value = '';
var otherReumaScheduleInput = sandbox.window.FarmaciaValidacion.buildValidationV2Input({});
assertEqual(otherReumaScheduleInput.requestedTreatment.scheduleCode, 'OTRO', '54. Pauta Reuma no reconocida usa OTRO');
assertEqual(otherReumaScheduleInput.requestedTreatment.scheduleLabel, reumaSchedulePatient.pauta, '55. Pauta Reuma OTRO preserva label explícito');
assertEqual(otherReumaScheduleInput.requestedTreatment.scheduleOtherText, reumaSchedulePatient.pauta, '56. Pauta Reuma OTRO preserva texto reversible');
assert(sandbox.window.FarmaciaValidacion.applyRequestedAsValidatedExplicitly(), '57. Acción explícita copia pauta Reuma OTRO');
var otherReumaCopiedInput = sandbox.window.FarmaciaValidacion.buildValidationV2Input({});
assertEqual(v('fhValidadoPauta'), 'OTRO', '58. Validado recibe OTRO para pauta Reuma libre');
assertEqual(v('fhValidadoPautaOtro'), reumaSchedulePatient.pauta, '59. Validado conserva texto Reuma libre');
assertEqual(otherReumaCopiedInput.validatedTreatment.scheduleLabel, reumaSchedulePatient.pauta, '60. Validado reconstruye label OTRO coherente');

console.log('\nTotal: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
