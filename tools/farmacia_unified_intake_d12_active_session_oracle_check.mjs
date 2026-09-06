#!/usr/bin/env node
/**
 * T6 #298 / #311 independent D12 retention oracle.
 * Frozen before the D12 repair receives write authority.
 * Synthetic data only; supported patient-selection/browser path only.
 */
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
const CIP = 'CIP-D12-ACTIVE-001';
const RAW_MARKER = 'D12_RAW_MUST_NOT_PERSIST_X9K7';
const NORMAL_DRAFT_VALUE = 'D12 normal draft survives';
const SESSION_KEY = 'promueve.fh.currentPatientSession.v1';
const SEP = '═'.repeat(55);
function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_d12_oracle_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_unified_intake_d12_active_session_oracle_check.mjs');
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
function validationWorkbookBuffer() {
  const fixture = JSON.parse(readFileSync(path.join(ROOT, 'data/demo/farmacia/export_v2/validation_event_v2.json'), 'utf8'));
  fixture.event = {
    ...fixture.event,
    event_id: 'evt-d12-active-validation',
    source_event_id: 'src-d12-active-validation',
    patient_id: 'patient-d12-active',
    identifier_system: 'urn:cip:synthetic',
    identifier_value: CIP,
    service_code: 'DERM',
    service_label: 'Dermatología',
    pathology_code: 'HS',
    pathology_label: 'Hidradenitis supurativa',
    requested_drug_name: 'Solicitado D12',
    requested_active_ingredient: 'Principio D12',
    requested_dose_text: '20 mg',
    requested_route: 'SC'
  };
  const rows = core.projectEventRows(fixture.event, fixture.rowPayloads);
  const workbook = XLSX.utils.book_new();
  const cells = rows.map(row => core.serializeRowToTsv(row).split('\t'));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([core.ROW_COLUMNS, ...cells]), '01_DERMA');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([core.ROW_COLUMNS]), '03_DIGESTIVO');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
function intakeRaw() {
  return [
    'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS',
    SEP,
    `• CIP: ${CIP}`,
    '• Marca comercial solicitada: HYRIMOZ',
    '• Dosis solicitada: 40 MG',
    '• Vía solicitada: SC',
    '• Pauta: CADA 14 DIAS',
    '• Inducción solicitada: NO',
    `• Justificación clínica: ${RAW_MARKER} justificación sintética.`,
    'PROGRAMA SES',
    '• Código: SES_PSOR',
    '• Denominación: PSORIASIS'
  ].join('\n');
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json'],
  ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
]);
const server = createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'farmacia_index.html';
  const file = path.resolve(ROOT, relative);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    response.writeHead(403).end();
    return;
  }
  try {
    if (!statSync(file).isFile()) throw new Error('not_file');
    response.writeHead(200, {
      'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
      'cache-control': 'no-store'
    });
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
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', error => pageErrors.push(error.message));

async function gotoValidationThroughSupportedSelection() {
  await page.goto(new URL('farmacia_index.html', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaDataImports && window.FarmaciaPatientFlowRuntime);
  await page.locator('#inputExcelFarmacia').setInputFiles({
    name: 'farmacia-d12-sintetico.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(validationWorkbookBuffer())
  });
  await page.waitForTimeout(1200);
  const loadStatus = (await page.locator('#estadoCargaFarmacia').textContent()) || '';
  assert.match(loadStatus, /Excel Farmacia cargado/, `synthetic workbook must load through the supported importer: ${loadStatus}`);
  await page.locator('#fhCipInput').fill(CIP);
  await page.locator('#fhSearchBtn').click();
  await page.locator('#fhQuickViewOverlay:not(.hidden)').waitFor();
  const selected = await page.evaluate(() => window.FarmaciaPatientFlowRuntime.getCurrentEnvelope());
  assert.equal(selected?.identifier?.identifier_value, CIP, 'supported search must establish active CurrentPatientSession');
  const validationLink = page.locator('#fhQvActions').getByRole('link', { name: 'Validación', exact: true });
  assert.equal(await validationLink.count(), 1, 'Quick View must expose supported Validación navigation');
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    validationLink.click()
  ]);
  await page.waitForSelector('#fhUnifiedIntake');
  await page.waitForFunction(() => Boolean(window.FarmaciaPatientFlowRuntime?.getCurrentEnvelope()));
  const envelope = await page.evaluate(() => window.FarmaciaPatientFlowRuntime.getCurrentEnvelope());
  assert.equal(envelope.identifier.identifier_value, CIP, 'Validación must retain the selected-patient envelope');
}

try {
  await gotoValidationThroughSupportedSelection();

  const normalControl = page.locator('#fhDermaJustificacion');
  assert.equal(await normalControl.count(), 1, 'normal draft-eligible control missing');
  await normalControl.fill(NORMAL_DRAFT_VALUE);

  const intake = page.locator('#fhUnifiedIntake');
  await intake.fill(intakeRaw());
  await page.locator('[data-fh-intake-preview]').click();
  await page.waitForFunction(() => document.querySelector('[data-fh-intake-preview-panel]')?.textContent?.trim().length > 0);

  await page.waitForFunction(() => Boolean(window.FarmaciaPatientFlowRuntime?.getPageDraft('validacion')));
  const draft = await page.evaluate(() => window.FarmaciaPatientFlowRuntime.getPageDraft('validacion'));
  assert.equal(draft?.controls?.fhDermaJustificacion?.value, NORMAL_DRAFT_VALUE, 'normal form draft behavior must remain active');
  assert.equal(Object.prototype.hasOwnProperty.call(draft?.controls || {}, 'fhUnifiedIntake'), false,
    'D12: transient raw intake textarea must not enter the selected-patient page draft');
  assert.equal(JSON.stringify(draft).includes(RAW_MARKER), false,
    'D12: raw intake marker must not be present anywhere in the page draft');

  const storageBlob = await page.evaluate(() =>
    Object.keys(sessionStorage).sort().map(key => `${key}\n${sessionStorage.getItem(key)}`).join('\n---\n'));
  assert.ok(storageBlob.includes(SESSION_KEY), 'active patient session must exist in sessionStorage');
  assert.equal(storageBlob.includes(RAW_MARKER), false,
    'D12: raw intake marker must not be present anywhere in sessionStorage');

  let reloadDialog = '';
  page.once('dialog', async dialog => {
    reloadDialog = dialog.message();
    await dialog.accept();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#fhUnifiedIntake');
  assert.equal(await page.locator('#fhDermaJustificacion').inputValue(), NORMAL_DRAFT_VALUE,
    'normal clinical draft control must restore after reload');
  assert.equal(await page.locator('#fhUnifiedIntake').inputValue(), '',
    'D12: transient raw intake must not restore after reload');
  assert.match(reloadDialog || '', /continuar|empezar de cero/i, 'normal dirty-draft reload contract must remain active');
  assert.deepEqual(pageErrors, [], `uncaught browser errors: ${pageErrors.join(' | ')}`);
  for (const text of consoleErrors) {
    assert.ok(!text.includes(RAW_MARKER), 'D12: raw marker leaked to console error');
  }

  console.log('farmacia_unified_intake_d12_active_session_oracle_check: PASS');
  console.log('D12 active CurrentPatientSession + supported selection + draft exclusion + reload retention verified');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
