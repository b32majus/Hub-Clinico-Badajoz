#!/usr/bin/env node
/**
 * T8 #300 deterministic checks for the pure intake-review lifecycle core
 * (D11 reparse/reapply state machine + D16 safe global-apply executor filter).
 * Synthetic data only. Does not touch the DOM.
 */
import assert from 'node:assert/strict';
import { runUnifiedIntake } from '../scripts/fh_intake_pipeline.js';
import {
  STATE_MANUALLY_EDITED_AFTER_APPLY,
  ACTION_REAPPLY_IMPORTED,
  ACTION_CONFIRM_FOR_GLOBAL,
  createReviewContext,
  continueParseRun,
  manualEditDetected,
  reviewRowState,
  globalExecutorAccepts,
  globalExecutableConcepts,
} from '../scripts/fh_intake_review_lifecycle.js';
import {
  STATE_CURRENT_EMPTY,
  STATE_ALREADY_MATCHES_CURRENT,
  STATE_PROTECTED_EXISTING,
} from '../scripts/fh_intake_apply.js';

const SEP = '═'.repeat(55);
const CIP = 'CIP-DEMO-FH-001';
function eorden({ dose = '40 MG' } = {}) {
  return [
    'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS', SEP,
    `• CIP: ${CIP}`, '• Marca comercial solicitada: HYRIMOZ',
    `• Dosis solicitada: ${dose}`, '• Vía solicitada: SC',
    '• Pauta: CADA 14 DIAS', '• Inducción solicitada: NO',
    '• Justificación clínica: Dato sintético T8.',
    'PROGRAMA SES', '• Código: SES_PSOR', '• Denominación: PSORIASIS'
  ].join('\n');
}
const verified = [{ state: 'VERIFIED_EXPLICIT_CIP' }];

let passed = 0;
function check(label, actual, expected) { assert.equal(actual, expected, label); passed += 1; }
function ok(label, cond) { assert.ok(cond, label); passed += 1; }

// -- Fresh review is decisionally blank and carries stable identities.
const fresh = createReviewContext(eorden());
ok('fresh review has intake_review_id', /^ir-/.test(fresh.intake_review_id));
ok('fresh review has parse_run_id', /^pr-/.test(fresh.parse_run_id));
check('fresh review has zero applied history', Object.keys(fresh.applied).length, 0);
check('fresh review has zero staged decisions', Object.keys(fresh.staged).length, 0);
check('fresh review inherits no e-orden confirmation', fresh.confirmations['e-orden'], false);
check('fresh review inherits no presalud confirmation', fresh.confirmations.presalud, false);

// -- Reparse stays in the same review but advances the parse run.
const reviewId = fresh.intake_review_id;
const firstRun = fresh.parse_run_id;
continueParseRun(fresh, eorden({ dose: '80 MG' }));
check('reparse keeps the same intake_review_id', fresh.intake_review_id, reviewId);
ok('reparse advances to a fresh parse_run_id', fresh.parse_run_id !== firstRun);
check('reparse advances parse_run_count', fresh.parse_run_count, 2);

// -- Manual-edit detection (D11) against recorded applied history.
fresh.applied.requested_dose = '40 MG';
check('manual edit detected when current differs from applied', manualEditDetected(fresh, 'requested_dose', '45 MG'), true);
check('no manual edit when current equals applied', manualEditDetected(fresh, 'requested_dose', '40 MG'), false);
check('no manual edit without applied history', manualEditDetected(createReviewContext(eorden()), 'requested_dose', '45 MG'), false);

// -- reviewRowState adds MANUALLY_EDITED_AFTER_APPLY only on the protected base.
const single = runUnifiedIntake(eorden()).reconciled.concepts.requested_dose;
check('protected base with manual edit surfaces MANUALLY_EDITED_AFTER_APPLY',
  reviewRowState(fresh, single, 'requested_dose', '45 MG'), STATE_MANUALLY_EDITED_AFTER_APPLY);
check('equal live current after apply surfaces ALREADY_MATCHES_CURRENT',
  reviewRowState(fresh, single, 'requested_dose', '40 MG'), STATE_ALREADY_MATCHES_CURRENT);
