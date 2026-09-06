#!/usr/bin/env node
/** T9 #301 / #313 independent SES Program apply+survival oracle. Synthetic data only. */
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
const CIP = 'CIP-T9-SES-001';
const SEP = '═'.repeat(55);
const SESSION_KEY = 'promueve.fh.currentPatientSession.v1';
const SES_CODE_ID = 'fhDermaSesProgramCode';
const SES_LABEL_ID = 'fhDermaSesProgramLabel';

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_t9_oracle_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with npx --yes --package=playwright node tools/farmacia_unified_intake_ses_apply_oracle_check.mjs');
}
const { chromium } = loadPlaywrightFromNpx();
function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  return readdirSync(cache).filter(x => x.startsWith('chromium_headless_shell-')).sort().reverse()
    .map(x => path.join(cache, x, 'chrome-headless-shell-linux64', 'chrome-headless-shell')).find(existsSync) || bundled;
}
function validationWorkbookBuffer() {
  const fixture = JSON.parse(readFileSync(path.join(ROOT, 'data/demo/farmacia/export_v2/validation_event_v2.json'), 'utf8'));
  fixture.event = { ...fixture.event, event_id: 'evt-t9-ses', source_event_id: 'src-t9-ses',
    patient_id: 'patient-t9-ses', identifier_system: 'urn:cip:synthetic', identifier_value: CIP,
    service_code: 'DERM', service_label: 'Dermatología', pathology_code: 'HS',
    pathology_label: 'Hidradenitis supurativa', requested_drug_name: 'Solicitado T9',
    requested_active_ingredient: 'Principio T9', requested_dose_text: '20 mg', requested_route: 'SC' };
  const rows = core.projectEventRows(fixture.event, fixture.rowPayloads);
  const workbook = XLSX.utils.book_new();
  const cells = rows.map(row => core.serializeRowToTsv(row).split('\t'));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([core.ROW_COLUMNS, ...cells]), '01_DERMA');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([core.ROW_COLUMNS]), '03_DIGESTIVO');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
