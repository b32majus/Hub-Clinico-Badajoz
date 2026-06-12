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

        container.appendChild(buildValueCard('fa-user-clock', 'Validaciones pendientes', String(pendientes)));
        container.appendChild(buildValueCard('fa-check-circle', 'Realizadas', String(realizadas)));
        container.appendChild(buildValueCard('fa-clipboard-list', 'En seguimiento', String(seguimiento)));
        container.appendChild(buildListCard('fa-hospital-user', 'Fuente actual', origenItems));
        container.appendChild(buildListCard('fa-pills', 'Fármacos frecuentes', freqItems));
        container.appendChild(buildValueCard('fa-compress-arrows-alt', 'Optimizaciones', String(optimizaciones)));
        container.appendChild(buildValueCard('fa-hourglass-half', 'PROMs pendientes', String(promsPend)));
        container.appendChild(buildValueCard('fa-file-medical-alt', 'PROMs reportados', String(promsRep)));
    }

    document.addEventListener('DOMContentLoaded', function () {
        renderStats();
        document.addEventListener('farmacia:data-imported', renderStats);
    });
})();
