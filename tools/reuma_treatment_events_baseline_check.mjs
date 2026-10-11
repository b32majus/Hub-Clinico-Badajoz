#!/usr/bin/env node
'use strict';
/**
 * Train 22 baseline RED witness for the treatment timeline (T22-03, Fase A).
 *
 * Loads `modules/hubTools.js` and `modules/treatmentEventsManager.js` UNMODIFIED
 * inside a Node `vm` sandbox following the established convention of
 * `tools/reuma_export_harness.mjs` / `tools/reuma_act_contract_check.mjs`:
 * `sandbox.window = sandbox`, browser shims, no copied/patched production code.
 *
 * Clinical invariant under witness: a first historical row registered with
 * `Tipo_Visita = 'Seguimiento'` and an explicit PREEXISTING treatment is a
 * baseline capture, not an observed start. The timeline must never fabricate
 * `treatment_start` or `treatment_change` from it. Explicit
 * starts (Primera Visita), genuine explicit decisions (cambiar), and rows
 * without the follow-up token keep their published behavior.
 *
 * Cases:
 *   C1  single follow-up row with treatment + plan biologic entry → no
 *       treatment_start, no treatment_change. The T22-03 adjudication (P1-2)
 *       narrows the ticket to `treatment_start` ONLY: the biological events
 *       are OUT of its closed scope, so the PUBLISHED detectBiologicEvent
 *       behavior is preserved — `biologic_start` IS emitted for a first-row
 *       Seguimiento carrying a plan entry. That emission is recorded here as
 *       an explicitly labelled CHARACTERIZATION of residual clinical risk
 *       (published behavior preserved, NOT clinically endorsed; resolution
 *       requires an explicit rule distinguishing preexisting baseline /
 *       requested change / confirmed start).
 *   C2  single 'Primera Visita' row with treatment → treatment_start PRESENT
 *       (green control; must never regress).
 *   C3  first follow-up row with treatment + second follow-up row with an
 *       explicit `Decision_Terapeutica: 'cambiar'` → treatment_change PRESENT
 *       and no treatment_start anywhere (RED today because of the first row).
 *   C4  single row with NO Tipo_Visita key and a treatment → treatment_start
 *       PRESENT (fail-safe control: suppression must be keyed on the explicit
 *       follow-up token, not on absence).
 *
 * Usage: node tools/reuma_treatment_events_baseline_check.mjs
 * Exit code 0 = every case PASS, 1 = at least one FAIL or environment failure.
 * Synthetic data only (`SYN-*` ids / `... sintetico ...` strings).
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Only the modules the events surface needs; loaded from the repository, unmodified.
const EVENTS_SCRIPTS = ['modules/hubTools.js', 'modules/treatmentEventsManager.js'];

function createEventsSandbox() {
    const sink = { logs: [] };
    const relay = (level) => (...args) => {
        sink.logs.push({ level, message: args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ') });
    };
    const sandbox = {
        console: { log: relay('log'), warn: relay('warn'), error: relay('error'), info: relay('log') },
        setTimeout,
        clearTimeout,
        navigator: { userAgent: 'promueve-treatment-events-baseline/1' },
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    const storage = new Map();
    sandbox.sessionStorage = {
        getItem: (key) => (storage.has(String(key)) ? storage.get(String(key)) : null),
        setItem: (key, value) => storage.set(String(key), String(value)),
        removeItem: (key) => storage.delete(String(key)),
        clear: () => storage.clear(),
    };
    sandbox.localStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
    };
    sandbox.CustomEvent = class CustomEvent {
        constructor(type, options) {
            this.type = type;
            this.detail = options ? options.detail : undefined;
        }
    };
    sandbox.document = {
        dispatchEvent() {
            return true;
        },
        addEventListener() {},
        removeEventListener() {},
        getElementById() {
            return null;
        },
        querySelector() {
            return null;
        },
        querySelectorAll() {
            return [];
        },
        createElement() {
            return { style: {}, setAttribute() {}, appendChild() {}, removeChild() {}, remove() {} };
        },
    };
    sandbox.dispatchEvent = () => true;
    sandbox.addEventListener = () => {};
    sandbox.removeEventListener = () => {};
    sandbox.requestAnimationFrame = (fn) => setTimeout(fn, 0);
    vm.createContext(sandbox);
    for (const file of EVENTS_SCRIPTS) {
        vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
    }
    return { sandbox, sink };
}

/**
 * Runs the published `HubTools.events.extractTreatmentEvents` against a
 * synthetic history and returns the event type list, exactly as production
 * code produces it.
 */
function extractEventTypes(allVisits) {
    const { sandbox, sink } = createEventsSandbox();
    const extract = sandbox.HubTools && sandbox.HubTools.events &&
        typeof sandbox.HubTools.events.extractTreatmentEvents === 'function'
        ? sandbox.HubTools.events.extractTreatmentEvents
        : null;
    if (!extract) {
        throw new Error('HubTools.events.extractTreatmentEvents not exposed by unmodified production modules');
    }
    const events = extract({ allVisits: structuredClone(allVisits), pathology: 'espa' });
    const types = Array.isArray(events) ? events.map((event) => event && event.type) : [];
    return { types, logs: sink.logs };
}

