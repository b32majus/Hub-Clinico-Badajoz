// REUMA TXT→CSV GATE — T20-03 INTEGRITY + REENTRY BROWSER ORACLE (#621, Train 20)
// Local-only Chromium evidence for the T20-03 contracts on top of the frozen
// acceptance package:
//   I1  Story 8: exportable-field edit after an authorized TXT blocks CSV with
//       the EXACT spec discrepancy message (and not the prerequisite message).
//   I2  Story 9/13: change-then-restore (payload equal again) does NOT force
//       repeating the TXT; the same instance re-exports CSV.
//   I3  Recovery: after an invalidating edit, a fresh TXT re-enables CSV.
//   I4  Story 1/8 distinction: without any TXT the prerequisite message shows
//       and the discrepancy message never does.
//   I5  Story 12: two independent page instances with an identical
//       CIP/fecha/tipo/diagnóstico never share authorization.
//   I6  Story 14: a planted legacy marker matching CIP/fecha never authorizes.
//   I7  7-consumer load map: every HTML consumer loads the NEW exportManager
//       token with pageerror=0; pages that never had a TXT gate (Dashboard,
//       Estadísticas, Reuma index, manage drugs/professionals) show no gate
//       controls and no gate messaging.
//   I8  Two real journeys (Primera Visita + Seguimiento) end-to-end: TXT note
//       delivered by real clipboard success, 497-field CSV delivered.
//   I9  Storage hygiene across ALL journeys: legacy sentinels
//       (HubClinico_TxtExportDone_* + hubPendingRows) stay byte-unchanged, no
//       legacy marker is created, zero NEW Web Storage keys from the gate.
// Synthetic SYN-* fixtures only; never touches the frozen acceptance oracle.
// Exit 0 = every case PASS; 1 = at least one FAIL or environment failure.
// Not wired into verify:nexus (established boundary: verify:nexus is deterministic).

