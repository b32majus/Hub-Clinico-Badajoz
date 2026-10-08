#!/usr/bin/env node
/* #576 Informe trimestral Cosentyx (+ #593 dos hechos HS adicionales) — supported-browser QA through the real UI.
 *
 * Journey: open Estadísticas normally (demo session), enter Informes through
 * the supported switcher, change quarter, verify counts/detail change from the
 * synthetic fixture, demonstrate all six categories across periods (including
 * the discontinuation-only Q4), download a REAL .xlsx and validate Resumen +
 * Detalle against hand-derived literals and the visible UI model, return to
 * the population analysis and confirm the existing filtered-cohort CSV export
 * still downloads. No DOM tampering; supported interactions only.
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

/* Independent expected model (same hand-derived literals as the deterministic checker).
 *
 * Hand derivation from the explicit synthetic witness list (never from
 * computeReport/DOM):
 * - Q1: PSO-001 disp 03-31 (PsO) + HS-001 disp 02-01 q2w + HS-009 disp 02-10
 *   q2w = pso 1, psa 0, hs_start 2, int 0, red 0, disc 0; unique {PSO-001,
 *   HS-001, HS-009} = 3.
 * - Q2: PSO-002 04-01 + PSO-005 05-06 (pso 2); PSA-001 04-10 + PSA-003 05-12
 *   (psa 2); HS-003 disp 04-02 q2w + HS-006 disp 04-15 q2w + HS-008 disp 05-04
 *   q2w (hs_start 3); HS-003 move 05-15 q4w->q2w + HS-002 move 06-30 q4w->q2w
 *   (int 2); HS-003 move 04-20 q2w->q4w + HS-008 move 06-10 q2w->q4w (red 2);
 *   no dated q2w discontinuation (disc 0); unique {PSO-002, PSO-005, PSA-001,
 *   PSA-003, HS-003, HS-006, HS-002, HS-008} = 8 (blind sum 11).
 * - Q3: PSO-004 disp 07-03 (pso 1); HS-007 move 08-20 q4w->q2w (int 1);
 *   HS-009 discontinued 09-30 event-regimen q2w (disc 1); unique 3.
 * - Q4: ONLY HS-010 discontinued 10-01 event-regimen q2w, explicit wholly
 *   fictitious demo reason 'Decisión clínica documentada' on the synthetic
 *   record (disc 1, everything else 0); unique 1. No Q4
 *   dispensing/movement exists.
 */
const EXPECTED = {
    '2026-Q1': {
        dom: { pso_start: '1', psa_start: '0', hs_start_q2w: '2', hs_intensification: '0', hs_reduction: '0', hs_discontinuation: '0', unique: '3' },
        patients: ['COS-PSO-001', 'COS-HS-001', 'COS-HS-009'],
        rowCounts: { 'COS-PSO-001': 1, 'COS-HS-001': 1, 'COS-HS-009': 1 },
        workbook: { counts: [1, 0, 2, 0, 0, 0], unique: 3 }
    },
    '2026-Q2': {
        dom: { pso_start: '2', psa_start: '2', hs_start_q2w: '3', hs_intensification: '2', hs_reduction: '2', hs_discontinuation: '0', unique: '8' },
        patients: ['COS-PSO-002', 'COS-PSO-005', 'COS-PSA-001', 'COS-PSA-003', 'COS-HS-003', 'COS-HS-006', 'COS-HS-008', 'COS-HS-002'],
        rowCounts: { 'COS-PSO-002': 1, 'COS-PSO-005': 1, 'COS-PSA-001': 1, 'COS-PSA-003': 1, 'COS-HS-003': 3, 'COS-HS-006': 1, 'COS-HS-008': 2, 'COS-HS-002': 1 },
        workbook: { counts: [2, 2, 3, 2, 2, 0], unique: 8 }
    },
    '2026-Q3': {
        dom: { pso_start: '1', psa_start: '0', hs_start_q2w: '0', hs_intensification: '1', hs_reduction: '0', hs_discontinuation: '1', unique: '3' },
        patients: ['COS-PSO-004', 'COS-HS-007', 'COS-HS-009'],
        rowCounts: { 'COS-PSO-004': 1, 'COS-HS-007': 1, 'COS-HS-009': 1 },
        workbook: { counts: [1, 0, 0, 1, 0, 1], unique: 3 }
    },
    '2026-Q4': {
        dom: { pso_start: '0', psa_start: '0', hs_start_q2w: '0', hs_intensification: '0', hs_reduction: '0', hs_discontinuation: '1', unique: '1' },
        patients: ['COS-HS-010'],
        rowCounts: { 'COS-HS-010': 1 },
        workbook: { counts: [0, 0, 0, 0, 0, 1], unique: 1 }
    }
};
/* Hand-derived XLSX Detalle literals (8 explicit-fact columns) for the two
 * downloaded workbooks (Q2 representative, Q4 discontinuation-only). */
