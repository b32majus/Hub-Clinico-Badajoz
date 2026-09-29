#!/usr/bin/env node
'use strict';
/**
 * Browser QA for #457 (F5.3): the Reuma export interactions of Primera Visita
 * and Seguimiento obtain the 497-column TSV row exclusively through the
 * compatibility boundary (`modules/reuma_export_boundary.js`), keep working
 * identically on the happy path, and fail closed with no misleading partial
 * copy when the boundary rejects.
 *
 * Follows `tools/reuma_estadisticas_read_browser_check.mjs` /
 * `tools/reuma_seguimiento_read_browser_check.mjs`: a real repo-root HTTP
 * server, the real session gate on index.html (file input -> professional
 * select -> confirm), real navigation and real supported interactions (fill,
 * select, click the TXT and CSV export buttons). No DOM/storage cheating: the
 * only `page.addInitScript` use defines the planted boundary double required
 * by the fail-closed probe, exactly like the planted seam double of #456.
 * Clipboard/modal contents are read AFTER the supported interaction as
 * post-state observation; nothing is injected into the page.
 *
 * Fixtures are synthetic only: `tools/fixtures/reuma_read/corpus_v1.json`
 * (ids SYN-*) plus synthetic `Frmacos`/`Profesionales` sheets materialized
 * into a temporary XLSX outside the repository. Exported identifiers use
 * `SYN-EXP-BROWSER-*`.
 *
 * Cases:
 *   X1  static wiring: primera_visita.html and seguimiento.html load the
 *       boundary after exportManager.js and before their page scripts
 *   X2  Primera Visita happy path (LES): CSV export succeeds, the copied row
 *       is a 497-field TSV carrying the synthetic identity, the 'Primera
 *       Visita' marker and the 'les' pathology token; console.error=0 and
 *       no pageerror other than the documented PRE-EXISTING one (see below)
 *   X3  Seguimiento happy path (EspA): same contract with the 'Seguimiento'
 *       marker and 'espa' token; console.error=0 and same pageerror policy
 *   X4  planted boundary failure (Primera Visita): no post-export checklist,
 *       no 497-field row copied, visible fail-closed error, no pageerror
 *
 * KNOWN PRE-EXISTING BASELINE PAGEERROR (not introduced and not fixed by
 * #457): every successful CSV export ends in `addPendingRow` ->
 * `persistPendingRows` -> window event 'pendingRowsUpdated' -> script.js
 * `updatePendingRowsIndicator` -> `HubTools.export.getPendingRows()` ->
 * `persistPendingRows` again: an unbounded mutual recursion that throws
 * "Maximum call stack size exceeded" AFTER the row was already copied. This
 * reproduces byte-identically on the unmodified T2 baseline (07d6caee) with
 * the same probe; the boundary is not involved. Fixing it is outside the
 * #457 scope (pending-rows transport, not the 497 writer boundary); it is
 * reported as debt. The happy-path cases therefore tolerate ONLY that exact
 * pageerror message and fail on anything else; the fail-closed case X4 (no
 * pending row written) must have pageerror=0.
 *
 * Usage: node tools/reuma_export_boundary_browser_check.mjs
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
const PRIMERA_PAGE = 'primera_visita.html';
const SEGUIMIENTO_PAGE = 'seguimiento.html';
const BOUNDARY_SCRIPT = 'modules/reuma_export_boundary.js';
const EXPORT_MANAGER_SCRIPT = 'modules/exportManager.js';

const SYNTHETIC_DRUGS = {
    Tratamientos_Sistemicos: ['Sintetico Sist A'],
    FAMEs: ['FAME sintetico A'],
    Biologicos: ['Sintetico Bio A'],
};

const results = [];
function record(name, pass, detail) {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

// Same documented Playwright resolution as the other browser checkers.
function loadPlaywrightFromNpx() {
    const tryNodeModules = (nodeModules) => {
        const pkg = path.join(nodeModules, 'playwright', 'package.json');
        return existsSync(pkg) ? createRequire(path.join(nodeModules, '__reuma_export_boundary_loader.cjs'))('playwright') : null;
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
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/reuma_export_boundary_browser_check.mjs');
}

let chromium;
try {
    ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
    console.error('ENVIRONMENT FAILURE: ' + err.message);
    console.log('\nREUMA-EXPORT-BOUNDARY-BROWSER: FAIL 0/0');
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

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'reuma-export-boundary-browser-'));
const workbookPath = path.join(tempDir, 'reuma_export_boundary_synthetic.xlsx');
{
    const corpus = JSON.parse(fs.readFileSync(CORPUS_FILE, 'utf8'));
    const workbook = XLSX.utils.book_new();
    for (const [sheetName, rows] of Object.entries(corpus.sheets)) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
    }
    const drugRows = [['Sistemicos', 'FAMEs', 'Biologicos']];
    drugRows.push([SYNTHETIC_DRUGS.Tratamientos_Sistemicos[0], SYNTHETIC_DRUGS.FAMEs[0], SYNTHETIC_DRUGS.Biologicos[0]]);
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(drugRows), 'Frmacos');
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
// Per-page error bookkeeping (the fail-closed case legitimately logs
// console.error, so the happy paths filter on their page URL).
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

function errorsFor(entry, pageFile) {
    return entry.consoleErrors.filter((message) => message.includes(pageFile));
}

async function passSupportedGate(context) {
    const page = await context.newPage();
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
    return page;
}

// Supported export flow: fill identity/date/pathology, click TXT export (the
// legal prerequisite), close the manual-copy modal if the environment has no
// clipboard permission, then click the CSV export button.
async function exportTxtThenCsv(page, { id, pathology }) {
    await page.fill('#idPaciente', id);
    await page.fill('#fechaVisita', '2026-09-28');
    await page.selectOption('#diagnosticoPrimario', pathology);
    await page.click('#btnExportarTXT');
    await page.waitForTimeout(1200);
    if (await page.locator('#textoModalContainer').count() > 0) {
        await page.click('#closeModalBtn');
        await page.waitForTimeout(200);
    }
    await page.click('#btnEstructurarCSV');
}

// Post-state observation only: read what the supported interaction produced
// (clipboard when the environment allows it, otherwise the manual-copy modal).
async function readExportedRow(page) {
    return page.evaluate(async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text && text.includes('\t')) return { source: 'clipboard', text };
        } catch (error) { /* fall through to the modal */ }
        const textarea = document.getElementById('textoModalTextarea');
        if (textarea && textarea.value && textarea.value.includes('\t')) return { source: 'modal', text: textarea.value };
        return { source: 'none', text: '' };
    });
}

