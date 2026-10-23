#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

// Check focal FH-EA R1: composición pasiva de la colección T01 con el
// constructor de Seguimiento F4.4. Carga los módulos puros en un contexto
// aislado, sin DOM, página, paciente activo, reloj, catálogo, red ni
// almacenamiento. No conecta la UI ni persiste nada.
//
// Límites reales: este check no demuestra integración de página, controlador,
// persistencia/recuperación, exportación, estadísticas ni UI. Tampoco corre
// `npm run -s verify:nexus` (se ejecuta por perfil); sí ejecuta los checks
// focales R1 previos, F4.4 y T01 para dejar constancia de su regresión.

const MODULES = ['contract', 'payloads'].map(name => `modules/farmacia_act_${name}.js`);
const INVARIANTS = 'modules/farmacia_ea_invariants.js';

const sandbox = { window: { HubTools: {} }, console: { log() {}, error() {} } };
vm.createContext(sandbox);
for (const path of MODULES) {
    assert.ok(fs.existsSync(path), `falta el módulo F4.4 ${path}`);
    vm.runInContext(fs.readFileSync(path, 'utf8'), sandbox, { filename: path });
}
const builder = sandbox.window.HubTools.farmaciaActPayloads.createFollowupAct;
let builderCalls = 0;
sandbox.window.HubTools.farmaciaActPayloads = {
    createFollowupAct(...args) {
        builderCalls += 1;
        return builder(...args);
    }
};
assert.ok(fs.existsSync(INVARIANTS), 'falta el módulo puro de invariantes EA');
vm.runInContext(fs.readFileSync(INVARIANTS, 'utf8'), sandbox, { filename: INVARIANTS });
const api = sandbox.window.HubTools.farmaciaEaInvariants;
assert.equal(typeof api?.composeFollowup, 'function', 'composeFollowup debe existir');
const compose = api.composeFollowup;

// Convierte sólo prototipos de reino, preservando undefined y claves propias.
function local(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return Array.from(value, local);
    return Object.fromEntries(Object.keys(value).map(key => [key, local(value[key])]));
}
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const envelope = () => ({
    actId: 'A',
    patientRef: 'P',
    revision: 1,
    siteId: 'S',
    occurredAt: '2026-10-23T10:00:00Z',
    authoredAt: '2026-10-23T11:00:00Z',
    authorRef: 'U',
    attributionAssurance: 'explicit',
    provenance: { source: 'synthetic' }
});
const event = index => ({
    episode_id: `E${index}`,
    observation_id: `O${index}`,
    status: 'incorporated',
    description: '  original  ',
    evolution: 'no_consta',
    severity: '',
    expanded: true
});
const fixture = (count = 1, present = count ? 'si' : 'no_consta') => [
    envelope(),
    {
        followup: {
            adverse_events: Array.from({ length: count }, (_, index) => event(index)),
            notes: { raw: [undefined, null, '', 0, false] }
        },
        lines: [{ id: 'L2', opaque: { v: null } }, { id: 'L1' }]
    },
    { present, history: [], selections: [], revisions: [] }
];

function run(args, expectedOk = true) {
    const before = structuredClone(args);
    const calls = builderCalls;
    const output = local(compose(...args));
    assert.deepEqual(args, before, 'la entrada permanece intacta en éxito y fallo');
    assert.equal(output.ok, expectedOk, JSON.stringify(output));
    if (expectedOk) {
        assert.equal(builderCalls, calls + 1, 'exactamente una llamada al constructor F4.4');
        assert.equal(output.act.kind, 'pharmacy_followup');
        assert.deepEqual(output.act.payload.lines, args[1].lines, 'lines opacas conservan orden y cardinalidad');
        assert.deepEqual(output.act.payload.followup.notes, args[1].followup.notes, 'bloques opacos intactos');
        assert.equal(hasOwn(output.act.payload.followup, 'adverse_event'), false, 'sin adverse_event singular');
        assert.equal(output.act.payload.followup.adverse_events.present, args[2].present);
        assert.deepEqual(output.history, args[2].history);
        assert.deepEqual(output.selections, args[2].selections);
    } else {
        assert.deepEqual(Object.keys(output).sort(), ['error', 'ok'], 'fallo atómico sin acto ni representación');
        assert.equal(typeof output.error?.code, 'string');
        assert.equal(typeof output.error?.message, 'string');
    }
    return output;
}

