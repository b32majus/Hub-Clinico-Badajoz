/**
 * WO-D (issue #296) — Pure PreSalud parser V0 (Seam 1).
 *
 * Consumes PreSalud material ALREADY delimited by WO-B (T2, issue #294) and
 * applies the strict D9/D10/D17 grammars. This module is pure and
 * source-specific: no DOM, no side effects, no CIMA/catalogue access, no
 * fuzzy matching, no accent folding, no aliases, no alternate orders, no
 * omitted-field tolerance, no multiline formats, no heuristic recovery, no
 * hydration, and no patient association. Every result preserves the original
 * input byte-exact in `raw_input`, is previewable, and has `can_apply ===
 * false` (D3).
 *
 * Grammar (normative contract, D9/D10/D17):
 *
 *   PRESALUD_RECORD_V0 :=
 *     Estado ';' Medicamento ';' Vía ';' Dosis ';' Pauta ';' Días
 *   PRESALUD_MEDICAMENTO_V0 :=
 *     principio_activo_raw WS* "(" marca_comercial_raw ")" WS* descripcion_restante_raw?
 *
 * Semantics implemented:
 * - The record is EXACTLY six `;`-delimited fields in this order. Each value
 *   runs to the next `;` or the segment end. `Estado` (field 1) and `Días`
 *   (field 6) may be empty (WO-D NO_VALUE semantics); fields 2..5 must be
 *   non-empty or the line is not a valid D9 record (no omitted-field
 *   tolerance). A line that is not a valid record is preserved as an
 *   unrecognized fragment with zero proposals.
 * - The parser NEVER infers from drug text. Only the exact contractual
 *   subgrammar match (one single well-formed parenthesized group, non-empty
 *   principle and non-empty marca) extracts `marca_comercial_explicit`. Any
 *   other shape of `medicamento_raw` yields `MEDICATION_SUBGRAMMAR_UNMATCHED`:
 *   the raw is preserved and the record yields ZERO proposals (the medication
 *   field is the record's identity anchor; without a full match no field of
 *   that record is safe to propose). There is no partial rescue.
 * - `principio_activo_raw` is provenance-only: `target = NONE`, no proposal,
 *   no comparison against `commercial_name`, no classification.
 * - `Estado` and `Días` preserve raw with `target = NONE` and `semantic_status
 *   = PENDING_EXTERNAL_CONFIRMATION`. Empty `Estado` (or empty `Días`) is
 *   `value_state = NO_VALUE`. Neither is ever given clinical meaning in V0 and
 *   neither can ever clear or rewrite a control.
 * - Multi-record: a PreSalud source containing more than one record is
 *   detected deterministically and returns the structured unsupported-V0
 *   state `MULTI_RECORD_UNSUPPORTED_V0`: raw preserved, preview raw, zero
 *   proposals, apply blocked. This is NOT `SEGMENTATION_BLOCKED` (D9). No
 *   chronology, record selection, cross-record composition, dedup, grouping,
 *   or first/last-record wins — even when records carry identical values.
 * - REPEATED LABEL RULE (D9): `MULTIPLE_SOURCE_VALUES` +
 *   `REQUIRES_SELECTION` only for multiple explicit values within ONE
 *   record/unit whose boundaries are safe — never across records. Because the
 *   D9 positional record contains exactly one value per concept, this parser
 *   never fabricates a repeated label from one record; the enforceable V0
 *   guarantee is that cross-record values (identical or distinct) are never
 *   selectable and never grouped.
 * - Unknown text inside the unit is preserved. Unexpected internal failure is
 *   returned as a unit-contained `PARSER_ERROR` preserving the affected raw.
 */

export const SOURCE_PRESALUD = 'pre-salud';

export const UNIT_STATE_RECOGNIZED = 'RECOGNIZED';
export const UNIT_STATE_PARTIALLY_RECOGNIZED = 'PARTIALLY_RECOGNIZED';
export const UNIT_STATE_UNRECOGNIZED = 'UNRECOGNIZED';
export const UNIT_STATE_SEGMENTATION_BLOCKED = 'SEGMENTATION_BLOCKED';
export const UNIT_STATE_PARSER_ERROR = 'PARSER_ERROR';

