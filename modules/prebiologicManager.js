/**
 * prebiologicManager.js - Módulo prebiológico transversal
 *
 * Gestión de estados prebiológicos (APTO, EN_CURSO, NO_APTO, NO_EVALUADO)
 * con persistencia en sessionStorage y badge HTML para vistas de paciente.
 *
 * Namespace: HubTools.prebiologic
 * Storage key: HubClinico_Prebiologic_<CIP>
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
     * Genera el HTML del badge prebiológico listo para insertar en la UI.
     *
     * @param {string} cip - Identificador CIP del paciente.
     * @returns {string} - HTML del span con el badge.
     */
    function getBadgeHTML(cip) {
        var status = getStatus(cip);
        var estado = (status && status.estado) ? status.estado : VALID_STATUSES.NO_EVALUADO;
        var fecha = (status && status.fechaValidacion) ? status.fechaValidacion : null;
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
    window.HubTools.prebiologic.VALID_STATUSES = VALID_STATUSES;
    window.HubTools.prebiologic.STORAGE_PREFIX = STORAGE_PREFIX;

    console.log('[prebiologicManager] Módulo prebiológico inicializado. HubTools.prebiologic disponible.');
})();
