/* Pure population projection and CSV contract for Farmacia statistics. */
(function (root) {
    'use strict';

    var VERSION = 'farmacia_stats_cohort_v1';
    var CSV_COLUMNS = [
        'stats_schema_version', 'source_mode', 'source_file_name', 'patient_id',
        'primary_identifier_value', 'identifiers_json', 'services_json', 'pathologies_json',
        'valid_event_count', 'excluded_event_count', 'warning_count', 'source_error_count',
        'latest_event_type', 'latest_event_date', 'request_date', 'validation_result',
        'first_visit_date', 'latest_followup_date', 'line_count', 'active_line_count',
        'drug_name_values', 'active_ingredient_values', 'presentation_values', 'dose_text_values',
        'route_values', 'schedule_code_values', 'schedule_label_values', 'treatment_lines_json',
        'proms_json', 'latest_adherence_collection_status', 'latest_adherence_instrument',
        'latest_adherence_result', 'adverse_event_overall_status', 'adverse_events_json',
        'causality_assessments_json', 'therapeutic_movements_json', 'provenance_json'
    ];

    function own(value, key) {
        return Object.prototype.hasOwnProperty.call(value || {}, key);
    }

    function present(value) {
        return value !== null && value !== undefined && (typeof value !== 'string' || value.trim() !== '');
    }

    function clone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function compareText(left, right) {
        var a = String(left === null || left === undefined ? '' : left);
        var b = String(right === null || right === undefined ? '' : right);
        return a < b ? -1 : (a > b ? 1 : 0);
    }

    function canonicalValue(value) {
        if (Array.isArray(value)) return value.map(canonicalValue);
        if (value && typeof value === 'object') {
            var result = {};
            Object.keys(value).sort(compareText).forEach(function (key) {
                result[key] = canonicalValue(value[key]);
            });
            return result;
        }
        return value;
    }

    function canonicalJson(value) {
        return JSON.stringify(canonicalValue(value));
    }

    function parseJsonValue(value) {
        if (typeof value !== 'string') return value;
        try { return JSON.parse(value); } catch (error) { return null; }
    }

    function jsonItems(value) {
        var parsed = parseJsonValue(value);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.measurements)) return parsed.measurements;
        return parsed && typeof parsed === 'object' ? [parsed] : [];
    }

    function firstCanonicalRow(event) {
        return event && Array.isArray(event.rows) && event.rows[0]
            ? event.rows[0].canonical_row || {} : {};
    }

    function firstPresent() {
        for (var index = 0; index < arguments.length; index += 1) {
            if (present(arguments[index])) return arguments[index];
        }
        return '';
    }

    function eventDate(event) {
        var row = firstCanonicalRow(event);
        return firstPresent(row.visit_date, row.first_visit_date, row.request_date,
            row.movement_effective_date, row.occurred_at, event && event.occurred_at,
            row.recorded_at, event && event.recorded_at);
    }

    function eventMap(events) {
        var result = {};
        (events || []).forEach(function (event, index) {
            result[event.source_event_id] = { date: eventDate(event), position: index };
        });
        return result;
    }

    function normalizeEvents(events) {
        return (events || []).map(function (event, index) {
            var row = firstCanonicalRow(event);
            return {
                source_event_id: event.source_event_id || '',
                event_id: event.event_id || '',
                event_type: event.event_type || '',
                event_date: eventDate(event),
                occurred_at: firstPresent(row.occurred_at, event.occurred_at),
                recorded_at: firstPresent(row.recorded_at, event.recorded_at),
                source_sheet: event.source_sheet || '',
                source_table: event.source_table || '',
                stable_position: index
            };
        }).sort(function (left, right) {
            return compareText(left.event_date, right.event_date)
                || compareText(left.source_event_id, right.source_event_id)
                || left.stable_position - right.stable_position;
        });
    }

    function normalizeEvent(event) {
        if (!event) return null;
        var normalized = normalizeEvents([event]);
        return normalized.length ? normalized[0] : null;
    }

    function normalizeContexts(values) {
        var seen = {};
        return (values || []).map(function (value) {
            return { code: present(value && value.code) ? clone(value.code) : null, label: present(value && value.label) ? clone(value.label) : null };
        }).filter(function (value) {
            if (!present(value.code) && !present(value.label)) return false;
            var key = canonicalJson(value);
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        }).sort(function (left, right) {
            return compareText(left.label, right.label) || compareText(left.code, right.code);
        });
    }

    function normalizeIdentifiers(values) {
        var seen = {};
        return (values || []).map(function (value) {
            return {
                identifier_system: present(value && value.identifier_system) ? String(value.identifier_system) : '',
                identifier_value: present(value && value.identifier_value) ? String(value.identifier_value) : ''
            };
        }).filter(function (value) {
            if (!value.identifier_system || !value.identifier_value) return false;
            var key = canonicalJson(value);
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        }).sort(function (left, right) {
            return compareText(left.identifier_system, right.identifier_system)
                || compareText(left.identifier_value, right.identifier_value);
        });
    }

    function normalizeRequest(request) {
        var value = request || {};
        return {
            request_id: value.request_id || '',
            request_date: value.request_date || '',
            requested_drug_name: value.requested_drug_name || '',
            requested_active_ingredient: value.requested_active_ingredient || '',
            requested_presentation: value.requested_presentation || '',
            requested_dose_text: value.requested_dose_text || '',
            requested_route: value.requested_route || '',
            requested_schedule_code: value.requested_schedule_code || '',
            requested_schedule_label: value.requested_schedule_label || ''
        };
    }

    function normalizeValidation(validation) {
        var value = validation || {};
        return {
            validation_id: value.validation_id || '',
            validation_result: value.validation_result || '',
            validated_drug_name: value.validated_drug_name || '',
            validated_active_ingredient: value.validated_active_ingredient || '',
            validated_presentation: value.validated_presentation || '',
            validated_dose_text: value.validated_dose_text || '',
            validated_route: value.validated_route || '',
            validated_schedule_code: value.validated_schedule_code || '',
            validated_schedule_label: value.validated_schedule_label || '',
            validated_treatment_id: value.validated_treatment_id || '',
            validated_line_id: value.validated_line_id || ''
        };
    }

    function normalizeLines(values) {
        return (values || []).map(function (entry) {
            var row = entry && entry.snapshot || {};
            var active = row.active_at_event === true ? true : (row.active_at_event === false ? false : null);
            return {
                source_event_id: entry && entry.source_event_id || '',
                event_id: entry && entry.event_id || '',
                event_type: entry && entry.event_type || '',
                treatment_id: entry && entry.treatment_id || '',
                line_id: entry && entry.line_id || '',
                line_role: row.line_role || '',
                is_primary_line: row.is_primary_line === true ? true : (row.is_primary_line === false ? false : null),
                line_status_at_event: row.line_status_at_event || '',
                active_at_event: active,
                activity_state: active === true ? 'active' : (active === false ? 'inactive' : 'not_recorded'),
                drug_name: row.line_drug_name || '',
                active_ingredient: row.line_active_ingredient || '',
                presentation: row.line_presentation || '',
                dose_text: row.line_dose_text || '',
                route: row.line_route || '',
                schedule_code: row.line_schedule_code || '',
                schedule_label: firstPresent(row.line_schedule_label, row.line_schedule_other_text)
            };
        }).sort(function (left, right) {
            return compareText(left.line_id, right.line_id)
                || compareText(left.source_event_id, right.source_event_id);
        });
    }

    function normalizeProms(records, dates) {
        var result = [];
        var seen = {};
        (records || []).forEach(function (record) {
            var values = record && record.values || {};
            jsonItems(values.proms_json).forEach(function (item) {
                if (!item || typeof item !== 'object') return;
                var key = String(record.source_event_id || '') + '\u0000' + canonicalJson(item);
                if (seen[key]) return;
                seen[key] = true;
                var chronology = dates[record.source_event_id] || {};
                var normalized = {
                    source_event_id: record.source_event_id || '',
                    event_id: record.event_id || '',
                    event_date: present(item.date) ? item.date : (chronology.date || ''),
                    event_position: Number.isInteger(chronology.position) ? chronology.position : -1,
                    instrument: firstPresent(item.instrument, item.type, item.tipo_prom),
                    content: clone(item)
                };
                if (own(item, 'value')) normalized.value = clone(item.value);
                else if (own(item, 'valor')) normalized.value = clone(item.valor);
                result.push(normalized);
            });
        });
        return result.sort(function (left, right) {
            return left.event_position - right.event_position
                || compareText(left.source_event_id, right.source_event_id)
                || compareText(left.event_date, right.event_date)
                || compareText(canonicalJson(left.content), canonicalJson(right.content));
        });
    }

    function latestActProms(proms) {
        if (!proms || !proms.length) return [];
        var latest = proms[proms.length - 1];
        return proms.filter(function (prom) {
            return prom.event_position === latest.event_position
                && prom.source_event_id === latest.source_event_id;
        }).map(clone);
    }

    function normalizeAdherence(records, dates) {
        var result = [];
        var seen = {};
        (records || []).forEach(function (record) {
            var values = record && record.values || {};
            var normalizedValues = {
                collection_status: own(values, 'adherence_collection_status') ? clone(values.adherence_collection_status) : null,
                instrument: own(values, 'adherence_instrument') ? clone(values.adherence_instrument) : null,
                result: own(values, 'adherence_result') ? clone(values.adherence_result) : null,
                answers: own(values, 'adherence_answers_json') ? clone(values.adherence_answers_json) : null
            };
            if (!present(normalizedValues.collection_status) && !present(normalizedValues.instrument)
                && !present(normalizedValues.result) && !present(normalizedValues.answers)) return;
            var key = String(record.source_event_id || '') + '\u0000' + canonicalJson(normalizedValues);
            if (seen[key]) return;
            seen[key] = true;
            result.push({
                source_event_id: record.source_event_id || '',
                event_id: record.event_id || '',
                event_date: dates[record.source_event_id] && dates[record.source_event_id].date || '',
                event_position: dates[record.source_event_id] && dates[record.source_event_id].position || 0,
                row_index: Number.isInteger(record.row_index) ? record.row_index : 0,
                collection_status: normalizedValues.collection_status,
                instrument: normalizedValues.instrument,
                result: normalizedValues.result,
                answers: normalizedValues.answers
            });
        });
        return result.sort(function (left, right) {
            return compareText(left.event_date, right.event_date)
                || left.event_position - right.event_position
                || left.row_index - right.row_index
                || compareText(canonicalJson(left), canonicalJson(right));
        });
    }

    function adherenceSummary(records) {
        var latest = records && records.length ? records[records.length - 1] : null;
        var applicable = latest ? records.filter(function (record) {
            return record.source_event_id === latest.source_event_id;
        }) : [];
        var values = [];
        var seen = {};
        var instruments = [];
        var instrumentSeen = {};
        var collectionStatuses = [];
        var collectionSeen = {};
        applicable.forEach(function (record) {
            if (present(record.instrument)) {
                var instrumentKey = canonicalJson(record.instrument);
                if (!instrumentSeen[instrumentKey]) {
                    instrumentSeen[instrumentKey] = true;
                    instruments.push(clone(record.instrument));
                }
            }
            if (present(record.collection_status)) {
                var collectionKey = canonicalJson(record.collection_status);
                if (!collectionSeen[collectionKey]) {
                    collectionSeen[collectionKey] = true;
                    collectionStatuses.push(clone(record.collection_status));
                }
            }
            if (!present(record.result)) return;
            var key = canonicalJson(record.result);
            if (!seen[key]) {
                seen[key] = true;
                values.push(clone(record.result));
            }
        });
        return {
            collection_status: collectionStatuses.length === 0 ? 'not_recorded' : (collectionStatuses.length === 1 ? collectionStatuses[0] : 'multiple'),
            instrument: instruments.length === 0 ? '' : (instruments.length === 1 ? instruments[0] : 'multiple'),
            result: values.length === 0 ? 'not_recorded' : (values.length === 1 ? values[0] : 'multiple'),
            explicit_results: values
        };
    }

    function normalizeSafety(records, dates) {
        var normalized = [];
        var seen = {};
        (records || []).forEach(function (record, index) {
            var values = record && record.values || {};
            var status = values.adverse_event_status;
            if (status !== 'present' && status !== 'absent' && status !== 'not_recorded') status = 'not_recorded';
            var item = {
                adverse_event_id: values.adverse_event_id || '',
                status: status,
                severity: values.adverse_event_severity || '',
                resolution_status: values.adverse_event_resolution_status || '',
                action: values.adverse_event_action || '',
                suspects: clone(values.adverse_event_suspects_json || []),
                source_event_id: record.source_event_id || '',
                event_id: record.event_id || '',
                event_date: dates[record.source_event_id] && dates[record.source_event_id].date || '',
                event_position: dates[record.source_event_id] && dates[record.source_event_id].position || 0,
                stable_position: index
            };
            var key = item.source_event_id + '\u0000' + String(record.row_index || '') + '\u0000' + canonicalJson(item);
            if (seen[key]) return;
            seen[key] = true;
            normalized.push(item);
        });
        normalized.sort(function (left, right) {
            return compareText(left.event_date, right.event_date)
                || left.event_position - right.event_position
                || left.stable_position - right.stable_position;
        });

        var byId = {};
        var noId = [];
        normalized.forEach(function (item) {
            if (item.adverse_event_id) byId[item.adverse_event_id] = item;
            else noId.push(item);
        });
        var current = Object.keys(byId).sort(compareText).map(function (key) { return byId[key]; });
        var latestNoId = noId.length ? noId[noId.length - 1] : null;
        if (latestNoId && latestNoId.status !== 'not_recorded') current.push(latestNoId);
        var overall = current.some(function (item) { return item.status === 'present'; }) ? 'present'
            : (current.some(function (item) { return item.status === 'absent'; }) ? 'absent' : 'not_recorded');
        return { records: current, overall_status: overall };
    }

    function normalizeCausality(records, dates) {
        var result = [];
        var seen = {};
        (records || []).forEach(function (record) {
            var values = record && record.values || {};
            jsonItems(values.causality_assessments_json).forEach(function (item) {
                if (!item || typeof item !== 'object') return;
                var key = String(record.source_event_id || '') + '\u0000' + canonicalJson(item);
                if (seen[key]) return;
                seen[key] = true;
                result.push({
                    source_event_id: record.source_event_id || '',
                    event_id: record.event_id || '',
                    event_date: dates[record.source_event_id] && dates[record.source_event_id].date || '',
                    assessment: clone(item)
                });
            });
        });
        return result.sort(function (left, right) {
            return compareText(left.event_date, right.event_date)
                || compareText(left.source_event_id, right.source_event_id)
                || compareText(canonicalJson(left.assessment), canonicalJson(right.assessment));
        });
    }

    function normalizeMovements(events) {
        var result = [];
        var seen = {};
        (events || []).forEach(function (event) {
            (event.rows || []).forEach(function (physicalRow) {
                var row = physicalRow.canonical_row || {};
                var type = row.therapeutic_movement_type;
                if (type === 'suspension' || row.suspension_status === 'yes') type = 'suspension';
                if (!present(type) || type === 'not_recorded' || type === 'no_change_recorded') return;
                var movement = {
                    source_event_id: event.source_event_id || '',
                    event_id: event.event_id || '',
                    event_date: firstPresent(type === 'suspension' ? row.suspension_effective_date : '', row.movement_effective_date, row.visit_date, row.occurred_at, event.occurred_at),
                    line_id: row.line_id || '',
                    treatment_id: row.treatment_id || '',
                    type: type,
                    new_dose_text: row.new_dose_text || '',
                    new_schedule_code: row.new_schedule_code || '',
                    new_schedule_label: firstPresent(row.new_schedule_label, row.new_schedule_other_text),
                    new_route: row.new_route || ''
                };
                var key = canonicalJson(movement);
                if (seen[key]) return;
                seen[key] = true;
                result.push(movement);
            });
        });
        return result.sort(function (left, right) {
            return compareText(left.event_date, right.event_date)
                || compareText(left.source_event_id, right.source_event_id)
                || compareText(left.line_id, right.line_id);
        });
    }

    function careStatus(latestValidation, latestFollowup) {
        if (latestFollowup) return 'followup';
        var result = latestValidation && latestValidation.validation_result;
        return result === 'validated' || result === 'denied' || result === 'pending' ? result : 'not_recorded';
    }

    function rawPatient(dataPort, summary, metadata) {
        var patientId = summary.patient_id;
        var projection = dataPort.getPatientProjection(patientId) || {};
        var sourceEvents = dataPort.getPatientEvents(patientId) || [];
        var requestValidation = dataPort.getLatestRequestValidation(patientId) || {};
        var visits = dataPort.getVisitsAndLines(patientId) || {};
        var promRecords = dataPort.getProms(patientId) || [];
        var adherenceRecords = dataPort.getAdherence(patientId) || [];
        var safety = dataPort.getAdverseEventsAndCausality(patientId) || {};
        var identifiers = normalizeIdentifiers(projection.identifiers || summary.identifiers);
        var dates = eventMap(sourceEvents);
        var events = normalizeEvents(sourceEvents);
        var lines = normalizeLines(visits.lines);
        var proms = normalizeProms(promRecords, dates);
        var adherence = normalizeAdherence(adherenceRecords, dates);
        var safetyResult = normalizeSafety(safety.adverse_events || [], dates);
        var causality = normalizeCausality(safety.causality_assessments || [], dates);
        var warnings = Array.isArray(projection.warnings) ? clone(projection.warnings) : [];
        var latestRequest = normalizeRequest(requestValidation.latest_request);
        var latestValidation = normalizeValidation(requestValidation.latest_validation);
        return {
            stats_schema_version: VERSION,
            source_mode: 'raw',
            source_file_name: metadata.fileName || metadata.source_file_name || '',
            imported_at: metadata.importedAt || metadata.imported_at || '',
            patient_id: patientId,
            identifiers: identifiers,
            primary_identifier_value: identifiers.length === 1 ? identifiers[0].identifier_value : '',
            name: '',
            age: '',
            sex: '',
            services: normalizeContexts(projection.services),
            pathologies: normalizeContexts(projection.pathologies),
            valid_event_count: Number(projection.valid_event_count || summary.event_count || events.length || 0),
            excluded_event_count: Number(projection.excluded_event_count || 0),
            warnings: warnings,
            warning_count: warnings.length,
            source_errors: [],
            source_error_count: Number(projection.source_error_count || 0),
            events: events,
            latest_request: latestRequest,
            latest_validation: latestValidation,
            latest_first_visit: normalizeEvent(visits.latest_first_visit),
            latest_followup: normalizeEvent(visits.latest_followup),
            care_status: careStatus(latestValidation, visits.latest_followup),
            lines: lines,
            proms: proms,
            latest_proms: latestActProms(proms),
            clinical_activity: null,
            adherence: adherence,
            adherence_summary: adherenceSummary(adherence),
            adverse_events: safetyResult.records,
            adverse_event_overall_status: safetyResult.overall_status,
            causality_assessments: causality,
            therapeutic_movements: normalizeMovements(sourceEvents),
            provenance: events.map(function (event) {
                return {
                    source_event_id: event.source_event_id,
                    event_id: event.event_id,
                    event_type: event.event_type,
                    source_sheet: event.source_sheet,
                    source_table: event.source_table
                };
            })
        };
    }

    function buildRawCohort(dataPort, metadata) {
        if (!dataPort || typeof dataPort.getPopulationProjection !== 'function') {
            throw new TypeError('STATISTICS_DATA_PORT_REQUIRED');
        }
        var required = ['getPatientProjection', 'getPatientEvents', 'getLatestRequestValidation',
            'getVisitsAndLines', 'getProms', 'getAdherence', 'getAdverseEventsAndCausality'];
        required.forEach(function (method) {
            if (typeof dataPort[method] !== 'function') throw new TypeError('STATISTICS_DATA_PORT_METHOD_REQUIRED: ' + method);
        });
        var seen = {};
        var cohort = [];
        (dataPort.getPopulationProjection() || []).forEach(function (summary) {
            if (!summary || !present(summary.patient_id) || seen[summary.patient_id]) return;
            seen[summary.patient_id] = true;
            cohort.push(rawPatient(dataPort, summary, metadata || {}));
        });
        return cohort.sort(function (left, right) {
            return compareText(left.primary_identifier_value, right.primary_identifier_value)
                || compareText(left.patient_id, right.patient_id);
        });
    }

    function demoEvent(type, date, index) {
        return {
            source_event_id: '', event_id: '', event_type: type || '', event_date: date || '',
            occurred_at: date || '', recorded_at: '', source_sheet: '', source_table: '', stable_position: index
        };
    }

    function demoLines(patient) {
        return (patient.tratamientos || []).map(function (line) {
            var active = line.activo === true ? true : (line.activo === false ? false : null);
            return {
                source_event_id: '', event_id: '', event_type: '', treatment_id: line.id || '',
                line_id: line.linea_id || '', line_role: '', is_primary_line: null,
                line_status_at_event: line.estado_linea || '', active_at_event: active,
                activity_state: active === true ? 'active' : (active === false ? 'inactive' : 'not_recorded'),
                drug_name: line.nombre_comercial || '', active_ingredient: line.principio_activo || '',
                presentation: line.presentacion_dosis || '', dose_text: line.presentacion_dosis || '',
                route: line.via || '', schedule_code: '', schedule_label: line.pauta || ''
            };
        }).sort(function (left, right) {
            return compareText(left.line_id, right.line_id) || compareText(left.treatment_id, right.treatment_id);
        });
    }

    function demoProms(patient) {
        return (patient.proms || []).map(function (prom) {
            return {
                source_event_id: prom.id || '', event_id: prom.id || '', event_date: prom.fecha || '',
                instrument: prom.tipo_prom || '', value: own(prom, 'valor') ? clone(prom.valor) : null,
                content: clone(prom)
            };
        }).sort(function (left, right) {
            return compareText(left.event_date, right.event_date) || compareText(left.source_event_id, right.source_event_id);
        }).map(function (prom, index) {
            prom.event_position = index;
            return prom;
        });
    }

    function demoAdherence(patient) {
        return (patient.adherencia || []).map(function (item) {
            return {
                source_event_id: item.id || '', event_id: item.id || '', event_date: item.fecha || '',
                collection_status: 'recorded', instrument: item.escala || '',
                result: own(item, 'resultado') ? clone(item.resultado) : null, answers: null
            };
        }).sort(function (left, right) {
            return compareText(left.event_date, right.event_date) || compareText(left.source_event_id, right.source_event_id);
        });
    }

    function demoPatient(patient, metadata, index) {
        var identifiers = normalizeIdentifiers(patient.cip ? [{ identifier_system: 'demo_cip', identifier_value: patient.cip }] : []);
        var events = (patient.episodios_asistenciales || []).map(function (event, eventIndex) {
            return demoEvent(event.tipo, event.fecha, eventIndex);
        }).sort(function (left, right) { return compareText(left.event_date, right.event_date) || left.stable_position - right.stable_position; });
        var lines = demoLines(patient);
        var proms = demoProms(patient);
        var adherence = demoAdherence(patient);
        var adverse = (patient.eventos_adversos || []).map(function (event) {
            return {
                adverse_event_id: event.ea_id || event.id || '', status: 'present',
                severity: event.gravedad || '', resolution_status: own(event, 'resuelto') ? event.resuelto : '',
                action: event.accion_tomada || '', suspects: clone(event.sospechosos || []),
                source_event_id: event.id || '', event_id: event.id || '', event_date: event.fecha || '', stable_position: 0
            };
        });
        var causality = [];
        (patient.eventos_adversos || []).forEach(function (event) {
            if (!event.causalidad) return;
            causality.push({
                source_event_id: event.id || '', event_id: event.id || '', event_date: event.fecha || '',
                assessment: clone(event.causalidad)
            });
        });
        var movements = (patient.cambios_pauta || []).map(function (movement) {
            return {
                source_event_id: movement.id || '', event_id: movement.id || '', event_date: movement.fecha || '',
                line_id: movement.line_id || '', treatment_id: movement.tratamiento_id || '', type: movement.tipo || '',
                new_dose_text: '', new_schedule_code: '', new_schedule_label: '', new_route: ''
            };
        });
        var latestFirstVisit = null;
        var latestFollowup = null;
        events.forEach(function (event) {
            if (/primera visita/i.test(event.event_type)) latestFirstVisit = event;
            if (/seguimiento/i.test(event.event_type)) latestFollowup = event;
        });
        var validationResult = 'not_recorded';
        (patient.tratamientos || []).forEach(function (line) {
            var explicit = String(line.estado_validacion_farmacia || '').toLowerCase();
            if (explicit === 'validado') validationResult = 'validated';
            else if (explicit === 'pendiente') validationResult = 'pending';
            else if (explicit === 'denegado') validationResult = 'denied';
        });
        var activity = (patient.actividad_clinica || []).slice().sort(function (left, right) {
            return compareText(left.fecha, right.fecha) || compareText(left.id, right.id);
        });
        return {
            stats_schema_version: VERSION,
            source_mode: 'demo',
            source_file_name: metadata.fileName || metadata.source_file_name || 'farmacia_longitudinal_demo_v0_3.json',
            imported_at: metadata.importedAt || metadata.imported_at || '',
            patient_id: patient.cip || ('demo-patient-' + index),
            identifiers: identifiers,
            primary_identifier_value: identifiers.length === 1 ? identifiers[0].identifier_value : '',
            name: patient.nombre_demo || '', age: own(patient, 'edad') ? patient.edad : '', sex: patient.sexo || '',
            services: (patient.servicios_origen || []).map(function (value) { return { code: null, label: value }; }),
            pathologies: (patient.patologias || []).map(function (value) { return { code: null, label: value }; }),
            valid_event_count: events.length, excluded_event_count: 0, warnings: [], warning_count: 0,
            source_errors: [], source_error_count: 0, events: events,
            latest_request: normalizeRequest(null), latest_validation: normalizeValidation({ validation_result: validationResult }),
            latest_first_visit: latestFirstVisit, latest_followup: latestFollowup,
            care_status: latestFollowup ? 'followup' : validationResult,
            lines: lines, proms: proms, latest_proms: latestActProms(proms),
            clinical_activity: activity.length ? {
                instrument: activity[activity.length - 1].tipo_indice || '',
                value: own(activity[activity.length - 1], 'valor') ? clone(activity[activity.length - 1].valor) : null,
                date: activity[activity.length - 1].fecha || ''
            } : null,
            adherence: adherence, adherence_summary: adherenceSummary(adherence),
            adverse_events: adverse, adverse_event_overall_status: adverse.length ? 'present' : 'not_recorded',
            causality_assessments: causality, therapeutic_movements: movements,
            provenance: events.map(function (event) {
                return { source_event_id: event.source_event_id, event_id: event.event_id, event_type: event.event_type, source_sheet: '', source_table: '' };
            })
        };
    }

    function buildDemoCohort(dataset, metadata) {
        var patients = dataset && Array.isArray(dataset.pacientes) ? dataset.pacientes : [];
        return patients.map(function (patient, index) { return demoPatient(patient, metadata || {}, index); })
            .sort(function (left, right) {
                return compareText(left.primary_identifier_value, right.primary_identifier_value)
                    || compareText(left.patient_id, right.patient_id);
            });
    }

    function uniqueValues(lines, key) {
        var seen = {};
        var values = [];
        (lines || []).forEach(function (line) {
            var value = line && line[key];
            if (!present(value)) return;
            var text = String(value);
            if (seen[text]) return;
            seen[text] = true;
            values.push(text);
        });
        return values.sort(compareText);
    }

    function eventDateValue(event) {
        return event && event.event_date || '';
    }

    function buildCsvRows(cohort) {
        return (cohort || []).map(function (patient) {
            var events = patient.events || [];
            var latestEvent = events.length ? events[events.length - 1] : {};
            var lines = patient.lines || [];
            var activeLines = lines.filter(function (line) { return line.active_at_event === true; });
            var adherence = patient.adherence_summary || adherenceSummary(patient.adherence || []);
            return {
                stats_schema_version: VERSION,
                source_mode: patient.source_mode || '',
                source_file_name: patient.source_file_name || '',
                patient_id: patient.patient_id || '',
                primary_identifier_value: patient.primary_identifier_value || '',
                identifiers_json: canonicalJson(patient.identifiers || []),
                services_json: canonicalJson(patient.services || []),
                pathologies_json: canonicalJson(patient.pathologies || []),
                valid_event_count: Number(patient.valid_event_count || 0),
                excluded_event_count: Number(patient.excluded_event_count || 0),
                warning_count: Number(patient.warning_count || (patient.warnings || []).length || 0),
                source_error_count: Number(patient.source_error_count || (patient.source_errors || []).length || 0),
                latest_event_type: latestEvent.event_type || '',
                latest_event_date: eventDateValue(latestEvent),
                request_date: patient.latest_request && patient.latest_request.request_date || '',
                validation_result: patient.latest_validation && patient.latest_validation.validation_result || 'not_recorded',
                first_visit_date: eventDateValue(patient.latest_first_visit),
                latest_followup_date: eventDateValue(patient.latest_followup),
                line_count: lines.length,
                active_line_count: activeLines.length,
                drug_name_values: uniqueValues(lines, 'drug_name').join(' | '),
                active_ingredient_values: uniqueValues(lines, 'active_ingredient').join(' | '),
                presentation_values: uniqueValues(lines, 'presentation').join(' | '),
                dose_text_values: uniqueValues(lines, 'dose_text').join(' | '),
                route_values: uniqueValues(lines, 'route').join(' | '),
                schedule_code_values: uniqueValues(lines, 'schedule_code').join(' | '),
                schedule_label_values: uniqueValues(lines, 'schedule_label').join(' | '),
                treatment_lines_json: canonicalJson(lines),
                proms_json: canonicalJson(patient.proms || []),
                latest_adherence_collection_status: adherence.collection_status || 'not_recorded',
                latest_adherence_instrument: adherence.instrument || '',
                latest_adherence_result: present(adherence.result) ? adherence.result : 'not_recorded',
                adverse_event_overall_status: patient.adverse_event_overall_status || 'not_recorded',
                adverse_events_json: canonicalJson(patient.adverse_events || []),
                causality_assessments_json: canonicalJson(patient.causality_assessments || []),
                therapeutic_movements_json: canonicalJson(patient.therapeutic_movements || []),
                provenance_json: canonicalJson(patient.provenance || [])
            };
        });
    }

    function csvCell(value) {
        var text = value === null || value === undefined ? '' : String(value);
        if (/^[\t\r\n]*[=+\-@]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
    }

    function serializeCsv(cohort) {
        var rows = buildCsvRows(cohort);
        var lines = [CSV_COLUMNS.map(csvCell).join(',')];
        rows.forEach(function (row) {
            lines.push(CSV_COLUMNS.map(function (column) { return csvCell(row[column]); }).join(','));
        });
        return '\uFEFF' + lines.join('\r\n') + '\r\n';
    }

    root.FarmaciaStatisticsCohort = Object.freeze({
        VERSION: VERSION,
        CSV_COLUMNS: Object.freeze(CSV_COLUMNS.slice()),
        buildRawCohort: buildRawCohort,
        buildDemoCohort: buildDemoCohort,
        buildCsvRows: buildCsvRows,
        serializeCsv: serializeCsv
    });
})(typeof window !== 'undefined' ? window : globalThis);
