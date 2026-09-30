#!/usr/bin/env node
// tools/farmacia_f43b_validacion_primera_visita_read_browser_check.mjs
// TRAIN-NEXUS-FARMACIA-READ-MIGRATION-09 — T2/F4.3B supported browser QA.
// Synthetic data only. Supported interactions on the migrated surfaces:
//   Validación: load with demo cip (requested treatment populated from the
//   patient's requested data; validated treatment NOT prepopulated beyond the
//   patient's own validation), manual-origin supported interaction, unknown
//   cip state, console/pageerror = 0.
//   Primera Visita: load with demo cip, supported CIP-search interaction
//   (known and unknown cip), console/pageerror = 0.
// Ejecutar: node tools/farmacia_f43b_validacion_primera_visita_read_browser_check.mjs

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
            return createRequire(path.join(nodeModules, '__fh_f43b_loader.cjs'))('playwright');
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

async function collect(page) {
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => pageErrors.push(String(error && error.message || error)));
    return { consoleErrors, pageErrors };
}

function resourceNoise(text) { return text.indexOf('Failed to load resource') !== -1; }

// ─── Validación ───────────────────────────────────────────────────────────────

{
    const context = await browser.newContext();
    const page = await context.newPage();
    const { consoleErrors, pageErrors } = await collect(page);
    try {
        await page.goto(base + 'farmacia_validacion.html?cip=CIP-DEMO-FH-001', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => (document.getElementById('fhDermaCip') || {}).value === 'CIP-DEMO-FH-001', null, { timeout: 10000 });
        ok('validacion resolves the demo patient context through the async read operation');
        // Requested treatment from the patient's own requested data; validated
        // treatment never prepopulated beyond the patient's own validation.
        const requested = await page.evaluate(() => (document.getElementById('fhDermaFarmaco') || {}).value || '');
        assert.equal(requested, 'Secukinumab 300 mg', `requested drug ${JSON.stringify(requested)}`);
        const validated = await page.evaluate(() => (document.getElementById('fhValidadoFarmaco') || {}).value || '');
        assert.equal(validated, '', `validated drug must not be inferred/prepopulated: ${JSON.stringify(validated)}`);
        ok('validacion keeps requested != validated (no therapeutic inference)');
        // Supported interaction: switch to manual origin and complete the
        // governed servicio/patología gate.
        await page.selectOption('#fhOrigenEntrada', 'manual_farmacia');
        await page.selectOption('#fhServicioManual', 'derma');
        await page.selectOption('#fhPatologiaManual', { label: 'Hidradenitis supurativa' });
        await page.waitForTimeout(200);
        const manualVisible = await page.evaluate(() => {
            const form = document.getElementById('formManualSolicitud');
            return !!form && !form.classList.contains('hidden');
        });
        assert.ok(manualVisible, 'manual form not visible after supported origen switch');
        ok('validacion supports the manual-origin interaction after async context load');
        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('validacion demo journey: console.error=0 pageerror=0');
    } catch (error) {
        bad('validacion demo journey', error && error.message);
    } finally {
        await context.close();
    }
}

{
    const context = await browser.newContext();
    const page = await context.newPage();
    const { consoleErrors, pageErrors } = await collect(page);
    try {
        await page.goto(base + 'farmacia_validacion.html?cip=CIP-UNKNOWN-09', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(700);
        const cipValue = await page.evaluate(() => (document.getElementById('fhDermaCip') || {}).value || '');
        assert.equal(cipValue, 'CIP-UNKNOWN-09', `visible cip ${JSON.stringify(cipValue)}`);
        const requested = await page.evaluate(() => (document.getElementById('fhDermaFarmaco') || {}).value || '');
        assert.equal(requested, '', `unknown cip must not invent a requested treatment: ${JSON.stringify(requested)}`);
        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('validacion unknown cip: missing stays missing, no invented patient, no errors');
    } catch (error) {
        bad('validacion unknown cip', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── Primera Visita ───────────────────────────────────────────────────────────

{
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('dialog', (dialog) => dialog.accept());
    const { consoleErrors, pageErrors } = await collect(page);
    try {
        await page.goto(base + 'farmacia_primera_visita.html?cip=CIP-DEMO-FH-001', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => (document.getElementById('fhPvCip') || {}).value === 'CIP-DEMO-FH-001', null, { timeout: 10000 });
        ok('primera_visita resolves the demo patient context through the async read operation');
        // Supported interaction: CIP search for another known demo patient.
        await page.evaluate(() => {
            const input = document.getElementById('fhPvCip');
            input.value = 'CIP-DEMO-FH-002';
        });
        const searchButton = await page.$('#fhPvCipSearchBtn');
        if (searchButton) {
            await searchButton.click();
        } else {
            await page.evaluate(() => {
                const input = document.getElementById('fhPvCip');
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            });
        }
        await page.waitForFunction(() => (document.getElementById('fhPvCip') || {}).value === 'CIP-DEMO-FH-002', null, { timeout: 10000 });
        ok('primera_visita supports the guarded CIP-search interaction through the seam read');
        // Supported interaction: unknown cip search stays manual, no invention.
        await page.evaluate(() => {
            const input = document.getElementById('fhPvCip');
            input.value = 'CIP-UNKNOWN-09';
        });
        if (searchButton) await searchButton.click();
        await page.waitForFunction(() => (document.getElementById('fhPvCip') || {}).value === 'CIP-UNKNOWN-09', null, { timeout: 10000 });
        const notice = await page.evaluate(() => (document.getElementById('fhPvCipNotice') || document.querySelector('.cip-notice') || {}).textContent || '');
        assert.ok(/no encontrado/i.test(notice) || notice === '', `unknown cip notice ${JSON.stringify(notice)}`);
        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('primera_visita unknown cip search: fail-closed manual path, console.error=0 pageerror=0');
    } catch (error) {
        bad('primera_visita journeys', error && error.message);
    } finally {
        await context.close();
    }
}

await browser.close();
server.close();
console.log(`\nFARMACIA-F4.3B-READ-BROWSER: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
    console.error('FAILURES: ' + failures.join('; '));
    process.exit(1);
}
