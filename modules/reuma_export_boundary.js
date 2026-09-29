/**
 * Frontera de compatibilidad del export Reuma de 497 columnas (F5.3, #457).
 *
 * Ownership: este módulo es el ÚNICO punto por el que un consumidor Reuma
 * debe obtener una fila legacy de 497 columnas TSV. El writer legacy
 * (los generadores `generarFilaCSV_*` de `modules/exportManager.js`) sigue
 * siendo el productor y no cambia; esta frontera:
 *   1. resuelve el generador legacy correspondiente a la selección explícita
 *      de journey soportado (patología × tipo de visita);
 *   2. invoca el generador con el payload explícito sin mutarlo;
 *   3. valida el resultado ANTES de dejarlo cruzar: debe ser un string
 *      tabulado con exactamente FINAL_V2_EXPORT_COLUMN_COUNT campos;
 *   4. falla cerrado con error tipado si el shape es incompatible: nunca
 *      trunca, rellena, oculta ni infiere campos.
 *
 * Contrato de `generateLegacyRow497(request)`:
 *   - request: { datos, pathology, tipoVisita }
 *     · datos: payload explícito ya producido por el journey (no se muta);
 *     · pathology: token de patología ya normalizado por el consumidor
 *       (espa | aps | ar | les | sjogren);
 *     · tipoVisita: 'primera' | 'seguimiento'.
 *   - resultado ok: { ok: true, row, fields, meta } donde `row` es
 *     byte-equivalente a la fila del generator legacy para el mismo payload.
 *   - resultado no-ok: { ok: false, error: { code, message } } con codes:
 *     INVALID_REQUEST | UNSUPPORTED_JOURNEY | GENERATOR_UNAVAILABLE |
 *     COLUMN_CONTRACT_UNAVAILABLE | GENERATOR_ERROR | ROW_NOT_STRING |
 *     ROW_LENGTH_INVALID.
 *
 * KNOWN_LEGACY (docs/engineering/REUMA_EXPORT_KNOWN_LEGACY.md): esta frontera
 * NO corrige defectos caracterizados del writer legacy (warn-only de longitud,
 * colapsos false-vs-missing, lecturas `datos.X || ''`). Solo impide que un
 * shape incompatible cruce la nueva ruta.
 */
