#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { assert, browser, page, consoleErrors, pageErrors, clearSession, goto } from './farmacia_v4_validation_browser_qa_helpers.mjs';

const require = createRequire(import.meta.url);
const XLSX = require('../vendor/sheetjs/xlsx.full.min.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRAFT_KEY = 'farmaciaDemo.followupDrafts.v4';
const VISIT_KEY = 'farmaciaDemo.followupConfirmedVisits.v1';
const LINE_KEY = 'farmaciaDemo.multitreatment.v1';
const dialogs = [];
const mainNavigations = [];
page.removeAllListeners('dialog');
page.on('dialog', async (dialog) => {
  dialogs.push({ type: dialog.type(), message: dialog.message() });
  const action = page.__nextDialogAction || 'dismiss'; page.__nextDialogAction = null;
  if (action === 'accept') await dialog.accept(); else await dialog.dismiss();
});
page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) mainNavigations.push(frame.url()); });

async function waitContext(code) { await page.waitForFunction((expected) => document.getElementById('fhSegCanonicalStatus')?.dataset.statusCode === expected, code); }
async function waitDraft(code) { await page.waitForFunction((expected) => document.getElementById('fhSegDraftStatus')?.dataset.statusCode === expected, code); }
async function waitVisit(code) { await page.waitForFunction((expected) => document.getElementById('fhSegVisitConfirmStatus')?.dataset.statusCode === expected, code); }
async function waitOutput(code) { await page.waitForFunction((expected) => document.getElementById('fhSegOutputStatus')?.dataset.statusCode === expected, code); }
async function openS09() { await goto('farmacia_seguimiento.html?cip=FH-V4-0009&patient_id=fhv4-patient-s09&line_id=fhv4-line-s09&entrada=seguimiento'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); }
async function search(cip, action = null) { if (action) page.__nextDialogAction = action; await page.fill('#fhSegCip', cip); await page.click('#fhSegCipSearchBtn'); }
async function selectLine(line, action = null) { if (action) page.__nextDialogAction = action; await page.selectOption('#fhSegLineaPrincipal', line); }
async function stores() { return page.evaluate((keys) => Object.fromEntries(keys.map((key) => [key, sessionStorage.getItem(key)])), [DRAFT_KEY, VISIT_KEY, LINE_KEY]); }
async function draftSnapshot() { return page.evaluate(() => ({
  url: location.href, patient: document.getElementById('fhSegCanonicalContext')?.dataset.patientId || '', line: document.getElementById('fhSegCanonicalContext')?.dataset.lineId || '',
  notes: document.getElementById('fhSegDraftNotes')?.value || '', mg1: document.getElementById('fhSegDraftMg1')?.value || '',
  status: document.getElementById('fhSegDraftStatus')?.dataset.statusCode || '', output: document.getElementById('fhSegOutputStatus')?.dataset.statusCode || '',
  outputAudit: ['RecordId','VisitDate','ConfirmedAt','ConfirmedBy','LineId'].map((name) => document.getElementById(`fhSegOutput${name}`)?.textContent.trim() || '')
})); }
async function fillAndSave(notes) {
  await page.fill('#fhSegDraftNotes', notes); await page.selectOption('#fhSegDraftMg1', 'si'); await page.selectOption('#fhSegDraftMg2', 'no');
  await page.selectOption('#fhSegDraftAePresent', 'no_consta'); await page.selectOption('#fhSegDraftPromsCollected', 'si');
  await page.fill('#fhSegDraftDlqiTotal', '0'); await page.fill('#fhSegDraftEvaDolor', '0'); await page.click('#fhSegDraftSave'); await waitDraft('DRAFT_SAVED');
}
async function confirmVisit(date) { await page.fill('#fhSegVisitConfirmDate', date); await page.click('#fhSegVisitConfirmButton'); await waitVisit('VISIT_CONFIRMED'); await waitOutput('FOLLOWUP_OUTPUT_READY'); }
async function csvDownload() { const pending = page.waitForEvent('download'); await page.click('#fhSegExportCsv'); const download = await pending; const stream = await download.createReadStream(); const chunks = []; for await (const chunk of stream) chunks.push(chunk); return Buffer.concat(chunks).toString('utf8'); }
async function importVisibleConflictWorkbook() {
  await clearSession();
  const workbook = XLSX.read(fs.readFileSync(path.join(ROOT, 'templates/enfermeria_inicio_biologico_PROMueve_sintetico_v1.xlsx')), { type: 'buffer' });
  XLSX.utils.sheet_add_aoa(workbook.Sheets.INICIO_BIOLOGICO, [['FH-V4-0009']], { origin: 'A5' });
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  await page.setInputFiles('#inputExcelEnfermeria', { name: 'conflicto_sintetico.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(buffer) });
  await page.waitForSelector('[data-enf-cip="FH-V4-0009"]');
}

try {
  // S09 supported save/confirm and all canonical outputs share one exact confirmed identity.
  await clearSession(); await openS09(); await fillAndSave('Persistido sintético S09'); await waitVisit('VISIT_CONFIRM_READY'); await confirmVisit('2026-07-26');
  const confirmed = await draftSnapshot(); assert.equal(confirmed.outputAudit[1], '2026-07-26'); assert.equal(confirmed.outputAudit[4], 'fhv4-line-s09');
  await page.click('#fhSegExportTxt'); await waitOutput('FOLLOWUP_OUTPUT_GENERATED'); const txt = await page.evaluate(() => navigator.clipboard.readText());
  const csv = await csvDownload(); await page.click('#fhSegExcelExportBtn'); await waitOutput('FOLLOWUP_OUTPUT_GENERATED'); const excel = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(txt, new RegExp(`Record ID: ${confirmed.outputAudit[0]}`)); assert.ok(csv.includes(`"${confirmed.outputAudit[0]}"`)); assert.equal(excel.split('\t')[9], confirmed.outputAudit[0]); assert.equal(excel.split('\t').length, 61);

  // Dirty poison cannot alter TXT/CSV/Excel; beforeunload is dirty-only and mutation-free.
  await page.fill('#fhSegDraftNotes', 'DIRTY POISON MUST NOT ESCAPE'); await waitDraft('DRAFT_DIRTY'); await waitOutput('FOLLOWUP_OUTPUT_READY_WITH_UNSAVED_CHANGES');
  await page.click('#fhSegExportTxt'); const dirtyTxt = await page.evaluate(() => navigator.clipboard.readText()); const dirtyCsv = await csvDownload(); await page.click('#fhSegExcelExportBtn'); const dirtyExcel = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(dirtyTxt, txt); assert.doesNotMatch(dirtyCsv, /DIRTY POISON/); assert.equal(dirtyExcel.split('\t')[47], 'Persistido sintético S09');
  const beforeUnload = { state: await draftSnapshot(), stores: await stores(), dialogs: dialogs.length, navigations: mainNavigations.length };
  page.__nextDialogAction = 'dismiss'; await page.reload({ waitUntil: 'domcontentloaded', timeout: 2500 }).catch(() => {}); await page.waitForTimeout(150);
  assert.equal(dialogs.length, beforeUnload.dialogs + 1); assert.equal(dialogs.at(-1).type, 'beforeunload'); assert.equal(mainNavigations.length, beforeUnload.navigations); assert.deepEqual(await draftSnapshot(), beforeUnload.state); assert.deepEqual(await stores(), beforeUnload.stores);

  // Every required real same-tab link: cancel preserves everything; accept prompts once, navigates once, bypasses beforeunload and return is persisted-only.
  const links = [
    ['a[href="farmacia_index.html"]','farmacia_index.html'], ['a[href="farmacia_validacion.html"]','farmacia_validacion.html'],
    ['a[href="farmacia_primera_visita.html"]','farmacia_primera_visita.html'], ['a[data-nav-link][href^="farmacia_dashboard_paciente.html"]','farmacia_dashboard_paciente.html'], ['a[href="index.html"]','index.html']
  ];
  for (const [selector, route] of links) {
    if (!page.url().includes('farmacia_seguimiento.html')) await openS09();
    assert.equal(await page.locator(selector).count(), 1, `${route} real Follow-up link at ${page.url()}`);
    await page.fill('#fhSegDraftNotes', `Dirty salida ${route}`); await waitDraft('DRAFT_DIRTY'); const before = { state: await draftSnapshot(), stores: await stores(), dialogs: dialogs.length, navigations: mainNavigations.length };
    page.__nextDialogAction = 'dismiss'; await page.click(selector); await page.waitForTimeout(75);
    assert.equal(dialogs.length, before.dialogs + 1, route); assert.equal(mainNavigations.length, before.navigations, route); assert.deepEqual(await draftSnapshot(), before.state, route); assert.deepEqual(await stores(), before.stores, route);
    page.__nextDialogAction = 'accept'; const acceptedDialogs = dialogs.length; const acceptedNavigations = mainNavigations.length; const exactHref = await page.locator(selector).evaluate((link) => link.href);
    await Promise.all([page.waitForURL((url) => url.href === exactHref), page.click(selector)]);
    assert.equal(page.url(), exactHref, `${route} exact final href`);
    assert.equal(dialogs.length, acceptedDialogs + 1, `${route} exactly one confirmation`); assert.equal(dialogs.at(-1).type, 'confirm'); assert.equal(mainNavigations.length, acceptedNavigations + 1, `${route} exactly one navigation`); assert.deepEqual(await stores(), before.stores, `${route} stores`);
    await openS09(); const returned = await draftSnapshot(); assert.equal(returned.notes, 'Persistido sintético S09'); assert.equal(returned.status, 'DRAFT_RESTORED'); assert.equal(returned.outputAudit[0], confirmed.outputAudit[0]);
  }

  // Clean same-tab navigation has no prompt; use Inicio and then return.
  const cleanDialogs = dialogs.length; await Promise.all([page.waitForURL((url) => url.pathname.endsWith('/farmacia_index.html')), page.click('a[href="farmacia_index.html"]')]); assert.equal(dialogs.length, cleanDialogs); await openS09();

  // S10 historical stays visibly noneligible with no outputs.
  await goto('farmacia_seguimiento.html?cip=FH-V4-0010&patient_id=fhv4-patient-s10&line_id=fhv4-line-s10-historical&entrada=seguimiento'); await waitContext('LINE_NOT_ACTIVE'); await waitOutput('FOLLOWUP_OUTPUT_CONTEXT_BLOCKED');
  assert.match(await page.locator('#fhSegCanonicalStatus').textContent(), /histórica.*no.*elegible/i); for (const selector of ['#fhSegDraftNotes','#fhSegExportTxt','#fhSegExportCsv','#fhSegExcelExportBtn']) assert.equal(await page.locator(selector).isDisabled(), true);

  // Both S11 active lines remain isolated; S12 line cancel/accept preserves all stores and only drops dirty UI.
  await search('FH-V4-0011'); await waitContext('SELECTION_REQUIRED'); await selectLine('fhv4-line-s11-primary'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await fillAndSave('Persistido S11 principal');
  await selectLine('fhv4-line-s11-additional'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await fillAndSave('Persistido S11 adicional');
  await page.fill('#fhSegDraftNotes', 'Dirty adicional'); const lineBefore = { state: await draftSnapshot(), stores: await stores(), dialogs: dialogs.length };
  await selectLine('fhv4-line-s11-primary', 'dismiss'); await page.waitForTimeout(75); assert.equal(dialogs.length, lineBefore.dialogs + 1); assert.deepEqual(await draftSnapshot(), lineBefore.state); assert.deepEqual(await stores(), lineBefore.stores);
  await selectLine('fhv4-line-s11-primary', 'accept'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); assert.equal((await draftSnapshot()).notes, 'Persistido S11 principal'); assert.deepEqual(await stores(), lineBefore.stores);
  await selectLine('fhv4-line-s11-additional'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); assert.equal((await draftSnapshot()).notes, 'Persistido S11 adicional');

  // S12 CIP cancel/accept and PATIENT_NOT_FOUND fail closed without store mutation.
  await page.fill('#fhSegDraftNotes', 'Dirty antes de CIP inválido'); const cipBefore = { state: await draftSnapshot(), stores: await stores(), dialogs: dialogs.length };
  await search('FH-V4-UNKNOWN', 'dismiss'); await page.waitForTimeout(75); assert.equal(dialogs.length, cipBefore.dialogs + 1); assert.deepEqual(await draftSnapshot(), cipBefore.state); assert.deepEqual(await stores(), cipBefore.stores);
  await search('FH-V4-UNKNOWN', 'accept'); await waitContext('PATIENT_NOT_FOUND'); assert.equal(await page.locator('#fhSegDraftNotes').isDisabled(), true); assert.equal((await draftSnapshot()).notes, ''); assert.deepEqual(await stores(), cipBefore.stores);

  // A supported visible synthetic import creates PATIENT_MISMATCH; cancel/accept remains fail closed.
  await importVisibleConflictWorkbook(); await goto('farmacia_seguimiento.html'); await search('FH-V4-0010'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); await fillAndSave('Persistido mismatch origin');
  await page.fill('#fhSegDraftNotes', 'Dirty mismatch origin'); const mismatchBefore = { state: await draftSnapshot(), stores: await stores(), dialogs: dialogs.length };
  await search('FH-V4-0009', 'dismiss'); await page.waitForTimeout(75); assert.equal(dialogs.length, mismatchBefore.dialogs + 1); assert.deepEqual(await draftSnapshot(), mismatchBefore.state); assert.deepEqual(await stores(), mismatchBefore.stores);
  await search('FH-V4-0009', 'accept'); await waitContext('PATIENT_MISMATCH'); assert.equal(await page.locator('#fhSegDraftNotes').isDisabled(), true); assert.equal((await draftSnapshot()).notes, ''); assert.deepEqual(await stores(), mismatchBefore.stores);
  await search('FH-V4-0010'); await waitContext('CANONICAL_ACTIVE_CONTEXT_READY'); assert.equal((await draftSnapshot()).notes, 'Persistido mismatch origin');

  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`); assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
  console.log('QA_ERRORS', JSON.stringify({ consoleErrors, pageErrors }));
  console.log('farmacia_followup_e2e_navigation_guard_v4_qa: PASSED_SUPPORTED_S09_S10_S11_S12_OUTPUT_IDENTITY_DIRTY_INVARIANCE_PAGE_EXIT_REAL_LINKS_BEFOREUNLOAD_FAIL_CLOSED');
} finally { await browser.close(); }
