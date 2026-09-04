'use strict';
/**
 * WO-B (issue #294) — Pure clinical intake detector/segmenter.
 *
 * Partitions raw pasted text into delimited source units using ONLY structural
 * grammar (no DOM, no side effects, no field-content parsing, no concept
 * extraction, no hydration, no patient association, no fuzzy recovery).
 *
 * Structural grammars (normative contracts, spec D17 / D9):
 *   - e-Orden unit : D17 serialization: anchored header line
 *       `SOLICITUD DERMATOLOGÍA → FARMACIA - <título>` followed inside the
 *       unit body by a `═` separator block (U+2550). Body lines must be
 *       blank, `═` separator, `•` bullet, `PROGRAMA SES`, or `- ` continuation.
 *   - PreSalud unit : D9 serialization: a contiguous run of lines, each a
 *       single `Estado;Medicamento;Vía;Dosis;Pauta;Días` record — exactly six
 *       `;`-delimited fields; `Estado` (field 1) and `Días` (field 6) may be
 *       empty (WO-D `NO_VALUE` semantics); fields 2..5 must be non-empty and
 *       free of stray `;`. One record = one unit (V0). PreSalud never
 *       appears as an inline fragment inside another source.
 *
 * Safety rules (see D3/D4/D13 and the ticket's invariants):
 *   - The partition is structural only; membership must be unique or the
 *     result is blocked — never guessed.
 *   - Source order is irrelevant: e-Orden-before-PreSalud and PreSalud-before-
 *     e-Orden are both valid when the partition is unique (D4).
 *   - Two e-Orden units in one input are never partitionable (D17 gives no
 *     safe boundary rule) → whole import `SEGMENTATION_BLOCKED`.
 *   - An e-Orden header whose block is not a valid D17 unit (no `═`
 *     separator, or body with non-contractual content) cannot be claimed by
 *     any grammar: the region stays an unknown fragment. A PreSalud
 *     record-shaped line inside an e-Orden body span makes source ownership
 *     ambiguous → whole import `SEGMENTATION_BLOCKED` (mixed input without
 *     unique partition, D13).
 *   - PreSalud multi-record (D9): more than one record line in the input →
 *     deterministic `PRESALUD_MULTI_RECORD_UNSUPPORTED_V0` for the PreSalud
 *     content; an independent e-Orden unit of the same input stays intact
 *     (proportional blocking, D13).
 *   - Unknown text is NEVER dropped or misclassified: it surfaces as an
 *     `unknown` fragment with safe boundaries (D4).
 *
 * Output follows the fail-safe envelope of D3: `can_apply` is ALWAYS false.
 * Empty and fully-unknown inputs are valid results with zero units and zero
 * proposals. Any unexpected internal failure is returned as a deterministic
 * PARSER_ERROR-shaped envelope that preserves the raw input.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

export const SOURCE_EORDEN = 'e-orden';
export const SOURCE_PRESALUD = 'pre-salud';
export const SOURCE_UNKNOWN = 'unknown';

export const UNIT_STATE_RECOGNIZED = 'RECOGNIZED';
export const UNIT_STATE_SEGMENTATION_BLOCKED = 'SEGMENTATION_BLOCKED';
export const UNIT_STATE_PARSER_ERROR = 'PARSER_ERROR';

export const KIND_EORDEN_UNIT = 'eorden_unit';
export const KIND_PRESALUD_UNIT = 'presalud_unit';
export const KIND_UNKNOWN_FRAGMENT = 'unknown_fragment';
export const KIND_BLOCKED_UNIT = 'blocked_unit';

// Envelope-level blocking state codes (D3 / D13 / D9 / D17).
export const BLOCK_MULTI_EORDEN = 'MULTI_EORDEN_NOT_PARTITIONABLE';
export const BLOCK_MIXED_NO_UNIQUE_PARTITION = 'MIXED_INPUT_NO_UNIQUE_PARTITION';
export const BLOCK_MULTI_RECORD_PRESALUD = 'PRESALUD_MULTI_RECORD_UNSUPPORTED_V0';

// ─── Static structural tables / patterns (never mutated) ─────────────────────

const EORDEN_HEADER_PREFIX = 'SOLICITUD DERMATOLOGÍA → FARMACIA';
const EORDEN_SES_SECTION_LINE = 'PROGRAMA SES';
const EORDEN_BULLET = '•';
const EORDEN_FIELD_LABEL_PREFIXES = [
    '• CIP:',
    '• Marca comercial solicitada:',
    '• Dosis solicitada:',
    '• Vía solicitada:',
    '• Pauta:',
    '• Inducción solicitada:',
    '• Código:',
    '• Denominación:',
];
const EORDEN_HEADER_RE = /^SOLICITUD DERMATOLOGÍA → FARMACIA/;
const LINE_IS_SEPARATOR_RE = /^[ \t]*═+[ \t]*$/;
const CONTINUATION_LINE_RE = /^-[ \t]/;

const PRESALUD_FIELDS = 6;
// Structural guard: a pathological number of blank/separator lines makes any
// partition ambiguous; abort deterministically instead of guessing.
const MAX_BLANK_OR_SEPARATOR_LINES = 40;

const CRLF_RE = /\r\n?/g;
const TRAILING_WS_RE = /[ \t\u00A0]+$/;

// ─── Transport normalization (D17): comparison only; raw is never rewritten ──

/**
 * Classification-only view of a line (no terminator, no trailing/peripheral
 * whitespace). Used for structural decisions; never stored.
 * @param {string} line
 * @returns {string}
 */
