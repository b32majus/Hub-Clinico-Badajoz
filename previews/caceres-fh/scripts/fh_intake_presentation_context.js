/**
 * WO-FH-EORDEN-CONTEXT-AUTO-REVEAL-01 (issue #334) — Pure transient
 * presentation-context decision for the Unified Intake NEW REQUEST flow.
 *
 * Source truth is explicit recognized e-Orden material ONLY:
 *   - service Dermatology is explicit in the D17 header (the parser only
 *     recognizes `SOLICITUD DERMATOLOGÍA → FARMACIA - …` units), and
 *   - the pathology is the parser-recognized explicit pathology contribution
 *     derived from that same D17 header title.
 *
 * The decision is PRESENTATION CONTEXT ONLY. It never writes a clinical
 * control, never associates or selects a patient, never persists anything and
 * never touches treatment validation. Requested-treatment semantics only.
 *
 * Fail-closed rule: missing, unsafe, ambiguous, conflicting or blocked sources
 * yield NO context (null) and never a fabricated value. Specifically null is
 * returned when the pathology proposal is not AUTO_PROPOSABLE, when the
 * contributing unit is not an unblocked recognized e-Orden unit, when more
 * than one distinct pathology label is proposed, or when the explicit SES
 * program (Código/Denominación) names a different Dermatology pathology than
 * the D17 header title (internally conflicting source).
 *
 * Pure, deterministic, side-effect free: no DOM, no UI, no gates, no apply.
 */

export const EORDEN_SERVICE_DERMA = 'derma';

/**
 * Explicit coherence pairs between the SES program code (Código/Denominación
 * allowlist space) and the canonical D17 title pathology. The SES
 * Denominación is an ASCII label and the D17 title is the accented canonical
 * pathology, so the pair contract is declared explicitly here instead of
 * inventing a text normalization between the two spaces. Anything outside
 * this table fails closed (no context).
 */
const SES_CODE_PATHOLOGY = Object.freeze({
    SES_HS: 'Hidradenitis supurativa',
    SES_PSOR: 'Psoriasis',
    SES_DA: 'Dermatitis atópica',
    SES_VITI: 'Vitíligo',
    SES_AA: 'Alopecia areata',
});

function usablePathologyText(value) {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/**
 * Decide whether one parsed Unified Intake result establishes a transient
 * Dermatology presentation context.
 * @param {{reconciled?: {concepts?: Record<string, unknown>}, units?: unknown[]}} result
 * @returns {{service: 'derma', pathology: string} | null}
 */
export function eOrdenPresentationContext(result) {
    if (!result || typeof result !== 'object') return null;
    const reconciled = result.reconciled?.concepts?.pathology;
    if (!reconciled || reconciled.proposal_status !== 'AUTO_PROPOSABLE') return null;
    const pathology = usablePathologyText(reconciled.value);
    if (!pathology) return null;

    const units = Array.isArray(result.units) ? result.units : [];
    const contributions = Array.isArray(reconciled.contributions) ? reconciled.contributions : [];
    const usable = contributions.filter(item =>
        item?.proposal_status === 'AUTO_PROPOSABLE'
        && item?.semantic_status === 'RECOGNIZED'
        && usablePathologyText(item?.value));
    if (!usable.length) return null;

    for (const contribution of usable) {
        const unit = units.find(candidate => candidate?.unit_index === contribution.unit_index);
        if (!unit || unit.blocked || unit?.source !== 'e-orden') return null;
        const state = unit?.parser?.unit_state;
        // WO #334 is intentionally stricter than generic reconciliation:
        // auto-reveal requires a fully RECOGNIZED e-Orden unit. A partial
        // unit may expose safe individual concepts for review, but it must
        // not establish presentation context automatically.
        if (state !== 'RECOGNIZED') return null;
        // Explicit internal coherence: the SES program (Código/Denominación) is
        // the other explicit pathology carrier inside the same e-Orden. When it
        // names a different pathology the source is conflicting → no context.
        const ses = (unit?.parser?.contributions ?? []).find(item =>
            item?.concept === 'ses_program' && item?.proposal_status === 'AUTO_PROPOSABLE');
        if (ses && typeof ses.value?.code === 'string') {
            const sesPathology = Object.hasOwn(SES_CODE_PATHOLOGY, ses.value.code)
                ? SES_CODE_PATHOLOGY[ses.value.code]
                : null;
            if (!sesPathology || sesPathology !== pathology.trim()) {
                return null;
            }
        }
    }

    const labels = new Set(usable.map(item => item.value));
    if (labels.size !== 1) return null;
    return { service: EORDEN_SERVICE_DERMA, pathology };
}
