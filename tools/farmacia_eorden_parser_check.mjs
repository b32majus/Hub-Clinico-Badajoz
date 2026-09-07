#!/usr/bin/env node
/** WO-C issue #295 — deterministic D17 e-Orden parser fixture battery (Seam 1). */
import {
    parseDermaEOrdenUnit, parseDermaEOrdenRaw, SES_ALLOWLIST,
    UNIT_STATE_RECOGNIZED, UNIT_STATE_PARTIALLY_RECOGNIZED, UNIT_STATE_UNRECOGNIZED,
    UNIT_STATE_SEGMENTATION_BLOCKED, UNIT_STATE_PARSER_ERROR,
    SES_UNKNOWN_CODE, SES_OUT_OF_ALLOWLIST, SES_LABEL_CODE_MISMATCH,
    SES_CODE_WITHOUT_LABEL, SES_LABEL_WITHOUT_CODE, SES_PAIR_MISSING,
    EXT_MALFORMED_MARKER, EXT_MALFORMED_TERMINATOR, EXT_UNKNOWN_SECTION,
    EXT_SECTION_ORDER_INVALID, EXT_EMPTY_BLOCK, EXT_EMPTY_SECTION,
    EXT_PATHOLOGY_SECTION_INCOHERENT, EXT_UNKNOWN_LABEL, EXT_REPEATED_LABEL,
    EXT_LABEL_OUT_OF_ORDER, EXT_PARENT_CONDITION_NOT_SATISFIED,
    EXT_EXPLICIT_NON_SOURCE_TARGETS,
} from '../scripts/fh_eorden_parser.js';

let passed = 0; let failed = 0;
function ok(label, condition) { if (condition) { console.log(`  ✓ ${label}`); passed += 1; } else { console.log(`  ✗ ${label}`); failed += 1; } }
function assert(condition, label) { ok(label, condition); }
const SEP = '═'.repeat(55);
const body = (title = 'PSORIASIS', ses = ['SES_PSOR', 'PSORIASIS'], overrides = {}) => {
    const lines = [`SOLICITUD DERMATOLOGÍA → FARMACIA - ${title}`, SEP,
        `• CIP: ${overrides.cip ?? 'CIP-SINT-0001'}`, `• Marca comercial solicitada: ${overrides.brand ?? 'HYRIMOZ'}`,
        `• Dosis solicitada: ${overrides.dose ?? '40 MG'}`, `• Vía solicitada: ${overrides.route ?? 'SC'}`,
        `• Pauta: ${overrides.schedule ?? 'CADA 14 DIAS'}`, `• Inducción solicitada: ${overrides.induction ?? 'NO'}`,
        `• Justificación clínica: ${overrides.justification ?? 'Justificación sintética.'}`];
    if (ses !== null) { lines.push('PROGRAMA SES'); if (ses[0] !== undefined) lines.push(`• Código: ${ses[0]}`); if (ses[1] !== undefined) lines.push(`• Denominación: ${ses[1]}`); }
    return lines.join('\n');
};
function resultForSes(code, label, section = true) { return parseDermaEOrdenRaw(body('PSORIASIS', section ? [code, label] : null)); }

console.log('\n[WO-C] Complete D17 unit and envelope');
const complete = body(); const r = parseDermaEOrdenRaw(complete);
assert(r.unit_state === UNIT_STATE_RECOGNIZED, 'complete unit is RECOGNIZED');
assert(['commercial_name', 'requested_dose', 'requested_route', 'requested_schedule', 'requested_induction', 'requested_justification', 'ses_program', 'pathology', 'cip'].every((x) => r.contributions.some((c) => c.concept === x)), 'complete concept set present');
assert(r.raw_input === complete && r.can_preview === true && r.can_apply === false, 'raw and gates preserved');
assert(r.contributions.every((c) => c.raw), 'contribution provenance raw present');

console.log('\n[WO-C] Exact title/pathology and coherent SES allowlist');
for (const [title, pathology] of Object.entries({ 'HIDRADENITIS SUPURATIVA': 'Hidradenitis supurativa', PSORIASIS: 'Psoriasis', 'DERMATITIS ATÓPICA': 'Dermatitis atópica', 'VITÍLIGO': 'Vitíligo', 'ALOPECIA AREATA': 'Alopecia areata' })) {
    const x = parseDermaEOrdenRaw(body(title, ['SES_HS', 'HIDRADENITIS SUPURATIVA']));
    assert(x.contributions.find((c) => c.concept === 'pathology')?.value === pathology, `${title}: exact pathology equivalence`);
}
for (const [code, label] of Object.entries(SES_ALLOWLIST)) {
    const x = parseDermaEOrdenRaw(body('PSORIASIS', [code, label]));
    assert(x.contributions.find((c) => c.concept === 'ses_program')?.value?.code === code, `${code}: coherent code survives`);
    assert(x.contributions.find((c) => c.concept === 'ses_program')?.value?.label === label, `${code}: coherent label survives`);
}

