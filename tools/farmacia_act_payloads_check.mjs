#!/usr/bin/env node
'use strict';
/**
 * FROZEN PRINCIPAL ACCEPTANCE ORACLE — independent Validation / First Visit /
 * Follow-up Pharmacy Act payloads
 * WO-NEXUS-FARMACIA-F4.4B / issue #489 (parent train #487, T2)
 * =====================================================================
 *
 * Authority basis (frozen before the implementation context received write
 * authority; this oracle may disagree with the implementation):
 *   - Issue #489 (WO-NEXUS-FARMACIA-F4.4B) — binding authority for the
 *     surface `HubTools.farmaciaActPayloads.createValidationAct /
 *     createFirstVisitAct / createFollowupAct` in
 *     `modules/farmacia_act_payloads.js`, built ON TOP of the Pharmacy Act v1
 *     common contract of #488 (T1).
 *   - T1 authority: `modules/farmacia_act_contract.js` +
 *     `tools/farmacia_act_contract_check.mjs` (#488). The payloads layer owns
 *     NOTHING of the common envelope: it delegates every common validation,
 *     the exact `kind` token set, sentinel preservation and deep detachment
 *     to `HubTools.farmaciaActContract.createAct`.
 *   - Clinical boundaries (AGENTS.md, #489): solicitado ≠ validado;
 *     previo ≠ nuevo; followup ≠ validación; requested-only nunca autovalida
 *     ni autogenera línea; ausencia permanece ausencia; ningún default
 *     terapéutico; ninguna taxonomía nueva por conveniencia.
 *   - Characterization sources (concept/cardinality ONLY, never row/column
 *     schema): `scripts/farmacia_export_v2_core.js`,
 *     `farmacia_export_v2_validation_adapter.js`,
 *     `farmacia_export_v2_first_visit_adapter.js`,
 *     `farmacia_export_v2_followup_active_lines_adapter.js` (read-only) and
 *     the clinical surfaces `farmacia_validacion.js`,
 *     `farmacia_primera_visita.js`, `farmacia_seguimiento.js` (read-only).
 *   - CODING_STANDARDS §7, §8, §12, §13, §14.
 *
 * The module under test (`modules/farmacia_act_payloads.js`) is loaded
 * UNMODIFIED inside a Node `vm` sandbox with the browser globals the
 * repository modules expect, with ONLY `modules/hubTools.js` and the T1
 * contract `modules/farmacia_act_contract.js` preloaded. Export v2 core and
 * the Export v2 adapters are deliberately NOT loaded (P7).
 *
 * FROZEN DECISION LOG (each place #489 was silent, the most fail-closed
 * interpretation was chosen; derivable from #489 + §8/§12/§13):
 *
 *   D1 Builder call form: `create<UseCase>Act(envelope, payload)` with TWO
 *      explicit arguments — the common Pharmacy Act v1 envelope (everything
 *      `createAct` requires except `kind` and `payload`) and the explicit
 *      clinical payload of that use case. `kind` is FIXED by each builder
 *      ('pharmacy_validation' / 'pharmacy_first_visit' /
 *      'pharmacy_followup') and can never be passed in: an envelope
 *      carrying `kind` or `payload` fails closed (they are owned by the
 *      contract / the builder respectively).
 *
 *   D2 Envelope key set is closed: exactly { actId, revision, siteId,
 *      patientRef, occurredAt, authoredAt, authorRef,
 *      attributionAssurance, provenance } plus optional `amendment`. Any
 *      unknown envelope key fails closed. Field-level validity (non-empty
 *      strings, revision >= 1, ISO datetimes, plain provenance, amendment
 *      shape) is NOT re-implemented here: it is delegated to T1, and T1
 *      structured failures are propagated verbatim.
 *
 *   D3 Payload structures frozen at block/cardinality level (no leaf
 *      taxonomy is invented or copied from the transport):
 *        - Validation payload: { request, validation?, transversal?,
 *          lines } — `request` REQUIRED plain object; `validation` and
 *          `transversal` OPTIONAL plain objects (present ONLY when the
 *          caller provides them; absent means the key does not exist — no
 *          null placeholder, no default); `lines` REQUIRED array (may be
 *          empty).
 *        - First Visit payload: { firstVisit, transversal?, lines } —
 *          `firstVisit` REQUIRED plain object; `lines` REQUIRED array.
 *        - Follow-up payload: { followup, lines } — `followup` REQUIRED
 *          plain object; `lines` REQUIRED array (may hold 0, 1, 2+ lines).
 *      Unknown payload keys fail closed: the structure freeze of F4.4B is
 *      exactly this block/cardinality shape.
 *
 *   D4 Blocks are OPAQUE: the builder adds ZERO leaf fields, normalizes
 *      nothing, and neither interprets nor polices caller block content
 *      (leaf vocabulary and transport policing of opaque caller data are
 *      not builder authority; adapters come later, outside F4.4B).
 *      Preservation of sentinels inside blocks (missing ≠ null ≠ '' ≠ 0 ≠
 *      false ≠ present-undefined) is inherited from the T1 deep copy.
 *
 *   D5 Lines: always an EXPLICIT caller-supplied array; every element must
 *      be a plain object (strings, numbers, null, arrays, missing elements
 *      fail closed); order and cardinality are preserved verbatim (0, 1,
 *      2+ stay 0, 1, 2+); NO line is ever generated from `request`,
 *      `firstVisit`, `followup`, drug names, catalog, history or prior
 *      treatment.
 *
 *   D6 No chaining: a builder creates exactly ONE act of exactly its own
 *      kind and never derives, nests or attaches another act.
 *
 *   D7 Failure shape: invalid input NEVER throws and NEVER fabricates an
 *      act. It returns { ok: false, error: { code, message } } with exactly
 *      the keys { ok, error }. Typed codes for the payload/envelope layer:
 *      INVALID_ENVELOPE, UNKNOWN_ENVELOPE_KEY, KIND_OWNED_BY_BUILDER,
 *      PAYLOAD_OWNED_BY_BUILDER, INVALID_PAYLOAD, UNKNOWN_PAYLOAD_KEY,
 *      MISSING_BLOCK, INVALID_BLOCK, INVALID_LINES, INVALID_LINE_ELEMENT.
 *      T1 codes pass through unchanged.
 *
 *   D8 No mutation, full detachment: inputs are never mutated and the
 *      returned act is provably detached in both directions (inherited
 *      from the T1 deep copy of the assembled payload).
 *
 *   D9 Transport ignorance is checked BOTH statically (the module source
 *      must not reference FarmaciaExportV2Core/adapters, ROW_COLUMNS,
 *      ROW_SCHEMA, row_* / bridge_* metadata, TSV, Excel/worksheet,
 *      clipboard, serialize/project, commit(), Date.now, new Date(),
 *      Math.random, storage, DOM, import/require) and behaviorally (loads
 *      with ONLY hubTools.js + the T1 contract; attaches ONLY
 *      HubTools.farmaciaActPayloads; refuses to attach when the T1 contract
 *      is absent; never consults the clock).
 *
 * Exit codes: 0 = all cases PASS, 1 = at least one case FAIL (fail-closed;
 * with the module under test absent, every case FAILs).
 * Usage: node tools/farmacia_act_payloads_check.mjs   (from repo root)
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HUB_TOOLS_MODULE = 'modules/hubTools.js';
const CONTRACT_MODULE = 'modules/farmacia_act_contract.js';
const PAYLOADS_MODULE = 'modules/farmacia_act_payloads.js';

const CONTRACT_VERSION = 'pharmacy-act/v1';
const KINDS = { validation: 'pharmacy_validation', firstVisit: 'pharmacy_first_visit', followup: 'pharmacy_followup' };
const BASE_ACT_KEYS = ['actId', 'attributionAssurance', 'authoredAt', 'authorRef', 'contractVersion', 'kind', 'occurredAt', 'ok', 'patientRef', 'payload', 'provenance', 'revision', 'siteId'].sort();
const WITH_AMENDMENT_ACT_KEYS = [...BASE_ACT_KEYS, 'amendment'].sort();
const ENVELOPE_KEYS = ['actId', 'revision', 'siteId', 'patientRef', 'occurredAt', 'authoredAt', 'authorRef', 'attributionAssurance', 'provenance'];
const OPTIONAL_ENVELOPE_KEYS = ['amendment'];

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
    console.log(`      (planted) [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
};
const plantedDetectedAsFalse = () => plantedSink.length === 1 && plantedSink[0].pass === false;
const plantedSummary = () => `planted pass=${plantedSink.length === 1 ? plantedSink[0].pass : 'n/a'}`;

// ---------------------------------------------------------------------------
// Sandbox (browser-scoped vm; hubTools.js + T1 contract preloaded)
// ---------------------------------------------------------------------------

function createCapturingConsole(sink) {
    const relay = (level) => (...args) => {
        sink.logs.push({ level, message: args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ') });
    };
    return { log: relay('log'), warn: relay('warn'), error: relay('error'), info: relay('log') };
}

function createStorageShim() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: (key) => { store.delete(String(key)); },
        clear: () => { store.clear(); },
    };
}

function createSandbox(options = {}) {
    const sink = { logs: [] };
    const clock = { nowCalls: 0, ctorCalls: 0 };
    const sandbox = {
        console: createCapturingConsole(sink),
        setTimeout,
        clearTimeout,
        navigator: { userAgent: 'promueve-act-payloads-oracle/1' },
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.sessionStorage = createStorageShim();
    sandbox.localStorage = createStorageShim();
    sandbox.CustomEvent = class CustomEvent {
        constructor(type, options2) {
            this.type = type;
            this.detail = options2 ? options2.detail : undefined;
        }
    };
    sandbox.document = {
        dispatchEvent: () => true,
        addEventListener: () => {},
        removeEventListener: () => {},
        getElementById: () => null,
        createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, removeChild() {}, remove() {} }),
    };
    sandbox.dispatchEvent = () => true;
    sandbox.addEventListener = () => {};
    sandbox.removeEventListener = () => {};
    sandbox.requestAnimationFrame = (fn) => setTimeout(fn, 0);
    if (options.instrumentClock) {
        class InstrumentedDate extends Date {
            constructor(...args) {
                if (args.length === 0) clock.ctorCalls += 1;
                super(...args);
            }
            static now() {
                clock.nowCalls += 1;
                return 0;
            }
        }
        sandbox.Date = InstrumentedDate;
    }
    vm.createContext(sandbox);
    return { sandbox, sink, clock };
}

function readModule(relativePath) {
    const modulePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(modulePath)) return null;
    return fs.readFileSync(modulePath, 'utf8');
}

/**
 * Loads hubTools.js, then (optionally) the T1 contract, then the module
 * under test — all unmodified. `withoutContract` proves the payloads layer
 * refuses to attach when T1 is absent (delegation, not reimplementation).
 */
