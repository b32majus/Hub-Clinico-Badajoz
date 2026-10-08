#!/usr/bin/env node
/* #576 Informe trimestral Cosentyx — deterministic model checker.
 *
 * Independent oracle: the expected results below are hand-derived from the
 * versioned synthetic fixture contract (farmacia_cosentyx_informe_fixture_v1),
 * not from the model implementation. The checker may disagree with the model.
 *
 * Closed temporal contract: ISO date-only YYYY-MM-DD, calendar quarter
 * YYYY-Q1..Q4, inclusive start/end boundaries, no Date.now()/local time.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
require(path.join(ROOT, 'scripts/farmacia_cosentyx_informe_fixture.js'));
require(path.join(ROOT, 'scripts/farmacia_cosentyx_informe_model.js'));
const Fixture = globalThis.FarmaciaCosentyxInformeFixture;
const Informe = globalThis.FarmaciaCosentyxInforme;
const XLSX = require(path.join(ROOT, 'vendor/sheetjs/xlsx.full.min.js'));

/* Hand-derived expectations from the fixture contract.
 *
 * Fixture witnesses (by construction):
 * - COS-PSO-001 first dispensing 2026-03-31 (Q1 LAST day, classifiable)     -> Q1 PsO start
 *   with explicit regime 'q4w'; presentation '150 mg', current 'q4w'
 * - COS-PSO-002 first dispensing 2026-04-01 (Q2 FIRST day boundary)          -> Q2 PsO start
 * - COS-PSO-003 validation 2026-04-05, NO dispensing; NO presentation_label,
 *   NO current_regime (absent facts)                                        -> never a start
 * - COS-PSO-004 first dispensing 2026-07-03                                 -> Q3 PsO start
 * - COS-PSO-005 first dispensing 2026-05-06                                 -> Q2 PsO start (Q2 shows 2 PsO)
 * - COS-PSA-001 first dispensing 2026-04-10                                 -> Q2 PsA start
 * - COS-PSA-002 current treatment, NO dispensing; initial_regime omitted (absent),
 *   NO presentation_label (absent), current_regime null (explicitly unknown) -> never a start
 * - COS-PSA-003 first dispensing 2026-05-12                                 -> Q2 PsA start (Q2 shows 2 PsA)
 * - COS-HS-001  first dispensing 2026-02-01, regime q2w    -> Q1 HS q2w start
 * - COS-HS-002  first dispensing 2026-03-31 (Q1 LAST day) at q4w -> no HS q2w start;
 *               movement q4w->q2w effective 2026-06-30 (Q2 LAST day) -> Q2 intensification
 * - COS-HS-003  first dispensing 2026-04-02 at q2w -> Q2 HS q2w start;
 *               movements q2w->q4w 2026-04-20 and q4w->q2w 2026-05-15 -> Q2 intensification
 *               (same patient, two inclusion facts -> blind sum != unique total in Q2)
 * - COS-HS-004  first dispensing 2026-04-03 at q4w, no movement -> never intensification
 * - COS-HS-005  first dispensing 2026-04-07, regime explicitly unknown (null) -> non-classifiable;
 *               presentation '150 mg' recorded anyway (presentation never implies regime),
 *               current_regime null (explicitly unknown)
 * - COS-HS-006  first dispensing 2026-04-15 at q2w -> Q2 HS q2w start (Q2 shows 2)
 * - COS-HS-007  first dispensing 2026-07-01 (Q3 FIRST day boundary) at q4w
 *               -> no HS q2w start; movement q4w->q2w effective 2026-08-20 -> Q3 intensification
 *
 * NO q6w anywhere in the visible fixture. The q6w negative witness lives ONLY
 * as checker-local variants (see section 5b): an out-of-vocabulary explicit
 * regime stays verbatim and never classifies.
 */