const EXPECTED_DETALLE_Q2 = [
    ['COS-PSO-002', 'PsO', 'PsO — nuevo inicio', '2026-04-01', 'q4w', '300 mg', 'q4w', 'No registrado'],
    ['COS-PSO-005', 'PsO', 'PsO — nuevo inicio', '2026-05-06', 'q4w', '300 mg', 'q4w', 'No registrado'],
    ['COS-PSA-001', 'PsA', 'PsA — nuevo inicio', '2026-04-10', 'q4w', '150 mg', 'q4w', 'No registrado'],
    ['COS-PSA-003', 'PsA', 'PsA — nuevo inicio', '2026-05-12', 'q4w', '300 mg', 'q4w', 'No registrado'],
    ['COS-HS-003', 'HS', 'HS — nuevo inicio q2w', '2026-04-02', 'q2w', '300 mg', 'q2w', 'No registrado'],
    ['COS-HS-006', 'HS', 'HS — nuevo inicio q2w', '2026-04-15', 'q2w', '300 mg', 'q2w', 'No registrado'],
    ['COS-HS-008', 'HS', 'HS — nuevo inicio q2w', '2026-05-04', 'q2w', '150 mg', 'q4w', 'No registrado'],
    ['COS-HS-003', 'HS', 'HS — intensificación q4w → q2w', '2026-05-15', 'q4w → q2w', '300 mg', 'q2w', 'No registrado'],
    ['COS-HS-002', 'HS', 'HS — intensificación q4w → q2w', '2026-06-30', 'q4w → q2w', '150 mg', 'q2w', 'No registrado'],
    ['COS-HS-003', 'HS', 'HS — reducción de frecuencia q2w → q4w', '2026-04-20', 'q2w → q4w', '300 mg', 'q2w', 'No registrado'],
    ['COS-HS-008', 'HS', 'HS — reducción de frecuencia q2w → q4w', '2026-06-10', 'q2w → q4w', '150 mg', 'q4w', 'No registrado']
];
const EXPECTED_DETALLE_Q4 = [
    ['COS-HS-010', 'HS', 'HS — discontinuación q2w', '2026-10-01', 'q2w', '150 mg', 'Discontinuado', 'Decisión clínica documentada']
];
const NEGATIVE_PATIENTS = ['COS-PSO-003', 'COS-PSA-002', 'COS-HS-004', 'COS-HS-005',
    'COS-HS-011', 'COS-HS-012', 'COS-HS-013', 'COS-HS-014'];
const CATEGORY_LABELS = [
    'PsO — nuevos inicios', 'PsA — nuevos inicios',
    'HS — nuevos inicios q2w', 'HS — intensificaciones q4w → q2w',
    'HS — reducción de frecuencia q2w → q4w', 'HS — discontinuaciones q2w'
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
    const expectedRows = Object.values(expected.rowCounts).reduce((sum, n) => sum + n, 0);
    assert.equal(state.detail_row_count, expectedRows, 'detail rows justify every count');
    const detailText = await page.locator('#informes-detail-table').innerText();
    for (const patientId of expected.patients) {
        assert.ok(detailText.includes(patientId), `${quarter} detail must include ${patientId}`);
    }
    for (const patientId of NEGATIVE_PATIENTS) {
        assert.ok(!detailText.includes(patientId), `${quarter} detail must exclude negative witness ${patientId}`);
    }
    const categoryLabels = await page.evaluate(() =>
        [...document.querySelectorAll('#informes-kpis .informes-kpi-label')].map(node => node.textContent.trim()));
    assert.deepEqual(categoryLabels.slice(0, 6), CATEGORY_LABELS);
    /* Six KPI cards + the unique total card, rendered by the untouched
     * renderer looping report.categories. */
    const cardCount = await page.evaluate(() =>
        document.querySelectorAll('#informes-kpis [data-informes-kpi]').length);
    assert.equal(cardCount, 7, 'six category cards plus the unique-patient card');
    return domKpis;
}

function normRow(row) {
    const copy = row.map(cell => (cell === undefined ? '' : cell));
    while (copy.length && copy[copy.length - 1] === '') copy.pop();
    return copy;
}