export const BLOCK_MULTI_RECORD_UNSUPPORTED = 'MULTI_RECORD_UNSUPPORTED_V0';
export const MEDICATION_SUBGRAMMAR_UNMATCHED = 'MEDICATION_SUBGRAMMAR_UNMATCHED';
export const PENDING_EXTERNAL_CONFIRMATION = 'PENDING_EXTERNAL_CONFIRMATION';
export const NO_VALUE_STATE = 'NO_VALUE';
export const PROVENANCE_ONLY = 'PROVENANCE_ONLY';
export const UNRECOGNIZED_VALUE = 'UNRECOGNIZED_VALUE';
export const MULTIPLE_SOURCE_VALUES = 'MULTIPLE_SOURCE_VALUES';
export const REQUIRES_SELECTION = 'REQUIRES_SELECTION';
export const PROPOSAL_AUTO_PROPOSABLE = 'AUTO_PROPOSABLE';
export const PROPOSAL_NO_PROPOSAL = 'NO_PROPOSAL';
export const TARGET_NONE = 'NONE';
export const WARN_ROUTE_VALUE_UNRECOGNIZED = 'ROUTE_VALUE_UNRECOGNIZED';

// D7: Vía -> requested_route -> fhDermaVia only through EXACT authorized
// equivalence. The PreSalud V0 demo vocabulary is the closed set below
// (same forms as the D7 e-Orden route examples: SC | IV | Oral | IM).
// Any other value is preserved but is never converted, mapped to "Otra", or
// proposed (no converting an unknown value into a route target).
export const PRESALUD_ROUTE_EXACT_ALLOWLIST = Object.freeze(['SC', 'IV', 'Oral', 'IM']);

// Label-prefix guard: the D9 PreSalud record is a POSITIONAL value stream with
// NO labels, headers, aliases, or accent variants. A field that starts with
// one of these label prefixes (exact, unaccented, or alias form followed by
// `:`) marks the line as a NON-normative serialization: the parser must not
// recognize a labeled/aliased/reordered-label serialization as the D9 grammar
// (D17 anti-fuzzy contract: no aliases, no accent folding `Via`/`Dias`, no
// alternate orders). Such a line is preserved as unknown with zero proposals.
const PRESALUD_LABEL_PREFIX_RE =
    /^(?:Estado|Medicamento|Marca comercial|Marca|Principio activo|Vía|Via|Dosis|Pauta|Días|Dias|Fármaco|Farmaco)\s*:/;

const RECORD_FIELDS = 6;

function isBlankLine(raw, line) {
    void raw;
    return line.trim() === '';
}

function toNFC(value) {
    return typeof value.normalize === 'function' ? value.normalize('NFC') : value;
}

function splitRecordLines(raw) {
    // Transport: CRLF/LF/CR equivalent (D17). Only used for reading; the
    // envelope keeps the original raw byte-exact.
    return raw.split(/\r\n|\n|\r/);
}

/** D17-authorized per-line trailing whitespace strip for the comparison view. */
function lineView(value) {
    return toNFC(value).replace(/[ \t\u00a0]+$/, '');
}

/** Whole-record peripheral trim for reading; raw is never rewritten. */
function recordView(value) {
    return lineView(value).replace(/^[ \t\u00a0]+/, '');
}

function base(rawInput, state = UNIT_STATE_RECOGNIZED) {
    return {
        raw_input: rawInput,
        source: SOURCE_PRESALUD,
        unit_state: state,
        contributions: [],
        unrecognized_fragments: [],
        warnings: [],
        errors: [],
        blocking_states: [],
        can_preview: true,
        can_apply: false,
    };
}

function errorResult(raw, code, message, state = UNIT_STATE_PARSER_ERROR) {
    const result = base(typeof raw === 'string' ? raw : '<non-text-unit>', state);
    result.errors.push({ code, message, blocking: true });
    return result;
}

function fragment(result, raw, lineIndex, extra = {}) {
    result.unrecognized_fragments.push({
        raw,
        line_index: lineIndex,
        target: TARGET_NONE,
        proposal_status: PROPOSAL_NO_PROPOSAL,
        ...extra,
    });
}

/**
 * Push one contribution following the shared semantic-layer contribution
 * shape used by the sibling source parser (concept, target, proposal_status,
 * semantic_status, value, source_value, raw, line_index, provenance).
 */
function contribution(result, concept, target, status, value, sourceValue, raw, lineIndex, extra = {}) {
    result.contributions.push({
        concept,
        target,
        proposal_status: status,
        semantic_status: extra.semantic_status || 'RECOGNIZED',
        value,
        source_value: sourceValue,
        raw,
        line_index: lineIndex,
        provenance: { source: SOURCE_PRESALUD, raw, line_index: lineIndex },
        ...extra,
    });
}

