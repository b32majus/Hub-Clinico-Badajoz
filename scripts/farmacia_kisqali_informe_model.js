/* Informe de utilización y dosis — Kisqali (#579) — pure calculation model, DOM-free.
 *
 * Closed temporal contract (#579):
 * - One fixture row = one observed monthly treatment cycle; cycle_month is the
 *   authoritative inclusion key (exact YYYY-MM); no wall-clock, no timezone
 *   and no current-date API anywhere in the calculation.
 * - One pure engine: only the inclusion window changes between Mensual /
 *   Trimestral / Anual / Histórico. Period lists are derived from the fixture
 *   cycles, never from the current date. Histórico = every explicit cycle
 *   through the greatest cycle_month present in the fixture.
 * - Dose is an explicit independent fact: 200/400/600 are ordinary explicit
 *   doses; any other explicit positive number stays that exact dose; unknown
 *   stays unknown and never becomes 0 or a known dose. The rest week is never
 *   modeled as 0 mg. Dose is NEVER derived from presentation_label, tablet
 *   count, package size, drug name or adjacent cycles.
 * - Explicit changes only: a change exists only through an explicit
 *   cycle-boundary change fact. Adjacent cycles with different doses and no
 *   explicit fact count 0 changes. A change fact effective inside the cycle
 *   but not at cycle_start makes the cycle non-evaluable (raw preserved,
 *   never prorated, never resolved by intuition).
 * - Observed vs dose-evaluable: unknown-dose and mid-cycle-changed cycles
 *   stay observed/raw, count in the coverage denominator and never enter the
 *   dose-average numerator/denominator.
 * - Means are weighted by dose-evaluable cycles across the cohort (never
 *   averaged patient averages, never patient-days, never zeros). Presentation
 *   rounding to at most 2 decimals happens only in the shared display
 *   projection and never feeds back into calculation.
 * - Gate 2 (representation narrowing): explicit vs unknown dose, explicit vs
 *   absent presentation, observed vs evaluable, boundary vs mid-cycle change
 *   and the exact selected window stay distinguishable end to end.
 */
