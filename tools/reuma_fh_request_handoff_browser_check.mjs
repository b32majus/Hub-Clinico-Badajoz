#!/usr/bin/env node
'use strict';
/**
 * Browser QA for the FH handoff two-state block (T2 of
 * TRAIN-NEXUS-REUMA-PHARMACY-REQUEST-SAFETY-14, GitHub #530, parent #528).
 *
 * Real Chromium (Playwright) qualification of primera_visita.html and
 * seguimiento.html over a served repository root. Every state change runs
 * through supported user-level interaction (real collapsible headers, real
 * <select> choices, real <input> fills, the real `Solicitud FH` button).
 * page.evaluate is used ONLY to READ observable state/artifact text (form
 * values, clipboard text, fallback modal text, console/page errors); it never
 * mutates the DOM, never sets readonly state, never fabricates fixtures.
 *
 * Journeys (synthetic data only):
 *   J1  Primera Visita, both block states explicit (OK / SOLICITADA_PENDIENTE):
 *       artifact carries exactly `Analítica: OK` + `Medicina Preventiva:
 *       SOLICITADA_PENDIENTE` and nothing else from the legacy block;
 *   J1b Primera Visita, exactly one state explicit (Analítica only): the
 *       explicit line is present, Medicina Preventiva is absent (no
 *       fabrication), legacy blacklist absent, no console/page error;
 *   J2  Primera Visita, both block states absent (empty default): no
 *       Analítica/Medicina Preventiva line, no fabricated state token;
 *   J3  Seguimiento (?id= synthetic patient), both explicit (NO_SOLICITADA /
 *       OK): artifact carries exactly those two lines;
 *   J3b Seguimiento (?id= synthetic patient), exactly one state explicit
 *       (Medicina Preventiva only): the explicit line is present, Analítica is
 *       absent (no fabrication), legacy blacklist absent, no console/page
 *       error;
 *   J4  Seguimiento (?id= synthetic patient), both absent: no state lines, no
 *       fabrication.
 *
 * Every journey presses the REAL `Solicitud FH` button and asserts the
 * generated/copied artifact text (clipboard read; fallback-modal read when
 * the clipboard path is unavailable), the legacy blacklist absence, the
 * preservation of the non-block clinical content (diagnóstico, actividad,
 * comorbilidades section, tratamiento, decisión), and zero console.error /
 * pageerror.
 *
 * Exit code 0 = PASS, 1 = FAIL.
 * Usage: node tools/reuma_fh_request_handoff_browser_check.mjs
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
            return createRequire(path.join(nodeModules, '__reuma_fh_handoff_loader.cjs'))('playwright');
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

const SYN_TREATMENT = 'Adalimumab (solicitado — pendiente de validación FH) 40 mg';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-fh-handoff-'));
const workbookPath = path.join(tempDir, 'reuma_fh_handoff_synthetic.xlsx');
{
    // Synthetic clinical DB. ESPA carries two follow-up patients; neither row
    // carries explicit new block-state columns (J3 sets both states through
    // the real UI selects; J4 leaves the empty default). Both rows carry an
    // explicit requested (not validated) treatment line.
    const commonRow = {
        Nombre_Paciente: 'Sintetico FH',
        Fecha_Visita: '2026-02-01',
        Tipo_Visita: 'Seguimiento',
        Diagnostico_Primario: 'espa',
        Tratamiento_Actual: SYN_TREATMENT
    };
    const rowJ3 = { ...commonRow, ID_Paciente: 'SYN-FH-300' };
    const rowJ4 = { ...commonRow, ID_Paciente: 'SYN-FH-400' };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([rowJ3, rowJ4]), 'ESPA');
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

// Legacy blacklist: must not appear anywhere in the outgoing artifact
// (case-insensitive), mirroring the frozen oracle E6 lists.
const BLACKLIST = [
    'ESTADO PREBIOLÓGICO / VACUNACIÓN',
    'Estado prebiológico:',
    'fecha validación',
    'Fuente de datos',
    'Observaciones prebiológico',
    'Hemograma',
    'Bioquímica',
    'Serologías',
    'IGRA',
    'Mantoux',
    'Rx tórax',
    'Vacunación revisada',
    'Vacunación OK',
    'Medicina preventiva derivada',
    'derivada',
    'Vacunas pendientes'
];
const STATE_LINE_RE = /^[-·•\s]*(Analítica|Medicina Preventiva)\s*:\s*(\S+)\s*$/;

function stateLinesOf(text) {
    return text.split('\n').map((l) => l.trim()).filter((l) => STATE_LINE_RE.test(l));
}
function blacklistHits(text) {
    const lower = text.toLowerCase();
    return BLACKLIST.filter((tok) => lower.includes(tok.toLowerCase()));
}

async function openPatientPage(browser, urlPath) {
    // Supported route: load the synthetic DB through the real session gate
    // (index.html) and then navigate THE SAME TAB to the target page, so the
    // per-tab sessionStorage DB cache is available exactly as in the real flow.
    // A fresh context per journey isolates session/permission state exactly
    // like the established browser-check pattern (one context per page).
    const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'load', timeout: 45000 });
    await page.waitForFunction(() => typeof window.HubTools !== 'undefined' && !!document.getElementById('gateExcelInput'), null, { timeout: 15000 });
    await page.setInputFiles('#gateExcelInput', workbookPath);
    try {
        await page.waitForSelector('#gateStepSelect:not(.hidden)', { timeout: 20000 });
    } catch (e) {
        // One supported retry: re-issue the upload in case the first input
        // event raced page readiness; then fail with observable gate state.
        await page.setInputFiles('#gateExcelInput', workbookPath);
        try {
            await page.waitForSelector('#gateStepSelect:not(.hidden)', { timeout: 20000 });
        } catch (e2) {
            const gateState = await page.evaluate(() => ({
                gateClass: document.getElementById('sessionGate')?.className ?? null,
                stepClass: document.getElementById('gateStepSelect')?.className ?? null,
                hubTools: typeof window.HubTools !== 'undefined'
            }));
            throw new Error('gate sin avanzar tras reintento: ' + JSON.stringify(gateState));
        }
    }
    const professional = await page.evaluate(() => {
        const select = document.getElementById('gateProfessionalSelect');
        return select ? Array.from(select.options).map((option) => option.value).find(Boolean) || '' : '';
    });
    await page.selectOption('#gateProfessionalSelect', professional);
    await page.click('#gateConfirmBtn');
    await page.waitForFunction(() => document.getElementById('sessionGate').classList.contains('hidden'), null, { timeout: 10000 });
    await page.goto(`${baseUrl}${urlPath}`, { waitUntil: 'domcontentloaded' });
    return { page, context, consoleErrors, pageErrors };
}

async function fillClinicalBase(page, label, cip, isSeguimiento) {
    // Supported interaction only: real fills / real select choices. In
    // seguimiento #idPaciente is readonly (prefilled from the ?id= route), so
    // it is only READ and verified — never written.
    if (isSeguimiento) {
        const prefilled = await page.evaluate(() => document.getElementById('idPaciente')?.value ?? '');
        record(`${label}: CIP pre-rellenado por ruta soportada ?id=`, prefilled === cip, JSON.stringify(prefilled));
    } else {
        await openAncestorCollapsibles(page, '#idPaciente');
        await page.fill('#idPaciente', cip);
    }
    await page.fill('#fechaVisita', '2026-02-10');
    await page.selectOption('#diagnosticoPrimario', 'espa');
    await openAncestorCollapsibles(page, '#diagnosticoSecundario');
    await page.fill('#diagnosticoSecundario', 'Lumbalgia inflamatoria sintética');
    await openAncestorCollapsibles(page, '#pcrValue');
    await page.fill('#pcrValue', '8');
    await openAncestorCollapsibles(page, '#evaGlobal');
    await page.fill('#evaGlobal', '6');
}

async function setBlockStates(page, analitica, preventiva) {
    // Supported interaction only: real <select> choices (empty string = leave
    // the fail-safe "-- Sin estado --" default untouched).
    await openAncestorCollapsibles(page, '#estadoPrebiologicoAnalitica');
    if (analitica) await page.selectOption('#estadoPrebiologicoAnalitica', analitica);
    if (preventiva) await page.selectOption('#estadoPrebiologicoMedicinaPreventiva', preventiva);
    return page.evaluate(() => ({
        analitica: document.getElementById('estadoPrebiologicoAnalitica')?.value ?? null,
        preventiva: document.getElementById('estadoPrebiologicoMedicinaPreventiva')?.value ?? null
    }));
}

async function pressSolicitudFHAndReadArtifact(page) {
    // Press the REAL Solicitud FH button (supported interaction), then READ the
    // produced artifact: clipboard text when the copy path succeeds, otherwise
    // the fallback manual-copy modal text. Both reads are observable state.
    const clickable = await openAncestorCollapsibles(page, '#btnSolicitudFH');
    if (!clickable) return { artifact: '', via: 'button-not-clickable' };
    await page.click('#btnSolicitudFH');
    await page.waitForTimeout(1500);
    let via = 'clipboard';
    let artifact = '';
    try {
        artifact = await page.evaluate(() => navigator.clipboard.readText());
    } catch (e) {
        artifact = '';
    }
    if (!artifact) {
        via = 'modal';
        artifact = await page.evaluate(() => {
            const t = document.getElementById('textoModalTextarea');
            return t ? t.value : '';
        });
    }
    return { artifact: artifact || '', via };
}

function excerptPrebio(artifact) {
    const lines = artifact.split('\n').filter((l) => /Analítica|Medicina Preventiva|PREBIOLÓ|prebiológico|Fuente de datos/i.test(l));
    return lines.length ? lines.join(' | ') : '(sin líneas prebiológicas en el artefacto)';
}

async function assertCommonPreservation(label, artifact) {
    record(`${label}: sección DIAGNÓSTICO preservada (espa + secundario sintético)`,
        artifact.includes('DIAGNÓSTICO') && artifact.includes('espa') && artifact.includes('Lumbalgia inflamatoria sintética'),
        artifact.slice(0, 600));
    record(`${label}: actividad preservada (PCR + EVA Global)`,
        artifact.includes('- PCR: 8 mg/L') && artifact.includes('- EVA Global: 6'),
        artifact.slice(0, 1200));
    record(`${label}: sección COMORBILIDADES preservada`,
        artifact.includes('COMORBILIDADES ACTIVAS'), 'sección ausente');
    record(`${label}: sección TRATAMIENTO preservada`,
        artifact.includes('TRATAMIENTO ACTUAL'), 'sección ausente');
    record(`${label}: decisión preservada sin inferencia (Mantener, sin START/SWITCH/ADD_ON)`,
        artifact.includes('DECISIÓN TERAPÉUTICA') && artifact.includes('Mantener tratamiento actual') &&
        !artifact.includes('START') && !artifact.includes('SWITCH') && !artifact.includes('ADD_ON'),
        artifact.slice(0, 2000));
}

async function assertBlacklist(label, artifact) {
    const hits = blacklistHits(artifact);
    record(`${label}: lista negativa legacy ausente del artefacto`, hits.length === 0, JSON.stringify(hits));
    record(`${label}: sin APTO propagado`, !/\bAPTO\b/i.test(artifact), 'APTO presente');
    record(`${label}: sin ND aislado fabricado`, !/\bND\b/.test(artifact), 'ND presente');
}

async function runJourney(browser, label, urlPath, cip, analitica, preventiva, expectLines) {
    console.log(`\n=== ${label} (${urlPath}) ===`);
    const { page, context, consoleErrors, pageErrors } = await openPatientPage(browser, urlPath);
    try {
        if (urlPath.startsWith('/seguimiento.html?id=')) {
            await page.waitForFunction(() => {
                const el = document.getElementById('idPaciente');
                return el && el.value;
            }, null, { timeout: 15000 });
        }
        await fillClinicalBase(page, label, cip, urlPath.startsWith('/seguimiento.html'));
        const selected = await setBlockStates(page, analitica, preventiva);
        record(`${label}: selects reales reflejan lo elegido`, selected.analitica === (analitica || '') && selected.preventiva === (preventiva || ''), JSON.stringify(selected));

        const { artifact, via } = await pressSolicitudFHAndReadArtifact(page);
        record(`${label}: el botón real Solicitud FH produce artefacto (vía ${via})`, artifact.length > 50, `longitud=${artifact.length} vía=${via}`);
        console.log(`    excerpt prebiológico: ${excerptPrebio(artifact)}`);

        const lines = stateLinesOf(artifact);
        if (expectLines === null) {
            record(`${label}: ningún estado fabricado desde ausencia`, lines.length === 0 && !/(Analítica|Medicina Preventiva)\s*:/.test(artifact), JSON.stringify(lines));
            record(`${label}: ningún token OK en el artefacto desde ausencia`, !/\bOK\b/.test(artifact), 'OK presente');
        } else {
            const missing = expectLines.filter((exp) => !artifact.includes(exp));
            record(`${label}: emite exactamente ${JSON.stringify(expectLines)}`, missing.length === 0 && lines.length === expectLines.length, `faltan=${JSON.stringify(missing)} líneas=${JSON.stringify(lines)}`);
        }
        if (Array.isArray(expectLines) && expectLines.length === 1) {
            // Exactly-one-absent journey (F2): the complementary state must not
            // be fabricated anywhere in the artifact.
            const absentLabel = expectLines[0].startsWith('Analítica') ? 'Medicina Preventiva' : 'Analítica';
            record(`${label}: el estado ausente (${absentLabel}) no se fabrica`, !new RegExp(`${absentLabel}\\s*:`).test(artifact), excerptPrebio(artifact));
        }

        await assertBlacklist(label, artifact);
        await assertCommonPreservation(label, artifact);

        // Tratamiento: ningún recorrido introduce un fármaco por una vía
        // soportada que llegue al recolector (los desplegables de plan/cambio
        // se pueblan desde el catálogo y #tratamientoActual de seguimiento es
        // sólo lectura informativa no recogida por
        // recopilarDatosFormularioSeguimiento — cableado preexistente fuera de
        // alcance). Se afirma la sección preservada sin nada fabricado.
        record(`${label}: tratamiento sin fabricar (sección preservada, placeholder fail-safe)`,
            artifact.includes('TRATAMIENTO ACTUAL') && artifact.includes('(Sin tratamiento activo registrado)'),
            artifact.slice(0, 2000));

        record(`${label}: console.error === 0`, consoleErrors.length === 0, JSON.stringify(consoleErrors));
        record(`${label}: pageerror === 0`, pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally {
        await page.close();
        await context.close();
    }
}

let browser;
try {
    browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
    await runJourney(browser, 'J1 primera visita ambos explícitos', '/primera_visita.html', 'CIP-SYN-FH-J1', 'OK', 'SOLICITADA_PENDIENTE', ['Analítica: OK', 'Medicina Preventiva: SOLICITADA_PENDIENTE']);
    await runJourney(browser, 'J1b primera visita sólo Analítica explícita (Medicina Preventiva ausente)', '/primera_visita.html', 'CIP-SYN-FH-J1B', 'OK', '', ['Analítica: OK']);
    await runJourney(browser, 'J2 primera visita ambos ausentes', '/primera_visita.html', 'CIP-SYN-FH-J2', '', '', null);
    await runJourney(browser, 'J3 seguimiento ambos explícitos', '/seguimiento.html?id=SYN-FH-300', 'SYN-FH-300', 'NO_SOLICITADA', 'OK', ['Analítica: NO_SOLICITADA', 'Medicina Preventiva: OK']);
    await runJourney(browser, 'J3b seguimiento sólo Medicina Preventiva explícita (Analítica ausente)', '/seguimiento.html?id=SYN-FH-300', 'SYN-FH-300', '', 'OK', ['Medicina Preventiva: OK']);
    await runJourney(browser, 'J4 seguimiento ambos ausentes', '/seguimiento.html?id=SYN-FH-400', 'SYN-FH-400', '', '', null);
} finally {
    if (browser) await browser.close();
    server.close();
}

const passed = results.filter(Boolean).length;
console.log(`\nRESULTADO: ${passed} OK / ${results.length - passed} FALLIDO`);
process.exit(results.every(Boolean) ? 0 : 1);
