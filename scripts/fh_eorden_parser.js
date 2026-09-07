/**
 * WO-C (issue #295) — Pure Dermatology e-Orden parser (Seam 1).
 *
 * Consumes one e-Orden unit already delimited by WO-B. The parser performs
 * exact D17 serialization recognition and deterministic value extraction only:
 * it has no DOM, side effects, catalog/CIMA access, fuzzy matching, inference,
 * or hydration. Every result preserves the original unit in `raw_input`, is
 * previewable, and has `can_apply === false`.
 *
 * Contract boundaries (deliberate):
 * - Internal blank lines are PROHIBITED by D17 (no fabricating a canonical
 *   form by silently dropping them). A blank/whitespace-only line strictly
 *   inside the unit span rejects the whole unit (UNRECOGNIZED, raw preserved,
 *   zero proposals). Only whole-input peripheral blank lines are authorized
 *   transport (D17 peripheral trim) and are tolerated.
 * - `• Justificación clínica: ` is a REQUIRED label (D17/D7): the unit is
 *   non-normative without it. Its value is preserved verbatim as
 *   `requested_justification` -> `fhDermaJustificacion`.
 * - The `PROGRAMA SES` block (Código + Denominación) is REQUIRED (D1a/D17):
 *   a unit without it is non-normative. A present block keeps the
 *   deterministic pair validation (unknown/out-of-allowlist/mismatched/
 *   incomplete -> blocked SES_PROGRAM_CONTRIBUTION).
 * - CIP line fully ABSENT is the exact `D17_CIPLESS_SOURCE` variant: the unit
 *   stays recognizable and identity is explicitly `UNBOUND` (never verified,
 *   never invented). A CIP line present but empty/whitespace-only is NOT the
 *   CIP-less variant and rejects the unit.
 * - Contribution `raw`/`source_value` fields carry the normalized line view
 *   (NFC + trailing trim) used for recognition; the verbatim source text is
 *   ALWAYS preserved byte-exact in `raw_input`, and `line_index` maps each
 *   contribution/fragment back to its original line.
 */

import { targetForConcept } from './fh_intake_apply.js';

export const SOURCE_EORDEN = 'e-orden';
export const UNIT_STATE_RECOGNIZED = 'RECOGNIZED';
export const UNIT_STATE_PARTIALLY_RECOGNIZED = 'PARTIALLY_RECOGNIZED';
export const UNIT_STATE_UNRECOGNIZED = 'UNRECOGNIZED';
export const UNIT_STATE_SEGMENTATION_BLOCKED = 'SEGMENTATION_BLOCKED';
export const UNIT_STATE_PARSER_ERROR = 'PARSER_ERROR';

export const SES_ALLOWLIST = Object.freeze({
    SES_HS: 'HIDRADENITIS SUPURATIVA',
    SES_PSOR: 'PSORIASIS',
    SES_DA: 'DERMATITIS ATOPICA',
    SES_VITI: 'VITILIGO',
    SES_AA: 'ALOPECIA AREATA',
});
export const SES_UCE = 'SES_UCE';
export const SES_PRNO = 'SES_PRNO';
export const SES_EM = 'SES_EM';
export const SES_UNKNOWN_CODE = 'SES_UNKNOWN_CODE';
export const SES_OUT_OF_ALLOWLIST = 'SES_OUT_OF_ALLOWLIST';
export const SES_LABEL_CODE_MISMATCH = 'SES_LABEL_CODE_MISMATCH';
export const SES_CODE_WITHOUT_LABEL = 'SES_CODE_WITHOUT_LABEL';
export const SES_LABEL_WITHOUT_CODE = 'SES_LABEL_WITHOUT_CODE';
export const SES_PAIR_MISSING = 'SES_PAIR_MISSING';

export const TITLE_PATHOLOGY = Object.freeze({
    'HIDRADENITIS SUPURATIVA': 'Hidradenitis supurativa',
    PSORIASIS: 'Psoriasis',
    'DERMATITIS ATÓPICA': 'Dermatitis atópica',
    'VITÍLIGO': 'Vitíligo',
    'ALOPECIA AREATA': 'Alopecia areata',
});

const SEP = '═'.repeat(55);
const LABELS = Object.freeze([
    '• CIP: ', '• Marca comercial solicitada: ', '• Dosis solicitada: ',
    '• Vía solicitada: ', '• Pauta: ', '• Inducción solicitada: ',
    '• Justificación clínica: ', '• Código: ', '• Denominación: ',
]);
const HEADER = /^SOLICITUD DERMATOLOGÍA → FARMACIA - .+$/;
const TRAILING = /[ \t\u00a0]+$/;

// ─── D17_EXT_V1 versioned extension (issue #336) ────────────────────────
//
// Exact contract labels/concepts/values (frozen acceptance package
// contract-336-d17-ext-v1.json). The extension is versioned transport: an
// exact marker declares ownership, sections serialize only when they carry at
// least one explicit field, and every label is matched exactly (no aliases,
// no fuzzy matching, no silent reorder, no duplicate collapse).
//
// B boundary (WO #336) updated by C1 (issue #339): the 39
// DIRECT_FUTURE_TARGET / NORMALIZATION_REQUIRED concepts now carry their
// exact brownfield target and AUTO_PROPOSABLE proposal eligibility through
// the single C1 mapping in fh_intake_apply.js (targetForConcept). Composite
// provenance-only concepts and the NO_CURRENT_STRUCTURED_TARGET
// analítica/vacunación concepts stay target='NONE',
// proposal_status='NO_PROPOSAL'. Parser transport (labels/values/grammar)
// is unchanged: no broadened values, no new aliases.

