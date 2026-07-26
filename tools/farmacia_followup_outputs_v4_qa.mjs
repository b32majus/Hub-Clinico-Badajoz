#!/usr/bin/env node

import assert from 'node:assert/strict';
import { browser, page, consoleErrors, pageErrors } from './farmacia_v4_validation_browser_qa_helpers.mjs';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const VISIT_KEY = 'farmaciaDemo.followupConfirmedVisits.v1';
const downloads = [];
page.on('download', (download) => downloads.push(download.suggestedFilename()));
page.removeAllListeners('dialog');
page.on('dialog', async (dialog) => { const action = page.__nextDialogAction || 'dismiss'; page.__nextDialogAction = null; action === 'accept' ? await dialog.accept() : await dialog.dismiss(); });

async function goto(route) { await page.goto(`${BASE_URL}/${route}`, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => document.readyState === 'complete'); await page.evaluate(async () => { if (window.FarmaciaDemo?.ready?.then) await window.FarmaciaDemo.ready; }); }
async function clearSession() { await goto('farmacia_index.html'); await page.evaluate(() => sessionStorage.clear()); }
async function seedVisitRaw(raw) { await clearSession(); await page.evaluate(([key, value]) => sessionStorage.setItem(key, value), [VISIT_KEY, raw]); }
async function openS09() { await goto('farmacia_seguimiento.html?cip=FH-V4-0009&patient_id=fhv4-patient-s09&line_id=fhv4-line-s09&entrada=seguimiento'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); }
async function waitContext(code) { await page.waitForFunction((expected) => document.getElementById('fhSegCanonicalStatus')?.dataset.statusCode === expected, code); }
async function waitOutput(code) { await page.waitForFunction((expected) => document.getElementById('fhSegOutputStatus')?.dataset.statusCode === expected, code); }
async function waitVisit(code) { await page.waitForFunction((expected) => document.getElementById('fhSegVisitConfirmStatus')?.dataset.statusCode === expected, code); }
async function clipboard() { return page.evaluate(() => navigator.clipboard.readText()); }
async function outputAudit() { return page.evaluate(() => ['RecordId','VisitDate','ConfirmedAt','ConfirmedBy','LineId'].map((name) => document.getElementById(`fhSegOutput${name}`)?.textContent.trim() || '')); }
async function fillCanonicalDraft(notes) {
  await page.fill('#fhSegDraftNotes', notes);
  await page.selectOption('#fhSegDraftMg1', 'si'); await page.selectOption('#fhSegDraftMg2', 'no');
  await page.selectOption('#fhSegDraftAePresent', 'si'); await page.fill('#fhSegDraftAeDescription', 'EA sintético confirmado');
  await page.selectOption('#fhSegDraftAeSeverity', 'leve'); await page.selectOption('#fhSegDraftAeResolution', 'en_seguimiento');
  await page.selectOption('#fhSegDraftPromsCollected', 'si'); await page.fill('#fhSegDraftDlqiTotal', '0'); await page.fill('#fhSegDraftEvaDolor', '0');
  await page.click('#fhSegDraftSave'); await page.waitForFunction(() => document.getElementById('fhSegDraftStatus')?.dataset.statusCode === 'DRAFT_SAVED'); await waitVisit('VISIT_CONFIRM_READY');
}
async function confirm(date) { await page.fill('#fhSegVisitConfirmDate', date); await page.click('#fhSegVisitConfirmButton'); await waitVisit('VISIT_CONFIRMED'); await waitOutput('FOLLOWUP_OUTPUT_READY'); }
async function copyTxt() { await page.click('#fhSegExportTxt'); await waitOutput('FOLLOWUP_OUTPUT_GENERATED'); return clipboard(); }
async function downloadCsv(click = 'click') { const pending = page.waitForEvent('download'); if (click === 'dblclick') await page.dblclick('#fhSegExportCsv'); else await page.click('#fhSegExportCsv'); const download = await pending; const stream = await download.createReadStream(); const chunks = []; for await (const chunk of stream) chunks.push(chunk); await waitOutput('FOLLOWUP_OUTPUT_GENERATED'); return { name: download.suggestedFilename(), text: Buffer.concat(chunks).toString('utf8') }; }
async function copyExcel() { await page.click('#fhSegExcelExportBtn'); await waitOutput('FOLLOWUP_OUTPUT_GENERATED'); return clipboard(); }

