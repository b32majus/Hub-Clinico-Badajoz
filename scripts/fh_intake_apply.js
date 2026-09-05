/**
 * WO-E3a (issue #299, T7) — Pure per-concept apply decision core (Seam 1).
 *
 * Implements the D16 per-concept decision matrix and the D5 x D16 write
 * eligibility matrix WITHOUT touching the DOM. This module is pure,
 * deterministic and side-effect free: writes are executed by the caller
 * through the injected `write(target, value)` seam.
 *
 * Contract (SPEC D11 / D16, ticket #299):
 * - Value cycle: source_value -> applied_value -> current_form_value.
 *   After apply, fields remain normally editable; editing current_form_value
 *   never changes source_value, provenance, or the historical applied_value
 *   of the review, and never converts the data into validated treatment.
 * - Per-concept protection states:
 *     CURRENT_EMPTY          -> confirm (explicit professional decision) writes.
 *     ALREADY_MATCHES_CURRENT-> no-op, no rewrite.
 *     PROTECTED_EXISTING     -> default keep; only the explicit per-concept
 *                               replace decision overwrites.
 *     CONFLICT (D6)          -> no automatic winner.
 *     REQUIRES_SELECTION     -> no apply until an explicit selection.
 *     NO_PROPOSAL            -> no write.
 *     Missing / target NONE  -> never deletes / clears.
 *     Cancel                 -> zero mutation.
 *     Validated treatment    -> untouched (never a write target here).
 * - Write eligibility needs BOTH the D16 per-concept rule AND a D5-eligible
 *   source association (VERIFIED_EXPLICIT_CIP or
 *   MANUALLY_CONFIRMED_SELECTED_PATIENT). An UNBOUND or association-CONFLICT
 *   source can never write. Each contribution is associated through its own
 *   source unit: e-Orden association never authorizes PreSalud and vice
 *   versa (D5 independence).
 *
 * NO_TOCA: no global apply, no reparse/reapply machinery (T8), no SES write
 * target (T9), no validated-treatment surface, no deletion paths, no
 * parser/reconciliation changes. ses_program stays preview-only here.
 */

export const STATE_CURRENT_EMPTY = 'CURRENT_EMPTY';
export const STATE_ALREADY_MATCHES_CURRENT = 'ALREADY_MATCHES_CURRENT';
export const STATE_PROTECTED_EXISTING = 'PROTECTED_EXISTING';
export const STATE_CONFLICT = 'CONFLICT';
export const STATE_REQUIRES_SELECTION = 'REQUIRES_SELECTION';
export const STATE_NO_PROPOSAL = 'NO_PROPOSAL';

export const PROPOSAL_AUTO_PROPOSABLE = 'AUTO_PROPOSABLE';
export const PROPOSAL_REQUIRES_SELECTION = 'REQUIRES_SELECTION';
export const PROPOSAL_NO_PROPOSAL = 'NO_PROPOSAL';

export const RESOLUTION_CONFLICT = 'CONFLICT';
export const RESOLUTION_CORROBORATED = 'CORROBORATED';
export const RESOLUTION_MULTIPLE_SOURCE_VALUES = 'MULTIPLE_SOURCE_VALUES';

export const ASSOCIATION_VERIFIED = 'VERIFIED_EXPLICIT_CIP';
export const ASSOCIATION_CONFIRMED = 'MANUALLY_CONFIRMED_SELECTED_PATIENT';
export const ASSOCIATION_UNBOUND = 'UNBOUND';
export const ASSOCIATION_CONFLICT = 'CONFLICT';

/**
 * T7 regular hydratable requested-treatment concepts only.
 * (fhDermaPautaOtro is reached through fhDermaPauta=OTRO; it is not an
 * independently proposed concept.)
 */
export const HYDRATABLE_CONCEPTS = Object.freeze([
  'commercial_name',
  'requested_dose',
  'requested_route',
  'requested_schedule',
  'requested_induction',
  'requested_justification',
]);

