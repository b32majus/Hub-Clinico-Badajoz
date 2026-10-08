#!/usr/bin/env node
/* #579 Informe de utilización y dosis — Kisqali + #594 entrada neutral —
 * supported-browser QA through the real UI.
 *
 * Journey: open Estadísticas normally (demo session), enter Informes through
 * the supported switcher and confirm the NEUTRAL landing (no precomputed
 * Cosentyx, Ver reporte disabled, getState() {report:null}), reach Cosentyx
 * through Fármaco → Tipo → Período → «Ver reporte» and confirm its accepted
 * Q1/Q2/Q4 views still work, switch Fármaco to Kisqali (stale Cosentyx
 * cleared, fresh confirm required), walk Mensual → Trimestral → Anual →
 * Histórico with fixture-derived periods, verify KPIs, the rendered
 * patient-table cells and raw expectations against hand-derived fixture
 * values (normalized demo: only explicit 200/400/600, every cycle
 * evaluable), open 'Ver ciclos' raw traceability (coherent explicit
 * boundary changes, stable explicit doses, presentation independence),
 * download a REAL .xlsx and validate Resumen + Ciclos against the
 * hand-derived expectation and the Pacientes sheet against the visible
 * rendered patient cells (not a fresh model call), switch back to Cosentyx
 * and run its accepted journey, prove view-switch preservation, return to
 * the population analysis and confirm the filtered-cohort CSV export still
 * downloads. Supported interactions only; no DOM tampering;
 * console.error=0 / pageerror=0.
 */
import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor/sheetjs/xlsx.full.min.js'));
require(path.join(ROOT, 'scripts/farmacia_kisqali_informe_fixture.js'));
require(path.join(ROOT, 'scripts/farmacia_kisqali_informe_model.js'));
const APP_PREFIX = String(process.env.FH_APP_PREFIX || '').replace(/^\/+|\/+$/g, '');

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
            return createRequire(path.join(nodeModules, '__fh_kisqali_informe_loader.cjs'))('playwright');
        }
    }
    try {
        const globalRoot = require('node:child_process').execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
        if (globalRoot && existsSync(path.join(globalRoot, 'playwright', 'package.json'))) {
            return createRequire(path.join(globalRoot, 'playwright', 'package.json'))('playwright');
        }
    } catch { /* fall through to the explicit guidance below */ }
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_kisqali_informe_browser_check.mjs');
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

/* Hand-derived Kisqali expectations per window (same literals as the
 * deterministic checker's hand arithmetic — normalized demo: only
 * 200/400/600 explicit, every cycle evaluable). */
const EXPECTED_KISQALI = {
    'mensual|2026-06': {
        window: 'Mensual — 2026-06',
        dom: { patients: '3', closing_200: '2', closing_400: '1', closing_600: '0', closing_otra: '0', cohort_mean: '266.67 mg', patients_with_change: '1', coverage: '3/3 · 100 %' }
    },
    'mensual|2025-08': {
        window: 'Mensual — 2025-08',
        dom: { patients: '1', closing_200: '0', closing_400: '0', closing_600: '1', closing_otra: '0', cohort_mean: '600 mg', patients_with_change: '0', coverage: '1/1 · 100 %' }
    },
    'trimestral|2026-Q2': {
        window: 'Trimestral — 2026-Q2',
        dom: { patients: '4', closing_200: '2', closing_400: '2', closing_600: '0', closing_otra: '0', cohort_mean: '314.29 mg', patients_with_change: '3', coverage: '7/7 · 100 %' }
    },
    'trimestral|2025-Q3': {
        window: 'Trimestral — 2025-Q3',
        dom: { patients: '1', closing_200: '0', closing_400: '1', closing_600: '0', closing_otra: '0', cohort_mean: '533.33 mg', patients_with_change: '1', coverage: '3/3 · 100 %' }
    },
    'anual|2026': {
        window: 'Anual — 2026',
        dom: { patients: '5', closing_200: '2', closing_400: '2', closing_600: '1', closing_otra: '0', cohort_mean: '415.38 mg', patients_with_change: '3', coverage: '13/13 · 100 %' }
    },
    'anual|2025': {
        window: 'Anual — 2025',
        dom: { patients: '2', closing_200: '0', closing_400: '2', closing_600: '0', closing_otra: '0', cohort_mean: '444.44 mg', patients_with_change: '1', coverage: '9/9 · 100 %' }
    },
    'historico|historico': {
        window: 'Histórico (2025-01 → 2026-06)',
        dom: { patients: '7', closing_200: '2', closing_400: '4', closing_600: '1', closing_otra: '0', cohort_mean: '427.27 mg', patients_with_change: '4', coverage: '22/22 · 100 %' }
    }
};

