/**
 * T8 #300 — Pure intake-review lifecycle core (Seam 1), additive to the frozen
 * T6/T7 apply core.
 *
 * Owns ONLY the transient review lifecycle identities and rules that T7's
 * `fh_intake_apply.js` deliberately does NOT own (that module stays byte-frozen
 * as the per-concept D11/D16 decision core; its own scope guard forbids any
 * global-apply/reparse machinery inside it). This module is pure and
 * deterministic: no DOM, no storage, no console, no side effects.
 *
 * Contract (SPEC D11/D16, ticket #300):
 * - Every intake review carries one stable `intake_review_id`; every parse run
 *   inside it carries its own fresh `parse_run_id`. Re-interpreting the same
 *   input is a NEW parse run inside the SAME review — it never implies re-apply.
 * - A brand-new review (fresh page / changed source) starts decisionally blank:
 *   fresh `intake_review_id`, zero inherited confirmations, zero applied
 *   history, zero staged decisions.
 * - Reparse ≠ reapply. After an explicit apply, the form fields stay editable
 *   (D11). When the same input is parsed again and the live current form value
 *   differs from the applied value recorded in THIS review, the concept is
 *   flagged MANUALLY_EDITED_AFTER_APPLY (always together with the D16
 *   PROTECTED_EXISTING protection state). Nothing is overwritten silently; the
 *   ONLY way to restore the imported value is the explicit professional action
 *   REAPPLY_IMPORTED, which records a fresh authorization. Prior authorization
 *   is never inherited across parse runs.
 * - When the live current already equals the would-be re-applied value the
 *   concept is ALREADY_MATCHES_CURRENT: no rewrite and no state churn.
 * - Global apply ("Aplicar confirmados") is an EXECUTOR ONLY. It executes
 *   exactly the subset of concepts that (a) have an applicable proposal, (b)
 *   already received an explicit staged professional decision
 *   (confirm-for-global on CURRENT_EMPTY, or staged replace on
 *   PROTECTED_EXISTING), and (c) are still eligible against the LIVE current
 *   value and the LIVE D5 source association at execution time. It can never
 *   bulk-replace, never first/last-wins, never blanket-confirm, never touches
 *   CONFLICT / REQUIRES_SELECTION / NO_PROPOSAL / ALREADY_MATCHES_CURRENT /
 *   PROTECTED_EXISTING-without-explicit-replace, and never rewrites a
 *   MANUALLY_EDITED_AFTER_APPLY field (that lifecycle path requires the
 *   explicit per-concept REAPPLY_IMPORTED action).
 *
 * NO_TOCA: per-concept protection semantics stay in fh_intake_apply.js (T7,
 * consumed as-is); no SES write path (T9); no persistence changes (D12); no
 * parser/reconciliation changes; no validated-treatment surface; no deletion.
 */

import {
  STATE_CURRENT_EMPTY,
  STATE_ALREADY_MATCHES_CURRENT,
  STATE_PROTECTED_EXISTING,
  STATE_CONFLICT,
  STATE_REQUIRES_SELECTION,
  STATE_NO_PROPOSAL,
  normalizeValue,
  decisionState,
  writeEligibility,
} from './fh_intake_apply.js';

/** D11 reparse lifecycle state: the form was edited after an apply in this review. */
export const STATE_MANUALLY_EDITED_AFTER_APPLY = 'MANUALLY_EDITED_AFTER_APPLY';

/** Explicit professional action that alone may re-apply an imported value (D11). */
export const ACTION_REAPPLY_IMPORTED = 'reapply-imported';

/** Per-concept staging action that records an explicit decision for the executor. */
export const ACTION_CONFIRM_FOR_GLOBAL = 'confirm-for-global';

/** Executor identity for the "Aplicar confirmados" control (D16). */
export const ACTION_GLOBAL_APPLY = 'global-apply';

/* Fresh unique identifiers. Randomness is confined to the identity (never to a
 * decision); the surrounding lifecycle logic is fully deterministic. */
