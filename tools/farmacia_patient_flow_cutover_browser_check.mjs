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
const APP_PREFIX = String(process.env.FH_APP_PREFIX || '').replace(/^\/+|\/+$/g, '');

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
    requested_induction_status: 'yes',
    validation_result: 'validated',
    validation_pending_reason: null,
    validated_treatment_relation: 'modified_from_requested',
    validated_drug_name: 'Validado RAW A',
    validated_active_ingredient: 'Principio validado A',
    validated_dose_text: null,
    validated_route: 'SC',
    validated_induction_status: 'no',
    line_creation_status: 'not_created',
    analysis_date: '2026-08-03',
    analysis_recent_status: 'yes',
    hemogram_verified: true,
    biochemistry_verified: false,
    tb_status: 'negative',
    hbv_status: 'pending',
    hcv_status: 'negative',
    hiv_status: 'negative',
    vaccination_status: 'no',
    vaccination_observations: 'PREBIO-EXPLICITO-A',
    preventive_medicine_status: 'pending',
    prebiologic_overall_status: 'pending',
    validation_blockers_json: ['BLOQUEO RAW A'],
    recurrent_infections_status: 'yes',
    cardiovascular_risk_status: 'no',
    neurologic_disorder_status: 'not_recorded',
    neoplasia_history_or_risk_status: 'yes'
  });

  const firstVisit = fixture('first_visit_event_v2.json');
  firstVisit.event = identify(firstVisit.event, 'patient-raw-a', CIP_A, 'raw-a');
  firstVisit.event.proms_json = {
    measurements: [{ instrument: 'RAW_PROM_A', value: 0, date: '2026-08-04', answered: false }]
  };
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

  function followupA(suffix, date, adverseId, description, action, method) {
    const followup = fixture('followup_event_v2.json');
    followup.event = identify(followup.event, 'patient-raw-a', CIP_A, suffix);
    Object.assign(followup.event, {
      occurred_at: `${date}T10:00:00Z`,
      recorded_at: `${date}T10:40:00Z`,
      visit_id: `visit-${suffix}`,
      visit_date: date,
      proms_json: null,
      adverse_event_id: adverseId,
      adverse_event_status: 'present',
      adverse_event_description: description,
      adverse_event_severity: 'leve',
      adverse_event_resolution_status: 'not_recorded',
      adverse_event_action: action,
      adverse_event_suspects_json: [{ suspect_ref: 'line-raw-a', reported: true }],
      causality_assessments_json: [{ suspect_ref: 'line-raw-a', method, score: 0, assessed: false }]
    });
    followup.rowPayloads = [{
      ...followup.rowPayloads[0],
      rowKey: 'line-raw-a',
      treatment_id: 'treatment-raw-a',
      line_id: 'line-raw-a',
      line_role: 'primary',
      is_primary_line: true,
      line_status_at_event: 'active',
      active_at_event: true,
      line_drug_name: 'Activo RAW A',
      line_active_ingredient: 'Principio activo RAW A',
      line_dose_text: '',
      line_route: null,
      line_schedule_label: null,
      adherence_collection_status: 'yes',
      adherence_instrument: 'ESCALA EXPLÍCITA A',
      adherence_result: '0',
      adherence_answers_json: [{ question: 'q1', answer: false }]
    }];
    return followup;
  }

  const followupAOld = followupA('raw-a-old', '2026-08-05', 'ea-raw-a', 'EA ANTIGUO A', 'ACCIÓN ANTIGUA A', 'MÉTODO ANTIGUO A');
  const followupANew = followupA('raw-a-new', '2026-08-06', 'ea-raw-a', 'EA ACTUALIZADO A', 'ACCIÓN ACTUALIZADA A', 'MÉTODO ACTUALIZADO A');
  const followupAOther = followupA('raw-a-other', '2026-08-07', 'ea-raw-a-other', 'EA INDEPENDIENTE A', 'ACCIÓN INDEPENDIENTE A', 'MÉTODO INDEPENDIENTE A');

  const followupB = fixture('followup_event_v2.json');
  followupB.event = identify(followupB.event, 'patient-raw-b', CIP_B, 'raw-b');
  followupB.event.proms_json = {
    measurements: [{ instrument: 'RAW_PROM_MULTI', value: false, date: '2026-08-08', answered: false }]
  };
  followupB.event.adverse_event_status = 'not_recorded';
  followupB.event.adverse_event_id = null;
  followupB.event.adverse_event_suspects_json = null;
  followupB.event.causality_assessments_json = null;
  followupB.rowPayloads = followupB.rowPayloads.map((payload, index) => ({
    ...payload,
    rowKey: `line-raw-b-${index + 1}`,
    treatment_id: `treatment-raw-b-${index + 1}`,
    line_id: `line-raw-b-${index + 1}`,
    line_role: index === 0 ? 'primary' : 'unknown',
    is_primary_line: index === 0 ? true : null,
    line_status_at_event: index === 0 ? 'active' : 'unknown',
    active_at_event: index === 0 ? true : null,
    line_drug_name: index === 0 ? 'Activo RAW B1' : 'Línea RAW B2',
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
    ...core.projectEventRows(followupAOld.event, followupAOld.rowPayloads),
    ...core.projectEventRows(followupANew.event, followupANew.rowPayloads),
    ...core.projectEventRows(followupAOther.event, followupAOther.rowPayloads),
    ...core.projectEventRows(followupB.event, followupB.rowPayloads)
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
const appUrl = file => new URL(`${APP_PREFIX ? `${APP_PREFIX}/` : ''}${file}`, BASE).href;

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

  await page.goto(appUrl('farmacia_index.html'), { waitUntil: 'domcontentloaded' });
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
  assert.match(dashboardSummary, /RAW_PROM_A: 0 · 2026-08-04/);
  assert.match(dashboardSummary, /Última adherencia\s*0/i);
  assert.equal((await page.locator('#patientName').textContent()).trim(), 'Paciente actual');
  const prebiologicDashboard = await page.locator('.fh-dashboard-checks-wrapper').innerText();
  assert.match(prebiologicDashboard, /PREBIO-EXPLICITO-A/);
  assert.match(prebiologicDashboard, /Infecciones recurrentes: Sí/);
  assert.match(prebiologicDashboard, /Riesgo cardiovascular: No/);
  assert.match(prebiologicDashboard, /Alteraciones neurológicas: No registrado/);
  assert.match(prebiologicDashboard, /Neoplasia: Sí/);
  assert.match(prebiologicDashboard, /Medicina Preventiva: Pendiente/);
  assert.match(prebiologicDashboard, /Estado prebiológico: Pendiente/);
  assert.match(prebiologicDashboard, /BLOQUEO RAW A/);
  assert.doesNotMatch(prebiologicDashboard, /Demo/);
  assert.match(await page.locator('#promsDashboardContainer').innerText(), /RAW_PROM_A[\s\S]*0[\s\S]*2026-08-04/);
  const adverseDashboard = await page.locator('#adverseEventsContainer').innerText();
  assert.equal(await page.locator('#adverseEventsContainer .adverse-event-card').count(), 2);
  assert.match(adverseDashboard, /EA ACTUALIZADO A — 2026-08-06/);
  assert.match(adverseDashboard, /ACCIÓN ACTUALIZADA A/);
  assert.match(adverseDashboard, /MÉTODO ACTUALIZADO A/);
  assert.match(adverseDashboard, /EA INDEPENDIENTE A — 2026-08-07/);
  assert.match(adverseDashboard, /MÉTODO INDEPENDIENTE A/);
  assert.doesNotMatch(adverseDashboard, /EA ANTIGUO A|ACCIÓN ANTIGUA A|MÉTODO ANTIGUO A/);
  assert.match(adverseDashboard, /score: 0/);
  assert.doesNotMatch(await page.locator('body').innerText(), /farmacia_raw/);
  await assertNoRetiredUi();

  const longitudinalHref = await page.locator('#longitudinalStandaloneLink').getAttribute('href');
  assert(longitudinalHref && longitudinalHref.includes('generation='));
  await page.goto(new URL(longitudinalHref, page.url()).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(cip => document.querySelector('#longitudinalPatientSelect')?.value === cip, CIP_A);
  const longitudinalSummary = await page.locator('#longitudinalPatientSummary').innerText();
  assert.match(longitudinalSummary, new RegExp(CIP_A));
  assert.match(longitudinalSummary, /Paciente actual cargado desde Excel Farmacia/);
  assert.match(longitudinalSummary, /Adherencia\s*0/i);
  assert.match(longitudinalSummary, /MÉTODO ACTUALIZADO A/);
  assert.match(await page.locator('#longitudinalPromChart').innerText(), /RAW_PROM_A[\s\S]*0/);
  await assertNoRetiredUi();

  await clickLink('Dashboard Paciente');
  await clickLink('Validación');
  await page.waitForSelector('#fhDermaFarmaco');
  assert.equal(await page.locator('#fhDermaFarmaco').inputValue(), 'Solicitado RAW A');
  assert.equal(await page.locator('#fhValidadoFarmaco').inputValue(), 'Validado RAW A');
  assert.equal(await page.locator('#fhDermaInduccion').inputValue(), 'si');
  assert.equal(await page.locator('#fhValidadoInduccion').inputValue(), 'no');
  assert.equal(await page.locator('#fhDermaComorbInfeccionesRecurrentes').inputValue(), 'si');
  assert.equal(await page.locator('#fhDermaComorbRiesgoCardiovascular').inputValue(), 'no');
  assert.equal(await page.locator('#fhDermaComorbAlteracionesNeurologicas').inputValue(), '');
  assert.equal(await page.locator('#fhDermaComorbRiesgoNeoplasia').inputValue(), 'si');
  assert.match(await page.locator('#pbChipMedPreventiva').innerText(), /Pendiente/);
  await page.waitForFunction(() => window.FarmaciaCatalog?.loaded && !document.querySelector('#fhDermaFarmaco')?.disabled);
  await page.locator('#fhDermaFarmaco').fill('adalimumab');
  await page.locator('#autocompleteDropdown .autocomplete-item').first().waitFor();
  await page.locator('#autocompleteDropdown .autocomplete-item').first().click();
  assert.notEqual(await page.locator('#fhDermaFarmaco').inputValue(), '');
  await page.locator('#fhDermaDosis').fill('25 mg edición profesional');
  assert.equal(await page.locator('#fhDermaDosis').inputValue(), '25 mg edición profesional');
  let validationContinueDialog = null;
  page.once('dialog', async dialog => {
    validationContinueDialog = dialog.message();
    await dialog.accept();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.match(validationContinueDialog || '', /continuar|empezar de cero/i);
  assert.equal(await page.locator('#fhDermaDosis').inputValue(), '25 mg edición profesional', 'continue restores the validation draft');
  const validationDraftState = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), SESSION_KEY);
  assert.equal(validationDraftState.dirty, true);
  assert.equal(validationDraftState.drafts.validacion.controls.fhDermaDosis.value, '25 mg edición profesional');
  for (const selector of ['#fhValExportTxt', '#fhValExportCsv', '#fhValExcelExportBtn', '#fhValExportV2Btn']) {
    assert.equal(await page.locator(selector).count(), 1, `${selector} remains available`);
  }
  await assertNoRetiredUi();

  await clickLink('Primera Visita');
  assert.equal(await page.locator('#fhPvCip').inputValue(), CIP_A);
  assert.equal(await page.locator('#fhPvFarmaco').inputValue(), 'Validado RAW A');
  const firstVisitTreatment = await page.locator('#fhPvTratamientoGrid').innerText();
  assert.match(firstVisitTreatment, /Inducción solicitada\s*Sí/i);
  assert.match(firstVisitTreatment, /Inducción validada\s*No/i);
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
  let discardDialog = null;
  page.once('dialog', async dialog => {
    discardDialog = dialog.message();
    await dialog.dismiss();
  });
  await page.locator('#fhSearchBtn').click();
  await page.waitForFunction(() => document.querySelector('#fhSearchStatus')?.textContent.includes('cancelado'));
  assert.match(discardDialog || '', /cambios no exportados[\s\S]*descartarlos/i);
  const cancelledState = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), SESSION_KEY);
  assert.equal(cancelledState.identifier.identifier_value, CIP_A);
  assert.equal(cancelledState.drafts.validacion.controls.fhDermaDosis.value, '25 mg edición profesional');
  assert.equal(await page.locator('#fhQuickViewOverlay:not(.hidden)').count(), 0, 'B is not rendered after cancelling the switch');

  page.once('dialog', async dialog => dialog.accept());
  await page.locator('#fhSearchBtn').click();
  await page.locator('#fhQuickViewOverlay:not(.hidden)').waitFor();
  const domAfterSwitch = await page.locator('body').innerText();
  const storageAfterSwitch = await page.evaluate(() => Object.keys(sessionStorage).map(key => sessionStorage.getItem(key)).join('\n'));
  const patientAfterSwitch = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)).patient_projection.patient, SESSION_KEY);
  assert.equal(domAfterSwitch.includes(CIP_A), false, 'patient A is absent from the DOM after selecting B');
  assert.equal(storageAfterSwitch.includes(CIP_A), false, 'patient A is absent from sessionStorage after selecting B');
  assert.equal(patientAfterSwitch.observaciones_prebiologico, 'NURSE-EXPLICIT-B', 'B keeps its explicit nursing fields');
  assert.deepEqual(patientAfterSwitch.eventos_adversos, [], 'not_recorded does not materialize an adverse event');
  const cleanBState = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), SESSION_KEY);
  assert.equal(cleanBState.dirty, false);
  assert.deepEqual(cleanBState.drafts, {});
  await assertNoRetiredUi();

  await clickQuickViewLink('Dashboard');
  await page.waitForSelector('#patientIdBadge');
  assert.equal((await page.locator('#patientIdBadge').textContent()).trim(), CIP_B);
  const activeLineCard = page.locator('#biologicLinesContainer .info-field').filter({ hasText: 'Activo RAW B1' });
  const unknownLineCard = page.locator('#biologicLinesContainer .info-field').filter({ hasText: 'Línea RAW B2' });
  assert.match(await activeLineCard.innerText(), /Activo · Principal/i);
  assert.match(await unknownLineCard.innerText(), /No registrado · Relación no registrada/i);
  const multiPromCard = page.locator('#promsDashboardContainer .prom-card').filter({ hasText: 'RAW_PROM_MULTI' });
  assert.equal(await multiPromCard.count(), 1, 'the PROM repeated across event rows is rendered once');
  assert.match(await multiPromCard.innerText(), /RAW_PROM_MULTI[\s\S]*false[\s\S]*2026-08-08/);

  const longitudinalBHref = await page.locator('#longitudinalStandaloneLink').getAttribute('href');
  assert(longitudinalBHref && longitudinalBHref.includes('generation='));
  await page.goto(new URL(longitudinalBHref, page.url()).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(cip => document.querySelector('#longitudinalPatientSelect')?.value === cip, CIP_B);
  const activeLongitudinalLine = page.locator('#longitudinalTreatmentTimeline .info-field').filter({ hasText: 'Activo RAW B1' });
  const unknownLongitudinalLine = page.locator('#longitudinalTreatmentTimeline .info-field').filter({ hasText: 'Línea RAW B2' });
  assert.match(await activeLongitudinalLine.innerText(), /Fecha no registrada · Activo · Principal/);
  assert.match(await unknownLongitudinalLine.innerText(), /Fecha no registrada · No registrado · Relación no registrada/);
  await assertNoRetiredUi();

  await clickLink('Dashboard Paciente');
  await clickLink('Seguimiento');
  assert.equal(await page.locator('#fhSegCip').inputValue(), CIP_B);
  assert.equal(await page.locator('#fhSegLineCards input').count(), 2);
  assert.equal(await page.locator('#fhSegLineCards input:checked').count(), 1, 'the single explicitly active line is autoselected');
  assert.equal(await page.locator('#fhSegLineaPrincipal').inputValue(), 'line-raw-b-1');
  assert.match(await page.locator('#fhSegLineCards [data-line-id="line-raw-b-1"]').innerText(), /Principal · Activo/);
  assert.match(await page.locator('#fhSegLineCards [data-line-id="line-raw-b-2"]').innerText(), /Relación no registrada · No registrado/);
  assert.equal(await page.locator('#fhSegLineCards [data-line-id="line-raw-b-2"] input').isDisabled(), true);
  await page.locator('#fhSegProms').selectOption({ label: 'Sí, recoger DLQI + EVA dolor/prurito' });
  assert.equal(await page.locator('#fhSegPromsExpanded').isVisible(), true);
  await page.locator('#fhSegDlqiQ1V3').check();
  assert.equal((await page.locator('#fhSegDlqiTotal').textContent()).trim(), '3');
  const followupPromModel = await page.evaluate(() => window.FarmaciaSeguimiento.buildFollowupVisitExportModel().common_visit);
  assert.equal(followupPromModel.proms_selection, 'Sí, recoger DLQI + EVA dolor/prurito');
  assert.equal(followupPromModel.dlqi, '3');

  let continueDialog = null;
  page.once('dialog', async dialog => {
    continueDialog = dialog.message();
    await dialog.accept();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.match(continueDialog || '', /continuar|empezar de cero/i);
  assert.equal(await page.locator('#fhSegCip').inputValue(), CIP_B);
  assert.equal(await page.locator('#fhSegProms').inputValue(), 'Sí, recoger DLQI + EVA dolor/prurito');
  assert.equal(await page.locator('#fhSegPromsExpanded').isVisible(), true);
  assert.equal(await page.locator('#fhSegDlqiQ1V3').isChecked(), true);
  assert.equal((await page.locator('#fhSegDlqiTotal').textContent()).trim(), '3');
  const restoredPromModel = await page.evaluate(() => window.FarmaciaSeguimiento.buildFollowupVisitExportModel().common_visit);
  assert.equal(restoredPromModel.dlqi, '3', 'the restored visible PROM answer remains exportable');

  let restartDialog = null;
  page.once('dialog', async dialog => {
    restartDialog = dialog.message();
    await dialog.dismiss();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.match(restartDialog || '', /continuar|empezar de cero/i);
  assert.equal(await page.locator('#fhSegCip').inputValue(), '');
  assert.equal(await page.locator('#fhSegProms').inputValue(), 'No recogido');
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), SESSION_KEY), null);

  assert.deepEqual(consoleErrors, [], `console.error: ${consoleErrors.join(' | ')}`);
  assert.deepEqual(pageErrors, [], `pageerror: ${pageErrors.join(' | ')}`);
  console.log('farmacia_patient_flow_cutover_browser_check: PASS');
  console.log('QA console.error=0 pageerror=0; raw prebiologic/PROM/adverse chronology/line status/drafts/reload verified');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