// 1. Composición completa: N=0/1/2/5/9/37 × 0/1/2 líneas; borrador retenido.
for (const count of [0, 1, 2, 5, 9, 37]) {
    for (const lines of [[], [{ id: 'only' }], [{ id: 'second' }, { id: 'first' }]]) {
        const args = fixture(count);
        args[1].lines = lines;
        args[1].followup.adverse_events.push({ ...event('draft'), status: 'draft', description: '' });
        const output = run(args);
        const block = output.act.payload.followup.adverse_events;
        assert.equal(block.adverse_events.length, count);
        assert.equal(output.retained.length, 1);
        assert.equal(output.retained[0].description, '');
        for (let index = 0; index < count; index += 1) {
            assert.deepEqual(block.adverse_events[index], { ...event(index), patientRef: 'P', actId: 'A' });
        }
        assert.deepEqual(local(compose(...args)), output, 'repetición determinista');
        const expected = local(builder(args[0], {
            ...args[1],
            followup: { ...args[1].followup, adverse_events: block }
        }));
        assert.deepEqual(output.act, expected, 'F4.4 por sí solo construye el acto');
    }
}
console.log('PASS cardinalidad / líneas / borrador retenido / autoridad F4.4');

// 2. Matriz exacta de estados y tokens.
for (const state of ['si', 'no', 'no_consta']) {
    run(fixture(0, state), state !== 'si');
    run(fixture(1, state), state === 'si');
}
for (const token of ['', 'SI', 'Si', 'sí', ' no', 'No', 'no consta', null, undefined]) {
    const args = fixture(0);
    args[2].present = token;
    run(args, false);
}
console.log('PASS matriz si / no / no_consta');

// 3. Historia de otro acto, selección y revisión expresa sin cambios.
const historical = { ...event('old'), patientRef: 'P', actId: 'OLD', revision: 1 };
const basis = Object.fromEntries(
    ['patientRef', 'actId', 'episode_id', 'observation_id'].map(key => [key, historical[key]])
);
for (const state of ['no', 'no_consta']) {
    const args = fixture(0, state);
    args[2].history = [historical];
    args[2].selections = [basis];
    const output = run(args);
    assert.equal(output.act.payload.followup.adverse_events.adverse_events.length, 0);
    assert.deepEqual(output.history, [historical]);
    assert.deepEqual(output.selections, [basis]);
}
const reviewedArgs = fixture();
reviewedArgs[2].history = [historical];
reviewedArgs[2].selections = [basis];
reviewedArgs[1].followup.adverse_events = [{
    episode_id: historical.episode_id,
    observation_id: 'NEW',
    status: 'incorporated',
    basis,
    review: { confirmed: true, unchanged: true }
}];
const review = run(reviewedArgs).act.payload.followup.adverse_events.adverse_events[0];
assert.equal(review.episode_id, historical.episode_id);
assert.equal(review.observation_id, 'NEW');
for (const key of ['description', 'severity', 'suspicions', 'evaluations', 'amendment', 'onset', 'resolution']) {
    assert.equal(hasOwn(review, key), false, `la revisión no completa ${key}`);
}
const unreviewed = structuredClone(reviewedArgs);
delete unreviewed[1].followup.adverse_events[0].review;
run(unreviewed, false);
console.log('PASS historia / selección sola / revisión expresa / sin defaults');

// 4. Correcciones y anulaciones conservadas; vínculo estricto con el acto.
const correctionArgs = fixture();
const previous = { ...event(0), patientRef: 'P', actId: 'A', revision: 1 };
const next = {
    ...previous,
    revision: 2,
    description: 'corregida',
    amendment: { previousRevision: 1, reason: 'error de transcripción' }
};
correctionArgs[1].followup.adverse_events = [next];
correctionArgs[2].revisions = [{ operation: 'correction', previous, next }];
const corrected = run(correctionArgs);
assert.deepEqual(corrected.revisions[0].previous, previous);
assert.deepEqual(corrected.revisions[0].next, next);
assert.equal(corrected.revisions[0].operation, 'correction');

const noReason = structuredClone(correctionArgs);
delete noReason[2].revisions[0].next.amendment.reason;
run(noReason, false);
const unrelated = structuredClone(correctionArgs);
unrelated[2].revisions[0].next = { ...unrelated[2].revisions[0].next, description: 'otra observación' };
run(unrelated, false);
const lostPrevious = structuredClone(correctionArgs);
lostPrevious[2].revisions = [];
run(lostPrevious, false);
const foreign = structuredClone(correctionArgs);
for (const side of ['previous', 'next']) foreign[2].revisions[0][side].patientRef = 'B';
run(foreign, false);
const annulment = structuredClone(correctionArgs);
annulment[2].revisions[0].operation = 'annulment';
run(annulment);
console.log('PASS corrección / anulación / motivo / versiones / vínculo estricto');

// 5. Contexto explícito: ninguna de las cuatro ramas puede faltar.
for (const key of ['present', 'history', 'selections', 'revisions']) {
    const args = fixture();
    delete args[2][key];
    run(args, false);
}
console.log('PASS contexto explícito completo');

