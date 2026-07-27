#!/usr/bin/env node
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../scripts/farmacia_multitreatment_core.js");
let passed = 0;

function check(label, fn) {
    try {
        if (fn() === false) throw new Error("assertion returned false");
        console.log("  ✓ " + label);
        passed += 1;
    } catch (error) {
        console.error("  ✗ " + label + ": " + error.message);
        process.exitCode = 1;
    }
}

function rejects(fn) {
    try { fn(); } catch (error) { return true; }
    return false;
}

function existing(state, cip, lineId, relationship, status, catalog) {
    const input = { cip, line_id: lineId, relationship, status };
    if (catalog !== undefined) input.catalog = catalog;
    return core.createExistingTreatmentLine(state, input);
}

function request(state, cip, requestId) {
    return core.createRequest(state, { cip, request_id: requestId, type: "new_start" });
}

check("1 existing ID is preserved", () => {
    const state = core.emptyState();
    return existing(state, "CIP-SYN-01", "line id / exact", "additional", "active").line_id === "line id / exact";
});

check("2 CIP partitions line identity", () => {
    const state = core.emptyState();
    existing(state, "CIP-SYN-02-A", "L-SAME", "additional", "active");
    existing(state, "CIP-SYN-02-B", "L-SAME", "additional", "active");
    return core.getLine(state, "CIP-SYN-02-A", "L-SAME").cip !== core.getLine(state, "CIP-SYN-02-B", "L-SAME").cip;
});

check("3 one active primary is allowed", () => {
    const state = core.emptyState();
    return existing(state, "CIP-SYN-03", "P1", "primary", "active").relationship === "primary";
});

check("4 a second active primary is rejected", () => {
    const state = core.emptyState();
    existing(state, "CIP-SYN-04", "P1", "primary", "active");
    return rejects(() => existing(state, "CIP-SYN-04", "P2", "primary", "active"));
});

check("5 multiple active additional lines are allowed", () => {
    const state = core.emptyState();
    existing(state, "CIP-SYN-05", "A1", "additional", "active");
    existing(state, "CIP-SYN-05", "A2", "additional", "active");
    return Object.keys(state.patients["CIP-SYN-05"].lines).length === 2;
});

check("6 relationship/status/movement have no defaults and required omissions reject", () => {
    const a = core.emptyState();
    const b = core.emptyState();
    existing(b, "CIP-SYN-06", "L1", "unknown", "unknown");
    return rejects(() => core.createExistingTreatmentLine(a, { cip: "CIP-SYN-06", line_id: "L1", status: "active" })) &&
        rejects(() => core.createExistingTreatmentLine(a, { cip: "CIP-SYN-06", line_id: "L2", relationship: "primary" })) &&
        rejects(() => core.createMovement(b, { cip: "CIP-SYN-06", line_id: "L1" }));
});

check("7 añadido/historical/historico statuses are rejected", () => {
    return ["añadido", "historical", "historico"].every((status, index) =>
        rejects(() => existing(core.emptyState(), "CIP-SYN-07", "L" + index, "additional", status)));
});

check("8 an approved Hub line is validated_not_started", () => {
    const state = core.emptyState();
    request(state, "CIP-SYN-08", "R1");
    const bundle = core.createValidatedLineBundle(state, {
        cip: "CIP-SYN-08", request_id: "R1", validation_act_id: "V1", result: "approved", relationship: "primary"
    });
    return bundle.treatment_line.status === "validated_not_started" &&
        bundle.validation_act.line_id === bundle.treatment_line.line_id &&
        bundle.treatment_line.validation_act_id === bundle.validation_act.validation_act_id;
});

check("9 pending and denied validations create no line", () => {
    return ["pending", "denied"].every((result, index) => {
        const state = core.emptyState();
        request(state, "CIP-SYN-09-" + index, "R1");
        const bundle = core.createValidatedLineBundle(state, {
            cip: "CIP-SYN-09-" + index, request_id: "R1", validation_act_id: "V1", result
        });
        return bundle.treatment_line === null && Object.keys(state.patients["CIP-SYN-09-" + index].lines).length === 0;
    });
});

check("10 one validation cannot create two lines", () => {
    const state = core.emptyState();
    request(state, "CIP-SYN-10", "R1");
    core.createValidatedLineBundle(state, {
        cip: "CIP-SYN-10", request_id: "R1", validation_act_id: "V1", line_id: "NEW-1", result: "approved", relationship: "additional"
    });
    return rejects(() => core.createValidatedLineBundle(state, {
        cip: "CIP-SYN-10", request_id: "R1", validation_act_id: "V1", line_id: "NEW-2", result: "approved", relationship: "additional"
    })) && Object.keys(state.patients["CIP-SYN-10"].lines).length === 1;
});

check("11 cross-CIP references are rejected", () => {
    const state = core.emptyState();
    existing(state, "CIP-SYN-11-B", "B-LINE", "additional", "active");
    return rejects(() => core.createRequest(state, {
        cip: "CIP-SYN-11-A", request_id: "R1", type: "switch", from_line_id: "B-LINE", from_cip: "CIP-SYN-11-B"
    }));
});