/**
 * Estado/Días provenance-only contribution: target NONE, proposal NO_PROPOSAL,
 * semantic_status PENDING_EXTERNAL_CONFIRMATION (D7/D9). Empty raw is
 * value_state NO_VALUE and value null. Never clinically meaningful in V0 and
 * never able to clear/rewrite anything.
 */
function provenancePendingContribution(result, concept, rawValue, raw, lineIndex) {
    const present = rawValue.trim() !== '';
    contribution(result, concept, TARGET_NONE, PROPOSAL_NO_PROPOSAL, present ? rawValue : null, rawValue, raw, lineIndex, {
        semantic_status: PENDING_EXTERNAL_CONFIRMATION,
        value_state: present ? 'RAW_PRESENT' : NO_VALUE_STATE,
    });
}

/**
 * Vía/Dosis explicit positional value. Non-empty values are surfaced
 * with the exact D7 target as AUTO_PROPOSABLE; an empty field in 2..5 is a
 * D9 omitted-field violation and is rejected at the record level before this
 * helper is reached (it remains here only as a defensive path). Pauta is
 * NOT routed here: D7 keeps requested_schedule at target NONE / NO_PROPOSAL
 * in WO-D (see parseSingleRecord).
 */
function explicitValueContribution(result, concept, target, rawValue, raw, lineIndex) {
    const present = rawValue.trim() !== '';
    if (!present) {
        contribution(result, concept, TARGET_NONE, PROPOSAL_NO_PROPOSAL, null, rawValue, raw, lineIndex,
            { semantic_status: NO_VALUE_STATE });
    } else {
        contribution(result, concept, target, PROPOSAL_AUTO_PROPOSABLE, rawValue, rawValue, raw, lineIndex);
    }
}

/**
 * A field of the record whose identity anchor (medicamento) failed the
 * subgrammar: preserved as provenance-only, target NONE, NO_PROPOSAL, so a
 * broken medication identity never drags unrelated explicit text into a
 * proposal.
 */
function provenanceOnlyContribution(result, concept, rawValue, raw, lineIndex) {
    contribution(result, concept, TARGET_NONE, PROPOSAL_NO_PROPOSAL, rawValue, rawValue, raw, lineIndex, {
        semantic_status: PROVENANCE_ONLY,
    });
}

/**
 * Parse one PreSalud `medicamento_raw` value against the exact
 * PRESALUD_MEDICAMENTO_V0 subgrammar (D10):
 *
 *   principio_activo_raw WS* "(" marca_comercial_raw ")" WS* descripcion_restante_raw?
 *
 * Strict single-group contract: the value must contain EXACTLY one '(' and
 * EXACTLY one ')' (the ')' after the '('), with non-empty text before the
 * '(' (principle) and non-empty text inside the parens (marca). WS* is
 * permitted around the group. Text after the closing ')' is the optional
 * remaining description and is never decomposed. A full match returns
 * `{ matched: true, principio_activo_raw, marca_comercial_raw,
 * descripcion_restante_raw }` (components trimmed for internal use only).
 * Any other shape returns `{ matched: false }`.
 */
function parseMedicamento(rawValue) {
    const view = recordView(rawValue);
    if (view === '') return { matched: false };
    // No multiline formats in V0.
    if (/[\r\n]/.test(view)) return { matched: false };

    const firstOpen = view.indexOf('(');
    const firstClose = view.indexOf(')');
    const lastOpen = view.lastIndexOf('(');
    const lastClose = view.lastIndexOf(')');

    // Exactly one well-formed parenthesized group: one '(' and one ')', the
    // ')' after the '('.
    if (firstOpen === -1 || firstClose === -1) return { matched: false };
    if (lastOpen !== firstOpen || lastClose !== firstClose) return { matched: false };
    if (firstClose < firstOpen) return { matched: false };

    // principio_activo_raw must be non-empty before '(' (any non-WS text).
    const principleSlice = view.slice(0, firstOpen);
    if (principleSlice.trim() === '') return { matched: false };

    // marca_comercial_raw inside the parens must be non-empty.
    const brandSlice = view.slice(firstOpen + 1, firstClose);
    if (brandSlice.trim() === '') return { matched: false };

    return {
        matched: true,
        principio_activo_raw: principleSlice.trim(),
        marca_comercial_raw: brandSlice.trim(),
        descripcion_restante_raw: view.slice(firstClose + 1).trim() || null,
    };
}

