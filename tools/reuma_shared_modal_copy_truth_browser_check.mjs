#!/usr/bin/env node
'use strict';
/**
 * Browser contract check for WO-REUMA-COPY-TRUTH-20A/20B/20C (T1+T2+T3,
 * TRAIN-NEXUS-COPY-STORAGE-19, issue #620): the shared text modal
 * `mostrarModalTexto(texto, titulo, mensaje)` in `modules/formController.js`
 * must be TRUTHFUL about clipboard copying on every supported consumer
 * journey. On the pre-T2 baseline this checker was expected RED: the `Copiar`
 * handler called `navigator.clipboard.writeText(...).catch(() =>
 * fallbackCopy())` where `fallbackCopy()` ran `document.execCommand('copy')`
 * and DROPPED its boolean result, so the promise always claimed 'Contenido
 * copiado al portapapeles.' and auto-closed the modal even when BOTH copy
 * paths failed (false success / false completion).
 *
 * T1 contract (baseline RED, recorded at commit 4b17313): the checker must
 * FAIL on the false-completion witnesses (C1/C3/C4: baseline claims success
 * and auto-closes the modal) and PASS on the recovery/true witnesses (C2/C5),
 * proving it DISTINGUISHES true from false success on the same supported
 * journey and observation machinery. T1 recorded verdict: FAIL 20/26 with the
 * C1/C4 false-success witnesses failing — that run is the NEGATIVE WITNESS
 * that restoring the dropped boolean is detected.
 *
 * T2 fix (830e63e): per-attempt token + `modal.isConnected` guard, truthful
 * notifications, no auto-close on failure, in `modules/formController.js` +
 * cache token `?v=20261010a` in primera_visita.html / seguimiento.html /
 * dashboard_paciente.html. On the fixed candidate the FULL suite is GREEN.
 *
 * T3 integration (WO-REUMA-COPY-TRUTH-20C): the same seam is now exercised
 * across the REAL supported consumer journeys:
 *   C1-C5   Primera Visita TXT manual modal (T1 suite, unchanged semantics):
 *           reject+false (false-success witness), reject+true (recovery),
 *           sync throw, no clipboard API + false, no clipboard API + true.
 *   C6-C7   Seguimiento TXT manual modal: reject+false (truthful failure),
 *           reject+true (recovery). The TXT gate marker registration is
 *           observed as pre-existing product behaviour.
 *   C8      Primera Visita: TXT gate BLOCKS CSV when TXT was not exported for
 *           the visit (gate keeps working: explicit error notification, NO
 *           modal, NO clipboard delivery attempt).
 *   C9      Primera Visita: gated TXT→CSV path reaches the 497-column CSV
 *           manual modal ('Copia manual de CSV'); the shared Copiar handler
 *           must keep the modal open with the byte-identical 497-field payload
 *           on failure (no success claim).
 *   C10     Seguimiento: same gate-blocked + gated 497 CSV manual modal pair.
 *   C11     Solicitud FH on Primera Visita (pharmacyRequest
 *           copyRequestToClipboard -> renderRequestModal -> shared modal):
 *           reject+false (truthful failure) then reject+true (recovery).
 *   C12     Solicitud FH on Seguimiento: reject+false (truthful failure).
 *   C13     Solicitud FH on the Dashboard consumer
 *           (dashboard_paciente.html): reject+false (truthful failure).
 *   C14a    REPEATED/RAPID attempts: two fast Copiar clicks with both copy
 *           paths failing — no false success, modal stays open, full text.
 *   C14b    STALE in-flight completion: attempt A parked on a delayed
 *           writeText rejection; attempt B succeeds via the no-API fallback
 *           and closes the modal; A's late rejection lands AFTER the close —
 *           the per-attempt token/isConnected guard must suppress it (no
 *           stale failure toast after a truthful success/close).
 *   C15     MANUAL select/copy: with all plants disarmed, a real keyboard
 *           Ctrl+A selects the full original text in the readonly textarea
 *           and a real Ctrl+C copies it to the REAL clipboard (verified by
 *           clipboard.readText) while the modal stays open — the manual copy
 *           path the truthful contract promises on failure.
 *
 * Seam under test (read-only; NO product code is changed by this checker):
 *   modules/formController.js  mostrarModalTexto (~line 1042) and its
 *   #copyToClipboardModalBtn 'Copiar' click handler.
 * Consumers: modules/exportManager.js (exportarTXT TXT journey,
 *   exportarYCopiarCSV gated 497 journey, openManualCopyModal), and
 *   modules/pharmacyRequest.js:renderRequestModal (Solicitud FH) shared by
 *   primera_visita.html, seguimiento.html and dashboard_paciente.html.
 *
 * Conventions (same as tools/reuma_pending_retirement_browser_check.mjs /
 * tools/reuma_export_boundary_browser_check.mjs /
 * tools/reuma_fh_request_handoff_*_browser_check.mjs): real repo-root HTTP
 * server, the real session gate on reuma_index.html (file input ->
 * professional select -> confirm), real navigation to the target page (same
 * tab for the ?id= routes so the per-tab session DB cache is available), and
 * the real supported export/FH journeys -> the planted clipboard rejection
 * opens the real manual modal -> a REAL supported click on the modal's
 * #copyToClipboardModalBtn 'Copiar' button. Synthetic data only ('SYN-*'
 * ids); no real patient data.
 *
 * Evidence limits: supported interactions only — the modal is NEVER tampered
 * with, no handler is called directly, no impossible fixture. Environment
 * conditions/plants go ONLY through `page.addInitScript` (established repo
 * convention, same as train 18): a controlled `navigator.clipboard.writeText`
 * wrapper (pass-through / reject / delayed-reject / sync-throw), a controlled
 * `document.execCommand('copy')` wrapper (armed boolean or pass-through) and
 * a clipboard-availability switch (`navigator.clipboard` -> undefined), all
 * armed/disarmed at runtime through plain flag assignment. Modal/textarea/
 * notification state is read AFTER the supported click as post-state
 * observation; nothing is injected into the page. Case C15 explicitly DISARMS
 * all plants before the real keyboard select/copy so the observed clipboard
 * write is the browser's own.
 *
 * Console policy: `console.error` is CLASSIFIED explicitly per case (the
 * exportManager TXT auto-copy failure 'Error al copiar al portapapeles
 * automáticamente:' and the formController modal-copy failure 'Error al copiar
 * desde el modal:' are the expected controlled-failure classes); unclassified
 * console errors and ANY pageerror are failures.
 *
 * Screenshots: when COPY_TRUTH_SCREENSHOT_DIR is set, representative states
 * (modal open / failure / success) are saved there as PNG (synthetic data
 * only; screenshots are NEVER committed).
 *
 * Usage: node tools/reuma_shared_modal_copy_truth_browser_check.mjs
 * Documented env vars: PLAYWRIGHT_CHROMIUM_EXECUTABLE (headless-shell path),
 * COPY_TRUTH_SCREENSHOT_DIR (optional screenshot output directory).
 * Exit code 0 = every case PASS, 1 = at least one FAIL or environment
 * failure. On the current fixed candidate (T2 applied) the expected result is
 * PASS on all cases; against the pre-T2 baseline the checker reproduces the
 * recorded T1 RED (false-success witnesses fail, recovery witnesses pass).
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
const PAGE_DASHBOARD = 'dashboard_paciente.html';
const SUCCESS_CLAIM_TEXT = 'Contenido copiado al portapapeles.';
const FAILURE_FEEDBACK_TEXT = 'Error al copiar desde el modal.';
const GATE_BLOCK_TEXT = 'Debe exportar TXT de esta visita antes de exportar CSV.';
const MANUAL_COPY_TITLE_TOKEN = 'Copia Manual'; // TXT modal title token ('...Generada - Copia Manual')
const CSV_MODAL_TITLE_TOKEN = 'Copia manual de CSV';
const FH_MODAL_TITLE_TOKEN = 'Solicitud a Farmacia Hospitalaria - Copia Manual';
const CSV_FIELD_COUNT = 497; // frozen legacy row shape (reuma_export_boundary_check.mjs)
const TXT_GATE_KEY_PREFIX = 'HubClinico_TxtExportDone_';
const CLASSIFIED_CONSOLE_ERRORS = [
    'Error al copiar al portapapeles automáticamente', // exportManager TXT auto-copy failure (controlled)
    'Error al copiar desde el modal', // formController modal-copy failure (controlled)
];
const SCREENSHOT_DIR = process.env.COPY_TRUTH_SCREENSHOT_DIR || '';

const results = [];
function record(name, pass, detail) {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}
function caseHeader(label) {
    console.log(`\nCASE ${label}`);
}
async function snap(page, name) {
    if (!SCREENSHOT_DIR) return;
    try {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
        console.log(`  [SNAP] ${name}.png`);
    } catch (error) { /* screenshots are best-effort evidence, never a test outcome */ }
}

