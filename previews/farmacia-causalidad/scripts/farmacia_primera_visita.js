'use strict';

(function () {
    const F = window.FarmaciaDemo;
    var pvAutocompleteActiveIndex = -1;

    function isTruthyRobust(value) {
        if (value === true || value === 1 || value === '1') return true;
        if (value === false || value === 0 || value === '0') return false;
        if (value === null || value === undefined || value === '') return false;
        var s = String(value).trim().toUpperCase();
        return s === 'TRUE' || s === 'SI' || s === 'S\u00CD' || s === 'YES' || s === '1';
    }

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
        { id: 1, text: 'Durante los últimos 7 días, ¿ha tenido la piel irritada, con picor, dolor o escozor?' },
        { id: 2, text: 'Durante los últimos 7 días, ¿se ha sentido incómodo/a o avergonzado/a por tener problemas en la piel?' },
        { id: 3, text: 'Durante los últimos 7 días, ¿han interferido sus problemas de piel en las actividades de compras o de cuidado de su casa o jardín?', sinRelacion: true },
        { id: 4, text: 'Durante los últimos 7 días, ¿han influido sus problemas de piel en la elección de la ropa que lleva?', sinRelacion: true },
        { id: 5, text: 'Durante los últimos 7 días, ¿han afectado sus problemas de piel a sus actividades sociales o de ocio?', sinRelacion: true },
        { id: 6, text: 'Durante los últimos 7 días, ¿le ha sido difícil practicar algún deporte a causa de sus problemas de piel?', sinRelacion: true },
        { id: 7, text: 'Durante los últimos 7 días, ¿sus problemas de piel le han impedido totalmente trabajar o estudiar?', special: true },
        { id: 8, text: 'Durante los últimos 7 días, ¿han interferido sus problemas de piel en su relación con su pareja, amigos o familiares?', sinRelacion: true },
        { id: 9, text: 'Durante los últimos 7 días, ¿le ha resultado difícil ir a la cama o dormir a causa de sus problemas de piel?', sinRelacion: true },
        { id: 10, text: 'Durante los últimos 7 días, ¿el tratamiento para su problemas de piel le ha causado problemas en su casa o le ha resultado molesto?', sinRelacion: true }
    ];

    var DLQI_STANDARD_OPTIONS = [
        { label: 'Mucho', value: 3 },
        { label: 'Bastante', value: 2 },
        { label: 'Un poco', value: 1 },
        { label: 'Nada', value: 0 }
    ];

    var DLQI_OPTIONS_WITH_NR = [
        { label: 'Mucho', value: 3 },
        { label: 'Bastante', value: 2 },
        { label: 'Un poco', value: 1 },
        { label: 'Nada', value: 0 },
        { label: 'Sin relación', value: 0 }
    ];

    var DLQI_Q7_FOLLOWUP = [
        { label: 'Bastante', value: 2 },
        { label: 'Un poco', value: 1 },
        { label: 'Nada', value: 0 },
        { label: 'Sin relación', value: 0 }
    ];

    function getDLQIInterpretation(total) {
        if (total <= 1) return 'Sin efecto sobre la calidad de vida';
        if (total <= 5) return 'Efecto leve sobre la calidad de vida';
        if (total <= 10) return 'Efecto moderado sobre la calidad de vida';
        if (total <= 20) return 'Efecto muy importante sobre la calidad de vida';
        return 'Efecto extremadamente importante sobre la calidad de vida';
    }

    function getDLQIAnswer(q) {
        if (q.special) {
            var aRadio = document.querySelector('input[name="dlqi_q7_a"]:checked');
            if (aRadio) {
                if (aRadio.getAttribute('data-dlqi-val') !== null) {
                    return { score: aRadio.getAttribute('data-dlqi-val'), text: 'Sí' };
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

        var periodHeader = document.createElement('div');
        periodHeader.className = 'dlqi-period';
        periodHeader.textContent = 'DURANTE LOS ÚLTIMOS 7 DÍAS';
        container.appendChild(periodHeader);

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
                optionsRow.appendChild(createDLQIOption(7, 'a', 'Sí', 3, false));
                optionsRow.appendChild(createDLQIOption(7, 'a', 'No', null, true));
                card.appendChild(optionsRow);
                var followUp = document.createElement('div');
                followUp.className = 'dlqi-card__followup hidden';
                var fuLabel = document.createElement('span');
                fuLabel.className = 'dlqi-card__followup-label';
                fuLabel.textContent = 'Durante los últimos 7 días, ¿le han molestado sus problemas de piel en su trabajo o en sus estudios?';
                followUp.appendChild(fuLabel);
                var fuOptions = document.createElement('div');
                fuOptions.className = 'dlqi-card__options dlqi-card__options--followup';
                DLQI_Q7_FOLLOWUP.forEach(function (opt) {
                    fuOptions.appendChild(createDLQIOption(7, 'b', opt.label, opt.value, false));
                });
                followUp.appendChild(fuOptions);
                card.appendChild(followUp);
            } else {
                var opts = q.sinRelacion ? DLQI_OPTIONS_WITH_NR : DLQI_STANDARD_OPTIONS;
                opts.forEach(function (opt) {
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
        var meta = getSnapshotMetaForExport();
        if (meta) {
            lines.push('Código nacional: ' + (meta.codigo_nacional || '—'));
            lines.push('N.º registro: ' + (meta.nregistro || '—'));
            lines.push('Origen catálogo: ' + (meta.source_type || '—'));
            lines.push('ID fármaco seleccionado: ' + (meta.selected_drug_id || '—'));
        }
        lines.push('Inducción realizada: ' + (fv('fhPvInduccionRealizada') || '—'));
        lines.push('Fecha primera visita: ' + (fv('fhPvFecha') || '—'));
        lines.push('PROM basal: ' + (fv('fhPvProms') || '—'));
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
        lines.push('Generado por: Hub Clínico Badajoz — Demo Farmacia v0.2');
        lines.push('ATENCIÓN: Datos sintéticos. No usar para decisiones clínicas reales.');
        return lines;
    }

    function searchCIP() {
        var cipInput = document.getElementById('fhPvCip');
        if (!cipInput) return;
        var cip = cipInput.value.trim();
        if (!cip) return;

        var patient = F.patients[cip];
        clearCipNotice();

        if (!patient) {
            var fieldsToClear = ['fhPvServicio', 'fhPvPatologia', 'fhPvFarmaco', 'fhPvDosis', 'fhPvPauta', 'fhPvVia', 'fhPvFechaValidacion', 'fhPvInduccionSolicitada', 'fhPvAnalitica'];
            for (var i = 0; i < fieldsToClear.length; i++) {
                var el = document.getElementById(fieldsToClear[i]);
                if (el) el.value = '';
            }
            var grid = document.getElementById('fhPvTratamientoGrid');
            if (grid) F.clearChildren(grid);
            var drugSearchInput = document.getElementById('fhPvDrugSearch');
            if (drugSearchInput) drugSearchInput.value = '';
            var C2 = getCatalog();
            if (C2 && C2.clearSnapshot) C2.clearSnapshot();
            showDrugAutocomplete();
            showCipNotice('Paciente no encontrado en demo. Puede completar los datos manualmente.', 'warning');
            return;
        }

        F.setValue('fhPvCip', patient.cip);
        F.setValue('fhPvServicio', patient.servicio);
        F.setValue('fhPvPatologia', patient.patologia);
        F.setValue('fhPvFarmaco', patient.farmaco);
        F.setValue('fhPvDosis', patient.dosis);
        F.setValue('fhPvPauta', patient.pauta);
        F.setValue('fhPvVia', patient.via);
        F.setValue('fhPvFechaValidacion', patient.fechaSolicitud);
        F.setValue('fhPvInduccionSolicitada', patient.estado === 'pending' ? 'Pendiente de confirmar' : 'No');
        F.setValue('fhPvAnalitica', patient.analitica);

        var C = getCatalog();
        if (C && C.clearSnapshot) C.clearSnapshot();
        applyTratamientoValidado({ patient: patient });

        hideDrugAutocomplete();
        clearCipNotice();

        var banner = document.getElementById('fhPvNoCipBanner');
        if (banner) banner.parentNode.removeChild(banner);
    }

    function clearCipNotice() {
        var notice = document.getElementById('fhPvCipSearchNotice');
        if (notice) notice.parentNode.removeChild(notice);
    }

    function showCipNotice(msg, type) {
        var cipInput = document.getElementById('fhPvCip');
        if (!cipInput) return;
        var div = document.createElement('div');
        div.id = 'fhPvCipSearchNotice';
        div.className = 'notice-box notice-box--' + (type === 'warning' ? 'warning' : 'info');
        var icon = document.createElement('i');
        icon.className = type === 'warning' ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle';
        icon.setAttribute('aria-hidden', 'true');
        div.appendChild(icon);
        div.appendChild(document.createTextNode(' ' + msg));
        var fg = cipInput.closest('.form-group');
        if (fg) fg.insertAdjacentElement('afterend', div);
    }

    function showDrugAutocomplete() {
        var block = document.getElementById('fhPvAutocompleteBlock');
        if (block) block.classList.remove('hidden');
    }

    function hideDrugAutocomplete() {
        var block = document.getElementById('fhPvAutocompleteBlock');
        if (block) block.classList.add('hidden');
        clearDrugAutocompleteDropdown();
    }

    function getCatalog() {
        try { return window.FarmaciaCatalog; } catch (e) { return null; }
    }

    function clearDrugAutocompleteDropdown() {
        var dropdown = document.getElementById('fhPvAutocompleteDropdown');
        if (dropdown) {
            F.clearChildren(dropdown);
            dropdown.classList.add('hidden');
        }
        pvAutocompleteActiveIndex = -1;
    }

    function renderDrugAutocompleteDropdown(results) {
        var dropdown = document.getElementById('fhPvAutocompleteDropdown');
        if (!dropdown) return;
        F.clearChildren(dropdown);
        if (!results || results.length === 0) {
            dropdown.classList.add('hidden');
            return;
        }
        var maxResults = Math.min(results.length, 15);
        for (var i = 0; i < maxResults; i++) {
            var drug = results[i];
            var item = document.createElement('div');
            item.className = 'autocomplete-item';
            if (i === pvAutocompleteActiveIndex) item.classList.add('autocomplete-item--active');

            var mainRow = document.createElement('div');
            mainRow.className = 'autocomplete-item-main';

            var nameSpan = document.createElement('span');
            nameSpan.className = 'autocomplete-item-name';
            nameSpan.textContent = drug.display_name || drug.nombre_comercial || '\u2014';
            mainRow.appendChild(nameSpan);

            if (isTruthyRobust(drug.es_hospitalario)) {
                var hospTag = document.createElement('span');
                hospTag.className = 'drug-tag drug-tag--hosp';
                hospTag.textContent = 'HOSP';
                mainRow.appendChild(hospTag);
            }
            if (isTruthyRobust(drug.biosimilar)) {
                var bioTag = document.createElement('span');
                bioTag.className = 'drug-tag drug-tag--bio';
                bioTag.textContent = 'BIO';
                mainRow.appendChild(bioTag);
            }
            var sourceType = (drug.source_type || '').toLowerCase();
            var sourceTag = document.createElement('span');
            sourceTag.className = 'drug-source-tag drug-source-tag--' + (sourceType === 'cima' ? 'cima' : 'local');
            sourceTag.textContent = drug.source_type || '—';
            mainRow.appendChild(sourceTag);

            item.appendChild(mainRow);

            var detailRow = document.createElement('div');
            detailRow.className = 'autocomplete-item-detail';
            var parts = [];
            if (drug.principio_activo) parts.push(drug.principio_activo);
            if (drug.dosis) parts.push(drug.dosis);
            if (drug.via) parts.push(drug.via);
            if (drug.codigo_nacional) parts.push('CN ' + drug.codigo_nacional);
            detailRow.textContent = parts.join(' \u00B7 ');
            item.appendChild(detailRow);

            (function (d) {
                item.addEventListener('click', function () {
                    selectDrugPV(d);
                });
            })(drug);

            dropdown.appendChild(item);
        }
        dropdown.classList.remove('hidden');
        pvAutocompleteActiveIndex = -1;
    }

    function selectDrugPV(drug) {
        var C = getCatalog();
        if (!C || !drug) return;

        F.setValue('fhPvFarmaco', drug.display_name || drug.nombre_comercial || '');
        F.setValue('fhPvDosis', drug.dosis || drug.nombre_presentacion || '');
        F.setValue('fhPvVia', drug.via || '');

        C.selectDrug(drug);
        applyTratamientoValidado({});

        clearDrugAutocompleteDropdown();
        var searchInput = document.getElementById('fhPvDrugSearch');
        if (searchInput) {
            searchInput.value = drug.display_name || drug.nombre_comercial || '';
        }
    }

    function handleDrugSearchInput() {
        var C = getCatalog();
        if (!C || !C.loaded) return;
        var input = document.getElementById('fhPvDrugSearch');
        if (!input) return;
        var query = input.value.trim();
        if (query.length < 2) {
            clearDrugAutocompleteDropdown();
            return;
        }
        var results = C.search(query);
        renderDrugAutocompleteDropdown(results);
    }

    function initDrugAutocomplete() {
        var input = document.getElementById('fhPvDrugSearch');
        if (!input) return;

        input.addEventListener('input', handleDrugSearchInput);
        input.addEventListener('keydown', function (event) {
            var dropdown = document.getElementById('fhPvAutocompleteDropdown');
            if (!dropdown || dropdown.classList.contains('hidden')) return;
            var items = dropdown.querySelectorAll('.autocomplete-item');
            if (items.length === 0) return;

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                pvAutocompleteActiveIndex = Math.min(pvAutocompleteActiveIndex + 1, items.length - 1);
                for (var k = 0; k < items.length; k++) {
                    items[k].classList.toggle('autocomplete-item--active', k === pvAutocompleteActiveIndex);
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                pvAutocompleteActiveIndex = Math.max(pvAutocompleteActiveIndex - 1, -1);
                for (var j = 0; j < items.length; j++) {
                    items[j].classList.toggle('autocomplete-item--active', j === pvAutocompleteActiveIndex);
                }
            } else if (event.key === 'Enter') {
                if (pvAutocompleteActiveIndex >= 0 && pvAutocompleteActiveIndex < items.length) {
                    event.preventDefault();
                    items[pvAutocompleteActiveIndex].click();
                }
            } else if (event.key === 'Escape') {
                clearDrugAutocompleteDropdown();
            }
        });

        input.addEventListener('blur', function () {
            setTimeout(function () {
                if (!document.activeElement || !document.getElementById('fhPvAutocompleteDropdown').contains(document.activeElement)) {
                    clearDrugAutocompleteDropdown();
                }
            }, 150);
        });

        var catalog = getCatalog();
        if (catalog) {
            catalog.autoLoad();
        }
    }

    function getSnapshotMetaForExport() {
        var C = getCatalog();
        if (!C) return null;
        var snap = C.getSnapshot ? C.getSnapshot() : C.selectedSnapshot;
        if (!snap || !snap.selected_drug_id) return null;
        return {
            codigo_nacional: snap.codigo_nacional_snapshot || '',
            nregistro: snap.nregistro_snapshot || '',
            source_type: snap.source_type || '',
            selected_drug_id: snap.selected_drug_id || ''
        };
    }

    function initCipSearch() {
        var cipInput = document.getElementById('fhPvCip');
        if (!cipInput) return;

        cipInput.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            searchCIP();
        });

        var btn = document.getElementById('fhPvCipSearchBtn');
        if (btn) btn.addEventListener('click', searchCIP);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const ctx = F.getQueryContext();

        if (ctx.cip && !ctx.patient) {
            var C = window.FarmaciaCatalog;
            if (C && C.clearSnapshot) C.clearSnapshot();
        }

        applyContext(ctx);
        applyTratamientoValidado(ctx);
        renderDLQI();
        setupEVASliders();
        setupPromsToggle();
        initCipSearch();
        initDrugAutocomplete();

        if (!ctx.patient) {
            showDrugAutocomplete();
        }

        const exportTxt = document.getElementById('fhPvExportTxt');
        if (exportTxt) exportTxt.addEventListener('click', () => {
            F.downloadFile('primera_visita_FH_' + new Date().toISOString().slice(0, 10) + '.txt', buildPVLines().join('\n'), 'text/plain;charset=utf-8');
        });

        const exportCsv = document.getElementById('fhPvExportCsv');
        if (exportCsv) exportCsv.addEventListener('click', () => {
            var pa = getPrincipioActivo();
            var dlqiTotalExport = (getPromsBasal() === 'Sí' && isPromsExpandedVisible()) ? getDLQITotal() : '';
            var dlqiInterpExport = (getPromsBasal() === 'Sí' && isPromsExpandedVisible()) ? (document.getElementById('fhPvDlqiInterp') && document.getElementById('fhPvDlqiInterp').textContent || '').replace(/^ — /, '').trim() : '';
            var evaDolorExport = (getPromsBasal() === 'Sí' && isPromsExpandedVisible()) ? getEVADolor() : '';
            var evaPruritoExport = (getPromsBasal() === 'Sí' && isPromsExpandedVisible()) ? getEVAPrurito() : '';
            var meta = getSnapshotMetaForExport();
            var rows = [
                ['ID', 'FechaExportacion', 'CIP', 'Servicio', 'Patologia', 'TratamientoValidado', 'PrincipioActivo', 'PresentacionDosis', 'Pauta', 'Via', 'CodigoNacional', 'NRegistro', 'OrigenCatalogo', 'SelectedDrugId', 'FechaPrimeraVisita', 'InduccionRealizada', 'PROMBasal', 'DLQITotal', 'DLQIInterpretacion', 'EVADolor', 'EVAPrurito', 'Observaciones'],
                ['FH-PV-' + Date.now().toString(36).toUpperCase(), new Date().toLocaleDateString('es-ES'), fv('fhPvCip') || '—', fv('fhPvServicio') || '—', fv('fhPvPatologia') || '—', fv('fhPvFarmaco') || '—', pa || '—', fv('fhPvDosis') || '—', fv('fhPvPauta') || '—', fv('fhPvVia') || '—', (meta && meta.codigo_nacional) || '—', (meta && meta.nregistro) || '—', (meta && meta.source_type) || '—', (meta && meta.selected_drug_id) || '—', fv('fhPvFecha') || '—', fv('fhPvInduccionRealizada') || '—', fv('fhPvProms') || '—', dlqiTotalExport || '—', dlqiInterpExport || '—', evaDolorExport || '—', evaPruritoExport || '—', fv('fhPvNotas') || '—']
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
