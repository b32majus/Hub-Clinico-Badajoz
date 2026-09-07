#!/usr/bin/env node
/**
 * WO-D issue #296 + issue #327 — deterministic PreSalud parser fixture battery
 * (Seam 1).
 *
 * Verifies the PreSaludParser V0 module against the strict D9/D10/D17 grammar
 * and subgrammar plus the issue #327 exact labeled serialization (the real
 * demonstrated PreSalud export: six `;`-delimited fields labeled `Estado:`,
 * `Medicamento:`, `Vía:`, `Dosis:`, `Pauta:`, `Días:` in contract order). Pure
 * fixture battery only — no browser QA in this ticket.
 *
 * Acceptance criteria exercised (issue #296 ACCEPTANCE_CRITERIA + #327):
 *   1. Demo valid raw -> marca (HYRIMOZ-class), vía, dosis + raw Días;
 *      pauta preserved explicit with target NONE / NO_PROPOSAL (D7: WO-E
 *      maps professionally, never WO-D AUTO_PROPOSABLE);
 *      empty Estado -> NO_VALUE / PENDING_EXTERNAL_CONFIRMATION / target NONE.
 *   1c. Issue #327 labeled raw (exact `Estado:`..`Días:` labels, `;` separated)
 *      -> same recognized concepts; empty `Estado:` accepted; misordered labels
 *      fail closed; labeled multi-record -> MULTI_RECORD_UNSUPPORTED_V0.
 *   2. Marca without remaining description, and without spaces around the
 *      parenthesized group, both match the subgrammar.
 *   3. No-parens / empty () / second parenthesized group ->
 *      MEDICATION_SUBGRAMMAR_UNMATCHED: raw preserved, zero brand proposal.
 *   4. Deterministic 2-record fixture (SC/40MG vs Oral/80MG) ->
 *      MULTI_RECORD_UNSUPPORTED_V0: raw preserved, zero proposals/apply;
 *      SC/Oral/40MG/80MG are never presented as selectable choices.
 *   5. Repeated label with equivalent values in one record -> grouped
 *      contribution with provenance; distinct values one safe record ->
 *      MULTIPLE_SOURCE_VALUES + REQUIRES_SELECTION. (D9 record — positional or
 *      labeled — carries one value per concept, so the parser never fabricates
 *      this within a single record; cross-record values are never selectable or
 *      grouped.)
 *   6. Anti-fuzzy negatives (aliases, Via/Dias, reordered, partial/hybrid
 *      label lines) -> unrecognized, preserved, zero proposals. The EXACT full
 *      labeled grammar is never a negative.
 *   7. Unknown text preserved; internal error -> unit-contained PARSER_ERROR.
 *
 * Run: node tools/farmacia_presalud_parser_check.mjs
 */

import {
    parsePreSaludUnit,
    parsePreSaludRaw,
    parsePreSaludSource,
    SOURCE_PRESALUD,
    UNIT_STATE_RECOGNIZED,
    UNIT_STATE_PARTIALLY_RECOGNIZED,
    UNIT_STATE_UNRECOGNIZED,
    UNIT_STATE_SEGMENTATION_BLOCKED,
    UNIT_STATE_PARSER_ERROR,
    BLOCK_MULTI_RECORD_UNSUPPORTED,
    MEDICATION_SUBGRAMMAR_UNMATCHED,
    PENDING_EXTERNAL_CONFIRMATION,
    NO_VALUE_STATE,
    PROVENANCE_ONLY,
    PROPOSAL_AUTO_PROPOSABLE,
    PROPOSAL_NO_PROPOSAL,
    TARGET_NONE,
} from '../scripts/fh_presalud_parser.js';

let passed = 0;
let failed = 0;

function ok(label, condition) {
    if (condition) { console.log(`  ✓ ${label}`); passed += 1; } else { console.log(`  ✗ ${label}`); failed += 1; }
}
function assert(condition, label) { ok(label, condition); }

// ─── Fixtures ────────────────────────────────────────────────────────────────

// Demo PreSalud raw from the T2 battery: empty Estado, HYRIMOZ brand.
const DEMO_EMPTY_STATE = ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';
const DEMO_FULL = 'En tratamiento;HYRIMOZ (HYRIMOZ 40MG);SC;40 MG;CADA 14 DIAS;28';
const NO_DESC = 'Activo;HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;28';
const NO_SPACE_PARENS = 'Activo;HYRIMOZ(HYRIMOZ);SC;40 MG;CADA 14 DIAS;28';
const NO_PARENS = 'Activo;HYRIMOZ;SC;40 MG;CADA 14 DIAS;28';
const EMPTY_MARCA = 'Activo;HYRIMOZ ();SC;40 MG;CADA 14 DIAS;28';
const SECOND_GROUP = 'Activo;HYRIMOZ (HYRIMOZ) EXTRA (40);SC;40 MG;CADA 14 DIAS;28';
// Deterministic 2-record fixture (D9): record1 SC/40MG, record2 Oral/80MG.
const MULTI_RECORD =
    ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;\n' +
    'Activo;BENEPALI (BENEPALI 45MG);Oral;80 MG;CADA 28 DIAS;28';
