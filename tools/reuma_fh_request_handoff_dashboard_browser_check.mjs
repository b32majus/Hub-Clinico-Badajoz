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
 *   1. open reuma_index.html and upload the synthetic workbook through the real
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
 *   6. D4 only: press Exportar visitas to witness its download listener, then
 *      the real Seguimiento link and read the same patient's populated form.
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
 * D1–D4 additionally assert the legacy blacklist absence, the
 * preservation of the unrelated explicit clinical content the dashboard route
 * really carries (diagnostico primario/secundario, actividad PCR/EVA,
 * comorbilidades, Tratamiento_Actual verbatim; requested != validated, no
 * START/SWITCH/ADD_ON, no validado token), and zero console.error /
 * pageerror. Sections the dashboard data does not provide (e.g. decision
 * block) are never asserted into existence.
 *
 * D5 (Train24) qualifies only real import of two baseline Seguimientos,
 * dashboard preservation, absence of fabricated biologic_start annotations,
 * chart selector/comparison interaction and Dashboard → Seguimiento continuity.
 * D5 (Train 25) additionally qualifies the real Solicitud FH artifact for the
 * baseline-plan route (previously out of qualification because the Biologico
 * plan was printed as TRATAMIENTO ACTUAL): pressing the real #btnSolicitudFH
 * and reading the real artifact must show the explicit Tratamiento_Actual
 * verbatim inside TRATAMIENTO ACTUAL, the Biologico plan preserved outside
 * that block (separated provenance), no invented state/claim tokens and the
 * legacy blacklist absent.
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
const SYN_PLAN_DRUG = 'Biologico sintetico X';
// Train 25 corrector F1 witness drug: synthetic, distinct from SYN_PLAN_DRUG,
// free of the forbidden claim tokens.
const SYN_PLAN_SAME = 'Biologico sintetico Y';
// Train 27 witness drug: accredited actual with an explicit start date,
// synthetic and free of the forbidden claim tokens.
const SYN_DATED_ACTUAL = 'Tratamiento sintetico acreditado Z';
// Train 27 date-provenance witness drug: accredited physical actual whose
// start date exists ONLY as the camelCase `fechaInicioTratamiento` alias key
// (unproven provenance; no physical Fecha_Inicio_Tratamiento value).
// Synthetic and free of the forbidden claim tokens.
const SYN_ALIAS_DATED_ACTUAL = 'Farmaco sintetico alias V';
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
    const rowD4 = { ...commonRow, ID_Paciente: 'SYN-DASH-D4', FR: 2 };
    // D5 uses the supported Biologico TEXT fallback, not a JSON array cell.
    // Two physical rows carry the same plan and explicit chart measurements.
    const rowD5Baseline = {
        ...commonRow, ID_Paciente: 'SYN-DASH-D5', Fecha_Visita: '2026-01-10',
        Biologico: 'Biologico sintetico X', BASDAI: 3.5
    };
    const rowD5FollowUp = { ...rowD5Baseline, Fecha_Visita: '2026-03-10', BASDAI: 3 };
    // Train 25 corrector witnesses (F1). SYN_PLAN_SAME is a synthetic plan
    // drug free of the forbidden claim tokens.
    // D6 (plan-only): ONLY the physical Biologico plan column; the explicit
    // Tratamiento_Actual column is ABSENT — the artifact must NOT present the
    // plan as active treatment and must keep the honest placeholder.
    const rowF1PlanOnly = {
        Nombre_Paciente: 'Sintetico Dash',
        Fecha_Visita: '2026-02-01',
        Tipo_Visita: 'Seguimiento',
        Diagnostico_Principal: 'espa',
        Diagnostico_Secundario: SYN_DIAG_SEC,
        PCR: '8',
        EVA_Global: '6',
        comorbilidades: 'hta',
        ID_Paciente: 'SYN-DASH-D6',
        Biologico: SYN_PLAN_SAME
    };
    // D7 (two explicit physical sources with the SAME text): the explicit
    // Tratamiento_Actual column and the Biologico plan column carry the same
    // string; both facts must survive under their own differentiated
    // provenance (same name != same clinical fact, no text-based dedupe).
    const rowF1SameText = {
        ...commonRow,
        ID_Paciente: 'SYN-DASH-D7',
        Tratamiento_Actual: SYN_PLAN_SAME,
        Biologico: SYN_PLAN_SAME
    };
    // Train 27 witnesses (dashboard treatment truth). Synthetic rows, data
    // preparation like every other journey (no DOM fabrication).
    // D8 (accredited actual + explicit start): the physical
    // Tratamiento_Actual column AND an explicit Fecha_Inicio_Tratamiento
    // column are both present on the single row.
    const rowDatedActual = {
        ...commonRow,
        ID_Paciente: 'SYN-DASH-D8',
        Tratamiento_Actual: SYN_DATED_ACTUAL,
        Fecha_Inicio_Tratamiento: '2026-01-15'
    };
    // D9 (literal 'No'): physical Tratamiento_Actual is literally 'No'
    // with a plan column present; 'No' is the recorded value (not
    // absence) and the plan must never be substituted for it. The negated
    // actual keeps 'No' but never reads as active (card without
    // date/duration, KPI status 'Sin tratamiento activo').
    const rowLiteralNo = {
        ...commonRow,
        ID_Paciente: 'SYN-DASH-D9',
        Tratamiento_Actual: 'No',
        Biologico: SYN_PLAN_SAME
    };
    // D11 (contradictory date on a negated actual): physical
    // Tratamiento_Actual is literally 'No' AND a physical
    // Fecha_Inicio_Tratamiento value is present on the same row. The
    // negated actual is authoritative: the contradictory date must never
    // accredit a start date, a duration nor a 'Desde ...' status.
    const rowNegatedWithDate = {
        ...commonRow,
        ID_Paciente: 'SYN-DASH-D11',
        Tratamiento_Actual: 'No',
        Fecha_Inicio_Tratamiento: '2026-03-05'
    };
    // D10 (date provenance): the physical Tratamiento_Actual column is
    // present, but the start date exists ONLY as the camelCase
    // `fechaInicioTratamiento` alias key — there is NO physical
    // Fecha_Inicio_Tratamiento value on the row. The alias must not
    // accredit a start date.
    const rowAliasOnlyDate = {
        ...commonRow,
        ID_Paciente: 'SYN-DASH-D10',
        Tratamiento_Actual: SYN_ALIAS_DATED_ACTUAL,
        fechaInicioTratamiento: '2026-02-20'
    };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
        rowD1, rowD2, rowD3, rowD4, rowD5Baseline, rowD5FollowUp, rowF1PlanOnly, rowF1SameText,
        rowDatedActual, rowLiteralNo, rowAliasOnlyDate, rowNegatedWithDate
    ]), 'ESPA');
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
// Structural paragraph parse of the TRATAMIENTO ACTUAL section (fixed
// artifact order: the paragraph that starts at the header line, ended by the
// next blank-line-separated paragraph). Never derived from plan label
// wording (Train 25 witness discipline).
function extractTreatmentBlock(text) {
    const lines = text.split('\n');
    const start = lines.findIndex((l) => l.trim() === 'TRATAMIENTO ACTUAL');
    if (start === -1) return null;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
        if (lines[i].trim() === '' && i + 1 < lines.length && lines[i + 1].trim() !== '') { end = i; break; }
    }
    return lines.slice(start, end).join('\n');
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
    // (reuma_index.html) and then navigate THE SAME TAB to dashboard_paciente.html,
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
    await page.goto(`${baseUrl}/reuma_index.html`, { waitUntil: 'load', timeout: 45000 });
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

        if (patientId === 'SYN-DASH-D4') {
            const dashboard = await page.evaluate(() => {
                const visible = (selector) => {
                    const el = document.querySelector(selector);
                    return !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
                };
                const biomarker = document.getElementById('biomarkerFr');
                return {
                    dashboardVisible: visible('#dashboardContent'),
                    biomarker: biomarker?.textContent.trim() ?? null,
                    biomarkerClass: biomarker?.className ?? '',
                    regionsVisible: [
                        '#patientKpis', '.dashboard-card--clinical', '.dashboard-card--biomarkers',
                        '.dashboard-card--summary', '.dashboard-card--treatment',
                        '.dashboard-card--history', '.dashboard-card--events',
                        '.dashboard-card--chart', '#visitsTable'
                    ].every(visible),
                    chartRegionVisible: visible('.dashboard-card--chart'),
                    nextActionsPresent: ['#btnSolicitudFH', '#btnSeguimiento', '#exportVisitsBtn'].every(visible)
                };
            });
            record(`${label}: pantalla principal completa visible`, dashboard.dashboardVisible && dashboard.regionsVisible, JSON.stringify(dashboard));
            record(`${label}: FR numérico explícito 2 como texto neutral/unknown, sin veredicto clínico`,
                dashboard.biomarker === '2' && dashboard.biomarkerClass.split(/\s+/).includes('unknown') &&
                !dashboard.biomarkerClass.split(/\s+/).some((name) => ['positive', 'negative'].includes(name)),
                JSON.stringify(dashboard));
            record(`${label}: región de gráficas y acciones siguientes disponibles`, dashboard.chartRegionVisible && dashboard.nextActionsPresent, JSON.stringify(dashboard));

            const formattedValues = await page.evaluate(() => ({
                zero: window.formatBiomarker(0),
                nullValue: window.formatBiomarker(null),
                undefinedValue: window.formatBiomarker(undefined),
                empty: window.formatBiomarker(''),
                positive: window.formatBiomarker('Positivo'),
                negative: window.formatBiomarker('Negativo')
            }));
            record(`${label}: negativos de formato (0 literal; ausencia; Positivo/Negativo)`,
                formattedValues.zero === '0' && formattedValues.nullValue === 'No analizado' &&
                formattedValues.undefinedValue === 'No analizado' && formattedValues.empty === 'No analizado' &&
                formattedValues.positive === 'Positivo' && formattedValues.negative === 'Negativo',
                JSON.stringify(formattedValues));
            const absentTokens = await page.evaluate(() => ({
                nan: window.formatBiomarker(NaN),
                falseValue: window.formatBiomarker(false)
            }));
            record(`${label}: negativos NaN y false permanecen No analizado, sin valor literal ni veredicto`,
                absentTokens.nan === 'No analizado' && absentTokens.falseValue === 'No analizado',
                JSON.stringify(absentTokens));
        } else {
            const absentBiomarker = await page.evaluate(() => {
                const el = document.getElementById('biomarkerFr');
                return { text: el?.textContent.trim() ?? null, className: el?.className ?? '' };
            });
            record(`${label}: FR ausente permanece No analizado`,
                absentBiomarker.text === 'No analizado' && absentBiomarker.className.split(/\s+/).includes('unknown'),
                JSON.stringify(absentBiomarker));
        }

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

        if (patientId === 'SYN-DASH-D4') {
            // These actions follow the real FH artifact, in the same tab and
            // imported session. Export has its own listener after population.
            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 10000 }),
                page.click('#exportVisitsBtn')
            ]);
            record(`${label}: tras Solicitud FH, Exportar visitas real descarga el historial de ${patientId}`,
                download.suggestedFilename() === `historial_visitas_${patientId}.csv` &&
                await download.failure() === null,
                download.suggestedFilename());

            await page.click('#btnSeguimiento');
            await page.waitForURL(`**/seguimiento.html?id=${patientId}&patologia=espa`, { timeout: 15000 });
            await page.waitForFunction(() => !!document.getElementById('nombrePaciente')?.value, null, { timeout: 15000 });
            const continuation = await page.evaluate(() => {
                const value = (id) => document.getElementById(id)?.value ?? null;
                return {
                    cip: value('idPaciente'),
                    name: value('nombrePaciente'),
                    diagnosis: value('diagnosticoPrimario'),
                    treatment: value('tratamientoActual'),
                    patientVisible: document.querySelector('.patient-info-section')?.getClientRects().length > 0
                };
            });
            record(`${label}: Solicitud FH → Seguimiento real conserva ${patientId}, nombre, diagnóstico y tratamiento visibles`,
                continuation.cip === patientId && continuation.name === 'Sintetico Dash' &&
                continuation.diagnosis === 'espa' && continuation.treatment === SYN_TREATMENT &&
                continuation.patientVisible,
                JSON.stringify(continuation));
        }

        record(`${label}: console.error === 0`, consoleErrors.length === 0, JSON.stringify(consoleErrors));
        record(`${label}: pageerror === 0`, pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally {
        await page.close();
        await context.close();
    }
}

