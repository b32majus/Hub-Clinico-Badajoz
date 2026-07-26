#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { assert, browser, page, consoleErrors, pageErrors } from './farmacia_v4_validation_browser_qa_helpers.mjs';

const require = createRequire(import.meta.url);
const XLSX = require('../vendor/sheetjs/xlsx.full.min.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const STORE_KEY = 'farmaciaDemo.followupDrafts.v4';
const dialogs = [];

page.removeAllListeners('dialog');
page.on('dialog', async (dialog) => { dialogs.push(dialog.message()); const action = page.__nextDialogAction || 'dismiss'; page.__nextDialogAction = null; if (action === 'accept') await dialog.accept(); else await dialog.dismiss(); });
await page.addInitScript(() => {
  window.__followupDraftStateEvents = [];
  document.addEventListener('farmacia:followup-draft-state-v4', (event) => window.__followupDraftStateEvents.push(event.detail));
});

async function goto(route) {
  await page.goto(`${BASE_URL}/${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState === 'complete');
  await page.evaluate(async () => { if (window.FarmaciaDemo?.ready?.then) await window.FarmaciaDemo.ready; });
  await page.waitForTimeout(200);
}
async function clearSession() { await goto('farmacia_index.html'); await page.evaluate(() => sessionStorage.clear()); }
async function seedBeforeFollowup(entries) {
  await clearSession();
  await page.evaluate((values) => { for (const [key, value] of Object.entries(values)) sessionStorage.setItem(key, value); }, entries);
}
async function openS09() { await goto('farmacia_seguimiento.html?cip=FH-V4-0009&patient_id=fhv4-patient-s09&line_id=fhv4-line-s09&entrada=seguimiento'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); }
async function waitContext(code) { await page.waitForFunction((expected) => document.getElementById('fhSegCanonicalStatus')?.dataset.statusCode === expected, code); }
async function waitReview(code) { await page.waitForFunction((expected) => document.getElementById('fhSegPersistedReviewStatus')?.dataset.statusCode === expected, code); }
async function search(cip, action = null) { if (action) page.__nextDialogAction = action; await page.fill('#fhSegCip', cip); await page.click('#fhSegCipSearchBtn'); }
async function selectLine(line, action = null) { if (action) page.__nextDialogAction = action; await page.selectOption('#fhSegLineaPrincipal', line); }
async function reviewSnap() { return page.evaluate(() => ({
  code: document.getElementById('fhSegPersistedReviewStatus')?.dataset.statusCode || '',
  text: document.getElementById('fhSegPersistedReviewStatus')?.textContent.trim() || '',
  patient: document.getElementById('fhSegPersistedReviewPatientId')?.textContent.trim() || '', line: document.getElementById('fhSegPersistedReviewLineId')?.textContent.trim() || '',
  savedAt: document.getElementById('fhSegPersistedReviewSavedAt')?.textContent.trim() || '', savedBy: document.getElementById('fhSegPersistedReviewSavedBy')?.textContent.trim() || '',
  notes: document.getElementById('fhSegPersistedReviewNotes')?.textContent.trim() || '',
  mg: [1, 2, 3, 4].map((n) => document.getElementById(`fhSegPersistedReviewMg${n}`)?.textContent.trim() || ''),
  ae: ['AePresent', 'AeDescription', 'AeSeverity', 'AeResolution'].map((name) => document.getElementById(`fhSegPersistedReview${name}`)?.textContent.trim() || ''),
  proms: ['PromsCollected', 'DlqiTotal', 'EvaDolor', 'EvaPrurito'].map((name) => document.getElementById(`fhSegPersistedReview${name}`)?.textContent.trim() || '')
})); }
async function fillDraft(notes, values = {}) {
  await page.fill('#fhSegDraftNotes', notes);
  if (values.mg) for (let index = 0; index < 4; index += 1) await page.selectOption(`#fhSegDraftMg${index + 1}`, values.mg[index]);
  if (values.ae) { await page.selectOption('#fhSegDraftAePresent', values.ae[0]); if (values.ae[0] === 'si') { await page.fill('#fhSegDraftAeDescription', values.ae[1]); await page.selectOption('#fhSegDraftAeSeverity', values.ae[2]); await page.selectOption('#fhSegDraftAeResolution', values.ae[3]); } }
  if (values.proms) { await page.selectOption('#fhSegDraftPromsCollected', values.proms[0]); if (values.proms[0] === 'si') { await page.fill('#fhSegDraftDlqiTotal', String(values.proms[1])); await page.fill('#fhSegDraftEvaDolor', String(values.proms[2])); await page.fill('#fhSegDraftEvaPrurito', String(values.proms[3])); } }
}
async function save() { await page.click('#fhSegDraftSave'); await page.waitForFunction(() => document.getElementById('fhSegDraftStatus')?.dataset.statusCode === 'DRAFT_SAVED'); await waitReview('REVIEW_READY'); }
function persistedRaw(schema = STORE_KEY) {
  return JSON.stringify({ schema, patients: { 'fhv4-patient-s09': { lines: { 'fhv4-line-s09': {
    draft_id: 'followup:fhv4-line-s09', patient_id: 'fhv4-patient-s09', line_id: 'fhv4-line-s09', kind: 'followup', notes: 'Semilla sintética',
    mg1: '', mg2: '', mg3: '', mg4: '', ae_present: '', ae_description: '', ae_severity: '', ae_resolution: '',
    proms_collected: '', dlqi_total: '', eva_dolor: '', eva_prurito: '', saved_at: '2026-07-26T09:00:00.000Z', saved_by_demo: 'Profesional FH-01'
  } } } } });
}
async function importVisibleConflictWorkbook() {
  await clearSession();
  const workbook = XLSX.read(fs.readFileSync(path.join(ROOT, 'templates/enfermeria_inicio_biologico_PROMueve_sintetico_v1.xlsx')), { type: 'buffer' });
  XLSX.utils.sheet_add_aoa(workbook.Sheets.INICIO_BIOLOGICO, [['FH-V4-0009']], { origin: 'A5' });
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  await page.setInputFiles('#inputExcelEnfermeria', { name: 'enfermeria_conflicto_revision_sintetico.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(buffer) });
  await page.waitForSelector('[data-enf-cip="FH-V4-0009"]');
}

try {
  // Corrupt and incompatible v4 stores are seeded only before Follow-up initialization and fail closed without writes.
  for (const raw of ['{', persistedRaw('incompatible')]) {
    await seedBeforeFollowup({ [STORE_KEY]: raw }); await openS09(); await waitReview('REVIEW_STORAGE_ERROR');
    assert.equal((await reviewSnap()).notes, 'No informado'); assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), STORE_KEY), raw);
  }

  // Active empty, save-ready, zero/missing mapping, reload restore, and dirty review from persisted bytes only.
  await seedBeforeFollowup({}); await openS09(); await waitReview('REVIEW_EMPTY');
  assert.equal((await reviewSnap()).notes, 'No informado');
  await fillDraft('Persistido S09', { mg: ['si', 'no', '', ''], ae: ['si', 'EA sintético', 'leve', 'en_seguimiento'], proms: ['si', 0, 0, 7] });
  await waitReview('REVIEW_EMPTY'); assert.equal((await reviewSnap()).notes, 'No informado');
  await save();
  let current = await reviewSnap();
  assert.equal(current.text, 'Último borrador persistido listo para revisión. Sin interpretación clínica ni salida asistencial.');
  assert.deepEqual([current.patient, current.line, current.notes, ...current.mg, ...current.ae, ...current.proms], ['fhv4-patient-s09', 'fhv4-line-s09', 'Persistido S09', 'Sí', 'No', 'No informado', 'No informado', 'Sí', 'EA sintético', 'Leve', 'En seguimiento', 'Sí', '0', '0', '7']);
  assert.notEqual(current.savedAt, 'No informado'); assert.equal(current.savedBy, 'Profesional FH-01');
  const savedBytes = await page.evaluate((key) => sessionStorage.getItem(key), STORE_KEY);
  await fillDraft('No guardado S09', { mg: ['no', 'si', 'no', 'si'], ae: ['si', 'EA no guardado', 'grave', 'no'], proms: ['si', 9, 8, 6] });
  await waitReview('REVIEW_STALE_UNSAVED_CHANGES'); current = await reviewSnap();
  assert.equal(current.text, 'Hay cambios sin guardar. Esta revisión muestra únicamente el último borrador persistido.');
  assert.deepEqual([current.notes, current.mg[0], current.ae[1], current.proms[1]], ['Persistido S09', 'Sí', 'EA sintético', '0']);
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), STORE_KEY), savedBytes);
  page.__nextDialogAction = 'accept'; await page.reload({ waitUntil: 'domcontentloaded' }); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await waitReview('REVIEW_READY'); assert.equal((await reviewSnap()).notes, 'Persistido S09');

  // S11 exact partitions and S12 cancel/accept preserve review or switch only to destination persistence.
  await search('FH-V4-0011'); await waitContext('SELECTION_REQUIRED'); await waitReview('REVIEW_CONTEXT_BLOCKED');
  await selectLine('fhv4-line-s11-primary'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await fillDraft('Persistido principal'); await save();
  await selectLine('fhv4-line-s11-additional'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await waitReview('REVIEW_EMPTY'); await fillDraft('Persistido adicional'); await save();
  await selectLine('fhv4-line-s11-primary'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); assert.equal((await reviewSnap()).notes, 'Persistido principal');
  await page.fill('#fhSegDraftNotes', 'Transitorio principal'); await waitReview('REVIEW_STALE_UNSAVED_CHANGES'); const cancelSnap = await reviewSnap(); const cancelUrl = page.url();
  await selectLine('fhv4-line-s11-additional', 'dismiss'); await page.waitForTimeout(75); assert.equal(page.url(), cancelUrl); assert.deepEqual(await reviewSnap(), cancelSnap);
  await selectLine('fhv4-line-s11-additional', 'accept'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await waitReview('REVIEW_READY'); assert.equal((await reviewSnap()).notes, 'Persistido adicional');
  await selectLine('fhv4-line-s11-primary'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); assert.equal((await reviewSnap()).notes, 'Persistido principal');

  // PATIENT_NOT_FOUND cancel/accept and same-identity blocked-to-active return only persisted data.
  await page.fill('#fhSegDraftNotes', 'Transitorio para bloqueo'); await waitReview('REVIEW_STALE_UNSAVED_CHANGES'); const notFoundSnap = await reviewSnap();
  await search('FH-V4-UNKNOWN', 'dismiss'); await page.waitForTimeout(75); assert.deepEqual(await reviewSnap(), notFoundSnap);
  await search('FH-V4-UNKNOWN', 'accept'); await waitContext('PATIENT_NOT_FOUND'); await waitReview('REVIEW_CONTEXT_BLOCKED'); assert.equal((await reviewSnap()).notes, 'No informado');
  await search('FH-V4-0011'); await waitContext('SELECTION_REQUIRED'); await selectLine('fhv4-line-s11-primary'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await waitReview('REVIEW_READY'); assert.equal((await reviewSnap()).notes, 'Persistido principal');

  // Discard clears only the active partition review; adjacent saved partition remains available.
  page.__nextDialogAction = 'accept'; await page.click('#fhSegDraftDiscard'); await waitReview('REVIEW_EMPTY'); assert.equal((await reviewSnap()).notes, 'No informado');
  await selectLine('fhv4-line-s11-additional'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await waitReview('REVIEW_READY'); assert.equal((await reviewSnap()).notes, 'Persistido adicional');

  // Supported visible conflict produces PATIENT_MISMATCH, then return restores the exact S10 persisted snapshot.
  await importVisibleConflictWorkbook(); await goto('farmacia_seguimiento.html'); await search('FH-V4-0010'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await fillDraft('Persistido S10 mismatch'); await save();
  await page.fill('#fhSegDraftNotes', 'Transitorio S10'); await search('FH-V4-0009', 'accept'); await waitContext('PATIENT_MISMATCH'); await waitReview('REVIEW_CONTEXT_BLOCKED'); assert.equal((await reviewSnap()).notes, 'No informado');
  await search('FH-V4-0010'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await waitReview('REVIEW_READY'); assert.equal((await reviewSnap()).notes, 'Persistido S10 mismatch');

  // Historical context, legacy cards, causality and outputs stay blocked; event detail is exact and non-clinical.
  await goto('farmacia_seguimiento.html?cip=FH-V4-0010&patient_id=fhv4-patient-s10&line_id=fhv4-line-s10-historical&entrada=seguimiento'); await waitContext('LINE_NOT_ACTIVE'); await waitReview('REVIEW_CONTEXT_BLOCKED');
  for (const selector of ['#fhSegExportTxt', '#fhSegExportCsv', '#fhSegExcelExportBtn', '#fhSegProms', '#fhSeguimientoEaPresente', '#fhCausalidadFinal']) assert.equal(await page.locator(selector).isDisabled(), true, `${selector} remains inert`);
  assert.equal(await page.locator('#modSeguimientoCausalidad').getAttribute('inert'), '');
  const events = await page.evaluate(() => window.__followupDraftStateEvents);
  assert.ok(events.length > 0); for (const detail of events) assert.deepEqual(Object.keys(detail).sort(), ['patient_id', 'line_id', 'ready', 'dirty', 'storage_error', 'has_saved', 'reason'].sort());
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`); assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
  console.log('QA_ERRORS', JSON.stringify({ consoleErrors, pageErrors }));
  console.log('farmacia_followup_persisted_review_v4_qa: PASSED_READ_ONLY_STATES_ZERO_S09_S10_S11_S12_NOT_FOUND_MISMATCH_PARTITIONS_GATES_EVENTS');
} finally { await browser.close(); }