// Repeated label equivalent-value across two records must never group.
const MULTI_RECORD_SAME_VALUES =
    ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;\n' +
    'Activo;HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;28';

// Issue #327 exact labeled serialization (real demonstrated PreSalud export):
// six labeled fields separated by `;`, transport spaces around labels.
// `Estado:` may be empty (NO_VALUE) like the positional empty Estado.
const LABELED_EMPTY_STATE =
    'Estado: ; Medicamento: ALFA (MARCA-A) ; Vía: SC ; Dosis: 40 MG ; Pauta: CADA 14 DIAS ; Días: 18 meses';
const LABELED_FULL =
    'Estado: Activo ; Medicamento: BETA (MARCA-B) ; Vía: SC ; Dosis: 80 MG ; Pauta: CADA 14 DIAS ; Días: 10';
const LABELED_EN_TRATAMIENTO =
    'Estado: En tratamiento ; Medicamento: GAMMA (MARCA-C) ; Vía: SC ; Dosis: 160 MG ; Pauta: DOSIS INICIAL ; Días: 1';
// Reordered exact labels are NOT the contract order -> fail closed.
const LABELED_MISORDERED =
    'Medicamento: ALFA (MARCA-A) ; Estado: Activo ; Vía: SC ; Dosis: 40 MG ; Pauta: CADA 14 DIAS ; Días: 1';
// Two fully-labeled records in one unit -> deterministic multi-record block.
const LABELED_MULTI_RECORD = `${LABELED_EMPTY_STATE}\n${LABELED_FULL}`;

// Helper: build a record from fields (Estado;Medicamento;Vía;Dosis;Pauta;Días).
function record(fields) { return fields.join(';'); }

function contributionOf(result, concept) {
    return result.contributions.find((c) => c.concept === concept);
}

