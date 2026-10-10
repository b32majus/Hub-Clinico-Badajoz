#!/usr/bin/env node
'use strict';
/**
 * FROZEN INDEPENDENT ACCEPTANCE PACKAGE — Train 20 / #621 (TXT→CSV ephemeral gate).
 * TRAIN_NEXUS_REUMA_TXT_GATE_20 + accepted SPEC + tickets T20-01/02/03.
 *
 * AUTHORITY (repo-local, read-only):
 *   docs/handoffs/TRAIN_NEXUS_REUMA_TXT_GATE_20.md            (accepted WO/handoff)
 *   docs/handoffs/TRAIN_NEXUS_REUMA_TXT_GATE_20_SPEC.md       (THE accepted spec, sole acceptance source)
 *   docs/handoffs/TRAIN_NEXUS_REUMA_TXT_GATE_20_TICKETS/*.md  (task graph — NOT executed here)
 *   CODING_STANDARDS.md §16: the implementation must not author the principal
 *   acceptance oracle it is judged against — this file is authored by an
 *   independent oracle session and NEVER touches product code.
 *
 * WHAT THIS CHECKER IS:
 *   The frozen principal acceptance evidence for the TXT→CSV gate work. It
 *   observes ONLY supported public seams: the real Primera Visita /
 *   Seguimiento controls (`#btnExportarTXT` → `#btnEstructurarCSV`), the
 *   shared text modal (`mostrarModalTexto`) and its real `Copiar`/`Cerrar`
 *   buttons, real notifications (toast DOM), the real delivered TXT note and
 *   497-column CSV payload (clipboard / manual modal), console/pageerror
 *   streams and Web Storage snapshots. No private/internal method is used as
 *   an assertion basis (the only internal seams read, `HubTools.
 *   reumaActContract.createVisitAct` + `HubTools.reumaLegacyExportAdapter.
 *   projectVisitAct497`, are the PUBLIC cutover boundary that spec story 15
 *   itself names as the byte-equality reference). No isolated eval, no DOM
 *   tampering, no readonly-DOM mutation, no fabricated states.
 *
 * BASELINE RED (frozen expectation on HEAD 74801c6bf69c4e63443ae99aaa66e1a7af0f19d0):
 *   The legacy gate (`HubClinico_TxtExportDone_*` sessionStorage markers,
 *   written by `exportarTXT` on clipboard success, on merely OPENING the
 *   manual modal and on the unreachable download fallback) violates the
 *   accepted spec on the witnesses marked `baseline: RED` below. Preservation
 *   witnesses (`baseline: PASS`) must keep passing on the candidate. A RED
 *   run here is the REQUIRED pre-implementation evidence; the candidate run
 *   must turn every RED witness GREEN without breaking any PASS witness.
 *
 * WITNESS -> SPEC MAP (story numbers from TRAIN_NEXUS_REUMA_TXT_GATE_20_SPEC.md):
 *   W01 story 1  CSV blocked before any TXT + pending-step message (PV).
 *   W02 story 16 empty identity context fail-closed, no crash (PV).
 *   W03 story 16 storage denied fail-closed, no crash (PV).
 *   W04 story 2  clipboard writeText resolving enables the 497 CSV (PV).
 *   W05 story 15 delivered 497 row byte-equals the cutover adapter row (PV).
 *   W06 story 15 TXT note text unchanged (stable invariants, PV).
 *   W07 story 13 same instance + unchanged data re-exports CSV (PV).
 *   W08 story 9  change-then-restore (payload identical) does not force repeat (PV).
 *   W09 story 3  clipboard reject + modal merely opened => CSV blocked (PV).
 *   W10 story 7  close/cancel without copy/attestation => blocked, no success claim (PV).
 *   W11 story 4  modal Copiar real success => CSV enabled (PV).
 *   W12 story 4  modal Copiar failure => CSV blocked, modal/text preserved (PV).
 *   W13 story 5  manual Ctrl+A/Ctrl+C + explicit attestation control => enabled (PV).
 *   W14 story 5  manual copy without attestation => blocked (PV).
 *   W15 story 6  clipboard-unavailable TXT: no CSV authorization without explicit
 *                download/manual confirmation (download-confirm control not
 *                independently reachable: the manual modal is always available
 *                on PV/Seg, so a bare `link.click()` download is not a supported
 *                state; the attestation-control contract is W13's).
 *   W16 story 10 stale promise resolving after an edit => no authorization (PV).
 *   W17 story 10 stale promise after a second export => not authorized;
 *                the current export's result authorizes (PV).
 *   W18 story 8  exportable-field edit => blocked + the exact spec message (PV).
 *   W19 story 11 reload => authorization lost (PV).
 *   W20 story 11 Primera Visita «Nuevo paciente» => authorization lost (PV).
 *   W21 story 11 navigation away + back => authorization lost (PV).
 *   W22 story 11 bfcache restore (pageshow.persisted) => authorization lost (PV).
 *                Conditional witness: recorded SKIP only when the environment
 *                never produces a persisted restore.
 *   W23 story 12/11 reopening the same visit identity (same CIP/fecha/tipo/
 *                diagnóstico, Seguimiento ?id= route) => no inherited authorization.
 *   W24 story 2/13 Seguimiento clipboard resolve enables CSV + re-export (Seg).
 *   W25 story 15 497 byte equality with the cutover adapter (Seg).
 *   W26 story 14 planted legacy `HubClinico_TxtExportDone_*` marker matching
 *                CIP/fecha NEVER authorizes (PV).
 *   W27 story 14 planted markers + `hubPendingRows` byte-unchanged across ALL
 *                journeys (never read/migrated/deleted).
 *   W28 Implementation Decisions: zero NEW Web Storage writes by the TXT→CSV
 *                gate across ALL journeys (apart from planted sentinels).
 *   W29 Cross-cutting: pageerror=0 and console errors only within the
 *                explicitly classified controlled-failure classes.
 *   W30 story 17 dashboard_paciente.html gains no functional TXT gate.
 *   W31 story 17 Solicitud FH sibling journey: no gate controls added there
 *                (shared-modal #620 byte-fidelity itself is delegated to
 *                tools/reuma_shared_modal_copy_truth_browser_check.mjs, which
 *                covered FH C11-C13 + modal semantics at 93/93 on this base).
 *
 * APPROVED WORDING asserted verbatim (spec `Mensajería aprobada` + story 8):
 *   «Los datos de la visita han cambiado desde el TXT. Vuelve a exportarlo y
 *    revisa que la historia clínica refleje la versión actual antes de generar
 *    el CSV» (W18, exact literal). Success claims are asserted only as
 *    ABSENCES in no-confirmation witnesses (banned token list), because the
 *    spec fixes the success wording for OTHER states («TXT copiado», «TXT
 *    confirmado por el profesional») and never forbids it here.
 *
 * Environment deviations (declared, nothing changed):
 *   - Node v24.15.0 is used while package.json engines declares 20 (checker
 *     runtime deviation only; no config touched).
 *   - Chromium headless via Playwright, browsers from ~/.cache/ms-playwright,
 *     module resolved from the global npm root (same loader as the other
 *     Reuma browser checkers).
 *   - Synthetic data only (SYN-*); screenshots disabled by default.
 *
 * Usage: node tools/reuma_txt_gate_frozen_acceptance_browser_check.mjs
 * Exit 0 = every witness PASS (SKIP allowed only for the conditional W22
 * bfcache witness when the environment cannot produce a persisted restore).
 * Exit 1 = at least one FAIL (the expected baseline verdict is RED on the
 * witnesses marked `baseline: RED` — a RED run still exits 1 by design; the
 * per-witness table + expected/actual columns are the evidence).
 */

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

const PAGE_INDEX = 'reuma_index.html';
const PAGE_PRIMERA = 'primera_visita.html';
const PAGE_SEGUIMIENTO = 'seguimiento.html';
const PAGE_DASHBOARD = 'dashboard_paciente.html';

const CSV_FIELD_COUNT = 497;
const CSV_MODAL_TITLE_TOKEN = 'Copia manual de CSV';
const TXT_MODAL_TITLE_TOKEN = 'Copia Manual';
const FH_MODAL_TITLE_TOKEN = 'Solicitud a Farmacia Hospitalaria';
const STORY8_MESSAGE = 'Los datos de la visita han cambiado desde el TXT. Vuelve a exportarlo y revisa que la historia cl\u00ednica refleje la versi\u00f3n actual antes de generar el CSV';
const TXT_NOTE_HEADER_TOKEN = 'HISTORIA CL\u00cdNICA REUMATOL\u00d3GICA';
const GATE_STORAGE_PREFIX = 'HubClinico_TxtExportDone_';

// Visible text that would claim a TXT copy/registration success. Present in a
// no-confirmation witness => the product claimed success without a real
// clipboard success or an explicit professional attestation (stories 3/7/10).
const BANNED_SUCCESS_CLAIMS = [
    'TXT copiado',
    'TXT confirmado',
    'copiada al portapapeles',
    'TXT registrado',
    'ya puede exportar CSV',
];

