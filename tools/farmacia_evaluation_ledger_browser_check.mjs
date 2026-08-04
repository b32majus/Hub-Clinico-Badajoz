#!/usr/bin/env node

import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const BASE_URL = process.env.FH_LEDGER_BASE_URL || 'http://127.0.0.1:48796/';
const LEGACY_KEY = 'promueve.fh.synthetic-evaluation-ledger.v1';
const LEGACY_VALUE = JSON.stringify({ schema_version: '1.0.0', events: [{ event_id: 'LEGACY-MUST-NOT-BE-READ' }] });

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (!existsSync(path.join(nodeModules, 'playwright', 'package.json'))) continue;
    return createRequire(path.join(nodeModules, '__fh_ledger_loader.cjs'))('playwright');
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_evaluation_ledger_browser_check.mjs');
}

const { chromium } = loadPlaywrightFromNpx();

function availableChromiumExecutable() {
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

async function assertRetiredRuntime(page) {
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => typeof window.FarmaciaEvaluationLedger), 'undefined', 'ledger API is absent from the supported runtime');
  assert.equal(await page.evaluate(() => typeof window.FarmaciaEvaluationWorkbook), 'undefined', 'synthetic workbook API is absent from the supported runtime');
  assert.equal(await page.locator('#fhEvaluationLedgerFeedback, #fhEvaluationLedgerPrevious, #fhEvaluationWorkbookDownload').count(), 0, 'no ledger recovery or workbook action is visible');
  assert.deepEqual(await page.evaluate(() => window.__legacyLedgerAccess), { reads: 0, writes: 0, removes: 0 }, 'legacy ledger key is not read, written or removed');
  assert.equal(await page.evaluate(() => window.__legacyLedgerRaw()), LEGACY_VALUE, 'legacy value remains opaque and unchanged');
  assert.equal(await page.evaluate(() => new URL(location.href).searchParams.has('ledger_event_id')), false, 'runtime does not adopt a ledger event URL');
}

async function installOutputCapture(page) {
  await page.evaluate(() => {
    window.__normalOutputs = {};
    window.FarmaciaDemo.copyTextToClipboard = text => {
      window.__normalOutputs.text = text;
      return Promise.resolve(true);
    };
    window.FarmaciaDemo.downloadFile = (filename, content, mime) => {
      window.__normalOutputs.download = { filename, content, mime };
    };
    window.FarmaciaExcelRowExport.copyTSVRowToClipboard = (row, options) => {
      window.__normalOutputs.excelRow = { row: [...row], options: { ...(options || {}) } };
      return Promise.resolve(true);
    };
    window.FarmaciaExcelRowExport.copyTSVRowsToClipboard = (rows, options) => {
      window.__normalOutputs.excelRows = { rows: rows.map(row => [...row]), options: { ...(options || {}) } };
      return Promise.resolve(true);
    };
  });
}

async function assertV2Clipboard(page, button, status, expectedRows) {
  await page.evaluate(() => navigator.clipboard.writeText('__EMPTY__'));
  await page.locator(button).click();
  await page.waitForFunction(selector => {
    const text = document.querySelector(selector)?.textContent || '';
    return text.includes('Export v2 demo copiado:') || text.includes('No se pudo copiar Export v2 demo:');
  }, status);
  const statusText = await page.locator(status).textContent();
  assert.match(statusText, /Export v2 demo copiado:/, `${button} completes through its supported handler: ${statusText}`);
  const tsv = await page.evaluate(() => navigator.clipboard.readText());
  assert.notEqual(tsv, '__EMPTY__', `${button} writes through its own clipboard boundary`);
  const rows = tsv.split('\n');
  assert.equal(rows.length, expectedRows, `${button} preserves approved row cardinality`);
  rows.forEach(row => assert.equal(row.split('\t').length, 152, `${button} preserves 152 columns`));
}