console.log('\n[WO-C] Unsafe SES states');
for (const [code, label, reason] of [['SES_XYZ', 'PSORIASIS', SES_UNKNOWN_CODE], ['SES_UCE', 'URTICARIA', SES_OUT_OF_ALLOWLIST], ['SES_PRNO', 'PRNO', SES_OUT_OF_ALLOWLIST], ['SES_HS', 'PSORIASIS', SES_LABEL_CODE_MISMATCH], ['SES_HS', undefined, SES_CODE_WITHOUT_LABEL], [undefined, 'PSORIASIS', SES_LABEL_WITHOUT_CODE], [undefined, undefined, SES_PAIR_MISSING]]) {
    const x = resultForSes(code, label); const c = x.contributions.find((v) => v.concept === 'ses_program');
    assert(x.blocking_states.includes(reason) && x.errors.some((e) => e.code === reason), `${reason}: surfaced`);
    assert(c?.blocking === true && c.target === 'NONE' && c.proposal_status === 'NO_PROPOSAL' && c.reason.code === reason, `${reason}: blocked contribution`);
}

console.log('\n[WO-C] Value semantics and provenance');
for (const [route, status] of [['Otra — intradérmica', 'PROVENANCE_ONLY'], ['Otra', 'UNRECOGNIZED_VALUE']]) {
    const x = parseDermaEOrdenRaw(body('PSORIASIS', ['SES_PSOR', 'PSORIASIS'], { route })); const c = x.contributions.find((v) => v.concept === 'requested_route');
    assert(c.semantic_status === status && c.target === 'NONE' && c.proposal_status === 'NO_PROPOSAL', `${route}: route semantics`);
    const safeSiblings = x.contributions.filter((v) => ['commercial_name', 'requested_dose', 'requested_schedule', 'requested_induction', 'ses_program'].includes(v.concept));
    assert(safeSiblings.every((v) => v.proposal_status === 'AUTO_PROPOSABLE' && v.semantic_status === 'RECOGNIZED'), `${route}: safe siblings stay usable`);
}
const values = parseDermaEOrdenRaw(body('PSORIASIS', ['SES_PSOR', 'PSORIASIS'], { dose: 'No informado', route: 'No informado', induction: 'maybe' }));
assert(values.contributions.find((c) => c.concept === 'requested_dose').semantic_status === 'NO_VALUE', 'dose No informado is NO_VALUE');
assert(values.contributions.find((c) => c.concept === 'requested_route').semantic_status === 'NO_VALUE', 'route No informado is NO_VALUE');
assert(values.warnings.some((w) => w.code === 'INDUCTION_VALUE_UNRECOGNIZED'), 'induction invalid value warning');
const inductionSi = parseDermaEOrdenRaw(body('PSORIASIS', ['SES_PSOR', 'PSORIASIS'], { induction: 'SÍ' }));
assert(inductionSi.contributions.find((c) => c.concept === 'requested_induction')?.value === 'SÍ' && inductionSi.contributions.find((c) => c.concept === 'requested_induction')?.proposal_status === 'AUTO_PROPOSABLE', 'induction SÍ positive');
const inductionNo = parseDermaEOrdenRaw(body('PSORIASIS', ['SES_PSOR', 'PSORIASIS'], { induction: 'NO' }));
assert(inductionNo.contributions.find((c) => c.concept === 'requested_induction')?.value === 'NO', 'induction NO positive');
const unknownTitle = parseDermaEOrdenRaw(body('ECZEMA', ['SES_PSOR', 'PSORIASIS']));
assert(unknownTitle.warnings.some((w) => w.code === 'PATHOLOGY_TITLE_UNRECOGNIZED') && !unknownTitle.contributions.some((c) => c.concept === 'pathology'), 'unrecognized title yields no pathology and a warning');

