#!/usr/bin/env node

import { assert, browser, page, consoleErrors, pageErrors, clearSession, goto } from './farmacia_v4_validation_browser_qa_helpers.mjs';

const dialogs = [];
const migrationResults = [];
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
async function answer(values) {
  for (const [field, value] of Object.entries(values)) await page.selectOption(`#fhSegDraftM${field.slice(1)}`, value);
}
async function save() {
  await page.click('#fhSegDraftSave');
  await page.waitForFunction(() => document.getElementById('fhSegDraftStatus')?.dataset.statusCode === 'DRAFT_SAVED');
}
async function snapshot() {
  return page.evaluate(() => ({
    patient: document.getElementById('fhSegCanonicalContext')?.dataset.patientId || '',
    line: document.getElementById('fhSegCanonicalContext')?.dataset.lineId || '',
    notes: document.getElementById('fhSegDraftNotes')?.value || '',
    answers: [1, 2, 3, 4].map((number) => document.getElementById(`fhSegDraftMg${number}`)?.value || ''),
    adherenceCode: document.getElementById('fhSegDraftAdherenceStatus')?.dataset.statusCode || '',
    adherenceText: document.getElementById('fhSegDraftAdherenceStatus')?.textContent.trim() || ''
  }));
}
function legacyRaw(notes) {
  return JSON.stringify({
    schema: 'farmaciaDemo.followupDrafts.v2',
    patients: {
      'fhv4-patient-s09': {
        lines: {
          'fhv4-line-s09': {
            draft_id: 'followup:fhv4-line-s09', patient_id: 'fhv4-patient-s09', line_id: 'fhv4-line-s09', kind: 'followup', notes,
            mg1: 'si', mg2: 'no', mg3: '', mg4: '',
            saved_at: '2026-07-26T09:00:00.000Z', saved_by_demo: 'Profesional FH-01'
          }
        }
      }
    }
  });
}
function recordMigration(scenario, parity, evidence) {
  migrationResults.push({ scenario, parity, consumers: Object.keys(evidence).filter((consumer) => evidence[consumer]) });
}

