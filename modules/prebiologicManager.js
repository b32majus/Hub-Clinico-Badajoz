/**
 * prebiologicManager.js - Módulo prebiológico transversal
 *
 * CONTRATO VIGENTE (WO-NEXUS-REUMA-T3, #445): el circuito prebiológico
 * principal expone DOS bloques independientes (Analítica y Medicina
 * Preventiva) y cada bloque admite exactamente tres estados:
 *   NO_SOLICITADA | SOLICITADA_PENDIENTE | OK
 *
 * Reglas del contrato:
 *   - OK sólo por selección profesional explícita o importación autorizada.
 *   - La presencia de resultados, fechas, vacunación, derivación o cualquier
 *     otro detalle NO convierte automáticamente un bloque en OK ni fabrica
 *     ningún otro estado.
 *   - No se sintetiza un estado global APTO aunque ambos bloques estén OK.
 *   - Estados ausentes/desconocidos permanecen vacíos (fail-safe).
 *
 * LEGADO (preservado, no autoridad para los nuevos estados):
 *   - El histórico ya persistido (Estado_Prebiologico_Final,
 *     Fecha_Validacion_Prebiologico y detalle de pruebas) NO se borra ni se
 *     migra destructivamente; sigue siendo legible mediante
 *     getPrebiologousStatusFromVisit/resolvePrebiologicStatus cuando exista
 *     una decisión explícita registrada. No hay mapeo heurístico de
 *     combinaciones legacy a OK.
 *   - sessionStorage: fallback temporal y compatibilidad para sesiones
 *     activas (HubClinico_Prebiologic_<CIP>).
 *
 * Namespace: HubTools.prebiologic
 * Storage key (fallback): HubClinico_Prebiologic_<CIP>
 */

