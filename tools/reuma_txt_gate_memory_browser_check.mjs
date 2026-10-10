#!/usr/bin/env node
'use strict';
/**
 * T20-01 + T20-02 focused oracle — ephemeral in-memory TXT→CSV gate.
 * TRAIN 20 / #621. Authority (repo-local, read-only):
 *   docs/handoffs/TRAIN_NEXUS_REUMA_TXT_GATE_20.md            (accepted WO)
 *   docs/handoffs/TRAIN_NEXUS_REUMA_TXT_GATE_20_SPEC.md       (accepted spec)
 *   docs/handoffs/TRAIN_NEXUS_REUMA_TXT_GATE_20_TICKETS/01-memory-gate.md (T20-01)
 *   docs/handoffs/TRAIN_NEXUS_REUMA_TXT_GATE_20_TICKETS/02-manual-confirmation.md (T20-02)
 *
 * WHAT THIS ORACLE PROVES (T20-01 only):
 *   D0  deterministic: modules/exportManager.js performs ZERO Web Storage
 *       access (sessionStorage/localStorage/indexedDB/document.cookie).
 *   D1  a planted legacy `HubClinico_TxtExportDone_*` marker matching
 *       CIP/fecha/tipo/diagnóstico NEVER authorizes CSV (story 14).
 *   D2  clipboard-reject TXT that merely opens the manual modal and closes
 *       without confirmation: CSV stays blocked, no success claim (stories 3/7).
 *   D3  planted legacy markers + `hubPendingRows` stay byte-identical across
 *       every journey (never read/migrated/deleted; story 14).
 *   D4  zero NEW Web Storage writes by the TXT→CSV flow in any journey.
 *   D5  clipboard writeText resolving on the real `Exportar TXT` control
 *       enables the 497-column CSV, byte-equal to
 *       `HubTools.reumaLegacyExportAdapter.projectVisitAct497` (stories 2/15).
 *   D6  same-instance CSV re-export without repeating TXT (story 13).
 *   D7  reload with identical data loses the authorization (story 11) —
 *       legacy sessionStorage marker survival made this RED on baseline.
 *   D8  empty identity context fails closed without crash (story 16).
 *   D9  a stale clipboard Promise from a superseded TXT export does NOT
 *       authorize; the current export's resolving result does (story 10).
 *   D10 clipboard API unavailable: TXT fails honestly and never authorizes
 *       CSV (story 6; the manual/attestation path is T20-02's).
 *   D11 Seguimiento: clipboard resolve enables the 497 CSV + same-instance
 *       re-export (stories 2/13).
 *   D12 cross-cutting: pageerror=0 everywhere; console errors only within
 *       the classified controlled-failure classes.
 *
 * T20-02 EXTENSION (manual copy/download confirmation — explicit attestation):
 *   E1  story 4  modal «Copiar» real success (writeText reject + armed
 *       execCommand TRUE) authorizes the gate for the TXT payload snapshot
 *       and enables the 497 CSV (PV).
 *   E2  story 4  modal «Copiar» failure keeps CSV blocked with the modal open
 *       and the byte-identical text, no success claim (PV).
 *   E3  story 5  real keyboard Ctrl+A/Ctrl+C + clicking the explicit
 *       «He copiado el TXT» attestation control: CSV enabled and the approved
 *       wording «TXT confirmado por el profesional» is shown (PV).
 *   E4  story 5  real manual copy WITHOUT any attestation: CSV blocked, no
 *       success claim (Seguimiento).
 *   E5  story 6  clicking «He guardado el TXT» (saved-file path, no clipboard
 *       copy performed): CSV enabled (Seguimiento).
 *   E6  story 6  download fallback (clipboard rejects AND modal infrastructure
 *       unavailable) + explicit download confirmation accepted: CSV enabled
 *       (PV). `link.click()` alone never authorizes; the confirmation is an
 *       explicit in-flow user decision (window.confirm, user-agent control).
 *   E7  story 6/7  download fallback + confirmation dismissed: CSV blocked
 *       with honest retry feedback and no success claim (PV).
 *   E8  story 10  two TXT exports: the SUPERSEDED export's late rejection
 *       (delayed-reject plant) must perform NO side effect at all — no
 *       modal open/replace, no fallback notification, no authorization; the
 *       current export's resolving result does authorize (PV).
 *
 * T20-03/C1 CORRECTION (canonical review findings F1–F4 on candidate
 * ec001f69642daae0fe9ef85df669870dbdddc011; E8's former expectation encoded
 * the defect by accepting the stale modal and has been corrected):
 *   E8  (corrected) story 10 — see above: NO side effect for the stale
 *       rejection.
 *   E9  Impl. decisions (F1) an invalidating edit while a TXT clipboard
 *       result is in flight retires it — no late success claim, no late
 *       permission, CSV blocked.
 *   E10 Impl. decisions (F1) an invalidating edit while a TXT attempt is in
 *       flight: its late rejection opens NO manual modal and shows NO
 *       fallback notice.
 *   E11 story 10 (F2) the superseded attempt's late rejection in the
 *       download branch: no download initiation, no confirmation dialog,
 *       no notification.
 *   E12 story 8 (F3) identity/context field edit (visitKey changes) after
 *       an authorized TXT blocks CSV with the EXACT discrepancy message —
 *       not the generic prerequisite message.
 *   E13 story 6 (F4) the in-flow download confirmation is a truthful
 *       initiated-download prompt, never a completed-download claim before
 *       the professional attests; accepting it still enables CSV.
 *   bfcache note (F1, pageshow.persisted leg): a real bfcache restore
 *       cannot be produced in this environment — the same declared
 *       limitation that makes the frozen package skip W22 — so it is NOT
 *       synthetic-faked here; the pageshow.persisted retirement is
 *       implemented in modules/exportManager.js
 *       (retireInFlightTxtGateResult) and the edit/new-TXT legs carry the
 *       browser evidence in this oracle (E8/E9/E10/E11 + D9).
 *
 * RED BASELINE (frozen expectation on HEAD 32f6887f41887cb16f3d00239a6dc3102936f156):
 *   The legacy gate authorizes from sessionStorage markers and from merely
 *   opening the manual modal, and `markTxtExportDone` persists
 *   `HubClinico_TxtExportDone_*`. Expected on baseline:
 *     RED:  D0, D1, D2, D4, D7, D9
 *     PASS: D3, D5, D6, D8, D10, D11, D12
 *   After T20-01 every D witness must be PASS.
 *
 * T20-02 RED BASELINE (recorded on the T20-01 candidate
 * 2b123c63e22049ce8bf5f8025b36f0cdbec5bc49 before implementing attestation):
 *     RED:  E1, E3, E5, E6, E7, E8  (no modal-Copiar authorization, no
 *           attestation controls, no download confirmation/retry feedback,
 *           nothing to invalidate)
 *     PASS: E2, E4 (fail-closed behaviours already correct after T20-01)
 *   After T20-02 every witness (D + E) must be PASS.
 *   T20-03/C1 correction: E8's expectation is corrected (stale rejection
 *   must perform NO side effect) and E9-E13 are added for findings F1-F4;
 *   after the correction every witness (D + E) must be PASS.
 *
 * T21 NO-CLIPBOARD-API EXTENSION (TRAIN_NEXUS_REUMA_CLIPBOARD_NOAPI_21,
 * frozen independent acceptance witnesses recorded BEFORE any production
 * change on base 14d86a8):
 *   N1  story 1 (T21-01) navigator.clipboard ABSENT: the real Exportar TXT
 *       opens the real manual TXT modal with the full note and the opt-in
 *       controls; merely opening/closing it never authorizes the CSV (PV).
 *       Baseline RED (exportarTXT throws on the missing API before any modal).
 *   N2  story 5 (T21-02) after a VALID TXT attestation, navigator.clipboard
 *       ABSENT: the real Exportar CSV opens the 497-column manual CSV modal,
 *       byte-equal to projectVisitAct497, with NO success checklist/toast (PV).
 *       Baseline RED (copyTextWithFallback rejects on the missing API without
 *       opening the modal). The TXT attestation uses the published reject
 *       path so N2 isolates the CSV seam from T21-01.
 * Baseline run on 14d86a8: N1 and N2 are RED for the missing modals (not a
 * harness error); every pre-existing D/E witness stays PASS.
 *
 * Method: only supported public seams (real PV/Seguimiento controls, real
 * shared modal, real clipboard, real notifications). Controlled clipboard
 * conditions via an init-script environment plant; the DOM is never tampered
 * with; synthetic SYN-* data only. Browser journey/loading pattern reused
 * from tools/reuma_txt_gate_frozen_acceptance_browser_check.mjs.
 *
 * Environment deviations (declared): Node v24.15.0 while engines declares 20
 * (checker runtime only); Playwright Chromium headless from the same loader
 * as the other Reuma browser checkers.
 *
 * Usage: node tools/reuma_txt_gate_memory_browser_check.mjs
 * Exit 0 = every witness PASS. Exit 1 = at least one FAIL (expected RED on
 * baseline for D0/D1/D2/D4/D7/D9).
 */

import { createReadStream, existsSync, mkdtempSync, statSync, readFileSync } from 'node:fs';
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

const CSV_FIELD_COUNT = 497;
const TXT_MODAL_TITLE_TOKEN = 'Copia Manual';
const CSV_MODAL_TITLE_TOKEN = 'Copia manual de CSV';
const GATE_STORAGE_PREFIX = 'HubClinico_TxtExportDone_';
const LEGAL_GATE_MESSAGE = 'Debe exportar TXT de esta visita antes de exportar CSV.';
// T20-03/C1 (F3): exact story-8 discrepancy literal (byte-identical with the
// module constant TXT_GATE_CHANGED_MESSAGE).
const TXT_GATE_CHANGED_MSG = 'Los datos de la visita han cambiado desde el TXT. Vuelve a exportarlo y revisa que la historia cl\u00ednica refleje la versi\u00f3n actual antes de generar el CSV';

// Visible text that would claim a TXT copy/registration success without a
// real clipboard success (stories 3/7/10).
const BANNED_SUCCESS_CLAIMS = [
    'TXT copiado',
    'TXT confirmado',
    'copiada al portapapeles',
    'TXT registrado',
    'ya puede exportar CSV',
];