function cleanLine(line) {
    return line.replace(TRAILING_WS_RE, '').trim();
}

/**
 * @param {string} line
 * @returns {boolean} true when the line is exactly a `═` separator block
 */
function isSeparatorOnlyLine(line) {
    const content = cleanLine(line);
    return content !== '' && LINE_IS_SEPARATOR_RE.test(content);
}

/**
 * Structural D9 record check (shape only — values are never interpreted):
 * exactly six `;`-delimited fields on a single line; `Estado` (field 1) and
 * `Días` (field 6) may be empty (WO-D `NO_VALUE` semantics); fields 2..5 must
 * be non-empty; no stray `;` inside any field (field count is exact).
 * @param {string} line
 * @returns {boolean}
 */
function isPresaludRecordLine(line) {
    const content = cleanLine(line);
    if (content === '') return false;
    if (!content.includes(';')) return false;

    const fields = content.split(';');
    if (fields.length !== PRESALUD_FIELDS) return false;

    for (let i = 1; i < 5; i += 1) {
        if (fields[i].trim() === '') return false;
    }

    // D10 structural constraint on the medication field (field index 1): at
    // most ONE parenthesized group. A second group is contractually invalid
    // and the line is not a valid D9 record (never force-recognized).
    const medication = fields[1];
    const openCount = (medication.match(/\(/g) || []).length;
    const closeCount = (medication.match(/\)/g) || []).length;
    if (openCount !== closeCount) return false;
    if (openCount > 1) return false;
    return true;
}

/**
 * @param {string} raw
 * @returns {number} count of blank or `═`-separator-only lines
 */
function countBlankOrSeparatorLines(raw) {
    let count = 0;
    for (const line of raw.split('\n')) {
        const c = cleanLine(line);
        if (c === '' || LINE_IS_SEPARATOR_RE.test(c)) count += 1;
    }
    return count;
}

// ─── e-Orden structural recognition ──────────────────────────────────────────

/**
 * Count D17 bullet-label lines present in an e-Orden body (structural census
 * only; the census never interprets field content).
 * @param {string[]} lines
 * @returns {Object<string, number>}
 */
function countEOrdenFieldLines(lines) {
    const counts = {};
    for (const line of lines) {
        const c = cleanLine(line);
        for (const label of EORDEN_FIELD_LABEL_PREFIXES) {
            if (c.startsWith(label)) {
                counts[label] = (counts[label] || 0) + 1;
                break;
            }
        }
    }
    return counts;
}