(function () {
    'use strict';

    // ── Constantes ────────────────────────────────────────────────
    var STORAGE_PREFIX = 'HubClinico_Prebiologic_';

    var VALID_STATUSES = {
        APTO: 'APTO',
        EN_CURSO: 'EN_CURSO',
        NO_APTO: 'NO_APTO',
        NO_EVALUADO: 'NO_EVALUADO'
    };

    // Estados del contrato vigente por bloque (#445).
    var BLOCK_STATUSES = {
        NO_SOLICITADA: 'NO_SOLICITADA',
        SOLICITADA_PENDIENTE: 'SOLICITADA_PENDIENTE',
        OK: 'OK'
    };

    // Clases CSS reutilizadas (solo presentación; no implican validación).
    var BLOCK_BADGE_CLASSES = {};
    BLOCK_BADGE_CLASSES[BLOCK_STATUSES.NO_SOLICITADA] = 'badge-no-evaluado';
    BLOCK_BADGE_CLASSES[BLOCK_STATUSES.SOLICITADA_PENDIENTE] = 'badge-en-curso';
    BLOCK_BADGE_CLASSES[BLOCK_STATUSES.OK] = 'badge-apto';
    var BLOCK_BADGE_CLASS_UNKNOWN = 'badge-no-evaluado';

    // Bloques del contrato vigente: lectura EXCLUSIVAMENTE explícita.
    var BLOCKS = [
        {
            key: 'analitica',
            label: 'Analítica',
            fieldAliases: ['Estado_Prebiologico_Analitica', 'estadoPrebiologicoAnalitica']
        },
        {
            key: 'medicinaPreventiva',
            label: 'Medicina Preventiva',
            fieldAliases: ['Estado_Prebiologico_Medicina_Preventiva', 'estadoPrebiologicoMedicinaPreventiva']
        }
    ];

    // ── Helpers ───────────────────────────────────────────────────

    function isValidStatus(estado) {
        return Object.prototype.hasOwnProperty.call(VALID_STATUSES, estado);
    }

    function getStorageKey(cip) {
        return STORAGE_PREFIX + (cip || '').toString().trim();
    }

    function parseFromStorage(raw) {
        if (!raw) return null;
        try {
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || !parsed.cip) return null;
            return parsed;
        } catch (e) {
            return null;
        }
    }

    function normalizeStatus(rawStatus) {
        if (rawStatus === undefined || rawStatus === null) return '';
        var normalized = rawStatus.toString().trim().toUpperCase();
        if (!normalized || normalized === 'ND' || normalized === 'NA') return '';
        return isValidStatus(normalized) ? normalized : '';
    }

    function getVisitField(visit, aliases, fallback) {
        if (!visit || !aliases || !aliases.length) {
            return fallback !== undefined ? fallback : '';
        }
        for (var i = 0; i < aliases.length; i++) {
            var value = visit[aliases[i]];
            if (value !== undefined && value !== null && value !== '') {
                return value;
            }
        }
        return fallback !== undefined ? fallback : '';
    }

    function hasVisitField(visit, aliases) {
        if (!visit || !aliases || !aliases.length) return false;
        for (var i = 0; i < aliases.length; i++) {
            if (visit[aliases[i]] !== undefined && visit[aliases[i]] !== null && visit[aliases[i]] !== '') {
                return true;
            }
        }
        return false;
    }

    /**
     * Normaliza el estado de un bloque. Sólo acepta los tres estados del
     * contrato; cualquier valor ausente, vacío, ND/NA o no reconocido se
     * resuelve como cadena vacía (desconocido, fail-safe). Nunca fabrica
     * un estado a partir de otros campos.
     */
    function normalizeBlockState(rawStatus) {
        if (rawStatus === undefined || rawStatus === null) return '';
        var normalized = rawStatus.toString().trim().toUpperCase();
        if (!normalized || normalized === 'ND' || normalized === 'NA') return '';
        return Object.prototype.hasOwnProperty.call(BLOCK_STATUSES, normalized) ? normalized : '';
    }

    /**
     * Lee los estados de los dos bloques desde una visita/registro.
     * Sólo campos explícitos del bloque; ningún detalle legacy (resultados,
     * fechas, vacunación, derivación) puede producir OK o cualquier estado.
     */
    function getBlockStatesFromVisit(visit) {
        var result = {
            analitica: '',
            medicinaPreventiva: '',
            hasExplicitBlockState: false,
            source: 'none'
        };
        if (!visit || typeof visit !== 'object') return result;
        BLOCKS.forEach(function (block) {
            var state = normalizeBlockState(getVisitField(visit, block.fieldAliases, ''));
            result[block.key] = state;
            if (state) result.hasExplicitBlockState = true;
        });
        result.source = result.hasExplicitBlockState ? 'visit' : 'none';
        return result;
    }

    // ── API pública ───────────────────────────────────────────────

    /**
     * Guarda el estado prebiológico de un paciente en sessionStorage.
     *
     * @param {string} cip - Identificador CIP del paciente.
     * @param {string} estado - Uno de: APTO | EN_CURSO | NO_APTO | NO_EVALUADO.
     * @param {string} [fechaValidacion] - Fecha ISO de validación manual (si no se pasa, se usa ahora).
     * @param {string} [notasClinico] - Notas adicionales del clínico.
     * @returns {boolean} - true si se guardó correctamente.
     */
    function setStatus(cip, estado, fechaValidacion, notasClinico) {
        if (!cip) {
            console.warn('[prebiologicManager] setStatus: CIP requerido');
            return false;
        }

        if (!isValidStatus(estado)) {
            console.warn('[prebiologicManager] setStatus: estado inválido:', estado);
            return false;
        }

        var record = {
            cip: cip.toString().trim(),
            estado: estado,
            fechaValidacion: fechaValidacion || new Date().toISOString(),
            notasClinico: notasClinico || '',
            fechaRegistro: new Date().toISOString()
        };

        try {
            sessionStorage.setItem(getStorageKey(cip), JSON.stringify(record));
            console.log('[prebiologicManager] Estado guardado para CIP', cip, ':', estado);
            return true;
        } catch (e) {
            console.error('[prebiologicManager] Error guardando estado:', e);
            return false;
        }
    }

    /**
     * Recupera el estado prebiológico de un paciente.
     *
     * @param {string} cip - Identificador CIP del paciente.
     * @returns {object|null} - { cip, estado, fechaValidacion, notasClinico, fechaRegistro } o null si no existe.
     */
    function getStatus(cip) {
        if (!cip) return null;
        return parseFromStorage(sessionStorage.getItem(getStorageKey(cip)));
    }

    /**
     * Elimina el estado prebiológico de un paciente.
     *
     * @param {string} cip - Identificador CIP del paciente.
     */
    function clearStatus(cip) {
        if (!cip) return;
        sessionStorage.removeItem(getStorageKey(cip));
        console.log('[prebiologicManager] Estado eliminado para CIP', cip);
    }

    /**
     * Devuelve todos los registros prebiológicos almacenados en sessionStorage.
     *
     * @returns {Array<object>} - Array de registros { cip, estado, fechaValidacion, notasClinico, fechaRegistro }.
     */
    function getAllStatuses() {
        var results = [];
        for (var i = 0; i < sessionStorage.length; i++) {
            var key = sessionStorage.key(i);
            if (key && key.indexOf(STORAGE_PREFIX) === 0) {
                var record = parseFromStorage(sessionStorage.getItem(key));
                if (record) {
                    results.push(record);
                }
            }
        }
        return results;
    }

    /**
     * Comprueba si un paciente es APTO.
     *
     * @param {string} cip - Identificador CIP del paciente.
     * @returns {boolean}
     */
    function isApto(cip) {
        var status = getStatus(cip);
        return status !== null && status.estado === VALID_STATUSES.APTO;
    }

    /**
     * Resuelve el estado prebiológico LEGADO desde una visita clínica
     * persistida. Sólo reconoce una decisión explícita registrada
     * (Estado_Prebiologico_Final); ya NO infiere EN_CURSO a partir de
     * actividad en campos de detalle. Se conserva como lectura del histórico,
     * no como autoridad de los estados nuevos por bloque.
     *
     * @param {object} visit - Última visita clínica normalizada.
     * @returns {{status: string, validationDate: string, vaccinationOk: string, source: string, hasExplicitStatus: boolean, details: object}}
     */
    function getPrebiologicStatusFromVisit(visit) {
        if (!visit || typeof visit !== 'object') {
            return {
                status: VALID_STATUSES.NO_EVALUADO,
                validationDate: '',
                vaccinationOk: '',
                source: 'none',
                hasExplicitStatus: false,
                hasClinicalActivity: false,
                details: {}
            };
        }

        var details = {
            hemogramaCorrecto: getVisitField(visit, ['Hemograma_Correcto', 'hemogramaCorrecto'], ''),
            bioquimicaCorrecta: getVisitField(visit, ['Bioquimica_Correcta', 'bioquimicaCorrecta'], ''),
            serologiasCorrectas: getVisitField(visit, ['Serologias_Correctas', 'serologiasCorrectas'], ''),
            igraMantouxResultado: getVisitField(visit, ['IGRA_Mantoux_Resultado', 'igraMantouxResultado'], ''),
            rxToraxCorrecta: getVisitField(visit, ['Rx_Torax_Correcta', 'rxToraxCorrecta'], ''),
            vacunacionRevisada: getVisitField(visit, ['Vacunacion_Revisada', 'vacunacionRevisada'], ''),
            vacunacionOK: getVisitField(visit, ['Vacunacion_OK', 'vacunacionOK'], ''),
            medicinaPreventivaDerivada: getVisitField(visit, ['Medicina_Preventiva_Derivada', 'medicinaPreventivaDerivada'], ''),
            hemogramaSolicitado: getVisitField(visit, ['Hemograma_Solicitado', 'hemogramaSolicitado'], ''),
            hemogramaRecibido: getVisitField(visit, ['Hemograma_Recibido', 'hemogramaRecibido'], ''),
            bioquimicaSolicitada: getVisitField(visit, ['Bioquimica_Solicitada', 'bioquimicaSolicitada'], ''),
            bioquimicaRecibida: getVisitField(visit, ['Bioquimica_Recibida', 'bioquimicaRecibida'], ''),
            serologiasSolicitadas: getVisitField(visit, ['Serologias_Solicitadas', 'serologiasSolicitadas'], ''),
            serologiasRecibidas: getVisitField(visit, ['Serologias_Recibidas', 'serologiasRecibidas'], ''),
            igraMantouxSolicitado: getVisitField(visit, ['IGRA_Mantoux_Solicitado', 'igraMantouxSolicitado'], ''),
            igraMantouxRecibido: getVisitField(visit, ['IGRA_Mantoux_Recibido', 'igraMantouxRecibido'], ''),
            rxToraxSolicitada: getVisitField(visit, ['Rx_Torax_Solicitada', 'rxToraxSolicitada'], ''),
            rxToraxRecibida: getVisitField(visit, ['Rx_Torax_Recibida', 'rxToraxRecibida'], '')
        };

        var statusAliases = ['Estado_Prebiologico_Final', 'estadoPrebiologicoFinal'];
        var hasExplicitStatus = hasVisitField(visit, statusAliases);
        var manualStatus = normalizeStatus(getVisitField(visit, statusAliases, ''));
        var validationDate = getVisitField(visit, ['Fecha_Validacion_Prebiologico', 'fechaValidacionPrebiologico'], '');
        var status = VALID_STATUSES.NO_EVALUADO;

        if (manualStatus) {
            status = manualStatus;
        }

        return {
            status: status,
            validationDate: validationDate || '',
            vaccinationOk: details.vacunacionOK || '',
            source: 'visit',
            hasExplicitStatus: hasExplicitStatus,
            details: details
        };
    }

    function resolvePrebiologicStatus(cip, visit) {
        var visitStatus = getPrebiologicStatusFromVisit(visit);
        if (visitStatus.source === 'visit' && visitStatus.hasExplicitStatus) {
            return visitStatus;
        }

        var sessionStatus = getStatus(cip);
        if (sessionStatus && normalizeStatus(sessionStatus.estado)) {
            return {
                status: normalizeStatus(sessionStatus.estado),
                validationDate: sessionStatus.fechaValidacion || '',
                vaccinationOk: '',
                source: 'sessionStorage',
                details: {
                    notasClinico: sessionStatus.notasClinico || ''
                }
            };
        }

        return visitStatus.source === 'visit'
            ? visitStatus
            : {
                status: VALID_STATUSES.NO_EVALUADO,
                validationDate: '',
                vaccinationOk: '',
                source: 'none',
                details: {}
            };
    }

    /**
     * Genera el HTML de los badges prebiológicos del contrato vigente
     * (#445): un badge por bloque, mostrando únicamente estados explícitos.
     * No sintetiza ningún estado global (ni APTO) ni inventa validación.
     *
     * @param {string} cip - Identificador CIP del paciente.
     * @param {object} [visit] - Visita/registro con los campos explícitos de bloque.
     * @returns {string} - HTML de los badges de bloque.
     */
    function getBadgeHTML(cip, visit) {
        var blocks = getBlockStatesFromVisit(visit);
        return BLOCKS.map(function (block) {
            var state = blocks[block.key];
            var cssClass = state ? (BLOCK_BADGE_CLASSES[state] || BLOCK_BADGE_CLASS_UNKNOWN) : BLOCK_BADGE_CLASS_UNKNOWN;
            var text = block.label + ': ' + (state ? state.replace(/_/g, ' ') : 'sin estado');
            var title = 'Estado prebiológico ' + block.label + ': ' + (state || 'sin estado explícito');
            return '<span class="prebiologic-badge ' + cssClass + '" title="' + title + '">' + text + '</span>';
        }).join(' ');
    }

    // ── Exponer en HubTools ───────────────────────────────────────

    window.HubTools = window.HubTools || {};
    window.HubTools.prebiologic = window.HubTools.prebiologic || {};

    window.HubTools.prebiologic.setStatus = setStatus;
    window.HubTools.prebiologic.getStatus = getStatus;
    window.HubTools.prebiologic.clearStatus = clearStatus;
    window.HubTools.prebiologic.getAllStatuses = getAllStatuses;
    window.HubTools.prebiologic.isApto = isApto;
    window.HubTools.prebiologic.getBadgeHTML = getBadgeHTML;
    window.HubTools.prebiologic.getPrebiologicStatusFromVisit = getPrebiologicStatusFromVisit;
    window.HubTools.prebiologic.resolvePrebiologicStatus = resolvePrebiologicStatus;
    window.HubTools.prebiologic.BLOCK_STATUSES = BLOCK_STATUSES;
    window.HubTools.prebiologic.BLOCKS = BLOCKS;
    window.HubTools.prebiologic.normalizeBlockState = normalizeBlockState;
    window.HubTools.prebiologic.getBlockStatesFromVisit = getBlockStatesFromVisit;
    window.HubTools.prebiologic.VALID_STATUSES = VALID_STATUSES;
    window.HubTools.prebiologic.STORAGE_PREFIX = STORAGE_PREFIX;

    console.log('[prebiologicManager] Módulo prebiológico inicializado. HubTools.prebiologic disponible.');
})();
