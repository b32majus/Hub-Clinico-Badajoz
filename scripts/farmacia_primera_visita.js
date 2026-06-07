'use strict';

(function () {
    const F = window.FarmaciaDemo;

    function applyContext(ctx) {
        F.setValue('fhPvCip', ctx.cip);
        F.setValue('fhPvServicio', ctx.servicio || ctx.patient?.servicio);
        F.setValue('fhPvPatologia', ctx.patologia || ctx.patient?.patologia);
        if (ctx.patient) {
            F.setValue('fhPvFarmaco', ctx.patient.farmaco);
            F.setValue('fhPvDosis', ctx.patient.dosis);
            F.setValue('fhPvPauta', ctx.patient.pauta);
            F.setValue('fhPvVia', ctx.patient.via);
            F.setValue('fhPvFechaValidacion', ctx.patient.fechaSolicitud);
            F.setValue('fhPvInduccionSolicitada', ctx.patient.estado === 'pending' ? 'Pendiente de confirmar' : 'No');
            F.setValue('fhPvAnalitica', ctx.patient.analitica);
        }
        if (!ctx.cip && !ctx.patient) F.insertNoCipBanner('fhPvNoCipBanner');
    }

    function applyTratamientoValidado(ctx) {
        const container = document.getElementById('fhPvTratamientoGrid');
        if (!container) return;

        let C = null;
        let snapshot = null;
        try { C = window.FarmaciaCatalog; } catch (e) { /* noop */ }
        if (C) snapshot = C.getSnapshot ? C.getSnapshot() : C.selectedSnapshot;

        const fields = [];

        if (snapshot) {
            const st = (snapshot.source_type || '').toLowerCase();
            const origen = st === 'cima' ? 'CIMA'
                : st === 'local' || st === 'local_especial' ? 'Local Especial'
                : st === 'local_pendiente_demo' ? 'Demo/local pendiente' : '—';
            const codigo = snapshot.codigo_nacional_snapshot || snapshot.nregistro_snapshot || '—';

            const etiquetas = [];
            if (snapshot.etiquetas) {
                if (snapshot.etiquetas.es_hospitalario) etiquetas.push('HOSP');
                if (snapshot.etiquetas.biosimilar) etiquetas.push('BIO');
            }
            if (st === 'local' || st === 'local_especial') etiquetas.push('Local Especial');
            const etiquetasStr = etiquetas.length ? etiquetas.join(' · ') : '—';

            fields.push(
                { label: 'Fármaco / marca comercial', value: snapshot.nombre_snapshot || '—' },
                { label: 'Principio activo', value: snapshot.principio_activo_snapshot || '—' },
                { label: 'Presentación / dosis', value: snapshot.presentacion_snapshot || '—' },
                { label: 'Vía', value: snapshot.via_snapshot || '—' },
                { label: 'Pauta / intervalo', value: (ctx.patient && ctx.patient.pauta) || '—' },
                { label: 'Origen catálogo', value: origen },
                { label: 'Código nacional / n.º registro', value: codigo },
                { label: 'Etiquetas', value: etiquetasStr }
            );
        } else if (ctx.patient) {
            fields.push(
                { label: 'Fármaco / marca comercial', value: ctx.patient.farmaco || '—' },
                { label: 'Principio activo', value: ctx.patient.principioActivo || ctx.patient.farmaco || '—' },
                { label: 'Presentación / dosis', value: ctx.patient.dosis || '—' },
                { label: 'Vía', value: ctx.patient.via || '—' },
                { label: 'Pauta / intervalo', value: ctx.patient.pauta || '—' },
                { label: 'Origen catálogo', value: 'Demo' },
                { label: 'Código nacional / n.º registro', value: '—' },
                { label: 'Etiquetas', value: '—' }
            );
        }

        if (fields.length) F.renderFields(container, fields);
    }

    function fv(id) { const el = document.getElementById(id); return el ? (el.value || '').trim() : ''; }

    // ---- T12: DLQI data and functions ----

    var DLQI_QUESTIONS = [
        { id: 1, text: 'Durante la última semana, ¿ha sentido picor, dolor o escozor en la piel?' },
        { id: 2, text: 'Durante la última semana, ¿se ha sentido avergonzado/a o cohibido/a por su piel?' },
        { id: 3, text: 'Durante la última semana, ¿le ha interferido su piel para ir de compras, cuidar la casa o el jardín?' },
        { id: 4, text: 'Durante la última semana, ¿ha influido su piel en la ropa que lleva?' },
        { id: 5, text: 'Durante la última semana, ¿ha afectado su piel a actividades sociales o de ocio?' },
        { id: 6, text: 'Durante la última semana, ¿le ha dificultado su piel practicar deporte?' },
        { id: 7, text: 'Durante la última semana, ¿su piel le ha impedido trabajar o estudiar?', special: true },
        { id: 8, text: 'Durante la última semana, ¿ha creado su piel problemas con su pareja, amigos o familiares?' },
        { id: 9, text: 'Durante la última semana, ¿ha causado su piel dificultades sexuales?' },
        { id: 10, text: 'Durante la última semana, ¿ha sido un problema el tratamiento de su piel?' }
    ];

    var DLQI_STANDARD_OPTIONS = [
        { label: 'Mucho', value: 3 },
        { label: 'Bastante', value: 2 },
        { label: 'Un poco', value: 1 },
        { label: 'Nada', value: 0 }
    ];

    var DLQI_Q7_FOLLOWUP = [
        { label: 'Bastante', value: 2 },
        { label: 'Un poco', value: 1 },
        { label: 'Nada', value: 0 },
        { label: 'Sin relación', value: 0 }
    ];

    function getDLQIInterpretation(total) {
        if (total <= 1) return 'Sin efecto sobre la calidad de vida';
        if (total <= 5) return 'Efecto leve';
        if (total <= 10) return 'Efecto moderado';
        if (total <= 20) return 'Efecto importante';
        return 'Efecto muy importante';
    }

    function getDLQIAnswer(q) {
        if (q.special) {
            var aRadio = document.querySelector('input[name="dlqi_q7_a"]:checked');
            if (aRadio) {
                if (aRadio.getAttribute('data-dlqi-val') !== null) {
                    return { score: aRadio.getAttribute('data-dlqi-val'), text: 'Sí, me ha impedido' };
                }
                var bRadio = document.querySelector('input[name="dlqi_q7_b"]:checked');
                if (bRadio) {
                    var bLabel = (bRadio.parentElement.textContent || '').trim();
                    return { score: bRadio.getAttribute('data-dlqi-val'), text: 'No — ' + bLabel };
                }
            }
        } else {
            var radio = document.querySelector('input[name="dlqi_q' + q.id + '"]:checked');
            if (radio) {
                var label = (radio.parentElement.textContent || '').trim();
                return { score: radio.getAttribute('data-dlqi-val'), text: label };
            }
        }
        return null;
    }

    function calculateDLQI() {
        var total = 0;
        var answered = 0;
        DLQI_QUESTIONS.forEach(function (q) {
            if (q.special) {
                var aRadio = document.querySelector('input[name="dlqi_q7_a"]:checked');
                if (aRadio) {
                    var val = aRadio.getAttribute('data-dlqi-val');
                    if (val !== null) {
                        total += parseInt(val, 10);
                        answered++;
                    } else {
                        var bRadio = document.querySelector('input[name="dlqi_q7_b"]:checked');
                        if (bRadio && bRadio.getAttribute('data-dlqi-val') !== null) {
                            total += parseInt(bRadio.getAttribute('data-dlqi-val'), 10);
                            answered++;
                        }
                    }
                }
            } else {
                var radio = document.querySelector('input[name="dlqi_q' + q.id + '"]:checked');
                if (radio) {
                    total += parseInt(radio.getAttribute('data-dlqi-val'), 10);
                    answered++;
                }
            }
        });
        var totalEl = document.getElementById('fhPvDlqiTotal');
        var interpEl = document.getElementById('fhPvDlqiInterp');
        if (totalEl) totalEl.textContent = String(total);
        if (interpEl) {
            interpEl.textContent = answered === DLQI_QUESTIONS.length
                ? ' — ' + getDLQIInterpretation(total)
                : ' — (responda todas las preguntas para ver la interpretación)';
        }
        return total;
    }

    function handleDLQIChange(e) {
        if (e.target.hasAttribute('data-dlqi-q7-trigger')) {
            var card = e.target.closest('.dlqi-card');
            if (card) {
                var followUp = card.querySelector('.dlqi-card__followup');
                if (followUp) {
                    followUp.classList.toggle('hidden');
                    if (followUp.classList.contains('hidden')) {
                        var radios = followUp.querySelectorAll('input[type="radio"]');
                        for (var i = 0; i < radios.length; i++) radios[i].checked = false;
                    }
                }
            }
        }
        calculateDLQI();
    }

    function createDLQIOption(qId, suffix, label, value, isQ7Trigger) {
        var wrapper = document.createElement('label');
        wrapper.className = 'dlqi-option';
        var input = document.createElement('input');
        input.type = 'radio';
        input.name = 'dlqi_q' + qId + (suffix ? '_' + suffix : '');
        input.setAttribute('data-dlqi-q', String(qId));
        if (typeof value === 'number') input.setAttribute('data-dlqi-val', String(value));
        if (isQ7Trigger) input.setAttribute('data-dlqi-q7-trigger', '');
        input.addEventListener('change', handleDLQIChange);
        wrapper.appendChild(input);
        wrapper.appendChild(document.createTextNode(' ' + label));
        return wrapper;
    }

    function renderDLQI() {
        var container = document.getElementById('fhPvDlqiQuestions');
        if (!container) return;
        F.clearChildren(container);
        DLQI_QUESTIONS.forEach(function (q) {
            var card = document.createElement('div');
            card.className = 'dlqi-card';
            var qText = document.createElement('div');
            qText.className = 'dlqi-card__question';
            qText.textContent = q.id + '. ' + q.text;
            card.appendChild(qText);
            var optionsRow = document.createElement('div');
            optionsRow.className = 'dlqi-card__options';
            if (q.special) {
                optionsRow.appendChild(createDLQIOption(7, 'a', 'Sí, me ha impedido', 3, false));
                optionsRow.appendChild(createDLQIOption(7, 'a', 'No', null, true));
                card.appendChild(optionsRow);
                var followUp = document.createElement('div');
                followUp.className = 'dlqi-card__followup hidden';
                var fuLabel = document.createElement('span');
                fuLabel.className = 'dlqi-card__followup-label';
                fuLabel.textContent = 'Si no: ¿cuánto problema le ha causado en el trabajo o estudios?';
                followUp.appendChild(fuLabel);
                var fuOptions = document.createElement('div');
                fuOptions.className = 'dlqi-card__options dlqi-card__options--followup';
                DLQI_Q7_FOLLOWUP.forEach(function (opt) {
                    fuOptions.appendChild(createDLQIOption(7, 'b', opt.label, opt.value, false));
                });
                followUp.appendChild(fuOptions);
                card.appendChild(followUp);
            } else {
                DLQI_STANDARD_OPTIONS.forEach(function (opt) {
                    optionsRow.appendChild(createDLQIOption(q.id, null, opt.label, opt.value, false));
                });
                card.appendChild(optionsRow);
            }
            container.appendChild(card);
        });
    }

    function setupEVASliders() {
        var dolorRange = document.getElementById('fhPvEvaDolorRange');
        var dolorValue = document.getElementById('fhPvEvaDolorValue');
        var pruritoRange = document.getElementById('fhPvEvaPruritoRange');
        var pruritoValue = document.getElementById('fhPvEvaPruritoValue');
        if (dolorRange && dolorValue) {
            dolorRange.addEventListener('input', function () {
                dolorValue.textContent = this.value;
            });
        }
        if (pruritoRange && pruritoValue) {
            pruritoRange.addEventListener('input', function () {
                pruritoValue.textContent = this.value;
            });
        }
    }

    function setupPromsToggle() {
        var promsSelect = document.getElementById('fhPvProms');
        var expanded = document.getElementById('fhPvPromsExpanded');
        if (!promsSelect || !expanded) return;
        function toggle() {
            if (promsSelect.value === 'Sí') {
                expanded.classList.remove('hidden');
                calculateDLQI();
            } else {
                expanded.classList.add('hidden');
            }
        }
        promsSelect.addEventListener('change', toggle);
        toggle();
    }

    function getEVADolor() {
        var el = document.getElementById('fhPvEvaDolorValue');
        return el ? el.textContent : '—';
    }

    function getEVAPrurito() {
        var el = document.getElementById('fhPvEvaPruritoValue');
        return el ? el.textContent : '—';
    }

    function getDLQITotal() {
        var el = document.getElementById('fhPvDlqiTotal');
        return el ? el.textContent : '—';
    }

    function isPromsExpandedVisible() {
        var el = document.getElementById('fhPvPromsExpanded');
        return el && !el.classList.contains('hidden');
    }

    function getPromsBasal() {
        return fv('fhPvProms');
    }

    function getPrincipioActivo() {
        try {
            var C = window.FarmaciaCatalog;
            if (C) {
                var snap = C.getSnapshot ? C.getSnapshot() : C.selectedSnapshot;
                if (snap && snap.principio_activo_snapshot) return snap.principio_activo_snapshot;
            }
        } catch (e) { /* noop */ }
        try {
            var p = window.FarmaciaDemo.getQueryContext().patient;
            if (p && p.principioActivo) return p.principioActivo;
        } catch (e) { /* noop */ }
        return '';
    }

    function buildPVLines() {
        var pa = getPrincipioActivo();
        var cuestionario = fv('fhPvCuestionario');
        var resultado = fv('fhPvResultadoBasal');

        var lines = [];
        lines.push('=== INFORME DE PRIMERA VISITA FARMACIA ===');
        lines.push('Identificador demo: FH-PV-' + Date.now().toString(36).toUpperCase());
        lines.push('Fecha exportación: ' + new Date().toLocaleDateString('es-ES'));
        lines.push('');
        lines.push('CIP: ' + (fv('fhPvCip') || '—'));
        lines.push('Servicio: ' + (fv('fhPvServicio') || '—'));
        lines.push('Patología: ' + (fv('fhPvPatologia') || '—'));
        lines.push('Tratamiento validado: ' + (fv('fhPvFarmaco') || '—'));
        lines.push('Principio activo: ' + (pa || '—'));
        lines.push('Presentación/dosis: ' + (fv('fhPvDosis') || '—'));
        lines.push('Vía: ' + (fv('fhPvVia') || '—'));
        lines.push('Pauta: ' + (fv('fhPvPauta') || '—'));
        lines.push('Inducción realizada: ' + (fv('fhPvInduccionRealizada') || '—'));
        lines.push('Fecha primera visita: ' + (fv('fhPvFecha') || '—'));
        lines.push('PROM basal: ' + (fv('fhPvProms') || '—'));
        if (cuestionario && cuestionario !== 'No aplica')
            lines.push('Cuestionario: ' + cuestionario);
        if (resultado && !isPromsExpandedVisible())
            lines.push('Resultado basal: ' + resultado);
        if (getPromsBasal() === 'Sí' && isPromsExpandedVisible()) {
            lines.push('');
            lines.push('--- PROMs DLQI detallado ---');
            var anyDlqi = false;
            DLQI_QUESTIONS.forEach(function (q) {
                var ans = getDLQIAnswer(q);
                if (ans) {
                    anyDlqi = true;
                    lines.push('DLQI Q' + q.id + ': ' + ans.score + ' (' + ans.text + ')');
                }
            });
            if (!anyDlqi) lines.push('DLQI: sin respuestas registradas');
            lines.push('DLQI total: ' + getDLQITotal() + '/30');
            var interp = (document.getElementById('fhPvDlqiInterp') && document.getElementById('fhPvDlqiInterp').textContent || '').replace(/^ — /, '').trim();
            if (interp) lines.push('DLQI interpretación: ' + interp);
            lines.push('');
            lines.push('--- PROMs EVA ---');
            lines.push('EVA Dolor: ' + getEVADolor() + '/10');
            lines.push('EVA Prurito: ' + getEVAPrurito() + '/10');
        }
        lines.push('Observaciones: ' + (fv('fhPvNotas') || '—'));
        lines.push('');
        lines.push('=== FIN DEL INFORME ===');
        lines.push('Generado por: Hub Clínico Badajoz — Demo Farmacia v0.1');
        lines.push('ATENCIÓN: Datos sintéticos. No usar para decisiones clínicas reales.');
        return lines;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const ctx = F.getQueryContext();
        applyContext(ctx);
        applyTratamientoValidado(ctx);
        renderDLQI();
        setupEVASliders();
        setupPromsToggle();

        const exportTxt = document.getElementById('fhPvExportTxt');
        if (exportTxt) exportTxt.addEventListener('click', () => {
            F.downloadFile('primera_visita_FH_' + new Date().toISOString().slice(0, 10) + '.txt', buildPVLines().join('\n'), 'text/plain;charset=utf-8');
        });

        const exportCsv = document.getElementById('fhPvExportCsv');
        if (exportCsv) exportCsv.addEventListener('click', () => {
            var pa = getPrincipioActivo();
            var cuestionario = fv('fhPvCuestionario');
            var resultado = fv('fhPvResultadoBasal');
            var dlqiTotalExport = (getPromsBasal() === 'Sí' && isPromsExpandedVisible()) ? getDLQITotal() : '';
            var dlqiInterpExport = (getPromsBasal() === 'Sí' && isPromsExpandedVisible()) ? (document.getElementById('fhPvDlqiInterp') && document.getElementById('fhPvDlqiInterp').textContent || '').replace(/^ — /, '').trim() : '';
            var evaDolorExport = (getPromsBasal() === 'Sí' && isPromsExpandedVisible()) ? getEVADolor() : '';
            var evaPruritoExport = (getPromsBasal() === 'Sí' && isPromsExpandedVisible()) ? getEVAPrurito() : '';
            var rows = [
                ['ID', 'FechaExportacion', 'CIP', 'Servicio', 'Patologia', 'TratamientoValidado', 'PrincipioActivo', 'PresentacionDosis', 'Pauta', 'Via', 'FechaPrimeraVisita', 'InduccionRealizada', 'PROMBasal', 'Cuestionario', 'DLQITotal', 'DLQIInterpretacion', 'EVADolor', 'EVAPrurito', 'ResultadoBasal', 'Observaciones'],
                ['FH-PV-' + Date.now().toString(36).toUpperCase(), new Date().toLocaleDateString('es-ES'), fv('fhPvCip') || '—', fv('fhPvServicio') || '—', fv('fhPvPatologia') || '—', fv('fhPvFarmaco') || '—', pa || '—', fv('fhPvDosis') || '—', fv('fhPvPauta') || '—', fv('fhPvVia') || '—', fv('fhPvFecha') || '—', fv('fhPvInduccionRealizada') || '—', fv('fhPvProms') || '—', cuestionario || '—', dlqiTotalExport || '—', dlqiInterpExport || '—', evaDolorExport || '—', evaPruritoExport || '—', resultado || '—', fv('fhPvNotas') || '—']
            ];
            const csv = rows.map(function (row) {
                return row.map(function (cell) {
                    return '"' + String(cell).replace(/"/g, '""') + '"';
                }).join(',');
            }).join('\n');
            F.downloadFile('primeras_visitas_FH_' + new Date().toISOString().slice(0, 10) + '.csv', csv, 'text/csv;charset=utf-8');
        });
    });
})();