/**
 * True when every non-blank body line is structurally allowed inside a D17
 * e-Orden unit (`═` separator, `•` bullet, `PROGRAMA SES`, `- ` continuation).
 * @param {string[]} bodyLines lines after the header line
 * @returns {boolean}
 */
function isEOrdenBodyClean(bodyLines) {
    for (const line of bodyLines) {
        const c = cleanLine(line);
        if (c === '') continue;
        if (LINE_IS_SEPARATOR_RE.test(c)) continue;
        if (c.startsWith(EORDEN_BULLET)) continue;
        if (c === EORDEN_SES_SECTION_LINE) continue;
        if (CONTINUATION_LINE_RE.test(c)) continue;
        return false;
    }
    return true;
}

// ─── Item builders (pure, deterministic) ─────────────────────────────────────

/**
 * @param {string[]} lines working lines
 * @param {number}   start inclusive line index
 * @param {number}   end   exclusive line index
 * @returns {string} exact slice of the working text
 */
function sliceRaw(lines, start, end) {
    return lines.slice(start, end).join('\n');
}

/**
 * e-Orden recognized unit item.
 * @param {string[]} lines
 * @param {number} start
 * @param {number} end
 * @returns {Object}
 */
function eOrdenUnitItem(lines, start, end) {
    const unitLines = lines.slice(start, end);
    return {
        kind: KIND_EORDEN_UNIT,
        source: SOURCE_EORDEN,
        state: UNIT_STATE_RECOGNIZED,
        raw: sliceRaw(lines, start, end),
        structural_type: 'e-orden',
        recognized_fields: countEOrdenFieldLines(unitLines),
        start_line: start,
        end_line: end,
        unit_index: -1,
        can_preview: true,
        preview_blocked: false,
    };
}

/**
 * PreSalud recognized unit item.
 * @param {string[]} lines
 * @param {number} start
 * @param {number} end
 * @returns {Object}
 */
function presaludUnitItem(lines, start, end) {
    const recordLines = lines.slice(start, end);
    return {
        kind: KIND_PRESALUD_UNIT,
        source: SOURCE_PRESALUD,
        state: UNIT_STATE_RECOGNIZED,
        raw: sliceRaw(lines, start, end),
        structural_type: 'pre-salud',
        record_count: recordLines.length,
        recognized_fields: { 'pre-salud-record': recordLines.length },
        start_line: start,
        end_line: end,
        unit_index: -1,
        can_preview: true,
        preview_blocked: false,
    };
}

/**
 * Unknown fragment item (lossless raw preservation).
 * @param {string[]} lines
 * @param {number} start
 * @param {number} end
 * @returns {Object}
 */
function unknownFragmentItem(lines, start, end) {
    return {
        kind: KIND_UNKNOWN_FRAGMENT,
        source: SOURCE_UNKNOWN,
        state: UNIT_STATE_RECOGNIZED,
        raw: sliceRaw(lines, start, end),
        structural_type: 'unknown',
        recognized_fields: {},
        start_line: start,
        end_line: end,
        unit_index: -1,
        can_preview: true,
        preview_blocked: false,
    };
}

/**
 * Blocked unit item (state SEGMENTATION_BLOCKED; raw preserved).
 * @param {string[]} lines
 * @param {number} start
 * @param {number} end
 * @param {string} source
 * @param {string} reason
 * @returns {Object}
 */
function blockedUnitItem(lines, start, end, source, reason) {
    return {
        kind: KIND_BLOCKED_UNIT,
        source,
        state: UNIT_STATE_SEGMENTATION_BLOCKED,
        raw: sliceRaw(lines, start, end),
        structural_type: 'blocked',
        recognized_fields: {},
        start_line: start,
        end_line: end,
        unit_index: -1,
        can_preview: true,
        preview_blocked: true,
        blocking_reason: reason,
    };
}

// ─── Envelope assembly ───────────────────────────────────────────────────────

/**
 * Validate the partition over the working lines:
 *   1. items are sorted by line range, with no overlap and no inversion;
 *   2. every NON-BLANK / NON-SEPARATOR line is covered by exactly one item
 *      (semantic content is never dropped; blank and `═`-separator-only lines
 *      are transport-level separators and may be inside an item span or
 *      between items);
 *   3. every item's `raw` equals its exact line slice (byte-exact).
 * @param {string[]} lines
 * @param {Object[]} recognizedUnits
 * @param {Object[]} unknownFragments
 * @returns {{ok: boolean, reason: string}}
 */
