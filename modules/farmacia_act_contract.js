/**
 * Contrato común Pharmacy Act v1 (F4.4A, #488, train #487).
 *
 * Ownership: este módulo define el objeto de dominio mínimo que expresa el
 * acto profesional de Farmacia Hospitalaria (Validación, Primera Visita o
 * Seguimiento) como acto completo INDEPENDIENTE de cualquier transporte o
 * proyección posterior. La fila de exportación es una proyección de
 * compatibilidad, no el acto conceptual (freeze de arquitectura §6.2);
 * este contrato no conoce hojas, columnas, portadores ni destinos.
 *
 * Superficie: `HubTools.farmaciaActContract.createAct({ actId, revision,
 * kind, siteId, patientRef, occurredAt, authoredAt, authorRef,
 * attributionAssurance, provenance, payload, amendment? })`.
 *
 * Reglas vinculantes (#488):
 *   - `contractVersion` es exactamente 'pharmacy-act/v1' y es propiedad del
 *     contrato; todo el resto de la metadata no clínica llega de forma
 *     EXPLÍCITA al constructor. No se autogeneran IDs, fechas, actor, site
 *     ni assurance (nunca se consulta el reloj).
 *   - `kind` es un token EXACTO del conjunto { pharmacy_validation,
 *     pharmacy_first_visit, pharmacy_followup }, sin normalización ni
 *     alias. Los tres casos de uso son independientes: no existe
 *     encadenamiento implícito entre ellos.
 *   - `actId`, `siteId`, `patientRef`, `authorRef` y
 *     `attributionAssurance` son strings explícitos no vacíos; se
 *     devuelven verbatim, nunca se infieren. `attributionAssurance` no se
 *     enumera aquí: el vocabulario pertenece a la capa llamadora.
 *   - `revision` es un entero >= 1.
 *   - `occurredAt` y `authoredAt` son strings ISO-8601 explícitos de
 *     fecha-hora (con 'T'); se validan contra calendario real y se
 *     devuelven verbatim.
 *   - `provenance` es un objeto explícito opaco: este contrato no inventa
 *     taxonomía interna ni interpreta su contenido.
 *   - `payload` es un objeto explícito opaco (no array): el dominio
 *     clínico pertenece a T2. Este contrato NO decide nada clínico:
 *     solicitado ≠ validado, previo ≠ nuevo, followup ≠ validación; no
 *     infiere dosis, vía, pauta, presentación, inducción, duración,
 *     línea, switch, add-on, renovación ni causalidad; no lee fármaco,
 *     catálogo, CIMA, historial, estado del paciente ni estado del
 *     navegador para completar el acto; la ausencia permanece ausencia.
 *   - `amendment`, si llega, es un objeto con EXACTAMENTE
 *     { previousRevision, reason }: previousRevision entero >= 1 y menor
 *     que `revision`; reason string no vacío. Si no llega, el resultado
 *     no lleva clave 'amendment' (sin placeholder ni default).
 *   - Preservación estricta de centinelas: missing ≠ null ≠ '' ≠ 0 ≠
 *     false ≠ presente-con-undefined; nada colapsa ni se normaliza.
 *   - Fail-closed: toda entrada inválida (incluidos tipos no soportados y
 *     ciclos dentro de las estructuras) devuelve
 *     { ok: false, error: { code, message } }, nunca lanza y nunca
 *     fabrica un acto parcial.
 *   - El resultado está desconectado (copia profunda) de las entradas:
 *     ninguna referencia del llamador puede mutar el acto, y crear el
 *     acto no muta input/payload/provenance/amendment originales.
 */
