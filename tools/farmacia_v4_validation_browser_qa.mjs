#!/usr/bin/env node

import assert from 'node:assert/strict';
import { chromium } from 'playwright';

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

async function goto(path) {
  await page.goto(`${BASE_URL}/${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState === 'complete');
  await page.waitForTimeout(150);
}

async function clearSession() {
  await goto('farmacia_index.html');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState === 'complete');
  await page.waitForTimeout(150);
}

async function waitInicio() {
  await page.waitForSelector('#enfermeriaBoard');
  await page.waitForSelector('#pendingValidationCards');
}

async function waitValidation() {
  await page.waitForSelector('#fhValSaveV4');
  await page.waitForSelector('#fhValV4Status');
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

await clearSession();
await waitInicio();

const s01 = page.locator('[data-enf-cip="FH-V4-0001"]');
const s02 = page.locator('[data-enf-cip="FH-V4-0002"]');
const s03 = page.locator('[data-enf-cip="FH-V4-0003"]');
assert.equal(await s01.count(), 1, 'S01 must be visible in Nursing tray');
assert.equal(await s02.count(), 1, 'S02 must be visible in Nursing tray');
assert.equal(await s03.count(), 1, 'S03 must be visible in Nursing tray');
assert.equal(await s01.locator('a[href*="farmacia_validacion.html"]').count(), 0, 'S01 must not open Validation');
assert.equal(await s02.locator('a[href*="farmacia_validacion.html"]').count(), 0, 'S02 must not open Validation');
assert.equal(await s03.locator('[data-enf-action="validar"]').count(), 1, 'S03 must open Validation');

const s04 = page.locator('#pendingValidationCards .pending-validation-card').filter({ hasText: 'FH-V4-0004' });
assert.equal(await s04.count(), 1, 'S04 must be visible only in general tray');
assert.equal(await s04.locator('a[href*="farmacia_validacion.html"]').count(), 1, 'S04 must open Validation');
assert.equal(await page.locator('[data-enf-cip="FH-V4-0004"]').count(), 0, 'S04 must not appear in Nursing tray');

await s03.locator('[data-enf-action="validar"]').click();
await waitValidation();
assert.match(page.url(), /farmacia_validacion\.html/);
assert.equal(await page.inputValue('#fhValEstado'), '', 'S03 must start without a validation result');
for (const selector of ['#fhValidadoDosis', '#fhValidadoVia', '#fhValidadoPauta', '#fhValidadoPresentacion', '#fhValidadoInduccion']) {
  assert.equal(await page.inputValue(selector), '', `${selector} must remain empty for S03`);
}
assert.match(await page.textContent('#fhReumaFarmaco'), /Upadacitinib/i);

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
  assert.equal(await page.inputValue(selector), '', `${selector} must remain empty after validation when not entered`);
}
await page.reload({ waitUntil: 'domcontentloaded' });
await waitValidation();
assert.equal(await page.inputValue('#fhValEstado'), 'validated');
assert.match(await page.textContent('#fhValV4Status'), /Validado · pendiente de inicio/);
assert.equal(await page.locator('#fhValGoFirstVisitV4:not(.hidden)').count(), 1);
assert.match(await page.getAttribute('#fhValGoFirstVisitV4', 'href'), /FH-V4-0003/);
await exportClipboard(/validado/i);

await clearSession();
await waitInicio();
await s04.locator('a[href*="farmacia_validacion.html"]').click();
await waitValidation();
assert.equal(await page.inputValue('#fhValEstado'), '', 'S04 must start without a validation result');
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
await goto('farmacia_validacion.html?cip=FH-V4-0005&entrada=validacion');
await waitValidation();
assert.equal(await page.inputValue('#fhValEstado'), 'pending', 'S05 must restore pending');
assert.equal(await page.locator('#fhValGoFirstVisitV4:not(.hidden)').count(), 0);

await clearSession();
await goto('farmacia_validacion.html?cip=FH-V4-0006&entrada=validacion');
await waitValidation();
assert.equal(await page.inputValue('#fhValEstado'), 'denied', 'S06 must restore denied');
assert.match(await page.inputValue('#fhValMotivo'), /Motivo sintético explícito/i);
assert.equal(await page.locator('#fhValGoFirstVisitV4:not(.hidden)').count(), 0);

await clearSession();
await goto('farmacia_validacion.html?cip=FH-V4-0007&entrada=validacion');
await waitValidation();
assert.equal(await page.inputValue('#fhValEstado'), 'validated', 'S07 must restore validated');
assert.match(await page.textContent('#fhValV4Status'), /Validado · pendiente de inicio/);
assert.equal(await page.locator('#fhValGoFirstVisitV4:not(.hidden)').count(), 1);
assert.equal(await page.inputValue('#fhValidadoDosis'), '');
assert.equal(await page.inputValue('#fhValidadoVia'), '');
assert.equal(await page.inputValue('#fhValidadoPauta'), '');
assert.equal(await page.inputValue('#fhValidadoPresentacion'), '');
assert.equal(await page.inputValue('#fhValidadoInduccion'), '');

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);

await browser.close();
console.log('farmacia_v4_validation_browser_qa: PASSED');
