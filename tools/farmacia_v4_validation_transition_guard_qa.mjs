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

await clearSession();
await importNursingWorkbook();
const importedC = await assertRealImportBoard();
await importedC.locator('[data-enf-action="validar"]').click();
await waitValidation();
await page.waitForFunction(() => window.FarmaciaValidationTransitionGuardV4);

await page.selectOption('#fhValEstado', 'validated');
await page.click('#fhValSaveV4');
await page.waitForFunction(() => /Validado · pendiente de inicio/.test(document.getElementById('fhValV4Status')?.textContent || ''));
await page.waitForTimeout(250);

const firstVisit = page.locator('#fhValGoFirstVisitV4');
assert.equal(await firstVisit.isVisible(), true, 'First Visit must be visible after canonical validated save');
assert.match(await firstVisit.getAttribute('href'), /farmacia_primera_visita\.html/, 'First Visit must have a supported href');
assert.equal(await page.locator('#fhValEstado option[value="pending"]').isDisabled(), true, 'Pending must be disabled after a line is produced');
assert.equal(await page.locator('#fhValEstado option[value="denied"]').isDisabled(), true, 'Denied must be disabled after a line is produced');
assert.match(await page.textContent('#fhValTransitionGuardNote'), /anulación/i, 'UI must explain explicit rectification requirement');

await page.evaluate(() => {
  const select = document.getElementById('fhValEstado');
  select.value = 'pending';
  select.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForTimeout(100);
assert.equal(await page.inputValue('#fhValEstado'), 'validated', 'Programmatic downgrade must restore canonical validated value');
assert.match(await page.textContent('#fhValV4Status'), /No puede cambiarse directamente/i, 'Invalid downgrade must show a clear Spanish message');
assert.equal(await firstVisit.isVisible(), true, 'First Visit remains coherent with the restored canonical state');
assert.match(await firstVisit.getAttribute('href'), /farmacia_primera_visita\.html/);

await page.fill('#fhValidadoDosis', '15 mg');
await page.waitForTimeout(100);
assert.equal(await firstVisit.isVisible(), false, 'Unsaved treatment changes must hide First Visit');
assert.equal(await firstVisit.getAttribute('href'), null, 'Unsaved treatment changes must remove the supported href');
assert.equal(await firstVisit.getAttribute('aria-disabled'), 'true');
assert.match(await page.textContent('#fhValV4Status'), /cambios sin guardar/i);

await page.click('#fhValSaveV4');
await page.waitForFunction(() => /Validación guardada en la sesión demo/.test(document.getElementById('fhValV4Status')?.textContent || ''));
await page.waitForFunction(() => {
  const link = document.getElementById('fhValGoFirstVisitV4');
  return link && !link.classList.contains('hidden') && /farmacia_primera_visita\.html/.test(link.getAttribute('href') || '');
});
assert.equal(await page.inputValue('#fhValEstado'), 'validated');

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);

await browser.close();
console.log('farmacia_v4_validation_transition_guard_qa: PASSED');
