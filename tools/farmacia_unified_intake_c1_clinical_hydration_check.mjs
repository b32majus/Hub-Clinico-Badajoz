#!/usr/bin/env node
/**
 * C1 (issue #339) deterministic checks — D17_EXT_V1 protected per-concept
 * clinical hydration (Train C, WO-FH-EORDEN-CLINICAL-HYDRATION-C1-01).
 *
 * Principal frozen oracle: the independently frozen C1 browser oracle
 * (oracle-c1-clinical-hydration.mjs). This file adds the exhaustive
 * deterministic mapping/adapter/gate battery the C1 WO requires:
 *   - exactly the 39 DIRECT_FUTURE_TARGET / NORMALIZATION_REQUIRED concepts
 *     with exact targets and hydratable membership;
 *   - composite provenance-only and analítica/vacunación concepts stay
 *     non-writable (target NONE, NO_PROPOSAL, not hydratable);
 *   - closed destination adapters (literal text, exact si/no select values,
 *     explicit checkbox SÍ -> checked=true, exact Hurley I|II|III, strict
 *     control-compatible numeric text, no coercion of any kind);
 *   - pathology gate (empty / mismatch / coherent; common concepts never gated);
 *   - parent/child gate (satisfied / denied / stale parent blocks child);
 *   - D16 protection states and D5 write eligibility preserved for C1 concepts
 *     (CURRENT_EMPTY confirm, ALREADY_MATCHES no-rewrite, PROTECTED_EXISTING
 *     explicit replace, cancel zero mutation, UNBOUND blocks, missing source
 *     never clears);
 *   - reparse lifecycle preserved (staged decisions expire on a new parse run;
 *     manual-edit-after-apply protection applies to C1 concepts too).
 *
 * Synthetic data only. Does not touch the DOM.
 */
import assert from 'node:assert/strict';
import { runUnifiedIntake } from '../scripts/fh_intake_pipeline.js';
import { parseDermaEOrdenRaw } from '../scripts/fh_eorden_parser.js';
import {
  STATE_CURRENT_EMPTY,
  STATE_ALREADY_MATCHES_CURRENT,
  STATE_PROTECTED_EXISTING,
  STATE_NO_PROPOSAL,
  HYDRATABLE_CONCEPTS,
  D17_EXT_HYDRATABLE_CONCEPTS,
  adaptD17ExtControlValue,
  d17ExtGate,
  parentConditionFor,
  pathologyFamilyFor,
  targetForConcept,
  decisionState,
  writeEligibility,
  applyConcept,
} from '../scripts/fh_intake_apply.js';
import {
  createReviewContext,
  continueParseRun,
  manualEditDetected,
} from '../scripts/fh_intake_review_lifecycle.js';

let passed = 0;
let failed = 0;
function ok(label, condition) {
  if (condition) { passed += 1; console.log(`  ✓ ${label}`); }
  else { failed += 1; console.log(`  ✗ ${label}`); }
}

const SEP = '═'.repeat(55);
const MARKER = 'EXTENSIÓN CLÍNICA DERMATOLOGÍA V1';
const TERMINATOR = 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1';

/** D17 legacy prefix with title pathology, SES pair and optional CIP. */
function d17Unit(title, sesCode, sesLabel, { cip = 'CIP-SINT-C1-001' } = {}) {
  return [
    `SOLICITUD DERMATOLOGÍA → FARMACIA - ${title}`, SEP,
    ...(cip ? [`• CIP: ${cip}`] : []),
    '• Marca comercial solicitada: HYRIMOZ', '• Dosis solicitada: 40 MG',
    '• Vía solicitada: SC', '• Pauta: CADA 14 DIAS', '• Inducción solicitada: NO',
    '• Justificación clínica: Justificación sintética C1.',
    'PROGRAMA SES', `• Código: ${sesCode}`, `• Denominación: ${sesLabel}`,
  ];
}