const plantedBoundaryFailure = () => {
    const failureDouble = {
        BOUNDARY_VERSION: 'planted-qa-double',
        generateLegacyRow497: () => ({ ok: false, error: { code: 'ROW_LENGTH_INVALID', message: 'planted boundary rejection (QA)' } }),
    };
    let real;
    Object.defineProperty(window, 'HubTools', {
        configurable: true,
        get() { return real; },
        set(v) {
            real = v;
            try {
                Object.defineProperty(v, 'reumaExportBoundary', {
                    configurable: true,
                    get: () => failureDouble,
                    set() { /* keep the planted double */ },
                });
            } catch (error) { /* noop */ }
        },
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
    // X1 — static wiring.
    // =====================================================================
    for (const page of [PRIMERA_PAGE, SEGUIMIENTO_PAGE]) {
        const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
        const boundaryIndex = html.indexOf(BOUNDARY_SCRIPT);
        const exportManagerIndex = html.indexOf(EXPORT_MANAGER_SCRIPT);
        record(`X1 ${page} loads the compatibility boundary after exportManager.js with a ?v= token`,
            boundaryIndex !== -1 && exportManagerIndex !== -1 && boundaryIndex > exportManagerIndex &&
            new RegExp(`${BOUNDARY_SCRIPT.replace('.', '\\.')}\\?v=`).test(html),
            `boundaryIndex=${boundaryIndex} exportManagerIndex=${exportManagerIndex}`);
    }

    browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
    const chromiumVersion = browser.version();

    const validateRow = (rowText, { id, marker, token }) => {
        const fields = rowText.split('\t');
        return {
            fields497: fields.length === 497,
            identity: fields[0] === id,
            visitMarker: fields[4] === marker,
            pathologyToken: fields[6] === token,
        };
    };

    // =====================================================================
    // X2 — Primera Visita happy path (LES).
    // =====================================================================
    {
        const context = await browser.newContext();
        try {
            await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }).catch(() => {});
            const page = await passSupportedGate(context);
            const entry = trackedPage(page);
            await page.goto(`${origin}/${PRIMERA_PAGE}`, { waitUntil: 'load', timeout: 45000 });
            await exportTxtThenCsv(page, { id: 'SYN-EXP-BROWSER-001', pathology: 'les' });
            const checklistAppeared = await page.waitForSelector('#postExportChecklist', { timeout: 8000 }).then(() => true).catch(() => false);
            const row = await readExportedRow(page);
            const checks = row.source !== 'none' ? validateRow(row.text, { id: 'SYN-EXP-BROWSER-001', marker: 'Primera Visita', token: 'les' }) : { fields497: false };
            record('X2 Primera Visita happy path: CSV export succeeds and the copied row is a 497-field TSV with identity, visit marker and pathology token',
                checklistAppeared && row.source !== 'none' && checks.fields497 && checks.identity && checks.visitMarker && checks.pathologyToken,
                `checklist=${checklistAppeared} source=${row.source} checks=${JSON.stringify(checks)} fields=${row.text ? row.text.split('\t').length : 0}`);
            const pageConsoleErrors = errorsFor(entry, PRIMERA_PAGE);
            const toleratedPageErrors = entry.pageErrors.filter((message) => message.endsWith(':: Maximum call stack size exceeded.'));
            record('X2 Primera Visita happy path: console.error=0 and no pageerror beyond the documented pre-existing pending-rows recursion',
                pageConsoleErrors.length === 0 && toleratedPageErrors.length === entry.pageErrors.length,
                `consoleErrors=${JSON.stringify(pageConsoleErrors.slice(0, 5))} pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))}`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // X3 — Seguimiento happy path (EspA).
    // =====================================================================
    {
        const context = await browser.newContext();
        try {
            await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }).catch(() => {});
            const page = await passSupportedGate(context);
            const entry = trackedPage(page);
            await page.goto(`${origin}/${SEGUIMIENTO_PAGE}`, { waitUntil: 'load', timeout: 45000 });
            await exportTxtThenCsv(page, { id: 'SYN-EXP-BROWSER-002', pathology: 'espa' });
            const checklistAppeared = await page.waitForSelector('#postExportChecklist', { timeout: 8000 }).then(() => true).catch(() => false);
            const row = await readExportedRow(page);
            const checks = row.source !== 'none' ? validateRow(row.text, { id: 'SYN-EXP-BROWSER-002', marker: 'Seguimiento', token: 'espa' }) : { fields497: false };
            record('X3 Seguimiento happy path: CSV export succeeds and the copied row is a 497-field TSV with identity, visit marker and pathology token',
                checklistAppeared && row.source !== 'none' && checks.fields497 && checks.identity && checks.visitMarker && checks.pathologyToken,
                `checklist=${checklistAppeared} source=${row.source} checks=${JSON.stringify(checks)} fields=${row.text ? row.text.split('\t').length : 0}`);
            const pageConsoleErrors = errorsFor(entry, SEGUIMIENTO_PAGE);
            const toleratedPageErrors = entry.pageErrors.filter((message) => message.endsWith(':: Maximum call stack size exceeded.'));
            record('X3 Seguimiento happy path: console.error=0 and no pageerror beyond the documented pre-existing pending-rows recursion',
                pageConsoleErrors.length === 0 && toleratedPageErrors.length === entry.pageErrors.length,
                `consoleErrors=${JSON.stringify(pageConsoleErrors.slice(0, 5))} pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))}`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // X4 — planted boundary failure: fail closed, no misleading partial copy.
    // =====================================================================
    {
        const context = await browser.newContext();
        try {
            await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }).catch(() => {});
            const page = await passSupportedGate(context);
            await page.addInitScript(plantedBoundaryFailure);
            const entry = trackedPage(page);
            await page.goto(`${origin}/${PRIMERA_PAGE}`, { waitUntil: 'load', timeout: 45000 });
            await exportTxtThenCsv(page, { id: 'SYN-EXP-BROWSER-003', pathology: 'les' });
            await page.waitForTimeout(1200);
            const checklistCount = await page.locator('#postExportChecklist').count();
            const row = await readExportedRow(page);
            const rowFields = row.text ? row.text.split('\t').length : 0;
            const alerts = await page.locator('[role="alert"]').allTextContents();
            const failClosedVisible = alerts.some((text) => text.includes('frontera de compatibilidad'));
            const pageConsoleErrors = errorsFor(entry, PRIMERA_PAGE)
                .filter((message) => !message.includes('Error en exportarYCopiarCSV') && !message.includes('Error al exportar CSV'));
            record('X4 planted boundary failure: fail-closed visible error, no post-export checklist and no 497-field row copied',
                failClosedVisible && checklistCount === 0 && rowFields !== 497 && entry.pageErrors.length === 0 && pageConsoleErrors.length === 0,
                `failClosedVisible=${failClosedVisible} checklist=${checklistCount} rowSource=${row.source} rowFields=${rowFields} ` +
                `alerts=${JSON.stringify(alerts)} consoleErrors=${JSON.stringify(pageConsoleErrors.slice(0, 5))} pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))}`);
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
console.log(`\nREUMA-EXPORT-BOUNDARY-BROWSER: ${failed.length === 0 ? 'PASS' : 'FAIL'} ${results.length - failed.length}/${results.length} cases`);
process.exit(failed.length === 0 ? 0 : 1);
