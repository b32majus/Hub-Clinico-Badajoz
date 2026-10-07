#!/usr/bin/env node
/* #576 Informe trimestral Cosentyx — supported-browser QA through the real UI.
 *
 * Journey: open Estadísticas normally (demo session), enter Informes through
 * the supported switcher, change quarter, verify counts/detail change from the
 * synthetic fixture, demonstrate all four categories across periods, download
 * a REAL .xlsx and validate Resumen + Detalle against the visible UI model,
 * return to the population analysis and confirm the existing filtered-cohort
 * CSV export still downloads. No DOM tampering; supported interactions only.
 */
import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor/sheetjs/xlsx.full.min.js'));
require(path.join(ROOT, 'scripts/farmacia_cosentyx_informe_fixture.js'));
require(path.join(ROOT, 'scripts/farmacia_cosentyx_informe_model.js'));
const Informe = globalThis.FarmaciaCosentyxInforme;
const Fixture = globalThis.FarmaciaCosentyxInformeFixture;
const APP_PREFIX = String(process.env.FH_APP_PREFIX || '').replace(/^\/+|\/+$/g, '');

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
            return createRequire(path.join(nodeModules, '__fh_cosentyx_informe_loader.cjs'))('playwright');
        }
    }
    try {
        const globalRoot = require('node:child_process').execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
        if (globalRoot && existsSync(path.join(globalRoot, 'playwright', 'package.json'))) {
            return createRequire(path.join(globalRoot, 'playwright', 'package.json'))('playwright');
        }
    } catch { /* fall through to the explicit guidance below */ }
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_cosentyx_informe_browser_check.mjs');
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

/* Independent expected model (same hand-derived literals as the deterministic checker). */
const EXPECTED = {
    '2026-Q1': {
        dom: { pso_start: '1', psa_start: '0', hs_start_q2w: '1', hs_intensification: '0', unique: '2' },
        patients: ['COS-PSO-001', 'COS-HS-001'],
        workbook: { counts: [1, 0, 1, 0], unique: 2 }
    },
    '2026-Q2': {
        dom: { pso_start: '1', psa_start: '1', hs_start_q2w: '1', hs_intensification: '2', unique: '4' },
        patients: ['COS-PSO-002', 'COS-PSA-001', 'COS-HS-003', 'COS-HS-002'],
        workbook: { counts: [1, 1, 1, 2], unique: 4 }
    },
    '2026-Q3': {
        dom: { pso_start: '1', psa_start: '0', hs_start_q2w: '0', hs_intensification: '0', unique: '1' },
        patients: ['COS-PSO-004'],
        workbook: { counts: [1, 0, 0, 0], unique: 1 }
    }
};
const NEGATIVE_PATIENTS = ['COS-PSO-003', 'COS-PSA-002', 'COS-HS-004', 'COS-HS-005'];
const CATEGORY_LABELS = [
    'PsO — nuevos inicios', 'PsA — nuevos inicios',
    'HS — nuevos inicios q2w', 'HS — intensificaciones q4w → q2w'
];

const mime = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'],
    ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['.svg', 'image/svg+xml']
]);
const server = createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'farmacia_estadisticas.html';
    const file = path.resolve(ROOT, relative);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return response.writeHead(403).end();
    try {
        if (!statSync(file).isFile()) throw new Error('not_file');
        response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': 'no-store' });
        createReadStreamAndServe(file, response);
    } catch {
        response.writeHead(404).end('Not found');
    }
});
function createReadStreamAndServe(file, response) {
    createReadStream(file).pipe(response);
}

await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
});
const BASE = `http://127.0.0.1:${server.address().port}/`;
const appUrl = file => new URL(`${APP_PREFIX ? `${APP_PREFIX}/` : ''}${file}`, BASE).href;
const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
const context = await browser.newContext({ acceptDownloads: true });
const consoleErrors = [];
const pageErrors = [];
context.on('page', page => {
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`${page.url()}: ${message.text()}`); });
    page.on('pageerror', error => pageErrors.push(`${page.url()}: ${error.message}`));
});

async function waitForMode(page, mode, count) {
    await page.waitForFunction(({ expectedMode, expectedCount }) => {
        const state = window.FarmaciaStatisticsDashboard?.getState();
        return state?.source_mode === expectedMode && state.patient_count === expectedCount;
    }, { expectedMode: mode, expectedCount: count });
}

async function readDomKpis(page) {
    return page.evaluate(() => Object.fromEntries(
        [...document.querySelectorAll('#informes-kpis [data-informes-kpi]')]
            .map(node => [node.dataset.informesKpi, node.querySelector('.informes-kpi-value').textContent.trim()])));
}

