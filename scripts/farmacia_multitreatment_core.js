(function (root, factory) {
    "use strict";
    var api = factory(root || {});
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (root && typeof root === "object") root.FarmaciaMultitreatmentCore = api;
    if (typeof window !== "undefined" && window && typeof window === "object") {
        window.FarmaciaMultitreatmentCore = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
    "use strict";

    var SCHEMA = "farmaciaDemo.multitreatment.v1";
    var REQUEST_TYPES = ["new_start", "switch", "add_on"];
    var REQUEST_ORIGINS = ["manual_fh_capture", "imported_nursing", "imported_clinical_service", "unknown"];
    var VALIDATION_RESULTS = ["pending", "validated", "denied"];
    var RELATIONSHIPS = ["primary", "additional"];
    var LINE_STATUSES = ["validated_not_started", "active", "paused", "suspended", "completed", "historical", "unknown"];
    var PROVENANCES = ["validated_in_hub", "pre_hub_validated", "pre_hub_existing"];
    var MOVEMENT_TYPES = ["start", "switch", "add_on", "suspension", "pause", "resume", "optimization", "completion"];
    var COLLECTIONS = ["requests", "validation_acts", "lines", "movements", "drafts"];
    var ID_FIELDS = {
        requests: "request_id",
        validation_acts: "validation_act_id",
        lines: "line_id",
        movements: "movement_id"
    };
    var REQUEST_FIELDS = ["request_id", "patient_id", "request_type", "origin", "from_line_id", "base_line_id", "requested_at", "professional_demo_id", "drug", "therapy", "observations", "created_at", "updated_at"];
    var VALIDATION_FIELDS = ["validation_act_id", "patient_id", "request_id", "produced_line_id", "performed_at", "result", "professional_demo_id", "observations", "origin", "created_at"];
    var LINE_FIELDS = ["line_id", "patient_id", "source_request_id", "source_validation_act_id", "relationship", "status", "provenance", "catalog_identity", "catalog_snapshot", "drug_name", "active_ingredient", "dose_text", "presentation", "route", "pauta_codigo", "pauta_label", "pauta_otro_texto", "start_date", "end_date", "created_at", "updated_at"];
    var MOVEMENT_FIELDS = ["movement_id", "patient_id", "movement_type", "target_line_id", "from_line_id", "to_line_id", "base_line_id", "effective_at", "reason", "validation_act_id", "declared_by_demo", "created_at"];
    var CATALOG_FIELDS = ["selected_drug_id", "source_type", "national_code", "registration_number", "drug_name", "active_ingredient"];
    var DRUG_FIELDS = ["drug_name", "active_ingredient", "catalog_identity", "catalog_snapshot"];

    function own(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    function isRecord(value) {
        return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    function clone(value) {
        if (value === undefined) return undefined;
        return JSON.parse(JSON.stringify(value));
    }

    function text(value) {
        return value === null || value === undefined ? "" : String(value).trim();
    }

    function requireText(value, field) {
        var result = text(value);
        if (!result) throw new Error(field + " is required");
        return result;
    }

    function enumValue(value, allowed, field) {
        var result = requireText(value, field);
        if (allowed.indexOf(result) === -1) throw new Error(field + " is invalid");
        return result;
    }

    function secureId(prefix, options) {
        var opts = options || {};
        if (typeof opts.idFactory === "function") {
            var supplied = requireText(opts.idFactory(prefix), "idFactory result");
            return supplied.indexOf(prefix) === 0 ? supplied : prefix + supplied;
        }
        var cryptoSource = own(opts, "crypto") ? opts.crypto : root.crypto;
        var opaque;
        if (cryptoSource && typeof cryptoSource.randomUUID === "function") {
            opaque = cryptoSource.randomUUID();
        } else if (cryptoSource && typeof cryptoSource.getRandomValues === "function") {
            var bytes = new Uint8Array(16);
            cryptoSource.getRandomValues(bytes);
            opaque = Array.prototype.map.call(bytes, function (byte) {
                return byte.toString(16).padStart(2, "0");
            }).join("");
        } else {
            throw new Error("Secure crypto source unavailable");
        }
        return prefix + opaque;
    }

    function catalogObject(value) {
        var source = isRecord(value) ? value : {};
        return {
            selected_drug_id: text(source.selected_drug_id),
            source_type: text(source.source_type),
            national_code: text(source.national_code),
            registration_number: text(source.registration_number),
            drug_name: text(source.drug_name),
            active_ingredient: text(source.active_ingredient)
        };
    }

    function drugObject(value) {
        var source = isRecord(value) ? value : {};
        return {
            drug_name: text(source.drug_name),
            active_ingredient: text(source.active_ingredient),
            catalog_identity: catalogObject(source.catalog_identity),
            catalog_snapshot: catalogObject(source.catalog_snapshot)
        };
    }

    function createTreatmentRequest(input, options) {
        var source = isRecord(input) ? input : {};
        var requestType = enumValue(source.request_type, REQUEST_TYPES, "request_type");
        var fromLineId = text(source.from_line_id);
        var baseLineId = text(source.base_line_id);
        if (requestType === "switch" && !fromLineId) throw new Error("from_line_id is required for switch");
        if (requestType === "add_on" && !baseLineId) throw new Error("base_line_id is required for add_on");
        return {
            request_id: secureId("req_", options),
            patient_id: requireText(source.patient_id, "patient_id"),
            request_type: requestType,
            origin: enumValue(source.origin, REQUEST_ORIGINS, "origin"),
            from_line_id: fromLineId,
            base_line_id: baseLineId,
            requested_at: text(source.requested_at),
            professional_demo_id: text(source.professional_demo_id),
            drug: drugObject(source.drug),
            therapy: clone(isRecord(source.therapy) ? source.therapy : {}),
            observations: text(source.observations),
            created_at: text(source.created_at),
            updated_at: text(source.updated_at)
        };
    }

    function createValidationAct(input, options) {
        var source = isRecord(input) ? input : {};
        var result = enumValue(source.result, VALIDATION_RESULTS, "result");
        var producedLineId = text(source.produced_line_id);
        if (result !== "validated" && producedLineId) throw new Error("pending or denied validation cannot have produced_line_id");
        return {
            validation_act_id: secureId("val_", options),
            patient_id: requireText(source.patient_id, "patient_id"),
            request_id: requireText(source.request_id, "request_id"),
            produced_line_id: producedLineId,
            performed_at: text(source.performed_at),
            result: result,
            professional_demo_id: text(source.professional_demo_id),
            observations: text(source.observations),
            origin: enumValue(source.origin, REQUEST_ORIGINS, "origin"),
            created_at: text(source.created_at)
        };
    }

    function treatmentLine(source, options) {
        return {
            line_id: secureId("line_", options),
            patient_id: requireText(source.patient_id, "patient_id"),
            source_request_id: text(source.source_request_id),
            source_validation_act_id: text(source.source_validation_act_id),
            relationship: enumValue(source.relationship, RELATIONSHIPS, "relationship"),
            status: enumValue(source.status, LINE_STATUSES, "status"),
            provenance: enumValue(source.provenance, PROVENANCES, "provenance"),
            catalog_identity: catalogObject(source.catalog_identity),
            catalog_snapshot: catalogObject(source.catalog_snapshot),
            drug_name: text(source.drug_name),
            active_ingredient: text(source.active_ingredient),
            dose_text: text(source.dose_text),
            presentation: text(source.presentation),
            route: text(source.route),
            pauta_codigo: text(source.pauta_codigo),
            pauta_label: text(source.pauta_label),
            pauta_otro_texto: text(source.pauta_otro_texto),
            start_date: text(source.start_date),
            end_date: text(source.end_date),
            created_at: text(source.created_at),
            updated_at: text(source.updated_at)
        };
    }

    function createTreatmentLineFromValidatedRequest(request, validationAct, input, options) {
        var req = isRecord(request) ? request : {};
        var act = isRecord(validationAct) ? validationAct : {};
        var source = isRecord(input) ? input : {};
        var patientId = requireText(req.patient_id, "request.patient_id");
        if (patientId !== requireText(act.patient_id, "validation_act.patient_id")) throw new Error("request and validation patient mismatch");
        if (requireText(req.request_id, "request.request_id") !== requireText(act.request_id, "validation_act.request_id")) {
            throw new Error("validation_act does not belong to request");
        }
        if (act.result !== "validated") throw new Error("only a validated act can produce a line");
        if (text(act.produced_line_id)) throw new Error("validation act already produced a line");
        var existingLines = options && Array.isArray(options.existingLines) ? options.existingLines : [];
        if (existingLines.some(function (line) { return line && line.source_validation_act_id === act.validation_act_id; })) {
            throw new Error("validation act already produced a line");
        }
        var drug = isRecord(req.drug) ? req.drug : {};
        var therapy = isRecord(req.therapy) ? req.therapy : {};
        var catalogIdentity = source.catalog_identity || drug.catalog_identity || {};
        var catalogSnapshot = source.catalog_snapshot || drug.catalog_snapshot || {};
        return treatmentLine({
            patient_id: patientId,
            source_request_id: req.request_id,
            source_validation_act_id: requireText(act.validation_act_id, "validation_act.validation_act_id"),
            relationship: source.relationship,
            status: "validated_not_started",
            provenance: "validated_in_hub",
            catalog_identity: catalogIdentity,
            catalog_snapshot: catalogSnapshot,
            drug_name: own(source, "drug_name") ? source.drug_name : drug.drug_name,
            active_ingredient: own(source, "active_ingredient") ? source.active_ingredient : drug.active_ingredient,
            dose_text: own(source, "dose_text") ? source.dose_text : therapy.dose_text,
            presentation: own(source, "presentation") ? source.presentation : therapy.presentation,
            route: own(source, "route") ? source.route : therapy.route,
            pauta_codigo: own(source, "pauta_codigo") ? source.pauta_codigo : therapy.pauta_codigo,
            pauta_label: own(source, "pauta_label") ? source.pauta_label : therapy.pauta_label,
            pauta_otro_texto: own(source, "pauta_otro_texto") ? source.pauta_otro_texto : therapy.pauta_otro_texto,
            start_date: source.start_date,
            end_date: source.end_date,
            created_at: source.created_at,
            updated_at: source.updated_at
        }, options);
    }

    function createPreHubTreatmentLine(input, options) {
        var source = isRecord(input) ? input : {};
        var provenance = enumValue(source.provenance, ["pre_hub_validated", "pre_hub_existing"], "provenance");
        var name = requireText(source.drug_name, "drug_name");
        return treatmentLine({
            patient_id: source.patient_id,
            source_request_id: "",
            source_validation_act_id: "",
            relationship: source.relationship,
            status: source.status,
            provenance: provenance,
            catalog_identity: source.catalog_identity,
            catalog_snapshot: source.catalog_snapshot,
            drug_name: name,
            active_ingredient: source.active_ingredient,
            dose_text: source.dose_text,
            presentation: source.presentation,
            route: source.route,
            pauta_codigo: source.pauta_codigo,
            pauta_label: source.pauta_label,
            pauta_otro_texto: source.pauta_otro_texto,
            start_date: source.start_date,
            end_date: source.end_date,
            created_at: source.created_at,
            updated_at: source.updated_at
        }, options);
    }

    function createTreatmentMovement(input, options) {
        var source = isRecord(input) ? input : {};
        var type = enumValue(source.movement_type, MOVEMENT_TYPES, "movement_type");
        var target = text(source.target_line_id);
        var from = text(source.from_line_id);
        var to = text(source.to_line_id);
        var base = text(source.base_line_id);
        if (type === "switch" && (!from || !to)) throw new Error("switch requires from_line_id and to_line_id");
        if (type === "add_on" && (!base || !(target || to))) throw new Error("add_on requires base_line_id and an added line reference");
        if (type === "start") {
            if (!target) throw new Error("start requires target_line_id");
            if (!text(source.effective_at)) throw new Error("start requires effective_at");
            if (!text(source.validation_act_id)) throw new Error("start requires validation_act_id");
            if (!text(source.declared_by_demo)) throw new Error("start requires declared_by_demo");
            if (from || to || base) throw new Error("start cannot include from_line_id, to_line_id, or base_line_id");
        }
        if (["suspension", "pause", "resume", "optimization", "completion"].indexOf(type) !== -1 && !target) {
            throw new Error(type + " requires target_line_id");
        }
        return {
            movement_id: secureId("mov_", options),
            patient_id: requireText(source.patient_id, "patient_id"),
            movement_type: type,
            target_line_id: target,
            from_line_id: from,
            to_line_id: to,
            base_line_id: base,
            effective_at: text(source.effective_at),
            reason: text(source.reason),
            validation_act_id: text(source.validation_act_id),
            declared_by_demo: text(source.declared_by_demo),
            created_at: text(source.created_at)
        };
    }

    function emptyPatientState() {
        return { requests: {}, validation_acts: {}, lines: {}, movements: {}, drafts: {}, selected_line_id: "" };
    }

    function createEmptySessionState() {
        return { schema: SCHEMA, patients: {} };
    }

    function exactFields(value, fields) {
        if (!isRecord(value)) return false;
        var keys = Object.keys(value);
        return keys.length === fields.length && fields.every(function (field) { return own(value, field); });
    }

    function strings(value, fields) {
        return fields.every(function (field) { return typeof value[field] === "string"; });
    }

    function prefixed(value, prefix, allowEmpty) {
        return typeof value === "string" && ((allowEmpty && value === "") || value.indexOf(prefix) === 0);
    }

    function catalogIsValid(value) {
        return exactFields(value, CATALOG_FIELDS) && strings(value, CATALOG_FIELDS);
    }

    function requestIsValid(request) {
        if (!exactFields(request, REQUEST_FIELDS)) return false;
        if (!strings(request, ["request_id", "patient_id", "request_type", "origin", "from_line_id", "base_line_id", "requested_at", "professional_demo_id", "observations", "created_at", "updated_at"])) return false;
        if (!prefixed(request.request_id, "req_", false) || !request.patient_id) return false;
        if (REQUEST_TYPES.indexOf(request.request_type) === -1 || REQUEST_ORIGINS.indexOf(request.origin) === -1) return false;
        if (request.request_type === "switch" && !prefixed(request.from_line_id, "line_", false)) return false;
        if (request.request_type === "add_on" && !prefixed(request.base_line_id, "line_", false)) return false;
        if (!prefixed(request.from_line_id, "line_", true) || !prefixed(request.base_line_id, "line_", true)) return false;
        return exactFields(request.drug, DRUG_FIELDS) && strings(request.drug, ["drug_name", "active_ingredient"]) &&
            catalogIsValid(request.drug.catalog_identity) && catalogIsValid(request.drug.catalog_snapshot) && isRecord(request.therapy);
    }

    function validationIsValid(act) {
        if (!exactFields(act, VALIDATION_FIELDS)) return false;
        if (!strings(act, VALIDATION_FIELDS)) return false;
        if (!prefixed(act.validation_act_id, "val_", false) || !act.patient_id || !prefixed(act.request_id, "req_", false)) return false;
        if (!prefixed(act.produced_line_id, "line_", true)) return false;
        if (VALIDATION_RESULTS.indexOf(act.result) === -1 || REQUEST_ORIGINS.indexOf(act.origin) === -1) return false;
        return act.result === "validated" || act.produced_line_id === "";
    }

    function lineIsValid(line) {
        if (!exactFields(line, LINE_FIELDS)) return false;
        if (!strings(line, LINE_FIELDS.filter(function (field) { return field !== "catalog_identity" && field !== "catalog_snapshot"; }))) return false;
        if (!prefixed(line.line_id, "line_", false) || !line.patient_id) return false;
        if (!prefixed(line.source_request_id, "req_", true) || !prefixed(line.source_validation_act_id, "val_", true)) return false;
        if (RELATIONSHIPS.indexOf(line.relationship) === -1 || LINE_STATUSES.indexOf(line.status) === -1 || PROVENANCES.indexOf(line.provenance) === -1) return false;
        if (!catalogIsValid(line.catalog_identity) || !catalogIsValid(line.catalog_snapshot)) return false;
        if (line.provenance === "validated_in_hub") {
            var supportedStatus = line.status === "validated_not_started" || line.status === "active";
            var startDateCoherent = line.status === "active" ? !!line.start_date : line.start_date === "";
            return supportedStatus && startDateCoherent && !!line.source_request_id && !!line.source_validation_act_id;
        }
        return line.source_request_id === "" && line.source_validation_act_id === "";
    }

    function movementIsValid(movement) {
        if (!exactFields(movement, MOVEMENT_FIELDS) || !strings(movement, MOVEMENT_FIELDS)) return false;
        if (!prefixed(movement.movement_id, "mov_", false) || !movement.patient_id) return false;
        if (MOVEMENT_TYPES.indexOf(movement.movement_type) === -1) return false;
        if (!["target_line_id", "from_line_id", "to_line_id", "base_line_id"].every(function (field) { return prefixed(movement[field], "line_", true); })) return false;
        if (!prefixed(movement.validation_act_id, "val_", true)) return false;
        if (movement.movement_type === "switch" && (!movement.from_line_id || !movement.to_line_id)) return false;
        if (movement.movement_type === "add_on" && (!movement.base_line_id || !(movement.target_line_id || movement.to_line_id))) return false;
        if (movement.movement_type === "start") {
            if (!movement.target_line_id || !movement.effective_at || !movement.validation_act_id || !movement.declared_by_demo) return false;
            if (movement.from_line_id || movement.to_line_id || movement.base_line_id) return false;
        }
        if (["suspension", "pause", "resume", "optimization", "completion"].indexOf(movement.movement_type) !== -1 && !movement.target_line_id) return false;
        return true;
    }

    function patientStateErrors(patientId, patient) {
        var errors = [];
        if (!isRecord(patient)) return ["patient state must be an object"];
        if (Object.keys(patient).some(function (key) { return COLLECTIONS.indexOf(key) === -1 && key !== "selected_line_id"; })) errors.push("patient state has extra fields");
        if (typeof patient.selected_line_id !== "string") errors.push("selected_line_id must be a string");
        COLLECTIONS.forEach(function (collection) {
            if (!isRecord(patient[collection])) errors.push(collection + " must be indexed by ID");
        });
        if (errors.length) return errors;

        Object.keys(patient.requests).forEach(function (key) {
            var entity = patient.requests[key];
            if (!requestIsValid(entity)) errors.push("invalid request");
            else if (entity.request_id !== key || entity.patient_id !== patientId) errors.push("request key or patient mismatch");
        });
        Object.keys(patient.validation_acts).forEach(function (key) {
            var entity = patient.validation_acts[key];
            if (!validationIsValid(entity)) errors.push("invalid validation act");
            else if (entity.validation_act_id !== key || entity.patient_id !== patientId) errors.push("validation key or patient mismatch");
        });
        Object.keys(patient.lines).forEach(function (key) {
            var entity = patient.lines[key];
            if (!lineIsValid(entity)) errors.push("invalid line");
            else if (entity.line_id !== key || entity.patient_id !== patientId) errors.push("line key or patient mismatch");
        });
        Object.keys(patient.movements).forEach(function (key) {
            var entity = patient.movements[key];
            if (!movementIsValid(entity)) errors.push("invalid movement");
            else if (entity.movement_id !== key || entity.patient_id !== patientId) errors.push("movement key or patient mismatch");
        });
        Object.keys(patient.drafts).forEach(function (key) {
            var draft = patient.drafts[key];
            if (!isRecord(draft) || (own(draft, "patient_id") && draft.patient_id !== patientId)) errors.push("invalid draft");
        });
        if (errors.length) return errors;

        Object.keys(patient.requests).forEach(function (key) {
            var request = patient.requests[key];
            [request.from_line_id, request.base_line_id].filter(Boolean).forEach(function (lineId) {
                if (!own(patient.lines, lineId)) errors.push("request has dangling line reference");
            });
        });
        Object.keys(patient.validation_acts).forEach(function (key) {
            var act = patient.validation_acts[key];
            if (!own(patient.requests, act.request_id)) errors.push("validation has dangling request reference");
            if (act.produced_line_id) {
                var produced = patient.lines[act.produced_line_id];
                if (!produced || produced.source_validation_act_id !== act.validation_act_id || produced.source_request_id !== act.request_id) {
                    errors.push("validation produced_line_id is inconsistent");
                }
            }
        });
        var lineByValidation = {};
        Object.keys(patient.lines).forEach(function (key) {
            var line = patient.lines[key];
            if (line.provenance !== "validated_in_hub") return;
            var request = patient.requests[line.source_request_id];
            var act = patient.validation_acts[line.source_validation_act_id];
            if (!request || !act || act.request_id !== line.source_request_id || act.result !== "validated") {
                errors.push("validated-in-Hub line has dangling or incompatible source");
            }
            if (act && act.produced_line_id && act.produced_line_id !== line.line_id) errors.push("line conflicts with validation produced_line_id");
            if (own(lineByValidation, line.source_validation_act_id)) errors.push("validation act produced more than one line");
            lineByValidation[line.source_validation_act_id] = line.line_id;
        });
        Object.keys(patient.movements).forEach(function (key) {
            var movement = patient.movements[key];
            [movement.target_line_id, movement.from_line_id, movement.to_line_id, movement.base_line_id].filter(Boolean).forEach(function (lineId) {
                if (!own(patient.lines, lineId)) errors.push("movement has dangling line reference");
            });
            if (movement.validation_act_id && !own(patient.validation_acts, movement.validation_act_id)) errors.push("movement has dangling validation reference");
            if (movement.movement_type === "start") {
                var startedLine = patient.lines[movement.target_line_id];
                if (!startedLine || startedLine.provenance !== "validated_in_hub") errors.push("start movement requires validated-in-Hub line");
                else {
                    if (startedLine.status !== "active") errors.push("start movement target must be active");
                    if (startedLine.start_date !== movement.effective_at) errors.push("start movement date must match line start_date");
                    if (startedLine.source_validation_act_id !== movement.validation_act_id) errors.push("start movement validation reference mismatch");
                }
            }
        });
        Object.keys(patient.lines).forEach(function (key) {
            var line = patient.lines[key];
            if (line.provenance !== "validated_in_hub") return;
            var starts = Object.keys(patient.movements).map(function (movementId) {
                return patient.movements[movementId];
            }).filter(function (movement) {
                return movement.movement_type === "start" && movement.target_line_id === line.line_id;
            });
            if (line.status === "validated_not_started") {
                if (line.start_date) errors.push("validated_not_started line cannot have start_date");
                if (starts.length) errors.push("validated_not_started line cannot have start movement");
            }
            if (line.status === "active") {
                if (!line.start_date) errors.push("active validated-in-Hub line requires start_date");
                if (starts.length !== 1) errors.push("active validated-in-Hub line requires exactly one start movement");
                if (starts.length === 1) {
                    if (starts[0].effective_at !== line.start_date) errors.push("active line and start movement dates differ");
                    if (starts[0].validation_act_id !== line.source_validation_act_id) errors.push("active line and start movement validation differ");
                }
            }
        });
        if (patient.selected_line_id && !own(patient.lines, patient.selected_line_id)) errors.push("selected line does not belong to patient");
        var activePrimaryCount = Object.keys(patient.lines).filter(function (key) {
            var line = patient.lines[key];
            return line.status === "active" && line.relationship === "primary";
        }).length;
        if (activePrimaryCount > 1) errors.push("more than one active primary line is not allowed");
        return errors;
    }

    function patientStateIsValid(patientId, patient) {
        return patientStateErrors(patientId, patient).length === 0;
    }

    function sessionStateIsValid(state) {
        if (!isRecord(state) || state.schema !== SCHEMA || !isRecord(state.patients)) return false;
        if (Object.keys(state).some(function (key) { return key !== "schema" && key !== "patients"; })) return false;
        return Object.keys(state.patients).every(function (patientId) {
            return patientId !== "" && patientStateIsValid(patientId, state.patients[patientId]);
        });
    }

    function validatePatientState(patientState, patientId) {
        var patient = isRecord(patientState) ? patientState : {};
        var inferredIds = [];
        ["requests", "validation_acts", "lines", "movements"].forEach(function (collection) {
            if (!isRecord(patient[collection])) return;
            Object.keys(patient[collection]).forEach(function (key) {
                var value = patient[collection][key];
                if (isRecord(value) && typeof value.patient_id === "string" && inferredIds.indexOf(value.patient_id) === -1) inferredIds.push(value.patient_id);
            });
        });
        var partition = text(patientId) || (inferredIds.length === 1 ? inferredIds[0] : "");
        var errors = partition ? patientStateErrors(partition, patient) : ["patient_id is required or must be unambiguous"];
        return { valid: errors.length === 0, errors: errors };
    }


    function confirmTreatmentStart(input, options) {
        var source = isRecord(input) ? input : {};
        var store = source.store;
        if (!store || typeof store.load !== "function" || typeof store.save !== "function") {
            throw new Error("store is required");
        }
        var patientId = requireText(source.patient_id, "patient_id");
        var lineId = requireText(source.line_id, "line_id");
        var startDate = requireText(source.start_date, "start_date");
        var declaredBy = requireText(source.declared_by_demo, "declared_by_demo");
        var createdAt = requireText(source.created_at, "created_at");
        var state = store.load();
        if (!sessionStateIsValid(state)) throw new Error("invalid session state");
        var patient = state.patients[patientId];
        if (!patient) throw new Error("patient not found");
        var line = patient.lines[lineId];
        if (!line) throw new Error("line not found");
        if (line.patient_id !== patientId) throw new Error("line patient mismatch");
        if (line.provenance !== "validated_in_hub") throw new Error("only validated-in-Hub line can be started");
        var act = patient.validation_acts[line.source_validation_act_id];
        if (!act || act.result !== "validated" || act.produced_line_id !== line.line_id) {
            throw new Error("positive validation for line is required");
        }
        var existingStarts = Object.keys(patient.movements).map(function (movementId) {
            return patient.movements[movementId];
        }).filter(function (movement) {
            return movement.movement_type === "start" && movement.target_line_id === lineId;
        });
        if (line.status === "active") {
            if (line.start_date !== startDate) throw new Error("active line start_date cannot be changed");
            if (existingStarts.length !== 1) throw new Error("active line must have exactly one start movement");
            return {
                state: clone(state),
                line: clone(line),
                movement: clone(existingStarts[0]),
                idempotent: true
            };
        }
        if (line.status !== "validated_not_started") throw new Error("line is not pending explicit start");
        if (line.start_date) throw new Error("line already has start_date");
        if (existingStarts.length) throw new Error("line already has start movement");
        var next = clone(state);
        var nextPatient = next.patients[patientId];
        var nextLine = nextPatient.lines[lineId];
        nextLine.status = "active";
        nextLine.start_date = startDate;
        nextLine.updated_at = createdAt;
        var movement = createTreatmentMovement({
            patient_id: patientId,
            movement_type: "start",
            target_line_id: lineId,
            effective_at: startDate,
            validation_act_id: line.source_validation_act_id,
            declared_by_demo: declaredBy,
            created_at: createdAt
        }, options);
        nextPatient.movements[movement.movement_id] = movement;
        if (!sessionStateIsValid(next)) throw new Error("invalid treatment start transaction");
        var saved = store.save(next);
        return {
            state: clone(saved),
            line: clone(saved.patients[patientId].lines[lineId]),
            movement: clone(saved.patients[patientId].movements[movement.movement_id]),
            idempotent: false
        };
    }

    function createSessionStore(storage) {
        var target = storage === undefined ? root.sessionStorage : storage;

        function load() {
            if (!target || typeof target.getItem !== "function") return createEmptySessionState();
            var raw;
            try { raw = target.getItem(SCHEMA); } catch (error) { return createEmptySessionState(); }
            if (!raw) return createEmptySessionState();
            try {
                var parsed = JSON.parse(raw);
                return sessionStateIsValid(parsed) ? clone(parsed) : createEmptySessionState();
            } catch (error) {
                return createEmptySessionState();
            }
        }

        function save(state) {
            if (!sessionStateIsValid(state)) throw new Error("invalid session state");
            if (!target || typeof target.setItem !== "function") throw new Error("sessionStorage unavailable");
            target.setItem(SCHEMA, JSON.stringify(clone(state)));
            return clone(state);
        }

        function getPatientState(state, patientId) {
            var id = requireText(patientId, "patient_id");
            if (!sessionStateIsValid(state)) return emptyPatientState();
            return clone(state.patients[id] || emptyPatientState());
        }

        function withPatient(state, patientId, transform) {
            var id = requireText(patientId, "patient_id");
            if (!sessionStateIsValid(state)) throw new Error("invalid session state");
            var next = clone(state);
            var patient = next.patients[id] || emptyPatientState();
            next.patients[id] = transform(patient, id);
            if (!patientStateIsValid(id, next.patients[id])) throw new Error("invalid patient graph");
            return next;
        }

        function upsert(collection, state, patientId, entity) {
            var idField = ID_FIELDS[collection];
            if (!isRecord(entity)) throw new Error("entity is required");
            var entityId = requireText(entity[idField], idField);
            var partition = requireText(patientId, "patient_id");
            if (entity.patient_id !== partition) throw new Error("entity patient_id mismatch");
            var entityValid = collection === "requests" ? requestIsValid(entity) :
                (collection === "validation_acts" ? validationIsValid(entity) :
                    (collection === "lines" ? lineIsValid(entity) : movementIsValid(entity)));
            if (!entityValid) throw new Error("invalid " + collection + " entity");
            return withPatient(state, partition, function (patient) {
                patient[collection][entityId] = clone(entity);
                return patient;
            });
        }

        function upsertDraft(state, patientId, draftId, draft) {
            var id = requireText(draftId, "draft_id");
            if (!isRecord(draft)) throw new Error("draft is required");
            if (own(draft, "patient_id") && draft.patient_id !== patientId) throw new Error("draft patient_id mismatch");
            return withPatient(state, patientId, function (patient) {
                patient.drafts[id] = clone(draft);
                return patient;
            });
        }

        function deleteDraft(state, patientId, draftId) {
            var id = requireText(draftId, "draft_id");
            return withPatient(state, patientId, function (patient) {
                delete patient.drafts[id];
                return patient;
            });
        }

        function selectLine(state, patientId, lineId) {
            var id = requireText(lineId, "line_id");
            return withPatient(state, patientId, function (patient) {
                if (!own(patient.lines, id)) throw new Error("selected line does not belong to patient");
                patient.selected_line_id = id;
                return patient;
            });
        }

        function clearPatientSelection(state, patientId) {
            return withPatient(state, patientId, function (patient) {
                patient.selected_line_id = "";
                return patient;
            });
        }

        function restorePatient(state, patientId) {
            var id = requireText(patientId, "patient_id");
            if (!sessionStateIsValid(state)) throw new Error("invalid session state");
            var stored = load();
            var next = clone(state);
            if (own(stored.patients, id)) next.patients[id] = clone(stored.patients[id]);
            else delete next.patients[id];
            return next;
        }

        return {
            key: SCHEMA,
            createEmpty: createEmptySessionState,
            load: load,
            save: save,
            getPatientState: getPatientState,
            upsertRequest: function (state, patientId, entity) { return upsert("requests", state, patientId, entity); },
            upsertValidationAct: function (state, patientId, entity) { return upsert("validation_acts", state, patientId, entity); },
            upsertLine: function (state, patientId, entity) { return upsert("lines", state, patientId, entity); },
            upsertMovement: function (state, patientId, entity) { return upsert("movements", state, patientId, entity); },
            upsertDraft: upsertDraft,
            deleteDraft: deleteDraft,
            selectLine: selectLine,
            clearPatientSelection: clearPatientSelection,
            restorePatient: restorePatient
        };
    }

    return {
        createTreatmentRequest: createTreatmentRequest,
        createValidationAct: createValidationAct,
        createTreatmentLineFromValidatedRequest: createTreatmentLineFromValidatedRequest,
        createPreHubTreatmentLine: createPreHubTreatmentLine,
        createTreatmentMovement: createTreatmentMovement,
        confirmTreatmentStart: confirmTreatmentStart,
        createEmptySessionState: createEmptySessionState,
        createSessionStore: createSessionStore,
        validatePatientState: validatePatientState
    };
});