const EXT_MARKER = 'EXTENSIÓN CLÍNICA DERMATOLOGÍA V1';
const EXT_TERMINATOR = 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1';
const EXT_SECTION_ANALITICA = 'ANALÍTICA Y VACUNACIÓN';
const EXT_SECTION_COMORBILIDADES = 'COMORBILIDADES';
const EXT_SECTION_PATHOLOGY_PREFIX = 'DATOS CLÍNICOS — ';
const EXT_BULLET = '• ';

function extField(label, concept, kind, extra = {}) {
    return Object.freeze({ label, concept, kind, ...extra });
}

const EXT_PATHOLOGY_FIELDS = Object.freeze({
    'HIDRADENITIS SUPURATIVA': Object.freeze([
        extField('IHS4', 'derma_hs_ihs4', 'text'),
        extField('Hurley', 'derma_hs_hurley', 'enum', { values: ['I', 'II', 'III'] }),
        extField('Tiempo evolución', 'derma_hs_evolution_time', 'text'),
        extField('Localización', 'derma_hs_location', 'text'),
        extField('Doxiciclina / Clindamicina previa', 'derma_hs_prior_doxy_clinda', 'checkbox_true', { values: ['SÍ'] }),
        extField('Rifampicina + Clindamicina previa', 'derma_hs_prior_rif_clinda', 'checkbox_true', { values: ['SÍ'] }),
        extField('Otros ATB previos', 'derma_hs_prior_other_antibiotics', 'checkbox_true', { values: ['SÍ'] }),
        extField('Otros ATB — detalle', 'derma_hs_prior_other_antibiotics_detail', 'text',
            { parent: { concept: 'derma_hs_prior_other_antibiotics', value: 'SÍ' } }),
        extField('Adalimumab previo', 'derma_hs_prior_adalimumab', 'checkbox_true', { values: ['SÍ'] }),
        extField('Adalimumab — duración', 'derma_hs_prior_adalimumab_duration', 'text',
            { parent: { concept: 'derma_hs_prior_adalimumab', value: 'SÍ' } }),
        extField('Adalimumab — motivo fin', 'derma_hs_prior_adalimumab_end_reason', 'text',
            { parent: { concept: 'derma_hs_prior_adalimumab', value: 'SÍ' } }),
        extField('Otros biológicos previos', 'derma_hs_prior_other_biologics', 'checkbox_true', { values: ['SÍ'] }),
        extField('Otros biológicos — detalle', 'derma_hs_prior_other_biologics_detail', 'text',
            { parent: { concept: 'derma_hs_prior_other_biologics', value: 'SÍ' } }),
    ]),
    PSORIASIS: Object.freeze([
        extField('PASI', 'derma_psoriasis_pasi', 'text'),
        extField('BSA', 'derma_psoriasis_bsa', 'text'),
        extField('DLQI', 'derma_psoriasis_dlqi', 'text'),
        extField('PGA', 'derma_psoriasis_pga', 'text'),
        extField('Tratamiento sistémico previo', 'derma_psoriasis_prior_systemic', 'enum', { values: ['SÍ', 'NO'] }),
        // One explicit composite concept: NEVER split into drug/duration/reason.
        extField('Tratamiento sistémico previo — detalle', 'derma_psoriasis_prior_systemic_detail', 'text',
            { parent: { concept: 'derma_psoriasis_prior_systemic', value: 'SÍ' } }),
        extField('Motivo no tratamiento sistémico', 'derma_psoriasis_no_systemic_reason', 'text',
            { parent: { concept: 'derma_psoriasis_prior_systemic', value: 'NO' } }),
    ]),
    'DERMATITIS ATÓPICA': Object.freeze([
        extField('EASI', 'derma_ad_easi', 'text'),
        extField('SCORAD', 'derma_ad_scorad', 'text'),
        extField('DLQI / POEM', 'derma_ad_dlqi_poem', 'text'),
        extField('Ciclosporina previa', 'derma_ad_prior_cyclosporine', 'enum', { values: ['SÍ', 'NO'] }),
        // One explicit composite concept: NEVER split into dose/duration/reason.
        extField('Ciclosporina previa — detalle', 'derma_ad_prior_cyclosporine_detail', 'text',
            { parent: { concept: 'derma_ad_prior_cyclosporine', value: 'SÍ' } }),
        extField('Motivo no ciclosporina', 'derma_ad_no_cyclosporine_reason', 'text',
            { parent: { concept: 'derma_ad_prior_cyclosporine', value: 'NO' } }),
    ]),
    'VITÍLIGO': Object.freeze([
        extField('Extensión afectada', 'derma_vitiligo_extent', 'text'),
        extField('Afectación facial', 'derma_vitiligo_facial', 'enum', { values: ['SÍ', 'NO'] }),
        extField('Inhibidor tópico de calcineurina previo', 'derma_vitiligo_prior_topical_calcineurin', 'enum', { values: ['SÍ', 'NO'] }),
        extField('Corticoides tópicos previos', 'derma_vitiligo_prior_topical_steroids', 'enum', { values: ['SÍ', 'NO'] }),
        extField('Observaciones clínicas', 'derma_vitiligo_observations', 'text'),
    ]),
    'ALOPECIA AREATA': Object.freeze([
        extField('Extensión >50% cuero cabelludo', 'derma_aa_extent_gt50', 'enum', { values: ['SÍ', 'NO'] }),
        extField('Episodio actual >6 meses', 'derma_aa_episode_gt6m', 'enum', { values: ['SÍ', 'NO'] }),
        extField('Corticoesteroides orales sistémicos', 'derma_aa_systemic_corticosteroids', 'enum', { values: ['SÍ', 'NO'] }),
        extField('Observaciones clínicas', 'derma_aa_observations', 'text'),
    ]),
});