console.log('\n[WO-D] 1. Demo raw -> marca/vía/dosis/pauta + Estado/Días raw provenance');
{
    const r = parsePreSaludRaw(DEMO_EMPTY_STATE);
    assert(r.raw_input === DEMO_EMPTY_STATE, 'raw_input byte-exact preserved');
    assert(r.source === SOURCE_PRESALUD, 'source = pre-salud');
    assert(r.can_apply === false, 'can_apply = false');
    assert(r.can_preview === true, 'can_preview = true');
    assert(r.unit_state === UNIT_STATE_RECOGNIZED, 'demo empty state: RECOGNIZED');
    assert(r.record_count === 1, 'record_count = 1');

    const marca = contributionOf(r, 'commercial_name');
    assert(marca && marca.value === 'HYRIMOZ' && marca.target === 'fhDermaFarmaco', 'marca = HYRIMOZ (target fhDermaFarmaco)');
    assert(marca.proposal_status === PROPOSAL_AUTO_PROPOSABLE, 'marca AUTO_PROPOSABLE');
    assert(marca.marca_comercial_explicit === 'HYRIMOZ', 'marca_comercial_explicit extracted');

    const via = contributionOf(r, 'requested_route');
    assert(via && via.value === 'SC' && via.target === 'fhDermaVia', 'vía = SC (target fhDermaVia)');
    const dosis = contributionOf(r, 'requested_dose');
    assert(dosis && dosis.value === '40 MG' && dosis.target === 'fhDermaDosis', 'dosis = 40 MG (target fhDermaDosis)');
    const pauta = contributionOf(r, 'requested_schedule');
    assert(pauta && pauta.value === 'CADA 14 DIAS' && pauta.target === TARGET_NONE && pauta.proposal_status === PROPOSAL_NO_PROPOSAL, 'pauta = CADA 14 DIAS preserved, target NONE / NO_PROPOSAL (D7: WO-E maps professionally)');

    const estado = contributionOf(r, 'estado');
    assert(estado && estado.value === null && estado.target === TARGET_NONE && estado.proposal_status === PROPOSAL_NO_PROPOSAL, 'empty Estado -> target NONE / NO_PROPOSAL');
    assert(estado.semantic_status === PENDING_EXTERNAL_CONFIRMATION && estado.value_state === NO_VALUE_STATE, 'empty Estado -> NO_VALUE / PENDING_EXTERNAL_CONFIRMATION');
    const dias = contributionOf(r, 'dias');
    assert(dias && dias.value === null && dias.target === TARGET_NONE && dias.semantic_status === PENDING_EXTERNAL_CONFIRMATION, 'empty Días -> raw provenance target NONE');
}

    console.log('\n[WO-D] 1c. Issue #327 exact labeled raw -> recognized concepts (real demonstrated PreSalud export)');
    {
        // The real PreSalud export is six `;`-delimited labeled fields
        // `Estado:` .. `Días:` in contract order. Each parses to the SAME
        // concepts as the positional form: commercial_name from the exact
        // subgrammar, requested_route/requested_dose explicit, pauta preserved
        // provenance-only, Estado/Días provenance-only pending.
        const cases = [
            ['empty Estado / 40 MG', LABELED_EMPTY_STATE, '40 MG', 'MARCA-A'],
            ['80 MG', LABELED_FULL, '80 MG', 'MARCA-B'],
            ['160 MG / En tratamiento', LABELED_EN_TRATAMIENTO, '160 MG', 'MARCA-C'],
        ];
        for (const [label, raw, expectedDose, expectedBrand] of cases) {
            const r = parsePreSaludRaw(raw);
            assert(r.raw_input === raw, `${label}: raw_input byte-exact preserved`);
            assert(r.unit_state === UNIT_STATE_RECOGNIZED, `${label}: labeled record recognized`);
            assert(r.record_count === 1, `${label}: record_count = 1`);
            assert(r.unrecognized_fragments.length === 0, `${label}: no unrecognized fragment`);
            const marca = contributionOf(r, 'commercial_name');
            assert(marca && marca.value === expectedBrand && marca.target === 'fhDermaFarmaco' && marca.proposal_status === PROPOSAL_AUTO_PROPOSABLE, `${label}: commercial_name = ${expectedBrand} (AUTO_PROPOSABLE)`);
            const via = contributionOf(r, 'requested_route');
            assert(via && via.value === 'SC' && via.target === 'fhDermaVia' && via.proposal_status === PROPOSAL_AUTO_PROPOSABLE, `${label}: requested_route = SC explicit`);
            const dosis = contributionOf(r, 'requested_dose');
            assert(dosis && dosis.value === expectedDose && dosis.target === 'fhDermaDosis' && dosis.proposal_status === PROPOSAL_AUTO_PROPOSABLE, `${label}: requested_dose = ${expectedDose}`);
            const pauta = contributionOf(r, 'requested_schedule');
            assert(pauta && pauta.target === TARGET_NONE && pauta.proposal_status === PROPOSAL_NO_PROPOSAL, `${label}: pauta preserved, target NONE / NO_PROPOSAL`);
            const estado = contributionOf(r, 'estado');
            assert(estado && estado.target === TARGET_NONE && estado.proposal_status === PROPOSAL_NO_PROPOSAL && estado.semantic_status === PENDING_EXTERNAL_CONFIRMATION, `${label}: Estado provenance-only pending external confirmation`);
            const dias = contributionOf(r, 'dias');
            assert(dias && dias.target === TARGET_NONE && dias.proposal_status === PROPOSAL_NO_PROPOSAL && dias.semantic_status === PENDING_EXTERNAL_CONFIRMATION, `${label}: Días provenance-only pending external confirmation`);
            const principio = contributionOf(r, 'principio_activo_raw');
            assert(principio && principio.target === TARGET_NONE && principio.proposal_status === PROPOSAL_NO_PROPOSAL && principio.semantic_status === PROVENANCE_ONLY, `${label}: principio_activo_raw provenance-only`);
        }
        // Empty Estado labeled: value_state NO_VALUE (mirror of positional).
        const rEmpty = parsePreSaludRaw(LABELED_EMPTY_STATE);
        const estadoEmpty = contributionOf(rEmpty, 'estado');
        assert(estadoEmpty && estadoEmpty.value === null && estadoEmpty.value_state === NO_VALUE_STATE, 'empty labeled Estado -> NO_VALUE');
        const diasPresent = contributionOf(rEmpty, 'dias');
        assert(diasPresent && diasPresent.value === '18 meses' && diasPresent.value_state === 'RAW_PRESENT', 'labeled Días raw preserved when present');
    }

    console.log('\n[WO-D] 1d. Issue #327 misordered / multi-record labeled raw stays fail-closed');
    {
        // Misordered exact labels are NOT the contract order -> the line is not
        // a valid record: UNRECOGNIZED, raw preserved, zero contributions.
        const bad = parsePreSaludRaw(LABELED_MISORDERED);
        assert(bad.unit_state === UNIT_STATE_UNRECOGNIZED, 'misordered labeled raw -> UNRECOGNIZED (fail-closed)');
        assert(bad.contributions.length === 0, 'misordered labeled raw -> zero contributions');
        assert(bad.raw_input === LABELED_MISORDERED, 'misordered labeled raw preserved');
        assert(bad.unrecognized_fragments.length >= 1, 'misordered labeled raw preserved as fragment');

        // Two fully-labeled records in one unit -> deterministic multi-record
        // block (V0 does not compose records), zero proposals.
        const blocked = parsePreSaludRaw(LABELED_MULTI_RECORD);
        assert(blocked.record_count === 2, 'labeled multi-record: record_count = 2');
        assert(blocked.multi_record_state === BLOCK_MULTI_RECORD_UNSUPPORTED, 'labeled multi-record: multi_record_state set');
        assert(blocked.blocking_states.includes(BLOCK_MULTI_RECORD_UNSUPPORTED), 'labeled multi-record: blocking MULTI_RECORD_UNSUPPORTED_V0');
        assert(blocked.contributions.length === 0, 'labeled multi-record: zero contributions');
        assert(blocked.unrecognized_fragments.length === 1 && blocked.unrecognized_fragments[0].raw === LABELED_MULTI_RECORD, 'labeled multi-record raw preserved');
        assert(blocked.raw_input === LABELED_MULTI_RECORD && blocked.can_apply === false, 'labeled multi-record raw byte-exact, apply blocked');
        assert(!contributionOf(blocked, 'commercial_name'), 'labeled multi-record: no brand proposal from any record');
        assert(!blocked.contributions.some((c) => c.value === '40 MG' || c.value === '80 MG'), 'labeled multi-record: 40/80 MG never selectable');
    }
