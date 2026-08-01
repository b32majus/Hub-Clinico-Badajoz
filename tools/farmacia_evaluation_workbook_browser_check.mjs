#!/usr/bin/env node

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const BASE_URL = process.env.FH_WORKBOOK_BASE_URL || 'http://127.0.0.1:4174/';

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (!existsSync(path.join(nodeModules, 'playwright', 'package.json'))) continue;
    return createRequire(path.join(nodeModules, '__fh_workbook_loader.cjs'))('playwright');
  }
  throw new Error('Playwright not found. Run with npx --yes --package=playwright.');
}

const { chromium } = loadPlaywrightFromNpx();

function availableChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  const candidates = readdirSync(cache)
    .filter((entry) => entry.startsWith('chromium_headless_shell-'))
    .sort().reverse()
    .map((entry) => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return candidates.find(existsSync) || bundled;
}

const browser = await chromium.launch({ headless: true, executablePath: availableChromiumExecutable() });
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => pageErrors.push(error.message));

try {
  await page.goto(new URL('farmacia_index.html', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaEvaluationLedger && window.FarmaciaEvaluationWorkbook && window.XLSX);
  await page.evaluate(() => {
    const ledger = window.FarmaciaEvaluationLedger;
    ledger.clearAll();
    const common = {
      synthetic_acknowledged: true,
      patient_id: ledger.patientIdForCip('CIP-LIBRO-001'),
      synthetic_cip: 'CIP-LIBRO-001',
      service_code: 'DERMA',
      service_label: 'Dermatología',
      pathology_code: 'HS',
      pathology_label: 'Hidradenitis supurativa',
      app_context: 'QA navegador libro ficticio',
    };
    ledger.saveEvent({
      ...common,
      event_type: 'pharmacy_validation',
      source_event_id: 'pharmacy_validation:SYN-PAT-QA:2026-08-01',
      occurred_on: '2026-08-01',
      record_status: 'completado',
      line_ids: ['LINE-QA-1'],
      payload: {
        form_state: [
          { key_kind: 'id', key: 'fhManualCip', label: 'CIP', tag: 'INPUT', type: 'text', value: 'CIP-LIBRO-001', visible: true, disabled: false },
          { key_kind: 'id', key: 'fhValidadoJustificacion', label: 'Observaciones de Farmacia Hospitalaria', tag: 'TEXTAREA', type: 'textarea', value: '=QA()', visible: true, disabled: false },
          { key_kind: 'id', key: 'fhHSBioAda', label: 'Adalimumab', tag: 'INPUT', type: 'checkbox', value: 'on', checked: false, visible: true, disabled: false },
        ],
        domain: { validation_export_data: { lineaActual: { line_id: 'LINE-QA-1', farmaco_nombre: 'Fármaco ficticio A', dosis_texto: '100 mg', via: 'SC' } } },
      },
    });
    ledger.saveEvent({
      ...common,
      event_type: 'pharmacy_first_visit',
      source_event_id: 'pharmacy_first_visit:SYN-PAT-QA:2026-08-02',
      occurred_on: '2026-08-02',
      record_status: 'recorded',
      line_ids: ['LINE-QA-1'],
      payload: {
        form_state: [
          { key_kind: 'id', key: 'fhPvCip', label: 'CIP', tag: 'INPUT', type: 'text', value: 'CIP-LIBRO-001', visible: true, disabled: false },
          { key_kind: 'id', key: 'fhPvEvaDolor', label: 'EVA dolor', tag: 'INPUT', type: 'range', value: '0', visible: true, disabled: false },
        ],
        domain: { primary_treatment: { line_id: 'LINE-QA-1', farmaco_nombre: 'Fármaco ficticio A', dosis_texto: '100 mg', via: 'SC' } },
      },
    });
    ledger.saveEvent({
      ...common,
      event_type: 'pharmacy_follow_up',
      source_event_id: 'pharmacy_follow_up:SYN-PAT-QA:VISIT-QA-3',
      occurred_on: '2026-08-03',
      visit_id: 'VISIT-QA-3',
      record_status: 'recorded',
      line_ids: ['LINE-QA-1', 'LINE-QA-2'],
      payload: {
        form_state: [
          { key_kind: 'id', key: 'fhSegCip', label: 'CIP', tag: 'INPUT', type: 'text', value: 'CIP-LIBRO-001', visible: true, disabled: false },
          { key_kind: 'id', key: 'fhSegDispensado', label: 'Dispensado en esta visita', tag: 'SELECT', type: 'select-one', value: 'no', visible: true, disabled: false },
        ],
        domain: {
          current_visit: { visit_id: 'VISIT-QA-3' },
          selected_line: { line_id: 'LINE-QA-1', farmaco_nombre: 'Fármaco ficticio A' },
          canonical_lines: [
            { line_id: 'LINE-QA-1', farmaco_nombre: 'Fármaco ficticio A', estado_linea: 'activa' },
            { line_id: 'LINE-QA-2', farmaco_nombre: 'Fármaco ficticio B', estado_linea: 'activa' },
          ],
          adverse_event: { ea_id: 'EA-QA-1', presente: true, descripcion: 'EA ficticio', sospechosos: [{ suspect_id: 'SUS-QA-1', line_id: 'LINE-QA-1' }] },
        },
      },
    });
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#fhEvaluationWorkbookDownload').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#fhEvaluationWorkbookDownload').isDisabled(), false, 'download is enabled with saved acts');
  assert.match(await page.locator('#fhEvaluationWorkbookStatus').textContent(), /3 actos ficticios/);

  const inspection = await page.evaluate(() => {
    const ledger = window.FarmaciaEvaluationLedger.load();
    const built = window.FarmaciaEvaluationWorkbook.buildWorkbook(ledger.events, ledger);
    const read = (name) => window.XLSX.utils.sheet_to_json(built.workbook.Sheets[name], { defval: '' });
    return {
      names: built.workbook.SheetNames,
      patients: read('PACIENTES'),
      events: read('EVENTOS'),
      validation: read('VALIDACION'),
      firstVisit: read('PRIMERA_VISITA'),
      followUp: read('SEGUIMIENTO'),
      fields: read('CAMPOS_FORMULARIO'),
      dictionary: read('DICCIONARIO_CAMPOS'),
      lines: read('LINEAS_TRATAMIENTO'),
      adverse: read('EFECTOS_ADVERSOS'),
      payload: read('PAYLOAD_JSON'),
    };
  });

  assert.deepEqual(inspection.names, [
    'METADATOS', 'PACIENTES', 'EVENTOS', 'VALIDACION', 'PRIMERA_VISITA', 'SEGUIMIENTO',
    'CAMPOS_FORMULARIO', 'DICCIONARIO_CAMPOS', 'LINEAS_TRATAMIENTO', 'EFECTOS_ADVERSOS', 'PAYLOAD_JSON'
  ]);
  assert.equal(inspection.patients.length, 1);
  assert.equal(inspection.patients[0].numero_actos, 3);
  assert.equal(inspection.events.length, 3);
  assert.equal(inspection.validation.length, 1);
  assert.equal(inspection.firstVisit.length, 1);
  assert.equal(inspection.followUp.length, 1);
  assert.equal(inspection.validation[0].fhValidadoJustificacion, "'=QA()", 'formula-like value is neutralized');
  assert.equal(String(inspection.firstVisit[0].fhPvEvaDolor), '0', 'zero is preserved');
  assert.ok(inspection.fields.some((row) => row.key === 'fhHSBioAda' && row.checked === false));
  assert.ok(inspection.dictionary.some((row) => row.key === 'fhValidadoJustificacion' && row.label === 'Observaciones de Farmacia Hospitalaria'));
  assert.ok(inspection.lines.length >= 5);
  assert.equal(inspection.adverse.length, 1);
  assert.match(inspection.adverse[0].sospechosos_json, /SUS-QA-1/);
  assert.equal(inspection.payload.length, 3);
  assert.match(inspection.payload[0].event_json, /CIP-LIBRO-001/);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#fhEvaluationWorkbookDownload').click(),
  ]);
  const suggested = download.suggestedFilename();
  assert.match(suggested, /^PROMueve_FH_evaluacion_ficticia_\d{4}-\d{2}-\d{2}\.xlsx$/);
  const target = path.join('/tmp', suggested);
  await download.saveAs(target);
  assert.ok(statSync(target).size > 10000, 'downloaded workbook has non-trivial size');
  assert.match(await page.locator('#fhEvaluationWorkbookStatus').textContent(), /Libro generado/);

  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
  console.log('farmacia_evaluation_workbook_browser_check: PASSED');
  console.log('3 acts; 11 sheets; complete payload; labels; lines; adverse events; formula guard; real XLSX download; console/pageerror 0.');
} finally {
  await browser.close();
}
