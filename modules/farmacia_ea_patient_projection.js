/**
 * Proyección pura de lectura de Acontecimientos Adversos 0..N por paciente
 * (FH-EA-04A).
 *
 * Ownership: este módulo agrupa, cuenta y devuelve datos EA YA explícitos de un
 * paciente. No introduce una fuente de paciente, no lee DOM, Excel, catálogo,
 * historia importada, almacenamiento ni estado global, no cablea ninguna
 * pantalla, no persiste, no ordena clínicamente y no calcula tasas,
 * incidencias, gravedad agregada, causalidad ni probabilidad. No promueve
 * borradores a evaluación formal.
 *
 * Superficie única: `HubTools.farmaciaEaPatientProjection.project(request)`.
 *
 * Entrada: `{ patientRef, acts }`.
 *   - `patientRef` es un string propio no vacío: el paciente del que se
 *     proyecta la historia. Nunca se infiere.
 *   - `acts` es un array explícito de actos ya delimitados, cada uno con la
 *     forma publicada de `farmaciaEaInvariants.validateObservations`:
 *     `{ actId, present, adverse_events, history, selections, occurredAt? }`.
 *     El `patientRef` no se repite en el acto: sale de la petición.
 *   - `adverse_events` contiene sólo observaciones `status:'incorporated'` del
 *     acto. Un borrador, un estado desconocido o una ficha no incorporada en
 *     origen se rechazan: el proyecto no declara documentado lo que el origen
 *     no declara documentado.
 *   - `history` es contexto de validación declarado por el origen; no se
 *     proyecta ni se cuenta. El módulo no fabrica historia previa ni decide
 *     qué acto es anterior.
 *   - El orden de `acts` y el de cada `adverse_events` es orden de transporte,
 *     no cronología acreditada: se conserva y nunca se reinterpreta.
 *
 * Reutilización obligatoria: la integridad de referencias de cada acto (EA,
 * sospechas, evaluaciones, `basis`, continuidad, resolución, recurrencia,
 * identidades duplicadas internas) se delega en el validador publicado
 * `HubTools.farmaciaEaInvariants.validateObservations`. Si ese validador no
 * está disponible, la proyección falla cerrada: no reimplementa sus reglas.
 *
 * Reglas de esta unidad:
 *   - Un episodio se agrupa por `episode_id`; el mismo episodio observado en
 *     dos actos cuenta UNA vez como episodio y DOS como observaciones.
 *   - Una recurrencia explícita es un episodio nuevo. `relatedEpisodeId` sólo
 *     se proyecta si la fuente lo declara literalmente; no se deduce de
 *     `basis`, texto, medicamento ni orden.
 *   - Varias sospechas o varias líneas dispensadas en un acto no multiplican
 *     episodios ni observaciones.
 *   - No se etiqueta ninguna observación como «última» ni ningún episodio como
 *     «activo» o «resuelto». `No`/`No consta` no resuelven nada y
 *     `status:'incorporated'` no es evolución clínica.
 *
 * Éxito: `{ ok: true, patientRef, episodes, uniqueEpisodeCount,
 * observationCount, patientHasDocumentedEa }`, donde `episodes` es
 * `[{ episode_id, observations }]` (más `relatedEpisodeId` sólo si la fuente lo
 * declara) con las observaciones completas de ESE paciente y sólo de él.
 *
 * Fallo: `{ ok: false, error: { code, message } }`, sin proyección parcial y
 * sin mutar la entrada. Las entradas y las salidas están profundamente
 * desconectadas; no hay estado entre llamadas.
 */
