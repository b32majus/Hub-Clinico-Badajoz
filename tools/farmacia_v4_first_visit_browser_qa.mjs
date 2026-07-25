#!/usr/bin/env node

import { assert, browser, page, consoleErrors, pageErrors, goto, clearSession, importNursingWorkbook, waitValidation, assertRealImportBoard } from './farmacia_v4_validation_browser_qa_helpers.mjs';

const START_DATE = '2026-07-25';
const CORE_KEY = 'farmaciaDemo.multitreatment.v1';

async function clearClipboard() {
  await page.evaluate(async () => navigator.clipboard.writeText(''));
}

async function readClipboard() {
  return page.evaluate(async () => navigator.clipboard.readText());
}

async function canonicalGraph(patientId) {
  return page.evaluate(({ key, id }) => {
    const parsed = JSON.parse(sessionStorage.getItem(key));
    return parsed.patients[id];
  }, { key: CORE_KEY, id: patientId });
}

await clearSession();
await importNursingWorkbook();
const importedC = await assertRealImportBoard();
await importedC.locator('[data-enf-action="validar"]').click();
await waitValidation();

await page.selectOption('#fhValEstado', 'validated');
await page.click('#fhValSaveV4');
await page.waitForFunction(() => /Validado · pendiente de inicio/.test(document.getElementById('fhValV4Status')?.textContent || ''));

const firstVisitHref = await page.locator('#fhValGoFirstVisitV4').getAttribute('href');
assert.ok(firstVisitHref, 'Validated state must expose a First Visit href');
const firstVisitUrl = new URL(firstVisitHref, 'http://local.test');
const patientId = firstVisitUrl.searchParams.get('patient_id');
const lineId = firstVisitUrl.searchParams.get('line_id');
assert.equal(patientId, 'fhv4-import-nursing-000000003');
assert.match(lineId, /^line_/);
assert.equal(firstVisitUrl.searchParams.get('cip'), '000000003');

let graph = await canonicalGraph(patientId);
assert.equal(graph.lines[lineId].status, 'validated_not_started');
assert.equal(graph.lines[lineId].start_date, '');
assert.equal(Object.values(graph.movements).filter((movement) => movement.movement_type === 'start').length, 0);

await page.click('#fhValGoFirstVisitV4');
await page.waitForSelector('#fhPvConfirmStart');
await page.waitForFunction(() => window.FarmaciaFirstVisitStartV4 && window.FarmaciaFirstVisitStartV4.getCanonicalLine());
await page.waitForTimeout(250);

assert.equal(new URL(page.url()).searchParams.get('patient_id'), patientId);
assert.equal(new URL(page.url()).searchParams.get('line_id'), lineId);
assert.equal((await page.textContent('#fhPvStartLineId')).trim(), lineId);
assert.match(await page.textContent('#fhPvStartState'), /Validado · pendiente de inicio/);
assert.equal(await page.inputValue('#fhPvFecha'), '', 'clinical start date must not be prefilled');
assert.equal(await page.inputValue('#fhPvInduccionRealizada'), '', 'induction must start neutral');
assert.equal(await page.inputValue('#fhPvEstratificacion'), '', 'stratification must start neutral');
assert.equal(await page.inputValue('#fhPvProms'), '', 'PROMs must start neutral');
assert.equal(await page.isDisabled('#fhPvExportTxt'), true, 'JARA export must be blocked before canonical start');
assert.equal(await page.isDisabled('#fhPvExcelExportBtn'), true, 'Excel export must be blocked before canonical start');
assert.equal(await page.locator('#fhPvGoFollowup:not(.hidden)').count(), 0, 'Follow-up must remain hidden before start');

await page.fill('#fhPvFecha', START_DATE);
graph = await canonicalGraph(patientId);
assert.equal(graph.lines[lineId].status, 'validated_not_started', 'writing date must not activate line');
assert.equal(graph.lines[lineId].start_date, '', 'DOM date must not leak into canonical state');
assert.equal(Object.values(graph.movements).filter((movement) => movement.movement_type === 'start').length, 0);

await page.click('#fhPvConfirmStart');
await page.waitForFunction(() => /Tratamiento activo/.test(document.getElementById('fhPvStartState')?.textContent || ''));
await page.waitForTimeout(200);

