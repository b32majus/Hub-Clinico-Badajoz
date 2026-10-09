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
 * select, click the TXT and CSV export buttons). No DOM tampering and no
 * impossible fixtures as a supported journey: `page.addInitScript` is used
 * only for environment conditions/plants (the planted boundary double of the
 * fail-closed probe, the pendingRowsUpdated event observer, and the
 * controlled legacy hubPendingRows TEST sentinel). Clipboard/modal/storage
 * contents are read AFTER the supported interaction as post-state
 * observation; nothing is injected into the page.
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
 *       pageerror=0
 *   X3  Seguimiento happy path (EspA): same contract with the 'Seguimiento'
 *       marker; console.error=0 and pageerror=0
 *   X4  planted boundary failure (Primera Visita): no post-export checklist,
 *       NO row delivered at all (no clipboard TSV, no modal TSV — fail-closed,
 *       never a partial copy; a 496-field delivery would also fail), visible
 *       fail-closed error, no pageerror; console.error only within the
 *       explicitly classified expected classes ('Error en exportarYCopiarCSV'
 *       / 'Error al exportar CSV'); partial-copy negative witness proving a
 *       planted 496-field delivery FAILS the fail-closed evaluator
 *   X5  T3 #583 Primera Visita notification invariants on normal CSV
 *       delivery after the TXT gate: exactly one checklist, the generic
 *       green success toast ABSENT, the unaltered legacy 497-field row
 *       delivered, checklist dismiss works; console.error=0 and pageerror=0.
 *       Pending-rows retirement measured functionally after the supported
 *       export: #pendingRowsIndicator absent, the four legacy recovery APIs
 *       undefined, no hubPendingRows key written (the controlled TEST
 *       fixture sentinel stays byte-unchanged), no new storage key added and
 *       no pendingRowsUpdated event observed.
 *   X6  T3 #583 Seguimiento: same notification invariants as X5 (no seeded
 *       sentinel in this context: no hubPendingRows key may exist after the
 *       export)
 *   X7  TXT-before-CSV gate preserved on both pages: CSV without prior TXT
 *       raises the gate error alert with no checklist and no pageerror
 *   X8  T3 #583 static notification invariants in modules/exportManager.js:
 *       the shared delivery helper raises no generic green success toast
 *       while keeping the checklist, the copy-error/fallback/manual-copy
 *       path; both consumers (exportarYCopiarCSV, exportarAct497) still
 *       route through the helper and keep the TXT gate; the module is
 *       queue-free (zero addPendingRow / pendingRowsUpdated / hubPendingRows
 *       / PENDING_ROWS_ tokens in the helper and the whole module) and the
 *       legacy recovery API is GONE (no function retryPendingRowCopy /
 *       getPendingRows / getLatestPendingRow / resolvePendingRow)
 *
 * RETIRED PENDING-ROWS CONTRACT (T4 reconciliation,
 * TRAIN-NEXUS-REUMA-EXPORT-SAFETY-18 / WO-REUMA-EXPORT-SAFETY-18D): the
 * pending-rows queue (`hubPendingRows`), the `pendingRowsUpdated` event, the
 * `HubTools.export` recovery API (getPendingRows / getLatestPendingRow /
 * resolvePendingRow / retryPendingRowCopy) and the `pendingRowsIndicator`
 * UI are GONE from runtime; the mutual recursion that threw "Maximum call
 * stack size exceeded" after every successful CSV export no longer exists.
 * The former KNOWN_PREEXISTING baseline tolerances (queue retention,
 * retry UX, tolerated recursion pageerror) are REMOVED: happy paths now
 * require console.error=0 and pageerror=0, and the former queue/retry
 * KNOWN_PREEXISTING observations were replaced by the functional X5/X6
 * retirement assertions above. Pre-existing legacy hubPendingRows content
 * is neither read nor cleared by the code under test; when this checker
 * seeds a sentinel it is a controlled TEST fixture, never a supported
 * journey input.
 *
 * Usage: node tools/reuma_export_boundary_browser_check.mjs
 * Documented env var: PLAYWRIGHT_CHROMIUM_EXECUTABLE (headless-shell path).
 * Exit code 0 = every case PASS, 1 = at least one FAIL or environment
 * failure.
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

