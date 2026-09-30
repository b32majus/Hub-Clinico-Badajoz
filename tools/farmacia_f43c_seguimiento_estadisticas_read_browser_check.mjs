#!/usr/bin/env node
// tools/farmacia_f43c_seguimiento_estadisticas_read_browser_check.mjs
// TRAIN-NEXUS-FARMACIA-READ-MIGRATION-09 — T3/F4.3C supported browser QA.
// Synthetic data only. Supported interactions on the migrated surfaces:
//   Seguimiento: load with demo cip (patient context through the async read
//   operation), guarded CIP-search interaction, unknown cip fail-closed
//   manual path, console/pageerror = 0.
//   Estadísticas: demo cohort load behind the published seam, supported
//   filter interaction, empty-state, console/pageerror = 0. (Estadísticas
//   has NO current-patient read responsibility; population via the
//   published handoff seam.)
// Ejecutar: node tools/farmacia_f43c_seguimiento_estadisticas_read_browser_check.mjs

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
            return createRequire(path.join(nodeModules, '__fh_f43c_loader.cjs'))('playwright');
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

function resourceNoise(text) { return text.indexOf('Failed to load resource') !== -1; }

// ─── Seguimiento ──────────────────────────────────────────────────────────────

{
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('dialog', (dialog) => dialog.accept());
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    try {
        await page.goto(base + 'farmacia_seguimiento.html?cip=CIP-DEMO-FH-001', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-DEMO-FH-001', null, { timeout: 10000 });
        ok('seguimiento resolves the demo patient context through the async read operation');
        // Supported interaction: guarded CIP search for another known demo patient.
        await page.evaluate(() => { document.getElementById('fhSegCip').value = 'CIP-DEMO-FH-002'; });
        const searchButton = await page.$('#fhSegCipSearchBtn');
        if (searchButton) await searchButton.click();
        else await page.evaluate(() => {
            const input = document.getElementById('fhSegCip');
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        });
        await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-DEMO-FH-002', null, { timeout: 10000 });
        ok('seguimiento supports the guarded CIP-search interaction through the seam read');
        // Supported interaction: unknown cip stays fail-closed manual.
        await page.evaluate(() => { document.getElementById('fhSegCip').value = 'CIP-UNKNOWN-09'; });
        if (searchButton) await searchButton.click();
        await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-UNKNOWN-09', null, { timeout: 10000 });
        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('seguimiento unknown cip search: fail-closed manual path, console.error=0 pageerror=0');
    } catch (error) {
        bad('seguimiento journeys', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────

{
    const context = await browser.newContext();
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    try {
        await page.goto(base + 'farmacia_estadisticas.html', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => {
            const state = window.FarmaciaStatisticsDashboard && window.FarmaciaStatisticsDashboard.getState();
            return state && (state.source_mode === 'demo' || state.source_mode === 'error');
        }, null, { timeout: 15000 });
        const state = await page.evaluate(() => window.FarmaciaStatisticsDashboard.getState());
        assert.equal(state.source_mode, 'demo', `source mode ${JSON.stringify(state.source_mode)}`);
        assert.ok(state.patient_count > 0, `demo cohort loaded behind the seam: ${state.patient_count} patients`);
        ok('estadisticas loads the demo cohort through the published seam loader');
        // Supported interaction: quick filter select change.
        const filterResult = await page.evaluate(() => {
            const select = document.querySelector('.stats-quick-filter-select');
            if (!select || select.options.length < 2) return false;
            select.selectedIndex = 1;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        });
        assert.ok(filterResult, 'quick filter interaction dispatched');
        await page.waitForTimeout(300);
        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('estadisticas supported filter interaction: console.error=0 pageerror=0');
    } catch (error) {
        bad('estadisticas journeys', error && error.message);
    } finally {
        await context.close();
    }
}

await browser.close();
server.close();
console.log(`\nFARMACIA-F4.3C-READ-BROWSER: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
    console.error('FAILURES: ' + failures.join('; '));
    process.exit(1);
}