const CONCEPT_TARGETS = Object.freeze({
  commercial_name: 'fhDermaFarmaco',
  requested_dose: 'fhDermaDosis',
  requested_route: 'fhDermaVia',
  requested_schedule: 'fhDermaPauta',
  requested_induction: 'fhDermaInduccion',
  requested_justification: 'fhDermaJustificacion',
  cip: 'NONE',
  pathology: 'fhDermaPatologia',
  ses_program: 'ses_program',
  principio_activo_raw: 'NONE',
  estado: 'NONE',
  dias: 'NONE',
  medicamento: 'NONE',
  via: 'NONE',
  dosis: 'NONE',
  pauta: 'NONE',
});

/** Exact target for a reconciled concept key (NONE when no writable target). */
export function targetForConcept(concept) {
  return Object.prototype.hasOwnProperty.call(CONCEPT_TARGETS, concept)
    ? CONCEPT_TARGETS[concept]
    : 'NONE';
}

/** Authorized comparison view: NFC + peripheral trim (same as D6). */
export function normalizeValue(value) {
  if (value !== null && typeof value === 'object') {
    const code = typeof value.code === 'string' ? value.code.normalize('NFC').trim() : value.code ?? '';
    const label = typeof value.label === 'string' ? value.label.normalize('NFC').trim() : value.label ?? '';
    return `${code}||${label}`;
  }
  if (typeof value !== 'string') return value;
  return (typeof value.normalize === 'function' ? value.normalize('NFC') : value).trim();
}

function isEmptyCurrent(raw) {
  return raw === undefined || raw === null || String(raw).trim() === '';
}

function displayString(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'object') {
    return [value.code, value.label].filter(Boolean).join(' · ');
  }
  return String(value);
}

/**
 * A safe write proposal exists when the reconciled concept carries an exact
 * writable target and one explicit non-empty value. AUTO_PROPOSABLE vs
 * REQUIRES_SELECTION on a single candidate only encodes the protection axis
 * (current empty vs current different); it never means the value is absent.
 * Genuine conflict / multiple-value selection nodes carry value null and are
 * rejected here (their resolution state blocks earlier in decisionState).
 */
function safeProposalValue(reconciled) {
  if (!reconciled || typeof reconciled !== 'object') return { value: null, ok: false };
  const target = targetForConcept(reconciled.concept);
  if (target === 'NONE') return { value: null, ok: false };
  if (reconciled.proposal_status === PROPOSAL_NO_PROPOSAL) return { value: null, ok: false };
  const value = reconciled.value;
  if (value === null || value === undefined) return { value: null, ok: false };
  const text = displayString(value);
  if (text.trim() === '') return { value: null, ok: false };
  return { value, text: displayString(value), ok: true };
}

/**
 * D16 per-concept protection/decision state for one reconciled concept
 * against its live current form value.
 *
 * Order matters and is closed:
 * 1. Structural first: proposal NO_PROPOSAL or target NONE or absent value
 *    -> NO_PROPOSAL. Missing/unknown/NO_VALUE never clears.
 * 2. Genuine D6 selection/conflict resolution -> CONFLICT / REQUIRES_SELECTION
 *    (value null, no winner).
 * 3. One explicit candidate (AUTO_PROPOSABLE, or the pipeline's single-source
 *    REQUIRES_SELECTION downgrade that only means "current value differs"):
 *    empty current -> CURRENT_EMPTY; equal current -> ALREADY_MATCHES_CURRENT
 *    (no-op); different current -> PROTECTED_EXISTING (default keep, explicit
 *    replace only).
 *
 * currentFormValue is the DOM value (target units / canonical code for
 * selects). The protection axis is therefore computed fresh against the live
 * form at render/decision time (D11: each parse recalculates against the live
 * current value).
 */
export function decisionState(reconciled, currentFormValue) {
  if (!reconciled || typeof reconciled !== 'object') return STATE_NO_PROPOSAL;
  const concept = reconciled.concept;
  if (targetForConcept(concept) === 'NONE') return STATE_NO_PROPOSAL;
  if (reconciled.proposal_status === PROPOSAL_NO_PROPOSAL) return STATE_NO_PROPOSAL;
  if (reconciled.resolution === RESOLUTION_CONFLICT) return STATE_CONFLICT;
  if (reconciled.resolution === RESOLUTION_MULTIPLE_SOURCE_VALUES) return STATE_REQUIRES_SELECTION;
  const proposed = safeProposalValue(reconciled);
  if (!proposed.ok) {
    // value null without a conflict/multi resolution: nothing safe to apply.
    return reconciled.proposal_status === PROPOSAL_REQUIRES_SELECTION ? STATE_REQUIRES_SELECTION : STATE_NO_PROPOSAL;
  }
  if (isEmptyCurrent(currentFormValue)) {
    return reconciled.proposal_status === PROPOSAL_AUTO_PROPOSABLE ? STATE_CURRENT_EMPTY : STATE_REQUIRES_SELECTION;
  }
  if (normalizeValue(currentFormValue) === normalizeValue(proposed.text)) return STATE_ALREADY_MATCHES_CURRENT;
  return STATE_PROTECTED_EXISTING;
}

