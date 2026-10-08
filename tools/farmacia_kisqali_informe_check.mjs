#!/usr/bin/env node
/* #579 Informe de utilización y dosis — Kisqali — deterministic model checker.
 * WO-FH-DEMO-KISQALI-FIXTURE-01 (T1 #591): visible demo fixture normalized.
 *
 * Independent oracle: every expected value below is hand-derived from the
 * versioned synthetic fixture contract (farmacia_kisqali_informe_fixture_v1)
 * and the closed semantics of the accepted spec (#579), NOT from the model
 * implementation. The checker may disagree with the model.
 *
 * Hand-derived arithmetic (visible fixture by construction — all 200/400/600):
 * - KIS-001: 400 × 6                     => mean 2400/6  = 400
 * - KIS-002: 600 + 600 + 400             => mean 1600/3  = 533.33
 * - KIS-003: 600+400+400+200+200+200     => mean 2000/6  = 333.33
 * - KIS-004: 600 + 400 (boundary 2026-04-01) => mean 1000/2 = 500
 * - KIS-005: 600 + 600 (stable)          => mean 1200/2 = 600
 * - KIS-006: 600 + 400 (boundary 2026-06-01) => mean 1000/2 = 500
 * - KIS-007: 200 × 1                     => mean 200/1   = 200
 * - Histórico cohort: 9400/22 = 427.27; coverage 22/22 = 100 %
 *   (9400 = 2400+1600+2000+1000+1200+1000+200)
 * - Anual 2026 cohort: 5400/13 = 415.38; coverage 13/13 = 100 %
 *   (5400 = 2000+1000+1200+1000+200)
 * - Anual 2025 cohort: 4000/9 = 444.44 (unchanged: 2400+1600)
 * - Trimestral 2026-Q2: 2200/7 = 314.29; coverage 7/7 = 100 %
 *   (2200 = 200+200+200 [KIS-003] + 400 [KIS-004] + 600+400 [KIS-006] + 200 [KIS-007])
 * - Trimestral 2025-Q3: 1600/3 = 533.33 (KIS-002 only)
 * - Mensual 2026-06: 800/3 = 266.67 (200+400+200); coverage 3/3 = 100 %
 * - Mensual 2025-08: 600/1 = 600
 * Adversarial states (explicit 300, unknown/null dose, mid-cycle change,
 * adjacent doses without an explicit change fact) are NOT in the visible
 * fixture. Each is witnessed in an isolated checker-local direct model
 * input below, proving the general engine still represents them (300 stays
 * 300, unknown stays unknown never 0, mid-cycle raw non-evaluable never
 * prorated, adjacent difference without fact counts 0 changes).
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
 *  evaluable, non_evaluable_reason]
 * All 22 visible cycles are evaluable (no 300/null/mid-cycle on screen). */
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
    ['KIS-005', '2026-02', '2026-02-01', 600, '200 mg - 63', true, null],
    ['KIS-003', '2026-03', '2026-03-01', 400, '200 mg - 21', true, null],
    ['KIS-004', '2026-03', '2026-03-01', 600, '200 mg - 63', true, null],
    ['KIS-005', '2026-03', '2026-03-01', 600, '200 mg - 21', true, null],
    ['KIS-003', '2026-04', '2026-04-01', 200, '200 mg - 21', true, null],
    ['KIS-004', '2026-04', '2026-04-01', 400, '200 mg - 21', true, null],
    ['KIS-003', '2026-05', '2026-05-01', 200, '200 mg - 21', true, null],
    ['KIS-006', '2026-05', '2026-05-01', 600, '200 mg - 63', true, null],
    ['KIS-003', '2026-06', '2026-06-01', 200, '200 mg - 21', true, null],
    ['KIS-006', '2026-06', '2026-06-01', 400, '200 mg - 63', true, null],
    ['KIS-007', '2026-06', '2026-06-01', 200, '200 mg - 21', true, null]
];
const CHANGE_ROWS = {
    'KIS-002|2025-09': ['boundary', '600 → 400 mg (efectivo 2025-09-01)'],
    'KIS-003|2026-02': ['boundary', '600 → 400 mg (efectivo 2026-02-01)'],
    'KIS-003|2026-04': ['boundary', '400 → 200 mg (efectivo 2026-04-01)'],
    'KIS-004|2026-04': ['boundary', '600 → 400 mg (efectivo 2026-04-01)'],
    'KIS-006|2026-06': ['boundary', '600 → 400 mg (efectivo 2026-06-01)']
};
const HISTORICO_MONTHS = [
    '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
    '2025-07', '2025-08', '2025-09',
    '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'
];
const HISTORICO_QUARTERS = ['2025-Q1', '2025-Q2', '2025-Q3', '2026-Q1', '2026-Q2'];
const HISTORICO_YEARS = ['2025', '2026'];

/* Hand-derived patient detail: [patient_id, initial, final, changes,
 * observed, evaluable, mean_display] — all evaluable in the visible fixture. */