const EXPECTED = {
    '2026-Q1': {
        counts: { pso_start: 1, psa_start: 0, hs_start_q2w: 1, hs_intensification: 0 },
        unique: 2,
        rows: [
            ['COS-PSO-001', 'PsO', 'PsO — nuevo inicio', '2026-03-31', 'q4w'],
            ['COS-HS-001', 'HS', 'HS — nuevo inicio q2w', '2026-02-01', 'q2w']
        ]
    },
    '2026-Q2': {
        counts: { pso_start: 2, psa_start: 2, hs_start_q2w: 2, hs_intensification: 2 },
        unique: 7,
        rows: [
            ['COS-PSO-002', 'PsO', 'PsO — nuevo inicio', '2026-04-01', 'q4w'],
            ['COS-PSO-005', 'PsO', 'PsO — nuevo inicio', '2026-05-06', 'q4w'],
            ['COS-PSA-001', 'PsA', 'PsA — nuevo inicio', '2026-04-10', 'q4w'],
            ['COS-PSA-003', 'PsA', 'PsA — nuevo inicio', '2026-05-12', 'q4w'],
            ['COS-HS-003', 'HS', 'HS — nuevo inicio q2w', '2026-04-02', 'q2w'],
            ['COS-HS-006', 'HS', 'HS — nuevo inicio q2w', '2026-04-15', 'q2w'],
            ['COS-HS-003', 'HS', 'HS — intensificación q4w → q2w', '2026-05-15', 'q4w → q2w'],
            ['COS-HS-002', 'HS', 'HS — intensificación q4w → q2w', '2026-06-30', 'q4w → q2w']
        ]
    },
    '2026-Q3': {
        counts: { pso_start: 1, psa_start: 0, hs_start_q2w: 0, hs_intensification: 1 },
        unique: 2,
        rows: [
            ['COS-PSO-004', 'PsO', 'PsO — nuevo inicio', '2026-07-03', 'q4w'],
            ['COS-HS-007', 'HS', 'HS — intensificación q4w → q2w', '2026-08-20', 'q4w → q2w']
        ]
    }
};
const QUARTERS = Object.keys(EXPECTED);
const NEGATIVE_PATIENTS = ['COS-PSO-003', 'COS-PSA-002', 'COS-HS-004', 'COS-HS-005'];

const reports = {};
for (const quarter of QUARTERS) reports[quarter] = Informe.computeReport(Fixture, quarter);

const failures = [];
let passed = 0;
function check(name, fn) {
    try {
        fn();
        passed += 1;
        console.log('PASS ' + name);
    } catch (error) {
        failures.push(name);
        console.log('FAIL ' + name + ' — ' + error.message);
    }
}

function rowTuples(report) {
    return report.detail_rows.map(row =>
        [row.patient_id, row.pathology, row.case_type, row.fact_date, row.regime]);
}

/* Deep clone for model-level variant probes; JSON keeps explicit nulls and
 * drops nothing else we rely on (all fixture facts are JSON-representable). */
function cloneFixture() {
    return JSON.parse(JSON.stringify(Fixture));
}