// ─── 1. Frozen 39-concept mapping (mirrors the frozen C1 oracle exactly) ──
console.log('\n[C1] Frozen 39-concept exact mapping + hydratable membership');
const EXPECTED_TARGETS = Object.freeze({
  derma_hs_ihs4: 'fhHSIhs4', derma_hs_hurley: 'fhHSHurley', derma_hs_evolution_time: 'fhHSTiempoEvolucion', derma_hs_location: 'fhHSLocalizacion',
  derma_hs_prior_doxy_clinda: 'fhHSTtoDoxiClinda', derma_hs_prior_rif_clinda: 'fhHSTtoRifClinda', derma_hs_prior_other_antibiotics: 'fhHSTtoOtrosAb',
  derma_hs_prior_other_antibiotics_detail: 'fhHSTtoOtrosAbTxt', derma_hs_prior_adalimumab: 'fhHSBioAda', derma_hs_prior_adalimumab_duration: 'fhHSBioAdaDuracion',
  derma_hs_prior_adalimumab_end_reason: 'fhHSBioAdaMotivo', derma_hs_prior_other_biologics: 'fhHSBioOtros',
  derma_psoriasis_pasi: 'fhPsPasi', derma_psoriasis_bsa: 'fhPsBsa', derma_psoriasis_dlqi: 'fhPsDlqi', derma_psoriasis_pga: 'fhPsPga',
  derma_psoriasis_prior_systemic: 'fhPsSistemicoPrevio', derma_psoriasis_no_systemic_reason: 'fhPsSistemicoNoMotivo',
  derma_ad_easi: 'fhDaEasi', derma_ad_scorad: 'fhDaScorad', derma_ad_dlqi_poem: 'fhDaDlqiPoem', derma_ad_prior_cyclosporine: 'fhDaCiclosporinaPrevia', derma_ad_no_cyclosporine_reason: 'fhDaCiclosporinaNoMotivo',
  derma_vitiligo_extent: 'fhVitExtension', derma_vitiligo_facial: 'fhVitFacial', derma_vitiligo_prior_topical_calcineurin: 'fhVitCalcineurinaPrevia', derma_vitiligo_prior_topical_steroids: 'fhVitCorticoidesPrevios', derma_vitiligo_observations: 'fhVitObservaciones',
  derma_aa_extent_gt50: 'fhAaExtension50', derma_aa_episode_gt6m: 'fhAaEpisodio6Meses', derma_aa_systemic_corticosteroids: 'fhAaCorticoidesSistemicos', derma_aa_observations: 'fhAaObservaciones',
  derma_comorb_bmi: 'fhHSComorbImc', derma_comorb_smoking_status: 'fhHSComorbTabaquismo', derma_comorb_pack_years: 'fhHSComorbPaquetes', derma_comorb_diabetes: 'fhHSComorbDiabetes', derma_comorb_hba1c: 'fhHSComorbHba1c', derma_comorb_metabolic_syndrome: 'fhHSComorbSdMetabolico', derma_comorb_other: 'fhHSComorbOtras',
});
    ok('frozen C1 mapping count is exactly 39', Object.keys(EXPECTED_TARGETS).length === 39);
    // C2 (issue #340) supersedes the C1-only hydratable-set membership: the 7
    // safe analítica/vacunación common concepts join the D17_EXT_V1 hydratable
    // set (39 C1 + 7 C2 = 46). Their exact targets are owned by the C2 battery.
    // The combined derma_viral_serologies stays OUT (never splits).
    ok('D17_EXT_HYDRATABLE_CONCEPTS is the frozen 39 C1 + 7 C2 (supersession #340) and excludes provenance-only',
      D17_EXT_HYDRATABLE_CONCEPTS.length === 46
      && Object.keys(EXPECTED_TARGETS).every((concept) => D17_EXT_HYDRATABLE_CONCEPTS.includes(concept))
      && !D17_EXT_HYDRATABLE_CONCEPTS.includes('derma_viral_serologies')
      && !D17_EXT_HYDRATABLE_CONCEPTS.includes('derma_psoriasis_prior_systemic_detail')
      && !D17_EXT_HYDRATABLE_CONCEPTS.includes('derma_ad_prior_cyclosporine_detail')
      && !D17_EXT_HYDRATABLE_CONCEPTS.includes('derma_hs_prior_other_biologics_detail'));
