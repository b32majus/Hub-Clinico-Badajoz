import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Check focal EA v1 demo (#867): modelo de pantalla de EA (Tramo C).
//
// `HubTools.farmaciaEaScreenModel` traduce el resultado `ok:true` del lector
// C3a (`readPatient`) a lo que pintan Dashboard del paciente, Quick View y
// Estadísticas. Es una función pura de ese resultado: no lee libros, DOM,
// red ni estado global, y no decide nada clínico.
//
//  build(readResult) → { ok:true, patientRef, patientHasDocumentedEa,
//      counts:{ episodes, observations }, episodes:[...] }
//    Por episodio: episode_id, relatedEpisodeId? (sólo si la fuente lo declara),
//    closed, ambiguous, observationCount, statusText, description, suspects,
//    methods, observations:[{ observation_id, actId, date|null, evolution|null,
//    description, suspects, evaluations }].
//    statusText (regla de «arrastre» de Sil, 27-10):
//      «Último estado registrado: <etiqueta>, el <fecha>»  o  «..., sin fecha»
//      etiquetas: continuation→«continúa», resolution→«resuelto»,
//      recurrence→«recurrencia», sin evolución→«sin evolución indicada».
//      Ambiguo → «Último estado no determinable».
//    Nunca aparece la palabra «activo» (registrado ≠ activo).
//    `suspects` de un episodio = unión (orden de primera aparición) de los
//    medicationRef de las sospechas de TODAS sus observaciones; `methods` =
//    unión de los métodos de sus evaluaciones.
//  cohort(models, filters) → { ok:true, patientsTotal, patients, episodes,
//      observations }   (tres denominadores, no uno)
//    filtros: { suspect?, method? }, ambos opcionales y a nivel de EPISODIO.
//    `suspect` sólo: el episodio lo declara entre sus sospechosos.
//    `method` sólo: alguna evaluación del episodio usa ese método.
//    ambos: existe una evaluación con ese método PARA ese sospechoso.
//    observations = TODAS las observaciones de los episodios que cumplen.
//    patients = pacientes con ≥1 episodio que cumple; patientsTotal = nº de
//    modelos recibidos (un paciente sin EA documentado cuenta en el total).
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
    'modules/farmacia_ea_screen_model.js'
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

function allTexts(value, out = []) {
    if (typeof value === 'string') out.push(value);
    else if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) {
            out.push(key);
            allTexts(value[key], out);
        }
    }
    return out;
}

