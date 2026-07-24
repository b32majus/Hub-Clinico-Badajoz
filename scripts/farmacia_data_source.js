'use strict';

(function () {
    var DATASET_URL = 'data/demo/farmacia/farmacia_v4_runtime_v1.json';
    var ERROR_MESSAGE = 'No se pudo cargar el dataset sintético V4 de Farmacia.';
    var EXPECTED_METADATA = {
        schema: 'promueve.farmacia.v4.runtime',
        schema_version: '1.0.0',
        source_manifest: 'data/demo/farmacia/farmacia_v4_scenario_manifest.json',
        source_manifest_blob_sha: '1074bb688f6c4945da203a65ed81a286ebae5aca',
        source_contract: 'docs/contratos/CONTRATO_ESCENARIOS_FARMACIA_V4.md',
        synthetic: true,
        status: 'generated_not_wired'
    };
    var EMPTY_DATASET = {
        scenario_states: [], persons: [], readiness: [], treatment_requests: [],
        validation_acts: [], treatment_lines: [], visits: [], followups: [], adverse_events: []
    };
    var dataset = EMPTY_DATASET;
    var installingQuickViewGuard = false;

    function renderSourceError() {
        if (typeof document === 'undefined' || !document.body) return;
        var status = document.getElementById('farmaciaDataSourceError');
        if (!status) {
            status = document.createElement('p');
            status.id = 'farmaciaDataSourceError';
            status.setAttribute('role', 'alert');
            document.body.insertBefore(status, document.body.firstChild);
        }
        status.textContent = ERROR_MESSAGE;
    }

    function fail() {
        dataset = EMPTY_DATASET;
        renderSourceError();
        throw new Error(ERROR_MESSAGE);
    }

    function validate(payload) {
        if (!payload || !payload.metadata) fail();
        Object.keys(EXPECTED_METADATA).forEach(function (key) {
            if (payload.metadata[key] !== EXPECTED_METADATA[key]) fail();
        });
        Object.keys(EMPTY_DATASET).forEach(function (key) {
            if (!Array.isArray(payload[key])) fail();
        });
        return payload;
    }

    function byPatientId(collection, patientId) {
        return collection.filter(function (item) { return item.patient_id === patientId; });
    }

    function firstByPatientId(collection, patientId) {
        return collection.find(function (item) { return item.patient_id === patientId; }) || null;
    }

    function getScenarioStateByPatientId(patientId) {
        return firstByPatientId(dataset.scenario_states, patientId);
    }

    function getReadinessByPatientId(patientId) {
        return firstByPatientId(dataset.readiness, patientId);
    }

    function getRequestsByPatientId(patientId) {
        return byPatientId(dataset.treatment_requests, patientId);
    }

    function getValidationActsByPatientId(patientId) {
        return byPatientId(dataset.validation_acts, patientId);
    }

    function getCanonicalLinesByPatientId(patientId) {
        return byPatientId(dataset.treatment_lines, patientId);
    }

    function legacyValidationResult(result) {
        if (result === 'validated') return 'validado';
        if (result === 'denied') return 'denegado';
        return 'pendiente';
    }

    function legacyActs(patientId) {
        var scenario = getScenarioStateByPatientId(patientId);
        if (!scenario) return [];
        if (['active_single_line_followup', 'historical_line_read_only', 'multiple_existing_lines'].indexOf(scenario.initial_state) !== -1) {
            var active = getCanonicalLinesByPatientId(patientId).find(function (line) { return line.status === 'active'; });
            return [{
                patient_id: patientId,
                fecha_acto: active ? active.start_date : null,
                tipo_acto_fh: 'seguimiento',
                visita_id: null,
                validacion_id: null,
                tratamiento_id: null,
                linea_id: active ? active.line_id : null,
                profesional_fh: null,
                estado_registro: 'activo',
                source_type: 'V4_SCENARIO',
                created_at: null,
                updated_at: null,
                demo_flag: true,
                observaciones_generales: null
            }];
        }
        return [];
    }

    function legacyValidations(patientId) {
        return getValidationActsByPatientId(patientId).map(function (act) {
            return {
                patient_id: patientId,
                validacion_id: act.validation_act_id,
                fecha_acto: null,
                tipo_validacion: 'farmacoterapeutica',
                resultado_validacion: legacyValidationResult(act.result),
                requiere_prebiologico: null,
                tb_estado: null,
                serologias_estado: null,
                vacunas_estado: null,
                bloqueantes_validacion: null,
                observaciones_validacion: act.observation || null
            };
        });
    }

    function legacyTreatmentLines(patientId) {
        return getCanonicalLinesByPatientId(patientId).map(function (line, index) {
            return {
                patient_id: patientId,
                tratamiento_id: null,
                linea_id: line.line_id,
                marca_comercial: line.drug_name || null,
                principio_activo: line.active_ingredient || null,
                codigo_nacional: null,
                numero_registro: null,
                categoria_farmaco: null,
                tipo_relacion: line.relationship || null,
                estado_linea: line.status,
                tipo_movimiento: null,
                es_principal: line.relationship === 'primary' && index === 0 ? 'TRUE' : 'FALSE',
                fecha_inicio: line.start_date || null,
                fecha_fin: line.end_date || null,
                motivo_inicio_cambio_suspension: null,
                dosis_presentacion: line.dose_text || null,
                via: line.route || null,
                pauta_codigo: null,
                pauta_label: line.schedule || null,
                pauta_otro_texto: null
            };
        });
    }

    function slugifyService(value) {
        var raw = String(value || '').toLowerCase();
        if (raw.indexOf('dermat') !== -1) return 'dermatologia';
        if (raw.indexOf('reumat') !== -1) return 'reumatologia';
        if (raw.indexOf('digest') !== -1) return 'digestivo';
        if (raw.indexOf('onco') !== -1) return 'oncologia';
        return '';
    }

    function statePresentation(initialState) {
        var states = {
            blocked_prebiologic: { state: 'bloqueado', label: 'Bloqueado' },
            watching_prebiologic: { state: 'en_vigilancia', label: 'En vigilancia' },
            ready_for_pharmacy_validation: { state: 'pending', label: 'OK Farmacia' },
            general_pending_validation: { state: 'pending', label: 'Pendiente de validación' },
            validation_pending: { state: 'pending', label: 'Pendiente de validación' },
            validation_denied: { state: 'denied', label: 'Denegado' },
            validated_not_started: { state: 'validated', label: 'Validado · pendiente de inicio' },
            awaiting_explicit_start_confirmation: { state: 'validated', label: 'Validado · pendiente de inicio' },
            active_single_line_followup: { state: 'followup', label: 'En seguimiento' },
            historical_line_read_only: { state: 'followup', label: 'En seguimiento' },
            multiple_existing_lines: { state: 'followup', label: 'En seguimiento' },
            unsaved_manual_context: { state: 'manual', label: 'Contexto manual sin guardar' }
        };
        return states[initialState] || { state: 'manual', label: 'Estado no disponible' };
    }

    function actionPolicy(initialState) {
        if (initialState === 'ready_for_pharmacy_validation' || initialState === 'general_pending_validation' || initialState === 'validation_pending') {
            return { route: 'farmacia_validacion.html', entrada: 'validacion', label: 'Abrir validación', icon: 'fa-check-double' };
        }
        if (initialState === 'validated_not_started' || initialState === 'awaiting_explicit_start_confirmation') {
            return { route: 'farmacia_primera_visita.html', entrada: 'primera_visita', label: 'Abrir Primera Visita', icon: 'fa-plus-circle' };
        }
        if (initialState === 'active_single_line_followup' || initialState === 'historical_line_read_only' || initialState === 'multiple_existing_lines') {
            return { route: 'farmacia_seguimiento.html', entrada: 'seguimiento', label: 'Abrir Seguimiento', icon: 'fa-clipboard-list' };
        }
        if (initialState === 'blocked_prebiologic') {
            return { route: null, reason: 'Validación bloqueada hasta resolver el requisito prebiológico explícito.' };
        }
        if (initialState === 'watching_prebiologic') {
            return { route: null, reason: 'Solicitud en vigilancia prebiológica; todavía no está lista para Farmacia.' };
        }
        if (initialState === 'validation_denied') {
            return { route: null, reason: 'Solicitud denegada; no existe línea terapéutica iniciada.' };
        }
        return { route: null, reason: 'No hay una acción asistencial V4 habilitada para este estado.' };
    }

    function visiblePatient(person) {
        var scenario = getScenarioStateByPatientId(person.patient_id) || {};
        var presentation = statePresentation(scenario.initial_state);
        var readiness = getReadinessByPatientId(person.patient_id);
        var requests = getRequestsByPatientId(person.patient_id);
        var validations = getValidationActsByPatientId(person.patient_id);
        var lines = getCanonicalLinesByPatientId(person.patient_id);
        var request = requests[0] || null;
        var primaryLine = lines.find(function (line) { return line.relationship === 'primary' && line.status !== 'historical'; }) || lines[0] || null;
        var drugName = request ? request.requested_drug_name : (primaryLine ? primaryLine.drug_name : null);
        var patient = {
            patient_id: person.patient_id,
            v4ScenarioId: person.scenario_id,
            v4InitialState: scenario.initial_state || null,
            nombre: 'Paciente sintético ' + (person.scenario_id || ''),
            cip: person.cip,
            edad: '—',
            sexo: '—',
            servicio: person.service,
            servicioSlug: slugifyService(person.service),
            patologia: person.pathology,
            estado: presentation.state,
            estadoLabel: presentation.label,
            fechaSolicitud: readiness && readiness.readiness_date ? readiness.readiness_date : '—',
            ultimaSolicitud: readiness && readiness.readiness_date ? readiness.readiness_date : '—',
            ultimaVisita: '—',
            primeraVisita: null,
            seguimiento: null,
            principioActivo: primaryLine ? primaryLine.active_ingredient : null,
            marcaComercial: drugName,
            dosis: request ? request.dose_text : (primaryLine ? primaryLine.dose_text : null),
            pauta: request ? request.schedule : (primaryLine ? primaryLine.schedule : null),
            via: request ? request.route : (primaryLine ? primaryLine.route : null),
            biologicos: lines.map(function (line) {
                return {
                    linea_id: line.line_id,
                    nombre_linea: line.drug_name,
                    nombre_comercial: line.drug_name,
                    principio_activo: line.active_ingredient,
                    dosis: line.dose_text,
                    via: line.route,
                    pauta: line.schedule,
                    fecha_inicio: line.start_date,
                    fecha_fin: line.end_date,
                    estado_linea: line.status,
                    tipo_relacion: line.relationship,
                    es_principal: line.relationship === 'primary'
                };
            }),
            adherencia: null,
            scores: '',
            efectosAdversos: '',
            analitica: readiness ? (readiness.blocking_item || readiness.pending_item || (readiness.prebiologic_complete ? 'Prebiológico completo' : 'Sin registro')) : (validations[0] && validations[0].observation ? validations[0].observation : 'Sin registro'),
            proms: [],
            rawActs: legacyActs(person.patient_id),
            rawValidations: legacyValidations(person.patient_id),
            rawFollowups: [],
            rawAdverseEvents: [],
            importSource: person.source === 'imported_nursing' ? 'Escenario V4 Enfermería' : 'Escenario V4',
            source_type: person.source === 'imported_nursing' ? 'ENFERMERIA' : 'V4_SCENARIO',
            origen_solicitud: person.source === 'imported_nursing' ? 'enfermeria' : person.source,
            tipo_origen: person.source === 'imported_nursing' ? 'enfermeria_inicio_biologico' : person.source
        };
        if (readiness) {
            patient.estado_prebiologico_enfermeria = readiness.status;
            patient.fecha_ok_farmacia = readiness.readiness_date || null;
            patient.observaciones_prebiologico = readiness.blocking_item || readiness.pending_item || null;
            if (readiness.blocking_item) patient.analitica_estado = 'ALTERADA / BLOQUEO';
            if (readiness.pending_item) patient.medicina_preventiva_estado = 'PENDIENTE';
        }
        return patient;
    }

    function renderSafeQuickViewActions(demo) {
        if (typeof document === 'undefined') return;
        var actions = document.getElementById('fhQvActions');
        var subtitle = document.getElementById('fhSubtitle');
        if (!actions || !subtitle || actions.getAttribute('data-v4-policy-applied') === subtitle.textContent) return;
        var patient = demo.findPatientByCip ? demo.findPatientByCip(subtitle.textContent) : null;
        if (!patient || !patient.v4InitialState) return;
        var policy = actionPolicy(patient.v4InitialState);
        while (actions.firstChild) actions.removeChild(actions.firstChild);
        actions.setAttribute('data-v4-policy-applied', subtitle.textContent);
        if (!policy.route) {
            var note = document.createElement('span');
            note.className = 'validation-note-block__value';
            note.setAttribute('data-v4-action', 'blocked');
            note.textContent = policy.reason;
            actions.appendChild(note);
            return;
        }
        var link = document.createElement('a');
        link.className = 'btn btn-primary';
        link.setAttribute('data-v4-action', policy.entrada);
        link.href = demo.makeContextUrl(policy.route, {
            cip: patient.cip,
            servicio: patient.servicioSlug || patient.servicio,
            patologia: patient.patologia,
            entrada: policy.entrada
        });
        demo.appendIconText(link, policy.icon, policy.label);
        actions.appendChild(link);
    }

    function installQuickViewGuard(demo) {
        if (installingQuickViewGuard || typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
        installingQuickViewGuard = true;
        var start = function () {
            if (!document.body) return;
            var busy = false;
            var observer = new MutationObserver(function () {
                if (busy) return;
                busy = true;
                try { renderSafeQuickViewActions(demo); } finally { busy = false; }
            });
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });
            renderSafeQuickViewActions(demo);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
        else start();
    }

    function enrichFarmaciaDemo(demo) {
        if (!demo || !demo.patients) return demo;
        Object.keys(demo.patients).forEach(function (cip) { delete demo.patients[cip]; });
        dataset.persons.forEach(function (person) {
            var adapted = visiblePatient(person);
            demo.patients[adapted.cip] = adapted;
        });
        demo.getV4ScenarioState = getScenarioStateByPatientId;
        demo.getV4Readiness = getReadinessByPatientId;
        demo.getV4Requests = getRequestsByPatientId;
        demo.getV4ValidationActs = getValidationActsByPatientId;
        demo.getV4TreatmentLines = getCanonicalLinesByPatientId;
        demo.getV4ActionPolicy = actionPolicy;
        installQuickViewGuard(demo);
        if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
            document.dispatchEvent(new CustomEvent('farmacia:data-imported', { detail: { source: 'V4_SCENARIOS' } }));
        }
        return demo;
    }

    function installFarmaciaDemoHook() {
        var existing = window.FarmaciaDemo;
        var current = existing;
        function adaptAssigned(value) {
            current = value;
            if (!value) return;
            var originalReady = value.ready && typeof value.ready.then === 'function' ? value.ready : Promise.resolve();
            value.ready = originalReady.then(function () { return enrichFarmaciaDemo(value); });
            value.whenReady = function (init) {
                return value.ready.then(init).catch(function () { renderSourceError(); });
            };
        }
        try {
            Object.defineProperty(window, 'FarmaciaDemo', {
                configurable: true,
                enumerable: true,
                get: function () { return current; },
                set: adaptAssigned
            });
            if (existing) adaptAssigned(existing);
        } catch (error) {
            if (existing) adaptAssigned(existing);
        }
    }

    installFarmaciaDemoHook();

    var ready = fetch(DATASET_URL, { cache: 'no-store' })
        .then(function (response) {
            if (!response.ok) fail();
            return response.json();
        })
        .then(function (payload) {
            dataset = validate(payload);
            return api;
        })
        .catch(function () { return fail(); });

    function getLongitudinalDataset() {
        return { pacientes: dataset.persons.map(function (person) {
            var lines = getCanonicalLinesByPatientId(person.patient_id);
            return {
                cip: person.cip,
                nombre_demo: person.patient_id,
                sexo: null,
                edad: null,
                servicios_origen: person.service ? [person.service] : [],
                patologias: person.pathology ? [person.pathology] : [],
                comorbilidades_relevantes: [],
                episodios_asistenciales: [],
                tratamientos: lines.map(function (line) {
                    return {
                        id: line.line_id,
                        cip: person.cip,
                        nombre_comercial: line.drug_name,
                        principio_activo: line.active_ingredient,
                        presentacion_dosis: line.dose_text,
                        via: line.route,
                        pauta: line.schedule,
                        fecha_inicio: line.start_date,
                        fecha_fin: line.end_date,
                        activo: line.status === 'active',
                        motivo_inicio: null,
                        motivo_suspension: null,
                        estado_validacion_farmacia: line.status === 'validated_not_started' ? 'validado' : null
                    };
                }),
                cambios_pauta: [], proms: [], actividad_clinica: [], eventos_adversos: [], adherencia: []
            };
        }) };
    }

    var api = {
        ready: ready,
        errorMessage: ERROR_MESSAGE,
        getPersons: function () { return dataset.persons.slice(); },
        findPersonByCip: function (cip) {
            var target = String(cip || '').trim().toUpperCase();
            if (!target) return null;
            return dataset.persons.find(function (person) { return String(person.cip || '').trim().toUpperCase() === target; }) || null;
        },
        findPersonById: function (patientId) { return firstByPatientId(dataset.persons, patientId); },
        getActsByPatientId: legacyActs,
        getValidationsByPatientId: legacyValidations,
        getTreatmentLinesByPatientId: legacyTreatmentLines,
        getVisitsByPatientId: function (patientId) { return byPatientId(dataset.visits, patientId); },
        getFollowupsByPatientId: function (patientId) { return byPatientId(dataset.followups, patientId); },
        getAdverseEventsByPatientId: function (patientId) { return byPatientId(dataset.adverse_events, patientId); },
        getScenarioStateByPatientId: getScenarioStateByPatientId,
        getReadinessByPatientId: getReadinessByPatientId,
        getRequestsByPatientId: getRequestsByPatientId,
        getValidationActsByPatientId: getValidationActsByPatientId,
        getCanonicalLinesByPatientId: getCanonicalLinesByPatientId,
        getLongitudinalDataset: getLongitudinalDataset
    };

    window.FarmaciaDataSource = api;
    window.FarmaciaV4Source = {
        expectedMetadata: EXPECTED_METADATA,
        statePresentation: statePresentation,
        actionPolicy: actionPolicy,
        visiblePatient: visiblePatient,
        enrichFarmaciaDemo: enrichFarmaciaDemo
    };
})();
