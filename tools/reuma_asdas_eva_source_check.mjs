#!/usr/bin/env node
'use strict';
/**
 * Deterministic acceptance oracle for T2 #514
 * (TRAIN-NEXUS-REUMA-SAFETY-WIRING-12, parent #512).
 *
 * Accepted semantics (Ledger 3.2 #6, DEFECTO_REPRODUCIDO):
 *   EVA Global del paciente -> ASDAS: reutilizar la ya capturada, sin
 *   reentrada manual; observado no arrastrado (PCR/VSG sí). Corregir y probar
 *   en ambas visitas.
 *
 * The oracle is independent from the implementation and must be able to fail
 * it:
 *
 *   A. Static (real HTML, both pages):
 *      A1 #asdasEvaGlobal carries `readonly` (no manual re-entry into ASDAS).
 *      A2 #evaGlobal does NOT carry `readonly` (single editable source).
 *      A3 the label of #asdasEvaGlobal is exactly
 *         `EVA Global del Paciente (0-10):` (no invented field).
 *      A4 regression: #asdasCrpResult, #asdasEsrResult, #asdasNAD, #asdasNAT,
 *         #asdasPCR, #asdasVSG still readonly; #evaDolor still editable.
 *
 *   B. Behavioural (vm sandbox loading the REAL `modules/scoreCalculators.js`
 *      then `modules/formController.js` behind a minimal fake `document`,
 *      whose watched-element class/readonly attributes are parsed from the
 *      real HTML at run time):
 *      B1 source present -> exact reuse: evaGlobal='4' mirrors '4' and
 *         ASDAS-CRP is the frozen literal '2.98', reached WITHOUT ever
 *         writing #asdasEvaGlobal.
 *      B2 numeric equivalence: evaGlobal='7' -> '3.31'.
 *      B3 explicit zero is a value, not absence: evaGlobal='0' -> '2.54'
 *         (differs from B4).
 *      B4 absence stays absent: evaGlobal='' -> mirror '' and CRP '' (never
 *         '0', never a number).
 *      B5 single authority: a stale mirror '9' loses to evaGlobal; firing only
 *         evaGlobal's handler re-mirrors; no ASDAS input handler can move the
 *         mirror away from evaGlobal.
 *      B6 no re-entry required: from missing, set only evaGlobal='6' ->
 *         mirror '6', CRP '3.20', ASDAS inputs untouched.
 *      B7 T1 intact: under APs #asdasCrpResult / #asdasEsrResult stay ''.
 *      B8 DAPSA intact (APs): '11.0'.
 *      B9 ESR path uses the same source: VSG 20 + EVA 4 -> '2.21'; EVA '' -> ''.
 *      B10 no console.error in any scenario.
 *
 * Exit code 0 = all cases PASS, 1 = at least one FAIL.
 * Usage: node tools/reuma_asdas_eva_source_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCORE_FILE = path.join(ROOT, 'modules', 'scoreCalculators.js');
const FORM_FILE = path.join(ROOT, 'modules', 'formController.js');
const PAGES = ['primera_visita.html', 'seguimiento.html'];

// Frozen watch-list: these ids get their `class` (and readOnly) from the real
// HTML so the fixture can never disagree with production markup.
const WATCHED_IDS = [
  'asdasSection', 'asdasEsrSection', 'dapsaSection', 'mdaSection', 'rapid3Section', 'basdaiSection',
  'evaGlobal', 'evaDolor', 'asdasEvaGlobal',
  'asdasCrpResult', 'asdasEsrResult', 'asdasCrpCategoria', 'asdasEsrCategoria', 'asdasPCR', 'asdasVSG',
  'asdasNAD', 'asdasNAT', 'asdasDolorEspalda', 'asdasDuracionRigidez',
  'asdasPcrConversionNote', 'dapsaPcrConversionNote', 'dapsaResult', 'dapsaCategoria'
];

// Frozen literal expectations (independent oracle; never rewritten by builder).
const ASDAS_CRP_EVA4 = ((0.121 * 3) + (0.058 * 2) + (0.110 * 4) + (0.073 * 1) + (0.579 * Math.log(31))).toFixed(2);
const ASDAS_CRP_EVA7 = ((0.121 * 3) + (0.058 * 2) + (0.110 * 7) + (0.073 * 1) + (0.579 * Math.log(31))).toFixed(2);
const ASDAS_CRP_EVA0 = ((0.121 * 3) + (0.058 * 2) + (0.110 * 0) + (0.073 * 1) + (0.579 * Math.log(31))).toFixed(2);
const ASDAS_CRP_EVA6 = ((0.121 * 3) + (0.058 * 2) + (0.110 * 6) + (0.073 * 1) + (0.579 * Math.log(31))).toFixed(2);
const ASDAS_ESR_EVA4 = ((0.08 * 3) + (0.07 * 2) + (0.11 * 4) + (0.09 * 1) + (0.29 * Math.sqrt(20))).toFixed(2);
const APS_DAPSA_TOTAL = (1 + 1 + 2 + 4 + 3).toFixed(1);
const EXPECTED_EVA_LABEL = 'EVA Global del Paciente (0-10):';

const results = [];
function record(name, pass, detail) {
  results.push(!!pass);
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : (detail ? ` -> ${detail}` : '')}`);
}

// ---------------------------------------------------------------------------
// Static helpers
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

function labelText(html, id) {
  const match = html.match(new RegExp(`<label[^>]*\\bfor="${escapeRegExp(id)}"[^>]*>([\\s\\S]*?)</label>`, 'i'));
  return match ? match[1].replace(/\s+/g, ' ').trim() : null;
}

console.log('A. Fuente EVA Global en el HTML real');
for (const page of PAGES) {
  const html = readPage(page);
  record(`A1 ${page} #asdasEvaGlobal conserva readonly (sin reentrada manual)`,
    hasReadonlyAttr(html, 'asdasEvaGlobal'),
    openingTag(html, 'asdasEvaGlobal'));
  record(`A2 ${page} #evaGlobal NO es readonly (fuente única editable)`,
    !hasReadonlyAttr(html, 'evaGlobal'),
    openingTag(html, 'evaGlobal'));
  const label = labelText(html, 'asdasEvaGlobal');
  record(`A3 ${page} label #asdasEvaGlobal exactamente '${EXPECTED_EVA_LABEL}'`,
    label === EXPECTED_EVA_LABEL, `label='${label}'`);
  for (const id of ['asdasCrpResult', 'asdasEsrResult', 'asdasNAD', 'asdasNAT', 'asdasPCR', 'asdasVSG']) {
    record(`A4 ${page} #${id} conserva readonly`, hasReadonlyAttr(html, id), openingTag(html, id));
  }
  record(`A4 ${page} #evaDolor sigue editable`,
    !hasReadonlyAttr(html, 'evaDolor'), openingTag(html, 'evaDolor'));
}

// ---------------------------------------------------------------------------
// Minimal fake DOM (same construction as tools/reuma_asdas_scope_check.mjs)
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
  const element = {
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
    closest() { return null; }
  };
  return element;
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
// Sandbox scenario loader
// ---------------------------------------------------------------------------
function loadScenario(page) {
  const html = readPage(page);
  const doc = makeDocument(html);
  const consoleErrors = [];
  const consoleShim = {
    log() {},
    info() {},
    debug() {},
    warn() {},
    error() { consoleErrors.push(Array.from(arguments).map(String).join(' ')); }
  };
  const HubTools = { scores: {}, form: {}, utils: {}, homunculus: {}, data: {} };
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
  vm.runInContext(fs.readFileSync(FORM_FILE, 'utf8'), sandbox, { filename: 'modules/formController.js' });
  HubTools.form.initScoreWiring();
  return { doc, sandbox, consoleErrors };
}

function fire(doc, id, type) {
  const el = doc.getElementById(id);
  const handlers = (el.listeners && el.listeners[type]) || [];
  handlers.slice().forEach((fn) => fn.call(el, { type, target: el }));
}

// Supported-interaction equivalent at the wiring level: set the field value and
// fire the handlers registered on that field. No result field is ever written.
function setValue(doc, id, value) {
  const el = doc.getElementById(id);
  el.value = String(value);
  fire(doc, id, 'input');
  fire(doc, id, 'change');
}

// Common ASDAS sources; deliberately NEVER writes #asdasEvaGlobal.
function setCommonSources(doc) {
  setValue(doc, 'pcrValue', '30');
  setValue(doc, 'pcrUnit', 'mg/L');
  setValue(doc, 'asdasDolorEspalda', '3');
  setValue(doc, 'asdasDuracionRigidez', '2');
  setValue(doc, 'asdasNAD', '1');
}

function mirror(doc) {
  return doc.getElementById('asdasEvaGlobal').value;
}

console.log('\nB. Comportamiento del wiring real (sandbox vm)');

for (const page of PAGES) {
  const scenarioErrors = [];

  // --- B1/B2/B3/B4: present, equivalent, zero, absent ---------------------
  {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    sandbox.HubTools.form.adaptarFormulario('espa');
    setCommonSources(doc);

    setValue(doc, 'evaGlobal', '4');
    const b1Mirror = mirror(doc);
    const b1Crp = doc.getElementById('asdasCrpResult').value;
    record(`B1 ${page} EVA 4 reutilizada sin escribir #asdasEvaGlobal (espejo '4', CRP '${ASDAS_CRP_EVA4}')`,
      b1Mirror === '4' && b1Crp === ASDAS_CRP_EVA4, `mirror='${b1Mirror}', crp='${b1Crp}'`);

    setValue(doc, 'evaGlobal', '7');
    const b2Mirror = mirror(doc);
    const b2Crp = doc.getElementById('asdasCrpResult').value;
    record(`B2 ${page} EVA 7 -> espejo '7' y CRP '${ASDAS_CRP_EVA7}'`,
      b2Mirror === '7' && b2Crp === ASDAS_CRP_EVA7, `mirror='${b2Mirror}', crp='${b2Crp}'`);

    setValue(doc, 'evaGlobal', '0');
    const b3Mirror = mirror(doc);
    const b3Crp = doc.getElementById('asdasCrpResult').value;
    record(`B3 ${page} EVA 0 es valor, no ausencia (espejo '0', CRP '${ASDAS_CRP_EVA0}')`,
      b3Mirror === '0' && b3Crp === ASDAS_CRP_EVA0, `mirror='${b3Mirror}', crp='${b3Crp}'`);

    setValue(doc, 'evaGlobal', '');
    const b4Mirror = mirror(doc);
    const b4Crp = doc.getElementById('asdasCrpResult').value;
    record(`B4 ${page} EVA ausente queda ausente (espejo '', CRP '')`,
      b4Mirror === '' && b4Crp === '', `mirror='${b4Mirror}', crp='${b4Crp}'`);
    record(`B3/B4 ${page} el cero explícito difiere de la ausencia`,
      b3Crp !== b4Crp && b3Crp === ASDAS_CRP_EVA0, `cero='${b3Crp}', ausencia='${b4Crp}'`);

    scenarioErrors.push(...consoleErrors);
  }

  // --- B5: single authority ----------------------------------------------
  {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    sandbox.HubTools.form.adaptarFormulario('espa');
    setCommonSources(doc);

    doc.getElementById('asdasEvaGlobal').value = '9';
    setValue(doc, 'evaGlobal', '4');
    const b5a = { mirror: mirror(doc), crp: doc.getElementById('asdasCrpResult').value };
    record(`B5 ${page} espejo obsoleto '9' pierde ante evaGlobal=4 ('4'/'${ASDAS_CRP_EVA4}')`,
      b5a.mirror === '4' && b5a.crp === ASDAS_CRP_EVA4, `mirror='${b5a.mirror}', crp='${b5a.crp}'`);

    doc.getElementById('asdasEvaGlobal').value = '9';
    doc.getElementById('evaGlobal').value = '7';
    fire(doc, 'evaGlobal', 'input');
    const b5b = { mirror: mirror(doc), crp: doc.getElementById('asdasCrpResult').value };
    record(`B5 ${page} sólo el handler de evaGlobal re-espeja a '7' ('7'/'${ASDAS_CRP_EVA7}')`,
      b5b.mirror === '7' && b5b.crp === ASDAS_CRP_EVA7, `mirror='${b5b.mirror}', crp='${b5b.crp}'`);

    // No ASDAS input handler may move the mirror away from evaGlobal.
    const mirrorListeners = doc.getElementById('asdasEvaGlobal').listeners.input || [];
    record(`B5 ${page} #asdasEvaGlobal ya no registra handler de input`,
      mirrorListeners.length === 0, `handlers=${mirrorListeners.length}`);
    setValue(doc, 'asdasDolorEspalda', '5');
    setValue(doc, 'asdasNAD', '2');
    const b5c = mirror(doc);
    record(`B5 ${page} ningún handler ASDAS mueve el espejo (sigue igual a evaGlobal '7')`,
      b5c === '7', `mirror='${b5c}'`);

    scenarioErrors.push(...consoleErrors);
  }

  // --- B6: no re-entry required ------------------------------------------
  {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    sandbox.HubTools.form.adaptarFormulario('espa');
    setCommonSources(doc);
    setValue(doc, 'evaGlobal', '');

    const before = ['asdasDolorEspalda', 'asdasDuracionRigidez', 'asdasNAD']
      .map((id) => doc.getElementById(id).value);
    setValue(doc, 'evaGlobal', '6');
    const after = ['asdasDolorEspalda', 'asdasDuracionRigidez', 'asdasNAD']
      .map((id) => doc.getElementById(id).value);
    const b6Mirror = mirror(doc);
    const b6Crp = doc.getElementById('asdasCrpResult').value;
    record(`B6 ${page} sólo EVA 6 -> espejo '6' y CRP '${ASDAS_CRP_EVA6}'`,
      b6Mirror === '6' && b6Crp === ASDAS_CRP_EVA6, `mirror='${b6Mirror}', crp='${b6Crp}'`);
    record(`B6 ${page} entradas ASDAS intactas (sin reentrada)`,
      JSON.stringify(before) === JSON.stringify(after), `antes=${JSON.stringify(before)} despues=${JSON.stringify(after)}`);

    scenarioErrors.push(...consoleErrors);
  }

  // --- B7/B8: APs regression (T1 intact + DAPSA) --------------------------
  {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    sandbox.HubTools.form.adaptarFormulario('aps');
    setCommonSources(doc);
    setValue(doc, 'evaGlobal', '4');

    const crp = doc.getElementById('asdasCrpResult').value;
    const esr = doc.getElementById('asdasEsrResult').value;
    record(`B7 ${page} APs no calcula ASDAS (CRP '' y ESR '')`,
      crp === '' && esr === '', `crp='${crp}', esr='${esr}'`);

    setValue(doc, 'asdasNAT', '1');
    setValue(doc, 'evaDolor', '2');
    const dapsa = doc.getElementById('dapsaResult').value;
    record(`B8 ${page} DAPSA intacto en APs ('${APS_DAPSA_TOTAL}')`,
      dapsa === APS_DAPSA_TOTAL, `dapsa='${dapsa}'`);

    scenarioErrors.push(...consoleErrors);
  }

  // --- B9: ESR path uses the same source ----------------------------------
  {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    sandbox.HubTools.form.adaptarFormulario('espa');
    setCommonSources(doc);
    setValue(doc, 'vsgValue', '20');
    setValue(doc, 'evaGlobal', '4');

    const esrMirror = mirror(doc);
    const esr = doc.getElementById('asdasEsrResult').value;
    record(`B9 ${page} VSG 20 + EVA 4 -> espejo '4' y ESR '${ASDAS_ESR_EVA4}'`,
      esrMirror === '4' && esr === ASDAS_ESR_EVA4, `mirror='${esrMirror}', esr='${esr}'`);

    setValue(doc, 'evaGlobal', '');
    const esrAbsent = doc.getElementById('asdasEsrResult').value;
    record(`B9 ${page} VSG presente pero EVA ausente -> ESR '' (nunca 0)`,
      mirror(doc) === '' && esrAbsent === '', `mirror='${mirror(doc)}', esr='${esrAbsent}'`);

    scenarioErrors.push(...consoleErrors);
  }

  record(`B10 ${page} sin console.error en ningún escenario`,
    scenarioErrors.length === 0, JSON.stringify(scenarioErrors.slice(0, 3)));
}

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
if (failed > 0) {
  console.log('reuma_asdas_eva_source_check FAILED');
  process.exit(1);
}
console.log('reuma_asdas_eva_source_check PASS');
