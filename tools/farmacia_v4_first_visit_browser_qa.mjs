#!/usr/bin/env node

import { assert, browser, page, consoleErrors, pageErrors, goto, clearSession, importNursingWorkbook, waitValidation, assertRealImportBoard } from './farmacia_v4_validation_browser_qa_helpers.mjs';

async function clipboard() {
  return page.evaluate(async () => navigator.clipboard.readText());
}

await clearSession();
await importNursingWorkbook();
const importedC = await assertRealImportBoard();
await importedC.locator('[data-enf-action="validar"]').click();
await waitValidation();
const validationUrl = page.url();

await page.selectOption('#fhValEstado', 'validated');
await page.click('#fhValSaveV4');
await page.waitForFunction(() => /Validado · pendiente de inicio/.test(document.getElementById('fhValV4Status')?.textContent || ''));

const firstVisit = page.locator('#fhValGoFirstVisitV4:not(.hidden)');
assert.equal(await firstVisit.count(), 1, 'Validated line must enable First Visit');
const firstVisitHref = await firstVisit.getAttribute('href');
assert.match(firstVisitHref, /patient_id=fhv4-import-nursing-000000003/);
assert.match(firstVisitHref, /line_id=line_/);

await firstVisit.click();
await page.waitForFunction(() => window.FarmaciaFirstVisitStartV4 && window.FarmaciaFirstVisitStartV4.getCanonicalLine());
await page.waitForTimeout(250);

const before = await page.evaluate(() => {
  const line = window.FarmaciaFirstVisitStartV4.getCanonicalLine();
  return { lineId: line.line_id, status: line.status, startDate: line.start_date };
});
assert.equal(before.status, 'validated_not_started');
assert.equal(before.startDate, '');
assert.match(page.url(), /patient_id=fhv4-import-nursing-000000003/);
assert.match(page.url(), new RegExp(`line_id=${before.lineId}`));
assert.equal(await page.inputValue('#fhPvFecha'), '', 'Start date must be empty before explicit input');
assert.equal(await page.inputValue('#fhPvInduccionRealizada'), '', 'Induction must start neutral');
assert.equal(await page.inputValue('#fhPvEstratificacion'), '', 'Stratification must start neutral');
assert.equal(await page.inputValue('#fhPvProms'), '', 'PROMs must start neutral');
assert.equal(await page.isDisabled('#fhPvExportTxt'), true, 'JARA export must be blocked before canonical start');
assert.equal(await page.isDisabled('#fhPvExcelExportBtn'), true, 'Excel export must be blocked before canonical start');
assert.equal(await page.locator('#fhPvGoSeguimientoV4:not(.hidden)').count(), 0, 'Follow-up must remain hidden before start');

await page.fill('#fhPvFecha', '2026-07-25');
const afterTyping = await page.evaluate(() => window.FarmaciaFirstVisitStartV4.getCanonicalLine().status);
assert.equal(afterTyping, 'validated_not_started', 'Typing the date must not activate the line');

await page.click('#fhPvConfirmStart');
await page.waitForFunction(() => window.FarmaciaFirstVisitStartV4.isStartConfirmed());

const after = await page.evaluate(() => {
  const api = window.FarmaciaFirstVisitStartV4;
  const line = api.getCanonicalLine();
  const state = window.FarmaciaMultitreatmentCore.createSessionStore(sessionStorage).load();
  const patient = state.patients[new URLSearchParams(location.search).get('patient_id')];
  const starts = Object.values(patient.movements).filter((movement) => movement.movement_type === 'start' && movement.target_line_id === line.line_id);
  return { lineId: line.line_id, status: line.status, startDate: line.start_date, starts: starts.length, professional: starts[0]?.declared_by_demo || '' };
});
assert.equal(after.lineId, before.lineId, 'Start must preserve line_id');
assert.equal(after.status, 'active');
assert.equal(after.startDate, '2026-07-25');
assert.equal(after.starts, 1);
assert.equal(after.professional, 'Profesional FH-01');
assert.equal(await page.isDisabled('#fhPvExportTxt'), false);
assert.equal(await page.isDisabled('#fhPvExcelExportBtn'), false);

const followupHref = await page.locator('#fhPvGoSeguimientoV4').getAttribute('href');
assert.match(followupHref, /patient_id=fhv4-import-nursing-000000003/);
assert.match(followupHref, new RegExp(`line_id=${before.lineId}`));

await page.evaluate(async () => navigator.clipboard.writeText(''));
await page.click('#fhPvExportTxt');
await page.waitForFunction(async () => (await navigator.clipboard.readText()).length > 0);
const report = await clipboard();
assert.match(report, new RegExp(`Línea: ${before.lineId}`));
assert.match(report, /Estado línea: active/);
assert.match(report, /Fecha real de inicio: 2026-07-25/);
assert.match(report, /Profesional FH demo: Profesional FH-01/);

await page.evaluate(async () => navigator.clipboard.writeText(''));
await page.click('#fhPvExcelExportBtn');
await page.waitForFunction(async () => (await navigator.clipboard.readText()).length > 0);
const cells = (await clipboard()).split('\t');
assert.equal(cells.length, 61, 'Excel export must preserve 61 columns');
assert.ok(cells.includes('2026-07-25'), 'Excel export must use the canonical start date');

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.FarmaciaFirstVisitStartV4 && window.FarmaciaFirstVisitStartV4.isStartConfirmed());
assert.equal(await page.inputValue('#fhPvFecha'), '2026-07-25');
assert.equal(await page.isDisabled('#fhPvFecha'), true);
const restored = await page.evaluate(() => {
  const line = window.FarmaciaFirstVisitStartV4.getCanonicalLine();
  const state = window.FarmaciaMultitreatmentCore.createSessionStore(sessionStorage).load();
  const patient = state.patients[new URLSearchParams(location.search).get('patient_id')];
  return { lineId: line.line_id, starts: Object.values(patient.movements).filter((m) => m.movement_type === 'start').length };
});
assert.equal(restored.lineId, before.lineId);
assert.equal(restored.starts, 1);

await page.goto(validationUrl, { waitUntil: 'domcontentloaded' });
await waitValidation();
assert.equal(await page.locator('#fhValEstado option[value="pending"]:disabled').count(), 1, 'Active line must block pre-start pending rectification');
assert.equal(await page.locator('#fhValEstado option[value="denied"]:disabled').count(), 1, 'Active line must block pre-start denied rectification');
assert.match(await page.textContent('#fhValTransitionGuardNote'), /tratamiento ya está iniciado/i);

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
await browser.close();
console.log('farmacia_v4_first_visit_browser_qa: PASSED_S08_SUPPORTED_FLOW');