// ---------------------------------------------------------------------------
// Pending-rows retirement observation (T4, TRAIN-NEXUS-REUMA-EXPORT-SAFETY-18).
// Event observation only: the init script counts pendingRowsUpdated
// dispatches through EventTarget. The legacy hubPendingRows sentinel fixture
// is a controlled TEST seeding via init script, never a supported journey
// input, and the code under test must leave it byte-unchanged.
// ---------------------------------------------------------------------------

const LEGACY_HUB_PENDING_ROWS_SENTINEL = JSON.stringify([
    { id: 'SYN-LEGACY-BROWSER-000', content: 'SYN-LEGACY-ROW', sheet: 'LEGACY', createdAt: 1 },
]);

const pendingRowsEventObserver = () => {
    window.__pendingRowsUpdatedEvents = 0;
    const originalDispatchEvent = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function (event) {
        if (event && event.type === 'pendingRowsUpdated') {
            window.__pendingRowsUpdatedEvents = (window.__pendingRowsUpdatedEvents || 0) + 1;
        }
        return originalDispatchEvent.call(this, event);
    };
};

// Self-contained on purpose: Playwright serializes init scripts WITHOUT
// their closure scope, so the sentinel cannot be captured as a free
// variable. JSON.stringify is deterministic for this shape in the page.
const legacySentinelFixture = () => {
    try {
        window.localStorage.setItem('hubPendingRows', JSON.stringify([
            { id: 'SYN-LEGACY-BROWSER-000', content: 'SYN-LEGACY-ROW', sheet: 'LEGACY', createdAt: 1 },
        ]));
    } catch (error) { /* the byte-unchanged assertion fails closed on seeding failure */ }
};

/**
 * Post-state retirement observation, read AFTER the supported export:
 * indicator absence, recovery-API absence, storage keys/values and the
 * pendingRowsUpdated count observed by the init-script observer. A value of
 * -1 for the event count means the observer was not installed (fail-closed).
 */
