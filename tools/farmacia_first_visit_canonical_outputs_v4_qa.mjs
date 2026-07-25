#!/usr/bin/env node

import {
  assert, browser, page, consoleErrors, pageErrors, clearSession, importNursingWorkbook,
  waitValidation, assertRealImportBoard
} from './farmacia_v4_validation_browser_qa_helpers.mjs';

const START_DATE = '2026-07-24';
const downloads = [];
page.on('download', (download) => downloads.push(download.suggestedFilename()));

async function clipboard(value) {
  if (value !== undefined) await page.evaluate((next) => navigator.clipboard.writeText(next), value);
  return page.evaluate(() => navigator.clipboard.readText());
}

async function contextSnapshot() {
  return page.evaluate(() => {
    const resolved = window.FarmaciaFirstVisitExportsV4.resolveActiveContext(window);
    if (!resolved.ok) return resolved;
    const c = resolved.context;
    return { ok: true, patientId: c.patient_id, lineId: c.line_id, validationId: c.validation_act.validation_act_id,
      status: c.line.status, startDate: c.line.start_date, starts: Object.values(JSON.parse(sessionStorage.getItem('farmaciaDemo.multitreatment.v1')).patients[c.patient_id].movements)
        .filter((m) => m.movement_type === 'start' && m.target_line_id === c.line_id) };
  });
}

try {
  await clearSession();
  await importNursingWorkbook();
  const importedC = await assertRealImportBoard();
  await importedC.locator('[data-enf-action="validar"]').click();
  await waitValidation();

  await page.selectOption('#fhValEstado', 'validated');
  await page.click('#fhValSaveV4');
  await page.waitForFunction(() => /Validado · pendiente de inicio/.test(document.getElementById('fhValV4Status')?.textContent || ''));
  const validation = await page.evaluate(() => window.FarmaciaValidationTransitionGuardV4.canonicalSnapshot());
  assert.equal(validation.result, 'validated');
  assert.ok(validation.produced_line_id);

  await Promise.all([
    page.waitForURL((url) => url.pathname.endsWith('/farmacia_primera_visita.html')),
    page.locator('#fhValGoFirstVisitV4:not(.hidden)').click()
  ]);
  await page.waitForSelector('#fhPvCanonicalContext[data-context-state="ready"]');
  await page.waitForFunction(() => window.FarmaciaFirstVisitExportsV4);

  assert.equal(await page.inputValue('#fhPvFecha'), '');
  for (const id of ['fhPvInduccionRealizada', 'fhPvEstratificacion', 'fhPvProms']) assert.equal(await page.inputValue(`#${id}`), '');
  for (const id of ['fhPvExportTxt', 'fhPvExportCsv', 'fhPvExcelExportBtn']) {
    assert.equal(await page.locator(`#${id}`).isDisabled(), true);
    assert.equal(await page.locator(`#${id}`).getAttribute('title'), 'Confirme el inicio de tratamiento antes de generar salidas de Primera Visita.');
  }

  await clipboard('');
  const downloadsBefore = downloads.length;
  assert.equal(await page.locator('#fhPvExportCsv').isVisible(), false, 'CSV remains hidden');
  for (const id of ['fhPvExportTxt', 'fhPvExcelExportBtn']) await page.locator(`#${id}`).click({ force: true });
  await page.waitForTimeout(100);
  assert.equal(await clipboard(), '', 'pending clicks must not write clipboard');
  assert.equal(downloads.length, downloadsBefore, 'pending clicks must not download');

  await page.fill('#fhPvFecha', START_DATE);
  await page.click('#fhPvConfirmStart');
  await page.waitForSelector('#fhPvCanonicalContext[data-context-state="active"]');
  const active = await contextSnapshot();
  assert.equal(active.ok, true); assert.equal(active.lineId, validation.produced_line_id); assert.equal(active.status, 'active');
  assert.equal(active.startDate, START_DATE); assert.equal(active.starts.length, 1); assert.equal(active.starts[0].effective_at, START_DATE);
  assert.equal(active.starts[0].validation_act_id, active.validationId); assert.equal(active.starts[0].declared_by_demo, 'Profesional FH-01');
  for (const id of ['fhPvExportTxt', 'fhPvExportCsv', 'fhPvExcelExportBtn']) assert.equal(await page.locator(`#${id}`).isDisabled(), false);

  await page.selectOption('#fhPvInduccionRealizada', 'No');
  await page.selectOption('#fhPvEstratificacion', 'Nivel 2');
  await page.selectOption('#fhPvProms', 'No');

  await clipboard('');
  await page.click('#fhPvExportTxt');
  await page.waitForFunction(async () => (await navigator.clipboard.readText()).length > 0);
  const jara = await clipboard();
  assert.match(jara, new RegExp(`Patient ID: ${active.patientId}`)); assert.match(jara, new RegExp(`Line ID: ${active.lineId}`));
  assert.match(jara, new RegExp(`Validation ID: ${active.validationId}`)); assert.match(jara, new RegExp(`Fecha canónica de inicio: ${START_DATE}`));
  assert.match(jara, /Inducción realizada: No/); assert.match(jara, /Estratificación: Nivel 2/); assert.match(jara, /PROMs basales: No/);
  assert.doesNotMatch(jara, /visita_id|tratamiento_id|FH-PV-/i);

  await clipboard('');
  await page.click('#fhPvExcelExportBtn');
  await page.waitForFunction(async () => (await navigator.clipboard.readText()).includes('\t'));
  const cells = (await clipboard()).split('\t');
  assert.equal(cells.length, 61); assert.equal(cells[0], active.patientId); assert.notEqual(cells[1], cells[0]);
  assert.equal(cells[9], ''); assert.equal(cells[10], active.validationId); assert.equal(cells[11], ''); assert.equal(cells[12], active.lineId);
  assert.equal(cells[7], START_DATE); assert.equal(cells[13], 'Profesional FH-01'); assert.equal(cells[14], 'completado');
  assert.equal(cells[22], 'active'); assert.equal(cells[23], 'start'); assert.equal(cells[25], START_DATE); assert.equal(cells[34], 'validado');
  assert.equal(cells[43], '', 'PROM choice No is not an EVA result'); assert.equal(cells[44], '', 'PROM choice No is not a DLQI result');
  assert.equal(cells[60], '', 'empty explicit notes remain empty and induction/stratification are not mapped to observations');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#fhPvCanonicalContext[data-context-state="active"]');
  await page.waitForFunction(() => window.FarmaciaFirstVisitExportsV4);
  assert.equal(await page.inputValue('#fhPvFecha'), START_DATE);
  assert.equal((await page.textContent('#fhPvCanonicalLineId')).trim(), active.lineId);
  for (const id of ['fhPvExportTxt', 'fhPvExportCsv', 'fhPvExcelExportBtn']) assert.equal(await page.locator(`#${id}`).isDisabled(), false);
  await page.selectOption('#fhPvInduccionRealizada', 'No'); await page.selectOption('#fhPvEstratificacion', 'Nivel 2'); await page.selectOption('#fhPvProms', 'No');
  await clipboard(''); await page.click('#fhPvExportTxt'); await page.waitForFunction(async () => (await navigator.clipboard.readText()).length > 0);
  const repeated = await clipboard(); assert.match(repeated, new RegExp(`Line ID: ${active.lineId}`)); assert.match(repeated, new RegExp(`Fecha canónica de inicio: ${START_DATE}`));

  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
  console.log('farmacia_first_visit_canonical_outputs_v4_qa: PASSED_SUPPORTED_IMPORT_START_OUTPUTS_RELOAD');
} finally {
  await browser.close();
}