async function downloadWorkbook(page, buttonSelector, expectedFilename) {
    const downloadPromise = page.waitForEvent('download');
    await page.locator(buttonSelector).click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), expectedFilename);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const xlsxBuffer = Buffer.concat(chunks);
    assert.equal(xlsxBuffer.subarray(0, 2).toString('latin1'), 'PK', 'download is a real xlsx zip container');
    return XLSX.read(new Uint8Array(xlsxBuffer), { type: 'array' });
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
    assert.deepEqual(quarters, ['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'], 'selector exposes the discontinuation-only quarter too');

    /* Q1 view: computed from the fixture. */
    await assertQuarterView(page, '2026-Q1');

    /* Change quarter: counts/detail change from the fixture. */
    await page.locator('#informes-quarter-select').selectOption('2026-Q2');
    const q2DomKpis = await assertQuarterView(page, '2026-Q2');

    /* All six categories demonstrated across periods: Q3 differs too. */
    await page.locator('#informes-quarter-select').selectOption('2026-Q3');
    await assertQuarterView(page, '2026-Q3');

    /* Discontinuation-only quarter: selector + computed row + unique total. */
    await page.locator('#informes-quarter-select').selectOption('2026-Q4');
    await assertQuarterView(page, '2026-Q4');

    /* Q4 REAL .xlsx: the discontinuation-only quarter exports its row. */
    await page.locator('#informes-quarter-select').selectOption('2026-Q4');
    const q4Workbook = await downloadWorkbook(page, '#informes-download-xlsx', /^informe_trimestral_cosentyx_2026-Q4\.xlsx$/);
    assert.deepEqual(q4Workbook.SheetNames, ['Resumen', 'Detalle']);
    const q4Resumen = XLSX.utils.sheet_to_json(q4Workbook.Sheets['Resumen'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(q4Resumen[1], ['Periodo', '2026-Q4']);
    const q4HeaderIndex = q4Resumen.findIndex(row => row[0] === 'Categoría' && row[1] === 'Pacientes');
    assert.deepEqual(q4Resumen.slice(q4HeaderIndex + 1, q4HeaderIndex + 7),
        CATEGORY_LABELS.map((label, index) => [label, EXPECTED['2026-Q4'].workbook.counts[index]]));
    assert.ok(q4Resumen.some(row => row[0] === 'Total pacientes únicos incluidos' && row[1] === 1));
    const q4Detalle = XLSX.utils.sheet_to_json(q4Workbook.Sheets['Detalle'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(q4Detalle[0], ['Paciente (sintético)', 'Patología', 'Tipo de caso', 'Fecha del hecho que incluye',
        'Régimen explícito', 'Presentación explícita', 'Estado actual explícito', 'Motivo registrado']);
    assert.deepEqual(q4Detalle.slice(1), EXPECTED_DETALLE_Q4);
    /* Truthfulness: the discontinued patient never reads active; the
     * explicit fictitious demo reason is exported verbatim. */
    assert.equal(q4Detalle[1][6], 'Discontinuado');
    assert.equal(q4Detalle[1][7], 'Decisión clínica documentada');

    /* Back to Q2: download a REAL .xlsx and validate it against the visible UI model. */
    await page.locator('#informes-quarter-select').selectOption('2026-Q2');
    await assertQuarterView(page, '2026-Q2');
    const workbook = await downloadWorkbook(page, '#informes-download-xlsx', /^informe_trimestral_cosentyx_2026-Q2\.xlsx$/);
    assert.deepEqual(workbook.SheetNames, ['Resumen', 'Detalle']);
    const resumen = XLSX.utils.sheet_to_json(workbook.Sheets['Resumen'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(resumen[0], ['Informe trimestral Cosentyx']);
    assert.deepEqual(resumen[1], ['Periodo', '2026-Q2']);
    assert.deepEqual(resumen[2], ['Inicio', '2026-04-01']);
    assert.deepEqual(resumen[3], ['Fin', '2026-06-30']);
    assert.ok(resumen.some(row => row[0] === 'Procedencia' && row[1] === 'Datos sintéticos específicos del informe'));
    const headerIndex = resumen.findIndex(row => row[0] === 'Categoría' && row[1] === 'Pacientes');
    const categoryRows = resumen.slice(headerIndex + 1, headerIndex + 7);
    assert.deepEqual(categoryRows, CATEGORY_LABELS.map((label, index) => [label, EXPECTED['2026-Q2'].workbook.counts[index]]),
        'Resumen counts must match the hand-derived expectation');
    assert.ok(resumen.some(row => row[0] === 'Total pacientes únicos incluidos' && row[1] === 8),
        'unique total (8), not the blind sum (11)');
    /* Same computed result as the visible UI. */
    const domCounts = [q2DomKpis.pso_start, q2DomKpis.psa_start, q2DomKpis.hs_start_q2w,
        q2DomKpis.hs_intensification, q2DomKpis.hs_reduction, q2DomKpis.hs_discontinuation].map(Number);
    assert.deepEqual(categoryRows.map(row => row[1]), domCounts, 'workbook counts must equal the visible UI counts');
    assert.equal(resumen.find(row => row[0] === 'Total pacientes únicos incluidos')[1], Number(q2DomKpis.unique));

    const detalle = XLSX.utils.sheet_to_json(workbook.Sheets['Detalle'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(detalle[0], ['Paciente (sintético)', 'Patología', 'Tipo de caso', 'Fecha del hecho que incluye',
        'Régimen explícito', 'Presentación explícita', 'Estado actual explícito', 'Motivo registrado']);
    assert.equal(detalle.length - 1, 11, 'Detalle rows justify the counts');
    assert.deepEqual(detalle.slice(1), EXPECTED_DETALLE_Q2, 'Detalle matches the hand-derived literals, not a fresh model call');

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
    console.log('QA Chromium: Informes switch OK; quarters Q1/Q2/Q3/Q4 differ from fixture (Q4 discontinuation-only); 6 categories + unique shown; real XLSX Q2+Q4 Resumen+Detalle match hand-derived literals and UI model (Q2 unique=8, not blind sum 11; Q4 unique=1); population CSV filtered export OK; console.error=0 pageerror=0');
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
