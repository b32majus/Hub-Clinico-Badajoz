/**
 * WO-E4 (issue #301, T9) — Pure SES Program write target + survival core (Seam 1).
 *
 * Adjudicated brownfield normal-form carrying mechanism (D1a / D7 / D12 / #301):
 *   - `ses_program_code`  -> normal-form control `fhDermaSesProgramCode`
 *   - `ses_program_label` -> normal-form control `fhDermaSesProgramLabel`
 *   - visible pathology   -> existing brownfield `fhDermaPatologia`
 * The pair is NORMAL FORM of the selected SES program, NOT transient provenance.
 * Only this module's declared closed table maps an allowlisted SES code to the
 * visible brownfield value; nothing else, ever. No accent normalization, no
 * fuzzy matching, no inference, no catalogue, no CIMA.
 *
 * Write-boundary guarantee (#301 AC-4): the apply path can never write an
 * invalid SES pair. `resolveSesProgramWrite(value)` accepts ONLY a coherent
 * allowlist pair (code present in the closed allowlist AND label exactly equal
 * to that code's canonical label). Unknown / out-of-allowlist / mismatched /
 * incomplete pairs return `{ writable:false, reason }` with the exact structured
 * SES_* reason and zero write targets.
 *
 * This module is pure and deterministic: no DOM, no storage, no console, no
 * side effects. DOM writes are executed by the caller through a seam.
 *
 * NO_TOCA: no allowlist expansion (5 programs exactly), no brownfield ID
 * rename, no parser/reconciliation changes, no persistence changes, no
 * validated-treatment surface, no deletion.
 */

/** SES_PROGRAM_CODE controls — adjudicated brownfield normal-form ids (#301). */
export const SES_PROGRAM_CODE_CONTROL = 'fhDermaSesProgramCode';
export const SES_PROGRAM_LABEL_CONTROL = 'fhDermaSesProgramLabel';
/** Existing visible brownfield pathology control (never renamed). */
export const SES_PROGRAM_PATHOLOGY_CONTROL = 'fhDermaPatologia';

/** SES write target identity used by the per-concept decision surface. */
export const SES_PROGRAM_TARGET = 'ses_program';

/**
 * Closed declared table: allowlisted SES code -> canonical SES label (exact,
 * catalogue case/accent preserved) + the exact visible brownfield pathology
 * value written into fhDermaPatologia. This is the ONLY code->visible mapping
 * (D1a explicit table; D7 note). Declared, not fuzzy, not inferred.
 */
export const SES_PROGRAM_BROWNFIELD_VALUES = Object.freeze({
  SES_HS: Object.freeze({
    label: 'HIDRADENITIS SUPURATIVA',
    visible: 'Hidradenitis supurativa',
  }),
  SES_PSOR: Object.freeze({
    label: 'PSORIASIS',
    visible: 'Psoriasis',
  }),
  SES_DA: Object.freeze({
    label: 'DERMATITIS ATOPICA',
    visible: 'Dermatitis atópica',
  }),
  SES_VITI: Object.freeze({
    label: 'VITILIGO',
    visible: 'Vitíligo',
  }),
  SES_AA: Object.freeze({
    label: 'ALOPECIA AREATA',
    visible: 'Alopecia areata',
  }),
});

/** Exact labels every allowlisted code must carry (coherence boundary). */
export const SES_PROGRAM_LABELS = Object.freeze(
  Object.fromEntries(
    Object.entries(SES_PROGRAM_BROWNFIELD_VALUES).map(([code, entry]) => [code, entry.label]),
  ),
);

/** SES_* deterministic reasons surfaced by the write boundary. */
export const SES_REASON_UNKNOWN_CODE = 'SES_UNKNOWN_CODE';
export const SES_REASON_OUT_OF_ALLOWLIST = 'SES_OUT_OF_ALLOWLIST';
export const SES_REASON_LABEL_CODE_MISMATCH = 'SES_LABEL_CODE_MISMATCH';
export const SES_REASON_CODE_WITHOUT_LABEL = 'SES_CODE_WITHOUT_LABEL';
export const SES_REASON_LABEL_WITHOUT_CODE = 'SES_LABEL_WITHOUT_CODE';
export const SES_REASON_PAIR_MISSING = 'SES_PAIR_MISSING';
export const SES_REASON_VALUE_NOT_OBJECT = 'SES_PROGRAM_VALUE_INVALID';

/** Normalize an opaque ses_program proposal value to {code,label} strings. */
function pairOf(value) {
  if (value === null || typeof value !== 'object') {
    return { code: '', label: '', reason: SES_REASON_VALUE_NOT_OBJECT };
  }
  const rawCode = value.code;
  const rawLabel = value.label;
  const code = typeof rawCode === 'string' ? rawCode.normalize('NFC').trim() : '';
  const label = typeof rawLabel === 'string' ? rawLabel.normalize('NFC').trim() : '';
  if (!code && !label) return { code, label, reason: SES_REASON_PAIR_MISSING };
  if (!code) return { code, label, reason: SES_REASON_LABEL_WITHOUT_CODE };
  if (!label) return { code, label, reason: SES_REASON_CODE_WITHOUT_LABEL };
  return { code, label, reason: null };
}

/**
 * Deterministic closed resolution of one proposed SES program value into the
 * exact normal-form write set.
 *
 * @param {{code:string,label:string}|null} value proposed ses_program value
 * @returns {{ writable:boolean, code?:string, label?:string, visible?:string,
 *            reason?:string }}
 *   writable:true only for a coherent allowlist pair; the returned code/label
 *   are the verbatim canonical pair and `visible` is the declared brownfield
 *   value. Everything else is writable:false with the exact structured reason
 *   and NO write targets (the apply path can never write an invalid pair).
 */
export function resolveSesProgramWrite(value) {
  const pair = pairOf(value);
  if (pair.reason) return { writable: false, reason: pair.reason };
  if (!Object.prototype.hasOwnProperty.call(SES_PROGRAM_BROWNFIELD_VALUES, pair.code)) {
    return { writable: false, reason: SES_REASON_OUT_OF_ALLOWLIST };
  }
  const entry = SES_PROGRAM_BROWNFIELD_VALUES[pair.code];
  if (pair.label !== entry.label) return { writable: false, reason: SES_REASON_LABEL_CODE_MISMATCH };
  return {
    writable: true,
    code: pair.code,
    label: pair.label,
    visible: entry.visible,
    reason: null,
  };
}

/** True when the proposed value is a coherent allowlist SES pair. */
export function isCoherentSesProgramPair(value) {
  return resolveSesProgramWrite(value).writable === true;
}