graph = await canonicalGraph(patientId);
const starts = Object.values(graph.movements).filter((movement) => movement.movement_type === 'start' && movement.target_line_id === lineId);
assert.equal(graph.lines[lineId].line_id, lineId);
assert.equal(graph.lines[lineId].status, 'active');
assert.equal(graph.lines[lineId].start_date, START_DATE);
assert.equal(starts.length, 1);
assert.equal(starts[0].effective_at, START_DATE);
assert.equal(starts[0].declared_by_demo, 'Profesional FH-01');
assert.equal(await page.inputValue('#fhPvFecha'), START_DATE);
assert.equal(await page.isDisabled('#fhPvFecha'), true, 'confirmed date must be locked');
assert.equal(await page.locator('#fhPvConfirmStart:not(.hidden)').count(), 0, 'confirmation action must disappear after start');
assert.equal(await page.isDisabled('#fhPvExportTxt'), false);
assert.equal(await page.isDisabled('#fhPvExcelExportBtn'), false);

await clearClipboard();
await page.click('#fhPvExportTxt');
await page.waitForFunction(async () => (await navigator.clipboard.readText()).length > 0);
const report = await readClipboard();
assert.match(report, new RegExp(`Línea: ${lineId}`));
assert.match(report, /Estado línea: active/);
assert.match(report, new RegExp(`Fecha real de inicio: ${START_DATE}`));
assert.match(report, /Profesional demo de inicio: Profesional FH-01/);

await clearClipboard();
await page.click('#fhPvExcelExportBtn');
await page.waitForFunction(async () => (await navigator.clipboard.readText()).length > 0);
const excelClipboard = await readClipboard();
const cells = excelClipboard.split('\t');
assert.equal(cells.length, 61, 'First Visit export must preserve 61 columns');
assert.equal(cells[12], lineId, 'Excel must preserve canonical line_id');
assert.equal(cells[22], 'active', 'Excel must export active state only after confirmation');
assert.equal(cells[25], START_DATE, 'Excel must export canonical start date');

const followHref = await page.locator('#fhPvGoFollowup').getAttribute('href');
assert.ok(followHref);
const followUrl = new URL(followHref, 'http://local.test');
assert.equal(followUrl.searchParams.get('patient_id'), patientId);
assert.equal(followUrl.searchParams.get('line_id'), lineId);
assert.equal(followUrl.searchParams.get('entrada'), 'seguimiento');

const movementCountBeforeReload = starts.length;
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.FarmaciaFirstVisitStartV4 && window.FarmaciaFirstVisitStartV4.isStartConfirmed());
assert.match(await page.textContent('#fhPvStartState'), /Tratamiento activo/);
assert.equal(await page.inputValue('#fhPvFecha'), START_DATE);
graph = await canonicalGraph(patientId);
assert.equal(Object.values(graph.movements).filter((movement) => movement.movement_type === 'start' && movement.target_line_id === lineId).length, movementCountBeforeReload);

await goto('farmacia_validacion.html?cip=000000003&entrada=validacion');
await waitValidation();
assert.equal(await page.locator('#fhValEstado option[value="pending"]:disabled').count(), 1, 'Pending must be disabled after start');
assert.equal(await page.locator('#fhValEstado option[value="denied"]:disabled').count(), 1, 'Denied must be disabled after start');
assert.equal(await page.isDisabled('#fhValSaveV4'), true, 'Validation save must be blocked after active start');
assert.match(await page.textContent('#fhValTransitionGuardNote'), /El tratamiento ya está iniciado/);

graph = await canonicalGraph(patientId);
assert.equal(graph.lines[lineId].status, 'active');
assert.equal(Object.values(graph.movements).filter((movement) => movement.movement_type === 'start' && movement.target_line_id === lineId).length, 1);

await goto(`farmacia_primera_visita.html?cip=000000003&line_id=${encodeURIComponent(lineId)}&entrada=primera_visita`);
await page.waitForSelector('#fhPvConfirmStart');
assert.equal(await page.isDisabled('#fhPvConfirmStart'), true, 'missing patient_id must fail closed');
assert.equal(await page.isDisabled('#fhPvExportTxt'), true);
assert.match(await page.textContent('#fhPvStartMessage'), /Falta patient_id/);

await goto(`farmacia_primera_visita.html?cip=000000003&patient_id=${encodeURIComponent(patientId)}&line_id=line_wrong&entrada=primera_visita`);
await page.waitForSelector('#fhPvConfirmStart');
assert.equal(await page.isDisabled('#fhPvConfirmStart'), true, 'unknown line must fail closed');
assert.match(await page.textContent('#fhPvStartMessage'), /línea indicada no existe/i);

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);

await browser.close();
console.log('farmacia_v4_first_visit_browser_qa: PASSED_SUPPORTED_S08');
