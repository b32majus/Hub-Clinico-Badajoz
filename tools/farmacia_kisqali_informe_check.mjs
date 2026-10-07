#!/usr/bin/env node
/* #579 Informe de utilización y dosis — Kisqali — deterministic model checker.
 *
 * Independent oracle: every expected value below is hand-derived from the
 * versioned synthetic fixture contract (farmacia_kisqali_informe_fixture_v1)
 * and the closed semantics of the accepted spec (#579), NOT from the model
 * implementation. The checker may disagree with the model.
 *
 * Hand-derived arithmetic (fixture by construction):
 * - KIS-001: 400 × 6                     => mean 2400/6  = 400
 * - KIS-002: 600 + 600 + 400             => mean 1600/3  = 533.33
 * - KIS-003: 600+400+400+200+200+200     => mean 2000/6  = 333.33
 * - Anual 2026 cohort: (2000 + 400 + 600 + 1000) / 11 = 4000/11 = 363.64
 * - Histórico cohort: 8000/20 = 400; coverage 20/22 = 90.91 %
 * - KIS-005 explicit 300 stays 300 (never coerced), closing bucket
 *   otra/desconocida while raw/patient detail preserve 300.
 * - KIS-006 adjacent 600 -> 400 WITHOUT change fact => 0 changes.
 * - KIS-007 explicit mid-cycle change => raw, non-evaluable, never prorated.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
require(path.join(ROOT, 'scripts/farmacia_kisqali_informe_fixture.js'));
require(path.join(ROOT, 'scripts/farmacia_kisqali_informe_model.js'));
const Fixture = globalThis.FarmaciaKisqaliInformeFixture;
const Informe = globalThis.FarmaciaKisqaliInforme;
const XLSX = require(path.join(ROOT, 'vendor/sheetjs/xlsx.full.min.js'));

/* ---------- Hand-derived expected raw cycle rows (full Histórico, ordered
 * by cycle_month then patient_id). Tuple:
 * [patient_id, cycle_month, cycle_start, dose_mg, presentation_label,
 *  evaluable, non_evaluable_reason] */
const HISTORICO_ROWS = [
    ['KIS-001', '2025-01', '2025-01-01', 400, '200 mg - 63', true, null],
    ['KIS-001', '2025-02', '2025-02-01', 400, '200 mg - 63', true, null],
    ['KIS-001', '2025-03', '2025-03-01', 400, '200 mg - 63', true, null],
    ['KIS-001', '2025-04', '2025-04-01', 400, '200 mg - 63', true, null],
    ['KIS-001', '2025-05', '2025-05-01', 400, '200 mg - 63', true, null],
    ['KIS-001', '2025-06', '2025-06-01', 400, '200 mg - 63', true, null],
    ['KIS-002', '2025-07', '2025-07-01', 600, '200 mg - 63', true, null],
    ['KIS-002', '2025-08', '2025-08-01', 600, '200 mg - 63', true, null],
    ['KIS-002', '2025-09', '2025-09-01', 400, '200 mg - 21', true, null],
    ['KIS-003', '2026-01', '2026-01-01', 600, '200 mg - 63', true, null],
    ['KIS-003', '2026-02', '2026-02-01', 400, '200 mg - 63', true, null],
    ['KIS-005', '2026-02', '2026-02-01', 300, '200 mg - 63', true, null],
    ['KIS-003', '2026-03', '2026-03-01', 400, '200 mg - 21', true, null],
    ['KIS-004', '2026-03', '2026-03-01', 400, '200 mg - 21', true, null],
    ['KIS-005', '2026-03', '2026-03-01', 300, '200 mg - 21', true, null],
    ['KIS-003', '2026-04', '2026-04-01', 200, '200 mg - 21', true, null],
    ['KIS-004', '2026-04', '2026-04-01', null, null, false, 'Dosis desconocida'],
    ['KIS-003', '2026-05', '2026-05-01', 200, '200 mg - 21', true, null],
    ['KIS-006', '2026-05', '2026-05-01', 600, '200 mg - 63', true, null],
    ['KIS-003', '2026-06', '2026-06-01', 200, '200 mg - 21', true, null],
    ['KIS-006', '2026-06', '2026-06-01', 400, '200 mg - 63', true, null],
    ['KIS-007', '2026-06', '2026-06-01', 400, '200 mg - 21', false, 'Cambio de dosis a mitad de ciclo (no evaluable en V1)']
];
const CHANGE_ROWS = {
    'KIS-002|2025-09': ['boundary', '600 → 400 mg (efectivo 2025-09-01)'],
    'KIS-003|2026-02': ['boundary', '600 → 400 mg (efectivo 2026-02-01)'],
    'KIS-003|2026-04': ['boundary', '400 → 200 mg (efectivo 2026-04-01)'],
    'KIS-007|2026-06': ['mid_cycle', '400 → 200 mg (efectivo 2026-06-15, mitad de ciclo)']
};
const HISTORICO_MONTHS = [
    '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
    '2025-07', '2025-08', '2025-09',
    '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'
];
const HISTORICO_QUARTERS = ['2025-Q1', '2025-Q2', '2025-Q3', '2026-Q1', '2026-Q2'];
const HISTORICO_YEARS = ['2025', '2026'];

/* Hand-derived patient detail: [patient_id, initial, final, changes,
 * observed, evaluable, mean_display] */
