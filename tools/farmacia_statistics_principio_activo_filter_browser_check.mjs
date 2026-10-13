#!/usr/bin/env node
// tools/farmacia_statistics_principio_activo_filter_browser_check.mjs
// TRAIN 28 (SIL-REV-018-A first cut) — focal browser oracle for the seventh
// quick filter "Principio activo registrado" (#qf-principio).
// Synthetic data only. Supported interactions only (selectOption/click on the
// real controls, Inicio upload + statistics popup flow, download parsing).
// No DOM forcing, no readonly tampering, no traps.
// Ejecutar: npx --yes --package=playwright node tools/farmacia_statistics_principio_activo_filter_browser_check.mjs

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
const EXPECTED_DEMO_MOLECULES = ['Abatacept', 'Adalimumab', 'Belimumab', 'Rituximab', 'Secukinumab'].sort();
const RA_MOLECULE_ALFA = 'Molécula Alfa Sintética';
const RA_MOLECULE_BETA = 'Molécula Beta Sintética';

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
            return createRequire(path.join(nodeModules, '__fh_principio_loader.cjs'))('playwright');
        }
    }
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_statistics_principio_activo_filter_browser_check.mjs');
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

// Purpose-built synthetic workbook: two distinct brands, two distinct
// registered ingredients, one patient with NO registered ingredient.
function workbookBuffer() {
    const patients = [
        { suffix: 'RA-01', cip: 'CIP-RA-01', brand: 'Marca Alfa Uno Sintética', ingredient: RA_MOLECULE_ALFA },
        { suffix: 'RA-02', cip: 'CIP-RA-02', brand: 'Marca Beta Uno Sintética', ingredient: RA_MOLECULE_BETA },
        { suffix: 'RA-03', cip: 'CIP-RA-03', brand: 'Marca Alfa Dos Sintética', ingredient: RA_MOLECULE_ALFA },
        { suffix: 'RA-04', cip: 'CIP-RA-04', brand: 'Marca Huérfana Sintética', ingredient: '' }
    ];
    const rows = [];
    for (const patient of patients) {
        const followup = fixture('followup_event_v2.json');
        followup.event = {
            ...followup.event,
            event_id: `event-${patient.suffix}`,
            source_event_id: `source-${patient.suffix}`,
            patient_id: `patient-${patient.suffix}`,
            identifier_system: 'urn:cip:synthetic',
            identifier_value: patient.cip,
            service_code: 'DERM',
            service_label: 'Dermatología',
            pathology_code: 'HS',
            pathology_label: 'Hidradenitis supurativa',
            occurred_at: '2026-07-10T10:00:00Z',
            recorded_at: '2026-07-10T10:30:00Z',
            visit_id: `visit-${patient.suffix}`,
            visit_date: '2026-07-10',
            proms_json: { measurements: [{ instrument: 'PROM-RA', value: 1, answered: true }] }
        };
        followup.rowPayloads = followup.rowPayloads.slice(0, 1).map(payload => ({
            ...payload,
            rowKey: `line-${patient.suffix}-a`,
            treatment_id: `treatment-${patient.suffix}-a`,
            line_id: `line-${patient.suffix}-a`,
            line_role: 'primary',
            is_primary_line: true,
            line_status_at_event: 'active',
            active_at_event: true,
            line_drug_name: patient.brand,
            line_active_ingredient: patient.ingredient,
            line_presentation: 'Presentación explícita',
            line_dose_text: '10 mg',
            line_route: 'SC',
            line_schedule_code: 'Q14D',
            line_schedule_label: 'Cada 14 días',
            therapeutic_movement_type: 'not_recorded',
            adherence_collection_status: 'not_recorded'
        }));
        rows.push(...core.projectEventRows(followup.event, followup.rowPayloads));
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

function resourceNoise(text) { return text.indexOf('Failed to load resource') !== -1; }

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

async function principioOptions(page) {
    return page.locator('#qf-principio option').evaluateAll(options => options.map(option => option.value));
}

async function filteredCount(page) {
    return page.evaluate(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count);
}

async function assertReachable(page, label) {
    const control = page.locator('#qf-principio');
    await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox();
    assert(box && box.width > 0 && box.height > 0, `${label}: #qf-principio has a non-degenerate bounding box`);
    const viewport = page.viewportSize();
    assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1, `${label}: control inside viewport horizontally`);
    assert(box.y >= 0 && box.y + box.height <= viewport.height + 1, `${label}: control inside viewport vertically`);
    const hit = await page.evaluate(() => {
        const node = document.getElementById('qf-principio');
        if (!node) return 'missing';
        const rect = node.getBoundingClientRect();
        const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        if (!target) return 'no-hit';
        if (target === node || node.contains(target)) return 'ok';
        return `covered-by:${target.tagName}.${target.className}`;
    });
    assert.equal(hit, 'ok', `${label}: control hit-testable (${hit})`);
    // The seventh selector must not clip/overlap inside its own row: no two
    // quick-filter groups overlap, and the row contains its groups
    // (row.scrollWidth <= row.clientWidth) instead of pushing them out.
    const rowCheck = await page.evaluate(() => {
        const row = document.querySelector('.stats-quick-filters-row');
        const groups = Array.from(row.querySelectorAll('.stats-quick-filter-group')).map(g => g.getBoundingClientRect());
        let overlap = '';
        for (let i = 0; i < groups.length; i += 1) {
            for (let j = i + 1; j < groups.length; j += 1) {
                const a = groups[i], b = groups[j];
                const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
                const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
                if (x > 1 && y > 1) overlap += `overlap:${i}/${j} `;
            }
        }
        return { overlap, scrollW: row.scrollWidth, clientW: row.clientWidth, count: groups.length };
    });
    assert.equal(rowCheck.count, 9, `${label}: nine groups in the row`);
    assert.equal(rowCheck.overlap, '', `${label}: no quick-filter group overlaps another (${rowCheck.overlap})`);
    assert(rowCheck.scrollW <= rowCheck.clientW + 1, `${label}: row contains its groups (scroll=${rowCheck.scrollW} client=${rowCheck.clientW})`);
    const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(`INFO ${label}: document-level horizontal overflow=${docOverflow} (pre-existing shell/table surface, out of scope; see findings)`);
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
        assert.equal(await demo.locator('.stats-quick-filter-group').count(), 9, 'nine quick-filter groups');
        assert.equal(await demo.locator('#qf-principio').getAttribute('data-quick-filter'), 'principio');
        assert.equal((await demo.locator('label[for="qf-principio"]').textContent()).trim(), 'Principio activo registrado');
        const order = await demo.locator('.stats-quick-filter-select').evaluateAll(nodes => nodes.map(node => node.id));
        assert.deepEqual(order, ['qf-servicio', 'qf-patologia', 'qf-farmaco', 'qf-estado', 'qf-ea', 'qf-adherencia', 'qf-principio', 'qf-gravedad', 'qf-movimiento'], 'controls appended in approved order');
        ok('demo: nine controls present, labelled, appended in approved order');
    } catch (error) { bad('demo: nine controls present, labelled, appended in approved order', error.message); }

    try {
        const options = await principioOptions(demo);
        assert.equal(options[0], '', 'Todos base option');
        assert.deepEqual(options.slice(1), EXPECTED_DEMO_MOLECULES, 'exactly the explicit molecules, sorted');
        assert(!options.slice(1).some(value => ['Humira', 'Cosentyx', 'Amgevita', 'Orencia', 'Benlysta', 'Rixathon'].includes(value)), 'no isolated brands');
        assert(!options.slice(1).includes('No registrado'), 'no fabricated No registrado option');
        assert(!options.slice(1).includes('not_recorded'), 'no not_recorded option');
        ok('demo: principio options = explicit molecules only');
    } catch (error) { bad('demo: principio options = explicit molecules only', error.message); }

    try {
        await demo.locator('#qf-principio').selectOption('Adalimumab');
        await demo.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 2);
        assert.equal(await filteredCount(demo), 2, 'formal cohort filtered to 2');
        assert.match(await demo.locator('#filter-result-count').textContent(), /2 de 3 pacientes/);
        assert.match(await demo.locator('#kpi-grid').innerText(), /Pacientes incluidos[\s\S]*2/, 'KPI reflects filtered cohort');
        assert.equal(await demo.locator('#patients-table tbody tr').count(), 2, 'table rows filtered');
        assert.match(await demo.locator('#cohort-pills').textContent(), /Principio activo registrado: Adalimumab/);
        const bodyText = await demo.locator('body').innerText();
        assert.match(bodyText, /CIP-DEMO-FH-001/);
        assert.doesNotMatch(bodyText, /CIP-DEMO-FH-004/);
        await demo.locator('#qf-principio').selectOption('');
        await demo.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 3);
        assert.match(await demo.locator('#filter-result-count').textContent(), /Mostrando todos los pacientes \(3\)/);
        ok('demo: molecule selection filters cohort/counter/KPI/table/chip; Todos restores');
    } catch (error) { bad('demo: molecule selection filters cohort/counter/KPI/table/chip; Todos restores', error.message); }

    // ─── Raw route (supported Inicio upload → statistics popup) ───
    const rawBuffer = workbookBuffer();
    const parent = await context.newPage();
    await parent.goto(BASE + 'farmacia_index.html', { waitUntil: 'domcontentloaded' });
    await parent.waitForFunction(() => window.FarmaciaDataImports && window.FarmaciaStatisticsHandoff);
    await parent.locator('#inputExcelFarmacia').setInputFiles({
        name: 'principio-raw-sintetico.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from(rawBuffer)
    });
    await parent.waitForFunction(count => window.FarmaciaDataImports?.getState('farmacia')?.patientCount === count
        && window.FarmaciaDataImports?.getState('farmacia')?.dataPort, RAW_COUNT);
    const child = await openStatistics(parent);

    try {
        const options = await principioOptions(child);
        assert.deepEqual(options.slice(1), [RA_MOLECULE_ALFA, RA_MOLECULE_BETA].sort(), 'raw: only the two explicit molecules');
        assert(!options.slice(1).some(value => value.includes('Marca')), 'raw: no isolated brands');
        assert(!options.slice(1).includes('No registrado'), 'raw: no fabricated No registrado option');
        ok('raw: principio options = two explicit molecules, no brands, no No registrado');
    } catch (error) { bad('raw: principio options = two explicit molecules, no brands, no No registrado', error.message); }

    try {
        await child.locator('#qf-principio').selectOption(RA_MOLECULE_ALFA);
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 2);
        assert.match(await child.locator('#filter-result-count').textContent(), /2 de 4 pacientes/);
        assert.match(await child.locator('#kpi-grid').innerText(), /Pacientes incluidos[\s\S]*2/);
        const tableText = await child.locator('#patients-table tbody').innerText();
        assert.match(tableText, /CIP-RA-01/);
        assert.match(tableText, /CIP-RA-03/);
        assert.doesNotMatch(tableText, /CIP-RA-04/, 'no-ingredient patient excluded');
        assert.match(await child.locator('#cohort-pills').textContent(), new RegExp(`Principio activo registrado: ${RA_MOLECULE_ALFA}`));
        ok('raw: molecule selection filters cohort/counter/KPI/table/chip; no-ingredient patient excluded');
    } catch (error) { bad('raw: molecule selection filters cohort/counter/KPI/table/chip; no-ingredient patient excluded', error.message); }

    try {
        // CSV CONTENT of the filtered population (not just a click event).
        const downloadPromise = child.waitForEvent('download');
        await child.locator('#exportReportBtn').click();
        const download = await downloadPromise;
        const stream = await download.createReadStream();
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const csv = Buffer.concat(chunks).toString('utf8');
        const parsed = parseCsv(csv);
        const Cohort = globalThis.FarmaciaStatisticsCohort;
        const expectedHeader = Cohort ? Array.from(Cohort.CSV_COLUMNS) : null;
        if (expectedHeader) assert.deepEqual(parsed[0], expectedHeader, 'header still the 37 CSV_COLUMNS');
        assert.equal(parsed[0].length, 37, 'header has 37 columns');
        assert.equal(parsed.length, 3, 'header + exactly the 2 filtered patients');
        const idIndex = parsed[0].indexOf('primary_identifier_value');
        const ids = parsed.slice(1).map(row => row[idIndex]).sort();
        assert.deepEqual(ids, ['CIP-RA-01', 'CIP-RA-03'], 'CSV membership equals filtered population');
        assert(!ids.includes('CIP-RA-04'), 'no-ingredient patient absent from CSV');
        ok('raw: CSV content equals filtered population (37 cols, membership exact)');
    } catch (error) { bad('raw: CSV content equals filtered population (37 cols, membership exact)', error.message); }

    try {
        // AND semantics: principio + farmaco intersect.
        await child.locator('#qf-farmaco').selectOption('Marca Alfa Uno Sintética');
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 1);
        assert.match(await child.locator('#patients-table tbody').innerText(), /CIP-RA-01/);
        assert.doesNotMatch(await child.locator('#patients-table tbody').innerText(), /CIP-RA-03/);
        assert.equal(await child.locator('#qf-principio').inputValue(), RA_MOLECULE_ALFA, 'principio selection preserved');
        assert.equal(await child.locator('#qf-farmaco').inputValue(), 'Marca Alfa Uno Sintética', 'farmaco selection preserved');
        // Both selectors active with equal values without overwriting.
        await child.locator('#qf-farmaco').selectOption(RA_MOLECULE_ALFA);
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 2);
        assert.equal(await child.locator('#qf-principio').inputValue(), RA_MOLECULE_ALFA);
        assert.equal(await child.locator('#qf-farmaco').inputValue(), RA_MOLECULE_ALFA);
        // qf-farmaco ALONE still matches brand OR ingredient.
        await child.locator('#qf-principio').selectOption('');
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 2);
        await child.locator('#qf-farmaco').selectOption('Marca Beta Uno Sintética');
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 1);
        assert.match(await child.locator('#patients-table tbody').innerText(), /CIP-RA-02/, 'farmaco alone matches brand');
        await child.locator('#qf-farmaco').selectOption(RA_MOLECULE_BETA);
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 1);
        assert.match(await child.locator('#patients-table tbody').innerText(), /CIP-RA-02/, 'farmaco alone matches ingredient');
        // Chips independently removable.
        await child.locator('#qf-principio').selectOption(RA_MOLECULE_BETA);
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 1);
        await child.locator('button[aria-label="Quitar filtro Principio activo registrado"]').click();
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 1
            && document.getElementById('qf-principio').value === '');
        assert.equal(await child.locator('#qf-farmaco').inputValue(), RA_MOLECULE_BETA, 'farmaco chip survives principio removal');
        // Limpiar filtros restores everything.
        await child.locator('#clear-quick-filters').click();
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 4);
        assert.equal(await child.locator('#qf-principio').inputValue(), '');
        assert.equal(await child.locator('#qf-farmaco').inputValue(), '');
        assert.match(await child.locator('#cohort-pills').textContent(), /Sin filtros activos/);
        ok('raw: AND intersect, equal values coexist, farmaco brand-OR-ingredient preserved, chips removable, Limpiar restores');
    } catch (error) { bad('raw: AND intersect, equal values coexist, farmaco brand-OR-ingredient preserved, chips removable, Limpiar restores', error.message); }

    try {
        // Zero matches: informative empty state, export disabled, source cohort untouched.
        await child.locator('#qf-principio').selectOption(RA_MOLECULE_ALFA);
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 2);
        await child.locator('#qf-farmaco').selectOption('Marca Beta Uno Sintética');
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 0);
        assert.equal(await child.locator('#no-results-message.hidden').count(), 0, 'empty state visible');
        assert.match(await child.locator('#no-results-message').innerText(), /No hay pacientes que coincidan/);
        assert.equal(await child.locator('#exportReportBtn').isDisabled(), true, 'export disabled on zero matches');
        // A disabled button cannot start a download: proven by attempting the
        // programmatic click (a no-op on disabled controls per HTML) while a
        // download listener is armed, then asserting nothing arrives.
        let downloadArrived = false;
        child.once('download', () => { downloadArrived = true; });
        await child.evaluate(() => document.getElementById('exportReportBtn').click());
        await child.waitForTimeout(1500);
        assert.equal(downloadArrived, false, 'no download on zero matches');
        const state = await child.evaluate(() => window.FarmaciaStatisticsDashboard.getState());
        assert.equal(state.patient_count, RAW_COUNT, 'source cohort count unchanged');
        assert.equal(state.filtered_patient_count, 0);
        // Supported empty-state restore path (the section-level Limpiar button
        // is hidden together with the cohort section on zero matches).
        await child.locator('#empty-clear-filters').click();
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 4);
        ok('raw: zero matches → empty state, export disabled, no download, source cohort unchanged');
    } catch (error) { bad('raw: zero matches → empty state, export disabled, no download, source cohort unchanged', error.message); }

    try {
        // Responsive reachability of the seventh control.
        for (const width of [820, 1080]) {
            await child.setViewportSize({ width, height: 900 });
            await child.waitForTimeout(300);
            await assertReachable(child, `${width}px`);
            await child.locator('#qf-principio').selectOption(RA_MOLECULE_BETA);
            await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 1);
            await child.locator('#clear-quick-filters').click();
            await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 4);
        }
        ok('responsive: seventh control reachable/selectable at 820 and 1080, row contains groups without overlap');
    } catch (error) { bad('responsive: seventh control reachable/selectable at 820 and 1080, no overflow', error.message); }

    try {
        // Supported source change: raw popup → reload back to demo, no stale selection.
        await child.locator('#qf-principio').selectOption(RA_MOLECULE_ALFA);
        await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 2);
        await child.reload({ waitUntil: 'domcontentloaded' });
        await waitForMode(child, 'demo', DEMO_COUNT);
        assert.equal(await child.locator('#qf-principio').inputValue(), '', 'no stale principio selection after reload to demo');
        assert.deepEqual((await principioOptions(child)).slice(1), EXPECTED_DEMO_MOLECULES, 'demo options restored');
        assert.equal(await filteredCount(child), DEMO_COUNT);
        ok('source change raw→demo: no stale selection survives');
    } catch (error) { bad('source change raw→demo: no stale selection survives', error.message); }

    const filteredNoise = consoleErrors.filter(t => !resourceNoise(t));
    try {
        assert.deepEqual(filteredNoise, [], `console.error: ${filteredNoise.join(' | ')}`);
        assert.deepEqual(pageErrors, [], `pageerror: ${pageErrors.join(' | ')}`);
        ok('console.error=0 pageerror=0');
    } catch (error) { bad('console.error=0 pageerror=0', error.message); }

    console.log(`\nFARMACIA-PRINCIPIO-ACTIVO-FILTER-BROWSER: ${passed} passed, ${failures.length} failed`);
    if (failures.length) process.exitCode = 1;
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
