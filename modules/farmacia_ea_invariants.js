/**
 * Invariantes puras mínimas de Acontecimientos Adversos 0..N (FH-EA R1).
 *
 * Ownership: este módulo valida NUEVAS fichas de EA dentro de un acto ya
 * delimitado por referencias explícitas. No es un DTO universal EA, no
 * sustituye al contrato Pharmacy Act F4.4 y no conoce transporte,
 * persistencia, paciente activo, reloj, catálogo ni generación de
 * identidades. La captura T01 y los módulos F4.4 no se modifican aquí.
 *
 * Superficies:
 *   - `HubTools.farmaciaEaInvariants.validateNewEvents(request)`.
 *   - `HubTools.farmaciaEaInvariants.validateObservations(request)`.
 *
 * Entrada de `validateNewEvents`: `{ patientRef, actId, present, adverse_events }`.
 *   - `patientRef` y `actId` son strings propios no vacíos que identifican el
 *     acto actual. Nunca se infieren ni se completan.
 *   - `present` es exactamente uno de `si`, `no`, `no_consta`; no se
 *     normaliza ningún otro token.
 *   - Cada ficha trae explícitamente `{ patientRef, actId, episode_id,
 *     observation_id, status, description? }`. Los cuatro identificadores
 *     son strings propios no vacíos y `status` es exactamente `draft` o
 *     `incorporated` (vocabulario T01).
 *
 * Reglas:
 *   - Las fichas del mismo paciente y del acto actual con estado
 *     `incorporated` y descripción original explícita no vacía forman la
 *     representación conforme. La descripción es el único requisito: no se
 *     exige ni se inventa sospechoso, gravedad ni causalidad.
 *   - Los borradores del acto actual y las fichas incorporadas de otros
 *     actos del mismo paciente se retienen íntegros, en orden, sin
 *     incorporarse al acto actual. `no` y `no_consta` no resuelven ni
 *     alteran historia.
 *   - `si` exige al menos una ficha incorporada del acto actual; `no` y
 *     `no_consta` rechazan cualquier ficha incorporada del acto actual.
 *     Los borradores no contradicen el estado y permanecen borradores.
 *   - Cualquier ficha de otro paciente es una asociación contradictoria y
 *     se rechaza.
 *   - Éxito: `{ ok: true, representation: { patientRef, actId, present,
 *     adverse_events }, retained }`. La representación contiene sólo las
 *     incorporadas del acto actual; `retained` contiene las restantes.
 *     Ambos conservan los objetos explícitos completos, sin completar
 *     campos ausentes.
 *   - Fallo: `{ ok: false, error: { code, message } }`, sin representación
 *     ni fichas parciales. La validación no lanza para datos inválidos
 *     ordinarios.
 *   - Entradas y salidas están profundamente desconectadas (también los
 *     borradores y la historia retenidos). No hay estado entre llamadas.
 */