const HISTORICO_PATIENTS = [
    ['KIS-001', 400, 400, 0, 6, 6, '400'],
    ['KIS-002', 600, 400, 1, 3, 3, '533.33'],
    ['KIS-003', 600, 200, 2, 6, 6, '333.33'],
    ['KIS-004', 400, null, 0, 2, 1, '400'],
    ['KIS-005', 300, 300, 0, 2, 2, '300'],
    ['KIS-006', 600, 400, 0, 2, 2, '500'],
    ['KIS-007', null, null, 0, 1, 0, 'Desconocida']
];
/* Anual 2026 (13 observed / 11 evaluable / sum 4000 => 4000/11 = 363.64). */
const ANUAL_2026_PATIENTS = [
    ['KIS-003', 600, 200, 2, 6, 6, '333.33'],
    ['KIS-004', 400, null, 0, 2, 1, '400'],
    ['KIS-005', 300, 300, 0, 2, 2, '300'],
    ['KIS-006', 600, 400, 0, 2, 2, '500'],
    ['KIS-007', null, null, 0, 1, 0, 'Desconocida']
];
/* Trimestral 2026-Q2 (7 observed / 5 evaluable / sum 1600 => 320). */
const Q2_2026_PATIENTS = [
    ['KIS-003', 200, 200, 1, 3, 3, '200'],
    ['KIS-004', null, null, 0, 1, 0, 'Desconocida'],
    ['KIS-006', 600, 400, 0, 2, 2, '500'],
    ['KIS-007', null, null, 0, 1, 0, 'Desconocida']
];

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
    return report.observed_cycles.map(row => [
        row.patient_id, row.cycle_month, row.cycle_start, row.dose_mg,
        row.presentation_label, row.evaluable, row.non_evaluable_reason]);
}
function patientTuples(report) {
    return report.patients.map(row => [
        row.patient_id, row.initial_dose, row.final_dose, row.change_count,
        row.observed_count, row.evaluable_count, row.mean_display]);
}
function cloneFixture() {
    return JSON.parse(JSON.stringify(Fixture));
}
function normRow(row) {
    const copy = row.map(cell => (cell === undefined ? '' : cell));
    while (copy.length && copy[copy.length - 1] === '') copy.pop();
    return copy;
}

/* Reports under test (windows hand-picked to exercise every mode). */
const historico = Informe.computeReport(Fixture, 'historico', null);
const mensualJune = Informe.computeReport(Fixture, 'mensual', '2026-06');
const mensualAugust = Informe.computeReport(Fixture, 'mensual', '2025-08');
const trimestralQ3 = Informe.computeReport(Fixture, 'trimestral', '2025-Q3');
const trimestralQ2 = Informe.computeReport(Fixture, 'trimestral', '2026-Q2');
const anual2025 = Informe.computeReport(Fixture, 'anual', '2025');
const anual2026 = Informe.computeReport(Fixture, 'anual', '2026');

/* 1. Fixture contract: synthetic provenance + mandatory witnesses exist. */
check('fixture: synthetic provenance is explicit and versioned', () => {
    assert.equal(Fixture.synthetic, true);
    assert.equal(Fixture.fixture_id, 'farmacia_kisqali_informe_fixture_v1');
    assert.equal(Fixture.demo_contract_only, true);
    assert.equal(Fixture.provenance.kind, 'synthetic_demo_fixture');
    assert.equal(Fixture.provenance.notice, 'Datos sintéticos específicos del informe');
    assert.equal(Fixture.patients.length, 7);
});
check('fixture: every mandatory behavioral witness exists', () => {
    const byId = id => Fixture.patients.find(p => p.patient_id === id);
    assert.equal(byId('KIS-001').cycles.length, 6); // stable 400 x N
    assert.ok(byId('KIS-002').cycles[2].dose_change); // explicit 600->400 boundary
    assert.equal(byId('KIS-003').cycles.filter(c => c.dose_change).length, 2); // 600->400->200
    assert.equal(byId('KIS-004').cycles[1].dose_mg, null); // unknown-dose cycle
    assert.equal(byId('KIS-004').cycles[1].presentation_label, null); // closing unknown after known
    assert.deepEqual(
        byId('KIS-005').cycles.map(c => [c.dose_mg, c.presentation_label]),
        [[300, '200 mg - 63'], [300, '200 mg - 21']]); // other dose; 21/63 independent
    assert.equal(byId('KIS-006').cycles.filter(c => c.dose_change).length, 0); // adjacent diff, no fact
    const mid = byId('KIS-007').cycles[0];
    assert.equal(mid.dose_change.effective_at, '2026-06-15'); // mid-cycle witness
    assert.notEqual(mid.dose_change.effective_at, mid.cycle_start);
});
check('fixture: rest week is nowhere modeled as 0 mg (every explicit dose is positive)', () => {
    for (const patient of Fixture.patients) {
        for (const cycle of patient.cycles) {
            if (cycle.dose_mg !== null) {
                assert.equal(typeof cycle.dose_mg, 'number');
                assert.ok(cycle.dose_mg > 0, `positive explicit dose, never 0/negative: ${cycle.dose_mg}`);
            }
        }
    }
    assert.ok(!JSON.stringify(Fixture).includes('"dose_mg":0'), 'no zero dose anywhere');
});