console.log('\n[WO-D] 1b. Full demo raw -> Estado/Días preserved raw provenance; Días raw target NONE');
{
    const r = parsePreSaludRaw(DEMO_FULL);
    assert(r.raw_input === DEMO_FULL, 'raw_input byte-exact');
    const estado = contributionOf(r, 'estado');
    assert(estado && estado.value === 'En tratamiento' && estado.target === TARGET_NONE, 'Estado present raw preserved, target NONE');
    assert(estado.semantic_status === PENDING_EXTERNAL_CONFIRMATION, 'Estado present still PENDING_EXTERNAL_CONFIRMATION');
    const dias = contributionOf(r, 'dias');
    assert(dias && dias.value === '28' && dias.target === TARGET_NONE && dias.semantic_status === PENDING_EXTERNAL_CONFIRMATION, 'Días raw preserved, target NONE, pending external confirmation');
    const principio = contributionOf(r, 'principio_activo_raw');
    assert(principio && principio.value === 'HYRIMOZ' && principio.target === TARGET_NONE && principio.proposal_status === PROPOSAL_NO_PROPOSAL && principio.semantic_status === PROVENANCE_ONLY, 'principio_activo_raw provenance-only target NONE');
    const marca = contributionOf(r, 'commercial_name');
    assert(marca && marca.value === 'HYRIMOZ 40MG', 'marca from full raw = HYRIMOZ 40MG');
}

console.log('\n[WO-D] 2. Marca without description and without spaces around parens both match');
{
    const r1 = parsePreSaludRaw(NO_DESC);
    assert(r1.unit_state === UNIT_STATE_RECOGNIZED && contributionOf(r1, 'commercial_name')?.value === 'HYRIMOZ', 'no description after parens: full match');
    const r2 = parsePreSaludRaw(NO_SPACE_PARENS);
    assert(r2.unit_state === UNIT_STATE_RECOGNIZED && contributionOf(r2, 'commercial_name')?.value === 'HYRIMOZ', 'no spaces around parens: full match');
}

console.log('\n[WO-D] 3. No-parens / empty () / second paren group -> MEDICATION_SUBGRAMMAR_UNMATCHED, zero proposals');
{
    for (const [label, raw] of [['no-parens', NO_PARENS], ['empty marca ()', EMPTY_MARCA], ['second group', SECOND_GROUP]]) {
        const r = parsePreSaludRaw(raw);
        assert(r.blocking_states.includes(MEDICATION_SUBGRAMMAR_UNMATCHED), `${label}: blocking MEDICATION_SUBGRAMMAR_UNMATCHED`);
        assert(r.errors.some((e) => e.code === MEDICATION_SUBGRAMMAR_UNMATCHED), `${label}: error surfaced`);
        const medicamento = contributionOf(r, 'medicamento');
        assert(medicamento && medicamento.semantic_status === MEDICATION_SUBGRAMMAR_UNMATCHED && medicamento.target === TARGET_NONE && medicamento.proposal_status === PROPOSAL_NO_PROPOSAL, `${label}: medicamento contribution preserved, NONE / NO_PROPOSAL`);
        assert(!contributionOf(r, 'commercial_name'), `${label}: zero brand proposal`);
        assert(!r.contributions.some((c) => c.proposal_status === PROPOSAL_AUTO_PROPOSABLE), `${label}: zero AUTO_PROPOSABLE contributions`);
        assert(r.raw_input === raw && r.can_apply === false, `${label}: raw preserved, can_apply false`);
        assert(r.unit_state === UNIT_STATE_PARTIALLY_RECOGNIZED, `${label}: PARTIALLY_RECOGNIZED`);
    }
}

