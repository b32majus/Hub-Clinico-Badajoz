#!/usr/bin/env node
// Oracle for the WU-B runtime explicit-commit capability (#428 Part 5, B1/B4).
//
// It exercises the ADDITIVE runtime capability `commitExplicitSelection(identifier, patientId, options)`
// and `createPatientReadFacade()` with an in-memory application data port plus injected
// storage/location/history/crypto, mirroring tools/farmacia_patient_flow_cutover_check.mjs.
//
// Fail-closed choices where the frozen text is silent (documented next to the assertion):
// - the `active` outcome exposes exactly {status, patient, envelope, previousCip};
//   `pending_changes` and `unavailable` expose exactly {status};
// - "without a session" is modelled by a runtime whose session module yields no session object,
//   which must still answer {status:'unavailable'} and write nothing;
// - per-patient reads that carry 0/false/'' are asserted on the raw-cloned groups; the
//   validation_context projection keeps its existing `present()` semantics (empty text dropped),
//   so empty-string survival is asserted through latest_request/proms/safety instead.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await import(path.join(ROOT, 'scripts/farmacia_current_patient_session.js'));
await import(path.join(ROOT, 'scripts/farmacia_patient_flow_runtime.js'));

const sessionModule = globalThis.FarmaciaCurrentPatientSession;
const runtimeModule = globalThis.FarmaciaPatientFlowRuntime;

if (!sessionModule || !runtimeModule) {
    console.error('farmacia_patient_flow_explicit_commit_check: FAIL — runtime/session modules did not publish their globals');
    process.exit(1);
}

let facadeModulesReady = true;
try {
    await import(path.join(ROOT, 'scripts/farmacia_patient_read_contract_v2.js'));
    await import(path.join(ROOT, 'scripts/farmacia_patient_read_facade_v2.js'));
} catch (error) {
    facadeModulesReady = false;
}

const STORAGE_KEY = sessionModule.STORAGE_KEY;
const IDENTIFIER_SYSTEM = 'urn:cip:synthetic';

let passed = 0;
const failures = [];

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
// Fixtures (synthetic only) and doubles.
// ---------------------------------------------------------------------------
const clone = value => (value === undefined ? undefined : structuredClone(value));

function explicitIdentifier(letter) {
    return { identifier_system: IDENTIFIER_SYSTEM, identifier_value: `CIP-${letter}` };
}

const SUMMARIES = [
    { patient_id: 'patient-a', identifiers: [explicitIdentifier('A')] },
    { patient_id: 'patient-b', identifiers: [explicitIdentifier('B')] },
    { patient_id: 'patient-x', identifiers: [{ identifier_system: 'urn:one', identifier_value: 'CIP-X' }] },
    { patient_id: 'patient-y', identifiers: [{ identifier_system: 'urn:two', identifier_value: 'CIP-X' }] }
];

function defaultRequestValidation() {
    return {
        latest_request: {
            requested_drug_name: 'Solicitado sintético',
            requested_dose_text: 0,
            requested_induction_status: false,
            requested_route: ''
        },
        latest_validation: {
            validation_result: 'validated',
            validated_drug_name: 'Validado sintético',
            validated_dose_text: ''
        }
    };
}

function syntheticLine() {
    return {
        line_id: 'line-a',
        treatment_id: 't-line-a',
        snapshot: {
            line_id: 'line-a',
            active_at_event: true,
            line_status_at_event: 'active',
            line_role: 'primary',
            is_primary_line: true,
            line_drug_name: 'Activo sintético',
            line_active_ingredient: 'PA sintético',
            line_dose_text: 0,
            line_route: '',
            line_schedule_label: ''
        }
    };
}

function defaultVisits() {
    return { visits: [], latest_first_visit: null, latest_followup: null, lines: [syntheticLine()] };
}

function defaultProms() {
    return [{ source_event_id: 'prom-1', values: { proms_json: { measurements: [{ instrument: 'PROM-X', value: 0, date: '2026-08-01' }] } } }];
}

function defaultAdherence() {
    return [{ source_event_id: 'adh-1', values: { adherence_result: '0', adherence_answers_json: { answer: false, note: '' } } }];
}

