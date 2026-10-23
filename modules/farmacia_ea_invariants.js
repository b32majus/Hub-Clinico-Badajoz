/**
 * Invariantes puras mínimas de Acontecimientos Adversos 0..N (FH-EA R1).
 *
 * Ownership: este módulo valida NUEVAS fichas de EA dentro de un acto ya
 * delimitado por referencias explícitas. No es un DTO universal EA, no
 * sustituye al contrato Pharmacy Act F4.4 y no conoce transporte,
 * persistencia, paciente activo, reloj, catálogo ni generación de
 * identidades. La captura T01 y los módulos F4.4 no se modifican aquí.
 *
 * Superficie: `HubTools.farmaciaEaInvariants.validateNewEvents(request)`.
 *
 * Entrada: `{ patientRef, actId, present, adverse_events }`.
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
                copy[key] = cloneStructure(value[key], ancestors);
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

    HubTools.farmaciaEaInvariants = {
        validateNewEvents: validateNewEvents
    };

    if (typeof console !== 'undefined' && typeof console.log === 'function') {
        console.log('✅ Módulo farmacia_ea_invariants cargado');
    }
})();
