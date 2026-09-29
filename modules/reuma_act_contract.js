/**
 * Contrato conceptual Reuma Visit Act v1 (F5.4A, #462, train #461).
 *
 * Ownership: este módulo define el objeto de dominio mínimo que expresa la
 * intención profesional de una visita Reuma (tipo de visita × patología ×
 * referencia de paciente × payload explícito del journey). Es INDEPENDIENTE
 * de cualquier transporte o proyección posterior (sin conocimiento de hojas,
 * columnas, contadores de columnas, portapapeles ni generadores legacy):
 * la proyección es responsabilidad de capas posteriores, no del contrato
 * (ADR-005, ADR-006).
 *
 * Superficie: `HubTools.reumaActContract.createVisitAct({ kind, patientRef,
 * pathology, payload })`.
 *
 * Reglas vinculantes (#462):
 *   - `contractVersion` es exactamente 'reuma-visit-act/v1'.
 *   - `kind` y `pathology` son tokens EXACTOS, sin normalización ni alias:
 *     kind ∈ { primera_visita, seguimiento };
 *     pathology ∈ { espa, aps, ar, les, sjogren }.
 *   - `patientRef` es un string explícito no vacío (al menos un carácter no
 *     blanco); se devuelve verbatim, nunca se infiere.
 *   - `payload` debe ser un objeto explícito no-array; se copia en profundi-
 *     dad preservando centinelas: ausencia real, clave-presente-con-undefined,
 *     '', 'NA', 'ND', 0, false y null NO colapsan entre sí (§12).
 *   - Fail-closed: toda entrada inválida devuelve
 *     { ok: false, error: { code, message } } y nunca lanza ni fabrica un
 *     acto parcial (§8).
 *   - El resultado ok lleva EXACTAMENTE { ok, contractVersion, kind,
 *     patientRef, pathology, payload }; no se inventan campos de sobre
 *     (actId, revision, actor, timestamp, assurance, siteId).
 *   - No muta la petición ni el payload original; el resultado está
 *     desconectado (deep copy) de las entradas.
 *   - El contrato no decide nada clínico: selecciona y expresa la intención
 *     profesional; no infiere dosis, vía, pauta, línea, validación ni
 *     ningún dato terapéutico, y no convierte ausencia en valor por defecto.
 */
(function () {
    'use strict';

    if (typeof window === 'undefined' || !window.HubTools) {
        console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js antes de reuma_act_contract.js.');
        return;
    }

    var HubTools = window.HubTools;

    var CONTRACT_VERSION = 'reuma-visit-act/v1';

    // Tokens contractuales exactos (D1/D2): sin trimming, sin folding de
    // mayúsculas, sin alias ni sinónimos. La correspondencia es de igualdad
    // estricta contra estos conjuntos.
    var SUPPORTED_KINDS = ['primera_visita', 'seguimiento'];
    var SUPPORTED_PATHOLOGIES = ['espa', 'aps', 'ar', 'les', 'sjogren'];

    function isSupportedToken(value, supported) {
        if (typeof value !== 'string') return false;
        return supported.indexOf(value) !== -1;
    }

    function isValidPatientRef(value) {
        return typeof value === 'string' && value.trim().length > 0;
    }

    function isValidPayload(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    /**
     * Copia profunda fiel para las formas soportadas por el payload actual
     * (objetos, arrays y primitivos). Preserva:
     *   - claves realmente ausentes (no se inventan);
     *   - claves presentes con valor undefined (siguen presentes);
     *   - '', 'NA', 'ND', 0, false y null verbatim, con su tipo.
     * La comprobación de objeto no depende del reino de ejecución (no se
     * compara contra Object.prototype del módulo); el prototipo del objeto
     * original se preserva en la copia.
     */
    function deepCopy(value) {
        if (Array.isArray(value)) {
            var copy = new Array(value.length);
            for (var i = 0; i < value.length; i++) {
                copy[i] = deepCopy(value[i]);
            }
            return copy;
        }
        if (value !== null && typeof value === 'object') {
            var out = Object.create(Object.getPrototypeOf(value));
            var keys = Object.keys(value); // incluye claves presentes con undefined
            for (var k = 0; k < keys.length; k++) {
                out[keys[k]] = deepCopy(value[keys[k]]);
            }
            return out;
        }
        return value;
    }

    function fail(code, message) {
        return { ok: false, error: { code: code, message: message } };
    }

    /**
     * Crea el acto de visita v1 a partir de la intención profesional
     * explícita. Nunca lanza: toda entrada inválida produce un resultado
     * estructurado de error tipado.
     */
    function createVisitAct(request) {
        if (request === null || typeof request !== 'object' || Array.isArray(request)) {
            return fail('INVALID_REQUEST', 'createVisitAct requiere un objeto de petición explícito { kind, patientRef, pathology, payload }.');
        }

        if (!isSupportedToken(request.kind, SUPPORTED_KINDS)) {
            return fail('INVALID_KIND', "kind debe ser exactamente 'primera_visita' o 'seguimiento'; se recibió " + (typeof request.kind) + '. No se admite normalización ni alias.');
        }

        if (!isSupportedToken(request.pathology, SUPPORTED_PATHOLOGIES)) {
            return fail('INVALID_PATHOLOGY', "pathology debe ser un token exacto del conjunto soportado (espa | aps | ar | les | sjogren); se recibió " + (typeof request.pathology) + '. No hay mapeo heurístico.');
        }

        if (!isValidPatientRef(request.patientRef)) {
            return fail('INVALID_PATIENT_REF', 'patientRef debe ser un string explícito con al menos un carácter no blanco; no se infiere de nombre, fármaco, historial ni posición.');
        }

        if (!isValidPayload(request.payload)) {
            return fail('INVALID_PAYLOAD', 'payload debe ser un objeto explícito no-array (objeto del journey); se recibió ' + (request.payload === null ? 'null' : typeof request.payload) + '.');
        }

        // Resultado desconectado de las entradas: payload copiado en
        // profundidad; kind/pathology/patientRef se devuelven verbatim.
        return {
            ok: true,
            contractVersion: CONTRACT_VERSION,
            kind: request.kind,
            patientRef: request.patientRef,
            pathology: request.pathology,
            payload: deepCopy(request.payload)
        };
    }

    HubTools.reumaActContract = {
        createVisitAct: createVisitAct
    };

    console.log('✅ Módulo reuma_act_contract cargado');
})();