const HISTORICO_PATIENTS = [
    ['KIS-001', 400, 400, 0, 6, 6, '400'],
    ['KIS-002', 600, 400, 1, 3, 3, '533.33'],
    ['KIS-003', 600, 200, 2, 6, 6, '333.33'],
    ['KIS-004', 600, 400, 1, 2, 2, '500'],
    ['KIS-005', 600, 600, 0, 2, 2, '600'],
    ['KIS-006', 600, 400, 1, 2, 2, '500'],
    ['KIS-007', 200, 200, 0, 1, 1, '200']
];
/* Anual 2026 (13 observed / 13 evaluable / sum 5400 => 5400/13 = 415.38). */
const ANUAL_2026_PATIENTS = [
    ['KIS-003', 600, 200, 2, 6, 6, '333.33'],
    ['KIS-004', 600, 400, 1, 2, 2, '500'],
    ['KIS-005', 600, 600, 0, 2, 2, '600'],
    ['KIS-006', 600, 400, 1, 2, 2, '500'],
    ['KIS-007', 200, 200, 0, 1, 1, '200']
];
/* Trimestral 2026-Q2 (7 observed / 7 evaluable / sum 2200 => 2200/7 = 314.29). */
const Q2_2026_PATIENTS = [
    ['KIS-003', 200, 200, 1, 3, 3, '200'],
    ['KIS-004', 400, 400, 1, 1, 1, '400'],
    ['KIS-006', 600, 400, 1, 2, 2, '500'],
    ['KIS-007', 200, 200, 0, 1, 1, '200']
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
/* Build a minimal isolated engine input sharing the visible fixture identity
 * (fixture_id + provenance) but with checker-local patients only. */
function localFixture(patients) {
    return {
        synthetic: true,
        fixture_id: Fixture.fixture_id,
        provenance: Fixture.provenance,
        patients
    };
}

/* Reports under test (windows hand-picked to exercise every mode). */
const historico = Informe.computeReport(Fixture, 'historico', null);
const mensualJune = Informe.computeReport(Fixture, 'mensual', '2026-06');
const mensualAugust = Informe.computeReport(Fixture, 'mensual', '2025-08');
const trimestralQ3 = Informe.computeReport(Fixture, 'trimestral', '2025-Q3');
const trimestralQ2 = Informe.computeReport(Fixture, 'trimestral', '2026-Q2');
const anual2025 = Informe.computeReport(Fixture, 'anual', '2025');
const anual2026 = Informe.computeReport(Fixture, 'anual', '2026');

/* 1. Fixture contract: synthetic provenance + normalized visible witnesses. */
check('fixture: synthetic provenance is explicit and versioned', () => {
    assert.equal(Fixture.synthetic, true);
    assert.equal(Fixture.fixture_id, 'farmacia_kisqali_informe_fixture_v1');
    assert.equal(Fixture.demo_contract_only, true);
    assert.equal(Fixture.provenance.kind, 'synthetic_demo_fixture');
    assert.equal(Fixture.provenance.notice, 'Datos sintéticos específicos del informe');
    assert.equal(Fixture.patients.length, 7);
});
check('fixture: visible demo shows only explicit 200/400/600 with coherent boundary facts', () => {
    const byId = id => Fixture.patients.find(p => p.patient_id === id);
    assert.equal(byId('KIS-001').cycles.length, 6); // stable 400 x N
    assert.ok(byId('KIS-002').cycles[2].dose_change); // explicit 600->400 boundary
    assert.equal(byId('KIS-003').cycles.filter(c => c.dose_change).length, 2); // 600->400->200
    assert.deepEqual(byId('KIS-004').cycles.map(c => c.dose_mg), [600, 400]); // coherent reduction
    assert.equal(byId('KIS-004').cycles[1].dose_change.effective_at, '2026-04-01');
    assert.deepEqual(byId('KIS-005').cycles.map(c => [c.dose_mg, c.presentation_label]),
        [[600, '200 mg - 63'], [600, '200 mg - 21']]); // stable 600, both presentations
    assert.equal(byId('KIS-006').cycles[1].dose_change.effective_at, '2026-06-01'); // explicit boundary
    assert.equal(byId('KIS-007').cycles.length, 1);
    assert.equal(byId('KIS-007').cycles[0].dose_mg, 200);
    assert.equal(byId('KIS-007').cycles[0].dose_change, undefined);
});
check('fixture: visible demo contains no 300, no null/absent dose and no mid-cycle rows', () => {
    const doses = [];
    for (const patient of Fixture.patients) {
        for (const cycle of patient.cycles) {
            doses.push(cycle.dose_mg);
            assert.ok(cycle.dose_mg === 200 || cycle.dose_mg === 400 || cycle.dose_mg === 600,
                `visible dose must be 200/400/600, got ${String(cycle.dose_mg)} (${patient.patient_id} ${cycle.cycle_month})`);
            assert.ok(cycle.dose_mg !== null && cycle.dose_mg !== undefined, 'no unknown dose on screen');
            assert.ok(cycle.presentation_label === '200 mg - 21' || cycle.presentation_label === '200 mg - 63',
                'visible presentation is an explicit 21/63 label');
            if (cycle.dose_change) {
                assert.equal(cycle.dose_change.effective_at, cycle.cycle_start,
                    `visible change must be at the cycle boundary (${patient.patient_id} ${cycle.cycle_month})`);
            }
        }
    }
    assert.ok(!doses.includes(300), 'no synthetic 300 mg on the demo surface');
    const serialized = JSON.stringify(Fixture);
    assert.ok(!serialized.includes('"dose_mg":null'), 'no null dose on the demo surface');
    assert.ok(!serialized.includes('"dose_mg":300'), 'no 300 literal on the demo surface');
});
check('fixture: every adjacent dose difference on screen carries an explicit boundary fact (no inference shown)', () => {
    for (const patient of Fixture.patients) {
        const ordered = patient.cycles.slice().sort((a, b) => (a.cycle_month < b.cycle_month ? -1 : 1));
        for (let index = 1; index < ordered.length; index += 1) {
            if (ordered[index].dose_mg !== ordered[index - 1].dose_mg) {
                assert.ok(ordered[index].dose_change,
                    `adjacent dose difference without a fact would invite inference: ${patient.patient_id} ${ordered[index].cycle_month}`);
                assert.equal(ordered[index].dose_change.effective_at, ordered[index].cycle_start);
            }
        }
    }
});
check('fixture: rest week is nowhere modeled as 0 mg (every explicit dose is positive)', () => {
    for (const patient of Fixture.patients) {
        for (const cycle of patient.cycles) {
            assert.equal(typeof cycle.dose_mg, 'number');
            assert.ok(cycle.dose_mg > 0, `positive explicit dose, never 0/negative: ${cycle.dose_mg}`);
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
    assert.equal(anual2026.cohort_mean.numerator, 5400);
    assert.equal(anual2026.cohort_mean.denominator, 13);
    assert.equal(anual2026.cohort_mean.value, 5400 / 13);
    assert.equal(anual2026.cohort_mean.display, '415.38');
    assert.equal(historico.cohort_mean.numerator, 9400);
    assert.equal(historico.cohort_mean.denominator, 22);
    assert.equal(historico.cohort_mean.value, 9400 / 22);
    assert.equal(historico.cohort_mean.display, '427.27');
});
check('arithmetic: coherent boundary reductions average exactly (KIS-004/KIS-006 500, KIS-005 600, KIS-007 200)', () => {
    const byId = id => historico.patients.find(p => p.patient_id === id);
    assert.equal(byId('KIS-004').mean.numerator, 1000);
    assert.equal(byId('KIS-004').mean_display, '500');
    assert.equal(byId('KIS-005').mean.numerator, 1200);
    assert.equal(byId('KIS-005').mean_display, '600');
    assert.equal(byId('KIS-006').mean.numerator, 1000);
    assert.equal(byId('KIS-006').mean_display, '500');
    assert.equal(byId('KIS-007').mean.numerator, 200);
    assert.equal(byId('KIS-007').mean_display, '200');
});
check('arithmetic: coverage is total on the normalized demo surface (every cycle evaluable)', () => {
    assert.deepEqual([historico.coverage.numerator, historico.coverage.denominator], [22, 22]);
    assert.equal(historico.coverage.percentage_display, '100 %');
    assert.deepEqual([anual2026.coverage.numerator, anual2026.coverage.denominator], [13, 13]);
    assert.equal(anual2026.coverage.percentage_display, '100 %');
    assert.deepEqual([trimestralQ2.coverage.numerator, trimestralQ2.coverage.denominator], [7, 7]);
    assert.equal(trimestralQ2.coverage.percentage_display, '100 %');
    assert.deepEqual([mensualJune.coverage.numerator, mensualJune.coverage.denominator], [3, 3]);
    assert.equal(mensualJune.coverage.percentage_display, '100 %');
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
        ['KIS-007', '2026-06', '2026-06-01', 200, '200 mg - 21', true, null]
    ]);
    assert.deepEqual(rowTuples(mensualAugust), [
        ['KIS-002', '2025-08', '2025-08-01', 600, '200 mg - 63', true, null]
    ]);
    assert.equal(mensualAugust.patient_count, 1);
    assert.equal(mensualAugust.cohort_mean.display, '600');
    assert.equal(mensualJune.cohort_mean.numerator, 800);
    assert.equal(mensualJune.cohort_mean.denominator, 3);
    assert.equal(mensualJune.cohort_mean.display, '266.67');
});
check('inclusion: Trimestral includes exactly the three natural calendar months', () => {
    assert.deepEqual(rowTuples(trimestralQ3), [
        ['KIS-002', '2025-07', '2025-07-01', 600, '200 mg - 63', true, null],
        ['KIS-002', '2025-08', '2025-08-01', 600, '200 mg - 63', true, null],
        ['KIS-002', '2025-09', '2025-09-01', 400, '200 mg - 21', true, null]
    ]);
    assert.equal(trimestralQ3.patient_count, 1);
    /* Q2-2026: 7 observed cycles across 4 patients, all evaluable. */
    assert.equal(trimestralQ2.observed_cycle_count, 7);
    assert.equal(trimestralQ2.patient_count, 4);
    assert.equal(trimestralQ2.observed_cycles.filter(row => row.cycle_month === '2026-04').length, 2);
    assert.equal(trimestralQ2.observed_cycles.filter(row => row.cycle_month === '2026-05').length, 2);
    assert.equal(trimestralQ2.observed_cycles.filter(row => row.cycle_month === '2026-06').length, 3);
    assert.equal(trimestralQ2.cohort_mean.numerator, 2200);
    assert.equal(trimestralQ2.cohort_mean.denominator, 7);
    assert.equal(trimestralQ2.cohort_mean.display, '314.29');
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
        { dose_200: 2, dose_400: 4, dose_600: 1, otra_desconocida: 0 });
    assert.deepEqual(anual2026.closing_distribution,
        { dose_200: 2, dose_400: 2, dose_600: 1, otra_desconocida: 0 });
    assert.deepEqual(trimestralQ2.closing_distribution,
        { dose_200: 2, dose_400: 2, dose_600: 0, otra_desconocida: 0 });
    assert.deepEqual(anual2025.closing_distribution,
        { dose_200: 0, dose_400: 2, dose_600: 0, otra_desconocida: 0 });
    assert.deepEqual(mensualJune.closing_distribution,
        { dose_200: 2, dose_400: 1, dose_600: 0, otra_desconocida: 0 });
});
check('closing: no backfill — isolated unknown closing stays otra/desconocida despite prior known 400', () => {
    const variant = localFixture([{
        patient_id: 'KIS-WB',
        cycles: [
            { cycle_month: '2026-03', cycle_start: '2026-03-01', dose_mg: 400, presentation_label: '200 mg - 21' },
            { cycle_month: '2026-04', cycle_start: '2026-04-01', dose_mg: null, presentation_label: null }
        ]
    }]);
    const report = Informe.computeReport(variant, 'historico', null);
    const patient = report.patients[0];
    assert.equal(patient.final_dose, null, 'final dose is unknown, never backfilled');
    assert.deepEqual(report.closing_distribution,
        { dose_200: 0, dose_400: 0, dose_600: 0, otra_desconocida: 1 });
    /* Mutation: removing the unknown closing cycle moves the patient into a
       known bucket — proves the last observed cycle drives the bucket. */
    const withoutUnknown = localFixture([{
        patient_id: 'KIS-WB',
        cycles: [
            { cycle_month: '2026-03', cycle_start: '2026-03-01', dose_mg: 400, presentation_label: '200 mg - 21' }
        ]
    }]);
    const known = Informe.computeReport(withoutUnknown, 'historico', null);
    assert.deepEqual(known.closing_distribution,
        { dose_200: 0, dose_400: 1, dose_600: 0, otra_desconocida: 0 });
    assert.equal(known.patients[0].final_dose, 400);
});
check('closing: presentation is never backfilled — visible rows show the last cycle presentation only', () => {
    const kis004 = historico.patients.find(p => p.patient_id === 'KIS-004');
    assert.equal(kis004.last_presentation, '200 mg - 21', 'last observed cycle carries its own explicit presentation');
    assert.equal(kis004.last_presentation_display, '200 mg - 21', 'explicit presentation verbatim');
    const kis003 = historico.patients.find(p => p.patient_id === 'KIS-003');
    assert.equal(kis003.last_presentation, '200 mg - 21');
    assert.equal(kis003.last_presentation_display, '200 mg - 21', 'explicit presentation verbatim');
});

