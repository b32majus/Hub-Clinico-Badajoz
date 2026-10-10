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
 * Train 22 baseline witnesses (Fase A, RED on freeze):
 *   A1  not_found: `#idPaciente` stays readonly with the queried CIP while
 *       `#nombrePaciente` accepts a real typed synthetic name (no fabricated
 *       identity, no demo mock).
 *   A2  negatives stay protected: `ok` keeps the name prefilled+readonly;
 *       `unavailable`/`error` keep the name readonly/empty with the existing
 *       fail-closed messages.
 *   A3  explicit baseline payload/export on the `not_found` page: typed name +
 *       treatment + start date reach `HubTools.form.recopilarDatosFormularioSeguimiento()`,
 *       a cleared date collects as '' (blank, never today), and the real in-page
 *       route `createVisitAct` -> `projectVisitAct497` keeps the 497 projection
 *       byte-identical except for exactly the two treatment positions.
 *   A4  (T22-02) negatives for the two baseline fields: `ok`, `unavailable`
 *       and `error` keep `#tratamientoActual`/`#fechaInicioTratamiento`
 *       readonly and empty-or-prefilled as today — the not_found edit mode
 *       never opens for them.
 *   A5  (T22-02, Gate 4 narrow) at 390 px and 1280 px, in the real
 *       `not_found` journey, name/treatment/date are visible on screen,
 *       focusable and accept effective real typing/clicking through supported
 *       interaction (the `readonly` attribute is never removed by the test).
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

