#!/usr/bin/env node
'use strict';
/**
 * Deterministic acceptance oracle for T1 #513
 * (TRAIN-NEXUS-REUMA-SAFETY-WIRING-12, parent #512).
 *
 * Accepted semantics (Ledger 3.2 #5, REQUISITO_DECIDIDO_PENDIENTE):
 *   ASDAS sólo en EspA: retirar ASDAS-CRP/ASDAS-VSG de APs en Primera Visita
 *   y Seguimiento.
 *
 * The oracle is independent from the implementation and must be able to fail
 * it:
 *
 *   A. Static scope (reads the real HTML files at run time):
 *      A1/A2 primera_visita.html #asdasSection / #asdasEsrSection carry
 *           `espa-only` and NOT `espa-aps-only`.
 *      A3   seguimiento.html #asdasSection / #asdasEsrSection same.
 *      A4   regression guards: #dapsaSection + #mdaSection `aps-only`;
 *           #rapid3Section `aps-only` + `ar-only`; #basdaiSection `espa-only`.
 *      A5   #asdasCrpResult / #asdasEsrResult keep the `readonly` attribute.
 *
 *   B. Behavioural (vm sandbox loading the REAL `modules/scoreCalculators.js`
 *      then `modules/formController.js` behind a minimal fake `document`):
 *      B1 adaptarFormulario('aps') hides both ASDAS sections, shows DAPSA.
 *      B2 Under APs, with every ASDAS source present and every source `input`
 *         handler fired, #asdasCrpResult / #asdasEsrResult stay '' (this is the
 *         assertion that fails on the unmodified code).
 *      B3 adaptarFormulario('espa') recomputes the INDEPENDENT literal values
 *         (ASDAS-CRP '2.98', ASDAS-ESR '2.21').
 *      B4 Sequence espa -> aps -> espa: outputs clear on APs and recompute on
 *         EspA again (no stale score left behind by visibility-only hiding).
 *      B5 adaptarFormulario('ar') hides both sections and clears both outputs.
 *      B6 APs regression guard: the APs-only DAPSA chain still computes 11.0.
 *      B7 Every scenario: no console.error emitted by the sandboxed modules.
 *      B8 APs: HubTools.scores.calcularASDAS is never invoked (0 calls);
 *         EspA: invoked at least once (compute-then-clear fails B8).
 *      B9 APs: NAD updated without events + calcularASDASLocal() recomputes
 *         DAPSA (12.0) through the non-EspA recalcularDAPSA() cascade.
 *
 * The fake `document` class sets for the watch-list are parsed from the real
 * HTML at run time, so the fixture can never disagree with production markup.
 * Synthetic data only. No product file is modified at run time by this oracle.
 *
 * Exit code 0 = all cases PASS, 1 = at least one FAIL.
 * Usage: node tools/reuma_asdas_scope_check.mjs
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
// HTML so visibility wiring and the fixture can never diverge.
const WATCHED_IDS = [
  'asdasSection', 'asdasEsrSection', 'dapsaSection', 'mdaSection', 'rapid3Section', 'basdaiSection',
  'asdasCrpResult', 'asdasEsrResult', 'asdasCrpCategoria', 'asdasEsrCategoria',
  'asdasPcrConversionNote', 'dapsaPcrConversionNote', 'dapsaResult', 'dapsaCategoria'
];

// Frozen literal expectations (accepted formula; never rewritten by the builder).
const ESPA_ASDAS_CRP = ((0.121 * 3) + (0.058 * 2) + (0.110 * 4) + (0.073 * 1) + (0.579 * Math.log(31))).toFixed(2);
const ESPA_ASDAS_ESR = ((0.08 * 3) + (0.07 * 2) + (0.11 * 4) + (0.09 * 1) + (0.29 * Math.sqrt(20))).toFixed(2);
const APS_DAPSA_TOTAL = (1 + 1 + 2 + 4 + 3).toFixed(1);
const APS_DAPSA_TOTAL_NAD2 = (2 + 1 + 2 + 4 + 3).toFixed(1);

const results = [];
function record(name, pass, detail) {
  results.push(!!pass);
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : (detail ? ` -> ${detail}` : '')}`);
}

// ---------------------------------------------------------------------------
// Static scope helpers
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

console.log('A. Alcance estático en el HTML real');
for (const page of PAGES) {
  const html = readPage(page);
  for (const id of ['asdasSection', 'asdasEsrSection']) {
    const tokens = classTokens(html, id);
    const hasEspaOnly = tokens !== null && tokens.includes('espa-only');
    const hasShared = tokens !== null && tokens.includes('espa-aps-only');
    record(`A ${page} #${id} contiene espa-only y no espa-aps-only`,
      hasEspaOnly && !hasShared,
      `class='${tokens === null ? '<tag no encontrado>' : tokens.join(' ')}'`);
  }
  const guards = [
    ['dapsaSection', ['aps-only']],
    ['mdaSection', ['aps-only']],
    ['rapid3Section', ['aps-only', 'ar-only']],
    ['basdaiSection', ['espa-only']]
  ];
  for (const [id, expected] of guards) {
    const tokens = classTokens(html, id);
    const ok = tokens !== null && expected.every((token) => tokens.includes(token));
    record(`A ${page} #${id} conserva [${expected.join(', ')}]`,
      ok, `class='${tokens === null ? '<tag no encontrado>' : tokens.join(' ')}'`);
  }
  for (const id of ['asdasCrpResult', 'asdasEsrResult']) {
    record(`A ${page} #${id} conserva readonly`, hasReadonlyAttr(html, id));
  }
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

  // Pre-register the watch-list so class selectors see production markup from
  // the very first hide/show pass.
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
// fire the handlers registered on that field (input and, for select-like
// fields, change). No result field is ever written directly.
function setValue(doc, id, value) {
  const el = doc.getElementById(id);
  el.value = String(value);
  fire(doc, id, 'input');
  fire(doc, id, 'change');
}

function fillEspaApsSources(doc) {
  setValue(doc, 'pcrValue', '30');
  setValue(doc, 'pcrUnit', 'mg/L');
  setValue(doc, 'asdasDolorEspalda', '3');
  setValue(doc, 'asdasDuracionRigidez', '2');
  setValue(doc, 'asdasEvaGlobal', '4');
  setValue(doc, 'evaGlobal', '4');
  setValue(doc, 'asdasNAD', '1');
  setValue(doc, 'vsgValue', '20');
}

console.log('\nB. Comportamiento del wiring real (sandbox vm)');

for (const page of PAGES) {
  // --- Scenario 1: APs scope + DAPSA regression ---------------------------
  {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    let asdasCalcCalls = 0;
    const calcularASDASOriginal = sandbox.HubTools.scores.calcularASDAS;
    sandbox.HubTools.scores.calcularASDAS = function (datos) {
      asdasCalcCalls += 1;
      return calcularASDASOriginal.call(this, datos);
    };
    sandbox.HubTools.form.adaptarFormulario('aps');

    const asdasSection = doc.getElementById('asdasSection');
    const esrSection = doc.getElementById('asdasEsrSection');
    const dapsaSection = doc.getElementById('dapsaSection');
    record(`B1 ${page} APs oculta ASDAS y muestra DAPSA`,
      asdasSection.style.display === 'none' && esrSection.style.display === 'none' && dapsaSection.style.display === 'block',
      `asdas=${asdasSection.style.display}, esr=${esrSection.style.display}, dapsa=${dapsaSection.style.display}`);

    fillEspaApsSources(doc);
    const crp = doc.getElementById('asdasCrpResult').value;
    const esr = doc.getElementById('asdasEsrResult').value;
    record(`B2 ${page} APs no calcula ASDAS-CRP/ESR (ambos '')`,
      crp === '' && esr === '', `crp='${crp}', esr='${esr}'`);

    setValue(doc, 'asdasNAT', '1');
    setValue(doc, 'evaDolor', '2');
    const dapsa = doc.getElementById('dapsaResult').value;
    record(`B6 ${page} APs conserva la cadena DAPSA (${APS_DAPSA_TOTAL})`,
      dapsa === APS_DAPSA_TOTAL, `dapsa='${dapsa}'`);

    record(`B8 ${page} APs no invoca HubTools.scores.calcularASDAS (0 llamadas)`,
      asdasCalcCalls === 0, `llamadas=${asdasCalcCalls}`);

    // B9 aísla la cascada NAD/NAT -> ASDAS -> DAPSA: NAD se actualiza por
    // asignación directa SIN eventos (como hace el homunculus al escribir el
    // campo) y el único camino hacia DAPSA es la rama no-EspA de
    // recalcularASDAS(). Si esa rama dejara de llamar a recalcularDAPSA(),
    // #dapsaResult seguiría en 11.0 y este caso falla.
    doc.getElementById('asdasNAD').value = '2';
    sandbox.window.calcularASDASLocal();
    const dapsaCascade = doc.getElementById('dapsaResult').value;
    const crpCascade = doc.getElementById('asdasCrpResult').value;
    const esrCascade = doc.getElementById('asdasEsrResult').value;
    record(`B9 ${page} cascada no-EspA recalcula DAPSA vía calcularASDASLocal (${APS_DAPSA_TOTAL_NAD2})`,
      dapsaCascade === APS_DAPSA_TOTAL_NAD2 && crpCascade === '' && esrCascade === '',
      `dapsa='${dapsaCascade}', crp='${crpCascade}', esr='${esrCascade}'`);

    record(`B7 ${page} sin console.error en APs`, consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  }

  // --- Scenario 2: EspA computes ------------------------------------------
  {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    let asdasCalcCallsEspa = 0;
    const calcularASDASOriginalEspa = sandbox.HubTools.scores.calcularASDAS;
    sandbox.HubTools.scores.calcularASDAS = function (datos) {
      asdasCalcCallsEspa += 1;
      return calcularASDASOriginalEspa.call(this, datos);
    };
    sandbox.HubTools.form.adaptarFormulario('espa');
    fillEspaApsSources(doc);
    const crp = doc.getElementById('asdasCrpResult').value;
    const esr = doc.getElementById('asdasEsrResult').value;
    record(`B3 ${page} EspA calcula ASDAS-CRP '${ESPA_ASDAS_CRP}' y ASDAS-ESR '${ESPA_ASDAS_ESR}'`,
      crp === ESPA_ASDAS_CRP && esr === ESPA_ASDAS_ESR, `crp='${crp}', esr='${esr}'`);
    record(`B8 ${page} EspA invoca HubTools.scores.calcularASDAS (>=1 llamada)`,
      asdasCalcCallsEspa >= 1, `llamadas=${asdasCalcCallsEspa}`);
    record(`B7 ${page} sin console.error en EspA`, consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  }

  // --- Scenario 3: sequence espa -> aps -> espa ---------------------------
  {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    fillEspaApsSources(doc);
    sandbox.HubTools.form.adaptarFormulario('espa');
    const crpEspa1 = doc.getElementById('asdasCrpResult').value;
    const esrEspa1 = doc.getElementById('asdasEsrResult').value;
    sandbox.HubTools.form.adaptarFormulario('aps');
    const crpAps = doc.getElementById('asdasCrpResult').value;
    const esrAps = doc.getElementById('asdasEsrResult').value;
    sandbox.HubTools.form.adaptarFormulario('espa');
    const crpEspa2 = doc.getElementById('asdasCrpResult').value;
    const esrEspa2 = doc.getElementById('asdasEsrResult').value;
    record(`B4 ${page} secuencia EspA->APs->EspA limpia y recalcula`,
      crpEspa1 === ESPA_ASDAS_CRP && esrEspa1 === ESPA_ASDAS_ESR &&
      crpAps === '' && esrAps === '' &&
      crpEspa2 === ESPA_ASDAS_CRP && esrEspa2 === ESPA_ASDAS_ESR,
      `espa1=('${crpEspa1}','${esrEspa1}') aps=('${crpAps}','${esrAps}') espa2=('${crpEspa2}','${esrEspa2}')`);
    record(`B7 ${page} sin console.error en la secuencia`, consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  }

  // --- Scenario 4: AR hides and clears ------------------------------------
  {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    sandbox.HubTools.form.adaptarFormulario('ar');
    const asdasSection = doc.getElementById('asdasSection');
    const esrSection = doc.getElementById('asdasEsrSection');
    const crp = doc.getElementById('asdasCrpResult').value;
    const esr = doc.getElementById('asdasEsrResult').value;
    record(`B5 ${page} AR oculta ASDAS y lo deja vacío`,
      asdasSection.style.display === 'none' && esrSection.style.display === 'none' && crp === '' && esr === '',
      `asdas=${asdasSection.style.display}, esr=${esrSection.style.display}, crp='${crp}', esr='${esr}'`);
    record(`B7 ${page} sin console.error en AR`, consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  }
}

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
if (failed > 0) {
  console.log('reuma_asdas_scope_check FAILED');
  process.exit(1);
}
console.log('reuma_asdas_scope_check PASS');