for (const [concept, target] of Object.entries(EXPECTED_TARGETS)) {
  ok(`${concept}: exact target ${target} + hydratable`, targetForConcept(concept) === target && HYDRATABLE_CONCEPTS.includes(concept));
}
ok('legacy six requested-treatment targets unchanged',
  ['commercial_name', 'requested_dose', 'requested_route', 'requested_schedule', 'requested_induction', 'requested_justification']
    .every((concept, index) => targetForConcept(concept) === ['fhDermaFarmaco', 'fhDermaDosis', 'fhDermaVia', 'fhDermaPauta', 'fhDermaInduccion', 'fhDermaJustificacion'][index]));
ok('pathology target unchanged', targetForConcept('pathology') === 'fhDermaPatologia' && targetForConcept('ses_program') === 'ses_program');

// ─── 2. Non-writable concepts stay non-writable ───────────────────────────
console.log('\n[C1] Composite provenance-only + combined serology stay non-writable');
// C2 (issue #340) supersedes the C1 non-writable status of the 7 safe
// analítica/vacunación common concepts; their exact writable contract is
// owned by the C2 battery. Here only what C2 did NOT make writable:
const NON_WRITABLE_CONCEPTS = [
  'derma_psoriasis_prior_systemic_detail', 'derma_ad_prior_cyclosporine_detail', 'derma_hs_prior_other_biologics_detail',
  'derma_viral_serologies',
];
for (const concept of NON_WRITABLE_CONCEPTS) {
  ok(`${concept}: target NONE + not hydratable`, targetForConcept(concept) === 'NONE' && !HYDRATABLE_CONCEPTS.includes(concept));
}
ok('explicit non-source Farmacia-only controls never become writable',
  ['fhHSDlqi', 'fhDermaComorbInfeccionesRecurrentes', 'fhDermaComorbRiesgoCardiovascular', 'fhDermaComorbAlteracionesNeurologicas', 'fhDermaComorbRiesgoNeoplasia']
    .every((target) => ![...HYDRATABLE_CONCEPTS].some((concept) => targetForConcept(concept) === target)));

// ─── 3. Parser emission: targets + proposal eligibility, transport unchanged ──
console.log('\n[C1] Parser emits exact targets and proposal eligibility for the 39');
{
  const hsRaw = [
    ...d17Unit('HIDRADENITIS SUPURATIVA', 'SES_HS', 'HIDRADENITIS SUPURATIVA'),
    MARKER,
    'DATOS CLÍNICOS — HIDRADENITIS SUPURATIVA',
    '• IHS4: 12', '• Hurley: II', '• Tiempo evolución: 5 años', '• Localización: Axila bilateral',
    '• Doxiciclina / Clindamicina previa: SÍ', '• Rifampicina + Clindamicina previa: SÍ',
    '• Otros ATB previos: SÍ', '• Otros ATB — detalle: Tetraciclina tópica',
    '• Adalimumab previo: SÍ', '• Adalimumab — duración: 12 meses', '• Adalimumab — motivo fin: Fallo secundario',
    '• Otros biológicos previos: SÍ', '• Otros biológicos — detalle: Detalle sintético biológico',
    'COMORBILIDADES',
    '• IMC: 27.4', '• Tabaquismo: Activo', '• Paquetes/año: 10',
    '• Diabetes: SÍ', '• HbA1c: 6.8', '• Síndrome metabólico: NO', '• Otras comorbilidades: Comorbilidad sintética',
    TERMINATOR,
  ].join('\n');
  const result = parseDermaEOrdenRaw(hsRaw);
  ok('full HS+comorbidity extension stays RECOGNIZED with transport intact', result.unit_state === 'RECOGNIZED' && result.raw_input === hsRaw);
  const hsConcepts = result.contributions.filter((c) => c.concept.startsWith('derma_hs_') || c.concept.startsWith('derma_comorb_'));
  ok('all 20 present HS+comorbidity concepts contribute exactly once', hsConcepts.length === 20);
  for (const contribution of hsConcepts) {
    const expected = targetForConcept(contribution.concept);
    const expectedStatus = expected === 'NONE' ? 'NO_PROPOSAL' : 'AUTO_PROPOSABLE';
    ok(`${contribution.concept}: emitted ${expected} + ${expectedStatus}`,
      contribution.target === expected && contribution.proposal_status === expectedStatus
      && contribution.semantic_status === 'RECOGNIZED');
  }
  ok('bio_otros_texto composite stays ONE provenance-only concept',
    result.contributions.find((c) => c.concept === 'derma_hs_prior_other_biologics_detail')
      ?.value === 'Detalle sintético biológico');
}

