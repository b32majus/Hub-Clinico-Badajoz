#!/usr/bin/env node
'use strict';
/**
 * Dashboard browser QA for the FH handoff two-state block (closeout of
 * TRAIN-NEXUS-REUMA-PHARMACY-REQUEST-SAFETY-14, GitHub #531, parent #528).
 *
 * Real Chromium (Playwright) qualification of the THIRD supported surface,
 * dashboard_paciente.html, over a served repository root. Every journey runs
 * through the supported user-level route with no DOM injection, no readonly
 * tampering and no impossible states:
 *   1. open index.html and upload the synthetic workbook through the real
 *      gate #gateExcelInput, choose the real professional, confirm;
 *   2. navigate THE SAME TAB to dashboard_paciente.html?id=<synthetic ID> so
 *      the per-tab sessionStorage DB cache is available exactly as in the
 *      real flow (loadPatientBundle -> ReumaPatientReadPort.readPatientBundle
 *      -> HubTools.data.findPatientById / getPatientHistory ->
 *      HubTools.normalizer.normalizeRecord, which spreads the raw workbook
 *      row, so explicit Estado_Prebiologico_* columns survive to the handoff);
 *   3. wait for the dashboard bundle to load through the read port
 *      (window.patientSummary observable read only);
 *   4. press the REAL #btnSolicitudFH button
 *      (dashboard_paciente.html -> scripts/script_dashboard.js
 *      attachDashboardActions -> HubTools.pharmacy.copyRequestToClipboard ->
 *      shared generateRequestText/getPrebiologicBlock generator);
 *   5. READ the produced artifact (clipboard text, else fallback modal
 *      textarea) and assert on that text.
 * page.evaluate is used ONLY to READ observable state/artifact text; it never
 * mutates the DOM, never sets readonly state, never fabricates fixtures.
 *
 * Synthetic data only (SYN-DASH-* IDs). The workbook is built in a temp dir
 * exactly like tools/reuma_fh_request_handoff_browser_check.mjs does
 * (ESPA/APS/AR/LES/SJOGREN/Profesionales sheets). Block states are prepared
 * in the synthetic rows themselves (data preparation, not DOM fabrication):
 *   D1  both explicit: Estado_Prebiologico_Analitica = OK and
 *       Estado_Prebiologico_Medicina_Preventiva = SOLICITADA_PENDIENTE.
 *       Artifact carries exactly those two state lines and nothing else;
 *   D2  exactly one explicit: Estado_Prebiologico_Analitica = OK only; the
 *       Medicina Preventiva column is ABSENT (not empty-token, absent). The
 *       explicit line is present, the complementary state is absent and never
 *       fabricated anywhere in the artifact;
 *   D3  both absent: neither column present. No Analitica/Medicina Preventiva
 *       line, no state token fabricated from absence.
 *
 * Every journey additionally asserts the legacy blacklist absence, the
 * preservation of the unrelated explicit clinical content the dashboard route
 * really carries (diagnostico primario/secundario, actividad PCR/EVA,
 * comorbilidades, Tratamiento_Actual verbatim; requested != validated, no
 * START/SWITCH/ADD_ON, no validado token), and zero console.error /
 * pageerror. Sections the dashboard data does not provide (e.g. decision
 * block) are never asserted into existence.
 *
 * Exit code 0 = PASS, 1 = FAIL.
 * Usage: node tools/reuma_fh_request_handoff_dashboard_browser_check.mjs
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
            return createRequire(path.join(nodeModules, '__reuma_fh_dashboard_loader.cjs'))('playwright');
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

const SYN_TREATMENT = 'Adalimumab (solicitado pendiente FH) 40 mg';
const SYN_DIAG_SEC = 'Lumbalgia inflamatoria sintetica';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-fh-dashboard-'));
const workbookPath = path.join(tempDir, 'reuma_fh_dashboard_synthetic.xlsx');
{
    // Synthetic clinical DB. Block states live in the rows themselves (data
    // preparation, not DOM fabrication); the other column must be ABSENT
    // (not empty-token) for the exactly-one-absent journey. Every row carries
    // the unrelated explicit clinical content the dashboard route can carry:
    // Diagnostico_Secundario, PCR, EVA_Global, comorbilidades and an explicit
    // requested (not validated) Tratamiento_Actual line.
    const commonRow = {
        Nombre_Paciente: 'Sintetico Dash',
        Fecha_Visita: '2026-02-01',
        Tipo_Visita: 'Seguimiento',
        Diagnostico_Principal: 'espa',
        Diagnostico_Secundario: SYN_DIAG_SEC,
        PCR: '8',
        EVA_Global: '6',
        comorbilidades: 'hta',
        Tratamiento_Actual: SYN_TREATMENT
    };
    const rowD1 = {
        ...commonRow,
        ID_Paciente: 'SYN-DASH-D1',
        Estado_Prebiologico_Analitica: 'OK',
        Estado_Prebiologico_Medicina_Preventiva: 'SOLICITADA_PENDIENTE'
    };
    const rowD2 = { ...commonRow, ID_Paciente: 'SYN-DASH-D2', Estado_Prebiologico_Analitica: 'OK' };
    const rowD3 = { ...commonRow, ID_Paciente: 'SYN-DASH-D3' };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([rowD1, rowD2, rowD3]), 'ESPA');
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

// Legacy blacklist: must not appear anywhere in the outgoing artifact
// (case-insensitive). It mirrors the frozen oracle E6 lists plus the
// `Notas clínico` term that issue #531 §6 requires absent; the coverage
// assertion below fails if any #531 §6 concept loses its BLACKLIST token.
const BLACKLIST = [
    'ESTADO PREBIOLÓGICO / VACUNACIÓN',
    'Estado prebiológico:',
    'fecha validación',
    'Fuente de datos',
    'Notas clínico',
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

// ---------- #531 §6 blacklist coverage (deterministic closure) ----------
// Literal requirement from issue #531 §QA item 6: the outgoing artifact must
// not carry legacy global state, validation date, source, `Notas clínico`,
// prebiologic observations, haemogram, biochemistry, serologies,
// IGRA/Mantoux, chest X-ray, vaccination, referral nor pending vaccines.
// Each §6 concept is mapped to the BLACKLIST token(s) that enforce it; the
// assertion fails if any required token is dropped, and proves blacklistHits
// (the very matcher used on the real artifacts) detects every required term.
const ISSUE_531_6_REQUIRED = {
    'estado global legacy': ['ESTADO PREBIOLÓGICO / VACUNACIÓN', 'Estado prebiológico:'],
    'fecha validación': ['fecha validación'],
    'fuente': ['Fuente de datos'],
    'Notas clínico': ['Notas clínico'],
    'Observaciones prebiológico': ['Observaciones prebiológico'],
    'hemograma': ['Hemograma'],
    'bioquímica': ['Bioquímica'],
    'serologías': ['Serologías'],
    'IGRA/Mantoux': ['IGRA', 'Mantoux'],
    'Rx tórax': ['Rx tórax'],
    'vacunación': ['Vacunación revisada', 'Vacunación OK'],
    'derivación': ['Medicina preventiva derivada', 'derivada'],
    'vacunas pendientes': ['Vacunas pendientes'],
};
function assertBlacklistCoverage() {
    const missing = [];
    const notCaught = [];
    for (const [concept, tokens] of Object.entries(ISSUE_531_6_REQUIRED)) {
        for (const token of tokens) {
            if (!BLACKLIST.some((entry) => entry.toLowerCase() === token.toLowerCase())) {
                missing.push(`${concept} => ${token}`);
            }
            if (blacklistHits(token).length === 0) {
                notCaught.push(`${concept} => ${token}`);
            }
        }
    }
    record(`#531 §6: BLACKLIST cubre los ${Object.keys(ISSUE_531_6_REQUIRED).length} conceptos exigidos`,
        missing.length === 0, `sin cubrir=${JSON.stringify(missing)}`);
    record('#531 §6: blacklistHits detecta todo término exigido (incluido Notas clínico)',
        notCaught.length === 0, `no detectados=${JSON.stringify(notCaught)}`);
}
assertBlacklistCoverage();

async function openDashboardPage(browser, patientId) {
    // Supported route: load the synthetic DB through the real session gate
    // (index.html) and then navigate THE SAME TAB to dashboard_paciente.html,
    // so the per-tab sessionStorage DB cache is available exactly as in the
    // real flow. A fresh context per journey isolates session/permission state
    // exactly like the established browser-check pattern (one context per
    // page).
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
    await page.goto(`${baseUrl}/dashboard_paciente.html?id=${encodeURIComponent(patientId)}`, { waitUntil: 'domcontentloaded' });
    return { page, context, consoleErrors, pageErrors };
}

async function pressSolicitudFHAndReadArtifact(page) {
    // Press the REAL Solicitud FH button (supported interaction), then READ
    // the produced artifact: clipboard text when the copy path succeeds,
    // otherwise the fallback manual-copy modal text. Both reads are observable
    // state. The button lives in the dashboard header (no collapsible
    // ancestors); only a visibility read guards the click.
    const clickable = await isReallyHitTestable(page, '#btnSolicitudFH');
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

async function assertCommonPreservation(label, artifact, patientId) {
    record(`${label}: cabecera con CIP y paciente sintético`,
        artifact.includes(`CIP: ${patientId}`) && artifact.includes('Paciente: Sintetico Dash'),
        artifact.slice(0, 400));
    record(`${label}: sección DIAGNÓSTICO preservada (espa + secundario sintético)`,
        artifact.includes('DIAGNÓSTICO') && artifact.includes('espa') && artifact.includes(SYN_DIAG_SEC),
        artifact.slice(0, 600));
    record(`${label}: actividad preservada (PCR + EVA Global)`,
        artifact.includes('- PCR: 8 mg/L') && artifact.includes('- EVA Global: 6'),
        artifact.slice(0, 1200));
    record(`${label}: comorbilidad explícita preservada (HTA)`,
        artifact.includes('COMORBILIDADES ACTIVAS') && artifact.includes('- HTA'),
        artifact.slice(0, 1600));
    record(`${label}: tratamiento solicitado preservado verbatim`,
        artifact.includes('TRATAMIENTO ACTUAL') && artifact.includes(`- ${SYN_TREATMENT}`),
        artifact.slice(0, 2000));
    record(`${label}: solicitado != validado (sin START/SWITCH/ADD_ON, sin token validado)`,
        !artifact.includes('START') && !artifact.includes('SWITCH') && !artifact.includes('ADD_ON') &&
        !/\bvalidado\b/i.test(artifact),
        artifact.slice(0, 2000));
}

async function assertBlacklist(label, artifact) {
    const hits = blacklistHits(artifact);
    record(`${label}: lista negativa legacy ausente del artefacto`, hits.length === 0, JSON.stringify(hits));
    record(`${label}: sin APTO aislado propagado`, !/\bAPTO\b/.test(artifact), 'APTO presente');
    record(`${label}: sin ND aislado fabricado`, !/\bND\b/.test(artifact), 'ND presente');
}

async function runJourney(browser, label, patientId, expectLines) {
    console.log(`\n=== ${label} (dashboard_paciente.html?id=${patientId}) ===`);
    const { page, context, consoleErrors, pageErrors } = await openDashboardPage(browser, patientId);
    try {
        // Wait for the dashboard bundle to load through the read port (read
        // of observable state only; never evaluated/mutated to inject state).
        await page.waitForFunction(() => !!window.patientSummary && !!window.patientSummary.idPaciente, null, { timeout: 15000 });
        const summaryId = await page.evaluate(() => window.patientSummary && window.patientSummary.idPaciente);
        record(`${label}: bundle del dashboard cargado por ruta soportada (?id=)`, summaryId === patientId, JSON.stringify(summaryId));

        const { artifact, via } = await pressSolicitudFHAndReadArtifact(page);
        record(`${label}: el botón real Solicitud FH produce artefacto (vía ${via})`, artifact.length > 50, `longitud=${artifact.length} vía=${via}`);
        console.log(`    excerpt prebiológico: ${excerptPrebio(artifact)}`);

        const lines = stateLinesOf(artifact);
        if (expectLines === null) {
            record(`${label}: ningún estado fabricado desde ausencia`, lines.length === 0 && !/(Analítica|Medicina Preventiva)\s*:/.test(artifact), JSON.stringify(lines));
            record(`${label}: ningún token de estado fabricado desde ausencia (OK/NO_SOLICITADA/SOLICITADA_PENDIENTE/APTO/ND)`,
                !/\bOK\b/.test(artifact) && !/NO_SOLICITADA/.test(artifact) && !/SOLICITADA_PENDIENTE/.test(artifact) &&
                !/\bAPTO\b/.test(artifact) && !/\bND\b/.test(artifact),
                excerptPrebio(artifact));
        } else {
            const missing = expectLines.filter((exp) => !artifact.includes(exp));
            record(`${label}: emite exactamente ${JSON.stringify(expectLines)}`, missing.length === 0 && lines.length === expectLines.length, `faltan=${JSON.stringify(missing)} líneas=${JSON.stringify(lines)}`);
        }
        if (Array.isArray(expectLines) && expectLines.length === 1) {
            // Exactly-one-absent journey (D2): the complementary state must
            // not be fabricated anywhere in the artifact.
            const absentLabel = expectLines[0].startsWith('Analítica') ? 'Medicina Preventiva' : 'Analítica';
            record(`${label}: el estado ausente (${absentLabel}) no se fabrica`, !new RegExp(`${absentLabel}\\s*:`).test(artifact), excerptPrebio(artifact));
        }

        await assertBlacklist(label, artifact);
        await assertCommonPreservation(label, artifact, patientId);

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
    await runJourney(browser, 'D1 dashboard ambos explícitos', 'SYN-DASH-D1', ['Analítica: OK', 'Medicina Preventiva: SOLICITADA_PENDIENTE']);
    await runJourney(browser, 'D2 dashboard sólo Analítica explícita (Medicina Preventiva ausente)', 'SYN-DASH-D2', ['Analítica: OK']);
    await runJourney(browser, 'D3 dashboard ambos ausentes', 'SYN-DASH-D3', null);
} finally {
    if (browser) await browser.close();
    server.close();
}

const passed = results.filter(Boolean).length;
console.log(`\nRESULTADO: ${passed} OK / ${results.length - passed} FALLIDO`);
process.exit(results.every(Boolean) ? 0 : 1);
