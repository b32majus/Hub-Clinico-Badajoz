#!/usr/bin/env node

import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const BASE_URL = process.env.FH_LEDGER_BASE_URL || 'http://127.0.0.1:48796/';

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (!existsSync(path.join(nodeModules, 'playwright', 'package.json'))) continue;
    return createRequire(path.join(nodeModules, '__fh_ledger_loader.cjs'))('playwright');
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_evaluation_ledger_browser_check.mjs');
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

const browser = await chromium.launch({ headless: true, executablePath: availableChromiumExecutable() });
const context = await browser.newContext();
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];

page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(new URL('farmacia_validacion.html', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.removeItem('promueve.fh.synthetic-evaluation-ledger.v1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#fhEvaluationLedgerPanel').waitFor({ state: 'visible' });

  await page.locator('#fhOrigenEntrada').selectOption('manual_farmacia');
  await page.locator('#fhServicioManual').selectOption('derma');
  await page.locator('#fhPatologiaManual').selectOption({ label: 'Hidradenitis supurativa' });
  await page.locator('#fhManualCip').fill('CIP-VERANO-001');
  await page.locator('#fhManualFecha').fill('2026-08-01');
  await page.locator('#fhValidadoJustificacion').fill('Observación ficticia inicial');
  await page.locator('#fhHSBioAda').check();
  await page.locator('#fhDermaComorbInfeccionesRecurrentes').selectOption('si');
  assert.equal(await page.locator('#fhEvaluationLedgerSave').isDisabled(), true, 'save is blocked before synthetic confirmation');
  await page.locator('#fhEvaluationLedgerSyntheticConfirm').check();
  assert.equal(await page.locator('#fhEvaluationLedgerSave').isDisabled(), false, 'non-empty CIP plus confirmation enables save');
  await page.locator('#fhEvaluationLedgerSave').click();
  assert.match(await page.locator('#fhEvaluationLedgerStatus').textContent(), /guardado/);
  assert.equal(await page.evaluate(() => FarmaciaEvaluationLedger.listEvents().length), 1);

  await page.locator('#fhValidadoJustificacion').fill('Observación ficticia actualizada');
  await page.locator('#fhEvaluationLedgerSave').click();
  assert.match(await page.locator('#fhEvaluationLedgerStatus').textContent(), /actualizado/);
  assert.equal(await page.evaluate(() => FarmaciaEvaluationLedger.listEvents().length), 1, 'same page act updates idempotently');

  await page.goto(new URL('farmacia_index.html', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.locator('#fhEvaluationLedgerIndex').waitFor({ state: 'visible' });
  assert.match(await page.locator('#fhEvaluationLedgerIndex').textContent(), /CIP-VERANO-001/);
  assert.match(await page.locator('#fhEvaluationLedgerIndex').textContent(), /1 actos guardados/);
  await page.locator('.evaluation-ledger-event__link').first().click();
  await page.locator('#fhEvaluationLedgerStatus').waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  assert.match(await page.locator('#fhEvaluationLedgerStatus').textContent(), /restaurado/);
  assert.equal(await page.locator('#fhManualCip').inputValue(), 'CIP-VERANO-001');
  assert.equal(await page.locator('#fhValidadoJustificacion').inputValue(), 'Observación ficticia actualizada');
  assert.equal(await page.locator('#fhHSBioAda').isChecked(), true, 'checkbox state is restored');
  assert.equal(await page.locator('#fhDermaComorbInfeccionesRecurrentes').inputValue(), 'si');

  await page.goto(new URL('farmacia_primera_visita.html', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.locator('#fhEvaluationLedgerPanel').waitFor({ state: 'visible' });
  await page.locator('#fhPvCip').fill('CIP-VERANO-001');
  await page.locator('#fhPvServicio').selectOption({ label: 'Dermatología' });
  await page.locator('#fhPvPatologia').selectOption({ label: 'Hidradenitis supurativa' });
  await page.locator('#fhPvFecha').fill('2026-08-02');
  await page.locator('#fhEvaluationLedgerSyntheticConfirm').check();
  await page.locator('#fhEvaluationLedgerSave').click();
  assert.equal(await page.evaluate(() => FarmaciaEvaluationLedger.listEvents().length), 2);

  await page.goto(new URL('farmacia_seguimiento.html', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.locator('#fhEvaluationLedgerPanel').waitFor({ state: 'visible' });
  await page.locator('#fhSegCip').fill('CIP-VERANO-001');
  await page.locator('#fhSegServicio').selectOption({ label: 'Dermatología' });
  await page.locator('#fhSegPatologia').selectOption({ label: 'Hidradenitis supurativa' });
  if (await page.locator('#fhSegFecha').count()) await page.locator('#fhSegFecha').fill('2026-08-03');
  await page.locator('#fhEvaluationLedgerSyntheticConfirm').check();
  await page.locator('#fhEvaluationLedgerSave').click();
  assert.equal(await page.evaluate(() => FarmaciaEvaluationLedger.listEvents().length), 3);

  await page.goto(new URL('farmacia_index.html', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.locator('#fhEvaluationLedgerIndex').waitFor({ state: 'visible' });
  assert.match(await page.locator('#fhEvaluationLedgerIndex').textContent(), /3 actos guardados/);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#fhEvaluationLedgerIndex').waitFor({ state: 'visible' });
  assert.match(await page.locator('#fhEvaluationLedgerIndex').textContent(), /3 actos guardados/, 'ledger survives a browser reload');

  page.once('dialog', dialog => dialog.accept());
  await page.locator('#fhEvaluationLedgerClearAll').click();
  await page.waitForTimeout(100);
  assert.match(await page.locator('#fhEvaluationLedgerIndex').textContent(), /0 actos guardados/);

  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join('\n')}`);
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('\n')}`);
  console.log('farmacia_evaluation_ledger_browser_check: PASSED');
  console.log('validation create/update; index; reopen/restore; first visit; follow-up; reload; clear; console/pageerror 0.');
} finally {
  await browser.close();
}
