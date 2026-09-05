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
 * - Blank lines inside the unit are transport (D17 authorizes CRLF/LF, whole-
 *   input peripheral trim, and per-line trailing trim; blank lines carry no
 *   clinical meaning and never change a value). Blank-line presence does NOT
 *   by itself reject a serialization; labels, order, repeats and interleaving
 *   remain strictly enforced.
 * - Contribution `raw`/`source_value` fields carry the normalized line view
 *   (NFC + trailing trim) used for recognition; the verbatim source text is
 *   ALWAYS preserved byte-exact in `raw_input`, and `line_index` maps each
 *   contribution/fragment back to its original line.
 */

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
    '• Código: ', '• Denominación: ',
]);
const HEADER = /^SOLICITUD DERMATOLOGÍA → FARMACIA - .+$/;
const TRAILING = /[ \t\u00a0]+$/;

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
        const labelIndex = LABELS.findIndex((label) => item.line.startsWith(label));
        if (labelIndex < 0) return { ok: false, all: nonblank, title };
        parsed.push({ ...item, kind: labelIndex });
    }
    // Canonical D17 stream (D17: one normative serialization, no variants):
    //   (• CIP:)? → • Marca → • Dosis → • Vía → • Pauta → • Inducción
    //   → [PROGRAMA SES → • Código → • Denominación]
    // A repeated, inverted, interleaved or misplaced label is non-normative and
    // the whole unit is rejected (preserved, zero proposals). CIP is optional;
    // the whole SES block is optional; when PROGRAMA SES is present, Código
    // and/or Denominación may be absent so the SES pair validator can surface
    // the deterministic incomplete-pair blocking state.
    const seq = parsed.map((item) => (item.kind === 'section' ? 'S' : item.kind));
    if (seq.length && seq[0] === 0) seq.shift();
    const head = [1, 2, 3, 4, 5];
    if (seq.length < head.length || head.some((value, i) => seq[i] !== value)) return { ok: false, all: nonblank, title };
    const rest = seq.slice(head.length).join(',');
    if (!['', 'S', 'S,6', 'S,7', 'S,6,7'].includes(rest)) return { ok: false, all: nonblank, title };
    return { ok: true, title, items: parsed, all: nonblank, hasSes: parsed.some((item) => item.kind === 'section') };
}

function ses(result, parsed) {
    if (!parsed.hasSes) return;
    const codeItem = parsed.items.find((x) => x.kind === 6);
    const labelItem = parsed.items.find((x) => x.kind === 7);
    // SES code/label values: leading whitespace is NOT authorized transport
    // (D17 allows only whole-input peripheral trim, CRLF/LF equivalence, and
    // per-line trailing trim). Leading whitespace therefore makes the pair
    // incomplete/unrecognized rather than silently trimmed into a valid pair.
    const codeRaw = codeItem ? codeItem.line.slice(LABELS[6].length) : '';
    const labelRaw = labelItem ? labelItem.line.slice(LABELS[7].length) : '';
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

function parse(raw) {
    const result = base(raw);
    const lines = splitLines(raw);
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
    ];
    for (const [concept, target] of fields) {
        const index = { commercial_name: 1, requested_dose: 2, requested_route: 3, requested_schedule: 4, requested_induction: 5 }[concept];
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
    const cip = items.get(0); if (cip) { const value = cip.line.slice(LABELS[0].length); contribution(result, 'cip', 'NONE', 'NO_PROPOSAL', value.trim() ? value : null, value, cip.line, cip.index, { semantic_status: value.trim() ? 'GATE_MATERIAL' : 'NO_VALUE' }); }
    ses(result, parsed);
    // D3 state semantics: RECOGNIZED requires every parsed concept to be safely
    // usable; any NO_VALUE / PROVENANCE_ONLY / UNRECOGNIZED_VALUE / blocked
    // contribution or warning marks the unit PARTIALLY_RECOGNIZED so only safe
    // contributions continue toward reconciliation.
    const partial =
        result.blocking_states.length > 0 ||
        result.warnings.length > 0 ||
        result.contributions.some((c) => c.semantic_status !== 'RECOGNIZED' && c.semantic_status !== 'GATE_MATERIAL');
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
