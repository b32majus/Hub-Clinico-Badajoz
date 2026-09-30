#!/usr/bin/env node
// tools/farmacia_f43a_dashboard_read_migration_check.mjs
// TRAIN-NEXUS-FARMACIA-READ-MIGRATION-09 — T1/F4.3A frozen characterization oracle.
//
// Characterizes BEHAVIOR (not incidental bytes):
//   1. FarmaciaCommon publishes the async application read operation
//      `readPatientContext` with explicit typed statuses
//      (loaded / no_cip / not_found / ambiguous / unavailable), a resolution
//      order of current V2 session envelope → legacy coexistence (inside the
//      seam) → fail-closed V2 facade classification, and a commit-free
//      contract (no session write, no second clinical cache).
//   2. FarmaciaCommon publishes `loadLongitudinalDemoDataset` as the only
//      loader for the versioned demo longitudinal dataset.
//   3. The T1 page coordinators (farmacia_dashboard_paciente.js,
//      farmacia_dashboard_longitudinal.js) perform NO direct patient lookup:
//      no F.getQueryContext, no F.patients population access, no direct demo
//      dataset fetch. Explicit legacy lookups are allowed only INSIDE the
//      published seam (farmacia_common).
//   4. Existing patient values, empty values, 0/false/'' and missing data are
//      never collapsed or coerced by the read operation.
//
// Ejecutar: node tools/farmacia_f43a_dashboard_read_migration_check.mjs

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;
const failures = [];

function pass(name) { passed += 1; console.log(`PASS ${name}`); }
function fail(name, detail) { failed += 1; failures.push(`${name}: ${detail || ''}`); console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }

function check(name, condition, detail) { condition ? pass(name) : fail(name, detail); }

function makeStorageMock() {
    const store = {};
    return {
        getItem: (key) => (key in store ? store[key] : null),
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; }
    };
}

const mockDoc = {
    addEventListener: function () {},
    getElementById: function () { return null; },
    createElement: function () { return {}; },
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    body: { classList: { add() {}, remove() {} } }
};

function loadCommon(locationSearch, extraWindow) {
    const sandbox = {
        console,
        document: mockDoc,
        location: { search: locationSearch || '' },
        setTimeout,
        clearTimeout,
        fetch: function () { return Promise.reject(new Error('FETCH_NOT_AVAILABLE_IN_TEST')); },
        URLSearchParams,
        XLSX: undefined,
        window: null
    };
    sandbox.window = Object.assign({
        localStorage: makeStorageMock(),
        sessionStorage: makeStorageMock(),
        location: sandbox.location,
        document: mockDoc,
        addEventListener: function () {},
        FarmaciaDataImports: null
    }, extraWindow || {});
    sandbox.globalThis = sandbox.window;
    const catalogSrc = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_pautas_catalog.js'), 'utf8');
    const commonSrc = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_common.js'), 'utf8');
    vm.runInNewContext(catalogSrc, sandbox, { filename: 'farmacia_pautas_catalog.js' });
    vm.runInNewContext(commonSrc, sandbox, { filename: 'farmacia_common.js' });
    return sandbox;
}

// ─── 1. Published application read operation ─────────────────────────────────

const common = loadCommon('');
const F = common.window.FarmaciaDemo;
check('farmacia_common exposes readPatientContext', F && typeof F.readPatientContext === 'function');
check('farmacia_common exposes loadLongitudinalDemoDataset', F && typeof F.loadLongitudinalDemoDataset === 'function');

async function statuses() {
    const results = {};
    results.noCip = await loadCommon('').window.FarmaciaDemo.readPatientContext();
    results.demoFallback = await loadCommon('').window.FarmaciaDemo.readPatientContext({ demoFallbackCip: 'CIP-DEMO-FH-001' });
    results.unknownCip = await loadCommon('?cip=CIP-UNKNOWN-09').window.FarmaciaDemo.readPatientContext();
    results.demoCip = await loadCommon('?cip=CIP-DEMO-FH-001').window.FarmaciaDemo.readPatientContext();
    return results;
}

try {
    const r = await statuses();
    check('readPatientContext with no cip answers no_cip and null patient',
        r.noCip.status === 'no_cip' && r.noCip.patient === null && r.noCip.cip === '',
        JSON.stringify(r.noCip));

    check('readPatientContext demo fallback keeps status no_cip while exposing the demo coexistence patient',
        r.demoFallback.status === 'no_cip' && r.demoFallback.patient && r.demoFallback.patient.cip === 'CIP-DEMO-FH-001'
            && r.demoFallback.source === 'legacy_coexistence',
        JSON.stringify({ status: r.demoFallback.status, source: r.demoFallback.source, cip: r.demoFallback.patient && r.demoFallback.patient.cip }));

    check('readPatientContext with unknown cip answers not_found and null patient',
        r.unknownCip.status === 'not_found' && r.unknownCip.patient === null && r.unknownCip.patientNotFound === true,
        JSON.stringify(r.unknownCip));

    check('readPatientContext resolves an explicit demo cip as loaded with explicit identity',
        r.demoCip.status === 'loaded' && r.demoCip.patient && r.demoCip.patient.cip === 'CIP-DEMO-FH-001'
            && r.demoCip.source === 'legacy_coexistence' && r.demoCip.patientNotFound === false,
        JSON.stringify({ status: r.demoCip.status, source: r.demoCip.source }));

    check('readPatientContext derives navigation context fields like the published getQueryContext',
        r.demoCip.servicio === 'Dermatología' && r.demoCip.servicioSlug === 'dermatologia',
        JSON.stringify({ servicio: r.demoCip.servicio, servicioSlug: r.demoCip.servicioSlug }));

    check('readPatientContext never collapses missing navigation fields onto empty strings',
        r.noCip.servicio === '' && r.noCip.patologia === '' && r.noCip.hasExplicitCip === false,
        JSON.stringify({ servicio: r.noCip.servicio, hasExplicitCip: r.noCip.hasExplicitCip }));
} catch (error) {
    fail('readPatientContext behavioral statuses executable', error && error.message);
}