// Same documented Playwright resolution as the other browser checkers.
function loadPlaywrightFromNpx() {
    const tryNodeModules = (nodeModules) => {
        const pkg = path.join(nodeModules, 'playwright', 'package.json');
        return existsSync(pkg) ? createRequire(path.join(nodeModules, '__reuma_shared_modal_copy_truth_loader.cjs'))('playwright') : null;
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
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/reuma_shared_modal_copy_truth_browser_check.mjs');
}

let chromium;
try {
    ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
    console.error('ENVIRONMENT FAILURE: ' + err.message);
    console.log('\nREUMA-SHARED-MODAL-COPY-TRUTH-BROWSER: FAIL 0/0');
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
// HTTP server, mirroring tools/reuma_pending_retirement_browser_check.mjs.
// ---------------------------------------------------------------------------

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'reuma-shared-modal-copy-truth-'));
const workbookPath = path.join(tempDir, 'reuma_shared_modal_copy_truth_synthetic.xlsx');
{
    const workbook = XLSX.utils.book_new();
    // ESPA carries the synthetic patients the ?id= routes need: one
    // seguimiento-row for the Seguimiento journeys and one dashboard-row for
    // the Dashboard Solicitud FH journey (data preparation, not DOM
    // fabrication; same shape as the established FH browser checkers).
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
        { ID_Paciente: 'SYN-000-000' },
        {
            ID_Paciente: 'SYN-SEG-200',
            Nombre_Paciente: 'Sintetico Seg CopyTruth',
            Fecha_Visita: '2026-02-01',
            Tipo_Visita: 'Seguimiento',
            Diagnostico_Primario: 'espa',
            Tratamiento_Actual: 'Adalimumab (solicitado — pendiente de validación FH) 40 mg',
        },
        {
            ID_Paciente: 'SYN-DASH-900',
            Nombre_Paciente: 'Sintetico Dash CopyTruth',
            Fecha_Visita: '2026-02-01',
            Tipo_Visita: 'Seguimiento',
            Diagnostico_Principal: 'espa',
            Diagnostico_Secundario: 'Lumbalgia inflamatoria sintetica',
            PCR: '8',
            EVA_Global: '6',
            Tratamiento_Actual: 'Adalimumab (solicitado pendiente FH) 40 mg',
        },
    ]), 'ESPA');
    for (const sheetName of ['APS', 'AR', 'LES', 'SJOGREN']) {
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
// Supported session gate + page bookkeeping (same as the retirement checker).
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

/** Same-tab supported route for ?id= journeys (gate -> navigate, FH-checker
 * pattern) with the clipboard plant installed before the journey navigation. */
async function openJourneyPage(browser, origin, urlPath) {
    const context = await browser.newContext();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }).catch(() => {});
    const page = await context.newPage();
    const entry = trackedPage(page);
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
    await context.addInitScript(copyTruthPlant);
    await page.goto(`${origin}${urlPath}`, { waitUntil: 'load', timeout: 45000 });
    return { context, page, entry };
}

// Supported interaction helpers (FH-checker pattern): real collapsible header
// clicks so fields/buttons are really hit-testable before real fills/clicks.
async function isReallyHitTestable(page, selector) {
    return page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !!top && (top === el || el.contains(top));
    }, selector);
}

async function openAncestorCollapsibles(page, selector) {
    for (let attempt = 0; attempt < 4; attempt++) {
        if (await isReallyHitTestable(page, selector)) return true;
        const headers = page.locator(selector).first().locator(
            'xpath=ancestor::*[contains(@class,"collapsible-section")]/button[contains(@class,"collapsible-header")]'
        );
        const count = await headers.count();
        if (!count) return false;
        let clicked = false;
        for (let i = 0; i < count; i++) {
            const header = headers.nth(i);
            const isActive = await header.evaluate((el) => el.classList.contains('active'));
            if (!isActive) {
                await header.click();
                clicked = true;
                await page.waitForTimeout(650);
            }
        }
        if (!clicked) return isReallyHitTestable(page, selector);
    }
    return isReallyHitTestable(page, selector);
}

/** Supported clinical base fill (same fields the FH handoff oracle uses;
 * synthetic values only). In seguimiento #idPaciente is readonly and
 * prefilled by the ?id= route — it is only READ, never written. */
async function fillClinicalBase(page, { cip, isSeguimiento }) {
    if (isSeguimiento) {
        const prefilled = await page.evaluate(() => document.getElementById('idPaciente')?.value ?? '');
        record('  journey: seguimiento CIP pre-rellenado por la ruta soportada ?id= (readonly, nunca escrito)',
            prefilled === cip, JSON.stringify(prefilled));
    } else {
        await openAncestorCollapsibles(page, '#idPaciente');
        await page.fill('#idPaciente', cip);
    }
    await openAncestorCollapsibles(page, '#fechaVisita');
    await page.fill('#fechaVisita', '2026-02-10');
    await openAncestorCollapsibles(page, '#diagnosticoPrimario');
    await page.selectOption('#diagnosticoPrimario', 'espa');
    await openAncestorCollapsibles(page, '#diagnosticoSecundario');
    await page.fill('#diagnosticoSecundario', 'Lumbalgia inflamatoria sintética');
    await openAncestorCollapsibles(page, '#pcrValue');
    await page.fill('#pcrValue', '8');
    await openAncestorCollapsibles(page, '#evaGlobal');
    await page.fill('#evaGlobal', '6');
}

// ---------------------------------------------------------------------------
// Environment plant (init script, self-contained on purpose: Playwright
// serializes init scripts WITHOUT their closure scope). Controlled clipboard/
// execCommand conditions only; runtime arming happens through plain flag
// assignment, exactly like the train-18 plants. The modal and its DOM are
// never touched.
// ---------------------------------------------------------------------------