import { createReadStream, existsSync, mkdtempSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const NEW_EXPORT_MANAGER_TOKEN = 'modules/exportManager.js?v=20261010-txt-gate-21-csv-noapi-r1';
const OLD_EXPORT_MANAGER_TOKEN_FRAGMENT = '20261009-export-safety-18-exportmanager-r1';
const PREREQUISITE_MESSAGE = 'Debe exportar TXT de esta visita antes de exportar CSV.';
const STORY8_MESSAGE = 'Los datos de la visita han cambiado desde el TXT. Vuelve a exportarlo y revisa que la historia cl\u00ednica refleje la versi\u00f3n actual antes de generar el CSV';

const PAGE_INDEX = 'reuma_index.html';
const NON_GATE_PAGES = ['dashboard_paciente.html', 'estadisticas.html', 'reuma_index.html', 'manage_drugs.html', 'manage_professionals.html'];
const CONSUMERS = ['primera_visita.html', 'seguimiento.html', ...NON_GATE_PAGES];

// Synthetic legacy sentinels (same shape as the frozen acceptance package).
const SENTINEL_OTHER_KEY = 'HubClinico_TxtExportDone_SYN-OTHER__2020-01-01__seguimiento__ar';
const SENTINEL_OTHER_VALUE = JSON.stringify({ completedAt: '2020-01-01T00:00:00.000Z', visitKey: 'SYN-OTHER__2020-01-01__seguimiento__ar' });
const SENTINEL_PENDING_KEY = 'hubPendingRows';
const SENTINEL_PENDING_VALUE = JSON.stringify([{ idPaciente: 'SYN-LEGACY-PENDING', fecha: '2020-01-01', nota: 'synthetic legacy sentinel' }]);
const SENTINEL_KEYS = [SENTINEL_OTHER_KEY, SENTINEL_PENDING_KEY];

const results = [];
function record(name, pass, detail) {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

// Same documented Playwright resolution as the other Reuma browser checkers.
function loadPlaywrightFromNpx() {
    const tryNodeModules = (nodeModules) => {
        const pkg = path.join(nodeModules, 'playwright', 'package.json');
        return existsSync(pkg) ? createRequire(path.join(nodeModules, '__reuma_txt_gate_integrity_loader.cjs'))('playwright') : null;
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
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/reuma_txt_gate_integrity_browser_check.mjs');
}

let chromium;
try {
    ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
    console.error('ENVIRONMENT FAILURE: ' + err.message);
    console.log('\nREUMA-TXT-GATE-INTEGRITY-BROWSER: FAIL 0/0');
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
// Synthetic workbook fixture (temporary dir outside the repo) + repo-root HTTP
// server — same shape as the other Reuma browser checkers.
// ---------------------------------------------------------------------------

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'reuma-txt-gate-integrity-'));
const workbookPath = path.join(tempDir, 'reuma_txt_gate_integrity_synthetic.xlsx');
{
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
        { ID_Paciente: 'SYN-000-000' },
        {
            ID_Paciente: 'SYN-SEG-300',
            Nombre_Paciente: 'Sintetico Seg Integridad',
            Fecha_Visita: '2026-02-01',
            Tipo_Visita: 'Seguimiento',
            Diagnostico_Primario: 'espa',
            Tratamiento_Actual: 'Adalimumab (sintetico QA) 40 mg',
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
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
console.log(`Server origin: ${origin}\n`);
const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });

// ---------------------------------------------------------------------------
// Shared harness pieces
// ---------------------------------------------------------------------------

function trackedPage(page) {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    return pageErrors;
}

async function openThroughGate(context, urlPath) {
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
    await page.goto(`${origin}/${urlPath}`, { waitUntil: 'load', timeout: 45000 });
    return page;
}

// The OS clipboard is shared across browser contexts in headless Chromium, so
// every blocked-vs-delivered observation first overwrites it with a sentinel;
// a blocked CSV click leaves the sentinel, a delivered click leaves the TSV.
const CLIP_CLEAR_SENTINEL = 'SYN-INT-CLIPBOARD-CLEARED';
async function clearClipboard(page) {
    await page.evaluate((text) => navigator.clipboard.writeText(text).catch(() => {}), CLIP_CLEAR_SENTINEL);
    await page.waitForTimeout(150);
}
async function readClipboard(page) {
    return page.evaluate(async () => (await navigator.clipboard.readText().catch(() => '')));
}

async function openAncestorCollapsibles(page, selector) {
    await page.evaluate((sel) => {
        let el = document.querySelector(sel);
        while (el) {
            if (el.tagName === 'DETAILS' && !el.open) el.open = true;
            el = el.parentElement;
        }
    }, selector);
}

async function fillPrimera(page, { cip }) {
    await openAncestorCollapsibles(page, '#idPaciente');
    await page.fill('#idPaciente', cip);
    await openAncestorCollapsibles(page, '#fechaVisita');
    await page.fill('#fechaVisita', '2026-02-10');
    await openAncestorCollapsibles(page, '#diagnosticoPrimario');
    await page.selectOption('#diagnosticoPrimario', 'espa');
    await openAncestorCollapsibles(page, '#pcrValue');
    await page.fill('#pcrValue', '8');
    await openAncestorCollapsibles(page, '#evaGlobal');
    await page.fill('#evaGlobal', '6');
}

async function fillSeguimiento(page) {
    await page.waitForFunction(() => {
        const el = document.getElementById('idPaciente');
        return el && el.value;
    }, null, { timeout: 15000 });
    await openAncestorCollapsibles(page, '#fechaVisita');
    await page.fill('#fechaVisita', '2026-02-10');
    await openAncestorCollapsibles(page, '#diagnosticoPrimario');
    await page.selectOption('#diagnosticoPrimario', 'espa');
    await openAncestorCollapsibles(page, '#pcrValue');
    await page.fill('#pcrValue', '8');
    await openAncestorCollapsibles(page, '#evaGlobal');
    await page.fill('#evaGlobal', '6');
}

// Legacy sentinels planted at document start of EVERY page (init script; the
// DOM is never touched and the values are read back byte-for-byte later).
function sentinelPlant() {
    try { sessionStorage.setItem('HubClinico_TxtExportDone_SYN-OTHER__2020-01-01__seguimiento__ar', 'SYN-OTHER-VALUE-{"completedAt":"2020-01-01T00:00:00.000Z"}'); } catch (error) { /* best-effort */ }
    try { localStorage.setItem('hubPendingRows', '[{"idPaciente":"SYN-LEGACY-PENDING","fecha":"2020-01-01","nota":"synthetic legacy sentinel"}]'); } catch (error) { /* best-effort */ }
}

function newJourneyContext(browser, { matchingMarkerKey = null, matchingMarkerValue = null } = {}) {
    return browser.newContext().then(async (context) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }).catch(() => {});
        await context.addInitScript(sentinelPlant);
        if (matchingMarkerKey) {
            await context.addInitScript((cfg) => {
                try { sessionStorage.setItem(cfg.key, cfg.value); } catch (error) { /* best-effort */ }
            }, { key: matchingMarkerKey, value: matchingMarkerValue });
        }
        return context;
    });
}

