import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Check focal FH-EA R1: ausencias, fecha única del acto, sospechas y
// evaluaciones explícitas. Carga el módulo puro en un contexto aislado, sin
// DOM, paciente activo ni almacenamiento, y no modifica ninguna suite
// existente. No crea un DTO clínico: sólo comprueba que los validadores
// conservan datos explícitos y rechazan asociaciones incoherentes.
const modulePath = 'modules/farmacia_ea_invariants.js';
assert.ok(fs.existsSync(modulePath), 'falta el módulo puro de invariantes EA');

const sandbox = { window: { HubTools: {} }, console: { log() {}, error() {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(modulePath, 'utf8'), sandbox, { filename: modulePath });
const api = sandbox.window.HubTools.farmaciaEaInvariants;
assert.equal(typeof api?.validateNewEvents, 'function', 'validateNewEvents debe conservarse');
assert.equal(typeof api?.validateObservations, 'function', 'validateObservations debe conservarse');

// Convierte sólo prototipos de reino, preservando undefined y claves propias.
function local(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return Array.from(value, local);
    return Object.fromEntries(Object.keys(value).map(key => [key, local(value[key])]));
}
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const ficha = (extra = {}) => ({
    patientRef: 'P-A',
    actId: 'ACT-A',
    episode_id: 'E-A',
    observation_id: 'O-A',
    status: 'incorporated',
    description: ' Dolor original ',
    ...extra
});
const request = (events = [], extra = {}) => ({
    patientRef: 'P-A',
    actId: 'ACT-A',
    present: events.some(event => event.status === 'incorporated') ? 'si' : 'no_consta',
    adverse_events: events,
    history: [],
    selections: [],
    ...extra
});

function run(input, method) {
    const before = structuredClone(input);
    const output = local(api[method](input));
    assert.deepEqual(input, before, 'la entrada permanece intacta en todo camino');
    return output;
}

function good(input, method) {
    const output = run(input, method);
    assert.equal(output.ok, true, JSON.stringify(output));
    const expected = {
        patientRef: input.patientRef,
        actId: input.actId,
        present: input.present,
        adverse_events: input.adverse_events.filter(event =>
            event.status === 'incorporated' && event.actId === input.actId)
    };
    if (hasOwn(input, 'occurredAt')) expected.occurredAt = local(input.occurredAt);
    assert.deepEqual(output.representation, expected, 'sólo datos explícitos y la fecha del acto');
    assert.deepEqual(output.retained, input.adverse_events.filter(event =>
        event.status === 'draft' || event.actId !== input.actId));
    if (method === 'validateObservations') {
        assert.deepEqual(output.history, input.history, 'la historia se conserva completa');
        assert.deepEqual(output.selections, input.selections);
    }
    return output;
}

function bad(input, method) {
    const output = run(input, method);
    assert.equal(output.ok, false, 'asociación incoherente rechazada');
    assert.deepEqual(Object.keys(output).sort(), ['error', 'ok'], 'fallo atómico sin representación parcial');
    assert.equal(typeof output.error?.code, 'string');
    assert.equal(typeof output.error?.message, 'string');
    return output;
}

const methods = ['validateNewEvents', 'validateObservations'];

// 1. Ausencias y centinelas: missing ≠ own undefined ≠ null ≠ cadena vacía
// ≠ 0 ≠ false. Tampoco se normalizan NO_VALUE, No informado ni texto literal.
for (const method of methods) {
    const absent = ficha();
    const ownUndefined = ficha({ onset: undefined });
    const absentOutput = good(request([absent]), method);
    const undefinedOutput = good(request([ownUndefined]), method);
    assert.equal(hasOwn(absentOutput.representation.adverse_events[0], 'onset'), false);
    assert.equal(hasOwn(undefinedOutput.representation.adverse_events[0], 'onset'), true);
    assert.equal(undefinedOutput.representation.adverse_events[0].onset, undefined);

    const sentinels = [null, '', 0, false, 'NO_VALUE', 'No informado', '  literal  ', '  desconocido  '];
    for (const value of sentinels) {
        const output = good(request([ficha({
            onset: value,
            resolution: value,
            duration: value,
            authorRef: value,
            treatment: value,
            severity: value,
            evolution: value,
            course: value,
            action: value,
            suspicions: value,
            evaluations: value
        })]), method);
        const preserved = output.representation.adverse_events[0];
        for (const key of ['onset', 'resolution', 'duration', 'authorRef', 'treatment', 'severity', 'evolution', 'course', 'action', 'suspicions', 'evaluations']) {
            assert.equal(hasOwn(preserved, key), true);
            assert.equal(preserved[key], value, `${key} se conserva literal`);
        }
        assert.equal(hasOwn(output.representation, 'occurredAt'), false, 'ausencia de fecha no se completa');
    }

    const literal = good(request([ficha({
        onset: '2026-01-02',
        resolution: null,
        notes: { raw: ['  literal  ', undefined, false, 0] }
    })], { occurredAt: '2026-10-23T12:00:00Z' }), method);
    assert.equal(literal.representation.adverse_events[0].onset, '2026-01-02');
    assert.equal(literal.representation.adverse_events[0].resolution, null);
    assert.deepEqual(literal.representation.adverse_events[0].notes.raw, ['  literal  ', undefined, false, 0]);
}
console.log('PASS ausencias / centinelas / own undefined / fechas clínicas literales');

// 2. Fecha del acto: se transporta exactamente una vez si es propia y no se
// proyecta como inicio, resolución, duración ni evolución.
for (const method of methods) {
    const withDate = good(request([ficha()], { occurredAt: '2026-10-23T12:00:00Z' }), method);
    assert.equal(withDate.representation.occurredAt, '2026-10-23T12:00:00Z');
    assert.equal(hasOwn(withDate.representation, 'occurredAt'), true);
    assert.deepEqual(Object.keys(withDate.representation).sort(), ['actId', 'adverse_events', 'occurredAt', 'patientRef', 'present']);
    assert.deepEqual(Object.keys(withDate.representation.adverse_events[0]).sort(), ['actId', 'description', 'episode_id', 'observation_id', 'patientRef', 'status']);

    const noDate = good(request([ficha()]), method);
    assert.equal(hasOwn(noDate.representation, 'occurredAt'), false);
    assert.equal(hasOwn(noDate.representation.adverse_events[0], 'onset'), false);

    for (const value of [undefined, null, '', 0, false, 'NO_VALUE', 'No informado', '  literal  ']) {
        const output = good(request([ficha()], { occurredAt: value }), method);
        assert.equal(hasOwn(output.representation, 'occurredAt'), true, 'la propiedad propia se devuelve');
        assert.equal(output.representation.occurredAt, value);
    }
}
console.log('PASS fecha única del acto / sin proyección clínica / ausencia no completada');

// 3. Medicamentos listados, prescritos o históricos no son sospechosos; la
// selección es expresa y por episodio. Una revisión sin cambios no copia la
// clínica histórica al registro actual y una recurrencia no hereda sospechas.
const commentary = { declared: true };
for (const method of methods) {
    const listed = ficha({
        medications: ['M', 'M2'],
        prescribed: ['M2'],
        historicalMedications: ['M'],
        visualScores: { naranjo: 0, karchLasagna: 0 },
        commentary
    });
    const listedOutput = good(request([listed]), method);
    const listedEvent = listedOutput.representation.adverse_events[0];
    assert.deepEqual(listedEvent.medications, ['M', 'M2']);
    assert.deepEqual(listedEvent.prescribed, ['M2']);
    assert.deepEqual(listedEvent.historicalMedications, ['M']);
    assert.equal(hasOwn(listedEvent, 'suspicions'), false, 'ningún listado se convierte en sospecha');
    assert.equal(hasOwn(listedEvent, 'evaluations'), false, 'ningún cero visual se convierte en evaluación');
}

const historical = ficha({
    actId: 'ACT-B',
    episode_id: 'E-B',
    observation_id: 'O-B',
    description: 'Episodio previo',
    severity: 'grave',
    onset: '2025-01-01',
    suspicions: [{ patientRef: 'P-A', episode_id: 'E-B', medicationRef: 'M' }],
    evaluations: [{
        evaluation_id: 'EV-B',
        patientRef: 'P-A',
        episode_id: 'E-B',
        medicationRef: 'M',
        method: 'naranjo',
        actId: 'ACT-B',
        result: 0,
        responses: [false, undefined],
        state: 'completed'
    }]
});
const basis = { patientRef: 'P-A', actId: 'ACT-B', episode_id: 'E-B', observation_id: 'O-B' };

{
    const reviewed = good(request([
        ficha({
            episode_id: 'E-B',
            basis,
            review: { confirmed: true, unchanged: true },
            description: undefined,
            // Sin datos clínicos actuales: no se copian del histórico.
            suspicions: []
        })
    ], { history: [structuredClone(historical)] }), 'validateObservations');
    const current = reviewed.representation.adverse_events[0];
    assert.equal(hasOwn(current, 'onset'), false);
    assert.equal(hasOwn(current, 'severity'), false);
    assert.deepEqual(current.suspicions, []);
    assert.equal(hasOwn(current, 'evaluations'), false, 'la revisión no copia evaluaciones históricas');
    assert.equal(reviewed.history[0].severity, 'grave');
    assert.equal(reviewed.history[0].evaluations[0].evaluation_id, 'EV-B');

    const recurrence = good(request([
        ficha({
            episode_id: 'E-REC',
            observation_id: 'O-REC',
            basis,
            evolution: 'recurrence',
            description: 'Recurrencia',
            medications: ['M'],
            prescribed: ['M'],
            historicalMedications: ['M']
        })
    ], { history: [structuredClone(historical)] }), 'validateObservations');
    assert.equal(hasOwn(recurrence.representation.adverse_events[0], 'suspicions'), false, 'la recurrencia no hereda sospechas');
    assert.equal(recurrence.history[0].suspicions.length, 1, 'el episodio previo conserva su sospecha');
}
console.log('PASS medicamentos no sospechosos / revisión sin copia / recurrencia sin herencia');

// 4. Causalidad no inferida: un cero de presentación no acredita evaluación;
// un cero documentado sí se conserva. Identidad, pareja, método y acto se
// mantienen separados, incluidos borradores y reevaluaciones en otro acto.
const evaluation = (observation, medicationRef, method, evaluationId, extra = {}) => ({
    evaluation_id: evaluationId,
    patientRef: observation.patientRef,
    episode_id: observation.episode_id,
    medicationRef,
    method,
    actId: observation.actId,
    ...extra
});

for (const method of methods) {
    const visualZero = good(request([ficha({ visualScores: { naranjo: 0, karchLasagna: 0 } })]), method);
    assert.equal(hasOwn(visualZero.representation.adverse_events[0], 'evaluations'), false);
    assert.deepEqual(visualZero.representation.adverse_events[0].visualScores, { naranjo: 0, karchLasagna: 0 });

    const documentedZero = good(request([ficha({
        evaluations: [evaluation(ficha(), 'M', 'naranjo', 'ZERO', { result: 0 })]
    })]), method);
    assert.equal(documentedZero.representation.adverse_events[0].evaluations[0].result, 0);
}

const matrix = ['E-1', 'E-2'].map((episodeId, episodeIndex) => {
    const observation = ficha({ episode_id: episodeId, observation_id: `O-${episodeIndex}` });
    observation.suspicions = ['M', 'M2'].map(medicationRef => ({
        patientRef: observation.patientRef,
        episode_id: observation.episode_id,
        medicationRef
    }));
    observation.evaluations = ['M', 'M2'].flatMap((medicationRef, medicationIndex) =>
        ['naranjo', 'karch_lasagna'].map((clinicalMethod, methodIndex) =>
            evaluation(observation, medicationRef, clinicalMethod, `EV-${episodeIndex}-${medicationIndex}-${methodIndex}`, {
                result: episodeIndex * 10 + medicationIndex * 2 + methodIndex,
                responses: [episodeIndex, medicationIndex, methodIndex],
                state: methodIndex ? 'draft' : 'completed'
            })));
    return observation;
});
for (const method of methods) {
    const output = good(request(matrix), method);
    output.representation.adverse_events.forEach((event, index) => {
        assert.equal(event.suspicions.length, 2);
        assert.equal(event.evaluations.length, 4);
        assert.deepEqual([...new Set(event.evaluations.map(item => item.medicationRef))].sort(), ['M', 'M2']);
        assert.deepEqual([...new Set(event.evaluations.map(item => item.method))].sort(), ['karch_lasagna', 'naranjo']);
        assert.equal(new Set(event.evaluations.map(item => item.evaluation_id)).size, 4);
        assert.equal(event.evaluations.filter(item => item.state === 'draft').length, 2);
        assert.equal(event.episode_id, matrix[index].episode_id);
    });
}

const laterEvaluation = evaluation({ patientRef: 'P-A', actId: 'ACT-C', episode_id: 'E-1' }, 'M', 'naranjo', 'EV-C', {
    result: 9,
    responses: [true]
});
const reevaluation = good(request([
    ficha({
        actId: 'ACT-C',
        observation_id: 'O-C',
        episode_id: 'E-1',
        basis: { patientRef: 'P-A', actId: 'ACT-A', episode_id: 'E-1', observation_id: 'O-0' },
        review: { confirmed: true },
        evaluations: [laterEvaluation]
    })
], { actId: 'ACT-C', history: [structuredClone(matrix[0])] }), 'validateObservations');
assert.equal(reevaluation.representation.adverse_events[0].evaluations.length, 1);
assert.equal(reevaluation.representation.adverse_events[0].evaluations[0].actId, 'ACT-C');
assert.equal(reevaluation.history[0].evaluations.length, 4);
assert.deepEqual(reevaluation.history[0].evaluations.map(item => item.actId), ['ACT-A', 'ACT-A', 'ACT-A', 'ACT-A']);
console.log('PASS cero visual no evaluado / cero documentado / matriz episodio-medicamento-método / reevaluación sin sobrescritura');

// 5. Contaminación y referencias: ausentes, cruzadas o de otro acto fallan de
// forma atómica. Las evaluaciones históricas permanecen en su acto original.
for (const method of methods) {
    const validSuspicion = { patientRef: 'P-A', episode_id: 'E-A', medicationRef: 'M' };
    const validEvaluation = evaluation(ficha(), 'M', 'naranjo', 'EV-A');

    for (const key of ['patientRef', 'episode_id', 'medicationRef']) {
        const missing = { ...validSuspicion };
        delete missing[key];
        bad(request([ficha({ suspicions: [missing] })]), method);
    }
    for (const key of ['evaluation_id', 'patientRef', 'episode_id', 'medicationRef', 'method', 'actId']) {
        const missing = { ...validEvaluation };
        delete missing[key];
        bad(request([ficha({ evaluations: [missing] })]), method);
    }
    for (const key of ['patientRef', 'episode_id']) {
        bad(request([ficha({ suspicions: [{ ...validSuspicion, [key]: 'OTRO' }] })]), method);
        bad(request([ficha({ evaluations: [{ ...validEvaluation, [key]: 'OTRO' }] })]), method);
    }
    bad(request([ficha({ evaluations: [{ ...validEvaluation, actId: 'OTRO' }] })]), method);
    bad(request([ficha({
        suspicions: [{ ...validSuspicion, patientRef: 'E-A', episode_id: 'P-A' }]
    })]), method);
    bad(request([ficha({
        evaluations: [{ ...validEvaluation, patientRef: 'E-A', episode_id: 'P-A' }]
    })]), method);
    bad(request([ficha(), ficha({
        episode_id: 'E-2',
        observation_id: 'O-2',
        suspicions: [validSuspicion]
    })]), method);
    bad(request([ficha(), ficha({
        episode_id: 'E-2',
        observation_id: 'O-2',
        evaluations: [validEvaluation]
    })]), method);

    const mixed = request([
        ficha(),
        ficha({ episode_id: 'E-2', observation_id: 'O-2', evaluations: [{ ...validEvaluation, actId: 'ACT-X' }] }),
        ficha({ episode_id: 'E-3', observation_id: 'O-3' })
    ]);
    const failed = bad(mixed, method);
    assert.equal('representation' in failed, false);
}

const pollutedHistory = structuredClone(matrix[0]);
pollutedHistory.evaluations[0].actId = 'ACT-OTRO';
bad(request([ficha({
    actId: 'ACT-C',
    observation_id: 'O-C',
    basis: { patientRef: 'P-A', actId: 'ACT-A', episode_id: 'E-1', observation_id: 'O-0' },
    review: { confirmed: true }
})], { actId: 'ACT-C', history: [pollutedHistory] }), 'validateObservations');
const pollutedSuspicion = structuredClone(matrix[0]);
pollutedSuspicion.suspicions[0].episode_id = 'E-2';
bad(request([ficha({
    actId: 'ACT-C',
    observation_id: 'O-C',
    basis: { patientRef: 'P-A', actId: 'ACT-A', episode_id: 'E-1', observation_id: 'O-0' },
    review: { confirmed: true }
})], { actId: 'ACT-C', history: [pollutedSuspicion] }), 'validateObservations');
console.log('PASS referencias ausentes / cruzadas / episodio ajeno / acto histórico contaminado / fallo atómico');

// 6. Determinismo, aislamiento profundo y A→B→A.
const seeded = ficha({
    actId: 'ACT-C',
    episode_id: 'E-1',
    observation_id: 'O-C',
    basis: { patientRef: 'P-A', actId: 'ACT-A', episode_id: 'E-1', observation_id: 'O-0' },
    review: { confirmed: true },
    evaluations: [evaluation({ patientRef: 'P-A', actId: 'ACT-C', episode_id: 'E-1' }, 'M', 'naranjo', 'EV-C', {
        responses: [true, false, undefined]
    })]
});
const isolationInput = request([seeded], {
    actId: 'ACT-C',
    history: [structuredClone(matrix[0])],
    occurredAt: { raw: ['  literal  '] }
});
const first = api.validateObservations(isolationInput);
const second = api.validateObservations(isolationInput);
const saved = local(api.validateObservations(structuredClone(isolationInput)));
assert.deepEqual(local(first), local(second), 'resultado determinista');
first.history[0].evaluations[0].responses.push('salida');
first.representation.adverse_events[0].evaluations[0].responses.push('salida');
first.representation.occurredAt.raw.push('salida');
assert.deepEqual(isolationInput.history[0].evaluations[0].responses, [0, 0, 0]);
assert.deepEqual(isolationInput.adverse_events[0].evaluations[0].responses, [true, false, undefined]);
assert.deepEqual(isolationInput.occurredAt.raw, ['  literal  ']);
isolationInput.history[0].evaluations[0].responses.push('entrada');
isolationInput.adverse_events[0].evaluations[0].responses.push('entrada');
assert.deepEqual(local(second), saved, 'entradas y salidas independientes');

const otherPatient = {
    patientRef: 'P-B',
    actId: 'ACT-B',
    present: 'no',
    adverse_events: [],
    history: [],
    selections: []
};
good(otherPatient, 'validateObservations');
bad({ ...otherPatient, present: 'si', adverse_events: [ficha()] }, 'validateObservations');
good(request([ficha()]), 'validateObservations');
good(otherPatient, 'validateObservations');
console.log('PASS determinismo / aislamiento profundo / A-B-A');

console.log('PASS farmacia_ea_r1_clinical_data_check');