console.log('\n[WO-D] 3b. Medication subgrammar matches with remaining description; remaining description is never decomposed');
{
    const r = parsePreSaludRaw('Activo;HYRIMOZ (HYRIMOZ) 40MG SOLUCION;SC;40 MG;CADA 14 DIAS;28');
    const marca = contributionOf(r, 'commercial_name');
    assert(marca && marca.value === 'HYRIMOZ' && marca.descripcion_restante_raw === '40MG SOLUCION', 'remaining description preserved as raw, never decomposed');
    assert(marca.proposal_status === PROPOSAL_AUTO_PROPOSABLE, 'brand still auto-proposable from full match');
    assert(r.contributions.some((c) => c.concept === 'requested_dose' && c.value === '40 MG'), 'dose comes from D9 field, not from description');
}

console.log('\n[WO-D] 4. Deterministic 2-record fixture -> MULTI_RECORD_UNSUPPORTED_V0, raw preserved, zero proposals');
{
    const r = parsePreSaludRaw(MULTI_RECORD);
    assert(r.record_count === 2, 'record_count = 2');
    assert(r.multi_record_state === BLOCK_MULTI_RECORD_UNSUPPORTED, 'multi_record_state set');
    assert(r.blocking_states.includes(BLOCK_MULTI_RECORD_UNSUPPORTED), 'blocking MULTI_RECORD_UNSUPPORTED_V0');
    assert(r.errors.some((e) => e.code === BLOCK_MULTI_RECORD_UNSUPPORTED), 'error surfaced');
    assert(r.contributions.length === 0, 'zero proposals');
    assert(r.unrecognized_fragments.length === 1 && r.unrecognized_fragments[0].raw === MULTI_RECORD, 'raw preserved in fragment');
    assert(r.raw_input === MULTI_RECORD, 'raw_input byte-exact');
    assert(r.can_apply === false, 'apply blocked');
    assert(!r.contributions.some((c) => c.value === 'SC' || c.value === 'Oral' || c.value === '40 MG' || c.value === '80 MG'), 'SC/Oral/40MG/80MG never selectable');
    assert(!r.warnings.some((w) => w.code === 'MULTIPLE_SOURCE_VALUES'), 'no repeated-label selection fabricated across records');
    assert(!contributionOf(r, 'commercial_name'), 'no brand proposal from any record');
}

console.log('\n[WO-D] 4b. Two records with identical values are still NOT grouped (REPEATED LABEL RULE: never across records)');
{
    const r = parsePreSaludRaw(MULTI_RECORD_SAME_VALUES);
    assert(r.blocking_states.includes(BLOCK_MULTI_RECORD_UNSUPPORTED), 'identical-values multi-record still blocked');
    assert(r.contributions.length === 0, 'identical values across records never grouped into one contribution');
    assert(!r.contributions.some((c) => c.concept === 'commercial_name'), 'no single record selected');
    assert(r.repeated_label_rule.cross_record_grouping_or_selection === false, 'cross-record grouping explicitly false');
}

console.log('\n[WO-D] 5. Repeated-label rule within a single record boundary');
{
    // The D9 positional record carries exactly one explicit value per concept.
    // A genuine single safe record therefore has NO per-concept duplicates to
    // select among; the parser never fabricates MULTIPLE_SOURCE_VALUES. The
    // rule the parser enforces is the cross-record boundary (checked above).
    const r = parsePreSaludRaw('Activo;HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;28');
    assert(!r.warnings.some((w) => w.code === 'MULTIPLE_SOURCE_VALUES'), 'single record yields no MULTIPLE_SOURCE_VALUES');
    assert(r.repeated_label_rule.within_single_record_multiple_explicit_values === false, 'no phantom repeated label in one record');
    // Equivalent contributions from one record are single contributions with
    // provenance (each carries line_index and raw).
    for (const c of r.contributions) {
        assert(c.provenance && c.provenance.raw !== undefined, `contribution ${c.concept} carries provenance`);
        assert(c.line_index === 0, `contribution ${c.concept} line_index = 0`);
    }
}

