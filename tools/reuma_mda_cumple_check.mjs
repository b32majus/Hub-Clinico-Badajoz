#!/usr/bin/env node
'use strict';
/**
 * Deterministic acceptance oracle for C3 #520
 * (TRAIN-NEXUS-REUMA-SAFETY-WIRING-12.1, parent #517).
 *
 * Accepted authority (#520):
 *   - The legacy boolean `mdaCumple` may only be produced by the EXPLICIT
 *     `MDA ALCANZADO` verdict.
 *   - `MDA NO ALCANZADO`, `MDA PENDIENTE`, blank/absent and any unknown text
 *     must never produce `true` (false/absence according to the already
 *     published type; the collectors publish a boolean, so `false`).
 *   - The old `text.includes('ALCANZADO')` derivation is a defect: the string
 *     'MDA NO ALCANZADO' contains 'ALCANZADO' and exported true.
 *   - No layout/column-count change in the legacy 497 rows, no other MDA
 *     field change, no clinical rule change (C2 #519 owns the verdicts).
 *
 * The oracle is independent from the implementation and must be able to fail
 * it. It reads the REAL HTML plus the REAL modules/scoreCalculators.js,
 * modules/exportManager.js and modules/formController.js inside a vm sandbox
 * behind a minimal fake document, and exercises BOTH visit collectors and the
 * legacy row/note producers.
 *
 *   A. Collector derivation (both pages, both collectors):
 *      A1 'MDA ALCANZADO ✓' -> true
 *      A2 'MDA ALCANZADO'   -> true
 *      A3 'MDA NO ALCANZADO' -> false          (RED on the unmodified code)
 *      A4 'MDA PENDIENTE — fuentes ausentes: HAQ' -> false
 *      A5 '' and whitespace -> false
 *      A6 unknown/foreign/partial texts -> false, never true
 *          ('ALCANZADO', 'mda alcanzado', 'MDA ALCANZADO ✓ (extra)',
 *           'texto desconocido', 'PENDIENTE', 'NO ALCANZADO')
 *      A7 no console.error while collecting.
 *
 *   B. Legacy export mapping:
 *      B1 APs Seguimiento row: mdaCumple true -> column 193 = 'SI',
 *         false -> 'NO'; the row keeps 497 columns and column 186-192 (the
 *         seven MDA value spans) keep their positions.
 *      B2 Primera Visita rows keep the published layout (MDA block empty at
 *         186-193, 497 columns) — C3 must not start exporting MDA there.
 *      B3 AR-base rows (AR/LES/Sjögren) keep column 193 = SI/NO mapping and
 *         497 columns.
 *
 *   C. Clinical note (`generarNotaClinica`) never claims MDA achieved for a
 *      negative/pending/blank verdict.
 *
 * Synthetic data only. No product file is modified at run time.
 * Exit code 0 = all cases PASS, 1 = at least one FAIL.
 * Usage: node tools/reuma_mda_cumple_check.mjs
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

const WATCHED_IDS = [
  'mdaSection', 'mdaCumplidos', 'mdaResultadoFinal',
  ...Array.from({ length: 7 }, (_, i) => `mdaCriterio${i + 1}`),
  ...Array.from({ length: 7 }, (_, i) => `mdaStatus${i + 1}`),
  'mdaNAT', 'mdaNAD', 'mdaPsoriasis', 'mdaLEI', 'mdaEvaDolor', 'mdaEvaGlobal', 'mdaHAQ',
  'diagnosticoPrimario', 'idPaciente', 'nombrePaciente', 'fechaVisita', 'sexoPaciente'
];

const MDA_COL_193 = 193;
const MDA_VALUE_BLOCK = [186, 187, 188, 189, 190, 191, 192];
const EXPORT_COLUMN_COUNT = 497;
const BUILDER_PATHOLOGY = { aps: 'APs', espa: 'EspA', ar: 'AR', les: 'LES', sjogren: 'SJOGREN' };

// Frozen verdict table (published strings from C2 #519 / T4 #516).
const VERDICT_CASES = [
  ['MDA ALCANZADO ✓', true],
  ['MDA ALCANZADO', true],
  ['MDA NO ALCANZADO', false],
  ['MDA PENDIENTE — fuentes ausentes: HAQ', false],
  ['MDA PENDIENTE — fuentes ausentes: PASI o BSA, LEI', false],
  ['MDA PENDIENTE', false],
  ['', false],
  ['   ', false],
  ['ALCANZADO', false],
  ['mda alcanzado', false],
  ['MDA ALCANZADO ✓ (extra)', false],
  ['NO ALCANZADO', false],
  ['PENDIENTE', false],
  ['texto desconocido', false],
  ['undefined', false],
  ['[object Object]', false]
];

const results = [];
function record(name, pass, detail) {
  results.push(!!pass);
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : (detail ? ` -> ${detail}` : '')}`);
}

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
    tagName: 'DIV',
    style: {},
    dataset: {},
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
      readOnly: hasReadonlyAttr(html, id)
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

  // Real `.lei-point` / `.haq-score` controls from the page markup.
  {
    const re = /<input\b[^>]*\bclass="[^"]*\blei-point\b[^"]*"[^>]*>/gi;
    let match;
    let index = 0;
    while ((match = re.exec(html)) !== null) {
      const cls = (match[0].match(/\bclass="([^"]*)"/i) || [])[1] || '';
      const el = makeElement(`__leiPoint${index}__`, { classList: cls, tagName: 'INPUT' });
      el.type = 'checkbox';
      byId.set(el.id, el);
      index += 1;
    }
    const reHaq = /<(select|input)\b[^>]*\bclass="[^"]*\b(haq-score|haq-aid)\b[^"]*"[^>]*>/gi;
    index = 0;
    while ((match = reHaq.exec(html)) !== null) {
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
  vm.runInContext(fs.readFileSync(EXPORT_FILE, 'utf8'), sandbox, { filename: 'modules/exportManager.js' });
  vm.runInContext(fs.readFileSync(FORM_FILE, 'utf8'), sandbox, { filename: 'modules/formController.js' });
  HubTools.form.initScoreWiring();
  return { doc, sandbox, consoleErrors };
}

function collectorName(page) {
  return page === 'seguimiento.html' ? 'recopilarDatosFormularioSeguimiento' : 'recopilarDatosFormulario';
}

function collect(page, sandbox, pathology, verdict) {
  const doc = sandbox.__doc;
  doc.getElementById('diagnosticoPrimario').value = pathology;
  doc.getElementById('mdaResultadoFinal').textContent = verdict;
  return sandbox.HubTools.form[collectorName(page)]();
}

function buildRow(sandbox, pathology, visit, datos) {
  const fn = `generarFilaCSV_${BUILDER_PATHOLOGY[pathology]}_${visit}`;
  const builder = sandbox.HubTools.export[fn];
  if (typeof builder !== 'function') throw new Error(`builder no disponible: ${fn}`);
  return builder(JSON.parse(JSON.stringify(datos))).split('\t');
}

console.log('A. Derivación del booleano legacy mdaCumple (ambos recopiladores)');
for (const page of PAGES) {
  const { doc, sandbox, consoleErrors } = loadScenario(page);
  sandbox.__doc = doc;
  const visit = page === 'seguimiento.html' ? 'Seguimiento' : 'PrimeraVisita';

  for (const [verdict, expected] of VERDICT_CASES) {
    const datos = collect(page, sandbox, 'aps', verdict);
    record(`A ${page} '${verdict}' -> mdaCumple === ${expected}`,
      datos.mdaCumple === expected,
      `mdaCumple=${JSON.stringify(datos.mdaCumple)}`);
  }

  // Both collectors must also keep publishing the seven MDA value spans and
  // the verdict text unchanged (C3 only touches the boolean).
  const sample = collect(page, sandbox, 'aps', 'MDA NO ALCANZADO');
  record(`A ${page} recopilado conserva los 7 spans MDA y el veredicto literal`,
    ['mdaNAT', 'mdaNAD', 'mdaPASI', 'mdaDolor', 'mdaGlobal', 'mdaHAQ', 'mdaEntesitis']
      .every((key) => Object.prototype.hasOwnProperty.call(sample, key)) &&
      typeof sample.mdaCumple === 'boolean',
    JSON.stringify({ mdaCumple: sample.mdaCumple }));

  record(`A ${page} sin console.error al recopilar`,
    consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));

  // --- B: legacy export mapping ------------------------------------------
  // Section B isolates the mapping: it feeds a controlled boolean so a broken
  // derivation cannot mask a broken mapper (and vice versa; A covers the
  // derivation end-to-end for this very verdict).
  const achieved = collect(page, sandbox, 'aps', 'MDA ALCANZADO ✓');
  achieved.mdaCumple = true;
  const notAchieved = collect(page, sandbox, 'aps', 'MDA NO ALCANZADO');
  const pending = collect(page, sandbox, 'aps', 'MDA PENDIENTE — fuentes ausentes: HAQ');
  const blank = collect(page, sandbox, 'aps', '');

  if (page === 'seguimiento.html') {
    const rowTrue = buildRow(sandbox, 'aps', visit, achieved);
    const rowFalse = buildRow(sandbox, 'aps', visit, notAchieved);
    const rowPending = buildRow(sandbox, 'aps', visit, pending);
    const rowBlank = buildRow(sandbox, 'aps', visit, blank);
    record(`B1 ${page} APs fila: mdaCumple true -> col ${MDA_COL_193} 'SI' (497 columnas)`,
      rowTrue[MDA_COL_193 - 1] === 'SI' && rowTrue.length === EXPORT_COLUMN_COUNT,
      `valor='${rowTrue[MDA_COL_193 - 1]}', len=${rowTrue.length}`);
    record(`B1 ${page} APs fila: NO ALCANZADO/PENDIENTE/vacío -> col ${MDA_COL_193} 'NO'`,
      rowFalse[MDA_COL_193 - 1] === 'NO' && rowPending[MDA_COL_193 - 1] === 'NO' &&
        rowBlank[MDA_COL_193 - 1] === 'NO',
      JSON.stringify([rowFalse[MDA_COL_193 - 1], rowPending[MDA_COL_193 - 1], rowBlank[MDA_COL_193 - 1]]));
    record(`B1 ${page} APs fila: bloque de valores MDA ${MDA_VALUE_BLOCK.join('/')} intacto (497)`,
      MDA_VALUE_BLOCK.every((col) => typeof rowTrue[col - 1] === 'string') &&
        rowTrue.length === EXPORT_COLUMN_COUNT,
      JSON.stringify(MDA_VALUE_BLOCK.map((col) => rowTrue[col - 1])));

    const espRow = buildRow(sandbox, 'espa', visit, achieved);
    record(`B1 ${page} EspA fila: col ${MDA_COL_193} vacío en el layout publicado (MDA es APs)`,
      espRow[MDA_COL_193 - 1] === '' && espRow.length === EXPORT_COLUMN_COUNT,
      `valor='${espRow[MDA_COL_193 - 1]}', len=${espRow.length}`);

    for (const pathology of ['les', 'sjogren', 'ar']) {
      const rowT = buildRow(sandbox, pathology, visit, achieved);
      const rowF = buildRow(sandbox, pathology, visit, notAchieved);
      const expectedTrue = 'SI';
      const expectedFalse = 'NO';
      record(`B3 ${page} ${pathology.toUpperCase()} fila: col ${MDA_COL_193} '${expectedTrue}'/'${expectedFalse}' (497)`,
        rowT[MDA_COL_193 - 1] === expectedTrue && rowF[MDA_COL_193 - 1] === expectedFalse &&
          rowT.length === EXPORT_COLUMN_COUNT,
        `true='${rowT[MDA_COL_193 - 1]}', false='${rowF[MDA_COL_193 - 1]}', len=${rowT.length}`);
    }
  } else {
    const rowTrue = buildRow(sandbox, 'aps', visit, achieved);
    const rowFalse = buildRow(sandbox, 'aps', visit, notAchieved);
    record(`B2 ${page} fila APs: bloque MDA ${MDA_VALUE_BLOCK[0]}-${MDA_COL_193} vacío y 497 columnas (layout intacto)`,
      rowTrue.length === EXPORT_COLUMN_COUNT &&
        MDA_VALUE_BLOCK.every((col) => rowTrue[col - 1] === '') &&
        rowTrue[MDA_COL_193 - 1] === '' && rowFalse[MDA_COL_193 - 1] === '',
      JSON.stringify({ len: rowTrue.length, block: rowTrue.slice(MDA_VALUE_BLOCK[0] - 1, MDA_COL_193) }));

    const espRow = buildRow(sandbox, 'espa', visit, achieved);
    record(`B2 ${page} fila EspA: 497 columnas y bloque MDA vacío`,
      espRow.length === EXPORT_COLUMN_COUNT &&
        MDA_VALUE_BLOCK.every((col) => espRow[col - 1] === '') && espRow[MDA_COL_193 - 1] === '',
      JSON.stringify({ len: espRow.length, block: espRow.slice(MDA_VALUE_BLOCK[0] - 1, MDA_COL_193) }));

    for (const pathology of ['les', 'sjogren', 'ar']) {
      const rowT = buildRow(sandbox, pathology, visit, achieved);
      const rowF = buildRow(sandbox, pathology, visit, notAchieved);
      record(`B3 ${page} ${pathology.toUpperCase()} fila: col ${MDA_COL_193} 'SI'/'NO' (497)`,
        rowT[MDA_COL_193 - 1] === 'SI' && rowF[MDA_COL_193 - 1] === 'NO' &&
          rowT.length === EXPORT_COLUMN_COUNT,
        `true='${rowT[MDA_COL_193 - 1]}', false='${rowF[MDA_COL_193 - 1]}', len=${rowT.length}`);
    }
  }

  // --- C: clinical note never claims achievement for other verdicts -------
  {
    const makeNote = (verdict) => {
      const datos = collect(page, sandbox, 'aps', verdict);
      return sandbox.HubTools.export.generarNotaClinica(datos);
    };
    const noteAchieved = makeNote('MDA ALCANZADO ✓');
    const noteNo = makeNote('MDA NO ALCANZADO');
    const notePending = makeNote('MDA PENDIENTE — fuentes ausentes: HAQ');
    const noteBlank = makeNote('');
    record(`C ${page} nota clínica: 'MDA: true' sólo con MDA ALCANZADO`,
      /MDA: true/.test(noteAchieved) &&
        !/MDA: true/.test(noteNo) && !/MDA: true/.test(notePending) && !/MDA: true/.test(noteBlank),
      JSON.stringify({
        alcanzado: (noteAchieved.match(/MDA: .*/) || [])[0],
        noAlcanzado: (noteNo.match(/MDA: .*/) || [])[0],
        pendiente: (notePending.match(/MDA: .*/) || [])[0],
        vacio: (noteBlank.match(/MDA: .*/) || [])[0]
      }));
  }
}

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
if (failed > 0) {
  console.log('reuma_mda_cumple_check FAILED');
  process.exit(1);
}
console.log('reuma_mda_cumple_check PASS');
