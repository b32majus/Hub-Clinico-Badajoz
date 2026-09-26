/* Versioned patient read contract that projects V1 read-model records into physical-detail-free DTOs. */
(function (root) {
    'use strict';

    var CONTRACT_VERSION = '2.0.0';
    var SOURCE_KIND = 'application_read_contract_v2';

    var OUTCOMES = Object.freeze({
        OK: 'ok',
        NOT_FOUND: 'not_found',
        AMBIGUOUS: 'ambiguous',
        UNAVAILABLE: 'unavailable',
        ERROR: 'error'
    });

    // NONE carries the null errorCode used by successful and not-found envelopes so the
    // published vocabulary is exhaustive over every errorCode value the contract emits.
    var ERROR_CODES = Object.freeze({
        NONE: null,
        IDENTIFIER_INVALID: 'IDENTIFIER_INVALID',
        PATIENT_ID_INVALID: 'PATIENT_ID_INVALID',
        SOURCE_METHOD_UNAVAILABLE: 'SOURCE_METHOD_UNAVAILABLE',
        SOURCE_READ_FAILED: 'SOURCE_READ_FAILED',
        IDENTIFIER_AMBIGUOUS: 'IDENTIFIER_AMBIGUOUS'
    });

    var COMPLETENESS = Object.freeze({
        COMPLETE: 'complete',
        PARTIAL: 'partial',
        UNKNOWN: 'unknown'
    });

    var FORBIDDEN_DTO_KEYS = Object.freeze([
        'canonical_row',
        'rows',
        'source_sheet',
        'source_table',
        'physical_row_number',
        'physical_row_numbers',
        'row_index',
        'row_id',
        'source_event_id',
        'workbook',
        'bytes',
        'timeline',
        'snapshot',
        'storage',
        'file_name',
        'imported_at',
        'read_model_version',
        'sessionStorage',
        'localStorage'
    ]);

    var FORBIDDEN_KEY_LOOKUP = Object.freeze(FORBIDDEN_DTO_KEYS.reduce(function (lookup, key) {
        lookup[key] = true;
        return lookup;
    }, {}));

    var REQUEST_FIELDS = Object.freeze([
        'request_id',
        'request_origin',
        'request_date',
        'requested_drug_name',
        'requested_active_ingredient',
        'requested_presentation',
        'requested_dose_text',
        'requested_route',
        'requested_schedule_code',
        'requested_schedule_label',
        'requested_schedule_other_text',
        'requested_induction_status',
        'requested_weight_text',
        'requested_justification',
        'request_source_observations',
        'requested_selected_drug_id',
        'requested_catalog_source',
        'requested_national_code',
        'requested_registration_number'
    ]);

    var VALIDATION_FIELDS = Object.freeze([
        'validation_id',
        'validation_type',
        'validation_result',
        'validation_pending_reason',
        'validation_denial_reason',
        'validated_treatment_relation',
        'validated_drug_name',
        'validated_active_ingredient',
        'validated_presentation',
        'validated_dose_text',
        'validated_route',
        'validated_schedule_code',
        'validated_schedule_label',
        'validated_schedule_other_text',
        'validated_induction_status',
        'validated_selected_drug_id',
        'validated_catalog_source',
        'validated_national_code',
        'validated_registration_number',
        'validated_treatment_id',
        'validated_line_id',
        'line_creation_status'
    ]);

    var PROMS_FIELDS = Object.freeze(['proms_json']);

    var ADHERENCE_FIELDS = Object.freeze([
        'adherence_collection_status',
        'adherence_instrument',
        'adherence_result',
        'adherence_answers_json'
    ]);

    var ADVERSE_EVENT_FIELDS = Object.freeze([
        'adverse_event_id',
        'adverse_event_status',
        'adverse_event_description',
        'adverse_event_severity',
        'adverse_event_resolution_status',
        'adverse_event_action',
        'adverse_event_suspects_json'
    ]);

    var CAUSALITY_FIELDS = Object.freeze(['causality_assessments_json']);

    var REQUIRED_READ_METHODS = Object.freeze([
        'findByPatientId',
        'getLatestRequestValidation',
        'getVisitsAndLines',
        'getProms',
        'getAdherence',
        'getAdverseEventsAndCausality'
    ]);

    function isPlainObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function isNonEmptyString(value) {
        return typeof value === 'string' && value.trim() !== '';
    }

    function clone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    // Deep clone that drops every forbidden physical/read-model carrier at any depth.
    function sanitize(value) {
        if (Array.isArray(value)) {
            return value.map(sanitize);
        }
        if (isPlainObject(value)) {
            var clean = {};
            Object.keys(value).forEach(function (key) {
                if (FORBIDDEN_KEY_LOOKUP[key]) return;
                clean[key] = sanitize(value[key]);
            });
            return clean;
        }
        return clone(value);
    }

    function projectFields(source, fields) {
        var projected = {};
        fields.forEach(function (field) {
            projected[field] = Object.prototype.hasOwnProperty.call(source, field) ? clone(source[field]) : null;
        });
        return projected;
    }

    function projectLogicalRecord(source) {
        return isPlainObject(source) ? sanitize(source) : {};
    }

    function firstProfileRow(event) {
        if (!isPlainObject(event) || !Array.isArray(event.rows) || event.rows.length === 0) {
            return null;
        }
        var row = event.rows[0];
        if (!isPlainObject(row)) {
            return null;
        }
        return row.canonical_row;
    }

    function normalizeIdentifiers(identifiers) {
        var normalized = [];
        (Array.isArray(identifiers) ? identifiers : []).forEach(function (identifier) {
            if (!isPlainObject(identifier)) return;
            var system = identifier.identifier_system;
            var value = identifier.identifier_value;
            if (!isNonEmptyString(system) || !isNonEmptyString(value)) return;
            normalized.push({ system: system, value: value });
        });
        normalized.sort(function (left, right) {
            if (left.system !== right.system) return left.system < right.system ? -1 : 1;
            if (left.value !== right.value) return left.value < right.value ? -1 : 1;
            return 0;
        });
        return normalized;
    }

    function validSummaries(result) {
        var summaries = [];
        (Array.isArray(result) ? result : [result]).forEach(function (entry) {
            if (!isPlainObject(entry)) return;
            if (!isNonEmptyString(entry.patient_id)) return;
            summaries.push(entry);
        });
        return summaries;
    }

    function isUsableGroupValue(value) {
        return value === null || Array.isArray(value) || isPlainObject(value);
    }

    function mapItemValues(items, fields) {
        var mapped = [];
        (Array.isArray(items) ? items : []).forEach(function (item) {
            if (!isPlainObject(item) || typeof item.event_id !== 'string') return;
            mapped.push({
                event_id: item.event_id,
                values: isPlainObject(item.values) ? projectFields(item.values, fields) : {}
            });
        });
        return mapped;
    }

    function mapVisitEvents(events) {
        var mapped = [];
        (Array.isArray(events) ? events : []).forEach(function (event) {
            if (!isPlainObject(event) || typeof event.event_id !== 'string') return;
            var values = projectLogicalRecord(firstProfileRow(event));
            values.event_type = clone(event.event_type);
            mapped.push({ event_id: event.event_id, values: values });
        });
        return mapped;
    }

    function mapLineRows(lines) {
        var mapped = [];
        (Array.isArray(lines) ? lines : []).forEach(function (line) {
            if (!isPlainObject(line) || typeof line.event_id !== 'string') return;
            var values = projectLogicalRecord(line.snapshot);
            values.event_type = clone(line.event_type);
            values.treatment_id = clone(line.treatment_id);
            values.line_id = clone(line.line_id);
            mapped.push({ event_id: line.event_id, values: values });
        });
        return mapped;
    }

    function collectEventIds(dto) {
        var eventIds = [];
        [
            dto.visits,
            dto.lines,
            dto.proms,
            dto.adherence,
            dto.safety.adverse_events,
            dto.safety.causality_assessments
        ].forEach(function (items) {
            items.forEach(function (item) {
                if (typeof item.event_id === 'string' && eventIds.indexOf(item.event_id) === -1) {
                    eventIds.push(item.event_id);
                }
            });
        });
        eventIds.sort();
        return eventIds;
    }

    function buildProvenance(sourceVersion, patientId, eventIds) {
        return {
            source_kind: SOURCE_KIND,
            contract_version: CONTRACT_VERSION,
            source_version: sourceVersion,
            patient_id: patientId,
            event_ids: eventIds
        };
    }

    function makeEnvelope(outcome, value, errorCode, completeness, provenance) {
        return {
            outcome: outcome,
            value: value,
            errorCode: errorCode,
            completeness: completeness,
            provenance: provenance,
            scope: null
        };
    }

    function create(options) {
        if (!isPlainObject(options)) {
            throw new TypeError('PATIENT_READ_SOURCE_REQUIRED');
        }
        var source = options.source;
        if (!isPlainObject(source)) {
            throw new TypeError('PATIENT_READ_SOURCE_REQUIRED');
        }

        function sourceVersion() {
            return typeof source.data_source_version === 'string' ? source.data_source_version : null;
        }

        function provenanceFor(patientId, eventIds) {
            return buildProvenance(sourceVersion(), patientId, eventIds);
        }

        function failureEnvelope(outcome, errorCode) {
            return makeEnvelope(outcome, null, errorCode, COMPLETENESS.UNKNOWN, provenanceFor(null, []));
        }

        function callGroup(methodName, patientId) {
            try {
                return { available: true, value: source[methodName](patientId) };
            } catch (error) {
                return { available: false };
            }
        }

        function resolvePatient(identifierSystem, identifierValue) {
            if (!isNonEmptyString(identifierSystem) || !isNonEmptyString(identifierValue)) {
                return failureEnvelope(OUTCOMES.ERROR, ERROR_CODES.IDENTIFIER_INVALID);
            }
            if (typeof source.findByIdentifier !== 'function') {
                return failureEnvelope(OUTCOMES.UNAVAILABLE, ERROR_CODES.SOURCE_METHOD_UNAVAILABLE);
            }

            var result;
            try {
                result = source.findByIdentifier(identifierSystem.trim(), identifierValue.trim());
            } catch (error) {
                return failureEnvelope(OUTCOMES.ERROR, ERROR_CODES.SOURCE_READ_FAILED);
            }

            if (result === null || result === undefined) {
                return makeEnvelope(OUTCOMES.NOT_FOUND, null, null, COMPLETENESS.UNKNOWN, provenanceFor(null, []));
            }

            var summaries = validSummaries(result);
            if (summaries.length === 0) {
                return makeEnvelope(OUTCOMES.NOT_FOUND, null, null, COMPLETENESS.UNKNOWN, provenanceFor(null, []));
            }
            if (summaries.length > 1) {
                var candidateIds = [];
                summaries.forEach(function (summary) {
                    if (candidateIds.indexOf(summary.patient_id) === -1) {
                        candidateIds.push(summary.patient_id);
                    }
                });
                candidateIds.sort();
                return makeEnvelope(
                    OUTCOMES.AMBIGUOUS,
                    { candidate_patient_ids: candidateIds },
                    ERROR_CODES.IDENTIFIER_AMBIGUOUS,
                    COMPLETENESS.UNKNOWN,
                    provenanceFor(null, [])
                );
            }

            var summary = summaries[0];
            var value = {
                patient_id: summary.patient_id,
                identifiers: normalizeIdentifiers(summary.identifiers)
            };
            return makeEnvelope(
                OUTCOMES.OK,
                value,
                null,
                COMPLETENESS.PARTIAL,
                provenanceFor(summary.patient_id, [])
            );
        }

        function readPatientContext(patientId) {
            if (!isNonEmptyString(patientId)) {
                return failureEnvelope(OUTCOMES.ERROR, ERROR_CODES.PATIENT_ID_INVALID);
            }
            var methodMissing = REQUIRED_READ_METHODS.some(function (method) {
                return typeof source[method] !== 'function';
            });
            if (methodMissing) {
                return failureEnvelope(OUTCOMES.UNAVAILABLE, ERROR_CODES.SOURCE_METHOD_UNAVAILABLE);
            }

            var normalizedPatientId = patientId.trim();
            var summary;
            try {
                summary = source.findByPatientId(normalizedPatientId);
            } catch (error) {
                return failureEnvelope(OUTCOMES.ERROR, ERROR_CODES.SOURCE_READ_FAILED);
            }
            if (summary === null || summary === undefined) {
                return makeEnvelope(OUTCOMES.NOT_FOUND, null, null, COMPLETENESS.UNKNOWN, provenanceFor(null, []));
            }
            if (!isPlainObject(summary) || !isNonEmptyString(summary.patient_id)) {
                return failureEnvelope(OUTCOMES.ERROR, ERROR_CODES.SOURCE_READ_FAILED);
            }

            var usable = true;

            var requestGroup = callGroup('getLatestRequestValidation', normalizedPatientId);
            var visitsGroup = callGroup('getVisitsAndLines', normalizedPatientId);
            var promsGroup = callGroup('getProms', normalizedPatientId);
            var adherenceGroup = callGroup('getAdherence', normalizedPatientId);
            var safetyGroup = callGroup('getAdverseEventsAndCausality', normalizedPatientId);
            if (!requestGroup.available || !visitsGroup.available || !promsGroup.available
                || !adherenceGroup.available || !safetyGroup.available) {
                return failureEnvelope(OUTCOMES.ERROR, ERROR_CODES.SOURCE_READ_FAILED);
            }

            var request = null;
            var validation = null;
            if (!isUsableGroupValue(requestGroup.value)) {
                usable = false;
            } else if (isPlainObject(requestGroup.value)) {
                if (isPlainObject(requestGroup.value.latest_request)) {
                    request = projectFields(requestGroup.value.latest_request, REQUEST_FIELDS);
                }
                if (isPlainObject(requestGroup.value.latest_validation)) {
                    validation = projectFields(requestGroup.value.latest_validation, VALIDATION_FIELDS);
                }
            }

            var visits = [];
            var lines = [];
            if (!isUsableGroupValue(visitsGroup.value)) {
                usable = false;
            } else if (isPlainObject(visitsGroup.value)) {
                visits = mapVisitEvents(visitsGroup.value.visits);
                lines = mapLineRows(visitsGroup.value.lines);
            }

            var proms = [];
            if (!isUsableGroupValue(promsGroup.value)) {
                usable = false;
            } else {
                proms = mapItemValues(promsGroup.value, PROMS_FIELDS);
            }

            var adherence = [];
            if (!isUsableGroupValue(adherenceGroup.value)) {
                usable = false;
            } else {
                adherence = mapItemValues(adherenceGroup.value, ADHERENCE_FIELDS);
            }

            var adverseEvents = [];
            var causalityAssessments = [];
            if (!isUsableGroupValue(safetyGroup.value)) {
                usable = false;
            } else if (isPlainObject(safetyGroup.value)) {
                adverseEvents = mapItemValues(safetyGroup.value.adverse_events, ADVERSE_EVENT_FIELDS);
                causalityAssessments = mapItemValues(safetyGroup.value.causality_assessments, CAUSALITY_FIELDS);
            }

            var dto = {
                patient: {
                    patient_id: summary.patient_id,
                    identifiers: normalizeIdentifiers(summary.identifiers)
                },
                request: request,
                validation: validation,
                visits: visits,
                lines: lines,
                proms: proms,
                adherence: adherence,
                safety: {
                    adverse_events: adverseEvents,
                    causality_assessments: causalityAssessments
                }
            };
            var completeness = usable ? COMPLETENESS.PARTIAL : COMPLETENESS.UNKNOWN;
            return makeEnvelope(
                OUTCOMES.OK,
                dto,
                null,
                completeness,
                provenanceFor(summary.patient_id, collectEventIds(dto))
            );
        }

        return Object.freeze({
            contract_version: CONTRACT_VERSION,
            resolvePatient: resolvePatient,
            readPatientContext: readPatientContext
        });
    }

    root.FarmaciaPatientReadContractV2 = Object.freeze({
        CONTRACT_VERSION: CONTRACT_VERSION,
        OUTCOMES: OUTCOMES,
        ERROR_CODES: ERROR_CODES,
        COMPLETENESS: COMPLETENESS,
        FORBIDDEN_DTO_KEYS: FORBIDDEN_DTO_KEYS,
        create: create
    });
})(typeof window !== 'undefined' ? window : globalThis);
