#!/usr/bin/env node
'use strict';
/**
 * Browser QA for WO-NEXUS-REUMA-F5.4C (#464, train #461): the supported Reuma
 * export journeys of Primera Visita and Seguimiento are cut over to the Visit
 * Act v1 route while preserving the visible export/copy behavior.
 *
 * Supplementary evidence for the frozen principal oracle
 * `tools/reuma_act_cutover_check.mjs`; it does NOT replace it. The route under
 * test is the real one wired in the page coordinators: `recopilar…()` →
 * `HubTools.reumaActContract.createVisitAct` → `HubTools.reumaLegacyExportAdapter.projectVisitAct497`
 * → `HubTools.export.exportarAct497` → shared delivery (clipboard with
 * manual-copy fallback + post-export checklist).
 *
 * Follows the conventions of `tools/reuma_export_boundary_browser_check.mjs` /
 * `tools/reuma_pcr_units_browser_check.mjs`: a real repo-root HTTP server, the
 * real session gate on reuma_index.html (file input → professional select → confirm),
 * real navigation and real supported interactions (fill, select, homunculus
 * region clicks, biomarker badge click, collapsible headers, TXT then CSV
 * export buttons). No DOM/storage cheating. The only `page.addInitScript` use
 * defines the planted boundary double required by the fail-closed probe,
 * exactly like the planted seam double of #457. Clipboard/modal contents are
 * read AFTER the supported interaction as post-state observation.
 *
 * Fixtures are synthetic only (ids SYN-*); the temporary XLSX lives outside the
 * repository. The only external requests are the page's own CDN assets.
 *
 * Cases:
 *   W1 static wiring: both pages load the act-contract and adapter modules
 *      after the boundary module and before their page scripts, with ?v=
 *   H1 Primera Visita happy path for the 5 pathologies (espa/aps/ar/les/
 *      sjogren): CSV export succeeds and the copied row is a 497-field TSV
 *      carrying the synthetic identity, the 'Primera Visita' marker and the
 *      pathology token; console.error=0 and pageerror=0
 *   H2 Seguimiento happy path for the 5 pathologies: same contract with the
 *      'Seguimiento' marker
 *   F1 planted boundary failure (Primera Visita): no post-export checklist, no
 *      row delivered at all (no clipboard TSV, no modal TSV — fail-closed,
 *      never a partial copy; a 496-field delivery would also fail), visible
 *      'frontera de compatibilidad' fail-closed alert, pageerror=0; partial-
 *      copy negative witness proving a planted 496-field delivery FAILS the
 *      fail-closed evaluator
 *
 * RETIRED PENDING-ROWS CONTRACT (T4 reconciliation,
 * TRAIN-NEXUS-REUMA-EXPORT-SAFETY-18 / WO-REUMA-EXPORT-SAFETY-18D): the
 * pending-rows queue, the `pendingRowsUpdated` event and the recovery API
 * are GONE from runtime; the mutual recursion that threw "Maximum call stack
 * size exceeded" after every successful CSV export no longer exists. The
 * former tolerance for that exact pageerror is REMOVED: every happy path
 * (H1/H2) now requires pageerror=0; the fail-closed case F1 keeps its
 * explicitly classified expected console.error classes and pageerror=0.
 * The full 5-pathology × 2-journeys matrix covered here by H1/H2 is the
 * pathology coverage referenced by
 * `tools/reuma_pending_retirement_browser_check.mjs`.
 *
 * Usage: node tools/reuma_act_cutover_browser_check.mjs
 * Documented env var: PLAYWRIGHT_CHROMIUM_EXECUTABLE (headless-shell path).
 * Exit code 0 = every case PASS, 1 = at least one FAIL or environment failure.
 */

import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const PAGE_PRIMERA = 'primera_visita.html';
const PAGE_SEGUIMIENTO = 'seguimiento.html';
const PAGE_SCRIPT_PRIMERA = 'scripts/script_primera_visita.js';
const PAGE_SCRIPT_SEGUIMIENTO = 'scripts/script_seguimiento.js';
const BOUNDARY_SCRIPT = 'modules/reuma_export_boundary.js';
const CONTRACT_SCRIPT = 'modules/reuma_act_contract.js';
const ADAPTER_SCRIPT = 'modules/reuma_legacy_export_adapter.js';

const PATHOLOGIES = ['espa', 'aps', 'ar', 'les', 'sjogren'];