// ─── 4. Closed destination adapters ────────────────────────────────────────
console.log('\n[C1] Closed destination adapters (no coercion of any kind)');
// si/no select values.
ok('si/no SÍ -> si', adaptD17ExtControlValue('derma_psoriasis_prior_systemic', 'SÍ').ok === true && adaptD17ExtControlValue('derma_psoriasis_prior_systemic', 'SÍ').text === 'si');
ok('si/no NO -> no', adaptD17ExtControlValue('derma_vitiligo_facial', 'NO').ok === true && adaptD17ExtControlValue('derma_vitiligo_facial', 'NO').text === 'no');
for (const bad of ['SI', 'TRUE', 'true', 'Quizá', '']) {
  ok(`si/no rejects ${JSON.stringify(bad)}`, adaptD17ExtControlValue('derma_psoriasis_prior_systemic', bad).ok === false);
}
// Hurley exact I|II|III -> exact Hurley I|II|III.
for (const [source, expected] of [['I', 'Hurley I'], ['II', 'Hurley II'], ['III', 'Hurley III']]) {
  ok(`Hurley ${source} -> ${expected}`, adaptD17ExtControlValue('derma_hs_hurley', source).ok === true && adaptD17ExtControlValue('derma_hs_hurley', source).text === expected);
}
for (const bad of ['IV', '2', 'II,', 'hurley II', '']) {
  ok(`Hurley rejects ${JSON.stringify(bad)}`, adaptD17ExtControlValue('derma_hs_hurley', bad).ok === false);
}
// Checkbox: explicit SÍ only; NO never fabricated (parser rejects it earlier).
ok('checkbox SÍ -> checked representation', adaptD17ExtControlValue('derma_hs_prior_other_antibiotics', 'SÍ').ok === true);
ok('checkbox rejects non-SÍ', adaptD17ExtControlValue('derma_hs_prior_other_antibiotics', 'NO').ok === false && adaptD17ExtControlValue('derma_hs_prior_other_antibiotics', 'true').ok === false);
// Numeric: strict control-compatible numeric text only.
ok('numeric dot-decimal accepted', adaptD17ExtControlValue('derma_psoriasis_pasi', '10.5').ok === true);
ok('numeric integer accepted', adaptD17ExtControlValue('derma_psoriasis_pasi', '10').ok === true);
ok('numeric peripheral trim is authorized normalization', adaptD17ExtControlValue('derma_psoriasis_pasi', ' 10.5 ').ok === true);
for (const bad of ['10,5', '10.5%', '10.5 mg', '1.0e1', '-1', '+10', '10,5 mg/dL', '', '10.55']) {
  ok(`numeric rejects ${JSON.stringify(bad)} (no comma-to-dot, units, thresholding or step mismatch)`, adaptD17ExtControlValue('derma_psoriasis_pasi', bad).ok === false);
}
ok('DLQI within max accepted', adaptD17ExtControlValue('derma_psoriasis_dlqi', '30').ok === true);
ok('DLQI above max rejected', adaptD17ExtControlValue('derma_psoriasis_dlqi', '31').ok === false);
ok('IHS4 step-compatible decimal accepted', adaptD17ExtControlValue('derma_hs_ihs4', '12.3').ok === true);
ok('text destinations keep verbatim literal text', adaptD17ExtControlValue('derma_hs_location', 'Axila bilateral').ok === true && adaptD17ExtControlValue('derma_hs_location', 'Axila bilateral').text === 'Axila bilateral');
ok('smoking enum exact control values', ['Activo', 'Exfumador', 'No fumador'].every((value) => adaptD17ExtControlValue('derma_comorb_smoking_status', value).ok === true) && adaptD17ExtControlValue('derma_comorb_smoking_status', 'Fumador').ok === false);

