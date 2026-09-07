/**
 * WO-E1 (issue #297, T5) — Single pure intake pipeline + shared semantic
 * reconciliation (Seam 1 composition).
 *
 * Composes the READ-ONLY predecessors without modifying them:
 *   raw input
 *   -> T2 segmenter (scripts/fh_intake_segmenter.js)
 *   -> T3 DermaEOrdenParser (scripts/fh_eorden_parser.js)
 *      + T4 PreSaludParser (scripts/fh_presalud_parser.js)
 *   -> shared semantic layer
 *   -> reconciled structured result
 *
 * Pure, deterministic, side-effect free: no DOM, no UI, no gates, no apply,
 * no persistence, no CIMA/catalogue, no precedence, no first/last wins,
 * no automatic winner. `can_apply` is ALWAYS false. Requested-treatment
 * semantics only (REQUESTED_TREATMENT, never VALIDATED_TREATMENT).
 *
 * D6 closed matrix (two independent axes + separate origin/resolution signals):
 *   comparison_status: EQUIVALENT | DIFFERENT | NOT_COMPARABLE |
 *                      NOT_APPLICABLE (CLOSED — Repair B #304).
 *   proposal_status:   AUTO_PROPOSABLE | REQUIRES_SELECTION | NO_PROPOSAL
 *   origin:            ONLY_EORDEN | ONLY_PRESALUD | BOTH | NONE — lives in
 *                      its own field, NEVER encoded into comparison_status.
 *   resolution/display:CORROBORATED (EQUIVALENT) | CONFLICT (DIFFERENT) |
 *                      MULTIPLE_SOURCE_VALUES (same-source multiplicity
 *                      reason, always paired with REQUIRES_SELECTION) |
 *                      otherwise echoes comparison_status / origin.
 *
 * Rules:
 * - A. single usable value + exact target + empty current -> AUTO_PROPOSABLE
 *      with comparison_status NOT_APPLICABLE (no comparison peer) and
 *      origin ONLY_EORDEN / ONLY_PRESALUD.
 * - B. explicitly equivalent values across sources (authorized normalization:
 *      NFC + peripheral trim only; case/accent-sensitive, no fuzzy) ->
 *      EQUIVALENT / CORROBORATED.
 * - C. comparable-and-different across sources sharing one exact target ->
 *      DIFFERENT / CONFLICT / REQUIRES_SELECTION scoped to that concept's
 *      target only; value is null (no winner), rivals preserved.
 * - D. structurally distinct concepts are never rivals: reconciliation only
 *      ever compares contributions sharing one concept key. PreSalud
 *      `principio_activo_raw` (provenance-only, target NONE) never meets
 *      `commercial_name`; it stays NOT_COMPARABLE (structural) / NO_PROPOSAL
 *      and no CONFLICT is produced from it.
 * - E. concepts with no usable contribution (provenance-only / gate material /
 *      NO_VALUE) -> NOT_APPLICABLE / NO_PROPOSAL, raw preserved.
 * - F. two or more distinct usable values from one source inside one safe
 *      unit -> comparison NOT_COMPARABLE + REQUIRES_SELECTION with resolution
 *      MULTIPLE_SOURCE_VALUES; never first/last wins. PreSalud V0 never
 *      reaches F across records: contiguous multi-record is blocked by T4
 *      (MULTI_RECORD_UNSUPPORTED_V0, zero contributions) and separated
 *      PreSalud regions are blocked here at pipeline level (same code, zero
 *      usable PreSalud proposals, no cross-record choices).
 * - Single-source usable concept -> origin ONLY_EORDEN / ONLY_PRESALUD with
 *      comparison_status NOT_APPLICABLE.
 * - Proportional lifecycle: a unit whose parser reports a blocking state
 *      (e.g. invalid SES program) contributes zero usable values — its raw
 *      and reason are preserved and surfaced — while independent valid units
 *      reconcile normally.
 * - Every contribution keeps its predecessor provenance verbatim.
 */