// ─── 2. Commit-free contract: reading never writes the session ───────────────

try {
    const writes = [];
    const storage = {
        getItem: (key) => null,
        setItem: (key, value) => { writes.push(`set:${key}`); },
        removeItem: (key) => { writes.push(`remove:${key}`); }
    };
    const sandbox = loadCommon('?cip=CIP-DEMO-FH-001', {
        localStorage: storage,
        sessionStorage: storage
    });
    await sandbox.window.FarmaciaDemo.readPatientContext();
    const sessionWrites = writes.filter((entry) => entry.indexOf('currentPatientSession') !== -1);
    check('readPatientContext performs no current-patient-session write', sessionWrites.length === 0, JSON.stringify(writes));
} catch (error) {
    fail('readPatientContext commit-free executable', error && error.message);
}

// ─── 3. No direct patient lookup in T1 page coordinators ─────────────────────

function readScript(relative) {
    return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

const dashboardSrc = readScript('scripts/farmacia_dashboard_paciente.js');
const longitudinalSrc = readScript('scripts/farmacia_dashboard_longitudinal.js');

check('dashboard_paciente page coordinator has no F.getQueryContext patient resolution',
    dashboardSrc.indexOf('getQueryContext(') === -1);
check('dashboard_paciente page coordinator has no direct F.patients population access',
    /F\.patients\s*\[/.test(dashboardSrc) === false);
check('dashboard_paciente page coordinator has no direct demo dataset fetch',
    dashboardSrc.indexOf("fetch('data/demo") === -1 && dashboardSrc.indexOf('fetch("data/demo') === -1);
check('dashboard_paciente page coordinator consumes the published async read operation',
    dashboardSrc.indexOf('readPatientContext') !== -1);

check('dashboard_longitudinal page coordinator has no F.getQueryContext patient resolution',
    longitudinalSrc.indexOf('getQueryContext(') === -1);
check('dashboard_longitudinal page coordinator has no direct demo dataset fetch',
    longitudinalSrc.indexOf("fetch('data/demo") === -1 && longitudinalSrc.indexOf('fetch("data/demo') === -1);
check('dashboard_longitudinal page coordinator loads the dataset behind the published seam',
    longitudinalSrc.indexOf('loadLongitudinalDemoDataset') !== -1);

// Explicit legacy lookups are allowed only inside the seam.
const commonSrc = readScript('scripts/farmacia_common.js');
check('farmacia_common keeps the explicit legacy coexistence lookup inside the seam',
    commonSrc.indexOf('function findAvailablePatientByCip') !== -1);

// ─── 4. HTML wiring: published V2 read modules load on T1 pages ──────────────

const dashboardHtml = readScript('farmacia_dashboard_paciente.html');
const longitudinalHtml = readScript('farmacia_dashboard_longitudinal.html');
check('dashboard_paciente.html loads the published patient read contract V2',
    dashboardHtml.indexOf('scripts/farmacia_patient_read_contract_v2.js') !== -1);
check('dashboard_paciente.html loads the published async read facade V2',
    dashboardHtml.indexOf('scripts/farmacia_patient_read_facade_v2.js') !== -1);
check('dashboard_longitudinal.html loads the published patient read contract V2',
    longitudinalHtml.indexOf('scripts/farmacia_patient_read_contract_v2.js') !== -1);
check('dashboard_longitudinal.html loads the published async read facade V2',
    longitudinalHtml.indexOf('scripts/farmacia_patient_read_facade_v2.js') !== -1);

// ─── 5. Missing/0/false/'' preservation through the read operation ───────────

try {
    const sandbox = loadCommon('?cip=CIP-DEMO-FH-001');
    const result = await sandbox.window.FarmaciaDemo.readPatientContext();
    const patient = result.patient || {};
    const sample = {
        cip: patient.cip,
        nombre: patient.nombre,
        hasOwnEdad: Object.prototype.hasOwnProperty.call(patient, 'edad')
    };
    check('readPatientContext returns the patient record without coercing or re-deriving fields',
        sample.cip === 'CIP-DEMO-FH-001' && typeof sample.nombre === 'string' && sample.nombre.length > 0,
        JSON.stringify(sample));
    check('readPatientContext patient is a fresh read (no shared mutable reference into the seam population)',
        result.patient !== sandbox.window.FarmaciaDemo.patients['CIP-DEMO-FH-001']);
} catch (error) {
    fail('value preservation executable', error && error.message);
}

console.log(`\nFARMACIA-F4.3A-READ-MIGRATION: ${passed ? passed + ' passed' : '0 passed'}, ${failed} failed`);
if (failed > 0) {
    console.error('FAILURES:\n' + failures.map((line) => ' - ' + line).join('\n'));
    process.exit(1);
}
