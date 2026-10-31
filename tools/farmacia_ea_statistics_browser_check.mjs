#!/usr/bin/env node
// tools/farmacia_ea_statistics_browser_check.mjs
// EA v1 demo (#867), Tramo D3c-2 — Estadísticas pinta EA desde el modelo nuevo
// (decisiones de Sil, 29-10-2026):
//  - Los indicadores antiguos de EA (KPI «EA presentes», donut
//    present/absent/not_recorded, gravedad, filtro #qf-gravedad) se eliminan.
//  - #qf-ea filtra por categoría del modelo nuevo; #qf-ea_sospechoso (nombre
//    de la línea declarada) y #qf-ea_metodo filtran TODA la población.
//  - Tres denominadores: pacientes / episodios / observaciones.
//  - Ausente ≠ NO: sin filas 166 = «No registrado». Nunca «activo» en EA.
// Solo datos sintéticos (libro mixto de tools/fixtures). CSV sin cambios.
// Ejecutar con un PATH que exponga node_modules/.bin de Playwright.

import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const mixed = require('./fixtures/farmacia_ea_mixed_cohort_workbook.cjs');
mixed.loadModules();
const RAW_COUNT = 3;

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
            return createRequire(path.join(nodeModules, '__fh_ea_statistics_loader.cjs'))('playwright');
        }
    }
    throw new Error('Playwright not found. Run with a PATH exposing a playwright node_modules/.bin');
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
    ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'], ['.svg', 'image/svg+xml']
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
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const BASE = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
const context = await browser.newContext();
const consoleErrors = [];
const pageErrors = [];
context.on('page', page => {
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`${page.url()}: ${message.text()}`); });
    page.on('pageerror', error => pageErrors.push(`${page.url()}: ${error.message}`));
});

const state = page => page.evaluate(() => window.FarmaciaStatisticsDashboard.getState());
const waitCount = (page, count) => page.waitForFunction(expected =>
    window.FarmaciaStatisticsDashboard?.getState().filtered_patient_count === expected, count);
const optionValues = (page, id) => page.locator(`#${id} option`).evaluateAll(options => options.map(option => option.value));
const optionLabels = (page, id) => page.locator(`#${id} option`).evaluateAll(options => options.map(option => option.textContent.trim()));
const tableIds = page => page.locator('#patients-table tbody tr td:first-child').evaluateAll(cells => cells.map(cell => cell.textContent.trim()).sort());
async function eaCells(page) {
    return page.evaluate(() => {
        const headers = Array.from(document.querySelectorAll('#patients-table thead th')).map(th => th.textContent.trim());
        const index = headers.indexOf('EA');
        const result = {};
        document.querySelectorAll('#patients-table tbody tr').forEach(row => {
            result[row.cells[0].textContent.trim()] = index === -1 ? null : row.cells[index].textContent.trim();
        });
        return result;
    });
}

let passed = 0;
const failures = [];
async function check(name, fn) {
    try { await fn(); passed += 1; console.log(`PASS ${name}`); }
    catch (error) { failures.push(name); console.log(`FAIL ${name} — ${error.message}`); }
}

