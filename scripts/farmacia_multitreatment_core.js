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

    function plainObject(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) return false;
        var prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    }

    function exactKeys(object, keys) {
        var actual = Object.keys(object).sort();
        var expected = keys.slice().sort();
        return actual.length === expected.length && actual.every(function (key, index) { return key === expected[index]; });
    }

    function requiredString(value, name) {
        if (typeof value !== "string" || value.trim() === "") throw new Error(name + " is required");
        return value;
    }

    function forbiddenIdentityKey(value, seen) {
        if (!value || typeof value !== "object") return null;
        seen = seen || [];
        if (seen.indexOf(value) !== -1) return null;
        seen.push(value);
        var keys = Object.keys(value);
        for (var index = 0; index < keys.length; index += 1) {
            if (FORBIDDEN_IDENTITIES.indexOf(keys[index]) !== -1) return keys[index];
            var nested = forbiddenIdentityKey(value[keys[index]], seen);
            if (nested) return nested;
        }
        return null;
    }

    function assertNoForbiddenIdentity(input) {
        var key = forbiddenIdentityKey(input);
        if (key) throw new Error(key + " is not a canonical identity");
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

    function nonemptyString(value) {
        return typeof value === "string" && value.trim() !== "";
    }

    function collectionIsPlain(collection) {
        return plainObject(collection);
    }

    function referenceIsValid(patient, entity, idKey, cipKey) {
        if (own(entity, cipKey) && entity[cipKey] !== entity.cip) return false;
        if (!own(entity, idKey)) return true;
        return nonemptyString(entity[idKey]) && own(patient.lines, entity[idKey]);
    }

    function patientStateIsValid(cip, patient) {
        if (!nonemptyString(cip) || !plainObject(patient) ||
            !exactKeys(patient, ["requests", "validation_acts", "lines", "movements"]) ||
            !collectionIsPlain(patient.requests) || !collectionIsPlain(patient.validation_acts) ||
            !collectionIsPlain(patient.lines) || !collectionIsPlain(patient.movements)) return false;

        var requestIds = Object.keys(patient.requests);
        var validationIds = Object.keys(patient.validation_acts);
        var lineIds = Object.keys(patient.lines);
        var movementIds = Object.keys(patient.movements);
        var primaryActive = 0;
        var linesByRequest = {};
        var linesByValidation = {};

        if (!requestIds.every(function (id) {
            var request = patient.requests[id];
            if (!plainObject(request) || forbiddenIdentityKey(request) || request.cip !== cip ||
                request.request_id !== id || REQUEST_TYPES.indexOf(request.type) === -1) return false;
            if (!referenceIsValid(patient, request, "from_line_id", "from_cip") ||
                !referenceIsValid(patient, request, "base_line_id", "base_cip")) return false;
            if (request.type === "switch" && !own(request, "from_line_id")) return false;
            if (request.type === "add_on" && !own(request, "base_line_id")) return false;
            return true;
        })) return false;

        if (!validationIds.every(function (id) {
            var validation = patient.validation_acts[id];
            if (!plainObject(validation) || forbiddenIdentityKey(validation) || validation.cip !== cip ||
                validation.validation_act_id !== id || VALIDATION_RESULTS.indexOf(validation.result) === -1 ||
                !nonemptyString(validation.request_id) || !own(patient.requests, validation.request_id) ||
                (own(validation, "request_cip") && validation.request_cip !== cip) ||
                (own(validation, "line_cip") && validation.line_cip !== cip)) return false;
            if (validation.result === "approved") return nonemptyString(validation.line_id);
            return validation.line_id === null;
        })) return false;

        if (!lineIds.every(function (id) {
            var line = patient.lines[id];
            if (!plainObject(line) || forbiddenIdentityKey(line) || line.cip !== cip || line.line_id !== id ||
                RELATIONSHIPS.indexOf(line.relationship) === -1 || STATUSES.indexOf(line.status) === -1 ||
                ["pre_hub_existing", "validated_in_hub"].indexOf(line.provenance) === -1) return false;
            if ((own(line, "request_cip") && line.request_cip !== cip) ||
                (own(line, "validation_cip") && line.validation_cip !== cip)) return false;
            if (own(line, "request_id") && (!nonemptyString(line.request_id) || !own(patient.requests, line.request_id))) return false;
            if (own(line, "validation_act_id")) {
                if (!nonemptyString(line.validation_act_id) || !own(patient.validation_acts, line.validation_act_id)) return false;
                var linkedValidation = patient.validation_acts[line.validation_act_id];
                if (linkedValidation.line_id !== id || (own(line, "request_id") && linkedValidation.request_id !== line.request_id)) return false;
                linesByValidation[line.validation_act_id] = (linesByValidation[line.validation_act_id] || 0) + 1;
            }
            if (line.relationship === "primary" && line.status === "active") primaryActive += 1;
            if (line.provenance === "validated_in_hub") {
                if (line.status !== "validated_not_started" || !nonemptyString(line.request_id) ||
                    !nonemptyString(line.validation_act_id) || !own(patient.requests, line.request_id) ||
                    !own(patient.validation_acts, line.validation_act_id)) return false;
                var validation = patient.validation_acts[line.validation_act_id];
                if (validation.request_id !== line.request_id || validation.line_id !== id || validation.result !== "approved") return false;
                linesByRequest[line.request_id] = (linesByRequest[line.request_id] || 0) + 1;
            }
            return true;
        })) return false;

        if (primaryActive > 1 || Object.keys(linesByRequest).some(function (id) { return linesByRequest[id] > 1; }) ||
            Object.keys(linesByValidation).some(function (id) { return linesByValidation[id] > 1; })) return false;

        if (!validationIds.every(function (id) {
            var validation = patient.validation_acts[id];
            if (validation.line_id === null) return true;
            var line = patient.lines[validation.line_id];
            return !!line && line.provenance === "validated_in_hub" && line.request_id === validation.request_id &&
                line.validation_act_id === id && linesByValidation[id] === 1;
        })) return false;

        return movementIds.every(function (id) {
            var movement = patient.movements[id];
            if (!plainObject(movement) || forbiddenIdentityKey(movement) || movement.cip !== cip ||
                movement.movement_id !== id || MOVEMENT_TYPES.indexOf(movement.type) === -1 ||
                !nonemptyString(movement.line_id) || !own(patient.lines, movement.line_id) ||
                !referenceIsValid(patient, movement, "from_line_id", "from_cip") ||
                !referenceIsValid(patient, movement, "base_line_id", "base_cip") ||
                (own(movement, "line_cip") && movement.line_cip !== cip)) return false;
            if (movement.type === "switch" && !own(movement, "from_line_id")) return false;
            if (movement.type === "add_on" && !own(movement, "base_line_id")) return false;
            return true;
        });
    }

    function stateIsValid(state) {
        return plainObject(state) && exactKeys(state, ["schema", "patients"]) && state.schema === SCHEMA &&
            collectionIsPlain(state.patients) && Object.keys(state.patients).every(function (cip) {
                return patientStateIsValid(cip, state.patients[cip]);
            });
    }

    function assertStateValid(state) {
        if (!stateIsValid(state)) throw new Error("invalid canonical state");
    }

    function loadState(storage) {
        var source = storage || (root && root.sessionStorage);
        if (!source || typeof source.getItem !== "function") return emptyState();
        try {
            var parsed = JSON.parse(source.getItem(STORAGE_KEY));
            if (!stateIsValid(parsed)) return emptyState();
            return clone(parsed);
        } catch (error) {
            return emptyState();
        }
    }

    function saveState(state, storage) {
        var target = storage || (root && root.sessionStorage);
        assertStateValid(state);
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
        assertStateValid(state);
        assertNoForbiddenIdentity(input);
        var cip = requiredString(input.cip, "cip");
        var lineId = requiredString(input.line_id, "line_id");
        var relationship = enumValue(input, "relationship", RELATIONSHIPS);
        var status = enumValue(input, "status", STATUSES);
        var patient = patientBucket(state, cip, false);
        if (patient) {
            assertUnique(patient, "lines", lineId, "line_id");
            assertPrimaryActiveAvailable(patient, relationship, status);
        }
        var line = explicitOpaquePayload(input, {
            cip: cip,
            line_id: lineId,
            relationship: relationship,
            status: status,
            provenance: "pre_hub_existing"
        });
        patient = patient || patientBucket(state, cip, true);
        patient.lines[lineId] = line;
        return line;
    }

    function createRequest(state, input) {
        input = input || {};
        assertStateValid(state);
        assertNoForbiddenIdentity(input);
        var cip = requiredString(input.cip, "cip");
        var type = enumValue(input, "type", REQUEST_TYPES);
        var patient = patientBucket(state, cip, false);
        var requestId = idFor(input, "request_id", "req");
        if (patient) assertUnique(patient, "requests", requestId, "request_id");
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
        patient = patient || patientBucket(state, cip, true);
        patient.requests[requestId] = request;
        return request;
    }

    function createValidatedLineBundle(state, input) {
        input = input || {};
        assertStateValid(state);
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

        var lineId = null;
        var relationship = null;
        if (result === "approved") {
            var producedLine = Object.keys(patient.validation_acts).some(function (id) {
                var act = patient.validation_acts[id];
                return act.request_id === requestId && nonemptyString(act.line_id);
            }) || Object.keys(patient.lines).some(function (id) {
                return patient.lines[id].request_id === requestId;
            });
            if (producedLine) throw new Error("request already produced a line");
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
        if (line) patient.lines[lineId] = line;
        return { validation_act: validation, treatment_line: line };
    }

    function createMovement(state, input) {
        input = input || {};
        assertStateValid(state);
        assertNoForbiddenIdentity(input);
        var cip = requiredString(input.cip, "cip");
        var type = enumValue(input, "type", MOVEMENT_TYPES);
        var patient = patientBucket(state, cip, false);
        if (!patient) throw new Error("line_id not found for cip");
        assertSameCipReference(state, cip, input.line_id, "line_id", input.line_cip);
        if (type === "switch" && !own(input, "from_line_id")) throw new Error("from_line_id is required");
        if (type === "add_on" && !own(input, "base_line_id")) throw new Error("base_line_id is required");
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
        if (own(options, "state")) assertStateValid(options.state);
        var state = own(options, "state") ? clone(options.state) : loadState(storage);
        function persist(call, input) {
            var nextState = clone(state);
            var result = call(nextState, input);
            saveState(nextState, storage);
            state = nextState;
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
        stateIsValid: stateIsValid,
        patientStateIsValid: patientStateIsValid,
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