/* 6. Unknown dose (isolated): lowers coverage, never becomes 0/200/400/600. */
check('unknown dose (isolated): raw state preserved, excluded from mean, kept in coverage denominator', () => {
    const variant = localFixture([{
        patient_id: 'KIS-WU',
        cycles: [
            { cycle_month: '2026-03', cycle_start: '2026-03-01', dose_mg: 400, presentation_label: '200 mg - 21' },
            { cycle_month: '2026-04', cycle_start: '2026-04-01', dose_mg: null, presentation_label: null }
        ]
    }]);
    const report = Informe.computeReport(variant, 'historico', null);
    const unknownRow = report.observed_cycles.find(row => row.cycle_month === '2026-04');
    assert.equal(unknownRow.dose_mg, null, 'unknown stays unknown, never 0');
    assert.equal(unknownRow.dose_state, 'desconocida');
    assert.equal(unknownRow.evaluable, false);
    assert.equal(unknownRow.non_evaluable_reason, 'Dosis desconocida');
    const patient = report.patients[0];
    assert.equal(patient.mean.numerator, 400);
    assert.equal(patient.mean.denominator, 1, 'only the evaluable cycle enters the mean');
    assert.equal(patient.mean_display, '400');
    assert.equal(patient.evaluable_count, 1);
    assert.equal(patient.observed_count, 2);
    /* If the unknown cycle were dropped or zero-filled, coverage would differ. */
    assert.deepEqual([report.coverage.numerator, report.coverage.denominator], [1, 2]);
});
check('unknown dose (isolated): patient with no evaluable dose stays observed with unknown mean', () => {
    const variant = localFixture([{
        patient_id: 'KIS-WN1',
        cycles: [
            { cycle_month: '2026-06', cycle_start: '2026-06-01', dose_mg: null, presentation_label: null }
        ]
    }]);
    const report = Informe.computeReport(variant, 'historico', null);
    const patient = report.patients[0];
    assert.equal(patient.observed_count, 1);
    assert.equal(patient.evaluable_count, 0);
    assert.equal(patient.mean.denominator, 0);
    assert.equal(patient.mean.value, null);
    assert.equal(patient.mean_display, 'Desconocida');
    assert.equal(patient.initial_dose, null);
    assert.equal(patient.final_dose, null);
    assert.deepEqual(report.closing_distribution,
        { dose_200: 0, dose_400: 0, dose_600: 0, otra_desconocida: 1 });
});

