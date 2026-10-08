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
 * server, the real session gate on reuma_index.html (file input -> professional
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
 *   X5  T3 #583 Primera Visita notification invariants on normal CSV
 *       delivery after the TXT gate: exactly one checklist, the generic
 *       green success toast ABSENT, the unaltered legacy 497-field row
 *       delivered, checklist dismiss works; console.error=0 and same
 *       pageerror policy. Queue retention and retry execution are NOT part
 *       of this gate (see KNOWN_PREEXISTING / #587 below).
 *   X6  T3 #583 Seguimiento: same notification invariants as X5
 *   X7  TXT-before-CSV gate preserved on both pages: CSV without prior TXT
 *       raises the gate error alert with no checklist and no pageerror
 *   X8  T3 #583 static notification invariants in modules/exportManager.js:
 *       the shared delivery helper raises no generic green success toast
 *       while keeping the checklist, the copy-error/fallback/manual-copy
 *       path and exactly one addPendingRow enqueue attempt per delivery;
 *       both consumers (exportarYCopiarCSV, exportarAct497) still route
 *       through the helper and keep the TXT gate; retryPendingRowCopy keeps
 *       its distinct success feedback (code/message preserved; execution
 *       NO OPERATIVA EN BASELINE, see below)
 *
 * KNOWN_PREEXISTING BASELINE DEBT (#587, DISCOVERY / NO IMPLEMENTATION
 * AUTHORITY IN #586 — NOT_A_T3_ACCEPTANCE_GATE, never counted as
 * functional PASS):
 *   (a) pending-row retention: `entregarFilaProyectadaCSV` calls
 *       `addPendingRow` once per delivery (enqueue attempt), but the payload
 *       carries no `createdAt`/`id` while `prunePendingRows` requires
 *       `item.createdAt`; the enqueued row is therefore pruned immediately
 *       and `getPendingRows()` observes 0. Verified byte-identical at fixed
 *       parent 384ec686 (`addPendingRow`/`prunePendingRows`/
 *       `persistPendingRows`/`getPendingRows` unchanged by this train; the
 *       only parent..HEAD runtime delta is the T3 toast removal).
 *   (b) retry UX NO OPERATIVA EN BASELINE: with the queue empty,
 *       `retryPendingRowCopy` cannot reach its distinct success toast at
 *       runtime; the retry code and message are preserved statically (X8).
 * These four observations (X5/X6 pendingRows=0, X5/X6 retryToast=false) are
 * recorded via `recordKnownPreexisting`, printed and enumerated in the
 * summary, and excluded from the PASS/FAIL gate and exit code.
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
 * Exit code 0 = every functional case PASS (KNOWN_PREEXISTING items are
 * informational only and never gate the exit code), 1 = at least one
 * functional FAIL or environment failure.
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

// KNOWN_PREEXISTING evidence (#587): visible negative/pre-existing runtime
// observations that are OUTSIDE the T3 acceptance gate. Informational only:
// printed, enumerated in the summary, never counted as functional PASS and
// never gating the exit code.
const knownPreexisting = [];
function recordKnownPreexisting(name, detail) {
    knownPreexisting.push({ name, detail });
    console.log(`  [KNOWN_PREEXISTING] ${name} :: ${detail}`);
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

    // =====================================================================
    // X8 — T3 #583 static notification invariants in modules/exportManager.js.
    // =====================================================================
    {
        const source = fs.readFileSync(path.join(ROOT, EXPORT_MANAGER_SCRIPT), 'utf8');
        const entregarStart = source.indexOf('function entregarFilaProyectadaCSV');
        const exportarCsvStart = source.indexOf('function exportarYCopiarCSV');
        const entregarRegion = entregarStart !== -1 && exportarCsvStart > entregarStart ? source.slice(entregarStart, exportarCsvStart) : '';
        record('X8 static: entregarFilaProyectadaCSV raises no generic green success toast',
            entregarRegion.length > 0 && !entregarRegion.includes('Datos copiados al portapapeles. Pega en la hoja:'),
            `region=${entregarRegion.length} chars`);
        record('X8 static: entregarFilaProyectadaCSV keeps the post-export checklist as the success UX',
            entregarRegion.includes('mostrarChecklistPostExport(hojaExcel)'),
            'checklist call missing from the shared delivery helper');
        record('X8 static: entregarFilaProyectadaCSV keeps the copy-error feedback',
            entregarRegion.includes('Error al copiar los datos al portapapeles.'),
            'copy-error feedback missing from the shared delivery helper');
        const retryStart = source.indexOf('function retryPendingRowCopy');
        const retryRegion = retryStart !== -1 && entregarStart > retryStart ? source.slice(retryStart, entregarStart) : '';
        record('X8 static: retryPendingRowCopy keeps its distinct success feedback',
            retryRegion.includes('Fila pendiente copiada. Pegue en la hoja:'),
            'retry success feedback missing');
        record('X8 static: entregarFilaProyectadaCSV performs exactly one enqueue attempt via addPendingRow per delivery',
            (entregarRegion.match(/addPendingRow\(/g) || []).length === 1,
            'shared delivery helper must invoke addPendingRow exactly once per delivery (enqueue attempt; retention owned by #587)');
        record('X8 static: entregarFilaProyectadaCSV keeps the clipboard fallback/manual-copy path',
            entregarRegion.includes('copyTextWithFallback(csvData') && entregarRegion.includes('Copia manual de CSV'),
            'clipboard fallback/manual-copy path missing from the shared delivery helper');
        const exportarActStart = source.indexOf('function exportarAct497');
        const csvConsumerRegion = exportarCsvStart !== -1 && exportarActStart > exportarCsvStart ? source.slice(exportarCsvStart, exportarActStart) : '';
        const actConsumerRegion = exportarActStart !== -1 ? source.slice(exportarActStart, exportarActStart + 6000) : '';
        record('X8 static: exportarYCopiarCSV routes through the shared delivery helper',
            csvConsumerRegion.includes('entregarFilaProyectadaCSV('),
            'exportarYCopiarCSV does not call entregarFilaProyectadaCSV');
        record('X8 static: exportarAct497 routes through the shared delivery helper',
            actConsumerRegion.includes('entregarFilaProyectadaCSV('),
            'exportarAct497 does not call entregarFilaProyectadaCSV');
        record('X8 static: both shared-helper consumers keep the TXT-before-CSV gate error',
            source.split('Debe exportar TXT de esta visita antes de exportar CSV.').length - 1 >= 2,
            'TXT-gate error message must stay in both exportarYCopiarCSV and exportarAct497');
    }

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
    // X5 — T3 #583 Primera Visita notification invariants on normal delivery.
    // Functional gate: exactly one checklist, generic green success toast
    // ABSENT, unaltered legacy 497-field row delivered, dismiss works,
    // error policy. Queue retention + retry execution are KNOWN_PREEXISTING
    // (#587, NO OPERATIVA EN BASELINE) — recorded separately, never PASS.
    // =====================================================================
    {
        const context = await browser.newContext();
        try {
            await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }).catch(() => {});
            const page = await passSupportedGate(context);
            const entry = trackedPage(page);
            await page.goto(`${origin}/${PRIMERA_PAGE}`, { waitUntil: 'load', timeout: 45000 });
            await exportTxtThenCsv(page, { id: 'SYN-EXP-T3-001', pathology: 'les' });
            const checklistAppeared = await page.waitForSelector('#postExportChecklist', { timeout: 8000 }).then(() => true).catch(() => false);
            const invariants = await page.evaluate(() => {
                const checklistCount = document.querySelectorAll('#postExportChecklist').length;
                const genericToastPresent = document.body.innerHTML.includes('Datos copiados al portapapeles. Pega en la hoja:');
                let pendingRows = -1;
                try {
                    if (window.HubTools && HubTools.export && typeof HubTools.export.getPendingRows === 'function') {
                        pendingRows = HubTools.export.getPendingRows().length;
                    }
                } catch (error) { pendingRows = -2; }
                return { checklistCount, genericToastPresent, pendingRows };
            });
            const rowT3 = await readExportedRow(page);
            const checksT3 = rowT3.source !== 'none'
                ? validateRow(rowT3.text, { id: 'SYN-EXP-T3-001', marker: 'Primera Visita', token: 'les' })
                : { fields497: false, identity: false, visitMarker: false, pathologyToken: false };
            record('X5 Primera Visita success: exactly one checklist, no generic green success toast, unaltered legacy 497-field row delivered',
                checklistAppeared && invariants.checklistCount === 1 && invariants.genericToastPresent === false &&
                rowT3.source !== 'none' && checksT3.fields497 && checksT3.identity && checksT3.visitMarker && checksT3.pathologyToken,
                `checklist=${invariants.checklistCount} genericToast=${invariants.genericToastPresent} source=${rowT3.source} checks=${JSON.stringify(checksT3)}`);
            recordKnownPreexisting('X5 Primera Visita NOT_A_T3_ACCEPTANCE_GATE (#587): enqueue attempt retains pendingRows=0 in baseline',
                `pendingRows=${invariants.pendingRows} (payload without createdAt is pruned immediately; byte-identical at parent 384ec68)`);
            const retryToast = await page.evaluate(async () => {
                try { await window.HubTools.export.retryPendingRowCopy(); } catch (error) { /* observed below */ }
                await new Promise((resolve) => setTimeout(resolve, 600));
                return document.body.innerHTML.includes('Fila pendiente copiada. Pegue en la hoja:');
            });
            recordKnownPreexisting('X5 Primera Visita NOT_A_T3_ACCEPTANCE_GATE (#587): retry UX NO OPERATIVA EN BASELINE',
                `retryToast=${retryToast} (queue empty in baseline; retry code/message preserved per X8 static)`);
            await page.click('#postExportChecklist .post-export-checklist__dismiss');
            await page.waitForTimeout(600);
            const checklistAfterDismiss = await page.locator('#postExportChecklist').count();
            record('X5 Primera Visita: checklist dismiss removes the checklist',
                checklistAfterDismiss === 0,
                `checklistAfterDismiss=${checklistAfterDismiss}`);
            const pageConsoleErrors = errorsFor(entry, PRIMERA_PAGE);
            const toleratedPageErrors = entry.pageErrors.filter((message) => message.endsWith(':: Maximum call stack size exceeded.'));
            record('X5 Primera Visita: console.error=0 and no pageerror beyond the documented pre-existing pending-rows recursion',
                pageConsoleErrors.length === 0 && toleratedPageErrors.length === entry.pageErrors.length,
                `consoleErrors=${JSON.stringify(pageConsoleErrors.slice(0, 5))} pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))}`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // X6 — T3 #583 Seguimiento: same notification invariants as X5.
    // Functional gate: exactly one checklist, generic green success toast
    // ABSENT, unaltered legacy 497-field row delivered, dismiss works,
    // error policy. Queue retention + retry execution are KNOWN_PREEXISTING
    // (#587, NO OPERATIVA EN BASELINE) — recorded separately, never PASS.
    // =====================================================================
    {
        const context = await browser.newContext();
        try {
            await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }).catch(() => {});
            const page = await passSupportedGate(context);
            const entry = trackedPage(page);
            await page.goto(`${origin}/${SEGUIMIENTO_PAGE}`, { waitUntil: 'load', timeout: 45000 });
            await exportTxtThenCsv(page, { id: 'SYN-EXP-T3-002', pathology: 'espa' });
            const checklistAppeared = await page.waitForSelector('#postExportChecklist', { timeout: 8000 }).then(() => true).catch(() => false);
            const invariants = await page.evaluate(() => {
                const checklistCount = document.querySelectorAll('#postExportChecklist').length;
                const genericToastPresent = document.body.innerHTML.includes('Datos copiados al portapapeles. Pega en la hoja:');
                let pendingRows = -1;
                try {
                    if (window.HubTools && HubTools.export && typeof HubTools.export.getPendingRows === 'function') {
                        pendingRows = HubTools.export.getPendingRows().length;
                    }
                } catch (error) { pendingRows = -2; }
                return { checklistCount, genericToastPresent, pendingRows };
            });
            const rowT3 = await readExportedRow(page);
            const checksT3 = rowT3.source !== 'none'
                ? validateRow(rowT3.text, { id: 'SYN-EXP-T3-002', marker: 'Seguimiento', token: 'espa' })
                : { fields497: false, identity: false, visitMarker: false, pathologyToken: false };
            record('X6 Seguimiento success: exactly one checklist, no generic green success toast, unaltered legacy 497-field row delivered',
                checklistAppeared && invariants.checklistCount === 1 && invariants.genericToastPresent === false &&
                rowT3.source !== 'none' && checksT3.fields497 && checksT3.identity && checksT3.visitMarker && checksT3.pathologyToken,
                `checklist=${invariants.checklistCount} genericToast=${invariants.genericToastPresent} source=${rowT3.source} checks=${JSON.stringify(checksT3)}`);
            recordKnownPreexisting('X6 Seguimiento NOT_A_T3_ACCEPTANCE_GATE (#587): enqueue attempt retains pendingRows=0 in baseline',
                `pendingRows=${invariants.pendingRows} (payload without createdAt is pruned immediately; byte-identical at parent 384ec68)`);
            const retryToast = await page.evaluate(async () => {
                try { await window.HubTools.export.retryPendingRowCopy(); } catch (error) { /* observed below */ }
                await new Promise((resolve) => setTimeout(resolve, 600));
                return document.body.innerHTML.includes('Fila pendiente copiada. Pegue en la hoja:');
            });
            recordKnownPreexisting('X6 Seguimiento NOT_A_T3_ACCEPTANCE_GATE (#587): retry UX NO OPERATIVA EN BASELINE',
                `retryToast=${retryToast} (queue empty in baseline; retry code/message preserved per X8 static)`);
            await page.click('#postExportChecklist .post-export-checklist__dismiss');
            await page.waitForTimeout(600);
            const checklistAfterDismiss = await page.locator('#postExportChecklist').count();
            record('X6 Seguimiento: checklist dismiss removes the checklist',
                checklistAfterDismiss === 0,
                `checklistAfterDismiss=${checklistAfterDismiss}`);
            const pageConsoleErrors = errorsFor(entry, SEGUIMIENTO_PAGE);
            const toleratedPageErrors = entry.pageErrors.filter((message) => message.endsWith(':: Maximum call stack size exceeded.'));
            record('X6 Seguimiento: console.error=0 and no pageerror beyond the documented pre-existing pending-rows recursion',
                pageConsoleErrors.length === 0 && toleratedPageErrors.length === entry.pageErrors.length,
                `consoleErrors=${JSON.stringify(pageConsoleErrors.slice(0, 5))} pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))}`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // X7 — TXT-before-CSV gate preserved on both pages (no TXT -> gate error
    // alert, no checklist, no pageerror).
    // =====================================================================
    for (const [gatePage, gateId, gatePathology] of [[PRIMERA_PAGE, 'SYN-EXP-T3-003', 'les'], [SEGUIMIENTO_PAGE, 'SYN-EXP-T3-004', 'espa']]) {
        const context = await browser.newContext();
        try {
            await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }).catch(() => {});
            const page = await passSupportedGate(context);
            const entry = trackedPage(page);
            await page.goto(`${origin}/${gatePage}`, { waitUntil: 'load', timeout: 45000 });
            await page.fill('#idPaciente', gateId);
            await page.fill('#fechaVisita', '2026-09-28');
            await page.selectOption('#diagnosticoPrimario', gatePathology);
            await page.click('#btnEstructurarCSV');
            await page.waitForTimeout(1500);
            const gate = await page.evaluate(() => ({
                checklistCount: document.querySelectorAll('#postExportChecklist').length,
                gateAlert: Array.from(document.querySelectorAll('[role="alert"]')).some((el) => (el.textContent || '').includes('Debe exportar TXT de esta visita antes de exportar CSV.')),
            }));
            const pageConsoleErrors = errorsFor(entry, gatePage);
            record(`X7 ${gatePage}: TXT gate preserved (gate error alert, no checklist, no new pageerror)`,
                gate.gateAlert === true && gate.checklistCount === 0 && entry.pageErrors.length === 0 && pageConsoleErrors.length === 0,
                `gateAlert=${gate.gateAlert} checklist=${gate.checklistCount} consoleErrors=${JSON.stringify(pageConsoleErrors.slice(0, 5))} pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))}`);
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
if (knownPreexisting.length > 0) {
    console.log('KNOWN_PREEXISTING (NOT_A_T3_ACCEPTANCE_GATE, owned by #587; NOT counted as functional PASS):');
    for (const item of knownPreexisting) console.log(`  - ${item.name} :: ${item.detail}`);
}
console.log(`\nREUMA-EXPORT-BOUNDARY-BROWSER: ${failed.length === 0 ? 'PASS' : 'FAIL'} ${results.length - failed.length}/${results.length} cases, ${knownPreexisting.length} KNOWN_PREEXISTING`);
process.exit(failed.length === 0 ? 0 : 1);