// Controlled-failure console.error classes (baseline legacy wording + the
// generic page-script export catch). Anything else fails W29.
const CLASSIFIED_CONSOLE_ERRORS = [
    'Error al copiar al portapapeles autom\u00e1ticamente', // exportManager TXT auto-copy failure (controlled)
    'Error al copiar desde el modal', // formController modal Copiar failure (controlled)
    'Error al copiar los datos al portapapeles', // CSV delivery clipboard failure (controlled)
    'Error en exportarTXT', // exportarTXT outer catch, e.g. clipboard API unavailable (controlled)
    'Error al exportar CSV', // page-script CSV catch (controlled)
];

// ---------------------------------------------------------------------------
// Witness registry.
// ---------------------------------------------------------------------------

const witnesses = [];
function defineWitness(id, story, contract, baseline) {
    const w = { id, story, contract, baseline, verdict: 'PENDING', detail: '' };
    witnesses.push(w);
    return w;
}
function witnessPass(w, detail) { w.verdict = 'PASS'; w.detail = detail || ''; console.log(`  [PASS] ${w.id} (${w.baseline === 'RED' ? 'unexpectedly GREEN on baseline?' : 'expected PASS on baseline'}) ${w.contract}${detail ? ` -> ${detail}` : ''}`); }
function witnessFail(w, detail) { w.verdict = 'FAIL'; w.detail = detail || ''; console.log(`  [FAIL] ${w.id} (baseline expectation: ${w.baseline}) ${w.contract} -> ${detail}`); }
function witnessSkip(w, detail) { w.verdict = 'SKIP'; w.detail = detail || ''; console.log(`  [SKIP] ${w.id} ${w.contract} -> ${detail}`); }

const W01 = defineWitness('W01', 'story 1', 'CSV blocked before any TXT with a pending-step message (PV)', 'PASS');
const W02 = defineWitness('W02', 'story 16', 'empty identity context fail-closed, no crash (PV)', 'PASS');
const W03 = defineWitness('W03', 'story 16', 'denied storage fail-closed, no crash (PV)', 'PASS');
const W04 = defineWitness('W04', 'story 2', 'clipboard writeText resolving enables the 497 CSV (PV)', 'PASS');
const W05 = defineWitness('W05', 'story 15', 'delivered 497 row byte-equals the cutover adapter row (PV)', 'PASS');
const W06 = defineWitness('W06', 'story 15', 'TXT note text unchanged across repeated exports (PV)', 'PASS');
const W07 = defineWitness('W07', 'story 13', 'same instance, unchanged data: CSV re-export without repeating TXT (PV)', 'PASS');
const W08 = defineWitness('W08', 'story 9', 'presentation-only change (payload restored identical) does not force repetition (PV)', 'PASS');
const W09 = defineWitness('W09', 'story 3', 'clipboard reject + modal merely opened: CSV stays blocked (PV)', 'RED');
const W10 = defineWitness('W10', 'story 7', 'closing/cancelling the modal without confirmation: CSV blocked, no success claim (PV)', 'RED');
const W11 = defineWitness('W11', 'story 4', 'modal Copiar real success: CSV enabled (#620 semantics preserved) (PV)', 'PASS');
const W12 = defineWitness('W12', 'story 4', 'modal Copiar failure: CSV blocked, modal/text preserved (#620 protection) (PV)', 'RED');
const W13 = defineWitness('W13', 'story 5', 'manual Ctrl+A/Ctrl+C + explicit professional attestation control: CSV enabled (PV)', 'RED');
const W14 = defineWitness('W14', 'story 5', 'manual copy WITHOUT attestation: CSV blocked (PV)', 'RED');
const W15 = defineWitness('W15', 'story 6', 'clipboard-unavailable TXT: no CSV authorization without an explicit download/manual confirmation (PV)', 'PASS');
const W16 = defineWitness('W16', 'story 10', 'stale promise resolving after an edit does not authorize the visit (PV)', 'RED');
const W17 = defineWitness('W17', 'story 10', 'stale promise after a second export does not authorize; the current export result does (PV)', 'RED');
const W18 = defineWitness('W18', 'story 8', 'exportable-field edit: CSV blocked + the exact story-8 message (PV)', 'RED');
const W19 = defineWitness('W19', 'story 11', 'reload: authorization lost, TXT must be repeated (PV)', 'RED');
const W20 = defineWitness('W20', 'story 11', 'Primera Visita \u00abNuevo paciente\u00bb: authorization lost (PV)', 'RED');
const W21 = defineWitness('W21', 'story 11', 'navigation away + back: authorization lost (PV)', 'RED');
const W22 = defineWitness('W22', 'story 11', 'bfcache restore (pageshow.persisted): authorization lost (PV)', 'RED');
const W23 = defineWitness('W23', 'story 12', 'reopening the same visit identity (identical CIP/fecha/tipo/diagn\u00f3stico): no inherited authorization (Seguimiento)', 'RED');
const W24 = defineWitness('W24', 'story 2/13', 'Seguimiento clipboard resolve enables the 497 CSV + same-instance re-export', 'PASS');
const W25 = defineWitness('W25', 'story 15', 'delivered 497 row byte-equals the cutover adapter row (Seguimiento)', 'PASS');
const W26 = defineWitness('W26', 'story 14', 'planted legacy marker matching CIP/fecha NEVER authorizes CSV (PV)', 'RED');
const W27 = defineWitness('W27', 'story 14', 'planted markers + hubPendingRows byte-unchanged across ALL journeys', 'PASS');
const W28 = defineWitness('W28', 'Impl. decisions', 'zero NEW Web Storage writes by the TXT\u2192CSV gate across ALL journeys', 'RED');
const W29 = defineWitness('W29', 'cross-cutting', 'pageerror=0 and console errors only in classified controlled-failure classes (ALL journeys)', 'PASS');
const W30 = defineWitness('W30', 'story 17', 'dashboard_paciente.html gains no functional TXT gate it never had', 'PASS');
const W31 = defineWitness('W31', 'story 17', 'Solicitud FH sibling journey: no gate controls added there', 'PASS');

// ---------------------------------------------------------------------------
// Storage sentinel fixtures (synthetic; planted at document start via init
// script in EVERY journey so every journey observes them byte-stable).
// ---------------------------------------------------------------------------

const SENTINEL_OTHER_KEY = `${GATE_STORAGE_PREFIX}SYN-OTHER__2020-01-01__seguimiento__ar`;
const SENTINEL_OTHER_VALUE = JSON.stringify({ completedAt: '2020-01-01T00:00:00.000Z', visitKey: 'SYN-OTHER__2020-01-01__seguimiento__ar' });
const SENTINEL_PENDING_KEY = 'hubPendingRows';
const SENTINEL_PENDING_VALUE = JSON.stringify([{ idPaciente: 'SYN-LEGACY-PENDING', fecha: '2020-01-01', nota: 'synthetic legacy sentinel' }]);
// Matching legacy marker, only planted in the W26 journey (CIP SYN-GATE-LEG-1,
// fecha 2026-02-10, primera, espa — same normalization the legacy gate applies).
const SENTINEL_MATCHING_KEY = `${GATE_STORAGE_PREFIX}SYN-GATE-LEG-1__2026-02-10__primera__espa`;
const SENTINEL_MATCHING_VALUE = JSON.stringify({ completedAt: '2026-01-01T00:00:00.000Z', visitKey: 'SYN-GATE-LEG-1__2026-02-10__primera__espa' });
const SENTINEL_KEYS = [SENTINEL_OTHER_KEY, SENTINEL_PENDING_KEY];

// ---------------------------------------------------------------------------
// Playwright loading (same documented resolution as the other Reuma checkers).
// ---------------------------------------------------------------------------

function loadPlaywrightFromNpx() {
    const tryNodeModules = (nodeModules) => {
        const pkg = path.join(nodeModules, 'playwright', 'package.json');
        return existsSync(pkg) ? createRequire(path.join(nodeModules, '__reuma_txt_gate_frozen_acceptance_loader.cjs'))('playwright') : null;
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
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/reuma_txt_gate_frozen_acceptance_browser_check.mjs');
}

let chromium;
try {
    ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
    console.error('ENVIRONMENT FAILURE: ' + err.message);
    console.log('\nREUMA-TXT-GATE-FROZEN-ACCEPTANCE: FAIL 0/0');
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
// server — same shape as tools/reuma_shared_modal_copy_truth_browser_check.mjs.
// ---------------------------------------------------------------------------

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'reuma-txt-gate-frozen-acceptance-'));
const workbookPath = path.join(tempDir, 'reuma_txt_gate_frozen_acceptance_synthetic.xlsx');
{
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
        { ID_Paciente: 'SYN-000-000' },
        {
            ID_Paciente: 'SYN-SEG-200',
            Nombre_Paciente: 'Sintetico Seg TxtGate',
            Fecha_Visita: '2026-02-01',
            Tipo_Visita: 'Seguimiento',
            Diagnostico_Primario: 'espa',
            Tratamiento_Actual: 'Adalimumab (sintetico QA) 40 mg',
        },
        {
            ID_Paciente: 'SYN-DASH-900',
            Nombre_Paciente: 'Sintetico Dash TxtGate',
            Fecha_Visita: '2026-02-01',
            Tipo_Visita: 'Seguimiento',
            Diagnostico_Principal: 'espa',
            Diagnostico_Secundario: 'Lumbalgia inflamatoria sintetica',
            PCR: '8',
            EVA_Global: '6',
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

// ---------------------------------------------------------------------------
// Supported session gate + page bookkeeping.
// ---------------------------------------------------------------------------

function trackedPage(page) {
    const consoleErrors = [];
    const consoleWarnings = [];
    const pageErrors = [];
    const downloads = [];
    page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(`${page.url()} :: ${message.text()}`);
        if (message.type() === 'warning') consoleWarnings.push(`${page.url()} :: ${message.text()}`);
    });
    page.on('pageerror', (error) => pageErrors.push(`${page.url()} :: ${error.message}`));
    page.on('download', (download) => downloads.push(download.suggestedFilename()));
    return { consoleErrors, consoleWarnings, pageErrors, downloads };
}

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