// 6. Ausencias, undefined propio, centinelas y ficha mínima.
for (const value of [undefined, null, '', 0, false, 'NO_VALUE']) {
    const args = fixture();
    Object.assign(args[1].followup.adverse_events[0], {
        onset: value,
        resolution: value,
        action: value,
        notes: value
    });
    const output = run(args).act.payload.followup.adverse_events.adverse_events[0];
    for (const key of ['onset', 'resolution', 'action', 'notes']) {
        assert.equal(hasOwn(output, key), true);
        assert.equal(output[key], value);
    }
}
const absent = fixture();
const bare = { episode_id: 'E', observation_id: 'O', status: 'incorporated', description: 'EA' };
absent[1].followup.adverse_events = [bare];
assert.deepEqual(run(absent).act.payload.followup.adverse_events.adverse_events, [
    { ...bare, patientRef: 'P', actId: 'A' }
]);
console.log('PASS centinelas / propia-undefined / ficha mínima');

// 7. Sospechas y evaluaciones explícitas; contaminación A/B rechazada.
const clinicalArgs = fixture();
Object.assign(clinicalArgs[1].followup.adverse_events[0], {
    suspicions: [{ patientRef: 'P', episode_id: 'E0', medicationRef: 'M' }],
    evaluations: [{
        patientRef: 'P',
        actId: 'A',
        episode_id: 'E0',
        medicationRef: 'M',
        evaluation_id: 'EV',
        method: 'naranjo',
        result: 0
    }]
});
assert.deepEqual(run(clinicalArgs).act.payload.followup.adverse_events.adverse_events[0], {
    ...clinicalArgs[1].followup.adverse_events[0],
    patientRef: 'P',
    actId: 'A'
});
const wrongClinical = structuredClone(clinicalArgs);
wrongClinical[1].followup.adverse_events[0].evaluations[0].patientRef = 'B';
run(wrongClinical, false);
for (const key of ['patientRef', 'actId']) {
    const wrong = fixture();
    wrong[1].followup.adverse_events[0][key] = 'OTHER';
    run(wrong, false);
    const missing = fixture();
    delete missing[0][key];
    run(missing, false);
}
const historyB = fixture();
historyB[2].history = [{ ...historical, patientRef: 'B' }];
run(historyB, false);
const invalidEvent = fixture();
invalidEvent[1].followup.adverse_events.push({ ...event('bad'), description: '' });
run(invalidEvent, false);
console.log('PASS asociaciones clínicas / referencias A-B / descripción exigida');

// 8. Fallos F4.4 propagados verbatim (sin reimplementar sus reglas).
for (const mutate of [
    args => delete args[1].lines,
    args => { args[0].revision = 0; },
    args => { args[1].extra = {}; },
    args => { args[1].lines = [null]; }
]) {
    const args = fixture();
    mutate(args);
    const output = run(args, false);
    assert.deepEqual(output, local(builder(args[0], args[1])), 'el fallo F4.4 se propaga sin cambios');
}
console.log('PASS fallos F4.4 propagados');

// 9. Inmutabilidad, aislamiento profundo y A/B/A.
const isolationArgs = fixture();
const first = compose(...isolationArgs);
const second = local(compose(...isolationArgs));
first.act.payload.lines[0].opaque.v = 'changed';
first.retained.push({});
assert.deepEqual(local(compose(...isolationArgs)), second, 'sin estado entre llamadas');
isolationArgs[1].followup.notes.raw.push('later');
assert.equal(second.act.payload.followup.notes.raw.length, 5, 'la salida no comparte referencias con la entrada');
const other = fixture();
other[0].patientRef = 'B';
run(other);
run(fixture());
console.log('PASS inmutabilidad / aislamiento / determinismo / A-B-A');

// 10. Regresión focal: checks R1 previos, F4.4 y T01.
const checks = [
    'tools/farmacia_ea_r1_states_check.mjs',
    'tools/farmacia_ea_r1_identity_check.mjs',
    'tools/farmacia_ea_r1_clinical_data_check.mjs',
    'tools/farmacia_ea_r1_revisions_check.mjs',
    'tools/farmacia_act_contract_check.mjs',
    'tools/farmacia_act_payloads_check.mjs',
    'tools/farmacia_ea_t01_check.mjs'
];
for (const path of checks) {
    assert.ok(fs.existsSync(path), `falta el check requerido ${path}`);
    const result = spawnSync(process.execPath, [path], { encoding: 'utf8', timeout: 120000 });
    assert.equal(result.status, 0, `${path}\n${result.stdout}${result.stderr}`);
}
console.log('PASS regresión R1 previa / F4.4 / T01');
console.log('LÍMITES: sin UI, controlador, persistencia, red ni verify:nexus dentro de este check.');
console.log('PASS farmacia_ea_r1_followup_check');
