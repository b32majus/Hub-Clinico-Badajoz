import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Check focal FH-EA-B02: identidad única de evaluación EA dentro de una
// observación (D06 de FH-EA-0N / PRD v0.5).
//
// Invariante comprobada: dentro del array `evaluations` de UNA misma
// observación no pueden coexistir dos evaluaciones distintas que reutilicen la
// misma identidad propia (`evaluation_id`). La identidad es únicamente
// `evaluation_id`: el método, el resultado, la gravedad, el sospechoso o el
// orden no la determinan ni la suplen.
//
// Lo NO tocado por este check, y que aquí se fija como límite de alcance:
//   - la reevaluación posterior clínicamente válida (D06) aporta identidades
//     de evaluación NUEVAS y conserva la historia sin sobrescribirla; se
//     comprueba aparte y sin tolerar ninguna identidad repetida;
//   - la tolerancia a un `evaluation_id` repetido entre actos, entre
//     observaciones distintas o entre revisiones históricas es una FRONTERA
//     TÉCNICA declarada, no una conducta clínica correcta: B02 no implanta
//     deduplicación global porque falta el contrato específico y la frontera
//     de lectura persistida. Se comprueba en su propio bloque, separada de la
//     reevaluación válida, para que una deduplicación global futura tenga que
//     cambiar ese test y su contrato a conciencia;
//   - los rechazos previos de evaluación (identidad ausente, paciente,
//     episodio o acto incoherentes) conservan su código y su precedencia
//     sobre el rechazo nuevo;
//   - `No`, `No consta`, borradores, sospechosos expresos y 0/1/2/5 EA
//     conservan su comportamiento;
//   - el módulo no infiere sospecha, causalidad, exposición, fechas, estados
//     ni resultados, y no genera identidades.
//
// El módulo puro se carga en un contexto aislado (sin DOM, paciente activo ni
// almacenamiento); no se modifica ninguna suite existente.
const modulePath = 'modules/farmacia_ea_invariants.js';
const DUPLICATE_EVALUATION_CODE = 'DUPLICATE_EVALUATION_ID';