const VISIT = {
    primera: {
        page: PAGE_PRIMERA,
        pageScript: PAGE_SCRIPT_PRIMERA,
        marker: 'Primera Visita',
        collect: 'recopilarDatosFormulario',
        validate: 'validarFormulario',
        idPrefix: 'SYN-ACT-PV',
    },
    seguimiento: {
        page: PAGE_SEGUIMIENTO,
        pageScript: PAGE_SCRIPT_SEGUIMIENTO,
        marker: 'Seguimiento',
        collect: 'recopilarDatosFormularioSeguimiento',
        validate: 'validarFormularioSeguimiento',
        idPrefix: 'SYN-ACT-SG',
    },
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
        return fs.existsSync(pkg) ? createRequire(path.join(nodeModules, '__reuma_act_cutover_loader.cjs'))('playwright') : null;
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
    if (fs.existsSync(npxCache)) {
        for (const entry of fs.readdirSync(npxCache).sort().reverse()) {
            const loaded = tryNodeModules(path.join(npxCache, entry, 'node_modules'));
            if (loaded) return loaded;
        }
    }
    const loaded = tryNodeModules(path.join(ROOT, 'node_modules'));
    if (loaded) return loaded;
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/reuma_act_cutover_browser_check.mjs');
}

let chromium;
try {
    ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
    console.error('ENVIRONMENT FAILURE: ' + err.message);
    console.log('\nREUMA-ACT-CUTOVER-BROWSER: FAIL 0/0');
    process.exit(1);
}

