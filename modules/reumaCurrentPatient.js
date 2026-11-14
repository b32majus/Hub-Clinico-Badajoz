/**
 * reumaCurrentPatient.js - Paciente actual de Reuma (#940)
 *
 * Decisión de Sil (14-11): igual que Farmacia, un solo paciente a la vez.
 *   - El paciente actual vive en UNA entrada de sessionStorage (KEY);
 *     el CIP va en el VALOR, nunca en el nombre de la clave.
 *   - La dirección nunca lleva el CIP: las páginas navegan por el nombre
 *     del fichero y el paciente se resuelve al cargar (resolveOnLoad).
 *   - Al cambiar de paciente se borra lo del anterior (PATIENT_BOUND_KEYS).
 *   - F5 en el panel o en Seguimiento olvida al paciente (isReload);
 *     el Excel cargado (hubClinicoDB*) NO se toca.
 *   - Los enlaces antiguos con ?id= se aceptan una vez, se guardan y se
 *     limpian de la dirección.
 *
 * Namespace: HubTools.currentPatient (congelado).
 * Storage key (paciente actual): HubClinico_PacienteActual
 * Claves ligadas al paciente: HubClinico_PrebiologicoActual
 * Prefijo legado purgado: HubClinico_Prebiologic_ (entradas antiguas por CIP)
 */
(function () {
    'use strict';

    var KEY = 'HubClinico_PacienteActual';
    var PATIENT_BOUND_KEYS = ['HubClinico_PrebiologicoActual'];
    var LEGACY_PREFIX = 'HubClinico_Prebiologic_';
    var URL_PATIENT_PARAMS = ['id', 'patologia'];

    /**
     * Devuelve { id, patologia } del paciente actual o null
     * (JSON roto o sin id de texto no vacío). Nunca lanza.
     */
    function get() {
        try {
            var raw = sessionStorage.getItem(KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            var id = typeof parsed.id === 'string' ? parsed.id.trim() : '';
            if (!id) return null;
            return {
                id: id,
                patologia: typeof parsed.patologia === 'string' ? parsed.patologia : ''
            };
        } catch (e) {
            return null;
        }
    }

    /**
     * Borra la entrada del paciente actual y todo lo ligado a él.
     */
    function clear() {
        try {
            sessionStorage.removeItem(KEY);
        } catch (e) {}
        for (var i = 0; i < PATIENT_BOUND_KEYS.length; i++) {
            try {
                sessionStorage.removeItem(PATIENT_BOUND_KEYS[i]);
            } catch (e) {}
        }
    }

    /**
     * Guarda el paciente actual. id recortado; vacío no hace nada y
     * devuelve false. Si había otro paciente, borra antes sus entradas
     * ligadas (PATIENT_BOUND_KEYS). Devuelve true si escribió.
     */
    function set(id, patologia) {
        var trimmed = String(id === undefined || id === null ? '' : id).trim();
        if (!trimmed) return false;
        try {
            var current = get();
            if (current && current.id !== trimmed) {
                for (var i = 0; i < PATIENT_BOUND_KEYS.length; i++) {
                    sessionStorage.removeItem(PATIENT_BOUND_KEYS[i]);
                }
            }
            sessionStorage.setItem(KEY, JSON.stringify({
                id: trimmed,
                patologia: String(patologia || '')
            }));
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Borra de sessionStorage las claves antiguas por CIP
     * ('HubClinico_Prebiologic_<CIP>') usando una copia de las claves.
     */
    function purgeLegacy() {
        try {
            var keys = Object.keys(sessionStorage);
            for (var i = 0; i < keys.length; i++) {
                if (String(keys[i]).indexOf(LEGACY_PREFIX) === 0) {
                    sessionStorage.removeItem(keys[i]);
                }
            }
        } catch (e) {}
    }

    /**
     * true si la carga actual es una recarga (F5); si el navegador no
     * aporta la entrada de navegación, false.
     */
    function isReload() {
        try {
            var entries = performance.getEntriesByType('navigation');
            return !!(entries && entries[0] && entries[0].type === 'reload');
        } catch (e) {
            return false;
        }
    }

    /**
     * Quita id/patologia de la dirección sin recargar la página.
     */
    function dropPatientParamsFromUrl(params) {
        var changed = false;
        for (var i = 0; i < URL_PATIENT_PARAMS.length; i++) {
            if (params.has(URL_PATIENT_PARAMS[i])) {
                params.delete(URL_PATIENT_PARAMS[i]);
                changed = true;
            }
        }
        if (!changed) return;
        var resto = params.toString();
        history.replaceState(null, '', window.location.pathname + (resto ? '?' + resto : '') + window.location.hash);
    }

    var resolvedOnce = false;

    /**
     * Resolución ÚNICA por carga, para el panel y Seguimiento:
     *   1. purga las claves antiguas por CIP;
     *   2. lee id/patologia de la dirección;
     *   3. en recarga (F5) olvida al paciente y devuelve null;
     *   4. con ?id= (enlace antiguo) lo acepta una vez y lo guarda;
     *   5. limpia id/patologia de la dirección si estaban;
     *   6. devuelve get().
     */
    function resolveOnLoad() {
        if (resolvedOnce) return get();
        resolvedOnce = true;
        try {
            purgeLegacy();
            var params = new URLSearchParams(window.location.search);
            var hasUrlId = params.has('id');
            var urlId = (params.get('id') || '').trim();
            var urlPatologia = params.get('patologia') || '';
            // F5, o un enlace con ?id= vacío: se olvida el paciente (nunca el anterior).
            if (isReload() || (hasUrlId && !urlId)) {
                clear();
                dropPatientParamsFromUrl(params);
                return null;
            }
            if (urlId) {
                set(urlId, urlPatologia || '');
            }
            if (urlId || urlPatologia) {
                dropPatientParamsFromUrl(params);
            }
            var resolved = get();
            resolvedId = resolved ? resolved.id : null;
            return resolved;
        } catch (e) {
            return null;
        }
    }

    // Página restaurada desde bfcache («Atrás»/«Adelante»): si el paciente actual ya no es
    // el que mostraba, se vuelve a abrir la página para que muestre el actual (o ninguno).
    var resolvedId = null;
    try {
        window.addEventListener('pageshow', function (event) {
            if (!event || !event.persisted || !resolvedOnce) return;
            var now = get();
            var nowId = now ? now.id : null;
            if (nowId !== resolvedId) window.location.replace(window.location.pathname);
        });
    } catch (e) {}

    /**
     * Guarda el paciente y navega a la página por su nombre, sin
     * parámetros en la dirección.
     */
    function goTo(page, id, patologia) {
        // Si no se puede guardar el paciente nuevo, se olvida el anterior: la página
        // se abre vacía, nunca con otro paciente.
        if (!set(id, patologia)) clear();
        window.location.href = page;
    }

    window.HubTools = window.HubTools || {};
    window.HubTools.currentPatient = Object.freeze({
        KEY: KEY,
        PATIENT_BOUND_KEYS: Object.freeze(PATIENT_BOUND_KEYS.slice()),
        get: get,
        set: set,
        clear: clear,
        purgeLegacy: purgeLegacy,
        isReload: isReload,
        resolveOnLoad: resolveOnLoad,
        goTo: goTo
    });

    console.log('[reumaCurrentPatient] Paciente actual listo. HubTools.currentPatient disponible.');
})();