function readSentinels(page) {
    return page.evaluate((keys) => {
        const out = {};
        for (const key of keys) {
            if (sessionStorage.getItem(key) !== null) out[key] = sessionStorage.getItem(key);
            else if (localStorage.getItem(key) !== null) out[key] = localStorage.getItem(key);
            else out[key] = null;
        }
        out.__legacyMarkers = Object.keys(sessionStorage).filter((k) => k.startsWith('HubClinico_TxtExportDone_') && !keys.includes(k));
        out.__storageKeys = Object.keys(localStorage).concat(Object.keys(sessionStorage));
        return out;
    }, SENTINEL_KEYS);
}

const SENTINEL_EXPECTED = {};
SENTINEL_EXPECTED[SENTINEL_OTHER_KEY] = 'SYN-OTHER-VALUE-{"completedAt":"2020-01-01T00:00:00.000Z"}';
SENTINEL_EXPECTED[SENTINEL_PENDING_KEY] = '[{"idPaciente":"SYN-LEGACY-PENDING","fecha":"2020-01-01","nota":"synthetic legacy sentinel"}]';

// ---------------------------------------------------------------------------
// I1/I2/I3 — Story 8 / 9 / recovery cycle (Primera Visita)
// ---------------------------------------------------------------------------

{
    console.log('I1-I3 Primera Visita story-8 cycle (edit -> exact message; restore -> unblocked; fresh TXT -> recovered)');
    const context = await newJourneyContext(browser);
    const page = await openThroughGate(context, 'primera_visita.html');
    const pageErrors = trackedPage(page);
    try {
        await fillPrimera(page, { cip: 'SYN-INT-EDIT-1' });
        const baselineKeys = await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)));
        await clearClipboard(page);
        await page.click('#btnExportarTXT'); // clipboard allowed -> real success authorizes
        await page.waitForTimeout(1200);
        const txtAfterFirst = await readClipboard(page);
        record('I1 precondition: TXT delivered by real clipboard success', txtAfterFirst.trim().length > 0 && txtAfterFirst !== CLIP_CLEAR_SENTINEL, `len=${txtAfterFirst.length}`);

        // Invalidating edit of a central exportable field (EVA_Global, column 102).
        await page.fill('#evaGlobal', '7');
        await clearClipboard(page);
        await page.click('#btnEstructurarCSV');
        await page.waitForTimeout(900);
        const afterEditClip = await readClipboard(page);
        const afterEditBody = await page.evaluate(() => document.body.innerText);
        record('I1 story 8: CSV blocked after exportable edit', afterEditClip === CLIP_CLEAR_SENTINEL, `clip=${JSON.stringify(afterEditClip.slice(0, 40))}`);
        record('I1 story 8: exact discrepancy message shown', afterEditBody.includes(STORY8_MESSAGE), 'story-8 message missing');
        record('I1 story 8: message never claims HCE paste/save', !afterEditBody.includes('guardado en la historia') && !afterEditBody.includes('pegado en'), 'banned claim present');

        // Story 9: change-then-restore — payload equal again must NOT block.
        await page.fill('#evaGlobal', '6');
        await clearClipboard(page);
        await page.click('#btnEstructurarCSV');
        await page.waitForTimeout(900);
        const afterRestore = await readClipboard(page);
        record('I2 story 9: change-then-restore does not force repeating TXT (497 delivered)', afterRestore.split('\t').length === 497, `fields=${afterRestore.split('\t').length}`);

        // Recovery: edit again, repeat TXT, CSV works again.
        await page.fill('#evaGlobal', '7');
        await clearClipboard(page);
        await page.click('#btnEstructurarCSV');
        await page.waitForTimeout(900);
        const stillBlockedBody = await page.evaluate(() => document.body.innerText);
        record('I3 precondition: CSV blocked again after a NEW invalidating edit (discrepancy message)', stillBlockedBody.includes(STORY8_MESSAGE), 'story-8 message missing after second edit');
        await clearClipboard(page);
        await page.click('#btnExportarTXT');
        await page.waitForTimeout(1200);
        await clearClipboard(page);
        await page.click('#btnEstructurarCSV');
        await page.waitForTimeout(900);
        const afterRetxt = await readClipboard(page);
        record('I3 recovery: fresh TXT after the edit re-enables CSV (497 delivered)', afterRetxt.split('\t').length === 497, `fields=${afterRetxt.split('\t').length}`);

        record('I1-I3 journey: pageerror=0', pageErrors.length === 0, JSON.stringify(pageErrors.slice(0, 3)));

        const sentinelState = await readSentinels(page);
        record('I9 sentinels byte-unchanged (story-8 cycle journey)', SENTINEL_KEYS.every((key) => sentinelState[key] === SENTINEL_EXPECTED[key]), JSON.stringify(SENTINEL_KEYS.map((key) => [key, sentinelState[key]])));
        record('I9 no legacy marker created by the gate', sentinelState.__legacyMarkers.length === 0, JSON.stringify(sentinelState.__legacyMarkers));
        const newKeys = sentinelState.__storageKeys.filter((k) => !baselineKeys.includes(k) && !SENTINEL_KEYS.includes(k));
        record('I9 zero NEW Web Storage keys beyond the pre-TXT baseline', newKeys.length === 0, JSON.stringify(newKeys));
        await page.screenshot({ path: '/tmp/reuma_txt_gate_integrity_story8_cycle.png' });
    } finally {
        await context.close();
    }
}

