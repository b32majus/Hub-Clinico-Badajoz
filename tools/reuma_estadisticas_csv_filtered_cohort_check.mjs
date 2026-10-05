#!/usr/bin/env node
'use strict';
/**
 * Focal deterministic oracle for #537
 * (WO-NEXUS-REUMA-STATS-CSV-FILTERED-COHORT-15): `Exportar CSV` on Estadísticas
 * must export exactly the formal filtered cohort (getActiveFilters() -> Reuma
 * Population Read Port -> updateDashboard -> currentCohort), never the total
 * population, never the `Buscar en tabla`-narrowed display copy.
 *
 * The checker loads the real, unmodified page code (`modules/hubTools.js`,
 * `modules/fieldNormalizer.js`, `modules/utils.js`, `modules/dataManager.js`,
 * `modules/exportManager.js`, `scripts/reuma_population_read_port.js`,
 * `scripts/script_estadisticas.js`) in ONE vm sandbox with a controlled DOM stub,
 * drives the REAL `#exportCohortBtn` click handler registered by the page script,
 * and compares stable patient identities (`ID_Paciente`) as a MULTISET between:
 *   - the formal filtered cohort (`currentCohort` after `updateDashboard()`), and
 *   - the rows the real exporter actually serializes (CSV text captured through
 *     a stubbed Blob/anchor download, plus the exact argument it was invoked with).
 *
 * Synthetic data only: `tools/fixtures/reuma_read/corpus_v1.json` (6 unique
 * synthetic identities SYN-*).
 *
 * It is capable of disagreeing with the implementation. It FAILS when export
 * (a) never runs/produces rows, (b) falls back to the total population,
 * (c) follows the `Buscar en tabla`-narrowed display copy, or (d) matches count
 * while differing in identity. Witness controls W1/W2 prove the comparator is
 * identity-sensitive (not count-based).
 *
 * Cases:
 *   S1  static wiring: the click handler resolves the exporter through the
 *       namespace it is actually published on (`HubTools.export.exportCohortToCSV`),
 *       passes `currentCohort`, and stays fail-safe/observable if missing.
 *   C1  no filter: the complete supported 6-patient cohort is exported (all 6
 *       distinct identities).
 *   C2  single filter `pathology=ESPA`: total (6) > filtered (2); exported
 *       identity multiset == filtered cohort multiset.
 *   C3  combination `ttoType=FAMEs` + `ttoSpecific=FAME sintetico`: 3 identities;
 *       exported multiset == filtered multiset.
 *   C4  zero result `pathology=ESPA` + `ttoSpecific=FAME sintetico B`: upstream
 *       total stays 6 while the formal cohort is EMPTY; export must NOT fall back
 *       to total and must fabricate nothing (existing exporter fail-safe: warning
 *       + no download/no rows). The exporter must still be REACHED with the empty
 *       cohort, otherwise the fail-safe is unproven.
 *   C5  adversarial `Buscar en tabla`: formal cohort stays 6 while the local
 *       search narrows the display copy to 1 row; export must still follow the
 *       formal cohort (accepted decision in #537).
 *   W1  comparator witness: same identities in different order compare equal.
 *   W2  comparator witness: same COUNT with a different identity compares NOT equal.
 *
 * Exit codes: 0 = every case PASS, 1 = at least one case FAIL.
 * Usage: node tools/reuma_estadisticas_csv_filtered_cohort_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createLegacySandbox } from './reuma_read_harness.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const CORPUS_FILE = path.join(ROOT, 'tools', 'fixtures', 'reuma_read', 'corpus_v1.json');
const CORPUS = JSON.parse(fs.readFileSync(CORPUS_FILE, 'utf8'));
const MODULES = [
    'modules/hubTools.js',
    'modules/fieldNormalizer.js',
    'modules/utils.js',
    'modules/dataManager.js',
    'modules/exportManager.js',
];
const SEAM_FILE = path.join(ROOT, 'scripts', 'reuma_population_read_port.js');
const SEAM_RELATIVE = 'scripts/reuma_population_read_port.js';
const CONSUMER_FILE = path.join(ROOT, 'scripts/script_estadisticas.js');
const CONSUMER_RELATIVE = 'scripts/script_estadisticas.js';
const CONSUMER_SOURCE = fs.readFileSync(CONSUMER_FILE, 'utf8');
const SEAM_SOURCE = fs.readFileSync(SEAM_FILE, 'utf8');

// Synthetic drug catalogue rows (same shape as tools/reuma_estadisticas_read_seam_check.mjs).
const FARMACOS_ROWS = [
    ['Sistemicos', 'FAMEs', 'Biologicos'],
    ['Sintetico Sist A', 'Sintetico FAME A', 'Sintetico Bio A'],
    ['Sintetico Sist B', 'Sintetico FAME B', ''],
];

// Supported UI defaults (mirror estadisticas.html first-option/empty/range-max states).
const UI_DEFAULTS = {
    filterDateFrom: '', filterDateTo: '',
    filterPathology: 'Todos', filterSex: 'Todos',
    filterAgeFrom: '', filterAgeTo: '',
    filterBiomarker: 'Todos', filterActivityIndex: 'BASDAI', filterActivityState: 'Todos',
    filterEVADolor: '10', filterEVAGlobal: '10',
    filterTtoType: 'Todos', filterTtoSpecific: 'Todos',
    filterComorbidity: 'Todos', filterExtraArticular: 'Todos',
};
const ADVERSE_ID = 'filterAdverseEffect';

// Pinned empirical expectations against corpus_v1.json (6 unique SYN-* identities).
const ALL_SIX = ['SYN-APS-001', 'SYN-AR-001', 'SYN-ESPA-001', 'SYN-ESPA-002', 'SYN-LES-001', 'SYN-SJO-001'].sort();
const ESPA_TWO = ['SYN-ESPA-001', 'SYN-ESPA-002'].sort();
const FAME_THREE = ['SYN-APS-001', 'SYN-AR-001', 'SYN-ESPA-001'].sort();

const results = [];
function record(name, pass, detail) {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function multisetEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    const x = [...a].sort();
    const y = [...b].sort();
    return x.every((v, i) => v === y[i]);
}

// ---------------------------------------------------------------------------
// Controlled DOM stub: absorbs every page-script read/write, captures the real
// `#exportCohortBtn` click handler, and records real Blob/anchor downloads.
// ---------------------------------------------------------------------------
function makeClassList() {
    const set = new Set();
    return {
        add: (c) => set.add(c),
        remove: (c) => { set.delete(c); },
        toggle: (c) => { if (set.has(c)) set.delete(c); else set.add(c); },
        contains: (c) => set.has(c),
    };
}

function makeElement(tag, id, hooks) {
    const handlers = {};
    const el = {
        tagName: String(tag || 'div').toUpperCase(),
        id: id || '',
        value: undefined,
        checked: false,
        type: '',
        selectedIndex: 0,
        max: '10',
        textContent: '',
        innerHTML: '',
        disabled: false,
        hidden: false,
        selected: false,
        dataset: {},
        style: {},
        classList: makeClassList(),
        options: [],
        _attrs: {},
        _handlers: handlers,
        setAttribute(k, v) { el._attrs[String(k)] = String(v); },
        getAttribute(k) { return Object.hasOwn(el._attrs, String(k)) ? el._attrs[String(k)] : null; },
        addEventListener(type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
        removeEventListener() {},
        appendChild(child) { return child; },
        removeChild(child) { return child; },
        remove() {},
        click() {
            if (el.tagName === 'A' && hooks && typeof hooks.onAnchorClick === 'function') {
                hooks.onAnchorClick(el);
                return;
            }
            for (const fn of (handlers.click || [])) fn({ preventDefault() {}, stopPropagation() {}, target: el, currentTarget: el });
        },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        getContext() { return undefined; },
        closest() { return null; },
    };
    return el;
}

function createDomStub() {
    const elements = new Map();
    const domContentLoaded = [];
    const hooks = { onAnchorClick: null };
    const getElement = (id) => {
        if (!elements.has(id)) elements.set(id, makeElement('div', id, hooks));
        return elements.get(id);
    };
    const documentStub = {
        getElementById: (id) => getElement(String(id)),
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: (tag) => makeElement(tag, '', hooks),
        body: { appendChild() {}, removeChild() {} },
        addEventListener: (type, fn) => { if (type === 'DOMContentLoaded') domContentLoaded.push(fn); },
        removeEventListener() {},
        dispatchEvent() { return true; },
    };
    return { elements, getElement, domContentLoaded, hooks, documentStub };
}

async function loadCorpusInto(sandbox) {
    const workbook = XLSX.utils.book_new();
    for (const [sheetName, rows] of Object.entries(CORPUS.sheets)) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
    }
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(FARMACOS_ROWS), 'Frmacos');
    const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const file = {
        name: 'reuma_estadisticas_csv_check.xlsx',
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
    return sandbox.HubTools.data.loadDatabase(file);
}

function parseExportedIds(csvText) {
    const text = String(csvText || '').replace(/^﻿/, '');
    const lines = text.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.length > 0);
    if (lines.length === 0) return [];
    const header = lines[0].split(',');
    if (header[0] !== 'ID_Paciente') return null;
    return lines.slice(1).map((line) => line.split(',')[0]);
}

async function run() {
    // =====================================================================
    // S1 — static wiring of the real click handler.
    // =====================================================================
    {
        const namespaced = /HubTools\s*\.\s*export\s*\.\s*exportCohortToCSV\b/.test(CONSUMER_SOURCE);
        const bareRoot = /HubTools\s*\.\s*exportCohortToCSV\s*\(/.test(CONSUMER_SOURCE);
        // The resolved exporter (direct call or a same-handler alias such as
        // `const exportFn = ...HubTools.export.exportCohortToCSV; exportFn(currentCohort)`)
        // must be invoked with the formal filtered cohort `currentCohort`.
        const resolution = /(\w+)\s*=\s*HubTools\s*&&\s*HubTools\.export\s*&&\s*HubTools\.export\.exportCohortToCSV/.exec(CONSUMER_SOURCE);
        const passesCohort = /exportCohortToCSV\s*\(\s*currentCohort\s*\)/.test(CONSUMER_SOURCE) ||
            (resolution !== null && new RegExp(`${resolution[1]}\\s*\\(\\s*currentCohort\\s*\\)`).test(CONSUMER_SOURCE));
        const failSafe = /console\.error\((['"`])[^'"`]*exportCohortToCSV[^'"`]*\1\)/.test(CONSUMER_SOURCE);
        record('S1 export handler resolves HubTools.export.exportCohortToCSV, passes currentCohort, stays fail-safe',
            namespaced && !bareRoot && passesCohort && failSafe,
            `namespaced=${namespaced} bareRoot=${bareRoot} passesCohort=${passesCohort} failSafe=${failSafe}`);
    }

    // =====================================================================
    // W1/W2 — comparator witnesses (prove identity-sensitivity, not counts).
    // =====================================================================
    {
        record('W1 comparator witness: same identities in different order compare equal',
            multisetEqual(['SYN-ESPA-001', 'SYN-ESPA-002'], ['SYN-ESPA-002', 'SYN-ESPA-001']) === true,
            'comparator must be order-insensitive');
        record('W2 comparator witness: same count with a different identity compares NOT equal',
            multisetEqual(['SYN-ESPA-001', 'SYN-ESPA-002'], ['SYN-ESPA-001', 'SYN-AR-001']) === false,
            'comparator must falsify count-only equality');
    }

    // =====================================================================
    // Sandbox: real modules + real seam + real consumer behind the DOM stub.
    // =====================================================================
    const { sandbox, sink } = createLegacySandbox();
    const dom = createDomStub();
    const downloads = [];
    const exporterCalls = [];
    sandbox.document = dom.documentStub;
    sandbox.URL = {
        createObjectURL(blob) { downloads.push({ blob }); return 'blob:oracle-csv'; },
        revokeObjectURL() {},
    };
    sandbox.Blob = globalThis.Blob;
    sandbox.Chart = { defaults: { font: {}, plugins: { legend: { labels: {} }, tooltip: {} }, animation: {} } };
    dom.hooks.onAnchorClick = (anchor) => {
        const record_ = downloads[downloads.length - 1];
        if (record_) {
            record_.href = anchor.getAttribute('href');
            record_.download = anchor.getAttribute('download');
            record_.anchorClicked = true;
        }
    };

    for (const file of ['modules/utils.js', 'modules/exportManager.js']) {
        vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
    }
    vm.runInContext(SEAM_SOURCE, sandbox, { filename: SEAM_RELATIVE });
    vm.runInContext(CONSUMER_SOURCE, sandbox, { filename: CONSUMER_RELATIVE });

    // Spy (sandbox-only instrumentation): record the exact argument the real
    // exporter is invoked with, then call through to the real implementation.
    {
        const real = sandbox.HubTools.export.exportCohortToCSV;
        if (typeof real !== 'function') {
            record('sandbox precondition: real HubTools.export.exportCohortToCSV exists', false, typeof real);
            return;
        }
        sandbox.HubTools.export.exportCohortToCSV = function (...args) {
            exporterCalls.push(args);
            return real.apply(this, args);
        };
    }

    await loadCorpusInto(sandbox);
    for (const fn of dom.domContentLoaded) await fn();
    vm.runInContext(
        `globalThis.__537 = { updateDashboard, getActiveFilters, filterTableBySearch,
            formalIds(){ return (currentCohort || []).map((p) => p.ID_Paciente || p._id); },
            displayIds(){ return (filteredCohort || []).map((p) => p.ID_Paciente || p._id); } };`,
        sandbox,
        { filename: 'oracle-hooks' },
    );
    const H = sandbox.__537;
    const exportBtn = dom.getElement('exportCohortBtn');
    const clickHandlers = exportBtn._handlers.click || [];

    const setFilters = (overrides) => {
        for (const [id, value] of Object.entries(UI_DEFAULTS)) dom.getElement(id).value = value;
        dom.getElement(ADVERSE_ID).checked = false;
        for (const [id, value] of Object.entries(overrides || {})) {
            if (id === ADVERSE_ID) dom.getElement(id).checked = !!value;
            else dom.getElement(id).value = value;
        }
        exporterCalls.length = 0;
        downloads.length = 0;
        sink.logs.length = 0;
    };

    const fireExportClick = () => {
        for (const fn of clickHandlers) fn();
    };

    const exportedIdsFromDownloads = async () => {
        const clicked = downloads.filter((d) => d.anchorClicked && d.blob);
        if (clicked.length === 0) return null;
        const text = await clicked[clicked.length - 1].blob.text();
        return parseExportedIds(text);
    };

    const consoleErrors = () => sink.logs.filter((l) => l.level === 'error').map((l) => l.message);

    if (clickHandlers.length === 0) {
        record('sandbox precondition: real #exportCohortBtn click handler is registered', false, 'no click handler captured');
        return;
    }

    const checkExportCase = async (name, filterOverrides, expectedFormal, opts) => {
        setFilters(filterOverrides);
        await H.updateDashboard();
        const formal = [...H.formalIds()].sort();
        const formalOk = multisetEqual(formal, expectedFormal);
        const totalOutcome = await sandbox.ReumaPopulationReadPort.getPort().readPopulation({});
        const total = totalOutcome.status === 'ok' ? totalOutcome.payload.filteredCohort.map((p) => p.ID_Paciente || p._id).sort() : null;
        fireExportClick();
        const exported = await exportedIdsFromDownloads();
        const argIds = exporterCalls.length > 0 && Array.isArray(exporterCalls[0][0])
            ? exporterCalls[0][0].map((p) => p.ID_Paciente || p._id).sort()
            : null;
        if (opts && opts.expectEmpty) {
            const reachedWithEmpty = exporterCalls.length === 1 && argIds !== null && argIds.length === 0;
            const noDownload = downloads.filter((d) => d.anchorClicked).length === 0;
            const noFallback = exported === null;
            const pass = formalOk && formal.length === 0 && reachedWithEmpty && noDownload && noFallback;
            record(name, pass,
                `formal=${JSON.stringify(formal)} expected=${JSON.stringify(expectedFormal)} ` +
                `exporterCalls=${exporterCalls.length} argIds=${JSON.stringify(argIds)} ` +
                `downloads=${downloads.filter((d) => d.anchorClicked).length} consoleErrors=${JSON.stringify(consoleErrors())}`);
            return;
        }
        const pass = formalOk && exported !== null && multisetEqual(formal, exported) &&
            argIds !== null && multisetEqual(formal, argIds) &&
            multisetEqual(formal, expectedFormal);
        const extra = opts && opts.totalGreater ? ` total=${JSON.stringify(total)} totalGtFiltered=${total !== null && total.length > formal.length}` : '';
        const totalCheck = !opts || !opts.totalGreater || (total !== null && total.length > formal.length);
        record(name, pass && totalCheck,
            `formal=${JSON.stringify(formal)} exported=${JSON.stringify(exported)} argIds=${JSON.stringify(argIds)}` +
            ` expected=${JSON.stringify(expectedFormal)} downloads=${downloads.filter((d) => d.anchorClicked).length}` +
            ` consoleErrors=${JSON.stringify(consoleErrors())}${extra}`);
    };

    // =====================================================================
    // C1 — no filter: complete supported 6-patient cohort, all 6 identities.
    // =====================================================================
    await checkExportCase('C1 no filter exports the complete 6-patient cohort with all 6 identities', {}, ALL_SIX);

    // =====================================================================
    // C2 — single filter pathology=ESPA: total (6) > filtered (2).
    // =====================================================================
    await checkExportCase('C2 pathology=ESPA exports exactly the 2-patient filtered cohort (total 6 > filtered 2)',
        { filterPathology: 'ESPA' }, ESPA_TWO, { totalGreater: true });

    // =====================================================================
    // C3 — combination ttoType=FAMEs + ttoSpecific=FAME sintetico: 3 identities.
    // =====================================================================
    await checkExportCase('C3 ttoType=FAMEs + ttoSpecific=FAME sintetico exports exactly the 3-patient filtered cohort',
        { filterTtoType: 'FAMEs', filterTtoSpecific: 'FAME sintetico' }, FAME_THREE);

    // =====================================================================
    // C4 — zero result: formal cohort EMPTY, upstream total stays 6; the
    // exporter must be reached with [] and must produce no download/no rows.
    // =====================================================================
    await checkExportCase('C4 zero-result filter exports nothing and never falls back to total',
        { filterPathology: 'ESPA', filterTtoSpecific: 'FAME sintetico B' }, [], { expectEmpty: true });

    // =====================================================================
    // C5 — adversarial Buscar en tabla: formal 6, display narrowed to 1 row;
    // export must still follow the formal cohort.
    // =====================================================================
    {
        setFilters({});
        await H.updateDashboard();
        const formalBefore = [...H.formalIds()].sort();
        H.filterTableBySearch('SYN-AR');
        const display = [...H.displayIds()].sort();
        const displayNarrowed = display.length === 1 && display[0] === 'SYN-AR-001';
        const formalUnchanged = multisetEqual([...H.formalIds()].sort(), ALL_SIX);
        fireExportClick();
        const exported = await exportedIdsFromDownloads();
        const pass = multisetEqual(formalBefore, ALL_SIX) && displayNarrowed && formalUnchanged &&
            exported !== null && multisetEqual(exported, ALL_SIX);
        record('C5 adversarial table search narrows display to 1 row while export still follows the formal 6-patient cohort',
            pass,
            `formal=${JSON.stringify(formalBefore)} display=${JSON.stringify(display)} exported=${JSON.stringify(exported)} ` +
            `consoleErrors=${JSON.stringify(consoleErrors())}`);
    }
}

try {
    await run();
} catch (error) {
    record('unexpected checker error', false, (error && error.stack) || String(error));
}

const failed = results.filter((result) => !result.pass);
if (failed.length > 0) {
    console.log('FAILED CASES:');
    for (const item of failed) console.log(`  - ${item.name}`);
}
console.log(`\nREUMA-ESTADISTICAS-CSV-FILTERED-COHORT: ${failed.length === 0 ? 'PASS' : 'FAIL'} ${results.length - failed.length}/${results.length} cases`);
process.exit(failed.length === 0 ? 0 : 1);