const EXT_COMMON_FIELDS = Object.freeze({
    [EXT_SECTION_ANALITICA]: Object.freeze([
        extField('Fecha analítica', 'derma_lab_date', 'date'),
        extField('Analítica completa <3 meses', 'derma_lab_complete_lt3m', 'enum', { values: ['SÍ', 'NO'] }),
        extField('Hemograma verificado', 'derma_cbc_verified', 'checkbox_true', { values: ['SÍ'] }),
        extField('Bioquímica verificada', 'derma_biochemistry_verified', 'checkbox_true', { values: ['SÍ'] }),
        // The parent gate (checkbox checked) is implied by the line's own
        // presence: the producer emits it only while the checkbox holds.
        extField('Mantoux/IGRA', 'derma_tb_screening', 'enum', { values: ['Negativo', 'Positivo - tratado', 'Pendiente'] }),
        extField('VHB/VHC/VIH', 'derma_viral_serologies', 'enum', { values: ['Negativo', 'Positivo', 'Pendiente'] }),
        extField('Vacunación completa/revisada', 'derma_vaccination_review', 'enum', { values: ['SÍ', 'NO', 'Pendiente'] }),
        extField('Observaciones vacunación', 'derma_vaccination_observations', 'text'),
    ]),
    [EXT_SECTION_COMORBILIDADES]: Object.freeze([
        extField('IMC', 'derma_comorb_bmi', 'text'),
        extField('Tabaquismo', 'derma_comorb_smoking_status', 'enum', { values: ['Activo', 'Exfumador', 'No fumador'] }),
        extField('Paquetes/año', 'derma_comorb_pack_years', 'text',
            { parent: { concept: 'derma_comorb_smoking_status', value: 'Activo' } }),
        extField('Diabetes', 'derma_comorb_diabetes', 'enum', { values: ['SÍ', 'NO'] }),
        extField('HbA1c', 'derma_comorb_hba1c', 'text',
            { parent: { concept: 'derma_comorb_diabetes', value: 'SÍ' } }),
        extField('Síndrome metabólico', 'derma_comorb_metabolic_syndrome', 'enum', { values: ['SÍ', 'NO'] }),
        extField('Otras comorbilidades', 'derma_comorb_other', 'text'),
    ]),
});

// Canonical section order: pathology → analítica → comorbilidades. Sections
// serialize only with explicit content, so present sections must form a
// duplicate-free subsequence of this order.
const EXT_CANONICAL_SECTIONS = Object.freeze(['PATHOLOGY', EXT_SECTION_ANALITICA, EXT_SECTION_COMORBILIDADES]);

// Farmacia-only controls without a Dermatology source: intentionally absent
// from the contract and never fabricated by the producer or the parser
// (explicit_non_source_targets in the frozen contract).
export const EXT_EXPLICIT_NON_SOURCE_TARGETS = Object.freeze([
    'fhHSDlqi', 'fhDermaComorbInfeccionesRecurrentes', 'fhDermaComorbRiesgoCardiovascular',
    'fhDermaComorbAlteracionesNeurologicas', 'fhDermaComorbRiesgoNeoplasia',
]);

// Blocking-state codes for extension-level violations (fail closed: legacy
// contributions stay usable, extended fields contribute nothing fabricated).
export const EXT_MALFORMED_MARKER = 'EXT_MALFORMED_MARKER';
export const EXT_MALFORMED_TERMINATOR = 'EXT_MALFORMED_TERMINATOR';
export const EXT_UNKNOWN_SECTION = 'EXT_UNKNOWN_SECTION';
export const EXT_SECTION_ORDER_INVALID = 'EXT_SECTION_ORDER_INVALID';
export const EXT_EMPTY_BLOCK = 'EXT_EMPTY_BLOCK';
export const EXT_EMPTY_SECTION = 'EXT_EMPTY_SECTION';
export const EXT_PATHOLOGY_SECTION_INCOHERENT = 'EXT_PATHOLOGY_SECTION_INCOHERENT';
export const EXT_UNKNOWN_LABEL = 'EXT_UNKNOWN_LABEL';
export const EXT_REPEATED_LABEL = 'EXT_REPEATED_LABEL';
export const EXT_LABEL_OUT_OF_ORDER = 'EXT_LABEL_OUT_OF_ORDER';
export const EXT_PARENT_CONDITION_NOT_SATISFIED = 'EXT_PARENT_CONDITION_NOT_SATISFIED';

