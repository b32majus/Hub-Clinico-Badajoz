#!/usr/bin/env node
'use strict';
/**
 * Browser QA for #537 (WO-NEXUS-REUMA-STATS-CSV-FILTERED-COHORT-15): the
 * supported `Exportar CSV` button on Estadísticas downloads a CSV whose
 * `ID_Paciente` rows equal the formal filtered cohort (the cohort governing
 * KPIs/charts/table through getActiveFilters() -> Reuma Population Read Port),
 * never the total population and never the `Buscar en tabla`-narrowed display.
 *
 * Follows `tools/reuma_estadisticas_read_browser_check.mjs`: a real repo-root
 * HTTP server, the real session gate on index.html (file input -> professional
 * select -> confirm), real navigation and real supported interactions
 * (select/fill/click/export) with `acceptDownloads`. No DOM/storage cheating.
 *
 * Fixtures are synthetic only: `tools/fixtures/reuma_read/corpus_v1.json`
 * (6 unique synthetic identities SYN-*) plus synthetic `Frmacos`/
 * `Profesionales` sheets materialized into a temporary XLSX outside the repo.
 *
 * Cases (all through supported inputs/clicks on one journey tab):
 *   E1  no filter: `Exportar CSV` downloads 6 `ID_Paciente` rows == the 6
 *       formal cohort identities.
 *   E2  single filter `pathology=ESPA`: downloads exactly the 2 filtered
 *       identities (total 6 > filtered 2).
 *   E3  combination `dateFrom/dateTo + ttoType=FAMEs`: downloads exactly the 2
 *       filtered identities [SYN-APS-001, SYN-ESPA-001].
 *   E4  zero result `pathology=ESPA + ttoSpecific=FAME sintetico B`: formal
 *       cohort EMPTY while upstream total stays 6; clicking `Exportar CSV`
 *       produces NO download (existing exporter fail-safe: warning, no rows)
 *       and never falls back to total.
 *   E5  adversarial local search: formal cohort 6 with `Buscar en tabla`
 *       narrowing the visible rows to 1; the download still carries the 6
 *       formal identities (accepted decision in #537).
 *   E6  console.error === 0 and pageerror === 0 counted over the whole
 *       qualified journey: session gate on index.html through navigation,
 *       filters, export clicks and real CSV downloads. No error buffer is
 *       cleared after the gate and the assertion applies to the full-journey
 *       totals (every `console` message of type `error` plus every
 *       `pageerror` event from journey start, without per-URL filtering).
 *       The pre-fix `HubTools.exportCohortToCSV not found` error must be gone.
 *
 * Exit code 0 = every case PASS, 1 = at least one FAIL or environment failure.
 * Usage: node tools/reuma_estadisticas_csv_filtered_cohort_browser_check.mjs
 * Documented env var: PLAYWRIGHT_CHROMIUM_EXECUTABLE (headless-shell path).
 */

import { createReadStream, existsSync, mkdtempSync, rmSync, statSync, readFileSync } from 'node:fs';
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
const FILTER_EMPTY_COPY = 'No se encontraron pacientes con los filtros seleccionados';

const corpus = JSON.parse(fs.readFileSync(CORPUS_FILE, 'utf8'));
const ALL_SIX = ['SYN-APS-001', 'SYN-AR-001', 'SYN-ESPA-001', 'SYN-ESPA-002', 'SYN-LES-001', 'SYN-SJO-001'].sort();
const ESPA_TWO = ['SYN-ESPA-001', 'SYN-ESPA-002'].sort();
const DATE_FAME_TWO = ['SYN-APS-001', 'SYN-ESPA-001'].sort();
// Synthetic drug catalogue; FAME sintetico A/B/C match the synthetic cohort treatments
// so the therapeutic filter is exercised through a real supported interaction.
const SYNTHETIC_DRUGS = {
    Tratamientos_Sistemicos: ['Sintetico Sist A'],
    FAMEs: ['FAME sintetico A', 'FAME sintetico B', 'FAME sintetico C'],
    Biologicos: ['Sintetico Bio A'],
};

const results = [];
function record(name, pass, detail) {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function multisetEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    const x = [...a].sort();
    const y = [...b].sort();
    return x.every((v, i) => v === y[i]);
}

// Same documented Playwright resolution as the other browser checkers.
function loadPlaywrightFromNpx() {
    const tryNodeModules = (nodeModules) => {
        const pkg = path.join(nodeModules, 'playwright', 'package.json');
        return existsSync(pkg) ? createRequire(path.join(nodeModules, '__reuma_estadisticas_csv_loader.cjs'))('playwright') : null;
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
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/reuma_estadisticas_csv_filtered_cohort_browser_check.mjs');
}

let chromium;
try {
    ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
    console.error('ENVIRONMENT FAILURE: ' + err.message);
    console.log('\nREUMA-ESTADISTICAS-CSV-BROWSER: FAIL 0/0');
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

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'reuma-estadisticas-csv-browser-'));
const workbookPath = path.join(tempDir, 'reuma_estadisticas_csv_synthetic.xlsx');
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