const CLASSIFIED_CONSOLE_ERRORS = [
    'Error al copiar al portapapeles autom\u00e1ticamente',
    'Error al copiar desde el modal',
    'Error al copiar los datos al portapapeles',
    // T21: the honest fail-closed console.error of the no-Clipboard-API CSV
    // fallback (`copyTextWithFallback` rejects when the API is absent). It is
    // the controlled failure class the T21-02 witness observes on baseline;
    // it disappears once the manual CSV modal is offered (no success is ever
    // claimed). Classified so D12 keeps measuring the same invariant.
    'Error al copiar al portapapeles:',
    'Error en exportarTXT',
    'Error al exportar CSV',
];

// Storage tokens that must NOT appear anywhere in modules/exportManager.js.
const FORBIDDEN_STORAGE_TOKENS = [
    'sessionStorage',
    'localStorage',
    'indexedDB',
    'document.cookie',
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
function witnessPass(w, detail) { w.verdict = 'PASS'; w.detail = detail || ''; console.log(`  [PASS] ${w.id} ${w.contract}${detail ? ` -> ${detail}` : ''}`); }
function witnessFail(w, detail) { w.verdict = 'FAIL'; w.detail = detail || ''; console.log(`  [FAIL] ${w.id} (baseline expectation: ${w.baseline}) ${w.contract} -> ${detail}`); }

const D0 = defineWitness('D0', 'Impl. decisions', 'exportManager.js performs zero Web Storage access (deterministic)', 'RED');
const D1 = defineWitness('D1', 'story 14', 'planted matching legacy marker NEVER authorizes CSV (PV)', 'RED');
const D2 = defineWitness('D2', 'story 3/7', 'clipboard-reject TXT + modal merely opened/closed: CSV blocked, no success claim (PV)', 'RED');
const D3 = defineWitness('D3', 'story 14', 'planted legacy markers + hubPendingRows byte-unchanged across ALL journeys', 'PASS');
const D4 = defineWitness('D4', 'Impl. decisions', 'zero NEW Web Storage writes by the TXT\u2192CSV flow across ALL journeys', 'RED');
const D5 = defineWitness('D5', 'story 2/15', 'clipboard resolve enables the 497 CSV, byte-equal to projectVisitAct497 (PV)', 'PASS');
const D6 = defineWitness('D6', 'story 13', 'same-instance CSV re-export without repeating TXT (PV)', 'PASS');
const D7 = defineWitness('D7', 'story 11', 'reload with identical data loses the authorization (PV)', 'RED');
const D8 = defineWitness('D8', 'story 16', 'empty identity context fails closed, no crash (PV)', 'PASS');
const D9 = defineWitness('D9', 'story 10', 'stale Promise from a superseded TXT export does not authorize; the current one does (PV)', 'RED');
const D10 = defineWitness('D10', 'story 6', 'clipboard unavailable: TXT fails honestly, CSV never authorized (PV)', 'PASS');
const D11 = defineWitness('D11', 'story 2/13', 'Seguimiento clipboard resolve enables the 497 CSV + same-instance re-export', 'PASS');
const D12 = defineWitness('D12', 'cross-cutting', 'pageerror=0 and console errors only in classified controlled-failure classes (ALL journeys)', 'PASS');

// T20-02 extension: manual confirmation / explicit attestation.
const E1 = defineWitness('E1', 'story 4', 'modal \u00abCopiar\u00bb real success (writeText reject + armed execCommand TRUE) enables the 497 CSV (PV)', 'RED');
const E2 = defineWitness('E2', 'story 4', 'modal \u00abCopiar\u00bb failure: CSV blocked, modal open with byte-identical text, no success claim (PV)', 'PASS');
const E3 = defineWitness('E3', 'story 5', 'real Ctrl+A/Ctrl+C + \u00abHe copiado el TXT\u00bb attestation: CSV enabled + approved wording \u00abTXT confirmado por el profesional\u00bb (PV)', 'RED');
const E4 = defineWitness('E4', 'story 5', 'real Ctrl+A/Ctrl+C WITHOUT attestation: CSV blocked, no success claim (Seguimiento)', 'PASS');
const E5 = defineWitness('E5', 'story 6', '\u00abHe guardado el TXT\u00bb attestation (saved-file path, no clipboard copy): CSV enabled (Seguimiento)', 'RED');
const E6 = defineWitness('E6', 'story 6', 'download fallback + explicit download confirmation accepted: CSV enabled; link.click() alone never authorizes (PV)', 'RED');
const E7 = defineWitness('E7', 'story 6/7', 'download fallback + confirmation dismissed: fail closed with honest retry feedback, no success claim (PV)', 'RED');
const E8 = defineWitness('E8', 'story 10', 'the superseded TXT export\u0027s late rejection performs NO side effect (no modal open/replace, no fallback notice, no authorization); the current export result authorizes (PV)', 'RED');

// T20-03/C1 correction extension (canonical review findings F1–F4).
const E9 = defineWitness('E9', 'Impl. decisions', 'invalidating edit while a TXT clipboard result is in flight retires it: no late success claim, no late authorization, CSV blocked (PV)', 'RED');
const E10 = defineWitness('E10', 'Impl. decisions', 'invalidating edit while a TXT attempt is in flight: the late rejection opens NO manual modal and shows NO fallback notice (PV)', 'RED');
const E11 = defineWitness('E11', 'story 10', 'superseded TXT attempt\u0027s late rejection in the download branch: no download initiation, no confirmation dialog, no notification (PV)', 'RED');
const E12 = defineWitness('E12', 'story 8', 'identity/context field edit after an authorized TXT: CSV blocked fail-closed with the EXACT discrepancy message, not the prerequisite (PV)', 'RED');
const E13 = defineWitness('E13', 'story 6', 'download confirmation is a truthful initiated-download prompt, never a completed-download claim; accepting it still enables CSV (PV)', 'RED');

// TRAIN 21 (TRAIN_NEXUS_REUMA_CLIPBOARD_NOAPI_21) frozen independent
// acceptance witnesses — the manual TXT→CSV road when navigator.clipboard
// (or writeText) is absent. Both are RED on the frozen base (14d86a8) because
// neither modal is offered without the Clipboard API; N1 turns GREEN with
// T21-01 (exportarTXT treats API-absence as a transport failure reaching the
// existing opt-in modal) and N2 with T21-02 (copyTextWithFallback reuses
// openManualCopyModal). Existing fail-closed/equality/memory witnesses above
// are untouched.
const N1 = defineWitness('N1', 'T21-01/story 1', 'clipboard API absent: real Exportar TXT opens the real manual TXT modal with the full note; closing without attestation keeps CSV blocked (PV)', 'RED');
// T21-01 focal witnesses completing the ticket PROOF clauses N1 does not
// cover: the same manual TXT road on Seguimiento (story 2) and that the
// explicit attestation after a real manual copy still authorizes the
// in-memory gate when the Clipboard API was absent at the TXT export
// (story 3). Both are RED on the frozen base for the same missing-API
// reason as N1.
const N3 = defineWitness('N3', 'T21-01/focal/story 2', 'clipboard API absent: real Exportar TXT opens the real manual TXT modal with the full note (Seguimiento); closing without attestation keeps CSV blocked', 'RED');
const N4 = defineWitness('N4', 'T21-01/focal/story 3', 'clipboard API absent: the real Exportar TXT opens the manual TXT modal and a real manual copy + explicit attestation authorizes the same-payload 497 CSV (PV)', 'RED');
const N2 = defineWitness('N2', 'T21-02/story 5', 'clipboard API absent after a valid TXT attestation: real Exportar CSV opens the 497 manual CSV modal, never a success checklist/toast (PV)', 'RED');

// ---------------------------------------------------------------------------
// Storage sentinel fixtures (synthetic; planted at document start).
// ---------------------------------------------------------------------------

const SENTINEL_OTHER_KEY = `${GATE_STORAGE_PREFIX}SYN-OTHER__2020-01-01__seguimiento__ar`;
const SENTINEL_OTHER_VALUE = JSON.stringify({ completedAt: '2020-01-01T00:00:00.000Z', visitKey: 'SYN-OTHER__2020-01-01__seguimiento__ar' });
const SENTINEL_PENDING_KEY = 'hubPendingRows';
const SENTINEL_PENDING_VALUE = JSON.stringify([{ idPaciente: 'SYN-LEGACY-PENDING', fecha: '2020-01-01', nota: 'synthetic legacy sentinel' }]);
// Matching legacy marker (CIP SYN-GATE-LEG-1, fecha 2026-02-10, primera, espa).
const SENTINEL_MATCHING_KEY = `${GATE_STORAGE_PREFIX}SYN-GATE-LEG-1__2026-02-10__primera__espa`;
const SENTINEL_MATCHING_VALUE = JSON.stringify({ completedAt: '2026-01-01T00:00:00.000Z', visitKey: 'SYN-GATE-LEG-1__2026-02-10__primera__espa' });
const SENTINEL_KEYS = [SENTINEL_OTHER_KEY, SENTINEL_PENDING_KEY];

// ---------------------------------------------------------------------------
// Playwright loading (same documented resolution as the other Reuma checkers).
// ---------------------------------------------------------------------------

function loadPlaywrightFromNpx() {
    const tryNodeModules = (nodeModules) => {
        const pkg = path.join(nodeModules, 'playwright', 'package.json');
        return existsSync(pkg) ? createRequire(path.join(nodeModules, '__reuma_txt_gate_memory_loader.cjs'))('playwright') : null;
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
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/reuma_txt_gate_memory_browser_check.mjs');
}

let chromium;
try {
    ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
    console.error('ENVIRONMENT FAILURE: ' + err.message);
    console.log('\nREUMA-TXT-GATE-MEMORY: FAIL 0/0');
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
// D0 — deterministic source witness (no Web Storage access in exportManager).
// ---------------------------------------------------------------------------

function checkDeterministicNoStorage() {
    const src = readFileSync(path.join(ROOT, 'modules', 'exportManager.js'), 'utf8');
    const hits = FORBIDDEN_STORAGE_TOKENS
        .map((token) => ({ token, count: src.split(token).length - 1 }))
        .filter((hit) => hit.count > 0);
    if (hits.length === 0) {
        witnessPass(D0, 'no sessionStorage/localStorage/indexedDB/document.cookie tokens in modules/exportManager.js');
    } else {
        witnessFail(D0, `storage access present in modules/exportManager.js: ${hits.map((h) => `${h.token}x${h.count}`).join(', ')}`);
    }
}

// ---------------------------------------------------------------------------
// Synthetic workbook fixture + repo-root HTTP server.
// ---------------------------------------------------------------------------

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'reuma-txt-gate-memory-'));
const workbookPath = path.join(tempDir, 'reuma_txt_gate_memory_synthetic.xlsx');
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
// Environment plant (init script; controlled clipboard conditions only,
// plain flag arming; the DOM is never touched).
// ---------------------------------------------------------------------------

function txtGatePlant(cfg) {
    window.__tg = {
        writeMode: 'reject', // 'reject' | 'throw' | 'allow' | 'park' | 'delayed-reject'
        writeAttempts: 0,
        parked: [],
        writeDelayMs: 0, // delay for 'delayed-reject'
        clipboardAvailable: true,
        pageShows: [],
        // T20-02: controlled execCommand('copy') wrapper (modal Copiar #620
        // semantics) + modal-infrastructure availability switch (controlled
        // environment condition for the download-fallback witnesses E6/E7;
        // the DOM itself is never touched).
        execArmed: false,
        execThrow: false,
        execResult: false,
        execCalls: 0,
        execLastResult: null,
        modalAvailable: true,
    };

    // Synthetic legacy sentinels, planted at document start of EVERY page.
    try { sessionStorage.setItem(cfg.otherMarkerKey, cfg.otherMarkerValue); } catch (error) { /* best-effort */ }
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
                    const mode = window.__tg.writeMode;
                    if (mode === 'reject') return Promise.reject(new Error('planted clipboard rejection (QA)'));
                    if (mode === 'delayed-reject') {
                        const delay = Number(window.__tg.writeDelayMs) || 300;
                        return new Promise((resolve, reject) => {
                            setTimeout(() => reject(new Error('planted delayed clipboard rejection (QA)')), delay);
                        });
                    }
                    if (mode === 'throw') throw new Error('planted clipboard throw (QA)');
                    if (mode === 'park') {
                        return new Promise((resolve) => { window.__tg.parked.push(resolve); });
                    }
                    return originalWriteText(text);
                },
            });
        } catch (error) { /* leave the original writeText in place */ }
    }

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
    } catch (error) { /* stays available; D10 would report it */ }

    // Controlled execCommand('copy') wrapper (same pattern as the frozen
    // acceptance oracle): counts armed 'copy' calls and returns the
    // runtime-planted boolean; pass-through otherwise.
    const originalExecCommand = document.execCommand.bind(document);
    Object.defineProperty(document, 'execCommand', {
        configurable: true,
        value: function (command, showUi, value) {
            if (window.__tg.execArmed === true && String(command).toLowerCase() === 'copy') {
                window.__tg.execCalls += 1;
                if (window.__tg.execThrow === true) {
                    throw new Error('planted execCommand copy throw (QA)');
                }
                window.__tg.execLastResult = window.__tg.execResult === true;
                return window.__tg.execLastResult;
            }
            return originalExecCommand(command, showUi, value);
        },
    });
}