import { segmentClinicalIntake } from './fh_intake_segmenter.js';
import { parseDermaEOrdenUnit } from './fh_eorden_parser.js';
import { parsePreSaludUnit, BLOCK_MULTI_RECORD_UNSUPPORTED } from './fh_presalud_parser.js';

export const SOURCE_EORDEN = 'e-orden';
export const SOURCE_PRESALUD = 'pre-salud';

export const COMPARISON_EQUIVALENT = 'EQUIVALENT';
export const COMPARISON_DIFFERENT = 'DIFFERENT';
export const COMPARISON_NOT_COMPARABLE = 'NOT_COMPARABLE';
export const COMPARISON_NOT_APPLICABLE = 'NOT_APPLICABLE';
// Legacy comparison-slot aliases (Repair B #304): origin and multiplicity no
// longer extend comparison_status. Kept exported so existing importers keep
// resolving; the pipeline NEVER emits them as comparison_status.
export const COMPARISON_ONLY_EORDEN = 'ONLY_EORDEN';
export const COMPARISON_ONLY_PRESALUD = 'ONLY_PRESALUD';
export const COMPARISON_MULTIPLE_SOURCE_VALUES = 'MULTIPLE_SOURCE_VALUES';

export const ORIGIN_ONLY_EORDEN = 'ONLY_EORDEN';
export const ORIGIN_ONLY_PRESALUD = 'ONLY_PRESALUD';
export const ORIGIN_BOTH = 'BOTH';
export const ORIGIN_NONE = 'NONE';

export const RESOLUTION_CORROBORATED = 'CORROBORATED';
export const RESOLUTION_CONFLICT = 'CONFLICT';
export const RESOLUTION_MULTIPLE_SOURCE_VALUES = 'MULTIPLE_SOURCE_VALUES';

export const PROPOSAL_AUTO_PROPOSABLE = 'AUTO_PROPOSABLE';
export const PROPOSAL_REQUIRES_SELECTION = 'REQUIRES_SELECTION';
export const PROPOSAL_NO_PROPOSAL = 'NO_PROPOSAL';

export const SEMANTICS_REQUESTED_TREATMENT = 'REQUESTED_TREATMENT';

/** Authorized comparison normalization: NFC + peripheral trim only. */
function normalizeValue(value) {
    if (value !== null && typeof value === 'object') {
        const code = typeof value.code === 'string' ? value.code.normalize('NFC').trim() : value.code ?? '';
        const label = typeof value.label === 'string' ? value.label.normalize('NFC').trim() : value.label ?? '';
        return `${code}||${label}`;
    }
    if (typeof value !== 'string') return value;
    return (typeof value.normalize === 'function' ? value.normalize('NFC') : value).trim();
}

function isUsableContribution(contribution) {
    if (!contribution || typeof contribution !== 'object') return false;
    if (contribution.proposal_status !== PROPOSAL_AUTO_PROPOSABLE) return false;
    if (contribution.target === 'NONE' || contribution.target == null) return false;
    if (contribution.semantic_status !== 'RECOGNIZED') return false;
    const value = contribution.value;
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return true;
}

function unitSesBlocked(parserResult) {
    if (!parserResult || typeof parserResult !== 'object') return false;
    if (Array.isArray(parserResult.blocking_states) && parserResult.blocking_states.some((s) => typeof s === 'string' && s.startsWith('SES_'))) return true;
    if (Array.isArray(parserResult.contributions) && parserResult.contributions.some((c) => c?.concept === 'ses_program' && c?.blocking === true)) return true;
    return false;
}

function originOf(contributions) {
    const sources = new Set(contributions.map((c) => c?.provenance?.source ?? c?.source ?? 'unknown'));
    if (sources.size >= 2) return ORIGIN_BOTH;
    if (sources.has(SOURCE_PRESALUD)) return ORIGIN_ONLY_PRESALUD;
    if (sources.has(SOURCE_EORDEN)) return ORIGIN_ONLY_EORDEN;
    return ORIGIN_NONE;
}

