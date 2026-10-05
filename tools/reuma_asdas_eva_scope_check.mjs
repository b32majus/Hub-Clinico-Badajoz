#!/usr/bin/env node
'use strict';
/**
 * Deterministic acceptance oracle for C1 #518
 * (TRAIN-NEXUS-REUMA-SAFETY-WIRING-12.1, parent #517).
 *
 * Accepted authority (#518, derived from T1 #513 / T2 #514 and the #512
 * HUMAN_STOP handoff): the `EVA Global -> #asdasEvaGlobal` mirror is EspA-only
 * ASDAS state. Outside EspA (APs, AR, LES, Sjögren) no residual ASDAS mirror
 * may be materialised in the DOM, in the collected visit data or in the legacy
 * ASDAS export slot; inside EspA the mirror keeps the T2 reuse semantics
 * (explicit 0 is a value, absence is never 0, no manual re-entry).
 *
 * The oracle is independent from the implementation and must be able to fail
 * it. It reads the REAL HTML plus the REAL modules/scoreCalculators.js,
 * modules/exportManager.js and modules/formController.js inside a vm sandbox
 * behind a minimal fake document whose watched id/class/readonly attributes
 * are parsed from the production markup at run time.
 *
 *   A. Static (both pages): #asdasEvaGlobal keeps `readonly`.
 *
 *   B. Behavioural, per page:
 *      B1 APs + EVA Global=4  -> mirror '', collected asdasEvaGlobal '',
 *                                ASDAS-CRP/ESR '' (T1 intact); legacy ASDAS
 *                                EVA slot (col 158) empty on the data-driven
 *                                rows, 497 columns preserved.
 *      B2 APs + EVA Global=0  -> mirror '' (an explicit zero is not ASDAS
 *                                state outside EspA either).
 *      B3 APs -> EspA         -> mirror reuses '4' with no re-entry (the
 *                                mirror is never written by the oracle, the
 *                                ASDAS inputs start empty and are only filled
 *                                after the switch), ASDAS-CRP reaches the
 *                                frozen literal, collected value and legacy
 *                                slot carry '4'.
 *      B4 EspA, EVA absent    -> mirror '' and ASDAS-CRP '' (never '0').
 *      B5 EspA, EVA explicit 0-> mirror '0' and ASDAS-CRP = frozen literal
 *                                different from the absent one.
 *      B6 EspA -> APs         -> mirror, collected value and legacy slot are
 *                                empty again (no stale ASDAS state).
 *      B7 AR / LES / Sjögren  -> mirror '' ; LES + Sjögren legacy slot '',
 *                                AR legacy slot 'NA' (published AR rule).
 *      B8 regression          -> APs DAPSA still '11.0' (T1/T2 cascade).
 *      B9 layout              -> every row keeps 497 columns and the ASDAS
 *                                block stays pinned at legacy columns
 *                                156-160 (characterised with sentinels from
 *                                the generator itself).
 *      B10 no console.error in any scenario.
 *
 * Supported-equivalent interaction only: source fields are written and their
 * real handlers fired; `HubTools.form.adaptarFormulario()` is the exact call
 * the production `#diagnosticoPrimario` change listener makes. Result fields
 * and the mirror are never written by this oracle. Synthetic data only; no
 * product file is modified at run time.
 *
 * Exit code 0 = all cases PASS, 1 = at least one FAIL.
 * Usage: node tools/reuma_asdas_eva_scope_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCORE_FILE = path.join(ROOT, 'modules', 'scoreCalculators.js');
const EXPORT_FILE = path.join(ROOT, 'modules', 'exportManager.js');
const FORM_FILE = path.join(ROOT, 'modules', 'formController.js');
const PAGES = ['primera_visita.html', 'seguimiento.html'];
const IS_SEGUIMIENTO = (page) => page === 'seguimiento.html';

// Frozen watch-list: id/class/readonly come from the real HTML at run time.
const WATCHED_IDS = [
  'asdasSection', 'asdasEsrSection', 'dapsaSection', 'mdaSection', 'rapid3Section', 'basdaiSection',
  'evaGlobal', 'evaDolor', 'asdasEvaGlobal', 'diagnosticoPrimario',
  'asdasCrpResult', 'asdasEsrResult', 'asdasCrpCategoria', 'asdasEsrCategoria',
  'asdasPCR', 'asdasVSG', 'asdasNAD', 'asdasNAT', 'asdasDolorEspalda', 'asdasDuracionRigidez',
  'pcrValue', 'pcrUnit', 'vsgValue', 'dapsaResult', 'dapsaCategoria',
  'dapsaNAD68', 'dapsaNAT66', 'dapsaEvaDolorPaciente', 'dapsaEvaGlobalPaciente', 'dapsaPCR',
  'asdasPcrConversionNote', 'dapsaPcrConversionNote'
];

// Frozen literals (independent recomputation of the published formulas).
const ASDAS_CRP_EVA4 = ((0.121 * 3) + (0.058 * 2) + (0.110 * 4) + (0.073 * 1) + (0.579 * Math.log(31))).toFixed(2);
const ASDAS_CRP_EVA0 = ((0.121 * 3) + (0.058 * 2) + (0.110 * 0) + (0.073 * 1) + (0.579 * Math.log(31))).toFixed(2);
const APS_DAPSA_TOTAL = (1 + 1 + 2 + 4 + 3).toFixed(1);

// Legacy 497 layout: ASDAS block occupies columns 156-160 and the EVA mirror
// slot is column 158 (characterised from the row generators with sentinels).
const LEGACY_ASDAS_BLOCK = [156, 157, 158, 159, 160];
const LEGACY_ASDAS_EVA_COL = 158;
const EXPORT_COLUMN_COUNT = 497;

const BUILDER_PATHOLOGY = { aps: 'APs', espa: 'EspA', ar: 'AR', les: 'LES', sjogren: 'SJOGREN' };

const results = [];
function record(name, pass, detail) {
  results.push(!!pass);
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : (detail ? ` -> ${detail}` : '')}`);
}

// ---------------------------------------------------------------------------
// Static helpers (raw HTML)
// ---------------------------------------------------------------------------
function readPage(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function openingTag(html, id) {
  const match = html.match(new RegExp(`<[^>]*\\bid="${escapeRegExp(id)}"[^>]*>`, 'i'));
  return match ? match[0] : null;
}

function classTokens(html, id) {
  const tag = openingTag(html, id);
  if (!tag) return null;
  const match = tag.match(/\bclass="([^"]*)"/i);
  return match ? match[1].split(/\s+/).filter(Boolean) : [];
}

function hasReadonlyAttr(html, id) {
  const tag = openingTag(html, id);
  return !!tag && /\breadonly\b/i.test(tag);
}

console.log('A. Estático (HTML real, ambas páginas)');
for (const page of PAGES) {
  const html = readPage(page);
  record(`A1 ${page} #asdasEvaGlobal conserva readonly (espejo, sin reentrada manual)`,
    hasReadonlyAttr(html, 'asdasEvaGlobal'), openingTag(html, 'asdasEvaGlobal'));
  const evaTag = openingTag(html, 'evaGlobal');
  record(`A2 ${page} #evaGlobal sigue editable (fuente única de la EVA Global)`,
    !!evaTag && !hasReadonlyAttr(html, 'evaGlobal'), evaTag);
}

// ---------------------------------------------------------------------------
// Minimal fake DOM
// ---------------------------------------------------------------------------
function makeClassList(initial) {
  const set = new Set(String(initial || '').split(/\s+/).filter(Boolean));
  return {
    add: (...classes) => { classes.forEach((c) => set.add(c)); },
    remove: (...classes) => { classes.forEach((c) => set.delete(c)); },
    contains: (c) => set.has(c),
    toggle: (c) => {
      if (set.has(c)) { set.delete(c); return false; }
      set.add(c);
      return true;
    }
  };
}

function makeElement(id, options = {}) {
  return {
    id,
    tagName: 'DIV',
    style: {},
    dataset: {},
    value: '',
    textContent: '',
    checked: false,
    type: '',
    readOnly: options.readOnly === true,
    hidden: false,
    listeners: {},
    classList: makeClassList(options.classList || ''),
    addEventListener(type, fn) {
      (this.listeners[type] = this.listeners[type] || []).push(fn);
    },
    removeEventListener() {},
    setAttribute(name, value) {
      if (name === 'class') { this.classList = makeClassList(value); }
      this[name] = value;
    },
    getAttribute(name) {
      if (name === 'class') return Array.from(this.classList._set).join(' ');
      return Object.prototype.hasOwnProperty.call(this, name) ? this[name] : null;
    },
    closest() { return null; },
    // Nested queries on auto-created containers resolve to nothing (the
    // collectors use them only for optional treatment/extra lines).
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

function makeDocument(html) {
  const byId = new Map();

  function classAndReadonly(id) {
    const tokens = classTokens(html, id);
    if (tokens === null) return null;
    return { classList: tokens.join(' '), readOnly: hasReadonlyAttr(html, id) };
  }

  function getElementById(id) {
    if (byId.has(id)) return byId.get(id);
    const watched = classAndReadonly(id);
    const element = makeElement(id, {
      classList: watched ? watched.classList : '',
      readOnly: watched ? watched.readOnly : false
    });
    byId.set(id, element);
    return element;
  }

  function allElements() {
    return Array.from(byId.values());
  }

  function matchSelector(selector) {
    if (selector.startsWith('.')) {
      let cls = selector.slice(1);
      let requireChecked = false;
      if (cls.endsWith(':checked')) {
        requireChecked = true;
        cls = cls.slice(0, -':checked'.length);
      }
      return allElements().filter((el) => el.classList.contains(cls) && (!requireChecked || el.checked));
    }
    if (selector.startsWith('#')) {
      const el = getElementById(selector.slice(1));
      return el ? [el] : [];
    }
    const modeMatch = selector.match(/^\[data-mode="([^"]+)"\]$/);
    if (modeMatch) {
      return allElements().filter((el) => el.dataset && el.dataset.mode === modeMatch[1]);
    }
    return [];
  }

  WATCHED_IDS.forEach(getElementById);

  return {
    getElementById,
    querySelector: (selector) => matchSelector(selector)[0] || null,
    querySelectorAll: (selector) => matchSelector(selector),
    getElementsByClassName: (name) => allElements().filter((el) => el.classList.contains(name)),
    body: makeElement('__body__'),
    createElement: (tag) => {
      const el = makeElement('__created__');
      el.tagName = String(tag).toUpperCase();
      return el;
    }
  };
}

// ---------------------------------------------------------------------------
// Sandbox scenario loader (real scoreCalculators + exportManager + formController)
// ---------------------------------------------------------------------------
function loadScenario(page) {
  const html = readPage(page);
  const doc = makeDocument(html);
  const consoleErrors = [];
  const consoleShim = {
    log() {}, info() {}, debug() {}, warn() {},
    error() { consoleErrors.push(Array.from(arguments).map(String).join(' ')); }
  };
  const HubTools = { scores: {}, form: {}, utils: {}, homunculus: {}, data: {}, export: {} };
  HubTools.homunculus.getHomunculusData = () => ({ nad: [], nat: [], dactilitis: [] });
  const sandbox = {
    window: {},
    document: doc,
    console: consoleShim,
    HubTools,
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {}
  };
  sandbox.window.HubTools = HubTools;
  sandbox.window.console = consoleShim;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SCORE_FILE, 'utf8'), sandbox, { filename: 'modules/scoreCalculators.js' });
  vm.runInContext(fs.readFileSync(EXPORT_FILE, 'utf8'), sandbox, { filename: 'modules/exportManager.js' });
  vm.runInContext(fs.readFileSync(FORM_FILE, 'utf8'), sandbox, { filename: 'modules/formController.js' });
  HubTools.form.initScoreWiring();
  return { doc, sandbox, consoleErrors };
}

function fire(doc, id, type) {
  const el = doc.getElementById(id);
  const handlers = (el.listeners && el.listeners[type]) || [];
  handlers.slice().forEach((fn) => fn.call(el, { type, target: el }));
}

// Supported-interaction equivalent for a source field: write the value and
// fire the handlers production registers on it. Result fields are never
// written here.
function setSource(doc, id, value) {
  const el = doc.getElementById(id);
  el.value = String(value);
  fire(doc, id, 'input');
  fire(doc, id, 'change');
}

// Supported-interaction equivalent for the pathology select: the production
// `#diagnosticoPrimario` change listener calls `adaptarFormulario(value)`.
function selectPathology(doc, sandbox, pathology) {
  doc.getElementById('diagnosticoPrimario').value = pathology;
  sandbox.HubTools.form.adaptarFormulario(pathology);
}

function mirror(doc) {
  return doc.getElementById('asdasEvaGlobal').value;
}

function collect(sandbox, page) {
  const fn = IS_SEGUIMIENTO(page) ? 'recopilarDatosFormularioSeguimiento' : 'recopilarDatosFormulario';
  return sandbox.HubTools.form[fn]();
}

function buildRow(sandbox, pathology, page, datos) {
  const visit = IS_SEGUIMIENTO(page) ? 'Seguimiento' : 'PrimeraVisita';
  const fn = `generarFilaCSV_${BUILDER_PATHOLOGY[pathology]}_${visit}`;
  const builder = sandbox.HubTools.export[fn];
  if (typeof builder !== 'function') throw new Error(`builder no disponible: ${fn}`);
  return builder(JSON.parse(JSON.stringify(datos))).split('\t');
}

function rowSlice(row) {
  return LEGACY_ASDAS_BLOCK.map((col) => row[col - 1]);
}

function setEspaAsdasInputs(doc) {
  setSource(doc, 'pcrValue', '30');
  setSource(doc, 'pcrUnit', 'mg/L');
  setSource(doc, 'asdasDolorEspalda', '3');
  setSource(doc, 'asdasDuracionRigidez', '2');
  setSource(doc, 'asdasNAD', '1');
}

console.log('\nB. Comportamiento del wiring real (sandbox vm, HTML + módulos reales)');

for (const page of PAGES) {
  // --- B1/B2: APs never materialises the mirror ---------------------------
  {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    selectPathology(doc, sandbox, 'aps');
    setSource(doc, 'evaGlobal', '4');
    const m = mirror(doc);
    record(`B1 ${page} APs con EVA Global=4 -> #asdasEvaGlobal ''`, m === '', `mirror='${m}'`);

    const crp = doc.getElementById('asdasCrpResult').value;
    const esr = doc.getElementById('asdasEsrResult').value;
    record(`B1 ${page} APs sin ASDAS computado (CRP '' y ESR '', T1 intacto)`,
      crp === '' && esr === '', `crp='${crp}', esr='${esr}'`);

    const datos = collect(sandbox, page);
    record(`B1 ${page} recopilado asdasEvaGlobal '' (sin estado residual)`,
      datos.asdasEvaGlobal === '', `valor='${datos.asdasEvaGlobal}'`);
    record(`B1 ${page} recopilado asdasCrpResult/asdasEsrResult ''`,
      datos.asdasCrpResult === '' && datos.asdasEsrResult === '',
      `crp='${datos.asdasCrpResult}', esr='${datos.asdasEsrResult}'`);

    const row = buildRow(sandbox, 'aps', page, datos);
    record(`B1 ${page} fila APs con ${EXPORT_COLUMN_COUNT} columnas`,
      row.length === EXPORT_COLUMN_COUNT, `len=${row.length}`);
    if (IS_SEGUIMIENTO(page)) {
      const slot = row[LEGACY_ASDAS_EVA_COL - 1];
      record(`B1 ${page} legacy col ${LEGACY_ASDAS_EVA_COL} (EVA ASDAS) vacía en APs`,
        slot === '', `valor='${slot}'`);
      const block = rowSlice(row);
      record(`B1 ${page} bloque ASDAS legacy ${LEGACY_ASDAS_BLOCK.join('/')} sin residuo en APs`,
        block.every((v) => v === ''), JSON.stringify(block));
    } else {
      const block = rowSlice(row);
      record(`B1 ${page} fila Primera Visita: slots ASDAS legacy ${LEGACY_ASDAS_BLOCK.join('/')} vacíos`,
        block.every((v) => v === ''), JSON.stringify(block));
    }

    setSource(doc, 'evaGlobal', '0');
    const m0 = mirror(doc);
    record(`B2 ${page} APs con EVA Global=0 -> espejo '' (el cero explícito tampoco es estado ASDAS)`,
      m0 === '', `mirror='${m0}'`);

    record(`B10 ${page} sin console.error (B1/B2)`, consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  }

  // --- B3: APs -> EspA reuses the captured EVA without re-entry ----------
  {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    selectPathology(doc, sandbox, 'aps');
    setSource(doc, 'evaGlobal', '4');
    const mInAps = mirror(doc);
    record(`B3 ${page} previo APs: espejo '' antes del cambio de patología`,
      mInAps === '', `mirror='${mInAps}'`);

    // Switch to EspA WITHOUT touching any ASDAS input and without writing the
    // mirror: the captured EVA Global must be reused as-is.
    selectPathology(doc, sandbox, 'espa');
    const mEspa = mirror(doc);
    record(`B3 ${page} APs -> EspA reutiliza EVA Global=4 sin reentrada (espejo '4')`,
      mEspa === '4', `mirror='${mEspa}'`);
    const untouched = ['asdasDolorEspalda', 'asdasDuracionRigidez', 'asdasNAD']
      .map((id) => doc.getElementById(id).value);
    record(`B3 ${page} entradas ASDAS intactas tras el cambio (sin reentrada)`,
      untouched.every((v) => v === ''), JSON.stringify(untouched));

    setEspaAsdasInputs(doc);
    const crp = doc.getElementById('asdasCrpResult').value;
    record(`B3 ${page} ASDAS-CRP '${ASDAS_CRP_EVA4}' alimentado por el espejo reutilizado`,
      crp === ASDAS_CRP_EVA4, `crp='${crp}'`);

    const datos = collect(sandbox, page);
    record(`B3 ${page} recopilado asdasEvaGlobal '4' en EspA`,
      datos.asdasEvaGlobal === '4', `valor='${datos.asdasEvaGlobal}'`);
    const row = buildRow(sandbox, 'espa', page, datos);
    record(`B3 ${page} fila EspA con ${EXPORT_COLUMN_COUNT} columnas`,
      row.length === EXPORT_COLUMN_COUNT, `len=${row.length}`);
    const slot = row[LEGACY_ASDAS_EVA_COL - 1];
    if (IS_SEGUIMIENTO(page)) {
      record(`B3 ${page} legacy col ${LEGACY_ASDAS_EVA_COL} (EVA ASDAS) '4' en EspA`,
        slot === '4', `valor='${slot}'`);
    } else {
      record(`B3 ${page} fila Primera Visita: slots ASDAS legacy ${LEGACY_ASDAS_BLOCK.join('/')} vacíos`,
        rowSlice(row).every((v) => v === ''), JSON.stringify(rowSlice(row)));
    }

    record(`B10 ${page} sin console.error (B3)`, consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  }

  // --- B4/B5/B6: absence, explicit zero, EspA -> APs ---------------------
  {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    selectPathology(doc, sandbox, 'espa');
    setEspaAsdasInputs(doc);

    setSource(doc, 'evaGlobal', '');
    const mAbsent = mirror(doc);
    const crpAbsent = doc.getElementById('asdasCrpResult').value;
    record(`B4 ${page} EspA con EVA ausente -> espejo '' y CRP '' (nunca 0)`,
      mAbsent === '' && crpAbsent === '', `mirror='${mAbsent}', crp='${crpAbsent}'`);

    setSource(doc, 'evaGlobal', '0');
    const mZero = mirror(doc);
    const crpZero = doc.getElementById('asdasCrpResult').value;
    record(`B5 ${page} EspA con EVA 0 explícito -> espejo '0' y CRP '${ASDAS_CRP_EVA0}'`,
      mZero === '0' && crpZero === ASDAS_CRP_EVA0, `mirror='${mZero}', crp='${crpZero}'`);
    record(`B5 ${page} el cero explícito difiere de la ausencia`,
      crpZero !== crpAbsent, `cero='${crpZero}', ausencia='${crpAbsent}'`);

    selectPathology(doc, sandbox, 'aps');
    const mBack = mirror(doc);
    record(`B6 ${page} EspA -> APs limpia el espejo (sin estado ASDAS residual)`,
      mBack === '', `mirror='${mBack}'`);
    const datosBack = collect(sandbox, page);
    record(`B6 ${page} recopilado asdasEvaGlobal '' tras volver a APs`,
      datosBack.asdasEvaGlobal === '', `valor='${datosBack.asdasEvaGlobal}'`);
    const rowBack = buildRow(sandbox, 'aps', page, datosBack);
    if (IS_SEGUIMIENTO(page)) {
      const slot = rowBack[LEGACY_ASDAS_EVA_COL - 1];
      record(`B6 ${page} legacy col ${LEGACY_ASDAS_EVA_COL} '' tras volver a APs`,
        slot === '', `valor='${slot}'`);
    } else {
      record(`B6 ${page} fila Primera Visita: slots ASDAS legacy vacíos tras volver a APs`,
        rowSlice(rowBack).every((v) => v === ''), JSON.stringify(rowSlice(rowBack)));
    }
    record(`B6 ${page} fila con ${EXPORT_COLUMN_COUNT} columnas`,
      rowBack.length === EXPORT_COLUMN_COUNT, `len=${rowBack.length}`);

    record(`B10 ${page} sin console.error (B4/B5/B6)`, consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  }

  // --- B7: AR / LES / Sjögren never carry the mirror ---------------------
  for (const pathology of ['ar', 'les', 'sjogren']) {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    selectPathology(doc, sandbox, pathology);
    setSource(doc, 'evaGlobal', '4');
    const m = mirror(doc);
    record(`B7 ${page} ${pathology.toUpperCase()} con EVA Global=4 -> espejo ''`,
      m === '', `mirror='${m}'`);
    const datos = collect(sandbox, page);
    record(`B7 ${page} ${pathology.toUpperCase()} recopilado asdasEvaGlobal ''`,
      datos.asdasEvaGlobal === '', `valor='${datos.asdasEvaGlobal}'`);
    const row = buildRow(sandbox, pathology, page, datos);
    const slot = row[LEGACY_ASDAS_EVA_COL - 1];
    const expected = pathology === 'ar' ? 'NA' : '';
    record(`B7 ${page} ${pathology.toUpperCase()} legacy col ${LEGACY_ASDAS_EVA_COL} '${expected}' y fila ${EXPORT_COLUMN_COUNT}`,
      slot === expected && row.length === EXPORT_COLUMN_COUNT,
      `valor='${slot}', len=${row.length}`);
    record(`B10 ${page} sin console.error (${pathology.toUpperCase()})`,
      consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  }

  // --- B8: APs DAPSA cascade regression ----------------------------------
  {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    selectPathology(doc, sandbox, 'aps');
    setSource(doc, 'pcrValue', '30');
    setSource(doc, 'pcrUnit', 'mg/L');
    setSource(doc, 'asdasNAD', '1');
    setSource(doc, 'asdasNAT', '1');
    setSource(doc, 'evaDolor', '2');
    setSource(doc, 'evaGlobal', '4');
    const dapsa = doc.getElementById('dapsaResult').value;
    const m = mirror(doc);
    record(`B8 ${page} APs DAPSA intacto ('${APS_DAPSA_TOTAL}') y espejo ASDAS ''`,
      dapsa === APS_DAPSA_TOTAL && m === '', `dapsa='${dapsa}', mirror='${m}'`);
    record(`B10 ${page} sin console.error (B8)`, consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  }

  // --- B9: layout guard (497 + frozen ASDAS block position) --------------
  {
    const { sandbox } = loadScenario(page);
    for (const pathology of ['aps', 'espa', 'ar', 'les', 'sjogren']) {
      const sentinel = {
        idPaciente: 'PID', nombrePaciente: 'NOMBRE', sexoPaciente: 'M',
        fechaVisita: '2026-10-04', profesional: 'PROF', diagnosticoPrimario: pathology,
        pcr: 'S_PCR', vsg: 'S_VSG',
        asdasDolorEspalda: 'S_A1', asdasDuracionRigidez: 'S_A2', asdasEvaGlobal: 'S_A3',
        asdasCrpResult: 'S_A4', asdasEsrResult: 'S_A5'
      };
      const row = buildRow(sandbox, pathology, page, sentinel);
      const block = rowSlice(row);
      const lenOk = row.length === EXPORT_COLUMN_COUNT;
      let expected;
      if (!IS_SEGUIMIENTO(page) && (pathology === 'aps' || pathology === 'espa')) {
        // Primera Visita de EspA/APs: the published layout hardcodes the five
        // ASDAS cells empty, so sentinels must never surface there.
        expected = ['', '', '', '', ''];
      } else if (pathology === 'ar') {
        // Published AR rule: the whole ASDAS block is encoded as 'NA'.
        expected = ['NA', 'NA', 'NA', 'NA', 'NA'];
      } else {
        expected = ['S_A1', 'S_A2', 'S_A3', 'S_A4', 'S_A5'];
      }
      record(`B9 ${page} ${pathology}: bloque ASDAS fijo en columnas ${LEGACY_ASDAS_BLOCK.join('/')} (${EXPORT_COLUMN_COUNT} columnas)`,
        lenOk && JSON.stringify(block) === JSON.stringify(expected),
        `len=${row.length}, bloque=${JSON.stringify(block)}, esperado=${JSON.stringify(expected)}`);
    }
  }
}

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
if (failed > 0) {
  console.log('reuma_asdas_eva_scope_check FAILED');
  process.exit(1);
}
console.log('reuma_asdas_eva_scope_check PASS');
