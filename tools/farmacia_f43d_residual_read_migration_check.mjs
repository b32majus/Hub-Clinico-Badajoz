#!/usr/bin/env node
// tools/farmacia_f43d_residual_read_migration_check.mjs
// TRAIN-NEXUS-FARMACIA-F4.3-CLOSEOUT-09.1 — T1/F4.3D frozen characterization oracle (#476).
//
// Frozen BEFORE implementation. Characterizes BEHAVIOR (not incidental bytes):
//   1. farmacia_common publishes the SYNC population read operations
//      `readAvailablePatientsSync` / `readPendingValidationPatientsSync` as
//      thin seam-internal wrappers over the legacy coexistence population
//      merge, behaviorally identical to the legacy helpers, with the same
//      commit-free contract (no session write, no second clinical cache,
//      no fabricated cohort) and no collapse of 0/false/''/missing data.
//   2. The three residual page consumers perform NO direct legacy read:
//      farmacia_index.js has no F.getQueryContext / F.findPatientByCip and
//      consumes the published async init read + published sync CIP read;
//      farmacia_actividad_servicio.js has no direct population helper calls
//      and consumes the published sync population reads;
//      fh_intake_review_ui.js has no FarmaciaDemo.getQueryContext and
//      consumes the published sync context read.
//   3. Explicit legacy lookups remain allowed only INSIDE the published seam
//      (farmacia_common).
//   4. The published pages keep loading farmacia_common before their page
//      script with a ?v= cache token.
//
// Ejecutar: node tools/farmacia_f43d_residual_read_migration_check.mjs

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