function validateLossless(lines, recognizedUnits, unknownFragments) {
    const all = [...recognizedUnits, ...unknownFragments].sort(
        (a, b) => a.start_line - b.start_line || a.end_line - b.end_line
    );

    // 1 — no overlap / no inversion between consecutive items.
    let prevEnd = -1;
    for (const item of all) {
        if (item.end_line < item.start_line) {
            return { ok: false, reason: 'inverted item range' };
        }
        if (item.start_line < prevEnd) {
            return { ok: false, reason: 'items overlap' };
        }
        prevEnd = item.end_line;
    }

    // 2 — semantic coverage: each non-blank, non-separator line is covered.
    for (let i = 0; i < lines.length; i += 1) {
        if (isSkippableLine(lines[i])) continue;
        const covered = all.filter((item) => item.start_line <= i && i < item.end_line);
        if (covered.length !== 1) {
            return {
                ok: false,
                reason: `semantic line ${i} covered by ${covered.length} items`,
            };
        }
    }

    // 3 — byte-exact raw: item.raw equals its exact line slice.
    for (const item of all) {
        const slice = lines.slice(item.start_line, item.end_line).join('\n');
        if (item.raw !== slice) {
            return { ok: false, reason: `item ${item.kind} raw not byte-exact` };
        }
    }
    return { ok: true, reason: '' };
}

/**
 * @param {string} line
 * @returns {boolean} true when the line is a transport-level separator (blank
 *   or `═`-separator-only) that carries no structural content
 */
function isSkippableLine(line) {
    const c = cleanLine(line);
    return c === '' || LINE_IS_SEPARATOR_RE.test(c);
}

/**
 * Finalize a valid result: assign unit indexes, compute detected sources.
 * @param {string} rawInput
 * @param {string[]} lines
 * @param {Object[]} recognizedUnits
 * @param {Object[]} unknownFragments
 * @param {Array}  [blockingStates]
 * @param {Array}  [warnings]
 * @returns {Object} D3 envelope
 */
function resultEnvelope(rawInput, lines, recognizedUnits, unknownFragments, blockingStates = [], warnings = []) {
    const validation = validateLossless(lines, recognizedUnits, unknownFragments);
    if (!validation.ok) {
        return parserErrorEnvelope(rawInput, 'SEGMENTER_PARTITION_VIOLATION', validation.reason);
    }

    let index = 0;
    for (const unit of [...recognizedUnits, ...unknownFragments]) {
        unit.unit_index = index;
        index += 1;
    }
    const detected = [...new Set(recognizedUnits.map((u) => u.source))].filter(
        (s) => s !== SOURCE_UNKNOWN
    );

    return {
        raw_input: rawInput,
        detected_sources: detected,
        recognized_units: recognizedUnits,
        unrecognized_fragments: unknownFragments,
        concepts: [],
        contributions: [],
        warnings,
        errors: [],
        blocking_states: blockingStates,
        can_preview: true,
        can_apply: false,
    };
}

/**
 * Deterministic PARSER_ERROR-shaped envelope (D3): preserves raw, blocks
 * everything, never throws.
 * @param {string} rawInput
 * @param {string} code
 * @param {string} message
 * @returns {Object}
 */
function parserErrorEnvelope(rawInput, code, message) {
    return {
        raw_input: rawInput,
        detected_sources: [],
        recognized_units: [],
        unrecognized_fragments: [],
        concepts: [],
        contributions: [],
        warnings: [],
        errors: [{ code, message, blocking: true }],
        blocking_states: [],
        can_preview: true,
        can_apply: false,
    };
}

/**
 * Empty-input envelope (D3: valid result, zero units, zero proposals).
 * @param {string} rawInput
 * @returns {Object}
 */
