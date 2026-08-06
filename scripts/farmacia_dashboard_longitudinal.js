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

    function parseDate(str) {
        if (!str) return null;
        var parts = str.split('-');
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
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

    function buildReverseMap(map) {
        var reversed = {};
        var keys = Object.keys(map);
        for (var i = 0; i < keys.length; i++) {
            reversed[map[keys[i]]] = keys[i];
        }
        return reversed;
    }

    var PROM_REVERSE = buildReverseMap(PROM_MAP);
    var CLINICAL_REVERSE = buildReverseMap(CLINICAL_MAP);

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

    function getSeverityInfo(type, numericVal) {
        var n = numericVal;
        if (isNaN(n) || n === null || n === undefined) {
            return { label: 'Sin datos', cssClass: 'threshold-no-data' };
        }
        switch (type) {
            case 'DLQI':
                if (n <= 1)  return { label: 'Sin efecto \u2014 demo (0-1)', cssClass: 'threshold-low' };
                if (n <= 5)  return { label: 'Efecto peque\u00f1o \u2014 demo (2-5)', cssClass: 'threshold-low' };
                if (n <= 10) return { label: 'Efecto moderado \u2014 demo (6-10)', cssClass: 'threshold-moderate' };
                if (n <= 20) return { label: 'Efecto muy importante \u2014 demo (11-20)', cssClass: 'threshold-high' };
                return { label: 'Efecto extremadamente importante \u2014 demo (21-30)', cssClass: 'threshold-severe' };
            case 'EVA dolor':
                if (n <= 3)  return { label: 'Bajo \u2014 demo (0-3)', cssClass: 'threshold-low' };
                if (n <= 6)  return { label: 'Moderado \u2014 demo (4-6)', cssClass: 'threshold-moderate' };
                return { label: 'Alto \u2014 demo (7-10)', cssClass: 'threshold-high' };
            case 'EVA prurito':
                if (n <= 3)  return { label: 'Bajo \u2014 demo (0-3)', cssClass: 'threshold-low' };
                if (n <= 6)  return { label: 'Moderado \u2014 demo (4-6)', cssClass: 'threshold-moderate' };
                return { label: 'Alto \u2014 demo (7-10)', cssClass: 'threshold-high' };
            case 'IHS4':
                if (n <= 3)  return { label: 'Leve \u2014 demo (0-3)', cssClass: 'threshold-low' };
                if (n <= 10) return { label: 'Moderado \u2014 demo (4-10)', cssClass: 'threshold-moderate' };
                return { label: 'Severo \u2014 demo (>=11)', cssClass: 'threshold-high' };
            case 'Hurley':
                if (n <= 1.5) return { label: 'Estadio I \u2014 demo (categ\u00f3rico)', cssClass: 'hurley-i' };
                if (n <= 2.5) return { label: 'Estadio II \u2014 demo (categ\u00f3rico)', cssClass: 'hurley-ii' };
                return { label: 'Estadio III \u2014 demo (categ\u00f3rico)', cssClass: 'hurley-iii' };
            case 'DAS28':
                if (n < 2.6)  return { label: 'Remisi\u00f3n \u2014 demo (<2.6)', cssClass: 'threshold-low' };
                if (n <= 3.2) return { label: 'Baja \u2014 demo (2.6-3.2)', cssClass: 'threshold-moderate' };
                if (n <= 5.1) return { label: 'Moderada \u2014 demo (>3.2-5.1)', cssClass: 'threshold-high' };
                return { label: 'Alta \u2014 demo (>5.1)', cssClass: 'threshold-high' };
            case 'HAQ':
                if (n <= 0.5) return { label: 'Bajo \u2014 demo (0-0.5)', cssClass: 'threshold-low' };
                if (n <= 1.5) return { label: 'Moderado \u2014 demo (>0.5-1.5)', cssClass: 'threshold-moderate' };
                return { label: 'Alto \u2014 demo (>1.5)', cssClass: 'threshold-high' };
            default:
                if (n <= 25)  return { label: 'Bajo \u2014 demo', cssClass: 'threshold-low' };
                if (n <= 50)  return { label: 'Medio \u2014 demo', cssClass: 'threshold-moderate' };
                return { label: 'Alto \u2014 demo', cssClass: 'threshold-high' };
        }
    }

    function barColorForScale(type, numericVal) {
        return getSeverityInfo(type, numericVal).cssClass;
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

    function rawLongitudinalPatient(patient) {
        return {
            cip: patient.cip,
            nombre_demo: patient.nombre || patient.cip,
            servicios_origen: patient.servicio ? [patient.servicio] : [],
            patologias: patient.patologia ? [patient.patologia] : [],
            tratamientos: (patient.biologicos || []).map(function (line) {
                var treatment = {
                    id: line.tratamiento_id_principal || line.linea_id,
                    linea_id: line.linea_id,
                    principio_activo: line.principio_activo || line.nombre_linea || '',
                    nombre_comercial: line.nombre_comercial || '',
                    pauta: line.pauta || '',
                    via: line.via || '',
                    fecha_inicio: line.fecha_inicio || '',
                    fecha_fin: line.fecha_fin || ''
                };
                if (line.active_at_event === true || line.active_at_event === false) treatment.activo = line.active_at_event;
                return treatment;
            }),
            visitas_fh: patient.visitas_fh || [],
            proms: [],
            actividad_clinica: [],
            eventos_adversos: patient.eventos_adversos || [],
            comorbilidades_relevantes: []
        };
    }

    function fetchDataset(callback) {
        var statusEl = $('longitudinalDataStatus');
        fetch('data/demo/farmacia/farmacia_longitudinal_demo_v0_3.json')
            .then(function (response) {
                if (!response.ok) { throw new Error('Failed to fetch dataset'); }
                return response.json();
            })
            .then(function (data) {
                var normalize = window.FarmaciaLongitudinal.normalizePatient;
                var context = window.FarmaciaDemo && window.FarmaciaDemo.getQueryContext
                    ? window.FarmaciaDemo.getQueryContext() : {};
                if (context.patient && context.patient.__farmaciaRawPatient) {
                    data.pacientes = [normalize(rawLongitudinalPatient(context.patient))];
                } else {
                    data.pacientes = (data.pacientes || []).map(function (patient) { return normalize(patient); });
                }
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
        var events = patient.eventos_adversos || [];
        var fhVisits = patient.visitas_fh || [];

        var hasAnyData = treatments.length > 0 || changes.length > 0 || events.length > 0 || fhVisits.length > 0;
        if (!hasAnyData) {
            var emptyMsg = pEl('Sin tratamientos registrados en el dataset demo.', 'longitudinal-empty');
            container.appendChild(emptyMsg);
            return;
        }

        for (var vi = 0; vi < fhVisits.length; vi++) {
            var visit = fhVisits[vi];
            var lineParts = (visit.lineas || []).map(function (line) {
                var parts = [line.line_id || 'Línea sin ID'];
                if (line.tratamiento !== undefined && line.tratamiento !== null && line.tratamiento !== '') parts.push('Tratamiento: ' + String(line.tratamiento));
                var lineState = line.estado_linea !== undefined && line.estado_linea !== null && line.estado_linea !== '' ? line.estado_linea : line.estado;
                if (lineState !== undefined && lineState !== null && lineState !== '') parts.push('Estado: ' + String(lineState));
                if (line.evaluated === true) parts.push('Evaluada');
                else if (line.evaluated === false) parts.push('No evaluada');
                if (line.dispensed === true) parts.push('Dispensada');
                else if (line.dispensed === false) parts.push('No dispensada');
                return parts.join(' · ');
            });
            var visitField = buildInfoField('Visita FH' + (visit.visit_id ? ' · ' + visit.visit_id : ''), (visit.fecha || 'Fecha no registrada') + ' — ' + lineParts.join(' | '));
            container.appendChild(visitField);
        }

        var allDates = [];
        for (var i = 0; i < treatments.length; i++) {
            var td = parseDate(treatments[i].fecha_inicio);
            if (td) { allDates.push(td); }
            var te = parseDate(treatments[i].fecha_fin);
            if (te) { allDates.push(te); }
        }
        for (var j = 0; j < changes.length; j++) {
            var cd = parseDate(changes[j].fecha);
            if (cd) { allDates.push(cd); }
        }
        for (var k = 0; k < events.length; k++) {
            var ed = parseDate(events[k].fecha);
            if (ed) { allDates.push(ed); }
        }

        if (allDates.length === 0) {
            var noDateMsg = pEl('Sin fechas validas en el dataset demo.', 'longitudinal-empty');
            container.appendChild(noDateMsg);
            return;
        }

        allDates.sort(function (a, b) { return a - b; });
        var minDate = allDates[0];
        var maxDate = allDates[allDates.length - 1];

        var totalMs = maxDate.getTime() - minDate.getTime();
        var totalDays = totalMs / (1000 * 60 * 60 * 24);
        if (totalDays <= 0) { totalDays = 1; }

        function pct(d) {
            var days = (d.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
            return Math.max(0, Math.min(100, (days / totalDays) * 100));
        }

        function fmtDate(d) {
            var y = d.getFullYear();
            var m = d.getMonth() + 1;
            var day = d.getDate();
            return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
        }

        var track = divEl('longitudinal-treatment-track');

        var axis = divEl('longitudinal-treatment-track__axis');
        var axisStart = span(fmtDate(minDate), 'longitudinal-treatment-track__axis-label longitudinal-treatment-track__axis-label--start');
        var axisEnd = span(fmtDate(maxDate), 'longitudinal-treatment-track__axis-label longitudinal-treatment-track__axis-label--end');
        axis.appendChild(axisStart);
        axis.appendChild(axisEnd);
        track.appendChild(axis);

        for (var bi = 0; bi < treatments.length; bi++) {
            var t = treatments[bi];
            var activityKnown = Object.prototype.hasOwnProperty.call(t, 'activo');
            var startDate = parseDate(t.fecha_inicio);
            if (!startDate) { continue; }

            var endDate;
            if (t.fecha_fin) {
                endDate = parseDate(t.fecha_fin);
            } else if (t.activo) {
                endDate = maxDate;
            } else {
                endDate = startDate;
            }
            if (!endDate) { endDate = startDate; }

            var bandRow = divEl('longitudinal-treatment-band-row');

            var statusClass = activityKnown ? 'longitudinal-treatment-band--previous' : 'longitudinal-treatment-band--unknown';
            if (t.activo && !t.fecha_fin) {
                statusClass = 'longitudinal-treatment-band--active';
            } else if (!t.activo && t.motivo_suspension) {
                statusClass = 'longitudinal-treatment-band--suspended';
            }

            var bandClasses = 'longitudinal-treatment-band ' + statusClass;
            if (t.motivo_cambio) {
                bandClasses += ' longitudinal-treatment-band--optimized';
            }

            var band = divEl(bandClasses);

            var leftPct = pct(startDate);
            var widthPct = pct(endDate) - leftPct;
            if (widthPct < 0.5) { widthPct = 0.5; }

            band.style.left = leftPct + '%';
            band.style.width = widthPct + '%';

            var label = divEl('longitudinal-treatment-band__label');
            label.textContent = t.nombre_comercial || t.principio_activo || 'Sin nombre';
            band.appendChild(label);

            var meta = divEl('longitudinal-treatment-band__meta');
            if (t.presentacion_dosis) {
                meta.appendChild(span(t.presentacion_dosis, 'longitudinal-treatment-band__dose'));
            }
            if (t.pauta) {
                meta.appendChild(span(t.pauta, 'longitudinal-treatment-band__pauta'));
            }
            if (t.via) {
                meta.appendChild(span(t.via, 'longitudinal-treatment-band__via'));
            }
            if (t.principio_activo) {
                meta.appendChild(span(t.principio_activo, 'longitudinal-treatment-band__principle'));
            }
            band.appendChild(meta);

            var dates = divEl('longitudinal-treatment-band__dates');
            dates.appendChild(span('Inicio: ' + (t.fecha_inicio || '—'), 'longitudinal-treatment-band__date'));
            var endLabel = t.fecha_fin ? t.fecha_fin : (t.activo === true ? 'Activo' : (activityKnown ? 'No activo' : 'No registrado'));
            dates.appendChild(span('Fin: ' + endLabel, 'longitudinal-treatment-band__date'));
            band.appendChild(dates);

            var statusLabels = {
                'longitudinal-treatment-band--active': 'Activo',
                'longitudinal-treatment-band--suspended': 'Suspendido',
                'longitudinal-treatment-band--previous': 'Previo',
                'longitudinal-treatment-band--unknown': 'No registrado'
            };
            var statusText = statusLabels[statusClass] || 'No registrado';
            var badgeClassSuffix = statusClass === 'longitudinal-treatment-band--active' ? 'active' :
                (statusClass === 'longitudinal-treatment-band--suspended' ? 'suspended'
                    : (statusClass === 'longitudinal-treatment-band--unknown' ? 'unknown' : 'previous'));
            var badge = span(statusText, 'longitudinal-treatment-band__status longitudinal-treatment-band__status--' + badgeClassSuffix);
            band.appendChild(badge);

            var tooltipParts = [];
            if (t.motivo_inicio) { tooltipParts.push('Motivo inicio: ' + t.motivo_inicio); }
            if (t.motivo_suspension) { tooltipParts.push('Suspension: ' + t.motivo_suspension); }
            if (t.motivo_cambio) { tooltipParts.push('Cambio: ' + t.motivo_cambio); }
            if (t.estado_validacion_farmacia) { tooltipParts.push('Validacion: ' + t.estado_validacion_farmacia); }
            if (tooltipParts.length > 0) {
                band.setAttribute('title', tooltipParts.join(' | '));
            }

            bandRow.appendChild(band);
            track.appendChild(bandRow);
        }

        if (changes.length > 0 || events.length > 0) {
            var markerRow = divEl('longitudinal-treatment-track__markers');

            for (var ci = 0; ci < changes.length; ci++) {
                var c = changes[ci];
                var cdDate = parseDate(c.fecha);
                if (!cdDate) { continue; }

                var marker = divEl('longitudinal-timeline-change-marker');
                marker.style.left = pct(cdDate) + '%';

                var cTooltip = 'Cambio de pauta — ' + (c.fecha || '') + '\nTipo: ' + (c.tipo || '—') + '\nMotivo: ' + (c.motivo || '—');
                if (c.descripcion) { cTooltip += '\n' + c.descripcion; }
                if (c.estado_validacion_farmacia) { cTooltip += '\nValidacion: ' + c.estado_validacion_farmacia; }
                marker.setAttribute('title', cTooltip);

                markerRow.appendChild(marker);
            }

            for (var ei = 0; ei < events.length; ei++) {
                var ev = events[ei];
                var edDate = parseDate(ev.fecha);
                if (!edDate) { continue; }

                var grav = ev.gravedad || '';
                var gravClass = 'event-high';
                if (grav === 'leve') { gravClass = 'event-low'; }
                else if (grav === 'moderado' || grav === 'moderada') { gravClass = 'event-moderate'; }
                else if (grav === 'grave') { gravClass = 'event-high'; }
                else if (grav === 'serio') { gravClass = 'event-serious'; }

                var aeMarker = divEl('longitudinal-timeline-ae-marker ' + gravClass);
                aeMarker.style.left = pct(edDate) + '%';

                var aeTooltip = 'EA: ' + (ev.tipo || '—') + ' (' + (ev.fecha || '') + ')\nGravedad: ' + (ev.gravedad || '—') + '\nRelacion: ' + (ev.relacion_tratamiento || '—') + '\nAccion: ' + (ev.accion_tomada || '—');
                if (ev.descripcion_corta) { aeTooltip += '\n' + ev.descripcion_corta; }
                aeMarker.setAttribute('title', aeTooltip);

                markerRow.appendChild(aeMarker);
            }

            track.appendChild(markerRow);
        }

        container.appendChild(track);
    }

    function adSeverityClass(grav) {
        if (grav === 'leve') { return 'event-low'; }
        if (grav === 'moderado' || grav === 'moderada') { return 'event-moderate'; }
        if (grav === 'grave') { return 'event-high'; }
        if (grav === 'serio') { return 'event-serious'; }
        return 'event-high';
    }

    function adSeverityLabel(grav) {
        if (grav === 'leve') { return 'Leve'; }
        if (grav === 'moderado' || grav === 'moderada') { return 'Moderado'; }
        if (grav === 'grave') { return 'Grave'; }
        if (grav === 'serio') { return 'Serio'; }
        return grav || 'No especificada';
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
            var grav = ev.gravedad || '';
            var gravClass = adSeverityClass(grav);
            var gravLabel = adSeverityLabel(grav);
            var severitySuffix = gravClass.replace('event-', '');

            var card = divEl('longitudinal-ae-card longitudinal-ae-card--' + severitySuffix);

            var header = divEl('longitudinal-ae-header');

            var aeIcon = icon('fa-exclamation-triangle');
            aeIcon.className = 'fas fa-exclamation-triangle longitudinal-ae-icon ' + gravClass;
            header.appendChild(aeIcon);

            var titleText = ev.tipo || 'Evento adverso';
            header.appendChild(span(titleText, 'longitudinal-ae-title'));

            var gravBadge = span(gravLabel, 'longitudinal-ae-badge longitudinal-ae-badge--' + severitySuffix);
            header.appendChild(gravBadge);

            card.appendChild(header);

            var details = divEl('longitudinal-ae-details');
            details.appendChild(span('Fecha: ' + (ev.fecha || '—'), 'longitudinal-ae-detail'));
            details.appendChild(span('Tipo: ' + (ev.tipo || '—'), 'longitudinal-ae-detail'));
            details.appendChild(span('Relación con tratamiento: ' + (ev.relacion_tratamiento || '—'), 'longitudinal-ae-detail'));
            details.appendChild(span('Acción tomada: ' + (ev.accion_tomada || '—'), 'longitudinal-ae-detail'));
            details.appendChild(span('Resuelto: ' + (ev.resuelto ? 'Sí' : 'No'), 'longitudinal-ae-detail'));
            card.appendChild(details);

            var tooltipParts = [];
            if (ev.fecha) { tooltipParts.push('Fecha: ' + ev.fecha); }
            if (ev.tipo) { tooltipParts.push('Tipo: ' + ev.tipo); }
            tooltipParts.push('Gravedad: ' + gravLabel);
            if (ev.relacion_tratamiento) { tooltipParts.push('Relación: ' + ev.relacion_tratamiento); }
            if (ev.accion_tomada) { tooltipParts.push('Acción: ' + ev.accion_tomada); }
            tooltipParts.push('Resuelto: ' + (ev.resuelto ? 'Sí' : 'No'));
            if (ev.descripcion_corta) { tooltipParts.push(ev.descripcion_corta); }
            card.setAttribute('title', tooltipParts.join('\n'));

            if (ev.descripcion_corta) {
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

        if (!promType) {
            var noDimMsg = pEl('Sin datos disponibles para esta dimensi\u00f3n en el paciente seleccionado.', 'longitudinal-empty');
            container.appendChild(noDimMsg);
            return;
        }

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
            var displayedValue = prom.valor !== undefined && prom.valor !== null && prom.valor !== '' ? prom.valor : '—';
            var row = divEl('longitudinal-bar-row');

            var info = divEl('longitudinal-bar-info');
            info.appendChild(span(prom.fecha || '—', 'longitudinal-bar-date'));
            info.appendChild(span(displayedValue + ' (' + mappedType + ')', 'longitudinal-bar-value'));
            info.appendChild(span('Fuente: ' + (prom.fuente || '—'), 'longitudinal-bar-source'));
            row.appendChild(info);

            var barWrapper = divEl('longitudinal-bar-wrapper');
            var bar = divEl('longitudinal-bar');
            var numericVal = parseFloat(prom.valor);
            var sevInfo = getSeverityInfo(mappedType, numericVal);
            bar.className = 'longitudinal-bar ' + sevInfo.cssClass;
            if (!isNaN(numericVal)) {
                var pct = Math.min(100, (numericVal / maxVal) * 100);
                bar.style.width = pct + '%';
            } else {
                bar.style.width = '0%';
            }
            bar.setAttribute('aria-label', displayedValue + ' de ' + maxVal + ' m\u00e1ximo (' + mappedType + ')');
            barWrapper.appendChild(bar);
            row.appendChild(barWrapper);

            var sevDiv = divEl('longitudinal-bar-severity');
            sevDiv.appendChild(span(sevInfo.label, 'longitudinal-bar-severity-text'));
            row.appendChild(sevDiv);

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

        if (!clinicalType) {
            var noDimMsg = pEl('Sin datos disponibles para esta dimensi\u00f3n en el paciente seleccionado.', 'longitudinal-empty');
            container.appendChild(noDimMsg);
            return;
        }

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
            var sevInfo = getSeverityInfo(mappedType, numericVal);
            bar.className = 'longitudinal-bar ' + sevInfo.cssClass;
            if (!isNaN(numericVal)) {
                var pct = Math.min(100, (numericVal / maxVal) * 100);
                bar.style.width = pct + '%';
            } else {
                bar.style.width = '0%';
            }
            bar.setAttribute('aria-label', (item.valor || '0') + ' de ' + maxVal + ' m\u00e1ximo (' + mappedType + ')');
            barWrapper.appendChild(bar);
            row.appendChild(barWrapper);

            var sevDiv = divEl('longitudinal-bar-severity');
            sevDiv.appendChild(span(sevInfo.label, 'longitudinal-bar-severity-text'));
            row.appendChild(sevDiv);

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

        var panel = divEl('longitudinal-legend-panel');

        var titleEl = el('h3');
        titleEl.className = 'longitudinal-legend-title';
        var titleIcon = icon('fa-layer-group');
        titleIcon.className = 'fas fa-layer-group longitudinal-legend-title__icon';
        titleEl.appendChild(titleIcon);
        titleEl.appendChild(txt(' Umbrales demo por escala'));
        panel.appendChild(titleEl);

        var body = divEl('longitudinal-legend-body');

        var thresholds = [
            'DLQI: 0-1 sin efecto \u00b7 2-5 efecto peque\u00f1o \u00b7 6-10 efecto moderado \u00b7 11-20 efecto muy importante \u00b7 21-30 efecto extremadamente importante',
            'EVA dolor: 0-3 bajo \u00b7 4-6 moderado \u00b7 7-10 alto',
            'EVA prurito: 0-3 bajo \u00b7 4-6 moderado \u00b7 7-10 alto',
            'IHS4: 0-3 leve \u00b7 4-10 moderado \u00b7 \u226511 severo',
            'Hurley: estadio I / II / III (categ\u00f3rico, no escala continua de severidad)',
            'DAS28: <2.6 remisi\u00f3n \u00b7 2.6-3.2 baja \u00b7 >3.2-5.1 moderada \u00b7 >5.1 alta',
            'HAQ: 0-0.5 bajo \u00b7 >0.5-1.5 moderado \u00b7 >1.5 alto'
        ];

        for (var i = 0; i < thresholds.length; i++) {
            var item = divEl('longitudinal-legend-threshold longitudinal-legend-row');
            var str = thresholds[i];
            var colonIdx = str.indexOf(':');
            if (colonIdx > -1) {
                item.appendChild(span(str.substring(0, colonIdx + 1), 'longitudinal-legend-scale'));
                item.appendChild(span(str.substring(colonIdx + 1), 'longitudinal-legend-ranges'));
            } else {
                item.textContent = str;
            }
            body.appendChild(item);
        }

        panel.appendChild(body);

        var note = pEl('Demo exploratorio v0.3 \u2014 datos sint\u00e9ticos \u2014 sin validez cl\u00ednica.', 'longitudinal-legend-note');
        panel.appendChild(note);

        container.appendChild(panel);
    }

    function populatePromSelect(patient) {
        var sel = $('longitudinalPromSelect');
        if (!sel || !patient) { return; }
        var previousValue = sel.value;
        clear(sel);

        var promTypes = {};
        var proms = patient.proms || [];
        for (var i = 0; i < proms.length; i++) {
            if (proms[i].tipo_prom) {
                promTypes[proms[i].tipo_prom] = true;
            }
        }
        var uniqueTypes = Object.keys(promTypes).sort();

        if (uniqueTypes.length === 0) {
            var opt = el('option');
            opt.value = '';
            opt.disabled = true;
            opt.textContent = 'Sin datos disponibles para esta dimensi\u00f3n en el paciente seleccionado.';
            sel.appendChild(opt);
        } else {
            for (var j = 0; j < uniqueTypes.length; j++) {
                var displayName = uniqueTypes[j];
                var selectValue = PROM_REVERSE[displayName] || displayName.toLowerCase().replace(/ /g, '_');
                var opt = el('option');
                opt.value = selectValue;
                opt.textContent = displayName;
                sel.appendChild(opt);
            }
            var found = false;
            if (previousValue && previousValue !== '') {
                for (var k = 0; k < sel.options.length; k++) {
                    if (sel.options[k].value === previousValue) {
                        found = true;
                        break;
                    }
                }
            }
            sel.value = found ? previousValue : sel.options[0].value;
        }
    }

    function populateClinicalSelect(patient) {
        var sel = $('longitudinalClinicalSelect');
        if (!sel || !patient) { return; }
        var previousValue = sel.value;
        clear(sel);

        var clinicalTypes = {};
        var items = patient.actividad_clinica || [];
        for (var i = 0; i < items.length; i++) {
            if (items[i].tipo_indice) {
                clinicalTypes[items[i].tipo_indice] = true;
            }
        }
        var uniqueTypes = Object.keys(clinicalTypes).sort();

        if (uniqueTypes.length === 0) {
            var opt = el('option');
            opt.value = '';
            opt.disabled = true;
            opt.textContent = 'Sin datos disponibles para esta dimensi\u00f3n en el paciente seleccionado.';
            sel.appendChild(opt);
        } else {
            for (var j = 0; j < uniqueTypes.length; j++) {
                var displayName = uniqueTypes[j];
                var selectValue = CLINICAL_REVERSE[displayName] || displayName.toLowerCase().replace(/ /g, '_');
                var opt = el('option');
                opt.value = selectValue;
                opt.textContent = displayName;
                sel.appendChild(opt);
            }
            var found = false;
            if (previousValue && previousValue !== '') {
                for (var k = 0; k < sel.options.length; k++) {
                    if (sel.options[k].value === previousValue) {
                        found = true;
                        break;
                    }
                }
            }
            sel.value = found ? previousValue : sel.options[0].value;
        }
    }

    function renderAll(patient) {
        if (!patient) { return; }
        populatePromSelect(patient);
        populateClinicalSelect(patient);
        renderPatientSummary(patient);
        renderTreatmentTimeline(patient);
        renderAdverseEvents(patient);

        var promSel = $('longitudinalPromSelect');
        var clinicalSel = $('longitudinalClinicalSelect');

        var promType = promSel ? promSel.value : '';
        var clinicalType = clinicalSel ? clinicalSel.value : '';

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

            // Leer CIP de query param para preseleccionar
            var urlParams = new URLSearchParams(window.location.search);
            var cipParam = urlParams.get("cip");
            var initialCip = cipParam || (dataset && dataset.pacientes && dataset.pacientes.length > 0 ? dataset.pacientes[0].cip : null);

            if (initialCip && patientSel) {
                patientSel.value = initialCip;
                currentCip = initialCip;
                var patient = getPatient(initialCip);
                if (patient) { renderAll(patient); }
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
