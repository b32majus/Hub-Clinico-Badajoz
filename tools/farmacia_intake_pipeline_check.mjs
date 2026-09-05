#!/usr/bin/env node
/**
 * WO-E1 issue #297 (T5) — Pure pipeline integration + shared semantic
 * reconciliation fixture battery (Seam 1 end-to-end).
 *
 * Composes the READ-ONLY predecessors (T2 segmenter, T3 DermaEOrdenParser,
 * T4 PreSaludParser) through the single pure entry point
 * `scripts/fh_intake_pipeline.js` and verifies the D6 closed matrix:
 *
 *   A. single usable value + exact target + empty current -> AUTO_PROPOSABLE
 *      with comparison NOT_APPLICABLE (no peer) + origin ONLY_EORDEN/ONLY_PRESALUD
 *   B. equivalent explicit values -> EQUIVALENT (CORROBORATED)
 *   C. comparable-and-different -> DIFFERENT -> CONFLICT -> REQUIRES_SELECTION
 *      scoped to fhDermaFarmaco only, no winner
 *   D. principio_activo_raw vs commercial_name is NOT_COMPARABLE by structure,
 *      never CONFLICT (Repair B #304: strict NOT_COMPARABLE, target NONE,
 *      NO_PROPOSAL)
 *   E. NOT_APPLICABLE / NO_PROPOSAL where no target applies
 *   F. same-source multiplicity -> comparison NOT_COMPARABLE + REQUIRES_SELECTION
 *      with resolution MULTIPLE_SOURCE_VALUES (never a comparison enum value);
 *      PreSalud V0 multi-record (contiguous or separated regions) -> zero usable
 *      proposals, no cross-record choices (Repair B #304)
 *
 * Closed-enum invariant (Repair B #304): every emitted comparison_status
 * belongs to EQUIVALENT | DIFFERENT | NOT_COMPARABLE | NOT_APPLICABLE; origin
 * lives independently in ONLY_EORDEN | ONLY_PRESALUD | BOTH | NONE.
 *
 * Proportional lifecycle: an invalid-SES e-Orden unit is blocked with its
 * reason while an independent valid PreSalud unit stays fully usable.
 * Requested-treatment semantics only (REQUESTED_TREATMENT).
 *
 * Run: node tools/farmacia_intake_pipeline_check.mjs
 * Synthetic fixtures only.
 */

import {
    runUnifiedIntake,
    COMPARISON_EQUIVALENT,
    COMPARISON_DIFFERENT,
    COMPARISON_NOT_COMPARABLE,
    COMPARISON_NOT_APPLICABLE,
    COMPARISON_ONLY_EORDEN,
    COMPARISON_ONLY_PRESALUD,
    COMPARISON_MULTIPLE_SOURCE_VALUES,
    PROPOSAL_AUTO_PROPOSABLE,
    PROPOSAL_REQUIRES_SELECTION,
    PROPOSAL_NO_PROPOSAL,
    SEMANTICS_REQUESTED_TREATMENT,
} from '../scripts/fh_intake_pipeline.js';

let passed = 0;
let failed = 0;
function ok(label, condition) {
    if (condition) { console.log(`  ✓ ${label}`); passed += 1; }
    else { console.log(`  ✗ ${label}`); failed += 1; }
}
function assert(condition, label) { ok(label, condition); }

const SEP = '═'.repeat(55);
function eordenRaw({ title = 'PSORIASIS', code = 'SES_PSOR', label = 'PSORIASIS', brand = 'HYRIMOZ', dose = '40 MG', route = 'SC', schedule = 'CADA 14 DIAS', induction = 'NO', justification = 'Justificación sintética.', cip = 'CIP-SINT-0001' } = {}) {
    const lines = [
        `SOLICITUD DERMATOLOGÍA → FARMACIA - ${title}`,
        SEP,
        `• CIP: ${cip}`,
        `• Marca comercial solicitada: ${brand}`,
        `• Dosis solicitada: ${dose}`,
        `• Vía solicitada: ${route}`,
        `• Pauta: ${schedule}`,
        `• Inducción solicitada: ${induction}`,
        `• Justificación clínica: ${justification}`,
        'PROGRAMA SES',
        `• Código: ${code}`,
        `• Denominación: ${label}`,
    ];
    return lines.join('\n');
}
const presaludRaw = (record = ';ADALIMUMAB (HYRIMOZ);SC;40 MG;CADA 14 DIAS;') => record;
function conceptOf(result, name) { return result?.reconciled?.concepts?.[name]; }

