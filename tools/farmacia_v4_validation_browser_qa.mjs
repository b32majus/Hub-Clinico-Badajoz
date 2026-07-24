#!/usr/bin/env node

import { assert, browser, page, consoleErrors, pageErrors, goto, clearSession, importNursingWorkbook, waitValidation, exportExcelRow, exportReport, assertBlockedBeforeSave, assertRealImportBoard } from './farmacia_v4_validation_browser_qa_helpers.mjs';

function assertCanonicalPendingRow(cells) {
  assert.match(cells[0], /^fhv4-import-nursing-000000003$/);
  assert.equal(cells[1], '000000003');
  assert.match(cells[10], /^val_/);
  assert.equal(cells[12], '', 'pending must not contain line_id');
  assert.equal(cells[14], 'pendiente');
  assert.equal(cells[22], '', 'pending must not contain line status');
  assert.equal(cells[24], '', 'pending must not claim a primary line');
  assert.equal(cells[34], 'pendiente');
  assert.equal(cells[38], 'No informado', 'vaccination must not be inferred from Preventive Medicine');
}

function assertCanonicalValidatedRow(cells) {
  assert.match(cells[0], /^fhv4-import-nursing-000000003$/);
  assert.equal(cells[1], '000000003');
  assert.match(cells[10], /^val_/);
  assert.match(cells[12], /^line_/);
  assert.equal(cells[14], 'completado');
  assert.equal(cells[22], 'validated_not_started');
  assert.equal(cells[24], 'TRUE');
  assert.equal(cells[25], '', 'validated_not_started must not contain start date');
  assert.equal(cells[34], 'validado');
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
assert.equal((await page.textContent('#upperPbStatusAnaliticaReciente')).trim(), 'OK', 'generic analytic status must remain explicit');
assert.equal((await page.textContent('#pbStatusAnaliticaReciente')).trim(), 'No informado', 'analytic recency must not be inferred');
assert.equal((await page.textContent('#pbStatusVacunacion')).trim(), 'No informado', 'vaccination must not be inferred from Preventive Medicine');
assert.equal((await page.textContent('#pbStatusMedPreventiva')).trim(), 'OK');
for (const selector of ['#fhReumaDosis', '#fhReumaVia', '#fhReumaPauta']) {
  assert.equal((await page.textContent(selector)).trim(), 'No informado', `${selector} must present missing source data as No informado`);
}
for (const selector of ['#fhValidadoDosis', '#fhValidadoVia', '#fhValidadoPauta', '#fhValidadoPresentacion', '#fhValidadoInduccion']) {
  assert.equal(await page.inputValue(selector), '', `${selector} must remain empty for imported Paciente C`);
}

await assertBlockedBeforeSave('#fhValExcelExportBtn');
await assertBlockedBeforeSave('#fhValExportTxt');

await page.selectOption('#fhValEstado', 'pending');
await page.fill('#fhValObservaciones', 'Pendiente de información adicional');
await page.click('#fhValSaveV4');
await page.waitForFunction(() => /Pendiente/.test(document.getElementById('fhValV4Status')?.textContent || ''));
assert.equal(await page.locator('#fhValGoFirstVisitV4:not(.hidden)').count(), 0, 'Pending must not enable First Visit');

// Cambiar el DOM sin guardar no puede alterar la verdad exportada.
await page.selectOption('#fhValEstado', 'validated');
let pendingExport = await exportExcelRow();
assertCanonicalPendingRow(pendingExport.cells);
const expectedLocalDate = await page.evaluate(() => {
  const d = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
});
assert.equal(pendingExport.cells[7], expectedLocalDate, 'fecha_acto must use local browser date');
assert.match(pendingExport.cells[57], new RegExp(`^${expectedLocalDate}`), 'created_at must use local browser date');

const pendingReport = await exportReport();
assert.match(pendingReport, /Identificador validación: val_/);
assert.match(pendingReport, /Patient ID: fhv4-import-nursing-000000003/);
assert.match(pendingReport, /Estado validación: Pendiente/);
assert.doesNotMatch(pendingReport, /Estado validación: Validado/);
assert.match(pendingReport, /Dosis solicitada: No informado/);
assert.match(pendingReport, /Analítica: OK/);
assert.match(pendingReport, /Recencia analítica <3 meses: No informado/);
assert.match(pendingReport, /Vacunación: No informado/);
assert.match(pendingReport, /Medicina preventiva: OK/);
assert.doesNotMatch(pendingReport, /Pendiente de completar por Farmacia/);

await page.reload({ waitUntil: 'domcontentloaded' });
await waitValidation();
assert.equal(await page.inputValue('#fhValEstado'), 'pending');
assert.equal(await page.inputValue('#fhValObservaciones'), 'Pendiente de información adicional');

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
const validatedExport = await exportExcelRow();
assertCanonicalValidatedRow(validatedExport.cells);
const validatedReport = await exportReport();
assert.match(validatedReport, /Estado validación: Validado · pendiente de inicio/);
assert.match(validatedReport, /Estado línea: validated_not_started/);
assert.match(validatedReport, /Línea: line_/);

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
const deniedExport = await exportExcelRow();
assert.match(deniedExport.cells[10], /^val_/);
assert.equal(deniedExport.cells[12], '');
assert.equal(deniedExport.cells[22], '');
assert.equal(deniedExport.cells[34], 'denegado');
const deniedReport = await exportReport();
assert.match(deniedReport, /Estado validación: Denegado/);
assert.match(deniedReport, /Motivo denegación: Motivo sintético de denegación/);
assert.match(deniedReport, /No existe una línea terapéutica validada/);

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
console.log('farmacia_v4_validation_browser_qa: PASSED_CANONICAL_EXPORT_TRUTH');
