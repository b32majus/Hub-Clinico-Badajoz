#!/usr/bin/env node
// tools/farmacia_pendientes_queue_check.mjs
// WO #549 (WO-NEXUS-FARMACIA-PENDIENTES-V1-20261005) — focal deterministic
// acceptance checker for the `Pendientes` surface
// (farmacia_actividad_servicio.html + scripts/farmacia_actividad_servicio.js).
//
// What it proves, without touching product code:
//   1. Exactly one visible queue (`Solicitudes pendientes`); no second
//      inbox/section (`solicitudes generales` absent as a separate tray).
//   2. Frozen summary mapping: total = queue length; `Listas para
//      validación` = published ok_farmacia; `En vigilancia` =
//      en_vigilancia; `Bloqueadas` = bloqueado; reconciliation-precedence
//      fixtures (READY_TO_CITE / DENIED_DO_NOT_CITE /
//      RECONCILIATION_CONFLICT), sin_clasificar rows and every
//      non-Enfermería pending row count ONLY in total.
//   3. Parity oracle: the local counter classification equals the
//      PUBLISHED classifyEnfermeriaState / ENFERMERIA_GROUP_CONFIG group
//      counts for the same fixtures. The oracle is independent: it renders
//      the real scripts/farmacia_index.js boards in a vm sandbox (the way
//      tools/farmacia_inicio_bandejas_check.mjs does) and compares group
//      headers + per-row data-enf-estado against the candidate surface.
//      The oracle can disagree with the implementation.
//   4. Enfermería origin present as card provenance, absent as a
//      category/section/group header.
//   5. Per-state actions preserved (minus any per-card indicator action);
//      expandable detail preserved; prebiológico/blockers rendered.
//   6. No per-card indicator action anywhere; none of the removed KPI /
//      indicator cards or notes present; sidebar `Dashboard Paciente`
//      still present.
//   7. De-duplication: re-render + synthetic `farmacia:data-imported`
//      events never duplicate rows; one solicitud renders once.
//   8. Empty state; sidebar label `Pendientes` on root farmacia_*.html
//      with href unchanged; nothing under previews/ modified.
//   9. WO #549 correction regressions (F1/F2), proved against the published
//      trays rather than the implementation: an importSource-only
//      "enfermer" row in a non-OK_FARMACIA state belongs to neither tray
//      and stays out of the queue and every counter; an unrecognized
//      importSource renders verbatim (never `demo`); a row with no
//      importSource renders no origin line (hermetic seam-stubbed
//      population, since the merged population defaults a missing source
//      to `demo`).
//  10. WO #549 correction #2 (TRAY-E BOUNDARY EVERYWHERE): every
//      Enfermería decision on this surface is tray-E membership
//      (getEnfermeriaVisiblePatients), never the broad importSource
//      predicate. A live tray-G-only row with Enfermería-ish
//      importSource and OK_FARMACIA is in the queue yet counts only in
//      total and renders as a general card with the verbatim origin;
//      non-OK shapes belong to neither live tray; the counter/card
//      boundary for EN_VIGILANCIA/BLOQUEADO is proved hermetically
//      (seam-stubbed G-only population, literal expectations).
//      Tray-E rows keep their counters, the Enfermería card and the
//      hardcoded origin; parity with the published boards holds.
//
// Ejecutar: node tools/farmacia_pendientes_queue_check.mjs

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execSync } from 'node:child_process';
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

const actividadHtml = readFile('farmacia_actividad_servicio.html');
const actividadSrc = readFile('scripts/farmacia_actividad_servicio.js');

check('actividad page exposes exactly one Solicitudes pendientes queue title',
  (actividadHtml.match(/Solicitudes pendientes/g) || []).length >= 2
  && (actividadHtml.match(/id="solicitudesPendientesTitle"/g) || []).length === 1
  && (actividadHtml.match(/id="actividadPendientesPanel"/g) || []).length === 1,
  'one labelled queue section + one panel mount');
check('actividad page has no second inbox (solicitudes generales absent)',
  actividadHtml.toLowerCase().indexOf('solicitudes generales') === -1);
check('actividad page keeps the summary mount consumed by the F4.3D seam read',
  actividadHtml.indexOf('id="actividadCards"') !== -1);
check('actividad page removed the legacy indicator notes',
  actividadHtml.indexOf('id="statsDemoNote"') === -1
  && actividadHtml.indexOf('id="actividadSourceNote"') === -1);
