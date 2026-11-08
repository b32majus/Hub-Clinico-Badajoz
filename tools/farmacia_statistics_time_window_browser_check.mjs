#!/usr/bin/env node
// tools/farmacia_statistics_time_window_browser_check.mjs
// #690: filtro «Ventana temporal» (Desde/Hasta) de Estadísticas en la cohorte demo
// (CIP-DEMO-FH-001: 10-05..01-06-2026; -003: 10-03..20-05; -004: 14-02..09-06).
// Controles reales (fill/click), sin forzar DOM. Solo datos sintéticos.
// Ejecutar: npx --yes --package=playwright node tools/farmacia_statistics_time_window_browser_check.mjs

import assert from 'node:assert/strict';
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor/sheetjs/xlsx.full.min.js'));
require(path.join(ROOT, 'scripts/farmacia_export_v2_core.js'));
const core = globalThis.FarmaciaExportV2Core;

const RAW_COUNT = 4;
const DEMO_COUNT = 3;
const SEV_GRAVE = 'Grave'; // severidades del fixture sintético (el filtro de gravedad se retiró en D3c-2)
const SEV_LEVE = 'Leve';

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
            return createRequire(path.join(nodeModules, '__fh_gravedad_loader.cjs'))('playwright');
        }
    }
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_statistics_extra_filters_browser_check.mjs');
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
    ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
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
const BASE = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
const context = await browser.newContext({ acceptDownloads: true });
const consoleErrors = [];
const pageErrors = [];
const attachErrors = page => {
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`${page.url()}: ${message.text()}`); });
    page.on('pageerror', error => pageErrors.push(`${page.url()}: ${error.message}`));
};
context.on('page', attachErrors);

async function waitForMode(page, mode, count) {
    await page.waitForFunction(({ expectedMode, expectedCount }) => {
        const state = window.FarmaciaStatisticsDashboard?.getState();
        return state?.source_mode === expectedMode && state.patient_count === expectedCount;
    }, { expectedMode: mode, expectedCount: count });
}


function resourceNoise(text) { return text.indexOf('Failed to load resource') !== -1; }

async function filteredCount(page) {
    return page.evaluate(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count);
}

let passed = 0;
const failures = [];
function ok(name) { passed += 1; console.log(`PASS ${name}`); }
function bad(name, detail) { failures.push(name); console.log(`FAIL ${name}${detail ? ' - ' + detail : ''}`); }
const ids = page => page.locator('#patients-table tbody tr td:first-child').evaluateAll(cells => cells.map(cell => cell.textContent.trim()).sort());
const setWindow = async (page, from, to) => {
    await page.locator('#qf-desde').fill(from);
    await page.locator('#qf-hasta').fill(to);
};
const step = async (name, fn) => { try { await fn(); ok(name); } catch (error) { bad(name, error.message); } };

try {
    const page = await context.newPage();
    await page.goto(BASE + 'farmacia_estadisticas.html', { waitUntil: 'domcontentloaded' });
    await waitForMode(page, 'demo', 3);

    await step('controles Desde/Hasta habilitados, tipo date, con etiqueta', async () => {
        for (const [id, label] of [['qf-desde', 'Desde'], ['qf-hasta', 'Hasta']]) {
            assert.equal(await page.locator('#' + id).getAttribute('type'), 'date');
            assert.equal(await page.locator('#' + id).isEnabled(), true);
            assert.equal((await page.locator(`label[for="${id}"]`).textContent()).trim(), label);
        }
    });
    await step('sin ventana: 3 pacientes', async () => assert.equal(await filteredCount(page), 3));
    await step('Desde 01-06-2026 (límite inclusivo): FH-001 y FH-004', async () => {
        await setWindow(page, '2026-06-01', '');
        assert.deepEqual(await ids(page), ['CIP-DEMO-FH-001', 'CIP-DEMO-FH-004']);
    });
    await step('Hasta 20-02-2026: solo FH-004', async () => {
        await setWindow(page, '', '2026-02-20');
        assert.deepEqual(await ids(page), ['CIP-DEMO-FH-004']);
    });
    await step('día único 01-06-2026: solo FH-001', async () => {
        await setWindow(page, '2026-06-01', '2026-06-01');
        assert.deepEqual(await ids(page), ['CIP-DEMO-FH-001']);
    });
    await step('ventana vacía 02-06 a 08-06: 0 pacientes, sin error', async () => {
        await setWindow(page, '2026-06-02', '2026-06-08');
        assert.equal(await filteredCount(page), 0);
    });
    await step('ventana invertida: 0 pacientes, sin error de página', async () => {
        await setWindow(page, '2026-06-09', '2026-06-01');
        assert.equal(await filteredCount(page), 0);
    });
    await step('se combina con AND con otro filtro', async () => {
        await setWindow(page, '2026-06-01', '');
        const first = (await page.locator('#qf-farmaco option').evaluateAll(o => o.map(x => x.value))).filter(Boolean);
        assert.ok(first.length > 0);
        const before = await filteredCount(page);
        await page.locator('#qf-farmaco').selectOption(first[0]);
        assert.ok(await filteredCount(page) <= before);
        await page.locator('#qf-farmaco').selectOption('');
    });
    await step('chips Desde/Hasta y quitar el chip restaura', async () => {
        await setWindow(page, '2026-06-01', '2026-06-09');
        assert.ok(/Desde/.test(await page.locator('.stats-cohort-chip').allTextContents().then(a => a.join('|'))), 'chip Desde');
        await page.locator('.stats-cohort-chip-remove').first().click();
        assert.equal(await page.locator('.stats-cohort-chip').count(), 1);
    });
    await step('limpiar filtros vuelve a 3 y vacía las fechas', async () => {
        await page.locator('#clear-quick-filters').first().click();
        assert.equal(await filteredCount(page), 3);
        assert.equal(await page.locator('#qf-desde').inputValue(), '');
        assert.equal(await page.locator('#qf-hasta').inputValue(), '');
    });
    await step('console.error=0 pageerror=0', async () => {
        const noise = consoleErrors.filter(text => !resourceNoise(text));
        assert.deepEqual(noise, []);
        assert.deepEqual(pageErrors, []);
    });
    console.log(`\nFARMACIA-TIME-WINDOW-BROWSER: ${passed} passed, ${failures.length} failed`);
    if (failures.length) process.exitCode = 1;
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
