/**
 * Adaptador Reuma Visit Act v1 → fila legacy (F5.4B, #463, train #461).
 *
 * Ownership: este módulo es el seam explícito entre el contrato de acto de
 * visita (`HubTools.reumaActContract`, F5.4A) y la proyección de transporte
 * legacy. Su única responsabilidad es traducir el acto validado a la
 * petición que espera la frontera F5.3 y devolver su resultado verbatim.
 *
 * Reglas vinculantes (#463):
 *   - Acepta ÚNICAMENTE un sobre `reuma-visit-act/v1` válido tal como lo
 *     produce `createVisitAct`: exactamente las 6 claves { ok,
 *     contractVersion, kind, patientRef, pathology, payload }, con
 *     contractVersion exacto, kind ∈ { primera_visita, seguimiento },
 *     pathology ∈ { espa, aps, ar, les, sjogren }, patientRef string no
 *     blanco y payload objeto no-array. Sin normalización, alias ni
 *     enriquecimiento (§13); cualquier clave extra del sobre invalida el
 *     acto, porque no pudo salir del contrato T1.
 *   - Mapeo cerrado y explícito kind → tipo de visita:
 *     primera_visita → 'primera', seguimiento → 'seguimiento'. No existe
 *     ningún otro mapeo ni heurística.
 *   - Delega EXCLUSIVAMENTE en
 *     `HubTools.reumaExportBoundary.generateLegacyRow497({ datos, pathology,
 *     tipoVisita })`: nunca accede a generadores legacy directos, contadores
 *     de columnas, hojas, TSV ni portapapeles (ADR-006; la fila es
 *     proyección posterior, no dominio — ADR-005).
 *   - Resultado ok: conserva el contenido de la frontera verbatim
 *     ({ ok, row, fields, meta }), sin truncar, rellenar, reordenar ni
 *     transformar ''; missing; 'NA'; 'ND'; 0; false (§12).
 *   - Fail-closed tipado: acto inválido, frontera ausente o no funcional,
 *     resultado de frontera no-ok y excepción de frontera devuelven
 *     { ok: false, error: { code, message } }; nunca lanza y nunca fabrica
 *     una fila (§8). Un error tipado de la frontera se propaga con su
 *     `code` verbatim: la frontera ya decidió.
 *   - No muta el acto ni el payload (la frontera tampoco).
 *   - El adaptador no valida ni decide nada clínico: traduce
 *     contrato→transporte; no infiere ningún dato terapéutico ni estado
 *     ausente.
 */