/* Hand-derived EXPECTED VISIBLE PATIENT-TABLE CELLS per window (independent
 * of getState()/model output): each row is the rendered
 * #kisqali-patients-table row [id, presentation, initial dose, final dose,
 * explicit changes, observed cycles, evaluable cycles, mean] exactly as the
 * UI formats it ('X mg' / 'Desconocida'). Derived by hand from the fixture
 * contract, not from the implementation. */
const EXPECTED_KISQALI_PATIENT_ROWS = {
    'mensual|2026-06': [
        ['KIS-003', '200 mg - 21', '200 mg', '200 mg', '0', '1', '1', '200 mg'],
        ['KIS-006', '200 mg - 63', '400 mg', '400 mg', '1', '1', '1', '400 mg'],
        ['KIS-007', '200 mg - 21', '200 mg', '200 mg', '0', '1', '1', '200 mg']
    ],
    'trimestral|2026-Q2': [
        ['KIS-003', '200 mg - 21', '200 mg', '200 mg', '1', '3', '3', '200 mg'],
        ['KIS-004', '200 mg - 21', '400 mg', '400 mg', '1', '1', '1', '400 mg'],
        ['KIS-006', '200 mg - 63', '600 mg', '400 mg', '1', '2', '2', '500 mg'],
        ['KIS-007', '200 mg - 21', '200 mg', '200 mg', '0', '1', '1', '200 mg']
    ],
    'anual|2026': [
        ['KIS-003', '200 mg - 21', '600 mg', '200 mg', '2', '6', '6', '333.33 mg'],
        ['KIS-004', '200 mg - 21', '600 mg', '400 mg', '1', '2', '2', '500 mg'],
        ['KIS-005', '200 mg - 21', '600 mg', '600 mg', '0', '2', '2', '600 mg'],
        ['KIS-006', '200 mg - 63', '600 mg', '400 mg', '1', '2', '2', '500 mg'],
        ['KIS-007', '200 mg - 21', '200 mg', '200 mg', '0', '1', '1', '200 mg']
    ],
    'historico|historico': [
        ['KIS-001', '200 mg - 63', '400 mg', '400 mg', '0', '6', '6', '400 mg'],
        ['KIS-002', '200 mg - 21', '600 mg', '400 mg', '1', '3', '3', '533.33 mg'],
        ['KIS-003', '200 mg - 21', '600 mg', '200 mg', '2', '6', '6', '333.33 mg'],
        ['KIS-004', '200 mg - 21', '600 mg', '400 mg', '1', '2', '2', '500 mg'],
        ['KIS-005', '200 mg - 21', '600 mg', '600 mg', '0', '2', '2', '600 mg'],
        ['KIS-006', '200 mg - 63', '600 mg', '400 mg', '1', '2', '2', '500 mg'],
        ['KIS-007', '200 mg - 21', '200 mg', '200 mg', '0', '1', '1', '200 mg']
    ]
};

/* Cosentyx reachability expectations (#576 + #593 six categories).
 *
 * Hand-derived from the explicit synthetic Cosentyx witness list (never from
 * computeReport/listQuarters/DOM):
 * - Q1: PSO-001 disp 03-31 (pso 1); HS-001 disp 02-01 q2w + HS-009 disp 02-10
 *   q2w (hs_start 2); no q4w->q2w move, no q2w->q4w move, no dated q2w
 *   discontinuation in Q1 (int/reduction/disc 0); unique {PSO-001, HS-001,
 *   HS-009} = 3.
 * - Q2: PSO-002 + PSO-005 (pso 2); PSA-001 + PSA-003 (psa 2); HS-003 + HS-006
 *   + HS-008 starts (hs_start 3); HS-003 05-15 + HS-002 06-30 q4w->q2w
 *   (int 2); HS-003 04-20 + HS-008 06-10 q2w->q4w (red 2); no dated q2w
 *   discontinuation (disc 0); unique 8.
 * - Quarter selector: Q1/Q2/Q3 anchored by dispensings/movements plus Q4
 *   anchored ONLY by the explicit HS-010 discontinued_at 2026-10-01
 *   (no Q4 dispensing or movement exists).
 * - Q4: ONLY HS-010 discontinuation (disc 1, everything else 0); unique 1. */
