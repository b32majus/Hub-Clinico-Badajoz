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
 * - COS-PSO-001 first dispensing 2026-01-05                -> Q1 PsO start
 * - COS-PSO-002 first dispensing 2026-04-01 (Q2 boundary)  -> Q2 PsO start
 * - COS-PSO-003 validation 2026-04-05, NO dispensing       -> never a start
 * - COS-PSO-004 first dispensing 2026-07-03                -> Q3 PsO start
 * - COS-PSA-001 first dispensing 2026-04-10                -> Q2 PsA start
 * - COS-PSA-002 current treatment, NO dispensing           -> never a start
 * - COS-HS-001  first dispensing 2026-02-01, regime q2w    -> Q1 HS q2w start
 * - COS-HS-002  first dispensing 2026-03-31 (Q1 boundary) at q4w -> no HS q2w start;
 *               movement q4w->q2w effective 2026-06-30 (Q2 boundary) -> Q2 intensification
 * - COS-HS-003  first dispensing 2026-04-02 at q2w -> Q2 HS q2w start;
 *               movements q2w->q4w 2026-04-20 and q4w->q2w 2026-05-15 -> Q2 intensification
 *               (same patient, two inclusion facts -> blind sum != unique total in Q2)
 * - COS-HS-004  first dispensing 2026-04-03 at q4w, no movement -> never intensification
 * - COS-HS-005  first dispensing 2026-04-07, regime unknown -> non-classifiable
 */
const EXPECTED = {
    '2026-Q1': {
        counts: { pso_start: 1, psa_start: 0, hs_start_q2w: 1, hs_intensification: 0 },
        unique: 2,
        rows: [
            ['COS-PSO-001', 'PsO', 'PsO — nuevo inicio', '2026-01-05', 'q4w'],
            ['COS-HS-001', 'HS', 'HS — nuevo inicio q2w', '2026-02-01', 'q2w']
        ]
    },
    '2026-Q2': {
        counts: { pso_start: 1, psa_start: 1, hs_start_q2w: 1, hs_intensification: 2 },
        unique: 4,
        rows: [
            ['COS-PSO-002', 'PsO', 'PsO — nuevo inicio', '2026-04-01', 'q4w'],
            ['COS-PSA-001', 'PsA', 'PsA — nuevo inicio', '2026-04-10', 'q2w'],
            ['COS-HS-003', 'HS', 'HS — nuevo inicio q2w', '2026-04-02', 'q2w'],
            ['COS-HS-003', 'HS', 'HS — intensificación q4w → q2w', '2026-05-15', 'q4w → q2w'],
            ['COS-HS-002', 'HS', 'HS — intensificación q4w → q2w', '2026-06-30', 'q4w → q2w']
        ]
    },
    '2026-Q3': {
        counts: { pso_start: 1, psa_start: 0, hs_start_q2w: 0, hs_intensification: 0 },
        unique: 1,
        rows: [
            ['COS-PSO-004', 'PsO', 'PsO — nuevo inicio', '2026-07-03', 'q2w']
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
    assert.equal(patient.initial_regime, null, 'regime fact is absent, not filled');
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
check('boundary: dispensing on Q1 last day (2026-03-31) does not leak into Q2', () => {
    assert.ok(reports['2026-Q2'].detail_rows.every(row => row.patient_id !== 'COS-HS-001'));
    assert.ok(reports['2026-Q1'].detail_rows.some(row =>
        row.patient_id === 'COS-HS-001' && row.fact_date === '2026-02-01'));
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
check('unique total: Q2 blind sum (5) differs from unique total (4) — proves no blind summing', () => {
    const blindSum = Object.values(reports['2026-Q2'].counts_by_category).reduce((a, b) => a + b, 0);
    assert.equal(blindSum, 5);
    assert.notEqual(blindSum, reports['2026-Q2'].unique_patient_count);
    assert.equal(reports['2026-Q2'].unique_patient_count, 4);
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
        ['PsO — nuevos inicios', 1],
        ['PsA — nuevos inicios', 1],
        ['HS — nuevos inicios q2w', 1],
        ['HS — intensificaciones q4w → q2w', 2]
    ]);
    assert.ok(rows.some(row => row[0] === 'Total pacientes únicos incluidos' && row[1] === 4),
        'unique total (4), not the blind sum (5)');
    assert.ok(rows.some(row => row[0] === 'Procedencia' && row[1] === 'Datos sintéticos específicos del informe'));
});

check('xlsx Q2 Detalle: rows exactly justify the counts (5 rows, patients + inclusion type)', () => {
    const { workbook } = resumenRows(reports['2026-Q2']);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Detalle'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(rows[0], [
        'Paciente (sintético)', 'Patología', 'Tipo de caso', 'Fecha del hecho que incluye', 'Régimen explícito'
    ]);
    assert.equal(rows.length - 1, 5);
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