/** Supported clinical base fill (synthetic values only). In seguimiento
 * #idPaciente is readonly and prefilled by the ?id= route — only READ. */
async function fillClinicalBase(page, { cip, isSeguimiento }) {
    if (isSeguimiento) {
        await page.waitForFunction(() => {
            const el = document.getElementById('idPaciente');
            return el && el.value;
        }, null, { timeout: 15000 });
        await openAncestorCollapsibles(page, '#fechaVisita');
    } else {
        await openAncestorCollapsibles(page, '#idPaciente');
        await page.fill('#idPaciente', cip);
        await openAncestorCollapsibles(page, '#fechaVisita');
    }
    await page.fill('#fechaVisita', '2026-02-10');
    await openAncestorCollapsibles(page, '#diagnosticoPrimario');
    await page.selectOption('#diagnosticoPrimario', 'espa');
    await openAncestorCollapsibles(page, '#diagnosticoSecundario');
    await page.fill('#diagnosticoSecundario', 'Lumbalgia inflamatoria sint\u00e9tica');
    await openAncestorCollapsibles(page, '#pcrValue');
    await page.fill('#pcrValue', '8');
    await openAncestorCollapsibles(page, '#evaGlobal');
    await page.fill('#evaGlobal', '6');
}

async function openJourneyPage(browser, origin, urlPath, plantCfg) {
    const context = await browser.newContext();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }).catch(() => {});
    const page = await context.newPage();
    const entry = trackedPage(page);
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
    await context.addInitScript(txtGatePlant, plantCfg);
    await page.goto(`${origin}${urlPath}`, { waitUntil: 'load', timeout: 45000 });
    return { context, page, entry };
}

// ---------------------------------------------------------------------------
// Environment plant (init script; serialized WITHOUT closure scope, so config
// arrives as a plain argument). Controlled clipboard / execCommand / storage
// conditions only; runtime arming happens through plain flag assignment. The
// DOM is never touched.
// ---------------------------------------------------------------------------

function txtGatePlant(cfg) {
    window.__tg = {
        writeMode: 'reject', // 'reject' | 'throw' | 'allow' | 'park'
        writeAttempts: 0,
        writtenTexts: [],
        parked: [],
        thrown: null,
        execArmed: false,
        execThrow: false,
        execResult: false,
        execCalls: 0,
        execLastResult: null,
        clipboardAvailable: true,
        storageDenied: false,
        storageDeniedCalls: 0,
        pageShows: [],
    };

    // Synthetic legacy sentinels, planted at document start of EVERY page.
    try { sessionStorage.setItem(cfg.otherMarkerKey, cfg.otherMarkerValue); } catch (error) { /* sentinel planting is best-effort */ }
    try { if (cfg.matchingMarker) sessionStorage.setItem(cfg.matchingMarkerKey, cfg.matchingMarkerValue); } catch (error) { /* best-effort */ }
    try { localStorage.setItem(cfg.pendingKey, cfg.pendingValue); } catch (error) { /* best-effort */ }

    window.addEventListener('pageshow', (event) => {
        window.__tg.pageShows.push({ persisted: event.persisted === true, url: String(location.href) });
    });

    const originalClipboard = navigator.clipboard;
    if (originalClipboard && typeof originalClipboard.writeText === 'function') {
        const originalWriteText = originalClipboard.writeText.bind(originalClipboard);
        try {
            Object.defineProperty(originalClipboard, 'writeText', {
                configurable: true,
                value: (text) => {
                    window.__tg.writeAttempts += 1;
                    window.__tg.writtenTexts.push(String(text == null ? '' : text));
                    const mode = window.__tg.writeMode;
                    if (mode === 'reject') return Promise.reject(new Error('planted clipboard rejection (QA)'));
                    if (mode === 'throw') {
                        const thrown = new Error('planted clipboard throw (QA)');
                        window.__tg.thrown = thrown.message;
                        throw thrown;
                    }
                    if (mode === 'park') {
                        return new Promise((resolve) => { window.__tg.parked.push(resolve); });
                    }
                    return originalWriteText(text);
                },
            });
        } catch (error) { /* leave the original writeText in place */ }
    }

    // Clipboard availability switch (navigator.clipboard -> undefined when armed).
    try {
        const instanceDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        const prototypeDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'clipboard');
        const target = prototypeDescriptor ? Navigator.prototype : (instanceDescriptor ? Object.getPrototypeOf(navigator) : null);
        if (target) {
            Object.defineProperty(target, 'clipboard', {
                configurable: true,
                get() { return window.__tg.clipboardAvailable === false ? undefined : originalClipboard; },
            });
        }
    } catch (error) { /* stays available; the case assertion fails closed */ }

    // Storage denial switch: when armed, every setItem/getItem/removeItem on
    // Storage.prototype throws (both sessionStorage and localStorage).
    try {
        const proto = Storage.prototype;
        const origSet = proto.setItem;
        const origGet = proto.getItem;
        const origRemove = proto.removeItem;
        Object.defineProperty(proto, 'setItem', {
            configurable: true,
            value: function (k, v) {
                if (window.__tg.storageDenied) { window.__tg.storageDeniedCalls += 1; throw new Error('planted storage denial (QA)'); }
                return origSet.call(this, k, v);
            },
        });
        Object.defineProperty(proto, 'getItem', {
            configurable: true,
            value: function (k) {
                if (window.__tg.storageDenied) { window.__tg.storageDeniedCalls += 1; throw new Error('planted storage denial (QA)'); }
                return origGet.call(this, k);
            },
        });
        Object.defineProperty(proto, 'removeItem', {
            configurable: true,
            value: function (k) {
                if (window.__tg.storageDenied) { window.__tg.storageDeniedCalls += 1; throw new Error('planted storage denial (QA)'); }
                return origRemove.call(this, k);
            },
        });
    } catch (error) { /* denial switch unavailable; W03 would report it */ }

    // Controlled execCommand('copy') wrapper (modal Copiar #620 semantics).
    const originalExecCommand = document.execCommand.bind(document);
    Object.defineProperty(document, 'execCommand', {
        configurable: true,
        value: function (command, showUi, value) {
            if (window.__tg.execArmed === true && String(command).toLowerCase() === 'copy') {
                window.__tg.execCalls += 1;
                if (window.__tg.execThrow === true) {
                    const thrown = new Error('planted execCommand copy throw (QA)');
                    throw thrown;
                }
                window.__tg.execLastResult = window.__tg.execResult === true;
                return window.__tg.execLastResult;
            }
            return originalExecCommand(command, showUi, value);
        },
    });
}

// Runtime arming helpers (plain flag assignment; no DOM tampering).
async function armWriteMode(page, mode) {
    await page.evaluate((m) => { window.__tg.writeMode = m; }, mode);
}
async function armRejectThenFalse(page) {
    await page.evaluate(() => {
        window.__tg.writeMode = 'reject';
        window.__tg.execArmed = true;
        window.__tg.execResult = false;
    });
}
async function armRejectThenTrue(page) {
    await page.evaluate(() => {
        window.__tg.writeMode = 'reject';
        window.__tg.execArmed = true;
        window.__tg.execResult = true;
    });
}
async function disarmAllPlants(page) {
    await page.evaluate(() => {
        window.__tg.writeMode = 'allow';
        window.__tg.clipboardAvailable = true;
        window.__tg.execArmed = false;
    });
}
async function armStorageDenied(page) {
    await page.evaluate(() => { window.__tg.storageDenied = true; });
}
async function resolveParkedPromise(page) {
    return page.evaluate(() => {
        const resolve = window.__tg.parked.shift();
        if (typeof resolve === 'function') { resolve(); return true; }
        return false;
    });
}

// ---------------------------------------------------------------------------
// Observation helpers (post-state reads only; nothing is injected).
// ---------------------------------------------------------------------------

