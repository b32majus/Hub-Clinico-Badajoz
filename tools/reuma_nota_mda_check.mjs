#!/usr/bin/env node
'use strict';
/**
 * Reuma (inventario A7, pendiente tras #942): línea del MDA en la nota clínica TXT.
 * Decisión de Sil (14-11):
 *   - APs, veredicto definitivo: «MDA: alcanzado (6/7 criterios)» / «MDA: no alcanzado (3/7 criterios)».
 *     Si el recuento no es un entero 0-7, el veredicto sin paréntesis.
 *   - Pendiente, sin calcular o texto desconocido: la nota NO escribe la línea (ausente ≠ NO).
 *     Antes escribía «MDA: false».
 *   - Nunca «MDA: true»/«MDA: false». Otras patologías: sin línea del MDA.
 *   - Datos sin mdaVeredicto: solo mdaCumple === true o MDA_Cumple 'SI' escriben «MDA: alcanzado».
 *   - El booleano mdaCumple (#520) no cambia.
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


// ---------------------------------------------------------------------------
// Casos de la nota clínica TXT (generarNotaClinica)
// ---------------------------------------------------------------------------

function noteFor(page, ctx, pathology, verdict, count) {
  const { doc, sandbox } = ctx;
  doc.getElementById('diagnosticoPrimario').value = pathology;
  doc.getElementById('mdaResultadoFinal').textContent = verdict;
  doc.getElementById('mdaCumplidos').textContent = count;
  const datos = sandbox.HubTools.form[collectorName(page)]();
  return sandbox.HubTools.export.generarNotaClinica(datos);
}

// Todas las líneas de la nota que empiezan por «MDA» (la del MDA y cualquier variante).
const mdaLines = (note) => String(note).split('\n').filter((l) => /^MDA\b/.test(l));
const noBoolean = (note) => !/MDA: (true|false)\b/.test(String(note));

for (const page of PAGES) {
  const ctx = loadScenario(page);
  ctx.sandbox.__doc = ctx.doc;
  const tag = page === 'seguimiento.html' ? 'SEG' : 'PV';
  console.log(`N. Nota APs ${page}`);

  const expectLine = (id, verdict, count, expected) => {
    const note = noteFor(page, ctx, 'aps', verdict, count);
    const lines = mdaLines(note);
    record(`${id} ${tag} «${verdict}» ${count || '(vacío)'} → «${expected}»`,
      lines.length === 1 && lines[0] === expected && noBoolean(note), JSON.stringify(lines));
  };
  const expectNoLine = (id, verdict, count, why) => {
    const note = noteFor(page, ctx, 'aps', verdict, count);
    const lines = mdaLines(note);
    record(`${id} ${tag} ${why}: la nota no escribe la línea del MDA`,
      lines.length === 0 && noBoolean(note) && /ÍNDICES APS/.test(note), JSON.stringify(lines));
  };

  expectLine('N1', 'MDA ALCANZADO ✓', '6', 'MDA: alcanzado (6/7 criterios)');
  expectLine('N1b', 'MDA ALCANZADO', '7', 'MDA: alcanzado (7/7 criterios)');
  expectLine('N2', 'MDA NO ALCANZADO', '3', 'MDA: no alcanzado (3/7 criterios)');
  expectLine('N3', 'MDA NO ALCANZADO', '0', 'MDA: no alcanzado (0/7 criterios)');
  // Recuento no válido con veredicto definitivo: el veredicto sin recuento.
  expectLine('N4', 'MDA ALCANZADO ✓', '—', 'MDA: alcanzado');
  expectLine('N4b', 'MDA NO ALCANZADO', '', 'MDA: no alcanzado');
  expectLine('N4c', 'MDA NO ALCANZADO', '8', 'MDA: no alcanzado');
  expectLine('N4d', 'MDA ALCANZADO ✓', '6.5', 'MDA: alcanzado');
  // Decisión de Sil (14-11): pendiente → sin línea (ausente ≠ NO).
  expectNoLine('N5', 'MDA PENDIENTE — fuentes ausentes: HAQ, PASI', '—', 'pendiente');
  expectNoLine('N5b', 'MDA PENDIENTE — fuentes ausentes: HAQ, PASI', '4', 'pendiente con recuento parcial');
  expectNoLine('N6', '', '', 'sin calcular');
  expectNoLine('N7', 'Calculando…', '', 'texto desconocido');

  // N8. Otras patologías: nunca hay línea del MDA, aunque queden restos en pantalla.
  for (const pathology of ['espa', 'ar', 'les', 'sjogren']) {
    const note = noteFor(page, ctx, pathology, 'MDA ALCANZADO ✓', '6');
    record(`N8 ${tag} ${pathology} con restos del MDA en pantalla: sin línea del MDA`,
      mdaLines(note).length === 0 && noBoolean(note), JSON.stringify(mdaLines(note)));
  }
}

// L. Datos sin mdaVeredicto (anteriores a #942): solo un «sí» explícito se escribe.
console.log('L. Datos sin veredicto');
{
  const { sandbox } = loadScenario('seguimiento.html');
  const gen = sandbox.HubTools.export.generarNotaClinica;
  const base = { diagnosticoPrimario: 'aps' };
  const cases = [
    ['L1 mdaCumple true', { mdaCumple: true }, ['MDA: alcanzado']],
    ['L2 MDA_Cumple SI', { MDA_Cumple: 'SI' }, ['MDA: alcanzado']],
    ['L3 mdaCumple false (antes podía ser pendiente)', { mdaCumple: false }, []],
    ['L4 MDA_Cumple NO (antes podía ser pendiente)', { MDA_Cumple: 'NO' }, []],
    ['L5 sin nada', {}, []],
    // Revisor ciego: un veredicto presente (pendiente o desconocido) manda sobre el «sí» antiguo.
    ['L6 pendiente + mdaCumple true', { mdaVeredicto: 'pendiente', mdaCumple: true }, []],
    ['L7 veredicto desconocido + MDA_Cumple SI', { mdaVeredicto: 'calculando', MDA_Cumple: 'SI' }, []],
    ['L8 veredicto vacío + mdaCumple true', { mdaVeredicto: '', mdaCumple: true }, []],
    ['L9 no alcanzado + mdaCumple true', { mdaVeredicto: 'no_alcanzado', mdaCumple: true, mdaCriteriosCumplidos: '4' }, ['MDA: no alcanzado (4/7 criterios)']]
  ];
  for (const [name, extra, expected] of cases) {
    const note = gen(Object.assign({}, base, extra));
    const lines = mdaLines(note);
    record(`${name} → ${expected.length ? '«' + expected[0] + '»' : 'sin línea'}`,
      JSON.stringify(lines) === JSON.stringify(expected) && noBoolean(note), JSON.stringify(lines));
  }
}

const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
if (failed) {
  console.log('FAIL reuma_nota_mda_check');
  process.exit(1);
}
console.log('OK reuma_nota_mda_check');
