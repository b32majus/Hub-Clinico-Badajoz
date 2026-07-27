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
        return s === 'TRUE' || s === 'SI' || s === 'SÍ' || s === 'YES' || s === '1';
    }

    function firstNonEmpty() {
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] == null) continue;
            var value = String(arguments[i]).trim();
            if (value) return value;
        }
        return '';
    }

    function getTreatmentHelper() {
        return window.FarmaciaTratamiento || null;
    }

    function mapRouteToSelect(value) {
        var catalog = getCatalog();
        if (catalog && typeof catalog.mapCatalogViaToSelect === 'function') return catalog.mapCatalogViaToSelect(value);
        var helper = getTreatmentHelper();
        if (helper && typeof helper.mapViaToSelect === 'function') return helper.mapViaToSelect(value);
        return value ? 'Otra' : '';
    }

    function followupCatalogContext(slot, uid) {
        var line = slot === 'seguimiento.tratamiento' ? getCurrentSelectedLine() : null;
        var cipEl = document.getElementById('fhSegCip');
        return {
            slot: uid ? ('seguimiento.relacionado:' + uid) : (slot || 'seguimiento.tratamiento'),
            cip: firstNonEmpty(cipEl && cipEl.value, currentSegPatient && currentSegPatient.cip),
            tratamiento_id: '',
            linea_id: line && line.linea_id || ''
        };
    }

    function hasMeaningfulTreatment(t) {
        if (!t) return false;
        return !!firstNonEmpty(t.farmaco_nombre, t.nombre_comercial, t.principio_activo, t.selected_drug_id);
    }

    function renderSegTreatmentSummary(treatment) {
        var container = document.getElementById('fhSegTratamientoGrid');
        if (!container) return;
        F.clearChildren(container);
        if (!hasMeaningfulTreatment(treatment)) return;
        var helper = getTreatmentHelper();
        var summary = helper && typeof helper.buildTreatmentSummary === 'function'
            ? helper.buildTreatmentSummary(treatment)
            : { titulo: treatment.farmaco_nombre || treatment.nombre_comercial || '—', subtitulo: '', meta: [] };
        var fields = [
            { label: 'Tratamiento actual', value: summary.titulo || '—' },
            { label: 'Principio activo', value: treatment.principio_activo || '—' },
            { label: 'Presentación / dosis', value: treatment.dosis_texto || treatment.presentacion || '—' },
            { label: 'Vía', value: treatment.via || '—' },
            { label: 'Pauta / intervalo', value: treatment.pauta || '—' },
            { label: 'Estado línea', value: treatment.estado_linea || '—' },
            { label: 'Movimiento', value: treatment.tipo_movimiento || '—' },
            { label: 'Relación', value: treatment.tipo_relacion || '—' },
            { label: 'Origen catálogo', value: treatment.source_type || (treatment.fuente || '—') }
        ];
        F.renderFields(container, fields);
    }

    var segAutocompleteActiveIndex = -1;
    var currentSegPatient = null;
    var currentBiologicLines = [];
    var currentFollowupVisit = null;
    var followupOtherDrugs = [];
    var followupOtherDrugSeq = 0;
    var SWITCH_MESSAGE = 'Vas a cambiar de paciente. Se limpiarán los datos no guardados de esta pantalla. ¿Quieres continuar?';
    var LINE_DISCARD_MESSAGE = 'Esta línea contiene datos introducidos en la visita actual. Si la desmarca, se perderán.';
    var LINE_CONTROL_IDS = ['fhSegTipoRelacionTerapia', 'fhSegOptimiza', 'fhSegNuevaDosis', 'fhSegNuevaPauta', 'fhSegNuevaPautaOtro', 'fhSegMotivoOpt', 'fhSegSuspension', 'fhSegMotivoSusp', 'fhSegObservacionesLinea'];
    var LINE_CONTROL_DEFAULTS = {
        fhSegTipoRelacionTerapia: 'sin_cambios', fhSegOptimiza: 'No', fhSegNuevaDosis: '',
        fhSegNuevaPauta: '', fhSegNuevaPautaOtro: '', fhSegMotivoOpt: 'No aplica',
        fhSegSuspension: 'No', fhSegMotivoSusp: 'No aplica', fhSegObservacionesLinea: ''
    };

    var FOLLOWUP_RELATION_OPTIONS = [
        'Tratamiento activo previo / línea existente',
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
        if (!state) return '—';
        var s = String(state).toLowerCase().trim();
        if (s === 'activo' || s === 'active') return 'Activo';
        if (s === 'suspendido' || s === 'suspended') return 'Suspendido';
        if (s === 'finalizado' || s === 'finished' || s === 'completed') return 'Finalizado';
        if (s === 'validado_pendiente_inicio' || s === 'validated_not_started') return 'Validado, pendiente de inicio';
        if (s === 'desconocido' || s === 'unknown') return 'Desconocido';
        if (s === 'historico' || s === 'historical' || s === 'previo') return 'Histórico';
        if (s === 'validado' || s === 'validated') return 'Validado';
        if (s === 'no_aplica' || s === 'n/a') return 'No aplica';
        if (s === 'anadido' || s === 'añadido') return 'Añadido';
        return state.charAt(0).toUpperCase() + state.slice(1);
    }

    function biologicRelationLabel(type) {
        if (type === 'primary') return 'Principal';
        if (type === 'additional') return 'Adicional';
        if (type === 'unknown') return 'Desconocida';
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

    function setSegPautaActualNormalized(pautaText) {
        var select = byId('fhSegPautaActual');
        var otro = byId('fhSegPautaActualOtro');
        if (!select) return;
        var pautaObj = P && typeof P.normalizePautaLabel === 'function' ? P.normalizePautaLabel(pautaText) : null;
        if (pautaObj && pautaObj.pauta_codigo) {
            select.value = pautaObj.pauta_codigo;
            if (pautaObj.pauta_codigo === 'OTRO' && otro) {
                otro.value = pautaObj.pauta_otro_texto || '';
                otro.classList.remove('hidden');
            } else if (otro) {
                otro.value = '';
                otro.classList.add('hidden');
            }
        } else {
            select.value = '';
            if (otro) { otro.value = ''; otro.classList.add('hidden'); }
        }
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

    function canonicalRelationship(value) {
        var normalized = String(value || '').toLowerCase().trim();
        if (normalized === 'primary' || normalized === 'principal') return 'primary';
        if (normalized === 'additional' || normalized === 'adicional') return 'additional';
        if (normalized === 'unknown' || normalized === 'desconocido') return 'unknown';
        return 'unknown';
    }

    function canonicalLineStatus(value) {
        var normalized = String(value || '').toLowerCase().trim();
        if (normalized === 'active' || normalized === 'activo') return 'active';
        if (normalized === 'suspended' || normalized === 'suspendido') return 'suspended';
        if (normalized === 'completed' || normalized === 'finalizado') return 'completed';
        if (normalized === 'validated_not_started' || normalized === 'validado_pendiente_inicio') return 'validated_not_started';
        if (normalized === 'unknown' || normalized === 'desconocido') return 'unknown';
        return 'unknown';
    }

    function normalizeBiologicLine(line, patient, overrides) {
        overrides = overrides || {};
        return {
            cip: patient.cip,
            linea_id: line.linea_id,
            orden: line.orden || '',
            farmaco_nombre: line.farmaco_nombre || '',
            nombre_linea: line.nombre_linea || line.farmaco_nombre || line.principio_activo || line.nombre_comercial || '',
            nombre_comercial: line.nombre_comercial || line.nombre_linea || '',
            principio_activo: line.principio_activo || '',
            dosis: line.dosis || '',
            dosis_texto: line.dosis_texto || '',
            presentacion: line.presentacion || line.presentacion_dosis || '',
            via: line.via || '',
            pauta: line.pauta || '',
            fecha_inicio: line.fecha_inicio || '',
            fecha_fin: line.fecha_fin || '',
            codigo_nacional: line.codigo_nacional || '',
            nregistro: line.nregistro || '',
            source_type: line.source_type || '',
            selected_drug_id: line.selected_drug_id || '',
            fuente: line.fuente || '',
            etiquetas: line.etiquetas == null ? '' : line.etiquetas,
            estado_linea: overrides.estado_linea || canonicalLineStatus(line.estado_linea),
            tipo_relacion: overrides.tipo_relacion || canonicalRelationship(line.tipo_relacion),
            es_principal: (overrides.tipo_relacion || canonicalRelationship(line.tipo_relacion)) === 'primary',
            tratamiento_id_principal: line.tratamiento_id_principal || line.id || ''
        };
    }

    var DEMO_LINE_CONTRACT = {
        'CIP-DEMO-FH-001': [{ linea_id: 'BIO-FH-001-L1', estado_linea: 'active', tipo_relacion: 'primary' }],
        'CIP-DEMO-FH-002': [],
        'CIP-DEMO-FH-003': [{ linea_id: 'BIO-FH-003-L1', estado_linea: 'validated_not_started', tipo_relacion: 'primary' }],
        'CIP-DEMO-FH-004': [
            { linea_id: 'BIO-FH-004-L1', estado_linea: 'completed', tipo_relacion: 'primary' },
            { linea_id: 'BIO-FH-004-L2', estado_linea: 'active', tipo_relacion: 'primary' },
            { linea_id: 'BIO-FH-004-L3', estado_linea: 'active', tipo_relacion: 'additional' }
        ]
    };

    function findPatientLineById(patient, lineId) {
        if (!patient || !Array.isArray(patient.biologicos)) return null;
        for (var i = 0; i < patient.biologicos.length; i++) {
            if (patient.biologicos[i].linea_id === lineId) return patient.biologicos[i];
        }
        return null;
    }

    function getPatientBiologicLines(patient) {
        if (!patient) return [];
        if (!patient.cip) return [];
        if (Object.prototype.hasOwnProperty.call(DEMO_LINE_CONTRACT, patient.cip)) {
            return DEMO_LINE_CONTRACT[patient.cip].map(function (contractLine) {
                var source = findPatientLineById(patient, contractLine.linea_id);
                if (!source) source = {
                    linea_id: contractLine.linea_id,
                    farmaco_nombre: patient.farmaco || '',
                    principio_activo: patient.principioActivo || '',
                    dosis: patient.dosis || '',
                    via: patient.via || '',
                    pauta: patient.pauta || '',
                    fecha_inicio: patient.primeraVisita || ''
                };
                var merged = Object.assign({}, source, contractLine);
                return normalizeBiologicLine(merged, patient, contractLine);
            });
        }
        if (Array.isArray(patient.biologicos) && patient.biologicos.length) {
            return patient.biologicos.filter(function (line) {
                return !!line.linea_id;
            }).map(function (line) {
                return normalizeBiologicLine(line, patient);
            });
        }
        return [];
    }

    function getCurrentSelectedLine() {
        var select = document.getElementById('fhSegLineaPrincipal');
        if (!currentBiologicLines.length) return null;
        if (!select || !select.value) return null;
        for (var i = 0; i < currentBiologicLines.length; i++) {
            if (currentBiologicLines[i].linea_id === select.value) return currentBiologicLines[i];
        }
        return null;
    }

    function createFollowupVisit(cip) {
        currentFollowupVisit = {
            cip: String(cip || '').trim(),
            visit_id: 'FH-VISIT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
            selected_line_ids: [], editing_line_id: '', line_state: {}
        };
        return currentFollowupVisit;
    }

    function clearMoriskyControls(disabled) {
        document.querySelectorAll('.mg-chip').forEach(function (chip) {
            chip.classList.remove('mg-chip--active');
            chip.disabled = disabled;
        });
        F.setText('fhSegMoriskyResultado', 'Resultado Morisky-Green: pendiente de completar');
        var result = byId('fhSegMoriskyResultado');
        if (result) result.classList.remove('mg-result--high', 'mg-result--medium', 'mg-result--low');
    }

    function readVisibleLineState() {
        var state = { controls: {}, morisky: {} };
        LINE_CONTROL_IDS.forEach(function (id) { state.controls[id] = fv(id); });
        document.querySelectorAll('.mg-chip--active').forEach(function (chip) {
            state.morisky[chip.getAttribute('data-mg-name')] = chip.getAttribute('data-mg-value');
        });
        return state;
    }

    function lineStateIsDirty(state) {
        return !!state && (LINE_CONTROL_IDS.some(function (id) {
            return String((state.controls || {})[id] == null ? LINE_CONTROL_DEFAULTS[id] : state.controls[id]) !== LINE_CONTROL_DEFAULTS[id];
        }) || Object.keys(state.morisky || {}).length > 0);
    }

    function captureEditingLineState() {
        if (currentFollowupVisit && currentFollowupVisit.editing_line_id) {
            currentFollowupVisit.line_state[currentFollowupVisit.editing_line_id] = readVisibleLineState();
        }
    }

    function restoreEditingLineState() {
        var editing = currentFollowupVisit && currentFollowupVisit.editing_line_id;
        var state = editing && currentFollowupVisit.line_state[editing] || { controls: {}, morisky: {} };
        LINE_CONTROL_IDS.forEach(function (id) {
            var el = byId(id);
            if (!el) return;
            el.disabled = !editing;
            el.value = editing
                ? (Object.prototype.hasOwnProperty.call(state.controls, id) ? state.controls[id] : LINE_CONTROL_DEFAULTS[id])
                : '';
        });
        clearMoriskyControls(!editing);
        if (editing) {
            document.querySelectorAll('.mg-chip').forEach(function (chip) {
                chip.disabled = false;
                if (state.morisky[chip.getAttribute('data-mg-name')] === chip.getAttribute('data-mg-value')) chip.classList.add('mg-chip--active');
            });
            updateMorisky();
        }
        var help = byId('fhSegLineEditorHelp');
        if (help) help.classList.toggle('hidden', !!editing);
        ['fhSegOptimiza', 'fhSegSuspension', 'fhSegNuevaPauta'].forEach(function (id) {
            var el = byId(id);
            if (editing && el) el.dispatchEvent(new Event('change'));
        });
    }

    function syncEditorOptions() {
        var select = byId('fhSegLineaPrincipal');
        if (!select || !currentFollowupVisit) return;
        F.clearChildren(select);
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Seleccionar línea...';
        select.appendChild(placeholder);
        currentFollowupVisit.selected_line_ids.forEach(function (lineId) {
            var line = currentBiologicLines.find(function (item) { return item.linea_id === lineId; });
            if (!line) return;
            var option = document.createElement('option');
            option.value = lineId;
            option.textContent = line.nombre_linea || line.nombre_comercial || line.principio_activo || lineId;
            select.appendChild(option);
        });
        select.value = currentFollowupVisit.editing_line_id || '';
    }

    function updateExportInterlock() {
        var count = currentFollowupVisit ? currentFollowupVisit.selected_line_ids.length : 0;
        ['fhSegExportTxt', 'fhSegExportCsv', 'fhSegExcelExportBtn'].forEach(function (id) {
            var button = byId(id);
            if (button) button.disabled = count !== 1;
        });
        var warning = byId('fhSegMultilineExportWarning');
        if (warning) warning.classList.toggle('hidden', count < 2);
    }

    function setEditingLine(lineId) {
        if (!currentFollowupVisit) return null;
        captureEditingLineState();
        currentFollowupVisit.editing_line_id = currentFollowupVisit.selected_line_ids.indexOf(lineId) >= 0 ? lineId : '';
        syncEditorOptions();
        restoreEditingLineState();
        applySelectedBiologicLine();
        return getCurrentSelectedLine();
    }

    function toggleBiologicLineSelection(lineId, selected) {
        if (!currentFollowupVisit) return false;
        var line = currentBiologicLines.find(function (item) { return item.linea_id === lineId; });
        if (!line || line.estado_linea !== 'active') return false;
        var ids = currentFollowupVisit.selected_line_ids;
        var index = ids.indexOf(lineId);
        captureEditingLineState();
        if (selected && index < 0) {
            ids.push(lineId);
            if (!currentFollowupVisit.editing_line_id && ids.length === 1) currentFollowupVisit.editing_line_id = lineId;
        } else if (!selected && index >= 0) {
            if (lineStateIsDirty(currentFollowupVisit.line_state[lineId]) && !window.confirm(LINE_DISCARD_MESSAGE)) {
                renderBiologicLineCards();
                return false;
            }
            ids.splice(index, 1);
            delete currentFollowupVisit.line_state[lineId];
            if (currentFollowupVisit.editing_line_id === lineId) currentFollowupVisit.editing_line_id = ids.length === 1 ? ids[0] : '';
        }
        syncEditorOptions();
        renderBiologicLineCards();
        restoreEditingLineState();
        applySelectedBiologicLine();
        updateExportInterlock();
        return true;
    }

    function createFollowupOtherDrug() {
        followupOtherDrugSeq += 1;
        return {
            uid: 'seg-other-' + followupOtherDrugSeq,
            relationType: FOLLOWUP_RELATION_OPTIONS[0],
            farmaco: '',
            principioActivo: '',
            dosis: '',
            presentacion: '',
            via: '',
            pauta: '',
            pautaCodigo: '',
            pautaOtro: '',
            codigoNacional: '',
            nregistro: '',
            selectedDrugId: '',
            origenCatalogo: '',
            sourceType: '',
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

    function buildPautaSelectForOtherDrug(drug) {
        var pautaOptions = [];
        if (P && typeof P.getPautaOptions === 'function') {
            pautaOptions = P.getPautaOptions();
        }
        var select = buildSelectControl(pautaOptions, drug.pautaCodigo, 'Seleccionar...');
        var otroInput = createElement('input', 'form-control hidden');
        otroInput.type = 'text';
        otroInput.value = drug.pautaOtro || '';
        otroInput.placeholder = 'Especificar otra pauta';
        otroInput.setAttribute('data-field', 'pautaOtro');
        otroInput.setAttribute('data-uid', drug.uid);
        otroInput.addEventListener('input', function () {
            updateFollowupOtherDrug(drug.uid, 'pautaOtro', this.value);
        });
        select.addEventListener('change', function () {
            var isOtro = this.value === 'OTRO';
            otroInput.classList.toggle('hidden', !isOtro);
            if (!isOtro) {
                otroInput.value = '';
                updateFollowupOtherDrug(drug.uid, 'pautaOtro', '');
            }
            updateFollowupOtherDrug(drug.uid, 'pautaCodigo', this.value);
            var label = '';
            if (this.value && P && typeof P.getPautaByCodigo === 'function') {
                var pautaObj = P.getPautaByCodigo(this.value);
                if (pautaObj) label = pautaObj.pauta_label || '';
            }
            updateFollowupOtherDrug(drug.uid, 'pauta', label);
        });
        if (drug.pautaCodigo === 'OTRO') {
            otroInput.classList.remove('hidden');
        }
        var wrapper = createElement('div', 'other-drug-pauta-wrapper');
        wrapper.appendChild(select);
        wrapper.appendChild(otroInput);
        return wrapper;
    }

    function renderFollowupOtherDrugRow(drug) {
        var card = createElement('section', 'other-drug-card');
        var header = createElement('div', 'other-drug-card__header');
        header.appendChild(createElement('h4', 'other-drug-card__title', 'Tratamiento relacionado'));
        var removeBtn = createElement('button', 'btn btn-outline btn-remove-drug', 'Eliminar');
        removeBtn.type = 'button';
        removeBtn.addEventListener('click', function () {
            var C = getCatalog();
            if (C && C.clearSnapshot) C.clearSnapshot(followupCatalogContext('', drug.uid));
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

        var farmacoInput = createElement('input', 'form-control js-cima-autocomplete');
        farmacoInput.type = 'text';
        farmacoInput.value = drug.farmaco || '';
        farmacoInput.setAttribute('data-field', 'farmaco');
        farmacoInput.setAttribute('data-uid', drug.uid);
        farmacoInput.setAttribute('autocomplete', 'off');
        var autocompleteWrapper = createElement('div', 'autocomplete-wrapper');
        autocompleteWrapper.id = drug.uid + '-autocomplete-wrapper';
        autocompleteWrapper.appendChild(farmacoInput);
        var autocompleteDropdown = createElement('div', 'autocomplete-dropdown hidden');
        autocompleteDropdown.id = drug.uid + '-dropdown';
        autocompleteWrapper.appendChild(autocompleteDropdown);
        grid.appendChild(buildFollowupField('Fármaco', autocompleteWrapper));

        [
            { key: 'principioActivo', label: 'Principio activo', type: 'text' },
            { key: 'dosis', label: 'Dosis', type: 'text' },
            { key: 'presentacion', label: 'Presentación', type: 'text' }
        ].forEach(function (field) {
            var input = createElement('input', 'form-control');
            input.type = field.type;
            input.value = drug[field.key] || '';
            input.setAttribute('data-field', field.key);
            input.setAttribute('data-uid', drug.uid);
            input.addEventListener('input', function () { updateFollowupOtherDrug(drug.uid, field.key, this.value); });
            grid.appendChild(buildFollowupField(field.label, input));
        });

        var viaSelect = buildSelectControl([
            { value: 'SC', label: 'SC' },
            { value: 'IV', label: 'IV' },
            { value: 'Oral', label: 'Oral' },
            { value: 'IM', label: 'IM' },
            { value: 'Otra', label: 'Otra' }
        ], mapRouteToSelect(drug.via), 'Seleccionar…');
        viaSelect.setAttribute('data-field', 'via');
        viaSelect.setAttribute('data-uid', drug.uid);
        viaSelect.addEventListener('change', function () { updateFollowupOtherDrug(drug.uid, 'via', this.value); });
        grid.appendChild(buildFollowupField('Vía', viaSelect));

        var pautaWrapper = buildPautaSelectForOtherDrug(drug);
        grid.appendChild(buildFollowupField('Pauta', pautaWrapper));

        [
            { key: 'codigoNacional', label: 'Cód. Nacional', type: 'text' },
            { key: 'nregistro', label: 'Nº Registro', type: 'text' }
        ].forEach(function (field) {
            var input = createElement('input', 'form-control');
            input.type = field.type;
            input.value = drug[field.key] || '';
            input.setAttribute('data-field', field.key);
            input.setAttribute('data-uid', drug.uid);
            input.addEventListener('input', function () { updateFollowupOtherDrug(drug.uid, field.key, this.value); });
            grid.appendChild(buildFollowupField(field.label, input));
        });

        var origenInput = createElement('input', 'form-control');
        origenInput.type = 'text';
        origenInput.value = drug.origenCatalogo || '';
        origenInput.setAttribute('data-field', 'origenCatalogo');
        origenInput.setAttribute('data-uid', drug.uid);
        origenInput.addEventListener('input', function () { updateFollowupOtherDrug(drug.uid, 'origenCatalogo', this.value); });
        grid.appendChild(buildFollowupField('Origen catálogo', origenInput));

        [
            { key: 'fechaInicio', label: 'Fecha inicio', type: 'date' },
            { key: 'fechaFin', label: 'Fecha fin', type: 'date' },
            { key: 'motivo', label: 'Motivo/contexto', type: 'text' }
        ].forEach(function (field) {
            var input = createElement('input', 'form-control');
            input.type = field.type;
            input.value = drug[field.key] || '';
            input.setAttribute('data-field', field.key);
            input.setAttribute('data-uid', drug.uid);
            input.addEventListener('input', function () { updateFollowupOtherDrug(drug.uid, field.key, this.value); });
            grid.appendChild(buildFollowupField(field.label, input));
        });

        var suspectSelect = buildSelectControl(['No consta', 'No', 'Sí'], drug.sospechosoEa);
        suspectSelect.setAttribute('data-field', 'sospechosoEa');
        suspectSelect.setAttribute('data-uid', drug.uid);
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

    function setOtherDrugField(uid, key, value) {
        updateFollowupOtherDrug(uid, key, value);
        var input = document.querySelector('[data-uid="' + uid + '"][data-field="' + key + '"]');
        if (input) {
            if (input.tagName === 'SELECT') {
                input.value = value || '';
            } else {
                input.value = value || '';
            }
        }
    }

    function mergeRelatedTreatmentCatalogIdentity(existing, d, previous) {
        existing = existing || {};
        d = d || {};
        var helper = getTreatmentHelper();
        var sourceType = String(d.source_type || '').toUpperCase();
        var origenLabel = '';
        if (sourceType === 'CIMA') origenLabel = 'CIMA';
        else if (sourceType === 'LOCAL') origenLabel = 'Local Especial';
        else if (sourceType === 'LOCAL_PENDIENTE_DEMO') origenLabel = 'Demo/local pendiente';
        else origenLabel = d.source_type || 'Demo';

        var reconciled = helper && typeof helper.reconcileCatalogSelection === 'function'
            ? helper.reconcileCatalogSelection({
                farmaco_nombre: existing.farmaco,
                principio_activo: existing.principioActivo,
                presentacion: existing.presentacion,
                dosis_texto: existing.dosis,
                via: existing.via,
                codigo_nacional: existing.codigoNacional,
                nregistro: existing.nregistro
            }, previous, d, 'seguimiento.relacionado:' + existing.uid)
            : { values: {}, proposal_values: {} };
        var catalog = getCatalog();
        var relatedViaValue = reconciled.values.via || '';
        if (catalog && typeof catalog.mapCatalogViaToSelect === 'function') relatedViaValue = catalog.mapCatalogViaToSelect(relatedViaValue);
        else if (helper && typeof helper.mapViaToSelect === 'function') relatedViaValue = helper.mapViaToSelect(relatedViaValue);
        reconciled.values.via = relatedViaValue;
        if (Object.prototype.hasOwnProperty.call(reconciled.proposal_values, 'via')) reconciled.proposal_values.via = relatedViaValue;
        return {
            values: {
                farmaco: reconciled.values.farmaco_nombre || '',
                principioActivo: reconciled.values.principio_activo || '',
                presentacion: reconciled.values.presentacion || '',
                dosis: reconciled.values.dosis_texto || '',
                via: reconciled.values.via || '',
                codigoNacional: reconciled.values.codigo_nacional || '',
                nregistro: reconciled.values.nregistro || '',
                selectedDrugId: reconciled.values.selected_drug_id || '',
                origenCatalogo: origenLabel,
                sourceType: sourceType
            },
            proposal_values: reconciled.proposal_values
        };
    }

    function applyCatalogSelectionToOtherDrug(uid, d) {
        var existing = followupOtherDrugs.find(function (drug) { return drug.uid === uid; });
        if (!existing || !d) return;
        var C = getCatalog();
        if (C && C.isConcreteCatalogSelection && !C.isConcreteCatalogSelection(d)) return;
        var context = followupCatalogContext('', uid);
        var contextValid = !C || typeof C.snapshotContextKey !== 'function' || Boolean(C.snapshotContextKey(context));
        var previous = contextValid && C && typeof C.getSnapshot === 'function' ? C.getSnapshot(context) : null;
        var reconciled = mergeRelatedTreatmentCatalogIdentity(existing, d, previous);
        Object.keys(reconciled.values).forEach(function (key) { existing[key] = reconciled.values[key]; });
        Object.keys(reconciled.values).forEach(function (key) {
            var control = document.querySelector('[data-uid="' + uid + '"][data-field="' + key + '"]');
            if (control) control.value = reconciled.values[key] || '';
        });
        if (contextValid && C && typeof C.selectDrug === 'function') C.selectDrug(d, context, reconciled);
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
                applyCatalogSelectionToOtherDrug(uid, d);
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
        if (relationType === 'Tratamiento activo previo / línea existente') return 'Tratamiento activo previo';
        if (relationType === 'Biológico previo/histórico') return 'Biológico previo/histórico';
        if (relationType === 'Exposición') return 'Exposición';
        return 'Concomitante';
    }

    function mapOtherDrugToContract(drug) {
        var relation = 'concomitante';
        var estado_linea = 'activo';
        var tipo_movimiento = 'no_aplica';
        if (drug.relationType === 'Tratamiento activo previo / línea existente') {
            relation = 'adicional';
            tipo_movimiento = '';
        } else if (drug.relationType === 'Biológico previo/histórico') {
            relation = 'historico';
            tipo_movimiento = '';
            estado_linea = 'historico';
        } else if (drug.relationType === 'Exposición') {
            relation = 'exposicion';
            tipo_movimiento = '';
            estado_linea = 'no_aplica';
        }
        if (drug.sospechosoEa === 'Sí') {
            relation = 'sospechoso_ea';
            if (!estado_linea) estado_linea = 'no_aplica';
        }
        return {
            tipo_relacion: relation,
            estado_linea: estado_linea,
            tipo_movimiento: tipo_movimiento
        };
    }

    function getRelevantDrugCandidates() {
        var candidates = [];
        var seenIds = {};
        // Añadir todas las líneas biológicas (principales, activas, históricas)
        currentBiologicLines.forEach(function (line) {
            var id = 'line:' + line.linea_id;
            if (seenIds[id]) return;
            seenIds[id] = true;
            var cat = 'Biológico no clasificado';
            var linePriority = 6;
            if (line.estado_linea === 'active') {
                cat = 'Biológico activo';
                linePriority = line.es_principal ? 1 : 2;
            } else if (line.estado_linea === 'validated_not_started') {
                cat = 'Biológico validado pendiente de inicio';
                linePriority = 4;
            } else if (line.estado_linea === 'suspended') {
                cat = 'Biológico suspendido';
                linePriority = 5;
            } else if (line.estado_linea === 'completed') {
                cat = 'Biológico finalizado/histórico';
                linePriority = 5;
            }
            var name = line.nombre_linea || line.farmaco_nombre || line.nombre_comercial || line.principio_activo || '';
            candidates.push({
                id: id,
                category: cat,
                label: name ? (name + ' — ' + cat) : 'Tratamiento principal',
                source: 'principal',
                tipo_relacion: line.tipo_relacion || (line.es_principal ? 'principal' : 'historico'),
                prioridad: linePriority
            });
        });
        // Fallback DOM: leer tratamiento actual directamente si no hay líneas cargadas
        if (!candidates.length) {
            var fhSegFarmaco = byId('fhSegFarmaco');
            var fhSegPrincipioActivo = byId('fhSegPrincipioActivo');
            var domName = (fhSegFarmaco && fhSegFarmaco.value) || (fhSegPrincipioActivo && fhSegPrincipioActivo.value) || '';
            if (domName) {
                var domId = 'dom:current-treatment';
                if (!seenIds[domId]) {
                    seenIds[domId] = true;
                    candidates.push({
                        id: domId,
                        category: 'Tratamiento principal',
                        label: domName + ' — Tratamiento principal',
                        source: 'principal',
                        tipo_relacion: 'principal',
                        prioridad: 1
                    });
                }
            }
            // Fallback adicional: línea seleccionada actual en el select
            var selectedLine = getCurrentSelectedLine();
            if (selectedLine) {
                var sid = 'line:' + selectedLine.linea_id;
                if (!seenIds[sid]) {
                    seenIds[sid] = true;
                    var sName = selectedLine.nombre_linea || selectedLine.farmaco_nombre || selectedLine.nombre_comercial || selectedLine.principio_activo || '';
                    candidates.push({
                        id: sid,
                        category: 'Biológico activo',
                        label: sName ? (sName + ' — Biológico activo') : 'Tratamiento principal',
                        source: 'principal',
                        tipo_relacion: selectedLine.tipo_relacion || 'principal',
                        prioridad: 1
                    });
                }
            }
        }
        // Añadir todos los otros fármacos (existentes, concomitantes, históricos, exposiciones)
        followupOtherDrugs.forEach(function (drug) {
            var name = drug.farmaco || drug.principioActivo;
            if (!name) return;
            var oid = 'other:' + drug.uid;
            if (seenIds[oid]) return;
            seenIds[oid] = true;
            var contract = mapOtherDrugToContract(drug);
            var category = normalizeFollowupDrugCategory(drug.relationType);
            if (contract.tipo_relacion === 'sospechoso_ea') {
                category = 'Sospechoso de EA';
            }
            var p = 5;
            if (contract.tipo_relacion === 'concomitante') p = 3;
            else if (contract.tipo_relacion === 'adicional') p = 4;
            candidates.push({
                id: oid,
                category: category,
                label: name + ' — ' + category,
                source: 'other',
                tipo_relacion: contract.tipo_relacion,
                prioridad: p
            });
        });
        // Ordenar: principal, activos, concomitantes, líneas previas, históricos/exposiciones
        candidates.sort(function (a, b) { return (a.prioridad || 9) - (b.prioridad || 9); });
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
        var cards = document.getElementById('fhSegLineCards');

        if (!patient) {
            currentBiologicLines = [];
            if (currentFollowupVisit) {
                currentFollowupVisit.selected_line_ids = [];
                currentFollowupVisit.editing_line_id = '';
                currentFollowupVisit.line_state = {};
            }
            syncEditorOptions();
            if (estadoLinea) estadoLinea.value = '';
            if (cards) F.clearChildren(cards);
            F.clearChildren(document.getElementById('fhSegTratamientoGrid'));
            restoreEditingLineState();
            updateExportInterlock();
            return;
        }

        if (!currentFollowupVisit || currentFollowupVisit.cip !== patient.cip) createFollowupVisit(patient.cip);
        currentBiologicLines = getPatientBiologicLines(patient);
        var activeLines = currentBiologicLines.filter(function (line) { return line.estado_linea === 'active'; });

        if (!lineaPrincipal) return;
        currentFollowupVisit.selected_line_ids = activeLines.length === 1 ? [activeLines[0].linea_id] : [];
        currentFollowupVisit.editing_line_id = activeLines.length === 1 ? activeLines[0].linea_id : '';
        currentFollowupVisit.line_state = {};
        syncEditorOptions();
        renderBiologicLineCards();
        restoreEditingLineState();
        applySelectedBiologicLine();
        updateExportInterlock();
    }

    function renderBiologicLineCards() {
        var container = document.getElementById('fhSegLineCards');
        if (!container) return;
        F.clearChildren(container);
        currentBiologicLines.forEach(function (line) {
            var selectable = line.estado_linea === 'active';
            var card = createElement('label', 'seg-line-card' + (selectable ? '' : ' seg-line-card--disabled'));
            card.dataset.lineId = line.linea_id;
            var control = createElement('input', 'seg-line-card__control');
            control.type = 'checkbox';
            control.name = 'fhSegLineCardSelection';
            control.value = line.linea_id;
            control.disabled = !selectable;
            control.setAttribute('aria-label', 'Seleccionar línea ' + line.linea_id);
            control.checked = !!currentFollowupVisit && currentFollowupVisit.selected_line_ids.indexOf(line.linea_id) >= 0;
            control.addEventListener('change', function () { toggleBiologicLineSelection(line.linea_id, control.checked); });
            var body = createElement('span', 'seg-line-card__body');
            body.appendChild(createElement('strong', 'seg-line-card__name', line.nombre_linea || line.nombre_comercial || line.principio_activo || 'Línea sin nombre'));
            body.appendChild(createElement('code', 'seg-line-card__id', line.linea_id));
            body.appendChild(createElement('span', 'seg-line-card__meta', biologicRelationLabel(line.tipo_relacion) + ' · ' + biologicStateLabel(line.estado_linea)));
            card.appendChild(control);
            card.appendChild(body);
            container.appendChild(card);
        });
        if (!currentBiologicLines.length) container.appendChild(createElement('p', 'seg-line-cards__empty', 'No hay líneas activas o históricas disponibles.'));
    }

    function selectBiologicLineById(lineId) {
        var selected = null;
        for (var i = 0; i < currentBiologicLines.length; i++) {
            if (currentBiologicLines[i].linea_id === lineId && currentBiologicLines[i].estado_linea === 'active') selected = currentBiologicLines[i];
        }
        if (!selected) return setEditingLine('');
        if (currentFollowupVisit.selected_line_ids.indexOf(lineId) < 0) toggleBiologicLineSelection(lineId, true);
        else setEditingLine(lineId);
        return selected;
    }

    function formatLineTags(value) {
        if (Array.isArray(value)) return value.map(String).filter(Boolean).join(', ');
        if (!value || typeof value !== 'object') return value == null ? '' : String(value);
        return Object.keys(value).filter(function (key) { return !!value[key]; }).map(function (key) {
            return key === 'biosimilar' ? 'Biosimilar' : key === 'es_hospitalario' ? 'Hospitalario' : key;
        }).join(', ');
    }

    function biologicSourceLabel(sourceType, fuente, fallback) {
        var explicit = firstNonEmpty(sourceType);
        var normalized = explicit.toUpperCase();
        if (normalized === 'CIMA') return 'CIMA';
        if (normalized === 'LOCAL') return 'Local Especial';
        if (normalized === 'LOCAL_PENDIENTE_DEMO') return 'Demo/local pendiente';
        return explicit || firstNonEmpty(fuente) || fallback || '';
    }

    function applySelectedBiologicLine() {
        var line = getCurrentSelectedLine();
        var helper = getTreatmentHelper();
        var C = window.FarmaciaCatalog;
        var snap = line && C && C.getSnapshot ? C.getSnapshot(followupCatalogContext('seguimiento.tratamiento')) : null;
        if (line) {
            if (snap && snap.nombre_snapshot) setSegValue('fhSegFarmaco', snap.nombre_snapshot);
            else setSegValue('fhSegFarmaco', line.farmaco_nombre || line.nombre_comercial || line.nombre_linea || '');
            if (snap && snap.principio_activo_snapshot) setSegValue('fhSegPrincipioActivo', snap.principio_activo_snapshot);
            else setSegValue('fhSegPrincipioActivo', line.principio_activo || '');
            setSegValue('fhSegPresentacion', snap && snap.presentacion_snapshot || line.presentacion || '');
            setSegValue('fhSegDosisActual', line.dosis || line.dosis_texto || '');
            setSegValue('fhSegVia', mapRouteToSelect(line.via));
            setSegPautaActualNormalized(line.pauta || '');
            setSegValue('fhSegEstadoLinea', biologicStateLabel(line.estado_linea));
            setSegValue('fhSegFechaInicio', line.fecha_inicio || '');
            // Renderizar resumen con contrato común
            if (helper && typeof helper.normalizeTreatmentInput === 'function') {
                var normalized = helper.normalizeTreatmentInput(line, { fuente: 'seguimiento' });
                renderSegTreatmentSummary(normalized);
            } else {
                renderSegTreatmentSummary(line);
            }
        } else {
            // Compatibilidad para integraciones antiguas sin el bloque de tarjetas; la pantalla actual siempre lo incluye.
            if (!document.getElementById('fhSegLineCards')) return;
            setSegValue('fhSegFarmaco', '');
            setSegValue('fhSegPrincipioActivo', '');
            setSegValue('fhSegPresentacion', '');
            setSegValue('fhSegDosisActual', '');
            setSegValue('fhSegVia', '');
            setSegValue('fhSegPautaActual', '');
            setSegValue('fhSegEstadoLinea', '');
            setSegValue('fhSegFechaInicio', '');
            var grid = document.getElementById('fhSegTratamientoGrid');
            if (grid) F.clearChildren(grid);
        }
        // Sincronizar tarjeta CIMA con la línea seleccionada
        var cimaEl = document.getElementById('fhSegCimaContextPrincipioActivo');
        if (cimaEl && line) {
            if (!snap) F.setText('fhSegCimaContextPrincipioActivo', line.principio_activo || '\u2014');
            else F.setText('fhSegCimaContextPrincipioActivo', snap.principio_activo_snapshot || line.principio_activo || '\u2014');
        } else if (cimaEl && !line) {
            F.setText('fhSegCimaContextPrincipioActivo', '\u2014');
        }
        setSegValue('fhSegCodigoNacional', snap && snap.codigo_nacional_snapshot || line && line.codigo_nacional || '');
        setSegValue('fhSegNregistro', snap && snap.nregistro_snapshot || line && line.nregistro || '');
        var tags = snap && Object.prototype.hasOwnProperty.call(snap, 'etiquetas') ? snap.etiquetas : line && line.etiquetas;
        setSegValue('fhSegEtiquetas', formatLineTags(tags));
        setSegValue('fhSegOrigenCatalogo', biologicSourceLabel(snap && snap.source_type, snap && snap.fuente, snap ? '' : line ? biologicSourceLabel(line.source_type, line.fuente, 'Demo') : ''));
        updateSuspectDrugSelector();
    }

    function applyContext() {
        const ctx = F.getQueryContext();
        currentSegPatient = ctx.patient || (ctx.cip ? { cip: ctx.cip } : null);
        createFollowupVisit(currentSegPatient && currentSegPatient.cip || ctx.cip || '');

        if (ctx.cip && !ctx.patient) {
            var C = window.FarmaciaCatalog;
            if (C && C.clearSnapshot) C.clearSnapshot(followupCatalogContext('seguimiento.tratamiento'));
        }

        F.setValue('fhSegCip', ctx.cip);
        F.setValue('fhSegServicio', ctx.servicio || ctx.patient?.servicio);
        // Guardar valor de patología para restaurarlo tras initSegServicioPatologiaSync
        // (el select aún no tiene opciones pobladas)
        var patSelectPending = document.getElementById('fhSegPatologia');
        if (patSelectPending) {
            patSelectPending.dataset.pendingPatologia = ctx.patologia || ctx.patient?.patologia || '';
        }

        const snap = window.FarmaciaCatalog ? window.FarmaciaCatalog.getSnapshot(followupCatalogContext('seguimiento.tratamiento')) : null;

        if (ctx.patient) {
            F.setValue('fhSegFarmaco', snap?.nombre_snapshot || ctx.patient.farmaco);
            F.setValue('fhSegDosisActual', ctx.patient.dosis);
            setSegPautaActualNormalized(ctx.patient.pauta);
            (function() {
                var segCtxSelect = document.getElementById('fhSegNuevaPauta');
                if (segCtxSelect && ctx.patient.pauta) {
                    var segCtxPautaObj = P && typeof P.normalizePautaLabel === 'function' ? P.normalizePautaLabel(ctx.patient.pauta) : null;
                    if (segCtxPautaObj && segCtxPautaObj.pauta_codigo) {
                        segCtxSelect.value = segCtxPautaObj.pauta_codigo;
                        var segCtxOtro = document.getElementById('fhSegNuevaPautaOtro');
                        if (segCtxPautaObj.pauta_codigo === 'OTRO' && segCtxOtro) {
                            segCtxOtro.value = segCtxPautaObj.pauta_otro_texto || '';
                            segCtxOtro.classList.remove('hidden');
                        } else if (segCtxOtro) {
                            segCtxOtro.value = '';
                            segCtxOtro.classList.add('hidden');
                        }
                    }
                }
            })();
            F.setValue('fhSegVia', mapRouteToSelect(ctx.patient.via));
            F.setValue('fhSegFechaInicio', ctx.patient.primeraVisita);
            F.setValue('fhSegUltimaAdherencia', ctx.patient.adherencia);
            F.setValue('fhSegUltimosProms', ctx.patient.proms);
            F.setValue('fhSegEaPrevios', ctx.patient.efectosAdversos);

            F.setValue('fhSegPrincipioActivo', snap?.principio_activo_snapshot || ctx.patient.principioActivo || '');
            F.setText('fhSegCimaContextPrincipioActivo', snap?.principio_activo_snapshot || ctx.patient.principioActivo || '\u2014');
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
        syncBiologicControls(ctx.patient || null);

        const fhSegFecha = document.getElementById('fhSegFecha');
        if (fhSegFecha && !fhSegFecha.value) {
            fhSegFecha.value = new Date().toISOString().slice(0, 10);
        }
        if (!ctx.patient) syncBiologicControls(null);
        if (!ctx.cip && !ctx.patient) F.insertNoCipBanner('fhSegNoCipBanner');
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
        // Limpiar inputs "Otro" de servicio y patología
        var segServicioOtro = document.getElementById('fhSegServicioOtro');
        if (segServicioOtro) { segServicioOtro.value = ''; segServicioOtro.classList.add('hidden'); }
        var segPatologiaOtro = document.getElementById('fhSegPatologiaOtro');
        if (segPatologiaOtro) { segPatologiaOtro.value = ''; segPatologiaOtro.classList.add('hidden'); }
        // Limpiar input Otro de pauta actual
        var segPautaActualOtro = document.getElementById('fhSegPautaActualOtro');
        if (segPautaActualOtro) { segPautaActualOtro.value = ''; segPautaActualOtro.classList.add('hidden'); }
        var drugSearch = document.getElementById('fhSegDrugSearch');
        if (drugSearch) drugSearch.value = '';
        clearSegDrugAutocompleteDropdown();
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

        var currentCip = currentSegPatient && currentSegPatient.cip || '';
        var hasContext = !!currentCip || hasPatientBoundData();
        var decision = F.resolvePatientContextSwitch(currentCip, cip, hasContext);
        if (decision.action === 'same') {
            cipInput.value = currentCip || cip;
            return;
        }
        if (decision.action === 'confirm') {
            decision = F.resolvePatientContextSwitch(currentCip, cip, hasContext, window.confirm(SWITCH_MESSAGE));
        }
        if (decision.action === 'cancel') {
            cipInput.value = currentCip;
            return;
        }

        clearCipNotice();

        var patient = F.findPatientByCip(cip);
        resetPatientContext(cip);
        if (!patient) {
            currentSegPatient = { cip: cip };
            showSegDrugAutocomplete();
            showCipNotice('Paciente no encontrado en demo. Puede completar los datos manualmente.', 'warning');
            return;
        }

        F.setValue('fhSegCip', patient.cip);
        F.setValue('fhSegServicio', patient.servicio);
        // Disparar cambio para sincronizar patología y visibilidad "Otro"
        var servSelectEvt = document.getElementById('fhSegServicio');
        if (servSelectEvt) servSelectEvt.dispatchEvent(new Event('change'));
        F.setValue('fhSegPatologia', patient.patologia);
        var patSelectEvt = document.getElementById('fhSegPatologia');
        if (patSelectEvt) patSelectEvt.dispatchEvent(new Event('change'));
        F.setValue('fhSegFarmaco', patient.farmaco);
        F.setValue('fhSegDosisActual', patient.dosis);
        setSegPautaActualNormalized(patient.pauta);
        (function() {
            var segSelect = document.getElementById('fhSegNuevaPauta');
            if (segSelect && patient.pauta) {
                var segPautaObj = P && typeof P.normalizePautaLabel === 'function' ? P.normalizePautaLabel(patient.pauta) : null;
                if (segPautaObj && segPautaObj.pauta_codigo) {
                    segSelect.value = segPautaObj.pauta_codigo;
                    var segOtro = document.getElementById('fhSegNuevaPautaOtro');
                    if (segPautaObj.pauta_codigo === 'OTRO' && segOtro) {
                        segOtro.value = segPautaObj.pauta_otro_texto || '';
                        segOtro.classList.remove('hidden');
                    } else if (segOtro) {
                        segOtro.value = '';
                        segOtro.classList.add('hidden');
                    }
                }
            }
        })();
        F.setValue('fhSegVia', mapRouteToSelect(patient.via));
        F.setValue('fhSegFechaInicio', patient.primeraVisita);
        F.setValue('fhSegUltimaAdherencia', patient.adherencia);
        F.setValue('fhSegUltimosProms', patient.proms);
        F.setValue('fhSegEaPrevios', patient.efectosAdversos);
        currentSegPatient = patient;

        var snap = window.FarmaciaCatalog ? window.FarmaciaCatalog.getSnapshot(followupCatalogContext('seguimiento.tratamiento')) : null;
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
        syncBiologicControls(patient);

        for (var i = 0; i < cipSearchFields.length; i++) {
            var el = document.getElementById(cipSearchFields[i]);
            if (el) el.readOnly = true;
        }

        hideSegDrugAutocomplete();

        var banner = document.getElementById('fhSegNoCipBanner');
        if (banner) banner.parentNode.removeChild(banner);
    }

    function hasPatientBoundData() {
        var ids = cipSearchFields.concat(['fhSegNuevaDosis', 'fhSegNuevaPauta', 'fhSeguimientoEaObservaciones']);
        var proms = fv('fhSegProms');
        var visibleLineState = currentFollowupVisit && currentFollowupVisit.editing_line_id ? readVisibleLineState() : null;
        var hasVisitLineData = !!visibleLineState && lineStateIsDirty(visibleLineState) || !!currentFollowupVisit && Object.keys(currentFollowupVisit.line_state).some(function (lineId) {
            return lineStateIsDirty(currentFollowupVisit.line_state[lineId]);
        });
        return followupOtherDrugs.length > 0 || ids.some(function (id) {
            var value = fv(id);
            if (id === 'fhSegOrigenCatalogo' && value === 'Demo' && !currentSegPatient) return false;
            return !!value;
        }) || !!proms && proms !== 'No recogido' || hasVisitLineData;
    }

    function resetPatientContext(requestedCip) {
        var previousCip = currentSegPatient && currentSegPatient.cip || '';
        var previousLine = getCurrentSelectedLine();
        var previousMainContext = previousCip ? {
            slot: 'seguimiento.tratamiento',
            cip: previousCip,
            tratamiento_id: '',
            linea_id: previousLine && previousLine.linea_id || ''
        } : null;
        var resetCatalog = getCatalog();
        if (resetCatalog && resetCatalog.clearSnapshot && previousCip) {
            resetCatalog.clearSnapshot(previousMainContext);
            followupOtherDrugs.forEach(function (drug) {
                resetCatalog.clearSnapshot({ slot: 'seguimiento.relacionado:' + drug.uid, cip: previousCip });
            });
        }
        clearCipFields();
        var ids = ['fhSegLineaPrincipal', 'fhSegEstadoLinea', 'fhSegTipoRelacionTerapia', 'fhSegCambiaNivel', 'fhSegNuevoNivel', 'fhSegOptimiza', 'fhSegNuevaDosis', 'fhSegNuevaPauta', 'fhSegNuevaPautaOtro', 'fhSegMotivoOpt', 'fhSegSuspension', 'fhSegMotivoSusp', 'fhSegProms', 'fhSeguimientoEaPresente', 'fhSeguimientoEaGravedad', 'fhSeguimientoEaResuelto', 'fhSeguimientoEaCorregido', 'fhSeguimientoEaObservaciones', 'fhSeguimientoEaFarmacoSospechoso', 'fhCausalidadFinal'];
        ids.forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
        F.setValue('fhSegCip', requestedCip);
        currentBiologicLines = [];
        currentFollowupVisit = null;
        followupOtherDrugs = [];
        followupOtherDrugSeq = 0;
        renderFollowupOtherDrugs();
        syncBiologicControls(null);
        ['fhSegPromsExpanded', 'fhSeguimientoEaGravedadRow', 'fhSeguimientoEaResueltoRow', 'fhSeguimientoEaCorregidoRow', 'fhSeguimientoEaObservacionesRow', 'fhSeguimientoEaFarmacoRow'].forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.add('hidden'); });
        clearMoriskyControls(true);
        document.querySelectorAll('.causality-chip-group .causality-chip').forEach(function (el) { el.classList.remove('causality-chip--active'); });
        ['fhSegEvaDolorRange', 'fhSegEvaPruritoRange'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = '0'; });
        F.setText('fhSegMoriskyResultado', 'Resultado Morisky-Green: pendiente de completar');
        F.setText('fhSegDlqiTotal', '—');
        F.setText('fhSegDlqiInterp', '');
        F.setText('naranjoScore', '0');
        F.setText('naranjoCategoria', 'Dudosa');
        F.setText('klCategoria', 'No clasificable');
        F.setText('fhSegCimaContextPrincipioActivo', '—');
        createFollowupVisit(requestedCip);
        syncEditorOptions();
        updateExportInterlock();
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

    function initSegServicioPatologiaSync() {
        var servicioMap = {
            'Dermatología': ['Hidradenitis supurativa', 'Psoriasis', 'Dermatitis atópica', 'Vitíligo', 'Alopecia areata', 'Otra'],
            'Reumatología': ['Artritis Reumatoide (AR)', 'Espondiloartritis (EspA)', 'Artritis Psoriásica (APs)', 'LES', 'Síndrome de Sjögren', 'Otra'],
            'Digestivo': ['Enfermedad de Crohn', 'Colitis ulcerosa', 'Otra'],
            'Alergología': ['Urticaria crónica espontánea', 'Otra'],
            'Farmacia Hospitalaria': ['Otra'],
            'Medicina Interna': ['Otra'],
            'Otro': ['Otra']
        };
        // Consultar FarmaciaDemo.patologiaPorServicio si existe para datos adicionales
        var extMap = F && F.patologiaPorServicio;
        if (extMap) {
            Object.keys(extMap).forEach(function (key) {
                var mapped = key.charAt(0).toUpperCase() + key.slice(1);
                if (!servicioMap[mapped] && mapped !== 'Otro') {
                    servicioMap[mapped] = extMap[key].slice();
                    if (servicioMap[mapped].indexOf('Otra') === -1 && servicioMap[mapped].indexOf('Otro') === -1) {
                        servicioMap[mapped].push('Otra');
                    }
                }
            });
        }
        var servicioSelect = document.getElementById('fhSegServicio');
        var patologiaSelect = document.getElementById('fhSegPatologia');
        var patologiaOtro = document.getElementById('fhSegPatologiaOtro');
        var servicioOtro = document.getElementById('fhSegServicioOtro');
        if (!servicioSelect || !patologiaSelect) return;

        function populatePatologia(servicioValue) {
            F.clearChildren(patologiaSelect);
            var placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Seleccionar...';
            patologiaSelect.appendChild(placeholder);
            var pats = servicioMap[servicioValue] || [];
            pats.forEach(function (p) {
                var opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                patologiaSelect.appendChild(opt);
            });
            if (patologiaOtro) {
                patologiaOtro.classList.add('hidden');
                patologiaOtro.value = '';
            }
        }

        servicioSelect.addEventListener('change', function () {
            var val = this.value;
            if (servicioOtro) {
                servicioOtro.classList.toggle('hidden', val !== 'Otro');
                if (val !== 'Otro') servicioOtro.value = '';
            }
            populatePatologia(val);
        });

        if (patologiaSelect) {
            patologiaSelect.addEventListener('change', function () {
                if (patologiaOtro) {
                    patologiaOtro.classList.toggle('hidden', this.value !== 'Otra');
                    if (this.value !== 'Otra') patologiaOtro.value = '';
                }
            });
        }

        // Si ya hay un valor precargado (desde applyContext), sincronizar patología
        if (servicioSelect.value) {
            populatePatologia(servicioSelect.value);
            var servicioVal = servicioSelect.value;
            if (servicioOtro) {
                servicioOtro.classList.toggle('hidden', servicioVal !== 'Otro');
            }
        }
        // Si ya hay patología precargada, mostrar input Otro si aplica
        if (patologiaSelect.value === 'Otra' && patologiaOtro) {
            patologiaOtro.classList.remove('hidden');
        }
        // Exponer para que searchCIP pueda sincronizar tras cargar paciente
        window.__segPopulatePatologia = populatePatologia;

        // Restaurar patología precargada por applyContext (dataset.pendingPatologia)
        if (patologiaSelect.dataset.pendingPatologia) {
            patologiaSelect.value = patologiaSelect.dataset.pendingPatologia;
            if (patologiaSelect.value === 'Otra' && patologiaOtro) {
                patologiaOtro.classList.remove('hidden');
            }
            delete patologiaSelect.dataset.pendingPatologia;
        }
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
        if (!C || !drug || (C.isConcreteCatalogSelection && !C.isConcreteCatalogSelection(drug))) return;
        // Main follow-up catalog registration is only available for a manually registered treatment.
        if (currentBiologicLines.length) return;
        var helper = getTreatmentHelper();
        var context = followupCatalogContext('seguimiento.tratamiento');
        var contextValid = typeof C.snapshotContextKey !== 'function' || Boolean(C.snapshotContextKey(context));
        var previous = contextValid && typeof C.getSnapshot === 'function' ? C.getSnapshot(context) : null;
        var reconciled = helper && typeof helper.reconcileCatalogSelection === 'function'
            ? helper.reconcileCatalogSelection({
                farmaco_nombre: fv('fhSegFarmaco'),
                principio_activo: fv('fhSegPrincipioActivo'),
                presentacion: fv('fhSegPresentacion'),
                dosis_texto: fv('fhSegDosisActual'),
                via: fv('fhSegVia'),
                codigo_nacional: fv('fhSegCodigoNacional'),
                nregistro: fv('fhSegNregistro')
            }, previous, drug, context.slot)
            : { values: {}, proposal_values: {} };
        setSegValue('fhSegFarmaco', reconciled.values.farmaco_nombre || '');
        setSegValue('fhSegPrincipioActivo', reconciled.values.principio_activo || '');
        F.setText('fhSegCimaContextPrincipioActivo', reconciled.values.principio_activo || '\u2014');
        setSegValue('fhSegPresentacion', reconciled.values.presentacion || '');
        setSegValue('fhSegDosisActual', reconciled.values.dosis_texto || '');
        setSegValue('fhSegVia', mapRouteToSelect(reconciled.values.via));
        setSegValue('fhSegCodigoNacional', reconciled.values.codigo_nacional || '');
        setSegValue('fhSegNregistro', reconciled.values.nregistro || '');

        var sourceType = (drug.source_type || '').toUpperCase();
        var origenLabel;
        if (sourceType === 'CIMA') {
            origenLabel = 'CIMA';
        } else if (sourceType === 'LOCAL') {
            origenLabel = 'Local Especial';
        } else {
            origenLabel = drug.source_type || 'Demo';
        }
        setSegValue('fhSegOrigenCatalogo', origenLabel);

        var tags = [];
        if (isTruthyRobust(drug.es_hospitalario)) tags.push('Hospitalario');
        if (isTruthyRobust(drug.biosimilar)) tags.push('Biosimilar');
        setSegValue('fhSegEtiquetas', tags.length ? tags.join(', ') : '\u2014');
        if (contextValid && typeof C.selectDrug === 'function') C.selectDrug(drug, context, reconciled);

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
        var snap = C.getSnapshot ? C.getSnapshot(followupCatalogContext('seguimiento.tratamiento')) : null;
        if (!snap || !snap.selected_drug_id) return null;
        return {
            source_type: snap.source_type || '',
            selected_drug_id: snap.selected_drug_id || ''
        };
    }

    function cleanExportToken(value) {
        if (value === null || value === undefined) return '';
        return String(value).replace(/[\r\n\t]+/g, ' ').trim();
    }

    function formatSelectedLineForExport(line) {
        if (!line) return '—';
        var orden = cleanExportToken(line.orden);
        var nombre = cleanExportToken(line.nombre_linea || line.farmaco_nombre || line.nombre_comercial || line.principio_activo || fv('fhSegFarmaco'));
        if (orden && nombre) return 'L' + orden + ' · ' + nombre;
        if (nombre) return nombre;
        if (orden) return 'L' + orden;
        return '—';
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
        lines.push('Línea principal: ' + formatSelectedLineForExport(selectedLine));
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

    window.FarmaciaSeguimiento = {
        searchCIP: searchCIP,
        initCipSearch: initCipSearch,
        initSegDrugAutocomplete: initSegDrugAutocomplete,
        setActivePatientCip: function (cip) {
            var normalizedCip = String(cip || '').trim();
            currentSegPatient = normalizedCip ? { cip: normalizedCip } : null;
            if (!currentFollowupVisit || currentFollowupVisit.cip !== normalizedCip) createFollowupVisit(normalizedCip);
        },
        addFollowupOtherDrug: addFollowupOtherDrug,
        getFollowupOtherDrugs: function () { return JSON.parse(JSON.stringify(followupOtherDrugs)); },
        mergeRelatedTreatmentCatalogIdentity: mergeRelatedTreatmentCatalogIdentity,
        mapRelatedTreatmentToContract: mapOtherDrugToContract,
        getCanonicalLinesForPatient: function (patient) { return getPatientBiologicLines(patient).map(function (line) { return Object.assign({}, line); }); },
        getSelectedLine: function () { var line = getCurrentSelectedLine(); return line ? Object.assign({}, line) : null; },
        getCurrentVisit: function () { return currentFollowupVisit ? JSON.parse(JSON.stringify(currentFollowupVisit)) : null; },
        selectLineById: selectBiologicLineById,
        toggleLineSelection: toggleBiologicLineSelection,
        captureEditingLineState: captureEditingLineState,
        syncLinesForPatient: syncBiologicControls,
        canonicalRelationship: canonicalRelationship,
        canonicalLineStatus: canonicalLineStatus
    };

    document.addEventListener('DOMContentLoaded', () => {
        applyContext();
        initCipSearch();
        initSegServicioPatologiaSync();
        initSegDrugAutocomplete();
        populatePautaSelectSeg('fhSegNuevaPauta', 'fhSegNuevaPautaOtro');
        populatePautaSelectSeg('fhSegPautaActual', 'fhSegPautaActualOtro');

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
        if (lineaPrincipal) lineaPrincipal.addEventListener('change', function () { setEditingLine(lineaPrincipal.value); });
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
            F.copyTextToClipboard(buildSegLines().join('\n'), 'Texto JARA copiado al portapapeles.');
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
                    formatSelectedLineForExport(selectedLine),
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
        // WO8.1b — Botón Excel FH
        (function initSegExcelBtn() {
            var btn = document.getElementById('fhSegExcelExportBtn');
            if (!btn) return;
            btn.addEventListener('click', function () {
                var exp = window.FarmaciaExcelRowExport;
                if (!exp) return;
                var ctx = typeof F !== 'undefined' && F.getQueryContext ? F.getQueryContext() : {};
                var patient = ctx && ctx.patient ? ctx.patient : null;
                if (!patient) { alert('No hay paciente seleccionado.'); return; }
                var line = null;
                if (typeof getCurrentSelectedLine === 'function') line = getCurrentSelectedLine();
                var ea = null;
                var eaSelect = document.getElementById('fhSeguimientoEaFarmacoSospechoso');
                var hasEa = eaSelect && eaSelect.value && eaSelect.value !== '';
                if (hasEa) {
                    ea = {
                        ea_id: 'EA-' + Date.now().toString(36).toUpperCase(),
                        descripcion: (document.getElementById('fhSeguimientoEaDescripcion') || {}).value || '',
                        ea_gravedad: (document.getElementById('fhSeguimientoEaGravedad') || {}).value || '',
                        farmaco_sospechoso_nombre: eaSelect.options[eaSelect.selectedIndex] ? eaSelect.options[eaSelect.selectedIndex].text : '',
                        causalidad_naranjo: (document.getElementById('fhSeguimientoEaNaranjo') || {}).value || '',
                    };
                }
                var opts = {
                    tipoActo: hasEa ? 'efecto_adverso' : 'seguimiento',
                    visitaId: 'SEG-' + Date.now().toString(36).toUpperCase(),
                    lineaActual: line,
                    fechaActo: new Date().toISOString().substring(0, 10),
                    efectoAdverso: ea,
                    hayEa: !!hasEa,
                    proms: patient.proms || null,
                    demoFlag: true,
                };
                var context = exp.buildContextFromSeguimiento(patient, opts);
                var rowObj = exp.buildExcelRowObject(context);
                var rowArr = exp.buildExcelRowArray(rowObj);
                var sheetName = exp.getServiceSheetName(patient.servicio || '') || 'hoja correspondiente';
                exp.copyTSVRowToClipboard(rowArr, { sheetName: sheetName });
            });
        })();
    });
})();
