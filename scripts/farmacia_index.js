'use strict';

(function () {
    const F = window.FarmaciaDemo;
    let farmaciaOverlayMount = null;

    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'fhQuickViewOverlay';
        overlay.className = 'quick-view-overlay hidden';
        var backdrop = document.createElement('div');
        backdrop.className = 'quick-view-backdrop';
        backdrop.setAttribute('data-fh-qv-close', '');

        var panel = document.createElement('section');
        panel.id = 'fhQuickViewPanel';
        panel.className = 'search-results quick-view-panel hidden';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-labelledby', 'fhTitle');
        panel.setAttribute('aria-live', 'polite');

        var header = document.createElement('header');
        header.className = 'results-header';

        var headerInner = document.createElement('div');
        var title = document.createElement('h2');
        title.className = 'results-title';
        title.id = 'fhTitle';
        title.textContent = 'Quick View Farmacia';
        var subtitle = document.createElement('p');
        subtitle.className = 'results-subtitle';
        subtitle.id = 'fhSubtitle';
        headerInner.append(title, subtitle);

        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'quick-view-close-btn';
        closeBtn.setAttribute('data-fh-qv-close', '');
        closeBtn.setAttribute('aria-label', 'Cerrar vista r\u00e1pida');
        var closeIcon = document.createElement('i');
        closeIcon.className = 'fas fa-times';
        closeIcon.setAttribute('aria-hidden', 'true');
        closeBtn.appendChild(closeIcon);

        header.append(headerInner, closeBtn);

        var content = document.createElement('div');
        content.id = 'fhContent';
        content.className = 'results-content';

        panel.append(header, content);
        overlay.append(backdrop, panel);
        document.body.appendChild(overlay);

        var _triggerEl = null;
        var close = function () {
            panel.classList.add('hidden');
            overlay.classList.add('hidden');
            document.body.classList.remove('quick-view-open');
            if (_triggerEl) { _triggerEl.focus(); _triggerEl = null; }
        };

        overlay.addEventListener('click', function (e) {
            if (e.target.closest('[data-fh-qv-close]') && !overlay.classList.contains('hidden')) close();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !overlay.classList.contains('hidden')) close();
        });

        var open = function (triggerEl) {
            _triggerEl = triggerEl || null;
            panel.classList.remove('hidden');
            overlay.classList.remove('hidden');
            document.body.classList.add('quick-view-open');
            closeBtn.focus();
        };
        farmaciaOverlayMount = { overlay: overlay, panel: panel, content: content, title: title, subtitle: subtitle, close: close, open: open };
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
        F.clearChildren(mount.content);

        var card = document.createElement('div');
        card.className = 'fh-overlay-card';

        var summary = document.createElement('div');
        summary.className = 'fh-overlay-card__summary';

        var avatar = document.createElement('div');
        avatar.className = 'patient-avatar';
        var avatarIcon = document.createElement('i');
        avatarIcon.className = 'fas fa-user';
        avatarIcon.setAttribute('aria-hidden', 'true');
        avatar.appendChild(avatarIcon);

        var info = document.createElement('div');
        info.className = 'fh-overlay-card__info';

        var idBadge = document.createElement('div');
        idBadge.className = 'patient-id-badge';
        idBadge.textContent = patient.cip;

        var nameEl = document.createElement('h3');
        nameEl.className = 'patient-name';
        nameEl.textContent = patient.nombre;

        var meta = document.createElement('div');
        meta.className = 'patient-meta';

        function metaSpan(iconClass, text) {
            var span = document.createElement('span');
            var icon = document.createElement('i');
            icon.className = 'fas ' + iconClass;
            icon.setAttribute('aria-hidden', 'true');
            span.appendChild(icon);
            span.appendChild(document.createTextNode(' ' + text));
            return span;
        }
        meta.appendChild(metaSpan('fa-stethoscope', patient.patologia));
        meta.appendChild(metaSpan('fa-hospital', patient.servicio));
        meta.appendChild(metaSpan('fa-calendar-alt', '\u00daltima visita: ' + patient.ultimaVisita));
        meta.appendChild(metaSpan('fa-birthday-cake', patient.edad + ' a\u00f1os'));
        meta.appendChild(metaSpan('fa-venus-mars', patient.sexo));

        info.append(idBadge, nameEl, meta);

        var statusSpan = document.createElement('span');
        statusSpan.className = F.statusClass(patient.estado);
        statusSpan.textContent = patient.estadoLabel;

        summary.append(avatar, info, statusSpan);
        card.appendChild(summary);
        mount.content.appendChild(card);

        var grid = document.createElement('div');
        grid.className = 'info-grid';
        grid.id = 'fhQvGrid';
        mount.content.appendChild(grid);

        var actionsDiv = document.createElement('div');
        actionsDiv.id = 'fhQvActions';
        actionsDiv.className = 'fh-overlay-card__actions';
        mount.content.appendChild(actionsDiv);

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

        var guidedPanel = document.getElementById('guidedIntakePanel');
        if (guidedPanel) guidedPanel.classList.add('hidden');
        var trigger = document.getElementById('fhSearchBtn');
        mount.open(trigger);
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
        var searchBtn = document.getElementById('fhSearchBtn');
        var cipInput = document.getElementById('fhCipInput');
        if (searchBtn) searchBtn.addEventListener('click', search);
        if (cipInput) cipInput.addEventListener('keydown', function (event) { if (event.key === 'Enter') search(); });
        initGuidedIntake();
        var context = F.getQueryContext();
        if (context.cip && cipInput) {
            cipInput.value = context.cip;
            search();
        }
    });
})();