function defaultSafety() {
    return {
        adverse_events: [{
            source_event_id: 'followup-a',
            values: {
                adverse_event_id: 'ea-a', adverse_event_status: 'present',
                adverse_event_description: 'Evento sintético', adverse_event_severity: 'mild',
                adverse_event_suspects_json: [{ suspect_ref: 'line-a' }]
            }
        }],
        causality_assessments: [{
            source_event_id: 'followup-a',
            values: { causality_assessments_json: [{ suspect_ref: 'line-a', method: 'SYNTHETIC', score: 0, assessed: false }] }
        }]
    };
}

function defaultEvents(patientId) {
    return [{
        patient_id: patientId,
        event_type: 'pharmacy_validation',
        source_event_id: `${patientId}-pharmacy_validation`,
        rows: [{ canonical_row: { patient_id: patientId, event_type: 'pharmacy_validation', hemogram_verified: true, biochemistry_verified: false } }]
    }];
}

function defaultProvenance(patientId) {
    return [{ patient_id: patientId, source_event_id: `${patientId}-source` }];
}

// In-memory application data port. It is BOTH the V1 runtime port (per-patient reads used by the
// commit) and a valid F4.1 read source (findByIdentifier/findByPatientId + the six read methods),
// plus the adjacent findIdentifierCandidatesByValue seam. `listPatients`/`getPopulationProjection`
// are counted so a population read can never pass unnoticed.
function createPort() {
    const counters = { listPatients: 0, populationProjection: 0, projection: 0, reads: [] };
    const port = {
        data_source_version: '1.0.0',
        listPatients() { counters.listPatients += 1; return clone(SUMMARIES); },
        getPopulationProjection() { counters.populationProjection += 1; return clone(SUMMARIES); },
        findByIdentifier(identifierSystem, identifierValue) {
            const system = String(identifierSystem || '').trim();
            const value = String(identifierValue || '').trim().toUpperCase();
            const match = SUMMARIES.find(summary => summary.identifiers.some(identifier =>
                identifier.identifier_system === system
                && String(identifier.identifier_value).trim().toUpperCase() === value));
            return match ? clone(match) : null;
        },
        findByPatientId(patientId) {
            const match = SUMMARIES.find(summary => summary.patient_id === patientId);
            return match ? clone(match) : null;
        },
        findIdentifierCandidatesByValue(value) {
            const target = String(value === null || value === undefined ? '' : value).trim().toUpperCase();
            if (!target) return [];
            const candidates = [];
            SUMMARIES.forEach(summary => summary.identifiers.forEach(identifier => {
                if (String(identifier.identifier_value).trim().toUpperCase() === target) {
                    candidates.push({
                        identifier_system: identifier.identifier_system,
                        identifier_value: identifier.identifier_value,
                        patient_id: summary.patient_id
                    });
                }
            }));
            return candidates;
        },
        getPatientProjection(patientId) {
            counters.projection += 1;
            counters.reads.push(`projection:${patientId}`);
            return { patient_id: patientId, services: [{ code: 'DERM', label: 'Dermatología' }], pathologies: [{ code: 'HS', label: 'Hidradenitis supurativa' }] };
        },
        getPatientEvents(patientId) {
            counters.reads.push(`events:${patientId}`);
            return clone(defaultEvents(patientId));
        },
        getLatestRequestValidation(patientId) {
            counters.reads.push(`request:${patientId}`);
            return clone(defaultRequestValidation());
        },
        getVisitsAndLines(patientId) {
            counters.reads.push(`visits:${patientId}`);
            return clone(defaultVisits());
        },
        getProms(patientId) {
            counters.reads.push(`proms:${patientId}`);
            return clone(defaultProms());
        },
        getAdherence(patientId) {
            counters.reads.push(`adherence:${patientId}`);
            return clone(defaultAdherence());
        },
        getAdverseEventsAndCausality(patientId) {
            counters.reads.push(`safety:${patientId}`);
            return clone(defaultSafety());
        },
        getInternalProvenance(patientId) {
            counters.reads.push(`provenance:${patientId}`);
            return clone(defaultProvenance(patientId));
        }
    };
    return { port, counters };
}

