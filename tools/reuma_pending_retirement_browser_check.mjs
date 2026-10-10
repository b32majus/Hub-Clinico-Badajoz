#!/usr/bin/env node
'use strict';
/**
 * Browser QA for WO-REUMA-EXPORT-SAFETY-18D (T4, TRAIN-NEXUS-REUMA-EXPORT-
 * SAFETY-18): integrated retirement browser check proving that the Reuma
 * pending-rows affordances are GONE from every supported page/journey while
 * the TXT→CSV 497 transport, its TXT gate, the fail-closed boundary path,
 * the manual-copy modal and the post-export checklist keep working.
 *
 * RETIRED CONTRACT under test (decisions 1–6 of the train handoff): the
 * pending-rows queue (`hubPendingRows`), the `pendingRowsUpdated` event, the
 * `HubTools.export` recovery API (getPendingRows / getLatestPendingRow /
 * resolvePendingRow / retryPendingRowCopy) and the `pendingRowsIndicator`
 * UI no longer exist; no clinical row is ever written to Web Storage; a
 * pre-existing legacy `hubPendingRows` entry is neither read, rewritten nor
 * cleared (a seeded sentinel stays byte-unchanged); empty contexts and
 * Web Storage denial fail safe without clinical storage.
 *
 * Conventions (same as `tools/reuma_export_boundary_browser_check.mjs` /
 * `tools/reuma_act_cutover_browser_check.mjs`): real repo-root HTTP server,
 * the real session gate on reuma_index.html (file input → professional
 * select → confirm), real navigation and real supported interactions (fill,
 * select, click the TXT and CSV export buttons, dismiss the checklist).
 * Synthetic data only (`SYN-*` ids); the temporary XLSX lives outside the
 * repository.
 *
 * Evidence limits: supported interactions only — no DOM tampering and no
 * impossible fixtures as a supported journey. `page.addInitScript` is used
 * ONLY for environment conditions/plants (clipboard rejection, Web Storage
 * denial, the controlled legacy `hubPendingRows` TEST sentinel, the planted
 * boundary double, the pendingRowsUpdated observer/dispatch plants). Every
 * planted dispatch/write is a negative witness executed against the real
 * page; clipboard/modal/storage contents are read AFTER the supported
 * interaction as post-state observation; nothing is injected into the page.
 *
 * PATHOLOGY COVERAGE MAPPING: this checker exercises real controls with
 * `les` on Primera Visita and `espa` on Seguimiento. The FULL
 * 5-pathology × 2-journeys matrix (espa/aps/ar/les/sjogren) is covered by
 * the reconciled happy paths H1/H2 of
 * `tools/reuma_act_cutover_browser_check.mjs`, which run the same supported
 * TXT→CSV route on both journeys for every pathology with pageerror=0.
 *
 * Cases:
 *   R1  Primera Visita happy path (les): real fill → TXT export → CSV export;
 *       copied row is a 497-field TSV with identity, 'Primera Visita' marker
 *       and 'les' token, and is BYTE-IDENTICAL (full string equality, F3) to
 *       the legacy 497 row recomputed in-page from the same collected payload;
 *       exactly ONE checklist whose header is
 *       'CSV copiado al portapapeles'; dismiss works; pageerror=0 and
 *       console.error=0 for the page; #pendingRowsIndicator absent and no
 *       'Recuperar última'/'Marcar resuelta' text; the four recovery APIs
 *       undefined; no pendingRowsUpdated event observed; no hubPendingRows
 *       key and no new storage key written by the export.
 *   R2  Seguimiento happy path (espa): same contract with the 'Seguimiento'
 *       marker and 'espa' token.
 *   R3  TXT-gate negative (CSV without TXT): gate alert, no checklist, no
 *       storage write, pageerror=0.
 *   R4  Planted boundary failure (init-script double, #457 pattern):
 *       fail-closed 'frontera de compatibilidad' alert, no checklist, no
 *       497-field row copied; expected console errors explicitly classified
 *       ('Error en exportarYCopiarCSV' / 'Error al exportar CSV'); pageerror=0.
 *   R5  Clipboard rejected (planted writeText rejection armed AFTER the TXT
 *       step, right before the CSV click, so the TXT happy path stays
 *       clean): the manual modal 'Copia manual de CSV' is visible with the
 *       FULL 497-field row, the info text 'No se pudo copiar automáticamente'
 *       is present, #postExportChecklist is ABSENT, no visible claim that the
 *       CSV was copied; pageerror=0 and any console.error of the controlled
 *       failure explicitly classified (never reported as a clean-route zero).
 *   R5b Stale-checklist transition (F1, WO-REUMA-EXPORT-SAFETY-18D-C1): a
 *       successful export leaves the real success checklist visible; a
 *       SECOND export inside the checklist window whose clipboard write is
 *       rejected opens the manual modal and the stale 'CSV copiado al
 *       portapapeles' claim must be GONE (no #postExportChecklist, no
 *       visible copy claim) while the modal shows the failure; pageerror=0.
 *   R6  Legacy storage TEST fixture (controlled, init-script only): a
 *       sentinel seeded in localStorage['hubPendingRows'] stays byte-
 *       UNCHANGED after a supported export (not read into the UI, not
 *       cleared, not rewritten) and no new storage key is added.
 *   R7  Web Storage failure/denial: localStorage.setItem/getItem throw
 *       (armed after page load, so the page itself initializes with its real
 *       storage); the supported export still completes safely (497 copy +
 *       checklist); any attempted clinical write would surface through the
 *       throwing storage, so pageerror=0 plus classified console errors
 *       proves no clinical storage was written.
 *   R8  Empty context (fresh context, no seeded storage): the session gate
 *       and the export work from zero; no residual panel; safe without
 *       clinical storage.
 *   R9  Eight-page verification: dashboard_paciente.html, dashboard_search.html,
 *       estadisticas.html, manage_drugs.html, manage_professionals.html,
 *       primera_visita.html, reuma_index.html, seguimiento.html — each loads
 *       without pageerror, without #pendingRowsIndicator/pending-rows
 *       controls, with `script.js?v=20261009-export-safety-18-script-r1`, and
 *       with `modules/exportManager.js?v=20261010-txt-gate-21-
 *       csv-noapi-r1` on the seven pages that load it (not
 *       dashboard_search.html).
 *   W1–W5  negative-witness self-tests (mandatory, repo convention): a real
 *       page dispatch of `pendingRowsUpdated` (W1), a real page write of
 *       `hubPendingRows` (W2), a tampered legacy sentinel (W3), a falsified
 *       497 row including a MIDDLE-field corruption caught by the
 *       byte-equality evaluator (W4) and a planted 496-field partial
 *       delivery caught by the fail-closed no-row evaluator (W5) must each
 *       be detected as FAIL by the corresponding evaluator, while the clean
 *       state passes.
 *
 * Usage: node tools/reuma_pending_retirement_browser_check.mjs
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

const PAGE_INDEX = 'reuma_index.html';
const PAGE_PRIMERA = 'primera_visita.html';
const PAGE_SEGUIMIENTO = 'seguimiento.html';
const SCRIPT_TOKEN = 'script.js?v=20261009-export-safety-18-script-r1';
const EXPORT_MANAGER_TOKEN = 'modules/exportManager.js?v=20261010-txt-gate-21-csv-noapi-r1';
const EXPORT_MANAGER_PAGES = [
    'dashboard_paciente.html', 'estadisticas.html', 'manage_drugs.html',
    'manage_professionals.html', 'primera_visita.html', 'reuma_index.html',
    'seguimiento.html',
];
const ALL_PAGES = [
    'dashboard_paciente.html', 'dashboard_search.html', 'estadisticas.html',
    'manage_drugs.html', 'manage_professionals.html', 'primera_visita.html',
    'reuma_index.html', 'seguimiento.html',
];
const TXT_GATE_MESSAGE = 'Debe exportar TXT de esta visita antes de exportar CSV.';
const MANUAL_COPY_MODAL_TITLE = 'Copia manual de CSV';
const MANUAL_COPY_INFO_TEXT = 'No se pudo copiar autom\u00e1ticamente';
const CHECKLIST_HEADER_TEXT = 'CSV copiado al portapapeles';
const EXPECTED_BOUNDARY_ERROR_CLASSES = ['Error en exportarYCopiarCSV', 'Error al exportar CSV'];
const EXPECTED_CLIPBOARD_FAILURE_CLASSES = ['Error al copiar los datos al portapapeles.'];
const EXPECTED_STORAGE_DENIAL_CLASSES = ['planted storage denial'];

const results = [];
function record(name, pass, detail) {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

// Same documented Playwright resolution as the other browser checkers.
function loadPlaywrightFromNpx() {
    const tryNodeModules = (nodeModules) => {
        const pkg = path.join(nodeModules, 'playwright', 'package.json');
        return existsSync(pkg) ? createRequire(path.join(nodeModules, '__reuma_pending_retirement_loader.cjs'))('playwright') : null;
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
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/reuma_pending_retirement_browser_check.mjs');
}

let chromium;
try {
    ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
    console.error('ENVIRONMENT FAILURE: ' + err.message);
    console.log('\nREUMA-PENDING-RETIREMENT-BROWSER: FAIL 0/0');
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
// Synthetic session fixture (temporary, outside the repository) + repo-root
// HTTP server, mirroring tools/reuma_act_cutover_browser_check.mjs.
// ---------------------------------------------------------------------------

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'reuma-pending-retirement-browser-'));
const workbookPath = path.join(tempDir, 'reuma_pending_retirement_synthetic.xlsx');
{
    const workbook = XLSX.utils.book_new();
    for (const sheetName of ['ESPA', 'APS', 'AR', 'LES', 'SJOGREN']) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
            { ID_Paciente: 'SYN-000-000' },
        ]), sheetName);
    }
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
// Supported session gate + page bookkeeping.
// ---------------------------------------------------------------------------

async function passSupportedGate(browser, origin) {
    const context = await browser.newContext();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }).catch(() => {});
    const page = await context.newPage();
    await page.goto(`${origin}/${PAGE_INDEX}`, { waitUntil: 'load', timeout: 45000 });
    await page.setInputFiles('#gateExcelInput', workbookPath);
    await page.waitForSelector('#gateStepSelect:not(.hidden)', { timeout: 20000 });
    const professional = await page.evaluate(() => {
        const select = document.getElementById('gateProfessionalSelect');
        return select ? Array.from(select.options).map((option) => option.value).find(Boolean) || '' : '';
    });
    await page.selectOption('#gateProfessionalSelect', professional);
    await page.click('#gateConfirmBtn');
    await page.waitForFunction(() => document.getElementById('sessionGate').classList.contains('hidden'), null, { timeout: 10000 });
    await page.close();
    return context;
}

function trackedPage(page) {
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(`${page.url()} :: ${message.text()}`);
    });
    page.on('pageerror', (error) => pageErrors.push(`${page.url()} :: ${error.message}`));
    return { consoleErrors, pageErrors };
}

function errorsFor(entry, pageFile) {
    return entry.consoleErrors.filter((message) => message.includes(pageFile));
}

// ---------------------------------------------------------------------------
// Supported interactions.
// ---------------------------------------------------------------------------

/**
 * Supported export flow: identity/date/pathology, TXT export (the legal
 * prerequisite), close the manual-copy modal if the environment has no
 * clipboard permission, then click the CSV export button.
 */