/* 1. Fixture contract: provenance + every mandatory negative witness exists. */
check('fixture: synthetic provenance', () => {
    assert.equal(Fixture.synthetic, true);
    assert.equal(Fixture.fixture_id, 'farmacia_cosentyx_informe_fixture_v1');
    assert.equal(Fixture.provenance.kind, 'synthetic_demo_fixture');
    assert.equal(Fixture.provenance.notice, 'Datos sintéticos específicos del informe');
});
check('fixture: validation-only negative witness (VALIDATED != DISPENSED)', () => {
    const patient = Fixture.patients.find(p => p.patient_id === 'COS-PSO-003');
    assert.ok(patient, 'COS-PSO-003 must exist');
    assert.equal(typeof patient.validated_at, 'string', 'explicit validation fact');
    assert.equal(patient.first_dispensing_at, null, 'no dispensing fact');
});
check('fixture: current-treatment-only negative witness', () => {
    const patient = Fixture.patients.find(p => p.patient_id === 'COS-PSA-002');
    assert.ok(patient, 'COS-PSA-002 must exist');
    assert.equal(patient.current_treatment, true);
    assert.equal(patient.first_dispensing_at, null, 'no explicit first dispensing');
});
check('fixture: HS q4w without movement negative witness', () => {
    const patient = Fixture.patients.find(p => p.patient_id === 'COS-HS-004');
    assert.ok(patient, 'COS-HS-004 must exist');
    assert.equal(patient.initial_regime, 'q4w');
    assert.equal(patient.regime_movements.length, 0, 'no q4w->q2w movement recorded');
    assert.equal(typeof patient.first_dispensing_at, 'string');
});
check('fixture: unknown-regime witness (missing fact stays unknown)', () => {
    const patient = Fixture.patients.find(p => p.patient_id === 'COS-HS-005');
    assert.ok(patient, 'COS-HS-005 must exist');
    assert.equal(typeof patient.first_dispensing_at, 'string');
    assert.equal(patient.initial_regime, null, 'null = explicitly unknown regime, not filled from convenience');
});
check('fixture: no q6w anywhere in the visible demo fixture', () => {
    for (const patient of Fixture.patients) {
        assert.notEqual(patient.initial_regime, 'q6w', `${patient.patient_id} must not carry q6w`);
        for (const move of (patient.regime_movements || [])) {
            assert.notEqual(move && move.from, 'q6w', `${patient.patient_id} movement must not come from q6w`);
            assert.notEqual(move && move.to, 'q6w', `${patient.patient_id} movement must not go to q6w`);
        }
    }
    assert.equal(JSON.stringify(Fixture.patients).includes('q6w'), false,
        'the visible demo fixture must not mention q6w at all');
});
check('fixture: explicit presentation_label facts recorded, never inferred', () => {
    const PRESENTATIONS = ['150 mg', '300 mg'];
    const withPresentation = Fixture.patients.filter(p => 'presentation_label' in p);
    assert.ok(withPresentation.length >= 10, 'most demo records carry an explicit presentation');
    for (const patient of withPresentation) {
        assert.ok(PRESENTATIONS.includes(patient.presentation_label),
            `${patient.patient_id} presentation must be an explicitly recorded 150/300 mg fact`);
    }
    /* Spot witnesses: presentation varies independently of regime/pathology. */
    assert.equal(Fixture.patients.find(p => p.patient_id === 'COS-PSO-001').presentation_label, '150 mg');
    assert.equal(Fixture.patients.find(p => p.patient_id === 'COS-PSO-002').presentation_label, '300 mg');
    assert.equal(Fixture.patients.find(p => p.patient_id === 'COS-HS-004').presentation_label, '150 mg');
    assert.equal(Fixture.patients.find(p => p.patient_id === 'COS-HS-006').presentation_label, '300 mg');
    /* Presentation recorded even when the regime is unknown: no regime inference. */
    assert.equal(Fixture.patients.find(p => p.patient_id === 'COS-HS-005').presentation_label, '150 mg');
    /* Meaningful absence preserved: validation-only record carries no presentation. */
    assert.ok(!('presentation_label' in Fixture.patients.find(p => p.patient_id === 'COS-PSO-003')),
        'validation-only COS-PSO-003 keeps presentation absent, not defaulted');
    assert.ok(!('presentation_label' in Fixture.patients.find(p => p.patient_id === 'COS-PSA-002')),
        'current-treatment-only COS-PSA-002 keeps presentation absent, not defaulted');
});
check('fixture: explicit current_regime facts recorded independently, absence preserved', () => {
    /* Spot witnesses: current status recorded independently of starting regime. */
    assert.equal(Fixture.patients.find(p => p.patient_id === 'COS-HS-002').current_regime, 'q2w',
        'post-intensification current status is recorded, not derived by this checker');
    assert.equal(Fixture.patients.find(p => p.patient_id === 'COS-HS-004').current_regime, 'q4w');
    assert.equal(Fixture.patients.find(p => p.patient_id === 'COS-PSO-005').current_regime, 'q4w');
    assert.equal(Fixture.patients.find(p => p.patient_id === 'COS-HS-007').current_regime, 'q2w');
    /* Unknown (null) vs absent (omitted) stay distinguishable. */
    assert.equal(Fixture.patients.find(p => p.patient_id === 'COS-HS-005').current_regime, null,
        'null = explicitly unknown current status');
    assert.equal(Fixture.patients.find(p => p.patient_id === 'COS-PSA-002').current_regime, null,
        'null = explicitly unknown current status');
    assert.ok(!('current_regime' in Fixture.patients.find(p => p.patient_id === 'COS-PSO-003')),
        'validation-only COS-PSO-003 keeps current status absent, not defaulted');
    /* Independence: starting regime and current status are separate facts. */
    const diverged = Fixture.patients.find(p => p.patient_id === 'COS-HS-002');
    assert.equal(diverged.initial_regime, 'q4w');
    assert.equal(diverged.current_regime, 'q2w');
    assert.notEqual(diverged.initial_regime, diverged.current_regime,
        'initial and current regimes are independent facts on the same record');
});

/* 2. Quarter selector derived from fixture facts; closed temporal ranges. */
check('quarters: derived from fixture facts', () => {
    assert.deepEqual(Informe.listQuarters(Fixture), QUARTERS);
});
check('quarters: inclusive ISO ranges', () => {
    assert.deepEqual(
        [Informe.quarterRange('2026-Q1').start, Informe.quarterRange('2026-Q1').end],
        ['2026-01-01', '2026-03-31']);
    assert.deepEqual(
        [Informe.quarterRange('2026-Q2').start, Informe.quarterRange('2026-Q2').end],
        ['2026-04-01', '2026-06-30']);
    assert.deepEqual(
        [Informe.quarterRange('2026-Q3').start, Informe.quarterRange('2026-Q3').end],
        ['2026-07-01', '2026-09-30']);
});