check('no-applied-history different current stays PROTECTED_EXISTING',
  reviewRowState(createReviewContext(eorden()), single, 'requested_dose', '45 MG'), STATE_PROTECTED_EXISTING);

// -- Global executor filter (D16) accepts only staged + live-eligible decisions.
const empty = runUnifiedIntake(eorden(), { currentFormValues: {} }).reconciled.concepts.requested_dose;
check('global executor accepts staged confirm on empty current', globalExecutorAccepts('confirm', empty, '', verified), true);
check('global executor rejects unstaged/no-op action', globalExecutorAccepts(null, empty, '', verified), false);
check('global executor rejects confirm over protected value', globalExecutorAccepts('confirm', single, '80 MG', verified), false);
check('global executor accepts staged replace over protected value', globalExecutorAccepts('replace', single, '80 MG', verified), true);
check('global executor rejects replace over empty current', globalExecutorAccepts('replace', empty, '', verified), false);
check('global executor rejects when already matches', globalExecutorAccepts('replace', single, '40 MG', verified), false);
check('global executor rejects without eligible association', globalExecutorAccepts('confirm', empty, '', [{ state: 'UNBOUND' }]), false);

// -- Mandatory D16 proof fixture: one AUTO_PROPOSABLE confirmed + one
//    PROTECTED_EXISTING (no explicit replace) -> global apply executes only the
//    first and never rewrites the second.
function buildReview() {
  const review = createReviewContext(eorden());
  const res = runUnifiedIntake(eorden());
  review.result = res;
  review.confirmations['e-orden'] = true;
  review.staged.requested_dose = 'confirm';   // AUTO_PROPOSABLE, empty current
  review.staged.requested_route = 'replace';  // protected current, no explicit replace? -> staged replace
  return review;
}
const proofReview = buildReview();
// Give route a differing live current so it is protected; do NOT stage replace for
// requested_route to prove the executor ignores anything unstaged.
delete proofReview.staged.requested_route;
proofReview.staged.requested_dose = 'confirm';
const executable = globalExecutableConcepts(
  proofReview,
  proofReview.result.reconciled.concepts,
  (concept) => (concept === 'requested_route' ? 'IV' : ''),
  () => verified,
);
check('global executor executes exactly the one confirmed eligible concept', executable.length, 1);
check('that concept is the confirmed dose', executable[0].concept, 'requested_dose');
check('its staged action is confirm', executable[0].action, 'confirm');
// The PROTECTED_EXISTING route was never staged, so it can never be executed.
check('unstaged protected concept is never in the executable set',
  executable.some(item => item.concept === 'requested_route'), false);

// -- Conflict/selection/no-proposal and already-matches can never be executed.
const conflictReview = createReviewContext(eorden());
const mixed = runUnifiedIntake(`${eorden()}\n;ADALIMUMAB (BENEPALI);SC;80 MG;CADA 14 DIAS;`);
conflictReview.result = mixed;
conflictReview.staged.requested_dose = 'confirm';
const conflictExec = globalExecutableConcepts(
  conflictReview,
  mixed.reconciled.concepts,
  () => '',
  () => verified,
);
check('conflict concept cannot be blanket-confirmed by the executor', conflictExec.length, 0);

// -- D11: a manual edit after apply is lifecycle-protected. Even if a stale
//    staged decision exists, the global executor must never restore an imported
//    value over a manual edit: only the per-concept REAPPLY_IMPORTED may.
const manualReview = createReviewContext(eorden());
const manualRes = runUnifiedIntake(eorden());
manualReview.result = manualRes;
manualReview.applied.requested_dose = '40 MG';
manualReview.staged.requested_dose = 'confirm';
const manualExec = globalExecutableConcepts(
  manualReview,
  manualRes.reconciled.concepts,
  () => '45 MG',
  () => verified,
);
check('global executor never rewrites a manual edit after apply', manualExec.length, 0);

process.stdout.write(`T8 REVIEW LIFECYCLE CHECK PASS ${passed}/${passed}\n`);