async function exportTxtThenCsv(page, { id, pathology }) {
    await page.fill('#idPaciente', id);
    await page.fill('#fechaVisita', '2026-09-30');
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

/**
 * F3 byte-equality source: recompute the projected legacy 497 row IN-PAGE for
 * the same collected payload via the supported re-collection
 * (`HubTools.form.recopilarDatosFormulario` / `…Seguimiento`) and the real
 * boundary `HubTools.reumaExportBoundary.generateLegacyRow497`, exactly the
 * inputs the supported delivery used (WO:48 'copia/portapapeles de 497
 * valores byte-iguales'). Read-only observation after the supported
 * interaction; nothing is injected.
 */
function recomputeLegacyRow497(page, { kind, pathology }) {
    return page.evaluate(({ kind, pathology }) => {
        const collect = kind === 'primera'
            ? window.HubTools?.form?.recopilarDatosFormulario
            : window.HubTools?.form?.recopilarDatosFormularioSeguimiento;
        if (typeof collect !== 'function') return { ok: false, reason: 'supported re-collection function unavailable' };
        const boundary = window.HubTools?.reumaExportBoundary;
        if (!boundary || typeof boundary.generateLegacyRow497 !== 'function') return { ok: false, reason: 'boundary unavailable' };
        let datos;
        try { datos = collect(); } catch (error) { return { ok: false, reason: 're-collection crashed: ' + error.message }; }
        let result;
        try { result = boundary.generateLegacyRow497({ datos: datos, pathology: pathology, tipoVisita: kind }); } catch (error) { return { ok: false, reason: 'boundary crashed: ' + error.message }; }
        if (!result || result.ok !== true || typeof result.row !== 'string') return { ok: false, reason: 'boundary rejected the re-collection' };
        return { ok: true, row: result.row };
    }, { kind, pathology });
}

// ---------------------------------------------------------------------------
// Environment conditions / plants (init scripts, self-contained on purpose:
// Playwright serializes init scripts WITHOUT their closure scope).
// ---------------------------------------------------------------------------

/** Counts every pendingRowsUpdated dispatch through EventTarget (observer). */
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

/** Controlled TEST fixture: seeds a legacy hubPendingRows sentinel. */
const legacySentinelFixture = () => {
    try {
        window.localStorage.setItem('hubPendingRows', JSON.stringify([
            { id: 'SYN-LEGACY-RETIRE-000', content: 'SYN-LEGACY-ROW', sheet: 'LEGACY', createdAt: 1 },
        ]));
    } catch (error) { /* the byte-unchanged assertion fails closed on seeding failure */ }
};

/** Planted boundary double, exactly the #457/#464 pattern. */
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

/**
 * Planted clipboard rejection: armed by the checker via
 * `window.__rejectClipboardWrite = true` AFTER the TXT step so the TXT happy
 * path stays clean and only the CSV write is rejected.
 */
const clipboardRejectionPlant = () => {
    window.__rejectClipboardWrite = false;
    window.__clipboardWriteAttempts = 0;
    const wrap = () => {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function' || navigator.clipboard.__planted) return;
        const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
        try {
            Object.defineProperty(navigator.clipboard, 'writeText', {
                configurable: true,
                value: (text) => {
                    window.__clipboardWriteAttempts += 1;
                    if (window.__rejectClipboardWrite === true) {
                        return Promise.reject(new Error('planted clipboard rejection (QA)'));
                    }
                    return originalWriteText(text);
                },
            });
            navigator.clipboard.__planted = true;
        } catch (error) { /* leave the original writeText in place */ }
    };
    wrap();
    window.addEventListener('load', wrap);
};

/**
 * Web Storage denial: localStorage.setItem/getItem/removeItem/clear throw.
 * Armed on window load so the page's own DOMContentLoaded initialization runs
 * with its real storage (the denial is active for the whole supported export).
 */
const storageDenialPlant = () => {
    const deny = () => {
        ['setItem', 'getItem', 'removeItem', 'clear'].forEach((method) => {
            try {
                Object.defineProperty(window.localStorage, method, {
                    configurable: true,
                    value: () => { throw new Error('planted storage denial (QA)'); },
                });
            } catch (error) { /* leave the original method in place */ }
        });
    };
    if (document.readyState === 'complete') deny();
    else window.addEventListener('load', deny);
};

// ---------------------------------------------------------------------------
// Retirement evaluators (single authority for the clean cases AND the
// negative witnesses).
// ---------------------------------------------------------------------------

const LEGACY_HUB_PENDING_ROWS_SENTINEL = JSON.stringify([
    { id: 'SYN-LEGACY-RETIRE-000', content: 'SYN-LEGACY-ROW', sheet: 'LEGACY', createdAt: 1 },
]);

/**
 * Post-state retirement observation, read AFTER the supported interaction.
 * `hubPendingRowsValue` is '<denied>' when getItem itself throws (R7): with
 * writes denied, any attempted clinical write surfaces as an error, so the
 * storage dimension is evaluated through the error policy instead.
 */
async function readRetirementState(page) {
    return page.evaluate(() => {
        let hubPendingRowsValue;
        try {
            hubPendingRowsValue = window.localStorage.getItem('hubPendingRows');
        } catch (error) {
            hubPendingRowsValue = '<denied>';
        }
        return {
            pendingRowsIndicatorCount: document.querySelectorAll('#pendingRowsIndicator').length,
            pendingRowsControlsVisible: document.body.innerText.includes('Recuperar \u00faltima')
                || document.body.innerText.includes('Marcar resuelta'),
            recoveryApis: ['getPendingRows', 'getLatestPendingRow', 'resolvePendingRow', 'retryPendingRowCopy']
                .filter((name) => typeof window.HubTools?.export?.[name] !== 'undefined'),
            storageKeys: Object.keys(window.localStorage),
            hubPendingRowsValue,
            pendingRowsUpdatedEvents: window.__pendingRowsUpdatedEvents === undefined ? -1 : window.__pendingRowsUpdatedEvents,
        };
    });
}

/**
 * Retirement evaluator: the retired pending-rows contract. With
 * `legacySentinel` the seeded sentinel must be byte-unchanged; without it no
 * hubPendingRows key may exist. With `storageReadable: false` (denial case)
 * the storage dimension is skipped — writes already surface as errors.
 */
function evaluateRetirementState(state, options = {}) {
    const problems = [];
    if (state.pendingRowsIndicatorCount !== 0) problems.push(`pendingRowsIndicatorCount=${state.pendingRowsIndicatorCount}`);
    if (state.pendingRowsControlsVisible === true) problems.push('pending-rows controls visible');
    if (state.recoveryApis.length !== 0) problems.push(`recoveryApis=${state.recoveryApis.join('|')}`);
    if (state.pendingRowsUpdatedEvents !== 0) problems.push(`pendingRowsUpdatedEvents=${state.pendingRowsUpdatedEvents}`);
    if (options.storageReadable !== false) {
        if (options.legacySentinel !== undefined) {
            if (state.hubPendingRowsValue !== options.legacySentinel) problems.push('legacy hubPendingRows sentinel modified');
        } else if (state.hubPendingRowsValue !== null) {
            problems.push(`hubPendingRows=${JSON.stringify(state.hubPendingRowsValue)}`);
        }
    }
    return { pass: problems.length === 0, problems };
}

/** 497-row evaluator: field count + identity + visit marker + pathology token. */
function evaluateRow497(rowText, { id, marker, token }) {
    if (typeof rowText !== 'string' || rowText.length === 0) return { pass: false, problems: ['row is empty'] };
    const fields = rowText.split('\t');
    const problems = [];
    if (fields.length !== 497) problems.push(`fields=${fields.length}, expected 497`);
    if (fields[0] !== id) problems.push(`identity=${JSON.stringify(fields[0])}, expected ${JSON.stringify(id)}`);
    if (fields[4] !== marker) problems.push(`visitMarker=${JSON.stringify(fields[4])}, expected ${JSON.stringify(marker)}`);
    if (fields[6] !== token) problems.push(`pathologyToken=${JSON.stringify(fields[6])}, expected ${JSON.stringify(token)}`);
    return { pass: problems.length === 0, problems };
}

/**
 * F3 byte-equality evaluator (WO:48 '497 valores byte-iguales'): FULL string
 * equality between the delivered text and the row recomputed in-page from the
 * same collected payload. Count/index sampling cannot detect corruption of any
 * other field; this can. A recompute that is not byte-stable fails closed
 * here (never forced to pass).
 */
function evaluateRowByteEqual(delivered, recomputed) {
    if (!recomputed || recomputed.ok !== true) {
        return { pass: false, problems: [`byte-equality source unavailable: ${recomputed ? recomputed.reason : 'no recompute result'}`] };
    }
    if (typeof delivered !== 'string' || delivered.length === 0) return { pass: false, problems: ['delivered row is empty'] };
    if (delivered !== recomputed.row) {
        const deliveredFields = delivered.split('\t');
        const expectedFields = recomputed.row.split('\t');
        const problems = [`byteDiff=true deliveredFields=${deliveredFields.length} expectedFields=${expectedFields.length}`];
        for (let i = 0; i < Math.min(deliveredFields.length, expectedFields.length); i++) {
            if (deliveredFields[i] !== expectedFields[i]) { problems.push(`firstDiffField=${i}`); break; }
        }
        return { pass: false, problems };
    }
    return { pass: true, problems: [] };
}

/**
 * F4 fail-closed delivery evaluator (WO:17 'no copiar fila parcial'): when the
 * boundary rejects, NO row may be delivered at all — no clipboard TSV and no
 * manual-modal TSV — regardless of field count (a 496-field partial row is a
 * violation, never a pass).
 */
function evaluateNoRowDelivered(row, { checklistCount, failClosedVisible }) {
    const problems = [];
    if (!row || row.source !== 'none' || row.text !== '') {
        problems.push(`row delivered via ${row ? row.source : 'unknown'} (${row && row.text ? row.text.split('\t').length : 0} fields)`);
    }
    if (checklistCount !== 0) problems.push(`checklist=${checklistCount}`);
    if (failClosedVisible !== true) problems.push('fail-closed alert not visible');
    return { pass: problems.length === 0, problems };
}

/** Shared happy-path body for R1 (Primera Visita) and R2 (Seguimiento). */
async function runHappyPathCase(browser, origin, { label, pageFile, id, pathology, marker, kind }) {
    const context = await passSupportedGate(browser, origin);
    try {
        await context.addInitScript(pendingRowsEventObserver);
        const page = await context.newPage();
        const entry = trackedPage(page);
        await page.goto(`${origin}/${pageFile}`, { waitUntil: 'load', timeout: 45000 });
        const keysBeforeExport = await page.evaluate(() => Object.keys(window.localStorage));
        await exportTxtThenCsv(page, { id, pathology });
        const checklistAppeared = await page.waitForSelector('#postExportChecklist', { timeout: 8000 }).then(() => true).catch(() => false);
        const checklist = await page.evaluate(() => {
            const el = document.getElementById('postExportChecklist');
            if (!el) return { count: 0, header: '' };
            const header = el.querySelector('.post-export-checklist__header');
            return { count: document.querySelectorAll('#postExportChecklist').length, header: header ? header.textContent.trim() : '' };
        });
        const row = await readExportedRow(page);
        const rowVerdict = row.text ? evaluateRow497(row.text, { id, marker, token: pathology }) : { pass: false, problems: ['no row captured'] };
        record(`${label} ${pageFile}: copied row is a 497-field TSV with identity, '${marker}' marker and '${pathology}' token`,
            row.source !== 'none' && rowVerdict.pass,
            `source=${row.source} problems=${JSON.stringify(rowVerdict.problems)} fields=${row.text ? row.text.split('\t').length : 0}`);
        // F3 byte-equality (WO:48): the delivered text must be byte-identical to
        // the legacy 497 row recomputed in-page from the same collected payload.
        const recomputed = await recomputeLegacyRow497(page, { kind, pathology });
        const byteVerdict = evaluateRowByteEqual(row.source !== 'none' ? row.text : '', recomputed);
        record(`${label} ${pageFile}: copied row (source=${row.source}) is BYTE-IDENTICAL (full string equality) to the legacy 497 row recomputed in-page from the same collected payload`,
            row.source !== 'none' && byteVerdict.pass,
            `source=${row.source} recompute=${recomputed.ok === true ? 'ok' : recomputed.reason} problems=${JSON.stringify(byteVerdict.problems)}`);
        record(`${label} ${pageFile}: exactly one checklist with header '${CHECKLIST_HEADER_TEXT}', dismiss works`,
            checklistAppeared && checklist.count === 1 && checklist.header.includes(CHECKLIST_HEADER_TEXT),
            `appeared=${checklistAppeared} count=${checklist.count} header=${JSON.stringify(checklist.header)}`);
        await page.click('#postExportChecklist .post-export-checklist__dismiss');
        await page.waitForTimeout(600);
        const checklistAfterDismiss = await page.locator('#postExportChecklist').count();
        record(`${label} ${pageFile}: checklist dismiss removes the checklist`,
            checklistAfterDismiss === 0,
            `checklistAfterDismiss=${checklistAfterDismiss}`);
        const retirement = await readRetirementState(page);
        const newStorageKeys = retirement.storageKeys.filter((key) => !keysBeforeExport.includes(key));
        const retirementVerdict = evaluateRetirementState(retirement);
        const storageClean = newStorageKeys.length === 0 && retirement.hubPendingRowsValue === null;
        record(`${label} ${pageFile}: retirement state (no #pendingRowsIndicator, no 'Recuperar última'/'Marcar resuelta', recovery APIs undefined, no pendingRowsUpdated event, no hubPendingRows key)`,
            retirementVerdict.pass && storageClean && newStorageKeys.length === 0,
            `problems=${JSON.stringify(retirementVerdict.problems)} newKeys=${JSON.stringify(newStorageKeys)} hubPendingRows=${JSON.stringify(retirement.hubPendingRowsValue)}`);
        const pageConsoleErrors = errorsFor(entry, pageFile);
        record(`${label} ${pageFile}: console.error=0 for the page and pageerror=0`,
            pageConsoleErrors.length === 0 && entry.pageErrors.length === 0,
            `consoleErrors=${JSON.stringify(pageConsoleErrors.slice(0, 5))} pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))}`);
    } finally {
        await context.close();
    }
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

    // =====================================================================
    // R1 / R2 — happy paths on both journeys (pathology mapping in header).
    // =====================================================================
    await runHappyPathCase(browser, origin, {
        label: 'R1', pageFile: PAGE_PRIMERA, id: 'SYN-RETIRE-001', pathology: 'les', marker: 'Primera Visita', kind: 'primera',
    });
    await runHappyPathCase(browser, origin, {
        label: 'R2', pageFile: PAGE_SEGUIMIENTO, id: 'SYN-RETIRE-002', pathology: 'espa', marker: 'Seguimiento', kind: 'seguimiento',
    });

    // =====================================================================
    // R3 — TXT-gate negative: CSV without TXT.
    // =====================================================================
    {
        const context = await passSupportedGate(browser, origin);
        try {
            await context.addInitScript(pendingRowsEventObserver);
            const page = await context.newPage();
            const entry = trackedPage(page);
            await page.goto(`${origin}/${PAGE_PRIMERA}`, { waitUntil: 'load', timeout: 45000 });
            const keysBeforeClick = await page.evaluate(() => Object.keys(window.localStorage));
            await page.fill('#idPaciente', 'SYN-RETIRE-003');
            await page.fill('#fechaVisita', '2026-09-30');
            await page.selectOption('#diagnosticoPrimario', 'les');
            await page.click('#btnEstructurarCSV');
            await page.waitForTimeout(1500);
            const state = await page.evaluate(() => ({
                checklistCount: document.querySelectorAll('#postExportChecklist').length,
                gateAlert: Array.from(document.querySelectorAll('[role="alert"]')).some((el) => (el.textContent || '').includes('Debe exportar TXT de esta visita antes de exportar CSV.')),
                storageKeys: Object.keys(window.localStorage),
            }));
            const newStorageKeys = state.storageKeys.filter((key) => !keysBeforeClick.includes(key));
            record('R3 TXT-gate negative: gate alert, no checklist, no storage write',
                state.gateAlert === true && state.checklistCount === 0 && newStorageKeys.length === 0,
                `gateAlert=${state.gateAlert} checklist=${state.checklistCount} newKeys=${JSON.stringify(newStorageKeys)}`);
            record('R3 TXT-gate negative: pageerror=0',
                entry.pageErrors.length === 0,
                `pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))}`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // R4 — planted boundary failure: fail closed, no misleading partial copy.
    // =====================================================================
    {
        const context = await passSupportedGate(browser, origin);
        try {
            await context.addInitScript(pendingRowsEventObserver);
            await context.addInitScript(plantedBoundaryFailure);
            const page = await context.newPage();
            const entry = trackedPage(page);
            await page.goto(`${origin}/${PAGE_PRIMERA}`, { waitUntil: 'load', timeout: 45000 });
            await exportTxtThenCsv(page, { id: 'SYN-RETIRE-004', pathology: 'les' });
            await page.waitForTimeout(1200);
            const state = await page.evaluate(() => ({
                checklistCount: document.querySelectorAll('#postExportChecklist').length,
                alerts: Array.from(document.querySelectorAll('[role="alert"]')).map((el) => el.textContent || ''),
            }));
            const row = await readExportedRow(page);
            const rowFields = row.text ? row.text.split('\t').length : 0;
            const failClosedVisible = state.alerts.some((text) => text.includes('frontera de compatibilidad'));
            const pageConsoleErrors = errorsFor(entry, PAGE_PRIMERA);
            const unclassifiedErrors = pageConsoleErrors
                .filter((message) => !EXPECTED_BOUNDARY_ERROR_CLASSES.some((cls) => message.includes(cls)));
            // F4 fail-closed (WO:17 'no copiar fila parcial'): NO row may be
            // delivered at all — a 496-field partial row is also a violation.
            const noDeliveryVerdict = evaluateNoRowDelivered(row, {
                checklistCount: state.checklistCount,
                failClosedVisible,
            });
            record('R4 planted boundary failure: fail-closed alert, no checklist and NO row delivered at all (no clipboard TSV, no modal TSV — fail-closed, never a partial copy)',
                noDeliveryVerdict.pass,
                `problems=${JSON.stringify(noDeliveryVerdict.problems)} failClosedVisible=${failClosedVisible} checklist=${state.checklistCount} rowSource=${row.source} rowFields=${rowFields} alerts=${JSON.stringify(state.alerts.slice(0, 3))}`);
            record('R4 planted boundary failure: pageerror=0 and console errors stay within the explicitly classified expected classes',
                entry.pageErrors.length === 0 && unclassifiedErrors.length === 0,
                `pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))} unclassifiedConsoleErrors=${JSON.stringify(unclassifiedErrors.slice(0, 5))}`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // R5 — clipboard rejected AFTER the TXT step: manual modal, full row,
    // no checklist, no false claim of automatic copy.
    // =====================================================================
    {
        const context = await passSupportedGate(browser, origin);
        try {
            await context.addInitScript(pendingRowsEventObserver);
            await context.addInitScript(clipboardRejectionPlant);
            const page = await context.newPage();
            const entry = trackedPage(page);
            await page.goto(`${origin}/${PAGE_PRIMERA}`, { waitUntil: 'load', timeout: 45000 });
            await page.fill('#idPaciente', 'SYN-RETIRE-005');
            await page.fill('#fechaVisita', '2026-09-30');
            await page.selectOption('#diagnosticoPrimario', 'les');
            await page.click('#btnExportarTXT');
            await page.waitForTimeout(1200);
            if (await page.locator('#textoModalContainer').count() > 0) {
                await page.click('#closeModalBtn');
                await page.waitForTimeout(200);
            }
            const txtAttempts = await page.evaluate(() => ({
                attempts: window.__clipboardWriteAttempts,
                armed: window.__rejectClipboardWrite,
            }));
            // Arm the rejection RIGHT BEFORE the CSV click (post-TXT).
            await page.evaluate(() => { window.__rejectClipboardWrite = true; });
            await page.click('#btnEstructurarCSV');
            await page.waitForSelector('#textoModalContainer .texto-modal__title', { timeout: 8000 });
            await page.waitForTimeout(400);
            const modal = await page.evaluate(() => {
                const container = document.getElementById('textoModalContainer');
                const title = container ? container.querySelector('.texto-modal__title') : null;
                const message = container ? container.querySelector('.texto-modal__message') : null;
                const textarea = document.getElementById('textoModalTextarea');
                return {
                    title: title ? title.textContent.trim() : '',
                    message: message ? message.textContent.trim() : '',
                    row: textarea ? textarea.value : '',
                };
            });
            const rowVerdict = evaluateRow497(modal.row, { id: 'SYN-RETIRE-005', marker: 'Primera Visita', token: 'les' });
            const csvAttempts = await page.evaluate(() => ({
                attempts: window.__clipboardWriteAttempts,
                armed: window.__rejectClipboardWrite,
            }));
            const visibleClaims = await page.evaluate(() => ({
                checklistCount: document.querySelectorAll('#postExportChecklist').length,
                copiedClaimVisible: /csv copiado al portapapeles|datos copiados al portapapeles/i.test(document.body.innerText),
                infoTextPresent: document.body.innerText.includes('No se pudo copiar autom\u00e1ticamente'),
            }));
            record('R5 clipboard rejected: TXT step stayed clean (one non-rejected write) and the CSV write was rejected by the plant',
                txtAttempts.attempts === 1 && txtAttempts.armed === false &&
                csvAttempts.attempts === 2 && csvAttempts.armed === true,
                `txtAttempts=${JSON.stringify(txtAttempts)} csvAttempts=${JSON.stringify(csvAttempts)}`);
            record(`R5 clipboard rejected: manual modal '${MANUAL_COPY_MODAL_TITLE}' visible with the FULL 497-field row and info text '${MANUAL_COPY_INFO_TEXT}'`,
                modal.title.includes(MANUAL_COPY_MODAL_TITLE) && modal.message.includes(MANUAL_COPY_INFO_TEXT) && rowVerdict.pass,
                `title=${JSON.stringify(modal.title)} message=${JSON.stringify(modal.message)} rowProblems=${JSON.stringify(rowVerdict.problems)} fields=${modal.row ? modal.row.split('\t').length : 0}`);
            // F3 byte-equality on the manual-modal source (WO:48): the modal must
            // carry the same byte-identical legacy 497 row.
            const recomputedModal = await recomputeLegacyRow497(page, { kind: 'primera', pathology: 'les' });
            const byteVerdictModal = evaluateRowByteEqual(modal.row, recomputedModal);
            record(`R5 clipboard rejected: manual-modal row is BYTE-IDENTICAL (full string equality) to the legacy 497 row recomputed in-page from the same collected payload`,
                byteVerdictModal.pass,
                `recompute=${recomputedModal.ok === true ? 'ok' : recomputedModal.reason} problems=${JSON.stringify(byteVerdictModal.problems)} fields=${modal.row ? modal.row.split('\t').length : 0}`);
            record('R5 clipboard rejected: #postExportChecklist ABSENT and no visible claim that the CSV was copied',
                visibleClaims.checklistCount === 0 && visibleClaims.copiedClaimVisible === false && visibleClaims.infoTextPresent === true,
                `checklist=${visibleClaims.checklistCount} copiedClaimVisible=${visibleClaims.copiedClaimVisible} infoTextPresent=${visibleClaims.infoTextPresent}`);
            const pageConsoleErrors = errorsFor(entry, PAGE_PRIMERA);
            const unclassifiedErrors = pageConsoleErrors
                .filter((message) => !EXPECTED_CLIPBOARD_FAILURE_CLASSES.some((cls) => message.includes(cls)));
            record('R5 clipboard rejected: pageerror=0 and console errors stay within the explicitly classified expected classes (never a clean-route zero claim)',
                entry.pageErrors.length === 0 && unclassifiedErrors.length === 0,
                `pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))} consoleErrors=${JSON.stringify(pageConsoleErrors.slice(0, 5))} unclassified=${JSON.stringify(unclassifiedErrors.slice(0, 5))}`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // R5b — F1 stale-checklist transition (WO:20, 18D-C1 runtime fix): a
    // successful export leaves the success checklist visible (15 s window);
    // a SECOND export inside that window whose clipboard write is rejected
    // must NOT keep the stale 'CSV copiado al portapapeles' claim while the
    // manual modal reports the failure.
    // =====================================================================
    {
        const context = await passSupportedGate(browser, origin);
        try {
            await context.addInitScript(pendingRowsEventObserver);
            await context.addInitScript(clipboardRejectionPlant);
            const page = await context.newPage();
            const entry = trackedPage(page);
            await page.goto(`${origin}/${PAGE_PRIMERA}`, { waitUntil: 'load', timeout: 45000 });
            await page.fill('#idPaciente', 'SYN-RETIRE-005B');
            await page.fill('#fechaVisita', '2026-09-30');
            await page.selectOption('#diagnosticoPrimario', 'les');
            await page.click('#btnExportarTXT');
            await page.waitForTimeout(1200);
            if (await page.locator('#textoModalContainer').count() > 0) {
                await page.click('#closeModalBtn');
                await page.waitForTimeout(200);
            }
            // First CSV export: clipboard allowed -> real success checklist.
            await page.click('#btnEstructurarCSV');
            const firstChecklist = await page.waitForSelector('#postExportChecklist', { timeout: 8000 }).then(() => true).catch(() => false);
            // Second CSV export INSIDE the checklist window, clipboard rejected.
            await page.evaluate(() => { window.__rejectClipboardWrite = true; });
            await page.click('#btnEstructurarCSV');
            await page.waitForSelector('#textoModalContainer .texto-modal__title', { timeout: 8000 });
            await page.waitForTimeout(400);
            const transition = await page.evaluate(() => {
                const container = document.getElementById('textoModalContainer');
                const title = container ? container.querySelector('.texto-modal__title') : null;
                const message = container ? container.querySelector('.texto-modal__message') : null;
                const textarea = document.getElementById('textoModalTextarea');
                return {
                    title: title ? title.textContent.trim() : '',
                    message: message ? message.textContent.trim() : '',
                    row: textarea ? textarea.value : '',
                    checklistCount: document.querySelectorAll('#postExportChecklist').length,
                    copiedClaimVisible: /csv copiado al portapapeles|datos copiados al portapapeles/i.test(document.body.innerText),
                };
            });
            const transitionRowVerdict = evaluateRow497(transition.row, { id: 'SYN-RETIRE-005B', marker: 'Primera Visita', token: 'les' });
            const recomputedTransition = await recomputeLegacyRow497(page, { kind: 'primera', pathology: 'les' });
            const transitionByteVerdict = evaluateRowByteEqual(transition.row, recomputedTransition);
            record('R5b stale-checklist transition (F1): first export shows the real success checklist and the second export opens the manual modal inside the checklist window',
                firstChecklist && transition.title.includes(MANUAL_COPY_MODAL_TITLE) && transition.message.includes(MANUAL_COPY_INFO_TEXT),
                `firstChecklist=${firstChecklist} title=${JSON.stringify(transition.title)} message=${JSON.stringify(transition.message)}`);
            record('R5b stale-checklist transition (F1): the stale success claim is GONE (no checklist, no visible copy claim) while the modal shows the FULL byte-identical 497-field failure row',
                transition.checklistCount === 0 && transition.copiedClaimVisible === false && transitionRowVerdict.pass && transitionByteVerdict.pass,
                `checklist=${transition.checklistCount} copiedClaimVisible=${transition.copiedClaimVisible} rowProblems=${JSON.stringify(transitionRowVerdict.problems)} byteProblems=${JSON.stringify(transitionByteVerdict.problems)} recompute=${recomputedTransition.ok === true ? 'ok' : recomputedTransition.reason}`);
            record('R5b stale-checklist transition (F1): pageerror=0 for the whole transition',
                entry.pageErrors.length === 0,
                `pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))} consoleErrors=${JSON.stringify(errorsFor(entry, PAGE_PRIMERA).slice(0, 5))}`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // R6 — legacy storage TEST fixture: seeded sentinel byte-unchanged.
    // =====================================================================
    {
        const context = await passSupportedGate(browser, origin);
        try {
            await context.addInitScript(pendingRowsEventObserver);
            await context.addInitScript(legacySentinelFixture);
            const page = await context.newPage();
            const entry = trackedPage(page);
            await page.goto(`${origin}/${PAGE_SEGUIMIENTO}`, { waitUntil: 'load', timeout: 45000 });
            const seeded = await page.evaluate(() => window.localStorage.getItem('hubPendingRows'));
            const keysBeforeExport = await page.evaluate(() => Object.keys(window.localStorage));
            await exportTxtThenCsv(page, { id: 'SYN-RETIRE-006', pathology: 'espa' });
            const checklistAppeared = await page.waitForSelector('#postExportChecklist', { timeout: 8000 }).then(() => true).catch(() => false);
            const retirement = await readRetirementState(page);
            const newStorageKeys = retirement.storageKeys.filter((key) => !keysBeforeExport.includes(key));
            const retirementVerdict = evaluateRetirementState(retirement, { legacySentinel: LEGACY_HUB_PENDING_ROWS_SENTINEL });
            record('R6 legacy TEST sentinel: seeded hubPendingRows content is byte-UNCHANGED after a supported export and no new storage key is added',
                seeded === LEGACY_HUB_PENDING_ROWS_SENTINEL && retirementVerdict.pass && newStorageKeys.length === 0 && checklistAppeared,
                `seeded=${seeded === LEGACY_HUB_PENDING_ROWS_SENTINEL} problems=${JSON.stringify(retirementVerdict.problems)} newKeys=${JSON.stringify(newStorageKeys)} checklist=${checklistAppeared}`);
            record('R6 legacy TEST sentinel: pageerror=0 for the supported export',
                entry.pageErrors.length === 0,
                `pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))}`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // R7 — Web Storage failure/denial: export completes safely, no clinical
    // storage written (writes would surface through the throwing storage).
    // =====================================================================
    {
        const context = await passSupportedGate(browser, origin);
        try {
            await context.addInitScript(pendingRowsEventObserver);
            const page = await context.newPage();
            await page.addInitScript(storageDenialPlant);
            const entry = trackedPage(page);
            await page.goto(`${origin}/${PAGE_PRIMERA}`, { waitUntil: 'load', timeout: 45000 });
            const denialArmed = await page.evaluate(() => {
                try { window.localStorage.setItem('SYN-PROBE', 'x'); return false; } catch (error) { return true; }
            });
            await exportTxtThenCsv(page, { id: 'SYN-RETIRE-007', pathology: 'les' });
            const checklistAppeared = await page.waitForSelector('#postExportChecklist', { timeout: 8000 }).then(() => true).catch(() => false);
            const row = await readExportedRow(page);
            const rowVerdict = row.text ? evaluateRow497(row.text, { id: 'SYN-RETIRE-007', marker: 'Primera Visita', token: 'les' }) : { pass: false, problems: ['no row captured'] };
            const retirement = await readRetirementState(page);
            const retirementVerdict = evaluateRetirementState(retirement, { storageReadable: false });
            record('R7 storage denial: localStorage.setItem/getItem throw and the supported export still completes safely (497 copy + checklist)',
                denialArmed === true && checklistAppeared && row.source !== 'none' && rowVerdict.pass && retirementVerdict.pass,
                `denialArmed=${denialArmed} checklist=${checklistAppeared} source=${row.source} rowProblems=${JSON.stringify(rowVerdict.problems)} retirementProblems=${JSON.stringify(retirementVerdict.problems)}`);
            const pageConsoleErrors = errorsFor(entry, PAGE_PRIMERA);
            const unclassifiedErrors = pageConsoleErrors
                .filter((message) => !EXPECTED_STORAGE_DENIAL_CLASSES.some((cls) => message.includes(cls)));
            record('R7 storage denial: pageerror=0 and console errors stay within the explicitly classified expected classes',
                entry.pageErrors.length === 0 && unclassifiedErrors.length === 0,
                `pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))} consoleErrors=${JSON.stringify(pageConsoleErrors.slice(0, 5))} unclassified=${JSON.stringify(unclassifiedErrors.slice(0, 5))}`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // R8 — empty context: gate + export work from zero, no clinical storage.
    // =====================================================================
    {
        const context = await passSupportedGate(browser, origin);
        try {
            await context.addInitScript(pendingRowsEventObserver);
            const page = await context.newPage();
            const entry = trackedPage(page);
            await page.goto(`${origin}/${PAGE_SEGUIMIENTO}`, { waitUntil: 'load', timeout: 45000 });
            const startingKeys = await page.evaluate(() => Object.keys(window.localStorage));
            const residualPanel = await page.evaluate(() => document.querySelectorAll('#pendingRowsIndicator').length);
            await exportTxtThenCsv(page, { id: 'SYN-RETIRE-008', pathology: 'espa' });
            const checklistAppeared = await page.waitForSelector('#postExportChecklist', { timeout: 8000 }).then(() => true).catch(() => false);
            const row = await readExportedRow(page);
            const rowVerdict = row.text ? evaluateRow497(row.text, { id: 'SYN-RETIRE-008', marker: 'Seguimiento', token: 'espa' }) : { pass: false, problems: ['no row captured'] };
            const retirement = await readRetirementState(page);
            const retirementVerdict = evaluateRetirementState(retirement);
            record('R8 empty context: session gate + export work from zero (497 copy + checklist), no residual panel and no clinical storage',
                checklistAppeared && row.source !== 'none' && rowVerdict.pass && residualPanel === 0 && retirementVerdict.pass,
                `checklist=${checklistAppeared} source=${row.source} rowProblems=${JSON.stringify(rowVerdict.problems)} startingKeys=${JSON.stringify(startingKeys)} retirementProblems=${JSON.stringify(retirementVerdict.problems)}`);
            record('R8 empty context: pageerror=0 and console.error=0 for the page',
                entry.pageErrors.length === 0 && errorsFor(entry, PAGE_SEGUIMIENTO).length === 0,
                `pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))} consoleErrors=${JSON.stringify(errorsFor(entry, PAGE_SEGUIMIENTO).slice(0, 5))}`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // R9 — eight-page verification through supported navigation/gate.
    // =====================================================================
    {
        const context = await passSupportedGate(browser, origin);
        try {
            await context.addInitScript(pendingRowsEventObserver);
            for (const pageFile of ALL_PAGES) {
                const page = await context.newPage();
                const entry = trackedPage(page);
                try {
                    await page.goto(`${origin}/${pageFile}`, { waitUntil: 'load', timeout: 45000 });
                    await page.waitForTimeout(400);
                    const state = await page.evaluate(() => ({
                        pendingIndicator: document.querySelectorAll('#pendingRowsIndicator').length,
                        pendingControls: document.body.innerText.includes('Recuperar \u00faltima')
                            || document.body.innerText.includes('Marcar resuelta'),
                        scriptToken: Array.from(document.scripts).some((s) => (s.getAttribute('src') || '').includes('script.js?v=20261009-export-safety-18-script-r1')),
                        exportManagerToken: Array.from(document.scripts).some((s) => (s.getAttribute('src') || '').includes('modules/exportManager.js?v=20261010-txt-gate-21-csv-noapi-r1')),
                    }));
                    const needsExportManager = EXPORT_MANAGER_PAGES.includes(pageFile);
                    record(`R9 ${pageFile}: loads without pageerror, no pending-rows panel/controls, script.js train token present`,
                        entry.pageErrors.length === 0 && state.pendingIndicator === 0 && state.pendingControls === false && state.scriptToken,
                        `pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 3))} pendingIndicator=${state.pendingIndicator} pendingControls=${state.pendingControls} scriptToken=${state.scriptToken}`);
                    record(`R9 ${pageFile}: exportManager.js train token ${needsExportManager ? 'present' : 'absent (dashboard_search.html must not load it)'}`,
                        state.exportManagerToken === needsExportManager,
                        `exportManagerToken=${state.exportManagerToken} expected=${needsExportManager}`);
                } finally {
                    await page.close();
                }
            }
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // W1–W4 — negative witnesses: real plants and planted data must FAIL the
    // corresponding evaluator; the clean state must PASS.
    // =====================================================================
    {
        // W1 — a REAL page dispatch of pendingRowsUpdated (init-script plant)
        // is counted by the observer and FAILS the retirement evaluator.
        try {
            const context = await passSupportedGate(browser, origin);
            try {
                await context.addInitScript(pendingRowsEventObserver);
                await context.addInitScript(() => {
                    window.addEventListener('load', () => {
                        window.dispatchEvent(new CustomEvent('pendingRowsUpdated', { detail: [] }));
                    });
                });
                const page = await context.newPage();
                await page.goto(`${origin}/${PAGE_INDEX}`, { waitUntil: 'load', timeout: 45000 });
                await page.waitForTimeout(300);
                const state = await readRetirementState(page);
                const clean = evaluateRetirementState({ ...state, pendingRowsUpdatedEvents: 0 });
                const planted = evaluateRetirementState(state);
                record('W1 witness: a real page dispatch of pendingRowsUpdated is observed and FAILS the retirement evaluator',
                    state.pendingRowsUpdatedEvents === 1 && clean.pass === true && planted.pass === false,
                    `observedEvents=${state.pendingRowsUpdatedEvents} cleanPass=${clean.pass} plantedPass=${planted.pass} plantedProblems=${JSON.stringify(planted.problems)}`);
            } finally {
                await context.close();
            }
        } catch (error) {
            record('W1 witness: a real page dispatch of pendingRowsUpdated is observed and FAILS the retirement evaluator', false, `crashed: ${error.message}`);
        }

        // W2 — a REAL page write of hubPendingRows (init-script plant) FAILS
        // the retirement evaluator.
        try {
            const context = await passSupportedGate(browser, origin);
            try {
                await context.addInitScript(pendingRowsEventObserver);
                await context.addInitScript(() => {
                    window.addEventListener('load', () => {
                        try { window.localStorage.setItem('hubPendingRows', JSON.stringify([{ planted: 'witness-w2' }])); } catch (error) { /* noop */ }
                    });
                });
                const page = await context.newPage();
                await page.goto(`${origin}/${PAGE_INDEX}`, { waitUntil: 'load', timeout: 45000 });
                await page.waitForTimeout(300);
                const state = await readRetirementState(page);
                const planted = evaluateRetirementState(state);
                record('W2 witness: a real page write of hubPendingRows FAILS the retirement evaluator',
                    state.hubPendingRowsValue !== null && planted.pass === false,
                    `hubPendingRows=${JSON.stringify(state.hubPendingRowsValue)} plantedPass=${planted.pass} plantedProblems=${JSON.stringify(planted.problems)}`);
            } finally {
                await context.close();
            }
        } catch (error) {
            record('W2 witness: a real page write of hubPendingRows FAILS the retirement evaluator', false, `crashed: ${error.message}`);
        }

        // W3 — a tampered legacy sentinel FAILS the byte-unchanged evaluator.
        try {
            const cleanState = { pendingRowsIndicatorCount: 0, pendingRowsControlsVisible: false, recoveryApis: [], storageKeys: ['hubSelectedProfessional', 'hubPendingRows'], hubPendingRowsValue: LEGACY_HUB_PENDING_ROWS_SENTINEL, pendingRowsUpdatedEvents: 0 };
            const tamperedState = { ...cleanState, hubPendingRowsValue: JSON.stringify([{ id: 'SYN-TAMPERED', content: 'x', sheet: 'LEGACY', createdAt: 2 }]) };
            const clean = evaluateRetirementState(cleanState, { legacySentinel: LEGACY_HUB_PENDING_ROWS_SENTINEL });
            const planted = evaluateRetirementState(tamperedState, { legacySentinel: LEGACY_HUB_PENDING_ROWS_SENTINEL });
            record('W3 witness: a rewritten legacy hubPendingRows sentinel FAILS the byte-unchanged evaluator',
                clean.pass === true && planted.pass === false,
                `cleanPass=${clean.pass} plantedPass=${planted.pass} plantedProblems=${JSON.stringify(planted.problems)}`);
        } catch (error) {
            record('W3 witness: a rewritten legacy hubPendingRows sentinel FAILS the byte-unchanged evaluator', false, `crashed: ${error.message}`);
        }

        // W4 — a falsified 497 row (field dropped / field altered / MIDDLE
        // field corrupted) FAILS the corresponding evaluator; a well-formed
        // synthetic row passes it. The byte-equality evaluator is the one that
        // catches a MIDDLE-field corruption invisible to count/index sampling.
        try {
            const cleanRow = Array.from({ length: 497 }, (_, i) => (i === 0 ? 'SYN-RETIRE-W4' : i === 4 ? 'Primera Visita' : i === 6 ? 'les' : `F${i}`)).join('\t');
            const droppedRow = cleanRow.split('\t').slice(0, 496).join('\t');
            const alteredRow = cleanRow.replace('SYN-RETIRE-W4', 'SYN-TAMPERED-W4');
            const middleFields = cleanRow.split('\t');
            middleFields[250] = 'SYN-TAMPERED-MID-250';
            const middleRow = middleFields.join('\t');
            const expected = { id: 'SYN-RETIRE-W4', marker: 'Primera Visita', token: 'les' };
            const clean = evaluateRow497(cleanRow, expected);
            const drop = evaluateRow497(droppedRow, expected);
            const alter = evaluateRow497(alteredRow, expected);
            const cleanByte = evaluateRowByteEqual(cleanRow, { ok: true, row: cleanRow });
            const middleByte = evaluateRowByteEqual(middleRow, { ok: true, row: cleanRow });
            record('W4 witness: a falsified 497 row (field dropped or altered) FAILS the row evaluator',
                clean.pass === true && drop.pass === false && alter.pass === false,
                `cleanPass=${clean.pass} dropPass=${drop.pass} alterPass=${alter.pass}`);
            record('W4 witness: a plant corrupting a MIDDLE field (index 250) is DETECTED as FAIL by the full-string byte-equality evaluator while the clean row passes it',
                cleanByte.pass === true && middleByte.pass === false,
                `cleanBytePass=${cleanByte.pass} middleBytePass=${middleByte.pass} middleProblems=${JSON.stringify(middleByte.problems)}`);
        } catch (error) {
            record('W4 witness: a falsified 497 row (field dropped or altered) FAILS the row evaluator', false, `crashed: ${error.message}`);
        }

        // W5 — F4 partial-copy negative witness: a planted 496-field partial
        // delivery FAILS the fail-closed no-row evaluator used by R4 (any
        // delivered row is a violation even when it is not a 497-field row),
        // while a true no-delivery state passes it.
        try {
            const partialRow = { source: 'clipboard', text: Array.from({ length: 496 }, (_, i) => `F${i}`).join('\t') };
            const plantedPartial = evaluateNoRowDelivered(partialRow, { checklistCount: 0, failClosedVisible: true });
            const cleanNone = evaluateNoRowDelivered({ source: 'none', text: '' }, { checklistCount: 0, failClosedVisible: true });
            record('W5 witness: a planted 496-field partial delivery FAILS the fail-closed no-row evaluator (no partial copy) while a true no-delivery state passes it',
                plantedPartial.pass === false && cleanNone.pass === true,
                `plantedPass=${plantedPartial.pass} plantedProblems=${JSON.stringify(plantedPartial.problems)} cleanPass=${cleanNone.pass}`);
        } catch (error) {
            record('W5 witness: a planted 496-field partial delivery FAILS the fail-closed no-row evaluator', false, `crashed: ${error.message}`);
        }
    }

    console.log('\nENVIRONMENT');
    console.log(`  Chromium: ${chromiumVersion}`);
    console.log('  Headless: true');
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
console.log(`\nREUMA-PENDING-RETIREMENT-BROWSER: ${failed.length === 0 ? 'PASS' : 'FAIL'} ${results.length - failed.length}/${results.length} cases`);
process.exit(failed.length === 0 ? 0 : 1);
