#!/usr/bin/env node
'use strict';
/**
 * Reuma #942 (inventario A7): MDA en el export, preparado para investigación.
 * Decisión de Sil (14-11):
 *   - Columna 193 MDA_Cumple: 'SI' alcanzado, 'NO' no alcanzado, '' si pendiente,
 *     sin calcular, veredicto desconocido o la patología no es APs (ausente ≠ NO).
 *   - Nueva columna 534 MDA_Criterios_Cumplidos (última): recuento 0-7 de la pantalla
 *     cuando el veredicto es definitivo; '' si pendiente o el recuento no es un entero
 *     0-7; 'NA' si la patología no es APs (como el bloque DAPSA).
 *   - Primera visita de APs exporta también 186-193 y 534 (dato basal).
 *   - No se exporta el estado por criterio. El booleano mdaCumple (#520) no cambia.
 * Carga el HTML real y los módulos reales en un sandbox vm (arnés de reuma_mda_cumple_check).
 * Solo datos sintéticos. Exit 0 = todo PASS.
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

const BUILDER_PATHOLOGY = { aps: 'APs', espa: 'EspA', ar: 'AR', les: 'LES', sjogren: 'SJOGREN' };

// Frozen verdict table (published strings from C2 #519 / T4 #516).

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


const COL_COUNT = 534;
const C193 = 193;
const C534 = 534;
const VALUE_COLS = [186, 187, 188, 189, 190, 191, 192];
// Spans de valor en el orden de las columnas 186-192 (mdaNAT, mdaNAD, mdaPASI, mdaDolor, mdaGlobal, mdaHAQ, mdaEntesitis).
const VALUE_SPANS = ['mdaNAT', 'mdaNAD', 'mdaPsoriasis', 'mdaEvaDolor', 'mdaEvaGlobal', 'mdaHAQ', 'mdaLEI'];
const SPAN_VALUES = ['0', '1', '0.5', '15', '20', '0.375', '0'];

function setScreen(doc, verdict, count, spans) {
  doc.getElementById('mdaResultadoFinal').textContent = verdict;
  doc.getElementById('mdaCumplidos').textContent = count;
  VALUE_SPANS.forEach((id, i) => { doc.getElementById(id).textContent = spans ? spans[i] : ''; });
}

function collectRow(page, ctx, pathology, verdict, count, spans) {
  const { doc, sandbox } = ctx;
  doc.getElementById('diagnosticoPrimario').value = pathology;
  setScreen(doc, verdict, count, spans);
  const datos = sandbox.HubTools.form[collectorName(page)]();
  const visit = page === 'seguimiento.html' ? 'Seguimiento' : 'PrimeraVisita';
  return { datos, row: buildRow(sandbox, pathology, visit, datos) };
}

const col = (row, n) => row[n - 1];

console.log('H. Cabeceras');
{
  const { sandbox } = loadScenario('seguimiento.html');
  const ex = sandbox.HubTools.export;
  record('H1 FINAL_V2_EXPORT_COLUMN_COUNT === 534', ex.FINAL_V2_EXPORT_COLUMN_COUNT === COL_COUNT, String(ex.FINAL_V2_EXPORT_COLUMN_COUNT));
  const h = ex.FINAL_V2_EXPORT_HEADERS || [];
  record('H2 FINAL_V2_EXPORT_HEADERS tiene 314 cabeceras (534 - 220) y la última es MDA_Criterios_Cumplidos',
    h.length === COL_COUNT - 220 && h[h.length - 1] === 'MDA_Criterios_Cumplidos', `len=${h.length}, last=${h[h.length - 1]}`);
  record('H3 la cabecera MDA_Criterios_Cumplidos aparece una sola vez', h.filter((x) => x === 'MDA_Criterios_Cumplidos').length === 1);
  record('H4 las 36 cabeceras de pauta siguen en 498-533', (ex.PAUTA_V2_HEADERS || []).every((x, i) => h[497 - 220 + i] === x), '');
}

for (const page of PAGES) {
  const ctx = loadScenario(page);
  ctx.sandbox.__doc = ctx.doc;
  const tag = page === 'seguimiento.html' ? 'SEG' : 'PV';
  console.log(`E. APs ${page}`);

  {
    const { datos, row } = collectRow(page, ctx, 'aps', 'MDA ALCANZADO ✓', '6', SPAN_VALUES);
    record(`E1 ${tag} alcanzado 6/7: 534 columnas`, row.length === COL_COUNT, `len=${row.length}`);
    record(`E1 ${tag} alcanzado 6/7: col 193 'SI' y col 534 '6'`, col(row, C193) === 'SI' && col(row, C534) === '6',
      JSON.stringify([col(row, C193), col(row, C534)]));
    record(`E1 ${tag} alcanzado: cols 186-192 llevan los 7 valores de pantalla (0 incluido)`,
      VALUE_COLS.every((c, i) => col(row, c) === SPAN_VALUES[i]), JSON.stringify(VALUE_COLS.map((c) => col(row, c))));
    record(`E1 ${tag} el booleano mdaCumple (#520) sigue siendo true`, datos.mdaCumple === true, JSON.stringify(datos.mdaCumple));
  }
  {
    const { row } = collectRow(page, ctx, 'aps', 'MDA NO ALCANZADO', '3', SPAN_VALUES);
    record(`E2 ${tag} no alcanzado 3/7: 'NO' y '3'`, col(row, C193) === 'NO' && col(row, C534) === '3',
      JSON.stringify([col(row, C193), col(row, C534)]));
  }
  {
    const { row } = collectRow(page, ctx, 'aps', 'MDA NO ALCANZADO', '0', SPAN_VALUES);
    record(`E3 ${tag} no alcanzado 0/7: 'NO' y '0' (el 0 no se pierde)`, col(row, C193) === 'NO' && col(row, C534) === '0',
      JSON.stringify([col(row, C193), col(row, C534)]));
  }
  for (const [name, verdict, count] of [
    ['E4 pendiente', 'MDA PENDIENTE — fuentes ausentes: HAQ', '—'],
    ['E4b pendiente con recuento visible', 'MDA PENDIENTE — fuentes ausentes: HAQ', '4'],
    ['E5 sin veredicto', '', '—'],
    ['E6 veredicto desconocido', 'texto desconocido', '4'],
    ['E6b veredicto parcial', 'NO ALCANZADO', '2']
  ]) {
    const { row } = collectRow(page, ctx, 'aps', verdict, count, SPAN_VALUES);
    record(`${name} ${tag}: col 193 '' y col 534 '' (nunca 'NO' ni un recuento)`, col(row, C193) === '' && col(row, C534) === '',
      JSON.stringify([col(row, C193), col(row, C534)]));
    record(`${name} ${tag}: 534 columnas`, row.length === COL_COUNT, `len=${row.length}`);
  }
  for (const bad of ['—', '', 'abc', '8', '-1', '5.5', '6 / 7']) {
    const { row } = collectRow(page, ctx, 'aps', 'MDA ALCANZADO ✓', bad, SPAN_VALUES);
    record(`E7 ${tag} alcanzado con recuento no válido ${JSON.stringify(bad)}: 'SI' y 534 ''`,
      col(row, C193) === 'SI' && col(row, C534) === '', JSON.stringify([col(row, C193), col(row, C534)]));
  }
  {
    const { row } = collectRow(page, ctx, 'aps', 'MDA ALCANZADO ✓', ' 7 ', SPAN_VALUES);
    record(`E8 ${tag} recuento con espacios ' 7 ' se acepta recortado`, col(row, C534) === '7', JSON.stringify(col(row, C534)));
  }

  console.log(`N. Patologías sin MDA ${page}`);
  for (const pathology of ['espa', 'ar', 'les', 'sjogren']) {
    const { row } = collectRow(page, ctx, pathology, 'MDA ALCANZADO ✓', '6', SPAN_VALUES);
    record(`N1 ${tag} ${pathology}: 534 columnas, col 193 '' y col 534 'NA'`,
      row.length === COL_COUNT && col(row, C193) === '' && col(row, C534) === 'NA',
      JSON.stringify({ len: row.length, c193: col(row, C193), c534: col(row, C534) }));
  }
}

console.log('L. Payload sin veredicto (datos antiguos): ausente ≠ NO');
{
  const { sandbox } = loadScenario('seguimiento.html');
  const base = { idPaciente: 'SYN-APS-001', diagnosticoPrimario: 'aps', fechaVisita: '2026-11-14' };
  const rowTrue = buildRow(sandbox, 'aps', 'Seguimiento', { ...base, mdaCumple: true });
  const rowFalse = buildRow(sandbox, 'aps', 'Seguimiento', { ...base, mdaCumple: false });
  const rowNone = buildRow(sandbox, 'aps', 'Seguimiento', { ...base });
  record("L1 mdaCumple true sin veredicto -> 'SI'", col(rowTrue, C193) === 'SI', JSON.stringify(col(rowTrue, C193)));
  record("L2 mdaCumple false sin veredicto -> '' (no se sabe si no se alcanzó)", col(rowFalse, C193) === '', JSON.stringify(col(rowFalse, C193)));
  record("L3 sin nada -> col 193 '' y col 534 ''", col(rowNone, C193) === '' && col(rowNone, C534) === '',
    JSON.stringify([col(rowNone, C193), col(rowNone, C534)]));
  record('L4 filas de 534 columnas', [rowTrue, rowFalse, rowNone].every((r) => r.length === COL_COUNT), '');
}

const failed = results.filter((x) => !x).length;
console.log(`\n${failed ? 'FAIL' : 'OK'} reuma_mda_export_research_check: ${results.length - failed}/${results.length}`);
process.exit(failed ? 1 : 0);
