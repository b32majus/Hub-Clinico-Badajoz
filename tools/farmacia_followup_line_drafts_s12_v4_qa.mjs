#!/usr/bin/env node

import {
  assert, browser, page, consoleErrors, pageErrors, clearSession, importNursingWorkbook,
  waitValidation, assertRealImportBoard
} from './farmacia_v4_validation_browser_qa_helpers.mjs';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const START_DATE = '2026-07-26';
const dialogs = [];
page.removeAllListeners('dialog');
page.on('dialog', async (dialog) => {
  dialogs.push(dialog.message());
  const action = page.__nextDialogAction || 'dismiss';
  page.__nextDialogAction = null;
  if (action === 'accept') await dialog.accept(); else await dialog.dismiss();
});

async function waitContext(code) {
  await page.waitForFunction((expected) => document.getElementById('fhSegCanonicalStatus')?.dataset.statusCode === expected, code);
  return page.evaluate(() => ({
    patientId: document.getElementById('fhSegCanonicalContext')?.dataset.patientId,
    lineId: document.getElementById('fhSegCanonicalContext')?.dataset.lineId
  }));
}
async function waitDraft(status) {
  await page.waitForFunction((expected) => document.getElementById('fhSegDraftStatus')?.textContent.trim() === expected, status);
}
async function search(cip, action = null) {
  if (action) page.__nextDialogAction = action;
  await page.fill('#fhSegCip', cip);
  await page.click('#fhSegCipSearchBtn');
}
async function select(lineId, action = null) {
  if (action) page.__nextDialogAction = action;
  await page.selectOption('#fhSegLineaPrincipal', lineId);
}
async function save(notes) {
  await page.fill('#fhSegDraftNotes', notes);
  await waitDraft('Cambios sin guardar');
  await page.click('#fhSegDraftSave');
  await waitDraft('Borrador guardado');
}
async function assertGate() {
  assert.equal(await page.locator('#fhSegDraftNotes').isDisabled(), false);
  for (const selector of ['#fhSegExportTxt', '#fhSegExportCsv', '#fhSegExcelExportBtn', '#btnSegAddOtherDrug', '#fhSegFecha', '#fhSegProms', '#fhSeguimientoEaPresente']) {
    assert.equal(await page.locator(selector).isDisabled(), true, `${selector} remains disabled`);
  }
  const direct = await page.evaluate(() => [
    window.FarmaciaDemo.copyTextToClipboard('blocked'),
    window.FarmaciaDemo.downloadFile('blocked.csv', 'blocked'),
    window.FarmaciaExcelRowExport.copyTSVRowToClipboard(['blocked'])
  ]);
  assert.deepEqual(direct, [false, false, false]);
}

