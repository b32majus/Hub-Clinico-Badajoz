#!/usr/bin/env node
'use strict';
/**
 * Deterministic acceptance oracle for T3 #515
 * (TRAIN-NEXUS-REUMA-SAFETY-WIRING-12, parent #512).
 *
 * Accepted semantics (Ledger 3.2 #3, DEFECTO_REPRODUCIDO):
 *   Dactylitis en EspA debe ser utilizable por interacción soportada y su
 *   recuento/estado debe derivar sólo de selecciones reales del usuario.
 *
 * Root cause reproduced by supported interaction (both pages):
 *   mostrarElementosAR() esconde el control marcando `style.display='none'`
 *   inline y ningún camino lo vuelve a mostrar, de modo que el control queda
 *   perdido para toda patología posterior (EspA incluida).
 *
 * The oracle is independent from the implementation and must be able to fail
 * it:
 *
 *   A. Static scope (reads the real HTML files at run time):
 *      A1   un <button data-mode="dactilitis" class="homunculus-mode-btn
 *           mode-dactilitis"> existe dentro de `.homunculus-controls`.
 *      A2   su `class` no contiene aps-only/ar-only/les-only/sjogren-only.
 *      A3   el SVG contiene exactamente las 20 regiones data-type="dactylitis"
 *           cuyos data-region-id son exactamente el conjunto declarado por
 *           HOMUNCULUS_DACTILITIS (cross-check independiente).
 *      A4   #dactilitisScore existe.
 *
 *   B. Behavioural visibility (vm sandbox loading the REAL
 *      modules/scoreCalculators.js + modules/formController.js +
 *      modules/homunculus.js behind a minimal fake `document`):
 *      B1   fresh EspA -> control visible.
 *      B2   APs -> control visible.
 *      B3   AR -> 'none'; EspA -> visible; APs -> visible; AR -> 'none'
 *           (discriminating: fails on the unmodified code).
 *      B4   longer histories Espa->AR->LES->EspA and APs->AR->Sjögren->APs
 *           leave the control visible.
 *      B5   AR behaviour preserved: after AR the control IS 'none'.
 *      B6   every scenario: no console.error.
 *
 *   C. Count/state derives only from real selections (real modules/homunculus.js):
 *      C1   init -> #dactilitisScore '0' and getHomunculusData().dactilitis [].
 *      C2   select dedo1 -> score '1', exactly one id, map 1 SI / 19 NO.
 *      C3   second region -> '2'; re-click first -> '1' without that id.
 *      C4   clicking an articulation region in dactilitis mode changes nothing.
 *      C5   clearHomunculus() -> '0', [], map all 'NO'.
 *      C6   setHomunculusData({dactilitis:[dedo3 pie]}) -> '1'; clear -> '0'.
 *      C7   switching mode nad -> dactilitis never changes the dactylitis score.
 *
 * The homunculus fixture (mode buttons, the 20 data-region-id/data-type
 * regions and #dactilitisScore) is parsed from the real HTML at run time, so
 * the fixture can never disagree with production markup.
 * Synthetic data only. No product file is modified at run time by this oracle.
 *
 * Exit code 0 = all cases PASS, 1 = at least one FAIL.
 * Usage: node tools/reuma_dactylitis_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCORE_FILE = path.join(ROOT, 'modules', 'scoreCalculators.js');
const FORM_FILE = path.join(ROOT, 'modules', 'formController.js');
const HOM_FILE = path.join(ROOT, 'modules', 'homunculus.js');
const PAGES = ['primera_visita.html', 'seguimiento.html'];

// Frozen literals for supported-interaction steps.
const DACT_REGION_1 = 'dactilitis-dedo1-mano-derecha';
const DACT_REGION_2 = 'dactilitis-dedo2-mano-derecha';
const DACT_REGION_3P = 'dactilitis-dedo3-pie-derecho';
const ART_REGION = 'hombro-derecho';
const EXCLUDED_CLASSES = ['aps-only', 'ar-only', 'les-only', 'sjogren-only'];

const results = [];
function record(name, pass, detail) {
  results.push(!!pass);
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : (detail ? ` -> ${detail}` : '')}`);
}

// ---------------------------------------------------------------------------
// Static HTML parsing helpers
// ---------------------------------------------------------------------------
function readPage(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

function allTags(html) {
  return html.match(/<[^>]*>/g) || [];
}

function classTokensOf(tag) {
  const match = tag.match(/\bclass="([^"]*)"/);
  return match ? match[1].split(/\s+/).filter(Boolean) : [];
}

function parseModeButtons(html) {
  const out = [];
  for (const tag of allTags(html)) {
    if (!/^<button\b/i.test(tag)) continue;
    const modeMatch = tag.match(/\bdata-mode="([^"]+)"/);
    if (!modeMatch) continue;
    out.push({ mode: modeMatch[1], classes: classTokensOf(tag), tag });
  }
  return out;
}

function parseBodyRegions(html) {
  const out = [];
  for (const tag of allTags(html)) {
    const tokens = classTokensOf(tag);
    if (!tokens.includes('body-region')) continue;
    const idMatch = tag.match(/data-region-id="([^"]+)"/);
    const typeMatch = tag.match(/data-type="([^"]+)"/);
    out.push({
      id: idMatch ? idMatch[1] : null,
      type: typeMatch ? typeMatch[1] : null,
      classes: tokens
    });
  }
  return out;
}

function controlsBlock(html) {
  const idx = html.indexOf('class="homunculus-controls"');
  if (idx < 0) return null;
  const start = html.lastIndexOf('<', idx);
  const end = html.indexOf('</div>', idx);
  if (end < 0) return null;
  return html.slice(start, end);
}

// Load the REAL homunculus module in a throwaway namespace to read the
// declared constant, independent from the HTML parse.
function loadDeclaredDactylitis() {
  const HubTools = { scores: {}, form: {}, utils: {}, homunculus: {}, data: {} };
  const noop = () => {};
  const sandbox = {
    window: {},
    HubTools,
    console: { log: noop, info: noop, debug: noop, warn: noop, error: noop },
    setTimeout: () => 0,
    clearTimeout: noop,
    setInterval: () => 0,
    clearInterval: noop
  };
  sandbox.window.HubTools = HubTools;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(HOM_FILE, 'utf8'), sandbox, { filename: 'modules/homunculus.js' });
  return HubTools.homunculus.DACTILITIS || [];
}

console.log('A. Alcance estático en el HTML real');
const declaredDactylitis = loadDeclaredDactylitis();
const declaredSet = new Set(declaredDactylitis);

for (const page of PAGES) {
  const html = readPage(page);
  const buttons = parseModeButtons(html);
  const dactilitisBtn = buttons.find((b) => b.mode === 'dactilitis');
  const block = controlsBlock(html);
  const inControls = !!(dactilitisBtn && block && block.includes(dactilitisBtn.tag));
  record(`A1 ${page} botón data-mode="dactilitis" con clases homunculus-mode-btn mode-dactilitis dentro de .homunculus-controls`,
    !!dactilitisBtn && dactilitisBtn.classes.includes('homunculus-mode-btn') &&
    dactilitisBtn.classes.includes('mode-dactilitis') && inControls,
    dactilitisBtn
      ? `class='${dactilitisBtn.classes.join(' ')}' inControls=${inControls}`
      : 'botón data-mode="dactilitis" no encontrado');

  const scopeless = dactilitisBtn
    ? EXCLUDED_CLASSES.every((c) => !dactilitisBtn.classes.includes(c))
    : false;
  record(`A2 ${page} botón dactilitis sin clases de patología excluyente [${EXCLUDED_CLASSES.join(', ')}]`,
    scopeless,
    dactilitisBtn ? `class='${dactilitisBtn.classes.join(' ')}'` : 'n/a');

  const dactRegions = parseBodyRegions(html).filter((r) => r.type === 'dactylitis');
  const regionSet = new Set(dactRegions.map((r) => r.id));
  const missing = declaredDactylitis.filter((id) => !regionSet.has(id));
  const extra = dactRegions.map((r) => r.id).filter((id) => !declaredSet.has(id));
  record(`A3 ${page} 20 regiones data-type="dactylitis" con ids exactamente = HOMUNCULUS_DACTILITIS (${declaredDactylitis.length})`,
    declaredDactylitis.length === 20 && dactRegions.length === 20 && regionSet.size === 20 &&
    missing.length === 0 && extra.length === 0,
    `regiones=${dactRegions.length}, uniq=${regionSet.size}, declaradas=${declaredDactylitis.length}, faltan=${JSON.stringify(missing)}, extra=${JSON.stringify(extra)}`);

  record(`A4 ${page} #dactilitisScore existe`, /\bid="dactilitisScore"/.test(html));
}

// ---------------------------------------------------------------------------
// Minimal fake DOM (flat, parsed from the real HTML)
// ---------------------------------------------------------------------------
function makeClassList(initial) {
  const set = new Set(String(initial || '').split(/\s+/).filter(Boolean));
  return {
    add: (...classes) => { classes.forEach((c) => set.add(c)); },
    remove: (...classes) => { classes.forEach((c) => set.delete(c)); },
    contains: (c) => set.has(c),
    toggle: (c, force) => {
      const add = force === undefined ? !set.has(c) : !!force;
      if (add) set.add(c); else set.delete(c);
      return add;
    },
    _set: set
  };
}

function makeElement(id, options = {}) {
  let text = '';
  const element = {
    id,
    tagName: options.tagName || 'DIV',
    style: {},
    dataset: options.dataset || {},
    value: '',
    checked: false,
    readOnly: false,
    hidden: false,
    disabled: false,
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
    querySelectorAll() { return []; },
    querySelector() { return null; },
    focus() {},
    get textContent() { return text; },
    set textContent(value) { text = (value === undefined || value === null) ? '' : String(value); }
  };
  return element;
}

function makeDocument(html) {
  const byId = new Map();

  const modeButtons = parseModeButtons(html).map((b) => makeElement(`__modebtn_${b.mode}`, {
    tagName: 'BUTTON',
    classList: b.classes.join(' '),
    dataset: { mode: b.mode }
  }));

  const bodyRegions = parseBodyRegions(html).map((r) => makeElement(`__region_${r.id}`, {
    tagName: 'RECT',
    classList: 'body-region',
    dataset: { regionId: r.id, type: r.type }
  }));

  const humanBodySvg = makeElement('humanBodySvg', { tagName: 'SVG' });
  humanBodySvg.querySelectorAll = (selector) => selector.includes('body-region') ? bodyRegions.slice() : [];
  humanBodySvg.querySelector = (selector) => humanBodySvg.querySelectorAll(selector)[0] || null;
  byId.set('humanBodySvg', humanBodySvg);

  function allElements() {
    return Array.from(byId.values()).concat(modeButtons, bodyRegions);
  }

  function getElementById(id) {
    if (byId.has(id)) return byId.get(id);
    const element = makeElement(id);
    byId.set(id, element);
    return element;
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
    const regionMatch = selector.match(/^\[data-region-id="([^"]+)"\]$/);
    if (regionMatch) {
      return allElements().filter((el) => el.dataset && el.dataset.regionId === regionMatch[1]);
    }
    return [];
  }

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
// Sandbox scenario loader (real modules)
// ---------------------------------------------------------------------------
function loadScenario(page, options = {}) {
  const html = readPage(page);
  const doc = makeDocument(html);
  const consoleErrors = [];
  const consoleShim = {
    log() {}, info() {}, debug() {}, warn() {},
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
  vm.runInContext(fs.readFileSync(HOM_FILE, 'utf8'), sandbox, { filename: 'modules/homunculus.js' });
  if (options.scoreWiring) HubTools.form.initScoreWiring();
  return { doc, sandbox, HubTools, consoleErrors };
}

function dactDisplay(doc) {
  const btn = doc.querySelector('[data-mode="dactilitis"]');
  return btn ? btn.style.display : '<no-btn>';
}

function fire(el, type) {
  if (!el) throw new Error('fire: elemento nulo para ' + type);
  (el.listeners[type] || []).slice().forEach((fn) => fn.call(el, { type, target: el }));
}

// ---------------------------------------------------------------------------
// B. Visibility across pathology sequences
// ---------------------------------------------------------------------------
console.log('\nB. Visibilidad del control a través de secuencias de patología');
for (const page of PAGES) {
  try {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    const adaptar = sandbox.HubTools.form.adaptarFormulario;

    adaptar('espa');
    const d1 = dactDisplay(doc);
    record(`B1 ${page} carga fresca EspA deja el control visible`, d1 !== 'none', `display='${d1}'`);
    record(`B6 ${page} sin console.error (B1)`, consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));

    // B2 in its own fresh scenario (a fresh deviation adds nothing, but keeps
    // the "fresh APs" claim literally true).
    {
      const s2 = loadScenario(page);
      s2.sandbox.HubTools.form.adaptarFormulario('aps');
      const d2 = dactDisplay(s2.doc);
      record(`B2 ${page} APs deja el control visible`, d2 !== 'none', `display='${d2}'`);
      record(`B6 ${page} sin console.error (B2)`, s2.consoleErrors.length === 0, JSON.stringify(s2.consoleErrors.slice(0, 3)));
    }

    // B3 discriminating sequence.
    {
      const s3 = loadScenario(page);
      const a = s3.sandbox.HubTools.form.adaptarFormulario;
      a('ar'); const ar1 = dactDisplay(s3.doc);
      a('espa'); const esp = dactDisplay(s3.doc);
      a('aps'); const aps = dactDisplay(s3.doc);
      a('ar'); const ar2 = dactDisplay(s3.doc);
      record(`B3 ${page} AR→EspA→APs→AR restaura el control en EspA/APs y lo vuelve a ocultar en AR`,
        ar1 === 'none' && esp !== 'none' && aps !== 'none' && ar2 === 'none',
        `ar='${ar1}', espa='${esp}', aps='${aps}', ar2='${ar2}'`);
      record(`B6 ${page} sin console.error (B3)`, s3.consoleErrors.length === 0, JSON.stringify(s3.consoleErrors.slice(0, 3)));
    }

    // B4a longer history: Espa -> AR -> LES -> Espa.
    {
      const s4 = loadScenario(page);
      const a = s4.sandbox.HubTools.form.adaptarFormulario;
      a('espa'); a('ar'); a('les'); a('espa');
      const d = dactDisplay(s4.doc);
      record(`B4 ${page} historial EspA→AR→LES→EspA deja el control visible`, d !== 'none', `display='${d}'`);
      record(`B6 ${page} sin console.error (B4a)`, s4.consoleErrors.length === 0, JSON.stringify(s4.consoleErrors.slice(0, 3)));
    }

    // B4b longer history: APs -> AR -> Sjögren -> APs.
    {
      const s4b = loadScenario(page);
      const a = s4b.sandbox.HubTools.form.adaptarFormulario;
      a('aps'); a('ar'); a('sjogren'); a('aps');
      const d = dactDisplay(s4b.doc);
      record(`B4 ${page} historial APs→AR→Sjögren→APs deja el control visible`, d !== 'none', `display='${d}'`);
      record(`B6 ${page} sin console.error (B4b)`, s4b.consoleErrors.length === 0, JSON.stringify(s4b.consoleErrors.slice(0, 3)));
    }

    // B5 AR preserved.
    {
      const s5 = loadScenario(page);
      s5.sandbox.HubTools.form.adaptarFormulario('ar');
      const d = dactDisplay(s5.doc);
      record(`B5 ${page} AR oculta el control ('${'none'}')`, d === 'none', `display='${d}'`);
      record(`B6 ${page} sin console.error (B5)`, s5.consoleErrors.length === 0, JSON.stringify(s5.consoleErrors.slice(0, 3)));
    }
  } catch (err) {
    record(`B ${page} ejecución sin excepción`, false, String((err && err.stack) || err));
  }
}

// ---------------------------------------------------------------------------
// C. Count/state derives only from real selections
// ---------------------------------------------------------------------------
console.log('\nC. Recuento/estado derivado sólo de selecciones reales');
for (const page of PAGES) {
  try {
    const { doc, sandbox, HubTools, consoleErrors } = loadScenario(page);
    const H = HubTools.homunculus;
    const createMap = vm.runInContext('createHomunculusMap', sandbox);
    const regionEl = (id) => doc.querySelectorAll('.body-region').find((r) => r.dataset.regionId === id) || null;
    const modeBtn = (mode) => doc.querySelector(`[data-mode="${mode}"]`);
    const score = () => String(doc.getElementById('dactilitisScore').textContent);
    const data = () => H.getHomunculusData();

    H.initHomunculus();

    record(`C1 ${page} init: #dactilitisScore '0' y dactilitis []`,
      score() === '0' && data().dactilitis.length === 0,
      `score='${score()}', dactilitis=${JSON.stringify(data().dactilitis)}`);

    fire(modeBtn('dactilitis'), 'click');
    fire(regionEl(DACT_REGION_1), 'click');
    const d2 = data().dactilitis.slice();
    const map2 = createMap(HubTools.homunculus.DACTILITIS, d2);
    const si2 = Object.values(map2).filter((v) => v === 'SI').length;
    const no2 = Object.values(map2).filter((v) => v === 'NO').length;
    record(`C2 ${page} seleccionar ${DACT_REGION_1} → score '1', un id, mapa 1 SI / 19 NO`,
      score() === '1' && d2.length === 1 && d2[0] === DACT_REGION_1 && si2 === 1 && no2 === 19,
      `score='${score()}', dactilitis=${JSON.stringify(d2)}, SI=${si2}, NO=${no2}`);

    fire(regionEl(DACT_REGION_2), 'click');
    const s3 = score();
    const l3 = data().dactilitis.slice();
    fire(regionEl(DACT_REGION_1), 'click');
    const s3b = score();
    const l3b = data().dactilitis.slice();
    record(`C3 ${page} segundo dedo → '2' y dos ids; re-click primero → '1' sin el id (sin doble conteo, deselect funciona)`,
      s3 === '2' && l3.length === 2 && s3b === '1' && !l3b.includes(DACT_REGION_1),
      `tras2 score='${s3}' ids=${JSON.stringify(l3)}; trasDeselect score='${s3b}' ids=${JSON.stringify(l3b)}`);

    const before = data().dactilitis.slice().sort();
    const beforeScore = score();
    fire(regionEl(ART_REGION), 'click');
    const after = data().dactilitis.slice().sort();
    record(`C4 ${page} click en articulación (${ART_REGION}) en modo dactilitis no cambia nada`,
      JSON.stringify(before) === JSON.stringify(after) && score() === beforeScore,
      `antes=${JSON.stringify(before)}/'${beforeScore}', despues=${JSON.stringify(after)}/'${score()}'`);

    H.clearHomunculus();
    const map5 = createMap(HubTools.homunculus.DACTILITIS, data().dactilitis);
    const allNo5 = Object.values(map5).every((v) => v === 'NO');
    record(`C5 ${page} clearHomunculus → '0', [] y mapa todo 'NO' (sin estado fantasma)`,
      score() === '0' && data().dactilitis.length === 0 && allNo5,
      `score='${score()}', dactilitis=${JSON.stringify(data().dactilitis)}, allNO=${allNo5}`);

    H.setHomunculusData({ dactilitis: [DACT_REGION_3P] });
    const s6 = score();
    const l6 = data().dactilitis.slice();
    H.clearHomunculus();
    record(`C6 ${page} setHomunculusData(${DACT_REGION_3P}) → '1' exacto y clear → '0'`,
      s6 === '1' && l6.length === 1 && l6[0] === DACT_REGION_3P && score() === '0',
      `score='${s6}', ids=${JSON.stringify(l6)}, trasClear='${score()}'`);

    H.setHomunculusData({ dactilitis: [DACT_REGION_3P] });
    const c7a = score();
    fire(modeBtn('nad'), 'click');
    const c7b = score();
    fire(modeBtn('dactilitis'), 'click');
    const c7c = score();
    record(`C7 ${page} cambiar modo nad→dactilitis no altera el recuento`,
      c7a === '1' && c7b === '1' && c7c === '1',
      `antes='${c7a}', tras nad='${c7b}', tras dactilitis='${c7c}'`);

    record(`B6 ${page} sin console.error (C)`, consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  } catch (err) {
    record(`C ${page} ejecución sin excepción`, false, String((err && err.stack) || err));
  }
}

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
if (failed > 0) {
  console.log('reuma_dactylitis_check FAILED');
  process.exit(1);
}
console.log('reuma_dactylitis_check PASS');