const EXPECTED_COSENTYX = {
    '2026-Q1': { dom: { pso_start: '1', psa_start: '0', hs_start_q2w: '2', hs_intensification: '0', hs_reduction: '0', hs_discontinuation: '0', unique: '3' } },
    '2026-Q2': { dom: { pso_start: '2', psa_start: '2', hs_start_q2w: '3', hs_intensification: '2', hs_reduction: '2', hs_discontinuation: '0', unique: '8' } },
    '2026-Q4': { dom: { pso_start: '0', psa_start: '0', hs_start_q2w: '0', hs_intensification: '0', hs_reduction: '0', hs_discontinuation: '1', unique: '1' } }
};

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

async function readKisqaliDomKpis(page) {
    return page.evaluate(() => Object.fromEntries(
        [...document.querySelectorAll('#kisqali-kpis [data-kisqali-kpi]')]
            .map(node => [node.dataset.kisqaliKpi, node.querySelector('.informes-kpi-value').textContent.trim()])));
}

/* The RENDERED patient-table cells, read from the DOM like a user sees them
 * (first 8 cells of each patient row; the 9th is the 'Ver ciclos' action). */
async function readKisqaliPatientRows(page) {
    return page.evaluate(() => [...document.querySelectorAll('#kisqali-patients-table tbody tr[data-kisqali-patient]')]
        .map(row => [...row.querySelectorAll('td')].slice(0, 8).map(cell => cell.textContent.trim())));
}

/* Visible cell ('400 mg') → workbook cell (400) per Pacientes column. */
function visiblePatientRowToSheetRow(cells) {
    const doseCell = cell => cell === 'Desconocida' ? 'Desconocida' : Number(cell.replace(/ mg$/, ''));
    const meanCell = cell => cell === 'Desconocida' ? 'Desconocida' : cell.replace(/ mg$/, '');
    return [cells[0], cells[1], doseCell(cells[2]), doseCell(cells[3]),
        Number(cells[4]), Number(cells[5]), Number(cells[6]), meanCell(cells[7])];
}

async function assertKisqaliWindow(page, mode, period) {
    const key = `${mode}|${period === null ? 'historico' : period}`;
    const expected = EXPECTED_KISQALI[key];
    const domKpis = await readKisqaliDomKpis(page);
    assert.deepEqual(domKpis, expected.dom, `${key} Kisqali KPI values must match the hand-derived fixture expectation`);
    const windowLabel = await page.locator('#kisqali-window-label').innerText();
    assert.equal(windowLabel, expected.window);
    const state = await page.evaluate(() => window.FarmaciaEstadisticasInformes.getState());
    assert.equal(state.report, 'kisqali');
    assert.equal(state.kisqali.mode, mode);
    assert.equal(state.kisqali.period, period === null ? 'historico' : period);
    assert.equal(state.kisqali.patient_count, Number(expected.dom.patients));
    assert.equal(state.kisqali.cohort_mean.display + ' mg', expected.dom.cohort_mean);
    assert.equal(state.kisqali.coverage.numerator + '/' + state.kisqali.coverage.denominator
        + ' · ' + state.kisqali.coverage.percentage_display, expected.dom.coverage);
    assert.equal(state.kisqali.patients_with_change_count, Number(expected.dom.patients_with_change));
    /* Rendered patient-table cells must match the hand-derived expectation
     * for this window (not just the state object). */
    const expectedPatients = EXPECTED_KISQALI_PATIENT_ROWS[key];
    if (expectedPatients) {
        assert.deepEqual(await readKisqaliPatientRows(page), expectedPatients,
            `${key} rendered patient-table cells must match the hand-derived fixture expectation`);
    }
    return { domKpis, state };
}

/* #594 neutral landing: nothing selected, nothing computed, no enabled
 * download, stable {report:null} signal. */
async function assertNeutral(page) {
    assert.match(await page.locator('#informes-title').innerText(), /Reportes farmacéuticos/);
    assert.match(await page.locator('#informes-synthetic-notice').innerText(), /Datos sintéticos/);
    assert.equal(await page.locator('#informes-drug-select').inputValue(), '', 'no drug auto-selected');
    assert.equal(await page.locator('#informes-report-select').inputValue(), '', 'no type selected');
    assert.ok(await page.locator('#informes-view-report').isDisabled(), 'Ver reporte disabled until the selection is complete');
    assert.ok(await page.locator('#informes-download-xlsx').isDisabled(), 'no enabled Cosentyx XLSX while neutral');
    assert.ok(await page.locator('#kisqali-download-xlsx').isDisabled(), 'no enabled Kisqali XLSX while neutral');
    assert.ok(await page.locator('#informes-cosentyx-panel').isHidden(), 'no Cosentyx report rendered while neutral');
    assert.ok(await page.locator('#informes-kisqali-panel').isHidden(), 'no Kisqali report rendered while neutral');
    assert.deepEqual(await page.evaluate(() => window.FarmaciaEstadisticasInformes.getState()), { report: null },
        'neutral getState() must not leak stale currentReport data');
}