try {
  // S08 supported Hub journey: validation -> First Visit -> start -> Follow-up draft.
  await clearSession();
  await importNursingWorkbook();
  const imported = await assertRealImportBoard();
  await imported.locator('[data-enf-action="validar"]').click();
  await waitValidation();
  await page.selectOption('#fhValEstado', 'validated');
  await page.click('#fhValSaveV4');
  await page.waitForFunction(() => /Validado · pendiente de inicio/.test(document.getElementById('fhValV4Status')?.textContent || ''));
  await Promise.all([
    page.waitForURL((url) => url.pathname.endsWith('/farmacia_primera_visita.html')),
    page.locator('#fhValGoFirstVisitV4:not(.hidden)').click()
  ]);
  await page.waitForSelector('#fhPvCanonicalContext[data-context-state="ready"]');
  await page.fill('#fhPvFecha', START_DATE);
  await page.click('#fhPvConfirmStart');
  await page.waitForSelector('#fhPvCanonicalContext[data-context-state="active"]');
  await Promise.all([
    page.waitForURL((url) => url.pathname.endsWith('/farmacia_seguimiento.html')),
    page.locator('#fhPvGoFollowup:not(.hidden)').click()
  ]);
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  await waitDraft('Sin borrador guardado');
  await save('Borrador sintético S08');
  await assertGate();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  await waitDraft('Borrador restaurado');
  assert.equal(await page.inputValue('#fhSegDraftNotes'), 'Borrador sintético S08');

  // S09 save, change away, and return to its independent partition.
  await search('FH-V4-0009');
  let context = await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal(context.lineId, 'fhv4-line-s09');
  await save('Borrador sintético S09');
  await search('FH-V4-0010');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  await search('FH-V4-0009');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  await waitDraft('Borrador restaurado');
  assert.equal(await page.inputValue('#fhSegDraftNotes'), 'Borrador sintético S09');

  // S11 keeps active-line drafts independent; historical stays disabled.
  await search('FH-V4-0011');
  await waitContext('SELECTION_REQUIRED');
  assert.equal(await page.locator('#fhSegDraftNotes').isDisabled(), true);
  assert.equal(await page.locator('#fhSegLineaPrincipal option[value="fhv4-line-s11-historical"]').isDisabled(), true);
  await select('fhv4-line-s11-primary');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  await save('Borrador S11 principal');
  await select('fhv4-line-s11-additional');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal(await page.inputValue('#fhSegDraftNotes'), '');
  await save('Borrador S11 adicional');
  await select('fhv4-line-s11-primary');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  await waitDraft('Borrador restaurado');
  assert.equal(await page.inputValue('#fhSegDraftNotes'), 'Borrador S11 principal');

  // S12 line change: cancel preserves everything; accept drops only working text.
  await page.fill('#fhSegDraftNotes', 'Cambio no guardado de línea');
  const lineUrl = page.url();
  const beforeLineDialogs = dialogs.length;
  await select('fhv4-line-s11-additional', 'dismiss');
  await page.waitForTimeout(50);
  assert.equal(dialogs.length, beforeLineDialogs + 1);
  assert.equal(page.url(), lineUrl);
  assert.equal(await page.inputValue('#fhSegLineaPrincipal'), 'fhv4-line-s11-primary');
  assert.equal(await page.inputValue('#fhSegDraftNotes'), 'Cambio no guardado de línea');
  await select('fhv4-line-s11-additional', 'accept');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal(await page.inputValue('#fhSegDraftNotes'), 'Borrador S11 adicional');

  // S12 patient change and same identity behavior.
  await page.fill('#fhSegDraftNotes', 'Cambio no guardado de paciente');
  const patientUrl = page.url();
  await search('FH-V4-0009', 'dismiss');
  await page.waitForTimeout(50);
  assert.equal(page.url(), patientUrl);
  assert.equal(await page.inputValue('#fhSegDraftNotes'), 'Cambio no guardado de paciente');
  await search('FH-V4-0009', 'accept');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal(await page.inputValue('#fhSegDraftNotes'), 'Borrador sintético S09');
  await page.fill('#fhSegDraftNotes', 'S09 mismo contexto sin guardar');
  const sameDialogs = dialogs.length;
  await search('FH-V4-0009');
  await page.waitForTimeout(50);
  assert.equal(dialogs.length, sameDialogs);
  assert.equal(await page.inputValue('#fhSegDraftNotes'), 'S09 mismo contexto sin guardar');

  // Unknown CIP cancel/accept; accepted result is neutral and draft-disabled.
  await search('FH-V4-UNKNOWN', 'dismiss');
  await page.waitForTimeout(50);
  assert.equal((await waitContext('CANONICAL_ACTIVE_CONTEXT_READY')).lineId, 'fhv4-line-s09');
  assert.equal(await page.inputValue('#fhSegDraftNotes'), 'S09 mismo contexto sin guardar');
  await search('FH-V4-UNKNOWN', 'accept');
  context = await waitContext('PATIENT_NOT_FOUND');
  assert.equal(context.patientId, '');
  assert.equal(context.lineId, '');
  assert.equal(await page.locator('#fhSegDraftNotes').isDisabled(), true);
  assert.equal(await page.inputValue('#fhSegDraftNotes'), '');

  // Discard affects only current exact partition; S11 remains stored.
  await search('FH-V4-0009');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  page.__nextDialogAction = 'accept';
  await page.click('#fhSegDraftDiscard');
  await waitDraft('Sin borrador guardado');
  const partitions = await page.evaluate(() => JSON.parse(sessionStorage.getItem('farmaciaDemo.followupDrafts.v2')));
  assert.equal(partitions.patients['fhv4-patient-s09'].lines['fhv4-line-s09'], undefined);
  assert.equal(partitions.patients['fhv4-patient-s11'].lines['fhv4-line-s11-primary'].notes, 'Borrador S11 principal');
  assert.equal(partitions.patients['fhv4-patient-s11'].lines['fhv4-line-s11-additional'].notes, 'Borrador S11 adicional');
  await assertGate();

  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
  console.log('farmacia_followup_line_drafts_s12_v4_qa: PASSED_S08_S09_S11_S12_DRAFT_PARTITIONS_NAVIGATION_AND_GATES');
} finally {
  await browser.close();
}