function emptyEnvelope(rawInput) {
    return {
        raw_input: rawInput,
        detected_sources: [],
        recognized_units: [],
        unrecognized_fragments: [],
        concepts: [],
        contributions: [],
        warnings: [],
        errors: [],
        blocking_states: [],
        can_preview: true,
        can_apply: false,
    };
}

// ─── Region scanning (PreSalud / unknown) ────────────────────────────────────

/**
 * Split a line range into single-class runs of lines that are NOT blank and
 * NOT `═`-separator-only (those act as breaks). A run is classified 'prs' when
 * every line is a valid D9 record, else 'unk'.
 *
 * Valid e-Orden unit spans are excluded from the scanned ranges by the caller,
 * so any e-Orden header-like line encountered here is an invalid/truncated
 * header: it is classified by the ordinary line rules (it has no `;`, so it
 * is 'unk') and NEVER swallows subsequent record-shaped lines — a record line
 * that follows an invalid header is still scanned independently.
 * @param {string[]} lines
 * @param {number} start
 * @param {number} end
 * @returns {Array} runs [{start, end, cls}]
 */
function splitRuns(lines, start, end) {
    const runs = [];
    let i = start;
    while (i < end) {
        const c = cleanLine(lines[i]);
        if (c === '' || isSeparatorOnlyLine(lines[i])) {
            i += 1;
            continue;
        }
        const cls = isPresaludRecordLine(lines[i]) ? 'prs' : 'unk';
        const runStart = i;
        i += 1;
        while (i < end) {
            const ci = cleanLine(lines[i]);
            if (ci === '' || isSeparatorOnlyLine(lines[i])) break;
            const nextCls = isPresaludRecordLine(lines[i]) ? 'prs' : 'unk';
            if (nextCls !== cls) break;
            i += 1;
        }
        runs.push({ start: runStart, end: i, cls });
    }
    return runs;
}

/**
 * Find the structural end of an e-Orden unit whose header is at `headerIdx`.
 *
 * The unit spans from the header through the LAST `═` separator line of its
 * trailing separator block. If the header is immediately followed by a
 * separator, that is the unit's opening `═` block; the unit then extends
 * through the body until the NEXT separator block (its closing one) or EOF.
 * Without an opening separator the unit is invalid, but a deterministic scan
 * end is still returned (up to the next separator/header/EOF).
 *
 * @param {string[]} lines
 * @param {number} headerIdx
 * @param {number} lineCount
 * @returns {{sepIndex: number, scanEnd: number}}
 */
function findEOrdenUnitEnd(lines, headerIdx, lineCount) {
    let lastSepIndex = -1;
    for (let j = headerIdx + 1; j < lineCount; j += 1) {
        if (isSeparatorOnlyLine(lines[j])) lastSepIndex = j;
        else break;
    }
    if (lastSepIndex !== -1) {
        for (let j = lastSepIndex + 1; j < lineCount; j += 1) {
            const cj = cleanLine(lines[j]);
            if (cj === '') continue;
            if (isSeparatorOnlyLine(lines[j])) {
                lastSepIndex = j;
                break;
            }
            if (cj.startsWith(EORDEN_HEADER_PREFIX)) break;
        }
    } else {
        for (let j = headerIdx + 1; j < lineCount; j += 1) {
            if (isSeparatorOnlyLine(lines[j])) {
                lastSepIndex = j;
                break;
            }
            if (cleanLine(lines[j]).startsWith(EORDEN_HEADER_PREFIX)) break;
        }
    }
    const scanEnd = lastSepIndex === -1 ? lineCount : lastSepIndex + 1;
    return { sepIndex: lastSepIndex, scanEnd };
}

// ─── Core segmentation ───────────────────────────────────────────────────────

/**
 * @param {string} rawInput
 * @returns {Object} D3 envelope
 */
