#!/usr/bin/env node
// Oracle for scripts/farmacia_patient_read_facade_v2.js (#428 WU-A).
// Cases 1-16 are fixed by the frozen interface document (Part 4); do not weaken them.
// REVISION 1 supersedes the `session` dependency: the facade now depends on a caller-owned
// `commitSelection` capability, so every write assertion here is a commit call-counter
// assertion backed by the REAL FarmaciaCurrentPatientSession wrapped inside the commit double.
// Where the frozen text is silent this oracle picks the most fail-closed expectation and
// documents the choice in a short comment next to the assertion.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let facadeModule;
try {
    await import(path.join(ROOT, 'scripts/farmacia_patient_read_facade_v2.js'));
    facadeModule = globalThis.FarmaciaPatientReadFacadeV2;
} catch (error) {
    console.error('farmacia_patient_read_facade_v2_check: FAIL — module scripts/farmacia_patient_read_facade_v2.js could not be loaded');
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
}
if (!facadeModule || typeof facadeModule !== 'object') {
    console.error('farmacia_patient_read_facade_v2_check: FAIL — globalThis.FarmaciaPatientReadFacadeV2 was not published');
    process.exit(1);
}

// The REAL session is required by REVISION 1 inside the commit double so that the stored
// envelope evidence stays real while the facade only sees an injected commit capability.
await import(path.join(ROOT, 'scripts/farmacia_current_patient_session.js'));
const sessionModule = globalThis.FarmaciaCurrentPatientSession;

let passed = 0;
const failures = [];

// Fail soft per case so the run can report exactly which cases fail and how many pass
// (the current module still implements the SUPERSEDED interface, so failures are expected).
async function test(name, callback) {
    try {
        await callback();
        passed += 1;
        console.log(`PASS ${name}`);
    } catch (error) {
        failures.push({ name, error });
        console.error(`FAIL ${name}`);
        console.error(error && error.stack ? error.stack : String(error));
    }
}

// ---------------------------------------------------------------------------
// Frozen vocabulary (mirrors scripts/farmacia_patient_read_contract_v2.js).
// ---------------------------------------------------------------------------
const FACADE_VERSION = '1.0.0';
const STATES = ['loading', 'ok', 'not_found', 'ambiguous', 'unavailable', 'error'];
const READ_RESULT_KEYS = ['state', 'requestId', 'superseded', 'value', 'errorCode', 'completeness', 'provenance', 'scope'];
const SELECTION_RESULT_KEYS = ['state', 'requestId', 'superseded', 'selected', 'patient', 'envelope', 'previousCip', 'pendingChanges', 'errorCode'];
const IDENTIFIER_SYSTEM = 'urn:cip:synthetic';
const SOURCE_KIND = 'application_read_contract_v2';
const CONTRACT_VERSION = '2.0.0';
const ERROR_CODES = [null, 'IDENTIFIER_INVALID', 'PATIENT_ID_INVALID', 'SOURCE_METHOD_UNAVAILABLE', 'SOURCE_READ_FAILED', 'IDENTIFIER_AMBIGUOUS'];
// REVISION 1 adds replacePatient, getState, FarmaciaCurrentPatientSession,
// FarmaciaPatientFlowRuntime and generation to the forbidden ambient-token scan.
const FORBIDDEN_SOURCE_TOKENS = [
    'FarmaciaRawExcelDataSource', 'FarmaciaApplicationDataPort', 'FarmaciaCurrentPatientSession',
    'FarmaciaPatientFlowRuntime', 'listPatients', 'canonical_row', 'replacePatient', 'getState',
    'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest', 'setTimeout', 'setInterval',
    'window.location', 'generation'
];
const STORAGE_KEY = 'promueve.fh.currentPatientSession.v1';

// ---------------------------------------------------------------------------
// Synthetic F4.1 fixtures. Builders (never shared literals) so a mutated result
// can never silently match a mutated fixture.
// ---------------------------------------------------------------------------
function provenance(patientId) {
    return {
        source_kind: SOURCE_KIND,
        contract_version: CONTRACT_VERSION,
        source_version: '1.0.0',
        patient_id: patientId,
        event_ids: ['visit-a']
    };
}

function f41(fields) {
    return {
        outcome: fields.outcome,
        value: Object.hasOwn(fields, 'value') ? fields.value : null,
        errorCode: Object.hasOwn(fields, 'errorCode') ? fields.errorCode : null,
        completeness: Object.hasOwn(fields, 'completeness') ? fields.completeness : (fields.outcome === 'ok' ? 'partial' : 'unknown'),
        provenance: Object.hasOwn(fields, 'provenance') ? fields.provenance : provenance(null),
        scope: null
    };
}

function identifierFor(letter) {
    return { identifier_system: IDENTIFIER_SYSTEM, identifier_value: `CIP-${letter}` };
}

