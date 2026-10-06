#!/usr/bin/env node
// tools/farmacia_inicio_compacto_check.mjs
// WO #550 (issue #550) — focal deterministic acceptance checker for the
// compact `Inicio` surface (farmacia_index.html + scripts/farmacia_index.js).
//
// What it proves, without touching product code:
//   1. Inicio carries a three-card resumen section and nothing else where
//      the old pending boards / quick-access grid used to be: no
//      enfermeriaBoard / pendingValidationBoard mounts, no
//      pending-validation-card markup, no action-grid, no
//      `Accesos rápidos`, no stale `Actividad del servicio` /
//      `Indicadores operativos` copy.
//   2. Card 1 (`Solicitudes pendientes`) shows ONLY the four #549 counts
//      (total / Listas para validación / En vigilancia / Bloqueadas) plus
//      the `Ver pendientes` CTA to farmacia_actividad_servicio.html, and no
//      patient/CIP preview inside the card.
//   3. Cards 2/3 (`Renovaciones de receta`, `Recogidas pendientes`) show
//      `?` + `Próxima fase`, carry no href/navigation/handler, and are
//      never touched by the page script (no runtime renewal/recogida
//      handler, no fabricated data).
//   4. No second classifier: the page script reuses the published
//      classifyEnfermeriaState (each explicit category token appears
//      exactly once in scripts/farmacia_index.js); the broad
//      importSource predicate (isEnfermeriaPatient) and the removed-card
//      relabel helper (pendingSourceLabel) are gone from the page script.
//   5. Parity oracle: the rendered Inicio summary equals the #549 queue
//      semantics observed independently — union of the two published
//      Inicio trays (identity de-duplicated) for the total, and the
//      published Enfermería board group headers (rendered from the same
//      page script in the same vm, a second independent code path) for
//      the three category counters. Tray-E boundary holds: a G-only
//      Enfermería-ish OK_FARMACIA row counts only in total; an
//      importSource-only non-OK row belongs nowhere.
//   6. Re-render + synthetic `farmacia:data-imported` events update the
//      summary without ever growing individual cards; empty population
//      zeroes every counter.
//   7. Preserve-exactly: sidebar/central search, known/unknown CIP paths,
//      FH-004 demo card, Excel import capability, sidebar Dashboard
//      Paciente, sidebar Pendientes href.
//
// Ejecutar: node tools/farmacia_inicio_compacto_check.mjs

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
let failed = 0;
const failures = [];

