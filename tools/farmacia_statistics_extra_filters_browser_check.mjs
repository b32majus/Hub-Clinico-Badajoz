#!/usr/bin/env node
// tools/farmacia_statistics_extra_filters_browser_check.mjs
// TRAIN 31 (WO #768 U1) — focal browser oracle for the eighth quick filter
// "Gravedad de EA registrada" (#qf-gravedad), contract #685 (closed).
// Synthetic data only. Supported interactions only (selectOption/click on the
// real controls, Inicio upload + statistics popup flow, download parsing).
// No DOM forcing, no readonly tampering, no traps.
// Ejecutar: npx --yes --package=playwright node tools/farmacia_statistics_extra_filters_browser_check.mjs

import assert from 'node:assert/strict';
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor/sheetjs/xlsx.full.min.js'));
require(path.join(ROOT, 'scripts/farmacia_export_v2_core.js'));
const core = globalThis.FarmaciaExportV2Core;

const RAW_COUNT = 4;
const DEMO_COUNT = 3;
const SEV_GRAVE = 'Grave';
const SEV_LEVE = 'Leve';
const EXPECTED_DEMO_SEVERITIES = ['leve', 'moderado'].sort();
const EXPECTED_RAW_SEVERITIES = [SEV_GRAVE, SEV_LEVE].sort();

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
            return createRequire(path.join(nodeModules, '__fh_gravedad_loader.cjs'))('playwright');
        }
    }
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_statistics_extra_filters_browser_check.mjs');
}

const { chromium } = loadPlaywrightFromNpx();

function chromiumExecutable() {
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    const bundled = chromium.executablePath();
    if (existsSync(bundled)) return bundled;
    const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
    if (!existsSync(cache)) return bundled;
    const candidates = readdirSync(cache)
        .filter(entry => entry.startsWith('chromium_headless_shell-'))
        .sort().reverse()
        .map(entry => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
    return candidates.find(existsSync) || bundled;
}

function fixture(name) {
    return JSON.parse(readFileSync(path.join(ROOT, 'data/demo/farmacia/export_v2', name), 'utf8'));
}

// Purpose-built synthetic workbook. Each followup EVENT carries exactly one
// adverse event (event-level fields in the v2 row contract):
//   CIP-GRAV-01: two present EA, distinct physical events, BOTH 'Grave'
//                → the patient must match the Grave filter ONCE.
//   CIP-GRAV-02: one present 'Grave' + one present 'Leve'
//                → different severities enable different selections.
//   CIP-GRAV-03: one ABSENT EA with severity 'Grave'
//                → must NOT match Grave (status absent).
//   CIP-GRAV-04: one present EA with EMPTY severity + one not_recorded EA
//                with severity 'Moderado'
//                → must NOT match Grave despite EA-presence; 'Moderado' must
//                not become an option.
// Expected gravedad options: exactly ['Grave', 'Leve'].
const PATIENTS = [
    {
        suffix: 'G-01', cip: 'CIP-GRAV-01', serviceCode: 'DERM', serviceLabel: 'Dermatología',
        events: [
            { key: 'a', status: 'present', severity: SEV_GRAVE },
            { key: 'b', status: 'present', severity: SEV_GRAVE }
        ]
    },
    {
        suffix: 'G-02', cip: 'CIP-GRAV-02', serviceCode: 'DERM', serviceLabel: 'Dermatología',
        events: [
            { key: 'a', status: 'present', severity: SEV_GRAVE },
            { key: 'b', status: 'present', severity: SEV_LEVE }
        ]
    },
    {
        suffix: 'G-03', cip: 'CIP-GRAV-03', serviceCode: 'CARD', serviceLabel: 'Cardiología',
        events: [
            { key: 'a', status: 'absent', severity: SEV_GRAVE }
        ]
    },
    {
        suffix: 'G-04', cip: 'CIP-GRAV-04', serviceCode: 'DERM', serviceLabel: 'Dermatología',
        events: [
            { key: 'a', status: 'present', severity: '' },
            { key: 'b', status: 'not_recorded', severity: 'Moderado' }
        ]
    }
];

function workbookBuffer() {
    const rows = [];
    for (const patient of PATIENTS) {
        patient.events.forEach((ae, eventIndex) => {
            const followup = fixture('followup_event_v2.json');
            followup.event = {
                ...followup.event,
                event_id: `event-${patient.suffix}-${ae.key}`,
                source_event_id: `source-${patient.suffix}-${ae.key}`,
                patient_id: `patient-${patient.suffix}`,
                identifier_system: 'urn:cip:synthetic',
                identifier_value: patient.cip,
                service_code: patient.serviceCode,
                service_label: patient.serviceLabel,
                pathology_code: 'HS',
                pathology_label: 'Hidradenitis supurativa',
                occurred_at: `2026-07-1${eventIndex}T10:00:00Z`,
                recorded_at: `2026-07-1${eventIndex}T10:30:00Z`,
                visit_id: `visit-${patient.suffix}-${ae.key}`,
                visit_date: `2026-07-1${eventIndex}`,
                adverse_event_id: `ae-${patient.suffix}-${ae.key}`,
                adverse_event_status: ae.status,
                adverse_event_severity: ae.severity,
                proms_json: { measurements: [{ instrument: 'PROM-GRAV', value: 1, answered: true }] }
            };
            followup.rowPayloads = followup.rowPayloads.slice(0, 1).map(payload => ({
                ...payload,
                rowKey: `line-${patient.suffix}-${ae.key}`,
                treatment_id: `treatment-${patient.suffix}-${ae.key}`,
                line_id: `line-${patient.suffix}-${ae.key}`,
                line_role: 'primary',
                is_primary_line: true,
                line_status_at_event: 'active',
                active_at_event: true,
                line_drug_name: `Fármaco sintético ${patient.suffix}-${ae.key}`,
                line_active_ingredient: `Molécula sintética ${patient.suffix}`,
                line_presentation: 'Presentación explícita',
                line_dose_text: '10 mg',
                line_route: 'SC',
                line_schedule_code: 'Q14D',
                line_schedule_label: 'Cada 14 días',
                therapeutic_movement_type: 'not_recorded',
                adherence_collection_status: 'not_recorded'
            }));
            rows.push(...core.projectEventRows(followup.event, followup.rowPayloads));
        });
    }
    const toCells = row => core.serializeRowToTsv(row).split('\t');
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([core.ROW_COLUMNS, ...rows.map(toCells)]), '01_DERMA');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([core.ROW_COLUMNS]), '03_DIGESTIVO');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function parseCsv(input) {
    const text = input.charCodeAt(0) === 0xFEFF ? input.slice(1) : input;
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (quoted) {
            if (character === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
            else if (character === '"') quoted = false;
            else cell += character;
        } else if (character === '"') quoted = true;
        else if (character === ',') { row.push(cell); cell = ''; }
        else if (character === '\r' && text[index + 1] === '\n') {
            row.push(cell); cell = ''; index += 1;
            if (row.length > 1 || row[0] !== '') rows.push(row);
            row = [];
        } else cell += character;
    }
    return rows;
}

