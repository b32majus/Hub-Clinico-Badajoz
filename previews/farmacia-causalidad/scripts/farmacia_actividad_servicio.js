'use strict';

(function () {
    var patients = window.FarmaciaDemo ? window.FarmaciaDemo.patients : {};
    var patientList = Object.values(patients);

    function countBy(fn) {
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

    function renderStats() {
        var container = document.getElementById('actividadCards');
        if (!container) return;

        var pendientes = countBy(function (p) { return p.estado === 'pending'; });
        var realizadas = countBy(function (p) { return p.estado === 'followup' || p.estado === 'validated'; });
        var seguimiento = countBy(function (p) { return p.estado === 'followup'; });

        var origenItems = ['Origen cat\u00e1logo demo: CIMA / Local Especial no persistido en dataset; 3 tratamientos demo'];

        if (window.FarmaciaCatalog && window.FarmaciaCatalog.getSnapshot()) {
            var snap = window.FarmaciaCatalog.getSnapshot();
            var st = (snap.source_type || '').toLowerCase();
            var origenLabel = st === 'cima' ? 'CIMA'
                : (st === 'local' || st === 'local_especial') ? 'Local Especial'
                : st === 'local_pendiente_demo' ? 'Demo / local pendiente' : 'Sin cat\u00e1logo cargado';
            origenItems.push('Origen cat\u00e1logo actual: ' + origenLabel);
        }

        var freqMap = {};
        for (var j = 0; j < patientList.length; j++) {
            var princ = extractPrinciple(patientList[j]);
            if (princ) freqMap[princ] = (freqMap[princ] || 0) + 1;
        }
        var freqSorted = Object.keys(freqMap).sort(function (a, b) { return freqMap[b] - freqMap[a]; });
        var freqItems = freqSorted.map(function (k) { return k + ': ' + freqMap[k]; });

        var optimizaciones = 0;

        var promsPend = countBy(function (p) {
            var t = (p.proms || '').toLowerCase();
            return t.indexOf('pendiente') !== -1 || t === '—' || t === '';
        });
        var promsRep = countBy(function (p) {
            var t = (p.proms || '').toLowerCase();
            return t.indexOf('pendiente') === -1 && t !== '—' && t !== '';
        });

        container.appendChild(buildValueCard('fa-user-clock', 'Validaciones pendientes', String(pendientes)));
        container.appendChild(buildValueCard('fa-check-circle', 'Realizadas', String(realizadas)));
        container.appendChild(buildValueCard('fa-clipboard-list', 'En seguimiento', String(seguimiento)));
        container.appendChild(buildListCard('fa-hospital-user', 'Tratamientos por origen de cat\u00e1logo', origenItems));
        container.appendChild(buildListCard('fa-pills', 'F\u00e1rmacos frecuentes', freqItems));
        container.appendChild(buildValueCard('fa-compress-arrows-alt', 'Optimizaciones', String(optimizaciones)));
        container.appendChild(buildValueCard('fa-hourglass-half', 'PROMs pendientes', String(promsPend)));
        container.appendChild(buildValueCard('fa-file-medical-alt', 'PROMs reportados', String(promsRep)));
    }

    document.addEventListener('DOMContentLoaded', renderStats);
})();
