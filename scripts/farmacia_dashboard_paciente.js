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

    document.addEventListener('DOMContentLoaded', () => {
        const ctx = F.getQueryContext();
        const patient = ctx.patient || F.patients['CIP-DEMO-FH-001'];
        renderDashboard(patient);
    });
})();