const mime = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'],
    ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['.svg', 'image/svg+xml']
]);
const server = createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'farmacia_index.html';
    const file = path.resolve(ROOT, relative);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return response.writeHead(403).end();
    try {
        if (!statSync(file).isFile()) throw new Error('not_file');
        response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': 'no-store' });
        createReadStream(file).pipe(response);
    } catch {
        response.writeHead(404).end('Not found');
    }
});

await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
});
const BASE = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
const context = await browser.newContext({ acceptDownloads: true });
const consoleErrors = [];
const pageErrors = [];
const attachErrors = page => {
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`${page.url()}: ${message.text()}`); });
    page.on('pageerror', error => pageErrors.push(`${page.url()}: ${error.message}`));
};
context.on('page', attachErrors);

async function waitForMode(page, mode, count) {
    await page.waitForFunction(({ expectedMode, expectedCount }) => {
        const state = window.FarmaciaStatisticsDashboard?.getState();
        return state?.source_mode === expectedMode && state.patient_count === expectedCount;
    }, { expectedMode: mode, expectedCount: count });
}

async function openStatistics(parent) {
    const [child] = await Promise.all([
        parent.waitForEvent('popup', { timeout: 10000 }),
        parent.locator('a[href^="farmacia_estadisticas.html"]').first().click({ noWaitAfter: true })
    ]);
    await child.waitForURL(/farmacia_estadisticas\.html/);
    await waitForMode(child, 'raw', RAW_COUNT);
    return child;
}

async function gravedadOptions(page) {
    return page.locator('#qf-gravedad option').evaluateAll(options => options.map(option => option.value));
}

function resourceNoise(text) { return text.indexOf('Failed to load resource') !== -1; }

async function filteredCount(page) {
    return page.evaluate(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count);
}

async function tableIdentifiers(page) {
    return page.locator('#patients-table tbody tr td:first-child').evaluateAll(cells => cells.map(cell => cell.textContent.trim()));
}

