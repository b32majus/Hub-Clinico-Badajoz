#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NURSING_XLSX = path.join(ROOT, 'templates/enfermeria_inicio_biologico_PROMueve_sintetico_v1.xlsx');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));

async function goto(route) {
  await page.goto(`${BASE_URL}/${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState === 'complete');
  await page.waitForFunction(() => window.FarmaciaDemo && window.FarmaciaDemo.ready);
  await page.evaluate(async () => { await window.FarmaciaDemo.ready; });
  await page.waitForTimeout(150);
}

async function clearSession() {
  await goto('farmacia_index.html');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState === 'complete');
  await page.waitForFunction(() => window.FarmaciaDemo && window.FarmaciaDemo.ready);
  await page.evaluate(async () => { await window.FarmaciaDemo.ready; });
  await page.waitForTimeout(150);
}

async function importNursingWorkbook() {
  await page.setInputFiles('#inputExcelEnfermeria', NURSING_XLSX);
  await page.waitForSelector('#enfermeriaBoard');
  await page.waitForSelector('[data-enf-cip="000000003"]');
  await page.waitForFunction(() => {
    const status = document.getElementById('estadoCargaEnfermeria');
    return status && /4/.test(status.textContent || '');
  });
  await page.waitForTimeout(150);
}

async function waitValidation() {
  await page.waitForSelector('#fhValSaveV4');
  await page.waitForSelector('#fhValV4Status');
  await page.waitForFunction(() => {
    const status = document.getElementById('fhValV4Status');
    return status && !/inicializar/i.test(status.textContent || '');
  });
  await page.waitForTimeout(200);
}

async function exportClipboard(expected) {
  await page.evaluate(async () => navigator.clipboard.writeText(''));
  await page.click('#fhValExcelExportBtn');
  await page.waitForFunction(() => {
    const toast = document.getElementById('fhExcelRowExportToast');
    return toast && /Fila copiada/i.test(toast.textContent || '');
  });
  const clipboard = await page.evaluate(async () => navigator.clipboard.readText());
  assert.match(clipboard, expected);
  assert.equal(clipboard.split('\t').length, 61, 'WO8 export must preserve 61 columns');
  return clipboard;
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

await clearSession();
assert.equal(await page.locator('#enfermeriaBoard').count(), 0, 'Normal mode must start without Nursing fixtures');
assert.equal(await page.locator('#pendingValidationCards .pending-validation-card').count(), 0, 'Normal mode must start without demo fallback patients');
assert.match(await page.textContent('#pendingValidationBoard .validation-module__intro'), /No hay pacientes demo de fallback/i);

await importNursingWorkbook();
let importedC = await assertRealImportBoard();

await importedC.locator('[data-enf-action="validar"]').click();
await waitValidation();
assert.match(page.url(), /cip=000000003/);
assert.equal(await page.inputValue('#fhValEstado'), '', 'Imported Paciente C must start without a validation result');
assert.match(await page.textContent('#fhReumaFarmaco'), /Upadacitinib/i);
for (const selector of ['#fhValidadoDosis', '#fhValidadoVia', '#fhValidadoPauta', '#fhValidadoPresentacion', '#fhValidadoInduccion']) {
  assert.equal(await page.inputValue(selector), '', `${selector} must remain empty for imported Paciente C`);
}

await page.selectOption('#fhValEstado', 'pending');
await page.fill('#fhValObservaciones', 'Pendiente de información adicional');
await page.click('#fhValSaveV4');
await page.waitForFunction(() => /Pendiente/.test(document.getElementById('fhValV4Status')?.textContent || ''));
assert.equal(await page.locator('#fhValGoFirstVisitV4:not(.hidden)').count(), 0, 'Pending must not enable First Visit');
await page.reload({ waitUntil: 'domcontentloaded' });
await waitValidation();
assert.equal(await page.inputValue('#fhValEstado'), 'pending');
assert.equal(await page.inputValue('#fhValObservaciones'), 'Pendiente de información adicional');
await exportClipboard(/pendiente/i);

await page.selectOption('#fhValEstado', 'validated');
await page.click('#fhValSaveV4');
await page.waitForFunction(() => /Validado · pendiente de inicio/.test(document.getElementById('fhValV4Status')?.textContent || ''));
assert.equal(await page.locator('#fhValGoFirstVisitV4:not(.hidden)').count(), 1, 'Validated must enable First Visit');
for (const selector of ['#fhValidadoDosis', '#fhValidadoVia', '#fhValidadoPauta', '#fhValidadoPresentacion', '#fhValidadoInduccion']) {
  assert.equal(await page.inputValue(selector), '', `${selector} must remain empty after validation`);
}
await page.reload({ waitUntil: 'domcontentloaded' });
await waitValidation();
assert.equal(await page.inputValue('#fhValEstado'), 'validated');
assert.match(await page.textContent('#fhValV4Status'), /Validado · pendiente de inicio/);
assert.equal(await page.locator('#fhValGoFirstVisitV4:not(.hidden)').count(), 1);
await exportClipboard(/validado/i);

await clearSession();
await importNursingWorkbook();
importedC = await assertRealImportBoard();
await importedC.locator('[data-enf-action="validar"]').click();
await waitValidation();
await page.selectOption('#fhValEstado', 'denied');
await page.fill('#fhValMotivo', 'Motivo sintético de denegación');
await page.click('#fhValSaveV4');
await page.waitForFunction(() => /Denegado/.test(document.getElementById('fhValV4Status')?.textContent || ''));
assert.equal(await page.locator('#fhValGoFirstVisitV4:not(.hidden)').count(), 0, 'Denied must not enable First Visit');
await page.reload({ waitUntil: 'domcontentloaded' });
await waitValidation();
assert.equal(await page.inputValue('#fhValEstado'), 'denied');
assert.equal(await page.inputValue('#fhValMotivo'), 'Motivo sintético de denegación');
await exportClipboard(/denegado/i);

await clearSession();
await goto('farmacia_validacion.html?cip=FH-V4-0005&entrada=validacion&qa_fixture=v4');
await waitValidation();
assert.equal(await page.inputValue('#fhValEstado'), 'pending', 'S05 fixture must restore pending only under explicit QA mode');

await clearSession();
await goto('farmacia_validacion.html?cip=FH-V4-0006&entrada=validacion&qa_fixture=v4');
await waitValidation();
assert.equal(await page.inputValue('#fhValEstado'), 'denied', 'S06 fixture must restore denied only under explicit QA mode');
assert.match(await page.inputValue('#fhValMotivo'), /Motivo sintético explícito/i);

await clearSession();
await goto('farmacia_validacion.html?cip=FH-V4-0007&entrada=validacion&qa_fixture=v4');
await waitValidation();
assert.equal(await page.inputValue('#fhValEstado'), 'validated', 'S07 fixture must restore validated only under explicit QA mode');
assert.match(await page.textContent('#fhValV4Status'), /Validado · pendiente de inicio/);
assert.equal(await page.locator('#fhValGoFirstVisitV4:not(.hidden)').count(), 1);

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);

await browser.close();
console.log('farmacia_v4_validation_browser_qa: PASSED_REAL_NURSING_IMPORT');