for (const removed of ['Validaciones pendientes', 'PROMs pendientes', 'PROMs reportados',
  'Optimizaciones', 'Fármacos frecuentes', 'Realizadas', 'En seguimiento',
  'Fuente actual', 'pendientesToggle', 'No hay validaciones pendientes.']) {
  check(`actividad page no longer carries the removed indicator content: ${removed}`,
    actividadHtml.indexOf(removed) === -1);
}
check('actividad hero copy describes the new surface (no removed-indicator copy)',
  actividadHtml.indexOf('Solicitudes pendientes de validación farmacéutica') !== -1
  && actividadHtml.indexOf('pendientes, realizadas, seguimiento, fármacos frecuentes') === -1);
check('actividad page keeps the demo banner explicitly synthetic',
  /Demo Farmacia|datos demo/i.test(actividadHtml));
check('actividad sidebar keeps the Dashboard Paciente entry unchanged',
  actividadHtml.indexOf('Dashboard Paciente') !== -1
  && actividadHtml.indexOf('href="farmacia_dashboard_paciente.html"') !== -1);

check('actividad coordinator has no per-card indicator action',
  actividadSrc.indexOf('Dashboard') === -1);
check('actividad coordinator consumes the published sync population read',
  actividadSrc.indexOf('readAvailablePatientsSync') !== -1);
check('actividad coordinator consumes the published sync pending-population read',
  actividadSrc.indexOf('readPendingValidationPatientsSync') !== -1);
check('actividad coordinator gates every Enfermería decision on the published tray-E seam',
  actividadSrc.indexOf('getEnfermeriaVisiblePatients') !== -1);
check('actividad coordinator no longer uses the broad importSource predicate (tray-E boundary everywhere)',
  actividadSrc.indexOf('isEnfermeriaPatient') === -1);
check('actividad coordinator calls no direct legacy population helper',
  actividadSrc.indexOf('getAvailablePatients') === -1
  && actividadSrc.indexOf('getPendingValidationPatients') === -1);

// Sidebar label on every root farmacia_*.html, href unchanged, previews untouched.
const rootFarmaciaHtml = fs.readdirSync(ROOT)
  .filter((name) => /^farmacia_.*\.html$/.test(name) && !name.includes('/'));
for (const name of rootFarmaciaHtml) {
  const html = readFile(name);
  const sidebarOk = html.indexOf('href="farmacia_actividad_servicio.html"') !== -1
    && html.indexOf('>Pendientes</a>') !== -1;
  check(`sidebar label Pendientes with unchanged href: ${name}`, sidebarOk);
  check(`sidebar no longer says Actividad del servicio: ${name}`,
    html.indexOf('</i>Actividad del servicio</a>') === -1);
}
try {
  const porcelain = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' });
  const diffNames = execSync('git diff --name-only', { cwd: ROOT, encoding: 'utf8' });
  check('nothing under previews/ modified',
    !String(porcelain).split('\n').some((line) => line.trim().endsWith('/') || /previews\//.test(line))
    && String(diffNames).split('\n').every((line) => line.trim() === '' || line.trim().indexOf('previews/') !== 0));
} catch (error) {
  fail('git previews guard executable', error && error.message);
}

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

// Frozen WO #549 evidence fixtures: every counter-relevant branch.
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
  // WO #549 F1 regression: importSource-only "enfermer" row — none of the
  // three explicit origin fields — in a non-OK_FARMACIA state. Belongs to
  // neither published tray; the unfixed broad membership admitted it into
  // the queue AND the vigilancia counter.
  { cip: 'ROG-IMPSRC', nombre: 'Rogue importSource only', servicio: 'Reumatología', patologia: 'Artritis Reumatoide (AR)', farmaco_solicitado: 'Fármaco sintético', importSource: 'Excel Enfermería externa', estado: 'EN_VIGILANCIA', estado_prebiologico_enfermeria: 'EN_VIGILANCIA', estadoLabel: 'En vigilancia' },
  // WO #549 correction #2 (TRAY-E BOUNDARY EVERYWHERE): tray-G-only rows
  // with Enfermería-ish importSource but NONE of the three explicit
  // origin fields. The published inbox filter admits enfermer-ish rows
  // into tray G only in OK_FARMACIA, so GENF-OK is live G-only (in the
  // queue via tray G, never via tray E); GENF-VIG / GENF-BLOQ belong to
  // neither tray live (their counting boundary is proved hermetically
  // below, since the live inbox filter never admits them).
  { cip: 'GENF-OK', nombre: 'Solicitud general con origen Enfermería-ish', servicio: 'Reumatología', patologia: 'Artritis Reumatoide (AR)', farmaco_solicitado: 'Fármaco sintético', importSource: 'Enfermería externa (solo importSource)', estado: 'OK_FARMACIA', estado_prebiologico_enfermeria: 'OK_FARMACIA', estadoLabel: 'OK Farmacia' },
  { cip: 'GENF-VIG', nombre: 'Solicitud general con origen Enfermería-ish', servicio: 'Reumatología', patologia: 'Artritis Reumatoide (AR)', farmaco_solicitado: 'Fármaco sintético', importSource: 'Enfermería externa (solo importSource)', estado: 'EN_VIGILANCIA', estado_prebiologico_enfermeria: 'EN_VIGILANCIA', estadoLabel: 'En vigilancia' },
  { cip: 'GENF-BLOQ', nombre: 'Solicitud general con origen Enfermería-ish', servicio: 'Reumatología', patologia: 'Artritis Reumatoide (AR)', farmaco_solicitado: 'Fármaco sintético', importSource: 'Enfermería externa (solo importSource)', estado: 'BLOQUEADO', estado_prebiologico_enfermeria: 'BLOQUEADO', estadoLabel: 'Bloqueado' }
];