function loadPayloads(options = {}) {
    const moduleSource = readModule(PAYLOADS_MODULE);
    if (moduleSource === null) {
        return { moduleSource: null, error: `module under test not found: ${PAYLOADS_MODULE} (oracle frozen before implementation; must fail closed)` };
    }
    const { sandbox, sink, clock } = createSandbox(options);
    vm.runInContext(readModule(HUB_TOOLS_MODULE), sandbox, { filename: HUB_TOOLS_MODULE });
    if (!options.withoutContract) {
        vm.runInContext(readModule(CONTRACT_MODULE), sandbox, { filename: CONTRACT_MODULE });
    }
    vm.runInContext(moduleSource, sandbox, { filename: PAYLOADS_MODULE });
    const surface = sandbox.HubTools ? sandbox.HubTools.farmaciaActPayloads : undefined;
    return { moduleSource, sandbox, sink, clock, surface };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeCall(fn, ...args) {
    try {
        return { result: fn(...args) };
    } catch (err) {
        return { threw: err };
    }
}

const sortedKeys = (obj) => Object.keys(obj).sort();
const describeValue = (v) => {
    if (typeof v === 'function') return 'function';
    if (typeof v === 'symbol') return 'symbol';
    try { return JSON.stringify(v) ?? String(v); } catch { return String(v); }
};

function isStructuredFailure(outcome) {
    if (outcome.threw) return false;
    const r = outcome.result;
    return !!r && typeof r === 'object'
        && r.ok === false
        && r.error && typeof r.error === 'object'
        && typeof r.error.code === 'string' && r.error.code.trim() !== ''
        && typeof r.error.message === 'string' && r.error.message !== ''
        && sortedKeys(r).join('|') === 'error|ok'
        && BASE_ACT_KEYS.filter((k) => k !== 'ok').every((k) => r[k] === undefined);
}

function isFailureWithCode(outcome, code) {
    return isStructuredFailure(outcome) && outcome.result.error.code === code;
}

function isOkAct(outcome) {
    return !outcome.threw && !!outcome.result && outcome.result.ok === true
        && outcome.result.contractVersion === CONTRACT_VERSION;
}

/** Deep-identical defined content + identical key sets (undefined-aware). */
function isFaithfulBlock(copy, original) {
    if (copy === original) return { pass: false, detail: 'same reference as input (not detached)' };
    if (sortedKeys(copy).join('|') !== sortedKeys(original).join('|')) return { pass: false, detail: `keys=${sortedKeys(copy).join('|')} expected=${sortedKeys(original).join('|')}` };
    for (const key of Object.keys(original)) {
        if (!(key in copy)) return { pass: false, detail: `key ${key} dropped` };
        const a = original[key];
        const b = copy[key];
        if (a === undefined) { if (b !== undefined) return { pass: false, detail: `key ${key} (present-undefined) changed` }; continue; }
        if (typeof a === 'object' && a !== null) {
            if (JSON.stringify(a) !== JSON.stringify(b)) return { pass: false, detail: `key ${key} content differs` };
            continue;
        }
        if (b !== a) return { pass: false, detail: `key ${key}: ${JSON.stringify(b)} !== ${JSON.stringify(a)}` };
    }
    return { pass: true, detail: '' };
}

function attemptMutation(fn) {
    try {
        fn();
        return 'applied';
    } catch (err) {
        return `blocked (${err.constructor.name})`;
    }
}

const VALID_ENVELOPE = () => ({
    actId: 'ACT-SYN-0001',
    revision: 1,
    siteId: 'HUB-DEMO-SITE',
    patientRef: 'SYN-0001',
    occurredAt: '2026-09-30T10:00:00Z',
    authoredAt: '2026-09-30T12:00:00Z',
    authorRef: 'FH-SYN-AUTHOR-01',
    attributionAssurance: 'explicit_professional_authorship_synthetic',
    provenance: { source: 'synthetic-oracle', note: 'synthetic characterization data' },
});

const VALID_REQUEST_BLOCK = () => ({
    origin: 'consulta_sintetica',
    date: '2026-09-29',
    validationType: 'inicio_nuevo',
    requestedTreatment: { drugName: 'FARMACO-SINTETICO-01', doseText: '', route: null, inductionStatus: 'not_recorded' },
    justification: 'JUSTIFICACION-SINTETICA',
});

const VALID_FIRST_VISIT_BLOCK = () => ({
    firstVisitDate: '2026-09-30',
    inductionPerformedStatus: 'not_recorded',
    stratificationLevel: 'NIVEL-SINTETICO',
    pharmacyVisitNotes: 'NOTA-SINTETICA',
});

const VALID_FOLLOWUP_BLOCK = () => ({
    visitDate: '2026-09-30',
    dispensationStatus: 'not_recorded',
    therapeuticMovementType: 'no_change_recorded',
    visitGeneralObservations: 'OBSERVACION-SINTETICA',
});

const VALIDATION_PAYLOAD = () => ({ request: VALID_REQUEST_BLOCK(), lines: [] });
const FIRST_VISIT_PAYLOAD = () => ({ firstVisit: VALID_FIRST_VISIT_BLOCK(), lines: [] });
const FOLLOWUP_PAYLOAD = () => ({ followup: VALID_FOLLOWUP_BLOCK(), lines: [] });

const SENTINEL_BLOCK = () => ({
    emptyString: '',
    na: 'NA',
    nd: 'ND',
    zero: 0,
    falseValue: false,
    nullValue: null,
    presentUndefined: undefined,
    nested: { hta: 'NA', counts: [0, false, '', 'ND', null], inner: { cero: 0, flag: false, ndToken: 'ND' } },
});

const SENTINEL_LINES = () => [
    { lineId: 'LINEA-SYN-1', estado: '', activo: false, peso: 0, previo: null, presente: undefined, anidado: { cero: 0, vacio: '' } },
    { lineId: 'LINEA-SYN-2', estado: 'NA', activo: true, peso: 7, previo: 'ND', presente: undefined, anidado: { cero: 0, vacio: '' } },
];

// ---------------------------------------------------------------------------
// P1 — independence of use cases
// ---------------------------------------------------------------------------

function familyP1(builders, degradedDetail) {
    console.log('  P1 — independence of use cases: each builder fixes only its kind, no chaining');
    const surfaceCaseNames = [
        'P1 module exposes exactly the three builders as functions',
        'P1 createValidationAct produces an ok Pharmacy Act v1 with kind pharmacy_validation',
        'P1 createFirstVisitAct produces an ok Pharmacy Act v1 with kind pharmacy_first_visit',
        'P1 createFollowupAct produces an ok Pharmacy Act v1 with kind pharmacy_followup',
        'P1 each ok act carries the exact T1 envelope key set (no extra builder metadata)',
        'P1 validation payload key set is exactly { lines, request } when only those are given',
        'P1 first visit payload key set is exactly { firstVisit, lines } when only those are given',
        'P1 followup payload key set is exactly { followup, lines } when only those are given',
        'P1 no chaining: an ok act contains no nested act/contract structures',
        'P1 the three builders from one envelope produce three acts differing only in kind and payload shape',
    ];
    if (!builders) {
        for (const name of surfaceCaseNames) record(name, false, degradedDetail);
        return;
    }
    const { createValidationAct, createFirstVisitAct, createFollowupAct } = builders;
    record(surfaceCaseNames[0],
        typeof createValidationAct === 'function' && typeof createFirstVisitAct === 'function' && typeof createFollowupAct === 'function'
        && sortedKeys(builders).join('|') === 'createFirstVisitAct|createFollowupAct|createValidationAct',
        `exports=${sortedKeys(builders).join('|')}`);

    const cases = [
        [surfaceCaseNames[1], createValidationAct, KINDS.validation, VALIDATION_PAYLOAD(), ['lines', 'request']],
        [surfaceCaseNames[2], createFirstVisitAct, KINDS.firstVisit, FIRST_VISIT_PAYLOAD(), ['firstVisit', 'lines']],
        [surfaceCaseNames[3], createFollowupAct, KINDS.followup, FOLLOWUP_PAYLOAD(), ['followup', 'lines']],
    ];
    const acts = [];
    for (const [name, build, kind, payload, expectedPayloadKeys] of cases) {
        const outcome = safeCall(build, VALID_ENVELOPE(), payload);
        const act = isOkAct(outcome) ? outcome.result : null;
        acts.push(act);
        if (!act) { record(name, false, outcome.threw ? `threw: ${outcome.threw.message}` : `result=${JSON.stringify(outcome.result)}`); continue; }
        const shapeOk = sortedKeys(act).join('|') === BASE_ACT_KEYS.join('|') && act.kind === kind;
        record(name, shapeOk, shapeOk ? '' : `keys=${sortedKeys(act).join('|')} kind=${act.kind}`);
        const payloadKeys = act ? sortedKeys(act.payload).join('|') : 'n/a';
        record(`${name} — payload/act key sets`, act && shapeOk
            && sortedKeys(act.payload).join('|') === expectedPayloadKeys.join('|'),
            `payloadKeys=${payloadKeys}`);
    }
    record(surfaceCaseNames[4], acts.every((act) => act && sortedKeys(act).join('|') === BASE_ACT_KEYS.join('|')),
        'envelope key set deviates');
    record(surfaceCaseNames[5], acts[0] && sortedKeys(acts[0].payload).join('|') === 'lines|request', `got=${acts[0] ? sortedKeys(acts[0].payload).join('|') : 'n/a'}`);
    record(surfaceCaseNames[6], acts[1] && sortedKeys(acts[1].payload).join('|') === 'firstVisit|lines', `got=${acts[1] ? sortedKeys(acts[1].payload).join('|') : 'n/a'}`);
    record(surfaceCaseNames[7], acts[2] && sortedKeys(acts[2].payload).join('|') === 'followup|lines', `got=${acts[2] ? sortedKeys(acts[2].payload).join('|') : 'n/a'}`);
    const nestedAct = acts.some((act) => act && JSON.stringify(act.payload).includes('"contractVersion"'));
    record(surfaceCaseNames[8], !nestedAct, 'a payload embeds a nested act structure');
    const envelope = VALID_ENVELOPE();
    const trio = [
        safeCall(createValidationAct, envelope, VALIDATION_PAYLOAD()),
        safeCall(createFirstVisitAct, envelope, FIRST_VISIT_PAYLOAD()),
        safeCall(createFollowupAct, envelope, FOLLOWUP_PAYLOAD()),
    ];
    record(surfaceCaseNames[9],
        trio.every((o) => isOkAct(o))
        && trio[0].result.kind === KINDS.validation && trio[1].result.kind === KINDS.firstVisit && trio[2].result.kind === KINDS.followup
        && trio[0].result.actId === trio[1].result.actId && trio[1].result.actId === trio[2].result.actId,
        'kinds/envelopes deviate');
    plantedSink.length = 0;
    plantedRecord('planted lie: createFollowupAct emits kind pharmacy_first_visit', trio[2].result.kind === KINDS.firstVisit, 'followup keeps its own kind (expected for the planted lie)');
    record('P1-f planted lie (followup reuses first-visit kind) is detected as false', plantedDetectedAsFalse(), plantedSummary());
}

// ---------------------------------------------------------------------------
// P2 — requested ≠ validated
// ---------------------------------------------------------------------------

function familyP2(builders, degradedDetail) {
    console.log('  P2 — validation: request-only never autovalidates, never creates a line');
    if (!builders) {
        for (const name of [
            'P2 request-only validation act: validation absent, lines stays empty',
            'P2 absent validation block means NO validation key (no null/undefined placeholder)',
            'P2 explicit validation block is preserved verbatim and detached',
            'P2 explicit validation identity does not derive dose/route/schedule/induction',
            'P2 requested treatment fields in request never leak into lines',
            'P2 explicit non-empty lines are preserved 1:1 (order and cardinality)',
            'P2 optional transversal block present-only-when-given, preserved verbatim',
        ]) record(name, false, degradedDetail);
        plantedSink.length = 0;
        plantedRecord('planted lie skipped (degraded)', false, 'degraded');
        record('P2-f planted lie (request-only becomes validated) is detected as false', plantedDetectedAsFalse(), plantedSummary());
        return;
    }
    const build = builders.createValidationAct;

    // Request-only: pending, no validation block, no lines.
    const requestOnly = VALIDATION_PAYLOAD();
    const outcomeA = safeCall(build, VALID_ENVELOPE(), requestOnly);
    const actA = isOkAct(outcomeA) ? outcomeA.result : null;
    record('P2 request-only validation act: validation absent, lines stays empty',
        !!actA && actA.payload.lines.length === 0 && !('validation' in actA.payload),
        outcomeA.threw ? `threw: ${outcomeA.threw.message}` : `payload=${JSON.stringify(actA ? actA.payload : outcomeA.result)}`);
    record('P2 absent validation block means NO validation key (no null/undefined placeholder)',
        !!actA && !('validation' in actA.payload) && !('transversal' in actA.payload),
        `hasValidation=${actA ? 'validation' in actA.payload : 'n/a'}`);
    // The request block is preserved verbatim (requested-only evidence).
    const requestCheck = actA ? isFaithfulBlock(actA.payload.request, requestOnly.request) : { pass: false, detail: 'no act' };
    record('P2 request block is preserved verbatim and detached', requestCheck.pass, requestCheck.detail);

    // Explicit validation block: preserved verbatim, detached, nothing derived.
    const validationBlock = { result: 'validated', validatedTreatment: { drugName: 'FARMACO-SINTETICO-01', doseText: 'DOSIS-EXPLICITA', route: 'VIA-EXPLICITA', scheduleCode: 'PAUTA-EXPLICITA', inductionStatus: 'no' } };
    const payloadB = { ...VALIDATION_PAYLOAD(), validation: validationBlock };
    const outcomeB = safeCall(build, VALID_ENVELOPE(), payloadB);
    const actB = isOkAct(outcomeB) ? outcomeB.result : null;
    const validationCheck = actB && actB.payload.validation ? isFaithfulBlock(actB.payload.validation, validationBlock) : { pass: false, detail: 'validation block missing or altered' };
    record('P2 explicit validation block is preserved verbatim and detached', validationCheck.pass, validationCheck.detail);
    const derivedKeys = actB && actB.payload.validation ? Object.keys(actB.payload.validation.validatedTreatment).filter((k) => !['drugName', 'doseText', 'route', 'scheduleCode', 'inductionStatus'].includes(k)) : ['n/a'];
    record('P2 explicit validation identity does not derive dose/route/schedule/induction',
        actB && actB.payload.validation && derivedKeys.length === 0 && Object.keys(actB.payload.validation).sort().join('|') === 'result|validatedTreatment',
        `derived=${derivedKeys.join(',') || 'none'}`);

    // Requested fields never leak into lines.
    const requestedHeavy = VALIDATION_PAYLOAD();
    requestedHeavy.request = { ...VALID_REQUEST_BLOCK(), requestedTreatment: { drugName: 'FARMACO-SINTETICO-02', activeIngredient: 'PA-SINTETICO', doseText: 'DOSIS-SOLICITADA', route: 'VIA-SOLICITADA', scheduleCode: 'PAUTA-SOLICITADA' } };
    const outcomeC = safeCall(build, VALID_ENVELOPE(), requestedHeavy);
    record('P2 requested treatment fields in request never leak into lines',
        isOkAct(outcomeC) && outcomeC.result.payload.lines.length === 0,
        outcomeC.threw ? `threw: ${outcomeC.threw.message}` : `lines=${JSON.stringify(outcomeC.result ? outcomeC.result.payload.lines : outcomeC.result)}`);

    // Explicit non-empty lines preserved 1:1.
    const lines = [{ lineId: 'LINEA-SYN-V1', drugName: 'FARMACO-SINTETICO-01' }, { lineId: 'LINEA-SYN-V2', drugName: 'FARMACO-SINTETICO-02' }];
    const payloadD = { ...VALIDATION_PAYLOAD(), lines };
    const outcomeD = safeCall(build, VALID_ENVELOPE(), payloadD);
    record('P2 explicit non-empty lines are preserved 1:1 (order and cardinality)',
        isOkAct(outcomeD) && outcomeD.result.payload.lines.length === 2
        && outcomeD.result.payload.lines[0].lineId === 'LINEA-SYN-V1' && outcomeD.result.payload.lines[1].lineId === 'LINEA-SYN-V2'
        && outcomeD.result.payload.lines !== lines && outcomeD.result.payload.lines[0] !== lines[0],
        outcomeD.threw ? `threw: ${outcomeD.threw.message}` : `lines=${JSON.stringify(outcomeD.result ? outcomeD.result.payload.lines : outcomeD.result)}`);

    // Optional transversal block.
    const transversal = { prebiologicRequired: 'not_recorded', clinicalObservations: [{ code: 'OBS-SYN', value: 1 }] };
    const payloadE = { ...VALIDATION_PAYLOAD(), transversal };
    const outcomeE = safeCall(build, VALID_ENVELOPE(), payloadE);
    const transversalCheck = isOkAct(outcomeE) && outcomeE.result.payload.transversal ? isFaithfulBlock(outcomeE.result.payload.transversal, transversal) : { pass: false, detail: 'transversal missing or altered' };
    record('P2 optional transversal block present-only-when-given, preserved verbatim', transversalCheck.pass, transversalCheck.detail);

    plantedSink.length = 0;
    const lieAct = actA;
    plantedRecord('planted lie: request-only autovalidates (validation block appears)', !!lieAct && 'validation' in lieAct.payload, 'validation stays absent (expected for the planted lie)');
    record('P2-f planted lie (request-only becomes validated) is detected as false', plantedDetectedAsFalse(), plantedSummary());
}

// ---------------------------------------------------------------------------
// P3 — first visit fail-closed
// ---------------------------------------------------------------------------

function familyP3(builders, degradedDetail) {
    console.log('  P3 — first visit: requested/prior data never promoted to lines');
    if (!builders) {
        for (const name of [
            'P3 first visit with lines=[] creates no line from visit/requested/prior data',
            'P3 one explicit line is preserved 1:1',
            'P3 several explicit lines are preserved in order with cardinality',
            'P3 firstVisit block is preserved verbatim and detached',
        ]) record(name, false, degradedDetail);
        plantedSink.length = 0;
        plantedRecord('planted lie skipped (degraded)', false, 'degraded');
        record('P3-f planted lie (prior treatment promoted to line) is detected as false', plantedDetectedAsFalse(), plantedSummary());
        return;
    }
    const build = builders.createFirstVisitAct;

    // Visit data containing treatment-like fields must NOT become a line.
    const visitWithTreatmentLikeData = {
        ...VALID_FIRST_VISIT_BLOCK(),
        tratamientoSolicitado: { drugName: 'FARMACO-SOLICITADO-SYN', doseText: 'DOSIS-SOLICITADA' },
        tratamientoPrevio: { drugName: 'FARMACO-PREVIO-SYN' },
    };
    const outcomeA = safeCall(build, VALID_ENVELOPE(), { firstVisit: visitWithTreatmentLikeData, lines: [] });
    record('P3 first visit with lines=[] creates no line from visit/requested/prior data',
        isOkAct(outcomeA) && outcomeA.result.payload.lines.length === 0 && !('validation' in outcomeA.result.payload) && !('request' in outcomeA.result.payload),
        outcomeA.threw ? `threw: ${outcomeA.threw.message}` : `payload=${JSON.stringify(outcomeA.result ? outcomeA.result.payload : outcomeA.result)}`);

    const line1 = { lineId: 'LINEA-SYN-PV1', drugName: 'FARMACO-SINTETICO-01', activeAtEvent: true };
    const outcomeB = safeCall(build, VALID_ENVELOPE(), { firstVisit: VALID_FIRST_VISIT_BLOCK(), lines: [line1] });
    record('P3 one explicit line is preserved 1:1',
        isOkAct(outcomeB) && outcomeB.result.payload.lines.length === 1
        && outcomeB.result.payload.lines[0] !== line1 && JSON.stringify(outcomeB.result.payload.lines[0]) === JSON.stringify(line1),
        outcomeB.threw ? `threw: ${outcomeB.threw.message}` : `lines=${JSON.stringify(outcomeB.result ? outcomeB.result.payload.lines : outcomeB.result)}`);

    const many = [
        { lineId: 'LINEA-SYN-PV1', drugName: 'FARMACO-SINTETICO-01' },
        { lineId: 'LINEA-SYN-PV2', drugName: 'FARMACO-SINTETICO-02' },
        { lineId: 'LINEA-SYN-PV3', drugName: 'FARMACO-SINTETICO-03' },
    ];
    const outcomeC = safeCall(build, VALID_ENVELOPE(), { firstVisit: VALID_FIRST_VISIT_BLOCK(), lines: many });
    record('P3 several explicit lines are preserved in order with cardinality',
        isOkAct(outcomeC) && outcomeC.result.payload.lines.length === 3
        && outcomeC.result.payload.lines.map((l) => l.lineId).join('|') === 'LINEA-SYN-PV1|LINEA-SYN-PV2|LINEA-SYN-PV3',
        outcomeC.threw ? `threw: ${outcomeC.threw.message}` : `lines=${JSON.stringify(outcomeC.result ? outcomeC.result.payload.lines.map((l) => l.lineId) : outcomeC.result)}`);

    const visit = VALID_FIRST_VISIT_BLOCK();
    const outcomeD = safeCall(build, VALID_ENVELOPE(), { firstVisit: visit, lines: [] });
    const visitCheck = isOkAct(outcomeD) ? isFaithfulBlock(outcomeD.result.payload.firstVisit, visit) : { pass: false, detail: 'no act' };
    record('P3 firstVisit block is preserved verbatim and detached', visitCheck.pass, visitCheck.detail);

    plantedSink.length = 0;
    const lieOutcome = outcomeA;
    plantedRecord('planted lie: requested treatment promoted to a line', isOkAct(lieOutcome) && lieOutcome.result.payload.lines.length > 0, 'lines stays empty (expected for the planted lie)');
    record('P3-f planted lie (prior treatment promoted to line) is detected as false', plantedDetectedAsFalse(), plantedSummary());
}

// ---------------------------------------------------------------------------
// P4 — followup multilínea, followup ≠ validación
// ---------------------------------------------------------------------------

function familyP4(builders, degradedDetail) {
    console.log('  P4 — followup: 2+ lines preserved, followup alone validates nothing');
    if (!builders) {
        for (const name of [
            'P4 followup with 2 explicit lines preserves order and cardinality',
            'P4 followup with 3 explicit lines preserves order and cardinality',
            'P4 followup-only (lines=[]) creates no validation and no line',
            'P4 followup payload never carries a validation/request block',
            'P4 followup block is preserved verbatim and detached',
        ]) record(name, false, degradedDetail);
        plantedSink.length = 0;
        plantedRecord('planted lie skipped (degraded)', false, 'degraded');
        record('P4-f planted lie (followup collapses to one line) is detected as false', plantedDetectedAsFalse(), plantedSummary());
        return;
    }
    const build = builders.createFollowupAct;

    const two = [
        { lineId: 'LINEA-SYN-SG2', drugName: 'FARMACO-SINTETICO-02' },
        { lineId: 'LINEA-SYN-SG1', drugName: 'FARMACO-SINTETICO-01' },
    ];
    const outcomeA = safeCall(build, VALID_ENVELOPE(), { followup: VALID_FOLLOWUP_BLOCK(), lines: two });
    record('P4 followup with 2 explicit lines preserves order and cardinality',
        isOkAct(outcomeA) && outcomeA.result.payload.lines.length === 2
        && outcomeA.result.payload.lines.map((l) => l.lineId).join('|') === 'LINEA-SYN-SG2|LINEA-SYN-SG1',
        outcomeA.threw ? `threw: ${outcomeA.threw.message}` : `lines=${JSON.stringify(outcomeA.result ? outcomeA.result.payload.lines.map((l) => l.lineId) : outcomeA.result)}`);

    const three = [
        { lineId: 'LINEA-SYN-SG3' }, { lineId: 'LINEA-SYN-SG1' }, { lineId: 'LINEA-SYN-SG2' },
    ];
    const outcomeB = safeCall(build, VALID_ENVELOPE(), { followup: VALID_FOLLOWUP_BLOCK(), lines: three });
    record('P4 followup with 3 explicit lines preserves order and cardinality',
        isOkAct(outcomeB) && outcomeB.result.payload.lines.length === 3
        && outcomeB.result.payload.lines.map((l) => l.lineId).join('|') === 'LINEA-SYN-SG3|LINEA-SYN-SG1|LINEA-SYN-SG2',
        outcomeB.threw ? `threw: ${outcomeB.threw.message}` : 'lines deviate');

    const outcomeC = safeCall(build, VALID_ENVELOPE(), FOLLOWUP_PAYLOAD());
    record('P4 followup-only (lines=[]) creates no validation and no line',
        isOkAct(outcomeC) && outcomeC.result.payload.lines.length === 0
        && !('validation' in outcomeC.result.payload) && !('request' in outcomeC.result.payload) && !('transversal' in outcomeC.result.payload),
        outcomeC.threw ? `threw: ${outcomeC.threw.message}` : `payload=${JSON.stringify(outcomeC.result ? outcomeC.result.payload : outcomeC.result)}`);

    record('P4 followup payload never carries a validation/request block',
        isOkAct(outcomeC) && sortedKeys(outcomeC.result.payload).join('|') === 'followup|lines',
        `keys=${isOkAct(outcomeC) ? sortedKeys(outcomeC.result.payload).join('|') : 'n/a'}`);

    const followup = VALID_FOLLOWUP_BLOCK();
    const outcomeD = safeCall(build, VALID_ENVELOPE(), { followup, lines: [] });
    const followupCheck = isOkAct(outcomeD) ? isFaithfulBlock(outcomeD.result.payload.followup, followup) : { pass: false, detail: 'no act' };
    record('P4 followup block is preserved verbatim and detached', followupCheck.pass, followupCheck.detail);

    plantedSink.length = 0;
    plantedRecord('planted lie: multilínea colapsa a una sola línea principal', isOkAct(outcomeB) && outcomeB.result.payload.lines.length === 1, 'cardinality preserved (expected for the planted lie)');
    record('P4-f planted lie (followup collapses to one line) is detected as false', plantedDetectedAsFalse(), plantedSummary());
}

// ---------------------------------------------------------------------------
// P5 — ausencia y valores falsy
// ---------------------------------------------------------------------------

function familyP5(builders, degradedDetail) {
    console.log('  P5 — absence and falsy sentinels: no collapse, no defaults');
    const caseNames = [
        'P5 sentinel block inside request is preserved (missing/null/\'\'/0/false/present-undefined)',
        "P5 '' preserved verbatim",
        "P5 'NA'/'ND' tokens preserved verbatim",
        'P5 0 preserved as number',
        'P5 false preserved as boolean',
        "P5 null preserved as null (distinct from undefined and '')",
        'P5 key-present-with-undefined stays present-with-undefined',
        'P5 missing keys stay missing (key set identical)',
        'P5 sentinel line fields are preserved verbatim in order',
        'P5 nested sentinels preserved (no defaults injected)',
    ];
    if (!builders) {
        for (const name of caseNames) record(name, false, degradedDetail);
        return;
    }
    const sentinels = SENTINEL_BLOCK();
    const payload = {
        request: { ...VALID_REQUEST_BLOCK(), sentinel: sentinels, vacio: '', cero: 0, falso: false, nulo: null, presente: undefined },
        validation: { result: 'pending', pendingReason: '', denialReason: null, total: 0, marcador: false },
        lines: SENTINEL_LINES(),
    };
    const outcome = safeCall(builders.createValidationAct, VALID_ENVELOPE(), payload);
    const act = isOkAct(outcome) ? outcome.result : null;
    record(caseNames[0], !!act, outcome.threw ? `threw: ${outcome.threw.message}` : `result=${JSON.stringify(outcome.result)}`);
    if (!act) {
        for (const name of caseNames.slice(1)) record(name, false, 'no ok act to inspect');
        return;
    }
    const s = act.payload.request.sentinel;
    record(caseNames[1], s.emptyString === '' && act.payload.request.vacio === '', `values=${JSON.stringify([s.emptyString, act.payload.request.vacio])}`);
    record(caseNames[2], s.na === 'NA' && s.nd === 'ND', `values=${JSON.stringify([s.na, s.nd])}`);
    record(caseNames[3], s.zero === 0 && typeof s.zero === 'number' && act.payload.request.cero === 0, `values=${JSON.stringify([s.zero, act.payload.request.cero])}`);
    record(caseNames[4], s.falseValue === false && typeof s.falseValue === 'boolean' && act.payload.request.falso === false, `values=${JSON.stringify([s.falseValue, act.payload.request.falso])}`);
    record(caseNames[5], s.nullValue === null && act.payload.request.nulo === null && act.payload.validation.denialReason === null, 'null deviates');
    record(caseNames[6], 'presentUndefined' in s && s.presentUndefined === undefined && 'presente' in act.payload.request && act.payload.request.presente === undefined && payload.lines.every((_, i) => 'presente' in act.payload.lines[i] && act.payload.lines[i].presente === undefined), 'present-undefined collapsed');
    record(caseNames[7],
        sortedKeys(s).join('|') === sortedKeys(sentinels).join('|')
        && sortedKeys(act.payload.validation).join('|') === sortedKeys(payload.validation).join('|')
        && sortedKeys(act.payload.request).join('|') === sortedKeys(payload.request).join('|'),
        `keys=${sortedKeys(s).join('|')}`);
    const lineOk = act.payload.lines.length === 2
        && act.payload.lines[0].estado === '' && act.payload.lines[0].activo === false && act.payload.lines[0].peso === 0 && act.payload.lines[0].previo === null
        && act.payload.lines[1].estado === 'NA' && act.payload.lines[1].previo === 'ND';
    record(caseNames[8], lineOk, `lines=${JSON.stringify(act.payload.lines)}`);
    const nestedOk = s.nested.hta === 'NA' && s.nested.inner.cero === 0 && s.nested.inner.flag === false && s.nested.inner.ndToken === 'ND'
        && Array.isArray(s.nested.counts) && s.nested.counts.length === 5 && s.nested.counts[0] === 0 && s.nested.counts[2] === '' && s.nested.counts[4] === null
        && act.payload.lines[0].anidado.cero === 0 && act.payload.lines[0].anidado.vacio === '';
    record(caseNames[9], nestedOk, `nested=${JSON.stringify(s.nested)}`);
    plantedSink.length = 0;
    plantedRecord("planted lie: '' collapses to 'ND'", s.emptyString === 'ND', "'' is preserved (expected for the planted lie)");
    record('P5-f planted lie (sentinel collapse) is detected as false', plantedDetectedAsFalse(), plantedSummary());
}

// ---------------------------------------------------------------------------
// P6 — no mutación / inmutabilidad posterior
// ---------------------------------------------------------------------------

function familyP6(builders, degradedDetail) {
    console.log('  P6 — no mutation: inputs untouched, act detached in both directions');
    const caseNames = [
        'P6 ok act created from the P6 request',
        'P6 inputs are deep-identical after creation (JSON snapshot + references)',
        'P6 act payload blocks/lines are new detached references',
        'P6 mutating the returned act does not affect the inputs',
        'P6 mutating the inputs after creation does not affect the returned act',
    ];
    if (!builders) {
        for (const name of caseNames) record(name, false, degradedDetail);
        return;
    }
    const envelope = VALID_ENVELOPE();
    const request = { ...VALID_REQUEST_BLOCK(), lineasSolicitadas: [{ drugName: 'FARMACO-SOLICITADO-SYN' }] };
    const validation = { result: 'validated', validatedTreatment: { drugName: 'FARMACO-SINTETICO-01' } };
    const transversal = { prebiologicRequired: 'not_recorded' };
    const lines = [{ lineId: 'LINEA-SYN-1', drugName: 'FARMACO-SINTETICO-01' }, { lineId: 'LINEA-SYN-2', drugName: 'FARMACO-SINTETICO-02' }];
    const payload = { request, validation, transversal, lines };
    const inputSnapshot = JSON.stringify({ envelope, payload });
    const refs = { envelope, request, validation, transversal, lines, line0: lines[0] };
    const outcome = safeCall(builders.createValidationAct, envelope, payload);
    const act = isOkAct(outcome) ? outcome.result : null;
    record(caseNames[0], !!act, outcome.threw ? `threw: ${outcome.threw.message}` : `result=${JSON.stringify(outcome.result)}`);
    if (!act) {
        for (const name of caseNames.slice(1)) record(name, false, 'no ok act to verify');
        return;
    }
    record(caseNames[1],
        JSON.stringify({ envelope, payload }) === inputSnapshot
        && refs.envelope === envelope && refs.request === request && refs.validation === validation
        && refs.transversal === transversal && refs.lines === lines && refs.line0 === lines[0]
        && Object.keys(payload).length === 4 && lines.length === 2,
        'inputs changed');
    record(caseNames[2],
        act.payload.request !== request && act.payload.validation !== validation && act.payload.transversal !== transversal
        && act.payload.lines !== lines && act.payload.lines[0] !== lines[0]
        && act.payload.request.lineasSolicitadas !== request.lineasSolicitadas
        && act.provenance !== envelope.provenance,
        'act shares references with inputs');
    const inputSnapshotAtCreate = JSON.stringify({ envelope, payload });
    const mutationOnAct = attemptMutation(() => {
        act.payload.lines.push({ lineId: 'LINEA-SYN-3' });
        act.payload.lines.shift();
        act.payload.request.lineasSolicitadas.push({ drugName: 'FUGA-SINTETICA' });
        act.payload.validation.result = 'pending';
        act.payload.transversal.prebiologicRequired = 'yes';
        act.payload.extra = 'mutado';
        act.actId = 'SYN-HACKED';
        act.kind = 'pharmacy_first_visit';
    });
    record(caseNames[3],
        JSON.stringify({ envelope, payload }) === inputSnapshotAtCreate
        && refs.lines.length === 2 && refs.lines[0].lineId === 'LINEA-SYN-1'
        && request.lineasSolicitadas.length === 1 && !('extra' in request)
        && validation.result === 'validated' && transversal.prebiologicRequired === 'not_recorded'
        && envelope.actId === 'ACT-SYN-0001',
        `actMutation=${mutationOnAct}`);
    const actBaseline = JSON.stringify(act.payload);
    const actScalarBaseline = { actId: act.actId, kind: act.kind, contractVersion: act.contractVersion };
    const mutationOnInputs = attemptMutation(() => {
        lines.push({ lineId: 'LINEA-SYN-DESPUES' });
        lines.shift();
        request.justification = 'CAMBIADA-DESPUES';
        validation.result = 'pending';
        transversal.prebiologicRequired = 'yes';
        envelope.actId = 'SYN-CAMBIADO';
        envelope.revision = 9;
    });
    record(caseNames[4],
        JSON.stringify(act.payload) === actBaseline
        && act.actId === actScalarBaseline.actId && act.kind === actScalarBaseline.kind
        && act.contractVersion === actScalarBaseline.contractVersion,
        `inputMutation=${mutationOnInputs}`);
    plantedSink.length = 0;
    plantedRecord('planted lie: caller mutation reaches the act', JSON.stringify(act.payload) !== actBaseline, 'act is stable (expected for the planted lie)');
    record('P6-f planted lie (post-creation mutation reaches the act) is detected as false', plantedDetectedAsFalse(), plantedSummary());
}

// ---------------------------------------------------------------------------
// P7 — independencia de transporte
// ---------------------------------------------------------------------------

const P7_FORBIDDEN_SUBSTRINGS = [
    ['FarmaciaExportV2', 'Export v2 core/adapter module'],
    ['ROW_COLUMNS', 'transport row column constant'],
    ['ROW_SCHEMA', 'transport row schema constant'],
    ['row_id', 'transport row identifier'],
    ['row_index', 'transport row index'],
    ['row_count', 'transport row count'],
    ['row_role', 'transport row role'],
    ['rowKey', 'transport row key'],
    ['bridge_', 'bridge transport metadata'],
    ['first_visit_adapter', 'first visit adapter module'],
    ['validation_adapter', 'validation adapter module'],
    ['active_lines_adapter', 'followup adapter module'],
    ['HubTools.export', 'transport export namespace'],
    ['HubTools.data', 'data namespace (must not read patient state)'],
    ['FarmaciaPautasCatalog', 'catalog dependency'],
];

const P7_FORBIDDEN_PATTERNS = [
    [/\bTSV\b/i, 'TSV transport'],
    [/clipboard/i, 'clipboard transport'],
    [/\bexcel\b/i, 'Excel transport'],
    [/\bworksheet\b/i, 'worksheet transport'],
    [/serialize/i, 'transport serialization'],
    [/projectEventRows/, 'transport row projection'],
    [/\bcreateRow\b/, 'transport row creation'],
    [/\bcommit\s*\(/, 'public commit(event) surface'],
    [/\bDate\s*\.\s*now\b/, 'automatic timestamp generation'],
    [/new\s+Date\s*\(/, 'automatic timestamp generation'],
    [/\bMath\s*\.\s*random\b/, 'randomness (non-deterministic metadata)'],
    [/\blocalStorage\b/, 'browser storage'],
    [/\bsessionStorage\b/, 'browser storage'],
    [/\bdocument\b/, 'DOM access'],
    [/\bgetElementById\b/, 'DOM access'],
    [/\bimport\s*[\{('"]/, 'ESM import statement'],
    [/(^|\n)\s*import\s/, 'ESM import statement'],
    [/\brequire\s*\(/, 'CommonJS require'],
];

function familyP7(loadOutcome, degradedDetail) {
    console.log('  P7 — transport independence: static + behavioral, delegation on T1');
    const staticNames = [
        'P7 module under test exists and is readable',
        ...P7_FORBIDDEN_SUBSTRINGS.map(([token]) => `P7 source contains no '${token}'`),
        ...P7_FORBIDDEN_PATTERNS.map(([, why]) => `P7 source contains no ${why} pattern`),
    ];
    if (!loadOutcome || !loadOutcome.moduleSource) {
        record(staticNames[0], false, degradedDetail);
        for (const name of staticNames.slice(1)) record(name, false, 'module under test unavailable');
        for (const name of [
            'P7 module attaches HubTools.farmaciaActPayloads in the sandbox (T1 contract preloaded)',
            'P7 module attaches ONLY HubTools.farmaciaActPayloads (no new namespaces)',
            'P7 module refuses to attach when the T1 contract is absent (delegation, not reimplementation)',
            'P7 HubTools.export stays empty after loading the payloads module',
            'P7 creating acts never calls Date.now() or new Date() (instrumented clock)',
        ]) record(name, false, 'module under test unavailable');
        return;
    }
    record(staticNames[0], true, `${loadOutcome.moduleSource.length} chars`);
    let i = 1;
    for (const [token] of P7_FORBIDDEN_SUBSTRINGS) {
        record(staticNames[i++], !loadOutcome.moduleSource.includes(token), `occurrences=${loadOutcome.moduleSource.split(token).length - 1}`);
    }
    for (const [pattern, why] of P7_FORBIDDEN_PATTERNS) {
        const match = loadOutcome.moduleSource.match(pattern);
        record(staticNames[i++], !match, match ? `matched '${match[0].replace(/\n/g, '\\n')}' (${why})` : 'no match');
    }
    const surface = loadOutcome.surface;
    record('P7 module attaches HubTools.farmaciaActPayloads in the sandbox (T1 contract preloaded)',
        !!surface && typeof surface.createValidationAct === 'function' && typeof surface.createFirstVisitAct === 'function' && typeof surface.createFollowupAct === 'function',
        'payload surface missing');
    const expectedNamespaces = new Set(['utils', 'scores', 'homunculus', 'data', 'normalizer', 'export', 'form', 'catalog', 'prebiologic', 'ui', 'pharmacy', 'events', 'dashboard', 'farmaciaActContract', 'farmaciaActPayloads']);
    const unexpected = Object.keys(loadOutcome.sandbox.HubTools).filter((k) => !expectedNamespaces.has(k));
    record('P7 module attaches ONLY HubTools.farmaciaActPayloads (no new namespaces)',
        loadOutcome.sandbox.HubTools.farmaciaExportV2Core === undefined && unexpected.length === 0,
        `unexpected=${unexpected.join(',') || 'none'}`);
    let withoutContract;
    try {
        withoutContract = loadPayloads({ withoutContract: true });
    } catch (err) {
        withoutContract = { attachError: err.message };
    }
    record('P7 module refuses to attach when the T1 contract is absent (delegation, not reimplementation)',
        !!withoutContract.sandbox && !withoutContract.sandbox.HubTools.farmaciaActPayloads,
        withoutContract.attachError ? `load threw: ${withoutContract.attachError}` : `attached=${!!(withoutContract.sandbox && withoutContract.sandbox.HubTools.farmaciaActPayloads)}`);
    record('P7 HubTools.export stays empty after loading the payloads module',
        !!loadOutcome.sandbox.HubTools.export && typeof loadOutcome.sandbox.HubTools.export === 'object' && Object.keys(loadOutcome.sandbox.HubTools.export).length === 0,
        `HubTools.export keys=${loadOutcome.sandbox.HubTools.export ? Object.keys(loadOutcome.sandbox.HubTools.export).join(',') : 'n/a'}`);
    let clockCalls = -1;
    try {
        const instrumented = loadPayloads({ instrumentClock: true });
        const build = instrumented.surface.createValidationAct;
        const o1 = safeCall(build, VALID_ENVELOPE(), { ...VALIDATION_PAYLOAD(), validation: { result: 'pending' } });
        const o2 = safeCall(instrumented.surface.createFirstVisitAct, VALID_ENVELOPE(), { firstVisit: VALID_FIRST_VISIT_BLOCK(), lines: SENTINEL_LINES() });
        const o3 = safeCall(instrumented.surface.createFollowupAct, VALID_ENVELOPE(), { followup: VALID_FOLLOWUP_BLOCK(), lines: SENTINEL_LINES() });
        clockCalls = instrumented.clock.nowCalls + instrumented.clock.ctorCalls;
        record('P7 creating acts never calls Date.now() or new Date() (instrumented clock)',
            isOkAct(o1) && isOkAct(o2) && isOkAct(o3) && clockCalls === 0,
            `clockCalls=${clockCalls}`);
    } catch (err) {
        record('P7 creating acts never calls Date.now() or new Date() (instrumented clock)', false, `instrumented load failed: ${err.message}`);
    }
    plantedSink.length = 0;
    plantedRecord('planted lie: payloads source references the transport layer', loadOutcome.moduleSource.includes('ROW_COLUMNS'), 'source is clean (expected for the planted lie)');
    record('P7-f planted lie (transport reference) is detected as false', plantedDetectedAsFalse(), plantedSummary());
}

// ---------------------------------------------------------------------------
// F — fail-closed envelope/payload/lines
// ---------------------------------------------------------------------------

function familyF(builders, degradedDetail) {
    console.log('  F — fail-closed: invalid envelope/payload/blocks/lines never fabricate an act');
    const build = builders ? builders.createValidationAct : null;
    const buildFV = builders ? builders.createFirstVisitAct : null;
    const buildFU = builders ? builders.createFollowupAct : null;
    const cases = [];
    const add = (name, fn, code) => cases.push({ name, fn, code });

    // Envelope.
    for (const [label, badEnvelope] of [
        ['missing', undefined], ['null', null], ['string', 'envelope'], ['number', 7], ['array', []],
    ]) {
        add(`F envelope=${label} (${describeValue(badEnvelope)}) fails closed with INVALID_ENVELOPE`, () => build(badEnvelope, VALIDATION_PAYLOAD()), 'INVALID_ENVELOPE');
    }
    add('F envelope carrying kind fails closed (kind is owned by the builder)', () => build({ ...VALID_ENVELOPE(), kind: 'pharmacy_followup' }, VALIDATION_PAYLOAD()), 'KIND_OWNED_BY_BUILDER');
    add('F envelope carrying kind=undefined fails closed (key present)', () => build({ ...VALID_ENVELOPE(), kind: undefined }, VALIDATION_PAYLOAD()), 'KIND_OWNED_BY_BUILDER');
    add('F envelope carrying payload fails closed (payload is owned by the builder)', () => build({ ...VALID_ENVELOPE(), payload: {} }, VALIDATION_PAYLOAD()), 'PAYLOAD_OWNED_BY_BUILDER');
    add('F envelope with unknown key fails closed', () => build({ ...VALID_ENVELOPE(), row_role: 'validation' }, VALIDATION_PAYLOAD()), 'UNKNOWN_ENVELOPE_KEY');

    // Payload object.
    for (const [label, badPayload] of [
        ['missing', undefined], ['null', null], ['string', 'payload'], ['number', 0], ['array', []], ['array with entries', ['x']],
    ]) {
        add(`F payload=${label} (${describeValue(badPayload)}) fails closed with INVALID_PAYLOAD`, () => build(VALID_ENVELOPE(), badPayload), 'INVALID_PAYLOAD');
    }

    // Unknown payload keys per use case (structure freeze).
    add('F validation payload with unknown key fails closed', () => build(VALID_ENVELOPE(), { ...VALIDATION_PAYLOAD(), validatedTreatment: {} }), 'UNKNOWN_PAYLOAD_KEY');
    add('F first visit payload with unknown key (request) fails closed', () => buildFV(VALID_ENVELOPE(), { ...FIRST_VISIT_PAYLOAD(), request: {} }), 'UNKNOWN_PAYLOAD_KEY');
    add('F first visit payload with unknown key (validation) fails closed', () => buildFV(VALID_ENVELOPE(), { ...FIRST_VISIT_PAYLOAD(), validation: { result: 'validated' } }), 'UNKNOWN_PAYLOAD_KEY');
    add('F followup payload with unknown key (transversal) fails closed', () => buildFU(VALID_ENVELOPE(), { ...FOLLOWUP_PAYLOAD(), transversal: {} }), 'UNKNOWN_PAYLOAD_KEY');
    add('F followup payload with unknown key (validation) fails closed', () => buildFU(VALID_ENVELOPE(), { ...FOLLOWUP_PAYLOAD(), validation: { result: 'validated' } }), 'UNKNOWN_PAYLOAD_KEY');

    // Required blocks.
    add('F validation payload without request fails closed (MISSING_BLOCK)', () => build(VALID_ENVELOPE(), { lines: [] }), 'MISSING_BLOCK');
    add('F first visit payload without firstVisit fails closed (MISSING_BLOCK)', () => buildFV(VALID_ENVELOPE(), { lines: [] }), 'MISSING_BLOCK');
    add('F followup payload without followup fails closed (MISSING_BLOCK)', () => buildFU(VALID_ENVELOPE(), { lines: [] }), 'MISSING_BLOCK');

    // Optional blocks present but invalid.
    for (const [label, badBlock] of [['null', null], ['array', []], ['string', 'x'], ['number', 1], ['undefined', undefined]]) {
        add(`F validation block=${label} fails closed (INVALID_BLOCK)`, () => build(VALID_ENVELOPE(), { ...VALIDATION_PAYLOAD(), validation: badBlock }), 'INVALID_BLOCK');
    }
    for (const [label, badBlock] of [['null', null], ['array', []], ['string', 'x']]) {
        add(`F transversal block=${label} fails closed (INVALID_BLOCK)`, () => build(VALID_ENVELOPE(), { ...VALIDATION_PAYLOAD(), transversal: badBlock }), 'INVALID_BLOCK');
    }
    add('F firstVisit block=null fails closed (INVALID_BLOCK)', () => buildFV(VALID_ENVELOPE(), { firstVisit: null, lines: [] }), 'INVALID_BLOCK');
    add('F followup block=array fails closed (INVALID_BLOCK)', () => buildFU(VALID_ENVELOPE(), { followup: [], lines: [] }), 'INVALID_BLOCK');

    // Lines.
    for (const [label, badLines, code] of [
        ['missing', undefined, 'INVALID_LINES'],
        ['null', null, 'INVALID_LINES'],
        ['object', {}, 'INVALID_LINES'],
        ['string', 'lines', 'INVALID_LINES'],
        ['array with string element', ['LINEA-SYN'], 'INVALID_LINE_ELEMENT'],
        ['array with number element', [1], 'INVALID_LINE_ELEMENT'],
        ['array with null element', [null], 'INVALID_LINE_ELEMENT'],
        ['array with array element', [[]], 'INVALID_LINE_ELEMENT'],
        ['array with undefined element', [undefined], 'INVALID_LINE_ELEMENT'],
    ]) {
        add(`F lines=${label} (${describeValue(badLines)}) fails closed (${code})`, () => build(VALID_ENVELOPE(), { ...VALIDATION_PAYLOAD(), lines: badLines }), code);
    }
    add('F lines=[] is VALID (explicit empty array, distinct from absent)', () => build(VALID_ENVELOPE(), VALIDATION_PAYLOAD()), 'OK');

    // T1 delegation passes through.
    add('F invalid T1 envelope field (empty actId) propagates the T1 structured failure', () => build({ ...VALID_ENVELOPE(), actId: '' }, VALIDATION_PAYLOAD()), 'INVALID_ACT_ID');
    add('F invalid T1 envelope field (revision 0) propagates the T1 structured failure', () => build({ ...VALID_ENVELOPE(), revision: 0 }, VALIDATION_PAYLOAD()), 'INVALID_REVISION');

    for (const { name, fn, code } of cases) {
        if (!build) { record(name, false, degradedDetail); continue; }
        const outcome = safeCall(fn);
        const pass = code === 'OK' ? isOkAct(outcome) : isFailureWithCode(outcome, code);
        record(name, pass, outcome.threw
            ? `threw instead of structured failure: ${outcome.threw.message}`
            : `result=${JSON.stringify(outcome.result).slice(0, 220)}`);
    }

    if (build) {
        const outcome = safeCall(build, VALID_ENVELOPE(), { lines: [] });
        plantedSink.length = 0;
        plantedRecord('planted lie: payload without request is accepted', isOkAct(outcome), 'missing block is rejected (expected for the planted lie)');
        record('F-f planted lie (payload without required block accepted) is detected as false', plantedDetectedAsFalse(), plantedSummary());
    } else {
        record('F-f planted lie (payload without required block accepted) is detected as false', false, degradedDetail);
    }
}

// ---------------------------------------------------------------------------
// P8 — explicit-own blocks/lines/envelope authority (correction cycle PR #490)
// ---------------------------------------------------------------------------

// Temporarily defines an own enumerable-invisible property on
// Object.prototype so a canonical-plain input inherits it through the
// prototype chain; restores the previous descriptor afterwards. This is the
// only way a canonical-plain object can carry an inherited block/line/metadata
// key: custom caller prototypes are rejected outright by the hardened
// isPlainObject, so inherited keys can only arrive from Object.prototype.
function withTaintedObjectProto(taints, fn) {
    const saved = [];
    for (const [key, value] of Object.entries(taints)) {
        saved.push([key, Object.getOwnPropertyDescriptor(Object.prototype, key)]);
        Object.defineProperty(Object.prototype, key, { value, writable: true, configurable: true, enumerable: false });
    }
    try {
        return fn();
    } finally {
        for (const [key, desc] of saved.reverse()) {
            if (desc) Object.defineProperty(Object.prototype, key, desc);
            else delete Object.prototype[key];
        }
    }
}

function familyP8(builders, degradedDetail) {
    console.log('  P8 — explicit-own authority: inherited blocks/lines/metadata never satisfy explicitness; builder authority survives tainted prototypes');
    const caseNames = [
        'P8 required request block inherited via Object.prototype does NOT satisfy MISSING_BLOCK (still MISSING_BLOCK)',
        'P8 lines inherited via Object.prototype does NOT satisfy the explicit lines requirement (INVALID_LINES)',
        'P8 optional validation/transversal inherited via Object.prototype never appear in the act payload',
        'P8 envelope metadata inherited via Object.prototype is never copied into the request (no amendment; inherited siteId not explicit)',
        'P8 kind/payload inherited via Object.prototype cannot alter the builder authority (act keeps the builder kind/payload)',
        'P8 payload/blocks/line elements with a custom (shared) caller prototype fail closed (INVALID_PAYLOAD / INVALID_BLOCK / INVALID_LINE_ELEMENT)',
        'P8 null-prototype envelope/blocks/line elements remain supported and cloned detached',
    ];
    if (!builders) {
        for (const name of caseNames) record(name, false, degradedDetail);
        plantedSink.length = 0;
        plantedRecord('planted lie: inherited lines accepted (degraded)', false, 'degraded');
        record('P8-f planted lie (inherited lines accepted) is detected as false', plantedDetectedAsFalse(), plantedSummary());
        return;
    }
    const build = builders.createValidationAct;

    // (1) Inherited required block: with 'request' reachable only through
    // Object.prototype, the payload { lines: [] } must still fail with
    // MISSING_BLOCK — inheritance never satisfies explicitness.
    const inheritedBlock = withTaintedObjectProto({ request: VALID_REQUEST_BLOCK() },
        () => safeCall(build, VALID_ENVELOPE(), { lines: [] }));
    const inheritedBlockCase = isFailureWithCode(inheritedBlock, 'MISSING_BLOCK');
    record(caseNames[0], inheritedBlockCase,
        inheritedBlock.threw ? `threw: ${inheritedBlock.threw.message}` : `result=${JSON.stringify(inheritedBlock.result).slice(0, 160)}`);

    // (2) Inherited lines: an inherited array must NOT satisfy the explicit
    // 'lines' requirement.
    const inheritedLines = withTaintedObjectProto({ lines: [] },
        () => safeCall(build, VALID_ENVELOPE(), { request: VALID_REQUEST_BLOCK() }));
    const inheritedLinesCase = isFailureWithCode(inheritedLines, 'INVALID_LINES');
    record(caseNames[1], inheritedLinesCase,
        inheritedLines.threw ? `threw: ${inheritedLines.threw.message}` : `result=${JSON.stringify(inheritedLines.result).slice(0, 160)}`);

    // (3) Optional blocks inherited through Object.prototype must never be
    // copied into the act payload: absence stays absence.
    const inheritedOptionals = withTaintedObjectProto(
        { validation: { result: 'validated-heredado-sintetico' }, transversal: { dato: 'heredado-sintetico' } },
        () => safeCall(build, VALID_ENVELOPE(), { request: VALID_REQUEST_BLOCK(), lines: [] }));
    const optionalAct = isOkAct(inheritedOptionals) ? inheritedOptionals.result : null;
    record(caseNames[2],
        !!optionalAct
        && Object.keys(optionalAct.payload).sort().join('|') === 'lines|request'
        && !('validation' in optionalAct.payload) && !('transversal' in optionalAct.payload)
        && optionalAct.payload.validation === undefined && optionalAct.payload.transversal === undefined,
        inheritedOptionals.threw ? `threw: ${inheritedOptionals.threw.message}` : `keys=${optionalAct ? Object.keys(optionalAct.payload).join(',') : 'n/a'}`);

    // (4) Envelope metadata inherited through Object.prototype is never
    // copied into the assembled request: an inherited amendment must not
    // appear in the act, and an inherited siteId must not satisfy T1.
    const inheritedAmendment = withTaintedObjectProto(
        { amendment: { previousRevision: 1, reason: 'enmienda-heredada-sintetica' } },
        () => safeCall(build, VALID_ENVELOPE(), VALIDATION_PAYLOAD()));
    const amendmentAct = isOkAct(inheritedAmendment) ? inheritedAmendment.result : null;
    const amendmentCase = !!amendmentAct && !('amendment' in amendmentAct);
    // Envelope missing ONLY siteId as an own property: with a tainted
    // Object.prototype carrying siteId, an `in`-based copy would leak the
    // inherited value into the request and create an ok act; own-based
    // copying must still propagate T1's INVALID_SITE_ID.
    const envelopeNoSiteId = { ...VALID_ENVELOPE() };
    delete envelopeNoSiteId.siteId;
    const inheritedSiteId = withTaintedObjectProto({ siteId: 'SITE-HEREDADO-SYN' },
        () => safeCall(build, envelopeNoSiteId, VALIDATION_PAYLOAD()));
    const siteIdCase = isFailureWithCode(inheritedSiteId, 'INVALID_SITE_ID');
    record(caseNames[3], amendmentCase && siteIdCase,
        `amendment=${amendmentCase ? 'absent' : 'leaked'} siteId=${siteIdCase ? 'rejected' : 'accepted'}`);

    // (5) Builder authority: inherited kind/payload cannot alter the act —
    // the builder fixes its own kind and assembles its own payload.
    const taintedAuthority = withTaintedObjectProto(
        { kind: 'pharmacy_first_visit', payload: { smuggled: 'SYN-HEREDADO' } },
        () => safeCall(build, VALID_ENVELOPE(), VALIDATION_PAYLOAD()));
    const authorityAct = isOkAct(taintedAuthority) ? taintedAuthority.result : null;
    record(caseNames[4],
        !!authorityAct
        && authorityAct.kind === 'pharmacy_validation'
        && Object.keys(authorityAct.payload).sort().join('|') === 'lines|request'
        && authorityAct.payload.smuggled === undefined
        && JSON.stringify(authorityAct.payload) === JSON.stringify({ request: VALID_REQUEST_BLOCK(), lines: [] }),
        taintedAuthority.threw ? `threw: ${taintedAuthority.threw.message}` : `kind=${authorityAct ? authorityAct.kind : 'n/a'}`);

    // (6) Custom caller prototypes on payload/blocks/line elements fail
    // closed outright — no shared mutable prototype can enter the act.
    const sharedProto = { extra: 'MUTABLE-SINTETICO' };
    const customPayload = Object.create(sharedProto);
    customPayload.request = VALID_REQUEST_BLOCK();
    customPayload.lines = [];
    const customPayloadCase = isFailureWithCode(safeCall(build, VALID_ENVELOPE(), customPayload), 'INVALID_PAYLOAD');
    const customBlockCase = isFailureWithCode(safeCall(build, VALID_ENVELOPE(), { request: Object.create(sharedProto), lines: [] }), 'INVALID_BLOCK');
    const customLineCase = isFailureWithCode(safeCall(build, VALID_ENVELOPE(), { request: VALID_REQUEST_BLOCK(), lines: [Object.create(sharedProto)] }), 'INVALID_LINE_ELEMENT');
    record(caseNames[5], customPayloadCase && customBlockCase && customLineCase,
        `payload=${customPayloadCase ? 'rejected' : 'accepted'} block=${customBlockCase ? 'rejected' : 'accepted'} line=${customLineCase ? 'rejected' : 'accepted'}`);

    // (7) Null-prototype envelope/blocks/line elements remain first-class
    // supported inputs, cloned detached (null prototype preserved on copies).
    const nullEnvelope = Object.create(null);
    Object.assign(nullEnvelope, VALID_ENVELOPE());
    const nullBlock = Object.create(null);
    Object.assign(nullBlock, VALID_REQUEST_BLOCK());
    const nullLine = Object.create(null);
    nullLine.lineId = 'LINEA-SYN-NULL-PROTO';
    const nullOutcome = safeCall(build, nullEnvelope, { request: nullBlock, lines: [nullLine] });
    const nullAct = isOkAct(nullOutcome) ? nullOutcome.result : null;
    record(caseNames[6],
        !!nullAct
        && Object.getPrototypeOf(nullAct.payload.request) === null
        && Object.getPrototypeOf(nullAct.payload.lines[0]) === null
        && nullAct.payload.request !== nullBlock && nullAct.payload.lines[0] !== nullLine
        && nullAct.payload.lines.length === 1 && nullAct.payload.lines[0].lineId === 'LINEA-SYN-NULL-PROTO',
        nullOutcome.threw ? `threw: ${nullOutcome.threw.message}` : `result=${JSON.stringify(nullOutcome.result).slice(0, 160)}`);

    // Planted lie: an inherited lines array must never satisfy the explicit
    // lines requirement.
    plantedSink.length = 0;
    plantedRecord('planted lie: inherited lines array satisfies the explicit lines requirement',
        isOkAct(inheritedLines),
        'inherited lines are rejected (expected for the planted lie)');
    record('P8-f planted lie (inherited lines accepted) is detected as false', plantedDetectedAsFalse(), plantedSummary());
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
    console.log('Pharmacy Act v1 independent payloads oracle (WO-NEXUS-FARMACIA-F4.4B, #489, 100% synthetic data)');

    let loadOutcome = null;
    let degradedDetail = '';
    try {
        loadOutcome = loadPayloads();
        if (loadOutcome.error) throw new Error(loadOutcome.error);
        if (!loadOutcome.surface || typeof loadOutcome.surface.createValidationAct !== 'function') {
            throw new Error('module loaded but HubTools.farmaciaActPayloads builders are not functions');
        }
    } catch (err) {
        degradedDetail = `module under test unavailable: ${err.message}`;
        console.log(`  [FAIL] LOAD ${PAYLOADS_MODULE} loads in the vm sandbox and exposes the three builders -> ${degradedDetail}`);
        results.push({ name: 'LOAD', pass: false });
        loadOutcome = null;
    }

    const builders = loadOutcome ? loadOutcome.surface : null;
    familyP1(builders, degradedDetail);
    familyP2(builders, degradedDetail);
    familyP3(builders, degradedDetail);
    familyP4(builders, degradedDetail);
    familyP5(builders, degradedDetail);
    familyP6(builders, degradedDetail);
    familyP7(loadOutcome, degradedDetail);
    familyF(builders, degradedDetail);
    familyP8(builders, degradedDetail);

    const failed = results.filter((r) => !r.pass).length;
    console.log('');
    console.log(`RESULTADO: ${results.length - failed} OK / ${failed} FALLIDO`);
    if (failed > 0) {
        console.error('Farmacia act payloads check FAILED');
        process.exit(1);
    }
    console.log('Farmacia act payloads check PASSED');
}

main();