/* 3. Counts, detail rows and unique totals per quarter (hand-derived). */
for (const quarter of QUARTERS) {
    check(`report ${quarter}: category counts match the fixture facts`, () => {
        assert.deepEqual(reports[quarter].counts_by_category, EXPECTED[quarter].counts);
    });
    check(`report ${quarter}: detail rows are exactly the justifying facts`, () => {
        assert.deepEqual(rowTuples(reports[quarter]), EXPECTED[quarter].rows);
    });
    check(`report ${quarter}: unique-patient total matches detail rows`, () => {
        assert.equal(reports[quarter].unique_patient_count, EXPECTED[quarter].unique);
    });
    check(`report ${quarter}: every fact date inside the inclusive quarter range`, () => {
        const range = Informe.quarterRange(quarter);
        for (const row of reports[quarter].detail_rows) {
            assert.ok(range.start <= row.fact_date && row.fact_date <= range.end,
                `${row.fact_date} outside ${range.start}..${range.end}`);
        }
    });
}

/* 4. At least two quarters produce different computed outputs. */
check('quarters: computed outputs differ across all exposed quarters', () => {
    const serialized = QUARTERS.map(q => JSON.stringify(reports[q].counts_by_category));
    assert.equal(new Set(serialized).size, QUARTERS.length);
});

/* 5. Inclusive boundary witnesses. */
check('boundary: dispensing on Q2 first day (2026-04-01) belongs to Q2, not Q1', () => {
    assert.ok(reports['2026-Q1'].detail_rows.every(row => row.patient_id !== 'COS-PSO-002'));
    const row = reports['2026-Q2'].detail_rows.find(row => row.patient_id === 'COS-PSO-002');
    assert.ok(row, 'COS-PSO-002 must be included in Q2');
    assert.equal(row.fact_date, '2026-04-01');
});
check('boundary: classifiable new start on Q1 last day (2026-03-31) is included in Q1 with fact_date 2026-03-31, not in Q2', () => {
    const q1Row = reports['2026-Q1'].detail_rows.find(row => row.patient_id === 'COS-PSO-001');
    assert.ok(q1Row, 'COS-PSO-001 classifiable new start must be included in Q1');
    assert.equal(q1Row.fact_date, '2026-03-31', 'fact_date is exactly the quarter final day');
    assert.equal(q1Row.case_type, 'PsO — nuevo inicio');
    assert.ok(reports['2026-Q2'].detail_rows.every(row => row.patient_id !== 'COS-PSO-001'),
        'Q1 last-day new start must not leak into the adjacent quarter Q2');
});
check('boundary: movement effective on Q2 last day (2026-06-30) is a Q2 intensification, not Q3', () => {
    const q2Row = reports['2026-Q2'].detail_rows.find(row => row.patient_id === 'COS-HS-002');
    assert.ok(q2Row, 'COS-HS-002 intensification must be in Q2');
    assert.equal(q2Row.fact_date, '2026-06-30');
    assert.equal(q2Row.case_type, 'HS — intensificación q4w → q2w');
    assert.ok(reports['2026-Q3'].detail_rows.every(row => row.patient_id !== 'COS-HS-002'));
});
check('boundary: q4w start on Q1 last day is NOT an HS q2w start', () => {
    assert.ok(reports['2026-Q1'].detail_rows.every(row => row.patient_id !== 'COS-HS-002'));
});
check('boundary: q4w dispensing on Q3 first day (2026-07-01) belongs to Q3 and is NOT an HS q2w start', () => {
    assert.ok(reports['2026-Q2'].detail_rows.every(row => row.patient_id !== 'COS-HS-007'),
        'Q3 first-day dispensing must not leak into Q2');
    assert.ok(reports['2026-Q3'].detail_rows.every(row =>
        !(row.patient_id === 'COS-HS-007' && row.case_type === 'HS — nuevo inicio q2w')),
        'a q4w start is never an HS q2w start, even on the quarter first day');
    const intensification = reports['2026-Q3'].detail_rows.find(row => row.patient_id === 'COS-HS-007');
    assert.ok(intensification, 'COS-HS-007 intensification must be in Q3');
    assert.equal(intensification.fact_date, '2026-08-20');
    assert.equal(intensification.case_type, 'HS — intensificación q4w → q2w');
});

