#!/usr/bin/env node

import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Local fallback used by the repository's focused browser checks.
const BASE_URL = process.env.FH_FIRST_VISIT_EXCEL_BASE_URL || 'http://127.0.0.1:48796/';
const INITIAL_CIP = 'CIP-DEMO-FH-001';
const SYNTHETIC_CIP = 'CIP-SYNTH-FV-EXCEL-901';

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (!existsSync(path.join(nodeModules, 'playwright', 'package.json'))) continue;
    return createRequire(path.join(nodeModules, '__fh_first_visit_excel_loader.cjs'))('playwright');
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_first_visit_excel_truth_browser_check.mjs');
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

async function answerDlqi(page, scores) {
  for (let question = 1; question <= 10; question += 1) {
    if (question === 7) {
      await page.locator('input[name="dlqi_q7_a"][data-dlqi-q7-trigger]').check();
      await page.locator(`input[name="dlqi_q7_b"][data-dlqi-val="${scores[7]}"]`).first().check();
    } else {
      await page.locator(`input[name="dlqi_q${question}"][data-dlqi-val="${scores[question]}"]`).first().check();
    }
  }
}

async function setRangeFromKeyboard(locator, value) {
  await locator.focus();
  await locator.press('Home');
  for (let step = 0; step < Number(value); step += 1) await locator.press('ArrowRight');
  assert.equal(await locator.inputValue(), String(value));
}

async function installExcelBoundary(page) {
  await page.evaluate(() => {
    window.__fhFirstVisitExcelCapture = null;
    window.FarmaciaExcelRowExport.copyTSVRowToClipboard = (row, options) => {
      window.__fhFirstVisitExcelCapture = {
        row: JSON.parse(JSON.stringify(row)),
        options: { ...(options || {}) },
        columns: [...window.FarmaciaExcelRowExport.WO8_COLUMNS]
      };
      return Promise.resolve(true);
    };
  });
}

async function capturedExcelRow(page) {
  const captured = await page.evaluate(() => window.__fhFirstVisitExcelCapture);
  assert.ok(captured, 'visible Excel action reaches the clipboard output boundary');
  assert.equal(captured.columns.length, 61, 'public WO8_COLUMNS exposes 61 columns');
  assert.equal(captured.row.length, 61, 'First Visit export row has exactly 61 values');
  return {
    ...captured,
    rowObject: Object.fromEntries(captured.columns.map((column, index) => [column, captured.row[index]]))
  };
}