// ─── A. single-source auto-proposable ─────────────────────────────────────────
console.log('\n[T5-A] Single usable value + exact target + empty current');
{
    const r = runUnifiedIntake(eordenRaw());
    const c = conceptOf(r, 'commercial_name');
    assert(c?.comparison_status === COMPARISON_NOT_APPLICABLE, 'e-Orden alone: NOT_APPLICABLE (no comparison peer)');
    assert(c?.origin === COMPARISON_ONLY_EORDEN, 'e-Orden alone: origin ONLY_EORDEN');
    assert(c?.proposal_status === PROPOSAL_AUTO_PROPOSABLE, 'e-Orden alone: AUTO_PROPOSABLE');
    assert(c?.target === 'fhDermaFarmaco', 'e-Orden brand targets fhDermaFarmaco');
    assert(c?.value === 'HYRIMOZ', 'e-Orden brand value preserved');
    assert(Array.isArray(c?.contributions) && c.contributions.length >= 1 && c.contributions.every((x) => x?.provenance?.source === 'e-orden'), 'every contribution keeps e-orden provenance');
}
{
    const r = runUnifiedIntake(presaludRaw());
    const c = conceptOf(r, 'commercial_name');
    assert(c?.comparison_status === COMPARISON_NOT_APPLICABLE, 'PreSalud alone: NOT_APPLICABLE (no comparison peer)');
    assert(c?.origin === COMPARISON_ONLY_PRESALUD, 'PreSalud alone: origin ONLY_PRESALUD');
    assert(c?.proposal_status === PROPOSAL_AUTO_PROPOSABLE, 'PreSalud alone: AUTO_PROPOSABLE');
    assert(c?.value === 'HYRIMOZ', 'PreSalud marca value preserved');
}

// ─── B. equivalent -> corroborated ────────────────────────────────────────────
console.log('\n[T5-B] Same explicit brand corroborates');
{
    const mixed = `${eordenRaw()}\n${presaludRaw()}`;
    const r = runUnifiedIntake(mixed);
    const c = conceptOf(r, 'commercial_name');
    assert(c?.comparison_status === COMPARISON_EQUIVALENT, 'HYRIMOZ vs HYRIMOZ: EQUIVALENT');
    assert(c?.resolution === 'CORROBORATED' || c?.display === 'CORROBORATED', 'equivalent pair shown CORROBORATED');
    assert(c?.proposal_status === PROPOSAL_AUTO_PROPOSABLE, 'corroborated + empty current: AUTO_PROPOSABLE');
    assert(c?.value === 'HYRIMOZ', 'corroborated value is the shared brand');
    const sources = new Set((c?.contributions ?? []).map((x) => x?.provenance?.source));
    assert(sources.has('e-orden') && sources.has('pre-salud'), 'provenance from both sources survives');
    assert(r?.semantics === SEMANTICS_REQUESTED_TREATMENT, 'requested-treatment semantics only');
    assert(!JSON.stringify(r).includes('VALIDATED_TREATMENT'), 'never VALIDATED_TREATMENT');
}

// ─── C. different -> conflict, scoped, no winner ─────────────────────────────
console.log('\n[T5-C] Different brands conflict without winner');
{
    const mixed = `${eordenRaw({ brand: 'HYRIMOZ' })}\n${presaludRaw(';ADALIMUMAB (BENEPALI);SC;40 MG;CADA 14 DIAS;')}`;
    const r = runUnifiedIntake(mixed);
    const c = conceptOf(r, 'commercial_name');
    assert(c?.comparison_status === COMPARISON_DIFFERENT, 'HYRIMOZ vs BENEPALI: DIFFERENT');
    assert(c?.resolution === 'CONFLICT' || c?.display === 'CONFLICT', 'different pair is CONFLICT');
    assert(c?.proposal_status === PROPOSAL_REQUIRES_SELECTION, 'conflict: REQUIRES_SELECTION');
    assert(c?.target === 'fhDermaFarmaco', 'conflict scoped to fhDermaFarmaco only');
    assert(c?.value === null || c?.value === undefined, 'no winner chosen (no single value)');
    const candidates = c?.candidates ?? c?.contributions?.map((x) => x.value) ?? [];
    assert(candidates.length >= 2, 'both rival values preserved, none dropped');
    assert(!('winner' in (c ?? {})) || c.winner == null, 'no winner field selected anywhere');
    // Sibling concept with same values on both sides still corroborates independently.
    const dose = conceptOf(r, 'requested_dose');
    assert(dose?.comparison_status === COMPARISON_EQUIVALENT, 'equal doses still EQUIVALENT beside the brand conflict');
}