async function storageCheckpoint(page, journeyLabel, label) {
    const snap = await page.evaluate(() => {
        const read = (store) => {
            const out = {};
            try {
                for (let i = 0; i < store.length; i++) {
                    const k = store.key(i);
                    out[k] = store.getItem(k);
                }
            } catch (error) { out.__storageReadError = String(error && error.message || error); }
            return out;
        };
        let cookie = '';
        try { cookie = document.cookie; } catch (error) { cookie = `__cookieReadError:${error && error.message}`; }
        return { session: read(sessionStorage), local: read(localStorage), cookie };
    });
    return { journey: journeyLabel, label, snap };
}

function diffSnapshots(before, after) {
    const diffs = [];
    const stores = [['session', 'session'], ['local', 'local']];
    for (const [store] of stores) {
        const a = before.snap[store] || {};
        const b = after.snap[store] || {};
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        for (const k of keys) {
            if (k === '__storageReadError') continue;
            if (!(k in a)) diffs.push({ store, key: k, kind: 'added', before: undefined, after: b[k] });
            else if (!(k in b)) diffs.push({ store, key: k, kind: 'removed', before: a[k], after: undefined });
            else if (a[k] !== b[k]) diffs.push({ store, key: k, kind: 'changed', before: a[k], after: b[k] });
        }
    }
    if (before.snap.cookie !== after.snap.cookie) {
        diffs.push({ store: 'cookie', key: 'document.cookie', kind: 'changed', before: before.snap.cookie, after: after.snap.cookie });
    }
    return diffs;
}

const allCheckpoints = [];

async function checkpoint(page, journeyLabel, label) {
    const cp = await storageCheckpoint(page, journeyLabel, label);
    allCheckpoints.push(cp);
    return cp;
}

async function readModalState(page) {
    return page.evaluate(() => {
        const container = document.getElementById('textoModalContainer');
        const title = container ? container.querySelector('.texto-modal__title') : null;
        const textarea = document.getElementById('textoModalTextarea');
        const value = textarea ? textarea.value : null;
        return {
            modalCount: document.querySelectorAll('#textoModalContainer').length,
            title: title ? title.textContent.trim() : '',
            text: value,
            readonly: textarea ? textarea.readOnly : null,
            textFields: typeof value === 'string' ? value.split('\t').length : 0,
        };
    });
}

async function readClipboardText(page) {
    return page.evaluate(async () => {
        try { return { ok: true, text: await navigator.clipboard.readText() }; }
        catch (error) { return { ok: false, error: String(error && error.message || error) }; }
    });
}

/** Click the real Estructurar CSV button and read the post-state. The
 * clipboard delivery signal requires a FRESH 497-row (pre-click clipboard is
 * compared so a stale row from an earlier step is never mistaken for a new
 * delivery); after observation any open manual modal is closed through its
 * real `Cerrar` button so later supported clicks are not intercepted. */
async function clickCsvAndObserve(page) {
    const pre = await readClipboardText(page);
    await page.click('#btnEstructurarCSV');
    await page.waitForTimeout(900);
    const [obs, clip] = await Promise.all([readModalState(page), readClipboardText(page)]);
    const clipboardText = clip.ok ? clip.text : null;
    const freshClipboardRow = clip.ok && typeof clip.text === 'string'
        && clip.text.split('\t').length === CSV_FIELD_COUNT
        && !(pre.ok && pre.text === clip.text);
    const result = {
        bodyText: await page.evaluate(() => document.body.innerText),
        modalCount: obs.modalCount,
        modalTitle: obs.title,
        modalText: obs.text,
        clipboardText,
        clipboardError: clip.ok ? null : clip.error,
        freshClipboardRow,
    };
    if (obs.modalCount > 0) {
        try {
            await page.click('#closeModalBtn');
            await page.waitForFunction(() => !document.getElementById('textoModalContainer'), null, { timeout: 5000 });
        } catch (error) { /* leftover modal is reported by the observation, never hidden */ }
    }
    return result;
}

function csvDelivered(obs) {
    const fromClipboard = obs.freshClipboardRow === true;
    const fromModal = obs.modalTitle.includes(CSV_MODAL_TITLE_TOKEN)
        && typeof obs.modalText === 'string'
        && obs.modalText.split('\t').length === CSV_FIELD_COUNT;
    return fromClipboard || fromModal;
}

function csvDeliveredVia(obs) {
    if (obs.freshClipboardRow === true) return 'clipboard-497';
    if (obs.modalTitle.includes(CSV_MODAL_TITLE_TOKEN) && typeof obs.modalText === 'string' && obs.modalText.split('\t').length === CSV_FIELD_COUNT) return 'csv-manual-modal-497';
    return 'none';
}

function bannedClaimsPresent(obs) {
    return BANNED_SUCCESS_CLAIMS.filter((token) => obs.bodyText.includes(token));
}

async function clickTxtAndWait(page) {
    await page.click('#btnExportarTXT');
    await page.waitForTimeout(900);
}

/** Supported TXT journey step that ends in the real manual modal (clipboard
 * rejection planted). Returns the modal state. */
async function txtExportAwaitModal(page) {
    await page.click('#btnExportarTXT');
    await page.waitForSelector('#textoModalContainer .texto-modal__title', { timeout: 10000 });
    await page.waitForTimeout(400);
    return readModalState(page);
}

async function closeModal(page) {
    const present = await page.evaluate(() => !!document.getElementById('textoModalContainer'));
    if (!present) return; // already closed (e.g. #620 auto-close after a truthful success)
    await page.click('#closeModalBtn');
    await page.waitForFunction(() => !document.getElementById('textoModalContainer'), null, { timeout: 5000 });
}

/** Real manual copy: disarm plants, focus the readonly textarea with a real
 * click, real keyboard Ctrl+A + Ctrl+C, then verify the REAL clipboard. */
async function realManualCopy(page) {
    await disarmAllPlants(page);
    await page.click('#textoModalTextarea');
    await keyboardSelectAllCopy(page);
    const clip = await readClipboardText(page);
    return clip;
}

async function keyboardSelectAllCopy(page) {
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(300);
}

/** Search for an explicit professional attestation control («He copiado el
 * TXT» / «He guardado el TXT») through supported selectors only. */
async function findAttestationControl(page) {
    return page.evaluate(() => {
        const pattern = /he\s+(copiado|guardado)\s+el\s+txt/i;
        const candidates = Array.from(document.querySelectorAll('button, [role="button"], a, input[type="button"], input[type="submit"], label'));
        const match = candidates.find((el) => {
            const label = `${el.textContent || ''} ${el.getAttribute && el.getAttribute('aria-label') || ''} ${el.title || ''} ${el.value || ''}`;
            return pattern.test(label);
        });
        if (!match) return { found: false };
        return {
            found: true,
            tag: match.tagName.toLowerCase(),
            id: match.id || '',
            label: (match.textContent || match.value || '').trim().slice(0, 120),
        };
    });
}

/** Compute the cutover adapter reference row (spec story 15 names this public
 * boundary as the byte-equality reference; used ONLY as the comparison
 * source, never as an assertion shortcut for delivery). */
async function adapterReferenceRow(page, { kind, pathology }) {
    return page.evaluate(({ kindArg, pathologyArg }) => {
        try {
            const collect = kindArg === 'seguimiento'
                ? HubTools.form.recopilarDatosFormularioSeguimiento
                : HubTools.form.recopilarDatosFormulario;
            if (typeof collect !== 'function') return { ok: false, error: 'collector unavailable' };
            const datos = collect.call(HubTools.form);
            const act = HubTools.reumaActContract.createVisitAct({
                kind: kindArg,
                patientRef: datos.idPaciente,
                pathology: pathologyArg,
                payload: datos,
            });
            if (!act || act.ok !== true) return { ok: false, error: 'visit act rejected' };
            const projection = HubTools.reumaLegacyExportAdapter.projectVisitAct497(act);
            if (!projection || projection.ok !== true || typeof projection.row !== 'string') {
                return { ok: false, error: 'projection rejected' };
            }
            return { ok: true, row: projection.row, fields: projection.row.split('\t').length };
        } catch (error) {
            return { ok: false, error: String(error && error.message || error) };
        }
    }, { kindArg: kind, pathologyArg: pathology });
}

// ---------------------------------------------------------------------------
// Aggregated cross-journey collectors.
// ---------------------------------------------------------------------------

const sentinelViolations = []; // { journey, label, key, kind }
const storageWriteViolations = []; // { journey, label, diff }
const errorViolations = []; // { journey, kind, message }

function classifyJourneyErrors(journeyLabel, entry) {
    for (const message of entry.pageErrors) errorViolations.push({ journey: journeyLabel, kind: 'pageerror', message });
    for (const message of entry.consoleErrors) {
        if (!CLASSIFIED_CONSOLE_ERRORS.some((cls) => message.includes(cls))) {
            errorViolations.push({ journey: journeyLabel, kind: 'console-error', message });
        }
    }
}