try {
  // Confirmed-store failures are seeded only before Follow-up initialization.
  for (const raw of ['{', JSON.stringify({ schema: 'incompatible', records: {} }), JSON.stringify({ schema: VISIT_KEY, records: { x: { extra: true } } })]) {
    await seedVisitRaw(raw); await openS09(); await waitOutput('FOLLOWUP_OUTPUT_STORAGE_ERROR');
    assert.equal(await page.locator('#fhSegExportTxt').isDisabled(), true); assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), VISIT_KEY), raw);
  }

  // S09 empty -> confirmed event refresh -> exact TXT/CSV/Excel identity, zero/missing semantics and unchanged helper identities.
  await clearSession(); await openS09(); await waitOutput('FOLLOWUP_OUTPUT_EMPTY');
  const helperIdentityBefore = await page.evaluate(() => { window.__outputQaHelpers = [window.FarmaciaDemo.copyTextToClipboard, window.FarmaciaDemo.downloadFile, window.FarmaciaExcelRowExport.copyTSVRowToClipboard]; return true; });
  await fillCanonicalDraft('Fuente confirmada S09'); await confirm('2026-07-26');
  const audit = await outputAudit(); assert.equal(audit[1], '2026-07-26'); assert.equal(audit[3], 'Profesional FH-01'); assert.equal(audit[4], 'fhv4-line-s09');
  const txt = await copyTxt(); assert.match(txt, /^DATOS SINTÉTICOS \/ DEMO — TEXTO PARA REVISIÓN, SIN INTEGRACIÓN JARA/); assert.match(txt, /Record ID: /); assert.match(txt, /MG1 \(respuesta cruda\): si/); assert.match(txt, /DLQI total manual: 0/); assert.match(txt, /EVA prurito manual: No informado/); assert.doesNotMatch(txt, /Morisky-Green|Naranjo|Karch|fármaco sospechoso|movimiento terapéutico/i);
  const csv = await downloadCsv(); const csvLines = csv.text.split(/\r?\n/); assert.equal(csvLines.length, 2); assert.equal((csvLines[0].match(/","/g) || []).length + 1, 42); assert.ok(csv.name.includes(`2026-07-26_${audit[0]}`)); assert.ok(csv.text.includes(`"${audit[0]}"`)); assert.ok(csv.text.includes('"0"'));
  const excel = await copyExcel(); const cells = excel.split('\t'); assert.equal(cells.length, 61); assert.deepEqual([cells[0], cells[7], cells[8], cells[9], cells[12], cells[13], cells[14]], ['fhv4-patient-s09','2026-07-26','seguimiento',audit[0],'fhv4-line-s09','Profesional FH-01','confirmado_demo']); assert.equal(cells[24], ''); assert.equal(cells[41], 'mg1=si | mg2=no | mg3= | mg4='); assert.equal(cells[43], '0'); assert.equal(cells[44], '0'); assert.equal(cells[48], 'si'); assert.equal(cells[53], ''); assert.equal(cells[55], ''); assert.match(cells[60], /proms_collected=si.*eva_prurito=.*ae_resolution=en_seguimiento/);
  assert.equal(await page.evaluate(() => window.FarmaciaDemo.copyTextToClipboard === window.__outputQaHelpers[0] && window.FarmaciaDemo.downloadFile === window.__outputQaHelpers[1] && window.FarmaciaExcelRowExport.copyTSVRowToClipboard === window.__outputQaHelpers[2]), true); assert.equal(helperIdentityBefore, true);

  // A supported Playwright clipboard permission denial rejects the awaited write and must never report GENERATED.
  const origin = new URL(BASE_URL).origin; const clipboardBeforeRejection = await clipboard();
  try {
    await page.context().clearPermissions();
    await page.context().grantPermissions(['clipboard-read'], { origin });
    await page.click('#fhSegExportTxt'); await waitOutput('FOLLOWUP_OUTPUT_HELPER_ERROR');
    assert.equal(await clipboard(), clipboardBeforeRejection); assert.equal(await page.locator('#fhSegExportTxt').isDisabled(), true);
    assert.notEqual(await page.locator('#fhSegOutputStatus').getAttribute('data-status-code'), 'FOLLOWUP_OUTPUT_GENERATED');
  } finally {
    await page.context().clearPermissions();
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    await page.evaluate(() => window.__farmaciaFollowupOutputsV4Controller.refresh()); await waitOutput('FOLLOWUP_OUTPUT_READY'); await page.waitForTimeout(450);
  }

  // Dirty controls warn but cannot alter any output; legacy handlers do not overwrite canonical output.
  await page.fill('#fhSegDraftNotes', 'DIRTY MUST NEVER EXPORT'); await waitOutput('FOLLOWUP_OUTPUT_READY_WITH_UNSAVED_CHANGES');
  const dirtyTxt = await copyTxt(); assert.equal(dirtyTxt, txt); assert.doesNotMatch(dirtyTxt, /DIRTY MUST NEVER EXPORT/);
  const dirtyCsv = await downloadCsv(); assert.doesNotMatch(dirtyCsv.text, /DIRTY MUST NEVER EXPORT/); assert.ok(dirtyCsv.text.includes('Fuente confirmada S09'));
  const dirtyExcel = await copyExcel(); assert.equal(dirtyExcel.split('\t')[47], 'Fuente confirmada S09'); assert.doesNotMatch(dirtyExcel, /DIRTY MUST NEVER EXPORT/);

  // Double click is debounced to one canonical CSV and never reaches the legacy handler.
  await page.waitForTimeout(450); const beforeDouble = downloads.length; const doubleCsv = await downloadCsv('dblclick'); await page.waitForTimeout(500); assert.equal(downloads.length, beforeDouble + 1); assert.ok(doubleCsv.text.includes(`"${audit[0]}"`));

  // New supported save/confirmation emits the minimal event and refreshes to the latest record; reload preserves it.
  await page.fill('#fhSegDraftNotes', 'Fuente confirmada S09'); await page.waitForTimeout(20); await fillCanonicalDraft('Segunda fuente confirmada S09'); await confirm('2026-07-27'); const secondAudit = await outputAudit(); assert.notEqual(secondAudit[0], audit[0]);
  const visits = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), VISIT_KEY); assert.equal(Object.keys(visits.records).length, 2); assert.equal(visits.records[secondAudit[0]].notes, 'Segunda fuente confirmada S09');
  await page.reload({ waitUntil: 'domcontentloaded' }); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await waitOutput('FOLLOWUP_OUTPUT_READY'); assert.equal((await outputAudit())[0], secondAudit[0]);

  // S11 supported explicit line selection keeps independent visit/output partitions and S12 cancel/accept does not contaminate source.
  await page.fill('#fhSegCip', 'FH-V4-0011'); await page.click('#fhSegCipSearchBtn'); await waitContext('SELECTION_REQUIRED'); await waitOutput('FOLLOWUP_OUTPUT_CONTEXT_BLOCKED');
  await page.selectOption('#fhSegLineaPrincipal', 'fhv4-line-s11-primary'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await waitOutput('FOLLOWUP_OUTPUT_EMPTY'); await fillCanonicalDraft('S11 primary confirmed'); await confirm('2026-07-28'); const primary = await outputAudit();
  await page.selectOption('#fhSegLineaPrincipal', 'fhv4-line-s11-additional'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await waitOutput('FOLLOWUP_OUTPUT_EMPTY'); await fillCanonicalDraft('S11 additional confirmed'); await confirm('2026-07-29'); const additional = await outputAudit(); assert.notEqual(additional[0], primary[0]); assert.equal(additional[4], 'fhv4-line-s11-additional');
  await page.fill('#fhSegDraftNotes', 'S12 dirty'); await waitOutput('FOLLOWUP_OUTPUT_READY_WITH_UNSAVED_CHANGES'); page.__nextDialogAction = 'dismiss'; const oldUrl = page.url(); await page.selectOption('#fhSegLineaPrincipal', 'fhv4-line-s11-primary'); await page.waitForTimeout(100); assert.equal(page.url(), oldUrl); assert.equal((await outputAudit())[0], additional[0]);
  page.__nextDialogAction = 'accept'; await page.selectOption('#fhSegLineaPrincipal', 'fhv4-line-s11-primary'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await waitOutput('FOLLOWUP_OUTPUT_READY'); assert.equal((await outputAudit())[0], primary[0]);

  // Historical context stays blocked while excluded legacy cards remain inert.
  await goto('farmacia_seguimiento.html?cip=FH-V4-0010&patient_id=fhv4-patient-s10&line_id=fhv4-line-s10-historical&entrada=seguimiento'); await waitContext('LINE_NOT_ACTIVE'); await waitOutput('FOLLOWUP_OUTPUT_CONTEXT_BLOCKED');
  for (const selector of ['#fhSegExportTxt','#fhSegExportCsv','#fhSegExcelExportBtn','#fhSegProms','#fhSeguimientoEaPresente','#fhCausalidadFinal']) assert.equal(await page.locator(selector).isDisabled(), true, selector);

  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`); assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
  console.log('QA_ERRORS', JSON.stringify({ consoleErrors, pageErrors }));
  console.log('farmacia_followup_outputs_v4_qa: PASSED_SUPPORTED_S09_S10_S11_S12_CONFIRMED_EVENT_DIRTY_TXT_CSV_EXCEL61_RELOAD_LEGACY_CAPTURE');
} finally { await browser.close(); }
