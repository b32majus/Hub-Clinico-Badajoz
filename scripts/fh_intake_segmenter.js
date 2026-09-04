
/**
 * WO-B (issue #294) — Pure clinical intake detector/segmenter.
 *
 * Partitions raw pasted text into delimited source units using ONLY structural
 * grammar (no DOM, no side effects, no field-content parsing, no concept
 * extraction, no hydration, no patient association, no fuzzy recovery).
 *
 * Structural grammars (normative contracts, spec D17 / D9):
 *   - e-Orden unit : D17 serialization: exact header line
 *       `SOLICITUD DERMATOLOGÍA → FARMACIA - <título>` followed by ONE opening
 *       `═` separator block (U+2550) and body lines that are blank, `•` bullet,
 *       `PROGRAMA SES`, or `- ` continuation. There is NO closing separator;
 *       the unit runs from the exact header through the final `• Denominación:`
 *       line. Body lines must be blank, `•` bullet, `PROGRAMA SES`, or
 *       `- ` continuation (opening separator is outside the body).
 *   - PreSalud unit : D9 serialization: a contiguous run of lines, each a
 *       single `Estado;Medicamento;Vía;Dosis;Pauta;Días` record — exactly six
 *       `;`-delimited fields; `Estado` (field 1) and `Días` (field 6) may be
 *       empty (WO-D `NO_VALUE` semantics); fields 2..5 must be non-empty and
 *       free of stray `;`. One record = one unit (V0). PreSalud never
 *       appears as an inline fragment inside another source. T2 does NOT
 *       validate medication subgrammar (parentheses) nor multi-record policy;
 *       structurally identifiable PreSalud material must reach T4.
 *
 * Safety rules (see D3/D4/D13 and the ticket's invariants):
 *   - The partition is structural only; membership must be unique or the
 *     result is blocked — never guessed.
 *   - Source order is irrelevant: e-Orden-before-PreSalud and PreSalud-before-
 *     e-Orden are both valid when the partition is unique (D4).
 *   - Two e-Orden units in one input are never partitionable (D17 gives no
 *     safe boundary rule) → whole import `SEGMENTATION_BLOCKED`.
 *   - An e-Orden header whose block is not a valid D17 unit (no opening `═`
 *     separator, or body with non-contractual content) cannot be claimed by
 *     any grammar: the region stays an unknown fragment. A PreSalud
 *     record-shaped line inside an e-Orden body span makes source ownership
 *     ambiguous → whole import `SEGMENTATION_BLOCKED` (mixed input without
 *     unique partition, D13).
 *   - Unknown text is NEVER dropped or misclassified: it surfaces as an
 *     `unknown` fragment with safe boundaries (D4).
 *   - T2 owns source-boundary ambiguity only; multi-record and medication
 *     subgrammar adjudication belong to T4.
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
// Exact D17 header grammar: `SOLICITUD DERMATOLOGÍA → FARMACIA - <TÍTULO>`
// Title after " - " must be non-empty (after NFC + trim). No prefix lookalikes.
const EORDEN_HEADER_RE = /^SOLICITUD DERMATOLOGÍA → FARMACIA - .+$/;
const LINE_IS_SEPARATOR_RE = /^[ \t]*═+[ \t]*$/;
const CONTINUATION_LINE_RE = /^-[ \t]/;

const PRESALUD_FIELDS = 6;

const TRAILING_WS_RE = /[ \t\u00A0]+$/;

// ─── Transport normalization (D17): comparison only; raw is never rewritten ──

function toNFC(str) {
    return typeof str.normalize === 'function' ? str.normalize('NFC') : str;
}

/**
 * Classification-only view of a line (no terminator, no trailing/peripheral
 * whitespace). Used for structural decisions; never stored. NFC-normalized
 * for comparison only; raw is preserved byte-exact.
 * @param {string} line
 * @returns {string}
 */
