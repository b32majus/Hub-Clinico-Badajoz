import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Check focal EA v1 demo (#867) · C3a: lector del libro Bridge de 166 columnas.
//
// El lector toma filas tipadas (las que publica C2a/C2b), se queda con las de
// UN paciente, agrupa por acto, decodifica cada acto con el core publicado y
// entrega la historia EA del paciente ya proyectada y con su estado por
// episodio. No escribe, no infiere y no lee DOM ni red.
//
// Reglas que fija este check:
//  - `history` de cada acto = SOLO las observaciones que sus `basis` citan
//    expresamente (de otros actos del mismo paciente). Nunca «todo lo demás»:
//    eso haría que un acto viera su propio futuro.
//  - `selections` no se inventa: siempre [].
//  - La fecha del acto es `visit_date` de su fila de acto; si falta, null.
//  - El orden de las filas del libro y de los actos no cambia el resultado.
//  - Un paciente ajeno con los mismos ids (E1/O1) no contamina al leído.
//  - Filas heredadas de 152 columnas no se leen como EA: se cuentan aparte.
//    No se atribuyen a un paciente (no tienen fh_patient_ref) y NO equivalen a
//    «sin EA». Ausente ≠ NO.
//  - Todo fallo es cerrado: sin resultado parcial.
const paths = [
    'scripts/farmacia_export_v2_core.js',
    'scripts/farmacia_bridge_ea_typed_codec.js',
    'modules/farmacia_act_contract.js',
    'modules/farmacia_act_payloads.js',
    'modules/farmacia_ea_invariants.js',
    'modules/farmacia_ea_patient_projection.js',
    'modules/farmacia_ea_episode_state.js',
    'scripts/farmacia_bridge_raw_ea_v21_core.js',
    'scripts/farmacia_bridge_raw_ea_v21_reader.js'
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
    assert.equal(typeof reader?.readPatient, 'function', 'FarmaciaBridgeRawEaV21Reader.readPatient debe existir');

    const P = 'PATREF-P';
    const Q = 'PATREF-Q';

    // --- Fábrica de filas sintéticas por acto (core publicado) --------------
    const event = (actId, date) => {
        const base = {
            event_type: 'pharmacy_followup', event_id: `e-${actId}`, source_event_id: `s-${actId}`,
            event_status: 'recorded', occurred_at: `${date}T10:00:00Z`, recorded_at: `${date}T10:01:00Z`,
            demo_flag: true, patient_id: 'patient-syn-x', visit_id: `v-${actId}`,
            identifier_value: 'CIP-DEMO-X', visit_date: date
        };
        return base;
    };
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

    // Paciente P: A (E1 con 2 sospechosos + 1 evaluación, y E9) → B (continúa E1)
    // → C (`No`) → D (resuelve E1) → E (recurrencia = E2 relacionado con E1).
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
    const actsP = [
        { patientRef: P, actId: 'ACT-A', date: '2026-01-10', obs: [o1, o9] },
        { patientRef: P, actId: 'ACT-B', date: '2026-02-10', obs: [o2], history: [o1] },
        { patientRef: P, actId: 'ACT-C', date: '2026-03-10', present: 'no' },
        { patientRef: P, actId: 'ACT-D', date: '2026-04-10', obs: [o3], history: [o2] },
        { patientRef: P, actId: 'ACT-E', date: '2026-05-10', obs: [o4], history: [o3] }
    ];
    // Paciente Q: MISMOS ids de episodio y observación que P (E1/O1) pero otro paciente.
    const q1 = ea(Q, 'ACT-Q1', { observation_id: 'O1', description: 'Prurito', suspicions: [], evaluations: [] });
    const actsQ = [{ patientRef: Q, actId: 'ACT-Q1', date: '2026-01-20', obs: [q1] }];

    const rowsP = rowsOf(actsP);
    const rowsQ = rowsOf(actsQ);
    const byId = (list, id) => list.find(item => item.episode_id === id);
    const read = (patientRef, rows) => local(reader.readPatient({ patientRef, rows }));

    // 1. Lectura completa de P: actos, historia derivada de los `basis`, fechas.
    let result = read(P, rowsP);
    assert.equal(result.ok, true, JSON.stringify(result.error ?? null));
    assert.equal(result.patientRef, P);
    assert.equal(result.actCount, 5);
    assert.deepEqual(result.actDates, {
        'ACT-A': '2026-01-10', 'ACT-B': '2026-02-10', 'ACT-C': '2026-03-10',
        'ACT-D': '2026-04-10', 'ACT-E': '2026-05-10'
    });
    const actOf = id => result.acts.find(act => act.actId === id);
    assert.deepEqual(actOf('ACT-A').history, [], 'el primer acto no tiene historia');
    assert.deepEqual(actOf('ACT-B').history.map(h => h.observation_id), ['O1'], 'B cita sólo O1');
    assert.deepEqual(actOf('ACT-D').history.map(h => h.observation_id), ['O2'], 'D cita sólo O2 (no su pasado ni su futuro)');
    assert.deepEqual(actOf('ACT-C').history, []);
    for (const act of result.acts) assert.deepEqual(act.selections, [], 'selections no se inventa');
    assert.equal(actOf('ACT-C').present, 'no');

    // 2. Varios sospechosos y evaluaciones del acto llegan íntegros a la proyección.
    assert.equal(result.projection.ok, true);
    assert.equal(result.projection.uniqueEpisodeCount, 3);
    assert.equal(result.projection.observationCount, 5);
    const obsO1 = byId(result.projection.episodes, 'E1').observations.find(o => o.observation_id === 'O1');
    assert.deepEqual(obsO1.suspicions.map(s => s.medicationRef), ['MED-1', 'MED-2']);
    assert.equal(obsO1.evaluations.length, 1);
    assert.equal(obsO1.evaluations[0].method, 'naranjo');

    // 3. Estado por episodio: último estado registrado, su fecha, cierre sólo explícito.
    assert.equal(result.state.ok, true);
    const e1 = byId(result.state.episodes, 'E1');
    assert.equal(e1.lastObservationId, 'O3');
    assert.equal(e1.lastDate, '2026-04-10');
    assert.equal(e1.closed, true);
    const e2 = byId(result.state.episodes, 'E2');
    assert.equal(e2.relatedEpisodeId, 'E1');
    assert.equal(e2.closed, false);
    assert.equal(byId(result.state.episodes, 'E9').lastDate, '2026-01-10', 'el `No` posterior no mueve E9');
    assert.equal(result.state.closedEpisodeCount, 1);

    // 4. Orden del libro irrelevante (actos y filas dentro de cada acto).
    const reversedActs = rowsOf([...actsP].reverse());
    assert.deepEqual(read(P, reversedActs), result, 'el orden de los actos en el libro no cambia el resultado');
    const perAct = actsP.map(act => buildAct(act));
    const scrambled = perAct.flatMap(rows => [...rows].reverse());
    assert.deepEqual(read(P, scrambled), result, 'el orden de las filas dentro del acto no cambia el resultado');

    // 5. Sin contaminación entre pacientes (mismos E1/O1) y sin estado entre llamadas: A→B→A.
    const mixed = [...rowsQ.slice(0, 1), ...rowsP.slice(0, 7), ...rowsQ.slice(1), ...rowsP.slice(7)];
    const mixedRead = patientRef => read(patientRef, mixed);
    const first = mixedRead(P);
    const other = mixedRead(Q);
    const again = mixedRead(P);
    assert.deepEqual(first, result, 'las filas de Q no cambian la lectura de P');
    assert.deepEqual(again, first, 'leer Q entre medias no deja estado: A→B→A');
    assert.equal(other.ok, true);
    assert.equal(other.actCount, 1);
    assert.equal(other.projection.observationCount, 1);
    assert.equal(other.projection.episodes[0].observations[0].description, 'Prurito');
    assert.equal(other.state.episodes[0].lastDate, '2026-01-20');

    // 6. No muta la entrada.
    const input = { patientRef: P, rows: rowsP };
    const before = structuredClone(local(input));
    reader.readPatient(input);
    assert.deepEqual(local(input), before, 'readPatient no muta su petición');

    // 7. Paciente sin EA documentado: existe, pero sin episodios. Paciente ausente: error, NO «sin EA».
    const noEa = read(Q, rowsOf([{ patientRef: Q, actId: 'ACT-Q9', date: '2026-02-01', present: 'no' }]));
    assert.equal(noEa.ok, true);
    assert.equal(noEa.actCount, 1);
    assert.deepEqual(noEa.projection.episodes, []);
    assert.equal(noEa.projection.patientHasDocumentedEa, false);
    const missing = read('PATREF-NADIE', rowsP);
    assert.equal(missing.ok, false);
    assert.equal(missing.error.code, 'PATIENT_NOT_FOUND', 'ausente ≠ NO');

    // 8. Fecha ausente → null, nunca inferida. (visit_date puede ser null en el core.)
    const undated = rowsOf([{ patientRef: P, actId: 'ACT-U', date: '2026-06-01', obs: [ea(P, 'ACT-U', { observation_id: 'OU', episode_id: 'EU', suspicions: [], evaluations: [] })] }])
        .map(row => ({ ...row, visit_date: null }));
    const undatedRead = read(P, undated);
    if (undatedRead.ok) {
        assert.equal(undatedRead.actDates['ACT-U'], undefined);
        assert.equal(byId(undatedRead.state.episodes, 'EU').lastDate, null);
    } else {
        assert.ok(['INVALID_ROW_SET', 'INVALID_ACT_DATES'].includes(undatedRead.error.code));
    }

    // 9. Filas heredadas de 152 columnas: contadas, no leídas como EA, no atribuidas a P.
    const legacyRow = Object.fromEntries(Object.entries(rowsQ[0]).slice(0, 152));
    assert.equal(Object.keys(legacyRow).length, 152);
    const withLegacy = read(P, [...rowsP, legacyRow]);
    assert.equal(withLegacy.ok, true);
    assert.equal(withLegacy.legacyRowCount, 1);
    assert.equal(withLegacy.projection.observationCount, 5, 'una fila heredada no añade EA');
    assert.equal(result.legacyRowCount, 0);
    const onlyLegacy = read(P, [legacyRow]);
    assert.equal(onlyLegacy.ok, false);
    assert.equal(onlyLegacy.error.code, 'PATIENT_NOT_FOUND', 'sólo filas heredadas ⇒ sin datos estructurados, no «sin EA»');

    // 10. Fallos cerrados, sin resultado parcial.
    const fail = (patientRef, rows, code, label) => {
        const out = read(patientRef, rows);
        assert.equal(out.ok, false, `${label}: debía fallar`);
        assert.equal(out.error.code, code, `${label}: código ${out.error?.code}`);
        assert.equal('projection' in out, false, `${label}: sin proyección parcial`);
    };
    fail(null, rowsP, 'INVALID_REQUEST', 'patientRef nulo');
    fail('', rowsP, 'INVALID_REQUEST', 'patientRef vacío');
    fail(P, 'x', 'INVALID_REQUEST', 'rows no array');
    fail(P, [null], 'INVALID_REQUEST', 'fila no objeto');
    // `basis` que apunta a un acto que no está en el libro (acto B borrado).
    const withoutB = rowsOf(actsP.filter(act => act.actId !== 'ACT-B'));
    fail(P, withoutB, 'UNKNOWN_BASIS', 'basis huérfano');
    // fila adulterada: la versión de cabecera ya no es la publicada.
    const tampered = rowsP.map((row, i) => (i === 0 ? { ...row, row_schema_version: '2.0.0-draft.1' } : row));
    fail(P, tampered, 'INVALID_ROW_SET', 'versión de cabecera');
    // un acto incompleto (falta una fila del manifiesto).
    fail(P, rowsP.slice(0, -1), 'INVALID_ROW_SET', 'acto incompleto');
    // dos eventos distintos con el mismo acto.
    const dup = [...rowsP, ...buildAct({ patientRef: P, actId: 'ACT-A', date: '2026-07-01', present: 'no' }).map(row => ({ ...row, source_event_id: 's-dup', event_id: 'e-dup' }))];
    const dupOut = read(P, dup);
    assert.equal(dupOut.ok, false);

    // 11. Nunca «activo»: ni clave ni valor del resultado (no se expone nada de las líneas).
    assert.equal(allKeys(result).some(key => /activ/i.test(key)), false, 'ninguna clave «activo»');
    assert.equal(/activ/i.test(JSON.stringify(result)), false, 'ningún valor «activo»');

    console.log('farmacia_bridge_raw_ea_v21_reader_check: OK');
}

main();
