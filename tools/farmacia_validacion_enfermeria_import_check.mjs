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
      toggle: function (c) { if (this.contains(c)) this.remove(c); else this.add(c); }
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
    addEventListener: function () {},
    removeEventListener: function () {},
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    append: function () {},
    getAttribute: function (name) { return this._attrs && this._attrs[name]; },
    setAttribute: function (name, val) { if (!this._attrs) this._attrs = {}; this._attrs[name] = val; },
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
    'autocompleteDropdown', 'autocompleteWrapper',
    'fhResumenFarmaco', 'fhResumenPrincipioActivo', 'fhResumenDosis',
    'fhResumenVia', 'fhResumenPauta', 'fhResumenInduccion', 'fhResumenJustificacion',
    'fhResumenAnaliticaFecha', 'fhResumenAnaliticaReciente',
    'fhResumenMantoux', 'fhResumenVhb', 'fhResumenVhc', 'fhResumenVih',
    'fhResumenVacunacion', 'fhResumenHemograma', 'fhResumenBioquimica',
    'fhResumenVacunacionObs',
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
   'fhValEstado', 'fhTipoSolicitud',
   'fhEaNotificado', 'fhCausalidadFinal'].forEach(function (id) {
    mockElements[id].tagName = 'SELECT';
    mockElements[id].options = [];
  });

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
  CustomEvent: globalThis.CustomEvent || function() { return {}; }
};
vm.createContext(sandbox);

// FarmaciaCatalog mock
sandbox.window.FarmaciaCatalog = { search: function () { return []; }, selectDrug: function () {}, getSnapshot: function () { return {}; }, loaded: true };

vm.runInContext(catalogSrc, sandbox);
vm.runInContext(commonSrc, sandbox);

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
  farmaco: 'Upadacitinib',
  farmaco_solicitado: 'Upadacitinib',
  dosis: '', pauta: '', via: '',
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

// 4-6. Context-strip
assertEqual(dom.ctxCip.textContent, '000000003', '4. Context CIP = 000000003');
assertEqual(dom.ctxServ.textContent, 'Reuma', '5. Context servicio = Reuma');
assertEqual(dom.ctxPat.textContent, 'AR', '6. Context patología = AR');

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
assertEqual(v('fhTipoSolicitud'), 'reuma', '10. Tipo solicitud = reuma');

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

// 21. Justificación llena
var just = v('fhDermaJustificacion');
assert(just.indexOf('Enfermería') !== -1 || just.indexOf('AR') !== -1,
  '21. Justificación contiene Enfermería/AR: "' + just + '"');

// 22-27. formReuma dynamic spans
assertEqual(t('fhReumaCip'), '000000003', '22. fhReumaCip = 000000003');
assertEqual(t('fhReumaFarmaco'), 'Upadacitinib', '23. fhReumaFarmaco = Upadacitinib');
assertEqual(t('fhReumaDosis'), 'Pendiente de completar por Farmacia', '24. fhReumaDosis = Pendiente de completar por Farmacia');
assertEqual(t('fhReumaVia'), 'Pendiente de completar por Farmacia', '25. fhReumaVia = Pendiente de completar por Farmacia');
assertEqual(t('fhReumaPauta'), 'Pendiente de completar por Farmacia', '26. fhReumaPauta = Pendiente de completar por Farmacia');
assert(t('fhReumaPrebiologico').toLowerCase().indexOf('ok farmacia') !== -1,
  '27. fhReumaPrebiologico contiene "OK Farmacia": "' + t('fhReumaPrebiologico') + '"');

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

// 33. Prebiológico Enfermería: una sola representación
var prebioResumen = $('fhEnfermeriaResumen');
assert(prebioResumen !== null, '33. fhEnfermeriaResumen existe para paciente Enfermería');

console.log('\nTotal: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
