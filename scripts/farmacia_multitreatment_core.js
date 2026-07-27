(function (root, factory) {
    "use strict";
    var api = factory(root || {});
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (root && typeof root === "object") root.FarmaciaMultitreatmentCore = api;
    if (typeof window !== "undefined" && window) window.FarmaciaMultitreatmentCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
    "use strict";

    var STORAGE_KEY = "farmaciaDemo.multitreatment.v2";
    var SCHEMA = "farmacia_multitreatment.v2";
    var RELATIONSHIPS = ["primary", "additional", "unknown"];
    var STATUSES = ["validated_not_started", "active", "suspended", "completed", "unknown"];
    var REQUEST_TYPES = ["new_start", "switch", "add_on"];
    var MOVEMENT_TYPES = ["start", "switch", "add_on", "optimization", "suspension", "resume", "completion"];
    var VALIDATION_RESULTS = ["approved", "pending", "denied"];
    var FORBIDDEN_IDENTITIES = ["patient_id", "internal_code", "NHC", "nhc", "tratamiento_id"];

    function emptyState() {
        return { schema: SCHEMA, patients: {} };
    }

    function clone(value) {
        if (value === undefined) return undefined;
        return JSON.parse(JSON.stringify(value));
    }

    function own(object, key) {
        return Object.prototype.hasOwnProperty.call(object || {}, key);
    }

    function requiredString(value, name) {
        if (typeof value !== "string" || value.trim() === "") throw new Error(name + " is required");
        return value;
    }

    function assertNoForbiddenIdentity(input) {
        FORBIDDEN_IDENTITIES.forEach(function (key) {
            if (own(input, key)) throw new Error(key + " is not a canonical identity");
        });
    }

    function enumValue(input, key, allowed) {
        if (!own(input, key)) throw new Error(key + " is required");
        if (allowed.indexOf(input[key]) === -1) throw new Error("invalid " + key);
        return input[key];
    }

    function patientBucket(state, cip, create) {
        requiredString(cip, "cip");
        if (!state || state.schema !== SCHEMA || !state.patients || typeof state.patients !== "object") {
            throw new Error("incompatible state");
        }
        var patient = state.patients[cip];
        if (!patient && create) {
            patient = { requests: {}, validation_acts: {}, lines: {}, movements: {} };
            state.patients[cip] = patient;
        }
        return patient || null;
    }

    function validPatientShape(patient) {
        return patient && typeof patient === "object" &&
            patient.requests && typeof patient.requests === "object" &&
            patient.validation_acts && typeof patient.validation_acts === "object" &&
            patient.lines && typeof patient.lines === "object" &&
            patient.movements && typeof patient.movements === "object";
    }

    function loadState(storage) {
        var source = storage || (root && root.sessionStorage);
        if (!source || typeof source.getItem !== "function") return emptyState();
        try {
            var parsed = JSON.parse(source.getItem(STORAGE_KEY));
            if (!parsed || parsed.schema !== SCHEMA || !parsed.patients || typeof parsed.patients !== "object") return emptyState();
            var cips = Object.keys(parsed.patients);
            if (!cips.every(function (cip) { return validPatientShape(parsed.patients[cip]); })) return emptyState();
            return clone(parsed);
        } catch (error) {
            return emptyState();
        }
    }

    function saveState(state, storage) {
        var target = storage || (root && root.sessionStorage);
        if (!state || state.schema !== SCHEMA) throw new Error("incompatible state");
        if (target && typeof target.setItem === "function") target.setItem(STORAGE_KEY, JSON.stringify(state));
        return state;
    }

    function opaqueId(prefix) {
        var cryptoApi = root && root.crypto;
        if (cryptoApi && typeof cryptoApi.randomUUID === "function") return prefix + "_" + cryptoApi.randomUUID();
        return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);
    }

    function idFor(input, key, prefix) {
        return own(input, key) ? requiredString(input[key], key) : opaqueId(prefix);
    }

    function getLine(state, cip, lineId) {
        var patient = patientBucket(state, cip, false);
        return patient && own(patient.lines, lineId) ? patient.lines[lineId] : null;
    }

    function assertSameCipReference(state, cip, lineId, name, referenceCip) {
        if (referenceCip !== undefined && referenceCip !== cip) throw new Error("cross-CIP reference");
        requiredString(lineId, name);
        if (!getLine(state, cip, lineId)) throw new Error(name + " not found for cip");
    }

    function assertUnique(patient, collection, id, name) {
        if (own(patient[collection], id)) throw new Error(name + " already exists");
    }

    function explicitOpaquePayload(input, entity) {
        if (own(input, "catalog")) entity.catalog = clone(input.catalog);
        if (own(input, "therapeutic")) entity.therapeutic = clone(input.therapeutic);
        return entity;
    }

    function assertPrimaryActiveAvailable(patient, relationship, status) {
        if (relationship !== "primary" || status !== "active") return;
        var conflict = Object.keys(patient.lines).some(function (id) {
            var line = patient.lines[id];
            return line.relationship === "primary" && line.status === "active";
        });
        if (conflict) throw new Error("only one primary active line is allowed per cip");
    }

    function createExistingTreatmentLine(state, input) {
        input = input || {};
        assertNoForbiddenIdentity(input);
        var cip = requiredString(input.cip, "cip");
        var lineId = requiredString(input.line_id, "line_id");
        var relationship = enumValue(input, "relationship", RELATIONSHIPS);
        var status = enumValue(input, "status", STATUSES);
        var patient = patientBucket(state, cip, true);
        assertUnique(patient, "lines", lineId, "line_id");
        assertPrimaryActiveAvailable(patient, relationship, status);
        var line = explicitOpaquePayload(input, {
            cip: cip,
            line_id: lineId,
            relationship: relationship,
            status: status,
            provenance: "pre_hub_existing"
        });
        patient.lines[lineId] = line;
        return line;
    }

    function createRequest(state, input) {
        input = input || {};
        assertNoForbiddenIdentity(input);
        var cip = requiredString(input.cip, "cip");
        var type = enumValue(input, "type", REQUEST_TYPES);
        var patient = patientBucket(state, cip, true);
        var requestId = idFor(input, "request_id", "req");
        assertUnique(patient, "requests", requestId, "request_id");
        var request = { cip: cip, request_id: requestId, type: type };
        if (type === "switch") {
            assertSameCipReference(state, cip, input.from_line_id, "from_line_id", input.from_cip);
            request.from_line_id = input.from_line_id;
        }
        if (type === "add_on") {
            assertSameCipReference(state, cip, input.base_line_id, "base_line_id", input.base_cip);
            request.base_line_id = input.base_line_id;
        }
        explicitOpaquePayload(input, request);
        patient.requests[requestId] = request;
        return request;
    }

    function createValidatedLineBundle(state, input) {
        input = input || {};
        assertNoForbiddenIdentity(input);
        var cip = requiredString(input.cip, "cip");
        var result = enumValue(input, "result", VALIDATION_RESULTS);
        var patient = patientBucket(state, cip, false);
        if (!patient) throw new Error("request not found for cip");
        var requestId = requiredString(input.request_id, "request_id");
        if (own(input, "request_cip") && input.request_cip !== cip) throw new Error("cross-CIP reference");
        var request = patient.requests[requestId];
        if (!request) throw new Error("request not found for cip");
        var validationId = idFor(input, "validation_act_id", "val");
        assertUnique(patient, "validation_acts", validationId, "validation_act_id");
        if (request.validation_act_id) throw new Error("request already validated");

        var lineId = null;
        var relationship = null;
        if (result === "approved") {
            if (own(input, "status") && input.status !== "validated_not_started") throw new Error("invalid status for validated_in_hub");
            relationship = enumValue(input, "relationship", RELATIONSHIPS);
            lineId = idFor(input, "line_id", "line");
            assertUnique(patient, "lines", lineId, "line_id");
        }

        var validation = {
            cip: cip,
            validation_act_id: validationId,
            request_id: requestId,
            result: result,
            line_id: lineId
        };
        var line = null;
        if (result === "approved") {
            line = explicitOpaquePayload(input, {
                cip: cip,
                line_id: lineId,
                relationship: relationship,
                status: "validated_not_started",
                provenance: "validated_in_hub",
                validation_act_id: validationId,
                request_id: requestId
            });
        }

        patient.validation_acts[validationId] = validation;
        request.validation_act_id = validationId;
        if (line) patient.lines[lineId] = line;
        return { validation_act: validation, treatment_line: line };
    }

    function createMovement(state, input) {
        input = input || {};
        assertNoForbiddenIdentity(input);
        var cip = requiredString(input.cip, "cip");
        var type = enumValue(input, "type", MOVEMENT_TYPES);
        var patient = patientBucket(state, cip, false);
        if (!patient) throw new Error("line_id not found for cip");
        assertSameCipReference(state, cip, input.line_id, "line_id", input.line_cip);
        if (own(input, "from_line_id")) assertSameCipReference(state, cip, input.from_line_id, "from_line_id", input.from_cip);
        if (own(input, "base_line_id")) assertSameCipReference(state, cip, input.base_line_id, "base_line_id", input.base_cip);
        var movementId = idFor(input, "movement_id", "mov");
        assertUnique(patient, "movements", movementId, "movement_id");
        var movement = { cip: cip, movement_id: movementId, line_id: input.line_id, type: type };
        if (own(input, "from_line_id")) movement.from_line_id = input.from_line_id;
        if (own(input, "base_line_id")) movement.base_line_id = input.base_line_id;
        patient.movements[movementId] = movement;
        return movement;
    }

    function createStore(options) {
        options = options || {};
        var storage = options.storage || (root && root.sessionStorage);
        var state = options.state ? clone(options.state) : loadState(storage);
        function persist(call, input) {
            var result = call(state, input);
            saveState(state, storage);
            return result;
        }
        return {
            getState: function () { return clone(state); },
            getLine: function (cip, lineId) { return clone(getLine(state, cip, lineId)); },
            createExistingTreatmentLine: function (input) { return persist(createExistingTreatmentLine, input); },
            createRequest: function (input) { return persist(createRequest, input); },
            createValidatedLineBundle: function (input) { return persist(createValidatedLineBundle, input); },
            createMovement: function (input) { return persist(createMovement, input); }
        };
    }

    return {
        STORAGE_KEY: STORAGE_KEY,
        SCHEMA: SCHEMA,
        RELATIONSHIPS: RELATIONSHIPS.slice(),
        STATUSES: STATUSES.slice(),
        REQUEST_TYPES: REQUEST_TYPES.slice(),
        MOVEMENT_TYPES: MOVEMENT_TYPES.slice(),
        VALIDATION_RESULTS: VALIDATION_RESULTS.slice(),
        emptyState: emptyState,
        loadState: loadState,
        saveState: saveState,
        getLine: getLine,
        createExistingTreatmentLine: createExistingTreatmentLine,
        createRequest: createRequest,
        createValidatedLineBundle: createValidatedLineBundle,
        createMovement: createMovement,
        createStore: createStore
    };
});
