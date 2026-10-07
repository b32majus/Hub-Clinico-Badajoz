/* Informe trimestral Cosentyx (#576) — pure calculation model, DOM-free.
 *
 * Closed temporal contract: ISO date-only YYYY-MM-DD; calendar quarter
 * YYYY-Q1..Q4; start/end boundaries inclusive; no wall-clock dependence.
 *
 * Clinical classification rules (never inferred, only explicit fixture facts):
 * - VALIDATED != DISPENSED: only an explicit first Cosentyx dispensing anchors
 *   a new start; validation-only or current-treatment-only is NOT a new start.
 * - HS q2w start: explicit first dispensing inside the quarter AND explicit
 *   q2w regime at start; an unknown regime stays non-classifiable.
 * - HS intensification: explicit q4w -> q2w movement with effective_at inside
 *   the quarter.
 * - Total unique patients = cardinality of unique patient_id over included
 *   detail rows, never a blind sum of category counts.
 */
(function (root) {
    'use strict';

    var VERSION = 'farmacia_cosentyx_informe_model_v1';
    var FIXTURE_ID = 'farmacia_cosentyx_informe_fixture_v1';
    var DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
    var QUARTER_END = { 1: '03-31', 2: '06-30', 3: '09-30', 4: '12-31' };

    var CATEGORIES = [
        { key: 'pso_start', label: 'PsO — nuevos inicios', caseLabel: 'PsO — nuevo inicio' },
        { key: 'psa_start', label: 'PsA — nuevos inicios', caseLabel: 'PsA — nuevo inicio' },
        { key: 'hs_start_q2w', label: 'HS — nuevos inicios q2w', caseLabel: 'HS — nuevo inicio q2w' },
        { key: 'hs_intensification', label: 'HS — intensificaciones q4w → q2w', caseLabel: 'HS — intensificación q4w → q2w' }
    ];

    function fail(message) {
        throw new Error(message);
    }

    function assertDateOnly(value, context) {
        if (typeof value !== 'string' || !DATE_ONLY.test(value)) {
            fail('Fecha no ISO date-only en ' + context + ': ' + String(value));
        }
        return value;
    }

    function quarterRange(quarterKey) {
        var match = /^(\d{4})-Q([1-4])$/.exec(String(quarterKey || ''));
        if (!match) fail('Trimestre inválido: ' + String(quarterKey));
        var startMonth = String((Number(match[2]) - 1) * 3 + 1).padStart(2, '0');
        return {
            key: match[1] + '-Q' + match[2],
            start: match[1] + '-' + startMonth + '-01',
            end: match[1] + '-' + QUARTER_END[Number(match[2])]
        };
    }

    function quarterOfDate(dateOnly) {
        return dateOnly.slice(0, 4) + '-Q' + Math.ceil(Number(dateOnly.slice(5, 7)) / 3);
    }

    function inInclusiveRange(dateOnly, range) {
        return range.start <= dateOnly && dateOnly <= range.end;
    }

    function assertFixture(fixture) {
        if (!fixture || fixture.synthetic !== true || fixture.fixture_id !== FIXTURE_ID) {
            fail('El informe Cosentyx exige el fixture sintético dedicado ' + FIXTURE_ID + '.');
        }
        if (!fixture.provenance || fixture.provenance.kind !== 'synthetic_demo_fixture') {
            fail('Fixture sin procedencia sintética explícita.');
        }
    }

    function cosentyxPatients(fixture) {
        return fixture.patients.filter(function (patient) { return patient.drug === 'Cosentyx'; });
    }

    function listQuarters(fixture) {
        assertFixture(fixture);
        var seen = {};
        function collect(dateOnly) {
            if (!dateOnly) return;
            assertDateOnly(dateOnly, 'fixture');
            seen[quarterOfDate(dateOnly)] = true;
        }
        cosentyxPatients(fixture).forEach(function (patient) {
            collect(patient.first_dispensing_at);
            (patient.regime_movements || []).forEach(function (movement) {
                collect(movement && movement.effective_at);
            });
        });
        return Object.keys(seen).sort();
    }

    function explicitRegime(value) {
        return value === 'q2w' || value === 'q4w' ? value : null;
    }

    function computeReport(fixture, quarterKey) {
        assertFixture(fixture);
        var range = quarterRange(quarterKey);
        var rowsByCategory = {};
        CATEGORIES.forEach(function (category) { rowsByCategory[category.key] = []; });

        function addRow(categoryKey, patient, factDate, regime) {
            rowsByCategory[categoryKey].push({
                patient_id: patient.patient_id,
                pathology: patient.pathology,
                fact_date: factDate,
                regime: regime
            });
        }

        cosentyxPatients(fixture).forEach(function (patient) {
            var firstDispensing = patient.first_dispensing_at
                ? assertDateOnly(patient.first_dispensing_at, patient.patient_id)
                : null;
            var initialRegime = explicitRegime(patient.initial_regime);
            var startsInQuarter = !!firstDispensing && inInclusiveRange(firstDispensing, range);

            if (startsInQuarter && patient.pathology === 'PsO') {
                addRow('pso_start', patient, firstDispensing, initialRegime);
            }
            if (startsInQuarter && patient.pathology === 'PsA') {
                addRow('psa_start', patient, firstDispensing, initialRegime);
            }
            if (startsInQuarter && patient.pathology === 'HS' && initialRegime === 'q2w') {
                addRow('hs_start_q2w', patient, firstDispensing, initialRegime);
            }
            (patient.regime_movements || []).forEach(function (movement) {
                var effective = movement && movement.effective_at
                    ? assertDateOnly(movement.effective_at, patient.patient_id)
                    : null;
                if (patient.pathology === 'HS' && movement
                    && movement.from === 'q4w' && movement.to === 'q2w'
                    && effective && inInclusiveRange(effective, range)) {
                    addRow('hs_intensification', patient, effective, 'q4w → q2w');
                }
            });
        });

        function byFactThenPatient(left, right) {
            return left.fact_date < right.fact_date ? -1
                : (left.fact_date > right.fact_date ? 1
                    : (left.patient_id < right.patient_id ? -1 : (left.patient_id > right.patient_id ? 1 : 0)));
        }

        var detailRows = [];
        var counts = {};
        CATEGORIES.forEach(function (category) {
            var rows = rowsByCategory[category.key].sort(byFactThenPatient);
            counts[category.key] = rows.length;
            rows.forEach(function (row) {
                detailRows.push({
                    patient_id: row.patient_id,
                    pathology: row.pathology,
                    case_type: category.caseLabel,
                    fact_date: row.fact_date,
                    regime: row.regime
                });
            });
        });

        var uniquePatients = {};
        detailRows.forEach(function (row) { uniquePatients[row.patient_id] = true; });

        return Object.freeze({
            quarter: Object.freeze({
                key: range.key,
                label: range.key,
                start: range.start,
                end: range.end
            }),
            categories: Object.freeze(CATEGORIES.map(function (category) {
                return Object.freeze({ key: category.key, label: category.label, count: counts[category.key] });
            })),
            counts_by_category: Object.freeze(counts),
            detail_rows: Object.freeze(detailRows.map(function (row) { return Object.freeze(row); })),
            unique_patient_count: Object.keys(uniquePatients).length,
            fixture_id: fixture.fixture_id
        });
    }

    /* Real XLSX built from the SAME computed result shown in the UI.
       SheetJS is injected so the model stays DOM-free and testable in Node. */
    function buildWorkbook(report, XLSXLib) {
        if (!report || !report.quarter || !Array.isArray(report.detail_rows)
            || !Array.isArray(report.categories)) {
            fail('buildWorkbook exige un informe calculado por computeReport.');
        }
        if (!XLSXLib || typeof XLSXLib.write !== 'function' || !XLSXLib.utils) {
            fail('SheetJS (XLSX) no está disponible para generar el Excel del informe.');
        }
        var resumen = [
            ['Informe trimestral Cosentyx'],
            ['Periodo', report.quarter.key],
            ['Inicio', report.quarter.start],
            ['Fin', report.quarter.end],
            ['Procedencia', 'Datos sintéticos específicos del informe'],
            [],
            ['Categoría', 'Pacientes']
        ];
        report.categories.forEach(function (category) {
            resumen.push([category.label, category.count]);
        });
        resumen.push(['Total pacientes únicos incluidos', report.unique_patient_count]);

        var detalle = [
            ['Paciente (sintético)', 'Patología', 'Tipo de caso', 'Fecha del hecho que incluye', 'Régimen explícito']
        ];
        report.detail_rows.forEach(function (row) {
            detalle.push([
                row.patient_id,
                row.pathology,
                row.case_type,
                row.fact_date,
                row.regime || 'No registrado'
            ]);
        });

        var workbook = XLSXLib.utils.book_new();
        XLSXLib.utils.book_append_sheet(workbook, XLSXLib.utils.aoa_to_sheet(resumen), 'Resumen');
        XLSXLib.utils.book_append_sheet(workbook, XLSXLib.utils.aoa_to_sheet(detalle), 'Detalle');
        return XLSXLib.write(workbook, { bookType: 'xlsx', type: 'array' });
    }

    root.FarmaciaCosentyxInforme = Object.freeze({
        VERSION: VERSION,
        FIXTURE_ID: FIXTURE_ID,
        CATEGORIES: Object.freeze(CATEGORIES.map(function (category) { return Object.freeze(category); })),
        quarterRange: quarterRange,
        listQuarters: listQuarters,
        computeReport: computeReport,
        buildWorkbook: buildWorkbook
    });
})(typeof window !== 'undefined' ? window : globalThis);