function nfc(value) { return value.normalize('NFC'); }
function lineView(value) { return nfc(value).replace(TRAILING, ''); }
function splitLines(raw) { return raw.split(/\r\n|\n|\r/); }
function base(raw, state = UNIT_STATE_RECOGNIZED) {
    return { raw_input: raw, source: SOURCE_EORDEN, unit_state: state,
        contributions: [], unrecognized_fragments: [], warnings: [], errors: [],
        blocking_states: [], can_preview: true, can_apply: false };
}
function errorResult(raw, code, message, state = UNIT_STATE_PARSER_ERROR) {
    const result = base(typeof raw === 'string' ? raw : '<non-text-unit>', state);
    result.errors.push({ code, message, blocking: true });
    return result;
}

function fragment(result, raw, lineIndex) {
    result.unrecognized_fragments.push({ raw, line_index: lineIndex, target: 'NONE', proposal_status: 'NO_PROPOSAL' });
}
function contribution(result, concept, target, status, value, sourceValue, raw, lineIndex, extra = {}) {
    result.contributions.push({ concept, target, proposal_status: status, semantic_status: extra.semantic_status || 'RECOGNIZED',
        value, source_value: sourceValue, raw, line_index: lineIndex,
        provenance: { source: SOURCE_EORDEN, raw, line_index: lineIndex }, ...extra });
}
function valueContribution(result, concept, target, value, raw, index, options = {}) {
    const present = value.trim() !== '';
    if (!present || options.noValue) {
        contribution(result, concept, 'NONE', 'NO_PROPOSAL', present ? value : null, value, raw, index,
            { semantic_status: 'NO_VALUE' });
    } else contribution(result, concept, target, 'AUTO_PROPOSABLE', value, value, raw, index);
}

function serialization(lines) {
    const nonblank = lines.map((line, index) => ({ line: lineView(line), index })).filter((x) => x.line !== '');
    if (!nonblank.length) return { empty: true };
    const first = nonblank[0];
    const headerLine = first.line.replace(/^\s+/, '');
    if (!HEADER.test(headerLine)) return { ok: false, all: nonblank };
    const title = headerLine.slice(headerLine.indexOf(' - ') + 3);
    const body = nonblank.slice(1);
    if (!body.length || body[0].line !== SEP) return { ok: false, all: nonblank, title };
        const entries = body.slice(1);
        const parsed = [];
        for (const item of entries) {
            if (item.line === 'PROGRAMA SES') { parsed.push({ ...item, kind: 'section' }); continue; }
            if (item.line === EXT_MARKER) { parsed.push({ ...item, kind: 'EXT_MARKER' }); continue; }
            if (item.line === EXT_TERMINATOR) { parsed.push({ ...item, kind: 'EXT_TERMINATOR' }); continue; }
            if (item.line === EXT_SECTION_ANALITICA || item.line === EXT_SECTION_COMORBILIDADES
                || (item.line.startsWith(EXT_SECTION_PATHOLOGY_PREFIX)
                    && item.line.length > EXT_SECTION_PATHOLOGY_PREFIX.length)) {
                parsed.push({ ...item, kind: 'EXT_SECTION' }); continue;
            }
            const labelIndex = LABELS.findIndex((label) => item.line.startsWith(label));
            if (labelIndex >= 0) { parsed.push({ ...item, kind: labelIndex }); continue; }
            if (item.line.startsWith(EXT_BULLET)) { parsed.push({ ...item, kind: 'EXT_FIELD' }); continue; }
            return { ok: false, all: nonblank, title };
        }
        // D17_EXT_V1 versioned extension: recognized only through its exact
        // marker. Without the marker, any extension-shaped line (section
        // header, terminator, unknown bullet) is non-normative legacy content
        // and the whole unit is rejected exactly as before.
        const hasMarker = parsed.some((item) => item.kind === 'EXT_MARKER');
        const hasExtensionLines = parsed.some((item) => typeof item.kind === 'string' && item.kind.startsWith('EXT_'));
        if (!hasMarker && hasExtensionLines) return { ok: false, all: nonblank, title };
        // Canonical D17 stream (reconciled D17: one normative serialization, no variants):
    //   (• CIP:)? → • Marca → • Dosis → • Vía → • Pauta → • Inducción
    //   → • Justificación clínica → PROGRAMA SES → • Código → • Denominación
    // A repeated, inverted, interleaved or misplaced label is non-normative and
    // the whole unit is rejected (preserved, zero proposals). CIP is optional
    // ONLY as a fully absent line (exact D17_CIPLESS_SOURCE; a present but
    // empty CIP line never reaches here — it is rejected explicitly). The
    // Justificación line and the whole SES block are REQUIRED: absence is
    // non-normative. When PROGRAMA SES is present, Código and/or
    // Denominación may be absent so the SES pair validator can surface
    // the deterministic incomplete-pair blocking state.
    const legacy = parsed.filter((item) => typeof item.kind === 'number' || item.kind === 'section');
    const seq = legacy.map((item) => (item.kind === 'section' ? 'S' : item.kind));
    if (seq.length && seq[0] === 0) seq.shift();
    const head = [1, 2, 3, 4, 5, 6];
    if (seq.length < head.length || head.some((value, i) => seq[i] !== value)) return { ok: false, all: nonblank, title };
    const rest = seq.slice(head.length).join(',');
    if (!['S', 'S,7', 'S,8', 'S,7,8'].includes(rest)) return { ok: false, all: nonblank, title };
    return { ok: true, title, items: parsed, all: nonblank, hasSes: parsed.some((item) => item.kind === 'section'), hasExtMarker: hasMarker };
}