function reconcileConcept(concept, allContributions, currentFormValues) {
    const usable = allContributions.filter(isUsableContribution);
    const exactTargets = [...new Set(allContributions.map((c) => c?.target).filter((t) => t != null && t !== 'NONE'))];
    let target = 'NONE';
    if (exactTargets.length >= 1) target = exactTargets[0];
    const base = { concept, target, contributions: allContributions };

    if (usable.length === 0) {
        // D10 structural case: principio_activo_raw is provenance-only but its
        // structural relation is NOT_COMPARABLE (never a rival of
        // commercial_name, never a false CONFLICT, never classified).
        if (concept === 'principio_activo_raw') {
            return {
                ...base,
                comparison_status: COMPARISON_NOT_COMPARABLE,
                proposal_status: PROPOSAL_NO_PROPOSAL,
                resolution: COMPARISON_NOT_COMPARABLE,
                display: COMPARISON_NOT_COMPARABLE,
                origin: originOf(allContributions),
                value: null,
                candidates: [],
            };
        }
        return {
            ...base,
            comparison_status: COMPARISON_NOT_APPLICABLE,
            proposal_status: PROPOSAL_NO_PROPOSAL,
            resolution: COMPARISON_NOT_APPLICABLE,
            display: COMPARISON_NOT_APPLICABLE,
            origin: originOf(allContributions),
            value: null,
            candidates: [],
        };
    }

    if (usable.length === 1) {
        const single = usable[0];
        const originSource = single?.provenance?.source ?? single?.source ?? null;
        const origin = originSource === SOURCE_PRESALUD ? ORIGIN_ONLY_PRESALUD : ORIGIN_ONLY_EORDEN;
        const currentRaw = currentFormValues?.[target];
        const currentEmpty = currentRaw === undefined || currentRaw === null || String(currentRaw).trim() === '';
        const matchesCurrent = !currentEmpty && normalizeValue(currentRaw) === normalizeValue(single.value);
        const proposal = (currentEmpty || matchesCurrent) ? PROPOSAL_AUTO_PROPOSABLE : PROPOSAL_REQUIRES_SELECTION;
        return {
            ...base,
            comparison_status: COMPARISON_NOT_APPLICABLE,
            proposal_status: proposal,
            resolution: origin,
            display: origin,
            origin,
            value: single.value,
            candidates: [single.value],
        };
    }

    const distinct = [...new Map(usable.map((c) => [normalizeValue(c.value), c.value])).entries()];
    const distinctKeys = distinct.map(([key]) => key);
    const sources = new Set(usable.map((c) => c?.provenance?.source ?? c?.source ?? 'unknown'));
    const origin = originOf(usable);
    const currentRaw = currentFormValues?.[target];
    const currentEmpty = currentRaw === undefined || currentRaw === null || String(currentRaw).trim() === '';

    if (distinctKeys.length === 1) {
        if (sources.size >= 2) {
            return {
                ...base,
                comparison_status: COMPARISON_EQUIVALENT,
                proposal_status: currentEmpty ? PROPOSAL_AUTO_PROPOSABLE : PROPOSAL_REQUIRES_SELECTION,
                resolution: RESOLUTION_CORROBORATED,
                display: RESOLUTION_CORROBORATED,
                origin: ORIGIN_BOTH,
                value: distinct[0][1],
                candidates: [distinct[0][1]],
            };
        }
        return {
            ...base,
            comparison_status: COMPARISON_NOT_COMPARABLE,
            proposal_status: PROPOSAL_REQUIRES_SELECTION,
            resolution: RESOLUTION_MULTIPLE_SOURCE_VALUES,
            display: RESOLUTION_MULTIPLE_SOURCE_VALUES,
            origin,
            value: null,
            candidates: [distinct[0][1]],
        };
    }

    // Two or more distinct usable values.
    if (sources.size >= 2 && exactTargets.length === 1) {
        return {
            ...base,
            comparison_status: COMPARISON_DIFFERENT,
            proposal_status: PROPOSAL_REQUIRES_SELECTION,
            resolution: RESOLUTION_CONFLICT,
            display: RESOLUTION_CONFLICT,
            origin: ORIGIN_BOTH,
            value: null,
            candidates: distinct.map(([, value]) => value),
        };
    }
    return {
        ...base,
        comparison_status: COMPARISON_NOT_COMPARABLE,
        proposal_status: PROPOSAL_REQUIRES_SELECTION,
        resolution: RESOLUTION_MULTIPLE_SOURCE_VALUES,
        display: RESOLUTION_MULTIPLE_SOURCE_VALUES,
        origin,
        value: null,
        candidates: distinct.map(([, value]) => value),
    };
}