/* 7. Explicit other dose (isolated): the engine never coerces 300 and never
 * forbids it — the visible demo simply chooses not to show it. */
check('other explicit dose (isolated): 300 stays 300, enters the mean, closes in otra/desconocida', () => {
    const variant = localFixture([{
        patient_id: 'KIS-W300',
        cycles: [
            { cycle_month: '2026-02', cycle_start: '2026-02-01', dose_mg: 300, presentation_label: '200 mg - 63' },
            { cycle_month: '2026-03', cycle_start: '2026-03-01', dose_mg: 300, presentation_label: '200 mg - 21' }
        ]
    }]);
    const report = Informe.computeReport(variant, 'historico', null);
    assert.deepEqual(report.observed_cycles.map(row => row.dose_mg), [300, 300]);
    const patient = report.patients[0];
    assert.equal(patient.final_dose, 300, 'patient detail preserves the exact explicit dose');
    assert.equal(patient.mean_display, '300');
    assert.equal(patient.mean.numerator, 600);
    assert.equal(patient.mean.denominator, 2);
    assert.deepEqual(report.closing_distribution,
        { dose_200: 0, dose_400: 0, dose_600: 0, otra_desconocida: 1 });
    assert.equal(report.cohort_mean.numerator, 600);
    assert.equal(report.cohort_mean.denominator, 2);
    /* Raw rows stay evaluable with the exact dose, never coerced to 200/400/600. */
    for (const row of report.observed_cycles) {
        assert.equal(row.evaluable, true);
        assert.equal(row.dose_state, 'explicita');
    }
});