function ses(result, parsed) {
    if (!parsed.hasSes) return;
    const codeItem = parsed.items.find((x) => x.kind === 7);
    const labelItem = parsed.items.find((x) => x.kind === 8);
    // SES code/label values: leading whitespace is NOT authorized transport
    // (D17 allows only whole-input peripheral trim, CRLF/LF equivalence, and
    // per-line trailing trim). Leading whitespace therefore makes the pair
    // incomplete/unrecognized rather than silently trimmed into a valid pair.
    const codeRaw = codeItem ? codeItem.line.slice(LABELS[7].length) : '';
    const labelRaw = labelItem ? labelItem.line.slice(LABELS[8].length) : '';
    const hasCode = codeRaw.trim() !== '' && codeRaw === codeRaw.trim();
    const hasLabel = labelRaw.trim() !== '' && labelRaw === labelRaw.trim();
    const code = hasCode ? codeRaw : '';
    const label = hasLabel ? labelRaw : '';
    let reason;
    if (!code && !label) reason = SES_PAIR_MISSING;
    else if (!code) reason = SES_LABEL_WITHOUT_CODE;
    else if (!label) reason = SES_CODE_WITHOUT_LABEL;
    else if (Object.hasOwn(SES_ALLOWLIST, code) && label !== SES_ALLOWLIST[code]) reason = SES_LABEL_CODE_MISMATCH;
    else if ([SES_UCE, SES_PRNO, SES_EM].includes(code)) reason = SES_OUT_OF_ALLOWLIST;
    else if (!Object.hasOwn(SES_ALLOWLIST, code)) reason = SES_UNKNOWN_CODE;
    if (!reason) {
        const item = codeItem || labelItem;
        contribution(result, 'ses_program', 'ses_program', 'AUTO_PROPOSABLE', { code, label }, item.line, item.line, item.index,
            { semantic_status: 'RECOGNIZED', provenance: { source: SOURCE_EORDEN, raw: item.line, line_index: item.index, code, label } });
        return;
    }
    const messages = {
        [SES_PAIR_MISSING]: 'SES program section has neither code nor label.',
        [SES_LABEL_WITHOUT_CODE]: 'SES program label is present without a code.',
        [SES_CODE_WITHOUT_LABEL]: 'SES program code is present without a label.',
        [SES_LABEL_CODE_MISMATCH]: 'SES program label does not match its allowlisted code.',
        [SES_OUT_OF_ALLOWLIST]: 'SES program code is outside the Dermatology V0 allowlist.',
        [SES_UNKNOWN_CODE]: 'SES program code is unknown to the Dermatology V0 parser.',
    };
    const raw = [codeItem, labelItem].filter(Boolean).map((x) => x.line).join('\n');
    contribution(result, 'ses_program', 'NONE', 'NO_PROPOSAL', null, raw, raw, (codeItem || labelItem)?.index ?? null,
        { semantic_status: 'BLOCKED', blocking: true, reason: { code: reason, message: messages[reason] }, provenance: { source: SOURCE_EORDEN, raw, code: code || null, label: label || null } });
    result.blocking_states.push(reason);
    result.errors.push({ code: reason, message: messages[reason], blocking: true });
}

    /**
     * D17_EXT_V1 extension parsing (issue #336, boundary B).
     *
     * The exact marker owns the block; sections (pathology → analítica →
     * comorbilidades) appear only when they carry explicit fields, as a
     * duplicate-free subsequence of the canonical order. Inside a section every
     * label matches exactly one schema field, appears at most once, and stays
     * in canonical schema order; enum/checkbox values validate against the
     * contract; conditional details require their parent condition to be
     * explicitly satisfied.
     *
     * Fail-closed semantics:
     * - Structural violations (marker/terminator, section set/order, unknown /
     *   repeated / reordered labels, incoherent pathology section, parent
     *   conditions) reject the WHOLE extension block: one blocking error, no
     *   extended contributions, legacy contributions stay usable →
     *   PARTIALLY_RECOGNIZED (never fabricates a valid value).
     * - A present line whose value is empty or invalid for its kind keeps the
     *   raw visible as UNRECOGNIZED_VALUE (warning, no fabricated value).
     * - Absent optional labels create no contribution and never degrade the
     *   unit.
     */
    function parseExtension(result, parsed) {
        const items = parsed.items;
        const markerIndex = items.findIndex((item) => item.kind === 'EXT_MARKER');
        const markers = items.filter((item) => item.kind === 'EXT_MARKER');
        const terminators = items.filter((item) => item.kind === 'EXT_TERMINATOR');
        let structuralError = null;
        if (markers.length !== 1) structuralError = { code: EXT_MALFORMED_MARKER, message: 'D17_EXT_V1 extension marker must appear exactly once.' };
        else if (terminators.length !== 1) structuralError = { code: EXT_MALFORMED_TERMINATOR, message: 'D17_EXT_V1 extension terminator must appear exactly once after the marker.' };
        else {
            const terminatorIndex = items.findIndex((item) => item.kind === 'EXT_TERMINATOR');
            if (terminatorIndex < markerIndex + 2) {
                structuralError = terminatorIndex === markerIndex + 1
                    ? { code: EXT_EMPTY_BLOCK, message: 'D17_EXT_V1 extension block between marker and terminator has no sections.' }
                    : { code: EXT_MALFORMED_TERMINATOR, message: 'D17_EXT_V1 terminator does not close the extension block.' };
            } else if (items.some((item, index) => index > terminatorIndex)) {
                structuralError = { code: EXT_MALFORMED_TERMINATOR, message: 'D17_EXT_V1 terminator is not the final line of the unit.' };
            } else if (items.some((item, index) => index < markerIndex && typeof item.kind === 'string' && item.kind.startsWith('EXT_'))) {
                structuralError = { code: EXT_MALFORMED_MARKER, message: 'D17_EXT_V1 extension content appears before the marker.' };
            }
        }
        if (structuralError) {
            result.blocking_states.push(structuralError.code);
            result.errors.push({ ...structuralError, blocking: true });
            return;
        }

        const terminatorIndex = items.findIndex((item) => item.kind === 'EXT_TERMINATOR');
        const body = items.slice(markerIndex + 1, terminatorIndex);
        // The extension block may only contain extension items: legacy labels
        // or PROGRAMA SES inside it mean the marker does not own a coherent
        // envelope (malformed placement).
        if (body.some((item) => item.kind !== 'EXT_SECTION' && item.kind !== 'EXT_FIELD')) {
            structuralError = { code: EXT_MALFORMED_MARKER, message: 'D17_EXT_V1 extension block contains non-extension (legacy) content.' };
        }
        // Group body items into sections; fields before any section header are
        // structurally orphaned.
        const sections = [];
        let current = null;
        for (const item of (!structuralError ? body : [])) {
            if (item.kind === 'EXT_SECTION') {
                current = { header: item.line, item, fields: [] };
                sections.push(current);
                continue;
            }
            if (!current) {
                structuralError = { code: EXT_UNKNOWN_SECTION, message: 'D17_EXT_V1 extension field outside any known section header.' };
                break;
            }
            current.fields.push(item);
        }
        if (!structuralError) {
            const sectionKey = (header) => {
                if (header === EXT_SECTION_ANALITICA) return EXT_SECTION_ANALITICA;
                if (header === EXT_SECTION_COMORBILIDADES) return EXT_SECTION_COMORBILIDADES;
                if (header.startsWith(EXT_SECTION_PATHOLOGY_PREFIX)) return 'PATHOLOGY';
                return null;
            };
            const keys = sections.map((section) => sectionKey(section.header));
            if (sections.some((section) => section.fields.length === 0)) {
                structuralError = { code: EXT_EMPTY_SECTION, message: 'D17_EXT_V1 section header serializes no explicit field.' };
            } else if (keys.some((key) => key === null)) {
                structuralError = { code: EXT_UNKNOWN_SECTION, message: 'D17_EXT_V1 section header is not an exact contract section.' };
            } else if (!keys.length) {
                structuralError = { code: EXT_EMPTY_BLOCK, message: 'D17_EXT_V1 extension block between marker and terminator has no sections.' };
            } else {
                const canonical = EXT_CANONICAL_SECTIONS.filter((key) => keys.includes(key));
                if (keys.length !== canonical.length || keys.some((key, index) => key !== canonical[index])) {
                    structuralError = { code: EXT_SECTION_ORDER_INVALID, message: 'D17_EXT_V1 sections are duplicated or outside the canonical order (pathology, analítica, comorbilidades).' };
                } else if (keys.includes('PATHOLOGY')) {
                    const pathologySection = sections[keys.indexOf('PATHOLOGY')];
                    const sectionTitle = pathologySection.header.slice(EXT_SECTION_PATHOLOGY_PREFIX.length);
                    if (sectionTitle !== parsed.title || !EXT_PATHOLOGY_FIELDS[sectionTitle]) {
                        structuralError = { code: EXT_PATHOLOGY_SECTION_INCOHERENT, message: 'D17_EXT_V1 pathology section header is incoherent with the unit pathology.' };
                    }
                }
            }
        }
        if (structuralError) {
            result.blocking_states.push(structuralError.code);
            result.errors.push({ ...structuralError, blocking: true });
            return;
        }

        // Validation pass over every section first: any structural violation
        // (unknown / repeated / reordered label, unsatisfied parent condition)
        // rejects the WHOLE extension block — no extended contribution is
        // emitted from a non-normative structure. A present line whose value is
        // empty or invalid for its kind stays per-field: raw visible as
        // UNRECOGNIZED_VALUE, no valid value ever fabricated.
        const violations = [];
        const parsedFields = [];
        for (const section of sections) {
            const isPathology = section.header.startsWith(EXT_SECTION_PATHOLOGY_PREFIX);
            const schema = isPathology
                ? EXT_PATHOLOGY_FIELDS[section.header.slice(EXT_SECTION_PATHOLOGY_PREFIX.length)]
                : EXT_COMMON_FIELDS[section.header];
            const accepted = new Map(); // concept -> explicit value so far
            let lastOrder = -1;
            for (const item of section.fields) {
                const line = item.line;
                const matches = schema.filter((field) => line.startsWith(EXT_BULLET + field.label + ': '));
                if (matches.length !== 1) {
                    violations.push({ code: EXT_UNKNOWN_LABEL, message: `D17_EXT_V1 label is unknown in section ${section.header}: ${line}` });
                    continue;
                }
                const field = matches[0];
                const order = schema.indexOf(field);
                if (accepted.has(field.concept)) {
                    violations.push({ code: EXT_REPEATED_LABEL, message: `D17_EXT_V1 label is repeated in section ${section.header}: ${line}` });
                    continue;
                }
                if (order <= lastOrder) {
                    violations.push({ code: EXT_LABEL_OUT_OF_ORDER, message: `D17_EXT_V1 label is outside canonical schema order in section ${section.header}: ${line}` });
                    continue;
                }
                if (field.parent && accepted.get(field.parent.concept) !== field.parent.value) {
                    violations.push({ code: EXT_PARENT_CONDITION_NOT_SATISFIED, message: `D17_EXT_V1 conditional detail without its explicit parent condition: ${line}` });
                    continue;
                }
                const value = line.slice((EXT_BULLET + field.label + ': ').length);
                const invalidValue = value === ''
                    || (field.kind === 'enum' && !field.values.includes(value))
                    || (field.kind === 'checkbox_true' && !field.values.includes(value));
                lastOrder = order;
                if (!invalidValue) accepted.set(field.concept, value);
                parsedFields.push({ field, item, value, invalidValue });
            }
        }
        if (violations.length) {
            for (const violation of violations) {
                result.blocking_states.push(violation.code);
                result.errors.push({ ...violation, blocking: true });
            }
            return;
        }
        for (const { field, item, value, invalidValue } of parsedFields) {
            if (invalidValue) {
                contribution(result, field.concept, 'NONE', 'NO_PROPOSAL', value || null, value, item.line, item.index,
                    { semantic_status: 'UNRECOGNIZED_VALUE' });
                result.warnings.push({ code: 'EXT_VALUE_UNRECOGNIZED', message: `D17_EXT_V1 value is not a contract value for ${field.label}.` });
                continue;
            }
            // C1 (issue #339): exact target + proposal eligibility come from the
            // single C1 mapping (fh_intake_apply.targetForConcept). Composite
            // provenance-only and analítica/vacunación concepts resolve to 'NONE'
            // and stay NO_PROPOSAL; the 39 target concepts become AUTO_PROPOSABLE
            // proposals for the D16/D5 machinery.
            const target = targetForConcept(field.concept);
            contribution(result, field.concept, target, target === 'NONE' ? 'NO_PROPOSAL' : 'AUTO_PROPOSABLE', value, value, item.line, item.index,
                { semantic_status: 'RECOGNIZED' });
        }
    }

    function structuralReject(raw, lines, code, message) {
    const result = base(raw, UNIT_STATE_UNRECOGNIZED);
    for (let index = 0; index < lines.length; index += 1) {
const view = lineView(lines[index]);
if (view !== '') fragment(result, lines[index], index);
    }
    result.errors.push({ code, message, blocking: true });
    result.blocking_states.push(code);
    return result;
}

