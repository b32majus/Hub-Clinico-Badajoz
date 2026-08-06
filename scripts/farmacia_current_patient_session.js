/* Fail-closed session envelope for one explicitly selected patient. */
(function (root) {
    'use strict';

    var SESSION_VERSION = '1.0.0';
    var STORAGE_KEY = 'promueve.fh.currentPatientSession.v1';
    var ENVELOPE_KEYS = [
        'version', 'identifier', 'patient_id', 'generation', 'patient_projection',
        'explicit_data', 'provenance', 'drafts', 'dirty'
    ];
    var FORBIDDEN_KEYS = ['workbook', 'read_model', 'population', 'bytes', 'secret', 'token', 'password'];

    function SessionError(code, message) {
        this.name = 'FarmaciaCurrentPatientSessionError';
        this.code = code;
        this.message = code + ': ' + message;
        if (Error.captureStackTrace) Error.captureStackTrace(this, SessionError);
    }
    SessionError.prototype = Object.create(Error.prototype);
    SessionError.prototype.constructor = SessionError;

    function own(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    function isPlainObject(value) {
        return value !== null && Object.prototype.toString.call(value) === '[object Object]';
    }

    function clone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function requireText(value, code) {
        if (typeof value !== 'string' || value.trim() === '') throw new SessionError(code, 'Se requiere un valor explícito.');
        return value;
    }

    function validateIdentifier(identifier) {
        if (!isPlainObject(identifier)
            || Object.keys(identifier).length !== 2
            || !own(identifier, 'identifier_system')
            || !own(identifier, 'identifier_value')) {
            throw new SessionError('SESSION_IDENTIFIER_INVALID', 'El identificador explícito no es válido.');
        }
        requireText(identifier.identifier_system, 'SESSION_IDENTIFIER_INVALID');
        requireText(identifier.identifier_value, 'SESSION_IDENTIFIER_INVALID');
    }

    function assertSafeKeys(value, path) {
        if (Array.isArray(value)) {
            value.forEach(function (item, index) { assertSafeKeys(item, path + '[' + index + ']'); });
            return;
        }
        if (!isPlainObject(value)) return;
        Object.keys(value).forEach(function (key) {
            var normalized = key.toLowerCase();
            if (FORBIDDEN_KEYS.some(function (forbidden) { return normalized.indexOf(forbidden) !== -1; })) {
                throw new SessionError('SESSION_FORBIDDEN_DATA', 'Dato no permitido en ' + path + '.' + key + '.');
            }
            assertSafeKeys(value[key], path + '.' + key);
        });
    }

    function validateEnvelope(envelope) {
        if (!isPlainObject(envelope)) throw new SessionError('SESSION_STRUCTURE_MISMATCH', 'Envelope no válido.');
        var keys = Object.keys(envelope).sort();
        var expected = ENVELOPE_KEYS.slice().sort();
        if (JSON.stringify(keys) !== JSON.stringify(expected)) throw new SessionError('SESSION_STRUCTURE_MISMATCH', 'Campos de envelope no válidos.');
        if (envelope.version !== SESSION_VERSION) throw new SessionError('SESSION_VERSION_MISMATCH', 'Versión no compatible.');
        validateIdentifier(envelope.identifier);
        requireText(envelope.patient_id, 'SESSION_PATIENT_ID_INVALID');
        requireText(envelope.generation, 'SESSION_GENERATION_INVALID');
        if (!isPlainObject(envelope.patient_projection) || envelope.patient_projection.patient_id !== envelope.patient_id) {
            throw new SessionError('SESSION_PATIENT_PROJECTION_MISMATCH', 'La proyección no corresponde al paciente.');
        }
        if (!isPlainObject(envelope.explicit_data) || !isPlainObject(envelope.drafts) || typeof envelope.dirty !== 'boolean') {
            throw new SessionError('SESSION_STRUCTURE_MISMATCH', 'Estructura de datos no válida.');
        }
        if (!(Array.isArray(envelope.provenance) || isPlainObject(envelope.provenance))) {
            throw new SessionError('SESSION_STRUCTURE_MISMATCH', 'Provenance no válida.');
        }
        assertSafeKeys(envelope.patient_projection, '$.patient_projection');
        assertSafeKeys(envelope.explicit_data, '$.explicit_data');
        assertSafeKeys(envelope.provenance, '$.provenance');
        assertSafeKeys(envelope.drafts, '$.drafts');
        JSON.stringify(envelope);
        return envelope;
    }

    function create(options) {
        var settings = options || {};
        var storage = settings.sessionStorage || root.sessionStorage;
        if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
            throw new SessionError('SESSION_STORAGE_UNAVAILABLE', 'sessionStorage no está disponible.');
        }
        var active = null;
        var pending = null;

        function empty(reason) {
            active = null;
            pending = null;
            return { status: 'empty', reason: reason || null };
        }

        function purge() {
            active = null;
            pending = null;
            storage.removeItem(STORAGE_KEY);
            if (storage.getItem(STORAGE_KEY) !== null) {
                throw new SessionError('SESSION_PURGE_FAILED', 'No se pudo verificar el borrado del envelope.');
            }
        }

        function failClosed(reason) {
            purge();
            return empty(reason);
        }

        function readStored() {
            var raw = storage.getItem(STORAGE_KEY);
            if (raw === null) return null;
            try {
                return validateEnvelope(JSON.parse(raw));
            } catch (error) {
                failClosed(error.code || 'SESSION_CORRUPT');
                return null;
            }
        }

        function writeEnvelope(envelope) {
            var canonical = clone(validateEnvelope(clone(envelope)));
            var serialized = JSON.stringify(canonical);
            try {
                storage.setItem(STORAGE_KEY, serialized);
                if (storage.getItem(STORAGE_KEY) !== serialized) {
                    throw new SessionError('SESSION_WRITE_FAILED', 'No se pudo verificar la escritura del envelope.');
                }
                active = canonical;
                pending = null;
                return clone(active);
            } catch (error) {
                failClosed(error.code || 'SESSION_WRITE_FAILED');
                throw error;
            }
        }

        function inputEnvelope(input) {
            if (!isPlainObject(input)) throw new SessionError('SESSION_INPUT_INVALID', 'Entrada de sesión no válida.');
            return {
                version: SESSION_VERSION,
                identifier: clone(input.identifier),
                patient_id: input.patient_id,
                generation: input.generation,
                patient_projection: clone(input.patient_projection),
                explicit_data: own(input, 'explicit_data') ? clone(input.explicit_data) : {},
                provenance: own(input, 'provenance') ? clone(input.provenance) : [],
                drafts: own(input, 'drafts') ? clone(input.drafts) : {},
                dirty: own(input, 'dirty') ? input.dirty : false
            };
        }

        function sameIdentity(envelope, input) {
            return envelope.patient_id === input.patient_id
                && envelope.generation === input.generation
                && envelope.identifier.identifier_system === input.identifier.identifier_system
                && envelope.identifier.identifier_value === input.identifier.identifier_value;
        }

        function bootstrap(handoff) {
            active = null;
            pending = null;
            if (!isPlainObject(handoff) || typeof handoff.generation !== 'string' || handoff.generation === '') {
                if (storage.getItem(STORAGE_KEY) !== null) purge();
                return empty('missing_generation');
            }
            var stored = readStored();
            if (!stored) return empty('not_found_or_invalid');
            try {
                validateIdentifier(handoff.identifier);
                requireText(handoff.patient_id, 'SESSION_PATIENT_ID_INVALID');
                if (!sameIdentity(stored, handoff)) {
                    purge();
                    return empty('identity_mismatch');
                }
            } catch (error) {
                return failClosed(error.code || 'identity_mismatch');
            }
            pending = stored;
            return {
                status: 'pending_resume_decision',
                identifier: clone(stored.identifier),
                patient_id: stored.patient_id,
                generation: stored.generation,
                dirty: stored.dirty
            };
        }

        function resolveResume(decision) {
            if (decision === 'restart') {
                purge();
                return empty('restart');
            }
            if (decision !== 'continue' || !pending) {
                throw new SessionError('SESSION_RESUME_DECISION_INVALID', 'Decisión de reanudación no válida.');
            }
            active = pending;
            pending = null;
            return { status: 'active', envelope: clone(active) };
        }

        function replacePatient(input, discardPendingChanges) {
            // Stored state is resumable only through bootstrap + resolveResume.
            var current = active;
            if (current && isPlainObject(input) && isPlainObject(input.identifier) && sameIdentity(current, input)) {
                var samePatient = inputEnvelope(input);
                samePatient.drafts = own(input, 'drafts') ? samePatient.drafts : clone(current.drafts);
                samePatient.dirty = own(input, 'dirty') ? samePatient.dirty : current.dirty;
                return { status: 'active', envelope: writeEnvelope(samePatient) };
            }
            if (current && current.dirty && discardPendingChanges !== true) {
                active = current;
                return { status: 'pending_changes', patient_id: current.patient_id };
            }
            try {
                purge();
                return { status: 'active', envelope: writeEnvelope(inputEnvelope(input)) };
            } catch (error) {
                failClosed(error.code || 'SESSION_REPLACE_FAILED');
                throw error;
            }
        }

        function requireActive() {
            if (!active) throw new SessionError('SESSION_NOT_ACTIVE', 'No hay paciente activo.');
            return active;
        }

        function updateCurrent(changes) {
            var current = clone(requireActive());
            if (!isPlainObject(changes)) throw new SessionError('SESSION_UPDATE_INVALID', 'Actualización no válida.');
            ['patient_projection', 'explicit_data', 'provenance', 'dirty'].forEach(function (key) {
                if (own(changes, key)) current[key] = clone(changes[key]);
            });
            return writeEnvelope(current);
        }

        function saveDraft(page, draft, dirty) {
            requireText(page, 'SESSION_PAGE_INVALID');
            var current = clone(requireActive());
            current.drafts[page] = clone(draft);
            current.dirty = dirty === undefined ? true : dirty;
            return writeEnvelope(current);
        }

        function getDraft(page) {
            requireText(page, 'SESSION_PAGE_INVALID');
            var current = requireActive();
            return own(current.drafts, page) ? clone(current.drafts[page]) : null;
        }

        function getState() {
            if (pending) return { status: 'pending_resume_decision' };
            if (!active) return { status: 'empty' };
            return { status: 'active', envelope: clone(active) };
        }

        return Object.freeze({
            bootstrap: bootstrap,
            resolveResume: resolveResume,
            replacePatient: replacePatient,
            updateCurrent: updateCurrent,
            saveDraft: saveDraft,
            getDraft: getDraft,
            getState: getState,
            clear: function () { purge(); return empty('cleared'); }
        });
    }

    root.FarmaciaCurrentPatientSession = Object.freeze({
        SESSION_VERSION: SESSION_VERSION,
        STORAGE_KEY: STORAGE_KEY,
        SessionError: SessionError,
        create: create
    });
})(typeof window !== 'undefined' ? window : globalThis);
