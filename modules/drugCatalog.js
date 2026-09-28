/**
 * drugCatalog.js — read-only search seam over the published pharmacological
 * catalogue already versioned in the repository
 * (`data/catalogos/farmacia/hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx`).
 *
 * Scope (TRAIN-NEXUS-CLINICAL-SAFETY-REUMA-06 / tickets #444 + #447):
 *  - the catalogue may only identify/select a medicine name;
 *  - it NEVER returns or writes dose, route, schedule, presentation, induction,
 *    duration, therapeutic line, switch/add-on, renewal or validation outcome;
 *  - it is fail-safe: without a loaded catalogue `search()` returns nothing and
 *    the UI must not invent options;
 *  - category-scoped search: medication controls MUST pass their declared
 *    category explicitly (`search(query, category)`). Membership comes only
 *    from the explicit versioned source
 *    `data/catalogos/reuma/reuma_medication_categories.v1.json` and is joined
 *    deterministically at load time (exact normalized name-prefix keys declared
 *    in that file). Category is never inferred at runtime from name, dose,
 *    route, presentation, context or history. An unknown category, a missing
 *    classification source or an empty category returns nothing (fail closed:
 *    no unrestricted fallback). The unscoped `search(query)` form is preserved
 *    only as the frozen #444 oracle contract and MUST NOT be used by any
 *    medication control.
 *
 * This is a small, non-inferring seam. It deliberately does not reuse the
 * richer Farmacia adapter (which owns therapeutic proposal semantics that are
 * forbidden for Reuma) and it does not depend on any future CIMA refresh
 * mechanism: it only consumes the files that are already published.
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
    var CATEGORIES_PATH = 'data/catalogos/reuma/reuma_medication_categories.v1.json';
    var EXPECTED_CATEGORIES = ['Sistemicos', 'FAMEs', 'Biologicos'];
    var MIN_QUERY = 2;
    var MAX_RESULTS = 15;

    var state = 'idle';
    var stateMessage = 'Catálogo farmacológico: pendiente de carga.';
    var drugs = [];
    var counts = { cima: 0, local: 0 };
    var categoriesState = 'idle';
    var categoriesData = null;
    var categoryCounts = {};

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

    /**
     * Validates the explicit versioned category source. Strict and fail-closed:
     * exactly the three expected categories, each with string arrays
     * `catalogue_tokens` (declared join keys against the published catalogue)
     * and `explicit_entries` (identity-only names the catalogue does not
     * contain). Anything else is rejected, never silently tolerated.
     */
    function parseCategories(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error('drugCategories: fuente de categorías inválida.');
        }
        if (typeof data.version !== 'string' || !data.version.trim()) {
            throw new Error('drugCategories: versión de la fuente de categorías ausente.');
        }
        var categories = data.categories;
        if (!categories || typeof categories !== 'object' || Array.isArray(categories)) {
            throw new Error('drugCategories: objeto categories ausente.');
        }
        var keys = Object.keys(categories).sort();
        var expected = EXPECTED_CATEGORIES.slice().sort();
        if (keys.length !== expected.length || keys.join('\u001f') !== expected.join('\u001f')) {
            throw new Error('drugCategories: las categorías declaradas no son exactamente ' + EXPECTED_CATEGORIES.join(' / ') + '.');
        }
        EXPECTED_CATEGORIES.forEach(function (category) {
            var definition = categories[category];
            if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
                throw new Error('drugCategories: definición inválida para ' + category + '.');
            }
            ['catalogue_tokens', 'explicit_entries'].forEach(function (field) {
                if (!Array.isArray(definition[field])) {
                    throw new Error('drugCategories: ' + field + ' de ' + category + ' debe ser un array.');
                }
                definition[field].forEach(function (value) {
                    if (typeof value !== 'string') {
                        throw new Error('drugCategories: ' + field + ' de ' + category + ' contiene un valor no textual.');
                    }
                });
            });
        });
        return data;
    }

    /**
     * Deterministic load-time join of the declared membership to the parsed
     * catalogue entries. This is the ONLY place category membership is
     * computed: it joins the explicit versioned keys declared in the category
     * source, it never classifies by name/dose/route/context heuristics.
     * Identity-only explicit entries from the category source are appended so
     * declared members missing from the published hospital catalogue remain
     * available without inventing therapeutic data.
     */
    function recomputeMembership() {
        if (state !== 'loaded' || categoriesState !== 'loaded' || !categoriesData) return;
        var categories = categoriesData.categories;
        drugs = drugs.filter(function (drug) { return !drug.explicitCategoryEntry; });
        drugs.forEach(function (drug) { drug.categories = []; });
        categoryCounts = {};
        EXPECTED_CATEGORIES.forEach(function (category) {
            var tokens = categories[category].catalogue_tokens.map(normalizeText).filter(Boolean);
            var joined = 0;
            drugs.forEach(function (drug) {
                for (var i = 0; i < tokens.length; i++) {
                    if (drug.search.indexOf(tokens[i]) === 0) {
                        drug.categories.push(category);
                        joined++;
                        break;
                    }
                }
            });
            var explicit = 0;
            categories[category].explicit_entries.forEach(function (name) {
                var cleanName = String(name === undefined || name === null ? '' : name).trim();
                if (!cleanName) return;
                var canonical = normalizeText(category + '\u001f' + cleanName);
                drugs.push({
                    id: 'REUMACAT:AUTO-' + stableHash(canonical) + '-' + canonical.length,
                    name: cleanName,
                    search: normalizeText(cleanName),
                    categories: [category],
                    explicitCategoryEntry: true
                });
                explicit++;
            });
            categoryCounts[category] = joined + explicit;
        });
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
        state = 'loaded';
        stateMessage = 'Catálogo farmacológico cargado: ' + drugs.length + ' fármacos.';
        recomputeMembership();
        emit();
        return { total: drugs.length, cima: counts.cima, local: counts.local };
    }

    function loadCategories(data) {
        var parsed = parseCategories(data);
        categoriesData = parsed;
        categoriesState = 'loaded';
        recomputeMembership();
        if (state === 'loaded') emit();
        return { version: parsed.version, categories: Object.keys(parsed.categories), counts: getCategoryCounts() };
    }

    function failCategories() {
        categoriesState = 'missing';
        categoriesData = null;
        categoryCounts = {};
        if (state === 'loaded') emit();
    }

    function getCategoryCounts() {
        var copy = {};
        Object.keys(categoryCounts).forEach(function (key) { copy[key] = categoryCounts[key]; });
        return copy;
    }

    function fail(nextState, message) {
        drugs = [];
        counts = { cima: 0, local: 0 };
        categoryCounts = {};
        setState(nextState, message);
    }

    function searchUnscoped(query) {
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

    /**
     * Search over the loaded catalogue. With an explicit `category` (the ONLY
     * supported form for medication controls) results are restricted to that
     * category's explicit membership: unknown category, missing classification
     * source or empty category returns nothing — never the full catalogue.
     * The unscoped form `search(query)` exists only for the frozen #444 oracle
     * contract and must not be used by medication controls.
     */
    function search(query, category) {
        if (state !== 'loaded') return [];
        // Only a 1-arg call keeps the frozen #444 unscoped oracle contract;
        // any explicit-but-unknown/empty category fails closed.
        if (category === undefined) return searchUnscoped(query);
        if (category === null || String(category).trim() === '') return [];
        if (categoriesState !== 'loaded' || !categoriesData) return [];
        var categories = categoriesData.categories;
        if (!Object.prototype.hasOwnProperty.call(categories, category)) return [];
        var q = normalizeText(query);
        if (q.length < MIN_QUERY) return [];
        var out = [];
        for (var i = 0; i < drugs.length && out.length < MAX_RESULTS; i++) {
            if (drugs[i].categories && drugs[i].categories.indexOf(category) !== -1 && drugs[i].search.indexOf(q) !== -1) {
                out.push({ id: drugs[i].id, name: drugs[i].name });
            }
        }
        return out;
    }

    function getState() {
        return {
            state: state,
            message: stateMessage,
            // `ready` keeps the frozen #444 semantics (workbook loaded); the
            // classification availability is reported separately so medication
            // controls can fail closed on their own category contract.
            ready: state === 'loaded',
            total: drugs.length,
            cima: counts.cima,
            local: counts.local,
            categoriesState: categoriesState,
            categoriesLoaded: categoriesState === 'loaded',
            categoryCounts: getCategoryCounts()
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
        autoLoadCategories();
    }

    function autoLoadCategories() {
        if (categoriesState === 'loaded' || categoriesState === 'loading') return;
        categoriesState = 'loading';
        if (typeof fetch !== 'function') {
            failCategories();
            return;
        }
        fetch(CATEGORIES_PATH)
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(function (data) {
                try {
                    loadCategories(data);
                } catch (error) {
                    failCategories();
                }
            })
            .catch(function () {
                failCategories();
            });
    }

    HubTools.catalog = {
        CATALOG_PATH: CATALOG_PATH,
        CATEGORIES_PATH: CATEGORIES_PATH,
        EXPECTED_CATEGORIES: EXPECTED_CATEGORIES,
        MIN_QUERY: MIN_QUERY,
        MAX_RESULTS: MAX_RESULTS,
        normalizeText: normalizeText,
        parseWorkbook: parseWorkbook,
        parseCategories: parseCategories,
        loadFromWorkbook: loadFromWorkbook,
        loadCategories: loadCategories,
        failCategories: failCategories,
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