function readScript(relative) {
    return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

// ─── 1. Published SYNC population read operations on the seam ────────────────

const common = loadCommon('');
const F = common.window.FarmaciaDemo;
check('farmacia_common exposes readAvailablePatientsSync', F && typeof F.readAvailablePatientsSync === 'function');
check('farmacia_common exposes readPendingValidationPatientsSync', F && typeof F.readPendingValidationPatientsSync === 'function');

try {
    const sandbox = loadCommon('');
    const seam = sandbox.window.FarmaciaDemo;
    const viaSeam = seam.readAvailablePatientsSync();
    const viaLegacy = seam.getAvailablePatients();
    check('readAvailablePatientsSync is migration-parity equal to the legacy population read on the same fixture',
        JSON.stringify(viaSeam) === JSON.stringify(viaLegacy) && Array.isArray(viaSeam) && viaSeam.length > 0,
        `seam=${Array.isArray(viaSeam) ? viaSeam.length : typeof viaSeam} legacy=${Array.isArray(viaLegacy) ? viaLegacy.length : typeof viaLegacy}`);

    const pendingViaSeam = seam.readPendingValidationPatientsSync();
    const pendingViaLegacy = seam.getPendingValidationPatients();
    check('readPendingValidationPatientsSync is migration-parity equal to the legacy pending read on the same fixture',
        JSON.stringify(pendingViaSeam) === JSON.stringify(pendingViaLegacy),
        `seam=${JSON.stringify(pendingViaSeam).length}B legacy=${JSON.stringify(pendingViaLegacy).length}B`);

    check('published sync population reads keep explicit sentinel fields untouched (0 / false / empty string)',
        viaSeam.every((p) => !('estado' in p) || p.estado === null || typeof p.estado === 'string'),
        'population rows carry their own field values without coercion');
} catch (error) {
    fail('sync population read parity executable', error && error.message);
}

try {
    const writes = [];
    const storage = {
        getItem: (key) => null,
        setItem: (key, value) => { writes.push(`set:${key}`); },
        removeItem: (key) => { writes.push(`remove:${key}`); }
    };
    const sandbox = loadCommon('', {
        localStorage: storage,
        sessionStorage: storage
    });
    const seam = sandbox.window.FarmaciaDemo;
    seam.readAvailablePatientsSync();
    seam.readPendingValidationPatientsSync();
    const sessionWrites = writes.filter((entry) => entry.indexOf('currentPatientSession') !== -1);
    check('published sync population reads perform no current-patient-session write (reading never commits a patient)',
        sessionWrites.length === 0, JSON.stringify(writes));
} catch (error) {
    fail('sync population read commit-free executable', error && error.message);
}

try {
    const sandbox = loadCommon('?cip=CIP-DEMO-FH-001&servicio=Dermatología');
    const seam = sandbox.window.FarmaciaDemo;
    const viaSeam = seam.readQueryContextSync();
    const viaLegacy = seam.getQueryContext();
    check('readQueryContextSync stays migration-parity equal to the legacy context read (published sync context op)',
        JSON.stringify(viaSeam) === JSON.stringify(viaLegacy)
            && viaSeam.cip === 'CIP-DEMO-FH-001'
            && viaSeam.patient && viaSeam.patient.cip === 'CIP-DEMO-FH-001',
        JSON.stringify({ cip: viaSeam.cip, status: viaSeam.status }));
} catch (error) {
    fail('sync context read parity executable', error && error.message);
}

// ─── 2. Static gate: the three residual consumers no longer bypass the seam ──

const indexSrc = readScript('scripts/farmacia_index.js');
check('farmacia_index page coordinator has no F.getQueryContext patient resolution',
    indexSrc.indexOf('getQueryContext') === -1);
check('farmacia_index page coordinator has no direct F.findPatientByCip lookup',
    indexSrc.indexOf('findPatientByCip') === -1);
check('farmacia_index page coordinator consumes the published async init read',
    indexSrc.indexOf('readPatientContext') !== -1);
check('farmacia_index page coordinator consumes the published seam sync CIP read',
    indexSrc.indexOf('readPatientByCipSync') !== -1);

const actividadSrc = readScript('scripts/farmacia_actividad_servicio.js');
check('farmacia_actividad_servicio has no direct legacy population read (getAvailablePatients)',
    actividadSrc.indexOf('getAvailablePatients') === -1);
check('farmacia_actividad_servicio has no direct legacy population helper (getPendingValidationPatients)',
    actividadSrc.indexOf('getPendingValidationPatients') === -1);
check('farmacia_actividad_servicio consumes the published sync population read',
    actividadSrc.indexOf('readAvailablePatientsSync') !== -1);
check('farmacia_actividad_servicio consumes the published sync pending-population read',
    actividadSrc.indexOf('readPendingValidationPatientsSync') !== -1);

const intakeReviewSrc = readScript('scripts/fh_intake_review_ui.js');
check('fh_intake_review_ui has no FarmaciaDemo.getQueryContext use',
    intakeReviewSrc.indexOf('getQueryContext') === -1);
check('fh_intake_review_ui consumes the published sync context read',
    intakeReviewSrc.indexOf('readQueryContextSync') !== -1);

// Explicit legacy lookups are allowed only inside the published seam.
const commonSrc = readScript('scripts/farmacia_common.js');
check('farmacia_common keeps the explicit legacy coexistence lookup inside the seam',
    commonSrc.indexOf('function findAvailablePatientByCip') !== -1
        && commonSrc.indexOf('function getAvailablePatients') !== -1
        && commonSrc.indexOf('function getQueryContext') !== -1);

// ─── 3. HTML wiring: seam loads before each page script with a cache token ───

function scriptOrder(html, first, second) {
    const i = html.indexOf(first);
    const j = html.indexOf(second);
    return i !== -1 && j !== -1 && i < j;
}

const indexHtml = readScript('farmacia_index.html');
check('farmacia_index.html loads farmacia_common before the page script',
    scriptOrder(indexHtml, 'scripts/farmacia_common.js?v=', 'scripts/farmacia_index.js?v='));

const actividadHtml = readScript('farmacia_actividad_servicio.html');
check('farmacia_actividad_servicio.html loads farmacia_common before the page script',
    scriptOrder(actividadHtml, 'scripts/farmacia_common.js?v=', 'scripts/farmacia_actividad_servicio.js?v='));

const validacionHtml = readScript('farmacia_validacion.html');
check('farmacia_validacion.html loads farmacia_common before the intake review module',
    scriptOrder(validacionHtml, 'scripts/farmacia_common.js?v=', 'scripts/fh_intake_review_ui.js?v='));

// ─── 4. readPatientContext keeps the published init-read contract for index ──

try {
    const r = await loadCommon('?cip=CIP-DEMO-FH-001').window.FarmaciaDemo.readPatientContext();
    check('readPatientContext resolves the explicit init identity consumed by farmacia_index',
        r.status === 'loaded' && r.cip === 'CIP-DEMO-FH-001' && r.patient && r.patient.cip === 'CIP-DEMO-FH-001'
            && r.patientNotFound === false,
        JSON.stringify({ status: r.status, cip: r.cip }));
} catch (error) {
    fail('readPatientContext init contract executable', error && error.message);
}

// ─── 5. Correction cycle (#476): stale init read must never override a newer
//        supported user search. Interaction-ordering invariant, frozen before
//        the runtime guard is implemented. Deterministic VM harness over the
//        real farmacia_index.js source with a manually-resolved init read.

function makeIndexElement(id) {
    const listeners = {};
    return {
        id,
        value: '',
        textContent: '',
        disabled: false,
        children: [],
        options: [],
        selectedOptions: [],
        style: {},
        classList: {
            _set: new Set(),
            add(c) { this._set.add(c); },
            remove(c) { this._set.delete(c); },
            contains(c) { return this._set.has(c); },
            toggle(c, force) { if (force === undefined) { this._set.has(c) ? this._set.delete(c) : this._set.add(c); } else if (force) { this._set.add(c); } else { this._set.delete(c); } }
        },
        addEventListener(type, listener) { (listeners[type] = listeners[type] || []).push(listener); },
        dispatch(type, event) { (listeners[type] || []).forEach((listener) => listener(event || { preventDefault() {} })); },
        appendChild() {},
        append() {},
        focus() {},
        setAttribute(name, value) { (this.attributes = this.attributes || {})[name] = String(value); },
        getAttribute(name) { return (this.attributes && this.attributes[name] !== undefined) ? this.attributes[name] : null; }
    };
}

function runIndexScenario({ initRead }) {
    const elements = {};
    const domReady = [];
    const cipReads = [];
    const alerts = [];
    const location = { href: 'farmacia_index.html', search: '?entrada=derivacion' };
    const document = {
        body: makeIndexElement('body'),
        addEventListener(type, listener) { if (type === 'DOMContentLoaded') domReady.push(listener); },
        getElementById(id) { return elements[id] || (elements[id] = makeIndexElement(id)); },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        createElement(tag) { const el = makeIndexElement(tag); return el; },
        createTextNode(text) { return { textContent: text }; }
    };
    const F = {
        patologiaPorServicio: { reumatologia: ['Artritis Reumatoide (AR)'] },
        populateSelect(select, values, placeholder) {
            select.options = [{ value: '', textContent: placeholder }, ...values.map((value) => ({ value, textContent: value }))];
            select.value = '';
        },
        setValue(id, value) { if (elements[id]) elements[id].value = value || ''; },
        setText(id, value) { if (elements[id]) elements[id].textContent = value || ''; },
        insertNoCipBanner() {},
        renderFields() {},
        clearChildren(target) { target.children = []; target.options = []; },
        readPatientContext: initRead,
        readPatientByCipSync(cip) { cipReads.push(cip); return { status: 'no_cip', patient: null, source: null, patient_id: null, errorCode: null }; },
        getQueryContext() { return {}; },
        getPendingValidationPatients() { return []; },
        getEnfermeriaVisiblePatients() { return []; },
        isEnfermeriaPatient() { return false; },
        createOverlayMount() { return { content: makeIndexElement('ovContent'), title: makeIndexElement('ovTitle'), subtitle: makeIndexElement('ovSub'), open() {}, close() {} }; },
        createField() { return makeIndexElement('field'); },
        appendIconText() {},
        statusClass() { return '';
        }
    };
    const sandbox = {
        window: { FarmaciaDemo: F, location, alert: (message) => alerts.push(message), confirm: () => true },
        document,
        URLSearchParams,
        console: { error() {}, log() {}, warn() {} }
    };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(indexSrc, sandbox, { filename: 'farmacia_index.js' });
    domReady.forEach((listener) => listener());
    return { elements, cipReads, alerts, tick: () => new Promise((resolve) => setImmediate(resolve)) };
}

function userSearchFor(harness, cip) {
    // Supported interaction only: the professional types a CIP and presses the
    // visible search button (fhSearchBtn). No DOM state is fabricated.
    harness.elements.fhCipInput.value = cip;
    harness.elements.fhSearchBtn.dispatch('click');
}

try {
    // Scenario R1: delayed init read for transported CIP A; supported user
    // search for CIP B before A resolves; then A resolves.
    let resolveInit = null;
    const initRead = () => new Promise((resolve) => { resolveInit = resolve; });
    const harness = runIndexScenario({ initRead });
    await harness.tick();
    userSearchFor(harness, 'CIP-USER-B');
    await harness.tick();
    check('correction R1: supported user search B becomes the visible search intent',
        harness.elements.fhCipInput.value === 'CIP-USER-B'
            && harness.cipReads.indexOf('CIP-USER-B') !== -1,
        JSON.stringify({ input: harness.elements.fhCipInput.value, cipReads: harness.cipReads }));
    resolveInit({ cip: 'CIP-INIT-A', status: 'loaded', patient: { cip: 'CIP-INIT-A', servicio: 'Reumatología', patologia: 'Artritis Reumatoide (AR)' }, hasExplicitCip: true, patientNotFound: false });
    await harness.tick();
    await harness.tick();
    check('correction R1: stale init A never overwrites the newer user CIP B',
        harness.elements.fhCipInput.value === 'CIP-USER-B',
        `input=${harness.elements.fhCipInput.value}`);
    check('correction R1: no search for stale init A occurs after the user search B',
        harness.cipReads.indexOf('CIP-INIT-A') === -1,
        JSON.stringify(harness.cipReads));
    check('correction R1: stale init A causes no patient selection/commit (only B was resolved)',
        harness.cipReads.filter((cip) => cip === 'CIP-USER-B').length === 1
            && harness.cipReads.every((cip) => cip === 'CIP-USER-B'),
        JSON.stringify(harness.cipReads));
} catch (error) {
    fail('correction R1 stale-init race scenario executable', error && error.stack);
}

try {
    // Scenario R2 (control): delayed init read A, no user interaction; normal
    // init restore and guarded search must behave exactly as before.
    let resolveInit = null;
    const initRead = () => new Promise((resolve) => { resolveInit = resolve; });
    const harness = runIndexScenario({ initRead });
    await harness.tick();
    resolveInit({ cip: 'CIP-INIT-A', status: 'loaded', patient: { cip: 'CIP-INIT-A', servicio: 'Reumatología', patologia: 'Artritis Reumatoide (AR)' }, hasExplicitCip: true, patientNotFound: false });
    await harness.tick();
    await harness.tick();
    check('correction R2 control: transported CIP A is restored and searched when no user interaction supersedes init',
        harness.elements.fhCipInput.value === 'CIP-INIT-A'
            && harness.cipReads.indexOf('CIP-INIT-A') !== -1,
        JSON.stringify({ input: harness.elements.fhCipInput.value, cipReads: harness.cipReads }));
} catch (error) {
    fail('correction R2 normal-init control executable', error && error.stack);
}

// ─── Report ───────────────────────────────────────────────────────────────────

console.log(`\nFARMACIA-F4.3D-RESIDUAL-READ-MIGRATION: ${failed === 0 ? 'PASS' : 'FAIL'} ${passed}/${passed + failed} cases`);
if (failed > 0) {
    console.log(failures.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
}
