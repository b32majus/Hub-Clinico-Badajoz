import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Check focal FH-EA-B01: identidad única de episodio EA nuevo.
//
// Invariante comprobada: dentro de un mismo acto no pueden coexistir dos
// episodios NUEVOS distintos que declaren el mismo `episode_id`.
//   - EA nuevo sin `basis` -> su `episode_id` es identidad de episodio nuevo.
//   - Recurrencia expresa -> ya exige un `episode_id` nuevo distinto de todos
//     los históricos; dos recurrencias no pueden compartir ese episodio nuevo.
// Lo NO tocado por este check, y que aquí se fija como límite de alcance:
//   - continuación y resolución conservan el episodio histórico de su `basis`;
//     su identidad no es de episodio nuevo.
//   - borradores, `No`/`No consta`, cross-patient, `observation_id` duplicado,
//     revisión expresa y `basis` inválida mantienen sus rechazos previos.
//   - el módulo no infiere identidades, fechas, gravedad, sospechosos ni
//     causalidad, y no compara descripciones ni medicamentos para asociar
//     episodios.
//
// El módulo puro se carga en un contexto aislado (sin DOM, paciente activo ni
// almacenamiento); no se modifica ninguna suite existente.
const modulePath = 'modules/farmacia_ea_invariants.js';
const DUPLICATE_EPISODE_CODE = 'DUPLICATE_NEW_EPISODE_ID';