/** A D9 record-shaped line: exactly six fields, fields 2..5 non-empty. */
function isRecordLine(content) {
    const view = recordView(content);
    if (view === '') return false;
    // Anti-fuzzy: a labeled / aliased / accent-variant / reordered-label
    // serialization is NOT a D9 positional record (D17). A label prefix on
    // any field marks the whole line as non-normative.
    const fields = view.split(';');
    if (fields.length !== RECORD_FIELDS) return false;
    for (let i = 0; i < fields.length; i += 1) {
        // Fail-closed on indented labels: transport authorizes trailing
        // whitespace only, so a label prefix stays a label even when the
        // field carries leading whitespace. Testing the trimmed field
        // never trims a label into validity — it rejects it.
        const fieldView = fields[i].replace(/^[ \t\u00a0]+/, '');
        if (PRESALUD_LABEL_PREFIX_RE.test(fieldView)) return false;
    }
    for (let i = 1; i < 5; i += 1) {
        if (fields[i].trim() === '') return false;
    }
    return true;
}

/**
 * Deterministically count how many PreSalud records this source contains
 * (D9). WO-B already emits one record per PreSalud unit, so a multi-record
 * PreSalud source is defended here at the source level.
 */
function countRecords(recordLines) {
    let count = 0;
    for (const line of recordLines) {
        if (isRecordLine(line)) count += 1;
    }
    return count;
}

/**
 * Parse exactly one already-delimited D9 record line into concept
 * contributions. Callers guarantee the line is record-shaped.
 */
function parseSingleRecord(result, raw, lineIndex) {
    const view = recordView(raw);
    const fields = view.split(';').map((f) => f.replace(/^[ \t\u00a0]+/, ''));
    // Exact source slices up to the field delimiter: raw is never rewritten
    // for evidence. D10 authorizes peripheral trim only for internal
    // subgrammar components (parseMedicamento trims its own view).
    const exactFields = raw.split(';');
    const medicamentoExact = exactFields.length === RECORD_FIELDS ? exactFields[1] : fields[1];
    const [estadoRaw, medicamentoRaw, viaRaw, dosisRaw, pautaRaw, diasRaw] = fields;
    void medicamentoRaw;

    // Estado / Días: provenance-only, never clinical.
    provenancePendingContribution(result, 'estado', estadoRaw, raw, lineIndex);
    provenancePendingContribution(result, 'dias', diasRaw, raw, lineIndex);

    // Medicamento: strict D10 subgrammar. A failed subgrammar means the
    // record's identity anchor is not established: the record yields zero
    // proposals (only provenance-only contributions), the raw is preserved,
    // and no partial rescue occurs.
    const sub = parseMedicamento(medicamentoExact);
    if (!sub.matched) {
        contribution(result, 'medicamento', TARGET_NONE, PROPOSAL_NO_PROPOSAL, medicamentoExact, medicamentoExact, raw, lineIndex, {
            semantic_status: MEDICATION_SUBGRAMMAR_UNMATCHED,
            blocking: true,
            reason: { code: MEDICATION_SUBGRAMMAR_UNMATCHED, message: 'Medicamento does not fully match PRESALUD_MEDICAMENTO_V0.' },
        });
        result.blocking_states.push(MEDICATION_SUBGRAMMAR_UNMATCHED);
        result.errors.push({ code: MEDICATION_SUBGRAMMAR_UNMATCHED, message: 'Medicamento does not fully match PRESALUD_MEDICAMENTO_V0.', blocking: true });
        // Vía / Dosis / Pauta remain explicit source values but are NOT safe
        // to propose while the record's medication identity is broken.
        provenanceOnlyContribution(result, 'via', viaRaw, raw, lineIndex);
        provenanceOnlyContribution(result, 'dosis', dosisRaw, raw, lineIndex);
        provenanceOnlyContribution(result, 'pauta', pautaRaw, raw, lineIndex);
        result.unit_state = UNIT_STATE_PARTIALLY_RECOGNIZED;
        return;
    }

    // principio_activo_raw: provenance-only (D10). No proposal, no comparison.
    // The component value is trimmed internally; the source evidence stays exact.
    contribution(result, 'principio_activo_raw', TARGET_NONE, PROPOSAL_NO_PROPOSAL, sub.principio_activo_raw, medicamentoExact, raw, lineIndex, {
        semantic_status: PROVENANCE_ONLY,
    });
    // Only a full exact subgrammar match authorizes commercial_name (D10/D7).
    contribution(result, 'commercial_name', 'fhDermaFarmaco', PROPOSAL_AUTO_PROPOSABLE, sub.marca_comercial_raw, medicamentoExact, raw, lineIndex, {
        semantic_status: 'RECOGNIZED',
        marca_comercial_explicit: sub.marca_comercial_raw,
        principio_activo_raw: sub.principio_activo_raw,
        descripcion_restante_raw: sub.descripcion_restante_raw,
    });

    // Vía / Dosis / Pauta: exact D9 positional fields with exact D7 targets.
    // Vía is proposed ONLY when the value is an exact authorized route
    // equivalent (PRESALUD_ROUTE_EXACT_ALLOWLIST); any other explicit route
    // value is preserved raw with target NONE / NO_PROPOSAL (never converted
    // to "Otra" and never auto-proposed).
    if (PRESALUD_ROUTE_EXACT_ALLOWLIST.includes(viaRaw)) {
        explicitValueContribution(result, 'requested_route', 'fhDermaVia', viaRaw, raw, lineIndex);
    } else {
        contribution(result, 'requested_route', TARGET_NONE, PROPOSAL_NO_PROPOSAL, viaRaw, viaRaw, raw, lineIndex, {
            semantic_status: viaRaw.trim() === '' ? NO_VALUE_STATE : UNRECOGNIZED_VALUE,
        });
        if (viaRaw.trim() !== '') {
            result.warnings.push({ code: WARN_ROUTE_VALUE_UNRECOGNIZED, message: 'Route value is not an exact authorized V0 equivalence; preserved raw with target NONE.' });
        }
    }
    explicitValueContribution(result, 'requested_dose', 'fhDermaDosis', dosisRaw, raw, lineIndex);
    // Pauta (D7): the explicit positional value is preserved with
    // provenance, but WO-D never hydrates it — always target NONE /
    // NO_PROPOSAL. Mapping to an exact fhDermaPauta option or to OTRO +
    // fhDermaPautaOtro is a WO-E explicit professional decision, never an
    // AUTO_PROPOSABLE parser proposal.
    provenanceOnlyContribution(result, 'requested_schedule', pautaRaw, raw, lineIndex);
}

