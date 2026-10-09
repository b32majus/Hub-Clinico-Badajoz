#!/usr/bin/env node
'use strict';
/**
 * FROZEN PRINCIPAL ACCEPTANCE ORACLE — WO-NEXUS-REUMA-F5.4C (#464, train #461).
 *
 * Deterministic cutover check: the supported Reuma export journeys (Primera
 * Visita / Seguimiento) must materialize the professional intention first as
 * a `Reuma Visit Act v1` (`HubTools.reumaActContract.createVisitAct`, F5.4A
 * #462) and obtain the legacy 497-column row afterwards through the T2
 * adapter (`HubTools.reumaLegacyExportAdapter.projectVisitAct497`, F5.4B
 * #463) over the F5.3 boundary (`HubTools.reumaExportBoundary`, #457),
 * preserving EXACTLY the visible export/copy behavior.
 *
 * AUTHORITY BASIS
 *   - GitHub issue #464 (WO-NEXUS-REUMA-F5.4C, status:approved) — binding
 *     cutover rules and acceptance criteria (T3/3 of train #461).
 *   - `docs/architecture/adr/ADR-005` (acto completo independiente del
 *     Excel; la fila es proyección posterior, no dominio) and `ADR-006`
 *     (frontera de compatibilidad como única ruta a los generadores legacy).
 *   - Frozen oracles that must keep passing unmodified:
 *     `tools/reuma_act_contract_check.mjs` (106/0),
 *     `tools/reuma_legacy_export_adapter_check.mjs` (51/0),
 *     `tools/reuma_export_boundary_check.mjs` (32/0 incl. C5/C6),
 *     `tools/reuma_export_harness_check.mjs`,
 *     `tools/reuma_export_acceptance_check.mjs` (acceptance 15/0;
 *     characterization 3 CHAR / 1 DRIFT unchanged) and
 *     `tools/reuma_export_boundary_browser_check.mjs` (X1–X4).
 *   - `docs/engineering/REUMA_EXPORT_KNOWN_LEGACY.md` — context only; this
 *     oracle must NOT assert any KNOWN_LEGACY correction (warn-only length,
 *     pendingRows recursion, inert createdAt prune, raw `|| ''` collapses).
 *
 * FROZEN MECHANICAL CUTOVER PLAN ASSERTED (resolved by the supervisor from
 * #464 + the frozen oracles; the oracle asserts THIS shape and nothing else):
 *   1. Coordinators (`scripts/script_primera_visita.js`,
 *      `scripts/script_seguimiento.js`), CSV button happy path becomes
 *      strictly: `recopilarDatosFormulario()` (or `...Seguimiento`) →
 *      `HubTools.reumaActContract.createVisitAct({ kind: 'primera_visita' |
 *      'seguimiento' (explicit per page), patientRef: <explicit id from the
 *      payload, e.g. datos.idPaciente>, pathology: <diagnosticoPrimario
 *      select value — canonical token espa|aps|ar|les|sjogren>, payload:
 *      datos })` → on !ok: fail-closed notification, NO transfer →
 *      `HubTools.reumaLegacyExportAdapter.projectVisitAct497(act)` → on !ok:
 *      fail-closed notification whose text contains the phrase
 *      'frontera de compatibilidad' (keeps the frozen X4 alert policy
 *      passing; any console.error text stays within the documented filtered
 *      classes 'Error en exportarYCopiarCSV' / 'Error al exportar CSV') →
 *      `HubTools.export` transport entry receiving the projection result.
 *   2. `modules/exportManager.js`: the post-projection delivery block
 *      (copyTextWithFallback with manual-copy fallback + post-export
 *      checklist) is extracted into ONE shared helper used by
 *      BOTH `exportarYCopiarCSV` (unchanged behavior, still boundary-direct —
 *      frozen C5 requires it; its only remaining real consumer is the frozen
 *      #457 acceptance gate, retirement condition documented for a future
 *      WO) and a NEW transport entry `exportarAct497(proyeccion, datos)`
 *      which validates the projection (ok===true, string row,
 *      meta.sheet/pathology/tipoVisita present — else fail closed, no
 *      delivery), runs the same TXT-before-CSV gate with
 *      (datos, {tipoVisita: proyeccion.meta.tipoVisita, diagnostico:
 *      proyeccion.meta.pathology}) and delegates delivery to the shared
 *      helper. NO duplication of copy/download logic; NO pending-row queue,
 *      queue storage or queue event (RETIRED contract,
 *      TRAIN-NEXUS-REUMA-EXPORT-SAFETY-18: the module must stay free of
 *      addPendingRow / pendingRowsUpdated / hubPendingRows / PENDING_ROWS_);
 *      NO persisted claims.
 *   3. HTML: both pages load `modules/reuma_act_contract.js?v=<fresh>` and
 *      `modules/reuma_legacy_export_adapter.js?v=<fresh>` AFTER
 *      `modules/reuma_export_boundary.js` and before the page script
 *      (cache-busting tokens).
 *
 * RETIRED PENDING-ROWS CONTRACT (T4 reconciliation,
 * TRAIN-NEXUS-REUMA-EXPORT-SAFETY-18 / WO-REUMA-EXPORT-SAFETY-18D): the
 * pending-rows queue (`hubPendingRows`), the `pendingRowsUpdated` event and
 * the recovery API are GONE from runtime; the mutual recursion that threw
 * "Maximum call stack size exceeded" no longer exists. This oracle no longer
 * tolerates that pageerror and no longer spies the `addPendingRow` seam;
 * behavioral cases assert ZERO localStorage writes and ZERO dispatched
 * events on every supported journey.
 *
 * OUT OF SCOPE (fails closed if "fixed" opportunistically is not asserted,
 * but the oracle must not require any KNOWN_LEGACY correction): warn-only
 * length, KNOWN_LEGACY value collapses.
 *
 * Case families:
 *   W  wired-route static (coordinators): exactly one wired CSV route per
 *      coordinator referencing createVisitAct + projectVisitAct497 +
 *      exportarAct497 with the explicit kind token, patientRef taken from
 *      the explicit payload identifier, pathology from the selector value,
 *      the X4-compatible fail-closed phrase, console.error discipline, and
 *      NO generarFilaCSV / generateLegacyRow497 / FINAL_V2_EXPORT_COLUMN_COUNT
 *      / reumaExportBoundary / literal 497 anywhere in the coordinator.
 *   X  transport static (exportManager): new `exportarAct497` entry exposed
 *      and delegating delivery to a single shared helper also used by
 *      `exportarYCopiarCSV`; the shared delivery exists exactly once (one
 *      `copyTextWithFallback(csvData` call site and one post-export checklist
 *      call site) and the module is queue-free (zero addPendingRow /
 *      pendingRowsUpdated / hubPendingRows / PENDING_ROWS_ tokens);
 *      `exportarYCopiarCSV` stays boundary-direct (frozen C5); the new entry
 *      consumes the adapter result only (no boundary/generator/column-count
 *      references) and preserves the TXT gate.
 *   Y  HTML wiring static: both pages load the contract + adapter modules
 *      with `?v=` tokens after the boundary module and before the page
 *      script.
 *   Z  behavioral (vm sandbox, hubTools+exportManager+boundary+contract+
 *      adapter loaded): for the 10 synthetic corpus journeys the FULL wired
 *      sequence (createVisitAct → projectVisitAct497 → exportarAct497 with
 *      the TXT gate satisfied via `markTxtExportDone`) copies exactly ONE
 *      clipboard row byte-identical to the direct boundary result for the
 *      same payload, with ZERO localStorage writes (no key created, modified
 *      or removed — especially `hubPendingRows`) and ZERO dispatched events;
 *      contract failure, adapter/boundary rejection and unsatisfied TXT gate
 *      deliver nothing (no copy, no storage write, no event); no mutation of
 *      datos/act through the wired sequence. Storage/events are observed with
 *      a spy that wraps the sandbox localStorage shim (setItem/removeItem/
 *      clear) and the sandbox window/document dispatchEvent, exactly like
 *      the clipboard stub — production code is never instrumented.
 *   W-f/X-f/Y-f/Z-f  planted-lie self-tests: synthetic-good cutover shapes
 *      pass each evaluator and planted cutover defects fail the right family
 *      (the checker can disagree with the implementation). The synthetic-good
 *      exportManager is queue-free; plants reintroduce an addPendingRow call
 *      or a hubPendingRows write / pendingRowsUpdated dispatch and must fail
 *      X3, while the duplicate-delivery, boundary-direct and TXT-gate plants
 *      stay meaningful.
 *
 * T4 RECONCILIATION (WO-REUMA-EXPORT-SAFETY-18D): assertions that froze the
 * retired queue/retry/recursion (old X3 addPendingRow site count, old X4
 * helper derivation from the addPendingRow site, Z addPendingRow queue spy,
 * synthetic-good queue shape) were REPLACED — not dropped — by stronger
 * assertions of the approved retired contract above. All other coverage
 * (W1-W10, X1-X7, Y1-Y2, Z2-Z5, Z-f byte fidelity and every planted-lie
 * self-test) is preserved.
 *
 * Exit codes: 0 = all cases PASS, 1 = at least one FAIL.
 * Usage: node tools/reuma_act_cutover_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createLegacySandbox } from './reuma_export_harness.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = 'tools/fixtures/reuma_export/corpus_v1.json';
const EXPORT_MANAGER = 'modules/exportManager.js';
const COORDINATORS = [
    { file: 'scripts/script_primera_visita.js', page: 'primera_visita.html', kind: 'primera_visita' },
    { file: 'scripts/script_seguimiento.js', page: 'seguimiento.html', kind: 'seguimiento' },
];
const BOUNDARY_MODULE = 'modules/reuma_export_boundary.js';
const CONTRACT_MODULE = 'modules/reuma_act_contract.js';
const ADAPTER_MODULE = 'modules/reuma_legacy_export_adapter.js';
const CSV_BUTTON_ANCHOR = "getElementById('btnEstructurarCSV')";
const FILTERED_CONSOLE_CLASSES = ['Error en exportarYCopiarCSV', 'Error al exportar CSV'];
const FAIL_CLOSED_PHRASE = 'frontera de compatibilidad';

const results = [];
function record(name, pass, detail) {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function readRepoFile(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

// ---------------------------------------------------------------------------
// Static helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the CSV button handler region of a coordinator: from the CSV
 * button anchor (`btnEstructurarCSV`) up to the next event wiring, which in
 * both coordinators is the following button (`Nuevo Paciente` / `Solicitud
 * FH`). Returns null when the anchor or the wiring is missing.
 */