try {
    // ─── Modo demo: sin modelo nuevo, EA = No registrado; sin gravedad ───
    const demo = await context.newPage();
    await demo.goto(BASE + 'farmacia_estadisticas.html', { waitUntil: 'domcontentloaded' });
    await demo.waitForFunction(() => window.FarmaciaStatisticsDashboard?.getState()?.source_mode === 'demo');
    await check('demo: filtros EA nuevos, sin gravedad, EA no registrado', async () => {
        assert.equal(await demo.locator('#qf-gravedad').count(), 0, 'sin #qf-gravedad');
        const order = await demo.locator('.stats-quick-filter-select').evaluateAll(nodes => nodes.map(node => node.id));
        assert.deepEqual(order, ['qf-servicio', 'qf-patologia', 'qf-farmaco', 'qf-estado', 'qf-ea', 'qf-adherencia', 'qf-principio', 'qf-ea_sospechoso', 'qf-ea_metodo', 'qf-movimiento']);
        assert.equal(await demo.locator('.stats-quick-filter-group').count(), 10);
        assert.equal((await demo.locator('label[for="qf-ea_sospechoso"]').textContent()).trim(), 'Sospechoso de EA');
        assert.equal((await demo.locator('label[for="qf-ea_metodo"]').textContent()).trim(), 'Método de causalidad');
        assert.equal(await demo.locator('#qf-ea_sospechoso').getAttribute('data-quick-filter'), 'ea_sospechoso');
        assert.equal(await demo.locator('#qf-ea_metodo').getAttribute('data-quick-filter'), 'ea_metodo');
        assert.deepEqual(await optionValues(demo, 'qf-ea'), ['', 'not_recorded']);
        assert.deepEqual(await optionValues(demo, 'qf-ea_sospechoso'), ['']);
        assert.deepEqual(await optionValues(demo, 'qf-ea_metodo'), ['']);
        const kpi = await demo.locator('#kpi-grid').innerText();
        assert.doesNotMatch(kpi, /EA presentes/);
        assert.match(kpi, /Pacientes con EA registrado\s*0/);
        const risks = await demo.locator('#chart-riesgos-content').innerText();
        assert.doesNotMatch(risks, /Gravedad|present \/ absent/);
        assert.match(risks, /Pacientes con episodios: 0 de 3 · Episodios: 0 · Observaciones: 0/);
    });

    // ─── Modo raw: libro mixto importado en Inicio → ventana de Estadísticas ───
    const parent = await context.newPage();
    await parent.goto(BASE + 'farmacia_index.html', { waitUntil: 'domcontentloaded' });
    await parent.waitForFunction(() => window.FarmaciaDataImports && window.FarmaciaStatisticsHandoff);
    await parent.locator('#inputExcelFarmacia').setInputFiles({
        name: 'ea-mixto-sintetico.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from(mixed.workbookBuffer())
    });
    await parent.waitForFunction(count => window.FarmaciaDataImports?.getState('farmacia')?.patientCount === count
        && window.FarmaciaDataImports?.getState('farmacia')?.dataPort, RAW_COUNT);
    const [child] = await Promise.all([
        parent.waitForEvent('popup', { timeout: 10000 }),
        parent.locator('a[href^="farmacia_estadisticas.html"]').first().click({ noWaitAfter: true })
    ]);
    await child.waitForURL(/farmacia_estadisticas\.html/);
    await child.waitForFunction(count => {
        const current = window.FarmaciaStatisticsDashboard?.getState();
        return current?.source_mode === 'raw' && current.patient_count === count;
    }, RAW_COUNT);

    await check('raw: opciones de filtros EA desde el modelo nuevo', async () => {
        assert.deepEqual(await optionValues(child, 'qf-ea'), ['', 'episodes', 'not_recorded']);
        assert.deepEqual(await optionLabels(child, 'qf-ea'), ['Todos', 'Con episodios registrados', 'No registrado']);
        assert.deepEqual(await optionValues(child, 'qf-ea_sospechoso'), ['', 'OTRO SINTETICO', 'SINTETICO']);
        assert.deepEqual(await optionValues(child, 'qf-ea_metodo'), ['', 'naranjo']);
    });

    await check('raw: tres denominadores, KPI, resumen, gráficos y columna EA', async () => {
        assert.equal((await child.locator('#summary-ea').textContent()).trim(), '2');
        const kpi = await child.locator('#kpi-grid').innerText();
        assert.match(kpi, /Pacientes con EA registrado\s*2/);
        assert.doesNotMatch(kpi, /EA presentes/);
        const risks = await child.locator('#chart-riesgos-content').innerText();
        assert.equal((await child.locator('[data-stats-ea-denominators]').innerText()).trim(),
            'Pacientes con episodios: 2 de 3 · Episodios: 3 · Observaciones: 4');
        assert.match(risks, /EA por paciente/);
        assert.match(risks, /Con episodios registrados\s*2/);
        assert.match(risks, /No registrado\s*1/);
        assert.match(risks, /Último estado registrado \(episodios\)/);
        assert.match(risks, /sin evolución indicada\s*2/);
        assert.match(risks, /continúa\s*1/);
        assert.match(risks, /Sospechosos \(episodios\)/);
        assert.match(risks, /OTRO SINTETICO\s*1/);
        assert.doesNotMatch(risks, /Gravedad|present \/ absent|activ/i);
        assert.deepEqual(await eaCells(child), {
            'CIP-LEGACY-003': 'No registrado',
            'CIP-MIX-001': '2 episodios · 2 sin cierre',
            'CIP-MIX-002': '1 episodio · 1 sin cierre'
        });
    });

    await check('raw: sospechoso filtra TODA la población (contador, KPI, tabla, denominadores)', async () => {
        await child.locator('#qf-ea_sospechoso').selectOption('SINTETICO');
        await waitCount(child, 1);
        assert.deepEqual(await tableIds(child), ['CIP-MIX-001']);
        assert.match(await child.locator('#filter-result-count').textContent(), /1 de 3 pacientes/);
        assert.match(await child.locator('#kpi-grid').innerText(), /Pacientes incluidos\s*1/);
        assert.equal((await child.locator('[data-stats-ea-denominators]').innerText()).trim(),
            'Pacientes con episodios: 1 de 1 · Episodios: 1 · Observaciones: 2');
        assert.match(await child.locator('#cohort-pills').textContent(), /Sospechoso de EA: SINTETICO/);
    });

    await check('raw: quitar el chip del método conserva el sospechoso', async () => {
        await child.locator('#qf-ea_metodo').selectOption('naranjo');
        await waitCount(child, 1);
        assert.deepEqual(await tableIds(child), ['CIP-MIX-001']);
        assert.match(await child.locator('#cohort-pills').textContent(), /Método de causalidad: naranjo/);
        await child.locator('button[aria-label="Quitar filtro Método de causalidad"]').click();
        await child.waitForFunction(() => document.getElementById('qf-ea_metodo').value === '');
        assert.equal(await child.locator('#qf-ea_sospechoso').inputValue(), 'SINTETICO');
        assert.deepEqual(await tableIds(child), ['CIP-MIX-001']);
    });

    await check('raw: método solo cuenta para su sospechoso (cero resultados)', async () => {
        await child.locator('#qf-ea_metodo').selectOption('naranjo');
        await waitCount(child, 1);
        await child.locator('#qf-ea_sospechoso').selectOption('OTRO SINTETICO');
        await waitCount(child, 0);
        assert.equal(await child.locator('#no-results-message.hidden').count(), 0, 'estado vacío visible');
        await child.locator('#qf-ea_metodo').selectOption('');
        await waitCount(child, 1);
        assert.deepEqual(await tableIds(child), ['CIP-MIX-002']);
    });

    await check('raw: categoría EA «No registrado» ≠ sin EA', async () => {
        await child.locator('#qf-ea_sospechoso').selectOption('');
        await waitCount(child, 3);
        await child.locator('#qf-ea').selectOption('not_recorded');
        await waitCount(child, 1);
        assert.deepEqual(await tableIds(child), ['CIP-LEGACY-003']);
        await child.locator('#qf-ea').selectOption('episodes');
        await waitCount(child, 2);
        assert.deepEqual(await tableIds(child), ['CIP-MIX-001', 'CIP-MIX-002']);
        await child.locator('#qf-ea').selectOption('');
        await waitCount(child, 3);
        assert.equal((await state(child)).patient_count, RAW_COUNT);
    });

    await check('console.error=0 pageerror=0', async () => {
        const noise = consoleErrors.filter(text => text.indexOf('Failed to load resource') === -1);
        assert.deepEqual(noise, []);
        assert.deepEqual(pageErrors, []);
    });

    console.log(`\nFARMACIA-EA-STATISTICS-BROWSER: ${passed} passed, ${failures.length} failed`);
    if (failures.length) process.exitCode = 1;
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