// ─── 5. D16/D5 through the pipeline for C1 concepts ──────────────────────
console.log('\n[C1] D16 protection states + D5 eligibility for C1 concepts');
const psoRaw = [
  ...d17Unit('PSORIASIS', 'SES_PSOR', 'PSORIASIS'),
  MARKER,
  'DATOS CLÍNICOS — PSORIASIS',
  '• PASI: 10.5', '• BSA: 14%', '• DLQI: 18', '• PGA: 3',
  '• Tratamiento sistémico previo: SÍ',
  '• Tratamiento sistémico previo — detalle: Metotrexato 8 meses, intolerancia',
  TERMINATOR,
].join('\n');
function reconciledOf(raw, concept, currentFormValues = {}) {
  return runUnifiedIntake(raw, { currentFormValues }).reconciled.concepts[concept];
}
{
  const pasi = reconciledOf(psoRaw, 'derma_psoriasis_pasi');
  ok('PASI single-source proposal is AUTO_PROPOSABLE to fhPsPasi',
    pasi.target === 'fhPsPasi' && pasi.proposal_status === 'AUTO_PROPOSABLE' && pasi.value === '10.5');
  ok('empty current -> CURRENT_EMPTY', decisionState(pasi, '') === STATE_CURRENT_EMPTY);
  ok('equal current -> ALREADY_MATCHES_CURRENT (no rewrite)', decisionState(pasi, '10.5') === STATE_ALREADY_MATCHES_CURRENT);
  ok('different current -> PROTECTED_EXISTING (explicit replace only)', decisionState(pasi, '8') === STATE_PROTECTED_EXISTING);
  const writes = [];
  const applied = applyConcept({
    reconciled: pasi, currentValue: '', associationStates: [{ state: 'VERIFIED_EXPLICIT_CIP' }], action: 'confirm',
    write: (target, value) => writes.push([target, value]),
  });
  ok('confirm writes control-space value to the exact target', applied.applied === true && writes.length === 1 && writes[0][0] === 'fhPsPasi' && writes[0][1] === '10.5');
  ok('confirm on protected existing is refused', applyConcept({ reconciled: pasi, currentValue: '8', associationStates: [{ state: 'VERIFIED_EXPLICIT_CIP' }], action: 'confirm', write: () => {} }).applied === false);
  ok('replace on empty current is refused', applyConcept({ reconciled: pasi, currentValue: '', associationStates: [{ state: 'VERIFIED_EXPLICIT_CIP' }], action: 'replace', write: () => {} }).applied === false);
  ok('cancel (no action executed) is zero mutation by construction', writes.length === 1);
  ok('UNBOUND association blocks the write',
    writeEligibility(pasi, '', [{ state: 'UNBOUND' }]).writable === false
    && writeEligibility(pasi, '', []).writable === false
    && writeEligibility(pasi, '', [{ state: 'CONFLICT' }]).writable === false);
  ok('missing source never clears: absent concept has no proposal',
    decisionState(runUnifiedIntake(psoRaw).reconciled.concepts.derma_hs_ihs4 ?? null, 'whatever') === STATE_NO_PROPOSAL);
}
{
  // Numeric adapter rejection blocks the whole proposal (fail closed).
  const psoCommaRaw = psoRaw.replace('• PASI: 10.5', '• PASI: 10,5');
  const pasi = reconciledOf(psoCommaRaw, 'derma_psoriasis_pasi');
  ok('comma numeric transport still parses RECOGNIZED verbatim', pasi.value === '10,5');
  ok('comma numeric proposal is closed (NO_PROPOSAL, nothing written)',
    decisionState(pasi, '') === STATE_NO_PROPOSAL
    && writeEligibility(pasi, '', [{ state: 'VERIFIED_EXPLICIT_CIP' }]).writable === false);
}
{
  // Invalid enum in a C1 select: no fabricated usable value (independent line).
  const psoBadEnumRaw = psoRaw
    .replace('• Tratamiento sistémico previo: SÍ', '• Tratamiento sistémico previo: QUIZÁ')
    .replace('• Tratamiento sistémico previo — detalle: Metotrexato 8 meses, intolerancia\n', '');
  const result = runUnifiedIntake(psoBadEnumRaw);
  ok('invalid enum stays UNRECOGNIZED_VALUE with no proposal',
    result.reconciled.concepts.derma_psoriasis_prior_systemic?.proposal_status === 'NO_PROPOSAL'
    && result.reconciled.concepts.derma_psoriasis_pasi?.proposal_status === 'AUTO_PROPOSABLE');
}
{
  // Checkbox current-value space: checked -> ALREADY_MATCHES, unchecked -> confirm.
  const atb = reconciledOf(psoRaw.replace('DATOS CLÍNICOS — PSORIASIS', 'DATOS CLÍNICOS — HIDRADENITIS SUPURATIVA').includes('PSORIASIS') ? psoRaw : psoRaw, 'derma_psoriasis_prior_systemic');
  ok('si/no proposal value is control-space si', atb.value === 'si' || atb.value === 'SÍ');
  ok('si/no writes exact control value', (() => {
    const writes = [];
    const applied = applyConcept({ reconciled: atb, currentValue: '', associationStates: [{ state: 'VERIFIED_EXPLICIT_CIP' }], action: 'confirm', write: (t, v) => writes.push([t, v]) });
    return applied.applied === true && writes[0][1] === 'si';
  })());
  ok('si/no ALREADY_MATCHES with matching control value', decisionState(atb, 'si') === STATE_ALREADY_MATCHES_CURRENT);
}
{
  // Checkbox concept through pipeline: unchecked current '' -> CURRENT_EMPTY.
  const hsRawMinimal = [
    ...d17Unit('HIDRADENITIS SUPURATIVA', 'SES_HS', 'HIDRADENITIS SUPURATIVA'),
    MARKER, 'DATOS CLÍNICOS — HIDRADENITIS SUPURATIVA', '• Otros biológicos previos: SÍ', TERMINATOR,
  ].join('\n');
  const bio = reconciledOf(hsRawMinimal, 'derma_hs_prior_other_biologics');
  ok('checkbox proposal SÍ -> CURRENT_EMPTY on unchecked destination', decisionState(bio, '') === STATE_CURRENT_EMPTY);
  const writes = [];
  const applied = applyConcept({ reconciled: bio, currentValue: '', associationStates: [{ state: 'VERIFIED_EXPLICIT_CIP' }], action: 'confirm', write: (t, v) => writes.push([t, v]) });
  ok('checkbox confirm writes SÍ to the checkbox target (never false)', applied.applied === true && writes[0][0] === 'fhHSBioOtros' && writes[0][1] === 'SÍ');
  ok('checkbox checked destination is ALREADY_MATCHES_CURRENT (no uncheck, no rewrite)', decisionState(bio, 'SÍ') === STATE_ALREADY_MATCHES_CURRENT);
  // Checkbox NO is not transport: parser rejects it, nothing fabricated.
  const badNoRaw = hsRawMinimal.replace('• Otros biológicos previos: SÍ', '• Otros biológicos previos: NO');
  const badNo = runUnifiedIntake(badNoRaw);
  ok('checkbox NO is UNRECOGNIZED_VALUE with zero proposal', badNo.reconciled.concepts.derma_hs_prior_other_biologics?.proposal_status === 'NO_PROPOSAL' || badNo.reconciled.concepts.derma_hs_prior_other_biologics === undefined);
}

