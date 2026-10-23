import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Check focal FH-EA R1: corrección y anulación de registros finalizados sin
// pérdida de la revisión anterior (D07). Carga el módulo puro en un contexto
// aislado (sin DOM, paciente activo, reloj ni almacenamiento), no crea un
// envelope F4.4 y no modifica ninguna suite existente.
//
// La revisión es un vínculo técnico entre dos registros ya finalizados: la
// operación declara `correction` o `annulment`, la revisión nueva es
// estrictamente mayor y `amendment` conserva el motivo y la revisión recibida.
// Una anulación se expresa como revisión nueva; no borra la anterior.
const modulePath = 'modules/farmacia_ea_invariants.js';
assert.ok(fs.existsSync(modulePath), 'falta el módulo puro de invariantes EA');

const sandbox = { window: { HubTools: {} }, console: { log() {}, error() {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(modulePath, 'utf8'), sandbox, { filename: modulePath });
const api = sandbox.window.HubTools.farmaciaEaInvariants;
assert.equal(typeof api?.validateNewEvents, 'function', 'validateNewEvents debe conservarse');
assert.equal(typeof api?.validateObservations, 'function', 'validateObservations debe conservarse');
assert.equal(typeof api?.validateRevision, 'function', 'validateRevision debe existir');
const validate = api.validateRevision;

// Convierte sólo prototipos de reino, preservando undefined y claves propias.
function local(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return Array.from(value, local);
    return Object.fromEntries(Object.keys(value).map(key => [key, local(value[key])]));
}

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const omit = (value, ...keys) => {
    const copy = structuredClone(value);
    for (const key of keys) delete copy[key];
    return copy;
};

const finalized = (extra = {}) => ({
    patientRef: 'P-A',
    actId: 'ACT-A',
    episode_id: 'E-A',
    observation_id: 'O-A',
    status: 'incorporated',
    revision: 1,
    description: '  descripción original  ',
    notes: { raw: [undefined, null, '', 0, false] },
    suspicions: [{ patientRef: 'P-A', episode_id: 'E-A', medicationRef: 'M-A' }],
    evaluations: [{
        patientRef: 'P-A',
        actId: 'ACT-A',
        episode_id: 'E-A',
        medicationRef: 'M-A',
        method: 'naranjo',
        evaluation_id: 'EV-A',
        responses: [true],
        result: 0
    }],
    ...extra
});

const request = (operation = 'correction') => {
    const previous = finalized();
    return {
        operation,
        previous,
        next: {
            ...structuredClone(previous),
            revision: 2,
            description: 'corregida',
            amendment: { previousRevision: 1, reason: '  error de transcripción  ' }
        }
    };
};

function run(input) {
    const before = structuredClone(input);
    const output = local(validate(input));
    assert.deepEqual(input, before, 'la entrada permanece intacta en todo camino');
    return output;
}

function good(input) {
    const output = run(input);
    assert.equal(output.ok, true, JSON.stringify(output));
    assert.deepEqual(Object.keys(output).sort(), ['next', 'ok', 'operation', 'previous']);
    assert.equal(output.operation, input.operation);
    assert.deepEqual(output.previous, input.previous, 'la revisión anterior se recupera íntegra');
    assert.deepEqual(output.next, input.next, 'la revisión nueva es explícita, sin defaults');
    assert.deepEqual(run(input), output, 'las operaciones repetidas son deterministas');
    return output;
}

function bad(input) {
    const output = run(input);
    assert.equal(output.ok, false, 'la revisión inválida debe fallar cerrada');
    assert.deepEqual(Object.keys(output).sort(), ['error', 'ok'], 'fallo atómico sin representación parcial');
    assert.equal(typeof output.error?.code, 'string');
    assert.equal(typeof output.error?.message, 'string');
    return output;
}

// 1. Corrección y anulación expresas; salto de revisión permitido (> no +1).
for (const operation of ['correction', 'annulment']) {
    good(request(operation));
    const jump = request(operation);
    jump.next.revision = 5;
    good(jump);
}
for (const operation of ['selection', 'deletion', '', undefined, null, true]) {
    bad({ ...request(), operation });
}
console.log('PASS corrección / anulación / operación inválida / salto de revisión');

// 2. F4.4: amendment exacto, motivo no vacío y referencia a la revisión recibida.
for (const operation of ['correction', 'annulment']) {
    for (const reason of [undefined, null, '', '   ', 0, false]) {
        const input = request(operation);
        input.next.amendment.reason = reason;
        bad(input);
    }
    for (const key of ['amendment', 'revision']) {
        const input = request(operation);
        delete input.next[key];
        bad(input);
    }
    for (const key of ['previousRevision', 'reason']) {
        const input = request(operation);
        delete input.next.amendment[key];
        bad(input);
    }
    for (const previousRevision of [0, 2, 9, 1.5, '1', null]) {
        const input = request(operation);
        input.next.amendment.previousRevision = previousRevision;
        bad(input);
    }
    for (const revision of [0, 1, 1.5, '2', null]) {
        const input = request(operation);
        input.next.revision = revision;
        bad(input);
    }
    const extra = request(operation);
    extra.next.amendment.extra = true;
    bad(extra);
    const absent = request(operation);
    delete absent.previous.revision;
    bad(absent);
}
console.log('PASS amendment / motivo / enlace / enteros / revisión ausente');

// 3. Identidades explícitas, completas y coincidentes; ambos finalizados.
for (const operation of ['correction', 'annulment']) {
    for (const key of ['patientRef', 'actId', 'episode_id', 'observation_id']) {
        for (const side of ['previous', 'next']) {
            const missing = request(operation);
            delete missing[side][key];
            bad(missing);
            const wrong = request(operation);
            wrong[side][key] = 'OTHER';
            bad(wrong);
        }
    }
    const swapped = request(operation);
    [swapped.next.patientRef, swapped.next.episode_id] = [swapped.next.episode_id, swapped.next.patientRef];
    bad(swapped);
    for (const side of ['previous', 'next']) {
        const draft = request(operation);
        draft[side].status = 'draft';
        bad(draft);
    }
}
console.log('PASS identidades / cruce / borrador');

// 4. Sospechas y evaluaciones coherentes con su propio registro en ambas
// revisiones. Desvincular no borra los datos de la revisión anterior.
for (const operation of ['correction', 'annulment']) {
    for (const collection of ['suspicions', 'evaluations']) {
        for (const side of ['previous', 'next']) {
            const wrongEpisode = request(operation);
            wrongEpisode[side][collection][0].episode_id = 'E-OTHER';
            bad(wrongEpisode);
            const wrongPatient = request(operation);
            wrongPatient[side][collection][0].patientRef = 'P-B';
            bad(wrongPatient);
        }
    }
    const wrongAct = request(operation);
    wrongAct.next.evaluations[0].actId = 'ACT-B';
    bad(wrongAct);
    const wrongMedication = request(operation);
    wrongMedication.next.suspicions[0].medicationRef = '';
    bad(wrongMedication);
}
const delinked = request();
delete delinked.next.suspicions;
delete delinked.next.evaluations;
const delinkedOutput = good(delinked);
assert.deepEqual(delinkedOutput.previous.suspicions, finalized().suspicions, 'la sospecha histórica permanece');
assert.deepEqual(delinkedOutput.previous.evaluations, finalized().evaluations, 'la evaluación histórica permanece');
console.log('PASS asociaciones clínicas / desvinculación conserva historia');

// 5. Centinelas y ausencias se conservan; no se autorrellenan tiempos,
// autoría ni datos clínicos desde la revisión anterior.
for (const operation of ['correction', 'annulment']) {
    const input = request(operation);
    delete input.next.description;
    delete input.next.severity;
    delete input.next.onset;
    input.next.occurredAt = undefined;
    for (const key of ['authoredAt', 'authorRef', 'resolution', 'severity']) {
        input.next[key] = null;
    }
    const output = good(input);
    assert.equal(hasOwn(output.next, 'description'), false, 'no se completa la descripción');
    assert.equal(hasOwn(output.next, 'occurredAt'), true, 'undefined propio se conserva');
    assert.equal(output.next.occurredAt, undefined);
    assert.equal(output.next.authoredAt, null);
    assert.equal(output.next.authorRef, null);
    for (const value of [undefined, null, '', 0, false, 'NO_VALUE']) {
        const sentinel = request(operation);
        for (const key of ['occurredAt', 'authoredAt', 'authorRef', 'onset', 'resolution', 'severity']) {
            sentinel.next[key] = value;
        }
        const sentinelOutput = good(sentinel);
        for (const key of ['occurredAt', 'authoredAt', 'authorRef', 'onset', 'resolution', 'severity']) {
            assert.deepEqual(sentinelOutput.next[key], value, 'el centinela se conserva');
        }
    }
}
console.log('PASS ausencias / undefined propio / centinelas sin autorrelleno');

// 6. Determinismo, aislamiento profundo, reintentos y A/B/A sin contexto oculto.
const input = request();
const expected = good(input);
const first = run(input);
const second = run(input);
first.previous.notes.raw.push('salida');
first.next.evaluations[0].responses.push('salida');
assert.deepEqual(local(second), expected, 'las salidas no comparten referencias editables');
assert.deepEqual(input, request(), 'las salidas no editan la entrada');
input.previous.notes.raw.push('entrada');
input.next.notes.raw.push('entrada');
assert.deepEqual(local(second), expected, 'la entrada no comparte referencias con la salida');

const other = request();
for (const side of ['previous', 'next']) {
    other[side].patientRef = 'P-B';
    delete other[side].suspicions;
    delete other[side].evaluations;
}
good(other);
good(request());
good(other);
console.log('PASS determinismo / aislamiento profundo / reintentos / A-B-A');

// 7. Revisión encadenada: la nueva revisión puede corregirse de nuevo.
const chain = request();
chain.previous = structuredClone(chain.next);
chain.next = {
    ...structuredClone(chain.previous),
    revision: 3,
    amendment: { previousRevision: 2, reason: 'segunda corrección' }
};
good(chain);
console.log('PASS revisión encadenada');

// 8. Regresión: una observación del mismo episodio en otro acto entra por
// validateObservations, conserva el acto previo y no exige amendment.
const basis = { patientRef: 'P-A', actId: 'ACT-A', episode_id: 'E-A', observation_id: 'O-A' };
const visit = {
    patientRef: 'P-A',
    actId: 'ACT-B',
    present: 'si',
    history: [finalized()],
    selections: [],
    adverse_events: [{
        patientRef: 'P-A',
        actId: 'ACT-B',
        episode_id: 'E-A',
        observation_id: 'O-B',
        status: 'incorporated',
        basis,
        review: { confirmed: true, unchanged: true }
    }]
};
const visitBefore = structuredClone(visit);
const observed = local(api.validateObservations(visit));
assert.equal(observed.ok, true, JSON.stringify(observed));
assert.deepEqual(visit, visitBefore, 'validateObservations no muta su entrada');
assert.deepEqual(observed.history, [finalized()], 'el acto previo y su observación se conservan');
assert.equal(observed.representation.adverse_events[0].observation_id, 'O-B');
assert.equal(hasOwn(observed.representation.adverse_events[0], 'amendment'), false);
console.log('PASS mismo episodio en acto B sin amendment');

console.log('PASS farmacia_ea_r1_revisions_check');
