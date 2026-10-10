#!/usr/bin/env node
'use strict';
/**
 * Browser contract check for WO-REUMA-COPY-TRUTH-20A (T1, TRAIN-NEXUS-COPY-
 * STORAGE-19, issue #620): the shared text modal `mostrarModalTexto(texto,
 * titulo, mensaje)` in `modules/formController.js` must be TRUTHFUL about
 * clipboard copying. On the exact current baseline this checker is expected
 * RED: the `Copiar` handler calls
 * `navigator.clipboard.writeText(...).catch(() => fallbackCopy())` where
 * `fallbackCopy()` runs `document.execCommand('copy')` and DROPS its boolean
 * result, so `Promise.resolve(copyPromise).then(...)` always claims
 * 'Contenido copiado al portapapeles.' and auto-closes the modal even when
 * BOTH copy paths failed (false success / false completion).
 *
 * EXPECTED BASELINE VERDICT (T1 contract, must be genuinely observed):
 *   RED on the false-completion witnesses (C1/C3/C4) and GREEN on the
 *   recovery/true witnesses (C2/C5). C2/C5 are the planted negative witness:
 *   they prove the same supported journey + observation machinery that fails
 *   C1/C4 passes when the fallback copy genuinely succeeds, i.e. the checker
 *   DISTINGUISHES true from false success instead of failing everything.
 *
 * Seam under test (read-only in this phase, NO product code is changed):
 *   modules/formController.js  mostrarModalTexto (~line 1042) and its
 *   #copyToClipboardModalBtn 'Copiar' click handler (~1076-1099).
 *
 * Consumers of the same seam (context only; not exercised beyond the
 * supported TXT journey): modules/exportManager.js:openManualCopyModal (TXT
 * export manual copy), modules/pharmacyRequest.js:renderRequestModal
 * (Solicitud FH).
 *
 * Conventions (same as tools/reuma_pending_retirement_browser_check.mjs /
 * tools/reuma_export_boundary_browser_check.mjs): real repo-root HTTP server,
 * the real session gate on reuma_index.html (file input -> professional
 * select -> confirm), real navigation to primera_visita.html and the real
 * supported TXT-export journey (fill id/date/diagnosis -> click
 * #btnExportarTXT -> the planted clipboard rejection opens the real manual
 * modal) -> a REAL supported click on the modal's `#copyToClipboardModalBtn`
 * 'Copiar' button. Synthetic data only ('SYN-*' ids); no real patient data.
 *
 * Evidence limits: supported interactions only — the modal is NEVER tampered
 * with, no handler is called directly, no impossible fixture. Environment
 * conditions/plants go ONLY through `page.addInitScript` (established repo
 * convention, same as train 18): a controlled `navigator.clipboard.writeText`
 * wrapper (pass-through / reject / sync-throw), a controlled
 * `document.execCommand('copy')` wrapper (armed boolean or pass-through) and
 * a clipboard-availability switch (`navigator.clipboard` -> undefined), all
 * armed/disarmed at runtime through plain flag assignment. Modal/textarea/
 * notification state is read AFTER the supported click as post-state
 * observation; nothing is injected into the page.
 *
 * Console policy: `console.error` is CLASSIFIED explicitly per case (the
 * exportManager TXT auto-copy failure 'Error al copiar al portapapeles
 * automáticamente:' and the formController modal-copy failure 'Error al
 * copiar desde el modal:' are the expected controlled-failure classes);
 * unclassified console errors and ANY pageerror are failures.
 *
 * Cases:
 *   C1  REQUIRED false-success witness: writeText REJECTS and execCommand
 *       ('copy') returns FALSE. Truthful contract: NO success claim, modal
 *       stays open with the full original text for retry/select/manual copy.
 *       Baseline: the page claims success and auto-closes -> FAIL (the
 *       claimed RED).
 *   C2  RECOVERY/TRUE witness: writeText REJECTS and execCommand('copy')
 *       returns TRUE. Per the accepted contract a success claim and normal
 *       modal close are legitimate. Baseline: PASS (negative witness that
 *       distinguishes true from false).
 *   C3  writeText THROWS synchronously. Truthful contract: no success claim,
 *       modal open with full text preserved, honest failure feedback, and no
 *       uncaught page error. Baseline: the handler dies on the unguarded
 *       throw (no feedback at all + pageerror) -> FAIL.
 *   C4  navigator.clipboard UNAVAILABLE (plant switch) and execCommand
 *       returns FALSE. Truthful contract: no success claim, modal open with
 *       full text. Baseline: false success + auto-close -> FAIL.
 *   C5  navigator.clipboard UNAVAILABLE and execCommand returns TRUE:
 *       success claim + close are legitimate. Baseline: PASS.
 *
 * Usage: node tools/reuma_shared_modal_copy_truth_browser_check.mjs
 * Documented env var: PLAYWRIGHT_CHROMIUM_EXECUTABLE (headless-shell path).
 * Exit code 0 = every case PASS, 1 = at least one FAIL or environment
 * failure. On the current baseline the expected result is FAIL with the C1,
 * C3 and C4 false-completion assertions failing.
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
const SUCCESS_CLAIM_TEXT = 'Contenido copiado al portapapeles.';
const FAILURE_FEEDBACK_TEXT = 'Error al copiar desde el modal.';
const MANUAL_COPY_TITLE_TOKEN = 'Copia Manual';
const CLASSIFIED_CONSOLE_ERRORS = [
    'Error al copiar al portapapeles automáticamente', // exportManager TXT auto-copy failure (controlled)
    'Error al copiar desde el modal', // formController modal-copy failure (controlled)
];

const results = [];
function record(name, pass, detail) {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}
function caseHeader(label) {
    console.log(`\nCASE ${label}`);
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

// ---------------------------------------------------------------------------
// Environment plant (init script, self-contained on purpose: Playwright
// serializes init scripts WITHOUT their closure scope). Controlled clipboard/
// execCommand conditions only; runtime arming happens through plain flag
// assignment, exactly like the train-18 plants. The modal and its DOM are
// never touched.
// ---------------------------------------------------------------------------

const copyTruthPlant = () => {
    window.__copyTruthWriteAttempts = 0; // every wrapped writeText invocation
    window.__copyTruthWriteMode = 'reject'; // 'reject' | 'throw' | 'allow'
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
    // mode (reject / sync throw / pass-through).
    if (originalClipboard && typeof originalClipboard.writeText === 'function') {
        const originalWriteText = originalClipboard.writeText.bind(originalClipboard);
        try {
            Object.defineProperty(originalClipboard, 'writeText', {
                configurable: true,
                value: (text) => {
                    window.__copyTruthWriteAttempts += 1;
                    const mode = window.__copyTruthWriteMode;
                    if (mode === 'reject') return Promise.reject(new Error('planted clipboard rejection (QA)'));
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

// ---------------------------------------------------------------------------
// Supported journey: the REAL manual-copy modal opened through the real TXT
// export path (exportManager -> clipboard write rejected -> shared modal),
// then a REAL supported click on the modal's own 'Copiar' button.
// ---------------------------------------------------------------------------

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
    const before = await page.evaluate(() => {
        const container = document.getElementById('textoModalContainer');
        const title = container ? container.querySelector('.texto-modal__title') : null;
        const textarea = document.getElementById('textoModalTextarea');
        return {
            modalCount: document.querySelectorAll('#textoModalContainer').length,
            title: title ? title.textContent.trim() : '',
            text: textarea ? textarea.value : null,
            readonly: textarea ? textarea.readOnly : null,
        };
    });
    return { context, page, entry, before };
}

async function clickCopyAndObserve(page) {
    // REAL supported click on the real modal's 'Copiar' button — no DOM
    // tampering, no direct handler invocation.
    await page.click('#copyToClipboardModalBtn');
    await page.waitForTimeout(900);
    return page.evaluate(() => {
        const textarea = document.getElementById('textoModalTextarea');
        return {
            modalCount: document.querySelectorAll('#textoModalContainer').length,
            text: textarea ? textarea.value : null,
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

/** Shared console/pageerror classification record. */
function recordErrorClassification(label, entry, pageFile) {
    const pageConsoleErrors = errorsFor(entry, pageFile);
    const unclassifiedErrors = pageConsoleErrors
        .filter((message) => !CLASSIFIED_CONSOLE_ERRORS.some((cls) => message.includes(cls)));
    record(`${label} pageerror=0 and console errors stay within the explicitly classified controlled-failure classes`,
        entry.pageErrors.length === 0 && unclassifiedErrors.length === 0,
        `pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))} unclassifiedConsoleErrors=${JSON.stringify(unclassifiedErrors.slice(0, 5))} classified=${pageConsoleErrors.length}`);
}

