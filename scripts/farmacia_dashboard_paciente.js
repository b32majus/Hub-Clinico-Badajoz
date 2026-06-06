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
            { label: 'Servicio origen', value: patient.servicio },
            { label: 'Patología / indicación', value: patient.patologia },
            { label: 'Tratamiento actual', value: `${patient.farmaco} · ${patient.pauta}` },
            { label: 'Estado validación', value: patient.estadoLabel },
            { label: 'Adherencia', value: patient.adherencia },
            { label: 'Efectos adversos', value: patient.efectosAdversos },
            { label: 'PROMs', value: patient.proms },
            { label: 'Analítica/vacunación', value: patient.analitica }
        ]);
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
        const sources = {};
        proms.forEach(function(p) {
            if (!sources[p.source]) sources[p.source] = [];
            sources[p.source].push(p);
        });
        Object.keys(sources).forEach(function(source) {
            const header = document.createElement('h3');
            header.className = 'card-title card-title--tight';
            let iconClass = 'fa-user-md';
            if (source === 'Farmacia') iconClass = 'fa-pills';
            if (source === 'Paciente remoto') iconClass = 'fa-mobile-alt';
            const icon = document.createElement('i');
            icon.className = 'fas ' + iconClass;
            icon.setAttribute('aria-hidden', 'true');
            header.appendChild(icon);
            header.appendChild(document.createTextNode(' Fuente: ' + source));
            container.appendChild(header);
            const grid = document.createElement('div');
            grid.className = 'info-grid';
            sources[source].forEach(function(p) {
                grid.appendChild(F.createField(p.name, p.value + (p.note ? ' (' + p.note + ')' : '')));
            });
            container.appendChild(grid);
        });
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