console.log('\n[WO-C] Anti-fuzzy serialization gate');
// Label alias (not a D17 label), missing accent in label, wrong-case label,
// inverted label pair, and an extra content line inside an otherwise-valid unit.
const interleaveLines = body().split('\n');
for (const variant of [
    body().replace('Marca comercial solicitada:', 'Marca:'),
    body().replace('Marca comercial solicitada:', 'Marca comercial Solicitada:'),
    body().replace('Vía solicitada:', 'Via solicitada:'),
    body().replace('Pauta:', 'PAUTA:'),
    body().replace('Marca comercial solicitada:', 'Dosis solicitada:'),
    interleaveLines.slice(0, 5).join('\n') + '\nDATOS CLÍNICOS — PSORIASIS\n' + interleaveLines.slice(5).join('\n'),
    interleaveLines.slice(0, 6).join('\n') + '\nnota suelta\n' + interleaveLines.slice(6).join('\n'),
]) {
    const x = parseDermaEOrdenRaw(variant); assert(x.unit_state === UNIT_STATE_UNRECOGNIZED && x.contributions.length === 0 && x.raw_input === variant && x.can_apply === false, 'non-normative serialization rejected');
}
// Interleaved / inverted normative order: Código before Inducción, Inducción after Denominación.
{
    const lines = body().split('\n');
    const codeIdx = lines.findIndex((l) => l.startsWith('• Código:'));
    const indIdx = lines.findIndex((l) => l.startsWith('• Inducción solicitada:'));
    const interleaved = [...lines.slice(0, indIdx), lines[codeIdx], lines[indIdx], ...lines.slice(indIdx + 1, codeIdx), ...lines.slice(codeIdx + 1)].join('\n');
    const x = parseDermaEOrdenRaw(interleaved);
    assert(x.unit_state === UNIT_STATE_UNRECOGNIZED && x.contributions.length === 0, 'Código before Inducción is rejected');
}
{
    const lines = body().split('\n');
    const indLine = lines.find((l) => l.startsWith('• Inducción solicitada:'));
    const rest = lines.filter((l) => !l.startsWith('• Inducción solicitada:'));
    const inverted = [...rest, indLine].join('\n');
    const x = parseDermaEOrdenRaw(inverted);
    assert(x.unit_state === UNIT_STATE_UNRECOGNIZED && x.contributions.length === 0, 'Inducción after Denominación is rejected');
}
const repeated = body() + '\n• Marca comercial solicitada: SECOND'; const rr = parseDermaEOrdenRaw(repeated);
assert(rr.unit_state === UNIT_STATE_UNRECOGNIZED && rr.contributions.length === 0, 'repeated label rejected');

console.log('\n[WO-C] T3 repair pins: justification, CIP-less, empty CIP, required SES, blank lines');
// (1) Justificación clínica required and preserved.
const just = parseDermaEOrdenRaw(body('PSORIASIS', ['SES_PSOR', 'PSORIASIS'], { justification: 'Fracaso de tópico, Hurley II.' }));
const justConcept = just.contributions.find((c) => c.concept === 'requested_justification');
assert(justConcept?.target === 'fhDermaJustificacion' && justConcept?.proposal_status === 'AUTO_PROPOSABLE' && justConcept?.value === 'Fracaso de tópico, Hurley II.', 'justification preserved to fhDermaJustificacion');
const noJust = parseDermaEOrdenRaw(body().split('\n').filter((l) => !l.startsWith('• Justificación clínica:')).join('\n'));
assert(noJust.unit_state === UNIT_STATE_UNRECOGNIZED && noJust.contributions.length === 0, 'missing justification is not recognized with proposals');
// (2) Exact CIP-less source variant accepted as UNBOUND.
const cipless = parseDermaEOrdenRaw(body().split('\n').filter((l) => !l.startsWith('• CIP:')).join('\n'));
const ciplessCip = cipless.contributions.find((c) => c.concept === 'cip');
assert(cipless.unit_state === UNIT_STATE_RECOGNIZED, 'exact CIP-less envelope is recognized');
assert(ciplessCip?.semantic_status === 'UNBOUND' && ciplessCip?.value === null && ciplessCip?.target === 'NONE' && ciplessCip?.proposal_status === 'NO_PROPOSAL', 'absent CIP is explicitly UNBOUND');
// (3) Present-but-empty CIP rejected (never CIP-less).
for (const empty of ['• CIP:', '• CIP:   ']) {
const x = parseDermaEOrdenRaw(body().replace('• CIP: CIP-SINT-0001', empty));
assert(x.unit_state === UNIT_STATE_UNRECOGNIZED && x.contributions.length === 0 && x.errors.some((e) => e.code === 'CIP_PRESENT_BUT_EMPTY'), `present-but-empty CIP ${JSON.stringify(empty)} rejected explicitly`);
}
// (4) PROGRAMA SES required/coherent.
const noSes = parseDermaEOrdenRaw(body().split('\n').filter((l) => l !== 'PROGRAMA SES' && !l.startsWith('• Código:') && !l.startsWith('• Denominación:')).join('\n'));
assert(noSes.unit_state === UNIT_STATE_UNRECOGNIZED && noSes.contributions.length === 0, 'missing SES block is not recognized with proposals');
// (5) Internal blank lines rejected, peripheral blank lines tolerated.
const blankLines = body().split('\n');
const innerBlank = parseDermaEOrdenRaw([...blankLines.slice(0, 5), '', ...blankLines.slice(5)].join('\n'));
assert(innerBlank.unit_state === UNIT_STATE_UNRECOGNIZED && innerBlank.contributions.length === 0 && innerBlank.errors.some((e) => e.code === 'INTERNAL_BLANK_LINE'), 'internal blank line rejected explicitly');
const periBlank = parseDermaEOrdenRaw(`\n\n${body()}\n\n`);
assert(periBlank.unit_state === UNIT_STATE_RECOGNIZED, 'peripheral blank lines tolerated');