/* 8. Presentation independence (visible swap + isolated dose-change witness). */
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
    kis005Feb.dose_mg = 400; // presentation untouched; 600 -> 400 is an explicit recorded dose
    const variant = Informe.computeReport(changed, 'historico', null);
    assert.equal(variant.cohort_mean.numerator, 9200);
    assert.equal(variant.cohort_mean.denominator, 22);
    assert.equal(variant.cohort_mean.display, '418.18');
    assert.notEqual(variant.cohort_mean.display, historico.cohort_mean.display);
    assert.equal(variant.patients.find(p => p.patient_id === 'KIS-005').mean_display, '500');
    const rawRow = variant.observed_cycles.find(row =>
        row.patient_id === 'KIS-005' && row.cycle_month === '2026-02');
    assert.equal(rawRow.dose_mg, 400, 'explicit recorded dose stays exact, never coerced');
    assert.equal(rawRow.presentation_label, '200 mg - 63');
});

/* 9. Explicit-change metrics come only from change facts. */
check('changes: counts come only from explicit evaluable boundary change facts', () => {
    assert.equal(historico.change_count, 5);
    assert.equal(historico.patients_with_change_count, 4);
    assert.equal(trimestralQ3.change_count, 1);
    assert.equal(trimestralQ3.patients_with_change_count, 1);
    assert.equal(trimestralQ2.change_count, 3);
    assert.equal(trimestralQ2.patients_with_change_count, 3);
    assert.equal(anual2026.change_count, 4);
    assert.equal(anual2026.patients_with_change_count, 3);
    assert.equal(anual2025.change_count, 1);
    assert.equal(anual2025.patients_with_change_count, 1);
    assert.equal(mensualJune.change_count, 1);
    assert.equal(mensualJune.patients_with_change_count, 1);
    assert.equal(mensualAugust.change_count, 0);
    for (const key of Object.keys(CHANGE_ROWS)) {
        const [patientId, month] = key.split('|');
        const row = historico.observed_cycles.find(r => r.patient_id === patientId && r.cycle_month === month);
        assert.ok(row, `change row ${key} present`);
        assert.equal(row.change_kind, CHANGE_ROWS[key][0]);
        assert.equal(row.change_display, CHANGE_ROWS[key][1]);
        assert.equal(row.dose_change.effective_at, row.cycle_start,
            'evaluable boundary change effective exactly at cycle_start');
    }
});
check('changes (isolated): adjacent dose difference without change fact counts ZERO changes', () => {
    const variant = localFixture([{
        patient_id: 'KIS-WN',
        cycles: [
            { cycle_month: '2026-05', cycle_start: '2026-05-01', dose_mg: 600, presentation_label: '200 mg - 63' },
            { cycle_month: '2026-06', cycle_start: '2026-06-01', dose_mg: 400, presentation_label: '200 mg - 63' }
        ]
    }]);
    const report = Informe.computeReport(variant, 'historico', null);
    const patient = report.patients[0];
    assert.equal(patient.change_count, 0, '600 -> 400 without explicit fact is not a change');
    assert.equal(patient.observed_count, 2);
    assert.equal(report.change_count, 0);
    assert.equal(report.patients_with_change_count, 0);
    /* The same two doses WITH an explicit boundary fact count exactly one. */
    const withFact = localFixture([{
        patient_id: 'KIS-WN',
        cycles: [
            { cycle_month: '2026-05', cycle_start: '2026-05-01', dose_mg: 600, presentation_label: '200 mg - 63' },
            { cycle_month: '2026-06', cycle_start: '2026-06-01', dose_mg: 400, presentation_label: '200 mg - 63',
                dose_change: { from_dose_mg: 600, to_dose_mg: 400, effective_at: '2026-06-01' } }
        ]
    }]);
    const withFactReport = Informe.computeReport(withFact, 'historico', null);
    assert.equal(withFactReport.change_count, 1);
    assert.equal(withFactReport.patients_with_change_count, 1);
});
check('changes (isolated): mid-cycle change is raw + non-evaluable, never prorated and never counted', () => {
    const variant = localFixture([{
        patient_id: 'KIS-WM',
        cycles: [
            { cycle_month: '2026-06', cycle_start: '2026-06-01', dose_mg: 400, presentation_label: '200 mg - 21',
                dose_change: { from_dose_mg: 400, to_dose_mg: 200, effective_at: '2026-06-15' } }
        ]
    }]);
    const report = Informe.computeReport(variant, 'historico', null);
    const row = report.observed_cycles[0];
    assert.equal(row.evaluable, false);
    assert.equal(row.change_kind, 'mid_cycle');
    assert.equal(row.dose_mg, 400, 'raw dose preserved, no proration to 200/300');
    assert.equal(row.non_evaluable_reason, 'Cambio de dosis a mitad de ciclo (no evaluable en V1)');
    const patient = report.patients[0];
    assert.equal(patient.change_count, 0, 'mid-cycle fact is not an evaluable boundary change');
    assert.equal(report.cohort_mean.numerator, 0);
    assert.equal(report.cohort_mean.denominator, 0);
    assert.deepEqual([report.coverage.numerator, report.coverage.denominator], [0, 1]);
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
        variant.patients.find(p => p.patient_id === 'KIS-006').cycles[1].dose_change.effective_at = '2026-06-15';
    });
    assert.throws(() => {
        const local = localFixture([{
            patient_id: 'KIS-WX',
            cycles: [{
                cycle_month: '2026-06', cycle_start: '2026-06-01', dose_mg: 400,
                presentation_label: '200 mg - 21',
                dose_change: { from_dose_mg: 600, to_dose_mg: 200, effective_at: '2026-06-15' }
            }]
        }]);
        Informe.computeReport(local, 'mensual', '2026-06');
    }, 'isolated mid-cycle contradiction fails closed');
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
        ['Ciclos con dosis evaluable', 13],
        ['Cierre 200 mg', 2],
        ['Cierre 400 mg', 2],
        ['Cierre 600 mg', 1],
        ['Cierre otra/desconocida', 0],
        ['Dosis media de régimen (cohorte, ponderada por ciclos con dosis evaluable)', '415.38'],
        ['Dosis media — numerador (mg)', 5400],
        ['Dosis media — denominador (ciclos)', 13],
        ['Pacientes con ≥1 cambio de dosis explícito y evaluable', 3],
        ['Cobertura de dosis explícita — numerador (ciclos)', 13],
        ['Cobertura de dosis explícita — denominador (ciclos observados)', 13],
        ['Cobertura de dosis explícita — porcentaje', '100 %']
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
        ['KIS-004', '200 mg - 21', 600, 400, 1, 2, 2, '500'],
        ['KIS-005', '200 mg - 21', 600, 600, 0, 2, 2, '600'],
        ['KIS-006', '200 mg - 63', 600, 400, 1, 2, 2, '500'],
        ['KIS-007', '200 mg - 21', 200, 200, 0, 1, 1, '200']
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
        ['KIS-005', '2026-02', '2026-02-01', 600, 'explicita', '200 mg - 63', '', 'Sí', ''],
        ['KIS-003', '2026-03', '2026-03-01', 400, 'explicita', '200 mg - 21', '', 'Sí', ''],
        ['KIS-004', '2026-03', '2026-03-01', 600, 'explicita', '200 mg - 63', '', 'Sí', ''],
        ['KIS-005', '2026-03', '2026-03-01', 600, 'explicita', '200 mg - 21', '', 'Sí', ''],
        ['KIS-003', '2026-04', '2026-04-01', 200, 'explicita', '200 mg - 21', '400 → 200 mg (efectivo 2026-04-01)', 'Sí', ''],
        ['KIS-004', '2026-04', '2026-04-01', 400, 'explicita', '200 mg - 21', '600 → 400 mg (efectivo 2026-04-01)', 'Sí', ''],
        ['KIS-003', '2026-05', '2026-05-01', 200, 'explicita', '200 mg - 21', '', 'Sí', ''],
        ['KIS-006', '2026-05', '2026-05-01', 600, 'explicita', '200 mg - 63', '', 'Sí', ''],
        ['KIS-003', '2026-06', '2026-06-01', 200, 'explicita', '200 mg - 21', '', 'Sí', ''],
        ['KIS-006', '2026-06', '2026-06-01', 400, 'explicita', '200 mg - 63', '600 → 400 mg (efectivo 2026-06-01)', 'Sí', ''],
        ['KIS-007', '2026-06', '2026-06-01', 200, 'explicita', '200 mg - 21', '', 'Sí', '']
    ].map(normRow);
    assert.deepEqual(rows.slice(1), expectedCiclos);
});
check('xlsx Histórico Pacientes: hand-derived detail includes stable/533.33/333.33/coherent witnesses', () => {
    const { workbook } = workbookFor(historico);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Pacientes'], { header: 1, defval: '' }).map(normRow);
    assert.deepEqual(rows.slice(1), [
        ['KIS-001', '200 mg - 63', 400, 400, 0, 6, 6, '400'],
        ['KIS-002', '200 mg - 21', 600, 400, 1, 3, 3, '533.33'],
        ['KIS-003', '200 mg - 21', 600, 200, 2, 6, 6, '333.33'],
        ['KIS-004', '200 mg - 21', 600, 400, 1, 2, 2, '500'],
        ['KIS-005', '200 mg - 21', 600, 600, 0, 2, 2, '600'],
        ['KIS-006', '200 mg - 63', 600, 400, 1, 2, 2, '500'],
        ['KIS-007', '200 mg - 21', 200, 200, 0, 1, 1, '200']
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

/* 14. Gate 2 + chronology witnesses (checker-local adversarial states stay
 * representable; the visible demo never claims the engine rejects them).
 * - chronology: reversing cycles in a clone cannot change initial/final
 *   dose, presentation, closing bucket or means;
 * - Gate 2 collision: an explicit 'No registrada' verbatim stays
 *   distinguishable from absence in BOTH visible projections (UI + XLSX);
 * - mid-cycle closing witness: a non-evaluable closing cycle after a KNOWN
 *   prior dose is not backfilled (checker-local sequence). */

const ABSENT_TEXT = 'No registrada';
const ABSENT_TEXT_EXPLICIT = Informe.ABSENT_PRESENTATION_EXPLICIT_LABEL;

check('chronology: reversing each patient\'s cycles in a clone cannot change initial/final dose, presentation, closing bucket or means', () => {
    const reversed = cloneFixture();
    for (const patient of reversed.patients) {
        patient.cycles = patient.cycles.slice().reverse();
    }
    const variant = Informe.computeReport(reversed, 'historico', null);
    assert.deepEqual(patientTuples(variant), patientTuples(historico),
        'first/last patient selection must be chronological, not declaration-order');
    assert.deepEqual(
        variant.patients.map(p => [p.patient_id, p.last_presentation, p.last_presentation_display]),
        historico.patients.map(p => [p.patient_id, p.last_presentation, p.last_presentation_display]),
        'last presentation must come from the chronologically last cycle');
    assert.deepEqual(variant.closing_distribution, historico.closing_distribution,
        'closing bucket must come from the chronologically last cycle');
    assert.deepEqual(variant.cohort_mean, historico.cohort_mean);
    assert.deepEqual(variant.coverage, historico.coverage);
    /* Same invariant on a single-month window. */
    const variantJune = Informe.computeReport(reversed, 'mensual', '2026-06');
    assert.deepEqual(rowTuples(variantJune), rowTuples(mensualJune));
    assert.deepEqual(patientTuples(variantJune), patientTuples(mensualJune));
    assert.deepEqual(variantJune.closing_distribution, mensualJune.closing_distribution);
});

check('gate2: explicit presentation text \'No registrada\' stays distinguishable from absence in UI model and workbook, without feeding calculation', () => {
    const absentVariant = cloneFixture();
    const collisionVariant = cloneFixture();
    const absentCycle = absentVariant.patients.find(p => p.patient_id === 'KIS-007')
        .cycles.find(c => c.cycle_month === '2026-06');
    const collisionCycle = collisionVariant.patients.find(p => p.patient_id === 'KIS-007')
        .cycles.find(c => c.cycle_month === '2026-06');
    absentCycle.presentation_label = null; // checker-local absence (visible fixture has no absence)
    collisionCycle.presentation_label = ABSENT_TEXT; // explicit literal collision
    const absentReport = Informe.computeReport(absentVariant, 'historico', null);
    const collisionReport = Informe.computeReport(collisionVariant, 'historico', null);
    const absentPatient = absentReport.patients.find(p => p.patient_id === 'KIS-007');
    const collisionPatient = collisionReport.patients.find(p => p.patient_id === 'KIS-007');
    /* Model-level presence discriminator (UI-model output). */
    assert.equal(absentPatient.last_presentation_present, false);
    assert.equal(collisionPatient.last_presentation_present, true);
    assert.equal(absentPatient.last_presentation_display, ABSENT_TEXT);
    assert.notEqual(collisionPatient.last_presentation_display, ABSENT_TEXT,
        'explicit colliding text must not render identically to absence');
    assert.equal(collisionPatient.last_presentation_display, ABSENT_TEXT_EXPLICIT);
    /* Raw level: verbatim label preserved + presence discriminator. */
    const absentRaw = absentReport.observed_cycles.find(r => r.patient_id === 'KIS-007' && r.cycle_month === '2026-06');
    const collisionRaw = collisionReport.observed_cycles.find(r => r.patient_id === 'KIS-007' && r.cycle_month === '2026-06');
    assert.equal(absentRaw.presentation_present, false);
    assert.equal(collisionRaw.presentation_present, true);
    assert.equal(collisionRaw.presentation_label, ABSENT_TEXT, 'explicit text preserved verbatim in raw facts');
    assert.equal(absentRaw.presentation_label, null);
    /* Workbook Pacientes + Ciclos keep the two states distinguishable. */
    const absentBook = workbookFor(absentReport).workbook;
    const collisionBook = workbookFor(collisionReport).workbook;
    const sheetRows = (book, name) =>
        XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, defval: '' }).map(normRow);
    const absentPaciente = sheetRows(absentBook, 'Pacientes').find(row => row[0] === 'KIS-007');
    const collisionPaciente = sheetRows(collisionBook, 'Pacientes').find(row => row[0] === 'KIS-007');
    assert.equal(absentPaciente[1], ABSENT_TEXT);
    assert.equal(collisionPaciente[1], ABSENT_TEXT_EXPLICIT);
    const absentCiclo = sheetRows(absentBook, 'Ciclos').find(row => row[0] === 'KIS-007' && row[1] === '2026-06');
    const collisionCiclo = sheetRows(collisionBook, 'Ciclos').find(row => row[0] === 'KIS-007' && row[1] === '2026-06');
    assert.equal(absentCiclo[5], ABSENT_TEXT);
    assert.equal(collisionCiclo[5], ABSENT_TEXT_EXPLICIT);
    /* Presentation never feeds calculation: dose outputs stay identical. */
    assert.deepEqual(patientTuples(collisionReport), patientTuples(absentReport));
    assert.deepEqual(collisionReport.closing_distribution, absentReport.closing_distribution);
    assert.deepEqual(collisionReport.cohort_mean, absentReport.cohort_mean);
    assert.deepEqual(collisionReport.coverage, absentReport.coverage);
});

check('closing: mid-cycle non-evaluable closing cycle after a known dose is not backfilled (checker-local sequence, shared fixture untouched)', () => {
    const variant = {
        synthetic: true,
        fixture_id: Fixture.fixture_id,
        provenance: Fixture.provenance,
        patients: [{
            patient_id: 'KIS-W6',
            cycles: [
                { cycle_month: '2026-05', cycle_start: '2026-05-01', dose_mg: 400, presentation_label: '200 mg - 63' },
                { cycle_month: '2026-06', cycle_start: '2026-06-01', dose_mg: 400, presentation_label: '200 mg - 21',
                    dose_change: { from_dose_mg: 400, to_dose_mg: 200, effective_at: '2026-06-15' } }
            ]
        }]
    };
    const report = Informe.computeReport(variant, 'historico', null);
    const patient = report.patients[0];
    assert.equal(patient.initial_dose, 400);
    assert.equal(patient.final_dose, null,
        'non-evaluable closing cycle must not be backfilled from the prior known 400');
    /* Evaluable-only averaging unchanged by the non-evaluable closing cycle. */
    assert.equal(patient.mean.numerator, 400);
    assert.equal(patient.mean.denominator, 1);
    assert.equal(patient.mean.value, 400);
    assert.equal(patient.mean_display, '400');
    assert.equal(patient.evaluable_count, 1);
    assert.equal(patient.observed_count, 2);
    /* Closing bucket otra/desconocida, never dose_400. */
    assert.deepEqual(report.closing_distribution,
        { dose_200: 0, dose_400: 0, dose_600: 0, otra_desconocida: 1 });
    assert.deepEqual([report.coverage.numerator, report.coverage.denominator], [1, 2]);
    /* Raw facts fully preserved: evaluable=no + explicit mid-cycle reason. */
    const closingRow = report.observed_cycles.find(row => row.cycle_month === '2026-06');
    assert.equal(closingRow.evaluable, false);
    assert.equal(closingRow.change_kind, 'mid_cycle');
    assert.equal(closingRow.dose_mg, 400, 'raw dose preserved, never prorated or backfilled');
    assert.equal(closingRow.non_evaluable_reason, Informe.NON_EVALUABLE_MID_CYCLE);
    assert.deepEqual(closingRow.dose_change,
        { from_dose_mg: 400, to_dose_mg: 200, effective_at: '2026-06-15' });
    assert.equal(closingRow.presentation_present, true);
    /* The known prior cycle stays evaluable and raw. */
    const priorRow = report.observed_cycles.find(row => row.cycle_month === '2026-05');
    assert.equal(priorRow.evaluable, true);
    assert.equal(priorRow.dose_mg, 400);
});

console.log('');
if (failures.length) {
    console.log(`farmacia_kisqali_informe_check: FAIL — ${failures.length} failed, ${passed} passed`);
    for (const failure of failures) console.log('  FAILED: ' + failure);
    process.exit(1);
}
console.log(`farmacia_kisqali_informe_check: PASS — ${passed} checks, 0 failures`);
