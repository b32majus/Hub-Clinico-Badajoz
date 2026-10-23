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
 * Entrada de `validateNewEvents`: `{ patientRef, actId, present, occurredAt?,
 * adverse_events }`.
 *   - `patientRef` y `actId` son strings propios no vacíos que identifican el
 *     acto actual. Nunca se infieren ni se completan.
 *   - `present` es exactamente uno de `si`, `no`, `no_consta`; no se
 *     normaliza ningún otro token.
 *   - `occurredAt` es opcional y se transporta una sola vez si es propiedad
 *     propia del acto; no se valida como metadata F4.4, no se inventa y no se
 *     proyecta como inicio, resolución, duración, autoría ni evolución EA.
 *   - Cada ficha trae explícitamente `{ patientRef, actId, episode_id,
 *     observation_id, status, description? }`. Los cuatro identificadores
 *     son strings propios no vacíos y `status` es exactamente `draft` o
 *     `incorporated` (vocabulario T01).
 *   - Si una ficha declara `suspicions` como array, cada elemento referencia
 *     su paciente y episodio. Si declara `evaluations` como array, cada
 *     elemento aporta identidad, pareja episodio-medicamento, método y acto
 *     coherentes con la ficha. Los campos ausentes o centinelas escalares se
 *     conservan sin convertirlos en asociaciones.
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

    // Asociaciones clínicas explícitas (FH-EA R1).
    //
    // Una sospecha pertenece al episodio, no al acto: conserva la referencia
    // expresa al paciente y al episodio de la ficha contenedora. Una
    // evaluación pertenece a la pareja episodio-medicamento, al método y al
    // acto donde se realizó. Sólo se validan arrays declarados: un centinela
    // escalar o un campo ausente se conserva tal cual y no autoriza ni
    // fabrica asociaciones. Tampoco se traduce el método ni se calcula nada.
    function validateSuspicion(suspicion, observation) {
        if (!isRecord(suspicion)) {
            return fail('INVALID_SUSPICION', 'Cada sospecha debe ser un objeto explícito.');
        }
        if (!hasOwn(suspicion, 'patientRef') || !isNonEmptyString(suspicion.patientRef)) {
            return fail('INVALID_SUSPICION_PATIENT_REF', 'Cada sospecha debe traer patientRef explícito no vacío.');
        }
        if (suspicion.patientRef !== observation.patientRef) {
            return fail('SUSPICION_PATIENT_MISMATCH', 'Una sospecha referencia a otro paciente.');
        }
        if (!hasOwn(suspicion, 'episode_id') || !isNonEmptyString(suspicion.episode_id)) {
            return fail('INVALID_SUSPICION_EPISODE_ID', 'Cada sospecha debe traer episode_id explícito no vacío.');
        }
        if (suspicion.episode_id !== observation.episode_id) {
            return fail('SUSPICION_EPISODE_MISMATCH', 'Una sospecha referencia a otro episodio.');
        }
        if (!hasOwn(suspicion, 'medicationRef') || !isNonEmptyString(suspicion.medicationRef)) {
            return fail('INVALID_SUSPICION_MEDICATION_REF', 'Cada sospecha debe traer medicationRef explícito no vacío.');
        }
        return null;
    }

    function validateEvaluation(evaluation, observation) {
        if (!isRecord(evaluation)) {
            return fail('INVALID_EVALUATION', 'Cada evaluación debe ser un objeto explícito.');
        }
        var required = ['evaluation_id', 'patientRef', 'episode_id', 'medicationRef', 'method', 'actId'];
        for (var index = 0; index < required.length; index += 1) {
            if (!hasOwn(evaluation, required[index]) || !isNonEmptyString(evaluation[required[index]])) {
                return fail('INVALID_EVALUATION', 'Cada evaluación debe traer ' + required[index] + ' explícito no vacío.');
            }
        }
        if (evaluation.patientRef !== observation.patientRef) {
            return fail('EVALUATION_PATIENT_MISMATCH', 'Una evaluación referencia a otro paciente.');
        }
        if (evaluation.episode_id !== observation.episode_id) {
            return fail('EVALUATION_EPISODE_MISMATCH', 'Una evaluación referencia a otro episodio.');
        }
        if (evaluation.actId !== observation.actId) {
            return fail('EVALUATION_ACT_MISMATCH', 'Una evaluación debe pertenecer al acto de su observación contenedora.');
        }
        return null;
    }

    function validateClinicalAssociations(observation) {
        var index;
        if (hasOwn(observation, 'suspicions') && Array.isArray(observation.suspicions)) {
            for (index = 0; index < observation.suspicions.length; index += 1) {
                var suspicionError = validateSuspicion(observation.suspicions[index], observation);
                if (suspicionError) {
                    return suspicionError;
                }
            }
        }
        if (hasOwn(observation, 'evaluations') && Array.isArray(observation.evaluations)) {
            for (index = 0; index < observation.evaluations.length; index += 1) {
                var evaluationError = validateEvaluation(observation.evaluations[index], observation);
                if (evaluationError) {
                    return evaluationError;
                }
            }
        }
        return null;
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

                var associationError = validateClinicalAssociations(event);
                if (associationError) {
                    return associationError;
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
            var occurredAtValue;
            var hasOccurredAt = hasOwn(request, 'occurredAt');
            try {
                representationEvents = cloneCollection(incorporated);
                retainedEvents = cloneCollection(retained);
                if (hasOccurredAt) {
                    occurredAtValue = cloneStructure(request.occurredAt, []);
                }
            } catch (problem) {
                return fail('UNSUPPORTED_STRUCTURE', 'La petición contiene una estructura no soportada.');
            }

            var representation = {
                patientRef: request.patientRef,
                actId: request.actId,
                present: request.present,
                adverse_events: representationEvents
            };
            if (hasOccurredAt) {
                representation.occurredAt = occurredAtValue;
            }

            return {
                ok: true,
                representation: representation,
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
     * Entrada: `{ patientRef, actId, present, occurredAt?, adverse_events,
     * history, selections }`.
     *   - `occurredAt` opcional sigue el mismo transporte puro que en
     *     `validateNewEvents`: una sola fecha del acto, sin inferencia clínica.
     *   - `history` es una colección explícita de observaciones incorporadas
     *     de actos anteriores del MISMO paciente. Cada observación lleva
     *     `{ patientRef, actId, episode_id, observation_id, status:
     *     'incorporated' }` y campos clínicos adicionales que se conservan sin
     *     interpretación. Su `actId` debe diferir del acto actual.
     *   - `suspicions` y `evaluations`, si son arrays declarados, siguen las
     *     mismas reglas de referencia que en las fichas nuevas: la sospecha
     *     pertenece al episodio y la evaluación al acto de su observación
     *     contenedora, también en historia. Una evaluación histórica nunca se
     *     recoloca en el acto actual.
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
     * `evolution` opcional transporta un valor literal. Sólo los tokens
     * `continuation`, `resolution` o `recurrence` acreditan una declaración
     * longitudinal; cualquier otro valor se conserva como dato opaco y no
     * acredita revisión ni resuelve un episodio. Continuación y resolución
     * conservan el episodio de `basis`; recurrencia exige `basis` del episodio
     * anterior, un `episode_id` nuevo (distinto de todos los históricos) y
     * descripción explícita. Sin `basis`, una ficha incorporada solo puede ser
     * nueva, con episodio no presente en historia y descripción explícita.
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
                var historicalAssociationError = validateClinicalAssociations(historical);
                if (historicalAssociationError) {
                    return historicalAssociationError;
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
                var eventAssociationError = validateClinicalAssociations(event);
                if (eventAssociationError) {
                    return eventAssociationError;
                }
                if (containsString(historyObservationIds, event.observation_id) ||
                    containsString(eventObservationIds, event.observation_id)) {
                    return fail('DUPLICATE_OBSERVATION_ID', 'Una observación reutiliza un observation_id de otro acto o episodio.');
                }
                eventObservationIds.push(event.observation_id);

                var hasEvolution = hasOwn(event, 'evolution');
                var evolution = hasEvolution ? event.evolution : null;
                // Sólo los tokens longitudinales soportados acreditan una
                // declaración. Cualquier otro valor se conserva como dato
                // opaco y no autoriza revisión ni resolución.
                var declaredEvolution = isEvolutionToken(evolution) ? evolution : null;

                var hasBasis = hasOwn(event, 'basis');
                if (hasBasis && !isReference(event.basis)) {
                    return fail('INVALID_BASIS', 'basis debe ser una referencia histórica completa.');
                }
                if (hasBasis && !containsReference(historyReferences, event.basis)) {
                    return fail('UNKNOWN_BASIS', 'basis no corresponde a ninguna observación histórica aportada.');
                }

                if (event.status === 'incorporated') {
                    if (declaredEvolution === 'recurrence') {
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
                        if (declaredEvolution !== 'continuation' && declaredEvolution !== 'resolution' && !isExplicitReview(event)) {
                            return fail('MISSING_REVIEW', 'basis por sí solo no acredita revisión; se exige revisión o evolución expresa.');
                        }
                        // Una revisión expresa no exige repetir descripción,
                        // gravedad, sospechoso ni causalidad.
                    } else {
                        if (declaredEvolution === 'continuation' || declaredEvolution === 'resolution') {
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
            var occurredAtValue;
            var hasOccurredAt = hasOwn(request, 'occurredAt');
            try {
                representationEvents = cloneCollection(incorporated);
                retainedEvents = cloneCollection(retained);
                historyCopy = cloneCollection(request.history);
                selectionsCopy = cloneCollection(request.selections);
                if (hasOccurredAt) {
                    occurredAtValue = cloneStructure(request.occurredAt, []);
                }
            } catch (problem) {
                return fail('UNSUPPORTED_STRUCTURE', 'La petición contiene una estructura no soportada.');
            }

            var representation = {
                patientRef: request.patientRef,
                actId: request.actId,
                present: request.present,
                adverse_events: representationEvents
            };
            if (hasOccurredAt) {
                representation.occurredAt = occurredAtValue;
            }

            return {
                ok: true,
                representation: representation,
                retained: retainedEvents,
                history: historyCopy,
                selections: selectionsCopy
            };
        } catch (problem) {
            return fail('INVALID_REQUEST', 'La petición no se pudo validar.');
        }
    }

    /*
     * Corrección y anulación conservadas (FH-EA R1, D07).
     *
     * `validateRevision(request)` valida una revisión explícita de un registro
     * finalizado sin borrar ni reescribir la revisión anterior. No es un
     * almacén, no persiste, no genera identidades ni fechas y no construye un
     * envelope F4.4: sólo comprueba el vínculo técnico entre dos revisiones
     * aportadas por el llamador.
     *
     * Entrada: `{ operation, previous, next }`.
     *   - `operation` es exactamente `correction` o `annulment`. Son nombres
     *     técnicos locales para hacer comprobable D07; una anulación es una
     *     revisión nueva, no una eliminación física ni una resolución clínica.
     *   - `previous` y `next` son registros EA con `status: 'incorporated'`.
     *     Cada uno aporta `patientRef`, `actId`, `episode_id` y
     *     `observation_id` propios no vacíos; los cuatro coinciden entre
     *     revisiones.
     *   - `revision` es un entero >= 1 en ambas; la nueva es estrictamente
     *     mayor, sin exigir incremento unitario.
     *   - `next.amendment` tiene exactamente `{ previousRevision, reason }`
     *     como F4.4: `previousRevision` es la revisión recibida y `reason` un
     *     string no vacío. Se conserva verbatim.
     *   - Las sospechas y evaluaciones declaradas se validan contra su propio
     *     registro con las reglas de las unidades previas. Los campos
     *     ausentes, `undefined` propio, `null` y demás centinelas se
     *     conservan; no se completan desde la revisión anterior ni se
     *     inventan fechas, autoría, gravedad o causalidad.
     *
     * Éxito: `{ ok: true, operation, previous, next }`, con ambas revisiones
     * recuperables íntegramente y profundamente desconectadas de la entrada y
     * entre ejecuciones. Fallo: `{ ok: false, error: { code, message } }`,
     * sin representación parcial y sin mutar las entradas. No hay estado
     * oculto entre pacientes ni entre llamadas.
     */
    function isIntegerAtLeast(value, minimum) {
        return typeof value === 'number' && Number.isInteger(value) && value >= minimum;
    }

    function validateRevisionRecord(record, label) {
        if (!isRecord(record)) {
            return fail('INVALID_' + label, 'Cada revisión debe ser un objeto explícito.');
        }
        var identities = ['patientRef', 'actId', 'episode_id', 'observation_id'];
        for (var index = 0; index < identities.length; index += 1) {
            var key = identities[index];
            if (!hasOwn(record, key) || !isNonEmptyString(record[key])) {
                return fail('INVALID_' + label + '_' + key.toUpperCase(), 'Cada revisión debe traer ' + key + ' explícito no vacío.');
            }
        }
        if (record.status !== 'incorporated') {
            return fail('INVALID_' + label + '_STATUS', 'Sólo se corrigen o anulan registros finalizados (incorporated).');
        }
        if (!hasOwn(record, 'revision') || !isIntegerAtLeast(record.revision, 1)) {
            return fail('INVALID_' + label + '_REVISION', 'revision debe ser un entero >= 1 explícito.');
        }
        return null;
    }

    function validateAmendment(amendment, previousRevision, nextRevision) {
        if (!isRecord(amendment)) {
            return fail('INVALID_AMENDMENT', 'amendment debe ser un objeto explícito con exactamente { previousRevision, reason }.');
        }
        var keys = Object.keys(amendment).sort();
        if (keys.length !== 2 || keys[0] !== 'previousRevision' || keys[1] !== 'reason') {
            return fail('INVALID_AMENDMENT', 'amendment debe contener exactamente las claves previousRevision y reason.');
        }
        if (!isIntegerAtLeast(amendment.previousRevision, 1) || amendment.previousRevision !== previousRevision) {
            return fail('INVALID_AMENDMENT', 'amendment.previousRevision debe ser la revisión recibida, entero >= 1.');
        }
        if (amendment.previousRevision >= nextRevision) {
            return fail('INVALID_AMENDMENT', 'amendment.previousRevision debe ser estrictamente menor que la revisión nueva.');
        }
        if (!isNonEmptyString(amendment.reason)) {
            return fail('INVALID_AMENDMENT', 'amendment.reason debe ser un string explícito no vacío.');
        }
        return null;
    }

    function validateRevision(request) {
        try {
            if (!isRecord(request)) {
                return fail('INVALID_REQUEST', 'La petición debe ser un objeto explícito.');
            }
            if (request.operation !== 'correction' && request.operation !== 'annulment') {
                return fail('INVALID_OPERATION', 'operation debe ser exactamente correction o annulment.');
            }

            var previous = request.previous;
            var next = request.next;
            var previousError = validateRevisionRecord(previous, 'PREVIOUS');
            if (previousError) {
                return previousError;
            }
            var nextError = validateRevisionRecord(next, 'NEXT');
            if (nextError) {
                return nextError;
            }

            var identities = ['patientRef', 'actId', 'episode_id', 'observation_id'];
            for (var index = 0; index < identities.length; index += 1) {
                var key = identities[index];
                if (previous[key] !== next[key]) {
                    return fail('REVISION_IDENTITY_MISMATCH', 'Las revisiones deben coincidir en ' + key + '.');
                }
            }

            if (next.revision <= previous.revision) {
                return fail('REVISION_NOT_ADVANCING', 'La revisión nueva debe ser estrictamente mayor que la anterior.');
            }

            if (!hasOwn(next, 'amendment')) {
                return fail('MISSING_AMENDMENT', 'Una corrección o anulación exige amendment explícito.');
            }
            var amendmentError = validateAmendment(next.amendment, previous.revision, next.revision);
            if (amendmentError) {
                return amendmentError;
            }

            var previousAssociationError = validateClinicalAssociations(previous);
            if (previousAssociationError) {
                return previousAssociationError;
            }
            var nextAssociationError = validateClinicalAssociations(next);
            if (nextAssociationError) {
                return nextAssociationError;
            }

            var previousCopy;
            var nextCopy;
            try {
                previousCopy = cloneStructure(previous, []);
                nextCopy = cloneStructure(next, []);
            } catch (problem) {
                return fail('UNSUPPORTED_STRUCTURE', 'La petición contiene una estructura no soportada.');
            }

            return {
                ok: true,
                operation: request.operation,
                previous: previousCopy,
                next: nextCopy
            };
        } catch (problem) {
            return fail('INVALID_REQUEST', 'La petición no se pudo validar.');
        }
    }

    /*
     * Composición pasiva T01 → F4.4 (FH-EA R1, ea-adaptacion-pasiva).
     *
     * `composeFollowup(envelope, payload, context)` es un seam puro de
     * adaptación: recibe la envelope y el payload que ya respetan F4.4 y una
     * colección T01 en `payload.followup.adverse_events`. No conoce DOM,
     * página, paciente activo, reloj, catálogo, almacenamiento ni transporte,
     * no genera identidades y no crea un acto por ficha.
     *
     *   - Las fichas T01 reciben `patientRef`/`actId` de la envelope SÓLO si
     *     no los traen. Una referencia ya aportada que no coincida se rechaza;
     *     nunca se sobrescribe.
     *   - `context` aporta explícitamente `{ present, history, selections,
     *     revisions }`. Las tres colecciones pueden estar vacías. Las
     *     observaciones se validan con `validateObservations` y cada revisión
     *     con `validateRevision`; no se reimplementan sus reglas.
     *   - Cada revisión debe pertenecer al paciente y acto actuales y su
     *     `next` debe ser exactamente una observación incorporada del acto
     *     actual. Toda observación incorporada con `amendment` exige su
     *     revisión explícita: no se admite omitir `previous`.
     *   - Se reemplaza únicamente `payload.followup.adverse_events` por la
     *     representación R1 `{ patientRef, actId, present, adverse_events,
     *     occurredAt? }` (fecha común sólo si la envelope la aporta) y se
     *     delega la construcción de UN acto en
     *     `farmaciaActPayloads.createFollowupAct(envelope, adaptedPayload)`.
     *     El resto del payload (líneas, bloques opacos y su orden) permanece
     *     intacto.
     *
     * Éxito: `{ ok: true, act, retained, history, selections, revisions }`,
     * donde `act` es el resultado F4.4 y las ramas conservan las entradas
     * validadas. Fallo: `{ ok: false, error: { code, message } }`, sin acto ni
     * representación parcial. Entradas y salidas están profundamente
     * desconectadas y no hay estado entre llamadas.
     */
    function sameStructure(left, right) {
        if (left === right) {
            return true;
        }
        if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') {
            return false;
        }
        var leftIsArray = Array.isArray(left);
        if (leftIsArray !== Array.isArray(right)) {
            return false;
        }
        var index;
        if (leftIsArray) {
            if (left.length !== right.length) {
                return false;
            }
            for (index = 0; index < left.length; index += 1) {
                if (!sameStructure(left[index], right[index])) {
                    return false;
                }
            }
            return true;
        }
        var leftKeys = Object.keys(left).sort();
        var rightKeys = Object.keys(right).sort();
        if (leftKeys.length !== rightKeys.length) {
            return false;
        }
        for (index = 0; index < leftKeys.length; index += 1) {
            if (leftKeys[index] !== rightKeys[index]) {
                return false;
            }
            if (!sameStructure(left[leftKeys[index]], right[rightKeys[index]])) {
                return false;
            }
        }
        return true;
    }

    function containsRecord(records, candidate) {
        for (var index = 0; index < records.length; index += 1) {
            if (sameStructure(records[index], candidate)) {
                return true;
            }
        }
        return false;
    }

    // Añade la identidad de la envelope sólo cuando la ficha no la trae.
    // Una referencia propia (aunque sea undefined/null/'' o contradictoria)
    // se valida por igualdad estricta y nunca se sobrescribe.
    function withEnvelopeIdentity(event, patientRef, actId) {
        var copy = cloneStructure(event, []);
        if (hasOwn(copy, 'patientRef')) {
            if (copy.patientRef !== patientRef) {
                return fail('PATIENT_ASSOCIATION_MISMATCH', 'Una ficha aporta un patientRef que no coincide con la envelope.');
            }
        } else {
            copy.patientRef = patientRef;
        }
        if (hasOwn(copy, 'actId')) {
            if (copy.actId !== actId) {
                return fail('ACT_ASSOCIATION_MISMATCH', 'Una ficha aporta un actId que no coincide con la envelope.');
            }
        } else {
            copy.actId = actId;
        }
        return { ok: true, event: copy };
    }

    function composeFollowup(envelope, payload, context) {
        try {
            if (!isRecord(envelope)) {
                return fail('INVALID_ENVELOPE', 'La envelope debe ser un objeto explícito.');
            }
            if (!isNonEmptyString(envelope.patientRef)) {
                return fail('INVALID_PATIENT_REF', 'La envelope debe traer patientRef explícito no vacío.');
            }
            if (!isNonEmptyString(envelope.actId)) {
                return fail('INVALID_ACT_ID', 'La envelope debe traer actId explícito no vacío.');
            }
            if (!isRecord(payload)) {
                return fail('INVALID_PAYLOAD', 'El payload debe ser un objeto explícito.');
            }
            if (!hasOwn(payload, 'followup') || !isRecord(payload.followup)) {
                return fail('INVALID_FOLLOWUP', 'El payload debe traer el bloque followup explícito.');
            }
            if (!hasOwn(payload.followup, 'adverse_events') || !Array.isArray(payload.followup.adverse_events)) {
                return fail('INVALID_ADVERSE_EVENTS', 'payload.followup.adverse_events debe ser la colección T01 explícita.');
            }
            if (!isRecord(context)) {
                return fail('INVALID_CONTEXT', 'El contexto debe ser un objeto explícito.');
            }
            if (!hasOwn(context, 'present') ||
                !hasOwn(context, 'history') ||
                !hasOwn(context, 'selections') ||
                !hasOwn(context, 'revisions')) {
                return fail('INVALID_CONTEXT', 'El contexto exige present, history, selections y revisions explícitos.');
            }
            if (!Array.isArray(context.history) ||
                !Array.isArray(context.selections) ||
                !Array.isArray(context.revisions)) {
                return fail('INVALID_CONTEXT', 'history, selections y revisions deben ser arrays explícitos.');
            }

            var events = [];
            for (var index = 0; index < payload.followup.adverse_events.length; index += 1) {
                var event = payload.followup.adverse_events[index];
                if (!isRecord(event)) {
                    return fail('INVALID_EVENT', 'Cada ficha T01 debe ser un objeto explícito.');
                }
                var identified = withEnvelopeIdentity(event, envelope.patientRef, envelope.actId);
                if (!identified.ok) {
                    return identified;
                }
                events.push(identified.event);
            }

            var observationRequest = {
                patientRef: envelope.patientRef,
                actId: envelope.actId,
                present: context.present,
                adverse_events: events,
                history: context.history,
                selections: context.selections
            };
            if (hasOwn(envelope, 'occurredAt')) {
                observationRequest.occurredAt = envelope.occurredAt;
            }

            var observations = validateObservations(observationRequest);
            if (!observations.ok) {
                return observations;
            }

            var revisions = [];
            for (var revisionIndex = 0; revisionIndex < context.revisions.length; revisionIndex += 1) {
                var validatedRevision = validateRevision(context.revisions[revisionIndex]);
                if (!validatedRevision.ok) {
                    return validatedRevision;
                }
                var previous = validatedRevision.previous;
                var next = validatedRevision.next;
                if (previous.patientRef !== envelope.patientRef || next.patientRef !== envelope.patientRef) {
                    return fail('REVISION_PATIENT_MISMATCH', 'Una revisión referencia a otro paciente.');
                }
                if (previous.actId !== envelope.actId || next.actId !== envelope.actId) {
                    return fail('REVISION_ACT_MISMATCH', 'Una revisión pertenece a otro acto.');
                }
                revisions.push({
                    operation: validatedRevision.operation,
                    previous: previous,
                    next: next
                });
            }

            var incorporated = observations.representation.adverse_events;
            for (var linkIndex = 0; linkIndex < revisions.length; linkIndex += 1) {
                if (!containsRecord(incorporated, revisions[linkIndex].next)) {
                    return fail('REVISION_OBSERVATION_MISMATCH', 'El next de una revisión no corresponde a ninguna observación incorporada del acto actual.');
                }
            }
            for (var amendmentIndex = 0; amendmentIndex < incorporated.length; amendmentIndex += 1) {
                var observation = incorporated[amendmentIndex];
                if (hasOwn(observation, 'amendment') && observation.amendment !== undefined) {
                    var linked = false;
                    for (var candidateIndex = 0; candidateIndex < revisions.length; candidateIndex += 1) {
                        if (sameStructure(revisions[candidateIndex].next, observation)) {
                            linked = true;
                            break;
                        }
                    }
                    if (!linked) {
                        return fail('MISSING_REVISION', 'Una observación con amendment exige su revisión explícita.');
                    }
                }
            }

            var representation = {
                patientRef: envelope.patientRef,
                actId: envelope.actId,
                present: context.present,
                adverse_events: incorporated
            };
            if (hasOwn(envelope, 'occurredAt')) {
                representation.occurredAt = cloneStructure(envelope.occurredAt, []);
            }

            var adaptedPayload = cloneStructure(payload, []);
            adaptedPayload.followup.adverse_events = representation;

            if (!HubTools.farmaciaActPayloads ||
                typeof HubTools.farmaciaActPayloads.createFollowupAct !== 'function') {
                return fail('MISSING_ACT_BUILDER', 'farmaciaActPayloads.createFollowupAct no está disponible.');
            }

            var actResult = HubTools.farmaciaActPayloads.createFollowupAct(envelope, adaptedPayload);
            if (!isRecord(actResult)) {
                return fail('INVALID_ACT_RESULT', 'El constructor F4.4 no devolvió un resultado estructurado.');
            }
            if (actResult.ok !== true) {
                return actResult;
            }

            return {
                ok: true,
                act: actResult,
                retained: observations.retained,
                history: observations.history,
                selections: observations.selections,
                revisions: revisions
            };
        } catch (problem) {
            return fail('INVALID_REQUEST', 'La composición no se pudo validar.');
        }
    }

    HubTools.farmaciaEaInvariants = {
        validateNewEvents: validateNewEvents,
        validateObservations: validateObservations,
        validateRevision: validateRevision,
        composeFollowup: composeFollowup
    };

    if (typeof console !== 'undefined' && typeof console.log === 'function') {
        console.log('✅ Módulo farmacia_ea_invariants cargado');
    }
})();
