'use strict';

(function () {
    const F = window.FarmaciaDemo;

    function contextFromPatient(patient, entrada) {
        return {
            cip: patient.cip,
            servicio: patient.servicioSlug || patient.servicio,
            patologia: patient.patologia,
            entrada: entrada || ''
        };
    }

    function actionDefinitions(patient) {
        if (patient.estado === 'pending') {
            return [
                { label: 'Validación', icon: 'fa-check-double', href: 'farmacia_validacion.html', entrada: 'validacion', cls: 'btn-primary' },
                { label: 'Dashboard', icon: 'fa-user-circle', href: 'farmacia_dashboard_paciente.html', entrada: 'dashboard', cls: 'btn-secondary' }
            ];
        }
        if (patient.estado === 'validated') {
            return [
                { label: 'Primera Visita', icon: 'fa-plus-circle', href: 'farmacia_primera_visita.html', entrada: 'primera_visita', cls: 'btn-primary' },
                { label: 'Dashboard', icon: 'fa-user-circle', href: 'farmacia_dashboard_paciente.html', entrada: 'dashboard', cls: 'btn-secondary' }
            ];
        }
        return [
            { label: 'Seguimiento', icon: 'fa-clipboard-list', href: 'farmacia_seguimiento.html', entrada: 'seguimiento', cls: 'btn-primary' },
            { label: 'Dashboard', icon: 'fa-user-circle', href: 'farmacia_dashboard_paciente.html', entrada: 'dashboard', cls: 'btn-secondary' }
        ];
    }

    function renderActions(patient) {
        const actionsEl = document.getElementById('patientActions');
        F.clearChildren(actionsEl);
        actionDefinitions(patient).forEach(action => {
            const link = document.createElement('a');
            link.className = `btn ${action.cls}`;
            link.href = F.makeContextUrl(action.href, contextFromPatient(patient, action.entrada));
            F.appendIconText(link, action.icon, action.label);
            actionsEl.appendChild(link);
        });
    }

    function showQuickView(patient) {
        F.setText('patientName', patient.nombre);
        F.setText('patientIdBadge', patient.cip);
        F.setText('patientDiagnosis', patient.patologia);
        F.setText('patientService', patient.servicio);
        F.setText('patientLastVisit', patient.ultimaVisita);
        F.setText('patientAge', patient.edad);
        F.setText('patientGender', patient.sexo);
        const badge = document.getElementById('patientStatusBadge');
        badge.className = F.statusClass(patient.estado);
        badge.textContent = patient.estadoLabel;
        F.renderFields(document.getElementById('quickViewGrid'), [
            { label: 'Última solicitud FH', value: patient.ultimaSolicitud },
            { label: 'Fármaco solicitado / activo', value: patient.farmaco },
            { label: 'Dosis / pauta actual', value: `${patient.dosis} · ${patient.pauta}` },
            { label: 'Estado analítica/vacunación', value: patient.analitica },
            { label: 'Scores relevantes', value: patient.scores },
            { label: 'Adherencia', value: patient.adherencia },
            { label: 'Efectos adversos activos', value: patient.efectosAdversos },
            { label: 'Últimos PROMs', value: patient.proms }
        ]);
        renderActions(patient);
        document.getElementById('quickViewPanel').classList.remove('hidden');
        document.getElementById('guidedIntakePanel').classList.add('hidden');
    }

    function showGuidedIntake(cip) {
        F.setText('guidedCip', cip);
        document.getElementById('quickViewPanel').classList.add('hidden');
        document.getElementById('guidedIntakePanel').classList.remove('hidden');
    }

    function search() {
        const cip = document.getElementById('fhCipInput').value.trim();
        if (!cip) return;
        const patient = F.patients[cip];
        if (patient) showQuickView(patient);
        else showGuidedIntake(cip);
    }

    function initGuidedIntake() {
        const servicio = document.getElementById('fhAltaServicio');
        const patologia = document.getElementById('fhAltaPatologia');
        servicio.addEventListener('change', () => {
            F.populateSelect(patologia, F.patologiaPorServicio[servicio.value] || [], 'Seleccionar...');
            patologia.disabled = !servicio.value;
        });
        document.getElementById('fhAltaCancelar').addEventListener('click', () => document.getElementById('guidedIntakePanel').classList.add('hidden'));
        document.getElementById('fhAltaAcceder').addEventListener('click', event => {
            event.preventDefault();
            const punto = document.getElementById('fhAltaPuntoEntrada').value;
            const cip = document.getElementById('guidedCip').textContent.trim();
            const destinos = {
                validacion: 'farmacia_validacion.html',
                primera_visita: 'farmacia_primera_visita.html',
                seguimiento: 'farmacia_seguimiento.html'
            };
            if (!punto || !destinos[punto]) {
                window.alert('Seleccione un punto de entrada para continuar.');
                return;
            }
            if (!servicio.value || !patologia.value) {
                window.alert('Seleccione servicio origen y patología/indicación.');
                return;
            }
            window.location.href = F.makeContextUrl(destinos[punto], {
                cip,
                servicio: servicio.value,
                patologia: patologia.value,
                entrada: punto
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('fhSearchBtn').addEventListener('click', search);
        document.getElementById('fhCipInput').addEventListener('keydown', event => { if (event.key === 'Enter') search(); });
        initGuidedIntake();
        const context = F.getQueryContext();
        if (context.cip) {
            document.getElementById('fhCipInput').value = context.cip;
            search();
        }
    });
})();
