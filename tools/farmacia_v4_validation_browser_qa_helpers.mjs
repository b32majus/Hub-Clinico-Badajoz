import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NURSING_XLSX = path.join(ROOT, 'templates/enfermeria_inicio_biologico_PROMueve_sintetico_v1.xlsx');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  permissions: ['clipboard-read', 'clipboard-write'],
  timezoneId: 'Europe/Madrid'
});
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const dialogs = [];

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('dialog', async (dialog) => {
  dialogs.push(dialog.message());
  await dialog.dismiss();
});

async function goto(route) {
  await page.goto(`${BASE_URL}/${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState === 'complete');
  await page.waitForFunction(() => window.FarmaciaDemo && window.FarmaciaDemo.ready);
  await page.evaluate(async () => { await window.FarmaciaDemo.ready; });
  await page.waitForTimeout(250);
}

async function clearSession() {
  await goto('farmacia_index.html');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState === 'complete');
  await page.waitForFunction(() => window.FarmaciaDemo && window.FarmaciaDemo.ready);
  await page.evaluate(async () => { await window.FarmaciaDemo.ready; });
  await page.waitForTimeout(250);
}

async function importNursingWorkbook() {
  await page.setInputFiles('#inputExcelEnfermeria', NURSING_XLSX);
  await page.waitForSelector('#enfermeriaBoard');
  await page.waitForSelector('[data-enf-cip="000000003"]');
  await page.waitForFunction(() => {
    const status = document.getElementById('estadoCargaEnfermeria');
    return status && /4/.test(status.textContent || '');
  });
  await page.waitForTimeout(250);
}

async function waitValidation() {
  await page.waitForSelector('#fhValSaveV4');
  await page.waitForSelector('#fhValV4Status');
  await page.waitForFunction(() => window.FarmaciaValidationExportTruthV4);
  await page.waitForFunction(() => {
    const status = document.getElementById('fhValV4Status');
    return status && !/inicializar/i.test(status.textContent || '');
  });
  await page.waitForTimeout(300);
}

async function clearClipboard() {
  await page.evaluate(async () => navigator.clipboard.writeText(''));
}

async function readClipboard() {
  return page.evaluate(async () => navigator.clipboard.readText());
}

async function exportExcelRow() {
  await clearClipboard();
  await page.click('#fhValExcelExportBtn');
  await page.waitForFunction(async () => (await navigator.clipboard.readText()).length > 0);
  const clipboard = await readClipboard();
  const cells = clipboard.split('\t');
  assert.equal(cells.length, 61, 'WO8 export must preserve 61 columns');
  return { clipboard, cells };
}

async function exportReport() {
  await clearClipboard();
  await page.click('#fhValExportTxt');
  await page.waitForFunction(async () => (await navigator.clipboard.readText()).length > 0);
  return readClipboard();
}

async function assertBlockedBeforeSave(selector) {
  dialogs.length = 0;
  await clearClipboard();
  await page.click(selector);
  await page.waitForFunction(() => true);
  assert.ok(dialogs.some((message) => /Guarde primero la decisión de Validación/i.test(message)), `${selector} must block before canonical save`);
  assert.equal(await readClipboard(), '', `${selector} must not export before canonical save`);
}

async function assertRealImportBoard() {
  const a = page.locator('[data-enf-cip="000000001"]');
  const b = page.locator('[data-enf-cip="000000002"]');
  const c = page.locator('[data-enf-cip="000000003"]');
  const d = page.locator('[data-enf-cip="000000004"]');

  assert.equal(await a.count(), 1, 'Paciente A must be imported once');
  assert.equal(await b.count(), 1, 'Paciente B must be imported once');
  assert.equal(await c.count(), 1, 'Paciente C must be imported once');
  assert.equal(await d.count(), 1, 'Paciente D must be imported once');

  assert.equal(await a.locator('a[href*="farmacia_validacion.html"]').count(), 0, 'Paciente A must remain in surveillance');
  assert.equal(await b.locator('a[href*="farmacia_validacion.html"]').count(), 0, 'Paciente B must remain blocked');
  assert.equal(await d.locator('a[href*="farmacia_validacion.html"]').count(), 0, 'Paciente D must remain in surveillance');
  assert.equal(await c.locator('[data-enf-action="validar"]').count(), 1, 'Paciente C must open Validation');

  assert.equal(await page.locator('#pendingValidationCards .pending-validation-card').filter({ hasText: '000000003' }).count(), 0, 'Paciente C must not be duplicated in the general tray');
  return c;
}

export { assert, browser, page, consoleErrors, pageErrors, dialogs, goto, clearSession, importNursingWorkbook, waitValidation, exportExcelRow, exportReport, assertBlockedBeforeSave, assertRealImportBoard };