async function runBaselinePlanJourney(browser) {
    const label = 'D5 dashboard baseline Seguimiento con plan biológico';
    const patientId = 'SYN-DASH-D5';
    console.log(`\n=== ${label} (dashboard_paciente.html?id=${patientId}) ===`);
    const { page, context, consoleErrors, pageErrors } = await openDashboardPage(browser, patientId);
    try {
        await page.waitForFunction(() => !!window.activityChartInstance && !!window.patientSummary?.idPaciente,
            null, { timeout: 15000 });
        const dashboard = await page.evaluate(() => {
            const visible = (selector) => {
                const el = document.querySelector(selector);
                return !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
            };
            return {
                cip: window.patientSummary.idPaciente,
                visits: window.patientHistory.allVisits.map((visit) => ({
                    type: visit.Tipo_Visita, plan: visit.Biologico,
                    treatment: visit.Tratamiento_Actual
                })),
                historyRows: document.querySelectorAll('#visitsTable tbody tr').length,
                regionsVisible: [
                    '#patientKpis', '.dashboard-card--clinical', '.dashboard-card--biomarkers',
                    '.dashboard-card--summary', '.dashboard-card--treatment',
                    '.dashboard-card--history', '.dashboard-card--events', '.dashboard-card--chart'
                ].every(visible),
                treatmentText: document.querySelector('.dashboard-card--treatment')?.textContent ?? ''
            };
        });
        record(`${label}: dos Seguimientos físicos del mismo CIP conservan plan textual y tratamiento explícito`,
            dashboard.cip === patientId && dashboard.visits.length === 2 && dashboard.visits.every((visit) =>
                visit.type === 'Seguimiento' && visit.plan === 'Biologico sintetico X' && visit.treatment === SYN_TREATMENT),
            JSON.stringify(dashboard));
        record(`${label}: paciente, resumen, tratamiento, historial, biomarcadores y eventos siguen visibles`,
            dashboard.regionsVisible && dashboard.historyRows === 2 && dashboard.treatmentText.includes(SYN_TREATMENT),
            JSON.stringify(dashboard));

        // Read rendered content, not just card visibility. D5 carries PCR=8;
        // HLA-B27/FR/aPCC are absent and must not acquire fabricated results.
        const clinicalContent = await page.evaluate(() => {
            const read = (id) => {
                const el = document.getElementById(id);
                return {
                    text: el?.innerText.trim() ?? null,
                    visible: !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
                };
            };
            return {
                diagnosis: read('patientGeneralDiagnosis'),
                headerDiagnosis: read('patientDiagnosis'),
                pcr: read('kpiPCRValue'),
                biomarkers: ['biomarkerHlaB27', 'biomarkerFr', 'biomarkerApcc'].map(read),
                events: read('keyEventsTimeline'),
                eventRows: document.querySelectorAll('#keyEventsTimeline .timeline-item').length
            };
        });
        record(`${label}: diagnóstico explícito espa se muestra como Espondiloartritis Axial en ficha y cabecera`,
            [clinicalContent.diagnosis, clinicalContent.headerDiagnosis].every((value) =>
                value.visible && value.text === 'Espondiloartritis Axial'), JSON.stringify(clinicalContent));
        record(`${label}: PCR explícita 8 se muestra como 8.0 en el Dashboard`,
            clinicalContent.pcr.visible && clinicalContent.pcr.text === '8.0', JSON.stringify(clinicalContent.pcr));
        record(`${label}: HLA-B27, FR y aPCC ausentes muestran No analizado, sin resultado fabricado`,
            clinicalContent.biomarkers.every((value) => value.visible && value.text === 'No analizado'),
            JSON.stringify(clinicalContent.biomarkers));
        record(`${label}: eventos clínicos muestran estado vacío honesto, sin filas fabricadas`,
            clinicalContent.events.visible &&
            clinicalContent.events.text === 'No hay eventos terapéuticos registrados para este paciente.' &&
            clinicalContent.eventRows === 0, JSON.stringify({ events: clinicalContent.events, rows: clinicalContent.eventRows }));

        // READ only the real Chart.js instance bound to the visible canvas.
        const readChart = () => page.evaluate(() => {
            const chart = window.activityChartInstance;
            const canvas = document.getElementById('activityChart');
            return {
                boundToCanvas: chart.canvas === canvas && canvas.getClientRects().length > 0 && !canvas.classList.contains('hidden'),
                labels: [...chart.data.labels],
                datasets: chart.data.datasets.map((dataset) => ({ label: dataset.label, data: [...dataset.data] })),
                annotations: Object.keys(chart.options.plugins.annotation.annotations),
                eventTypes: (window.currentEvents || []).map((event) => event.type)
            };
        });
        const initial = await readChart();
        record(`${label}: canvas real contiene dos puntos BASDAI y las dos fechas fuente`,
            initial.boundToCanvas && JSON.stringify(initial.labels) === '["2026-01-10","2026-03-10"]' &&
            initial.datasets.length === 1 && initial.datasets[0].label === 'BASDAI' &&
            JSON.stringify(initial.datasets[0].data) === '[3.5,3]', JSON.stringify(initial));
        record(`${label}: consumidor real del gráfico no contiene biologic_start ni su marcador`,
            !initial.eventTypes.includes('biologic_start') && !initial.annotations.some((key) => key.includes('biologic_start')),
            JSON.stringify(initial));
        record(`${label}: anotaciones ajenas al falso inicio siguen presentes`,
            initial.annotations.some((key) => key.startsWith('basdai-')), JSON.stringify(initial.annotations));

        await page.selectOption('#selectActivityIndex', 'pcr');
        const pcr = await readChart();
        record(`${label}: selector real cambia a PCR sin perder fechas ni puntos`,
            pcr.boundToCanvas && pcr.datasets[0].label === 'PCR (mg/L)' &&
            JSON.stringify(pcr.datasets[0].data) === '[8,8]' && JSON.stringify(pcr.labels) === JSON.stringify(initial.labels),
            JSON.stringify(pcr));
        await page.selectOption('#selectActivityIndex', 'basdai');
        await page.check('#compareActivityCheckbox');
        await page.selectOption('#compareActivityIndexSelect', 'pcr');
        const compared = await readChart();
        record(`${label}: comparación real BASDAI/PCR operable, sin marcador de inicio`,
            compared.boundToCanvas && compared.datasets.length === 2 &&
            JSON.stringify(compared.datasets[0].data) === '[3.5,3]' &&
            compared.datasets[1].label === 'PCR (mg/L)' && JSON.stringify(compared.datasets[1].data) === '[8,8]' &&
            !compared.annotations.some((key) => key.includes('biologic_start')), JSON.stringify(compared));
        await page.uncheck('#compareActivityCheckbox');
        const restored = await readChart();
        record(`${label}: volver a BASDAI preserva curva y anotaciones restantes sin duplicación`,
            restored.boundToCanvas && JSON.stringify(restored.datasets) === JSON.stringify(initial.datasets) &&
            JSON.stringify(restored.labels) === JSON.stringify(initial.labels) &&
            JSON.stringify(restored.annotations) === JSON.stringify(initial.annotations), JSON.stringify(restored));

        // Train 25: qualify the real Solicitud FH artifact for the D5
        // baseline-plan route through the REAL button and the REAL artifact
        // read (clipboard else fallback modal), with the same structural
        // provenance parsing as the frozen oracle witness.
        const fh = await pressSolicitudFHAndReadArtifact(page);
        record(`${label}: el botón real Solicitud FH produce artefacto (vía ${fh.via})`,
            fh.artifact.length > 50, `longitud=${fh.artifact.length} vía=${fh.via}`);
        const fhActualBlock = extractTreatmentBlock(fh.artifact);
        record(`${label}: TRATAMIENTO ACTUAL reproduce el Tratamiento_Actual explícito verbatim`,
            fhActualBlock !== null && fhActualBlock.includes(`- ${SYN_TREATMENT}`), JSON.stringify(fhActualBlock));
        record(`${label}: el bloque ACTUAL no presenta el plan biológico como tratamiento activo`,
            fhActualBlock !== null && !fhActualBlock.includes(SYN_PLAN_DRUG), JSON.stringify(fhActualBlock));
        const fhOutside = fhActualBlock ? fh.artifact.replace(fhActualBlock, '') : '';
        record(`${label}: el plan biológico permanece en el artefacto FUERA del bloque ACTUAL (procedencia separada)`,
            fhOutside.includes(SYN_PLAN_DRUG), fh.artifact.slice(0, 2200));
        record(`${label}: sin tokens de afirmación fabricados (prescrito/prescripción/dispensad/iniciado/validado/START/SWITCH/ADD_ON/solicitud efectuada)`,
            !/(prescrito|prescripción|dispensad|iniciado|validado|START|SWITCH|ADD_ON|solicitud efectuada)/i.test(fh.artifact),
            fh.artifact.slice(0, 2200));
        record(`${label}: lista negativa legacy ausente del artefacto Solicitud FH`,
            blacklistHits(fh.artifact).length === 0, JSON.stringify(blacklistHits(fh.artifact)));
        console.log(`    excerpt prebiológico: ${excerptPrebio(fh.artifact)}`);

        await page.click('#btnSeguimiento');
        await page.waitForURL(`**/seguimiento.html?id=${patientId}&patologia=espa`, { timeout: 15000 });
        await page.waitForFunction(() => !!document.getElementById('nombrePaciente')?.value, null, { timeout: 15000 });
        const continuation = await page.evaluate(() => {
            const value = (id) => document.getElementById(id)?.value ?? null;
            const visible = (id) => document.getElementById(id)?.getClientRects().length > 0;
            return {
                cip: value('idPaciente'), name: value('nombrePaciente'),
                diagnosis: value('diagnosticoPrimario'), treatment: value('tratamientoActual'),
                contextVisible: ['idPaciente', 'nombrePaciente', 'diagnosticoPrimario', 'tratamientoActual'].every(visible)
            };
        });
        record(`${label}: Dashboard → Seguimiento conserva CIP, diagnóstico y tratamiento visibles sin nuevo inicio`,
            continuation.cip === patientId && continuation.name === 'Sintetico Dash' &&
            continuation.diagnosis === 'espa' && continuation.treatment === SYN_TREATMENT && continuation.contextVisible &&
            !restored.eventTypes.some((type) => ['treatment_start', 'treatment_change', 'biologic_start'].includes(type)),
            JSON.stringify(continuation));
        record(`${label}: console.error === 0`, consoleErrors.length === 0, JSON.stringify(consoleErrors));
        record(`${label}: pageerror === 0`, pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally {
        await page.close();
        await context.close();
    }
}

/**
 * Train 27 presentation read (READ ONLY): captures the three dashboard
 * representations affected by the treatment-truth defect — active-treatment
 * card (#activeTreatmentName/#activeTreatmentStartDate/#activeTreatmentDuration),
 * treatment KPI (#kpiTratamientoValue/#kpiTratamientoStatus) and the visits
 * table treatment column (last cell of each body row). Never mutates the
 * DOM, never fabricates fixtures.
 */
async function readTreatmentPresentation(page) {
    return page.evaluate(() => {
        const text = (selector) => document.querySelector(selector)?.textContent.trim() ?? null;
        const tableCells = [...document.querySelectorAll('#visitsTableBody tr td:last-child')]
            .map((cell) => cell.textContent.trim());
        return {
            cardName: text('#activeTreatmentName'),
            cardStart: text('#activeTreatmentStartDate'),
            cardDuration: text('#activeTreatmentDuration'),
            kpiValue: text('#kpiTratamientoValue'),
            kpiStatus: text('#kpiTratamientoStatus'),
            tableCells
        };
    });
}

/**
 * Train 25 corrector F1 witnesses (browser, real supported route only). Two
 * new journeys over the real import gate + real Read Port + real
 * #btnSolicitudFH + real artifact read (clipboard else fallback modal):
 *   - mode 'plan-only' (SYN-DASH-D6): the physical Biologico plan column is
 *     the ONLY treatment source; the explicit Tratamiento_Actual column is
 *     ABSENT. ACTUAL must NOT present the plan drug and must keep the honest
 *     placeholder; the plan must survive outside ACTUAL.
 *   - mode 'same-text' (SYN-DASH-D7): the explicit Tratamiento_Actual column
 *     and the Biologico plan column carry the SAME string. Both facts must be
 *     rendered, each under its own differentiated provenance (same name is
 *     not the same clinical fact; no name-based dedupe).
 * Existing D1–D5 journeys and assertions are untouched.
 */
async function runProvenanceWitnessJourney(browser, mode) {
    const isPlanOnly = mode === 'plan-only';
    const label = isPlanOnly
        ? 'F1 dashboard sólo plan (Biologico sin Tratamiento_Actual)'
        : 'F1 dashboard dos fuentes físicas explícitas de MISMO texto';
    const patientId = isPlanOnly ? 'SYN-DASH-D6' : 'SYN-DASH-D7';
    console.log(`\n=== ${label} (dashboard_paciente.html?id=${patientId}) ===`);
    const { page, context, consoleErrors, pageErrors } = await openDashboardPage(browser, patientId);
    try {
        await page.waitForFunction(() => !!window.patientSummary && !!window.patientSummary.idPaciente,
            null, { timeout: 15000 });
        const summaryId = await page.evaluate(() => window.patientSummary && window.patientSummary.idPaciente);
        record(`${label}: bundle del dashboard cargado por ruta soportada (?id=)`, summaryId === patientId, JSON.stringify(summaryId));

        const fh = await pressSolicitudFHAndReadArtifact(page);
        record(`${label}: el botón real Solicitud FH produce artefacto (vía ${fh.via})`,
            fh.artifact.length > 50, `longitud=${fh.artifact.length} vía=${fh.via}`);
        console.log(`    excerpt prebiológico: ${excerptPrebio(fh.artifact)}`);

        const actualBlock = extractTreatmentBlock(fh.artifact);
        if (isPlanOnly) {
            record(`${label}: ACTUAL no presenta el plan como tratamiento activo`,
                actualBlock !== null && !actualBlock.includes(SYN_PLAN_SAME), JSON.stringify(actualBlock));
            record(`${label}: ACTUAL mantiene el placeholder honesto de ausencia (sin dato fabricado)`,
                actualBlock !== null && actualBlock.includes('(Sin tratamiento activo registrado)'), JSON.stringify(actualBlock));
        } else {
            record(`${label}: ACTUAL reproduce la columna física Tratamiento_Actual verbatim`,
                actualBlock !== null && actualBlock.includes(`- ${SYN_PLAN_SAME}`), JSON.stringify(actualBlock));
        }
        const outside = actualBlock ? fh.artifact.replace(actualBlock, '') : '';
        record(`${label}: el plan consignado permanece FUERA del bloque ACTUAL bajo su propia fuente (sin dedupe por texto)`,
            outside.includes(SYN_PLAN_SAME), fh.artifact.slice(0, 2200));
        if (!isPlanOnly) {
            record(`${label}: el plan se emite bajo el rótulo veraz de plan/selección registrada`,
                outside.includes('PLAN / SELECCIÓN REGISTRADA'), fh.artifact.slice(0, 2200));
        }
        record(`${label}: sin tokens de afirmación fabricados (prescrito/prescripción/dispensad/iniciado/validado/START/SWITCH/ADD_ON/solicitud efectuada)`,
            !/(prescrito|prescripción|dispensad|iniciado|validado|START|SWITCH|ADD_ON|solicitud efectuada)/i.test(fh.artifact),
            fh.artifact.slice(0, 2200));
        record(`${label}: lista negativa legacy ausente del artefacto Solicitud FH`,
            blacklistHits(fh.artifact).length === 0, JSON.stringify(blacklistHits(fh.artifact)));
        // Train 27: the FH artifact assertions above are untouched; what
        // follows qualifies the three dashboard representations over the
        // same real route (supported reads only).
        if (isPlanOnly) {
            // D6 (SYN-DASH-D6, plan-only): no representation may present
            // the plan as active treatment; no date, no duration, never
            // 'Activo' — neutral placeholders from the existing vocabulary.
            const shown = await readTreatmentPresentation(page);
            record(`${label}: tarjeta no presenta el plan como activo (nombre neutro)`,
                shown.cardName === 'Sin tratamiento asignado' && !shown.cardName.includes(SYN_PLAN_SAME),
                JSON.stringify(shown));
            record(`${label}: tarjeta sin fecha ni duración inferidas`,
                shown.cardStart === 'Sin registrar' && shown.cardDuration === '---',
                JSON.stringify(shown));
            record(`${label}: KPI sin activo (valor neutro, estado nunca 'Activo' ni 'Desde ...')`,
                shown.kpiValue === '---' && shown.kpiStatus !== 'Activo' && !shown.kpiStatus.startsWith('Desde'),
                JSON.stringify(shown));
            record(`${label}: tabla de visitas no presenta el plan (celda neutra)`,
                shown.tableCells.length === 1 && shown.tableCells[0] === '---' &&
                !shown.tableCells[0].includes(SYN_PLAN_SAME),
                JSON.stringify(shown.tableCells));
            const historyText = await page.evaluate(() =>
                document.querySelector('.dashboard-card--history')?.textContent ?? '');
            record(`${label}: el plan permanece en su fuente propia (historial, sin borrar información)`,
                historyText.includes(SYN_PLAN_SAME), historyText.slice(0, 300));
            // The real CSV export shares the table projection (one
            // authority); its Tratamiento column must carry the neutral
            // placeholder, not the plan.
            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 10000 }),
                page.click('#exportVisitsBtn')
            ]);
            record(`${label}: Exportar visitas real descarga el historial de ${patientId}`,
                download.suggestedFilename() === `historial_visitas_${patientId}.csv` &&
                await download.failure() === null,
                download.suggestedFilename());
            const csvPath = await download.path();
            const csv = fs.readFileSync(csvPath, 'utf8');
            const csvLines = csv.split('\n').filter((line) => line.trim() !== '');
            const treatmentIndex = csvLines[0].split(';').indexOf('Tratamiento');
            const csvTreatments = csvLines.slice(1).map((line) => (line.split(';')[treatmentIndex] || '').trim());
            record(`${label}: CSV "Tratamiento" lleva placeholder neutro, no el plan`,
                treatmentIndex !== -1 && csvTreatments.length === 1 && csvTreatments[0] === '---' &&
                !csv.includes(SYN_PLAN_SAME),
                JSON.stringify(csvTreatments));
        } else {
            // D7 (same text, differentiated provenance): the explicit
            // physical value is shown even though it equals the plan text
            // (no text-equality dedupe), with no fabricated date/duration.
            const shown = await readTreatmentPresentation(page);
            record(`${label}: tarjeta muestra el actual explícito aunque coincida con el plan`,
                shown.cardName === SYN_PLAN_SAME, JSON.stringify(shown));
            record(`${label}: tarjeta sin fecha/duración fabricadas desde histórico o visita`,
                shown.cardStart === 'Sin registrar' && shown.cardDuration === '---',
                JSON.stringify(shown));
            record(`${label}: KPI muestra el actual explícito con estado 'Activo' (sin fecha explícita)`,
                shown.kpiValue === SYN_PLAN_SAME.split(' ')[0] && shown.kpiStatus === 'Activo',
                JSON.stringify(shown));
            record(`${label}: tabla de visitas muestra el actual explícito`,
                shown.tableCells.length === 1 && shown.tableCells[0] === SYN_PLAN_SAME,
                JSON.stringify(shown.tableCells));
        }
        record(`${label}: console.error === 0`, consoleErrors.length === 0, JSON.stringify(consoleErrors));
        record(`${label}: pageerror === 0`, pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally {
        await page.close();
        await context.close();
    }
}