// ─── D. principio vs commercial_name never rivals ────────────────────────────
console.log('\n[T5-D] Principio activo is structure-only, never a rival');
{
    const mixed = `${eordenRaw({ brand: 'HYRIMOZ' })}\n${presaludRaw(';ADALIMUMAB (HYRIMOZ);SC;40 MG;CADA 14 DIAS;')}`;
    const r = runUnifiedIntake(mixed);
    const principio = conceptOf(r, 'principio_activo_raw');
    assert(principio?.comparison_status === COMPARISON_NOT_COMPARABLE, 'principio_activo_raw is structural NOT_COMPARABLE (Repair B #304)');
    assert(principio?.proposal_status === PROPOSAL_NO_PROPOSAL, 'principio_activo_raw never proposed');
    assert(principio?.target === 'NONE', 'principio_activo_raw keeps target NONE');
    const brand = conceptOf(r, 'commercial_name');
    assert(brand?.comparison_status === COMPARISON_EQUIVALENT, 'matching marca still EQUIVALENT (principio text never compared)');
    const hasFalseConflict = Object.values(r?.reconciled?.concepts ?? {}).some(
        (c) => (c?.resolution === 'CONFLICT' || c?.display === 'CONFLICT') && (c?.reason?.includes?.('principio') || JSON.stringify(c?.contributions ?? []).includes('principio_activo_raw rival'))
    );
    assert(!hasFalseConflict, 'no false CONFLICT involves principio_activo_raw');
}

// ─── E. no-target concepts ────────────────────────────────────────────────────
console.log('\n[T5-E] No-target concepts stay provenance-only');
{
    const r = runUnifiedIntake(`${eordenRaw()}\n${presaludRaw()}`);
    for (const name of ['estado', 'dias', 'cip']) {
        const c = conceptOf(r, name);
        assert(c?.proposal_status === PROPOSAL_NO_PROPOSAL, `${name}: NO_PROPOSAL`);
        assert(c?.target === 'NONE', `${name}: target NONE`);
    }
}

// ─── F. multi-record fails closed; single-source keeps origin ─────────────────
console.log('\n[T5-F] PreSalud multi-record fails closed; single source keeps origin');
{
    // Contiguous two-record input stays ONE structural unit (Repair A #303)
    // so T4 blocks it deterministically: raw preserved, zero proposals,
    // SC/Oral/40MG/80MG never surfaced as choices (Repair B #304).
    const twoRecords = ';ADALIMUMAB (HYRIMOZ);SC;40 MG;CADA 14 DIAS;\n;ETANERCEPT (BENEPALI);Oral;80 MG;CADA 28 DIAS;28';
    const r = runUnifiedIntake(twoRecords);
    assert((r?.blocking_states ?? []).includes('MULTI_RECORD_UNSUPPORTED_V0'), 'contiguous multi-record surfaces MULTI_RECORD_UNSUPPORTED_V0');
    const usable = Object.values(r?.reconciled?.concepts ?? {}).filter((c) => c?.proposal_status !== PROPOSAL_NO_PROPOSAL);
    assert(usable.length === 0, 'contiguous multi-record yields zero usable proposals');
    const leaked = Object.values(r?.reconciled?.concepts ?? {}).flatMap((c) => c?.candidates ?? []).filter((v) => ['SC', 'Oral', '40 MG', '80 MG'].includes(String(v)));
    assert(leaked.length === 0, 'SC/Oral/40MG/80MG never presented as choices');
}
{
    // Separated PreSalud regions segment as two units; the pipeline blocks
    // them with the same code: zero usable proposals, no cross-record
    // choices (Repair B #304, D9/D14).
    const separated = `${presaludRaw()}\nLINEA DESCONOCIDA INTERMEDIA\n;ETANERCEPT (BENEPALI);Oral;80 MG;CADA 28 DIAS;28`;
    const r = runUnifiedIntake(separated);
    assert((r?.blocking_states ?? []).includes('MULTI_RECORD_UNSUPPORTED_V0'), 'separated regions surface MULTI_RECORD_UNSUPPORTED_V0');
    const usable = Object.values(r?.reconciled?.concepts ?? {}).filter((c) => c?.proposal_status !== PROPOSAL_NO_PROPOSAL);
    assert(usable.length === 0, 'separated regions yield zero usable proposals');
    const leaked = Object.values(r?.reconciled?.concepts ?? {}).flatMap((c) => c?.candidates ?? []).filter((v) => ['SC', 'Oral', '40 MG', '80 MG'].includes(String(v)));
    assert(leaked.length === 0, 'separated SC/Oral/40MG/80MG never presented as choices');
}
{
    const r = runUnifiedIntake(eordenRaw());
    const c = conceptOf(r, 'requested_induction');
    assert(c?.comparison_status === COMPARISON_NOT_APPLICABLE, 'e-Orden-only concept: NOT_APPLICABLE');
    assert(c?.origin === COMPARISON_ONLY_EORDEN, 'e-Orden-only concept keeps origin ONLY_EORDEN');
}

