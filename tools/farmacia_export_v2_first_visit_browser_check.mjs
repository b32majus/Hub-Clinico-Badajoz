#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INITIAL_CIP = 'CIP-DEMO-FH-001';
const SYNTHETIC_CIP = 'CIP-SYN-FIRST-BROWSER-01';

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (!existsSync(path.join(nodeModules, 'playwright', 'package.json'))) continue;
    return createRequire(path.join(nodeModules, '__fh_first_visit_v2_loader.cjs'))('playwright');
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_export_v2_first_visit_browser_check.mjs');
}
const { chromium } = loadPlaywrightFromNpx();

function availableChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  const candidates = readdirSync(cache).filter(entry => entry.startsWith('chromium_headless_shell-')).sort().reverse()
    .map(entry => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return candidates.find(existsSync) || bundled;
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'], ['.svg', 'image/svg+xml'], ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
]);
const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
  const relative = pathname === '/' ? 'farmacia_primera_visita.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(ROOT, relative);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { response.writeHead(403).end(); return; }
  try {
    if (!statSync(file).isFile()) throw new Error('not_file');
    response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const address = server.address();
const BASE_URL = `http://127.0.0.1:${address.port}/`;

const technicalContext = {
  eventId: 'evt-first-browser-01', sourceEventId: 'src-first-browser-01', firstVisitId: 'first-browser-01', patientId: 'patient-browser-01',
  occurredAt: '2026-08-03T11:00:00Z', recordedAt: '2026-08-03T11:02:00Z', demoFlag: true, eventStatus: 'completed',
  hospitalCode: 'H-SYN', professionalRef: 'prof-browser', identifierSystem: 'urn:synthetic',
  lineContext: {
    rowKey: 'visible-main', treatmentId: 'treatment-browser-01', lineId: 'line-browser-01', lineRole: 'principal',
    isPrimaryLine: true, lineStatusAtEvent: 'active', activeAtEvent: true
  }
};

async function answerDlqiWithZero(page) {
  for (let question = 1; question <= 10; question += 1) {
    if (question === 7) {
      await page.locator('input[name="dlqi_q7_a"][data-dlqi-q7-trigger]').check();
      await page.locator('input[name="dlqi_q7_b"][data-dlqi-val="0"]').first().check();
    } else {
      await page.locator(`input[name="dlqi_q${question}"][data-dlqi-val="0"]`).first().check();
    }
  }
}

const browser = await chromium.launch({ headless: true, executablePath: availableChromiumExecutable() });
const context = await browser.newContext();
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(new URL(`farmacia_primera_visita.html?cip=${INITIAL_CIP}`, BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaPrimeraVisita && window.FarmaciaExportV2FirstVisitAdapter && window.FarmaciaExportV2Core);

  for (const selector of ['#fhPvInduccionRealizada', '#fhPvEstratificacion', '#fhPvProms']) {
    assert.equal(await page.locator(selector).inputValue(), '', `${selector} starts without a yes/no/level default`);
    assert.equal((await page.locator(`${selector} option:checked`).textContent()).trim(), 'No informado');
  }
  assert.equal(await page.locator('input[type="date"]').count(), 1, 'there is one visible canonical date control');

  const noDateFailure = await page.evaluate(technical => {
    try { window.FarmaciaPrimeraVisita.buildFirstVisitV2Projection(technical); return null; }
    catch (error) { return { name: error.name, code: error.code, details: error.details }; }
  }, technicalContext);
  assert.equal(noDateFailure?.name, 'FarmaciaExportV2FirstVisitAdapterError');
  assert.equal(noDateFailure?.code, 'INVALID_FIRST_VISIT_INPUT');
  assert.ok(noDateFailure.details.some(error => error.field === 'visit.firstVisitDate'), 'missing date has typed adapter details');

  await page.locator('#fhPvCip').fill(SYNTHETIC_CIP);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#fhPvCipSearchBtn').click();
  await page.locator('#fhPvCipSearchNotice').waitFor({ state: 'visible' });
  for (const selector of ['#fhPvFarmaco', '#fhPvDosis', '#fhPvVia', '#fhPvPauta', '#fhPvFecha']) {
    assert.equal(await page.locator(selector).inputValue(), '', `${selector} is visibly empty after supported manual-patient switch`);
  }
  const staleSafeLine = await page.evaluate(technical => window.FarmaciaPrimeraVisita.buildFirstVisitVisibleLineV2(technical.lineContext), technicalContext);
  assert.equal(staleSafeLine.drugName, null, 'stale patient treatment does not fill v2 when visible treatment is empty');
  assert.equal(staleSafeLine.activeIngredient, null);

  await page.waitForFunction(() => window.FarmaciaCatalog && window.FarmaciaCatalog.loaded === true, null, { timeout: 15000 });
  const catalogCandidate = await page.evaluate(() => {
    const drug = window.FarmaciaCatalog.drugs.find(item => item.drug_id && item.principio_activo && item.nombre_presentacion && (item.display_name || item.nombre_comercial));
    if (!drug) return null;
    return { visibleName: drug.display_name || drug.nombre_comercial, presentation: drug.nombre_presentacion };
  });
  assert.ok(catalogCandidate, 'local synthetic/demo catalog exposes a selectable complete item');
  const beforeCatalog = {
    schedule: await page.locator('#fhPvPauta').inputValue(), induction: await page.locator('#fhPvInduccionRealizada').inputValue(),
    date: await page.locator('#fhPvFecha').inputValue(), stratification: await page.locator('#fhPvEstratificacion').inputValue()
  };
  await page.locator('#fhPvFarmaco').fill(catalogCandidate.visibleName);
  await page.locator('#fhPvAutocompleteDropdown .autocomplete-item').first().waitFor({ state: 'visible' });
  await page.locator('#fhPvAutocompleteDropdown .autocomplete-item').first().click();
  assert.deepEqual({
    schedule: await page.locator('#fhPvPauta').inputValue(), induction: await page.locator('#fhPvInduccionRealizada').inputValue(),
    date: await page.locator('#fhPvFecha').inputValue(), stratification: await page.locator('#fhPvEstratificacion').inputValue()
  }, beforeCatalog, 'catalog selection does not write schedule, induction, date or stratification');

  const catalogLine = await page.evaluate(technical => window.FarmaciaPrimeraVisita.buildFirstVisitVisibleLineV2(technical.lineContext), technicalContext);
  assert.ok(catalogLine.activeIngredient, 'exact snapshot contributes active ingredient');
  assert.ok(catalogLine.selectedDrugId, 'exact snapshot contributes selected drug ID');
  assert.ok(catalogLine.catalogSource, 'exact snapshot contributes catalog source');
  assert.equal(catalogLine.presentation, catalogCandidate.presentation, 'exact selected presentation maps only to presentation');
  assert.equal(catalogLine.doseText, null, 'exact presentation is not duplicated as doseText');
  assert.equal(catalogLine.scheduleCode, null, 'snapshot does not infer schedule');

  const manualDose = 'Dosis manual sintética no catalogada';
  await page.locator('#fhPvDosis').fill(manualDose);
  const manualDoseLine = await page.evaluate(technical => window.FarmaciaPrimeraVisita.buildFirstVisitVisibleLineV2(technical.lineContext), technicalContext);
  assert.equal(manualDoseLine.presentation, null);
  assert.equal(manualDoseLine.doseText, manualDose, 'manual combined literal maps only to doseText');
  assert.ok(manualDoseLine.selectedDrugId, 'exact visible-name snapshot may still contribute identity metadata');

  assert.equal(await page.evaluate(() => window.FarmaciaPrimeraVisita.buildFirstVisitPromsV2()), null, 'No informado PROM status yields null');
  await page.locator('#fhPvProms').selectOption({ label: 'Sí' });
  await page.locator('#fhPvPromsExpanded').waitFor({ state: 'visible' });
  await answerDlqiWithZero(page);
  const eva = page.locator('#fhPvEvaDolorRange');
  await eva.focus();
  await eva.press('Home');
  await eva.press('ArrowRight');
  assert.equal(await eva.inputValue(), '1');
  await eva.press('ArrowLeft');
  assert.equal(await eva.inputValue(), '0');
  const zeroProms = await page.evaluate(() => window.FarmaciaPrimeraVisita.buildFirstVisitPromsV2());
  const dlqi = zeroProms.find(prom => prom.instrument === 'DLQI');
  const evaDolor = zeroProms.find(prom => prom.instrument === 'EVA_DOLOR');
  assert.deepEqual({ value: dlqi.value, complete: dlqi.complete, answeredCount: dlqi.answeredCount, answers: dlqi.answers.length }, { value: 0, complete: true, answeredCount: 10, answers: 10 });
  assert.deepEqual(evaDolor, { instrument: 'EVA_DOLOR', value: 0, complete: true, answeredCount: 1, answers: null });
  assert.equal(zeroProms.some(prom => prom.instrument === 'EVA_PRURITO'), false, 'untouched EVA remains absent');

  const canonicalDate = '2026-08-03';
  await page.locator('#fhPvFecha').fill(canonicalDate);
  const domProjection = await page.evaluate(technical => window.FarmaciaPrimeraVisita.buildFirstVisitV2Projection(technical), technicalContext);
  assert.equal(domProjection.rows.length, 1);
  assert.equal(domProjection.rows[0].row_role, 'first_visit_line');
  assert.equal(domProjection.rows[0].is_primary_line, true);
  assert.equal(domProjection.rows[0].first_visit_date, canonicalDate);
  assert.equal(domProjection.rows[0].line_dose_text, manualDose);
  assert.equal(domProjection.rows[0].bridge_status, 'PENDIENTE');

  assert.equal(await page.getByRole('button', { name: /v2/i }).count(), 0, 'there is no public v2 button');
  assert.equal(await page.locator('a[download*="v2"], button[download*="v2"]').count(), 0, 'there is no public v2 download');
  await page.evaluate(() => {
    window.__firstVisitExcelCapture = null;
    window.FarmaciaExcelRowExport.copyTSVRowToClipboard = (row, options) => {
      window.__firstVisitExcelCapture = { row: [...row], options: { ...(options || {}) } };
      return Promise.resolve(true);
    };
  });
  await page.locator('#fhPvExcelExportBtn').click();
  const excelCapture = await page.evaluate(() => window.__firstVisitExcelCapture);
  assert.ok(excelCapture, 'visible v1 Excel action reaches only its output boundary');
  assert.equal(excelCapture.row.length, 61, 'v1 Excel output remains exactly 61 columns');

  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join('\n')}`);
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('\n')}`);
  console.log('PASS: First Visit Export v2 browser QA (14/14 criteria, Chromium, ephemeral server).');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