function cleanLine(line) {
    return toNFC(line).replace(TRAILING_WS_RE, '').trim();
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
 * T2 does NOT validate medication subgrammar (parentheses) — that belongs to T4.
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
    return true;
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
 * e-Orden unit (`•` bullet, `PROGRAMA SES`, `- ` continuation). Separator
 * lines are NOT allowed inside the body (only the single opening separator
 * before the body). Blank lines are allowed (transport).
 * @param {string[]} bodyLines lines after the opening separator
 * @returns {boolean}
 */
function isEOrdenBodyClean(bodyLines) {
    for (const line of bodyLines) {
        const c = cleanLine(line);
        if (c === '') continue;
        if (c.startsWith(EORDEN_BULLET)) continue;
        if (c === EORDEN_SES_SECTION_LINE) continue;
        if (CONTINUATION_LINE_RE.test(c)) continue;
        return false;
    }
    return true;
}

// ─── Raw preservation helpers ────────────────────────────────────────────────

/**
 * Split rawInput into lines while preserving original byte offsets for
 * lossless raw slicing (CRLF/LF/CR preserved exactly).
 * @param {string} raw
 * @returns {{lines:string[], starts:number[], ends:number[]}}
 */
function splitLinesWithOffsets(raw) {
    const lines = [];
    const starts = [];
    const ends = [];
    const re = /\r\n|\n|\r/g;
    let last = 0;
    let m;
    while ((m = re.exec(raw)) !== null) {
        lines.push(raw.slice(last, m.index));
        starts.push(last);
        ends.push(m.index);
        last = m.index + m[0].length;
    }
    lines.push(raw.slice(last));
    starts.push(last);
    ends.push(raw.length);
    return { lines, starts, ends };
}

/**
 * Exact raw slice for line range [start, end) using original offsets.
 * Includes original CRLF/LF bytes between lines, no normalization.
 * @param {number[]} starts
 * @param {number[]} ends
 * @param {string} raw
 * @param {number} start
 * @param {number} end
 * @returns {string}
 */
function sliceRawByOffsets(raw, starts, ends, start, end) {
    if (start >= end) return '';
    return raw.slice(starts[start], ends[end - 1]);
}

// ─── Item builders (pure, deterministic) ─────────────────────────────────────

function eOrdenUnitItem(raw, starts, ends, lines, start, end) {
    const unitLines = lines.slice(start, end);
    return {
        kind: KIND_EORDEN_UNIT,
        source: SOURCE_EORDEN,
        state: UNIT_STATE_RECOGNIZED,
        raw: sliceRawByOffsets(raw, starts, ends, start, end),
        structural_type: 'e-orden',
        recognized_fields: countEOrdenFieldLines(unitLines),
        start_line: start,
        end_line: end,
        unit_index: -1,
        can_preview: true,
        preview_blocked: false,
    };
}

function presaludUnitItem(raw, starts, ends, lines, start, end) {
    const recordLines = lines.slice(start, end);
    return {
        kind: KIND_PRESALUD_UNIT,
        source: SOURCE_PRESALUD,
        state: UNIT_STATE_RECOGNIZED,
        raw: sliceRawByOffsets(raw, starts, ends, start, end),
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

function unknownFragmentItem(raw, starts, ends, start, end) {
    return {
        kind: KIND_UNKNOWN_FRAGMENT,
        source: SOURCE_UNKNOWN,
        state: UNIT_STATE_RECOGNIZED,
        raw: sliceRawByOffsets(raw, starts, ends, start, end),
        structural_type: 'unknown',
        recognized_fields: {},
        start_line: start,
        end_line: end,
        unit_index: -1,
        can_preview: true,
        preview_blocked: false,
    };
}

function blockedUnitItem(raw, starts, ends, start, end, source, reason) {
    return {
        kind: KIND_BLOCKED_UNIT,
        source,
        state: UNIT_STATE_SEGMENTATION_BLOCKED,
        raw: sliceRawByOffsets(raw, starts, ends, start, end),
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

function validateLossless(raw, lines, starts, ends, recognizedUnits, unknownFragments) {
    const all = [...recognizedUnits, ...unknownFragments].sort(
        (a, b) => a.start_line - b.start_line || a.end_line - b.end_line
    );

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

    for (const item of all) {
        const expected = sliceRawByOffsets(raw, starts, ends, item.start_line, item.end_line);
        if (item.raw !== expected) {
            return { ok: false, reason: `item ${item.kind} raw not byte-exact` };
        }
    }
    return { ok: true, reason: '' };
}

function isSkippableLine(line) {
    const c = cleanLine(line);
    return c === '' || LINE_IS_SEPARATOR_RE.test(c);
}

function resultEnvelope(rawInput, lines, starts, ends, recognizedUnits, unknownFragments, blockingStates = [], warnings = []) {
    const validation = validateLossless(rawInput, lines, starts, ends, recognizedUnits, unknownFragments);
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
        // PreSalud: one record = one unit, so each prs line is its own run
        if (cls === 'prs') {
            runs.push({ start: runStart, end: runStart + 1, cls });
            i = runStart + 1;
            continue;
        }
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

// ─── Core segmentation ───────────────────────────────────────────────────────

function runSegmentation(rawInput) {
    const { lines, starts, ends } = splitLinesWithOffsets(rawInput);
    const lineCount = lines.length;

    // Empty check: all lines are blank after NFC+trim (D3: valid empty result)
    let hasSemantic = false;
    for (const l of lines) {
        if (cleanLine(l) !== '' && !LINE_IS_SEPARATOR_RE.test(cleanLine(l))) {
            // Check if there's any non-skippable content? Actually empty is all skippable.
            // We consider semantic if any line is not skippable OR is a record/header candidate?
            // Simpler: if any line has cleanLine !== '' then not empty.
            // But separator-only lines alone are skippable and should be considered empty.
            // So check if any line is not skippable.
            hasSemantic = true;
            break;
        }
        // Even if line is separator-only, that's skippable -> still empty
        // Only if cleanLine !== '' and not separator would be semantic, but we already checked
        // Actually we need to see if any line has content that is not blank/separator
        // The loop above already: if cleanLine === '' or separator => skip, otherwise semantic.
    }
    // More precise: determine if all lines are skippable (blank or separator)
    let allSkippable = true;
    for (const l of lines) {
        if (!isSkippableLine(l)) {
            // Has semantic line, but need to also ensure not all lines are empty?
            // If there's at least one non-skippable line, not empty.
            allSkippable = false;
            break;
        }
    }
    // Also handle case where raw is empty string: lines = [''] -> skippable true
    if (allSkippable) {
        // Check if raw trimmed is empty (including separators considered empty for emptyEnvelope)
        // Spec: empty input valid. Separator-only input with no semantic should be empty as well.
        // But we treat separator-only as empty for now (no units).
        // Verify: if raw contains only separators/blanks, return empty envelope preserving raw.
        return emptyEnvelope(rawInput);
    }

    // Find header candidates using exact D17 header grammar (NFC-normalized cleanLine)
    const candidateHeaders = [];
    for (let i = 0; i < lineCount; i += 1) {
        const c = cleanLine(lines[i]);
        if (c !== '' && EORDEN_HEADER_RE.test(c)) {
            candidateHeaders.push(i);
        }
    }

    // Helper to find next header index after given index
    function nextHeaderAfter(idx) {
        for (const h of candidateHeaders) {
            if (h > idx) return h;
        }
        return lineCount;
    }

    // Helper to find next separator after opening (for closing detection, not included)
    function nextSeparatorAfter(idx) {
        for (let j = idx + 1; j < lineCount; j += 1) {
            if (isSeparatorOnlyLine(lines[j])) return j;
            if (candidateHeaders.includes(j)) return j;
        }
        return lineCount;
    }

    // Determine valid e-Orden units: must have opening separator immediately after header,
    // body clean (no separator inside body), non-empty body. ScanEnd is first non-allowed line
    // after opening (blank/bullet/PROGRAMA SES/continuation allowed). Record inside body makes
    // ownership ambiguous only when interleaved (record between bullets), not when record is a
    // separate unit after a clear boundary.
    const validHeaders = [];
    const headerSpan = new Map(); // headerIdx -> {scanEnd, blockEnd, valid, recordInsideBlock, interleaved}
    for (const h of candidateHeaders) {
        const nextH = nextHeaderAfter(h);
        const openingSep = h + 1 < lineCount && isSeparatorOnlyLine(lines[h + 1]);
        if (!openingSep) {
            const scanEnd = nextH;
            headerSpan.set(h, { scanEnd, blockEnd: nextH, valid: false, recordInsideBlock: false, interleaved: false, openingSep: false });
            continue;
        }
        let scanEndValid = h + 2;
        while (scanEndValid < lineCount) {
            if (candidateHeaders.includes(scanEndValid)) break;
            if (isSeparatorOnlyLine(lines[scanEndValid])) break;
            const c = cleanLine(lines[scanEndValid]);
            if (c === '') { scanEndValid += 1; continue; }
            if (c.startsWith(EORDEN_BULLET) || c === EORDEN_SES_SECTION_LINE || CONTINUATION_LINE_RE.test(c)) { scanEndValid += 1; continue; }
            break;
        }
        const blockEnd = nextH;
        const bodyValid = lines.slice(h + 2, scanEndValid);
        const bodyClean = bodyValid.length > 0 ? isEOrdenBodyClean(bodyValid) : false;
        const blockSlice = lines.slice(h + 2, blockEnd);
        const recordInsideBlock = blockSlice.some((l) => isPresaludRecordLine(l));
        let interleaved = false;
        for (let idx = 0; idx < blockSlice.length; idx += 1) {
            if (isPresaludRecordLine(blockSlice[idx])) {
                for (let j = idx + 1; j < blockSlice.length; j += 1) {
                    const cj = cleanLine(blockSlice[j]);
                    if (cj === '' || isSeparatorOnlyLine(blockSlice[j])) continue;
                    if (cj.startsWith(EORDEN_BULLET) || cj === EORDEN_SES_SECTION_LINE) { interleaved = true; break; }
                    break;
                }
                if (interleaved) break;
            }
        }
        const finalValid = openingSep && bodyClean && !interleaved;
        headerSpan.set(h, { scanEnd: scanEndValid, blockEnd, valid: finalValid, recordInsideBlock, interleaved, openingSep });
        if (finalValid) validHeaders.push(h);
    }

    // Rule D17/D13: two or more VALID e-Orden units are never partitionable.
    if (validHeaders.length >= 2) {
        return blockedWholeImportEnvelope(
            rawInput,
            lines,
            starts,
            ends,
            SOURCE_EORDEN,
            BLOCK_MULTI_EORDEN,
            'Two or more e-Orden units detected in one raw input; D17/D13 ' +
            'provide no safe partition for multiple e-Orden units.'
        );
    }

    // Mixed-input candidates: interleaved record inside e-Orden block (record between bullets)
    const mixedCandidates = candidateHeaders.filter((h) => {
        if (validHeaders.includes(h)) return false;
        const span = headerSpan.get(h);
        if (!span || !span.openingSep) return false;
        return span.interleaved;
    });
    if (mixedCandidates.length >= 1) {
        return blockedWholeImportEnvelope(
            rawInput,
            lines,
            starts,
            ends,
            SOURCE_UNKNOWN,
            BLOCK_MIXED_NO_UNIQUE_PARTITION,
            'Input mixes e-Orden text with a PreSalud record-shaped line ' +
            'inside an e-Orden span; no unique structural partition exists.'
        );
    }

    const recognizedUnits = [];
    const unknownFragments = [];

    let eoStart = -1;
    let eoEnd = -1;
    if (validHeaders.length === 1) {
        const eh = validHeaders[0];
        const span = headerSpan.get(eh);
        eoStart = eh;
        eoEnd = span.scanEnd;
        recognizedUnits.push(eOrdenUnitItem(rawInput, starts, ends, lines, eoStart, eoEnd));
    } else if (candidateHeaders.length === 1 && validHeaders.length === 0) {
        // Single invalid header: check if it recordInside already handled as mixed (blocked whole import)
        // Otherwise it will be treated as unknown via remainingRanges scanning; do not create eo unit.
        eoStart = -1;
        eoEnd = -1;
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
    for (const [rangeStart, rangeEnd] of remainingRanges) {
        const runs = splitRuns(lines, rangeStart, rangeEnd);
        for (const run of runs) {
            allRuns.push(run);
        }
    }

    // Per-run classification: each contiguous prs run is a PreSalud unit (T2 does NOT block multi-record).
    // Each unk run is an unknown fragment. No multi-record adjudication in T2.
    for (const run of allRuns) {
        if (run.cls === 'prs') {
            recognizedUnits.push(presaludUnitItem(rawInput, starts, ends, lines, run.start, run.end));
        } else {
            unknownFragments.push(unknownFragmentItem(rawInput, starts, ends, run.start, run.end));
        }
    }

    return resultEnvelope(rawInput, lines, starts, ends, recognizedUnits, unknownFragments);
}

function blockedWholeImportEnvelope(rawInput, lines, starts, ends, source, code, reason) {
    const blocked = blockedUnitItem(rawInput, starts, ends, 0, lines.length, source, reason);
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

export function segmentRawInput(rawInput) {
    return segmentClinicalIntake(rawInput);
}