function runSegmentation(rawInput) {
    // Working lines are RAW lines (with line terminators removed but content
    // untouched). Normalization is applied only for per-line classification,
    // so item raws tile the input byte-exact.
    const trimmedInput = rawInput.replace(CRLF_RE, '\n');
    if (trimmedInput.replace(TRAILING_WS_RE, '').trim() === '') {
        return emptyEnvelope(rawInput);
    }

    const blankSeparatorCount = countBlankOrSeparatorLines(trimmedInput);
    if (blankSeparatorCount > MAX_BLANK_OR_SEPARATOR_LINES) {
        return parserErrorEnvelope(
            rawInput,
            'SEGMENTER_TOO_MANY_SEPARATOR_LINES',
            'Input contains an excessive number of blank/separator lines; no ' +
            'safe structural partition is possible.'
        );
    }

    const lines = trimmedInput.split('\n');
    // Peripheral empty lines (leading/trailing, D17 trim semantics) carry no
    // structural content and are excluded from the partition: the envelope
    // still preserves the exact original raw input, and items tile the
    // semantic content losslessly.
    while (lines.length > 0 && cleanLine(lines[0]) === '') lines.shift();
    while (lines.length > 0 && cleanLine(lines[lines.length - 1]) === '') lines.pop();
    const lineCount = lines.length;

    // Find every e-Orden header candidate. A header that forms a VALID
    // complete D17 unit (header + body-clean + `═` separator, no PreSalud
    // record-shaped line inside its span) counts as an e-Orden unit for the
    // multi-unit rule; only multiple VALID units trigger
    // MULTI_EORDEN_NOT_PARTITIONABLE. A header with a record-shaped line
    // inside its span is a mixed-input candidate (handled as
    // BLOCK_MIXED_NO_UNIQUE_PARTITION below); an invalid/truncated header
    // (no separator or non-contractual body) is unknown text.
    const candidateHeaders = [];
    const validHeaders = [];
    for (let i = 0; i < lineCount; i += 1) {
        if (!EORDEN_HEADER_RE.test(cleanLine(lines[i]))) continue;
        candidateHeaders.push(i);
        const end = findEOrdenUnitEnd(lines, i, lineCount);
        const sepIndex = end.sepIndex;
        const bodyEnd = sepIndex === -1 ? end.scanEnd : sepIndex;
        const body = lines.slice(i + 1, bodyEnd);
        const recordInside = lines.slice(i + 1, bodyEnd).some((l) => isPresaludRecordLine(l));
        const valid = sepIndex !== -1 && isEOrdenBodyClean(body) && !recordInside;
        if (valid) validHeaders.push(i);
    }

    // Rule D17/D13: two or more VALID e-Orden units are never partitionable.
    if (validHeaders.length >= 2) {
        return blockedWholeImportEnvelope(
            rawInput,
            lines,
            SOURCE_EORDEN,
            BLOCK_MULTI_EORDEN,
            'Two or more e-Orden units detected in one raw input; D17/D13 ' +
            'provide no safe partition for multiple e-Orden units.'
        );
    }

    // A single valid e-Orden unit.
    const headerLines = validHeaders;
    // Mixed-input candidates: any header whose span is NOT body-clean but DOES
    // contain a record-shaped line. A record-shaped line inside an e-Orden
    // span makes source ownership ambiguous and no unique partition exists,
    // regardless of other valid units — this check takes precedence over the
    // single-valid-unit path below.
    const mixedCandidates = candidateHeaders.filter((i) => {
        if (validHeaders.includes(i)) return false;
        const end = findEOrdenUnitEnd(lines, i, lineCount);
        const sepIndex = end.sepIndex;
        if (sepIndex === -1) return false;
        const bodyEnd = sepIndex;
        return lines.slice(i + 1, bodyEnd).some((l) => isPresaludRecordLine(l));
    });
    if (mixedCandidates.length >= 1) {
        return blockedWholeImportEnvelope(
            rawInput,
            lines,
            SOURCE_UNKNOWN,
            BLOCK_MIXED_NO_UNIQUE_PARTITION,
            'Input mixes e-Orden text with a PreSalud record-shaped line ' +
            'inside an e-Orden span; no unique structural partition exists.'
        );
    }

    const recognizedUnits = [];
    const unknownFragments = [];

    // ── single valid e-Orden unit ────────────────────────────────────────────
    // (mixedCandidates.length >= 1 already returned above.)
    let eoStart = -1;
    let eoEnd = -1; // exclusive
    if (headerLines.length === 1) {
        const eoHeader = headerLines[0];
        const { sepIndex, scanEnd } = findEOrdenUnitEnd(lines, eoHeader, lineCount);
        const spanEnd = scanEnd;
        const bodyEnd = sepIndex === -1 ? scanEnd : sepIndex;
        const body = lines.slice(eoHeader + 1, bodyEnd);
        const bodyClean = isEOrdenBodyClean(body);

        // A PreSalud record-shaped line inside the e-Orden span makes source
        // ownership ambiguous: it could be e-Orden body content or an
        // independent PreSalud paste. No unique partition exists (D4/D13).
        let recordInside = false;
        for (let j = eoHeader + 1; j < bodyEnd; j += 1) {
            if (isPresaludRecordLine(lines[j])) {
                recordInside = true;
                break;
            }
        }

        if (bodyClean && sepIndex !== -1) {
            // Valid D17 e-Orden unit.
            eoStart = eoHeader;
            eoEnd = spanEnd;
            recognizedUnits.push(eOrdenUnitItem(lines, eoStart, eoEnd));
        } else if (sepIndex !== -1 && recordInside) {
            // Defensive (already handled by mixedCandidates): dirty body caused
            // by a PreSalud-shaped line → whole import blocked.
            return blockedWholeImportEnvelope(
                rawInput,
                lines,
                SOURCE_UNKNOWN,
                BLOCK_MIXED_NO_UNIQUE_PARTITION,
                'Input mixes e-Orden text with a PreSalud record-shaped line ' +
                'inside the e-Orden span; no unique structural partition exists.'
            );
        } else {
            // Header present but the block is not a valid e-Orden unit (no
            // separator, or body contains non-contractual junk). The header
            // line cannot be claimed by any grammar and is left to the
            // ordinary line scanner below: it has no `;`, so it is classified
            // as unknown text and NEVER swallows subsequent record-shaped
            // lines (they are scanned independently after it).
            eoStart = -1;
            eoEnd = -1;
        }
    }

    // ── scan remaining regions (PreSalud / unknown) ─────────────────────────
    const remainingRanges = [];
    if (eoStart === -1) {
        remainingRanges.push([0, lineCount]);
    } else {
        if (eoStart > 0) remainingRanges.push([0, eoStart]);
        if (eoEnd < lineCount) remainingRanges.push([eoEnd, lineCount]);
    }

    const allRuns = [];
    let totalRecordLines = 0;
    for (const [rangeStart, rangeEnd] of remainingRanges) {
        const runs = splitRuns(lines, rangeStart, rangeEnd);
        for (const run of runs) {
            allRuns.push(run);
            if (run.cls === 'prs') totalRecordLines += run.end - run.start;
        }
    }

    // Multi-record rule (D9): when the input carries more than one PreSalud
    // record line, every record-shaped run is deterministically blocked with
    // `PRESALUD_MULTI_RECORD_UNSUPPORTED_V0` (raw preserved, zero proposals,
    // apply blocked). An independent e-Orden unit of the same input stays
    // intact (proportional blocking, D13). Blank/separator lines between runs
    // carry no content; unknown runs between blocked runs surface as
    // fragments with safe boundaries — nothing is guessed.
    const hasEOrden = recognizedUnits.some((u) => u.source === SOURCE_EORDEN);
    if (totalRecordLines >= 2) {
        // Replace every prs run with a blocked unit (contiguous record lines).
        const prsRuns = allRuns.filter((r) => r.cls === 'prs');
        const blockedRuns = prsRuns.map((run) =>
            blockedUnitItem(
                lines,
                run.start,
                run.end,
                SOURCE_PRESALUD,
                'PreSalud input contains more than one record; multi-record ' +
                'composition is NOT_SUPPORTED_V0 (D9). Raw preserved; zero ' +
                'proposals; apply blocked.'
            )
        );

        if (hasEOrden) {
            // Proportional blocking: recognized e-Orden unit stays intact;
            // every PreSalud record run is a blocked unit; unknown runs stay
            // isolated fragments (never dropped, never guessed).
            const fragItems = [];
            for (const run of allRuns) {
                if (run.cls === 'unk') {
                    fragItems.push(unknownFragmentItem(lines, run.start, run.end));
                }
            }
            unknownFragments.length = 0;
            for (const f of fragItems) unknownFragments.push(f);
            const allItems = [...recognizedUnits, ...blockedRuns];
            allItems.sort((a, b) => a.start_line - b.start_line);
            recognizedUnits.length = 0;
            for (const u of allItems) recognizedUnits.push(u);
            return resultEnvelope(
                rawInput,
                lines,
                recognizedUnits,
                unknownFragments,
                [BLOCK_MULTI_RECORD_PRESALUD]
            );
        }

        // Pure PreSalud multi-record (no independent source): whole import
        // blocked deterministically with zero proposals; raw preserved.
        const wholeBlock = blockedWholeImportEnvelope(
            rawInput,
            lines,
            SOURCE_PRESALUD,
            BLOCK_MULTI_RECORD_PRESALUD,
            'PreSalud input contains more than one record; multi-record ' +
            'composition is NOT_SUPPORTED_V0 (D9). Whole import blocked with ' +
            'zero proposals; raw preserved.'
        );
        wholeBlock.blocking_reason =
            'PRESALUD_MULTI_RECORD_UNSUPPORTED_V0: PreSalud input contains ' +
            'more than one record; multi-record composition is NOT_SUPPORTED_V0 ' +
            '(D9). Whole import blocked with zero proposals; raw preserved.';
        return wholeBlock;
    }

    // ── per-run classification (single record or none) ──────────────────────
    let prsRunSeen = false;
    for (const run of allRuns) {
        if (run.cls === 'prs') {
            if (prsRunSeen) {
                // Two independent single-record regions (defensive; only
                // reachable if a record line was miscounted above).
                unknownFragments.push(unknownFragmentItem(lines, run.start, run.end));
                continue;
            }
            prsRunSeen = true;
            recognizedUnits.push(presaludUnitItem(lines, run.start, run.end));
        } else {
            unknownFragments.push(unknownFragmentItem(lines, run.start, run.end));
        }
    }

    return resultEnvelope(rawInput, lines, recognizedUnits, unknownFragments);
}