function patientFixture(letter) {
    return {
        patient_id: `patient-${letter.toLowerCase()}`,
        identifiers: [identifierFor(letter)],
        demographics: { birth_year: null, sex: 'unknown' },
        clinical: { active_lines: [] }
    };
}

function contextValue(letter) {
    return {
        patient: patientFixture(letter),
        request: { dose_text: '', route: null, flag: false, count: 0 },
        validation: { accepted: false, note: '' },
        visits: [],
        lines: [],
        proms: [],
        adherence: [],
        safety: { adverse_events: [], causality_assessments: [] }
    };
}

function okResolve(letter) {
    return f41({
        outcome: 'ok',
        value: { patient_id: `patient-${letter.toLowerCase()}`, identifiers: [identifierFor(letter)] },
        completeness: 'partial',
        provenance: provenance(`patient-${letter.toLowerCase()}`)
    });
}

function okContext(letter) {
    return f41({
        outcome: 'ok',
        value: contextValue(letter),
        completeness: 'partial',
        provenance: provenance(`patient-${letter.toLowerCase()}`)
    });
}

function notFound() { return f41({ outcome: 'not_found' }); }
function ambiguous() {
    return f41({ outcome: 'ambiguous', value: { candidate_patient_ids: ['patient-a', 'patient-b'] }, errorCode: 'IDENTIFIER_AMBIGUOUS' });
}
function unavailable() { return f41({ outcome: 'unavailable', errorCode: 'SOURCE_METHOD_UNAVAILABLE' }); }
function sourceError() { return f41({ outcome: 'error', errorCode: 'SOURCE_READ_FAILED' }); }

// ---------------------------------------------------------------------------
// Doubles and deterministic async control (no timers, no randomness).
// ---------------------------------------------------------------------------
function contractDouble() {
    const state = {
        resolvePatientCalls: [],
        readPatientContextCalls: [],
        resolvePatient: () => notFound(),
        readPatientContext: () => notFound()
    };
    const contract = {
        resolvePatient(identifierSystem, identifierValue) {
            state.resolvePatientCalls.push({ identifier_system: identifierSystem, identifier_value: identifierValue });
            return state.resolvePatient(identifierSystem, identifierValue);
        },
        readPatientContext(patientId) {
            state.readPatientContextCalls.push({ patient_id: patientId });
            return state.readPatientContext(patientId);
        }
    };
    return { contract, state };
}

function memoryStorage() {
    const values = Object.create(null);
    const operations = [];
    return {
        getItem(key) { operations.push(`get:${key}`); return Object.hasOwn(values, key) ? values[key] : null; },
        setItem(key, value) { operations.push(`set:${key}`); values[key] = String(value); },
        removeItem(key) { operations.push(`remove:${key}`); delete values[key]; },
        values,
        operations
    };
}

function contextValueFor(patientId) {
    return contextValue(patientId.replace('patient-', '').toUpperCase());
}

// A session-valid input seed, mirroring how the real commit path builds the envelope it
// hands to FarmaciaCurrentPatientSession.replacePatient.
function sessionSeedFor(patientId, identifier) {
    const letter = patientId.replace('patient-', '').toUpperCase();
    return {
        identifier: { identifier_system: identifier.identifier_system, identifier_value: identifier.identifier_value },
        patient_id: patientId,
        generation: `generation-${letter}`,
        patient_projection: { patient_id: patientId, patient: patientFixture(letter) },
        explicit_data: { count: 0, flag: false, note: '' },
        provenance: provenance(patientId),
        drafts: {},
        dirty: false
    };
}

function sessionSeed(letter) {
    return sessionSeedFor(`patient-${letter.toLowerCase()}`, identifierFor(letter));
}

// Caller-owned commit double (REVISION 1). It wraps the REAL FarmaciaCurrentPatientSession so
// stored-envelope evidence is real, and records a call counter plus the exact outcome returned.
// `state.handler` lets a case inject a failing collaborator without touching real storage.
function commitDouble(session, storage) {
    const calls = [];
    const outcomes = [];
    const state = { handler: null };
    function commitSelection(identifier, patientId, options) {
        calls.push({ identifier, patientId, options });
        if (typeof state.handler === 'function') {
            const injected = state.handler(identifier, patientId, options);
            outcomes.push(injected);
            return injected;
        }
        const previous = session.getState();
        const previousCip = previous.status === 'active' && previous.envelope && previous.envelope.identifier
            ? previous.envelope.identifier.identifier_value
            : null;
        const outcome = session.replacePatient(sessionSeedFor(patientId, identifier), options.discardPendingChanges === true);
        if (outcome.status === 'pending_changes') {
            const pending = { status: 'pending_changes' };
            outcomes.push(pending);
            return pending;
        }
        const active = {
            status: 'active',
            envelope: outcome.envelope,
            patient: contextValueFor(patientId).patient,
            previousCip
        };
        outcomes.push(active);
        return active;
    }
    return { commitSelection, calls, outcomes, state, storage, baseline: storage ? storage.values[STORAGE_KEY] : undefined };
}

