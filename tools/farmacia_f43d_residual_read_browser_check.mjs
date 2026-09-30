#!/usr/bin/env node
// tools/farmacia_f43d_residual_read_browser_check.mjs
// TRAIN-NEXUS-FARMACIA-F4.3-CLOSEOUT-09.1 — T1/F4.3D supported browser QA (#476).
// Synthetic data only. Supported interactions on the three migrated surfaces:
//   Inicio (farmacia_index.html): init-time read restores the transported CIP
//   and runs the guarded search through the seam; supported CIP search finds
//   the demo patient; unknown CIP opens the guided intake panel.
//   Actividad del servicio (farmacia_actividad_servicio.html): population
//   cards render through the published sync population read; pendientes panel
//   toggle is a supported interaction.
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

// ─── 3. Actividad del servicio: population renders through the sync read ─────

{
    const { context, page, consoleErrors, pageErrors } = await newPage();
    try {
        await page.goto(base + 'farmacia_actividad_servicio.html', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!window.FarmaciaDemo && typeof window.FarmaciaDemo.readAvailablePatientsSync === 'function', null, { timeout: 10000 });
        await page.waitForFunction(() => (document.getElementById('actividadCards') || { children: [] }).children.length > 0, null, { timeout: 15000 });
        const population = await page.evaluate(() => window.FarmaciaDemo.readAvailablePatientsSync().length);
        assert.ok(population > 0, `demo population present through the published sync read: ${population}`);
        const sourceNote = await page.evaluate(() => (document.getElementById('actividadSourceNote') || {}).textContent || '');
        assert.ok(sourceNote.trim().length > 0, `source summary rendered from the same population: ${JSON.stringify(sourceNote)}`);
        // Supported interaction: open the pendientes panel.
        const toggle = await page.$('#pendientesToggle');
        if (toggle) {
            await toggle.click();
            await page.waitForFunction(() => !(document.getElementById('actividadPendientesPanel') || { classList: { contains: () => true } }).classList.contains('hidden'), null, { timeout: 10000 });
            const panelText = await page.evaluate(() => (document.getElementById('actividadPendientesPanel') || {}).textContent || '');
            assert.ok(panelText.trim().length > 0, 'pendientes panel renders its population rows or its explicit empty state');
        }
        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(filterRealErrors(consoleErrors), [], 'console.error');
        ok('actividad del servicio population renders through the published sync population read');
    } catch (error) {
        bad('actividad del servicio population renders through the published sync population read', error && error.message);
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

await browser.close();
server.close();

console.log(`\nFARMACIA-F4.3D-RESIDUAL-READ-BROWSER: ${failures.length === 0 ? 'PASS' : 'FAIL'} ${passed} scenarios`);
if (failures.length > 0) process.exit(1);