/* 5b. Gate 2 — regime evidence representation: recorded values survive
 * verbatim; null = explicitly unknown and omitted field = absent; both stay
 * non-classifiable (fail-closed) and both remain distinguishable.
 * The out-of-vocabulary witness (q6w) is CHECKER-LOCAL ONLY: the visible
 * demo fixture carries no q6w (see 'fixture: no q6w anywhere'), and these
 * variants prove the engine still represents an explicit out-of-vocabulary
 * regime verbatim without classifying it. Variants never touch the demo
 * fixture population. */
check('regime: checker-local q6w witness survives verbatim into the detail row and never classifies', () => {
    assert.ok(rowTuples(reports['2026-Q1']).every(tuple => tuple[4] !== 'No registrado'),
        'no recorded value may be erased into the unknown label');
    /* Verbatim retention: a PsO start with a checker-local explicit q6w keeps it. */
    const verbatim = cloneFixture();
    verbatim.patients.find(patient => patient.patient_id === 'COS-PSO-002').initial_regime = 'q6w';
    const verbatimReport = Informe.computeReport(verbatim, '2026-Q2');
    const verbatimRow = verbatimReport.detail_rows.find(row => row.patient_id === 'COS-PSO-002');
    assert.ok(verbatimRow, 'COS-PSO-002 is a PsO start regardless of its regime');
    assert.equal(verbatimRow.regime, 'q6w', 'explicitly recorded regime preserved verbatim, not collapsed to unknown');
    assert.deepEqual(verbatimReport.counts_by_category, EXPECTED['2026-Q2'].counts,
        'an out-of-vocabulary PsO regime changes no category count');
    /* Classification gate stays closed: an HS dispensing with an explicit
     * out-of-vocabulary regime is never an HS q2w start nor any other case. */
    const variant = cloneFixture();
    variant.patients.find(patient => patient.patient_id === 'COS-HS-001').initial_regime = 'q6w';
    const q1 = Informe.computeReport(variant, '2026-Q1');
    assert.ok(q1.detail_rows.every(row => row.patient_id !== 'COS-HS-001'),
        'out-of-vocabulary explicit regime must not classify as an HS q2w start');
    assert.equal(q1.counts_by_category.hs_start_q2w, 0);
});
check('regime: explicitly unknown (null) vs absent field stay non-classifiable and remain distinguishable', () => {
    /* Fixture representation keeps both states distinct. */
    const unknown = Fixture.patients.find(patient => patient.patient_id === 'COS-HS-005');
    assert.equal(unknown.initial_regime, null, 'null = explicitly unknown regime');
    const absent = Fixture.patients.find(patient => patient.patient_id === 'COS-PSA-002');
    assert.ok(!('initial_regime' in absent), 'omitted field = absent, not null');
    /* Model representation: the detail row preserves null vs undefined. */
    const withNull = cloneFixture();
    withNull.patients.find(patient => patient.patient_id === 'COS-PSO-001').initial_regime = null;
    const withAbsent = cloneFixture();
    delete withAbsent.patients.find(patient => patient.patient_id === 'COS-PSO-001').initial_regime;
    const nullRow = Informe.computeReport(withNull, '2026-Q1').detail_rows
        .find(row => row.patient_id === 'COS-PSO-001');
    const absentRow = Informe.computeReport(withAbsent, '2026-Q1').detail_rows
        .find(row => row.patient_id === 'COS-PSO-001');
    assert.equal(nullRow.regime, null, 'explicitly unknown stays null in the row');
    assert.equal(absentRow.regime, undefined, 'absent fact stays undefined in the row');
    assert.notEqual(nullRow.regime, absentRow.regime, 'unknown and absent remain distinguishable');
    /* Both fail closed: HS with unknown OR absent regime never becomes an HS q2w start. */
    const mutations = [
        fixture => { fixture.patients.find(patient => patient.patient_id === 'COS-HS-001').initial_regime = null; },
        fixture => { delete fixture.patients.find(patient => patient.patient_id === 'COS-HS-001').initial_regime; }
    ];
    for (const mutate of mutations) {
        const variant = cloneFixture();
        mutate(variant);
        const report = Informe.computeReport(variant, '2026-Q1');
        assert.ok(report.detail_rows.every(row => row.patient_id !== 'COS-HS-001'),
            'unknown/absent regime never classifies as an HS q2w start');
        assert.equal(report.counts_by_category.hs_start_q2w, 0);
    }
});

/* 5c. F1 — Gate 2 presentation projection (shared formatter, UI + XLSX).
 * Adversarial witness: the SAME included PsO start computed twice, once with
 * initial_regime = null (explicitly unknown) and once with the field absent.
 * The checker-local variants never touch the demo fixture population. */
