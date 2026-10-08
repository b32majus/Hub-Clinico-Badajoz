#!/usr/bin/env node
'use strict';
/**
 * Browser QA for #456 (F5.2B): the Estadísticas Reuma journey reads its population
 * cohort/KPIs/chart payload and its drug filter options through the published read-only
 * seam (`scripts/reuma_population_read_port.js`) instead of direct `HubTools.data` reads.
 *
 * Follows `tools/reuma_seguimiento_read_browser_check.mjs` / `reuma_read_vertical_browser_check.mjs`:
 * a real repo-root HTTP server, the real session gate on reuma_index.html (file input ->
 * professional select -> confirm), real navigation and real supported interactions
 * (select/fill/click/search/export). No DOM/storage cheating: the only
 * `page.addInitScript` use defines the planted seam double required by the fail-safe
 * `error` probe.
 *
 * Fixtures are synthetic only: `tools/fixtures/reuma_read/corpus_v1.json` (ids SYN-*)
 * plus synthetic `Frmacos`/`Profesionales` sheets materialized into a temporary XLSX
 * outside the repository.
 *
 * Cases:
 *   B1  static wiring: estadisticas.html loads the seam before its page script
 *   B2  happy path: 6-patient synthetic cohort renders (KPIs, table, charts, drug
 *       options in source order) with console.error=0 and pageerror=0
 *   B3  period filter narrows the cohort via a supported date input
 *   B4  pathology + therapeutic filters narrow the cohort via supported selects
 *   B5  table search narrows the rendered rows
 *   B6  happy path keeps console.error=0 and pageerror=0
 *   B7  unavailable (tab without the session corpus) fails visibly/safely
 *   B8  error (planted seam double) fails visibly/safely
 *
 * CSV export wiring (#537): `Exportar CSV` now resolves the exporter through its
 * published namespace (`HubTools.export.exportCohortToCSV`) and downloads exactly
 * the formal filtered cohort. That behavior is qualified by the dedicated
 * deterministic oracle `tools/reuma_estadisticas_csv_filtered_cohort_check.mjs`
 * and the download-level browser check
 * `tools/reuma_estadisticas_csv_filtered_cohort_browser_check.mjs`; this checker
 * keeps its original seam-migration scope and does not re-probe the export path.
 *
 * Usage: node tools/reuma_estadisticas_read_browser_check.mjs
 * Documented env var: PLAYWRIGHT_CHROMIUM_EXECUTABLE (headless-shell path).
 * Exit code 0 = every case PASS, 1 = at least one FAIL or environment failure.
 */