function main() {
    assert.ok(fs.existsSync(modulePath), 'falta el módulo puro de invariantes EA');

    const sandbox = { window: { HubTools: {} }, console: { log() {}, error() {} } };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(modulePath, 'utf8'), sandbox, { filename: modulePath });
    const api = sandbox.window.HubTools.farmaciaEaInvariants;
    assert.equal(typeof api?.validateObservations, 'function', 'validateObservations debe existir');
    assert.equal(typeof api?.validateNewEvents, 'function', 'validateNewEvents debe existir');

    // Convierte sólo prototipos de reino, preservando undefined y claves propias.
    function local(value) {
        if (!value || typeof value !== 'object') return value;
        if (Array.isArray(value)) return Array.from(value, local);
        return Object.fromEntries(Object.keys(value).map(key => [key, local(value[key])]));
    }

    const PATIENT = 'P-DEMO';
    const ACT = 'ACT-1';
    const EPISODE = 'EP-1';

    // Las dos superficies públicas comparten el mismo helper de asociaciones
    // clínicas; ambas deben rechazar la identidad duplicada.
    const surfaces = [
        {
            name: 'validateNewEvents',
            validate: api.validateNewEvents,
            request: events => ({ patientRef: PATIENT, actId: ACT, present: 'si', adverse_events: events })
        },
        {
            name: 'validateObservations',
            validate: api.validateObservations,
            request: events => ({
                patientRef: PATIENT,
                actId: ACT,
                present: 'si',
                history: [],
                selections: [],
                adverse_events: events
            })
        }
    ];

    // Una evaluación: identidad propia + pareja episodio-medicamento + método
    // + acto. El resultado de valoración NO forma parte de la identidad.
    function evaluation(overrides) {
        return Object.assign({
            evaluation_id: 'EVAL-1',
            patientRef: PATIENT,
            episode_id: EPISODE,
            medicationRef: 'M-1',
            method: 'naranjo',
            actId: ACT
        }, overrides);
    }

    // Una observación incorporada completa: descripción original explícita.
    function observation(overrides) {
        return Object.assign({
            patientRef: PATIENT,
            actId: ACT,
            episode_id: EPISODE,
            observation_id: 'OBS-1',
            status: 'incorporated',
            description: 'Cefalea'
        }, overrides);
    }

    function good(surface, events, label) {
        const input = surface.request(events);
        const before = structuredClone(input);
        const result = surface.validate(input);
        assert.equal(
            result?.ok,
            true,
            `${surface.name} debía aceptar ${label}: ${JSON.stringify(result?.error ?? null)}`
        );
        assert.deepEqual(input, before, `${surface.name} no muta una entrada aceptada (${label})`);
        return result;
    }

    function bad(surface, events, code, label) {
        const input = surface.request(events);
        const before = structuredClone(input);
        const result = surface.validate(input);
        assert.equal(result?.ok, false, `${surface.name} debía rechazar ${label}`);
        assert.equal(typeof result.error?.code, 'string', `${surface.name} debe devolver código estructurado`);
        assert.equal(result.error.code, code, `${surface.name} debía rechazar ${label} con ${code}`);
        // Fallo sin representación ni colecciones parciales.
        assert.equal(result.representation, undefined, `${surface.name} no devuelve representación parcial`);
        assert.equal(result.retained, undefined, `${surface.name} no devuelve retenidos parciales`);
        assert.equal(result.history, undefined, `${surface.name} no devuelve historia parcial`);
        assert.deepEqual(input, before, `${surface.name} no muta la entrada rechazada (${label})`);
        return result;
    }

    for (const surface of surfaces) {
        // --- 1. Testigo RED: dos evaluaciones distintas de la MISMA
        // observación reutilizan `EVAL-1` (métodos distintos) y la ficha es
        // aceptada por la BASE. Debe rechazarse con código estructurado.
        bad(
            surface,
            [observation({ evaluations: [
                evaluation({ method: 'naranjo' }),
                evaluation({ method: 'karch_lasagna' })
            ] })],
            DUPLICATE_EVALUATION_CODE,
            'dos evaluaciones de métodos distintos con id repetido'
        );

        // Mismo método, mismo id: la identidad repetida no depende del método.
        bad(
            surface,
            [observation({ evaluations: [evaluation(), evaluation()] })],
            DUPLICATE_EVALUATION_CODE,
            'dos evaluaciones del mismo método con id repetido'
        );

        // Sospechoso distinto, mismo id: el duplicado tampoco depende de la
        // pareja episodio-medicamento.
        bad(
            surface,
            [observation({ evaluations: [
                evaluation({ medicationRef: 'M-1' }),
                evaluation({ medicationRef: 'M-2', method: 'karch_lasagna' })
            ] })],
            DUPLICATE_EVALUATION_CODE,
            'dos evaluaciones de sospechosos distintos con id repetido'
        );

        // Un resultado de valoración tampoco crea una identidad distinta.
        bad(
            surface,
            [observation({ evaluations: [
                evaluation({ result: 'probable', severity: 'leve' }),
                evaluation({ result: 'dudosa', severity: 'grave', method: 'karch_lasagna' })
            ] })],
            DUPLICATE_EVALUATION_CODE,
            'dos evaluaciones con resultados distintos e id repetido'
        );

        // Tres o más: el duplicado puede aparecer más adelante en el array.
        bad(
            surface,
            [observation({ evaluations: [
                evaluation({ evaluation_id: 'EVAL-1' }),
                evaluation({ evaluation_id: 'EVAL-2', method: 'karch_lasagna' }),
                evaluation({ evaluation_id: 'EVAL-1', medicationRef: 'M-3' })
            ] })],
            DUPLICATE_EVALUATION_CODE,
            'duplicado no adyacente dentro de la misma observación'
        );

        // --- 2. Identidades propias distintas: se aceptan, incluyendo dos
        // métodos distintos sobre el mismo sospechoso (D06: son independientes).
        good(
            surface,
            [observation({ evaluations: [
                evaluation({ evaluation_id: 'EVAL-1', method: 'naranjo' }),
                evaluation({ evaluation_id: 'EVAL-2', method: 'karch_lasagna' })
            ] })],
            'dos métodos distintos con identidades propias'
        );

        // --- 3. Cardinalidades 0 y 1 no ganan interpretación ni rechazo.
        good(surface, [observation()], 'observación sin evaluaciones');
        good(surface, [observation({ evaluations: [] })], 'evaluaciones vacías');
        good(surface, [observation({ evaluations: [evaluation()] })], 'una sola evaluación');

        // Arrays ausentes o centinelas escalares se conservan tal cual: no se
        // convierten en colecciones ni autorizan deduplicación.
        const sentinels = good(
            surface,
            [
                observation({ observation_id: 'OBS-1', episode_id: 'EP-1', evaluations: 'No consta' }),
                observation({ observation_id: 'OBS-2', episode_id: 'EP-2', evaluations: null }),
                observation({ observation_id: 'OBS-3', episode_id: 'EP-3' })
            ],
            'centinelas escalares y arrays ausentes en evaluations'
        );
        const sentinelEvents = sentinels.representation.adverse_events;
        assert.equal(sentinelEvents[0].evaluations, 'No consta', 'el centinela escalar se conserva literal');
        assert.equal(sentinelEvents[1].evaluations, null, 'el centinela nulo se conserva literal');
        assert.equal(
            Object.prototype.hasOwnProperty.call(sentinelEvents[2], 'evaluations'),
            false,
            'un campo ausente no se completa'
        );

        // --- 4. Precedencia: los rechazos previos de evaluación conservan su
        // código aunque además exista un id repetido.
        bad(
            surface,
            [observation({ evaluations: [
                evaluation({ evaluation_id: 'EVAL-1' }),
                evaluation({ evaluation_id: undefined, method: 'karch_lasagna' })
            ] })],
            'INVALID_EVALUATION',
            'evaluation_id ausente o vacío antes del duplicado'
        );
        bad(
            surface,
            [observation({ evaluations: [
                evaluation({ evaluation_id: 'EVAL-1' }),
                evaluation({ evaluation_id: 'EVAL-1', patientRef: 'P-OTRO' })
            ] })],
            'EVALUATION_PATIENT_MISMATCH',
            'paciente incoherente antes del duplicado'
        );
        bad(
            surface,
            [observation({ evaluations: [
                evaluation({ evaluation_id: 'EVAL-1' }),
                evaluation({ evaluation_id: 'EVAL-1', episode_id: 'EP-OTRO' })
            ] })],
            'EVALUATION_EPISODE_MISMATCH',
            'episodio incoherente antes del duplicado'
        );
        bad(
            surface,
            [observation({ evaluations: [
                evaluation({ evaluation_id: 'EVAL-1' }),
                evaluation({ evaluation_id: 'EVAL-1', actId: 'ACT-9' })
            ] })],
            'EVALUATION_ACT_MISMATCH',
            'acto incoherente antes del duplicado'
        );
        bad(
            surface,
            [observation({ evaluations: [evaluation({ evaluation_id: 'EVAL-1' }), 'EVAL-1'] })],
            'INVALID_EVALUATION',
            'evaluación no objeto antes del duplicado'
        );
        // Los rechazos previos de la ficha contenedora también preceden.
        bad(
            surface,
            [{ ...observation({ evaluations: [evaluation(), evaluation({ method: 'karch_lasagna' })] }), observation_id: '' }],
            'INVALID_OBSERVATION_ID',
            'observation_id vacío antes del duplicado'
        );

        // --- 5. Estados y ausencias no cambian: `no` y `no_consta` conservan
        // sus contradicciones de estado y no evalúan identidades.
        for (const present of ['no', 'no_consta']) {
            const input = { ...surface.request([observation()]), present };
            const before = structuredClone(input);
            const result = surface.validate(input);
            assert.equal(result?.ok, false, `${surface.name} debe rechazar ${present} con ficha incorporada`);
            assert.equal(result.error.code, 'STATE_CONTRADICTION', `${surface.name} conserva STATE_CONTRADICTION en ${present}`);
            assert.deepEqual(input, before, `${surface.name} no muta la entrada en ${present}`);
        }
        // `no` y `no_consta` sin fichas del acto actual siguen aceptándose y no
        // aportan evaluaciones inventadas.
        for (const present of ['no', 'no_consta']) {
            const input = { ...surface.request([]), present };
            const before = structuredClone(input);
            const accepted = surface.validate(input);
            assert.equal(accepted?.ok, true, `${surface.name} debe aceptar ausencia de EA con ${present}: ${JSON.stringify(accepted?.error ?? null)}`);
            assert.equal(accepted.representation.present, present, 'el estado declarado no se normaliza');
            assert.deepEqual(local(accepted.representation.adverse_events), [], 'no se inventan fichas');
            assert.deepEqual(input, before, `${surface.name} no muta la entrada en ${present}`);
        }

        // Borradores: se conservan íntegros con sus evaluaciones propias.
        const draft = (id, evaluationId) => ({
            ...observation({ observation_id: id, status: 'draft' }),
            evaluations: [evaluation({ evaluation_id: evaluationId })]
        });
        const draftResult = good(
            surface,
            [observation({ evaluations: [evaluation()] }), draft('OBS-D1', 'EVAL-D1'), draft('OBS-D2', 'EVAL-D2')],
            'borradores con identidades propias'
        );
        assert.equal(draftResult.retained.length, 2, 'los borradores se conservan íntegros');
        assert.equal(draftResult.representation.adverse_events.length, 1, 'sólo lo incorporado entra en la representación');

        // Sospechosos expresos: no cambian y no participan de la identidad de
        // evaluación.
        const withSuspicions = good(
            surface,
            [observation({
                suspicions: [
                    { patientRef: PATIENT, episode_id: EPISODE, medicationRef: 'M-1' },
                    { patientRef: PATIENT, episode_id: EPISODE, medicationRef: 'M-2' }
                ],
                evaluations: [
                    { ...evaluation({ evaluation_id: 'EVAL-1' }), medicationRef: 'M-1' },
                    { ...evaluation({ evaluation_id: 'EVAL-2', method: 'karch_lasagna' }), medicationRef: 'M-2' }
                ]
            })],
            'sospechosos expresos con identidades de evaluación propias'
        );
        assert.equal(withSuspicions.representation.adverse_events[0].suspicions.length, 2, 'los sospechosos se conservan');
        assert.equal(
            withSuspicions.representation.adverse_events[0].evaluations.length,
            2,
            'las evaluaciones con identidad propia se conservan'
        );

        // Cardinalidades 2 y 5 EA distintas con identidades propias: sin límite
        // artificial.
        good(
            surface,
            [
                observation({ observation_id: 'OBS-1', evaluations: [evaluation({ evaluation_id: 'E-A' })] }),
                observation({ observation_id: 'OBS-2', episode_id: 'EP-2', evaluations: [evaluation({ evaluation_id: 'E-B', episode_id: 'EP-2' })] })
            ],
            'dos fichas con una evaluación cada una'
        );
        good(
            surface,
            Array.from({ length: 5 }, (_, index) => observation({
                observation_id: `OBS-${index + 1}`,
                episode_id: `EP-${index + 1}`,
                evaluations: [evaluation({ evaluation_id: `EVAL-${index + 1}`, episode_id: `EP-${index + 1}` })]
            })),
            'cinco fichas con una evaluación cada una'
        );
    }

    const observationsSurface = surfaces[1];

    // --- 6. Reevaluación posterior clínicamente válida (D06).
    //
    // En una visita posterior el profesional reevalúa el MISMO episodio y debe
    // aportar identidades de evaluación NUEVAS: reevaluar crea una evaluación
    // nueva, no sobrescribe ni reutiliza la anterior. Este bloque es el
    // contrato clínico y por eso NO tolera ninguna identidad repetida entre la
    // historia y el acto actual.
    const historyObservation = observation({
        actId: 'ACT-0',
        observation_id: 'OBS-H1',
        evaluations: [evaluation({ actId: 'ACT-0', evaluation_id: 'EVAL-1' })]
    });
    // La historia se apoya con `basis` explícita: la reevaluación es una
    // continuación del mismo episodio en un acto posterior, no una ficha nueva.
    const basis = { patientRef: PATIENT, actId: 'ACT-0', episode_id: EPISODE, observation_id: 'OBS-H1' };
    const reevaluation = evaluations => observation({
        observation_id: 'OBS-1',
        evolution: 'continuation',
        basis,
        evaluations
    });
    const clinicallyValidLaterVisit = {
        patientRef: PATIENT,
        actId: ACT,
        present: 'si',
        history: [historyObservation],
        selections: [basis],
        adverse_events: [reevaluation([
            evaluation({ evaluation_id: 'EVAL-2', actId: ACT }),
            evaluation({ evaluation_id: 'EVAL-3', actId: ACT, method: 'karch_lasagna' })
        ])]
    };
    const laterVisitBefore = structuredClone(clinicallyValidLaterVisit);
    const laterVisitResult = observationsSurface.validate(clinicallyValidLaterVisit);
    assert.equal(
        laterVisitResult?.ok,
        true,
        `una reevaluación posterior con identidades nuevas debe admitirse: ${JSON.stringify(laterVisitResult?.error ?? null)}`
    );
    assert.equal(laterVisitResult.history.length, 1, 'la historia se conserva');
    assert.deepEqual(
        local(laterVisitResult.history[0].evaluations.map(item => item.evaluation_id)),
        ['EVAL-1'],
        'la evaluación histórica no se sobrescribe ni cambia de identidad'
    );
    assert.deepEqual(
        local(laterVisitResult.representation.adverse_events[0].evaluations.map(item => item.evaluation_id)),
        ['EVAL-2', 'EVAL-3'],
        'el acto actual aporta exclusivamente identidades de evaluación nuevas'
    );
    // La conducta clínica válida no se apoya en tolerar identidades repetidas:
    // historia y acto actual no comparten ninguna identidad de evaluación.
    const laterVisitIdentities = [
        ...laterVisitResult.history[0].evaluations.map(item => item.evaluation_id),
        ...laterVisitResult.representation.adverse_events[0].evaluations.map(item => item.evaluation_id)
    ];
    assert.equal(
        new Set(laterVisitIdentities).size,
        laterVisitIdentities.length,
        'la reevaluación válida no reutiliza ninguna identidad de evaluación'
    );
    assert.deepEqual(clinicallyValidLaterVisit, laterVisitBefore, 'la validación aceptada no muta la entrada');

    // La identidad nueva repetida dentro del acto actual sigue rechazándose.
    const laterVisitRepeated = observationsSurface.validate({
        ...clinicallyValidLaterVisit,
        adverse_events: [reevaluation([
            evaluation({ evaluation_id: 'EVAL-2', actId: ACT }),
            evaluation({ evaluation_id: 'EVAL-2', actId: ACT, method: 'karch_lasagna' })
        ])]
    });
    assert.equal(laterVisitRepeated?.ok, false, 'la reevaluación con identidad nueva repetida se rechaza');
    assert.equal(laterVisitRepeated.error.code, DUPLICATE_EVALUATION_CODE, 'el rechazo usa el código estructurado');

    // --- 7. Frontera técnica documentada: NO es validez clínica.
    //
    // B02 compara identidades sólo dentro del array `evaluations` de una misma
    // observación. Reutilizar un `evaluation_id` entre actos, entre
    // observaciones distintas o entre revisiones históricas NO se rechaza hoy:
    // falta el contrato específico y la frontera de lectura persistida. Este
    // bloque fija esa tolerancia como límite técnico explícito —no como
    // conducta clínica correcta— y la deja separada de la reevaluación válida
    // del bloque anterior, que no reutiliza identidades.
    const crossActBoundary = observationsSurface.validate({
        ...clinicallyValidLaterVisit,
        adverse_events: [reevaluation([
            evaluation({ evaluation_id: 'EVAL-1', actId: ACT }),
            evaluation({ evaluation_id: 'EVAL-3', actId: ACT, method: 'karch_lasagna' })
        ])]
    });
    assert.equal(
        crossActBoundary?.ok,
        true,
        'frontera técnica: la identidad no se compara entre actos'
    );
    assert.deepEqual(
        local(crossActBoundary.representation.adverse_events[0].evaluations.map(item => item.evaluation_id)),
        ['EVAL-1', 'EVAL-3'],
        'la tolerancia entre actos no altera los datos aportados'
    );
    assert.equal(crossActBoundary.error, undefined, 'la tolerancia entre actos no produce código de error');

    // La frontera está exactamente en el array de UNA observación: la misma
    // petición se rechaza cuando la identidad se repite dentro del acto actual.
    const withinActStillRejected = observationsSurface.validate({
        ...clinicallyValidLaterVisit,
        adverse_events: [reevaluation([
            evaluation({ evaluation_id: 'EVAL-1', actId: ACT }),
            evaluation({ evaluation_id: 'EVAL-1', actId: ACT, method: 'karch_lasagna' })
        ])]
    });
    assert.equal(withinActStillRejected?.ok, false, 'la identidad repetida dentro de una observación sigue rechazándose');
    assert.equal(
        withinActStillRejected.error.code,
        DUPLICATE_EVALUATION_CODE,
        'el rechazo dentro de la observación usa el mismo código estructurado'
    );

    // Misma forma, dos observaciones del mismo acto con la identidad repetida:
    // tampoco se comparan entre observaciones.
    const crossObservation = good(
        observationsSurface,
        [
            observation({ observation_id: 'OBS-1', evaluations: [evaluation({ evaluation_id: 'EVAL-1' })] }),
            observation({ observation_id: 'OBS-2', episode_id: 'EP-2', evaluations: [evaluation({ evaluation_id: 'EVAL-1', episode_id: 'EP-2' })] })
        ],
        'frontera técnica: identidad no se compara entre observaciones'
    );
    assert.equal(crossObservation.representation.adverse_events.length, 2, 'ambas observaciones se conservan');

    // --- 8. Aislamiento: entradas y salidas profundamente desconectadas, sin
    // estado oculto entre llamadas ni entre pacientes.
    const isolated = {
        patientRef: PATIENT,
        actId: ACT,
        present: 'si',
        history: [],
        selections: [],
        adverse_events: [observation({
            evaluations: [evaluation({ evaluation_id: 'EVAL-1' }), evaluation({ evaluation_id: 'EVAL-2', method: 'karch_lasagna' })],
            notes: { raw: ['original'] },
            medications: ['M-1']
        })]
    };
    const isolatedBefore = structuredClone(isolated);
    const first = observationsSurface.validate(isolated);
    assert.equal(first?.ok, true, 'la ficha con identidades propias se acepta');
    const firstSnapshot = local(first);
    first.representation.adverse_events[0].notes.raw.push('salida');
    first.representation.adverse_events[0].medications.push('alterado');
    first.representation.adverse_events[0].evaluations.pop();
    assert.deepEqual(isolated, isolatedBefore, 'la salida no edita la entrada');
    const second = observationsSurface.validate(isolated);
    assert.deepEqual(local(second), firstSnapshot, 'no hay estado oculto entre llamadas');

    const duplicateInput = {
        ...isolated,
        adverse_events: [observation({ evaluations: [evaluation(), evaluation({ method: 'karch_lasagna' })] })]
    };
    const duplicateBefore = structuredClone(duplicateInput);
    assert.equal(observationsSurface.validate(duplicateInput).error.code, DUPLICATE_EVALUATION_CODE, 'el duplicado se rechaza');
    assert.deepEqual(duplicateInput, duplicateBefore, 'el rechazo no muta la entrada');

    // El rechazo de P-DEMO no filtra estado: otro paciente con sus propias
    // identidades se acepta inmediatamente después y conserva su contenido.
    const otherPatient = {
        patientRef: 'P-B',
        actId: 'ACT-B',
        present: 'si',
        history: [],
        selections: [],
        adverse_events: [{
            patientRef: 'P-B',
            actId: 'ACT-B',
            episode_id: 'EP-B',
            observation_id: 'OBS-B',
            status: 'incorporated',
            description: 'Prurito',
            evaluations: [
                evaluation({ patientRef: 'P-B', actId: 'ACT-B', episode_id: 'EP-B', evaluation_id: 'EVAL-1' }),
                evaluation({ patientRef: 'P-B', actId: 'ACT-B', episode_id: 'EP-B', evaluation_id: 'EVAL-2', method: 'karch_lasagna' })
            ]
        }]
    };
    const otherResult = observationsSurface.validate(otherPatient);
    assert.equal(otherResult?.ok, true, 'otro paciente con identidades propias se acepta');
    const duplicatedForOther = {
        ...otherPatient,
        adverse_events: [{
            ...otherPatient.adverse_events[0],
            evaluations: [
                evaluation({ patientRef: 'P-B', actId: 'ACT-B', episode_id: 'EP-B', evaluation_id: 'EVAL-1' }),
                evaluation({ patientRef: 'P-B', actId: 'ACT-B', episode_id: 'EP-B', evaluation_id: 'EVAL-1', method: 'karch_lasagna' })
            ]
        }]
    };
    assert.equal(
        observationsSurface.validate(duplicatedForOther).error.code,
        DUPLICATE_EVALUATION_CODE,
        'el duplicado de otro paciente también se rechaza'
    );
    assert.equal(observationsSurface.validate(otherPatient).ok, true, 'el rechazo previo no deja estado oculto');

    console.log('PASS identidad única de evaluación EA dentro de una observación (dos superficies)');
    console.log('PASS método, resultado y sospechoso no determinan la identidad de evaluación');
    console.log('PASS 0/1/2/5 EA y 0/1/2 evaluaciones con identidades propias, sin límite artificial');
    console.log('PASS precedencia de rechazos previos de evaluación y de la ficha contenedora');
    console.log('PASS reevaluación posterior clínicamente válida con identidades nuevas e historia intacta');
    console.log('PASS frontera técnica declarada y separada: la identidad no se compara entre actos ni observaciones');
    console.log('PASS ausencias, centinelas, borradores, sospechosos y aislamiento profundo conservados');
    console.log('PASS farmacia_ea_b02_evaluation_identity_check');
}

const invoked = process.argv[1] ? fs.realpathSync(process.argv[1]) : '';
const self = fs.realpathSync(new URL(import.meta.url));
if (invoked === self) main();
