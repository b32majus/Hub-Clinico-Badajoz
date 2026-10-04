#!/usr/bin/env node
'use strict';
/**
 * Browser QA for the simplified Reuma prebiologic circuit (SIL-REV-004 /
 * ticket #445, T3 of TRAIN-NEXUS-CLINICAL-SAFETY-REUMA-06).
 *
 * Real Chromium (Playwright) qualification of primera_visita.html and
 * seguimiento.html over a served repository root. Every state change runs
 * through supported user-level interaction (real collapsible headers, real
 * <select> choices, real navigation). page.evaluate is used only to READ
 * observable state and to call the supported collection APIs.
 *
 * Scenarios:
 *   P1  both pages expose exactly the two contract blocks (Analítica,
 *       Medicina Preventiva) with an empty default plus exactly the three
 *       supported states; the legacy global state select and legacy detail
 *       fields are no longer present in the main flow;
 *   P2  the three states of Analítica and Preventiva can be walked through
 *       supported selects and are reflected verbatim by the supported
 *       collection API (never invented anywhere else);
 *   P3  supported navigation/reload resets capture to the fail-safe empty
 *       state (no phantom persistence);
 *   P4  restoration: a synthetic workbook visit carrying EXPLICIT new block
 *       columns restores those states through the supported seguimiento?id=
 *       route (prefill + badge);
 *   P5  legacy case WITHOUT DOM manipulation: a synthetic workbook visit with
 *       full legacy detail (results, dates, vaccination, derivation) and an
 *       explicit legacy global state produces NO fabricated OK and no global
 *       APTO in the badge;
 *   P6  empty/fail-safe: no patient -> neutral badge, empty selects;
 *   P7  console.error === 0 and pageerror === 0.
 *
 * #525 minimal-block additions (WO-NEXUS-REUMA-PREBIO-MINIMAL-13,
 * Cost policy: go / Risk class: complex; frozen oracle alongside #445):
 *   M1  #fechaDiagnostico is absent from the page (RED at baseline);
 *   M2  the block exposes exactly one observacionesPrebiologico textarea,
 *       not required;
 *   M3  through SUPPORTED interaction only (real collapsible click + real
 *       typing, no DOM mutation, no readonly tampering), filling
 *       Observaciones prebiológico with a synthetic string is returned
 *       verbatim under observacionesPrebiologico by the supported collect
 *       API (HubTools.form.recopilarDatosFormulario /
 *       recopilarDatosFormularioSeguimiento);
 *   M4  no APTO control/copy inside the prebiologic block.
 *
 * Synthetic data only. Exit code 0 = PASS, 1 = FAIL.
 * Usage: node tools/reuma_prebiologic_states_browser_check.mjs
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
    results.push(pass);
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function loadPlaywrightFromNpx() {
    const tried = [];
    const tryNodeModules = (nodeModules) => {
        const pkg = path.join(nodeModules, 'playwright', 'package.json');
        tried.push(pkg);
        if (fs.existsSync(pkg)) {
            return createRequire(path.join(nodeModules, '__reuma_prebiologic_loader.cjs'))('playwright');
        }
        return null;
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
    throw new Error('Playwright not found. Tried: ' + tried.join(', '));
}

let chromium;
try {
    ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
    console.error('ENVIRONMENT FAILURE: ' + err.message);
    console.log('RESULTADO: 0 OK / 1 FALLIDO');
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

const mime = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
    ['.svg', 'image/svg+xml'],
    ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
]);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-prebiologic-'));
const workbookPath = path.join(tempDir, 'reuma_prebiologic_synthetic.xlsx');
{
    // Synthetic clinical DB. ESPA carries:
    //  - SYN-T3-100: explicit NEW block states (restoration scenario);
    //  - SYN-T3-200: full LEGACY detail + explicit legacy global state, no
    //    new block columns (no fabricated OK scenario);
    //  - SYN-T3-300: minimal row without prebiologic data (empty state).
    const commonRow = {
        ID_Paciente: 'SYN-T3-000',
        Nombre_Paciente: 'Sintetico Tres',
        Fecha_Visita: '2026-09-20',
        Tipo_Visita: 'Primera',
        Diagnostico_Primario: 'espa'
    };
    const restoreRow = {
        ...commonRow,
        ID_Paciente: 'SYN-T3-100',
        Fecha_Visita: '2026-09-21',
        Estado_Prebiologico_Analitica: 'SOLICITADA_PENDIENTE',
        Estado_Prebiologico_Medicina_Preventiva: 'OK'
    };
    const legacyRow = {
        ...commonRow,
        ID_Paciente: 'SYN-T3-200',
        Fecha_Visita: '2026-09-22',
        Estado_Prebiologico_Final: 'APTO',
        Fecha_Validacion_Prebiologico: '2026-09-10',
        Hemograma_Solicitado: 'SI',
        Hemograma_Recibido: 'SI',
        Hemograma_Correcto: 'SI',
        Bioquimica_Recibida: 'SI',
        Bioquimica_Correcta: 'SI',
        Serologias_Recibidas: 'SI',
        Serologias_Correctas: 'SI',
        IGRA_Mantoux_Recibido: 'SI',
        IGRA_Mantoux_Resultado: 'Negativo',
        Rx_Torax_Recibida: 'SI',
        Rx_Torax_Correcta: 'SI',
        Vacunacion_Revisada: 'SI',
        Vacunacion_OK: 'SI',
        Medicina_Preventiva_Derivada: 'SI',
        Vacunas_Pendientes: 'Ninguna'
    };
    const emptyRow = { ...commonRow, ID_Paciente: 'SYN-T3-300', Fecha_Visita: '2026-09-23' };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([restoreRow, legacyRow, emptyRow]), 'ESPA');
    for (const sheetName of ['APS', 'AR', 'LES', 'SJOGREN']) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ ID_Paciente: 'SYN-000-000' }]), sheetName);
    }
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
        { Nombre_Completo: 'Sintetico Profesional Uno', Cargo: 'Reumatologia' },
    ]), 'Profesionales');
    fs.writeFileSync(workbookPath, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

const server = createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'Content-Type': mime.get(path.extname(filePath)) || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

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

const BLOCK_SELECTS = ['estadoPrebiologicoAnalitica', 'estadoPrebiologicoMedicinaPreventiva'];
const EXPECTED_OPTIONS = ['', 'NO_SOLICITADA', 'SOLICITADA_PENDIENTE', 'OK'];
const LEGACY_DETAIL_IDS = [
    'estadoPrebiologicoFinal', 'fechaValidacionPrebiologico', 'profesionalValidador', 'decisionClinicaManual',
    'hemogramaSolicitado', 'bioquimicaSolicitada', 'serologiasSolicitadas',
    'igraMantouxSolicitado', 'rxToraxSolicitada', 'vacunacionRevisada', 'vacunacionOK',
    'medicinaPreventivaDerivada', 'vacunasPendientes'
];
const COLLECT_FN = { 'primera_visita.html': 'recopilarDatosFormulario', 'seguimiento.html': 'recopilarDatosFormularioSeguimiento' };

async function openPatientPage(browser, urlPath) {
    // Supported route: load the synthetic DB through the real session gate
    // (index.html) and then navigate THE SAME TAB to the target page, so the
    // per-tab sessionStorage DB cache is available exactly as in the real flow.
    const page = await browser.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'load', timeout: 45000 });
    await page.setInputFiles('#gateExcelInput', workbookPath);
    await page.waitForSelector('#gateStepSelect:not(.hidden)', { timeout: 20000 });
    const professional = await page.evaluate(() => {
        const select = document.getElementById('gateProfessionalSelect');
        return select ? Array.from(select.options).map((option) => option.value).find(Boolean) || '' : '';
    });
    await page.selectOption('#gateProfessionalSelect', professional);
    await page.click('#gateConfirmBtn');
    await page.waitForFunction(() => document.getElementById('sessionGate').classList.contains('hidden'), null, { timeout: 10000 });
    await page.goto(`${baseUrl}${urlPath}`, { waitUntil: 'domcontentloaded' });
    return { page, consoleErrors, pageErrors };
}

async function runCaptureSuite(browser, label, pagePath) {
    console.log(`\n=== ${label} (${pagePath}) ===`);
    const { page, consoleErrors, pageErrors } = await openPatientPage(browser, `/${pagePath}`);
    try {

        // P1 — contract inventory via supported collapsible interaction.
        const firstBlock = page.locator(`#${BLOCK_SELECTS[0]}`);
        const visible = await openAncestorCollapsibles(page, `#${BLOCK_SELECTS[0]}`);
        record(`${label}: la sección prebiológica es accesible por interacción soportada`, visible, 'no hit-testable');

        const inventory = await page.evaluate((ids) => ids.map((id) => {
            const select = document.getElementById(id);
            return { id, exists: !!select, tag: select ? select.tagName : null, options: select ? Array.from(select.options).map((o) => o.value) : null, value: select ? select.value : null };
        }), BLOCK_SELECTS);
        record(`${label}: los dos bloques existen con exactamente el estado vacío + los tres estados del contrato`,
            inventory.every((item) => item.exists && item.tag === 'SELECT' && JSON.stringify(item.options) === JSON.stringify(EXPECTED_OPTIONS) && item.value === ''),
            JSON.stringify(inventory));

        const legacy = await page.evaluate((ids) => ids.map((id) => ({ id, present: !!document.getElementById(id) })), LEGACY_DETAIL_IDS);
        record(`${label}: el estado global legacy y el detalle de pruebas ya no se muestran/capturan en el flujo principal`,
            legacy.every((item) => item.present === false), JSON.stringify(legacy));

        // M1 (#525) — #fechaDiagnostico must be absent from the page (RED at baseline).
        const fechaDiagPresent = await page.evaluate(() => !!document.getElementById('fechaDiagnostico'));
        record(`${label}: #fechaDiagnostico ausente de la página (bloque minimal #525)`,
            fechaDiagPresent === false, fechaDiagPresent ? 'fechaDiagnostico aún presente' : '');

        // M2 (#525) — the block exposes exactly one optional observacionesPrebiologico textarea.
        const obsInfo = await page.evaluate(() => {
            const nodes = Array.from(document.querySelectorAll('#observacionesPrebiologico'));
            const el = document.getElementById('observacionesPrebiologico');
            return {
                count: nodes.length,
                tag: el ? el.tagName : null,
                required: el ? !!el.required : null,
                hasAttr: el ? el.hasAttribute('required') : null
            };
        });
        record(`${label}: el bloque expone exactamente un textarea observacionesPrebiologico opcional`,
            obsInfo.count === 1 && obsInfo.tag === 'TEXTAREA' && obsInfo.required === false && obsInfo.hasAttr === false,
            JSON.stringify(obsInfo));

        // M3 (#525) — SUPPORTED interaction only: real collapsible click + real
        // typing; the synthetic string must be collected verbatim by the
        // supported collect API. No DOM mutation, no readonly tampering.
        const SYN_OBS_525 = 'SYN-525 nota sintética prebiológico';
        await openAncestorCollapsibles(page, '#observacionesPrebiologico');
        await page.fill('#observacionesPrebiologico', SYN_OBS_525);
        const obsCollected = await page.evaluate((fnName) => {
            const datos = HubTools.form[fnName]();
            return { value: datos.observacionesPrebiologico, hasKey: Object.prototype.hasOwnProperty.call(datos, 'observacionesPrebiologico') };
        }, COLLECT_FN[pagePath]);
        record(`${label}: Observaciones escrita por interacción soportada se recoge verbatim`,
            obsCollected.hasKey === true && obsCollected.value === SYN_OBS_525, JSON.stringify(obsCollected));

        // M4 (#525) — no APTO control/copy inside the prebiologic block.
        const aptoInBlock = await page.evaluate(() => {
            const sections = Array.from(document.querySelectorAll('.collapsible-section'));
            const block = sections.find((s) => {
                const header = s.querySelector('.collapsible-header');
                return header && header.textContent.includes('Estado prebiológico');
            });
            if (!block) return { found: false };
            return { found: true, hasApto: /\bAPTO\b/i.test(block.innerHTML) };
        });
        record(`${label}: sin APTO dentro del bloque prebiológico`,
            aptoInBlock.found === true && aptoInBlock.hasApto === false, JSON.stringify(aptoInBlock));

        // P2 — walk the three states of both blocks via supported selects.
        const walk = {};
        for (const state of ['NO_SOLICITADA', 'SOLICITADA_PENDIENTE', 'OK']) {
            await page.selectOption(`#${BLOCK_SELECTS[0]}`, state);
            await page.selectOption(`#${BLOCK_SELECTS[1]}`, state);
            const collected = await page.evaluate((fnName) => {
                const datos = HubTools.form[fnName]();
                return {
                    analitica: datos.estadoPrebiologicoAnalitica,
                    preventiva: datos.estadoPrebiologicoMedicinaPreventiva,
                    legacyLeak: ['estadoPrebiologicoFinal', 'hemogramaCorrecto', 'vacunacionOK'].some((k) => Object.prototype.hasOwnProperty.call(datos, k))
                };
            }, COLLECT_FN[pagePath]);
            walk[state] = collected;
            record(`${label}: estado '${state}' seleccionable en ambos bloques y reflejado verbatim por la colección soportada`,
                collected.analitica === state && collected.preventiva === state && !collected.legacyLeak, JSON.stringify(collected));
        }
        // Mixed explicit states are preserved independently (two independent blocks).
        await page.selectOption(`#${BLOCK_SELECTS[0]}`, 'OK');
        await page.selectOption(`#${BLOCK_SELECTS[1]}`, 'NO_SOLICITADA');
        const mixed = await page.evaluate((fnName) => {
            const datos = HubTools.form[fnName]();
            return { analitica: datos.estadoPrebiologicoAnalitica, preventiva: datos.estadoPrebiologicoMedicinaPreventiva };
        }, COLLECT_FN[pagePath]);
        record(`${label}: los bloques son independientes (OK / NO_SOLICITADA simultáneos, sin síntesis global)`,
            mixed.analitica === 'OK' && mixed.preventiva === 'NO_SOLICITADA', JSON.stringify(mixed));

        // P3 — supported navigation resets capture to the fail-safe empty state.
        await page.goto(`${baseUrl}/${pagePath}`, { waitUntil: 'domcontentloaded' });
        await openAncestorCollapsibles(page, `#${BLOCK_SELECTS[0]}`);
        const afterReload = await page.evaluate((ids) => ids.map((id) => {
            const select = document.getElementById(id);
            return select ? select.value : null;
        }), BLOCK_SELECTS);
        record(`${label}: la navegación soportada restaura el estado vacío fail-safe (sin persistencia fantasma)`,
            JSON.stringify(afterReload) === JSON.stringify(['', '']), JSON.stringify(afterReload));

        record(`${label}: console.error === 0`, consoleErrors.length === 0, JSON.stringify(consoleErrors));
        record(`${label}: pageerror === 0`, pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally {
        await page.close();
    }
}

async function runRestoreSuite(browser) {
    console.log('\n=== restauración (seguimiento.html?id=SYN-T3-100) ===');
    const { page, consoleErrors, pageErrors } = await openPatientPage(browser, '/seguimiento.html?id=SYN-T3-100');
    try {
        await openAncestorCollapsibles(page, `#${BLOCK_SELECTS[0]}`);
        await page.waitForFunction(() => document.getElementById('prebiologicBadgeContainer') && document.getElementById('prebiologicBadgeContainer').innerHTML.length > 0, null, { timeout: 15000 });

        const restored = await page.evaluate((ids) => ids.map((id) => {
            const select = document.getElementById(id);
            return select ? select.value : null;
        }), BLOCK_SELECTS);
        record('restauración: los estados explícitos de la visita se restauran en los bloques por ruta soportada',
            JSON.stringify(restored) === JSON.stringify(['SOLICITADA_PENDIENTE', 'OK']), JSON.stringify(restored));

        const badge = await page.evaluate(() => document.getElementById('prebiologicBadgeContainer').innerHTML);
        record('restauración: el badge muestra exactamente los estados explícitos por bloque',
            /Analítica: SOLICITADA PENDIENTE/.test(badge) && /Medicina Preventiva: OK/.test(badge) && !/APTO/.test(badge), badge);

        record('restauración: console.error === 0', consoleErrors.length === 0, JSON.stringify(consoleErrors));
        record('restauración: pageerror === 0', pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally {
        await page.close();
    }
}

async function runLegacySuite(browser) {
    console.log('\n=== caso legacy sin manipulación de DOM (seguimiento.html?id=SYN-T3-200) ===');
    const { page, consoleErrors, pageErrors } = await openPatientPage(browser, '/seguimiento.html?id=SYN-T3-200');
    try {
        await openAncestorCollapsibles(page, `#${BLOCK_SELECTS[0]}`);
        await page.waitForFunction(() => document.getElementById('prebiologicBadgeContainer') && document.getElementById('prebiologicBadgeContainer').innerHTML.length > 0, null, { timeout: 15000 });

        const blocks = await page.evaluate((ids) => ids.map((id) => {
            const select = document.getElementById(id);
            return select ? select.value : null;
        }), BLOCK_SELECTS);
        record('legacy: ningún bloque queda OK (ni otro estado) a partir del detalle legacy',
            JSON.stringify(blocks) === JSON.stringify(['', '']), JSON.stringify(blocks));

        const badge = await page.evaluate(() => document.getElementById('prebiologicBadgeContainer').innerHTML);
        record('legacy: el badge no fabrica OK ni muestra el APTO global legacy',
            !/\bOK\b/.test(badge) && !/APTO/.test(badge) && /sin estado/.test(badge), badge);

        const legacyRead = await page.evaluate(() => {
            const record = HubTools.data.getPatientHistory('SYN-T3-200');
            const visit = record && record.latestVisit;
            return {
                legacyState: visit ? (visit.Estado_Prebiologico_Final || '') : null,
                hemograma: visit ? (visit.Hemograma_Correcto || '') : null,
                vacunacion: visit ? (visit.Vacunacion_OK || '') : null
            };
        });
        record('legacy: el histórico persistido se conserva legible sin pérdida destructiva',
            legacyRead.legacyState === 'APTO' && legacyRead.hemograma === 'SI' && legacyRead.vacunacion === 'SI', JSON.stringify(legacyRead));

        record('legacy: console.error === 0', consoleErrors.length === 0, JSON.stringify(consoleErrors));
        record('legacy: pageerror === 0', pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally {
        await page.close();
    }
}

async function runEmptySuite(browser) {
    console.log('\n=== estado vacío / fail-safe (seguimiento.html sin paciente) ===');
    const { page, consoleErrors, pageErrors } = await openPatientPage(browser, '/seguimiento.html');
    try {
        await openAncestorCollapsibles(page, `#${BLOCK_SELECTS[0]}`);
        const empty = await page.evaluate((ids) => ids.map((id) => {
            const select = document.getElementById(id);
            return select ? select.value : null;
        }), BLOCK_SELECTS);
        record('sin paciente: los bloques permanecen vacíos (fail-safe, sin estado fabricado)',
            JSON.stringify(empty) === JSON.stringify(['', '']), JSON.stringify(empty));
        const badgeText = await page.evaluate(() => {
            const container = document.getElementById('prebiologicBadgeContainer');
            return container ? container.textContent : '';
        });
        record('sin paciente: sin badge con estados inventados', !/\bOK\b/.test(badgeText) && !/APTO/.test(badgeText), badgeText);
        record('sin paciente: console.error === 0', consoleErrors.length === 0, JSON.stringify(consoleErrors));
        record('sin paciente: pageerror === 0', pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally {
        await page.close();
    }
}

let browser;
try {
    browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
    await runCaptureSuite(browser, 'primera visita', 'primera_visita.html');
    await runCaptureSuite(browser, 'seguimiento', 'seguimiento.html');
    await runRestoreSuite(browser);
    await runLegacySuite(browser);
    await runEmptySuite(browser);
} finally {
    if (browser) await browser.close();
    server.close();
}

const passed = results.filter(Boolean).length;
console.log(`\nRESULTADO: ${passed} OK / ${results.length - passed} FALLIDO`);
process.exit(results.every(Boolean) ? 0 : 1);
