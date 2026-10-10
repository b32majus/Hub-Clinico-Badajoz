#!/usr/bin/env node
'use strict';
/**
 * T20-01 focused oracle — ephemeral in-memory TXT→CSV gate (automatic path).
 * TRAIN 20 / #621. Authority (repo-local, read-only):
 *   docs/handoffs/TRAIN_NEXUS_REUMA_TXT_GATE_20.md            (accepted WO)
 *   docs/handoffs/TRAIN_NEXUS_REUMA_TXT_GATE_20_SPEC.md       (accepted spec)
 *   docs/handoffs/TRAIN_NEXUS_REUMA_TXT_GATE_20_TICKETS/01-memory-gate.md (ticket)
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
 * RED BASELINE (frozen expectation on HEAD 32f6887f41887cb16f3d00239a6dc3102936f156):
 *   The legacy gate authorizes from sessionStorage markers and from merely
 *   opening the manual modal, and `markTxtExportDone` persists
 *   `HubClinico_TxtExportDone_*`. Expected on baseline:
 *     RED:  D0, D1, D2, D4, D7, D9
 *     PASS: D3, D5, D6, D8, D10, D11, D12
 *   After T20-01 every witness must be PASS.
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
        writeMode: 'reject', // 'reject' | 'throw' | 'allow' | 'park'
        writeAttempts: 0,
        parked: [],
        clipboardAvailable: true,
        pageShows: [],
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
}

async function armWriteMode(page, mode) {
    await page.evaluate((m) => { window.__tg.writeMode = m; }, mode);
}
async function resolveParkedPromise(page) {
    return page.evaluate(() => {
        const resolve = window.__tg.parked.shift();
        if (typeof resolve === 'function') { resolve(); return true; }
        return false;
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
    console.log(`T20-01 focused oracle. Baseline expectation: RED on D0/D1/D2/D4/D7/D9, PASS on the rest.\n`);

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
    console.log('\n=== T20-01 MEMORY GATE ORACLE — PER-WITNESS TABLE ===');
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