try {
  // Consumer-level migration: v2 exists before Follow-up initializes and v3 is absent.
  await clearSession();
  const v1 = legacyRaw('Notas v2 restauradas por UI');
  await page.evaluate(({ legacy, raw }) => {
    sessionStorage.clear();
    sessionStorage.setItem(legacy, raw);
  }, { legacy: 'farmaciaDemo.followupDrafts.v2', raw: v1 });
  assert.deepEqual(await page.evaluate(() => ({
    v2: sessionStorage.getItem('farmaciaDemo.followupDrafts.v2'),
    v3: sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')
  })), { v2: v1, v3: null });
  await goto('farmacia_seguimiento.html');
  await search('FH-V4-0009');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  let current = await snapshot();
  assert.equal(current.patient, 'fhv4-patient-s09');
  assert.equal(current.line, 'fhv4-line-s09');
  assert.equal(current.notes, 'Notas v2 restauradas por UI');
  assert.deepEqual(current.answers, ['si', 'no', '', '']);
  assert.equal(await page.locator('#fhSegDraftNotes').isDisabled(), false);
  assert.equal(await page.locator('#fhSegDraftStatus').getAttribute('data-status-code'), 'DRAFT_RESTORED');
  const migrated = await page.evaluate(() => ({
    v2: sessionStorage.getItem('farmaciaDemo.followupDrafts.v2'),
    v3: JSON.parse(sessionStorage.getItem('farmaciaDemo.followupDrafts.v3'))
  }));
  assert.equal(migrated.v2, v1);
  assert.deepEqual(migrated.v3.patients['fhv4-patient-s09'].lines['fhv4-line-s09'], {
    draft_id: 'followup:fhv4-line-s09', patient_id: 'fhv4-patient-s09', line_id: 'fhv4-line-s09', kind: 'followup',
    notes: 'Notas v2 restauradas por UI', mg1: 'si', mg2: 'no', mg3: '', mg4: '',
    ae_present: '', ae_description: '', ae_severity: '', ae_resolution: '',
    saved_at: '2026-07-26T09:00:00.000Z', saved_by_demo: 'Profesional FH-01'
  });
  recordMigration('valid_v2', 'identity_notes_answers_preserved_ae_empty', {
    browser_session_storage: migrated.v2 === v1,
    canonical_context_caller: current.patient === 'fhv4-patient-s09' && current.line === 'fhv4-line-s09',
    draft_controller: await page.locator('#fhSegDraftStatus').getAttribute('data-status-code') === 'DRAFT_RESTORED',
    canonical_draft_ui: current.notes === 'Notas v2 restauradas por UI' && current.answers.join(',') === 'si,no,,'
  });

  // A present invalid v3 remains authoritative and blocks without falling back to valid v2.
  await page.evaluate(({ legacy, raw }) => {
    sessionStorage.clear();
    sessionStorage.setItem(legacy, raw);
    sessionStorage.setItem('farmaciaDemo.followupDrafts.v3', '{');
  }, { legacy: 'farmaciaDemo.followupDrafts.v2', raw: v1 });
  await goto('farmacia_seguimiento.html');
  await search('FH-V4-0009');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  current = await snapshot();
  assert.equal(current.notes, '');
  assert.deepEqual(current.answers, ['', '', '', '']);
  assert.equal(await page.locator('#fhSegDraftNotes').isDisabled(), true);
  assert.equal(await page.locator('#fhSegDraftStatus').getAttribute('data-status-code'), 'DRAFT_STORAGE_CORRUPT');
  const corrupt = await page.evaluate(() => ({
    v2: sessionStorage.getItem('farmaciaDemo.followupDrafts.v2'),
    v3: sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')
  }));
  assert.deepEqual(corrupt, { v2: v1, v3: '{' });
  recordMigration('corrupt_v3_no_fallback', 'fail_closed', {
    browser_session_storage: corrupt.v2 === v1 && corrupt.v3 === '{',
    canonical_context_caller: current.patient === 'fhv4-patient-s09' && current.line === 'fhv4-line-s09',
    draft_controller: await page.locator('#fhSegDraftStatus').getAttribute('data-status-code') === 'DRAFT_STORAGE_CORRUPT',
    canonical_draft_ui: current.notes === '' && current.answers.every((answer) => answer === '')
  });

  await clearSession();
  await goto('farmacia_seguimiento.html');

  // S09: active coherent line saves and restores all answers in its own partition.
  await search('FH-V4-0009');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  await page.fill('#fhSegDraftNotes', 'Borrador de adherencia sintético S09');
  await answer({ mg1: 'si', mg2: 'no', mg3: 'si', mg4: 'no' });
  current = await snapshot();
  assert.equal(current.adherenceCode, 'ADHERENCE_COMPLETE_UNINTERPRETED');
  assert.equal(current.adherenceText, 'Cuestionario de adherencia completo. Interpretación clínica no habilitada en esta versión.');
  await save();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  current = await snapshot();
  assert.equal(current.notes, 'Borrador de adherencia sintético S09');
  assert.deepEqual(current.answers, ['si', 'no', 'si', 'no']);

  // S10: historical line remains empty and adherence cannot be edited.
  await goto('farmacia_seguimiento.html?cip=FH-V4-0010&patient_id=fhv4-patient-s10&line_id=fhv4-line-s10-historical&entrada=seguimiento');
  await waitContext('LINE_NOT_ACTIVE');
  current = await snapshot();
  assert.deepEqual(current.answers, ['', '', '', '']);
  for (let number = 1; number <= 4; number += 1) assert.equal(await page.locator(`#fhSegDraftMg${number}`).isDisabled(), true);

  // S11: two active lines keep independent answers.
  await search('FH-V4-0011');
  await waitContext('SELECTION_REQUIRED');
  await selectLine('fhv4-line-s11-primary');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  await page.fill('#fhSegDraftNotes', 'S11 principal guardado');
  await answer({ mg1: 'si', mg2: 'si' });
  await save();
  await selectLine('fhv4-line-s11-additional');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.deepEqual((await snapshot()).answers, ['', '', '', '']);
  await page.fill('#fhSegDraftNotes', 'S11 adicional guardado');
  await answer({ mg1: 'no', mg2: 'no', mg3: 'no', mg4: 'no' });
  await save();
  await selectLine('fhv4-line-s11-primary');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.deepEqual((await snapshot()).answers, ['si', 'si', '', '']);

  // S12 guard: cancel keeps context and unsaved edit; accept drops only unsaved and restores destination.
  await page.fill('#fhSegDraftNotes', 'S12 no guardado');
  await answer({ mg3: 'si' });
  const beforeCancel = await snapshot();
  const urlBeforeCancel = page.url();
  const dialogCount = dialogs.length;
  await selectLine('fhv4-line-s11-additional', 'dismiss');
  await page.waitForTimeout(50);
  assert.equal(dialogs.length, dialogCount + 1);
  assert.equal(page.url(), urlBeforeCancel);
  assert.deepEqual(await snapshot(), beforeCancel);
  await selectLine('fhv4-line-s11-additional', 'accept');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  current = await snapshot();
  assert.equal(current.notes, 'S11 adicional guardado');
  assert.deepEqual(current.answers, ['no', 'no', 'no', 'no']);
  await selectLine('fhv4-line-s11-primary');
  await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  current = await snapshot();
  assert.equal(current.notes, 'S11 principal guardado');
  assert.deepEqual(current.answers, ['si', 'si', '', '']);

  const persisted = await page.evaluate(() => JSON.parse(sessionStorage.getItem('farmaciaDemo.followupDrafts.v3')));
  assert.deepEqual(Object.keys(persisted.patients['fhv4-patient-s11'].lines).sort(), ['fhv4-line-s11-additional', 'fhv4-line-s11-primary']);
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
  assert.deepEqual(migrationResults.map((result) => result.scenario), ['valid_v2', 'corrupt_v3_no_fallback']);
  assert.ok(migrationResults.every((result) => result.consumers.length === 4));
  console.log('MIGRATION_CONSUMERS', JSON.stringify(migrationResults));
  console.log('QA_ERRORS', JSON.stringify({ consoleErrors, pageErrors }));
  console.log('farmacia_followup_adherence_draft_v4_qa: PASSED_V2_MIGRATION_V3_FAIL_CLOSED_S09_S10_S11_S12_SUPPORTED_INTERACTIONS_ZERO_ERRORS');
} finally {
  await browser.close();
}
