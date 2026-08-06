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
const CIP_A = 'CIP-QV-PROMS-A';
const CIP_B = 'CIP-QV-PROMS-B';

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_quickview_proms_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_quickview_raw_proms_browser_check.mjs');
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

function followup(patientId, cip, suffix, date, measurements) {
  const source = fixture('followup_event_v2.json');
  source.event = {
    ...source.event,
    event_id: `event-${suffix}`,
    source_event_id: `source-${suffix}`,
    patient_id: patientId,
    identifier_system: 'urn:cip:synthetic',
    identifier_value: cip,
    service_code: 'DERM',
    service_label: 'Dermatologia',
    pathology_code: 'HS',
    pathology_label: 'Patologia sintetica',
    occurred_at: `${date}T10:00:00Z`,
    recorded_at: `${date}T10:30:00Z`,
    visit_id: `visit-${suffix}`,
    visit_date: date,
    proms_json: { measurements },
    adverse_event_status: 'not_recorded',
    adverse_event_id: null,
    adverse_event_suspects_json: null,
    causality_assessments_json: null
  };
  source.rowPayloads = [{
    ...source.rowPayloads[0],
    rowKey: `line-${patientId}`,
    treatment_id: `treatment-${patientId}`,
    line_id: `line-${patientId}`,
    line_role: 'primary',
    is_primary_line: true,
    line_status_at_event: 'active',
    active_at_event: true,
    line_drug_name: `Tratamiento sintetico ${patientId}`,
    line_active_ingredient: `Principio sintetico ${patientId}`,
    therapeutic_movement_type: 'not_recorded',
    adherence_collection_status: 'not_recorded'
  }];
  return source;
}

function workbookBuffer() {
  const historical = followup('patient-qv-a', CIP_A, 'qv-a-historical', '2026-07-01', [
    { instrument: 'DLQI', value: 9, date: '2026-07-01' }
  ]);
  const current = followup('patient-qv-a', CIP_A, 'qv-a-current', '2026-08-01', [
    { instrument: 'DLQI', value: 0, date: '2026-08-01' },
    { instrument: 'EVA dolor', value: false, date: '2026-08-01' },
    { instrument: 'PROM sin fecha', value: 'explicito' }
  ]);
  const other = followup('patient-qv-b', CIP_B, 'qv-b', '2026-08-02', [
    { instrument: 'PROM otro paciente', value: 7, date: '2026-08-02' }
  ]);
  const rows = [historical, current, other].flatMap(source => core.projectEventRows(source.event, source.rowPayloads));
  const toCells = row => core.serializeRowToTsv(row).split('\t');
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([core.ROW_COLUMNS, ...rows.map(toCells)]), '01_DERMA');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([core.ROW_COLUMNS]), '03_DIGESTIVO');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
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
const context = await browser.newContext();
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', error => pageErrors.push(error.message));

async function search(cip) {
  if (await page.locator('#fhQuickViewOverlay:not(.hidden)').count()) {
    await page.locator('button[data-fh-qv-close]').click();
  }
  await page.locator('#fhCipInput').fill(cip);
  await page.locator('#fhSearchBtn').click();
  await page.waitForFunction(expected => {
    const overlay = document.querySelector('#fhQuickViewOverlay');
    return overlay && !overlay.classList.contains('hidden')
      && document.querySelector('#fhSubtitle')?.textContent === expected;
  }, cip);
}

async function visiblePromCards() {
  return page.locator('[data-fh-qv-raw-proms] .fh-qv-score-chip').allInnerTexts();
}

try {
  await page.goto(new URL('farmacia_index.html', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaDataImports && window.FarmaciaPatientFlowRuntime);
  await page.locator('#inputExcelFarmacia').setInputFiles({
    name: 'quickview-proms-sintetico.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(workbookBuffer())
  });
  await page.waitForFunction(() => document.querySelector('#estadoCargaFarmacia')?.textContent.includes('Excel Farmacia cargado'));

  await search(CIP_A);
  assert.equal((await page.locator('#fhSubtitle').innerText()).trim(), CIP_A, 'the explicit CIP resolves the raw patient');
  assert.equal(await page.locator('#fhQuickViewOverlay:not(.hidden)').count(), 1, 'Quick View is visible after supported search');
  assert.equal((await page.locator('[data-fh-qv-raw-proms] > .info-field__label').innerText()).trim(), 'PROMS FARMACIA REGISTRADOS');

  const quickViewText = await page.locator('#fhContent').innerText();
  assert.doesNotMatch(quickViewText, /\[object Object\]|undefined|null/);
  assert.doesNotMatch(quickViewText, /Ultimos PROMs Farmacia|Últimos PROMs Farmacia/);
  const cardsA = await visiblePromCards();
  assert.equal(cardsA.length, 4);
  assert.deepEqual(cardsA.map(text => text.split('\n').map(part => part.trim()).filter(Boolean)), [
    ['DLQI', '9', '2026-07-01'],
    ['DLQI', '0', '2026-08-01'],
    ['EVA DOLOR', 'false', '2026-08-01'],
    ['PROM SIN FECHA', 'explicito']
  ], 'visual order matches the structured PROM order');
  assert.equal(await page.locator('[data-fh-qv-raw-proms] .fh-qv-score-chip').nth(3).locator('.fh-qv-score-chip__interp').count(), 0, 'missing date stays absent');
  assert.doesNotMatch(cardsA[2], /\bNo\b|No registrado/, 'false is not converted to No');
  assert.doesNotMatch(cardsA.join('\n'), /leve|moderado|grave|remisi[oó]n|respuesta/i, 'no clinical category is derived');

  await search(CIP_B);
  const quickViewB = await page.locator('#fhContent').innerText();
  assert.match(quickViewB, /PROM otro paciente[\s\S]*7[\s\S]*2026-08-02/i);
  assert.doesNotMatch(quickViewB, /PROM sin fecha|EVA dolor|2026-07-01|2026-08-01/, 'switching CIP purges the previous Quick View');

  await search(CIP_A);
  assert.deepEqual(await visiblePromCards(), cardsA, 'returning to the patient does not mix the other patient');
  assert.doesNotMatch(await page.locator('#fhContent').innerText(), /PROM otro paciente|2026-08-02/);
  assert.deepEqual(consoleErrors, [], `console.error: ${consoleErrors.join(' | ')}`);
  assert.deepEqual(pageErrors, [], `pageerror: ${pageErrors.join(' | ')}`);
  console.log('farmacia_quickview_raw_proms_browser_check: PASS');
  console.log('QA Chromium: raw CIP/Quick View/order/history/simultaneous PROMs/0/false/date/isolation PASS; console.error=0 pageerror=0');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