check('presentation: shared regimeDisplay formatter maps the three model states to three distinct labels', () => {
    assert.equal(typeof Informe.regimeDisplay, 'function',
        'the shared formatter must be exposed on the model global');
    assert.equal(Informe.regimeDisplay('q2w'), 'q2w', 'in-vocabulary explicit string verbatim');
    assert.equal(Informe.regimeDisplay('q6w'), 'q6w', 'out-of-vocabulary explicit string verbatim');
    assert.equal(Informe.regimeDisplay(null), 'Desconocido', 'null = explicitly unknown');
    assert.equal(Informe.regimeDisplay(undefined), 'No registrado', 'undefined = absent fact');
    assert.notEqual(Informe.regimeDisplay(null), Informe.regimeDisplay(undefined),
        'unknown and absent must not collapse at presentation time');
});
check('presentation F1 witness: null vs absent regime stay distinct through model -> formatter -> XLSX Detalle; counts unchanged', () => {
    const withNull = cloneFixture();
    withNull.patients.find(patient => patient.patient_id === 'COS-PSO-001').initial_regime = null;
    const withAbsent = cloneFixture();
    delete withAbsent.patients.find(patient => patient.patient_id === 'COS-PSO-001').initial_regime;
    const nullReport = Informe.computeReport(withNull, '2026-Q1');
    const absentReport = Informe.computeReport(withAbsent, '2026-Q1');
    /* Model states remain distinct (null vs undefined) in the detail rows. */
    const nullRow = nullReport.detail_rows.find(row => row.patient_id === 'COS-PSO-001');
    const absentRow = absentReport.detail_rows.find(row => row.patient_id === 'COS-PSO-001');
    assert.ok(nullRow && absentRow, 'the PsO start is included in both variants');
    assert.equal(nullRow.regime, null);
    assert.equal(absentRow.regime, undefined);
    assert.notEqual(nullRow.regime, absentRow.regime, 'model states remain distinguishable');
    /* The presentation formatter returns different labels for the two states. */
    const nullLabel = Informe.regimeDisplay(nullRow.regime);
    const absentLabel = Informe.regimeDisplay(absentRow.regime);
    assert.equal(nullLabel, 'Desconocido');
    assert.equal(absentLabel, 'No registrado');
    assert.notEqual(nullLabel, absentLabel);
    /* Classification counts are NOT changed by display formatting. */
    assert.deepEqual(nullReport.counts_by_category, EXPECTED['2026-Q1'].counts);
    assert.deepEqual(absentReport.counts_by_category, EXPECTED['2026-Q1'].counts);
    assert.equal(nullReport.unique_patient_count, EXPECTED['2026-Q1'].unique);
    assert.equal(absentReport.unique_patient_count, EXPECTED['2026-Q1'].unique);
    /* XLSX Detalle contains the corresponding different labels. */
    function detalleRowFor(report) {
        const buffer = Informe.buildWorkbook(report, XLSX);
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Detalle'], { header: 1, defval: '' }).map(normRow);
        return rows.find(row => row[0] === 'COS-PSO-001');
    }
    const nullCell = detalleRowFor(nullReport);
    const absentCell = detalleRowFor(absentReport);
    assert.equal(nullCell[4], 'Desconocido', 'explicitly unknown exported as Desconocido');
    assert.equal(absentCell[4], 'No registrado', 'absent fact exported as No registrado');
    assert.notEqual(nullCell[4], absentCell[4], 'XLSX Detalle keeps the states distinct');
});
check('presentation F1 witness: checker-local explicit q6w stays verbatim in the XLSX Detalle', () => {
    const variant = cloneFixture();
    variant.patients.find(patient => patient.patient_id === 'COS-PSO-002').initial_regime = 'q6w';
    const report = Informe.computeReport(variant, '2026-Q2');
    const buffer = Informe.buildWorkbook(report, XLSX);
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Detalle'], { header: 1, defval: '' }).map(normRow);
    const q6wRow = rows.find(row => row[0] === 'COS-PSO-002');
    assert.ok(q6wRow, 'COS-PSO-002 is a PsO start in Q2');
    assert.equal(q6wRow[4], 'q6w', 'out-of-vocabulary explicit regime never collapses to a fallback label');
});
check('presentation: single shared formatter — UI and workbook projections must not re-implement a collapsing fallback', () => {
    const uiSource = readFileSync(path.join(ROOT, 'scripts/farmacia_estadisticas_informes.js'), 'utf8');
    assert.ok(uiSource.includes('Informe.regimeDisplay('),
        'the UI detail table must render through the shared formatter');
    assert.equal(/row\.regime\s*\|\|/.test(uiSource), false,
        'the UI must not collapse regimes with a || fallback');
    const modelSource = readFileSync(path.join(ROOT, 'scripts/farmacia_cosentyx_informe_model.js'), 'utf8');
    assert.equal(/row\.regime\s*\|\|/.test(modelSource), false,
        'buildWorkbook must not collapse regimes with a || fallback');
    assert.ok(modelSource.includes('regimeDisplay(row.regime)'),
        'buildWorkbook must export through the shared formatter');
});

