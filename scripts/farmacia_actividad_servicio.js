'use strict';

(function () {
    var F = window.FarmaciaDemo || null;

    function getPatients() {
        if (!F || !F.getAvailablePatients) return [];
        return F.getAvailablePatients();
    }

    function countBy(patientList, fn) {
        var c = 0;
        for (var i = 0; i < patientList.length; i++) {
            if (fn(patientList[i])) c++;
        }
        return c;
    }

    function extractPrinciple(patient) {
        if (patient.principioActivo) return patient.principioActivo;
        var farmaco = patient.farmaco || '';
        var idx = farmaco.search(/[0-9]/);
        if (idx === -1) return farmaco.trim();
        return farmaco.substring(0, idx).trim();
    }

    function buildCard(iconClass, title, valueElBuilder) {
        var card = document.createElement('div');
        card.className = 'dashboard-card';

        var heading = document.createElement('h2');
        heading.className = 'card-title';
        var icon = document.createElement('i');
        icon.className = 'fas ' + iconClass;
        icon.setAttribute('aria-hidden', 'true');
        heading.appendChild(icon);
        heading.appendChild(document.createTextNode(' ' + title));
        card.appendChild(heading);

        valueElBuilder(card);
        return card;
    }

    function buildValueCard(iconClass, title, value) {
        return buildCard(iconClass, title, function (card) {
            var p = document.createElement('p');
            p.className = 'patient-name';
            p.textContent = value;
            card.appendChild(p);
        });
    }

    function buildListCard(iconClass, title, items) {
        return buildCard(iconClass, title, function (card) {
            var ul = document.createElement('ul');
            ul.className = 'stats-list';
            for (var i = 0; i < items.length; i++) {
                var li = document.createElement('li');
                li.textContent = items[i];
                ul.appendChild(li);
            }
            card.appendChild(ul);
        });
    }

    function getSourceSummary(patientList) {
        var hasDemo = false;
        var hasEnfermeria = false;
        var hasFarmacia = false;
        for (var i = 0; i < patientList.length; i++) {
            var source = String((patientList[i].importSource || 'demo')).toLowerCase();
            if (source.indexOf('farmacia') !== -1) hasFarmacia = true;
            else if (source.indexOf('enfermer') !== -1) hasEnfermeria = true;
            else hasDemo = true;
        }
        if ((hasDemo && hasEnfermeria) || (hasDemo && hasFarmacia) || (hasEnfermeria && hasFarmacia)) return 'Fuente actual: combinado';
        if (hasFarmacia) return 'Fuente actual: Excel Farmacia';
        if (hasEnfermeria) return 'Fuente actual: Excel Enfermería';
        return 'Fuente actual: datos demo';
    }

    /* ---- Panel de validaciones pendientes ---- */

    var pendientesToggleOpen = false;
    var pendientesPanelId = 'actividadPendientesPanel';

    function buildPendingCardIcon(iconClass) {
        var i = document.createElement('i');
        i.className = 'fas ' + iconClass;
        i.setAttribute('aria-hidden', 'true');
        return i;
    }

    function buildPendingMeta(iconClass, text) {
        var p = document.createElement('p');
        p.className = 'pending-validation-card__meta';
        p.appendChild(buildPendingCardIcon(iconClass));
        p.appendChild(document.createTextNode(' ' + text));
        return p;
    }

    function textOrDash(v) {
        return (v !== null && v !== undefined && String(v).trim() !== '') ? String(v) : '—';
    }

    function buildPrebioBlock(patient) {
        var block = document.createElement('div');
        block.className = 'actividad-panel__prebio';

        if (!patient || !window.FarmaciaPrebiologico ||
            typeof window.FarmaciaPrebiologico.evaluatePatientPrebiologico !== 'function') {
            block.className = 'actividad-panel__prebio actividad-panel__prebio--na';
            block.textContent = 'Prebiológico no disponible';
            return block;
        }

        var result = window.FarmaciaPrebiologico.evaluatePatientPrebiologico(patient);
        if (!result || !result.overallStatus) {
            block.textContent = 'Prebiológico no evaluable';
            return block;
        }

        var overallStatus = result.overallStatus;
        var blockers = result.blockers || [];

        var labelRow = document.createElement('div');
        labelRow.className = 'actividad-panel__prebio-label';
        var icon = document.createElement('i');
        icon.setAttribute('aria-hidden', 'true');
        var text = document.createElement('span');

        if (overallStatus === 'complete') {
            block.classList.add('actividad-panel__prebio--ok');
            icon.className = 'fas fa-check-circle';
            text.textContent = 'Prebiológico completo · Listo para validación';
            labelRow.appendChild(icon);
            labelRow.appendChild(text);
            block.appendChild(labelRow);
            return block;
        }

        if (overallStatus === 'blocked' || overallStatus === 'incomplete') {
            if (overallStatus === 'blocked') {
                block.classList.add('actividad-panel__prebio--alerta');
                icon.className = 'fas fa-exclamation-triangle';
                text.textContent = 'Prebiológico bloqueado · ' + blockers.length + ' bloqueo' + (blockers.length === 1 ? '' : 's');
            } else {
                block.classList.add('actividad-panel__prebio--pending');
                icon.className = 'fas fa-hourglass-half';
                text.textContent = 'Prebiológico incompleto · ' + blockers.length + ' bloqueo' + (blockers.length === 1 ? '' : 's');
            }

            labelRow.appendChild(icon);
            labelRow.appendChild(text);
            block.appendChild(labelRow);

            if (blockers.length > 0) {
                var priority = { alert: 0, pending: 1, unknown: 2, missing: 3 };
                var sorted = blockers.slice().sort(function (a, b) {
                    var pa = priority[a.status] !== undefined ? priority[a.status] : 99;
                    var pb = priority[b.status] !== undefined ? priority[b.status] : 99;
                    return pa - pb;
                });

                var chipsContainer = document.createElement('div');
                chipsContainer.className = 'actividad-panel__prebio-chips';
                var maxShown = 3;
                var shown = sorted.slice(0, maxShown);
                var extra = sorted.length - maxShown;

                for (var i = 0; i < shown.length; i++) {
                    var item = shown[i];
                    var chip = document.createElement('span');
                    chip.className = 'prebio-chip status-' + item.status;
                    chip.textContent = item.label + ': ' + item.status;
                    if (item.detail) {
                        chip.setAttribute('title', item.detail);
                    }
                    chipsContainer.appendChild(chip);
                }

                if (extra > 0) {
                    var moreChip = document.createElement('span');
                    moreChip.className = 'prebio-chip prebio-chip--more';
                    moreChip.textContent = '+' + extra + ' más';
                    chipsContainer.appendChild(moreChip);
                }

                block.appendChild(chipsContainer);
            }
            return block;
        }

        block.textContent = 'Prebiológico no evaluable';
        return block;
    }

    function renderPendientesPanel() {
        var panel = document.getElementById(pendientesPanelId);
        if (!panel) return;
        F.clearChildren(panel);

        var getPendientes = window.FarmaciaDemo && window.FarmaciaDemo.getPendingValidationPatients
            ? window.FarmaciaDemo.getPendingValidationPatients
            : null;

        var patients = typeof getPendientes === 'function' ? getPendientes() : [];

        if (!patients.length) {
            var emptyMsg = document.createElement('p');
            emptyMsg.className = 'actividad-panel__empty';
            emptyMsg.textContent = 'No hay validaciones pendientes.';
            panel.appendChild(emptyMsg);
            return;
        }

        var title = document.createElement('h3');
        title.className = 'actividad-panel__title';
        title.textContent = 'Pacientes pendientes de validación farmacéutica';
        panel.appendChild(title);

        var list = document.createElement('div');
        list.className = 'actividad-panel__list';

        patients.forEach(function (patient) {
            var row = document.createElement('div');
            row.className = 'actividad-panel__row';

            var info = document.createElement('div');
            info.className = 'actividad-panel__info';

            var nameLine = document.createElement('div');
            nameLine.className = 'actividad-panel__name-line';
            var cip = document.createElement('strong');
            cip.textContent = textOrDash(patient.cip);
            nameLine.appendChild(cip);
            var sep = document.createTextNode(' · ');
            nameLine.appendChild(sep);
            var nom = document.createElement('span');
            nom.textContent = textOrDash(patient.nombre);
            nameLine.appendChild(nom);
            info.appendChild(nameLine);

            var detail = document.createElement('div');
            detail.className = 'actividad-panel__detail';
            var detailParts = [];
            if (patient.servicio) detailParts.push(textOrDash(patient.servicio));
            if (patient.patologia || patient.motivoClinico) detailParts.push(textOrDash(patient.patologia || patient.motivoClinico));
            if (patient.farmaco || patient.principioActivo) detailParts.push(textOrDash(patient.farmaco || patient.principioActivo));
            if (patient.fechaSolicitud || patient.ultimaSolicitud) detailParts.push('Sol: ' + textOrDash(patient.fechaSolicitud || patient.ultimaSolicitud));
            if (patient.importSource) detailParts.push('Origen: ' + textOrDash(patient.importSource));
            detail.textContent = detailParts.join(' · ');
            info.appendChild(detail);

            row.appendChild(info);

            var prebioBlock = buildPrebioBlock(patient);

            var mainInfo = document.createElement('div');
            mainInfo.className = 'actividad-panel__main';
            mainInfo.appendChild(info);
            mainInfo.appendChild(prebioBlock);
            row.appendChild(mainInfo);

            var actions = document.createElement('div');
            actions.className = 'actividad-panel__actions';
            var link = document.createElement('a');
            link.className = 'btn btn-sm btn-outline';
            link.href = 'farmacia_validacion.html?cip=' + encodeURIComponent(patient.cip || '');
            var linkIcon = document.createElement('i');
            linkIcon.className = 'fas fa-check-double';
            linkIcon.setAttribute('aria-hidden', 'true');
            link.appendChild(linkIcon);
            link.appendChild(document.createTextNode(' Abrir validación'));
            actions.appendChild(link);
            row.appendChild(actions);

            list.appendChild(row);
        });

        panel.appendChild(list);
    }

    function togglePendientesPanel() {
        var panel = document.getElementById(pendientesPanelId);
        var toggle = document.getElementById('pendientesToggle');
        if (!panel || !toggle) return;

        pendientesToggleOpen = !pendientesToggleOpen;

        if (pendientesToggleOpen) {
            renderPendientesPanel();
            panel.classList.remove('hidden');
            toggle.setAttribute('aria-expanded', 'true');
            panel.focus();
        } else {
            panel.classList.add('hidden');
            toggle.setAttribute('aria-expanded', 'false');
            F.clearChildren(panel);
            toggle.focus();
        }
    }

    function buildPendientesCard(count) {
        var card = document.createElement('button');
        card.type = 'button';
        card.id = 'pendientesToggle';
        card.className = 'dashboard-card dashboard-card--clickable';
        card.setAttribute('aria-expanded', 'false');
        card.setAttribute('aria-controls', pendientesPanelId);
        card.title = 'Ver pacientes pendientes';
        card.addEventListener('click', togglePendientesPanel);

        var heading = document.createElement('h2');
        heading.className = 'card-title';
        var icon = document.createElement('i');
        icon.className = 'fas fa-user-clock';
        icon.setAttribute('aria-hidden', 'true');
        heading.appendChild(icon);
        heading.appendChild(document.createTextNode(' Validaciones pendientes'));
        card.appendChild(heading);

        var p = document.createElement('p');
        p.className = 'patient-name';
        p.textContent = String(count);
        card.appendChild(p);

        var hint = document.createElement('span');
        hint.className = 'actividad-card__hint';
        hint.textContent = 'Ver pendientes';
        var chevron = document.createElement('i');
        chevron.className = 'fas fa-chevron-down actividad-card__chevron';
        chevron.setAttribute('aria-hidden', 'true');
        hint.appendChild(chevron);
        card.appendChild(hint);

        return card;
    }

    /* ---- /Panel ---- */

    function renderStats() {
        var container = document.getElementById('actividadCards');
        var sourceNote = document.getElementById('actividadSourceNote');
        if (!container) return;
        F.clearChildren(container);
        var patientList = getPatients();

        if (sourceNote) sourceNote.textContent = getSourceSummary(patientList);

        var pendientes = countBy(patientList, function (p) { return String(p.estado || '').toLowerCase() === 'pending'; });
        var realizadas = countBy(patientList, function (p) {
            var estado = String(p.estado || '').toLowerCase();
            return estado === 'followup' || estado === 'validated';
        });
        var seguimiento = countBy(patientList, function (p) { return String(p.estado || '').toLowerCase() === 'followup'; });

        var origenItems = [getSourceSummary(patientList)];
        if (window.FarmaciaCatalog && window.FarmaciaCatalog.getStatus) {
            origenItems.push(window.FarmaciaCatalog.getStatus().message);
        }

        var freqMap = {};
        for (var j = 0; j < patientList.length; j++) {
            var princ = extractPrinciple(patientList[j]);
            if (princ) freqMap[princ] = (freqMap[princ] || 0) + 1;
        }
        var freqSorted = Object.keys(freqMap).sort(function (a, b) { return freqMap[b] - freqMap[a]; });
        var freqItems = freqSorted.length ? freqSorted.map(function (k) { return k + ': ' + freqMap[k]; }) : ['Sin datos suficientes'];

        var optimizaciones = 0;
        var promsPend = countBy(patientList, function (p) {
            var t = String(p.proms || '').toLowerCase();
            return t.indexOf('pendiente') !== -1 || t === '—' || t === '' || t === 'sin registro';
        });
        var promsRep = countBy(patientList, function (p) {
            var t = String(p.proms || '').toLowerCase();
            return t && t !== '—' && t !== 'sin registro' && t.indexOf('pendiente') === -1;
        });

        container.appendChild(buildPendientesCard(pendientes));
        container.appendChild(buildValueCard('fa-check-circle', 'Realizadas', String(realizadas)));
        container.appendChild(buildValueCard('fa-clipboard-list', 'En seguimiento', String(seguimiento)));
        container.appendChild(buildListCard('fa-hospital-user', 'Fuente actual', origenItems));
        container.appendChild(buildListCard('fa-pills', 'Fármacos frecuentes', freqItems));
        container.appendChild(buildValueCard('fa-compress-arrows-alt', 'Optimizaciones', String(optimizaciones)));
        container.appendChild(buildValueCard('fa-hourglass-half', 'PROMs pendientes', String(promsPend)));
        container.appendChild(buildValueCard('fa-file-medical-alt', 'PROMs reportados', String(promsRep)));

        // Reset panel state on re-render
        var panel = document.getElementById(pendientesPanelId);
        if (panel) {
            panel.classList.add('hidden');
            F.clearChildren(panel);
        }
        var toggle = document.getElementById('pendientesToggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
        pendientesToggleOpen = false;
    }

    document.addEventListener('DOMContentLoaded', function () {
        renderStats();
        document.addEventListener('farmacia:data-imported', renderStats);
    });
})();
