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

    var FOLLOWUP_DRAFT_PREFIX = 'seguimiento:';

    function createCanonicalController(core, storage, idOptions) {
        if (!core || typeof core.createSessionStore !== 'function') throw new Error('canonical multidrug core unavailable');
        var store = core.createSessionStore(storage);

        function stateAndPatient(patientId) {
            var state = store.load();
            return { state: state, patient: store.getPatientState(state, patientId) };
        }

        function exactActiveLine(patientId, lineId) {
            var loaded = stateAndPatient(patientId);
            var line = loaded.patient.lines[lineId];
            if (!line || line.patient_id !== patientId || line.line_id !== lineId || line.status !== 'active') {
                throw new Error('active canonical line required for exact patient_id + line_id');
            }
            return { state: loaded.state, patient: loaded.patient, line: line };
        }

        function statusLabel(status) {
            if (status === 'active') return 'Activo';
            if (status === 'validated_not_started') return 'Validado · pendiente de inicio';
            if (status === 'historical') return 'Histórico';
            if (status === 'paused') return 'Pausado';
            if (status === 'suspended') return 'Suspendido';
            if (status === 'completed') return 'Finalizado';
            return status || '—';
        }

        function loadPatient(patientId) {
            var loaded = stateAndPatient(patientId);
            var lines = Object.keys(loaded.patient.lines).map(function (lineId) {
                var source = loaded.patient.lines[lineId];
                return Object.assign({}, source, {
                    status_label: statusLabel(source.status),
                    followup_enabled: source.patient_id === patientId && source.line_id === lineId && source.status === 'active'
                });
            });
            var active = lines.filter(function (line) { return line.followup_enabled; });
            var selected = loaded.patient.selected_line_id;
            if (!active.some(function (line) { return line.line_id === selected; })) selected = '';
            return { patient_id: patientId, lines: lines, selected_line_id: selected };
        }

        function resolveContext(patientId, lineId) {
            var exact = exactActiveLine(patientId, lineId);
            if (exact.patient.selected_line_id !== lineId) throw new Error('selected active canonical line required');
            return {
                patient_id: patientId,
                selected_line_id: lineId,
                line: exact.line,
                draft: restoreDraft(patientId, lineId)
            };
        }

        function selectLine(patientId, lineId) {
            var exact = exactActiveLine(patientId, lineId);
            store.save(store.selectLine(exact.state, patientId, lineId));
            return exact.line;
        }

        function clearSelection(patientId) {
            var loaded = stateAndPatient(patientId);
            store.save(store.clearPatientSelection(loaded.state, patientId));
        }

        function buildPayload(input) {
            var source = input || {};
            var patientId = String(source.patient_id || '').trim();
            var lineId = String(source.line_id || '').trim();
            exactActiveLine(patientId, lineId);
            if (loadPatient(patientId).selected_line_id !== lineId) throw new Error('payload line must be the selected canonical line');
            var movement = source.movement && typeof source.movement === 'object'
                ? Object.assign({}, source.movement, { patient_id: patientId, target_line_id: lineId })
                : null;
            var adverse = source.adverse_effect && typeof source.adverse_effect === 'object'
                ? Object.assign({}, source.adverse_effect, { patient_id: patientId, suspect_line_id: lineId })
                : null;
            return { patient_id: patientId, line_id: lineId, movement: movement, adverse_effect: adverse };
        }

        function saveDraft(patientId, lineId, draft) {
            var exact = exactActiveLine(patientId, lineId);
            var saved = {
                patient_id: patientId,
                line_id: lineId,
                data: JSON.parse(JSON.stringify(draft || {}))
            };
            store.save(store.upsertDraft(exact.state, patientId, FOLLOWUP_DRAFT_PREFIX + lineId, saved));
            return saved.data;
        }

        function restoreDraft(patientId, lineId) {
            var loaded = stateAndPatient(patientId);
            var draft = loaded.patient.drafts[FOLLOWUP_DRAFT_PREFIX + lineId];
            if (!draft || draft.patient_id !== patientId || draft.line_id !== lineId || !loaded.patient.lines[lineId] || loaded.patient.lines[lineId].status !== 'active') return null;
            return JSON.parse(JSON.stringify(draft.data || {}));
        }

        function clearPatient(patientId) {
            var loaded = stateAndPatient(patientId);
            var next = loaded.state;
            if (!next.patients[patientId]) return;
            next = store.clearPatientSelection(next, patientId);
            Object.keys(loaded.patient.drafts).forEach(function (draftId) {
                if (draftId.indexOf(FOLLOWUP_DRAFT_PREFIX) === 0) next = store.deleteDraft(next, patientId, draftId);
            });
            store.save(next);
        }

        function registerPreHubActiveLine(input) {
            var source = input || {};
            var line = core.createPreHubTreatmentLine({
                patient_id: source.patient_id,
                drug_name: source.drug_name,
                active_ingredient: source.active_ingredient,
                relationship: source.relationship || 'additional',
                status: 'active',
                provenance: 'pre_hub_existing',
                catalog_identity: source.catalog_identity,
                catalog_snapshot: source.catalog_snapshot,
                dose_text: source.dose_text,
                presentation: source.presentation,
                route: source.route,
                pauta_codigo: source.pauta_codigo,
                pauta_label: source.pauta_label,
                pauta_otro_texto: source.pauta_otro_texto,
                start_date: source.start_date,
                end_date: source.end_date
            }, idOptions);
            var state = store.load();
            store.save(store.upsertLine(state, line.patient_id, line));
            return line;
        }

        return {
            loadPatient: loadPatient,
            resolveContext: resolveContext,
            selectLine: selectLine,
            clearSelection: clearSelection,
            buildPayload: buildPayload,
            saveDraft: saveDraft,
            restoreDraft: restoreDraft,
            clearPatient: clearPatient,
            registerPreHubActiveLine: registerPreHubActiveLine
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
    var canonicalController = null;
    var currentCanonicalPatientId = '';
    var currentSelectedCanonicalLineId = '';
    var followupOtherDrugs = [];
    var followupOtherDrugSeq = 0;
    var SWITCH_MESSAGE = 'Vas a cambiar de paciente. Se limpiarán los datos no guardados de esta pantalla. ¿Quieres continuar?';

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
        if (s === 'finalizado' || s === 'finished') return 'Finalizado';
        if (s === 'historico' || s === 'historical' || s === 'previo') return 'Histórico';
        if (s === 'validado' || s === 'validated') return 'Validado';
        if (s === 'validated_not_started') return 'Validado · pendiente de inicio';
        if (s === 'no_aplica' || s === 'n/a') return 'No aplica';
        if (s === 'anadido' || s === 'añadido') return 'Añadido';
        return state.charAt(0).toUpperCase() + state.slice(1);
    }

    function biologicRelationLabel(type) {
        if (type === 'cambio_terapeutico' || type === 'cambio_farmaco') return 'Switch terapéutico';
        if (type === 'tratamiento_anadido' || type === 'tratamiento_añadido') return 'Add-on terapéutico';
        if (type === 'revision_linea') return 'Revisión de línea';
        if (type === 'base') return 'Línea terapéutica base';
        return 'Sin cambios';
    }

    function getCanonicalController() {
        var core = window.FarmaciaMultitreatmentCore;
        if (!canonicalController && core) canonicalController = createCanonicalController(core, window.sessionStorage);
        return canonicalController;
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

    function normalizeBiologicLine(line, index, patient) {
        return {
            linea_id: line.linea_id || ('BIO-LEGACY-' + (index + 1)),
            orden: line.orden || (index + 1),
            nombre_linea: line.nombre_linea || line.principio_activo || line.nombre_comercial || ('Biologico ' + (index + 1)),
            nombre_comercial: line.nombre_comercial || line.nombre_linea || patient.marcaComercial || '',
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
        var helper = getTreatmentHelper();
        if (helper && typeof helper.buildTreatmentFromPatient === 'function') {
            var result = helper.buildTreatmentFromPatient(patient, { returnArray: true, fuente: 'seguimiento' });
            if (Array.isArray(result) && result.length) return result;
        }
        // Fallback legacy
        if (Array.isArray(patient.biologicos) && patient.biologicos.length) {
            return patient.biologicos.map(function (line, index) {
                return normalizeBiologicLine(line, index, patient);
            });
        }
        return [normalizeBiologicLine({
            linea_id: patient.cip ? patient.cip + '-L1' : 'BIO-LEGACY-1',
            orden: 1,
            nombre_linea: patient.principioActivo || patient.marcaComercial || 'Tratamiento actual',
            nombre_comercial: patient.marcaComercial || '',
            principio_activo: patient.principioActivo || '',
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
        if (!currentSelectedCanonicalLineId || !currentCanonicalPatientId) return null;
        for (var j = 0; j < currentBiologicLines.length; j++) {
            if (currentBiologicLines[j].patient_id === currentCanonicalPatientId && currentBiologicLines[j].line_id === currentSelectedCanonicalLineId && currentBiologicLines[j].status === 'active') {
                return currentBiologicLines[j];
            }
        }
        return null;
    }

    function resolveCanonicalFollowupContext() {
        var controller = getCanonicalController();
        var patientId = currentCanonicalPatientId;
        var lineId = currentSelectedCanonicalLineId;
        if (!controller || !patientId || !lineId) throw new Error('Seleccione una línea canónica activa antes de continuar.');
        persistCanonicalLineDraft();
        var resolved = controller.resolveContext(patientId, lineId);
        var suspect = byId('fhSeguimientoEaFarmacoSospechoso');
        var suspectLineId = suspect && suspect.value ? suspect.value : lineId;
        if (suspectLineId !== lineId) throw new Error('El fármaco sospechoso debe coincidir con la línea canónica seleccionada.');
        var payload = controller.buildPayload({
            patient_id: patientId,
            line_id: lineId,
            movement: { type: fv('fhSegTipoRelacionTerapia') || 'sin_cambios' },
            adverse_effect: {
                present: fv('fhSeguimientoEaPresente') === 'si',
                suspect_line_id: suspectLineId,
                observations: fv('fhSeguimientoEaObservaciones')
            }
        });
        payload.followup = JSON.parse(JSON.stringify({
            values: resolved.draft && resolved.draft.values || {},
            related_drugs: resolved.draft && resolved.draft.related_drugs || [],
            morisky: resolved.draft && resolved.draft.morisky || { answers: {}, result: '' },
            dlqi: resolved.draft && resolved.draft.dlqi || { answers: {}, total: '—', interpretation: '' },
            eva: resolved.draft && resolved.draft.eva || { dolor: '0', prurito: '0' },
            naranjo: resolved.draft && resolved.draft.naranjo || {},
            karch_lasagna: resolved.draft && resolved.draft.karch_lasagna || {}
        }));
        return {
            patient_id: patientId,
            selected_line_id: lineId,
            line: resolved.line,
            draft: resolved.draft,
            patient: currentSegPatient && firstNonEmpty(currentSegPatient.cip, currentSegPatient.patient_id) === patientId
                ? currentSegPatient
                : { cip: patientId, patient_id: patientId },
            payload: payload
        };
    }

    function showCanonicalContextFailure(error) {
        var message = error && error.message ? error.message : 'Seleccione una línea canónica activa antes de continuar.';
        if (typeof window.alert === 'function') window.alert(message);
        return null;
    }

    function withCanonicalFollowupContext(action) {
        try {
            return action(resolveCanonicalFollowupContext());
        } catch (error) {
            return showCanonicalContextFailure(error);
        }
    }

    function setActiveFollowupActions(enabled) {
        ['fhSegExportTxt', 'fhSegExportCsv', 'fhSegExcelExportBtn'].concat(canonicalDraftFieldIds || []).forEach(function (id) {
            var control = byId(id);
            if (control) control.disabled = !enabled;
        });
        setLineBoundClinicalControlsEnabled(enabled);
    }

    function canonicalLineName(line) {
        return firstNonEmpty(line.drug_name, line.active_ingredient, 'Línea ' + line.line_id);
    }

    function renderCanonicalLineCards(lines, selectedLineId) {
        var container = byId('fhSegLineCards');
        if (!container) return;
        F.clearChildren(container);
        lines.forEach(function (line) {
            var card = createElement('section', 'other-drug-card');
            var header = createElement('div', 'other-drug-card__header');
            header.appendChild(createElement('h3', 'other-drug-card__title', canonicalLineName(line)));
            var badge = createElement('span', 'profile-badge', line.status_label);
            header.appendChild(badge);
            card.appendChild(header);
            var fields = createElement('div', 'info-grid');
            var identity = line.catalog_identity || {};
            var cardFields = [
                ['Principio activo', line.active_ingredient],
                ['Procedencia', identity.source_type || line.provenance],
                ['Presentación', line.presentation],
                ['Dosis', line.dose_text],
                ['Pauta', line.pauta_label || line.pauta_otro_texto],
                ['Vía', line.route],
                ['Fecha inicio', line.start_date],
                ['Estado', line.status_label],
                ['Servicio', currentSegPatient && currentSegPatient.servicio],
                ['Patología', currentSegPatient && currentSegPatient.patologia]
            ];
            cardFields.forEach(function (field) {
                var wrapper = createElement('div', 'info-field');
                wrapper.appendChild(createElement('span', 'info-field__label', field[0]));
                wrapper.appendChild(createElement('span', 'info-field__value', textOrDash(field[1])));
                fields.appendChild(wrapper);
            });
            card.appendChild(fields);
            var button = createElement('button', line.line_id === selectedLineId ? 'btn btn-primary' : 'btn btn-outline', line.line_id === selectedLineId ? 'Línea seleccionada' : 'Seleccionar línea');
            button.type = 'button';
            button.disabled = !line.followup_enabled || line.line_id === selectedLineId;
            button.setAttribute('data-line-id', line.line_id);
            button.addEventListener('click', function () { selectCanonicalLine(line.line_id); });
            card.appendChild(button);
            container.appendChild(card);
        });
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
        persistCanonicalLineDraft();
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
            followupOtherDrugs = followupOtherDrugs.filter(function (item) { return item.uid !== drug.uid; });
            renderFollowupOtherDrugs();
            updateSuspectDrugSelector();
            persistCanonicalLineDraft();
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
        farmacoInput.addEventListener('input', function () { updateFollowupOtherDrug(drug.uid, 'farmaco', this.value); });
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
        ], drug.via, 'Seleccionar...');
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
        origenInput.readOnly = true;
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
        if (drug.relationType === 'Tratamiento activo previo / línea existente') {
            var registerBtn = createElement('button', 'btn btn-outline', 'Registrar como línea canónica previa');
            registerBtn.type = 'button';
            registerBtn.addEventListener('click', function () { registerFollowupPreviousLine(drug); });
            card.appendChild(registerBtn);
        }
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

    function normalizeOtherDrugVia(value) {
        if (!value) return '';
        var key = String(value).toLowerCase().trim();
        if (key === 'sc' || key === 'subcutánea' || key === 'subcutanea') return 'SC';
        if (key === 'iv' || key === 'intravenosa') return 'IV';
        if (key === 'oral' || key === 'vo' || key === 'v.o.' || key === 'v.o') return 'Oral';
        if (key === 'im' || key === 'intramuscular') return 'IM';
        return 'Otra';
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

    function applyCatalogSelectionToOtherDrug(uid, d) {
        var sourceType = String(d.source_type || '').toUpperCase();
        var origenLabel = '';
        if (sourceType === 'CIMA') origenLabel = 'CIMA';
        else if (sourceType === 'LOCAL') origenLabel = 'Local Especial';
        else if (sourceType === 'LOCAL_PENDIENTE_DEMO') origenLabel = 'Demo/local pendiente';
        else origenLabel = d.source_type || 'Demo';

        setOtherDrugField(uid, 'farmaco', d.nombre_comercial || '');
        setOtherDrugField(uid, 'principioActivo', d.principio_activo || '');
        setOtherDrugField(uid, 'codigoNacional', d.codigo_nacional || '');
        setOtherDrugField(uid, 'nregistro', d.nregistro || '');
        setOtherDrugField(uid, 'origenCatalogo', origenLabel);
        setOtherDrugField(uid, 'sourceType', sourceType);
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
        persistCanonicalLineDraft();
    }

    function registerFollowupPreviousLine(drug) {
        var controller = getCanonicalController();
        if (!controller || !currentCanonicalPatientId || !firstNonEmpty(drug.farmaco, drug.principioActivo)) {
            window.alert('Indique paciente y fármaco antes de registrar la línea previa.');
            return;
        }
        controller.registerPreHubActiveLine({
            patient_id: currentCanonicalPatientId,
            drug_name: firstNonEmpty(drug.farmaco, drug.principioActivo),
            active_ingredient: drug.principioActivo || '',
            relationship: 'additional',
            catalog_identity: {
                selected_drug_id: '', source_type: drug.sourceType || '',
                national_code: drug.codigoNacional || '', registration_number: drug.nregistro || '',
                drug_name: drug.farmaco || '', active_ingredient: drug.principioActivo || ''
            },
            dose_text: drug.dosis || '', presentation: drug.presentacion || '', route: drug.via || '',
            pauta_codigo: drug.pautaCodigo || '', pauta_label: drug.pauta || '', pauta_otro_texto: drug.pautaOtro || '',
            start_date: drug.fechaInicio || '', end_date: drug.fechaFin || ''
        });
        followupOtherDrugs = followupOtherDrugs.filter(function (item) { return item.uid !== drug.uid; });
        renderFollowupOtherDrugs();
        syncBiologicControls(currentSegPatient);
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
        var line = getCurrentSelectedLine();
        if (line) {
            var name = line.drug_name || line.active_ingredient || '';
            candidates.push({
                id: line.line_id,
                category: 'Biológico activo',
                label: name ? (name + ' — Biológico activo') : 'Tratamiento principal',
                source: 'principal',
                tipo_relacion: line.relationship || '',
                prioridad: 1
            });
        }
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

        if (!patient) {
            currentBiologicLines = [];
            currentCanonicalPatientId = '';
            currentSelectedCanonicalLineId = '';
            renderCanonicalLineCards([], '');
            if (lineaPrincipal) {
                F.clearChildren(lineaPrincipal);
                lineaPrincipal.value = '';
            }
            if (estadoLinea) estadoLinea.value = '';
            clearCanonicalLineBoundFields();
            setActiveFollowupActions(false);
            return;
        }

        var patientId = firstNonEmpty(patient.cip, patient.patient_id);
        var controller = getCanonicalController();
        var canonical = controller && patientId ? controller.loadPatient(patientId) : { lines: [], selected_line_id: '' };
        currentCanonicalPatientId = patientId;
        currentBiologicLines = canonical.lines;
        currentSelectedCanonicalLineId = canonical.selected_line_id;
        renderCanonicalLineCards(currentBiologicLines, canonical.selected_line_id);

        if (!lineaPrincipal) return;

        while (lineaPrincipal.options.length > 0) lineaPrincipal.remove(0);
        var placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = currentBiologicLines.filter(function (line) { return line.followup_enabled; }).length > 1
            ? 'Selección explícita requerida'
            : 'Seleccione una línea activa';
        lineaPrincipal.appendChild(placeholderOption);
        if (!currentBiologicLines.length) {
            lineaPrincipal.value = '';
            if (estadoLinea) estadoLinea.value = '';
            currentSelectedCanonicalLineId = '';
            clearCanonicalLineBoundFields();
            setActiveFollowupActions(false);
            return;
        }

        for (var i = 0; i < currentBiologicLines.length; i++) {
            var line = currentBiologicLines[i];
            var opt = document.createElement('option');
            opt.value = line.line_id;
            opt.textContent = canonicalLineName(line) + ' · ' + line.status_label;
            opt.disabled = !line.followup_enabled;
            opt.selected = line.line_id === canonical.selected_line_id;
            lineaPrincipal.appendChild(opt);
        }
        lineaPrincipal.value = canonical.selected_line_id;
        if (!canonical.selected_line_id) clearCanonicalLineBoundFields();
        applySelectedBiologicLine();
        restoreCanonicalLineDraft();
        setActiveFollowupActions(!!getCurrentSelectedLine());
    }

    function selectCanonicalLine(lineId) {
        var controller = getCanonicalController();
        if (!controller || !currentCanonicalPatientId) return;
        persistCanonicalLineDraft();
        currentSelectedCanonicalLineId = '';
        clearCanonicalLineBoundFields();
        controller.selectLine(currentCanonicalPatientId, lineId);
        currentSelectedCanonicalLineId = lineId;
        var select = byId('fhSegLineaPrincipal');
        if (select) select.value = lineId;
        renderCanonicalLineCards(currentBiologicLines, lineId);
        applySelectedBiologicLine();
        restoreCanonicalLineDraft();
        setActiveFollowupActions(true);
    }

    function clearCanonicalLineSelection() {
        persistCanonicalLineDraft();
        var controller = getCanonicalController();
        if (controller && currentCanonicalPatientId) controller.clearSelection(currentCanonicalPatientId);
        currentSelectedCanonicalLineId = '';
        clearCanonicalLineBoundFields();
        renderCanonicalLineCards(currentBiologicLines, '');
        setActiveFollowupActions(false);
    }

    var canonicalDraftFieldIds = [
        'fhSegFecha', 'fhSegTipoRelacionTerapia', 'fhSegCambiaNivel', 'fhSegNuevoNivel', 'fhSegOptimiza',
        'fhSegNuevaDosis', 'fhSegNuevaPauta', 'fhSegNuevaPautaOtro', 'fhSegMotivoOpt',
        'fhSegSuspension', 'fhSegMotivoSusp', 'fhSegProms', 'fhSeguimientoEaPresente',
        'fhSeguimientoEaGravedad', 'fhSeguimientoEaResuelto', 'fhSeguimientoEaCorregido',
        'fhSeguimientoEaObservaciones', 'fhSeguimientoEaFarmacoSospechoso', 'fhCausalidadFinal'
    ];

    var moriskyAnswerNames = ['mg1', 'mg2', 'mg3', 'mg4'];
    var dlqiAnswerNames = [
        'dlqi_q1', 'dlqi_q2', 'dlqi_q3', 'dlqi_q4', 'dlqi_q5', 'dlqi_q6',
        'dlqi_q7_a', 'dlqi_q7_b', 'dlqi_q8', 'dlqi_q9', 'dlqi_q10'
    ];
    var naranjoAnswerIds = ['naranjoQ1', 'naranjoQ2', 'naranjoQ3', 'naranjoQ4', 'naranjoQ5', 'naranjoQ6', 'naranjoQ7', 'naranjoQ8', 'naranjoQ9', 'naranjoQ10'];
    var karchAnswerIds = ['klTemporal', 'klConocido', 'klAlternativa', 'klSuspendido', 'klMejoraRetirada', 'klReadministracion', 'klReaparece'];
    var evaRangeIds = ['fhSegEvaDolorRange', 'fhSegEvaPruritoRange'];

    function exactNamedInputs(name) {
        return document.querySelectorAll('input[name="' + name + '"]');
    }

    function exactChipGroup(className, attributeName, value) {
        return document.querySelector('.' + className + '[' + attributeName + '="' + value + '"]');
    }

    function forEachExactChip(groupClass, itemClass, attributeName, values, callback) {
        values.forEach(function (value) {
            var group = exactChipGroup(groupClass, attributeName, value);
            if (!group) return;
            group.querySelectorAll('.' + itemClass).forEach(callback);
        });
    }

    function setLineBoundClinicalControlsEnabled(enabled) {
        evaRangeIds.forEach(function (id) {
            var control = byId(id);
            if (control) control.disabled = !enabled;
        });
        dlqiAnswerNames.forEach(function (name) {
            exactNamedInputs(name).forEach(function (control) { control.disabled = !enabled; });
        });
        forEachExactChip('mg-chip-group', 'mg-chip', 'data-mg-name', moriskyAnswerNames, function (control) { control.disabled = !enabled; });
        forEachExactChip('causality-chip-group', 'causality-chip', 'data-answer-id', naranjoAnswerIds.concat(karchAnswerIds), function (control) { control.disabled = !enabled; });
    }

    function readMoriskyDraftFromDom() {
        var answers = {};
        moriskyAnswerNames.forEach(function (name) {
            var group = exactChipGroup('mg-chip-group', 'data-mg-name', name);
            var active = group ? group.querySelector('.mg-chip--active') : null;
            answers[name] = active ? active.getAttribute('data-mg-value') : '';
        });
        return { answers: answers, result: byId('fhSegMoriskyResultado') ? byId('fhSegMoriskyResultado').textContent : '' };
    }

    function readDlqiDraftFromDom() {
        var answers = {};
        dlqiAnswerNames.forEach(function (name) {
            var inputs = exactNamedInputs(name);
            var selectedIndex = -1;
            inputs.forEach(function (input, index) { if (input.checked) selectedIndex = index; });
            answers[name] = selectedIndex;
        });
        return {
            answers: answers,
            total: byId('fhSegDlqiTotal') ? byId('fhSegDlqiTotal').textContent : '—',
            interpretation: byId('fhSegDlqiInterp') ? byId('fhSegDlqiInterp').textContent : ''
        };
    }

    function readEvaDraftFromDom() {
        return {
            dolor: byId('fhSegEvaDolorRange') ? byId('fhSegEvaDolorRange').value : '0',
            prurito: byId('fhSegEvaPruritoRange') ? byId('fhSegEvaPruritoRange').value : '0'
        };
    }

    function clearLineBoundClinicalValues() {
        forEachExactChip('mg-chip-group', 'mg-chip', 'data-mg-name', moriskyAnswerNames, function (chip) {
            chip.classList.remove('mg-chip--active');
        });
        dlqiAnswerNames.forEach(function (name) {
            exactNamedInputs(name).forEach(function (input) { input.checked = false; });
        });
        evaRangeIds.forEach(function (id) {
            var range = byId(id);
            if (range) range.value = '0';
        });
        F.setText('fhSegEvaDolorValue', '0');
        F.setText('fhSegEvaPruritoValue', '0');
        F.setText('fhSegMoriskyResultado', 'Resultado Morisky-Green: pendiente de completar');
        F.setText('fhSegDlqiTotal', '—');
        F.setText('fhSegDlqiInterp', '');
        forEachExactChip('causality-chip-group', 'causality-chip', 'data-answer-id', naranjoAnswerIds.concat(karchAnswerIds), function (chip) {
            chip.classList.remove('causality-chip--active');
        });
        F.setText('naranjoScore', '0');
        F.setText('naranjoCategoria', 'Dudosa');
        F.setText('klCategoria', 'No clasificable');
        F.setText('resumenNaranjo', '');
        F.setText('resumenKl', '');
        synchronizeDlqiQ7Followup();
    }

    function restoreLineBoundClinicalValues(draft) {
        var source = draft || {};
        var morisky = source.morisky || { answers: {} };
        moriskyAnswerNames.forEach(function (name) {
            var expected = morisky.answers && morisky.answers[name] || '';
            var group = exactChipGroup('mg-chip-group', 'data-mg-name', name);
            if (!group) return;
            group.querySelectorAll('.mg-chip').forEach(function (chip) {
                chip.classList.toggle('mg-chip--active', !!expected && chip.getAttribute('data-mg-value') === expected);
            });
        });
        updateMorisky();
        var dlqi = source.dlqi || { answers: {} };
        dlqiAnswerNames.forEach(function (name) {
            var selectedIndex = dlqi.answers && Number.isInteger(dlqi.answers[name]) ? dlqi.answers[name] : -1;
            exactNamedInputs(name).forEach(function (input, index) { input.checked = index === selectedIndex; });
        });
        synchronizeDlqiQ7Followup();
        calculateDLQI();
        var eva = source.eva || {};
        var dolor = Object.prototype.hasOwnProperty.call(eva, 'dolor') ? String(eva.dolor) : '0';
        var prurito = Object.prototype.hasOwnProperty.call(eva, 'prurito') ? String(eva.prurito) : '0';
        if (byId('fhSegEvaDolorRange')) byId('fhSegEvaDolorRange').value = dolor;
        if (byId('fhSegEvaPruritoRange')) byId('fhSegEvaPruritoRange').value = prurito;
        F.setText('fhSegEvaDolorValue', dolor);
        F.setText('fhSegEvaPruritoValue', prurito);
    }

    var canonicalLineProjectionFieldIds = [
        'fhSegFarmaco', 'fhSegPrincipioActivo', 'fhSegPresentacion', 'fhSegDosisActual',
        'fhSegVia', 'fhSegPautaActual', 'fhSegPautaActualOtro', 'fhSegEstadoLinea',
        'fhSegFechaInicio', 'fhSegCodigoNacional', 'fhSegNregistro', 'fhSegEtiquetas',
        'fhSegOrigenCatalogo', 'fhSegDrugSearch'
    ];

    function clearCanonicalLineBoundFields() {
        canonicalLineProjectionFieldIds.concat(canonicalDraftFieldIds).forEach(function (id) {
            var el = byId(id);
            if (el) el.value = '';
        });
        followupOtherDrugs = [];
        clearLineBoundClinicalValues();
        var grid = byId('fhSegTratamientoGrid');
        if (grid) F.clearChildren(grid);
        F.setText('fhSegCimaContextPrincipioActivo', '—');
        renderFollowupOtherDrugs();
        updateSuspectDrugSelector();
    }

    function persistCanonicalLineDraft() {
        var line = getCurrentSelectedLine();
        var controller = getCanonicalController();
        if (!line || !controller || !currentSelectedCanonicalLineId) return;
        controller.resolveContext(currentCanonicalPatientId, line.line_id);
        var values = {};
        canonicalDraftFieldIds.forEach(function (id) { values[id] = fv(id); });
        controller.saveDraft(currentCanonicalPatientId, line.line_id, {
            values: values,
            related_drugs: JSON.parse(JSON.stringify(followupOtherDrugs)),
            suspect_line_id: fv('fhSeguimientoEaFarmacoSospechoso') || line.line_id,
            naranjo: readNaranjoAnswersFromDom(),
            karch_lasagna: readKarchLasagnaAnswersFromDom(),
            morisky: readMoriskyDraftFromDom(),
            dlqi: readDlqiDraftFromDom(),
            eva: readEvaDraftFromDom()
        });
    }

    function restoreCanonicalLineDraft() {
        var line = getCurrentSelectedLine();
        var controller = getCanonicalController();
        canonicalDraftFieldIds.forEach(function (id) {
            var el = byId(id);
            if (el) el.value = '';
        });
        followupOtherDrugs = [];
        clearLineBoundClinicalValues();
        if (line && controller) {
            var draft = controller.restoreDraft(currentCanonicalPatientId, line.line_id);
            if (draft && draft.values) {
                canonicalDraftFieldIds.forEach(function (id) {
                    if (Object.prototype.hasOwnProperty.call(draft.values, id)) setSegValue(id, draft.values[id]);
                });
                followupOtherDrugs = Array.isArray(draft.related_drugs) ? draft.related_drugs : [];
                var answerGroups = {};
                Object.keys(draft.naranjo || {}).forEach(function (key) { answerGroups['naranjoQ' + key.slice(1)] = draft.naranjo[key]; });
                var karchIds = { temporal: 'klTemporal', conocido: 'klConocido', alternativa: 'klAlternativa', suspendido: 'klSuspendido', mejoraRetirada: 'klMejoraRetirada', readministracion: 'klReadministracion', reaparece: 'klReaparece' };
                Object.keys(draft.karch_lasagna || {}).forEach(function (key) { answerGroups[karchIds[key]] = draft.karch_lasagna[key]; });
                Object.keys(answerGroups).forEach(function (answerId) {
                    var group = document.querySelector('.causality-chip-group[data-answer-id="' + answerId + '"]');
                    if (!group) return;
                    group.querySelectorAll('.causality-chip').forEach(function (chip) {
                        chip.classList.toggle('causality-chip--active', chip.getAttribute('data-value') === answerGroups[answerId]);
                    });
                });
                restoreLineBoundClinicalValues(draft);
            }
        }
        renderFollowupOtherDrugs();
        updateSuspectDrugSelector();
    }

    function applySelectedBiologicLine() {
        var line = getCurrentSelectedLine();
        if (line) {
            setSegValue('fhSegFarmaco', line.drug_name || '');
            setSegValue('fhSegPrincipioActivo', line.active_ingredient || '');
            setSegValue('fhSegPresentacion', line.presentation || '');
            setSegValue('fhSegDosisActual', line.dose_text || '');
            setSegValue('fhSegVia', line.route || '');
            setSegPautaActualNormalized(line.pauta_label || line.pauta_otro_texto || '');
            setSegValue('fhSegFechaInicio', line.start_date || '');
            setSegValue('fhSegEstadoLinea', biologicStateLabel(line.status));
            var identity = line.catalog_identity || {};
            setSegValue('fhSegCodigoNacional', identity.national_code || '');
            setSegValue('fhSegNregistro', identity.registration_number || '');
            setSegValue('fhSegOrigenCatalogo', identity.source_type || line.provenance || '');
            renderSegTreatmentSummary({
                farmaco_nombre: line.drug_name,
                principio_activo: line.active_ingredient,
                presentacion: line.presentation,
                dosis_texto: line.dose_text,
                via: line.route,
                pauta: line.pauta_label || line.pauta_otro_texto,
                estado_linea: biologicStateLabel(line.status),
                tipo_movimiento: fv('fhSegTipoRelacionTerapia'),
                source_type: identity.source_type || line.provenance
            });
        } else {
            setSegValue('fhSegFarmaco', '');
            setSegValue('fhSegPrincipioActivo', '');
            setSegValue('fhSegPresentacion', '');
            setSegValue('fhSegDosisActual', '');
            setSegValue('fhSegVia', '');
            setSegValue('fhSegPautaActual', '');
            setSegValue('fhSegEstadoLinea', '');
            var grid = document.getElementById('fhSegTratamientoGrid');
            if (grid) F.clearChildren(grid);
        }
        var movement = byId('fhSegTipoRelacionTerapia');
        if (movement) movement.disabled = !line;
        setActiveFollowupActions(!!line);
        // El contexto del snapshot, no el principio activo previo, determina si la selección sigue siendo válida.
        var cimaEl = document.getElementById('fhSegCimaContextPrincipioActivo');
        if (cimaEl && line) {
            F.setText('fhSegCimaContextPrincipioActivo', line.active_ingredient || '\u2014');
        } else if (cimaEl && !line) {
            F.setText('fhSegCimaContextPrincipioActivo', '\u2014');
        }
        updateSuspectDrugSelector();
    }

    function applyContext() {
        const ctx = F.getQueryContext();
        currentSegPatient = ctx.patient || (ctx.cip ? { cip: ctx.cip } : null);

        if (ctx.cip && !ctx.patient) {
            var C = window.FarmaciaCatalog;
            if (C && C.clearSnapshot) C.clearSnapshot();
        }

        F.setValue('fhSegCip', ctx.cip);
        F.setValue('fhSegServicio', ctx.servicio || ctx.patient?.servicio);
        // Guardar valor de patología para restaurarlo tras initSegServicioPatologiaSync
        // (el select aún no tiene opciones pobladas)
        var patSelectPending = document.getElementById('fhSegPatologia');
        if (patSelectPending) {
            patSelectPending.dataset.pendingPatologia = ctx.patologia || ctx.patient?.patologia || '';
        }

        if (ctx.patient) {
            F.setValue('fhSegUltimaAdherencia', ctx.patient.adherencia);
            F.setValue('fhSegUltimosProms', ctx.patient.proms);
            F.setValue('fhSegEaPrevios', ctx.patient.efectosAdversos);
        }
        syncBiologicControls(ctx.patient || null);

        const fhSegFecha = document.getElementById('fhSegFecha');
        if (fhSegFecha && getCurrentSelectedLine() && !fhSegFecha.value) {
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
            syncBiologicControls(currentSegPatient);
            showSegDrugAutocomplete();
            showCipNotice('Paciente no encontrado en demo. Puede completar los datos manualmente.', 'warning');
            return;
        }

        var C2 = getCatalog();
        if (C2 && C2.clearSnapshot) C2.clearSnapshot();

        F.setValue('fhSegCip', patient.cip);
        F.setValue('fhSegServicio', patient.servicio);
        // Disparar cambio para sincronizar patología y visibilidad "Otro"
        var servSelectEvt = document.getElementById('fhSegServicio');
        if (servSelectEvt) servSelectEvt.dispatchEvent(new Event('change'));
        F.setValue('fhSegPatologia', patient.patologia);
        var patSelectEvt = document.getElementById('fhSegPatologia');
        if (patSelectEvt) patSelectEvt.dispatchEvent(new Event('change'));
        F.setValue('fhSegFarmaco', patient.marcaComercial || patient.principioActivo);
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
        F.setValue('fhSegVia', patient.via);
        F.setValue('fhSegFechaInicio', patient.primeraVisita);
        F.setValue('fhSegUltimaAdherencia', patient.adherencia);
        F.setValue('fhSegUltimosProms', patient.proms);
        F.setValue('fhSegEaPrevios', patient.efectosAdversos);
        currentSegPatient = patient;
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
        return followupOtherDrugs.length > 0 || ids.some(function (id) {
            var value = fv(id);
            if (id === 'fhSegOrigenCatalogo' && value === 'Demo' && !currentSegPatient) return false;
            return !!value;
        }) || !!proms && proms !== 'No recogido';
    }

    function resetPatientContext(requestedCip) {
        var previousPatientId = currentCanonicalPatientId;
        var controller = getCanonicalController();
        if (controller && previousPatientId) controller.clearPatient(previousPatientId);
        currentSelectedCanonicalLineId = '';
        clearCipFields();
        var ids = ['fhSegLineaPrincipal', 'fhSegEstadoLinea', 'fhSegTipoRelacionTerapia', 'fhSegCambiaNivel', 'fhSegNuevoNivel', 'fhSegOptimiza', 'fhSegNuevaDosis', 'fhSegNuevaPauta', 'fhSegNuevaPautaOtro', 'fhSegMotivoOpt', 'fhSegSuspension', 'fhSegMotivoSusp', 'fhSegProms', 'fhSeguimientoEaPresente', 'fhSeguimientoEaGravedad', 'fhSeguimientoEaResuelto', 'fhSeguimientoEaCorregido', 'fhSeguimientoEaObservaciones', 'fhSeguimientoEaFarmacoSospechoso', 'fhCausalidadFinal'];
        ids.forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
        F.setValue('fhSegCip', requestedCip);
        currentBiologicLines = [];
        followupOtherDrugs = [];
        followupOtherDrugSeq = 0;
        renderFollowupOtherDrugs();
        syncBiologicControls(null);
        ['fhSegPromsExpanded', 'fhSeguimientoEaGravedadRow', 'fhSeguimientoEaResueltoRow', 'fhSeguimientoEaCorregidoRow', 'fhSeguimientoEaObservacionesRow', 'fhSeguimientoEaFarmacoRow'].forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.add('hidden'); });
        clearLineBoundClinicalValues();
        F.setText('fhSegCimaContextPrincipioActivo', '—');
        var catalog = getCatalog();
        if (catalog && catalog.clearSnapshot) catalog.clearSnapshot();
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

    function getSegSnapshotContext() {
        var line = getCurrentSelectedLine() || {};
        return {
            slot: 'seguimiento.tratamiento',
            paciente_cip: firstNonEmpty(currentSegPatient && currentSegPatient.cip, fv('fhSegCip')),
            patient_id: currentCanonicalPatientId,
            linea_id: line.line_id || ''
        };
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

        C.selectDrug(drug, getSegSnapshotContext());

        F.setValue('fhSegFarmaco', drug.display_name || drug.nombre_comercial || '');
        F.setValue('fhSegPrincipioActivo', drug.principio_activo || '');
        F.setText('fhSegCimaContextPrincipioActivo', drug.principio_activo || '\u2014');
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
                persistCanonicalLineDraft();
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

    function synchronizeDlqiQ7Followup() {
        var followUp = document.querySelector('.dlqi-card__followup');
        if (!followUp) return;
        var q7a = document.querySelector('input[name="dlqi_q7_a"]:checked');
        var show = !!getCurrentSelectedLine() && !!q7a && q7a.getAttribute('data-dlqi-val') === null;
        followUp.classList.toggle('hidden', !show);
        if (!show) exactNamedInputs('dlqi_q7_b').forEach(function (input) { input.checked = false; });
    }

    function handleDLQIChange(e) {
        if (e.target.name === 'dlqi_q7_a') synchronizeDlqiQ7Followup();
        calculateDLQI();
        persistCanonicalLineDraft();
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
                persistCanonicalLineDraft();
            });
        }
        if (pruritoRange && pruritoValue) {
            pruritoRange.addEventListener('input', function () {
                pruritoValue.textContent = this.value;
                persistCanonicalLineDraft();
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
        var snap = C.getSnapshot ? C.getSnapshot(getSegSnapshotContext()) : null;
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
        var nombre = cleanExportToken(line.drug_name || line.active_ingredient);
        return cleanExportToken(line.patient_id) + ' + ' + cleanExportToken(line.line_id) + (nombre ? ' · ' + nombre : '');
    }

    function buildCanonicalPayloadFromDom() {
        return resolveCanonicalFollowupContext().payload;
    }

    function buildSegLines() {
        var canonicalContext = resolveCanonicalFollowupContext();
        var selectedLine = canonicalContext.line;
        var clinicalDraft = canonicalContext.draft || {};
        const lines = [];
        lines.push('=== INFORME DE SEGUIMIENTO FARMACIA ===');
        lines.push('Identificador demo: FH-SEG-' + Date.now().toString(36).toUpperCase());
        lines.push('Fecha: ' + new Date().toLocaleDateString('es-ES'));
        lines.push('');
        lines.push('--- Tratamiento actual ---');
        lines.push('CIP: ' + canonicalContext.payload.patient_id);
        lines.push('Origen: ' + (fv('fhSegServicio') || '—'));
        lines.push('Indicación: ' + (fv('fhSegPatologia') || '—'));
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
        lines.push('Adherencia Morisky-Green: ' + (clinicalDraft.morisky && clinicalDraft.morisky.result || '—'));
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
            lines.push('DLQI total: ' + (clinicalDraft.dlqi && clinicalDraft.dlqi.total || '—') + '/30');
            var interp = (clinicalDraft.dlqi && clinicalDraft.dlqi.interpretation || '').replace(/^ — /, '').trim();
            if (interp) lines.push('DLQI interpretación: ' + interp);
            lines.push('');
            lines.push('--- PROMs EVA ---');
            lines.push('EVA Dolor: ' + (clinicalDraft.eva && clinicalDraft.eva.dolor || '0') + '/10');
            lines.push('EVA Prurito: ' + (clinicalDraft.eva && clinicalDraft.eva.prurito || '0') + '/10');
        }
        lines.push('');
        lines.push('=== FIN DEL INFORME ===');
        lines.push('Generado por: Hub Clínico Badajoz — Demo Farmacia v0.2');
        lines.push('ATENCIÓN: Datos sintéticos. No usar para decisiones clínicas reales.');
        return lines;
    }

    window.FarmaciaSeguimiento = {
        searchCIP: searchCIP,
        setActivePatientCip: function (cip) { currentSegPatient = cip ? { cip: cip } : null; },
        createCanonicalController: createCanonicalController,
        resolveCanonicalContext: resolveCanonicalFollowupContext,
        buildCanonicalPayload: buildCanonicalPayloadFromDom,
        legacyMovementLabel: biologicRelationLabel
    };

    document.addEventListener('DOMContentLoaded', () => {
        F.whenReady(function () {
        applyContext();
        initCipSearch();
        initSegServicioPatologiaSync();
        initSegDrugAutocomplete();
        populatePautaSelectSeg('fhSegNuevaPauta', 'fhSegNuevaPautaOtro');
        populatePautaSelectSeg('fhSegPautaActual', 'fhSegPautaActualOtro');

        // Pre-activar causalidad si el paciente tiene EA registrado.
        var demoCtx = F.getQueryContext();
        if (demoCtx.patient && demoCtx.patient.rawAdverseEvents && demoCtx.patient.rawAdverseEvents.length) {
            var eaSelect = document.getElementById("fhSeguimientoEaPresente");
            if (eaSelect && eaSelect.value !== "si") {
                eaSelect.value = "si";
                eaSelect.dispatchEvent(new Event('change'));
            }

            // Pre-activar PROMs si el paciente tiene datos registrados.
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
        if (lineaPrincipal) lineaPrincipal.addEventListener('change', function () {
            if (this.value) selectCanonicalLine(this.value);
            else clearCanonicalLineSelection();
        });
        canonicalDraftFieldIds.forEach(function (id) {
            var field = byId(id);
            if (field) field.addEventListener(field.tagName === 'TEXTAREA' ? 'input' : 'change', persistCanonicalLineDraft);
        });
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
                persistCanonicalLineDraft();
            });
        });
        document.querySelectorAll('.causality-chip-group[data-answer-id^="kl"]').forEach(function (group) {
            group.addEventListener('click', function (e) {
                var btn = e.target.closest('.causality-chip');
                if (!btn) return;
                group.querySelectorAll('.causality-chip').forEach(function (b) { b.classList.remove('causality-chip--active'); });
                btn.classList.add('causality-chip--active');
                updateKarchLasagna();
                persistCanonicalLineDraft();
            });
        });
        renderDLQI();
        setupEVASliders();
        setupPromsToggle();
        setActiveFollowupActions(!!getCurrentSelectedLine());
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
            try {
                F.copyTextToClipboard(buildSegLines().join('\n'), 'Texto JARA copiado al portapapeles.');
            } catch (error) {
                showCanonicalContextFailure(error);
            }
        });

        const exportCsv = document.getElementById('fhSegExportCsv');
        if (exportCsv) exportCsv.addEventListener('click', () => {
            withCanonicalFollowupContext(function (canonicalContext) {
            var clinicalDraft = canonicalContext.draft || {};
            var dlqiTotalExport = (fv('fhSegProms') === 'Sí, recoger DLQI + EVA dolor/prurito' && isPromsExpandedVisible()) ? (clinicalDraft.dlqi && clinicalDraft.dlqi.total || '') : '';
            var dlqiInterpExport = (fv('fhSegProms') === 'Sí, recoger DLQI + EVA dolor/prurito' && isPromsExpandedVisible()) ? (clinicalDraft.dlqi && clinicalDraft.dlqi.interpretation || '').replace(/^ — /, '').trim() : '';
            var evaDolorExport = (fv('fhSegProms') === 'Sí, recoger DLQI + EVA dolor/prurito' && isPromsExpandedVisible()) ? (clinicalDraft.eva && clinicalDraft.eva.dolor || '') : '';
            var evaPruritoExport = (fv('fhSegProms') === 'Sí, recoger DLQI + EVA dolor/prurito' && isPromsExpandedVisible()) ? (clinicalDraft.eva && clinicalDraft.eva.prurito || '') : '';
            var metaSeg = getSnapshotMetaForExportSeg();
            var selectedLine = canonicalContext.line;
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
                    canonicalContext.payload.patient_id,
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
                    clinicalDraft.morisky && clinicalDraft.morisky.result || '—',
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
        // WO8.1b — Botón Excel FH
        (function initSegExcelBtn() {
            var btn = document.getElementById('fhSegExcelExportBtn');
            if (!btn) return;
            btn.addEventListener('click', function () {
                withCanonicalFollowupContext(function (canonicalContext) {
                var exp = window.FarmaciaExcelRowExport;
                if (!exp) return;
                var patient = canonicalContext.patient;
                var sourceLine = canonicalContext.line;
                var identity = sourceLine.catalog_identity || {};
                var line = {
                    tratamiento_id: sourceLine.tratamiento_id || '',
                    linea_id: canonicalContext.payload.line_id,
                    farmaco_nombre: sourceLine.drug_name || '',
                    principio_activo: sourceLine.active_ingredient || '',
                    codigo_nacional: identity.national_code || '',
                    nregistro: identity.registration_number || '',
                    source_type: identity.source_type || sourceLine.provenance || '',
                    tipo_relacion: sourceLine.relationship || '',
                    estado_linea: sourceLine.status || '',
                    tipo_movimiento: canonicalContext.payload.movement.type,
                    fecha_inicio: sourceLine.start_date || '',
                    fecha_fin: sourceLine.end_date || '',
                    dosis_texto: sourceLine.dose_text || '',
                    presentacion: sourceLine.presentation || '',
                    via: sourceLine.route || '',
                    pauta_codigo: sourceLine.pauta_codigo || '',
                    pauta_label: sourceLine.pauta_label || '',
                    pauta_otro_texto: sourceLine.pauta_otro_texto || ''
                };
                var ea = null;
                var eaSelect = document.getElementById('fhSeguimientoEaFarmacoSospechoso');
                var hasEa = canonicalContext.payload.adverse_effect.present;
                if (hasEa) {
                    ea = {
                        ea_id: 'EA-' + Date.now().toString(36).toUpperCase(),
                        descripcion: (document.getElementById('fhSeguimientoEaDescripcion') || {}).value || '',
                        ea_gravedad: (document.getElementById('fhSeguimientoEaGravedad') || {}).value || '',
                        farmaco_sospechoso_id: canonicalContext.payload.adverse_effect.suspect_line_id,
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
                    proms: {
                        morisky_green: canonicalContext.draft && canonicalContext.draft.morisky && canonicalContext.draft.morisky.result || '',
                        dlqi: canonicalContext.draft && canonicalContext.draft.dlqi && canonicalContext.draft.dlqi.total || '',
                        eva_dolor: canonicalContext.draft && canonicalContext.draft.eva && canonicalContext.draft.eva.dolor || '',
                        eva_prurito: canonicalContext.draft && canonicalContext.draft.eva && canonicalContext.draft.eva.prurito || ''
                    },
                    demoFlag: true,
                };
                var context = exp.buildContextFromSeguimiento(patient, opts);
                var rowObj = exp.buildExcelRowObject(context);
                var rowArr = exp.buildExcelRowArray(rowObj);
                var sheetName = exp.getServiceSheetName(patient.servicio || '') || 'hoja correspondiente';
                exp.copyTSVRowToClipboard(rowArr, { sheetName: sheetName });
                });
            });
        })();
        });
    });
})();
