#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_v2_parallel_activation_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_export_v2_parallel_activation_browser_check.mjs');
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
    .sort()
    .reverse()
    .map(entry => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return candidates.find(existsSync) || bundled;
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json'],
  ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
]);
const server = createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'farmacia_validacion.html';
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
const browserContext = await browser.newContext();
await browserContext.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
const page = await browserContext.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', error => pageErrors.push(error.message));

async function assertParallelUi({ button, status, v1 }) {
  const v2 = page.locator(button);
  await v2.waitFor({ state: 'visible' });
  assert.equal((await v2.textContent()).replace(/\s+/g, ' ').trim(), 'Copiar Export v2 demo · 152 columnas');
  assert.equal(await v2.evaluate(element => element.closest('.form-actions')?.getAttribute('data-export-version')), 'v2');
  for (const selector of v1) {
    const control = page.locator(selector);
    assert.equal(await control.count(), 1, `${selector} remains present`);
    assert.notEqual(await control.evaluate(element => element.closest('.form-actions')?.getAttribute('data-export-version')), 'v2', `${selector} remains separate from v2`);
  }
  assert.equal(await page.locator(status).getAttribute('role'), 'status');
  assert.equal(await page.locator(status).getAttribute('aria-live'), 'polite');
  assert.equal(await page.getByText('Export v2 técnico, local y sin cabecera. No apto para piloto real.', { exact: true }).count(), 1);
}

async function installProjectionCapture(apiName, wrapperName) {
  await page.evaluate(({ apiName, wrapperName }) => {
    const api = window[apiName];
    const original = api[wrapperName];
    window.__v2ActivationCapture = { calls: 0, expectedTsv: null };
    api[wrapperName] = function () {
      window.__v2ActivationCapture.calls += 1;
      const projection = original.apply(api, arguments);
      window.__v2ActivationCapture.expectedTsv = projection.tsv;
      return projection;
    };
  }, { apiName, wrapperName });
}

async function copyAndAssertExact({ button, status, expectedRows, expectedLineIds, doubleClick = false }) {
  await page.evaluate(() => navigator.clipboard.writeText('__EMPTY__'));
  if (doubleClick) {
    await page.evaluate(selector => {
      const target = document.querySelector(selector);
      target.click();
      target.click();
    }, button);
  } else {
    await page.locator(button).click();
  }
  await page.waitForFunction(selector => document.querySelector(selector)?.textContent.includes('Export v2 demo copiado:'), status);
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  const capture = await page.evaluate(() => ({ ...window.__v2ActivationCapture }));
  assert.equal(capture.calls, 1, 'one gesture invokes the FromCurrentContext wrapper exactly once');
  assert.equal(clipboard, capture.expectedTsv, 'clipboard contains projection.tsv verbatim');
  const physicalRows = clipboard.split('\n');
  assert.equal(physicalRows.length, expectedRows, 'TSV has the expected physical row count without a trailing LF');
  physicalRows.forEach(row => assert.equal(row.split('\t').length, 152, 'every TSV row has exactly 152 cells'));
  const parsed = await page.evaluate(tsv => {
    const rows = window.FarmaciaExportV2Core.parseTsvRows(tsv);
    return {
      lineIds: rows.map(row => row.line_id),
      identities: rows.map(row => ({ eventId: row.event_id, sourceEventId: row.source_event_id, rowId: row.row_id, lineId: row.line_id }))
    };
  }, clipboard);
  assert.deepEqual(parsed.lineIds, expectedLineIds);
  assert.notEqual(physicalRows[0], await page.evaluate(() => window.FarmaciaExportV2Core.ROW_COLUMNS.join('\t')), 'TSV has no header');
  return { clipboard, identities: parsed.identities };
}

async function repeatAndAssertStable(options, first) {
  await page.evaluate(() => { window.__v2ActivationCapture.calls = 0; });
  const second = await copyAndAssertExact(options);
  assert.equal(second.clipboard, first.clipboard, 'repeated copies preserve the exact TSV');
  assert.deepEqual(second.identities, first.identities, 'event, source, row and line IDs remain stable between copies');
}

async function disabledStates(selectors) {
  return page.locator(selectors.join(',')).evaluateAll(elements => elements.map(element => ({ id: element.id, disabled: element.disabled })));
}

