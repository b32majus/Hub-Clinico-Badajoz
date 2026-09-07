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
 *   source association (VERIFIED_EXPLICIT_CIP, MANUALLY_CONFIRMED_SELECTED_PATIENT,
 *   or — only when the T6 computation established that NO Farmacia patient is
 *   selected — TRANSIENT_NEW_REQUEST). An UNBOUND or association-CONFLICT
 *   source can never write. Each contribution is associated through its own
 *   source unit: e-Orden association never authorizes PreSalud and vice
 *   versa (D5 independence). The transient new-request state authorizes
 *   hydration of the transient new-request form only through the same explicit
 *   per-concept professional decisions; it never creates, selects, associates
 *   or persists a patient and never touches validated treatment.
 *
 * C1 (issue #339) adds the D17_EXT_V1 protected clinical hydration layer on
 * top of the same D5 x D16 machinery: exactly the 39 DIRECT_FUTURE_TARGET /
 * NORMALIZATION_REQUIRED concepts of the frozen B contract receive exact
 * targets and closed destination adapters (literal text, exact si/no select
 * values, explicit checkbox SÍ -> checked=true, exact Hurley I|II|III, strict
 * control-compatible numeric text). C2 (issue #340) extends the same layer
 * with exactly the 7 safe analítica/vacunación common concepts (exact valid
 * ISO date, closed si/no select, explicit checkbox SÍ, closed Mantoux enum,
 * exact SÍ/NO/Pendiente vaccination mapping, literal observations text) —
 * while the combined VHB/VHC/VIH serology concept stays provenance-only and
 * MUST NEVER be split into the three separate Farmacia controls. C1
 * clinical gates (pathology coherence, parent condition) are pure functions
 * here and are enforced by the review UI at render, click and global-executor
 * time against LIVE form values. Pasting/importing never equals clinical
 * validation; existing non-empty destinations stay protected.
 *
 * NO_TOCA: no global apply, no reparse/reapply machinery (T8), no SES write
 * target (T9), no validated-treatment surface, no deletion paths, no
 * parser/reconciliation grammar changes. ses_program stays preview-only here.
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
 * No-patient transient new-request association (issue #328). Returned by the
 * T6 association computation ONLY when no Farmacia patient is selected and the
 * source itself qualifies on its own explicit data (one explicit e-Orden CIP,
 * or PreSalud explicit concepts — which never carry a CIP). It enables the
 * same explicit per-concept D16 decisions to hydrate the transient
 * new-request form controls. It is never emitted when a patient IS selected,
 * so the existing selected-patient D5 gates (VERIFIED / CONFIRMED / CONFLICT /
 * UNBOUND) are untouched; it never creates or selects a patient, never writes
 * a patient_id/session, and never touches validated treatment.
 */
export const ASSOCIATION_TRANSIENT_NEW_REQUEST = 'TRANSIENT_NEW_REQUEST';

/**
 * C1 (issue #339): the 39 D17_EXT_V1 concepts with a real Farmacia destination
 * (frozen B contract `contract-336-d17-ext-v1.json`, classes
 * DIRECT_FUTURE_TARGET / NORMALIZATION_REQUIRED). C2 (issue #340) adds exactly
 * the 7 safe analítica/vacunación common concepts through the same protected
 * lifecycle. Composite provenance-only concepts
 * (`derma_psoriasis_prior_systemic_detail`,
 * `derma_ad_prior_cyclosporine_detail`, `derma_hs_prior_other_biologics_detail`)
 * and the combined `derma_viral_serologies` concept remain deliberately absent:
 * the combined serology carries VHB/VHC/VIH as ONE value while Farmacia exposes
 * three separate controls, so it never becomes writable and never splits.
 */
export const D17_EXT_HYDRATABLE_CONCEPTS = Object.freeze([
  'derma_hs_ihs4',
  'derma_hs_hurley',
  'derma_hs_evolution_time',
  'derma_hs_location',
  'derma_hs_prior_doxy_clinda',
  'derma_hs_prior_rif_clinda',
  'derma_hs_prior_other_antibiotics',
  'derma_hs_prior_other_antibiotics_detail',
  'derma_hs_prior_adalimumab',
  'derma_hs_prior_adalimumab_duration',
  'derma_hs_prior_adalimumab_end_reason',
  'derma_hs_prior_other_biologics',
  'derma_psoriasis_pasi',
  'derma_psoriasis_bsa',
  'derma_psoriasis_dlqi',
  'derma_psoriasis_pga',
  'derma_psoriasis_prior_systemic',
  'derma_psoriasis_no_systemic_reason',
  'derma_ad_easi',
  'derma_ad_scorad',
  'derma_ad_dlqi_poem',
  'derma_ad_prior_cyclosporine',
  'derma_ad_no_cyclosporine_reason',
  'derma_vitiligo_extent',
  'derma_vitiligo_facial',
  'derma_vitiligo_prior_topical_calcineurin',
  'derma_vitiligo_prior_topical_steroids',
  'derma_vitiligo_observations',
  'derma_aa_extent_gt50',
  'derma_aa_episode_gt6m',
  'derma_aa_systemic_corticosteroids',
  'derma_aa_observations',
  'derma_comorb_bmi',
  'derma_comorb_smoking_status',
  'derma_comorb_pack_years',
  'derma_comorb_diabetes',
  'derma_comorb_hba1c',
  'derma_comorb_metabolic_syndrome',
  'derma_comorb_other',
  // C2 (issue #340): exactly the 7 safe analítica/vacunación common concepts.
  // The combined derma_viral_serologies stays provenance-only (NEVER split
  // into fhAnaliticaSerologiasVhb/Vhc/Vih) and the composite details stay out.
  'derma_lab_date',
  'derma_lab_complete_lt3m',
  'derma_cbc_verified',
  'derma_biochemistry_verified',
  'derma_tb_screening',
  'derma_vaccination_review',
  'derma_vaccination_observations',
]);

const D17_EXT_HYDRATABLE_SET = new Set(D17_EXT_HYDRATABLE_CONCEPTS);

/**
 * Hydratable concepts: the T7 regular requested-treatment concepts plus the C1
 * D17_EXT_V1 protected clinical concepts.
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
  ...D17_EXT_HYDRATABLE_CONCEPTS,
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
  // C1 (issue #339): exact D17_EXT_V1 destination mapping (frozen C1
  // oracle authority). One concept -> one exact brownfield control.
  derma_hs_ihs4: 'fhHSIhs4',
  derma_hs_hurley: 'fhHSHurley',
  derma_hs_evolution_time: 'fhHSTiempoEvolucion',
  derma_hs_location: 'fhHSLocalizacion',
  derma_hs_prior_doxy_clinda: 'fhHSTtoDoxiClinda',
  derma_hs_prior_rif_clinda: 'fhHSTtoRifClinda',
  derma_hs_prior_other_antibiotics: 'fhHSTtoOtrosAb',
  derma_hs_prior_other_antibiotics_detail: 'fhHSTtoOtrosAbTxt',
  derma_hs_prior_adalimumab: 'fhHSBioAda',
  derma_hs_prior_adalimumab_duration: 'fhHSBioAdaDuracion',
  derma_hs_prior_adalimumab_end_reason: 'fhHSBioAdaMotivo',
  derma_hs_prior_other_biologics: 'fhHSBioOtros',
  derma_psoriasis_pasi: 'fhPsPasi',
  derma_psoriasis_bsa: 'fhPsBsa',
  derma_psoriasis_dlqi: 'fhPsDlqi',
  derma_psoriasis_pga: 'fhPsPga',
  derma_psoriasis_prior_systemic: 'fhPsSistemicoPrevio',
  derma_psoriasis_no_systemic_reason: 'fhPsSistemicoNoMotivo',
  derma_ad_easi: 'fhDaEasi',
  derma_ad_scorad: 'fhDaScorad',
  derma_ad_dlqi_poem: 'fhDaDlqiPoem',
  derma_ad_prior_cyclosporine: 'fhDaCiclosporinaPrevia',
  derma_ad_no_cyclosporine_reason: 'fhDaCiclosporinaNoMotivo',
  derma_vitiligo_extent: 'fhVitExtension',
  derma_vitiligo_facial: 'fhVitFacial',
  derma_vitiligo_prior_topical_calcineurin: 'fhVitCalcineurinaPrevia',
  derma_vitiligo_prior_topical_steroids: 'fhVitCorticoidesPrevios',
  derma_vitiligo_observations: 'fhVitObservaciones',
  derma_aa_extent_gt50: 'fhAaExtension50',
  derma_aa_episode_gt6m: 'fhAaEpisodio6Meses',
  derma_aa_systemic_corticosteroids: 'fhAaCorticoidesSistemicos',
  derma_aa_observations: 'fhAaObservaciones',
  derma_comorb_bmi: 'fhHSComorbImc',
  derma_comorb_smoking_status: 'fhHSComorbTabaquismo',
  derma_comorb_pack_years: 'fhHSComorbPaquetes',
  derma_comorb_diabetes: 'fhHSComorbDiabetes',
  derma_comorb_hba1c: 'fhHSComorbHba1c',
  derma_comorb_metabolic_syndrome: 'fhHSComorbSdMetabolico',
  derma_comorb_other: 'fhHSComorbOtras',
  // C2 (issue #340): the 7 safe analítica/vacunación common concepts.
  // derma_viral_serologies is deliberately absent: combined VHB/VHC/VIH has
  // NO structured write target (provenance-only) and never splits.
  derma_lab_date: 'fhAnaliticaFecha',
  derma_lab_complete_lt3m: 'fhAnaliticaReciente',
  derma_cbc_verified: 'fhAnaliticaHemograma',
  derma_biochemistry_verified: 'fhAnaliticaBioquimica',
  derma_tb_screening: 'fhAnaliticaMantoux',
  derma_vaccination_review: 'fhAnaliticaVacunacion',
  derma_vaccination_observations: 'fhAnaliticaObservaciones',
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

/* ------------------------------------------------------------------ *
 * C1 (issue #339) — closed destination adapters and clinical gates.   *
 * ------------------------------------------------------------------ *
 * Every adapter is CLOSED: it maps only exact contract values into the
 * exact brownfield control value space and rejects everything else
 * (no comma-to-dot, no units, no rounding, no thresholding, no other
 * coercion). It never invents a value and never writes a boolean false.
 */

/** D17_EXT_V1 concepts whose brownfield destination is a checkbox (checkbox_true). */
export const D17_EXT_CHECKBOX_TARGETS = Object.freeze([
  'fhHSTtoDoxiClinda', 'fhHSTtoRifClinda', 'fhHSTtoOtrosAb', 'fhHSBioAda', 'fhHSBioOtros',
  // C2 (issue #340): verified hemogram/biochemistry chips. Explicit SÍ only;
  // absence of source never unchecks (the adapter never writes a boolean false).
  'fhAnaliticaHemograma', 'fhAnaliticaBioquimica',
]);

const D17_EXT_CHECKBOX_CONCEPTS = new Set([
  'derma_hs_prior_doxy_clinda', 'derma_hs_prior_rif_clinda', 'derma_hs_prior_other_antibiotics',
  'derma_hs_prior_adalimumab', 'derma_hs_prior_other_biologics',
  // C2 (issue #340): verified analítica chips (explicit SÍ only, never unchecks).
  'derma_cbc_verified', 'derma_biochemistry_verified',
]);

const D17_EXT_SELECT_SI_NO_CONCEPTS = new Set([
  'derma_psoriasis_prior_systemic', 'derma_ad_prior_cyclosporine', 'derma_vitiligo_facial',
  'derma_vitiligo_prior_topical_calcineurin', 'derma_vitiligo_prior_topical_steroids',
  'derma_aa_extent_gt50', 'derma_aa_episode_gt6m', 'derma_aa_systemic_corticosteroids',
  'derma_comorb_diabetes', 'derma_comorb_metabolic_syndrome',
  // C2 (issue #340): "Analítica <3 meses" select uses the same closed si/no values.
  'derma_lab_complete_lt3m',
]);

/**
 * C2 (issue #340): closed analítica/vacunación value adapters.
 * - derma_lab_date accepts ONLY an exact valid ISO `YYYY-MM-DD` calendar date
 *   (no DD/MM/YYYY, no partial dates, no whitespace variants, no coercion).
 * - derma_tb_screening maps verbatim: the Mantoux/IGRA hidden carrier and its
 *   chip/radio group share the exact same closed value space.
 * - derma_vaccination_review maps the exact contract values SÍ/NO/Pendiente
 *   into the existing control values si/no/pendiente (hidden carrier + chip).
 * Any other value is rejected, never coerced.
 */
const C2_DATE_CONCEPTS = new Set(['derma_lab_date']);
const C2_VERBATIM_ENUM_CONCEPTS = new Set(['derma_tb_screening']);
const C2_VACCINATION_REVIEW_VALUES = Object.freeze({ SÍ: 'si', NO: 'no', Pendiente: 'pendiente' });
const C2_MANTOUX_VALUES = Object.freeze(['Negativo', 'Positivo - tratado', 'Pendiente']);
const ISO_DATE_TEXT = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

/** True only for an exact, real calendar `YYYY-MM-DD` date (UTC round-trip). */
function isValidIsoCalendarDate(raw) {
  if (!ISO_DATE_TEXT.test(raw)) return false;
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(5, 7));
  const day = Number(raw.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const D17_EXT_SMOKING_CONCEPTS = new Set(['derma_comorb_smoking_status']);
const D17_EXT_HURLEY_CONCEPTS = new Set(['derma_hs_hurley']);

/**
 * Numeric concepts map to `input[type=number]` brownfield controls. Their
 * adapter accepts ONLY strict control-compatible numeric text: canonical
 * dot-decimal digits (no comma-to-dot conversion, no sign, no units, no
 * rounding) that satisfy the live control's min/max/step compatibility.
 * Out-of-range or step-mismatched values are rejected, never clamped.
 */
const D17_EXT_NUMERIC_CONCEPTS = new Set([
  'derma_hs_ihs4', 'derma_psoriasis_pasi', 'derma_psoriasis_dlqi', 'derma_ad_easi', 'derma_ad_scorad',
]);

const D17_EXT_NUMERIC_CONTROL_COMPATIBILITY = Object.freeze({
  derma_hs_ihs4: { min: 0, step: 0.1 },
  derma_psoriasis_pasi: { min: 0, step: 0.1 },
  derma_psoriasis_dlqi: { min: 0, max: 30 },
  derma_ad_easi: { min: 0, step: 0.1 },
  derma_ad_scorad: { min: 0, step: 0.1 },
});

const HURLEY_CONTROL_VALUES = Object.freeze({ I: 'Hurley I', II: 'Hurley II', III: 'Hurley III' });
const SMOKING_CONTROL_VALUES = Object.freeze(['Activo', 'Exfumador', 'No fumador']);
const STRICT_NUMERIC_TEXT = /^[0-9]+(?:\.[0-9]+)?$/;
const STEP_EPSILON = 1e-9;

/**
 * Pathology gate (C1): pathology-specific concepts are non-writable while the
 * current/accepted pathology is empty, incoherent or conflicted. Common
 * comorbidity concepts carry no pathology family and are never gated here.
 */
const D17_EXT_PATHOLOGY_FAMILIES = Object.freeze([
  ['derma_hs_', 'Hidradenitis supurativa'],
  ['derma_psoriasis_', 'Psoriasis'],
  ['derma_ad_', 'Dermatitis atópica'],
  ['derma_vitiligo_', 'Vitíligo'],
  ['derma_aa_', 'Alopecia areata'],
]);

/**
 * Parent/child gate (C1): conditional detail may write only when its parent is
 * already satisfied in the LIVE form. Values are expressed in the control value
 * space: checkbox parents are satisfied by the checked representation 'SÍ';
 * si/no select parents by the exact control values 'si' / 'no'; the smoking
 * select by its exact 'Activo' value.
 */
const D17_EXT_PARENT_CONDITIONS = Object.freeze({
  derma_hs_prior_other_antibiotics_detail: { concept: 'derma_hs_prior_other_antibiotics', value: 'SÍ' },
  derma_hs_prior_adalimumab_duration: { concept: 'derma_hs_prior_adalimumab', value: 'SÍ' },
  derma_hs_prior_adalimumab_end_reason: { concept: 'derma_hs_prior_adalimumab', value: 'SÍ' },
  derma_psoriasis_no_systemic_reason: { concept: 'derma_psoriasis_prior_systemic', value: 'no' },
  derma_ad_no_cyclosporine_reason: { concept: 'derma_ad_prior_cyclosporine', value: 'no' },
  derma_comorb_pack_years: { concept: 'derma_comorb_smoking_status', value: 'Activo' },
  derma_comorb_hba1c: { concept: 'derma_comorb_diabetes', value: 'si' },
});

export function isD17ExtHydratableConcept(concept) {
  return D17_EXT_HYDRATABLE_SET.has(concept);
}

/** Pathology family (accepted #fhDermaPatologia value) a concept belongs to, or null. */
export function pathologyFamilyFor(concept) {
  for (const [prefix, family] of D17_EXT_PATHOLOGY_FAMILIES) {
    if (String(concept || '').startsWith(prefix)) return family;
  }
  return null;
}

/** Parent condition ({ concept, value }) for a conditional detail concept, or null. */
export function parentConditionFor(concept) {
  return Object.prototype.hasOwnProperty.call(D17_EXT_PARENT_CONDITIONS, concept)
    ? D17_EXT_PARENT_CONDITIONS[concept]
    : null;
}

/**
 * Closed C1 adapter: maps one explicit source value of a D17_EXT_V1 concept
 * into its brownfield control value space, or rejects it. The returned text is
 * exactly what would be written/compared against the control. Authorization
 * normalization is NFC + peripheral trim only (same axis as D6 comparison).
 */
export function adaptD17ExtControlValue(concept, value) {
  const raw = typeof value === 'string' ? value.normalize('NFC').trim() : displayString(value).trim();
  if (D17_EXT_CHECKBOX_CONCEPTS.has(concept)) {
    return raw === 'SÍ'
      ? { ok: true, text: 'SÍ' }
      : { ok: false, reason: 'CHECKBOX_REQUIRES_EXPLICIT_SI' };
  }
      if (D17_EXT_SELECT_SI_NO_CONCEPTS.has(concept)) {
        if (raw === 'SÍ') return { ok: true, text: 'si' };
        if (raw === 'NO') return { ok: true, text: 'no' };
        return { ok: false, reason: 'SI_NO_SELECT_REQUIRES_EXPLICIT_CONTRACT_VALUE' };
      }
      if (C2_DATE_CONCEPTS.has(concept)) {
        return isValidIsoCalendarDate(raw)
          ? { ok: true, text: raw }
          : { ok: false, reason: 'DATE_REQUIRES_EXACT_VALID_ISO_YYYY_MM_DD' };
      }
      if (C2_VERBATIM_ENUM_CONCEPTS.has(concept)) {
        return C2_MANTOUX_VALUES.includes(raw)
          ? { ok: true, text: raw }
          : { ok: false, reason: 'MANTOUX_ENUM_REQUIRES_CONTRACT_VALUE' };
      }
      if (Object.prototype.hasOwnProperty.call(C2_VACCINATION_REVIEW_VALUES, raw)) {
        return { ok: true, text: C2_VACCINATION_REVIEW_VALUES[raw] };
      }
      if (concept === 'derma_vaccination_review') {
        return { ok: false, reason: 'VACCINATION_REVIEW_REQUIRES_EXACT_CONTRACT_VALUE' };
      }
  if (D17_EXT_HURLEY_CONCEPTS.has(concept)) {
    return Object.prototype.hasOwnProperty.call(HURLEY_CONTROL_VALUES, raw)
      ? { ok: true, text: HURLEY_CONTROL_VALUES[raw] }
      : { ok: false, reason: 'HURLEY_ENUM_REQUIRES_CONTRACT_VALUE' };
  }
  if (D17_EXT_SMOKING_CONCEPTS.has(concept)) {
    return SMOKING_CONTROL_VALUES.includes(raw)
      ? { ok: true, text: raw }
      : { ok: false, reason: 'SMOKING_ENUM_REQUIRES_CONTRACT_VALUE' };
  }
  if (D17_EXT_NUMERIC_CONCEPTS.has(concept)) {
    if (!STRICT_NUMERIC_TEXT.test(raw)) return { ok: false, reason: 'NUMERIC_TEXT_NOT_CONTROL_COMPATIBLE' };
    const numeric = Number(raw);
    const compatibility = D17_EXT_NUMERIC_CONTROL_COMPATIBILITY[concept];
    if (compatibility) {
      if (compatibility.min !== undefined && numeric < compatibility.min) {
        return { ok: false, reason: 'NUMERIC_TEXT_NOT_CONTROL_COMPATIBLE' };
      }
      if (compatibility.max !== undefined && numeric > compatibility.max) {
        return { ok: false, reason: 'NUMERIC_TEXT_NOT_CONTROL_COMPATIBLE' };
      }
      if (compatibility.step !== undefined) {
        const units = (numeric - (compatibility.min ?? 0)) / compatibility.step;
        if (Math.abs(units - Math.round(units)) > STEP_EPSILON) {
          return { ok: false, reason: 'NUMERIC_TEXT_NOT_CONTROL_COMPATIBLE' };
        }
      }
    }
    return { ok: true, text: raw };
  }
  // Literal text / textarea destinations: verbatim peripheral-trimmed text.
  return raw === '' ? { ok: false, reason: 'TEXT_VALUE_EMPTY' } : { ok: true, text: raw };
}

/**
 * C1 closed clinical gate for one concept against LIVE form context.
 * Returns null when no C1 gate blocks the concept, or a deterministic blocking
 * reason. Numeric adapter rejection is NOT a gate (it already fails inside the
 * proposal space); gates here are only the pathology and parent conditions.
 * @param {string} concept
 * @param {{ pathologyValue?: string, parentValue?: string }} context live form values
 */
export function d17ExtGate(concept, context = {}) {
  const family = pathologyFamilyFor(concept);
  if (family) {
    const accepted = typeof context.pathologyValue === 'string' ? context.pathologyValue.trim() : '';
    if (accepted === '') {
      return { code: 'PATHOLOGY_NOT_ACCEPTED', message: 'No hay una patología aceptada coherente para escribir este concepto específico de patología.' };
    }
    if (normalizeValue(accepted) !== normalizeValue(family)) {
      return { code: 'PATHOLOGY_MISMATCH', message: `La patología aceptada (${accepted}) no es coherente con el destino de este concepto (${family}).` };
    }
  }
  const parent = parentConditionFor(concept);
  if (parent) {
    const parentCurrent = typeof context.parentValue === 'string' ? context.parentValue.trim() : '';
    if (normalizeValue(parentCurrent) !== normalizeValue(parent.value)) {
      return { code: 'PARENT_CONDITION_NOT_SATISFIED', message: `El concepto condicional requiere su condición padre satisfecha (${parent.concept} = ${parent.value}).` };
    }
  }
  return null;
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
  // C1 (issue #339): D17_EXT_V1 concepts pass through their closed destination
  // adapter. A value the adapter rejects (non-contract enum, non-strict numeric
  // text, non-explicit checkbox value) is not a safe proposal at all: nothing
  // is written, nothing is coerced.
  if (D17_EXT_HYDRATABLE_SET.has(reconciled.concept)) {
    const adapted = adaptD17ExtControlValue(reconciled.concept, text);
    if (!adapted.ok) return { value: null, ok: false };
    return { value: adapted.text, text: adapted.text, ok: true };
  }
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
 * module never recomputes or weakens them. TRANSIENT_NEW_REQUEST reaches
 * this matrix only when T6 established that no patient is selected; the
 * selected-patient D5 verdicts remain exactly as before. Association
 * CONFLICT (D5) and reconciliation CONFLICT (D6) stay distinct blocking
 * reasons.
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
        if (!association || (association.state !== ASSOCIATION_VERIFIED
          && association.state !== ASSOCIATION_CONFIRMED
          && association.state !== ASSOCIATION_TRANSIENT_NEW_REQUEST)) {
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
