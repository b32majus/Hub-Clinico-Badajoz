/* Reuma Estadísticas population read seam (F5.2B / #456) — read-only, delegating wrapper.
 * Classic repo pattern (no import/export): IIFE publishing globalThis.ReumaPopulationReadPort.
 *
 * Ownership: this module owns ONLY the population/aggregate reads consumed by
 * Estadísticas (`HubTools.data.getPoblationalData`, `HubTools.data.getFarmsDataFromState`).
 * Patient/history reads stay in the adjacent `scripts/reuma_patient_read_port.js`, whose
 * frozen contract this module intentionally does not change. The seam never writes
 * appState/sessionStorage, never reinterprets clinical filters and never invents clinical
 * content: it delegates, copies and exposes an explicit availability split
 * (`ok` with the legacy payload | `unavailable` | `error`) so a missing source can never be
 * presented as a valid empty cohort. */
(function (root) {
    'use strict';

    var PORT_VERSION = '1.0.0';
    var REQUIRED_METHODS = ['getPoblationalData', 'getFarmsDataFromState'];
    var READINESS_KEY = 'hubClinicoDB';
    var DRUG_CATEGORIES = ['Tratamientos_Sistemicos', 'FAMEs', 'Biologicos'];

    var databaseLoadedObserved = false;
    var registeredRootAdd = null;
    var registeredDocumentAdd = null;
    var singleton = null;

    function ensureReadinessListener() {
        try {
            if (root && typeof root.addEventListener === 'function' && root.addEventListener !== registeredRootAdd) {
                root.addEventListener('databaseLoaded', function () {
                    databaseLoadedObserved = true;
                });
                registeredRootAdd = root.addEventListener;
            }
        } catch (error) {
            /* fail open on wiring only: readiness stays signal-driven */
        }
        try {
            var doc = root && root.document;
            if (doc && typeof doc.addEventListener === 'function' && doc.addEventListener !== registeredDocumentAdd) {
                doc.addEventListener('databaseLoaded', function () {
                    databaseLoadedObserved = true;
                });
                registeredDocumentAdd = doc.addEventListener;
            }
        } catch (error) {
            /* fail open on wiring only: readiness stays signal-driven */
        }
    }

    function hasReadinessSignal() {
        if (databaseLoadedObserved) return true;
        try {
            var storage = root && root.sessionStorage;
            if (storage && typeof storage.getItem === 'function' && storage.getItem(READINESS_KEY) !== null) {
                return true;
            }
        } catch (error) {
            /* unreadable storage is not a readiness signal */
        }
        return false;
    }

    function deepCopy(value) {
        if (value === null || typeof value !== 'object') return value;
        if (Array.isArray(value)) {
            var list = new Array(value.length);
            for (var i = 0; i < value.length; i += 1) list[i] = deepCopy(value[i]);
            return list;
        }
        if (value instanceof Date) return new Date(value.getTime());
        var copy = {};
        var keys = Object.keys(value);
        for (var k = 0; k < keys.length; k += 1) copy[keys[k]] = deepCopy(value[keys[k]]);
        return copy;
    }

    function fail(errorCode) {
        return Object.freeze({ status: 'error', error_code: String(errorCode || 'read_failed') });
    }

    function unavailable() {
        return Object.freeze({ status: 'unavailable' });
    }

    function emptyDrugCategories() {
        var categories = {};
        for (var i = 0; i < DRUG_CATEGORIES.length; i += 1) categories[DRUG_CATEGORIES[i]] = [];
        return categories;
    }

    function makeImplementation(implementation) {
        var methods = {};

        // Population cohort/KPIs/chart payload. `filters` travels to the delegate
        // unchanged (no clinical reinterpretation). `ok` carries the exact legacy
        // payload; `unavailable` means the source produced nothing to read (never
        // folded into a valid empty cohort); `error` means the delegate failed.
        function readPopulation(filters) {
            ensureReadinessListener();
            return new Promise(function (resolve) {
                var payload;
                try {
                    payload = implementation.getPoblationalData(filters);
                } catch (error) {
                    resolve(fail('poblational_read_failed'));
                    return;
                }
                if (payload === null || typeof payload !== 'object') {
                    resolve(fail('poblational_payload_invalid'));
                    return;
                }
                if (!Array.isArray(payload.filteredCohort)) {
                    resolve(fail('poblational_cohort_invalid'));
                    return;
                }
                if (!hasReadinessSignal() && payload.filteredCohort.length === 0) {
                    resolve(unavailable());
                    return;
                }
                resolve(Object.freeze({ status: 'ok', payload: deepCopy(payload) }));
            });
        }

        // Drug filter options come from the same synchronous source as today while this
        // WO stays migration-neutral: same set/order, no clinical inference.
        function readDrugFilterOptions() {
            ensureReadinessListener();
            var categories;
            try {
                categories = implementation.getFarmsDataFromState();
            } catch (error) {
                return { status: 'error', error_code: 'drug_options_read_failed', categories: emptyDrugCategories() };
            }
            if (!categories || typeof categories !== 'object') {
                return { status: 'error', error_code: 'drug_options_invalid', categories: emptyDrugCategories() };
            }
            return { status: 'ok', categories: deepCopy(categories) };
        }

        methods.readPopulation = readPopulation;
        methods.readDrugFilterOptions = readDrugFilterOptions;
        return methods;
    }

    function create(implementation) {
        if (!implementation || (typeof implementation !== 'object' && typeof implementation !== 'function')) {
            throw new Error('ReumaPopulationReadPort: missing implementation method ' + REQUIRED_METHODS[0]);
        }
        for (var i = 0; i < REQUIRED_METHODS.length; i += 1) {
            if (typeof implementation[REQUIRED_METHODS[i]] !== 'function') {
                throw new Error('ReumaPopulationReadPort: missing implementation method ' + REQUIRED_METHODS[i]);
            }
        }
        return Object.freeze(makeImplementation(implementation));
    }

    function getPort() {
        if (singleton) return singleton;
        try {
            var data = root && root.HubTools && root.HubTools.data;
            if (!data || typeof data !== 'object') return null;
            for (var i = 0; i < REQUIRED_METHODS.length; i += 1) {
                if (typeof data[REQUIRED_METHODS[i]] !== 'function') return null;
            }
            var implementation = {};
            for (var j = 0; j < REQUIRED_METHODS.length; j += 1) {
                implementation[REQUIRED_METHODS[j]] = data[REQUIRED_METHODS[j]];
            }
            singleton = create(implementation);
            ensureReadinessListener();
            return singleton;
        } catch (error) {
            return null;
        }
    }

    root.ReumaPopulationReadPort = Object.freeze({
        PORT_VERSION: PORT_VERSION,
        DRUG_CATEGORIES: Object.freeze(DRUG_CATEGORIES.slice()),
        create: create,
        getPort: getPort
    });
})(typeof window !== 'undefined' ? window : globalThis);