import { createReadStream, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const CORPUS_FILE = path.join(ROOT, 'tools', 'fixtures', 'reuma_read', 'corpus_v1.json');
const ESTADISTICAS_PAGE = 'estadisticas.html';
const SEAM_SCRIPT = 'scripts/reuma_population_read_port.js';
const CONSUMER_SCRIPT = 'scripts/script_estadisticas.js';

const FAIL_CLOSED_UNAVAILABLE = 'No hay datos cargados. Carga el Excel para consultar la cohorte.';
const FAIL_CLOSED_ERROR = 'No se pudieron consultar los datos de la cohorte. Inténtalo de nuevo.';
const FILTER_EMPTY_COPY = 'No se encontraron pacientes con los filtros seleccionados';

const corpus = JSON.parse(fs.readFileSync(CORPUS_FILE, 'utf8'));
const TOTAL_PATIENTS = 6;
const ESPA_PATIENTS = 2;
const ESPA_FAME_A_PATIENTS = 1;
const APRIL_ONWARD_PATIENTS = 1;
// Synthetic drug catalogue; FAME sintetico A/B/C match the synthetic cohort treatments
// so the therapeutic filter is exercised through a real supported interaction.
const SYNTHETIC_DRUGS = {
    Tratamientos_Sistemicos: ['Sintetico Sist A'],
    FAMEs: ['FAME sintetico A', 'FAME sintetico B', 'FAME sintetico C'],
    Biologicos: ['Sintetico Bio A'],
};
const SYNTHETIC_DRUGS_ORDER = [
    ...SYNTHETIC_DRUGS.Tratamientos_Sistemicos,
    ...SYNTHETIC_DRUGS.FAMEs,
    ...SYNTHETIC_DRUGS.Biologicos,
];

const results = [];
function record(name, pass, detail) {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

// Same documented Playwright resolution as the other browser checkers.
function loadPlaywrightFromNpx() {
    const tryNodeModules = (nodeModules) => {
        const pkg = path.join(nodeModules, 'playwright', 'package.json');
        return existsSync(pkg) ? createRequire(path.join(nodeModules, '__reuma_estadisticas_loader.cjs'))('playwright') : null;
    };
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        if (!binDirectory) continue;
        const prefix = path.resolve(binDirectory, '..');
        for (const nodeModules of [prefix, path.join(prefix, 'lib', 'node_modules')]) {
            const loaded = tryNodeModules(nodeModules);
            if (loaded) return loaded;
        }
    }
    const npxCache = path.join(process.env.HOME || '', '.npm', '_npx');
    if (existsSync(npxCache)) {
        for (const entry of fs.readdirSync(npxCache).sort().reverse()) {
            const loaded = tryNodeModules(path.join(npxCache, entry, 'node_modules'));
            if (loaded) return loaded;
        }
    }
    const loaded = tryNodeModules(path.join(ROOT, 'node_modules'));
    if (loaded) return loaded;
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/reuma_estadisticas_read_browser_check.mjs');
}

let chromium;
try {
    ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
    console.error('ENVIRONMENT FAILURE: ' + err.message);
    console.log('\nREUMA-ESTADISTICAS-READ-BROWSER: FAIL 0/0');
    process.exit(1);
}

function chromiumExecutable() {
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    const bundled = chromium.executablePath();
    if (existsSync(bundled)) return bundled;
    const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
    if (!existsSync(cache)) return bundled;
    const candidates = fs.readdirSync(cache)
        .filter((entry) => entry.startsWith('chromium_headless_shell-'))
        .sort().reverse()
        .map((entry) => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
    return candidates.find(existsSync) || bundled;
}

// ---------------------------------------------------------------------------
// Synthetic workbook (temporary, outside the repository) + repo-root HTTP server.
// ---------------------------------------------------------------------------

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'reuma-estadisticas-browser-'));
const workbookPath = path.join(tempDir, 'reuma_estadisticas_synthetic.xlsx');
{
    const workbook = XLSX.utils.book_new();
    for (const [sheetName, rows] of Object.entries(corpus.sheets)) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
    }
    const drugRowCount = Math.max(...Object.values(SYNTHETIC_DRUGS).map((list) => list.length));
    const drugRows = [];
    for (let i = 0; i < drugRowCount; i += 1) {
        drugRows.push([
            SYNTHETIC_DRUGS.Tratamientos_Sistemicos[i] || '',
            SYNTHETIC_DRUGS.FAMEs[i] || '',
            SYNTHETIC_DRUGS.Biologicos[i] || '',
        ]);
    }
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
        ['Sistemicos', 'FAMEs', 'Biologicos'],
        ...drugRows,
    ]), 'Frmacos');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
        { Nombre_Completo: 'Sintetico Profesional Uno', Cargo: 'Reumatologia' },
    ]), 'Profesionales');
    fs.writeFileSync(workbookPath, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

const mime = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
    ['.svg', 'image/svg+xml'],
]);
const server = createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(ROOT, relative);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return response.writeHead(403).end();
    try {
        if (!statSync(file).isFile()) throw new Error('not_file');
        response.writeHead(200, {
            'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
            'cache-control': 'no-store',
        });
        createReadStream(file).pipe(response);
    } catch {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
    }
});

// ---------------------------------------------------------------------------
// Per-page error bookkeeping (the fail-safe cases legitimately log console.error,
// so the happy path filters on the estadisticas URL rather than assuming global zero).
// ---------------------------------------------------------------------------

function trackedPage(page) {
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(`${page.url()} :: ${message.text()}`);
    });
    page.on('pageerror', (error) => pageErrors.push(`${page.url()} :: ${error.message}`));
    return { page, consoleErrors, pageErrors };
}

