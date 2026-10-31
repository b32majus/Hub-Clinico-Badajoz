import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Check focal EA v1 demo (#867): contrato de lectura V2 2.1.0, método de EA.
//
// Decisión de Sil (29-10-2026): el método nuevo de EA vive en V2 (contrato de
// entrada independiente de la fuente) y convive con el antiguo
// (`getAdverseEventsAndCausality` / `safety` de `readPatientContext`) hasta
// cerrar la transición. V1 no se toca.
//
// `readAdverseEventEpisodes(patientId)` pide a la fuente su método OPCIONAL
// `getAdverseEventEpisodes(patientId)`, que devuelve un resultado con la forma
// del lector C3a: `{ ok:true, patientRef, projection, state, actDates }` o
// `{ ok:false, error:{ code } }`. Cualquier fuente (Excel 166, BD local, APEX)
// entrega esa misma forma. V2 la envuelve en su envelope cerrado:
//   - patientId vacío                    → error / PATIENT_ID_INVALID
//   - la fuente no ofrece el método      → unavailable / SOURCE_METHOD_UNAVAILABLE
//   - la fuente lanza                    → error / SOURCE_READ_FAILED
//   - null/undefined o PATIENT_NOT_FOUND → not_found (ausente ≠ «sin EA»)
//   - otro ok:false o forma no utilizable → error / SOURCE_READ_FAILED
//   - ok:true utilizable → ok, completeness 'partial', value =
//     { patientRef, projection, state, actDates } saneado (sin claves físicas
//     prohibidas a ninguna profundidad), desacoplado de la fuente. `acts` y
//     `legacyRowCount` no se exponen.
// No se añaden outcomes ni códigos de error: el vocabulario 2.0.0 sigue
// cerrado. `readPatientContext` no cambia ni llama al método nuevo.
const paths = [
    'scripts/farmacia_export_v2_core.js',
    'scripts/farmacia_bridge_ea_typed_codec.js',
    'modules/farmacia_act_contract.js',
    'modules/farmacia_act_payloads.js',
    'modules/farmacia_ea_invariants.js',
    'modules/farmacia_ea_patient_projection.js',
    'modules/farmacia_ea_episode_state.js',
    'scripts/farmacia_bridge_raw_ea_v21_core.js',
    'scripts/farmacia_bridge_raw_ea_v21_reader.js',
    'modules/farmacia_ea_screen_model.js',
    'scripts/farmacia_patient_read_contract_v2.js'
];

function load() {
    const sandbox = { console: { log() {}, error() {}, warn() {} } };
    sandbox.window = sandbox;
    sandbox.HubTools = {};
    vm.createContext(sandbox);
    for (const path of paths) {
        assert.ok(fs.existsSync(path), `falta ${path}`);
        vm.runInContext(fs.readFileSync(path, 'utf8'), sandbox, { filename: path });
    }
    return sandbox;
}

function local(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return Array.from(value, local);
    return Object.fromEntries(Object.keys(value).map(key => [key, local(value[key])]));
}

function allKeys(value, out = []) {
    if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) {
            out.push(key);
            allKeys(value[key], out);
        }
    }
    return out;
}

