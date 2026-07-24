(function (root, factory) {
    "use strict";
    var api = factory(root || {});
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (root && typeof root === "object") root.FarmaciaValidationStateV4Model = api;
    if (typeof window !== "undefined" && window) window.FarmaciaValidationStateV4Model = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";
    var DRAFT_ID = "validation_ui_v4";

    function text(value) {
        return value === null || value === undefined ? "" : String(value).trim();
    }

    function clone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function own(object, key) {
        return Object.prototype.hasOwnProperty.call(object || {}, key);
    }

    function normalizeResult(value) {
        var result = text(value).toLowerCase();
        if (result === "pending" || result === "pendiente") return "pending";
        if (result === "validated" || result === "validado") return "validated";
        if (result === "denied" || result === "denegado") return "denied";
        return "";
    }

    function deterministicId(prefix, raw) {
        var token = text(raw).replace(/[^a-zA-Z0-9_-]+/g, "-");
        return prefix + (token || "generated");
    }

    function emptyCatalogIdentity() {
        return {
            selected_drug_id: "",
            source_type: "",
            national_code: "",
            registration_number: "",
            drug_name: "",
            active_ingredient: ""
        };
    }

    function catalogIdentityFromSnapshot(snapshot) {
        var source = snapshot && typeof snapshot === "object" ? snapshot : {};
        return {
            selected_drug_id: text(source.selected_drug_id || source.drug_id),
            source_type: text(source.source_type),
            national_code: text(source.codigo_nacional_snapshot || source.codigo_nacional || source.national_code),
            registration_number: text(source.nregistro_snapshot || source.nregistro || source.registration_number),
            drug_name: text(source.nombre_snapshot || source.nombre_comercial || source.display_name || source.drug_name),
            active_ingredient: text(source.principio_activo_snapshot || source.principio_activo || source.active_ingredient)
        };
    }

    function runtimeRequestToCore(runtimeRequest, patientId, core) {
        var source = runtimeRequest || {};
        var request = core.createTreatmentRequest({
            patient_id: patientId,
            request_type: text(source.request_type) || "new_start",
            origin: text(source.origin) || "unknown",
            from_line_id: text(source.from_line_id),
            base_line_id: text(source.base_line_id),
            requested_at: text(source.requested_at),
            professional_demo_id: text(source.professional_demo_id),
            drug: {
                drug_name: text(source.requested_drug_name),
                active_ingredient: text(source.active_ingredient),
                catalog_identity: emptyCatalogIdentity(),
                catalog_snapshot: emptyCatalogIdentity()
            },
            therapy: {
                dose_text: text(source.dose_text),
                presentation: text(source.presentation),
                route: text(source.route),
                pauta_codigo: text(source.pauta_codigo),
                pauta_label: text(source.schedule || source.pauta_label),
                pauta_otro_texto: text(source.pauta_otro_texto),
                induction: text(source.induction)
            },
            observations: text(source.observations),
            created_at: text(source.created_at),
            updated_at: text(source.updated_at)
        }, { idFactory: function () { return deterministicId("req_", source.request_id); } });
        return request;
    }

    function runtimeValidationToCore(runtimeAct, patientId, request, core) {
        var source = runtimeAct || {};
        return core.createValidationAct({
            patient_id: patientId,
            request_id: request.request_id,
            produced_line_id: "",
            performed_at: text(source.performed_at || source.fecha_acto),
            result: normalizeResult(source.result) || "pending",
            professional_demo_id: text(source.professional_demo_id),
            observations: text(source.observation || source.observations),
            origin: text(request.origin) || "unknown",
            created_at: text(source.created_at)
        }, { idFactory: function () { return deterministicId("val_", source.validation_act_id); } });
    }

    function runtimeLineInput(runtimeLine) {
        var source = runtimeLine || {};
        return {
            relationship: text(source.relationship) || "primary",
            catalog_identity: emptyCatalogIdentity(),
            catalog_snapshot: emptyCatalogIdentity(),
            drug_name: text(source.drug_name),
            active_ingredient: text(source.active_ingredient),
            dose_text: text(source.dose_text),
            presentation: text(source.presentation),
            route: text(source.route),
            pauta_codigo: text(source.pauta_codigo),
            pauta_label: text(source.schedule || source.pauta_label),
            pauta_otro_texto: text(source.pauta_otro_texto),
            start_date: text(source.start_date),
            end_date: text(source.end_date),
            created_at: text(source.created_at),
            updated_at: text(source.updated_at)
        };
    }

    function patientIsEmpty(patientState) {
        if (!patientState) return true;
        return ["requests", "validation_acts", "lines", "movements", "drafts"].every(function (key) {
            return !patientState[key] || Object.keys(patientState[key]).length === 0;
        });
    }

    function seedPatientState(options) {
        var core = options.core;
        var store = options.store;
        var dataSource = options.dataSource;
        var patientId = text(options.patientId);
        if (!core || !store || !dataSource || !patientId) throw new Error("seed dependencies are required");

        var state = store.load();
        var existing = store.getPatientState(state, patientId);
        if (!patientIsEmpty(existing)) return state;

        var runtimeRequests = dataSource.getRequestsByPatientId(patientId) || [];
        var runtimeValidations = dataSource.getValidationActsByPatientId(patientId) || [];
        var runtimeLines = dataSource.getCanonicalLinesByPatientId(patientId) || [];
        var requestMap = {};
        var validationMap = {};

        runtimeRequests.forEach(function (runtimeRequest) {
            var request = runtimeRequestToCore(runtimeRequest, patientId, core);
            requestMap[text(runtimeRequest.request_id)] = request;
            state = store.upsertRequest(state, patientId, request);
        });

        runtimeValidations.forEach(function (runtimeAct) {
            var runtimeRequestId = text(runtimeAct.request_id);
            var request = requestMap[runtimeRequestId] || Object.keys(requestMap).map(function (key) { return requestMap[key]; })[0];
            if (!request) return;
            var act = runtimeValidationToCore(runtimeAct, patientId, request, core);
            validationMap[text(runtimeAct.validation_act_id)] = act;
            state = store.upsertValidationAct(state, patientId, act);
        });

        runtimeLines.forEach(function (runtimeLine) {
            var sourceRequestId = text(runtimeLine.source_request_id);
            var sourceValidationId = text(runtimeLine.source_validation_act_id);
            var request = requestMap[sourceRequestId] || Object.keys(requestMap).map(function (key) { return requestMap[key]; })[0];
            var act = validationMap[sourceValidationId] || Object.keys(validationMap).map(function (key) { return validationMap[key]; })[0];
            var line;
            if (runtimeLine.provenance === "validated_in_hub" && request && act && act.result === "validated") {
                line = core.createTreatmentLineFromValidatedRequest(request, act, runtimeLineInput(runtimeLine), {
                    idFactory: function () { return deterministicId("line_", runtimeLine.line_id); },
                    existingLines: []
                });
                state = store.upsertLine(state, patientId, line);
                act.produced_line_id = line.line_id;
                state = store.upsertValidationAct(state, patientId, act);
            } else if (runtimeLine.provenance === "pre_hub_validated" || runtimeLine.provenance === "pre_hub_existing") {
                line = core.createPreHubTreatmentLine(Object.assign(runtimeLineInput(runtimeLine), {
                    patient_id: patientId,
                    provenance: runtimeLine.provenance,
                    status: text(runtimeLine.status) || "unknown"
                }), { idFactory: function () { return deterministicId("line_", runtimeLine.line_id); } });
                state = store.upsertLine(state, patientId, line);
            }
        });

        store.save(state);
        return state;
    }

    function values(object) {
        return Object.keys(object || {}).map(function (key) { return object[key]; });
    }

    function firstRequest(patientState) {
        return values(patientState && patientState.requests)[0] || null;
    }

    function latestValidation(patientState) {
        var acts = values(patientState && patientState.validation_acts);
        acts.sort(function (a, b) {
            return text(a.performed_at || a.created_at).localeCompare(text(b.performed_at || b.created_at));
        });
        return acts.length ? acts[acts.length - 1] : null;
    }

    function findLineForAct(patientState, validationActId) {
        return values(patientState && patientState.lines).find(function (line) {
            return line.source_validation_act_id === validationActId;
        }) || null;
    }

    function makeUiValidationId(request) {
        return deterministicId("val_ui_", request.request_id);
    }

    function mergeRequestWithExplicitTherapy(request, explicit) {
        var next = clone(request);
        var therapy = explicit && explicit.therapy ? explicit.therapy : {};
        var drug = explicit && explicit.drug ? explicit.drug : {};
        if (text(drug.drug_name)) next.drug.drug_name = text(drug.drug_name);
        if (text(drug.active_ingredient)) next.drug.active_ingredient = text(drug.active_ingredient);
        if (drug.catalog_identity) next.drug.catalog_identity = clone(drug.catalog_identity);
        if (drug.catalog_snapshot) next.drug.catalog_snapshot = clone(drug.catalog_snapshot);
        ["dose_text", "presentation", "route", "pauta_codigo", "pauta_label", "pauta_otro_texto"].forEach(function (key) {
            if (own(therapy, key)) next.therapy[key] = text(therapy[key]);
        });
        next.updated_at = text(explicit && explicit.saved_at);
        return next;
    }

    function saveDecision(options) {
        var core = options.core;
        var store = options.store;
        var patientId = text(options.patientId);
        var result = normalizeResult(options.result);
        var explicit = options.explicit || {};
        if (!core || !store || !patientId) throw new Error("save dependencies are required");
        if (!result) throw new Error("validation result is required");
        if (result === "denied" && !text(options.denialReason)) throw new Error("denial reason is required");

        var state = store.load();
        var patient = store.getPatientState(state, patientId);
        var request = firstRequest(patient);
        if (!request) throw new Error("treatment request is required");
        request = mergeRequestWithExplicitTherapy(request, explicit);
        state = store.upsertRequest(state, patientId, request);
        patient = store.getPatientState(state, patientId);

        var existingAct = latestValidation(patient);
        var actId = existingAct ? existingAct.validation_act_id : makeUiValidationId(request);
        var existingLine = existingAct ? findLineForAct(patient, existingAct.validation_act_id) : null;
        if (existingLine && result !== "validated") {
            throw new Error("a validation that already produced a line cannot be downgraded");
        }

        var performedAt = text(options.performedAt || new Date().toISOString());
        var act = core.createValidationAct({
            patient_id: patientId,
            request_id: request.request_id,
            produced_line_id: "",
            performed_at: performedAt,
            result: result,
            professional_demo_id: text(options.professionalDemoId),
            observations: text(options.observations),
            origin: text(request.origin) || "unknown",
            created_at: existingAct ? text(existingAct.created_at) : performedAt
        }, { idFactory: function () { return actId; } });
        act.validation_act_id = actId;
        state = store.upsertValidationAct(state, patientId, act);

        var line = null;
        if (result === "validated") {
            patient = store.getPatientState(state, patientId);
            existingLine = findLineForAct(patient, act.validation_act_id);
            if (existingLine) {
                line = clone(existingLine);
                line.status = "validated_not_started";
                line.provenance = "validated_in_hub";
                line.start_date = "";
                line.end_date = "";
                line.updated_at = performedAt;
                var input = explicit.line || {};
                ["drug_name", "active_ingredient", "dose_text", "presentation", "route", "pauta_codigo", "pauta_label", "pauta_otro_texto"].forEach(function (key) {
                    if (own(input, key)) line[key] = text(input[key]);
                });
                if (input.catalog_identity) line.catalog_identity = clone(input.catalog_identity);
                if (input.catalog_snapshot) line.catalog_snapshot = clone(input.catalog_snapshot);
            } else {
                var lineInput = Object.assign({ relationship: "primary", start_date: "", end_date: "", created_at: performedAt, updated_at: performedAt }, explicit.line || {});
                line = core.createTreatmentLineFromValidatedRequest(request, act, lineInput, {
                    idFactory: function () { return deterministicId("line_ui_", request.request_id); },
                    existingLines: values(patient.lines)
                });
            }
            state = store.upsertLine(state, patientId, line);
            act.produced_line_id = line.line_id;
            state = store.upsertValidationAct(state, patientId, act);
        }

        state = store.upsertDraft(state, patientId, DRAFT_ID, {
            patient_id: patientId,
            denial_reason: text(options.denialReason),
            observations: text(options.observations),
            appointment_date: text(options.appointmentDate),
            saved_at: performedAt
        });
        store.save(state);
        return {
            state: state,
            patient: store.getPatientState(state, patientId),
            request: request,
            validation_act: act,
            line: line
        };
    }

    function restoreDecision(options) {
        var store = options.store;
        var patientId = text(options.patientId);
        var state = store.load();
        var patient = store.getPatientState(state, patientId);
        var act = latestValidation(patient);
        var line = act ? findLineForAct(patient, act.validation_act_id) : null;
        var draft = patient.drafts && patient.drafts[DRAFT_ID] ? patient.drafts[DRAFT_ID] : {};
        return {
            result: act ? act.result : "",
            denial_reason: text(draft.denial_reason),
            observations: text(draft.observations || (act && act.observations)),
            appointment_date: text(draft.appointment_date),
            saved_at: text(draft.saved_at),
            validation_act_id: act ? act.validation_act_id : "",
            produced_line_id: act ? text(act.produced_line_id) : "",
            line: line ? clone(line) : null
        };
    }


    return {
        DRAFT_ID: DRAFT_ID,
        normalizeResult: normalizeResult,
        deterministicId: deterministicId,
        catalogIdentityFromSnapshot: catalogIdentityFromSnapshot,
        emptyCatalogIdentity: emptyCatalogIdentity,
        runtimeRequestToCore: runtimeRequestToCore,
        seedPatientState: seedPatientState,
        saveDecision: saveDecision,
        restoreDecision: restoreDecision
    };
});