/* 6. Mandatory negatives never classified. */
check('negatives: validation-only / current-treatment-only / q4w-without-movement / unknown regime never included', () => {
    for (const quarter of QUARTERS) {
        const included = reports[quarter].detail_rows.map(row => row.patient_id);
        for (const patientId of NEGATIVE_PATIENTS) {
            assert.ok(!included.includes(patientId),
                `${patientId} must not appear in ${quarter}`);
        }
    }
});
check('negatives: COS-PSO-003 validation date (2026-04-05) is inside Q2 yet excluded', () => {
    assert.ok('2026-04-05' >= Informe.quarterRange('2026-Q2').start
        && '2026-04-05' <= Informe.quarterRange('2026-Q2').end, 'witness date is inside Q2');
    assert.ok(reports['2026-Q2'].detail_rows.every(row => row.patient_id !== 'COS-PSO-003'));
});
check('negatives: COS-HS-005 dispensing (2026-04-07) inside Q2 but regime unknown -> not classified', () => {
    assert.ok(reports['2026-Q2'].detail_rows.every(row => row.patient_id !== 'COS-HS-005'));
});

/* 7. Unique-patient total is derived from detail rows, never a blind sum. */
check('unique total: recomputed independently as cardinality over included detail rows', () => {
    for (const quarter of QUARTERS) {
        const derived = new Set(reports[quarter].detail_rows.map(row => row.patient_id)).size;
        assert.equal(reports[quarter].unique_patient_count, derived);
    }
});
check('unique total: Q2 blind sum (8) differs from unique total (7) — proves no blind summing', () => {
    const blindSum = Object.values(reports['2026-Q2'].counts_by_category).reduce((a, b) => a + b, 0);
    assert.equal(blindSum, 8);
    assert.notEqual(blindSum, reports['2026-Q2'].unique_patient_count);
    assert.equal(reports['2026-Q2'].unique_patient_count, 7);
    assert.ok(reports['2026-Q2'].detail_rows.length === blindSum,
        'detail rows justify every category count');
});