console.log('\n[WO-C] Empty, malformed input, unit kinds, and exception safety');
for (const raw of ['', '   ', '\n', '\t\n']) assert(parseDermaEOrdenRaw(raw).can_apply === false, `empty input ${JSON.stringify(raw)} is safe`);
const noBody = 'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS'; const nb = parseDermaEOrdenRaw(noBody);
assert(nb.unit_state === UNIT_STATE_UNRECOGNIZED && nb.raw_input === noBody, 'header without body rejected');
const wrong = parseDermaEOrdenUnit({ kind: 'presalud_unit', raw: complete });
assert(wrong.unit_state === UNIT_STATE_PARSER_ERROR && wrong.errors[0].code === 'EORDEN_PARSER_WRONG_UNIT_KIND', 'wrong unit kind is parser error');
assert(parseDermaEOrdenUnit({ raw: 42 }).errors[0].code === 'EORDEN_PARSER_INPUT_NOT_TEXT', 'non-text raw is deterministic error');
assert(parseDermaEOrdenUnit({ kind: 'blocked_unit', raw: complete }).unit_state === UNIT_STATE_SEGMENTATION_BLOCKED, 'blocked unit is segmentation blocked');
const throwing = {}; Object.defineProperty(throwing, 'raw', { get() { throw new Error('synthetic'); } }); const thrown = parseDermaEOrdenUnit(throwing);
assert(thrown.unit_state === UNIT_STATE_PARSER_ERROR && thrown.errors[0].code === 'EORDEN_PARSER_INTERNAL_ERROR' && thrown.can_apply === false, 'throwing raw getter is contained');

