#!/usr/bin/env node
'use strict';
/**
 * FROZEN PRINCIPAL ACCEPTANCE ORACLE — Reuma legacy 497 export adapter
 * WO-NEXUS-REUMA-F5.4B / issue #463 (parent train #461)
 * =====================================================================
 *
 * Authority basis (frozen before the implementation context received write
 * authority; this oracle may disagree with the implementation):
 *   - Issue #463 (WO-NEXUS-REUMA-F5.4B) — binding contract authority for the
 *     future surface `HubTools.reumaLegacyExportAdapter.projectVisitAct497(act)`
 *     in `modules/reuma_legacy_export_adapter.js`.
 *   - Issue #462 + its frozen oracle (`tools/reuma_act_contract_check.mjs`,
 *     106/0, T1 approved+burned) — the act envelope this adapter must accept:
 *     EXACTLY { ok, contractVersion='reuma-visit-act/v1', kind, patientRef,
 *     pathology, payload }, produced by `HubTools.reumaActContract.createVisitAct`.
 *   - F5.3 boundary (#457, `modules/reuma_export_boundary.js`,
 *     `HubTools.reumaExportBoundary.generateLegacyRow497({ datos, pathology,
 *     tipoVisita })`) — the ONLY route to the legacy 497 generators. Its ok
 *     result shape is { ok, row, fields, meta:{ pathology, tipoVisita, sheet,
 *     generatorName, columnCount } }.
 *   - ADR-005 (clinical write contracts): acto por intención profesional; la
 *     fila 497 es proyección posterior, no dominio.
 *   - ADR-006 (persistence adapters): Excel es adapter soportado; el caso de
 *     uso no conoce hojas, columnas ni portapapeles.
 *   - CODING_STANDARDS §7 (verification must be able to disagree), §8 (fail
 *     explicitly), §12 (preserve explicit clinical meaning; ''/missing/'NA'/
 *     'ND'/0/false never collapse), §13 (no hidden normalization).
 *   - `docs/engineering/REUMA_EXPORT_KNOWN_LEGACY.md` — read-only context.
 *     NOTHING from KNOWN_LEGACY is corrected or canonized by this oracle
 *     (warn-only length, false-vs-missing collapses, raw `|| ''` reads,
 *     empty-vs-missing are neither asserted as correct nor "fixed" here:
 *     fidelity is judged strictly as byte-equality with the boundary itself).
 *
 * Module under test is loaded UNMODIFIED in a Node 20 `vm` sandbox with
 * modules/hubTools.js + modules/exportManager.js (legacy writer, untouched)
 * + modules/reuma_export_boundary.js + modules/reuma_act_contract.js
 * preloaded (same convention as `tools/reuma_export_harness.mjs` and the
 * existing Reuma checkers). With the adapter module ABSENT — the repository
 * state at freeze time — EVERY case records FAIL and the checker exits 1
 * (non-vacuity is proven, never assumed).
 *
 * FROZEN DECISION LOG (each place #463 was silent, the MOST fail-closed
 * interpretation was chosen):
 *
 *   D1 Envelope validation is STRICT (an act "as produced by createVisitAct"):
 *      the adapter must reject, with a typed fail-closed error, any act that
 *      is null / not-an-object / an array, that lacks
 *      contractVersion === 'reuma-visit-act/v1', whose kind is not exactly
 *      'primera_visita' | 'seguimiento', whose pathology is not exactly
 *      'espa' | 'aps' | 'ar' | 'les' | 'sjogren', whose patientRef is not a
 *      string with a non-whitespace character, or whose payload is not a
 *      non-null non-array object — and any act carrying EXTRA envelope keys
 *      (actId, revision, actor, timestamp, siteId, ...): such an object could
 *      not have come from the T1 contract, whose ok result carries EXACTLY
 *      the 6 keys (frozen D6 of tools/reuma_act_contract_check.mjs). No
 *      normalization, aliasing or inference anywhere (§13).
 *
 *   D2 kind→tipoVisita is the explicit closed map
 *      { primera_visita → 'primera', seguimiento → 'seguimiento' }; no
 *      heuristics, no other mapping exists. Both kinds × 5 pathologies are
 *      exercised through the real contract + real boundary.
 *
 *   D3 Ok result fidelity: the adapter result must be EXACTLY the boundary
 *      result content — keys exactly { ok, row, fields, meta } — where
 *      `row` is the identical string (byte-equivalent, ===), `fields` is an
 *      array of the same length with element-wise equality (and consistent
 *      with the row), and `meta` is deep-equal to the boundary meta
 *      { pathology, tipoVisita, sheet, generatorName, columnCount }. No
 *      truncation, padding, reordering, normalization or coercion; no extra
 *      or renamed keys (sheet/pathology/journey metadata live inside `meta`
 *      in the published F5.3 surface; the adapter preserves that shape
 *      verbatim rather than inventing a parallel one).
 *
 *   D4 Fail-closed shape: EVERY invalid input (D1), boundary absence,
 *      boundary non-function, boundary not-ok result and boundary throw
 *      returns { ok: false, error: { code: non-empty string, message:
 *      non-empty string } } with EXACTLY the keys { ok, error }; `row`,
 *      `fields` and `meta` are never exposed on a failure; the adapter NEVER
 *      throws out of projectVisitAct497 and NEVER fabricates a row. Exact
 *      code strings are implementation-chosen (#463 is silent) EXCEPT where
 *      D5 freezes propagation.
 *
 *   D5 Boundary not-ok propagation: when generateLegacyRow497 returns a
 *      typed not-ok result, the adapter error MUST preserve the boundary
 *      error code verbatim (error.code === boundary.error.code). Rewriting,
 *      swallowing or re-classifying a typed boundary error is forbidden:
 *      the boundary already decided, and #463 says "propagated".
 *
 *   D6 Transport fallback is forbidden and PROVEN behaviorally: with the
 *      legacy generators unreachable (removed in-memory), the adapter must
 *      (a) still project when a boundary double supplies a marker row —
 *      proving the call crosses the boundary — and (b) propagate the real
 *      boundary's typed GENERATOR_UNAVAILABLE error — proving there is no
 *      direct-generator fallback and no crash.
 *
 *   D7 Transport discipline is checked STATICALLY on the unmodified module
 *      source: it must NOT contain `generarFilaCSV`,
 *      `FINAL_V2_EXPORT_COLUMN_COUNT`, `HubTools.export` generator access,
 *      TSV tab-joining/splitting (`join('\t')` / `split('\t')`), clipboard
 *      access (`clipboard`, `writeText`), or the unambiguous Excel sheet
 *      tokens 'ESPA' | 'APS' | 'SJOGREN' (the tokens 'AR'/'LES' are not
 *      checked: as substrings they are too ambiguous in source text; sheet
 *      fidelity is already proven byte-level by E/I). It MUST reference
 *      `reumaExportBoundary` and `generateLegacyRow497`. The literal `497`
 *      is allowed ONLY inside the two mandated identifiers
 *      `projectVisitAct497` (surface name) and `generateLegacyRow497`
 *      (boundary method name); any other occurrence anywhere in the source —
 *      comments included — is a FAIL (column-count knowledge belongs to the
 *      boundary alone).
 *
 *   D8 Non-mutation: `act` and `act.payload` must survive the call
 *      deep-identical (JSON snapshot) with nested reference identity intact
 *      (act object identity, payload object identity, nested-object
 *      identity). This is stronger than "the row looks right".
 *
 *   D9 The 497 count is counted BY THE CHECKER ITSELF (`row.split('\t')`),
 *      never trusted from metadata, and both `row` and `fields` must agree
 *      on it.
 *
 *   D10 The adapter module must attach `HubTools.reumaLegacyExportAdapter`
 *       with a `projectVisitAct497` function when loaded after the contract
 *       and the boundary; it must not replace or weaken either.
 *
 * Exit codes: 0 = all cases PASS, 1 = at least one case FAIL.
 * Usage: node tools/reuma_legacy_export_adapter_check.mjs   (from repo root)
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createLegacySandbox } from './reuma_export_harness.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = 'tools/fixtures/reuma_export/corpus_v1.json';
const CONTRACT_MODULE = 'modules/reuma_act_contract.js';
const BOUNDARY_MODULE = 'modules/reuma_export_boundary.js';
const ADAPTER_MODULE = 'modules/reuma_legacy_export_adapter.js';

const CONTRACT_VERSION = 'reuma-visit-act/v1';
const KIND_BY_TIPO = { primera: 'primera_visita', seguimiento: 'seguimiento' }; // D2
const TIPO_BY_KIND = { primera_visita: 'primera', seguimiento: 'seguimiento' }; // D2
const EXPECTED_META_KEYS = ['columnCount', 'generatorName', 'pathology', 'sheet', 'tipoVisita'].sort();

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

const results = [];
const record = (name, pass, detail) => {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
};
const plantedSink = [];
const plantedRecord = (name, pass, detail) => {
    plantedSink.push({ name, pass });
    console.log(`      (planted) [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`.trimEnd());
};
// Each family runs exactly one planted lie; the sink is reset per family so
// the "detected as false" assertion is family-local.
const plantedDetectedAsFalse = () => plantedSink.length === 1 && plantedSink[0].pass === false;
const plantedSummary = () => `planted pass=${plantedSink.length === 1 ? plantedSink[0].pass : 'n/a'}`;

// ---------------------------------------------------------------------------
// Sandbox: hubTools + exportManager (legacy writer) + boundary + contract,
// all unmodified; the module under test is layered on top.
// ---------------------------------------------------------------------------

function loadModule(sandbox, file) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
}

/**
 * Builds a full oracle stack. `adapterSource === null` means: adapter module
 * absent (repository state at freeze time) — the returned project function
 * is null and every caller must fail closed, never crash.
 */