(function () {
    'use strict';

    if (typeof window === 'undefined' || !window.HubTools) {
        console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js antes de reuma_legacy_export_adapter.js.');
        return;
    }

    var HubTools = window.HubTools;

    var CONTRACT_VERSION = 'reuma-visit-act/v1';

    // Sobre esperado, tal como lo produce `createVisitAct` (T1): exactamente
    // estas claves, ni una más ni una menos.
    var ENVELOPE_KEYS = ['contractVersion', 'kind', 'ok', 'pathology', 'patientRef', 'payload'].sort().join('|');

    // Tokens contractuales exactos del contrato T1 (sin alias ni folding).
    var SUPPORTED_KINDS = ['primera_visita', 'seguimiento'];
    var SUPPORTED_PATHOLOGIES = ['espa', 'aps', 'ar', 'les', 'sjogren'];

    // Mapeo cerrado kind → tipo de visita de transporte. No hay otro mapeo.
    var TIPO_VISITA_BY_KIND = {
        primera_visita: 'primera',
        seguimiento: 'seguimiento'
    };

    function fail(code, message) {
        return { ok: false, error: { code: code, message: message } };
    }

    function isSupportedToken(value, supported) {
        return typeof value === 'string' && supported.indexOf(value) !== -1;
    }

    /**
     * Valida el sobre del acto de forma estricta (D1 del oráculo congelado):
     * sólo un acto tal como lo produce `createVisitAct`. Devuelve un mensaje
     * de rechazo o null si el sobre es válido.
     */
    function rejectInvalidAct(act) {
        if (act === null || typeof act !== 'object' || Array.isArray(act)) {
            return 'se requiere un acto de visita `reuma-visit-act/v1` producido por HubTools.reumaActContract.createVisitAct; se recibió ' + (act === null ? 'null' : Array.isArray(act) ? 'array' : typeof act) + '.';
        }
        if (Object.keys(act).sort().join('|') !== ENVELOPE_KEYS) {
            return 'el sobre del acto debe tener exactamente las claves { ok, contractVersion, kind, patientRef, pathology, payload } (sin claves extra ni faltantes): sólo un acto producido por createVisitAct es aceptable.';
        }
        if (act.ok !== true) {
            return 'el acto no es un resultado ok de createVisitAct (ok !== true); un acto rechazado por el contrato no se proyecta.';
        }
        if (act.contractVersion !== CONTRACT_VERSION) {
            return "contractVersion debe ser exactamente 'reuma-visit-act/v1'; no se admiten otras versiones ni normalización.";
        }
        if (!isSupportedToken(act.kind, SUPPORTED_KINDS)) {
            return "kind debe ser exactamente 'primera_visita' o 'seguimiento' (token del contrato, sin alias); se recibió " + (typeof act.kind) + '.';
        }
        if (!isSupportedToken(act.pathology, SUPPORTED_PATHOLOGIES)) {
            return "pathology debe ser un token exacto del contrato (espa | aps | ar | les | sjogren); se recibió " + (typeof act.pathology) + '.';
        }
        if (typeof act.patientRef !== 'string' || act.patientRef.trim().length === 0) {
            return 'patientRef debe ser un string explícito con al menos un carácter no blanco; no se infiere.';
        }
        if (act.payload === null || typeof act.payload !== 'object' || Array.isArray(act.payload)) {
            return 'payload debe ser un objeto explícito no-array (objeto del journey); se recibió ' + (act.payload === null ? 'null' : typeof act.payload) + '.';
        }
        return null;
    }

    /**
     * Proyecta un acto de visita v1 a la fila legacy a través de la frontera
     * F5.3. Nunca lanza: toda entrada incompatible produce un error tipado
     * estructurado y sin fila.
     */
    function projectVisitAct497(act) {
        try {
            var rejection = rejectInvalidAct(act);
            if (rejection !== null) {
                return fail('INVALID_ACT', 'Adaptador export Reuma: ' + rejection);
            }

            var boundary = HubTools.reumaExportBoundary;
            if (!boundary || typeof boundary !== 'object' || typeof boundary.generateLegacyRow497 !== 'function') {
                return fail('BOUNDARY_UNAVAILABLE', 'Adaptador export Reuma: la frontera de export (HubTools.reumaExportBoundary.generateLegacyRow497) no está disponible; no hay ruta de proyección y no se fabrica fila.');
            }

            var tipoVisita = TIPO_VISITA_BY_KIND[act.kind];

            var result;
            try {
                result = boundary.generateLegacyRow497({
                    datos: act.payload,
                    pathology: act.pathology,
                    tipoVisita: tipoVisita
                });
            } catch (error) {
                return fail('BOUNDARY_ERROR', 'Adaptador export Reuma: la frontera de export falló para ' + act.pathology + '/' + tipoVisita + ': ' + (error && error.message ? error.message : String(error)) + '.');
            }

            if (!result || typeof result !== 'object') {
                return fail('BOUNDARY_REJECTED', 'Adaptador export Reuma: la frontera de export devolvió un resultado no estructurado (' + (result === null ? 'null' : typeof result) + ').');
            }
            if (result.ok !== true) {
                // Propagación tipada: el código de la frontera se conserva
                // verbatim; la frontera ya decidió y no se reclasifica.
                var code = result.error && typeof result.error.code === 'string' && result.error.code.trim() !== ''
                    ? result.error.code
                    : 'BOUNDARY_REJECTED';
                var message = result.error && typeof result.error.message === 'string' && result.error.message !== ''
                    ? result.error.message
                    : 'la frontera de export rechazó la proyección sin mensaje.';
                return fail(code, message);
            }

            // Fidelidad verbatim del resultado de la frontera: la fila, los
            // campos y la metadata de transporte cruzan sin transformación.
            return {
                ok: true,
                row: result.row,
                fields: result.fields,
                meta: result.meta
            };
        } catch (error) {
            return fail('ADAPTER_ERROR', 'Adaptador export Reuma: error inesperado proyectando el acto de visita: ' + (error && error.message ? error.message : String(error)) + '.');
        }
    }

    HubTools.reumaLegacyExportAdapter = Object.freeze({
        projectVisitAct497: projectVisitAct497
    });

    console.log('✅ Módulo reuma_legacy_export_adapter cargado');
})();
