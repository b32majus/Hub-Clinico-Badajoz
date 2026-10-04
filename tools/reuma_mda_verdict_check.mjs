#!/usr/bin/env node
'use strict';
/**
 * Deterministic acceptance oracle for C2 #519
 * (TRAIN-NEXUS-REUMA-SAFETY-WIRING-12.1, parent #517).
 *
 * Human-accepted authority (#517 / #519, binding decision):
 *
 *   Clinical rule (UNCHANGED):   mdaAlcanzado = cumplidos >= 5
 *   Seven criteria, their thresholds and their sources do NOT change.
 *
 *   Visible verdict:
 *     cumplidos >= 5                                   -> 'MDA ALCANZADO ✓'
 *     cumplidos < 5  AND cumplidos + pendientes >= 5   -> 'MDA PENDIENTE ...'
 *     cumplidos < 5  AND cumplidos + pendientes <  5   -> 'MDA NO ALCANZADO'
 *
 *   Psoriasis (PASI or BSA, OR): one known positive source => cumplido even if
 *   the other is missing; both known negative => no_cumplido; one known
 *   negative + the other missing => pendiente. Missing data never becomes
 *   0/false and never yields a definitive conclusion it can still change.
 *
 * Traceability (must be preserved in every report): during T4 #516 the frozen
 * oracle literal for 6/7 expected 'MDA NO ALCANZADO', contradicting the
 * published `cumplidos >= 5` rule. The operator surfaced it and Cora expressly
 * authorized correcting that literal to 'MDA ALCANZADO ✓'. It was a
 * human-authorized oracle correction, never an unauthorized unilateral change.
 *
 * The oracle is independent from the implementation and must be able to fail
 * it. It reads the REAL HTML plus the REAL modules/scoreCalculators.js and
 * modules/formController.js in a vm sandbox behind a minimal fake document
 * (watched id/class/readonly/initial text parsed from production markup, real
 * `.lei-point` checkboxes and real `.haq-score` selects registered).
 *
 *   A. Pure calculation (HubTools.scores.calcularMDA) — the published clinical
 *      rule and the criterion vocabulary must stay exactly as published:
 *      A1 mdaAlcanzado === (cumplidos >= 5) for every evaluable input.
 *      A2 seven criteria, frozen keys/fuentes/threshold pairs.
 *      A3 psoriasis OR rules (positive / both negative / negative+missing).
 *      A4 missing source stays pendiente; the incomplete contract never
 *         fabricates 0/false and never credits an undetermined criterion.
 *
 *   B. Visible verdict rendering (recalcularMDA through the real
 *      formController.js), on BOTH pages:
 *      C1 6 cumplidos + 1 pendiente      -> 'MDA ALCANZADO ✓'
 *      C2 5 cumplidos + 2 pendientes     -> 'MDA ALCANZADO ✓'
 *      C3 4 cumplidos + 1 pendiente + 2 no -> 'MDA PENDIENTE' naming the
 *          pending source (never a definitive 'MDA NO ALCANZADO')
 *      C4 3 cumplidos + 1 pendiente + 3 no -> 'MDA NO ALCANZADO'
 *      C5/C6/C7 psoriasis positive-missing / negative-missing / both negative
 *      C8 guard: 6/7 with all sources present -> 'MDA ALCANZADO ✓'
 *      C9 guard: 4/7 with all sources present -> 'MDA NO ALCANZADO'
 *      C10 verdicts are EXACTLY the published strings (C3 #520 depends on it)
 *      C11 the cumplidos panel shows the resolved fulfilled count whenever the
 *          verdict is definitive and '—' while the verdict is PENDIENTE
 *      C12 a pending criterion never renders a fabricated 0/false value
 *      C13 no manual control appears in #mdaSection (derived/read-only)
 *      C14 no console.error in any scenario
 *
 * Synthetic data only. No product file is modified at run time.
 * Exit code 0 = all cases PASS, 1 = at least one FAIL.
 * Usage: node tools/reuma_mda_verdict_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCORE_FILE = path.join(ROOT, 'modules', 'scoreCalculators.js');
const FORM_FILE = path.join(ROOT, 'modules', 'formController.js');
const PAGES = ['primera_visita.html', 'seguimiento.html'];

// Frozen vocabulary / published rule literals.
const CRITERIO_KEYS = ['nat', 'nad', 'psoriasis', 'lei', 'evaDolor', 'evaGlobal', 'haq'];
const FUENTES = ['NAT', 'NAD', 'PASI o BSA', 'LEI', 'EVA Dolor', 'EVA Global', 'HAQ'];
const ESTADOS = ['cumplido', 'no_cumplido', 'pendiente'];
const VERDICT_ALCANZADO = 'MDA ALCANZADO ✓';
const VERDICT_NO_ALCANZADO = 'MDA NO ALCANZADO';
const THRESHOLD_WORDING = [
  'NAT ≤ 1:', 'NAD ≤ 1:', 'PASI ≤ 1 o BSA ≤ 3%:', 'LEI ≤ 1:',
  'EVA Dolor ≤ 15mm:', 'EVA Global ≤ 20mm:', 'HAQ ≤ 0.5:'
];

const WATCHED_IDS = [
  'mdaSection', 'mdaCumplidos', 'mdaResultadoFinal',
  ...Array.from({ length: 7 }, (_, i) => `mdaCriterio${i + 1}`),
  ...Array.from({ length: 7 }, (_, i) => `mdaStatus${i + 1}`),
  'mdaNAT', 'mdaNAD', 'mdaPsoriasis', 'mdaLEI', 'mdaEvaDolor', 'mdaEvaGlobal', 'mdaHAQ',
  'asdasNAT', 'asdasNAD', 'evaDolor', 'evaGlobal', 'pasiValue', 'bsaValue', 'haqTotal', 'leiTotal',
  'pcrValue', 'pcrUnit', 'asdasDolorEspalda', 'asdasDuracionRigidez', 'vsgValue',
  'dapsaSection', 'dapsaResult', 'dapsaCategoria',
  'asdasSection', 'asdasEsrSection', 'asdasCrpResult', 'asdasEsrResult',
  'asdasCrpCategoria', 'asdasEsrCategoria', 'asdasPCR', 'asdasVSG', 'asdasEvaGlobal',
  'asdasPcrConversionNote', 'dapsaPcrConversionNote'
];

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

function initialText(html, id) {
  const tag = openingTag(html, id);
  if (!tag) return '';
  if (/^<(input|img|br|hr|meta|link|source|area|col|embed|track|wbr)\b/i.test(tag)) return '';
  if (/\/>\s*$/.test(tag)) return '';
  const match = html.match(new RegExp(`<[^>]*\\bid="${escapeRegExp(id)}"[^>]*>([\\s\\S]*?)<`, 'i'));
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

// ---------------------------------------------------------------------------
// A. Static invariants of the published rule surface
// ---------------------------------------------------------------------------
console.log('A. Estático (HTML real, ambas páginas)');
for (const page of PAGES) {
  const html = readPage(page);
  const start = html.indexOf('id="mdaSection"');
  const end = html.indexOf('<!-- RAPID3', start);
  const block = start >= 0 && end > start ? html.slice(start, end) : '';
  const forbidden = block.match(/<(input|select|textarea|button)\b/i);
  record(`A1 ${page} #mdaSection sin controles manuales (derivado/read-only)`,
    block.length > 0 && !forbidden, `encontrado='${forbidden ? forbidden[0] : ''}'`);

  let wordingOk = true;
  let cursor = -1;
  for (const wording of THRESHOLD_WORDING) {
    const at = block.indexOf(wording);
    if (at < 0 || at <= cursor) wordingOk = false;
    cursor = at;
  }
  record(`A2 ${page} umbrales publicados intactos y en orden`, wordingOk);
  record(`A3 ${page} sin ALCANZADO estático fabricado en el HTML inicial`,
    !initialText(html, 'mdaResultadoFinal').toUpperCase().includes('ALCANZADO'),
    `inicial='${initialText(html, 'mdaResultadoFinal')}'`);
}

// ---------------------------------------------------------------------------
// B. Pure calculation (published rule must not move)
// ---------------------------------------------------------------------------
function loadCalculator() {
  const HubTools = { scores: {} };
  const consoleShim = { log() {}, info() {}, debug() {}, warn() {}, error() {} };
  const sandbox = { HubTools, console: consoleShim };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SCORE_FILE, 'utf8'), sandbox, { filename: 'modules/scoreCalculators.js' });
  return HubTools.scores.calcularMDA;
}
const calcularMDA = loadCalculator();
if (typeof calcularMDA !== 'function') {
  console.error('calcularMDA no disponible en HubTools.scores');
  process.exit(1);
}

function stateOf(result, key) {
  const entry = (result.criterioEstados || []).find((c) => c && c.key === key);
  return entry ? entry.estado : undefined;
}

// D (single authority, C2 #519): recomputación INDEPENDIENTE de la regla de
// tres valores a partir de `criterioEstados`. No lee `result.veredicto`: sirve
// para contrastar al productor y al renderer.
function veredictoIndependiente(criterioEstados) {
  const estados = Array.isArray(criterioEstados) ? criterioEstados : [];
  const cumplidosResueltos = estados.filter((c) => c && c.estado === 'cumplido').length;
  const pendientes = estados.filter((c) => c && c.estado === 'pendiente').length;
  if (cumplidosResueltos >= 5) return 'alcanzado';
  if (cumplidosResueltos + pendientes >= 5) return 'pendiente';
  return 'no_alcanzado';
}

function benign(overrides) {
  return Object.assign({
    nat: '0', nad: '0', pasiValue: '0', bsaValue: '', lei: '0',
    evaDolor: '0', evaGlobal: '0', haq: '0'
  }, overrides || {});
}

console.log('\nB. Regla clínica publicada (calculation, sin DOM)');

// A1: mdaAlcanzado === cumplidos >= 5 for a battery of evaluable inputs.
{
  const battery = [
    ['7/7', benign()],
    ['6/7', benign({ evaGlobal: '9' })],
    ['5/7', benign({ evaGlobal: '9', haq: '0.6' })],
    ['4/7', benign({ evaGlobal: '9', haq: '0.6', nat: '2' })],
    ['3/7', benign({ evaGlobal: '9', haq: '0.6', nat: '2', nad: '2' })],
    ['0/7', benign({ evaGlobal: '9', haq: '0.6', nat: '2', nad: '2', lei: '2', evaDolor: '9', pasiValue: '9' })]
  ];
  let ok = true;
  const details = [];
  for (const [label, input] of battery) {
    const r = calcularMDA(input);
    const ruleHolds = r.evaluable === true &&
      r.cumplidos === r.criterios.filter(Boolean).length &&
      r.mdaAlcanzado === (r.cumplidos >= 5);
    if (!ruleHolds) {
      ok = false;
      details.push(`${label}: cumplidos=${r.cumplidos}, mdaAlcanzado=${r.mdaAlcanzado}, evaluable=${r.evaluable}`);
    }
  }
  record('A4 mdaAlcanzado === cumplidos >= 5 en toda la batería evaluable', ok, details.join(' | '));
}

// A2: seven criteria, frozen keys/fuentes/threshold vocabulary.
{
  const r = calcularMDA(benign());
  const keys = (r.criterioEstados || []).map((e) => e.key);
  const fuentes = (r.criterioEstados || []).map((e) => e.fuente);
  record('A5 siete criterios con orden de claves y fuentes congelados',
    r.criterioEstados.length === 7 &&
      JSON.stringify(keys) === JSON.stringify(CRITERIO_KEYS) &&
      JSON.stringify(fuentes) === JSON.stringify(FUENTES),
    `keys=${JSON.stringify(keys)}, fuentes=${JSON.stringify(fuentes)}`);
  const thresholdPairs = [
    ['nat', '1', '2'], ['nad', '1', '2'], ['lei', '1', '2'],
    ['evaDolor', '1.5', '1.6'], ['evaGlobal', '2', '2.1'], ['haq', '0.5', '0.6']
  ];
  let pairsOk = true;
  const bad = [];
  for (const [key, okValue, badValue] of thresholdPairs) {
    const a = stateOf(calcularMDA(benign({ [key]: okValue })), key);
    const b = stateOf(calcularMDA(benign({ [key]: badValue })), key);
    if (a !== 'cumplido' || b !== 'no_cumplido') { pairsOk = false; bad.push(`${key}: ${a}/${b}`); }
  }
  record('A6 umbrales por criterio intactos (cumplido/no_cumplido)', pairsOk, bad.join(', '));
}

// A3: psoriasis OR rules at calculation level.
{
  const posMissing = calcularMDA(benign({ pasiValue: '0.5', bsaValue: '' }));
  const negMissing = calcularMDA(benign({ pasiValue: '5', bsaValue: '' }));
  const bothNeg = calcularMDA(benign({ pasiValue: '5', bsaValue: '50' }));
  const bsaMissingPasiNeg = calcularMDA(benign({ pasiValue: '', bsaValue: '50' }));
  record('A7 psoriasis: positivo conocido + alterna ausente = cumplido',
    stateOf(posMissing, 'psoriasis') === 'cumplido', `estado=${stateOf(posMissing, 'psoriasis')}`);
  record('A8 psoriasis: negativo conocido + alterna ausente = pendiente',
    stateOf(negMissing, 'psoriasis') === 'pendiente' && fuenteOfSafe(negMissing) === 'PASI o BSA',
    `estado=${stateOf(negMissing, 'psoriasis')}`);
  record('A9 psoriasis: ambas conocidas negativas = no_cumplido',
    stateOf(bothNeg, 'psoriasis') === 'no_cumplido',
    `pasi5+bsa50=${stateOf(bothNeg, 'psoriasis')}`);
  record('A10 psoriasis: negativo conocido (BSA 50) + PASI ausente = pendiente',
    stateOf(bsaMissingPasiNeg, 'psoriasis') === 'pendiente',
    `bsa50+pasiAusente=${stateOf(bsaMissingPasiNeg, 'psoriasis')}`);
}

function fuenteOfSafe(result) {
  const entry = (result.criterioEstados || []).find((c) => c && c.key === 'psoriasis');
  return entry ? entry.fuente : undefined;
}

// A4: missing source stays pendiente and is never credited.
{
  const incomplete = calcularMDA({ nat: '0', nad: '0', evaDolor: '1', evaGlobal: '1' });
  const pendientes = (incomplete.criterioEstados || []).filter((e) => e.estado === 'pendiente');
  record('A10 fuentes ausentes quedan pendientes con la fuente nombrada',
    pendientes.length === 3 &&
      JSON.stringify(pendientes.map((e) => e.fuente).sort()) === JSON.stringify(['HAQ', 'LEI', 'PASI o BSA']),
    JSON.stringify(pendientes));
  record('A11 contrato incompleto intacto (criterios [], cumplidos 0, mdaAlcanzado false, Incompleto)',
    incomplete.evaluable === false && Array.isArray(incomplete.criterios) && incomplete.criterios.length === 0 &&
      incomplete.cumplidos === 0 && incomplete.mdaAlcanzado === false && incomplete.categoria === 'Incompleto',
    JSON.stringify({ evaluable: incomplete.evaluable, cumplidos: incomplete.cumplidos, mdaAlcanzado: incomplete.mdaAlcanzado, categoria: incomplete.categoria }));
}

// D (single authority, C2 #519): el productor único expone el veredicto
// visible y sus recuentos derivados en AMBOS resultados (completo e
// incompleto), coherentes con la recomputación independiente de la regla de
// tres valores a partir de `criterioEstados`.
{
  const battery = [
    ['7/7', benign()],
    ['6/7', benign({ evaGlobal: '9' })],
    ['5/7', benign({ evaGlobal: '9', haq: '0.6' })],
    ['4/7', benign({ evaGlobal: '9', haq: '0.6', nat: '2' })],
    ['3/7', benign({ evaGlobal: '9', haq: '0.6', nat: '2', nad: '2' })],
    ['0/7', benign({ evaGlobal: '9', haq: '0.6', nat: '2', nad: '2', lei: '2', evaDolor: '9', pasiValue: '9' })]
  ];
  let fieldsOk = true;
  let iffOk = true;
  let recomputeOk = true;
  const bad = [];
  for (const [label, input] of battery) {
    const r = calcularMDA(input);
    const fields = typeof r.cumplidosResueltos === 'number' && typeof r.pendientes === 'number' &&
      ['alcanzado', 'pendiente', 'no_alcanzado'].includes(r.veredicto);
    const iff = r.veredicto === 'alcanzado' ? r.mdaAlcanzado === true : r.mdaAlcanzado === false;
    const recompute = r.veredicto === veredictoIndependiente(r.criterioEstados);
    if (!fields || !iff || !recompute) {
      bad.push(`${label}: veredicto=${r.veredicto}, recompute=${veredictoIndependiente(r.criterioEstados)}, mdaAlcanzado=${r.mdaAlcanzado}, campos=${fields}`);
      if (!fields) fieldsOk = false;
      if (!iff) iffOk = false;
      if (!recompute) recomputeOk = false;
    }
  }
  record('D1 campos derivados del veredicto visible presentes en resultados evaluable', fieldsOk, bad.join(' | '));
  record('D2 veredicto \'alcanzado\' <=> mdaAlcanzado true en toda entrada evaluable de la sección B', iffOk, bad.join(' | '));
  record('D3 veredicto del productor = recomputación independiente de la regla de tres valores', recomputeOk, bad.join(' | '));

  // El resultado incompleto también lleva los campos derivados, con su
  // contrato agregado intacto (cumplidos 0 / mdaAlcanzado false / Incompleto).
  const incomplete = calcularMDA({ nat: '0', nad: '0', evaDolor: '1', evaGlobal: '1' });
  record('D4 resultado incompleto: campos derivados presentes y veredicto = recomputación independiente',
    incomplete.evaluable === false &&
      typeof incomplete.cumplidosResueltos === 'number' && typeof incomplete.pendientes === 'number' &&
      incomplete.veredicto === veredictoIndependiente(incomplete.criterioEstados),
    JSON.stringify({ veredicto: incomplete.veredicto, recomputado: veredictoIndependiente(incomplete.criterioEstados) }));
  record('D5 contrato incompleto sigue intacto con los campos nuevos (cumplidos 0, mdaAlcanzado false, Incompleto)',
    incomplete.cumplidos === 0 && incomplete.mdaAlcanzado === false && incomplete.categoria === 'Incompleto',
    JSON.stringify({ cumplidos: incomplete.cumplidos, mdaAlcanzado: incomplete.mdaAlcanzado, categoria: incomplete.categoria }));
}

// ---------------------------------------------------------------------------
// C. Visible verdict rendering (real formController.js)
// ---------------------------------------------------------------------------
function makeClassList(initial) {
  const set = new Set(String(initial || '').split(/\s+/).filter(Boolean));
  return {
    _set: set,
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
    tagName: options.tagName || 'DIV',
    style: {},
    dataset: options.dataset || {},
    value: '',
    textContent: options.text || '',
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
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

function makeDocument(html) {
  const byId = new Map();

  function getElementById(id) {
    if (byId.has(id)) return byId.get(id);
    const tokens = classTokens(html, id);
    const element = makeElement(id, {
      classList: tokens ? tokens.join(' ') : '',
      readOnly: hasReadonlyAttr(html, id),
      text: initialText(html, id)
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
      const catMatch = cls.match(/^([\w-]+)\[data-category="([^"]+)"\]$/);
      if (catMatch) {
        return allElements().filter((el) => el.classList.contains(catMatch[1]) &&
          String((el.dataset || {}).category) === catMatch[2] && (!requireChecked || el.checked));
      }
      return allElements().filter((el) => el.classList.contains(cls) && (!requireChecked || el.checked));
    }
    if (selector.startsWith('#')) {
      const el = getElementById(selector.slice(1));
      return el ? [el] : [];
    }
    const siteMatch = selector.match(/^\[data-site="([^"]+)"\]$/);
    if (siteMatch) {
      return allElements().filter((el) => el.dataset && el.dataset.site === siteMatch[1]);
    }
    const modeMatch = selector.match(/^\[data-mode="([^"]+)"\]$/);
    if (modeMatch) {
      return allElements().filter((el) => el.dataset && el.dataset.mode === modeMatch[1]);
    }
    return [];
  }

  // Real `.lei-point` checkboxes from the page markup.
  {
    const re = /<input\b[^>]*\bclass="[^"]*\blei-point\b[^"]*"[^>]*>/gi;
    let match;
    let index = 0;
    while ((match = re.exec(html)) !== null) {
      const cls = (match[0].match(/\bclass="([^"]*)"/i) || [])[1] || '';
      const site = (match[0].match(/\bdata-site="([^"]*)"/i) || [])[1] || '';
      const el = makeElement(`__leiPoint${index}__`, { classList: cls, dataset: { site }, tagName: 'INPUT' });
      el.type = 'checkbox';
      byId.set(el.id, el);
      index += 1;
    }
  }
  // Real `.haq-score` selects / `.haq-aid` checkboxes from the page markup.
  {
    const re = /<(select|input)\b[^>]*\bclass="[^"]*\b(haq-score|haq-aid)\b[^"]*"[^>]*>/gi;
    let match;
    let index = 0;
    while ((match = re.exec(html)) !== null) {
      const cls = (match[0].match(/\bclass="([^"]*)"/i) || [])[1] || '';
      const category = (match[0].match(/\bdata-category="([^"]*)"/i) || [])[1] || '';
      const el = makeElement(`__haq${index}__`, { classList: cls, dataset: { category }, tagName: String(match[1]).toUpperCase() });
      el.type = match[1].toLowerCase() === 'input' ? 'checkbox' : 'select-one';
      byId.set(el.id, el);
      index += 1;
    }
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
  // D (single authority): spy transparente sobre el productor real, instalado
  // tras el registro de scoreCalculators y antes de que formController lo
  // consuma. Registra la última entrada y el último resultado con los que el
  // renderer trabajó, sin alterar el contrato de HubTools.scores.calcularMDA.
  const calcularCalls = [];
  const calcularMDAReal = HubTools.scores.calcularMDA;
  HubTools.scores.calcularMDA = function (datos) {
    const result = calcularMDAReal.call(this, datos);
    calcularCalls.push({ datos, result });
    return result;
  };
  vm.runInContext(fs.readFileSync(FORM_FILE, 'utf8'), sandbox, { filename: 'modules/formController.js' });
  HubTools.form.initScoreWiring();
  return { doc, sandbox, consoleErrors, calcularCalls };
}

function fire(doc, id, type) {
  const el = doc.getElementById(id);
  const handlers = (el.listeners && el.listeners[type]) || [];
  handlers.slice().forEach((fn) => fn.call(el, { type, target: el }));
}

// Supported-interaction equivalent: write the source value and fire its real
// handlers. Result fields are never written by this oracle.
function setValue(doc, id, value) {
  const el = doc.getElementById(id);
  el.value = String(value);
  fire(doc, id, 'input');
  fire(doc, id, 'change');
}

function answerHAQ(doc, value) {
  for (let i = 1; i <= 6; i++) {
    const sel = doc.querySelector('.haq-score[data-category="' + i + '"]');
    if (!sel) return false;
    sel.value = String(value);
    ((sel.listeners.change) || []).slice().forEach((fn) => fn.call(sel, { type: 'change', target: sel }));
  }
  return true;
}

function statusText(doc, i) {
  return doc.getElementById('mdaStatus' + i).textContent;
}
function estadoAttr(doc, i) {
  return doc.getElementById('mdaStatus' + i).getAttribute('data-estado');
}
function finalText(doc) {
  return doc.getElementById('mdaResultadoFinal').textContent || '';
}
function cumplidosText(doc) {
  return doc.getElementById('mdaCumplidos').textContent || '';
}
function valueText(doc, id) {
  return doc.getElementById(id).textContent;
}

function verdictCase(page, label, build, expect) {
  const { doc, sandbox, consoleErrors, calcularCalls } = loadScenario(page);
  sandbox.HubTools.form.adaptarFormulario('aps');
  build(doc);
  const final = finalText(doc);
  const cumplidos = cumplidosText(doc);
  let pass = true;
  const detail = [];
  if (expect.final !== undefined) {
    const ok = expect.finalExact === false ? final.includes(expect.final) : final === expect.final;
    if (!ok) { pass = false; detail.push(`final='${final}' (esperado ${expect.finalExact === false ? 'que contenga ' : ''}'${expect.final}')`); }
  }
  if (expect.finalNot !== undefined && final.toUpperCase().includes(expect.finalNot.toUpperCase())) {
    pass = false; detail.push(`final contiene '${expect.finalNot}'`);
  }
  if (expect.finalNames !== undefined) {
    for (const name of expect.finalNames) {
      if (!final.includes(name)) { pass = false; detail.push(`final sin '${name}'`); }
    }
  }
  if (expect.cumplidos !== undefined && cumplidos !== expect.cumplidos) {
    pass = false; detail.push(`cumplidos='${cumplidos}' (esperado '${expect.cumplidos}')`);
  }
  if (expect.estados !== undefined) {
    expect.estados.forEach((estado, idx) => {
      if (estado === undefined) return;
      if (estadoAttr(doc, idx + 1) !== estado) {
        pass = false;
        detail.push(`estado${idx + 1}=${estadoAttr(doc, idx + 1)} (esperado '${estado}')`);
      }
    });
  }
  if (expect.statuses !== undefined) {
    expect.statuses.forEach((st, idx) => {
      if (st === undefined) return;
      if (statusText(doc, idx + 1) !== st) {
        pass = false;
        detail.push(`status${idx + 1}='${statusText(doc, idx + 1)}' (esperado '${st}')`);
      }
    });
  }
  if (expect.values !== undefined) {
    for (const [id, expected] of Object.entries(expect.values)) {
      const actual = valueText(doc, id);
      if (actual !== expected) { pass = false; detail.push(`${id}='${actual}' (esperado '${expected}')`); }
    }
  }
  record(`${label} [${page}]`, pass, detail.join('; ') || JSON.stringify({ final, cumplidos }));
  record(`${label} [${page}] sin console.error`,
    consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));

  // D (single authority, C2 #519): en cada escenario ya cubierto, el
  // veredicto del productor coincide con la recomputación independiente de la
  // regla de tres valores a partir de `criterioEstados`, y el texto renderizado
  // es EXACTAMENTE el mapeo de `result.veredicto` (sin recuento independiente).
  const lastCall = calcularCalls.length > 0 ? calcularCalls[calcularCalls.length - 1] : null;
  record(`${label} [${page}] veredicto del productor = recomputación independiente`,
    !!lastCall && lastCall.result.veredicto === veredictoIndependiente(lastCall.result.criterioEstados),
    lastCall
      ? `veredicto=${lastCall.result.veredicto}, recomputado=${veredictoIndependiente(lastCall.result.criterioEstados)}`
      : 'el renderer no consumió HubTools.scores.calcularMDA');
  if (lastCall) {
    const r = lastCall.result;
    const mappedFinal = r.veredicto === 'alcanzado'
      ? 'MDA ALCANZADO ✓'
      : (r.veredicto === 'pendiente'
        ? 'MDA PENDIENTE — fuentes ausentes: ' + (Array.isArray(r.fuentesPendientes) ? r.fuentesPendientes : []).join(', ')
        : 'MDA NO ALCANZADO');
    const mappedCumplidos = r.veredicto === 'pendiente' ? '—' : String(r.cumplidosResueltos);
    record(`${label} [${page}] texto renderizado = mapeo exacto de result.veredicto`,
      final === mappedFinal && cumplidos === mappedCumplidos,
      `final='${final}' (mapeo '${mappedFinal}'), cumplidos='${cumplidos}' (mapeo '${mappedCumplidos}')`);
  } else {
    record(`${label} [${page}] texto renderizado = mapeo exacto de result.veredicto`,
      false, 'el renderer no consumió HubTools.scores.calcularMDA');
  }
}

console.log('\nC. Veredicto visible (recalcularMDA, formController real)');

// D (single authority, C2 #519): el renderer no reconuenta el estado por
// criterio; proyecta `result.veredicto` + `result.cumplidosResueltos` con
// salvaguarda fail-safe hacia 'pendiente'.
{
  const src = fs.readFileSync(FORM_FILE, 'utf8');
  const start = src.indexOf('function recalcularMDA()');
  const end = src.indexOf('window.calcularMDALocal', start);
  const body = start >= 0 && end > start ? src.slice(start, end) : '';
  // El renderer SÍ debe comparar `criterio.estado` para pintar el glifo y la
  // etiqueta de cada fila (autoridad T4 #516); lo que NO puede es recontar los
  // estados ni re-implementar la regla de tres valores: ése es el productor
  // único (HubTools.scores.calcularMDA). Este D6 falla si se reintroduce un
  // `.filter`/`.reduce` de recuento o el umbral en el renderer.
  const recountsStates = /\.filter\s*\(|\.reduce\s*\(/.test(body);
  const reimplementsRule = body.includes('>= 5') || body.includes('>=5') || body.includes('+ pendientes');
  record('D6 renderer sin recuento local ni re-implantación de la regla (productor único)',
    body.length > 0 && !recountsStates && !reimplementsRule,
    `filter/reduce=${recountsStates}, reglaReimplementada=${reimplementsRule}`);
  record('D7 renderer proyecta result.veredicto / result.cumplidosResueltos con fail-safe a pendiente',
    body.includes('result.veredicto') && body.includes('result.cumplidosResueltos') &&
      body.includes("'pendiente'"),
    'faltan la proyección o la salvaguarda fail-safe');
}

for (const page of PAGES) {
  const isSeg = page === 'seguimiento.html';

  // C1: 6 cumplidos + 1 pendiente -> ALCANZADO (Seguimiento, HAQ sin
  // responder). En Primera Visita no existen controles PASI/BSA/LEI, así que
  // el máximo alcanzable es 5 cumplidos + 2 pendientes y se cubre ahí mismo.
  verdictCase(page, isSeg
    ? 'C1 6 cumplidos + 1 pendiente -> MDA ALCANZADO'
    : 'C1 5 cumplidos + 2 pendientes -> MDA ALCANZADO', (doc) => {
    setValue(doc, 'asdasNAT', '0');
    setValue(doc, 'asdasNAD', '0');
    setValue(doc, 'evaDolor', '1');
    setValue(doc, 'evaGlobal', '1');
    if (isSeg) {
      setValue(doc, 'pasiValue', '0');
    } else {
      answerHAQ(doc, '0');
    }
  }, {
    final: VERDICT_ALCANZADO,
    cumplidos: isSeg ? '6' : '5',
    estados: isSeg
      ? ['cumplido', 'cumplido', 'cumplido', 'cumplido', 'cumplido', 'cumplido', 'pendiente']
      : ['cumplido', 'cumplido', 'pendiente', 'pendiente', 'cumplido', 'cumplido', 'cumplido'],
    values: isSeg ? { mdaHAQ: '' } : undefined
  });

  // C2 (Seguimiento): 5 cumplidos + 2 pendientes (psoriasis y HAQ sin fuente)
  // -> ALCANZADO.
  if (isSeg) {
    verdictCase(page, 'C2 5 cumplidos + 2 pendientes -> MDA ALCANZADO', (doc) => {
      setValue(doc, 'asdasNAT', '0');
      setValue(doc, 'asdasNAD', '0');
      setValue(doc, 'evaDolor', '1');
      setValue(doc, 'evaGlobal', '1');
    }, {
      final: VERDICT_ALCANZADO,
      cumplidos: '5',
      estados: ['cumplido', 'cumplido', 'pendiente', 'cumplido', 'cumplido', 'cumplido', 'pendiente'],
      statuses: [undefined, undefined, '—', undefined, undefined, undefined, '—']
    });
  }

  // C3: 4 cumplidos + 1 pendiente (psoriasis con PASI>1 y BSA ausente) + 2 no
  //     -> PENDIENTE (nunca una conclusión definitiva NO ALCANZADO).
  //     Sólo construible donde existen controles PASI/BSA.
  if (isSeg) {
    verdictCase(page, 'C3 4 cumplidos + 1 pendiente + 2 no -> MDA PENDIENTE', (doc) => {
      setValue(doc, 'asdasNAT', '0');
      setValue(doc, 'asdasNAD', '0');
      setValue(doc, 'evaDolor', '1');
      setValue(doc, 'evaGlobal', '9');
      setValue(doc, 'pasiValue', '5');
      answerHAQ(doc, '3');
    }, {
      final: 'MDA PENDIENTE',
      finalExact: false,
      finalNot: 'ALCANZADO',
      finalNames: ['PASI o BSA'],
      cumplidos: '—',
      estados: ['cumplido', 'cumplido', 'pendiente', 'cumplido', 'cumplido', 'no_cumplido', 'no_cumplido'],
      statuses: [undefined, undefined, '—', undefined, undefined, '✗', '✗'],
      values: { mdaPsoriasis: 'PASI: 5.0', mdaEvaGlobal: '90', mdaHAQ: '3.00' }
    });

    // C4: 3 cumplidos + 1 pendiente + 3 no -> NO ALCANZADO (regla >=5).
    verdictCase(page, 'C4 3 cumplidos + 1 pendiente + 3 no -> MDA NO ALCANZADO', (doc) => {
      setValue(doc, 'asdasNAT', '2');
      setValue(doc, 'asdasNAD', '2');
      setValue(doc, 'evaDolor', '1');
      setValue(doc, 'evaGlobal', '1');
      setValue(doc, 'pasiValue', '5');
      answerHAQ(doc, '3');
    }, {
      final: VERDICT_NO_ALCANZADO,
      cumplidos: '3',
      estados: ['no_cumplido', 'no_cumplido', 'pendiente', 'cumplido', 'cumplido', 'cumplido', 'no_cumplido'],
      statuses: [undefined, undefined, '—', undefined, undefined, undefined, '✗']
    });

    // C5: PASI conocido positivo + BSA ausente -> psoriasis cumplido.
    verdictCase(page, 'C5 psoriasis PASI 0.5 + BSA ausente -> cumplido', (doc) => {
      setValue(doc, 'pasiValue', '0.5');
    }, {
      estados: [undefined, undefined, 'cumplido', undefined, undefined, undefined, undefined],
      statuses: [undefined, undefined, '✓', undefined, undefined, undefined, undefined]
    });

    // C6: PASI conocido negativo + BSA ausente -> psoriasis pendiente.
    verdictCase(page, 'C6 psoriasis PASI 5 + BSA ausente -> pendiente', (doc) => {
      setValue(doc, 'pasiValue', '5');
    }, {
      final: 'MDA PENDIENTE',
      finalExact: false,
      finalNot: 'ALCANZADO',
      estados: [undefined, undefined, 'pendiente', undefined, undefined, undefined, undefined],
      statuses: [undefined, undefined, '—', undefined, undefined, undefined, undefined]
    });

    // C7: PASI y BSA conocidas negativas -> psoriasis no_cumplido.
    verdictCase(page, 'C7 psoriasis PASI 5 + BSA 50 -> no_cumplido', (doc) => {
      setValue(doc, 'pasiValue', '5');
      setValue(doc, 'bsaValue', '50');
    }, {
      estados: [undefined, undefined, 'no_cumplido', undefined, undefined, undefined, undefined],
      statuses: [undefined, undefined, '✗', undefined, undefined, undefined, undefined]
    });

    // C8 guard: 6/7 with every source present -> ALCANZADO (the 6/7 literal was
    // corrected under express Cora authorization during T4 #516; preserved).
    verdictCase(page, 'C8 6/7 con todas las fuentes presentes -> MDA ALCANZADO (literal 6/7 human-authorized)', (doc) => {
      setValue(doc, 'asdasNAT', '0');
      setValue(doc, 'asdasNAD', '0');
      setValue(doc, 'evaDolor', '1');
      setValue(doc, 'evaGlobal', '9');
      setValue(doc, 'pasiValue', '0');
      answerHAQ(doc, '0');
    }, {
      final: VERDICT_ALCANZADO,
      cumplidos: '6',
      estados: ['cumplido', 'cumplido', 'cumplido', 'cumplido', 'cumplido', 'no_cumplido', 'cumplido']
    });

    // C9 guard: 4/7 with every source present -> NO ALCANZADO (rule >=5).
    verdictCase(page, 'C9 4/7 con todas las fuentes presentes -> MDA NO ALCANZADO', (doc) => {
      setValue(doc, 'asdasNAT', '0');
      setValue(doc, 'asdasNAD', '0');
      setValue(doc, 'evaDolor', '1');
      setValue(doc, 'evaGlobal', '9');
      setValue(doc, 'pasiValue', '9');
      setValue(doc, 'bsaValue', '50');
      answerHAQ(doc, '3');
    }, {
      final: VERDICT_NO_ALCANZADO,
      cumplidos: '4',
      estados: ['cumplido', 'cumplido', 'no_cumplido', 'cumplido', 'cumplido', 'no_cumplido', 'no_cumplido']
    });
  } else {
    // Primera Visita: sin controles PASI/BSA/LEI -> esas fuentes quedan
    // pendientes por diseño (no se inventan controles: #519 NO TOCA).
    verdictCase(page, 'C4 2 cumplidos + 2 pendientes + 3 no -> MDA NO ALCANZADO', (doc) => {
      setValue(doc, 'asdasNAT', '2');
      setValue(doc, 'asdasNAD', '2');
      setValue(doc, 'evaDolor', '9');
      setValue(doc, 'evaGlobal', '1');
      answerHAQ(doc, '0');
    }, {
      final: VERDICT_NO_ALCANZADO,
      cumplidos: '2',
      estados: ['no_cumplido', 'no_cumplido', 'pendiente', 'pendiente', 'no_cumplido', 'cumplido', 'cumplido']
    });
    verdictCase(page, 'C4b 0 cumplidos + 2 pendientes + 5 no -> MDA NO ALCANZADO', (doc) => {
      setValue(doc, 'asdasNAT', '2');
      setValue(doc, 'asdasNAD', '2');
      setValue(doc, 'evaDolor', '9');
      setValue(doc, 'evaGlobal', '9');
      answerHAQ(doc, '3');
    }, {
      final: VERDICT_NO_ALCANZADO,
      cumplidos: '0'
    });

    // P3 guard: 4 cumplidos + 3 pendientes -> PENDIENTE nombrando las fuentes.
    verdictCase(page, 'P3 4 cumplidos + 3 pendientes -> MDA PENDIENTE con fuentes nombradas', (doc) => {
      setValue(doc, 'asdasNAT', '0');
      setValue(doc, 'asdasNAD', '0');
      setValue(doc, 'evaDolor', '1');
      setValue(doc, 'evaGlobal', '1');
    }, {
      final: 'MDA PENDIENTE',
      finalExact: false,
      finalNot: 'ALCANZADO',
      finalNames: ['PASI o BSA', 'LEI', 'HAQ'],
      cumplidos: '—'
    });
  }
}

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
if (failed > 0) {
  console.log('reuma_mda_verdict_check FAILED');
  process.exit(1);
}
console.log('reuma_mda_verdict_check PASS');
