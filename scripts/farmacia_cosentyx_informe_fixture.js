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
 * - discontinued_at: explicit treatment-discontinuation fact (ISO date-only)
 *   or null (explicitly unknown date); omitted field = no recorded
 *   discontinuation fact. NEVER deduced from missing cycles/dispensations.
 *   The event delimits its own quarterly date; listQuarters collects it.
 * - regime_at_discontinuation: explicitly recorded regimen at the
 *   discontinuation event. Only exact 'q2w' classifies for the HS
 *   discontinuation category; it is never guessed from the initial or
 *   current prescription and may legitimately differ from initial_regime.
 *   null = explicitly unknown; omitted field = absent fact; any other
 *   explicit value stays non-classifiable.
 * - reason: explicitly recorded discontinuation reason (free synthetic
 *   string) or omitted field = absent fact (no cause invented). Only
 *   meaningful on a dated discontinuation row; never inferred.
 * - Status coherence: every patient carrying a dated discontinued_at fact
 *   records current_treatment: false and no active current regimen, so a
 *   discontinued patient can never read as active. A patient whose
 *   discontinuation fact is undated (discontinued_at null) keeps
 *   current_treatment: true: the undated fact includes nothing.
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
        },
        /* HS — reducción de frecuencia q2w -> q4w (positivo): inicio q2w en Q2
           y movimiento explícito q2w -> q4w dentro de Q2. Mismo paciente con
           dos hechos en el trimestre (inicio + reducción): el total único lo
           cuenta una vez. Estado actual q4w registrado, no derivado. */
        {
            patient_id: 'COS-HS-008', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-05-04', validated_at: null, current_treatment: true,
            initial_regime: 'q2w',
            regime_movements: [movement('q2w', 'q4w', '2026-06-10')],
            presentation_label: '150 mg', current_regime: 'q4w'
        },
        /* HS — inicio q2w en Q1 y discontinuación explícita en el último día
           de Q3 (borde final inclusivo) con régimen en el hecho q2w y motivo
           registrado. current_treatment: false y sin régimen actual: un
           discontinuado nunca se presenta como activo. El régimen en el
           hecho es explícito, no deducido de la prescripción inicial. */
        {
            patient_id: 'COS-HS-009', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-02-10', validated_at: null, current_treatment: false,
            initial_regime: 'q2w', regime_movements: [],
            presentation_label: '300 mg',
            discontinued_at: '2026-09-30', regime_at_discontinuation: 'q2w',
            reason: 'motivo administrativo registrado'
        },
        /* HS — testigo del trimestre SOLO con discontinuación (Q4): primera
           dispensación Q1 a q4w (no es inicio HS q2w), sin movimientos, y
           discontinuación explícita el primer día de Q4 (borde inicial
           inclusivo) con régimen en el hecho q2w. Motivo explícito y ficticio
           registrado en el propio registro sintético ('Decisión clínica
           documentada'): hecho demo declarado, no inferencia. La ausencia de
           motivo se sigue probando solo con una variante local del checker
           (clon sin reason). Nótese que el régimen inicial
           (q4w) difiere del régimen en el hecho (q2w): el hecho manda. */
        {
            patient_id: 'COS-HS-010', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-01-20', validated_at: null, current_treatment: false,
            initial_regime: 'q4w', regime_movements: [],
            presentation_label: '150 mg',
            discontinued_at: '2026-10-01', regime_at_discontinuation: 'q2w',
            reason: 'Decisión clínica documentada'
        },
        /* Negativo: discontinuación SIN fecha (discontinued_at null =
           explícitamente desconocida) -> nunca incluye, aunque el régimen en
           el hecho sea q2w. Sigue en tratamiento actual: el hecho sin fecha
           no delimita trimestre. */
        {
            patient_id: 'COS-HS-011', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-05-18', validated_at: null, current_treatment: true,
            initial_regime: 'q4w', regime_movements: [],
            presentation_label: '300 mg', current_regime: 'q4w',
            discontinued_at: null, regime_at_discontinuation: 'q2w'
        },
        /* Negativo: discontinuación con fecha DENTRO del trimestre (2026-06-05,
           Q2) pero régimen en el hecho q4w (no q2w) -> excluida de la categoría
           HS. La fecha por sí sola no incluye. Discontinuado registrado como
           no activo (current_treatment: false). */
        {
            patient_id: 'COS-HS-012', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-05-19', validated_at: null, current_treatment: false,
            initial_regime: 'q4w', regime_movements: [],
            presentation_label: '150 mg',
            discontinued_at: '2026-06-05', regime_at_discontinuation: 'q4w',
            reason: 'motivo administrativo registrado'
        },
        /* Negativo: movimiento q2w -> q4w SIN fecha efectiva -> no es
           reducción. Dispensación Q2 a q4w: tampoco es inicio HS q2w. */
        {
            patient_id: 'COS-HS-013', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-04-22', validated_at: null, current_treatment: true,
            initial_regime: 'q4w',
            regime_movements: [movement('q2w', 'q4w', null)],
            presentation_label: '150 mg', current_regime: 'q4w'
        },
        /* Negativo: discontinuación con fecha DENTRO del trimestre (2026-06-20,
           Q2) pero régimen en el hecho ausente (campo omitido) -> no
           clasificable para esta categoría. Motivo también ausente. */
        {
            patient_id: 'COS-HS-014', pathology: 'HS', drug: 'Cosentyx',
            first_dispensing_at: '2026-06-02', validated_at: null, current_treatment: false,
            initial_regime: 'q4w', regime_movements: [],
            presentation_label: '150 mg',
            discontinued_at: '2026-06-20'
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
