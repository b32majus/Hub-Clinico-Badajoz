'use strict';

(function () {
    var dataset = null;
    var currentCip = null;

    function $(id) { return document.getElementById(id); }

    function el(tag) { return document.createElement(tag); }

    function txt(text) { return document.createTextNode(text); }

    function clear(container) {
        if (!container) return;
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    function span(text, className) {
        var s = el('span');
        if (className) { s.className = className; }
        if (text !== null && text !== undefined) { s.textContent = text; }
        return s;
    }

    function divEl(className) {
        var d = el('div');
        if (className) { d.className = className; }
        return d;
    }

    function pEl(text, className) {
        var par = el('p');
        if (className) { par.className = className; }
        if (text !== null && text !== undefined) { par.textContent = text; }
        return par;
    }

    function heading(level, text) {
        var h = el('h' + level);
        h.textContent = text;
        return h;
    }

    function icon(cls) {
        var i = el('i');
        i.className = 'fas ' + cls;
        i.setAttribute('aria-hidden', 'true');
        return i;
    }

    function getPatient(cip) {
        if (!dataset || !dataset.pacientes) { return null; }
        for (var i = 0; i < dataset.pacientes.length; i++) {
            if (dataset.pacientes[i].cip === cip) { return dataset.pacientes[i]; }
        }
        return null;
    }

    var PROM_MAP = { dlqi: 'DLQI', eva_dolor: 'EVA dolor', eva_prurito: 'EVA prurito' };
    var CLINICAL_MAP = { ihs4: 'IHS4', hurley: 'Hurley', das28: 'DAS28', haq: 'HAQ' };

    var PROM_MAX = {
        'DLQI': 30,
        'EVA dolor': 10,
        'EVA prurito': 10,
        'HAQ': 3
    };

    var CLINICAL_MAX = {
        'IHS4': 20,
        'Hurley': 3,
        'DAS28': 10,
        'HAQ': 3
    };

    function promTypeMap(value) { return PROM_MAP[value] || value; }
    function clinicalTypeMap(value) { return CLINICAL_MAP[value] || value; }
    function promMax(type) { return PROM_MAX[type] || 100; }
    function clinicalMax(type) { return CLINICAL_MAX[type] || 100; }

    function barColorForScale(type, numericVal) {
        var n = numericVal;
        if (isNaN(n)) { return '#95a5a6'; }
        switch (type) {
            case 'DLQI':       return n >= 11 ? '#c0392b' : n >= 6 ? '#e67e22' : '#27ae60';
            case 'HAQ':        return n >= 1.5 ? '#c0392b' : n >= 1 ? '#e67e22' : '#27ae60';
            case 'EVA dolor':  return n >= 7 ? '#c0392b' : n >= 4 ? '#e67e22' : '#27ae60';
            case 'EVA prurito':return n >= 7 ? '#c0392b' : n >= 4 ? '#e67e22' : '#27ae60';
            case 'DAS28':      return n > 5.1 ? '#c0392b' : n > 3.2 ? '#e67e22' : '#27ae60';
            case 'IHS4':       return n >= 11 ? '#c0392b' : n >= 4 ? '#e67e22' : '#27ae60';
            case 'Hurley':     return n >= 3 ? '#c0392b' : n >= 2 ? '#e67e22' : '#27ae60';
            default:           var fallback = Math.min(100, (n / 100) * 100);
                              return fallback > 50 ? '#c0392b' : fallback > 25 ? '#e67e22' : '#27ae60';
        }
    }

    function buildInfoField(label, value) {
        var field = divEl('info-field');
        var labelEl = span(label, 'info-field__label');
        var valueEl = span(value || '—', 'info-field__value');
        field.appendChild(labelEl);
        field.appendChild(valueEl);
        return field;
    }

    function renderError() {
        var blocks = [
            'longitudinalPatientSummary',
            'longitudinalTreatmentTimeline',
            'longitudinalPromChart',
            'longitudinalClinicalChart',
            'longitudinalAdverseEvents',
            'longitudinalLegend'
        ];
        for (var i = 0; i < blocks.length; i++) {
            var blockEl = $(blocks[i]);
            if (!blockEl) { continue; }
            clear(blockEl);
            var msg = pEl('Error al cargar el dataset demo longitudinal. Verifique la consola para más detalles.', 'longitudinal-error');
            blockEl.appendChild(msg);
        }
    }

    function fetchDataset(callback) {
        var statusEl = $('longitudinalDataStatus');
        fetch('data/demo/farmacia/farmacia_longitudinal_demo_v0_3.json')
            .then(function (response) {
                if (!response.ok) { throw new Error('Failed to fetch dataset'); }
                return response.json();
            })
            .then(function (data) {
                dataset = data;
                if (statusEl) {
                    var count = (dataset.pacientes && dataset.pacientes.length) ? dataset.pacientes.length : 0;
                    statusEl.textContent = 'Dataset cargado — ' + count + ' paciente(s) demo';
                }
                if (typeof callback === 'function') { callback(true); }
            })
            .catch(function () {
                if (statusEl) { statusEl.textContent = 'Error al cargar dataset demo longitudinal'; }
                renderError();
                if (typeof callback === 'function') { callback(false); }
            });
    }

    function populatePatientSelect() {
        var sel = $('longitudinalPatientSelect');
        if (!sel || !dataset || !dataset.pacientes) { return; }
        clear(sel);
        var placeholder = el('option');
        placeholder.value = '';
        placeholder.textContent = 'Seleccionar paciente…';
        sel.appendChild(placeholder);

        for (var i = 0; i < dataset.pacientes.length; i++) {
            var p = dataset.pacientes[i];
            var opt = el('option');
            opt.value = p.cip;
            opt.textContent = (p.nombre_demo || p.cip) + ' (' + p.cip + ')';
            sel.appendChild(opt);
        }
    }

    function renderPatientSummary(patient) {
        var container = $('longitudinalPatientSummary');
        if (!container) { return; }
        clear(container);

        if (!patient) { return; }

        var servicios = (patient.servicios_origen || []).join(', ');
        var patologias = (patient.patologias || []).join(', ');

        var comorbText = '';
        var comorbList = patient.comorbilidades_relevantes || [];
        var comorbParts = [];
        for (var i = 0; i < comorbList.length; i++) {
            if (comorbList[i] && comorbList[i].nombre) {
                comorbParts.push(comorbList[i].nombre);
            }
        }
        comorbText = comorbParts.join(', ');

        var fields = [
            { l: 'CIP', v: patient.cip },
            { l: 'Nombre demo', v: patient.nombre_demo },
            { l: 'Sexo', v: patient.sexo },
            { l: 'Edad', v: patient.edad != null ? String(patient.edad) : '' },
            { l: 'Servicio(s)', v: servicios },
            { l: 'Patología(s)', v: patologias },
            { l: 'Comorbilidades', v: comorbText || 'Ninguna registrada' },
            { l: 'Status', v: 'pending_review / demo — datos sintéticos' }
        ];

        for (var j = 0; j < fields.length; j++) {
            container.appendChild(buildInfoField(fields[j].l, fields[j].v));
        }
    }

    function renderTreatmentTimeline(patient) {
        var container = $('longitudinalTreatmentTimeline');
        if (!container) { return; }
        clear(container);

        if (!patient) { return; }

        var treatments = patient.tratamientos || [];
        var changes = patient.cambios_pauta || [];

        var items = [];

        for (var i = 0; i < treatments.length; i++) {
            var t = treatments[i];
            items.push({
                type: 'treatment',
                date: t.fecha_inicio || '',
                endDate: t.fecha_fin || null,
                drug: t.nombre_comercial || '',
                principle: t.principio_activo || '',
                dose: t.presentacion_dosis || '',
                pauta: t.pauta || '',
                via: t.via || '',
                active: !!t.activo,
                motivoInicio: t.motivo_inicio || '',
                motivoSuspension: t.motivo_suspension || '',
                motivoCambio: t.motivo_cambio || '',
                estadoValidacion: t.estado_validacion_farmacia || 'pendiente'
            });
        }

        for (var j = 0; j < changes.length; j++) {
            var c = changes[j];
            items.push({
                type: 'change',
                date: c.fecha || '',
                motivo: c.motivo || '',
                descripcion: c.descripcion || '',
                tipo: c.tipo || '',
                estadoValidacion: c.estado_validacion_farmacia || 'pendiente'
            });
        }

        items.sort(function (a, b) {
            if (!a.date) { return 1; }
            if (!b.date) { return -1; }
            return a.date.localeCompare(b.date);
        });

        if (items.length === 0) {
            var emptyMsg = pEl('Sin tratamientos registrados en el dataset demo.', 'longitudinal-empty');
            container.appendChild(emptyMsg);
            return;
        }

        for (var k = 0; k < items.length; k++) {
            var item = items[k];
            var card = divEl('longitudinal-timeline-card');

            if (item.type === 'treatment') {
                var header = divEl('longitudinal-timeline-header');

                var drugName = span(item.drug, 'longitudinal-drug-name');
                header.appendChild(drugName);

                var statusClass = item.active ? 'status-badge status-badge--followup' : 'status-badge status-badge--denied';
                var statusLabel = item.active ? 'Activo' : 'Suspendido';
                var statusBadge = span(statusLabel, statusClass);
                header.appendChild(statusBadge);

                card.appendChild(header);

                var details = divEl('longitudinal-timeline-details');

                if (item.principle) {
                    details.appendChild(span(item.principle, 'longitudinal-timeline-principle'));
                }
                if (item.dose) {
                    details.appendChild(span(item.dose, 'longitudinal-timeline-dose'));
                }
                if (item.pauta) {
                    details.appendChild(span(item.pauta, 'longitudinal-timeline-pauta'));
                }
                if (item.via) {
                    details.appendChild(span('Vía: ' + item.via, 'longitudinal-timeline-via'));
                }

                card.appendChild(details);

                var dates = divEl('longitudinal-timeline-dates');
                dates.appendChild(span('Inicio: ' + item.date, 'longitudinal-timeline-date'));
                dates.appendChild(span('Fin: ' + (item.endDate || 'Activo'), 'longitudinal-timeline-date'));
                card.appendChild(dates);

                if (item.motivoInicio) {
                    var inicioDiv = divEl('longitudinal-timeline-motive');
                    inicioDiv.appendChild(span('Motivo inicio: ' + item.motivoInicio, 'longitudinal-timeline-motive-text'));
                    card.appendChild(inicioDiv);
                }

                if (item.motivoSuspension) {
                    var suspDiv = divEl('longitudinal-timeline-motive');
                    suspDiv.appendChild(span('Suspensión: ' + item.motivoSuspension, 'longitudinal-timeline-motive-text'));
                    card.appendChild(suspDiv);
                }

                if (item.motivoCambio) {
                    var cambioDiv = divEl('longitudinal-timeline-motive');
                    cambioDiv.appendChild(span('Cambio: ' + item.motivoCambio, 'longitudinal-timeline-motive-text'));
                    card.appendChild(cambioDiv);
                }

                var valDiv = divEl('longitudinal-timeline-validation');
                var valIcon = icon('fa-check-circle');
                valDiv.appendChild(valIcon);
                valDiv.appendChild(txt(' Validación: ' + item.estadoValidacion));
                card.appendChild(valDiv);

            } else if (item.type === 'change') {
                var changeHeader = divEl('longitudinal-timeline-header');

                var changeLabel = span('Cambio de pauta', 'longitudinal-change-label');
                changeHeader.appendChild(changeLabel);

                var changeStatusClass = 'status-badge status-badge--pending';
                var changeStatusLabel = item.estadoValidacion;
                var changeBadge = span(changeStatusLabel, changeStatusClass);
                changeHeader.appendChild(changeBadge);

                card.appendChild(changeHeader);

                var changeDates = divEl('longitudinal-timeline-dates');
                changeDates.appendChild(span('Fecha: ' + item.date, 'longitudinal-timeline-date'));
                card.appendChild(changeDates);

                if (item.tipo) {
                    var tipoDiv = divEl('longitudinal-timeline-motive');
                    tipoDiv.appendChild(span('Tipo: ' + item.tipo, 'longitudinal-timeline-motive-text'));
                    card.appendChild(tipoDiv);
                }

                if (item.motivo) {
                    var cambioMotivoDiv = divEl('longitudinal-timeline-motive');
                    cambioMotivoDiv.appendChild(span(item.motivo, 'longitudinal-timeline-motive-text'));
                    card.appendChild(cambioMotivoDiv);
                }

                if (item.descripcion) {
                    var cambioDescDiv = divEl('longitudinal-timeline-motive');
                    cambioDescDiv.appendChild(span(item.descripcion, 'longitudinal-timeline-motive-text'));
                    card.appendChild(cambioDescDiv);
                }
            }

            container.appendChild(card);
        }
    }

    function renderAdverseEvents(patient) {
        var container = $('longitudinalAdverseEvents');
        if (!container) { return; }
        clear(container);

        if (!patient) { return; }

        var events = patient.eventos_adversos || [];

        if (events.length === 0) {
            var emptyMsg = pEl('Sin eventos adversos registrados en el dataset demo.', 'longitudinal-empty');
            container.appendChild(emptyMsg);
            return;
        }

        for (var i = 0; i < events.length; i++) {
            var ev = events[i];
            var card = divEl('longitudinal-ae-card');

            var header = divEl('longitudinal-ae-header');

            var aeIcon = icon('fa-exclamation-triangle');
            aeIcon.className = 'fas fa-exclamation-triangle longitudinal-ae-icon';
            if (ev.gravedad === 'leve') {
                aeIcon.style.color = '#e6a817';
            } else if (ev.gravedad === 'moderado' || ev.gravedad === 'moderada') {
                aeIcon.style.color = '#e67e22';
            } else {
                aeIcon.style.color = '#c0392b';
            }
            header.appendChild(aeIcon);

            var titleText = (ev.tipo || 'Evento adverso') + ' (' + (ev.fecha || 'sin fecha') + ')';
            header.appendChild(span(titleText, 'longitudinal-ae-title'));

            var gravBadge = span(ev.gravedad || 'no especificada', 'status-badge status-badge--pending');
            header.appendChild(gravBadge);

            card.appendChild(header);

            var details = divEl('longitudinal-ae-details');
            details.appendChild(span('Relación con tratamiento: ' + (ev.relacion_tratamiento || '—'), 'longitudinal-ae-detail'));
            details.appendChild(span('Acción tomada: ' + (ev.accion_tomada || '—'), 'longitudinal-ae-detail'));
            details.appendChild(span('Resuelto: ' + (ev.resuelto ? 'Sí' : 'No'), 'longitudinal-ae-detail'));
            card.appendChild(details);

            if (ev.descripcion_corta) {
                card.setAttribute('title', ev.descripcion_corta);
                var desc = divEl('longitudinal-ae-description');
                desc.appendChild(txt(ev.descripcion_corta));
                card.appendChild(desc);
            }

            container.appendChild(card);
        }
    }

    function renderPromChart(patient, promType) {
        var container = $('longitudinalPromChart');
        if (!container) { return; }
        clear(container);

        if (!patient) { return; }

        var mappedType = promTypeMap(promType);
        var proms = (patient.proms || []).filter(function (p) {
            return p.tipo_prom === mappedType;
        });

        var titleEl = heading(3, mappedType + ' — evolución longitudinal');
        container.appendChild(titleEl);

        if (proms.length === 0) {
            var emptyMsg = pEl('Sin datos de ' + mappedType + ' para este paciente en el dataset demo.', 'longitudinal-empty');
            container.appendChild(emptyMsg);
            return;
        }

        proms.sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });

        var maxVal = promMax(mappedType);
        if (maxVal <= 0) { maxVal = 100; }

        for (var i = 0; i < proms.length; i++) {
            var prom = proms[i];
            var row = divEl('longitudinal-bar-row');

            var info = divEl('longitudinal-bar-info');
            info.appendChild(span(prom.fecha || '—', 'longitudinal-bar-date'));
            info.appendChild(span((prom.valor || '—') + ' (' + mappedType + ')', 'longitudinal-bar-value'));
            info.appendChild(span('Fuente: ' + (prom.fuente || '—'), 'longitudinal-bar-source'));
            row.appendChild(info);

            var barWrapper = divEl('longitudinal-bar-wrapper');
            var bar = divEl('longitudinal-bar');
            var numericVal = parseFloat(prom.valor);
            if (!isNaN(numericVal)) {
                var pct = Math.min(100, (numericVal / maxVal) * 100);
                bar.style.width = pct + '%';
                bar.style.backgroundColor = barColorForScale(mappedType, numericVal);
            } else {
                bar.style.width = '0%';
            }
            bar.setAttribute('aria-label', (prom.valor || '0') + ' de ' + maxVal + ' máximo (' + mappedType + ')');
            barWrapper.appendChild(bar);
            row.appendChild(barWrapper);

            if (prom.interpretacion) {
                var interp = divEl('longitudinal-bar-interpretation');
                interp.appendChild(span(prom.interpretacion, 'longitudinal-bar-interp-text'));
                row.appendChild(interp);
            }

            container.appendChild(row);
        }
    }

    function renderClinicalChart(patient, clinicalType) {
        var container = $('longitudinalClinicalChart');
        if (!container) { return; }
        clear(container);

        if (!patient) { return; }

        var mappedType = clinicalTypeMap(clinicalType);
        var items = (patient.actividad_clinica || []).filter(function (a) {
            return a.tipo_indice === mappedType;
        });

        var titleEl = heading(3, mappedType + ' — evolución longitudinal');
        container.appendChild(titleEl);

        if (items.length === 0) {
            var emptyMsg = pEl('Sin datos de ' + mappedType + ' para este paciente en el dataset demo.', 'longitudinal-empty');
            container.appendChild(emptyMsg);
            return;
        }

        items.sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });

        var maxVal = clinicalMax(mappedType);
        if (maxVal <= 0) { maxVal = 100; }

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var row = divEl('longitudinal-bar-row');

            var info = divEl('longitudinal-bar-info');
            info.appendChild(span(item.fecha || '—', 'longitudinal-bar-date'));
            info.appendChild(span((item.valor || '—') + ' (' + mappedType + ')', 'longitudinal-bar-value'));
            info.appendChild(span('Fuente: ' + (item.fuente || item.servicio_origen || '—'), 'longitudinal-bar-source'));
            row.appendChild(info);

            var barWrapper = divEl('longitudinal-bar-wrapper');
            var bar = divEl('longitudinal-bar');
            var numericVal = parseFloat(item.valor);
            if (!isNaN(numericVal)) {
                var pct = Math.min(100, (numericVal / maxVal) * 100);
                bar.style.width = pct + '%';
                bar.style.backgroundColor = barColorForScale(mappedType, numericVal);
            } else {
                bar.style.width = '0%';
            }
            bar.setAttribute('aria-label', (item.valor || '0') + ' de ' + maxVal + ' máximo (' + mappedType + ')');
            barWrapper.appendChild(bar);
            row.appendChild(barWrapper);

            if (item.interpretacion) {
                var interp = divEl('longitudinal-bar-interpretation');
                interp.appendChild(span(item.interpretacion, 'longitudinal-bar-interp-text'));
                row.appendChild(interp);
            }

            container.appendChild(row);
        }
    }

    function renderLegend() {
        var container = $('longitudinalLegend');
        if (!container) { return; }
        clear(container);

        var legendItems = [
            { color: '#3498db', label: 'Tratamiento: banda azul = activo, rojo = suspendido' },
            { color: '#27ae60', label: 'PROM / Actividad clínica: colores por umbrales demo de cada escala (verde=bajo, naranja=medio, rojo=alto), no magnitud bruta' },
            { color: '#e6a817', label: 'Evento adverso: marcador amarillo = leve, naranja = moderado, rojo = grave' }
        ];

        var titleEl = heading(3, 'Leyenda del dashboard longitudinal');
        container.appendChild(titleEl);

        for (var i = 0; i < legendItems.length; i++) {
            var li = legendItems[i];
            var row = divEl('longitudinal-legend-item');

            var swatch = divEl('longitudinal-legend-swatch');
            swatch.style.backgroundColor = li.color;
            swatch.style.display = 'inline-block';
            swatch.style.width = '16px';
            swatch.style.height = '16px';
            swatch.style.marginRight = '8px';
            swatch.style.borderRadius = '3px';
            swatch.setAttribute('aria-hidden', 'true');
            row.appendChild(swatch);

            var label = span(li.label, 'longitudinal-legend-label');
            row.appendChild(label);

            container.appendChild(row);
        }

        var note = pEl('Dashboard exploratorio v0.3 — datos sintéticos — sin validez clínica.', 'longitudinal-legend-note');
        container.appendChild(note);
    }

    function renderAll(patient) {
        if (!patient) { return; }
        renderPatientSummary(patient);
        renderTreatmentTimeline(patient);
        renderAdverseEvents(patient);

        var promSel = $('longitudinalPromSelect');
        var clinicalSel = $('longitudinalClinicalSelect');

        var promType = promSel ? promSel.value : 'dlqi';
        var clinicalType = clinicalSel ? clinicalSel.value : 'ihs4';

        renderPromChart(patient, promType);
        renderClinicalChart(patient, clinicalType);
        renderLegend();
    }

    function onPatientChange() {
        var sel = $('longitudinalPatientSelect');
        if (!sel) { return; }
        var cip = sel.value;
        if (!cip) { return; }
        currentCip = cip;
        var patient = getPatient(cip);
        if (patient) { renderAll(patient); }
    }

    function onPromChange() {
        var sel = $('longitudinalPromSelect');
        if (!sel || !currentCip) { return; }
        var patient = getPatient(currentCip);
        if (patient) { renderPromChart(patient, sel.value); }
    }

    function onClinicalChange() {
        var sel = $('longitudinalClinicalSelect');
        if (!sel || !currentCip) { return; }
        var patient = getPatient(currentCip);
        if (patient) { renderClinicalChart(patient, sel.value); }
    }

    function init() {
        var patientSel = $('longitudinalPatientSelect');
        var promSel = $('longitudinalPromSelect');
        var clinicalSel = $('longitudinalClinicalSelect');

        if (patientSel) { patientSel.addEventListener('change', onPatientChange); }
        if (promSel) { promSel.addEventListener('change', onPromChange); }
        if (clinicalSel) { clinicalSel.addEventListener('change', onClinicalChange); }

        fetchDataset(function (success) {
            if (!success) { return; }
            populatePatientSelect();

            if (dataset && dataset.pacientes && dataset.pacientes.length > 0) {
                var firstCip = dataset.pacientes[0].cip;
                if (patientSel) { patientSel.value = firstCip; }
                currentCip = firstCip;

                var patient = getPatient(firstCip);
                if (patient) { renderAll(patient); }
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