function trackedPage(page) {
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(`${page.url()} :: ${message.text()}`);
    });
    page.on('pageerror', (error) => pageErrors.push(`${page.url()} :: ${error.message}`));
    return { page, consoleErrors, pageErrors };
}

function describeErrorsByPage(entry) {
    const byPage = {};
    for (const message of entry.consoleErrors) {
        const pageUrl = String(message).split(' :: ')[0];
        byPage[pageUrl] = (byPage[pageUrl] || 0) + 1;
    }
    return byPage;
}

async function passSupportedGate(context) {
    const entry = trackedPage(await context.newPage());
    const { page } = entry;
    await page.goto(`${origin}/index.html`, { waitUntil: 'load', timeout: 45000 });
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
        tableIds: Array.from(document.querySelectorAll('#cohortTableBody tr td:first-child'))
            .map((td) => (td.textContent || '').trim()).filter(Boolean),
        tableText: (document.getElementById('cohortTableBody')?.textContent || '').replace(/\s+/g, ' ').trim(),
    }));
}

async function waitForTotal(page, expected) {
    await page.waitForFunction(
        (value) => (document.getElementById('kpiTotalPatients')?.textContent || '').trim() === value,
        String(expected), { timeout: 8000 }
    ).catch(() => {});
}

function parseDownloadedIds(csvText) {
    const text = String(csvText || '').replace(/^﻿/, '');
    const lines = text.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.length > 0);
    if (lines.length === 0 || lines[0].split(',')[0] !== 'ID_Paciente') return null;
    return lines.slice(1).map((line) => line.split(',')[0]);
}

async function clickExportExpectDownload(page, timeout = 8000) {
    await page.locator('#exportCohortBtn').scrollIntoViewIfNeeded().catch(() => {});
    const [download] = await Promise.all([
        page.waitForEvent('download', { timeout }).catch(() => null),
        page.click('#exportCohortBtn'),
    ]);
    if (!download) return null;
    const filePath = await download.path().catch(() => null);
    if (!filePath) return null;
    return { suggestedFilename: download.suggestedFilename(), text: readFileSync(filePath, 'utf8') };
}

async function clickExportExpectNoDownload(page, timeout = 3500) {
    await page.locator('#exportCohortBtn').scrollIntoViewIfNeeded().catch(() => {});
    const download = await Promise.all([
        page.waitForEvent('download', { timeout }).catch(() => null),
        page.click('#exportCohortBtn'),
    ]).then(([d]) => d);
    return download;
}

async function resetFormalFilters(page) {
    await page.click('.filter-tab[data-tab="periodo"]').catch(() => {});
    await page.fill('#filterDateFrom', '').catch(() => {});
    await page.dispatchEvent('#filterDateFrom', 'change').catch(() => {});
    await page.fill('#filterDateTo', '').catch(() => {});
    await page.dispatchEvent('#filterDateTo', 'change').catch(() => {});
    await page.click('.filter-tab[data-tab="demograficos"]').catch(() => {});
    await page.selectOption('#filterPathology', 'Todos').catch(() => {});
    await page.click('.filter-tab[data-tab="terapeuticos"]').catch(() => {});
    await page.selectOption('#filterTtoType', 'Todos').catch(() => {});
    await page.selectOption('#filterTtoSpecific', 'Todos').catch(() => {});
    await page.fill('#tableSearchInput', '').catch(() => {});
    await waitForTotal(page, 6);
}