function createOracleStack(adapterSource) {
    const { sandbox } = createLegacySandbox(); // loads hubTools.js + exportManager.js unmodified
    loadModule(sandbox, BOUNDARY_MODULE);
    loadModule(sandbox, CONTRACT_MODULE);
    let source = adapterSource;
    if (source === null) {
        const modulePath = path.join(ROOT, ADAPTER_MODULE);
        if (!fs.existsSync(modulePath)) {
            return { sandbox, project: null, adapterSource: null };
        }
        source = fs.readFileSync(modulePath, 'utf8');
    }
    vm.runInContext(source, sandbox, { filename: ADAPTER_MODULE });
    const adapter = sandbox.HubTools && sandbox.HubTools.reumaLegacyExportAdapter;
    const project = adapter && typeof adapter.projectVisitAct497 === 'function' ? adapter.projectVisitAct497 : null;
    return { sandbox, project, adapterSource: source };
}

/**
 * Never throws. `{ unavailable: true }` = module under test absent (the
 * fail-closed state the oracle must surface as per-case FAIL, not a crash).
 */
function safeProject(project, act) {
    if (!project) return { unavailable: true };
    try {
        return { result: project(act) };
    } catch (err) {
        return { threw: err };
    }
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

const sortedKeys = (obj) => (obj && typeof obj === 'object' ? Object.keys(obj).sort() : []);

/** D4: typed structured failure, exactly { ok, error:{code,message} }, no row. */
function isTypedFailure(result) {
    return !!result && typeof result === 'object'
        && result.ok === false
        && result.error && typeof result.error === 'object'
        && typeof result.error.code === 'string' && result.error.code.trim() !== ''
        && typeof result.error.message === 'string' && result.error.message !== ''
        && sortedKeys(result).join('|') === 'error|ok'
        && result.row === undefined && result.fields === undefined && result.meta === undefined;
}

/**
 * D3 + D9: adapter ok result must equal the boundary ok result:
 * keys, byte-identical row, element-wise fields, consistent 497 count
 * (counted by this checker), deep-equal meta.
 */
function boundaryEquivalent(result, boundary) {
    if (!result || typeof result !== 'object' || result.ok !== true) return { pass: false, why: 'adapter result is not ok' };
    if (sortedKeys(result).join('|') !== sortedKeys(boundary).join('|')) {
        return { pass: false, why: `keys=${sortedKeys(result)} expected=${sortedKeys(boundary)}` };
    }
    if (typeof result.row !== 'string') return { pass: false, why: 'row is not a string' };
    if (result.row !== boundary.row) return { pass: false, why: 'row is not byte-identical to the boundary row' };
    if (!Array.isArray(result.fields)) return { pass: false, why: 'fields is not an array' };
    if (result.fields.length !== boundary.fields.length) return { pass: false, why: 'fields length differs from boundary' };
    for (let i = 0; i < result.fields.length; i++) {
        if (result.fields[i] !== boundary.fields[i]) return { pass: false, why: `fields[${i}] differs from boundary` };
    }
    const counted = result.row.split('\t').length; // D9: counted by the checker itself
    if (counted !== 497) return { pass: false, why: `row has ${counted} fields, expected 497` };
    if (result.fields.length !== counted) return { pass: false, why: 'fields array and row disagree on field count' };
    if (JSON.stringify(result.meta) !== JSON.stringify(boundary.meta)) return { pass: false, why: `meta differs: ${JSON.stringify(result.meta)} vs ${JSON.stringify(boundary.meta)}` };
    if (sortedKeys(result.meta).join('|') !== EXPECTED_META_KEYS.join('|')) return { pass: false, why: `meta keys=${sortedKeys(result.meta)}` };
    return { pass: true };
}

/** Creates the act through the REAL T1 contract (never hand-built). */
function makeAct(contract, journey) {
    return contract.createVisitAct({
        kind: KIND_BY_TIPO[journey.tipoVisita],
        patientRef: journey.patientId,
        pathology: journey.pathology,
        payload: structuredClone(journey.datos)
    });
}

// ---------------------------------------------------------------------------
// Planted-lie adapter sources (never written to the repository; loaded in
// memory into isolated sandboxes to prove this checker can disagree).
// ---------------------------------------------------------------------------

const PLANTED_FAKE_ROW = (() => { const f = Array(497).fill(''); f[0] = 'SYN-PLANTED-FAKE'; return f.join('\t'); })();

// PLANT E: wrong kind mapping (seguimiento mis-mapped to 'primera').
const PLANT_E_SOURCE = `(function () {
    'use strict';
    if (typeof window === 'undefined' || !window.HubTools) return;
    var HT = window.HubTools;
    HT.reumaLegacyExportAdapter = { projectVisitAct497: function (act) {
        var tipo = act && act.kind === 'primera_visita' ? 'primera' : 'primera'; /* PLANTED LIE */
        var b = HT.reumaExportBoundary.generateLegacyRow497({ datos: act.payload, pathology: act.pathology, tipoVisita: tipo });
        if (!b || b.ok !== true) return { ok: false, error: b && b.error ? b.error : { code: 'X', message: 'x' } };
        return { ok: true, row: b.row, fields: b.fields, meta: b.meta };
    } };
})();`;

// PLANT F: fabricates a plausible 497-field row for an INVALID act.
const PLANT_F_SOURCE = `(function () {
    'use strict';
    if (typeof window === 'undefined' || !window.HubTools) return;
    var HT = window.HubTools;
    var FAKE = ${JSON.stringify(PLANTED_FAKE_ROW)};
    HT.reumaLegacyExportAdapter = { projectVisitAct497: function (act) {
        var valid = act && act.contractVersion === 'reuma-visit-act/v1' && (act.kind === 'primera_visita' || act.kind === 'seguimiento');
        if (!valid) return { ok: true, row: FAKE, fields: FAKE.split('\\t'), meta: { pathology: 'ar', tipoVisita: 'primera', sheet: 'AR', generatorName: 'FAKE', columnCount: 497 } }; /* PLANTED LIE */
        var b = HT.reumaExportBoundary.generateLegacyRow497({ datos: act.payload, pathology: act.pathology, tipoVisita: act.kind === 'primera_visita' ? 'primera' : 'seguimiento' });
        if (!b || b.ok !== true) return { ok: false, error: b && b.error ? b.error : { code: 'X', message: 'x' } };
        return { ok: true, row: b.row, fields: b.fields, meta: b.meta };
    } };
})();`;

// PLANT G: mutates act.payload before delegating.
const PLANT_G_SOURCE = `(function () {
    'use strict';
    if (typeof window === 'undefined' || !window.HubTools) return;
    var HT = window.HubTools;
    HT.reumaLegacyExportAdapter = { projectVisitAct497: function (act) {
        act.payload.__oracle_planted_marker = 'SYN-MUTATED'; /* PLANTED LIE */
        var b = HT.reumaExportBoundary.generateLegacyRow497({ datos: act.payload, pathology: act.pathology, tipoVisita: act.kind === 'primera_visita' ? 'primera' : 'seguimiento' });
        if (!b || b.ok !== true) return { ok: false, error: b && b.error ? b.error : { code: 'X', message: 'x' } };
        return { ok: true, row: b.row, fields: b.fields, meta: b.meta };
    } };
})();`;

// PLANT H: bypasses the boundary and calls the legacy generator directly.
const PLANT_H_SOURCE = `(function () {
    'use strict';
    if (typeof window === 'undefined' || !window.HubTools) return;
    var HT = window.HubTools;
    HT.reumaLegacyExportAdapter = { projectVisitAct497: function (act) {
        var tipo = act.kind === 'primera_visita' ? 'primera' : 'seguimiento';
        var row = window.HubTools.export.generarFilaCSV_AR_PrimeraVisita(act.payload, tipo); /* PLANTED LIE: direct generator, no boundary */
        return { ok: true, row: row, fields: row.split('\\t'), meta: { pathology: 'ar', tipoVisita: tipo, sheet: 'AR', generatorName: 'generarFilaCSV_AR_PrimeraVisita', columnCount: 497 } };
    } };
})();`;

// PLANT I: "improves" sentinel compatibility by rewriting empty fields.
const PLANT_I_SOURCE = `(function () {
    'use strict';
    if (typeof window === 'undefined' || !window.HubTools) return;
    var HT = window.HubTools;
    HT.reumaLegacyExportAdapter = { projectVisitAct497: function (act) {
        var b = HT.reumaExportBoundary.generateLegacyRow497({ datos: act.payload, pathology: act.pathology, tipoVisita: act.kind === 'primera_visita' ? 'primera' : 'seguimiento' });
        if (!b || b.ok !== true) return { ok: false, error: b && b.error ? b.error : { code: 'X', message: 'x' } };
        var fields = b.row.split('\\t').map(function (f) { return f === '' ? 'NA' : f; }); /* PLANTED LIE: '' -> 'NA' */
        return { ok: true, row: fields.join('\\t'), fields: fields, meta: b.meta };
    } };
})();`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    console.log('Reuma legacy 497 export adapter check (F5.4B, #463, 100% synthetic corpus)');
    const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS), 'utf8'));
    const journeys = corpus.journeys;
    if (journeys.length !== 10) throw new Error(`Expected 10 corpus journeys, found ${journeys.length}`);
    // Precondition: the corpus covers 5 pathologies × both kinds (E family authority).
    {
        const seen = new Set(journeys.map((j) => `${j.pathology}/${j.tipoVisita}`));
        const needed = ['espa', 'aps', 'ar', 'les', 'sjogren'].flatMap((p) => ['primera', 'seguimiento'].map((t) => `${p}/${t}`));
        if (!needed.every((k) => seen.has(k))) throw new Error('Corpus does not cover all 10 journeys: ' + needed.filter((k) => !seen.has(k)));
    }

    const adapterPath = path.join(ROOT, ADAPTER_MODULE);
    const adapterPresent = fs.existsSync(adapterPath);
    const stack = createOracleStack(null); // real adapter (or null when absent)
    const project = stack.project;
    const adapterSource = stack.adapterSource;
    const contract = stack.sandbox.HubTools.reumaActContract;
    const boundary = stack.sandbox.HubTools.reumaExportBoundary;

    // =====================================================================
    // P0 — the module under test exists and attaches the frozen surface.
    // =====================================================================
    record('P0 modules/reuma_legacy_export_adapter.js exists and exposes HubTools.reumaLegacyExportAdapter.projectVisitAct497(act)',
        !!project, adapterPresent
            ? 'module found but HubTools.reumaLegacyExportAdapter.projectVisitAct497 is not a function'
            : `module under test not found: ${ADAPTER_MODULE} (oracle frozen before implementation; fail-closed state)`);

    // Base journeys reused across families.
    const arPrimera = journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
    const arSeguimiento = journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'seguimiento');

    // =====================================================================
    // E — binding equivalence (positive): all 10 journeys through the REAL
    // contract → adapter → boundary must be byte/field/meta-equivalent to
    // the direct boundary call on the same payload.
    // =====================================================================
    {
        let details = [];
        for (const journey of journeys) {
            const act = makeAct(contract, journey);
            if (act.ok !== true) { details.push(`${journey.pathology}/${journey.tipoVisita}: act not creatable (${act.error && act.error.code})`); continue; }
            const outcome = safeProject(project, act);
            if (outcome.unavailable) { details.push(`${journey.pathology}/${journey.tipoVisita}: adapter unavailable`); continue; }
            if (outcome.threw) { details.push(`${journey.pathology}/${journey.tipoVisita}: adapter THREW (${outcome.threw.message})`); continue; }
            const expected = boundary.generateLegacyRow497({ datos: structuredClone(journey.datos), pathology: journey.pathology, tipoVisita: journey.tipoVisita });
            if (!expected || expected.ok !== true) { details.push(`${journey.pathology}/${journey.tipoVisita}: boundary baseline not ok`); continue; }
            const eq = boundaryEquivalent(outcome.result, expected);
            if (!eq.pass) details.push(`${journey.pathology}/${journey.tipoVisita}: ${eq.why}`);
        }
        record('E all 10 journeys: projectVisitAct497(act).row is byte-equivalent to the direct boundary call, fields equal, exactly 497 fields counted by the checker, meta identical',
            details.length === 0, details.join('; ') || 'unexpected');

        // Explicit closed kind mapping (D2): kind=seguimiento must reach the
        // boundary as tipoVisita=seguimiento (and the rows must really differ,
        // otherwise this proof is vacuous).
        {
            const actSeg = makeAct(contract, arSeguimiento);
            const rowSeguimiento = boundary.generateLegacyRow497({ datos: structuredClone(arSeguimiento.datos), pathology: 'ar', tipoVisita: 'seguimiento' });
            const rowPrimera = boundary.generateLegacyRow497({ datos: structuredClone(arSeguimiento.datos), pathology: 'ar', tipoVisita: 'primera' });
            const rowsReallyDiffer = rowSeguimiento.ok === true && rowPrimera.ok === true && rowSeguimiento.row !== rowPrimera.row;
            const outcome = safeProject(project, actSeg);
            const mappedAsSeguimiento = !outcome.unavailable && !outcome.threw && outcome.result
                && outcome.result.ok === true && outcome.result.row === rowSeguimiento.row;
            record('E kind=seguimiento maps explicitly to tipoVisita=seguimiento (AR seguimiento row, not the primera row)',
                rowsReallyDiffer && mappedAsSeguimiento,
                `rowsReallyDiffer=${rowsReallyDiffer} mappedAsSeguimiento=${mappedAsSeguimiento}`);
        }

        // Planted lie (E): a wrong kind mapping must be detected.
        plantedSink.length = 0;
        {
            const plant = createOracleStack(PLANT_E_SOURCE);
            const act = makeAct(plant.sandbox.HubTools.reumaActContract, arSeguimiento);
            const expected = plant.sandbox.HubTools.reumaExportBoundary.generateLegacyRow497({ datos: structuredClone(arSeguimiento.datos), pathology: 'ar', tipoVisita: 'seguimiento' });
            const outcome = safeProject(plant.project, act);
            const rowsEqual = !outcome.unavailable && !outcome.threw && outcome.result
                && outcome.result.ok === true && outcome.result.row === expected.row;
            plantedRecord('planted lie: adapter with seguimiento mis-mapped to primera produces the byte-equivalent row',
                rowsEqual, 'rows differ (expected for the planted lie)');
            record('E-f planted lie (wrong kind mapping) is detected as false', plantedDetectedAsFalse(), plantedSummary());
        }
    }

    // =====================================================================
    // F — fail-closed (negative): anything that is not a valid act as
    // produced by the T1 contract (D1), boundary absence / non-function /
    // not-ok / throw must produce a typed structured error, never a row,
    // never a throw out of the adapter.
    // =====================================================================
    {
        const validAct = makeAct(contract, arPrimera);
        const wrongPayloadActs = [];
        for (const bad of [undefined, null, 42, 'act', [], true]) {
            const r = contract.createVisitAct({ kind: 'primera_visita', patientRef: 'SYN-X', pathology: 'ar', payload: bad });
            if (r.ok === false) wrongPayloadActs.push({ name: `payload ${bad === undefined ? 'missing' : JSON.stringify(bad)} (act the T1 contract itself refuses)`, act: { ok: false, error: r.error } });
        }
        const cases = [
            { name: 'act null', act: null },
            { name: 'act undefined', act: undefined },
            { name: 'act is an array', act: [] },
            { name: 'act is a string', act: 'reuma-visit-act/v1' },
            { name: 'act is a number', act: 7 },
            { name: 'contractVersion missing', act: { ...validAct, contractVersion: undefined } },
            { name: "contractVersion 'reuma-visit-act/v2'", act: { ...validAct, contractVersion: 'reuma-visit-act/v2' } },
            { name: 'contractVersion non-string', act: { ...validAct, contractVersion: 1 } },
            { name: "kind 'primera' (alias)", act: { ...validAct, kind: 'primera' } },
            { name: "kind 'PRIMERA_VISITA' (case)", act: { ...validAct, kind: 'PRIMERA_VISITA' } },
            { name: "kind 'seguimientos'", act: { ...validAct, kind: 'seguimientos' } },
            { name: 'kind missing', act: { ...validAct, kind: undefined } },
            { name: 'kind non-string', act: { ...validAct, kind: 3 } },
            { name: "pathology 'ESPA' (case)", act: { ...makeAct(contract, journeys.find((j) => j.pathology === 'espa' && j.tipoVisita === 'primera')), pathology: 'ESPA' } },
            { name: "pathology 'dermatologia' (unsupported)", act: { ...validAct, pathology: 'dermatologia' } },
            { name: 'pathology missing', act: { ...validAct, pathology: undefined } },
            { name: 'pathology non-string', act: { ...validAct, pathology: ['ar'] } },
            { name: 'patientRef missing', act: { ...validAct, patientRef: undefined } },
            { name: "patientRef ''", act: { ...validAct, patientRef: '' } },
            { name: 'patientRef non-string', act: { ...validAct, patientRef: 99 } },
            { name: 'payload missing', act: { ...validAct, payload: undefined } },
            { name: 'payload null', act: { ...validAct, payload: null } },
            { name: 'payload is an array', act: { ...validAct, payload: [] } },
            { name: 'payload is a string', act: { ...validAct, payload: '{}' } },
            { name: 'extra envelope key actId (could not come from createVisitAct)', act: { ...validAct, actId: 'SYN-EXTRA' } },
            { name: 'extra envelope key siteId', act: { ...validAct, siteId: 'SYN-SITE' } },
            ...wrongPayloadActs.map((w) => ({ name: w.name, act: w.act }))
        ];
        for (const c of cases) {
            const outcome = safeProject(project, c.act);
            const ok = !outcome.unavailable && !outcome.threw && isTypedFailure(outcome.result);
            record(`F ${c.name} fails closed with a typed structured error, no fabricated row, never throws`, ok,
                outcome.unavailable ? 'adapter module unavailable'
                    : outcome.threw ? `adapter THREW: ${outcome.threw.message}`
                        : `result=${JSON.stringify(outcome.result)}`);
        }

        // Boundary absent → typed fail-closed error (no generator fallback).
        {
            const plant = createOracleStack(null);
            if (plant.project) delete plant.sandbox.HubTools.reumaExportBoundary; // remove in-memory, never by editing files
            const act = makeAct(plant.sandbox.HubTools.reumaActContract, arPrimera);
            const outcome = safeProject(plant.project, act);
            record('F boundary absent (HubTools.reumaExportBoundary removed) fails closed with a typed error, no row, never throws',
                !outcome.unavailable && !outcome.threw && isTypedFailure(outcome.result),
                outcome.unavailable ? 'adapter unavailable' : `result=${JSON.stringify(outcome.result)}`);
        }
        // Boundary present but generateLegacyRow497 not a function.
        {
            const plant = createOracleStack(null);
            if (plant.project) plant.sandbox.HubTools.reumaExportBoundary = { generateLegacyRow497: 'not-a-function' };
            const act = makeAct(plant.sandbox.HubTools.reumaActContract, arPrimera);
            const outcome = safeProject(plant.project, act);
            record('F boundary.generateLegacyRow497 not a function fails closed with a typed error, no row, never throws',
                !outcome.unavailable && !outcome.threw && isTypedFailure(outcome.result),
                outcome.unavailable ? 'adapter unavailable' : `result=${JSON.stringify(outcome.result)}`);
        }
        // Boundary not-ok (typed) → propagated (D5: code preserved verbatim).
        {
            const plant = createOracleStack(null);
            const BOUNDARY_CODE = 'UNSUPPORTED_JOURNEY';
            plant.sandbox.HubTools.reumaExportBoundary = {
                generateLegacyRow497: () => Object.freeze({ ok: false, error: Object.freeze({ code: BOUNDARY_CODE, message: 'planted typed boundary rejection (QA)' }) })
            };
            const act = makeAct(plant.sandbox.HubTools.reumaActContract, arPrimera);
            const outcome = safeProject(plant.project, act);
            const propagated = !outcome.unavailable && !outcome.threw && isTypedFailure(outcome.result)
                && outcome.result.error.code === BOUNDARY_CODE;
            record('F typed boundary not-ok result is propagated as a typed fail-closed error preserving the boundary code (UNSUPPORTED_JOURNEY), no row fabricated',
                propagated, outcome.unavailable ? 'adapter unavailable' : `result=${JSON.stringify(outcome.result)}`);
        }
        // Boundary throwing → typed fail-closed error, never a throw out.
        {
            const plant = createOracleStack(null);
            plant.sandbox.HubTools.reumaExportBoundary = {
                generateLegacyRow497: () => { throw new Error('planted boundary crash (QA)'); }
            };
            const act = makeAct(plant.sandbox.HubTools.reumaActContract, arPrimera);
            const outcome = safeProject(plant.project, act);
            record('F boundary THROWING fails closed: adapter returns a typed error (does not rethrow, no row)',
                !outcome.unavailable && !outcome.threw && isTypedFailure(outcome.result),
                outcome.unavailable ? 'adapter unavailable' : `result=${JSON.stringify(outcome.result)}`);
        }

        // Planted lie (F): a fabricating adapter must be detected.
        plantedSink.length = 0;
        {
            const plant = createOracleStack(PLANT_F_SOURCE);
            const outcome = safeProject(plant.project, null);
            plantedRecord('planted lie: adapter returns a typed failure (no row) for a null act',
                !outcome.unavailable && !outcome.threw && isTypedFailure(outcome.result),
                outcome.unavailable ? 'adapter unavailable' : `result=${JSON.stringify(outcome.result)}`);
            record('F-f planted lie (fabricated row for an invalid act) is detected as false', plantedDetectedAsFalse(), plantedSummary());
        }
    }

    // =====================================================================
    // G — no-mutation: act and act.payload survive the call deep-identical
    // with nested reference identity (D8).
    // =====================================================================
    {
        for (const journey of [arPrimera, journeys.find((j) => j.pathology === 'espa' && j.tipoVisita === 'seguimiento')]) {
            const act = makeAct(contract, journey);
            const payloadRef = act.payload;
            const nestedKey = Object.keys(act.payload).find((k) => act.payload[k] && typeof act.payload[k] === 'object' && !Array.isArray(act.payload[k]));
            const nestedRef = nestedKey !== undefined ? act.payload[nestedKey] : undefined;
            const actSnapshotBefore = JSON.stringify(act);
            const payloadSnapshotBefore = JSON.stringify(act.payload);
            const outcome = safeProject(project, act);
            const unchanged = !outcome.unavailable && !outcome.threw && outcome.result && outcome.result.ok === true
                && JSON.stringify(act) === actSnapshotBefore
                && JSON.stringify(act.payload) === payloadSnapshotBefore
                && act.payload === payloadRef
                && (nestedKey === undefined || act.payload[nestedKey] === nestedRef);
            record(`G ${journey.pathology}/${journey.tipoVisita}: act and act.payload are deep-identical (JSON snapshot) after the call, with act/payload/nested reference identity intact`,
                unchanged,
                outcome.unavailable ? 'adapter unavailable' : outcome.threw ? `threw: ${outcome.threw.message}` : `actChanged=${JSON.stringify(act) !== actSnapshotBefore} payloadChanged=${JSON.stringify(act.payload) !== payloadSnapshotBefore}`);
        }

        // Planted lie (G): a mutating adapter must be detected.
        plantedSink.length = 0;
        {
            const plant = createOracleStack(PLANT_G_SOURCE);
            const act = makeAct(plant.sandbox.HubTools.reumaActContract, arPrimera);
            const snapshotBefore = JSON.stringify(act.payload);
            safeProject(plant.project, act);
            plantedRecord('planted lie: adapter that mutates act.payload leaves the payload snapshot unchanged',
                JSON.stringify(act.payload) === snapshotBefore,
                'payload snapshot changed (expected for the planted lie)');
            record('G-f planted lie (payload mutation) is detected as false', plantedDetectedAsFalse(), plantedSummary());
        }
    }

    // =====================================================================
    // H — transport discipline: static source checks + behavioral proof the
    // adapter crosses the boundary and never falls back to generators (D6/D7).
    // =====================================================================
    {
        // Static: the adapter source must not touch the transport directly.
        const forbiddenTokens = [
            'generarFilaCSV', 'FINAL_V2_EXPORT_COLUMN_COUNT', 'HubTools.export',
            "join('\\t')", "split('\\t')",
            'clipboard', 'writeText', 'ESPA', 'APS', 'SJOGREN'
        ];
        if (adapterSource === null) {
            record('H static: adapter source contains no direct transport access (generarFilaCSV_*, FINAL_V2_EXPORT_COLUMN_COUNT, HubTools.export, tab join/split, clipboard, sheet tokens)',
                false, `adapter module not found: ${ADAPTER_MODULE}`);
        } else {
            const hits = forbiddenTokens.filter((t) => adapterSource.includes(t));
            // D7: the literal 497 is allowed ONLY inside the mandated
            // identifiers projectVisitAct497 and generateLegacyRow497.
            const surfaceName = 'projectVisitAct497';
            const boundaryMethodName = 'generateLegacyRow497';
            const withoutMandated = adapterSource.split(surfaceName).join('').split(boundaryMethodName).join('');
            const stray497 = withoutMandated.includes('497');
            record('H static: adapter source contains no direct transport access (generarFilaCSV_*, FINAL_V2_EXPORT_COLUMN_COUNT, HubTools.export, tab join/split, clipboard, sheet tokens)',
                hits.length === 0 && !stray497,
                `forbiddenHits=${JSON.stringify(hits)} stray497=${stray497}`);
        }
        record('H static: adapter source references reumaExportBoundary and generateLegacyRow497 (routes through the F5.3 boundary)',
            adapterSource !== null && adapterSource.includes('reumaExportBoundary') && adapterSource.includes('generateLegacyRow497'),
            adapterSource === null ? `adapter module not found: ${ADAPTER_MODULE}` : 'boundary reference missing');

        // Behavioral positive: with the legacy generators UNREACHABLE (removed
        // in-memory) and a boundary double supplying a marker row, the adapter
        // still projects — through the boundary (D6a).
        {
            const plant = createOracleStack(null);
            const markerRow = (() => { const f = Array(497).fill(''); f[0] = 'SYN-BOUNDARY-MARKER'; return f.join('\t'); })();
            plant.sandbox.HubTools.export.generarFilaCSV_AR_PrimeraVisita = undefined;
            plant.sandbox.HubTools.export.generarFilaCSV_AR_Seguimiento = undefined;
            plant.sandbox.HubTools.reumaExportBoundary = {
                generateLegacyRow497: (request) => Object.freeze({
                    ok: true, row: markerRow, fields: Object.freeze(markerRow.split('\t')),
                    meta: Object.freeze({ pathology: request.pathology, tipoVisita: request.tipoVisita, sheet: 'AR', generatorName: 'SYN-BOUNDARY-DOUBLE', columnCount: 497 })
                })
            };
            const act = makeAct(plant.sandbox.HubTools.reumaActContract, arPrimera);
            const outcome = safeProject(plant.project, act);
            const viaBoundary = !outcome.unavailable && !outcome.threw && outcome.result
                && outcome.result.ok === true && outcome.result.row === markerRow
                && outcome.result.meta && outcome.result.meta.generatorName === 'SYN-BOUNDARY-DOUBLE';
            record('H behavioral: with legacy generators removed, the adapter still projects exactly the boundary marker row (exclusive boundary route)',
                viaBoundary, outcome.unavailable ? 'adapter unavailable' : `result=${JSON.stringify(outcome.result)}`);
        }
        // Behavioral negative: generators unreachable + REAL boundary → the
        // adapter must propagate GENERATOR_UNAVAILABLE (D5/D6b), never crash
        // and never fall back to a direct generator.
        {
            const plant = createOracleStack(null);
            for (const key of Object.keys(plant.sandbox.HubTools.export)) {
                if (key.startsWith('generarFilaCSV')) plant.sandbox.HubTools.export[key] = undefined;
            }
            const act = makeAct(plant.sandbox.HubTools.reumaActContract, arPrimera);
            const outcome = safeProject(plant.project, act);
            record('H behavioral: with ALL legacy generators removed and the real boundary in place, the adapter propagates the typed GENERATOR_UNAVAILABLE error (no direct-generator fallback, no throw, no row)',
                !outcome.unavailable && !outcome.threw && isTypedFailure(outcome.result)
                && outcome.result.error.code === 'GENERATOR_UNAVAILABLE',
                outcome.unavailable ? 'adapter unavailable' : `result=${JSON.stringify(outcome.result)}`);
        }

        // Planted lie (H): a direct-generator adapter must be detected both
        // statically and behaviorally.
        plantedSink.length = 0;
        {
            const staticHit = PLANT_H_SOURCE.includes('generarFilaCSV') && PLANT_H_SOURCE.includes('HubTools.export');
            plantedRecord('planted lie: source of a direct-generator adapter contains no forbidden transport token',
                !staticHit, `forbidden tokens present (expected for the planted lie)`);
            const plant = createOracleStack(PLANT_H_SOURCE);
            for (const key of Object.keys(plant.sandbox.HubTools.export)) {
                if (key.startsWith('generarFilaCSV')) plant.sandbox.HubTools.export[key] = undefined;
            }
            const act = makeAct(plant.sandbox.HubTools.reumaActContract, arPrimera);
            const outcome = safeProject(plant.project, act);
            const stillProjects = !outcome.unavailable && !outcome.threw && outcome.result && outcome.result.ok === true;
            plantedRecord('planted lie: direct-generator adapter still projects with the generators removed',
                stillProjects, 'adapter cannot project without the generators (expected for the planted lie)');
            record('H-f planted lies (direct generator call, static + behavioral) are detected as false',
                plantedSink.length === 2 && plantedSink.every((p) => p.pass === false), plantedSummary());
        }
    }

    // =====================================================================
    // I — sentinel/shape fidelity: the sentinel-rich corpus journey (AR
    // primera: '', 'NA', 'ND', 0 and false in the payload) must cross the
    // adapter→boundary byte-identical, with sentinel field positions
    // preserved verbatim (D9; KNOWN_LEGACY is neither corrected nor
    // canonized: fidelity is measured against the boundary itself).
    // =====================================================================
    {
        const sentinelJourney = arPrimera;
        // Precondition: the chosen journey payload really exercises the sentinels.
        const sentinelCounts = { emptyString: 0, NA: 0, ND: 0, zero: 0, falseBoolean: 0 };
        (function count(value) {
            if (value === null) return;
            switch (typeof value) {
                case 'string': if (value === '') sentinelCounts.emptyString++; if (value === 'NA') sentinelCounts.NA++; if (value === 'ND') sentinelCounts.ND++; break;
                case 'number': if (value === 0) sentinelCounts.zero++; break;
                case 'boolean': if (value === false) sentinelCounts.falseBoolean++; break;
                case 'object': Object.values(value).forEach(count); break;
            }
        })(sentinelJourney.datos);
        const payloadCoversSentinels = sentinelCounts.emptyString > 0 && sentinelCounts.NA > 0
            && sentinelCounts.ND > 0 && sentinelCounts.zero > 0 && sentinelCounts.falseBoolean > 0;
        if (!payloadCoversSentinels) throw new Error(`Precondition failed: ${sentinelJourney.pathology}/${sentinelJourney.tipoVisita} corpus journey no longer exercises all sentinels: ${JSON.stringify(sentinelCounts)}`);

        const act = makeAct(contract, sentinelJourney);
        const outcome = safeProject(project, act);
        const expected = boundary.generateLegacyRow497({ datos: structuredClone(sentinelJourney.datos), pathology: sentinelJourney.pathology, tipoVisita: sentinelJourney.tipoVisita });
        const eq = !outcome.unavailable && !outcome.threw ? boundaryEquivalent(outcome.result, expected) : { pass: false, why: 'adapter unavailable or threw' };

        // Explicit sentinel-position proof: at every field index where the
        // boundary emits '', 'NA', 'ND' or '0', the adapter emits the same
        // byte (no transformation of values anywhere).
        let sentinelPositions = { '': 0, 'NA': 0, 'ND': 0, '0': 0 };
        let sentinelMismatches = 0;
        if (expected.ok === true && eq.pass) {
            for (let i = 0; i < expected.fields.length; i++) {
                const v = expected.fields[i];
                if (Object.prototype.hasOwnProperty.call(sentinelPositions, v)) {
                    sentinelPositions[v]++;
                    if (outcome.result.fields[i] !== v) sentinelMismatches++;
                }
            }
        }
        const sentinelRichness = sentinelPositions[''] > 0 && sentinelPositions.NA > 0 && sentinelPositions.ND > 0 && sentinelPositions['0'] > 0;
        record(`I sentinel journey ${sentinelJourney.pathology}/${sentinelJourney.tipoVisita} (payload counts ${JSON.stringify(sentinelCounts)}) crosses adapter→boundary byte-identical with '', 'NA', 'ND' and '0' field positions preserved verbatim`,
            eq.pass && sentinelRichness && sentinelMismatches === 0,
            eq.pass ? `sentinelPositions=${JSON.stringify(sentinelPositions)} mismatches=${sentinelMismatches}` : eq.why);

        // Planted lie (I): an adapter that rewrites '' → 'NA' must be detected.
        plantedSink.length = 0;
        {
            const plant = createOracleStack(PLANT_I_SOURCE);
            const plantAct = makeAct(plant.sandbox.HubTools.reumaActContract, sentinelJourney);
            const plantExpected = plant.sandbox.HubTools.reumaExportBoundary.generateLegacyRow497({ datos: structuredClone(sentinelJourney.datos), pathology: sentinelJourney.pathology, tipoVisita: sentinelJourney.tipoVisita });
            const plantOutcome = safeProject(plant.project, plantAct);
            const byteIdentical = !plantOutcome.unavailable && !plantOutcome.threw && plantOutcome.result
                && plantOutcome.result.ok === true && plantOutcome.result.row === plantExpected.row;
            plantedRecord('planted lie: adapter that rewrites empty fields to NA still crosses byte-identical',
                byteIdentical, 'rows differ (expected for the planted lie)');
            record('I-f planted lie (\'\' rewritten to NA) is detected as false', plantedDetectedAsFalse(), plantedSummary());
        }
    }

    // =====================================================================
    // Summary
    // =====================================================================
    const failed = results.filter((r) => !r.pass).length;
    console.log('');
    console.log(`RESULTADO: ${results.length - failed} OK / ${failed} FALLIDO`);
    if (failed > 0) {
        console.error('Reuma legacy export adapter check FAILED');
        process.exit(1);
    }
    console.log('Reuma legacy export adapter check PASSED');
}

main().catch((err) => {
    console.error('Reuma legacy export adapter check crashed:', err);
    process.exit(1);
});