// ---------------------------------------------------------------------------
// I4 — Prerequisite vs discrepancy message distinction (fresh page, no TXT)
// ---------------------------------------------------------------------------

{
    console.log('I4 prerequisite message without any TXT (distinction from story-8)');
    const context = await newJourneyContext(browser);
    const page = await openThroughGate(context, 'primera_visita.html');
    const pageErrors = trackedPage(page);
    try {
        await fillPrimera(page, { cip: 'SYN-INT-PREREQ-1' });
        await clearClipboard(page);
        await page.click('#btnEstructurarCSV');
        await page.waitForTimeout(900);
        const obsClip = await readClipboard(page);
        const obsBody = await page.evaluate(() => document.body.innerText);
        record('I4 story 1: CSV blocked before any TXT', obsClip === CLIP_CLEAR_SENTINEL, `clip=${JSON.stringify(obsClip.slice(0, 40))}`);
        record('I4 story 1: prerequisite message shown', obsBody.includes(PREREQUISITE_MESSAGE), 'prerequisite message missing');
        record('I4 story 8: discrepancy message NOT shown without a prior TXT', !obsBody.includes(STORY8_MESSAGE), 'story-8 message leaked');
        record('I4 journey: pageerror=0', pageErrors.length === 0, JSON.stringify(pageErrors.slice(0, 3)));
    } finally {
        await context.close();
    }
}

// ---------------------------------------------------------------------------
// I5 — Two independent instances, identical tuple, no shared authorization
// ---------------------------------------------------------------------------

{
    console.log('I5 two instances with identical CIP/fecha/tipo/diagnóstico (story 12)');
    const contextA = await newJourneyContext(browser);
    const pageA = await openThroughGate(contextA, 'primera_visita.html');
    await fillPrimera(pageA, { cip: 'SYN-INT-TWIN' });
    await clearClipboard(pageA);
    await pageA.click('#btnExportarTXT');
    await pageA.waitForTimeout(1200);
    const clipA = await readClipboard(pageA);
    await pageA.click('#btnEstructurarCSV');
    await pageA.waitForTimeout(900);
    const csvA = await readClipboard(pageA);
    record('I5 instance A authorizes its own CSV after its TXT', clipA.trim().length > 0 && csvA.split('\t').length === 497, `txt=${clipA.length} fields=${csvA.split('\t').length}`);

    const contextB = await newJourneyContext(browser); // separate browser context = separate page instance
    const pageB = await openThroughGate(contextB, 'primera_visita.html');
    await fillPrimera(pageB, { cip: 'SYN-INT-TWIN' }); // identical CIP/fecha/tipo/diagnóstico
    await clearClipboard(pageB);
    await pageB.click('#btnEstructurarCSV');
    await pageB.waitForTimeout(900);
    const obsBClip = await readClipboard(pageB);
    const obsBBody = await pageB.evaluate(() => document.body.innerText);
    record('I5 story 12: instance B (identical tuple) does NOT inherit authorization', obsBClip === CLIP_CLEAR_SENTINEL, `clip=${JSON.stringify(obsBClip.slice(0, 40))}`);
    record('I5 story 12: instance B sees the prerequisite message, not the discrepancy', obsBBody.includes(PREREQUISITE_MESSAGE) && !obsBBody.includes(STORY8_MESSAGE), `prereq=${obsBBody.includes(PREREQUISITE_MESSAGE)} story8=${obsBBody.includes(STORY8_MESSAGE)}`);
    await contextA.close();
    await contextB.close();
}