function main() {
    const sandbox = load();
    const core = sandbox.FarmaciaBridgeRawEaV21Core;
    const reader = sandbox.FarmaciaBridgeRawEaV21Reader;
    const screen = sandbox.HubTools.farmaciaEaScreenModel;
    const contract = sandbox.FarmaciaPatientReadContractV2;

    // --- Fixture sintético (mismo que el lector C3a, reducido) --------------
    const P = 'PATREF-P';
    const event = (actId, date) => ({
        event_type: 'pharmacy_followup', event_id: `e-${actId}`, source_event_id: `s-${actId}`,
        event_status: 'recorded', occurred_at: `${date}T10:00:00Z`, recorded_at: `${date}T10:01:00Z`,
        demo_flag: true, patient_id: 'patient-syn-x', visit_id: `v-${actId}`,
        identifier_value: 'CIP-DEMO-X', visit_date: date
    });
    const ea = (actId, fields) => ({
        patientRef: P, actId, episode_id: 'E1', observation_id: 'O1',
        status: 'incorporated', description: 'Cefalea', ...fields
    });
    const refOf = o => Object.fromEntries(
        ['patientRef', 'actId', 'episode_id', 'observation_id'].map(key => [key, o[key]])
    );
    const buildAct = ({ actId, date, obs = [], history = [], present = 'si' }) =>
        core.buildFollowupRows({
            event: event(actId, date), actId, patientRef: P, present,
            activeLines: [], adverse_events: obs, history, selections: []
        });
    const o1 = ea('ACT-A', {
        suspicions: [
            { patientRef: P, episode_id: 'E1', medicationRef: 'MED-1' },
            { patientRef: P, episode_id: 'E1', medicationRef: 'MED-2' }
        ],
        evaluations: [{
            patientRef: P, actId: 'ACT-A', episode_id: 'E1', evaluation_id: 'EV-1', medicationRef: 'MED-1', method: 'naranjo'
        }]
    });
    const o2 = ea('ACT-B', { observation_id: 'O2', basis: refOf(o1), evolution: 'continuation', description: 'Cefalea persiste' });
    const rows = [
        ...buildAct({ actId: 'ACT-A', date: '2026-01-10', obs: [o1] }),
        ...buildAct({ actId: 'ACT-B', date: '2026-02-10', obs: [o2], history: [o1] }),
        ...buildAct({ actId: 'ACT-C', date: '2026-03-10', present: 'no' })
    ];

    // Fuente sintética: la identidad patient_id → patientRef es asunto de la
    // fuente (aquí, un mapa explícito). V2 sólo pasa el patientId recibido.
    const calls = [];
    const refs = { 'patient-p': P };
    const makeSource = (overrides = {}) => ({
        data_source_version: 'synthetic-1',
        findByIdentifier() { return null; },
        findByPatientId(id) { return id === 'patient-p' ? { patient_id: 'patient-p', identifiers: [] } : null; },
        getLatestRequestValidation() { return { latest_request: null, latest_validation: null }; },
        getVisitsAndLines() { return { visits: [], lines: [] }; },
        getProms() { return []; },
        getAdherence() { return []; },
        getAdverseEventsAndCausality() { return { adverse_events: [], causality_assessments: [] }; },
        getAdverseEventEpisodes(id) {
            calls.push(id);
            if (!refs[id]) return null;
            return reader.readPatient({ patientRef: refs[id], rows });
        },
        ...overrides
    });

    // 1. Superficie publicada.
    assert.equal(contract.CONTRACT_VERSION, '2.1.0');
    assert.ok(Object.isFrozen(contract));
    assert.deepEqual(Object.values(contract.OUTCOMES).sort(), ['ambiguous', 'error', 'not_found', 'ok', 'unavailable']);
    assert.deepEqual(Object.values(contract.ERROR_CODES).filter(Boolean).sort(), [
        'IDENTIFIER_AMBIGUOUS', 'IDENTIFIER_INVALID', 'PATIENT_ID_INVALID', 'SOURCE_METHOD_UNAVAILABLE', 'SOURCE_READ_FAILED'
    ], 'no se añaden códigos de error');
    const instance = contract.create({ source: makeSource() });
    assert.ok(Object.isFrozen(instance));
    assert.equal(instance.contract_version, '2.1.0');
    assert.deepEqual(Object.keys(instance), ['contract_version', 'resolvePatient', 'readPatientContext', 'readAdverseEventEpisodes']);

    // 2. Lectura correcta.
    const envelope = local(instance.readAdverseEventEpisodes('  patient-p  '));
    assert.deepEqual(Object.keys(envelope), ['outcome', 'value', 'errorCode', 'completeness', 'provenance', 'scope']);
    assert.equal(envelope.outcome, 'ok');
    assert.equal(envelope.errorCode, null);
    assert.equal(envelope.completeness, 'partial', 'nunca complete');
    assert.equal(envelope.scope, null);
    assert.deepEqual(envelope.provenance, {
        source_kind: 'application_read_contract_v2', contract_version: '2.1.0',
        source_version: 'synthetic-1', patient_id: 'patient-p', event_ids: []
    });
    assert.deepEqual(calls, ['patient-p'], 'una llamada, con el patientId recortado');
    assert.deepEqual(Object.keys(envelope.value), ['patientRef', 'projection', 'state', 'actDates']);
    assert.equal(envelope.value.patientRef, P);
    assert.equal(envelope.value.projection.uniqueEpisodeCount, 1);
    assert.equal(envelope.value.projection.observationCount, 2);
    assert.deepEqual(envelope.value.actDates, { 'ACT-A': '2026-01-10', 'ACT-B': '2026-02-10', 'ACT-C': '2026-03-10' });
    const e1 = envelope.value.state.episodes.find(e => e.episode_id === 'E1');
    assert.equal(e1.lastObservationId, 'O2');
    assert.equal(e1.lastDate, '2026-02-10', 'el acto `No` posterior no mueve el último registro');
    assert.equal(e1.closed, false);

    // El value alimenta el modelo de pantalla tal cual (consumidor de Tramo D).
    const model = local(screen.build({ ok: true, ...envelope.value }));
    assert.equal(model.ok, true, JSON.stringify(model.error ?? null));
    assert.equal(model.episodes[0].statusText, 'Último estado registrado: continúa, el 2026-02-10');
    assert.deepEqual(model.episodes[0].suspects, ['MED-1', 'MED-2']);

    // 3. Desacoplado y saneado.
    const first = instance.readAdverseEventEpisodes('patient-p');
    first.value.projection.episodes.length = 0;
    first.value.patientRef = 'MUTADO';
    assert.deepEqual(local(instance.readAdverseEventEpisodes('patient-p')), envelope, 'mutar el value no contamina la siguiente lectura');
    const planted = makeSource({
        getAdverseEventEpisodes() {
            const result = reader.readPatient({ patientRef: P, rows });
            result.projection.episodes[0].observations[0].row_id = 'PHYSICAL';
            result.projection.episodes[0].observations[0].canonical_row = { x: 1 };
            result.state.source_sheet = '01_DERMA';
            result.actDates.workbook = 'libro.xlsx';
            return result;
        }
    });
    const plantedEnvelope = local(contract.create({ source: planted }).readAdverseEventEpisodes('patient-p'));
    assert.equal(plantedEnvelope.outcome, 'ok');
    for (const forbidden of contract.FORBIDDEN_DTO_KEYS) {
        assert.ok(!allKeys(plantedEnvelope).includes(forbidden), `clave física prohibida expuesta: ${forbidden}`);
    }

    // 4. Ausente ≠ «sin EA»; fallos cerrados con el vocabulario existente.
    const outcomeOf = (source, ...args) => {
        const id = args.length ? args[0] : 'patient-p';
        const env = local(contract.create({ source }).readAdverseEventEpisodes(id));
        return [env.outcome, env.errorCode, env.value];
    };
    for (const bad of ['', '   ', null, undefined, 7]) {
        assert.deepEqual(outcomeOf(makeSource(), bad), ['error', 'PATIENT_ID_INVALID', null]);
    }
    assert.deepEqual(outcomeOf(makeSource({ getAdverseEventEpisodes: undefined })), ['unavailable', 'SOURCE_METHOD_UNAVAILABLE', null],
        'una fuente sin el método nuevo no dice «sin EA»');
    assert.deepEqual(outcomeOf(makeSource({ getAdverseEventEpisodes() { throw new Error('x'); } })), ['error', 'SOURCE_READ_FAILED', null]);
    assert.deepEqual(outcomeOf(makeSource(), 'patient-unknown'), ['not_found', null, null]);
    assert.deepEqual(outcomeOf(makeSource({ getAdverseEventEpisodes() { return undefined; } })), ['not_found', null, null]);
    assert.deepEqual(outcomeOf(makeSource({
        getAdverseEventEpisodes() { return { ok: false, error: { code: 'PATIENT_NOT_FOUND', message: 'x' } }; }
    })), ['not_found', null, null]);
    for (const code of ['UNKNOWN_BASIS', 'INVALID_ROW_SET', 'DUPLICATE_ACT_ID']) {
        assert.deepEqual(outcomeOf(makeSource({
            getAdverseEventEpisodes() { return { ok: false, error: { code, message: 'x' } }; }
        })), ['error', 'SOURCE_READ_FAILED', null], `${code} no se muestra como dato parcial`);
    }
    const valid = () => reader.readPatient({ patientRef: P, rows });
    const malformed = [
        'x', 3, [], {}, { ok: true },
        (() => { const r = valid(); delete r.patientRef; return r; })(),
        (() => { const r = valid(); r.projection = null; return r; })(),
        (() => { const r = valid(); r.projection.ok = false; return r; })(),
        (() => { const r = valid(); r.projection.episodes = 'x'; return r; })(),
        (() => { const r = valid(); r.state = null; return r; })(),
        (() => { const r = valid(); r.state.ok = false; return r; })(),
        (() => { const r = valid(); r.state.episodes = {}; return r; })(),
        (() => { const r = valid(); r.actDates = []; return r; })()
    ];
    for (const result of malformed) {
        assert.deepEqual(outcomeOf(makeSource({ getAdverseEventEpisodes() { return result; } })), ['error', 'SOURCE_READ_FAILED', null]);
    }

    // 5. `readPatientContext` no cambia y no llama al método nuevo.
    calls.length = 0;
    const context = local(instance.readPatientContext('patient-p'));
    assert.equal(context.outcome, 'ok');
    assert.deepEqual(Object.keys(context.value), ['patient', 'request', 'validation', 'visits', 'lines', 'proms', 'adherence', 'safety']);
    assert.deepEqual(context.value.safety, { adverse_events: [], causality_assessments: [] });
    assert.deepEqual(calls, [], 'readPatientContext no usa el método nuevo');

    console.log('farmacia_patient_read_contract_v2_ea_check OK');
}

main();