/**
 * Core parse of one PreSalud source/unit raw.
 * @param {string} rawInput The raw (one record line or multi-record text).
 */
function parse(rawInput) {
    const result = base(rawInput);
    const lines = splitRecordLines(rawInput);
    // Preserve the ORIGINAL index of every non-blank line (even when two
    // lines have identical text, each keeps its own line_index).
    const nonBlank = [];
    for (let i = 0; i < lines.length; i += 1) {
        if (!isBlankLine(rawInput, lines[i])) nonBlank.push({ line: lines[i], index: i });
    }

    // Empty / blank input: valid empty result (D3).
    if (nonBlank.length === 0) {
        result.unit_state = UNIT_STATE_RECOGNIZED;
        return result;
    }

    // Deterministic multi-record detection (D9). V0 does not support
    // multi-record composition: raw preserved, preview raw, zero proposals,
    // apply blocked. Not SEGMENTATION_BLOCKED. record_count is surfaced so
    // the consumer can distinguish a genuine multi-record input (a real V0
    // unsupported state) from an ordinary single record.
    const records = countRecords(lines);
    if (records > 1) {
        result.unit_state = UNIT_STATE_PARTIALLY_RECOGNIZED;
        result.record_count = records;
        result.multi_record_state = BLOCK_MULTI_RECORD_UNSUPPORTED;
        result.blocking_states.push(BLOCK_MULTI_RECORD_UNSUPPORTED);
        result.errors.push({ code: BLOCK_MULTI_RECORD_UNSUPPORTED, message: 'PreSalud input contains more than one record; V0 does not support multi-record composition.', blocking: true });
        result.unrecognized_fragments.push({
            raw: rawInput,
            line_index: 0,
            target: TARGET_NONE,
            proposal_status: PROPOSAL_NO_PROPOSAL,
            blocking_reason: BLOCK_MULTI_RECORD_UNSUPPORTED,
        });
        // REPEATED LABEL RULE (D9): multi-record input is blocked with zero
        // proposals; values across records (identical or distinct) are never
        // grouped, selected, composed, deduped, or first/last-wins.
        result.repeated_label_rule = {
            enforced: true,
            within_single_record_multiple_explicit_values: false,
            cross_record_grouping_or_selection: false,
            reason: 'MULTI_RECORD_UNSUPPORTED_V0: cross-record values are never presented as choices and never grouped.',
        };
        return result;
    }
    result.record_count = records;

    if (records === 0) {
        // No record-shaped line: unknown text preserved with zero proposals.
        result.unit_state = UNIT_STATE_UNRECOGNIZED;
        for (const { line, index } of nonBlank) fragment(result, line, index);
        return result;
    }

    // Exactly one record-shaped line. Any other non-blank line in the same
    // unit is preserved as an unknown fragment (unknown inside the unit is
    // preserved, never dropped).
    const recordItems = nonBlank.filter(({ line }) => isRecordLine(line));
    const otherItems = nonBlank.filter(({ line }) => !isRecordLine(line));
    for (const { line, index } of otherItems) fragment(result, line, index);
    if (otherItems.length > 0) {
        result.unit_state = UNIT_STATE_PARTIALLY_RECOGNIZED;
        result.warnings.push({ code: 'UNKNOWN_TEXT_IN_UNIT', message: 'Non-record text inside the PreSalud unit is preserved as an unrecognized fragment.' });
    }

    const recordItem = recordItems[0];
    parseSingleRecord(result, recordItem.line, recordItem.index);
    // If parseSingleRecord found an unmatched medicamento it already set
    // PARTIALLY_RECOGNIZED; otherwise keep the unit RECOGNIZED (Estado/Días
    // provenance-only contributions are the normal PreSalud V0 state, not
    // anomalies — like GATE_MATERIAL they never force a partial state).
    //
    // REPEATED LABEL RULE (D9): the single D9 positional record carries at
    // most one explicit value per concept, so this parser can never fabricate
    // MULTIPLE_SOURCE_VALUES from one record. The guarantee this envelope
    // enforces for V0 is the cross-record boundary: because more than one
    // record is deterministically blocked above with zero proposals, no value
    // from any record is ever presented as an independent selectable choice,
    // and identical values across records are never grouped into a single
    // contribution. Consumers must not synthesize per-concept selection from
    // a MULTI_RECORD_UNSUPPORTED_V0 result.
    result.repeated_label_rule = {
        enforced: true,
        within_single_record_multiple_explicit_values: false,
        cross_record_grouping_or_selection: false,
        reason: 'D9 positional record has one explicit value per concept; multi-record input is blocked with MULTI_RECORD_UNSUPPORTED_V0.',
    };
    return result;
}