let browser;
let origin = '';
try {
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    origin = `http://127.0.0.1:${server.address().port}`;

    browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
    const chromiumVersion = browser.version();

    const context = await browser.newContext({ acceptDownloads: true });
    try {
        // Full-journey error budget: the buffers opened in passSupportedGate()
        // stay intact for the whole journey (gate included). Nothing is cleared
        // here; E6 asserts on the totals below.
        const entry = await passSupportedGate(context);

        await entry.page.goto(`${origin}/${ESTADISTICAS_PAGE}`, { waitUntil: 'load', timeout: 45000 });
        await waitForTotal(entry.page, 6);

        // E1 — no filter: the complete 6-patient cohort downloads.
        {
            const state = await dashboardState(entry.page);
            const dl = await clickExportExpectDownload(entry.page);
            const ids = dl ? parseDownloadedIds(dl.text) : null;
            record('E1 no filter downloads the complete 6-patient cohort with all 6 identities',
                state.kpiTotal === '6' && ids !== null && multisetEqual(ids, ALL_SIX) &&
                multisetEqual([...state.tableIds].sort(), ALL_SIX),
                `kpiTotal=${state.kpiTotal} tableIds=${JSON.stringify(state.tableIds)} ` +
                `downloaded=${JSON.stringify(ids)} file=${dl && dl.suggestedFilename}`);
        }

        // E2 — single filter pathology=ESPA through a supported select.
        {
            await entry.page.click('#filtersHeader');
            await entry.page.waitForTimeout(300);
            await entry.page.click('.filter-tab[data-tab="demograficos"]');
            await entry.page.selectOption('#filterPathology', 'ESPA');
            await waitForTotal(entry.page, 2);
            const state = await dashboardState(entry.page);
            const dl = await clickExportExpectDownload(entry.page);
            const ids = dl ? parseDownloadedIds(dl.text) : null;
            record('E2 pathology=ESPA downloads exactly the 2-patient filtered cohort (total 6 > filtered 2)',
                state.kpiTotal === '2' && ids !== null && multisetEqual(ids, ESPA_TWO),
                `kpiTotal=${state.kpiTotal} tableIds=${JSON.stringify(state.tableIds)} downloaded=${JSON.stringify(ids)}`);
        }

        // E3 — combination date range + ttoType=FAMEs through supported inputs.
        {
            await resetFormalFilters(entry.page);
            await entry.page.click('.filter-tab[data-tab="periodo"]');
            await entry.page.fill('#filterDateFrom', '2026-02-01');
            await entry.page.dispatchEvent('#filterDateFrom', 'change');
            await entry.page.fill('#filterDateTo', '2026-03-31');
            await entry.page.dispatchEvent('#filterDateTo', 'change');
            await entry.page.click('.filter-tab[data-tab="terapeuticos"]');
            await entry.page.selectOption('#filterTtoType', 'FAMEs');
            await waitForTotal(entry.page, 2);
            const state = await dashboardState(entry.page);
            const dl = await clickExportExpectDownload(entry.page);
            const ids = dl ? parseDownloadedIds(dl.text) : null;
            record('E3 date range + ttoType=FAMEs downloads exactly the 2-patient filtered combination',
                state.kpiTotal === '2' && ids !== null && multisetEqual(ids, DATE_FAME_TWO),
                `kpiTotal=${state.kpiTotal} tableIds=${JSON.stringify(state.tableIds)} downloaded=${JSON.stringify(ids)}`);
        }

        // E4 — zero result: no download, no fallback to total.
        {
            await resetFormalFilters(entry.page);
            await entry.page.click('.filter-tab[data-tab="demograficos"]');
            await entry.page.selectOption('#filterPathology', 'ESPA');
            await entry.page.click('.filter-tab[data-tab="terapeuticos"]');
            await entry.page.selectOption('#filterTtoSpecific', 'FAME sintetico B');
            await waitForTotal(entry.page, 0);
            await entry.page.waitForTimeout(400);
            const state = await dashboardState(entry.page);
            const download = await clickExportExpectNoDownload(entry.page);
            const emptyShown = state.tableText.includes(FILTER_EMPTY_COPY);
            record('E4 zero-result filter produces no download and never falls back to total',
                state.kpiTotal === '0' && emptyShown && download === null,
                `kpiTotal=${state.kpiTotal} emptyShown=${emptyShown} download=${download ? 'UNEXPECTED' : 'none'}`);
        }

        // E5 — adversarial local search: formal 6, display narrowed to 1 row.
        {
            await resetFormalFilters(entry.page);
            await entry.page.fill('#tableSearchInput', 'SYN-AR');
            await entry.page.waitForFunction(() => document.querySelectorAll('#cohortTableBody tr').length === 1, null, { timeout: 5000 }).catch(() => {});
            const searched = await dashboardState(entry.page);
            const dl = await clickExportExpectDownload(entry.page);
            const ids = dl ? parseDownloadedIds(dl.text) : null;
            record('E5 adversarial table search narrows display to 1 row while export follows the formal 6-patient cohort',
                searched.kpiTotal === '6' && searched.tableRows === 1 && ids !== null && multisetEqual(ids, ALL_SIX),
                `kpiTotal=${searched.kpiTotal} rows=${searched.tableRows} downloaded=${JSON.stringify(ids)}`);
            await entry.page.fill('#tableSearchInput', '');
        }

        // E6 — full-journey error budget: gate through downloads, no reset, no per-URL filtering. Both totals must be zero.
        {
            const consoleTotal = entry.consoleErrors.length;
            const pageTotal = entry.pageErrors.length;
            const noLegacyWiringError = !entry.consoleErrors.some((message) => message.includes('exportCohortToCSV'))
                && !entry.pageErrors.some((message) => message.includes('exportCohortToCSV'));
            const breakdown = describeErrorsByPage(entry);
            record('E6 console.error === 0 and pageerror === 0 over the full journey (gate + estadisticas + exports)',
                consoleTotal === 0 && pageTotal === 0 && noLegacyWiringError,
                `consoleErrors=${consoleTotal} pageErrors=${pageTotal} byPage=${JSON.stringify(breakdown)} ` +
                `consoleSample=${JSON.stringify(entry.consoleErrors.slice(0, 5))} pageSample=${JSON.stringify(entry.pageErrors.slice(0, 5))}`);
        }
    } finally {
        await context.close();
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
console.log(`\nREUMA-ESTADISTICAS-CSV-BROWSER: ${failed.length === 0 ? 'PASS' : 'FAIL'} ${results.length - failed.length}/${results.length} cases`);
process.exit(failed.length === 0 ? 0 : 1);
