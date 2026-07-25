#!/usr/bin/env node

import {
  assert,
  browser,
  page,
  consoleErrors,
  pageErrors,
  clearSession,
  importNursingWorkbook,
  waitValidation,
  assertRealImportBoard
} from './farmacia_v4_validation_browser_qa_helpers.mjs';

async function snapshot() {
  return page.evaluate(() => window.FarmaciaValidationTransitionGuardV4.canonicalSnapshot());
}

async function saveAndWait(label) {
  await page.click('#fhValSaveV4');
  await page.waitForFunction((expected) => (document.getElementById('fhValV4Status')?.textContent || '').includes(expected), label);
  await page.waitForTimeout(150);
}

await clearSession();
await importNursingWorkbook();
const importedC = await assertRealImportBoard();
await importedC.locator('[data-enf-action="validar"]').click();
await waitValidation();
await page.waitForFunction(() => window.FarmaciaValidationTransitionGuardV4 && window.FarmaciaValidationRectificationV4);

const firstVisit = page.locator('#fhValGoFirstVisitV4');

await page.selectOption('#fhValEstado', 'validated');
await saveAndWait('Validado · pendiente de inicio');
assert.equal(await firstVisit.isVisible(), true, 'First Visit must be visible after validated save');
assert.equal(await page.locator('#fhValEstado option[value="pending"]').isDisabled(), false, 'Pending must remain available');
assert.equal(await page.locator('#fhValEstado option[value="denied"]').isDisabled(), false, 'Denied must remain available');
let state = await snapshot();
assert.equal(state.result, 'validated');
assert.ok(state.produced_line_id);
assert.ok(state.line);

await page.selectOption('#fhValEstado', 'pending');
await page.waitForTimeout(100);
assert.equal(await firstVisit.isVisible(), false, 'Changing to Pending must hide First Visit immediately');
assert.equal(await firstVisit.getAttribute('href'), null, 'Hidden First Visit must not keep a functional href');
assert.match(await page.textContent('#fhValTransitionGuardNote'), /retirará la línea pendiente de inicio/i);
await saveAndWait('Pendiente');
state = await snapshot();
assert.equal(state.result, 'pending');
assert.equal(state.produced_line_id, '');
assert.equal(state.line, null);
assert.equal(await firstVisit.isVisible(), false);

await page.selectOption('#fhValEstado', 'validated');
await saveAndWait('Validado · pendiente de inicio');
state = await snapshot();
assert.equal(state.result, 'validated');
assert.ok(state.produced_line_id);
assert.ok(state.line);
assert.equal(await firstVisit.isVisible(), true, 'Revalidation must restore First Visit');

await page.selectOption('#fhValEstado', 'denied');
await page.fill('#fhValMotivo', 'Rectificación demo por error de selección');
await page.waitForTimeout(100);
assert.equal(await firstVisit.isVisible(), false, 'Changing to Denied must hide First Visit immediately');
await saveAndWait('Denegado');
state = await snapshot();
assert.equal(state.result, 'denied');
assert.equal(state.produced_line_id, '');
assert.equal(state.line, null);
assert.equal(await firstVisit.isVisible(), false);

await page.selectOption('#fhValEstado', 'validated');
await saveAndWait('Validado · pendiente de inicio');
state = await snapshot();
assert.ok(state.line);
assert.equal(await firstVisit.isVisible(), true);

await page.fill('#fhValidadoDosis', '15 mg');
await page.waitForTimeout(100);
assert.equal(await firstVisit.isVisible(), false, 'Unsaved treatment changes must hide First Visit');
await saveAndWait('Validado · pendiente de inicio');
assert.equal(await firstVisit.isVisible(), true, 'Saving the validated correction must restore First Visit');

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);

await browser.close();
console.log('farmacia_v4_validation_transition_guard_qa: PASSED_REVERSIBLE_BEFORE_FIRST_VISIT');