console.log('\n[WO-D] 6. Anti-fuzzy negatives: aliases, Via/Dias, reordered, PARTIAL/hybrid label lines -> unrecognized, preserved, zero proposals');
{
    // Issue #327 added the EXACT full labeled grammar (all six fields
    // labeled `Estado:`..`Días:` in contract order) as a positive. A line
    // with only SOME fields labeled (hybrid/partial), an unaccented label
    // (`Via`/`Dias`), an alias label, or a reordered field is NOT either
    // normative serialization (neither the exact labeled grammar nor the
    // positional value stream): it is not a record and is preserved with
    // zero proposals. The exact labeled grammar is never a negative here.
    const cases = [
        ['partial label on Estado only (hybrid)', 'Estado: Activo;HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;28'],
        ['unaccented Via label', 'Activo;HYRIMOZ (HYRIMOZ);Via: SC;40 MG;CADA 14 DIAS;28'],
        ['unaccented Dias label', 'Activo;HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;Dias: 28'],
        ['reordered (Medicamento moved to last)', 'Activo;SC;40 MG;CADA 14 DIAS;28;HYRIMOZ (HYRIMOZ)'],
        ['reordered (Vía before Medicamento)', 'Activo;SC;HYRIMOZ (HYRIMOZ);40 MG;CADA 14 DIAS;28'],
        ['extra label prefix on medicamento', 'Activo;Medicamento: HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;28'],
    ];
    for (const [label, raw] of cases) {
        const r = parsePreSaludRaw(raw);
        assert(!r.contributions.some((c) => c.proposal_status === PROPOSAL_AUTO_PROPOSABLE), `${label}: zero proposals`);
        assert(r.raw_input === raw, `${label}: raw preserved`);
        assert(r.can_apply === false, `${label}: can_apply false`);
    }
    // Partial/hybrid, unaccented-label, and alias serializations are not
    // record-shaped at all -> UNRECOGNIZED and preserved as fragments.
    for (const [label, raw] of [
        ['partial label on Estado only (hybrid)', 'Estado: Activo;HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;28'],
        ['unaccented Via label', 'Activo;HYRIMOZ (HYRIMOZ);Via: SC;40 MG;CADA 14 DIAS;28'],
        ['unaccented Dias label', 'Activo;HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;Dias: 28'],
        ['extra label prefix on medicamento', 'Activo;Medicamento: HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;28'],
    ]) {
        const r = parsePreSaludRaw(raw);
        assert(r.unit_state === UNIT_STATE_UNRECOGNIZED, `${label}: unit UNRECOGNIZED`);
        assert(r.unrecognized_fragments.length >= 1, `${label}: preserved as fragment`);
    }
    // Reordering that displaces the medication identity anchor from field 2
    // fails the D10 subgrammar (slot 2 is not a full PRESALUD_MEDICAMENTO_V0
    // match): the record yields zero proposals and no brand extraction.
    for (const [label, raw] of [
        ['medicamento last', 'Activo;SC;40 MG;CADA 14 DIAS;28;HYRIMOZ (HYRIMOZ)'],
        ['vía before medicamento', 'Activo;SC;HYRIMOZ (HYRIMOZ);40 MG;CADA 14 DIAS;28'],
    ]) {
        const r = parsePreSaludRaw(raw);
        assert(r.blocking_states.includes(MEDICATION_SUBGRAMMAR_UNMATCHED), `${label}: MEDICATION_SUBGRAMMAR_UNMATCHED (anchor displaced)`);
        assert(!contributionOf(r, 'commercial_name'), `${label}: zero brand proposal`);
    }
}

console.log('\n[WO-D] 6b. Positional truth: value-only field swaps are NOT value-detected (no inference)');
{
    // A pure swap of two unlabeled values between Vía and Dosis is invisible
    // to a positional grammar. The parser must NOT infer that '40 MG' is a
    // dose and 'SC' is a route (PARSER != MOTOR_DE_INFERENCIA, D7/D10): it
    // reports the exact explicit positional fields. The route allowlist keeps
    // '40 MG' out of fhDermaVia (non-proposable) while the explicit field-4
    // value 'SC' is reported exactly as stated with provenance (can_apply is
    // always false; professional confirmation is downstream).
    const raw = 'Activo;HYRIMOZ (HYRIMOZ);40 MG;SC;CADA 14 DIAS;28';
    const r = parsePreSaludRaw(raw);
    assert(contributionOf(r, 'requested_route')?.value === '40 MG' && contributionOf(r, 'requested_route')?.target === TARGET_NONE && contributionOf(r, 'requested_route')?.proposal_status === PROPOSAL_NO_PROPOSAL, 'route value not exact equivalence -> NONE / NO_PROPOSAL (never inferred)');
    assert(contributionOf(r, 'requested_dose')?.value === 'SC' && contributionOf(r, 'requested_dose')?.proposal_status === PROPOSAL_AUTO_PROPOSABLE, 'dose reports exact explicit field value (no inference)');
    assert(r.raw_input === raw && r.can_apply === false, 'raw preserved, can_apply false');
}

console.log('\n[WO-D] 7. Unknown text inside the unit is preserved');
{
    const raw = 'Activo;HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;28\nnota suelta del paciente';
    const r = parsePreSaludRaw(raw);
    assert(r.raw_input === raw, 'raw_input byte-exact');
    assert(r.unrecognized_fragments.some((f) => f.raw === 'nota suelta del paciente'), 'unknown text preserved as fragment');
    assert(contributionOf(r, 'commercial_name')?.value === 'HYRIMOZ', 'safe record contributions still present');
    assert(r.warnings.some((w) => w.code === 'UNKNOWN_TEXT_IN_UNIT'), 'unknown-text warning surfaced');
    assert(r.unit_state === UNIT_STATE_PARTIALLY_RECOGNIZED, 'unit PARTIALLY_RECOGNIZED');
}

