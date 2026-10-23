import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Check focal FH-EA R1: identidad longitudinal, revisión expresa y evolución
// explícita. Carga el módulo puro en un contexto aislado (sin DOM, paciente
// activo ni almacenamiento) y no modifica ninguna suite existente.
//
// Representación técnica elegida para la declaración expresa de revisión:
//   review: { confirmed: true, unchanged: <boolean> }
// `unchanged` es informativo: la revisión acredita la observación con y sin
// cambios. La fábrica devuelve SOLO datos de declaración; no invoca el dominio
// ni completa identidad, estado, descripción, basis ni evolución.
export function reviewDeclaration({ unchanged } = {}) {
    return { review: { confirmed: true, unchanged: unchanged === true } };
}

const modulePath = 'modules/farmacia_ea_invariants.js';

function main() {
    assert.ok(fs.existsSync(modulePath), 'falta el módulo puro de invariantes EA');

    const sandbox = { window: { HubTools: {} }, console: { log() {}, error() {} } };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(modulePath, 'utf8'), sandbox, { filename: modulePath });
    const api = sandbox.window.HubTools.farmaciaEaInvariants;
    assert.equal(typeof api?.validateNewEvents, 'function', 'validateNewEvents debe conservarse');
    assert.equal(typeof api?.validateObservations, 'function', 'validateObservations debe existir');
    const validate = api.validateObservations;

    // Convierte sólo prototipos de reino, preservando undefined y claves propias.
    function local(value) {
        if (!value || typeof value !== 'object') return value;
        if (Array.isArray(value)) return Array.from(value, local);
        return Object.fromEntries(Object.keys(value).map(key => [key, local(value[key])]));
    }

    const ref = source => Object.fromEntries(
        ['patientRef', 'actId', 'episode_id', 'observation_id'].map(key => [key, source[key]])
    );
    const omit = (value, ...keys) => {
        const copy = structuredClone(value);
        for (const key of keys) delete copy[key];
        return copy;
    };

    const old = {
        patientRef: 'P-A',
        actId: 'ACT-Z',
        episode_id: 'E-A',
        observation_id: 'O-1',
        status: 'incorporated',
        description: 'Mismo texto',
        medications: ['M'],
        notes: { raw: ['original'] }
    };

    const bareFollowup = (extra = {}) => ({
        patientRef: 'P-A',
        actId: 'ACT-A',
        episode_id: 'E-A',
        observation_id: 'O-2',
        status: 'incorporated',
        basis: ref(old),
        ...extra
    });
    const reviewed = (extra = {}) => bareFollowup({ ...reviewDeclaration({ unchanged: true }), ...extra });

    const request = (events = [], extra = {}) => ({
        patientRef: 'P-A',
        actId: 'ACT-A',
        present: events.some(event => event.status === 'incorporated') ? 'si' : 'no_consta',
        adverse_events: events,
        history: [structuredClone(old)],
        selections: [],
        ...extra
    });

    function run(input) {
        const before = structuredClone(input);
        const output = local(validate(input));
        assert.deepEqual(input, before, 'la entrada permanece intacta en todo camino');
        return output;
    }

    function good(input) {
        const output = run(input);
        assert.equal(output.ok, true, JSON.stringify(output));
        assert.deepEqual(output.representation, {
            patientRef: input.patientRef,
            actId: input.actId,
            present: input.present,
            adverse_events: input.adverse_events.filter(event => event.status === 'incorporated')
        });
        assert.deepEqual(output.retained, input.adverse_events.filter(event => event.status === 'draft'));
        assert.deepEqual(output.history, input.history, 'la historia se conserva completa');
        assert.deepEqual(output.selections, input.selections, 'las selecciones se conservan completas');
        return output;
    }

    function bad(input, expectedCode) {
        const output = run(input);
        assert.equal(output.ok, false, 'asociación insegura rechazada');
        assert.equal(typeof output.error?.code, 'string');
        assert.equal(typeof output.error?.message, 'string');
        assert.deepEqual(Object.keys(output).sort(), ['error', 'ok'], 'fallo atómico sin representación parcial');
        if (expectedCode) assert.equal(output.error.code, expectedCode);
        return output;
    }

    // 1. Identidad longitudinal: el episodio se conserva entre actos y cada
    // observación tiene identidad propia. El mismo texto/medicamento no fusiona.
    good(request([reviewed()]));
    const copyText = {
        ...omit(bareFollowup(), 'basis'),
        episode_id: 'E-NEW',
        description: 'Mismo texto',
        medications: ['M']
    };
    good(request([copyText]));
    good(request([copyText, { ...copyText, episode_id: 'E-OTHER', observation_id: 'O-3' }]));
    console.log('PASS identidad longitudinal / texto y medicamentos iguales no fusionan');

    // 2. Seleccionar sólo conserva la selección; revisión expresa habilita una
    // observación propia sin repetir descripción ni datos clínicos.
    for (const present of ['no', 'no_consta']) {
        good(request([], { present, selections: [ref(old)] }));
        bad(request([reviewed()], { present }));
    }
    bad(request([], { present: 'si', selections: [ref(old)] }));
    good(request([bareFollowup(reviewDeclaration({ unchanged: false }))]));
    good(request([reviewed({ description: 'No contiene un token clínico de revisión' })]));
    bad(request([bareFollowup()]));
    bad(request([bareFollowup({ description: 'revisado sin cambios' })]));
    bad(request([omit(copyText, 'description')]));
    console.log('PASS selección sola / revisión expresa / sin revisión implícita / ficha nueva');

    // 3. Continuación, resolución y recurrencia sólo si se declaran.
    for (const evolution of ['continuation', 'resolution']) {
        good(request([bareFollowup({ evolution })]));
    }
    const recurrence = { ...copyText, basis: ref(old), evolution: 'recurrence' };
    good(request([recurrence]));
    bad(request([omit(recurrence, 'description')]));
    bad(request([{ ...recurrence, episode_id: old.episode_id }]));
    bad(request([omit(recurrence, 'basis')]));
    bad(request([{ ...reviewed(), episode_id: 'E-NEW' }]));
    bad(request([bareFollowup({ evolution: 'persiste' })]));
    const plain = good(request([copyText]));
    assert.equal('evolution' in plain.representation.adverse_events[0], false);
    assert.equal('basis' in plain.representation.adverse_events[0], false);
    const priorFollowup = reviewed({ evolution: 'resolution' });
    const third = reviewed({ actId: 'ACT-0', observation_id: 'O-3', basis: ref(priorFollowup) });
    good(request([third], { actId: 'ACT-0', history: [old, priorFollowup] }));
    console.log('PASS evolución expresa / recurrencia / sin inferencia / cronología opaca');

    // 4. Tuplas completas: referencias ausentes, intercambiadas o
    // contradictorias; contexto actual; observación reutilizada.
    for (const key of ['patientRef', 'actId', 'episode_id', 'observation_id']) {
        bad(request([reviewed({ basis: omit(ref(old), key) })]));
        bad(request([reviewed({ basis: { ...ref(old), [key]: 'ausente' } })]));
        bad(request([omit(reviewed(), key)]));
        bad(request([reviewed()], { history: [omit(old, key)] }));
        bad(request([], { selections: [omit(ref(old), key)] }));
    }
    bad(request([reviewed({ basis: { ...ref(old), actId: old.episode_id, episode_id: old.actId } })]));
    bad(request([reviewed({ basis: { ...ref(old), patientRef: old.actId, actId: old.patientRef } })]));
    bad(request([reviewed({ patientRef: 'P-B' })]));
    bad(request([reviewed({ actId: 'ACT-B' })]));
    bad(request([reviewed()], { history: [{ ...old, patientRef: 'P-B' }] }));
    bad(request([reviewed()], { history: [{ ...old, actId: 'ACT-A' }] }));
    bad(request([reviewed({ observation_id: 'O-1' })]));
    bad(request([reviewed(), reviewed({ episode_id: 'E-NEW', basis: undefined, description: 'Otro' })]));
    bad(request([reviewed()], { history: [old, { ...old, episode_id: 'E-OTHER' }] }));
    const otherHistory = { ...old, actId: 'ACT-Y', episode_id: 'E-B', observation_id: 'O-B' };
    bad(request([reviewed({ basis: { ...ref(old), observation_id: 'O-B' } })], { history: [old, otherHistory] }));
    bad(request([reviewed({ basis: { ...ref(old), episode_id: 'E-B' } })], { history: [old, otherHistory] }));
    bad(request([], { selections: [{ ...ref(old), episode_id: 'E-OTHER' }] }));
    for (const key of ['patientRef', 'actId', 'history', 'selections']) bad(omit(request(), key));
    console.log('PASS tuplas / contexto actual / observación duplicada');

    // 5. Estados y borradores: no/no_consta no alteran historia; los
    // borradores se retienen sin acreditar revisión.
    const draft = bareFollowup({ status: 'draft', description: '', notes: { raw: ['borrador'] } });
    good(request([draft]));
    for (const present of ['no', 'no_consta']) {
        good(request([draft], { present, selections: [ref(old)] }));
        bad(request([reviewed()], { present }));
    }
    bad(request([], { present: 'si' }));
    console.log('PASS matriz de estados / historia intacta / borradores');

    // 6. Determinismo, aislamiento profundo A→B→A y fallo atómico.
    const input = request([reviewed(), draft], { selections: [ref(old)] });
    input.adverse_events[1].observation_id = 'O-DRAFT';
    const before = structuredClone(input);
    const first = validate(input);
    const second = validate(input);
    assert.equal(first.ok, true);
    assert.deepEqual(local(first), local(second), 'resultado determinista');
    first.history[0].notes.raw.push('salida');
    first.retained[0].notes.raw.push('salida');
    first.representation.adverse_events[0].basis.actId = 'cambiado';
    first.selections[0].episode_id = 'cambiado';
    assert.deepEqual(input, before, 'las salidas no editan la entrada');
    input.history[0].notes.raw.push('entrada');
    input.adverse_events[0].basis.actId = 'entrada';
    assert.deepEqual(local(second), good(before), 'entradas y salidas independientes');

    const b = { patientRef: 'P-B', actId: 'ACT-B', present: 'no', adverse_events: [], history: [], selections: [] };
    good(b);
    bad({ ...b, adverse_events: [reviewed()], present: 'si' });
    good(before);
    good(b);
    const bHistory = { ...old, patientRef: 'P-B', actId: 'B-OLD', episode_id: 'B-E', observation_id: 'B-O1' };
    const bEvent = {
        ...reviewed(),
        patientRef: 'P-B',
        actId: 'ACT-B',
        episode_id: 'B-E',
        observation_id: 'B-O2',
        basis: ref(bHistory)
    };
    good({ ...b, present: 'si', history: [bHistory], adverse_events: [bEvent] });
    good(before);
    console.log('PASS determinismo / aislamiento profundo / A-B-A / fallo atómico');

    console.log('PASS farmacia_ea_r1_identity_check');
}

const invoked = process.argv[1] ? fs.realpathSync(process.argv[1]) : '';
const self = fs.realpathSync(new URL(import.meta.url));
if (invoked === self) main();