async function assertNoPageOverflow(page, label) {
    const measured = await page.evaluate(() => ({
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.documentElement.clientWidth
    }));
    assert.ok(measured.scrollWidth <= measured.clientWidth,
        `${label}: no page-level horizontal overflow (scrollWidth=${measured.scrollWidth} clientWidth=${measured.clientWidth})`);
    return measured;
}

try {
    const page = await context.newPage();
    await page.goto(appUrl('farmacia_estadisticas.html'), { waitUntil: 'domcontentloaded' });
    await waitForMode(page, 'demo', 3);

    /* Population surface is the default view; Informes hidden. */
    assert.ok(await page.locator('#kpi-section').isVisible(), 'population analysis visible by default');
    assert.ok(!(await page.locator('#informes-section').isVisible()), 'Informes hidden by default');

    /* Enter Informes through the supported switcher: neutral landing. */
    await page.locator('#informes-view-btn').click();
    await page.waitForFunction(() => document.querySelector('main.main-content').classList.contains('farmacia-informes-mode'));
    assert.ok(await page.locator('#informes-section').isVisible(), 'Informes visible after supported switch');
    assert.ok(!(await page.locator('#kpi-section').isVisible()), 'population analysis hidden inside Informes');
    await assertNeutral(page);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'informes-view-btn', 'keyboard focus preserved on the view switcher');
    assert.equal(await page.locator('#informes-view-btn').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#population-view-btn').getAttribute('aria-pressed'), 'false');

    /* Cosentyx remains reachable through the confirm gate (no longer a default). */
    await page.locator('#informes-drug-select').selectOption('cosentyx');
    const cosentyxTypeOptions = await page.locator('#informes-report-select option').evaluateAll(options => options.map(option => [option.value, option.textContent]));
    assert.deepEqual(cosentyxTypeOptions, [['', 'Seleccionar tipo…'], ['cosentyx', 'Trimestral de movimientos clínicos']],
        'Cosentyx exposes exactly its single supported type');
    await page.locator('#informes-report-select').selectOption('cosentyx');
    const quarters = await page.locator('#informes-quarter-select option').evaluateAll(options => options.map(option => option.value));
    assert.deepEqual(quarters, ['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'], 'Cosentyx quarter selector with the discontinuation-only quarter');
    assert.equal(await page.locator('#informes-quarter-select').inputValue(), '2026-Q4',
        'period defaults to the latest fixture-eligible value, never the wall clock');
    assert.deepEqual(await page.evaluate(() => window.FarmaciaEstadisticasInformes.getState()), { report: null },
        'no Cosentyx compute before Ver reporte');
    await page.locator('#informes-view-report').click();
    assert.match(await page.locator('#informes-title').innerText(), /Informe trimestral Cosentyx/);
    assert.ok(await page.locator('#informes-cosentyx-panel').isVisible(), 'Cosentyx panel visible after confirmation');
    assert.ok(!(await page.locator('#informes-kisqali-panel').isVisible()), 'Kisqali panel hidden inside Cosentyx report');

    /* Cosentyx accepted views, reached via selection + period refresh. */
    assert.deepEqual(await readDomKpis(page), EXPECTED_COSENTYX['2026-Q4'].dom,
        'confirmed Cosentyx report computes the default-latest quarter');
    await page.locator('#informes-quarter-select').selectOption('2026-Q1');
    assert.deepEqual(await readDomKpis(page), EXPECTED_COSENTYX['2026-Q1'].dom);
    await page.locator('#informes-quarter-select').selectOption('2026-Q2');
    assert.deepEqual(await readDomKpis(page), EXPECTED_COSENTYX['2026-Q2'].dom);
    /* The discontinuation-only quarter is selectable with its computed row. */
    await page.locator('#informes-quarter-select').selectOption('2026-Q4');
    assert.deepEqual(await readDomKpis(page), EXPECTED_COSENTYX['2026-Q4'].dom);

    /* Fármaco switch to Kisqali: Cosentyx result cleared, fresh confirm required. */
    await page.locator('#informes-drug-select').selectOption('kisqali');
    assert.deepEqual(await page.evaluate(() => window.FarmaciaEstadisticasInformes.getState()), { report: null },
        'switching Fármaco clears the Cosentyx result immediately');
    assert.ok(await page.locator('#informes-cosentyx-panel').isHidden(), 'Cosentyx panel hidden after the Fármaco switch');
    assert.ok(await page.locator('#informes-download-xlsx').isDisabled(), 'stale Cosentyx XLSX cleared');
    assert.ok(await page.locator('#informes-view-report').isDisabled(), 'fresh Ver reporte required after a Fármaco change');
    const kisqaliTypeOptions = await page.locator('#informes-report-select option').evaluateAll(options => options.map(option => [option.value, option.textContent]));
    assert.deepEqual(kisqaliTypeOptions, [['', 'Seleccionar tipo…'], ['kisqali', 'Utilización y dosis']],
        'Kisqali exposes exactly its single supported type');

    /* Select Kisqali through Fármaco → Tipo, then confirm. */
    await page.locator('#informes-report-select').selectOption('kisqali');
    await page.waitForFunction(() => !document.getElementById('informes-kisqali-controls').hidden);
    assert.deepEqual(await page.evaluate(() => window.FarmaciaEstadisticasInformes.getState()), { report: null },
        'no Kisqali compute before Ver reporte');
    await page.locator('#informes-view-report').click();
    await page.waitForFunction(() => !document.getElementById('informes-kisqali-panel').hidden);
    assert.match(await page.locator('#informes-title').innerText(), /Informe de utilización y dosis — Kisqali/);
    assert.ok(await page.locator('#informes-kisqali-panel').isVisible(), 'Kisqali panel visible');
    assert.ok(!(await page.locator('#informes-cosentyx-panel').isVisible()), 'Cosentyx panel hidden inside Kisqali report');
    const provenance = await page.locator('#kisqali-synthetic-notice').innerText();
    assert.match(provenance, /Datos sintéticos específicos del informe/);
    assert.match(provenance, /Calculada exclusivamente a partir de dosis y ciclos explícitamente registrados\./);

    /* Mensual (default mode, latest fixture month). */
    assert.deepEqual(await assertKisqaliWindow(page, 'mensual', '2026-06').then(r => r.domKpis),
        EXPECTED_KISQALI['mensual|2026-06'].dom);
    /* Change period within Mensual: values change from the fixture. */
    await page.locator('#kisqali-period-select').selectOption('2025-08');
    await assertKisqaliWindow(page, 'mensual', '2025-08');

    /* Trimestral (defaults to latest fixture quarter). */
    await page.locator('#kisqali-mode-select').selectOption('trimestral');
    await assertKisqaliWindow(page, 'trimestral', '2026-Q2');
    await page.locator('#kisqali-period-select').selectOption('2025-Q3');
    await assertKisqaliWindow(page, 'trimestral', '2025-Q3');

    /* Anual (defaults to latest fixture year). */
    await page.locator('#kisqali-mode-select').selectOption('anual');
    const anualState = await assertKisqaliWindow(page, 'anual', '2026');
    await page.locator('#kisqali-period-select').selectOption('2025');
    await assertKisqaliWindow(page, 'anual', '2025');
    await page.locator('#kisqali-period-select').selectOption('2026');

    /* Histórico: no period selector, covers all explicit cycles through the
     * fixture maximum. */
    await page.locator('#kisqali-mode-select').selectOption('historico');
    const historicoState = await assertKisqaliWindow(page, 'historico', null);
    assert.ok(await page.locator('#kisqali-period-select').isHidden(), 'Histórico has no period selector');
    assert.equal(historicoState.state.kisqali.observed_cycle_count, 22);
    assert.equal(historicoState.state.kisqali.evaluable_cycle_count, 22);

    /* Patient detail: normalized demo — every cycle explicit 200/400/600, all evaluable. */
    const patientRows = historicoState.state.kisqali.patients;
    assert.deepEqual(patientRows.map(p => p.patient_id),
        ['KIS-001', 'KIS-002', 'KIS-003', 'KIS-004', 'KIS-005', 'KIS-006', 'KIS-007']);
    const byId = id => patientRows.find(p => p.patient_id === id);
    assert.equal(byId('KIS-001').mean_display, '400');
    assert.equal(byId('KIS-002').mean_display, '533.33');
    assert.equal(byId('KIS-003').mean_display, '333.33');
    assert.equal(byId('KIS-004').final_dose, 400, 'coherent boundary reduction closes at 400');
    assert.equal(byId('KIS-004').change_count, 1, 'explicit boundary change counted');
    assert.equal(byId('KIS-005').final_dose, 600, 'stable explicit 600 preserved');
    assert.equal(byId('KIS-006').change_count, 1, 'explicit 600->400 boundary change counted');
    assert.equal(byId('KIS-007').mean_display, '200');

    /* Ver ciclos: raw traceability for coherent explicit boundary changes (no
     * unknown/mid-cycle/300 rows on the normalized demo surface). */
    await page.locator('[data-kisqali-ciclos-toggle="KIS-003"]').click();
    await page.waitForFunction(() => !document.getElementById('kisqali-ciclos-KIS-003').hidden);
    const kis003Ciclos = await page.locator('#kisqali-ciclos-KIS-003').innerText();
    for (const month of ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']) {
        assert.ok(kis003Ciclos.includes(month), `KIS-003 ciclos include ${month}`);
    }
    assert.ok(kis003Ciclos.includes('600 → 400 mg (efectivo 2026-02-01)'));
    assert.ok(kis003Ciclos.includes('400 → 200 mg (efectivo 2026-04-01)'));
    const kis003StateRow = byId('KIS-003');
    assert.equal(kis003StateRow.change_count, 2, 'raw cycles justify the explicit change count');
    assert.equal(kis003StateRow.observed_count, 6);
    assert.equal(kis003StateRow.evaluable_count, 6);

    /* Coherent boundary reductions and stable explicit doses through the UI. */
    await page.locator('[data-kisqali-ciclos-toggle="KIS-004"]').click();
    const kis004Ciclos = await page.locator('#kisqali-ciclos-KIS-004').innerText();
    assert.ok(kis004Ciclos.includes('600 mg'), 'explicit 600 start preserved in raw traceability');
    assert.ok(kis004Ciclos.includes('600 → 400 mg (efectivo 2026-04-01)'), 'explicit boundary change shown');
    assert.ok(!kis004Ciclos.includes('Desconocida'), 'no unknown dose on the normalized demo surface');
    await page.locator('[data-kisqali-ciclos-toggle="KIS-006"]').click();
    const kis006Ciclos = await page.locator('#kisqali-ciclos-KIS-006').innerText();
    assert.ok(kis006Ciclos.includes('600 → 400 mg (efectivo 2026-06-01)'), 'explicit boundary change shown');
    await page.locator('[data-kisqali-ciclos-toggle="KIS-005"]').click();
    const kis005Ciclos = await page.locator('#kisqali-ciclos-KIS-005').innerText();
    assert.ok(kis005Ciclos.includes('600 mg'), 'stable explicit 600 preserved verbatim in raw rows');
    assert.ok(!kis005Ciclos.includes('300 mg'), 'no synthetic 300 mg on the normalized demo surface');
    assert.ok(kis005Ciclos.includes('200 mg - 63') && kis005Ciclos.includes('200 mg - 21'),
        'presentations 21/63 preserved verbatim and independent of dose');

    /* Download a REAL .xlsx (Anual 2026) and validate it against the visible
     * UI model and the hand-derived expectation. */
    await page.locator('#kisqali-mode-select').selectOption('anual');
    await page.waitForFunction(() => window.FarmaciaEstadisticasInformes.getState().kisqali.period === '2026');
    const anualDom = await readKisqaliDomKpis(page);
    /* Capture the VISIBLE patient cells for this exact window before
     * downloading; the workbook must match them, not a fresh model call. */
    const anualVisiblePatients = await readKisqaliPatientRows(page);
    assert.deepEqual(anualVisiblePatients, EXPECTED_KISQALI_PATIENT_ROWS['anual|2026']);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#kisqali-download-xlsx').click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /^informe_kisqali_utilizacion_dosis_anual_2026\.xlsx$/);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const xlsxBuffer = Buffer.concat(chunks);
    assert.equal(xlsxBuffer.subarray(0, 2).toString('latin1'), 'PK', 'download is a real xlsx zip container');

    const workbook = XLSX.read(new Uint8Array(xlsxBuffer), { type: 'array' });
    assert.deepEqual(workbook.SheetNames, ['Resumen', 'Pacientes', 'Ciclos']);
    const normRow = row => {
        const copy = row.map(cell => (cell === undefined ? '' : cell));
        while (copy.length && copy[copy.length - 1] === '') copy.pop();
        return copy;
    };
    const resumen = XLSX.utils.sheet_to_json(workbook.Sheets['Resumen'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(resumen[0], ['Informe de utilización y dosis — Kisqali']);
    assert.deepEqual(resumen[1], ['Modo de ventana', 'Anual']);
    assert.deepEqual(resumen[2], ['Periodo', '2026']);
    assert.ok(resumen.some(row => row[0] === 'Procedencia'
        && String(row[1]).includes('Datos sintéticos específicos del informe')
        && String(row[1]).includes('farmacia_kisqali_informe_fixture_v1')));
    assert.ok(resumen.some(row => row[0] === 'Cálculo'
        && row[1] === 'Calculada exclusivamente a partir de dosis y ciclos explícitamente registrados.'));
    const resumenValue = label => resumen.find(row => row[0] === label)[1];
    assert.equal(resumenValue('Pacientes con ≥1 ciclo observado'), 5);
    assert.equal(resumenValue('Cierre 200 mg'), 2);
    assert.equal(resumenValue('Cierre 400 mg'), 2);
    assert.equal(resumenValue('Cierre 600 mg'), 1);
    assert.equal(resumenValue('Cierre otra/desconocida'), 0);
    assert.equal(resumenValue('Dosis media de régimen (cohorte, ponderada por ciclos con dosis evaluable)'), '415.38');
    assert.equal(resumenValue('Dosis media — numerador (mg)'), 5400);
    assert.equal(resumenValue('Dosis media — denominador (ciclos)'), 13);
    assert.equal(resumenValue('Pacientes con ≥1 cambio de dosis explícito y evaluable'), 3);
    assert.equal(resumenValue('Cobertura de dosis explícita — numerador (ciclos)'), 13);
    assert.equal(resumenValue('Cobertura de dosis explícita — denominador (ciclos observados)'), 13);
    assert.equal(resumenValue('Cobertura de dosis explícita — porcentaje'), '100 %');
    /* Workbook equals the SAME computed result shown in the UI. */
    assert.equal(String(resumenValue('Pacientes con ≥1 ciclo observado')), anualDom.patients);
    assert.equal(String(resumenValue('Cierre 200 mg')), anualDom.closing_200);
    assert.equal(String(resumenValue('Cierre 400 mg')), anualDom.closing_400);
    assert.equal(String(resumenValue('Cierre 600 mg')), anualDom.closing_600);
    assert.equal(String(resumenValue('Cierre otra/desconocida')), anualDom.closing_otra);
    assert.equal(resumenValue('Dosis media de régimen (cohorte, ponderada por ciclos con dosis evaluable)') + ' mg', anualDom.cohort_mean);
    assert.equal(String(resumenValue('Pacientes con ≥1 cambio de dosis explícito y evaluable')), anualDom.patients_with_change);
    assert.equal(resumenValue('Cobertura de dosis explícita — numerador (ciclos)') + '/'
        + resumenValue('Cobertura de dosis explícita — denominador (ciclos observados)')
        + ' · ' + resumenValue('Cobertura de dosis explícita — porcentaje'), anualDom.coverage);

    const pacientes = XLSX.utils.sheet_to_json(workbook.Sheets['Pacientes'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(pacientes[0], [
        'Paciente (sintético)', 'Presentación del último ciclo observado',
        'Dosis inicial (ventana)', 'Dosis final (ventana)', 'Cambios explícitos',
        'Ciclos observados', 'Ciclos con dosis evaluable', 'Dosis media (mg)'
    ]);
    assert.deepEqual(pacientes.slice(1), [
        ['KIS-003', '200 mg - 21', 600, 200, 2, 6, 6, '333.33'],
        ['KIS-004', '200 mg - 21', 600, 400, 1, 2, 2, '500'],
        ['KIS-005', '200 mg - 21', 600, 600, 0, 2, 2, '600'],
        ['KIS-006', '200 mg - 63', 600, 400, 1, 2, 2, '500'],
        ['KIS-007', '200 mg - 21', 200, 200, 0, 1, 1, '200']
    ]);
    const ciclos = XLSX.utils.sheet_to_json(workbook.Sheets['Ciclos'], { header: 1, defval: '' }).map(normRow);
    assert.equal(ciclos.length - 1, 13, 'Ciclos rows = observed cycles in window');
    const kis007Row = ciclos.find(row => row[0] === 'KIS-007');
    assert.deepEqual(kis007Row.slice(0, 5), ['KIS-007', '2026-06', '2026-06-01', 200, 'explicita']);
    assert.equal(kis007Row[7], 'Sí');
    const kis004Row = ciclos.find(row => row[0] === 'KIS-004' && row[1] === '2026-04');
    assert.deepEqual(kis004Row.slice(0, 7), ['KIS-004', '2026-04', '2026-04-01', 400, 'explicita', '200 mg - 21', '600 → 400 mg (efectivo 2026-04-01)']);
    assert.equal(kis004Row[7], 'Sí');
    const kis006Row = ciclos.find(row => row[0] === 'KIS-006' && row[1] === '2026-06');
    assert.deepEqual(kis006Row.slice(0, 7), ['KIS-006', '2026-06', '2026-06-01', 400, 'explicita', '200 mg - 63', '600 → 400 mg (efectivo 2026-06-01)']);
    /* The workbook Pacientes sheet equals the VISIBLE rendered patient-table
     * cells of the same window (no second calculation, no fresh model call). */
    assert.deepEqual(pacientes.slice(1), anualVisiblePatients.map(visiblePatientRowToSheetRow),
        'downloaded Pacientes sheet must equal the visible patient rows');

    /* Switch back to Cosentyx through Fármaco → Tipo; stale Kisqali cleared,
     * accepted journey unchanged after the Kisqali visit. */
    await page.locator('#informes-drug-select').selectOption('cosentyx');
    assert.deepEqual(await page.evaluate(() => window.FarmaciaEstadisticasInformes.getState()), { report: null },
        'returning to Cosentyx clears the Kisqali result');
    assert.ok(await page.locator('#informes-kisqali-panel').isHidden());
    assert.ok(await page.locator('#kisqali-download-xlsx').isDisabled(), 'stale Kisqali XLSX cleared');
    await page.locator('#informes-report-select').selectOption('cosentyx');
    await page.locator('#informes-view-report').click();
    await page.waitForFunction(() => !document.getElementById('informes-cosentyx-panel').hidden);
    assert.ok(await page.locator('#informes-cosentyx-panel').isVisible());
    assert.ok(!(await page.locator('#informes-kisqali-panel').isVisible()));
    assert.deepEqual(await readDomKpis(page), EXPECTED_COSENTYX['2026-Q4'].dom,
        'Cosentyx report unchanged after Kisqali visit (default-latest quarter)');
    await page.locator('#informes-quarter-select').selectOption('2026-Q1');
    assert.deepEqual(await readDomKpis(page), EXPECTED_COSENTYX['2026-Q1'].dom);
    await page.locator('#informes-quarter-select').selectOption('2026-Q2');
    assert.deepEqual(await readDomKpis(page), EXPECTED_COSENTYX['2026-Q2'].dom,
        'discontinuation-free Q2 unchanged after Kisqali visit');

    /* View switching preserves the confirmed report + selection + focus. */
    await page.locator('#population-view-btn').click();
    await page.waitForFunction(() => !document.querySelector('main.main-content').classList.contains('farmacia-informes-mode'));
    await page.locator('#informes-view-btn').click();
    await page.waitForFunction(() => document.querySelector('main.main-content').classList.contains('farmacia-informes-mode'));
    assert.equal(await page.locator('#informes-drug-select').inputValue(), 'cosentyx');
    assert.equal(await page.locator('#informes-report-select').inputValue(), 'cosentyx');
    assert.equal(await page.locator('#informes-quarter-select').inputValue(), '2026-Q2');
    assert.deepEqual(await readDomKpis(page), EXPECTED_COSENTYX['2026-Q2'].dom);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'informes-view-btn');
    assert.equal(await page.locator('#informes-view-btn').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#population-view-btn').getAttribute('aria-pressed'), 'false');

    /* No page-level horizontal overflow on the supported viewports. */
    for (const width of [1440, 1024, 768]) {
        await page.setViewportSize({ width, height: 900 });
        const measured = await assertNoPageOverflow(page, `confirmed Cosentyx Q2 @${width}`);
        console.log(`viewport ${width}: scrollWidth=${measured.scrollWidth} clientWidth=${measured.clientWidth}`);
    }
    await page.setViewportSize({ width: 375, height: 900 });
    const measured375 = await assertNoPageOverflow(page, 'confirmed Cosentyx Q2 @375');
    console.log(`viewport 375: scrollWidth=${measured375.scrollWidth} clientWidth=${measured375.clientWidth}`);
    await page.setViewportSize({ width: 1440, height: 900 });

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
    console.log('farmacia_kisqali_informe_browser_check: PASS');
    console.log('QA Chromium: neutral entry OK (no precomputed report, CTA gated, {report:null}); Cosentyx reachable via confirm gate (Q1/Q2/Q4 incl. discontinuation-only Q4); Fármaco switch clears stale results; Kisqali Mensual/Trimestral/Anual/Histórico windows match hand-derived fixture values; Ver ciclos raw traceability (coherent boundary changes, stable doses, presentation independence) OK; real XLSX Resumen+Pacientes+Ciclos match UI model; back to Cosentyx unchanged; view-switch preserves confirmed selection; population CSV filtered export OK; 1440/1024/768/375 no page overflow; console.error=0 pageerror=0');
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