async function exportedCsvIdentifiers(page) {
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#exportReportBtn').click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const parsed = parseCsv(Buffer.concat(chunks).toString('utf8'));
    const Cohort = globalThis.FarmaciaStatisticsCohort;
    if (Cohort) assert.deepEqual(parsed[0], Array.from(Cohort.CSV_COLUMNS), 'header still the 37 CSV_COLUMNS');
    assert.equal(parsed[0].length, 37, 'header has 37 columns');
    const idIndex = parsed[0].indexOf('primary_identifier_value');
    return parsed.slice(1).map(row => row[idIndex]).sort();
}

let passed = 0;
const failures = [];
function ok(name) { passed += 1; console.log(`PASS ${name}`); }
function bad(name, detail) { failures.push(name); console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }

try {
    // ─── Demo route (direct open, versioned demo cohort) ───
    const demo = await context.newPage();
    await demo.goto(BASE + 'farmacia_estadisticas.html', { waitUntil: 'domcontentloaded' });
    await waitForMode(demo, 'demo', DEMO_COUNT);

    try {
        assert.equal(await demo.locator('.stats-quick-filter-group').count(), 8, 'eight quick-filter groups');
        assert.equal(await demo.locator('#qf-gravedad').getAttribute('data-quick-filter'), 'gravedad');
        assert.equal((await demo.locator('label[for="qf-gravedad"]').textContent()).trim(), 'Gravedad de EA registrada');
        const order = await demo.locator('.stats-quick-filter-select').evaluateAll(nodes => nodes.map(node => node.id));
        assert.deepEqual(order, ['qf-servicio', 'qf-patologia', 'qf-farmaco', 'qf-estado', 'qf-ea', 'qf-adherencia', 'qf-principio', 'qf-gravedad'], 'control appended at the end');
        ok('demo: eighth control present, labelled, appended last');
    } catch (error) { bad('demo: eighth control present, labelled, appended last', error.message); }

    try {
        const options = await gravedadOptions(demo);
        assert.equal(options[0], '', 'Todas base option');
        assert.deepEqual(options.slice(1), EXPECTED_DEMO_SEVERITIES, 'exactly the explicit demo severities, sorted');
        assert(!options.slice(1).includes('No registrado'), 'no fabricated No registrado option');
        assert(!options.slice(1).includes('not_recorded'), 'no not_recorded option');
        assert(!options.slice(1).some(value => value.trim() === ''), 'no empty-severity option');
        ok('demo: gravedad options = explicit severities only (leve, moderado)');
    } catch (error) { bad('demo: gravedad options = explicit severities only (leve, moderado)', error.message); }

    try {
        await demo.locator('#qf-gravedad').selectOption('leve');
        await demo.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 1);
        assert.equal(await filteredCount(demo), 1, 'demo cohort filtered to 1');
        assert.match(await demo.locator('#filter-result-count').textContent(), /1 de 3 pacientes/);
        assert.match(await demo.locator('#kpi-grid').innerText(), /Pacientes incluidos[\s\S]*1/, 'KPI reflects filtered cohort');
        assert.equal(await demo.locator('#patients-table tbody tr').count(), 1, 'table rows filtered');
        assert.match(await demo.locator('#patients-table tbody').innerText(), /CIP-DEMO-FH-001/);
        assert.doesNotMatch(await demo.locator('#patients-table tbody').innerText(), /CIP-DEMO-FH-004/);
        assert.match(await demo.locator('#cohort-pills').textContent(), /Gravedad de EA registrada: leve/);
        await demo.locator('#qf-gravedad').selectOption('');
        await demo.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 3);
        assert.match(await demo.locator('#filter-result-count').textContent(), /Mostrando todos los pacientes \(3\)/);
        ok('demo: severity selection filters cohort/counter/KPI/table/chip; Todas restores');
    } catch (error) { bad('demo: severity selection filters cohort/counter/KPI/table/chip; Todas restores', error.message); }

    // ─── Raw route (supported Inicio upload → statistics popup) ───
    const rawBuffer = workbookBuffer();
    const parent = await context.newPage();
    await parent.goto(BASE + 'farmacia_index.html', { waitUntil: 'domcontentloaded' });
    await parent.waitForFunction(() => window.FarmaciaDataImports && window.FarmaciaStatisticsHandoff);
    await parent.locator('#inputExcelFarmacia').setInputFiles({
        name: 'gravedad-raw-sintetico.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from(rawBuffer)
    });
    await parent.waitForFunction(count => window.FarmaciaDataImports?.getState('farmacia')?.patientCount === count
        && window.FarmaciaDataImports?.getState('farmacia')?.dataPort, RAW_COUNT);
    const child = await openStatistics(parent);

    try {
        const options = await gravedadOptions(child);
        assert.deepEqual(options.slice(1), EXPECTED_RAW_SEVERITIES, 'raw: exactly the two explicit present severities');
        assert(!options.slice(1).includes('Moderado'), 'raw: not_recorded severity does not become an option');
        assert(!options.slice(1).some(value => value.trim() === ''), 'raw: empty severity does not become an option');
        assert(!options.slice(1).includes('No registrado'), 'raw: no fabricated No registrado option');
        ok('raw: gravedad options = explicit present severities only (Grave, Leve)');
    } catch (error) { bad('raw: gravedad options = explicit present severities only (Grave, Leve)', error.message); }

    try {
        await child.locator('#qf-gravedad').selectOption(SEV_GRAVE);
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 2);
        assert.equal(await filteredCount(child), 2, 'Grave cohort is 2 patients');
        assert.match(await child.locator('#filter-result-count').textContent(), /2 de 4 pacientes/);
        assert.match(await child.locator('#kpi-grid').innerText(), /Pacientes incluidos[\s\S]*2/);
        const ids = await tableIdentifiers(child);
        assert.deepEqual(ids.sort(), ['CIP-GRAV-01', 'CIP-GRAV-02'], 'CIP-GRAV-01 with two present Grave EA appears once; absent+Grave (03) and present+empty (04) excluded');
        assert.match(await child.locator('#cohort-pills').textContent(), new RegExp(`Gravedad de EA registrada: ${SEV_GRAVE}`));
        ok('raw: Grave selection counts a two-EA patient once; absent+Grave and present+empty never match');
    } catch (error) { bad('raw: Grave selection counts a two-EA patient once; absent+Grave and present+empty never match', error.message); }

    try {
        await child.locator('#qf-gravedad').selectOption(SEV_LEVE);
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 1);
        assert.deepEqual((await tableIdentifiers(child)).sort(), ['CIP-GRAV-02'], 'Leve selects only the patient with an explicit present Leve EA');
        ok('raw: different severity enables a different selection (Leve → only CIP-GRAV-02)');
    } catch (error) { bad('raw: different severity enables a different selection (Leve → only CIP-GRAV-02)', error.message); }

    try {
        // AND semantics with the existing EA-presence filter: CIP-GRAV-04 is
        // present but its severity is empty, so gravedad=Grave must exclude it.
        await child.locator('#qf-gravedad').selectOption('');
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 4);
        await child.locator('#qf-ea').selectOption('present');
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 3);
        assert.deepEqual((await tableIdentifiers(child)).sort(), ['CIP-GRAV-01', 'CIP-GRAV-02', 'CIP-GRAV-04'], 'EA presence alone includes the empty-severity patient');
        await child.locator('#qf-gravedad').selectOption(SEV_GRAVE);
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 2);
        assert.deepEqual((await tableIdentifiers(child)).sort(), ['CIP-GRAV-01', 'CIP-GRAV-02'], 'present+empty severity is excluded by gravedad=Grave despite EA-presence');
        assert.equal(await child.locator('#qf-ea').inputValue(), 'present', 'EA-presence selection preserved');
        ok('raw: EA-presence AND gravedad intersect; present+empty patient excluded only by gravedad');
    } catch (error) { bad('raw: EA-presence AND gravedad intersect; present+empty patient excluded only by gravedad', error.message); }

    try {
        // Servicio AND gravedad: one population shared by counter/KPI/table/charts/CSV.
        await child.locator('#qf-ea').selectOption('');
        await child.locator('#qf-servicio').selectOption('Dermatología');
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 2);
        assert.equal(await filteredCount(child), 2, 'Servicio AND gravedad cohort is 2');
        assert.match(await child.locator('#kpi-grid').innerText(), /Pacientes incluidos[\s\S]*2/);
        assert.deepEqual((await tableIdentifiers(child)).sort(), ['CIP-GRAV-01', 'CIP-GRAV-02']);
        const chartText = await child.locator('#chart-riesgos-content').innerText();
        assert.match(chartText, /Gravedad explícita/, 'gravedad chart block rendered');
        assert.match(chartText, /Grave\s*2/, 'chart counts patients per severity (Grave: 2 patients)');
        assert.match(chartText, /Leve\s*1/, 'chart counts patients per severity (Leve: 1 patient)');
        assert.doesNotMatch(chartText, /Grave\s*3/, 'chart never counts the same patient twice for one severity');
        const csvIds = await exportedCsvIdentifiers(child);
        assert.deepEqual(csvIds, ['CIP-GRAV-01', 'CIP-GRAV-02'], 'CSV membership equals the filtered population');
        ok('raw: Servicio AND gravedad produce the same population in counter/KPI/table/charts/CSV');
    } catch (error) { bad('raw: Servicio AND gravedad produce the same population in counter/KPI/table/charts/CSV', error.message); }

    try {
        // Chip removal is coherent: removing gravedad keeps the Servicio filter.
        await child.locator('button[aria-label="Quitar filtro Gravedad de EA registrada"]').click();
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 3
            && document.getElementById('qf-gravedad').value === '');
        assert.equal(await child.locator('#qf-servicio').inputValue(), 'Dermatología', 'Servicio selection survives gravedad chip removal');
        assert.deepEqual((await tableIdentifiers(child)).sort(), ['CIP-GRAV-01', 'CIP-GRAV-02', 'CIP-GRAV-04'], 'remaining population is the Servicio-only cohort');
        ok('raw: gravedad chip removal clears only gravedad and keeps other filters');
    } catch (error) { bad('raw: gravedad chip removal clears only gravedad and keeps other filters', error.message); }

    try {
        // Zero matches: informative empty state, export disabled, no download.
        // Cardiología (only CIP-GRAV-03, whose Grave EA is absent) combined
        // with an explicit present Leve severity has no possible match — and
        // would only match if absent severities leaked into the predicate.
        await child.locator('#qf-servicio').selectOption('Cardiología');
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 1);
        await child.locator('#qf-gravedad').selectOption(SEV_LEVE);
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 0);
        assert.equal(await child.locator('#no-results-message.hidden').count(), 0, 'empty state visible');
        assert.match(await child.locator('#no-results-message').innerText(), /No hay pacientes que coincidan/);
        assert.equal(await child.locator('#exportReportBtn').isDisabled(), true, 'export disabled on zero matches');
        let downloadArrived = false;
        child.once('download', () => { downloadArrived = true; });
        await child.evaluate(() => document.getElementById('exportReportBtn').click());
        await child.waitForTimeout(1500);
        assert.equal(downloadArrived, false, 'no download on zero matches');
        const state = await child.evaluate(() => window.FarmaciaStatisticsDashboard.getState());
        assert.equal(state.patient_count, RAW_COUNT, 'source cohort count unchanged');
        assert.equal(state.filtered_patient_count, 0);
        ok('raw: zero matches → empty state, export disabled, no download, source cohort unchanged');
    } catch (error) { bad('raw: zero matches → empty state, export disabled, no download, source cohort unchanged', error.message); }

    try {
        // Clear filters returns the initial state on every surface.
        await child.locator('#empty-clear-filters').click();
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 4);
        assert.equal(await child.locator('#qf-gravedad').inputValue(), '');
        assert.equal(await child.locator('#qf-servicio').inputValue(), '');
        assert.equal(await child.locator('#qf-ea').inputValue(), '');
        assert.match(await child.locator('#cohort-pills').textContent(), /Sin filtros activos/);
        assert.match(await child.locator('#filter-result-count').textContent(), /Mostrando todos los pacientes \(4\)/);
        const chartText = await child.locator('#chart-riesgos-content').innerText();
        assert.match(chartText, /Grave\s*2/, 'unfiltered chart: CIP-GRAV-01 counted once for Grave (2 patients with Grave)');
        assert.doesNotMatch(chartText, /Grave\s*3/, 'unfiltered chart: no event-level double count for Grave');
        ok('raw: Limpiar filtros returns to the initial state; severity chart counts patients once');
    } catch (error) { bad('raw: Limpiar filtros returns to the initial state; severity chart counts patients once', error.message); }

    const filteredNoise = consoleErrors.filter(t => !resourceNoise(t));
    try {
        assert.deepEqual(filteredNoise, [], `console.error: ${filteredNoise.join(' | ')}`);
        assert.deepEqual(pageErrors, [], `pageerror: ${pageErrors.join(' | ')}`);
        ok('console.error=0 pageerror=0');
    } catch (error) { bad('console.error=0 pageerror=0', error.message); }

    console.log(`\nFARMACIA-EXTRA-FILTERS-BROWSER: ${passed} passed, ${failures.length} failed`);
    if (failures.length) process.exitCode = 1;
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
