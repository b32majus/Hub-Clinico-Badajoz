#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { assert, browser, page, consoleErrors, pageErrors, clearSession, goto } from './farmacia_v4_validation_browser_qa_helpers.mjs';

const require = createRequire(import.meta.url);
const XLSX = require('../vendor/sheetjs/xlsx.full.min.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
}
async function search(cip, action = null) {
  if (action) page.__nextDialogAction = action;
  await page.fill('#fhSegCip', cip);
  await page.click('#fhSegCipSearchBtn');
}
async function selectLine(lineId, action = null) {
  if (action) page.__nextDialogAction = action;
  await page.selectOption('#fhSegLineaPrincipal', lineId);
}
async function ae(values) {
  if (Object.hasOwn(values, 'present')) await page.selectOption('#fhSegDraftAePresent', values.present);
  if (Object.hasOwn(values, 'description')) await page.fill('#fhSegDraftAeDescription', values.description);
  if (Object.hasOwn(values, 'severity')) await page.selectOption('#fhSegDraftAeSeverity', values.severity);
  if (Object.hasOwn(values, 'resolution')) await page.selectOption('#fhSegDraftAeResolution', values.resolution);
}
async function snapshot() {
  return page.evaluate(() => ({
    patient: document.getElementById('fhSegCanonicalContext')?.dataset.patientId || '',
    line: document.getElementById('fhSegCanonicalContext')?.dataset.lineId || '',
    notes: document.getElementById('fhSegDraftNotes')?.value || '',
    mg1: document.getElementById('fhSegDraftMg1')?.value || '',
    mg2: document.getElementById('fhSegDraftMg2')?.value || '',
    mg3: document.getElementById('fhSegDraftMg3')?.value || '',
    mg4: document.getElementById('fhSegDraftMg4')?.value || '',
    present: document.getElementById('fhSegDraftAePresent')?.value || '',
    description: document.getElementById('fhSegDraftAeDescription')?.value || '',
    severity: document.getElementById('fhSegDraftAeSeverity')?.value || '',
    resolution: document.getElementById('fhSegDraftAeResolution')?.value || '',
    aeCode: document.getElementById('fhSegDraftAeStatus')?.dataset.statusCode || '',
    aeText: document.getElementById('fhSegDraftAeStatus')?.textContent.trim() || '',
    draftCode: document.getElementById('fhSegDraftStatus')?.dataset.statusCode || ''
  }));
}
async function save() {
  await page.click('#fhSegDraftSave');
  await page.waitForFunction(() => document.getElementById('fhSegDraftStatus')?.dataset.statusCode === 'DRAFT_SAVED');
}
function v2Raw() {
  return JSON.stringify({ schema: 'farmaciaDemo.followupDrafts.v2', patients: { 'fhv4-patient-s09': { lines: { 'fhv4-line-s09': {
    draft_id: 'followup:fhv4-line-s09', patient_id: 'fhv4-patient-s09', line_id: 'fhv4-line-s09', kind: 'followup', notes: 'V2 sintético',
    mg1: 'si', mg2: 'no', mg3: '', mg4: '', saved_at: '2026-07-26T09:00:00.000Z', saved_by_demo: 'Profesional FH-01'
  } } } } });
}
async function importVisibleConflictWorkbook() {
  await clearSession();
  const workbook = XLSX.read(fs.readFileSync(path.join(ROOT, 'templates/enfermeria_inicio_biologico_PROMueve_sintetico_v1.xlsx')), { type: 'buffer' });
  XLSX.utils.sheet_add_aoa(workbook.Sheets.INICIO_BIOLOGICO, [['FH-V4-0009']], { origin: 'A5' });
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  await page.setInputFiles('#inputExcelEnfermeria', {
    name: 'enfermeria_conflicto_identidad_sintetico.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(buffer)
  });
  await page.waitForSelector('[data-enf-cip="FH-V4-0009"]');
}

