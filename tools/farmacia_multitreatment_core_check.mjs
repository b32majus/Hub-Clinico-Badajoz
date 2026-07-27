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

if (!process.exitCode) console.log(`multitreatment_core_check: PASSED (${passed}/16)`);
