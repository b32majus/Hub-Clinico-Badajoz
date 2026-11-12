/**
 * cimaSearch.js — live drug search against the AEMPS CIMA REST API for the
 * Reuma medication fields, with the published catalogue as fallback.
 *
 * Decision (Sil, 12-11):
 *  - searches live against the CIMA REST API by commercial name (`nombre`)
 *    AND active ingredient (`practiv1`), in parallel, deduplicated by
 *    registration number (`nregistro`);
 *  - if the AEMPS does not answer (network error, abort/timeout, non-2xx or
 *    invalid JSON), falls back to the published catalogue
 *    (`HubTools.catalog`, unscoped single-argument search) and the UI reports
 *    it; an EMPTY valid AEMPS response does NOT fall back to the catalogue;
 *  - no category filter: any medicine can be offered in any field;
 *  - to the AEMPS goes ONLY the searched text (no patient, clinical or
 *    session data, no extra parameters or headers); results carry identity
 *    only: the medicine name is stored, never dose, route, schedule,
 *    presentation or any other therapeutic data.
 *
 * `search(query)` resolves `{ source, results }` and NEVER rejects:
 *   source is 'aemps' | 'local' | 'none', results are `[{ id, name }]`.
 *
 * Namespace: HubTools.cimaSearch
 */
(function () {
    'use strict';

    if (typeof HubTools === 'undefined') {
        console.error('cimaSearch.js: HubTools namespace no encontrado.');
        return;
    }

    var ENDPOINT = 'https://cima.aemps.es/cima/rest/medicamentos';
    var TIMEOUT_MS = 4000;
    var MAX_RESULTS = 15;
    var MIN_QUERY = 2;

    /**
     * One AEMPS request with its own AbortController and timeout. Never
     * rejects: resolves `{ valid: true, rows }` for a usable response
     * (2xx + JSON object with a `resultados` array) or `{ valid: false }`
     * for any failure (network error, abort, timeout, bad JSON).
     */
    function requestOnce(url) {
        var controller = typeof AbortController === 'function' ? new AbortController() : null;
        var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;
        function finish() {
            if (timer !== null) { clearTimeout(timer); timer = null; }
        }
        return fetch(url, controller ? { signal: controller.signal } : undefined)
            .then(function (response) {
                if (!response.ok) { finish(); return { valid: false, rows: null }; }
                return response.json().then(function (body) {
                    finish();
                    if (!body || typeof body !== 'object' || !Array.isArray(body.resultados)) {
                        return { valid: false, rows: null };
                    }
                    return { valid: true, rows: body.resultados };
                }).catch(function () {
                    finish();
                    return { valid: false, rows: null };
                });
            })
            .catch(function () {
                finish();
                return { valid: false, rows: null };
            });
    }

    /**
     * Identity-only projection of one AEMPS row: registration number plus
     * trimmed name. Rows without `nregistro` or `nombre` are discarded.
     */
    function toRow(row) {
        if (!row || typeof row !== 'object') return null;
        var nregistro = row.nregistro === undefined || row.nregistro === null ? '' : String(row.nregistro).trim();
        var nombre = row.nombre === undefined || row.nombre === null ? '' : String(row.nombre).trim();
        if (!nregistro || !nombre) return null;
        return { id: 'AEMPS:' + nregistro, name: nombre };
    }

    /**
     * Merges the `nombre` rows first and the `practiv1` rows after,
     * deduplicating by `nregistro` and by name, keeping at most MAX_RESULTS.
     */
    function unionRows(nombreRows, practivRows) {
        var seen = {};
        var out = [];
        var rows = nombreRows.concat(practivRows);
        for (var i = 0; i < rows.length && out.length < MAX_RESULTS; i++) {
            var row = toRow(rows[i]);
            if (!row) continue;
            // Solo se guarda el nombre: dos registros con el mismo nombre
            // (p. ej. distintos envases) se muestran una sola vez.
            var nameKey = 'N:' + row.name.toUpperCase();
            if (seen[row.id] || seen[nameKey]) continue;
            seen[row.id] = true;
            seen[nameKey] = true;
            out.push(row);
        }
        return out;
    }

    /**
     * Local fallback when BOTH AEMPS requests failed. Uses the published
     * catalogue only when it is actually loaded; its unscoped
     * `search(query)` form (one argument) is the sanctioned fallback path.
     */
    function localFallback(q) {
        try {
            if (HubTools.catalog && typeof HubTools.catalog.isLoaded === 'function' && HubTools.catalog.isLoaded()) {
                return { source: 'local', results: HubTools.catalog.search(q) };
            }
        } catch (error) {
            // Any fallback error ends with no options invented below.
        }
        return { source: 'none', results: [] };
    }

    /**
     * Live search. Short queries resolve immediately without network.
     * Otherwise two parallel AEMPS requests are issued; at least one usable
     * response answers with source 'aemps' (even with zero rows, without
     * falling back). Every error path ends in the local fallback, and the
     * returned promise never rejects.
     */
    function search(query) {
        var q = String(query === undefined || query === null ? '' : query).trim();
        if (q.length < MIN_QUERY) {
            return Promise.resolve({ source: 'aemps', results: [] });
        }
        var nombreUrl = ENDPOINT + '?nombre=' + encodeURIComponent(q) + '&pagesize=' + MAX_RESULTS;
        var practivUrl = ENDPOINT + '?practiv1=' + encodeURIComponent(q) + '&pagesize=' + MAX_RESULTS;
        return Promise.all([requestOnce(nombreUrl), requestOnce(practivUrl)])
            .then(function (outcomes) {
                if (outcomes[0].valid || outcomes[1].valid) {
                    return {
                        source: 'aemps',
                        results: unionRows(outcomes[0].rows || [], outcomes[1].rows || [])
                    };
                }
                return localFallback(q);
            })
            .catch(function () {
                return localFallback(q);
            });
    }

    HubTools.cimaSearch = {
        search: search,
        ENDPOINT: ENDPOINT,
        TIMEOUT_MS: TIMEOUT_MS,
        MAX_RESULTS: MAX_RESULTS,
        MIN_QUERY: MIN_QUERY
    };
})();