function pass(name) { passed += 1; console.log(`PASS ${name}`); }
function fail(name, detail) {
  failed += 1;
  failures.push(`${name}: ${detail || ''}`);
  console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`);
}
function check(name, condition, detail) { condition ? pass(name) : fail(name, detail); }

function readFile(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

// ─── Part A. Static file assertions ──────────────────────────────────────────

const indexHtml = readFile('farmacia_index.html');
const indexSrc = readFile('scripts/farmacia_index.js');

check('inicio resumen section exists with the three compact cards',
  indexHtml.indexOf('id="inicioResumen"') !== -1
  && indexHtml.indexOf('id="inicioSolicitudesCard"') !== -1
  && indexHtml.indexOf('id="inicioRenovacionesCard"') !== -1
  && indexHtml.indexOf('id="inicioRecogidasCard"') !== -1);
check('card 1 carries exactly the four count mounts plus the CTA',
  indexHtml.indexOf('id="inicioTotalCount"') !== -1
  && indexHtml.indexOf('id="inicioListasCount"') !== -1
  && indexHtml.indexOf('id="inicioVigilanciaCount"') !== -1
  && indexHtml.indexOf('id="inicioBloqueadasCount"') !== -1
  && indexHtml.indexOf('id="inicioVerPendientes"') !== -1);
{
  const card1 = indexHtml.slice(
    indexHtml.indexOf('id="inicioSolicitudesCard"'),
    indexHtml.indexOf('id="inicioRenovacionesCard"'));
  const hrefs = card1.match(/href="/g) || [];
  check('card 1 exposes exactly one navigation target (the CTA)',
    hrefs.length === 1 && card1.indexOf('href="farmacia_actividad_servicio.html"') !== -1,
    `${hrefs.length} href(s) in card 1`);
  check('card 1 CTA reads Ver pendientes',
    card1.indexOf('Ver pendientes') !== -1);
}
check('removed Inicio boards are gone (no mounts, no card markup)',
  indexHtml.indexOf('id="enfermeriaBoard"') === -1
  && indexHtml.indexOf('id="pendingValidationBoard"') === -1
  && indexHtml.indexOf('pending-validation-card') === -1
  && indexHtml.indexOf('id="enfermeriaBoardCards"') === -1
  && indexHtml.indexOf('id="pendingValidationCards"') === -1);
check('redundant quick-access grid is gone',
  indexHtml.indexOf('action-grid') === -1
  && indexHtml.indexOf('Accesos rápidos') === -1
  && indexHtml.indexOf('action-card__title') === -1);
check('stale Actividad/Indicadores copy is gone from Inicio',
  indexHtml.indexOf('Actividad del servicio') === -1
  && indexHtml.indexOf('Indicadores operativos') === -1);
for (const cardId of ['inicioRenovacionesCard', 'inicioRecogidasCard']) {
  const block = indexHtml.slice(
    indexHtml.indexOf(`id="${cardId}"`),
    indexHtml.indexOf('</article>', indexHtml.indexOf(`id="${cardId}"`)));
  check(`${cardId} shows ? with no navigation or handler`,
    block.indexOf('>?<') !== -1
    && block.indexOf('Próxima fase') !== -1
    && block.indexOf('href=') === -1
    && block.indexOf('<a ') === -1
    && block.indexOf('<button') === -1
    && block.indexOf('onclick') === -1);
}
check('page script never touches the future cards (no renewal/recogida runtime)',
  indexSrc.indexOf('inicioRenovaciones') === -1
  && indexSrc.indexOf('inicioRecogidas') === -1
  && indexSrc.indexOf('Renovaci') === -1
  && indexSrc.indexOf('Recogida') === -1
  && indexSrc.indexOf('PENDIENTE_RECOGIDA') === -1);
const indexSrcCode = indexSrc
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\s)\/\/[^\n]*/g, '$1');
check('page script has no second classifier (each explicit category token once)',
  (indexSrcCode.match(/OK_FARMACIA/g) || []).length === 1
  && (indexSrcCode.match(/EN_VIGILANCIA/g) || []).length === 1
  && (indexSrcCode.match(/BLOQUEADO/g) || []).length === 1,
  'classifyEnfermeriaState is the single classification site');
check('page script reuses the published classifier for the resumen',
  indexSrc.indexOf('classifyEnfermeriaState(patient)') !== -1
  && indexSrc.indexOf('function renderInicioResumen') !== -1
  && indexSrc.indexOf('function readInicioResumen') !== -1);
check('broad importSource predicate and removed-card relabel helper are gone',
  indexSrc.indexOf('isEnfermeriaPatient') === -1
  && indexSrc.indexOf('pendingSourceLabel') === -1
  && indexSrc.indexOf('renderPendingValidationBoard') === -1
  && indexSrc.indexOf('renderPrebioBlock') === -1);
check('page script gates every Enfermería decision on the published tray-E seam',
  indexSrc.indexOf('getEnfermeriaVisiblePatients') !== -1);
check('page script consumes the published sync population reads',
  indexSrc.indexOf('readAvailablePatientsSync') !== -1
  && indexSrc.indexOf('readPendingValidationPatientsSync') !== -1);
check('preserve-exactly: sidebar + central search mounts intact',
  indexHtml.indexOf('id="patientSearch"') !== -1
  && indexHtml.indexOf('id="fhCipInput"') !== -1
  && indexHtml.indexOf('id="fhSearchBtn"') !== -1
  && indexHtml.indexOf('id="guidedIntakePanel"') !== -1);
check('preserve-exactly: FH-004 demo card intact',
  indexHtml.indexOf('id="demoCaseFh004"') !== -1
  && indexHtml.indexOf('cip=CIP-DEMO-FH-004') !== -1);
check('preserve-exactly: Excel import stays accessible',
  indexHtml.indexOf('id="modCargaDatosProyecto"') !== -1
  && indexHtml.indexOf('id="btnCargarExcelEnfermeria"') !== -1
  && indexHtml.indexOf('id="inputExcelEnfermeria"') !== -1
  && indexHtml.indexOf('id="btnCargarExcelFarmacia"') !== -1
  && indexHtml.indexOf('id="inputExcelFarmacia"') !== -1);
check('preserve-exactly: sidebar Dashboard Paciente + Pendientes href intact',
  indexHtml.indexOf('Dashboard Paciente') !== -1
  && indexHtml.indexOf('href="farmacia_actividad_servicio.html"') !== -1
  && indexHtml.indexOf('>Pendientes</a>') !== -1);
check('farmacia_common still loads before the page script',
  indexHtml.indexOf('scripts/farmacia_common.js?v=') !== -1
  && indexHtml.indexOf('scripts/farmacia_common.js?v=') < indexHtml.indexOf('scripts/farmacia_index.js?v='));

// ─── Part B. Behavioural oracle in vm ────────────────────────────────────────

function storage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function classesOf(element) {
  return String(element.className || '').split(/\s+/).filter(Boolean);
}

function matchesSelector(element, selector) {
  if (!element || element.tagName === '#TEXT') return false;
  if (selector.startsWith('#')) return element.id === selector.slice(1);
  if (selector.startsWith('.')) return classesOf(element).includes(selector.slice(1));
  const attrEq = selector.match(/^\[([^\]="']+)="([^"]*)"\]$/);
  if (attrEq) {
    return element.attributes
      && Object.prototype.hasOwnProperty.call(element.attributes, attrEq[1])
      && element.attributes[attrEq[1]] === attrEq[2];
  }
  const attrHas = selector.match(/^\[([^\]="']+)\]$/);
  if (attrHas) {
    return element.attributes && Object.prototype.hasOwnProperty.call(element.attributes, attrHas[1]);
  }
  return element.tagName === String(selector).toUpperCase();
}

function descendantsOf(element) {
  const out = [];
  for (const child of element.children || []) {
    if (child.tagName === '#TEXT') continue;
    out.push(child);
    out.push(...descendantsOf(child));
  }
  return out;
}

function makeElement(tagName, ids) {
  const listeners = new Map();
  const classSet = new Set();
  const value = {
    tagName: String(tagName).toUpperCase(),
    children: [],
    parentNode: null,
    attributes: {},
    style: {},
    _textContent: '',
    className: '',
    value: '',
    href: '',
    type: '',
    disabled: false,
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    append(...kids) { kids.forEach((kid) => this.appendChild(kid)); },
    removeChild(child) {
      this.children = this.children.filter((item) => item !== child);
      if (child.id && ids.get(child.id) === child) ids.delete(child.id);
      child.parentNode = null;
      return child;
    },
    remove() { if (this.parentNode) this.parentNode.removeChild(this); },
    setAttribute(name, attributeValue) {
      this.attributes[name] = String(attributeValue);
      if (name === 'id') this.id = String(attributeValue);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    },
    addEventListener(type, listener) {
      const handlers = listeners.get(type) || [];
      handlers.push(listener);
      listeners.set(type, handlers);
    },
    dispatchEvent(event) { (listeners.get(event.type) || []).forEach((listener) => listener.call(this, event)); },
    querySelector(selector) { return descendantsOf(this).find((child) => matchesSelector(child, selector)) || null; },
    querySelectorAll(selector) { return descendantsOf(this).filter((child) => matchesSelector(child, selector)); },
    focus() {},
    classList: {
      add(...names) { names.forEach((name) => classSet.add(name)); value.className = [...classSet].join(' '); },
      remove(...names) { names.forEach((name) => classSet.delete(name)); value.className = [...classSet].join(' '); },
      contains(name) { return classSet.has(name) || classesOf(value).includes(name); },
      toggle(name, force) {
        const enabled = force === undefined ? !this.contains(name) : !!force;
        if (enabled) this.add(name); else this.remove(name);
        return enabled;
      }
    }
  };
  Object.defineProperty(value, 'id', {
    get() { return value.attributes.id || ''; },
    set(id) { value.attributes.id = String(id); ids.set(String(id), value); }
  });
  Object.defineProperty(value, 'textContent', {
    get() {
      return value._textContent + value.children.map((child) => child.textContent || '').join('');
    },
    set(text) { value._textContent = String(text); value.children = []; }
  });
  Object.defineProperty(value, 'firstChild', { get() { return value.children[0] || null; } });
  return value;
}

function makeDom() {
  const ids = new Map();
  const documentListeners = new Map();
  const body = makeElement('body', ids);
  const main = makeElement('main', ids);
  body.appendChild(main);
  const document = {
    body,
    head: makeElement('head', ids),
    documentElement: makeElement('html', ids),
    createElement(tag) { return makeElement(tag, ids); },
    createTextNode(text) { return { tagName: '#TEXT', textContent: String(text), children: [], parentNode: null }; },
    getElementById(id) { return ids.get(id) || null; },
    querySelector(selector) { return body.querySelector(selector); },
    querySelectorAll(selector) { return body.querySelectorAll(selector); },
    addEventListener(type, listener) {
      const handlers = documentListeners.get(type) || [];
      handlers.push(listener);
      documentListeners.set(type, handlers);
    },
    dispatchEvent(event) { (documentListeners.get(event.type) || []).forEach((listener) => listener(event)); },
    listenerCount(type) { return (documentListeners.get(type) || []).length; }
  };
  function mount(id, tag = 'div') {
    const node = makeElement(tag, ids);
    node.id = id;
    main.appendChild(node);
    return node;
  }
  return { document, ids, mount };
}

function syntheticEnfermeria(cip, estado, extra) {
  return Object.assign({
    cip,
    nombre: `Paciente ${cip}`,
    servicio: 'Reumatología',
    patologia: 'Artritis Reumatoide (AR)',
    farmaco_solicitado: 'Fármaco sintético',
    importSource: 'Excel Enfermería',
    origen_solicitud: 'enfermeria',
    tipo_origen: 'enfermeria_inicio_biologico',
    source_type: 'ENFERMERIA',
    estado,
    estado_prebiologico_enfermeria: estado,
    estadoLabel: estado || 'Sin estado',
    analitica_estado: 'OK',
    mantoux_estado: 'NEGATIVO',
    igra_estado: 'NO PRECISA',
    vhb_estado: 'NEGATIVO',
    vhc_estado: 'NEGATIVO',
    vih_estado: 'NEGATIVO',
    medicina_preventiva_estado: 'OK'
  }, extra || {});
}

function reconciled(solicitudId, estado) {
  return {
    reconciliable: true,
    estado,
    terminales: estado === 'RECONCILIATION_CONFLICT' ? ['validacion_inicial', 'suspension'] : ['validacion_inicial'],
    solicitud_id: solicitudId
  };
}

// Same evidence population the WO #549 checker freezes: every
// counter-relevant branch, including the tray-E boundary rogues.
const imported = [
  syntheticEnfermeria('ENF-OK', 'OK_FARMACIA', { solicitud_id: 'SID-OK-1' }),
  syntheticEnfermeria('ENF-VIG', 'EN_VIGILANCIA', { analitica_estado: 'PENDIENTE' }),
  syntheticEnfermeria('ENF-BLOQ', 'BLOQUEADO', { analitica_estado: 'PENDIENTE' }),
  syntheticEnfermeria('ENF-RTC', 'OK_FARMACIA', {
    solicitud_id: 'SID-RTC-1', reconciliacion_fh: reconciled('SID-RTC-1', 'READY_TO_CITE')
  }),
  syntheticEnfermeria('ENF-DEN', 'OK_FARMACIA', {
    solicitud_id: 'SID-DEN-1', reconciliacion_fh: reconciled('SID-DEN-1', 'DENIED_DO_NOT_CITE')
  }),
  syntheticEnfermeria('ENF-CON', 'OK_FARMACIA', {
    solicitud_id: 'SID-CON-1', reconciliacion_fh: reconciled('SID-CON-1', 'RECONCILIATION_CONFLICT')
  }),
  syntheticEnfermeria('ENF-PFH', 'OK_FARMACIA', {
    solicitud_id: 'SID-PFH-1',
    reconciliacion_fh: { reconciliable: true, estado: 'PENDING_FH', terminales: [], solicitud_id: 'SID-PFH-1' }
  }),
  syntheticEnfermeria('ENF-SIN1', 'PENDIENTE_CONFIRMAR'),
  syntheticEnfermeria('ENF-SIN2', 'UNKNOWN', { estado_prebiologico_enfermeria: '' }),
  { cip: 'GEN-1', nombre: 'Solicitud general 1', servicio: 'Digestivo', patologia: 'EII', farmaco: 'Fármaco general', fechaSolicitud: '2026-09-01', estado_solicitud_validacion: 'pendiente', importSource: 'Solicitud clínica' },
  { cip: 'GEN-2', nombre: 'Solicitud general 2', servicio: 'Dermatología', patologia: 'Psoriasis', estado: 'pending', importSource: 'demo' },
  { cip: 'FH-PEND', nombre: 'Acto FH pendiente', servicio: 'Reumatología', patologia: 'AR', estado: 'pending', importSource: 'Excel Farmacia', resultado_validacion: 'pendiente', estado_registro: 'pendiente_revision' },
  { cip: 'FH-ACT', nombre: 'Acto FH cerrado', importSource: 'Excel Farmacia', resultado_validacion: 'validado', estado_registro: 'cerrado' },
  { cip: 'ROG-IMPSRC', nombre: 'Rogue importSource only', servicio: 'Reumatología', patologia: 'Artritis Reumatoide (AR)', farmaco_solicitado: 'Fármaco sintético', importSource: 'Excel Enfermería externa', estado: 'EN_VIGILANCIA', estado_prebiologico_enfermeria: 'EN_VIGILANCIA', estadoLabel: 'En vigilancia' },
  { cip: 'GENF-OK', nombre: 'Solicitud general con origen Enfermería-ish', servicio: 'Reumatología', patologia: 'Artritis Reumatoide (AR)', farmaco_solicitado: 'Fármaco sintético', importSource: 'Enfermería externa (solo importSource)', estado: 'OK_FARMACIA', estado_prebiologico_enfermeria: 'OK_FARMACIA', estadoLabel: 'OK Farmacia' },
  { cip: 'GENF-VIG', nombre: 'Solicitud general con origen Enfermería-ish', servicio: 'Reumatología', patologia: 'Artritis Reumatoide (AR)', farmaco_solicitado: 'Fármaco sintético', importSource: 'Enfermería externa (solo importSource)', estado: 'EN_VIGILANCIA', estado_prebiologico_enfermeria: 'EN_VIGILANCIA', estadoLabel: 'En vigilancia' },
  { cip: 'GENF-BLOQ', nombre: 'Solicitud general con origen Enfermería-ish', servicio: 'Reumatología', patologia: 'Artritis Reumatoide (AR)', farmaco_solicitado: 'Fármaco sintético', importSource: 'Enfermería externa (solo importSource)', estado: 'BLOQUEADO', estado_prebiologico_enfermeria: 'BLOQUEADO', estadoLabel: 'Bloqueado' }
];

const commonSrc = readFile('scripts/farmacia_common.js');

const MOUNTS = [
  ['fhSearchBtn', 'button'], ['fhCipInput', 'input'], ['guidedCip', 'span'],
  ['guidedIntakePanel', 'div'], ['fhAltaServicio', 'select'], ['fhAltaPatologia', 'select'],
  ['fhAltaPuntoEntrada', 'select'], ['fhAltaCancelar', 'button'], ['fhAltaAcceder', 'button'],
  // WO #549 parity-oracle reference mounts (kept renderer, page has none).
  ['enfermeriaBoard', 'section'], ['enfermeriaBoardCount', 'span'],
  ['enfermeriaBoardEmpty', 'p'], ['enfermeriaBoardCards', 'div'],
  // WO #550 compact resumen mounts.
  ['inicioTotalCount', 'span'], ['inicioListasCount', 'span'],
  ['inicioVigilanciaCount', 'span'], ['inicioBloqueadasCount', 'span']
];

const { document, ids, mount } = makeDom();
for (const [id, tag] of MOUNTS) mount(id, tag);
const sandbox = {
  window: {
    document,
    localStorage: storage(),
    sessionStorage: storage(),
    location: { search: '', href: 'farmacia_test.html' },
    FarmaciaPrebiologico: {
      evaluatePatientPrebiologico: () => ({ overallStatus: 'unknown', blockers: [] })
    },
    FarmaciaDataImports: { getImportedPatients: () => imported }
  },
  document,
  console,
  setTimeout,
  clearTimeout,
  URLSearchParams,
  CustomEvent: class { constructor(type, init) { this.type = type; this.detail = (init && init.detail) || null; } }
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(commonSrc, sandbox, { filename: 'farmacia_common.js' });
sandbox.window.FarmaciaDataImports.getImportedPatients = () => imported;
vm.runInContext(indexSrc, sandbox, { filename: 'farmacia_index.js' });
document.dispatchEvent({ type: 'DOMContentLoaded' });

const F = sandbox.window.FarmaciaDemo;

function summaryValue(id) {
  const node = ids.get(id);
  if (!node) return -1;
  return Number(String(node.textContent).replace(/[^0-9]/g, ''));
}

function identityKey(p) {
  const sid = p && p.solicitud_id ? String(p.solicitud_id).trim().toUpperCase() : '';
  if (sid) return `SID:${sid}`;
  return `CIP:${String((p && p.cip) || '').trim().toUpperCase()}`;
}

// Independent expectation, seams only (mirrors the browser expectation):
// total = |tray E ∪ tray G| over the published population.
const population = F.readAvailablePatientsSync() || [];
const trayEKeys = {};
for (const p of F.getEnfermeriaVisiblePatients() || []) trayEKeys[identityKey(p)] = true;
const queueKeys = { ...trayEKeys };
for (const p of F.readPendingValidationPatientsSync() || []) queueKeys[identityKey(p)] = true;
const expectedTotal = population.filter((p) => queueKeys[identityKey(p)]).length;

// Independent category expectation: the published board group headers
// rendered by the kept renderer — a second code path from the resumen.
const oracleText = ids.get('enfermeriaBoardCards').textContent;
function publishedGroupCount(label) {
  const match = oracleText.match(new RegExp(label.replace(/[()]/g, '\\$&') + ' \\((\\d+)\\)'));
  return match ? Number(match[1]) : -1;
}

check('resumen total equals the published tray-E ∪ tray-G union',
  summaryValue('inicioTotalCount') === expectedTotal,
  `total=${summaryValue('inicioTotalCount')} union=${expectedTotal}`);
check('resumen Listas equals the published ok_farmacia group',
  summaryValue('inicioListasCount') === publishedGroupCount('Listos para validación'),
  `listas=${summaryValue('inicioListasCount')} published=${publishedGroupCount('Listos para validación')}`);
check('resumen En vigilancia equals the published en_vigilancia group',
  summaryValue('inicioVigilanciaCount') === publishedGroupCount('En vigilancia prebiológica'),
  `vigilancia=${summaryValue('inicioVigilanciaCount')}`);
check('resumen Bloqueadas equals the published bloqueado group',
  summaryValue('inicioBloqueadasCount') === publishedGroupCount('Bloqueados'),
  `bloqueadas=${summaryValue('inicioBloqueadasCount')}`);
check('category counters never exceed the total',
  summaryValue('inicioListasCount') + summaryValue('inicioVigilanciaCount')
  + summaryValue('inicioBloqueadasCount') <= summaryValue('inicioTotalCount'));
check('importSource-only row belongs nowhere (tray-E boundary, independent oracle)',
  !queueKeys['CIP:ROG-IMPSRC'],
  'ROG-IMPSRC in neither published tray');
check('counts carry no patient preview (plain numbers only)',
  ['inicioTotalCount', 'inicioListasCount', 'inicioVigilanciaCount', 'inicioBloqueadasCount']
    .every((id) => /^\d+$/.test(String(ids.get(id).textContent))),
  JSON.stringify(['inicioTotalCount', 'inicioListasCount'].map((id) => ids.get(id).textContent)));

// Re-render + synthetic import events: summary follows the population.
// Individual cards cannot exist on the real page (Part A proves no card
// mounts/markup there); in this vm the kept WO #549 reference renderer
// owns the only cards, and re-render must never duplicate them.
{
  const before = summaryValue('inicioTotalCount');
  const oracleCardsBefore = ids.get('enfermeriaBoardCards').querySelectorAll('[data-enf-cip]').length;
  document.dispatchEvent({ type: 'farmacia:data-imported' });
  document.dispatchEvent({ type: 'farmacia:data-imported' });
  check('re-render and synthetic data-imported events keep the same summary',
    summaryValue('inicioTotalCount') === before && before === expectedTotal,
    `before=${before} after=${summaryValue('inicioTotalCount')}`);
  check('re-render never duplicates cards (reference rendering is stable)',
    ids.get('enfermeriaBoardCards').querySelectorAll('[data-enf-cip]').length === oracleCardsBefore,
    `before=${oracleCardsBefore}`);
}

// Empty population zeroes every counter.
{
  const realAvail = F.readAvailablePatientsSync;
  const realPend = F.readPendingValidationPatientsSync;
  const realEnf = F.getEnfermeriaVisiblePatients;
  F.readAvailablePatientsSync = () => [];
  F.readPendingValidationPatientsSync = () => [];
  F.getEnfermeriaVisiblePatients = () => [];
  document.dispatchEvent({ type: 'farmacia:data-imported' });
  check('empty population zeroes every resumen counter',
    summaryValue('inicioTotalCount') === 0 && summaryValue('inicioListasCount') === 0
    && summaryValue('inicioVigilanciaCount') === 0 && summaryValue('inicioBloqueadasCount') === 0);
  F.readAvailablePatientsSync = realAvail;
  F.readPendingValidationPatientsSync = realPend;
  F.getEnfermeriaVisiblePatients = realEnf;
  document.dispatchEvent({ type: 'farmacia:data-imported' });
  check('population restored (summary back to the published union)',
    summaryValue('inicioTotalCount') === expectedTotal,
    `total=${summaryValue('inicioTotalCount')} union=${expectedTotal}`);
}

// ─── Report ──────────────────────────────────────────────────────────────────

console.log(`\nFARMACIA-INICIO-COMPACTO: ${failed === 0 ? 'PASS' : 'FAIL'} ${passed}/${passed + failed} cases`);
if (failed > 0) {
  console.log(failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