async function assertQuarterView(page, quarter) {
    const expected = EXPECTED[quarter];
    const domKpis = await readDomKpis(page);
    assert.deepEqual(domKpis, expected.dom, `${quarter} KPI values must match the hand-derived fixture expectation`);
    const state = await page.evaluate(() => window.FarmaciaEstadisticasInformes.getState());
    assert.equal(state.quarter, quarter);
    assert.equal(state.unique_patient_count, Number(expected.dom.unique));
    assert.equal(state.detail_row_count, expected.patients.reduce((sum, id) =>
        sum + (id === 'COS-HS-003' && quarter === '2026-Q2' ? 2 : 1), 0), 'detail rows justify every count');
    const detailText = await page.locator('#informes-detail-table').innerText();
    for (const patientId of expected.patients) {
        assert.ok(detailText.includes(patientId), `${quarter} detail must include ${patientId}`);
    }
    for (const patientId of NEGATIVE_PATIENTS) {
        assert.ok(!detailText.includes(patientId), `${quarter} detail must exclude negative witness ${patientId}`);
    }
    const categoryLabels = await page.evaluate(() =>
        [...document.querySelectorAll('#informes-kpis .informes-kpi-label')].map(node => node.textContent.trim()));
    assert.deepEqual(categoryLabels.slice(0, 4), CATEGORY_LABELS);
    return domKpis;
}