function main() {
    assert.ok(fs.existsSync(modulePath), 'falta el módulo puro de invariantes EA');

    const sandbox = { window: { HubTools: {} }, console: { log() {}, error() {} } };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(modulePath, 'utf8'), sandbox, { filename: modulePath });
    const api = sandbox.window.HubTools.farmaciaEaInvariants;
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

    function good(input) {
        const before = structuredClone(input);
        const result = validate(input);
        assert.equal(result?.ok, true, `debía aceptar: ${JSON.stringify(result?.error ?? null)}`);
        assert.deepEqual(input, before, 'una validación aceptada no muta la entrada');
        return result;
    }

    function bad(input, code) {
        const before = structuredClone(input);
        const result = validate(input);
        assert.equal(result?.ok, false, 'debía rechazar la petición');
        assert.equal(typeof result.error?.code, 'string', 'el fallo debe traer código estructurado');
        assert.ok(result.error.code.length > 0, 'el código de fallo no puede estar vacío');
        assert.equal(typeof result.error?.message, 'string', 'el fallo debe traer mensaje');
        assert.ok(result.error.message.length > 0, 'el mensaje de fallo no puede estar vacío');
        if (code !== undefined) {
            assert.equal(result.error.code, code, 'código de fallo inesperado');
        }
        assert.equal(result.representation, undefined, 'un fallo no devuelve representación parcial');
        assert.equal(result.retained, undefined, 'un fallo no devuelve borradores parciales');
        assert.deepEqual(input, before, 'una validación rechazada no muta la entrada');
        return result.error.code;
    }

    // Acto actual vacío de historia: aquí sólo se declaran episodios nuevos.
    const act = (adverseEvents, extra = {}) => ({
        patientRef: 'P-A',
        actId: 'ACT-1',
        present: 'si',
        history: [],
        selections: [],
        adverse_events: adverseEvents,
        ...extra
    });

    // EA nuevo: sin `basis`, sin evolución; sólo identidad y descripción.
    const newEvent = (observationId, episodeId, description) => ({
        patientRef: 'P-A',
        actId: 'ACT-1',
        episode_id: episodeId,
        observation_id: observationId,
        status: 'incorporated',
        description
    });

    // --- 1. RED: dos EA nuevos distintos del mismo acto, sin basis, con el
    // mismo episode_id. El episodio es uno solo: dos observaciones distintas no
    // pueden presentarse como dos episodios nuevos que comparten identidad.
    const duplicated = act([
        newEvent('O1', 'E1', 'Cefalea'),
        newEvent('O2', 'E1', 'Prurito')
    ]);
    const duplicatedCode = bad(duplicated, DUPLICATE_EPISODE_CODE);

    // La descripción nunca asocia ni desambigua: el rechazo depende sólo de la
    // identidad declarada, no de comparar textos.
    bad(act([
        newEvent('O1', 'E1', 'Cefalea'),
        newEvent('O2', 'E1', 'Cefalea')
    ]), DUPLICATE_EPISODE_CODE);

    // --- 2. Casos válidos 0/1/2/5 con identidades de episodio únicas.
    const zero = act([]);
    assert.equal(validate({ ...zero, present: 'no' })?.ok, true, '0 EA con No debe seguir siendo válido');
    assert.equal(validate({ ...zero, present: 'no_consta' })?.ok, true, '0 EA con No consta debe seguir siendo válido');
    assert.equal(validate(zero)?.ok, false, 'si exige al menos una observación incorporada');
    assert.equal(validate(zero)?.error?.code, 'STATE_CONTRADICTION', 'si sin observaciones conserva su rechazo');

    good(act([newEvent('O1', 'E1', 'Cefalea')]));
    good(act([
        newEvent('O1', 'E1', 'Cefalea'),
        newEvent('O2', 'E2', 'Prurito')
    ]));
    const five = act([
        newEvent('O1', 'E1', 'Cefalea'),
        newEvent('O2', 'E2', 'Prurito'),
        newEvent('O3', 'E3', 'Náuseas'),
        newEvent('O4', 'E4', 'Disnea'),
        newEvent('O5', 'E5', 'Exantema')
    ]);
    const fiveResult = good(five);
    assert.equal(fiveResult.representation.adverse_events.length, 5, 'sin límite artificial de EA nuevos');
    assert.deepEqual(
        local(fiveResult.representation.adverse_events),
        five.adverse_events,
        'las fichas aceptadas se conservan verbatim, sin identidades ni campos inventados'
    );

    // La identidad de episodio no se fabrica ni se reescribe: el módulo no
    // añade, corrige ni normaliza episode_id u observation_id.
    for (const event of fiveResult.representation.adverse_events) {
        assert.equal(Object.hasOwn(event, 'episode_id'), true, 'episode_id se conserva');
        assert.equal(Object.hasOwn(event, 'observation_id'), true, 'observation_id se conserva');
        assert.equal(Object.hasOwn(event, 'occurredAt'), false, 'no se inventa fecha individual');
        assert.equal(Object.hasOwn(event, 'severity'), false, 'no se inventa gravedad');
        assert.equal(Object.hasOwn(event, 'suspicions'), false, 'no se inventan sospechosos');
        assert.equal(Object.hasOwn(event, 'evaluations'), false, 'no se inventa causalidad');
    }

    // --- 3. Recurrencias expresas: dos con el mismo episodio NUEVO deben
    // fallar; con episodios nuevos distintos pasan.
    const old = {
        patientRef: 'P-A',
        actId: 'ACT-0',
        episode_id: 'E-OLD',
        observation_id: 'O-OLD',
        status: 'incorporated',
        description: 'Episodio previo'
    };
    const recurrence = (observationId, episodeId) => ({
        patientRef: 'P-A',
        actId: 'ACT-1',
        episode_id: episodeId,
        observation_id: observationId,
        status: 'incorporated',
        description: 'Mismo cuadro repetido',
        evolution: 'recurrence',
        basis: ref(old)
    });
    const recurrenceHistory = { ...act([]), history: [old], selections: [] };

    bad(
        { ...recurrenceHistory, adverse_events: [recurrence('O1', 'E-NEW'), recurrence('O2', 'E-NEW')] },
        DUPLICATE_EPISODE_CODE
    );
    // Mismo código que en el caso 1: la invariante es una sola, «identidad de
    // episodio nuevo única dentro del acto».
    assert.equal(duplicatedCode, DUPLICATE_EPISODE_CODE, 'el código se mantiene estable entre escenarios');

    good({ ...recurrenceHistory, adverse_events: [recurrence('O1', 'E-NEW-1'), recurrence('O2', 'E-NEW-2')] });

    // Una recurrencia y un EA nuevo sin basis tampoco pueden compartir
    // episodio nuevo: ambos declaran un episodio nuevo en el mismo acto.
    bad(
        {
            ...recurrenceHistory,
            adverse_events: [recurrence('O1', 'E-NEW'), newEvent('O2', 'E-NEW', 'Otro suceso')]
        },
        DUPLICATE_EPISODE_CODE
    );
    // Y con identidades nuevas distintas convive sin problema.
    good({
        ...recurrenceHistory,
        adverse_events: [recurrence('O1', 'E-NEW'), newEvent('O2', 'E-OTHER', 'Otro suceso')]
    });

    // Una recurrencia que reutiliza un episodio histórico conserva su rechazo
    // previo, no el nuevo código.
    bad(
        { ...recurrenceHistory, adverse_events: [recurrence('O1', 'E-OLD')] },
        'RECURRENCE_EPISODE_NOT_NEW'
    );
    // Recurrencia sin basis válida conserva su rechazo previo.
    bad(
        {
            ...act([{ ...recurrence('O1', 'E-NEW'), basis: { ...ref(old), observation_id: 'NO-EXISTE' } }])
        },
        'UNKNOWN_BASIS'
    );

    // --- 4. Límite de alcance del ticket: continuación y resolución conservan
    // el episodio histórico de su basis y cambian la observación. Su identidad
    // NO es de episodio nuevo, así que este check no la restringe.
    const continuation = {
        patientRef: 'P-A',
        actId: 'ACT-1',
        episode_id: 'E-OLD',
        observation_id: 'O-NEW',
        status: 'incorporated',
        evolution: 'continuation',
        basis: ref(old)
    };
    const continuationResult = good({ ...recurrenceHistory, adverse_events: [continuation] });
    assert.equal(
        continuationResult.representation.adverse_events[0].episode_id,
        'E-OLD',
        'la continuación conserva el episodio de su basis'
    );
    assert.equal(
        continuationResult.representation.adverse_events[0].observation_id,
        'O-NEW',
        'la continuación aporta una observación nueva'
    );

    good({
        ...recurrenceHistory,
        adverse_events: [{ ...continuation, evolution: 'resolution' }]
    });

    // Revisión expresa sobre un episodio histórico: sigue válida y conserva
    // episodio cambiando observación.
    good({
        ...recurrenceHistory,
        adverse_events: [{
            patientRef: 'P-A',
            actId: 'ACT-1',
            episode_id: 'E-OLD',
            observation_id: 'O-REVIEW',
            status: 'incorporated',
            basis: ref(old),
            review: { confirmed: true, unchanged: true }
        }]
    });

    // Seguimiento sin basis que reutiliza un episodio histórico conserva su
    // rechazo y no se confunde con la invariante nueva.
    bad(
        { ...recurrenceHistory, adverse_events: [newEvent('O1', 'E-OLD', 'Intento de reutilizar')] },
        'EPISODE_NOT_NEW'
    );

    // Dos continuaciones del MISMO episodio histórico en un acto quedan fuera
    // del alcance declarado de B01 (identidad de episodios NUEVOS). Se fija la
    // conducta actual para que cualquier cambio futuro sea deliberado.
    good({
        ...recurrenceHistory,
        adverse_events: [
            continuation,
            { ...continuation, observation_id: 'O-NEW-2', evolution: 'resolution' }
        ]
    });

    // --- 5. Rechazos y aceptaciones previas no alteradas.
    // Borradores: no son observaciones incorporadas y conservan su tratamiento.
    const draft = (episodeId, observationId) => ({
        patientRef: 'P-A',
        actId: 'ACT-1',
        episode_id: episodeId,
        observation_id: observationId,
        status: 'draft',
        description: 'Borrador'
    });
    const draftResult = good({
        ...act([newEvent('O1', 'E1', 'Cefalea')]),
        adverse_events: [newEvent('O1', 'E1', 'Cefalea'), draft('E1', 'D1'), draft('E1', 'D2')]
    });
    assert.equal(draftResult.retained.length, 2, 'los borradores se conservan íntegros');
    assert.equal(draftResult.representation.adverse_events.length, 1, 'sólo lo incorporado entra en la representación');

    // No y No consta no admiten observaciones incorporadas del acto actual.
    bad({ ...act([newEvent('O1', 'E1', 'Cefalea'), newEvent('O2', 'E1', 'Prurito')]), present: 'no' }, 'STATE_CONTRADICTION');
    bad({ ...act([newEvent('O1', 'E1', 'Cefalea')]), present: 'no_consta' }, 'STATE_CONTRADICTION');

    // Cross-patient conserva su rechazo.
    bad(act([{ ...newEvent('O1', 'E1', 'Cefalea'), patientRef: 'P-B' }]), 'PATIENT_ASSOCIATION_MISMATCH');
    // Acto ajeno en una ficha incorporada conserva su rechazo.
    bad(act([{ ...newEvent('O1', 'E1', 'Cefalea'), actId: 'ACT-9' }]), 'ACT_ASSOCIATION_MISMATCH');

    // observation_id duplicado conserva precedencia sobre la invariante nueva,
    // incluso cuando además se repite el episode_id.
    bad(
        act([newEvent('O1', 'E1', 'Cefalea'), newEvent('O1', 'E1', 'Prurito')]),
        'DUPLICATE_OBSERVATION_ID'
    );

    // Una ficha nueva sin descripción conserva su rechazo.
    bad(act([{ ...newEvent('O1', 'E1', undefined) }]), 'MISSING_DESCRIPTION');
    // Evolución longitudinal sin basis conserva su rechazo.
    bad(
        act([{ ...newEvent('O1', 'E1', 'Cefalea'), evolution: 'continuation' }]),
        'MISSING_BASIS'
    );
    // Estado inválido y episodio vacío conservan sus rechazos.
    bad(act([{ ...newEvent('O1', 'E1', 'Cefalea'), status: 'otro' }]), 'INVALID_STATUS');
    bad(act([{ ...newEvent('O1', '', 'Cefalea') }]), 'INVALID_EPISODE_ID');

    // --- 6. Aislamiento: entradas y salidas profundamente desconectadas y sin
    // estado oculto entre pacientes ni entre llamadas.
    const isolated = act([
        { ...newEvent('O1', 'E1', 'Cefalea'), medications: ['M'], notes: { raw: ['original'] } },
        newEvent('O2', 'E2', 'Prurito')
    ]);
    const before = structuredClone(isolated);
    const first = good(isolated);
    const firstSnapshot = local(first);
    first.representation.adverse_events[0].notes.raw.push('salida');
    first.representation.adverse_events[0].medications.push('alterado');
    assert.deepEqual(isolated, before, 'la salida no edita la entrada');
    const second = validate(isolated);
    assert.deepEqual(local(second), firstSnapshot, 'no hay estado oculto entre llamadas');

    const otherPatient = {
        patientRef: 'P-B',
        actId: 'ACT-B',
        present: 'si',
        history: [],
        selections: [],
        adverse_events: [
            { patientRef: 'P-B', actId: 'ACT-B', episode_id: 'E1', observation_id: 'O1', status: 'incorporated', description: 'Cefalea' },
            { patientRef: 'P-B', actId: 'ACT-B', episode_id: 'E2', observation_id: 'O2', status: 'incorporated', description: 'Prurito' }
        ]
    };
    good(otherPatient);
    // El rechazo de P-A no filtra estado hacia P-B ni viceversa.
    bad({
        ...otherPatient,
        adverse_events: otherPatient.adverse_events.map(event => ({ ...event, episode_id: 'E1' }))
    }, DUPLICATE_EPISODE_CODE);
    good(otherPatient);

    console.log('PASS identidad única de episodio EA nuevo (EA nuevos y recurrencias)');
    console.log('PASS 0/1/2/5 EA nuevos con episodios únicos, sin límite artificial');
    console.log('PASS continuación, resolución y revisión de episodio histórico conservadas');
    console.log('PASS rechazos previos, borradores, cross-patient y aislamiento profundo');
    console.log('PASS farmacia_ea_b01_episode_identity_check');
}

const invoked = process.argv[1] ? fs.realpathSync(process.argv[1]) : '';
const self = fs.realpathSync(new URL(import.meta.url));
if (invoked === self) main();
