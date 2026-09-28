/**
 * drugCatalog.js — read-only search seam over the published pharmacological
 * catalogue already versioned in the repository
 * (`data/catalogos/farmacia/hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx`).
 *
 * Scope (TRAIN-NEXUS-CLINICAL-SAFETY-REUMA-06 / ticket #444, SIL-REV-016):
 *  - the catalogue may only identify/select a medicine name;
 *  - it NEVER returns or writes dose, route, schedule, presentation, induction,
 *    duration, therapeutic line, switch/add-on, renewal or validation outcome;
 *  - it is fail-safe: without a loaded catalogue `search()` returns nothing and
 *    the UI must not invent options.
 *
 * This is a small, non-inferring seam. It deliberately does not reuse the
 * richer Farmacia adapter (which owns therapeutic proposal semantics that are
 * forbidden for Reuma) and it does not depend on any future CIMA refresh
 * mechanism: it only consumes the file that is already published.
 *
 * Namespace: HubTools.catalog
 */
(function () {
    'use strict';

    if (typeof HubTools === 'undefined') {
        console.error('drugCatalog.js: HubTools namespace no encontrado.');
        return;
    }

    HubTools.catalog = HubTools.catalog || {};

    var CATALOG_PATH = 'data/catalogos/farmacia/hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx';
    var CIMA_SHEET = 'CATALOGO_CIMA';
    var LOCAL_SHEET = 'CATALOGO_LOCAL_ESPECIAL';
    var MIN_QUERY = 2;
    var MAX_RESULTS = 15;

    var state = 'idle';
    var stateMessage = 'Catálogo farmacológico: pendiente de carga.';
    var drugs = [];
    var counts = { cima: 0, local: 0 };

    function normalizeText(value) {
        return String(value === undefined || value === null ? '' : value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function stableHash(text) {
        var hash = 2166136261;
        for (var i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).padStart(8, '0');
    }

    /**
     * Builds an identity-only catalogue entry. `searchParts` feed the search
     * index (active ingredient, codes) but are never returned to callers.
     */
    function buildEntry(sourceType, nativeId, name, searchParts) {
        var cleanName = String(name === undefined || name === null ? '' : name).trim();
        if (!cleanName) return null;
        var id = nativeId === undefined || nativeId === null ? '' : String(nativeId).trim();
        if (!id) {
            var canonical = normalizeText([sourceType, cleanName].join('\u001f'));
            id = sourceType + '-AUTO-' + stableHash(canonical) + '-' + canonical.length;
        }
        return {
            id: sourceType + ':' + id,
            name: cleanName,
            search: normalizeText([cleanName].concat(searchParts || []).join(' '))
        };
    }

    function parseWorkbook(workbook) {
        if (!workbook || !workbook.Sheets) {
            throw new Error('drugCatalog: workbook inválido.');
        }
        if (typeof XLSX === 'undefined' || !XLSX.utils || typeof XLSX.utils.sheet_to_json !== 'function') {
            throw new Error('drugCatalog: SheetJS (XLSX) no disponible.');
        }
        var cimaSheet = workbook.Sheets[CIMA_SHEET];
        var localSheet = workbook.Sheets[LOCAL_SHEET];
        if (!cimaSheet || !localSheet) {
            throw new Error('drugCatalog: faltan las hojas ' + CIMA_SHEET + ' / ' + LOCAL_SHEET + '.');
        }
        var cimaRows = XLSX.utils.sheet_to_json(cimaSheet, { defval: '' });
        var localRows = XLSX.utils.sheet_to_json(localSheet, { defval: '' });
        var next = [];
        cimaRows.forEach(function (row) {
            var entry = buildEntry(
                'CIMA',
                row.drug_source_id || row.codigo_nacional,
                row.nombre_comercial || row.nombre_presentacion,
                [row.principio_activo, row.codigo_nacional, row.nregistro]
            );
            if (entry) next.push(entry);
        });
        var cimaCount = next.length;
        localRows.forEach(function (row) {
            var entry = buildEntry(
                'LOCAL',
                row.local_drug_id,
                row.display_name || row.nombre_comercial_si_existe,
                [row.principio_activo_o_molecula]
            );
            if (entry) next.push(entry);
        });
        return { drugs: next, cima: cimaCount, local: next.length - cimaCount };
    }

    function emit() {
        if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function') {
            var detail = getState();
            document.dispatchEvent(new CustomEvent('hubcatalog:changed', { detail: detail }));
        }
    }

    function setState(nextState, message, nextDrugs, nextCounts) {
        state = nextState;
        stateMessage = message;
        if (nextDrugs) drugs = nextDrugs;
        if (nextCounts) counts = nextCounts;
        emit();
    }

    function loadFromWorkbook(workbook) {
        var parsed = parseWorkbook(workbook);
        drugs = parsed.drugs;
        counts = { cima: parsed.cima, local: parsed.local };
        setState('loaded', 'Catálogo farmacológico cargado: ' + drugs.length + ' fármacos.');
        return { total: drugs.length, cima: counts.cima, local: counts.local };
    }

    function fail(nextState, message) {
        drugs = [];
        counts = { cima: 0, local: 0 };
        setState(nextState, message);
    }

    function search(query) {
        if (state !== 'loaded') return [];
        var q = normalizeText(query);
        if (q.length < MIN_QUERY) return [];
        var out = [];
        for (var i = 0; i < drugs.length && out.length < MAX_RESULTS; i++) {
            if (drugs[i].search.indexOf(q) !== -1) {
                out.push({ id: drugs[i].id, name: drugs[i].name });
            }
        }
        return out;
    }

    function getState() {
        return {
            state: state,
            message: stateMessage,
            ready: state === 'loaded',
            total: drugs.length,
            cima: counts.cima,
            local: counts.local
        };
    }

    function isLoaded() {
        return state === 'loaded';
    }

    function isUnavailable() {
        return state === 'missing' || state === 'error';
    }

    function ensureXLSX(callback, onError) {
        if (typeof XLSX !== 'undefined') {
            callback();
            return;
        }
        if (typeof document === 'undefined') {
            if (onError) onError('SheetJS no disponible.');
            return;
        }
        var script = document.createElement('script');
        script.src = 'vendor/sheetjs/xlsx.full.min.js';
        script.onload = callback;
        script.onerror = function () {
            if (onError) onError('No se pudo cargar SheetJS.');
        };
        document.head.appendChild(script);
    }

    function autoLoad() {
        if (state === 'loaded' || state === 'loading') return;
        setState('loading', 'Catálogo farmacológico: cargando…');
        ensureXLSX(function () {
            if (typeof fetch !== 'function') {
                fail('missing', 'Catálogo farmacológico no disponible.');
                return;
            }
            fetch(CATALOG_PATH)
                .then(function (response) {
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    return response.arrayBuffer();
                })
                .then(function (buffer) {
                    try {
                        var workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
                        loadFromWorkbook(workbook);
                    } catch (error) {
                        fail('missing', 'Catálogo farmacológico no disponible.');
                    }
                })
                .catch(function () {
                    fail('missing', 'Catálogo farmacológico no disponible.');
                });
        }, function () {
            fail('error', 'Catálogo farmacológico no disponible.');
        });
    }

    HubTools.catalog = {
        CATALOG_PATH: CATALOG_PATH,
        MIN_QUERY: MIN_QUERY,
        MAX_RESULTS: MAX_RESULTS,
        normalizeText: normalizeText,
        parseWorkbook: parseWorkbook,
        loadFromWorkbook: loadFromWorkbook,
        search: search,
        getState: getState,
        isLoaded: isLoaded,
        isUnavailable: isUnavailable,
        autoLoad: autoLoad
    };

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { autoLoad(); });
        } else {
            autoLoad();
        }
    }
})();