(function () {
    'use strict';

    if (typeof window === 'undefined' || !window.HubTools) {
        console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js antes de farmacia_ea_invariants.js.');
        return;
    }

    var HubTools = window.HubTools;

    function isRecord(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function isNonEmptyString(value) {
        return typeof value === 'string' && value.trim() !== '';
    }

    function fail(code, message) {
        return { ok: false, error: { code: code, message: message } };
    }

    function unsupportedStructure() {
        throw new Error('estructura no soportada');
    }

    // Copia profunda de árboles planos/arrays/escalares. Preserva claves
    // propias con valor undefined y el prototipo nulo; no completa campos.
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
                // defineProperty evita que una clave propia '__proto__'
                // (por ejemplo de JSON.parse) active el setter heredado y
                // pierda el campo o cambie el prototipo de la copia.
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

    function cloneCollection(collection) {
        var cloned = new Array(collection.length);
        for (var index = 0; index < collection.length; index += 1) {
            cloned[index] = cloneStructure(collection[index], []);
        }
        return cloned;
    }

    function validateNewEvents(request) {
        try {
            if (!isRecord(request)) {
                return fail('INVALID_REQUEST', 'La petición debe ser un objeto explícito.');
            }
            if (!isNonEmptyString(request.patientRef)) {
                return fail('INVALID_PATIENT_REF', 'patientRef debe ser un string propio no vacío.');
            }
            if (!isNonEmptyString(request.actId)) {
                return fail('INVALID_ACT_ID', 'actId debe ser un string propio no vacío.');
            }
            if (request.present !== 'si' && request.present !== 'no' && request.present !== 'no_consta') {
                return fail('INVALID_PRESENT', 'present debe ser exactamente si, no o no_consta.');
            }
            if (!Array.isArray(request.adverse_events)) {
                return fail('INVALID_ADVERSE_EVENTS', 'adverse_events debe ser un array explícito.');
            }

            var incorporated = [];
            var retained = [];

            for (var index = 0; index < request.adverse_events.length; index += 1) {
                var event = request.adverse_events[index];
                if (!isRecord(event)) {
                    return fail('INVALID_EVENT', 'Cada ficha debe ser un objeto explícito.');
                }
                if (!isNonEmptyString(event.patientRef)) {
                    return fail('INVALID_EVENT_PATIENT_REF', 'Cada ficha debe traer patientRef explícito no vacío.');
                }
                if (!isNonEmptyString(event.actId)) {
                    return fail('INVALID_EVENT_ACT_ID', 'Cada ficha debe traer actId explícito no vacío.');
                }
                if (!isNonEmptyString(event.episode_id)) {
                    return fail('INVALID_EPISODE_ID', 'Cada ficha debe traer episode_id explícito no vacío.');
                }
                if (!isNonEmptyString(event.observation_id)) {
                    return fail('INVALID_OBSERVATION_ID', 'Cada ficha debe traer observation_id explícito no vacío.');
                }
                if (event.status !== 'draft' && event.status !== 'incorporated') {
                    return fail('INVALID_STATUS', 'status debe ser exactamente draft o incorporated.');
                }
                if (event.patientRef !== request.patientRef) {
                    return fail('PATIENT_ASSOCIATION_MISMATCH', 'Una ficha referencia a otro paciente.');
                }

                var belongsToCurrentAct = event.actId === request.actId;
                if (belongsToCurrentAct && event.status === 'incorporated') {
                    if (!isNonEmptyString(event.description)) {
                        return fail('MISSING_DESCRIPTION', 'Una ficha incorporada del acto actual exige descripción original explícita no vacía.');
                    }
                    incorporated.push(event);
                } else {
                    retained.push(event);
                }
            }

            if (request.present === 'si' && incorporated.length === 0) {
                return fail('STATE_CONTRADICTION', 'si exige al menos una ficha incorporada del acto actual.');
            }
            if (request.present !== 'si' && incorporated.length > 0) {
                return fail('STATE_CONTRADICTION', 'no y no_consta no admiten fichas incorporadas del acto actual.');
            }

            var representationEvents;
            var retainedEvents;
            try {
                representationEvents = cloneCollection(incorporated);
                retainedEvents = cloneCollection(retained);
            } catch (problem) {
                return fail('UNSUPPORTED_STRUCTURE', 'La petición contiene una estructura no soportada.');
            }

            return {
                ok: true,
                representation: {
                    patientRef: request.patientRef,
                    actId: request.actId,
                    present: request.present,
                    adverse_events: representationEvents
                },
                retained: retainedEvents
            };
        } catch (problem) {
            return fail('INVALID_REQUEST', 'La petición no se pudo validar.');
        }
    }

    /*
     * Identidad longitudinal y revisión expresa (FH-EA R1).
     *
     * `validateObservations(request)` valida fichas del acto actual contra una
     * historia longitudinal aportada explícitamente. No genera identidades,
     * no fusiona episodios por texto/medicamento/fecha, no infiere evolución y
     * no es autoridad de paciente ni API de persistencia.
     *
     * Entrada: `{ patientRef, actId, present, adverse_events, history,
     * selections }`.
     *   - `history` es una colección explícita de observaciones incorporadas
     *     de actos anteriores del MISMO paciente. Cada observación lleva
     *     `{ patientRef, actId, episode_id, observation_id, status:
     *     'incorporated' }` y campos clínicos adicionales que se conservan sin
     *     interpretación. Su `actId` debe diferir del acto actual.
     *   - `selections` contiene referencias explícitas
     *     `{ patientRef, actId, episode_id, observation_id }` que deben
     *     coincidir exactamente con una observación histórica aportada.
     *   - `adverse_events` son las fichas del acto actual. Una referencia
     *     histórica completa (`basis`) debe coincidir exactamente con una
     *     observación de `history`.
     *
     * Declaración expresa de revisión (representación técnica elegida):
     * `review: { confirmed: true, unchanged: <boolean> }`. `unchanged` es
     * informativo: tanto una revisión con cambios como sin cambios acreditan
     * una observación propia del acto nuevo. `basis` por sí solo no acredita
     * revisión y la descripción textual nunca se interpreta como declaración.
     *
     * `evolution` opcional transporta exactamente `continuation`,
     * `resolution` o `recurrence`. Continuación y resolución conservan el
     * episodio de `basis`; recurrencia exige `basis` del episodio anterior,
     * un `episode_id` nuevo (distinto de todos los históricos) y descripción
     * explícita. Sin `basis`, una ficha incorporada solo puede ser nueva, con
     * episodio no presente en historia y descripción explícita.
     *
     * Éxito: `{ ok: true, representation: { patientRef, actId, present,
     * adverse_events }, retained, history, selections }`. La representación
     * contiene solo las incorporadas del acto actual; `retained` conserva los
     * borradores; historia y selecciones se devuelven completas. Fallo:
     * `{ ok: false, error: { code, message } }`, sin representación parcial.
     * Entradas y salidas están profundamente desconectadas.
     */
    function isReference(value) {
        return isRecord(value) &&
            isNonEmptyString(value.patientRef) &&
            isNonEmptyString(value.actId) &&
            isNonEmptyString(value.episode_id) &&
            isNonEmptyString(value.observation_id);
    }

    function sameReference(left, right) {
        return left.patientRef === right.patientRef &&
            left.actId === right.actId &&
            left.episode_id === right.episode_id &&
            left.observation_id === right.observation_id;
    }

    function containsReference(references, reference) {
        for (var index = 0; index < references.length; index += 1) {
            if (sameReference(references[index], reference)) {
                return true;
            }
        }
        return false;
    }

    function containsString(values, value) {
        for (var index = 0; index < values.length; index += 1) {
            if (values[index] === value) {
                return true;
            }
        }
        return false;
    }

    function hasOwn(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    function isExplicitReview(event) {
        return hasOwn(event, 'review') &&
            isRecord(event.review) &&
            event.review.confirmed === true;
    }

    function isEvolutionToken(value) {
        return value === 'continuation' || value === 'resolution' || value === 'recurrence';
    }

    function validateObservations(request) {
        try {
            if (!isRecord(request)) {
                return fail('INVALID_REQUEST', 'La petición debe ser un objeto explícito.');
            }
            if (!isNonEmptyString(request.patientRef)) {
                return fail('INVALID_PATIENT_REF', 'patientRef debe ser un string propio no vacío.');
            }
            if (!isNonEmptyString(request.actId)) {
                return fail('INVALID_ACT_ID', 'actId debe ser un string propio no vacío.');
            }
            if (request.present !== 'si' && request.present !== 'no' && request.present !== 'no_consta') {
                return fail('INVALID_PRESENT', 'present debe ser exactamente si, no o no_consta.');
            }
            if (!Array.isArray(request.adverse_events)) {
                return fail('INVALID_ADVERSE_EVENTS', 'adverse_events debe ser un array explícito.');
            }
            if (!Array.isArray(request.history)) {
                return fail('INVALID_HISTORY', 'history debe ser un array explícito.');
            }
            if (!Array.isArray(request.selections)) {
                return fail('INVALID_SELECTIONS', 'selections debe ser un array explícito.');
            }

            var historyReferences = [];
            var historyObservationIds = [];
            var historyEpisodeIds = [];

            for (var historyIndex = 0; historyIndex < request.history.length; historyIndex += 1) {
                var historical = request.history[historyIndex];
                if (!isRecord(historical)) {
                    return fail('INVALID_HISTORY_OBSERVATION', 'Cada observación histórica debe ser un objeto explícito.');
                }
                if (!isNonEmptyString(historical.patientRef)) {
                    return fail('INVALID_HISTORY_PATIENT_REF', 'Cada observación histórica debe traer patientRef explícito no vacío.');
                }
                if (historical.patientRef !== request.patientRef) {
                    return fail('HISTORY_PATIENT_MISMATCH', 'La historia no puede aportar observaciones de otro paciente.');
                }
                if (!isNonEmptyString(historical.actId)) {
                    return fail('INVALID_HISTORY_ACT_ID', 'Cada observación histórica debe traer actId explícito no vacío.');
                }
                if (historical.actId === request.actId) {
                    return fail('HISTORY_ACT_NOT_PRIOR', 'La historia debe provenir de actos anteriores, no del acto actual.');
                }
                if (!isNonEmptyString(historical.episode_id)) {
                    return fail('INVALID_EPISODE_ID', 'Cada observación histórica debe traer episode_id explícito no vacío.');
                }
                if (!isNonEmptyString(historical.observation_id)) {
                    return fail('INVALID_OBSERVATION_ID', 'Cada observación histórica debe traer observation_id explícito no vacío.');
                }
                if (historical.status !== 'incorporated') {
                    return fail('INVALID_HISTORY_STATUS', 'La historia solo contiene observaciones incorporadas.');
                }
                if (containsString(historyObservationIds, historical.observation_id)) {
                    return fail('DUPLICATE_OBSERVATION_ID', 'Una observación histórica reutiliza un observation_id.');
                }
                historyObservationIds.push(historical.observation_id);
                if (!containsString(historyEpisodeIds, historical.episode_id)) {
                    historyEpisodeIds.push(historical.episode_id);
                }
                historyReferences.push({
                    patientRef: historical.patientRef,
                    actId: historical.actId,
                    episode_id: historical.episode_id,
                    observation_id: historical.observation_id
                });
            }

            for (var selectionIndex = 0; selectionIndex < request.selections.length; selectionIndex += 1) {
                var selection = request.selections[selectionIndex];
                if (!isReference(selection)) {
                    return fail('INVALID_SELECTION', 'Cada selección debe ser una referencia explícita completa.');
                }
                if (!containsReference(historyReferences, selection)) {
                    return fail('UNKNOWN_SELECTION', 'Una selección no corresponde a ninguna observación histórica aportada.');
                }
            }

            var incorporated = [];
            var retained = [];
            var eventObservationIds = [];

            for (var index = 0; index < request.adverse_events.length; index += 1) {
                var event = request.adverse_events[index];
                if (!isRecord(event)) {
                    return fail('INVALID_EVENT', 'Cada ficha debe ser un objeto explícito.');
                }
                if (!isNonEmptyString(event.patientRef)) {
                    return fail('INVALID_EVENT_PATIENT_REF', 'Cada ficha debe traer patientRef explícito no vacío.');
                }
                if (event.patientRef !== request.patientRef) {
                    return fail('PATIENT_ASSOCIATION_MISMATCH', 'Una ficha referencia a otro paciente.');
                }
                if (!isNonEmptyString(event.actId)) {
                    return fail('INVALID_EVENT_ACT_ID', 'Cada ficha debe traer actId explícito no vacío.');
                }
                if (event.actId !== request.actId) {
                    return fail('ACT_ASSOCIATION_MISMATCH', 'Una ficha del acto actual referencia a otro acto.');
                }
                if (!isNonEmptyString(event.episode_id)) {
                    return fail('INVALID_EPISODE_ID', 'Cada ficha debe traer episode_id explícito no vacío.');
                }
                if (!isNonEmptyString(event.observation_id)) {
                    return fail('INVALID_OBSERVATION_ID', 'Cada ficha debe traer observation_id explícito no vacío.');
                }
                if (event.status !== 'draft' && event.status !== 'incorporated') {
                    return fail('INVALID_STATUS', 'status debe ser exactamente draft o incorporated.');
                }
                if (containsString(historyObservationIds, event.observation_id) ||
                    containsString(eventObservationIds, event.observation_id)) {
                    return fail('DUPLICATE_OBSERVATION_ID', 'Una observación reutiliza un observation_id de otro acto o episodio.');
                }
                eventObservationIds.push(event.observation_id);

                var hasEvolution = hasOwn(event, 'evolution');
                var evolution = hasEvolution ? event.evolution : null;
                if (hasEvolution && !isEvolutionToken(evolution)) {
                    return fail('INVALID_EVOLUTION', 'evolution debe ser continuation, resolution o recurrence.');
                }

                var hasBasis = hasOwn(event, 'basis');
                if (hasBasis && !isReference(event.basis)) {
                    return fail('INVALID_BASIS', 'basis debe ser una referencia histórica completa.');
                }
                if (hasBasis && !containsReference(historyReferences, event.basis)) {
                    return fail('UNKNOWN_BASIS', 'basis no corresponde a ninguna observación histórica aportada.');
                }

                if (event.status === 'incorporated') {
                    if (evolution === 'recurrence') {
                        if (!hasBasis) {
                            return fail('MISSING_BASIS', 'Una recurrencia exige basis del episodio anterior.');
                        }
                        if (containsString(historyEpisodeIds, event.episode_id)) {
                            return fail('RECURRENCE_EPISODE_NOT_NEW', 'Una recurrencia exige un episode_id nuevo distinto de todos los históricos.');
                        }
                        if (!isNonEmptyString(event.description)) {
                            return fail('MISSING_DESCRIPTION', 'Una recurrencia exige descripción original explícita no vacía.');
                        }
                    } else if (hasBasis) {
                        if (event.episode_id !== event.basis.episode_id) {
                            return fail('EPISODE_ASSOCIATION_MISMATCH', 'Una ficha de seguimiento conserva el episodio de su basis.');
                        }
                        if (evolution !== 'continuation' && evolution !== 'resolution' && !isExplicitReview(event)) {
                            return fail('MISSING_REVIEW', 'basis por sí solo no acredita revisión; se exige revisión o evolución expresa.');
                        }
                        // Una revisión expresa no exige repetir descripción,
                        // gravedad, sospechoso ni causalidad.
                    } else {
                        if (evolution === 'continuation' || evolution === 'resolution') {
                            return fail('MISSING_BASIS', 'Continuación, resolución y recurrencia exigen basis del episodio anterior.');
                        }
                        if (!isNonEmptyString(event.description)) {
                            return fail('MISSING_DESCRIPTION', 'Una ficha nueva exige descripción original explícita no vacía.');
                        }
                        if (containsString(historyEpisodeIds, event.episode_id)) {
                            return fail('EPISODE_NOT_NEW', 'Una ficha nueva no puede reutilizar un episodio histórico sin basis.');
                        }
                    }
                    incorporated.push(event);
                } else {
                    retained.push(event);
                }
            }

            if (request.present === 'si' && incorporated.length === 0) {
                return fail('STATE_CONTRADICTION', 'si exige al menos una observación incorporada del acto actual.');
            }
            if (request.present !== 'si' && incorporated.length > 0) {
                return fail('STATE_CONTRADICTION', 'no y no_consta no admiten observaciones incorporadas del acto actual.');
            }

            var representationEvents;
            var retainedEvents;
            var historyCopy;
            var selectionsCopy;
            try {
                representationEvents = cloneCollection(incorporated);
                retainedEvents = cloneCollection(retained);
                historyCopy = cloneCollection(request.history);
                selectionsCopy = cloneCollection(request.selections);
            } catch (problem) {
                return fail('UNSUPPORTED_STRUCTURE', 'La petición contiene una estructura no soportada.');
            }

            return {
                ok: true,
                representation: {
                    patientRef: request.patientRef,
                    actId: request.actId,
                    present: request.present,
                    adverse_events: representationEvents
                },
                retained: retainedEvents,
                history: historyCopy,
                selections: selectionsCopy
            };
        } catch (problem) {
            return fail('INVALID_REQUEST', 'La petición no se pudo validar.');
        }
    }

    HubTools.farmaciaEaInvariants = {
        validateNewEvents: validateNewEvents,
        validateObservations: validateObservations
    };

    if (typeof console !== 'undefined' && typeof console.log === 'function') {
        console.log('✅ Módulo farmacia_ea_invariants cargado');
    }
})();
