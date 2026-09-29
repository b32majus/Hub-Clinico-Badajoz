#!/usr/bin/env node
'use strict';
/**
 * FROZEN PRINCIPAL ACCEPTANCE ORACLE — Reuma Visit Act v1 contract
 * WO-NEXUS-REUMA-F5.4A / issue #462 (parent train #461)
 * =====================================================================
 *
 * Authority basis (frozen before the implementation context received write
 * authority; this oracle may disagree with the implementation):
 *   - Issue #462 (WO-NEXUS-REUMA-F5.4A) — binding contract authority for the
 *     future surface `HubTools.reumaActContract.createVisitAct({ kind,
 *     patientRef, pathology, payload })` in `modules/reuma_act_contract.js`.
 *   - ADR-005 (clinical write contracts): caso de uso por intención
 *     profesional; envelope técnico mínimo; el payload pertenece al dominio;
 *     la fila 152/497 es proyección posterior, no dominio.
 *   - ADR-006 (persistence adapters): la UI/casos de uso no conocen hojas
 *     Excel, columnas ni portapapeles.
 *   - CODING_STANDARDS §7 (verification must be able to disagree), §8 (fail
 *     explicitly; UNKNOWN is not SUCCESS), §12 (preserve explicit clinical
 *     meaning; never turn absence into a default), §13 (no hidden
 *     normalization, only authorized normalizations).
 *   - `docs/engineering/REUMA_EXPORT_KNOWN_LEGACY.md` — read-only context.
 *     Nothing from KNOWN_LEGACY is canonized or corrected by this oracle.
 *
 * The module under test (`modules/reuma_act_contract.js`) is loaded UNMODIFIED
 * inside a Node `vm` sandbox with the browser globals the repository modules
 * expect (same convention as `tools/reuma_export_harness.mjs`), with ONLY
 * `modules/hubTools.js` preloaded as the `window.HubTools` namespace host.
 * The legacy export manager is deliberately NOT loaded: the contract must be
 * independent of it.
 *
 * FROZEN DECISION LOG (each place #462 was silent, the most fail-closed
 * interpretation was chosen; derivable from #462 + §8/§12/§13):
 *
 *   D1 `kind` matching is EXACT-TOKEN: only the strings 'primera_visita' and
 *      'seguimiento'. No trimming, no case folding, no underscore/space
 *      normalization, no aliases or synonyms (e.g. 'inicial', 'primera',
 *      'PRIMERA_VISITA', 'primera visita', 'seguimiento ' all fail). §13
 *      forbids hidden normalization; #462 says "admits EXACTLY".
 *
 *   D2 `pathology` matching is EXACT-TOKEN: only 'espa' | 'aps' | 'ar' |
 *      'les' | 'sjogren', as an explicit independent attribute. No
 *      normalization: 'ESPA', 'Espa', 'ar ', 'esp', 'espa1' all fail.
 *      Non-strings (number, boolean, null, array, object, missing) fail.
 *      No heuristic mapping of any kind.
 *
 *   D3 `patientRef` must be a value of type `string` containing at least one
 *      non-whitespace character. Empty, missing, whitespace-only and
 *      non-string values fail closed. It is never inferred from name,
 *      fármaco, historial or position; it is echoed verbatim.
 *
 *   D4 `payload` must be a value with `typeof === 'object'`, non-null and
 *      non-array. Missing, null, arrays, strings, numbers, booleans and
 *      functions fail closed. Any non-array object shape is accepted; the
 *      contract imposes no schema on payload CONTENT (payload belongs to the
 *      domain, ADR-005) and invents no clinical meaning.
 *
 *   D5 Sentinel preservation is strict: a key explicitly present with value
 *      `undefined` must REMAIN present-with-undefined in the act payload
 *      (distinguishable from a genuinely missing key via `in`/Object.keys);
 *      `''`, `'NA'`, `'ND'`, `0`, `false` and `null` are preserved verbatim
 *      with their types; nested objects and arrays are deep-copied with no
 *      key dropped and no sentinel collapsed. Rationale: #462 forbids
 *      collapsing undefined/missing vs '' vs 'NA' vs 'ND' vs 0 vs false; §12
 *      forbids erasing provenance of absence.
 *
 *   D6 Ok-result shape: the ok result carries EXACTLY the keys { ok,
 *      contractVersion, kind, patientRef, pathology, payload } — the 4
 *      envelope fields + payload plus `ok: true`, which is the
 *      operation-outcome marker established by the repository result pattern
 *      (ADR-005 "Resultado de operación" vocabulary as implemented by
 *      modules/reuma_export_boundary.js), NOT an invented envelope field.
 *      `contractVersion` is exactly 'reuma-visit-act/v1'. Any additional key
 *      — in particular actId, revision, actor, timestamp, assurance, siteId
 *      — fails. kind/patientRef/pathology are echoed verbatim (===).
 *
 *   D7 Failure shape: invalid input NEVER throws and NEVER fabricates a
 *      partial act. It returns { ok: false, error: { code, message } } with
 *      a non-empty string `code` and a string `message`, and EXACTLY the
 *      keys { ok, error } (diagnostics belong inside error; no act field is
 *      exposed on a failure). The exact code strings are implementation-
 *      chosen (#462 is silent) but must be typed and structured.
 *
 *   D8 Immutability is enforced at the level the ticket guarantees: the act
 *      (including its payload) must be PROVABLY DETACHED from the inputs —
 *      deep copy, new references for nested objects/arrays. Deep-freeze is
 *      not required (the ticket allows "immutable OR provably detached"), so
 *      the oracle proves detachment by mutation probes in both directions:
 *      mutating the act must not affect the inputs, and mutating the inputs
 *      after creation must not affect the act.
 *
 *   D9 The module must load in a browser-scoped sandbox with only
 *      `modules/hubTools.js` preloaded, attach `HubTools.reumaActContract`
 *      with a `createVisitAct` function, and must NOT touch
 *      `HubTools.export` (predefined empty by hubTools.js and it must remain
 *      empty) nor create `HubTools.reumaExportBoundary`.
 *
 *   D10 Transport ignorance is checked BOTH statically (the module source
 *      must not reference FINAL_V2_EXPORT_COLUMN_COUNT, generarFilaCSV,
 *      reumaExportBoundary, exportManager, HubTools.export, 497, TSV,
 *      clipboard, Excel, the Excel sheet-name tokens 'ESPA'/'APS'/'AR'/
 *      'LES'/'SJOGREN', and must not import/require anything) and
 *      behaviorally (D9). Forbidden-token occurrences fail even inside
 *      comments: the contract must not know the transport at all.
 *
 * Exit codes: 0 = all cases PASS, 1 = at least one case FAIL (fail-closed;
 * with the module under test absent, every case FAILs).
 * Usage: node tools/reuma_act_contract_check.mjs   (from repo root)
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HUB_TOOLS_MODULE = 'modules/hubTools.js';
const CONTRACT_MODULE = 'modules/reuma_act_contract.js';

const CONTRACT_VERSION = 'reuma-visit-act/v1';
const KINDS = ['primera_visita', 'seguimiento'];
const PATHOLOGIES = ['espa', 'aps', 'ar', 'les', 'sjogren'];
const FORBIDDEN_ENVELOPE_KEYS = ['actId', 'revision', 'actor', 'timestamp', 'assurance', 'siteId'];
const OK_RESULT_KEYS = ['contractVersion', 'kind', 'ok', 'patientRef', 'pathology', 'payload'].sort();

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
// Each family runs exactly one planted lie; the sink is reset per family so
// the "detected as false" assertion is family-local.
const plantedDetectedAsFalse = () => plantedSink.length === 1 && plantedSink[0].pass === false;
const plantedSummary = () => `planted pass=${plantedSink.length === 1 ? plantedSink[0].pass : 'n/a'}`;

// ---------------------------------------------------------------------------
// Sandbox (browser-scoped vm, only hubTools.js preloaded as namespace host)
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

function createContractSandbox() {
    const sink = { logs: [] };
    const sandbox = {
        console: createCapturingConsole(sink),
        setTimeout,
        clearTimeout,
        navigator: { userAgent: 'promueve-act-contract-oracle/1' },
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.sessionStorage = createStorageShim();
    sandbox.localStorage = createStorageShim();
    sandbox.CustomEvent = class CustomEvent {
        constructor(type, options) {
            this.type = type;
            this.detail = options ? options.detail : undefined;
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
    vm.createContext(sandbox);
    return { sandbox, sink };
}

/**
 * Loads modules/hubTools.js and then the module under test, unmodified.
 * Throws when the module under test is absent or does not attach the
 * contract surface — which is the state of the repository at freeze time.
 */