function auditCheckpoints(journeyLabel) {
    const cps = allCheckpoints.filter((cp) => cp.journey === journeyLabel);
    for (let i = 1; i < cps.length; i++) {
        const diffs = diffSnapshots(cps[i - 1], cps[i]);
        for (const diff of diffs) {
            if (SENTINEL_KEYS.includes(diff.key) || diff.key === (auditCheckpoints.matchingKeyInPlay || '')) {
                sentinelViolations.push({ journey: journeyLabel, label: cps[i].label, ...diff });
            } else {
                storageWriteViolations.push({ journey: journeyLabel, label: cps[i].label, ...diff });
            }
        }
    }
    // Sentinel PRESENCE check on the first checkpoint of the journey.
    if (cps.length > 0) {
        const first = cps[0];
        for (const key of SENTINEL_KEYS) {
            const store = key === SENTINEL_PENDING_KEY ? 'local' : 'session';
            if (!(key in (first.snap[store] || {}))) {
                sentinelViolations.push({ journey: journeyLabel, label: first.label, key, kind: 'missing-at-start' });
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Main run.
// ---------------------------------------------------------------------------

let browser;
let exitCode = 1;
try {
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const origin = `http://127.0.0.1:${server.address().port}`;

    browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
    console.log(`REUMA-TXT-GATE-FROZEN-ACCEPTANCE (chromium ${browser.version()}, node ${process.version})`);
    console.log(`Frozen package for Train 20 / #621. Baseline expectation: RED on the ${witnesses.filter((w) => w.baseline === 'RED').length} witnesses marked RED, PASS on the rest (W22 bfcache conditional).\n`);

    // =====================================================================
    // J-BLOCK (PV): CSV before TXT, empty identity, storage denied.
    // =====================================================================
    {
        const jl = 'J-BLOCK';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-001', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            // W01 — story 1.
            let obs = await clickCsvAndObserve(page);
            const pendingStepMessageShown = /txt/i.test(obs.bodyText);
            if (!csvDelivered(obs) && pendingStepMessageShown) {
                witnessPass(W01, `no 497 delivery (${csvDeliveredVia(obs)}), pending-step feedback present`);
            } else {
                witnessFail(W01, `delivered=${csvDelivered(obs)} via=${csvDeliveredVia(obs)} pendingStepMessage=${pendingStepMessageShown}`);
            }
            await checkpoint(page, jl, 'after-csv-blocked');

            // W02 — story 16, empty identity context (CIP cleared, supported fill).
            await openAncestorCollapsibles(page, '#idPaciente');
            await page.fill('#idPaciente', '');
            obs = await clickCsvAndObserve(page);
            const identityObs = obs;
            if (!csvDelivered(identityObs)) {
                witnessPass(W02, `no 497 delivery with empty CIP (via=${csvDeliveredVia(identityObs)})`);
            } else {
                witnessFail(W02, `CSV delivered with empty identity context (via=${csvDeliveredVia(identityObs)})`);
            }
            await checkpoint(page, jl, 'after-empty-identity');

            // W03 — story 16, storage denied (armed AFTER snapshots/checkpoints).
            await armStorageDenied(page);
            await openAncestorCollapsibles(page, '#idPaciente');
            await page.fill('#idPaciente', 'SYN-GATE-001');
            obs = await clickCsvAndObserve(page);
            const storageDeniedCalls = await page.evaluate(() => window.__tg.storageDeniedCalls);
            if (!csvDelivered(obs)) {
                witnessPass(W03, `no 497 delivery under storage denial (via=${csvDeliveredVia(obs)}, denial-hit=${storageDeniedCalls})`);
            } else {
                witnessFail(W03, `CSV delivered under storage denial (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-POS (PV): clipboard-resolving TXT authorizes; 497 equality; TXT text
    // invariants; same-instance re-export; presentation-only change.
    // =====================================================================
    {
        const jl = 'J-POS';
        const cip = 'SYN-GATE-POS-1';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip, isSeguimiento: false });
            await armWriteMode(page, 'allow');
            await checkpoint(page, jl, 'after-fill');

            // Two TXT exports with resolving clipboard (also W06 source).
            await clickTxtAndWait(page);
            const txt1 = await readClipboardText(page);
            await checkpoint(page, jl, 'after-txt-1');
            await clickTxtAndWait(page);
            const txt2 = await readClipboardText(page);
            await checkpoint(page, jl, 'after-txt-2');

            // Baseline diagnostic (non-fatal): legacy marker key format check.
            const markerDiagnostic = await page.evaluate(({ prefix, expectedKey }) => {
                const keys = [];
                try {
                    for (let i = 0; i < sessionStorage.length; i++) {
                        const k = sessionStorage.key(i);
                        if (k.startsWith(prefix)) keys.push(k);
                    }
                } catch (error) { /* ignore */ }
                return { keys, expectedKeyPresent: keys.includes(expectedKey) };
            }, { prefix: GATE_STORAGE_PREFIX, expectedKey: `${GATE_STORAGE_PREFIX}${cip}__2026-02-10__primera__espa` });
            if (markerDiagnostic.keys.length > 0 && !markerDiagnostic.expectedKeyPresent) {
                console.log(`  [INFO] baseline marker key format differs from the frozen fixture: observed=${JSON.stringify(markerDiagnostic.keys)}`);
            }

            // W06 — TXT note invariants (same data => identical modulo timestamp).
            const stripTimestamp = (t) => String(t || '').split('\n').filter((line) => !line.startsWith('Generado el')).join('\n');
            const txt1Ok = txt1.ok && txt1.text.includes(TXT_NOTE_HEADER_TOKEN) && txt1.text.includes(`CIP: ${cip}`);
            const txtStable = txt1.ok && txt2.ok && stripTimestamp(txt1.text) === stripTimestamp(txt2.text);
            if (txt1Ok && txtStable) {
                witnessPass(W06, `TXT note keeps header/CIP invariants and is stable across exports (lengths ${txt1.text.length}/${txt2.text.length})`);
            } else {
                witnessFail(W06, `header/CIP ok=${txt1Ok} stable=${txtStable} txt1=${txt1.ok ? 'ok' : txt1.error} txt2=${txt2.ok ? 'ok' : txt2.error}`);
            }

            // W04 + W05 — CSV enabled after clipboard-confirmed TXT; 497 equality.
            let obs = await clickCsvAndObserve(page);
            if (!csvDelivered(obs)) {
                witnessFail(W04, `CSV not delivered after clipboard-confirmed TXT (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessPass(W04, `497 CSV delivered (${csvDeliveredVia(obs)}) after resolving clipboard TXT`);
            }
            await checkpoint(page, jl, 'after-csv-1');
            const ref = await adapterReferenceRow(page, { kind: 'primera_visita', pathology: 'espa' });
            const actualRow = typeof obs.clipboardText === 'string' && obs.clipboardText.split('\t').length === CSV_FIELD_COUNT
                ? obs.clipboardText
                : (csvDelivered(obs) ? obs.modalText : null);
            if (!ref.ok) {
                witnessFail(W05, `adapter reference unavailable: ${ref.error}`);
            } else if (actualRow === ref.row) {
                witnessPass(W05, `delivered row byte-equals projectVisitAct497 row (${ref.fields} fields, ${ref.row.length} chars)`);
            } else {
                witnessFail(W05, `byte inequality: delivered=${actualRow ? actualRow.length : 'null'} chars, reference=${ref.row.length} chars, equal=${actualRow === ref.row}`);
            }

            // W07 — same instance re-export without repeating TXT.
            await armWriteMode(page, 'reject');
            obs = await clickCsvAndObserve(page);
            if (csvDelivered(obs)) {
                witnessPass(W07, `second CSV export in the same instance delivered without a new TXT (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessFail(W07, `same-instance re-export was forced to repeat TXT (via=${csvDeliveredVia(obs)})`);
            }
            await checkpoint(page, jl, 'after-csv-2');

            // W08 — presentation-only change: edit then restore the identical value.
            await openAncestorCollapsibles(page, '#evaGlobal');
            await page.fill('#evaGlobal', '7');
            await openAncestorCollapsibles(page, '#evaGlobal');
            await page.fill('#evaGlobal', '6');
            obs = await clickCsvAndObserve(page);
            if (csvDelivered(obs)) {
                witnessPass(W08, `change+restore (payload identical) did not force TXT repetition (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessFail(W08, `payload-identical change forced repetition (via=${csvDeliveredVia(obs)})`);
            }
            await checkpoint(page, jl, 'after-change-restore');

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-MODAL-REJECT (PV): clipboard reject -> modal merely opened -> closed
    // without confirmation. Stories 3 and 7.
    // =====================================================================
    {
        const jl = 'J-MODAL-REJECT';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-REJ-1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            const modal = await txtExportAwaitModal(page);
            const modalOpened = modal.modalCount === 1 && modal.title.includes(TXT_MODAL_TITLE_TOKEN) && typeof modal.text === 'string' && modal.text.length > 0;
            await closeModal(page);
            const bodyAfterClose = await page.evaluate(() => document.body.innerText);

            // W10 — story 7: no success claim after close without confirmation.
            const bannedAfterClose = BANNED_SUCCESS_CLAIMS.filter((token) => bodyAfterClose.includes(token));
            // W09 — story 3: CSV stays blocked after reject + mere modal open/close.
            await armWriteMode(page, 'reject');
            const obs = await clickCsvAndObserve(page);

            if (!modalOpened) {
                witnessFail(W09, `precondition failed: TXT reject did not open the real manual modal (modalCount=${modal.modalCount}, title=${JSON.stringify(modal.title)})`);
                witnessFail(W10, 'precondition failed: modal not opened by the supported TXT journey');
            } else if (!csvDelivered(obs) && bannedAfterClose.length === 0) {
                witnessPass(W09, `reject + modal merely opened/closed: no 497 delivery (via=${csvDeliveredVia(obs)})`);
                witnessPass(W10, `no success claim after close (banned tokens absent), CSV blocked`);
            } else {
                witnessFail(W09, `CSV delivered after reject + modal open/close (via=${csvDeliveredVia(obs)}) — legacy marker written on modal open`);
                witnessFail(W10, `success claim present after close without confirmation: ${JSON.stringify(bannedAfterClose)}; delivered=${csvDelivered(obs)}`);
            }
            await checkpoint(page, jl, 'after-csv');

            // W31 — story 17: Solicitud FH sibling journey on PV: no gate controls.
            await openAncestorCollapsibles(page, '#btnSolicitudFH');
            await page.click('#btnSolicitudFH');
            await page.waitForTimeout(900);
            const fhState = await page.evaluate(() => {
                const modal = document.getElementById('textoModalContainer');
                return {
                    modalCount: document.querySelectorAll('#textoModalContainer').length,
                    title: (document.querySelector('#textoModalContainer .texto-modal__title') || { textContent: '' }).textContent.trim(),
                    modalText: modal ? modal.innerText : '',
                    bodyText: document.body.innerText,
                };
            });
            const fhBanned = BANNED_SUCCESS_CLAIMS.filter((token) => fhState.modalText.includes(token));
            const fhNoGateControls = !(await findAttestationControl(page)).found
                && !fhState.bodyText.includes('Los datos de la visita han cambiado desde el TXT');
            if ((fhState.modalCount === 0 || fhState.title.includes(FH_MODAL_TITLE_TOKEN)) && fhBanned.length === 0 && fhNoGateControls) {
                witnessPass(W31, `FH journey shows no TXT-gate controls/claims (modal=${fhState.modalCount}, title=${JSON.stringify(fhState.title)})`);
            } else {
                witnessFail(W31, `FH journey polluted by TXT gate: banned=${JSON.stringify(fhBanned)} gateControls=${!fhNoGateControls} title=${JSON.stringify(fhState.title)}`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-MODAL-COPIAR (PV): modal Copiar real success enables CSV (story 4).
    // =====================================================================
    {
        const jl = 'J-MODAL-COPIAR';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-COPY-1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            const modal = await txtExportAwaitModal(page);
            await armRejectThenTrue(page);
            await page.click('#copyToClipboardModalBtn');
            await page.waitForTimeout(900);
            const afterCopy = await page.evaluate(() => document.body.innerText);
            await closeModal(page);
            await disarmAllPlants(page); // writeMode allow for the CSV clipboard delivery
            const obs = await clickCsvAndObserve(page);

            const copySucceeded = afterCopy.includes('Contenido copiado al portapapeles.');
            if (modal.modalCount === 1 && copySucceeded && csvDelivered(obs)) {
                witnessPass(W11, `modal Copiar real success (claim shown) enabled the 497 CSV (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessFail(W11, `modal=${modal.modalCount} copySuccessClaim=${copySucceeded} delivered=${csvDelivered(obs)} via=${csvDeliveredVia(obs)}`);
            }
            await checkpoint(page, jl, 'after-csv');

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-MODAL-COPIAR-FAIL (PV): modal Copiar failure keeps CSV blocked and the
    // modal/text preserved (#620 protection, story 4).
    // =====================================================================
    {
        const jl = 'J-MODAL-COPIAR-FAIL';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-COPYF-1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            const before = await txtExportAwaitModal(page);
            await armRejectThenFalse(page);
            await page.click('#copyToClipboardModalBtn');
            await page.waitForTimeout(900);
            const after = await readModalState(page);
            const preserved = after.modalCount === 1 && after.text === before.text;
            await closeModal(page);
            await armWriteMode(page, 'reject');
            const obs = await clickCsvAndObserve(page);

            if (!preserved || csvDelivered(obs)) {
                witnessFail(W12, `modalPreserved=${preserved} delivered=${csvDelivered(obs)} via=${csvDeliveredVia(obs)} — CSV authorized although the only copy attempt failed`);
            } else {
                witnessPass(W12, `Copiar failure: modal stayed open with the byte-identical text, CSV stays blocked (via=${csvDeliveredVia(obs)})`);
            }
            await checkpoint(page, jl, 'after-csv');

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-MANUAL-ATTEST (PV): real Ctrl+A/Ctrl+C + explicit attestation control
    // (story 5). Baseline has NO attestation control -> RED.
    // =====================================================================
    {
        const jl = 'J-MANUAL-ATTEST';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-MAN-1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            const modal = await txtExportAwaitModal(page);
            const clip = await realManualCopy(page);
            const manualCopyWorked = clip.ok && clip.text === modal.text;
            const attestation = await findAttestationControl(page);
            let csvOk = false;
            let obs = null;
            if (attestation.found && !attestation.id) {
                witnessFail(W13, `attestation control found (${attestation.label}) but without an id to perform a supported click on it`);
            } else if (attestation.found) {
                await page.click(`#${attestation.id}`); // supported click on the found control
                await page.waitForTimeout(500);
                await closeModal(page).catch(async () => { /* control may close the modal itself */ });
                await disarmAllPlants(page);
                obs = await clickCsvAndObserve(page);
                csvOk = csvDelivered(obs);
            }

            if (!manualCopyWorked) {
                witnessFail(W13, `precondition failed: real manual Ctrl+A/Ctrl+C did not deliver the modal text to the clipboard (${clip.ok ? 'mismatch' : clip.error})`);
            } else if (!attestation.found) {
                witnessFail(W13, `real manual copy worked (${clip.text.length} chars) but NO explicit attestation control («He copiado el TXT» / «He guardado el TXT») exists anywhere in the flow`);
            } else if (csvOk) {
                witnessPass(W13, `manual copy + explicit attestation control (${attestation.label}) enabled the 497 CSV (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessFail(W13, `attestation control present (${attestation.label}) but CSV not delivered after clicking it (via=${obs ? csvDeliveredVia(obs) : 'n/a'})`);
            }
            await checkpoint(page, jl, 'after-attest');

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-MANUAL-NO-ATTEST (PV): real manual copy WITHOUT any attestation must
    // leave CSV blocked (story 5).
    // =====================================================================
    {
        const jl = 'J-MANUAL-NO-ATTEST';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-MAN2-1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            const modal = await txtExportAwaitModal(page);
            const clip = await realManualCopy(page);
            await closeModal(page);
            await armWriteMode(page, 'reject');
            const obs = await clickCsvAndObserve(page);

            if (!clip.ok || clip.text !== modal.text) {
                witnessFail(W14, `precondition failed: real manual copy did not work (${clip.ok ? 'mismatch' : clip.error})`);
            } else if (csvDelivered(obs)) {
                witnessFail(W14, `CSV delivered after a bare manual copy with NO explicit attestation (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessPass(W14, `bare manual copy without attestation keeps CSV blocked (via=${csvDeliveredVia(obs)})`);
            }
            await checkpoint(page, jl, 'after-csv');

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-DOWNLOAD (PV): clipboard API unavailable -> TXT fails honestly; no CSV
    // authorization without an explicit download/manual confirmation (story 6).
    // =====================================================================
    {
        const jl = 'J-DOWNLOAD';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-DL-1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            await page.evaluate(() => { window.__tg.clipboardAvailable = false; });
            await clickTxtAndWait(page);
            const bodyAfterTxt = await page.evaluate(() => document.body.innerText);
            await checkpoint(page, jl, 'after-txt-unavailable');

            const obs = await clickCsvAndObserve(page);
            const honestFeedback = /error|no se pudo/i.test(bodyAfterTxt);
            if (!csvDelivered(obs)) {
                witnessPass(W15, `no CSV authorization after a TXT attempt without clipboard success and without any explicit download/manual confirmation (downloads fired=${entry.downloads.length}, honestFeedback=${honestFeedback})`);
            } else {
                witnessFail(W15, `CSV delivered although no clipboard success and no explicit confirmation occurred (via=${csvDeliveredVia(obs)}, downloads=${entry.downloads.length})`);
            }
            await checkpoint(page, jl, 'after-csv');

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-STALE-EDIT (PV): parked promise resolving after an invalidating edit
    // (story 10).
    // =====================================================================
    {
        const jl = 'J-STALE-EDIT';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-STALE-1', isSeguimiento: false });
            await armWriteMode(page, 'park');
            await checkpoint(page, jl, 'after-fill');

            await clickTxtAndWait(page); // writeText parks (P1)
            const parkedCount = await page.evaluate(() => window.__tg.parked.length);
            await openAncestorCollapsibles(page, '#evaGlobal');
            await page.fill('#evaGlobal', '7'); // invalidating edit while P1 in flight
            await armWriteMode(page, 'reject');
            let obs = await clickCsvAndObserve(page);
            const blockedBeforeResolution = !csvDelivered(obs);
            await checkpoint(page, jl, 'after-edit-csv');

            const resolved = await resolveParkedPromise(page);
            await page.waitForTimeout(700);
            const bodyAfterLateResolution = await page.evaluate(() => document.body.innerText);
            const bannedLate = BANNED_SUCCESS_CLAIMS.filter((token) => bodyAfterLateResolution.includes(token));
            obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-late-resolution-csv');

            if (parkedCount !== 1 || !resolved) {
                witnessFail(W16, `harness precondition failed: parked=${parkedCount} resolved=${resolved}`);
            } else if (!blockedBeforeResolution) {
                witnessFail(W16, `precondition failed: CSV was delivered before the stale promise even resolved (via=${csvDeliveredVia(obs)})`);
            } else if (csvDelivered(obs)) {
                witnessFail(W16, `stale promise resolving AFTER the invalidating edit authorized CSV (via=${csvDeliveredVia(obs)}); late success claims=${JSON.stringify(bannedLate)}`);
            } else {
                witnessPass(W16, `stale promise resolving after the edit did NOT authorize CSV (blocked before and after resolution; late success claims=${JSON.stringify(bannedLate)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-STALE-SECOND (PV): two TXT exports; the first one's promise resolving
    // late must not authorize; the current one must (story 10).
    // =====================================================================
    {
        const jl = 'J-STALE-SECOND';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-STALE-2', isSeguimiento: false });
            await armWriteMode(page, 'park');
            await checkpoint(page, jl, 'after-fill');

            await clickTxtAndWait(page); // P1 parked
            await clickTxtAndWait(page); // P2 parked (current export)
            const parkedCount = await page.evaluate(() => window.__tg.parked.length);
            await armWriteMode(page, 'reject');

            const r1 = await resolveParkedPromise(page); // STALE result lands
            await page.waitForTimeout(700);
            let obs = await clickCsvAndObserve(page);
            const staleDidNotAuthorize = !csvDelivered(obs);
            await checkpoint(page, jl, 'after-stale-resolution');

            const r2 = await resolveParkedPromise(page); // CURRENT result lands
            await page.waitForTimeout(700);
            obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-current-resolution');

            if (parkedCount !== 2 || !r1 || !r2) {
                witnessFail(W17, `harness precondition failed: parked=${parkedCount} r1=${r1} r2=${r2}`);
            } else if (!staleDidNotAuthorize) {
                witnessFail(W17, `the FIRST export's stale promise authorized CSV after a second TXT export started (via=${csvDeliveredVia(obs)})`);
            } else if (!csvDelivered(obs)) {
                witnessFail(W17, `precondition inverted: even the CURRENT export's resolving result did not enable CSV (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessPass(W17, `stale P1 did not authorize after the second export; the current P2 result did (final via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-EDIT (PV): exportable-field edit after TXT -> blocked + exact message
    // (story 8).
    // =====================================================================
    {
        const jl = 'J-EDIT';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-EDIT-1', isSeguimiento: false });
            await armWriteMode(page, 'allow');
            await checkpoint(page, jl, 'after-fill');

            await clickTxtAndWait(page); // clipboard-confirmed TXT on the original data
            await openAncestorCollapsibles(page, '#evaGlobal');
            await page.fill('#evaGlobal', '7'); // EVA_Global appears in the exportable payload
            await armWriteMode(page, 'reject');
            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-edit-csv');

            const messageShown = obs.bodyText.includes(STORY8_MESSAGE);
            if (csvDelivered(obs)) {
                witnessFail(W18, `CSV delivered after an exportable-field edit (via=${csvDeliveredVia(obs)}); story8 message shown=${messageShown}`);
            } else if (!messageShown) {
                witnessFail(W18, `CSV blocked (good) but the exact story-8 message is NOT shown; body snippet=${JSON.stringify(obs.bodyText.slice(0, 300))}`);
            } else {
                witnessPass(W18, `CSV blocked after exportable edit and the exact spec message is shown verbatim`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-RELOAD / J-NEWPATIENT / J-NAV (PV): instance-loss witnesses (story 11).
    // =====================================================================
    {
        const jl = 'J-RELOAD';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-RL-1', isSeguimiento: false });
            await armWriteMode(page, 'allow');
            await checkpoint(page, jl, 'after-fill');
            await clickTxtAndWait(page); // authorized
            await checkpoint(page, jl, 'after-txt');

            await page.reload({ waitUntil: 'load', timeout: 45000 });
            await fillClinicalBase(page, { cip: 'SYN-GATE-RL-1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-reload-csv');

            if (csvDelivered(obs)) {
                witnessFail(W19, `CSV still delivered after reload with identical data (via=${csvDeliveredVia(obs)}) — authorization survived the reload`);
            } else {
                witnessPass(W19, `authorization lost after reload; CSV blocked (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    {
        const jl = 'J-NEWPATIENT';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-NP-1', isSeguimiento: false });
            await armWriteMode(page, 'allow');
            await checkpoint(page, jl, 'after-fill');
            await clickTxtAndWait(page); // authorized
            await checkpoint(page, jl, 'after-txt');

            await openAncestorCollapsibles(page, '#btnNuevoPaciente');
            await Promise.all([page.waitForNavigation({ waitUntil: 'load', timeout: 45000 }), page.click('#btnNuevoPaciente')]);
            await fillClinicalBase(page, { cip: 'SYN-GATE-NP-1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-nuevocliente-csv');

            if (csvDelivered(obs)) {
                witnessFail(W20, `CSV still delivered after \u00abNuevo paciente\u00bb with identical data (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessPass(W20, `authorization lost after \u00abNuevo paciente\u00bb; CSV blocked (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    {
        const jl = 'J-NAV';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-NAV-1', isSeguimiento: false });
            await armWriteMode(page, 'allow');
            await checkpoint(page, jl, 'after-fill');
            await clickTxtAndWait(page); // authorized
            await checkpoint(page, jl, 'after-txt');

            await page.goto(`${origin}/${PAGE_DASHBOARD}?id=SYN-DASH-900`, { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(600);
            await checkpoint(page, jl, 'away-dashboard');
            await page.goto(`${origin}/${PAGE_PRIMERA}`, { waitUntil: 'load', timeout: 45000 });
            await fillClinicalBase(page, { cip: 'SYN-GATE-NAV-1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-nav-csv');

            if (csvDelivered(obs)) {
                witnessFail(W21, `CSV still delivered after navigating away and back (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessPass(W21, `authorization lost after navigation away + back; CSV blocked (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-BFCAACHE (PV): bfcache persisted restore (story 11). Conditional on
    // the environment actually producing pageshow.persisted = true.
    // =====================================================================
    {
        const jl = 'J-BFCAACHE';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-BF-1', isSeguimiento: false });
            await armWriteMode(page, 'allow');
            await checkpoint(page, jl, 'after-fill');
            await clickTxtAndWait(page); // authorized
            await checkpoint(page, jl, 'after-txt');

            await page.goto(`${origin}/${PAGE_DASHBOARD}?id=SYN-DASH-900`, { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(600);
            await page.goBack({ timeout: 20000 }).catch(() => {});
            await page.waitForTimeout(900);
            await page.goForward({ timeout: 20000 }).catch(() => {});
            await page.waitForTimeout(900);
            const shows = await page.evaluate(() => (window.__tg ? window.__tg.pageShows : []));
            const restoredPersisted = Array.isArray(shows) && shows.some((s) => s.persisted === true);
            await checkpoint(page, jl, 'after-bfcache');

            if (!restoredPersisted) {
                witnessSkip(W22, `environment never produced a persisted (bfcache) restore; pageShows=${JSON.stringify(shows).slice(0, 300)}`);
            } else {
                // The form DOM is restored by bfcache; click CSV directly.
                await armWriteMode(page, 'reject');
                const obs = await clickCsvAndObserve(page);
                await checkpoint(page, jl, 'after-bfcache-csv');
                if (csvDelivered(obs)) {
                    witnessFail(W22, `CSV still delivered after a persisted (bfcache) restore (via=${csvDeliveredVia(obs)})`);
                } else {
                    witnessPass(W22, `authorization lost after bfcache persisted restore; CSV blocked (via=${csvDeliveredVia(obs)})`);
                }
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-SEG-POS (Seguimiento): clipboard resolve enables CSV; 497 equality;
    // same-instance re-export (stories 2/13/15).
    // =====================================================================
    {
        const jl = 'J-SEG-POS';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_SEGUIMIENTO}?id=SYN-SEG-200`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-SEG-200', isSeguimiento: true });
            await armWriteMode(page, 'allow');
            await checkpoint(page, jl, 'after-fill');

            await clickTxtAndWait(page);
            await checkpoint(page, jl, 'after-txt');
            const firstCsv = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv-1');

            const ref = await adapterReferenceRow(page, { kind: 'seguimiento', pathology: 'espa' });
            const actualRow = typeof firstCsv.clipboardText === 'string' && firstCsv.clipboardText.split('\t').length === CSV_FIELD_COUNT
                ? firstCsv.clipboardText
                : (csvDelivered(firstCsv) ? firstCsv.modalText : null);

            await armWriteMode(page, 'reject');
            const reCsv = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv-2');

            if (!csvDelivered(firstCsv) || !csvDelivered(reCsv)) {
                witnessFail(W24, `Seguimiento clipboard-confirmed TXT -> CSV delivered=${csvDelivered(firstCsv)} (${csvDeliveredVia(firstCsv)}); same-instance re-export delivered=${csvDelivered(reCsv)} (${csvDeliveredVia(reCsv)})`);
            } else {
                witnessPass(W24, `Seguimiento 497 CSV delivered after clipboard-confirmed TXT (${csvDeliveredVia(firstCsv)}) and re-exported in the same instance without repeating TXT (${csvDeliveredVia(reCsv)})`);
            }

            if (!ref.ok) {
                witnessFail(W25, `adapter reference unavailable: ${ref.error}`);
            } else if (!csvDelivered(firstCsv)) {
                witnessFail(W25, `no delivered row to compare (delivery failed)`);
            } else if (actualRow === ref.row) {
                witnessPass(W25, `delivered Seguimiento row byte-equals projectVisitAct497 row (${ref.fields} fields)`);
            } else {
                witnessFail(W25, `byte inequality: delivered=${actualRow ? actualRow.length : 'null'} chars, reference=${ref.row.length} chars`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-SEG-REOPEN (Seguimiento): same visit identity reopened via real
    // navigation (identical CIP/fecha/tipo/diagnóstico) — no inherited
    // authorization (story 12).
    // =====================================================================
    {
        const jl = 'J-SEG-REOPEN';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_SEGUIMIENTO}?id=SYN-SEG-200`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-SEG-200', isSeguimiento: true });
            await armWriteMode(page, 'allow');
            await checkpoint(page, jl, 'after-fill');
            await clickTxtAndWait(page); // authorized for THIS instance
            await checkpoint(page, jl, 'after-txt');

            await page.goto(`${origin}/${PAGE_DASHBOARD}?id=SYN-DASH-900`, { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(600);
            await page.goto(`${origin}/${PAGE_SEGUIMIENTO}?id=SYN-SEG-200`, { waitUntil: 'load', timeout: 45000 });
            await fillClinicalBase(page, { cip: 'SYN-SEG-200', isSeguimiento: true }); // identical tuple from the route
            await armWriteMode(page, 'reject');
            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-reopen-csv');

            if (csvDelivered(obs)) {
                witnessFail(W23, `authorization inherited by the reopened visit instance with identical CIP/fecha/tipo/diagn\u00f3stico (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessPass(W23, `reopened instance with identical tuple starts unauthorized; CSV blocked (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-LEGACY-MARKER (PV): planted matching legacy marker NEVER authorizes
    // (story 14).
    // =====================================================================
    {
        const jl = 'J-LEGACY-MARKER';
        auditCheckpoints.matchingKeyInPlay = SENTINEL_MATCHING_KEY;
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: true,
            matchingMarkerKey: SENTINEL_MATCHING_KEY,
            matchingMarkerValue: SENTINEL_MATCHING_VALUE,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-LEG-1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');
            const markerPresent = await page.evaluate((key) => {
                try { return sessionStorage.getItem(key); } catch (error) { return null; }
            }, SENTINEL_MATCHING_KEY);

            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv');

            if (markerPresent === null) {
                witnessFail(W26, `harness precondition failed: the matching legacy marker was not planted (storage plant unavailable)`);
            } else if (csvDelivered(obs)) {
                witnessFail(W26, `CSV delivered thanks to the planted legacy marker matching CIP/fecha (via=${csvDeliveredVia(obs)}) — legacy markers must never authorize`);
            } else {
                witnessPass(W26, `planted matching legacy marker did NOT authorize CSV (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            auditCheckpoints.matchingKeyInPlay = '';
            await context.close();
        }
    }

    // =====================================================================
    // J-DASHBOARD (story 17): dashboard gains no functional TXT gate.
    // =====================================================================
    {
        const jl = 'J-DASHBOARD';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_DASHBOARD}?id=SYN-DASH-900`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await page.waitForTimeout(900);
            await checkpoint(page, jl, 'after-load');
            const state = await page.evaluate(() => ({
                hasTxtButton: !!document.getElementById('btnExportarTXT'),
                hasCsvButton: !!document.getElementById('btnEstructurarCSV'),
                bodyText: document.body.innerText,
            }));
            const attestation = await findAttestationControl(page);
            const gateFree = !state.hasTxtButton && !state.hasCsvButton && !attestation.found
                && !state.bodyText.includes('Los datos de la visita han cambiado desde el TXT')
                && !state.bodyText.includes('Debe exportar TXT de esta visita antes de exportar CSV');
            if (gateFree) {
                witnessPass(W30, `dashboard loads with no TXT/CSV gate controls or gate messaging`);
            } else {
                witnessFail(W30, `dashboard shows gate surfaces it never had: txt=${state.hasTxtButton} csv=${state.hasCsvButton} attestation=${attestation.found}`);
            }
            await checkpoint(page, jl, 'end');

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // Aggregated witnesses: sentinels byte-unchanged (W27), zero gate storage
    // writes (W28), pageerror/console classification (W29).
    // =====================================================================
    if (sentinelViolations.length === 0) {
        witnessPass(W27, `planted legacy markers + hubPendingRows byte-identical across ${allCheckpoints.length} storage checkpoints in every journey`);
    } else {
        witnessFail(W27, `sentinel mutations observed: ${JSON.stringify(sentinelViolations.slice(0, 6))}`);
    }

    if (storageWriteViolations.length === 0) {
        witnessPass(W28, `no new Web Storage writes by the TXT\u2192CSV gate in any journey`);
    } else {
        const keys = [...new Set(storageWriteViolations.map((v) => `${v.store}:${v.key}`))];
        witnessFail(W28, `${storageWriteViolations.length} gate storage write(s) across journeys; keys=${JSON.stringify(keys.slice(0, 8))}`);
    }

    if (errorViolations.length === 0) {
        witnessPass(W29, `pageerror=0 everywhere; console errors only within the classified controlled-failure classes`);
    } else {
        witnessFail(W29, `${errorViolations.length} violation(s): ${JSON.stringify(errorViolations.slice(0, 6))}`);
    }

    // =====================================================================
    // Final per-witness table + totals.
    // =====================================================================
    console.log('\n=== FROZEN ACCEPTANCE PACKAGE — PER-WITNESS TABLE ===');
    console.log('ID   | baseline | verdict | spec              | contract');
    for (const w of witnesses) {
        console.log(`${w.id.padEnd(4)} | ${w.baseline.padEnd(8)} | ${w.verdict.padEnd(7)} | ${w.story.padEnd(17)} | ${w.contract}`);
    }
    const counts = { PASS: 0, FAIL: 0, SKIP: 0, PENDING: 0 };
    for (const w of witnesses) counts[w.verdict] = (counts[w.verdict] || 0) + 1;
    const redExpected = witnesses.filter((w) => w.baseline === 'RED');
    const redExpectedFail = redExpected.filter((w) => w.verdict === 'FAIL').length;
    const redExpectedPass = redExpected.filter((w) => w.verdict === 'PASS').length;
    const passExpected = witnesses.filter((w) => w.baseline === 'PASS');
    const passExpectedFail = passExpected.filter((w) => w.verdict === 'FAIL').length;
    const passExpectedPass = passExpected.filter((w) => w.verdict === 'PASS').length;
    console.log(`\nTOTALS: PASS ${counts.PASS} / FAIL ${counts.FAIL} / SKIP ${counts.SKIP} / PENDING ${counts.PENDING}  (witnesses: ${witnesses.length})`);
    console.log(`Expected-RED witnesses: ${redExpectedFail}/${redExpected.length} RED (legacy gate violated), ${redExpectedPass} unexpectedly PASS`);
    console.log(`Preservation witnesses: ${passExpectedPass}/${passExpected.length} PASS, ${passExpectedFail} FAIL`);
    console.log(`\nREUMA-TXT-GATE-FROZEN-ACCEPTANCE: ${counts.FAIL === 0 ? 'ALL WITNESSES PASS' : 'FAIL'} ${counts.PASS}/${witnesses.length}${counts.SKIP ? ` (+${counts.SKIP} SKIP)` : ''}`);

    exitCode = counts.FAIL === 0 && counts.PENDING === 0
        && witnesses.every((w) => w.verdict !== 'SKIP' || w.id === 'W22')
        ? 0 : 1;
} catch (error) {
    console.error('ENVIRONMENT/HARNESS FAILURE (never a product RED):', error);
    exitCode = 1;
} finally {
    try { if (browser) await browser.close(); } catch { /* ignore */ }
    server.close();
}

process.exit(exitCode);