try {
  const validationV1 = ['#fhValExportTxt', '#fhValExportCsv', '#fhValExcelExportBtn'];
  await page.goto(new URL('farmacia_validacion.html?cip=CIP-DEMO-FH-001', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaValidacion && !document.getElementById('fhValExportV2Btn')?.disabled);
  await assertParallelUi({ button: '#fhValExportV2Btn', status: '#fhValExportV2Status', v1: validationV1 });
  const validationV1Before = await disabledStates(validationV1);
  await installProjectionCapture('FarmaciaValidacion', 'buildValidationV2ProjectionFromCurrentContext');
  const validationFirst = await copyAndAssertExact({
    button: '#fhValExportV2Btn', status: '#fhValExportV2Status', expectedRows: 1, expectedLineIds: [null], doubleClick: true
  });
  await repeatAndAssertStable({ button: '#fhValExportV2Btn', status: '#fhValExportV2Status', expectedRows: 1, expectedLineIds: [null] }, validationFirst);
  assert.deepEqual(await disabledStates(validationV1), validationV1Before, 'Validation v1 controls are unaffected by v2 copies');

  const firstVisitV1 = ['#fhPvExportTxt', '#fhPvExportCsv', '#fhPvExcelExportBtn'];
  await page.goto(new URL('farmacia_primera_visita.html?cip=CIP-DEMO-FH-001', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaPrimeraVisita && !document.getElementById('fhPvExportV2Btn')?.disabled);
  await page.locator('#fhPvFecha').fill('2026-08-04');
  await assertParallelUi({ button: '#fhPvExportV2Btn', status: '#fhPvExportV2Status', v1: firstVisitV1 });
  const firstVisitV1Before = await disabledStates(firstVisitV1);
  await installProjectionCapture('FarmaciaPrimeraVisita', 'buildFirstVisitV2ProjectionFromCurrentContext');
  const firstVisitFirst = await copyAndAssertExact({
    button: '#fhPvExportV2Btn', status: '#fhPvExportV2Status', expectedRows: 1, expectedLineIds: ['BIO-FH-001-L1'], doubleClick: true
  });
  await repeatAndAssertStable({ button: '#fhPvExportV2Btn', status: '#fhPvExportV2Status', expectedRows: 1, expectedLineIds: ['BIO-FH-001-L1'] }, firstVisitFirst);
  assert.deepEqual(await disabledStates(firstVisitV1), firstVisitV1Before, 'First Visit v1 controls are unaffected by v2 copies');
  await page.evaluate(() => {
    window.__parallelExcelCapture = null;
    window.FarmaciaExcelRowExport.copyTSVRowToClipboard = row => {
      window.__parallelExcelCapture = [...row];
      return Promise.resolve(true);
    };
  });
  await page.locator('#fhPvExcelExportBtn').click();
  assert.equal((await page.evaluate(() => window.__parallelExcelCapture))?.length, 61, 'v1 Excel remains exactly 61 columns');

  const followupV1 = ['#fhSegExportTxt', '#fhSegExportCsv', '#fhSegExcelExportBtn'];
  await page.goto(new URL('farmacia_seguimiento.html?cip=CIP-DEMO-FH-001', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaSeguimiento && !document.getElementById('fhSegExportV2Btn')?.disabled && document.querySelectorAll('input[name="fhSegLineCardSelection"]').length === 1);
  await assertParallelUi({ button: '#fhSegExportV2Btn', status: '#fhSegExportV2Status', v1: followupV1 });
  const followupV1Before = await disabledStates(followupV1);
  await installProjectionCapture('FarmaciaSeguimiento', 'buildFollowupV2ProjectionFromCurrentContext');
  const followup001First = await copyAndAssertExact({
    button: '#fhSegExportV2Btn', status: '#fhSegExportV2Status', expectedRows: 1, expectedLineIds: ['BIO-FH-001-L1'], doubleClick: true
  });
  await repeatAndAssertStable({ button: '#fhSegExportV2Btn', status: '#fhSegExportV2Status', expectedRows: 1, expectedLineIds: ['BIO-FH-001-L1'] }, followup001First);
  assert.deepEqual(await disabledStates(followupV1), followupV1Before, 'Follow-up v1 controls are unaffected by v2 copies');

  await page.goto(new URL('farmacia_seguimiento.html?cip=CIP-DEMO-FH-004', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaSeguimiento && !document.getElementById('fhSegExportV2Btn')?.disabled && document.querySelectorAll('input[name="fhSegLineCardSelection"]:not(:disabled)').length === 2);
  await installProjectionCapture('FarmaciaSeguimiento', 'buildFollowupV2ProjectionFromCurrentContext');
  const followup004First = await copyAndAssertExact({
    button: '#fhSegExportV2Btn', status: '#fhSegExportV2Status', expectedRows: 2,
    expectedLineIds: ['BIO-FH-004-L2', 'BIO-FH-004-L3'], doubleClick: true
  });
  await repeatAndAssertStable({
    button: '#fhSegExportV2Btn', status: '#fhSegExportV2Status', expectedRows: 2,
    expectedLineIds: ['BIO-FH-004-L2', 'BIO-FH-004-L3']
  }, followup004First);
  assert.equal(await page.locator('#fhSegExportTxt').isVisible(), true, 'JARA v1 remains visible');
  assert.equal(await page.locator('#fhSegExportCsv').isVisible(), true, 'CSV v1 remains visible');
  assert.equal(await page.locator('#fhSegExcelExportBtn').isVisible(), true, 'Excel v1 remains visible');

  await page.goto(new URL('farmacia_primera_visita.html?cip=CIP-DEMO-FH-001', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaPrimeraVisita && !document.getElementById('fhPvExportV2Btn')?.disabled);
  const availableV1 = await disabledStates(firstVisitV1);
  await page.locator('#fhPvCip').fill('CIP-SYN-UNKNOWN-V2');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#fhPvCipSearchBtn').click();
  await page.waitForFunction(() => document.getElementById('fhPvExportV2Btn')?.disabled && document.getElementById('fhPvExportV2Status')?.textContent.includes('No existe contexto técnico sintético'));
  assert.deepEqual(await disabledStates(firstVisitV1), availableV1, 'unknown context blocks only v2');

  await page.goto(new URL('farmacia_primera_visita.html?cip=CIP-DEMO-FH-002', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaPrimeraVisita && document.getElementById('fhPvCip')?.value === 'CIP-DEMO-FH-002');
  const staleV1 = await disabledStates(firstVisitV1);
  await page.locator('#fhPvCip').fill('CIP-DEMO-FH-001');
  await page.waitForFunction(() => document.getElementById('fhPvExportV2Btn')?.disabled && document.getElementById('fhPvExportV2Status')?.textContent.includes('no coincide con el paciente activo'));
  assert.deepEqual(await disabledStates(firstVisitV1), staleV1, 'stale context blocks only v2');

  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join('\n')}`);
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('\n')}`);
  console.log('PASS: Export v2 parallel activation joint browser QA (Chromium, exact clipboard, v1 preserved).');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
