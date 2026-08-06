#!/usr/bin/env node
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
const PATIENT_COUNT = 55;

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_statistics_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_statistics_cutover_browser_check.mjs');
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

function workbookBuffer() {
  const rows = [];
  for (let number = 1; number <= PATIENT_COUNT; number += 1) {
    const suffix = String(number).padStart(3, '0');
    const patientId = `patient-stat-${suffix}`;
    const cip = `CIP-STAT-${suffix}`;
    const followup = fixture('followup_event_v2.json');
    followup.event = {
      ...followup.event,
      event_id: `event-stat-${suffix}`,
      source_event_id: `source-stat-${suffix}`,
      patient_id: patientId,
      identifier_system: 'urn:cip:synthetic',
      identifier_value: cip,
      service_code: number % 2 ? 'DERM' : 'REU',
      service_label: number % 2 ? 'Dermatología' : 'Reumatología',
      pathology_code: number % 2 ? 'HS' : 'AR',
      pathology_label: number % 2 ? 'Hidradenitis supurativa' : 'Artritis reumatoide',
      occurred_at: `2026-07-${String((number % 27) + 1).padStart(2, '0')}T10:00:00Z`,
      recorded_at: `2026-07-${String((number % 27) + 1).padStart(2, '0')}T10:30:00Z`,
      visit_id: `visit-stat-${suffix}`,
      visit_date: `2026-07-${String((number % 27) + 1).padStart(2, '0')}`,
      proms_json: { measurements: [{ instrument: number === 1 ? 'PROM-CERO' : 'PROM-EXPLÍCITO', value: number === 1 ? 0 : number, answered: number !== 1 }] },
      adverse_event_id: number === 1 ? 'ea-stat-001' : null,
      adverse_event_status: number === 1 ? 'present' : (number === 2 ? 'absent' : 'not_recorded'),
      adverse_event_description: number === 1 ? 'EA sintético explícito' : null,
      adverse_event_severity: number === 1 ? 'moderado' : null,
      adverse_event_resolution_status: number === 1 ? 'open' : null,
      adverse_event_action: number === 1 ? 'observación sintética' : null,
      adverse_event_suspects_json: number === 1 ? [{ suspect_ref: 'line-stat-001-a' }] : null,
      causality_assessments_json: number === 1 ? [{ adverse_event_id: 'ea-stat-001', suspect_ref: 'line-stat-001-a', method: 'explicit', score: 0, assessed: false }] : null
    };

    const sourcePayloads = number === 1 ? followup.rowPayloads.slice(0, 2) : followup.rowPayloads.slice(0, 1);
    followup.rowPayloads = sourcePayloads.map((payload, index) => {
      const lineSuffix = String.fromCharCode(97 + index);
      const isUnknown = number === 2;
      const drugName = number === 3 ? '=2+2' : (number === 1 ? `Activo múltiple ${lineSuffix.toUpperCase()}` : `Fármaco sintético ${suffix}`);
      return {
        ...payload,
        rowKey: `line-stat-${suffix}-${lineSuffix}`,
        treatment_id: `treatment-stat-${suffix}-${lineSuffix}`,
        line_id: `line-stat-${suffix}-${lineSuffix}`,
        line_role: index === 0 ? 'primary' : 'additional',
        is_primary_line: index === 0,
        line_status_at_event: isUnknown ? 'unknown' : 'active',
        active_at_event: isUnknown ? null : true,
        line_drug_name: drugName,
        line_active_ingredient: number === 1 ? `Principio múltiple ${lineSuffix.toUpperCase()}` : `Principio sintético ${suffix}`,
        line_presentation: 'Presentación explícita',
        line_dose_text: number === 1 ? '0 mg' : '10 mg',
        line_route: 'SC',
        line_schedule_code: 'Q14D',
        line_schedule_label: 'Cada 14 días',
        therapeutic_movement_type: number === 1 && index === 0 ? 'schedule_change' : 'not_recorded',
        new_schedule_code: number === 1 && index === 0 ? 'Q21D' : null,
        new_schedule_label: number === 1 && index === 0 ? 'Cada 21 días' : null,
        movement_effective_date: number === 1 && index === 0 ? '2026-07-10' : null,
        adherence_collection_status: number <= 2 ? 'yes' : 'not_recorded',
        adherence_instrument: number === 1 ? `Instrumento ${lineSuffix.toUpperCase()}` : (number === 2 ? 'Instrumento único' : null),
        adherence_result: number === 1 ? `resultado-${lineSuffix}` : (number === 2 ? 'resultado-único' : null),
        adherence_answers_json: number === 1 ? [{ answer: index === 0 ? 0 : false }] : null
      };
    });
    rows.push(...core.projectEventRows(followup.event, followup.rowPayloads));
  }

  const validation = fixture('validation_event_v2.json');
  validation.event = {
    ...validation.event,
    event_id: 'event-stat-001-validation',
    source_event_id: 'source-stat-001-validation',
    patient_id: 'patient-stat-001',
    identifier_system: 'urn:cip:synthetic',
    identifier_value: 'CIP-STAT-001',
    service_code: 'DERM',
    service_label: 'Dermatología',
    pathology_code: 'HS',
    pathology_label: 'Hidradenitis supurativa',
    occurred_at: '2026-08-01T10:00:00Z',
    recorded_at: '2026-08-01T10:30:00Z',
    request_date: '2026-08-01',
    validation_result: 'pending',
    validation_pending_reason: 'Pendiente sintético explícito'
  };
  rows.push(...core.projectEventRows(validation.event, validation.rowPayloads));

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
  let child;
  try {
    [child] = await Promise.all([
      parent.waitForEvent('popup', { timeout: 10000 }),
      parent.locator('a[href^="farmacia_estadisticas.html"]').first().click({ noWaitAfter: true })
    ]);
  } catch (error) {
    const diagnostics = await parent.evaluate(() => ({
      url: location.href,
      detail: document.querySelector('#detalleCargaFarmacia')?.textContent || '',
      status: document.querySelector('#estadoCargaFarmacia')?.textContent || '',
      raw: window.FarmaciaDataImports?.getState('farmacia')?.format || '',
      hasPort: !!window.FarmaciaDataImports?.getState('farmacia')?.dataPort
    }));
    throw new Error(`Statistics popup not opened: ${JSON.stringify(diagnostics)}; ${error.message}`);
  }
  await child.waitForURL(/farmacia_estadisticas\.html/);
  await waitForMode(child, 'raw', PATIENT_COUNT);
  return child;
}

