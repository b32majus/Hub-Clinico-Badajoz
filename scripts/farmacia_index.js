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

    /* ─── Quick View visual field helpers ─── */

    var SCORE_INTERPRETATIONS = {
        IHS4: function (v) { return v <= 10 ? 'Leve' : v <= 25 ? 'Moderado' : 'Grave'; },
        DLQI: function (v) { return v <= 1 ? 'Sin efecto' : v <= 5 ? 'Leve' : v <= 10 ? 'Moderado' : v <= 20 ? 'Muy grave' : 'Extremadamente grave'; },
        DAS28: function (v) { return v <= 2.6 ? 'Remisi\u00f3n' : v <= 3.2 ? 'Baja' : v <= 5.1 ? 'Moderada' : 'Alta'; },
        HAQ: function (v) { return v <= 1 ? 'Leve' : v <= 2 ? 'Moderado' : 'Grave'; }
    };

    function knownScoreInterpretation(name, val) {
        var num = parseFloat(val);
        if (isNaN(num)) return '';
        var fn = SCORE_INTERPRETATIONS[name];
        return fn ? fn(num) : '';
    }

    function parseScores(str) {
        var out = [];
        if (!str || str === '\u2014') return out;
        var known = ['IHS4', 'DLQI', 'DAS28', 'HAQ'];
        for (var ki = 0; ki < known.length; ki++) {
            var name = known[ki];
            var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            var re = new RegExp(escaped + '\\s*(?:demo)?:?\\s*(\\d+(?:\\.\\d+)?)(?:\\s*\u2192\\s*(\\d+(?:\\.\\d+)?))?', 'i');
            var m = str.match(re);
            if (m) {
                var val = m[2] || m[1];
                var interp = knownScoreInterpretation(name, val);
                out.push({ name: name, value: val, interpretation: interp });
            }
        }
        return out;
    }

    function parseAdherencia(str) {
        if (!str || str === '\u2014') return { value: '\u2014', interpretation: 'Sin registro' };
        var morisky = str.match(/Morisky[^:]*:\s*(\d+\/\d+)/i);
        if (morisky) return { value: morisky[1], interpretation: 'Alta' };
        if (/alta/i.test(str)) return { value: str, interpretation: 'Alta' };
        if (/media/i.test(str)) return { value: str, interpretation: 'Media' };
        if (/baja/i.test(str)) return { value: str, interpretation: 'Baja' };
        if (/sin registro/i.test(str)) return { value: '\u2014', interpretation: 'Sin registro' };
        return { value: str, interpretation: '' };
    }

    function parseProms(str) {
        var out = [];
        if (!str || str === '\u2014') return out;
        if (/basal pendiente/i.test(str) || /sin registro/i.test(str)) {
            out.push({ name: 'PROMs demo / último valor', value: 'Basal pendiente', interpretation: 'No disponible' });
            return out;
        }
        var dlqi = str.match(/DLQI\s*(\d+)/i);
        if (dlqi) {
            out.push({ name: 'DLQI demo / último valor', value: dlqi[1], interpretation: knownScoreInterpretation('DLQI', dlqi[1]) });
        }
        var eva = str.match(/EVA\s*(picor|dolor)?\s*(\d+)\/10/i);
        if (eva) {
            var evaVal = parseInt(eva[2]);
            var evaName = 'EVA' + (eva[1] ? ' ' + eva[1] : '');
            var evaInterp = isNaN(evaVal) ? '' : evaVal <= 3 ? 'Leve' : evaVal <= 6 ? 'Moderado' : 'Grave';
            out.push({ name: evaName, value: eva[2] + '/10', interpretation: evaInterp });
        }
        var haq = str.match(/HAQ\s*(\d+(?:\.\d+)?)/i);
        if (haq) {
            out.push({ name: 'HAQ', value: haq[1], interpretation: knownScoreInterpretation('HAQ', haq[1]) });
        }
        return out;
    }

    function createScoreChip(score) {
        var chip = document.createElement('div');
        chip.className = 'fh-qv-score-chip';
        var nameEl = document.createElement('span');
        nameEl.className = 'fh-qv-score-chip__name';
        nameEl.textContent = score.name;
        var valueEl = document.createElement('span');
        valueEl.className = 'fh-qv-score-chip__value';
        valueEl.textContent = score.value;
        chip.append(nameEl, valueEl);
        if (score.interpretation) {
            var interpEl = document.createElement('span');
            interpEl.className = 'fh-qv-score-chip__interp';
            interpEl.textContent = score.interpretation;
            chip.appendChild(interpEl);
        }
        return chip;
    }

    function createAdherenciaChip(adh) {
        var chip = document.createElement('div');
        chip.className = 'fh-qv-score-chip';
        var nameEl = document.createElement('span');
        nameEl.className = 'fh-qv-score-chip__name';
        nameEl.textContent = 'Adherencia';
        var valueEl = document.createElement('span');
        valueEl.className = 'fh-qv-score-chip__value';
        valueEl.textContent = adh.value;
        chip.append(nameEl, valueEl);
        if (adh.interpretation) {
            var interpEl = document.createElement('span');
            interpEl.className = 'fh-qv-score-chip__interp';
            interpEl.textContent = adh.interpretation;
            chip.appendChild(interpEl);
        }
        return chip;
    }

    function createPromCard(prom) {
        var card = document.createElement('div');
        card.className = 'fh-qv-score-chip';
        var nameEl = document.createElement('span');
        nameEl.className = 'fh-qv-score-chip__name';
        nameEl.textContent = prom.name;
        var valueEl = document.createElement('span');
        valueEl.className = 'fh-qv-score-chip__value';
        valueEl.textContent = prom.value;
        card.append(nameEl, valueEl);
        if (prom.interpretation) {
            var interpEl = document.createElement('span');
            interpEl.className = 'fh-qv-score-chip__interp';
            interpEl.textContent = prom.interpretation;
            card.appendChild(interpEl);
        }
        return card;
    }

    function createFarmacoGroup(patient) {
        var wrapper = document.createElement('div');
        wrapper.className = 'fh-qv-farmaco-field fh-qv-span-full';
        var label = document.createElement('span');
        label.className = 'info-field__label';
        label.textContent = 'F\u00e1rmaco / Dosis / Pauta';
        wrapper.appendChild(label);
        var group = document.createElement('div');
        group.className = 'fh-qv-farmaco-group';
        function miniCard(lbl, val) {
            var c = document.createElement('div');
            c.className = 'fh-qv-farmaco-chip';
            var l = document.createElement('span');
            l.className = 'fh-qv-farmaco-chip__label';
            l.textContent = lbl;
            var v = document.createElement('span');
            v.className = 'fh-qv-farmaco-chip__value';
            v.textContent = val || '\u2014';
            c.append(l, v);
            return c;
        }
        group.appendChild(miniCard('F\u00e1rmaco', patient.farmaco));
        group.appendChild(miniCard('Dosis', patient.dosis));
        group.appendChild(miniCard('Pauta', patient.pauta));
        wrapper.appendChild(group);
        return wrapper;
    }

    function createAnaliticaChecklist(patient) {
        var wrapper = document.createElement('div');
        wrapper.className = 'info-field fh-qv-span-full';
        var label = document.createElement('span');
        label.className = 'info-field__label';
        label.textContent = 'Estado anal\u00edtica / vacunaci\u00f3n';
        wrapper.appendChild(label);
        var list = document.createElement('div');
        list.className = 'fh-qv-checklist';
        function item(iconCls, text, stateCls) {
            var it = document.createElement('div');
            it.className = 'fh-qv-checklist__item ' + stateCls;
            var ic = document.createElement('i');
            ic.className = 'fas ' + iconCls;
            ic.setAttribute('aria-hidden', 'true');
            var sp = document.createElement('span');
            sp.textContent = text;
            it.append(ic, sp);
            return it;
        }
        var at = patient.analitica.toLowerCase();
        var aOk = /completa|apto/i.test(at);
        var aPend = /pendiente/i.test(at);
        var vOk = /vacuna/i.test(at) && /completa|apto/i.test(at);
        list.appendChild(item(
            aOk ? 'fa-check-circle' : aPend ? 'fa-clock' : 'fa-exclamation-circle',
            'Anal\u00edtica: ' + (aOk ? 'OK' : aPend ? 'Pendiente' : 'Revisar'),
            aOk ? 'fh-qv-checklist__item--ok' : aPend ? 'fh-qv-checklist__item--pending' : 'fh-qv-checklist__item--review'
        ));
        list.appendChild(item(
            vOk ? 'fa-check-circle' : 'fa-clock',
            'Vacunaci\u00f3n: ' + (vOk ? 'OK' : 'Pendiente'),
            vOk ? 'fh-qv-checklist__item--ok' : 'fh-qv-checklist__item--pending'
        ));
        wrapper.appendChild(list);
        return wrapper;
    }

    function renderFhQuickViewFields(grid, patient) {
        F.clearChildren(grid);
        grid.appendChild(F.createField('\u00daltima solicitud FH', patient.ultimaSolicitud));
        grid.appendChild(createFarmacoGroup(patient));
        grid.appendChild(createAnaliticaChecklist(patient));
        var scores = parseScores(patient.scores);
        for (var si = 0; si < scores.length; si++) {
            grid.appendChild(createScoreChip(scores[si]));
        }
        grid.appendChild(createAdherenciaChip(parseAdherencia(patient.adherencia)));
        grid.appendChild(F.createField('Efectos adversos activos', patient.efectosAdversos));
        var proms = parseProms(patient.proms);
        for (var pi = 0; pi < proms.length; pi++) {
            grid.appendChild(createPromCard(proms[pi]));
        }
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
        idBadge.textContent = 'Paciente demo';

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
        meta.appendChild(metaSpan('fa-calendar-alt', '\u00daltima visita cl\u00ednica: ' + patient.ultimaVisita));
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

        renderFhQuickViewFields(document.getElementById('fhQvGrid'), patient);
        renderActions(patient, document.getElementById('fhQvActions'));

        var guidedPanel = document.getElementById('guidedIntakePanel');
        if (guidedPanel) guidedPanel.classList.add('hidden');
        var mainEl = document.querySelector('main.main-content');
        if (mainEl) mainEl.classList.remove('fh-intake-active');
        var trigger = document.getElementById('fhSearchBtn');
        mount.open(trigger);
    }

    function showGuidedIntake(cip) {
        if (farmaciaOverlayMount) {
            farmaciaOverlayMount.close();
        }
        F.setText('guidedCip', cip);
        document.getElementById('guidedIntakePanel').classList.remove('hidden');
        var mainEl = document.querySelector('main.main-content');
        if (mainEl) mainEl.classList.add('fh-intake-active');
    }

    function search() {
        var cip = document.getElementById('fhCipInput').value.trim();
        if (!cip) return;
        var patient = F.findPatientByCip(cip);
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
            var mainEl = document.querySelector('main.main-content');
            if (mainEl) mainEl.classList.remove('fh-intake-active');
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
                window.alert('Seleccione un circuito de entrada para continuar.');
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


    function textOrDash(value) {
        return value === null || value === undefined || String(value).trim() === '' ? '—' : String(value).trim();
    }

    function buildPendingMeta(iconClass, text) {
        var row = document.createElement('div');
        row.className = 'pending-validation-card__meta';
        var icon = document.createElement('i');
        icon.className = 'fas ' + iconClass;
        icon.setAttribute('aria-hidden', 'true');
        row.appendChild(icon);
        row.appendChild(document.createTextNode(' ' + text));
        return row;
    }

    function pendingSourceLabel(patient) {
        var source = String((patient && patient.importSource) || 'demo');
        if (source.toLowerCase().indexOf('farmacia') !== -1) return 'Excel Farmacia';
        if (source.toLowerCase().indexOf('enfermer') !== -1) return 'Excel Enfermería';
        return 'demo';
    }

    function renderPendingValidationBoard() {
        var board = document.getElementById('pendingValidationBoard');
        var cards = document.getElementById('pendingValidationCards');
        var empty = document.getElementById('pendingValidationEmpty');
        if (!board || !cards || !empty || !F.getPendingValidationPatients) return;
        F.clearChildren(cards);
        var patients = F.getPendingValidationPatients();
        empty.classList.toggle('hidden', patients.length > 0);
        if (!patients.length) return;

        patients.forEach(function (patient) {
            var card = document.createElement('article');
            card.className = 'pending-validation-card';

            var header = document.createElement('div');
            header.className = 'pending-validation-card__header';
            var titleWrap = document.createElement('div');
            titleWrap.className = 'pending-validation-card__title-wrap';
            var title = document.createElement('h3');
            title.className = 'pending-validation-card__title';
            title.textContent = textOrDash(patient.cip);
            var subtitle = document.createElement('p');
            subtitle.className = 'pending-validation-card__subtitle';
            subtitle.textContent = textOrDash(patient.nombre);
            titleWrap.append(title, subtitle);
            var badge = document.createElement('span');
            badge.className = 'status-badge status-badge--pending';
            badge.textContent = 'Pendiente de validación';
            header.append(titleWrap, badge);
            card.appendChild(header);

            var body = document.createElement('div');
            body.className = 'pending-validation-card__body';
            body.appendChild(buildPendingMeta('fa-hospital', 'Servicio origen: ' + textOrDash(patient.servicio)));
            body.appendChild(buildPendingMeta('fa-stethoscope', 'Patología / indicación: ' + textOrDash(patient.patologia || patient.motivoClinico)));
            body.appendChild(buildPendingMeta('fa-pills', 'Fármaco / tratamiento: ' + textOrDash(patient.farmaco || patient.principioActivo)));
            body.appendChild(buildPendingMeta('fa-calendar-alt', 'Fecha solicitud: ' + textOrDash(patient.fechaSolicitud || patient.ultimaSolicitud)));
            body.appendChild(buildPendingMeta('fa-database', 'Origen de datos: ' + pendingSourceLabel(patient)));
            card.appendChild(body);

            var actions = document.createElement('div');
            actions.className = 'pending-validation-card__actions';
            var link = document.createElement('a');
            link.className = 'btn btn-primary';
            link.href = F.makeContextUrl('farmacia_validacion.html', {
                cip: patient.cip,
                servicio: patient.servicioSlug || patient.servicio,
                patologia: patient.patologia,
                entrada: 'validacion'
            });
            F.appendIconText(link, 'fa-check-double', 'Abrir validación');
            actions.appendChild(link);
            card.appendChild(actions);

            cards.appendChild(card);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        ensureOverlay();
        var searchBtn = document.getElementById('fhSearchBtn');
        var cipInput = document.getElementById('fhCipInput');
        if (searchBtn) searchBtn.addEventListener('click', search);
        if (cipInput) cipInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                search();
            }
        });
        initGuidedIntake();
        renderPendingValidationBoard();
        document.addEventListener('farmacia:data-imported', renderPendingValidationBoard);
        var context = F.getQueryContext();
        if (context.cip && cipInput) {
            cipInput.value = context.cip;
            search();
        }
    });
})();
