#!/usr/bin/env node
// tools/farmacia_f43a_dashboard_read_browser_check.mjs
// TRAIN-NEXUS-FARMACIA-READ-MIGRATION-09 — T1/F4.3A supported browser QA.
// Synthetic data only. Supported interactions on the migrated surfaces:
//   Dashboard paciente: demo load (no cip), explicit cip, unknown cip
//   (no-patient state), longitudinal section loaded behind the seam,
//   navigation link carries the patient identity, console/pageerror = 0.
//   Longitudinal standalone: demo dataset loaded behind the seam, patient
//   selector supported interaction, console/pageerror = 0.
// Ejecutar: node tools/farmacia_f43a_dashboard_read_browser_check.mjs

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
            return createRequire(path.join(nodeModules, '__fh_f43a_loader.cjs'))('playwright');
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

async function visit(page, url) {
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => pageErrors.push(String(error && error.message || error)));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    return { consoleErrors, pageErrors };
}

async function dashboardScenario(label, query, expect) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const { consoleErrors, pageErrors } = await visit(page, base + 'farmacia_dashboard_paciente.html' + query);
    try {
        if (expect.patientName !== undefined) {
            await page.waitForFunction(() => (document.getElementById('patientName') || {}).textContent !== 'Cargando…', null, { timeout: 10000 }).catch(() => {});
            const name = await page.evaluate(() => (document.getElementById('patientName') || {}).textContent || '');
            assert.equal(name, expect.patientName, `patientName ${JSON.stringify(name)}`);
        }
        if (expect.longitudinalStatus) {
            await page.waitForFunction((expected) => {
                const el = document.querySelector('#dbStatusIndicator .db-status-indicator__time');
                return el && el.textContent === expected;
            }, expect.longitudinalStatus, { timeout: 10000 });
        }
        if (expect.notFound) {
            const badge = await page.evaluate(() => (document.getElementById('patientStatusBadge') || {}).textContent || '');
            assert.equal(badge, 'CIP no encontrado', `status badge ${JSON.stringify(badge)}`);
        }
        if (expect.navHrefContainsCip) {
            const href = await page.evaluate(() => (document.getElementById('navToSeguimiento') || {}).href || '');
            assert.ok(href.indexOf('cip=' + encodeURIComponent(expect.navHrefContainsCip)) !== -1 || href.indexOf('cip=' + expect.navHrefContainsCip) !== -1,
                `nav href ${JSON.stringify(href)}`);
        }
        if (expect.supportedInteraction) {
            await expect.supportedInteraction(page);
        }
        assert.deepEqual(pageErrors, [], 'pageerror');
        const realConsoleErrors = consoleErrors.filter((text) => text.indexOf('Failed to load resource') === -1 || !expect.ignoreResourceErrors);
        assert.deepEqual(realConsoleErrors, [], 'console.error');
        ok(label);
    } catch (error) {
        bad(label, error && error.message);
    } finally {
        await context.close();
    }
}

// 1. Demo load without explicit cip: the dashboard renders the demo coexistence
//    patient through the async read operation (status no_cip + demo fallback).
await dashboardScenario('dashboard demo load without cip renders demo patient through the async read operation', '', {
    patientName: 'Paciente Demo FH-001',
    longitudinalStatus: 'Longitudinal cargado',
    navHrefContainsCip: 'CIP-DEMO-FH-001',
    supportedInteraction: async (page) => {
        // Supported interaction: toggle the longitudinal legend.
        const toggle = await page.$('#toggle-legend');
        if (toggle) {
            await toggle.click();
            const label = await page.evaluate(() => (document.getElementById('toggle-legend') || {}).textContent || '');
            assert.ok(['Ocultar leyenda', 'Ver leyenda'].indexOf(label) !== -1, `legend toggle label ${JSON.stringify(label)}`);
        }
    }
});

// 2. Explicit cip resolves the same patient with explicit identity.
await dashboardScenario('dashboard explicit cip resolves the patient with explicit identity', '?cip=CIP-DEMO-FH-001', {
    patientName: 'Paciente Demo FH-001',
    longitudinalStatus: 'Longitudinal cargado',
    navHrefContainsCip: 'CIP-DEMO-FH-001'
});

// 3. Unknown cip answers the governed no-patient state (no invented patient).
await dashboardScenario('dashboard unknown cip answers the governed not-found state', '?cip=CIP-UNKNOWN-09', {
    patientName: 'Paciente no encontrado',
    notFound: true,
    ignoreResourceErrors: false
});

// 4. Longitudinal standalone: dataset behind the seam + supported selector interaction.
{
    const context = await browser.newContext();
    const page = await context.newPage();
    const { consoleErrors, pageErrors } = await visit(page, base + 'farmacia_dashboard_longitudinal.html?cip=CIP-DEMO-FH-001');
    try {
        const status = await page.evaluate(() => (document.getElementById('longitudinalDataStatus') || {}).textContent || '');
        assert.ok(/Dataset cargado/.test(status), `dataset status ${JSON.stringify(status)}`);
        const optionCount = await page.evaluate(() => (document.getElementById('longitudinalPatientSelect') || { options: [] }).options.length);
        assert.ok(optionCount >= 2, `patient select options ${optionCount}`);
        // Supported interaction: select another demo patient from the dropdown.
        const changed = await page.evaluate(() => {
            const select = document.getElementById('longitudinalPatientSelect');
            if (!select || select.options.length < 2) return false;
            select.selectedIndex = 1;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return select.value;
        });
        assert.ok(changed, 'patient selector interaction dispatched');
        await page.waitForTimeout(300);
        const summaryVisible = await page.evaluate(() => !!document.querySelector('#longitudinalPatientSummary, .longitudinal-summary, #longitudinalTreatmentTimeline'));
        assert.ok(summaryVisible, 'longitudinal renders after supported interaction');
        assert.deepEqual(pageErrors, [], 'pageerror');
        const realConsoleErrors = consoleErrors.filter((text) => text.indexOf('Failed to load resource') === -1);
        assert.deepEqual(realConsoleErrors, [], 'console.error');
        ok('longitudinal standalone loads dataset behind the seam and supports selector interaction');
    } catch (error) {
        bad('longitudinal standalone', error && error.message);
    } finally {
        await context.close();
    }
}

await browser.close();
server.close();
console.log(`\nFARMACIA-F4.3A-READ-BROWSER: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
    console.error('FAILURES: ' + failures.join('; '));
    process.exit(1);
}