function eordenRaw(code, label, title = 'PSORIASIS') {
  return [
    `SOLICITUD DERMATOLOGÍA → FARMACIA - ${title}`, SEP, `• CIP: ${CIP}`,
    '• Marca comercial solicitada: HYRIMOZ', '• Dosis solicitada: 40 MG',
    '• Vía solicitada: SC', '• Pauta: CADA 14 DIAS', '• Inducción solicitada: NO',
    '• Justificación clínica: Justificación sintética T9.', 'PROGRAMA SES',
    `• Código: ${code}`, `• Denominación: ${label}`
  ].join('\n');
}
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'],
  ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
]);
const server = createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'farmacia_index.html';
  const file = path.resolve(ROOT, relative);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { response.writeHead(403).end(); return; }
  try {
    if (!statSync(file).isFile()) throw new Error('not_file');
    response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(response);
  } catch { response.writeHead(404).end('Not found'); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const BASE = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
let passed = 0;

async function selectedPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.__errors = [];
  page.on('pageerror', error => page.__errors.push(`pageerror:${error.message}`));
  page.on('console', message => { if (message.type() === 'error') page.__errors.push(`console:${message.text()}`); });
  await page.goto(new URL('farmacia_index.html', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaDataImports && window.FarmaciaPatientFlowRuntime);
  await page.locator('#inputExcelFarmacia').setInputFiles({
    name: 'farmacia-t9-ses-sintetico.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(validationWorkbookBuffer())
  });
  await page.waitForTimeout(1200);
  await page.locator('#fhCipInput').fill(CIP);
  await page.locator('#fhSearchBtn').click();
  await page.locator('#fhQuickViewOverlay:not(.hidden)').waitFor();
  const link = page.locator('#fhQvActions').getByRole('link', { name: 'Validación', exact: true });
  await Promise.all([page.waitForLoadState('domcontentloaded'), link.click()]);
  await page.waitForSelector('#fhUnifiedIntake');
  return { context, page };
}
async function preview(page, raw) {
  await page.locator('#fhUnifiedIntake').fill(raw);
  await page.locator('[data-fh-intake-preview]').click();
  await page.waitForFunction(() => document.querySelector('[data-fh-intake-preview-panel]')?.textContent?.trim().length > 0);
}
function sesRow(page) { return page.locator('[data-fh-concept="ses_program"]'); }
async function confirmSes(page) {
  const row = sesRow(page);
  assert.equal(await row.count(), 1, 'T9 semantic RED: ses_program decision row missing');
  const action = row.locator('[data-fh-concept-action="confirm"]');
  assert.equal(await action.count(), 1, 'ses_program confirm action missing');
  assert.equal(await action.isDisabled(), false, 'ses_program confirm unexpectedly disabled');
  await action.click();
}
async function assertSesValues(page, expected) {
  assert.equal(await page.locator('#fhDermaPatologia').inputValue(), expected.visible, 'brownfield pathology mapping mismatch');
  assert.equal(await page.locator(`#${SES_CODE_ID}`).count(), 1, 'SES code normal-form control missing');
  assert.equal(await page.locator(`#${SES_LABEL_ID}`).count(), 1, 'SES label normal-form control missing');
  assert.equal(await page.locator(`#${SES_CODE_ID}`).inputValue(), expected.code, 'SES code did not survive apply');
  assert.equal(await page.locator(`#${SES_LABEL_ID}`).inputValue(), expected.label, 'SES label did not survive apply');
  const draft = await page.evaluate(() => window.FarmaciaPatientFlowRuntime.getPageDraft('validacion'));
  assert.equal(draft?.controls?.fhDermaSesProgramCode?.value, expected.code, 'SES code missing from existing draft contract');
  assert.equal(draft?.controls?.fhDermaSesProgramLabel?.value, expected.label, 'SES label missing from existing draft contract');
  assert.equal(draft?.controls?.fhDermaPatologia?.value, expected.visible, 'visible pathology missing from existing draft contract');
}
try {
  {
    const { context, page } = await selectedPage();
    await page.locator('#fhDermaPatologia').selectOption('');
    await preview(page, eordenRaw('SES_HS', 'HIDRADENITIS SUPURATIVA', 'HIDRADENITIS SUPURATIVA'));
    assert.equal(await sesRow(page).count(), 1, 'T9 semantic RED: ses_program decision row missing');
    const rowText = (await sesRow(page).textContent()) || '';
    assert.ok(rowText.includes('SES_HS') && rowText.includes('HIDRADENITIS SUPURATIVA'), 'preview must show SES code+label together');
    await confirmSes(page);
    await assertSesValues(page, { code: 'SES_HS', label: 'HIDRADENITIS SUPURATIVA', visible: 'Hidradenitis supurativa' });
    const storageBlob = await page.evaluate(() => Object.keys(sessionStorage).sort().map(k => `${k}\n${sessionStorage.getItem(k)}`).join('\n---\n'));
    assert.ok(storageBlob.includes(SESSION_KEY), 'selected-patient session missing');
    let reloadDialog = '';
    page.once('dialog', async dialog => { reloadDialog = dialog.message(); await dialog.accept(); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#fhUnifiedIntake');
    await assertSesValues(page, { code: 'SES_HS', label: 'HIDRADENITIS SUPURATIVA', visible: 'Hidradenitis supurativa' });
    assert.equal(await page.locator('#fhUnifiedIntake').inputValue(), '', 'transient intake raw must not restore');
    assert.match(reloadDialog || '', /continuar|empezar de cero/i, 'normal draft reload contract missing');
    assert.deepEqual(page.__errors, [], `browser errors: ${page.__errors.join(' | ')}`);
    await context.close();
    console.log('OK 1 SES_HS apply + code/label + visible mapping survive reload'); passed++;
  }
  {
    const { context, page } = await selectedPage();
    await page.locator('#fhDermaPatologia').selectOption('');
    await preview(page, eordenRaw('SES_VITI', 'VITILIGO', 'VITILIGO'));
    await confirmSes(page);
    await assertSesValues(page, { code: 'SES_VITI', label: 'VITILIGO', visible: 'Vitíligo' });
    assert.deepEqual(page.__errors, [], `browser errors: ${page.__errors.join(' | ')}`);
    await context.close();
    console.log('OK 2 SES_VITI exact unaccented label maps only by declared table'); passed++;
  }
  {
    const { context, page } = await selectedPage();
    await page.locator('#fhDermaPatologia').selectOption('Psoriasis');
    await preview(page, eordenRaw('SES_HS', 'PSORIASIS', 'HIDRADENITIS SUPURATIVA'));
    const text = (await page.locator('[data-fh-intake-preview-panel]').textContent()) || '';
    assert.match(text, /SES_PROGRAM|incoher|invalid|bloque/i, 'invalid SES pair must expose a structured blocking reason');
    const row = sesRow(page);
    if (await row.count()) {
      const confirm = row.locator('[data-fh-concept-action="confirm"], [data-fh-concept-action="replace"]');
      if (await confirm.count()) assert.equal(await confirm.first().isDisabled(), true, 'invalid SES pair reached an enabled write action');
    }
    assert.equal(await page.locator('#fhDermaPatologia').inputValue(), 'Psoriasis', 'invalid SES pair mutated visible pathology');
    assert.equal(await page.locator(`#${SES_CODE_ID}`).count() ? await page.locator(`#${SES_CODE_ID}`).inputValue() : '', '', 'invalid SES pair wrote code');
    assert.equal(await page.locator(`#${SES_LABEL_ID}`).count() ? await page.locator(`#${SES_LABEL_ID}`).inputValue() : '', '', 'invalid SES pair wrote label');
    assert.deepEqual(page.__errors, [], `browser errors: ${page.__errors.join(' | ')}`);
    await context.close();
    console.log('OK 3 invalid SES pair cannot bypass write boundary'); passed++;
  }
  console.log(`T9 SES APPLY ORACLE PASS ${passed} scenario groups`);
} catch (error) {
  console.error(`T9 SES APPLY ORACLE FAIL after ${passed} passed scenario groups: ${error?.stack || error}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
