/* Informe de utilización y dosis — Kisqali (#579) — dedicated synthetic fixture.
 *
 * DEMO_CONTRACT_ONLY: 100% synthetic, purpose-built, versioned fixture of
 * observed monthly treatment cycles. Nothing here may be inferred from drug
 * name, catalogue, prior treatment, label, tray or absent data, and nothing
 * here represents real dispensing, consumption or adherence.
 *
 * Fact vocabulary per synthetic patient:
 * - patient_id: synthetic identifier
 * - cycles: explicit observed monthly treatment cycles, one row per
 *   cycle_month (duplicates fail closed in the model):
 *   - cycle_month: authoritative inclusion key, exact 'YYYY-MM'
 *   - cycle_start: explicit ISO date-only, used for traceability and
 *     boundary validation; must fall inside cycle_month
 *   - dose_mg: explicit positive numeric dose (200/400/600 are ordinary
 *     explicit doses; any other explicit positive number stays that exact
 *     dose) or null/absent = explicitly unknown dose. Zero is NOT a valid
 *     cycle dose in this demo contract: the Kisqali rest week is never
 *     modeled as 0 mg.
 *   - presentation_label: display/traceability only, preserved verbatim when
 *     explicit ('200 mg - 21' / '200 mg - 63'); independent of dose_mg and
 *     never used to derive, confirm or reject a dose.
 *   - dose_change: explicit cycle-boundary change fact
 *     { from_dose_mg, to_dose_mg, effective_at } or null/absent. A dose
 *     difference between adjacent cycles WITHOUT this explicit fact is never
 *     a change. effective_at must equal cycle_start (boundary change) or fall
 *     inside the same cycle month but after cycle_start (mid-cycle change,
 *     which makes the cycle non-evaluable for dose calculation in V1).
 */
(function (root) {
    'use strict';

    var FIXTURE_ID = 'farmacia_kisqali_informe_fixture_v1';

    function change(fromDose, toDose, effectiveAt) {
        return Object.freeze({
            from_dose_mg: fromDose,
            to_dose_mg: toDose,
            effective_at: effectiveAt
        });
    }

    function cycle(cycleMonth, cycleStart, doseMg, presentationLabel, doseChange) {
        var row = {
            cycle_month: cycleMonth,
            cycle_start: cycleStart,
            dose_mg: doseMg,
            presentation_label: presentationLabel
        };
        if (doseChange !== undefined) row.dose_change = doseChange;
        return Object.freeze(row);
    }

    /* Witness map (by construction):
     * - KIS-001: stable 400 x 6 => patient mean exactly 400.
     * - KIS-002: explicit 600 -> 400 boundary change (effective 2025-09-01 =
     *   cycle_start) => mean 1600/3 = 533.33.
     * - KIS-003: explicit 600 -> 400 -> 200 (boundary changes effective
     *   2026-02-01 and 2026-04-01) => mean 2000/6 = 333.33; spans 2026 months.
     * - KIS-004: unknown-dose cycle (2026-04) after a known 400 cycle; the
     *   closing cycle is unknown => proves no backfill for closing dose.
     * - KIS-005: explicit positive "other" dose (300) with presentation 63
     *   and 21 => presentation cannot determine dose; 300 is never coerced.
     * - KIS-006: adjacent doses 600 -> 400 WITHOUT any change fact => 0
     *   changes counted (no inference from adjacent rows).
     * - KIS-007: explicit mid-cycle change (400 -> 200 effective 2026-06-15,
     *   inside the cycle but not at cycle_start) => raw traceability preserved,
     *   non-evaluable for dose calculation, never prorated.
     * - Months span two calendar years (2025 and 2026) so Mensual, Trimestral,
     *   Anual and Histórico windows do not collapse to the same result.
     */
    var PATIENTS = [
        {
            patient_id: 'KIS-001',
            cycles: [
                cycle('2025-01', '2025-01-01', 400, '200 mg - 63'),
                cycle('2025-02', '2025-02-01', 400, '200 mg - 63'),
                cycle('2025-03', '2025-03-01', 400, '200 mg - 63'),
                cycle('2025-04', '2025-04-01', 400, '200 mg - 63'),
                cycle('2025-05', '2025-05-01', 400, '200 mg - 63'),
                cycle('2025-06', '2025-06-01', 400, '200 mg - 63')
            ]
        },
        {
            patient_id: 'KIS-002',
            cycles: [
                cycle('2025-07', '2025-07-01', 600, '200 mg - 63'),
                cycle('2025-08', '2025-08-01', 600, '200 mg - 63'),
                cycle('2025-09', '2025-09-01', 400, '200 mg - 21', change(600, 400, '2025-09-01'))
            ]
        },
        {
            patient_id: 'KIS-003',
            cycles: [
                cycle('2026-01', '2026-01-01', 600, '200 mg - 63'),
                cycle('2026-02', '2026-02-01', 400, '200 mg - 63', change(600, 400, '2026-02-01')),
                cycle('2026-03', '2026-03-01', 400, '200 mg - 21'),
                cycle('2026-04', '2026-04-01', 200, '200 mg - 21', change(400, 200, '2026-04-01')),
                cycle('2026-05', '2026-05-01', 200, '200 mg - 21'),
                cycle('2026-06', '2026-06-01', 200, '200 mg - 21')
            ]
        },
        {
            patient_id: 'KIS-004',
            cycles: [
                cycle('2026-03', '2026-03-01', 400, '200 mg - 21'),
                cycle('2026-04', '2026-04-01', null, null)
            ]
        },
        {
            patient_id: 'KIS-005',
            cycles: [
                cycle('2026-02', '2026-02-01', 300, '200 mg - 63'),
                cycle('2026-03', '2026-03-01', 300, '200 mg - 21')
            ]
        },
        {
            patient_id: 'KIS-006',
            cycles: [
                cycle('2026-05', '2026-05-01', 600, '200 mg - 63'),
                cycle('2026-06', '2026-06-01', 400, '200 mg - 63')
            ]
        },
        {
            patient_id: 'KIS-007',
            cycles: [
                cycle('2026-06', '2026-06-01', 400, '200 mg - 21', change(400, 200, '2026-06-15'))
            ]
        }
    ];

    root.FarmaciaKisqaliInformeFixture = Object.freeze({
        VERSION: FIXTURE_ID,
        fixture_id: FIXTURE_ID,
        synthetic: true,
        demo_contract_only: true,
        provenance: Object.freeze({
            kind: 'synthetic_demo_fixture',
            fixture_id: FIXTURE_ID,
            notice: 'Datos sintéticos específicos del informe'
        }),
        patients: Object.freeze(PATIENTS.map(function (patient) {
            return Object.freeze({
                patient_id: patient.patient_id,
                cycles: Object.freeze(patient.cycles.slice())
            });
        }))
    });
})(typeof window !== 'undefined' ? window : globalThis);
