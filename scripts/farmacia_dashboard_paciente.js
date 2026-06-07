'use strict';

(function () {
    const F = window.FarmaciaDemo;
    function timelineItem(date, title, description) {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        const marker = document.createElement('span');
        marker.className = 'timeline-marker';
        const dateEl = document.createElement('div');
        dateEl.className = 'timeline-date';
        dateEl.textContent = date || '—';
        const titleEl = document.createElement('div');
        titleEl.className = 'timeline-title';
        titleEl.textContent = title;
        const descEl = document.createElement('div');
        descEl.className = 'timeline-description';
        descEl.textContent = description;
        item.append(marker, dateEl, titleEl, descEl);
        return item;
    }
    function evalCheckStatus(patient, type) {
        var est = patient.analiticaEstruct;
        var txt = (patient.analitica || '').toLowerCase();

        if (type === 'analitica') {
            if (est) {
                if (est.reciente === 'si' && est.hemograma === true && est.bioquimica === true) return 'ok';
                if (est.reciente === 'no' || est.hemograma === false || est.bioquimica === false) return 'pending';
                return 'review';
            }
            if (/(?:analítica|analitica).*(?:completa|apto|ok)|prebiológico.*apto/i.test(txt)) return 'ok';
            if (/(?:analítica|analitica).*pendiente/i.test(txt)) return 'pending';
            return 'demo';
        }

        if (type === 'mantoux') {
            if (est && est.mantoux) {
                var m = est.mantoux.toLowerCase();
                if (/negativo|ok|apto/.test(m)) return 'ok';
                if (/pendiente/.test(m)) return 'pending';
                if (/positivo|revisar/.test(m)) return 'review';
            }
            if (/(?:mantoux|igra|tubercul).*(?:negativo|ok|apto)/i.test(txt)) return 'ok';
            if (/(?:mantoux|igra|tubercul).*pendiente/i.test(txt)) return 'pending';
            return 'demo';
        }

        if (type === 'serologias') {
            if (est) {
                var sValues = [est.serologias, est.serologiasVhb, est.serologiasVhc, est.serologiasVih].filter(function(v) { return v !== undefined && v !== null && v !== ''; });
                if (sValues.length === 0) return 'demo';
                var anyPending = false;
                var anyReview = false;
                sValues.forEach(function(s) {
                    var sl = s.toLowerCase();
                    if (/pendiente/.test(sl)) anyPending = true;
                    if (/positivo|revisar/.test(sl)) anyReview = true;
                });
                if (anyReview) return 'review';
                if (anyPending) return 'pending';
                return 'ok';
            }
            if (/(?:serolog|vih|vhb|vhc).*(?:negativo|ok|apto)/i.test(txt)) return 'ok';
            if (/(?:serolog|vih|vhb|vhc).*pendiente/i.test(txt)) return 'pending';
            return 'demo';
        }

        if (type === 'vacunacion') {
            if (est && est.vacunacion !== undefined && est.vacunacion !== null && est.vacunacion !== '') {
                var v = est.vacunacion.toLowerCase();
                if (v === 'si' || /completa|al día|apto/.test(v)) return 'ok';
                if (v === 'no' || /pendiente/.test(v)) return 'pending';
                if (/revisar/.test(v)) return 'review';
            }
            if (/vacuna.*(?:completa|al día|apto)/i.test(txt)) return 'ok';
            if (/vacuna.*pendiente/i.test(txt)) return 'pending';
            return 'demo';
        }

        return 'demo';
    }

    function createChecksVisualBlock(patient) {
        var wrapper = document.createElement('div');
        wrapper.className = 'info-field fh-dashboard-checks-wrapper';

        var label = document.createElement('span');
        label.className = 'info-field__label';
        label.textContent = 'Analítica / vacunación';
        wrapper.appendChild(label);

        var row = document.createElement('div');
        row.className = 'fh-dashboard-checks';

        var checks = [
            { type: 'analitica', label: 'Analítica' },
            { type: 'mantoux', label: 'Mantoux/IGRA' },
            { type: 'serologias', label: 'Serologías' },
            { type: 'vacunacion', label: 'Vacunación' }
        ];

        var statusLabels = { ok: 'OK', pending: 'Pendiente', review: 'Revisar', demo: 'Demo' };
        var iconsByStatus = {
            ok: 'fa-check-circle',
            pending: 'fa-clock',
            review: 'fa-exclamation-circle',
            demo: 'fa-question-circle'
        };

        checks.forEach(function(check) {
            var status = evalCheckStatus(patient, check.type);
            var card = document.createElement('div');
            card.className = 'fh-dashboard-check fh-dashboard-check--' + status;

            var icon = document.createElement('i');
            icon.className = 'fas ' + iconsByStatus[status];
            icon.setAttribute('aria-hidden', 'true');

            var nameEl = document.createElement('span');
            nameEl.className = 'fh-dashboard-check__name';
            nameEl.textContent = check.label;

            var statusEl = document.createElement('span');
            statusEl.className = 'fh-dashboard-check__status';
            statusEl.textContent = statusLabels[status];

            card.append(icon, nameEl, statusEl);
            row.appendChild(card);
        });

        wrapper.appendChild(row);
        return wrapper;
    }

    function renderDashboard(patient) {
        F.setText('patientIdBadge', patient.cip);
        F.setText('patientName', patient.nombre);
        F.setText('patientDiagnosis', patient.patologia);
        F.setText('patientService', patient.servicio);
        F.setText('patientLastVisit', patient.ultimaVisita);
        F.setText('patientAge', patient.edad);
        F.setText('patientGender', patient.sexo);
        const badge = document.getElementById('patientStatusBadge');
        badge.className = F.statusClass(patient.estado);
        badge.textContent = patient.estadoLabel;
        F.renderFields(document.getElementById('dashboardSummaryGrid'), [
            { label: 'Tratamiento actual', value: patient.farmaco + ' \u00B7 ' + patient.pauta },
            { label: 'Estado validación', value: patient.estadoLabel },
            { label: 'Última adherencia', value: patient.adherencia },
            { label: 'Efectos adversos', value: patient.efectosAdversos },
            { label: 'Últimos PROMs Farmacia', value: patient.proms }
        ]);
        document.getElementById('dashboardSummaryGrid').appendChild(createChecksVisualBlock(patient));
        const timeline = document.getElementById('farmaciaTimeline');
        F.clearChildren(timeline);
        timeline.append(
            timelineItem(patient.fechaSolicitud, 'Solicitud FH', `${patient.servicio}: ${patient.farmaco}`),
            timelineItem(patient.primeraVisita, 'Primera visita', patient.primeraVisita === 'Pendiente' ? 'Pendiente de registrar' : 'Inicio de seguimiento farmacoterapéutico'),
            timelineItem(patient.ultimaVisita, 'Seguimiento', patient.seguimiento)
        );

        const actionBtns = document.querySelectorAll('.patient-header-actions a');
        if (actionBtns[0]) {
            actionBtns[0].href = F.makeContextUrl('farmacia_seguimiento.html', {
                cip: patient.cip, servicio: patient.servicioSlug, patologia: patient.patologia, entrada: 'seguimiento'
            });
        }
        if (actionBtns[1]) {
            actionBtns[1].href = F.makeContextUrl('farmacia_validacion.html', {
                cip: patient.cip, servicio: patient.servicioSlug, patologia: patient.patologia, entrada: 'validacion'
            });
        }

        renderActividadClinica(patient);
        renderProms(patient);
        renderTimelineTratamiento(patient);
        renderLongitudinalForCip(patient.cip);
    }
    function renderActividadClinica(patient) {
        const container = document.getElementById('actividadClinicaIndices');
        if (!container) return;
        F.clearChildren(container);
        let fields;
        if (patient.cip === 'CIP-DEMO-FH-001') {
            fields = [
                { label: 'IHS4', value: '9 \u2192 5 (mejor\u00EDa)' },
                { label: 'Hurley', value: patient.hurley || '\u2014' },
                { label: 'DLQI', value: '14 \u2192 8' },
                { label: 'Localizaci\u00F3n', value: patient.localizacion || '\u2014' },
                { label: 'Tiempo evoluci\u00F3n', value: patient.tiempoEvolucion || '\u2014' }
            ];
        } else if (patient.cip === 'CIP-DEMO-FH-003') {
            fields = [
                { label: 'DAS28', value: '3.2' },
                { label: 'HAQ', value: '1.1' }
            ];
        } else {
            fields = [{ label: 'Estado', value: 'Sin dato cl\u00EDnico estructurado en esta demo' }];
        }
        fields.forEach(function(f) { container.appendChild(F.createField(f.label, f.value)); });
    }

    function renderProms(patient) {
        const container = document.getElementById('promsContainer');
        if (!container) return;
        F.clearChildren(container);
        let proms;
        if (patient.cip === 'CIP-DEMO-FH-001') {
            proms = [
                { name: 'DLQI', value: '8', source: 'Profesional', note: '\u00DAltimo valor' },
                { name: 'EVA picor', value: '3/10', source: 'Paciente remoto', note: '\u00DAltimo valor' },
                { name: 'EVA dolor', value: '\u2014', source: 'Farmacia', note: 'No registrado' }
            ];
        } else if (patient.cip === 'CIP-DEMO-FH-003') {
            proms = [
                { name: 'HAQ', value: '1.1', source: 'Profesional', note: 'Basal' },
                { name: 'EVA dolor', value: '4/10', source: 'Paciente remoto', note: '\u00DAltimo valor' }
            ];
        } else {
            container.appendChild(F.createField('Estado', 'Sin dato cl\u00EDnico estructurado en esta demo'));
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'proms-card-grid';
        proms.forEach(function(p) {
            const card = document.createElement('div');
            card.className = 'prom-card';
            const nameEl = document.createElement('span');
            nameEl.className = 'prom-card__name';
            nameEl.textContent = p.name;
            const valueEl = document.createElement('span');
            valueEl.className = 'prom-card__value';
            valueEl.textContent = p.value || '\u2014';
            const sourceEl = document.createElement('span');
            sourceEl.className = 'prom-card__source';
            sourceEl.textContent = p.source;
            card.append(nameEl, valueEl, sourceEl);
            if (p.note) {
                const noteEl = document.createElement('span');
                noteEl.className = 'prom-card__note';
                noteEl.textContent = p.note;
                card.appendChild(noteEl);
            }
            grid.appendChild(card);
        });
        container.appendChild(grid);
    }

    function renderTimelineTratamiento(patient) {
        const container = document.getElementById('timelineTratamiento');
        if (!container) return;
        F.clearChildren(container);
        const snapshot = (window.FarmaciaCatalog && window.FarmaciaCatalog.getSnapshot()) || null;
        const events = [];
        if (patient.cip === 'CIP-DEMO-FH-001') {
            const farmaco = (snapshot && snapshot.nombre_snapshot) || patient.farmaco;
            const principio = (snapshot && snapshot.principio_activo_snapshot) || patient.principioActivo || '\u2014';
            const presentacion = (snapshot && snapshot.presentacion_snapshot) || patient.dosis;
            const viaSnap = (snapshot && snapshot.via_snapshot) || patient.via;
            events.push({
                fecha: patient.primeraVisita,
                titulo: 'Inicio de tratamiento',
                descripcion: farmaco + ' \u00B7 ' + principio + ' \u00B7 ' + presentacion + ' \u00B7 ' + viaSnap + ' \u00B7 ' + patient.pauta
            });
            if (patient.efectosAdversos && patient.efectosAdversos !== 'No registrados') {
                events.push({
                    fecha: '2026-05-25',
                    titulo: 'Evento adverso / optimizaci\u00F3n',
                    descripcion: patient.efectosAdversos
                });
            }
        } else if (patient.cip === 'CIP-DEMO-FH-003') {
            const farmaco = (snapshot && snapshot.nombre_snapshot) || patient.farmaco;
            const principio = (snapshot && snapshot.principio_activo_snapshot) || 'Adalimumab';
            const presentacion = (snapshot && snapshot.presentacion_snapshot) || patient.dosis;
            const viaSnap = (snapshot && snapshot.via_snapshot) || patient.via;
            events.push({
                fecha: patient.fechaSolicitud,
                titulo: 'Solicitud / Validaci\u00F3n',
                descripcion: farmaco + ' \u00B7 ' + principio + ' \u00B7 ' + presentacion + ' \u00B7 ' + viaSnap + ' \u00B7 ' + patient.pauta
            });
        }
        if (events.length === 0) {
            container.appendChild(timelineItem('\u2014', 'Sin registros demo', 'El paciente no tiene eventos de tratamiento registrados en el dataset demo.'));
            return;
        }
        events.forEach(function(ev) {
            container.appendChild(timelineItem(ev.fecha, ev.titulo, ev.descripcion));
        });
    }

    var longDataset = null;
    var longCurrentCip = null;
    var longSectionReady = false;

    var LONG_PROM_MAP = { dlqi: 'DLQI', eva_dolor: 'EVA dolor', eva_prurito: 'EVA prurito', haq: 'HAQ' };
    var LONG_CLINICAL_MAP = { ihs4: 'IHS4', hurley: 'Hurley', das28: 'DAS28', haq: 'HAQ' };

    function buildLongReverseMap(map) {
        var reversed = {};
        var keys = Object.keys(map);
        for (var i = 0; i < keys.length; i++) { reversed[map[keys[i]]] = keys[i]; }
        return reversed;
    }

    var LONG_PROM_REVERSE = buildLongReverseMap(LONG_PROM_MAP);
    var LONG_CLINICAL_REVERSE = buildLongReverseMap(LONG_CLINICAL_MAP);

    var PROM_MAX = { 'DLQI': 30, 'EVA dolor': 10, 'EVA prurito': 10, 'HAQ': 3 };
    var CLINICAL_MAX = { 'IHS4': 20, 'Hurley': 3, 'DAS28': 10, 'HAQ': 3 };

    function longParseDate(str) {
        if (!str) return null;
        var parts = str.split('-');
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }

    function getLongPatient(cip) {
        if (!longDataset || !longDataset.pacientes) return null;
        for (var i = 0; i < longDataset.pacientes.length; i++) {
            if (longDataset.pacientes[i].cip === cip) return longDataset.pacientes[i];
        }
        return null;
    }

    function getLongSeverityInfo(type, numericVal) {
        var n = numericVal;
        if (isNaN(n) || n === null || n === undefined) return { label: 'Sin datos', cssClass: 'threshold-no-data' };
        switch (type) {
            case 'DLQI':
                if (n <= 1) return { label: 'Sin efecto (0-1)', cssClass: 'threshold-low' };
                if (n <= 5) return { label: 'Efecto pequeno (2-5)', cssClass: 'threshold-low' };
                if (n <= 10) return { label: 'Efecto moderado (6-10)', cssClass: 'threshold-moderate' };
                if (n <= 20) return { label: 'Efecto muy importante (11-20)', cssClass: 'threshold-high' };
                return { label: 'Efecto extremadamente importante (21-30)', cssClass: 'threshold-severe' };
            case 'EVA dolor':
            case 'EVA prurito':
                if (n <= 3) return { label: 'Bajo (0-3)', cssClass: 'threshold-low' };
                if (n <= 6) return { label: 'Moderado (4-6)', cssClass: 'threshold-moderate' };
                return { label: 'Alto (7-10)', cssClass: 'threshold-high' };
            case 'IHS4':
                if (n <= 3) return { label: 'Leve (0-3)', cssClass: 'threshold-low' };
                if (n <= 10) return { label: 'Moderado (4-10)', cssClass: 'threshold-moderate' };
                return { label: 'Severo (>=11)', cssClass: 'threshold-high' };
            case 'Hurley':
                if (n <= 1.5) return { label: 'Estadio I', cssClass: 'hurley-i' };
                if (n <= 2.5) return { label: 'Estadio II', cssClass: 'hurley-ii' };
                return { label: 'Estadio III', cssClass: 'hurley-iii' };
            case 'DAS28':
                if (n < 2.6) return { label: 'Remision (<2.6)', cssClass: 'threshold-low' };
                if (n <= 3.2) return { label: 'Baja (2.6-3.2)', cssClass: 'threshold-moderate' };
                if (n <= 5.1) return { label: 'Moderada (>3.2-5.1)', cssClass: 'threshold-high' };
                return { label: 'Alta (>5.1)', cssClass: 'threshold-high' };
            case 'HAQ':
                if (n <= 0.5) return { label: 'Bajo (0-0.5)', cssClass: 'threshold-low' };
                if (n <= 1.5) return { label: 'Moderado (>0.5-1.5)', cssClass: 'threshold-moderate' };
                return { label: 'Alto (>1.5)', cssClass: 'threshold-high' };
            default:
                if (n <= 25) return { label: 'Bajo', cssClass: 'threshold-low' };
                if (n <= 50) return { label: 'Medio', cssClass: 'threshold-moderate' };
                return { label: 'Alto', cssClass: 'threshold-high' };
        }
    }

    function initLongitudinalSection() {
        var section = document.getElementById('longitudinal-section');
        if (!section) return;
        var statusEl = document.getElementById('dbStatusIndicator');
        if (statusEl) {
            var timeEl = statusEl.querySelector('.db-status-indicator__time');
            if (timeEl) timeEl.textContent = 'Cargando datos longitudinales...';
        }
        fetch('data/demo/farmacia/farmacia_longitudinal_demo_v0_3.json')
            .then(function (response) {
                if (!response.ok) throw new Error('Failed to fetch longitudinal dataset');
                return response.json();
            })
            .then(function (data) {
                longDataset = data;
                longSectionReady = true;
                if (statusEl) {
                    var timeEl = statusEl.querySelector('.db-status-indicator__time');
                    if (timeEl) timeEl.textContent = 'Longitudinal cargado';
                }
                if (longCurrentCip) {
                    renderLongitudinalForCip(longCurrentCip);
                }
            })
            .catch(function () {
                longSectionReady = false;
                if (statusEl) {
                    var timeEl = statusEl.querySelector('.db-status-indicator__time');
                    if (timeEl) timeEl.textContent = 'CSV sintetico';
                }
            });
    }

    function renderLongitudinalForCip(cip) {
        longCurrentCip = cip;
        if (!longSectionReady || !longDataset) return;
        var section = document.getElementById('longitudinal-section');
        if (!section) return;
        var patient = getLongPatient(cip);
        var noDataEl = document.getElementById('longitudinal-no-data');
        var chartContainer = document.getElementById('longitudinal-chart-container');
        var legendEl = document.getElementById('longitudinal-legend');
        var demoNoteEl = document.getElementById('longitudinal-demo-note');
        var toggleBtn = document.getElementById('toggle-legend');

        if (!patient) {
            section.classList.add('hidden');
            return;
        }
        section.classList.remove('hidden');
        if (noDataEl) noDataEl.classList.add('hidden');
        if (demoNoteEl) demoNoteEl.classList.remove('hidden');
        if (legendEl) legendEl.classList.add('hidden');
        if (toggleBtn) toggleBtn.textContent = 'Ver leyenda';

        populateLongSelectors(patient);
        renderLongTreatmentBands(patient, chartContainer);
        renderLongDataSeries(patient, chartContainer);
        renderLongLegend(legendEl);
    }

    function populateLongSelectors(patient) {
        var clinicalSel = document.getElementById('clinical-var-select');
        var promSel = document.getElementById('prom-select');
        if (!patient) return;

        if (clinicalSel) {
            var prevClinical = clinicalSel.value;
            F.clearChildren(clinicalSel);
            var placeholderC = document.createElement('option');
            placeholderC.value = '';
            placeholderC.textContent = 'Variable clinica';
            clinicalSel.appendChild(placeholderC);
            var clinicalTypes = {};
            var actItems = patient.actividad_clinica || [];
            for (var i = 0; i < actItems.length; i++) {
                if (actItems[i].tipo_indice) clinicalTypes[actItems[i].tipo_indice] = true;
            }
            var uniqueClinical = Object.keys(clinicalTypes).sort();
            for (var j = 0; j < uniqueClinical.length; j++) {
                var displayName = uniqueClinical[j];
                var opt = document.createElement('option');
                opt.value = LONG_CLINICAL_REVERSE[displayName] || displayName.toLowerCase().replace(/ /g, '_');
                opt.textContent = displayName;
                clinicalSel.appendChild(opt);
            }
            var foundC = false;
            if (prevClinical && prevClinical !== '') {
                for (var k = 0; k < clinicalSel.options.length; k++) {
                    if (clinicalSel.options[k].value === prevClinical) { foundC = true; break; }
                }
            }
            clinicalSel.value = foundC ? prevClinical : (uniqueClinical.length > 0 ? clinicalSel.options[1] ? clinicalSel.options[1].value : '' : '');
        }

        if (promSel) {
            var prevProm = promSel.value;
            F.clearChildren(promSel);
            var placeholderP = document.createElement('option');
            placeholderP.value = '';
            placeholderP.textContent = 'PROM';
            promSel.appendChild(placeholderP);
            var promTypes = {};
            var promItems = patient.proms || [];
            for (var m = 0; m < promItems.length; m++) {
                if (promItems[m].tipo_prom) promTypes[promItems[m].tipo_prom] = true;
            }
            var uniqueProms = Object.keys(promTypes).sort();
            for (var n = 0; n < uniqueProms.length; n++) {
                var pDisplay = uniqueProms[n];
                var optP = document.createElement('option');
                optP.value = LONG_PROM_REVERSE[pDisplay] || pDisplay.toLowerCase().replace(/ /g, '_');
                optP.textContent = pDisplay;
                promSel.appendChild(optP);
            }
            var foundP = false;
            if (prevProm && prevProm !== '') {
                for (var p = 0; p < promSel.options.length; p++) {
                    if (promSel.options[p].value === prevProm) { foundP = true; break; }
                }
            }
            promSel.value = foundP ? prevProm : (uniqueProms.length > 0 ? promSel.options[1] ? promSel.options[1].value : '' : '');
        }
    }

    function renderLongTreatmentBands(patient, container) {
        if (!container) return;
        var treatments = patient.tratamientos || [];
        if (treatments.length === 0) return;

        var changes = patient.cambios_pauta || [];
        var events = patient.eventos_adversos || [];

        var allDates = [];
        for (var i = 0; i < treatments.length; i++) {
            var td = longParseDate(treatments[i].fecha_inicio);
            if (td) allDates.push(td);
            var te = longParseDate(treatments[i].fecha_fin);
            if (te) allDates.push(te);
        }
        for (var j = 0; j < changes.length; j++) {
            var cd = longParseDate(changes[j].fecha);
            if (cd) allDates.push(cd);
        }
        for (var k = 0; k < events.length; k++) {
            var ed = longParseDate(events[k].fecha);
            if (ed) allDates.push(ed);
        }
        if (allDates.length === 0) return;

        allDates.sort(function (a, b) { return a - b; });
        var minDate = allDates[0];
        var maxDate = allDates[allDates.length - 1];
        var totalMs = maxDate.getTime() - minDate.getTime();
        var totalDays = totalMs / (1000 * 60 * 60 * 24);
        if (totalDays <= 0) totalDays = 1;

        function pct(d) {
            var days = (d.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
            return Math.max(0, Math.min(100, (days / totalDays) * 100));
        }

        function fmtDate(d) {
            var y = d.getFullYear();
            var m = d.getMonth() + 1;
            var day = d.getDate();
            return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
        }

        var track = document.createElement('div');
        track.className = 'longitudinal-treatment-track';

        var axis = document.createElement('div');
        axis.className = 'longitudinal-treatment-track__axis';
        var axisStart = document.createElement('span');
        axisStart.className = 'longitudinal-treatment-track__axis-label longitudinal-treatment-track__axis-label--start';
        axisStart.textContent = fmtDate(minDate);
        var axisEnd = document.createElement('span');
        axisEnd.className = 'longitudinal-treatment-track__axis-label longitudinal-treatment-track__axis-label--end';
        axisEnd.textContent = fmtDate(maxDate);
        axis.appendChild(axisStart);
        axis.appendChild(axisEnd);
        track.appendChild(axis);

        for (var bi = 0; bi < treatments.length; bi++) {
            var t = treatments[bi];
            var startDate = longParseDate(t.fecha_inicio);
            if (!startDate) continue;
            var endDate;
            if (t.fecha_fin) {
                endDate = longParseDate(t.fecha_fin);
            } else if (t.activo) {
                endDate = maxDate;
            } else {
                endDate = startDate;
            }
            if (!endDate) endDate = startDate;

            var bandRow = document.createElement('div');
            bandRow.className = 'longitudinal-treatment-band-row';

            var statusClass = 'longitudinal-treatment-band--previous';
            if (t.activo && !t.fecha_fin) statusClass = 'longitudinal-treatment-band--active';
            else if (!t.activo && t.motivo_suspension) statusClass = 'longitudinal-treatment-band--suspended';

            var bandClasses = 'longitudinal-treatment-band ' + statusClass;
            if (t.motivo_cambio) bandClasses += ' longitudinal-treatment-band--optimized';

            var band = document.createElement('div');
            band.className = bandClasses;
            band.style.left = pct(startDate) + '%';
            var widthPct = pct(endDate) - pct(startDate);
            if (widthPct < 0.5) widthPct = 0.5;
            band.style.width = widthPct + '%';

            var label = document.createElement('div');
            label.className = 'longitudinal-treatment-band__label';
            label.textContent = t.nombre_comercial || t.principio_activo || 'Sin nombre';
            band.appendChild(label);

            var meta = document.createElement('div');
            meta.className = 'longitudinal-treatment-band__meta';
            if (t.presentacion_dosis) {
                var doseEl = document.createElement('span');
                doseEl.className = 'longitudinal-treatment-band__dose';
                doseEl.textContent = t.presentacion_dosis;
                meta.appendChild(doseEl);
            }
            if (t.pauta) {
                var pautaEl = document.createElement('span');
                pautaEl.className = 'longitudinal-treatment-band__pauta';
                pautaEl.textContent = t.pauta;
                meta.appendChild(pautaEl);
            }
            if (t.via) {
                var viaEl = document.createElement('span');
                viaEl.className = 'longitudinal-treatment-band__via';
                viaEl.textContent = t.via;
                meta.appendChild(viaEl);
            }
            if (t.principio_activo) {
                var princEl = document.createElement('span');
                princEl.className = 'longitudinal-treatment-band__principle';
                princEl.textContent = t.principio_activo;
                meta.appendChild(princEl);
            }
            band.appendChild(meta);

            var dates = document.createElement('div');
            dates.className = 'longitudinal-treatment-band__dates';
            var dateStart = document.createElement('span');
            dateStart.className = 'longitudinal-treatment-band__date';
            dateStart.textContent = 'Inicio: ' + (t.fecha_inicio || '—');
            dates.appendChild(dateStart);
            var dateEnd = document.createElement('span');
            dateEnd.className = 'longitudinal-treatment-band__date';
            dateEnd.textContent = 'Fin: ' + (t.fecha_fin || 'Activo');
            dates.appendChild(dateEnd);
            band.appendChild(dates);

            var statusLabels = {
                'longitudinal-treatment-band--active': 'Activo',
                'longitudinal-treatment-band--suspended': 'Suspendido',
                'longitudinal-treatment-band--previous': 'Previo'
            };
            var badgeSuffix = statusClass === 'longitudinal-treatment-band--active' ? 'active' :
                (statusClass === 'longitudinal-treatment-band--suspended' ? 'suspended' : 'previous');
            var badge = document.createElement('span');
            badge.className = 'longitudinal-treatment-band__status longitudinal-treatment-band__status--' + badgeSuffix;
            badge.textContent = statusLabels[statusClass] || 'Previo';
            band.appendChild(badge);

            var tooltipParts = [];
            if (t.motivo_inicio) tooltipParts.push('Motivo inicio: ' + t.motivo_inicio);
            if (t.motivo_suspension) tooltipParts.push('Suspension: ' + t.motivo_suspension);
            if (t.motivo_cambio) tooltipParts.push('Cambio: ' + t.motivo_cambio);
            if (t.estado_validacion_farmacia) tooltipParts.push('Validacion: ' + t.estado_validacion_farmacia);
            if (tooltipParts.length > 0) band.setAttribute('title', tooltipParts.join(' | '));

            bandRow.appendChild(band);
            track.appendChild(bandRow);
        }

        if (changes.length > 0 || events.length > 0) {
            var markerRow = document.createElement('div');
            markerRow.className = 'longitudinal-treatment-track__markers';

            for (var ci = 0; ci < changes.length; ci++) {
                var c = changes[ci];
                var cdDate = longParseDate(c.fecha);
                if (!cdDate) continue;
                var marker = document.createElement('div');
                marker.className = 'longitudinal-timeline-change-marker';
                marker.style.left = pct(cdDate) + '%';
                var cTooltip = 'Cambio de pauta — ' + (c.fecha || '') + '\nTipo: ' + (c.tipo || '—') + '\nMotivo: ' + (c.motivo || '—');
                if (c.descripcion) cTooltip += '\n' + c.descripcion;
                if (c.estado_validacion_farmacia) cTooltip += '\nValidacion: ' + c.estado_validacion_farmacia;
                marker.setAttribute('title', cTooltip);
                markerRow.appendChild(marker);
            }

            for (var ei = 0; ei < events.length; ei++) {
                var ev = events[ei];
                var edDate = longParseDate(ev.fecha);
                if (!edDate) continue;
                var grav = ev.gravedad || '';
                var gravClass = 'event-high';
                if (grav === 'leve') gravClass = 'event-low';
                else if (grav === 'moderado' || grav === 'moderada') gravClass = 'event-moderate';
                else if (grav === 'grave') gravClass = 'event-high';
                else if (grav === 'serio') gravClass = 'event-serious';
                var aeMarker = document.createElement('div');
                aeMarker.className = 'longitudinal-timeline-ae-marker ' + gravClass;
                aeMarker.style.left = pct(edDate) + '%';
                var aeTooltip = 'EA: ' + (ev.tipo || '—') + ' (' + (ev.fecha || '') + ')\nGravedad: ' + (ev.gravedad || '—') + '\nRelacion: ' + (ev.relacion_tratamiento || '—') + '\nAccion: ' + (ev.accion_tomada || '—');
                if (ev.descripcion_corta) aeTooltip += '\n' + ev.descripcion_corta;
                aeMarker.setAttribute('title', aeTooltip);
                markerRow.appendChild(aeMarker);
            }
            track.appendChild(markerRow);
        }

        while (container.firstChild) container.removeChild(container.firstChild);
        container.appendChild(track);
    }

    function renderLongDataSeries(patient, container) {
        if (!container || !patient) return;

        var clinicalSel = document.getElementById('clinical-var-select');
        var promSel = document.getElementById('prom-select');
        var clinicalKey = clinicalSel ? clinicalSel.value : '';
        var promKey = promSel ? promSel.value : '';

        var dataWrapper = document.createElement('div');
        dataWrapper.className = 'longitudinal-data-series';
        if (clinicalKey) {
            var clinicalType = LONG_CLINICAL_MAP[clinicalKey] || clinicalKey;
            var clinicalItems = (patient.actividad_clinica || []).filter(function (a) { return a.tipo_indice === clinicalType; });
            clinicalItems.sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });
            var cMax = CLINICAL_MAX[clinicalType] || 100;

            var cHeader = document.createElement('div');
            cHeader.className = 'longitudinal-data-header';
            var cTitle = document.createElement('strong');
            cTitle.className = 'longitudinal-data-header__title';
            cTitle.textContent = clinicalType;
            var cScale = document.createElement('span');
            cScale.className = 'longitudinal-data-header__scale';
            cScale.textContent = '(escala 0-' + cMax + ')';
            cHeader.appendChild(cTitle);
            cHeader.appendChild(cScale);
            dataWrapper.appendChild(cHeader);

            if (clinicalItems.length === 0) {
                var cEmpty = document.createElement('div');
                cEmpty.className = 'longitudinal-empty';
                cEmpty.textContent = 'Sin datos de ' + clinicalType + ' para este paciente.';
                dataWrapper.appendChild(cEmpty);
            } else {
                var cGrid = document.createElement('div');
                cGrid.className = 'longitudinal-data-grid';
                for (var i = 0; i < clinicalItems.length; i++) {
                    var item = clinicalItems[i];
                    var numericVal = parseFloat(item.valor);
                    var sevInfo = getLongSeverityInfo(clinicalType, numericVal);
                    var chip = document.createElement('div');
                    chip.className = 'longitudinal-data-chip';
                    var chipDate = document.createElement('span');
                    chipDate.className = 'longitudinal-data-chip__date';
                    chipDate.textContent = item.fecha || '—';
                    var chipVal = document.createElement('span');
                    chipVal.className = 'longitudinal-data-chip__value';
                    chipVal.textContent = (item.valor || '—') + ' / ' + cMax;
                    var chipSev = document.createElement('span');
                    chipSev.className = 'longitudinal-data-chip__severity ' + sevInfo.cssClass;
                    chipSev.textContent = sevInfo.label;
                    chip.appendChild(chipDate);
                    chip.appendChild(chipVal);
                    chip.appendChild(chipSev);
                    if (item.interpretacion) {
                        var chipInterp = document.createElement('span');
                        chipInterp.className = 'longitudinal-data-chip__interp';
                        chipInterp.textContent = item.interpretacion;
                        chip.appendChild(chipInterp);
                    }
                    cGrid.appendChild(chip);
                }
                dataWrapper.appendChild(cGrid);
            }
        }

        if (promKey) {
            var promType = LONG_PROM_MAP[promKey] || promKey;
            var promItems = (patient.proms || []).filter(function (p) { return p.tipo_prom === promType; });
            promItems.sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });
            var pMax = PROM_MAX[promType] || 100;

            var pHeader = document.createElement('div');
            pHeader.className = 'longitudinal-data-header';
            if (clinicalKey) pHeader.classList.add('longitudinal-data-header--with-margin');
            var pTitle = document.createElement('strong');
            pTitle.className = 'longitudinal-data-header__title';
            pTitle.textContent = promType;
            var pScale = document.createElement('span');
            pScale.className = 'longitudinal-data-header__scale';
            pScale.textContent = '(escala 0-' + pMax + ')';
            pHeader.appendChild(pTitle);
            pHeader.appendChild(pScale);
            dataWrapper.appendChild(pHeader);

            if (promItems.length === 0) {
                var pEmpty = document.createElement('div');
                pEmpty.className = 'longitudinal-empty';
                pEmpty.textContent = 'Sin datos de ' + promType + ' para este paciente.';
                dataWrapper.appendChild(pEmpty);
            } else {
                var pGrid = document.createElement('div');
                pGrid.className = 'longitudinal-data-grid';
                for (var j = 0; j < promItems.length; j++) {
                    var pItem = promItems[j];
                    var pNumericVal = parseFloat(pItem.valor);
                    var pSevInfo = getLongSeverityInfo(promType, pNumericVal);
                    var pChip = document.createElement('div');
                    pChip.className = 'longitudinal-data-chip';
                    var pChipDate = document.createElement('span');
                    pChipDate.className = 'longitudinal-data-chip__date';
                    pChipDate.textContent = pItem.fecha || '—';
                    var pChipVal = document.createElement('span');
                    pChipVal.className = 'longitudinal-data-chip__value';
                    pChipVal.textContent = (pItem.valor || '—') + ' / ' + pMax;
                    var pChipSev = document.createElement('span');
                    pChipSev.className = 'longitudinal-data-chip__severity ' + pSevInfo.cssClass;
                    pChipSev.textContent = pSevInfo.label;
                    pChip.appendChild(pChipDate);
                    pChip.appendChild(pChipVal);
                    pChip.appendChild(pChipSev);
                    if (pItem.interpretacion) {
                        var pChipInterp = document.createElement('span');
                        pChipInterp.className = 'longitudinal-data-chip__interp';
                        pChipInterp.textContent = pItem.interpretacion;
                        pChip.appendChild(pChipInterp);
                    }
                    pGrid.appendChild(pChip);
                }
                dataWrapper.appendChild(pGrid);
            }
        }

        if (!clinicalKey && !promKey) {
            var hint = document.createElement('div');
            hint.className = 'longitudinal-empty';
            hint.textContent = 'Seleccione una variable clinica o PROM para ver la evolucion.';
            dataWrapper.appendChild(hint);
        }

        var existing = container.querySelector('.longitudinal-data-series');
        if (existing) existing.parentNode.removeChild(existing);
        container.appendChild(dataWrapper);
    }

    function renderLongLegend(container) {
        if (!container) return;
        while (container.firstChild) container.removeChild(container.firstChild);

        var panel = document.createElement('div');
        panel.className = 'longitudinal-legend-panel';

        var titleEl = document.createElement('h3');
        titleEl.className = 'longitudinal-legend-title';
        var titleIcon = document.createElement('i');
        titleIcon.className = 'fas fa-layer-group longitudinal-legend-title__icon';
        titleIcon.setAttribute('aria-hidden', 'true');
        titleEl.appendChild(titleIcon);
        titleEl.appendChild(document.createTextNode(' Umbrales demo por escala'));
        panel.appendChild(titleEl);

        var body = document.createElement('div');
        body.className = 'longitudinal-legend-body';

        var thresholds = [
            'DLQI: 0-1 sin efecto \u00b7 2-5 efecto pequeno \u00b7 6-10 efecto moderado \u00b7 11-20 efecto muy importante \u00b7 21-30 efecto extremadamente importante',
            'EVA dolor: 0-3 bajo \u00b7 4-6 moderado \u00b7 7-10 alto',
            'EVA prurito: 0-3 bajo \u00b7 4-6 moderado \u00b7 7-10 alto',
            'IHS4: 0-3 leve \u00b7 4-10 moderado \u00b7 \u226511 severo',
            'Hurley: estadio I / II / III (categorico)',
            'DAS28: <2.6 remision \u00b7 2.6-3.2 baja \u00b7 >3.2-5.1 moderada \u00b7 >5.1 alta',
            'HAQ: 0-0.5 bajo \u00b7 >0.5-1.5 moderado \u00b7 >1.5 alto'
        ];

        for (var i = 0; i < thresholds.length; i++) {
            var item = document.createElement('div');
            item.className = 'longitudinal-legend-threshold longitudinal-legend-row';
            var str = thresholds[i];
            var colonIdx = str.indexOf(':');
            if (colonIdx > -1) {
                var scaleSpan = document.createElement('span');
                scaleSpan.className = 'longitudinal-legend-scale';
                scaleSpan.textContent = str.substring(0, colonIdx + 1);
                item.appendChild(scaleSpan);
                var rangesSpan = document.createElement('span');
                rangesSpan.className = 'longitudinal-legend-ranges';
                rangesSpan.textContent = str.substring(colonIdx + 1);
                item.appendChild(rangesSpan);
            } else {
                item.textContent = str;
            }
            body.appendChild(item);
        }

        panel.appendChild(body);

        var note = document.createElement('p');
        note.className = 'longitudinal-legend-note';
        note.textContent = 'Demo exploratorio v0.3 — datos sinteticos — sin validez clinica.';
        panel.appendChild(note);

        container.appendChild(panel);
    }

    function onLongClinicalChange() {
        var clinicalSel = document.getElementById('clinical-var-select');
        if (!clinicalSel || !longCurrentCip || !longSectionReady) return;
        var patient = getLongPatient(longCurrentCip);
        if (!patient) return;
        var container = document.getElementById('longitudinal-chart-container');
        if (container) renderLongDataSeries(patient, container);
    }

    function onLongPromChange() {
        var promSel = document.getElementById('prom-select');
        if (!promSel || !longCurrentCip || !longSectionReady) return;
        var patient = getLongPatient(longCurrentCip);
        if (!patient) return;
        var container = document.getElementById('longitudinal-chart-container');
        if (container) renderLongDataSeries(patient, container);
    }

    function onToggleLegend() {
        var legendEl = document.getElementById('longitudinal-legend');
        var toggleBtn = document.getElementById('toggle-legend');
        if (!legendEl) return;
        if (legendEl.classList.contains('hidden')) {
            legendEl.classList.remove('hidden');
            if (toggleBtn) toggleBtn.textContent = 'Ocultar leyenda';
        } else {
            legendEl.classList.add('hidden');
            if (toggleBtn) toggleBtn.textContent = 'Ver leyenda';
        }
    }

    function bindLongitudinalEvents() {
        var clinicalSel = document.getElementById('clinical-var-select');
        var promSel = document.getElementById('prom-select');
        var toggleBtn = document.getElementById('toggle-legend');
        if (clinicalSel) clinicalSel.addEventListener('change', onLongClinicalChange);
        if (promSel) promSel.addEventListener('change', onLongPromChange);
        if (toggleBtn) toggleBtn.addEventListener('click', onToggleLegend);
    }

    document.addEventListener('DOMContentLoaded', () => {
        bindLongitudinalEvents();
        initLongitudinalSection();
        const ctx = F.getQueryContext();
        const patient = ctx.patient || F.patients['CIP-DEMO-FH-001'];
        renderDashboard(patient);
    });
})();