console.log('\n[WO-C #336] D17_EXT_V1 versioned extension');
// Full valid extended unit: legacy prefix + versioned envelope. Extended
// concepts are transport/provenance only (target NONE, NO_PROPOSAL, semantic
// RECOGNIZED); no hydration/apply until WO C.
const extHeader = [...body().split('\n'), 'EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'];
const extSections = [
    'DATOS CLÍNICOS — PSORIASIS',
    '• PASI: 10.5', '• BSA: 14%', '• DLQI: 18', '• PGA: 3',
    '• Tratamiento sistémico previo: SÍ',
    '• Tratamiento sistémico previo — detalle: Metotrexato 8 meses, intolerancia',
    'ANALÍTICA Y VACUNACIÓN',
    '• Fecha analítica: 2026-09-01', '• Analítica completa <3 meses: SÍ',
    '• Hemograma verificado: SÍ', '• Bioquímica verificada: SÍ',
    '• Mantoux/IGRA: Negativo', '• VHB/VHC/VIH: Pendiente',
    '• Vacunación completa/revisada: Pendiente', '• Observaciones vacunación: Vacuna sintética pendiente',
    'COMORBILIDADES',
    '• IMC: 27.4', '• Tabaquismo: Activo', '• Paquetes/año: 10',
    '• Diabetes: SÍ', '• HbA1c: 6.8', '• Síndrome metabólico: NO',
    '• Otras comorbilidades: Comorbilidad sintética',
    'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1',
];
const extendedRaw = [...extHeader, ...extSections].join('\n');
const extResult = parseDermaEOrdenRaw(extendedRaw);
assert(extResult.unit_state === UNIT_STATE_RECOGNIZED, 'valid D17_EXT_V1 unit is RECOGNIZED');
assert(extResult.raw_input === extendedRaw && extResult.can_apply === false, 'D17_EXT_V1 raw byte-exact, apply always false');
    const extContribs = extResult.contributions.filter((c) => c.concept.startsWith('derma_'));
    assert(extContribs.length === 21, 'every present extended field contributes exactly once');
    // C1 boundary (issue #339), updated by C2 (issue #340): the target
    // concepts of this fixture (PASI, BSA, DLQI, PGA, prior_systemic, IMC,
    // Tabaquismo, Paquetes/año, Diabetes, HbA1c, Síndrome metabólico, Otras
    // comorbilidades) plus the 7 safe analítica/vacunación common concepts
    // carry their exact brownfield target and AUTO_PROPOSABLE proposal
    // eligibility; the composite provenance-only concept and the combined
    // derma_viral_serologies concept stay target NONE / NO_PROPOSAL (never
    // split). Transport (values, grammar, labels) unchanged.
    const C1_TARGETED_FIXTURE_CONCEPTS = new Set([
      'derma_psoriasis_pasi', 'derma_psoriasis_bsa', 'derma_psoriasis_dlqi', 'derma_psoriasis_pga',
      'derma_psoriasis_prior_systemic', 'derma_comorb_bmi', 'derma_comorb_smoking_status',
      'derma_comorb_pack_years', 'derma_comorb_diabetes', 'derma_comorb_hba1c',
      'derma_comorb_metabolic_syndrome', 'derma_comorb_other',
      // C2 (issue #340): safe analítica/vacunación common concepts.
      'derma_lab_date', 'derma_lab_complete_lt3m', 'derma_cbc_verified', 'derma_biochemistry_verified',
      'derma_tb_screening', 'derma_vaccination_review', 'derma_vaccination_observations',
    ]);
    assert(extContribs.every((c) => C1_TARGETED_FIXTURE_CONCEPTS.has(c.concept)
      ? c.semantic_status === 'RECOGNIZED' && c.target !== 'NONE' && c.proposal_status === 'AUTO_PROPOSABLE'
      : c.target === 'NONE' && c.proposal_status === 'NO_PROPOSAL' && c.semantic_status === 'RECOGNIZED'),
      'C1 boundary: targeted concepts get exact targets, composites/common stay provenance-only');
assert(extContribs.every((c) => typeof c.line_index === 'number' && c.raw), 'extended provenance carries line_index and raw');
assert(extContribs.find((c) => c.concept === 'derma_psoriasis_prior_systemic_detail')?.value === 'Metotrexato 8 meses, intolerancia', 'pso_detalle stays ONE explicit composite concept (never split)');
assert(!extContribs.some((c) => ['derma_psoriasis_prior_drug', 'derma_psoriasis_prior_duration', 'derma_psoriasis_prior_reason'].includes(c.concept)), 'no fabricated split concepts for pso_detalle');
assert(extContribs.find((c) => c.concept === 'derma_lab_date')?.value === '2026-09-01', 'lab date transported verbatim');
assert(!extContribs.some((c) => ['derma_hs_ihs4', 'derma_ad_easi', 'derma_vitiligo_extent'].includes(c.concept)), 'no cross-pathology concepts in a PSORIASIS unit');
assert(!extResult.contributions.some((c) => c.concept === 'derma_hs_dlqi'), 'HS DLQI is never fabricated: source has no DLQI');
assert(EXT_EXPLICIT_NON_SOURCE_TARGETS.includes('fhHSDlqi') && EXT_EXPLICIT_NON_SOURCE_TARGETS.includes('fhDermaComorbRiesgoNeoplasia'), 'Farmacia-only controls stay explicit non-source targets');