function extractCsvHandlerRegion(source) {
    const anchor = source.indexOf(CSV_BUTTON_ANCHOR);
    if (anchor === -1) return null;
    const wired = source.indexOf(".addEventListener('click'", anchor);
    if (wired === -1) return null;
    const nextWired = source.indexOf('.addEventListener(', wired + 10);
    return source.slice(anchor, nextWired === -1 ? source.length : nextWired);
}

/**
 * Extracts the full source region of a top-level function declaration by
 * brace matching. Balanced braces inside template literals (`${...}`) keep
 * the depth balanced, so this is safe for the delivery/transport shapes
 * asserted here.
 */
function extractFunctionRegion(source, functionName) {
    const start = source.indexOf('function ' + functionName);
    if (start === -1) return null;
    const open = source.indexOf('{', start);
    if (open === -1) return null;
    let depth = 0;
    for (let i = open; i < source.length; i++) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}') {
            depth--;
            if (depth === 0) return source.slice(start, i + 1);
        }
    }
    return null;
}

function countOccurrences(haystack, needle) {
    let count = 0;
    let idx = 0;
    while ((idx = haystack.indexOf(needle, idx)) !== -1) {
        count++;
        idx += needle.length;
    }
    return count;
}

/** First-argument string literals of every console.error(...) in a region. */
function consoleErrorFirstArgs(region) {
    const args = [];
    const re = /console\.error\(\s*(['"`])((?:(?!\1).)*)\1/g;
    let match;
    while ((match = re.exec(region)) !== null) args.push(match[2]);
    return args;
}

// ---------------------------------------------------------------------------
// W family — wired-route static (coordinators)
// ---------------------------------------------------------------------------

function evaluateCoordinatorW(source, kind) {
    const cases = [];
    const handler = extractCsvHandlerRegion(source);

    cases.push({
        name: 'W1 exactly one wired CSV button route with an extractable handler region',
        pass: countOccurrences(source, CSV_BUTTON_ANCHOR) === 1 && handler !== null && handler.length > 0,
        detail: `anchorCount=${countOccurrences(source, CSV_BUTTON_ANCHOR)} handlerExtracted=${handler !== null}`,
    });

    cases.push({
        name: 'W2 CSV handler creates the Visit Act via HubTools.reumaActContract.createVisitAct',
        pass: handler !== null && handler.includes('reumaActContract') && handler.includes('createVisitAct'),
        detail: handler === null ? 'handler region not extractable' : 'createVisitAct route missing from the CSV handler',
    });

    cases.push({
        name: 'W3 CSV handler projects through HubTools.reumaLegacyExportAdapter.projectVisitAct497',
        pass: handler !== null && handler.includes('reumaLegacyExportAdapter') && handler.includes('projectVisitAct497'),
        detail: handler === null ? 'handler region not extractable' : 'adapter projection missing from the CSV handler',
    });

    cases.push({
        name: 'W4 CSV handler routes to the exportarAct497 transport entry and never to exportarYCopiarCSV',
        pass: handler !== null && handler.includes('exportarAct497') && !handler.includes('exportarYCopiarCSV'),
        detail: handler === null ? 'handler region not extractable' : `exportarAct497 present=${handler.includes('exportarAct497')} legacyConsumerPresent=${handler.includes('exportarYCopiarCSV')}`,
    });

    cases.push({
        name: `W5 CSV handler passes the explicit kind token as kind: '${kind}' (no inference per page)`,
        pass: handler !== null && new RegExp("kind:\\s*'" + kind + "'").test(handler),
        detail: handler === null ? 'handler region not extractable' : `request field kind: '${kind}' missing from the CSV handler`,
    });

    cases.push({
        name: 'W6 patientRef is taken from the explicit payload identifier (datos.idPaciente), not inferred',
        pass: handler !== null && handler.includes('datos.idPaciente'),
        detail: handler === null ? 'handler region not extractable' : 'explicit payload identifier missing from the CSV handler',
    });

    cases.push({
        name: "W7 pathology comes from the 'diagnosticoPrimario' selector value (no new heuristic mapping)",
        pass: handler !== null && handler.includes("getElementById('diagnosticoPrimario')") && handler.includes('.value'),
        detail: handler === null ? 'handler region not extractable' : 'selector value read missing from the CSV handler',
    });

    cases.push({
        name: `W8 adapter-failure notification is fail-closed and contains the X4 phrase '${FAIL_CLOSED_PHRASE}'`,
        pass: handler !== null && handler.includes(FAIL_CLOSED_PHRASE),
        detail: handler === null ? 'handler region not extractable' : `phrase '${FAIL_CLOSED_PHRASE}' missing from the CSV handler`,
    });

    const unfilteredErrors = handler === null ? [] : consoleErrorFirstArgs(handler)
        .filter((text) => !FILTERED_CONSOLE_CLASSES.some((cls) => text.includes(cls)));
    cases.push({
        name: "W9 console.error texts in the CSV handler stay within the X4 filtered classes ('Error en exportarYCopiarCSV' / 'Error al exportar CSV')",
        pass: handler !== null && unfilteredErrors.length === 0,
        detail: `unfilteredConsoleErrors=${JSON.stringify(unfilteredErrors.slice(0, 3))}`,
    });

    const banned = [
        ['generarFilaCSV', source.includes('generarFilaCSV')],
        ['generateLegacyRow497', source.includes('generateLegacyRow497')],
        ['FINAL_V2_EXPORT_COLUMN_COUNT', source.includes('FINAL_V2_EXPORT_COLUMN_COUNT')],
        ['reumaExportBoundary', source.includes('reumaExportBoundary')],
        ['literal 497', /\b497\b/.test(source)],
    ];
    cases.push({
        name: 'W10 coordinator knows no legacy shape: no generarFilaCSV / generateLegacyRow497 / FINAL_V2_EXPORT_COLUMN_COUNT / reumaExportBoundary / literal 497',
        pass: banned.every(([, present]) => !present),
        detail: `present=${JSON.stringify(banned.filter(([, present]) => present).map(([name]) => name))}`,
    });

    return cases;
}

// ---------------------------------------------------------------------------
// X family — transport static (exportManager)
// ---------------------------------------------------------------------------

function evaluateExportManagerX(source) {
    const cases = [];
    const entryRegion = extractFunctionRegion(source, 'exportarAct497');
    const legacyRegion = extractFunctionRegion(source, 'exportarYCopiarCSV');

    cases.push({
        name: 'X1 exportManager defines the new transport entry function exportarAct497(proyeccion, datos)',
        pass: entryRegion !== null,
        detail: 'function exportarAct497 not found',
    });

    cases.push({
        name: 'X2 exportarAct497 is exposed on the HubTools.export surface',
        pass: /HubTools\.export\.exportarAct497\s*=\s*exportarAct497\b/.test(source),
        detail: 'HubTools.export.exportarAct497 exposure missing',
    });

    // The shared delivery exists exactly once and is queue-free: a single
    // `copyTextWithFallback(csvData` call site and a single post-export
    // checklist call site in the whole module, plus ZERO pending-rows
    // queue/event tokens (retired contract,
    // TRAIN-NEXUS-REUMA-EXPORT-SAFETY-18).
    const copyCallSites = countOccurrences(source, 'copyTextWithFallback(csvData');
    const checklistCallSites = countOccurrences(source.replace(/function mostrarChecklistPostExport\s*\(/, 'function mostrarChecklistPostExportExposed('), 'mostrarChecklistPostExport(');
    const queueTokens = ['addPendingRow', 'pendingRowsUpdated', 'hubPendingRows', 'PENDING_ROWS_']
        .map((token) => [token, countOccurrences(source, token)])
        .filter(([, hits]) => hits > 0);
    cases.push({
        name: 'X3 shared delivery exists exactly once and the module is queue-free: one copyTextWithFallback(csvData call site, one post-export checklist call site, zero addPendingRow/pendingRowsUpdated/hubPendingRows/PENDING_ROWS_ tokens',
        pass: copyCallSites === 1 && checklistCallSites === 1 && queueTokens.length === 0,
        detail: `copyCallSites=${copyCallSites} checklistCallSites=${checklistCallSites} queueTokens=${JSON.stringify(queueTokens)}`,
    });

    // Single shared delivery helper: the function containing the unique
    // `copyTextWithFallback(csvData` call (the unique delivery anchor, which
    // replaced the removed `addPendingRow({` site) must be called from BOTH
    // transport entries. The helper is the LAST function declaration
    // preceding the call site (the innermost enclosing declaration).
    let sharedHelperName = null;
    if (copyCallSites === 1) {
        const idx = source.indexOf('copyTextWithFallback(csvData');
        const before = source.slice(0, idx);
        const fnRe = /function\s+([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\{/g;
        let last = null;
        let match;
        while ((match = fnRe.exec(before)) !== null) last = match;
        sharedHelperName = last ? last[1] : null;
    }
    const helperUsedByBoth = sharedHelperName !== null &&
        sharedHelperName !== 'exportarYCopiarCSV' && sharedHelperName !== 'exportarAct497' &&
        legacyRegion !== null && legacyRegion.includes(sharedHelperName + '(') &&
        entryRegion !== null && entryRegion.includes(sharedHelperName + '(');
    cases.push({
        name: 'X4 one shared delivery helper is used by BOTH exportarYCopiarCSV and exportarAct497 (no duplicated delivery)',
        pass: helperUsedByBoth,
        detail: `sharedHelper=${sharedHelperName} usedByLegacy=${legacyRegion !== null && sharedHelperName !== null && legacyRegion.includes(sharedHelperName + '(')} usedByEntry=${entryRegion !== null && sharedHelperName !== null && entryRegion.includes(sharedHelperName + '(')}`,
    });

    cases.push({
        name: 'X5 exportarYCopiarCSV remains published and boundary-direct (frozen #457 C5 shape preserved)',
        pass: legacyRegion !== null && legacyRegion.includes('reumaExportBoundary') && legacyRegion.includes('generateLegacyRow497') && !legacyRegion.includes('generarFilaCSV_'),
        detail: legacyRegion === null ? 'function exportarYCopiarCSV not found' : 'boundary-direct routing broken in exportarYCopiarCSV',
    });

    const entryBanned = [
        ['reumaExportBoundary', entryRegion !== null && entryRegion.includes('reumaExportBoundary')],
        ['generateLegacyRow497', entryRegion !== null && entryRegion.includes('generateLegacyRow497')],
        ['generarFilaCSV', entryRegion !== null && entryRegion.includes('generarFilaCSV')],
        ['FINAL_V2_EXPORT_COLUMN_COUNT', entryRegion !== null && entryRegion.includes('FINAL_V2_EXPORT_COLUMN_COUNT')],
    ];
    cases.push({
        name: 'X6 exportarAct497 consumes only the adapter projection: no boundary / generator / column-count references',
        pass: entryRegion !== null && entryBanned.every(([, present]) => !present),
        detail: `entryFound=${entryRegion !== null} present=${JSON.stringify(entryBanned.filter(([, present]) => present).map(([name]) => name))}`,
    });

    cases.push({
        name: 'X7 exportarAct497 validates the projection (ok/row/meta.sheet/meta.pathology/meta.tipoVisita) and preserves the TXT-before-CSV gate',
        pass: entryRegion !== null &&
            entryRegion.includes('hasTxtExportDone') &&
            entryRegion.includes('.meta') &&
            entryRegion.includes('sheet') && entryRegion.includes('pathology') && entryRegion.includes('tipoVisita'),
        detail: entryRegion === null ? 'function exportarAct497 not found' : 'projection validation or TXT gate missing from exportarAct497',
    });

    return cases;
}

// ---------------------------------------------------------------------------
// Y family — HTML wiring static
// ---------------------------------------------------------------------------

function evaluatePageY(html, pageScript) {
    const cases = [];
    const indexOf = (needle) => html.indexOf(needle);
    const boundaryIdx = indexOf('modules/reuma_export_boundary.js?v=');
    const contractIdx = indexOf('modules/reuma_act_contract.js?v=');
    const adapterIdx = indexOf('modules/reuma_legacy_export_adapter.js?v=');
    const pageScriptIdx = indexOf(pageScript + '?v=');

    cases.push({
        name: 'Y1 page loads the boundary, act-contract and adapter modules, each with a ?v= cache-busting token',
        pass: boundaryIdx !== -1 && contractIdx !== -1 && adapterIdx !== -1,
        detail: `boundary=${boundaryIdx} contract=${contractIdx} adapter=${adapterIdx}`,
    });

    cases.push({
        name: 'Y2 load order is exportManager → boundary → act contract → adapter → page script (contract+adapter after boundary, before the page script)',
        pass: boundaryIdx !== -1 && contractIdx !== -1 && adapterIdx !== -1 && pageScriptIdx !== -1 &&
            boundaryIdx < contractIdx && contractIdx < adapterIdx && adapterIdx < pageScriptIdx,
        detail: `exportManager=${indexOf('modules/exportManager.js?v=')} boundary=${boundaryIdx} contract=${contractIdx} adapter=${adapterIdx} pageScript=${pageScriptIdx}`,
    });

    return cases;
}

// ---------------------------------------------------------------------------
// Z family — behavioral (vm sandbox)
// ---------------------------------------------------------------------------

const BOUNDARY_AND_SEAM_MODULES = [BOUNDARY_MODULE, CONTRACT_MODULE, ADAPTER_MODULE];

/**
 * Sandbox with hubTools + exportManager (via the shared harness) plus the
 * boundary, act-contract and adapter modules loaded unmodified. Augmented
 * only with the runtime extras the browser would provide (alert sink,
 * clipboard stub, checklist-compatible createElement/body), mirroring the
 * frozen boundary check's consumer augmentation.
 */
function createCutoverSandbox() {
    const { sandbox, sink } = createLegacySandbox();
    sandbox.alert = () => {};
    sandbox.__clipboardWrites = [];
    sandbox.navigator.clipboard = {
        writeText: (text) => {
            sandbox.__clipboardWrites.push(String(text));
            return Promise.resolve();
        },
    };
    const originalCreateElement = sandbox.document.createElement.bind(sandbox.document);
    sandbox.document.createElement = (...args) => {
        const el = originalCreateElement(...args);
        el.querySelector = () => ({ addEventListener() {}, style: {} });
        el.innerHTML = '';
        return el;
    };
    sandbox.document.body = { appendChild() {}, removeChild() {} };
    for (const file of BOUNDARY_AND_SEAM_MODULES) {
        vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
    }
    return { sandbox, sink };
}

function tick(ms = 20) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs the FULL wired cutover sequence for one journey payload, exactly as
 * the frozen mechanical plan wires the CSV button happy path:
 * createVisitAct → projectVisitAct497 → exportarAct497 (TXT gate must be
 * satisfied by the caller via markTxtExportDone beforehand). Returns every
 * intermediate result so each case can assert its own fail-closed layer.
 */
function runWiredSequence(sandbox, { kind, pathology, datos, patientRef, gateSatisfied }) {
    if (gateSatisfied) {
        sandbox.markTxtExportDone(datos, { tipoVisita: kind === 'primera_visita' ? 'primera' : 'seguimiento', diagnostico: pathology });
    }
    const act = sandbox.HubTools.reumaActContract.createVisitAct({ kind, patientRef, pathology, payload: datos });
    if (!act || act.ok !== true) {
        return { act, projection: null, transportResult: undefined, delivered: false };
    }
    const projection = sandbox.HubTools.reumaLegacyExportAdapter.projectVisitAct497(act);
    if (!projection || projection.ok !== true) {
        return { act, projection, transportResult: undefined, delivered: false };
    }
    const transportResult = sandbox.HubTools.export.exportarAct497(projection, datos);
    return { act, projection, transportResult, delivered: true };
}

function clipboardWrites(sandbox) {
    return sandbox.__clipboardWrites;
}

/**
 * Installs a storage+event spy over the sandbox (the retired-contract seam,
 * replacing the old `addPendingRow` queue spy): wraps the localStorage shim
 * methods (setItem/removeItem/clear) and the sandbox window/document
 * dispatchEvent BEFORE the sequence runs, recording every storage write and
 * every dispatched event type. Observes real side effects WITHOUT
 * instrumenting or modifying production code, exactly like the clipboard
 * stub. `sandbox.window === sandbox`, so wrapping the sandbox covers
 * window.dispatchEvent too.
 */
function spyStorageAndEvents(sandbox) {
    const storageWrites = [];
    const dispatchedEvents = [];
    const wrapStorage = (storage) => {
        if (!storage) return;
        const originalSetItem = storage.setItem;
        const originalRemoveItem = storage.removeItem;
        const originalClear = storage.clear;
        storage.setItem = (key, value) => {
            storageWrites.push(`setItem:${String(key)}`);
            return originalSetItem.call(storage, key, value);
        };
        storage.removeItem = (key) => {
            storageWrites.push(`removeItem:${String(key)}`);
            return originalRemoveItem.call(storage, key);
        };
        storage.clear = () => {
            storageWrites.push('clear');
            return originalClear.call(storage);
        };
    };
    const wrapDispatch = (target) => {
        if (!target || typeof target.dispatchEvent !== 'function') return;
        const originalDispatchEvent = target.dispatchEvent;
        target.dispatchEvent = (event) => {
            dispatchedEvents.push(event && event.type ? String(event.type) : String(event));
            return originalDispatchEvent.call(target, event);
        };
    };
    wrapStorage(sandbox.localStorage);
    wrapDispatch(sandbox); // sandbox.window === sandbox
    wrapDispatch(sandbox.document);
    sandbox.__storageWrites = storageWrites;
    sandbox.__dispatchedEvents = dispatchedEvents;
}

function storageWrites(sandbox) {
    return sandbox.__storageWrites || [];
}

function dispatchedEvents(sandbox) {
    return sandbox.__dispatchedEvents || [];
}

async function evaluateBehaviorZ(journeys, directRows) {
    const cases = [];

    // Z1 — all 10 corpus journeys: the full wired sequence copies exactly ONE
    // clipboard row byte-identical to the direct boundary result for the same
    // payload, with ZERO localStorage writes and ZERO dispatched events.
    for (const journey of journeys) {
        const kind = journey.tipoVisita === 'primera' ? 'primera_visita' : 'seguimiento';
        const direct = directRows.get(`${journey.pathology}/${journey.tipoVisita}`);
        try {
            const { sandbox } = createCutoverSandbox();
            spyStorageAndEvents(sandbox);
            const datos = structuredClone(journey.datos);
            const run = runWiredSequence(sandbox, {
                kind,
                pathology: journey.pathology,
                datos,
                patientRef: datos.idPaciente,
                gateSatisfied: true,
            });
            await tick();
            const writes = clipboardWrites(sandbox);
            const writes2 = storageWrites(sandbox);
            const events = dispatchedEvents(sandbox);
            const ok = run.act && run.act.ok === true &&
                run.projection && run.projection.ok === true &&
                typeof sandbox.HubTools.export.exportarAct497 === 'function' &&
                writes.length === 1 && writes[0] === direct.row &&
                writes2.length === 0 && events.length === 0;
            record(`Z1 journey ${journey.pathology}/${journey.tipoVisita}: full wired sequence copies exactly ONE clipboard row byte-identical to the direct boundary result with ZERO storage writes and ZERO dispatched events`, ok,
                `actOk=${!!(run.act && run.act.ok)} projectionOk=${!!(run.projection && run.projection.ok)} exportarAct497=${typeof sandbox.HubTools.export.exportarAct497} writes=${writes.length} rowEqual=${writes.length === 1 && writes[0] === direct.row} storageWrites=${JSON.stringify(writes2)} events=${JSON.stringify(events)}`);
        } catch (error) {
            record(`Z1 journey ${journey.pathology}/${journey.tipoVisita}: full wired sequence copies exactly ONE clipboard row byte-identical to the direct boundary result with ZERO storage writes and ZERO dispatched events`, false, `crashed: ${error.message}`);
        }
    }

    // Z2 — contract failure (empty patientRef) surfaces through the wired
    // sequence: the rejected projection reaches the transport only to be
    // fail-closed: nothing queued, nothing copied.
    {
        const journey = journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
        try {
            const { sandbox } = createCutoverSandbox();
            spyStorageAndEvents(sandbox);
            const journey = journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
            const datos = structuredClone(journey.datos);
            datos.idPaciente = '';
            // Gate satisfied first: the ONLY blocker must be the contract.
            sandbox.markTxtExportDone(datos, { tipoVisita: 'primera', diagnostico: 'ar' });
            const act = sandbox.HubTools.reumaActContract.createVisitAct({ kind: 'primera_visita', patientRef: '', pathology: 'ar', payload: datos });
            // The wired coordinator stops on !ok; defensively the adapter and
            // the transport are also exercised with the failed act/rejected
            // projection to prove neither can deliver a partial result.
            const projection = act && act.ok === false
                ? sandbox.HubTools.reumaLegacyExportAdapter.projectVisitAct497(act)
                : null;
            const transportResult = projection && projection.ok === false && typeof sandbox.HubTools.export.exportarAct497 === 'function'
                ? sandbox.HubTools.export.exportarAct497(projection, datos)
                : undefined;
            await tick();
            const actRejected = act && act.ok === false && act.error && act.error.code === 'INVALID_PATIENT_REF';
            const projectionRejected = projection && projection.ok === false;
            const transportFailClosed = projection && projection.ok === false && transportResult === false;
            const nothing = clipboardWrites(sandbox).length === 0 && storageWrites(sandbox).length === 0 && dispatchedEvents(sandbox).length === 0;
            record('Z2 createVisitAct failure (empty patientRef) fails closed: typed act error, rejected projection, transport delivers nothing (no copy, no storage write, no event)',
                actRejected && projectionRejected && transportFailClosed && nothing,
                `actCode=${act && act.error && act.error.code} projectionOk=${!!(projection && projection.ok)} transportResult=${JSON.stringify(transportResult)} writes=${clipboardWrites(sandbox).length} storageWrites=${JSON.stringify(storageWrites(sandbox))} events=${JSON.stringify(dispatchedEvents(sandbox))}`);
        } catch (error) {
            record('Z2 createVisitAct failure (empty patientRef) fails closed: typed act error, rejected projection, transport delivers nothing (no copy, no storage write, no event)', false, `crashed: ${error.message}`);
        }
    }

    // Z3 — boundary rejection (in-memory rejecting double) surfaced through
    // the wired sequence: no partial row queued/copied.
    {
        const journey = journeys.find((j) => j.pathology === 'espa' && j.tipoVisita === 'seguimiento');
        try {
            const { sandbox } = createCutoverSandbox();
            spyStorageAndEvents(sandbox);
            sandbox.HubTools.reumaExportBoundary = Object.freeze({
                generateLegacyRow497: () => Object.freeze({ ok: false, error: Object.freeze({ code: 'ROW_LENGTH_INVALID', message: 'planted boundary rejection (QA)' }) }),
            });
            const datos = structuredClone(journey.datos);
            const run = runWiredSequence(sandbox, { kind: 'seguimiento', pathology: 'espa', datos, patientRef: datos.idPaciente, gateSatisfied: true });
            const transportResult = run.projection && run.projection.ok === false && typeof sandbox.HubTools.export.exportarAct497 === 'function'
                ? sandbox.HubTools.export.exportarAct497(run.projection, datos)
                : undefined;
            await tick();
            const projectionRejected = run.projection && run.projection.ok === false;
            const transportFailClosed = run.projection && run.projection.ok === false && transportResult === false;
            const nothing = clipboardWrites(sandbox).length === 0 && storageWrites(sandbox).length === 0 && dispatchedEvents(sandbox).length === 0;
            record('Z3 adapter/boundary rejection surfaced through the wired sequence: fail-closed transport, no partial row copied (no copy, no storage write, no event)',
                projectionRejected && transportFailClosed && nothing,
                `projectionOk=${!!(run.projection && run.projection.ok)} transportResult=${JSON.stringify(transportResult)} writes=${clipboardWrites(sandbox).length} storageWrites=${JSON.stringify(storageWrites(sandbox))} events=${JSON.stringify(dispatchedEvents(sandbox))}`);
        } catch (error) {
            record('Z3 adapter/boundary rejection surfaced through the wired sequence: fail-closed transport, no partial row copied (no copy, no storage write, no event)', false, `crashed: ${error.message}`);
        }
    }

    // Z4 — TXT gate not satisfied: a valid projection is NOT delivered.
    {
        const journey = journeys.find((j) => j.pathology === 'les' && j.tipoVisita === 'primera');
        try {
            const { sandbox } = createCutoverSandbox();
            spyStorageAndEvents(sandbox);
            const datos = structuredClone(journey.datos);
            const run = runWiredSequence(sandbox, { kind: 'primera_visita', pathology: 'les', datos, patientRef: datos.idPaciente, gateSatisfied: false });
            await tick();
            const gateBlocked = run.projection && run.projection.ok === true && run.transportResult === false;
            const nothing = clipboardWrites(sandbox).length === 0 && storageWrites(sandbox).length === 0 && dispatchedEvents(sandbox).length === 0;
            record('Z4 TXT gate not satisfied: valid projection is not delivered (gate preserved), nothing copied (no copy, no storage write, no event)',
                gateBlocked && nothing,
                `projectionOk=${!!(run.projection && run.projection.ok)} transportResult=${JSON.stringify(run.transportResult)} writes=${clipboardWrites(sandbox).length} storageWrites=${JSON.stringify(storageWrites(sandbox))} events=${JSON.stringify(dispatchedEvents(sandbox))}`);
        } catch (error) {
            record('Z4 TXT gate not satisfied: valid projection is not delivered (gate preserved), nothing copied (no copy, no storage write, no event)', false, `crashed: ${error.message}`);
        }
    }

    // Z5 — no mutation of datos/act through the full wired sequence.
    {
        const journey = journeys.find((j) => j.pathology === 'aps' && j.tipoVisita === 'primera');
        try {
            const { sandbox } = createCutoverSandbox();
            spyStorageAndEvents(sandbox);
            const datos = structuredClone(journey.datos);
            const nestedMarker = datos.comorbilidad;
            const snapshotBefore = JSON.stringify(datos);
            const run = runWiredSequence(sandbox, { kind: 'primera_visita', pathology: 'aps', datos, patientRef: datos.idPaciente, gateSatisfied: true });
            await tick();
            const snapshotAfter = JSON.stringify(datos);
            const actSnapshotAfter = JSON.stringify(run.act);
            record('Z5 full wired sequence leaves datos and act deep-identical (JSON snapshots, nested reference intact)',
                run.delivered && snapshotBefore === snapshotAfter &&
                actSnapshotAfter === JSON.stringify(run.act) && datos.comorbilidad === nestedMarker,
                `delivered=${run.delivered} datosSnapshotEqual=${snapshotBefore === snapshotAfter} datosReferenceIntact=${datos.comorbilidad === nestedMarker}`);
        } catch (error) {
            record('Z5 full wired sequence leaves datos and act deep-identical (JSON snapshots, nested reference intact)', false, `crashed: ${error.message}`);
        }
    }

    // Z-f planted lie — a transport that delivers a SUBTLY ALTERED row (one
    // field tampered in-memory behind a still-ok boundary double) must be
    // detected as a byte-fidelity FAIL by this checker.
    {
        const journey = journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
        const direct = directRows.get(`ar/primera`);
        try {
            const { sandbox } = createCutoverSandbox();
            spyStorageAndEvents(sandbox);
            const tamperedRow = (() => {
                const fields = direct.row.split('\t');
                fields[10] = fields[10] + '-TAMPERED';
                return fields.join('\t');
            })();
            sandbox.HubTools.reumaExportBoundary = Object.freeze({
                generateLegacyRow497: () => Object.freeze({
                    ok: true, row: tamperedRow, fields: Object.freeze(tamperedRow.split('\t')),
                    meta: Object.freeze({ pathology: 'ar', tipoVisita: 'primera', sheet: 'AR', generatorName: 'planted', columnCount: 497 }),
                }),
            });
            const datos = structuredClone(journey.datos);
            const run = runWiredSequence(sandbox, { kind: 'primera_visita', pathology: 'ar', datos, patientRef: datos.idPaciente, gateSatisfied: true });
            await tick();
            const writes = clipboardWrites(sandbox);
            const tamperedWasDelivered = run.delivered && writes.length === 1 && writes[0] === tamperedRow;
            const plantedRecord = {
                name: 'Z-f planted lie: delivered row stays byte-identical to the direct boundary row',
                pass: !(tamperedWasDelivered && writes[0] !== direct.row),
            };
            record('Z-f planted lie (tampered in-memory row behind a still-ok boundary double) is detected as a byte-fidelity FAIL',
                tamperedWasDelivered && plantedRecord.pass === false,
                `tamperedDelivered=${tamperedWasDelivered} plantedPass=${plantedRecord.pass}`);
        } catch (error) {
            record('Z-f planted lie (tampered in-memory row behind a still-ok boundary double) is detected as a byte-fidelity FAIL', false, `crashed: ${error.message}`);
        }
    }
}

// ---------------------------------------------------------------------------
// Planted-lie self-tests for the static families (W-f / X-f / Y-f)
//
// The evaluators are pure functions over source text, so each one is proven
// to accept a SYNTHETIC-GOOD cutover shape and to fail planted cutover
// defects — the checker can disagree with the implementation regardless of
// the current repository state.
// ---------------------------------------------------------------------------

function syntheticGoodCoordinator(kind) {
    return `
const btnExportCsv = document.getElementById('btnEstructurarCSV');
if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
        try {
            const errores = HubTools.form.validarFormulario();
            if (errores.length === 0) {
                if (typeof HubTools?.export?.exportarAct497 !== 'function') {
                    HubTools.utils?.mostrarNotificacion?.('Error: transporte CSV no disponible', 'error');
                    return;
                }
                const datos = HubTools.form.recopilarDatosFormulario();
                const diagnostico = document.getElementById('diagnosticoPrimario').value;
                const act = HubTools.reumaActContract.createVisitAct({
                    kind: '${kind}',
                    patientRef: datos.idPaciente,
                    pathology: diagnostico,
                    payload: datos
                });
                if (!act || act.ok !== true) {
                    HubTools.utils?.mostrarNotificacion?.('Exportación CSV bloqueada (acto de visita inválido)', 'error');
                    return;
                }
                const proyeccion = HubTools.reumaLegacyExportAdapter.projectVisitAct497(act);
                if (!proyeccion || proyeccion.ok !== true) {
                    HubTools.utils?.mostrarNotificacion?.('Exportación CSV bloqueada en la frontera de compatibilidad', 'error');
                    return;
                }
                HubTools.export.exportarAct497(proyeccion, datos);
            }
        } catch (error) {
            console.error('Error al exportar CSV:', error);
            HubTools.utils?.mostrarNotificacion?.('Error al exportar CSV: ' + error.message, 'error');
        }
    });
}
`;
}

function evaluatePlantedCoordinatorLies() {
    const good = syntheticGoodCoordinator('primera_visita');
    const goodCases = evaluateCoordinatorW(good, 'primera_visita');
    record('W-f synthetic-good coordinator passes every W case', goodCases.every((c) => c.pass),
        `failing=${JSON.stringify(goodCases.filter((c) => !c.pass).map((c) => c.name))}`);

    const legacyCallPlanted = good.replace(
        "HubTools.export.exportarAct497(proyeccion, datos);",
        "HubTools.export.exportarYCopiarCSV(datos, 'primera', diagnostico);");
    const legacyCallCases = evaluateCoordinatorW(legacyCallPlanted, 'primera_visita');
    record('W-f planted lie (coordinator still calling exportarYCopiarCSV in the CSV handler) fails the W family',
        legacyCallCases.some((c) => c.name.startsWith('W4') && c.pass === false),
        `W4 pass=${(legacyCallCases.find((c) => c.name.startsWith('W4')) || {}).pass}`);

    const nameInferencePlanted = good.replace('patientRef: datos.idPaciente', "patientRef: datos.nombrePaciente");
    const nameInferenceCases = evaluateCoordinatorW(nameInferencePlanted, 'primera_visita');
    record('W-f planted lie (patientRef inferred from the patient name) fails the W family',
        nameInferenceCases.some((c) => c.name.startsWith('W6') && c.pass === false),
        `W6 pass=${(nameInferenceCases.find((c) => c.name.startsWith('W6')) || {}).pass}`);

    const wrongKindPlanted = good.replace("'primera_visita'", "'seguimiento'");
    const wrongKindCases = evaluateCoordinatorW(wrongKindPlanted, 'primera_visita');
    record('W-f planted lie (wrong/inferred kind token) fails the W family',
        wrongKindCases.some((c) => c.name.startsWith('W5') && c.pass === false),
        `W5 pass=${(wrongKindCases.find((c) => c.name.startsWith('W5')) || {}).pass}`);

    const unfilteredErrorPlanted = good.replace("console.error('Error al exportar CSV:', error);", "console.error('❌ Error capturado en exportación CSV:', error);");
    const unfilteredErrorCases = evaluateCoordinatorW(unfilteredErrorPlanted, 'primera_visita');
    record('W-f planted lie (console.error outside the X4 filtered classes) fails the W family',
        unfilteredErrorCases.some((c) => c.name.startsWith('W9') && c.pass === false),
        `W9 pass=${(unfilteredErrorCases.find((c) => c.name.startsWith('W9')) || {}).pass}`);
}

function syntheticGoodExportManager() {
    return `
function hasTxtExportDone(datos, context) { return true; }
function copyTextWithFallback(textToCopy, options) { return Promise.resolve(true); }
function mostrarChecklistPostExport(hojaExcel) {}
function entregarFilaProyectadaCSV(csvData, hojaExcel, pathology, tipoVisita) {
    copyTextWithFallback(csvData, { manualText: csvData, modalTitle: 'Copia manual de CSV' });
    mostrarChecklistPostExport(hojaExcel);
}
function exportarYCopiarCSV(datos, tipoVisita, diagnostico) {
    const boundaryResult = HubTools.reumaExportBoundary.generateLegacyRow497({ datos: datos, pathology: diagnostico, tipoVisita: tipoVisita });
    if (!boundaryResult || boundaryResult.ok !== true || typeof boundaryResult.row !== 'string') { return false; }
    entregarFilaProyectadaCSV(boundaryResult.row, boundaryResult.meta.sheet, diagnostico, tipoVisita);
    return true;
}
function exportarAct497(proyeccion, datos) {
    if (!datos || typeof datos !== 'object') { return false; }
    if (!proyeccion || proyeccion.ok !== true || typeof proyeccion.row !== 'string' ||
        !proyeccion.meta || !proyeccion.meta.sheet || !proyeccion.meta.pathology || !proyeccion.meta.tipoVisita) {
        return false;
    }
    if (!hasTxtExportDone(datos, { tipoVisita: proyeccion.meta.tipoVisita, diagnostico: proyeccion.meta.pathology })) { return false; }
    entregarFilaProyectadaCSV(proyeccion.row, proyeccion.meta.sheet, proyeccion.meta.pathology, proyeccion.meta.tipoVisita);
    return true;
}
HubTools.export.exportarAct497 = exportarAct497;
`;
}

function evaluatePlantedExportManagerLies() {
    const good = syntheticGoodExportManager();
    const goodCases = evaluateExportManagerX(good);
    record('X-f synthetic-good exportManager passes every X case', goodCases.every((c) => c.pass),
        `failing=${JSON.stringify(goodCases.filter((c) => !c.pass).map((c) => c.name))}`);

    // Plant (i): a reintroduced addPendingRow enqueue call inside the shared
    // helper must fail the queue-free X3 assertion.
    const addPendingRowPlanted = good.replace(
        "    copyTextWithFallback(csvData, { manualText: csvData, modalTitle: 'Copia manual de CSV' });",
        `    addPendingRow({ content: csvData, sheet: hojaExcel, pathology: pathology, type: tipoVisita, includeBom: false });
    copyTextWithFallback(csvData, { manualText: csvData, modalTitle: 'Copia manual de CSV' });`);
    const addPendingRowCases = evaluateExportManagerX(addPendingRowPlanted);
    record('X-f planted lie (reintroduced addPendingRow enqueue call) fails the X family',
        addPendingRowCases.some((c) => c.name.startsWith('X3') && c.pass === false),
        `X3 pass=${(addPendingRowCases.find((c) => c.name.startsWith('X3')) || {}).pass}`);

    // Plant (ii): a reintroduced hubPendingRows write + pendingRowsUpdated
    // dispatch must fail the queue-free X3 assertion.
    const queueTokensPlanted = good.replace(
        '    mostrarChecklistPostExport(hojaExcel);',
        `    try { localStorage.setItem('hubPendingRows', JSON.stringify([{ planted: 'witness-ii' }])); window.dispatchEvent(new CustomEvent('pendingRowsUpdated', { detail: [] })); } catch (e) {}
    mostrarChecklistPostExport(hojaExcel);`);
    const queueTokensCases = evaluateExportManagerX(queueTokensPlanted);
    record('X-f planted lie (reintroduced hubPendingRows write / pendingRowsUpdated dispatch) fails the X family',
        queueTokensCases.some((c) => c.name.startsWith('X3') && c.pass === false),
        `X3 pass=${(queueTokensCases.find((c) => c.name.startsWith('X3')) || {}).pass}`);

    const duplicatedDeliveryPlanted = good.replace(
        'HubTools.export.exportarAct497 = exportarAct497;',
        `function exportarAct497Duplicado() { copyTextWithFallback(csvData, {}); mostrarChecklistPostExport('X'); }
HubTools.export.exportarAct497 = exportarAct497;`);
    const duplicatedDeliveryCases = evaluateExportManagerX(duplicatedDeliveryPlanted);
    record('X-f planted lie (duplicated delivery block) fails the X family',
        duplicatedDeliveryCases.some((c) => c.name.startsWith('X3') && c.pass === false),
        `X3 pass=${(duplicatedDeliveryCases.find((c) => c.name.startsWith('X3')) || {}).pass}`);

    const boundaryCallPlanted = good.replace(
        '    if (!hasTxtExportDone(datos,',
        '    HubTools.reumaExportBoundary.generateLegacyRow497({ datos: datos });\n    if (!hasTxtExportDone(datos,');
    const boundaryCallCases = evaluateExportManagerX(boundaryCallPlanted);
    record('X-f planted lie (exportarAct497 calling the boundary/generator directly) fails the X family',
        boundaryCallCases.some((c) => c.name.startsWith('X6') && c.pass === false),
        `X6 pass=${(boundaryCallCases.find((c) => c.name.startsWith('X6')) || {}).pass}`);

    const missingGatePlanted = good.replace('!hasTxtExportDone(datos,', '!hasTxtGateDropped(datos,');
    const missingGateCases = evaluateExportManagerX(missingGatePlanted);
    record('X-f planted lie (TXT gate dropped from exportarAct497) fails the X family',
        missingGateCases.some((c) => c.name.startsWith('X7') && c.pass === false),
        `X7 pass=${(missingGateCases.find((c) => c.name.startsWith('X7')) || {}).pass}`);
}

function syntheticGoodPage() {
    return `<html><body>
<script src="modules/hubTools.js?v=1"></script>
<script src="modules/exportManager.js?v=1"></script>
<script src="modules/reuma_export_boundary.js?v=1"></script>
<script src="modules/reuma_act_contract.js?v=1"></script>
<script src="modules/reuma_legacy_export_adapter.js?v=1"></script>
<script src="scripts/script_primera_visita.js?v=1"></script>
</body></html>`;
}

function evaluatePlantedPageLies() {
    const good = syntheticGoodPage();
    const goodCases = evaluatePageY(good, 'scripts/script_primera_visita.js');
    record('Y-f synthetic-good page passes every Y case', goodCases.every((c) => c.pass),
        `failing=${JSON.stringify(goodCases.filter((c) => !c.pass).map((c) => c.name))}`);

    const wrongOrderPlanted = good.replace(
        `<script src="modules/reuma_export_boundary.js?v=1"></script>
<script src="modules/reuma_act_contract.js?v=1"></script>
<script src="modules/reuma_legacy_export_adapter.js?v=1"></script>`,
        `<script src="modules/reuma_act_contract.js?v=1"></script>
<script src="modules/reuma_legacy_export_adapter.js?v=1"></script>
<script src="modules/reuma_export_boundary.js?v=1"></script>`);
    const wrongOrderCases = evaluatePageY(wrongOrderPlanted, 'scripts/script_primera_visita.js');
    record('Y-f planted lie (contract/adapter loaded before the boundary) fails the Y family',
        wrongOrderCases.some((c) => c.name.startsWith('Y2') && c.pass === false),
        `Y2 pass=${(wrongOrderCases.find((c) => c.name.startsWith('Y2')) || {}).pass}`);

    const missingTokenPlanted = good.replace('modules/reuma_act_contract.js?v=1', 'modules/reuma_act_contract.js');
    const missingTokenCases = evaluatePageY(missingTokenPlanted, 'scripts/script_primera_visita.js');
    record('Y-f planted lie (cache-busting ?v= token missing) fails the Y family',
        missingTokenCases.some((c) => c.name.startsWith('Y1') && c.pass === false),
        `Y1 pass=${(missingTokenCases.find((c) => c.name.startsWith('Y1')) || {}).pass}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    console.log('Reuma act cutover check (F5.4C, #464, train #461 — 100% synthetic corpus)');

    const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS), 'utf8'));
    const journeys = corpus.journeys;
    if (journeys.length !== 10) throw new Error(`Expected 10 corpus journeys, found ${journeys.length}`);

    // Direct boundary reference rows (same derivation as frozen C1): the
    // wired sequence must reproduce these bytes exactly.
    const directRows = new Map();
    {
        const { sandbox } = createCutoverSandbox();
        for (const journey of journeys) {
            const result = sandbox.HubTools.reumaExportBoundary.generateLegacyRow497({
                datos: structuredClone(journey.datos),
                pathology: journey.pathology,
                tipoVisita: journey.tipoVisita,
            });
            if (!result || result.ok !== true || typeof result.row !== 'string') {
                throw new Error(`Precondition failed: boundary could not produce the direct reference row for ${journey.pathology}/${journey.tipoVisita}`);
            }
            directRows.set(`${journey.pathology}/${journey.tipoVisita}`, result);
        }
    }

    // =====================================================================
    // W — wired-route static (coordinators)
    // =====================================================================
    for (const coordinator of COORDINATORS) {
        const source = readRepoFile(coordinator.file);
        for (const c of evaluateCoordinatorW(source, coordinator.kind)) {
            record(`${c.name} [${coordinator.file}]`, c.pass, c.detail);
        }
    }

    // =====================================================================
    // X — transport static (exportManager)
    // =====================================================================
    {
        const source = readRepoFile(EXPORT_MANAGER);
        for (const c of evaluateExportManagerX(source)) {
            record(`${c.name}`, c.pass, c.detail);
        }
    }

    // =====================================================================
    // Y — HTML wiring static
    // =====================================================================
    for (const coordinator of COORDINATORS) {
        const html = readRepoFile(coordinator.page);
        const pageScript = coordinator.file.replace(/^scripts\//, 'scripts/');
        for (const c of evaluatePageY(html, pageScript)) {
            record(`${c.name} [${coordinator.page}]`, c.pass, c.detail);
        }
    }

    // =====================================================================
    // Z — behavioral (vm sandbox)
    // =====================================================================
    await evaluateBehaviorZ(journeys, directRows);

    // =====================================================================
    // Planted-lie self-tests
    // =====================================================================
    evaluatePlantedCoordinatorLies();
    evaluatePlantedExportManagerLies();
    evaluatePlantedPageLies();

    const failed = results.filter((r) => !r.pass).length;
    console.log('');
    console.log(`RESULTADO: ${results.length - failed} OK / ${failed} FALLIDO`);
    if (failed > 0) {
        console.error('Reuma act cutover check FAILED');
        process.exit(1);
    }
    console.log('Reuma act cutover check PASSED');
}

main().catch((err) => {
    console.error('Reuma act cutover check crashed:', err);
    process.exit(1);
});
