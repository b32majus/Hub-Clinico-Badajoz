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
    }
    document.addEventListener('DOMContentLoaded', () => {
        const ctx = F.getQueryContext();
        const patient = ctx.patient || F.patients['CIP-DEMO-FH-001'];
        renderDashboard(patient);
    });
})();