/** Shared journey + payload record for a freshly opened modal. */
function recordJourney(label, before, id) {
    record(`${label} supported TXT journey opened the real manual-copy modal ('${MANUAL_COPY_TITLE_TOKEN}' title) and the textarea holds the FULL synthetic payload with '${id}'`,
        before.modalCount === 1 && before.title.includes(MANUAL_COPY_TITLE_TOKEN)
            && typeof before.text === 'string' && before.text.length > 0 && before.text.includes(id)
            && before.readonly === true,
        `modalCount=${before.modalCount} title=${JSON.stringify(before.title)} textLength=${before.text ? before.text.length : 0} readonly=${before.readonly}`);
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
    console.log(`Expected baseline verdict: RED — C1/C3/C4 false-completion witnesses FAIL, C2/C5 recovery witnesses PASS.\n`);

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
            const after = await clickCopyAndObserve(page);
            record(`${label} plant active: writeText attempted twice (TXT auto-copy + 'Copiar' click) and rejected; armed execCommand('copy') called once returning FALSE`,
                after.writeAttempts === 2 && after.execCommandCalls === 1 && after.execCommandLastResult === false,
                `writeAttempts=${after.writeAttempts} execCommandCalls=${after.execCommandCalls} execCommandLastResult=${JSON.stringify(after.execCommandLastResult)}`);
            record(`${label} truthful contract: NO '${SUCCESS_CLAIM_TEXT}' notification after both copy paths failed`,
                after.successClaimVisible === false,
                `successClaimVisible=${after.successClaimVisible} (FALSE SUCCESS on baseline: the page claims the copy succeeded)`);
            record(`${label} truthful contract: modal stays open with the byte-identical FULL original text in #textoModalTextarea (retry/select/manual copy preserved)`,
                after.modalCount === 1 && typeof after.text === 'string' && after.text === before.text,
                `modalCount=${after.modalCount} textPresent=${typeof after.text === 'string'} textLength=${after.text ? after.text.length : 0} preserved=${after.text === before.text} (baseline auto-closed the modal)`);
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
            const after = await clickCopyAndObserve(page);
            record(`${label} plant active: writeText attempted twice and rejected; armed execCommand('copy') called once returning TRUE`,
                after.writeAttempts === 2 && after.execCommandCalls === 1 && after.execCommandLastResult === true,
                `writeAttempts=${after.writeAttempts} execCommandCalls=${after.execCommandCalls} execCommandLastResult=${JSON.stringify(after.execCommandLastResult)}`);
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
            const after = await clickCopyAndObserve(page);
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
            const after = await clickCopyAndObserve(page);
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
            const after = await clickCopyAndObserve(page);
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
