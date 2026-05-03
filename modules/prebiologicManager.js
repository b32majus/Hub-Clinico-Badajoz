/**
 * prebiologicManager.js - Módulo prebiológico transversal
 *
 * Gestión de estados prebiológicos (APTO, EN_CURSO, NO_APTO, NO_EVALUADO)
 * con badge HTML para vistas de paciente.
 *
 * Fuente primaria de datos: bloque prebiológico/vacunación embebido
 * en cada hoja de patología/visita del Excel maestro (persistencia real).
 *
 * sessionStorage: fallback temporal y compatibilidad para sesiones activas.
 * Se pierde al limpiar navegador, pero el dato persiste en la hoja Excel.
 *
 * Namespace: HubTools.prebiologic
 * Storage key (fallback): HubClinico_Prebiologic_<CIP>
 *
 * Estados permitidos: APTO | EN_CURSO | NO_APTO | NO_EVALUADO
 * Fecha de validación: manual, decidida por el clínico.
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

    var BADGE_CLASSES = {};
    BADGE_CLASSES[VALID_STATUSES.APTO] = 'badge-apto';
    BADGE_CLASSES[VALID_STATUSES.EN_CURSO] = 'badge-en-curso';
    BADGE_CLASSES[VALID_STATUSES.NO_APTO] = 'badge-no-apto';
    BADGE_CLASSES[VALID_STATUSES.NO_EVALUADO] = 'badge-no-evaluado';

    // ── Helpers ───────────────────────────────────────────────────

    function isValidStatus(estado) {
        return Object.prototype.hasOwnProperty.call(VALID_STATUSES, estado);
    }

    function formatShortDate(isoString) {
        if (!isoString) return '';
        try {
            var date = new Date(isoString);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return '';
        }
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

    function hasClinicalContent(value) {
        if (value === undefined || value === null) return false;
        var normalized = value.toString().trim().toUpperCase();
        if (!normalized) return false;
        return normalized !== 'ND' && normalized !== 'NA' && normalized !== 'NO_EVALUADO';
    }

    function inferInProgress(details) {
        if (!details) return false;
        var keys = [
            'hemogramaSolicitado', 'hemogramaRecibido', 'hemogramaCorrecto',
            'bioquimicaSolicitada', 'bioquimicaRecibida', 'bioquimicaCorrecta',
            'serologiasSolicitadas', 'serologiasRecibidas', 'serologiasCorrectas',
            'igraMantouxSolicitado', 'igraMantouxRecibido', 'igraMantouxResultado',
            'rxToraxSolicitada', 'rxToraxRecibida', 'rxToraxCorrecta',
            'vacunacionRevisada', 'vacunacionOK',
            'medicinaPreventivaDerivada'
        ];
        for (var i = 0; i < keys.length; i++) {
            if (hasClinicalContent(details[keys[i]])) return true;
        }
        return false;
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
     * Resuelve estado prebiológico desde una visita clínica persistida.
     * Prioriza la decisión manual y, si no existe, infiere EN_CURSO si hay actividad.
     *
     * @param {object} visit - Última visita clínica normalizada.
     * @returns {{status: string, validationDate: string, vaccinationOk: string, source: string, details: object}}
     */
    function getPrebiologicStatusFromVisit(visit) {
        if (!visit || typeof visit !== 'object') {
            return {
                status: VALID_STATUSES.NO_EVALUADO,
                validationDate: '',
                vaccinationOk: '',
                source: 'none',
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

        var manualStatus = normalizeStatus(getVisitField(visit, ['Estado_Prebiologico_Final', 'estadoPrebiologicoFinal'], ''));
        var validationDate = getVisitField(visit, ['Fecha_Validacion_Prebiologico', 'fechaValidacionPrebiologico'], '');
        var status = VALID_STATUSES.NO_EVALUADO;

        if (manualStatus) {
            status = manualStatus;
        } else if (inferInProgress(details)) {
            status = VALID_STATUSES.EN_CURSO;
        }

        return {
            status: status,
            validationDate: validationDate || '',
            vaccinationOk: details.vacunacionOK || '',
            source: 'visit',
            details: details
        };
    }

    function resolvePrebiologicStatus(cip, visit) {
        var visitStatus = getPrebiologicStatusFromVisit(visit);
        if (visitStatus.source === 'visit' && visitStatus.status !== VALID_STATUSES.NO_EVALUADO) {
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
     * Genera el HTML del badge prebiológico listo para insertar en la UI.
     *
     * @param {string} cip - Identificador CIP del paciente.
     * @returns {string} - HTML del span con el badge.
     */
    function getBadgeHTML(cip, visit) {
        var resolved = resolvePrebiologicStatus(cip, visit);
        var estado = resolved.status || VALID_STATUSES.NO_EVALUADO;
        var fecha = resolved.validationDate || null;
        var cssClass = BADGE_CLASSES[estado] || BADGE_CLASSES[VALID_STATUSES.NO_EVALUADO];

        var shortDate = formatShortDate(fecha);
        var text = 'Prebiólogo: ' + estado.replace(/_/g, ' ');
        if (shortDate) {
            text += ' · ' + shortDate;
        }

        return '<span class="prebiologic-badge ' + cssClass + '" title="Estado prebiológico: ' + estado + (shortDate ? ' (validado ' + shortDate + ')' : '') + '">' + text + '</span>';
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
    window.HubTools.prebiologic.VALID_STATUSES = VALID_STATUSES;
    window.HubTools.prebiologic.STORAGE_PREFIX = STORAGE_PREFIX;

    console.log('[prebiologicManager] Módulo prebiológico inicializado. HubTools.prebiologic disponible.');
})();