console.log('\n[WO-D] 7b. Internal error -> PARSER_ERROR contained to the unit');
{
    // Direct internal-error injection is not possible from the pure API, but
    // the public guards are asserted: non-text input is a deterministic
    // PARSER_ERROR preserving raw; unexpected non-string raw cannot crash.
    const wrongKind = parsePreSaludUnit({ kind: 'eorden_unit', raw: DEMO_EMPTY_STATE });
    assert(wrongKind.unit_state === UNIT_STATE_PARSER_ERROR && wrongKind.errors[0].code === 'PRESALUD_PARSER_WRONG_UNIT_KIND', 'wrong unit kind -> PARSER_ERROR');
    const blocked = parsePreSaludUnit({ kind: 'blocked_unit', raw: DEMO_EMPTY_STATE, blocking_reason: 'x' });
    assert(blocked.unit_state === UNIT_STATE_SEGMENTATION_BLOCKED && blocked.errors[0].code === 'SEGMENTATION_BLOCKED', 'blocked unit -> SEGMENTATION_BLOCKED');
    const nonText = parsePreSaludUnit({ raw: 42 });
    assert(nonText.unit_state === UNIT_STATE_PARSER_ERROR && nonText.errors[0].code === 'PRESALUD_PARSER_INPUT_NOT_TEXT', 'non-text raw -> deterministic PARSER_ERROR');
    const nonTextRaw = parsePreSaludRaw(42);
    assert(nonTextRaw.unit_state === UNIT_STATE_PARSER_ERROR && nonTextRaw.errors[0].code === 'PRESALUD_PARSER_INPUT_NOT_TEXT', 'parsePreSaludRaw non-text -> PARSER_ERROR');
    const srcAlias = parsePreSaludSource(DEMO_EMPTY_STATE);
    assert(srcAlias.unit_state === UNIT_STATE_RECOGNIZED && contributionOf(srcAlias, 'commercial_name')?.value === 'HYRIMOZ', 'parsePreSaludSource alias parses');
}

console.log('\n[WO-D] 8. Empty and completely unknown inputs -> valid zero-proposal results (D3)');
{
    for (const raw of ['', '   ', '\n', '\t\n']) {
        const r = parsePreSaludRaw(raw);
        assert(r.contributions.length === 0 && r.can_apply === false && r.can_preview === true, `empty input ${JSON.stringify(raw)} safe`);
    }
    const unknown = parsePreSaludRaw('nota suelta del paciente\nsegunda línea sin estructura');
    assert(unknown.contributions.length === 0 && unknown.can_apply === false && unknown.can_preview === true && unknown.unrecognized_fragments.length === 2, 'unknown text preserved, zero proposals');
}

console.log('\n[WO-D] 9. parsePreSaludUnit consumes a WO-B-delivered presalud_unit');
{
    const item = { kind: 'presalud_unit', source: 'pre-salud', state: 'RECOGNIZED', raw: DEMO_EMPTY_STATE };
    const r = parsePreSaludUnit(item);
    assert(r.raw_input === DEMO_EMPTY_STATE && r.source === SOURCE_PRESALUD, 'unit raw consumed');
    assert(contributionOf(r, 'commercial_name')?.value === 'HYRIMOZ', 'unit parses brand');
    assert(r.can_apply === false, 'unit can_apply false');
    const rawCall = parsePreSaludUnit(DEMO_EMPTY_STATE);
    assert(rawCall.raw_input === DEMO_EMPTY_STATE && contributionOf(rawCall, 'commercial_name')?.value === 'HYRIMOZ', 'string direct call parses');
}

console.log('\n[WO-D] 10. Hybrid second line (partial label) cannot leak proposals');
{
    // When one clean positional record line is followed by a HYBRID line
    // (only one field labeled — not the exact full labeled grammar), the
    // parser preserves the non-record line and does not fabricate a second
    // record or a selection.
    const raw = 'Activo;HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;28\nActivo;HYRIMOZ (HYRIMOZ);Vía: SC;40 MG;CADA 14 DIAS;28';
    const r = parsePreSaludRaw(raw);
    assert(r.contributions.filter((c) => c.concept === 'commercial_name').length === 1, 'only one clean record contributes a brand');
    assert(r.unrecognized_fragments.some((f) => f.raw.includes('Vía:')), 'hybrid partial-label line preserved as unknown');
    assert(!r.warnings.some((w) => w.code === 'MULTIPLE_SOURCE_VALUES'), 'no fabricated selection');
}