const commonSrc = readFile('scripts/farmacia_common.js');
const indexSrc = readFile('scripts/farmacia_index.js');

function loadSuite(pageSrc, pageFile, mounts, prebioStub) {
  const { document, ids, mount } = makeDom();
  for (const [id, tag] of mounts) mount(id, tag);
  const sandbox = {
    window: {
      document,
      localStorage: storage(),
      sessionStorage: storage(),
      location: { search: '', href: 'farmacia_test.html' },
      FarmaciaPrebiologico: prebioStub || {
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
  vm.runInContext(pageSrc, sandbox, { filename: pageFile });
  document.dispatchEvent({ type: 'DOMContentLoaded' });
  return { document, ids, sandbox };
}

const INICIO_MOUNTS = [
  ['fhSearchBtn', 'button'], ['fhCipInput', 'input'], ['guidedCip', 'span'],
  ['guidedIntakePanel', 'div'], ['fhAltaServicio', 'select'], ['fhAltaPatologia', 'select'],
  ['fhAltaPuntoEntrada', 'select'], ['fhAltaCancelar', 'button'], ['fhAltaAcceder', 'button'],
  ['enfermeriaBoard', 'section'], ['enfermeriaBoardCount', 'span'],
  ['enfermeriaBoardEmpty', 'p'], ['enfermeriaBoardCards', 'div'],
  ['pendingValidationBoard', 'section'], ['pendingValidationBoardCount', 'span'],
  ['pendingValidationEmpty', 'p'], ['pendingValidationCards', 'div']
];

// ─── Published oracle: real Inicio boards over the same fixtures ─────────────

const oracle = loadSuite(indexSrc, 'farmacia_index.js', INICIO_MOUNTS);
const oracleEnfCards = oracle.ids.get('enfermeriaBoardCards');
const oracleGroupText = oracleEnfCards.textContent;
const oracleByCip = {};
for (const card of oracleEnfCards.querySelectorAll('[data-enf-cip]')) {
  oracleByCip[card.attributes['data-enf-cip']] = card.attributes['data-enf-estado'];
}
function publishedGroupCount(label) {
  const match = oracleGroupText.match(new RegExp(label.replace(/[()]/g, '\\$&') + ' \\((\\d+)\\)'));
  return match ? Number(match[1]) : -1;
}

const F = oracle.sandbox.window.FarmaciaDemo;
const trayEnf = F.getEnfermeriaVisiblePatients();
const trayPending = F.getPendingValidationPatients();
const unionKeys = new Set();
for (const p of trayEnf.concat(trayPending)) {
  const sid = p && p.solicitud_id ? String(p.solicitud_id).trim().toUpperCase() : '';
  unionKeys.add(sid ? `SID:${sid}` : `CIP:${String((p && p.cip) || '').trim().toUpperCase()}`);
}
check('oracle sees the reconciliation fixtures on the published Inicio board',
  oracleByCip['ENF-RTC'] === 'listo_para_citar'
  && oracleByCip['ENF-DEN'] === 'denegado'
  && oracleByCip['ENF-CON'] === 'conflicto',
  JSON.stringify({ RTC: oracleByCip['ENF-RTC'], DEN: oracleByCip['ENF-DEN'], CON: oracleByCip['ENF-CON'] }));

// ─── Candidate: real Pendientes surface over the same fixtures ───────────────

const prebioStub = {
  evaluatePatientPrebiologico: () => ({
    overallStatus: 'blocked',
    blockers: [
      { label: 'Analítica', status: 'alert', detail: 'detalle sintético 1' },
      { label: 'Mantoux', status: 'pending', detail: 'detalle sintético 2' },
      { label: 'VHB', status: 'unknown', detail: 'detalle sintético 3' },
      { label: 'VHC', status: 'missing', detail: 'detalle sintético 4' }
    ]
  })
};
const candidate = loadSuite(actividadSrc, 'farmacia_actividad_servicio.js',
  [['actividadCards', 'div'], ['actividadPendientesPanel', 'div']], prebioStub);
const summaryMount = candidate.ids.get('actividadCards');
const panel = candidate.ids.get('actividadPendientesPanel');
// True published seam reads, captured before any evidence block stubs them.
const realSeamReads = {
  avail: candidate.sandbox.window.FarmaciaDemo.readAvailablePatientsSync,
  pend: candidate.sandbox.window.FarmaciaDemo.readPendingValidationPatientsSync,
  enf: candidate.sandbox.window.FarmaciaDemo.getEnfermeriaVisiblePatients
};

function summaryValue(key) {
  const card = summaryMount.querySelectorAll('[data-summary]').find((el) => el.attributes['data-summary'] === key);
  if (!card) return -1;
  return Number(String(card.textContent).replace(/[^0-9]/g, '')) ;
}

const candidateCards = panel.querySelectorAll('.pending-validation-card');
const candidateByCip = {};
for (const card of candidateCards) {
  const cip = card.attributes['data-enf-cip'] || card.attributes['data-pendientes-cip'];
  candidateByCip[cip] = card.attributes['data-pendientes-estado'];
}
function identityKeyOf(card) {
  if (card.attributes['data-pendientes-solicitud']) {
    return `SID:${String(card.attributes['data-pendientes-solicitud']).trim().toUpperCase()}`;
  }
  const cip = card.attributes['data-enf-cip'] || card.attributes['data-pendientes-cip'] || '';
  return `CIP:${String(cip).trim().toUpperCase()}`;
}

// Evidence 1 + 2: one queue, frozen summary mapping.
check('summary total equals the rendered queue length', summaryValue('total') === candidateCards.length,
  `total=${summaryValue('total')} cards=${candidateCards.length}`);
check('queue equals the union of the two published Inicio trays (identity de-duplicated)',
  candidateCards.length === unionKeys.size
  && candidateCards.every((card) => unionKeys.has(identityKeyOf(card))),
  `queue=${candidateCards.length} union=${unionKeys.size}`);
check('parity: Listas para validación equals the published ok_farmacia group count',
  summaryValue('listas') === publishedGroupCount('Listos para validación'),
  `listas=${summaryValue('listas')} published=${publishedGroupCount('Listos para validación')}`);
check('parity: En vigilancia equals the published en_vigilancia group count',
  summaryValue('vigilancia') === publishedGroupCount('En vigilancia prebiológica'),
  `vigilancia=${summaryValue('vigilancia')}`);
check('parity: Bloqueadas equals the published bloqueado group count',
  summaryValue('bloqueadas') === publishedGroupCount('Bloqueados'),
  `bloqueadas=${summaryValue('bloqueadas')}`);
check('summary counters carry the exact frozen labels',
  summaryMount.textContent.indexOf('Solicitudes pendientes') !== -1
  && summaryMount.textContent.indexOf('Listas para validación') !== -1
  && summaryMount.textContent.indexOf('En vigilancia') !== -1
  && summaryMount.textContent.indexOf('Bloqueadas') !== -1);

// Evidence 2 (detail): reconciliation precedence + neutral + non-Enfermería total-only.
for (const [cip, expected] of [['ENF-OK', 'ok_farmacia'], ['ENF-VIG', 'en_vigilancia'],
  ['ENF-BLOQ', 'bloqueado'], ['ENF-RTC', 'listo_para_citar'], ['ENF-DEN', 'denegado'],
  ['ENF-CON', 'conflicto'], ['ENF-PFH', 'ok_farmacia'], ['ENF-SIN1', 'sin_clasificar'],
  ['ENF-SIN2', 'sin_clasificar']]) {
  check(`candidate classification equals the published group for ${cip}`,
    candidateByCip[cip] === expected && oracleByCip[cip] === expected,
    `candidate=${candidateByCip[cip]} published=${oracleByCip[cip]} expected=${expected}`);
}
for (const cip of ['GEN-1', 'GEN-2', 'FH-PEND']) {
  check(`non-Enfermería pending row renders as general (total-only): ${cip}`,
    candidateByCip[cip] === 'general', String(candidateByCip[cip]));
}
check('closed Farmacia act never enters the queue',
  candidateByCip['FH-ACT'] === undefined);
check('F1: importSource-only row belongs to neither published tray (independent oracle)',
  !unionKeys.has('CIP:ROG-IMPSRC'),
  `union=${unionKeys.size}`);
check('F1: importSource-only row never enters the queue',
  candidateByCip['ROG-IMPSRC'] === undefined,
  String(candidateByCip['ROG-IMPSRC']));
check('F1: importSource-only row feeds no counter (total + vigilancia parity hold with the rogue fixture present)',
  summaryValue('total') === unionKeys.size
  && summaryValue('vigilancia') === publishedGroupCount('En vigilancia prebiológica'),
  `total=${summaryValue('total')} union=${unionKeys.size} vigilancia=${summaryValue('vigilancia')}`);
check('demo pending row coexists as a general card (total-only)',
  candidateByCip['CIP-DEMO-FH-002'] === 'general');

// WO #549 correction #2 (TRAY-E BOUNDARY EVERYWHERE), live evidence:
// the G-only Enfermería-ish OK_FARMACIA row is in the queue via tray G
// but must behave as a general row everywhere (counter + card + origin).
check('tray-E boundary: G-only Enfermería-ish OK_FARMACIA row is in the queue via tray G, never via tray E',
  unionKeys.has('CIP:GENF-OK') && candidateByCip['GENF-OK'] === 'general',
  String(candidateByCip['GENF-OK']));
check('tray-E boundary: G-only Enfermería-ish OK_FARMACIA row counts only in total (Listas parity holds with it present)',
  summaryValue('total') === unionKeys.size
  && summaryValue('listas') === publishedGroupCount('Listos para validación'),
  `total=${summaryValue('total')} union=${unionKeys.size} listas=${summaryValue('listas')}`);
const genfOkCard = candidateCards.find((card) => card.attributes['data-pendientes-cip'] === 'GENF-OK');
const genfOkMetas = genfOkCard
  ? genfOkCard.querySelectorAll('.pending-validation-card__meta').map((el) => el.textContent)
  : [];
check('tray-E boundary: G-only Enfermería-ish card shows the verbatim origin, never the hardcoded Excel Enfermería',
  !!genfOkCard
  && genfOkMetas.some((text) => text.indexOf('Origen: Enfermería externa (solo importSource)') !== -1)
  && genfOkMetas.every((text) => text.indexOf('Origen: Excel Enfermería') === -1),
  JSON.stringify(genfOkMetas));
for (const cip of ['GENF-VIG', 'GENF-BLOQ']) {
  check(`tray-E boundary: non-OK enfermer-ish row without explicit origin belongs to neither live tray: ${cip}`,
    !unionKeys.has(`CIP:${cip}`) && candidateByCip[cip] === undefined,
    String(candidateByCip[cip]));
}

// Evidence 4: provenance present, categories absent.
const enfCard = candidateCards.find((card) => card.attributes['data-enf-cip'] === 'ENF-OK');
check('Enfermería origin shown as provenance on the card',
  enfCard && enfCard.textContent.indexOf('Origen: Excel Enfermería') !== -1);
const generalCard = candidateCards.find((card) => card.attributes['data-pendientes-cip'] === 'GEN-1');
const generalMetas = generalCard
  ? generalCard.querySelectorAll('.pending-validation-card__meta').map((el) => el.textContent)
  : [];
check('F2: unrecognized importSource renders verbatim, never remapped to demo',
  !!generalCard
  && generalMetas.some((text) => text.indexOf('Origen: Solicitud clínica') !== -1)
  && generalMetas.every((text) => text.indexOf('demo') === -1),
  JSON.stringify(generalMetas));
check('no category/section/group header on the queue',
  panel.querySelectorAll('.enfermeria-group__header').length === 0
  && panel.textContent.toLowerCase().indexOf('solicitudes generales') === -1
  && panel.querySelectorAll('[data-pendientes-grid]').length === 1);

// WO #549 correction #2, tray-E positive evidence: tray-E rows keep
// their published counters, the Enfermería card and the hardcoded origin.
check('tray-E boundary: tray-E OK_FARMACIA row counted in Listas with the Enfermería card and hardcoded origin',
  candidateByCip['ENF-OK'] === 'ok_farmacia'
  && !!enfCard
  && enfCard.textContent.indexOf('Origen: Excel Enfermería') !== -1,
  String(candidateByCip['ENF-OK']));
check('tray-E boundary: tray-E EN_VIGILANCIA/BLOQUEADO rows feed their own counters (parity)',
  summaryValue('vigilancia') === publishedGroupCount('En vigilancia prebiológica')
  && summaryValue('bloqueadas') === publishedGroupCount('Bloqueados')
  && candidateByCip['ENF-VIG'] === 'en_vigilancia'
  && candidateByCip['ENF-BLOQ'] === 'bloqueado',
  `vigilancia=${summaryValue('vigilancia')} bloqueadas=${summaryValue('bloqueadas')}`);

// Evidence 5: per-state actions + expandable detail + prebiológico/blockers.
function actionsText(cip) {
  const card = candidateCards.find((c) =>
    (c.attributes['data-enf-cip'] || c.attributes['data-pendientes-cip']) === cip);
  const actions = card.querySelector('.pending-validation-card__actions');
  return actions ? actions.textContent : '';
}
check('ok_farmacia offers Abrir validación with the supported context params',
  actionsText('ENF-OK').indexOf('Abrir validación') !== -1
  && enfCard.querySelector('.pending-validation-card__actions')
    .querySelector('[data-enf-action="validar"]').href.indexOf('farmacia_validacion.html?') === 0
  && enfCard.querySelector('.pending-validation-card__actions')
    .querySelector('[data-enf-action="validar"]').href.indexOf('cip=ENF-OK') !== -1);
check('general rows offer Abrir validación to farmacia_validacion.html with the CIP',
  actionsText('GEN-1').indexOf('Abrir validación') !== -1
  && generalCard.querySelector('.pending-validation-card__actions').querySelector('a')
    .href.indexOf('farmacia_validacion.html?') === 0);
check('only ok_farmacia + general rows offer Abrir validación',
  candidateCards.filter((card) => {
    const actions = card.querySelector('.pending-validation-card__actions');
    return actions && actions.textContent.indexOf('Abrir validación') !== -1;
  }).length === candidateCards.filter((card) =>
    card.attributes['data-pendientes-estado'] === 'ok_farmacia'
    || card.attributes['data-pendientes-estado'] === 'general').length);
check('BLOQUEADO offers Ver bloqueantes', actionsText('ENF-BLOQ').indexOf('Ver bloqueantes') !== -1);
check('EN_VIGILANCIA offers Ver pendientes prebiológicos',
  actionsText('ENF-VIG').indexOf('Ver pendientes prebiológicos') !== -1);
for (const cip of ['ENF-SIN1', 'ENF-SIN2', 'ENF-RTC', 'ENF-DEN', 'ENF-CON']) {
  check(`${cip} offers Ver detalle`, actionsText(cip).indexOf('Ver detalle') !== -1);
}
const toggleButtons = panel.querySelectorAll('[data-pendientes-toggle]');
check('every detail toggle is keyboard-operable with aria-expanded/aria-controls',
  toggleButtons.length > 0
  && toggleButtons.every((btn) => btn.tagName === 'BUTTON'
    && btn.getAttribute('aria-expanded') === 'false'
    && !!btn.getAttribute('aria-controls')
    && !!candidate.ids.get(btn.getAttribute('aria-controls'))));
check('every Enfermería card carries its full prebiológico detail subpanel',
  candidateCards
    .filter((card) => card.attributes['data-enf-cip'])
    .every((card) => card.querySelectorAll('.enfermeria-detail-panel__item').length === 7));
check('general cards render the prebiológico block with blocker chips',
  generalCard.textContent.indexOf('Prebiológico bloqueado') !== -1
  && generalCard.querySelectorAll('.prebio-chip').length === 4
  && generalCard.textContent.indexOf('+1 más') !== -1);

// Toggle interaction: expand + collapse through the supported control.
{
  const bloqCard = candidateCards.find((card) => card.attributes['data-enf-cip'] === 'ENF-BLOQ');
  const toggle = bloqCard.querySelector('[data-pendientes-toggle]');
  const panelId = toggle.getAttribute('aria-controls');
  toggle.dispatchEvent({ type: 'click' });
  const opened = candidate.ids.get(panelId);
  check('detail expands through the supported toggle (open + aria-expanded + label)',
    opened.classList.contains('open')
    && toggle.getAttribute('aria-expanded') === 'true'
    && toggle.textContent.indexOf('Ocultar bloqueantes') !== -1);
  toggle.dispatchEvent({ type: 'click' });
  check('detail collapses through the supported toggle',
    !opened.classList.contains('open')
    && toggle.getAttribute('aria-expanded') === 'false'
    && toggle.textContent.indexOf('Ver bloqueantes') !== -1);
}

// Evidence 6: indicator action absent.
check('no per-card indicator action anywhere on the queue',
  panel.textContent.indexOf('Dashboard') === -1);

// Evidence 7: re-render + synthetic import events never duplicate rows.
{
  const before = panel.querySelectorAll('.pending-validation-card').length;
  const listenersBefore = candidate.document.listenerCount('farmacia:data-imported');
  candidate.document.dispatchEvent({ type: 'farmacia:data-imported' });
  candidate.document.dispatchEvent({ type: 'farmacia:data-imported' });
  const after = panel.querySelectorAll('.pending-validation-card').length;
  check('re-render and synthetic data-imported events do not duplicate rows',
    before === after && after === unionKeys.size, `before=${before} after=${after} union=${unionKeys.size}`);
  const keys = panel.querySelectorAll('.pending-validation-card').map(identityKeyOf);
  check('one solicitud renders once (identity de-duplication)',
    new Set(keys).size === keys.length, JSON.stringify(keys));
  check('import listener registered exactly once (no duplicate subscriptions)',
    candidate.document.listenerCount('farmacia:data-imported') === listenersBefore && listenersBefore === 1,
    `listeners=${candidate.document.listenerCount('farmacia:data-imported')}`);
}

// Evidence 8: empty state.
{
  candidate.sandbox.window.FarmaciaDemo.readAvailablePatientsSync = () => [];
  candidate.sandbox.window.FarmaciaDemo.readPendingValidationPatientsSync = () => [];
  candidate.document.dispatchEvent({ type: 'farmacia:data-imported' });
  check('empty queue shows the explicit empty state',
    panel.textContent.indexOf('No hay solicitudes pendientes.') !== -1
    && panel.querySelectorAll('.pending-validation-card').length === 0);
  check('empty queue zeroes every summary counter',
    summaryValue('total') === 0 && summaryValue('listas') === 0
    && summaryValue('vigilancia') === 0 && summaryValue('bloqueadas') === 0);
}

// Evidence F2 (hermetic): faithful provenance through the published seam
// interface with a controlled population. Rationale: the merged population
// defaults a missing importSource to 'demo' (mergePatientRecord), so a
// genuinely sourceless row is only observable by stubbing the published
// seam reads — expectations below are literal strings, never candidate
// logic. State is restored before the report.
{
  const CF = candidate.sandbox.window.FarmaciaDemo;
  const realAvail = realSeamReads.avail;
  const realPend = realSeamReads.pend;
  const realEnf = realSeamReads.enf;
  const stubPopulation = [
    { cip: 'STB-UNREC', nombre: 'Solicitud con origen no reconocido', servicio: 'Digestivo', patologia: 'EII', farmaco: 'Fármaco general', fechaSolicitud: '2026-09-02', estado_solicitud_validacion: 'pendiente', importSource: 'Solicitud clínica' },
    { cip: 'STB-NOSRC', nombre: 'Solicitud sin origen', servicio: 'Digestivo', patologia: 'EII', farmaco: 'Fármaco general', fechaSolicitud: '2026-09-03', estado_solicitud_validacion: 'pendiente' }
  ];
  CF.readAvailablePatientsSync = () => stubPopulation;
  CF.readPendingValidationPatientsSync = () => stubPopulation;
  CF.getEnfermeriaVisiblePatients = () => [];
  candidate.document.dispatchEvent({ type: 'farmacia:data-imported' });
  const stubCards = panel.querySelectorAll('.pending-validation-card');
  const stubByCip = {};
  for (const card of stubCards) {
    stubByCip[card.attributes['data-pendientes-cip']] = card;
  }
  const unrecMetas = stubByCip['STB-UNREC']
    ? stubByCip['STB-UNREC'].querySelectorAll('.pending-validation-card__meta').map((el) => el.textContent)
    : [];
  check('F2: unrecognized importSource renders verbatim through the seams, never demo',
    stubCards.length === 2
    && unrecMetas.some((text) => text.indexOf('Origen: Solicitud clínica') !== -1)
    && unrecMetas.every((text) => text.indexOf('demo') === -1),
    JSON.stringify(unrecMetas));
  const noSrcMetas = stubByCip['STB-NOSRC']
    ? stubByCip['STB-NOSRC'].querySelectorAll('.pending-validation-card__meta').map((el) => el.textContent)
    : null;
  check('F2: row with no importSource renders no origin line (nothing fabricated)',
    !!stubByCip['STB-NOSRC'] && noSrcMetas !== null
    && noSrcMetas.every((text) => text.indexOf('Origen') === -1),
    JSON.stringify(noSrcMetas));
  CF.readAvailablePatientsSync = realAvail;
  CF.readPendingValidationPatientsSync = realPend;
  CF.getEnfermeriaVisiblePatients = realEnf;
  candidate.document.dispatchEvent({ type: 'farmacia:data-imported' });
  check('F2 hermetic population restored (queue back to the published union)',
    panel.querySelectorAll('.pending-validation-card').length === unionKeys.size,
    `cards=${panel.querySelectorAll('.pending-validation-card').length} union=${unionKeys.size}`);
}

// Evidence tray-E boundary (hermetic): counter gating + card type for
// every category state through the published seam interface with a
// controlled G-only population. Rationale: the published inbox filter
// (OUT OF SCOPE, scripts/farmacia_common.js) admits enfermer-ish rows
// into tray G only in OK_FARMACIA, so EN_VIGILANCIA/BLOQUEADO G-only
// rows are unreachable live; stubbing the published seam reads isolates
// the candidate's boundary rule — expectations below are literal
// strings and counts, never candidate logic. State is restored before
// the report.
{
  const CF = candidate.sandbox.window.FarmaciaDemo;
  const realAvail = realSeamReads.avail;
  const realPend = realSeamReads.pend;
  const realEnf = realSeamReads.enf;
  const stubPopulation = [
    { cip: 'STB-GOK', nombre: 'Solicitud G-only OK', servicio: 'Reumatología', patologia: 'Artritis Reumatoide (AR)', farmaco_solicitado: 'Fármaco sintético', importSource: 'Enfermería externa (solo importSource)', estado: 'OK_FARMACIA', estado_prebiologico_enfermeria: 'OK_FARMACIA', estadoLabel: 'OK Farmacia' },
    { cip: 'STB-GVIG', nombre: 'Solicitud G-only vigilancia', servicio: 'Reumatología', patologia: 'Artritis Reumatoide (AR)', farmaco_solicitado: 'Fármaco sintético', importSource: 'Enfermería externa (solo importSource)', estado: 'EN_VIGILANCIA', estado_prebiologico_enfermeria: 'EN_VIGILANCIA', estadoLabel: 'En vigilancia' },
    { cip: 'STB-GBLOQ', nombre: 'Solicitud G-only bloqueada', servicio: 'Reumatología', patologia: 'Artritis Reumatoide (AR)', farmaco_solicitado: 'Fármaco sintético', importSource: 'Enfermería externa (solo importSource)', estado: 'BLOQUEADO', estado_prebiologico_enfermeria: 'BLOQUEADO', estadoLabel: 'Bloqueado' }
  ];
  CF.readAvailablePatientsSync = () => stubPopulation;
  CF.readPendingValidationPatientsSync = () => stubPopulation;
  CF.getEnfermeriaVisiblePatients = () => [];
  candidate.document.dispatchEvent({ type: 'farmacia:data-imported' });
  const stubCards = panel.querySelectorAll('.pending-validation-card');
  const stubByCip = {};
  for (const card of stubCards) {
    stubByCip[card.attributes['data-pendientes-cip'] || card.attributes['data-enf-cip']] = card;
  }
  check('tray-E boundary (hermetic): G-only enfermer-ish rows in every state count only in total',
    stubCards.length === 3
    && summaryValue('total') === 3
    && summaryValue('listas') === 0
    && summaryValue('vigilancia') === 0
    && summaryValue('bloqueadas') === 0,
    `cards=${stubCards.length} total=${summaryValue('total')} listas=${summaryValue('listas')} vigilancia=${summaryValue('vigilancia')} bloqueadas=${summaryValue('bloqueadas')}`);
  for (const cip of ['STB-GOK', 'STB-GVIG', 'STB-GBLOQ']) {
    const card = stubByCip[cip];
    const metas = card
      ? card.querySelectorAll('.pending-validation-card__meta').map((el) => el.textContent)
      : [];
    check(`tray-E boundary (hermetic): ${cip} renders as a general card with the verbatim origin`,
      !!card
      && card.attributes['data-pendientes-estado'] === 'general'
      && metas.some((text) => text.indexOf('Origen: Enfermería externa (solo importSource)') !== -1)
      && metas.every((text) => text.indexOf('Origen: Excel Enfermería') === -1),
      JSON.stringify(metas));
  }
  check('tray-E boundary (hermetic): no Enfermería card leaks for non-tray-E rows',
    stubCards.every((card) => card.attributes['data-enf-cip'] === undefined),
    JSON.stringify(stubCards.map((card) => card.attributes['data-pendientes-cip'])));
  CF.readAvailablePatientsSync = realAvail;
  CF.readPendingValidationPatientsSync = realPend;
  CF.getEnfermeriaVisiblePatients = realEnf;
  candidate.document.dispatchEvent({ type: 'farmacia:data-imported' });
  check('tray-E boundary hermetic population restored (queue back to the published union)',
    panel.querySelectorAll('.pending-validation-card').length === unionKeys.size,
    `cards=${panel.querySelectorAll('.pending-validation-card').length} union=${unionKeys.size}`);
}

// ─── Report ──────────────────────────────────────────────────────────────────

console.log(`\nFARMACIA-PENDIENTES-QUEUE: ${failed === 0 ? 'PASS' : 'FAIL'} ${passed}/${passed + failed} cases`);
if (failed > 0) {
  console.log(failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
