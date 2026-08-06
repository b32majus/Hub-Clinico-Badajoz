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
const CIP_A = 'CIP-RAW-A';
const CIP_B = 'CIP-RAW-B';
const SESSION_KEY = 'promueve.fh.currentPatientSession.v1';

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_patient_flow_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_patient_flow_cutover_browser_check.mjs');
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

function identify(event, patientId, cip, suffix) {
  return {
    ...event,
    event_id: `${event.event_id}-${suffix}`,
    source_event_id: `${event.source_event_id}-${suffix}`,
    patient_id: patientId,
    identifier_system: 'urn:cip:synthetic',
    identifier_value: cip,
    service_code: 'DERM',
    service_label: 'Dermatología',
    pathology_code: 'HS',
    pathology_label: 'Hidradenitis supurativa'
  };
}

function rawWorkbookBuffer() {
  const validation = fixture('validation_event_v2.json');
  validation.event = identify(validation.event, 'patient-raw-a', CIP_A, 'raw-a');
  Object.assign(validation.event, {
    request_date: '2026-08-01',
    requested_drug_name: 'Solicitado RAW A',
    requested_active_ingredient: 'Principio solicitado A',
    requested_dose_text: '10 mg solicitados',
    requested_route: 'SC',
    requested_induction_status: null,
    validation_result: 'validated',
    validation_pending_reason: null,
    validated_treatment_relation: 'modified_from_requested',
    validated_drug_name: 'Validado RAW A',
    validated_active_ingredient: 'Principio validado A',
    validated_dose_text: null,
    validated_route: 'SC',
    validated_induction_status: null,
    line_creation_status: 'not_created'
  });

  const firstVisit = fixture('first_visit_event_v2.json');
  firstVisit.event = identify(firstVisit.event, 'patient-raw-a', CIP_A, 'raw-a');
  firstVisit.rowPayloads[0] = {
    ...firstVisit.rowPayloads[0],
    rowKey: 'line-raw-a',
    treatment_id: 'treatment-raw-a',
    line_id: 'line-raw-a',
    line_drug_name: 'Activo RAW A',
    line_active_ingredient: 'Principio activo RAW A',
    line_dose_text: '',
    line_route: null,
    line_schedule_label: null,
    line_schedule_other_text: null
  };

  const followup = fixture('followup_event_v2.json');
  followup.event = identify(followup.event, 'patient-raw-b', CIP_B, 'raw-b');
  followup.event.adverse_event_status = 'not_recorded';
  followup.event.adverse_event_id = null;
  followup.event.adverse_event_suspects_json = null;
  followup.event.causality_assessments_json = null;
  followup.rowPayloads = followup.rowPayloads.map((payload, index) => ({
    ...payload,
    rowKey: `line-raw-b-${index + 1}`,
    treatment_id: `treatment-raw-b-${index + 1}`,
    line_id: `line-raw-b-${index + 1}`,
    line_drug_name: `Activo RAW B${index + 1}`,
    line_active_ingredient: `Principio activo RAW B${index + 1}`,
    line_dose_text: null,
    line_route: null,
    line_schedule_label: null,
    line_schedule_other_text: null,
    therapeutic_movement_type: 'not_recorded',
    new_schedule_code: null,
    new_schedule_label: null,
    movement_reason: null,
    movement_effective_date: null
  }));

  const rows = [
    ...core.projectEventRows(validation.event, validation.rowPayloads),
    ...core.projectEventRows(firstVisit.event, firstVisit.rowPayloads),
    ...core.projectEventRows(followup.event, followup.rowPayloads)
  ];
  const toCells = row => core.serializeRowToTsv(row).split('\t');
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([core.ROW_COLUMNS, ...rows.map(toCells)]), '01_DERMA');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([core.ROW_COLUMNS]), '03_DIGESTIVO');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function nursingWorkbookBuffer() {
  const workbook = XLSX.utils.book_new();
  const rows = [
    ['CIP', 'PACIENTE', 'SERVICIO', 'PATOLOGÍA', 'FÁRMACO', 'ANALÍTICA', 'MANTOUX', 'VHB', 'VHC', 'VIH', 'MED. PREVENTIVA', 'ESTADO', 'OBSERVACIÓN PREBIOLÓGICO'],
    [CIP_A, 'Paciente sintético A', 'Dermatología', 'Hidradenitis supurativa', 'Solicitud Enfermería A', 'OK', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'COMPLETO', 'OK FARMACIA', 'NURSE-EXPLICIT-A'],
    [CIP_B, 'Paciente sintético B', 'Dermatología', 'Hidradenitis supurativa', 'Solicitud Enfermería B', 'OK', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'COMPLETO', 'OK FARMACIA', 'NURSE-EXPLICIT-B']
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'INICIO_BIOLOGICO');
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
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', error => pageErrors.push(error.message));

async function assertNoRetiredUi() {
  const bodyText = await page.locator('body').innerText();
  assert.doesNotMatch(bodyText, /Bridge v2 activo|Buscar en Bridge|Dashboard Bridge v2|Abrir dashboard Bridge|modo Bridge/i);
  assert.equal(await page.locator('[id*="Bridge"], [id*="bridge"]').count(), 0);
}

async function upload(selector, name, buffer) {
  await page.locator(selector).setInputFiles({
    name,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(buffer)
  });
}

async function clickLink(name) {
  const link = page.getByRole('link', { name, exact: false }).first();
  await Promise.all([page.waitForLoadState('domcontentloaded'), link.click()]);
}

async function clickQuickViewLink(name) {
  const link = page.locator('#fhQvActions').getByRole('link', { name, exact: false });
  await Promise.all([page.waitForLoadState('domcontentloaded'), link.click()]);
}

try {
  const rawBuffer = rawWorkbookBuffer();
  const nurseBuffer = nursingWorkbookBuffer();

  await page.goto(new URL('farmacia_index.html', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaDataImports && window.FarmaciaPatientFlowRuntime);
  await upload('#inputExcelFarmacia', 'farmacia-raw-sintetico.xlsx', rawBuffer);
  await page.waitForFunction(() => document.querySelector('#estadoCargaFarmacia')?.textContent.includes('Excel Farmacia cargado'));
  assert.equal(await page.locator('#fhLegacySearchPanel').count(), 1, 'the normal CIP search is the only main search');
  assert.equal(await page.locator('#fhCipInput').isEnabled(), true);
  await assertNoRetiredUi();

  await page.locator('#fhCipInput').fill(CIP_A);
  await page.locator('#fhSearchBtn').click();
  await page.locator('#fhQuickViewOverlay:not(.hidden)').waitFor();
  assert.match(await page.locator('#fhQvGrid').innerText(), /Solicitado RAW A/);
  assert.match(await page.locator('#fhQvGrid').innerText(), /Validado RAW A/);
  assert.match(await page.locator('#fhQvGrid').innerText(), /Activo RAW A/);
  assert.doesNotMatch(await page.locator('#fhQvGrid').innerText(), /10 mg solicitados.*Tratamiento actual/s);
  await assertNoRetiredUi();

  await clickQuickViewLink('Dashboard');
  await page.waitForSelector('#patientIdBadge');
  assert.equal((await page.locator('#patientIdBadge').textContent()).trim(), CIP_A);
  const dashboardSummary = await page.locator('#dashboardSummaryGrid').innerText();
  assert.match(dashboardSummary, /Solicitado RAW A/);
  assert.match(dashboardSummary, /Validado RAW A/);
  assert.match(dashboardSummary, /Activo RAW A/);
  await assertNoRetiredUi();

  const longitudinalHref = await page.locator('#longitudinalStandaloneLink').getAttribute('href');
  assert(longitudinalHref && longitudinalHref.includes('generation='));
  await page.goto(new URL(longitudinalHref, BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(cip => document.querySelector('#longitudinalPatientSelect')?.value === cip, CIP_A);
  assert.match(await page.locator('#longitudinalPatientSummary').innerText(), new RegExp(CIP_A));
  await assertNoRetiredUi();

  await clickLink('Dashboard Paciente');
  await clickLink('Validación');
  await page.waitForSelector('#fhDermaFarmaco');
  assert.equal(await page.locator('#fhDermaFarmaco').inputValue(), 'Solicitado RAW A');
  assert.equal(await page.locator('#fhValidadoFarmaco').inputValue(), 'Validado RAW A');
  assert.equal(await page.locator('#fhDermaInduccion').inputValue(), '');
  assert.equal(await page.locator('#fhValidadoInduccion').inputValue(), '');
  await page.waitForFunction(() => window.FarmaciaCatalog?.loaded && !document.querySelector('#fhDermaFarmaco')?.disabled);
  await page.locator('#fhDermaFarmaco').fill('adalimumab');
  await page.locator('#autocompleteDropdown .autocomplete-item').first().waitFor();
  await page.locator('#autocompleteDropdown .autocomplete-item').first().click();
  assert.notEqual(await page.locator('#fhDermaFarmaco').inputValue(), '');
  await page.locator('#fhDermaDosis').fill('25 mg edición profesional');
  assert.equal(await page.locator('#fhDermaDosis').inputValue(), '25 mg edición profesional');
  for (const selector of ['#fhValExportTxt', '#fhValExportCsv', '#fhValExcelExportBtn', '#fhValExportV2Btn']) {
    assert.equal(await page.locator(selector).count(), 1, `${selector} remains available`);
  }
  await assertNoRetiredUi();

  await clickLink('Primera Visita');
  assert.equal(await page.locator('#fhPvCip').inputValue(), CIP_A);
  assert.equal(await page.locator('#fhPvFarmaco').inputValue(), 'Validado RAW A');
  assert.equal(await page.locator('#fhPvInduccionRealizada').inputValue(), 'No');
  await page.locator('#fhPvFarmaco').fill('Edición profesional primera visita');
  assert.equal(await page.locator('#fhPvFarmaco').inputValue(), 'Edición profesional primera visita');
  await assertNoRetiredUi();

  await clickLink('Seguimiento');
  assert.equal(await page.locator('#fhSegCip').inputValue(), CIP_A);
  assert.equal(await page.locator('#fhSegLineCards input:checked').count(), 1);
  assert.equal(await page.locator('#fhSegLineaPrincipal').inputValue(), 'line-raw-a');
  assert.equal(await page.locator('#fhSegDosisActual').inputValue(), '');
  assert.equal(await page.locator('#fhSegVia').inputValue(), '');
  await assertNoRetiredUi();

  await clickLink('Inicio Farmacia');
  await page.locator('#fhQuickViewOverlay:not(.hidden)').waitFor();
  await page.locator('button[data-fh-qv-close]').click();
  await upload('#inputExcelEnfermeria', 'enfermeria-sintetica-a.xlsx', nurseBuffer);
  await page.waitForFunction(() => window.FarmaciaDataImports?.getState('enfermeria')?.rows?.length === 2);
  assert.match(await page.locator('#estadoCargaEnfermeria').textContent(), /Excel Enfermería cargado/);
  const enriched = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)).patient_projection.patient, SESSION_KEY);
  assert.equal(enriched.cip, CIP_A);
  assert.equal(enriched.observaciones_prebiologico, 'NURSE-EXPLICIT-A');
  assert.equal(enriched.farmaco_solicitado, 'Solicitado RAW A', 'raw explicit value keeps precedence over nursing');

  await upload('#inputExcelFarmacia', 'farmacia-raw-sintetico.xlsx', rawBuffer);
  await page.waitForFunction(() => window.FarmaciaPatientFlowRuntime?.getDataPort());
  await page.locator('#fhCipInput').fill(CIP_B);
  await page.locator('#fhSearchBtn').click();
  await page.locator('#fhQuickViewOverlay:not(.hidden)').waitFor();
  const domAfterSwitch = await page.locator('body').innerText();
  const storageAfterSwitch = await page.evaluate(() => Object.keys(sessionStorage).map(key => sessionStorage.getItem(key)).join('\n'));
  const patientAfterSwitch = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)).patient_projection.patient, SESSION_KEY);
  assert.equal(domAfterSwitch.includes(CIP_A), false, 'patient A is absent from the DOM after selecting B');
  assert.equal(storageAfterSwitch.includes(CIP_A), false, 'patient A is absent from sessionStorage after selecting B');
  assert.equal(patientAfterSwitch.observaciones_prebiologico, 'NURSE-EXPLICIT-B', 'B keeps its explicit nursing fields');
  assert.deepEqual(patientAfterSwitch.eventos_adversos, [], 'not_recorded does not materialize an adverse event');
  await assertNoRetiredUi();

  await clickQuickViewLink('Seguimiento');
  assert.equal(await page.locator('#fhSegCip').inputValue(), CIP_B);
  assert.equal(await page.locator('#fhSegLineCards input').count(), 2);
  assert.equal(await page.locator('#fhSegLineCards input:checked').count(), 0, 'two active lines are not autoselected');
  assert.equal(await page.locator('#fhSegLineaPrincipal').inputValue(), '');

  let continueDialog = null;
  page.once('dialog', async dialog => {
    continueDialog = dialog.message();
    await dialog.accept();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.match(continueDialog || '', /continuar|empezar de cero/i);
  assert.equal(await page.locator('#fhSegCip').inputValue(), CIP_B);

  let restartDialog = null;
  page.once('dialog', async dialog => {
    restartDialog = dialog.message();
    await dialog.dismiss();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.match(restartDialog || '', /continuar|empezar de cero/i);
  assert.equal(await page.locator('#fhSegCip').inputValue(), '');
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), SESSION_KEY), null);

  assert.deepEqual(consoleErrors, [], `console.error: ${consoleErrors.join(' | ')}`);
  assert.deepEqual(pageErrors, [], `pageerror: ${pageErrors.join(' | ')}`);
  console.log('farmacia_patient_flow_cutover_browser_check: PASS');
  console.log('QA console.error=0 pageerror=0; raw load/search/Quick View/pages/CIMA/edit/nursing/one-line/two-line/A-to-B/reload verified');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