/**
 * Train 27 accredited-actual journeys (browser, real supported route only):
 *   - SYN-DASH-D8: physical Tratamiento_Actual PLUS explicit
 *     Fecha_Inicio_Tratamiento → the card shows the accredited actual with
 *     the explicit start date and a computed duration; KPI status 'Desde ...'
 *     comes from the explicit field.
 *   - SYN-DASH-D9: physical Tratamiento_Actual literally 'No' with a plan
 *     column present → 'No' is shown as the recorded value (not equated
 *     with absence) in card, KPI and table, but never reads as active: the
 *     card shows no start date/duration and the KPI status is exactly
 *     'Sin tratamiento activo' (never 'Activo', never 'Desde ...'); the
 *     plan is never substituted.
 *   - SYN-DASH-D10: physical Tratamiento_Actual PLUS only the camelCase
 *     `fechaInicioTratamiento` alias key (no physical
 *     Fecha_Inicio_Tratamiento value) → the alias does not accredit a start
 *     date: the card shows no date/duration and the KPI keeps its
 *     never-'Desde ...' status.
 *   - SYN-DASH-D11: physical Tratamiento_Actual literally 'No' PLUS a
 *     physical (contradictory) Fecha_Inicio_Tratamiento on the same row →
 *     the negated actual is authoritative: 'No' is preserved but the
 *     contradictory date must never surface as a start date, a duration or
 *     a 'Desde ...' status anywhere in the projection.
 */
