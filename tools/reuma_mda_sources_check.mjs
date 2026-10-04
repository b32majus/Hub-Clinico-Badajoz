#!/usr/bin/env node
'use strict';
/**
 * Deterministic acceptance oracle for T4 #516
 * (TRAIN-NEXUS-REUMA-SAFETY-WIRING-12, parent #512).
 *
 * Accepted semantics (Ledger 3.2 #8, DEFECTO_REPRODUCIDO):
 *   APs MDA: mantener derivado/read-only con wiring desde campos de origen;
 *   observar y mostrar por criterio cumplido/no cumplido/pendiente + fuente
 *   faltante, sin fabricar datos.
 *
 * The oracle is independent from the implementation and must be able to fail
 * it. All assertions and literals below are frozen by the ticket authority;
 * the builder may not weaken, drop or replace them.
 *
 *   A. Static (real HTML, both pages):
 *      A1 #mdaSection carries `aps-only`.
 *      A2 the #mdaSection block contains no <input>/<select>/<textarea>/<button>.
 *      A3 the seven criterion rows (mdaCriterio1..7, mdaStatus1..7), the seven
 *         value spans and mdaCumplidos/mdaResultadoFinal exist; info-note says
 *         `≥5 de los 7 criterios`.
 *      A4 threshold wording frozen byte-for-byte and in order.
 *      A5 no fabricated static defaults: the initial #mdaResultadoFinal text
 *         contains no `ALCANZADO`; every #mdaStatus1..7 and #mdaCumplidos start
 *         at `—`; the seven collected value spans and #haqTotal start EMPTY
 *         (`''`, never `—`/`0.00`) — re-frozen by the #516 correction pass.
 *
 *   B. Pure calculation (real HubTools.scores.calcularMDA, no DOM):
 *      B1 all present, all reached -> coherent full result.
 *      B2 frozen threshold pairs + `cumplidos>=5` boundary.
 *      B3 one missing source -> only that criterion `pendiente`, the rest
 *         resolved, no coercion to 0/false, incomplete contract preserved.
 *      B4 empty object -> seven `pendiente` with every source named.
 *      B5 absence is never read as zero.
 *      B6 frozen key order / vocabulary in every scenario.
 *      B7 criterios/cumplidos/mdaAlcanzado/categoria equal an INDEPENDENT
 *         recomputation from the frozen thresholds in every scenario.
 *
 *   C. Rendering (recalcularMDA through the real formController.js, per page):
 *      C1 discriminating pending panel before any input.
 *      C2 full derivation on seguimiento.html (new PASI trigger) + demotion.
 *      C3 missing sources identified on primera_visita.html.
 *      C4 PASI/BSA is a live source on seguimiento.html (wiring gap).
 *      C5 visibility + DAPSA/ASDAS regression (T1/T2).
 *      C6 no console.error in any scenario.
 *
 * The fake `document` parses each watched element's id/class/readonly and its
 * initial text from the REAL HTML file under test at run time, and registers
 * the real `.lei-point` checkboxes, so the fixture can never disagree with
 * production markup. Synthetic data only. No product file is modified.
 *
 * Exit code 0 = all cases PASS, 1 = at least one FAIL.
 * Usage: node tools/reuma_mda_sources_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCORE_FILE = path.join(ROOT, 'modules', 'scoreCalculators.js');
const FORM_FILE = path.join(ROOT, 'modules', 'formController.js');
const PAGES = ['primera_visita.html', 'seguimiento.html'];

// Frozen vocabulary / order (independent from the implementation).
const CRITERIO_KEYS = ['nat', 'nad', 'psoriasis', 'lei', 'evaDolor', 'evaGlobal', 'haq'];
const FUENTES = ['NAT', 'NAD', 'PASI o BSA', 'LEI', 'EVA Dolor', 'EVA Global', 'HAQ'];
const ESTADOS = ['cumplido', 'no_cumplido', 'pendiente'];
const THRESHOLD_WORDING = [
  'NAT ≤ 1:',
  'NAD ≤ 1:',
  'PASI ≤ 1 o BSA ≤ 3%:',
  'LEI ≤ 1:',
  'EVA Dolor ≤ 15mm:',
  'EVA Global ≤ 20mm:',
  'HAQ ≤ 0.5:'
];
const VALUE_SPAN_IDS = ['mdaNAT', 'mdaNAD', 'mdaPsoriasis', 'mdaLEI', 'mdaEvaDolor', 'mdaEvaGlobal', 'mdaHAQ'];

// Frozen watch-list: these ids get their class/readonly/text from the real HTML.
const WATCHED_IDS = [
  'mdaSection',
  'mdaCriterio1', 'mdaCriterio2', 'mdaCriterio3', 'mdaCriterio4', 'mdaCriterio5', 'mdaCriterio6', 'mdaCriterio7',
  'mdaStatus1', 'mdaStatus2', 'mdaStatus3', 'mdaStatus4', 'mdaStatus5', 'mdaStatus6', 'mdaStatus7',
  ...VALUE_SPAN_IDS,
  'mdaCumplidos', 'mdaResultadoFinal',
  // real sources / surrounding surfaces
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

// Initial text of a non-void element with the given id, normalised.
function initialText(html, id) {
  const tag = openingTag(html, id);
  if (!tag) return '';
  if (/^<(input|img|br|hr|meta|link|source|area|col|embed|track|wbr)\b/i.test(tag)) return '';
  if (/\/>\s*$/.test(tag)) return '';
  const match = html.match(new RegExp(`<[^>]*\\bid="${escapeRegExp(id)}"[^>]*>([\\s\\S]*?)<`, 'i'));
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

// ---------------------------------------------------------------------------
// A. Static
// ---------------------------------------------------------------------------
console.log('A. Estático (HTML real, ambas páginas)');
for (const page of PAGES) {
  const html = readPage(page);
  const tokens = classTokens(html, 'mdaSection');
  record(`A1 ${page} #mdaSection conserva aps-only`,
    tokens !== null && tokens.includes('aps-only'),
    `class='${tokens === null ? '<tag no encontrado>' : tokens.join(' ')}'`);

  const start = html.indexOf('id="mdaSection"');
  const end = html.indexOf('<!-- RAPID3', start);
  const block = start >= 0 && end > start ? html.slice(start, end) : '';
  const forbidden = block.match(/<(input|select|textarea|button)\b/i);
  record(`A2 ${page} #mdaSection sin input/select/textarea/button`,
    block.length > 0 && !forbidden,
    `encontrado='${forbidden ? forbidden[0] : ''}'`);

  let a3 = true;
  const ids = [
    ...Array.from({ length: 7 }, (_, i) => `mdaCriterio${i + 1}`),
    ...Array.from({ length: 7 }, (_, i) => `mdaStatus${i + 1}`),
    ...VALUE_SPAN_IDS, 'mdaCumplidos', 'mdaResultadoFinal'
  ];
  for (const id of ids) if (!openingTag(html, id)) a3 = false;
  const infoOk = block.includes('≥5 de los 7 criterios');
  record(`A3 ${page} filas/valores/cumplidos/resultado + '≥5 de los 7 criterios'`,
    a3 && infoOk, `ids=${a3}, info=${infoOk}`);

  let a4 = true;
  let cursor = -1;
  const positions = [];
  for (const wording of THRESHOLD_WORDING) {
    const at = block.indexOf(wording);
    positions.push(at);
    if (at < 0 || at <= cursor) a4 = false;
    cursor = at;
  }
  record(`A4 ${page} umbrales literales y en orden`,
    a4, `posiciones=${JSON.stringify(positions)}`);

  const finalText = initialText(html, 'mdaResultadoFinal');
  const statusTexts = Array.from({ length: 7 }, (_, i) => initialText(html, `mdaStatus${i + 1}`));
  const cumplidosText = initialText(html, 'mdaCumplidos');
  // Re-freeze #516 correction: the seven collected value spans and #haqTotal
  // start empty. '—' here would leak into the legacy 497 export and a static
  // `0.00` in #haqTotal would fabricate HAQ evidence.
  const valueTexts = VALUE_SPAN_IDS.map((id) => initialText(html, id));
  const haqTotalText = initialText(html, 'haqTotal');
  record(`A5 ${page} sin defaults fabricados (final sin ALCANZADO; 7 status y cumplidos '—'; 7 valores y haqTotal '')`,
    !finalText.toUpperCase().includes('ALCANZADO') &&
      statusTexts.every((t) => t === '—') &&
      cumplidosText === '—' &&
      valueTexts.every((t) => t === '') && !valueTexts.some((t) => t.includes('—')) &&
      haqTotalText === '',
    `final='${finalText}', statuses=${JSON.stringify(statusTexts)}, cumplidos='${cumplidosText}', valores=${JSON.stringify(valueTexts)}, haqTotal='${haqTotalText}'`);
}

// ---------------------------------------------------------------------------
// B. Pure calculation
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
function fuenteOf(result, key) {
  const entry = (result.criterioEstados || []).find((c) => c && c.key === key);
  return entry ? entry.fuente : undefined;
}
function benign(overrides) {
  return Object.assign({
    nat: '0', nad: '0', pasiValue: '0', bsaValue: '', lei: '0',
    evaDolor: '0', evaGlobal: '0', haq: '0'
  }, overrides || {});
}
function parseLoose(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}
// Independent recomputation from the frozen thresholds (never a snapshot).
function independentMDA(input) {
  const nat = parseLoose(input.nat);
  const nad = parseLoose(input.nad);
  const pasi = parseLoose(input.pasiValue);
  const bsa = parseLoose(input.bsaValue);
  const lei = parseLoose(input.lei);
  const evaDolor = parseLoose(input.evaDolor);
  const evaGlobal = parseLoose(input.evaGlobal);
  const haq = parseLoose(input.haq);
  const evaluable = [nat, nad, lei, evaDolor, evaGlobal, haq].every((v) => v !== null) &&
    (pasi !== null || bsa !== null);
  if (!evaluable) {
    return { criterios: [], cumplidos: 0, mdaAlcanzado: false, categoria: 'Incompleto' };
  }
  const psoriasis = (pasi !== null && pasi <= 1) || (bsa !== null && bsa <= 3);
  const criterios = [
    nat <= 1, nad <= 1, psoriasis, lei <= 1,
    evaDolor * 10 <= 15, evaGlobal * 10 <= 20, haq <= 0.5
  ];
  const cumplidos = criterios.filter(Boolean).length;
  const mdaAlcanzado = cumplidos >= 5;
  return { criterios, cumplidos, mdaAlcanzado, categoria: mdaAlcanzado ? 'MDA alcanzado' : 'MDA no alcanzado' };
}

const bScenarios = [];
function runB(name, input, extra) {
  const result = calcularMDA(input);
  bScenarios.push({ name, input, result });
  const independent = independentMDA(input);
  const independentOk =
    JSON.stringify(result.criterios) === JSON.stringify(independent.criterios) &&
    result.cumplidos === independent.cumplidos &&
    result.mdaAlcanzado === independent.mdaAlcanzado &&
    result.categoria === independent.categoria;
  record(`B7 ${name} coincidencia con recálculo independiente`, independentOk,
    `module=${JSON.stringify({ criterios: result.criterios, cumplidos: result.cumplidos, mdaAlcanzado: result.mdaAlcanzado, categoria: result.categoria })} independent=${JSON.stringify(independent)}`);
  if (extra) extra(result);
  return result;
}

console.log('\nB. Cálculo puro (HubTools.scores.calcularMDA)');
runB('B1 todas presentes/alcanzadas', {
  nat: '0', nad: '0', pasiValue: '0', bsaValue: '', lei: '0',
  evaDolor: '0', evaGlobal: '0', haq: '0'
}, (r) => {
  const ok = r.evaluable === true &&
    Array.isArray(r.criterioEstados) && r.criterioEstados.length === 7 &&
    r.criterioEstados.every((e) => e.estado === 'cumplido') &&
    Array.isArray(r.fuentesPendientes) && r.fuentesPendientes.length === 0 &&
    r.cumplidos === 7 && r.mdaAlcanzado === true &&
    Array.isArray(r.criterios) && r.criterios.length === 7 && r.criterios.every(Boolean) &&
    r.categoria === 'MDA alcanzado' &&
    r.nat === 0 && r.nad === 0 && r.lei === 0 &&
    r.evaDolor === '0' && r.evaGlobal === '0' && r.haq === '0.00' &&
    r.psoriasis === 'PASI: 0.0';
  record('B1 resultado completo coherente', ok, JSON.stringify({
    evaluable: r.evaluable, cumplidos: r.cumplidos, mdaAlcanzado: r.mdaAlcanzado,
    estados: (r.criterioEstados || []).map((e) => e.estado),
    fuentesPendientes: r.fuentesPendientes, nat: r.nat, nad: r.nad, lei: r.lei,
    evaDolor: r.evaDolor, evaGlobal: r.evaGlobal, haq: r.haq, psoriasis: r.psoriasis
  }));
});

// Threshold pairs.
const pairs = [
  ['nat', '1', '2'],
  ['nad', '1', '2'],
  ['lei', '1', '2'],
  ['evaDolor', '1.5', '1.6'],
  ['evaGlobal', '2', '2.1'],
  ['haq', '0.5', '0.6']
];
for (const [key, okValue, badValue] of pairs) {
  const okResult = runB(`B2 ${key} ${okValue}`, benign({ [key]: okValue }));
  const badResult = runB(`B2 ${key} ${badValue}`, benign({ [key]: badValue }));
  record(`B2 ${key} umbral ${okValue}=cumplido / ${badValue}=no_cumplido`,
    okResult.evaluable === true && badResult.evaluable === true &&
      stateOf(okResult, key) === 'cumplido' && stateOf(badResult, key) === 'no_cumplido',
    `ok=${stateOf(okResult, key)}, bad=${stateOf(badResult, key)}, evaluable=${okResult.evaluable}/${badResult.evaluable}`);
}
{
  // Re-freeze #516 correction: a missing ALTERNATE source is never presented
  // as a negative. PASI 1.1 with BSA absent -> `pendiente` (was `no_cumplido`);
  // `no_cumplido` requires BOTH sources present and neither satisfying.
  const pasiOk = runB('B2 psoriasis PASI 1 sin BSA', benign({ pasiValue: '1', bsaValue: '' }));
  const pasiBad = runB('B2 psoriasis PASI 1.1 sin BSA', benign({ pasiValue: '1.1', bsaValue: '' }));
  record('B2 psoriasis PASI 1=cumplido / PASI 1.1 sin BSA=pendiente',
    pasiOk.evaluable === true && pasiBad.evaluable === true &&
      stateOf(pasiOk, 'psoriasis') === 'cumplido' && stateOf(pasiBad, 'psoriasis') === 'pendiente' &&
      fuenteOf(pasiBad, 'psoriasis') === 'PASI o BSA',
    `ok=${stateOf(pasiOk, 'psoriasis')}, bad=${stateOf(pasiBad, 'psoriasis')}`);
  const bothBad = runB('B2 psoriasis PASI 1.1 + BSA 4', benign({ pasiValue: '1.1', bsaValue: '4' }));
  record('B2 psoriasis PASI 1.1 + BSA 4 (ambas presentes, ninguna satisface)=no_cumplido',
    bothBad.evaluable === true && stateOf(bothBad, 'psoriasis') === 'no_cumplido',
    `estado=${stateOf(bothBad, 'psoriasis')}`);
  const bsaOk = runB('B2 psoriasis BSA 3 sin PASI', benign({ pasiValue: '', bsaValue: '3' }));
  const bsaBad = runB('B2 psoriasis BSA 3.1 sin PASI', benign({ pasiValue: '', bsaValue: '3.1' }));
  record('B2 psoriasis BSA 3=cumplido / BSA 3.1 sin PASI=pendiente',
    bsaOk.evaluable === true && bsaBad.evaluable === true &&
      stateOf(bsaOk, 'psoriasis') === 'cumplido' && stateOf(bsaBad, 'psoriasis') === 'pendiente',
    `ok=${stateOf(bsaOk, 'psoriasis')}, bad=${stateOf(bsaBad, 'psoriasis')}`);
  // The aggregate verdict still follows the published formula: an undetermined
  // psoriasis criterion is NOT credited (PASI 1.1 alone keeps psoriasis=false).
  record('B2 psoriasis pendiente no se acredita (criterios.psoriasis=false, fórmula intacta)',
    pasiBad.criterios.length === 7 && pasiBad.criterios[2] === false &&
      pasiBad.cumplidos === 6 && pasiBad.mdaAlcanzado === true,
    `criterios=${JSON.stringify(pasiBad.criterios)}, cumplidos=${pasiBad.cumplidos}, mdaAlcanzado=${pasiBad.mdaAlcanzado}`);
}
// mdaAlcanzado true exactly when cumplidos >= 5 (7 criteria).
{
  const cases = [
    ['B2 7/7', benign(), 7, true],
    ['B2 5/7', benign({ nat: '2', haq: '0.6' }), 5, true],
    ['B2 4/7', benign({ nat: '2', haq: '0.6', evaGlobal: '2.1' }), 4, false]
  ];
  for (const [label, input, expectedCumplidos, expectedReached] of cases) {
    const r = runB(label, input);
    record(`B2 ${label} cumplidos=${expectedCumplidos} mdaAlcanzado=${expectedReached}`,
      r.cumplidos === expectedCumplidos && r.mdaAlcanzado === expectedReached && r.evaluable === true,
      `cumplidos=${r.cumplidos}, mdaAlcanzado=${r.mdaAlcanzado}`);
  }
}

runB('B3 fuente HAQ ausente', benign({ haq: '' }), (r) => {
  const others = r.criterioEstados ? r.criterioEstados.filter((e) => e.key !== 'haq') : [];
  const ok = r.evaluable === false &&
    r.criterioEstados && r.criterioEstados.length === 7 &&
    r.criterioEstados[6].estado === 'pendiente' && r.criterioEstados[6].fuente === 'HAQ' &&
    others.every((e) => e.estado !== 'pendiente' && e.estado !== 'no_cumplido') &&
    JSON.stringify(r.fuentesPendientes) === JSON.stringify(['HAQ']) &&
    r.mdaAlcanzado === false && r.cumplidos === 0 &&
    Array.isArray(r.criterios) && r.criterios.length === 0 && r.categoria === 'Incompleto';
  record('B3 sólo HAQ pendiente, resto resuelto, contrato incompleto intacto', ok, JSON.stringify({
    evaluable: r.evaluable, estado6: r.criterioEstados && r.criterioEstados[6],
    others: others.map((e) => e.estado), fuentesPendientes: r.fuentesPendientes,
    cumplidos: r.cumplidos, criterios: r.criterios, categoria: r.categoria
  }));
});

runB('B4 objeto vacío', {}, (r) => {
  const ok = r.evaluable === false &&
    r.criterioEstados && r.criterioEstados.length === 7 &&
    r.criterioEstados.every((e) => e.estado === 'pendiente') &&
    JSON.stringify(r.fuentesPendientes) === JSON.stringify(FUENTES) &&
    r.cumplidos === 0 && r.mdaAlcanzado === false &&
    Array.isArray(r.criterios) && r.criterios.length === 0 && r.categoria === 'Incompleto';
  record('B4 siete pendientes con todas las fuentes nombradas', ok, JSON.stringify({
    estados: (r.criterioEstados || []).map((e) => e.estado),
    fuentesPendientes: r.fuentesPendientes, categoria: r.categoria
  }));
});

// B5 absence is never read as zero.
{
  const evaAbsent = runB('B5 evaGlobal ausente', benign({ evaGlobal: '' }));
  const evaZero = runB('B5 evaGlobal cero', benign({ evaGlobal: '0' }));
  record('B5 evaGlobal ausencia=pendiente / cero=resuelto',
    stateOf(evaAbsent, 'evaGlobal') === 'pendiente' && stateOf(evaZero, 'evaGlobal') === 'cumplido',
    `ausente=${stateOf(evaAbsent, 'evaGlobal')}, cero=${stateOf(evaZero, 'evaGlobal')}`);
  const natAbsent = runB('B5 nat ausente', benign({ nat: '' }));
  const natZero = runB('B5 nat cero', benign({ nat: '0' }));
  record('B5 nat ausencia=pendiente / cero=resuelto',
    stateOf(natAbsent, 'nat') === 'pendiente' && stateOf(natZero, 'nat') === 'cumplido',
    `ausente=${stateOf(natAbsent, 'nat')}, cero=${stateOf(natZero, 'nat')}`);
  const skinAbsent = runB('B5 psoriasis sin PASI/BSA', benign({ pasiValue: '', bsaValue: '' }));
  record('B5 psoriasis sin PASI ni BSA = pendiente (PASI o BSA)',
    stateOf(skinAbsent, 'psoriasis') === 'pendiente' && fuenteOf(skinAbsent, 'psoriasis') === 'PASI o BSA',
    `estado=${stateOf(skinAbsent, 'psoriasis')}, fuente=${fuenteOf(skinAbsent, 'psoriasis')}`);
  const skinPasi = runB('B5 psoriasis sólo PASI', benign({ pasiValue: '0', bsaValue: '' }));
  const skinBsa = runB('B5 psoriasis sólo BSA', benign({ pasiValue: '', bsaValue: '0' }));
  record('B5 psoriasis se resuelve con PASI solo o BSA solo',
    stateOf(skinPasi, 'psoriasis') === 'cumplido' && stateOf(skinBsa, 'psoriasis') === 'cumplido',
    `pasi=${stateOf(skinPasi, 'psoriasis')}, bsa=${stateOf(skinBsa, 'psoriasis')}`);
}

// B6 frozen key order / vocabulary for every scenario.
{
  let ok = true;
  let detail = '';
  for (const scenario of bScenarios) {
    const entries = scenario.result.criterioEstados;
    const keys = Array.isArray(entries) ? entries.map((e) => e.key) : [];
    const estadosOk = Array.isArray(entries) && entries.every((e) => ESTADOS.includes(e.estado));
    if (!Array.isArray(entries) || entries.length !== 7 ||
        JSON.stringify(keys) !== JSON.stringify(CRITERIO_KEYS) || !estadosOk) {
      ok = false;
      detail = `${scenario.name}: keys=${JSON.stringify(keys)}, estados=${JSON.stringify((entries || []).map((e) => e.estado))}`;
      break;
    }
  }
  record('B6 longitud 7, orden y vocabulario congelados en todos los escenarios', ok, detail);
}

// ---------------------------------------------------------------------------
// Minimal fake DOM (id/class/readonly/text parsed from the real HTML)
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
    closest() { return null; }
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
    return [];
  }

  // Register the real `.lei-point` checkboxes from the page markup.
  {
    const re = /<input\b[^>]*\bclass="[^"]*\blei-point\b[^"]*"[^>]*>/gi;
    let match;
    let index = 0;
    while ((match = re.exec(html)) !== null) {
      const tag = match[0];
      const cls = (tag.match(/\bclass="([^"]*)"/i) || [])[1] || '';
      const site = (tag.match(/\bdata-site="([^"]*)"/i) || [])[1] || '';
      const el = makeElement(`__leiPoint${index}__`, { classList: cls, dataset: { site }, tagName: 'INPUT' });
      el.type = 'checkbox';
      byId.set(el.id, el);
      index += 1;
    }
  }
  // Register the real `.haq-score` selects / `.haq-aid` checkboxes from the
  // page markup (re-freeze #516 correction: the HAQ source must be supplyable
  // through supported interaction equivalents; a static 0.00 no longer exists).
  {
    const reHaq = /<(select|input)\b[^>]*\bclass="[^"]*\b(haq-score|haq-aid)\b[^"]*"[^>]*>/gi;
    let match;
    let index = 0;
    while ((match = reHaq.exec(html)) !== null) {
      const tag = match[0];
      const cls = (tag.match(/\bclass="([^"]*)"/i) || [])[1] || '';
      const category = (tag.match(/\bdata-category="([^"]*)"/i) || [])[1] || '';
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

// ---------------------------------------------------------------------------
// Sandbox scenario loader
// ---------------------------------------------------------------------------
function loadScenario(page) {
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
  HubTools.form.initScoreWiring();
  return { doc, sandbox, consoleErrors };
}

function fire(doc, id, type) {
  const el = doc.getElementById(id);
  const handlers = (el.listeners && el.listeners[type]) || [];
  handlers.slice().forEach((fn) => fn.call(el, { type, target: el }));
}

// Supported-interaction equivalent: set the source value and fire the handlers
// registered on that field. No result field is ever written by the oracle.
function setValue(doc, id, value) {
  const el = doc.getElementById(id);
  el.value = String(value);
  fire(doc, id, 'input');
  fire(doc, id, 'change');
}

function setAttrs(doc, selector, attrs) {
  doc.querySelectorAll(selector).forEach((el) => { Object.assign(el, attrs); });
}

// Supported-interaction equivalent for the HAQ source: answer six real
// `.haq-score` categories and fire their change handlers (re-freeze #516
// correction: HAQ evidence must be captured, never static).
function answerHAQ(doc) {
  for (let i = 1; i <= 6; i++) {
    const sel = doc.querySelector('.haq-score[data-category="' + i + '"]');
    sel.value = '0';
    ((sel.listeners.change) || []).slice().forEach((fn) => fn.call(sel, { type: 'change', target: sel }));
  }
}

function fireAll(doc, selector, type) {
  doc.querySelectorAll(selector).forEach((el) => {
    ((el.listeners && el.listeners[type]) || []).slice().forEach((fn) => fn.call(el, { type, target: el }));
  });
}

function status(doc, i) {
  return doc.getElementById('mdaStatus' + i);
}
function statusText(doc, i) {
  return status(doc, i).textContent;
}
function estadoAttr(doc, i) {
  return status(doc, i).getAttribute('data-estado');
}

console.log('\nC. Render real (formController.recalcularMDA, por página)');

for (const page of PAGES) {
  // --- C1: pending panel before any input --------------------------------
  {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    sandbox.HubTools.form.adaptarFormulario('aps');
    const finalText = doc.getElementById('mdaResultadoFinal').textContent || '';
    const cumplidos = doc.getElementById('mdaCumplidos').textContent;
    const somePending = Array.from({ length: 7 }, (_, i) => estadoAttr(doc, i + 1)).some((e) => e === 'pendiente');
    record(`C1 ${page} panel pendiente sin fuentes (sin ALCANZADO, '—', pendiente)`,
      !finalText.toUpperCase().includes('ALCANZADO') &&
        cumplidos === '—' &&
        statusText(doc, 3) === '—' && statusText(doc, 6) === '—' &&
        somePending,
      `final='${finalText}', cumplidos='${cumplidos}', s3='${statusText(doc, 3)}', s6='${statusText(doc, 6)}'`);
    // Re-freeze #516 correction: the seven COLLECTED value spans (read
    // verbatim by both collectors and exported to legacy 497 columns 186-192)
    // never render '—'; absent source -> ''. #haqTotal starts empty.
    const c1Values = VALUE_SPAN_IDS.map((id) => doc.getElementById(id).textContent);
    const c1HaqTotal = doc.getElementById('haqTotal').textContent;
    record(`C1 ${page} 7 spans de valor recogidos '' (nunca '—') y #haqTotal vacío`,
      c1Values.every((t) => t === '') && !c1Values.some((t) => t.includes('—')) && c1HaqTotal === '',
      `valores=${JSON.stringify(c1Values)}, haqTotal='${c1HaqTotal}'`);
    record(`C6 ${page} sin console.error`, consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  }

  // --- C5: visibility + DAPSA / ASDAS regression -------------------------
  {
    const { doc, sandbox, consoleErrors } = loadScenario(page);
    sandbox.HubTools.form.adaptarFormulario('aps');
    const apsDisplay = doc.getElementById('mdaSection').style.display;
    sandbox.HubTools.form.adaptarFormulario('espa');
    const espaDisplay = doc.getElementById('mdaSection').style.display;
    record(`C5 ${page} #mdaSection block en APs y none en EspA`,
      apsDisplay === 'block' && espaDisplay === 'none',
      `aps='${apsDisplay}', espa='${espaDisplay}'`);

    sandbox.HubTools.form.adaptarFormulario('aps');
    setValue(doc, 'pcrValue', '30');
    setValue(doc, 'pcrUnit', 'mg/L');
    setValue(doc, 'asdasNAD', '1');
    setValue(doc, 'asdasNAT', '1');
    setValue(doc, 'evaDolor', '2');
    setValue(doc, 'evaGlobal', '4');
    const dapsa = doc.getElementById('dapsaResult').value;
    record(`C5 ${page} DAPSA APs intacto ('11.0')`, dapsa === '11.0', `dapsa='${dapsa}'`);

    const crpAps = doc.getElementById('asdasCrpResult').value;
    record(`C5 ${page} ASDAS-CRP vacío en APs (T1 intacto)`, crpAps === '', `crp='${crpAps}'`);

    sandbox.HubTools.form.adaptarFormulario('espa');
    setValue(doc, 'pcrValue', '30');
    setValue(doc, 'pcrUnit', 'mg/L');
    setValue(doc, 'asdasDolorEspalda', '3');
    setValue(doc, 'asdasDuracionRigidez', '2');
    setValue(doc, 'asdasNAD', '1');
    setValue(doc, 'evaGlobal', '4');
    const crpEspa = doc.getElementById('asdasCrpResult').value;
    record(`C5 ${page} ASDAS-CRP EspA '2.98' con EVA Global 4 (T2 intacto)`,
      crpEspa === '2.98', `crp='${crpEspa}'`);
    record(`C6 ${page} sin console.error (regresión)`, consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  }
}

// --- C2: full derivation + demotion on seguimiento.html ------------------
{
  const { doc, sandbox, consoleErrors } = loadScenario('seguimiento.html');
  sandbox.HubTools.form.adaptarFormulario('aps');
  setValue(doc, 'evaDolor', '1'); // fires the MDA cascade with everything else absent
  record('C2 seguimiento HAQ sin responder -> criterio HAQ pendiente (nunca fabricado)',
    estadoAttr(doc, 7) === 'pendiente' && doc.getElementById('mdaHAQ').textContent === '' &&
      doc.getElementById('haqTotal').textContent === '',
    `e7='${estadoAttr(doc, 7)}', v7='${doc.getElementById('mdaHAQ').textContent}', haqTotal='${doc.getElementById('haqTotal').textContent}'`);
  // Supply HAQ explicitly: answer six real `.haq-score` categories and fire
  // their change handlers (supported-interaction equivalent). 6 x 0 -> 0/6.
  answerHAQ(doc);
  record('C2 seguimiento HAQ respondido (6 categorías) -> #haqTotal derivado 0.00',
    doc.getElementById('haqTotal').textContent === '0.00' && estadoAttr(doc, 7) === 'cumplido',
    `haqTotal='${doc.getElementById('haqTotal').textContent}', e7='${estadoAttr(doc, 7)}'`);
  setValue(doc, 'asdasNAT', '0');
  setValue(doc, 'asdasNAD', '0');
  setValue(doc, 'evaDolor', '1');
  setValue(doc, 'evaGlobal', '1');
  setValue(doc, 'pasiValue', '0'); // PASI last: exercises the NEW trigger
  const finalText = doc.getElementById('mdaResultadoFinal').textContent;
  const cumplidos = doc.getElementById('mdaCumplidos').textContent;
  const allReached = Array.from({ length: 7 }, (_, i) => statusText(doc, i + 1)).every((t) => t === '✓') &&
    Array.from({ length: 7 }, (_, i) => estadoAttr(doc, i + 1)).every((e) => e === 'cumplido');
  record('C2 seguimiento derivación completa (7/7, MDA ALCANZADO ✓)',
    finalText === 'MDA ALCANZADO ✓' && cumplidos === '7' && allReached,
    `final='${finalText}', cumplidos='${cumplidos}', statuses=${JSON.stringify(Array.from({ length: 7 }, (_, i) => statusText(doc, i + 1)))}`);

  // One failure out of seven: 6/7 is still >= 5, so MDA remains reached (the
  // frozen C2 literal 'MDA NO ALCANZADO' here contradicted the frozen >=5
  // threshold and was corrected to the clinically-correct string with
  // coordinator authorization; see the ticket report).
  setValue(doc, 'evaGlobal', '9');
  record('C2 seguimiento un criterio no cumplido (status6 ✗, 6/7, sigue MDA ALCANZADO ✓)',
    statusText(doc, 6) === '✗' && estadoAttr(doc, 6) === 'no_cumplido' &&
      doc.getElementById('mdaCumplidos').textContent === '6' &&
      doc.getElementById('mdaResultadoFinal').textContent === 'MDA ALCANZADO ✓',
    `s6='${statusText(doc, 6)}'(${estadoAttr(doc, 6)}), cumplidos='${doc.getElementById('mdaCumplidos').textContent}', final='${doc.getElementById('mdaResultadoFinal').textContent}'`);

  // Three failures out of seven (4/7): below the frozen >=5 threshold,
  // exercises the unchanged 'MDA NO ALCANZADO' branch.
  setValue(doc, 'asdasNAT', '2');
  setValue(doc, 'asdasNAD', '2');
  setValue(doc, 'evaGlobal', '9'); // re-fire the MDA trigger after NAT/NAD
  record('C2 seguimiento tres criterios no cumplidos (4/7, MDA NO ALCANZADO)',
    statusText(doc, 1) === '✗' && estadoAttr(doc, 1) === 'no_cumplido' &&
      statusText(doc, 2) === '✗' && statusText(doc, 6) === '✗' &&
      doc.getElementById('mdaCumplidos').textContent === '4' &&
      doc.getElementById('mdaResultadoFinal').textContent === 'MDA NO ALCANZADO',
    `cumplidos='${doc.getElementById('mdaCumplidos').textContent}', final='${doc.getElementById('mdaResultadoFinal').textContent}'`);
  record('C6 seguimiento sin console.error (C2)', consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
}

// --- C3: missing source identified on primera_visita.html ----------------
{
  const { doc, sandbox, consoleErrors } = loadScenario('primera_visita.html');
  sandbox.HubTools.form.adaptarFormulario('aps');
  setValue(doc, 'asdasNAT', '0');
  setValue(doc, 'asdasNAD', '0');
  setValue(doc, 'evaDolor', '1');
  setValue(doc, 'evaGlobal', '1');
  const finalText = doc.getElementById('mdaResultadoFinal').textContent || '';
  // Re-freeze #516 correction: HAQ is NOT captured on this page here, so the
  // HAQ criterion is `pendiente` (never fulfilled by a static 0.00); only
  // criterios 1,2,5,6 resolve.
  const fourResolved = [1, 2, 5, 6].every((i) => statusText(doc, i) === '✓');
  const pendingValues = [3, 4, 7].map((i) => doc.getElementById(VALUE_SPAN_IDS[i - 1]).textContent);
  const label4 = (status(doc, 4).getAttribute('title') || '') + ' ' + (status(doc, 4).getAttribute('aria-label') || '');
  record('C3 primera_visita psoriasis/LEI/HAQ pendientes, cuatro resueltos, valores ausentes=\'\'',
    statusText(doc, 3) === '—' && statusText(doc, 4) === '—' && statusText(doc, 7) === '—' &&
      estadoAttr(doc, 7) === 'pendiente' && fourResolved &&
      pendingValues.every((t) => t === '') && !pendingValues.some((t) => t.includes('—')) &&
      doc.getElementById('mdaCumplidos').textContent === '—',
    `s3='${statusText(doc, 3)}', s4='${statusText(doc, 4)}', s7='${statusText(doc, 7)}'(e7=${estadoAttr(doc, 7)}), otros=${JSON.stringify([1, 2, 5, 6].map((i) => statusText(doc, i)))}, valores pendientes=${JSON.stringify(pendingValues)}, cumplidos='${doc.getElementById('mdaCumplidos').textContent}'`);
  record('C3 primera_visita resultado nombra PASI o BSA, LEI y HAQ sin ALCANZADO',
    finalText.includes('PASI o BSA') && finalText.includes('LEI') && finalText.includes('HAQ') &&
      !finalText.toUpperCase().includes('ALCANZADO'),
    `final='${finalText}'`);
  record('C3 primera_visita #mdaStatus4 documenta la fuente LEI',
    label4.includes('LEI'), `title/aria='${label4.trim()}'`);
  record('C6 primera_visita sin console.error (C3)', consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
}

// --- C4: PASI/BSA live trigger on seguimiento.html -----------------------
{
  const { doc, sandbox, consoleErrors } = loadScenario('seguimiento.html');
  sandbox.HubTools.form.adaptarFormulario('aps');
  setValue(doc, 'asdasNAT', '0');
  setValue(doc, 'asdasNAD', '0');
  setValue(doc, 'evaDolor', '1');
  setValue(doc, 'evaGlobal', '1');
  const before = { text: statusText(doc, 3), estado: estadoAttr(doc, 3) };
  // Re-freeze #516 correction, incomplete-contract boundary: while ANY source
  // is absent the index is not evaluable and the frozen incomplete contract
  // keeps every value field '' — the present PASI is neither fabricated nor
  // shown as '—' (it surfaces in fuentesPendientes via the psoriasis row).
  setValue(doc, 'pasiValue', '1.1');
  record('C4 seguimiento índice incompleto con PASI 1.1 -> estado pendiente, valor contrato=\'\' (nunca \'—\')',
    estadoAttr(doc, 3) === 'pendiente' && doc.getElementById('mdaPsoriasis').textContent === '',
    `e3='${estadoAttr(doc, 3)}', v3='${doc.getElementById('mdaPsoriasis').textContent}'`);
  // With HAQ captured the index becomes evaluable: the pendiente psoriasis row
  // (PASI 1.1 > 1, BSA absent) must keep the real captured value visible.
  answerHAQ(doc);
  record('C4 seguimiento sólo PASI 1.1 (evaluable) -> psoriasis pendiente con valor real visible',
    estadoAttr(doc, 3) === 'pendiente' && statusText(doc, 3) === '—' &&
      doc.getElementById('mdaPsoriasis').textContent === 'PASI: 1.1',
    `e3='${estadoAttr(doc, 3)}', v3='${doc.getElementById('mdaPsoriasis').textContent}'`);
  setValue(doc, 'bsaValue', '3'); // only BSA's input -> new trigger
  record('C4 seguimiento sólo BSA flipa psoriasis a cumplido (wiring gap)',
    statusText(doc, 3) === '✓' && estadoAttr(doc, 3) === 'cumplido' &&
      before.estado === 'pendiente',
    `antes=${JSON.stringify(before)}, despues='${statusText(doc, 3)}'(${estadoAttr(doc, 3)})`);
  record('C6 seguimiento sin console.error (C4)', consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
}

// `setAttrs`/`fireAll` are the supported-interaction helpers for the real
// `.lei-point` checkboxes (kept exercised so the fixture proves they work).
{
  const { doc } = loadScenario('seguimiento.html');
  const boxes = doc.querySelectorAll('.lei-point');
  setAttrs(doc, '.lei-point', { checked: true });
  fireAll(doc, '.lei-point', 'change');
  const allChecked = boxes.length > 0 && boxes.every((b) => b.checked);
  record('C4 helper .lei-point tickable (setAttrs/fireAll)',
    allChecked, `boxes=${boxes.length}, checked=${boxes.filter((b) => b.checked).length}`);
}

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
if (failed > 0) {
  console.log('reuma_mda_sources_check FAILED');
  process.exit(1);
}
console.log('reuma_mda_sources_check PASS');
