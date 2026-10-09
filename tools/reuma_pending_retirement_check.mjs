#!/usr/bin/env node
'use strict';
/**
 * WO-REUMA-EXPORT-SAFETY-18A (T1, TRAIN-NEXUS-REUMA-EXPORT-SAFETY-18).
 *
 * Deterministic contract freezer for the Reuma pending-rows NON-persistence
 * retirement. T1 introduces NO runtime change: this checker only freezes the
 * contract that T2 (queue/event retirement in modules/exportManager.js) and
 * T3 (affordance retirement in root script.js + cache-busting in the eight
 * HTML consumers) must satisfy.
 *
 * Supported routes audited (per handoff): modules/exportManager.js, root
 * script.js, scripts/script_primera_visita.js, scripts/script_seguimiento.js
 * and the eight HTML consumers of script.js. Never previews/** or docs.
 *
 * Families:
 *   A  no-persistence-queue        (static + behavioral; RED on baseline)
 *   B  no-residual-ui              (static; B1 RED on baseline, B2 green)
 *   C  preserved-transport-contract (static; must hold on baseline)
 *   D  497-row-integrity           (behavioral via harness corpus; green)
 *   E  no-new-clinical-storage     (behavioral; RED on baseline)
 *   F  negative-witness self-tests (mandatory; must PASS on baseline)
 *
 * BASELINE RED RECORD (documented once, per handoff T1 "Registrar una vez"):
 *   Date:        2026-10-09
 *   Fixed point: 0e4656f2d33df67cf629c94f1508724e847844d8
 *                (handoff prep commit; parent 0cfc1d236a597f21b33e9e165ab8813aec0a05f0)
 *   Expected RED on baseline: A1, A2, A3, A4, A5, B1, E1, E2.
 *     - A1/A2/A3: the hubPendingRows localStorage queue, its PENDING_ROWS_*
 *       constants/read/persist/prune helpers and the pendingRowsUpdated
 *       dispatch still exist in modules/exportManager.js (lines ~1341-1477);
 *       script.js still listens to pendingRowsUpdated (~line 1153).
 *     - A4: HubTools.export still exposes getPendingRows / getLatestPendingRow
 *       / resolvePendingRow / retryPendingRowCopy (~lines 2307-2310).
 *     - A5/A6: entregarFilaProyectadaCSV still calls addPendingRow (~1542),
 *       so a supported delivery still writes hubPendingRows (E1) and
 *       overwrites pre-existing legacy hubPendingRows content (E2).
 *     - B1: script.js still defines getPendingRowsSafe /
 *       createPendingRowsIndicator / updatePendingRowsIndicator (~62-90).
 *   Expected GREEN on baseline (preserved contract, must never be weakened):
 *     B2 (HTML consumers already carry no pending-rows markup), C1-C6 (TXT
 *     gate in both transports, shared helper entregarFilaProyectadaCSV,
 *     manual-copy modal 'Copia manual de CSV', post-export checklist, no
 *     generic green success toast in the helper), D1-D4 (10 corpus journeys
 *     at 497 fields, deterministic rows, exact projected-row copy, fail-closed
 *     on shape-invalid projections) and F1-F3 (negative-witness self-tests).
 *   Exit code: 0 = every assertion passes; 1 = any assertion failure.
 *   This checker MUST stay RED (exit 1) against the baseline until T2/T3
 *   land. RED is never marked as PASS and no historical oracle is rewritten.
 *   A tool/exception crash is NOT a valid RED: failures must be
 *   assertion-level.
 *
 * Clinical safety: synthetic corpus only (tools/fixtures/reuma_export/
 * corpus_v1.json, SYN-* sentinels). No real patient data, no network, no
 * browser. Pre-existing legacy hubPendingRows content is neither read nor
 * cleared by the code under test; this checker never sanitizes it.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { runReumaExportHarness } from './reuma_export_harness.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = 'tools/fixtures/reuma_export/corpus_v1.json';

const RUNTIME_SOURCES = [
  'modules/exportManager.js',
  'script.js',
  'scripts/script_primera_visita.js',
  'scripts/script_seguimiento.js',
];

const HTML_CONSUMERS = [
  'dashboard_paciente.html',
  'dashboard_search.html',
  'estadisticas.html',
  'manage_drugs.html',
  'manage_professionals.html',
  'primera_visita.html',
  'reuma_index.html',
  'seguimiento.html',
];

const TXT_GATE_MESSAGE = 'Debe exportar TXT de esta visita antes de exportar CSV.';
const MANUAL_COPY_MODAL_TITLE = 'Copia manual de CSV';
const LEGACY_SENTINEL = JSON.stringify([
  { id: 'SYN-LEGACY-000', content: 'SYN-LEGACY-ROW', sheet: 'LEGACY', createdAt: 1 },
]);

// ---------------------------------------------------------------------------
// Assertion ledger
// ---------------------------------------------------------------------------

const ASSERTIONS = [];
function record(family, name, pass, detail) {
  ASSERTIONS.push({ family, name, pass: pass === true, detail: detail || '' });
  return pass === true;
}

// ---------------------------------------------------------------------------
// Static helpers
// ---------------------------------------------------------------------------

function readSource(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count += 1;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

/** Extracts a top-level function body by brace matching from its signature. */
function extractFunctionBody(source, fnName) {
  const sig = `function ${fnName}(`;
  const start = source.indexOf(sig);
  if (start === -1) return null;
  const open = source.indexOf('{', start);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Legacy sandbox (browser-environment shim only; production code unmodified)
// ---------------------------------------------------------------------------

function createCapturingConsole(sink) {
  const relay = (level) => (...args) => {
    sink.logs.push({ level, message: args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ') });
  };
  return { log: relay('log'), warn: relay('warn'), error: relay('error'), info: relay('log') };
}

function createStorageShim(map) {
  return {
    getItem: (key) => (map.has(String(key)) ? map.get(String(key)) : null),
    setItem: (key, value) => { map.set(String(key), String(value)); },
    removeItem: (key) => { map.delete(String(key)); },
    clear: () => { map.clear(); },
  };
}

function createRichElement() {
  return {
    style: {},
    id: '',
    className: '',
    innerHTML: '',
    setAttribute() {},
    appendChild() {},
    removeChild() {},
    addEventListener() {},
    remove() {},
    classList: { toggle() {}, add() {}, remove() {} },
    querySelector() { return { addEventListener() {} }; },
  };
}

/**
 * Builds a vm sandbox with the browser globals the legacy export surface
 * expects. Records clipboard writes, dispatched CustomEvent types, alert
 * calls and localStorage keys so the evaluators can inspect side effects.
 * When `exportManagerSource` is provided it replaces the on-disk
 * modules/exportManager.js for that sandbox ONLY (negative-witness plants);
 * production files on disk are never modified.
 */
function createDeliverySandbox({ exportManagerSource } = {}) {
  const sink = { logs: [] };
  const events = [];
  const clipboardWrites = [];
  const alerts = [];
  const localStore = new Map();
  const sessionStore = new Map();

  const sandbox = {
    console: createCapturingConsole(sink),
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout,
    alert: (msg) => { alerts.push(String(msg)); },
    navigator: {
      userAgent: 'promueve-pending-retirement-check/1',
      clipboard: {
        writeText: (text) => {
          clipboardWrites.push(String(text));
          return Promise.resolve();
        },
      },
    },
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.localStorage = createStorageShim(localStore);
  sandbox.sessionStorage = createStorageShim(sessionStore);
  sandbox.CustomEvent = class CustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options ? options.detail : undefined;
      events.push(type); // records every constructed event (dispatch attempts included)
    }
  };
  sandbox.document = {
    body: { appendChild() {} },
    getElementById() { return null; },
    createElement() { return createRichElement(); },
    dispatchEvent() { return true; },
    addEventListener() {},
    removeEventListener() {},
  };
  sandbox.dispatchEvent = () => true;
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};
  sandbox.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  vm.createContext(sandbox);

  const scripts = ['modules/hubTools.js'];
  const sources = scripts.map((file) => fs.readFileSync(path.join(ROOT, file), 'utf8'));
  sources.push(exportManagerSource !== undefined
    ? exportManagerSource
    : fs.readFileSync(path.join(ROOT, 'modules/exportManager.js'), 'utf8'));
  sources.forEach((src, i) => {
    const filename = i < scripts.length ? scripts[i] : 'modules/exportManager.js[checker-sandbox]';
    vm.runInContext(src, sandbox, { filename });
  });

  return { sandbox, sink, events, clipboardWrites, alerts, localStore, sessionStore };
}

/** Seeds the real TXT-before-CSV gate through the production markTxtExportDone. */
function seedTxtGate(result, datos, visitContext) {
  vm.runInContext('globalThis.__checkMarkTxtExportDone = markTxtExportDone;', result.sandbox, {
    filename: 'checker-gate-bootstrap',
  });
  const seeded = result.sandbox.__checkMarkTxtExportDone(datos, visitContext);
  if (seeded !== true) {
    throw new Error('TOOL PROBLEM: could not seed the production TXT gate (markTxtExportDone returned false)');
  }
}

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

// ---------------------------------------------------------------------------
// Evaluators (shared by the main assertions and the negative-witness self-tests)
// ---------------------------------------------------------------------------

/** Storage evaluator: no clinical-row key may be introduced by a delivery. */
function evaluateNoClinicalStorage(localStore, keysBefore) {
  const keysAfter = [...localStore.keys()];
  const newKeys = keysAfter.filter((k) => !keysBefore.includes(k));
  const forbidden = newKeys.filter((k) => k === 'hubPendingRows' || k.toLowerCase().includes('pending'));
  return {
    pass: newKeys.length === 0 && forbidden.length === 0,
    newKeys,
    forbidden,
  };
}

/** Event evaluator: no pendingRowsUpdated event may be constructed/dispatched. */
function evaluateNoPendingRowsEvent(events) {
  return {
    pass: !events.includes('pendingRowsUpdated'),
    seen: events.filter((t) => t === 'pendingRowsUpdated'),
  };
}

/** Row integrity evaluator for a projected/copyable 497-field row. */
function evaluateRow497Integrity(row) {
  if (typeof row !== 'string') return { pass: false, reason: 'row is not a string' };
  if (row.includes('\uFEFF')) return { pass: false, reason: 'row contains an unexpected BOM' };
  const fields = row.split('\t');
  if (fields.length !== 497) return { pass: false, reason: `row has ${fields.length} fields, expected 497` };
  return { pass: true, reason: '' };
}

/** Delivery evaluator: the supported delivery must copy the exact projected row. */
function evaluateExactProjectedCopy(expectedRow, copiedText) {
  if (copiedText === undefined) return { pass: false, reason: 'no clipboard write captured' };
  if (copiedText !== expectedRow) {
    return { pass: false, reason: `copied bytes differ from projected row (len ${copiedText.length} vs ${expectedRow.length})` };
  }
  return { pass: true, reason: '' };
}

// ---------------------------------------------------------------------------
// Family A — NO PERSISTENCE QUEUE (static + behavioral)
// ---------------------------------------------------------------------------

function checkFamilyA() {
  const sources = RUNTIME_SOURCES.map((rel) => ({ rel, src: readSource(rel) }));

  const a1hits = [];
  for (const { rel, src } of sources) {
    for (const token of ['hubPendingRows', 'PENDING_ROWS_', 'readPendingRows', 'persistPendingRows', 'prunePendingRows']) {
      const n = countOccurrences(src, token);
      if (n > 0) a1hits.push(`${rel}:${token}x${n}`);
    }
  }
  record('A', 'A1 no-hubPendingRows-queue-access-in-runtime-sources', a1hits.length === 0,
    a1hits.length ? `queue storage tokens present: ${a1hits.join(', ')}` : 'no hubPendingRows read/write/queue helpers in runtime sources');

  const a2hits = [];
  for (const { rel, src } of sources) {
    const n = countOccurrences(src, 'addPendingRow');
    if (n > 0) a2hits.push(`${rel}:addPendingRowx${n}`);
  }
  record('A', 'A2 no-addPendingRow-definition-or-call', a2hits.length === 0,
    a2hits.length ? `found: ${a2hits.join(', ')}` : 'no addPendingRow definition or call');

  const a3hits = [];
  for (const { rel, src } of sources) {
    const n = countOccurrences(src, 'pendingRowsUpdated');
    if (n > 0) a3hits.push(`${rel}:pendingRowsUpdatedx${n}`);
  }
  record('A', 'A3 no-pendingRowsUpdated-dispatch-or-listener', a3hits.length === 0,
    a3hits.length ? `found: ${a3hits.join(', ')}` : 'no pendingRowsUpdated dispatch or listener');

  const a4hits = [];
  for (const { rel, src } of sources) {
    for (const token of ['getPendingRows', 'getLatestPendingRow', 'resolvePendingRow', 'retryPendingRowCopy']) {
      const n = countOccurrences(src, token);
      if (n > 0) a4hits.push(`${rel}:${token}x${n}`);
    }
  }
  record('A', 'A4 no-pending-rows-recovery-api-tokens', a4hits.length === 0,
    a4hits.length ? `found: ${a4hits.join(', ')}` : 'no legacy recovery API tokens');

  // A5 — behavioral: the recovery API must not be exposed on HubTools.export.
  try {
    const clean = createDeliverySandbox();
    const exposed = ['getPendingRows', 'getLatestPendingRow', 'resolvePendingRow', 'retryPendingRowCopy']
      .filter((name) => typeof clean.sandbox.HubTools?.export?.[name] !== 'undefined');
    record('A', 'A5 no-legacy-recovery-api-on-HubTools.export', exposed.length === 0,
      exposed.length ? `still exposed: ${exposed.join(', ')}` : 'HubTools.export carries no pending-rows recovery API');
  } catch (error) {
    record('A', 'A5 no-legacy-recovery-api-on-HubTools.export', false, `TOOL PROBLEM (sandbox): ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Family B — NO RESIDUAL UI
// ---------------------------------------------------------------------------

function checkFamilyB() {
  const scriptSrc = readSource('script.js');
  const uiTokens = [
    'getPendingRowsSafe', 'createPendingRowsIndicator', 'updatePendingRowsIndicator',
    'pendingRowsIndicator', 'pendingRowsCount', 'pendingRowsHint',
    'pendingRowsCopyBtn', 'pendingRowsResolveBtn', 'pendingRowsUpdated',
    'pending-rows-indicator',
  ];
  const b1hits = [];
  for (const token of uiTokens) {
    const n = countOccurrences(scriptSrc, token);
    if (n > 0) b1hits.push(`${token}x${n}`);
  }
  record('B', 'B1 script-root-no-pending-rows-indicator-or-listener', b1hits.length === 0,
    b1hits.length ? `script.js still carries: ${b1hits.join(', ')}` : 'root script.js has no pendingRowsIndicator generator/counter/listener');

  const b2hits = [];
  for (const rel of HTML_CONSUMERS) {
    const src = readSource(rel);
    const re = /pendingRow|pending-rows/gi;
    const matches = src.match(re);
    if (matches) b2hits.push(`${rel}x${matches.length}`);
  }
  record('B', 'B2 html-consumers-no-pending-rows-markup-or-tokens', b2hits.length === 0,
    b2hits.length ? `pending-rows tokens in HTML consumers: ${b2hits.join(', ')}` : `no pending-rows markup/tokens in the ${HTML_CONSUMERS.length} HTML consumers`);
}

// ---------------------------------------------------------------------------
// Family C — PRESERVED TRANSPORT CONTRACT (must hold on baseline)
// ---------------------------------------------------------------------------

function checkFamilyC() {
  const src = readSource('modules/exportManager.js');
  const gateCall = 'if (!hasTxtExportDone(';

  const bodyCsv = extractFunctionBody(src, 'exportarYCopiarCSV');
  const bodyAct = extractFunctionBody(src, 'exportarAct497');
  const helperBody = extractFunctionBody(src, 'entregarFilaProyectadaCSV');

  const c1ok = bodyCsv !== null
    && bodyCsv.includes(gateCall)
    && bodyCsv.includes(TXT_GATE_MESSAGE);
  record('C', 'C1 txt-before-csv-gate-message-in-exportarYCopiarCSV', c1ok,
    c1ok ? 'gate call + legal message present in the boundary-direct transport' : 'TXT gate message/call missing from exportarYCopiarCSV');

  const c2ok = bodyAct !== null
    && bodyAct.includes(gateCall)
    && bodyAct.includes(TXT_GATE_MESSAGE);
  record('C', 'C2 txt-before-csv-gate-message-in-exportarAct497', c2ok,
    c2ok ? 'gate call + legal message present in the visit-act transport' : 'TXT gate message/call missing from exportarAct497');

  const helperDefs = countOccurrences(src, 'function entregarFilaProyectadaCSV(');
  const callsInCsv = bodyCsv ? countOccurrences(bodyCsv, 'entregarFilaProyectadaCSV(') : 0;
  const callsInAct = bodyAct ? countOccurrences(bodyAct, 'entregarFilaProyectadaCSV(') : 0;
  const c3ok = helperDefs === 1 && callsInCsv === 1 && callsInAct === 1;
  record('C', 'C3 both-transports-route-through-single-shared-helper', c3ok,
    c3ok ? 'helper defined once; exportarYCopiarCSV and exportarAct497 each delegate exactly once'
      : `helper definitions=${helperDefs}, calls in exportarYCopiarCSV=${callsInCsv}, calls in exportarAct497=${callsInAct}`);

  const c4ok = helperBody !== null
    && helperBody.includes(MANUAL_COPY_MODAL_TITLE)
    && helperBody.includes("modalTitle: 'Copia manual de CSV'")
    && helperBody.includes('copyTextWithFallback(');
  record('C', 'C4 helper-preserves-clipboard-fallback-and-manual-copy-modal', c4ok,
    c4ok ? "clipboard fallback + modal 'Copia manual de CSV' preserved in shared helper" : 'manual-copy modal text or fallback missing from helper');

  const c5ok = helperBody !== null && helperBody.includes('mostrarChecklistPostExport(');
  record('C', 'C5 helper-preserves-post-export-checklist-call', c5ok,
    c5ok ? 'mostrarChecklistPostExport call survives in shared helper' : 'post-export checklist call missing from helper');

  const successToast = /mostrarNotificacion\s*\([^)]*['"]success['"]/;
  const c6ok = helperBody !== null && !successToast.test(helperBody);
  record('C', 'C6 helper-has-no-generic-green-success-toast', c6ok,
    c6ok ? 'no generic success toast in the shared helper (checklist is the success UX)' : 'helper contains a generic success notification');
}

// ---------------------------------------------------------------------------
// Family D — 497 ROW INTEGRITY (behavioral, harness + boundary)
// ---------------------------------------------------------------------------

async function checkFamilyD() {
  let firstRun;
  let secondRun;
  try {
    firstRun = await runReumaExportHarness({ corpusFile: CORPUS });
    secondRun = await runReumaExportHarness({ corpusFile: CORPUS });
  } catch (error) {
    record('D', 'D1 corpus-10-journeys-497-fields', false, `TOOL PROBLEM (harness): ${error.message}`);
    record('D', 'D2 corpus-rows-deterministic-byte-identical', false, 'TOOL PROBLEM (harness): not evaluated');
    record('D', 'D3 supported-delivery-copies-exact-projected-row', false, 'TOOL PROBLEM (harness): not evaluated');
    record('D', 'D4 delivery-fail-closed-on-invalid-projection', false, 'TOOL PROBLEM (harness): not evaluated');
    return;
  }

  const journeys = firstRun.journeys;
  const badCount = [];
  for (const j of journeys) {
    const verdict = evaluateRow497Integrity(j.row);
    if (!verdict.pass) badCount.push(`${j.pathology}/${j.tipoVisita}: ${verdict.reason}`);
  }
  record('D', 'D1 corpus-10-journeys-497-fields',
    journeys.length === 10 && badCount.length === 0,
    badCount.length ? `${badCount.length} of ${journeys.length} journeys malformed: ${badCount.join('; ')}` : `all ${journeys.length} corpus journeys produce 497-field rows`);

  const mismatch = [];
  for (let i = 0; i < journeys.length; i++) {
    if (journeys[i].row !== secondRun.journeys[i].row) {
      mismatch.push(`${journeys[i].pathology}/${journeys[i].tipoVisita}`);
    }
  }
  record('D', 'D2 corpus-rows-deterministic-byte-identical', mismatch.length === 0,
    mismatch.length ? `rows differ between independent runs: ${mismatch.join(', ')}` : 'two independent harness runs produce byte-identical rows for all journeys');

  // D3/E1 — supported delivery through the visit-act transport on a synthetic
  // AR primera journey. The projection shape mirrors what
  // HubTools.reumaLegacyExportAdapter.projectVisitAct497 hands to exportarAct497.
  try {
    const corpus = JSON.parse(readSource(CORPUS));
    const journey = corpus.journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
    if (!journey) throw new Error('corpus journey ar/primera not found');

    const result = createDeliverySandbox();
    const row = result.sandbox.HubTools.export.generarFilaCSV_AR_PrimeraVisita(structuredClone(journey.datos), 'primera');
    const proyeccion = {
      ok: true,
      row,
      meta: { sheet: 'AR_Primera', pathology: 'ar', tipoVisita: 'primera' },
    };
    seedTxtGate(result, journey.datos, { tipoVisita: 'primera', diagnostico: 'ar' });
    const keysBefore = [...result.localStore.keys()];
    const delivered = result.sandbox.HubTools.export.exportarAct497(
      structuredClone(proyeccion), structuredClone(journey.datos)
    );
    await flushMicrotasks();
    const storage = evaluateNoClinicalStorage(result.localStore, keysBefore);

    const copied = result.clipboardWrites.length === 1 ? result.clipboardWrites[0] : undefined;
    const copyVerdict = evaluateExactProjectedCopy(row, copied);
    const d3ok = delivered === true && copyVerdict.pass && !row.includes('\uFEFF');
    record('D', 'D3 supported-delivery-copies-exact-projected-row', d3ok,
      d3ok ? 'exportarAct497 delivered exactly the projected 497-field row (no loss, no truncation/padding, no BOM)'
        : `delivered=${delivered}, clipboardWrites=${result.clipboardWrites.length}, ${copyVerdict.reason || ''}`);

    const e1ok = storage.pass;
    record('E', 'E1 delivery-persists-no-clinical-storage-keys', e1ok,
      e1ok ? `no new localStorage keys after supported delivery (before: [${keysBefore.join(', ') || 'empty'}])`
        : `delivery introduced new localStorage keys: ${storage.newKeys.join(', ')}${storage.forbidden.length ? ` (forbidden: ${storage.forbidden.join(', ')})` : ''}`);
  } catch (error) {
    record('D', 'D3 supported-delivery-copies-exact-projected-row', false, `TOOL PROBLEM (sandbox): ${error.message}`);
    record('E', 'E1 delivery-persists-no-clinical-storage-keys', false, `TOOL PROBLEM (sandbox): ${error.message}`);
  }

  // D4 — the transport itself must fail closed on shape-invalid projections:
  // no copy, no checklist path, no storage side effects. (496/498-field
  // rejection at the compatibility boundary is frozen by the existing oracle
  // tools/reuma_export_boundary_check.mjs C2 and is not duplicated here.)
  try {
    const corpus = JSON.parse(readSource(CORPUS));
    const journey = corpus.journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
    const invalidProjections = [
      { name: 'ok=false', proyeccion: { ok: false, row: 'x', meta: { sheet: 'AR_Primera', pathology: 'ar', tipoVisita: 'primera' } } },
      { name: 'row-not-string', proyeccion: { ok: true, row: ['a', 'b'], meta: { sheet: 'AR_Primera', pathology: 'ar', tipoVisita: 'primera' } } },
      { name: 'meta-incomplete', proyeccion: { ok: true, row: 'a\tb', meta: { sheet: 'AR_Primera', pathology: 'ar' } } },
    ];
    const failures = [];
    for (const item of invalidProjections) {
      const result = createDeliverySandbox();
      seedTxtGate(result, journey.datos, { tipoVisita: 'primera', diagnostico: 'ar' });
      const keysBefore = [...result.localStore.keys()];
      const ret = result.sandbox.HubTools.export.exportarAct497(
        structuredClone(item.proyeccion), structuredClone(journey.datos)
      );
      await flushMicrotasks();
      const storage = evaluateNoClinicalStorage(result.localStore, keysBefore);
      if (ret !== false || result.clipboardWrites.length !== 0 || !storage.pass) {
        failures.push(`${item.name}: ret=${ret}, clipboardWrites=${result.clipboardWrites.length}, newKeys=${storage.newKeys.join('|') || 'none'}`);
      }
    }
    record('D', 'D4 delivery-fail-closed-on-invalid-projection', failures.length === 0,
      failures.length ? `not fail-closed: ${failures.join('; ')}` : 'shape-invalid projections are refused with no copy and no storage');
  } catch (error) {
    record('D', 'D4 delivery-fail-closed-on-invalid-projection', false, `TOOL PROBLEM (sandbox): ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Family E2 — legacy hubPendingRows content is neither read nor cleared
// ---------------------------------------------------------------------------

async function checkFamilyE2() {
  try {
    const corpus = JSON.parse(readSource(CORPUS));
    const journey = corpus.journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
    const result = createDeliverySandbox();
    // Pre-existing legacy queue content, seeded ONLY by this controlled test
    // fixture. The code under test must leave it byte-identical.
    result.localStore.set('hubPendingRows', LEGACY_SENTINEL);
    seedTxtGate(result, journey.datos, { tipoVisita: 'primera', diagnostico: 'ar' });
    const row = result.sandbox.HubTools.export.generarFilaCSV_AR_PrimeraVisita(structuredClone(journey.datos), 'primera');
    result.sandbox.HubTools.export.exportarAct497(
      { ok: true, row, meta: { sheet: 'AR_Primera', pathology: 'ar', tipoVisita: 'primera' } },
      structuredClone(journey.datos)
    );
    await flushMicrotasks();
    const after = result.localStore.get('hubPendingRows');
    record('E', 'E2 legacy-hubPendingRows-untouched-by-delivery', after === LEGACY_SENTINEL,
      after === LEGACY_SENTINEL
        ? 'pre-existing legacy hubPendingRows content neither read, pruned nor cleared by the delivery path'
        : 'delivery path modified pre-existing legacy hubPendingRows content (read/pruned/cleared or overwritten)');
  } catch (error) {
    record('E', 'E2 legacy-hubPendingRows-untouched-by-delivery', false, `TOOL PROBLEM (sandbox): ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Family F — NEGATIVE WITNESSES (self-tests; must PASS on baseline)
// ---------------------------------------------------------------------------

function plantExportManager(snippet) {
  const src = readSource('modules/exportManager.js');
  const anchor = "console.log('✅ Módulo exportManager cargado');";
  if (!src.includes(anchor)) {
    throw new Error('TOOL PROBLEM: witness injection anchor not found in modules/exportManager.js');
  }
  return src.replace(anchor, `${snippet}\n    ${anchor}`);
}

/**
 * Runs the generation-only pipeline (no transport call) in a sandbox and
 * returns the evaluator verdicts. On baseline the generation path is clean:
 * only the transports touch the queue/event surface.
 */
function runGenerationOnly(exportManagerSource) {
  const corpus = JSON.parse(readSource(CORPUS));
  const journey = corpus.journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
  const result = createDeliverySandbox({ exportManagerSource });
  result.sandbox.HubTools.export.generarFilaCSV_AR_PrimeraVisita(structuredClone(journey.datos), 'primera');
  return {
    storage: evaluateNoClinicalStorage(result.localStore, []),
    event: evaluateNoPendingRowsEvent(result.events),
  };
}

async function checkFamilyF() {
  const label = (name, pass, detail) => record('F', name, pass, detail);

  // Witness (a): a reintroduced localStorage write of hubPendingRows.
  try {
    const clean = runGenerationOnly(undefined);
    const planted = runGenerationOnly(plantExportManager(
      "try { localStorage.setItem('hubPendingRows', JSON.stringify([{ planted: 'witness-a' }])); } catch (e) {}"
    ));
    const detected = clean.storage.pass === true && planted.storage.pass === false;
    label('F1 witness-a-replanted-hubPendingRows-write-detected', detected,
      detected ? 'clean generation stays storage-clean; planted localStorage write of hubPendingRows is flagged FAIL'
        : `clean.pass=${clean.storage.pass} (expected true), planted.pass=${planted.storage.pass} (expected false)`);
  } catch (error) {
    label('F1 witness-a-replanted-hubPendingRows-write-detected', false, `TOOL PROBLEM: ${error.message}`);
  }

  // Witness (b): a replanted pendingRowsUpdated event emission.
  try {
    const clean = runGenerationOnly(undefined);
    const planted = runGenerationOnly(plantExportManager(
      "try { window.dispatchEvent(new CustomEvent('pendingRowsUpdated', { detail: [] })); } catch (e) {}"
    ));
    const detected = clean.event.pass === true && planted.event.pass === false;
    label('F2 witness-b-replanted-pendingRowsUpdated-emission-detected', detected,
      detected ? 'clean generation emits no event; planted pendingRowsUpdated emission is flagged FAIL'
        : `clean.pass=${clean.event.pass} (expected true), planted.pass=${planted.event.pass} (expected false)`);
  } catch (error) {
    label('F2 witness-b-replanted-pendingRowsUpdated-emission-detected', false, `TOOL PROBLEM: ${error.message}`);
  }

  // Witness (c): a mutated/tampered 497 row (field dropped / field altered).
  try {
    const corpus = JSON.parse(readSource(CORPUS));
    const journey = corpus.journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
    const result = createDeliverySandbox();
    const genuine = result.sandbox.HubTools.export.generarFilaCSV_AR_PrimeraVisita(structuredClone(journey.datos), 'primera');
    const genuineVerdict = evaluateRow497Integrity(genuine);
    const fields = genuine.split('\t');
    const dropped = fields.slice(0, fields.length - 1).join('\t');
    const altered = genuine.replace('SYN-EXP-AR-001', 'SYN-TAMPERED-WITNESS');
    const dropDetected = evaluateRow497Integrity(dropped).pass === false;
    const alterDetected = evaluateExactProjectedCopy(genuine, altered).pass === false;
    const detected = genuineVerdict.pass === true && dropDetected && alterDetected;
    label('F3 witness-c-tampered-497-row-detected', detected,
      detected ? 'field-dropped row fails the 497 evaluator; field-altered row fails the exact-copy evaluator'
        : `genuine.pass=${genuineVerdict.pass}, dropDetected=${dropDetected}, alterDetected=${alterDetected}`);
  } catch (error) {
    label('F3 witness-c-tampered-497-row-detected', false, `TOOL PROBLEM: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  checkFamilyA();
  checkFamilyB();
  checkFamilyC();
  await checkFamilyD();
  await checkFamilyE2();
  await checkFamilyF();

  const families = ['A', 'B', 'C', 'D', 'E', 'F'];
  let passCount = 0;
  let failCount = 0;
  const failing = [];
  for (const family of families) {
    const items = ASSERTIONS.filter((a) => a.family === family);
    if (!items.length) continue;
    console.log(`\n=== Family ${family} ===`);
    for (const item of items) {
      const status = item.pass ? 'PASS' : 'FAIL';
      console.log(`  [${status}] ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
      if (item.pass) passCount += 1;
      else {
        failCount += 1;
        failing.push(item.name);
      }
    }
  }

  console.log('\n=== SUMMARY (WO-REUMA-EXPORT-SAFETY-18A) ===');
  console.log(`  PASS: ${passCount}  FAIL: ${failCount}  total: ${ASSERTIONS.length}`);
  console.log('  Exit 0 = contract fully satisfied. Exit 1 = at least one assertion failed.');
  console.log('  Baseline expectation (see header): RED on A1-A5, B1, E1, E2; GREEN on B2, C1-C6, D1-D4, F1-F3.');
  if (failing.length) {
    console.log(`  Failing assertions: ${failing.join(', ')}`);
  }

  process.exitCode = failCount > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error('TOOL PROBLEM (unexpected exception, not an assertion-level RED):', error);
  process.exitCode = 1;
  process.exit(1);
});
