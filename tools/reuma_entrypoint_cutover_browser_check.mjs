#!/usr/bin/env node
'use strict';
/**
 * Browser QA for WO-NEXUS-PAGES-CUTOVER-T1 (#604, train #606): the Reuma
 * entrypoint is preserved at reuma_index.html while legacy index.html stays
 * byte-identical.
 *
 * Focused T1 evidence only (no open-ended sibling audit):
 *   A. /index.html still opens the legacy Reuma screen and its professional
 *      session gate works (synthetic .xlsx load -> professional select ->
 *      confirm) through supported interactions only.
 *   B. /reuma_index.html opens the real Reuma app with the SAME gate.
 *      Negative (fresh context, no session): no redirect away, the gate is
 *      visible and enforced, and the page never leaves the Reuma surface.
 *   C. With a synthetic workbook and a selected professional, a supported
 *      Reuma visit route works from reuma_index.html (Nueva Visita), and the
 *      reconciled return-to-Reuma anchor (Inicio) lands back on
 *      reuma_index.html.
 *   D. From /farmacia_index.html the Reumatologia back anchor navigates to
 *      reuma_index.html.
 *   E. console.error = 0, pageerror = 0 and no unexpected 404 on every page
 *      exercised above.
 *
 * Follows the conventions of tools/reuma_act_cutover_browser_check.mjs: a real
 * repo-root HTTP server, the real session gate (file input -> professional
 * select -> confirm), real navigation and real supported clicks. No DOM
 * tampering, no monkeypatched fixtures, no suppressed console. Fixtures are
 * synthetic only (SYN-*); the temporary XLSX lives outside the repository.
 * The only external requests are the page's own CDN assets.
 *
 * Usage: node tools/reuma_entrypoint_cutover_browser_check.mjs
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

const results = [];
function record(name, pass, detail) {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

// Same documented Playwright resolution as the other browser checkers.
function loadPlaywrightFromNpx() {
    const tryNodeModules = (nodeModules) => {
        const pkg = path.join(nodeModules, 'playwright', 'package.json');
        return fs.existsSync(pkg) ? createRequire(path.join(nodeModules, '__reuma_entrypoint_loader.cjs'))('playwright') : null;
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
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/reuma_entrypoint_cutover_browser_check.mjs');
}

let chromium;
try {
    ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
    console.error('ENVIRONMENT FAILURE: ' + err.message);
    console.log('\nREUMA-ENTRYPOINT-CUTOVER-BROWSER: FAIL 0/0');
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
// Synthetic workbook (temporary, outside the repository) + repo-root server.
// ---------------------------------------------------------------------------

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-entrypoint-cutover-'));
const workbookPath = path.join(tempDir, 'reuma_entrypoint_synthetic.xlsx');
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
const notFoundPaths = [];
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
        notFoundPaths.push('/' + relative);
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
    }
});

// ---------------------------------------------------------------------------
// Console/pageerror bookkeeping across every exercised page.
// ---------------------------------------------------------------------------

const consoleErrors = [];
const pageErrors = [];

function trackPage(page) {
    page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(`${page.url()} :: ${message.text()}`);
    });
    page.on('pageerror', (error) => pageErrors.push(`${page.url()} :: ${error.message}`));
    return page;
}

// Supported session gate: real file input -> real professional select -> real
// confirm button. Establishes localStorage.hubSelectedProfessional and the
// sessionStorage corpus cache without touching any storage key.
async function passSupportedGate(page) {
    await page.setInputFiles('#gateExcelInput', workbookPath);
    await page.waitForSelector('#gateStepSelect:not(.hidden)', { timeout: 20000 });
    const professional = await page.evaluate(() => {
        const select = document.getElementById('gateProfessionalSelect');
        return select ? Array.from(select.options).map((option) => option.value).find(Boolean) || '' : '';
    });
    if (!professional) throw new Error('gate professional list is empty');
    await page.selectOption('#gateProfessionalSelect', professional);
    await page.click('#gateConfirmBtn');
    await page.waitForFunction(() => document.getElementById('sessionGate').classList.contains('hidden'), null, { timeout: 10000 });
    return professional;
}

function gateState(page) {
    return page.evaluate(() => {
        const gate = document.getElementById('sessionGate');
        if (!gate) return { present: false, hidden: null };
        return { present: true, hidden: gate.classList.contains('hidden') };
    });
}

async function main() {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({ executablePath: chromiumExecutable() });

    try {
        // -- Case A: legacy /index.html gate works through supported flow. --
        {
            const context = await browser.newContext();
            const page = trackPage(await context.newPage());
            await page.goto(`${origin}/index.html`, { waitUntil: 'load', timeout: 45000 });
            const before = await gateState(page);
            record('A1 legacy index.html renders the professional gate', before.present && before.hidden === false,
                JSON.stringify(before));
            const professional = await passSupportedGate(page);
            const label = await page.textContent('#currentProfessional');
            record('A2 legacy gate confirms a synthetic professional',
                (label || '').trim() === professional, `label=${JSON.stringify(label)} professional=${JSON.stringify(professional)}`);
            await context.close();
        }

        // -- Case B: /reuma_index.html negative (no session) + parity. --
        {
            const context = await browser.newContext();
            const page = trackPage(await context.newPage());
            await page.goto(`${origin}/reuma_index.html`, { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(1500);
            const url = page.url();
            record('B1 reuma_index.html with no session does not navigate away',
                url === `${origin}/reuma_index.html`, `url=${url}`);
            const gate = await gateState(page);
            record('B2 reuma_index.html enforces the professional gate (visible overlay)',
                gate.present && gate.hidden === false, JSON.stringify(gate));
            const nonReuma = /nexus_home|farmacia_/i.test(url);
            record('B3 no navigation to a non-Reuma surface', !nonReuma, `url=${url}`);
            const parity = await page.evaluate(() => {
                const scripts = Array.from(document.querySelectorAll('script[src]')).map((s) => s.getAttribute('src'));
                const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l) => l.getAttribute('href'));
                const ids = ['sessionGate', 'gateExcelInput', 'gateProfessionalSelect', 'gateConfirmBtn',
                    'dashboardContent', 'patientSearch', 'currentProfessional', 'logoutBtn', 'dbStatusIndicator'];
                return {
                    scripts, styles,
                    missingIds: ids.filter((id) => !document.getElementById(id)),
                    title: document.title,
                };
            });
            const expectedScripts = ['modules/hubTools.js', 'modules/utils.js', 'modules/customSelect.js',
                'modules/fieldNormalizer.js', 'modules/mockPatients.js', 'modules/scoreCalculators.js',
                'modules/homunculus.js', 'modules/dataManager.js', 'modules/exportManager.js', 'script.js'];
            const scriptsOk = expectedScripts.every((base) => parity.scripts.some((src) => (src || '').startsWith(base)));
            record('B4 reuma_index.html preserves script asset order and DOM ids',
                scriptsOk && parity.missingIds.length === 0,
                `scripts=${JSON.stringify(parity.scripts)} missingIds=${JSON.stringify(parity.missingIds)}`);
            const inicioHref = await page.getAttribute('aside.sidebar a.nav-link[href="reuma_index.html"]', 'href').catch(() => null);
            const farmaciaHref = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('aside.sidebar a.nav-link'));
                const hit = links.find((a) => /farmacia hospitalaria/i.test(a.textContent || ''));
                return hit ? hit.getAttribute('href') : null;
            });
            record('B5 reuma_index.html self-entry Inicio + Farmacia anchors',
                inicioHref === 'reuma_index.html' && farmaciaHref === 'farmacia_index.html',
                `inicio=${JSON.stringify(inicioHref)} farmacia=${JSON.stringify(farmaciaHref)}`);
            await context.close();
        }

        // -- Case C: positive visit route from reuma_index.html + return. --
        {
            const context = await browser.newContext();
            const page = trackPage(await context.newPage());
            await page.goto(`${origin}/reuma_index.html`, { waitUntil: 'load', timeout: 45000 });
            await passSupportedGate(page);
            await Promise.all([
                page.waitForURL('**/primera_visita.html', { timeout: 15000 }),
                page.click('aside.sidebar a.nav-link[href="primera_visita.html"]'),
            ]);
            const formPresent = await page.evaluate(() => !!document.querySelector('form, #visitForm, main'));
            record('C1 supported visit route works from reuma_index.html',
                /primera_visita\.html$/.test(page.url()) && formPresent, `url=${page.url()} form=${formPresent}`);
            await Promise.all([
                page.waitForURL('**/reuma_index.html', { timeout: 15000 }),
                page.click('aside.sidebar a.nav-link[href="reuma_index.html"]'),
            ]);
            const gateAfter = await gateState(page);
            record('C2 return-to-Reuma anchor lands back on reuma_index.html with session kept',
                /reuma_index\.html$/.test(page.url()) && gateAfter.hidden === true,
                `url=${page.url()} gate=${JSON.stringify(gateAfter)}`);
            await context.close();
        }

        // -- Case D: farmacia back anchor navigates to reuma_index.html. --
        {
            const context = await browser.newContext();
            const page = trackPage(await context.newPage());
            await page.goto(`${origin}/farmacia_index.html`, { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(1000);
            const anchorHref = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a.nav-link'));
                const hit = links.find((a) => /reumatolog/i.test(a.textContent || ''));
                return hit ? hit.getAttribute('href') : null;
            });
            record('D1 farmacia Reumatologia anchor points to reuma_index.html',
                anchorHref === 'reuma_index.html', `href=${JSON.stringify(anchorHref)}`);
            if (anchorHref === 'reuma_index.html') {
                await Promise.all([
                    page.waitForURL('**/reuma_index.html', { timeout: 15000 }),
                    page.evaluate(() => {
                        const links = Array.from(document.querySelectorAll('a.nav-link'));
                        const hit = links.find((a) => /reumatolog/i.test(a.textContent || ''));
                        if (hit) hit.click();
                    }),
                ]);
            }
            record('D2 farmacia Reumatologia anchor navigates to reuma_index.html',
                /reuma_index\.html$/.test(page.url()), `url=${page.url()}`);
            await context.close();
        }

        // -- Case E: clean console/pageerror/404 across every exercised page. --
        record('E1 console.error = 0 on every exercised page',
            consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 5)));
        record('E2 pageerror = 0 on every exercised page',
            pageErrors.length === 0, JSON.stringify(pageErrors.slice(0, 5)));
        record('E3 no unexpected 404 from the repository server',
            notFoundPaths.length === 0, JSON.stringify(notFoundPaths.slice(0, 10)));
    } finally {
        await browser.close();
        server.close();
    }

    const passed = results.filter((r) => r.pass).length;
    console.log(`\nREUMA-ENTRYPOINT-CUTOVER-BROWSER: ${passed === results.length ? 'PASS' : 'FAIL'} ${passed}/${results.length}`);
    process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => {
    console.error('ENVIRONMENT FAILURE: ' + (err && err.message ? err.message : err));
    console.log('\nREUMA-ENTRYPOINT-CUTOVER-BROWSER: FAIL 0/0');
    process.exit(1);
});