const copyTruthPlant = () => {
    window.__copyTruthWriteAttempts = 0; // every wrapped writeText invocation
    window.__copyTruthWriteMode = 'reject'; // 'reject' | 'delayed-reject' | 'throw' | 'allow'
    window.__copyTruthWriteDelayMs = 0; // delay for 'delayed-reject'
    window.__copyTruthThrown = null; // message of the last synchronous throw
    window.__copyTruthClipboardAvailable = true; // false = navigator.clipboard -> undefined
    window.__copyTruthClipboardSwitchInstalled = false;
    window.__copyTruthExecCommandArmed = false; // false = pass-through to the real execCommand
    window.__copyTruthExecCommandResult = false; // planted boolean when armed
    window.__copyTruthExecCommandCalls = 0; // armed 'copy' invocations only
    window.__copyTruthExecCommandLastResult = null;

    const originalClipboard = navigator.clipboard;

    // Controlled writeText wrapper on the clipboard instance (same pattern as
    // the train-18 clipboard plant): counts attempts and applies the runtime
    // mode (reject / delayed reject / sync throw / pass-through).
    if (originalClipboard && typeof originalClipboard.writeText === 'function') {
        const originalWriteText = originalClipboard.writeText.bind(originalClipboard);
        try {
            Object.defineProperty(originalClipboard, 'writeText', {
                configurable: true,
                value: (text) => {
                    window.__copyTruthWriteAttempts += 1;
                    const mode = window.__copyTruthWriteMode;
                    if (mode === 'reject') return Promise.reject(new Error('planted clipboard rejection (QA)'));
                    if (mode === 'delayed-reject') {
                        const delay = Number(window.__copyTruthWriteDelayMs) || 300;
                        return new Promise((resolve, reject) => {
                            setTimeout(() => reject(new Error('planted delayed clipboard rejection (QA)')), delay);
                        });
                    }
                    if (mode === 'throw') {
                        const thrown = new Error('planted clipboard throw (QA)');
                        window.__copyTruthThrown = thrown.message;
                        throw thrown;
                    }
                    return originalWriteText(text);
                },
            });
        } catch (error) { /* leave the original writeText in place */ }
    }

    // Controlled availability switch: makes navigator.clipboard unavailable
    // (undefined) when armed, exactly like a browser without the async
    // clipboard API.
    try {
        const instanceDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        const prototypeDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'clipboard');
        const target = prototypeDescriptor ? Navigator.prototype : (instanceDescriptor ? Object.getPrototypeOf(navigator) : null);
        if (target) {
            Object.defineProperty(target, 'clipboard', {
                configurable: true,
                get() { return window.__copyTruthClipboardAvailable === false ? undefined : originalClipboard; },
            });
            window.__copyTruthClipboardSwitchInstalled = true;
        }
    } catch (error) { /* stays installed=false; the case assertion fails closed */ }

    // Controlled execCommand('copy') wrapper: counts armed 'copy' calls and
    // returns the runtime-planted boolean; pass-through otherwise.
    const originalExecCommand = document.execCommand.bind(document);
    Object.defineProperty(document, 'execCommand', {
        configurable: true,
        value: function (command, showUi, value) {
            if (window.__copyTruthExecCommandArmed === true && String(command).toLowerCase() === 'copy') {
                window.__copyTruthExecCommandCalls += 1;
                window.__copyTruthExecCommandLastResult = window.__copyTruthExecCommandResult === true;
                return window.__copyTruthExecCommandLastResult;
            }
            return originalExecCommand(command, showUi, value);
        },
    });
};

// Runtime arming helpers (plain flag assignment on the planted environment;
// no DOM tampering).
async function armRejectThenFalse(page) {
    await page.evaluate(() => {
        window.__copyTruthWriteMode = 'reject';
        window.__copyTruthExecCommandArmed = true;
        window.__copyTruthExecCommandResult = false;
    });
}
async function armRejectThenTrue(page) {
    await page.evaluate(() => {
        window.__copyTruthWriteMode = 'reject';
        window.__copyTruthExecCommandArmed = true;
        window.__copyTruthExecCommandResult = true;
    });
}
async function armThrowThenFeedbackArmed(page) {
    await page.evaluate(() => {
        window.__copyTruthWriteMode = 'throw';
        window.__copyTruthExecCommandArmed = true;
        window.__copyTruthExecCommandResult = false;
    });
}
async function armClipboardUnavailableThenFalse(page) {
    await page.evaluate(() => {
        window.__copyTruthClipboardAvailable = false;
        window.__copyTruthWriteMode = 'reject';
        window.__copyTruthExecCommandArmed = true;
        window.__copyTruthExecCommandResult = false;
    });
}
async function armClipboardUnavailableThenTrue(page) {
    await page.evaluate(() => {
        window.__copyTruthClipboardAvailable = false;
        window.__copyTruthWriteMode = 'reject';
        window.__copyTruthExecCommandArmed = true;
        window.__copyTruthExecCommandResult = true;
    });
}
async function armDelayedReject(page, delayMs) {
    await page.evaluate((ms) => {
        window.__copyTruthWriteMode = 'delayed-reject';
        window.__copyTruthWriteDelayMs = ms;
        window.__copyTruthExecCommandArmed = true;
        window.__copyTruthExecCommandResult = false;
    }, delayMs);
}
async function disarmAllPlants(page) {
    // Used ONLY by the manual select/copy case so the observed keyboard copy
    // is the browser's own native path, not a planted one.
    await page.evaluate(() => {
        window.__copyTruthWriteMode = 'allow';
        window.__copyTruthClipboardAvailable = true;
        window.__copyTruthExecCommandArmed = false;
    });
}

// ---------------------------------------------------------------------------
// Supported journeys + post-state observation.
// ---------------------------------------------------------------------------

async function readModalState(page) {
    return page.evaluate(() => {
        const container = document.getElementById('textoModalContainer');
        const title = container ? container.querySelector('.texto-modal__title') : null;
        const textarea = document.getElementById('textoModalTextarea');
        const value = textarea ? textarea.value : null;
        let txtGateKeys = 0;
        try {
            txtGateKeys = Object.keys(sessionStorage).filter((key) => key.startsWith('HubClinico_TxtExportDone_')).length;
        } catch (error) { txtGateKeys = -1; }
        return {
            modalCount: document.querySelectorAll('#textoModalContainer').length,
            title: title ? title.textContent.trim() : '',
            text: value,
            readonly: textarea ? textarea.readOnly : null,
            textFields: typeof value === 'string' ? value.split('\t').length : 0,
            txtGateKeys,
        };
    });
}

async function readCopyObservation(page) {
    return page.evaluate(() => {
        const textarea = document.getElementById('textoModalTextarea');
        const value = textarea ? textarea.value : null;
        return {
            modalCount: document.querySelectorAll('#textoModalContainer').length,
            text: value,
            textFields: typeof value === 'string' ? value.split('\t').length : 0,
            successClaimVisible: document.body.innerText.includes('Contenido copiado al portapapeles.'),
            failureFeedbackVisible: document.body.innerText.includes('Error al copiar desde el modal.'),
            writeAttempts: window.__copyTruthWriteAttempts,
            thrownMessage: window.__copyTruthThrown === null ? null : String(window.__copyTruthThrown),
            clipboardAvailableAtClick: window.__copyTruthClipboardAvailable !== false,
            clipboardSwitchInstalled: window.__copyTruthClipboardSwitchInstalled === true,
            execCommandCalls: window.__copyTruthExecCommandCalls,
            execCommandLastResult: window.__copyTruthExecCommandLastResult,
        };
    });
}

/** Shared journey + payload record for a freshly opened modal. */
function recordJourney(label, before, id, titleToken) {
    record(`${label} supported journey opened the real manual-copy modal ('${titleToken || MANUAL_COPY_TITLE_TOKEN}' title) and the textarea holds the FULL synthetic payload with '${id}'`,
        before.modalCount === 1 && before.title.includes(titleToken || MANUAL_COPY_TITLE_TOKEN)
            && typeof before.text === 'string' && before.text.length > 0 && before.text.includes(id)
            && before.readonly === true,
        `modalCount=${before.modalCount} title=${JSON.stringify(before.title)} textLength=${before.text ? before.text.length : 0} readonly=${before.readonly}`);
}

/** Shared console/pageerror classification record (T1 pattern, journey page). */
function recordErrorClassification(label, entry, pageFile) {
    const pageConsoleErrors = errorsFor(entry, pageFile);
    const unclassifiedErrors = pageConsoleErrors
        .filter((message) => !CLASSIFIED_CONSOLE_ERRORS.some((cls) => message.includes(cls)));
    record(`${label} pageerror=0 and console errors stay within the explicitly classified controlled-failure classes`,
        entry.pageErrors.length === 0 && unclassifiedErrors.length === 0,
        `pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))} unclassifiedConsoleErrors=${JSON.stringify(unclassifiedErrors.slice(0, 5))} classified=${pageConsoleErrors.length}`);
}

/** Same-tab journeys track the gate page too: classify EVERYTHING seen on the
 * page object (stricter than the per-file T1 filter, no silent filtering). */
