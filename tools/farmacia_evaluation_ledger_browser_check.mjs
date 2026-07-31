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
  await page.evaluate(() => {
    FarmaciaSeguimiento.restoreEvaluationState({
      current_visit: {
        cip: 'CIP-VERANO-001',
        visit_id: 'SYN-VIS-DYNAMIC-001',
        created_at: '2026-08-03 10:00:00',
        selected_line_ids: ['LINE-DYN-1'],
        dispensed_line_ids: ['LINE-DYN-1'],
        editing_line_id: 'LINE-DYN-1',
        line_state: {
          'LINE-DYN-1': {
            controls: { fhSegObservacionesLinea: 'Línea ficticia restaurable', fhSegTipoRelacionTerapia: 'sin_cambios' },
            morisky: {}
          }
        },
        adverse_event: {
          present: 'si', severity: 'Moderado', resolved: 'en_seguimiento', corrected: 'tratamiento_sintomatico',
          observations: 'EA ficticio restaurable', suspect_ids: ['line:LINE-DYN-1'], causality_editing_id: 'line:LINE-DYN-1'
        },
        causality_by_suspect: {
          'line:LINE-DYN-1': {
            naranjo_answers: { q1: 'si' }, naranjo_score: 2, naranjo_category: 'Posible',
            karch_answers: { temporal: 'si' }, karch_category: 'Posible', final_assessment: 'Posible'
          }
        }
      },
      canonical_lines: [{
        linea_id: 'LINE-DYN-1', estado_linea: 'active', nombre_linea: 'Línea ficticia dinámica',
        nombre_comercial: 'Fármaco ficticio', principio_activo: 'Activo ficticio', candidate_explicit: true
      }],
      selected_line: { linea_id: 'LINE-DYN-1', estado_linea: 'active', nombre_linea: 'Línea ficticia dinámica' },
      related_treatments: [{
        uid: 'REL-DYN-1', farmaco: 'Concomitante ficticio', principioActivo: 'Activo concomitante',
        relationType: 'Concomitante', via: 'Oral'
      }]
    });
  });
  await page.locator('#fhEvaluationLedgerSyntheticConfirm').check();
  await page.locator('#fhEvaluationLedgerSave').click();
  assert.equal(await page.evaluate(() => FarmaciaEvaluationLedger.listEvents().length), 3);
  const storedFollowup = await page.evaluate(() => FarmaciaEvaluationLedger.listEvents({ event_type: 'pharmacy_follow_up' })[0]);
  assert.equal(storedFollowup.payload.domain.current_visit.visit_id, 'SYN-VIS-DYNAMIC-001');
  assert.equal(storedFollowup.payload.domain.canonical_lines[0].linea_id, 'LINE-DYN-1');
  assert.equal(storedFollowup.payload.domain.related_treatments[0].uid, 'REL-DYN-1');
  assert.equal(storedFollowup.payload.domain.current_visit.causality_by_suspect['line:LINE-DYN-1'].final_assessment, 'Posible');

  await page.goto(new URL('farmacia_index.html', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.locator('#fhEvaluationLedgerIndex').waitFor({ state: 'visible' });
  assert.match(await page.locator('#fhEvaluationLedgerIndex').textContent(), /3 actos guardados/);
  await page.locator('.evaluation-ledger-event__link').filter({ hasText: 'Seguimiento' }).first().click();
  await page.locator('#fhEvaluationLedgerStatus').waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  const restoredFollowup = await page.evaluate(() => ({
    visit: FarmaciaSeguimiento.getCurrentVisit(),
    lines: FarmaciaSeguimiento.getCurrentCanonicalLines(),
    related: FarmaciaSeguimiento.getFollowupOtherDrugs()
  }));
  assert.equal(restoredFollowup.visit.visit_id, 'SYN-VIS-DYNAMIC-001');
  assert.deepEqual(restoredFollowup.visit.selected_line_ids, ['LINE-DYN-1']);
  assert.deepEqual(restoredFollowup.visit.dispensed_line_ids, ['LINE-DYN-1']);
  assert.equal(restoredFollowup.lines[0].linea_id, 'LINE-DYN-1');
  assert.equal(restoredFollowup.related[0].uid, 'REL-DYN-1');
  assert.equal(restoredFollowup.visit.adverse_event.observations, 'EA ficticio restaurable');
  assert.equal(restoredFollowup.visit.causality_by_suspect['line:LINE-DYN-1'].final_assessment, 'Posible');
  assert.equal(await page.locator('#fhSegLineaPrincipal').inputValue(), 'LINE-DYN-1');
  assert.equal(await page.locator('#fhSegObservacionesLinea').inputValue(), 'Línea ficticia restaurable');
  assert.equal(await page.locator('#fhSeguimientoEaObservaciones').inputValue(), 'EA ficticio restaurable');

  await page.goto(new URL('farmacia_index.html', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.locator('#fhEvaluationLedgerIndex').waitFor({ state: 'visible' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#fhEvaluationLedgerIndex').waitFor({ state: 'visible' });
  assert.match(await page.locator('#fhEvaluationLedgerIndex').textContent(), /3 actos guardados/, 'ledger survives a browser reload');

  page.once('dialog', dialog => dialog.accept());
  await page.locator('#fhEvaluationLedgerClearAll').click();
  await page.waitForTimeout(100);
  assert.match(await page.locator('#fhEvaluationLedgerIndex').textContent(), /0 actos guardados/);

  const fallbackContext = await browser.newContext();
  await fallbackContext.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (String(key).includes('promueve.fh.synthetic-evaluation-ledger')) throw new Error('synthetic storage blocked');
      return originalSetItem.call(this, key, value);
    };
  });
  const fallbackPage = await fallbackContext.newPage();
  const fallbackErrors = [];
  fallbackPage.on('pageerror', error => fallbackErrors.push(error.message));
  await fallbackPage.goto(new URL('farmacia_validacion.html', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await fallbackPage.locator('#fhEvaluationLedgerPanel').waitFor({ state: 'visible' });
  await fallbackPage.locator('#fhOrigenEntrada').selectOption('manual_farmacia');
  await fallbackPage.locator('#fhServicioManual').selectOption('derma');
  await fallbackPage.locator('#fhPatologiaManual').selectOption({ label: 'Hidradenitis supurativa' });
  await fallbackPage.locator('#fhManualCip').fill('CIP-MEMORY-ONLY');
  await fallbackPage.locator('#fhEvaluationLedgerSyntheticConfirm').check();
  assert.equal(await fallbackPage.locator('#fhEvaluationLedgerSave').isDisabled(), false, 'memory fallback remains usable from the UI');
  await fallbackPage.locator('#fhEvaluationLedgerSave').click();
  assert.match(await fallbackPage.locator('#fhEvaluationLedgerStatus').textContent(), /temporal/);
  assert.equal(await fallbackPage.evaluate(() => FarmaciaEvaluationLedger.listEvents().length), 1);
  assert.deepEqual(fallbackErrors, []);
  await fallbackContext.close();

  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join('\n')}`);
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('\n')}`);
  console.log('farmacia_evaluation_ledger_browser_check: PASSED');
  console.log('validation create/update; index; reopen/restore; first visit; follow-up; reload; clear; console/pageerror 0.');
} finally {
  await browser.close();
}