try {
    const page = await context.newPage();
    await page.goto(appUrl('farmacia_estadisticas.html'), { waitUntil: 'domcontentloaded' });
    await waitForMode(page, 'demo', 3);

    /* Population surface is the default view; Informes hidden. */
    assert.ok(await page.locator('#kpi-section').isVisible(), 'population analysis visible by default');
    assert.ok(!(await page.locator('#informes-section').isVisible()), 'Informes hidden by default');

    /* Enter Informes through the supported switcher. */
    await page.locator('#informes-view-btn').click();
    await page.waitForFunction(() => document.querySelector('main.main-content').classList.contains('farmacia-informes-mode'));
    assert.ok(await page.locator('#informes-section').isVisible(), 'Informes visible after supported switch');
    assert.ok(!(await page.locator('#kpi-section').isVisible()), 'population analysis hidden inside Informes');
    assert.match(await page.locator('#informes-title').innerText(), /Informe trimestral Cosentyx/);
    assert.match(await page.locator('#informes-synthetic-notice').innerText(), /Datos sintéticos específicos del informe/);
    const quarters = await page.locator('#informes-quarter-select option').evaluateAll(options => options.map(option => option.value));
    assert.deepEqual(quarters, ['2026-Q1', '2026-Q2', '2026-Q3'], 'selector exposes at least two quarters');

    /* Q1 view: computed from the fixture. */
    await assertQuarterView(page, '2026-Q1');

    /* Change quarter: counts/detail change from the fixture. */
    await page.locator('#informes-quarter-select').selectOption('2026-Q2');
    const q2DomKpis = await assertQuarterView(page, '2026-Q2');

    /* All four categories demonstrated across periods: check Q3 differs too. */
    await page.locator('#informes-quarter-select').selectOption('2026-Q3');
    await assertQuarterView(page, '2026-Q3');
    await page.locator('#informes-quarter-select').selectOption('2026-Q2');
    await assertQuarterView(page, '2026-Q2');

    /* Download a REAL .xlsx and validate it against the visible UI model. */
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#informes-download-xlsx').click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /^informe_trimestral_cosentyx_2026-Q2\.xlsx$/);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const xlsxBuffer = Buffer.concat(chunks);
    assert.equal(xlsxBuffer.subarray(0, 2).toString('latin1'), 'PK', 'download is a real xlsx zip container');

    const workbook = XLSX.read(new Uint8Array(xlsxBuffer), { type: 'array' });
    assert.deepEqual(workbook.SheetNames, ['Resumen', 'Detalle']);
    const normRow = row => {
        const copy = row.map(cell => (cell === undefined ? '' : cell));
        while (copy.length && copy[copy.length - 1] === '') copy.pop();
        return copy;
    };
    const resumen = XLSX.utils.sheet_to_json(workbook.Sheets['Resumen'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(resumen[0], ['Informe trimestral Cosentyx']);
    assert.deepEqual(resumen[1], ['Periodo', '2026-Q2']);
    assert.deepEqual(resumen[2], ['Inicio', '2026-04-01']);
    assert.deepEqual(resumen[3], ['Fin', '2026-06-30']);
    assert.ok(resumen.some(row => row[0] === 'Procedencia' && row[1] === 'Datos sintéticos específicos del informe'));
    const headerIndex = resumen.findIndex(row => row[0] === 'Categoría' && row[1] === 'Pacientes');
    const categoryRows = resumen.slice(headerIndex + 1, headerIndex + 5);
    assert.deepEqual(categoryRows, CATEGORY_LABELS.map((label, index) => [label, EXPECTED['2026-Q2'].workbook.counts[index]]),
        'Resumen counts must match the hand-derived expectation');
    assert.ok(resumen.some(row => row[0] === 'Total pacientes únicos incluidos' && row[1] === 4),
        'unique total (4), not the blind sum (5)');
    /* Same computed result as the visible UI. */
    const domCounts = [q2DomKpis.pso_start, q2DomKpis.psa_start, q2DomKpis.hs_start_q2w, q2DomKpis.hs_intensification].map(Number);
    assert.deepEqual(categoryRows.map(row => row[1]), domCounts, 'workbook counts must equal the visible UI counts');
    assert.equal(resumen.find(row => row[0] === 'Total pacientes únicos incluidos')[1], Number(q2DomKpis.unique));

    const detalle = XLSX.utils.sheet_to_json(workbook.Sheets['Detalle'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(detalle[0], ['Paciente (sintético)', 'Patología', 'Tipo de caso', 'Fecha del hecho que incluye', 'Régimen explícito']);
    assert.equal(detalle.length - 1, 5, 'Detalle rows justify the counts');
    const expectedRows = Informe.computeReport(Fixture, '2026-Q2').detail_rows
        .map(row => [row.patient_id, row.pathology, row.case_type, row.fact_date, row.regime || 'No registrado']);
    assert.deepEqual(detalle.slice(1), expectedRows);

    /* Return to the population analysis through the supported switcher. */
    await page.locator('#population-view-btn').click();
    await page.waitForFunction(() => !document.querySelector('main.main-content').classList.contains('farmacia-informes-mode'));
    assert.ok(await page.locator('#kpi-section').isVisible(), 'population analysis restored');
    assert.ok(!(await page.locator('#informes-section').isVisible()), 'Informes hidden again');

    /* Existing filtered-cohort CSV export still works on the population surface. */
    let filterId = null;
    let filteredCount = null;
    for (const candidateId of ['qf-patologia', 'qf-farmaco', 'qf-estado', 'qf-servicio', 'qf-ea', 'qf-adherencia']) {
        const options = await page.locator(`#${candidateId} option`).evaluateAll(all => all.slice(1).map(option => option.value));
        for (const value of options) {
            await page.locator(`#${candidateId}`).selectOption(value);
            const count = await page.evaluate(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count);
            if (count > 0 && count < 3) { filterId = candidateId; filteredCount = count; break; }
            await page.locator(`#${candidateId}`).selectOption('');
        }
        if (filterId) break;
    }
    assert.ok(filterId, 'a population quick filter can narrow the demo cohort');
    const csvPromise = page.waitForEvent('download');
    await page.locator('#exportReportBtn').click();
    const csvDownload = await csvPromise;
    assert.match(csvDownload.suggestedFilename(), /^farmacia_cohorte_filtrada_\d{4}-\d{2}-\d{2}\.csv$/);
    const csvStream = await csvDownload.createReadStream();
    const csvChunks = [];
    for await (const chunk of csvStream) csvChunks.push(chunk);
    const csv = Buffer.concat(csvChunks).toString('utf8');
    assert.equal(csv.charCodeAt(0), 0xFEFF, 'CSV keeps its BOM contract');
    const csvLines = csv.replace(/^\uFEFF/, '').trim().split('\r\n');
    assert.equal(csvLines.length, filteredCount + 1, 'CSV exports the filtered population cohort');
    const csvColumns = await page.evaluate(() => window.FarmaciaStatisticsCohort.CSV_COLUMNS);
    assert.deepEqual(csvLines[0].split(',').map(cell => cell.replace(/^"|"$/g, '')), csvColumns,
        'CSV column contract unchanged');
    await page.locator('#clear-quick-filters').click();
    await page.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 3);

    assert.deepEqual(consoleErrors, [], `console.error: ${consoleErrors.join(' | ')}`);
    assert.deepEqual(pageErrors, [], `pageerror: ${pageErrors.join(' | ')}`);
    console.log('farmacia_cosentyx_informe_browser_check: PASS');
    console.log('QA Chromium: Informes switch OK; quarters Q1/Q2/Q3 differ from fixture; 4 categories shown; real XLSX Resumen+Detalle match UI model (unique=4, not blind sum 5); population CSV filtered export OK; console.error=0 pageerror=0');
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
