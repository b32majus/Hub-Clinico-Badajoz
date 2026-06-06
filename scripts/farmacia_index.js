'use strict';

(function () {
    const F = window.FarmaciaDemo;
    let farmaciaOverlayMount = null;

    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'fhQuickViewOverlay';
        overlay.className = 'quick-view-overlay hidden';
        overlay.innerHTML = [
            '<div class="quick-view-backdrop" data-fh-qv-close></div>',
            '<section id="fhQuickViewPanel" class="search-results quick-view-panel hidden" aria-live="polite">',
                '<header class="results-header">',
                    '<div>',
                        '<h2 class="results-title" id="fhTitle">Quick View Farmacia</h2>',
                        '<p class="results-subtitle" id="fhSubtitle"></p>',
                    '</div>',
                    '<button type="button" class="quick-view-close-btn" data-fh-qv-close aria-label="Cerrar vista r\u00e1pida">',
                        '<i class="fas fa-times"></i>',
                    '</button>',
                '</header>',
                '<div id="fhContent" class="results-content"></div>',
            '</section>'
        ].join('');
        document.body.appendChild(overlay);

        const panel = overlay.querySelector('#fhQuickViewPanel');
        const content = overlay.querySelector('#fhContent');
        const title = overlay.querySelector('#fhTitle');
        const subtitle = overlay.querySelector('#fhSubtitle');

        var close = function () {
            panel.classList.add('hidden');
            overlay.classList.add('hidden');
            document.body.classList.remove('quick-view-open');
        };

        overlay.addEventListener('click', function (e) {
            if (e.target.closest('[data-fh-qv-close]') && !overlay.classList.contains('hidden')) close();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !overlay.classList.contains('hidden')) close();
        });

        farmaciaOverlayMount = { overlay: overlay, panel: panel, content: content, title: title, subtitle: subtitle, close: close };
        return farmaciaOverlayMount;
    }

    function ensureOverlay() {
        return farmaciaOverlayMount || createOverlay();
    }

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
                { label: 'Validaci\u00f3n', icon: 'fa-check-double', href: 'farmacia_validacion.html', entrada: 'validacion', cls: 'btn-primary' },
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

    function renderActions(patient, container) {
        F.clearChildren(container);
        actionDefinitions(patient).forEach(function (action) {
            var link = document.createElement('a');
            link.className = 'btn ' + action.cls;
            link.href = F.makeContextUrl(action.href, contextFromPatient(patient, action.entrada));
            F.appendIconText(link, action.icon, action.label);
            container.appendChild(link);
        });
    }

    function renderPatientView(patient) {
        var mount = ensureOverlay();
        var html = [
            '<div class="fh-overlay-card">',
            '<div class="fh-overlay-card__summary">',
                '<div class="patient-avatar"><i class="fas fa-user" aria-hidden="true"></i></div>',
                '<div class="fh-overlay-card__info">',
                    '<div class="patient-id-badge">' + patient.cip + '</div>',
                    '<h3 class="patient-name">' + patient.nombre + '</h3>',
                    '<div class="patient-meta">',
                        '<span><i class="fas fa-stethoscope"></i> ' + patient.patologia + '</span>',
                        '<span><i class="fas fa-hospital"></i> ' + patient.servicio + '</span>',
                        '<span><i class="fas fa-calendar-alt"></i> \u00daltima visita: ' + patient.ultimaVisita + '</span>',
                        '<span><i class="fas fa-birthday-cake"></i> ' + patient.edad + ' a\u00f1os</span>',
                        '<span><i class="fas fa-venus-mars"></i> ' + patient.sexo + '</span>',
                    '</div>',
                '</div>',
                '<span class="' + F.statusClass(patient.estado) + '">' + patient.estadoLabel + '</span>',
            '</div>',
            '</div>',
            '<div class="info-grid" id="fhQvGrid"></div>',
            '<div id="fhQvActions" class="fh-overlay-card__actions"></div>'
        ].join('');
        mount.content.innerHTML = html;
        mount.title.textContent = 'Quick View Farmacia';
        mount.subtitle.textContent = patient.cip;

        F.renderFields(document.getElementById('fhQvGrid'), [
            { label: '\u00daltima solicitud FH', value: patient.ultimaSolicitud },
            { label: 'F\u00e1rmaco solicitado / activo', value: patient.farmaco },
            { label: 'Dosis / pauta actual', value: patient.dosis + ' \u00b7 ' + patient.pauta },
            { label: 'Estado anal\u00edtica/vacunaci\u00f3n', value: patient.analitica },
            { label: 'Scores relevantes', value: patient.scores },
            { label: 'Adherencia', value: patient.adherencia },
            { label: 'Efectos adversos activos', value: patient.efectosAdversos },
            { label: '\u00daltimos PROMs', value: patient.proms }
        ]);
        renderActions(patient, document.getElementById('fhQvActions'));

        mount.panel.classList.remove('hidden');
        mount.overlay.classList.remove('hidden');
        document.body.classList.add('quick-view-open');
        document.getElementById('guidedIntakePanel').classList.add('hidden');
    }

    function showGuidedIntake(cip) {
        if (farmaciaOverlayMount) {
            farmaciaOverlayMount.close();
        }
        F.setText('guidedCip', cip);
        document.getElementById('guidedIntakePanel').classList.remove('hidden');
    }

    function search() {
        var cip = document.getElementById('fhCipInput').value.trim();
        if (!cip) return;
        var patient = F.patients[cip];
        if (patient) renderPatientView(patient);
        else showGuidedIntake(cip);
    }

    function initGuidedIntake() {
        var servicio = document.getElementById('fhAltaServicio');
        var patologia = document.getElementById('fhAltaPatologia');
        servicio.addEventListener('change', function () {
            F.populateSelect(patologia, F.patologiaPorServicio[servicio.value] || [], 'Seleccionar...');
            patologia.disabled = !servicio.value;
        });
        document.getElementById('fhAltaCancelar').addEventListener('click', function () {
            document.getElementById('guidedIntakePanel').classList.add('hidden');
        });
        document.getElementById('fhAltaAcceder').addEventListener('click', function (event) {
            event.preventDefault();
            var punto = document.getElementById('fhAltaPuntoEntrada').value;
            var cip = document.getElementById('guidedCip').textContent.trim();
            var destinos = {
                validacion: 'farmacia_validacion.html',
                primera_visita: 'farmacia_primera_visita.html',
                seguimiento: 'farmacia_seguimiento.html'
            };
            if (!punto || !destinos[punto]) {
                window.alert('Seleccione un punto de entrada para continuar.');
                return;
            }
            if (!servicio.value || !patologia.value) {
                window.alert('Seleccione servicio origen y patolog\u00eda/indicaci\u00f3n.');
                return;
            }
            window.location.href = F.makeContextUrl(destinos[punto], {
                cip: cip,
                servicio: servicio.value,
                patologia: patologia.value,
                entrada: punto
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        ensureOverlay();
        document.getElementById('fhSearchBtn').addEventListener('click', search);
        document.getElementById('fhCipInput').addEventListener('keydown', function (event) { if (event.key === 'Enter') search(); });
        initGuidedIntake();
        var context = F.getQueryContext();
        if (context.cip) {
            document.getElementById('fhCipInput').value = context.cip;
            search();
        }
    });
})();