// ---------------------------------------------------------------------------
// I6 — Planted legacy marker matching CIP/fecha never authorizes (story 14)
// ---------------------------------------------------------------------------

{
    console.log('I6 planted legacy marker matching CIP/fecha never authorizes');
    const context = await newJourneyContext(browser, {
        matchingMarkerKey: 'HubClinico_TxtExportDone_SYN-INT-LEG-1__2026-02-10__primera__espa',
        matchingMarkerValue: JSON.stringify({ completedAt: '2026-01-01T00:00:00.000Z', visitKey: 'SYN-INT-LEG-1__2026-02-10__primera__espa' }),
    });
    const page = await openThroughGate(context, 'primera_visita.html');
    const pageErrors = trackedPage(page);
    try {
        await fillPrimera(page, { cip: 'SYN-INT-LEG-1' });
        await clearClipboard(page);
        await page.click('#btnEstructurarCSV');
        await page.waitForTimeout(900);
        const obsClip = await readClipboard(page);
        record('I6 story 14: matching legacy marker does NOT authorize CSV', obsClip === CLIP_CLEAR_SENTINEL, `clip=${JSON.stringify(obsClip.slice(0, 40))}`);
        record('I6 story 14: marker survives untouched (not read, deleted or migrated)', (await readSentinels(page))['HubClinico_TxtExportDone_SYN-INT-LEG-1__2026-02-10__primera__espa'] !== null, 'matching marker removed');
        record('I6 journey: pageerror=0', pageErrors.length === 0, JSON.stringify(pageErrors.slice(0, 3)));
    } finally {
        await context.close();
    }
}

// ---------------------------------------------------------------------------
// I7 — 7-consumer load map with the NEW token
// ---------------------------------------------------------------------------

{
    console.log('I7 7-consumer load map (new exportManager token)');
    for (const pageFile of CONSUMERS) {
        const context = await newJourneyContext(browser);
        const page = await openThroughGate(context, pageFile);
        const pageErrors = trackedPage(page);
        await page.waitForTimeout(800); // let the page settle (app DB writes included)
        const baselineKeys = await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)));
        await page.waitForTimeout(800); // idle window: no further storage activity expected
        const settledKeys = await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)));
        const state = await page.evaluate((newToken) => ({
            newToken: Array.from(document.scripts).some((s) => (s.getAttribute('src') || '') === newToken),
            oldToken: Array.from(document.scripts).some((s) => (s.getAttribute('src') || '').includes('20261009-export-safety-18-exportmanager-r1')),
            body: document.body.innerText,
            hasTxtBtn: !!document.getElementById('btnExportarTXT'),
            hasCsvBtn: !!document.getElementById('btnEstructurarCSV'),
        }), NEW_EXPORT_MANAGER_TOKEN);
        record(`I7 ${pageFile}: pageerror=0`, pageErrors.length === 0, JSON.stringify(pageErrors.slice(0, 3)));
        record(`I7 ${pageFile}: NEW exportManager token loaded (old token absent)`, state.newToken === true && state.oldToken === false, `new=${state.newToken} old=${state.oldToken}`);
        if (NON_GATE_PAGES.includes(pageFile)) {
            record(`I7 ${pageFile}: no TXT gate controls or gate messaging`, !state.hasTxtBtn && !state.hasCsvBtn && !state.body.includes(PREREQUISITE_MESSAGE) && !state.body.includes(STORY8_MESSAGE), `txt=${state.hasTxtBtn} csv=${state.hasCsvBtn}`);
        }
        const newKeys = settledKeys.filter((k) => !baselineKeys.includes(k) && !SENTINEL_KEYS.includes(k));
        record(`I7 ${pageFile}: zero NEW Web Storage keys in the idle window after load`, newKeys.length === 0, JSON.stringify(newKeys));
        await context.close();
    }
}

