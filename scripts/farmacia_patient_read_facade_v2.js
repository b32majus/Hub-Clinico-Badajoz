/* Async patient-read facade over the versioned F4.1 read contract (#428 WU-A, Revision 1).
 *
 * The facade owns request identity, supersession, candidate resolution and the decision to
 * commit a selection. It never builds or stores a session envelope: the caller-owned commit
 * capability owns the envelope and every write effect, so no second clinical copy is created
 * here. All domain-shaped inputs (contract, identifierCandidates, commitSelection) arrive as
 * injected dependencies; this module names no storage, network, adapter or session capability
 * directly.
 *
 * A supplied `session` key is ignored on purpose: request-scoped identity and the commit
 * decision live here, while envelope construction belongs to commitSelection.
 *
 * Frozen-spec gap handled fail closed: a commit collaborator that throws, answers with a
 * non-object, or answers with a status outside {pending_changes, active} yields
 * {state:'error', errorCode:'SOURCE_READ_FAILED'} with no committed patient. The F4.1 context
 * value is passed through unchanged; no clinical fact is derived, defaulted or coerced.
 */
(function (root) {
    'use strict';

    var FACADE_VERSION = '1.0.0';
    var STATES = Object.freeze(['loading', 'ok', 'not_found', 'ambiguous', 'unavailable', 'error']);

    function isObject(value) {
        return value !== null && typeof value === 'object';
    }

    function isFunction(value) {
        return typeof value === 'function';
    }

    function isEnvelope(value) {
        return isObject(value) && typeof value.outcome === 'string';
    }

    function mapOutcome(outcome) {
        if (outcome === 'ok') return 'ok';
        if (outcome === 'not_found') return 'not_found';
        if (outcome === 'ambiguous') return 'ambiguous';
        if (outcome === 'unavailable') return 'unavailable';
        return 'error';
    }

    // Fail-closed synthetic F4.1 envelope for a missing or malformed contract reply.
    function failedEnvelope() {
        return {
            outcome: 'error',
            value: null,
            errorCode: 'SOURCE_READ_FAILED',
            completeness: null,
            provenance: null
        };
    }

    function readResult(requestId, envelope) {
        return {
            state: mapOutcome(envelope ? envelope.outcome : 'error'),
            requestId: requestId,
            superseded: false,
            value: envelope ? envelope.value : null,
            errorCode: envelope ? envelope.errorCode : 'SOURCE_READ_FAILED',
            completeness: envelope ? envelope.completeness : null,
            provenance: envelope ? envelope.provenance : null,
            scope: null
        };
    }

    function supersededRead(requestId) {
        return {
            state: 'loading',
            requestId: requestId,
            superseded: true,
            value: null,
            errorCode: null,
            completeness: null,
            provenance: null,
            scope: null
        };
    }

    function selectionFailure(requestId, state, errorCode) {
        return {
            state: state,
            requestId: requestId,
            superseded: false,
            selected: false,
            patient: null,
            envelope: null,
            previousCip: null,
            pendingChanges: false,
            errorCode: errorCode
        };
    }

    function supersededSelection(requestId) {
        return {
            state: 'loading',
            requestId: requestId,
            superseded: true,
            selected: false,
            patient: null,
            envelope: null,
            previousCip: null,
            pendingChanges: false,
            errorCode: null
        };
    }

    function selectionPending(requestId) {
        return {
            state: 'ok',
            requestId: requestId,
            superseded: false,
            selected: false,
            patient: null,
            envelope: null,
            previousCip: null,
            pendingChanges: true,
            errorCode: null
        };
    }

    function selectionActive(requestId, patient, envelope, previousCip) {
        return {
            state: 'ok',
            requestId: requestId,
            superseded: false,
            selected: true,
            patient: patient,
            envelope: envelope,
            previousCip: previousCip,
            pendingChanges: false,
            errorCode: null
        };
    }

    function create(options) {
        var settings = options || {};
        var contract = settings.contract;
        var identifierCandidates = settings.identifierCandidates;
        var commitSelection = settings.commitSelection;

        if (!isObject(contract) || !isFunction(contract.resolvePatient) || !isFunction(contract.readPatientContext)) return null;
        if (!isFunction(identifierCandidates)) return null;
        if (!isFunction(commitSelection)) return null;

        var requestCount = 0;
        var currentId = null;
        var currentState = null;
        var pending = false;

        function begin() {
            requestCount += 1;
            currentId = 'req-' + requestCount;
            pending = true;
            return currentId;
        }

        function isCurrent(requestId) {
            return currentId === requestId;
        }

        function settle(requestId, state) {
            if (currentId === requestId) {
                pending = false;
                currentState = state;
            }
        }

        function status() {
            if (pending) return { state: 'loading', requestId: currentId, pending: true };
            if (currentId === null) return { state: null, requestId: null, pending: false };
            return { state: currentState, requestId: currentId, pending: false };
        }

        function currentRequestId() {
            return currentId;
        }

        // Mirrors a pure F4.1 read 1:1 and never commits.
        async function mirrorRead(requestId, call) {
            var envelope;
            try {
                envelope = await call();
            } catch (error) {
                envelope = null;
            }
            if (!isCurrent(requestId)) return supersededRead(requestId);
            settle(requestId, mapOutcome(isEnvelope(envelope) ? envelope.outcome : 'error'));
            return readResult(requestId, isEnvelope(envelope) ? envelope : failedEnvelope());
        }

        function resolvePatient(identifierSystem, identifierValue) {
            var requestId = begin();
            return mirrorRead(requestId, function () {
                return contract.resolvePatient(identifierSystem, identifierValue);
            });
        }

        function loadPatientContext(patientId) {
            var requestId = begin();
            return mirrorRead(requestId, function () {
                return contract.readPatientContext(patientId);
            });
        }

        // Revision 1 commit step: the caller-owned capability receives the explicit identifier
        // pair and the typed options, and returns the outcome the facade mirrors. The facade
        // never assembles an envelope and never re-derives a patient projection.
        function commit(requestId, identifier, patientId, options) {
            var outcome;
            try {
                outcome = commitSelection(
                    { identifier_system: identifier.identifier_system, identifier_value: identifier.identifier_value },
                    patientId,
                    { discardPendingChanges: options.discardPendingChanges === true }
                );
            } catch (error) {
                settle(requestId, 'error');
                return selectionFailure(requestId, 'error', 'SOURCE_READ_FAILED');
            }
            if (isObject(outcome) && outcome.status === 'pending_changes') {
                settle(requestId, 'ok');
                return selectionPending(requestId);
            }
            if (isObject(outcome) && outcome.status === 'active') {
                settle(requestId, 'ok');
                return selectionActive(
                    requestId,
                    outcome.patient,
                    outcome.envelope,
                    typeof outcome.previousCip === 'string' ? outcome.previousCip : null
                );
            }
            settle(requestId, 'error');
            return selectionFailure(requestId, 'error', 'SOURCE_READ_FAILED');
        }

        async function resolveThenSelect(requestId, resolveCall, identifier, candidatePatientId, options) {
            var resolved;
            try {
                resolved = await resolveCall();
            } catch (error) {
                resolved = null;
            }
            if (!isCurrent(requestId)) return supersededSelection(requestId);
            if (!isEnvelope(resolved)) {
                settle(requestId, 'error');
                return selectionFailure(requestId, 'error', 'SOURCE_READ_FAILED');
            }
            if (resolved.outcome !== 'ok') {
                var resolvedState = mapOutcome(resolved.outcome);
                settle(requestId, resolvedState);
                return selectionFailure(requestId, resolvedState, resolved.errorCode);
            }
            var patientId = isObject(resolved.value) && typeof resolved.value.patient_id === 'string'
                && resolved.value.patient_id.trim() !== ''
                ? resolved.value.patient_id
                : null;
            if (patientId === null || (candidatePatientId !== undefined && patientId !== candidatePatientId)) {
                settle(requestId, 'error');
                return selectionFailure(requestId, 'error', 'SOURCE_READ_FAILED');
            }
            var context;
            try {
                context = await contract.readPatientContext(patientId);
            } catch (error) {
                context = null;
            }
            if (!isCurrent(requestId)) return supersededSelection(requestId);
            if (!isEnvelope(context)) {
                settle(requestId, 'error');
                return selectionFailure(requestId, 'error', 'SOURCE_READ_FAILED');
            }
            if (context.outcome !== 'ok') {
                var contextState = mapOutcome(context.outcome);
                settle(requestId, contextState);
                return selectionFailure(requestId, contextState, context.errorCode);
            }
            return commit(requestId, identifier, patientId, options);
        }

        function selectPatientByIdentifier(identifierSystem, identifierValue, options) {
            var requestId = begin();
            var settings = options || {};
            return resolveThenSelect(
                requestId,
                function () { return contract.resolvePatient(identifierSystem, identifierValue); },
                { identifier_system: identifierSystem, identifier_value: identifierValue },
                undefined,
                settings
            );
        }

        async function selectPatientByValue(value, options) {
            var requestId = begin();
            var settings = options || {};
            var candidates;
            try {
                candidates = identifierCandidates(value);
            } catch (error) {
                candidates = null;
            }
            if (!Array.isArray(candidates)) {
                settle(requestId, 'unavailable');
                return selectionFailure(requestId, 'unavailable', 'SOURCE_METHOD_UNAVAILABLE');
            }
            if (candidates.length === 0) {
                settle(requestId, 'not_found');
                return selectionFailure(requestId, 'not_found', null);
            }
            if (candidates.length > 1) {
                settle(requestId, 'ambiguous');
                return selectionFailure(requestId, 'ambiguous', 'IDENTIFIER_AMBIGUOUS');
            }
            var candidate = candidates[0];
            return resolveThenSelect(
                requestId,
                function () { return contract.resolvePatient(candidate.identifier_system, candidate.identifier_value); },
                { identifier_system: candidate.identifier_system, identifier_value: candidate.identifier_value },
                candidate.patient_id,
                settings
            );
        }

        return Object.freeze({
            resolvePatient: resolvePatient,
            loadPatientContext: loadPatientContext,
            selectPatientByIdentifier: selectPatientByIdentifier,
            selectPatientByValue: selectPatientByValue,
            status: status,
            currentRequestId: currentRequestId
        });
    }

    root.FarmaciaPatientReadFacadeV2 = Object.freeze({
        FACADE_VERSION: FACADE_VERSION,
        STATES: STATES,
        create: create
    });
})(typeof window !== 'undefined' ? window : globalThis);
