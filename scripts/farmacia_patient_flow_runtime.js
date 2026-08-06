/* Current-patient runtime shared by the normal Farmacia pages. */
(function (root) {
    'use strict';

    var NAV_MARKER = 'fh_session';
    var PATIENT_PAGES = [
        'farmacia_index.html',
        'farmacia_dashboard_paciente.html',
        'farmacia_dashboard_longitudinal.html',
        'farmacia_validacion.html',
        'farmacia_primera_visita.html',
        'farmacia_seguimiento.html'
    ];
    var VALIDATION_CONTEXT_FIELDS = [
        'prebiologic_required', 'prebiologic_overall_status', 'analysis_date',
        'analysis_recent_status', 'hemogram_verified', 'biochemistry_verified',
        'tb_status', 'hbv_status', 'hcv_status', 'hiv_status', 'vaccination_status',
        'vaccination_observations', 'preventive_medicine_status', 'validation_blockers_json',
        'recurrent_infections_status', 'cardiovascular_risk_status',
        'neurologic_disorder_status', 'malignancy_risk_status'
    ];

    function own(object, key) {
        return Object.prototype.hasOwnProperty.call(object || {}, key);
    }

    function clone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function present(value) {
        return value !== null && value !== undefined && (typeof value !== 'string' || value.trim() !== '');
    }

    function firstPresent() {
        for (var index = 0; index < arguments.length; index += 1) {
            if (present(arguments[index])) return arguments[index];
        }
        return '';
    }

    function contextValue(values) {
        if (!Array.isArray(values) || values.length !== 1) return '';
        return firstPresent(values[0].label, values[0].code);
    }

    function rowFromEvent(event) {
        return event && Array.isArray(event.rows) && event.rows[0] ? event.rows[0].canonical_row || {} : {};
    }

    function latestRecord(records) {
        return Array.isArray(records) && records.length ? records[records.length - 1].values || {} : {};
    }

    function jsonText(value) {
        if (!present(value)) return '';
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    function lineFromSnapshot(entry) {
        var snapshot = entry && entry.snapshot || {};
        var explicitlyActive = snapshot.active_at_event === true;
        var explicitlyInactive = snapshot.active_at_event === false;
        var suppliedStatus = present(snapshot.line_status_at_event) ? String(snapshot.line_status_at_event) : '';
        var status = explicitlyActive ? 'active' : (explicitlyInactive ? (suppliedStatus || 'historical') : (suppliedStatus === 'active' ? 'unknown' : suppliedStatus || 'unknown'));
        return {
            linea_id: entry.line_id,
            tratamiento_id_principal: entry.treatment_id || '',
            farmaco_nombre: snapshot.line_drug_name || '',
            nombre_linea: snapshot.line_drug_name || snapshot.line_active_ingredient || '',
            nombre_comercial: snapshot.line_drug_name || '',
            principio_activo: snapshot.line_active_ingredient || '',
            presentacion: firstPresent(snapshot.line_presentation),
            dosis: firstPresent(snapshot.line_dose_text),
            dosis_texto: firstPresent(snapshot.line_dose_text),
            via: snapshot.line_route || '',
            pauta: firstPresent(snapshot.line_schedule_label, snapshot.line_schedule_other_text),
            pauta_codigo: snapshot.line_schedule_code || '',
            pauta_label: snapshot.line_schedule_label || '',
            pauta_otro_texto: snapshot.line_schedule_other_text || '',
            tipo_relacion: snapshot.line_role || 'unknown',
            es_principal: snapshot.is_primary_line === true,
            estado_linea: status,
            active_at_event: snapshot.active_at_event,
            selected_drug_id: snapshot.line_selected_drug_id || '',
            source_type: snapshot.line_catalog_source || '',
            codigo_nacional: snapshot.line_national_code || '',
            nregistro: snapshot.line_registration_number || '',
            candidate_explicit: true,
            fuente: 'farmacia_raw'
        };
    }

    function validationContext(events) {
        var result = {};
        (events || []).forEach(function (event) {
            if (event.event_type !== 'pharmacy_validation') return;
            var row = rowFromEvent(event);
            VALIDATION_CONTEXT_FIELDS.forEach(function (field) {
                if (own(row, field)) result[field] = clone(row[field]);
            });
        });
        return result;
    }

    function validatedTreatment(validation) {
        if (!validation || validation.validation_result !== 'validated'
            || validation.validated_treatment_relation === 'no_treatment_validated') return null;
        var treatment = {
            tratamiento_id: validation.validated_treatment_id || '',
            linea_id: validation.validated_line_id || '',
            farmaco_nombre: validation.validated_drug_name || '',
            nombre_comercial: validation.validated_drug_name || '',
            principio_activo: validation.validated_active_ingredient || '',
            presentacion: validation.validated_presentation || '',
            dosis_texto: validation.validated_dose_text || '',
            via: validation.validated_route || '',
            pauta: firstPresent(validation.validated_schedule_label, validation.validated_schedule_other_text),
            pauta_codigo: validation.validated_schedule_code || '',
            pauta_label: validation.validated_schedule_label || '',
            pauta_otro_texto: validation.validated_schedule_other_text || '',
            induccion: validation.validated_induction_status || '',
            selected_drug_id: validation.validated_selected_drug_id || '',
            source_type: validation.validated_catalog_source || '',
            codigo_nacional: validation.validated_national_code || '',
            nregistro: validation.validated_registration_number || '',
            tipo_relacion: validation.validated_treatment_relation || '',
            es_validado_farmacia: true,
            fuente: 'farmacia_raw'
        };
        return Object.keys(treatment).some(function (key) {
            return key !== 'es_validado_farmacia' && key !== 'fuente' && present(treatment[key]);
        }) ? treatment : null;
    }

    function mapPatient(identifier, projection, explicit) {
        var request = explicit.latest_request || {};
        var validation = explicit.latest_validation || {};
        var visits = explicit.visits_and_lines || {};
        var firstVisitRow = rowFromEvent(visits.latest_first_visit);
        var followupRow = rowFromEvent(visits.latest_followup);
        var lines = (visits.lines || []).filter(function (line) { return present(line.line_id); }).map(lineFromSnapshot);
        var activeLines = lines.filter(function (line) { return line.active_at_event === true; });
        var currentLine = activeLines.length === 1 ? activeLines[0] : null;
        var treatment = validatedTreatment(validation);
        var adherence = latestRecord(explicit.adherence);
        var adverse = latestRecord(explicit.safety && explicit.safety.adverse_events);
        var latestProm = latestRecord(explicit.proms);
        var status = visits.latest_followup ? 'followup'
            : (validation.validation_result === 'validated' ? 'validated'
                : (validation.validation_result === 'denied' ? 'denied'
                    : (validation.validation_result === 'pending' ? 'pending' : 'not_recorded')));
        var firstVisitDate = firstVisitRow.first_visit_date || '';
        var followupDate = followupRow.visit_date || '';
        var requestedSchedule = firstPresent(request.requested_schedule_label, request.requested_schedule_other_text);

        return {
            __farmaciaRawPatient: true,
            patient_id: projection.patient_id,
            nombre: 'Paciente ' + identifier.identifier_value,
            cip: identifier.identifier_value,
            edad: '',
            sexo: '',
            servicio: contextValue(projection.services),
            servicioSlug: contextValue(projection.services),
            patologia: contextValue(projection.pathologies),
            importSource: 'Excel Farmacia raw',
            estado: status,
            estadoLabel: status === 'followup' ? 'En seguimiento'
                : (status === 'validated' ? 'Validado'
                    : (status === 'denied' ? 'Denegado'
                        : (status === 'pending' ? 'Pendiente' : 'No registrado'))),
            fechaSolicitud: request.request_date || '',
            fecha_solicitud: request.request_date || '',
            ultimaSolicitud: request.request_date || '',
            solicitud: clone(request),
            validacion: clone(validation),
            farmaco_solicitado: request.requested_drug_name || '',
            principio_activo_solicitado: request.requested_active_ingredient || '',
            dosis_solicitada: request.requested_dose_text || '',
            via_solicitada: request.requested_route || '',
            pauta_solicitada: requestedSchedule,
            induccion_solicitada: request.requested_induction_status || '',
            peso_solicitado: request.requested_weight_text || '',
            justificacion_solicitada: request.requested_justification || '',
            observaciones_solicitud: request.request_source_observations || '',
            tratamientoValidado: treatment,
            firstVisitData: clone(firstVisitRow),
            followupData: clone(followupRow),
            biologicos: lines,
            lineasActivas: activeLines,
            lineaActiva: currentLine,
            farmaco: currentLine ? currentLine.farmaco_nombre : '',
            principioActivo: currentLine ? currentLine.principio_activo : '',
            dosis: currentLine ? currentLine.dosis_texto : '',
            via: currentLine ? currentLine.via : '',
            pauta: currentLine ? currentLine.pauta : '',
            primeraVisita: firstVisitDate,
            ultimaVisita: followupDate || firstVisitDate,
            seguimiento: visits.latest_followup ? 'Seguimiento registrado' : '',
            adherencia: firstPresent(adherence.adherence_result),
            efectosAdversos: adverse.adverse_event_status === 'absent' ? 'Ausencia registrada' : (adverse.adverse_event_description || ''),
            proms: jsonText(latestProm.proms_json),
            analiticaEstruct: clone(explicit.validation_context),
            analitica: '',
            visitas_fh: [visits.latest_first_visit, visits.latest_followup].filter(Boolean).map(function (event) {
                var row = rowFromEvent(event);
                return { fecha: row.first_visit_date || row.visit_date || '', tipo: event.event_type, line_id: row.line_id || '' };
            }),
            eventos_adversos: adverse.adverse_event_status === 'present' ? [{
                tipo: adverse.adverse_event_description || '',
                gravedad: adverse.adverse_event_severity || '',
                relacion_tratamiento: '',
                accion_tomada: adverse.adverse_event_action || '',
                fecha: followupDate
            }] : [],
            structured_proms: clone(explicit.proms),
            adherence_records: clone(explicit.adherence),
            adverse_event_records: clone(explicit.safety && explicit.safety.adverse_events || []),
            causality_records: clone(explicit.safety && explicit.safety.causality_assessments || [])
        };
    }

    function generation(randomSource) {
        var cryptoObject = randomSource || root.crypto;
        if (cryptoObject && typeof cryptoObject.randomUUID === 'function') return cryptoObject.randomUUID();
        if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
            var values = new Uint32Array(4);
            cryptoObject.getRandomValues(values);
            return Array.prototype.map.call(values, function (value) { return value.toString(16); }).join('-');
        }
        throw new Error('PATIENT_FLOW_GENERATION_UNAVAILABLE');
    }

    function create(options) {
        var settings = options || {};
        var sessionModule = settings.sessionModule || root.FarmaciaCurrentPatientSession;
        if (!sessionModule || typeof sessionModule.create !== 'function') throw new Error('PATIENT_FLOW_SESSION_UNAVAILABLE');
        var storage = settings.sessionStorage || root.sessionStorage;
        var session = sessionModule.create({ sessionStorage: storage });
        var dataPort = settings.dataPort || null;
        var activeEnvelope = null;
        var bootstrapped = false;
        var resolutionStatus = 'unresolved';
        var locationObject = settings.location || root.location;
        var historyObject = settings.history || root.history;
        var confirmResume = settings.confirm || function (message) { return root.confirm(message); };

        function paramsFromLocation() {
            return new URLSearchParams(locationObject && locationObject.search || '');
        }

        function replaceParams(params) {
            if (!historyObject || typeof historyObject.replaceState !== 'function' || !locationObject) return;
            var query = params.toString();
            historyObject.replaceState(null, '', (locationObject.pathname || '') + (query ? '?' + query : '') + (locationObject.hash || ''));
        }

        function removeTechnicalContext(removePatientContext) {
            var params = paramsFromLocation();
            params.delete(NAV_MARKER);
            if (removePatientContext) {
                ['cip', 'servicio', 'patologia', 'entrada', 'patient_id', 'identifier_system', 'generation'].forEach(function (key) { params.delete(key); });
            }
            replaceParams(params);
        }

        function handoffFromParams(params) {
            var system = params.get('identifier_system') || '';
            var value = params.get('cip') || '';
            return {
                identifier: { identifier_system: system, identifier_value: value },
                patient_id: params.get('patient_id') || '',
                generation: params.get('generation') || ''
            };
        }

        function bootstrap() {
            if (bootstrapped) return activeEnvelope ? { status: 'active', envelope: clone(activeEnvelope) } : { status: 'empty' };
            bootstrapped = true;
            var params = paramsFromLocation();
            var handoff = handoffFromParams(params);
            if (!handoff.generation || !handoff.patient_id || !handoff.identifier.identifier_system || !handoff.identifier.identifier_value) {
                session.bootstrap({});
                activeEnvelope = null;
                resolutionStatus = 'empty';
                return { status: 'empty' };
            }
            var result = session.bootstrap(handoff);
            if (result.status !== 'pending_resume_decision') {
                activeEnvelope = null;
                resolutionStatus = 'invalid';
                removeTechnicalContext(true);
                return result;
            }
            var continueSession = params.get(NAV_MARKER) === '1';
            if (!continueSession) {
                continueSession = confirmResume('Hay un paciente actual en esta sesión. Aceptar para continuar o Cancelar para empezar de cero.');
            }
            result = session.resolveResume(continueSession ? 'continue' : 'restart');
            if (continueSession) {
                activeEnvelope = result.envelope;
                resolutionStatus = 'continued';
                removeTechnicalContext(false);
            } else {
                activeEnvelope = null;
                resolutionStatus = 'restarted';
                removeTechnicalContext(true);
            }
            return result;
        }

        function currentEnvelope() {
            bootstrap();
            if (activeEnvelope) return activeEnvelope;
            var state = session.getState();
            if (state.status === 'active') activeEnvelope = state.envelope;
            return activeEnvelope;
        }

        function currentPatient() {
            var envelope = currentEnvelope();
            return envelope && envelope.patient_projection ? clone(envelope.patient_projection.patient) : null;
        }

        function purgeResidue(identifierValue) {
            if (!storage || !identifierValue) return;
            var sessionKey = sessionModule.STORAGE_KEY;
            for (var index = storage.length - 1; index >= 0; index -= 1) {
                var key = storage.key(index);
                if (!key || key === sessionKey) continue;
                var value = storage.getItem(key);
                if ((value && value.indexOf(identifierValue) !== -1)
                    || key === 'farmaciaDemo.farmaciaImport' || key === 'farmaciaDemo.enfermeriaImport') {
                    storage.removeItem(key);
                }
            }
        }

        function explicitFor(patientId) {
            var visits = dataPort.getVisitsAndLines(patientId) || {};
            var latest = dataPort.getLatestRequestValidation(patientId) || {};
            var events = dataPort.getPatientEvents(patientId) || [];
            return {
                latest_request: latest.latest_request || null,
                latest_validation: latest.latest_validation || null,
                visits_and_lines: visits,
                proms: dataPort.getProms(patientId) || [],
                adherence: dataPort.getAdherence(patientId) || [],
                safety: dataPort.getAdverseEventsAndCausality(patientId) || { adverse_events: [], causality_assessments: [] },
                validation_context: validationContext(events)
            };
        }

        function persistSelection(summary, identifier) {
            var previous = currentEnvelope();
            var previousCip = previous && previous.identifier.identifier_value || '';
            if (previous) {
                purgeResidue(previous.identifier.identifier_value);
                session.clear();
                activeEnvelope = null;
            }
            var projection = dataPort.getPatientProjection(summary.patient_id);
            var explicit = explicitFor(summary.patient_id);
            var patient = mapPatient(identifier, projection, explicit);
            var input = {
                identifier: clone(identifier),
                patient_id: summary.patient_id,
                generation: generation(settings.crypto),
                patient_projection: { patient_id: summary.patient_id, patient: patient },
                explicit_data: explicit,
                provenance: typeof dataPort.getInternalProvenance === 'function' ? dataPort.getInternalProvenance(summary.patient_id) : [],
                drafts: {},
                dirty: false
            };
            var result = session.replacePatient(input, true);
            activeEnvelope = result.envelope;
            bootstrapped = true;
            resolutionStatus = 'selected';
            var params = paramsFromLocation();
            params.set('cip', identifier.identifier_value);
            params.set('patient_id', summary.patient_id);
            params.set('identifier_system', identifier.identifier_system);
            params.set('generation', input.generation);
            params.delete(NAV_MARKER);
            replaceParams(params);
            return { status: 'selected', patient: clone(patient), envelope: clone(activeEnvelope), previousCip: previousCip };
        }

        function selectByCip(cip) {
            if (!dataPort || typeof dataPort.listPatients !== 'function') return { status: 'unavailable' };
            var target = String(cip || '').trim().toUpperCase();
            if (!target) return { status: 'empty_query' };
            var matches = [];
            dataPort.listPatients().forEach(function (summary) {
                (summary.identifiers || []).forEach(function (identifier) {
                    if (String(identifier.identifier_value || '').trim().toUpperCase() === target) {
                        matches.push({ summary: summary, identifier: identifier });
                    }
                });
            });
            if (!matches.length) return { status: 'not_found' };
            if (matches.length !== 1) return { status: 'ambiguous', matches: clone(matches.map(function (match) { return match.identifier; })) };
            return persistSelection(matches[0].summary, matches[0].identifier);
        }

        function enrichCurrentPatient(patient) {
            var envelope = currentEnvelope();
            if (!envelope || !patient || String(patient.cip || '').toUpperCase() !== String(envelope.identifier.identifier_value).toUpperCase()) return null;
            var updated = clone(envelope.patient_projection.patient);
            Object.keys(patient).forEach(function (key) {
                if (key === '__farmaciaRawPatient' || key === 'patient_id' || key === 'cip') return;
                if (!present(updated[key]) && present(patient[key])) updated[key] = clone(patient[key]);
            });
            updated.__farmaciaRawPatient = true;
            updated.patient_id = envelope.patient_id;
            updated.cip = envelope.identifier.identifier_value;
            var projection = clone(envelope.patient_projection);
            projection.patient = updated;
            activeEnvelope = session.updateCurrent({ patient_projection: projection });
            return clone(updated);
        }

        function contextUrl(base, context) {
            var params = new URLSearchParams();
            var values = context || {};
            ['cip', 'servicio', 'patologia', 'entrada'].forEach(function (key) {
                if (present(values[key])) params.set(key, values[key]);
            });
            var envelope = currentEnvelope();
            if (envelope) {
                params.set('cip', envelope.identifier.identifier_value);
                params.set('patient_id', envelope.patient_id);
                params.set('identifier_system', envelope.identifier.identifier_system);
                params.set('generation', envelope.generation);
                params.set(NAV_MARKER, '1');
            }
            var query = params.toString();
            return query ? base + '?' + query : base;
        }

        function decorateLinks(scope) {
            if (!currentEnvelope() || !scope || typeof scope.querySelectorAll !== 'function') return;
            Array.prototype.forEach.call(scope.querySelectorAll('a[href]'), function (link) {
                var rawHref = link.getAttribute('href') || '';
                var page = rawHref.split(/[?#]/)[0].split('/').pop();
                if (PATIENT_PAGES.indexOf(page) === -1) return;
                var parsed = new URL(rawHref, locationObject.href);
                link.href = contextUrl(page, {
                    cip: parsed.searchParams.get('cip'),
                    servicio: parsed.searchParams.get('servicio'),
                    patologia: parsed.searchParams.get('patologia'),
                    entrada: parsed.searchParams.get('entrada')
                });
            });
        }

        return Object.freeze({
            setDataPort: function (port) { dataPort = port; return dataPort; },
            getDataPort: function () { return dataPort; },
            bootstrap: bootstrap,
            selectByCip: selectByCip,
            getCurrentPatient: currentPatient,
            getCurrentEnvelope: function () { return clone(currentEnvelope()); },
            getResolutionStatus: function () { bootstrap(); return resolutionStatus; },
            enrichCurrentPatient: enrichCurrentPatient,
            makeContextUrl: contextUrl,
            decorateLinks: decorateLinks,
            clear: function () { session.clear(); activeEnvelope = null; bootstrapped = true; resolutionStatus = 'restarted'; removeTechnicalContext(true); return { status: 'empty' }; }
        });
    }

    var singleton = null;
    function current() {
        if (!singleton) singleton = create();
        return singleton;
    }

    root.FarmaciaPatientFlowRuntime = Object.freeze({
        NAV_MARKER: NAV_MARKER,
        create: create,
        setDataPort: function (port) { return current().setDataPort(port); },
        getDataPort: function () { return current().getDataPort(); },
        bootstrap: function () { return current().bootstrap(); },
        selectByCip: function (cip) { return current().selectByCip(cip); },
        getCurrentPatient: function () { return current().getCurrentPatient(); },
        getCurrentEnvelope: function () { return current().getCurrentEnvelope(); },
        getResolutionStatus: function () { return current().getResolutionStatus(); },
        enrichCurrentPatient: function (patient) { return current().enrichCurrentPatient(patient); },
        makeContextUrl: function (base, context) { return current().makeContextUrl(base, context); },
        decorateLinks: function (scope) { return current().decorateLinks(scope); },
        clear: function () { return current().clear(); }
    });
})(typeof window !== 'undefined' ? window : globalThis);