// Optional absence never degrades the unit (#334 auto-reveal keeps working).
const minimalExtendedRaw = [...extHeader, 'DATOS CLÍNICOS — PSORIASIS', '• PASI: 10.5', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'].join('\n');
const minimalExt = parseDermaEOrdenRaw(minimalExtendedRaw);
assert(minimalExt.unit_state === UNIT_STATE_RECOGNIZED && minimalExt.raw_input === minimalExtendedRaw, 'D17_EXT_V1 with absent optional fields stays RECOGNIZED');
assert(!minimalExt.contributions.some((c) => c.concept.startsWith('derma_') && c.concept !== 'derma_psoriasis_pasi'), 'absent optional labels create no contribution');
const gapExtendedRaw = [...extHeader, 'DATOS CLÍNICOS — PSORIASIS', '• PASI: 10.5', '• DLQI: 18', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'].join('\n');
const gapExt = parseDermaEOrdenRaw(gapExtendedRaw);
assert(gapExt.unit_state === UNIT_STATE_RECOGNIZED, 'gaps in optional schema keep RECOGNIZED');
assert(gapExt.contributions.filter((c) => c.concept.startsWith('derma_')).length === 2, 'only present fields contribute');
const commonOnlyRaw = [...extHeader, 'ANALÍTICA Y VACUNACIÓN', '• Analítica completa <3 meses: SÍ', 'COMORBILIDADES', '• IMC: 27.4', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'].join('\n');
const commonOnly = parseDermaEOrdenRaw(commonOnlyRaw);
assert(commonOnly.unit_state === UNIT_STATE_RECOGNIZED, 'common-only extension sections are valid');

// Negative matrix: structural violations are loud, raw-preserving and reject
// the whole extension block (legacy contributions stay usable).
function negativeExtended(name, extLines, expectedCode, { state = UNIT_STATE_PARTIALLY_RECOGNIZED, legacyKept = true } = {}) {
    const raw = [...extHeader, ...extLines].join('\n');
    const x = parseDermaEOrdenRaw(raw);
    assert(x.unit_state === state, `${name}: unit state ${x.unit_state}`);
    assert(x.raw_input === raw && x.can_apply === false, `${name}: raw preserved, apply blocked`);
    if (expectedCode !== null) {
        assert(x.blocking_states.includes(expectedCode) && x.errors.some((e) => e.code === expectedCode), `${name}: ${expectedCode} surfaced`);
    }
    assert(x.contributions.filter((c) => c.concept.startsWith('derma_')).every((c) => c.semantic_status === 'UNRECOGNIZED_VALUE'), `${name}: no fabricated usable extended value`);
    assert(!legacyKept || x.contributions.some((c) => c.concept === 'ses_program'), `${name}: legacy contributions stay usable`);
}
negativeExtended('unknown label', ['DATOS CLÍNICOS — PSORIASIS', '• PASI: 10.5', '• PASI2: 3', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'], EXT_UNKNOWN_LABEL);
negativeExtended('repeated label', ['DATOS CLÍNICOS — PSORIASIS', '• PASI: 10.5', '• PASI: 9', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'], EXT_REPEATED_LABEL);
negativeExtended('reordered labels', ['DATOS CLÍNICOS — PSORIASIS', '• BSA: 14%', '• PASI: 10.5', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'], EXT_LABEL_OUT_OF_ORDER);
negativeExtended('cross-pathology section', ['DATOS CLÍNICOS — HIDRADENITIS SUPURATIVA', '• IHS4: 12', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'], EXT_PATHOLOGY_SECTION_INCOHERENT);
negativeExtended('section order violation', ['ANALÍTICA Y VACUNACIÓN', '• Analítica completa <3 meses: SÍ', 'DATOS CLÍNICOS — PSORIASIS', '• PASI: 1', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'], EXT_SECTION_ORDER_INVALID);
negativeExtended('duplicated section', ['DATOS CLÍNICOS — PSORIASIS', '• PASI: 1', 'DATOS CLÍNICOS — PSORIASIS', '• BSA: 2', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'], EXT_SECTION_ORDER_INVALID);
negativeExtended('empty section header', ['DATOS CLÍNICOS — PSORIASIS', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'], EXT_EMPTY_SECTION);
negativeExtended('empty extension block', ['FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'], EXT_EMPTY_BLOCK);
negativeExtended('missing terminator', ['DATOS CLÍNICOS — PSORIASIS', '• PASI: 10.5'], EXT_MALFORMED_TERMINATOR);
negativeExtended('duplicate marker', ['EXTENSIÓN CLÍNICA DERMATOLOGÍA V1', 'DATOS CLÍNICOS — PSORIASIS', '• PASI: 1', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'], EXT_MALFORMED_MARKER);
negativeExtended('duplicate terminator', ['DATOS CLÍNICOS — PSORIASIS', '• PASI: 1', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'], EXT_MALFORMED_TERMINATOR);
negativeExtended('content after terminator', ['DATOS CLÍNICOS — PSORIASIS', '• PASI: 1', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1', '• PGA: 3'], EXT_MALFORMED_TERMINATOR);
negativeExtended('field before section header', ['• PASI: 1', 'DATOS CLÍNICOS — PSORIASIS', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'], EXT_UNKNOWN_SECTION);
negativeExtended('unknown section header', ['SECCIÓN DESCONOCIDA', '• PASI: 1', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'], null, { state: UNIT_STATE_UNRECOGNIZED, legacyKept: false });
negativeExtended('parent condition unsatisfied', ['DATOS CLÍNICOS — PSORIASIS', '• Tratamiento sistémico previo — detalle: X sin padre', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'], EXT_PARENT_CONDITION_NOT_SATISFIED);
negativeExtended('parent condition wrong value', ['DATOS CLÍNICOS — PSORIASIS', '• Tratamiento sistémico previo: NO', '• Tratamiento sistémico previo — detalle: X', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'], EXT_PARENT_CONDITION_NOT_SATISFIED);
{
    // Invalid enum value: per-field UNRECOGNIZED_VALUE with a warning, valid
    // siblings stay recognized, nothing fabricated.
    const raw = [...extHeader, 'DATOS CLÍNICOS — PSORIASIS', '• PASI: 10.5', '• BSA: 14%', '• DLQI: 18', '• PGA: 3', '• Tratamiento sistémico previo: QUIZÁ', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'].join('\n');
    const x = parseDermaEOrdenRaw(raw);
    const bad = x.contributions.find((c) => c.concept === 'derma_psoriasis_prior_systemic');
    assert(x.unit_state === UNIT_STATE_PARTIALLY_RECOGNIZED && x.warnings.some((w) => w.code === 'EXT_VALUE_UNRECOGNIZED'), 'invalid enum value degrades unit with warning');
    assert(bad.semantic_status === 'UNRECOGNIZED_VALUE' && bad.target === 'NONE' && bad.proposal_status === 'NO_PROPOSAL', 'invalid enum value is not fabricated as usable');
    assert(x.contributions.find((c) => c.concept === 'derma_psoriasis_pasi')?.semantic_status === 'RECOGNIZED', 'valid siblings of an invalid enum value stay recognized');
}
{
    // Checkbox_true with an explicit NO is an unrecognized value, never a
    // silent false, and never fabricated into SÍ.
    const raw = [...extHeader, 'ANALÍTICA Y VACUNACIÓN', '• Hemograma verificado: NO', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'].join('\n');
    const x = parseDermaEOrdenRaw(raw);
    const bad = x.contributions.find((c) => c.concept === 'derma_cbc_verified');
    assert(x.unit_state === UNIT_STATE_PARTIALLY_RECOGNIZED && x.warnings.some((w) => w.code === 'EXT_VALUE_UNRECOGNIZED'), 'checkbox NO is an unrecognized explicit value');
    assert(bad.semantic_status === 'UNRECOGNIZED_VALUE' && bad.value === 'NO', 'checkbox NO raw stays visible without proposal');
}
{
    // Marker interleaved into the legacy block is malformed placement.
    const lines = body().split('\n');
    lines.splice(lines.findIndex((l) => l === 'PROGRAMA SES'), 0, 'EXTENSIÓN CLÍNICA DERMATOLOGÍA V1');
    lines.push('DATOS CLÍNICOS — PSORIASIS', '• PASI: 1', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1');
    const x = parseDermaEOrdenRaw(lines.join('\n'));
    assert(x.unit_state === UNIT_STATE_PARTIALLY_RECOGNIZED && x.blocking_states.includes(EXT_MALFORMED_MARKER), 'marker inside the legacy block is malformed placement');
}
{
    // Terminator without marker: no extension ownership → legacy strictness.
    const raw = [...body().split('\n'), 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'].join('\n');
    const x = parseDermaEOrdenRaw(raw);
    assert(x.unit_state === UNIT_STATE_UNRECOGNIZED && x.contributions.length === 0, 'terminator without marker is non-normative legacy content');
}
{
    // Unrecognized header title with its own pathology section: no contract
    // schema → fail closed.
    const raw = [...body('ECZEMA', ['SES_PSOR', 'PSORIASIS']).split('\n'), 'EXTENSIÓN CLÍNICA DERMATOLOGÍA V1', 'DATOS CLÍNICOS — ECZEMA', '• PASI: 1', 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'].join('\n');
    const x = parseDermaEOrdenRaw(raw);
    assert(x.unit_state === UNIT_STATE_PARTIALLY_RECOGNIZED && x.blocking_states.includes(EXT_PATHOLOGY_SECTION_INCOHERENT), 'extension pathology section without a contract schema fails closed');
}
// Full HS extension: composite bio_otros_texto stays ONE explicit concept.
{
    const raw = ['SOLICITUD DERMATOLOGÍA → FARMACIA - HIDRADENITIS SUPURATIVA', SEP,
        '• CIP: CIP-SINT-0001', '• Marca comercial solicitada: HYRIMOZ', '• Dosis solicitada: 40 MG',
        '• Vía solicitada: SC', '• Pauta: CADA 14 DIAS', '• Inducción solicitada: NO',
        '• Justificación clínica: Justificación sintética.', 'PROGRAMA SES', '• Código: SES_HS', '• Denominación: HIDRADENITIS SUPURATIVA',
        'EXTENSIÓN CLÍNICA DERMATOLOGÍA V1', 'DATOS CLÍNICOS — HIDRADENITIS SUPURATIVA',
        '• IHS4: 12', '• Hurley: II', '• Tiempo evolución: 5 años', '• Localización: Axila bilateral',
        '• Otros ATB previos: SÍ', '• Otros ATB — detalle: Tetraciclina tópica',
        '• Adalimumab previo: SÍ', '• Adalimumab — duración: 12 meses', '• Adalimumab — motivo fin: Fallo secundario',
        '• Otros biológicos previos: SÍ', '• Otros biológicos — detalle: Detalle sintético biológico',
        'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'].join('\n');
    const x = parseDermaEOrdenRaw(raw);
    assert(x.unit_state === UNIT_STATE_RECOGNIZED, 'full HS extension is RECOGNIZED');
    const bioDetail = x.contributions.find((c) => c.concept === 'derma_hs_prior_other_biologics_detail');
    assert(bioDetail?.value === 'Detalle sintético biológico' && bioDetail.target === 'NONE' && bioDetail.proposal_status === 'NO_PROPOSAL', 'HS bio_otros_texto stays ONE composite concept (never split)');
    assert(x.contributions.filter((c) => c.concept.startsWith('derma_hs_')).length === 11, 'all present HS fields contribute once');
}
// DA composite detail (da_detalle) stays ONE explicit concept.
{
    const raw = ['SOLICITUD DERMATOLOGÍA → FARMACIA - DERMATITIS ATÓPICA', SEP,
        '• CIP: CIP-SINT-0001', '• Marca comercial solicitada: HYRIMOZ', '• Dosis solicitada: 40 MG',
        '• Vía solicitada: SC', '• Pauta: CADA 14 DIAS', '• Inducción solicitada: NO',
        '• Justificación clínica: Justificación sintética.', 'PROGRAMA SES', '• Código: SES_DA', '• Denominación: DERMATITIS ATOPICA',
        'EXTENSIÓN CLÍNICA DERMATOLOGÍA V1', 'DATOS CLÍNICOS — DERMATITIS ATÓPICA',
        '• EASI: 22', '• SCORAD: 45', '• DLQI / POEM: DLQI 16',
        '• Ciclosporina previa: SÍ', '• Ciclosporina previa — detalle: Detalle sintético ciclosporina',
        'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1'].join('\n');
    const x = parseDermaEOrdenRaw(raw);
    assert(x.unit_state === UNIT_STATE_RECOGNIZED, 'full DA extension is RECOGNIZED');
    const detail = x.contributions.find((c) => c.concept === 'derma_ad_prior_cyclosporine_detail');
    assert(detail?.value === 'Detalle sintético ciclosporina' && detail.target === 'NONE' && detail.proposal_status === 'NO_PROPOSAL', 'DA da_detalle stays ONE composite concept (never split)');
    assert(!x.contributions.some((c) => ['derma_ad_prior_dose', 'derma_ad_prior_duration', 'derma_ad_prior_reason'].includes(c.concept)), 'no fabricated split concepts for da_detalle');
}

console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
console.log(failed === 0 ? '✓ WO-C DermaEOrdenParser fixture battery PASSED' : '✗ WO-C DermaEOrdenParser fixture battery FAILED');
process.exitCode = failed === 0 ? 0 : 1;
