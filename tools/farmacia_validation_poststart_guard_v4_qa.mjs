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

const START_DATE = '2026-07-25';
const STORAGE_KEY = 'farmaciaDemo.multitreatment.v1';
const NOTE = 'El tratamiento ya está iniciado. Los cambios posteriores requieren un movimiento clínico trazable.';

async function canonicalSnapshot() {
  return page.evaluate(() => window.FarmaciaValidationTransitionGuardV4.canonicalSnapshot());
}

async function graphSnapshot(patientId, lineId) {
  return page.evaluate(({ key, patientId: expectedPatientId, lineId: expectedLineId }) => {
    const state = JSON.parse(sessionStorage.getItem(key));
    const patient = state.patients[expectedPatientId];
    return {
      line: patient.lines[expectedLineId],
      starts: Object.values(patient.movements).filter((movement) => (
        movement.movement_type === 'start' && movement.target_line_id === expectedLineId
      ))
    };
  }, { key: STORAGE_KEY, patientId, lineId });
}

async function assertPoststartLock(patientId, lineId) {
  await page.waitForFunction((expected) => (
    document.getElementById('fhValTransitionGuardNote')?.textContent === expected &&
    document.getElementById('fhValSaveV4')?.disabled === true
  ), NOTE);

  assert.equal(await page.inputValue('#fhValEstado'), 'validated');
  assert.equal(await page.locator('#fhValEstado option[value="validated"]').isDisabled(), false);
  assert.equal(await page.locator('#fhValEstado option[value="pending"]').isDisabled(), true);
  assert.equal(await page.locator('#fhValEstado option[value="denied"]').isDisabled(), true);
  assert.equal(await page.locator('#fhValSaveV4').isDisabled(), true);
  assert.equal(await page.locator('#fhValSaveV4').getAttribute('aria-disabled'), 'true');
  assert.equal(await page.locator('#fhValSaveV4').getAttribute('title'), NOTE);
  assert.equal(await page.locator('#fhValTransitionGuardNote').count(), 1);
  assert.equal(await page.locator('#fhValTransitionGuardNote').getAttribute('role'), 'note');
  assert.equal(await page.locator('#fhValTransitionGuardNote').isVisible(), true);
  assert.equal(await page.textContent('#fhValTransitionGuardNote'), NOTE);

  const canonical = await canonicalSnapshot();
  assert.equal(canonical.result, 'validated');
  assert.equal(canonical.produced_line_id, lineId);
  assert.equal(canonical.line.line_id, lineId);
  assert.equal(canonical.line.status, 'active');
  assert.equal(canonical.line.start_date, START_DATE);

  const graph = await graphSnapshot(patientId, lineId);
  assert.equal(graph.line.line_id, lineId);
  assert.equal(graph.line.status, 'active');
  assert.equal(graph.line.start_date, START_DATE);
  assert.equal(graph.starts.length, 1);
  assert.equal(graph.starts[0].target_line_id, lineId);
  assert.equal(graph.starts[0].effective_at, START_DATE);
}

try {
  await clearSession();
  await importNursingWorkbook();
  const importedC = await assertRealImportBoard();
  await importedC.locator('[data-enf-action="validar"]').click();
  await waitValidation();
  await page.waitForFunction(() => window.FarmaciaValidationTransitionGuardV4 && window.FarmaciaValidationRectificationV4);

  const patientId = await page.evaluate(() => window.FarmaciaDemo.getQueryContext().patient.patient_id);
  await page.selectOption('#fhValEstado', 'validated');
  await page.click('#fhValSaveV4');
  await page.waitForFunction(() => /Validado · pendiente de inicio/.test(document.getElementById('fhValV4Status')?.textContent || ''));
  await page.waitForTimeout(150);

  const prestart = await canonicalSnapshot();
  const lineId = prestart.produced_line_id;
  assert.ok(lineId);
  assert.equal(prestart.result, 'validated');
  assert.equal(prestart.line.line_id, lineId);
  assert.equal(prestart.line.status, 'validated_not_started');
  assert.equal(prestart.line.start_date, '');
  assert.equal(await page.locator('#fhValEstado option[value="validated"]').isDisabled(), false);
  assert.equal(await page.locator('#fhValEstado option[value="pending"]').isDisabled(), false);
  assert.equal(await page.locator('#fhValEstado option[value="denied"]').isDisabled(), false);
  assert.equal(await page.locator('#fhValSaveV4').isDisabled(), false);
  assert.equal(await page.locator('#fhValTransitionGuardNote').isVisible(), false);
  assert.equal(await page.textContent('#fhValTransitionGuardNote'), '');

  const firstVisit = page.locator('#fhValGoFirstVisitV4:not(.hidden)');
  await Promise.all([
    page.waitForURL((url) => url.pathname.endsWith('/farmacia_primera_visita.html')),
    firstVisit.click()
  ]);
  await page.waitForSelector('#fhPvCanonicalContext[data-context-state="ready"]');
  assert.equal((await page.textContent('#fhPvCanonicalLineId')).trim(), lineId);
  assert.equal((await page.textContent('#fhPvCanonicalLineStatus')).trim(), 'validated_not_started');
  assert.equal(await page.inputValue('#fhPvFecha'), '');

  await page.fill('#fhPvFecha', START_DATE);
  await page.click('#fhPvConfirmStart');
  await page.waitForSelector('#fhPvCanonicalContext[data-context-state="active"]');

  let graph = await graphSnapshot(patientId, lineId);
  assert.equal(graph.line.line_id, lineId);
  assert.equal(graph.line.status, 'active');
  assert.equal(graph.line.start_date, START_DATE);
  assert.equal(graph.starts.length, 1);

  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.waitForURL((url) => url.pathname.endsWith('/farmacia_validacion.html'));
  await waitValidation();
  await page.waitForFunction(() => window.FarmaciaValidationTransitionGuardV4);
  await assertPoststartLock(patientId, lineId);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitValidation();
  await page.waitForFunction(() => window.FarmaciaValidationTransitionGuardV4);
  await assertPoststartLock(patientId, lineId);

  graph = await graphSnapshot(patientId, lineId);
  assert.equal(graph.line.line_id, lineId);
  assert.equal(graph.line.start_date, START_DATE);
  assert.equal(graph.starts.length, 1);
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);

  console.log('farmacia_validation_poststart_guard_v4_qa: PASSED_SUPPORTED_START_BACK_RELOAD_LOCK');
} finally {
  await browser.close();
}