check("12 pre-Hub lines create no fictitious history", () => {
    const state = core.emptyState();
    existing(state, "CIP-SYN-12", "OLD-1", "unknown", "completed");
    const patient = state.patients["CIP-SYN-12"];
    return Object.keys(patient.requests).length === 0 && Object.keys(patient.validation_acts).length === 0 && Object.keys(patient.movements).length === 0;
});

check("13 catalog name causes no therapeutic inference", () => {
    const state = core.emptyState();
    const line = existing(state, "CIP-SYN-13", "L1", "unknown", "unknown", { medication_name: "Synthetic medicine 300 mg SC" });
    return line.catalog.medication_name === "Synthetic medicine 300 mg SC" &&
        !("dose" in line) && !("presentation" in line) && !("route" in line) && !("regimen" in line) && !("movement" in line);
});

check("14 corrupt or incompatible storage loads empty", () => {
    const corrupt = { getItem: () => "{broken" };
    const incompatible = { getItem: () => JSON.stringify({ schema: "v1", patients: { X: {} } }) };
    return JSON.stringify(core.loadState(corrupt)) === JSON.stringify(core.emptyState()) &&
        JSON.stringify(core.loadState(incompatible)) === JSON.stringify(core.emptyState());
});

check("15 genuinely new line ID is opaque", () => {
    const state = core.emptyState();
    request(state, "CIP-SYN-15", "R1");
    const name = "Synthetic Catalog Drug";
    const line = core.createValidatedLineBundle(state, {
        cip: "CIP-SYN-15", request_id: "R1", result: "approved", relationship: "additional", catalog: { medication_name: name }
    }).treatment_line;
    return line.line_id.length > 0 && line.line_id !== "0" && !line.line_id.toLowerCase().includes("synthetic");
});

check("16 an existing line keeps its original ID", () => {
    const state = core.emptyState();
    const original = "ORIGINAL::SYN::16";
    existing(state, "CIP-SYN-16", original, "primary", "suspended");
    return core.getLine(state, "CIP-SYN-16", original).line_id === original;
});

check("17 successive validation acts produce at most one line", () => {
    const state = core.emptyState();
    request(state, "CIP-SYN-17", "R1");
    core.createValidatedLineBundle(state, {
        cip: "CIP-SYN-17", request_id: "R1", validation_act_id: "V1", result: "pending"
    });
    core.createValidatedLineBundle(state, {
        cip: "CIP-SYN-17", request_id: "R1", validation_act_id: "V2", result: "approved", relationship: "additional"
    });
    const rejected = rejects(() => core.createValidatedLineBundle(state, {
        cip: "CIP-SYN-17", request_id: "R1", validation_act_id: "V3", result: "approved", relationship: "additional"
    }));
    const patient = state.patients["CIP-SYN-17"];
    return rejected && Object.keys(patient.validation_acts).length === 2 &&
        Object.values(patient.lines).filter(line => line.status === "validated_not_started").length === 1;
});

check("18 complete graph validation blocks invalid load, save, and supplied state", () => {
    const extra = core.emptyState();
    extra.patients["CIP-SYN-18-A"] = { requests: {}, validation_acts: {}, lines: {}, movements: {}, drafts: {} };
    const duplicatePrimary = core.emptyState();
    existing(duplicatePrimary, "CIP-SYN-18-B", "P1", "primary", "active");
    duplicatePrimary.patients["CIP-SYN-18-B"].lines.P2 = {
        cip: "CIP-SYN-18-B", line_id: "P2", relationship: "primary", status: "active", provenance: "pre_hub_existing"
    };
    let writes = 0;
    const storage = { getItem: () => null, setItem: () => { writes += 1; } };
    return JSON.stringify(core.loadState({ getItem: () => JSON.stringify(extra) })) === JSON.stringify(core.emptyState()) &&
        JSON.stringify(core.loadState({ getItem: () => JSON.stringify(duplicatePrimary) })) === JSON.stringify(core.emptyState()) &&
        rejects(() => core.saveState(extra, storage)) && writes === 0 &&
        rejects(() => core.createStore({ state: duplicatePrimary, storage }));
});

check("19 movement-specific references are required without status transitions", () => {
    const state = core.emptyState();
    ["TARGET", "FROM", "ADD", "BASE"].forEach(id => existing(state, "CIP-SYN-19", id, "additional", "active"));
    const before = core.getLine(state, "CIP-SYN-19", "TARGET").status;
    const missingSwitch = rejects(() => core.createMovement(state, {
        cip: "CIP-SYN-19", movement_id: "M-BAD-S", line_id: "TARGET", type: "switch"
    }));
    const missingAddOn = rejects(() => core.createMovement(state, {
        cip: "CIP-SYN-19", movement_id: "M-BAD-A", line_id: "ADD", type: "add_on"
    }));
    core.createMovement(state, {
        cip: "CIP-SYN-19", movement_id: "M-S", line_id: "TARGET", from_line_id: "FROM", type: "switch"
    });
    core.createMovement(state, {
        cip: "CIP-SYN-19", movement_id: "M-A", line_id: "ADD", base_line_id: "BASE", type: "add_on"
    });
    return missingSwitch && missingAddOn && Object.keys(state.patients["CIP-SYN-19"].movements).length === 2 &&
        core.getLine(state, "CIP-SYN-19", "TARGET").status === before;
});

if (!process.exitCode) console.log(`multitreatment_core_check: PASSED (${passed}/19)`);
