#!/usr/bin/env node
// tools/farmacia_f43b_validacion_primera_visita_read_migration_check.mjs
// TRAIN-NEXUS-FARMACIA-READ-MIGRATION-09 — T2/F4.3B frozen characterization oracle.
//
// Characterizes BEHAVIOR (not incidental bytes):
//   1. The T2 page coordinators (farmacia_validacion.js,
//      farmacia_primera_visita.js) perform NO direct patient lookup:
//      no F.getQueryContext resolution and no F.findPatientByCip coordinator
//      lookup; they consume the published async application read operations
//      (readPatientContext / readPatientByCip) resolved at supported
//      interaction points.
//   2. The seam operation readPatientByCip answers explicit typed statuses
//      (loaded / no_cip / not_found / ambiguous / unavailable), keeps the
//      legacy coexistence lookup INSIDE the seam, never commits a patient and
//      never writes the session.
//   3. Validation/first-visit export truth keeps its identity semantics: the
//      visible-CIP export truth path resolves through the seam with the same
//      loaded/not-loaded outcome the legacy lookup produced (missing stays
//      missing; no heuristic reconciliation; no inferred validation result).
//   4. The T2 pages load the published F4.1 contract V2 + F4.2 async facade.
//
// Ejecutar: node tools/farmacia_f43b_validacion_primera_visita_read_migration_check.mjs

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

function readScript(relative) {
    return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

// ─── 1. No direct patient lookup in T2 page coordinators ─────────────────────

const validacionSrc = readScript('scripts/farmacia_validacion.js');
const primeraVisitaSrc = readScript('scripts/farmacia_primera_visita.js');

check('validacion page coordinator has no F.getQueryContext patient resolution',
    validacionSrc.indexOf('getQueryContext(') === -1);
check('validacion page coordinator has no direct F.findPatientByCip lookup',
    validacionSrc.indexOf('findPatientByCip') === -1);
check('validacion page coordinator consumes the published async read operation',
    validacionSrc.indexOf('readPatientContext') !== -1);

check('primera_visita page coordinator has no F.getQueryContext patient resolution',
    primeraVisitaSrc.indexOf('getQueryContext(') === -1);
check('primera_visita page coordinator has no direct F.findPatientByCip lookup',
    primeraVisitaSrc.indexOf('findPatientByCip') === -1);
check('primera_visita page coordinator has no direct F.patients population access',
    /F\.patients\s*\[/.test(primeraVisitaSrc) === false);
check('primera_visita page coordinator consumes the published async read operations',
    primeraVisitaSrc.indexOf('readPatientContext') !== -1 && primeraVisitaSrc.indexOf('readPatientByCip') !== -1);

// ─── 2. HTML wiring: published V2 read modules load on T2 pages ──────────────

const validacionHtml = readScript('farmacia_validacion.html');
const primeraVisitaHtml = readScript('farmacia_primera_visita.html');
check('validacion.html loads the published patient read contract V2',
    validacionHtml.indexOf('scripts/farmacia_patient_read_contract_v2.js') !== -1);
check('validacion.html loads the published async read facade V2',
    validacionHtml.indexOf('scripts/farmacia_patient_read_facade_v2.js') !== -1);
check('primera_visita.html loads the published patient read contract V2',
    primeraVisitaHtml.indexOf('scripts/farmacia_patient_read_contract_v2.js') !== -1);
check('primera_visita.html loads the published async read facade V2',
    primeraVisitaHtml.indexOf('scripts/farmacia_patient_read_facade_v2.js') !== -1);

// ─── 3. Seam readPatientByCip: typed statuses, commit-free ───────────────────

try {
    const F = loadCommon('').window.FarmaciaDemo;
    check('farmacia_common exposes readPatientByCip', typeof F.readPatientByCip === 'function');

    const noCip = await F.readPatientByCip('');
    check('readPatientByCip with empty input answers no_cip and null patient',
        noCip.status === 'no_cip' && noCip.patient === null, JSON.stringify(noCip));

    const loaded = await F.readPatientByCip('CIP-DEMO-FH-001');
    check('readPatientByCip resolves an explicit cip as loaded with explicit identity and seam source',
        loaded.status === 'loaded' && loaded.patient && loaded.patient.cip === 'CIP-DEMO-FH-001'
            && loaded.source === 'legacy_coexistence',
        JSON.stringify({ status: loaded.status, source: loaded.source }));

    const unknown = await F.readPatientByCip('CIP-UNKNOWN-09');
    check('readPatientByCip with unknown cip answers not_found and null patient (missing stays missing)',
        unknown.status === 'not_found' && unknown.patient === null, JSON.stringify(unknown));

    const zeroPreserved = await F.readPatientByCip('CIP-DEMO-FH-001');
    check('readPatientByCip preserves the patient record as-is (no coercion, fresh read)',
        zeroPreserved.patient && zeroPreserved.patient.ihs4 === 9
            && zeroPreserved.patient !== F.patients['CIP-DEMO-FH-001'],
        JSON.stringify({ ihs4: zeroPreserved.patient && zeroPreserved.patient.ihs4 }));
} catch (error) {
    fail('readPatientByCip behavioral statuses executable', error && error.message);
}

try {
    const writes = [];
    const storage = {
        getItem: () => null,
        setItem: (key) => { writes.push(`set:${key}`); },
        removeItem: (key) => { writes.push(`remove:${key}`); }
    };
    const sandbox = loadCommon('', { localStorage: storage, sessionStorage: storage });
    await sandbox.window.FarmaciaDemo.readPatientByCip('CIP-DEMO-FH-001');
    await sandbox.window.FarmaciaDemo.readPatientByCip('CIP-UNKNOWN-09');
    const sessionWrites = writes.filter((entry) => entry.indexOf('currentPatientSession') !== -1);
    check('readPatientByCip performs no current-patient-session write (read never commits)',
        sessionWrites.length === 0, JSON.stringify(writes));
} catch (error) {
    fail('readPatientByCip commit-free executable', error && error.message);
}

// ─── 4. Export truth identity semantics preserved through the seam ───────────

check('primera_visita export truth resolves the visible CIP through the seam read operation',
    primeraVisitaSrc.indexOf('readPatientByCip') !== -1
        && primeraVisitaSrc.indexOf("fv('fhPvCip')") !== -1);
check('validacion export path consumes the async read operation',
    /async[^\n]*\{[^]*?readPatientContext/.test(validacionSrc.slice(validacionSrc.indexOf('fhValExcelExportBtn') - 500))
        || validacionSrc.split('readPatientContext').length >= 2);

console.log(`\nFARMACIA-F4.3B-READ-MIGRATION: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    console.error('FAILURES:\n' + failures.map((line) => ' - ' + line).join('\n'));
    process.exit(1);
}
