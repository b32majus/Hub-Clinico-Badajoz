/* Pure projection of the current raw-patient envelope for Longitudinal. */
(function (root) {
    'use strict';

    var MOVEMENT_TYPES = ['dose_change', 'schedule_change', 'dose_and_schedule_change', 'suspension', 'other'];

    function own(value, key) {
        return Object.prototype.hasOwnProperty.call(value || {}, key);
    }

    function present(value) {
        return value !== null && value !== undefined && (typeof value !== 'string' || value.trim() !== '');
    }

    function clone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function firstPresent() {
        for (var index = 0; index < arguments.length; index += 1) {
            if (present(arguments[index])) return clone(arguments[index]);
        }
        return '';
    }

    function jsonItems(value) {
        var parsed = value;
        if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch (error) { return []; }
        }
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.measurements)) return parsed.measurements;
        return parsed && typeof parsed === 'object' ? [parsed] : [];
    }

    function canonical(value) {
        if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
        if (value && typeof value === 'object') {
            return '{' + Object.keys(value).sort().map(function (key) {
                return JSON.stringify(key) + ':' + canonical(value[key]);
            }).join(',') + '}';
        }
        return JSON.stringify(value);
    }

    function rowsOf(event) {
        return event && Array.isArray(event.rows) ? event.rows : [];
    }

    function rowOf(physicalRow) {
        return physicalRow && physicalRow.canonical_row || {};
    }

    function actDate(event) {
        var first = rowsOf(event).length ? rowOf(rowsOf(event)[0]) : {};
        return firstPresent(first.first_visit_date, first.visit_date);
    }

    function activity(value) {
        return value === true ? true : (value === false ? false : null);
    }

    function lineFromRow(row, event) {
        var active = activity(row.active_at_event);
        return {
            source_event_id: event.source_event_id || '',
            event_id: event.event_id || '',
            line_id: row.line_id || '',
            treatment_id: row.treatment_id || '',
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
            schedule_label: firstPresent(row.line_schedule_label, row.line_schedule_other_text),
            dispensation_status: row.dispensation_status || '',
            dispensation_observations: row.dispensation_observations || '',
            specific_review_status: row.specific_review_status || '',
            specific_review_reason: row.specific_review_reason || '',
            observations: row.line_observations || '',
            tratamiento: firstPresent(row.line_drug_name, row.line_active_ingredient),
            estado_linea: row.line_status_at_event || '',
            dispensed: row.dispensation_status === 'dispensed' ? true : (row.dispensation_status === 'not_dispensed' ? false : null),
            evaluated: row.specific_review_status === 'performed' ? true : (row.specific_review_status === 'not_performed' ? false : null)
        };
    }

    function visitFromEvent(event) {
        var first = rowsOf(event).length ? rowOf(rowsOf(event)[0]) : {};
        return {
            source_event_id: event.source_event_id || '',
            event_id: event.event_id || '',
            visit_id: first.visit_id || first.first_visit_id || '',
            first_visit_id: first.first_visit_id || '',
            act_type: event.event_type || '',
            fecha: firstPresent(first.first_visit_date, first.visit_date),
            lineas: rowsOf(event).map(function (physicalRow) { return lineFromRow(rowOf(physicalRow), event); })
        };
    }

    function movementFromRow(row, event) {
        var type = row.therapeutic_movement_type;
        if (type === 'suspension' || row.suspension_status === 'yes') type = 'suspension';
        if (MOVEMENT_TYPES.indexOf(type) === -1) return null;
        var suspension = type === 'suspension';
        var effectiveDate = suspension
            ? firstPresent(row.suspension_effective_date, row.movement_effective_date)
            : (present(row.movement_effective_date) ? clone(row.movement_effective_date) : '');
        return {
            source_event_id: event.source_event_id || '',
            event_id: event.event_id || '',
            visit_date: actDate(event),
            line_id: row.line_id || '',
            treatment_id: row.treatment_id || '',
            type: type,
            new_dose_text: row.new_dose_text || '',
            new_schedule_code: row.new_schedule_code || '',
            new_schedule_label: firstPresent(row.new_schedule_label, row.new_schedule_other_text),
            new_route: row.new_route || '',
            reason: suspension ? firstPresent(row.suspension_reason, row.movement_reason) : (row.movement_reason || ''),
            movement_effective_date: row.movement_effective_date || '',
            suspension_status: row.suspension_status || '',
            suspension_reason: row.suspension_reason || '',
            suspension_effective_date: row.suspension_effective_date || '',
            effective_date: effectiveDate,
            fecha: effectiveDate,
            fecha_acto: actDate(event),
            tipo: type,
            motivo: suspension ? firstPresent(row.suspension_reason, row.movement_reason) : (row.movement_reason || '')
        };
    }

    function movementsFromVisits(visits) {
        var result = [];
        (visits || []).forEach(function (event) {
            rowsOf(event).forEach(function (physicalRow) {
                var movement = movementFromRow(rowOf(physicalRow), event);
                if (movement) result.push(movement);
            });
        });
        return result;
    }

    function currentTreatment(entry) {
        var line = lineFromRow(entry && entry.snapshot || {}, entry || {});
        var result = {
            id: entry && entry.treatment_id || '',
            linea_id: entry && entry.line_id || '',
            tratamiento_id: entry && entry.treatment_id || '',
            principio_activo: line.active_ingredient,
            nombre_comercial: line.drug_name,
            presentacion_dosis: line.presentation,
            dosis: line.dose_text,
            pauta: line.schedule_label,
            via: line.route,
            fecha_inicio: '',
            fecha_fin: '',
            estado_linea: line.line_status_at_event || 'unknown',
            tipo_relacion: line.line_role || 'unknown',
            es_principal: line.is_primary_line
        };
        if (line.active_at_event === true || line.active_at_event === false) result.activo = line.active_at_event;
        return result;
    }

    function datesByEvent(explicit, visits) {
        var result = {};
        Object.keys(explicit.event_metadata || {}).forEach(function (sourceId) {
            result[sourceId] = firstPresent(explicit.event_metadata[sourceId].visit_date);
        });
        (visits || []).forEach(function (event) {
            if (present(event.source_event_id) && present(actDate(event))) result[event.source_event_id] = actDate(event);
        });
        return result;
    }

    function promsFromRecords(records) {
        var result = [], seen = {};
        (records || []).forEach(function (record) {
            jsonItems(record && record.values && record.values.proms_json).forEach(function (item) {
                if (!item || typeof item !== 'object') return;
                var instrument = firstPresent(item.instrument, item.type, item.tipo_prom);
                if (!present(instrument)) return;
                var key = String(record.source_event_id || '') + '\u0000' + canonical(item);
                if (seen[key]) return;
                seen[key] = true;
                var prom = {
                    source_event_id: record.source_event_id || '',
                    event_id: record.event_id || '',
                    tipo_prom: instrument,
                    fecha: present(item.date) ? clone(item.date) : '',
                    content: clone(item)
                };
                if (own(item, 'value')) prom.valor = clone(item.value);
                else if (own(item, 'valor')) prom.valor = clone(item.valor);
                result.push(prom);
            });
        });
        return result;
    }

    function adherenceFromRecords(records, dates) {
        return (records || []).filter(function (record) {
            var value = record && record.values || {};
            return ['adherence_collection_status', 'adherence_instrument', 'adherence_result', 'adherence_answers_json']
                .some(function (key) { return own(value, key) && present(value[key]); });
        }).map(function (record) {
            var value = record.values || {};
            return {
                source_event_id: record.source_event_id || '',
                event_id: record.event_id || '',
                visit_date: dates[record.source_event_id] || '',
                row_index: Number.isInteger(record.row_index) ? record.row_index : null,
                collection_status: own(value, 'adherence_collection_status') ? clone(value.adherence_collection_status) : null,
                instrument: own(value, 'adherence_instrument') ? clone(value.adherence_instrument) : null,
                result: own(value, 'adherence_result') ? clone(value.adherence_result) : null,
                answers: own(value, 'adherence_answers_json') ? clone(value.adherence_answers_json) : null
            };
        });
    }

    function causalityFromRecords(records, dates) {
        var result = [], seen = {};
        (records || []).forEach(function (record) {
            jsonItems(record && record.values && record.values.causality_assessments_json).forEach(function (item) {
                if (!item || typeof item !== 'object') return;
                var key = String(record.source_event_id || '') + '\u0000' + canonical(item);
                if (seen[key]) return;
                seen[key] = true;
                result.push({
                    source_event_id: record.source_event_id || '',
                    event_id: record.event_id || '',
                    visit_date: dates[record.source_event_id] || '',
                    assessment: clone(item)
                });
            });
        });
        return result;
    }

    function adverseEventsFromRecords(records, assessments, dates) {
        var groups = {}, order = [], seen = {}, statuses = [];
        (records || []).forEach(function (record) {
            var value = record && record.values || {};
            var status = value.adverse_event_status;
            if (present(status)) statuses.push(status);
            if (status !== 'present') return;
            var contentKey = String(record.source_event_id || '') + '\u0000' + canonical(value);
            if (seen[contentKey]) return;
            seen[contentKey] = true;
            var adverseId = value.adverse_event_id || '';
            var key = adverseId ? 'id:' + adverseId : 'source:' + String(record.source_event_id || '') + ':' + contentKey;
            if (!groups[key]) {
                groups[key] = { adverse_event_id: adverseId, updates: [] };
                order.push(key);
            }
            var suspects = Array.isArray(value.adverse_event_suspects_json) ? clone(value.adverse_event_suspects_json) : [];
            var suspectRefs = suspects.map(function (item) { return item && item.suspect_ref; }).filter(present);
            var linked = assessments.filter(function (entry) {
                if (entry.source_event_id !== record.source_event_id) return false;
                var item = entry.assessment || {};
                if (present(item.adverse_event_id) && item.adverse_event_id !== adverseId) return false;
                return !present(item.suspect_ref) || suspectRefs.indexOf(item.suspect_ref) !== -1;
            });
            groups[key].updates.push({
                source_event_id: record.source_event_id || '',
                event_id: record.event_id || '',
                visit_date: dates[record.source_event_id] || '',
                description: value.adverse_event_description || '',
                severity: value.adverse_event_severity || '',
                resolution_status: value.adverse_event_resolution_status || '',
                action: value.adverse_event_action || '',
                suspects: suspects,
                causality_assessments: clone(linked)
            });
        });
        return {
            status: statuses.length ? statuses[statuses.length - 1] : 'not_recorded',
            events: order.map(function (key) {
                var group = groups[key];
                var latest = group.updates[group.updates.length - 1];
                var linked = [];
                group.updates.forEach(function (update) { linked = linked.concat(update.causality_assessments); });
                return {
                    ea_id: group.adverse_event_id,
                    adverse_event_id: group.adverse_event_id,
                    tipo: latest.description,
                    gravedad: latest.severity,
                    resultado: latest.resolution_status,
                    accion_tomada: latest.action,
                    fecha: latest.visit_date,
                    sospechosos: clone(latest.suspects),
                    evaluaciones_causalidad: linked.map(function (entry) { return clone(entry.assessment); }),
                    actualizaciones: clone(group.updates)
                };
            })
        };
    }

    function buildFromEnvelope(envelope) {
        if (!envelope || !envelope.explicit_data || !envelope.identifier || !present(envelope.patient_id)
            || !present(envelope.identifier.identifier_value)) throw new TypeError('LONGITUDINAL_RAW_ENVELOPE_INVALID');
        var projected = envelope.patient_projection && envelope.patient_projection.patient;
        if (envelope.patient_projection && envelope.patient_projection.patient_id !== envelope.patient_id) {
            throw new TypeError('LONGITUDINAL_RAW_PATIENT_ID_MISMATCH');
        }
        if (projected && (projected.patient_id !== envelope.patient_id || projected.cip !== envelope.identifier.identifier_value)) {
            throw new TypeError('LONGITUDINAL_RAW_IDENTITY_MISMATCH');
        }
        var explicit = envelope.explicit_data;
        var visitsAndLines = explicit.visits_and_lines || {};
        var sourceVisits = Array.isArray(visitsAndLines.visits) ? visitsAndLines.visits : [];
        var visits = sourceVisits.map(visitFromEvent);
        var dates = datesByEvent(explicit, sourceVisits);
        var movements = movementsFromVisits(sourceVisits);
        var adherence = adherenceFromRecords(explicit.adherence, dates);
        var causality = causalityFromRecords(explicit.safety && explicit.safety.causality_assessments, dates);
        var safety = adverseEventsFromRecords(explicit.safety && explicit.safety.adverse_events, causality, dates);
        var latestAdherence = null;
        for (var adherenceIndex = adherence.length - 1; adherenceIndex >= 0; adherenceIndex -= 1) {
            if (present(adherence[adherenceIndex].result)) {
                latestAdherence = adherence[adherenceIndex];
                break;
            }
        }
        return {
            __farmaciaRawPatient: true,
            source_mode: 'raw',
            patient_id: envelope.patient_id,
            cip: envelope.identifier.identifier_value,
            nombre_demo: '',
            servicios_origen: [],
            patologias: [],
            tratamientos: (visitsAndLines.lines || []).map(currentTreatment),
            visitas_fh: visits,
            movimientos_terapeuticos: movements,
            cambios_pauta: clone(movements),
            suspensiones: movements.filter(function (item) { return item.type === 'suspension'; }).map(clone),
            proms: promsFromRecords(explicit.proms),
            adherencia: latestAdherence ? clone(latestAdherence.result) : null,
            adherencia_historial: adherence,
            adverse_event_status: safety.status,
            eventos_adversos: safety.events,
            causality_records: causality,
            actividad_clinica: [],
            comorbilidades_relevantes: []
        };
    }

    root.FarmaciaLongitudinalRawAdapter = Object.freeze({ buildFromEnvelope: buildFromEnvelope });
})(typeof window !== 'undefined' ? window : globalThis);