// ─── Proportional lifecycle: invalid SES blocks one unit only ────────────────
console.log('\n[T5-G] Invalid-SES e-Orden blocked, valid PreSalud usable');
{
    const badSes = eordenRaw({ code: 'SES_UCE', label: 'URTICARIA' });
    const r = runUnifiedIntake(`${badSes}\n${presaludRaw()}`);
    const sesBlocked = (r?.blocking_states ?? []).some((s) => String(s).includes('SES')) || (r?.units ?? []).some((u) => (u?.parser?.blocking_states ?? []).length > 0);
    assert(sesBlocked, 'invalid SES surfaces its blocking reason');
    const brand = conceptOf(r, 'commercial_name');
    assert(brand?.comparison_status === COMPARISON_NOT_APPLICABLE && brand?.origin === COMPARISON_ONLY_PRESALUD, 'blocked e-Orden brand does not poison PreSalud: NOT_APPLICABLE + origin ONLY_PRESALUD');
    assert(brand?.proposal_status === PROPOSAL_AUTO_PROPOSABLE && brand?.value === 'HYRIMOZ', 'valid PreSalud unit stays fully usable');
    assert((r?.units ?? []).some((u) => u.source === 'pre-salud' && u?.parser?.unit_state !== 'UNRECOGNIZED'), 'PreSalud unit keeps its own lifecycle');
}

// ─── Envelope invariants ─────────────────────────────────────────────────────
console.log('\n[T5-H] Pure fail-safe envelope');
{
    const r = runUnifiedIntake(`${eordenRaw()}\n${presaludRaw()}`);
    assert(r?.can_apply === false, 'can_apply is always false');
    assert(r?.can_preview === true, 'result stays previewable');
    assert(r?.semantics === SEMANTICS_REQUESTED_TREATMENT, 'semantics is REQUESTED_TREATMENT');
    assert(Array.isArray(r?.recognized_units) && r.recognized_units.length >= 2, 'both source units recognized');
}
{
    const r = runUnifiedIntake('   \n  ');
    assert(r?.can_apply === false && (r?.blocking_states ?? []).length === 0, 'empty input is valid with zero proposals');
    assert(Object.keys(r?.reconciled?.concepts ?? {}).length === 0, 'empty input reconciles zero concepts');
}
{
    // Two e-Orden units are never partitionable: whole import blocked, zero proposals.
    const r = runUnifiedIntake(`${eordenRaw()}\n${eordenRaw({ brand: 'BENEPALI' })}`);
    assert((r?.blocking_states ?? []).length > 0, 'multi e-Orden import is blocked');
    const statuses = Object.values(r?.reconciled?.concepts ?? {}).map((c) => c?.proposal_status);
    assert(statuses.every((s) => s === PROPOSAL_NO_PROPOSAL) || statuses.length === 0, 'blocked import yields zero proposals');
}