(function (root) {
    'use strict';

    var VERSION = 'farmacia_kisqali_informe_model_v1';
    var FIXTURE_ID = 'farmacia_kisqali_informe_fixture_v1';
    var MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
    var DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
    var QUARTER_RE = /^(\d{4})-Q([1-4])$/;
    var YEAR_RE = /^\d{4}$/;
    var DAYS_IN_MONTH = { 1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31 };

    var MODES = ['mensual', 'trimestral', 'anual', 'historico'];
    var MODE_LABELS = {
        mensual: 'Mensual',
        trimestral: 'Trimestral',
        anual: 'Anual',
        historico: 'Histórico'
    };

    var NON_EVALUABLE_UNKNOWN_DOSE = 'Dosis desconocida';
    var NON_EVALUABLE_MID_CYCLE = 'Cambio de dosis a mitad de ciclo (no evaluable en V1)';

    var PROVENANCE_NOTICE = 'Datos sintéticos específicos del informe';
    var CALCULATION_NOTICE = 'Calculada exclusivamente a partir de dosis y ciclos explícitamente registrados.';
    var UNKNOWN_DOSE_LABEL = 'Desconocida';
    var ABSENT_PRESENTATION_LABEL = 'No registrada';

    function fail(message) {
        throw new Error(message);
    }

    function isExplicitDose(value) {
        return typeof value === 'number' && isFinite(value) && value > 0;
    }

    function assertMonth(value, context) {
        if (typeof value !== 'string' || !MONTH_RE.test(value)) {
            fail('Mes de ciclo inválido (se requiere YYYY-MM exacto) en ' + context + ': ' + String(value));
        }
        return value;
    }

    function assertDateOnly(value, context) {
        if (typeof value !== 'string' || !DATE_ONLY_RE.test(value)) {
            fail('Fecha no ISO date-only en ' + context + ': ' + String(value));
        }
        var year = Number(value.slice(0, 4));
        var month = Number(value.slice(5, 7));
        var day = Number(value.slice(8, 10));
        var isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        var maxDay = month === 2 && isLeapYear ? 29 : DAYS_IN_MONTH[month];
        if (day < 1 || day > maxDay) {
            fail('Fecha de calendario inválida en ' + context + ': ' + String(value));
        }
        return value;
    }

    /* Fail-closed fixture validation: every patient/cycle/change fact is
     * validated once, independently of the selected window. */
    function assertFixture(fixture) {
        if (!fixture || fixture.synthetic !== true || fixture.fixture_id !== FIXTURE_ID) {
            fail('El informe Kisqali exige el fixture sintético dedicado ' + FIXTURE_ID + '.');
        }
        if (!fixture.provenance || fixture.provenance.kind !== 'synthetic_demo_fixture'
            || fixture.provenance.notice !== PROVENANCE_NOTICE) {
            fail('Fixture sin procedencia sintética explícita.');
        }
        if (!Array.isArray(fixture.patients) || fixture.patients.length === 0) {
            fail('Fixture sin pacientes sintéticos.');
        }
        var seenPatients = {};
        fixture.patients.forEach(function (patient) {
            if (!patient || typeof patient.patient_id !== 'string' || !patient.patient_id) {
                fail('Paciente sintético sin identificador explícito.');
            }
            if (seenPatients[patient.patient_id]) {
                fail('Paciente duplicado en el fixture: ' + patient.patient_id);
            }
            seenPatients[patient.patient_id] = true;
            if (!Array.isArray(patient.cycles) || patient.cycles.length === 0) {
                fail('Paciente sin ciclos explícitos: ' + patient.patient_id);
            }
            var monthsByPatient = {};
            patient.cycles.forEach(function (cycle) {
                if (!cycle) fail('Ciclo indefinido para ' + patient.patient_id + '.');
                assertMonth(cycle.cycle_month, patient.patient_id);
                assertDateOnly(cycle.cycle_start, patient.patient_id + ' ' + cycle.cycle_month);
                if (cycle.cycle_start.slice(0, 7) !== cycle.cycle_month) {
                    fail('cycle_start fuera de cycle_month en ' + patient.patient_id
                        + ' ' + cycle.cycle_month + ': ' + String(cycle.cycle_start));
                }
                if (monthsByPatient[cycle.cycle_month]) {
                    fail('Ciclo duplicado para ' + patient.patient_id + ' en ' + cycle.cycle_month + '.');
                }
                monthsByPatient[cycle.cycle_month] = true;
                if (cycle.dose_mg !== null && cycle.dose_mg !== undefined && !isExplicitDose(cycle.dose_mg)) {
                    fail('dose_mg debe ser un número positivo explícito o null/ausente (desconocida); '
                        + 'nunca 0 ni negativo (' + patient.patient_id + ' ' + cycle.cycle_month + '): '
                        + String(cycle.dose_mg));
                }
                if (cycle.presentation_label !== null && cycle.presentation_label !== undefined
                    && typeof cycle.presentation_label !== 'string') {
                    fail('presentation_label debe ser texto explícito o null/ausente en '
                        + patient.patient_id + ' ' + cycle.cycle_month + '.');
                }
                assertChangeFact(cycle, patient.patient_id);
            });
        });
    }

    function assertChangeFact(cycle, patientId) {
        var change = cycle.dose_change;
        if (change === null || change === undefined) return;
        if (typeof change !== 'object') {
            fail('Hecho de cambio de dosis inválido en ' + patientId + ' ' + cycle.cycle_month + '.');
        }
        if (!isExplicitDose(change.from_dose_mg) || !isExplicitDose(change.to_dose_mg)) {
            fail('El cambio de dosis exige from/to explícitos positivos en '
                + patientId + ' ' + cycle.cycle_month + '.');
        }
        assertDateOnly(change.effective_at, 'cambio de dosis ' + patientId + ' ' + cycle.cycle_month);
        if (change.effective_at < cycle.cycle_start) {
            fail('Cambio de dosis anterior al inicio del ciclo en ' + patientId + ' ' + cycle.cycle_month + '.');
        }
        if (change.effective_at.slice(0, 7) !== cycle.cycle_month) {
            fail('Cambio de dosis fuera del ciclo mensual en ' + patientId + ' ' + cycle.cycle_month + '.');
        }
        if (change.effective_at === cycle.cycle_start) {
            if (isExplicitDose(cycle.dose_mg) && change.to_dose_mg !== cycle.dose_mg) {
                fail('Cambio de frontera contradictorio con la dosis explícita del ciclo en '
                    + patientId + ' ' + cycle.cycle_month + '.');
            }
        } else if (isExplicitDose(cycle.dose_mg) && change.from_dose_mg !== cycle.dose_mg) {
            fail('Cambio a mitad de ciclo contradictorio con la dosis explícita de inicio en '
                + patientId + ' ' + cycle.cycle_month + '.');
        }
    }

    function isMidCycleChange(cycle) {
        return !!cycle.dose_change && cycle.dose_change.effective_at !== cycle.cycle_start;
    }

    /* One non-evaluable condition per cycle, with its explicit raw reason. */
    function nonEvaluableReason(cycle) {
        if (isMidCycleChange(cycle)) return NON_EVALUABLE_MID_CYCLE;
        if (!isExplicitDose(cycle.dose_mg)) return NON_EVALUABLE_UNKNOWN_DOSE;
        return null;
    }

    function sortMonths(months) {
        return months.slice().sort();
    }

    function allCycleMonths(fixture) {
        var months = [];
        fixture.patients.forEach(function (patient) {
            patient.cycles.forEach(function (cycle) {
                if (months.indexOf(cycle.cycle_month) === -1) months.push(cycle.cycle_month);
            });
        });
        return months;
    }

    function quarterOfMonth(month) {
        return month.slice(0, 4) + '-Q' + Math.ceil(Number(month.slice(5, 7)) / 3);
    }

    /* Period lists derived ONLY from fixture cycle months — never from the
     * current date. Histórico has no period selector (empty list). */
    function listPeriods(fixture, mode) {
        assertFixture(fixture);
        assertMode(mode);
        var months = sortMonths(allCycleMonths(fixture));
        if (mode === 'mensual') return months;
        if (mode === 'trimestral') {
            var quarters = [];
            months.forEach(function (month) {
                var quarter = quarterOfMonth(month);
                if (quarters.indexOf(quarter) === -1) quarters.push(quarter);
            });
            return quarters;
        }
        if (mode === 'anual') {
            var years = [];
            months.forEach(function (month) {
                var year = month.slice(0, 4);
                if (years.indexOf(year) === -1) years.push(year);
            });
            return years;
        }
        return [];
    }

    function latestPeriod(fixture, mode) {
        var periods = listPeriods(fixture, mode);
        return periods.length ? periods[periods.length - 1] : null;
    }

    function assertMode(mode) {
        if (MODES.indexOf(mode) === -1) {
            fail('Modo de ventana inválido: ' + String(mode));
        }
    }

    /* Inclusive month range for the selected window. Histórico covers every
     * explicit cycle through the fixture maximum cycle_month. */
    function monthRange(fixture, mode, periodKey) {
        assertMode(mode);
        if (mode === 'mensual') {
            assertMonth(periodKey, 'periodo mensual');
            return { start_month: periodKey, end_month: periodKey };
        }
        if (mode === 'trimestral') {
            var match = QUARTER_RE.exec(String(periodKey || ''));
            if (!match) fail('Trimestre inválido: ' + String(periodKey));
            var firstMonth = (Number(match[2]) - 1) * 3 + 1;
            return {
                start_month: match[1] + '-' + String(firstMonth).padStart(2, '0'),
                end_month: match[1] + '-' + String(firstMonth + 2).padStart(2, '0')
            };
        }
        if (mode === 'anual') {
            if (typeof periodKey !== 'string' || !YEAR_RE.test(periodKey)) {
                fail('Año inválido: ' + String(periodKey));
            }
            return { start_month: periodKey + '-01', end_month: periodKey + '-12' };
        }
        var months = sortMonths(allCycleMonths(fixture));
        if (!months.length) fail('Fixture sin ciclos: no existe ventana histórica.');
        return { start_month: months[0], end_month: months[months.length - 1] };
    }

    function periodLabel(mode, range) {
        if (mode === 'historico') {
            return 'Histórico (' + range.start_month + ' → ' + range.end_month + ')';
        }
        if (mode === 'mensual') return range.start_month;
        if (mode === 'trimestral') return quarterOfMonth(range.start_month);
        return range.start_month.slice(0, 4);
    }

    /* Shared presentation projection (Gate 2): the ONE formatter used by the
     * UI patient table, the ciclos traceability view and the XLSX builder.
     * Explicit presentation strings stay verbatim; absent/null stays
     * 'No registrada'. Its output never feeds back into calculation. */
    function presentationDisplay(presentationLabel) {
        if (presentationLabel === null || presentationLabel === undefined) {
            return ABSENT_PRESENTATION_LABEL;
        }
        return presentationLabel;
    }

    /* Shared numeric projection: at most 2 decimals, computed from the exact
     * value only at presentation time. Unknown stays 'Desconocida'. */
    function meanDisplay(value) {
        if (value === null || value === undefined) return UNKNOWN_DOSE_LABEL;
        var rounded = Math.round(value * 100) / 100;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
    }

    function changeDisplay(change, midCycle) {
        if (!change) return '';
        return String(change.from_dose_mg) + ' → ' + String(change.to_dose_mg)
            + ' mg (efectivo ' + change.effective_at + (midCycle ? ', mitad de ciclo' : '') + ')';
    }

    function rawCycleRow(patientId, cycle) {
        var reason = nonEvaluableReason(cycle);
        return {
            patient_id: patientId,
            cycle_month: cycle.cycle_month,
            cycle_start: cycle.cycle_start,
            dose_mg: cycle.dose_mg === undefined ? null : cycle.dose_mg,
            dose_state: isExplicitDose(cycle.dose_mg) ? 'explicita' : 'desconocida',
            presentation_label: cycle.presentation_label === undefined ? null : cycle.presentation_label,
            dose_change: cycle.dose_change
                ? Object.freeze({
                    from_dose_mg: cycle.dose_change.from_dose_mg,
                    to_dose_mg: cycle.dose_change.to_dose_mg,
                    effective_at: cycle.dose_change.effective_at
                })
                : null,
            change_kind: cycle.dose_change ? (isMidCycleChange(cycle) ? 'mid_cycle' : 'boundary') : null,
            change_display: changeDisplay(cycle.dose_change, isMidCycleChange(cycle)),
            evaluable: reason === null,
            non_evaluable_reason: reason
        };
    }

    function patientMeanDisplay(mean) {
        return meanDisplay(mean.value);
    }

    /* One pure calculation engine for every window mode. */
    function computeReport(fixture, mode, periodKey) {
        assertFixture(fixture);
        assertMode(mode);
        var range = monthRange(fixture, mode, mode === 'historico' ? null : periodKey);

        var observed = [];
        var patientsById = {};
        fixture.patients.forEach(function (patient) {
            var rows = [];
            patient.cycles.forEach(function (cycle) {
                if (cycle.cycle_month >= range.start_month && cycle.cycle_month <= range.end_month) {
                    var row = rawCycleRow(patient.patient_id, cycle);
                    rows.push(row);
                    observed.push(row);
                }
            });
            if (rows.length) patientsById[patient.patient_id] = rows;
        });

        observed.sort(function (left, right) {
            return left.cycle_month < right.cycle_month ? -1
                : (left.cycle_month > right.cycle_month ? 1
                    : (left.patient_id < right.patient_id ? -1
                        : (left.patient_id > right.patient_id ? 1 : 0)));
        });

        /* Aggregate KPIs — weighted by dose-evaluable cycles across the whole
         * cohort; unknown and mid-cycle rows stay in the coverage denominator
         * and never enter the mean. */
        var evaluableSum = 0;
        var evaluableCount = 0;
        var changeCount = 0;
        var patientsWithChange = {};
        observed.forEach(function (row) {
            if (row.evaluable) {
                evaluableSum += row.dose_mg;
                evaluableCount += 1;
            }
            if (row.change_kind === 'boundary' && row.evaluable) {
                changeCount += 1;
                patientsWithChange[row.patient_id] = true;
            }
        });

        var cohortMean = {
            numerator: evaluableSum,
            denominator: evaluableCount,
            value: evaluableCount > 0 ? evaluableSum / evaluableCount : null
        };
        cohortMean.display = meanDisplay(cohortMean.value);

        var coverage = {
            numerator: evaluableCount,
            denominator: observed.length
        };
        coverage.percentage = coverage.denominator > 0
            ? (coverage.numerator / coverage.denominator) * 100
            : null;
        coverage.percentage_display = coverage.percentage === null
            ? UNKNOWN_DOSE_LABEL
            : meanDisplay(coverage.percentage) + ' %';

        /* Per-patient detail, window-local, without look-back before the
         * window and without backfill for the closing cycle. */
        var closing = { dose_200: 0, dose_400: 0, dose_600: 0, otra_desconocida: 0 };
        var patients = Object.keys(patientsById).sort().map(function (patientId) {
            var rows = patientsById[patientId];
            var evaluableRows = rows.filter(function (row) { return row.evaluable; });
            var sum = 0;
            evaluableRows.forEach(function (row) { sum += row.dose_mg; });
            var mean = { numerator: sum, denominator: evaluableRows.length };
            mean.value = mean.denominator > 0 ? sum / mean.denominator : null;
            mean.display = meanDisplay(mean.value);

            var first = rows[0];
            var last = rows[rows.length - 1];
            var initialDose = first.evaluable ? first.dose_mg : null;
            var finalDose = last.evaluable ? last.dose_mg : null;
            var patientChangeCount = rows.filter(function (row) {
                return row.change_kind === 'boundary' && row.evaluable;
            }).length;
            if (patientChangeCount > 0) patientsWithChange[patientId] = true;

            /* Closing distribution: the chronologically last observed cycle
             * inside the window; unknown/non-evaluable/other doses go to the
             * intentional 'otra/desconocida' aggregate bucket while the raw
             * row and the patient detail preserve the exact explicit value. */
            if (last.evaluable && last.dose_mg === 200) closing.dose_200 += 1;
            else if (last.evaluable && last.dose_mg === 400) closing.dose_400 += 1;
            else if (last.evaluable && last.dose_mg === 600) closing.dose_600 += 1;
            else closing.otra_desconocida += 1;

            return {
                patient_id: patientId,
                last_presentation: last.presentation_label,
                last_presentation_display: presentationDisplay(last.presentation_label),
                initial_dose: initialDose,
                final_dose: finalDose,
                change_count: patientChangeCount,
                observed_count: rows.length,
                evaluable_count: evaluableRows.length,
                mean: mean,
                mean_display: patientMeanDisplay(mean),
                cycles: rows
            };
        });

        return Object.freeze({
            mode: mode,
            mode_label: MODE_LABELS[mode],
            period: Object.freeze({
                key: mode === 'historico' ? 'historico' : String(periodKey),
                label: periodLabel(mode, range),
                start_month: range.start_month,
                end_month: range.end_month
            }),
            observed_cycles: Object.freeze(observed.map(function (row) { return Object.freeze(row); })),
            patient_count: patients.length,
            observed_cycle_count: observed.length,
            evaluable_cycle_count: evaluableCount,
            closing_distribution: Object.freeze(closing),
            cohort_mean: Object.freeze(cohortMean),
            change_count: changeCount,
            patients_with_change_count: Object.keys(patientsWithChange).length,
            coverage: Object.freeze(coverage),
            patients: Object.freeze(patients.map(function (patient) {
                return Object.freeze({
                    patient_id: patient.patient_id,
                    last_presentation: patient.last_presentation,
                    last_presentation_display: patient.last_presentation_display,
                    initial_dose: patient.initial_dose,
                    final_dose: patient.final_dose,
                    change_count: patient.change_count,
                    observed_count: patient.observed_count,
                    evaluable_count: patient.evaluable_count,
                    mean: Object.freeze(patient.mean),
                    mean_display: patient.mean_display
                });
            })),
            fixture_id: fixture.fixture_id,
            provenance: fixture.provenance
        });
    }

    /* Real XLSX built from the SAME computed report shown in the UI.
       Exactly three sheets: Resumen, Pacientes, Ciclos. */
    function buildWorkbook(report, XLSXLib) {
        if (!report || !report.period || !Array.isArray(report.patients)
            || !Array.isArray(report.observed_cycles)) {
            fail('buildWorkbook exige un informe calculado por computeReport.');
        }
        if (!XLSXLib || typeof XLSXLib.write !== 'function' || !XLSXLib.utils) {
            fail('SheetJS (XLSX) no está disponible para generar el Excel del informe.');
        }

        var resumen = [
            ['Informe de utilización y dosis — Kisqali'],
            ['Modo de ventana', report.mode_label],
            ['Periodo', report.period.label],
            ['Procedencia', PROVENANCE_NOTICE + ' (' + report.fixture_id + ')'],
            ['Cálculo', CALCULATION_NOTICE],
            [],
            ['Indicador', 'Valor'],
            ['Pacientes con ≥1 ciclo observado', report.patient_count],
            ['Ciclos observados', report.observed_cycle_count],
            ['Ciclos con dosis evaluable', report.evaluable_cycle_count],
            ['Cierre 200 mg', report.closing_distribution.dose_200],
            ['Cierre 400 mg', report.closing_distribution.dose_400],
            ['Cierre 600 mg', report.closing_distribution.dose_600],
            ['Cierre otra/desconocida', report.closing_distribution.otra_desconocida],
            ['Dosis media de régimen (cohorte, ponderada por ciclos con dosis evaluable)', report.cohort_mean.display],
            ['Dosis media — numerador (mg)', report.cohort_mean.numerator],
            ['Dosis media — denominador (ciclos)', report.cohort_mean.denominator],
            ['Pacientes con ≥1 cambio de dosis explícito y evaluable', report.patients_with_change_count],
            ['Cobertura de dosis explícita — numerador (ciclos)', report.coverage.numerator],
            ['Cobertura de dosis explícita — denominador (ciclos observados)', report.coverage.denominator],
            ['Cobertura de dosis explícita — porcentaje', report.coverage.percentage_display]
        ];

        var pacientes = [[
            'Paciente (sintético)', 'Presentación del último ciclo observado',
            'Dosis inicial (ventana)', 'Dosis final (ventana)', 'Cambios explícitos',
            'Ciclos observados', 'Ciclos con dosis evaluable', 'Dosis media (mg)'
        ]];
        report.patients.forEach(function (patient) {
            pacientes.push([
                patient.patient_id,
                patient.last_presentation_display,
                patient.initial_dose === null ? UNKNOWN_DOSE_LABEL : patient.initial_dose,
                patient.final_dose === null ? UNKNOWN_DOSE_LABEL : patient.final_dose,
                patient.change_count,
                patient.observed_count,
                patient.evaluable_count,
                patient.mean_display
            ]);
        });

        var ciclos = [[
            'Paciente (sintético)', 'Mes de ciclo', 'Inicio de ciclo', 'Dosis (mg)',
            'Estado de dosis', 'Presentación explícita', 'Cambio explícito',
            'Evaluable para dosis', 'Motivo cuando no evaluable'
        ]];
        report.observed_cycles.forEach(function (row) {
            ciclos.push([
                row.patient_id,
                row.cycle_month,
                row.cycle_start,
                row.dose_mg === null ? '' : row.dose_mg,
                row.dose_state,
                presentationDisplay(row.presentation_label),
                row.change_display,
                row.evaluable ? 'Sí' : 'No',
                row.non_evaluable_reason === null ? '' : row.non_evaluable_reason
            ]);
        });

        var workbook = XLSXLib.utils.book_new();
        XLSXLib.utils.book_append_sheet(workbook, XLSXLib.utils.aoa_to_sheet(resumen), 'Resumen');
        XLSXLib.utils.book_append_sheet(workbook, XLSXLib.utils.aoa_to_sheet(pacientes), 'Pacientes');
        XLSXLib.utils.book_append_sheet(workbook, XLSXLib.utils.aoa_to_sheet(ciclos), 'Ciclos');
        return XLSXLib.write(workbook, { bookType: 'xlsx', type: 'array' });
    }

    root.FarmaciaKisqaliInforme = Object.freeze({
        VERSION: VERSION,
        FIXTURE_ID: FIXTURE_ID,
        MODES: Object.freeze(MODES.slice()),
        MODE_LABELS: Object.freeze(MODE_LABELS),
        NON_EVALUABLE_UNKNOWN_DOSE: NON_EVALUABLE_UNKNOWN_DOSE,
        NON_EVALUABLE_MID_CYCLE: NON_EVALUABLE_MID_CYCLE,
        PROVENANCE_NOTICE: PROVENANCE_NOTICE,
        CALCULATION_NOTICE: CALCULATION_NOTICE,
        UNKNOWN_DOSE_LABEL: UNKNOWN_DOSE_LABEL,
        ABSENT_PRESENTATION_LABEL: ABSENT_PRESENTATION_LABEL,
        listPeriods: listPeriods,
        latestPeriod: latestPeriod,
        monthRange: monthRange,
        meanDisplay: meanDisplay,
        presentationDisplay: presentationDisplay,
        computeReport: computeReport,
        buildWorkbook: buildWorkbook
    });
})(typeof window !== 'undefined' ? window : globalThis);