function main() {
    const sandbox = load();
    const core = sandbox.FarmaciaBridgeRawEaV21Core;
    const reader = sandbox.FarmaciaBridgeRawEaV21Reader;
    const model = sandbox.HubTools.farmaciaEaScreenModel;
    assert.equal(typeof model?.build, 'function', 'farmaciaEaScreenModel.build debe existir');
    assert.equal(typeof model?.cohort, 'function', 'farmaciaEaScreenModel.cohort debe existir');

    const P = 'PATREF-P';
    const Q = 'PATREF-Q';
    const R = 'PATREF-R';

    const event = (actId, date) => ({
        event_type: 'pharmacy_followup', event_id: `e-${actId}`, source_event_id: `s-${actId}`,
        event_status: 'recorded', occurred_at: `${date}T10:00:00Z`, recorded_at: `${date}T10:01:00Z`,
        demo_flag: true, patient_id: 'patient-syn-x', visit_id: `v-${actId}`,
        identifier_value: 'CIP-DEMO-X', visit_date: date
    });
    const ea = (patientRef, actId, fields) => ({
        patientRef, actId, episode_id: 'E1', observation_id: 'O1',
        status: 'incorporated', description: 'Cefalea', ...fields
    });
    const refOf = o => Object.fromEntries(
        ['patientRef', 'actId', 'episode_id', 'observation_id'].map(key => [key, o[key]])
    );
    const buildAct = ({ patientRef, actId, date = '2026-01-10', present = 'si', obs = [], history = [] }) =>
        core.buildFollowupRows({
            event: event(actId, date), actId, patientRef, present,
            activeLines: [], adverse_events: obs, history, selections: []
        });
    const rowsOf = acts => acts.flatMap(act => buildAct(act));

    const sA = [
        { patientRef: P, episode_id: 'E1', medicationRef: 'MED-1' },
        { patientRef: P, episode_id: 'E1', medicationRef: 'MED-2' }
    ];
    const evalA = [{
        patientRef: P, actId: 'ACT-A', episode_id: 'E1', evaluation_id: 'EV-1', medicationRef: 'MED-1', method: 'naranjo'
    }];
    const o1 = ea(P, 'ACT-A', { observation_id: 'O1', suspicions: sA, evaluations: evalA });
    const o9 = ea(P, 'ACT-A', { observation_id: 'O9', episode_id: 'E9', description: 'Náuseas', suspicions: [], evaluations: [] });
    const o2 = ea(P, 'ACT-B', {
        observation_id: 'O2', basis: refOf(o1), evolution: 'continuation', description: 'Cefalea persiste'
    });
    const o3 = ea(P, 'ACT-D', {
        observation_id: 'O3', basis: refOf(o2), evolution: 'resolution', description: 'Cefalea resuelta'
    });
    const o4 = ea(P, 'ACT-E', {
        observation_id: 'O4', episode_id: 'E2', basis: refOf(o3), evolution: 'recurrence',
        relatedEpisodeId: 'E1', description: 'Cefalea recurrente'
    });
    const rowsP = rowsOf([
        { patientRef: P, actId: 'ACT-A', date: '2026-01-10', obs: [o1, o9] },
        { patientRef: P, actId: 'ACT-B', date: '2026-02-10', obs: [o2], history: [o1] },
        { patientRef: P, actId: 'ACT-C', date: '2026-03-10', present: 'no' },
        { patientRef: P, actId: 'ACT-D', date: '2026-04-10', obs: [o3], history: [o2] },
        { patientRef: P, actId: 'ACT-E', date: '2026-05-10', obs: [o4], history: [o3] }
    ]);
    const q1 = ea(Q, 'ACT-Q1', { observation_id: 'O1', description: 'Prurito', suspicions: [], evaluations: [] });
    const rowsQ = rowsOf([{ patientRef: Q, actId: 'ACT-Q1', date: '2026-01-20', obs: [q1] }]);
    const rowsR = rowsOf([{ patientRef: R, actId: 'ACT-R1', date: '2026-02-01', present: 'no' }]);
    const rowsQundated = rowsQ.map(row => ({ ...row, visit_date: null }));

    const read = (patientRef, rows) => reader.readPatient({ patientRef, rows });
    const byId = (list, id) => list.find(item => item.episode_id === id);

    const readP = read(P, rowsP);
    assert.equal(readP.ok, true, JSON.stringify(readP.error ?? null));
    const readPSnapshot = JSON.stringify(readP);

    // 1. Paciente P: tres episodios, cinco observaciones, estado por episodio.
    const mP = local(model.build(readP));
    assert.equal(mP.ok, true, JSON.stringify(mP.error ?? null));
    assert.equal(mP.patientRef, P);
    assert.equal(mP.patientHasDocumentedEa, true);
    assert.deepEqual(mP.counts, { episodes: 3, observations: 5 });
    assert.equal(mP.episodes.length, 3);

    const e1 = byId(mP.episodes, 'E1');
    assert.equal(e1.closed, true);
    assert.equal(e1.ambiguous, false);
    assert.equal(e1.observationCount, 3);
    assert.equal(e1.statusText, 'Último estado registrado: resuelto, el 2026-04-10');
    assert.equal(e1.description, 'Cefalea resuelta', 'la descripción es la de la última observación');
    assert.deepEqual(e1.suspects, ['MED-1', 'MED-2'], 'unión de sospechosos del episodio, orden de primera aparición');
    assert.deepEqual(e1.methods, ['naranjo']);
    assert.equal(e1.relatedEpisodeId, undefined, 'relatedEpisodeId sólo si la fuente lo declara');
    assert.deepEqual(e1.observations.map(o => o.observation_id).sort(), ['O1', 'O2', 'O3']);
    const e1o1 = e1.observations.find(o => o.observation_id === 'O1');
    assert.equal(e1o1.actId, 'ACT-A');
    assert.equal(e1o1.date, '2026-01-10');
    assert.equal(e1o1.evolution, null, 'una primera observación no inventa evolución');
    assert.deepEqual(e1o1.suspects, ['MED-1', 'MED-2']);
    assert.equal(e1o1.evaluations.length, 1);
    assert.equal(e1o1.evaluations[0].method, 'naranjo');
    assert.equal(e1o1.evaluations[0].medicationRef, 'MED-1');
    const e1o3 = e1.observations.find(o => o.observation_id === 'O3');
    assert.equal(e1o3.evolution, 'resolution');
    assert.equal(e1o3.date, '2026-04-10');

    const e2 = byId(mP.episodes, 'E2');
    assert.equal(e2.closed, false, 'una recurrencia es un episodio nuevo, no cerrado');
    assert.equal(e2.relatedEpisodeId, 'E1');
    assert.equal(e2.statusText, 'Último estado registrado: recurrencia, el 2026-05-10');

    const e9 = byId(mP.episodes, 'E9');
    assert.equal(e9.closed, false, 'el acto `No` posterior no cierra E9');
    assert.equal(e9.statusText, 'Último estado registrado: sin evolución indicada, el 2026-01-10');
    assert.deepEqual(e9.suspects, []);
    assert.deepEqual(e9.methods, []);

    // 2. Sin fecha: nunca inferida.
    const readQu = read(Q, rowsQundated);
    assert.equal(readQu.ok, true, JSON.stringify(readQu.error ?? null));
    const mQu = local(model.build(readQu));
    assert.equal(mQu.episodes[0].statusText, 'Último estado registrado: sin evolución indicada, sin fecha');
    assert.equal(mQu.episodes[0].observations[0].date, null);

    // 3. Paciente sin EA documentado (acto `No`): modelo válido, sin episodios.
    const readR = read(R, rowsR);
    assert.equal(readR.ok, true, JSON.stringify(readR.error ?? null));
    const mR = local(model.build(readR));
    assert.equal(mR.ok, true);
    assert.equal(mR.patientHasDocumentedEa, false);
    assert.deepEqual(mR.counts, { episodes: 0, observations: 0 });
    assert.deepEqual(mR.episodes, []);

    // 4. Q con los mismos ids E1/O1 que P: no se mezclan.
    const readQ = read(Q, rowsQ);
    const mQ = local(model.build(readQ));
    assert.equal(mQ.ok, true);
    assert.deepEqual(mQ.counts, { episodes: 1, observations: 1 });
    assert.equal(mQ.episodes[0].description, 'Prurito');
    assert.deepEqual(mQ.episodes[0].suspects, []);

    // 5. Ambigüedad del estado se declara, no se resuelve.
    const ambiguousRead = JSON.parse(JSON.stringify(readP));
    ambiguousRead.state.episodes.find(e => e.episode_id === 'E1').ambiguous = true;
    ambiguousRead.state.episodes.find(e => e.episode_id === 'E1').closed = false;
    const mAmb = local(model.build(ambiguousRead));
    const eAmb = byId(mAmb.episodes, 'E1');
    assert.equal(eAmb.ambiguous, true);
    assert.equal(eAmb.closed, false);
    assert.equal(eAmb.statusText, 'Último estado no determinable');

    // 6. Cohorte: tres denominadores. P + Q + R.
    const models = [model.build(readP), model.build(readQ), model.build(readR)];
    let c = local(model.cohort(models, {}));
    assert.deepEqual(c, { ok: true, patientsTotal: 3, patients: 2, episodes: 4, observations: 6 });
    c = local(model.cohort(models));
    assert.deepEqual(c, { ok: true, patientsTotal: 3, patients: 2, episodes: 4, observations: 6 }, 'sin filtros = todo');
    c = local(model.cohort(models, { suspect: 'MED-1' }));
    assert.deepEqual(c, { ok: true, patientsTotal: 3, patients: 1, episodes: 1, observations: 3 });
    c = local(model.cohort(models, { suspect: 'MED-2' }));
    assert.deepEqual(c, { ok: true, patientsTotal: 3, patients: 1, episodes: 1, observations: 3 });
    c = local(model.cohort(models, { suspect: 'MED-9' }));
    assert.deepEqual(c, { ok: true, patientsTotal: 3, patients: 0, episodes: 0, observations: 0 });
    c = local(model.cohort(models, { method: 'naranjo' }));
    assert.deepEqual(c, { ok: true, patientsTotal: 3, patients: 1, episodes: 1, observations: 3 });
    c = local(model.cohort(models, { method: 'karch' }));
    assert.deepEqual(c, { ok: true, patientsTotal: 3, patients: 0, episodes: 0, observations: 0 });
    c = local(model.cohort(models, { suspect: 'MED-1', method: 'naranjo' }));
    assert.deepEqual(c, { ok: true, patientsTotal: 3, patients: 1, episodes: 1, observations: 3 });
    c = local(model.cohort(models, { suspect: 'MED-2', method: 'naranjo' }));
    assert.deepEqual(c, { ok: true, patientsTotal: 3, patients: 0, episodes: 0, observations: 0 },
        'naranjo evalúa MED-1, no MED-2: el método sólo cuenta para su sospechoso');

    // 7. Orden de entrada irrelevante; entradas no se mutan; salidas desconectadas.
    assert.deepEqual(local(model.cohort([models[2], models[0], models[1]], { suspect: 'MED-1' })),
        local(model.cohort(models, { suspect: 'MED-1' })));
    assert.equal(JSON.stringify(readP), readPSnapshot, 'build no muta el resultado del lector');
    const first = model.build(readP);
    first.episodes[0].statusText = 'MUTADO';
    first.episodes[0].observations.length = 0;
    assert.deepEqual(local(model.build(readP)), mP, 'una salida mutada no contamina la siguiente');
    assert.deepEqual(local(model.build(readP)), mP, 'determinista');

    // 8. Fallos cerrados.
    for (const bad of [null, undefined, 'x', 7, [], {}, { ok: true }, { ok: true, patientRef: P }]) {
        const r = local(model.build(bad));
        assert.equal(r.ok, false, `build(${JSON.stringify(bad)}) debe fallar`);
        assert.equal(r.error.code, 'INVALID_READ_RESULT');
    }
    const noFlag = JSON.parse(JSON.stringify(readP));
    delete noFlag.projection.patientHasDocumentedEa;
    assert.equal(local(model.build(noFlag)).error?.code, 'INVALID_READ_RESULT', 'patientHasDocumentedEa no se deduce');
    const upstream = { ok: false, error: { code: 'UNKNOWN_BASIS', message: 'x' } };
    assert.deepEqual(local(model.build(upstream)), upstream, 'un fallo del lector se propaga tal cual');
    for (const badFilters of [null, 'x', 3, [], { suspect: 5 }, { method: '' }, { other: 'x' }]) {
        const r = local(model.cohort(models, badFilters));
        assert.equal(r.ok, false, `filtros ${JSON.stringify(badFilters)} deben fallar`);
        assert.equal(r.error.code, 'INVALID_FILTER');
    }
    for (const badModels of [null, 'x', {}, [null], [{ ok: false }], [{ ok: true }]]) {
        const r = local(model.cohort(badModels, {}));
        assert.equal(r.ok, false, `modelos ${JSON.stringify(badModels)} deben fallar`);
        assert.equal(r.error.code, 'INVALID_MODEL');
    }
    assert.equal(local(model.cohort([], {})).ok, true, 'cohorte vacía válida: todo a 0');
    assert.deepEqual(local(model.cohort([], {})), { ok: true, patientsTotal: 0, patients: 0, episodes: 0, observations: 0 });

    // 9. Campos para Quick View (decisión de Sil, 29-10): etiqueta y fecha del
    //    último registro por separado, y el bloque mínimo de Quick View.
    assert.equal(e1.stateLabel, 'resuelto');
    assert.equal(e1.lastDate, '2026-04-10');
    assert.equal(e2.stateLabel, 'recurrencia');
    assert.equal(e9.stateLabel, 'sin evolución indicada');
    assert.equal(e9.lastDate, '2026-01-10');
    assert.equal(mQu.episodes[0].lastDate, null, 'sin fecha → null, nunca inferida');
    assert.equal(eAmb.stateLabel, null, 'ambiguo: sin etiqueta');
    // Quick View: sólo episodios sin cierre registrado; resueltos fuera.
    const qvP = local(model.quickView(mP));
    assert.deepEqual(qvP, {
        ok: true,
        title: 'Efectos adversos sin cierre registrado',
        lines: [
            'Náuseas · último registro: sin evolución indicada, 2026-01-10',
            'Cefalea recurrente · último registro: recurrencia, 2026-05-10'
        ]
    }, 'mismo orden que el modelo; sin reordenar por fecha');
    assert.deepEqual(local(model.quickView(mQu)).lines, ['Prurito · último registro: sin evolución indicada, sin fecha']);
    assert.deepEqual(local(model.quickView(mAmb)).lines, [
        'Efecto adverso · último estado no determinable',
        'Náuseas · último registro: sin evolución indicada, 2026-01-10',
        'Cefalea recurrente · último registro: recurrencia, 2026-05-10'
    ],'un ambiguo no se da por cerrado y no inventa descripción');
    assert.deepEqual(local(model.quickView(mR)), { ok: true, title: 'Efectos adversos', lines: ['Sin efectos adversos registrados'] });
    const allClosed = JSON.parse(JSON.stringify(mP));
    allClosed.episodes = allClosed.episodes.filter(e => e.closed);
    assert.deepEqual(local(model.quickView(allClosed)), { ok: true, title: 'Efectos adversos sin cierre registrado', lines: ['Ninguno'] });
    for (const bad of [null, {}, { ok: false }, { ok: true }]) {
        assert.equal(local(model.quickView(bad)).error?.code, 'INVALID_MODEL');
    }

    // 10. Invariante: ninguna clave ni valor dice «activo».
    for (const out of [mP, mQ, mR, mQu, mAmb, c, qvP]) {
        for (const text of allTexts(out)) {
            assert.ok(!/activ/i.test(text), `no debe aparecer «activo»: ${text}`);
        }
    }

    console.log('farmacia_ea_screen_model_check OK');
}

main();