/* 2. Arithmetic witnesses (isolated, hand-derived). */
check('arithmetic: stable 400 × N => mean exactly 400 (patient KIS-001)', () => {
    const patient = historico.patients.find(p => p.patient_id === 'KIS-001');
    assert.equal(patient.mean.numerator, 2400);
    assert.equal(patient.mean.denominator, 6);
    assert.equal(patient.mean.value, 400);
    assert.equal(patient.mean_display, '400');
});
check('arithmetic: 600×2 + 400×1 => 533.33 displayed with raw 1600/3 (patient KIS-002)', () => {
    for (const report of [historico, trimestralQ3]) {
        const patient = report.patients.find(p => p.patient_id === 'KIS-002');
        assert.equal(patient.mean.numerator, 1600);
        assert.equal(patient.mean.denominator, 3);
        assert.equal(patient.mean_display, '533.33');
    }
    assert.equal(trimestralQ3.cohort_mean.numerator, 1600);
    assert.equal(trimestralQ3.cohort_mean.denominator, 3);
    assert.equal(trimestralQ3.cohort_mean.display, '533.33');
});
check('arithmetic: explicit 600→400→200 weighted case exact (patient + cohort)', () => {
    const patient = historico.patients.find(p => p.patient_id === 'KIS-003');
    assert.equal(patient.mean.numerator, 2000);
    assert.equal(patient.mean.denominator, 6);
    assert.equal(patient.mean_display, '333.33');
    assert.equal(anual2026.cohort_mean.numerator, 4000);
    assert.equal(anual2026.cohort_mean.denominator, 11);
    assert.equal(anual2026.cohort_mean.value, 4000 / 11);
    assert.equal(anual2026.cohort_mean.display, '363.64');
    assert.equal(historico.cohort_mean.numerator, 8000);
    assert.equal(historico.cohort_mean.denominator, 20);
    assert.equal(historico.cohort_mean.value, 400);
    assert.equal(historico.cohort_mean.display, '400');
});
check('arithmetic: coverage numerator/denominator witnesses (unknown + mid-cycle stay in denominator)', () => {
    assert.deepEqual([historico.coverage.numerator, historico.coverage.denominator], [20, 22]);
    assert.equal(historico.coverage.percentage_display, '90.91 %');
    assert.deepEqual([anual2026.coverage.numerator, anual2026.coverage.denominator], [11, 13]);
    assert.equal(anual2026.coverage.percentage_display, '84.62 %');
    assert.deepEqual([trimestralQ2.coverage.numerator, trimestralQ2.coverage.denominator], [5, 7]);
    assert.equal(trimestralQ2.coverage.percentage_display, '71.43 %');
    assert.deepEqual([mensualJune.coverage.numerator, mensualJune.coverage.denominator], [2, 3]);
    assert.equal(mensualJune.coverage.percentage_display, '66.67 %');
    assert.deepEqual([mensualAugust.coverage.numerator, mensualAugust.coverage.denominator], [1, 1]);
});

/* 3. Window inclusion from cycle_month (one engine, four modes). */
check('inclusion: full Histórico row set matches the hand-derived 22 cycles', () => {
    assert.deepEqual(rowTuples(historico), HISTORICO_ROWS);
    assert.equal(historico.observed_cycle_count, 22);
    assert.equal(historico.patient_count, 7);
});
check('inclusion: Mensual includes exactly the cycles of the selected month', () => {
    assert.deepEqual(rowTuples(mensualJune), [
        ['KIS-003', '2026-06', '2026-06-01', 200, '200 mg - 21', true, null],
        ['KIS-006', '2026-06', '2026-06-01', 400, '200 mg - 63', true, null],
        ['KIS-007', '2026-06', '2026-06-01', 400, '200 mg - 21', false, 'Cambio de dosis a mitad de ciclo (no evaluable en V1)']
    ]);
    assert.deepEqual(rowTuples(mensualAugust), [
        ['KIS-002', '2025-08', '2025-08-01', 600, '200 mg - 63', true, null]
    ]);
    assert.equal(mensualAugust.patient_count, 1);
    assert.equal(mensualAugust.cohort_mean.display, '600');
});
check('inclusion: Trimestral includes exactly the three natural calendar months', () => {
    assert.deepEqual(rowTuples(trimestralQ3), [
        ['KIS-002', '2025-07', '2025-07-01', 600, '200 mg - 63', true, null],
        ['KIS-002', '2025-08', '2025-08-01', 600, '200 mg - 63', true, null],
        ['KIS-002', '2025-09', '2025-09-01', 400, '200 mg - 21', true, null]
    ]);
    assert.equal(trimestralQ3.patient_count, 1);
    /* Q2-2026: 7 observed cycles across 4 patients. */
    assert.equal(trimestralQ2.observed_cycle_count, 7);
    assert.equal(trimestralQ2.patient_count, 4);
    assert.equal(trimestralQ2.observed_cycles.filter(row => row.cycle_month === '2026-04').length, 2);
    assert.equal(trimestralQ2.observed_cycles.filter(row => row.cycle_month === '2026-05').length, 2);
    assert.equal(trimestralQ2.observed_cycles.filter(row => row.cycle_month === '2026-06').length, 3);
    assert.equal(trimestralQ2.cohort_mean.numerator, 1600);
    assert.equal(trimestralQ2.cohort_mean.denominator, 5);
    assert.equal(trimestralQ2.cohort_mean.display, '320');
});
check('inclusion: Anual includes the twelve calendar months of the selected year', () => {
    assert.equal(anual2025.observed_cycle_count, 9);
    assert.equal(anual2025.patient_count, 2);
    assert.ok(anual2025.observed_cycles.every(row => row.cycle_month.startsWith('2025-')));
    assert.equal(anual2025.cohort_mean.numerator, 4000);
    assert.equal(anual2025.cohort_mean.denominator, 9);
    assert.equal(anual2025.cohort_mean.display, '444.44');
    assert.equal(anual2026.observed_cycle_count, 13);
    assert.equal(anual2026.patient_count, 5);
    assert.ok(anual2026.observed_cycles.every(row => row.cycle_month.startsWith('2026-')));
});
check('inclusion: window modes do not collapse to the same result', () => {
    const snapshots = [mensualJune, trimestralQ2, anual2026, historico]
        .map(report => JSON.stringify([
            report.observed_cycle_count, report.patient_count,
            report.cohort_mean.display, report.coverage.numerator]));
    assert.equal(new Set(snapshots).size, 4, 'each window mode yields a distinct result');
});