try {
  const rawBuffer = workbookBuffer();
  const direct = await context.newPage();
  await direct.goto(new URL('farmacia_estadisticas.html', BASE).href, { waitUntil: 'domcontentloaded' });
  await waitForMode(direct, 'demo', 3);
  assert.equal((await direct.locator('#dbStatusLabel').textContent()).trim(), 'Demo sintética');
  assert.equal(await direct.locator('#patients-table tbody tr').count(), 3);
  assert.doesNotMatch(await direct.locator('body').innerText(), /CIP-DEMO-FH-011|CIP-DEMO-FH-038/);
  assert.equal(await direct.locator('input[type="file"]').count(), 1, 'only the unrelated compact catalog input exists; no statistics workbook loader');
  assert.equal(await direct.locator('#inputExcelFarmacia, #btnCargarExcelFarmacia').count(), 0, 'statistics has no Farmacia loader');

  const parent = await context.newPage();
  await parent.goto(new URL('farmacia_index.html', BASE).href, { waitUntil: 'domcontentloaded' });
  await parent.waitForFunction(() => window.FarmaciaDataImports && window.FarmaciaStatisticsHandoff);
  await parent.locator('#inputExcelFarmacia').setInputFiles({
    name: 'stats-raw-sintetico.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(rawBuffer)
  });
  await parent.waitForFunction(count => window.FarmaciaDataImports?.getState('farmacia')?.patientCount === count
    && window.FarmaciaDataImports?.getState('farmacia')?.dataPort, PATIENT_COUNT);
  assert.match(await parent.locator('#estadoCargaFarmacia').textContent(), /55 pacientes/);

  const child = await openStatistics(parent);
  assert.equal((await child.locator('#dbStatusLabel').textContent()).trim(), 'Cohorte raw recibida');
  assert.match(await child.locator('#dbStatusTime').textContent(), /stats-raw-sintetico\.xlsx.*55 pacientes.*56 eventos/);
  assert.equal(new URL(child.url()).searchParams.has('fh_stats_handoff'), false, 'technical marker removed after bootstrap');
  assert.equal(await child.locator('#patients-table tbody tr').count(), 50, 'table page is capped at 50');
  assert.match(await child.locator('#table-pagination').innerText(), /Página 1 de 2 \(55 pacientes\)/);
  const bodyText = await child.locator('body').innerText();
  assert.doesNotMatch(bodyText, /CIP-DEMO-FH-/i, 'raw cohort contains no demo patients');
  assert.match(bodyText, /Activo múltiple A/);
  assert.match(bodyText, /Activo múltiple B/, 'all explicitly active lines are displayed');
  const pendingValidationRow = child.locator('#patients-table tbody tr').filter({ hasText: 'CIP-STAT-001' });
  assert.match(await pendingValidationRow.innerText(), /Pendiente/, 'explicit validation remains visible despite historical followup');
  const unknownRow = child.locator('#patients-table tbody tr').filter({ hasText: 'CIP-STAT-002' });
  assert.match(await unknownRow.innerText(), /No registrado/, 'unknown line is not displayed as active or suspended');
  assert.equal(await child.locator('#kpi-grid .stats-kpi-card').count(), 6);
  assert.match(await child.locator('#kpi-grid').innerText(), /Tratamiento activo explícito/);
  assert.match(await child.locator('#kpi-grid').innerText(), /PROM registrado/);
  assert.equal(await child.locator('#charts-grid .stats-chart-block').count(), 4);
  assert.match(await child.locator('#chart-evolucion-content').innerText(), /Último PROM registrado/);
  assert.match(await child.locator('#chart-riesgos-content').innerText(), /present \/ absent \/ not_recorded/);
  assert.deepEqual(await child.locator('#qf-ea option').evaluateAll(options => options.slice(1).map(option => option.value).sort()), ['absent', 'not_recorded', 'present']);
  assert((await child.locator('#qf-adherencia option').evaluateAll(options => options.slice(1).map(option => option.value))).includes('multiple'));

  for (const id of ['qf-servicio', 'qf-patologia', 'qf-farmaco', 'qf-estado']) {
    await child.locator(`#${id}`).selectOption({ index: 1 });
    await child.waitForFunction(filterId => document.querySelector(`#${filterId}`)?.value !== '', id);
    const filteredCount = await child.evaluate(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count);
    assert(filteredCount > 0 && filteredCount <= 55, `${id} applies a valid source-derived filter`);
    if (await child.locator(`#${id} option`).count() > 2) assert(filteredCount < 55, `${id} reduces a multi-value dimension`);
    await child.locator('#clear-quick-filters').click();
    await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 55);
  }
  await child.locator('#qf-ea').selectOption('absent');
  await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 1);
  assert.match(await child.locator('#patients-table tbody').innerText(), /CIP-STAT-002/);
  await child.locator('#clear-quick-filters').click();
  await child.locator('#qf-adherencia').selectOption('multiple');
  await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 1);
  assert.match(await child.locator('#patients-table tbody').innerText(), /CIP-STAT-001/);
  await child.locator('#clear-quick-filters').click();
  await child.waitForFunction(() => window.FarmaciaStatisticsDashboard.getState().filtered_patient_count === 55);

  const downloadPromise = child.waitForEvent('download');
  await child.locator('#exportReportBtn').click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^farmacia_cohorte_filtrada_\d{4}-\d{2}-\d{2}\.csv$/);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString('utf8');
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  assert.equal(/[^\r]\n/.test(csv), false, 'download uses CRLF only');
  const parsed = parseCsv(csv);
  assert.equal(parsed.length, PATIENT_COUNT + 1, 'CSV exports all filtered patients, not only the visible page');
  assert.equal(parsed[0].length, 37);
  assert.deepEqual(parsed[0], Array.from(globalThis.FarmaciaStatisticsCohort?.CSV_COLUMNS || [
    'stats_schema_version', 'source_mode', 'source_file_name', 'patient_id', 'primary_identifier_value',
    'identifiers_json', 'services_json', 'pathologies_json', 'valid_event_count', 'excluded_event_count',
    'warning_count', 'source_error_count', 'latest_event_type', 'latest_event_date', 'request_date',
    'validation_result', 'first_visit_date', 'latest_followup_date', 'line_count', 'active_line_count',
    'drug_name_values', 'active_ingredient_values', 'presentation_values', 'dose_text_values', 'route_values',
    'schedule_code_values', 'schedule_label_values', 'treatment_lines_json', 'proms_json',
    'latest_adherence_collection_status', 'latest_adherence_instrument', 'latest_adherence_result',
    'adverse_event_overall_status', 'adverse_events_json', 'causality_assessments_json',
    'therapeutic_movements_json', 'provenance_json'
  ]));
  const headerIndex = Object.fromEntries(parsed[0].map((name, index) => [name, index]));
  const formulaRow = parsed.find(row => row[headerIndex.primary_identifier_value] === 'CIP-STAT-003');
  assert(formulaRow[headerIndex.drug_name_values].startsWith("'=2+2"), 'formula injection is neutralized');
  for (const row of parsed.slice(1, 5)) {
    JSON.parse(row[headerIndex.identifiers_json]);
    JSON.parse(row[headerIndex.treatment_lines_json]);
    JSON.parse(row[headerIndex.proms_json]);
    JSON.parse(row[headerIndex.adverse_events_json]);
    JSON.parse(row[headerIndex.provenance_json]);
  }

  await child.reload({ waitUntil: 'domcontentloaded' });
  await waitForMode(child, 'demo', 3);
  assert.equal((await child.locator('#dbStatusLabel').textContent()).trim(), 'Demo sintética', 'reload loses raw cohort');

  const second = await openStatistics(parent);
  const third = await openStatistics(parent);
  assert.notEqual(second, third);
  assert.equal((await second.evaluate(() => window.FarmaciaStatisticsDashboard.getState().patient_count)), 55);
  assert.equal((await third.evaluate(() => window.FarmaciaStatisticsDashboard.getState().patient_count)), 55);

  await parent.evaluate(() => { window.__statisticsOriginalOpen = window.open; window.open = () => null; });
  await parent.locator('a[href^="farmacia_estadisticas.html"]').first().click();
  await parent.waitForFunction(() => document.querySelector('#detalleCargaFarmacia')?.textContent.includes('bloqueó la ventana emergente'));
  await parent.evaluate(() => { window.open = window.__statisticsOriginalOpen; delete window.__statisticsOriginalOpen; });

  for (const page of [parent, child, second, third]) {
    const residue = await page.evaluate(async () => {
      const storageText = [...Object.keys(sessionStorage).map(key => `${key}:${sessionStorage.getItem(key)}`), ...Object.keys(localStorage).map(key => `${key}:${localStorage.getItem(key)}`)].join('\n');
      const databases = indexedDB.databases ? await indexedDB.databases() : [];
      return { storageText, databases: databases.map(database => database.name), url: location.href };
    });
    assert.doesNotMatch(residue.storageText, /CIP-STAT-|patient-stat-|stats-raw-sintetico|source-stat-|event-stat-/);
    assert.doesNotMatch(residue.url, /CIP-STAT-|patient-stat-|stats-raw-sintetico|source-stat-|event-stat-|fh_stats_handoff/);
    assert.deepEqual(residue.databases, []);
  }

  assert.deepEqual(consoleErrors, [], `console.error: ${consoleErrors.join(' | ')}`);
  assert.deepEqual(pageErrors, [], `pageerror: ${pageErrors.join(' | ')}`);
  console.log('farmacia_statistics_cutover_browser_check: PASS');
  console.log('QA Chromium: demo=3; raw=55; table=50; CSV=55x37; filters/KPIs/charts/isolation/reload/popup/storage PASS; console.error=0 pageerror=0');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
