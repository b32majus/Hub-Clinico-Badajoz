import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Check focal FH-EA R1: cardinalidad, estados, borradores, identidades
// explícitas y aislamiento. Carga el módulo puro en un contexto aislado,
// sin DOM, paciente activo ni almacenamiento.
const modulePath = 'modules/farmacia_ea_invariants.js';
assert.ok(fs.existsSync(modulePath), 'falta el módulo puro de invariantes EA');

const sandbox = { window: { HubTools: {} }, console: { log() {}, error() {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(modulePath, 'utf8'), sandbox, { filename: modulePath });
const api = sandbox.window.HubTools.farmaciaEaInvariants;
assert.equal(typeof api?.validateNewEvents, 'function', 'validateNewEvents debe existir');
const validate = api.validateNewEvents;

// Convierte sólo prototipos de reino, preservando undefined y claves propias.
function local(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return Array.from(value, local);
    return Object.fromEntries(Object.keys(value).map(key => [key, local(value[key])]));
}

const event = (index, extra = {}) => ({
    patientRef: 'P-A',
    actId: 'ACT-A',
    episode_id: `E-${index}`,
    observation_id: `O-${index}`,
    status: 'incorporated',
    description: ' Texto original ',
    ...extra
});
const request = (present, events = []) => ({
    patientRef: 'P-A',
    actId: 'ACT-A',
    present,
    adverse_events: events
});
const draft = event(90, { status: 'draft', description: '', nested: { notes: ['borrador'] } });
const history = event(91, { actId: 'ACT-OLD', evolution: 'persiste' });

function run(input) {
    const before = structuredClone(input);
    const result = local(validate(input));
    assert.deepEqual(input, before, 'la entrada debe permanecer intacta');
    return result;
}

function accept(input, included, retained = []) {
    const output = run(input);
    assert.equal(output.ok, true);
    assert.deepEqual(output.representation, {
        patientRef: input.patientRef,
        actId: input.actId,
        present: input.present,
        adverse_events: included
    });
    assert.deepEqual(output.retained, retained);
    return output;
}

function reject(input) {
    const output = run(input);
    assert.equal(output.ok, false);
    assert.equal(typeof output.error?.code, 'string');
    assert.equal(typeof output.error?.message, 'string');
    assert.deepEqual(Object.keys(output).sort(), ['error', 'ok'], 'sin representación parcial');
    return output;
}

// Cardinalidad 0/1/2/5/N>5, identidades, orden y descripciones iguales.
for (const count of [1, 2, 5, 9, 37]) {
    const events = Array.from({ length: count }, (_, index) => event(index));
    accept(request('si', events), events);
    assert.equal(new Set(events.map(item => item.description)).size, 1, 'descripciones iguales en el fixture');
}
reject(request('si', []));
console.log('PASS cardinalidad, orden y descripciones iguales');

// Matriz exacta si / no / no_consta.
for (const present of ['si', 'no', 'no_consta']) {
    for (const count of [0, 1, 3]) {
        const events = Array.from({ length: count }, (_, index) => event(index));
        if ((present === 'si') === (count > 0)) accept(request(present, events), events);
        else reject(request(present, events));
    }
}
for (const token of ['', 'SI', 'Si', 'sí', ' no', 'No', 'no consta', null, undefined]) {
    reject(request(token));
}
console.log('PASS matriz de estados y tokens exactos');

// Borradores: fuera de la representación y conservados intactos, con o sin
// descripción; no se convierten en finalizadas.
accept(request('no', [draft]), [], [draft]);
accept(request('no_consta', [draft]), [], [draft]);
const draftWithoutDescription = event(92, { status: 'draft' });
delete draftWithoutDescription.description;
accept(request('no_consta', [draftWithoutDescription]), [], [draftWithoutDescription]);
reject(request('si', [draft]));
accept(request('si', [draft, event(1)]), [event(1)], [draft]);
console.log('PASS borradores retenidos sin incorporar');

// Sólo descripción: una ficha incorporada con descripción basta y no se
// añaden sospechosos, gravedad ni causalidad.
const descriptionOnly = {
    patientRef: 'P-A',
    actId: 'ACT-A',
    episode_id: 'E-SOLO',
    observation_id: 'O-SOLO',
    status: 'incorporated',
    description: 'Cefalea'
};
const descriptionOutput = accept(request('si', [descriptionOnly]), [descriptionOnly]);
assert.deepEqual(descriptionOutput.representation.adverse_events[0], descriptionOnly);
assert.equal(Object.keys(descriptionOutput.representation.adverse_events[0]).length, 6);
for (const description of ['', '   ', '\n\t', null, undefined]) {
    reject(request('si', [event(0, { description })]));
}
const withoutDescription = event(0);
delete withoutDescription.description;
reject(request('si', [withoutDescription]));
console.log('PASS sólo descripción / incorporación incompleta');

// Historia de otro acto: se retiene, no cuenta para el estado y no se altera.
for (const present of ['no', 'no_consta']) accept(request(present, [history, draft]), [], [history, draft]);
reject(request('si', [history]));
accept(request('si', [history, event(0)]), [event(0)], [history]);
console.log('PASS historia de otro acto retenida');

// Identidades explícitas y asociaciones contradictorias.
for (const key of ['patientRef', 'actId']) {
    for (const value of ['', '   ', null, undefined]) reject({ ...request('no'), [key]: value });
    const missing = request('no');
    delete missing[key];
    reject(missing);
}
for (const key of ['patientRef', 'actId', 'episode_id', 'observation_id']) {
    for (const value of ['', '   ', null, undefined]) reject(request('si', [event(0, { [key]: value })]));
    const missing = event(0);
    delete missing[key];
    reject(request('si', [missing]));
}
reject(request('si', [event(0), event(1, { patientRef: 'P-B' })]));
reject(request('si', [event(0, { patientRef: 'ACT-A', actId: 'P-A' })]));
reject(request('si', [event(0, { status: 'finalized' })]));
for (const input of [null, {}, request('no', null), request('si', [null])]) reject(input);
console.log('PASS identidades explícitas y asociación contradictoria');

// Atomicidad del fallo: una ficha inválida no produce representación aunque
// otras fueran válidas, y la entrada no se muta.
const mixedInvalid = request('si', [event(0), event(1, { observation_id: '' }), event(2)]);
const mixedRejected = reject(mixedInvalid);
assert.equal(mixedRejected.error.code, 'INVALID_OBSERVATION_ID');
assert.equal('representation' in mixedRejected, false);
assert.equal('retained' in mixedRejected, false);
console.log('PASS atomicidad del fallo');

// Aislamiento profundo en ambas direcciones, incluidos borradores e historia.
const isolationInput = request('si', [
    event(1, { data: { notes: ['original'], unknown: null, blank: '', zero: 0, flag: false, undef: undefined } }),
    draft,
    history
]);
const first = validate(isolationInput);
const second = validate(isolationInput);
assert.deepEqual(local(first), local(second), 'resultado determinista');
first.representation.adverse_events[0].data.notes.push('salida');
first.retained[0].nested.notes.push('salida borrador');
assert.deepEqual(isolationInput.adverse_events[0].data.notes, ['original']);
assert.deepEqual(isolationInput.adverse_events[1].nested.notes, ['borrador']);
isolationInput.adverse_events[0].data.notes.push('entrada');
isolationInput.adverse_events[2].description = 'historia cambiada';
assert.deepEqual(local(second.representation.adverse_events[0].data), {
    notes: ['original'],
    unknown: null,
    blank: '',
    zero: 0,
    flag: false,
    undef: undefined
});
assert.equal(second.retained[1].description, ' Texto original ');
console.log('PASS aislamiento profundo y determinismo');

// Sin estado entre llamadas: otro paciente/acto no conserva contexto.
const otherPatient = { patientRef: 'P-B', actId: 'ACT-B', present: 'no_consta', adverse_events: [] };
accept(otherPatient, []);
accept(request('si', [event(2)]), [event(2)]);
reject({ patientRef: 'P-B', actId: 'ACT-B', present: 'si', adverse_events: [event(2)] });
console.log('PASS repetición A/B sin contexto compartido');

console.log('PASS farmacia_ea_r1_states_check');
