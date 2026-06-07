'use strict';

(function () {
    const F = window.FarmaciaDemo;
    const correctAnswers = { mg1: 'no', mg2: 'si', mg3: 'no', mg4: 'no' };

    function isTruthyRobust(value) {
        if (value === true || value === 1 || value === '1') return true;
        if (value === false || value === 0 || value === '0') return false;
        if (value === null || value === undefined || value === '') return false;
        var s = String(value).trim().toUpperCase();
        return s === 'TRUE' || s === 'SI' || s === 'S\u00CD' || s === 'YES' || s === '1';
    }

    var segAutocompleteActiveIndex = -1;

    function applyContext() {
        const ctx = F.getQueryContext();

        if (ctx.cip && !ctx.patient) {
            var C = window.FarmaciaCatalog;
            if (C && C.clearSnapshot) C.clearSnapshot();
        }

        F.setValue('fhSegCip', ctx.cip);
        F.setValue('fhSegServicio', ctx.servicio || ctx.patient?.servicio);
        F.setValue('fhSegPatologia', ctx.patologia || ctx.patient?.patologia);

        const snap = window.FarmaciaCatalog ? window.FarmaciaCatalog.getSnapshot() : null;

        if (ctx.patient) {
            F.setValue('fhSegFarmaco', snap?.nombre_snapshot || ctx.patient.farmaco);
            F.setValue('fhSegDosisActual', ctx.patient.dosis);
            F.setValue('fhSegPautaActual', ctx.patient.pauta);
            F.setValue('fhSegVia', ctx.patient.via);
            F.setValue('fhSegFechaInicio', ctx.patient.primeraVisita);
            F.setValue('fhSegUltimaAdherencia', ctx.patient.adherencia);
            F.setValue('fhSegUltimosProms', ctx.patient.proms);
            F.setValue('fhSegEaPrevios', ctx.patient.efectosAdversos);

            F.setValue('fhSegPrincipioActivo', snap?.principio_activo_snapshot || ctx.patient.principioActivo || '');
            F.setValue('fhSegPresentacion', snap?.presentacion_snapshot || '');
        }

        if (snap) {
            F.setValue('fhSegCodigoNacional', snap.codigo_nacional_snapshot || '');
            F.setValue('fhSegNregistro', snap.nregistro_snapshot || '');
            var tags = [];
            if (snap.etiquetas && snap.etiquetas.biosimilar) tags.push('Biosimilar');
            if (snap.etiquetas && snap.etiquetas.es_hospitalario) tags.push('Hospitalario');
            F.setValue('fhSegEtiquetas', tags.length ? tags.join(', ') : '\u2014');
        } else {
            F.setValue('fhSegCodigoNacional', '');
            F.setValue('fhSegNregistro', '');
            F.setValue('fhSegEtiquetas', '');
        }

        (function setOrigenCatalogo() {
            var sourceType = snap ? (snap.source_type || '').toString().toUpperCase() : '';
            var label;
            if (!snap) {
                label = 'Demo';
            } else if (sourceType === 'CIMA') {
                label = 'CIMA';
            } else if (sourceType === 'LOCAL') {
                label = 'Local Especial';
            } else if (sourceType === 'LOCAL_PENDIENTE_DEMO') {
                label = 'Demo/local pendiente';
            } else {
                label = 'Demo';
            }
            F.setValue('fhSegOrigenCatalogo', label);
        })();

        const fhSegFecha = document.getElementById('fhSegFecha');
        if (fhSegFecha && !fhSegFecha.value) {
            fhSegFecha.value = new Date().toISOString().slice(0, 10);
        }
        if (!ctx.cip && !ctx.patient) F.insertNoCipBanner('fhSegNoCipBanner');
    }

    var cipSearchFields = [
        'fhSegServicio', 'fhSegPatologia', 'fhSegFarmaco', 'fhSegPrincipioActivo',
        'fhSegPresentacion', 'fhSegDosisActual', 'fhSegVia', 'fhSegPautaActual',
        'fhSegCodigoNacional', 'fhSegNregistro', 'fhSegEtiquetas',
        'fhSegFechaInicio', 'fhSegUltimaAdherencia', 'fhSegUltimosProms',
        'fhSegOrigenCatalogo', 'fhSegEaPrevios'
    ];

    function clearCipFields() {
        for (var i = 0; i < cipSearchFields.length; i++) {
            var el = document.getElementById(cipSearchFields[i]);
            if (el) { el.value = ''; el.readOnly = false; }
        }
    }

    function clearCipNotice() {
        var notice = document.getElementById('fhSegCipSearchNotice');
        if (notice) notice.parentNode.removeChild(notice);
    }

    function showCipNotice(msg, type) {
        var cipInput = document.getElementById('fhSegCip');
        if (!cipInput) return;
        var div = document.createElement('div');
        div.id = 'fhSegCipSearchNotice';
        div.className = 'notice-box notice-box--' + (type === 'warning' ? 'warning' : 'info');
        var icon = document.createElement('i');
        icon.className = type === 'warning' ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle';
        icon.setAttribute('aria-hidden', 'true');
        div.appendChild(icon);
        div.appendChild(document.createTextNode(' ' + msg));
        var fg = cipInput.closest('.form-group');
        if (fg) fg.insertAdjacentElement('afterend', div);
    }

    function searchCIP() {
        var cipInput = document.getElementById('fhSegCip');
        if (!cipInput) return;
        var cip = cipInput.value.trim();
        if (!cip) return;

        clearCipNotice();

        var patient = F.patients[cip];
        if (!patient) {
            clearCipFields();
            var C2 = getCatalog();
            if (C2 && C2.clearSnapshot) C2.clearSnapshot();
            showSegDrugAutocomplete();
            showCipNotice('Paciente no encontrado en demo. Puede completar los datos manualmente.', 'warning');
            return;
        }

        var C2 = getCatalog();
        if (C2 && C2.clearSnapshot) C2.clearSnapshot();

        F.setValue('fhSegCip', patient.cip);
        F.setValue('fhSegServicio', patient.servicio);
        F.setValue('fhSegPatologia', patient.patologia);
        F.setValue('fhSegFarmaco', patient.farmaco);
        F.setValue('fhSegDosisActual', patient.dosis);
        F.setValue('fhSegPautaActual', patient.pauta);
        F.setValue('fhSegVia', patient.via);
        F.setValue('fhSegFechaInicio', patient.primeraVisita);
        F.setValue('fhSegUltimaAdherencia', patient.adherencia);
        F.setValue('fhSegUltimosProms', patient.proms);
        F.setValue('fhSegEaPrevios', patient.efectosAdversos);

        var snap = window.FarmaciaCatalog ? window.FarmaciaCatalog.getSnapshot() : null;
        F.setValue('fhSegPrincipioActivo', snap ? snap.principio_activo_snapshot || patient.principioActivo || '' : patient.principioActivo || '');
        F.setValue('fhSegPresentacion', snap ? snap.presentacion_snapshot || '' : '');

        if (snap) {
            F.setValue('fhSegCodigoNacional', snap.codigo_nacional_snapshot || '');
            F.setValue('fhSegNregistro', snap.nregistro_snapshot || '');
            var tags = [];
            if (snap.etiquetas && snap.etiquetas.biosimilar) tags.push('Biosimilar');
            if (snap.etiquetas && snap.etiquetas.es_hospitalario) tags.push('Hospitalario');
            F.setValue('fhSegEtiquetas', tags.length ? tags.join(', ') : '\u2014');
        } else {
            F.setValue('fhSegCodigoNacional', '');
            F.setValue('fhSegNregistro', '');
            F.setValue('fhSegEtiquetas', '');
        }

        (function setOrigenCatalogo() {
            var sourceType = snap ? (snap.source_type || '').toString().toUpperCase() : '';
            var label;
            if (!snap) {
                label = 'Demo';
            } else if (sourceType === 'CIMA') {
                label = 'CIMA';
            } else if (sourceType === 'LOCAL') {
                label = 'Local Especial';
            } else if (sourceType === 'LOCAL_PENDIENTE_DEMO') {
                label = 'Demo/local pendiente';
            } else {
                label = 'Demo';
            }
            F.setValue('fhSegOrigenCatalogo', label);
        })();

        for (var i = 0; i < cipSearchFields.length; i++) {
            var el = document.getElementById(cipSearchFields[i]);
            if (el) el.readOnly = true;
        }

        hideSegDrugAutocomplete();

        var banner = document.getElementById('fhSegNoCipBanner');
        if (banner) banner.parentNode.removeChild(banner);
    }

    function initCipSearch() {
        var cipInput = document.getElementById('fhSegCip');
        if (!cipInput) return;
        cipInput.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            searchCIP();
        });
        var btn = document.getElementById('fhSegCipSearchBtn');
        if (btn) btn.addEventListener('click', searchCIP);
    }

    function getCatalog() {
        try { return window.FarmaciaCatalog; } catch (e) { return null; }
    }

    function showSegDrugAutocomplete() {
        var block = document.getElementById('fhSegAutocompleteBlock');
        if (block) block.classList.remove('hidden');
    }

    function hideSegDrugAutocomplete() {
        var block = document.getElementById('fhSegAutocompleteBlock');
        if (block) block.classList.add('hidden');
        clearSegDrugAutocompleteDropdown();
    }

    function clearSegDrugAutocompleteDropdown() {
        var dropdown = document.getElementById('fhSegAutocompleteDropdown');
        if (dropdown) {
            F.clearChildren(dropdown);
            dropdown.classList.add('hidden');
        }
        segAutocompleteActiveIndex = -1;
    }

    function renderSegDrugAutocompleteDropdown(results) {
        var dropdown = document.getElementById('fhSegAutocompleteDropdown');
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
            if (i === segAutocompleteActiveIndex) item.classList.add('autocomplete-item--active');

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
            sourceTag.textContent = drug.source_type || '\u2014';
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
                    selectDrugSeg(d);
                });
            })(drug);

            dropdown.appendChild(item);
        }
        dropdown.classList.remove('hidden');
        segAutocompleteActiveIndex = -1;
    }

    function selectDrugSeg(drug) {
        var C = getCatalog();
        if (!C || !drug) return;

        C.selectDrug(drug);

        F.setValue('fhSegFarmaco', drug.display_name || drug.nombre_comercial || '');
        F.setValue('fhSegPrincipioActivo', drug.principio_activo || '');
        F.setValue('fhSegPresentacion', drug.nombre_presentacion || '');
        F.setValue('fhSegDosisActual', drug.dosis || '');
        F.setValue('fhSegVia', drug.via || '');
        F.setValue('fhSegCodigoNacional', drug.codigo_nacional || '');
        F.setValue('fhSegNregistro', drug.nregistro || '');

        var sourceType = (drug.source_type || '').toUpperCase();
        var origenLabel;
        if (sourceType === 'CIMA') {
            origenLabel = 'CIMA';
        } else if (sourceType === 'LOCAL') {
            origenLabel = 'Local Especial';
        } else {
            origenLabel = drug.source_type || 'Demo';
        }
        F.setValue('fhSegOrigenCatalogo', origenLabel);

        var tags = [];
        if (isTruthyRobust(drug.es_hospitalario)) tags.push('Hospitalario');
        if (isTruthyRobust(drug.biosimilar)) tags.push('Biosimilar');
        F.setValue('fhSegEtiquetas', tags.length ? tags.join(', ') : '\u2014');

        clearSegDrugAutocompleteDropdown();
        var searchInput = document.getElementById('fhSegDrugSearch');
        if (searchInput) {
            searchInput.value = drug.display_name || drug.nombre_comercial || '';
        }
    }

    function handleSegDrugSearchInput() {
        var C = getCatalog();
        if (!C || !C.loaded) return;
        var input = document.getElementById('fhSegDrugSearch');
        if (!input) return;
        var query = input.value.trim();
        if (query.length < 2) {
            clearSegDrugAutocompleteDropdown();
            return;
        }
        var results = C.search(query);
        renderSegDrugAutocompleteDropdown(results);
    }

    function initSegDrugAutocomplete() {
        var input = document.getElementById('fhSegDrugSearch');
        if (!input) return;

        input.addEventListener('input', handleSegDrugSearchInput);
        input.addEventListener('keydown', function (event) {
            var dropdown = document.getElementById('fhSegAutocompleteDropdown');
            if (!dropdown || dropdown.classList.contains('hidden')) return;
            var items = dropdown.querySelectorAll('.autocomplete-item');
            if (items.length === 0) return;

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                segAutocompleteActiveIndex = Math.min(segAutocompleteActiveIndex + 1, items.length - 1);
                for (var k = 0; k < items.length; k++) {
                    items[k].classList.toggle('autocomplete-item--active', k === segAutocompleteActiveIndex);
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                segAutocompleteActiveIndex = Math.max(segAutocompleteActiveIndex - 1, -1);
                for (var j = 0; j < items.length; j++) {
                    items[j].classList.toggle('autocomplete-item--active', j === segAutocompleteActiveIndex);
                }
            } else if (event.key === 'Enter') {
                if (segAutocompleteActiveIndex >= 0 && segAutocompleteActiveIndex < items.length) {
                    event.preventDefault();
                    items[segAutocompleteActiveIndex].click();
                }
            } else if (event.key === 'Escape') {
                clearSegDrugAutocompleteDropdown();
            }
        });

        input.addEventListener('blur', function () {
            setTimeout(function () {
                if (!document.activeElement || !document.getElementById('fhSegAutocompleteDropdown').contains(document.activeElement)) {
                    clearSegDrugAutocompleteDropdown();
                }
            }, 150);
        });

        var catalog = getCatalog();
        if (catalog) {
            catalog.autoLoad();
        }
    }

    function toggleField(fieldId, show) {
        const el = document.getElementById(fieldId);
        if (el) el.closest('.form-group').classList.toggle('hidden', !show);
    }

    function updateMorisky() {
        let incorrectas = 0;
        Object.entries(correctAnswers).forEach(([name, correct]) => {
            const selected = document.querySelector(`input[name="${name}"]:checked`);
            if (selected && selected.value !== correct) incorrectas += 1;
        });
        let text = 'Resultado Morisky-Green: pendiente de completar';
        let resultClass = '';
        if (document.querySelectorAll('input[name^="mg"]:checked').length === 4) {
            if (incorrectas === 0) { text = 'Resultado Morisky-Green: alta adherencia'; resultClass = 'mg-result--high'; }
            else if (incorrectas <= 2) { text = 'Resultado Morisky-Green: adherencia media / parcial'; resultClass = 'mg-result--medium'; }
            else { text = 'Resultado Morisky-Green: baja adherencia'; resultClass = 'mg-result--low'; }
        }
        F.setText('fhSegMoriskyResultado', text);
        const el = document.getElementById('fhSegMoriskyResultado');
        if (el) {
            el.classList.remove('mg-result--high', 'mg-result--medium', 'mg-result--low');
            if (resultClass) el.classList.add(resultClass);
        }
    }

    function fv(id) { const el = document.getElementById(id); return el ? (el.value || '').trim() : ''; }

    // ---- T13: DLQI / EVA for Seguimiento ----

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
        var totalEl = document.getElementById('fhSegDlqiTotal');
        var interpEl = document.getElementById('fhSegDlqiInterp');
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
        var container = document.getElementById('fhSegDlqiQuestions');
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
        var dolorRange = document.getElementById('fhSegEvaDolorRange');
        var dolorValue = document.getElementById('fhSegEvaDolorValue');
        var pruritoRange = document.getElementById('fhSegEvaPruritoRange');
        var pruritoValue = document.getElementById('fhSegEvaPruritoValue');
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
        var promsSelect = document.getElementById('fhSegProms');
        var expanded = document.getElementById('fhSegPromsExpanded');
        if (!promsSelect || !expanded) return;
        function toggle() {
            if (promsSelect.value === 'Sí, recoger DLQI + EVA dolor/prurito') {
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
        var el = document.getElementById('fhSegEvaDolorValue');
        return el ? el.textContent : '—';
    }

    function getEVAPrurito() {
        var el = document.getElementById('fhSegEvaPruritoValue');
        return el ? el.textContent : '—';
    }

    function getDLQITotal() {
        var el = document.getElementById('fhSegDlqiTotal');
        return el ? el.textContent : '—';
    }

    function isPromsExpandedVisible() {
        var el = document.getElementById('fhSegPromsExpanded');
        return el && !el.classList.contains('hidden');
    }

    function buildDecisionValue() {
        var partes = [];
        var suspension = fv('fhSegSuspension');
        var optimiza = fv('fhSegOptimiza');
        var cambiaNivel = fv('fhSegCambiaNivel');
        if (suspension === 'Sí') {
            partes.push('Suspensión' + (fv('fhSegMotivoSusp') && fv('fhSegMotivoSusp') !== 'No aplica' ? ': ' + fv('fhSegMotivoSusp') : ''));
        }
        if (optimiza === 'Sí') {
            var optDetails = 'Optimización';
            if (fv('fhSegNuevaDosis')) optDetails += ' (Dosis: ' + fv('fhSegNuevaDosis') + ')';
            if (fv('fhSegNuevaPauta')) optDetails += ' (Pauta: ' + fv('fhSegNuevaPauta') + ')';
            if (fv('fhSegMotivoOpt') && fv('fhSegMotivoOpt') !== 'No aplica') optDetails += ' — ' + fv('fhSegMotivoOpt');
            partes.push(optDetails);
        }
        if (cambiaNivel === 'Sí') {
            partes.push('Cambio de nivel' + (fv('fhSegNuevoNivel') ? ' a ' + fv('fhSegNuevoNivel') : ''));
        }
        if (partes.length === 0) partes.push('Continuar sin cambios');
        return partes.join(' | ');
    }

    function buildCambioFarmacoValue() {
        var suspension = fv('fhSegSuspension');
        var optimiza = fv('fhSegOptimiza');
        if (suspension === 'Sí' || optimiza === 'Sí') return 'Requiere revisión — cambio de tratamiento';
        return 'No requiere';
    }

    function getSnapshotMetaForExportSeg() {
        var C = getCatalog();
        if (!C) return null;
        var snap = C.getSnapshot ? C.getSnapshot() : C.selectedSnapshot;
        if (!snap || !snap.selected_drug_id) return null;
        return {
            source_type: snap.source_type || '',
            selected_drug_id: snap.selected_drug_id || ''
        };
    }

    function buildSegLines() {
        const lines = [];
        lines.push('=== INFORME DE SEGUIMIENTO FARMACIA ===');
        lines.push('Identificador demo: FH-SEG-' + Date.now().toString(36).toUpperCase());
        lines.push('Fecha: ' + new Date().toLocaleDateString('es-ES'));
        lines.push('');
        lines.push('--- Tratamiento actual ---');
        lines.push('CIP: ' + (fv('fhSegCip') || '—'));
        lines.push('Origen: ' + (fv('fhSegServicio') || '—'));
        lines.push('Indicación: ' + (fv('fhSegPatologia') || '—'));
        lines.push('Fármaco / Marca: ' + (fv('fhSegFarmaco') || '—'));
        lines.push('Principio activo: ' + (fv('fhSegPrincipioActivo') || '—'));
        lines.push('Presentación: ' + (fv('fhSegPresentacion') || '—'));
        lines.push('Dosis: ' + (fv('fhSegDosisActual') || '—'));
        lines.push('Vía: ' + (fv('fhSegVia') || '—'));
        lines.push('Pauta / Intervalo: ' + (fv('fhSegPautaActual') || '—'));
        lines.push('Cód. Nacional: ' + (fv('fhSegCodigoNacional') || '—'));
        lines.push('Nº Registro: ' + (fv('fhSegNregistro') || '—'));
        lines.push('Etiquetas: ' + (fv('fhSegEtiquetas') || '—'));
        lines.push('Fecha inicio / 1ª visita: ' + (fv('fhSegFechaInicio') || '—'));
        lines.push('Última adherencia: ' + (fv('fhSegUltimaAdherencia') || '—'));
        lines.push('Últimos PROMs: ' + (fv('fhSegUltimosProms') || '—'));
        lines.push('Origen catálogo: ' + (fv('fhSegOrigenCatalogo') || '—'));
        var metaSeg = getSnapshotMetaForExportSeg();
        if (metaSeg) {
            lines.push('Origen catálogo source_type: ' + (metaSeg.source_type || '—'));
            lines.push('ID fármaco seleccionado: ' + (metaSeg.selected_drug_id || '—'));
        }
        lines.push('EA previos: ' + (fv('fhSegEaPrevios') || '—'));
        lines.push('');
        lines.push('--- Evolución farmacoterapéutica ---');
        lines.push('Fecha seguimiento: ' + (fv('fhSegFecha') || '—'));
        lines.push('Cambia nivel: ' + (fv('fhSegCambiaNivel') || '—'));
        lines.push('Nuevo nivel: ' + (fv('fhSegNuevoNivel') || '—'));
        lines.push('Requiere optimización: ' + (fv('fhSegOptimiza') || '—'));
        lines.push('Nueva dosis: ' + (fv('fhSegNuevaDosis') || '—'));
        lines.push('Nueva pauta: ' + (fv('fhSegNuevaPauta') || '—'));
        lines.push('Motivo optimización: ' + (fv('fhSegMotivoOpt') || '—'));
        lines.push('Suspensión: ' + (fv('fhSegSuspension') || '—'));
        lines.push('Motivo suspensión: ' + (fv('fhSegMotivoSusp') || '—'));
        lines.push('Decisión: ' + (buildDecisionValue() || '—'));
        lines.push('Aviso cambio fármaco: ' + (buildCambioFarmacoValue() || '—'));
        lines.push('');
        lines.push('--- Morisky-Green y PROMs ---');
        const moriskyEl = document.getElementById('fhSegMoriskyResultado');
        lines.push('Adherencia Morisky-Green: ' + (moriskyEl ? moriskyEl.textContent : '—'));
        lines.push('PROMs seguimiento: ' + (fv('fhSegProms') || '—'));
        lines.push('Efecto adverso detectado: ' + (fv('fhSegEa') || '—'));
        lines.push('Gravedad EA: ' + (fv('fhSegEaGravedad') || '—'));
        lines.push('Actuación EA: ' + (fv('fhSegEaActuacion') || '—'));
        const eaDesc = fv('fhSegEaDescripcion');
        if (eaDesc) lines.push('Descripción EA: ' + eaDesc);
        if (fv('fhSegProms') === 'Sí, recoger DLQI + EVA dolor/prurito' && isPromsExpandedVisible()) {
            lines.push('');
            lines.push('--- DLQI detallado ---');
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
            var interp = (document.getElementById('fhSegDlqiInterp') && document.getElementById('fhSegDlqiInterp').textContent || '').replace(/^ — /, '').trim();
            if (interp) lines.push('DLQI interpretación: ' + interp);
            lines.push('');
            lines.push('--- PROMs EVA ---');
            lines.push('EVA Dolor: ' + getEVADolor() + '/10');
            lines.push('EVA Prurito: ' + getEVAPrurito() + '/10');
        }
        lines.push('');
        lines.push('=== FIN DEL INFORME ===');
        lines.push('Generado por: Hub Clínico Badajoz — Demo Farmacia v0.2');
        lines.push('ATENCIÓN: Datos sintéticos. No usar para decisiones clínicas reales.');
        return lines;
    }

    document.addEventListener('DOMContentLoaded', () => {
        applyContext();
        initCipSearch();
        initSegDrugAutocomplete();

        if (!F.getQueryContext().patient) {
            showSegDrugAutocomplete();
        }

        document.querySelectorAll('input[name^="mg"]').forEach(input => input.addEventListener('change', updateMorisky));
        renderDLQI();
        setupEVASliders();
        setupPromsToggle();
        const cambiaNivel = document.getElementById('fhSegCambiaNivel');
        if (cambiaNivel) {
            const applyNivel = () => toggleField('fhSegNuevoNivel', cambiaNivel.value === 'Sí');
            cambiaNivel.addEventListener('change', applyNivel);
            applyNivel();
        }

        const optimiza = document.getElementById('fhSegOptimiza');
        if (optimiza) {
            const applyOptimiza = () => {
                const show = optimiza.value === 'Sí';
                ['fhSegNuevaDosis', 'fhSegNuevaPauta', 'fhSegMotivoOpt'].forEach(id => toggleField(id, show));
            };
            optimiza.addEventListener('change', applyOptimiza);
            applyOptimiza();
        }

        const suspension = document.getElementById('fhSegSuspension');
        if (suspension) {
            const applySusp = () => toggleField('fhSegMotivoSusp', suspension.value === 'Sí');
            suspension.addEventListener('change', applySusp);
            applySusp();
        }

        const exportTxt = document.getElementById('fhSegExportTxt');
        if (exportTxt) exportTxt.addEventListener('click', () => {
            F.downloadFile('seguimiento_FH_' + new Date().toISOString().slice(0, 10) + '.txt', buildSegLines().join('\n'), 'text/plain;charset=utf-8');
        });

        const exportCsv = document.getElementById('fhSegExportCsv');
        if (exportCsv) exportCsv.addEventListener('click', () => {
            const moriskyEl = document.getElementById('fhSegMoriskyResultado');
            var dlqiTotalExport = (fv('fhSegProms') === 'Sí, recoger DLQI + EVA dolor/prurito' && isPromsExpandedVisible()) ? getDLQITotal() : '';
            var dlqiInterpExport = (fv('fhSegProms') === 'Sí, recoger DLQI + EVA dolor/prurito' && isPromsExpandedVisible()) ? (document.getElementById('fhSegDlqiInterp') && document.getElementById('fhSegDlqiInterp').textContent || '').replace(/^ — /, '').trim() : '';
            var evaDolorExport = (fv('fhSegProms') === 'Sí, recoger DLQI + EVA dolor/prurito' && isPromsExpandedVisible()) ? getEVADolor() : '';
            var evaPruritoExport = (fv('fhSegProms') === 'Sí, recoger DLQI + EVA dolor/prurito' && isPromsExpandedVisible()) ? getEVAPrurito() : '';
            var metaSeg = getSnapshotMetaForExportSeg();
            const rows = [
                ['ID', 'Fecha', 'CIP', 'TratamientoActual', 'PrincipioActivo', 'Dosis', 'Via', 'Pauta', 'OrigenCatalogoSourceType', 'SelectedDrugId', 'Optimizacion', 'MoriskyGreen', 'PROMs', 'DLQITotal', 'DLQIInterpretacion', 'EVADolor', 'EVAPrurito', 'EA', 'GravedadEA', 'Decision', 'AvisoCambioFarmaco'],
                [
                    'FH-SEG-' + Date.now().toString(36).toUpperCase(),
                    new Date().toLocaleDateString('es-ES'),
                    fv('fhSegCip') || '—',
                    fv('fhSegFarmaco') || '—',
                    fv('fhSegPrincipioActivo') || '—',
                    fv('fhSegDosisActual') || '—',
                    fv('fhSegVia') || '—',
                    fv('fhSegPautaActual') || '—',
                    (metaSeg && metaSeg.source_type) || '—',
                    (metaSeg && metaSeg.selected_drug_id) || '—',
                    fv('fhSegOptimiza') || '—',
                    moriskyEl ? moriskyEl.textContent : '—',
                    fv('fhSegProms') || '—',
                    dlqiTotalExport || '—',
                    dlqiInterpExport || '—',
                    evaDolorExport || '—',
                    evaPruritoExport || '—',
                    fv('fhSegEa') || '—',
                    fv('fhSegEaGravedad') || '—',
                    buildDecisionValue() || '—',
                    buildCambioFarmacoValue() || '—'
                ]
            ];
            const csv = rows.map(function (row) {
                return row.map(function (cell) {
                    return '"' + String(cell).replace(/"/g, '""') + '"';
                }).join(',');
            }).join('\n');
            F.downloadFile('seguimientos_FH_' + new Date().toISOString().slice(0, 10) + '.csv', csv, 'text/csv;charset=utf-8');
        });
    });
})();