console.log('\n[WO-D] 11. Hybrid/partial label lines with leading whitespace stay fail-closed');
{
// Transport authorizes trailing whitespace only; a label prefix on ONE field
// of an otherwise positional line makes the line a HYBRID (not the exact
// full labeled grammar, not a positional record): UNRECOGNIZED, raw
// preserved, zero proposals. A fully labeled line (all six fields labeled in
// contract order) is the #327 normative grammar and is covered as a positive
// in sections 1c/1d.
const cases = [
['leading-space Via label (field 3)', 'Activo;HYRIMOZ (HYRIMOZ); Via: SC;40 MG;CADA 14 DIAS;28'],
['leading-space Dias label (field 6)', 'Activo;HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS; Dias: 28'],
['leading-space Medicamento label (field 2)', 'Activo; Medicamento: HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;28'],
['tab-indented Pauta label (field 5)', 'Activo;HYRIMOZ (HYRIMOZ);SC;40 MG;\tPauta: CADA 14 DIAS;28'],
];
for (const [label, raw] of cases) {
const r = parsePreSaludRaw(raw);
assert(r.unit_state === UNIT_STATE_UNRECOGNIZED, `${label}: unit UNRECOGNIZED (fail-closed)`);
assert(!r.contributions.some((c) => c.proposal_status === PROPOSAL_AUTO_PROPOSABLE), `${label}: zero proposals`);
assert(r.raw_input === raw, `${label}: raw preserved`);
assert(r.can_apply === false, `${label}: can_apply false`);
assert(r.unrecognized_fragments.length >= 1, `${label}: preserved as fragment`);
}
// Triangulation: a valid positional record still passes, and the EXACT full
// labeled grammar (issue #327) is a positive (covered in section 1c).
const valid = parsePreSaludRaw('Activo;HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;28');
assert(valid.unit_state === UNIT_STATE_RECOGNIZED && contributionOf(valid, 'commercial_name')?.value === 'HYRIMOZ', 'valid exact positional record still RECOGNIZED');
}

console.log('\n[WO-D] 12. requested_schedule / Pauta preserved with provenance but target NONE / NO_PROPOSAL (D7; no WO-D hydration)');
{
const r = parsePreSaludRaw(DEMO_EMPTY_STATE);
const pauta = contributionOf(r, 'requested_schedule');
assert(pauta && pauta.value === 'CADA 14 DIAS', 'pauta explicit value preserved');
assert(pauta.target === TARGET_NONE, 'pauta target NONE');
assert(pauta.proposal_status === PROPOSAL_NO_PROPOSAL, 'pauta NO_PROPOSAL');
assert(pauta.source_value === 'CADA 14 DIAS', 'pauta source_value preserved');
assert(pauta.semantic_status === PROVENANCE_ONLY, 'pauta provenance-only semantic status');
assert(pauta.provenance && pauta.provenance.raw !== undefined, 'pauta carries provenance');
assert(!r.contributions.some((c) => c.target === 'fhDermaPauta' || c.target === 'fhDermaPautaOtro'), 'no WO-D hydration into fhDermaPauta/fhDermaPautaOtro');
// Triangulation: route/dose allowlist behavior unchanged.
assert(contributionOf(r, 'requested_route')?.target === 'fhDermaVia', 'route exact equivalence still fhDermaVia');
assert(contributionOf(r, 'requested_dose')?.target === 'fhDermaDosis', 'dose still fhDermaDosis');
}

console.log('\n[WO-D] 13. medicamento_raw preserves the exact source value up to the field delimiter');
{
// Peripheral trim is authorized only for internal subgrammar components;
// the source evidence (value/source_value/provenance) is never rewritten.
const raw = 'Activo; HYRIMOZ (HYRIMOZ) ;SC;40 MG;CADA 14 DIAS;28';
const r = parsePreSaludRaw(raw);
const marca = contributionOf(r, 'commercial_name');
assert(marca && marca.source_value === ' HYRIMOZ (HYRIMOZ) ', 'commercial_name source_value is the exact field slice');
assert(marca.value === 'HYRIMOZ', 'brand value still the trimmed subgrammar component (internal use)');
const principio = contributionOf(r, 'principio_activo_raw');
assert(principio && principio.source_value === ' HYRIMOZ (HYRIMOZ) ', 'principio_activo_raw provenance keeps exact source slice');
assert(principio.value === 'HYRIMOZ', 'principio component trimmed internally only');
const rawUnmatched = 'Activo; HYRIMOZ ;SC;40 MG;CADA 14 DIAS;28';
const ru = parsePreSaludRaw(rawUnmatched);
const med = contributionOf(ru, 'medicamento');
assert(med && med.value === ' HYRIMOZ ' && med.source_value === ' HYRIMOZ ', 'unmatched medicamento preserves exact slice, never rewritten');
assert(!contributionOf(ru, 'commercial_name'), 'still zero brand proposal on unmatched subgrammar');
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(64));
console.log(`RESULTADO: ${passed} OK / ${failed} FALLIDO`);
if (failed === 0) {
    console.log('✓ WO-D PreSalud parser fixture battery PASSED');
} else {
    console.log('✗ WO-D PreSalud parser fixture battery FAILED');
    process.exit(1);
}
