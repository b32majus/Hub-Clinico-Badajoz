#!/usr/bin/env node
/**
 * Issue #316 — independent oracle for T8 authorization freshness.
 *
 * Frozen before the product repair. Synthetic data only. The oracle exercises
 * the public pure lifecycle seam and MUST be RED on fbaaef0 because a staged
 * global-apply decision currently survives continueParseRun().
 *
 * Intentionally out of scope: `cancelled` semantics. Existing authority does
 * not establish whether cancellation is parse-run- or review-scoped.
 */
import assert from 'node:assert/strict';
import { runUnifiedIntake } from '../scripts/fh_intake_pipeline.js';
import {
  STATE_MANUALLY_EDITED_AFTER_APPLY,
  createReviewContext,
  continueParseRun,
  manualEditDetected,
  reviewRowState,
  globalExecutableConcepts,
} from '../scripts/fh_intake_review_lifecycle.js';

const SEP = '═'.repeat(55);
const CIP = 'CIP-DEMO-FH-001';
const verified = [{ state: 'VERIFIED_EXPLICIT_CIP' }];
function eorden({ dose = '40 MG' } = {}) {
  return [
    'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS', SEP,
    `• CIP: ${CIP}`,
    '• Marca comercial solicitada: HYRIMOZ',
    `• Dosis solicitada: ${dose}`,
    '• Vía solicitada: SC',
    '• Pauta: CADA 14 DIAS',
    '• Inducción solicitada: NO',
    '• Justificación clínica: Dato sintético #316.',
    'PROGRAMA SES',
    '• Código: SES_PSOR',
    '• Denominación: PSORIASIS',
  ].join('\n');
}

let passed = 0;
function eq(label, actual, expected) {
  assert.equal(actual, expected, label);
  passed += 1;
}
function ok(label, condition) {
  assert.ok(condition, label);
  passed += 1;
}
// A. Staged confirm must expire at the parse-run boundary.
{
  const raw = eorden();
  const review = createReviewContext(raw);
  review.result = runUnifiedIntake(raw);
  review.confirmations['e-orden'] = true;
  review.staged.requested_dose = 'confirm';
  const reviewId = review.intake_review_id;
  const oldRun = review.parse_run_id;
  continueParseRun(review, raw);
  review.result = runUnifiedIntake(raw);
  eq('reparse preserves intake_review_id', review.intake_review_id, reviewId);
  ok('reparse creates fresh parse_run_id', review.parse_run_id !== oldRun);
  eq('staged confirm expires on reparse', Object.keys(review.staged).length, 0);
  const executable = globalExecutableConcepts(
    review, review.result.reconciled.concepts, () => '', () => verified,
  );
  eq('stale confirm cannot execute in the new parse run', executable.length, 0);
}

// B. Staged replace over a protected live value must also expire.
{
  const raw = eorden();
  const review = createReviewContext(raw);
  review.result = runUnifiedIntake(raw);
  review.confirmations['e-orden'] = true;
  review.staged.requested_dose = 'replace';
  continueParseRun(review, raw);
  review.result = runUnifiedIntake(raw);
  eq('staged replace expires on reparse', Object.keys(review.staged).length, 0);  const executable = globalExecutableConcepts(
    review, review.result.reconciled.concepts,
    () => '80 MG', () => verified,
  );
  eq('stale replace cannot execute in the new parse run', executable.length, 0);
}

// C. Applied history and D11 manual-edit protection survive reparse.
{
  const raw = eorden();
  const review = createReviewContext(raw);
  review.result = runUnifiedIntake(raw);
  review.applied.requested_dose = '40 MG';
  continueParseRun(review, raw);
  review.result = runUnifiedIntake(raw);
  eq('applied history survives reparse', review.applied.requested_dose, '40 MG');
  eq('manual edit remains detected after reparse',
    manualEditDetected(review, 'requested_dose', '45 MG'), true);
  eq('manual edit remains lifecycle-protected after reparse',
    reviewRowState(
      review,
      review.result.reconciled.concepts.requested_dose,
      'requested_dose',
      '45 MG',
    ),
    STATE_MANUALLY_EDITED_AFTER_APPLY,
  );
}
// D. Source association confirmation is review-scoped in this repair and survives.
{
  const raw = eorden();
  const review = createReviewContext(raw);
  review.confirmations['e-orden'] = true;
  continueParseRun(review, raw);
  eq('e-orden source confirmation survives reparse', review.confirmations['e-orden'], true);
  eq('unrelated presalud confirmation remains unchanged', review.confirmations.presalud, false);
}

// E. The fix must not over-block a fresh explicit stage in run N+1.
{
  const raw = eorden();
  const review = createReviewContext(raw);
  review.confirmations['e-orden'] = true;
  continueParseRun(review, raw);
  review.result = runUnifiedIntake(raw);
  review.staged.requested_dose = 'confirm';
  const executable = globalExecutableConcepts(
    review, review.result.reconciled.concepts, () => '', () => verified,
  );
  eq('fresh run-N+1 stage is executable', executable.length, 1);
  eq('fresh executable concept is requested_dose', executable[0].concept, 'requested_dose');
  eq('fresh executable action is confirm', executable[0].action, 'confirm');
}

process.stdout.write(`T8 STALE-STAGE REPARSE ORACLE PASS ${passed}/${passed}\n`);