const browser = await chromium.launch({ headless: true, executablePath: availableChromiumExecutable() });
const context = await browser.newContext();
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE_URL).origin });
await context.addInitScript(({ key, value }) => {
  const originalGet = Storage.prototype.getItem;
  const originalSet = Storage.prototype.setItem;
  const originalRemove = Storage.prototype.removeItem;
  originalSet.call(window.localStorage, key, value);
  window.__legacyLedgerAccess = { reads: 0, writes: 0, removes: 0 };
  window.__legacyLedgerRaw = () => originalGet.call(window.localStorage, key);
  Storage.prototype.getItem = function (candidate) {
    if (String(candidate) === key) window.__legacyLedgerAccess.reads += 1;
    return originalGet.call(this, candidate);
  };
  Storage.prototype.setItem = function (candidate, nextValue) {
    if (String(candidate) === key) window.__legacyLedgerAccess.writes += 1;
    return originalSet.call(this, candidate, nextValue);
  };
  Storage.prototype.removeItem = function (candidate) {
    if (String(candidate) === key) window.__legacyLedgerAccess.removes += 1;
    return originalRemove.call(this, candidate);
  };
}, { key: LEGACY_KEY, value: LEGACY_VALUE });

const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(new URL('farmacia_index.html', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await assertRetiredRuntime(page);

  await page.goto(new URL('farmacia_validacion.html?cip=CIP-DEMO-FH-001', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaValidacion && !document.getElementById('fhValExportV2Btn')?.disabled);
  await assertV2Clipboard(page, '#fhValExportV2Btn', '#fhValExportV2Status', 1);
  await page.locator('#fhOrigenEntrada').selectOption('manual_farmacia');
  await page.locator('#fhServicioManual').selectOption('derma');
  await page.locator('#fhPatologiaManual').selectOption({ label: 'Hidradenitis supurativa' });
  await page.locator('#fhManualCip').fill('CIP-DEMO-FH-001');
  await page.locator('#fhManualFecha').fill('2026-08-04');
  await page.locator('#fhValEstado').selectOption('validated');
  await page.locator('#fhValidadoJustificacion').fill('VALIDATION-NOT-PERSISTED');
  await page.waitForFunction(() => !document.getElementById('fhValExcelExportBtn')?.disabled);
  await installOutputCapture(page);
  await page.locator('#fhValExportTxt').click();
  assert.match(await page.evaluate(() => window.__normalOutputs.text), /VALIDATION-NOT-PERSISTED/);
  await page.locator('#fhValExcelExportBtn').click();
  assert.equal((await page.evaluate(() => window.__normalOutputs.excelRow.row)).length, 61, 'Validation v1 Excel remains 61 columns');
  await assertRetiredRuntime(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaValidacion);
  assert.equal(await page.locator('#fhValidadoJustificacion').inputValue(), '', 'Validation act is destroyed on reload');
  await assertRetiredRuntime(page);

  await page.locator('#fhValidadoJustificacion').fill('VALIDATION-CIP-001-MUST-NOT-RETURN');
  await page.goto(new URL('farmacia_validacion.html?cip=CIP-DEMO-FH-002', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaValidacion);
  assert.equal(await page.locator('#fhValidadoJustificacion').inputValue(), '', 'Validation CIP switch does not recover the prior form');
  await page.goto(new URL('farmacia_validacion.html?cip=CIP-DEMO-FH-001', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaValidacion);
  assert.equal(await page.locator('#fhValidadoJustificacion').inputValue(), '', 'returning to the Validation CIP does not restore its prior form');
  await assertRetiredRuntime(page);

  await page.goto(new URL('farmacia_primera_visita.html?cip=CIP-DEMO-FH-001', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaPrimeraVisita && !document.getElementById('fhPvExportV2Btn')?.disabled);
  await page.locator('#fhPvFecha').fill('2026-08-04');
  await assertV2Clipboard(page, '#fhPvExportV2Btn', '#fhPvExportV2Status', 1);
  await page.locator('#fhPvNotas').fill('FIRST-VISIT-NOT-PERSISTED');
  await installOutputCapture(page);
  await page.locator('#fhPvExportTxt').click();
  assert.match(await page.evaluate(() => window.__normalOutputs.text), /FIRST-VISIT-NOT-PERSISTED/);
  await page.locator('#fhPvExcelExportBtn').click();
  assert.equal((await page.evaluate(() => window.__normalOutputs.excelRow.row)).length, 61, 'First Visit v1 Excel remains 61 columns');
  await assertRetiredRuntime(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaPrimeraVisita);
  assert.equal(await page.locator('#fhPvNotas').inputValue(), '', 'First Visit act is destroyed on reload');
  await assertRetiredRuntime(page);

  await page.locator('#fhPvNotas').fill('CIP-001-MUST-NOT-RETURN');
  await page.goto(new URL('farmacia_primera_visita.html?cip=CIP-DEMO-FH-002', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaPrimeraVisita);
  assert.equal(await page.locator('#fhPvNotas').inputValue(), '', 'changing CIP does not recover the prior patient form');
  await page.goto(new URL('farmacia_primera_visita.html?cip=CIP-DEMO-FH-001', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaPrimeraVisita);
  assert.equal(await page.locator('#fhPvNotas').inputValue(), '', 'returning to a CIP does not restore its prior form');
  await assertRetiredRuntime(page);

  await page.goto(new URL('farmacia_seguimiento.html?cip=CIP-DEMO-FH-004', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaSeguimiento && !document.getElementById('fhSegExportV2Btn')?.disabled && document.querySelectorAll('input[name="fhSegLineCardSelection"]:not(:disabled)').length === 2);
  await assertV2Clipboard(page, '#fhSegExportV2Btn', '#fhSegExportV2Status', 2);
  await page.locator('.seg-line-card:has(input[value="BIO-FH-004-L2"])').click();
  await page.locator('#fhSegDispensado').selectOption('si');
  await page.waitForFunction(() => window.FarmaciaSeguimiento.getCurrentVisit().dispensed_line_ids.includes('BIO-FH-004-L2'));
  await page.locator('#fhSegObservacionesLinea').fill('FOLLOWUP-NOT-PERSISTED');
  await installOutputCapture(page);
  await page.locator('#fhSegExportTxt').click();
  assert.match(await page.evaluate(() => window.__normalOutputs.text), /FOLLOWUP-NOT-PERSISTED/);
  await page.locator('#fhSegExportCsv').click();
  assert.match((await page.evaluate(() => window.__normalOutputs.download)).mime, /text\/csv/);
  await page.locator('#fhSegExcelExportBtn').click();
  assert.ok((await page.evaluate(() => window.__normalOutputs.excelRows.rows)).every(row => row.length === 61), 'Follow-up v1 Excel rows remain 61 columns');
  await assertRetiredRuntime(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaSeguimiento && document.querySelectorAll('input[name="fhSegLineCardSelection"]:not(:disabled)').length === 2);
  assert.equal(await page.locator('#fhSegObservacionesLinea').inputValue(), '', 'Follow-up act is destroyed on reload');
  await assertRetiredRuntime(page);

  await page.locator('.seg-line-card:has(input[value="BIO-FH-004-L2"])').click();
  await page.waitForFunction(() => !document.getElementById('fhSegObservacionesLinea')?.disabled);
  await page.locator('#fhSegObservacionesLinea').fill('FOLLOWUP-CIP-004-MUST-NOT-RETURN');
  await page.goto(new URL('farmacia_seguimiento.html?cip=CIP-DEMO-FH-001', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaSeguimiento);
  assert.equal(await page.locator('#fhSegObservacionesLinea').inputValue(), '', 'Follow-up CIP switch does not recover the prior form');
  await page.goto(new URL('farmacia_seguimiento.html?cip=CIP-DEMO-FH-004', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaSeguimiento && document.querySelectorAll('input[name="fhSegLineCardSelection"]:not(:disabled)').length === 2);
  assert.equal(await page.locator('#fhSegObservacionesLinea').inputValue(), '', 'returning to the Follow-up CIP does not restore its prior form');
  await assertRetiredRuntime(page);

  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join('\n')}`);
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('\n')}`);
  console.log('farmacia_evaluation_ledger_browser_check: PASSED');
  console.log('ledger/workbook absent; legacy key opaque; v1/v2 outputs intact; reload and CIP switching do not restore forms; console/pageerror 0.');
} finally {
  await browser.close();
}
