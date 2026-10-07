/* Informes (#576/#579) — integration of the reports inside the statistics page.
 *
 * - Informes is a distinct surface from the population analysis; population
 *   quick filters do NOT govern these reports.
 * - Report selector (#579): 'Informe trimestral Cosentyx' (default, #576
 *   behavior unchanged) and 'Informe de utilización y dosis — Kisqali'.
 * - Cosentyx counts/rows come from FarmaciaCosentyxInforme.computeReport over
 *   its dedicated synthetic fixture; Kisqali comes from
 *   FarmaciaKisqaliInforme.computeReport over its own dedicated synthetic
 *   fixture of explicit monthly cycles. Nothing is hardcoded in this layer.
 * - Kisqali wording does not imply consumption: the calculation uses only
 *   explicitly registered doses and cycles; no rest week, no adherence, no
 *   dispensing.
 * - The XLSX downloads are generated from the SAME computed results shown in
 *   the UI, via the local SheetJS vendor script (no new dependency).
 */
(function () {
    'use strict';

    var Informe = window.FarmaciaCosentyxInforme;
    var Fixture = window.FarmaciaCosentyxInformeFixture;
    var Kisqali = window.FarmaciaKisqaliInforme;
    var KisqaliFixture = window.FarmaciaKisqaliInformeFixture;
    var XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    var selectedQuarter = null;
    var currentReport = null;
    var activeReport = 'cosentyx';
    var currentKisqaliReport = null;

    var REPORT_META = {
        cosentyx: {
            title: 'Informe trimestral Cosentyx',
            subtitle: 'Informe de demostración calculado exclusivamente desde un fixture sintético dedicado. La proyección raw actual no contiene hechos de dispensación; este informe no es una capacidad de la fuente real.'
        },
        kisqali: {
            title: 'Informe de utilización y dosis — Kisqali',
            subtitle: 'Informe de demostración de dosis y ciclos mensuales explícitos de un fixture sintético dedicado. Calculada exclusivamente a partir de dosis y ciclos explícitamente registrados; no implica consumo, adherencia ni dispensación real.'
        }
    };

    var KISQALI_KPI_LABELS = {
        patients: 'Pacientes con ≥1 ciclo observado',
        closing_200: 'Cierre 200 mg',
        closing_400: 'Cierre 400 mg',
        closing_600: 'Cierre 600 mg',
        closing_otra: 'Cierre otra/desconocida',
        cohort_mean: 'Dosis media de régimen (cohorte)',
        patients_with_change: 'Pacientes con cambio explícito',
        coverage: 'Cobertura de dosis explícita'
    };

    function fail(message) {
        throw new Error(message);
    }

    function clearChildren(parent) {
        while (parent && parent.firstChild) parent.removeChild(parent.firstChild);
    }

    function el(tag, className, value) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (value !== undefined && value !== null) node.textContent = value;
        return node;
    }

    function setText(id, value) {
        var node = document.getElementById(id);
        if (node) node.textContent = value;
    }

    function setHidden(node, hidden) {
        if (node) node.hidden = hidden;
    }

    /* ---------- Informe trimestral Cosentyx (#576, default) ---------- */

    function renderQuarterOptions() {
        var select = document.getElementById('informes-quarter-select');
        if (!select) return;
        clearChildren(select);
        Informe.listQuarters(Fixture).forEach(function (quarterKey) {
            var option = el('option', '', quarterKey);
            option.value = quarterKey;
            select.appendChild(option);
        });
    }

    function renderKpis(report) {
        var container = document.getElementById('informes-kpis');
        if (!container) return;
        clearChildren(container);
        report.categories.forEach(function (category) {
            var card = el('div', 'informes-kpi');
            card.dataset.informesKpi = category.key;
            card.appendChild(el('div', 'informes-kpi-label', category.label));
            card.appendChild(el('div', 'informes-kpi-value', String(category.count)));
            container.appendChild(card);
        });
        var total = el('div', 'informes-kpi informes-kpi--total');
        total.dataset.informesKpi = 'unique';
        total.appendChild(el('div', 'informes-kpi-label', 'Pacientes únicos incluidos'));
        total.appendChild(el('div', 'informes-kpi-value', String(report.unique_patient_count)));
        container.appendChild(total);
    }

    function renderDetail(report) {
        var head = document.querySelector('#informes-detail-table thead');
        var body = document.querySelector('#informes-detail-table tbody');
        if (!head || !body) return;
        clearChildren(head);
        clearChildren(body);
        var header = el('tr');
        ['Paciente (sintético)', 'Patología', 'Tipo de caso', 'Fecha del hecho que incluye', 'Régimen explícito']
            .forEach(function (column) { header.appendChild(el('th', '', column)); });
        head.appendChild(header);
        if (!report.detail_rows.length) {
            var empty = el('tr');
            var emptyCell = el('td', '', 'Sin casos incluidos en el trimestre seleccionado.');
            emptyCell.colSpan = 5;
            empty.appendChild(emptyCell);
            body.appendChild(empty);
            return;
        }
        report.detail_rows.forEach(function (row) {
            var tr = el('tr');
            tr.appendChild(el('td', '', row.patient_id));
            tr.appendChild(el('td', '', row.pathology));
            tr.appendChild(el('td', '', row.case_type));
            tr.appendChild(el('td', '', row.fact_date));
            tr.appendChild(el('td', '', Informe.regimeDisplay(row.regime)));
            body.appendChild(tr);
        });
    }

    function renderReport() {
        var select = document.getElementById('informes-quarter-select');
        if (!select || !select.value) return;
        selectedQuarter = select.value;
        currentReport = Informe.computeReport(Fixture, selectedQuarter);
        setText('informes-period', currentReport.quarter.label);
        renderKpis(currentReport);
        renderDetail(currentReport);
    }

    function downloadXlsx() {
        if (!currentReport) return;
        if (typeof window.XLSX === 'undefined') {
            fail('SheetJS (XLSX) no está disponible. No se puede generar el Excel del informe.');
        }
        var buffer = Informe.buildWorkbook(currentReport, window.XLSX);
        var blob = new Blob([buffer], { type: XLSX_MIME });
        var anchor = document.createElement('a');
        anchor.href = URL.createObjectURL(blob);
        anchor.download = 'informe_trimestral_cosentyx_' + currentReport.quarter.key + '.xlsx';
        anchor.click();
        URL.revokeObjectURL(anchor.href);
    }

    /* ---------- Informe de utilización y dosis — Kisqali (#579) ---------- */

    function renderKisqaliPeriodOptions(resetToLatest) {
        var modeSelect = document.getElementById('kisqali-mode-select');
        var periodSelect = document.getElementById('kisqali-period-select');
        var periodLabel = document.getElementById('kisqali-period-label');
        if (!modeSelect || !periodSelect) return;
        var periods = Kisqali.listPeriods(KisqaliFixture, modeSelect.value);
        clearChildren(periodSelect);
        /* Histórico covers every explicit cycle through the fixture maximum:
         * it has no period selector and no wall-clock anchor. */
        var hasPeriods = periods.length > 0;
        setHidden(periodSelect, !hasPeriods);
        setHidden(periodLabel, !hasPeriods);
        if (!hasPeriods) return;
        periods.forEach(function (periodKey) {
            var option = el('option', '', periodKey);
            option.value = periodKey;
            periodSelect.appendChild(option);
        });
        var previous = periodSelect.dataset.previousPeriod;
        if (!resetToLatest && previous && periods.indexOf(previous) !== -1) {
            periodSelect.value = previous;
        } else {
            periodSelect.value = periods[periods.length - 1];
        }
    }

    function renderKisqaliKpis(report) {
        var container = document.getElementById('kisqali-kpis');
        if (!container) return;
        clearChildren(container);
        var values = {
            patients: String(report.patient_count),
            closing_200: String(report.closing_distribution.dose_200),
            closing_400: String(report.closing_distribution.dose_400),
            closing_600: String(report.closing_distribution.dose_600),
            closing_otra: String(report.closing_distribution.otra_desconocida),
            cohort_mean: report.cohort_mean.display + ' mg',
            patients_with_change: String(report.patients_with_change_count),
            coverage: report.coverage.numerator + '/' + report.coverage.denominator
                + ' · ' + report.coverage.percentage_display
        };
        Object.keys(KISQALI_KPI_LABELS).forEach(function (key) {
            var card = el('div', 'informes-kpi');
            card.dataset.kisqaliKpi = key;
            card.appendChild(el('div', 'informes-kpi-label', KISQALI_KPI_LABELS[key]));
            card.appendChild(el('div', 'informes-kpi-value', values[key]));
            container.appendChild(card);
        });
    }

    function kisqaliDoseCell(row) {
        return row.dose_mg === null
            ? Kisqali.UNKNOWN_DOSE_LABEL
            : String(row.dose_mg) + ' mg';
    }

    function buildKisqaliCiclosTable(cycles) {
        var table = el('table', 'data-table kisqali-ciclos-table');
        var head = el('thead');
        var headRow = el('tr');
        ['Mes de ciclo', 'Inicio de ciclo', 'Dosis', 'Presentación explícita',
            'Cambio explícito', 'Evaluable para dosis', 'Motivo cuando no evaluable']
            .forEach(function (column) { headRow.appendChild(el('th', '', column)); });
        head.appendChild(headRow);
        table.appendChild(head);
        var body = el('tbody');
        cycles.forEach(function (row) {
            var tr = el('tr');
            tr.appendChild(el('td', '', row.cycle_month));
            tr.appendChild(el('td', '', row.cycle_start));
            tr.appendChild(el('td', '', kisqaliDoseCell(row)));
            tr.appendChild(el('td', '', Kisqali.presentationDisplay(row.presentation_label)));
            tr.appendChild(el('td', '', row.change_display ? row.change_display : '—'));
            tr.appendChild(el('td', '', row.evaluable ? 'Sí' : 'No'));
            tr.appendChild(el('td', '', row.non_evaluable_reason === null ? '' : row.non_evaluable_reason));
            body.appendChild(tr);
        });
        table.appendChild(body);
        return table;
    }

    function renderKisqaliPatients(report) {
        var head = document.querySelector('#kisqali-patients-table thead');
        var body = document.querySelector('#kisqali-patients-table tbody');
        if (!head || !body) return;
        clearChildren(head);
        clearChildren(body);
        var header = el('tr');
        ['Paciente (sintético)', 'Presentación (último ciclo observado)', 'Dosis inicial (ventana)',
            'Dosis final (ventana)', 'Cambios explícitos', 'Ciclos observados',
            'Ciclos con dosis evaluable', 'Dosis media (mg)', 'Ciclos']
            .forEach(function (column) { header.appendChild(el('th', '', column)); });
        head.appendChild(header);

        var cyclesByPatient = {};
        report.observed_cycles.forEach(function (row) {
            if (!cyclesByPatient[row.patient_id]) cyclesByPatient[row.patient_id] = [];
            cyclesByPatient[row.patient_id].push(row);
        });

        if (!report.patients.length) {
            var empty = el('tr');
            var emptyCell = el('td', '', 'Sin ciclos observados en la ventana seleccionada.');
            emptyCell.colSpan = 9;
            empty.appendChild(emptyCell);
            body.appendChild(empty);
            return;
        }

        report.patients.forEach(function (patient) {
            var tr = el('tr');
            tr.dataset.kisqaliPatient = patient.patient_id;
            tr.appendChild(el('td', '', patient.patient_id));
            tr.appendChild(el('td', '', patient.last_presentation_display));
            tr.appendChild(el('td', '', patient.initial_dose === null
                ? Kisqali.UNKNOWN_DOSE_LABEL : String(patient.initial_dose) + ' mg'));
            tr.appendChild(el('td', '', patient.final_dose === null
                ? Kisqali.UNKNOWN_DOSE_LABEL : String(patient.final_dose) + ' mg'));
            tr.appendChild(el('td', '', String(patient.change_count)));
            tr.appendChild(el('td', '', String(patient.observed_count)));
            tr.appendChild(el('td', '', String(patient.evaluable_count)));
            tr.appendChild(el('td', '', patient.mean_display === Kisqali.UNKNOWN_DOSE_LABEL
                ? patient.mean_display : patient.mean_display + ' mg'));

            var actionCell = el('td');
            var toggle = el('button', 'btn btn-sm btn-outline kisqali-ciclos-toggle', 'Ver ciclos');
            toggle.type = 'button';
            toggle.dataset.kisqaliCiclosToggle = patient.patient_id;
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-controls', 'kisqali-ciclos-' + patient.patient_id);
            actionCell.appendChild(toggle);
            tr.appendChild(actionCell);
            body.appendChild(tr);

            var cyclesRow = el('tr', 'kisqali-ciclos-row');
            cyclesRow.id = 'kisqali-ciclos-' + patient.patient_id;
            cyclesRow.hidden = true;
            var cyclesCell = el('td');
            cyclesCell.colSpan = 9;
            cyclesCell.appendChild(buildKisqaliCiclosTable(cyclesByPatient[patient.patient_id] || []));
            cyclesRow.appendChild(cyclesCell);
            body.appendChild(cyclesRow);
        });
    }

    function renderKisqaliReport() {
        var modeSelect = document.getElementById('kisqali-mode-select');
        var periodSelect = document.getElementById('kisqali-period-select');
        if (!modeSelect) return;
        var mode = modeSelect.value;
        var periodKey = mode === 'historico' ? null : periodSelect.value;
        if (mode !== 'historico' && periodSelect) periodSelect.dataset.previousPeriod = periodSelect.value;
        currentKisqaliReport = Kisqali.computeReport(KisqaliFixture, mode, periodKey);
        setText('kisqali-window-label', mode === 'historico'
            ? currentKisqaliReport.period.label
            : currentKisqaliReport.mode_label + ' — ' + currentKisqaliReport.period.label);
        renderKisqaliKpis(currentKisqaliReport);
        renderKisqaliPatients(currentKisqaliReport);
    }

    function downloadKisqaliXlsx() {
        if (!currentKisqaliReport) return;
        if (typeof window.XLSX === 'undefined') {
            fail('SheetJS (XLSX) no está disponible. No se puede generar el Excel del informe.');
        }
        var buffer = Kisqali.buildWorkbook(currentKisqaliReport, window.XLSX);
        var blob = new Blob([buffer], { type: XLSX_MIME });
        var anchor = document.createElement('a');
        anchor.href = URL.createObjectURL(blob);
        var suffix = currentKisqaliReport.mode === 'historico'
            ? 'historico'
            : currentKisqaliReport.mode + '_' + currentKisqaliReport.period.key;
        anchor.download = 'informe_kisqali_utilizacion_dosis_' + suffix + '.xlsx';
        anchor.click();
        URL.revokeObjectURL(anchor.href);
    }

    /* ---------- Shared Informes shell ---------- */

    function setReport(report) {
        if (!REPORT_META[report]) fail('Informe desconocido: ' + String(report));
        activeReport = report;
        setText('informes-title-text', REPORT_META[report].title);
        setText('informes-subtitle', REPORT_META[report].subtitle);
        setHidden(document.getElementById('informes-cosentyx-controls'), report !== 'cosentyx');
        setHidden(document.getElementById('informes-kisqali-controls'), report !== 'kisqali');
        setHidden(document.getElementById('informes-cosentyx-panel'), report !== 'cosentyx');
        setHidden(document.getElementById('informes-kisqali-panel'), report !== 'kisqali');
        if (report === 'kisqali') {
            renderKisqaliPeriodOptions(true);
            renderKisqaliReport();
        }
    }

    function setMode(showInformes) {
        var main = document.querySelector('main.main-content');
        if (main) main.classList.toggle('farmacia-informes-mode', showInformes);
        var populationButton = document.getElementById('population-view-btn');
        var informesButton = document.getElementById('informes-view-btn');
        if (populationButton) populationButton.setAttribute('aria-pressed', showInformes ? 'false' : 'true');
        if (informesButton) informesButton.setAttribute('aria-pressed', showInformes ? 'true' : 'false');
    }

    function bootstrap() {
        if (!Informe || !Fixture) {
            fail('El informe Cosentyx no se pudo cargar: faltan el modelo o el fixture sintético dedicado.');
        }
        if (!Kisqali || !KisqaliFixture) {
            fail('El informe Kisqali no se pudo cargar: faltan el modelo o el fixture sintético dedicado.');
        }
        renderQuarterOptions();
        var select = document.getElementById('informes-quarter-select');
        if (select) select.addEventListener('change', renderReport);
        var downloadButton = document.getElementById('informes-download-xlsx');
        if (downloadButton) downloadButton.addEventListener('click', downloadXlsx);

        var reportSelect = document.getElementById('informes-report-select');
        if (reportSelect) reportSelect.addEventListener('change', function () {
            setReport(reportSelect.value);
        });
        var kisqaliModeSelect = document.getElementById('kisqali-mode-select');
        if (kisqaliModeSelect) kisqaliModeSelect.addEventListener('change', function () {
            renderKisqaliPeriodOptions(true);
            renderKisqaliReport();
        });
        var kisqaliPeriodSelect = document.getElementById('kisqali-period-select');
        if (kisqaliPeriodSelect) kisqaliPeriodSelect.addEventListener('change', renderKisqaliReport);
        var kisqaliDownloadButton = document.getElementById('kisqali-download-xlsx');
        if (kisqaliDownloadButton) kisqaliDownloadButton.addEventListener('click', downloadKisqaliXlsx);
        var kisqaliTable = document.getElementById('kisqali-patients-table');
        if (kisqaliTable) kisqaliTable.addEventListener('click', function (event) {
            var target = event.target;
            var button = target && target.closest ? target.closest('.kisqali-ciclos-toggle') : null;
            if (!button) return;
            var cyclesRow = document.getElementById('kisqali-ciclos-' + button.dataset.kisqaliCiclosToggle);
            if (!cyclesRow) return;
            var expanded = button.getAttribute('aria-expanded') === 'true';
            button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            cyclesRow.hidden = expanded;
        });

        var informesButton = document.getElementById('informes-view-btn');
        if (informesButton) informesButton.addEventListener('click', function () { setMode(true); });
        var populationButton = document.getElementById('population-view-btn');
        if (populationButton) populationButton.addEventListener('click', function () { setMode(false); });
        renderReport();
        setReport('cosentyx');
        setMode(false);
    }

    document.addEventListener('DOMContentLoaded', bootstrap);

    window.FarmaciaEstadisticasInformes = Object.freeze({
        getState: function () {
            if (activeReport === 'kisqali') {
                if (!currentKisqaliReport) return { report: 'kisqali', kisqali: null };
                var report = currentKisqaliReport;
                return {
                    report: 'kisqali',
                    kisqali: {
                        mode: report.mode,
                        mode_label: report.mode_label,
                        period: report.period.key,
                        period_label: report.period.label,
                        patient_count: report.patient_count,
                        observed_cycle_count: report.observed_cycle_count,
                        evaluable_cycle_count: report.evaluable_cycle_count,
                        closing_distribution: JSON.parse(JSON.stringify(report.closing_distribution)),
                        cohort_mean: {
                            numerator: report.cohort_mean.numerator,
                            denominator: report.cohort_mean.denominator,
                            value: report.cohort_mean.value,
                            display: report.cohort_mean.display
                        },
                        change_count: report.change_count,
                        patients_with_change_count: report.patients_with_change_count,
                        coverage: {
                            numerator: report.coverage.numerator,
                            denominator: report.coverage.denominator,
                            percentage_display: report.coverage.percentage_display
                        },
                        patients: report.patients.map(function (patient) {
                            return {
                                patient_id: patient.patient_id,
                                initial_dose: patient.initial_dose,
                                final_dose: patient.final_dose,
                                change_count: patient.change_count,
                                observed_count: patient.observed_count,
                                evaluable_count: patient.evaluable_count,
                                mean_display: patient.mean_display
                            };
                        })
                    }
                };
            }
            if (!currentReport) return null;
            return {
                report: 'cosentyx',
                quarter: currentReport.quarter.key,
                counts: JSON.parse(JSON.stringify(currentReport.counts_by_category)),
                unique_patient_count: currentReport.unique_patient_count,
                detail_row_count: currentReport.detail_rows.length,
                detail_patient_ids: currentReport.detail_rows.map(function (row) { return row.patient_id; })
            };
        }
    });
})();