function memoryStorage() {
    const values = new Map();
    const operations = [];
    return {
        get length() { return values.size; },
        key(index) { return [...values.keys()][index] ?? null; },
        getItem(key) { operations.push(`get:${key}`); return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { operations.push(`set:${key}`); values.set(key, String(value)); },
        removeItem(key) { operations.push(`remove:${key}`); values.delete(key); },
        values,
        operations
    };
}

function makeLocation(search) {
    return { href: `http://local/farmacia_index.html${search}`, pathname: '/farmacia_index.html', search, hash: '' };
}

function makeHarness(options = {}) {
    const storage = options.storage || memoryStorage();
    const search = options.search === undefined ? '' : options.search;
    const location = makeLocation(search);
    const history = {
        replaceState(_state, _title, url) {
            const parsed = new URL(url, location.href);
            location.href = parsed.href;
            location.pathname = parsed.pathname;
            location.search = parsed.search;
            location.hash = parsed.hash;
        }
    };
    const portInfo = options.portInfo || createPort();
    const runtime = runtimeModule.create({
        sessionModule: options.sessionModule || sessionModule,
        sessionStorage: storage,
        dataPort: options.dataPort === undefined ? portInfo.port : options.dataPort,
        location,
        history,
        confirm: options.confirm || (() => true),
        crypto: options.crypto || { randomUUID: () => 'generation-fixed' }
    });
    return { runtime, storage, location, portInfo, counters: portInfo.counters };
}

function storedEnvelope(storage) {
    const raw = storage.getItem(STORAGE_KEY);
    return raw === null ? null : JSON.parse(raw);
}

function storageSnapshot(storage) {
    return JSON.stringify([...storage.values.entries()]);
}

function control(id, { tagName = 'INPUT', type = 'text', value = '', checked = false, readOnly = false } = {}) {
    return { id, tagName, type, value, checked, readOnly, closest: () => null };
}

function draftScope(controls) {
    const listeners = { input: [], change: [] };
    return {
        querySelectorAll: () => controls,
        addEventListener(type, listener) { listeners[type].push(listener); },
        emit(type, target) { listeners[type].forEach(listener => listener({ target })); }
    };
}

// ---------------------------------------------------------------------------
// Cases.
// ---------------------------------------------------------------------------
await test('1. commitExplicitSelection is published and returns the active outcome', () => {
    const { runtime } = makeHarness();
    assert.equal(typeof runtime.commitExplicitSelection, 'function', 'commitExplicitSelection must be published on the runtime instance');
    const result = runtime.commitExplicitSelection(explicitIdentifier('A'), 'patient-a');
    assert.deepEqual(Object.keys(result).sort(), ['envelope', 'patient', 'previousCip', 'status']);
    assert.equal(result.status, 'active');
    assert.equal(result.previousCip, '', 'first selection has no previous identifier value');
    assert.equal(result.envelope.patient_id, 'patient-a');
    assert.deepEqual(result.envelope.identifier, explicitIdentifier('A'));
    assert.deepEqual(result.patient, result.envelope.patient_projection.patient);
});

await test('2. the stored envelope carries identity, projection and populated explicit_data', () => {
    const { runtime, storage } = makeHarness();
    const result = runtime.commitExplicitSelection(explicitIdentifier('A'), 'patient-a');
    assert.equal(result.status, 'active');
    const envelope = storedEnvelope(storage);
    assert.ok(envelope, 'an envelope must be stored');
    assert.deepEqual(envelope.identifier, explicitIdentifier('A'));
    assert.equal(envelope.patient_id, 'patient-a');
    assert.equal(typeof envelope.generation, 'string');
    assert.notEqual(envelope.generation.trim(), '', 'generation must be non-empty');
    assert.equal(envelope.patient_projection.patient_id, envelope.patient_id);
    const projection = envelope.patient_projection.patient;
    assert.equal(projection.patient_id, envelope.patient_id);
    assert.equal(projection.cip, envelope.identifier.identifier_value, 'the mapped patient cip is the explicit identifier value');
    assert.equal(projection.__farmaciaRawPatient, true, 'the projection is the mapPatient-shaped patient');

    const explicit = envelope.explicit_data;
    const expected = defaultRequestValidation();
    assert.deepEqual(explicit.latest_request, expected.latest_request);
    assert.deepEqual(explicit.latest_validation, expected.latest_validation);
    assert.deepEqual(explicit.visits_and_lines, defaultVisits());
    assert.deepEqual(explicit.proms, defaultProms());
    assert.deepEqual(explicit.adherence, defaultAdherence());
    assert.deepEqual(explicit.safety, defaultSafety());
    assert.deepEqual(explicit.validation_context, { hemogram_verified: true, biochemistry_verified: false });
    assert.deepEqual(explicit.event_metadata, {
        'patient-a-pharmacy_validation': { visit_date: '', occurred_at: '', recorded_at: '' }
    });
    assert.deepEqual(envelope.provenance, defaultProvenance('patient-a'));
    assert.deepEqual(envelope.drafts, {});
    assert.equal(envelope.dirty, false);
});

await test('3. the URL carries cip, patient_id, identifier_system and generation and drops the nav marker', () => {
    const { runtime, location } = makeHarness({ search: `?${runtimeModule.NAV_MARKER}=1` });
    const result = runtime.commitExplicitSelection(explicitIdentifier('A'), 'patient-a');
    assert.equal(result.status, 'active');
    const params = new URLSearchParams(location.search);
    assert.equal(params.get('cip'), 'CIP-A');
    assert.equal(params.get('patient_id'), 'patient-a');
    assert.equal(params.get('identifier_system'), IDENTIFIER_SYSTEM);
    assert.equal(params.get('generation'), result.envelope.generation, 'URL generation equals the stored envelope generation');
    assert.equal(params.has(runtimeModule.NAV_MARKER), false, 'the navigation marker is removed');
});

await test('4. a patient change purges the previous residue before writing and returns previousCip', () => {
    const { runtime, storage } = makeHarness();
    assert.equal(runtime.commitExplicitSelection(explicitIdentifier('A'), 'patient-a').status, 'active');
    storage.setItem('patient-draft', JSON.stringify({ cip: 'CIP-A', note: 'synthetic residue' }));
    storage.operations.length = 0;
    const result = runtime.commitExplicitSelection(explicitIdentifier('B'), 'patient-b');
    assert.equal(result.status, 'active');
    assert.equal(result.previousCip, 'CIP-A', 'previousCip is the previous identifier value');
    const removeIndex = storage.operations.findIndex(operation => operation.startsWith('remove:'));
    const finalSetIndex = storage.operations
        .map((operation, index) => [operation, index])
        .filter(([operation]) => operation === `set:${STORAGE_KEY}`)
        .at(-1)[1];
    assert.notEqual(removeIndex, -1, 'the previous residue must be removed');
    assert.ok(removeIndex < finalSetIndex, 'purge happens before the new patient is written');
    assert.equal([...storage.values.values()].join('\n').includes('CIP-A'), false, 'no previous patient residue survives');
});

await test('5. a dirty patient needs an explicit discard before the commit writes', () => {
    const { runtime, storage } = makeHarness();
    assert.equal(runtime.commitExplicitSelection(explicitIdentifier('A'), 'patient-a').status, 'active');
    const scope = draftScope([control('draft-note', { value: 'A draft' })]);
    runtime.savePageDraft('validacion', scope);
    const before = storageSnapshot(storage);
    storage.operations.length = 0;
    const pending = runtime.commitExplicitSelection(explicitIdentifier('B'), 'patient-b');
    assert.deepEqual(pending, { status: 'pending_changes' });
    assert.equal(storageSnapshot(storage), before, 'a pending change writes nothing');
    assert.equal(
        storage.operations.some(operation => operation.startsWith('set:') || operation.startsWith('remove:')),
        false,
        'a pending change issues no storage write or removal'
    );
    const active = runtime.commitExplicitSelection(explicitIdentifier('B'), 'patient-b', { discardPendingChanges: true });
    assert.equal(active.status, 'active');
    assert.equal(storedEnvelope(storage).patient_id, 'patient-b', 'an explicit discard proceeds and writes');
});

await test('6. the commit never uses the population listPatients operation', () => {
    const { runtime, counters } = makeHarness();
    counters.listPatients = 0;
    counters.populationProjection = 0;
    counters.reads.length = 0;
    const result = runtime.commitExplicitSelection(explicitIdentifier('A'), 'patient-a');
    assert.equal(result.status, 'active');
    assert.equal(counters.listPatients, 0, 'listPatients must never be used to commit an explicit selection');
    assert.equal(counters.populationProjection, 0, 'no population operation may be used');
    assert.ok(counters.reads.includes('projection:patient-a'), 'the commit reads the patient projection');
    assert.ok(counters.reads.includes('visits:patient-a'), 'the commit reads per-patient groups');
});

await test('7. a runtime without a data port or session fails closed with unavailable', () => {
    const noPort = makeHarness({ dataPort: null });
    const noPortResult = noPort.runtime.commitExplicitSelection(explicitIdentifier('A'), 'patient-a');
    assert.deepEqual(noPortResult, { status: 'unavailable' });
    assert.equal(noPort.storage.values.size, 0, 'no port means no stored envelope');

    const noSession = makeHarness({ sessionModule: { create: () => null } });
    const noSessionResult = noSession.runtime.commitExplicitSelection(explicitIdentifier('A'), 'patient-a');
    assert.deepEqual(noSessionResult, { status: 'unavailable' });
    assert.equal(noSession.storage.values.size, 0, 'no session means no stored envelope');
});

await test('8. zero, false and empty-string reads survive into explicit_data', () => {
    const info = createPort();
    const request = {
        latest_request: { requested_dose_text: 0, requested_weight_text: false, requested_route: '' },
        latest_validation: { validated_dose_text: 0, line_creation_status: false, validation_denial_reason: '' }
    };
    const proms = [{ source_event_id: 'prom-falsy', values: { proms_json: { measurements: [{ instrument: 'PROM-F', value: 0, ok: false, note: '' }] } } }];
    const adherence = [{ source_event_id: 'adh-falsy', values: { adherence_result: '0', adherence_answers_json: { answer: false, note: '' } } }];
    const safety = { adverse_events: [], causality_assessments: [], marker_zero: 0, marker_false: false, marker_empty: '' };
    info.port.getLatestRequestValidation = () => clone(request);
    info.port.getProms = () => clone(proms);
    info.port.getAdherence = () => clone(adherence);
    info.port.getAdverseEventsAndCausality = () => clone(safety);
    info.port.getPatientEvents = patientId => [{
        patient_id: patientId,
        event_type: 'pharmacy_validation',
        source_event_id: `${patientId}-pharmacy_validation`,
        rows: [{ canonical_row: { patient_id: patientId, hemogram_verified: false, analysis_recent_status: 'not_recorded' } }]
    }];

    const { runtime, storage } = makeHarness({ portInfo: info });
    assert.equal(runtime.commitExplicitSelection(explicitIdentifier('A'), 'patient-a').status, 'active');
    const explicit = storedEnvelope(storage).explicit_data;
    assert.deepEqual(explicit.latest_request, request.latest_request);
    assert.deepEqual(explicit.latest_validation, request.latest_validation);
    assert.deepEqual(explicit.proms, proms);
    assert.deepEqual(explicit.adherence, adherence);
    assert.deepEqual(explicit.safety, safety);
    assert.equal(explicit.validation_context.hemogram_verified, false, 'false survives the validation context');
});

await test('9. createPatientReadFacade integrates the runtime commit through selectPatientByValue', async () => {
    assert.ok(facadeModulesReady, 'the F4.1 contract and facade modules must load');
    const direct = makeHarness();
    const directResult = direct.runtime.commitExplicitSelection(explicitIdentifier('A'), 'patient-a');
    assert.equal(directResult.status, 'active');

    const integrated = makeHarness();
    assert.equal(typeof integrated.runtime.createPatientReadFacade, 'function', 'createPatientReadFacade must be published');
    const facade = integrated.runtime.createPatientReadFacade();
    assert.ok(facade, 'a facade is created when the port and modules are present');
    assert.equal(typeof facade.selectPatientByValue, 'function');
    const result = await facade.selectPatientByValue('CIP-A');
    assert.equal(result.state, 'ok');
    assert.equal(result.selected, true);
    assert.deepEqual(result.envelope, directResult.envelope, 'the facade selection ends with the same session envelope');
    assert.deepEqual(integrated.runtime.getCurrentEnvelope(), directResult.envelope, 'the stored envelope matches the direct commit');
    assert.equal(integrated.counters.listPatients, 0, 'the integrated path still avoids the population read');

    const noPort = makeHarness({ dataPort: null });
    assert.equal(noPort.runtime.createPatientReadFacade(), null, 'no data port means no facade');
});

await test('10. legacy selectByCip keeps selected, not_found and ambiguous', () => {
    const { runtime } = makeHarness();
    assert.equal(runtime.selectByCip('CIP-A').status, 'selected');
    assert.equal(runtime.selectByCip('CIP-MISSING').status, 'not_found');
    assert.equal(runtime.selectByCip('CIP-X').status, 'ambiguous');
});

if (failures.length > 0) {
    console.error(`farmacia_patient_flow_explicit_commit_check: FAIL (${passed} passed, ${failures.length} failed)`);
    process.exit(1);
}
console.log(`PASS (${passed} cases)`);