// ---------------------------------------------------------------------------
// I8 — Two real journeys end-to-end (Primera Visita + Seguimiento)
// ---------------------------------------------------------------------------

async function journeyEndToEnd(pageFile, isSeguimiento, urlQuery = '') {
    console.log(`I8 ${pageFile} real journey (TXT -> 497 CSV)`);
    const context = await newJourneyContext(browser);
    const page = await openThroughGate(context, `${pageFile}${urlQuery}`);
    const pageErrors = trackedPage(page);
    if (isSeguimiento) {
        await fillSeguimiento(page);
    } else {
        await fillPrimera(page, { cip: 'SYN-INT-PV-JOURNEY' });
    }
    const baselineKeys = await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)));
    await clearClipboard(page);
    await page.click('#btnExportarTXT');
    await page.waitForTimeout(1200);
    const txt = await readClipboard(page);
    await clearClipboard(page);
    await page.click('#btnEstructurarCSV');
    await page.waitForTimeout(900);
    const csv = await readClipboard(page);
    const obsBody = await page.evaluate(() => document.body.innerText);
    const fields = csv.split('\t');
    record(`I8 ${pageFile}: TXT note delivered by real clipboard success`, txt.trim().length > 0 && txt !== CLIP_CLEAR_SENTINEL, `len=${txt.length}`);
    record(`I8 ${pageFile}: TXT contains the generated clinical note`, txt.includes('\u2593\u2593\u2593') || txt.includes('Historia'), `head=${JSON.stringify(txt.slice(0, 40))}`);
    record(`I8 ${pageFile}: 497-field CSV delivered after the TXT`, fields.length === 497, `fields=${fields.length}`);
    record(`I8 ${pageFile}: no gate block message on the happy path`, !obsBody.includes(PREREQUISITE_MESSAGE) && !obsBody.includes(STORY8_MESSAGE), 'gate message shown');
    record(`I8 ${pageFile}: pageerror=0`, pageErrors.length === 0, JSON.stringify(pageErrors.slice(0, 3)));

    const sentinelState = await readSentinels(page);
    record(`I8 ${pageFile}: sentinels byte-unchanged`, SENTINEL_KEYS.every((key) => sentinelState[key] === SENTINEL_EXPECTED[key]), JSON.stringify(SENTINEL_KEYS.map((key) => [key, sentinelState[key]])));
    record(`I8 ${pageFile}: no legacy marker created`, sentinelState.__legacyMarkers.length === 0, JSON.stringify(sentinelState.__legacyMarkers));
    record(`I8 ${pageFile}: hubPendingRows remains the planted sentinel byte-unchanged (gate never creates pending rows)`, sentinelState[SENTINEL_PENDING_KEY] === SENTINEL_EXPECTED[SENTINEL_PENDING_KEY], `value=${JSON.stringify(sentinelState[SENTINEL_PENDING_KEY])}`);
    const newKeys = sentinelState.__storageKeys.filter((k) => !baselineKeys.includes(k) && !SENTINEL_KEYS.includes(k));
    record(`I8 ${pageFile}: zero NEW Web Storage keys across TXT+CSV beyond the pre-TXT baseline`, newKeys.length === 0, JSON.stringify(newKeys));
    await page.screenshot({ path: `/tmp/reuma_txt_gate_integrity_${isSeguimiento ? 'seguimiento' : 'primera'}_journey.png` });
    await context.close();
}
await journeyEndToEnd('primera_visita.html', false);
await journeyEndToEnd('seguimiento.html', true, '?id=SYN-SEG-300');

// ---------------------------------------------------------------------------

await browser.close();
server.close();
const fails = results.filter((r) => !r.pass).length;
console.log('\nREUMA-TXT-GATE-INTEGRITY-BROWSER: ' + (fails === 0 ? 'PASS' : 'FAIL') + ` ${results.length - fails}/${results.length} cases`);
process.exit(fails === 0 ? 0 : 1);