async function armWriteMode(page, mode) {
    await page.evaluate((m) => { window.__tg.writeMode = m; }, mode);
}
async function armDelayedReject(page, delayMs) {
    await page.evaluate((ms) => {
        window.__tg.writeMode = 'delayed-reject';
        window.__tg.writeDelayMs = ms;
    }, delayMs);
}
async function resolveParkedPromise(page) {
    return page.evaluate(() => {
        const resolve = window.__tg.parked.shift();
        if (typeof resolve === 'function') { resolve(); return true; }
        return false;
    });
}

// T20-02 helpers (same semantics as the frozen acceptance oracle plants).
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
/** Real keyboard manual copy: disarm plants, focus the readonly textarea with
 * a real click, real Ctrl+A + Ctrl+C, then read the REAL clipboard back. */
async function realManualCopy(page) {
    await disarmAllPlants(page);
    await page.click('#textoModalTextarea');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(300);
    return readClipboardText(page);
}
/** Search the supported DOM for the explicit professional attestation
 * controls («He copiado el TXT» / «He guardado el TXT»). Post-state read of
 * real controls only; nothing is injected. */
async function findAttestationControls(page) {
    return page.evaluate(() => {
        const pattern = /he\s+(copiado|guardado)\s+el\s+txt/i;
        const candidates = Array.from(document.querySelectorAll('button, [role="button"], a, input[type="button"], input[type="submit"], label'));
        return candidates
            .map((el) => {
                const label = `${el.textContent || ''} ${el.getAttribute && el.getAttribute('aria-label') || ''} ${el.title || ''} ${el.value || ''}`;
                return { el, label };
            })
            .filter((entry) => pattern.test(entry.label))
            .map((entry) => ({
                tag: entry.el.tagName.toLowerCase(),
                id: entry.el.id || '',
                kind: /guardado/i.test(entry.label) ? 'guardado' : 'copiado',
                label: (entry.el.textContent || entry.el.value || '').trim().slice(0, 120),
            }));
    });
}
/** Controlled environment condition for E6/E7: wrap the modal-infrastructure
 * entry point with a plain availability flag (module unavailable == the
 * download fallback branch). Installed AFTER page load through a real
 * property descriptor; the modal DOM itself is never touched. */
async function plantModalAvailabilitySwitch(page) {
    await page.evaluate(() => {
        const form = HubTools.form;
        window.__tg.originalModalFn = form.mostrarModalTexto;
        Object.defineProperty(form, 'mostrarModalTexto', {
            configurable: true,
            get() { return window.__tg.modalAvailable === false ? undefined : window.__tg.originalModalFn; },
        });
    });
}
async function setModalAvailable(page, available) {
    await page.evaluate((value) => { window.__tg.modalAvailable = value; }, available);
}

/** Record native dialogs (window.confirm prompts) while letting the journey
 * proceed; used by the download-branch witnesses (E11/E13). */
function recordDialogs(page, sink) {
    page.on('dialog', (dialog) => {
        sink.push(dialog.message());
        dialog.dismiss().catch(() => {});
    });
}

// ---------------------------------------------------------------------------
// Observation helpers (post-state reads only).
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
    for (const store of ['session', 'local']) {
        const a = before.snap[store] || {};
        const b = after.snap[store] || {};
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        for (const k of keys) {
            if (k === '__storageReadError') continue;
            if (!(k in a)) diffs.push({ store, key: k, kind: 'added', after: b[k] });
            else if (!(k in b)) diffs.push({ store, key: k, kind: 'removed', before: a[k] });
            else if (a[k] !== b[k]) diffs.push({ store, key: k, kind: 'changed', before: a[k], after: b[k] });
        }
    }
    if (before.snap.cookie !== after.snap.cookie) {
        diffs.push({ store: 'cookie', key: 'document.cookie', kind: 'changed' });
    }
    return diffs;
}

const allCheckpoints = [];
const sentinelKeysInPlay = new Set(SENTINEL_KEYS);
const allStorageDiffs = [];
const errorViolations = [];

async function checkpoint(page, journeyLabel, label) {
    const cp = await storageCheckpoint(page, journeyLabel, label);
    allCheckpoints.push(cp);
    return cp;
}

function auditCheckpoints(journeyLabel) {
    const cps = allCheckpoints.filter((cp) => cp.journey === journeyLabel);
    for (let i = 1; i < cps.length; i++) {
        const diffs = diffSnapshots(cps[i - 1], cps[i]);
        for (const diff of diffs) {
            allStorageDiffs.push({ journey: journeyLabel, label: cps[i].label, ...diff });
        }
    }
    if (cps.length > 0) {
        const first = cps[0];
        for (const key of SENTINEL_KEYS) {
            const store = key === SENTINEL_PENDING_KEY ? 'local' : 'session';
            if (!(key in (first.snap[store] || {}))) {
                allStorageDiffs.push({ journey: journeyLabel, label: first.label, key, kind: 'missing-at-start' });
            }
        }
    }
}

function classifyJourneyErrors(journeyLabel, entry) {
    for (const message of entry.pageErrors) errorViolations.push({ journey: journeyLabel, kind: 'pageerror', message });
    for (const message of entry.consoleErrors) {
        if (!CLASSIFIED_CONSOLE_ERRORS.some((cls) => message.includes(cls))) {
            errorViolations.push({ journey: journeyLabel, kind: 'console-error', message });
        }
    }
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
        };
    });
}

