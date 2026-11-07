import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Check focal EA v1 demo (#867): estado registrado por episodio.
//
// Regla decidida por Sil (27-10-2026): por cada episodio se muestra el ÚLTIMO
// ESTADO REGISTRADO y la fecha del acto en que se registró. El episodio sólo
// consta cerrado si esa última observación es una resolución explícita. Nunca
// se declara «activo»; registrado ≠ activo. `No` / `No consta` en un acto
// posterior no cambian nada.
//
// «Última» NO se deduce del orden de transporte ni de la fecha: se deduce de la
// cadena explícita de `basis` dentro del episodio (la observación que ninguna
// otra del mismo episodio toma como `basis`). Si hay más de una, el resultado
// es ambiguo y no se elige ninguna. La fecha sale sólo de `actDates[actId]`; si
// falta, `lastDate` es null («sin fecha»), nunca inferida.
//
// Reutiliza `farmaciaEaPatientProjection.project` (y por tanto el validador de
// invariantes) para construir la entrada; este check no reimplementa sus reglas.
const paths = [
    'modules/farmacia_ea_invariants.js',
    'modules/farmacia_ea_patient_projection.js',
    'modules/farmacia_ea_episode_state.js'
];

function load() {
    const sandbox = { window: { HubTools: {} }, console: { log() {}, error() {} } };
    vm.createContext(sandbox);
    for (const path of paths) {
        assert.ok(fs.existsSync(path), `falta ${path}`);
        vm.runInContext(fs.readFileSync(path, 'utf8'), sandbox, { filename: path });
    }
    return sandbox.window.HubTools;
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
    const tools = load();
    const project = tools.farmaciaEaPatientProjection?.project;
    const derive = tools.farmaciaEaEpisodeState?.derive;
    assert.equal(typeof project, 'function', 'falta la proyección publicada');
    assert.equal(typeof derive, 'function', 'HubTools.farmaciaEaEpisodeState.derive debe existir');

    const PATIENT = 'P-A';
    const ea = fields => ({
        patientRef: PATIENT, actId: 'ACT-A', episode_id: 'E1', observation_id: 'O1',
        status: 'incorporated', description: 'Cefalea', ...fields
    });
    const act = fields => ({
        actId: 'ACT-A', present: 'si', adverse_events: [], history: [], selections: [], ...fields
    });
    const refOf = o => Object.fromEntries(
        ['patientRef', 'actId', 'episode_id', 'observation_id'].map(key => [key, o[key]])
    );

    // --- Historia sintética del paciente -----------------------------------
    // A: E1 nuevo + E9 nuevo (dos EA en el mismo acto)
    const o1 = ea({ observation_id: 'O1', episode_id: 'E1' });
    const o9 = ea({ observation_id: 'O9', episode_id: 'E9', description: 'Náuseas' });
    // B: E1 continúa
    const o2 = ea({
        actId: 'ACT-B', observation_id: 'O2', episode_id: 'E1',
        basis: refOf(o1), evolution: 'continuation', description: 'Cefalea persiste'
    });
    // C: acto con `No`, sin tocar E1 ni E9
    // D: E1 se resuelve de forma explícita
    const o3 = ea({
        actId: 'ACT-D', observation_id: 'O3', episode_id: 'E1',
        basis: refOf(o2), evolution: 'resolution', description: 'Cefalea resuelta'
    });
    // E: recurrencia = episodio nuevo E2 relacionado con E1
    const o4 = ea({
        actId: 'ACT-E', observation_id: 'O4', episode_id: 'E2',
        basis: refOf(o3), evolution: 'recurrence', relatedEpisodeId: 'E1', description: 'Cefalea recurrente'
    });

    const actA = act({ adverse_events: [o1, o9] });
    const actB = act({ actId: 'ACT-B', adverse_events: [o2], history: [o1] });
    const actC = act({ actId: 'ACT-C', present: 'no' });
    const actCnc = act({ actId: 'ACT-C', present: 'no_consta' });
    const actD = act({ actId: 'ACT-D', adverse_events: [o3], history: [o2] });
    const actE = act({ actId: 'ACT-E', adverse_events: [o4], history: [o3] });

    const DATES = { 'ACT-A': '2026-01-10', 'ACT-B': '2026-02-10', 'ACT-C': '2026-03-10', 'ACT-D': '2026-04-10', 'ACT-E': '2026-05-10' };

    const run = (acts, dates = DATES) => {
        const projection = project({ patientRef: PATIENT, acts });
        assert.equal(projection.ok, true, `la proyección base debía ser válida: ${JSON.stringify(projection.error ?? null)}`);
        const before = structuredClone({ projection: local(projection), dates });
        const raw = derive(projection, dates);
        assert.deepEqual({ projection: local(projection), dates }, before, 'derive no muta sus entradas');
        return local(raw);
    };
    const byId = (result, id) => result.episodes.find(episode => episode.episode_id === id);

    const EPISODE_KEYS = ['episode_id', 'observationCount', 'lastObservationId', 'lastActId', 'lastDate',
        'lastEvolution', 'closed', 'ambiguous'];

    // 1. Continuación, y `No` posterior que NO resuelve nada.
    let result = run([actA, actB, actC]);
    assert.equal(result.ok, true);
    assert.equal(result.patientRef, PATIENT);
    assert.equal(result.uniqueEpisodeCount, 2);
    assert.equal(result.observationCount, 3);
    assert.equal(result.closedEpisodeCount, 0);
    let e1 = byId(result, 'E1');
    assert.deepEqual(Object.keys(e1).sort(), [...EPISODE_KEYS].sort(), 'claves del episodio fuera de contrato');
    assert.equal(e1.observationCount, 2);
    assert.equal(e1.lastObservationId, 'O2');
    assert.equal(e1.lastActId, 'ACT-B');
    assert.equal(e1.lastDate, '2026-02-10', 'la fecha es la del acto de la última observación, no la del `No` posterior');
    assert.equal(e1.lastEvolution, 'continuation');
    assert.equal(e1.closed, false, 'un `No` posterior no resuelve');
    assert.equal(e1.ambiguous, false);

    // 1b. `No consta` tampoco cambia nada.
    const withUnknown = byId(run([actA, actB, actCnc]), 'E1');
    assert.equal(withUnknown.lastObservationId, 'O2');
    assert.equal(withUnknown.closed, false);

    // 2. Dos EA en el mismo acto: cada episodio con su propio último estado.
    const e9 = byId(result, 'E9');
    assert.equal(e9.lastObservationId, 'O9');
    assert.equal(e9.lastDate, '2026-01-10');
    assert.equal(e9.lastEvolution, null, 'sin evolución declarada no se inventa ninguna');
    assert.equal(e9.closed, false);

    // 3. Resolución explícita cierra E1; la recurrencia es otro episodio y NO reabre E1.
    result = run([actA, actB, actC, actD, actE]);
    assert.equal(result.uniqueEpisodeCount, 3);
    assert.equal(result.observationCount, 5);
    assert.equal(result.closedEpisodeCount, 1);
    e1 = byId(result, 'E1');
    assert.equal(e1.lastObservationId, 'O3', 'la recurrencia (basis de otro episodio) no desplaza la última de E1');
    assert.equal(e1.lastDate, '2026-04-10');
    assert.equal(e1.lastEvolution, 'resolution');
    assert.equal(e1.closed, true);
    const e2 = byId(result, 'E2');
    assert.equal(e2.relatedEpisodeId, 'E1', 'la relación declarada se conserva');
    assert.equal(e2.lastObservationId, 'O4');
    assert.equal(e2.lastEvolution, 'recurrence');
    assert.equal(e2.closed, false, 'una recurrencia no está cerrada ni se declara activa');
    assert.equal(Object.hasOwn(e1, 'relatedEpisodeId'), false, 'no se inventa relación en E1');

    // 4. La última sale de la cadena de `basis`, no del orden de transporte.
    const reversed = run([actE, actD, actC, actB, actA]);
    for (const id of ['E1', 'E2', 'E9']) {
        assert.deepEqual(
            [byId(reversed, id).lastObservationId, byId(reversed, id).closed],
            [byId(result, id).lastObservationId, byId(result, id).closed],
            `el resultado de ${id} no depende del orden de transporte`
        );
    }

    // 5. Sin fecha del acto: lastDate null, nunca inferida del orden ni de otro acto.
    result = run([actA, actB], { 'ACT-A': '2026-01-10' });
    assert.equal(byId(result, 'E1').lastObservationId, 'O2');
    assert.equal(byId(result, 'E1').lastDate, null, 'sin fecha registrada → «sin fecha»');
    result = run([actA, actB], {});
    assert.equal(byId(result, 'E1').lastDate, null);

    // 6. Ramificación: dos observaciones toman la misma `basis` → ambiguo, sin elegir.
    const o2b = ea({
        actId: 'ACT-C', observation_id: 'O2B', episode_id: 'E1',
        basis: refOf(o1), evolution: 'continuation', description: 'Cefalea (otra continuación)'
    });
    result = run([actA, actB, act({ actId: 'ACT-C', adverse_events: [o2b], history: [o1] })]);
    e1 = byId(result, 'E1');
    assert.equal(e1.ambiguous, true);
    assert.equal(e1.lastObservationId, null, 'ambiguo: no se elige una');
    assert.equal(e1.lastActId, null);
    assert.equal(e1.lastDate, null);
    assert.equal(e1.lastEvolution, null);
    assert.equal(e1.closed, false, 'ambiguo: no se afirma cierre');
    assert.equal(e1.observationCount, 3);

    // 7. Paciente sin EA: vacío, sin inventar nada.
    result = run([act({ present: 'no' })]);
    assert.equal(result.ok, true);
    assert.deepEqual(result.episodes, []);
    assert.equal(result.uniqueEpisodeCount, 0);
    assert.equal(result.closedEpisodeCount, 0);

    // 8. Nunca «activo»: ni clave, ni valor.
    result = run([actA, actB, actC, actD, actE]);
    assert.equal(allKeys(result).some(key => /activ/i.test(key)), false, 'ninguna clave «activo»');
    assert.equal(/activ/i.test(JSON.stringify(result)), false, 'ningún valor «activo»');

    // 9. Fallos cerrados, sin resultado parcial.
    const good = project({ patientRef: PATIENT, acts: [actA] });
    const failed = project({ patientRef: PATIENT, acts: [act({ adverse_events: [{ ...o1, status: 'draft' }] })] });
    assert.equal(failed.ok, false);
    assert.deepEqual(local(derive(failed, DATES)), local(failed), 'un error de la proyección se propaga tal cual');
    for (const bad of [null, undefined, 'x', [], {}, { ok: true }, { ok: true, patientRef: PATIENT, episodes: 'x' }]) {
        const out = local(derive(bad, DATES));
        assert.equal(out?.ok, false, `proyección inválida debe fallar: ${JSON.stringify(bad)}`);
        assert.equal(out.error.code, 'INVALID_PROJECTION');
    }
    for (const badDates of [null, undefined, 'x', [], { 'ACT-A': 20260110 }, { 'ACT-A': '' }, { 'ACT-A': null }]) {
        const out = local(derive(good, badDates));
        assert.equal(out?.ok, false, `actDates inválido debe fallar: ${JSON.stringify(badDates)}`);
        assert.equal(out.error.code, 'INVALID_ACT_DATES');
    }

    console.log('farmacia_ea_episode_state_check: OK');
}

main();
