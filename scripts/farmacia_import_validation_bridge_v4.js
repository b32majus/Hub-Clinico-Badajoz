(function (root) {
    'use strict';

    function text(value) {
        return value === null || value === undefined ? '' : String(value).trim();
    }

    function token(value) {
        return text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
    }

    function values(object) {
        return Object.keys(object || {}).map(function (key) { return object[key]; });
    }

    function originFromPatient(patient) {
        var source = [
            patient && patient.source_type,
            patient && patient.origen_solicitud,
            patient && patient.tipo_origen,
            patient && patient.importSource
        ].map(text).join(' ').toLowerCase();
        if (source.indexOf('enfermer') !== -1) return 'imported_nursing';
        if (source.indexOf('farmacia') !== -1) return 'manual_fh_capture';
        return 'imported_clinical_service';
    }

    function ensureImportedRequest(options, state) {
        var core = options.core;
        var store = options.store;
        var patientId = text(options.patientId);
        var patientState = store.getPatientState(state, patientId);
        if (values(patientState.requests).length) return state;

        var demo = root.FarmaciaDemo;
        var context = demo && typeof demo.getQueryContext === 'function' ? demo.getQueryContext() : {};
        var patient = context && context.patient;
        if (!patient || !patient.v4ImportBacked || text(patient.patient_id) !== patientId) return state;

        var emptyIdentity = root.FarmaciaValidationStateV4Model.emptyCatalogIdentity();
        var drugName = text(patient.farmaco_solicitado || patient.farmaco || patient.marcaComercial || patient.principioActivo);
        var activeIngredient = text(patient.principioActivo || patient.principio_activo_import);
        var request = core.createTreatmentRequest({
            patient_id: patientId,
            request_type: 'new_start',
            origin: originFromPatient(patient),
            from_line_id: '',
            base_line_id: '',
            requested_at: text(patient.fechaSolicitud || patient.fecha_ok_farmacia),
            professional_demo_id: '',
            drug: {
                drug_name: drugName,
                active_ingredient: activeIngredient,
                catalog_identity: emptyIdentity,
                catalog_snapshot: emptyIdentity
            },
            therapy: {
                dose_text: text(patient.dosis),
                presentation: text(patient.presentacion),
                route: text(patient.via),
                pauta_codigo: text(patient.pauta_codigo),
                pauta_label: text(patient.pauta_label || patient.pauta),
                pauta_otro_texto: text(patient.pauta_otro_texto),
                induction: text(patient.induccion)
            },
            observations: text(patient.observaciones_prebiologico),
            created_at: '',
            updated_at: ''
        }, {
            idFactory: function () { return 'req_import_' + token(patientId); }
        });

        state = store.upsertRequest(state, patientId, request);
        store.save(state);
        return state;
    }

    var model = root.FarmaciaValidationStateV4Model;
    if (!model || typeof model.seedPatientState !== 'function' || model.__v4ImportBridgeApplied) return;
    model.__v4ImportBridgeApplied = true;

    var originalSeed = model.seedPatientState;
    model.seedPatientState = function (options) {
        var state = originalSeed(options);
        return ensureImportedRequest(options, state);
    };

    root.FarmaciaImportValidationBridgeV4 = {
        ensureImportedRequest: ensureImportedRequest,
        originFromPatient: originFromPatient
    };
})(typeof window !== 'undefined' ? window : globalThis);