// ─── Triangulation: negatives and alternates ─────────────────────────────────
console.log('\n[T5-T] Triangulation (no fuzzy, no overwrite, no rescue, order-free)');
{
    // No case folding: HYRIMOZ vs hyrimoz stays DIFFERENT with no winner.
    const r = runUnifiedIntake(`${eordenRaw({ brand: 'HYRIMOZ' })}\n${presaludRaw(';ADALIMUMAB (hyrimoz);SC;40 MG;CADA 14 DIAS;')}`);
    const c = conceptOf(r, 'commercial_name');
    assert(c?.comparison_status === COMPARISON_DIFFERENT, 'case difference is DIFFERENT (no case folding)');
    assert((c?.value === null || c?.value === undefined) && c?.proposal_status === PROPOSAL_REQUIRES_SELECTION, 'case difference picks no winner');
}
{
    // Non-empty differing current is never silently overwritten (T7 owns apply).
    const r = runUnifiedIntake(eordenRaw({ brand: 'HYRIMOZ' }), { currentFormValues: { fhDermaFarmaco: 'BENEPALI' } });
    const c = conceptOf(r, 'commercial_name');
    assert(c?.comparison_status === COMPARISON_NOT_APPLICABLE && c?.origin === COMPARISON_ONLY_EORDEN && c?.proposal_status === PROPOSAL_REQUIRES_SELECTION, 'occupied current degrades single usable to REQUIRES_SELECTION (NOT_APPLICABLE + origin)');
    assert(c?.value === 'HYRIMOZ', 'proposed value preserved, current untouched');
}
{
    // Unmatched medicamento: no partial rescue leaks a brand; e-Orden stays usable.
    const r = runUnifiedIntake(`${eordenRaw({ brand: 'HYRIMOZ' })}\nActivo;HYRIMOZ;SC;40 MG;CADA 14 DIAS;28`);
    const brand = conceptOf(r, 'commercial_name');
    assert(brand?.comparison_status === COMPARISON_NOT_APPLICABLE && brand?.origin === COMPARISON_ONLY_EORDEN && brand?.value === 'HYRIMOZ', 'unmatched PreSalud medicamento contributes zero brand');
    assert(conceptOf(r, 'medicamento')?.proposal_status === PROPOSAL_NO_PROPOSAL, 'broken medicamento identity stays NO_PROPOSAL');
}
{
    // Source order is irrelevant when the partition is unique (D4).
    const r = runUnifiedIntake(`${presaludRaw()}\n${eordenRaw()}`);
    assert(conceptOf(r, 'commercial_name')?.comparison_status === COMPARISON_EQUIVALENT, 'PreSalud-before-e-Orden still EQUIVALENT');
}

// ─── Closed D6 enum + origin separation sweep (Repair B #304) ───────────────
console.log('\n[T5-I] Closed comparison enum and independent origin axis');
{
const CLOSED = new Set([COMPARISON_EQUIVALENT, COMPARISON_DIFFERENT, COMPARISON_NOT_COMPARABLE, COMPARISON_NOT_APPLICABLE]);
const ORIGINS = new Set([COMPARISON_ONLY_EORDEN, COMPARISON_ONLY_PRESALUD, 'BOTH', 'NONE']);
const fixtures = [
eordenRaw(),
presaludRaw(),
`${eordenRaw()}\n${presaludRaw()}`,
`${eordenRaw({ brand: 'HYRIMOZ' })}\n${presaludRaw(';ADALIMUMAB (BENEPALI);SC;40 MG;CADA 14 DIAS;')}`,
';ADALIMUMAB (HYRIMOZ);SC;40 MG;CADA 14 DIAS;\n;ETANERCEPT (BENEPALI);Oral;80 MG;CADA 28 DIAS;28',
`${presaludRaw()}\nLINEA DESCONOCIDA INTERMEDIA\n;ETANERCEPT (BENEPALI);Oral;80 MG;CADA 28 DIAS;28`,
];
for (const fixture of fixtures) {
const r = runUnifiedIntake(fixture);
for (const [name, c] of Object.entries(r?.reconciled?.concepts ?? {})) {
assert(CLOSED.has(c?.comparison_status), `${name}: comparison ${c?.comparison_status} is in the closed 4-value enum`);
assert(ORIGINS.has(c?.origin), `${name}: origin ${c?.origin} is independent`);
if (c?.resolution === COMPARISON_MULTIPLE_SOURCE_VALUES) {
assert(c?.comparison_status === COMPARISON_NOT_COMPARABLE && c?.proposal_status === PROPOSAL_REQUIRES_SELECTION, `${name}: MULTIPLE_SOURCE_VALUES is resolution-only, paired with REQUIRES_SELECTION`);
}
}
}
}

console.log(`\n════════════════════════════════════════════════════════════════`);
console.log(`RESULTADO: ${passed} OK / ${failed} FALLIDO`);
if (failed > 0) { console.log('✗ WO-E1 T5 pipeline fixture battery FAILED'); process.exit(1); }
console.log('✓ WO-E1 T5 pipeline + reconciliation fixture battery PASSED');
