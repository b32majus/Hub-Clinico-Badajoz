#!/usr/bin/env node
// tools/farmacia_f43d_residual_read_browser_check.mjs
// TRAIN-NEXUS-FARMACIA-F4.3-CLOSEOUT-09.1 — T1/F4.3D supported browser QA (#476).
// Synthetic data only. Supported interactions on the three migrated surfaces:
//   Inicio (farmacia_index.html): init-time read restores the transported CIP
//   and runs the guarded search through the seam; supported CIP search finds
//   the demo patient; unknown CIP opens the guided intake panel.
//   Pendientes (farmacia_actividad_servicio.html): the single Pendientes
//   queue renders through the published sync population read (summary plus
//   always-visible queue rows).
//   Validación (farmacia_validacion.html): the unified intake review module
//   consumes the published sync context read; reveal behaves per the seam
//   context (patient present → derma preview stays hidden; no patient →
//   preview-only reveal), console/pageerror = 0.
// Ejecutar: node tools/farmacia_f43d_residual_read_browser_check.mjs

import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
            return createRequire(path.join(nodeModules, '__fh_f43d_loader.cjs'))('playwright');
        }
    }
    throw new Error('Playwright not found. Run with a PATH exposing a playwright node_modules.');
}

const { chromium } = loadPlaywrightFromNpx();

function chromiumExecutable() {
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    const bundled = chromium.executablePath();
    if (existsSync(bundled)) return bundled;
    const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
    if (!existsSync(cache)) return bundled;
    const candidates = readdirSync(cache)
        .filter(entry => entry.startsWith('chromium_headless_shell-'))
        .sort().reverse()
        .map(entry => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
    return candidates.find(existsSync) || bundled;
}

const mime = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'],
    ['.svg', 'image/svg+xml']
]);

const server = createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'farmacia_index.html';
    const file = path.resolve(ROOT, relative);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return response.writeHead(403).end();
    try {
        if (!statSync(file).isFile()) throw new Error('not_file');
        response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': 'no-store' });
        createReadStream(file).pipe(response);
    } catch {
        response.writeHead(404).end('Not found');
    }
});

await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
});
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
let passed = 0;
const failures = [];
function ok(name) { passed += 1; console.log(`PASS ${name}`); }
function bad(name, detail) { failures.push(name); console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }

async function newPage() {
    const context = await browser.newContext();
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => pageErrors.push(String(error && error.message || error)));
    return { context, page, consoleErrors, pageErrors };
}

function filterRealErrors(consoleErrors) {
    return consoleErrors.filter((text) => text.indexOf('Failed to load resource') === -1);
}

// ─── 1. Inicio: init read restores the transported CIP and finds the patient ─