function recordErrorClassificationAll(label, entry) {
    const unclassifiedErrors = entry.consoleErrors
        .filter((message) => !CLASSIFIED_CONSOLE_ERRORS.some((cls) => message.includes(cls)));
    record(`${label} pageerror=0 and ALL console errors on the page (gate + journey) stay within the explicitly classified controlled-failure classes`,
        entry.pageErrors.length === 0 && unclassifiedErrors.length === 0,
        `pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))} unclassifiedConsoleErrors=${JSON.stringify(unclassifiedErrors.slice(0, 5))} classified=${entry.consoleErrors.length - unclassifiedErrors.length}`);
}

async function observeAfterCopyClick(page) {
    await page.click('#copyToClipboardModalBtn');
    await page.waitForTimeout(900);
    return readCopyObservation(page);
}

/** Supported TXT export journey step: click the real TXT button and wait for
 * the real manual modal (opened because the planted clipboard rejection makes
 * the auto-copy fail). */
async function txtExportAwaitModal(page) {
    await page.click('#btnExportarTXT');
    await page.waitForSelector('#textoModalContainer .texto-modal__title', { timeout: 10000 });
    await page.waitForTimeout(400);
    return readModalState(page);
}

/** Supported manual close via the modal's own 'Cerrar' button. */
async function closeModal(page) {
    await page.click('#closeModalBtn');
    await page.waitForFunction(() => !document.getElementById('textoModalContainer'), null, { timeout: 5000 });
}

async function openSharedModalViaTxtJourney(browser, origin, { id }) {
    const context = await passSupportedGate(browser, origin);
    await context.addInitScript(copyTruthPlant);
    const page = await context.newPage();
    const entry = trackedPage(page);
    await page.goto(`${origin}/${PAGE_PRIMERA}`, { waitUntil: 'load', timeout: 45000 });
    await page.fill('#idPaciente', id);
    await page.fill('#fechaVisita', '2026-09-30');
    await page.selectOption('#diagnosticoPrimario', 'les');
    await page.click('#btnExportarTXT');
    await page.waitForSelector('#textoModalContainer .texto-modal__title', { timeout: 10000 });
    await page.waitForTimeout(400);
    const before = await readModalState(page);
    return { context, page, entry, before };
}