try {
  // Contractual migration seed occurs before Follow-up initialization only.
  await clearSession();
  const v2 = v2Raw();
  await page.evaluate((raw) => sessionStorage.setItem('farmaciaDemo.followupDrafts.v2', raw), v2);
  await goto('farmacia_seguimiento.html');
  await search('FH-V4-0009');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  let current = await snapshot();
  assert.equal(current.notes, 'V2 sintético');
  assert.equal(current.present, '');
  const migrated = await page.evaluate(() => ({ v2: sessionStorage.getItem('farmaciaDemo.followupDrafts.v2'), v3: JSON.parse(sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')) }));
  assert.equal(migrated.v2, v2);
  assert.deepEqual(migrated.v3.patients['fhv4-patient-s09'].lines['fhv4-line-s09'], {
    draft_id: 'followup:fhv4-line-s09', patient_id: 'fhv4-patient-s09', line_id: 'fhv4-line-s09', kind: 'followup', notes: 'V2 sintético',
    mg1: 'si', mg2: 'no', mg3: '', mg4: '', ae_present: '', ae_description: '', ae_severity: '', ae_resolution: '',
    saved_at: '2026-07-26T09:00:00.000Z', saved_by_demo: 'Profesional FH-01'
  });

  await clearSession();
  await goto('farmacia_seguimiento.html');

  // S09 and every visible state through supported controls.
  await search('FH-V4-0009');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal((await snapshot()).aeCode, 'AE_EMPTY');
  await ae({ present: 'no_consta' }); assert.equal((await snapshot()).aeCode, 'AE_NOT_RECORDED');
  await ae({ present: 'no' }); assert.equal((await snapshot()).aeCode, 'AE_NO_EVENT');
  await ae({ present: 'si' }); assert.equal((await snapshot()).aeCode, 'AE_PRESENT_INCOMPLETE');
  for (const selector of ['#fhSegDraftAeDescription', '#fhSegDraftAeSeverity', '#fhSegDraftAeResolution']) assert.equal(await page.locator(selector).isDisabled(), false);
  await page.fill('#fhSegDraftNotes', 'EA explícito sintético S09');
  await ae({ description: 'Descripción sintética sin inferencia', severity: 'requiere_derivacion', resolution: 'en_seguimiento' });
  current = await snapshot();
  assert.equal(current.aeCode, 'AE_PRESENT_COMPLETE_UNINTERPRETED');
  assert.equal(current.aeText, 'Efecto adverso documentado en borrador. Causalidad clínica no evaluada en esta versión.');
  await save();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  current = await snapshot();
  assert.deepEqual([current.present, current.description, current.severity, current.resolution], ['si', 'Descripción sintética sin inferencia', 'requiere_derivacion', 'en_seguimiento']);

  // Description completeness ignores peripheral whitespace; only a successful save normalizes it.
  await page.fill('#fhSegDraftAeDescription', '   ');
  assert.equal((await snapshot()).aeCode, 'AE_PRESENT_INCOMPLETE');
  await page.fill('#fhSegDraftAeDescription', '  EA con espacios periféricos  ');
  assert.equal((await snapshot()).aeCode, 'AE_PRESENT_COMPLETE_UNINTERPRETED');
  await save();
  assert.equal((await snapshot()).description, 'EA con espacios periféricos');

  // A visible invalid CIP search blocks and reactivates the same live draft partition without writing it.
  await page.fill('#fhSegDraftNotes', 'Restauración exacta misma identidad');
  await page.selectOption('#fhSegDraftMg1', 'si'); await page.selectOption('#fhSegDraftMg2', 'no');
  await page.selectOption('#fhSegDraftMg3', 'si'); await page.selectOption('#fhSegDraftMg4', 'no');
  await ae({ description: 'EA persistido misma identidad', severity: 'moderado', resolution: 'en_seguimiento' });
  await save();
  const persistedSameIdentity = await snapshot();
  const storeBeforeBlocked = await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v3'));
  await page.fill('#fhSegDraftNotes', 'Notas transitorias que no deben persistir');
  await page.selectOption('#fhSegDraftMg1', 'no'); await page.selectOption('#fhSegDraftMg2', 'si');
  await page.selectOption('#fhSegDraftMg3', 'no'); await page.selectOption('#fhSegDraftMg4', 'si');
  await ae({ description: 'EA transitorio que no debe persistir', severity: 'grave', resolution: 'no' });
  const dirtySameIdentity = await snapshot();
  assert.equal(dirtySameIdentity.draftCode, 'DRAFT_DIRTY');
  const activeUrl = page.url();
  const activeCip = await page.inputValue('#fhSegCip');
  const dialogsBeforeInvalidSearch = dialogs.length;
  await search('FH-V4-UNKNOWN', 'dismiss');
  await page.waitForTimeout(100);
  assert.equal(dialogs.length, dialogsBeforeInvalidSearch + 1);
  assert.equal(page.url(), activeUrl);
  assert.equal(await page.inputValue('#fhSegCip'), activeCip);
  assert.deepEqual(await snapshot(), dirtySameIdentity);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')), storeBeforeBlocked);

  await search('FH-V4-UNKNOWN', 'accept');
  await waitContext('PATIENT_NOT_FOUND');
  current = await snapshot();
  assert.deepEqual([current.notes, current.mg1, current.mg2, current.mg3, current.mg4, current.present, current.description, current.severity, current.resolution], ['', '', '', '', '', '', '', '', '']);
  assert.equal(current.draftCode, 'DRAFT_UNSAVED_NOT_PERSISTED_CONTEXT_INELIGIBLE');
  assert.equal(await page.locator('#fhSegDraftSave').isDisabled(), true);
  assert.equal(await page.locator('#fhSegDraftNotes').isDisabled(), true);
  assert.equal(dialogs.length, dialogsBeforeInvalidSearch + 2);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')), storeBeforeBlocked);
  await search('FH-V4-0009');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  current = await snapshot();
  assert.deepEqual([current.notes, current.mg1, current.mg2, current.mg3, current.mg4, current.present, current.description, current.severity, current.resolution],
    [persistedSameIdentity.notes, persistedSameIdentity.mg1, persistedSameIdentity.mg2, persistedSameIdentity.mg3, persistedSameIdentity.mg4, persistedSameIdentity.present, persistedSameIdentity.description, persistedSameIdentity.severity, persistedSameIdentity.resolution]);
  assert.equal(current.draftCode, 'DRAFT_RESTORED');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')), storeBeforeBlocked);

  // A clean invalid search blocks without a dialog and restores the same persisted partition without writes.
  const dialogsBeforeCleanInvalid = dialogs.length;
  await search('FH-V4-UNKNOWN');
  await waitContext('PATIENT_NOT_FOUND');
  current = await snapshot();
  assert.deepEqual([current.notes, current.mg1, current.mg2, current.mg3, current.mg4, current.present, current.description, current.severity, current.resolution], ['', '', '', '', '', '', '', '', '']);
  assert.equal(current.draftCode, 'DRAFT_CONTEXT_INELIGIBLE');
  assert.equal(dialogs.length, dialogsBeforeCleanInvalid);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')), storeBeforeBlocked);
  await search('FH-V4-0009');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  current = await snapshot();
  assert.deepEqual([current.notes, current.mg1, current.mg2, current.mg3, current.mg4, current.present, current.description, current.severity, current.resolution],
    [persistedSameIdentity.notes, persistedSameIdentity.mg1, persistedSameIdentity.mg2, persistedSameIdentity.mg3, persistedSameIdentity.mg4, persistedSameIdentity.present, persistedSameIdentity.description, persistedSameIdentity.severity, persistedSameIdentity.resolution]);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')), storeBeforeBlocked);

  // Non-si clears and persists no details residue.
  await ae({ present: 'no_consta' });
  current = await snapshot();
  assert.deepEqual([current.description, current.severity, current.resolution], ['', '', '']);
  for (const selector of ['#fhSegDraftAeDescription', '#fhSegDraftAeSeverity', '#fhSegDraftAeResolution']) assert.equal(await page.locator(selector).isDisabled(), true);
  await save();
  const clean = await page.evaluate(() => JSON.parse(sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')).patients['fhv4-patient-s09'].lines['fhv4-line-s09']);
  assert.deepEqual([clean.ae_present, clean.ae_description, clean.ae_severity, clean.ae_resolution], ['no_consta', '', '', '']);

  // S10 historical is empty and blocked.
  await goto('farmacia_seguimiento.html?cip=FH-V4-0010&patient_id=fhv4-patient-s10&line_id=fhv4-line-s10-historical&entrada=seguimiento');
  await waitContext('LINE_NOT_ACTIVE');
  current = await snapshot();
  assert.deepEqual([current.present, current.description, current.severity, current.resolution], ['', '', '', '']);
  assert.equal(await page.locator('#fhSegDraftAePresent').isDisabled(), true);

  // S11 exact line partitions.
  await search('FH-V4-0011'); await waitContext('SELECTION_REQUIRED');
  await selectLine('fhv4-line-s11-primary'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  await ae({ present: 'si', description: 'EA principal', severity: 'leve', resolution: 'si' }); await save();
  await selectLine('fhv4-line-s11-additional'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal((await snapshot()).present, '');
  await ae({ present: 'no' }); await save();
  await selectLine('fhv4-line-s11-primary'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal((await snapshot()).description, 'EA principal');

  // S12 cancel preserves context and all unsaved fields; accept drops only unsaved and restores destination.
  await page.fill('#fhSegDraftAeDescription', 'EA principal no guardado');
  const beforeCancel = await snapshot(); const urlBefore = page.url(); const dialogCount = dialogs.length;
  await selectLine('fhv4-line-s11-additional', 'dismiss'); await page.waitForTimeout(50);
  assert.equal(dialogs.length, dialogCount + 1); assert.equal(page.url(), urlBefore); assert.deepEqual(await snapshot(), beforeCancel);
  await selectLine('fhv4-line-s11-additional', 'accept'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  current = await snapshot(); assert.equal(current.present, 'no'); assert.equal(current.description, '');
  await selectLine('fhv4-line-s11-primary'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal((await snapshot()).description, 'EA principal');

  // Unknown CIP is empty blocked; legacy modules and all outputs remain inert.
  await search('FH-V4-UNKNOWN'); await waitContext('PATIENT_NOT_FOUND');
  assert.equal((await snapshot()).present, ''); assert.equal(await page.locator('#fhSegDraftAePresent').isDisabled(), true);
  for (const selector of ['#fhSeguimientoEaPresente', '#fhCausalidadFinal', '#fhSegExportTxt', '#fhSegExportCsv', '#fhSegExcelExportBtn']) assert.equal(await page.locator(selector).isDisabled(), true);
  assert.equal(await page.locator('#modSeguimientoEa').getAttribute('inert'), '');
  assert.equal(await page.locator('#modSeguimientoCausalidad').getAttribute('inert'), '');

  // Visible nursing import creates a real Demo/DataSource CIP identity conflict for supported PATIENT_MISMATCH search.
  await importVisibleConflictWorkbook();
  await goto('farmacia_seguimiento.html');
  await search('FH-V4-0010'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  await page.fill('#fhSegDraftNotes', 'Persistido S10 para mismatch');
  await page.selectOption('#fhSegDraftMg1', 'si'); await page.selectOption('#fhSegDraftMg2', 'no');
  await page.selectOption('#fhSegDraftMg3', 'si'); await page.selectOption('#fhSegDraftMg4', 'no');
  await ae({ present: 'si', description: 'EA persistido mismatch', severity: 'moderado', resolution: 'en_seguimiento' });
  await save();
  const persistedMismatch = await snapshot();
  const mismatchStore = await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v3'));
  await page.fill('#fhSegDraftNotes', 'Transitorio S10 mismatch');
  await page.selectOption('#fhSegDraftMg1', 'no'); await page.selectOption('#fhSegDraftMg2', 'si');
  await page.selectOption('#fhSegDraftMg3', 'no'); await page.selectOption('#fhSegDraftMg4', 'si');
  await ae({ description: 'EA transitorio mismatch', severity: 'grave', resolution: 'no' });
  const dirtyMismatch = await snapshot();
  const mismatchUrl = page.url(); const mismatchCip = await page.inputValue('#fhSegCip'); const mismatchDialogs = dialogs.length;
  await search('FH-V4-0009', 'dismiss'); await page.waitForTimeout(100);
  assert.equal(dialogs.length, mismatchDialogs + 1); assert.equal(page.url(), mismatchUrl); assert.equal(await page.inputValue('#fhSegCip'), mismatchCip);
  assert.deepEqual(await snapshot(), dirtyMismatch); assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')), mismatchStore);
  await search('FH-V4-0009', 'accept'); await waitContext('PATIENT_MISMATCH');
  current = await snapshot();
  assert.deepEqual([current.notes, current.mg1, current.mg2, current.mg3, current.mg4, current.present, current.description, current.severity, current.resolution], ['', '', '', '', '', '', '', '', '']);
  assert.equal(current.draftCode, 'DRAFT_UNSAVED_NOT_PERSISTED_CONTEXT_INELIGIBLE'); assert.equal(await page.locator('#fhSegDraftSave').isDisabled(), true);
  assert.equal(dialogs.length, mismatchDialogs + 2); assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')), mismatchStore);
  await search('FH-V4-0010'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  current = await snapshot();
  assert.deepEqual([current.notes, current.mg1, current.mg2, current.mg3, current.mg4, current.present, current.description, current.severity, current.resolution],
    [persistedMismatch.notes, persistedMismatch.mg1, persistedMismatch.mg2, persistedMismatch.mg3, persistedMismatch.mg4, persistedMismatch.present, persistedMismatch.description, persistedMismatch.severity, persistedMismatch.resolution]);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')), mismatchStore);

  // The same supported PATIENT_MISMATCH transition is silent when the restored partition is clean.
  const cleanMismatchDialogs = dialogs.length;
  await search('FH-V4-0009'); await waitContext('PATIENT_MISMATCH');
  current = await snapshot();
  assert.deepEqual([current.patient, current.line, current.notes, current.mg1, current.mg2, current.mg3, current.mg4, current.present, current.description, current.severity, current.resolution], ['', '', '', '', '', '', '', '', '', '', '']);
  assert.equal(current.draftCode, 'DRAFT_CONTEXT_INELIGIBLE');
  for (const selector of ['#fhSegDraftNotes', '#fhSegDraftMg1', '#fhSegDraftMg2', '#fhSegDraftMg3', '#fhSegDraftMg4', '#fhSegDraftAePresent', '#fhSegDraftAeDescription', '#fhSegDraftAeSeverity', '#fhSegDraftAeResolution']) {
    assert.equal(await page.locator(selector).isDisabled(), true, `${selector} must be blocked for clean PATIENT_MISMATCH`);
  }
  assert.equal(await page.locator('#fhSegDraftSave').isDisabled(), true); assert.equal(dialogs.length, cleanMismatchDialogs);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')), mismatchStore);
  await search('FH-V4-0010'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  current = await snapshot();
  assert.deepEqual([current.notes, current.mg1, current.mg2, current.mg3, current.mg4, current.present, current.description, current.severity, current.resolution],
    [persistedMismatch.notes, persistedMismatch.mg1, persistedMismatch.mg2, persistedMismatch.mg3, persistedMismatch.mg4, persistedMismatch.present, persistedMismatch.description, persistedMismatch.severity, persistedMismatch.resolution]);
  assert.equal(current.draftCode, 'DRAFT_RESTORED'); assert.equal(dialogs.length, cleanMismatchDialogs);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')), mismatchStore);

  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
  console.log('QA_ERRORS', JSON.stringify({ consoleErrors, pageErrors }));
  console.log('farmacia_followup_ae_draft_v4_qa: PASSED_V2_TO_V3_AE_STATES_CLEANING_S09_S10_S11_S12_GATES_ZERO_ERRORS');
} finally {
  await browser.close();
}