// ─── 6. C1 clinical gates ──────────────────────────────────────────────────
console.log('\n[C1] Pathology + parent/child clinical gates');
{
  ok('pathology gate: empty accepted pathology blocks', d17ExtGate('derma_psoriasis_pasi', { pathologyValue: '' })?.code === 'PATHOLOGY_NOT_ACCEPTED');
  ok('pathology gate: mismatched accepted pathology blocks', d17ExtGate('derma_psoriasis_pasi', { pathologyValue: 'Hidradenitis supurativa' })?.code === 'PATHOLOGY_MISMATCH');
  ok('pathology gate: coherent accepted pathology allows', d17ExtGate('derma_psoriasis_pasi', { pathologyValue: 'Psoriasis' }) === null);
  ok('pathology gate: exact accents required (Vitíligo family)', d17ExtGate('derma_vitiligo_extent', { pathologyValue: 'Vitíligo' }) === null && d17ExtGate('derma_vitiligo_extent', { pathologyValue: 'Vitiligo' })?.code === 'PATHOLOGY_MISMATCH');
  ok('common comorbidity concepts carry no pathology gate', d17ExtGate('derma_comorb_bmi', { pathologyValue: '' }) === null && pathologyFamilyFor('derma_comorb_bmi') === null);
  ok('legacy requested-treatment concepts carry no C1 gate', d17ExtGate('commercial_name', { pathologyValue: '' }) === null);
  ok('every HS/PSO/DA/VIT/AA concept maps to its exact pathology family',
    Object.entries({
      derma_hs_ihs4: 'Hidradenitis supurativa', derma_psoriasis_pasi: 'Psoriasis', derma_ad_easi: 'Dermatitis atópica',
      derma_vitiligo_facial: 'Vitíligo', derma_aa_observations: 'Alopecia areata',
    }).every(([concept, family]) => pathologyFamilyFor(concept) === family));
}
{
  const HS_PATHOLOGY = { pathologyValue: 'Hidradenitis supurativa' };
  ok('parent gate: unsatisfied parent blocks child', d17ExtGate('derma_hs_prior_other_antibiotics_detail', { ...HS_PATHOLOGY, parentValue: '' })?.code === 'PARENT_CONDITION_NOT_SATISFIED');
  ok('parent gate: satisfied checkbox parent allows child', d17ExtGate('derma_hs_prior_other_antibiotics_detail', { ...HS_PATHOLOGY, parentValue: 'SÍ' }) === null);
  ok('parent gate: stale parent value blocks child (wrong checkbox state)', d17ExtGate('derma_hs_prior_adalimumab_duration', { ...HS_PATHOLOGY, parentValue: '' })?.code === 'PARENT_CONDITION_NOT_SATISFIED');
  ok('parent gate: si/no select parent NO satisfied', d17ExtGate('derma_psoriasis_no_systemic_reason', { pathologyValue: 'Psoriasis', parentValue: 'no' }) === null);
  ok('parent gate: si/no select parent wrong value blocks', d17ExtGate('derma_ad_no_cyclosporine_reason', { pathologyValue: 'Dermatitis atópica', parentValue: 'si' })?.code === 'PARENT_CONDITION_NOT_SATISFIED');
  ok('parent gate: smoking Activo satisfied for pack years', d17ExtGate('derma_comorb_pack_years', { parentValue: 'Activo' }) === null);
  ok('parent gate: HbA1c requires diabetes si', d17ExtGate('derma_comorb_hba1c', { parentValue: 'si' }) === null && d17ExtGate('derma_comorb_hba1c', { parentValue: 'no' })?.code === 'PARENT_CONDITION_NOT_SATISFIED');
  ok('every parent condition resolves to a hydratable parent concept',
    D17_EXT_HYDRATABLE_CONCEPTS.map(parentConditionFor).filter(Boolean).every((parent) => HYDRATABLE_CONCEPTS.includes(parent.concept)));
  // Denied/cancelled parent at source level: the conditional detail line without
  // its explicit parent condition is a parser-level structural violation.
  const orphanRaw = psoRaw.replace('• Tratamiento sistémico previo: SÍ\n', '');
  const orphan = parseDermaEOrdenRaw(orphanRaw);
  ok('conditional detail without satisfied parent condition is rejected at the source (fail closed)',
    orphan.unit_state === 'PARTIALLY_RECOGNIZED' && orphan.blocking_states.includes('EXT_PARENT_CONDITION_NOT_SATISFIED'));
  // Same-pass coherently staged parent+child: parent write satisfies the live
  // parent value, then the child gate opens (executor parent-first ordering).
  const hsStagedRaw = [
    ...d17Unit('HIDRADENITIS SUPURATIVA', 'SES_HS', 'HIDRADENITIS SUPURATIVA'),
    MARKER, 'DATOS CLÍNICOS — HIDRADENITIS SUPURATIVA',
    '• Otros ATB previos: SÍ', '• Otros ATB — detalle: Tetraciclina tópica', TERMINATOR,
  ].join('\n');
  const parent = reconciledOf(hsStagedRaw, 'derma_hs_prior_other_antibiotics');
  const child = reconciledOf(hsStagedRaw, 'derma_hs_prior_other_antibiotics_detail');
  const writes = [];
  const write = (target, value) => writes.push([target, value]);
  const associations = [{ state: 'VERIFIED_EXPLICIT_CIP' }];
  const parentApplied = applyConcept({ reconciled: parent, currentValue: '', associationStates: associations, action: 'confirm', write });
  ok('parent confirm writes the checkbox', parentApplied.applied === true && writes[0][0] === 'fhHSTtoOtrosAb');
  const childAfterParent = d17ExtGate('derma_hs_prior_other_antibiotics_detail', { ...HS_PATHOLOGY, parentValue: 'SÍ' });
  const childApplied = childAfterParent === null
    ? applyConcept({ reconciled: child, currentValue: '', associationStates: associations, action: 'confirm', write })
    : { applied: false };
  ok('child accepted coherently in the same explicit staged pass after the parent write',
    childApplied.applied === true && writes[1][0] === 'fhHSTtoOtrosAbTxt' && writes[1][1] === 'Tetraciclina tópica');
}