/* 8. Temporal purity: no wall-clock dependence. */
check('temporal contract: model and fixture use no Date.now()/new Date()/Date.parse', () => {
    for (const file of ['scripts/farmacia_cosentyx_informe_model.js', 'scripts/farmacia_cosentyx_informe_fixture.js']) {
        const source = readFileSync(path.join(ROOT, file), 'utf8');
        assert.equal(/Date\.now/.test(source), false, `${file} uses Date.now`);
        assert.equal(/new Date\(/.test(source), false, `${file} uses new Date(`);
        assert.equal(/Date\.parse/.test(source), false, `${file} uses Date.parse`);
    }
});

/* 9. Explicit failure outside the synthetic fixture contract. */
check('guards: non-fixture input and invalid quarter fail explicitly', () => {
    assert.throws(() => Informe.computeReport({ synthetic: false, fixture_id: 'other' }, '2026-Q2'));
    assert.throws(() => Informe.computeReport(null, '2026-Q2'));
    assert.throws(() => Informe.computeReport(Fixture, '2026-Q5'));
    assert.throws(() => Informe.computeReport(Fixture, 'not-a-quarter'));
});

/* 10. XLSX contract: real workbook, Resumen + Detalle built from the same computed result. */
function resumenRows(report) {
    const buffer = Informe.buildWorkbook(report, XLSX);
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    return { buffer, workbook, rows: XLSX.utils.sheet_to_json(workbook.Sheets['Resumen'], { header: 1, defval: '' }).map(normRow) };
}

/* defval:'' pads short rows to the sheet width; compare without trailing padding. */
function normRow(row) {
    const copy = row.map(cell => (cell === undefined ? '' : cell));
    while (copy.length && copy[copy.length - 1] === '') copy.pop();
    return copy;
}

check('xlsx: real xlsx container (zip magic) and exactly Resumen + Detalle sheets', () => {
    const { buffer, workbook } = resumenRows(reports['2026-Q2']);
    assert.equal(Buffer.from(buffer).subarray(0, 2).toString('latin1'), 'PK', 'not a real xlsx zip');
    assert.deepEqual(workbook.SheetNames, ['Resumen', 'Detalle']);
});

check('xlsx Q2 Resumen: period, category counts and unique total match the hand-derived expectation', () => {
    const { rows } = resumenRows(reports['2026-Q2']);
    assert.deepEqual(rows[0], ['Informe trimestral Cosentyx']);
    assert.deepEqual(rows[1], ['Periodo', '2026-Q2']);
    assert.deepEqual(rows[2], ['Inicio', '2026-04-01']);
    assert.deepEqual(rows[3], ['Fin', '2026-06-30']);
    const headerIndex = rows.findIndex(row => row[0] === 'Categoría' && row[1] === 'Pacientes');
    assert.ok(headerIndex >= 0, 'category table header present');
    const categoryRows = rows.slice(headerIndex + 1, headerIndex + 5);
    assert.deepEqual(categoryRows, [
        ['PsO — nuevos inicios', 2],
        ['PsA — nuevos inicios', 2],
        ['HS — nuevos inicios q2w', 2],
        ['HS — intensificaciones q4w → q2w', 2]
    ]);
    assert.ok(rows.some(row => row[0] === 'Total pacientes únicos incluidos' && row[1] === 7),
        'unique total (7), not the blind sum (8)');
    assert.ok(rows.some(row => row[0] === 'Procedencia' && row[1] === 'Datos sintéticos específicos del informe'));
});

check('xlsx Q2 Detalle: rows exactly justify the counts (8 rows, patients + inclusion type)', () => {
    const { workbook } = resumenRows(reports['2026-Q2']);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Detalle'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(rows[0], [
        'Paciente (sintético)', 'Patología', 'Tipo de caso', 'Fecha del hecho que incluye', 'Régimen explícito'
    ]);
    assert.equal(rows.length - 1, 8);
    assert.deepEqual(rows.slice(1), EXPECTED['2026-Q2'].rows);
});

check('xlsx Q1 Resumen: counts and unique total from the same computed result', () => {
    const { rows } = resumenRows(reports['2026-Q1']);
    const headerIndex = rows.findIndex(row => row[0] === 'Categoría' && row[1] === 'Pacientes');
    assert.deepEqual(rows.slice(headerIndex + 1, headerIndex + 5), [
        ['PsO — nuevos inicios', 1],
        ['PsA — nuevos inicios', 0],
        ['HS — nuevos inicios q2w', 1],
        ['HS — intensificaciones q4w → q2w', 0]
    ]);
    assert.ok(rows.some(row => row[0] === 'Total pacientes únicos incluidos' && row[1] === 2));
    const detalle = XLSX.utils.sheet_to_json(
        resumenRows(reports['2026-Q1']).workbook.Sheets['Detalle'], { header: 1, defval: '' }).map(normRow);
    assert.equal(detalle.length - 1, 2);
});

check('xlsx Q3 Resumen: PsO start plus the Q3 intensification from the same computed result', () => {
    const { rows } = resumenRows(reports['2026-Q3']);
    const headerIndex = rows.findIndex(row => row[0] === 'Categoría' && row[1] === 'Pacientes');
    assert.deepEqual(rows.slice(headerIndex + 1, headerIndex + 5), [
        ['PsO — nuevos inicios', 1],
        ['PsA — nuevos inicios', 0],
        ['HS — nuevos inicios q2w', 0],
        ['HS — intensificaciones q4w → q2w', 1]
    ]);
    assert.ok(rows.some(row => row[0] === 'Total pacientes únicos incluidos' && row[1] === 2));
    const detalle = XLSX.utils.sheet_to_json(
        resumenRows(reports['2026-Q3']).workbook.Sheets['Detalle'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(detalle.slice(1), EXPECTED['2026-Q3'].rows);
});

check('xlsx: buildWorkbook rejects a non-computed report explicitly', () => {
    assert.throws(() => Informe.buildWorkbook(null, XLSX));
    assert.throws(() => Informe.buildWorkbook(reports['2026-Q2'], null));
});

console.log('');
if (failures.length) {
    console.log(`farmacia_cosentyx_informe_check: FAIL — ${failures.length} failed, ${passed} passed`);
    for (const failure of failures) console.log('  FAILED: ' + failure);
    process.exit(1);
}
console.log(`farmacia_cosentyx_informe_check: PASS — ${passed} checks, 0 failures`);