/* 4. Period lists derived from the fixture; historical max from fixture. */
check('periods: Mensual/Trimestral/Anual lists derive from fixture cycle months; Histórico has no period', () => {
    assert.deepEqual(Informe.listPeriods(Fixture, 'mensual'), HISTORICO_MONTHS);
    assert.deepEqual(Informe.listPeriods(Fixture, 'trimestral'), HISTORICO_QUARTERS);
    assert.deepEqual(Informe.listPeriods(Fixture, 'anual'), HISTORICO_YEARS);
    assert.deepEqual(Informe.listPeriods(Fixture, 'historico'), []);
    assert.equal(Informe.latestPeriod(Fixture, 'mensual'), '2026-06');
    assert.equal(Informe.latestPeriod(Fixture, 'trimestral'), '2026-Q2');
    assert.equal(Informe.latestPeriod(Fixture, 'anual'), '2026');
    assert.equal(Informe.latestPeriod(Fixture, 'historico'), null);
});
check('periods: Histórico ends at the fixture maximum cycle_month (no wall clock)', () => {
    assert.equal(historico.period.start_month, '2025-01');
    assert.equal(historico.period.end_month, '2026-06');
    assert.equal(historico.period.label, 'Histórico (2025-01 → 2026-06)');
    /* Mutation: a later explicit cycle extends Histórico — the max is derived,
     * not hardcoded. */
    const extended = cloneFixture();
    extended.patients.find(p => p.patient_id === 'KIS-001').cycles
        .push({ cycle_month: '2026-12', cycle_start: '2026-12-01', dose_mg: 400, presentation_label: '200 mg - 63' });
    const extendedReport = Informe.computeReport(extended, 'historico', null);
    assert.equal(extendedReport.period.end_month, '2026-12');
    assert.equal(extendedReport.observed_cycle_count, 23);
    assert.ok(Informe.listPeriods(extended, 'mensual').includes('2026-12'));
});
check('temporal contract: model and fixture use no Date.now()/new Date()/Date.parse', () => {
    for (const file of ['scripts/farmacia_kisqali_informe_model.js', 'scripts/farmacia_kisqali_informe_fixture.js']) {
        const source = readFileSync(path.join(ROOT, file), 'utf8');
        assert.equal(/Date\.now/.test(source), false, `${file} uses Date.now`);
        assert.equal(/new Date\(/.test(source), false, `${file} uses new Date(`);
        assert.equal(/Date\.parse/.test(source), false, `${file} uses Date.parse`);
    }
});
check('period labels: exact selected period exposed for every mode', () => {
    assert.equal(mensualJune.period.label, '2026-06');
    assert.equal(trimestralQ2.period.label, '2026-Q2');
    assert.equal(anual2026.period.label, '2026');
    assert.equal(mensualJune.period.start_month, '2026-06');
    assert.equal(trimestralQ2.period.start_month, '2026-04');
    assert.equal(trimestralQ2.period.end_month, '2026-06');
    assert.equal(anual2026.period.start_month, '2026-01');
    assert.equal(anual2026.period.end_month, '2026-12');
});

/* 5. Closing distribution: last observed cycle, no backfill. */
check('closing: distribution uses the last observed cycle in the window (hand-derived)', () => {
    assert.deepEqual(historico.closing_distribution,
        { dose_200: 1, dose_400: 3, dose_600: 0, otra_desconocida: 3 });
    assert.deepEqual(anual2026.closing_distribution,
        { dose_200: 1, dose_400: 1, dose_600: 0, otra_desconocida: 3 });
    assert.deepEqual(trimestralQ2.closing_distribution,
        { dose_200: 1, dose_400: 1, dose_600: 0, otra_desconocida: 2 });
    assert.deepEqual(anual2025.closing_distribution,
        { dose_200: 0, dose_400: 2, dose_600: 0, otra_desconocida: 0 });
    assert.deepEqual(mensualJune.closing_distribution,
        { dose_200: 1, dose_400: 1, dose_600: 0, otra_desconocida: 1 });
});
check('closing: no backfill — KIS-004 closing unknown stays otra/desconocida despite prior known 400', () => {
    const patient = historico.patients.find(p => p.patient_id === 'KIS-004');
    assert.equal(patient.final_dose, null, 'final dose is unknown, never backfilled');
    assert.ok(historico.closing_distribution.otra_desconocida >= 1);
    /* Mutation: removing the unknown closing cycle moves the patient into a
       known bucket — proves the last observed cycle drives the bucket. */
    const withoutUnknown = cloneFixture();
    const kis004 = withoutUnknown.patients.find(p => p.patient_id === 'KIS-004');
    kis004.cycles = kis004.cycles.filter(cycle => cycle.cycle_month !== '2026-04');
    const variant = Informe.computeReport(withoutUnknown, 'historico', null);
    assert.equal(variant.closing_distribution.dose_400, 4);
    assert.equal(variant.closing_distribution.otra_desconocida, 2);
    assert.equal(variant.patients.find(p => p.patient_id === 'KIS-004').final_dose, 400);
});
check('closing: presentation is never backfilled — patient row shows the last cycle presentation only', () => {
    const kis004 = historico.patients.find(p => p.patient_id === 'KIS-004');
    assert.equal(kis004.last_presentation, null, 'last observed cycle has no explicit presentation');
    assert.equal(kis004.last_presentation_display, 'No registrada',
        'absent presentation must not fall back to an earlier cycle presentation');
    const kis003 = historico.patients.find(p => p.patient_id === 'KIS-003');
    assert.equal(kis003.last_presentation, '200 mg - 21');
    assert.equal(kis003.last_presentation_display, '200 mg - 21', 'explicit presentation verbatim');
});

/* 6. Unknown dose: lowers coverage, never becomes 0/200/400/600. */
check('unknown dose: raw state preserved, excluded from mean, kept in coverage denominator', () => {
    const unknownRow = historico.observed_cycles.find(row =>
        row.patient_id === 'KIS-004' && row.cycle_month === '2026-04');
    assert.equal(unknownRow.dose_mg, null, 'unknown stays unknown, never 0');
    assert.equal(unknownRow.dose_state, 'desconocida');
    assert.equal(unknownRow.evaluable, false);
    assert.equal(unknownRow.non_evaluable_reason, 'Dosis desconocida');
    const kis004 = historico.patients.find(p => p.patient_id === 'KIS-004');
    assert.equal(kis004.mean.numerator, 400);
    assert.equal(kis004.mean.denominator, 1, 'only the evaluable cycle enters the mean');
    assert.equal(kis004.mean_display, '400');
    assert.equal(kis004.evaluable_count, 1);
    assert.equal(kis004.observed_count, 2);
    /* If the unknown cycle were dropped or zero-filled, coverage would differ. */
    assert.equal(historico.coverage.denominator, 22);
    assert.equal(historico.coverage.numerator, 20);
});
check('patient with no evaluable dose stays observed with unknown mean (KIS-007)', () => {
    const patient = historico.patients.find(p => p.patient_id === 'KIS-007');
    assert.equal(patient.observed_count, 1);
    assert.equal(patient.evaluable_count, 0);
    assert.equal(patient.mean.denominator, 0);
    assert.equal(patient.mean.value, null);
    assert.equal(patient.mean_display, 'Desconocida');
    assert.equal(patient.initial_dose, null);
    assert.equal(patient.final_dose, null);
});

/* 7. Explicit other dose: participates in mean, aggregate bucket otra/desconocida,
 * raw/patient detail preserve the exact value. */
check('other explicit dose: 300 participates in the mean, closes in otra/desconocida, stays 300 raw', () => {
    const raw300 = historico.observed_cycles.filter(row => row.patient_id === 'KIS-005');
    assert.deepEqual(raw300.map(row => row.dose_mg), [300, 300]);
    const patient = historico.patients.find(p => p.patient_id === 'KIS-005');
    assert.equal(patient.final_dose, 300, 'patient detail preserves the exact explicit dose');
    assert.equal(patient.mean_display, '300');
    /* Closing bucket: 300 is neither 200/400/600 => otra/desconocida. */
    const anual2026Patients = anual2026.patients.map(p => p.patient_id);
    assert.ok(anual2026Patients.includes('KIS-005'));
    assert.equal(anual2026.closing_distribution.otra_desconocida, 3);
    assert.equal(anual2026.closing_distribution.dose_200, 1);
    assert.equal(anual2026.closing_distribution.dose_400, 1);
    assert.equal(anual2026.closing_distribution.dose_600, 0);
    /* Cohort mean includes 300 cycles (600 mg across two cycles inside 4000). */
    assert.equal(anual2026.cohort_mean.numerator, 4000);
});

/* 8. Presentation independence (behavioral witness via checker-local variants). */
check('presentation: swapping 21/63 labels cannot change any dose output', () => {
    const swapped = cloneFixture();
    for (const patient of swapped.patients) {
        for (const cycle of patient.cycles) {
            if (cycle.presentation_label === '200 mg - 21') cycle.presentation_label = '200 mg - 63';
            else if (cycle.presentation_label === '200 mg - 63') cycle.presentation_label = '200 mg - 21';
        }
    }
    const base = historico;
    const variant = Informe.computeReport(swapped, 'historico', null);
    assert.deepEqual(variant.cohort_mean, base.cohort_mean);
    assert.deepEqual(variant.closing_distribution, base.closing_distribution);
    assert.deepEqual(patientTuples(variant), patientTuples(base));
    assert.deepEqual(
        variant.observed_cycles.map(r => [r.patient_id, r.cycle_month, r.dose_mg, r.evaluable]),
        base.observed_cycles.map(r => [r.patient_id, r.cycle_month, r.dose_mg, r.evaluable]));
    assert.deepEqual(variant.coverage, base.coverage);
});
check('presentation: changing dose while presentation is fixed DOES change dose outputs', () => {
    const changed = cloneFixture();
    const kis005Feb = changed.patients.find(p => p.patient_id === 'KIS-005')
        .cycles.find(cycle => cycle.cycle_month === '2026-02');
    assert.equal(kis005Feb.presentation_label, '200 mg - 63');
    kis005Feb.dose_mg = 350; // presentation untouched
    const variant = Informe.computeReport(changed, 'historico', null);
    assert.equal(variant.cohort_mean.numerator, 8050);
    assert.equal(variant.cohort_mean.denominator, 20);
    assert.notEqual(variant.cohort_mean.display, historico.cohort_mean.display);
    assert.equal(variant.patients.find(p => p.patient_id === 'KIS-005').mean_display, '325');
    const rawRow = variant.observed_cycles.find(row =>
        row.patient_id === 'KIS-005' && row.cycle_month === '2026-02');
    assert.equal(rawRow.dose_mg, 350, 'explicit other positive dose stays exact, never coerced');
    assert.equal(rawRow.presentation_label, '200 mg - 63');
});

/* 9. Explicit-change metrics come only from change facts. */
check('changes: counts come only from explicit evaluable boundary change facts', () => {
    assert.equal(historico.change_count, 3);
    assert.equal(historico.patients_with_change_count, 2);
    assert.equal(trimestralQ3.change_count, 1);
    assert.equal(trimestralQ3.patients_with_change_count, 1);
    assert.equal(trimestralQ2.change_count, 1);
    assert.equal(trimestralQ2.patients_with_change_count, 1);
    assert.equal(anual2026.change_count, 2);
    assert.equal(anual2026.patients_with_change_count, 1);
    for (const key of Object.keys(CHANGE_ROWS)) {
        const [patientId, month] = key.split('|');
        const row = historico.observed_cycles.find(r => r.patient_id === patientId && r.cycle_month === month);
        assert.ok(row, `change row ${key} present`);
        assert.equal(row.change_kind, CHANGE_ROWS[key][0]);
        assert.equal(row.change_display, CHANGE_ROWS[key][1]);
        if (row.change_kind === 'boundary') {
            assert.equal(row.dose_change.effective_at, row.cycle_start,
                'evaluable boundary change effective exactly at cycle_start');
        }    }
});
check('changes: adjacent dose difference without change fact counts ZERO changes (KIS-006)', () => {
    const patient = historico.patients.find(p => p.patient_id === 'KIS-006');
    assert.equal(patient.change_count, 0, '600 -> 400 without explicit fact is not a change');
    assert.equal(patient.observed_count, 2);
    /* If changes were inferred from adjacent differences, the total would be 5
     * (1 + 2 + 2 KIS-006 rows); it must be exactly 3 across 2 patients. */
    const inferredWouldBe = 5;
    assert.notEqual(historico.change_count, inferredWouldBe);
    assert.equal(historico.change_count, 3);
    assert.equal(historico.patients_with_change_count, 2);
});
check('changes: mid-cycle change is raw + non-evaluable, never prorated and never counted', () => {
    const row = historico.observed_cycles.find(r => r.patient_id === 'KIS-007');
    assert.equal(row.evaluable, false);
    assert.equal(row.change_kind, 'mid_cycle');
    assert.equal(row.dose_mg, 400, 'raw dose preserved, no proration to 200/300');
    assert.equal(row.non_evaluable_reason, 'Cambio de dosis a mitad de ciclo (no evaluable en V1)');
    const patient = historico.patients.find(p => p.patient_id === 'KIS-007');
    assert.equal(patient.change_count, 0, 'mid-cycle fact is not an evaluable boundary change');
    /* Histórico numerator 8000 proves KIS-007's 400 never entered any mean. */
    assert.equal(historico.cohort_mean.numerator, 8000);
    assert.equal(historico.cohort_mean.denominator, 20);
});

/* 10. Fail-closed validation. */
check('guards: non-fixture input, invalid mode and invalid periods fail explicitly', () => {
    assert.throws(() => Informe.computeReport(null, 'mensual', '2026-06'));
    assert.throws(() => Informe.computeReport({}, 'mensual', '2026-06'));
    assert.throws(() => Informe.computeReport({ synthetic: true, fixture_id: 'other' }, 'mensual', '2026-06'));
    assert.throws(() => Informe.computeReport(Fixture, 'semanal', '2026-06'));
    assert.throws(() => Informe.computeReport(Fixture, 'mensual', '2026-6'));
    assert.throws(() => Informe.computeReport(Fixture, 'mensual', '2026-13'));
    assert.throws(() => Informe.computeReport(Fixture, 'trimestral', '2026-Q5'));
    assert.throws(() => Informe.computeReport(Fixture, 'trimestral', '2026'));
    assert.throws(() => Informe.computeReport(Fixture, 'anual', '202'));
    assert.throws(() => Informe.buildWorkbook(null, XLSX));
    assert.throws(() => Informe.buildWorkbook(historico, null));
});
function expectFixtureFailure(name, mutate) {
    const variant = cloneFixture();
    mutate(variant);
    assert.throws(() => Informe.computeReport(variant, 'mensual', '2026-06'), name);
}
check('guards: duplicate patient+cycle_month fails closed', () => {
    expectFixtureFailure('duplicate cycle', variant => {
        variant.patients.find(p => p.patient_id === 'KIS-001').cycles
            .push({ cycle_month: '2025-01', cycle_start: '2025-01-15', dose_mg: 400, presentation_label: null });
    });
    expectFixtureFailure('duplicate patient', variant => {
        variant.patients.push(JSON.parse(JSON.stringify(variant.patients[0])));
    });
});
check('guards: malformed month/date fails closed', () => {
    expectFixtureFailure('bad month', variant => {
        variant.patients[0].cycles[0].cycle_month = '2026-1';
    });
    expectFixtureFailure('month out of range', variant => {
        variant.patients[0].cycles[0].cycle_month = '2026-13';
    });
    expectFixtureFailure('bad date format', variant => {
        variant.patients[0].cycles[0].cycle_start = '2026-01-01T00:00:00';
    });
    expectFixtureFailure('impossible calendar date', variant => {
        variant.patients[0].cycles[0].cycle_start = '2026-02-30';
    });
    expectFixtureFailure('cycle_start outside cycle_month', variant => {
        variant.patients[0].cycles[0].cycle_start = '2026-02-01';
    });
});
check('guards: zero/negative/non-numeric dose fails closed', () => {
    expectFixtureFailure('zero dose', variant => {
        variant.patients[0].cycles[0].dose_mg = 0;
    });
    expectFixtureFailure('negative dose', variant => {
        variant.patients[0].cycles[0].dose_mg = -200;
    });
    expectFixtureFailure('string dose', variant => {
        variant.patients[0].cycles[0].dose_mg = '400';
    });
});
check('guards: inconsistent change facts fail closed', () => {
    expectFixtureFailure('change before cycle start', variant => {
        variant.patients.find(p => p.patient_id === 'KIS-002').cycles[2].dose_change.effective_at = '2025-08-31';
    });
    expectFixtureFailure('change outside the cycle month', variant => {
        variant.patients.find(p => p.patient_id === 'KIS-002').cycles[2].dose_change.effective_at = '2025-10-01';
    });
    expectFixtureFailure('boundary change contradicts explicit dose', variant => {
        variant.patients.find(p => p.patient_id === 'KIS-002').cycles[2].dose_change.to_dose_mg = 500;
    });
    expectFixtureFailure('mid-cycle change contradicts explicit start dose', variant => {
        variant.patients.find(p => p.patient_id === 'KIS-007').cycles[0].dose_change.from_dose_mg = 600;
    });
    expectFixtureFailure('change with zero target dose', variant => {
        variant.patients.find(p => p.patient_id === 'KIS-002').cycles[2].dose_change.to_dose_mg = 0;
    });
});

/* 11. XLSX contract: real workbook, exactly Resumen + Pacientes + Ciclos,
 * built from the SAME computed report shown to the UI. */
function workbookFor(report) {
    const buffer = Informe.buildWorkbook(report, XLSX);
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    return { buffer, workbook };
}
check('xlsx: real xlsx zip container with exactly Resumen, Pacientes, Ciclos', () => {
    const { buffer, workbook } = workbookFor(anual2026);
    assert.equal(Buffer.from(buffer).subarray(0, 2).toString('latin1'), 'PK', 'not a real xlsx zip');
    assert.deepEqual(workbook.SheetNames, ['Resumen', 'Pacientes', 'Ciclos']);
});
check('xlsx Anual 2026 Resumen: every row equals the hand-derived expectation of the same computed report', () => {
    const { workbook } = workbookFor(anual2026);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Resumen'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(rows, [
        ['Informe de utilización y dosis — Kisqali'],
        ['Modo de ventana', 'Anual'],
        ['Periodo', '2026'],
        ['Procedencia', 'Datos sintéticos específicos del informe (farmacia_kisqali_informe_fixture_v1)'],
        ['Cálculo', 'Calculada exclusivamente a partir de dosis y ciclos explícitamente registrados.'],
        [],
        ['Indicador', 'Valor'],
        ['Pacientes con ≥1 ciclo observado', 5],
        ['Ciclos observados', 13],
        ['Ciclos con dosis evaluable', 11],
        ['Cierre 200 mg', 1],
        ['Cierre 400 mg', 1],
        ['Cierre 600 mg', 0],
        ['Cierre otra/desconocida', 3],
        ['Dosis media de régimen (cohorte, ponderada por ciclos con dosis evaluable)', '363.64'],
        ['Dosis media — numerador (mg)', 4000],
        ['Dosis media — denominador (ciclos)', 11],
        ['Pacientes con ≥1 cambio de dosis explícito y evaluable', 1],
        ['Cobertura de dosis explícita — numerador (ciclos)', 11],
        ['Cobertura de dosis explícita — denominador (ciclos observados)', 13],
        ['Cobertura de dosis explícita — porcentaje', '84.62 %']
    ]);
});
check('xlsx Anual 2026 Pacientes: same per-patient computed detail as the model report', () => {
    const { workbook } = workbookFor(anual2026);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Pacientes'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(rows[0], [
        'Paciente (sintético)', 'Presentación del último ciclo observado',
        'Dosis inicial (ventana)', 'Dosis final (ventana)', 'Cambios explícitos',
        'Ciclos observados', 'Ciclos con dosis evaluable', 'Dosis media (mg)'
    ]);
    assert.deepEqual(rows.slice(1), [
        ['KIS-003', '200 mg - 21', 600, 200, 2, 6, 6, '333.33'],
        ['KIS-004', 'No registrada', 400, 'Desconocida', 0, 2, 1, '400'],
        ['KIS-005', '200 mg - 21', 300, 300, 0, 2, 2, '300'],
        ['KIS-006', '200 mg - 63', 600, 400, 0, 2, 2, '500'],
        ['KIS-007', '200 mg - 21', 'Desconocida', 'Desconocida', 0, 1, 0, 'Desconocida']
    ]);
    assert.deepEqual(patientTuples(anual2026), ANUAL_2026_PATIENTS,
        'the workbook is built from exactly the same computed patient detail');
});
check('xlsx Anual 2026 Ciclos: raw observed rows with evaluability, reasons and explicit change facts', () => {
    const { workbook } = workbookFor(anual2026);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Ciclos'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(rows[0], [
        'Paciente (sintético)', 'Mes de ciclo', 'Inicio de ciclo', 'Dosis (mg)',
        'Estado de dosis', 'Presentación explícita', 'Cambio explícito',
        'Evaluable para dosis', 'Motivo cuando no evaluable'
    ]);
    assert.equal(rows.length - 1, 13);
    /* Expected rows are normalized with the same trailing-empty trimming as
     * the sheet rows (empty 'Motivo' cells on evaluable rows). */
    const expectedCiclos = [
        ['KIS-003', '2026-01', '2026-01-01', 600, 'explicita', '200 mg - 63', '', 'Sí', ''],
        ['KIS-003', '2026-02', '2026-02-01', 400, 'explicita', '200 mg - 63', '600 → 400 mg (efectivo 2026-02-01)', 'Sí', ''],
        ['KIS-005', '2026-02', '2026-02-01', 300, 'explicita', '200 mg - 63', '', 'Sí', ''],
        ['KIS-003', '2026-03', '2026-03-01', 400, 'explicita', '200 mg - 21', '', 'Sí', ''],
        ['KIS-004', '2026-03', '2026-03-01', 400, 'explicita', '200 mg - 21', '', 'Sí', ''],
        ['KIS-005', '2026-03', '2026-03-01', 300, 'explicita', '200 mg - 21', '', 'Sí', ''],
        ['KIS-003', '2026-04', '2026-04-01', 200, 'explicita', '200 mg - 21', '400 → 200 mg (efectivo 2026-04-01)', 'Sí', ''],
        ['KIS-004', '2026-04', '2026-04-01', '', 'desconocida', 'No registrada', '', 'No', 'Dosis desconocida'],
        ['KIS-003', '2026-05', '2026-05-01', 200, 'explicita', '200 mg - 21', '', 'Sí', ''],
        ['KIS-006', '2026-05', '2026-05-01', 600, 'explicita', '200 mg - 63', '', 'Sí', ''],
        ['KIS-003', '2026-06', '2026-06-01', 200, 'explicita', '200 mg - 21', '', 'Sí', ''],
        ['KIS-006', '2026-06', '2026-06-01', 400, 'explicita', '200 mg - 63', '', 'Sí', ''],
        ['KIS-007', '2026-06', '2026-06-01', 400, 'explicita', '200 mg - 21', '400 → 200 mg (efectivo 2026-06-15, mitad de ciclo)', 'No', 'Cambio de dosis a mitad de ciclo (no evaluable en V1)']
    ].map(normRow);
    assert.deepEqual(rows.slice(1), expectedCiclos);
});
check('xlsx Histórico Pacientes: hand-derived detail includes stable/533.33/333.33/unknown witnesses', () => {
    const { workbook } = workbookFor(historico);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Pacientes'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(rows.slice(1), [
        ['KIS-001', '200 mg - 63', 400, 400, 0, 6, 6, '400'],
        ['KIS-002', '200 mg - 21', 600, 400, 1, 3, 3, '533.33'],
        ['KIS-003', '200 mg - 21', 600, 200, 2, 6, 6, '333.33'],
        ['KIS-004', 'No registrada', 400, 'Desconocida', 0, 2, 1, '400'],
        ['KIS-005', '200 mg - 21', 300, 300, 0, 2, 2, '300'],
        ['KIS-006', '200 mg - 63', 600, 400, 0, 2, 2, '500'],
        ['KIS-007', '200 mg - 21', 'Desconocida', 'Desconocida', 0, 1, 0, 'Desconocida']
    ]);
    assert.deepEqual(patientTuples(historico), HISTORICO_PATIENTS);
    assert.deepEqual(patientTuples(trimestralQ2), Q2_2026_PATIENTS);
});