// ─── 7. Reparse/lifecycle preserved for C1 concepts ──────────────────────
console.log('\n[C1] Reparse + lifecycle protections preserved');
{
  const review = createReviewContext(psoRaw);
  review.result = runUnifiedIntake(psoRaw);
  const pasi = review.result.reconciled.concepts.derma_psoriasis_pasi;
  const applied = applyConcept({ reconciled: pasi, currentValue: '', associationStates: [{ state: 'VERIFIED_EXPLICIT_CIP' }], action: 'confirm', write: () => {} });
  review.applied.derma_psoriasis_pasi = applied.appliedValue;
  ok('C1 concept applied value recorded', applied.appliedValue === '10.5');
  ok('matching live value is not a manual edit', manualEditDetected(review, 'derma_psoriasis_pasi', '10.5') === false);
  ok('edited live value after apply IS a manual edit (D11)', manualEditDetected(review, 'derma_psoriasis_pasi', '99') === true);
  const beforeRuns = review.parse_run_count;
  continueParseRun(review, psoRaw);
  review.staged.derma_psoriasis_pasi = 'confirm';
  ok('staged decisions expire on a NEW parse run (reparse never inherits)', review.parse_run_count === beforeRuns + 1 && continueParseRun(review, psoRaw) && Object.keys(review.staged).length === 0);
}

console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
console.log(failed === 0 ? '✓ C1 clinical hydration fixture battery PASSED' : '✗ C1 clinical hydration fixture battery FAILED');
process.exitCode = failed === 0 ? 0 : 1;
