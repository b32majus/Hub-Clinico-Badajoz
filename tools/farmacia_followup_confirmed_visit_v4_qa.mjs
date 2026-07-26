#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { browser, page, consoleErrors, pageErrors } from './farmacia_v4_validation_browser_qa_helpers.mjs';

const require = createRequire(import.meta.url);
const XLSX = require('../vendor/sheetjs/xlsx.full.min.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const DRAFT_KEY = 'farmaciaDemo.followupDrafts.v4';
const VISIT_KEY = 'farmaciaDemo.followupConfirmedVisits.v1';
const dialogs = [];
page.removeAllListeners('dialog');
page.on('dialog', async (dialog) => { dialogs.push(dialog.message()); const action = page.__nextDialogAction || 'dismiss'; page.__nextDialogAction = null; action === 'accept' ? await dialog.accept() : await dialog.dismiss(); });

async function goto(route) { await page.goto(`${BASE_URL}/${route}`, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => document.readyState === 'complete'); await page.evaluate(async () => { if (window.FarmaciaDemo?.ready?.then) await window.FarmaciaDemo.ready; }); await page.waitForTimeout(250); }
async function clearSession() { await goto('farmacia_index.html'); await page.evaluate(() => sessionStorage.clear()); }
async function seed(entries) { await clearSession(); await page.evaluate((items) => { for (const [key, value] of Object.entries(items)) sessionStorage.setItem(key, value); }, entries); }
async function waitContext(code) { await page.waitForFunction((expected) => document.getElementById('fhSegCanonicalStatus')?.dataset.statusCode === expected, code); }
async function waitVisit(code) { await page.waitForFunction((expected) => document.getElementById('fhSegVisitConfirmStatus')?.dataset.statusCode === expected, code); }
async function open(route) { await goto(route); }
async function openS09() { await open('farmacia_seguimiento.html?cip=FH-V4-0009&patient_id=fhv4-patient-s09&line_id=fhv4-line-s09&entrada=seguimiento'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); }
async function search(cip, action) { if (action) page.__nextDialogAction = action; await page.fill('#fhSegCip', cip); await page.click('#fhSegCipSearchBtn'); }
async function line(id, action) { if (action) page.__nextDialogAction = action; await page.selectOption('#fhSegLineaPrincipal', id); }
async function saveDraft(notes) { await page.fill('#fhSegDraftNotes', notes); await page.click('#fhSegDraftSave'); await page.waitForFunction(() => document.getElementById('fhSegDraftStatus')?.dataset.statusCode === 'DRAFT_SAVED'); await waitVisit('VISIT_CONFIRM_READY'); }
async function confirm(date) { await page.fill('#fhSegVisitConfirmDate', date); await page.click('#fhSegVisitConfirmButton'); await waitVisit('VISIT_CONFIRMED'); }
async function visitSnap() { return page.evaluate(() => ({
  code: document.getElementById('fhSegVisitConfirmStatus')?.dataset.statusCode || '', text: document.getElementById('fhSegVisitConfirmStatus')?.textContent.trim() || '',
  dateInput: document.getElementById('fhSegVisitConfirmDate')?.value || '', professional: document.getElementById('fhSegVisitConfirmProfessional')?.textContent.trim() || '',
  audit: ['RecordId', 'AuditDate', 'ConfirmedAt', 'ConfirmedBy', 'SourceSavedAt', 'SourceSavedBy'].map((name) => document.getElementById(`fhSegVisitConfirm${name}`)?.textContent.trim() || '')
})); }
function draftRaw(extra = null) { const draft = { draft_id: 'followup:fhv4-line-s09', patient_id: 'fhv4-patient-s09', line_id: 'fhv4-line-s09', kind: 'followup', notes: 'Semilla contractual', mg1: '', mg2: '', mg3: '', mg4: '', ae_present: '', ae_description: '', ae_severity: '', ae_resolution: '', proms_collected: '', dlqi_total: '', eva_dolor: '', eva_prurito: '', saved_at: '2026-07-26T09:00:00.000Z', saved_by_demo: 'Profesional FH-01' }; if (extra) Object.assign(draft, extra); return JSON.stringify({ schema: DRAFT_KEY, patients: { 'fhv4-patient-s09': { lines: { 'fhv4-line-s09': draft } } } }); }
async function importConflictWorkbook() { await clearSession(); const workbook = XLSX.read(fs.readFileSync(path.join(ROOT, 'templates/enfermeria_inicio_biologico_PROMueve_sintetico_v1.xlsx')), { type: 'buffer' }); XLSX.utils.sheet_add_aoa(workbook.Sheets.INICIO_BIOLOGICO, [['FH-V4-0009']], { origin: 'A5' }); const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }); await page.setInputFiles('#inputExcelEnfermeria', { name: 'conflicto_visita_demo.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(buffer) }); await page.waitForSelector('[data-enf-cip="FH-V4-0009"]'); }

try {
  // Confirmed-store contractual errors are seeded only before Follow-up initialization and fail closed.
  for (const raw of ['{', JSON.stringify({ schema: 'incompatible', records: {} }), JSON.stringify({ schema: VISIT_KEY, records: { x: { extra: true } } })]) {
    await seed({ [DRAFT_KEY]: draftRaw(), [VISIT_KEY]: raw }); await openS09(); await waitVisit('VISIT_CONFIRM_STORAGE_ERROR');
    assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), VISIT_KEY), raw); assert.equal((await visitSnap()).audit[0], 'No informado');
  }

  // Empty, dirty, date gate, exact persisted snapshot, draft-byte isolation, repeat and reload.
  await seed({}); await openS09(); await waitVisit('VISIT_CONFIRM_EMPTY'); await saveDraft('Primera visita S09');
  assert.equal((await visitSnap()).text, 'Borrador persistido y limpio. Introduzca la fecha de visita para confirmar la instantánea de demo.');
  await page.click('#fhSegVisitConfirmButton'); await waitVisit('VISIT_CONFIRM_DATE_REQUIRED');
  await page.fill('#fhSegDraftNotes', 'Cambio sin guardar'); await waitVisit('VISIT_CONFIRM_UNSAVED_CHANGES'); assert.equal((await visitSnap()).text, 'Hay cambios sin guardar. Guarde o descarte esos cambios antes de confirmar la visita.');
  await page.fill('#fhSegDraftNotes', 'Primera visita S09'); await waitVisit('VISIT_CONFIRM_READY');
  const draftBytes = await page.evaluate((key) => sessionStorage.getItem(key), DRAFT_KEY); await confirm('2026-07-26');
  let snap = await visitSnap(); assert.equal(snap.text, 'Visita de seguimiento confirmada como instantánea inmutable de demo.'); assert.equal(snap.professional, 'Profesional FH-01'); assert.deepEqual([snap.audit[1], snap.audit[3], snap.audit[5]], ['2026-07-26', 'Profesional FH-01', 'Profesional FH-01']);
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), DRAFT_KEY), draftBytes);
  const firstVisitBytes = await page.evaluate((key) => sessionStorage.getItem(key), VISIT_KEY); assert.equal(await page.locator('#fhSegVisitConfirmButton').isDisabled(), true); await page.waitForTimeout(50); assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), VISIT_KEY), firstVisitBytes);
  await page.reload({ waitUntil: 'domcontentloaded' }); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await waitVisit('VISIT_CONFIRM_ALREADY_CONFIRMED'); assert.equal((await visitSnap()).audit[0], snap.audit[0]);

  // A later supported save creates a second immutable visit; latest is selected by confirmed_at after reload.
  await page.waitForTimeout(10); await saveDraft('Segunda visita S09'); await confirm('2026-07-27'); const second = await visitSnap(); assert.notEqual(second.audit[0], snap.audit[0]);
  let visits = JSON.parse(await page.evaluate((key) => sessionStorage.getItem(key), VISIT_KEY)); assert.equal(Object.keys(visits.records).length, 2); assert.equal(visits.records[snap.audit[0]].notes, 'Primera visita S09'); assert.equal(visits.records[second.audit[0]].notes, 'Segunda visita S09');
  await page.reload({ waitUntil: 'domcontentloaded' }); await waitVisit('VISIT_CONFIRM_ALREADY_CONFIRMED'); assert.equal((await visitSnap()).audit[0], second.audit[0]);

  // S11 exact line partitions and S12 cancel/accept preserve or switch context, draft and audit.
  await search('FH-V4-0011'); await waitContext('SELECTION_REQUIRED'); await waitVisit('VISIT_CONFIRM_CONTEXT_BLOCKED');
  await line('fhv4-line-s11-primary'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await saveDraft('S11 principal'); await confirm('2026-07-28'); const primary = await visitSnap();
  await line('fhv4-line-s11-additional'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await waitVisit('VISIT_CONFIRM_EMPTY'); assert.equal((await visitSnap()).audit[0], 'No informado'); await saveDraft('S11 adicional'); await confirm('2026-07-29'); const additional = await visitSnap();
  await line('fhv4-line-s11-primary'); await waitVisit('VISIT_CONFIRM_ALREADY_CONFIRMED'); assert.equal((await visitSnap()).audit[0], primary.audit[0]);
  await page.fill('#fhSegDraftNotes', 'S12 transitorio'); await waitVisit('VISIT_CONFIRM_UNSAVED_CHANGES'); const beforeCancel = await visitSnap(); const urlBefore = page.url();
  await line('fhv4-line-s11-additional', 'dismiss'); await page.waitForTimeout(80); assert.equal(page.url(), urlBefore); assert.deepEqual(await visitSnap(), beforeCancel);
  await line('fhv4-line-s11-additional', 'accept'); await waitVisit('VISIT_CONFIRM_ALREADY_CONFIRMED'); assert.equal((await visitSnap()).audit[0], additional.audit[0]);

  // Supported PATIENT_NOT_FOUND transition clears foreign audit; return reloads the exact partition.
  await page.fill('#fhSegDraftNotes', 'transitorio not found'); await search('FH-V4-UNKNOWN', 'dismiss'); assert.equal((await visitSnap()).audit[0], additional.audit[0]);
  await search('FH-V4-UNKNOWN', 'accept'); await waitContext('PATIENT_NOT_FOUND'); await waitVisit('VISIT_CONFIRM_CONTEXT_BLOCKED'); assert.equal((await visitSnap()).audit[0], 'No informado');
  await search('FH-V4-0011'); await waitContext('SELECTION_REQUIRED'); await line('fhv4-line-s11-additional'); await waitVisit('VISIT_CONFIRM_ALREADY_CONFIRMED'); assert.equal((await visitSnap()).audit[0], additional.audit[0]);

  // Supported visible conflict yields PATIENT_MISMATCH; same identity can return blocked -> active safely.
  await importConflictWorkbook(); await open('farmacia_seguimiento.html'); await search('FH-V4-0010'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await saveDraft('S10 activo'); await confirm('2026-07-30'); const s10 = await visitSnap();
  await page.fill('#fhSegDraftNotes', 'transitorio mismatch'); await search('FH-V4-0009', 'accept'); await waitContext('PATIENT_MISMATCH'); await waitVisit('VISIT_CONFIRM_CONTEXT_BLOCKED'); assert.equal((await visitSnap()).audit[0], 'No informado');
  await search('FH-V4-0010'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await page.waitForFunction(() => ['VISIT_CONFIRMED', 'VISIT_CONFIRM_ALREADY_CONFIRMED'].includes(document.getElementById('fhSegVisitConfirmStatus')?.dataset.statusCode)); assert.equal((await visitSnap()).audit[0], s10.audit[0]);

  // Historical S10 stays blocked and excluded capabilities remain inert.
  await open('farmacia_seguimiento.html?cip=FH-V4-0010&patient_id=fhv4-patient-s10&line_id=fhv4-line-s10-historical&entrada=seguimiento'); await waitContext('LINE_NOT_ACTIVE'); await waitVisit('VISIT_CONFIRM_CONTEXT_BLOCKED');
  for (const selector of ['#fhSegExportTxt', '#fhSegExportCsv', '#fhSegExcelExportBtn', '#fhSegProms', '#fhSeguimientoEaPresente', '#fhCausalidadFinal']) assert.equal(await page.locator(selector).isDisabled(), true, `${selector} remains inert`);

  // Runtime write failure preserves visit bytes, draft bytes, editable values and prior audit, with no false success.
  await open('farmacia_seguimiento.html?cip=FH-V4-0010&patient_id=fhv4-patient-s10&line_id=fhv4-line-s10-active&entrada=seguimiento'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await waitVisit('VISIT_CONFIRM_ALREADY_CONFIRMED'); await saveDraft('S10 write failure'); const before = { visits: await page.evaluate((key) => sessionStorage.getItem(key), VISIT_KEY), drafts: await page.evaluate((key) => sessionStorage.getItem(key), DRAFT_KEY), notes: await page.inputValue('#fhSegDraftNotes'), audit: (await visitSnap()).audit };
  await page.fill('#fhSegVisitConfirmDate', '2026-07-31'); await page.evaluate((key) => { const native = Storage.prototype.setItem; window.__restoreSetItem = () => { Storage.prototype.setItem = native; }; Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException('denied', 'QuotaExceededError'); return native.call(this, name, value); }; }, VISIT_KEY);
  await page.click('#fhSegVisitConfirmButton'); await waitVisit('VISIT_CONFIRM_STORAGE_ERROR'); assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), VISIT_KEY), before.visits); assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), DRAFT_KEY), before.drafts); assert.equal(await page.inputValue('#fhSegDraftNotes'), before.notes); assert.deepEqual((await visitSnap()).audit, before.audit); await page.evaluate(() => window.__restoreSetItem());

  // A write that completes but whose first verification read mismatches is rolled back to exact prior bytes.
  await page.fill('#fhSegVisitConfirmDate', ''); await page.fill('#fhSegVisitConfirmDate', '2026-07-31'); await waitVisit('VISIT_CONFIRM_READY');
  await page.evaluate((key) => { const nativeGet = Storage.prototype.getItem; const nativeSet = Storage.prototype.setItem; const prior = nativeGet.call(sessionStorage, key); let armed = false; let injected = false; window.__restoreVisitStorage = () => { Storage.prototype.getItem = nativeGet; Storage.prototype.setItem = nativeSet; }; Storage.prototype.setItem = function (name, value) { nativeSet.call(this, name, value); if (name === key && value !== prior && !injected) armed = true; }; Storage.prototype.getItem = function (name) { if (name === key && armed && !injected) { injected = true; return `${prior || ''}__verification_mismatch`; } return nativeGet.call(this, name); }; }, VISIT_KEY);
  await page.click('#fhSegVisitConfirmButton'); await waitVisit('VISIT_CONFIRM_STORAGE_ERROR'); assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), VISIT_KEY), before.visits); assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), DRAFT_KEY), before.drafts); assert.equal(await page.inputValue('#fhSegDraftNotes'), before.notes); assert.deepEqual((await visitSnap()).audit, before.audit); await page.evaluate(() => window.__restoreVisitStorage());

  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`); assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
  console.log('QA_ERRORS', JSON.stringify({ consoleErrors, pageErrors }));
  console.log('farmacia_followup_confirmed_visit_v4_qa: PASSED_STRICT_S09_S10_S11_S12_PARTITIONS_IMMUTABLE_RELOAD_ATOMIC_ROLLBACK_GATES');
} finally { await browser.close(); }
