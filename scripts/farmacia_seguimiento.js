'use strict';

(function () {
    const F = window.FarmaciaDemo;
    const M = window.FarmaciaValidationModel;
    var P = window.FarmaciaPautasCatalog;
    const correctAnswers = { mg1: 'no', mg2: 'si', mg3: 'no', mg4: 'no' };

    function isTruthyRobust(value) {
        if (value === true || value === 1 || value === '1') return true;
        if (value === false || value === 0 || value === '0') return false;
        if (value === null || value === undefined || value === '') return false;
        var s = String(value).trim().toUpperCase();
        return s === 'TRUE' || s === 'SI' || s === 'S\u00CD' || s === 'YES' || s === '1';
    }

    var segAutocompleteActiveIndex = -1;
    var currentSegPatient = null;
    var currentBiologicLines = [];
    var followupOtherDrugs = [];
    var followupOtherDrugSeq = 0;

    var FOLLOWUP_RELATION_OPTIONS = [
        'Biológico activo adicional',
        'Biológico previo/histórico',
        'Concomitante',
        'Exposición'
    ];

    function byId(id) {
        return document.getElementById(id);
    }

    function textOrDash(value) {
        return value === null || value === undefined || String(value).trim() === '' ? '—' : String(value).trim();
    }

    function createElement(tag, className, text) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    }

    function buildSelectControl(options, selectedValue, placeholder) {
        var select = createElement('select', 'form-select');
        if (placeholder !== undefined) {
            var placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = placeholder;
            select.appendChild(placeholderOption);
        }
        options.forEach(function (option) {
            var opt = document.createElement('option');
            if (typeof option === 'string') {
                opt.value = option;
                opt.textContent = option;
            } else {
                opt.value = option.value;
                opt.textContent = option.label;
            }
            if (opt.value === selectedValue) opt.selected = true;
            select.appendChild(opt);
        });
        return select;
    }

    function biologicStateLabel(state) {
        if (state === 'activo') return 'Activo';
        if (state === 'anadido' || state === 'añadido') return 'Añadido';
        if (state === 'suspendido') return 'Suspendido';
        if (state === 'historico') return 'Histórico';
        return 'Sin clasificar';
    }

    function biologicRelationLabel(type) {
        if (type === 'cambio_terapeutico' || type === 'cambio_farmaco') return 'Switch terapéutico';
        if (type === 'tratamiento_anadido' || type === 'tratamiento_añadido') return 'Add-on terapéutico';
        if (type === 'revision_linea') return 'Revisión de línea';
        if (type === 'base') return 'Línea terapéutica base';
        return 'Sin cambios';
    }

    function setSegValue(id, value) {
        var el = document.getElementById(id);
        if (el) el.value = value || '';
    }

    function populatePautaSelectSeg(id, otroId) {
        var select = byId(id);
        var otro = byId(otroId);
        if (!select) return;
        F.clearChildren(select);
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Seleccionar...';
        select.appendChild(placeholder);
        if (P && typeof P.getPautaOptions === 'function') {
            P.getPautaOptions().forEach(function (opt) {
                var option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                select.appendChild(option);
            });
        } else {
            console.warn('[farmacia_seguimiento] FarmaciaPautasCatalog no disponible para poblar pautas.');
        }
        select.addEventListener('change', function () {
            if (otro) {
                otro.classList.toggle('hidden', select.value !== 'OTRO');
                if (select.value !== 'OTRO') otro.value = '';
            }
        });
    }

    function getSegNuevaPautaLabel() {
        var select = byId('fhSegNuevaPauta');
        var otro = byId('fhSegNuevaPautaOtro');
        if (!select || !select.value) return '';
        if (select.value === 'OTRO') return otro ? otro.value : '';
        var pauta = P && typeof P.getPautaByCodigo === 'function' ? P.getPautaByCodigo(select.value) : null;
        return P && typeof P.getLegacyPautaLabel === 'function' ? P.getLegacyPautaLabel(pauta) : select.value;
    }

    function normalizeBiologicLine(line, index, patient) {
        return {
            linea_id: line.linea_id || ('BIO-LEGACY-' + (index + 1)),
            orden: line.orden || (index + 1),
            nombre_linea: line.nombre_linea || line.principio_activo || line.nombre_comercial || ('Biologico ' + (index + 1)),
            nombre_comercial: line.nombre_comercial || line.nombre_linea || patient.farmaco || '',
            principio_activo: line.principio_activo || patient.principioActivo || '',
            dosis: line.dosis || patient.dosis || '',
            presentacion: line.presentacion || line.presentacion_dosis || line.dosis || '',
            via: line.via || patient.via || '',
            pauta: line.pauta || patient.pauta || '',
            fecha_inicio: line.fecha_inicio || patient.primeraVisita || '',
            fecha_fin: line.fecha_fin || '',
            estado_linea: line.estado_linea || (line.activo ? 'activo' : 'historico'),
            tipo_relacion: line.tipo_relacion || 'sin_cambios',
            es_principal: !!line.es_principal,
            tratamiento_id_principal: line.tratamiento_id_principal || line.id || ''
        };
    }

    function getPatientBiologicLines(patient) {
        if (!patient) return [];
        if (Array.isArray(patient.biologicos) && patient.biologicos.length) {
            return patient.biologicos.map(function (line, index) {
                return normalizeBiologicLine(line, index, patient);
            });
        }
        return [normalizeBiologicLine({
            linea_id: patient.cip ? patient.cip + '-L1' : 'BIO-LEGACY-1',
            orden: 1,
            nombre_linea: patient.principioActivo || patient.farmaco || 'Tratamiento actual',
            nombre_comercial: patient.farmaco || '',
            principio_activo: patient.principioActivo || patient.farmaco || '',
            dosis: patient.dosis || '',
            via: patient.via || '',
            pauta: patient.pauta || '',
            fecha_inicio: patient.primeraVisita || '',
            estado_linea: 'activo',
            tipo_relacion: 'sin_cambios',
            es_principal: true
        }, 0, patient)];
    }

    function getCurrentSelectedLine() {
        var select = document.getElementById('fhSegLineaPrincipal');
        if (!currentBiologicLines.length) return null;
        if (!select || !select.value) {
            for (var i = 0; i < currentBiologicLines.length; i++) {
                if (currentBiologicLines[i].es_principal) return currentBiologicLines[i];
            }
            return currentBiologicLines[0];
        }
        for (var j = 0; j < currentBiologicLines.length; j++) {
            if (currentBiologicLines[j].linea_id === select.value) return currentBiologicLines[j];
        }
        return currentBiologicLines[0];
    }

    function createFollowupOtherDrug() {
        followupOtherDrugSeq += 1;
        return {
            uid: 'seg-other-' + followupOtherDrugSeq,
            relationType: FOLLOWUP_RELATION_OPTIONS[0],
            farmaco: '',
            principioActivo: '',
            dosis: '',
            via: '',
            pauta: '',
            fechaInicio: '',
            fechaFin: '',
            motivo: '',
            sospechosoEa: 'No consta'
        };
    }

    function followupEmptyState() {
        var empty = byId('segOtrosFarmacosEmpty');
        if (empty) empty.classList.toggle('hidden', followupOtherDrugs.length > 0);
    }

    function updateFollowupOtherDrug(uid, key, value) {
        followupOtherDrugs = followupOtherDrugs.map(function (drug) {
            if (drug.uid === uid) drug[key] = value;
            return drug;
        });
        updateSuspectDrugSelector();
    }

    function buildFollowupField(labelText, control) {
        var group = createElement('div', 'form-group');
        var label = createElement('label', '', labelText);
        group.appendChild(label);
        group.appendChild(control);
        return group;
    }

    function renderFollowupOtherDrugRow(drug) {
        var card = createElement('section', 'other-drug-card');
        var header = createElement('div', 'other-drug-card__header');
        header.appendChild(createElement('h4', 'other-drug-card__title', 'Fármaco concomitante'));
        var removeBtn = createElement('button', 'btn btn-outline btn-remove-drug', 'Eliminar');
        removeBtn.type = 'button';
        removeBtn.addEventListener('click', function () {
            followupOtherDrugs = followupOtherDrugs.filter(function (item) { return item.uid !== drug.uid; });
            renderFollowupOtherDrugs();
            updateSuspectDrugSelector();
        });
        header.appendChild(removeBtn);
        card.appendChild(header);

        var grid = createElement('div', 'form-grid other-drug-card__grid');
        var relationSelect = buildSelectControl(FOLLOWUP_RELATION_OPTIONS, drug.relationType);
        relationSelect.addEventListener('change', function () { updateFollowupOtherDrug(drug.uid, 'relationType', this.value); });
        grid.appendChild(buildFollowupField('Tipo de relación', relationSelect));

        [
            { key: 'farmaco', label: 'Fármaco', type: 'text' },
            { key: 'principioActivo', label: 'Principio activo', type: 'text' },
            { key: 'dosis', label: 'Dosis', type: 'text' },
            { key: 'pauta', label: 'Pauta', type: 'text' },
            { key: 'fechaInicio', label: 'Fecha inicio', type: 'date' },
            { key: 'fechaFin', label: 'Fecha fin', type: 'date' },
            { key: 'motivo', label: 'Motivo/contexto', type: 'text' }
        ].forEach(function (field) {
            var input = createElement('input', 'form-control');
            input.type = field.type;
            input.value = drug[field.key] || '';
            input.setAttribute('data-field', field.key);
            input.setAttribute('data-uid', drug.uid);

            if (field.key === 'farmaco') {
                input.classList.add('js-cima-autocomplete');
                input.setAttribute('data-uid', drug.uid);
                input.setAttribute('autocomplete', 'off');

                var wrapper = createElement('div', 'autocomplete-wrapper');
                wrapper.id = drug.uid + '-autocomplete-wrapper';
                wrapper.appendChild(input);

                var dropdown = createElement('div', 'autocomplete-dropdown hidden');
                dropdown.id = drug.uid + '-dropdown';
                wrapper.appendChild(dropdown);

                grid.appendChild(buildFollowupField(field.label, wrapper));
                return;
            }

            input.addEventListener('input', function () { updateFollowupOtherDrug(drug.uid, field.key, this.value); });
            grid.appendChild(buildFollowupField(field.label, input));
        });

        var viaSelect = buildSelectControl([
            { value: 'SC', label: 'SC' },
            { value: 'IV', label: 'IV' },
            { value: 'Oral', label: 'Oral' },
            { value: 'IM', label: 'IM' },
            { value: 'Otra', label: 'Otra' }
        ], drug.via, 'Seleccionar...');
        viaSelect.addEventListener('change', function () { updateFollowupOtherDrug(drug.uid, 'via', this.value); });
        grid.appendChild(buildFollowupField('Vía', viaSelect));

        var suspectSelect = buildSelectControl(['No consta', 'No', 'Sí'], drug.sospechosoEa);
        suspectSelect.addEventListener('change', function () { updateFollowupOtherDrug(drug.uid, 'sospechosoEa', this.value); });
        grid.appendChild(buildFollowupField('Sospechoso de EA', suspectSelect));

        card.appendChild(grid);
        return card;
    }

    function renderFollowupOtherDrugs() {
        var list = byId('segOtrosFarmacosList');
        if (!list) return;
        F.clearChildren(list);
        followupOtherDrugs.forEach(function (drug) {
            list.appendChild(renderFollowupOtherDrugRow(drug));
        });
        followupOtherDrugs.forEach(function (drug) {
            initOtherDrugAutocomplete(drug.uid);
        });
        followupEmptyState();
    }

    function initOtherDrugAutocomplete(uid) {
        var input = document.querySelector('input[data-uid="' + uid + '"].js-cima-autocomplete');
        if (!input) return;
        var dropdownId = uid + '-dropdown';

        input.addEventListener('input', function () {
            var C = getCatalog();
            if (!C || !C.loaded) return;
            var query = this.value.trim();
            if (query.length < 2) {
                clearOtherDrugDropdown(dropdownId);
                return;
            }
            var results = C.search(query);
            renderOtherDrugDropdown(dropdownId, results, uid);
        });

        input.addEventListener('keydown', function (e) {
            var dropdown = document.getElementById(dropdownId);
            if (!dropdown || dropdown.classList.contains('hidden')) return;
            var items = dropdown.querySelectorAll('.autocomplete-item');
            if (!items.length) return;
            var activeIdx = Array.from(items).findIndex(function (i) { return i.classList.contains('autocomplete-item--active'); });

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIdx = Math.min(activeIdx + 1, items.length - 1);
                items.forEach(function (it, i) { it.classList.toggle('autocomplete-item--active', i === activeIdx); });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIdx = Math.max(activeIdx - 1, 0);
                items.forEach(function (it, i) { it.classList.toggle('autocomplete-item--active', i === activeIdx); });
            } else if (e.key === 'Enter' && activeIdx >= 0) {
                e.preventDefault();
                items[activeIdx].click();
            } else if (e.key === 'Escape') {
                clearOtherDrugDropdown(dropdownId);
            }
        });

        input.addEventListener('blur', function () {
            setTimeout(function () {
                var dd = document.getElementById(dropdownId);
                if (dd && !dd.contains(document.activeElement)) clearOtherDrugDropdown(dropdownId);
            }, 150);
        });
    }

    function clearOtherDrugDropdown(dropdownId) {
        var dd = document.getElementById(dropdownId);
        if (!dd) return;
        F.clearChildren(dd);
        dd.classList.add('hidden');
    }

    function renderOtherDrugDropdown(dropdownId, results, uid) {
        var dd = document.getElementById(dropdownId);
        if (!dd) return;
        F.clearChildren(dd);
        if (!results || !results.length) { dd.classList.add('hidden'); return; }

        var max = Math.min(results.length, 10);
        for (var i = 0; i < max; i++) {
            var drug = results[i];
            var item = createElement('div', 'autocomplete-item');
            var main = createElement('div', 'autocomplete-item-main');
            var name = createElement('span', 'autocomplete-item-name');
            name.textContent = drug.nombre_comercial || '\u2014';
            main.appendChild(name);

            var src = createElement('span', 'drug-source-tag drug-source-tag--' + ((drug.source_type || '').toLowerCase() === 'cima' ? 'cima' : 'local'));
            src.textContent = drug.source_type || '\u2014';
            main.appendChild(src);
            item.appendChild(main);

            var detail = createElement('div', 'autocomplete-item-detail');
            var parts = [];
            if (drug.principio_activo) parts.push(drug.principio_activo);
            if (drug.dosis) parts.push(drug.dosis);
            detail.textContent = parts.join(' \u00b7 ');
            item.appendChild(detail);

            (function (d) {
                item.addEventListener('click', function () {
                    var input = document.querySelector('input[data-uid="' + uid + '"].js-cima-autocomplete');
                    if (input) input.value = d.nombre_comercial || '';
                    updateFollowupOtherDrug(uid, 'farmaco', d.nombre_comercial || '');
                    updateFollowupOtherDrug(uid, 'principioActivo', d.principio_activo || '');
                    var paInput = document.querySelector('input[data-uid="' + uid + '"][data-field="principioActivo"]');
                    if (paInput) paInput.value = d.principio_activo || '';
                    clearOtherDrugDropdown(dropdownId);
                });
            })(drug);

            dd.appendChild(item);
        }
        dd.classList.remove('hidden');
    }

    function addFollowupOtherDrug() {
        followupOtherDrugs.push(createFollowupOtherDrug());
        renderFollowupOtherDrugs();
        updateSuspectDrugSelector();
    }

    function normalizeFollowupDrugCategory(relationType) {
        if (relationType === 'Biológico activo adicional') return 'Biológico adicional';
        if (relationType === 'Biológico previo/histórico') return 'Biológico previo/histórico';
        if (relationType === 'Exposición') return 'Exposición';
        return 'Concomitante';
    }

    function getRelevantDrugCandidates() {
        var candidates = [];
        currentBiologicLines.forEach(function (line) {
            if (line.estado_linea !== 'historico' || line.es_principal) {
                candidates.push({
                    id: 'line:' + line.linea_id,
                    category: 'Biológico activo',
                    label: '[Biológico activo] ' + (line.nombre_linea || line.nombre_comercial || line.principio_activo || 'Tratamiento principal'),
                    source: 'principal'
                });
            }
        });
        if (!candidates.length) {
            var selectedLine = getCurrentSelectedLine();
            if (selectedLine) {
                candidates.push({
                    id: 'line:' + selectedLine.linea_id,
                    category: 'Biológico activo',
                    label: '[Biológico activo] ' + (selectedLine.nombre_linea || selectedLine.nombre_comercial || 'Tratamiento principal'),
                    source: 'principal'
                });
            }
        }
        followupOtherDrugs.forEach(function (drug) {
            var name = drug.farmaco || drug.principioActivo;
            if (!name) return;
            var category = normalizeFollowupDrugCategory(drug.relationType);
            candidates.push({
                id: 'other:' + drug.uid,
                category: category,
                label: '[' + category + '] ' + name,
                source: 'other'
            });
        });
        return candidates;
    }

    function updateLegacySuspectSummary(candidates, selectedValue) {
        var container = byId('fhSegEaSospechosos');
        if (!container) return;
        F.clearChildren(container);
        var text = 'Sin fármacos relevantes disponibles.';
        if (candidates.length) {
            var selected = candidates.find(function (candidate) { return candidate.id === selectedValue; });
            text = 'Contexto de sospecha: ' + (selected ? selected.label : candidates.map(function (candidate) { return candidate.label; }).join(' | '));
        }
        container.appendChild(document.createTextNode(text));
    }

    function updateSuspectDrugSelector() {
        var row = byId('fhSeguimientoEaFarmacoRow');
        var select = byId('fhSeguimientoEaFarmacoSospechoso');
        var notice = byId('fhSeguimientoEaFarmacoDefaultNotice');
        if (!row || !select || !notice) return;
        var candidates = getRelevantDrugCandidates();
        var currentValue = select.value;
        F.clearChildren(select);
        var autoSelected = '';
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'No seleccionado';
        select.appendChild(placeholder);
        candidates.forEach(function (candidate) {
            var option = document.createElement('option');
            option.value = candidate.id;
            option.textContent = candidate.label;
            if (candidate.id === currentValue) option.selected = true;
            select.appendChild(option);
        });
        if (candidates.length > 1) {
            var unassigned = document.createElement('option');
            unassigned.value = 'multiple:unassigned';
            unassigned.textContent = 'No se puede atribuir a un único fármaco';
            if (currentValue === unassigned.value) unassigned.selected = true;
            select.appendChild(unassigned);
        }
        if (candidates.length === 1) {
            autoSelected = candidates[0].id;
            select.value = autoSelected;
            notice.textContent = 'Fármaco sospechoso por defecto: ' + candidates[0].label;
            notice.classList.remove('hidden');
        } else {
            notice.textContent = '';
            notice.classList.add('hidden');
            if (currentValue && Array.from(select.options).some(function (opt) { return opt.value === currentValue; })) {
                select.value = currentValue;
            } else {
                select.value = '';
            }
        }
        updateLegacySuspectSummary(candidates, select.value || autoSelected);
        updateCausalityContextLabels();
    }

    function getSelectedSuspectDrugLabel() {
        var select = byId('fhSeguimientoEaFarmacoSospechoso');
        if (!select) return '—';
        var option = select.options[select.selectedIndex];
        return option && option.text ? option.text : '—';
    }

    function readNaranjoAnswersFromDom() {
        function getVal(id) {
            var group = document.querySelector('.causality-chip-group[data-answer-id="' + id + '"]');
            if (!group) return 'desconocido';
            var active = group.querySelector('.causality-chip--active');
            return active ? active.getAttribute('data-value') : 'desconocido';
        }
        return {
            q1: getVal('naranjoQ1'), q2: getVal('naranjoQ2'), q3: getVal('naranjoQ3'),
            q4: getVal('naranjoQ4'), q5: getVal('naranjoQ5'), q6: getVal('naranjoQ6'),
            q7: getVal('naranjoQ7'), q8: getVal('naranjoQ8'), q9: getVal('naranjoQ9'),
            q10: getVal('naranjoQ10')
        };
    }

    function readKarchLasagnaAnswersFromDom() {
        function getVal(id) {
            var group = document.querySelector('.causality-chip-group[data-answer-id="' + id + '"]');
            if (!group) return 'no_se_sabe';
            var active = group.querySelector('.causality-chip--active');
            return active ? active.getAttribute('data-value') : 'no_se_sabe';
        }
        return {
            temporal: getVal('klTemporal'), conocido: getVal('klConocido'),
            alternativa: getVal('klAlternativa'), suspendido: getVal('klSuspendido'),
            mejoraRetirada: getVal('klMejoraRetirada'), readministracion: getVal('klReadministracion'),
            reaparece: getVal('klReaparece')
        };
    }

    function updateNaranjoScore() {
        if (!M) return;
        var score = M.calculateNaranjoScore(readNaranjoAnswersFromDom());
        var category = M.categorizeNaranjo(score);
        byId('naranjoScore').textContent = String(score);
        byId('naranjoCategoria').textContent = category;
        updateFollowupCausalitySummary();
    }

    function updateKarchLasagna() {
        if (!M) return;
        byId('klCategoria').textContent = M.categorizeKarchLasagna(readKarchLasagnaAnswersFromDom());
        updateFollowupCausalitySummary();
    }

    function updateCausalityContextLabels() {
        var label = getSelectedSuspectDrugLabel();
        ['fhSeguimientoEaContextoNaranjo', 'fhSeguimientoEaContextoKl', 'fhSeguimientoEaContextoResumen'].forEach(function (id) {
            var el = byId(id);
            if (el) el.textContent = label;
        });
    }



    function updateFollowupCausalitySummary() {
        updateCausalityContextLabels();
        byId('resumenNaranjo').textContent = byId('naranjoScore').textContent + ' · ' + byId('naranjoCategoria').textContent;
        byId('resumenKl').textContent = byId('klCategoria').textContent;
        if (byId('fhSeguimientoEaPresente').value !== 'si') {
            byId('fhCausalidadFinal').value = 'No evaluada';
        }
    }

    function toggleFollowupEaFlow() {
        var value = byId('fhSeguimientoEaPresente').value;
        var active = value === 'si';
        ['fhSeguimientoEaGravedadRow', 'fhSeguimientoEaResueltoRow', 'fhSeguimientoEaCorregidoRow', 'fhSeguimientoEaObservacionesRow', 'fhSeguimientoEaFarmacoRow'].forEach(function (id) {
            var row = byId(id);
            if (row) row.classList.toggle('hidden', !active);
        });
        ['modSeguimientoCausalidad', 'modNaranjo', 'modKarchLasagna', 'modResumenCausalidad'].forEach(function (id) {
            var section = byId(id);
            if (section) section.classList.toggle('hidden', !active);
        });
        byId('fhSeguimientoEaNoCausalidad').classList.toggle('hidden', active);
        byId('fhSeguimientoEaActivationNotice').classList.add('hidden');
        updateSuspectDrugSelector();
        updateFollowupCausalitySummary();
    }

    function showCausalityNavNotice() {
        var notice = byId('fhSeguimientoEaActivationNotice');
        if (notice) notice.classList.remove('hidden');
    }

    function handleCausalityNav(event) {
        if (byId('fhSeguimientoEaPresente').value === 'si') return;
        event.preventDefault();
        var block = byId('modSeguimientoEa');
        if (block && block.scrollIntoView) block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showCausalityNavNotice();
    }

    function updatePrebiologicoSummary() {
        var fechaInicio = byId('fhSegFechaInicio');
        var eaPrevios = byId('fhSegEaPrevios');
        var origen = byId('fhSegOrigenCatalogo');
        if (byId('fhSegPrebioFechaInicioResumen')) byId('fhSegPrebioFechaInicioResumen').textContent = fechaInicio ? textOrDash(fechaInicio.value) : '—';
        if (byId('fhSegPrebioEaPreviosResumen')) byId('fhSegPrebioEaPreviosResumen').textContent = eaPrevios ? textOrDash(eaPrevios.value) : '—';
        if (byId('fhSegPrebioOrigenResumen')) byId('fhSegPrebioOrigenResumen').textContent = origen ? textOrDash(origen.value) : '—';
    }

    function renderEaSospechosos(selectedIds) {
        updateSuspectDrugSelector();
    }

    function getEaCausalidadSummary() {
        return {
            algoritmo: 'Naranjo + Karch-Lasagna',
            puntuacion: byId('naranjoScore').textContent || '',
            categoria: byId('fhCausalidadFinal').value || 'No evaluada',
            resumen: 'Sospechoso: ' + getSelectedSuspectDrugLabel() + ' | Naranjo ' + byId('naranjoScore').textContent + ' (' + byId('naranjoCategoria').textContent + ') | Karch-Lasagna ' + byId('klCategoria').textContent
        };
    }

    function updateEaCausalidad() {
        toggleFollowupEaFlow();
    }

    function syncBiologicControls(patient) {
        var lineaPrincipal = document.getElementById('fhSegLineaPrincipal');
        var estadoLinea = document.getElementById('fhSegEstadoLinea');

        if (!patient) {
            currentBiologicLines = [];
            if (lineaPrincipal) lineaPrincipal.value = '';
            if (estadoLinea) estadoLinea.value = '';
            return;
        }

        currentBiologicLines = getPatientBiologicLines(patient);

        if (!lineaPrincipal) return;

        while (lineaPrincipal.options.length > 0) lineaPrincipal.remove(0);
        var placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Seleccionar línea...';
        lineaPrincipal.appendChild(placeholderOption);

        var selectedLine = null;
        for (var i = 0; i < currentBiologicLines.length; i++) {
            var line = currentBiologicLines[i];
            var opt = document.createElement('option');
            opt.value = line.linea_id;
            opt.textContent = line.nombre_linea;
            if (line.es_principal) {
                opt.selected = true;
                selectedLine = line;
            }
            lineaPrincipal.appendChild(opt);
        }

        if (!selectedLine && currentBiologicLines.length) {
            selectedLine = currentBiologicLines[0];
            for (var j = 0; j < lineaPrincipal.options.length; j++) {
                if (lineaPrincipal.options[j].value === selectedLine.linea_id) {
                    lineaPrincipal.options[j].selected = true;
                    break;
                }
            }
        }

        if (estadoLinea && selectedLine) {
            estadoLinea.value = biologicStateLabel(selectedLine.estado_linea);
        }
    }

    function applySelectedBiologicLine() {
        var line = getCurrentSelectedLine();
        if (line) {
            setSegValue('fhSegFarmaco', line.nombre_comercial);
            setSegValue('fhSegPrincipioActivo', line.principio_activo);
            setSegValue('fhSegPresentacion', line.presentacion);
            setSegValue('fhSegDosisActual', line.dosis);
            setSegValue('fhSegVia', line.via);
            setSegValue('fhSegPautaActual', line.pauta);
            setSegValue('fhSegEstadoLinea', biologicStateLabel(line.estado_linea));
        } else {
            setSegValue('fhSegFarmaco', '');
            setSegValue('fhSegPrincipioActivo', '');
            setSegValue('fhSegPresentacion', '');
            setSegValue('fhSegDosisActual', '');
            setSegValue('fhSegVia', '');
            setSegValue('fhSegPautaActual', '');
            setSegValue('fhSegEstadoLinea', '');
        }
        updateSuspectDrugSelector();
        updatePrebiologicoSummary();
    }

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
            F.setText('fhSegCimaContextPrincipioActivo', snap?.principio_activo_snapshot || ctx.patient.principioActivo || '\u2014');
            F.setValue('fhSegPresentacion', snap?.presentacion_snapshot || '');
        }
        syncBiologicControls(ctx.patient || null);

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
        if (!ctx.patient) syncBiologicControls(null);
        if (!ctx.cip && !ctx.patient) F.insertNoCipBanner('fhSegNoCipBanner');
        updatePrebiologicoSummary();
        updateSuspectDrugSelector();
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
        var pautaSelect = document.getElementById('fhSegNuevaPauta');
        var pautaOtro = document.getElementById('fhSegNuevaPautaOtro');
        if (pautaSelect) pautaSelect.value = '';
        if (pautaOtro) { pautaOtro.value = ''; pautaOtro.classList.add('hidden'); }
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

        var patient = F.findPatientByCip(cip);
        if (!patient) {
            clearCipFields();
            syncBiologicControls(null);
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
        syncBiologicControls(patient);

        var snap = window.FarmaciaCatalog ? window.FarmaciaCatalog.getSnapshot() : null;
        var segPrincipioActivoValue = snap ? snap.principio_activo_snapshot || patient.principioActivo || '' : patient.principioActivo || '';
        F.setValue('fhSegPrincipioActivo', segPrincipioActivoValue);
        F.setText('fhSegCimaContextPrincipioActivo', segPrincipioActivoValue || '\u2014');
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
        F.setText('fhSegCimaContextPrincipioActivo', drug.principio_activo || '\u2014');
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
            var group = document.querySelector('.mg-chip-group[data-mg-name="' + name + '"]');
            var active = group ? group.querySelector('.mg-chip--active') : null;
            var selected = active ? active.getAttribute('data-mg-value') : null;
            if (selected && selected !== correct) incorrectas += 1;
        });
        let text = 'Resultado Morisky-Green: pendiente de completar';
        let resultClass = '';
        if (document.querySelectorAll('.mg-chip--active').length === 4) {
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

    function initMoriskyChips() {
        document.querySelectorAll('.mg-chip-group').forEach(function (group) {
            group.addEventListener('click', function (e) {
                var chip = e.target.closest('.mg-chip');
                if (!chip) return;
                group.querySelectorAll('.mg-chip').forEach(function (c) { c.classList.remove('mg-chip--active'); });
                chip.classList.add('mg-chip--active');
                updateMorisky();
            });
        });
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
            var nuevaPautaLabel = getSegNuevaPautaLabel();
            if (fv('fhSegNuevaDosis')) optDetails += ' (Dosis: ' + fv('fhSegNuevaDosis') + ')';
            if (nuevaPautaLabel) optDetails += ' (Pauta: ' + nuevaPautaLabel + ')';
            if (fv('fhSegMotivoOpt') && fv('fhSegMotivoOpt') !== 'No aplica') optDetails += ' — ' + fv('fhSegMotivoOpt');
            partes.push(optDetails);
        }
        if (cambiaNivel === 'Sí') {
            partes.push('Cambio de nivel' + (fv('fhSegNuevoNivel') ? ' a ' + fv('fhSegNuevoNivel') : ''));
        }
        if (fv('fhSegTipoRelacionTerapia')) {
            partes.push('Movimiento terapéutico: ' + biologicRelationLabel(fv('fhSegTipoRelacionTerapia')));
        }
        if (partes.length === 0) partes.push('Continuar sin cambios');
        return partes.join(' | ');
    }

    function buildCambioFarmacoValue() {
        var tipo = fv('fhSegTipoRelacionTerapia');
        if (tipo === 'cambio_terapeutico') return 'Si — requiere nuevo circuito de validacion';
        if (tipo === 'tratamiento_anadido') return 'No — tratamiento anadido sin asumir cambio';
        if (tipo === 'revision_linea') return 'No — revision de linea';
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
        var selectedLine = getCurrentSelectedLine();
        lines.push('Linea principal: ' + (selectedLine ? ('L' + selectedLine.orden + ' · ' + selectedLine.nombre_linea) : '—'));
        lines.push('Estado linea: ' + (fv('fhSegEstadoLinea') || '—'));
        lines.push('Movimiento terapéutico: ' + biologicRelationLabel(fv('fhSegTipoRelacionTerapia') || 'sin_cambios'));
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
        lines.push('Nueva pauta: ' + (getSegNuevaPautaLabel() || '—'));
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
        lines.push('');
        lines.push('VISITA DE SEGUIMIENTO — EFECTOS ADVERSOS');
        lines.push('- Efecto adverso desde última visita: ' + textOrDash(fv('fhSeguimientoEaPresente')));
        lines.push('- Gravedad: ' + textOrDash(fv('fhSeguimientoEaGravedad')));
        lines.push('- Resuelto: ' + textOrDash(fv('fhSeguimientoEaResuelto')));
        lines.push('- Fármaco sospechoso: ' + textOrDash(getSelectedSuspectDrugLabel()));
        lines.push('- Observaciones: ' + textOrDash(fv('fhSeguimientoEaObservaciones')));
        if (fv('fhSeguimientoEaPresente') === 'si') {
            var causality = getEaCausalidadSummary();
            lines.push('');
            lines.push('ALGORITMO DE NARANJO');
            Object.keys(readNaranjoAnswersFromDom()).forEach(function (key) {
                lines.push(key.toUpperCase() + ': ' + textOrDash(readNaranjoAnswersFromDom()[key]));
            });
            lines.push('Puntuación total: ' + byId('naranjoScore').textContent);
            lines.push('Categoría: ' + byId('naranjoCategoria').textContent);
            lines.push('');
            lines.push('KARCH-LASAGNA');
            lines.push('Temporalidad: ' + textOrDash(fv('klTemporal')));
            lines.push('Evento conocido: ' + textOrDash(fv('klConocido')));
            lines.push('Alternativa: ' + textOrDash(fv('klAlternativa')));
            lines.push('Retirada: ' + textOrDash(fv('klSuspendido')));
            lines.push('Mejora: ' + textOrDash(fv('klMejoraRetirada')));
            lines.push('Readministración: ' + textOrDash(fv('klReadministracion')));
            lines.push('Reaparición: ' + textOrDash(fv('klReaparece')));
            lines.push('Categoría: ' + byId('klCategoria').textContent);
            lines.push('');
            lines.push('RESUMEN DE CAUSALIDAD');
            lines.push('Naranjo: ' + byId('resumenNaranjo').textContent);
            lines.push('Karch-Lasagna: ' + byId('resumenKl').textContent);
            lines.push('Causalidad final farmacéutica: ' + byId('fhCausalidadFinal').value);
            lines.push('Resumen causalidad: ' + (causality.resumen || '—'));
        }
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
        populatePautaSelectSeg('fhSegNuevaPauta', 'fhSegNuevaPautaOtro');

        // Demo FH-004: pre-activar causalidad si el paciente tiene EA registrado
        var demoCtx = F.getQueryContext();
        if (demoCtx.cip === "CIP-DEMO-FH-004") {
            var eaSelect = document.getElementById("fhSeguimientoEaPresente");
            if (eaSelect && eaSelect.value !== "si") {
                eaSelect.value = "si";
                eaSelect.dispatchEvent(new Event('change'));
            }

            // Demo FH-004: pre-activar PROMs si el paciente tiene datos registrados
            var promsSelect = document.getElementById('fhSegProms');
            if (promsSelect) {
                promsSelect.value = 'Sí, recoger DLQI + EVA dolor/prurito';
                promsSelect.dispatchEvent(new Event('change'));
            }
        }

        // Actualizar enlaces de navegación con CIP actual
        var ctxNav = F.getQueryContext();
        if (ctxNav.cip) {
            var navDash = document.getElementById("navToDashboardPaciente");
            if (navDash) navDash.href = "farmacia_dashboard_paciente.html?cip=" + encodeURIComponent(ctxNav.cip) + "&entrada=dashboard";

            var sidebarDash = document.querySelector('.sidebar-nav-area .nav-link[href*="farmacia_dashboard_paciente.html"]');
            if (sidebarDash) sidebarDash.href = "farmacia_dashboard_paciente.html?cip=" + encodeURIComponent(ctxNav.cip);
        }

        if (!F.getQueryContext().patient) {
            showSegDrugAutocomplete();
        }

        initMoriskyChips();
        var lineaPrincipal = document.getElementById('fhSegLineaPrincipal');
        if (lineaPrincipal) lineaPrincipal.addEventListener('change', applySelectedBiologicLine);
        var eaSelector = document.getElementById('fhSeguimientoEaPresente');
        if (eaSelector) eaSelector.addEventListener('change', updateEaCausalidad);
        ['fhSeguimientoEaGravedad', 'fhSeguimientoEaResuelto', 'fhSeguimientoEaObservaciones', 'fhSeguimientoEaFarmacoSospechoso'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener(el.tagName === 'TEXTAREA' ? 'input' : 'change', updateFollowupCausalitySummary);
        });
        document.querySelectorAll('.causality-chip-group[data-answer-id^="naranjo"]').forEach(function (group) {
            group.addEventListener('click', function (e) {
                var btn = e.target.closest('.causality-chip');
                if (!btn) return;
                group.querySelectorAll('.causality-chip').forEach(function (b) { b.classList.remove('causality-chip--active'); });
                btn.classList.add('causality-chip--active');
                updateNaranjoScore();
            });
        });
        document.querySelectorAll('.causality-chip-group[data-answer-id^="kl"]').forEach(function (group) {
            group.addEventListener('click', function (e) {
                var btn = e.target.closest('.causality-chip');
                if (!btn) return;
                group.querySelectorAll('.causality-chip').forEach(function (b) { b.classList.remove('causality-chip--active'); });
                btn.classList.add('causality-chip--active');
                updateKarchLasagna();
            });
        });
        renderDLQI();
        setupEVASliders();
        setupPromsToggle();
        renderFollowupOtherDrugs();
        var addOtherDrugBtn = document.getElementById('btnSegAddOtherDrug');
        if (addOtherDrugBtn) addOtherDrugBtn.addEventListener('click', addFollowupOtherDrug);
        document.querySelectorAll('.js-causality-nav').forEach(function (link) {
            link.addEventListener('click', handleCausalityNav);
        });

        updateEaCausalidad();
        updateNaranjoScore();
        updateKarchLasagna();
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
                ['fhSegNuevaDosis', 'fhSegNuevaPauta', 'fhSegNuevaPautaOtro', 'fhSegMotivoOpt'].forEach(id => toggleField(id, show));
                var otro = byId('fhSegNuevaPautaOtro');
                var pauta = byId('fhSegNuevaPauta');
                if (show && otro && pauta && pauta.value !== 'OTRO') otro.classList.add('hidden');
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
            var selectedLine = getCurrentSelectedLine();
            var causalityCsv = getEaCausalidadSummary();
            var pautaNormalizedSeg = (P && typeof P.normalizePautaLabel === 'function') ? P.normalizePautaLabel(fv('fhSegPautaActual')) : null;
            var pautaSegCodigo = pautaNormalizedSeg ? pautaNormalizedSeg.pauta_codigo : '—';
            var pautaSegLabel = pautaNormalizedSeg ? pautaNormalizedSeg.pauta_label : '—';
            var pautaSegIntervalo = pautaNormalizedSeg ? pautaNormalizedSeg.pauta_intervalo_dias : '—';
            var pautaSegUnidad = pautaNormalizedSeg ? pautaNormalizedSeg.pauta_unidad : '—';
            var pautaSegOtroTexto = pautaNormalizedSeg ? (pautaNormalizedSeg.pauta_otro_texto || '—') : '—';
            const rows = [
                ['ID', 'Fecha', 'CIP', 'LineaPrincipal', 'EstadoLinea', 'MovimientoTerapeutico', 'TratamientoActual', 'PrincipioActivo', 'Dosis', 'Via', 'Pauta', 'PautaCodigo', 'PautaLabel', 'PautaIntervaloDias', 'PautaUnidad', 'PautaOtroTexto', 'OrigenCatalogoSourceType', 'SelectedDrugId', 'Optimizacion', 'MoriskyGreen', 'PROMs', 'DLQITotal', 'DLQIInterpretacion', 'EVADolor', 'EVAPrurito', 'EaSeguimientoPresente', 'EaSeguimientoGravedad', 'EaSeguimientoResuelto', 'EaFarmacoSospechoso', 'EaSeguimientoObservaciones', 'NaranjoScore', 'NaranjoCategoria', 'KLCategoria', 'CausalidadFinalFarmaceutica', 'Decision', 'AvisoCambioFarmaco'],
                [
                    'FH-SEG-' + Date.now().toString(36).toUpperCase(),
                    new Date().toLocaleDateString('es-ES'),
                    fv('fhSegCip') || '—',
                    selectedLine ? ('L' + selectedLine.orden + ' ' + selectedLine.nombre_linea) : '—',
                    fv('fhSegEstadoLinea') || '—',
                    biologicRelationLabel(fv('fhSegTipoRelacionTerapia') || 'sin_cambios'),
                    fv('fhSegFarmaco') || '—',
                    fv('fhSegPrincipioActivo') || '—',
                    fv('fhSegDosisActual') || '—',
                    fv('fhSegVia') || '—',
                    fv('fhSegPautaActual') || '—',
                    pautaSegCodigo,
                    pautaSegLabel,
                    pautaSegIntervalo,
                    pautaSegUnidad,
                    pautaSegOtroTexto,
                    (metaSeg && metaSeg.source_type) || '—',
                    (metaSeg && metaSeg.selected_drug_id) || '—',
                    fv('fhSegOptimiza') || '—',
                    moriskyEl ? moriskyEl.textContent : '—',
                    fv('fhSegProms') || '—',
                    dlqiTotalExport || '—',
                    dlqiInterpExport || '—',
                    evaDolorExport || '—',
                    evaPruritoExport || '—',
                    fv('fhSeguimientoEaPresente') || '—',
                    fv('fhSeguimientoEaGravedad') || '—',
                    fv('fhSeguimientoEaResuelto') || '—',
                    getSelectedSuspectDrugLabel() || '—',
                    fv('fhSeguimientoEaObservaciones') || '—',
                    byId('naranjoScore').textContent || '—',
                    byId('naranjoCategoria').textContent || '—',
                    byId('klCategoria').textContent || '—',
                    byId('fhCausalidadFinal').value || '—',
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