(function () {
    'use strict';

    if (typeof window === 'undefined' || !window.HubTools) {
        console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js antes de farmacia_act_contract.js.');
        return;
    }

    var HubTools = window.HubTools;

    var CONTRACT_VERSION = 'pharmacy-act/v1';

    // Tokens contractuales exactos: sin trimming, sin folding de mayúsculas,
    // sin alias ni sinónimos. Igualdad estricta contra este conjunto.
    var SUPPORTED_KINDS = ['pharmacy_validation', 'pharmacy_first_visit', 'pharmacy_followup'];

    // ISO-8601 fecha-hora explícita: fecha calendario + 'T' + hora, con
    // fracción opcional y desfase Z/±HH:MM opcional. La validez calendario
    // real (mes 1-12, día según mes/bisiesto, rangos de hora) se comprueba
    // de forma estricta: el parser nativo hace rollover de fechas
    // imposibles (p.ej. 2026-02-30) y no basta como única barrera.
    var ISO_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,9})?)?(Z|[+-](\d{2}):(\d{2}))?$/;

    function daysInMonthOf(year, month) {
        var lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (month === 2) {
            var leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
            return leap ? 29 : 28;
        }
        return lengths[month - 1];
    }

    function isExplicitIsoDateTime(value) {
        if (typeof value !== 'string') return false;
        var match = value.match(ISO_DATE_TIME_PATTERN);
        if (!match) return false;
        var year = Number(match[1]);
        var month = Number(match[2]);
        var day = Number(match[3]);
        var hour = Number(match[4]);
        var minute = Number(match[5]);
        var second = match[6] === undefined ? 0 : Number(match[6]);
        var offsetHour = match[9] === undefined ? 0 : Number(match[9]);
        var offsetMinute = match[10] === undefined ? 0 : Number(match[10]);
        if (month < 1 || month > 12) return false;
        if (day < 1 || day > daysInMonthOf(year, month)) return false;
        if (hour > 23 || minute > 59 || second > 59) return false;
        if (offsetHour > 23 || offsetMinute > 59) return false;
        var parsed = Date.parse(value);
        return typeof parsed === 'number' && !isNaN(parsed);
    }

    function isSupportedKind(value) {
        return typeof value === 'string' && SUPPORTED_KINDS.indexOf(value) !== -1;
    }

    function isNonEmptyString(value) {
        return typeof value === 'string' && value.trim().length > 0;
    }

    function isIntegerAtLeast(value, minimum) {
        return typeof value === 'number' && isFinite(value) && Math.floor(value) === value && value >= minimum;
    }

    // Objeto plano, con detección tolerante al reino de ejecución (el
    // módulo corre también bajo sandbox): prototipo null o un prototipo
    // cuyo constructor es Object. Instancias de clases, boxed objects y
    // exóticos (Date, Map, Set...) no son formas soportadas del contrato.
    function isPlainObject(value) {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
        var proto = Object.getPrototypeOf(value);
        if (proto === null) return true;
        return typeof proto.constructor === 'function' && proto.constructor.name === 'Object';
    }

    /**
     * Copia profunda fiel restringida a las formas sin pérdida soportadas:
     * objetos planos, arrays, string, número finito, boolean, null y
     * clave-presente-con-undefined. Ante tipos no soportados (funciones,
     * símbolos, bigints, exóticos, no finitos) o ciclos lanza un descriptor
     * tipado que createAct convierte en fallo estructurado; nunca normaliza
     * en silencio. `ancestors` permite referencias compartidas acíclicas.
     */
    function cloneSupported(value, ancestors) {
        if (value === null) return null;
        var t = typeof value;
        if (t === 'string' || t === 'boolean') return value;
        if (t === 'number') {
            if (!isFinite(value)) throw { kindOfProblem: 'unsupported_type', detail: 'number no finito' };
            return value;
        }
        if (t === 'undefined') return undefined;
        if (t === 'function' || t === 'symbol' || t === 'bigint') {
            throw { kindOfProblem: 'unsupported_type', detail: t };
        }
        // A partir de aquí: solo objetos.
        if (ancestors.indexOf(value) !== -1) {
            throw { kindOfProblem: 'cycle', detail: 'referencia cíclica' };
        }
        var isArray = Array.isArray(value);
        if (!isArray && !isPlainObject(value)) {
            throw { kindOfProblem: 'unsupported_type', detail: 'objeto no plano' };
        }
        ancestors.push(value);
        try {
            if (isArray) {
                var copyArray = new Array(value.length);
                for (var i = 0; i < value.length; i++) {
                    copyArray[i] = cloneSupported(value[i], ancestors);
                }
                return copyArray;
            }
            var copy = Object.create(Object.getPrototypeOf(value));
            var keys = Object.keys(value); // incluye claves presentes con undefined
            for (var k = 0; k < keys.length; k++) {
                copy[keys[k]] = cloneSupported(value[keys[k]], ancestors);
            }
            return copy;
        } finally {
            ancestors.pop();
        }
    }

    function cloneStructure(value) {
        return cloneSupported(value, []);
    }

    function fail(code, message) {
        return { ok: false, error: { code: code, message: message } };
    }

    function failFromCloneProblem(problem, code, label) {
        if (problem && problem.kindOfProblem === 'cycle') {
            return fail(code, label + ' contiene una referencia cíclica; los ciclos no se normalizan ni se recortan en silencio.');
        }
        return fail(code, label + ' contiene un tipo no soportado (' + (problem && problem.detail ? problem.detail : 'desconocido') + '); solo se admiten objetos planos, arrays, strings, números finitos, booleanos, null y claves presentes con undefined.');
    }

    /**
     * Crea el acto Pharmacy Act v1 a partir de la intención profesional y la
     * metadata no clínica explícitas. Nunca lanza: toda entrada inválida
     * produce un resultado estructurado de error tipado.
     */
    function createAct(request) {
        if (request === null || typeof request !== 'object' || Array.isArray(request)) {
            return fail('INVALID_REQUEST', 'createAct requiere un objeto de petición explícito con actId, revision, kind, siteId, patientRef, occurredAt, authoredAt, authorRef, attributionAssurance, provenance y payload.');
        }

        if (!isNonEmptyString(request.actId)) {
            return fail('INVALID_ACT_ID', 'actId debe ser un string explícito no vacío; no se autogenera ni se infiere.');
        }

        if (!isIntegerAtLeast(request.revision, 1)) {
            return fail('INVALID_REVISION', 'revision debe ser un entero >= 1; se recibió ' + String(request.revision) + '.');
        }

        if (!isSupportedKind(request.kind)) {
            return fail('INVALID_KIND', "kind debe ser exactamente 'pharmacy_validation', 'pharmacy_first_visit' o 'pharmacy_followup'; se recibió " + (typeof request.kind) + ". No se admite normalización ni alias, y los tres casos de uso son independientes.");
        }

        if (!isNonEmptyString(request.siteId)) {
            return fail('INVALID_SITE_ID', 'siteId debe ser un string explícito no vacío; no se autogenera ni se deduce del entorno.');
        }

        if (!isNonEmptyString(request.patientRef)) {
            return fail('INVALID_PATIENT_REF', 'patientRef debe ser un string explícito no vacío; no se infiere de nombre, fármaco, historial ni posición.');
        }

        if (!isExplicitIsoDateTime(request.occurredAt)) {
            return fail('INVALID_OCCURRED_AT', 'occurredAt debe ser un string ISO-8601 fecha-hora explícito y calendariamente válido; no se genera con el reloj.');
        }

        if (!isExplicitIsoDateTime(request.authoredAt)) {
            return fail('INVALID_AUTHORED_AT', 'authoredAt debe ser un string ISO-8601 fecha-hora explícito y calendariamente válido; no se genera con el reloj.');
        }

        if (!isNonEmptyString(request.authorRef)) {
            return fail('INVALID_AUTHOR_REF', 'authorRef debe ser un string explícito no vacío; el actor no se autogenera.');
        }

        if (!isNonEmptyString(request.attributionAssurance)) {
            return fail('INVALID_ATTRIBUTION_ASSURANCE', 'attributionAssurance debe ser un string explícito no vacío; este contrato no enumera el vocabulario de assurance.');
        }

        if (!isPlainObject(request.payload)) {
            return fail('INVALID_PAYLOAD', 'payload debe ser un objeto explícito no-array (objeto del journey); se recibió ' + (request.payload === null ? 'null' : typeof request.payload) + '.');
        }

        if (!isPlainObject(request.provenance)) {
            return fail('INVALID_PROVENANCE', 'provenance debe ser un objeto explícito no-array; este contrato no inventa su taxonomía interna.');
        }

        var amendmentProvided = request.amendment !== undefined;
        if (amendmentProvided) {
            var amendment = request.amendment;
            if (!isPlainObject(amendment)) {
                return fail('INVALID_AMENDMENT', 'amendment, si llega, debe ser un objeto explícito con exactamente { previousRevision, reason }.');
            }
            var amendmentKeys = Object.keys(amendment).sort();
            if (amendmentKeys.length !== 2 || amendmentKeys[0] !== 'previousRevision' || amendmentKeys[1] !== 'reason') {
                return fail('INVALID_AMENDMENT', 'amendment debe contener exactamente las claves previousRevision y reason; no se aceptan claves extra ni faltantes.');
            }
            if (!isIntegerAtLeast(amendment.previousRevision, 1) || amendment.previousRevision >= request.revision) {
                return fail('INVALID_AMENDMENT', 'amendment.previousRevision debe ser un entero >= 1 y estrictamente menor que revision (' + String(request.revision) + ').');
            }
            if (!isNonEmptyString(amendment.reason)) {
                return fail('INVALID_AMENDMENT', 'amendment.reason debe ser un string explícito no vacío.');
            }
        }

        // Copias profundas desconectadas de las entradas (payload,
        // provenance y amendment). Los tipos no soportados y los ciclos
        // fallan cerrado; nunca se normalizan en silencio.
        var clonedPayload;
        var clonedProvenance;
        var clonedAmendment;
        try {
            clonedPayload = cloneStructure(request.payload);
            clonedProvenance = cloneStructure(request.provenance);
            if (amendmentProvided) {
                clonedAmendment = cloneStructure(request.amendment);
            }
        } catch (problem) {
            return failFromCloneProblem(problem, 'UNSUPPORTED_STRUCTURE', 'payload/provenance/amendment');
        }

        // Resultado desconectado de las entradas; escalares verbatim. Sin
        // claves adicionales: nada se autogenera ni se completa aquí.
        var act = {
            ok: true,
            contractVersion: CONTRACT_VERSION,
            actId: request.actId,
            revision: request.revision,
            kind: request.kind,
            siteId: request.siteId,
            patientRef: request.patientRef,
            occurredAt: request.occurredAt,
            authoredAt: request.authoredAt,
            authorRef: request.authorRef,
            attributionAssurance: request.attributionAssurance,
            provenance: clonedProvenance,
            payload: clonedPayload
        };
        if (amendmentProvided) {
            act.amendment = clonedAmendment;
        }
        return act;
    }

    HubTools.farmaciaActContract = {
        createAct: createAct
    };

    console.log('✅ Módulo farmacia_act_contract cargado');
})();