/**
 * Build a whole-import blocked envelope with a single blocked unit spanning
 * the full working text (lossless by construction).
 * @param {string} rawInput
 * @param {string[]} lines
 * @param {string} source
 * @param {string} code
 * @param {string} reason
 * @returns {Object}
 */
function blockedWholeImportEnvelope(rawInput, lines, source, code, reason) {
    const blocked = blockedUnitItem(lines, 0, lines.length, source, reason);
    blocked.blocking_reason = `${code}: ${reason}`;
    return {
        raw_input: rawInput,
        detected_sources: [],
        recognized_units: [blocked],
        unrecognized_fragments: [],
        concepts: [],
        contributions: [],
        warnings: [],
        errors: [],
        blocking_states: [code],
        can_preview: true,
        can_apply: false,
    };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * WO-B pure entry point (D3 envelope). Never throws: unexpected failures are
 * returned as a PARSER_ERROR-shaped envelope preserving the raw input.
 * @param {string} rawInput
 * @returns {Object}
 */
export function segmentClinicalIntake(rawInput) {
    if (typeof rawInput !== 'string') {
        return parserErrorEnvelope(
            String(rawInput),
            'SEGMENTER_INPUT_NOT_TEXT',
            'segmentClinicalIntake expects a string raw input.'
        );
    }
    try {
        return runSegmentation(rawInput);
    } catch (err) {
        return parserErrorEnvelope(
            rawInput,
            'SEGMENTER_INTERNAL_ERROR',
            err instanceof Error ? err.message : String(err)
        );
    }
}

/**
 * Alias of segmentClinicalIntake (readability for consumers).
 * @param {string} rawInput
 * @returns {Object}
 */
export function segmentRawInput(rawInput) {
    return segmentClinicalIntake(rawInput);
}