function chromiumExecutable() {
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    const bundled = chromium.executablePath();
    if (fs.existsSync(bundled)) return bundled;
    const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
    if (!fs.existsSync(cache)) return bundled;
    const candidates = fs.readdirSync(cache)
        .filter((entry) => entry.startsWith('chromium_headless_shell-'))
        .sort().reverse()
        .map((entry) => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
    return candidates.find(fs.existsSync) || bundled;
}

// ---------------------------------------------------------------------------
// Synthetic session fixture (temporary, outside the repository) + repo-root
// HTTP server, mirroring tools/reuma_pcr_units_browser_check.mjs.
// ---------------------------------------------------------------------------

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-act-cutover-browser-'));
const workbookPath = path.join(tempDir, 'reuma_act_cutover_synthetic.xlsx');
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
        if (!fs.statSync(file).isFile()) throw new Error('not_file');
        response.writeHead(200, {
            'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
            'cache-control': 'no-store',
        });
        fs.createReadStream(file).pipe(response);
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

// ---------------------------------------------------------------------------
// Supported interactions.
// ---------------------------------------------------------------------------

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

/**
 * Satisfies the pre-existing AR form validation through supported
 * interactions only: real homunculus NAD/NAT region clicks, the real ANA
 * biomarker badge and real inputs (the readonly DAS28/CDAI/SDAI results are
 * populated by the app's own score wiring). No DOM value is written directly.
 */
async function satisfyArForm(page, kind) {
    const rigidezId = kind === 'primera' ? '#rigidezMatutinaAR' : '#rigidezMatutinaARSeg';
    for (const selector of ['#pcrValue', '#vsgValue', '#evaGlobal', '#evaMedico', rigidezId, '#das28NAD', '.homunculus-svg-wrapper']) {
        const visible = await openAncestorCollapsibles(page, selector);
        if (!visible) throw new Error('no fue posible hacer visible ' + selector + ' mediante interacción soportada');
    }

    await page.locator('.homunculus-mode-btn[data-mode="nad"]').click();
    await page.locator('[data-region-id="hombro-derecho"]').first().click();
    await page.locator('.homunculus-mode-btn[data-mode="nat"]').click();
    await page.locator('[data-region-id="hombro-izquierdo"]').first().click();
    await page.locator('.ana-btn[data-value="positivo"]').first().click();

    await page.locator('#pcrValue').first().fill('30');
    await page.locator('#vsgValue').first().fill('20');
    await page.locator('#evaGlobal').first().fill('3');
    await page.locator('#evaMedico').first().fill('2');
    await page.locator(rigidezId).first().fill('30');
    await page.waitForTimeout(350);
}

/**
 * Supported export flow: identity/date/pathology, AR-only prerequisites, TXT
 * export (the legal prerequisite), close the manual-copy modal if the
 * environment has no clipboard permission, then click the CSV export button.
 * Returns the validation errors observed through the supported collection API
 * (diagnostic detail only; the coordinator performs its own validation).
 */
async function exportTxtThenCsv(page, { id, pathology, kind }) {
    await page.fill('#idPaciente', id);
    await page.fill('#fechaVisita', '2026-09-29');
    await page.selectOption('#diagnosticoPrimario', pathology);
    await page.waitForTimeout(300);
    if (pathology === 'ar') await satisfyArForm(page, kind);

    const validationErrors = await page.evaluate((fnName) => {
        try { return HubTools.form[fnName]() || []; } catch (error) { return ['<validation-crashed>']; }
    }, VISIT[kind].validate);

    await page.click('#btnExportarTXT');
    await page.waitForTimeout(1200);
    if (await page.locator('#textoModalContainer').count() > 0) {
        await page.click('#closeModalBtn');
        await page.waitForTimeout(200);
    }
    await page.click('#btnEstructurarCSV');
    await page.waitForTimeout(1500);
    return validationErrors;
}

// Post-state observation only: read what the supported interaction produced.
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

function validateRow(rowText, { id, marker, token }) {
    const fields = rowText.split('\t');
    return {
        fields497: fields.length === 497,
        identity: fields[0] === id,
        visitMarker: fields[4] === marker,
        pathologyToken: fields[6] === token,
    };
}

/**
 * F4 fail-closed delivery evaluator (WO:17 'no copiar fila parcial'): when the
 * boundary rejects, NO row may be delivered at all — no clipboard TSV and no
 * manual-modal TSV — regardless of field count (a 496-field partial row is a
 * violation, never a pass).
 */
function evaluateFailClosedDelivery(row, { checklistCount, failClosedVisible }) {
    const problems = [];
    if (!row || row.source !== 'none' || row.text !== '') {
        problems.push(`row delivered via ${row ? row.source : 'unknown'} (${row && row.text ? row.text.split('\t').length : 0} fields)`);
    }
    if (checklistCount !== 0) problems.push(`checklist=${checklistCount}`);
    if (failClosedVisible !== true) problems.push('fail-closed alert not visible');
    return { pass: problems.length === 0, problems };
}

// Planted boundary double exactly like the #457 pattern: the real adapter is
// kept in play and propagates the planted rejection; the coordinator must
// fail closed with the 'frontera de compatibilidad' notification.
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
    // W1 — static wiring.
    // =====================================================================
    for (const kind of ['primera', 'seguimiento']) {
        const config = VISIT[kind];
        const html = fs.readFileSync(path.join(ROOT, config.page), 'utf8');
        const boundaryIndex = html.indexOf(BOUNDARY_SCRIPT + '?v=');
        const contractIndex = html.indexOf(CONTRACT_SCRIPT + '?v=');
        const adapterIndex = html.indexOf(ADAPTER_SCRIPT + '?v=');
        const pageScriptIndex = html.indexOf(config.pageScript + '?v=');
        record(`W1 ${config.page} loads the act-contract and adapter modules after the boundary, before the page script, with ?v=`,
            boundaryIndex !== -1 && contractIndex !== -1 && adapterIndex !== -1 && pageScriptIndex !== -1 &&
            boundaryIndex < contractIndex && contractIndex < adapterIndex && adapterIndex < pageScriptIndex,
            `boundary=${boundaryIndex} contract=${contractIndex} adapter=${adapterIndex} pageScript=${pageScriptIndex}`);
    }

    browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
    const chromiumVersion = browser.version();

    // =====================================================================
    // H1/H2 — happy paths for the 5 pathologies on both journeys.
    // =====================================================================
    for (const kind of ['primera', 'seguimiento']) {
        const config = VISIT[kind];
        for (const pathology of PATHOLOGIES) {
            const id = `${config.idPrefix}-${pathology.toUpperCase()}`;
            const context = await passSupportedGate(browser, origin);
            try {
                const page = await context.newPage();
                const entry = trackedPage(page);
                await page.goto(`${origin}/${config.page}`, { waitUntil: 'load', timeout: 45000 });
                let validationErrors = [];
                try {
                    validationErrors = await exportTxtThenCsv(page, { id, pathology, kind });
                } catch (error) {
                    validationErrors = ['<interaction-failed: ' + error.message + '>'];
                }
                const checklistAppeared = await page.waitForSelector('#postExportChecklist', { timeout: 8000 }).then(() => true).catch(() => false);
                const row = await readExportedRow(page);
                const checks = row.text ? validateRow(row.text, { id, marker: config.marker, token: pathology }) : { fields497: false };
                record(`H${kind === 'primera' ? '1' : '2'} ${pathology} happy path (${config.page}): copied row is a 497-field TSV with identity, '${config.marker}' marker and '${pathology}' token`,
                    checklistAppeared && row.source !== 'none' && checks.fields497 && checks.identity && checks.visitMarker && checks.pathologyToken,
                    `checklist=${checklistAppeared} source=${row.source} checks=${JSON.stringify(checks)} fields=${row.text ? row.text.split('\t').length : 0} validationErrors=${JSON.stringify(validationErrors)}`);

                const consoleErrors = entry.consoleErrors.filter((message) => message.includes(config.page));
                record(`H${kind === 'primera' ? '1' : '2'} ${pathology} happy path (${config.page}): console.error=0 and pageerror=0 (retired pending-rows contract: no tolerated recursion)`,
                    consoleErrors.length === 0 && entry.pageErrors.length === 0,
                    `consoleErrors=${JSON.stringify(consoleErrors.slice(0, 5))} pageErrors=${JSON.stringify(entry.pageErrors.slice(0, 5))}`);
            } finally {
                await context.close();
            }
        }
    }

    // =====================================================================
    // F1 — planted boundary failure: fail closed, no misleading partial copy.
    // =====================================================================
    {
        const context = await passSupportedGate(browser, origin);
        try {
            const page = await context.newPage();
            await page.addInitScript(plantedBoundaryFailure);
            const entry = trackedPage(page);
            await page.goto(`${origin}/${PAGE_PRIMERA}`, { waitUntil: 'load', timeout: 45000 });
            await exportTxtThenCsv(page, { id: 'SYN-ACT-FAIL-001', pathology: 'les', kind: 'primera' });
            await page.waitForTimeout(1200);
            const checklistCount = await page.locator('#postExportChecklist').count();
            const row = await readExportedRow(page);
            const rowFields = row.text ? row.text.split('\t').length : 0;
            const alerts = await page.locator('[role="alert"]').allTextContents();
            const failClosedVisible = alerts.some((text) => text.includes('frontera de compatibilidad'));
            // F4 fail-closed (WO:17 'no copiar fila parcial'): NO row may be
            // delivered at all — a 496-field partial row is also a violation.
            const noDeliveryVerdict = evaluateFailClosedDelivery(row, { checklistCount, failClosedVisible });
            record('F1 planted boundary failure: fail-closed visible error, no post-export checklist and NO row delivered at all (no clipboard TSV, no modal TSV — fail-closed, never a partial copy)',
                noDeliveryVerdict.pass && entry.pageErrors.length === 0,
                `problems=${JSON.stringify(noDeliveryVerdict.problems)} failClosedVisible=${failClosedVisible} checklist=${checklistCount} rowSource=${row.source} rowFields=${rowFields} alerts=${JSON.stringify(alerts)} pageErrors=${JSON.stringify(entry.pageErrors)}`);
            // Partial-copy negative witness (F4): a planted 496-field partial
            // delivery must FAIL the same fail-closed evaluator used by F1,
            // while a true no-delivery state passes it.
            const partialDelivery = { source: 'clipboard', text: Array.from({ length: 496 }, (_, i) => `F${i}`).join('\t') };
            const plantedPartial = evaluateFailClosedDelivery(partialDelivery, { checklistCount: 0, failClosedVisible: true });
            const cleanNone = evaluateFailClosedDelivery({ source: 'none', text: '' }, { checklistCount: 0, failClosedVisible: true });
            record('F1 partial-copy witness: a planted 496-field partial delivery FAILS the fail-closed no-row evaluator while a true no-delivery state passes it',
                plantedPartial.pass === false && cleanNone.pass === true,
                `plantedPass=${plantedPartial.pass} plantedProblems=${JSON.stringify(plantedPartial.problems)} cleanPass=${cleanNone.pass}`);
        } finally {
            await context.close();
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
    fs.rmSync(tempDir, { recursive: true, force: true });
}

const failed = results.filter((result) => !result.pass);
if (failed.length > 0) {
    console.log('FAILED CASES:');
    for (const item of failed) console.log(`  - ${item.name}`);
}
console.log(`\nREUMA-ACT-CUTOVER-BROWSER: ${failed.length === 0 ? 'PASS' : 'FAIL'} ${results.length - failed.length}/${results.length} cases`);
process.exit(failed.length === 0 ? 0 : 1);