function estadisticasErrors(entry) {
    return entry.consoleErrors.filter((message) => message.includes(ESTADISTICAS_PAGE));
}

async function passSupportedGate(context) {
    const entry = trackedPage(await context.newPage());
    const { page } = entry;
    await page.goto(`${origin}/reuma_index.html`, { waitUntil: 'load', timeout: 45000 });
    await page.setInputFiles('#gateExcelInput', workbookPath);
    await page.waitForSelector('#gateStepSelect:not(.hidden)', { timeout: 20000 });
    const professional = await page.evaluate(() => {
        const select = document.getElementById('gateProfessionalSelect');
        return select ? Array.from(select.options).map((option) => option.value).find(Boolean) || '' : '';
    });
    await page.selectOption('#gateProfessionalSelect', professional);
    await page.click('#gateConfirmBtn');
    await page.waitForFunction(() => document.getElementById('sessionGate').classList.contains('hidden'), null, { timeout: 10000 });
    return entry;
}

async function dashboardState(page) {
    return page.evaluate(() => ({
        kpiTotal: (document.getElementById('kpiTotalPatients')?.textContent || '').trim(),
        tableRows: document.querySelectorAll('#cohortTableBody tr').length,
        pagination: (document.getElementById('paginationInfo')?.textContent || '').trim(),
        nextDisabled: document.getElementById('nextPageBtn')?.disabled === true,
        drugOptions: Array.from(document.querySelectorAll('#filterTtoSpecific option')).map((option) => option.value),
        tableText: (document.getElementById('cohortTableBody')?.textContent || '').replace(/\s+/g, ' ').trim(),
        activityChart: (typeof Chart !== 'undefined' && typeof Chart.getChart === 'function') ? !!Chart.getChart('activityDonutChart') : false,
        alert: Array.from(document.querySelectorAll('[role="alert"]')).map((node) => (node.textContent || '').trim()).join(' | '),
    }));
}

async function waitForTotal(page, expected) {
    await page.waitForFunction(
        (value) => (document.getElementById('kpiTotalPatients')?.textContent || '').trim() === value,
        String(expected), { timeout: 8000 }
    ).catch(() => {});
}

const plantedErrorDouble = () => {
    const port = {
        readPopulation: async () => ({ status: 'error', error_code: 'planted_read_error' }),
        readDrugFilterOptions: () => ({ status: 'error', error_code: 'planted_read_error', categories: { Tratamientos_Sistemicos: [], FAMEs: [], Biologicos: [] } }),
    };
    const double = { getPort: () => port, create: () => port, PORT_VERSION: 'error-double', DRUG_CATEGORIES: ['Tratamientos_Sistemicos', 'FAMEs', 'Biologicos'] };
    Object.defineProperty(window, 'ReumaPopulationReadPort', {
        configurable: true,
        get: () => double,
        set: () => {},
    });
};