let sequence = 0;
function freshId(prefix) {
  sequence += 1;
  const rand = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}-${sequence.toString(36)}`;
}

/** Fresh unique intake-review identifier (one per review session). */
export function generateIntakeReviewId() {
  return freshId('ir');
}

/** Fresh unique parse-run identifier (one per parse execution). */
export function generateParseRunId() {
  return freshId('pr');
}

/**
 * A brand-new review starts decisionally blank: fresh `intake_review_id`,
 * `parse_run_id` for its first run, zero inherited confirmations / applied
 * history / staged decisions / cancellations.
 */
export function createReviewContext(rawInput) {
  const firstParseRunId = generateParseRunId();
  return {
    intake_review_id: generateIntakeReviewId(),
    parse_run_id: firstParseRunId,
    parse_run_count: 1,
    raw_input: String(rawInput ?? ''),
    confirmations: { 'e-orden': false, presalud: false },
    applied: {},
    cancelled: {},
    staged: {},
    run_history: [{ parse_run_id: firstParseRunId, parse_run_count: 1 }],
    result: null,
  };
}

/**
 * Record one NEW parse run inside the SAME review. The review id is preserved;
 * only the parse-run identity advances. Per D11 this never re-applies anything
 * and never inherits prior authorization by itself.
 */
export function continueParseRun(review, rawInput) {
  if (!review || typeof review !== 'object') return review;
  review.raw_input = String(rawInput ?? '');
  review.parse_run_count += 1;
  review.parse_run_id = generateParseRunId();
  review.run_history = review.run_history ?? [];
  review.run_history.push({
    parse_run_id: review.parse_run_id,
    parse_run_count: review.parse_run_count,
  });
  return review;
}

/** True when this review already recorded an explicit applied value for the concept. */
export function hasReviewApplied(review, conceptName) {
  return Boolean(review && typeof review === 'object' && Object.prototype.hasOwnProperty.call(review.applied ?? {}, conceptName));
}

/**
 * D11 manual-edit detection: the concept was applied earlier in this review and
 * the live current form value differs from that recorded applied value. This is
 * the "edición manual tras apply" signal; together with the D16 protection state
 * (PROTECTED_EXISTING) it means the only legitimate restore path is the explicit
 * REAPPLY_IMPORTED action.
 */
export function manualEditDetected(review, conceptName, currentValue) {
  if (!hasReviewApplied(review, conceptName)) return false;
  const appliedValue = review.applied[conceptName];
  if (appliedValue === undefined || appliedValue === null) return false;
  if (currentValue === undefined || currentValue === null) return false;
  return normalizeValue(currentValue) !== normalizeValue(appliedValue);
}

/**
 * The visible D11/D16 state of one concept row. Returns the D16 per-concept
 * state (CURRENT_EMPTY / ALREADY_MATCHES_CURRENT / PROTECTED_EXISTING /
 * CONFLICT / REQUIRES_SELECTION / NO_PROPOSAL) and, when the manual-edit signal
 * is present, adds STATE_MANUALLY_EDITED_AFTER_APPLY. A manual edit never erases
 * the underlying protection state: the two coexist.
 */
export function reviewRowState(review, reconciled, conceptName, currentValue) {
  const state = decisionState(reconciled, currentValue);
  const manual = state === STATE_PROTECTED_EXISTING && manualEditDetected(review, conceptName, currentValue);
  return manual ? STATE_MANUALLY_EDITED_AFTER_APPLY : state;
}

/**
 * True when an explicit staged action may still be executed against the LIVE
 * current value and LIVE D5 association states. Used both to enable/disable the
 * per-concept confirm-for-global action at staging time and to re-check each
 * staged concept at global execution time (the executor never trusts a stale
 * staging decision).
 */
export function globalStageEligible(action, reconciled, currentValue, associationStates) {
  if (action !== 'confirm' && action !== 'replace') return false;
  const state = decisionState(reconciled, currentValue);
  if (action === 'confirm' && state !== STATE_CURRENT_EMPTY) return false;
  if (action === 'replace' && state !== STATE_PROTECTED_EXISTING) return false;
  return writeEligibility(reconciled, currentValue, associationStates).writable;
}

/**
 * D16 global-apply executor filter over one concept. Accepts only an explicit
 * staged action ('confirm' on CURRENT_EMPTY or 'replace' on PROTECTED_EXISTING)
 * that is still eligible. CONFLICT, REQUIRES_SELECTION, NO_PROPOSAL,
 * ALREADY_MATCHES_CURRENT and PROTECTED_EXISTING-without-explicit-replace are
 * all rejected here by construction.
 */
export function globalExecutorAccepts(action, reconciled, currentValue, associationStates) {
  return globalStageEligible(action, reconciled, currentValue, associationStates);
}

/**
 * Pure projection of which staged concepts a global apply would execute given
 * resolvers for the live current value and the live D5 association states.
 * Deterministic and DOM-free; the UI feeds it the same seam functions it uses
 * for rendering so execution and projection can never disagree.
 */
export function globalExecutableConcepts(review, resolvedConcepts, currentValueOf, associationsOf) {
  const executable = [];
  const staged = review?.staged ?? {};
  for (const conceptName of Object.keys(staged)) {
    const action = staged[conceptName];
    if (Object.prototype.hasOwnProperty.call(review.cancelled ?? {}, conceptName)) continue;
    const reconciled = resolvedConcepts[conceptName];
    if (!reconciled || typeof reconciled !== 'object') continue;
    const currentValue = typeof currentValueOf === 'function' ? currentValueOf(conceptName) : undefined;
    const associations = typeof associationsOf === 'function' ? associationsOf(conceptName) : [];
    // D11: a manual edit after apply is a lifecycle-protected path. The global
    // executor must never bypass it: only the explicit per-concept
    // REAPPLY_IMPORTED action may restore an imported value over a manual edit.
    if (manualEditDetected(review, conceptName, currentValue)) continue;
    if (globalExecutorAccepts(action, reconciled, currentValue, associations)) {
      executable.push({ concept: conceptName, action });
    }
  }
  return executable;
}
