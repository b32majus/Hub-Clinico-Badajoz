'use strict';

(function () {
    let F = window.FarmaciaDemo;
    function hasExplicit(value) {
        return value !== undefined && value !== null && value !== '';
    }
    function explicitText(value, fallback) {
        if (!hasExplicit(value) || value === 'not_recorded') return fallback || 'No registrado';
        return String(value);
    }
    function prebiologicText(value) {
        if (!hasExplicit(value) || value === 'not_recorded') return 'No registrado';
        if (value === true || value === 'yes') return 'Sí';
        if (value === false || value === 'no') return 'No';
        if (value === 'pending') return 'Pendiente';
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    // Contrato de forma de `proms` (WO-FH-DASHBOARD-PROMS-SHAPE-P1-01 / F-01-F-04):
    //   ARRAY  -> PROMs estructurados (flujo raw actual). Renderer estructurado intacto.
    //   STRING -> texto legacy literal de la demo; contexto demo únicamente.
    //             No se convierte en objetos PROM ni se extraen DLQI/EVA/HAQ.
    //   null/ausente/desconocido -> fail safe a 'No registrado'.
    function getStructuredProms(patient) {
        if (patient && Array.isArray(patient.proms)) return patient.proms;
        return [];
    }
    function getLegacyPromsText(patient) {
        var proms = patient && patient.proms;
        return (typeof proms === 'string' && String(proms).trim() !== '') ? String(proms) : '';
    }
    function getDashboardSummaryPromsText(patient) {
        var items = getStructuredProms(patient);
        if (items.length > 0) {
            return items.map(function (prom) {
                return prom.tipo_prom + ': ' + explicitText(prom.valor) + (prom.fecha ? ' · ' + prom.fecha : '');
            }).join(' | ');
        }
        var legacy = getLegacyPromsText(patient);
        if (legacy) return 'PROMs demo (contexto): ' + legacy;
        return 'No registrado';
    }
    function renderLegacyPromsText(container, text) {
        F.clearChildren(container);
        if (!text) {
            var emptyEl = document.createElement('div');
            emptyEl.className = 'empty-state';
            emptyEl.textContent = 'No registrado';
            container.appendChild(emptyEl);
            return;
        }
        var note = document.createElement('div');
        note.className = 'empty-state';
        var noteText = document.createTextNode('Contexto demo: ' + text);
        note.appendChild(noteText);
        container.appendChild(note);
    }
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
    function evalCheckStatus(patient, type) {
        var est = patient.analiticaEstruct;
        var txt = (patient.analitica || '').toLowerCase();
        var raw = patient.__farmaciaRawPatient === true;

        function rawStatus(value, okValues, pendingValues) {
            if (!hasExplicit(value) || value === 'not_recorded') return 'missing';
            if (value === true || okValues.indexOf(String(value).toLowerCase()) !== -1) return 'ok';
            if (value === false || pendingValues.indexOf(String(value).toLowerCase()) !== -1) return 'pending';
            return 'review';
        }

        if (type === 'analitica') {
            if (est) {
                var recentStatus = rawStatus(est.reciente, ['yes', 'si', 'sí'], ['no']);
                var hemogramStatus = rawStatus(est.hemograma, [], []);
                var biochemistryStatus = rawStatus(est.bioquimica, [], []);
                if (recentStatus === 'missing' && hemogramStatus === 'missing' && biochemistryStatus === 'missing') return raw ? 'missing' : 'demo';
                if (recentStatus === 'ok' && hemogramStatus === 'ok' && biochemistryStatus === 'ok') return 'ok';
                if (recentStatus === 'pending' || hemogramStatus === 'pending' || biochemistryStatus === 'pending') return 'pending';
                return 'review';
            }
            if (/(?:analítica|analitica).*(?:completa|apto|ok)|prebiológico.*apto/i.test(txt)) return 'ok';
            if (/(?:analítica|analitica).*pendiente/i.test(txt)) return 'pending';
            return raw ? 'missing' : 'demo';
        }

        if (type === 'mantoux') {
            if (est && hasExplicit(est.mantoux)) {
                var m = String(est.mantoux).toLowerCase();
                if (m === 'not_recorded') return 'missing';
                if (/negative|negativo|ok|apto|positive_treated/.test(m)) return 'ok';
                if (/pending|pendiente/.test(m)) return 'pending';
                if (/positive|positivo|revisar/.test(m)) return 'review';
            }
            if (/(?:mantoux|igra|tubercul).*(?:negativo|ok|apto)/i.test(txt)) return 'ok';
            if (/(?:mantoux|igra|tubercul).*pendiente/i.test(txt)) return 'pending';
            return raw ? 'missing' : 'demo';
        }

        if (type === 'serologias') {
            if (est) {
                var sValues = [est.serologias, est.serologiasVhb, est.serologiasVhc, est.serologiasVih].filter(function(v) { return v !== undefined && v !== null && v !== ''; });
                if (sValues.length === 0 || sValues.every(function (value) { return value === 'not_recorded'; })) return raw ? 'missing' : 'demo';
                var anyPending = false;
                var anyReview = false;
                sValues.forEach(function(s) {
                    var sl = s.toLowerCase();
                    if (/pending|pendiente/.test(sl)) anyPending = true;
                    if (/positive|positivo|revisar/.test(sl)) anyReview = true;
                });
                if (anyReview) return 'review';
                if (anyPending) return 'pending';
                return 'ok';
            }
            if (/(?:serolog|vih|vhb|vhc).*(?:negativo|ok|apto)/i.test(txt)) return 'ok';
            if (/(?:serolog|vih|vhb|vhc).*pendiente/i.test(txt)) return 'pending';
            return raw ? 'missing' : 'demo';
        }

        if (type === 'vacunacion') {
            if (est && est.vacunacion !== undefined && est.vacunacion !== null && est.vacunacion !== '') {
                var v = String(est.vacunacion).toLowerCase();
                if (v === 'not_recorded') return 'missing';
                if (v === 'yes' || v === 'si' || /completa|al día|apto/.test(v)) return 'ok';
                if (v === 'no' || /pending|pendiente/.test(v)) return 'pending';
                if (/revisar/.test(v)) return 'review';
            }
            if (/vacuna.*(?:completa|al día|apto)/i.test(txt)) return 'ok';
            if (/vacuna.*pendiente/i.test(txt)) return 'pending';
            return raw ? 'missing' : 'demo';
        }

        return raw ? 'missing' : 'demo';
    }

    function createChecksVisualBlock(patient) {
        var wrapper = document.createElement('div');
        wrapper.className = 'info-field fh-dashboard-checks-wrapper';

        var label = document.createElement('span');
        label.className = 'info-field__label';
        label.textContent = 'Analítica / vacunación';
        wrapper.appendChild(label);

        var row = document.createElement('div');
        row.className = 'fh-dashboard-checks';

        var checks = [
            { type: 'analitica', label: 'Analítica' },
            { type: 'mantoux', label: 'Mantoux/IGRA' },
            { type: 'serologias', label: 'Serologías' },
            { type: 'vacunacion', label: 'Vacunación' }
        ];

        var statusLabels = { ok: 'OK', pending: 'Pendiente', review: 'Revisar', missing: 'No registrado', demo: 'Demo' };
        var iconsByStatus = {
            ok: 'fa-check-circle',
            pending: 'fa-clock',
            review: 'fa-exclamation-circle',
            missing: 'fa-question-circle',
            demo: 'fa-question-circle'
        };

        checks.forEach(function(check) {
            var status = evalCheckStatus(patient, check.type);
            var card = document.createElement('div');
            card.className = 'fh-dashboard-check fh-dashboard-check--' + status;

            var icon = document.createElement('i');
            icon.className = 'fas ' + iconsByStatus[status];
            icon.setAttribute('aria-hidden', 'true');

            var nameEl = document.createElement('span');
            nameEl.className = 'fh-dashboard-check__name';
            nameEl.textContent = check.label;

            var statusEl = document.createElement('span');
            statusEl.className = 'fh-dashboard-check__status';
            statusEl.textContent = statusLabels[status];

            card.append(icon, nameEl, statusEl);
            row.appendChild(card);
        });

        wrapper.appendChild(row);
        if (patient.__farmaciaRawPatient && patient.analiticaEstruct) {
            var meta = document.createElement('div');
            meta.className = 'fh-dashboard-checks__meta';
            var details = [];
            if (hasExplicit(patient.analiticaEstruct.fecha)) details.push('Fecha: ' + patient.analiticaEstruct.fecha);
            if (hasExplicit(patient.analiticaEstruct.observaciones)) details.push('Observaciones: ' + patient.analiticaEstruct.observaciones);
            details.push('Infecciones recurrentes: ' + prebiologicText(patient.analiticaEstruct.infeccionesRecurrentes));
            details.push('Riesgo cardiovascular: ' + prebiologicText(patient.analiticaEstruct.riesgoCardiovascular));
            details.push('Alteraciones neurológicas: ' + prebiologicText(patient.analiticaEstruct.alteracionesNeurologicas));
            details.push('Neoplasia: ' + prebiologicText(patient.analiticaEstruct.riesgoNeoplasia));
            details.push('Medicina Preventiva: ' + prebiologicText(patient.analiticaEstruct.medicinaPreventiva));
            details.push('Estado prebiológico: ' + prebiologicText(patient.analiticaEstruct.estadoGlobalPrebiologico));
            details.push('Bloqueos: ' + prebiologicText(patient.analiticaEstruct.bloqueosPrebiologicos));
            meta.textContent = details.length ? details.join(' · ') : 'No registrado';
            wrapper.appendChild(meta);
        }
        return wrapper;
    }

    function renderClinicalActivity(patient) {
        var container = document.getElementById('clinicalActivityContainer');
        if (!container) return;
        F.clearChildren(container);
        var actividad = patient.actividad_clinica || [];
        if (actividad.length === 0) {
            var emptyEl = document.createElement('div');
            emptyEl.className = 'empty-state';
            var emptyIcon = document.createElement('i');
            emptyIcon.className = 'fas fa-info-circle';
            emptyIcon.setAttribute('aria-hidden', 'true');
            emptyEl.appendChild(emptyIcon);
            emptyEl.appendChild(document.createTextNode(patient.__farmaciaRawPatient ? 'No registrado' : 'Sin datos de actividad cl\u00EDnica'));
            container.appendChild(emptyEl);
            return;
        }
        var grouped = {};
        for (var gi = 0; gi < actividad.length; gi++) {
            var a = actividad[gi];
            var ti = a.tipo_indice;
            if (!grouped[ti]) grouped[ti] = [];
            grouped[ti].push(a);
        }
        var grid = document.createElement('div');
        grid.className = 'clinical-activity-grid';
        var tipos = Object.keys(grouped).sort();
        for (var ct = 0; ct < tipos.length; ct++) {
            var tipo = tipos[ct];
            var items = grouped[tipo];
            items.sort(function(a, b) { return a.fecha.localeCompare(b.fecha); });
            var earliest = items[0];
            var latest = items[items.length - 1];
            var tile = document.createElement('div');
            tile.className = 'clinical-activity-tile';
            var caNameEl = document.createElement('div');
            caNameEl.className = 'clinical-activity-tile__name';
            caNameEl.textContent = tipo;
            tile.appendChild(caNameEl);
            var caValueEl = document.createElement('div');
            caValueEl.className = 'clinical-activity-tile__value';
            caValueEl.textContent = latest.valor || '\u2014';
            tile.appendChild(caValueEl);
            if (tipo === 'Hurley') {
                var caNoteEl = document.createElement('div');
                caNoteEl.className = 'clinical-activity-tile__note';
                caNoteEl.textContent = 'Estadio ' + latest.valor + (latest.interpretacion ? ' \u2014 ' + latest.interpretacion : '');
                tile.appendChild(caNoteEl);
            } else {
                var trendEl = document.createElement('div');
                trendEl.className = 'clinical-activity-tile__trend';
                var earliestVal = parseFloat(earliest.valor);
                var latestVal = parseFloat(latest.valor);
                if (!isNaN(earliestVal) && !isNaN(latestVal) && earliest !== latest) {
                    var arrow = latestVal < earliestVal ? '\u2193' : (latestVal > earliestVal ? '\u2191' : '\u2192');
                    trendEl.textContent = earliest.valor + ' ' + arrow + ' ' + latest.valor;
                } else {
                    trendEl.textContent = latest.valor;
                }
                tile.appendChild(trendEl);
                if (latest.interpretacion) {
                    var caInterpEl = document.createElement('div');
                    caInterpEl.className = 'clinical-activity-tile__note';
                    caInterpEl.textContent = latest.interpretacion;
                    tile.appendChild(caInterpEl);
                }
            }
            grid.appendChild(tile);
        }
        container.appendChild(grid);
    }

    function getPatientBiologicLines(patient) {
        if (!patient) return [];
        if (patient.__farmaciaRawPatient && Array.isArray(patient.biologicos)) return patient.biologicos;
        var helper = window.FarmaciaTratamiento;
        if (helper && typeof helper.buildTreatmentFromPatient === 'function') {
            var result = helper.buildTreatmentFromPatient(patient, { returnArray: true, fuente: 'dashboard_adapter' });
            if (Array.isArray(result) && result.length) return result;
        }
        // Fallback legacy (sin helper)
        if (Array.isArray(patient.biologicos) && patient.biologicos.length) return patient.biologicos;
        var treatments = patient.tratamientos || [];
        if (!treatments.length && patient.farmaco) {
            return [{
                linea_id: patient.cip + '-L1',
                orden: 1,
                nombre_linea: patient.principioActivo || patient.farmaco,
                nombre_comercial: patient.farmaco,
                principio_activo: patient.principioActivo || patient.farmaco,
                pauta: patient.pauta || '',
                via: patient.via || '',
                fecha_inicio: patient.primeraVisita || '',
                fecha_fin: '',
                estado_linea: 'activo',
                tipo_relacion: 'sin_cambios',
                es_principal: true
            }];
        }
        return treatments.map(function (t, index) {
            return {
                linea_id: t.linea_id || t.id || (patient.cip + '-L' + (index + 1)),
                orden: index + 1,
                nombre_linea: t.principio_activo || t.nombre_comercial || 'Tratamiento',
                nombre_comercial: t.nombre_comercial || '',
                principio_activo: t.principio_activo || '',
                pauta: t.pauta || '',
                via: t.via || '',
                fecha_inicio: t.fecha_inicio || '',
                fecha_fin: t.fecha_fin || '',
                estado_linea: t.activo ? 'activo' : 'historico',
                tipo_relacion: t.activo ? 'base' : 'historico',
                es_principal: !!t.activo
            };
        });
    }

    function biologicStateLabel(state, raw) {
        var value = String(state || '').toLowerCase().trim();
        if (value === 'active' || value === 'activo') return 'Activo';
        if (value === 'completed' || value === 'finalizado') return 'Finalizado';
        if (value === 'historical' || value === 'historico') return 'Histórico';
        if (value === 'suspended' || value === 'suspendido') return 'Suspendido';
        if (value === 'validated_not_started') return 'Validado, pendiente de inicio';
        if (value === 'unknown' || !value) return 'No registrado';
        if (value === 'anadido' || value === 'añadido') return 'Añadido';
        return raw ? 'No registrado' : 'Sin clasificar';
    }

    function biologicRelationLabel(type, raw) {
        var value = String(type || '').toLowerCase().trim();
        if (value === 'primary' || value === 'principal' || value === 'base') return 'Principal';
        if (value === 'additional' || value === 'adicional') return 'Adicional';
        if (value === 'unknown' || !value) return 'Relación no registrada';
        if (value === 'cambio_terapeutico' || value === 'cambio_farmaco') return 'Switch terapéutico';
        if (value === 'tratamiento_anadido' || value === 'tratamiento_añadido') return 'Add-on terapéutico';
        return raw ? 'Relación no registrada' : 'Seguimiento';
    }

    function renderBiologicLines(patient) {
        var container = document.getElementById('biologicLinesContainer');
        if (!container) return;
        F.clearChildren(container);
        var lines = getPatientBiologicLines(patient);
        if (!lines.length) {
            var emptyEl = document.createElement('div');
            emptyEl.className = 'empty-state';
            emptyEl.textContent = 'Sin lineas biologicas registradas';
            container.appendChild(emptyEl);
            return;
        }
        var grid = document.createElement('div');
        grid.className = 'info-grid';
        lines.sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });
        lines.forEach(function (line) {
            var field = document.createElement('div');
            field.className = 'info-field';
            var label = document.createElement('span');
            label.className = 'info-field__label';
            var labelParts = ['L' + (line.orden || '?')];
            if (line.estado_linea || patient.__farmaciaRawPatient) {
                labelParts.push(patient.__farmaciaRawPatient ? biologicStateLabel(line.estado_linea, true) : biologicStateLabel(line.estado_linea));
            }
            if (line.tipo_relacion || patient.__farmaciaRawPatient) {
                labelParts.push(patient.__farmaciaRawPatient ? biologicRelationLabel(line.tipo_relacion, true) : biologicRelationLabel(line.tipo_relacion));
            }
            label.textContent = labelParts.join(' · ');
            var value = document.createElement('span');
            value.className = 'info-field__value';
            value.textContent = line.nombre_linea || line.farmaco_nombre || line.principio_activo || line.nombre_comercial || 'Biológico';
            var note = document.createElement('div');
            note.className = 'timeline-description';
            var noteParts = [];
            if (line.principio_activo) noteParts.push(line.principio_activo);
            if (line.dosis || line.dosis_texto) noteParts.push(line.dosis || line.dosis_texto);
            if (line.via) noteParts.push(line.via);
            if (line.pauta) noteParts.push(line.pauta);
            if (line.fecha_inicio) noteParts.push('Inicio: ' + line.fecha_inicio);
            if (line.fecha_fin) noteParts.push('Fin: ' + line.fecha_fin);
            note.textContent = noteParts.length ? noteParts.join(' · ') : '—';
            field.appendChild(label);
            field.appendChild(value);
            field.appendChild(note);
            grid.appendChild(field);
        });
        container.appendChild(grid);
    }

    function renderProms(patient) {
        var container = document.getElementById('promsDashboardContainer');
        if (!container) return;
        F.clearChildren(container);
        // Forma legacy (STRING de la demo): contexto demo literal, sin interpretación
        // estructurada ni iteración de caracteres como PROMs.
        if (!patient || !Array.isArray(patient.proms)) {
            renderLegacyPromsText(container, getLegacyPromsText(patient));
            return;
        }
        var proms = patient.proms;
        var grouped = {};
        for (var pi = 0; pi < proms.length; pi++) {
            var pItem = proms[pi];
            var pt = pItem.tipo_prom;
            if (!grouped[pt]) grouped[pt] = [];
            grouped[pt].push(pItem);
        }
        var grid = document.createElement('div');
        grid.className = 'proms-card-grid';
        var expectedTypes = patient.__farmaciaRawPatient ? Object.keys(grouped).sort() : ['DLQI', 'EVA dolor', 'EVA prurito'];
        if (expectedTypes.length === 0) {
            var emptyProms = document.createElement('div');
            emptyProms.className = 'empty-state';
            emptyProms.textContent = 'No registrado';
            container.appendChild(emptyProms);
            return;
        }
        for (var et = 0; et < expectedTypes.length; et++) {
            var tipo = expectedTypes[et];
            var items = grouped[tipo] || [];
            var tile = document.createElement('div');
            tile.className = 'prom-card';
            var pNameEl = document.createElement('div');
            pNameEl.className = 'prom-card__name';
            pNameEl.textContent = tipo;
            tile.appendChild(pNameEl);
            if (items.length > 0) {
                items.sort(function(a, b) { return (a.fecha || '').localeCompare(b.fecha || ''); });
                var latest = items[items.length - 1];
                var pValueEl = document.createElement('div');
                pValueEl.className = 'prom-card__value';
                var unit = patient.__farmaciaRawPatient ? '' : ((tipo === 'DLQI') ? '/30' : '/10');
                var latestValue = latest.valor !== undefined && latest.valor !== null && latest.valor !== '' ? latest.valor : '—';
                pValueEl.textContent = String(latestValue) + (unit ? ' ' + unit : '');
                tile.appendChild(pValueEl);
                var sourceEl = document.createElement('div');
                sourceEl.className = 'prom-card__source';
                var sourceLabel = patient.__farmaciaRawPatient
                    ? (latest.fecha ? 'Fecha: ' + latest.fecha : 'Fecha no registrada')
                    : ((latest.fuente || '').toLowerCase().indexOf('remoto') !== -1 ? 'Paciente remoto' : 'Farmacia');
                sourceEl.textContent = sourceLabel;
                tile.appendChild(sourceEl);
                var statusEl = document.createElement('span');
                statusEl.className = 'prom-card__status prom-card__status--registered';
                statusEl.textContent = '\u00daltimo valor';
                tile.appendChild(statusEl);
            } else {
                var noDataEl = document.createElement('div');
                noDataEl.className = 'prom-card__value';
                noDataEl.textContent = '\u2014';
                tile.appendChild(noDataEl);
                var missingEl = document.createElement('span');
                missingEl.className = 'prom-card__status prom-card__status--missing';
                missingEl.textContent = 'No registrado';
                tile.appendChild(missingEl);
            }
            grid.appendChild(tile);
        }
        var displayed = {};
        for (var dx = 0; dx < expectedTypes.length; dx++) { displayed[expectedTypes[dx]] = true; }
        var otherTypes = Object.keys(grouped).filter(function(k) { return !displayed[k]; }).sort();
        for (var oi = 0; oi < otherTypes.length; oi++) {
            var oTipo = otherTypes[oi];
            var oItems = grouped[oTipo];
            oItems.sort(function(a, b) { return (a.fecha || '').localeCompare(b.fecha || ''); });
            var oLatest = oItems[oItems.length - 1];
            var oTile = document.createElement('div');
            oTile.className = 'prom-card';
            var oNameEl = document.createElement('div');
            oNameEl.className = 'prom-card__name';
            oNameEl.textContent = oTipo;
            oTile.appendChild(oNameEl);
            var oValueEl = document.createElement('div');
            oValueEl.className = 'prom-card__value';
            oValueEl.textContent = oLatest.valor !== undefined && oLatest.valor !== null && oLatest.valor !== '' ? oLatest.valor : '\u2014';
            oTile.appendChild(oValueEl);
            var oSourceEl = document.createElement('div');
            oSourceEl.className = 'prom-card__source';
            var oSourceLabel = (oLatest.fuente || '').toLowerCase().indexOf('remoto') !== -1 ? 'Paciente remoto' : 'Farmacia';
            oSourceEl.textContent = oSourceLabel;
            oTile.appendChild(oSourceEl);
            var oStatusEl = document.createElement('span');
            oStatusEl.className = 'prom-card__status prom-card__status--registered';
            oStatusEl.textContent = '\u00daltimo valor';
            oTile.appendChild(oStatusEl);
            grid.appendChild(oTile);
        }
        container.appendChild(grid);
    }

    function renderTimelines(patient) {
        renderTimelineEpisodios(patient);
        renderTimelineTratamiento(patient);
    }

    function renderTimelineEpisodios(patient) {
        var container = document.getElementById('timelineEpisodiosContainer');
        if (!container) return;
        F.clearChildren(container);
        var episodios = patient.episodios_asistenciales || [];
        var fhVisits = patient.visitas_fh || [];
        if (episodios.length === 0 && fhVisits.length === 0) {
            var emptyEl = document.createElement('div');
            emptyEl.className = 'empty-state';
            var emptyIcon = document.createElement('i');
            emptyIcon.className = 'fas fa-info-circle';
            emptyIcon.setAttribute('aria-hidden', 'true');
            emptyEl.appendChild(emptyIcon);
            emptyEl.appendChild(document.createTextNode('Sin episodios asistenciales registrados'));
            container.appendChild(emptyEl);
            return;
        }
        episodios.sort(function(a, b) { return a.fecha.localeCompare(b.fecha); });
        var timeline = document.createElement('div');
        timeline.className = 'timeline';
        for (var ei = 0; ei < episodios.length; ei++) {
            var ep = episodios[ei];
            var desc = (ep.servicio || '') + (ep.nota ? ' \u2014 ' + ep.nota : '');
            var item = timelineItem(ep.fecha, ep.tipo, desc);
            timeline.appendChild(item);
        }
        fhVisits.forEach(function (visit) {
            var lines = (visit.lineas || []).map(function (line) {
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
            timeline.appendChild(timelineItem(visit.fecha, 'Visita FH' + (visit.visit_id ? ' · ' + visit.visit_id : ''), lines.join(' | ')));
        });
        container.appendChild(timeline);
    }

    function renderTimelineTratamiento(patient) {
        var container = document.getElementById('timelineTratamientoContainer');
        if (!container) return;
        F.clearChildren(container);
        var treatments = patient.tratamientos || [];
        var changes = patient.cambios_pauta || [];
        var milestones = [];
        for (var ti = 0; ti < treatments.length; ti++) {
            var t = treatments[ti];
            var tName = t.nombre_comercial || t.principio_activo || t.nombre_linea || t.farmaco_nombre || 'Tratamiento';
            var isActive = (t.activo === true) || (!t.fecha_fin && t.activo !== false);
            if (t.fecha_inicio) {
                milestones.push({
                    date: t.fecha_inicio,
                    title: tName,
                    description: (t.pauta || '') + (isActive ? ' — Activo' : ''),
                    markerClass: 'timeline-marker--treatment',
                    badgeType: isActive ? 'activo' : 'inicio'
                });
            }
            if (t.fecha_fin) {
                milestones.push({
                    date: t.fecha_fin,
                    title: tName,
                    description: (t.motivo_suspension ? 'Motivo: ' + t.motivo_suspension : 'Suspensión') + ' — Histórico',
                    markerClass: 'timeline-marker--treatment',
                    badgeType: 'fin'
                });
            }
        }
        for (var cj = 0; cj < changes.length; cj++) {
            var c = changes[cj];
            var markerClass = 'timeline-marker--change';
            var badgeType = 'cambio';
            if (c.tipo === 'cambio_farmaco') {
                markerClass = 'timeline-marker--switch';
                badgeType = 'switch';
            } else if (c.tipo === 'tratamiento_anadido' || c.tipo === 'tratamiento_añadido') {
                markerClass = 'timeline-marker--change';
                badgeType = 'anadido';
            }
            milestones.push({
                date: c.fecha,
                title: (c.tipo || 'Cambio'),
                description: (c.motivo || '') + (c.descripcion ? ' \u2014 ' + c.descripcion : ''),
                markerClass: markerClass,
                badgeType: badgeType
            });
        }
        milestones.sort(function(a, b) { return a.date.localeCompare(b.date); });
        var timeline = document.createElement('div');
        timeline.className = 'timeline';
        for (var mi = 0; mi < milestones.length; mi++) {
            var ms = milestones[mi];
            var item = document.createElement('div');
            item.className = 'timeline-item';
            var marker = document.createElement('span');
            marker.className = 'timeline-marker ' + ms.markerClass;
            var dateEl = document.createElement('div');
            dateEl.className = 'timeline-date';
            dateEl.textContent = ms.date || '\u2014';
            var titleEl = document.createElement('div');
            titleEl.className = 'timeline-title';
            var titleText = document.createTextNode(ms.title);
            titleEl.appendChild(titleText);
            if (ms.badgeType) {
                var badge = document.createElement('span');
                badge.className = 'timeline-badge timeline-badge--' + ms.badgeType;
                var badgeLabels = { inicio: 'Inicio', activo: 'Activo', fin: 'Fin', cambio: 'Cambio', switch: 'Cambio', anadido: 'Añadido' };
                badge.textContent = badgeLabels[ms.badgeType] || ms.badgeType;
                titleEl.appendChild(badge);
            }
            var descEl = document.createElement('div');
            descEl.className = 'timeline-description';
            descEl.textContent = ms.description;
            item.append(marker, dateEl, titleEl, descEl);
            timeline.appendChild(item);
        }
        container.appendChild(timeline);
    }

    function renderAdverseEvents(patient) {
        var container = document.getElementById('adverseEventsContainer');
        if (!container) return;
        F.clearChildren(container);
        var events = patient.eventos_adversos || [];
        if (events.length === 0) {
            var emptyEl = document.createElement('div');
            emptyEl.className = 'empty-state';
            var emptyIcon = document.createElement('i');
            emptyIcon.className = 'fas fa-info-circle';
            emptyIcon.setAttribute('aria-hidden', 'true');
            emptyEl.appendChild(emptyIcon);
            emptyEl.appendChild(document.createTextNode(patient.__farmaciaRawPatient && patient.adverse_event_status === 'absent'
                ? 'Ausencia registrada' : (patient.__farmaciaRawPatient ? 'No registrado' : 'Sin eventos adversos registrados')));
            container.appendChild(emptyEl);
            return;
        }
        for (var ai = 0; ai < events.length; ai++) {
            var ev = events[ai];
            var card = document.createElement('div');
            card.className = 'adverse-event-card';
            var header = document.createElement('div');
            header.className = 'adverse-event-card__header';
            var icon = document.createElement('span');
            icon.className = 'adverse-event-card__icon';
            var iconI = document.createElement('i');
            iconI.className = 'fas fa-exclamation-triangle';
            iconI.setAttribute('aria-hidden', 'true');
            icon.appendChild(iconI);
            header.appendChild(icon);
            var nameEl = document.createElement('span');
            nameEl.className = 'adverse-event-card__name';
            nameEl.textContent = (ev.tipo || 'Evento adverso') + (ev.fecha ? ' \u2014 ' + ev.fecha : '');
            header.appendChild(nameEl);
            var grav = ev.gravedad || '';
            if (grav) {
                var gravNormalized = grav === 'moderada' ? 'moderado' : grav;
                var gravClass = 'badge-gravedad badge-gravedad-' + gravNormalized;
                var badge = document.createElement('span');
                badge.className = gravClass;
                badge.textContent = grav;
                header.appendChild(badge);
            }
            card.appendChild(header);
            var detail = document.createElement('div');
            detail.className = 'adverse-event-card__detail';
            var sospechosos = (ev.sospechosos || []).map(function (item) {
                return item.nombre_linea || item.linea_id || item.tratamiento_id || 'Biologico';
            }).join(' | ');
            var causality = (ev.evaluaciones_causalidad || []).map(function (assessment) {
                return Object.keys(assessment).filter(function (key) { return key !== 'source_event_id'; }).map(function (key) {
                    return key + ': ' + explicitText(assessment[key]);
                }).join(' · ');
            }).join(' | ');
            var fields = [
                { label: 'Relación con tratamiento', value: explicitText(ev.relacion_tratamiento) },
                { label: 'Biológicos sospechosos', value: sospechosos || 'No registrado' },
                { label: 'Acción tomada', value: explicitText(ev.accion_tomada) },
                { label: 'Resultado', value: explicitText(ev.resultado) },
                { label: 'Causalidad', value: causality || 'No registrado' }
            ];
            for (var fi = 0; fi < fields.length; fi++) {
                var fieldRow = document.createElement('div');
                fieldRow.className = 'adverse-event-card__detail-row';
                var fieldLabel = document.createElement('span');
                fieldLabel.className = 'adverse-event-card__detail-label';
                fieldLabel.textContent = fields[fi].label + ':';
                var fieldValue = document.createElement('span');
                fieldValue.className = 'adverse-event-card__detail-value';
                fieldValue.textContent = fields[fi].value;
                fieldRow.appendChild(fieldLabel);
                fieldRow.appendChild(fieldValue);
                detail.appendChild(fieldRow);
            }
            if (ev.descripcion_corta) {
                var commentRow = document.createElement('div');
                commentRow.className = 'adverse-event-card__comment';
                commentRow.textContent = ev.descripcion_corta;
                detail.appendChild(commentRow);
            }
            card.appendChild(detail);
            container.appendChild(card);
        }
    }

    function renderComorbidities(patient) {
        var container = document.getElementById('comorbiditiesContainer');
        if (!container) return;
        F.clearChildren(container);
        var comorbidities = patient.comorbilidades_relevantes || [];
        if (comorbidities.length === 0) {
            var emptyEl = document.createElement('div');
            emptyEl.className = 'empty-state';
            var emptyIcon = document.createElement('i');
            emptyIcon.className = 'fas fa-info-circle';
            emptyIcon.setAttribute('aria-hidden', 'true');
            emptyEl.appendChild(emptyIcon);
            emptyEl.appendChild(document.createTextNode(patient.__farmaciaRawPatient ? 'No registrado' : 'Sin comorbilidades registradas'));
            container.appendChild(emptyEl);
            return;
        }
        var grid = document.createElement('div');
        grid.className = 'comorbidity-grid';
        var imcItem = null;
        var tabaquismoItem = null;
        var diabetesItem = null;
        var metabolicoItem = null;
        var otherItems = [];
        for (var cmi = 0; cmi < comorbidities.length; cmi++) {
            var item = comorbidities[cmi];
            var nombreLower = (item.nombre || '').toLowerCase();
            var notaLower = (item.nota || '').toLowerCase();
            var tipoLower = (item.tipo || '').toLowerCase();
            if ((tipoLower === 'metabolica' && notaLower.indexOf('imc') !== -1) || nombreLower.indexOf('imc') !== -1 || notaLower.indexOf('imc') !== -1) {
                imcItem = item;
            } else if (tipoLower === 'habito toxico' || nombreLower.indexOf('tabaquismo') !== -1 || nombreLower.indexOf('tabaco') !== -1) {
                tabaquismoItem = item;
            } else if (nombreLower.indexOf('diabetes') !== -1) {
                diabetesItem = item;
            } else if (nombreLower.indexOf('metabolico') !== -1 || nombreLower.indexOf('metab\u00F3lico') !== -1) {
                metabolicoItem = item;
            } else {
                otherItems.push(item);
            }
        }
        function createComorbidityTile(name, value, note) {
            var tile = document.createElement('div');
            tile.className = 'comorbidity-tile';
            var cmNameEl = document.createElement('div');
            cmNameEl.className = 'comorbidity-tile__name';
            cmNameEl.textContent = name;
            tile.appendChild(cmNameEl);
            if (value) {
                var cmValueEl = document.createElement('div');
                cmValueEl.className = 'comorbidity-tile__value';
                cmValueEl.textContent = value;
                tile.appendChild(cmValueEl);
            }
            if (note) {
                var cmNoteEl = document.createElement('div');
                cmNoteEl.className = 'comorbidity-tile__note';
                cmNoteEl.textContent = note;
                tile.appendChild(cmNoteEl);
            }
            return tile;
        }
        if (imcItem) grid.appendChild(createComorbidityTile('IMC', imcItem.nombre, imcItem.nota));
        if (tabaquismoItem) grid.appendChild(createComorbidityTile('Tabaquismo', tabaquismoItem.nombre, tabaquismoItem.nota));
        if (diabetesItem) grid.appendChild(createComorbidityTile('Diabetes', diabetesItem.nombre, diabetesItem.nota));
        if (metabolicoItem) grid.appendChild(createComorbidityTile('Sindrome Metabolico', metabolicoItem.nombre, metabolicoItem.nota));
        for (var oj = 0; oj < otherItems.length; oj++) {
            var o = otherItems[oj];
            grid.appendChild(createComorbidityTile(o.tipo || o.nombre, o.nombre, o.nota));
        }
        container.appendChild(grid);
    }

    function renderExtendedBlocks(patient) {
        // Las formas no-array (STRING legacy demo / null / desconocido) nunca se
        // convierten en array de PROMs: renderProms decide por la forma.
        // Se conserva el valor original de patient.proms para el fallback.
        var originalProms = patient.proms;
        // Buscar datos extendidos del paciente en longDataset
        var extData = null;
        if (!patient.__farmaciaRawPatient && longDataset && longDataset.pacientes) {
            for (var ei = 0; ei < longDataset.pacientes.length; ei++) {
                if (longDataset.pacientes[ei].cip === patient.cip) {
                    extData = longDataset.pacientes[ei];
                    break;
                }
            }
        }
        // Fusionar datos extendidos en patient
        if (extData) {
            patient.episodios_asistenciales = extData.episodios_asistenciales || [];
            patient.tratamientos = extData.tratamientos || [];
            patient.cambios_pauta = extData.cambios_pauta || [];
            patient.actividad_clinica = extData.actividad_clinica || [];
            patient.eventos_adversos = extData.eventos_adversos || [];
            patient.comorbilidades_relevantes = extData.comorbilidades_relevantes || [];
            patient.biologicos = extData.biologicos || patient.biologicos || [];
            patient.visitas_fh = extData.visitas_fh || [];
            // Proms estructurados del dataset longitudinal cuando existen;
            // en caso contrario se preserva el valor original (STRING incluida).
            patient.proms = Array.isArray(extData.proms) ? extData.proms : originalProms;
        } else {
            patient.episodios_asistenciales = patient.episodios_asistenciales || [];
            patient.tratamientos = patient.tratamientos || [];
            patient.cambios_pauta = patient.cambios_pauta || [];
            patient.actividad_clinica = patient.actividad_clinica || [];
            patient.eventos_adversos = patient.eventos_adversos || [];
            patient.comorbilidades_relevantes = patient.comorbilidades_relevantes || [];
            patient.biologicos = patient.biologicos || [];
            patient.visitas_fh = patient.visitas_fh || [];
            // No se muta patient.proms: se conserva la forma original (array/string/null).
        }

        renderClinicalActivity(patient);
        renderProms(patient);
        renderBiologicLines(patient);
        renderTimelines(patient);
        renderAdverseEvents(patient);
        renderComorbidities(patient);
    }

    function renderPatientNotFound(ctx) {
        F.setText('patientIdBadge', ctx.cip);
        F.setText('patientName', 'Paciente no encontrado');
        F.setText('patientDiagnosis', '\u2014');
        F.setText('patientService', '\u2014');
        F.setText('patientLastVisit', '\u2014');
        F.setText('patientAge', '\u2014');
        F.setText('patientGender', '\u2014');
        var badge = document.getElementById('patientStatusBadge');
        if (badge) {
            badge.className = 'status-badge status-badge--pending';
            badge.textContent = 'CIP no encontrado';
        }
        var summaryGrid = document.getElementById('dashboardSummaryGrid');
        if (summaryGrid) {
            F.clearChildren(summaryGrid);
            var msg = document.createElement('div');
            msg.className = 'empty-state';
            var icon = document.createElement('i');
            icon.className = 'fas fa-exclamation-triangle';
            icon.setAttribute('aria-hidden', 'true');
            msg.appendChild(icon);
            msg.appendChild(document.createTextNode(' CIP ' + ctx.cip + ' no encontrado en el sistema'));
            summaryGrid.appendChild(msg);
        }
        var containerIds = ['clinicalActivityContainer','promsDashboardContainer','biologicLinesContainer','timelineEpisodiosContainer','timelineTratamientoContainer','adverseEventsContainer','comorbiditiesContainer'];
        containerIds.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                F.clearChildren(el);
                var emptyEl = document.createElement('div');
                emptyEl.className = 'empty-state';
                var emptyIcon = document.createElement('i');
                emptyIcon.className = 'fas fa-info-circle';
                emptyIcon.setAttribute('aria-hidden', 'true');
                emptyEl.appendChild(emptyIcon);
                emptyEl.appendChild(document.createTextNode(' Paciente no encontrado'));
                el.appendChild(emptyEl);
            }
        });
        var longSection = document.getElementById('longitudinal-section');
        if (longSection) longSection.classList.add('hidden');
    }

    function renderDashboard(patient) {
        F.setText('patientIdBadge', patient.cip);
        F.setText('patientName', patient.nombre || (patient.__farmaciaRawPatient ? 'Paciente actual' : ''));
        F.setText('patientDiagnosis', patient.patologia);
        F.setText('patientService', patient.servicio);
        F.setText('patientLastVisit', patient.ultimaVisita);
        F.setText('patientAge', patient.edad);
        F.setText('patientGender', patient.sexo);
        const badge = document.getElementById('patientStatusBadge');
        badge.className = F.statusClass(patient.estado);
        badge.textContent = patient.estadoLabel;
        var bioLines = getPatientBiologicLines(patient);
        var primaryLine = null;
        var otherLines = [];
        if (patient.__farmaciaRawPatient) {
            var explicitActiveLines = bioLines.filter(function (line) { return line.active_at_event === true; });
            if (explicitActiveLines.length === 1) primaryLine = explicitActiveLines[0];
            else otherLines = explicitActiveLines;
        } else {
            bioLines.forEach(function (line) {
                if (line.es_principal || line.tipo_relacion === 'principal' || (!primaryLine && line.estado_linea !== 'historico')) {
                    primaryLine = line;
                } else if (line.estado_linea !== 'historico') {
                    otherLines.push(line);
                }
            });
            if (!primaryLine && bioLines.length) primaryLine = bioLines[0];
        }
        var summaryFields = [];
        if (patient.__farmaciaRawPatient) {
            summaryFields.push({ label: 'Tratamiento solicitado', value: patient.solicitud && patient.solicitud.requested_drug_name });
            summaryFields.push({ label: 'Tratamiento validado', value: patient.validacion && patient.validacion.validated_drug_name });
        }
        if (primaryLine) {
            var primaryName = primaryLine.nombre_linea || primaryLine.farmaco_nombre || primaryLine.principio_activo || primaryLine.nombre_comercial || patient.farmaco || '—';
            summaryFields.push({ label: 'Tratamiento principal', value: primaryName });
        } else if (patient.farmaco) {
            summaryFields.push({ label: 'Tratamiento actual', value: patient.farmaco + ' · ' + (patient.pauta || '') });
        }
        if (otherLines.length) {
            var otherNames = otherLines.map(function (l) { return l.nombre_linea || l.farmaco_nombre || l.principio_activo || l.nombre_comercial || '—'; }).join(', ');
            summaryFields.push({ label: patient.__farmaciaRawPatient ? 'Líneas activas sin autoselección' : 'Otras líneas activas', value: otherNames });
        }
        summaryFields.push({ label: 'Estado validación', value: patient.estadoLabel });
        summaryFields.push({ label: 'Última adherencia', value: explicitText(patient.adherencia) });
        summaryFields.push({ label: 'Efectos adversos', value: explicitText(patient.efectosAdversos) });
        summaryFields.push({ label: 'Últimos PROMs Farmacia', value: getDashboardSummaryPromsText(patient) });
        F.renderFields(document.getElementById('dashboardSummaryGrid'), summaryFields);
        document.getElementById('dashboardSummaryGrid').appendChild(createChecksVisualBlock(patient));

        const actionBtns = document.querySelectorAll('.patient-header-actions a');
        if (actionBtns[0]) {
            actionBtns[0].href = F.makeContextUrl('farmacia_seguimiento.html', {
                cip: patient.cip, servicio: patient.servicioSlug, patologia: patient.patologia, entrada: 'seguimiento'
            });
        }
        if (actionBtns[1]) {
            actionBtns[1].href = F.makeContextUrl('farmacia_validacion.html', {
                cip: patient.cip, servicio: patient.servicioSlug, patologia: patient.patologia, entrada: 'validacion'
            });
        }

        // Actualizar enlaces de navegación con CIP actual
        var navSeg = document.getElementById("navToSeguimiento");
        if (navSeg && patient.cip) {
            navSeg.href = F.makeContextUrl('farmacia_seguimiento.html', { cip: patient.cip, entrada: 'seguimiento' });
        }

        renderLongitudinalForCip(patient.cip);

        renderExtendedBlocks(patient);
    }



    var longDataset = null;
    var longCurrentCip = null;
    var longSectionReady = false;

    var LONG_PROM_MAP = { dlqi: 'DLQI', eva_dolor: 'EVA dolor', eva_prurito: 'EVA prurito', haq: 'HAQ' };
    var LONG_CLINICAL_MAP = { ihs4: 'IHS4', hurley: 'Hurley', das28: 'DAS28', haq: 'HAQ' };

    function buildLongReverseMap(map) {
        var reversed = {};
        var keys = Object.keys(map);
        for (var i = 0; i < keys.length; i++) { reversed[map[keys[i]]] = keys[i]; }
        return reversed;
    }

    var LONG_PROM_REVERSE = buildLongReverseMap(LONG_PROM_MAP);
    var LONG_CLINICAL_REVERSE = buildLongReverseMap(LONG_CLINICAL_MAP);

    var PROM_MAX = { 'DLQI': 30, 'EVA dolor': 10, 'EVA prurito': 10, 'HAQ': 3 };
    var CLINICAL_MAX = { 'IHS4': 20, 'Hurley': 3, 'DAS28': 10, 'HAQ': 3 };

    function longParseDate(str) {
        if (!str) return null;
        var parts = str.split('-');
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }

    function getLongPatient(cip) {
        if (!longDataset || !longDataset.pacientes) return null;
        for (var i = 0; i < longDataset.pacientes.length; i++) {
            if (longDataset.pacientes[i].cip === cip) return longDataset.pacientes[i];
        }
        return null;
    }

    function getLongSeverityInfo(type, numericVal) {
        var n = numericVal;
        if (isNaN(n) || n === null || n === undefined) return { label: 'Sin datos', cssClass: 'threshold-no-data' };
        switch (type) {
            case 'DLQI':
                if (n <= 1) return { label: 'Sin efecto (0-1)', cssClass: 'threshold-low' };
                if (n <= 5) return { label: 'Efecto pequeno (2-5)', cssClass: 'threshold-low' };
                if (n <= 10) return { label: 'Efecto moderado (6-10)', cssClass: 'threshold-moderate' };
                if (n <= 20) return { label: 'Efecto muy importante (11-20)', cssClass: 'threshold-high' };
                return { label: 'Efecto extremadamente importante (21-30)', cssClass: 'threshold-severe' };
            case 'EVA dolor':
            case 'EVA prurito':
                if (n <= 3) return { label: 'Bajo (0-3)', cssClass: 'threshold-low' };
                if (n <= 6) return { label: 'Moderado (4-6)', cssClass: 'threshold-moderate' };
                return { label: 'Alto (7-10)', cssClass: 'threshold-high' };
            case 'IHS4':
                if (n <= 3) return { label: 'Leve (0-3)', cssClass: 'threshold-low' };
                if (n <= 10) return { label: 'Moderado (4-10)', cssClass: 'threshold-moderate' };
                return { label: 'Severo (>=11)', cssClass: 'threshold-high' };
            case 'Hurley':
                if (n <= 1.5) return { label: 'Estadio I', cssClass: 'hurley-i' };
                if (n <= 2.5) return { label: 'Estadio II', cssClass: 'hurley-ii' };
                return { label: 'Estadio III', cssClass: 'hurley-iii' };
            case 'DAS28':
                if (n < 2.6) return { label: 'Remision (<2.6)', cssClass: 'threshold-low' };
                if (n <= 3.2) return { label: 'Baja (2.6-3.2)', cssClass: 'threshold-moderate' };
                if (n <= 5.1) return { label: 'Moderada (>3.2-5.1)', cssClass: 'threshold-high' };
                return { label: 'Alta (>5.1)', cssClass: 'threshold-high' };
            case 'HAQ':
                if (n <= 0.5) return { label: 'Bajo (0-0.5)', cssClass: 'threshold-low' };
                if (n <= 1.5) return { label: 'Moderado (>0.5-1.5)', cssClass: 'threshold-moderate' };
                return { label: 'Alto (>1.5)', cssClass: 'threshold-high' };
            default:
                if (n <= 25) return { label: 'Bajo', cssClass: 'threshold-low' };
                if (n <= 50) return { label: 'Medio', cssClass: 'threshold-moderate' };
                return { label: 'Alto', cssClass: 'threshold-high' };
        }
    }

    function initLongitudinalSection() {
        var section = document.getElementById('longitudinal-section');
        if (!section) return;
        var statusEl = document.getElementById('dbStatusIndicator');
        if (statusEl) {
            var timeEl = statusEl.querySelector('.db-status-indicator__time');
            if (timeEl) timeEl.textContent = 'Cargando datos longitudinales...';
        }
        fetch('data/demo/farmacia/farmacia_longitudinal_demo_v0_3.json')
            .then(function (response) {
                if (!response.ok) throw new Error('Failed to fetch longitudinal dataset');
                return response.json();
            })
            .then(function (data) {
                var normalize = window.FarmaciaLongitudinal.normalizePatient;
                data.pacientes = (data.pacientes || []).map(function (patient) { return normalize(patient); });
                longDataset = data;
                longSectionReady = true;
                if (statusEl) {
                    var timeEl = statusEl.querySelector('.db-status-indicator__time');
                    if (timeEl) timeEl.textContent = 'Longitudinal cargado';
                }
                if (longCurrentCip) {
                    renderLongitudinalForCip(longCurrentCip);
                }
                // Re-render secciones extendidas ahora que longDataset está disponible
                var ctx = F.getQueryContext();
                if (!ctx.patientNotFound) {
                    var patient = ctx.patient || F.patients[longCurrentCip || 'CIP-DEMO-FH-001'];
                    if (patient) {
                        renderExtendedBlocks(patient);
                    }
                }
            })
            .catch(function () {
                longSectionReady = false;
                if (statusEl) {
                    var timeEl = statusEl.querySelector('.db-status-indicator__time');
                    if (timeEl) timeEl.textContent = 'CSV sintetico';
                }
            });
    }

    function renderLongitudinalForCip(cip) {
        longCurrentCip = cip;
        if (!longSectionReady || !longDataset) return;
        var section = document.getElementById('longitudinal-section');
        if (!section) return;
        var patient = getLongPatient(cip);
        var noDataEl = document.getElementById('longitudinal-no-data');
        var chartContainer = document.getElementById('longitudinal-chart-container');
        var legendEl = document.getElementById('longitudinal-legend');
        var demoNoteEl = document.getElementById('longitudinal-demo-note');
        var toggleBtn = document.getElementById('toggle-legend');
        var standaloneLink = document.getElementById('longitudinalStandaloneLink');

        if (!patient) {
            var context = F.getQueryContext();
            var rawPatient = context.patient && context.patient.__farmaciaRawPatient
                && context.patient.cip === cip;
            if (rawPatient) {
                section.classList.remove('hidden');
                if (standaloneLink) standaloneLink.href = F.makeContextUrl('farmacia_dashboard_longitudinal.html', { cip: cip });
                if (chartContainer) F.clearChildren(chartContainer);
                if (noDataEl) noDataEl.classList.remove('hidden');
                if (legendEl) legendEl.classList.add('hidden');
                if (demoNoteEl) demoNoteEl.classList.add('hidden');
                return;
            }
            section.classList.add('hidden');
            return;
        }
        section.classList.remove('hidden');
        // Actualizar enlace "Vista completa" con CIP actual
        if (standaloneLink) {
            standaloneLink.href = F.makeContextUrl('farmacia_dashboard_longitudinal.html', { cip: cip });
        }
        if (noDataEl) noDataEl.classList.add('hidden');
        if (demoNoteEl) demoNoteEl.classList.remove('hidden');
        if (legendEl) legendEl.classList.add('hidden');
        if (toggleBtn) toggleBtn.textContent = 'Ver leyenda';

        populateLongSelectors(patient);
        renderLongTreatmentBands(patient, chartContainer);
        renderLongDataSeries(patient, chartContainer);
        renderLongLegend(legendEl);
    }

    function populateLongSelectors(patient) {
        var clinicalSel = document.getElementById('clinical-var-select');
        var promSel = document.getElementById('prom-select');
        if (!patient) return;

        if (clinicalSel) {
            var prevClinical = clinicalSel.value;
            F.clearChildren(clinicalSel);
            var placeholderC = document.createElement('option');
            placeholderC.value = '';
            placeholderC.textContent = 'Variable clinica';
            clinicalSel.appendChild(placeholderC);
            var clinicalTypes = {};
            var actItems = patient.actividad_clinica || [];
            for (var i = 0; i < actItems.length; i++) {
                if (actItems[i].tipo_indice) clinicalTypes[actItems[i].tipo_indice] = true;
            }
            var uniqueClinical = Object.keys(clinicalTypes).sort();
            for (var j = 0; j < uniqueClinical.length; j++) {
                var displayName = uniqueClinical[j];
                var opt = document.createElement('option');
                opt.value = LONG_CLINICAL_REVERSE[displayName] || displayName.toLowerCase().replace(/ /g, '_');
                opt.textContent = displayName;
                clinicalSel.appendChild(opt);
            }
            var foundC = false;
            if (prevClinical && prevClinical !== '') {
                for (var k = 0; k < clinicalSel.options.length; k++) {
                    if (clinicalSel.options[k].value === prevClinical) { foundC = true; break; }
                }
            }
            clinicalSel.value = foundC ? prevClinical : (uniqueClinical.length > 0 ? clinicalSel.options[1] ? clinicalSel.options[1].value : '' : '');
        }

        if (promSel) {
            var prevProm = promSel.value;
            F.clearChildren(promSel);
            var placeholderP = document.createElement('option');
            placeholderP.value = '';
            placeholderP.textContent = 'PROM';
            promSel.appendChild(placeholderP);
            var promTypes = {};
            var promItems = getStructuredProms(patient);
            for (var m = 0; m < promItems.length; m++) {
                if (promItems[m].tipo_prom) promTypes[promItems[m].tipo_prom] = true;
            }
            var uniqueProms = Object.keys(promTypes).sort();
            for (var n = 0; n < uniqueProms.length; n++) {
                var pDisplay = uniqueProms[n];
                var optP = document.createElement('option');
                optP.value = LONG_PROM_REVERSE[pDisplay] || pDisplay.toLowerCase().replace(/ /g, '_');
                optP.textContent = pDisplay;
                promSel.appendChild(optP);
            }
            var foundP = false;
            if (prevProm && prevProm !== '') {
                for (var p = 0; p < promSel.options.length; p++) {
                    if (promSel.options[p].value === prevProm) { foundP = true; break; }
                }
            }
            promSel.value = foundP ? prevProm : (uniqueProms.length > 0 ? promSel.options[1] ? promSel.options[1].value : '' : '');
        }
    }

    function detectIntensityChange(treatment, cambios_pauta) {
        if (!cambios_pauta || cambios_pauta.length === 0) return null;
        if (!treatment.fecha_inicio) return null;
        var tStart = longParseDate(treatment.fecha_inicio);
        var tEnd = null;
        if (treatment.fecha_fin) {
            tEnd = longParseDate(treatment.fecha_fin);
        }
        if (!tStart) return null;
        for (var i = 0; i < cambios_pauta.length; i++) {
            var c = cambios_pauta[i];
            var cDate = longParseDate(c.fecha);
            if (!cDate) continue;
            var inRange = cDate >= tStart && (!tEnd || cDate <= tEnd);
            var matchesTreatment = true;
            if (c.tratamiento_id && treatment.id && c.tratamiento_id !== treatment.id) matchesTreatment = false;
            var matchesPrev = c.tratamiento_anterior_id && treatment.id && c.tratamiento_anterior_id === treatment.id;
            var matchesNew = c.tratamiento_nuevo_id && treatment.id && c.tratamiento_nuevo_id === treatment.id;
            if (!inRange && !matchesPrev && !matchesNew) continue;
            if (!inRange && !matchesTreatment && !matchesPrev && !matchesNew) continue;
            if (matchesPrev && !inRange) continue;
            var txt = ((c.tipo || '') + ' ' + (c.motivo || '') + ' ' + (c.descripcion || '')).toLowerCase();
            if (/intensific|aumento\s|subida|escalada|dosis.*superior|dosis.*mayor|increment/i.test(txt)) return 'intensified';
            if (/desintensif|reducci[oó]n|bajada|desescalada|espaciado|cada\s*[456789]|optimizacion_intervalo/i.test(txt)) return 'deintensified';
        }
        return null;
    }

    function renderLongTreatmentBands(patient, container) {
        if (!container) return;
        var treatments = patient.tratamientos || [];
        if (treatments.length === 0) return;

        var changes = patient.cambios_pauta || [];
        var events = patient.eventos_adversos || [];

        var allDates = [];
        for (var i = 0; i < treatments.length; i++) {
            var td = longParseDate(treatments[i].fecha_inicio);
            if (td) allDates.push(td);
            var te = longParseDate(treatments[i].fecha_fin);
            if (te) allDates.push(te);
        }
        for (var j = 0; j < changes.length; j++) {
            var cd = longParseDate(changes[j].fecha);
            if (cd) allDates.push(cd);
        }
        for (var k = 0; k < events.length; k++) {
            var ed = longParseDate(events[k].fecha);
            if (ed) allDates.push(ed);
        }
        if (allDates.length === 0) return;

        allDates.sort(function (a, b) { return a - b; });
        var minDate = allDates[0];
        var maxDate = allDates[allDates.length - 1];
        var totalMs = maxDate.getTime() - minDate.getTime();
        var totalDays = totalMs / (1000 * 60 * 60 * 24);
        if (totalDays <= 0) totalDays = 1;

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

        var track = document.createElement('div');
        track.className = 'longitudinal-treatment-track';

        var axis = document.createElement('div');
        axis.className = 'longitudinal-treatment-track__axis';
        var axisStart = document.createElement('span');
        axisStart.className = 'longitudinal-treatment-track__axis-label longitudinal-treatment-track__axis-label--start';
        axisStart.textContent = fmtDate(minDate);
        var axisEnd = document.createElement('span');
        axisEnd.className = 'longitudinal-treatment-track__axis-label longitudinal-treatment-track__axis-label--end';
        axisEnd.textContent = fmtDate(maxDate);
        axis.appendChild(axisStart);
        axis.appendChild(axisEnd);
        track.appendChild(axis);

        for (var bi = 0; bi < treatments.length; bi++) {
            var t = treatments[bi];
            var startDate = longParseDate(t.fecha_inicio);
            if (!startDate) continue;
            var endDate;
            if (t.fecha_fin) {
                endDate = longParseDate(t.fecha_fin);
            } else if (t.activo) {
                endDate = maxDate;
            } else {
                endDate = startDate;
            }
            if (!endDate) endDate = startDate;

            var bandRow = document.createElement('div');
            bandRow.className = 'longitudinal-treatment-band-row';

            var statusClass = 'longitudinal-treatment-band--previous';
            if (t.activo && !t.fecha_fin) statusClass = 'longitudinal-treatment-band--active';
            else if (!t.activo && t.motivo_suspension) statusClass = 'longitudinal-treatment-band--suspended';

            var intensityResult = detectIntensityChange(t, changes);
            var intensityClass = '';
            if (intensityResult === 'intensified') intensityClass = ' treatment-intensified';
            else if (intensityResult === 'deintensified') intensityClass = ' treatment-deintensified';

            var bandClasses = 'longitudinal-treatment-band ' + statusClass + intensityClass;
            if (t.motivo_cambio) bandClasses += ' longitudinal-treatment-band--optimized';

            var band = document.createElement('div');
            band.className = bandClasses;
            band.style.left = pct(startDate) + '%';
            var widthPct = pct(endDate) - pct(startDate);
            if (widthPct < 0.5) widthPct = 0.5;
            band.style.width = widthPct + '%';

            var label = document.createElement('div');
            label.className = 'longitudinal-treatment-band__label';
            label.textContent = t.nombre_comercial || t.principio_activo || 'Sin nombre';
            band.appendChild(label);

            var meta = document.createElement('div');
            meta.className = 'longitudinal-treatment-band__meta';
            if (t.presentacion_dosis) {
                var doseEl = document.createElement('span');
                doseEl.className = 'longitudinal-treatment-band__dose';
                doseEl.textContent = t.presentacion_dosis;
                meta.appendChild(doseEl);
            }
            if (t.pauta) {
                var pautaEl = document.createElement('span');
                pautaEl.className = 'longitudinal-treatment-band__pauta';
                pautaEl.textContent = t.pauta;
                meta.appendChild(pautaEl);
            }
            if (t.via) {
                var viaEl = document.createElement('span');
                viaEl.className = 'longitudinal-treatment-band__via';
                viaEl.textContent = t.via;
                meta.appendChild(viaEl);
            }
            if (t.principio_activo) {
                var princEl = document.createElement('span');
                princEl.className = 'longitudinal-treatment-band__principle';
                princEl.textContent = t.principio_activo;
                meta.appendChild(princEl);
            }
            band.appendChild(meta);

            var dates = document.createElement('div');
            dates.className = 'longitudinal-treatment-band__dates';
            var dateStart = document.createElement('span');
            dateStart.className = 'longitudinal-treatment-band__date';
            dateStart.textContent = 'Inicio: ' + (t.fecha_inicio || '—');
            dates.appendChild(dateStart);
            var dateEnd = document.createElement('span');
            dateEnd.className = 'longitudinal-treatment-band__date';
            dateEnd.textContent = 'Fin: ' + (t.fecha_fin || 'Activo');
            dates.appendChild(dateEnd);
            band.appendChild(dates);

            var statusLabels = {
                'longitudinal-treatment-band--active': 'Activo',
                'longitudinal-treatment-band--suspended': 'Suspendido',
                'longitudinal-treatment-band--previous': 'Previo'
            };
            var badgeSuffix = statusClass === 'longitudinal-treatment-band--active' ? 'active' :
                (statusClass === 'longitudinal-treatment-band--suspended' ? 'suspended' : 'previous');
            var badge = document.createElement('span');
            badge.className = 'longitudinal-treatment-band__status longitudinal-treatment-band__status--' + badgeSuffix;
            badge.textContent = statusLabels[statusClass] || 'Previo';
            band.appendChild(badge);

            var tooltipParts = [];
            if (t.motivo_inicio) tooltipParts.push('Motivo inicio: ' + t.motivo_inicio);
            if (t.motivo_suspension) tooltipParts.push('Suspension: ' + t.motivo_suspension);
            if (t.motivo_cambio) tooltipParts.push('Cambio: ' + t.motivo_cambio);
            if (t.estado_validacion_farmacia) tooltipParts.push('Validacion: ' + t.estado_validacion_farmacia);
            if (intensityResult) {
                tooltipParts.push('Intensidad: ' + (intensityResult === 'intensified' ? 'Intensificacion' : 'Desintensificacion'));
            }
            if (tooltipParts.length > 0) band.setAttribute('title', tooltipParts.join(' | '));

            var bandMs = endDate.getTime() - startDate.getTime();
            var bandDays = bandMs / (1000 * 60 * 60 * 24);
            if (bandDays <= 0) bandDays = 0.5;

            for (var ci = 0; ci < changes.length; ci++) {
                var c = changes[ci];
                var cdDate = longParseDate(c.fecha);
                if (!cdDate) continue;
                if (cdDate < startDate || cdDate > endDate) continue;
                var cDaysFromStart = (cdDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
                var cPosPct = (cDaysFromStart / bandDays) * 100;
                if (cPosPct < 0) cPosPct = 0;
                if (cPosPct > 100) cPosPct = 100;
                var doseMarker = document.createElement('div');
                doseMarker.className = 'event-marker--dose-change';
                doseMarker.style.left = cPosPct + '%';
                var doseIcon = document.createElement('i');
                if (c.tipo === 'cambio_farmaco') {
                    doseIcon.className = 'fas fa-exchange-alt';
                } else if ((c.tipo || '').indexOf('optimizacion') !== -1 || (c.tipo || '').indexOf('optimización') !== -1) {
                    doseIcon.className = 'fas fa-sliders-h';
                } else {
                    doseIcon.className = 'fas fa-rotate';
                }
                doseIcon.setAttribute('aria-hidden', 'true');
                doseMarker.appendChild(doseIcon);
                var cTooltip = 'Cambio de pauta — ' + (c.fecha || '') + '\nTipo: ' + (c.tipo || '—');
                if (c.descripcion) cTooltip += '\n' + c.descripcion;
                if (c.motivo) cTooltip += '\nMotivo: ' + c.motivo;
                if (c.dosis_anterior) cTooltip += '\nDosis anterior: ' + c.dosis_anterior;
                if (c.dosis_nueva) cTooltip += '\nDosis nueva: ' + c.dosis_nueva;
                if (c.estado_validacion_farmacia) cTooltip += '\nValidacion: ' + c.estado_validacion_farmacia;
                doseMarker.setAttribute('title', cTooltip);
                band.appendChild(doseMarker);
            }

            for (var ei = 0; ei < events.length; ei++) {
                var ev = events[ei];
                var edDate = longParseDate(ev.fecha);
                if (!edDate) continue;
                if (edDate < startDate || edDate > endDate) continue;
                var eDaysFromStart = (edDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
                var ePosPct = (eDaysFromStart / bandDays) * 100;
                if (ePosPct < 0) ePosPct = 0;
                if (ePosPct > 100) ePosPct = 100;
                var grav = ev.gravedad || '';
                var gravSuffix = 'high';
                if (grav === 'leve') gravSuffix = 'low';
                else if (grav === 'moderado' || grav === 'moderada') gravSuffix = 'moderate';
                else if (grav === 'grave') gravSuffix = 'high';
                else if (grav === 'serio') gravSuffix = 'serious';
                var aeMarker = document.createElement('div');
                aeMarker.className = 'event-marker--adverse event-marker--ae-' + gravSuffix;
                aeMarker.style.left = ePosPct + '%';
                var aeIcon = document.createElement('i');
                aeIcon.className = 'fas fa-exclamation-triangle';
                aeIcon.setAttribute('aria-hidden', 'true');
                aeMarker.appendChild(aeIcon);
                var aeTooltip = 'EA: ' + (ev.tipo || '—') + ' (' + (ev.fecha || '') + ')\nGravedad: ' + (ev.gravedad || '—') + '\nRelacion: ' + (ev.relacion_tratamiento || '—') + '\nAccion: ' + (ev.accion_tomada || '—');
                if (ev.descripcion_corta) aeTooltip += '\n' + ev.descripcion_corta;
                aeMarker.setAttribute('title', aeTooltip);
                band.appendChild(aeMarker);
            }

            bandRow.appendChild(band);
            track.appendChild(bandRow);
        }

        while (container.firstChild) container.removeChild(container.firstChild);
        container.appendChild(track);
    }

    function renderLongDataSeries(patient, container) {
        if (!container || !patient) return;

        var clinicalSel = document.getElementById('clinical-var-select');
        var promSel = document.getElementById('prom-select');
        var clinicalKey = clinicalSel ? clinicalSel.value : '';
        var promKey = promSel ? promSel.value : '';

        var track = container.querySelector('.longitudinal-treatment-track');
        if (!track) return;

        var oldCanvas = track.querySelector('.longitudinal-chart-canvas');
        if (oldCanvas) oldCanvas.parentNode.removeChild(oldCanvas);
        var oldLegend = track.querySelector('.longitudinal-axis-legend');
        if (oldLegend) oldLegend.parentNode.removeChild(oldLegend);
        var oldRows = track.querySelectorAll('.longitudinal-data-point-row, .longitudinal-data-svg-overlay, .longitudinal-data-hint');
        for (var r = 0; r < oldRows.length; r++) {
            oldRows[r].parentNode.removeChild(oldRows[r]);
        }

        var clinicalType = clinicalKey ? (LONG_CLINICAL_MAP[clinicalKey] || clinicalKey) : null;
        var promType = promKey ? (LONG_PROM_MAP[promKey] || promKey) : null;

        var clinicalItems = clinicalKey ? (patient.actividad_clinica || []).filter(function (a) { return a.tipo_indice === clinicalType; }) : [];
        var promItems = promKey ? getStructuredProms(patient).filter(function (p) { return p.tipo_prom === promType; }) : [];

        if (!clinicalKey && !promKey) {
            var hint = document.createElement('div');
            hint.className = 'longitudinal-data-hint';
            hint.textContent = 'Seleccione una variable cl\u00EDnica o PROM para ver la evoluci\u00F3n.';
            track.appendChild(hint);
            return;
        }

        var allDates = [];
        var treatments = patient.tratamientos || [];
        for (var i = 0; i < treatments.length; i++) {
            var td = longParseDate(treatments[i].fecha_inicio);
            if (td) allDates.push(td);
            var te = longParseDate(treatments[i].fecha_fin);
            if (te) allDates.push(te);
        }
        var changes = patient.cambios_pauta || [];
        for (var j = 0; j < changes.length; j++) {
            var cd = longParseDate(changes[j].fecha);
            if (cd) allDates.push(cd);
        }
        var evts = patient.eventos_adversos || [];
        for (var k = 0; k < evts.length; k++) {
            var ed = longParseDate(evts[k].fecha);
            if (ed) allDates.push(ed);
        }
        for (var ci = 0; ci < clinicalItems.length; ci++) {
            var cid = longParseDate(clinicalItems[ci].fecha);
            if (cid) allDates.push(cid);
        }
        for (var pi = 0; pi < promItems.length; pi++) {
            var pid = longParseDate(promItems[pi].fecha);
            if (pid) allDates.push(pid);
        }

        if (allDates.length === 0) return;
        allDates.sort(function (a, b) { return a - b; });
        var minDate = allDates[0];
        var maxDate = allDates[allDates.length - 1];
        var totalMs = maxDate.getTime() - minDate.getTime();
        var totalDays = totalMs / (1000 * 60 * 60 * 24);
        if (totalDays <= 0) totalDays = 1;

        function pct(d) {
            var days = (d.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
            return Math.max(0, Math.min(100, (days / totalDays) * 100));
        }

        var clinicalMax = clinicalType ? (CLINICAL_MAX[clinicalType] || 100) : 100;
        var promMax = promType ? (PROM_MAX[promType] || 100) : 100;

        var hasClinical = clinicalKey && clinicalItems.length > 0;
        var hasProm = promKey && promItems.length > 0;

        if (!hasClinical && !hasProm) {
            if (clinicalKey) {
                var cEmpty = document.createElement('div');
                cEmpty.className = 'longitudinal-data-hint';
                cEmpty.textContent = 'Sin datos de ' + clinicalType + ' para este paciente.';
                track.appendChild(cEmpty);
            }
            if (promKey) {
                var pEmpty = document.createElement('div');
                pEmpty.className = 'longitudinal-data-hint';
                pEmpty.textContent = 'Sin datos de ' + promType + ' para este paciente.';
                track.appendChild(pEmpty);
            }
            return;
        }

        var svgNS = 'http://www.w3.org/2000/svg';

        var canvas = document.createElement('div');
        canvas.className = 'longitudinal-chart-canvas';

        if (hasClinical) {
            var leftAxis = document.createElement('div');
            leftAxis.className = 'longitudinal-chart-yaxis longitudinal-chart-yaxis--left';
            var topTickC = document.createElement('div');
            topTickC.className = 'longitudinal-chart-yaxis__tick';
            var topValC = document.createElement('span');
            topValC.className = 'longitudinal-chart-yaxis__value';
            topValC.textContent = String(clinicalMax);
            var topLabelC = document.createElement('span');
            topLabelC.className = 'longitudinal-chart-yaxis__label';
            topLabelC.textContent = clinicalType || '';
            topTickC.appendChild(topValC);
            topTickC.appendChild(topLabelC);
            var botTickC = document.createElement('div');
            botTickC.className = 'longitudinal-chart-yaxis__tick';
            var botValC = document.createElement('span');
            botValC.className = 'longitudinal-chart-yaxis__value';
            botValC.textContent = '0';
            var botLabelC = document.createElement('span');
            botLabelC.className = 'longitudinal-chart-yaxis__label';
            botLabelC.textContent = 'min';
            botTickC.appendChild(botValC);
            botTickC.appendChild(botLabelC);
            leftAxis.appendChild(topTickC);
            leftAxis.appendChild(botTickC);
            canvas.appendChild(leftAxis);
        } else {
            var leftSpacer = document.createElement('div');
            leftSpacer.className = 'longitudinal-chart-yaxis';
            canvas.appendChild(leftSpacer);
        }

        var svgArea = document.createElement('div');
        svgArea.className = 'longitudinal-chart-svg-area';

        var svgEl = document.createElementNS(svgNS, 'svg');
        svgEl.setAttribute('class', 'longitudinal-chart-svg');
        svgEl.setAttribute('viewBox', '0 0 100 100');
        svgEl.setAttribute('preserveAspectRatio', 'none');

        function yCoord(value, maxVal) {
            if (isNaN(value) || value === null || value === undefined || maxVal <= 0) return 50;
            var ratio = value / maxVal;
            if (ratio > 1) ratio = 1;
            if (ratio < 0) ratio = 0;
            return 100 - (ratio * 100);
        }

        if (hasClinical) {
            var clinicalSorted = clinicalItems.slice().sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });
            var clinicalPoints = [];
            for (var s = 0; s < clinicalSorted.length; s++) {
                var item = clinicalSorted[s];
                var d = longParseDate(item.fecha);
                if (!d) continue;
                var x = pct(d);
                var y = yCoord(parseFloat(item.valor), clinicalMax);
                clinicalPoints.push(x + ',' + y);

                var marker = document.createElement('div');
                marker.className = 'longitudinal-chart-marker longitudinal-chart-marker--clinical';
                if (clinicalSorted.length === 1) marker.className += ' longitudinal-chart-marker--single';
                marker.style.left = x + '%';
                marker.style.top = y + '%';
                var numericVal = parseFloat(item.valor);
                var sevInfo = getLongSeverityInfo(clinicalType, numericVal);
                var tip = clinicalType + ': ' + (item.valor || '\u2014') + ' (' + item.fecha + ')\n' + sevInfo.label;
                if (item.interpretacion) tip += '\n' + item.interpretacion;
                marker.setAttribute('title', tip);
                svgArea.appendChild(marker);
            }
            if (clinicalPoints.length > 0) {
                var clinicalLine = document.createElementNS(svgNS, 'polyline');
                clinicalLine.setAttribute('class', 'longitudinal-chart-line longitudinal-chart-line--clinical');
                clinicalLine.setAttribute('points', clinicalPoints.join(' '));
                svgEl.appendChild(clinicalLine);
            }
        }

        if (hasProm) {
            var promSorted = promItems.slice().sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });
            var promPoints = [];
            for (var ps = 0; ps < promSorted.length; ps++) {
                var pItem = promSorted[ps];
                var pd = longParseDate(pItem.fecha);
                if (!pd) continue;
                var px = pct(pd);
                var py = yCoord(parseFloat(pItem.valor), promMax);
                promPoints.push(px + ',' + py);

                var pMarker = document.createElement('div');
                pMarker.className = 'longitudinal-chart-marker longitudinal-chart-marker--prom';
                if (promSorted.length === 1) pMarker.className += ' longitudinal-chart-marker--single';
                pMarker.style.left = px + '%';
                pMarker.style.top = py + '%';
                var pNumericVal = parseFloat(pItem.valor);
                var pSevInfo = getLongSeverityInfo(promType, pNumericVal);
                var pTip = promType + ': ' + (pItem.valor || '\u2014') + ' (' + pItem.fecha + ')\n' + pSevInfo.label;
                if (pItem.interpretacion) pTip += '\n' + pItem.interpretacion;
                pMarker.setAttribute('title', pTip);
                svgArea.appendChild(pMarker);
            }
            if (promPoints.length > 0) {
                var promLine = document.createElementNS(svgNS, 'polyline');
                promLine.setAttribute('class', 'longitudinal-chart-line longitudinal-chart-line--prom');
                promLine.setAttribute('points', promPoints.join(' '));
                svgEl.appendChild(promLine);
            }
        }

        svgArea.appendChild(svgEl);
        canvas.appendChild(svgArea);

        if (hasProm) {
            var rightAxis = document.createElement('div');
            rightAxis.className = 'longitudinal-chart-yaxis longitudinal-chart-yaxis--right';
            var topTickP = document.createElement('div');
            topTickP.className = 'longitudinal-chart-yaxis__tick';
            var topValP = document.createElement('span');
            topValP.className = 'longitudinal-chart-yaxis__value';
            topValP.textContent = String(promMax);
            var topLabelP = document.createElement('span');
            topLabelP.className = 'longitudinal-chart-yaxis__label';
            topLabelP.textContent = promType || '';
            topTickP.appendChild(topValP);
            topTickP.appendChild(topLabelP);
            var botTickP = document.createElement('div');
            botTickP.className = 'longitudinal-chart-yaxis__tick';
            var botValP = document.createElement('span');
            botValP.className = 'longitudinal-chart-yaxis__value';
            botValP.textContent = '0';
            var botLabelP = document.createElement('span');
            botLabelP.className = 'longitudinal-chart-yaxis__label';
            botLabelP.textContent = 'min';
            botTickP.appendChild(botValP);
            botTickP.appendChild(botLabelP);
            rightAxis.appendChild(topTickP);
            rightAxis.appendChild(botTickP);
            canvas.appendChild(rightAxis);
        } else {
            var rightSpacer = document.createElement('div');
            rightSpacer.className = 'longitudinal-chart-yaxis';
            canvas.appendChild(rightSpacer);
        }

        track.insertBefore(canvas, track.querySelector('.longitudinal-treatment-track__axis'));

        if (hasClinical || hasProm) {
            var axisLegend = document.createElement('div');
            axisLegend.className = 'longitudinal-axis-legend';

            if (hasClinical) {
                var clinItem = document.createElement('span');
                clinItem.className = 'longitudinal-axis-legend__item';
                var clinSwatch = document.createElement('span');
                clinSwatch.className = 'longitudinal-axis-legend__swatch longitudinal-axis-legend__swatch--clinical';
                clinItem.appendChild(clinSwatch);
                clinItem.appendChild(document.createTextNode(clinicalType + ' (eje izq. 0-' + clinicalMax + ')'));
                axisLegend.appendChild(clinItem);
            }

            if (hasProm) {
                var promItem = document.createElement('span');
                promItem.className = 'longitudinal-axis-legend__item';
                var promSwatch = document.createElement('span');
                promSwatch.className = 'longitudinal-axis-legend__swatch longitudinal-axis-legend__swatch--prom';
                promItem.appendChild(promSwatch);
                promItem.appendChild(document.createTextNode(promType + ' (eje der. 0-' + promMax + ')'));
                axisLegend.appendChild(promItem);
            }

            track.appendChild(axisLegend);
        }
    }

    function renderLongLegend(container) {
        if (!container) return;
        while (container.firstChild) container.removeChild(container.firstChild);

        var panel = document.createElement('div');
        panel.className = 'longitudinal-legend-panel';

        var titleEl = document.createElement('h3');
        titleEl.className = 'longitudinal-legend-title';
        var titleIcon = document.createElement('i');
        titleIcon.className = 'fas fa-layer-group longitudinal-legend-title__icon';
        titleIcon.setAttribute('aria-hidden', 'true');
        titleEl.appendChild(titleIcon);
        titleEl.appendChild(document.createTextNode(' Umbrales demo por escala'));
        panel.appendChild(titleEl);

        var body = document.createElement('div');
        body.className = 'longitudinal-legend-body';

        var thresholds = [
            'DLQI: 0-1 sin efecto \u00b7 2-5 efecto pequeno \u00b7 6-10 efecto moderado \u00b7 11-20 efecto muy importante \u00b7 21-30 efecto extremadamente importante',
            'EVA dolor: 0-3 bajo \u00b7 4-6 moderado \u00b7 7-10 alto',
            'EVA prurito: 0-3 bajo \u00b7 4-6 moderado \u00b7 7-10 alto',
            'IHS4: 0-3 leve \u00b7 4-10 moderado \u00b7 \u226511 severo',
            'Hurley: estadio I / II / III (categorico)',
            'DAS28: <2.6 remision \u00b7 2.6-3.2 baja \u00b7 >3.2-5.1 moderada \u00b7 >5.1 alta',
            'HAQ: 0-0.5 bajo \u00b7 >0.5-1.5 moderado \u00b7 >1.5 alto'
        ];

        for (var i = 0; i < thresholds.length; i++) {
            var item = document.createElement('div');
            item.className = 'longitudinal-legend-threshold longitudinal-legend-row';
            var str = thresholds[i];
            var colonIdx = str.indexOf(':');
            if (colonIdx > -1) {
                var scaleSpan = document.createElement('span');
                scaleSpan.className = 'longitudinal-legend-scale';
                scaleSpan.textContent = str.substring(0, colonIdx + 1);
                item.appendChild(scaleSpan);
                var rangesSpan = document.createElement('span');
                rangesSpan.className = 'longitudinal-legend-ranges';
                rangesSpan.textContent = str.substring(colonIdx + 1);
                item.appendChild(rangesSpan);
            } else {
                item.textContent = str;
            }
            body.appendChild(item);
        }

        panel.appendChild(body);

        var note = document.createElement('p');
        note.className = 'longitudinal-legend-note';
        note.textContent = 'Demo exploratorio v0.3 — datos sinteticos — sin validez clinica.';
        panel.appendChild(note);

        container.appendChild(panel);
    }

    function onLongClinicalChange() {
        var clinicalSel = document.getElementById('clinical-var-select');
        if (!clinicalSel || !longCurrentCip || !longSectionReady) return;
        var patient = getLongPatient(longCurrentCip);
        if (!patient) return;
        var container = document.getElementById('longitudinal-chart-container');
        if (container) renderLongDataSeries(patient, container);
    }

    function onLongPromChange() {
        var promSel = document.getElementById('prom-select');
        if (!promSel || !longCurrentCip || !longSectionReady) return;
        var patient = getLongPatient(longCurrentCip);
        if (!patient) return;
        var container = document.getElementById('longitudinal-chart-container');
        if (container) renderLongDataSeries(patient, container);
    }

    function onToggleLegend() {
        var legendEl = document.getElementById('longitudinal-legend');
        var toggleBtn = document.getElementById('toggle-legend');
        if (!legendEl) return;
        if (legendEl.classList.contains('hidden')) {
            legendEl.classList.remove('hidden');
            if (toggleBtn) toggleBtn.textContent = 'Ocultar leyenda';
        } else {
            legendEl.classList.add('hidden');
            if (toggleBtn) toggleBtn.textContent = 'Ver leyenda';
        }
    }

    function bindLongitudinalEvents() {
        var clinicalSel = document.getElementById('clinical-var-select');
        var promSel = document.getElementById('prom-select');
        var toggleBtn = document.getElementById('toggle-legend');
        if (clinicalSel) clinicalSel.addEventListener('change', onLongClinicalChange);
        if (promSel) promSel.addEventListener('change', onLongPromChange);
        if (toggleBtn) toggleBtn.addEventListener('click', onToggleLegend);
    }

    document.addEventListener('DOMContentLoaded', () => {
        F = window.FarmaciaDemo || F;
        bindLongitudinalEvents();
        initLongitudinalSection();
        const ctx = F.getQueryContext();
        if (ctx.patientNotFound) {
            renderPatientNotFound(ctx);
            return;
        }
        const patient = ctx.patient || F.patients['CIP-DEMO-FH-001'];
        renderDashboard(patient);
        // WO8.1b — Botón Excel FH
        (function initDashExcelBtn() {
            var btn = document.getElementById('fhDashExcelExportBtn');
            if (!btn) return;
            btn.addEventListener('click', function () {
                var exp = window.FarmaciaExcelRowExport;
                if (!exp) return;
                var patient = (typeof getLongPatient === 'function' && typeof longCurrentCip !== 'undefined') ? getLongPatient(longCurrentCip) : null;
                if (!patient) { alert('No hay paciente seleccionado.'); return; }
                var lines = (typeof getPatientBiologicLines === 'function') ? getPatientBiologicLines(patient) : [];
                var opts = {
                    tipoActo: 'seguimiento',
                    visitaId: 'DASH-' + Date.now().toString(36).toUpperCase(),
                    lineaActual: Array.isArray(lines) && lines.length === 1 ? lines[0] : null,
                    fechaActo: new Date().toISOString().substring(0, 10),
                    proms: patient.proms || null,
                    demoFlag: true,
                };
                var context = exp.buildContextFromDashboard(patient, opts);
                var rowObj = exp.buildExcelRowObject(context);
                var rowArr = exp.buildExcelRowArray(rowObj);
                var sheetName = exp.getServiceSheetName(patient.servicio || '') || 'hoja correspondiente';
                exp.copyTSVRowToClipboard(rowArr, { sheetName: sheetName });
            });
        })();
    });
})();
