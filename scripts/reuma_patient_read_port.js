/* Reuma patient read port (F5.1 / #429 WU-A) — read-only, delegating wrapper.
 * Classic repo pattern (no import/export): IIFE publishing globalThis.ReumaPatientReadPort.
 * The port owns only the readiness split (unavailable vs not_found); it never writes
 * appState/sessionStorage and never invents clinical content. */
(function (root) {
    'use strict';

    var PORT_VERSION = '1.0.0';
    var REQUIRED_METHODS = ['getAllPatients', 'findPatientById', 'getPatientHistory'];
    var READINESS_KEY = 'hubClinicoDB';
    var ID_SHAPE = /^(ESP|APS|AR)-\d{4}-\d{3}$/i;

    var databaseLoadedObserved = false;
    var registeredRootAdd = null;
    var registeredDocumentAdd = null;
    var singleton = null;

    var CLINICAL_FAILURE = 'read_failed';

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

    function deepFreeze(value) {
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            var keys = Object.keys(value);
            for (var i = 0; i < keys.length; i += 1) deepFreeze(value[keys[i]]);
            Object.freeze(value);
        }
        return value;
    }

    function fail(errorCode) {
        return Object.freeze({ status: 'error', error_code: String(errorCode || CLINICAL_FAILURE) });
    }

    function normalizer() {
        return root && root.HubTools && root.HubTools.normalizer ? root.HubTools.normalizer : null;
    }

    function normalizeRecord(record) {
        var current = normalizer();
        if (current && typeof current.normalizeRecord === 'function') return current.normalizeRecord(record);
        return record && typeof record === 'object' ? record : {};
    }

    function normalizePathology(value) {
        var current = normalizer();
        if (current && typeof current.normalizePathology === 'function') return current.normalizePathology(value);
        return (value || '').toString().trim().toLowerCase();
    }

    function foldTerm(value) {
        return String(value === undefined || value === null ? '' : value)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
    }

    function projectRow(row) {
        var normalized = normalizeRecord(row);
        return {
            id: normalized.idPaciente || row.ID || row.id,
            nombre: normalized.nombrePaciente || row.Nombre || row.nombre
        };
    }

    function makeImplementation(implementation) {
        var methods = {};

        function listPatients() {
            ensureReadinessListener();
            return new Promise(function (resolve) {
                var rows;
                try {
                    rows = implementation.getAllPatients();
                } catch (error) {
                    resolve(fail('get_all_patients_failed'));
                    return;
                }
                if (!Array.isArray(rows)) {
                    resolve(hasReadinessSignal() ? Object.freeze({ status: 'ok', patients: Object.freeze([]) }) : Object.freeze({ status: 'unavailable' }));
                    return;
                }
                if (!hasReadinessSignal() && rows.length === 0) {
                    resolve(Object.freeze({ status: 'unavailable' }));
                    return;
                }
                var patients = [];
                try {
                    for (var i = 0; i < rows.length; i += 1) {
                        var projected = projectRow(rows[i]);
                        if (!projected.id || !projected.nombre) continue;
                        patients.push(Object.freeze({ id: projected.id, nombre: projected.nombre }));
                    }
                } catch (error) {
                    resolve(fail('projection_failed'));
                    return;
                }
                resolve(deepFreeze({ status: 'ok', patients: patients }));
            });
        }

        function buildIndex() {
            var rows = implementation.getAllPatients();
            if (!Array.isArray(rows)) return [];
            var index = [];
            for (var i = 0; i < rows.length; i += 1) {
                var row = rows[i];
                var normalized = normalizeRecord(row);
                var id = normalized.idPaciente || row.ID || row.id;
                var nombre = normalized.nombrePaciente || row.Nombre || row.nombre;
                var diagnostico = normalized.diagnosticoPrimario || row.Diagnostico;
                if (!id || !nombre) continue;
                var folded = foldTerm(id);
                if (!folded) continue;
                if (index.some(function (entry) { return foldTerm(entry.id) === folded; })) continue;
                index.push({
                    id: id,
                    nombre: nombre,
                    patologia: normalizePathology(diagnostico) || null
                });
            }
            return index;
        }

        function resolvePatient(term) {
            ensureReadinessListener();
            return new Promise(function (resolve) {
                var foldedTerm = foldTerm(term);
                if (!foldedTerm) {
                    resolve(Object.freeze({ status: 'error', error_code: 'empty_term' }));
                    return;
                }
                var index;
                try {
                    index = buildIndex();
                } catch (error) {
                    resolve(fail('index_failed'));
                    return;
                }
                if (!hasReadinessSignal() && index.length === 0) {
                    resolve(Object.freeze({ status: 'unavailable' }));
                    return;
                }
                var exact = null;
                for (var i = 0; i < index.length; i += 1) {
                    if (foldTerm(index[i].id) === foldedTerm) { exact = index[i]; break; }
                }
                if (exact) {
                    resolve(deepFreeze({ status: 'ok', patient: { id: exact.id, nombre: exact.nombre, patologia: exact.patologia } }));
                    return;
                }
                var matching = index.filter(function (entry) {
                    return foldTerm(entry.nombre).indexOf(foldedTerm) !== -1;
                });
                if (matching.length === 1) {
                    var only = matching[0];
                    resolve(deepFreeze({ status: 'ok', patient: { id: only.id, nombre: only.nombre, patologia: only.patologia } }));
                    return;
                }
                if (matching.length > 1) {
                    var candidates = matching.slice(0, 3).map(function (entry) {
                        return { id: entry.id, nombre: entry.nombre };
                    });
                    // `total` is the true number of matching index entries; `candidates`
                    // keeps the frozen cap of at most 3 examples in index order.
                    resolve(deepFreeze({ status: 'ambiguous', total: matching.length, candidates: candidates }));
                    return;
                }
                if (ID_SHAPE.test(term)) {
                    resolve(Object.freeze({ status: 'not_found', reason: 'id_not_found' }));
                    return;
                }
                resolve(Object.freeze({ status: 'not_found', reason: 'no_match' }));
            });
        }

        function readPatientBundle(patientId) {
            ensureReadinessListener();
            return new Promise(function (resolve) {
                var listing;
                try {
                    listing = implementation.getAllPatients();
                } catch (error) {
                    resolve(fail('get_all_patients_failed'));
                    return;
                }
                var memberIds;
                try {
                    memberIds = projectMemberIds(listing);
                } catch (error) {
                    resolve(fail('projection_failed'));
                    return;
                }
                if (!isMember(memberIds, patientId)) {
                    // Refuse without delegating: a non-member id must never reach the read surface.
                    if (!hasReadinessSignal() && memberIds.length === 0) {
                        resolve(Object.freeze({ status: 'unavailable' }));
                        return;
                    }
                    resolve(Object.freeze({ status: 'not_found', reason: 'unknown_id' }));
                    return;
                }
                var record;
                var history;
                try {
                    record = implementation.findPatientById(patientId);
                } catch (error) {
                    resolve(fail('find_patient_failed'));
                    return;
                }
                if (!record) {
                    resolve(hasReadinessSignal()
                        ? Object.freeze({ status: 'not_found', reason: 'unknown_id' })
                        : Object.freeze({ status: 'unavailable' }));
                    return;
                }
                try {
                    history = implementation.getPatientHistory(patientId);
                } catch (error) {
                    resolve(fail('get_patient_history_failed'));
                    return;
                }
                var visits = history && Array.isArray(history.allVisits) ? history.allVisits : [];
                if (visits.length === 0) {
                    resolve(Object.freeze({ status: 'not_found', reason: 'no_visits' }));
                    return;
                }
                resolve(deepFreeze({
                    status: 'ok',
                    patient: {
                        record: deepCopy(record),
                        history: deepCopy(history)
                    }
                }));
            });
        }

        // Frozen membership projection (PART 4 AMENDMENT B, rule 5): the sheets hold one row
        // per visit, so membership means "this id has at least one identity-complete row in
        // the loaded corpus". Exactly the listPatients() id/nombre projection, no dedupe.
        function projectMemberIds(rows) {
            var ids = [];
            if (!Array.isArray(rows)) return ids;
            for (var i = 0; i < rows.length; i += 1) {
                var projected = projectRow(rows[i]);
                if (!projected.id || !projected.nombre) continue;
                ids.push(projected.id);
            }
            return ids;
        }

        function isMember(ids, patientId) {
            for (var i = 0; i < ids.length; i += 1) {
                if (ids[i] === patientId) return true;
            }
            return false;
        }

        methods.listPatients = listPatients;
        methods.resolvePatient = resolvePatient;
        methods.readPatientBundle = readPatientBundle;
        return methods;
    }

    function create(implementation) {
        if (!implementation || (typeof implementation !== 'object' && typeof implementation !== 'function')) {
            throw new Error('ReumaPatientReadPort: missing implementation method ' + REQUIRED_METHODS[0]);
        }
        for (var i = 0; i < REQUIRED_METHODS.length; i += 1) {
            if (typeof implementation[REQUIRED_METHODS[i]] !== 'function') {
                throw new Error('ReumaPatientReadPort: missing implementation method ' + REQUIRED_METHODS[i]);
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

    root.ReumaPatientReadPort = Object.freeze({
        PORT_VERSION: PORT_VERSION,
        create: create,
        getPort: getPort
    });
})(typeof window !== 'undefined' ? window : globalThis);
