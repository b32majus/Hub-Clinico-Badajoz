/* Informe trimestral Cosentyx (#576) — dedicated synthetic fixture.
 *
 * DEMO_CONTRACT_ONLY: the raw statistics projection carries no explicit
 * dispensing facts, so this versioned fixture supplies them explicitly for
 * the demo report. Nothing here may be inferred from validation, visits,
 * current treatment, requests, drug name or absent data. Not a capability
 * of the current raw Excel/source.
 *
 * Fact vocabulary per synthetic patient:
 * - patient_id: synthetic identifier
 * - pathology: explicit PsO / PsA / HS
 * - drug: explicit 'Cosentyx'
 * - first_dispensing_at: explicit first Cosentyx dispensing (ISO date-only) or null
 * - validated_at: explicit validation fact when present or null (VALIDATED != DISPENSED)
 * - current_treatment: explicit current-treatment flag (never a dispensing surrogate)
 * - initial_regime: explicitly recorded starting regime, preserved verbatim.
 *   Only 'q2w'/'q4w' classify; any other explicit value stays non-classifiable.
 *   null = explicitly unknown regime; omitted field = absent fact.
 * - regime_movements: explicit movements { from, to, effective_at }
 */
(function (root) {
    'use strict';

    var FIXTURE_ID = 'farmacia_cosentyx_informe_fixture_v1';

    function movement(from, to, effectiveAt) {
        return Object.freeze({ from: from, to: to, effective_at: effectiveAt });
    }

    var PATIENTS = [
        /* PsO — nuevos inicios */
        /* Régimen explícito fuera del vocabulario {q2w,q4w}: se conserva
           verbatim en la fila y nunca clasifica; inicio en el último día de
           Q1 (testigo de borde final inclusivo clasificable). */
        {
            patient_id: 'COS-PSO-001', pathology: 'PsO', drug: 'Cosentyx',
            first_dispensing_at: '2026-03-31', validated_at: null, current_treatment: false,
            initial_regime: 'q6w', regime_movements: []
        },
        {
            patient_id: 'COS-PSO-002', pathology: 'PsO', drug: 'Cosentyx',
            first_dispensing_at: '2026-04-01', validated_at: null, current_treatment: false,
            initial_regime: 'q4w', regime_movements: []
        },
        /* Negativo: validación sin dispensación -> no es nuevo inicio. */
        {
            patient_id: 'COS-PSO-003', pathology: 'PsO', drug: 'Cosentyx',
            first_dispensing_at: null, validated_at: '2026-04-05', current_treatment: false,
            initial_regime: null, regime_movements: []
        },
        {
            patient_id: 'COS-PSO-004', pathology: 'PsO', drug: 'Cosentyx',
            first_dispensing_at: '2026-07-03', validated_at: null, current_treatment: false,
            initial_regime: 'q2w', regime_movements: []
        },
        /* PsA — nuevos inicios */
        {
            patient_id: 'COS-PSA-001', pathology: 'PsA', drug: 'Cosentyx',
            first_dispensing_at: '2026-04-10', validated_at: null, current_treatment: false,
            initial_regime: 'q2w', regime_movements: []
        },
        /* Negativo: tratamiento actual sin primera dispensación explícita -> no es nuevo inicio.
           initial_regime omitido: campo ausente (distinto de null = desconocido explícito). */
        {
            patient_id: 'COS-PSA-002', pathology: 'PsA', drug: 'Cosentyx',
            first_dispensing_at: null, validated_at: null, current_treatment: true,
            regime_movements: []
        },
        /* HS — nuevos inicios q2w e intensificaciones */
        {
            patient_id: 'COS-HS-001', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-02-01', validated_at: null, current_treatment: false,
            initial_regime: 'q2w', regime_movements: []
        },
        /* Inicio en el último día de Q1 a q4w; intensificación el último día de Q2. */
        {
            patient_id: 'COS-HS-002', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-03-31', validated_at: null, current_treatment: false,
            initial_regime: 'q4w',
            regime_movements: [movement('q4w', 'q2w', '2026-06-30')]
        },
        /* Un paciente con dos hechos incluidos en el mismo trimestre (inicio q2w y
           después intensificación q4w -> q2w): demuestra que el total único no es
           la suma ciega de categorías. */
        {
            patient_id: 'COS-HS-003', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-04-02', validated_at: null, current_treatment: false,
            initial_regime: 'q2w',
            regime_movements: [movement('q2w', 'q4w', '2026-04-20'), movement('q4w', 'q2w', '2026-05-15')]
        },
        /* Negativo: q4w sin movimiento explícito q4w -> q2w -> no es intensificación. */
        {
            patient_id: 'COS-HS-004', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-04-03', validated_at: null, current_treatment: false,
            initial_regime: 'q4w', regime_movements: []
        },
        /* Negativo: dispensación explícita pero régimen inicial desconocido -> no clasificable. */
        {
            patient_id: 'COS-HS-005', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-04-07', validated_at: null, current_treatment: false,
            initial_regime: null, regime_movements: []
        }
    ];

    root.FarmaciaCosentyxInformeFixture = Object.freeze({
        VERSION: FIXTURE_ID,
        fixture_id: FIXTURE_ID,
        synthetic: true,
        demo_contract_only: true,
        provenance: Object.freeze({
            kind: 'synthetic_demo_fixture',
            fixture_id: FIXTURE_ID,
            notice: 'Datos sintéticos específicos del informe'
        }),
        patients: Object.freeze(PATIENTS.map(function (patient) { return Object.freeze(patient); }))
    });
})(typeof window !== 'undefined' ? window : globalThis);
