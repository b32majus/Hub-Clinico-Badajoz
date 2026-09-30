/**
 * Payloads independientes de Validación / Primera Visita / Seguimiento sobre
 * el contrato común Pharmacy Act v1 (F4.4B, #489, train #487).
 *
 * Ownership: este módulo define los tres constructores de acto profesional de
 * Farmacia Hospitalaria como casos de uso INDEPENDIENTES. Cada builder fija
 * exclusivamente su `kind` ('pharmacy_validation' / 'pharmacy_first_visit' /
 * 'pharmacy_followup'), recibe la envelope común EXPLÍCITA y el payload
 * clínico EXPLÍCITO de su caso de uso, y DELEGA toda la validación común,
 * la preservación de centinelas y la desconexión profunda del resultado en
 * `HubTools.farmaciaActContract.createAct` (T1, #488). Este módulo no
 * reimplementa ninguna regla del contrato común ni conoce transporte,
 * proyección, captura ni persistencia posterior.
 *
 * Superficie: `HubTools.farmaciaActPayloads.createValidationAct(envelope,
 * payload)`, `createFirstVisitAct(envelope, payload)` y
 * `createFollowupAct(envelope, payload)`.
 *
 * Estructura de payload congelada (nivel bloque/cardinalidad; los bloques
 * son OPACOS: este módulo no añade ni un solo campo hoja, no normaliza nada
 * y no introduce taxonomía clínica nueva por conveniencia):
 *
 *   - Validación:    { request, validation?, transversal?, lines }
 *   - Primera Visita: { firstVisit, transversal?, lines }
 *   - Seguimiento:   { followup, lines }
 *
 * Reglas vinculantes (#489):
 *   - `kind` NO llega de fuera: lo fija cada builder y un envelope que lo
 *     traiga (o traiga `payload`) falla cerrado.
 *   - Los bloques opcionales (`validation`, `transversal`) existen SÓLO si
 *     el llamador los aporta; ausencia significa clave inexistente, nunca
 *     placeholder ni default clínico.
 *   - `request` nunca rellena `validation` ni `lines`; `firstVisit` nunca
 *     promueve solicitado ni previo a línea; `followup` nunca marca ni crea
 *     validación. No existe encadenamiento entre casos de uso: cada builder
 *     produce exactamente UN acto de EXACTAMENTE su propio kind.
 *   - `lines` es siempre un array EXPLÍCITO del llamador (puede ser vacío);
 *     cada elemento debe ser objeto explícito; orden y cardinalidad se
 *     preservan verbatim (0, 1, 2+ permanecen 0, 1, 2+). Ninguna línea se
 *     genera desde request, nombre de fármaco, catálogo, historial o
 *     tratamiento previo.
 *   - La envelope tiene conjunto de claves CERRADO: exactamente las que
 *     exige `createAct` excepto `kind` y `payload`; clave desconocida falla
 *     cerrado. La validez de cada campo (strings no vacíos, revision,
 *     fechas ISO, provenance, amendment) NO se revalida aquí: se delega en
 *     T1 y sus fallos estructurados se propagan verbatim.
 *   - Fail-closed: toda entrada inválida devuelve
 *     { ok: false, error: { code, message } }, nunca lanza y nunca fabrica
 *     un acto parcial. Códigos propios: INVALID_ENVELOPE,
 *     UNKNOWN_ENVELOPE_KEY, KIND_OWNED_BY_BUILDER, PAYLOAD_OWNED_BY_BUILDER,
 *     INVALID_PAYLOAD, UNKNOWN_PAYLOAD_KEY, MISSING_BLOCK, INVALID_BLOCK,
 *     INVALID_LINES, INVALID_LINE_ELEMENT.
 *   - Ni las entradas ni el resultado comparten referencias: la envelope y
 *     el payload ensamblado llegan a `createAct`, que copia en profundidad;
 *     crear el acto no muta las entradas y mutarlas después no altera el
 *     acto.
 *   - Este módulo no lee DOM, almacenamiento, reloj, paciente global,
 *     catálogo ni CIMA; no importa ni usa núcleo de exportación, columnas,
 *     portadores ni destinos: los bloques del payload son datos del dominio
 *     clínico y la proyección de transporte es un adapter posterior ajeno a
 *     F4.4B.
 */
