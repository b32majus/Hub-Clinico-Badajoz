#!/usr/bin/env node
'use strict';
/**
 * Browser QA for #455 (F5.2A): the Seguimiento Reuma journey reads patient/history
 * through the published read port (`scripts/reuma_patient_read_port.js`) instead of
 * direct `HubTools.data` reads.
 *
 * Follows `tools/reuma_read_vertical_browser_check.mjs`: a real repo-root HTTP server,
 * the real session gate on reuma_index.html (file input -> professional select -> confirm),
 * real navigation, and a synthetic XLSX materialized outside the repository from
 * `tools/fixtures/reuma_read/corpus_v1.json` (ids `SYN-*` only). No DOM/storage
 * cheating: the only `page.addInitScript` use defines the planted read-port double
 * required by the fail-safe `error` probe, exactly like the frozen stale-response
 * double in the vertical checker.
 *
 * Cases:
 *   S1  static wiring: seguimiento.html loads the read port before its page script
 *   S2  happy path on a multi-visit synthetic id: prefill/pathology correct,
 *       console.error=0 and pageerror=0
 *   S3  not-found (no demo mock active) keeps the legacy empty prefill, no fabricated
 *       patient identity, console.error=0
 *   S4  unavailable (tab without the session corpus) fails visibly and safely
 *   S5  error (planted double) fails visibly and safely
 *
 * Usage: node tools/reuma_seguimiento_read_browser_check.mjs
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
const SEGUIMIENTO_PAGE = 'seguimiento.html';
const PORT_SCRIPT = 'scripts/reuma_patient_read_port.js';
const SEQUIMIENTO_CONSUMER = 'scripts/script_seguimiento.js';

const FAIL_CLOSED_UNAVAILABLE = 'No hay datos cargados. Carga el Excel para consultar pacientes.';
const FAIL_CLOSED_ERROR = 'No se pudo consultar los datos del paciente. Inténtalo de nuevo.';

const corpus = JSON.parse(fs.readFileSync(CORPUS_FILE, 'utf8'));
const KNOWN_ID = 'SYN-ESPA-001';
const ABSENT_ID_SHAPED = 'ESP-2099-999';
const KNOWN_NAME = 'Sintetico Espa Uno';
// SYN-ESPA-001 has two visits; the latest one drives the prefill (peso 77.5, IMC 24.5)
// against the first visit's peso 78 / IMC 24.6, so a correct read is observable.
const KNOWN_EXPECTED_VISITS = corpus.sheets.ESPA.filter((row) => row.ID_Paciente === KNOWN_ID).length;

const results = [];
function record(name, pass, detail) {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

// Same documented Playwright resolution as the other browser checkers.
function loadPlaywrightFromNpx() {
    const tryNodeModules = (nodeModules) => {
        const pkg = path.join(nodeModules, 'playwright', 'package.json');
        return existsSync(pkg) ? createRequire(path.join(nodeModules, '__reuma_seguimiento_loader.cjs'))('playwright') : null;
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
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/reuma_seguimiento_read_browser_check.mjs');
}

let chromium;
try {
    ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
    console.error('ENVIRONMENT FAILURE: ' + err.message);
    console.log('\nREUMA-SEGUIMIENTO-READ-BROWSER: FAIL 0/0');
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

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'reuma-seguimiento-browser-'));
const workbookPath = path.join(tempDir, 'reuma_seguimiento_synthetic.xlsx');
{
    const workbook = XLSX.utils.book_new();
    for (const [sheetName, rows] of Object.entries(corpus.sheets)) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
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
// Per-page error bookkeeping (the fail-safe cases legitimately log console.error,
// so the happy path filters on the seguimiento URL rather than assuming global zero).
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

function seguimientoErrors(entry) {
    return entry.consoleErrors.filter((message) => message.includes(SEGUIMIENTO_PAGE));
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

async function formState(page) {
    return page.evaluate(() => ({
        id: document.getElementById('idPaciente')?.value || '',
        name: document.getElementById('nombrePaciente')?.value || '',
        diagnosis: document.getElementById('diagnosticoPrimario')?.value || '',
        highlight: (document.getElementById('patologiaHighlight')?.textContent || '').trim(),
        peso: document.getElementById('peso')?.value || '',
        imc: document.getElementById('imc')?.value || '',
        treatment: document.getElementById('tratamientoActual')?.value || '',
        alert: Array.from(document.querySelectorAll('[role="alert"]')).map((node) => (node.textContent || '').trim()).join(' | '),
    }));
}

const plantedErrorDouble = () => {
    const port = {
        listPatients: async () => ({ status: 'ok', patients: [] }),
        resolvePatient: async () => ({ status: 'not_found', reason: 'no_match' }),
        readPatientBundle: async () => ({ status: 'error', error_code: 'planted_read_error' }),
    };
    const double = { getPort: () => port, create: () => port, PORT_VERSION: 'error-double' };
    Object.defineProperty(window, 'ReumaPatientReadPort', {
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
    // S1 — static wiring.
    // =====================================================================
    {
        const html = fs.readFileSync(path.join(ROOT, SEGUIMIENTO_PAGE), 'utf8');
        const portIndex = html.indexOf(PORT_SCRIPT);
        const consumerIndex = html.indexOf(SEQUIMIENTO_CONSUMER);
        record('S1 seguimiento.html loads the read port before its page script with a ?v= token',
            portIndex !== -1 && consumerIndex !== -1 && portIndex < consumerIndex &&
            new RegExp(`${PORT_SCRIPT.replace('.', '\\.')}\\?v=`).test(html),
            `portIndex=${portIndex} consumerIndex=${consumerIndex}`);
    }

    browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
    const chromiumVersion = browser.version();

    const context = await browser.newContext();
    try {
        // =================================================================
        // S2/S3 — corpus context: happy path then not-found.
        // =================================================================
        const happy = await passSupportedGate(context);
        happy.consoleErrors.length = 0;
        happy.pageErrors.length = 0;
        await happy.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${KNOWN_ID}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
        await happy.page.waitForTimeout(1200);
        const happyState = await formState(happy.page);
        const happyChecks = [
            happyState.id === KNOWN_ID,
            happyState.name === KNOWN_NAME,
            happyState.diagnosis === 'espa',
            happyState.highlight === 'EspA',
            happyState.peso === '77.5',
            happyState.imc === '24.5',
            happyState.treatment === 'FAME sintetico A',
            KNOWN_EXPECTED_VISITS >= 2,
            seguimientoErrors(happy).length === 0,
            happy.pageErrors.length === 0,
        ];
        record('S2 happy path prefills the latest visit of a multi-visit synthetic id with a clean console',
            happyChecks.every(Boolean),
            `id=${happyState.id} name=${JSON.stringify(happyState.name)} dx=${happyState.diagnosis} ` +
            `highlight=${JSON.stringify(happyState.highlight)} peso=${happyState.peso} imc=${happyState.imc} ` +
            `tx=${JSON.stringify(happyState.treatment)} visits=${KNOWN_EXPECTED_VISITS} ` +
            `consoleErrors=${JSON.stringify(seguimientoErrors(happy))} pageErrors=${JSON.stringify(happy.pageErrors)}`);

        happy.consoleErrors.length = 0;
        happy.pageErrors.length = 0;
        await happy.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${ABSENT_ID_SHAPED}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
        await happy.page.waitForTimeout(1200);
        const notFoundState = await formState(happy.page);
        const notFoundChecks = [
            notFoundState.id === ABSENT_ID_SHAPED,
            notFoundState.name === '',
            notFoundState.treatment === '',
            seguimientoErrors(happy).length === 0,
            happy.pageErrors.length === 0,
        ];
        record('S3 not-found keeps the legacy empty prefill without fabricating a patient identity',
            notFoundChecks.every(Boolean),
            `id=${notFoundState.id} name=${JSON.stringify(notFoundState.name)} tx=${JSON.stringify(notFoundState.treatment)} ` +
            `consoleErrors=${JSON.stringify(seguimientoErrors(happy))} pageErrors=${JSON.stringify(happy.pageErrors)}`);

        // =================================================================
        // S4 — unavailable: a fresh tab shares the professional session but has
        //      no sessionStorage corpus, so the read must fail visibly/safely.
        // =================================================================
        {
            const unavailable = trackedPage(await context.newPage());
            await unavailable.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${KNOWN_ID}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
            await unavailable.page.waitForTimeout(1200);
            const state = await formState(unavailable.page);
            const errors = seguimientoErrors(unavailable);
            const checks = [
                state.id === KNOWN_ID,
                state.name === '',
                state.treatment === '',
                errors.some((message) => message.includes(FAIL_CLOSED_UNAVAILABLE)),
                unavailable.pageErrors.length === 0,
            ];
            record('S4 unavailable fails visibly/safely with no fabricated patient data',
                checks.every(Boolean),
                `id=${state.id} name=${JSON.stringify(state.name)} alert=${JSON.stringify(state.alert)} ` +
                `consoleErrors=${JSON.stringify(errors)} pageErrors=${JSON.stringify(unavailable.pageErrors)}`);
        }

        // =================================================================
        // S5 — error: planted read-port double; must fail visibly/safely and
        //      never fall through to a demo or not_found payload.
        // =================================================================
        {
            const errorCase = trackedPage(await context.newPage());
            await errorCase.page.addInitScript(plantedErrorDouble);
            await errorCase.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${KNOWN_ID}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
            await errorCase.page.waitForTimeout(1200);
            const state = await formState(errorCase.page);
            const errors = seguimientoErrors(errorCase);
            const checks = [
                state.id === KNOWN_ID,
                state.name === '',
                state.treatment === '',
                errors.some((message) => message.includes(FAIL_CLOSED_ERROR)),
                errorCase.pageErrors.length === 0,
            ];
            record('S5 error fails visibly/safely and never becomes a demo or not_found payload',
                checks.every(Boolean),
                `id=${state.id} name=${JSON.stringify(state.name)} alert=${JSON.stringify(state.alert)} ` +
                `consoleErrors=${JSON.stringify(errors)} pageErrors=${JSON.stringify(errorCase.pageErrors)}`);
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
console.log(`\nREUMA-SEGUIMIENTO-READ-BROWSER: ${failed.length === 0 ? 'PASS' : 'FAIL'} ${results.length - failed.length}/${results.length} cases`);
process.exit(failed.length === 0 ? 0 : 1);