async function runAccreditedActualJourney(browser, patientId) {
    const isDated = patientId === 'SYN-DASH-D8';
    const isAliasDate = patientId === 'SYN-DASH-D10';
    const isContradictoryNo = patientId === 'SYN-DASH-D11';
    const label = isDated
        ? 'T27 dashboard actual acreditado con fecha explícita'
        : (isAliasDate
            ? 'T27 dashboard actual físico con sólo fecha alias camelCase'
            : (isContradictoryNo
                ? 'T27 dashboard actual literal «No» con fecha física contradictoria'
                : 'T27 dashboard actual literal «No» con plan presente'));
    console.log(`\n=== ${label} (dashboard_paciente.html?id=${patientId}) ===`);
    const { page, context, consoleErrors, pageErrors } = await openDashboardPage(browser, patientId);
    try {
        await page.waitForFunction(() => !!window.patientSummary && !!window.patientSummary.idPaciente,
            null, { timeout: 15000 });
        const summaryId = await page.evaluate(() => window.patientSummary && window.patientSummary.idPaciente);
        record(`${label}: bundle del dashboard cargado por ruta soportada (?id=)`, summaryId === patientId, JSON.stringify(summaryId));
        const shown = await readTreatmentPresentation(page);
        if (isDated) {
            // Expected rendering is derived in-page from the same pure
            // formatter the dashboard uses (read only, no fabrication), so
            // the assertion is timezone-robust.
            const expected = await page.evaluate(() => ({
                start: window.formatDate('2026-01-15'),
                status: 'Desde ' + window.formatDate('2026-01-15').substring(3)
            }));
            record(`${label}: tarjeta muestra el actual acreditado con la fecha explícita`,
                shown.cardName === SYN_DATED_ACTUAL && shown.cardStart === expected.start,
                JSON.stringify({ shown, expected }));
            record(`${label}: tarjeta calcula duración desde la fecha explícita (no placeholder)`,
                !!shown.cardDuration && shown.cardDuration !== '---' && shown.cardDuration !== 'Sin registrar',
                JSON.stringify(shown));
            record(`${label}: KPI muestra el actual con estado 'Desde ...' de la fecha explícita`,
                shown.kpiValue === SYN_DATED_ACTUAL.split(' ')[0] && shown.kpiStatus === expected.status,
                JSON.stringify({ shown, expected }));
            record(`${label}: tabla de visitas muestra el actual acreditado`,
                shown.tableCells.length === 1 && shown.tableCells[0] === SYN_DATED_ACTUAL,
                JSON.stringify(shown.tableCells));
        } else if (isAliasDate) {
            // D10 (date provenance): the physical actual is accredited, but
            // the only date is the camelCase `fechaInicioTratamiento` alias,
            // whose provenance is unproven. It must not supply the card
            // date/duration nor a KPI 'Desde ...' status.
            record(`${label}: tarjeta muestra el actual físico acreditado`,
                shown.cardName === SYN_ALIAS_DATED_ACTUAL, JSON.stringify(shown));
            record(`${label}: tarjeta sin fecha ni duración del alias camelCase (no acreditado)`,
                shown.cardStart === 'Sin registrar' && shown.cardDuration === '---',
                JSON.stringify(shown));
            record(`${label}: KPI nunca 'Desde ...' desde el alias (estado 'Activo')`,
                shown.kpiValue === SYN_ALIAS_DATED_ACTUAL.split(' ')[0] &&
                shown.kpiStatus === 'Activo' && !shown.kpiStatus.startsWith('Desde'),
                JSON.stringify(shown));
            record(`${label}: tabla de visitas muestra el actual físico acreditado`,
                shown.tableCells.length === 1 && shown.tableCells[0] === SYN_ALIAS_DATED_ACTUAL,
                JSON.stringify(shown.tableCells));
        } else {
            // D9/D11 (literal 'No', human-authorized rule): the physical
            // Tratamiento_Actual trimmed value is exactly 'No'. It is a
            // recorded negation, not absence, so 'No' is preserved as the
            // value in card, KPI and table — but it never reads as active:
            // the card shows no start date/duration and the KPI status is
            // exactly 'Sin tratamiento activo' (never 'Activo', never
            // 'Desde ...'). D11 additionally carries a contradictory
            // physical Fecha_Inicio_Tratamiento that the negated actual
            // must not project.
            record(`${label}: tarjeta muestra 'No' como valor registrado (no ausencia)`,
                shown.cardName === 'No', JSON.stringify(shown));
            record(`${label}: tarjeta sin fecha ni duración para el tratamiento negado`,
                shown.cardStart === 'Sin registrar' && shown.cardDuration === '---',
                JSON.stringify(shown));
            record(`${label}: KPI muestra 'No' con estado exactamente 'Sin tratamiento activo' (nunca 'Activo' ni 'Desde ...')`,
                shown.kpiValue === 'No' && shown.kpiStatus === 'Sin tratamiento activo' &&
                shown.kpiStatus !== 'Activo' && !shown.kpiStatus.startsWith('Desde'),
                JSON.stringify(shown));
            record(`${label}: tabla muestra 'No'; el plan nunca sustituye al registrado`,
                shown.tableCells.length === 1 && shown.tableCells[0] === 'No' &&
                shown.tableCells[0] !== SYN_PLAN_SAME && shown.cardName !== SYN_PLAN_SAME,
                JSON.stringify(shown.tableCells));
            if (isContradictoryNo) {
                // The physical Fecha_Inicio_Tratamiento on the negated row
                // is a contradictory witness. It must never surface as a
                // start date, duration or 'Desde ...' status, and the
                // rendered projection must not contain it at all.
                const contradictoryDate = await page.evaluate(() => window.formatDate('2026-03-05'));
                record(`${label}: la fecha física contradictoria no se proyecta (ni fecha, ni duración, ni 'Desde ...')`,
                    shown.cardStart !== contradictoryDate && shown.cardDuration === '---' &&
                    !shown.kpiStatus.startsWith('Desde') && !JSON.stringify(shown).includes(contradictoryDate),
                    JSON.stringify({ shown, contradictoryDate }));
            }
        }
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
    await runJourney(browser, 'D4 dashboard FR numérico explícito', 'SYN-DASH-D4', null);
    await runBaselinePlanJourney(browser);
    await runProvenanceWitnessJourney(browser, 'plan-only');
    await runProvenanceWitnessJourney(browser, 'same-text');
    await runAccreditedActualJourney(browser, 'SYN-DASH-D8');
    await runAccreditedActualJourney(browser, 'SYN-DASH-D9');
    await runAccreditedActualJourney(browser, 'SYN-DASH-D10');
    await runAccreditedActualJourney(browser, 'SYN-DASH-D11');
} finally {
    if (browser) await browser.close();
    server.close();
}

const passed = results.filter(Boolean).length;
console.log(`\nRESULTADO: ${passed} OK / ${results.length - passed} FALLIDO`);
process.exit(results.every(Boolean) ? 0 : 1);