(function () {
    'use strict';

    if (typeof window === 'undefined' || !window.HubTools) {
        console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js antes de reuma_export_boundary.js.');
        return;
    }

    var HubTools = window.HubTools;

    // Journeys soportados (A1): 5 patologías × 2 tipos de visita. El token de
    // generador y la hoja Excel de destino son metadata de transporte; la
    // generación sigue siendo exclusivamente del writer legacy.
    var SUPPORTED_JOURNEYS = {
        espa: {
            sheet: 'ESPA',
            generators: { primera: 'generarFilaCSV_EspA_PrimeraVisita', seguimiento: 'generarFilaCSV_EspA_Seguimiento' }
        },
        aps: {
            sheet: 'APS',
            generators: { primera: 'generarFilaCSV_APs_PrimeraVisita', seguimiento: 'generarFilaCSV_APs_Seguimiento' }
        },
        ar: {
            sheet: 'AR',
            generators: { primera: 'generarFilaCSV_AR_PrimeraVisita', seguimiento: 'generarFilaCSV_AR_Seguimiento' }
        },
        les: {
            sheet: 'LES',
            generators: { primera: 'generarFilaCSV_LES_PrimeraVisita', seguimiento: 'generarFilaCSV_LES_Seguimiento' }
        },
        sjogren: {
            sheet: 'SJOGREN',
            generators: { primera: 'generarFilaCSV_SJOGREN_PrimeraVisita', seguimiento: 'generarFilaCSV_SJOGREN_Seguimiento' }
        }
    };

    var SUPPORTED_VISIT_TYPES = ['primera', 'seguimiento'];

    function boundaryError(code, message) {
        return Object.freeze({ ok: false, error: Object.freeze({ code: code, message: message }) });
    }

    function normalizeToken(value) {
        return typeof value === 'string' ? value.trim().toLowerCase() : '';
    }

    /**
     * Genera la fila legacy de 497 columnas para un journey soportado y la
     * valida antes de exponerla. Fail-closed: sin fila válida de 497 campos
     * no hay fila. No muta `request` ni `request.datos`.
     */
    function generateLegacyRow497(request) {
        if (!request || typeof request !== 'object' || Array.isArray(request)) {
            return boundaryError('INVALID_REQUEST', 'Frontera export Reuma: se requiere request { datos, pathology, tipoVisita }.');
        }
        var datos = request.datos;
        if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
            return boundaryError('INVALID_REQUEST', 'Frontera export Reuma: el payload `datos` debe ser un objeto explícito del journey.');
        }
        var pathology = normalizeToken(request.pathology);
        var tipoVisita = normalizeToken(request.tipoVisita);
        if (SUPPORTED_VISIT_TYPES.indexOf(tipoVisita) === -1) {
            return boundaryError('UNSUPPORTED_JOURNEY', 'Frontera export Reuma: tipo de visita no soportado: ' + String(request.tipoVisita) + '.');
        }
        var journey = SUPPORTED_JOURNEYS[pathology];
        if (!journey) {
            return boundaryError('UNSUPPORTED_JOURNEY', 'Frontera export Reuma: patología no soportada: ' + String(request.pathology) + '.');
        }

        var exportSurface = HubTools.export || null;
        var generatorName = journey.generators[tipoVisita];
        var generator = exportSurface ? exportSurface[generatorName] : undefined;
        if (typeof generator !== 'function') {
            return boundaryError('GENERATOR_UNAVAILABLE', 'Frontera export Reuma: el generador legacy no está disponible: ' + generatorName + '.');
        }
        var expectedColumns = exportSurface.FINAL_V2_EXPORT_COLUMN_COUNT;
        if (typeof expectedColumns !== 'number' || !isFinite(expectedColumns) || expectedColumns <= 0) {
            return boundaryError('COLUMN_CONTRACT_UNAVAILABLE', 'Frontera export Reuma: FINAL_V2_EXPORT_COLUMN_COUNT no disponible.');
        }

        var row;
        try {
            row = generator(datos, tipoVisita);
        } catch (error) {
            return boundaryError('GENERATOR_ERROR', 'Frontera export Reuma: el generador legacy falló para ' + pathology + '/' + tipoVisita + ': ' + (error && error.message ? error.message : String(error)));
        }

        if (typeof row !== 'string') {
            return boundaryError('ROW_NOT_STRING', 'Frontera export Reuma: el generador legacy produjo una fila no string (' + typeof row + ') para ' + pathology + '/' + tipoVisita + '.');
        }
        var fields = row.split('\t');
        if (fields.length !== expectedColumns) {
            return boundaryError('ROW_LENGTH_INVALID', 'Frontera export Reuma: shape incompatible para ' + pathology + '/' + tipoVisita + ': se esperaban ' + expectedColumns + ' campos y se generaron ' + fields.length + '. No se trunca, rellena ni infiere.');
        }

        return Object.freeze({
            ok: true,
            row: row,
            fields: Object.freeze(fields),
            meta: Object.freeze({
                pathology: pathology,
                tipoVisita: tipoVisita,
                sheet: journey.sheet,
                generatorName: generatorName,
                columnCount: fields.length
            })
        });
    }

    HubTools.reumaExportBoundary = Object.freeze({
        BOUNDARY_VERSION: 'reuma-export-boundary-v1',
        SUPPORTED_JOURNEYS: Object.keys(SUPPORTED_JOURNEYS),
        SUPPORTED_VISIT_TYPES: SUPPORTED_VISIT_TYPES.slice(),
        generateLegacyRow497: generateLegacyRow497
    });

    console.log('✅ Módulo reuma_export_boundary cargado');
})();
