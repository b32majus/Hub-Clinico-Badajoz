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
const CIP_A = 'CIP-LONGITUDINAL-A';
const CIP_B = 'CIP-LONGITUDINAL-B';
const APP_PREFIX = String(process.env.FH_APP_PREFIX || '').replace(/^\/+|\/+$/g, '');

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_longitudinal_raw_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_longitudinal_raw_browser_check.mjs');
}
const { chromium } = loadPlaywrightFromNpx();

function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  const candidates = readdirSync(cache).filter(entry => entry.startsWith('chromium_headless_shell-')).sort().reverse()
    .map(entry => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return candidates.find(existsSync) || bundled;
}

function fixture(name) {
  return JSON.parse(readFileSync(path.join(ROOT, 'data/demo/farmacia/export_v2', name), 'utf8'));
}
function identity(event, patientId, cip, suffix, date) {
  return {
    ...event,
    event_id: `event-${suffix}`,
    source_event_id: `source-${suffix}`,
    patient_id: patientId,
    identifier_system: 'urn:cip:synthetic',
    identifier_value: cip,
    service_code: 'DERM',
    service_label: 'Dermatología sintética',
    pathology_code: 'HS',
    pathology_label: 'Patología sintética',
    occurred_at: `${date}T10:00:00Z`,
    recorded_at: `${date}T10:30:00Z`
  };
}
function line(rowKey, active, status, drug) {
  return {
    rowKey,
    treatment_id: `treatment-${rowKey}`,
    line_id: rowKey,
    line_role: rowKey === 'line-a' ? 'primary' : 'additional',
    is_primary_line: rowKey === 'line-a',
    line_status_at_event: status,
    active_at_event: active,
    line_drug_name: drug,
    line_active_ingredient: `Principio ${drug}`,
    line_presentation: 'Presentación explícita',
    line_dose_text: '10 mg',
    line_route: 'SC',
    line_schedule_label: 'Cada 14 días'
  };
}