(function () {
    'use strict';

    if (typeof window === 'undefined' || !window.HubTools) {
        console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js antes de farmacia_act_payloads.js.');
        return;
    }

    var HubTools = window.HubTools;

    if (!HubTools.farmaciaActContract || typeof HubTools.farmaciaActContract.createAct !== 'function') {
        console.error('❌ Error: HubTools.farmaciaActContract.createAct no disponible. Asegúrate de cargar farmacia_act_contract.js (T1) antes de farmacia_act_payloads.js.');
        return;
    }

    var createAct = HubTools.farmaciaActContract.createAct;

    // Claves de envelope admitidas: exactamente las que exige el contrato
    // común T1, EXCEPTO `kind` (fijado por el builder) y `payload`
    // (ensamblado por el builder desde el payload clínico explícito).
    var ENVELOPE_KEYS = ['actId', 'revision', 'siteId', 'patientRef', 'occurredAt', 'authoredAt', 'authorRef', 'attributionAssurance', 'provenance', 'amendment'];

    // Estructura de payload congelada por caso de uso: bloque clínico
    // principal (obligatorio), bloques opcionales y `lines` explícito.
    var USE_CASES = {
        validation: {
            kind: 'pharmacy_validation',
            requiredBlocks: ['request'],
            optionalBlocks: ['validation', 'transversal'],
            hasLines: true
        },
        firstVisit: {
            kind: 'pharmacy_first_visit',
            requiredBlocks: ['firstVisit'],
            optionalBlocks: ['transversal'],
            hasLines: true
        },
        followup: {
            kind: 'pharmacy_followup',
            requiredBlocks: ['followup'],
            optionalBlocks: [],
            hasLines: true
        }
    };

    function fail(code, message) {
        return { ok: false, error: { code: code, message: message } };
    }

    // Objeto plano, con detección tolerante al reino de ejecución (el
    // módulo corre también bajo sandbox): prototipo null o un prototipo
    // cuyo constructor es Object. Instancias de clases, boxed objects y
    // exóticos no son formas soportadas de un bloque clínico.
    function isPlainObject(value) {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
        var proto = Object.getPrototypeOf(value);
        if (proto === null) return true;
        return typeof proto.constructor === 'function' && proto.constructor.name === 'Object';
    }

    function validateEnvelope(envelope) {
        if (!isPlainObject(envelope)) {
            return fail('INVALID_ENVELOPE', 'La envelope debe ser un objeto explícito con las claves de Pharmacy Act v1 (actId, revision, siteId, patientRef, occurredAt, authoredAt, authorRef, attributionAssurance, provenance y opcionalmente amendment); se recibió ' + (envelope === null ? 'null' : typeof envelope) + '.');
        }
        var keys = Object.keys(envelope);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (key === 'kind') {
                return fail('KIND_OWNED_BY_BUILDER', "La envelope no puede traer 'kind': cada builder fija exclusivamente su propio kind de Pharmacy Act v1.");
            }
            if (key === 'payload') {
                return fail('PAYLOAD_OWNED_BY_BUILDER', "La envelope no puede traer 'payload': el payload clínico se aporta como segundo argumento explícito del builder.");
            }
            if (ENVELOPE_KEYS.indexOf(key) === -1) {
                return fail('UNKNOWN_ENVELOPE_KEY', "La envelope tiene un conjunto de claves cerrado; clave no admitida: '" + key + "'. La validez de cada campo se delega en el contrato común.");
            }
        }
        return null;
    }

    /**
     * Ensambla el payload del caso de uso respetando la estructura
     * congelada. Devuelve { ok: true, payload } o un fallo estructurado.
     * Los bloques se toman VERBATIM del llamador: aquí no se añade,
     * normaliza, completa ni interpreta ningún campo hoja.
     */
    function buildPayload(useCase, payloadInput) {
        if (!isPlainObject(payloadInput)) {
            return fail('INVALID_PAYLOAD', "El payload clínico debe ser un objeto explícito con la estructura del caso de uso (" + USE_CASES[useCase].requiredBlocks.join(', ') + " obligatorio, bloques opcionales según estructura congelada y 'lines' array explícito); se recibió " + (payloadInput === null ? 'null' : typeof payloadInput) + '.');
        }

        var allowedKeys = USE_CASES[useCase].requiredBlocks.concat(USE_CASES[useCase].optionalBlocks, USE_CASES[useCase].hasLines ? ['lines'] : []);
        var keys = Object.keys(payloadInput);
        for (var i = 0; i < keys.length; i++) {
            if (allowedKeys.indexOf(keys[i]) === -1) {
                return fail('UNKNOWN_PAYLOAD_KEY', "El payload de " + useCase + " tiene estructura congelada (" + allowedKeys.join(', ') + "); clave no admitida: '" + keys[i] + "'.");
            }
        }

        for (var r = 0; r < USE_CASES[useCase].requiredBlocks.length; r++) {
            var requiredBlock = USE_CASES[useCase].requiredBlocks[r];
            if (!(requiredBlock in payloadInput)) {
                return fail('MISSING_BLOCK', "El payload de " + useCase + " exige el bloque explícito '" + requiredBlock + "'; la ausencia no se rellena desde tratamiento solicitado, previo, historial ni catálogo.");
            }
        }

        var allBlocks = USE_CASES[useCase].requiredBlocks.concat(USE_CASES[useCase].optionalBlocks);
        for (var b = 0; b < allBlocks.length; b++) {
            var blockName = allBlocks[b];
            if (blockName in payloadInput && !isPlainObject(payloadInput[blockName])) {
                return fail('INVALID_BLOCK', "El bloque '" + blockName + "' debe ser un objeto explícito; se recibió " + (payloadInput[blockName] === null ? 'null' : Array.isArray(payloadInput[blockName]) ? 'array' : typeof payloadInput[blockName]) + '.');
            }
        }

        var payload = {};
        for (var k = 0; k < allBlocks.length; k++) {
            var name = allBlocks[k];
            if (name in payloadInput) {
                payload[name] = payloadInput[name];
            }
        }

        if (USE_CASES[useCase].hasLines) {
            if (!('lines' in payloadInput) || !Array.isArray(payloadInput.lines)) {
                return fail('INVALID_LINES', "'lines' debe ser un array EXPLÍCITO del llamador (puede ser vacío); se recibió " + (!('lines' in payloadInput) ? 'ausente' : Array.isArray(payloadInput.lines) ? 'array' : typeof payloadInput.lines) + '.');
            }
            var lines = payloadInput.lines;
            for (var l = 0; l < lines.length; l++) {
                if (!isPlainObject(lines[l])) {
                    return fail('INVALID_LINE_ELEMENT', "Cada elemento de 'lines' debe ser un objeto explícito; el elemento " + l + ' es ' + (lines[l] === null ? 'null' : Array.isArray(lines[l]) ? 'array' : typeof lines[l]) + '.');
                }
            }
            // Verbatim, sin deduplicar, sin reordenar y sin completar:
            // 0, 1 y 2+ líneas permanecen 0, 1 y 2+.
            payload.lines = lines;
        }

        return { ok: true, payload: payload };
    }

    function createUseCaseAct(useCase, envelope, payloadInput) {
        var spec = USE_CASES[useCase];
        var envelopeFailure = validateEnvelope(envelope);
        if (envelopeFailure) return envelopeFailure;

        var payloadResult = buildPayload(useCase, payloadInput);
        if (!payloadResult.ok) return payloadResult;

        var request = {};
        for (var i = 0; i < ENVELOPE_KEYS.length; i++) {
            var key = ENVELOPE_KEYS[i];
            if (key in envelope) {
                request[key] = envelope[key];
            }
        }
        request.kind = spec.kind;
        request.payload = payloadResult.payload;

        // Delegación total en el contrato común T1: validación de envelope,
        // preservación de centinelas y desconexión profunda del resultado.
        return createAct(request);
    }

    HubTools.farmaciaActPayloads = Object.freeze({
        createValidationAct: function (envelope, payload) {
            return createUseCaseAct('validation', envelope, payload);
        },
        createFirstVisitAct: function (envelope, payload) {
            return createUseCaseAct('firstVisit', envelope, payload);
        },
        createFollowupAct: function (envelope, payload) {
            return createUseCaseAct('followup', envelope, payload);
        }
    });

    console.log('✅ Módulo farmacia_act_payloads cargado');
})();
