#!/usr/bin/env node
// tools/farmacia_statistics_line_fields_browser_check.mjs
// #687/#688/#689: filtros «Dosis», «Vía» y «Pauta» de Estadísticas en la cohorte demo.
// Controles reales (fill/click), sin forzar DOM. Solo datos sintéticos.
// Ejecutar: npx --yes --package=playwright node tools/farmacia_statistics_line_fields_browser_check.mjs

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
    const optionValues = id => page.locator('#' + id + ' option').evaluateAll(o => o.map(x => x.value).filter(Boolean));

    for (const [id, label, chip] of [['qf-dosis', 'Dosis', 'Dosis'], ['qf-via', 'Vía', 'Vía'], ['qf-pauta', 'Pauta', 'Pauta']]) {
        await step(`${label}: control con etiqueta y opciones de la demo`, async () => {
            assert.equal((await page.locator(`label[for="${id}"]`).textContent()).trim(), label);
            assert.equal(await page.locator('#' + id).isEnabled(), true);
            assert.ok((await optionValues(id)).length > 0, 'sin opciones');
        });
        await step(`${label}: elegir una opción filtra, pone chip y quitar el chip restaura`, async () => {
            const values = await optionValues(id);
            await page.locator('#' + id).selectOption(values[0]);
            const count = await filteredCount(page);
            assert.ok(count >= 1 && count <= 3, 'count ' + count);
            assert.ok((await page.locator('.stats-cohort-chip').allTextContents()).join('|').includes(chip), 'chip');
            await page.locator('.stats-cohort-chip-remove').first().click();
            assert.equal(await filteredCount(page), 3);
            assert.equal(await page.locator('#' + id).inputValue(), '');
        });
    }
    await step('un valor de Dosis no presente en nadie no es opción (solo valores de los datos)', async () => {
        const values = await optionValues('qf-dosis');
        assert.ok(!values.includes('999 mg/kg'));
    });
    await step('limpiar filtros vuelve a 3 y vacía los tres selects', async () => {
        await page.locator('#qf-via').selectOption((await optionValues('qf-via'))[0]);
        await page.locator('#clear-quick-filters').first().click();
        assert.equal(await filteredCount(page), 3);
        for (const id of ['qf-dosis', 'qf-via', 'qf-pauta']) assert.equal(await page.locator('#' + id).inputValue(), '');
    });
    await step('console.error=0 pageerror=0', async () => {
        const noise = consoleErrors.filter(text => !resourceNoise(text));
        assert.deepEqual(noise, []);
        assert.deepEqual(pageErrors, []);
    });
    console.log(`\nFARMACIA-LINE-FIELDS-BROWSER: ${passed} passed, ${failures.length} failed`);
    if (failures.length) process.exitCode = 1;
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