function workbookBuffer() {
  const validation = fixture('validation_event_v2.json');
  validation.event = identity(validation.event, 'patient-long-a', CIP_A, 'validation-a', '2026-01-01');
  Object.assign(validation.event, {
    request_id: 'request-a', validation_id: 'validation-a', request_date: '2026-01-01',
    requested_drug_name: 'Solicitud longitudinal sintética', validation_result: 'validated',
    validation_pending_reason: null, validated_treatment_relation: 'no_treatment_validated',
    line_creation_status: 'not_created'
  });

  const first = fixture('first_visit_event_v2.json');
  first.event = identity(first.event, 'patient-long-a', CIP_A, 'first-a', '2026-01-10');
  Object.assign(first.event, {
    first_visit_id: 'first-a', first_visit_date: '2026-01-10',
    clinical_observations_json: { DAS28: 9, HAQ: 3 },
    proms_json: { measurements: [{ instrument: 'DLQI', value: 8, date: '2026-01-10' }] }
  });
  first.rowPayloads = [
    line('line-a', true, 'active', 'Tratamiento A'),
    line('line-b', null, 'active', 'Tratamiento B')
  ];

  const followOne = fixture('followup_event_v2.json');
  followOne.event = identity(followOne.event, 'patient-long-a', CIP_A, 'follow-a-1', '2026-02-10');
  Object.assign(followOne.event, {
    visit_id: 'follow-a-1', visit_date: '2026-02-10',
    proms_json: { measurements: [
      { instrument: 'DLQI', value: 0, date: '2026-02-10' },
      { instrument: 'PROM booleano', value: false, date: '2026-02-10' }
    ] },
    adverse_event_id: 'ea-long-a', adverse_event_status: 'present',
    adverse_event_description: 'EA inicial sintético', adverse_event_severity: null,
    adverse_event_resolution_status: 'open', adverse_event_action: 'Observación inicial',
    adverse_event_suspects_json: [{ suspect_ref: 'line-a' }],
    causality_assessments_json: [{ adverse_event_id: 'ea-long-a', suspect_ref: 'line-a', method: 'Causalidad explícita inicial', assessed: false, score: 0 }]
  });
  followOne.rowPayloads = [
    {
      ...line('line-a', true, 'active', 'Tratamiento A'), therapeutic_movement_type: 'no_change_recorded',
      adherence_collection_status: 'yes', adherence_instrument: 'Escala sintética', adherence_result: 'Adherencia histórica A1'
    },
    {
      ...line('line-b', false, 'historical', 'Tratamiento B'), therapeutic_movement_type: 'schedule_change',
      new_schedule_label: 'Cada 21 días', movement_reason: 'Cambio de pauta explícito', movement_effective_date: '2026-02-12'
    }
  ];

  const followTwo = fixture('followup_event_v2.json');
  followTwo.event = identity(followTwo.event, 'patient-long-a', CIP_A, 'follow-a-2', '2026-03-10');
  Object.assign(followTwo.event, {
    visit_id: 'follow-a-2', visit_date: '2026-03-10',
    proms_json: { measurements: [{ instrument: 'PROM sin fecha' }] },
    adverse_event_id: 'ea-long-a', adverse_event_status: 'present',
    adverse_event_description: 'EA actualizado sintético', adverse_event_severity: null,
    adverse_event_resolution_status: 'monitoring', adverse_event_action: 'Seguimiento actualizado',
    adverse_event_suspects_json: [{ suspect_ref: 'line-a' }],
    causality_assessments_json: [{ adverse_event_id: 'ea-long-a', suspect_ref: 'line-a', method: 'Causalidad explícita actualizada', assessed: true }]
  });
  followTwo.rowPayloads = [{
    ...line('line-a', null, 'active', 'Tratamiento A'), therapeutic_movement_type: 'dose_change',
    new_dose_text: '20 mg', movement_reason: 'Cambio de dosis explícito', movement_effective_date: null,
    adherence_collection_status: 'yes', adherence_instrument: 'Escala sintética', adherence_result: 'Adherencia histórica A2'
  }];

  const followThree = fixture('followup_event_v2.json');
  followThree.event = identity(followThree.event, 'patient-long-a', CIP_A, 'follow-a-3', '2026-04-10');
  Object.assign(followThree.event, {
    visit_id: 'follow-a-3', visit_date: '2026-04-10', proms_json: null,
    adverse_event_id: null, adverse_event_status: 'not_recorded', adverse_event_description: null,
    adverse_event_severity: null, adverse_event_resolution_status: null, adverse_event_action: null,
    adverse_event_suspects_json: null, causality_assessments_json: null
  });
  followThree.rowPayloads = [{
    ...line('line-a', false, 'suspended', 'Tratamiento A'), therapeutic_movement_type: 'suspension',
    suspension_status: 'yes', suspension_reason: 'Suspensión explícita por decisión sintética',
    suspension_effective_date: '2026-04-11', adherence_collection_status: 'not_recorded'
  }];

  const followB = fixture('followup_event_v2.json');
  followB.event = identity(followB.event, 'patient-long-b', CIP_B, 'follow-b-1', '2026-05-10');
  Object.assign(followB.event, {
    visit_id: 'follow-b-1', visit_date: '2026-05-10',
    proms_json: { measurements: [{ instrument: 'PROM exclusivo B', value: 77, date: '2026-05-10' }] },
    adverse_event_id: null, adverse_event_status: 'not_recorded', adverse_event_suspects_json: null,
    causality_assessments_json: null
  });
  followB.rowPayloads = [{ ...line('line-b-only', true, 'active', 'Tratamiento exclusivo B'), therapeutic_movement_type: 'not_recorded' }];

  const sources = [validation, first, followOne, followTwo, followThree, followB];
  const rows = sources.flatMap(source => core.projectEventRows(source.event, source.rowPayloads));
  const workbook = XLSX.utils.book_new();
  const toCells = row => core.serializeRowToTsv(row).split('\t');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([core.ROW_COLUMNS, ...rows.map(toCells)]), '01_DERMA');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([core.ROW_COLUMNS]), '03_DIGESTIVO');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'], ['.svg', 'image/svg+xml']
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
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`${page.url()}: ${message.text()}`); });
page.on('pageerror', error => pageErrors.push(`${page.url()}: ${error.message}`));
const workbook = workbookBuffer();