function loadContract() {
    const modulePath = path.join(ROOT, CONTRACT_MODULE);
    if (!fs.existsSync(modulePath)) {
        throw new Error(`module under test not found: ${CONTRACT_MODULE} (oracle frozen before implementation; must fail closed)`);
    }
    const moduleSource = fs.readFileSync(modulePath, 'utf8');
    const { sandbox } = createContractSandbox();
    vm.runInContext(fs.readFileSync(path.join(ROOT, HUB_TOOLS_MODULE), 'utf8'), sandbox, { filename: HUB_TOOLS_MODULE });
    vm.runInContext(moduleSource, sandbox, { filename: CONTRACT_MODULE });
    const contract = sandbox.HubTools && sandbox.HubTools.reumaActContract;
    if (!contract || typeof contract.createVisitAct !== 'function') {
        throw new Error('module loaded but HubTools.reumaActContract.createVisitAct is not a function');
    }
    return { create: contract.createVisitAct, moduleSource, sandbox };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeCreate(create, request) {
    try {
        return { result: create(request) };
    } catch (err) {
        return { threw: err };
    }
}

const sortedKeys = (obj) => Object.keys(obj).sort();

const describeValue = (v) => (typeof v === 'function' ? 'function' : (JSON.stringify(v) ?? String(v)));

function isStructuredFailure(outcome) {
    if (outcome.threw) return false;
    const r = outcome.result;
    return !!r && typeof r === 'object'
        && r.ok === false
        && r.error && typeof r.error === 'object'
        && typeof r.error.code === 'string' && r.error.code.trim() !== ''
        && typeof r.error.message === 'string' && r.error.message !== ''
        && sortedKeys(r).join('|') === 'error|ok'
        // no fabricated act: no contract field is exposed on a failure
        && ['contractVersion', 'kind', 'patientRef', 'pathology', 'payload'].every((k) => r[k] === undefined);
}

function isOkActShape(result, request) {
    if (!result || typeof result !== 'object' || result.ok !== true) return { pass: false, detail: 'result is not an ok result' };
    const keysOk = sortedKeys(result).join('|') === OK_RESULT_KEYS.join('|');
    if (!keysOk) return { pass: false, detail: `keys=${sortedKeys(result).join('|')} expected=${OK_RESULT_KEYS.join('|')}` };
    if (FORBIDDEN_ENVELOPE_KEYS.some((k) => k in result)) return { pass: false, detail: 'forbidden envelope key present' };
    if (result.contractVersion !== CONTRACT_VERSION) return { pass: false, detail: `contractVersion=${JSON.stringify(result.contractVersion)}` };
    if (result.kind !== request.kind || result.pathology !== request.pathology || result.patientRef !== request.patientRef) {
        return { pass: false, detail: 'kind/pathology/patientRef not echoed verbatim' };
    }
    const p = result.payload;
    if (!p || typeof p !== 'object' || Array.isArray(p)) return { pass: false, detail: 'payload is not an object' };
    if (p === request.payload) return { pass: false, detail: 'payload is the input reference (not detached)' };
    if (JSON.stringify(p) !== JSON.stringify(request.payload)) return { pass: false, detail: 'payload is not a faithful copy' };
    return { pass: true, detail: '' };
}

function attemptMutation(fn) {
    try {
        fn();
        return 'applied';
    } catch (err) {
        return `blocked (${err.constructor.name})`; // deep-freeze is acceptable under D8
    }
}

const VALID_REQUEST = () => ({
    kind: 'primera_visita',
    patientRef: 'SYN-0001',
    pathology: 'ar',
    payload: { notaSintetica: 'SYN', numeroSintetico: 3, banderaSintetica: true },
});

const SENTINEL_PAYLOAD = () => ({
    emptyString: '',
    na: 'NA',
    nd: 'ND',
    zero: 0,
    falseValue: false,
    nullValue: null,
    presentUndefined: undefined,
    nested: { hta: 'NA', counts: [0, false, '', 'ND', null], inner: { cero: 0, flag: false, ndToken: 'ND' } },
    lineas: [{ id: 1, activo: false }, { id: 2, na: 'NA', nd: 'ND' }],
});

// ---------------------------------------------------------------------------
// Case families
// ---------------------------------------------------------------------------

function familyA(create, degradedDetail) {
    console.log('  Family A — acceptance: valid creation, exact envelope, detached payload');
    for (const kind of KINDS) {
        for (const pathology of PATHOLOGIES) {
            const name = `A valid ${kind}/${pathology} creates an ok Visit Act v1 (exact envelope, verbatim echo, detached payload)`;
            if (!create) { record(name, false, degradedDetail); continue; }
            const request = { ...VALID_REQUEST(), kind, pathology };
            const outcome = safeCreate(create, request);
            if (outcome.threw) { record(name, false, `threw: ${outcome.threw.message}`); continue; }
            const shape = isOkActShape(outcome.result, request);
            record(name, shape.pass, shape.detail);
        }
    }
    if (create) {
        // Falsification self-test: a planted wrong expectation must be
        // detected as FAIL by the checker itself (oracle can disagree).
        const request = VALID_REQUEST();
        const outcome = safeCreate(create, request);
        const shape = outcome.threw ? { pass: false } : isOkActShape(outcome.result, request);
        plantedSink.length = 0;
        plantedRecord('planted lie: contractVersion is reuma-visit-act/v9', shape.pass && outcome.result.contractVersion === 'reuma-visit-act/v9', 'actual contractVersion differs (expected for the planted lie)');
        record('A-f planted lie (wrong contractVersion) is detected as false',
            plantedDetectedAsFalse(), plantedSummary());
    } else {
        record('A-f planted lie (wrong contractVersion) is detected as false', false, degradedDetail);
    }
}

const INVALID_KINDS = [
    ['missing', undefined],
    ['empty string', ''],
    ['whitespace only', '   '],
    ['tab/newline only', '\t\n'],
    ['upper case', 'PRIMERA_VISITA'],
    ['mixed case', 'Primera_Visita'],
    ['space instead of underscore', 'primera visita'],
    ['trailing whitespace', 'seguimiento '],
    ['near-miss singular', 'primera'],
    ['synonym not in contract', 'inicial'],
    ['plural drift', 'primera_visitas'],
    ['null', null],
    ['number', 1],
    ['boolean', true],
    ['plain object', {}],
    ['array-wrapped token', ['seguimiento']],
];

const INVALID_PATHOLOGIES = [
    ['missing', undefined],
    ['empty string', ''],
    ['whitespace only', '  '],
    ['upper-case sheet token', 'ESPA'],
    ['mixed case', 'Espa'],
    ['trailing whitespace', 'ar '],
    ['near-miss truncation', 'esp'],
    ['numeric drift', 'espa1'],
    ['unknown pathology', 'dermatologia'],
    ['descriptive synonym', 'sindrome_sjogren'],
    ['null', null],
    ['number', 42],
    ['boolean', true],
    ['array-wrapped token', ['ar']],
    ['plain object', {}],
];

const INVALID_PATIENT_REFS = [
    ['missing', undefined],
    ['empty string', ''],
    ['whitespace only', '   '],
    ['tab/newline only', '\t\n'],
    ['null', null],
    ['number', 42],
    ['zero', 0],
    ['boolean', true],
    ['array', ['SYN-0001']],
    ['object wrapper', { ref: 'SYN-0001' }],
    ['function', () => 'SYN-0001'],
];

const INVALID_PAYLOADS = [
    ['missing', undefined],
    ['null', null],
    ['empty array', []],
    ['array with entries', ['x']],
    ['empty string', ''],
    ['non-empty string', 'texto'],
    ['number', 42],
    ['zero', 0],
    ['boolean', true],
    ['function', () => {}],
];

function familyB(create, degradedDetail) {
    console.log('  Family B — fail-closed: invalid kind/pathology/patientRef/payload never fabricate an act');
    const groups = [
        ['kind', INVALID_KINDS],
        ['pathology', INVALID_PATHOLOGIES],
        ['patientRef', INVALID_PATIENT_REFS],
        ['payload', INVALID_PAYLOADS],
    ];
    for (const [field, cases] of groups) {
        for (const [label, badValue] of cases) {
            const name = `B ${field}=${label} (${describeValue(badValue)}) fails closed with a typed structured error`;
            if (!create) { record(name, false, degradedDetail); continue; }
            const request = VALID_REQUEST();
            request[field] = badValue;
            const outcome = safeCreate(create, request);
            record(name, isStructuredFailure(outcome), outcome.threw
                ? `threw instead of structured failure: ${outcome.threw.message}`
                : `result=${JSON.stringify(outcome.result)}`);
        }
    }
    if (create) {
        const request = VALID_REQUEST();
        request.kind = 'no-existe';
        const outcome = safeCreate(create, request);
        plantedSink.length = 0;
        plantedRecord('planted lie: invalid kind is accepted with ok===true', !outcome.threw && outcome.result && outcome.result.ok === true, 'invalid input is rejected (expected for the planted lie)');
        record('B-f planted lie (invalid kind accepted) is detected as false',
            plantedDetectedAsFalse(), plantedSummary());
    } else {
        record('B-f planted lie (invalid kind accepted) is detected as false', false, degradedDetail);
    }
}

const C_CASE_NAMES = [
    'C ok result obtained for the sentinel payload',
    'C no key dropped (key set identical, including presentUndefined)',
    'C key-present-with-undefined stays present-with-undefined',
    "C '' preserved verbatim",
    "C 'NA' preserved verbatim",
    "C 'ND' preserved verbatim",
    'C 0 preserved as number',
    'C false preserved as boolean',
    'C null preserved as null (distinct from undefined and \'\')',
    'C nested objects/arrays deep-copied (new references)',
    'C nested sentinels preserved verbatim',
    'C defined content JSON-identical to the input payload',
];

function familyC(create, degradedDetail) {
    console.log('  Family C — sentinel preservation: no collapse, no dropped keys, deep copy');
    if (!create) {
        for (const name of C_CASE_NAMES) record(name, false, degradedDetail);
        return;
    }
    const sentinels = SENTINEL_PAYLOAD();
    const outcome = safeCreate(create, { kind: 'primera_visita', patientRef: 'SYN-0003', pathology: 'sjogren', payload: sentinels });
    const p = (!outcome.threw && outcome.result && outcome.result.ok === true) ? outcome.result.payload : null;
    record(C_CASE_NAMES[0], !!p, outcome.threw ? `threw: ${outcome.threw.message}` : `result=${JSON.stringify(outcome.result)}`);
    if (p) {
        record(C_CASE_NAMES[1], sortedKeys(p).join('|') === sortedKeys(sentinels).join('|'),
            `keys=${sortedKeys(p).join('|')}`);
        record(C_CASE_NAMES[2], 'presentUndefined' in p && p.presentUndefined === undefined,
            `present=${'presentUndefined' in p} value=${p.presentUndefined}`);
        record(C_CASE_NAMES[3], p.emptyString === '', `value=${JSON.stringify(p.emptyString)}`);
        record(C_CASE_NAMES[4], p.na === 'NA', `value=${JSON.stringify(p.na)}`);
        record(C_CASE_NAMES[5], p.nd === 'ND', `value=${JSON.stringify(p.nd)}`);
        record(C_CASE_NAMES[6], p.zero === 0 && typeof p.zero === 'number', `value=${JSON.stringify(p.zero)}`);
        record(C_CASE_NAMES[7], p.falseValue === false && typeof p.falseValue === 'boolean', `value=${JSON.stringify(p.falseValue)}`);
        record(C_CASE_NAMES[8], p.nullValue === null, `value=${JSON.stringify(p.nullValue)}`);
        record(C_CASE_NAMES[9],
            p.nested !== sentinels.nested && p.nested.inner !== sentinels.nested.inner
            && p.lineas !== sentinels.lineas && p.lineas[0] !== sentinels.lineas[0],
            'nested references must be new objects/arrays');
        record(C_CASE_NAMES[10],
            p.nested && p.nested.hta === 'NA'
            && p.nested.inner && p.nested.inner.cero === 0 && p.nested.inner.flag === false && p.nested.inner.ndToken === 'ND'
            && Array.isArray(p.nested.counts)
            && p.nested.counts.length === 5 && p.nested.counts[0] === 0 && p.nested.counts[1] === false
            && p.nested.counts[2] === '' && p.nested.counts[3] === 'ND' && p.nested.counts[4] === null
            && p.lineas[0].activo === false && p.lineas[1].na === 'NA' && p.lineas[1].nd === 'ND',
            `nested=${JSON.stringify(p.nested)} lineas=${JSON.stringify(p.lineas)}`);
        record(C_CASE_NAMES[11], JSON.stringify(p) === JSON.stringify(sentinels), 'JSON snapshot of defined content differs');
        plantedSink.length = 0;
        plantedRecord("planted lie: 'NA' collapses to 'ND'", p.na === 'ND', 'NA is preserved (expected for the planted lie)');
        record('C-f planted lie (sentinel collapse) is detected as false',
            plantedDetectedAsFalse(), plantedSummary());
    } else {
        for (const name of C_CASE_NAMES.slice(1)) record(name, false, 'no ok act payload to inspect');
    }
}

const D_CASE_NAMES = [
    'D ok act created from the D request',
    'D input request left deep-identical after creation (JSON snapshot)',
    'D input nested reference identity preserved (no mutation of the original payload)',
    'D returned act payload is a new detached object (different reference)',
    'D mutating the returned act does not affect the inputs (JSON + references)',
    'D mutating the inputs after creation does not affect the returned act',
];

function familyD(create, degradedDetail) {
    console.log('  Family D — no-mutation + immutability: detachment proven in both directions');
    if (!create) {
        for (const name of D_CASE_NAMES) record(name, false, degradedDetail);
        return;
    }
    const payloadD = {
        nota: 'sintetica',
        numero: 3,
        bandera: false,
        vacio: '',
        presente: undefined,
        anidado: { nivel: { cero: 0, na: 'NA' } },
        lineas: [{ id: 1, activo: false }, { id: 2 }],
    };
    const request = { kind: 'seguimiento', patientRef: 'SYN-0002', pathology: 'les', payload: payloadD };
    const requestSnapshotBefore = JSON.stringify(request);
    const refs = {
        request,
        payload: payloadD,
        anidado: payloadD.anidado,
        nivel: payloadD.anidado.nivel,
        lineas: payloadD.lineas,
        lineas0: payloadD.lineas[0],
    };
    const outcome = safeCreate(create, request);
    const act = (!outcome.threw && outcome.result && outcome.result.ok === true) ? outcome.result : null;
    record(D_CASE_NAMES[0], !!act, outcome.threw ? `threw: ${outcome.threw.message}` : `result=${JSON.stringify(outcome.result)}`);
    if (!act) {
        for (const name of D_CASE_NAMES.slice(1)) record(name, false, 'no ok act to verify');
        return;
    }
    record(D_CASE_NAMES[1], JSON.stringify(request) === requestSnapshotBefore, 'input request snapshot changed');
    record(D_CASE_NAMES[2],
        refs.request === request && refs.payload === payloadD && refs.anidado === payloadD.anidado
        && refs.nivel === payloadD.anidado.nivel && refs.lineas === payloadD.lineas && refs.lineas0 === payloadD.lineas[0],
        'input nested references changed');
    record(D_CASE_NAMES[3], act.payload !== payloadD && act.payload.anidado !== payloadD.anidado && act.payload.lineas !== payloadD.lineas,
        'act payload shares references with the input');
    // Probe 1 — caller mutates the returned act (permitted under D8; only
    // detachment is required): the INPUTS must remain unaffected. Baselines
    // are the input snapshots taken at creation time, before any mutation.
    const inputSnapshotAtCreate = JSON.stringify(request);
    const mutationOnAct = attemptMutation(() => {
        act.payload.anidado.nivel.cero = 999;
        act.payload.lineas.push({ id: 3 });
        act.payload.extra = 'mutado';
        act.patientRef = 'SYN-HACKED';
        act.kind = 'otro';
    });
    record(D_CASE_NAMES[4],
        JSON.stringify(request) === inputSnapshotAtCreate
        && refs.anidado === payloadD.anidado && refs.nivel === payloadD.anidado.nivel
        && refs.lineas === payloadD.lineas && refs.lineas0 === payloadD.lineas[0]
        && payloadD.anidado.nivel.cero === 0 && payloadD.lineas.length === 2 && !('extra' in payloadD),
        `actMutation=${mutationOnAct}`);
    // Probe 2 — caller mutates the INPUTS after creation: the act must remain
    // exactly as it was when handed over (baseline captured after probe 1 so
    // permitted caller-side act mutations are not counted against the act).
    const actPayloadBaseline = JSON.stringify(act.payload);
    const actScalarBaseline = { kind: act.kind, patientRef: act.patientRef, pathology: act.pathology, contractVersion: act.contractVersion };
    const mutationOnInputs = attemptMutation(() => {
        payloadD.anidado.nivel.cero = -1;
        payloadD.lineas.shift();
        payloadD.extra = 'despues';
        payloadD.na2 = 'NA';
        request.patientRef = 'SYN-CAMBIADO';
        request.kind = 'primera_visita';
    });
    record(D_CASE_NAMES[5],
        JSON.stringify(act.payload) === actPayloadBaseline
        && act.kind === actScalarBaseline.kind && act.patientRef === actScalarBaseline.patientRef
        && act.pathology === actScalarBaseline.pathology && act.contractVersion === actScalarBaseline.contractVersion,
        `inputMutation=${mutationOnInputs}`);
}

const E_FORBIDDEN_SUBSTRINGS = [
    ['FINAL_V2_EXPORT_COLUMN_COUNT', '497 column-count constant'],
    ['generarFilaCSV', 'legacy generator names'],
    ['reumaExportBoundary', 'legacy compatibility boundary'],
    ['exportManager', 'legacy export manager module'],
    ['HubTools.export', 'legacy export namespace write surface'],
    ['HubTools.reumaExportBoundary', 'legacy boundary namespace'],
];

const E_FORBIDDEN_PATTERNS = [
    [/\b497\b/, '497-column transport count'],
    [/\bTSV\b/i, 'TSV transport'],
    [/clipboard/i, 'clipboard transport'],
    [/\bexcel\b/i, 'Excel transport'],
    [/['"`]ESPA['"`]/, 'Excel sheet name ESPA'],
    [/['"`]APS['"`]/, 'Excel sheet name APS'],
    [/['"`]AR['"`]/, 'Excel sheet name / generator token AR'],
    [/['"`]LES['"`]/, 'Excel sheet name LES'],
    [/['"`]SJOGREN['"`]/, 'Excel sheet name SJOGREN'],
    [/\bimport\s*[\{('"]/, 'ESM import statement'],
    [/(^|\n)\s*import\s/, 'ESM import statement'],
    [/\brequire\s*\(/, 'CommonJS require'],
];

const E_CASE_NAMES = [
    'E module under test exists and is readable',
    ...E_FORBIDDEN_SUBSTRINGS.map(([token, why]) => `E source contains no '${token}' (${why})`),
    ...E_FORBIDDEN_PATTERNS.map(([, why]) => `E source contains no ${why} pattern`),
    'E module exposes HubTools.reumaActContract.createVisitAct in the sandbox',
    'E HubTools.export stays empty after loading the contract (no transport wiring)',
    'E HubTools.reumaExportBoundary is not created by the contract',
];

function familyE(create, sandbox, moduleSource, degradedDetail) {
    console.log('  Family E — transport ignorance: static + behavioral independence from 497/Excel/clipboard');
    if (!moduleSource) {
        record(E_CASE_NAMES[0], false, degradedDetail);
        for (const name of E_CASE_NAMES.slice(1)) record(name, false, 'module under test unavailable');
        return;
    }
    record(E_CASE_NAMES[0], true, `${moduleSource.length} chars`);
    let i = 1;
    for (const [token, why] of E_FORBIDDEN_SUBSTRINGS) {
        record(E_CASE_NAMES[i++], !moduleSource.includes(token), `occurrences=${moduleSource.split(token).length - 1}`);
    }
    for (const [pattern, why] of E_FORBIDDEN_PATTERNS) {
        const match = moduleSource.match(pattern);
        record(E_CASE_NAMES[i++], !match, match ? `matched '${match[0].replace(/\n/g, '\\n')}'` : 'no match');
    }
    if (sandbox) {
        record(E_CASE_NAMES[i++], !!sandbox.HubTools.reumaActContract && typeof sandbox.HubTools.reumaActContract.createVisitAct === 'function', 'contract surface missing');
        record(E_CASE_NAMES[i++], !!sandbox.HubTools.export && typeof sandbox.HubTools.export === 'object' && Object.keys(sandbox.HubTools.export).length === 0,
            `HubTools.export keys=${sandbox.HubTools.export ? Object.keys(sandbox.HubTools.export).join(',') : 'n/a'}`);
        record(E_CASE_NAMES[i++], sandbox.HubTools.reumaExportBoundary === undefined, 'boundary namespace was created');
    } else {
        for (; i < E_CASE_NAMES.length; i++) record(E_CASE_NAMES[i], false, 'contract surface unavailable');
    }
    plantedSink.length = 0;
    plantedRecord('planted lie: contract source references the 497 transport count', /\b497\b/.test(moduleSource), 'source is clean (expected for the planted lie)');
    record('E-f planted lie (transport reference) is detected as false',
        plantedDetectedAsFalse(), plantedSummary());
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
    console.log('Reuma Visit Act v1 contract oracle (WO-NEXUS-REUMA-F5.4A, #462, 100% synthetic data)');

    let create = null;
    let moduleSource = null;
    let sandbox = null;
    let degradedDetail = '';
    try {
        ({ create, moduleSource, sandbox } = loadContract());
    } catch (err) {
        degradedDetail = `module under test unavailable: ${err.message}`;
        console.log(`  [FAIL] LOAD ${CONTRACT_MODULE} loads in the vm sandbox and exposes HubTools.reumaActContract.createVisitAct -> ${degradedDetail}`);
        results.push({ name: 'LOAD', pass: false });
    }

    familyA(create, degradedDetail);
    familyB(create, degradedDetail);
    familyC(create, degradedDetail);
    familyD(create, degradedDetail);
    familyE(create, sandbox, moduleSource, degradedDetail);

    const failed = results.filter((r) => !r.pass).length;
    console.log('');
    console.log(`RESULTADO: ${results.length - failed} OK / ${failed} FALLIDO`);
    if (failed > 0) {
        console.error('Reuma act contract check FAILED');
        process.exit(1);
    }
    console.log('Reuma act contract check PASSED');
}

main();