function parse(raw) {
    const result = base(raw);
    const lines = splitLines(raw);
    const views = lines.map(lineView);
    const first = views.findIndex((view) => view !== '');
    if (first < 0) { result.unit_state = UNIT_STATE_RECOGNIZED; return result; }
    let last = views.length - 1;
    while (last > first && views[last] === '') last -= 1;
    // D17 prohibits internal blank lines: dropping them to fabricate a
    // canonical form is forbidden. Only peripheral blank lines (outside
    // first..last) are authorized transport.
    for (let index = first + 1; index < last; index += 1) {
if (views[index] === '') return structuralReject(raw, lines, 'INTERNAL_BLANK_LINE', 'Internal blank line: the unit is not canonical D17.');
    }
    // A CIP line that is present but empty/whitespace-only is NOT the
    // exact D17_CIPLESS_SOURCE variant (which omits the line completely).
    for (let index = first; index <= last; index += 1) {
if (views[index] === '• CIP:') return structuralReject(raw, lines, 'CIP_PRESENT_BUT_EMPTY', 'CIP line is present but empty: not the CIP-less source variant.');
    }
    const parsed = serialization(lines);
    if (parsed.empty) { result.unit_state = UNIT_STATE_RECOGNIZED; return result; }
    if (!parsed.ok) {
        result.unit_state = UNIT_STATE_UNRECOGNIZED;
        for (const item of parsed.all) fragment(result, lines[item.index], item.index);
        return result;
    }
    const items = new Map(parsed.items.filter((x) => typeof x.kind === 'number').map((x) => [x.kind, x]));
    const titlePathology = TITLE_PATHOLOGY[parsed.title];
    if (titlePathology) contribution(result, 'pathology', 'fhDermaPatologia', 'AUTO_PROPOSABLE', titlePathology, parsed.title, parsed.all[0].line, parsed.all[0].index);
    else result.warnings.push({ code: 'PATHOLOGY_TITLE_UNRECOGNIZED', message: 'Header title is not an exact recognized Dermatology V0 pathology.' });
    const fields = [
        ['commercial_name', 'fhDermaFarmaco'], ['requested_dose', 'fhDermaDosis'],
        ['requested_route', 'fhDermaVia'], ['requested_schedule', 'fhDermaPauta'], ['requested_induction', 'fhDermaInduccion'],
        ['requested_justification', 'fhDermaJustificacion'],
    ];
    for (const [concept, target] of fields) {
        const index = { commercial_name: 1, requested_dose: 2, requested_route: 3, requested_schedule: 4, requested_induction: 5, requested_justification: 6 }[concept];
        const item = items.get(index); const value = item.line.slice(LABELS[index].length);
        if (concept === 'requested_route') {
            if (!value.trim() || value === 'No informado') contribution(result, concept, 'NONE', 'NO_PROPOSAL', null, value, item.line, item.index, { semantic_status: 'NO_VALUE' });
            else if (['SC', 'IV', 'Oral', 'IM'].includes(value)) contribution(result, concept, target, 'AUTO_PROPOSABLE', value, value, item.line, item.index);
            else if (value.startsWith('Otra — ') && value.slice(7).trim()) contribution(result, concept, 'NONE', 'NO_PROPOSAL', value, value, item.line, item.index, { semantic_status: 'PROVENANCE_ONLY' });
            else { const code = value === 'Otra' ? 'ROUTE_OTRA_WITHOUT_SPEC' : 'ROUTE_VALUE_UNRECOGNIZED'; contribution(result, concept, 'NONE', 'NO_PROPOSAL', value, value, item.line, item.index, { semantic_status: 'UNRECOGNIZED_VALUE' }); result.warnings.push({ code, message: code === 'ROUTE_OTRA_WITHOUT_SPEC' ? 'Route Otra has no specification.' : 'Route value is not recognized.' }); }
        } else if (concept === 'requested_induction') {
            if (value === 'SÍ' || value === 'NO') contribution(result, concept, target, 'AUTO_PROPOSABLE', value, value, item.line, item.index);
            else { contribution(result, concept, 'NONE', 'NO_PROPOSAL', value, value, item.line, item.index, { semantic_status: 'UNRECOGNIZED_VALUE' }); result.warnings.push({ code: 'INDUCTION_VALUE_UNRECOGNIZED', message: 'Induction value is not SÍ or NO.' }); }
        } else valueContribution(result, concept, target, value, item.line, item.index, { noValue: concept === 'requested_dose' && value === 'No informado' });
    }
        const cip = items.get(0);
        if (cip) { const value = cip.line.slice(LABELS[0].length); contribution(result, 'cip', 'NONE', 'NO_PROPOSAL', value.trim() ? value : null, value, cip.line, cip.index, { semantic_status: value.trim() ? 'GATE_MATERIAL' : 'NO_VALUE' }); }
        else {
            // Exact D17_CIPLESS_SOURCE: the CIP line is fully absent. Identity
            // is explicitly UNBOUND (association stays a WO-E manual gate);
            // the parser never verifies, invents, or selects a patient.
            contribution(result, 'cip', 'NONE', 'NO_PROPOSAL', null, null, null, null,
                { semantic_status: 'UNBOUND', provenance: { source: SOURCE_EORDEN, raw: null, line_index: null } });
        }
    ses(result, parsed);
    if (parsed.hasExtMarker) parseExtension(result, parsed);
    // D3 state semantics: RECOGNIZED requires every parsed concept to be safely
    // usable; any NO_VALUE / PROVENANCE_ONLY / UNRECOGNIZED_VALUE / blocked
    // contribution or warning marks the unit PARTIALLY_RECOGNIZED so only safe
    // contributions continue toward reconciliation. GATE_MATERIAL and UNBOUND
    // are identity-gate signals (WO-E), not value defects: they never by
    // themselves degrade recognition.
    const partial =
        result.blocking_states.length > 0 ||
        result.warnings.length > 0 ||
        result.contributions.some((c) => c.semantic_status !== 'RECOGNIZED' && c.semantic_status !== 'GATE_MATERIAL' && c.semantic_status !== 'UNBOUND');
    result.unit_state = partial ? UNIT_STATE_PARTIALLY_RECOGNIZED : UNIT_STATE_RECOGNIZED;
    return result;
}