/**
 * Parse a PreSalud unit from a T2 segmenter item (`{ kind, source, raw }`) or
 * directly from a raw string. The unit must already be delimited by WO-B;
 * this parser never re-discovers mixed-input boundaries.
 * @param {string|object} input raw string or WO-B unit item
 * @returns {object} D3 fail-safe parse envelope
 */
export function parsePreSaludUnit(input) {
    let raw;
    try {
        if (typeof input === 'string') return parsePreSaludRaw(input);
        if (!input || typeof input !== 'object') return errorResult(input, 'PRESALUD_PARSER_INPUT_NOT_TEXT', 'Input raw value is not text.');
        raw = input.raw;
        if (input.kind === 'blocked_unit') return errorResult(raw, 'SEGMENTATION_BLOCKED', input.blocking_reason || 'The source unit was blocked by segmentation.', UNIT_STATE_SEGMENTATION_BLOCKED);
        if (typeof raw !== 'string') return errorResult(raw, 'PRESALUD_PARSER_INPUT_NOT_TEXT', 'Input raw value is not text.');
        if (input.kind !== 'presalud_unit') return errorResult(raw, 'PRESALUD_PARSER_WRONG_UNIT_KIND', 'Input unit kind is not presalud_unit.');
        return parsePreSaludRaw(raw);
    } catch {
        return errorResult(raw, 'PRESALUD_PARSER_INTERNAL_ERROR', 'PRESALUD_PARSER_INTERNAL_ERROR');
    }
}

/**
 * Parse a PreSalud raw source string (one record, or a deterministic
 * multi-record input). Alias `parsePreSaludSource` documents the source-level
 * entry point used by integration when WO-B delivered multiple PreSalud
 * units from one export.
 */
export function parsePreSaludRaw(rawInput) {
    if (typeof rawInput !== 'string') return errorResult(rawInput, 'PRESALUD_PARSER_INPUT_NOT_TEXT', 'Input raw value is not text.');
    try {
        return parse(rawInput);
    } catch {
        return errorResult(rawInput, 'PRESALUD_PARSER_INTERNAL_ERROR', 'PRESALUD_PARSER_INTERNAL_ERROR');
    }
}

export function parsePreSaludSource(rawInput) {
    return parsePreSaludRaw(rawInput);
}