let browser;
let origin = '';
let exitCode = 1;
try {
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    origin = `http://127.0.0.1:${server.address().port}`;

    browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
    const chromiumVersion = browser.version();
    console.log(`REUMA-SHARED-MODAL-COPY-TRUTH-BROWSER (chromium ${chromiumVersion})`);
    console.log(`Fixed-candidate expectation (T2+T3): PASS on all cases. Baseline (pre-T2) expectation: RED on the false-completion witnesses.\n`);

    // =====================================================================
    // C1 — REQUIRED false-success witness: writeText REJECTS + execCommand
    // FALSE. Truthful contract: no success claim, modal stays open with the
    // full text. Baseline claims success and closes -> FAIL.
    // =====================================================================
    {
        const label = 'C1 false-success witness (writeText REJECTS + execCommand FALSE):';
        caseHeader('C1 — writeText REJECTS + document.execCommand(\'copy\') returns FALSE (required false-completion witness)');
        const { context, page, entry, before } = await openSharedModalViaTxtJourney(browser, origin, { id: 'SYN-COPY-TRUTH-001' });
        try {
            recordJourney(label, before, 'SYN-COPY-TRUTH-001');
            await armRejectThenFalse(page);
            const after = await observeAfterCopyClick(page);
            record(`${label} plant active: writeText attempted twice (TXT auto-copy + 'Copiar' click) and rejected; armed execCommand('copy') called once returning FALSE`,
                after.writeAttempts === 2 && after.execCommandCalls === 1 && after.execCommandLastResult === false,
                `writeAttempts=${after.writeAttempts} execCommandCalls=${after.execCommandCalls} execCommandLastResult=${JSON.stringify(after.execCommandLastResult)}`);
            record(`${label} truthful contract: NO '${SUCCESS_CLAIM_TEXT}' notification after both copy paths failed`,
                after.successClaimVisible === false,
                `successClaimVisible=${after.successClaimVisible} (FALSE SUCCESS on baseline: the page claims the copy succeeded)`);
            record(`${label} truthful contract: modal stays open with the byte-identical FULL original text in #textoModalTextarea (retry/select/manual copy preserved)`,
                after.modalCount === 1 && typeof after.text === 'string' && after.text === before.text,
                `modalCount=${after.modalCount} textPresent=${typeof after.text === 'string'} textLength=${after.text ? after.text.length : 0} preserved=${after.text === before.text} (baseline auto-closed the modal)`);
            await snap(page, 't3_c1_pv_txt_modal_failure_state');
            recordErrorClassification(label, entry, PAGE_PRIMERA);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // C2 — RECOVERY/TRUE witness: writeText REJECTS + execCommand TRUE.
    // Success claim + normal close are legitimate; must PASS at baseline so
    // the checker distinguishes true from false (planted negative witness).
    // =====================================================================
    {
        const label = 'C2 recovery/true witness (writeText REJECTS + execCommand TRUE):';
        caseHeader('C2 — writeText REJECTS + document.execCommand(\'copy\') returns TRUE (legitimate recovery, negative witness)');
        const { context, page, entry, before } = await openSharedModalViaTxtJourney(browser, origin, { id: 'SYN-COPY-TRUTH-002' });
        try {
            recordJourney(label, before, 'SYN-COPY-TRUTH-002');
            await armRejectThenTrue(page);
            const after = await observeAfterCopyClick(page);
            record(`${label} plant active: writeText attempted twice and rejected; armed execCommand('copy') called once returning TRUE`,
                after.writeAttempts === 2 && after.execCommandCalls === 1 && after.execCommandLastResult === true,
                `writeAttempts=${after.writeAttempts} execCommandCalls=${after.execCommandCalls} execCommandLastResult=${JSON.stringify(after.execCommandLastResult)}`);
            record(`${label} legitimate success claim '${SUCCESS_CLAIM_TEXT}' shown`,
                after.successClaimVisible === true,
                `successClaimVisible=${after.successClaimVisible}`);
            record(`${label} normal modal close after the truthful success (modal removed)`,
                after.modalCount === 0,
                `modalCount=${after.modalCount}`);
            await snap(page, 't3_c2_pv_txt_modal_success_state');
            recordErrorClassification(label, entry, PAGE_PRIMERA);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // C3 — writeText THROWS synchronously. Truthful contract: no success
    // claim, modal open with full text, honest failure feedback, and no
    // uncaught page error. Baseline: unguarded throw kills the handler.
    // =====================================================================
    {
        const label = 'C3 writeText THROWS synchronously:';
        caseHeader('C3 — navigator.clipboard.writeText THROWS synchronously (thrown copy exception)');
        const { context, page, entry, before } = await openSharedModalViaTxtJourney(browser, origin, { id: 'SYN-COPY-TRUTH-003' });
        try {
            recordJourney(label, before, 'SYN-COPY-TRUTH-003');
            await armThrowThenFeedbackArmed(page);
            const after = await observeAfterCopyClick(page);
            record(`${label} plant active: writeText attempted twice and the second call threw synchronously ('planted clipboard throw (QA)')`,
                after.writeAttempts === 2 && after.thrownMessage !== null && after.thrownMessage.includes('planted clipboard throw'),
                `writeAttempts=${after.writeAttempts} thrownMessage=${JSON.stringify(after.thrownMessage)}`);
            record(`${label} truthful contract: NO '${SUCCESS_CLAIM_TEXT}' claim when the copy throws`,
                after.successClaimVisible === false,
                `successClaimVisible=${after.successClaimVisible}`);
            record(`${label} truthful contract: modal stays open with the byte-identical FULL original text (payload not destroyed by the failure)`,
                after.modalCount === 1 && typeof after.text === 'string' && after.text === before.text,
                `modalCount=${after.modalCount} textLength=${after.text ? after.text.length : 0} preserved=${after.text === before.text}`);
            record(`${label} truthful contract: honest failure feedback '${FAILURE_FEEDBACK_TEXT}' shown (no silent failure)`,
                after.failureFeedbackVisible === true,
                `failureFeedbackVisible=${after.failureFeedbackVisible} (baseline: the unguarded throw kills the handler, no feedback at all)`);
            record(`${label} no uncaught page error from the copy attempt (any pageerror is a failure)`,
                entry.pageErrors.length === 0,
                `pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))} (baseline: the synchronous throw escapes the click handler uncaught)`);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // C4 — navigator.clipboard UNAVAILABLE + execCommand FALSE. Truthful
    // contract: no success claim, modal open with full text. Baseline: false
    // success + auto-close -> FAIL.
    // =====================================================================
    {
        const label = 'C4 no-clipboard-API witness (clipboard UNAVAILABLE + execCommand FALSE):';
        caseHeader('C4 — navigator.clipboard UNAVAILABLE + document.execCommand(\'copy\') returns FALSE (no-API false-success witness)');
        const { context, page, entry, before } = await openSharedModalViaTxtJourney(browser, origin, { id: 'SYN-COPY-TRUTH-004' });
        try {
            recordJourney(label, before, 'SYN-COPY-TRUTH-004');
            await armClipboardUnavailableThenFalse(page);
            const after = await observeAfterCopyClick(page);
            record(`${label} plant active: clipboard API unavailable at click time (availability switch installed); only the TXT auto-copy hit writeText; armed execCommand('copy') called once returning FALSE`,
                after.clipboardSwitchInstalled === true && after.clipboardAvailableAtClick === false
                    && after.writeAttempts === 1 && after.execCommandCalls === 1 && after.execCommandLastResult === false,
                `clipboardSwitchInstalled=${after.clipboardSwitchInstalled} clipboardAvailableAtClick=${after.clipboardAvailableAtClick} writeAttempts=${after.writeAttempts} execCommandCalls=${after.execCommandCalls} execCommandLastResult=${JSON.stringify(after.execCommandLastResult)}`);
            record(`${label} truthful contract: NO '${SUCCESS_CLAIM_TEXT}' claim when no copy path succeeded`,
                after.successClaimVisible === false,
                `successClaimVisible=${after.successClaimVisible} (FALSE SUCCESS on baseline)`);
            record(`${label} truthful contract: modal stays open with the byte-identical FULL original text`,
                after.modalCount === 1 && typeof after.text === 'string' && after.text === before.text,
                `modalCount=${after.modalCount} textLength=${after.text ? after.text.length : 0} preserved=${after.text === before.text} (baseline auto-closed the modal)`);
            recordErrorClassification(label, entry, PAGE_PRIMERA);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // C5 — navigator.clipboard UNAVAILABLE + execCommand TRUE: legitimate
    // success claim + normal close; must PASS at baseline (negative witness
    // for the no-API path).
    // =====================================================================
    {
        const label = 'C5 no-clipboard-API recovery witness (clipboard UNAVAILABLE + execCommand TRUE):';
        caseHeader('C5 — navigator.clipboard UNAVAILABLE + document.execCommand(\'copy\') returns TRUE (legitimate recovery, negative witness)');
        const { context, page, entry, before } = await openSharedModalViaTxtJourney(browser, origin, { id: 'SYN-COPY-TRUTH-005' });
        try {
            recordJourney(label, before, 'SYN-COPY-TRUTH-005');
            await armClipboardUnavailableThenTrue(page);
            const after = await observeAfterCopyClick(page);
            record(`${label} plant active: clipboard API unavailable at click time; armed execCommand('copy') called once returning TRUE`,
                after.clipboardSwitchInstalled === true && after.clipboardAvailableAtClick === false
                    && after.writeAttempts === 1 && after.execCommandCalls === 1 && after.execCommandLastResult === true,
                `clipboardSwitchInstalled=${after.clipboardSwitchInstalled} clipboardAvailableAtClick=${after.clipboardAvailableAtClick} writeAttempts=${after.writeAttempts} execCommandCalls=${after.execCommandCalls} execCommandLastResult=${JSON.stringify(after.execCommandLastResult)}`);
            record(`${label} legitimate success claim '${SUCCESS_CLAIM_TEXT}' shown`,
                after.successClaimVisible === true,
                `successClaimVisible=${after.successClaimVisible}`);
            record(`${label} normal modal close after the truthful success (modal removed)`,
                after.modalCount === 0,
                `modalCount=${after.modalCount}`);
            recordErrorClassification(label, entry, PAGE_PRIMERA);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // C6 — Seguimiento TXT manual modal, writeText REJECTS + execCommand
    // FALSE: truthful failure on the Seguimiento consumer of the same seam.
    // =====================================================================
    {
        const label = 'C6 Seguimiento TXT modal false-success witness (reject + execCommand FALSE):';
        caseHeader('C6 — Seguimiento TXT export -> manual modal; writeText REJECTS + execCommand FALSE');
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_SEGUIMIENTO}?id=SYN-SEG-200`);
        try {
            await page.waitForFunction(() => {
                const el = document.getElementById('idPaciente');
                return el && el.value;
            }, null, { timeout: 15000 });
            await fillClinicalBase(page, { cip: 'SYN-SEG-200', isSeguimiento: true });
            const before = await txtExportAwaitModal(page);
            recordJourney(label, before, 'SYN-SEG-200');
            record(`${label} pre-existing TXT gate behaviour observable: the TXT export attempt registered the session gate marker even though the auto-copy failed`,
                before.txtGateKeys === 1,
                `txtGateKeys=${before.txtGateKeys}`);
            await armRejectThenFalse(page);
            const after = await observeAfterCopyClick(page);
            record(`${label} plant active: writeText attempted twice (TXT auto-copy + 'Copiar' click) and rejected; armed execCommand('copy') called once returning FALSE`,
                after.writeAttempts === 2 && after.execCommandCalls === 1 && after.execCommandLastResult === false,
                `writeAttempts=${after.writeAttempts} execCommandCalls=${after.execCommandCalls} execCommandLastResult=${JSON.stringify(after.execCommandLastResult)}`);
            record(`${label} truthful contract: NO '${SUCCESS_CLAIM_TEXT}' notification after both copy paths failed`,
                after.successClaimVisible === false,
                `successClaimVisible=${after.successClaimVisible} (FALSE SUCCESS on baseline)`);
            record(`${label} truthful contract: modal stays open with the byte-identical FULL original clinical text`,
                after.modalCount === 1 && typeof after.text === 'string' && after.text === before.text,
                `modalCount=${after.modalCount} textLength=${after.text ? after.text.length : 0} preserved=${after.text === before.text}`);
            await snap(page, 't3_c6_seg_txt_modal_failure_state');
            recordErrorClassificationAll(label, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // C7 — Seguimiento TXT manual modal, writeText REJECTS + execCommand
    // TRUE: legitimate recovery on the Seguimiento consumer.
    // =====================================================================
    {
        const label = 'C7 Seguimiento TXT modal recovery witness (reject + execCommand TRUE):';
        caseHeader('C7 — Seguimiento TXT export -> manual modal; writeText REJECTS + execCommand TRUE');
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_SEGUIMIENTO}?id=SYN-SEG-200`);
        try {
            await page.waitForFunction(() => {
                const el = document.getElementById('idPaciente');
                return el && el.value;
            }, null, { timeout: 15000 });
            await fillClinicalBase(page, { cip: 'SYN-SEG-200', isSeguimiento: true });
            const before = await txtExportAwaitModal(page);
            recordJourney(label, before, 'SYN-SEG-200');
            await armRejectThenTrue(page);
            const after = await observeAfterCopyClick(page);
            record(`${label} plant active: writeText attempted twice and rejected; armed execCommand('copy') called once returning TRUE`,
                after.writeAttempts === 2 && after.execCommandCalls === 1 && after.execCommandLastResult === true,
                `writeAttempts=${after.writeAttempts} execCommandCalls=${after.execCommandCalls} execCommandLastResult=${JSON.stringify(after.execCommandLastResult)}`);
            record(`${label} legitimate success claim '${SUCCESS_CLAIM_TEXT}' shown`,
                after.successClaimVisible === true,
                `successClaimVisible=${after.successClaimVisible}`);
            record(`${label} normal modal close after the truthful success (modal removed)`,
                after.modalCount === 0,
                `modalCount=${after.modalCount}`);
            recordErrorClassificationAll(label, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // C8 — Primera Visita: the TXT gate BLOCKS CSV when TXT was not exported
    // for this visit. The gate must keep working: explicit legal message, NO
    // modal, NO clipboard delivery attempt of any 497 payload.
    // =====================================================================
    {
        const label = 'C8 PV TXT gate blocks CSV (gate keeps working):';
        caseHeader('C8 — Primera Visita: #btnEstructurarCSV WITHOUT a prior TXT export for the visit (gate-blocked)');
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`);
        try {
            await fillClinicalBase(page, { cip: 'SYN-CSV-BLOCK-001', isSeguimiento: false });
            await page.click('#btnEstructurarCSV');
            await page.waitForTimeout(700);
            const state = await page.evaluate(async () => {
                let clipboardHasTsvRow = false;
                try {
                    const text = await navigator.clipboard.readText();
                    clipboardHasTsvRow = typeof text === 'string' && text.includes('\t');
                } catch (error) { clipboardHasTsvRow = `read-failed:${error.message}`; }
                return {
                    modalCount: document.querySelectorAll('#textoModalContainer').length,
                    gateBlockedMessageVisible: document.body.innerText.includes('Debe exportar TXT de esta visita antes de exportar CSV.'),
                    writeAttempts: window.__copyTruthWriteAttempts,
                    clipboardHasTsvRow,
                };
            });
            record(`${label} gate keeps working: the legal prerequisite message '${GATE_BLOCK_TEXT}' is shown`,
                state.gateBlockedMessageVisible === true,
                `gateBlockedMessageVisible=${state.gateBlockedMessageVisible}`);
            record(`${label} gate keeps working: NO manual-copy modal opened and NO clipboard delivery was attempted (writeText attempts=0, no TSV row on the clipboard)`,
                state.modalCount === 0 && state.writeAttempts === 0 && state.clipboardHasTsvRow === false,
                `modalCount=${state.modalCount} writeAttempts=${state.writeAttempts} clipboardHasTsvRow=${JSON.stringify(state.clipboardHasTsvRow)}`);
            recordErrorClassificationAll(label, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // C9 — Primera Visita gated TXT→CSV path reaches the 497-column CSV
    // manual modal; the shared Copiar handler must fail TRUTHFULLY there
    // (no success claim, byte-identical 497 payload preserved).
    // =====================================================================
    {
        const label = 'C9 PV 497-column CSV manual modal (gated TXT→CSV, reject + execCommand FALSE):';
        caseHeader('C9 — Primera Visita: TXT export (gate registered) -> #btnEstructurarCSV -> 497 CSV manual modal -> truthful Copiar failure');
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`);
        try {
            await fillClinicalBase(page, { cip: 'SYN-CSV-497-001', isSeguimiento: false });
            const txtBefore = await txtExportAwaitModal(page);
            record(`${label} journey step 1: TXT export opened the real manual modal (auto-copy rejected)`,
                txtBefore.modalCount === 1 && txtBefore.title.includes(MANUAL_COPY_TITLE_TOKEN),
                `modalCount=${txtBefore.modalCount} title=${JSON.stringify(txtBefore.title)}`);
            await closeModal(page);
            await page.click('#btnEstructurarCSV');
            await page.waitForSelector('#textoModalContainer .texto-modal__title', { timeout: 10000 });
            await page.waitForTimeout(400);
            const before = await readModalState(page);
            record(`${label} journey step 2: the gated TXT→CSV path opened the real '${CSV_MODAL_TITLE_TOKEN}' modal with the FULL 497-field payload`,
                before.modalCount === 1 && before.title.includes(CSV_MODAL_TITLE_TOKEN)
                    && before.textFields === CSV_FIELD_COUNT && before.readonly === true,
                `modalCount=${before.modalCount} title=${JSON.stringify(before.title)} fields=${before.textFields} readonly=${before.readonly}`);
            await snap(page, 't3_c9_pv_csv497_modal_open');
            await armRejectThenFalse(page);
            const after = await observeAfterCopyClick(page);
            record(`${label} plant active: writeText attempted three times (TXT auto + CSV auto + 'Copiar' click) and rejected; armed execCommand('copy') called once returning FALSE`,
                after.writeAttempts === 3 && after.execCommandCalls === 1 && after.execCommandLastResult === false,
                `writeAttempts=${after.writeAttempts} execCommandCalls=${after.execCommandCalls} execCommandLastResult=${JSON.stringify(after.execCommandLastResult)}`);
            record(`${label} truthful contract: NO '${SUCCESS_CLAIM_TEXT}' notification after both copy paths failed on the CSV journey`,
                after.successClaimVisible === false,
                `successClaimVisible=${after.successClaimVisible} (FALSE SUCCESS on baseline)`);
            record(`${label} truthful contract: modal stays open with the byte-identical FULL ${CSV_FIELD_COUNT}-field payload (clinical 497 projection not lost/truncated)`,
                after.modalCount === 1 && after.textFields === CSV_FIELD_COUNT && after.text === before.text,
                `modalCount=${after.modalCount} fields=${after.textFields} preserved=${after.text === before.text}`);
            recordErrorClassificationAll(label, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // C10 — Seguimiento: gate-blocked CSV + gated 497 CSV manual modal with
    // a truthful Copiar failure (same pair as C8/C9 on Seguimiento).
    // =====================================================================
    {
        const label = 'C10 Seguimiento gate-blocked CSV + 497 CSV manual modal:';
        caseHeader('C10 — Seguimiento: #btnEstructurarCSV blocked without TXT; after TXT the gated path opens the 497 CSV manual modal with truthful failure');
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_SEGUIMIENTO}?id=SYN-SEG-200`);
        try {
            await page.waitForFunction(() => {
                const el = document.getElementById('idPaciente');
                return el && el.value;
            }, null, { timeout: 15000 });
            await fillClinicalBase(page, { cip: 'SYN-SEG-200', isSeguimiento: true });
            await page.click('#btnEstructurarCSV');
            await page.waitForTimeout(700);
            const blocked = await page.evaluate(() => ({
                modalCount: document.querySelectorAll('#textoModalContainer').length,
                gateBlockedMessageVisible: document.body.innerText.includes('Debe exportar TXT de esta visita antes de exportar CSV.'),
                writeAttempts: window.__copyTruthWriteAttempts,
            }));
            record(`${label} gate keeps working on Seguimiento: '${GATE_BLOCK_TEXT}' shown, NO modal, NO clipboard delivery attempt`,
                blocked.gateBlockedMessageVisible === true && blocked.modalCount === 0 && blocked.writeAttempts === 0,
                `gateBlockedMessageVisible=${blocked.gateBlockedMessageVisible} modalCount=${blocked.modalCount} writeAttempts=${blocked.writeAttempts}`);
            const txtBefore = await txtExportAwaitModal(page);
            record(`${label} journey step 2: TXT export opened the real manual modal (auto-copy rejected)`,
                txtBefore.modalCount === 1 && txtBefore.title.includes(MANUAL_COPY_TITLE_TOKEN),
                `modalCount=${txtBefore.modalCount} title=${JSON.stringify(txtBefore.title)}`);
            await closeModal(page);
            await page.click('#btnEstructurarCSV');
            await page.waitForSelector('#textoModalContainer .texto-modal__title', { timeout: 10000 });
            await page.waitForTimeout(400);
            const before = await readModalState(page);
            record(`${label} journey step 3: the gated path opened the real '${CSV_MODAL_TITLE_TOKEN}' modal with the FULL 497-field payload`,
                before.modalCount === 1 && before.title.includes(CSV_MODAL_TITLE_TOKEN)
                    && before.textFields === CSV_FIELD_COUNT && before.readonly === true,
                `modalCount=${before.modalCount} title=${JSON.stringify(before.title)} fields=${before.textFields} readonly=${before.readonly}`);
            await snap(page, 't3_c10_seg_csv497_modal_open');
            await armRejectThenFalse(page);
            const after = await observeAfterCopyClick(page);
            record(`${label} truthful contract: NO '${SUCCESS_CLAIM_TEXT}' notification and modal stays open with the byte-identical FULL ${CSV_FIELD_COUNT}-field payload`,
                after.successClaimVisible === false && after.modalCount === 1
                    && after.textFields === CSV_FIELD_COUNT && after.text === before.text,
                `successClaimVisible=${after.successClaimVisible} modalCount=${after.modalCount} fields=${after.textFields} preserved=${after.text === before.text}`);
            recordErrorClassificationAll(label, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // C11 — Solicitud FH on Primera Visita (pharmacyRequest ->
    // renderRequestModal -> shared modal): truthful failure then recovery.
    // =====================================================================
    {
        const label = 'C11 Solicitud FH on Primera Visita (reject+FALSE then reject+TRUE):';
        caseHeader('C11 — Primera Visita: real #btnSolicitudFH -> FH manual modal; truthful Copiar failure, then legitimate recovery');
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`);
        try {
            await fillClinicalBase(page, { cip: 'CIP-SYN-FH-T3-001', isSeguimiento: false });
            await openAncestorCollapsibles(page, '#btnSolicitudFH');
            await page.click('#btnSolicitudFH');
            await page.waitForSelector('#textoModalContainer .texto-modal__title', { timeout: 10000 });
            await page.waitForTimeout(400);
            const before = await readModalState(page);
            recordJourney(label, before, 'CIP-SYN-FH-T3-001', FH_MODAL_TITLE_TOKEN);
            await snap(page, 't3_c11_pv_fh_modal_open');
            await armRejectThenFalse(page);
            const failure = await observeAfterCopyClick(page);
            record(`${label} truthful contract (reject+FALSE): writeText attempted twice (FH auto + 'Copiar' click); NO '${SUCCESS_CLAIM_TEXT}' claim; modal open with the byte-identical FULL FH request text and honest failure feedback`,
                failure.writeAttempts === 2 && failure.successClaimVisible === false
                    && failure.modalCount === 1 && failure.text === before.text && failure.failureFeedbackVisible === true,
                `writeAttempts=${failure.writeAttempts} successClaimVisible=${failure.successClaimVisible} modalCount=${failure.modalCount} preserved=${failure.text === before.text} failureFeedbackVisible=${failure.failureFeedbackVisible}`);
            if (failure.modalCount === 1) {
                await armRejectThenTrue(page);
                const recovery = await observeAfterCopyClick(page);
                record(`${label} legitimate recovery (reject+TRUE): success claim shown and modal closed (negative witness: true success is still rewarded)`,
                    recovery.writeAttempts === 3 && recovery.execCommandLastResult === true
                        && recovery.successClaimVisible === true && recovery.modalCount === 0,
                    `writeAttempts=${recovery.writeAttempts} execCommandLastResult=${JSON.stringify(recovery.execCommandLastResult)} successClaimVisible=${recovery.successClaimVisible} modalCount=${recovery.modalCount}`);
                await snap(page, 't3_c11_pv_fh_success_state');
            } else {
                record(`${label} truthful contract: retry preserved — the modal stays open after the failed attempt so a recovery attempt is possible`,
                    false,
                    `modalCount=${failure.modalCount} (baseline: the false-success auto-close destroys the modal, making retry impossible)`);
            }
            recordErrorClassificationAll(label, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // C12 — Solicitud FH on Seguimiento: truthful failure (reject+FALSE).
    // =====================================================================
    {
        const label = 'C12 Solicitud FH on Seguimiento (reject + execCommand FALSE):';
        caseHeader('C12 — Seguimiento: real #btnSolicitudFH -> FH manual modal; truthful Copiar failure');
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_SEGUIMIENTO}?id=SYN-SEG-200`);
        try {
            await page.waitForFunction(() => {
                const el = document.getElementById('idPaciente');
                return el && el.value;
            }, null, { timeout: 15000 });
            await fillClinicalBase(page, { cip: 'SYN-SEG-200', isSeguimiento: true });
            await openAncestorCollapsibles(page, '#btnSolicitudFH');
            await page.click('#btnSolicitudFH');
            await page.waitForSelector('#textoModalContainer .texto-modal__title', { timeout: 10000 });
            await page.waitForTimeout(400);
            const before = await readModalState(page);
            recordJourney(label, before, 'SYN-SEG-200', FH_MODAL_TITLE_TOKEN);
            await armRejectThenFalse(page);
            const after = await observeAfterCopyClick(page);
            record(`${label} truthful contract: writeText attempted twice; NO '${SUCCESS_CLAIM_TEXT}' claim; modal open with the byte-identical FULL FH request text and honest failure feedback`,
                after.writeAttempts === 2 && after.successClaimVisible === false
                    && after.modalCount === 1 && after.text === before.text && after.failureFeedbackVisible === true,
                `writeAttempts=${after.writeAttempts} successClaimVisible=${after.successClaimVisible} modalCount=${after.modalCount} preserved=${after.text === before.text} failureFeedbackVisible=${after.failureFeedbackVisible}`);
            recordErrorClassificationAll(label, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // C13 — Solicitud FH on the Dashboard consumer: truthful failure
    // (reject+FALSE) through the same shared modal seam.
    // =====================================================================
    {
        const label = 'C13 Solicitud FH on Dashboard (reject + execCommand FALSE):';
        caseHeader('C13 — dashboard_paciente.html: real #btnSolicitudFH -> FH manual modal; truthful Copiar failure');
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_DASHBOARD}?id=SYN-DASH-900`);
        try {
            await openAncestorCollapsibles(page, '#btnSolicitudFH');
            await page.click('#btnSolicitudFH');
            await page.waitForSelector('#textoModalContainer .texto-modal__title', { timeout: 10000 });
            await page.waitForTimeout(400);
            const before = await readModalState(page);
            recordJourney(label, before, 'SYN-DASH-900', FH_MODAL_TITLE_TOKEN);
            await snap(page, 't3_c13_dashboard_fh_modal_open');
            await armRejectThenFalse(page);
            const after = await observeAfterCopyClick(page);
            record(`${label} truthful contract: writeText attempted twice; NO '${SUCCESS_CLAIM_TEXT}' claim; modal open with the byte-identical FULL FH request text and honest failure feedback`,
                after.writeAttempts === 2 && after.successClaimVisible === false
                    && after.modalCount === 1 && after.text === before.text && after.failureFeedbackVisible === true,
                `writeAttempts=${after.writeAttempts} successClaimVisible=${after.successClaimVisible} modalCount=${after.modalCount} preserved=${after.text === before.text} failureFeedbackVisible=${after.failureFeedbackVisible}`);
            recordErrorClassificationAll(label, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // C14a — REPEATED/RAPID attempts: two fast Copiar clicks with both copy
    // paths failing. No false success, modal stays open, full text.
    // =====================================================================
    {
        const label = 'C14a repeated/rapid Copiar attempts (both fail):';
        caseHeader('C14a — Primera Visita TXT modal: two rapid Copiar clicks under reject+FALSE');
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`);
        try {
            await fillClinicalBase(page, { cip: 'SYN-RAPID-001', isSeguimiento: false });
            const before = await txtExportAwaitModal(page);
            recordJourney(label, before, 'SYN-RAPID-001');
            await armRejectThenFalse(page);
            await page.click('#copyToClipboardModalBtn');
            try {
                await page.click('#copyToClipboardModalBtn', { timeout: 2000 }); // rapid second attempt
                await page.waitForTimeout(900);
                const after = await readCopyObservation(page);
                record(`${label} plant active: writeText attempted three times (TXT auto + 2 clicks); armed execCommand('copy') called twice, both FALSE`,
                    after.writeAttempts === 3 && after.execCommandCalls === 2 && after.execCommandLastResult === false,
                    `writeAttempts=${after.writeAttempts} execCommandCalls=${after.execCommandCalls} execCommandLastResult=${JSON.stringify(after.execCommandLastResult)}`);
                record(`${label} truthful contract under repeated attempts: NO '${SUCCESS_CLAIM_TEXT}' false success; modal stays open with the byte-identical FULL original text and honest failure feedback`,
                    after.successClaimVisible === false && after.modalCount === 1
                        && after.text === before.text && after.failureFeedbackVisible === true,
                    `successClaimVisible=${after.successClaimVisible} modalCount=${after.modalCount} preserved=${after.text === before.text} failureFeedbackVisible=${after.failureFeedbackVisible}`);
            } catch (error) {
                record(`${label} truthful contract under repeated attempts: the modal survived the first failed attempt so the rapid second attempt was possible`,
                    false,
                    `${String(error.message).split('\n')[0]} (baseline: the false-success auto-close removes the Copiar button mid-sequence)`);
            }
            recordErrorClassificationAll(label, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // C14b — STALE in-flight completion: attempt A parked on a DELAYED
    // writeText rejection; attempt B succeeds through the no-API fallback and
    // closes the modal; A's late rejection lands AFTER the close. The
    // per-attempt token/isConnected guard must suppress it: NO stale failure
    // toast may appear after the truthful success/close.
    // =====================================================================
    {
        const label = 'C14b stale in-flight completion witness (delayed rejection lands after success+close):';
        caseHeader('C14b — Primera Visita TXT modal: attempt A delayed-reject (500ms), attempt B succeeds via no-API fallback, A lands late');
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`);
        try {
            await fillClinicalBase(page, { cip: 'SYN-STALE-001', isSeguimiento: false });
            const before = await txtExportAwaitModal(page);
            recordJourney(label, before, 'SYN-STALE-001');
            await armDelayedReject(page, 500);
            await page.click('#copyToClipboardModalBtn'); // attempt A: parked 500ms
            await armClipboardUnavailableThenTrue(page);  // B takes the no-API fallback path
            await page.click('#copyToClipboardModalBtn'); // attempt B: succeeds immediately
            await page.waitForFunction(() => !document.getElementById('textoModalContainer'), null, { timeout: 5000 });
            await armRejectThenFalse(page); // re-arm FALSE so A's LATE fallback would (if unguarded) toast a false failure
            await page.waitForTimeout(1400); // settle past A's 500ms rejection + fallback
            const after = await readCopyObservation(page);
            record(`${label} plant active: writeText attempted twice (TXT auto + delayed A); armed execCommand('copy') called twice (B success TRUE + A late FALSE)`,
                after.writeAttempts === 2 && after.execCommandCalls === 2,
                `writeAttempts=${after.writeAttempts} execCommandCalls=${after.execCommandCalls}`);
            record(`${label} truthful contract: attempt B produced the legitimate '${SUCCESS_CLAIM_TEXT}' claim and the modal closed`,
                after.successClaimVisible === true && after.modalCount === 0,
                `successClaimVisible=${after.successClaimVisible} modalCount=${after.modalCount}`);
            record(`${label} no stale in-flight completion: attempt A's late FALSE result (after close) is suppressed — NO '${FAILURE_FEEDBACK_TEXT}' toast appears after the truthful success`,
                after.failureFeedbackVisible === false,
                `failureFeedbackVisible=${after.failureFeedbackVisible} (a regression dropping the per-attempt token/isConnected guard would let the stale FALSE toast a false failure here)`);
            recordErrorClassificationAll(label, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // C15 — MANUAL select/copy of the textarea on a failure state: with ALL
    // plants disarmed, real keyboard Ctrl+A selects the full original text in
    // the readonly textarea and real Ctrl+C copies it to the REAL clipboard
    // while the modal stays open (the promised manual copy path).
    // =====================================================================
    {
        const label = 'C15 manual select/copy of the textarea (real keyboard, no plants):';
        caseHeader('C15 — Primera Visita TXT modal in failure state: real Ctrl+A + Ctrl+C into the REAL clipboard');
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`);
        try {
            await fillClinicalBase(page, { cip: 'SYN-MANUAL-001', isSeguimiento: false });
            const before = await txtExportAwaitModal(page);
            recordJourney(label, before, 'SYN-MANUAL-001');
            await armRejectThenFalse(page);
            const failure = await observeAfterCopyClick(page);
            const preconditionOk = failure.successClaimVisible === false && failure.modalCount === 1 && failure.text === before.text;
            record(`${label} precondition: the modal is in a truthful failure state (no success claim, open, full text)`,
                preconditionOk,
                `successClaimVisible=${failure.successClaimVisible} modalCount=${failure.modalCount} preserved=${failure.text === before.text} (baseline: false-success auto-close makes the manual path unreachable)`);
            if (preconditionOk) {
                await disarmAllPlants(page);
                await page.focus('#textoModalTextarea');
                await page.keyboard.press('Control+a');
                const selection = await page.evaluate(() => {
                    const textarea = document.getElementById('textoModalTextarea');
                    return {
                        start: textarea ? textarea.selectionStart : -1,
                        end: textarea ? textarea.selectionEnd : -1,
                        length: textarea ? textarea.value.length : -1,
                    };
                });
                record(`${label} manual select: real keyboard Ctrl+A selected the FULL original text in the readonly textarea (0..length, nothing altered)`,
                    selection.start === 0 && selection.end === selection.length && selection.length === before.text.length,
                    `selection=${JSON.stringify(selection)} expectedLength=${before.text.length}`);
                await page.keyboard.press('Control+c'); // REAL native copy of the real selection
                await page.waitForTimeout(400);
                const manualCopy = await page.evaluate(async () => {
                    const textarea = document.getElementById('textoModalTextarea');
                    return {
                        clipboard: await navigator.clipboard.readText(),
                        modalCount: document.querySelectorAll('#textoModalContainer').length,
                        text: textarea ? textarea.value : null,
                    };
                });
                record(`${label} manual copy: the REAL clipboard now holds the byte-identical FULL original clinical string (browser-native copy, not a planted one)`,
                    manualCopy.clipboard === before.text,
                    `clipboardLength=${manualCopy.clipboard ? manualCopy.clipboard.length : 0} expectedLength=${before.text.length} identical=${manualCopy.clipboard === before.text}`);
                record(`${label} manual path preserved: the modal stays open with the untouched original text (manual copy never closes/destroys it)`,
                    manualCopy.modalCount === 1 && manualCopy.text === before.text,
                    `modalCount=${manualCopy.modalCount} preserved=${manualCopy.text === before.text}`);
                await snap(page, 't3_c15_manual_select_copy_state');
            }
            recordErrorClassificationAll(label, entry);
        } finally {
            await context.close();
        }
    }

    const passed = results.filter((r) => r.pass).length;
    const total = results.length;
    console.log(`\nREUMA-SHARED-MODAL-COPY-TRUTH-BROWSER: ${passed === total ? 'PASS' : 'FAIL'} ${passed}/${total}`);
    exitCode = passed === total ? 0 : 1;
} catch (err) {
    console.error('ENVIRONMENT FAILURE: ' + (err && err.stack ? err.stack : err));
    const passed = results.filter((r) => r.pass).length;
    console.log(`\nREUMA-SHARED-MODAL-COPY-TRUTH-BROWSER: FAIL ${passed}/${results.length}`);
    exitCode = 1;
} finally {
    try { if (browser) await browser.close(); } catch { /* noop */ }
    try { server.close(); } catch { /* noop */ }
    try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* noop */ }
}
process.exit(exitCode);