async function upload() {
  await page.locator('#inputExcelFarmacia').setInputFiles({
    name: 'longitudinal-raw-sintetico.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(workbook)
  });
  await page.waitForFunction(() => document.querySelector('#estadoCargaFarmacia')?.textContent.includes('Excel Farmacia cargado'));
}
async function closeQuickView() {
  if (await page.locator('#fhQuickViewOverlay:not(.hidden)').count()) await page.locator('button[data-fh-qv-close]').click();
}
async function search(cip) {
  await closeQuickView();
  await page.locator('#fhCipInput').fill(cip);
  await page.locator('#fhSearchBtn').click();
  await page.waitForFunction(expected => document.querySelector('#fhSubtitle')?.textContent === expected
    && !document.querySelector('#fhQuickViewOverlay')?.classList.contains('hidden'), cip);
}
async function openLongitudinal(cip) {
  await search(cip);
  const dashboard = page.locator('#fhQvActions').getByRole('link', { name: 'Dashboard', exact: false });
  await Promise.all([page.waitForLoadState('domcontentloaded'), dashboard.click()]);
  await page.waitForFunction(expected => document.querySelector('#patientIdBadge')?.textContent.trim() === expected, cip);
  const full = page.locator('#longitudinalStandaloneLink');
  assert.match(await full.getAttribute('href'), /generation=/, 'supported dashboard link retains the patient session');
  await Promise.all([page.waitForLoadState('domcontentloaded'), full.click()]);
  await page.waitForFunction(expected => document.querySelector('#longitudinalPatientSelect')?.value === expected, cip);
}
async function returnToStart() {
  const start = page.getByRole('link', { name: 'Inicio Farmacia', exact: false }).first();
  await Promise.all([page.waitForLoadState('domcontentloaded'), start.click()]);
  await page.locator('#inputExcelFarmacia').waitFor({ state: 'attached' });
  await page.waitForFunction(() => window.FarmaciaDataImports && window.FarmaciaPatientFlowRuntime);
  await upload();
  await closeQuickView();
}