const results = [];
function record(name, pass, detail) {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

const T1 = '2026-01-10';
const T2 = '2026-03-10';

// =====================================================================
// C1 — baseline follow-up row: preexisting treatment + plan biologic
//      entry. T22-03 adjudication (P1-2): the ticket's closed scope is
//      `treatment_start` ONLY; biological events are out of scope, so the
//      PUBLISHED detectBiologicEvent behavior is restored and kept:
//      `biologic_start` IS emitted for a first-row Seguimiento with a plan
//      entry.
//
//      CHARACTERIZATION of residual clinical risk — published behavior
//      preserved, NOT clinically endorsed: this emission is derived from a
//      plan entry on a baseline row without an explicit rule distinguishing
//      preexisting baseline / requested change / confirmed start. Resolving
//      that residual risk requires such an explicit rule; nothing is
//      inferred here from `planBiologicoEntries`, `cambioBiologicoEntries`
//      or the drug name beyond what the published detector already does.
// =====================================================================
{
    const { types, logs } = extractEventTypes([{
        Fecha_Visita: T1,
        Tipo_Visita: 'Seguimiento',
        Tratamiento_Actual: 'FAME sintetico A',
        planBiologicoEntries: [{ farmaco: 'Biologico sintetico X' }],
    }]);
    const fabricated = ['treatment_start', 'treatment_change'].filter((type) => types.includes(type));
    record('C1 first Seguimiento row: NO treatment_start/treatment_change; published biologic_start preserved (CHARACTERIZATION of residual clinical risk — published behavior preserved, NOT clinically endorsed)',
        fabricated.length === 0 && types.includes('biologic_start'),
        `types=${JSON.stringify(types)} fabricated=${JSON.stringify(fabricated)} biologicStartEmitted=${types.includes('biologic_start')} legacyLogs=${JSON.stringify(logs.map((l) => l.message))}`);
}

// =====================================================================
// C2 — green control: an explicit Primera Visita keeps treatment_start.
// =====================================================================
{
    const { types } = extractEventTypes([{
        Fecha_Visita: T1,
        Tipo_Visita: 'Primera Visita',
        Tratamiento_Actual: 'FAME sintetico A',
    }]);
    record('C2 explicit Primera Visita with treatment keeps its treatment_start',
        types.includes('treatment_start'),
        `types=${JSON.stringify(types)}`);
}

// =====================================================================
// C3 — genuine explicit change between two follow-up rows stays, while
//      the baseline first row still fabricates no start.
// =====================================================================
{
    const { types } = extractEventTypes([
        {
            Fecha_Visita: T1,
            Tipo_Visita: 'Seguimiento',
            Tratamiento_Actual: 'FAME sintetico A',
        },
        {
            Fecha_Visita: T2,
            Tipo_Visita: 'Seguimiento',
            Tratamiento_Actual: 'FAME sintetico B',
            Decision_Terapeutica: 'cambiar',
        },
    ]);
    const checks = [
        types.includes('treatment_change'),
        !types.includes('treatment_start'),
    ];
    record('C3 explicit cambiar decision yields treatment_change and no treatment_start anywhere',
        checks.every(Boolean),
        `types=${JSON.stringify(types)}`);
}

// =====================================================================
// C4 — fail-safe control: a row without the Tipo_Visita key keeps the
//      start inference; suppression must key on the explicit token.
// =====================================================================
{
    const { types } = extractEventTypes([{
        Fecha_Visita: T1,
        Tratamiento_Actual: 'FAME sintetico A',
    }]);
    record('C4 row without Tipo_Visita key and a treatment keeps treatment_start (fail-safe)',
        types.includes('treatment_start'),
        `types=${JSON.stringify(types)}`);
}

// =====================================================================
// Gate 3 consumer wiring — additive source assertions (no hardcode):
//   W1  dashboard_paciente.html loads modules/treatmentEventsManager.js
//       with a ?v= cache-busting token (any value).
//   W2  scripts/script_dashboard.js (real consumer) calls
//       HubTools.events.extractTreatmentEvents.
// =====================================================================
{
    const dashboardHtml = fs.readFileSync(path.join(ROOT, 'dashboard_paciente.html'), 'utf8');
    const scriptDashboard = fs.readFileSync(path.join(ROOT, 'scripts/script_dashboard.js'), 'utf8');
    record('W1 dashboard_paciente.html loads modules/treatmentEventsManager.js with a ?v= token',
        /<script\s+src="modules\/treatmentEventsManager\.js\?v=[^"]+"/.test(dashboardHtml),
        'expected <script src="modules/treatmentEventsManager.js?v=..."> in dashboard_paciente.html');
    record('W2 scripts/script_dashboard.js calls HubTools.events.extractTreatmentEvents',
        /HubTools\.events\.extractTreatmentEvents\s*\(/.test(scriptDashboard),
        'expected HubTools.events.extractTreatmentEvents( call in scripts/script_dashboard.js');
}

const failed = results.filter((result) => !result.pass);
if (failed.length > 0) {
    console.log('FAILED CASES:');
    for (const item of failed) console.log(`  - ${item.name}`);
}
console.log(`\nREUMA-TREATMENT-EVENTS-BASELINE: ${failed.length === 0 ? 'PASS' : 'FAIL'} ${results.length - failed.length}/${results.length} cases`);
process.exit(failed.length === 0 ? 0 : 1);