async function readClipboardText(page) {
    return page.evaluate(async () => {
        try { return { ok: true, text: await navigator.clipboard.readText() }; }
        catch (error) { return { ok: false, error: String(error && error.message || error) }; }
    });
}

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
        freshClipboardRow,
    };
    if (obs.modalCount > 0) {
        try {
            await page.click('#closeModalBtn');
            await page.waitForFunction(() => !document.getElementById('textoModalContainer'), null, { timeout: 5000 });
        } catch (error) { /* leftover modal is reported by the observation */ }
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

async function clickTxtAndWait(page) {
    await page.click('#btnExportarTXT');
    await page.waitForTimeout(900);
}

async function txtExportAwaitModal(page) {
    await page.click('#btnExportarTXT');
    await page.waitForSelector('#textoModalContainer .texto-modal__title', { timeout: 10000 });
    await page.waitForTimeout(400);
    return readModalState(page);
}

/** T21 bounded variant: click the real TXT button and report whether the real
 * manual modal opened WITHOUT throwing. The strict helper above stays in place
 * for the journeys that legitimately require the modal; this one is used by
 * the no-API witness whose baseline (missing modal) must be an honest RED, not
 * a harness abort. */
async function tryTxtExportAwaitModal(page, timeout = 8000) {
    await page.click('#btnExportarTXT');
    const opened = await page.waitForSelector('#textoModalContainer .texto-modal__title', { timeout })
        .then(() => true)
        .catch(() => false);
    if (opened) await page.waitForTimeout(400);
    return { opened, state: await readModalState(page) };
}

async function closeModal(page) {
    const present = await page.evaluate(() => !!document.getElementById('textoModalContainer'));
    if (!present) return;
    await page.click('#closeModalBtn');
    await page.waitForFunction(() => !document.getElementById('textoModalContainer'), null, { timeout: 5000 });
}

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
// Main run.
// ---------------------------------------------------------------------------

let browser;
let exitCode = 1;
try {
    checkDeterministicNoStorage();

    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const origin = `http://127.0.0.1:${server.address().port}`;

    browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
    console.log(`REUMA-TXT-GATE-MEMORY (chromium ${browser.version()}, node ${process.version})`);
    console.log(`T20-01 + T20-02 + T20-03/C1 focused oracle. After T20-02 + the C1 correction: every witness (D0-D12, E1-E13) PASS. T21 frozen witnesses N1/N2 (no Clipboard API manual road) are RED on base 14d86a8 and turn GREEN with T21-01/T21-02.\n`);

    // =====================================================================
    // J-LEGACY-MARKER (PV): planted matching legacy marker + direct CSV
    // click without any TXT (story 14).
    // =====================================================================
    {
        const jl = 'J-LEGACY-MARKER';
        sentinelKeysInPlay.add(SENTINEL_MATCHING_KEY);
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
                witnessFail(D1, 'harness precondition failed: the matching legacy marker was not planted');
            } else if (csvDelivered(obs)) {
                witnessFail(D1, `CSV delivered thanks to the planted legacy marker matching CIP/fecha (via=${csvDeliveredVia(obs)}) — legacy markers must never authorize`);
            } else {
                witnessPass(D1, `planted matching legacy marker did NOT authorize CSV (via=${csvDeliveredVia(obs)}, legalMessage=${obs.bodyText.includes(LEGAL_GATE_MESSAGE)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-REJECT (PV): clipboard reject -> TXT opens the manual modal -> close
    // without confirmation -> CSV must stay blocked with no success claims
    // (stories 3/7). Storage checkpoints across the whole journey.
    // =====================================================================
    {
        const jl = 'J-REJECT';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-REJ-M1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            const modal = await txtExportAwaitModal(page);
            const modalOpened = modal.modalCount === 1 && modal.title.includes(TXT_MODAL_TITLE_TOKEN) && typeof modal.text === 'string' && modal.text.length > 0;
            await checkpoint(page, jl, 'after-txt-modal');
            await closeModal(page);
            const bodyAfterClose = await page.evaluate(() => document.body.innerText);
            const bannedAfterClose = BANNED_SUCCESS_CLAIMS.filter((token) => bodyAfterClose.includes(token));

            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv');

            if (!modalOpened) {
                witnessFail(D2, `harness precondition failed: TXT reject did not open the real manual modal (modalCount=${modal.modalCount}, title=${JSON.stringify(modal.title)})`);
            } else if (!csvDelivered(obs) && bannedAfterClose.length === 0) {
                witnessPass(D2, `reject + modal merely opened/closed: no 497 delivery (via=${csvDeliveredVia(obs)}) and no success claim after close`);
            } else {
                witnessFail(D2, `CSV delivered after reject + modal open/close (via=${csvDeliveredVia(obs)}) and/or success claims=${JSON.stringify(bannedAfterClose)}`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-RESOLVE (PV): clipboard-resolving TXT authorizes; 497 byte equality;
    // same-instance re-export; reload loses authorization (stories 2/13/11/15).
    // =====================================================================
    {
        const jl = 'J-RESOLVE';
        const cip = 'SYN-GATE-POS-M1';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip, isSeguimiento: false });
            await armWriteMode(page, 'allow');
            await checkpoint(page, jl, 'after-fill');
            await clickTxtAndWait(page);
            await checkpoint(page, jl, 'after-txt');

            // D5 — CSV enabled + 497 byte equality.
            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv-1');
            const ref = await adapterReferenceRow(page, { kind: 'primera_visita', pathology: 'espa' });
            const actualRow = typeof obs.clipboardText === 'string' && obs.clipboardText.split('\t').length === CSV_FIELD_COUNT
                ? obs.clipboardText
                : (csvDelivered(obs) ? obs.modalText : null);
            if (!csvDelivered(obs)) {
                witnessFail(D5, `CSV not delivered after clipboard-confirmed TXT (via=${csvDeliveredVia(obs)})`);
            } else if (!ref.ok) {
                witnessFail(D5, `CSV delivered but adapter reference unavailable: ${ref.error}`);
            } else if (actualRow === ref.row) {
                witnessPass(D5, `497 CSV delivered (${csvDeliveredVia(obs)}) and byte-equals projectVisitAct497 row (${ref.fields} fields, ${ref.row.length} chars)`);
            } else {
                witnessFail(D5, `byte inequality: delivered=${actualRow ? actualRow.length : 'null'} chars, reference=${ref.row.length} chars`);
            }

            // D6 — same-instance re-export without repeating TXT.
            await armWriteMode(page, 'reject');
            const reObs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv-2');
            if (csvDelivered(reObs)) {
                witnessPass(D6, `second CSV export in the same instance delivered without a new TXT (via=${csvDeliveredVia(reObs)})`);
            } else {
                witnessFail(D6, `same-instance re-export was forced to repeat TXT (via=${csvDeliveredVia(reObs)})`);
            }

            // D7 — reload with identical data loses the authorization.
            await page.reload({ waitUntil: 'load', timeout: 45000 });
            await fillClinicalBase(page, { cip, isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-reload');
            const reloaded = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-reload-csv');
            if (csvDelivered(reloaded)) {
                witnessFail(D7, `CSV still delivered after reload with identical data (via=${csvDeliveredVia(reloaded)}) — authorization survived the reload`);
            } else {
                witnessPass(D7, `authorization lost after reload; CSV blocked (via=${csvDeliveredVia(reloaded)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-EMPTY (PV): empty identity context fails closed (story 16).
    // =====================================================================
    {
        const jl = 'J-EMPTY';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-EMPTY-M1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await openAncestorCollapsibles(page, '#idPaciente');
            await page.fill('#idPaciente', '');
            await checkpoint(page, jl, 'after-empty-fill');

            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv');
            const crashed = entry.pageErrors.length > 0;

            if (csvDelivered(obs)) {
                witnessFail(D8, `CSV delivered with empty identity context (via=${csvDeliveredVia(obs)})`);
            } else if (crashed) {
                witnessFail(D8, `page errors during the empty-context attempt: ${JSON.stringify(entry.pageErrors.slice(0, 3))}`);
            } else {
                witnessPass(D8, `no 497 delivery with empty CIP, no crash (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-STALE (PV): two TXT exports with parked clipboard promises; the
    // stale (first) result must not authorize; the current one must (story 10).
    // =====================================================================
    {
        const jl = 'J-STALE';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-STALE-M1', isSeguimiento: false });
            await armWriteMode(page, 'park');
            await checkpoint(page, jl, 'after-fill');

            await clickTxtAndWait(page); // P1 parked (superseded)
            await clickTxtAndWait(page); // P2 parked (current export)
            const parkedCount = await page.evaluate(() => window.__tg.parked.length);
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-two-txt');

            const r1 = await resolveParkedPromise(page); // STALE result lands
            await page.waitForTimeout(700);
            await checkpoint(page, jl, 'after-stale-resolution');
            let obs = await clickCsvAndObserve(page);
            const staleDidNotAuthorize = !csvDelivered(obs);
            await checkpoint(page, jl, 'after-stale-csv');

            const r2 = await resolveParkedPromise(page); // CURRENT result lands
            await page.waitForTimeout(700);
            await checkpoint(page, jl, 'after-current-resolution');
            obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-current-csv');

            if (parkedCount !== 2 || !r1 || !r2) {
                witnessFail(D9, `harness precondition failed: parked=${parkedCount} r1=${r1} r2=${r2}`);
            } else if (!staleDidNotAuthorize) {
                witnessFail(D9, `the FIRST export's stale promise authorized CSV after a second TXT export started (via=${csvDeliveredVia(obs)})`);
            } else if (!csvDelivered(obs)) {
                witnessFail(D9, `precondition inverted: even the CURRENT export's resolving result did not enable CSV (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessPass(D9, `stale P1 did not authorize after the second export; the current P2 result did (final via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-DOWNLOAD (PV): clipboard API unavailable -> TXT fails honestly; CSV
    // never authorized (story 6; attestation belongs to T20-02).
    // =====================================================================
    {
        const jl = 'J-DOWNLOAD';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-DL-M1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            await page.evaluate(() => { window.__tg.clipboardAvailable = false; });
            await clickTxtAndWait(page);
            const bodyAfterTxt = await page.evaluate(() => document.body.innerText);
            // T21-01: the no-Clipboard-API TXT now legitimately offers the
            // manual TXT modal (the new capability). Close it WITHOUT attesting
            // so this fail-closed witness still measures that no clipboard
            // success authorizes the CSV; its assertions are unchanged.
            await closeModal(page).catch(() => {});
            await checkpoint(page, jl, 'after-txt-unavailable');

            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv');
            const honestFeedback = /error|no se pudo/i.test(bodyAfterTxt);

            if (csvDelivered(obs)) {
                witnessFail(D10, `CSV delivered although no clipboard success occurred (via=${csvDeliveredVia(obs)}, downloads=${entry.downloads.length})`);
            } else if (!honestFeedback) {
                witnessFail(D10, `CSV blocked (good) but no honest failure feedback after the TXT attempt`);
            } else {
                witnessPass(D10, `no CSV authorization without clipboard success (via=${csvDeliveredVia(obs)}, downloads=${entry.downloads.length}, honestFeedback=${honestFeedback})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-NOAPI-TXT (PV, T21-01/story 1 frozen witness N1): navigator.clipboard
    // is ABSENT — the real Exportar TXT must open the existing manual TXT
    // modal with the full note; merely opening (or closing) it must NOT
    // authorize the CSV. Baseline (14d86a8): exportarTXT throws on the missing
    // API before any modal, so this witness is RED.
    // =====================================================================
    {
        const jl = 'J-NOAPI-TXT';
        const cip = 'SYN-GATE-NOAPI-T1';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip, isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            await page.evaluate(() => { window.__tg.clipboardAvailable = false; }); // no Clipboard API
            const apiAbsent = await page.evaluate(() => !navigator.clipboard);

            const { opened, state } = await tryTxtExportAwaitModal(page);
            const controls = await findAttestationControls(page);
            await checkpoint(page, jl, 'after-txt-noapi');

            // Close without attesting; CSV must stay blocked (fail-closed).
            await closeModal(page).catch(() => {});
            const bodyAfterClose = await page.evaluate(() => document.body.innerText);
            const bannedAfterClose = BANNED_SUCCESS_CLAIMS.filter((token) => bodyAfterClose.includes(token));
            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv');

            const fullNote = state.modalCount === 1 && typeof state.text === 'string'
                && state.text.length > 0 && state.text.includes(cip);
            const hasAttestationControls = controls.some((c) => c.kind === 'copiado') && controls.some((c) => c.kind === 'guardado');
            if (!apiAbsent) {
                witnessFail(N1, 'harness precondition failed: navigator.clipboard was NOT absent at the TXT click');
            } else if (!opened || !fullNote || !state.title.includes(TXT_MODAL_TITLE_TOKEN)) {
                witnessFail(N1, `clipboard API absent but the real Exportar TXT did NOT open the manual TXT modal with the full note (opened=${opened} modalCount=${state.modalCount} title=${JSON.stringify(state.title)} textLength=${state.text ? state.text.length : 0})`);
            } else if (!hasAttestationControls) {
                witnessFail(N1, `TXT modal opened but the opt-in attestation controls are missing (controls=${JSON.stringify(controls.map((c) => c.label))})`);
            } else if (csvDelivered(obs) || bannedAfterClose.length > 0) {
                witnessFail(N1, `merely opening/closing the no-API TXT modal authorized the CSV (via=${csvDeliveredVia(obs)}) and/or claimed success=${JSON.stringify(bannedAfterClose)}`);
            } else {
                witnessPass(N1, `no-Clipboard-API Exportar TXT opened the real manual TXT modal (${state.title}, ${state.text.length} chars incl. ${cip}) with the opt-in controls; closing without attestation kept CSV blocked (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-NOAPI-CSV (PV, T21-02/story 5 frozen witness N2): after a VALID TXT
    // attestation, navigator.clipboard is ABSENT — the real Exportar CSV must
    // open the 497-column manual CSV modal (byte-equal to
    // projectVisitAct497) and must NOT show any success checklist/toast.
    // The TXT attestation itself uses the already-published reject path so
    // this witness isolates the CSV seam from T21-01. Baseline (14d86a8):
    // copyTextWithFallback rejects on the missing API without opening the
    // modal, so this witness is RED.
    // =====================================================================
    {
        const jl = 'J-NOAPI-CSV';
        const cip = 'SYN-GATE-NOAPI-T2';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip, isSeguimiento: false });
            await armWriteMode(page, 'reject'); // TXT modal via the published reject path
            await checkpoint(page, jl, 'after-fill');

            const modal = await txtExportAwaitModal(page);
            const controls = await findAttestationControls(page);
            const attestation = controls.find((c) => c.kind === 'guardado') || controls.find((c) => c.kind === 'copiado');
            let attested = false;
            let attestationToast = false;
            if (attestation && attestation.id) {
                await page.click(`#${attestation.id}`); // supported explicit attestation click
                await page.waitForTimeout(500);
                attestationToast = await page.evaluate(() => document.body.innerText.includes('TXT confirmado por el profesional'));
                await closeModal(page).catch(() => { /* the control may close the modal itself */ });
                attested = true;
            }
            await checkpoint(page, jl, 'after-attest');

            await page.evaluate(() => { window.__tg.clipboardAvailable = false; }); // no Clipboard API for the CSV click
            const apiAbsent = await page.evaluate(() => !navigator.clipboard);
            const obs = await clickCsvAndObserve(page);
            const post = await page.evaluate(() => ({
                checklistCount: document.querySelectorAll('#postExportChecklist').length,
            }));
            await checkpoint(page, jl, 'after-csv');

            const ref = await adapterReferenceRow(page, { kind: 'primera_visita', pathology: 'espa' });
            const genericSuccessToast = obs.bodyText.includes('Datos copiados al portapapeles. Pega en la hoja:');
            const csvModal497 = obs.modalTitle.includes(CSV_MODAL_TITLE_TOKEN)
                && typeof obs.modalText === 'string' && obs.modalText.split('\t').length === CSV_FIELD_COUNT;
            const byteEqual = ref.ok && csvModal497 && obs.modalText === ref.row;

            if (!attested || !attestationToast) {
                witnessFail(N2, `harness precondition failed: TXT modal attestation not observed (attested=${attested} toast=${attestationToast} modalCount=${modal.modalCount} controls=${JSON.stringify(controls.map((c) => c.label))})`);
            } else if (!apiAbsent) {
                witnessFail(N2, 'harness precondition failed: navigator.clipboard was NOT absent at the CSV click');
            } else if (!csvModal497) {
                witnessFail(N2, `clipboard API absent after a valid TXT attestation but Exportar CSV did NOT open the 497 manual CSV modal (modalCount=${obs.modalCount} title=${JSON.stringify(obs.modalTitle)} fields=${obs.modalText ? obs.modalText.split('\t').length : 0})`);
            } else if (post.checklistCount !== 0 || genericSuccessToast) {
                witnessFail(N2, `manual CSV modal shown but a false success indicator was present (checklist=${post.checklistCount} genericSuccessToast=${genericSuccessToast})`);
            } else if (!ref.ok) {
                witnessFail(N2, `manual CSV modal shown but the projectVisitAct497 reference is unavailable: ${ref.error}`);
            } else if (!byteEqual) {
                witnessFail(N2, `manual CSV modal row differs from projectVisitAct497 (modal=${obs.modalText.length} chars, reference=${ref.row.length} chars)`);
            } else {
                witnessPass(N2, `no-Clipboard-API Exportar CSV after TXT attestation opened the 497 manual CSV modal byte-equal to projectVisitAct497 with no success checklist/toast (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-NOAPI-SEG (Seguimiento, T21-01/focal N3): navigator.clipboard ABSENT
    // — the real Exportar TXT on Seguimiento must open the same manual TXT
    // modal with the full note; merely opening/closing it must NOT authorize
    // the CSV (story 2; fail-closed without attestation).
    // =====================================================================
    {
        const jl = 'J-NOAPI-SEG';
        const cip = 'SYN-SEG-200';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_SEGUIMIENTO}?id=${cip}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip, isSeguimiento: true });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            await page.evaluate(() => { window.__tg.clipboardAvailable = false; }); // no Clipboard API
            const apiAbsent = await page.evaluate(() => !navigator.clipboard);

            const { opened, state } = await tryTxtExportAwaitModal(page);
            const controls = await findAttestationControls(page);
            await checkpoint(page, jl, 'after-txt-noapi');

            await closeModal(page).catch(() => {});
            const bodyAfterClose = await page.evaluate(() => document.body.innerText);
            const bannedAfterClose = BANNED_SUCCESS_CLAIMS.filter((token) => bodyAfterClose.includes(token));
            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv');

            const fullNote = state.modalCount === 1 && typeof state.text === 'string'
                && state.text.length > 0 && state.text.includes(cip);
            const hasAttestationControls = controls.some((c) => c.kind === 'copiado') && controls.some((c) => c.kind === 'guardado');
            if (!apiAbsent) {
                witnessFail(N3, 'harness precondition failed: navigator.clipboard was NOT absent at the TXT click');
            } else if (!opened || !fullNote || !state.title.includes(TXT_MODAL_TITLE_TOKEN)) {
                witnessFail(N3, `clipboard API absent but the real Seguimiento Exportar TXT did NOT open the manual TXT modal with the full note (opened=${opened} modalCount=${state.modalCount} title=${JSON.stringify(state.title)} textLength=${state.text ? state.text.length : 0})`);
            } else if (!hasAttestationControls) {
                witnessFail(N3, `Seguimiento TXT modal opened but the opt-in attestation controls are missing (controls=${JSON.stringify(controls.map((c) => c.label))})`);
            } else if (csvDelivered(obs) || bannedAfterClose.length > 0) {
                witnessFail(N3, `merely opening/closing the no-API Seguimiento TXT modal authorized the CSV (via=${csvDeliveredVia(obs)}) and/or claimed success=${JSON.stringify(bannedAfterClose)}`);
            } else {
                witnessPass(N3, `no-Clipboard-API Seguimiento Exportar TXT opened the real manual TXT modal (${state.title}, ${state.text.length} chars incl. ${cip}) with the opt-in controls; closing without attestation kept CSV blocked (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-NOAPI-ATTEST (PV, T21-01/focal N4): navigator.clipboard ABSENT — the
    // real Exportar TXT opens the manual TXT modal; a real manual copy
    // (Ctrl+A/Ctrl+C) + the explicit «He copiado el TXT» attestation then
    // authorizes the same-payload in-memory gate (story 3), so the 497 CSV
    // becomes deliverable. The transport is restored ONLY to observe that
    // authorization (the CSV-without-API transport is T21-02's seam): the
    // missing API must never be a dead end for the accepted manual road.
    // =====================================================================
    {
        const jl = 'J-NOAPI-ATTEST';
        const cip = 'SYN-GATE-NOAPI-A1';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip, isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            await page.evaluate(() => { window.__tg.clipboardAvailable = false; }); // no Clipboard API
            const apiAbsent = await page.evaluate(() => !navigator.clipboard);

            const { opened, state } = await tryTxtExportAwaitModal(page);
            await checkpoint(page, jl, 'after-txt-noapi');

            const modalOpened = apiAbsent && opened && state.modalCount === 1
                && state.title.includes(TXT_MODAL_TITLE_TOKEN)
                && typeof state.text === 'string' && state.text.includes(cip);
            let controls = [];
            let copiado = null;
            let manualCopyWorked = false;
            let attestationToast = false;
            let obs = null;
            let csvOk = false;
            if (modalOpened) {
                const clip = await realManualCopy(page); // real Ctrl+A/Ctrl+C; also restores the transport for read-back
                manualCopyWorked = clip.ok && clip.text === state.text;
                controls = await findAttestationControls(page);
                copiado = controls.find((c) => c.kind === 'copiado');
                if (copiado && copiado.id) {
                    await page.click(`#${copiado.id}`); // supported explicit attestation
                    await page.waitForTimeout(500);
                    attestationToast = await page.evaluate(() => document.body.innerText.includes('TXT confirmado por el profesional'));
                    await closeModal(page).catch(() => { /* the control may close the modal itself */ });
                    obs = await clickCsvAndObserve(page); // transport restored by realManualCopy
                    csvOk = csvDelivered(obs);
                }
            }
            await checkpoint(page, jl, 'after-attest');

            if (!apiAbsent) {
                witnessFail(N4, 'harness precondition failed: navigator.clipboard was NOT absent at the TXT click');
            } else if (!modalOpened) {
                witnessFail(N4, `clipboard API absent but the real PV Exportar TXT did NOT open the manual TXT modal with the full note (opened=${opened} modalCount=${state.modalCount} title=${JSON.stringify(state.title)} textLength=${state.text ? state.text.length : 0})`);
            } else if (!manualCopyWorked) {
                witnessFail(N4, 'precondition failed: real manual Ctrl+A/Ctrl+C did not deliver the modal text to the clipboard');
            } else if (!copiado || !copiado.id) {
                witnessFail(N4, `no explicit «He copiado el TXT» attestation control with an id in the no-API modal (controls=${JSON.stringify(controls.map((c) => c.label))})`);
            } else if (csvOk && attestationToast) {
                witnessPass(N4, `no-Clipboard-API TXT modal + manual copy + attestation (${copiado.label}) authorized the same-payload 497 CSV (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessFail(N4, `attestation control present (${copiado.label}) but csvOk=${csvOk} attestationToast=${attestationToast} (via=${obs ? csvDeliveredVia(obs) : 'n/a'})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-ATTEST-COPY (PV, T20-02/E1): TXT clipboard reject -> real manual
    // modal -> «Copiar» real success (writeText reject + armed execCommand
    // TRUE) -> CSV enabled (story 4, #620 semantics preserved).
    // =====================================================================
    {
        const jl = 'J-ATTEST-COPY';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-ATT-1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            const modal = await txtExportAwaitModal(page);
            await armRejectThenTrue(page);
            await page.click('#copyToClipboardModalBtn');
            await page.waitForTimeout(900);
            const copySucceeded = await page.evaluate(() => document.body.innerText.includes('Contenido copiado al portapapeles.'));
            await closeModal(page);
            await disarmAllPlants(page);
            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv');

            if (modal.modalCount !== 1 || !copySucceeded) {
                witnessFail(E1, `harness precondition failed: modal=${modal.modalCount} copySuccessClaim=${copySucceeded}`);
            } else if (csvDelivered(obs)) {
                witnessPass(E1, `modal Copiar real success enabled the 497 CSV (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessFail(E1, `modal Copiar real success (claim shown) did NOT enable the CSV (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-ATTEST-COPY-FAIL (PV, T20-02/E2): modal «Copiar» failure keeps the
    // CSV blocked with the modal open and the byte-identical text (story 4).
    // =====================================================================
    {
        const jl = 'J-ATTEST-COPY-FAIL';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-ATT2-1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            const before = await txtExportAwaitModal(page);
            await armRejectThenFalse(page);
            await page.click('#copyToClipboardModalBtn');
            await page.waitForTimeout(900);
            const after = await readModalState(page);
            const preserved = after.modalCount === 1 && after.text === before.text;
            const bodyAfterFail = await page.evaluate(() => document.body.innerText);
            const bannedAfterFail = BANNED_SUCCESS_CLAIMS.filter((token) => bodyAfterFail.includes(token));
            await closeModal(page);
            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv');

            if (!preserved || csvDelivered(obs) || bannedAfterFail.length > 0) {
                witnessFail(E2, `modalPreserved=${preserved} delivered=${csvDelivered(obs)} via=${csvDeliveredVia(obs)} banned=${JSON.stringify(bannedAfterFail)}`);
            } else {
                witnessPass(E2, `Copiar failure: modal stayed open with the byte-identical text, CSV blocked, no success claim (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-MANUAL-ATTEST (PV, T20-02/E3): real Ctrl+A/Ctrl+C + explicit
    // attestation control «He copiado el TXT» -> CSV enabled + approved
    // wording (story 5).
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
            const controls = await findAttestationControls(page);
            const copiado = controls.find((c) => c.kind === 'copiado');
            let attestationToast = false;
            let csvOk = false;
            let obs = null;
            if (copiado && !copiado.id) {
                witnessFail(E3, `attestation control found (${copiado.label}) but without an id to perform a supported click on it`);
            } else if (copiado) {
                await page.click(`#${copiado.id}`); // supported click on the real control
                await page.waitForTimeout(500);
                attestationToast = await page.evaluate(() => document.body.innerText.includes('TXT confirmado por el profesional'));
                await closeModal(page).catch(async () => { /* the control may close the modal itself */ });
                // clipboard plants already disarmed by realManualCopy
                obs = await clickCsvAndObserve(page);
                csvOk = csvDelivered(obs);
            }
            await checkpoint(page, jl, 'after-attest');

            if (!manualCopyWorked) {
                witnessFail(E3, `precondition failed: real manual Ctrl+A/Ctrl+C did not deliver the modal text to the clipboard (${clip.ok ? 'mismatch' : clip.error})`);
            } else if (!copiado) {
                witnessFail(E3, `real manual copy worked (${clip.text.length} chars) but NO explicit «He copiado el TXT» attestation control exists in the flow`);
            } else if (csvOk && attestationToast) {
                witnessPass(E3, `manual copy + attestation control (${copiado.label}) enabled the 497 CSV (via=${csvDeliveredVia(obs)}) with the approved wording «TXT confirmado por el profesional»`);
            } else {
                witnessFail(E3, `attestation control present (${copiado.label}) but csvOk=${csvOk} attestationToast=${attestationToast} (via=${obs ? csvDeliveredVia(obs) : 'n/a'})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-MANUAL-NO-ATTEST (Seguimiento, T20-02/E4): real manual copy WITHOUT
    // any attestation must leave the CSV blocked (story 5).
    // =====================================================================
    {
        const jl = 'J-MANUAL-NO-ATTEST';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_SEGUIMIENTO}?id=SYN-SEG-200`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-SEG-200', isSeguimiento: true });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            const modal = await txtExportAwaitModal(page);
            const clip = await realManualCopy(page);
            await closeModal(page);
            const bodyAfterClose = await page.evaluate(() => document.body.innerText);
            const bannedAfterClose = BANNED_SUCCESS_CLAIMS.filter((token) => bodyAfterClose.includes(token));
            await armWriteMode(page, 'reject');
            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv');

            if (!clip.ok || clip.text !== modal.text) {
                witnessFail(E4, `precondition failed: real manual copy did not work (${clip.ok ? 'mismatch' : clip.error})`);
            } else if (csvDelivered(obs) || bannedAfterClose.length > 0) {
                witnessFail(E4, `CSV delivered after a bare manual copy with NO explicit attestation (via=${csvDeliveredVia(obs)}) and/or success claims=${JSON.stringify(bannedAfterClose)}`);
            } else {
                witnessPass(E4, `bare manual copy without attestation keeps CSV blocked on Seguimiento (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-SAVED-ATTEST (Seguimiento, T20-02/E5): clicking «He guardado el TXT»
    // (saved-file path, no clipboard copy) authorizes the gate (story 6).
    // =====================================================================
    {
        const jl = 'J-SAVED-ATTEST';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_SEGUIMIENTO}?id=SYN-SEG-200`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-SEG-200', isSeguimiento: true });
            await armWriteMode(page, 'reject');
            await checkpoint(page, jl, 'after-fill');

            const modal = await txtExportAwaitModal(page);
            const controls = await findAttestationControls(page);
            const guardado = controls.find((c) => c.kind === 'guardado');
            let attestationToast = false;
            let csvOk = false;
            let obs = null;
            if (guardado && !guardado.id) {
                witnessFail(E5, `«He guardado el TXT» control found (${guardado.label}) but without an id to perform a supported click on it`);
            } else if (guardado) {
                await page.click(`#${guardado.id}`); // no clipboard copy is performed: pure professional attestation
                await page.waitForTimeout(500);
                attestationToast = await page.evaluate(() => document.body.innerText.includes('TXT confirmado por el profesional'));
                await closeModal(page).catch(async () => { /* the control may close the modal itself */ });
                await disarmAllPlants(page);
                obs = await clickCsvAndObserve(page);
                csvOk = csvDelivered(obs);
            }
            await checkpoint(page, jl, 'after-attest');

            if (modal.modalCount !== 1) {
                witnessFail(E5, `harness precondition failed: the TXT modal did not open`);
            } else if (!guardado) {
                witnessFail(E5, `NO explicit «He guardado el TXT» attestation control exists in the flow (controls=${JSON.stringify(controls.map((c) => c.label))})`);
            } else if (csvOk && attestationToast) {
                witnessPass(E5, `saved-file attestation (${guardado.label}) enabled the 497 CSV (via=${csvDeliveredVia(obs)}) with the approved wording «TXT confirmado por el profesional»`);
            } else {
                witnessFail(E5, `guardado attestation present but csvOk=${csvOk} attestationToast=${attestationToast} (via=${obs ? csvDeliveredVia(obs) : 'n/a'})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-DOWNLOAD-CONFIRM-OK (PV, T20-02/E6): clipboard rejects AND the modal
    // infrastructure is unavailable -> download fallback fires -> the explicit
    // download confirmation is ACCEPTED -> CSV enabled. link.click() alone
    // never authorizes; the authorization follows the explicit in-flow user
    // decision (window.confirm dialog, a user-agent control).
    // =====================================================================
    {
        const jl = 'J-DOWNLOAD-CONFIRM-OK';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-DLC-1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await plantModalAvailabilitySwitch(page);
            await checkpoint(page, jl, 'after-fill');

            await setModalAvailable(page, false);
            await page.on('dialog', (dialog) => dialog.accept()); // explicit professional confirmation
            await clickTxtAndWait(page);
            const downloadsAfterTxt = entry.downloads.length;
            await checkpoint(page, jl, 'after-txt-download-accept');

            await armWriteMode(page, 'allow'); // the CSV delivery path must not be the blocker
            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv');

            if (downloadsAfterTxt < 1) {
                witnessFail(E6, `harness precondition failed: no download fallback fired (downloads=${downloadsAfterTxt})`);
            } else if (csvDelivered(obs)) {
                witnessPass(E6, `download fallback + explicit confirmation accepted enabled the 497 CSV (downloads=${downloadsAfterTxt}, via=${csvDeliveredVia(obs)})`);
            } else {
                witnessFail(E6, `download + accepted explicit confirmation did NOT enable the CSV (downloads=${downloadsAfterTxt}, via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-DOWNLOAD-CONFIRM-CANCEL (PV, T20-02/E7): same download fallback, but
    // the explicit confirmation is DISMISSED -> fail closed with honest retry
    // feedback, no success claim, CSV blocked (stories 6/7).
    // =====================================================================
    {
        const jl = 'J-DOWNLOAD-CONFIRM-CANCEL';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-DLC2-1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await plantModalAvailabilitySwitch(page);
            await checkpoint(page, jl, 'after-fill');

            await setModalAvailable(page, false);
            await page.on('dialog', (dialog) => dialog.dismiss()); // no professional confirmation
            await clickTxtAndWait(page);
            const bodyAfterDismiss = await page.evaluate(() => document.body.innerText);
            const bannedAfterDismiss = BANNED_SUCCESS_CLAIMS.filter((token) => bodyAfterDismiss.includes(token));
            const honestRetry = /sigue bloqueado|repet[ai]r|repite/i.test(bodyAfterDismiss);
            await checkpoint(page, jl, 'after-txt-download-dismiss');

            await armWriteMode(page, 'allow'); // the CSV delivery path must not be the blocker
            await setModalAvailable(page, true);
            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv');

            if (csvDelivered(obs) || bannedAfterDismiss.length > 0 || !honestRetry) {
                witnessFail(E7, `delivered=${csvDelivered(obs)} via=${csvDeliveredVia(obs)} honestRetry=${honestRetry} banned=${JSON.stringify(bannedAfterDismiss)}`);
            } else {
                witnessPass(E7, `dismissed download confirmation fails closed: CSV blocked (via=${csvDeliveredVia(obs)}), honest retry feedback shown, no success claim`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-STALE-MODAL (PV, story 10 + C1/F2): TXT #1 is armed with a DELAYED
    // rejection (1500 ms); TXT #2 (parked, current export) supersedes it
    // before P1 lands. P1's LATE rejection must perform NO side effect at
    // all: NO modal open/replace, NO fallback notification, NO success
    // claim, NO authorization (the stale branch must not even reach
    // mostrarModalTexto). The CURRENT export's resolving result does
    // authorize (story 10). Every click is supported: both TXT clicks happen
    // while no modal is open.
    // =====================================================================
    {
        const jl = 'J-STALE-MODAL';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-STALEM-1', isSeguimiento: false });
            await armDelayedReject(page, 1500);
            await checkpoint(page, jl, 'after-fill');

            await clickTxtAndWait(page); // P1: delayed rejection (superseded below before it lands)
            await armWriteMode(page, 'park');
            await clickTxtAndWait(page); // P2 parked; current export; gate invalidated
            const parkedCount = await page.evaluate(() => window.__tg.parked.length);
            await checkpoint(page, jl, 'after-two-txt');

            // P1's late rejection lands: it must perform NO side effect.
            await page.waitForTimeout(1600);
            const staleModal = await readModalState(page);
            const staleControls = await findAttestationControls(page);
            const bodyAfterLate = await page.evaluate(() => document.body.innerText);
            const bannedLate = BANNED_SUCCESS_CLAIMS.filter((token) => bodyAfterLate.includes(token));
            const staleFallbackNotice = bodyAfterLate.includes('No se pudo copiar autom\u00e1ticamente');
            await checkpoint(page, jl, 'after-stale-rejection');

            if (parkedCount !== 1) {
                witnessFail(E8, `harness precondition failed: parked=${parkedCount}`);
            } else if (staleModal.modalCount !== 0) {
                witnessFail(E8, `the SUPERSEDED attempt's late rejection opened/replaced a modal (modalCount=${staleModal.modalCount}, title=${JSON.stringify(staleModal.title)}) — a stale rejection must perform no side effect`);
            } else if (staleControls.length > 0) {
                witnessFail(E8, `attestation controls present after the superseded rejection: ${JSON.stringify(staleControls.map((c) => c.label))}`);
            } else if (bannedLate.length > 0 || staleFallbackNotice) {
                witnessFail(E8, `the superseded attempt produced late feedback: banned=${JSON.stringify(bannedLate)} fallbackNotice=${staleFallbackNotice}`);
            } else {
                // Close the stale modal through its real close control if one
                // opened (baseline defect); a no-op when none opened (fix).
                await closeModal(page).catch(() => {});
                // CSV still blocked (P2 has not resolved; nothing authorized).
                await armWriteMode(page, 'reject');
                const staleObs = await clickCsvAndObserve(page);
                const staleCsvBlocked = !csvDelivered(staleObs);
                await checkpoint(page, jl, 'after-stale-csv');

                const r2 = await resolveParkedPromise(page); // CURRENT export result lands
                await page.waitForTimeout(700);
                await checkpoint(page, jl, 'after-current-resolution');
                const obs = await clickCsvAndObserve(page);
                await checkpoint(page, jl, 'after-current-csv');

                if (!r2) {
                    witnessFail(E8, `harness precondition failed: the parked current export did not resolve`);
                } else if (!staleCsvBlocked) {
                    witnessFail(E8, `CSV was delivered before the current export resolved (via=${csvDeliveredVia(staleObs)})`);
                } else if (!csvDelivered(obs)) {
                    witnessFail(E8, `precondition inverted: the CURRENT export's resolving result did not enable CSV (via=${csvDeliveredVia(obs)})`);
                } else {
                    witnessPass(E8, `superseded rejection performed NO side effect (no modal, no notice, no claim); the current export result authorized (final via=${csvDeliveredVia(obs)})`);
                }
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-EDIT-INFLIGHT-SUCCESS (PV, Impl. decisions C1/F1): a clipboard result
    // parked in flight is retired by an invalidating edit: the late success
    // shows NO toast and authorizes nothing.
    // =====================================================================
    {
        const jl = 'J-EDIT-INFLIGHT-SUCCESS';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-EDFL-1', isSeguimiento: false });
            await armWriteMode(page, 'park');
            await checkpoint(page, jl, 'after-fill');

            await clickTxtAndWait(page); // P1 parked, in flight
            const parkedCount = await page.evaluate(() => window.__tg.parked.length);
            await openAncestorCollapsibles(page, '#pcrValue');
            await page.fill('#pcrValue', '9'); // invalidating edit while P1 is in flight (real input event)
            await checkpoint(page, jl, 'after-edit');
            const resolved = await resolveParkedPromise(page); // late success lands
            await page.waitForTimeout(700);
            const bodyAfterLate = await page.evaluate(() => document.body.innerText);
            const bannedLate = BANNED_SUCCESS_CLAIMS.filter((token) => bodyAfterLate.includes(token));
            await checkpoint(page, jl, 'after-late-resolution');

            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv');

            if (parkedCount !== 1 || !resolved) {
                witnessFail(E9, `harness precondition failed: parked=${parkedCount} resolved=${resolved}`);
            } else if (bannedLate.length > 0) {
                witnessFail(E9, `late success claim after the invalidating edit retired the in-flight result: ${JSON.stringify(bannedLate)}`);
            } else if (csvDelivered(obs)) {
                witnessFail(E9, `the retired in-flight result authorized CSV after the edit (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessPass(E9, `the edit retired the in-flight result: no late success claim, CSV blocked (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-EDIT-INFLIGHT-MODAL (PV, Impl. decisions C1/F1): a clipboard attempt
    // in flight is retired by an invalidating edit: its LATE rejection opens
    // NO manual modal and shows NO fallback notice.
    // =====================================================================
    {
        const jl = 'J-EDIT-INFLIGHT-MODAL';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-EDMD-1', isSeguimiento: false });
            await armDelayedReject(page, 1500);
            await checkpoint(page, jl, 'after-fill');

            await clickTxtAndWait(page); // P1 in flight (delayed rejection)
            await openAncestorCollapsibles(page, '#pcrValue');
            await page.fill('#pcrValue', '9'); // invalidating edit before the rejection lands
            await checkpoint(page, jl, 'after-edit');
            await page.waitForTimeout(1300); // P1's late rejection lands
            const modalAfterLate = await readModalState(page);
            const controlsAfterLate = await findAttestationControls(page);
            const bodyAfterLate = await page.evaluate(() => document.body.innerText);
            const bannedLate = BANNED_SUCCESS_CLAIMS.filter((token) => bodyAfterLate.includes(token));
            const fallbackNotice = bodyAfterLate.includes('No se pudo copiar autom\u00e1ticamente');
            await checkpoint(page, jl, 'after-late-rejection');
            // Close the late modal through its real close control if one
            // opened (baseline defect); a no-op when none opened (fix).
            await closeModal(page).catch(() => {});

            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv');

            if (modalAfterLate.modalCount !== 0) {
                witnessFail(E10, `the retired attempt's late rejection opened the manual modal (modalCount=${modalAfterLate.modalCount}, title=${JSON.stringify(modalAfterLate.title)})`);
            } else if (controlsAfterLate.length > 0) {
                witnessFail(E10, `attestation controls present after the retired attempt: ${JSON.stringify(controlsAfterLate.map((c) => c.label))}`);
            } else if (bannedLate.length > 0 || fallbackNotice) {
                witnessFail(E10, `late feedback from the retired attempt: banned=${JSON.stringify(bannedLate)} fallbackNotice=${fallbackNotice}`);
            } else if (csvDelivered(obs)) {
                witnessFail(E10, `CSV delivered although the TXT attempt was retired by the edit (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessPass(E10, `the edit retired the in-flight attempt: the late rejection performed no side effect, CSV blocked (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-STALE-DOWNLOAD (PV, story 10 + C1/F2): the SUPERSEDED attempt's late
    // rejection in the download branch (clipboard rejects AND modal
    // infrastructure unavailable) must perform NO side effect: NO download
    // initiation, NO confirmation dialog, NO notification.
    // =====================================================================
    {
        const jl = 'J-STALE-DOWNLOAD';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-STDW-1', isSeguimiento: false });
            await plantModalAvailabilitySwitch(page);
            await setModalAvailable(page, false);
            const dialogs = [];
            recordDialogs(page, dialogs);
            await armDelayedReject(page, 1200);
            await checkpoint(page, jl, 'after-fill');

            await clickTxtAndWait(page); // P1 in flight: delayed rejection, download branch pending
            await armWriteMode(page, 'park');
            await clickTxtAndWait(page); // P2 parked; supersedes P1
            const parkedCount = await page.evaluate(() => window.__tg.parked.length);
            await page.waitForTimeout(1300); // P1's late rejection lands
            const bodyAfterLate = await page.evaluate(() => document.body.innerText);
            const downloadNotice = bodyAfterLate.includes('Se descargar\u00e1');
            const bannedLate = BANNED_SUCCESS_CLAIMS.filter((token) => bodyAfterLate.includes(token));
            await checkpoint(page, jl, 'after-late-rejection');

            // CSV still blocked (P2 parked; nothing authorized).
            await armWriteMode(page, 'reject');
            const staleObs = await clickCsvAndObserve(page);
            const staleCsvBlocked = !csvDelivered(staleObs);
            await checkpoint(page, jl, 'after-stale-csv');

            if (parkedCount !== 1) {
                witnessFail(E11, `harness precondition failed: parked=${parkedCount}`);
            } else if (entry.downloads.length > 0) {
                witnessFail(E11, `the SUPERSEDED attempt initiated a download (downloads=${entry.downloads.length}) — a stale rejection must perform no side effect`);
            } else if (dialogs.length > 0) {
                witnessFail(E11, `the SUPERSEDED attempt presented a confirmation dialog: ${JSON.stringify(dialogs.map((m) => m.slice(0, 120)))}`);
            } else if (downloadNotice || bannedLate.length > 0) {
                witnessFail(E11, `the superseded attempt produced late feedback: downloadNotice=${downloadNotice} banned=${JSON.stringify(bannedLate)}`);
            } else if (!staleCsvBlocked) {
                witnessFail(E11, `CSV was delivered although nothing was authorized (via=${csvDeliveredVia(staleObs)})`);
            } else {
                witnessPass(E11, `superseded download-branch rejection performed NO side effect (no download, no dialog, no notice); CSV blocked (via=${csvDeliveredVia(staleObs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-IDENTITY-CHANGED (PV, story 8 + C1/F3): identity/context fields DO
    // figure in the exportable payload; after an authorized TXT, editing one
    // (visit date here) alters visitKey and must block CSV with the EXACT
    // story-8 discrepancy message — not the generic prerequisite message.
    // =====================================================================
    {
        const jl = 'J-IDENTITY-CHANGED';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-IDCH-1', isSeguimiento: false });
            await armWriteMode(page, 'allow');
            await checkpoint(page, jl, 'after-fill');
            await clickTxtAndWait(page); // authorized on the original identity
            await checkpoint(page, jl, 'after-txt');

            await openAncestorCollapsibles(page, '#fechaVisita');
            await page.fill('#fechaVisita', '2026-02-11'); // identity/context edit -> visitKey changes
            await checkpoint(page, jl, 'after-identity-edit');
            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv');

            const changedShown = obs.bodyText.includes(TXT_GATE_CHANGED_MSG);
            const prereqShown = obs.bodyText.includes(LEGAL_GATE_MESSAGE);
            if (csvDelivered(obs)) {
                witnessFail(E12, `CSV delivered after an identity-field edit (via=${csvDeliveredVia(obs)}) — authorization must be denied fail-closed`);
            } else if (!changedShown) {
                witnessFail(E12, `CSV blocked but the exact story-8 discrepancy message is NOT shown after an identity edit (prerequisite shown=${prereqShown}); body snippet=${JSON.stringify(obs.bodyText.slice(0, 400))}`);
            } else if (prereqShown) {
                witnessFail(E12, `the generic prerequisite message was shown instead of the discrepancy message`);
            } else {
                witnessPass(E12, `identity-field edit after TXT: CSV blocked fail-closed with the exact discrepancy message (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-DOWNLOAD-TRUTHFUL (PV, story 6 + C1/F4): the in-flow download
    // confirmation must NOT claim a completed download before the
    // professional attests; it must be a truthful initiated-download prompt.
    // Authorization semantics unchanged: accepting still enables CSV.
    // =====================================================================
    {
        const jl = 'J-DOWNLOAD-TRUTHFUL';
        const { context, page, entry } = await openJourneyPage(browser, origin, `/${PAGE_PRIMERA}`, {
            otherMarkerKey: SENTINEL_OTHER_KEY, otherMarkerValue: SENTINEL_OTHER_VALUE,
            pendingKey: SENTINEL_PENDING_KEY, pendingValue: SENTINEL_PENDING_VALUE,
            matchingMarker: false,
        });
        try {
            await fillClinicalBase(page, { cip: 'SYN-GATE-DLTR-1', isSeguimiento: false });
            await armWriteMode(page, 'reject');
            await plantModalAvailabilitySwitch(page);
            await checkpoint(page, jl, 'after-fill');

            const dialogs = [];
            page.on('dialog', (dialog) => { dialogs.push(dialog.message()); dialog.accept().catch(() => {}); }); // explicit professional confirmation
            await setModalAvailable(page, false);
            await clickTxtAndWait(page);
            const downloadsAfterTxt = entry.downloads.length;
            await checkpoint(page, jl, 'after-txt-download-accept');

            await armWriteMode(page, 'allow'); // the CSV delivery path must not be the blocker
            const obs = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv');

            const confirmMessage = dialogs.find((m) => m.includes('TXT')) || '';
            const claimsCompleted = /Se ha descargado/i.test(confirmMessage);
            const truthfulPrompt = /Se ha iniciado la descarga/i.test(confirmMessage)
                && /Confirmas que ya has copiado o guardado este TXT/i.test(confirmMessage);

            if (downloadsAfterTxt < 1 || !confirmMessage) {
                witnessFail(E13, `harness precondition failed: downloads=${downloadsAfterTxt} dialogs=${dialogs.length}`);
            } else if (claimsCompleted) {
                witnessFail(E13, `the download confirmation asserts an unobserved completed download: ${JSON.stringify(confirmMessage.slice(0, 160))}`);
            } else if (!truthfulPrompt) {
                witnessFail(E13, `the download confirmation is not the truthful initiated-download prompt: ${JSON.stringify(confirmMessage.slice(0, 160))}`);
            } else if (!csvDelivered(obs)) {
                witnessFail(E13, `authorization semantics changed: the accepted explicit confirmation did NOT enable the CSV (via=${csvDeliveredVia(obs)})`);
            } else {
                witnessPass(E13, `download confirmation is truthful (initiated, not completed) and accepting it still enables the 497 CSV (via=${csvDeliveredVia(obs)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // J-SEG-POS (Seguimiento): clipboard resolve enables CSV; same-instance
    // re-export (stories 2/13).
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
            await armWriteMode(page, 'reject');
            const reCsv = await clickCsvAndObserve(page);
            await checkpoint(page, jl, 'after-csv-2');

            if (!csvDelivered(firstCsv) || !csvDelivered(reCsv)) {
                witnessFail(D11, `Seguimiento clipboard-confirmed TXT -> CSV delivered=${csvDelivered(firstCsv)} (${csvDeliveredVia(firstCsv)}); re-export delivered=${csvDelivered(reCsv)} (${csvDeliveredVia(reCsv)})`);
            } else {
                witnessPass(D11, `Seguimiento 497 CSV delivered after clipboard-confirmed TXT (${csvDeliveredVia(firstCsv)}) and re-exported without repeating TXT (${csvDeliveredVia(reCsv)})`);
            }

            auditCheckpoints(jl);
            classifyJourneyErrors(jl, entry);
        } finally {
            await context.close();
        }
    }

    // =====================================================================
    // Aggregated witnesses: sentinels byte-unchanged (D3), zero new storage
    // writes (D4), pageerror/console classification (D12).
    // =====================================================================
    {
        const sentinelViolations = allStorageDiffs.filter((d) => sentinelKeysInPlay.has(d.key));
        if (sentinelViolations.length === 0) {
            witnessPass(D3, `planted legacy markers + hubPendingRows byte-identical across ${allCheckpoints.length} storage checkpoints in every journey`);
        } else {
            witnessFail(D3, `sentinel mutations observed: ${JSON.stringify(sentinelViolations.slice(0, 6))}`);
        }
    }
    {
        const writeViolations = allStorageDiffs.filter((d) => !sentinelKeysInPlay.has(d.key));
        if (writeViolations.length === 0) {
            witnessPass(D4, 'no new Web Storage writes by the TXT\u2192CSV flow in any journey');
        } else {
            witnessFail(D4, `${writeViolations.length} gate storage write(s) across journeys; keys=${JSON.stringify([...new Set(writeViolations.map((v) => `${v.store}:${v.key}`))].slice(0, 8))}`);
        }
    }
    {
        if (errorViolations.length === 0) {
            witnessPass(D12, 'pageerror=0 everywhere; console errors only within the classified controlled-failure classes');
        } else {
            witnessFail(D12, `${errorViolations.length} violation(s): ${JSON.stringify(errorViolations.slice(0, 6))}`);
        }
    }

    // =====================================================================
    // Final per-witness table + totals.
    // =====================================================================
    console.log('\n=== T20-01 + T20-02 + T21 MEMORY GATE ORACLE — PER-WITNESS TABLE ===');
    console.log('ID   | baseline | verdict | story            | contract');
    for (const w of witnesses) {
        console.log(`${w.id.padEnd(4)} | ${w.baseline.padEnd(8)} | ${w.verdict.padEnd(7)} | ${w.story.padEnd(16)} | ${w.contract}`);
    }
    const counts = { PASS: 0, FAIL: 0, PENDING: 0 };
    for (const w of witnesses) counts[w.verdict] = (counts[w.verdict] || 0) + 1;
    console.log(`\nTOTALS: PASS ${counts.PASS} / FAIL ${counts.FAIL} / PENDING ${counts.PENDING}  (witnesses: ${witnesses.length})`);
    console.log(`\nREUMA-TXT-GATE-MEMORY: ${counts.FAIL === 0 && counts.PENDING === 0 ? 'ALL WITNESSES PASS' : 'FAIL'} ${counts.PASS}/${witnesses.length}`);

    exitCode = counts.FAIL === 0 && counts.PENDING === 0 ? 0 : 1;
} catch (error) {
    console.error('ENVIRONMENT/HARNESS FAILURE (never a product RED):', error);
    exitCode = 1;
} finally {
    try { if (browser) await browser.close(); } catch { /* ignore */ }
    server.close();
}

process.exit(exitCode);
