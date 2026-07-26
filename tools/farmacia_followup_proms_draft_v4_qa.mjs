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
const dialogs = [];
page.removeAllListeners('dialog');
page.on('dialog', async (dialog) => { dialogs.push(dialog.message()); const action = page.__nextDialogAction || 'dismiss'; page.__nextDialogAction = null; if (action === 'accept') await dialog.accept(); else await dialog.dismiss(); });

async function goto(route) {
  await page.goto(`${BASE_URL}/${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState === 'complete');
  await page.evaluate(async () => { if (window.FarmaciaDemo?.ready?.then) await window.FarmaciaDemo.ready; });
  await page.waitForTimeout(250);
}
async function clearSession() { await goto('farmacia_index.html'); await page.evaluate(() => sessionStorage.clear()); }

async function waitContext(code) { await page.waitForFunction((expected) => document.getElementById('fhSegCanonicalStatus')?.dataset.statusCode === expected, code); }
async function search(cip, action = null) { if (action) page.__nextDialogAction = action; await page.fill('#fhSegCip', cip); await page.click('#fhSegCipSearchBtn'); }
async function selectLine(line, action = null) { if (action) page.__nextDialogAction = action; await page.selectOption('#fhSegLineaPrincipal', line); }
async function setProms({ collected, dlqi, dolor, prurito }) {
  if (collected !== undefined) await page.selectOption('#fhSegDraftPromsCollected', collected);
  if (dlqi !== undefined) await page.fill('#fhSegDraftDlqiTotal', String(dlqi));
  if (dolor !== undefined) await page.fill('#fhSegDraftEvaDolor', String(dolor));
  if (prurito !== undefined) await page.fill('#fhSegDraftEvaPrurito', String(prurito));
}
async function snap() { return page.evaluate(() => ({
  patient: document.getElementById('fhSegCanonicalContext')?.dataset.patientId || '', line: document.getElementById('fhSegCanonicalContext')?.dataset.lineId || '',
  collected: document.getElementById('fhSegDraftPromsCollected')?.value || '', dlqi: document.getElementById('fhSegDraftDlqiTotal')?.value || '',
  dolor: document.getElementById('fhSegDraftEvaDolor')?.value || '', prurito: document.getElementById('fhSegDraftEvaPrurito')?.value || '',
  promsCode: document.getElementById('fhSegDraftPromsStatus')?.dataset.statusCode || '', promsText: document.getElementById('fhSegDraftPromsStatus')?.textContent.trim() || '',
  draftCode: document.getElementById('fhSegDraftStatus')?.dataset.statusCode || ''
})); }
async function save() { await page.click('#fhSegDraftSave'); await page.waitForFunction(() => document.getElementById('fhSegDraftStatus')?.dataset.statusCode === 'DRAFT_SAVED'); }
function baseDraft(extra = {}) { return { draft_id: 'followup:fhv4-line-s09', patient_id: 'fhv4-patient-s09', line_id: 'fhv4-line-s09', kind: 'followup', notes: 'migración sintética', mg1: 'si', mg2: 'no', mg3: '', mg4: '', ae_present: 'si', ae_description: 'EA sintético', ae_severity: 'leve', ae_resolution: 'no', proms_collected: '', dlqi_total: '', eva_dolor: '', eva_prurito: '', saved_at: '2026-07-26T09:00:00.000Z', saved_by_demo: 'Profesional FH-01', ...extra }; }
function raw(schema, draft) { return JSON.stringify({ schema, patients: { 'fhv4-patient-s09': { lines: { 'fhv4-line-s09': draft } } } }); }
function omit(value, fields) { const copy = { ...value }; fields.forEach((field) => delete copy[field]); return copy; }
async function seed(values) { await clearSession(); await page.evaluate((entries) => { sessionStorage.clear(); for (const [key, value] of Object.entries(entries)) sessionStorage.setItem(key, value); }, values); }
async function openS09() { await goto('farmacia_seguimiento.html?cip=FH-V4-0009&patient_id=fhv4-patient-s09&line_id=fhv4-line-s09&entrada=seguimiento'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); }
async function importVisibleConflictWorkbook() {
  await clearSession();
  const workbook = XLSX.read(fs.readFileSync(path.join(ROOT, 'templates/enfermeria_inicio_biologico_PROMueve_sintetico_v1.xlsx')), { type: 'buffer' });
  XLSX.utils.sheet_add_aoa(workbook.Sheets.INICIO_BIOLOGICO, [['FH-V4-0009']], { origin: 'A5' });
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  await page.setInputFiles('#inputExcelEnfermeria', { name: 'enfermeria_conflicto_identidad_sintetico.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(buffer) });
  await page.waitForSelector('[data-enf-cip="FH-V4-0009"]');
}

try {
  // Full fail-closed migration precedence matrix. Seeds are installed before Follow-up initialization.
  const v4 = raw('farmaciaDemo.followupDrafts.v4', baseDraft({ proms_collected: 'si', dlqi_total: 0 }));
  await seed({ 'farmaciaDemo.followupDrafts.v4': v4, 'farmaciaDemo.followupDrafts.v3': '{' }); await openS09();
  let current = await snap();
  assert.deepEqual([current.collected, current.dlqi, await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v4'))], ['si', '0', v4]);

  await seed({ 'farmaciaDemo.followupDrafts.v4': '{', 'farmaciaDemo.followupDrafts.v3': raw('farmaciaDemo.followupDrafts.v3', omit(baseDraft(), ['proms_collected', 'dlqi_total', 'eva_dolor', 'eva_prurito'])) }); await openS09();
  assert.equal((await snap()).draftCode, 'DRAFT_STORAGE_CORRUPT'); assert.equal(await page.locator('#fhSegDraftPromsCollected').isDisabled(), true);

  const v3 = raw('farmaciaDemo.followupDrafts.v3', omit(baseDraft({ notes: 'v3 preservado' }), ['proms_collected', 'dlqi_total', 'eva_dolor', 'eva_prurito']));
  await seed({ 'farmaciaDemo.followupDrafts.v3': v3 }); await openS09();
  assert.equal((await snap()).collected, ''); assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')), v3);
  assert.equal(JSON.parse(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v4'))).patients['fhv4-patient-s09'].lines['fhv4-line-s09'].ae_description, 'EA sintético');

  const v2 = raw('farmaciaDemo.followupDrafts.v2', omit(baseDraft({ notes: 'v2 preservado' }), ['ae_present', 'ae_description', 'ae_severity', 'ae_resolution', 'proms_collected', 'dlqi_total', 'eva_dolor', 'eva_prurito']));
  await seed({ 'farmaciaDemo.followupDrafts.v3': '{', 'farmaciaDemo.followupDrafts.v2': v2 }); await openS09(); assert.equal((await snap()).draftCode, 'DRAFT_STORAGE_CORRUPT'); assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v4')), null);
  await seed({ 'farmaciaDemo.followupDrafts.v2': v2 }); await openS09();
  let migrated = JSON.parse(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v4'))).patients['fhv4-patient-s09'].lines['fhv4-line-s09'];
  assert.deepEqual([migrated.notes, migrated.mg1, migrated.ae_present, migrated.proms_collected], ['v2 preservado', 'si', '', '']); assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v2')), v2);

  const v1 = raw('farmaciaDemo.followupDrafts.v1', omit(baseDraft({ notes: 'v1 preservado' }), ['mg1', 'mg2', 'mg3', 'mg4', 'ae_present', 'ae_description', 'ae_severity', 'ae_resolution', 'proms_collected', 'dlqi_total', 'eva_dolor', 'eva_prurito']));
  await seed({ 'farmaciaDemo.followupDrafts.v2': '{', 'farmaciaDemo.followupDrafts.v1': v1 }); await openS09(); assert.equal((await snap()).draftCode, 'DRAFT_STORAGE_CORRUPT'); assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v4')), null);
  await seed({ 'farmaciaDemo.followupDrafts.v1': v1 }); await openS09();
  migrated = JSON.parse(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v4'))).patients['fhv4-patient-s09'].lines['fhv4-line-s09'];
  assert.deepEqual([migrated.notes, migrated.mg1, migrated.ae_present, migrated.proms_collected], ['v1 preservado', '', '', '']); assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v1')), v1);
  await seed({}); await openS09(); assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v4')), null); assert.equal((await snap()).draftCode, 'DRAFT_EMPTY');

  // Supported visible controls: exact states, zero, bounds, persistence and clearing.
  current = await snap(); assert.equal(current.promsCode, 'PROMS_EMPTY');
  await setProms({ collected: 'no_consta' }); assert.equal((await snap()).promsCode, 'PROMS_NOT_RECORDED');
  await setProms({ collected: 'no' }); assert.equal((await snap()).promsCode, 'PROMS_NO_COLLECTION');
  await setProms({ collected: 'si' }); assert.equal((await snap()).promsCode, 'PROMS_RECORDED_INCOMPLETE');
  await setProms({ dlqi: 0, dolor: 0, prurito: 10 }); current = await snap();
  assert.equal(current.promsCode, 'PROMS_RECORDED_UNINTERPRETED'); assert.equal(current.promsText, 'PROMs documentados en borrador. Interpretación clínica no evaluada en esta versión.');
  await save(); await page.reload({ waitUntil: 'domcontentloaded' }); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); assert.deepEqual([(await snap()).dlqi, (await snap()).dolor, (await snap()).prurito], ['0', '0', '10']);
  await page.fill('#fhSegDraftDlqiTotal', '31'); await page.click('#fhSegDraftSave'); assert.equal((await snap()).draftCode, 'DRAFT_VALUES_INVALID');
  await page.fill('#fhSegDraftDlqiTotal', '30'); await save();
  await setProms({ collected: 'no' }); for (const selector of ['#fhSegDraftDlqiTotal', '#fhSegDraftEvaDolor', '#fhSegDraftEvaPrurito']) { assert.equal(await page.inputValue(selector), ''); assert.equal(await page.locator(selector).isDisabled(), true); } await save();
  migrated = JSON.parse(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v4'))).patients['fhv4-patient-s09'].lines['fhv4-line-s09']; assert.deepEqual([migrated.proms_collected, migrated.dlqi_total, migrated.eva_dolor, migrated.eva_prurito], ['no', '', '', '']);

  // Active/historical/unknown, exact partitions and S12 cancel/accept.
  await goto('farmacia_seguimiento.html?cip=FH-V4-0010&patient_id=fhv4-patient-s10&line_id=fhv4-line-s10-historical&entrada=seguimiento'); await waitContext('LINE_NOT_ACTIVE'); assert.equal((await snap()).collected, ''); assert.equal(await page.locator('#fhSegDraftPromsCollected').isDisabled(), true);
  await search('FH-V4-0011'); await waitContext('SELECTION_REQUIRED'); await selectLine('fhv4-line-s11-primary'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await setProms({ collected: 'si', dlqi: 5 }); await save();
  await selectLine('fhv4-line-s11-additional'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); assert.equal((await snap()).collected, ''); await setProms({ collected: 'si', dolor: 7 }); await save();
  await selectLine('fhv4-line-s11-primary'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); assert.equal((await snap()).dlqi, '5'); await page.fill('#fhSegDraftDlqiTotal', '9'); const dirty = await snap(); const beforeDialogs = dialogs.length;
  await selectLine('fhv4-line-s11-additional', 'dismiss'); await page.waitForTimeout(50); assert.equal(dialogs.length, beforeDialogs + 1); assert.deepEqual(await snap(), dirty);
  await selectLine('fhv4-line-s11-additional', 'accept'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); assert.deepEqual([(await snap()).dlqi, (await snap()).dolor], ['', '7']);

  // PATIENT_NOT_FOUND cancel/accept and same-identity blocked-to-active restoration.
  await selectLine('fhv4-line-s11-primary'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await page.fill('#fhSegDraftDlqiTotal', '8'); const notFoundDirty = await snap(); const storeBefore = await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v4'));
  await search('FH-V4-UNKNOWN', 'dismiss'); await page.waitForTimeout(50); assert.deepEqual(await snap(), notFoundDirty); assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v4')), storeBefore);
  await search('FH-V4-UNKNOWN', 'accept'); await waitContext('PATIENT_NOT_FOUND'); assert.equal((await snap()).collected, ''); assert.equal(await page.locator('#fhSegDraftPromsCollected').isDisabled(), true); assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v4')), storeBefore);
  await search('FH-V4-0011'); await waitContext('SELECTION_REQUIRED'); await selectLine('fhv4-line-s11-primary'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); assert.equal((await snap()).dlqi, '5');

  // Supported visible import creates PATIENT_MISMATCH; accepted transition never persists transient PROMs.
  await importVisibleConflictWorkbook(); await goto('farmacia_seguimiento.html'); await search('FH-V4-0010'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await setProms({ collected: 'si', dlqi: 4 }); await save(); await page.fill('#fhSegDraftDlqiTotal', '6'); const mismatchStore = await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v4'));
  await search('FH-V4-0009', 'dismiss'); await page.waitForTimeout(50); assert.equal((await snap()).dlqi, '6'); assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v4')), mismatchStore);
  await search('FH-V4-0009', 'accept'); await waitContext('PATIENT_MISMATCH'); assert.equal((await snap()).collected, ''); assert.equal(await page.evaluate(() => sessionStorage.getItem('farmaciaDemo.followupDrafts.v4')), mismatchStore);
  await search('FH-V4-0010'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); assert.equal((await snap()).dlqi, '4');

  for (const selector of ['#fhSegProms', '#fhSegExportTxt', '#fhSegExportCsv', '#fhSegExcelExportBtn']) assert.equal(await page.locator(selector).isDisabled(), true);
  assert.equal(await page.locator('#modSeguimientoProms').getAttribute('inert'), '');
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`); assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
  console.log('QA_ERRORS', JSON.stringify({ consoleErrors, pageErrors }));
  console.log('farmacia_followup_proms_draft_v4_qa: PASSED_FULL_MIGRATION_MATRIX_BOUNDS_ZERO_CLEAR_S09_S11_S12_NOT_FOUND_MISMATCH_INERT_ZERO_ERRORS');
} finally { await browser.close(); }
