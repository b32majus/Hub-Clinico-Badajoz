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
 *   Demo cases use q4w (PsO/PsA) and q2w/q4w (HS). No q6w appears in the
 *   visible demo fixture; the engine still represents out-of-vocabulary
 *   explicit regimes verbatim (q6w witness lives checker-local, test-only).
 * - regime_movements: explicit movements { from, to, effective_at }
 * - presentation_label: explicitly recorded presentation for that synthetic
 *   record ('150 mg' / '300 mg'). It names the recorded presentation only:
 *   it is NOT the administered dose and it is never inferred from brand,
 *   regime, pathology, dispensing or transition. Omitted field = absent fact
 *   (no presentation recorded for that record).
 * - current_regime: explicitly recorded current-status regime, independent of
 *   initial_regime, movements, drug and presentation. null = explicitly
 *   unknown current status; omitted field = absent fact. T2 records these
 *   facts only; projection into computeReport/detail_rows/XLSX/UI belongs to
 *   a later ticket.
 */
(function (root) {
    'use strict';

    var FIXTURE_ID = 'farmacia_cosentyx_informe_fixture_v1';

    function movement(from, to, effectiveAt) {
        return Object.freeze({ from: from, to: to, effective_at: effectiveAt });
    }

    var PATIENTS = [
        /* PsO — nuevos inicios (demo: q4w explícito).
           Inicio en el último día de Q1 (testigo de borde final inclusivo). */
        {
            patient_id: 'COS-PSO-001', pathology: 'PsO', drug: 'Cosentyx',
            first_dispensing_at: '2026-03-31', validated_at: null, current_treatment: true,
            initial_regime: 'q4w', regime_movements: [],
            presentation_label: '150 mg', current_regime: 'q4w'
        },
        /* Inicio en el primer día de Q2 (testigo de borde inicial inclusivo). */
        {
            patient_id: 'COS-PSO-002', pathology: 'PsO', drug: 'Cosentyx',
            first_dispensing_at: '2026-04-01', validated_at: null, current_treatment: true,
            initial_regime: 'q4w', regime_movements: [],
            presentation_label: '300 mg', current_regime: 'q4w'
        },
        /* Negativo: validación sin dispensación -> no es nuevo inicio.
           Sin presentation_label ni current_regime: hechos ausentes. */
        {
            patient_id: 'COS-PSO-003', pathology: 'PsO', drug: 'Cosentyx',
            first_dispensing_at: null, validated_at: '2026-04-05', current_treatment: false,
            initial_regime: null, regime_movements: []
        },
        {
            patient_id: 'COS-PSO-004', pathology: 'PsO', drug: 'Cosentyx',
            first_dispensing_at: '2026-07-03', validated_at: null, current_treatment: true,
            initial_regime: 'q4w', regime_movements: [],
            presentation_label: '150 mg', current_regime: 'q4w'
        },
        /* Segundo inicio PsO de Q2: el trimestre representativo enseña 2 PsO. */
        {
            patient_id: 'COS-PSO-005', pathology: 'PsO', drug: 'Cosentyx',
            first_dispensing_at: '2026-05-06', validated_at: null, current_treatment: true,
            initial_regime: 'q4w', regime_movements: [],
            presentation_label: '300 mg', current_regime: 'q4w'
        },
        /* PsA — nuevos inicios (demo: q4w explícito) */
        {
            patient_id: 'COS-PSA-001', pathology: 'PsA', drug: 'Cosentyx',
            first_dispensing_at: '2026-04-10', validated_at: null, current_treatment: true,
            initial_regime: 'q4w', regime_movements: [],
            presentation_label: '150 mg', current_regime: 'q4w'
        },
        /* Negativo: tratamiento actual sin primera dispensación explícita -> no es nuevo inicio.
            initial_regime omitido: campo ausente (distinto de null = desconocido explícito).
            presentation_label omitida (ausente); current_regime null = estado actual
            explícitamente desconocido. */
        {
            patient_id: 'COS-PSA-002', pathology: 'PsA', drug: 'Cosentyx',
            first_dispensing_at: null, validated_at: null, current_treatment: true,
            regime_movements: [],
            current_regime: null
        },
        /* Segundo inicio PsA de Q2: el trimestre representativo enseña 2 PsA. */
        {
            patient_id: 'COS-PSA-003', pathology: 'PsA', drug: 'Cosentyx',
            first_dispensing_at: '2026-05-12', validated_at: null, current_treatment: true,
            initial_regime: 'q4w', regime_movements: [],
            presentation_label: '300 mg', current_regime: 'q4w'
        },
        /* HS — nuevos inicios q2w e intensificaciones */
        {
            patient_id: 'COS-HS-001', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-02-01', validated_at: null, current_treatment: true,
            initial_regime: 'q2w', regime_movements: [],
            presentation_label: '300 mg', current_regime: 'q2w'
        },
        /* Inicio en el último día de Q1 a q4w (no es inicio HS q2w);
           intensificación el último día de Q2. Estado actual q2w registrado
           explícitamente, no derivado del movimiento. */
        {
            patient_id: 'COS-HS-002', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-03-31', validated_at: null, current_treatment: true,
            initial_regime: 'q4w',
            regime_movements: [movement('q4w', 'q2w', '2026-06-30')],
            presentation_label: '150 mg', current_regime: 'q2w'
        },
        /* Un paciente con dos hechos incluidos en el mismo trimestre (inicio q2w y
           después intensificación q4w -> q2w): demuestra que el total único no es
           la suma ciega de categorías. */
        {
            patient_id: 'COS-HS-003', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-04-02', validated_at: null, current_treatment: true,
            initial_regime: 'q2w',
            regime_movements: [movement('q2w', 'q4w', '2026-04-20'), movement('q4w', 'q2w', '2026-05-15')],
            presentation_label: '300 mg', current_regime: 'q2w'
        },
        /* Negativo: q4w sin movimiento explícito q4w -> q2w -> no es intensificación. */
        {
            patient_id: 'COS-HS-004', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-04-03', validated_at: null, current_treatment: true,
            initial_regime: 'q4w', regime_movements: [],
            presentation_label: '150 mg', current_regime: 'q4w'
        },
        /* Negativo: dispensación explícita pero régimen inicial desconocido -> no clasificable.
           La presentación sí está registrada ('150 mg'): presentar no implica régimen.
           Estado actual explícitamente desconocido (null), sin tratamiento actual. */
        {
            patient_id: 'COS-HS-005', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-04-07', validated_at: null, current_treatment: false,
            initial_regime: null, regime_movements: [],
            presentation_label: '150 mg', current_regime: null
        },
        /* Segundo inicio HS q2w de Q2: el trimestre representativo enseña 2. */
        {
            patient_id: 'COS-HS-006', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-04-15', validated_at: null, current_treatment: true,
            initial_regime: 'q2w', regime_movements: [],
            presentation_label: '300 mg', current_regime: 'q2w'
        },
        /* Inicio Q3 en el primer día del trimestre (borde inicial inclusivo) a q4w:
           no es inicio HS q2w; intensificación q4w -> q2w dentro de Q3. */
        {
            patient_id: 'COS-HS-007', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-07-01', validated_at: null, current_treatment: true,
            initial_regime: 'q4w',
            regime_movements: [movement('q4w', 'q2w', '2026-08-20')],
            presentation_label: '150 mg', current_regime: 'q2w'
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