try {
  await page.goto(appUrl('farmacia_index.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaDataImports && window.FarmaciaPatientFlowRuntime);
  await upload();
  await openLongitudinal(CIP_A);

  assert.equal(await page.locator('[data-longitudinal-visit]').count(), 4, 'A has one first visit plus three followups');
  const visits = await page.locator('[data-longitudinal-visit]').allInnerTexts();
  assert.equal(visits.filter(text => /primera visita/i.test(text)).length, 1, 'the multiline first visit is not duplicated');
  assert.match(visits[0], /line-a[\s\S]*line-b/);
  assert.match(visits.join('\n'), /Activo explícito[\s\S]*No activo explícito[\s\S]*No registrado/);
  const timeline = await page.locator('#longitudinalTreatmentTimeline').innerText();
  assert.doesNotMatch(timeline, /no_change_recorded/);
  const schedule = page.locator('[data-longitudinal-movement^="schedule_change-"]');
  assert.match(await schedule.innerText(), /Cambio de pauta explícito[\s\S]*schedule_change[\s\S]*Cada 21 días[\s\S]*Fecha efectiva: 2026-02-12/i);
  const dose = page.locator('[data-longitudinal-movement^="dose_change-"]');
  assert.match(await dose.innerText(), /Cambio de dosis explícito[\s\S]*dose_change[\s\S]*20 mg[\s\S]*Fecha efectiva no registrada[\s\S]*Fecha del acto: 2026-03-10/i);
  assert.doesNotMatch(await dose.innerText(), /Cambio de pauta/i);
  assert.doesNotMatch(await dose.innerText(), /Fecha efectiva:\s*2026-03-10/);
  const doseTooltip = await dose.getAttribute('title');
  assert.match(doseTooltip || '', /Cambio de dosis explícito[\s\S]*dose_change[\s\S]*Fecha efectiva: No registrada[\s\S]*Fecha del acto: 2026-03-10/i);
  assert.doesNotMatch(doseTooltip || '', /Cambio de pauta/i);
  const suspension = page.locator('[data-longitudinal-movement^="suspension-"]');
  assert.match(await suspension.innerText(), /Suspensión explícita[\s\S]*suspension[\s\S]*Suspensión explícita por decisión sintética[\s\S]*Fecha efectiva: 2026-04-11/i);
  assert.doesNotMatch(await suspension.innerText(), /Cambio de pauta/i);
  const movementTooltips = await page.locator('.longitudinal-timeline-change-marker').evaluateAll(markers => markers.map(marker => marker.title));
  assert(movementTooltips.some(title => /Cambio de pauta explícito[\s\S]*schedule_change[\s\S]*Fecha efectiva: 2026-02-12[\s\S]*Fecha del acto: 2026-02-10/i.test(title)));
  assert(movementTooltips.some(title => /Suspensión explícita[\s\S]*suspension[\s\S]*Fecha efectiva: 2026-04-11[\s\S]*Fecha del acto: 2026-04-10/i.test(title)));
  assert.equal(movementTooltips.some(title => /Cambio de pauta[\s\S]*suspension/i.test(title)), false);
  assert.match(timeline, /Adherencia histórica A1[\s\S]*Adherencia histórica A2/i);
  assert.doesNotMatch(timeline, /Inicio:\s*2026-|Fin:\s*2026-/, 'act dates do not become treatment dates');

  await page.locator('#longitudinalPromSelect').selectOption({ label: 'DLQI' });
  assert.match(await page.locator('#longitudinalPromChart').innerText(), /2026-01-10[\s\S]*8[\s\S]*2026-02-10[\s\S]*0/);
  await page.locator('#longitudinalPromSelect').selectOption({ label: 'PROM booleano' });
  assert.match(await page.locator('#longitudinalPromChart').innerText(), /false/);
  await page.locator('#longitudinalPromSelect').selectOption({ label: 'PROM sin fecha' });
  assert.match(await page.locator('#longitudinalPromChart').innerText(), /No registrado[\s\S]*Fecha no registrada/);

  assert.equal(await page.locator('#longitudinalAdverseEvents .longitudinal-ae-card').count(), 1, 'same EA identity has one card');
  const adverse = await page.locator('#longitudinalAdverseEvents').innerText();
  assert.match(adverse, /EA inicial sintético/i);
  assert.match(adverse, /EA actualizado sintético/i);
  assert.match(adverse, /2 actualizaciones/i);
  assert.match(adverse, /Causalidad explícita inicial[\s\S]*Causalidad explícita actualizada/i);
  assert.match(adverse, /No registrado/, 'unknown severity remains neutral and explicit');
  assert.match(await page.locator('#longitudinalClinicalChart').innerText(), /Sin datos disponibles para esta dimensión/);
  assert.match(await page.locator('#longitudinalPatientSummary').innerText(), /Adherencia[\s\S]*Adherencia histórica A2[\s\S]*Último resultado explícito/i);
  assert.equal((await page.locator('#longitudinalClinicalSelect option').innerText()).startsWith('Sin datos disponibles'), true);
  const legend = await page.locator('#longitudinalLegend').innerText();
  assert.match(legend, /Valores explícitos[\s\S]*sin interpretación clínica automática/i);
  assert.doesNotMatch(legend, /Umbrales demo|remisión|severo|moderado/i);

  await returnToStart();
  await openLongitudinal(CIP_B);
  assert.equal(await page.locator('[data-longitudinal-visit]').count(), 1);
  const bText = await page.locator('main').innerText();
  assert.match(bText, new RegExp(CIP_B));
  assert.match(bText, /Tratamiento exclusivo B|PROM exclusivo B/i);
  assert.doesNotMatch(await page.locator('#longitudinalPatientSummary').innerText(), /Último resultado explícito/i);
  assert.doesNotMatch(bText, /EA inicial sintético|Cada 21 días|Adherencia histórica A1/);

  await returnToStart();
  await openLongitudinal(CIP_A);
  assert.equal(await page.locator('[data-longitudinal-visit]').count(), 4, 'A is restored after A to B to A');
  const restoredA = await page.locator('main').innerText();
  assert.match(restoredA, /EA actualizado sintético|Cambio de dosis explícito/i);
  assert.doesNotMatch(restoredA, /PROM exclusivo B|Tratamiento exclusivo B/);
  assert.deepEqual(consoleErrors, [], `console.error: ${consoleErrors.join(' | ')}`);
  assert.deepEqual(pageErrors, [], `pageerror: ${pageErrors.join(' | ')}`);
  console.log('farmacia_longitudinal_raw_browser_check: PASS');
  console.log('QA Chromium: raw full history/grouping/tristate/movements/suspension/PROMs/adherence/EA/causality/activity/isolation PASS; console.error=0 pageerror=0');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