/* 12. Synthetic provenance reaches the workbook and the shared wording stays closed. */
check('provenance: synthetic notice + closed calculation wording present in model constants and workbook', () => {
    assert.equal(Informe.PROVENANCE_NOTICE, 'Datos sintéticos específicos del informe');
    assert.equal(Informe.CALCULATION_NOTICE,
        'Calculada exclusivamente a partir de dosis y ciclos explícitamente registrados.');
    const { workbook } = workbookFor(historico);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Resumen'], { header: 1, defval: '' }).map(normRow);
    assert.ok(rows.some(row => row[0] === 'Procedencia'
        && String(row[1]).includes('Datos sintéticos específicos del informe')
        && String(row[1]).includes('farmacia_kisqali_informe_fixture_v1')));
    assert.ok(rows.some(row => row[0] === 'Cálculo'
        && row[1] === 'Calculada exclusivamente a partir de dosis y ciclos explícitamente registrados.'));
    assert.equal(historico.fixture_id, 'farmacia_kisqali_informe_fixture_v1');
});

/* 13. The engine stays one pure engine: only the window changes. */
check('engine: recomputing the same window is deterministic and frozen inputs are untouched', () => {
    const again = Informe.computeReport(Fixture, 'historico', null);
    assert.deepEqual(JSON.parse(JSON.stringify(again)), JSON.parse(JSON.stringify(historico)));
    assert.deepEqual(rowTuples(Informe.computeReport(Fixture, 'historico', 'ignored-for-historico')), HISTORICO_ROWS,
        'Histórico covers all explicit cycles regardless of any period key');
});

console.log('');
if (failures.length) {
    console.log(`farmacia_kisqali_informe_check: FAIL — ${failures.length} failed, ${passed} passed`);
    for (const failure of failures) console.log('  FAILED: ' + failure);
    process.exit(1);
}
console.log(`farmacia_kisqali_informe_check: PASS — ${passed} checks, 0 failures`);