async function readRetirementState(page) {
    return page.evaluate(() => ({
        pendingRowsIndicatorCount: document.querySelectorAll('#pendingRowsIndicator').length,
        recoveryApis: ['getPendingRows', 'getLatestPendingRow', 'resolvePendingRow', 'retryPendingRowCopy']
            .filter((name) => typeof window.HubTools?.export?.[name] !== 'undefined'),
        storageKeys: Object.keys(window.localStorage),
        hubPendingRowsValue: window.localStorage.getItem('hubPendingRows'),
        pendingRowsUpdatedEvents: window.__pendingRowsUpdatedEvents === undefined ? -1 : window.__pendingRowsUpdatedEvents,
    }));
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
    // X8 — T3 #583 static notification invariants in modules/exportManager.js,
    // updated to the retired pending-rows contract (T4,
    // TRAIN-NEXUS-REUMA-EXPORT-SAFETY-18): queue/event tokens must be absent
    // from the helper AND the whole module, and the legacy recovery API must
    // be GONE.
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
        const queueTokens = ['addPendingRow', 'pendingRowsUpdated', 'hubPendingRows', 'PENDING_ROWS_'];
        const moduleQueueHits = queueTokens
            .map((token) => [token, source.split(token).length - 1])
            .filter(([, hits]) => hits > 0);
        const helperQueueHits = queueTokens.filter((token) => entregarRegion.includes(token));
        record('X8 static: entregarFilaProyectadaCSV and the whole module are queue-free (zero addPendingRow/pendingRowsUpdated/hubPendingRows/PENDING_ROWS_ tokens)',
            entregarRegion.length > 0 && helperQueueHits.length === 0 && moduleQueueHits.length === 0,
            `helperHits=${JSON.stringify(helperQueueHits)} moduleHits=${JSON.stringify(moduleQueueHits)}`);
        const recoveryApiTokens = ['retryPendingRowCopy', 'getPendingRows', 'getLatestPendingRow', 'resolvePendingRow'];
        const recoveryApiHits = recoveryApiTokens
            .map((token) => [token, source.split(token).length - 1])
            .filter(([, hits]) => hits > 0);
        record('X8 static: the legacy pending-rows recovery API is GONE (no retryPendingRowCopy/getPendingRows/getLatestPendingRow/resolvePendingRow in the module)',
            recoveryApiHits.length === 0,
            `recoveryApiHits=${JSON.stringify(recoveryApiHits)}`);
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

    /**
     * F4 fail-closed delivery evaluator (WO:17 'no copiar fila parcial'): when
     * the boundary rejects, NO row may be delivered at all — no clipboard TSV
     * and no manual-modal TSV — regardless of field count (a 496-field partial
     * row is a violation, never a pass).
     */
    const evaluateFailClosedDelivery = (row, { checklistCount, failClosedVisible }) => {
        const problems = [];
        if (!row || row.source !== 'none' || row.text !== '') {
            problems.push(`row delivered via ${row ? row.source : 'unknown'} (${row && row.text ? row.text.split('\t').length : 0} fields)`);
        }
        if (checklistCount !== 0) problems.push(`checklist=${checklistCount}`);
        if (failClosedVisible !== true) problems.push('fail-closed alert not visible');
        return { pass: problems.length === 0, problems };
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
            record('X2 Primera Visita happy path: console.error=0 and pageerror=0 (retired pending-rows contract: no tolerated recursion)',
                pageConsoleErrors.length === 0 && entry.pageErrors.length === 0,
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
            record('X3 Seguimiento happy path: console.error=0 and pageerror=0 (retired pending-rows contract: no tolerated recursion)',
                pageConsoleErrors.length === 0 && entry.pageErrors.length === 0,
                `consoleErrors=${JSON.stringify(pageConsoleErrors.slice(0, 5))} pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))}`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // X5 — T3 #583 Primera Visita notification invariants on normal delivery.
    // Functional gate: exactly one checklist, generic green success toast
    // ABSENT, unaltered legacy 497-field row delivered, dismiss works,
    // console.error=0 and pageerror=0. Pending-rows retirement is measured
    // functionally after the supported export (T4): indicator absent,
    // recovery APIs undefined, no new storage key, sentinel byte-unchanged,
    // no pendingRowsUpdated event.
    // =====================================================================
    {
        const context = await browser.newContext();
        try {
            await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }).catch(() => {});
            await context.addInitScript(pendingRowsEventObserver);
            await context.addInitScript(legacySentinelFixture);
            const page = await passSupportedGate(context);
            const entry = trackedPage(page);
            await page.goto(`${origin}/${PRIMERA_PAGE}`, { waitUntil: 'load', timeout: 45000 });
            const keysBeforeExport = await page.evaluate(() => Object.keys(window.localStorage));
            await exportTxtThenCsv(page, { id: 'SYN-EXP-T3-001', pathology: 'les' });
            const checklistAppeared = await page.waitForSelector('#postExportChecklist', { timeout: 8000 }).then(() => true).catch(() => false);
            const invariants = await page.evaluate(() => {
                const checklistCount = document.querySelectorAll('#postExportChecklist').length;
                const genericToastPresent = document.body.innerHTML.includes('Datos copiados al portapapeles. Pega en la hoja:');
                return { checklistCount, genericToastPresent };
            });
            const rowT3 = await readExportedRow(page);
            const checksT3 = rowT3.source !== 'none'
                ? validateRow(rowT3.text, { id: 'SYN-EXP-T3-001', marker: 'Primera Visita', token: 'les' })
                : { fields497: false, identity: false, visitMarker: false, pathologyToken: false };
            record('X5 Primera Visita success: exactly one checklist, no generic green success toast, unaltered legacy 497-field row delivered',
                checklistAppeared && invariants.checklistCount === 1 && invariants.genericToastPresent === false &&
                rowT3.source !== 'none' && checksT3.fields497 && checksT3.identity && checksT3.visitMarker && checksT3.pathologyToken,
                `checklist=${invariants.checklistCount} genericToast=${invariants.genericToastPresent} source=${rowT3.source} checks=${JSON.stringify(checksT3)}`);
            const retirement = await readRetirementState(page);
            const newStorageKeys = retirement.storageKeys.filter((key) => !keysBeforeExport.includes(key));
            record('X5 Primera Visita retirement: #pendingRowsIndicator absent, the four legacy recovery APIs undefined, no pendingRowsUpdated event observed',
                retirement.pendingRowsIndicatorCount === 0 && retirement.recoveryApis.length === 0 && retirement.pendingRowsUpdatedEvents === 0,
                `indicator=${retirement.pendingRowsIndicatorCount} recoveryApis=${JSON.stringify(retirement.recoveryApis)} pendingRowsUpdatedEvents=${retirement.pendingRowsUpdatedEvents}`);
            record('X5 Primera Visita retirement: no new storage key written by the export and the controlled legacy hubPendingRows TEST sentinel stays byte-unchanged',
                newStorageKeys.length === 0 && retirement.hubPendingRowsValue === LEGACY_HUB_PENDING_ROWS_SENTINEL,
                `newKeys=${JSON.stringify(newStorageKeys)} sentinelUnchanged=${retirement.hubPendingRowsValue === LEGACY_HUB_PENDING_ROWS_SENTINEL}`);
            await page.click('#postExportChecklist .post-export-checklist__dismiss');
            await page.waitForTimeout(600);
            const checklistAfterDismiss = await page.locator('#postExportChecklist').count();
            record('X5 Primera Visita: checklist dismiss removes the checklist',
                checklistAfterDismiss === 0,
                `checklistAfterDismiss=${checklistAfterDismiss}`);
            const pageConsoleErrors = errorsFor(entry, PRIMERA_PAGE);
            record('X5 Primera Visita: console.error=0 and pageerror=0 (retired pending-rows contract: no tolerated recursion)',
                pageConsoleErrors.length === 0 && entry.pageErrors.length === 0,
                `consoleErrors=${JSON.stringify(pageConsoleErrors.slice(0, 5))} pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))}`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // X6 — T3 #583 Seguimiento: same notification invariants as X5. No
    // seeded sentinel in this context: no hubPendingRows key may exist after
    // the export.
    // =====================================================================
    {
        const context = await browser.newContext();
        try {
            await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }).catch(() => {});
            await context.addInitScript(pendingRowsEventObserver);
            const page = await passSupportedGate(context);
            const entry = trackedPage(page);
            await page.goto(`${origin}/${SEGUIMIENTO_PAGE}`, { waitUntil: 'load', timeout: 45000 });
            const keysBeforeExport = await page.evaluate(() => Object.keys(window.localStorage));
            await exportTxtThenCsv(page, { id: 'SYN-EXP-T3-002', pathology: 'espa' });
            const checklistAppeared = await page.waitForSelector('#postExportChecklist', { timeout: 8000 }).then(() => true).catch(() => false);
            const invariants = await page.evaluate(() => {
                const checklistCount = document.querySelectorAll('#postExportChecklist').length;
                const genericToastPresent = document.body.innerHTML.includes('Datos copiados al portapapeles. Pega en la hoja:');
                return { checklistCount, genericToastPresent };
            });
            const rowT3 = await readExportedRow(page);
            const checksT3 = rowT3.source !== 'none'
                ? validateRow(rowT3.text, { id: 'SYN-EXP-T3-002', marker: 'Seguimiento', token: 'espa' })
                : { fields497: false, identity: false, visitMarker: false, pathologyToken: false };
            record('X6 Seguimiento success: exactly one checklist, no generic green success toast, unaltered legacy 497-field row delivered',
                checklistAppeared && invariants.checklistCount === 1 && invariants.genericToastPresent === false &&
                rowT3.source !== 'none' && checksT3.fields497 && checksT3.identity && checksT3.visitMarker && checksT3.pathologyToken,
                `checklist=${invariants.checklistCount} genericToast=${invariants.genericToastPresent} source=${rowT3.source} checks=${JSON.stringify(checksT3)}`);
            const retirement = await readRetirementState(page);
            const newStorageKeys = retirement.storageKeys.filter((key) => !keysBeforeExport.includes(key));
            record('X6 Seguimiento retirement: #pendingRowsIndicator absent, the four legacy recovery APIs undefined, no pendingRowsUpdated event observed',
                retirement.pendingRowsIndicatorCount === 0 && retirement.recoveryApis.length === 0 && retirement.pendingRowsUpdatedEvents === 0,
                `indicator=${retirement.pendingRowsIndicatorCount} recoveryApis=${JSON.stringify(retirement.recoveryApis)} pendingRowsUpdatedEvents=${retirement.pendingRowsUpdatedEvents}`);
            record('X6 Seguimiento retirement: the export writes no storage key and creates no hubPendingRows key at all',
                newStorageKeys.length === 0 && retirement.storageKeys.includes('hubPendingRows') === false && retirement.hubPendingRowsValue === null,
                `newKeys=${JSON.stringify(newStorageKeys)} hubPendingRowsPresent=${retirement.storageKeys.includes('hubPendingRows')} hubPendingRowsValue=${JSON.stringify(retirement.hubPendingRowsValue)}`);
            await page.click('#postExportChecklist .post-export-checklist__dismiss');
            await page.waitForTimeout(600);
            const checklistAfterDismiss = await page.locator('#postExportChecklist').count();
            record('X6 Seguimiento: checklist dismiss removes the checklist',
                checklistAfterDismiss === 0,
                `checklistAfterDismiss=${checklistAfterDismiss}`);
            const pageConsoleErrors = errorsFor(entry, SEGUIMIENTO_PAGE);
            record('X6 Seguimiento: console.error=0 and pageerror=0 (retired pending-rows contract: no tolerated recursion)',
                pageConsoleErrors.length === 0 && entry.pageErrors.length === 0,
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
            // F4 fail-closed (WO:17 'no copiar fila parcial'): NO row may be
            // delivered at all — a 496-field partial row is also a violation.
            const noDeliveryVerdict = evaluateFailClosedDelivery(row, { checklistCount, failClosedVisible });
            record('X4 planted boundary failure: fail-closed visible error, no post-export checklist and NO row delivered at all (no clipboard TSV, no modal TSV — fail-closed, never a partial copy)',
                noDeliveryVerdict.pass && entry.pageErrors.length === 0 && pageConsoleErrors.length === 0,
                `problems=${JSON.stringify(noDeliveryVerdict.problems)} failClosedVisible=${failClosedVisible} checklist=${checklistCount} rowSource=${row.source} rowFields=${rowFields} ` +
                `alerts=${JSON.stringify(alerts)} consoleErrors=${JSON.stringify(pageConsoleErrors.slice(0, 5))} pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))}`);
            // Partial-copy negative witness (F4): a planted 496-field partial
            // delivery must FAIL the same fail-closed evaluator used by X4,
            // while a true no-delivery state passes it.
            const partialDelivery = { source: 'clipboard', text: Array.from({ length: 496 }, (_, i) => `F${i}`).join('\t') };
            const plantedPartial = evaluateFailClosedDelivery(partialDelivery, { checklistCount: 0, failClosedVisible: true });
            const cleanNone = evaluateFailClosedDelivery({ source: 'none', text: '' }, { checklistCount: 0, failClosedVisible: true });
            record('X4 partial-copy witness: a planted 496-field partial delivery FAILS the fail-closed no-row evaluator while a true no-delivery state passes it',
                plantedPartial.pass === false && cleanNone.pass === true,
                `plantedPass=${plantedPartial.pass} plantedProblems=${JSON.stringify(plantedPartial.problems)} cleanPass=${cleanNone.pass}`);
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