function freshCommit() {
    const storage = memoryStorage();
    return commitDouble(sessionModule.create({ sessionStorage: storage }), storage);
}

// A commit double over a real session that already holds non-dirty patient A, so a buggy write
// would be visible and would not be masked by the dirty guard.
function seededCommit() {
    const storage = memoryStorage();
    const session = sessionModule.create({ sessionStorage: storage });
    session.replacePatient(sessionSeed('A'), true);
    const commit = commitDouble(session, storage);
    commit.baseline = storage.values[STORAGE_KEY];
    storage.operations.length = 0;
    return commit;
}

// Every "never writes" case must leave the real stored envelope and write count unchanged.
function assertStoreUntouched(commit, label) {
    assert.equal(commit.calls.length, 0, `${label}: commitSelection must not be called`);
    assert.equal(commit.storage.values[STORAGE_KEY], commit.baseline, `${label}: stored envelope unchanged`);
    assert.equal(commit.storage.operations.length, 0, `${label}: no storage operation`);
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

// Deterministic microtask drain: lets the facade advance without timers or sleeps.
async function drain() {
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
}

function candidate(letter) {
    return { identifier_system: IDENTIFIER_SYSTEM, identifier_value: `CIP-${letter}`, patient_id: `patient-${letter.toLowerCase()}` };
}

// REVISION 1: the facade depends on { contract, identifierCandidates, commitSelection }.
// No `session` key is supplied anywhere except the dedicated ignore-case in case 3.
function facadeWith(contract, commitSelection, identifierCandidates) {
    return facadeModule.create({ contract, commitSelection, identifierCandidates });
}

const observedErrorCodes = new Set();

function recordErrorCode(result) {
    if (result && typeof result === 'object' && Object.hasOwn(result, 'errorCode')) observedErrorCodes.add(result.errorCode);
    return result;
}

function assertMirrorsF41(result, fixture, requestId = 'req-1') {
    recordErrorCode(result);
    assert.equal(result.state, fixture.outcome);
    assert.deepEqual(result.value, fixture.value);
    assert.equal(result.errorCode, fixture.errorCode);
    assert.equal(result.completeness, fixture.completeness);
    assert.deepEqual(result.provenance, fixture.provenance);
    assert.equal(result.scope, null);
    assert.equal(result.superseded, false);
    assert.equal(result.requestId, requestId);
}

function assertSupersededRead(result, requestId) {
    recordErrorCode(result);
    assert.deepEqual(result, {
        state: 'loading',
        requestId,
        superseded: true,
        value: null,
        errorCode: null,
        completeness: null,
        provenance: null,
        scope: null
    });
}

function assertSupersededSelection(result, requestId) {
    recordErrorCode(result);
    assert.deepEqual(result, {
        state: 'loading',
        requestId,
        superseded: true,
        selected: false,
        patient: null,
        envelope: null,
        previousCip: null,
        pendingChanges: false,
        errorCode: null
    });
}

// ---------------------------------------------------------------------------
// Cases 1-8
// ---------------------------------------------------------------------------
await test('1. STATES is frozen and exactly the six literals in order', () => {
    assert.deepEqual(Array.from(facadeModule.STATES), STATES);
    assert.equal(Object.isFrozen(facadeModule.STATES), true);
});

await test('2. exported surface is FACADE_VERSION 1.0.0, create and a frozen facade', () => {
    assert.equal(facadeModule.FACADE_VERSION, FACADE_VERSION);
    assert.equal(typeof facadeModule.create, 'function');
    assert.equal(Object.isFrozen(facadeModule), true);
});

await test('3. create fails closed with null for every missing dependency', () => {
    const contract = contractDouble().contract;
    const commitSelection = freshCommit().commitSelection;
    const candidates = () => [];
    assert.equal(facadeModule.create(), null);
    assert.equal(facadeModule.create({}), null);
    assert.equal(facadeModule.create({ identifierCandidates: candidates, commitSelection }), null);
    assert.equal(facadeModule.create({ contract: { readPatientContext: notFound }, identifierCandidates: candidates, commitSelection }), null);
    assert.equal(facadeModule.create({ contract: { resolvePatient: notFound }, identifierCandidates: candidates, commitSelection }), null);
    // REVISION 1: the null-cases cover commitSelection (missing key, non-function) instead of session.
    assert.equal(facadeModule.create({ contract, identifierCandidates: candidates }), null);
    assert.equal(facadeModule.create({ contract, commitSelection: {}, identifierCandidates: candidates }), null);
    assert.equal(facadeModule.create({ contract, commitSelection }), null);
    assert.equal(facadeModule.create({ contract, commitSelection, identifierCandidates: 'CIP-A' }), null);
    // REVISION 1: a `session` key is ignored, not required — it neither satisfies nor breaks construction.
    assert.notEqual(facadeModule.create({ contract, commitSelection, identifierCandidates: candidates }), null);
    assert.notEqual(facadeModule.create({ contract, commitSelection, identifierCandidates: candidates, session: {} }), null);
    assert.notEqual(facadeModule.create({ contract, commitSelection, identifierCandidates: candidates, session: 'not-a-session' }), null);
});

await test('4. settled ReadResult keeps the exact key order and scope is null', async () => {
    const { contract, state } = contractDouble();
    state.readPatientContext = () => okContext('A');
    const commit = freshCommit();
    const facade = facadeWith(contract, commit.commitSelection, () => []);
    const result = await facade.loadPatientContext('patient-a');
    assert.deepEqual(Object.keys(result), READ_RESULT_KEYS);
    assert.equal(result.scope, null);
    assert.equal(result.superseded, false);
    assert.equal(result.state, 'ok');
    assert.equal(commit.calls.length, 0);
});

await test('5. settled SelectionResult keeps the exact key order', async () => {
    const { contract, state } = contractDouble();
    state.resolvePatient = () => okResolve('A');
    state.readPatientContext = () => okContext('A');
    const commit = freshCommit();
    const facade = facadeWith(contract, commit.commitSelection, () => [candidate('A')]);
    const result = await facade.selectPatientByIdentifier(IDENTIFIER_SYSTEM, 'CIP-A');
    assert.deepEqual(Object.keys(result), SELECTION_RESULT_KEYS);
});

await test('6. status and currentRequestId follow the req-n progression', async () => {
    const { contract, state } = contractDouble();
    const first = deferred();
    const second = deferred();
    state.readPatientContext = () => first.promise;
    state.resolvePatient = () => second.promise;
    const commit = freshCommit();
    const facade = facadeWith(contract, commit.commitSelection, () => []);

    assert.deepEqual(facade.status(), { state: null, requestId: null, pending: false });
    assert.equal(facade.currentRequestId(), null);

    const pendingFirst = facade.loadPatientContext('patient-a');
    assert.equal(facade.currentRequestId(), 'req-1');
    assert.deepEqual(facade.status(), { state: 'loading', requestId: 'req-1', pending: true });

    first.resolve(okContext('A'));
    const settledFirst = await pendingFirst;
    assert.equal(settledFirst.state, 'ok');
    assert.deepEqual(facade.status(), { state: 'ok', requestId: 'req-1', pending: false });
    assert.equal(facade.currentRequestId(), 'req-1');

    const pendingSecond = facade.resolvePatient(IDENTIFIER_SYSTEM, 'CIP-A');
    assert.equal(facade.currentRequestId(), 'req-2');
    assert.deepEqual(facade.status(), { state: 'loading', requestId: 'req-2', pending: true });

    second.resolve(okResolve('A'));
    const settledSecond = await pendingSecond;
    assert.equal(settledSecond.state, 'ok');
    assert.deepEqual(facade.status(), { state: 'ok', requestId: 'req-2', pending: false });
    assert.equal(facade.currentRequestId(), 'req-2');
});

await test('7. resolvePatient and loadPatientContext mirror the F4.1 envelope', async () => {
    const fixtures = [okResolve('A'), notFound(), ambiguous(), unavailable(), sourceError()];
    for (const fixture of fixtures) {
        const resolveDouble = contractDouble();
        resolveDouble.state.resolvePatient = () => fixture;
        const resolveFacade = facadeWith(resolveDouble.contract, freshCommit().commitSelection, () => []);
        assertMirrorsF41(await resolveFacade.resolvePatient(IDENTIFIER_SYSTEM, 'CIP-A'), fixture);

        const contextDouble = contractDouble();
        contextDouble.state.readPatientContext = () => fixture;
        const contextFacade = facadeWith(contextDouble.contract, freshCommit().commitSelection, () => []);
        assertMirrorsF41(await contextFacade.loadPatientContext('patient-a'), fixture);
    }
});

await test('8. race A then B: B wins, A is superseded and the commit capability is called exactly once', async () => {
    const { contract, state } = contractDouble();
    const resolveA = deferred();
    const resolveB = deferred();
    const contextA = deferred();
    const contextB = deferred();
    state.resolvePatient = (identifierSystem, identifierValue) => (identifierValue === 'CIP-A' ? resolveA.promise : resolveB.promise);
    // Tolerant on purpose: whether a superseded request is allowed to read its context is not
    // pinned by the frozen text; what is pinned is that it must never commit.
    state.readPatientContext = (patientId) => (patientId === 'patient-b' ? contextB.promise : contextA.promise);
    const commit = freshCommit();
    const facade = facadeWith(contract, commit.commitSelection, () => []);

    const promiseA = facade.selectPatientByIdentifier(IDENTIFIER_SYSTEM, 'CIP-A');
    const promiseB = facade.selectPatientByIdentifier(IDENTIFIER_SYSTEM, 'CIP-B');

    resolveB.resolve(okResolve('B'));
    await drain();
    contextB.resolve(okContext('B'));
    const resultB = await promiseB;

    resolveA.resolve(okResolve('A'));
    await drain();
    contextA.resolve(okContext('A'));
    const resultA = await promiseA;

    assert.equal(resultB.state, 'ok');
    assert.equal(resultB.selected, true);
    assert.equal(resultB.superseded, false);
    assert.deepEqual(resultB.patient, contextValue('B').patient);
    // REVISION 1: patient/envelope/previousCip come through exactly as the commit outcome returned them.
    assert.deepEqual(resultB.patient, commit.outcomes[0].patient);
    assert.deepEqual(resultB.envelope, commit.outcomes[0].envelope);
    assert.equal(resultB.previousCip, commit.outcomes[0].previousCip);
    assert.equal(resultB.requestId, 'req-2');

    assert.equal(commit.calls.length, 1, 'exactly one commit call');
    assert.equal(JSON.stringify(commit.storage.values[STORAGE_KEY]).includes('patient-b'), true);
    assert.equal(JSON.stringify(commit.storage.values[STORAGE_KEY]).includes('patient-a'), false);

    // A settled after B: superseded, no commit, and no later status() reveals A.
    assertSupersededSelection(resultA, 'req-1');
    assert.equal(commit.calls.length, 1);
    assert.equal(JSON.stringify(commit.storage.values[STORAGE_KEY]).includes('patient-a'), false);
    assert.deepEqual(facade.status(), { state: 'ok', requestId: 'req-2', pending: false });
    assert.equal(facade.currentRequestId(), 'req-2');
});

// ---------------------------------------------------------------------------
// Cases 9-18
// ---------------------------------------------------------------------------
// Every non-current selection outcome the frozen interface lists: one superseded (stale)
// and the four settled non-ok outcomes. None of them may reach commitSelection.
async function runNonCurrentOutcomes(commitSelection) {
    const results = [];
    const stale = contractDouble();
    const staleFirst = deferred();
    const staleSecond = deferred();
    stale.state.resolvePatient = (identifierSystem, identifierValue) => (identifierValue === 'CIP-A' ? staleFirst.promise : staleSecond.promise);
    const staleFacade = facadeWith(stale.contract, commitSelection, () => []);
    const staleA = staleFacade.selectPatientByIdentifier(IDENTIFIER_SYSTEM, 'CIP-A');
    const staleB = staleFacade.selectPatientByIdentifier(IDENTIFIER_SYSTEM, 'CIP-B');
    staleSecond.resolve(notFound());
    results.push(await staleB);
    staleFirst.resolve(okResolve('A'));
    results.push(await staleA);
    for (const fixture of [sourceError, notFound, ambiguous, unavailable]) {
        const body = contractDouble();
        body.state.resolvePatient = fixture;
        const facade = facadeWith(body.contract, commitSelection, () => []);
        results.push(await facade.selectPatientByIdentifier(IDENTIFIER_SYSTEM, 'CIP-A'));
    }
    return results;
}

await test('9. A then B then A: only the newest request commits and nothing mixes patients', async () => {
    const { contract, state } = contractDouble();
    // Two A requests and one B request; both A deferreds resolve identically so the case does
    // not depend on which physical deferred a given request receives.
    const resolveA1 = deferred();
    const resolveA2 = deferred();
    const resolveB = deferred();
    const contextA1 = deferred();
    const contextA2 = deferred();
    const contextB = deferred();
    const resolveQueue = { 'CIP-A': [resolveA1, resolveA2], 'CIP-B': [resolveB] };
    const contextQueue = { 'patient-a': [contextA1, contextA2], 'patient-b': [contextB] };
    state.resolvePatient = (identifierSystem, identifierValue) => resolveQueue[identifierValue].shift().promise;
    state.readPatientContext = (patientId) => contextQueue[patientId].shift().promise;
    const commit = freshCommit();
    const facade = facadeWith(contract, commit.commitSelection, () => []);

    const first = facade.selectPatientByIdentifier(IDENTIFIER_SYSTEM, 'CIP-A');
    const second = facade.selectPatientByIdentifier(IDENTIFIER_SYSTEM, 'CIP-B');
    const third = facade.selectPatientByIdentifier(IDENTIFIER_SYSTEM, 'CIP-A');

    resolveA1.resolve(okResolve('A'));
    resolveA2.resolve(okResolve('A'));
    resolveB.resolve(okResolve('B'));
    await drain();
    contextA1.resolve(okContext('A'));
    contextA2.resolve(okContext('A'));
    contextB.resolve(okContext('B'));
    await drain();

    const resultFirst = await first;
    const resultSecond = await second;
    const resultThird = await third;

    assertSupersededSelection(resultFirst, 'req-1');
    assertSupersededSelection(resultSecond, 'req-2');
    assert.equal(resultThird.requestId, 'req-3');
    assert.equal(resultThird.superseded, false);
    assert.equal(resultThird.state, 'ok');
    assert.equal(resultThird.selected, true);
    assert.deepEqual(resultThird.patient, contextValue('A').patient);
    assert.deepEqual(resultThird.patient, commit.outcomes[0].patient);
    assert.deepEqual(resultThird.envelope, commit.outcomes[0].envelope);

    assert.equal(commit.calls.length, 1, 'only the newest request commits');
    const storedRaw = JSON.stringify(commit.storage.values[STORAGE_KEY]);
    assert.equal(storedRaw.includes('patient-a'), true);
    assert.equal(storedRaw.includes('patient-b'), false, 'no stored envelope mixes patients');
    assert.deepEqual(facade.status(), { state: 'ok', requestId: 'req-3', pending: false });
});

await test('10. non-current outcomes never commit', async () => {
    // REAL session with an injected storage double wrapped in the commit double: the stored
    // envelope must not change, no storage operation may be attempted, and commitSelection
    // must never be called. The seeded current patient is not dirty, so a buggy write would
    // not be masked by the dirty guard.
    const commit = seededCommit();
    (await runNonCurrentOutcomes(commit.commitSelection)).forEach(recordErrorCode);
    assertStoreUntouched(commit, 'non-current outcome');
    assert.equal(commit.outcomes.length, 0);
    assert.equal(commit.storage.values[STORAGE_KEY].includes('patient-a'), true, 'the seeded patient stays stored');
});

await test('11. dirty guard blocks first, then discards the previous patient before storing', async () => {
    const storage = memoryStorage();
    const real = sessionModule.create({ sessionStorage: storage });
    real.replacePatient(sessionSeed('A'), true);
    real.updateCurrent({ dirty: true });
    const dirtyRaw = storage.values[STORAGE_KEY];

    const { contract, state } = contractDouble();
    state.resolvePatient = () => okResolve('B');
    state.readPatientContext = () => okContext('B');
    const commit = commitDouble(real, storage);
    const facade = facadeWith(contract, commit.commitSelection, () => [candidate('B')]);

    storage.operations.length = 0;
    const blocked = await facade.selectPatientByValue('CIP-B');
    recordErrorCode(blocked);
    assert.equal(blocked.state, 'ok');
    assert.equal(blocked.selected, false);
    assert.equal(blocked.pendingChanges, true);
    assert.equal(blocked.patient, null);
    assert.equal(blocked.envelope, null);
    assert.equal(blocked.previousCip, null);
    // The commit capability consults the real session exactly once; it reports pending_changes
    // and the real session performs no purge.
    assert.equal(commit.calls.length, 1, 'the blocked branch consults the commit capability exactly once');
    assert.deepEqual(commit.outcomes[0], { status: 'pending_changes' });
    assert.equal(storage.values[STORAGE_KEY], dirtyRaw, 'blocked selection writes nothing');
    assert.equal(storage.operations.length, 0);

    const discarded = await facade.selectPatientByValue('CIP-B', { discardPendingChanges: true });
    recordErrorCode(discarded);
    assert.equal(discarded.state, 'ok');
    assert.equal(discarded.selected, true);
    assert.equal(discarded.pendingChanges, false);
    assert.deepEqual(discarded.patient, contextValue('B').patient);
    assert.deepEqual(discarded.patient, commit.outcomes[1].patient);
    assert.deepEqual(discarded.envelope, commit.outcomes[1].envelope);
    assert.equal(discarded.previousCip, 'CIP-A', 'previousCip comes from the commit outcome, not the facade');
    assert.equal(commit.calls.length, 2);
    const removeIndex = storage.operations.indexOf(`remove:${STORAGE_KEY}`);
    const setIndex = storage.operations.indexOf(`set:${STORAGE_KEY}`);
    assert.notEqual(removeIndex, -1);
    assert.notEqual(setIndex, -1);
    assert.equal(removeIndex < setIndex, true, 'previous patient is purged before the new one is stored');
    assert.equal(JSON.parse(storage.values[STORAGE_KEY]).patient_id, 'patient-b');
    assert.equal(storage.values[STORAGE_KEY].includes('patient-a'), false);
    assert.equal(facade.currentRequestId(), 'req-2');
});

await test('12. selectPatientByValue candidate semantics', async () => {
    // Zero candidates -> not_found, no resolution, no commit.
    {
        const body = contractDouble();
        const commit = seededCommit();
        const facade = facadeWith(body.contract, commit.commitSelection, () => []);
        const result = await facade.selectPatientByValue('CIP-Z');
        recordErrorCode(result);
        assert.equal(result.state, 'not_found');
        assert.equal(result.errorCode, null);
        assert.equal(result.selected, false);
        assert.equal(body.state.resolvePatientCalls.length, 0);
        assertStoreUntouched(commit, 'zero candidates');
    }
    // Two candidate entries for different patients -> ambiguous, resolvePatient never called.
    {
        const body = contractDouble();
        const commit = seededCommit();
        const facade = facadeWith(body.contract, commit.commitSelection, () => [candidate('A'), candidate('B')]);
        const result = await facade.selectPatientByValue('CIP-A');
        recordErrorCode(result);
        assert.equal(result.state, 'ambiguous');
        assert.equal(result.errorCode, 'IDENTIFIER_AMBIGUOUS');
        assert.equal(body.state.resolvePatientCalls.length, 0);
        assertStoreUntouched(commit, 'ambiguous candidates');
    }
    // Exactly one candidate whose F4.1 resolution returns a different patient_id -> error.
    {
        const body = contractDouble();
        body.state.resolvePatient = () => okResolve('B');
        const commit = seededCommit();
        const facade = facadeWith(body.contract, commit.commitSelection, () => [candidate('A')]);
        const result = await facade.selectPatientByValue('CIP-A');
        recordErrorCode(result);
        assert.equal(result.state, 'error');
        assert.equal(result.errorCode, 'SOURCE_READ_FAILED');
        assert.equal(body.state.readPatientContextCalls.length, 0);
        assertStoreUntouched(commit, 'mismatched patient_id');
    }
    // One candidate whose F4.1 resolution returns not_found -> mirrored, no commit.
    {
        const body = contractDouble();
        body.state.resolvePatient = () => notFound();
        const commit = seededCommit();
        const facade = facadeWith(body.contract, commit.commitSelection, () => [candidate('A')]);
        const result = await facade.selectPatientByValue('CIP-A');
        recordErrorCode(result);
        assert.equal(result.state, 'not_found');
        assert.equal(result.errorCode, null);
        assertStoreUntouched(commit, 'resolution not_found');
    }
    // Candidate dependency that throws -> unavailable, no commit.
    {
        const body = contractDouble();
        const commit = seededCommit();
        const facade = facadeWith(body.contract, commit.commitSelection, () => { throw new Error('synthetic selector failure'); });
        const result = await facade.selectPatientByValue('CIP-A');
        recordErrorCode(result);
        assert.equal(result.state, 'unavailable');
        assert.equal(result.errorCode, 'SOURCE_METHOD_UNAVAILABLE');
        assertStoreUntouched(commit, 'throwing candidate dependency');
    }
    // Candidate dependency returning a non-array -> same unavailable result, no commit.
    {
        const body = contractDouble();
        const commit = seededCommit();
        const facade = facadeWith(body.contract, commit.commitSelection, () => ({ candidates: [] }));
        const result = await facade.selectPatientByValue('CIP-A');
        recordErrorCode(result);
        assert.equal(result.state, 'unavailable');
        assert.equal(result.errorCode, 'SOURCE_METHOD_UNAVAILABLE');
        assertStoreUntouched(commit, 'non-array candidate dependency');
    }
});

await test('13. every produced errorCode belongs to the F4.1 vocabulary', () => {
    assert.equal(observedErrorCodes.size > 0, true, 'the oracle observed at least one errorCode');
    for (const code of observedErrorCodes) {
        assert.equal(ERROR_CODES.includes(code), true, `unexpected errorCode ${String(code)}`);
    }
});

await test('14. falsy and unknown fields survive the facade unchanged', async () => {
    const value = {
        patient: {
            patient_id: 'patient-a',
            identifiers: [identifierFor('A')],
            demographic_flags: { deceased: false, trial: false },
            counts: { active_lines: 0, visits: 0 },
            unknown_field: { nested_unknown: null }
        },
        request: { dose_text: '', route: null, induction: false, duration: 0 },
        unknown_container: { nested_unknown: null }
    };
    const expected = JSON.parse(JSON.stringify(value));
    const body = contractDouble();
    body.state.readPatientContext = () => f41({
        outcome: 'ok',
        value,
        completeness: 'partial',
        provenance: provenance('patient-a')
    });
    const commit = freshCommit();
    const facade = facadeWith(body.contract, commit.commitSelection, () => []);
    const result = await facade.loadPatientContext('patient-a');
    assert.deepEqual(result.value, expected);
    assert.equal(result.value.request.dose_text, '');
    assert.equal(result.value.request.route, null);
    assert.equal(Object.is(result.value.request.induction, false), true);
    assert.equal(Object.is(result.value.request.duration, 0), true);
    assert.equal(result.value.patient.unknown_field.nested_unknown, null);
    assert.equal(Object.hasOwn(result.value, 'absent_field'), false);
    assert.equal(commit.calls.length, 0);
});

await test('15. module source has no forbidden ambient dependency', () => {
    const source = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_patient_read_facade_v2.js'), 'utf8');
    for (const token of FORBIDDEN_SOURCE_TOKENS) {
        assert.equal(source.includes(token), false, `facade source must not reference ${token}`);
    }
});

await test('16. the facade commits only through the injected capability with the explicit candidate pair', async () => {
    const seen = [];
    const body = contractDouble();
    body.state.resolvePatient = () => okResolve('A');
    body.state.readPatientContext = () => okContext('A');
    const commit = freshCommit();
    const facade = facadeWith(body.contract, commit.commitSelection, (value) => { seen.push(value); return [candidate('A')]; });
    const result = await facade.selectPatientByValue('CIP-A');
    assert.equal(result.state, 'ok');
    assert.equal(result.selected, true);
    assert.deepEqual(seen, ['CIP-A'], 'the typed value reaches the injected dependency unchanged');
    assert.deepEqual(body.state.resolvePatientCalls, [{ identifier_system: IDENTIFIER_SYSTEM, identifier_value: 'CIP-A' }]);
    assert.equal(commit.calls.length, 1);
    // REVISION 1: the explicit candidate pair and the typed options reach the commit capability.
    assert.deepEqual(commit.calls[0].identifier, { identifier_system: IDENTIFIER_SYSTEM, identifier_value: 'CIP-A' });
    assert.equal(commit.calls[0].patientId, 'patient-a');
    assert.deepEqual(commit.calls[0].options, { discardPendingChanges: false });
    // A contract double that resolves successfully without a commit capability cannot build a
    // facade at all: create returns null.
    assert.equal(facadeModule.create({ contract: body.contract, identifierCandidates: () => [] }), null);
});

await test('17. a commit collaborator that throws, returns a non-object or an unknown status fails closed', async () => {
    const collaborators = [
        { label: 'throws', handler: () => { throw new Error('synthetic commit failure'); } },
        { label: 'returns a non-object', handler: () => null },
        { label: 'returns an unknown status', handler: () => ({ status: 'unexpected' }) }
    ];
    for (const collaborator of collaborators) {
        const body = contractDouble();
        body.state.resolvePatient = () => okResolve('A');
        body.state.readPatientContext = () => okContext('A');
        const commit = seededCommit();
        commit.state.handler = collaborator.handler;
        const facade = facadeWith(body.contract, commit.commitSelection, () => [candidate('A')]);
        const result = await facade.selectPatientByValue('CIP-A');
        recordErrorCode(result);
        assert.deepEqual(result, {
            state: 'error',
            requestId: 'req-1',
            superseded: false,
            selected: false,
            patient: null,
            envelope: null,
            previousCip: null,
            pendingChanges: false,
            errorCode: 'SOURCE_READ_FAILED'
        }, `commit collaborator that ${collaborator.label} must fail closed`);
        assert.equal(commit.calls.length, 1);
        assert.equal(commit.storage.values[STORAGE_KEY], commit.baseline, `no stored envelope change when the collaborator ${collaborator.label}`);
    }
});

await test('18. selected results expose patient, envelope and previousCip exactly as the commit outcome returned them', async () => {
    const body = contractDouble();
    body.state.resolvePatient = () => okResolve('A');
    body.state.readPatientContext = () => okContext('A');
    const sentinelEnvelope = { stored: 'sentinel-envelope', marker: 'opaque' };
    const sentinelPatient = { marker: 'sentinel-patient' };
    const commit = seededCommit();
    commit.state.handler = () => ({ status: 'active', envelope: sentinelEnvelope, patient: sentinelPatient, previousCip: 'CIP-Z' });
    const facade = facadeWith(body.contract, commit.commitSelection, () => [candidate('A')]);
    const result = await facade.selectPatientByValue('CIP-A');
    assert.equal(result.state, 'ok');
    assert.equal(result.selected, true);
    assert.deepEqual(result.patient, sentinelPatient, 'patient is exactly the commit outcome value');
    assert.deepEqual(result.envelope, sentinelEnvelope, 'envelope is exactly the commit outcome value');
    assert.equal(result.previousCip, 'CIP-Z');

    // A non-string previousCip is coerced to null, never a fabricated value (REVISION 1 step 4).
    const numeric = seededCommit();
    numeric.state.handler = () => ({ status: 'active', envelope: { marker: 'numeric' }, patient: { marker: 'numeric' }, previousCip: 42 });
    const numericResult = await facadeWith(body.contract, numeric.commitSelection, () => [candidate('A')]).selectPatientByValue('CIP-A');
    assert.equal(numericResult.selected, true);
    assert.equal(numericResult.previousCip, null);

    // A missing previousCip is null too, and an explicit true option reaches the collaborator typed.
    const missing = seededCommit();
    missing.state.handler = () => ({ status: 'active', envelope: { marker: 'missing' }, patient: { marker: 'missing' } });
    const missingResult = await facadeWith(body.contract, missing.commitSelection, () => [candidate('A')])
        .selectPatientByValue('CIP-A', { discardPendingChanges: true });
    assert.equal(missingResult.selected, true);
    assert.equal(missingResult.previousCip, null);
    assert.deepEqual(missing.calls[0].options, { discardPendingChanges: true });
});

if (failures.length > 0) {
    console.error(`farmacia_patient_read_facade_v2_check: FAIL (${passed} passed, ${failures.length} failed)`);
    process.exit(1);
}
console.log(`farmacia_patient_read_facade_v2_check: PASS (${passed} cases)`);
