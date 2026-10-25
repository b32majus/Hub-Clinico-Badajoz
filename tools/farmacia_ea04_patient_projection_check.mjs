import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Check focal FH-EA-04A: proyección pura de lectura EA 0..N por paciente.
//
// Comprueba SÓLO el derivador puro: agrupación por episodio, conteos
// (episodios únicos / observaciones / existencia documentada), conservación
// literal de observaciones explícitas, aislamiento entre pacientes y pureza.
// Reutiliza `farmaciaEaInvariants.validateObservations` para la integridad de
// referencias de cada acto; este check no reimplementa esas reglas ni las
// sustituye.
//
// Límites fijados aquí y NO tocados por esta unidad:
//   - no hay lectura de DOM, Excel, catálogo, historia importada, IndexedDB ni
//     estado global; no hay pantalla, cableado, Quick View, Dashboard ni
//     Estadísticas;
//   - no se calculan fechas, tasas, incidencias, gravedad agregada, causalidad
//     ni probabilidad; no se etiqueta «última» observación ni episodio
//     «activo/resuelto»;
//   - no se deduce relación por texto, fármaco ni orden de transporte, y un
//     `status:'incorporated'` técnico no se presenta como evolución clínica;
//   - no se promueven borradores: un estado no incorporado falla cerrado.
//
// El módulo puro se carga en un contexto aislado. No se modifica ninguna suite
// existente ni ningún módulo publicado.
const invariantsPath = 'modules/farmacia_ea_invariants.js';
const projectionPath = 'modules/farmacia_ea_patient_projection.js';

function loadProjection(withInvariants = true) {
    const sandbox = { window: { HubTools: {} }, console: { log() {}, error() {} } };
    vm.createContext(sandbox);
    if (withInvariants) {
        vm.runInContext(fs.readFileSync(invariantsPath, 'utf8'), sandbox, { filename: invariantsPath });
    }
    vm.runInContext(fs.readFileSync(projectionPath, 'utf8'), sandbox, { filename: projectionPath });
    return sandbox.window.HubTools.farmaciaEaPatientProjection;
}

// Convierte sólo prototipos de reino, preservando undefined y claves propias.
function local(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return Array.from(value, local);
    return Object.fromEntries(Object.keys(value).map(key => [key, local(value[key])]));
}