{
    const { context, page, consoleErrors, pageErrors } = await newPage();
    try {
        await page.goto(base + 'farmacia_index.html?cip=CIP-DEMO-FH-001', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => (document.getElementById('fhSearchStatus') || {}).textContent === 'Paciente encontrado.', null, { timeout: 15000 });
        const input = await page.evaluate(() => (document.getElementById('fhCipInput') || {}).value || '');
        assert.equal(input, 'CIP-DEMO-FH-001', `cip input restored by the init read: ${JSON.stringify(input)}`);
        await page.waitForFunction(() => !!document.querySelector('.fh-overlay-card .patient-name'), null, { timeout: 10000 });
        const quickViewName = await page.evaluate(() => (document.querySelector('.fh-overlay-card .patient-name') || {}).textContent || '');
        assert.ok(quickViewName.trim().length > 0, `quick view renders the found patient: ${JSON.stringify(quickViewName)}`);
        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(filterRealErrors(consoleErrors), [], 'console.error');
        ok('inicio init read restores transported cip and renders the found patient through the seam');
    } catch (error) {
        bad('inicio init read restores transported cip and renders the found patient through the seam', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── 2. Inicio: supported CIP search interaction (found / not found) ─────────

{
    const { context, page, consoleErrors, pageErrors } = await newPage();
    try {
        await page.goto(base + 'farmacia_index.html', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!window.FarmaciaDemo && typeof window.FarmaciaDemo.readPatientByCipSync === 'function', null, { timeout: 10000 });
        // Supported interaction: type an explicit CIP and press the search button.
        await page.fill('#fhCipInput', 'CIP-DEMO-FH-001');
        await page.click('#fhSearchBtn');
        await page.waitForFunction(() => (document.getElementById('fhSearchStatus') || {}).textContent === 'Paciente encontrado.', null, { timeout: 15000 });
        // Supported interaction: close the Quick View overlay through its own
        // close control before the next search.
        await page.click('#fhQuickViewPanel .quick-view-close-btn');
        await page.waitForFunction(() => (document.getElementById('fhQuickViewOverlay') || { classList: { contains: () => true } }).classList.contains('hidden'), null, { timeout: 10000 });
        // Supported interaction: search an unknown CIP → guided intake panel.
        await page.fill('#fhCipInput', 'CIP-UNKNOWN-F43D');
        await page.click('#fhSearchBtn');
        await page.waitForFunction(() => (document.getElementById('fhSearchStatus') || {}).textContent === 'Paciente no encontrado.', null, { timeout: 15000 });
        await page.waitForFunction(() => !(document.getElementById('guidedIntakePanel') || { classList: { contains: () => true } }).classList.contains('hidden'), null, { timeout: 10000 });
        const guidedCip = await page.evaluate(() => (document.getElementById('guidedCip') || {}).textContent || '');
        assert.equal(guidedCip.trim(), 'CIP-UNKNOWN-F43D', `guided intake carries the explicit typed identity: ${JSON.stringify(guidedCip)}`);
        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(filterRealErrors(consoleErrors), [], 'console.error');
        ok('inicio supported cip search finds the demo patient and unknown cip opens the guided intake');
    } catch (error) {
        bad('inicio supported cip search finds the demo patient and unknown cip opens the guided intake', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── 3. Pendientes (ex Actividad del servicio, WO #549): the single queue ───
//        renders through the published sync reads. The legacy `Validaciones
//        pendientes` toggle card and the `actividadSourceNote` indicator note
//        were removed by WO #549 decision 3 (summary + always-visible queue
//        replace the KPI cards); the intent — rendering reflects the
//        published sync population — is now checked against the summary
//        total and the rendered queue rows instead of the removed note.

{
    const { context, page, consoleErrors, pageErrors } = await newPage();
    try {
        await page.goto(base + 'farmacia_actividad_servicio.html', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!window.FarmaciaDemo && typeof window.FarmaciaDemo.readAvailablePatientsSync === 'function', null, { timeout: 10000 });
        await page.waitForFunction(() => (document.getElementById('actividadCards') || { children: [] }).children.length > 0, null, { timeout: 15000 });
        const population = await page.evaluate(() => window.FarmaciaDemo.readAvailablePatientsSync().length);
        assert.ok(population > 0, `demo population present through the published sync read: ${population}`);
        const summaryCount = await page.evaluate(() => document.querySelectorAll('#actividadCards [data-summary]').length);
        assert.equal(summaryCount, 4, `summary renders its four counters from the same population: ${summaryCount}`);
        const expectedQueue = await page.evaluate(() => {
            const F = window.FarmaciaDemo;
            const keyOf = (p) => {
                const sid = p && p.solicitud_id ? String(p.solicitud_id).trim().toUpperCase() : '';
                return sid ? `SID:${sid}` : `CIP:${String((p && p.cip) || '').trim().toUpperCase()}`;
            };
            const pendingKeys = {};
            F.readPendingValidationPatientsSync().forEach((p) => { pendingKeys[keyOf(p)] = true; });
            return F.readAvailablePatientsSync().filter((p) => F.isEnfermeriaPatient(p) || pendingKeys[keyOf(p)]).length;
        });
        const summaryTotal = await page.evaluate(() => {
            const el = document.querySelector('#actividadCards [data-summary="total"]');
            return el ? Number(String(el.textContent).replace(/[^0-9]/g, '')) : -1;
        });
        assert.equal(summaryTotal, expectedQueue, `summary total matches the published sync queue population: ${summaryTotal}`);
        // WO #549 removed the pendientes toggle card: the single queue is
        // always visible, so its absence is asserted and the panel must
        // render its population rows (or its explicit empty state) directly.
        const toggle = await page.$('#pendientesToggle');
        assert.equal(toggle, null, 'legacy pendientes toggle card is gone (queue always visible)');
        await page.waitForFunction(() => ((document.getElementById('actividadPendientesPanel') || {}).textContent || '').trim().length > 0, null, { timeout: 10000 });
        const renderedRows = await page.evaluate(() => document.querySelectorAll('#actividadPendientesPanel .pending-validation-card').length);
        const panelText = await page.evaluate(() => (document.getElementById('actividadPendientesPanel') || {}).textContent || '');
        assert.ok(renderedRows > 0 || panelText.indexOf('No hay solicitudes pendientes.') !== -1, 'queue panel renders its population rows or its explicit empty state');
        assert.equal(renderedRows, expectedQueue, `rendered queue rows match the published sync queue population: ${renderedRows}`);
        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(filterRealErrors(consoleErrors), [], 'console.error');
        ok('pendientes queue renders through the published sync population read');
    } catch (error) {
        bad('pendientes queue renders through the published sync population read', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── 4. Validación: intake review module consumes the sync context read ──────

{
    const { context, page, consoleErrors, pageErrors } = await newPage();
    try {
        await page.goto(base + 'farmacia_validacion.html?cip=CIP-DEMO-FH-001', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!window.FarmaciaDemo && typeof window.FarmaciaDemo.readQueryContextSync === 'function', null, { timeout: 15000 });
        const seamContext = await page.evaluate(() => {
            const context = window.FarmaciaDemo.readQueryContextSync();
            return { cip: context.cip, hasPatient: !!context.patient, patientCip: context.patient && context.patient.cip };
        });
        assert.equal(seamContext.cip, 'CIP-DEMO-FH-001', `published sync context read carries the explicit identity: ${JSON.stringify(seamContext)}`);
        assert.equal(seamContext.patientCip, 'CIP-DEMO-FH-001', 'sync context read resolves the explicit patient');
        await page.waitForTimeout(300); // reveal timers (setTimeout 0) after DOMContentLoaded
        const dermaHidden = await page.evaluate(() => (document.getElementById('formDerma') || { classList: { contains: () => true } }).classList.contains('hidden'));
        assert.equal(dermaHidden, !seamContext.hasPatient, 'derma preview visibility follows the published seam context (patient present → stays hidden)');
        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(filterRealErrors(consoleErrors), [], 'console.error');
        ok('validacion intake review reveal follows the published sync context read (explicit patient)');
    } catch (error) {
        bad('validacion intake review reveal follows the published sync context read (explicit patient)', error && error.message);
    } finally {
        await context.close();
    }
}

{
    const { context, page, consoleErrors, pageErrors } = await newPage();
    try {
        await page.goto(base + 'farmacia_validacion.html?cip=CIP-UNKNOWN-F43D', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!window.FarmaciaDemo && typeof window.FarmaciaDemo.readQueryContextSync === 'function', null, { timeout: 15000 });
        const seamContext = await page.evaluate(() => {
            const context = window.FarmaciaDemo.readQueryContextSync();
            return { cip: context.cip, hasPatient: !!context.patient };
        });
        assert.equal(seamContext.hasPatient, false, 'unknown explicit cip keeps the context fail-closed (no fabricated patient)');
        await page.waitForFunction(() => !(document.getElementById('formDerma') || { classList: { contains: () => true } }).classList.contains('hidden'), null, { timeout: 10000 });
        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(filterRealErrors(consoleErrors), [], 'console.error');
        ok('validacion intake review reveal runs on the no-patient route without patient residue');
    } catch (error) {
        bad('validacion intake review reveal runs on the no-patient route without patient residue', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── 5. Correction cycle (#476): stale init read must never override a newer
//        supported user search. The published async init read (readPatientContext)
//        is wrapped at its own async boundary to be genuinely slow (same test
//        double as the frozen VM oracle); the user interaction itself is fully
//        supported (fill + click on the real search button). No DOM state is
//        fabricated and no product code is altered.
function withGatedInitRead() {
    return {
        initScript: `
            (() => {
                let release = null;
                const gate = new Promise((resolve) => { release = resolve; });
                window.__fhReleaseInit = () => { if (release) { const r = release; release = null; r(); } };
                let current = undefined;
                Object.defineProperty(window, 'FarmaciaDemo', {
                    configurable: true,
                    set(value) {
                        if (value && typeof value.readPatientContext === 'function') {
                            const original = value.readPatientContext.bind(value);
                            value.readPatientContext = function (...args) {
                                return gate.then(() => original(...args));
                            };
                        }
                        current = value;
                    },
                    get() { return current; }
                });
            })();`,
        release: (page) => page.evaluate(() => window.__fhReleaseInit())
    };
}

{
    // Scenario 5a: delayed init A → supported user search B → A resolves late.
    const gate = withGatedInitRead();
    const { context, page, consoleErrors, pageErrors } = await newPage();
    await page.addInitScript(gate.initScript);
    try {
        await page.goto(base + 'farmacia_index.html?cip=CIP-INIT-A', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!window.FarmaciaDemo && typeof window.FarmaciaDemo.readPatientByCipSync === 'function' && !!document.getElementById('fhSearchBtn'), null, { timeout: 15000 });
        const pendingInput = await page.evaluate(() => (document.getElementById('fhCipInput') || {}).value || '');
        assert.equal(pendingInput, '', 'init A is still in flight (input untouched)');
        // Supported interaction: the professional types CIP B and presses search.
        await page.fill('#fhCipInput', 'CIP-USER-B');
        await page.click('#fhSearchBtn');
        await page.waitForFunction(() => (document.getElementById('fhSearchStatus') || {}).textContent === 'Paciente no encontrado.', null, { timeout: 15000 });
        const beforeLate = await page.evaluate(() => ({
            input: (document.getElementById('fhCipInput') || {}).value || '',
            guidedCip: (document.getElementById('guidedCip') || {}).textContent || ''
        }));
        assert.equal(beforeLate.input, 'CIP-USER-B', 'user CIP B is the visible search intent');
        // The delayed init A now resolves.
        await gate.release(page);
        await page.waitForTimeout(500);
        const afterLate = await page.evaluate(() => ({
            input: (document.getElementById('fhCipInput') || {}).value || '',
            guidedCip: (document.getElementById('guidedCip') || {}).textContent || '',
            status: (document.getElementById('fhSearchStatus') || {}).textContent || ''
        }));
        assert.equal(afterLate.input, 'CIP-USER-B', 'stale init A never overwrites the newer user CIP B');
        assert.equal(afterLate.guidedCip, 'CIP-USER-B', 'guided intake keeps the user CIP B (no stale A substitution)');
        assert.equal(afterLate.status, 'Paciente no encontrado.', 'no stale search for A runs after B (status keeps the user outcome)');
        const overlayPatient = await page.evaluate(() => (document.querySelector('.fh-overlay-card .patient-name') || { textContent: '' }).textContent.trim());
        assert.equal(overlayPatient, '', 'stale init A renders no patient quick view after B');
        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(filterRealErrors(consoleErrors), [], 'console.error');
        ok('stale init A never overrides the newer supported user search B (late init is a no-op)');
    } catch (error) {
        bad('stale init A never overrides the newer supported user search B (late init is a no-op)', error && error.message);
    } finally {
        await context.close();
    }
}

{
    // Scenario 5b (control): delayed init A, no user interaction; normal init
    // restore and guarded search behave exactly as before the correction.
    const gate = withGatedInitRead();
    const { context, page, consoleErrors, pageErrors } = await newPage();
    await page.addInitScript(gate.initScript);
    try {
        await page.goto(base + 'farmacia_index.html?cip=CIP-DEMO-FH-001', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!window.FarmaciaDemo && typeof window.FarmaciaDemo.readPatientByCipSync === 'function' && !!document.getElementById('fhSearchBtn'), null, { timeout: 15000 });
        await gate.release(page);
        await page.waitForFunction(() => (document.getElementById('fhSearchStatus') || {}).textContent === 'Paciente encontrado.', null, { timeout: 15000 });
        const input = await page.evaluate(() => (document.getElementById('fhCipInput') || {}).value || '');
        assert.equal(input, 'CIP-DEMO-FH-001', 'normal init restore still works through the guarded path');
        await page.waitForFunction(() => !!document.querySelector('.fh-overlay-card .patient-name'), null, { timeout: 10000 });
        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(filterRealErrors(consoleErrors), [], 'console.error');
        ok('delayed init A without user interaction still restores and searches normally');
    } catch (error) {
        bad('delayed init A without user interaction still restores and searches normally', error && error.message);
    } finally {
        await context.close();
    }
}

await browser.close();
server.close();

console.log(`\nFARMACIA-F4.3D-RESIDUAL-READ-BROWSER: ${failures.length === 0 ? 'PASS' : 'FAIL'} ${passed} scenarios`);
if (failures.length > 0) process.exit(1);