export function parseDermaEOrdenRaw(raw) {
    if (typeof raw !== 'string') return errorResult(raw, 'EORDEN_PARSER_INPUT_NOT_TEXT', 'Input raw value is not text.');
    try { return parse(raw); } catch { return errorResult(raw, 'EORDEN_PARSER_INTERNAL_ERROR', 'EORDEN_PARSER_INTERNAL_ERROR'); }
}

export function parseDermaEOrdenUnit(input) {
    let raw;
    try {
        if (typeof input === 'string') return parseDermaEOrdenRaw(input);
        if (!input || typeof input !== 'object') return errorResult(input, 'EORDEN_PARSER_INPUT_NOT_TEXT', 'Input raw value is not text.');
        raw = input.raw;
        if (input.kind === 'blocked_unit') return errorResult(raw, 'SEGMENTATION_BLOCKED', input.blocking_reason || 'The source unit was blocked by segmentation.', UNIT_STATE_SEGMENTATION_BLOCKED);
        if (typeof raw !== 'string') return errorResult(raw, 'EORDEN_PARSER_INPUT_NOT_TEXT', 'Input raw value is not text.');
        if (input.kind !== 'eorden_unit') return errorResult(raw, 'EORDEN_PARSER_WRONG_UNIT_KIND', 'Input unit kind is not eorden_unit.');
        return parseDermaEOrdenRaw(raw);
    } catch { return errorResult(raw, 'EORDEN_PARSER_INTERNAL_ERROR', 'EORDEN_PARSER_INTERNAL_ERROR'); }
}