let browser;
let origin = '';
try {
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    origin = `http://127.0.0.1:${server.address().port}`;

    // =====================================================================
    // B1 — static wiring.
    // =====================================================================
    {
        const html = fs.readFileSync(path.join(ROOT, ESTADISTICAS_PAGE), 'utf8');
        const seamIndex = html.indexOf(SEAM_SCRIPT);
        const consumerIndex = html.indexOf(CONSUMER_SCRIPT);
        record('B1 estadisticas.html loads the population seam before its page script with a ?v= token',
            seamIndex !== -1 && consumerIndex !== -1 && seamIndex < consumerIndex &&
            new RegExp(`${SEAM_SCRIPT.replace('.', '\\.')}\\?v=`).test(html),
            `seamIndex=${seamIndex} consumerIndex=${consumerIndex}`);
    }

    browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
    const chromiumVersion = browser.version();

    // =====================================================================
    // Corpus context — supported gate, then the Estadísticas happy path and
    // supported filters/search/export on the same tab.
    // =====================================================================
    {
        const context = await browser.newContext();
        try {
            const entry = await passSupportedGate(context);
            entry.consoleErrors.length = 0;
            entry.pageErrors.length = 0;

            await entry.page.goto(`${origin}/${ESTADISTICAS_PAGE}`, { waitUntil: 'load', timeout: 45000 });
            await waitForTotal(entry.page, TOTAL_PATIENTS);
            const loaded = await dashboardState(entry.page);
            const happyChecks = [
                loaded.kpiTotal === String(TOTAL_PATIENTS),
                loaded.tableRows === TOTAL_PATIENTS,
                JSON.stringify(loaded.drugOptions) === JSON.stringify(['Todos', ...SYNTHETIC_DRUGS_ORDER]),
                loaded.activityChart,
                loaded.nextDisabled,
                estadisticasErrors(entry).length === 0,
                entry.pageErrors.length === 0,
            ];
            record('B2 happy path renders the synthetic cohort (KPIs, table, charts, drug options) with a clean console',
                happyChecks.every(Boolean),
                `kpiTotal=${loaded.kpiTotal} rows=${loaded.tableRows} activityChart=${loaded.activityChart} ` +
                `drugOptions=${JSON.stringify(loaded.drugOptions)} nextDisabled=${loaded.nextDisabled} ` +
                `consoleErrors=${JSON.stringify(estadisticasErrors(entry))} pageErrors=${JSON.stringify(entry.pageErrors)}`);

            // Period filter through a supported date input: only SYN-AR-001 (12/04/2026) survives.
            await entry.page.fill('#filterDateFrom', '2026-04-01');
            await entry.page.dispatchEvent('#filterDateFrom', 'change');
            await waitForTotal(entry.page, APRIL_ONWARD_PATIENTS);
            const period = await dashboardState(entry.page);
            record('B3 period filter narrows the cohort through the supported date input',
                period.kpiTotal === String(APRIL_ONWARD_PATIENTS) && period.tableRows === APRIL_ONWARD_PATIENTS,
                `kpiTotal=${period.kpiTotal} rows=${period.tableRows} pagination=${JSON.stringify(period.pagination)}`);
            await entry.page.fill('#filterDateFrom', '');
            await entry.page.dispatchEvent('#filterDateFrom', 'change');
            await waitForTotal(entry.page, TOTAL_PATIENTS);

            // Pathology + therapeutic filters through supported selects (their tabs are activated first).
            await entry.page.click('#filtersHeader');
            await entry.page.waitForTimeout(300);
            await entry.page.click('.filter-tab[data-tab="demograficos"]');
            await entry.page.selectOption('#filterPathology', 'ESPA');
            await waitForTotal(entry.page, ESPA_PATIENTS);
            const pathology = await dashboardState(entry.page);
            await entry.page.click('.filter-tab[data-tab="terapeuticos"]');
            await entry.page.selectOption('#filterTtoSpecific', 'FAME sintetico A');
            await waitForTotal(entry.page, ESPA_FAME_A_PATIENTS);
            const therapeutic = await dashboardState(entry.page);
            record('B4 pathology and therapeutic filters narrow the cohort through supported selects',
                pathology.kpiTotal === String(ESPA_PATIENTS) && pathology.tableRows === ESPA_PATIENTS &&
                therapeutic.kpiTotal === String(ESPA_FAME_A_PATIENTS) && therapeutic.tableRows === ESPA_FAME_A_PATIENTS,
                `espa=${pathology.kpiTotal}/${pathology.tableRows} espa+fameA=${therapeutic.kpiTotal}/${therapeutic.tableRows}`);

            // Table search over the current cohort.
            await entry.page.click('.filter-tab[data-tab="demograficos"]');
            await entry.page.selectOption('#filterPathology', 'Todos');
            await entry.page.click('.filter-tab[data-tab="terapeuticos"]');
            await entry.page.selectOption('#filterTtoSpecific', 'Todos');
            await waitForTotal(entry.page, TOTAL_PATIENTS);
            await entry.page.fill('#tableSearchInput', 'SYN-AR');
            await entry.page.waitForFunction(() => document.querySelectorAll('#cohortTableBody tr').length === 1, null, { timeout: 5000 }).catch(() => {});
            const searched = await dashboardState(entry.page);
            record('B5 table search narrows the rendered rows through the supported search input',
                searched.tableRows === 1 && searched.tableText.includes('SYN-AR-001'),
                `rows=${searched.tableRows} text=${JSON.stringify(searched.tableText)}`);
            await entry.page.fill('#tableSearchInput', '');
            await entry.page.waitForFunction((count) => document.querySelectorAll('#cohortTableBody tr').length === count, TOTAL_PATIENTS, { timeout: 5000 }).catch(() => {});

            // CSV export is not wired today (see header note), so it is not probed; the
            // migration leaves that path untouched.
            record('B6 console.error === 0 and pageerror === 0 on the Estadísticas happy path',
                estadisticasErrors(entry).length === 0 && entry.pageErrors.length === 0,
                `consoleErrors=${JSON.stringify(estadisticasErrors(entry).slice(0, 5))} pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))}`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // B7 — unavailable: a fresh tab shares the professional session but has no
    //      sessionStorage corpus, so the read must fail visibly/safely.
    // =====================================================================
    {
        const context = await browser.newContext();
        try {
            await passSupportedGate(context);
            const entry = trackedPage(await context.newPage());
            await entry.page.goto(`${origin}/${ESTADISTICAS_PAGE}`, { waitUntil: 'load', timeout: 45000 });
            await entry.page.waitForTimeout(1200);
            const state = await dashboardState(entry.page);
            const errors = estadisticasErrors(entry);
            const checks = [
                state.tableText.includes(FAIL_CLOSED_UNAVAILABLE),
                !state.tableText.includes(FILTER_EMPTY_COPY),
                state.tableRows === 1, // the single fail-safe row
                state.kpiTotal === '—',
                errors.some((message) => message.includes(FAIL_CLOSED_UNAVAILABLE)),
                entry.pageErrors.length === 0,
            ];
            record('B7 unavailable fails visibly/safely with no fabricated cohort',
                checks.every(Boolean),
                `table=${JSON.stringify(state.tableText)} kpiTotal=${JSON.stringify(state.kpiTotal)} ` +
                `consoleErrors=${JSON.stringify(errors)} pageErrors=${JSON.stringify(entry.pageErrors)}`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // B8 — error: planted seam double; must fail visibly/safely and never render
    //      a fabricated cohort.
    // =====================================================================
    {
        const context = await browser.newContext();
        try {
            await passSupportedGate(context);
            const entry = trackedPage(await context.newPage());
            await entry.page.addInitScript(plantedErrorDouble);
            await entry.page.goto(`${origin}/${ESTADISTICAS_PAGE}`, { waitUntil: 'load', timeout: 45000 });
            await entry.page.waitForTimeout(1200);
            const state = await dashboardState(entry.page);
            const errors = estadisticasErrors(entry);
            const checks = [
                state.tableText.includes(FAIL_CLOSED_ERROR),
                !state.tableText.includes(FILTER_EMPTY_COPY),
                state.kpiTotal === '—',
                errors.some((message) => message.includes(FAIL_CLOSED_ERROR)),
                entry.pageErrors.length === 0,
            ];
            record('B8 error fails visibly/safely and never becomes a fabricated cohort',
                checks.every(Boolean),
                `table=${JSON.stringify(state.tableText)} kpiTotal=${JSON.stringify(state.kpiTotal)} ` +
                `consoleErrors=${JSON.stringify(errors)} pageErrors=${JSON.stringify(entry.pageErrors)}`);
        } finally {
            await context.close();
        }
    }

    console.log('\nENVIRONMENT');
    console.log(`  Chromium: ${chromiumVersion}`);
    console.log(`  Headless: true`);
    console.log(`  Node: ${process.version}`);
    console.log(`  Server origin: ${origin}`);
} catch (err) {
    record('unexpected checker error', false, (err && err.stack) || String(err));
} finally {
    if (browser) await browser.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
    rmSync(tempDir, { recursive: true, force: true });
}

const failed = results.filter((result) => !result.pass);
if (failed.length > 0) {
    console.log('FAILED CASES:');
    for (const item of failed) console.log(`  - ${item.name}`);
}
console.log(`\nREUMA-ESTADISTICAS-READ-BROWSER: ${failed.length === 0 ? 'PASS' : 'FAIL'} ${results.length - failed.length}/${results.length} cases`);
process.exit(failed.length === 0 ? 0 : 1);