function assertSyntheticIdentity(rowObject) {
  assert.equal(rowObject.patient_id, SYNTHETIC_CIP);
  assert.equal(rowObject.cip_demo_o_hash, SYNTHETIC_CIP);
  assert.notEqual(rowObject.patient_id, INITIAL_CIP);
  assert.notEqual(rowObject.cip_demo_o_hash, INITIAL_CIP);
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
  await page.waitForFunction(() => window.FarmaciaPrimeraVisita && window.FarmaciaExcelRowExport);

  const initialContext = await page.evaluate(() => {
    const query = window.FarmaciaDemo.getQueryContext();
    return { cip: query.cip, patient: query.patient };
  });
  assert.ok(initialContext.patient, 'demo query context includes a patient');
  assert.equal(initialContext.cip, INITIAL_CIP);
  assert.equal(initialContext.patient.cip, INITIAL_CIP);
  assert.equal(await page.locator('#fhPvCip').inputValue(), INITIAL_CIP);
  assert.notEqual(await page.locator('#fhPvServicio').inputValue(), '', 'demo service context is rendered');
  assert.notEqual(await page.locator('#fhPvPatologia').inputValue(), '', 'demo pathology context is rendered');
  assert.notEqual(await page.locator('#fhPvFarmaco').inputValue(), '', 'demo treatment context is rendered');

  await page.locator('#fhPvCip').fill(SYNTHETIC_CIP);
  let switchDialog = null;
  page.once('dialog', async dialog => {
    switchDialog = { type: dialog.type(), message: dialog.message() };
    await dialog.accept();
  });
  await page.locator('#fhPvCipSearchBtn').click();
  assert.ok(switchDialog, 'patient switch opens the real confirmation dialog');
  assert.equal(switchDialog.type, 'confirm');
  assert.match(switchDialog.message, /cambiar de paciente|limpiarán los datos/i);
  await page.locator('#fhPvCipSearchNotice').waitFor({ state: 'visible' });
  assert.match(await page.locator('#fhPvCipSearchNotice').textContent(), /Paciente no encontrado en demo/i);
  for (const selector of ['#fhPvServicio', '#fhPvPatologia', '#fhPvFarmaco', '#fhPvDosis', '#fhPvVia', '#fhPvPauta', '#fhPvFecha', '#fhPvNotas']) {
    assert.equal(await page.locator(selector).inputValue(), '', `${selector} is clean in manual mode`);
  }
  assert.equal(await page.locator('#fhPvTratamientoGrid').textContent(), '', 'derived treatment summary is clean in manual mode');

  const expected = {
    service: 'Reumatología',
    pathology: 'Artritis Reumatoide (AR)',
    date: '2026-07-15',
    treatment: 'Fármaco sintético FV-901',
    dose: '125 mg sintéticos',
    route: 'SC',
    pautaCode: 'CADA_4_SEMANAS',
    pautaLabel: 'Cada 4 semanas',
    eva: '6',
    notes: 'Observación sintética de primera visita Excel.'
  };
  await page.locator('#fhPvServicio').selectOption({ label: expected.service });
  await page.locator('#fhPvPatologia').selectOption({ label: expected.pathology });
  await page.locator('#fhPvFecha').fill(expected.date);
  await page.locator('#fhPvFarmaco').fill(expected.treatment);
  await page.locator('#fhPvDosis').fill(expected.dose);
  await page.locator('#fhPvVia').selectOption(expected.route);
  await page.locator('#fhPvPauta').selectOption(expected.pautaCode);
  assert.equal((await page.locator('#fhPvPauta option:checked').textContent()).trim(), expected.pautaLabel);

  await page.locator('#fhPvProms').selectOption({ label: 'Sí' });
  await page.locator('#fhPvPromsExpanded').waitFor({ state: 'visible' });
  const scoredAnswers = { 1: 3, 2: 2, 3: 1, 4: 0, 5: 3, 6: 2, 7: 1, 8: 0, 9: 3, 10: 2 };
  const expectedDlqi = String(Object.values(scoredAnswers).reduce((total, score) => total + score, 0));
  await answerDlqi(page, scoredAnswers);
  assert.equal(await page.locator('#fhPvDlqiTotal').textContent(), expectedDlqi, 'rendered DLQI total matches all ten answers');
  await setRangeFromKeyboard(page.locator('#fhPvEvaDolorRange'), expected.eva);
  assert.equal(await page.locator('#fhPvEvaDolorValue').textContent(), expected.eva);
  await page.locator('#fhPvNotas').fill(expected.notes);

  await installExcelBoundary(page);
  await page.locator('#fhPvExcelExportBtn').click();
  const firstExport = await capturedExcelRow(page);
  assertSyntheticIdentity(firstExport.rowObject);
  assert.equal(firstExport.rowObject.servicio_origen, expected.service);
  assert.equal(firstExport.rowObject.patologia_indicacion, expected.pathology);
  assert.equal(firstExport.rowObject.fecha_acto, expected.date);
  assert.equal(firstExport.rowObject.marca_comercial, expected.treatment);
  assert.equal(firstExport.rowObject.dosis_presentacion, expected.dose);
  assert.equal(firstExport.rowObject.via, expected.route);
  assert.equal(firstExport.rowObject.pauta_codigo, expected.pautaCode);
  assert.equal(firstExport.rowObject.pauta_label, expected.pautaLabel);
  assert.equal(firstExport.rowObject.dlqi, expectedDlqi);
  assert.equal(firstExport.rowObject.eva_dolor, expected.eva);
  assert.equal(firstExport.rowObject.observaciones_seguimiento, expected.notes);
  assert.equal(firstExport.options.sheetName, '02_REUMA', 'visible Reumatología service maps to its expected sheet');

  const zeroAnswers = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [index + 1, 0]));
  await answerDlqi(page, zeroAnswers);
  assert.equal(await page.locator('#fhPvDlqiTotal').textContent(), '0', 'all-zero DLQI remains an answered score');
  await setRangeFromKeyboard(page.locator('#fhPvEvaDolorRange'), '0');
  assert.equal(await page.locator('#fhPvEvaDolorValue').textContent(), '0');
  await page.locator('#fhPvNotas').fill('Observación sintética del caso cero.');

  await installExcelBoundary(page);
  await page.locator('#fhPvExcelExportBtn').click();
  const zeroExport = await capturedExcelRow(page);
  assertSyntheticIdentity(zeroExport.rowObject);
  assert.equal(zeroExport.rowObject.dlqi, '0');
  assert.equal(zeroExport.rowObject.eva_dolor, '0');
  assert.notEqual(zeroExport.rowObject.dlqi, '');
  assert.notEqual(zeroExport.rowObject.eva_dolor, '');

  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join('\n')}`);
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('\n')}`);
  console.log('farmacia_first_visit_excel_truth_browser_check: PASSED — manual CIP switch, 61-column UI export truth, DLQI/EVA values including zero, console/pageerror 0.');
} finally {
  await browser.close();
}