/**
 * Run the single pure intake pipeline over one raw pasted input.
 * @param {string} rawInput
 * @param {{ currentFormValues?: Record<string, string> }} [options]
 */
export function runUnifiedIntake(rawInput, options = {}) {
    const currentFormValues = options?.currentFormValues ?? {};
    if (typeof rawInput !== 'string') {
        return {
            raw_input: String(rawInput),
            detected_sources: [],
            recognized_units: [],
            unrecognized_fragments: [],
            units: [],
            reconciled: { concepts: {} },
            warnings: [],
            errors: [{ code: 'INTAKE_INPUT_NOT_TEXT', message: 'runUnifiedIntake expects a string raw input.', blocking: true }],
            blocking_states: [],
            can_preview: true,
            can_apply: false,
            semantics: SEMANTICS_REQUESTED_TREATMENT,
        };
    }

    let segmentation;
    try {
        segmentation = segmentClinicalIntake(rawInput);
    } catch (err) {
        return {
            raw_input: rawInput,
            detected_sources: [],
            recognized_units: [],
            unrecognized_fragments: [],
            units: [],
            reconciled: { concepts: {} },
            warnings: [],
            errors: [{ code: 'INTAKE_SEGMENTER_INTERNAL_ERROR', message: err instanceof Error ? err.message : String(err), blocking: true }],
            blocking_states: [],
            can_preview: true,
            can_apply: false,
            semantics: SEMANTICS_REQUESTED_TREATMENT,
        };
    }

    const recognizedUnits = Array.isArray(segmentation.recognized_units) ? segmentation.recognized_units : [];
    const wholeImportBlocked = recognizedUnits.some((u) => u?.kind === 'blocked_unit' || u?.state === 'SEGMENTATION_BLOCKED');
    // Repair B #304 / D9-D14: V0 has no cross-record composition. Repair A
    // keeps CONTIGUOUS records in one presalud_unit so T4 blocks them with
    // MULTI_RECORD_UNSUPPORTED_V0, but SEPARATED PreSalud regions segment as
    // two or more presalud_units. Every such variant must fail closed here:
    // zero usable PreSalud proposals, no cross-record candidate choices.
    // An independent e-Orden unit keeps its own lifecycle (proportional).
    const presaludSeparatedMultiRecord = recognizedUnits.filter((u) => u?.kind === 'presalud_unit').length >= 2;

    const units = [];
    const warnings = [...(segmentation.warnings ?? [])];
    const errors = [...(segmentation.errors ?? [])];
    const blockingStates = [...(segmentation.blocking_states ?? [])];
    if (presaludSeparatedMultiRecord && !wholeImportBlocked) {
        if (!blockingStates.includes(BLOCK_MULTI_RECORD_UNSUPPORTED)) blockingStates.push(BLOCK_MULTI_RECORD_UNSUPPORTED);
        errors.push({ code: BLOCK_MULTI_RECORD_UNSUPPORTED, message: 'PreSalud input contains separated record regions; V0 does not support multi-record composition.', blocking: true });
    }

    if (wholeImportBlocked) {
        for (const unit of recognizedUnits) {
            units.push({ unit_index: unit?.unit_index ?? 0, source: unit?.source ?? 'unknown', kind: unit?.kind ?? 'blocked_unit', raw: unit?.raw ?? rawInput, parser: null, blocked: true, blocking_reason: unit?.blocking_reason ?? null });
        }
        return {
            raw_input: rawInput,
            detected_sources: [],
            recognized_units: recognizedUnits,
            unrecognized_fragments: Array.isArray(segmentation.unrecognized_fragments) ? segmentation.unrecognized_fragments : [],
            units,
            reconciled: { concepts: {} },
            warnings,
            errors,
            blocking_states: blockingStates,
            can_preview: true,
            can_apply: false,
            semantics: SEMANTICS_REQUESTED_TREATMENT,
        };
    }

    const byConcept = new Map();
    const pushContribution = (concept, contribution) => {
        if (concept === undefined || concept === null) return;
        if (!byConcept.has(concept)) byConcept.set(concept, []);
        byConcept.get(concept).push(contribution);
    };

    recognizedUnits.forEach((unit, index) => {
        let parser = null;
        try {
            if (unit?.kind === 'eorden_unit') parser = parseDermaEOrdenUnit(unit);
            else if (unit?.kind === 'presalud_unit') parser = parsePreSaludUnit(unit);
        } catch (err) {
            parser = {
                raw_input: unit?.raw ?? '',
                source: unit?.source ?? 'unknown',
                unit_state: 'PARSER_ERROR',
                contributions: [],
                unrecognized_fragments: [],
                warnings: [],
                errors: [{ code: 'INTAKE_PARSER_INTERNAL_ERROR', message: err instanceof Error ? err.message : String(err), blocking: true }],
                blocking_states: [],
                can_preview: true,
                can_apply: false,
            };
        }
            const sesBlocked = parser !== null && unitSesBlocked(parser);
            const presaludMultiBlocked = unit?.kind === 'presalud_unit' && presaludSeparatedMultiRecord;
            const blocked = sesBlocked || presaludMultiBlocked;
            let blockingReason = null;
            if (presaludMultiBlocked) blockingReason = BLOCK_MULTI_RECORD_UNSUPPORTED;
            else if (blocked) blockingReason = parser?.contributions?.find((c) => c?.concept === 'ses_program')?.reason ?? parser?.blocking_states?.[0] ?? null;
            units.push({
                unit_index: unit?.unit_index ?? index,
                source: unit?.source ?? 'unknown',
                kind: unit?.kind ?? 'unknown',
                raw: unit?.raw ?? '',
                parser,
                blocked,
                blocking_reason: blockingReason,
            });
        if (parser !== null) {
            for (const warning of parser.warnings ?? []) warnings.push(warning);
            for (const error of parser.errors ?? []) errors.push(error);
            for (const state of parser.blocking_states ?? []) {
                if (!blockingStates.includes(state)) blockingStates.push(state);
            }
            // A SES-blocked e-Orden unit keeps its raw/reason for preview but
            // contributes zero usable values; independent units are unaffected.
            if (!blocked) {
                for (const contribution of parser.contributions ?? []) {
                    pushContribution(contribution?.concept, { ...contribution, unit_index: unit?.unit_index ?? index });
                }
            } else {
                for (const contribution of parser.contributions ?? []) {
                    pushContribution(contribution?.concept, {
                        ...contribution,
                        unit_index: unit?.unit_index ?? index,
                        proposal_status: PROPOSAL_NO_PROPOSAL,
                        blocked_by_unit: true,
                    });
                }
            }
        }
    });

    const concepts = {};
    for (const [concept, contributions] of byConcept.entries()) {
        // SES-blocked units downgraded every contribution to NO_PROPOSAL; if a
        // concept's only contributions are blocked leftovers, keep it visible
        // as provenance-only rather than dropping it.
        const effective = contributions.some((c) => !c?.blocked_by_unit && isUsableContribution(c))
            ? contributions.filter((c) => !c?.blocked_by_unit)
            : contributions;
        concepts[concept] = reconcileConcept(concept, effective, currentFormValues);
    }

    return {
        raw_input: rawInput,
        detected_sources: Array.isArray(segmentation.detected_sources) ? segmentation.detected_sources : [],
        recognized_units: recognizedUnits,
        unrecognized_fragments: Array.isArray(segmentation.unrecognized_fragments) ? segmentation.unrecognized_fragments : [],
        units,
        reconciled: { concepts },
        warnings,
        errors,
        blocking_states: blockingStates,
        can_preview: true,
        can_apply: false,
        semantics: SEMANTICS_REQUESTED_TREATMENT,
    };
}

export function runIntakePipeline(rawInput, options) {
    return runUnifiedIntake(rawInput, options);
}