// T22-02-C2 synthetic found patients appended ONLY to the TEMP workbook
// (data preparation; the frozen corpus fixture is never edited):
//   DATELESS_ID  treatment present, NO Fecha_Inicio_Tratamiento. The visit
//                date is ISO-shaped so the manufactured start date (which
//                extractTreatmentHistory derives as startDate = visit date)
//                is actually displayable in the type=date control — that is
//                what makes the pre-fix RED observable in the browser.
//   ISODATE_ID   explicit documented start date (ISO) that must flow through
//                display and collector untouched (preservation witness).
const DATELESS_ID = 'SYN-NODATE-001';
const ISODATE_ID = 'SYN-ISODATE-001';
const SYNTHETIC_ESPA_ROWS = [
    {
        ID_Paciente: DATELESS_ID,
        Nombre_Paciente: 'Sintetico Sin Fecha Uno',
        Sexo: 'M',
        Fecha_Visita: '2026-02-10',
        Tipo_Visita: 'Seguimiento',
        Diagnostico_Primario: 'EspA',
        Tratamiento_Actual: 'FAME sintetico ND',
    },
    {
        ID_Paciente: ISODATE_ID,
        Nombre_Paciente: 'Sintetico Con Fecha Uno',
        Sexo: 'F',
        Fecha_Visita: '2026-03-10',
        Tipo_Visita: 'Seguimiento',
        Diagnostico_Primario: 'EspA',
        Tratamiento_Actual: 'FAME sintetico IF',
        Fecha_Inicio_Tratamiento: '2026-01-10',
    },
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
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(
            sheetName === 'ESPA' ? rows.concat(SYNTHETIC_ESPA_ROWS) : rows
        ), sheetName);
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

        // =================================================================
        // A1 (Train 22) — not_found: the CIP stays identified/readonly while
        // the name becomes really editable through a supported fill(); no
        // fabricated identity. RED on freeze: #nombrePaciente is readonly.
        // =================================================================
        {
            const SYNTHETIC_NAME = 'Sintetico Notfound Uno';
            // The real `not_found` read requires the session corpus, which lives in
            // per-tab sessionStorage: reuse the gate-passed tab exactly like S2/S3
            // (fresh supported navigation, no DOM tampering, no demo mock).
            happy.consoleErrors.length = 0;
            happy.pageErrors.length = 0;
            const notFoundEditable = happy;
            await notFoundEditable.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${ABSENT_ID_SHAPED}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
            await notFoundEditable.page.waitForTimeout(1200);
            const initial = await formState(notFoundEditable.page);
            const readonlyState = await notFoundEditable.page.evaluate(() => ({
                idReadonly: document.getElementById('idPaciente')?.readOnly === true,
                idValue: document.getElementById('idPaciente')?.value || '',
                nameReadonly: document.getElementById('nombrePaciente')?.readOnly === true,
            }));
            const notFoundErrors = seguimientoErrors(notFoundEditable);
            let fillError = null;
            try {
                await notFoundEditable.page.fill('#nombrePaciente', SYNTHETIC_NAME, { timeout: 5000 });
            } catch (err) {
                fillError = (err && err.message) || String(err);
            }
            const typedName = await notFoundEditable.page.evaluate(() => document.getElementById('nombrePaciente')?.value || '');
            const checks = [
                readonlyState.idReadonly,
                readonlyState.idValue === ABSENT_ID_SHAPED,
                readonlyState.nameReadonly === false,
                initial.name === '',
                !notFoundErrors.some((message) => message.includes(FAIL_CLOSED_UNAVAILABLE) || message.includes(FAIL_CLOSED_ERROR)),
                fillError === null,
                typedName === SYNTHETIC_NAME,
            ];
            record('A1 not_found keeps the queried CIP readonly and accepts a real typed synthetic name',
                checks.every(Boolean),
                `idReadonly=${readonlyState.idReadonly} id=${JSON.stringify(readonlyState.idValue)} ` +
                `nameReadonly=${readonlyState.nameReadonly} initialName=${JSON.stringify(initial.name)} ` +
                `consoleErrors=${JSON.stringify(notFoundErrors)} ` +
                `fillError=${JSON.stringify(fillError)} typedName=${JSON.stringify(typedName)} ` +
                `pageErrors=${JSON.stringify(notFoundEditable.pageErrors)}`);
        }

        // =================================================================
        // A2 (Train 22) — negatives stay protected: ok keeps the name
        // prefilled+readonly; unavailable/error keep it readonly/empty with
        // the existing fail-closed messages. Never opens the not_found mode.
        // =================================================================
        {
            // The ok case reuses the gate-passed tab (corpus in per-tab
            // sessionStorage), exactly like the S2 happy path.
            happy.consoleErrors.length = 0;
            happy.pageErrors.length = 0;
            await happy.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${KNOWN_ID}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
            await happy.page.waitForTimeout(1200);
            const okState = await happy.page.evaluate(() => ({
                nameReadonly: document.getElementById('nombrePaciente')?.readOnly === true,
                name: document.getElementById('nombrePaciente')?.value || '',
            }));
            const okErrors = seguimientoErrors(happy);

            const unavailablePage = trackedPage(await context.newPage());
            await unavailablePage.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${KNOWN_ID}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
            await unavailablePage.page.waitForTimeout(1200);
            const unavailableState = await unavailablePage.page.evaluate(() => ({
                nameReadonly: document.getElementById('nombrePaciente')?.readOnly === true,
                name: document.getElementById('nombrePaciente')?.value || '',
            }));
            const unavailableErrors = seguimientoErrors(unavailablePage);

            const errorPage = trackedPage(await context.newPage());
            await errorPage.page.addInitScript(plantedErrorDouble);
            await errorPage.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${KNOWN_ID}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
            await errorPage.page.waitForTimeout(1200);
            const errorState = await errorPage.page.evaluate(() => ({
                nameReadonly: document.getElementById('nombrePaciente')?.readOnly === true,
                name: document.getElementById('nombrePaciente')?.value || '',
            }));
            const errorErrors = seguimientoErrors(errorPage);

            const checks = [
                okState.nameReadonly, okState.name === KNOWN_NAME,
                !okErrors.some((message) => message.includes(FAIL_CLOSED_UNAVAILABLE) || message.includes(FAIL_CLOSED_ERROR)),
                unavailableState.nameReadonly, unavailableState.name === '',
                unavailableErrors.some((message) => message.includes(FAIL_CLOSED_UNAVAILABLE)),
                errorState.nameReadonly, errorState.name === '',
                errorErrors.some((message) => message.includes(FAIL_CLOSED_ERROR)),
            ];
            record('A2 negatives stay protected: found name prefilled readonly; unavailable/error readonly empty with fail-closed messages',
                checks.every(Boolean),
                `ok=${JSON.stringify(okState)} okConsoleErrors=${JSON.stringify(okErrors)} ` +
                `unavailable=${JSON.stringify(unavailableState)} ` +
                `unavailableConsoleErrors=${JSON.stringify(unavailableErrors)} error=${JSON.stringify(errorState)} ` +
                `errorConsoleErrors=${JSON.stringify(errorErrors)}`);
        }

        // =================================================================
        // A3 (Train 22) — explicit baseline payload/export on the not_found
        // page: typed name/treatment/date reach the collector, a cleared date
        // collects as '' (blank, never today), and the real in-page route
        // createVisitAct -> projectVisitAct497 keeps the 497 projection
        // byte-identical except exactly the two treatment positions (no
        // hardcoded column index: legacy generators use non-uniform absolute
        // positions; the diff is the contract). RED on freeze: the fields are
        // readonly and the collector does not return the two fields.
        // =================================================================
        {
            const TYPED_NAME = 'Sintetico Baseline Uno';
            const TYPED_TREATMENT = 'FAME sintetico baseline A';
            const TYPED_DATE = '2020-03-04';
            // Gate-passed tab again: the baseline capture happens on a real
            // `not_found` read result with the session corpus present, never on
            // a read failure (fail-closed console guard below pins this).
            happy.consoleErrors.length = 0;
            happy.pageErrors.length = 0;
            const baselinePage = happy;
            await baselinePage.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${ABSENT_ID_SHAPED}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
            await baselinePage.page.waitForTimeout(1200);
            const baselineErrors = seguimientoErrors(baselinePage);

            const fillErrors = {};
            for (const [selector, value] of [
                ['#nombrePaciente', TYPED_NAME],
                ['#tratamientoActual', TYPED_TREATMENT],
                ['#fechaInicioTratamiento', TYPED_DATE],
            ]) {
                try {
                    await baselinePage.page.fill(selector, value, { timeout: 5000 });
                } catch (err) {
                    fillErrors[selector] = (err && err.message) || String(err);
                }
            }

            let observed = null;
            let observeError = null;
            try {
                // Read-only observation: no DOM mutation, only published HubTools routes.
                observed = await baselinePage.page.evaluate(({ typedName, typedTreatment, patientRef }) => {
                    const datos = HubTools.form.recopilarDatosFormularioSeguimiento();
                    const act = HubTools.reumaActContract.createVisitAct({
                        kind: 'seguimiento',
                        patientRef,
                        pathology: 'espa',
                        payload: datos,
                    });
                    const projected = HubTools.reumaLegacyExportAdapter.projectVisitAct497(act);
                    const datosEmpty = JSON.parse(JSON.stringify(datos));
                    datosEmpty.tratamientoActual = '';
                    datosEmpty.fechaInicioTratamiento = '';
                    const actEmpty = HubTools.reumaActContract.createVisitAct({
                        kind: 'seguimiento',
                        patientRef,
                        pathology: 'espa',
                        payload: datosEmpty,
                    });
                    const projectedEmpty = HubTools.reumaLegacyExportAdapter.projectVisitAct497(actEmpty);
                    const fields = projected && projected.ok === true ? projected.fields : null;
                    const fieldsEmpty = projectedEmpty && projectedEmpty.ok === true ? projectedEmpty.fields : null;
                    const diffPositions = [];
                    if (fields && fieldsEmpty && fields.length === fieldsEmpty.length) {
                        for (let i = 0; i < fields.length; i++) {
                            if (fields[i] !== fieldsEmpty[i]) diffPositions.push(i);
                        }
                    }
                    return {
                        collected: {
                            nombrePaciente: datos.nombrePaciente,
                            tratamientoActual: datos.tratamientoActual,
                            fechaInicioTratamiento: datos.fechaInicioTratamiento,
                        },
                        hasTratamientoKey: Object.prototype.hasOwnProperty.call(datos, 'tratamientoActual'),
                        hasFechaKey: Object.prototype.hasOwnProperty.call(datos, 'fechaInicioTratamiento'),
                        actOk: act && act.ok === true,
                        projectionOk: projected && projected.ok === true,
                        projectionError: projected && projected.ok !== true && projected.error
                            ? `${projected.error.code}: ${projected.error.message}`
                            : null,
                        fieldCount: fields ? fields.length : 0,
                        position4: fields ? fields[4] : null,
                        diffPositions,
                        diffValues: diffPositions.map((i) => fields[i]),
                    };
                }, { typedName: TYPED_NAME, typedTreatment: TYPED_TREATMENT, patientRef: ABSENT_ID_SHAPED });
            } catch (err) {
                observeError = (err && err.message) || String(err);
            }

            let clearError = null;
            try {
                await baselinePage.page.fill('#fechaInicioTratamiento', '', { timeout: 5000 });
            } catch (err) {
                clearError = (err && err.message) || String(err);
            }
            let clearedDate = null;
            try {
                clearedDate = await baselinePage.page.evaluate(() =>
                    HubTools.form.recopilarDatosFormularioSeguimiento().fechaInicioTratamiento);
            } catch (err) {
                clearedDate = `evaluate_error: ${(err && err.message) || String(err)}`;
            }

            const checks = observed ? [
                Object.keys(fillErrors).length === 0,
                !baselineErrors.some((message) => message.includes(FAIL_CLOSED_UNAVAILABLE) || message.includes(FAIL_CLOSED_ERROR)),
                observed.collected.nombrePaciente === TYPED_NAME,
                observed.collected.tratamientoActual === TYPED_TREATMENT,
                observed.collected.fechaInicioTratamiento === TYPED_DATE,
                clearError === null,
                clearedDate === '',
                observed.actOk === true,
                observed.projectionOk === true,
                observed.fieldCount === 497,
                observed.position4 === 'Seguimiento',
                observed.diffPositions.length === 2,
                observed.diffValues.includes(TYPED_TREATMENT) && observed.diffValues.includes(TYPED_DATE),
            ] : [];
            record('A3 not_found baseline payload/export: collector returns typed values and the 497 projection differs in exactly the two treatment positions',
                checks.length > 0 && checks.every(Boolean),
                `fillErrors=${JSON.stringify(fillErrors)} observeError=${JSON.stringify(observeError)} ` +
                `consoleErrors=${JSON.stringify(baselineErrors)} ` +
                `collected=${JSON.stringify(observed ? observed.collected : null)} ` +
                `hasTratamientoKey=${observed ? observed.hasTratamientoKey : null} hasFechaKey=${observed ? observed.hasFechaKey : null} ` +
                `clearError=${JSON.stringify(clearError)} clearedDate=${JSON.stringify(clearedDate)} ` +
                `actOk=${observed ? observed.actOk : null} projectionOk=${observed ? observed.projectionOk : null} ` +
                `projectionError=${JSON.stringify(observed ? observed.projectionError : null)} ` +
                `fieldCount=${observed ? observed.fieldCount : null} position4=${JSON.stringify(observed ? observed.position4 : null)} ` +
                `diffPositions=${JSON.stringify(observed ? observed.diffPositions : null)} ` +
                `diffValues=${JSON.stringify(observed ? observed.diffValues : null)} ` +
                `pageErrors=${JSON.stringify(baselinePage.pageErrors)}`);
        }

        // =================================================================
        // A4 (Train 22 / T22-02) — negatives for the two baseline fields:
        // `ok`, `unavailable` and `error` keep #tratamientoActual and
        // #fechaInicioTratamiento readonly and empty-or-prefilled as today —
        // the not_found edit mode must never open for them. RED state is not
        // expected for the readonly/empty assertions themselves (they hold on
        // the base); the case pins the negative so a future global unlock
        // cannot silently open the edit mode outside the real not_found
        // journey.
        // =================================================================
        {
            const NEG_TREATMENT = 'X sintetico negativo';

            // ok (port source): the fields stay readonly with today's prefill.
            happy.consoleErrors.length = 0;
            happy.pageErrors.length = 0;
            await happy.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${KNOWN_ID}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
            await happy.page.waitForTimeout(1200);
            const okFieldState = await happy.page.evaluate(() => ({
                txReadonly: document.getElementById('tratamientoActual')?.readOnly === true,
                txValue: document.getElementById('tratamientoActual')?.value || '',
                dateReadonly: document.getElementById('fechaInicioTratamiento')?.readOnly === true,
                dateValue: document.getElementById('fechaInicioTratamiento')?.value || '',
            }));
            let okFillError = null;
            try {
                await happy.page.fill('#tratamientoActual', NEG_TREATMENT, { timeout: 3000 });
            } catch (err) {
                okFillError = (err && err.message) || String(err);
            }
            const okTxAfterFill = await happy.page.evaluate(() => document.getElementById('tratamientoActual')?.value || '');
            const okErrors = seguimientoErrors(happy);

            // unavailable: readonly and empty, fill rejected.
            const unavailablePage = trackedPage(await context.newPage());
            await unavailablePage.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${KNOWN_ID}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
            await unavailablePage.page.waitForTimeout(1200);
            const unavailableFieldState = await unavailablePage.page.evaluate(() => ({
                txReadonly: document.getElementById('tratamientoActual')?.readOnly === true,
                txValue: document.getElementById('tratamientoActual')?.value || '',
                dateReadonly: document.getElementById('fechaInicioTratamiento')?.readOnly === true,
                dateValue: document.getElementById('fechaInicioTratamiento')?.value || '',
            }));
            let unavailableFillError = null;
            try {
                await unavailablePage.page.fill('#tratamientoActual', NEG_TREATMENT, { timeout: 3000 });
            } catch (err) {
                unavailableFillError = (err && err.message) || String(err);
            }
            const unavailableErrors = seguimientoErrors(unavailablePage);

            // error (planted double): readonly and empty, fill rejected.
            const errorPage = trackedPage(await context.newPage());
            await errorPage.page.addInitScript(plantedErrorDouble);
            await errorPage.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${KNOWN_ID}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
            await errorPage.page.waitForTimeout(1200);
            const errorFieldState = await errorPage.page.evaluate(() => ({
                txReadonly: document.getElementById('tratamientoActual')?.readOnly === true,
                txValue: document.getElementById('tratamientoActual')?.value || '',
                dateReadonly: document.getElementById('fechaInicioTratamiento')?.readOnly === true,
                dateValue: document.getElementById('fechaInicioTratamiento')?.value || '',
            }));
            let errorFillError = null;
            try {
                await errorPage.page.fill('#tratamientoActual', NEG_TREATMENT, { timeout: 3000 });
            } catch (err) {
                errorFillError = (err && err.message) || String(err);
            }
            const errorErrors = seguimientoErrors(errorPage);

            const checks = [
                okFieldState.txReadonly,
                okFieldState.txValue === 'FAME sintetico A', // unchanged prefill (S2)
                okFieldState.dateReadonly,
                okFillError !== null,
                okTxAfterFill === 'FAME sintetico A',
                !okErrors.some((message) => message.includes(FAIL_CLOSED_UNAVAILABLE) || message.includes(FAIL_CLOSED_ERROR)),
                unavailableFieldState.txReadonly, unavailableFieldState.txValue === '',
                unavailableFieldState.dateReadonly, unavailableFieldState.dateValue === '',
                unavailableFillError !== null,
                unavailableErrors.some((message) => message.includes(FAIL_CLOSED_UNAVAILABLE)),
                errorFieldState.txReadonly, errorFieldState.txValue === '',
                errorFieldState.dateReadonly, errorFieldState.dateValue === '',
                errorFillError !== null,
                errorErrors.some((message) => message.includes(FAIL_CLOSED_ERROR)),
            ];
            record('A4 negatives keep treatment/date readonly and empty-or-prefilled as today: not_found edit mode never opens for ok/unavailable/error',
                checks.every(Boolean),
                `ok=${JSON.stringify(okFieldState)} okFillRejected=${okFillError !== null} okTxAfterFill=${JSON.stringify(okTxAfterFill)} ` +
                `unavailable=${JSON.stringify(unavailableFieldState)} unavailableFillRejected=${unavailableFillError !== null} ` +
                `error=${JSON.stringify(errorFieldState)} errorFillRejected=${errorFillError !== null} ` +
                `pageErrors=${JSON.stringify([...happy.pageErrors, ...unavailablePage.pageErrors, ...errorPage.pageErrors])}`);
        }

        // =================================================================
        // A5 (Train 22 / T22-02, Gate 4 narrow) — at 390 px and 1280 px, in
        // the real `not_found` journey, the three identity/baseline controls
        // (name, treatment, start date) are visible on screen, focusable and
        // accept effective real typing/clicking through supported
        // interaction. The readonly attribute is NEVER removed by the test.
        // RED on freeze: the two baseline fields are readonly, so real typing
        // is rejected.
        // =================================================================
        {
            const VP_NAME = 'Sintetico VP Uno';
            const VP_TREATMENT = 'FAME sintetico VP';
            const VP_DATE = '2021-07-09';
            const FIELDS = [
                ['#nombrePaciente', VP_NAME],
                ['#tratamientoActual', VP_TREATMENT],
                ['#fechaInicioTratamiento', VP_DATE],
            ];
            for (const vp of [
                { label: '390', width: 390, height: 844 },
                { label: '1280', width: 1280, height: 800 },
            ]) {
                const vpContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
                try {
                    const gateEntry = await passSupportedGate(vpContext);
                    gateEntry.consoleErrors.length = 0;
                    gateEntry.pageErrors.length = 0;
                    await gateEntry.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${ABSENT_ID_SHAPED}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
                    await gateEntry.page.waitForTimeout(1200);
                    const errors = seguimientoErrors(gateEntry);

                    const observed = {};
                    for (const [selector, value] of FIELDS) {
                        const visible = await gateEntry.page.evaluate((sel) => {
                            const el = document.querySelector(sel);
                            if (!el) return false;
                            el.scrollIntoView({ block: 'center' });
                            const r = el.getBoundingClientRect();
                            if (r.width === 0 || r.height === 0) return false;
                            if (r.bottom <= 0 || r.top >= window.innerHeight || r.right <= 0 || r.left >= window.innerWidth) return false;
                            const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                            return !!top && (top === el || el.contains(top));
                        }, selector);
                        let clickError = null;
                        try {
                            await gateEntry.page.click(selector, { timeout: 5000 });
                        } catch (err) {
                            clickError = (err && err.message) || String(err);
                        }
                        const focusedId = await gateEntry.page.evaluate(() => document.activeElement?.id || '');
                        let fillError = null;
                        try {
                            await gateEntry.page.fill(selector, value, { timeout: 5000 });
                        } catch (err) {
                            fillError = (err && err.message) || String(err);
                        }
                        const typedValue = await gateEntry.page.evaluate(
                            (sel) => document.querySelector(sel)?.value || '', selector);
                        observed[selector] = { visible, clickError, focusedId, fillError, typedValue };
                    }

                    const checks = FIELDS.every(([selector, value]) => {
                        const o = observed[selector];
                        return o.visible
                            && o.clickError === null
                            && o.focusedId === selector.slice(1)
                            && o.fillError === null
                            && o.typedValue === value;
                    }) && !errors.some((message) => message.includes(FAIL_CLOSED_UNAVAILABLE) || message.includes(FAIL_CLOSED_ERROR));
                    record(`A5 Gate4 narrow ${vp.label}px: name/treatment/date visible on screen, focusable and accepting real typing on the not_found journey`,
                        checks,
                        `observed=${JSON.stringify(observed)} consoleErrors=${JSON.stringify(errors)} ` +
                        `pageErrors=${JSON.stringify(gateEntry.pageErrors)}`);
                } finally {
                    await vpContext.close();
                }
            }
        }

        // =================================================================
        // A6 (T22-02-C2) — found patient with a known treatment but NO
        // documented start date: after prefill `#fechaInicioTratamiento` is
        // EMPTY and `HubTools.form.recopilarDatosFormularioSeguimiento()
        // .fechaInicioTratamiento === ''` (the collector is exactly what
        // TXT/CSV consume). Spec story 4: the field stays blank, without a
        // date auto-completed from the visit date, today or
        // `extractTreatmentHistory()` output. RED on the T22-02 base: the
        // prefill payload carries the manufactured start date (ISO-shaped
        // synthetic visit date), so the browser displays and the collector
        // returns the visit date. The corpus lives in per-tab sessionStorage,
        // so this reuses the gate-passed tab exactly like the S2/A4 ok cases.
        // =================================================================
        {
            happy.consoleErrors.length = 0;
            happy.pageErrors.length = 0;
            await happy.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${DATELESS_ID}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
            await happy.page.waitForTimeout(1200);
            const datelessState = await happy.page.evaluate(() => ({
                name: document.getElementById('nombrePaciente')?.value || '',
                nameReadonly: document.getElementById('nombrePaciente')?.readOnly === true,
                treatment: document.getElementById('tratamientoActual')?.value || '',
                dateReadonly: document.getElementById('fechaInicioTratamiento')?.readOnly === true,
                dateValue: document.getElementById('fechaInicioTratamiento')?.value || '',
                collectedFechaInicio: HubTools.form.recopilarDatosFormularioSeguimiento().fechaInicioTratamiento,
            }));
            const datelessErrors = seguimientoErrors(happy);
            // ok-path proof the read really found the synthetic patient (the
            // not_found branch would leave the treatment empty instead).
            const okPath = datelessState.name === 'Sintetico Sin Fecha Uno' && datelessState.nameReadonly &&
                datelessState.treatment === 'FAME sintetico ND';
            record('A6 found patient without documented start date: prefill date field and collector stay empty (no manufactured/visit date)',
                okPath && datelessState.dateReadonly &&
                datelessState.dateValue === '' && datelessState.collectedFechaInicio === '' &&
                !datelessErrors.some((message) => message.includes(FAIL_CLOSED_UNAVAILABLE) || message.includes(FAIL_CLOSED_ERROR)),
                `okPath=${okPath} state=${JSON.stringify(datelessState)} consoleErrors=${JSON.stringify(datelessErrors)} pageErrors=${JSON.stringify(happy.pageErrors)}`);
        }

        // =================================================================
        // A7 (T22-02-C2) — found patients WITH an explicit documented start
        // date: the historical supplied date flows through untouched
        // (preservation witness; the correction must not alter it). Same
        // gate-passed tab.
        //   SYN-ISODATE-001 (ISO explicit date): the field shows exactly that
        //   value and the collector returns it.
        //   SYN-ESPA-001 (dd/mm/yyyy contract value 10/01/2026): the
        //   payload keeps it verbatim (pinned by the migration checker);
        //   the type=date control's own published sanitization leaves the
        //   display empty and the collector mirrors the display — pre-existing
        //   display behavior, unchanged by this correction and out of its
        //   authorized surface (no date-format transformation is introduced).
        // =================================================================
        {
            happy.consoleErrors.length = 0;
            happy.pageErrors.length = 0;
            await happy.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${ISODATE_ID}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
            await happy.page.waitForTimeout(1200);
            const isoState = await happy.page.evaluate(() => ({
                name: document.getElementById('nombrePaciente')?.value || '',
                treatment: document.getElementById('tratamientoActual')?.value || '',
                dateValue: document.getElementById('fechaInicioTratamiento')?.value || '',
                collectedFechaInicio: HubTools.form.recopilarDatosFormularioSeguimiento().fechaInicioTratamiento,
            }));
            const isoOkPath = isoState.name === 'Sintetico Con Fecha Uno' && isoState.treatment === 'FAME sintetico IF';

            await happy.page.goto(`${origin}/${SEGUIMIENTO_PAGE}?id=${KNOWN_ID}&patologia=espa`, { waitUntil: 'load', timeout: 45000 });
            await happy.page.waitForTimeout(1200);
            const knownState = await happy.page.evaluate(() => ({
                dateValue: document.getElementById('fechaInicioTratamiento')?.value || '',
                collectedFechaInicio: HubTools.form.recopilarDatosFormularioSeguimiento().fechaInicioTratamiento,
            }));
            record('A7 found patients with explicit start dates: explicit ISO date shows and is collected verbatim; dd/mm/yyyy contract value stays display-empty/collected-empty as published',
                isoOkPath && isoState.dateValue === '2026-01-10' && isoState.collectedFechaInicio === '2026-01-10' &&
                knownState.dateValue === '' && knownState.collectedFechaInicio === '',
                `iso=${JSON.stringify(isoState)} isoOkPath=${isoOkPath} known=${JSON.stringify(knownState)} pageErrors=${JSON.stringify(happy.pageErrors)}`);
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
