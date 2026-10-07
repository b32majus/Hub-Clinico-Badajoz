/* Informes (#576) — integration of the quarterly Cosentyx report inside the
 * statistics page.
 *
 * - Informes is a distinct surface from the population analysis; population
 *   quick filters do NOT govern this report.
 * - All counts/rows come from FarmaciaCosentyxInforme.computeReport over the
 *   dedicated synthetic fixture; nothing is hardcoded in this layer.
 * - The XLSX download is generated from the SAME computed result shown in the
 *   UI, via the local SheetJS vendor script (no new dependency).
 */
(function () {
    'use strict';

    var Informe = window.FarmaciaCosentyxInforme;
    var Fixture = window.FarmaciaCosentyxInformeFixture;
    var XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    var selectedQuarter = null;
    var currentReport = null;

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
        renderQuarterOptions();
        var select = document.getElementById('informes-quarter-select');
        if (select) select.addEventListener('change', renderReport);
        var downloadButton = document.getElementById('informes-download-xlsx');
        if (downloadButton) downloadButton.addEventListener('click', downloadXlsx);
        var informesButton = document.getElementById('informes-view-btn');
        if (informesButton) informesButton.addEventListener('click', function () { setMode(true); });
        var populationButton = document.getElementById('population-view-btn');
        if (populationButton) populationButton.addEventListener('click', function () { setMode(false); });
        renderReport();
        setMode(false);
    }

    document.addEventListener('DOMContentLoaded', bootstrap);

    window.FarmaciaEstadisticasInformes = Object.freeze({
        getState: function () {
            if (!currentReport) return null;
            return {
                quarter: currentReport.quarter.key,
                counts: JSON.parse(JSON.stringify(currentReport.counts_by_category)),
                unique_patient_count: currentReport.unique_patient_count,
                detail_row_count: currentReport.detail_rows.length,
                detail_patient_ids: currentReport.detail_rows.map(function (row) { return row.patient_id; })
            };
        }
    });
})();
