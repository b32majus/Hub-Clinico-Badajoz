'use strict';

(function () {
    var Cohort = window.FarmaciaStatisticsCohort;
    var Handoff = window.FarmaciaStatisticsHandoff;
    var allPatients = [];
    var filteredPatients = [];
    var currentFilters = {};
    var currentPage = 1;
    var ITEMS_PER_PAGE = 50;
    var sourceMode = 'loading';
    var sourceMetadata = {};

    function present(value) {
        return value !== null && value !== undefined && (typeof value !== 'string' || value.trim() !== '');
    }

    function text(value, fallback) {
        return present(value) ? String(value) : (fallback || 'No registrado');
    }

    function clone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function compareText(left, right) {
        var a = String(left === null || left === undefined ? '' : left);
        var b = String(right === null || right === undefined ? '' : right);
        return a < b ? -1 : (a > b ? 1 : 0);
    }

    function unique(values) {
        var seen = {};
        return (values || []).filter(function (value) {
            if (!present(value)) return false;
            var key = String(value);
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        }).map(String).sort(compareText);
    }

    function contextValues(values) {
        return unique((values || []).map(function (value) {
            return present(value && value.label) ? value.label : (present(value && value.code) ? value.code : '');
        }));
    }

    function normalizeProfile(patient) {
        var lines = patient.lines || [];
        var activeLines = lines.filter(function (line) { return line.active_at_event === true; });
        var adherence = patient.adherence_summary || { result: 'not_recorded' };
        var latestProms = patient.latest_proms || [];
        return {
            identifier: patient.primary_identifier_value || '',
            services: contextValues(patient.services),
            pathologies: contextValues(patient.pathologies),
            drugNames: unique(lines.map(function (line) { return line.drug_name; })),
            activeIngredients: unique(lines.map(function (line) { return line.active_ingredient; })),
            activeLineIngredients: unique(activeLines.map(function (line) { return line.active_ingredient; })),
            activeLines: activeLines,
            careStatus: patient.care_status || 'not_recorded',
            validationResult: patient.latest_validation && patient.latest_validation.validation_result || 'not_recorded',
            adherenceResult: present(adherence.result) ? String(adherence.result) : 'not_recorded',
            adverseStatus: patient.adverse_event_overall_status || 'not_recorded',
            promInstruments: unique(latestProms.map(function (prom) { return prom.instrument; })),
            movementTypes: unique((patient.therapeutic_movements || []).map(function (movement) { return movement.type; })),
            adverseSeverities: unique((patient.adverse_events || []).filter(function (event) {
                return event.status === 'present';
            }).map(function (event) { return event.severity; }))
        };
    }

    function wrapCohort(cohort) {
        return (cohort || []).map(function (patient) {
            return { record: patient, profile: normalizeProfile(patient) };
        });
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

    function icon(name) {
        var node = el('i', 'fas ' + name);
        node.setAttribute('aria-hidden', 'true');
        return node;
    }

    function setText(id, value) {
        var node = document.getElementById(id);
        if (node) node.textContent = value;
    }

    function updateFooter(message) {
        var node = document.querySelector('.stats-demo-footer-content span');
        if (node) node.textContent = message;
    }

    function updateBanner(message) {
        var node = document.querySelector('.demo-banner span');
        if (node) node.textContent = message;
    }

    function setSourceStatus(label, detail, notice) {
        setText('dbStatusLabel', label);
        setText('dbStatusTime', detail);
        var noticeNode = document.getElementById('statsImportNotice');
        if (noticeNode) {
            clearChildren(noticeNode);
            noticeNode.appendChild(icon('fa-info-circle'));
            noticeNode.appendChild(document.createTextNode(' ' + notice));
        }
    }

    function setWaitingState() {
        sourceMode = 'waiting';
        setSourceStatus('Esperando cohorte desde Inicio…', 'Handoff temporal', 'Esperando una cohorte raw normalizada desde Inicio. No se ha cargado ninguna demo durante el handoff.');
        updateFooter('Esperando cohorte raw desde Inicio · memoria temporal · datos de evaluación.');
        updateBanner('Datos sintéticos de evaluación. La cohorte raw solo se mantiene en memoria durante esta ventana.');
        var exportButton = document.getElementById('exportReportBtn');
        if (exportButton) exportButton.disabled = true;
    }

    function setErrorState(error) {
        sourceMode = 'error';
        sourceMetadata = {};
        allPatients = [];
        filteredPatients = [];
        setSourceStatus('Error de handoff', 'Vuelva a Inicio para cargar el Excel', 'No se pudo validar la cohorte recibida. Vuelva a Inicio y abra Estadísticas de nuevo. No se muestran datos parciales.');
        updateFooter('Error de handoff · no se ha conservado ninguna cohorte.');
        updateBanner('Datos sintéticos de evaluación. El handoff raw falló de forma cerrada.');
        renderAll();
        if (window.console && typeof window.console.warn === 'function') {
            window.console.warn('[Farmacia Estadísticas] Handoff rechazado:', error && error.message || error);
        }
    }

    function setCohort(mode, cohort, metadata) {
        sourceMode = mode;
        sourceMetadata = metadata || {};
        allPatients = wrapCohort(cohort);
        filteredPatients = allPatients.slice();
        currentFilters = {};
        currentPage = 1;
        clearFilterControls();
        populateFilters();
        if (mode === 'raw') {
            var fileName = sourceMetadata.source_file_name || 'Excel Farmacia';
            var detail = fileName + ' · ' + allPatients.length + ' pacientes · ' + Number(sourceMetadata.event_count || 0) + ' eventos';
            var label = allPatients.length ? 'Cohorte raw recibida' : 'Cohorte raw vacía';
            setSourceStatus(label, detail, 'Datos del Excel cargado · ' + fileName + ' · ' + allPatients.length + ' pacientes · ' + Number(sourceMetadata.event_count || 0) + ' eventos · memoria temporal · datos de evaluación.');
            updateFooter('Cohorte raw en memoria temporal · datos sintéticos de evaluación · no usar para decisiones clínicas.');
            updateBanner('Cohorte raw sintética de evaluación. Memoria temporal, sin persistencia y sin uso clínico.');
        } else {
            setSourceStatus('Demo sintética', allPatients.length + ' pacientes · JSON versionado', 'Demo sintética desde farmacia_longitudinal_demo_v0_3.json. Datos inventados; no existe cohorte raw cargada.');
            updateFooter('Datos demo/sintéticos · no usar para decisiones clínicas.');
            updateBanner('Demo Farmacia v0.3 · Datos sintéticos. Prototipo funcional sin datos reales ni seguridad productiva.');
        }
        renderAll();
    }

    function careLabel(value) {
        var labels = {
            pending: 'Pendiente', validated: 'Validado', denied: 'Denegado',
            followup: 'En seguimiento', not_recorded: 'No registrado'
        };
        return labels[value] || text(value);
    }

    function adverseLabel(value) {
        var labels = { present: 'Presente', absent: 'Ausencia registrada', not_recorded: 'No registrado' };
        return labels[value] || text(value);
    }

    function deriveFilterOptions() {
        var values = { servicio: [], patologia: [], farmaco: [], estado: [], ea: [], adherencia: [] };
        allPatients.forEach(function (item) {
            values.servicio = values.servicio.concat(item.profile.services);
            values.patologia = values.patologia.concat(item.profile.pathologies);
            values.farmaco = values.farmaco.concat(item.profile.drugNames, item.profile.activeIngredients);
            values.estado.push(item.profile.careStatus);
            values.ea.push(item.profile.adverseStatus);
            values.adherencia.push(item.profile.adherenceResult);
        });
        Object.keys(values).forEach(function (key) { values[key] = unique(values[key]); });
        return values;
    }

    function fillSelect(id, values, defaultLabel, labeler) {
        var select = document.getElementById(id);
        if (!select) return;
        clearChildren(select);
        var base = el('option', '', defaultLabel);
        base.value = '';
        select.appendChild(base);
        values.forEach(function (value) {
            var option = el('option', '', labeler ? labeler(value) : value);
            option.value = value;
            select.appendChild(option);
        });
    }

    function populateFilters() {
        var options = deriveFilterOptions();
        fillSelect('qf-servicio', options.servicio, 'Todos');
        fillSelect('qf-patologia', options.patologia, 'Todas');
        fillSelect('qf-farmaco', options.farmaco, 'Todos');
        fillSelect('qf-estado', options.estado, 'Todos', careLabel);
        fillSelect('qf-ea', options.ea, 'Todos', adverseLabel);
        fillSelect('qf-adherencia', options.adherencia, 'Todas', function (value) {
            return value === 'multiple' ? 'Múltiple' : (value === 'not_recorded' ? 'No registrado' : value);
        });
    }

    function readFilters() {
        var filters = {};
        Array.prototype.forEach.call(document.querySelectorAll('.stats-quick-filter-select'), function (select) {
            if (select.dataset.quickFilter && select.value) filters[select.dataset.quickFilter] = select.value;
        });
        return filters;
    }

    function matches(item, filters) {
        var profile = item.profile;
        if (filters.servicio && profile.services.indexOf(filters.servicio) === -1) return false;
        if (filters.patologia && profile.pathologies.indexOf(filters.patologia) === -1) return false;
        if (filters.farmaco && profile.drugNames.indexOf(filters.farmaco) === -1 && profile.activeIngredients.indexOf(filters.farmaco) === -1) return false;
        if (filters.estado && profile.careStatus !== filters.estado) return false;
        if (filters.ea && profile.adverseStatus !== filters.ea) return false;
        if (filters.adherencia && profile.adherenceResult !== filters.adherencia) return false;
        return true;
    }

    function applyFilters() {
        currentFilters = readFilters();
        filteredPatients = allPatients.filter(function (item) { return matches(item, currentFilters); });
        currentPage = 1;
        renderAll();
    }

    function clearFilterControls() {
        Array.prototype.forEach.call(document.querySelectorAll('.stats-quick-filter-select'), function (select) { select.value = ''; });
    }

    function clearFilters() {
        clearFilterControls();
        applyFilters();
    }

    function renderExecutiveSummary() {
        var services = [];
        var pathologies = [];
        var drugs = [];
        var adverseCount = 0;
        filteredPatients.forEach(function (item) {
            services = services.concat(item.profile.services.filter(function (value) { return value.toLowerCase() !== 'farmacia'; }));
            pathologies = pathologies.concat(item.profile.pathologies);
            drugs = drugs.concat(item.profile.activeIngredients);
            if (item.profile.adverseStatus === 'present') adverseCount += 1;
        });
        setText('summary-pacientes', String(filteredPatients.length));
        setText('summary-servicios', String(unique(services).length));
        setText('summary-patologias', String(unique(pathologies).length));
        setText('summary-farmacos', String(unique(drugs).length));
        setText('summary-ea', String(adverseCount));
    }

    function renderKpis() {
        var container = document.getElementById('kpi-grid');
        if (!container) return;
        clearChildren(container);
        var values = {
            active: 0, prom: 0, adherence: 0, adverse: 0, pending: 0
        };
        filteredPatients.forEach(function (item) {
            if (item.profile.activeLines.length) values.active += 1;
            if ((item.record.proms || []).length) values.prom += 1;
            if (item.profile.adherenceResult !== 'not_recorded') values.adherence += 1;
            if (item.profile.adverseStatus === 'present') values.adverse += 1;
            if (item.profile.validationResult === 'pending') values.pending += 1;
        });
        var cards = [
            ['stats-kpi-card--green', 'fa-users', 'Pacientes incluidos', filteredPatients.length],
            ['stats-kpi-card--green', 'fa-syringe', 'Tratamiento activo explícito', values.active],
            ['stats-kpi-card--orange', 'fa-clipboard-check', 'PROM registrado', values.prom],
            ['stats-kpi-card--purple', 'fa-list-check', 'Adherencia registrada', values.adherence],
            ['stats-kpi-card--yellow', 'fa-exclamation-circle', 'EA presentes', values.adverse],
            ['stats-kpi-card--red', 'fa-clock', 'Validación pendiente explícita', values.pending]
        ];
        cards.forEach(function (data) {
            var card = el('div', 'stats-kpi-card ' + data[0]);
            var iconWrap = el('div', 'stats-kpi-icon');
            iconWrap.appendChild(icon(data[1]));
            card.appendChild(iconWrap);
            card.appendChild(el('div', 'stats-kpi-label', data[2]));
            card.appendChild(el('div', 'stats-kpi-value', String(data[3])));
            container.appendChild(card);
        });
        setText('notifyBadge', String(values.pending));
    }

    function renderCohortPills() {
        var container = document.getElementById('cohort-pills');
        if (!container) return;
        clearChildren(container);
        var keys = Object.keys(currentFilters);
        if (!keys.length) {
            container.appendChild(el('span', 'stats-cohort-empty', 'Sin filtros activos'));
            return;
        }
        var labels = { servicio: 'Servicio', patologia: 'Patología', farmaco: 'Fármaco', estado: 'Estado', ea: 'EA', adherencia: 'Adherencia' };
        keys.forEach(function (key) {
            var chip = el('span', 'stats-cohort-chip');
            chip.appendChild(el('span', '', labels[key] + ': ' + currentFilters[key]));
            var remove = el('button', 'stats-cohort-chip-remove', '×');
            remove.type = 'button';
            remove.setAttribute('aria-label', 'Quitar filtro ' + labels[key]);
            remove.addEventListener('click', function () {
                var select = document.getElementById('qf-' + key);
                if (select) select.value = '';
                applyFilters();
            });
            chip.appendChild(remove);
            container.appendChild(chip);
        });
    }

    function renderResultCount() {
        var node = document.getElementById('filter-result-count');
        if (!node) return;
        node.textContent = filteredPatients.length === allPatients.length
            ? 'Mostrando todos los pacientes (' + allPatients.length + ')'
            : filteredPatients.length + ' de ' + allPatients.length + ' pacientes';
    }

    function countValues(items, getter) {
        var counts = {};
        items.forEach(function (item) {
            unique(getter(item) || []).forEach(function (value) { counts[value] = (counts[value] || 0) + 1; });
        });
        return Object.keys(counts).map(function (label) { return { label: label, value: counts[label] }; })
            .sort(function (left, right) { return right.value - left.value || compareText(left.label, right.label); });
    }

    function renderMiniBars(container, values) {
        clearChildren(container);
        if (!values.length) {
            container.appendChild(el('p', 'chart-empty', 'Sin datos explícitos'));
            return;
        }
        var maximum = values.reduce(function (max, item) { return Math.max(max, item.value); }, 1);
        var list = el('div', 'stats-mini-bars');
        values.slice(0, 10).forEach(function (item) {
            var row = el('div', 'stats-mini-bar-row');
            row.appendChild(el('span', 'stats-mini-bar-label', item.label));
            var track = el('div', 'stats-mini-bar-track');
            var fill = el('div', 'stats-mini-bar-fill');
            fill.style.width = Math.round((item.value / maximum) * 100) + '%';
            track.appendChild(fill);
            row.appendChild(track);
            row.appendChild(el('span', 'stats-mini-bar-value', String(item.value)));
            list.appendChild(row);
        });
        container.appendChild(list);
    }

    function chartGroup(title, data) {
        var group = el('div', 'stats-chart-block-subgroup');
        group.appendChild(el('h4', 'stats-chart-block-subtitle', title));
        var content = el('div');
        renderMiniBars(content, data);
        group.appendChild(content);
        return group;
    }

    function renderDonut(container, values, totalLabel) {
        clearChildren(container);
        if (!values.length) {
            container.appendChild(el('p', 'chart-empty', 'Sin datos explícitos'));
            return;
        }
        var total = values.reduce(function (sum, item) { return sum + item.value; }, 0);
        var colors = ['#22C55E', '#F97316', '#EF4444', '#EAB308', '#A855F7', '#3B82F6', '#64748B'];
        var wrapper = el('div', 'stats-donut-wrap');
        var ring = el('div', 'stats-donut-ring');
        var current = 0;
        var gradient = values.map(function (item, index) {
            var percentage = total ? (item.value / total) * 100 : 0;
            var segment = colors[index % colors.length] + ' ' + current + '% ' + (current + percentage) + '%';
            current += percentage;
            return segment;
        });
        ring.style.background = 'conic-gradient(' + gradient.join(', ') + ')';
        var inner = el('div', 'stats-donut-inner');
        inner.appendChild(el('div', 'stats-donut-value', String(total)));
        inner.appendChild(el('div', 'stats-donut-unit', totalLabel || 'pacientes'));
        ring.appendChild(inner);
        wrapper.appendChild(ring);
        var legend = el('div', 'stats-donut-legend');
        values.forEach(function (item, index) {
            var legendItem = el('div', 'stats-donut-legend-item');
            var dot = el('span', 'stats-donut-legend-dot');
            dot.style.backgroundColor = colors[index % colors.length];
            legendItem.appendChild(dot);
            legendItem.appendChild(document.createTextNode(item.label + ' '));
            legendItem.appendChild(el('span', 'stats-donut-legend-count', item.value + ' (' + (total ? Math.round((item.value / total) * 100) : 0) + '%)'));
            legend.appendChild(legendItem);
        });
        wrapper.appendChild(legend);
        container.appendChild(wrapper);
    }

    function donutGroup(title, data) {
        var wrapper = el('div', 'stats-donut-wrap');
        wrapper.appendChild(el('h4', 'stats-donut-label', title));
        var content = el('div');
        renderDonut(content, data, 'pacientes');
        wrapper.appendChild(content);
        return wrapper;
    }

    function renderCharts() {
        var who = document.getElementById('chart-quienes-content');
        var treatment = document.getElementById('chart-tratamiento-content');
        var evolution = document.getElementById('chart-evolucion-content');
        var risks = document.getElementById('chart-riesgos-content');
        if (who) {
            clearChildren(who);
            var whoGrid = el('div', 'stats-who-grid');
            whoGrid.appendChild(chartGroup('Por servicio', countValues(filteredPatients, function (item) { return item.profile.services; })));
            whoGrid.appendChild(chartGroup('Por patología', countValues(filteredPatients, function (item) { return item.profile.pathologies; })));
            who.appendChild(whoGrid);
        }
        if (treatment) {
            clearChildren(treatment);
            var treatmentGrid = el('div', 'stats-treatment-grid');
            treatmentGrid.appendChild(chartGroup('Principios activos explícitos', countValues(filteredPatients, function (item) { return item.profile.activeLineIngredients; })));
            treatmentGrid.appendChild(donutGroup('Movimientos explícitos', countValues(filteredPatients, function (item) { return item.profile.movementTypes; })));
            treatment.appendChild(treatmentGrid);
        }
        if (evolution) {
            clearChildren(evolution);
            var evolutionGrid = el('div', 'stats-donut-grid');
            evolutionGrid.appendChild(donutGroup('Último PROM registrado', countValues(filteredPatients, function (item) { return item.profile.promInstruments; })));
            evolutionGrid.appendChild(donutGroup('Resultados explícitos de adherencia', countValues(filteredPatients, function (item) { return [item.profile.adherenceResult]; })));
            evolution.appendChild(evolutionGrid);
        }
        if (risks) {
            clearChildren(risks);
            var risksGrid = el('div', 'stats-donut-grid');
            risksGrid.appendChild(donutGroup('EA present / absent / not_recorded', countValues(filteredPatients, function (item) { return [item.profile.adverseStatus]; })));
            risksGrid.appendChild(donutGroup('Gravedad explícita', countValues(filteredPatients, function (item) { return item.profile.adverseSeverities; })));
            risks.appendChild(risksGrid);
        }
    }

    function activeLineText(lines) {
        if (!lines.length) return 'No registrado';
        return lines.map(function (line) {
            var parts = [line.drug_name || line.active_ingredient, line.dose_text, line.route, line.schedule_label].filter(present);
            return parts.join(' · ') || 'Línea activa explícita';
        }).sort(compareText).join(' | ');
    }

    function latestVisit(patient) {
        return patient.latest_followup && patient.latest_followup.event_date
            || patient.latest_first_visit && patient.latest_first_visit.event_date || 'No registrado';
    }

    function latestPromText(proms) {
        if (!proms || !proms.length) return 'No registrado';
        return proms.map(function (prom) {
            return text(prom.instrument) + ' ' + text(prom.value, '');
        }).join(' | ');
    }

    function badge(value, className) {
        return el('span', 'stats-badge ' + (className || 'stats-badge--pendiente'), value);
    }

    function renderTable() {
        var head = document.querySelector('#patients-table thead');
        var body = document.querySelector('#patients-table tbody');
        if (!head || !body) return;
        clearChildren(head);
        clearChildren(body);
        var columns = ['Identificador', 'Servicio / patología', 'Tratamientos activos explícitos',
            'Último PROM registrado', 'Actividad clínica', 'Adherencia', 'EA', 'Validación', 'Última visita'];
        var header = el('tr');
        columns.forEach(function (column) { header.appendChild(el('th', '', column)); });
        head.appendChild(header);
        var start = (currentPage - 1) * ITEMS_PER_PAGE;
        filteredPatients.slice(start, start + ITEMS_PER_PAGE).forEach(function (item) {
            var patient = item.record;
            var profile = item.profile;
            var row = el('tr');
            row.appendChild(el('td', '', text(profile.identifier)));
            row.appendChild(el('td', '', text(profile.services.join(', '), 'No registrado') + ' / ' + text(profile.pathologies.join(', '), 'No registrado')));
            row.appendChild(el('td', '', activeLineText(profile.activeLines)));
            row.appendChild(el('td', '', latestPromText(patient.latest_proms)));
            row.appendChild(el('td', '', patient.clinical_activity
                ? text(patient.clinical_activity.instrument) + ' ' + text(patient.clinical_activity.value, '') : 'No registrado'));
            var adherenceClass = profile.adherenceResult === 'not_recorded' ? 'stats-badge--pendiente' : 'stats-badge--bajo';
            row.appendChild(el('td')).appendChild(badge(profile.adherenceResult === 'multiple' ? 'Múltiple' : (profile.adherenceResult === 'not_recorded' ? 'No registrado' : profile.adherenceResult), adherenceClass));
            var adverseClass = profile.adverseStatus === 'present' ? 'stats-badge--alto'
                : (profile.adverseStatus === 'absent' ? 'stats-badge--no' : 'stats-badge--pendiente');
            row.appendChild(el('td')).appendChild(badge(adverseLabel(profile.adverseStatus), adverseClass));
            var validationClass = profile.validationResult === 'validated'
                ? 'stats-badge--validado' : (profile.validationResult === 'denied' ? 'stats-badge--alto' : 'stats-badge--pendiente');
            row.appendChild(el('td')).appendChild(badge(careLabel(profile.validationResult), validationClass));
            row.appendChild(el('td', '', latestVisit(patient)));
            body.appendChild(row);
        });
        renderPagination();
    }

    function renderPagination() {
        var container = document.getElementById('table-pagination');
        if (!container) return;
        clearChildren(container);
        var pages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
        if (pages <= 1) return;
        container.appendChild(el('span', 'pagination-info', 'Página ' + currentPage + ' de ' + pages + ' (' + filteredPatients.length + ' pacientes)'));
        var buttons = el('div', 'pagination-buttons');
        var previous = el('button', 'btn btn-sm btn-outline', 'Anterior');
        previous.type = 'button';
        previous.disabled = currentPage <= 1;
        previous.addEventListener('click', function () { currentPage -= 1; renderTable(); });
        var next = el('button', 'btn btn-sm btn-outline', 'Siguiente');
        next.type = 'button';
        next.disabled = currentPage >= pages;
        next.addEventListener('click', function () { currentPage += 1; renderTable(); });
        buttons.appendChild(previous);
        buttons.appendChild(next);
        container.appendChild(buttons);
    }

    function renderAll() {
        renderExecutiveSummary();
        renderKpis();
        renderCohortPills();
        renderResultCount();
        var noResults = document.getElementById('no-results-message');
        var sections = ['kpi-section', 'charts-section', 'patients-table-section', 'cohort-section'];
        var empty = filteredPatients.length === 0;
        if (noResults) noResults.classList.toggle('hidden', !empty);
        sections.forEach(function (id) {
            var section = document.getElementById(id);
            if (section) section.classList.toggle('hidden', empty);
        });
        if (!empty) {
            renderCharts();
            renderTable();
        }
        var exportButton = document.getElementById('exportReportBtn');
        if (exportButton) exportButton.disabled = empty;
    }

    function exportCsv() {
        if (!filteredPatients.length) return;
        var records = filteredPatients.map(function (item) { return item.record; });
        var content = Cohort.serializeCsv(records);
        var name = 'farmacia_cohorte_filtrada_' + new Date().toISOString().slice(0, 10) + '.csv';
        window.FarmaciaDemo.downloadFile(name, content, 'text/csv;charset=utf-8');
    }

    function bindEvents() {
        Array.prototype.forEach.call(document.querySelectorAll('.stats-quick-filter-select'), function (select) {
            select.addEventListener('change', applyFilters);
        });
        var clear = document.getElementById('clear-quick-filters');
        if (clear) clear.addEventListener('click', clearFilters);
        var emptyClear = document.getElementById('empty-clear-filters');
        if (emptyClear) emptyClear.addEventListener('click', clearFilters);
        var exportButton = document.getElementById('exportReportBtn');
        if (exportButton) exportButton.addEventListener('click', exportCsv);
    }

    function loadDemo() {
        sourceMode = 'loading';
        setSourceStatus('Demo sintética', 'Cargando JSON versionado…', 'Cargando exclusivamente la demo sintética versionada.');
        return fetch('data/demo/farmacia/farmacia_longitudinal_demo_v0_3.json')
            .then(function (response) {
                if (!response.ok) throw new Error('DEMO_DATASET_UNAVAILABLE');
                return response.json();
            })
            .then(function (dataset) {
                var cohort = Cohort.buildDemoCohort(dataset, { fileName: 'farmacia_longitudinal_demo_v0_3.json', importedAt: '' });
                setCohort('demo', cohort, { source_file_name: 'farmacia_longitudinal_demo_v0_3.json', event_count: cohort.reduce(function (sum, patient) { return sum + patient.valid_event_count; }, 0) });
            })
            .catch(function () {
                sourceMode = 'error';
                setSourceStatus('Error de handoff', 'Demo no disponible', 'No se pudo cargar la demo versionada. Vuelva a Inicio para cargar el Excel de Farmacia.');
                renderAll();
            });
    }

    function bootstrap() {
        bindEvents();
        if (Handoff.receiverExpected()) {
            setWaitingState();
            Handoff.receive().then(function (payload) {
                if (!payload) throw new Error('HANDOFF_PAYLOAD_MISSING');
                setCohort('raw', payload.cohort, payload);
            }).catch(setErrorState);
            return;
        }
        loadDemo();
    }

    window.FarmaciaStatisticsDashboard = Object.freeze({
        getState: function () {
            return {
                source_mode: sourceMode,
                source_metadata: clone(sourceMetadata),
                patient_count: allPatients.length,
                filtered_patient_count: filteredPatients.length,
                current_page: currentPage
            };
        }
    });

    document.addEventListener('DOMContentLoaded', bootstrap);
})();