function main() {
    assert.ok(fs.existsSync(invariantsPath), 'falta el módulo puro de invariantes EA');
    assert.ok(fs.existsSync(projectionPath), 'falta la proyección pura de lectura EA por paciente');

    const api = loadProjection();
    assert.equal(typeof api?.project, 'function', 'HubTools.farmaciaEaPatientProjection.project debe existir');
    const project = api.project;

    const PATIENT = 'P-A';

    // Observación EA explícita ya incorporada. Los campos ausentes no se
    // completan y los centinelas escalares se conservan.
    const ea = fields => ({
        patientRef: PATIENT,
        actId: 'ACT-A',
        episode_id: 'E1',
        observation_id: 'O1',
        status: 'incorporated',
        description: 'Cefalea',
        ...fields
    });

    // Marco de acto exactamente como lo exige el validador publicado; la
    // proyección no inventa `present`, `history` ni `selections`.
    const act = fields => ({
        actId: 'ACT-A',
        present: 'si',
        adverse_events: [],
        history: [],
        selections: [],
        ...fields
    });

    const request = (acts, extra = {}) => ({ patientRef: PATIENT, acts, ...extra });

    const refOf = observation => Object.fromEntries(
        ['patientRef', 'actId', 'episode_id', 'observation_id'].map(key => [key, observation[key]])
    );

    const OUTPUT_KEYS = ['ok', 'patientRef', 'episodes', 'uniqueEpisodeCount', 'observationCount', 'patientHasDocumentedEa'];

    function good(input) {
        const before = structuredClone(input);
        const raw = project(input);
        const result = local(raw);
        assert.equal(result?.ok, true, `debía proyectar: ${JSON.stringify(result?.error ?? null)}`);
        assert.deepEqual(input, before, 'una proyección aceptada no muta la entrada');
        assert.deepEqual(Object.keys(result).sort(), [...OUTPUT_KEYS].sort(), 'claves de salida fuera de contrato');
        assert.equal(typeof result.patientRef, 'string');
        assert.equal(result.patientHasDocumentedEa, result.observationCount > 0, 'existencia documentada derivada de registros presentes');
        assert.equal(result.uniqueEpisodeCount, result.episodes.length, 'el conteo de episodios debe coincidir con la agrupación');
        assert.equal(
            result.observationCount,
            result.episodes.reduce((total, episode) => total + episode.observations.length, 0),
            'el conteo de observaciones debe coincidir con la agrupación'
        );
        return result;
    }

    function bad(input, code) {
        const before = structuredClone(input);
        const result = local(project(input));
        assert.equal(result?.ok, false, 'debía rechazar la proyección');
        assert.equal(typeof result.error?.code, 'string', 'el fallo debe traer código estructurado');
        assert.ok(result.error.code.length > 0, 'el código de fallo no puede estar vacío');
        assert.equal(typeof result.error?.message, 'string', 'el fallo debe traer mensaje');
        assert.ok(result.error.message.length > 0, 'el mensaje de fallo no puede estar vacío');
        if (code !== undefined) {
            assert.equal(result.error.code, code, 'código de fallo inesperado');
        }
        for (const key of ['episodes', 'uniqueEpisodeCount', 'observationCount', 'patientHasDocumentedEa']) {
            assert.equal(result[key], undefined, `un fallo no devuelve proyección parcial (${key})`);
        }
        assert.deepEqual(input, before, 'una proyección rechazada no muta la entrada');
        return result.error.code;
    }

    // Igual que `bad` pero para entradas deliberadamente no clonables: un valor
    // función no puede fotografiarse con structuredClone, y una propiedad
    // accessor no debe invocarse ni para comprobarla.
    function badUnclonable(input, code) {
        const result = local(project(input));
        assert.equal(result?.ok, false, 'debía rechazar la proyección');
        assert.equal(typeof result.error?.code, 'string', 'el fallo debe traer código estructurado');
        assert.equal(typeof result.error?.message, 'string', 'el fallo debe traer mensaje');
        assert.ok(result.error.message.length > 0, 'el mensaje de fallo no puede estar vacío');
        assert.equal(result.error?.code, code, 'código de fallo inesperado');
        for (const key of ['episodes', 'uniqueEpisodeCount', 'observationCount', 'patientHasDocumentedEa']) {
            assert.equal(result[key], undefined, `un fallo no devuelve proyección parcial (${key})`);
        }
        return result.error.code;
    }

    // --- 0 EA: nada que proyectar y ninguna inferencia de estado.
    const empty = good(request([]));
    assert.equal(empty.uniqueEpisodeCount, 0);
    assert.equal(empty.observationCount, 0);
    assert.equal(empty.patientHasDocumentedEa, false);
    assert.deepEqual(empty.episodes, []);

    const absent = good(request([act({ present: 'no_consta' }), act({ actId: 'ACT-B', present: 'no' })]));
    assert.equal(absent.uniqueEpisodeCount, 0);
    assert.equal(absent.observationCount, 0);
    assert.equal(absent.patientHasDocumentedEa, false);

    // --- 1 EA nuevo: 1 episodio / 1 observación, conservado literalmente.
    const first = ea({});
    const one = good(request([act({ adverse_events: [first] })]));
    assert.equal(one.uniqueEpisodeCount, 1);
    assert.equal(one.observationCount, 1);
    assert.equal(one.patientHasDocumentedEa, true);
    assert.deepEqual(one.episodes, [{ episode_id: 'E1', observations: [first] }]);

    // --- Mismo episodio E1 observado en los actos A y B: 1 episodio / 2
    // observaciones, con la referencia explícita conservada.
    const o1 = ea({ observation_id: 'O1', episode_id: 'E1' });
    const o2 = ea({
        actId: 'ACT-B',
        observation_id: 'O2',
        episode_id: 'E1',
        basis: refOf(o1),
        review: { confirmed: true, unchanged: true }
    });
    const revisited = good(request([
        act({ adverse_events: [o1] }),
        act({ actId: 'ACT-B', adverse_events: [o2], history: [o1] })
    ]));
    assert.equal(revisited.uniqueEpisodeCount, 1, 'el mismo episodio revisado en dos actos cuenta una vez');
    assert.equal(revisited.observationCount, 2, 'dos actos del mismo episodio son dos observaciones');
    assert.deepEqual(revisited.episodes[0].observations.map(item => item.observation_id), ['O1', 'O2']);
    assert.deepEqual(revisited.episodes[0].observations[1].basis, refOf(o1), 'la referencia explícita se conserva');

    // --- 5 EA en dos actos: 4 episodios únicos / 5 observaciones.
    const fiveA = [
        ea({ observation_id: 'O1', episode_id: 'E1', description: 'Cefalea' }),
        ea({ observation_id: 'O2', episode_id: 'E2', description: 'Prurito' }),
        ea({ observation_id: 'O3', episode_id: 'E3', description: 'Náuseas' })
    ];
    const fiveB = [
        ea({
            actId: 'ACT-B', observation_id: 'O4', episode_id: 'E1',
            basis: refOf(fiveA[0]), evolution: 'continuation', description: 'Cefalea en seguimiento'
        }),
        ea({ actId: 'ACT-B', observation_id: 'O5', episode_id: 'E4', description: 'Rash' })
    ];
    const five = good(request([
        act({ adverse_events: fiveA }),
        act({ actId: 'ACT-B', adverse_events: fiveB, history: fiveA })
    ]));
    assert.equal(five.uniqueEpisodeCount, 4);
    assert.equal(five.observationCount, 5);
    assert.deepEqual(five.episodes.map(episode => episode.episode_id), ['E1', 'E2', 'E3', 'E4']);
    assert.deepEqual(five.episodes[0].observations.map(item => item.observation_id), ['O1', 'O4']);

    // --- Un acto con dos fármacos dispensados no multiplica episodios ni
    // observaciones por línea: dos líneas explícitas en una observación.
    const lines = good(request([act({
        adverse_events: [
            ea({ observation_id: 'O1', episode_id: 'E1', lines: ['LINE-1', 'LINE-2'] }),
            ea({ observation_id: 'O2', episode_id: 'E2', lines: ['LINE-1'], description: 'Prurito' })
        ]
    })]));
    assert.equal(lines.uniqueEpisodeCount, 2);
    assert.equal(lines.observationCount, 2);
    assert.deepEqual(lines.episodes[0].observations[0].lines, ['LINE-1', 'LINE-2']);

    // --- Recurrencia explícita: episodio nuevo relacionado, sin heredar nada
    // del anterior y sin fabricar la relación.
    const recurrence = ea({
        actId: 'ACT-B',
        observation_id: 'O2',
        episode_id: 'E2',
        basis: refOf(o1),
        evolution: 'recurrence',
        relatedEpisodeId: 'E1',
        description: 'Cefalea recurrente'
    });
    const recurrent = good(request([
        act({ adverse_events: [o1] }),
        act({ actId: 'ACT-B', adverse_events: [recurrence], history: [o1] })
    ]));
    assert.equal(recurrent.uniqueEpisodeCount, 2, 'una recurrencia explícita es un episodio nuevo');
    assert.equal(recurrent.observationCount, 2);
    assert.deepEqual(recurrent.episodes.map(episode => episode.episode_id), ['E1', 'E2']);
    assert.equal(recurrent.episodes[1].relatedEpisodeId, 'E1', 'la relación explícita declarada se conserva');
    assert.equal(recurrent.episodes[1].observations[0].evolution, 'recurrence');

    // Sin declaración literal de relación no se proyecta ninguna.
    const recurrenceWithoutRelation = ea({
        actId: 'ACT-B',
        observation_id: 'O2',
        episode_id: 'E2',
        basis: refOf(o1),
        evolution: 'recurrence',
        description: 'Cefalea recurrente'
    });
    const recurrentSilent = good(request([
        act({ adverse_events: [o1] }),
        act({ actId: 'ACT-B', adverse_events: [recurrenceWithoutRelation], history: [o1] })
    ]));
    assert.equal(recurrentSilent.uniqueEpisodeCount, 2);
    assert.equal(
        Object.hasOwn(recurrentSilent.episodes[1], 'relatedEpisodeId'),
        false,
        'basis no se traduce en una relación inventada'
    );

    // Relaciones explícitas contradictorias dentro del mismo episodio: cerrado.
    bad(request([
        act({ adverse_events: [ea({ observation_id: 'O1', episode_id: 'E1', relatedEpisodeId: 'E0-A' })] }),
        act({
            actId: 'ACT-B',
            adverse_events: [ea({
                actId: 'ACT-B', observation_id: 'O2', episode_id: 'E1',
                basis: refOf(o1), review: { confirmed: true, unchanged: true },
                relatedEpisodeId: 'E0-B'
            })],
            history: [ea({ observation_id: 'O1', episode_id: 'E1' })]
        })
    ]), 'CONTRADICTORY_RELATED_EPISODE_ID');
    bad(request([
        act({ adverse_events: [ea({ observation_id: 'O1', episode_id: 'E1', relatedEpisodeId: 'E1' })] })
    ]), 'CONTRADICTORY_RELATED_EPISODE_ID');

    // --- Varias sospechas no multiplican episodios; el mismo texto de fármaco
    // en episodios distintos no los fusiona.
    const suspicionA = { patientRef: PATIENT, episode_id: 'E1', medicationRef: 'MED-EXT-1' };
    const suspicionB = { patientRef: PATIENT, episode_id: 'E1', medicationRef: 'MED-EXT-2' };
    const suspicions = good(request([act({
        adverse_events: [
            ea({ observation_id: 'O1', episode_id: 'E1', suspicions: [suspicionA, suspicionB] }),
            ea({ observation_id: 'O2', episode_id: 'E2', description: 'Rash', suspectedText: 'Metotrexato' }),
            ea({ observation_id: 'O3', episode_id: 'E3', description: 'Fiebre', suspectedText: 'Metotrexato' })
        ]
    })]));
    assert.equal(suspicions.uniqueEpisodeCount, 3);
    assert.equal(suspicions.observationCount, 3);
    assert.deepEqual(suspicions.episodes[0].observations[0].suspicions, [suspicionA, suspicionB]);

    // --- Sospecha externa/no dispensada y evaluación explícita conservadas
    // literalmente; ninguna relación se deduce por fármaco.
    const externalEvaluation = {
        evaluation_id: 'EV-1',
        patientRef: PATIENT,
        episode_id: 'E1',
        medicationRef: 'MED-EXT-1',
        method: 'naranjo',
        actId: 'ACT-A'
    };
    const associations = good(request([act({
        adverse_events: [ea({
            observation_id: 'O1',
            episode_id: 'E1',
            suspicions: [suspicionA],
            evaluations: [externalEvaluation]
        })]
    })]));
    assert.deepEqual(associations.episodes[0].observations[0].suspicions, [suspicionA]);
    assert.deepEqual(associations.episodes[0].observations[0].evaluations, [externalEvaluation]);

    // --- Orden de transporte, no cronología acreditada: se conserva y no se
    // etiqueta «última» observación ni episodio «activo/resuelto».
    const reversed = good(request([
        act({ actId: 'ACT-B', adverse_events: [ea({ actId: 'ACT-B', observation_id: 'O2', episode_id: 'E2', description: 'Prurito' })] }),
        act({ actId: 'ACT-A', adverse_events: [ea({ observation_id: 'O1', episode_id: 'E1' })] })
    ]));
    assert.deepEqual(reversed.episodes.map(episode => episode.episode_id), ['E2', 'E1'], 'el orden es el de transporte');
    for (const episode of reversed.episodes) {
        assert.deepEqual(Object.keys(episode).sort(), ['episode_id', 'observations'], 'el episodio no añade estado ni fecha');
        assert.equal(Object.hasOwn(episode, 'lastObservation'), false);
        assert.equal(Object.hasOwn(episode, 'active'), false);
        assert.equal(Object.hasOwn(episode, 'resolved'), false);
    }
    for (const observation of reversed.episodes[1].observations) {
        assert.equal(Object.hasOwn(observation, 'last'), false);
        assert.equal(Object.hasOwn(observation, 'isLatest'), false);
    }

    // `No`/`No consta` posteriores no resuelven el episodio previo ni lo
    // continúan: un acto sin observaciones no aporta ni quita nada.
    const unresolved = good(request([
        act({ adverse_events: [ea({})] }),
        act({ actId: 'ACT-B', present: 'no' }),
        act({ actId: 'ACT-C', present: 'no_consta' })
    ]));
    assert.equal(unresolved.uniqueEpisodeCount, 1);
    assert.equal(unresolved.observationCount, 1);
    assert.deepEqual(Object.keys(unresolved.episodes[0]).sort(), ['episode_id', 'observations']);
    bad(request([act({ present: 'no', adverse_events: [ea({})] })]), 'STATE_CONTRADICTION');

    // --- Ausencia / undefined / null se distinguen y se conservan.
    const missing = good(request([act({
        adverse_events: [
            ea({ observation_id: 'O1', episode_id: 'E1', severity: null }),
            ea({ observation_id: 'O2', episode_id: 'E2', description: 'Prurito', severity: undefined }),
            ea({ observation_id: 'O3', episode_id: 'E3', description: 'Náuseas' })
        ]
    })]));
    const [nullSeverity, undefinedSeverity, absentSeverity] = missing.episodes.map(episode => episode.observations[0]);
    assert.equal(Object.hasOwn(nullSeverity, 'severity'), true);
    assert.equal(nullSeverity.severity, null);
    assert.equal(Object.hasOwn(undefinedSeverity, 'severity'), true);
    assert.equal(undefinedSeverity.severity, undefined);
    assert.equal(Object.hasOwn(absentSeverity, 'severity'), false);

    // --- La historia de A nunca aparece en B; sin contaminación entre llamadas.
    const patientB = 'P-B';
    const forB = good({
        patientRef: patientB,
        acts: [act({ adverse_events: [ea({ patientRef: patientB, observation_id: 'O9', episode_id: 'E9' })] })]
    });
    assert.equal(forB.patientRef, patientB);
    assert.equal(forB.uniqueEpisodeCount, 1);
    assert.equal(forB.episodes[0].observations[0].patientRef, patientB);
    bad(request([act({ adverse_events: [ea({ patientRef: patientB })] })]), 'PATIENT_ASSOCIATION_MISMATCH');

    // --- Fallos cerrados de identidad y origen.
    bad(request([
        act({ adverse_events: [ea({ observation_id: 'O1', episode_id: 'E1' })] }),
        act({ actId: 'ACT-B', adverse_events: [ea({ actId: 'ACT-B', observation_id: 'O1', episode_id: 'E2', description: 'Rash' })] })
    ]), 'DUPLICATE_OBSERVATION_ID');
    bad(request([act({}), act({})]), 'DUPLICATE_ACT_ID');
    bad(request([act({ adverse_events: [ea({ status: 'draft' })] })]), 'NOT_INCORPORATED');
    bad(request([act({ adverse_events: [ea({ status: 'validated' })] })]), 'NOT_INCORPORATED');
    bad(request([act({ adverse_events: [ea({ basis: refOf(ea({ actId: 'ACT-Z', observation_id: 'O-Z' })) })] })]), 'UNKNOWN_BASIS');
    bad(request([act({ adverse_events: [ea({ suspicions: [{ ...suspicionA, patientRef: 'P-B' }] })] })]), 'SUSPICION_PATIENT_MISMATCH');
    bad(request([act({
        adverse_events: [ea({
            suspicions: [suspicionA],
            evaluations: [externalEvaluation, { ...externalEvaluation, method: 'karch-lasagna' }]
        })]
    })]), 'DUPLICATE_EVALUATION_ID');

    // --- REHACER 1 · Colisión longitudinal entre actos: dos actos distintos no
    // pueden declarar el MISMO episodio como NUEVO. R1 valida cada acto por
    // separado y B01 sólo detecta duplicados dentro de un acto; la frontera
    // entre actos es responsabilidad de esta proyección.
    const crossActCollision = request([
        act({ adverse_events: [ea({ observation_id: 'OBS-1', episode_id: 'EP-SAME' })] }),
        act({
            actId: 'ACT-B',
            adverse_events: [ea({ actId: 'ACT-B', observation_id: 'OBS-2', episode_id: 'EP-SAME', description: 'Prurito' })]
        })
    ]);
    bad(crossActCollision, 'DUPLICATE_NEW_EPISODE_ID_ACROSS_ACTS');
    // El orden de transporte no cambia la conclusión.
    bad(request([
        crossActCollision.acts[1],
        crossActCollision.acts[0]
    ]), 'DUPLICATE_NEW_EPISODE_ID_ACROSS_ACTS');
    // Una recurrencia también declara episodio NUEVO: dos recurrencias
    // independientes con el mismo episode_id colisionan.
    bad(request([
        act({ adverse_events: [ea({ observation_id: 'OBS-1', episode_id: 'E1' })] }),
        act({
            actId: 'ACT-B',
            adverse_events: [ea({
                actId: 'ACT-B', observation_id: 'OBS-2', episode_id: 'E2',
                basis: refOf(ea({ observation_id: 'OBS-1', episode_id: 'E1' })),
                evolution: 'recurrence', description: 'Cefalea recurrente'
            })],
            history: [ea({ observation_id: 'OBS-1', episode_id: 'E1' })]
        }),
        act({
            actId: 'ACT-C',
            adverse_events: [ea({
                actId: 'ACT-C', observation_id: 'OBS-3', episode_id: 'E2',
                basis: refOf(ea({ observation_id: 'OBS-1', episode_id: 'E1' })),
                evolution: 'recurrence', description: 'Cefalea recurrente de nuevo'
            })],
            history: [ea({ observation_id: 'OBS-1', episode_id: 'E1' })]
        })
    ]), 'DUPLICATE_NEW_EPISODE_ID_ACROSS_ACTS');

    // --- REHACER 1 · `patientRef` debe ser identidad inmutable de la operación:
    // propiedad PROPIA de DATOS, leída una sola vez. Un accessor no se invoca
    // nunca y una propiedad heredada no es un dato explícito.
    let patientRefReads = 0;
    const accessorRequest = {
        get patientRef() {
            patientRefReads += 1;
            return patientRefReads === 1 ? 'PAT-A' : patientRefReads === 2 ? 'PAT-B' : 'PAT-C';
        },
        acts: [act({ adverse_events: [ea({ patientRef: 'PAT-B', observation_id: 'OBS-1', episode_id: 'E1' })] })]
    };
    badUnclonable(accessorRequest, 'INVALID_PATIENT_REF');
    assert.equal(patientRefReads, 0, 'la proyección no debe invocar el getter de patientRef');

    // Accessor estable y válido: sigue sin ser dato propio.
    let stableReads = 0;
    badUnclonable({
        get patientRef() {
            stableReads += 1;
            return PATIENT;
        },
        acts: [act({ adverse_events: [ea({})] })]
    }, 'INVALID_PATIENT_REF');
    assert.equal(stableReads, 0, 'un accessor válido tampoco se invoca');

    // Propiedad heredada: no es identidad explícita del paciente.
    badUnclonable(Object.create({ patientRef: PATIENT }), 'INVALID_PATIENT_REF');
    badUnclonable(Object.create({ acts: [act({ adverse_events: [ea({})] })] }), 'INVALID_PATIENT_REF');
    // `patientRef` propio y `acts` sólo en el prototipo: tampoco es fuente explícita.
    badUnclonable(
        Object.assign(Object.create({ acts: [act({ adverse_events: [ea({})] })] }), { patientRef: PATIENT }),
        'INVALID_ACTS'
    );
    // Un accessor en `acts` se rechaza igual, sin invocarlo.
    let actsReads = 0;
    badUnclonable({
        patientRef: PATIENT,
        get acts() {
            actsReads += 1;
            return [act({ adverse_events: [ea({})] })];
        }
    }, 'INVALID_ACTS');
    assert.equal(actsReads, 0, 'la proyección no debe invocar el getter de acts');

    // --- Entradas malformadas: error tipado, sin proyección parcial.
    bad(null, 'INVALID_REQUEST');
    bad([], 'INVALID_REQUEST');
    bad({ acts: [] }, 'INVALID_PATIENT_REF');
    bad(request(undefined), 'INVALID_ACTS');
    bad(request([null]), 'INVALID_ACT');
    bad(request([act({ actId: '' })]), 'INVALID_ACT_ID');
    bad(request([act({ present: 'quizá' })]), 'INVALID_PRESENT');
    bad(request([{ actId: 'ACT-A', present: 'si', adverse_events: [] }]), 'INVALID_HISTORY');

    // --- Estructuras no soportadas (función, ciclo) fallan cerradas.
    badUnclonable(request([act({ adverse_events: [ea({ notes: () => 'no' })] })]), 'UNSUPPORTED_STRUCTURE');
    const cyclic = ea({});
    cyclic.self = cyclic;
    bad(request([act({ adverse_events: [cyclic] })]), 'UNSUPPORTED_STRUCTURE');

    // --- Sin el validador publicado la proyección no reimplementa reglas.
    const withoutInvariants = loadProjection(false);
    const blocked = local(withoutInvariants.project(request([act({ adverse_events: [ea({})] })])));
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error.code, 'MISSING_INVARIANTS');
    assert.equal(blocked.episodes, undefined);

    // --- Pureza: salidas desconectadas de la entrada y entre llamadas.
    const purityInput = request([act({ adverse_events: [ea({})] })]);
    const projection = loadProjection();
    const purityBefore = structuredClone(purityInput);
    const rawA = projection.project(purityInput);
    const rawB = projection.project(purityInput);
    assert.equal(rawA.ok, true);
    assert.notEqual(rawA.episodes[0].observations[0], purityInput.acts[0].adverse_events[0], 'la salida no comparte objetos con la entrada');
    assert.notEqual(rawA.episodes[0].observations[0], rawB.episodes[0].observations[0], 'cada llamada devuelve estructuras nuevas');
    assert.deepEqual(purityInput, purityBefore, 'la proyección no muta la entrada');
    rawA.episodes[0].observations[0].description = 'mutado por el consumidor';
    rawA.episodes.push({ episode_id: 'INVENTADO', observations: [] });
    const rawC = projection.project(purityInput);
    assert.equal(rawC.ok, true);
    assert.equal(rawC.episodes.length, 1);
    assert.equal(rawC.episodes[0].observations[0].description, 'Cefalea');
    assert.deepEqual(purityInput, purityBefore, 'mutar la salida no altera la entrada');

    console.log('PASS proyección pura EA 0..N: 0/1/2/5 EA y episodio único por observación');
    console.log('PASS mismo episodio en dos actos = 1 episodio / 2 observaciones');
    console.log('PASS recurrencia explícita como episodio nuevo, sin relación inventada');
    console.log('PASS línea dispensada y varias sospechas no multiplican episodios');
    console.log('PASS orden de transporte conservado, sin «última»/«activo»/«resuelto»');
    console.log('PASS ausencia / undefined / null distinguidos y conservados');
    console.log('PASS aislamiento A/B, duplicados, estado no incorporado y estructuras no soportadas');
    console.log('PASS pureza profunda y ausencia de proyección parcial');
    console.log('PASS colisión de episodio nuevo entre actos rechazada, agrupación legítima conservada');
    console.log('PASS patientRef inmutable: propiedad propia de datos, sin getters ni herencia');
    console.log('PASS farmacia_ea04_patient_projection_check');
}

const invoked = process.argv[1] ? fs.realpathSync(process.argv[1]) : '';
const self = fs.realpathSync(new URL(import.meta.url));
if (invoked === self) main();