(function () {
    'use strict';

    if (typeof window === 'undefined' || !window.HubTools) {
        console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js antes de farmacia_ea_patient_projection.js.');
        return;
    }

    var HubTools = window.HubTools;

    function isRecord(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    function isNonEmptyString(value) {
        return typeof value === 'string' && value.length > 0;
    }

    function hasOwn(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    function fail(code, message) {
        return { ok: false, error: { code: code, message: message } };
    }

    function unsupportedStructure() {
        throw new Error('UNSUPPORTED_STRUCTURE');
    }

    // Copia profunda de árboles planos/arrays/escalares. Preserva claves
    // propias con valor undefined, `null` y el prototipo nulo, y no completa
    // campos: la distinción ausencia / undefined / null es contrato (F4.4).
    // No usa JSON.stringify/parse.
    function cloneStructure(value, ancestors) {
        if (value === null || typeof value !== 'object') {
            if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
                unsupportedStructure();
            }
            return value;
        }
        if (ancestors.indexOf(value) !== -1) {
            unsupportedStructure();
        }
        ancestors.push(value);

        var copy;
        if (Array.isArray(value)) {
            copy = new Array(value.length);
            for (var index = 0; index < value.length; index += 1) {
                copy[index] = cloneStructure(value[index], ancestors);
            }
        } else {
            var prototype = Object.getPrototypeOf(value);
            if (prototype !== null && Object.getPrototypeOf(prototype) !== null) {
                unsupportedStructure();
            }
            copy = prototype === null ? Object.create(null) : {};
            var keys = Object.keys(value);
            for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
                var key = keys[keyIndex];
                // defineProperty evita que una clave propia '__proto__' active
                // el setter heredado y pierda el campo o cambie el prototipo.
                Object.defineProperty(copy, key, {
                    value: cloneStructure(value[key], ancestors),
                    enumerable: true,
                    writable: true,
                    configurable: true
                });
            }
        }

        ancestors.pop();
        return copy;
    }

    // Estructura mínima del acto declarada por el origen. Deliberadamente no
    // inventa `present`, `history` ni `selections`: si faltan, la petición es
    // inválida, porque el marco del acto es autoridad de la fuente.
    var ACT_STRUCTURE = [
        { key: 'adverse_events', code: 'INVALID_ADVERSE_EVENTS', message: 'adverse_events debe ser un array explícito.' },
        { key: 'history', code: 'INVALID_HISTORY', message: 'history debe ser un array explícito.' },
        { key: 'selections', code: 'INVALID_SELECTIONS', message: 'selections debe ser un array explícito.' }
    ];

    // Valida sólo la estructura propia de esta unidad (acto, estado
    // incorporado, identidad de acto y unicidad de observación entre actos).
    // Todo lo demás pertenece al validador publicado.
    function inspectActs(acts) {
        var actIds = [];
        var observationIds = [];

        for (var actIndex = 0; actIndex < acts.length; actIndex += 1) {
            var act = acts[actIndex];
            if (!isRecord(act)) {
                return fail('INVALID_ACT', 'Cada acto debe ser un objeto explícito.');
            }
            if (!isNonEmptyString(act.actId)) {
                return fail('INVALID_ACT_ID', 'Cada acto debe traer actId explícito no vacío.');
            }
            if (actIds.indexOf(act.actId) !== -1) {
                return fail('DUPLICATE_ACT_ID', 'Dos actos distintos no pueden compartir actId en la misma proyección.');
            }
            actIds.push(act.actId);

            for (var structureIndex = 0; structureIndex < ACT_STRUCTURE.length; structureIndex += 1) {
                var structure = ACT_STRUCTURE[structureIndex];
                if (!Array.isArray(act[structure.key])) {
                    return fail(structure.code, structure.message);
                }
            }

            for (var eventIndex = 0; eventIndex < act.adverse_events.length; eventIndex += 1) {
                var event = act.adverse_events[eventIndex];
                if (!isRecord(event)) {
                    return fail('INVALID_EVENT', 'Cada ficha debe ser un objeto explícito.');
                }
                // Sin promoción de borradores ni de estados desconocidos.
                if (event.status !== 'incorporated') {
                    return fail('NOT_INCORPORATED', 'La proyección sólo admite observaciones incorporadas en origen.');
                }
                if (isNonEmptyString(event.observation_id)) {
                    if (observationIds.indexOf(event.observation_id) !== -1) {
                        return fail('DUPLICATE_OBSERVATION_ID', 'Una observación reutiliza observation_id entre actos de la misma proyección.');
                    }
                    observationIds.push(event.observation_id);
                }
            }
        }

        return null;
    }

    // Un episodio es un agrupador de transporte: identidad explícita y las
    // observaciones completas de ese paciente. No añade estado, fecha,
    // gravedad, causalidad ni «última observación».
    function findEpisode(episodes, episodeId) {
        for (var index = 0; index < episodes.length; index += 1) {
            if (episodes[index].episode_id === episodeId) {
                return episodes[index];
            }
        }
        return null;
    }

    function projectRelatedEpisode(episode, observation) {
        if (!hasOwn(observation, 'relatedEpisodeId')) {
            return null;
        }
        var declared = observation.relatedEpisodeId;
        // Un centinela (null, '', undefined propio) no acredita relación: se
        // conserva dentro de la observación y no se proyecta.
        if (!isNonEmptyString(declared)) {
            return null;
        }
        if (declared === episode.episode_id) {
            return fail('CONTRADICTORY_RELATED_EPISODE_ID', 'Un episodio no puede declararse relacionado consigo mismo.');
        }
        if (hasOwn(episode, 'relatedEpisodeId') && episode.relatedEpisodeId !== declared) {
            return fail('CONTRADICTORY_RELATED_EPISODE_ID', 'Las observaciones de un episodio declaran relaciones explícitas contradictorias.');
        }
        return declared;
    }

    function assembleProjection(patientRef, validatedObservations) {
        var episodes = [];

        for (var index = 0; index < validatedObservations.length; index += 1) {
            var observation = validatedObservations[index];
            var episode = findEpisode(episodes, observation.episode_id);
            if (episode === null) {
                episode = { episode_id: observation.episode_id, observations: [] };
                episodes.push(episode);
            }
            var relation = projectRelatedEpisode(episode, observation);
            if (isRecord(relation)) {
                return relation;
            }
            if (relation !== null) {
                episode.relatedEpisodeId = relation;
            }
            episode.observations.push(observation);
        }

        return {
            ok: true,
            patientRef: patientRef,
            episodes: episodes,
            uniqueEpisodeCount: episodes.length,
            observationCount: validatedObservations.length,
            patientHasDocumentedEa: validatedObservations.length > 0
        };
    }

    function project(request) {
        try {
            if (!isRecord(request)) {
                return fail('INVALID_REQUEST', 'La petición debe ser un objeto explícito.');
            }
            if (!isNonEmptyString(request.patientRef)) {
                return fail('INVALID_PATIENT_REF', 'patientRef debe ser un string propio no vacío.');
            }
            if (!Array.isArray(request.acts)) {
                return fail('INVALID_ACTS', 'acts debe ser un array explícito de actos.');
            }
            var invariants = HubTools.farmaciaEaInvariants;
            if (!isRecord(invariants) || typeof invariants.validateObservations !== 'function') {
                return fail('MISSING_INVARIANTS', 'farmaciaEaInvariants.validateObservations no está disponible; la proyección no reimplementa sus reglas.');
            }

            var acts;
            try {
                acts = cloneStructure(request.acts, []);
            } catch (problem) {
                return fail('UNSUPPORTED_STRUCTURE', 'La petición contiene una estructura no soportada.');
            }

            var structureError = inspectActs(acts);
            if (structureError !== null) {
                return structureError;
            }

            var validated = [];
            for (var actIndex = 0; actIndex < acts.length; actIndex += 1) {
                var act = acts[actIndex];
                var validation = invariants.validateObservations({
                    patientRef: request.patientRef,
                    actId: act.actId,
                    present: act.present,
                    adverse_events: act.adverse_events,
                    history: act.history,
                    selections: act.selections
                });
                if (!isRecord(validation)) {
                    return fail('INVALID_INVARIANT_RESULT', 'El validador de invariantes no devolvió un resultado estructurado.');
                }
                if (validation.ok !== true) {
                    // Se propaga tal cual: el código y el mensaje del validador
                    // publicado son la autoridad de la integridad de referencias.
                    return validation;
                }
                var approved = isRecord(validation.representation) ? validation.representation.adverse_events : null;
                if (!Array.isArray(approved) || approved.length !== act.adverse_events.length) {
                    return fail('INCONSISTENT_PROJECTION', 'El validador no devolvió todas las observaciones incorporadas del acto.');
                }
                for (var approvedIndex = 0; approvedIndex < approved.length; approvedIndex += 1) {
                    validated.push(approved[approvedIndex]);
                }
            }

            return assembleProjection(request.patientRef, validated);
        } catch (problem) {
            return fail('INVALID_REQUEST', 'La proyección no se pudo completar.');
        }
    }

    HubTools.farmaciaEaPatientProjection = {
        project: project
    };

    if (typeof console !== 'undefined' && typeof console.log === 'function') {
        console.log('✅ Módulo farmacia_ea_patient_projection cargado');
    }
})();