/**
 * D5 x D16 write-eligibility.
 * Returns { writable, reason } where writable is true only when the
 * professional decision state is CURRENT_EMPTY or PROTECTED_EXISTING (the
 * two states a per-concept confirm/replace decision may act on) AND every
 * contributing source of the proposal has passed its own D5 gate.
 *
 * Association states are consumed as computed (T6 owns computation); this
 * module never recomputes or weakens them. Association CONFLICT (D5) and
 * reconciliation CONFLICT (D6) stay distinct blocking reasons.
 */
export function writeEligibility(reconciled, currentFormValue, associationStates) {
  const state = decisionState(reconciled, currentFormValue);
  if (state === STATE_CONFLICT) return { writable: false, reason: 'RECONCILIATION_CONFLICT_BLOCKS_WRITE' };
  if (state === STATE_REQUIRES_SELECTION) return { writable: false, reason: 'REQUIRES_SELECTION' };
  if (state === STATE_NO_PROPOSAL) return { writable: false, reason: 'NO_PROPOSAL' };
  if (state === STATE_ALREADY_MATCHES_CURRENT) return { writable: false, reason: 'ALREADY_MATCHES_CURRENT_NO_REWRITE' };
  if (!Array.isArray(associationStates) || associationStates.length === 0) {
    return { writable: false, reason: 'NO_ELIGIBLE_SOURCE_ASSOCIATION' };
  }
  for (const association of associationStates) {
    if (!association || (association.state !== ASSOCIATION_VERIFIED && association.state !== ASSOCIATION_CONFIRMED)) {
      const reason = association && association.state === ASSOCIATION_CONFLICT
        ? 'SOURCE_ASSOCIATION_CONFLICT_BLOCKS_WRITE'
        : 'SOURCE_ASSOCIATION_NOT_ELIGIBLE';
      return { writable: false, reason };
    }
  }
  return { writable: true, reason: null };
}

/**
 * Execute one per-concept professional decision.
 * @param {object} params
 *   reconciled        reconciled concept node (from pipeline result)
 *   currentValue      current DOM value of the target
 *   associationStates D5 states for the proposal's contributing sources
 *   action            'confirm' (CURRENT_EMPTY) | 'replace' (PROTECTED_EXISTING)
 *   write             seam (target, value) => void — no DOM here
 * @returns { applied, appliedValue, state, reason }
 *   applied true only when the explicit decision actually wrote; otherwise
 *   zero mutation. Writing records applied_value = source_value.
 */
export function applyConcept({ reconciled, currentValue, associationStates, action, write }) {
  const eligibility = writeEligibility(reconciled, currentValue, associationStates);
  if (!eligibility.writable) {
    return { applied: false, appliedValue: null, state: decisionState(reconciled, currentValue), reason: eligibility.reason };
  }
  const state = decisionState(reconciled, currentValue);
  if (state === STATE_CURRENT_EMPTY && action !== 'confirm') {
    return { applied: false, appliedValue: null, state, reason: 'CURRENT_EMPTY_REQUIRES_CONFIRM' };
  }
  if (state === STATE_PROTECTED_EXISTING && action !== 'replace') {
    return { applied: false, appliedValue: null, state, reason: 'PROTECTED_EXISTING_REQUIRES_REPLACE' };
  }
  const proposed = safeProposalValue(reconciled);
  if (!proposed.ok) return { applied: false, appliedValue: null, state: STATE_NO_PROPOSAL, reason: 'NO_PROPOSAL' };
  const target = targetForConcept(reconciled.concept);
  const appliedValue = displayString(proposed.value);
  if (typeof write === 'function') write(target, appliedValue);
  return { applied: true, appliedValue, sourceValue: proposed.text, target, state, reason: null };
}
