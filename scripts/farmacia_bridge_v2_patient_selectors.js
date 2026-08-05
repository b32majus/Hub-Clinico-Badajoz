/* Deterministic patient selectors for the Farmacia Excel Bridge v2 read model. */
(function (root) {
    'use strict';

    var SUPPORTED_READ_MODEL_VERSION = '1.0.0';
    var REQUEST_FIELDS = [
        'request_id', 'request_origin', 'request_date', 'requested_drug_name',
        'requested_active_ingredient', 'requested_presentation', 'requested_dose_text',
        'requested_route', 'requested_schedule_code', 'requested_schedule_label',
        'requested_schedule_other_text', 'requested_induction_status', 'requested_weight_text',
        'requested_justification', 'request_source_observations', 'requested_selected_drug_id',
        'requested_catalog_source', 'requested_national_code', 'requested_registration_number'
    ];
    var VALIDATION_FIELDS = [
        'validation_id', 'validation_type', 'validation_result', 'validation_pending_reason',
        'validation_denial_reason', 'validated_treatment_relation', 'validated_drug_name',
        'validated_active_ingredient', 'validated_presentation', 'validated_dose_text',
        'validated_route', 'validated_schedule_code', 'validated_schedule_label',
        'validated_schedule_other_text', 'validated_induction_status', 'validated_selected_drug_id',
        'validated_catalog_source', 'validated_national_code', 'validated_registration_number',
        'validated_treatment_id', 'validated_line_id', 'line_creation_status'
    ];
    var ADHERENCE_FIELDS = [
        'adherence_collection_status', 'adherence_instrument', 'adherence_result',
        'adherence_answers_json'
    ];
    var ADVERSE_EVENT_FIELDS = [
        'adverse_event_id', 'adverse_event_status', 'adverse_event_description',
        'adverse_event_severity', 'adverse_event_resolution_status', 'adverse_event_action',
        'adverse_event_suspects_json'
    ];
    var CAUSALITY_FIELDS = ['causality_assessments_json'];

    function own(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function clone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function compareText(left, right) {
        var a = String(left);
        var b = String(right);
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    }

    function compareOptional(left, right) {
        var leftMissing = left === null || left === undefined || left === '';
        var rightMissing = right === null || right === undefined || right === '';
        if (leftMissing && rightMissing) return 0;
        if (leftMissing) return -1;
        if (rightMissing) return 1;
        return compareText(left, right);
    }

    function canonicalRows(event) {
        return event.rows.map(function (row) { return row.canonical_row; });
    }

    function firstCanonicalRow(event) {
        return event && event.rows.length ? event.rows[0].canonical_row : null;
    }

    function eventDate(event, field) {
        var row = firstCanonicalRow(event);
        return row && own(row, field) ? row[field] : null;
    }

    function compareEvents(leftEntry, rightEntry) {
        var result = compareOptional(eventDate(leftEntry.event, 'occurred_at'), eventDate(rightEntry.event, 'occurred_at'));
        if (result) return result;
        result = compareOptional(eventDate(leftEntry.event, 'recorded_at'), eventDate(rightEntry.event, 'recorded_at'));
        if (result) return result;
        result = compareOptional(leftEntry.event.source_event_id, rightEntry.event.source_event_id);
        if (result) return result;
        // The original read-model position is the final stable tie-breaker.
        return leftEntry.position - rightEntry.position;
    }

    function projectFields(row, fields) {
        if (!row) return null;
        var result = {};
        fields.forEach(function (field) {
            result[field] = own(row, field) ? clone(row[field]) : null;
        });
        return result;
    }

    function validateReadModel(readModel) {
        if (!isObject(readModel)) throw new TypeError('Bridge v2 read model no disponible.');
        if (readModel.read_model_version !== SUPPORTED_READ_MODEL_VERSION) throw new TypeError('Versión de read model Bridge v2 no compatible.');
        if (!isObject(readModel.metadata) || readModel.metadata.format !== 'farmacia_bridge_v2_raw') throw new TypeError('Metadata mínima Bridge v2 no compatible.');
        if (!isObject(readModel.patients)) throw new TypeError('patients debe ser un objeto.');
        if (!Array.isArray(readModel.events)) throw new TypeError('events debe ser un array.');
        if (!isObject(readModel.indexes) || !isObject(readModel.indexes.by_patient_id) || !isObject(readModel.indexes.by_identifier)) {
            throw new TypeError('Índices mínimos Bridge v2 no disponibles.');
        }
        Object.keys(readModel.patients).forEach(function (patientId) {
            var patient = readModel.patients[patientId];
            if (!isObject(patient) || patient.patient_id !== patientId || !Array.isArray(patient.identifiers)
                || !own(readModel.indexes.by_patient_id, patientId) || !Array.isArray(readModel.indexes.by_patient_id[patientId])) {
                throw new TypeError('Estructura mínima de paciente Bridge v2 no compatible.');
            }
            patient.identifiers.forEach(function (identifier) {
                if (!isObject(identifier) || typeof identifier.identifier_system !== 'string' || typeof identifier.identifier_value !== 'string') {
                    throw new TypeError('Identificador Bridge v2 no compatible.');
                }
            });
        });
        readModel.events.forEach(function (event) {
            if (!isObject(event) || typeof event.patient_id !== 'string' || typeof event.source_event_id !== 'string'
                || !own(readModel.patients, event.patient_id) || !Array.isArray(event.rows) || event.rows.length < 1
                || readModel.indexes.by_patient_id[event.patient_id].indexOf(event.source_event_id) === -1) {
                throw new TypeError('Estructura mínima de evento Bridge v2 no compatible.');
            }
            event.rows.forEach(function (row) {
                if (!isObject(row) || !isObject(row.canonical_row)
                    || row.canonical_row.patient_id !== event.patient_id
                    || row.canonical_row.source_event_id !== event.source_event_id) {
                    throw new TypeError('Fila canónica Bridge v2 no disponible.');
                }
            });
        });
        Object.keys(readModel.indexes.by_identifier).forEach(function (system) {
            var values = readModel.indexes.by_identifier[system];
            if (!isObject(values)) throw new TypeError('Índice de identificador Bridge v2 no compatible.');
            Object.keys(values).forEach(function (value) {
                var mapping = values[value];
                if (!isObject(mapping) || typeof mapping.patient_id !== 'string' || !own(readModel.patients, mapping.patient_id)) {
                    throw new TypeError('Mapeo de identificador Bridge v2 no compatible.');
                }
            });
        });
    }

    function create(readModel) {
        validateReadModel(readModel);

        var sortedEntries = readModel.events.map(function (event, position) {
            return { event: event, position: position };
        }).sort(compareEvents);

        function eventsFor(patientId) {
            return sortedEntries.filter(function (entry) {
                return entry.event.patient_id === patientId;
            });
        }

        function summaryFor(patientId) {
            if (typeof patientId !== 'string' || !own(readModel.patients, patientId)) return null;
            var patient = readModel.patients[patientId];
            var identifiers = Array.isArray(patient.identifiers) ? clone(patient.identifiers) : [];
            identifiers.sort(function (left, right) {
                return compareText(left.identifier_system, right.identifier_system) || compareText(left.identifier_value, right.identifier_value);
            });
            return {
                patient_id: patientId,
                identifiers: identifiers,
                event_count: eventsFor(patientId).length
            };
        }

        function listPatientSummaries() {
            return Object.keys(readModel.patients).map(summaryFor).sort(function (left, right) {
                var leftIdentifier = left.identifiers[0];
                var rightIdentifier = right.identifiers[0];
                if (leftIdentifier && rightIdentifier) {
                    return compareText(leftIdentifier.identifier_system, rightIdentifier.identifier_system)
                        || compareText(leftIdentifier.identifier_value, rightIdentifier.identifier_value)
                        || compareText(left.patient_id, right.patient_id);
                }
                if (leftIdentifier) return -1;
                if (rightIdentifier) return 1;
                return compareText(left.patient_id, right.patient_id);
            });
        }

        function findByIdentifier(identifierSystem, identifierValue) {
            if (typeof identifierSystem !== 'string' || typeof identifierValue !== 'string') return null;
            var system = identifierSystem.trim();
            var value = identifierValue.trim();
            if (!system || !value) return null;
            var systems = Object.keys(readModel.indexes.by_identifier);
            for (var systemIndex = 0; systemIndex < systems.length; systemIndex++) {
                var storedSystem = systems[systemIndex];
                if (storedSystem.trim() !== system) continue;
                var values = readModel.indexes.by_identifier[storedSystem];
                var storedValues = Object.keys(values);
                for (var valueIndex = 0; valueIndex < storedValues.length; valueIndex++) {
                    var storedValue = storedValues[valueIndex];
                    if (storedValue.trim() !== value) continue;
                    return summaryFor(values[storedValue].patient_id);
                }
            }
            return null;
        }

        function findByPatientId(patientId) {
            if (typeof patientId !== 'string') return null;
            return summaryFor(patientId.trim());
        }

        function getPatientEvents(patientId) {
            return eventsFor(patientId).map(function (entry) { return clone(entry.event); });
        }

        function getLatestEventOfType(patientId, eventType) {
            var matches = eventsFor(patientId).filter(function (entry) {
                return entry.event.event_type === eventType;
            });
            return matches.length ? clone(matches[matches.length - 1].event) : null;
        }

        function getLatestLineSnapshots(patientId) {
            var latest = Object.create(null);
            eventsFor(patientId).forEach(function (entry, eventPosition) {
                entry.event.rows.forEach(function (physicalRow, physicalPosition) {
                    var row = physicalRow.canonical_row;
                    if (typeof row.line_id !== 'string' || row.line_id.trim() === '') return;
                    var rowIndex = Number.isInteger(row.row_index) ? row.row_index : -1;
                    var candidate = {
                        event_position: eventPosition,
                        row_index: rowIndex,
                        physical_position: physicalPosition,
                        value: {
                            source_event_id: entry.event.source_event_id,
                            event_id: entry.event.event_id,
                            event_type: entry.event.event_type,
                            source_sheet: physicalRow.source_sheet,
                            source_table: physicalRow.source_table,
                            physical_row_number: physicalRow.physical_row_number,
                            treatment_id: clone(row.treatment_id),
                            line_id: clone(row.line_id),
                            snapshot: clone(row)
                        }
                    };
                    var previous = latest[row.line_id];
                    if (!previous || candidate.event_position > previous.event_position
                        || (candidate.event_position === previous.event_position && candidate.row_index > previous.row_index)
                        || (candidate.event_position === previous.event_position && candidate.row_index === previous.row_index && candidate.physical_position > previous.physical_position)) {
                        latest[row.line_id] = candidate;
                    }
                });
            });
            return Object.keys(latest).sort(compareText).map(function (lineId) { return latest[lineId].value; });
        }

        function uniqueContexts(patientEvents, codeField, labelField) {
            var seen = Object.create(null);
            var values = [];
            patientEvents.forEach(function (event) {
                canonicalRows(event).forEach(function (row) {
                    var code = own(row, codeField) ? row[codeField] : null;
                    var label = own(row, labelField) ? row[labelField] : null;
                    if (code === null && label === null) return;
                    var key = JSON.stringify([code, label]);
                    if (seen[key]) return;
                    seen[key] = true;
                    values.push({ code: clone(code), label: clone(label) });
                });
            });
            return values.sort(function (left, right) {
                return compareOptional(left.label, right.label) || compareOptional(left.code, right.code);
            });
        }

        function rowRecords(patientEvents, eventTypes, fields) {
            var records = [];
            patientEvents.forEach(function (event) {
                if (eventTypes.indexOf(event.event_type) === -1) return;
                event.rows.forEach(function (physicalRow) {
                    records.push({
                        source_event_id: event.source_event_id,
                        event_id: event.event_id,
                        row_index: physicalRow.canonical_row.row_index,
                        values: projectFields(physicalRow.canonical_row, fields)
                    });
                });
            });
            return records;
        }

        function getPatientQuickView(patientId) {
            var patient = summaryFor(patientId);
            if (!patient) return null;
            var timeline = getPatientEvents(patientId);
            var sourceEventIds = Object.create(null);
            timeline.forEach(function (event) { sourceEventIds[event.source_event_id] = true; });
            var excluded = (Array.isArray(readModel.excluded_events) ? readModel.excluded_events : []).filter(function (event) {
                var attributed = event.patient_id === patientId || sourceEventIds[event.source_event_id];
                if (attributed) sourceEventIds[event.source_event_id] = true;
                return attributed;
            });
            var warnings = (Array.isArray(readModel.warnings) ? readModel.warnings : []).filter(function (warning) {
                return warning.patient_id === patientId || sourceEventIds[warning.source_event_id];
            });
            var sourceErrors = (Array.isArray(readModel.source_errors) ? readModel.source_errors : []).filter(function (error) {
                return error.patient_id === patientId || sourceEventIds[error.source_event_id];
            });
            var latestValidation = getLatestEventOfType(patientId, 'pharmacy_validation');
            var validationRow = firstCanonicalRow(latestValidation);
            var metadata = readModel.metadata;
            return {
                patient_id: patientId,
                identifiers: patient.identifiers,
                services: uniqueContexts(timeline, 'service_code', 'service_label'),
                pathologies: uniqueContexts(timeline, 'pathology_code', 'pathology_label'),
                valid_event_count: timeline.length,
                excluded_event_count: excluded.length,
                source_error_count: sourceErrors.length,
                warnings: clone(warnings),
                timeline: timeline,
                latest_request: projectFields(validationRow, REQUEST_FIELDS),
                latest_validation: projectFields(validationRow, VALIDATION_FIELDS),
                latest_first_visit: getLatestEventOfType(patientId, 'pharmacy_first_visit'),
                latest_followup: getLatestEventOfType(patientId, 'pharmacy_followup'),
                lines: getLatestLineSnapshots(patientId),
                structured_proms: rowRecords(timeline, ['pharmacy_first_visit', 'pharmacy_followup'], ['proms_json']),
                adherence: rowRecords(timeline, ['pharmacy_followup'], ADHERENCE_FIELDS),
                adverse_events: rowRecords(timeline, ['pharmacy_followup'], ADVERSE_EVENT_FIELDS),
                causality_assessments: rowRecords(timeline, ['pharmacy_followup'], CAUSALITY_FIELDS),
                workbook: {
                    file_name: clone(metadata.file_name),
                    imported_at: clone(metadata.imported_at),
                    row_count: clone(metadata.row_count),
                    event_count: clone(metadata.event_count),
                    patient_count: clone(metadata.patient_count),
                    read_model_version: readModel.read_model_version,
                    storage: 'runtime_memory'
                }
            };
        }

        return Object.freeze({
            listPatientSummaries: listPatientSummaries,
            findByIdentifier: findByIdentifier,
            findByPatientId: findByPatientId,
            getPatientEvents: getPatientEvents,
            getLatestEventOfType: getLatestEventOfType,
            getLatestLineSnapshots: getLatestLineSnapshots,
            getPatientQuickView: getPatientQuickView
        });
    }

    root.FarmaciaBridgeV2PatientSelectors = Object.freeze({ create: create });
})(typeof window !== 'undefined' ? window : globalThis);
