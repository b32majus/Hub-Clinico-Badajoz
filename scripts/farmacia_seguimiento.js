'use strict';

(function () {
    var root = typeof window !== 'undefined' ? window : globalThis;
    var documentRef = root.document || (typeof document !== 'undefined' ? document : null);
    var F = root.FarmaciaDemo || {};
    var P = root.FarmaciaPautasCatalog || null;
    var currentPatient = null;
    var currentVisit = null;
    var relatedDrugs = [];
    var relatedSequence = 0;
    var rendering = false;

    var ACTIVE_STATE = 'active';
    var MORISKY_CORRECT = { mg1: 'no', mg2: 'si', mg3: 'no', mg4: 'no' };
    var RELATED_CATEGORIES = [
        { value: 'concomitant', label: 'Concomitante' },
        { value: 'prior_completed_biologic', label: 'Biológico previo/completado' },
        { value: 'exposure', label: 'Exposición' },
        { value: 'other_related', label: 'Otro relacionado' }
    ];

    /* The replay is intentionally explicit. It does not reinterpret generic fixture states. */
    var DEMO_LINE_BLUEPRINTS = {
        'CIP-DEMO-FH-001': [
            { line_id: 'BIO-FH-001-L1', order: 1, drug: 'Secukinumab 300 mg', active_ingredient: 'Secukinumab', dose: '300 mg', route: 'SC', schedule: 'Cada 4 semanas', relation: 'primary', state: ACTIVE_STATE }
        ],
        'CIP-DEMO-FH-002': [],
        'CIP-DEMO-FH-003': [
            { line_id: 'BIO-FH-003-L1', order: 1, drug: 'Adalimumab 40 mg', active_ingredient: 'Adalimumab', dose: '40 mg', route: 'SC', schedule: 'Cada 2 semanas', relation: 'primary', state: 'validated_not_started' }
        ],
        'CIP-DEMO-FH-004': [
            { line_id: 'BIO-FH-004-L1', order: 1, drug: 'Abatacept', brand: 'Orencia', active_ingredient: 'Abatacept', dose: '125 mg', route: 'SC', schedule: 'Semanal', relation: 'primary', state: 'completed' },
            { line_id: 'BIO-FH-004-L2', order: 2, drug: 'Belimumab', brand: 'Benlysta', active_ingredient: 'Belimumab', dose: '200 mg', route: 'SC', schedule: 'Semanal', relation: 'primary', state: ACTIVE_STATE },
            { line_id: 'BIO-FH-004-L3', order: 3, drug: 'Rituximab', brand: 'Rixathon', active_ingredient: 'Rituximab', dose: '1 g', route: 'IV', schedule: 'Días 1 y 15 cada 6 meses', relation: 'additional', state: ACTIVE_STATE }
        ]
    };

    function clone(value) {
        return value == null ? value : JSON.parse(JSON.stringify(value));
    }

    function text(value) {
        return value == null ? '' : String(value).trim();
    }

    function byId(id) {
        return documentRef && documentRef.getElementById ? documentRef.getElementById(id) : null;
    }

    function valueOf(id) {
        var el = byId(id);
        return el ? text(el.value) : '';
    }

    function setValue(id, value) {
        var el = byId(id);
        if (el) el.value = value == null ? '' : String(value);
    }

    function setText(id, value) {
        var el = byId(id);
        if (el) el.textContent = value == null ? '' : String(value);
    }

    function clearNode(node) {
        if (!node) return;
        while (node.firstChild) node.removeChild(node.firstChild);
        if (Array.isArray(node.children)) node.children.length = 0;
        if (Array.isArray(node.options)) node.options.length = 0;
    }

    function appendOption(select, value, label, disabled) {
        if (!select || !documentRef) return null;
        var option = documentRef.createElement('option');
        option.value = value;
        option.textContent = label;
        option.disabled = !!disabled;
        select.appendChild(option);
        return option;
    }

    function makeId(prefix) {
        var randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
        return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' + randomPart;
    }

    function stateLabel(state) {
        return {
            active: 'Activa', completed: 'Completada', suspended: 'Suspendida',
            validated_not_started: 'Validada, no iniciada', historical: 'Histórica'
        }[state] || state || 'Sin estado';
    }

    function normalizeNonDemoLine(line, index) {
        var rawState = text(line && (line.state || line.estado_linea)).toLowerCase();
        var rawRelation = text(line && (line.relation || line.tipo_relacion)).toLowerCase();
        var states = {
            activo: ACTIVE_STATE, active: ACTIVE_STATE,
            finalizado: 'completed', completed: 'completed',
            suspendido: 'suspended', suspended: 'suspended',
            validado_pendiente_inicio: 'validated_not_started', validated_not_started: 'validated_not_started',
            desconocido: 'unknown', unknown: 'unknown'
        };
        var relations = {
            principal: 'primary', primary: 'primary',
            adicional: 'additional', additional: 'additional',
            desconocido: 'unknown', unknown: 'unknown'
        };
        return {
            line_id: text(line && (line.line_id || line.linea_id)),
            order: Number(line && (line.order || line.orden)) || index + 1,
            drug: text(line && (line.drug || line.farmaco_nombre || line.nombre_linea || line.nombre_comercial)),
            brand: text(line && (line.brand || line.nombre_comercial)),
            active_ingredient: text(line && (line.active_ingredient || line.principio_activo)),
            dose: text(line && (line.dose || line.dosis || line.dosis_texto)),
            route: text(line && (line.route || line.via)),
            schedule: text(line && (line.schedule || line.pauta)),
            relation: relations[rawRelation] || 'unknown',
            state: states[rawState] || 'unknown'
        };
    }

    function hydrateCanonicalLines(patient) {
        if (!patient || !text(patient.cip)) return [];
        if (Object.prototype.hasOwnProperty.call(DEMO_LINE_BLUEPRINTS, patient.cip)) {
            return clone(DEMO_LINE_BLUEPRINTS[patient.cip]);
        }
        var source = Array.isArray(patient.biologicos) ? patient.biologicos : [];
        return source.map(normalizeNonDemoLine).filter(function (line) { return !!line.line_id; });
    }

    function emptyLineDraft(line) {
        return {
            line_id: line.line_id,
            movement: '',
            new_dose: '',
            new_schedule: '',
            optimization_reason: '',
            suspension_reason: '',
            morisky: { mg1: '', mg2: '', mg3: '', mg4: '', result: 'not_evaluated' },
            observations: '',
            resulting_state: line.state
        };
    }

    function emptyCommon(patient, now) {
        return {
            date: now.toISOString().slice(0, 10),
            professional: 'Profesional FH-01',
            service: text(patient && patient.servicio),
            pathology: text(patient && patient.patologia),
            dlqi: '',
            eva_pain: '0',
            eva_itch: '0',
            level_change: 'No',
            new_level: '',
            observations: ''
        };
    }

    function emptyAdverseEvent() {
        return {
            present: 'no_consta', ea_id: '', severity: '', resolved: 'no_consta', action: 'no_consta',
            description: '', suspect_id: '', suspect_kind: '', suspect_name: '',
            naranjo: { score: '0', category: 'Dudosa', answers: {} },
            karch: { category: 'No clasificable', answers: {} }, final_causality: 'No evaluada'
        };
    }

    function createFollowupVisit(patient, nowValue) {
        var now = nowValue instanceof Date ? nowValue : new Date(nowValue || Date.now());
        var cip = text(patient && patient.cip);
        var lines = hydrateCanonicalLines(patient);
        var drafts = {};
        lines.forEach(function (line) { drafts[line.line_id] = emptyLineDraft(line); });
        return {
            cip: cip,
            visit_id: makeId('SEG'),
            created_at: now.toISOString(),
            canonical_lines: lines,
            selected_line_ids: [],
            editing_line_id: '',
            line_drafts: drafts,
            common: emptyCommon(patient, now),
            adverse_event: emptyAdverseEvent(),
            related_drugs: [],
            revision: 0,
            jara_export_revision: null,
            excel_export_revision: null,
            manual_patient: !!(patient && patient.manual)
        };
    }

    function lineById(visit, lineId) {
        return visit && visit.canonical_lines.find(function (line) { return line.line_id === lineId; }) || null;
    }

    function markChanged(visit) {
        if (visit) visit.revision += 1;
        return visit;
    }

    function setLineSelected(visit, lineId, selected) {
        var line = lineById(visit, lineId);
        if (!line || line.state !== ACTIVE_STATE) return false;
        var index = visit.selected_line_ids.indexOf(lineId);
        if (selected && index < 0) {
            visit.selected_line_ids.push(lineId);
            if (!visit.editing_line_id) visit.editing_line_id = lineId;
            markChanged(visit);
            return true;
        }
        if (!selected && index >= 0) {
            visit.selected_line_ids.splice(index, 1);
            if (visit.editing_line_id === lineId) visit.editing_line_id = '';
            markChanged(visit);
            return true;
        }
        return false;
    }

    function moriskyResult(answers) {
        var keys = Object.keys(MORISKY_CORRECT);
        if (!keys.every(function (key) { return answers[key] === 'si' || answers[key] === 'no'; })) return 'not_evaluated';
        var misses = keys.filter(function (key) { return answers[key] !== MORISKY_CORRECT[key]; }).length;
        return misses === 0 ? 'high' : (misses <= 2 ? 'medium' : 'low');
    }

    function resultingState(line, draft) {
        if (draft.movement === 'optimization') return ACTIVE_STATE;
        if (draft.movement === 'suspension') return 'suspended';
        return line.state;
    }

    function saveLineDraft(visit, lineId, patch) {
        var line = lineById(visit, lineId);
        if (!line || !visit.line_drafts[lineId]) return false;
        var before = JSON.stringify(visit.line_drafts[lineId]);
        var draft = visit.line_drafts[lineId];
        Object.keys(patch || {}).forEach(function (key) {
            if (key === 'morisky') draft.morisky = Object.assign({}, draft.morisky, clone(patch.morisky));
            else if (key !== 'line_id' && key !== 'resulting_state') draft[key] = text(patch[key]);
        });
        draft.morisky.result = moriskyResult(draft.morisky);
        draft.resulting_state = resultingState(line, draft);
        if (before !== JSON.stringify(draft)) {
            markChanged(visit);
            return true;
        }
        return false;
    }

    function setCommonDraft(visit, patch) {
        var before = JSON.stringify(visit.common);
        Object.keys(patch || {}).forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(visit.common, key)) visit.common[key] = text(patch[key]);
        });
        if (before !== JSON.stringify(visit.common)) markChanged(visit);
    }

    function setAdverseEvent(visit, patch) {
        var before = JSON.stringify(visit.adverse_event);
        Object.keys(patch || {}).forEach(function (key) {
            if (key === 'naranjo' || key === 'karch') visit.adverse_event[key] = Object.assign({}, visit.adverse_event[key], clone(patch[key]));
            else if (Object.prototype.hasOwnProperty.call(visit.adverse_event, key)) visit.adverse_event[key] = text(patch[key]);
        });
        if (visit.adverse_event.present === 'si' && !visit.adverse_event.ea_id) visit.adverse_event.ea_id = makeId('EA');
        if (visit.adverse_event.present !== 'si') {
            visit.adverse_event.suspect_id = '';
            visit.adverse_event.suspect_kind = '';
            visit.adverse_event.suspect_name = '';
        }
        if (before !== JSON.stringify(visit.adverse_event)) markChanged(visit);
    }

    function validateLine(line) {
        var errors = [];
        if (line.movement === 'optimization') {
            if (!line.new_dose && !line.new_schedule) errors.push('La optimización requiere nueva dosis o pauta.');
            if (!line.optimization_reason) errors.push('La optimización requiere motivo.');
        }
        if (line.movement === 'suspension' && !line.suspension_reason) errors.push('La suspensión requiere motivo.');
        return errors;
    }

    function buildFollowupVisitModel(visitValue) {
        var visit = visitValue || currentVisit;
        if (!visit) return null;
        var common = clone(visit.common);
        var ae = clone(visit.adverse_event);
        var timestamp = visit.created_at;
        var lines = visit.selected_line_ids.map(function (lineId) {
            var canonical = lineById(visit, lineId);
            var draft = clone(visit.line_drafts[lineId]);
            if (!canonical || !draft) return null;
            var movementReason = draft.movement === 'optimization' ? draft.optimization_reason : (draft.movement === 'suspension' ? draft.suspension_reason : '');
            return Object.assign({}, clone(canonical), draft, {
                cip: visit.cip,
                visit_id: visit.visit_id,
                longitudinal_id: visit.cip + '+' + visit.visit_id + '+' + canonical.line_id,
                movement_reason: movementReason,
                timestamp: timestamp
            });
        }).filter(Boolean);
        return {
            cip: visit.cip,
            visit_id: visit.visit_id,
            visit_identity: visit.cip + '+' + visit.visit_id,
            created_at: timestamp,
            revision: visit.revision,
            common: common,
            adverse_event: ae,
            related_drugs: clone(visit.related_drugs || []),
            selected_line_ids: visit.selected_line_ids.slice(),
            lines: lines
        };
    }

    function validateFollowupVisitModel(model) {
        var errors = [];
        if (!model || !model.cip) errors.push('Falta CIP.');
        if (!model || !model.lines.length) errors.push('Seleccione al menos una línea activa.');
        if (model) model.lines.forEach(function (line) {
            validateLine(line).forEach(function (error) { errors.push('Línea ' + line.line_id + ': ' + error); });
        });
        if (model && model.adverse_event.present === 'si' && !model.adverse_event.suspect_id) {
            errors.push('Seleccione explícitamente el fármaco sospechoso o marque no atribuible.');
        }
        return { valid: errors.length === 0, errors: errors };
    }

    function buildJaraReport(model) {
        if (!model) return '';
        var lines = [
            '=== INFORME DE SEGUIMIENTO FARMACIA ===',
            'CIP: ' + model.cip,
            'Visita: ' + model.visit_id,
            'Fecha: ' + (model.common.date || '—'),
            'Profesional: ' + (model.common.professional || '—'),
            'Servicio: ' + (model.common.service || '—'),
            'Patología: ' + (model.common.pathology || '—'),
            'PROMs: DLQI ' + (model.common.dlqi || '—') + ' · EVA dolor ' + (model.common.eva_pain || '—') + ' · EVA prurito ' + (model.common.eva_itch || '—'),
            'Cambio de nivel: ' + (model.common.level_change || '—') + (model.common.new_level ? ' · ' + model.common.new_level : ''),
            'Observaciones generales: ' + (model.common.observations || '—')
        ];
        model.lines.forEach(function (line) {
            lines.push('', '--- Línea ' + line.line_id + ' · ' + (line.drug || line.active_ingredient || '—') + ' ---');
            lines.push('Relación: ' + (line.relation || '—'));
            lines.push('Estado previo: ' + stateLabel(line.state));
            lines.push('Movimiento: ' + (line.movement || 'Sin movimiento'));
            lines.push('Nueva dosis: ' + (line.new_dose || '—'));
            lines.push('Nueva pauta: ' + (line.new_schedule || '—'));
            lines.push('Motivo: ' + (line.movement_reason || '—'));
            lines.push('Morisky MG1-4: ' + ['mg1', 'mg2', 'mg3', 'mg4'].map(function (key) { return line.morisky[key] || '—'; }).join(' / ') + ' · ' + line.morisky.result);
            lines.push('Estado resultante: ' + stateLabel(line.resulting_state));
            lines.push('Observaciones de línea: ' + (line.observations || '—'));
        });
        lines.push('', '--- Efecto adverso común ---');
        lines.push('EA ID: ' + (model.adverse_event.ea_id || '—'));
        lines.push('Presente: ' + (model.adverse_event.present || '—'));
        lines.push('Sospechoso explícito: ' + (model.adverse_event.suspect_name || 'No seleccionado'));
        lines.push('Descripción: ' + (model.adverse_event.description || '—'));
        lines.push('Naranjo: ' + model.adverse_event.naranjo.score + ' · ' + model.adverse_event.naranjo.category);
        lines.push('Karch-Lasagna: ' + model.adverse_event.karch.category);
        return lines.join('\n');
    }

    function buildCsv(model) {
        var rows = [['cip', 'visit_id', 'line_id', 'drug', 'movement', 'resulting_state', 'morisky', 'dlqi', 'eva_pain', 'eva_itch', 'ea_id']];
        model.lines.forEach(function (line) {
            rows.push([model.cip, model.visit_id, line.line_id, line.drug, line.movement, line.resulting_state, line.morisky.result, model.common.dlqi, model.common.eva_pain, model.common.eva_itch, model.adverse_event.ea_id]);
        });
        return rows.map(function (row) { return row.map(function (cell) { return '"' + String(cell || '').replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    }

    function buildExcelContexts(model) {
        return model.lines.map(function (line) {
            return {
                patient: { cip: model.cip }, patientId: model.cip, cip: model.cip,
                servicio: model.common.service, patologia: model.common.pathology,
                tipoActo: 'seguimiento', visitaId: model.visit_id, fechaActo: model.common.date,
                profesional: model.common.professional, estadoRegistro: 'completado',
                lineaActual: {
                    linea_id: line.line_id, nombre_comercial: line.brand || line.drug,
                    farmaco_nombre: line.drug, principio_activo: line.active_ingredient,
                    tipo_relacion: line.relation, estado_linea: line.resulting_state,
                    tipo_movimiento: line.movement, es_principal: line.relation === 'primary',
                    dosis: line.new_dose || line.dose, via: line.route,
                    pauta_label: line.new_schedule || line.schedule
                },
                motivo: line.movement_reason,
                proms: { morisky_green: line.morisky.result, eva_dolor: model.common.eva_pain, dlqi: model.common.dlqi },
                efectoAdverso: model.adverse_event.present === 'si' ? {
                    ea_id: model.adverse_event.ea_id, descripcion: model.adverse_event.description,
                    gravedad: model.adverse_event.severity, farmaco_sospechoso_id: model.adverse_event.suspect_id,
                    farmaco_sospechoso_nombre: model.adverse_event.suspect_name,
                    causalidad_naranjo: model.adverse_event.naranjo.score + ' · ' + model.adverse_event.naranjo.category,
                    causalidad_karch: model.adverse_event.karch.category, accion: model.adverse_event.action
                } : null,
                hayEfectoAdverso: model.adverse_event.present === 'si',
                obsSeguimiento: line.observations,
                observaciones: model.common.observations,
                timestamp: model.created_at,
                demoFlag: true
            };
        });
    }

    function hasMeaningfulRevision(visit) {
        if (!visit) return false;
        if (visit.selected_line_ids.length || visit.related_drugs.length) return true;
        if (visit.adverse_event.present !== 'no_consta' || visit.adverse_event.description) return true;
        return Object.keys(visit.common).some(function (key) {
            var neutral = { date: true, professional: true, service: true, pathology: true, eva_pain: true, eva_itch: true, level_change: true };
            if (neutral[key]) return false;
            return !!text(visit.common[key]);
        });
    }

    function isFullyExported(visit) {
        return !!visit && visit.jara_export_revision === visit.revision && visit.excel_export_revision === visit.revision;
    }

    function guardRevision(action) {
        if (!hasMeaningfulRevision(currentVisit)) return true;
        var changingPatient = action === 'patient';
        var discardChoice = changingPatient ? 'Descartar y cambiar' : 'Descartar y crear nueva visita';
        var message;
        if (isFullyExported(currentVisit)) {
            message = 'JARA y Excel se copiaron para la revisión actual. La visita solo existe en memoria: no está guardada ni persistida. ' +
                (changingPatient ? 'Al cambiar de paciente se descartará.' : 'Al crear una nueva visita se descartará.') +
                ' Opciones: Cancelar / ' + discardChoice + '.';
        } else {
            message = changingPatient
                ? 'Esta visita contiene datos que no se han copiado o han cambiado después de la última exportación. Al cambiar de paciente se perderán definitivamente. Opciones: Cancelar / Descartar y cambiar.'
                : 'Esta visita contiene datos que no se han copiado o han cambiado después de la última exportación. Al crear una nueva visita se perderán definitivamente. Opciones: Cancelar / Descartar y crear nueva visita.';
        }
        return typeof root.confirm !== 'function' || root.confirm(message);
    }

    function statusFor(exportRevision) {
        if (!currentVisit || exportRevision == null) return 'Pendiente';
        return exportRevision === currentVisit.revision ? 'Copiado' : 'Desactualizado tras cambios';
    }

    function renderExportStatus() {
        setText('fhSegJaraStatus', statusFor(currentVisit && currentVisit.jara_export_revision));
        setText('fhSegExcelStatus', statusFor(currentVisit && currentVisit.excel_export_revision));
    }

    function showExportError(errors) {
        var el = byId('fhSegExportError');
        if (!el) return;
        el.textContent = errors.join(' ');
        el.classList.toggle('hidden', !errors.length);
    }

    function renderLineCards() {
        var container = byId('fhSegLineCards');
        if (!container || !currentVisit || !documentRef) return;
        clearNode(container);
        var activeCount = 0;
        currentVisit.canonical_lines.forEach(function (line) {
            var card = documentRef.createElement('label');
            card.className = 'followup-line-card' + (line.state === ACTIVE_STATE ? '' : ' followup-line-card--disabled');
            var input = documentRef.createElement('input');
            input.type = 'checkbox';
            input.value = line.line_id;
            input.disabled = line.state !== ACTIVE_STATE;
            input.checked = currentVisit.selected_line_ids.indexOf(line.line_id) >= 0;
            if (!input.disabled) activeCount += 1;
            input.addEventListener('change', function () {
                setLineSelected(currentVisit, line.line_id, input.checked);
                renderEditorSelector();
                renderLineCards();
                renderSuspectOptions();
                renderExportStatus();
            });
            var body = documentRef.createElement('span');
            body.className = 'followup-line-card__body';
            var title = documentRef.createElement('strong');
            title.textContent = 'L' + line.order + ' · ' + (line.drug || line.active_ingredient || line.line_id);
            var meta = documentRef.createElement('span');
            meta.textContent = stateLabel(line.state) + ' · ' + (line.relation === 'primary' ? 'Principal' : 'Adicional');
            body.appendChild(title);
            body.appendChild(meta);
            card.appendChild(input);
            card.appendChild(body);
            container.appendChild(card);
        });
        var noActive = byId('fhSegNoActiveLines');
        if (noActive) noActive.classList.toggle('hidden', activeCount > 0);
    }

    function renderEditorSelector() {
        var select = byId('fhSegLineaPrincipal');
        if (!select || !currentVisit) return;
        clearNode(select);
        appendOption(select, '', currentVisit.selected_line_ids.length ? 'Seleccionar línea...' : 'Selecciona antes una línea activa');
        currentVisit.selected_line_ids.forEach(function (lineId) {
            var line = lineById(currentVisit, lineId);
            if (line) appendOption(select, lineId, 'L' + line.order + ' · ' + (line.drug || line.active_ingredient || line.line_id));
        });
        select.value = currentVisit.editing_line_id || '';
        restoreEditor();
    }

    function setMoriskyControls(morisky) {
        if (!documentRef || !documentRef.querySelectorAll) return;
        Array.from(documentRef.querySelectorAll('.mg-chip')).forEach(function (chip) {
            var name = chip.getAttribute('data-mg-name');
            var value = chip.getAttribute('data-mg-value');
            chip.classList.toggle('mg-chip--active', !!morisky && morisky[name] === value);
        });
        setText('fhSegMoriskyResultado', 'Resultado Morisky-Green: ' + ({ high: 'alta adherencia', medium: 'adherencia media / parcial', low: 'baja adherencia', not_evaluated: 'pendiente de completar' }[morisky && morisky.result] || 'pendiente de completar'));
    }

    function restoreEditor() {
        rendering = true;
        var line = currentVisit && lineById(currentVisit, currentVisit.editing_line_id);
        var draft = line && currentVisit.line_drafts[line.line_id];
        setValue('fhSegTipoRelacionTerapia', draft && draft.movement);
        setValue('fhSegNuevaDosis', draft && draft.new_dose);
        setValue('fhSegNuevaPauta', draft && draft.new_schedule);
        setValue('fhSegMotivoOpt', draft && draft.optimization_reason);
        setValue('fhSegMotivoSusp', draft && draft.suspension_reason);
        setValue('fhSegObservacionesLinea', draft && draft.observations);
        setValue('fhSegEstadoLinea', draft ? stateLabel(draft.resulting_state) : '');
        setValue('fhSegFarmaco', line && (line.brand || line.drug));
        setValue('fhSegPrincipioActivo', line && line.active_ingredient);
        setValue('fhSegDosisActual', line && line.dose);
        setValue('fhSegVia', line && line.route);
        setValue('fhSegPautaActual', line && line.schedule);
        setMoriskyControls(draft && draft.morisky);
        rendering = false;
    }

    function readMoriskyControls() {
        var answers = { mg1: '', mg2: '', mg3: '', mg4: '' };
        if (!documentRef || !documentRef.querySelectorAll) return answers;
        Array.from(documentRef.querySelectorAll('.mg-chip--active')).forEach(function (chip) {
            var key = chip.getAttribute('data-mg-name');
            if (Object.prototype.hasOwnProperty.call(answers, key)) answers[key] = chip.getAttribute('data-mg-value') || '';
        });
        return answers;
    }

    function saveEditorFromControls() {
        if (rendering || !currentVisit || !currentVisit.editing_line_id) return;
        saveLineDraft(currentVisit, currentVisit.editing_line_id, {
            movement: valueOf('fhSegTipoRelacionTerapia'), new_dose: valueOf('fhSegNuevaDosis'),
            new_schedule: valueOf('fhSegNuevaPauta'), optimization_reason: valueOf('fhSegMotivoOpt'),
            suspension_reason: valueOf('fhSegMotivoSusp'), observations: valueOf('fhSegObservacionesLinea'),
            morisky: readMoriskyControls()
        });
        restoreEditor();
        renderExportStatus();
    }

    function readCommonFromControls() {
        if (!currentVisit || rendering) return;
        setCommonDraft(currentVisit, {
            date: valueOf('fhSegFecha'), professional: valueOf('fhSegProfesional'), service: valueOf('fhSegServicio'),
            pathology: valueOf('fhSegPatologia'), dlqi: valueOf('fhSegDlqiTotal'),
            eva_pain: valueOf('fhSegEvaDolorRange'), eva_itch: valueOf('fhSegEvaPruritoRange'),
            level_change: valueOf('fhSegCambiaNivel'), new_level: valueOf('fhSegNuevoNivel'), observations: valueOf('fhSegObservacionesGenerales')
        });
        renderExportStatus();
    }

    function relatedLabel(drug) {
        var category = RELATED_CATEGORIES.find(function (item) { return item.value === drug.category; });
        return (drug.name || 'Fármaco relacionado') + ' — ' + (category ? category.label : 'Otro relacionado');
    }

    function renderRelatedDrugs() {
        var list = byId('segOtrosFarmacosList');
        if (!list || !documentRef) return;
        clearNode(list);
        relatedDrugs.forEach(function (drug) {
            var card = documentRef.createElement('div');
            card.className = 'other-drug-card';
            var category = documentRef.createElement('select');
            category.className = 'form-select';
            RELATED_CATEGORIES.forEach(function (item) { appendOption(category, item.value, item.label); });
            category.value = drug.category;
            var name = documentRef.createElement('input');
            name.className = 'form-control';
            name.placeholder = 'Fármaco relacionado';
            name.value = drug.name;
            var remove = documentRef.createElement('button');
            remove.type = 'button'; remove.className = 'btn btn-outline'; remove.textContent = 'Eliminar';
            function update() {
                drug.category = category.value;
                drug.name = text(name.value);
                currentVisit.related_drugs = clone(relatedDrugs);
                markChanged(currentVisit); renderSuspectOptions(); renderExportStatus();
            }
            category.addEventListener('change', update);
            name.addEventListener('input', update);
            remove.addEventListener('click', function () {
                relatedDrugs = relatedDrugs.filter(function (item) { return item.related_id !== drug.related_id; });
                currentVisit.related_drugs = clone(relatedDrugs); markChanged(currentVisit);
                renderRelatedDrugs(); renderSuspectOptions(); renderExportStatus();
            });
            card.appendChild(category); card.appendChild(name); card.appendChild(remove); list.appendChild(card);
        });
        var empty = byId('segOtrosFarmacosEmpty');
        if (empty) empty.classList.toggle('hidden', relatedDrugs.length > 0);
    }

    function addRelatedDrug() {
        if (!currentVisit) return;
        relatedSequence += 1;
        relatedDrugs.push({ related_id: 'RELATED-' + relatedSequence, category: 'concomitant', name: '' });
        currentVisit.related_drugs = clone(relatedDrugs); markChanged(currentVisit);
        renderRelatedDrugs(); renderSuspectOptions(); renderExportStatus();
    }

    function suspectCandidates() {
        var result = [];
        if (currentVisit) currentVisit.canonical_lines.forEach(function (line) {
            result.push({ id: 'line:' + line.line_id, kind: 'canonical_line', name: 'L' + line.order + ' · ' + (line.drug || line.active_ingredient || line.line_id) });
        });
        relatedDrugs.forEach(function (drug) {
            if (drug.name) result.push({ id: 'related:' + drug.related_id, kind: 'related_drug', name: relatedLabel(drug) });
        });
        result.push({ id: 'unattributable', kind: 'unattributable', name: 'No atribuible a un único fármaco' });
        return result;
    }

    function renderSuspectOptions() {
        var select = byId('fhSeguimientoEaFarmacoSospechoso');
        if (!select || !currentVisit) return;
        var previous = currentVisit.adverse_event.suspect_id;
        clearNode(select);
        appendOption(select, '', 'No seleccionado');
        suspectCandidates().forEach(function (candidate) { appendOption(select, candidate.id, candidate.name); });
        select.value = suspectCandidates().some(function (candidate) { return candidate.id === previous; }) ? previous : '';
    }

    function readAdverseEventFromControls() {
        if (!currentVisit || rendering) return;
        var suspectId = valueOf('fhSeguimientoEaFarmacoSospechoso');
        var candidate = suspectCandidates().find(function (item) { return item.id === suspectId; });
        setAdverseEvent(currentVisit, {
            present: valueOf('fhSeguimientoEaPresente'), severity: valueOf('fhSeguimientoEaGravedad'),
            resolved: valueOf('fhSeguimientoEaResuelto'), action: valueOf('fhSeguimientoEaCorregido'),
            description: valueOf('fhSeguimientoEaObservaciones'), suspect_id: candidate ? candidate.id : '',
            suspect_kind: candidate ? candidate.kind : '', suspect_name: candidate ? candidate.name : '',
            naranjo: { score: text(byId('naranjoScore') && byId('naranjoScore').textContent) || '0', category: text(byId('naranjoCategoria') && byId('naranjoCategoria').textContent) || 'Dudosa' },
            karch: { category: text(byId('klCategoria') && byId('klCategoria').textContent) || 'No clasificable' },
            final_causality: valueOf('fhCausalidadFinal') || 'No evaluada'
        });
        toggleAdverseEventUi(); renderExportStatus();
    }

    function toggleAdverseEventUi() {
        var active = valueOf('fhSeguimientoEaPresente') === 'si';
        ['fhSeguimientoEaGravedadRow', 'fhSeguimientoEaResueltoRow', 'fhSeguimientoEaCorregidoRow', 'fhSeguimientoEaObservacionesRow', 'fhSeguimientoEaFarmacoRow'].forEach(function (id) {
            var el = byId(id); if (el) el.classList.toggle('hidden', !active);
        });
        var explicit = active && !!valueOf('fhSeguimientoEaFarmacoSospechoso');
        ['modNaranjo', 'modKarchLasagna', 'modResumenCausalidad'].forEach(function (id) { var el = byId(id); if (el) el.classList.toggle('hidden', !explicit); });
    }

    function populatePathologies(service, selected) {
        var select = byId('fhSegPatologia');
        if (!select) return;
        var map = {
            'Dermatología': ['Hidradenitis supurativa', 'Psoriasis', 'Dermatitis atópica', 'Otra'],
            'Reumatología': ['Artritis Reumatoide (AR)', 'LES', 'Síndrome de Sjögren', 'LES / Síndrome de Sjögren', 'Otra'],
            'Digestivo': ['Enfermedad de Crohn', 'Colitis ulcerosa', 'Otra'], 'Otro': ['Otra']
        };
        clearNode(select); appendOption(select, '', 'Seleccionar...');
        (map[service] || ['Otra']).forEach(function (item) { appendOption(select, item, item); });
        select.value = selected || '';
    }

    function renderPatientAndVisit() {
        if (!currentVisit) return;
        rendering = true;
        setValue('fhSegCip', currentVisit.cip);
        setValue('fhSegServicio', currentVisit.common.service);
        populatePathologies(currentVisit.common.service, currentVisit.common.pathology);
        setValue('fhSegProfesional', currentVisit.common.professional);
        setValue('fhSegFecha', currentVisit.common.date);
        setValue('fhSegCambiaNivel', currentVisit.common.level_change);
        setValue('fhSegNuevoNivel', currentVisit.common.new_level);
        setValue('fhSegObservacionesGenerales', currentVisit.common.observations);
        setValue('fhSegDlqiTotal', currentVisit.common.dlqi);
        setValue('fhSegEvaDolorRange', currentVisit.common.eva_pain);
        setValue('fhSegEvaPruritoRange', currentVisit.common.eva_itch);
        setValue('fhSeguimientoEaPresente', currentVisit.adverse_event.present);
        setValue('fhSeguimientoEaGravedad', currentVisit.adverse_event.severity);
        setValue('fhSeguimientoEaResuelto', currentVisit.adverse_event.resolved);
        setValue('fhSeguimientoEaCorregido', currentVisit.adverse_event.action);
        setValue('fhSeguimientoEaObservaciones', currentVisit.adverse_event.description);
        setValue('fhCausalidadFinal', currentVisit.adverse_event.final_causality);
        setText('naranjoScore', currentVisit.adverse_event.naranjo.score);
        setText('naranjoCategoria', currentVisit.adverse_event.naranjo.category);
        setText('klCategoria', currentVisit.adverse_event.karch.category);
        if (documentRef && documentRef.querySelectorAll) Array.from(documentRef.querySelectorAll('.causality-chip')).forEach(function (chip) { chip.classList.remove('causality-chip--active'); });
        relatedDrugs = clone(currentVisit.related_drugs || []);
        rendering = false;
        renderLineCards(); renderEditorSelector(); renderRelatedDrugs(); renderSuspectOptions();
        setValue('fhSeguimientoEaFarmacoSospechoso', currentVisit.adverse_event.suspect_id);
        renderExportStatus(); toggleAdverseEventUi();
    }

    function loadPatient(patient) {
        currentPatient = patient;
        currentVisit = createFollowupVisit(patient);
        relatedDrugs = [];
        relatedSequence = 0;
        renderPatientAndVisit();
    }

    function patientForCip(cip) {
        var found = typeof F.findPatientByCip === 'function' ? F.findPatientByCip(cip) : null;
        return found || { cip: cip, manual: true };
    }

    function searchCIP() {
        var cip = valueOf('fhSegCip').toUpperCase();
        if (!cip) return false;
        if (currentVisit && cip === currentVisit.cip) return true;
        if (!guardRevision('patient')) {
            setValue('fhSegCip', currentVisit ? currentVisit.cip : '');
            return false;
        }
        loadPatient(patientForCip(cip));
        if (currentPatient.manual) showExportError(['CIP fuera de la demo: contexto manual sin líneas. La exportación está bloqueada.']);
        else showExportError([]);
        return true;
    }

    function newVisit() {
        if (!currentPatient || !guardRevision('new_visit')) return false;
        loadPatient(currentPatient);
        return true;
    }

    function validCurrentModel() {
        saveEditorFromControls(); readCommonFromControls(); readAdverseEventFromControls();
        var model = buildFollowupVisitModel(currentVisit);
        var validation = validateFollowupVisitModel(model);
        showExportError(validation.errors);
        return validation.valid ? model : null;
    }

    function exportJara() {
        var model = validCurrentModel();
        if (!model) return false;
        var report = buildJaraReport(model);
        if (typeof F.copyTextToClipboard === 'function') F.copyTextToClipboard(report, 'Texto JARA copiado al portapapeles.');
        else if (root.navigator && root.navigator.clipboard) root.navigator.clipboard.writeText(report);
        currentVisit.jara_export_revision = currentVisit.revision;
        renderExportStatus();
        return true;
    }

    function exportExcel() {
        var model = validCurrentModel();
        var exp = root.FarmaciaExcelRowExport;
        if (!model || !exp) return false;
        var rows = buildExcelContexts(model).map(function (context) { return exp.buildExcelRowArray(exp.buildExcelRowObject(context)); });
        var sheet = exp.getServiceSheetName(model.common.service) || 'hoja correspondiente';
        var copied = exp.copyTSVRowsToClipboard(rows, { sheetName: sheet });
        if (copied !== false) currentVisit.excel_export_revision = currentVisit.revision;
        renderExportStatus();
        return copied !== false;
    }

    function initMutationListeners() {
        ['fhSegFecha', 'fhSegProfesional', 'fhSegServicio', 'fhSegPatologia', 'fhSegCambiaNivel', 'fhSegNuevoNivel', 'fhSegObservacionesGenerales', 'fhSegDlqiTotal', 'fhSegEvaDolorRange', 'fhSegEvaPruritoRange'].forEach(function (id) {
            var el = byId(id); if (el) el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', readCommonFromControls);
        });
        ['fhSegTipoRelacionTerapia', 'fhSegNuevaDosis', 'fhSegNuevaPauta', 'fhSegMotivoOpt', 'fhSegMotivoSusp', 'fhSegObservacionesLinea'].forEach(function (id) {
            var el = byId(id); if (el) el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', saveEditorFromControls);
        });
        if (documentRef && documentRef.querySelectorAll) Array.from(documentRef.querySelectorAll('.mg-chip')).forEach(function (chip) {
            chip.addEventListener('click', function () {
                var name = chip.getAttribute('data-mg-name');
                Array.from(documentRef.querySelectorAll('.mg-chip[data-mg-name="' + name + '"]')).forEach(function (item) { item.classList.remove('mg-chip--active'); });
                chip.classList.add('mg-chip--active'); saveEditorFromControls();
            });
        });
        ['fhSeguimientoEaPresente', 'fhSeguimientoEaGravedad', 'fhSeguimientoEaResuelto', 'fhSeguimientoEaCorregido', 'fhSeguimientoEaObservaciones', 'fhSeguimientoEaFarmacoSospechoso', 'fhCausalidadFinal'].forEach(function (id) {
            var el = byId(id); if (el) el.addEventListener(el.tagName === 'TEXTAREA' ? 'input' : 'change', readAdverseEventFromControls);
        });
    }

    function initCausalityChips() {
        if (!documentRef || !documentRef.querySelectorAll) return;
        Array.from(documentRef.querySelectorAll('.causality-chip-group')).forEach(function (group) {
            group.addEventListener('click', function (event) {
                var chip = event.target && event.target.closest ? event.target.closest('.causality-chip') : null;
                if (!chip || !currentVisit || !valueOf('fhSeguimientoEaFarmacoSospechoso')) return;
                Array.from(group.querySelectorAll('.causality-chip')).forEach(function (item) { item.classList.remove('causality-chip--active'); });
                chip.classList.add('causality-chip--active');
                var answerId = group.getAttribute('data-answer-id') || '';
                var answerValue = chip.getAttribute('data-value') || '';
                var isNaranjo = answerId.indexOf('naranjo') === 0;
                var target = isNaranjo ? currentVisit.adverse_event.naranjo.answers : currentVisit.adverse_event.karch.answers;
                target[answerId] = answerValue;
                var model = root.FarmaciaValidationModel;
                if (isNaranjo && model && typeof model.calculateNaranjoScore === 'function') {
                    var normalized = {};
                    Object.keys(target).forEach(function (key) { normalized[key.replace('naranjoQ', 'q').toLowerCase()] = target[key]; });
                    var score = model.calculateNaranjoScore(normalized);
                    currentVisit.adverse_event.naranjo.score = String(score);
                    currentVisit.adverse_event.naranjo.category = typeof model.categorizeNaranjo === 'function' ? model.categorizeNaranjo(score) : '';
                    setText('naranjoScore', score); setText('naranjoCategoria', currentVisit.adverse_event.naranjo.category);
                }
                if (!isNaranjo && model && typeof model.categorizeKarchLasagna === 'function') {
                    currentVisit.adverse_event.karch.category = model.categorizeKarchLasagna(target);
                    setText('klCategoria', currentVisit.adverse_event.karch.category);
                }
                markChanged(currentVisit); renderExportStatus();
            });
        });
    }

    function init() {
        var cipInput = byId('fhSegCip');
        var searchButton = byId('fhSegCipSearchBtn');
        if (searchButton) searchButton.addEventListener('click', searchCIP);
        if (cipInput) cipInput.addEventListener('keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); searchCIP(); } });
        var editor = byId('fhSegLineaPrincipal');
        if (editor) editor.addEventListener('change', function () {
            if (!currentVisit) return;
            saveEditorFromControls();
            currentVisit.editing_line_id = editor.value;
            restoreEditor();
        });
        var addRelated = byId('btnSegAddOtherDrug'); if (addRelated) addRelated.addEventListener('click', addRelatedDrug);
        var jara = byId('fhSegExportTxt'); if (jara) jara.addEventListener('click', exportJara);
        var excel = byId('fhSegExcelExportBtn'); if (excel) excel.addEventListener('click', exportExcel);
        var csv = byId('fhSegExportCsv'); if (csv) csv.addEventListener('click', function () { var model = validCurrentModel(); if (model && typeof F.downloadFile === 'function') F.downloadFile('seguimiento_' + model.visit_id + '.csv', buildCsv(model), 'text/csv;charset=utf-8'); });
        var fresh = byId('fhSegNewVisit'); if (fresh) fresh.addEventListener('click', newVisit);
        initMutationListeners();
        initCausalityChips();
        if (root.addEventListener) root.addEventListener('beforeunload', function (event) {
            if (hasMeaningfulRevision(currentVisit) && !isFullyExported(currentVisit)) { event.preventDefault(); event.returnValue = ''; }
        });
        if (root.addEventListener) root.addEventListener('pagehide', function () {
            currentVisit = null;
            currentPatient = null;
            relatedDrugs = [];
        });
        var context = typeof F.getQueryContext === 'function' ? F.getQueryContext() : {};
        if (context && (context.patient || context.cip)) loadPatient(context.patient || patientForCip(context.cip));
        else loadPatient({ cip: '', manual: true });
    }

    root.FarmaciaSeguimiento = {
        hydrateCanonicalLines: hydrateCanonicalLines,
        createFollowupVisit: createFollowupVisit,
        setLineSelected: setLineSelected,
        saveLineDraft: saveLineDraft,
        setCommonDraft: setCommonDraft,
        setAdverseEvent: setAdverseEvent,
        buildFollowupVisitModel: buildFollowupVisitModel,
        validateFollowupVisitModel: validateFollowupVisitModel,
        buildJaraReport: buildJaraReport,
        buildCsv: buildCsv,
        buildExcelContexts: buildExcelContexts,
        hasMeaningfulRevision: hasMeaningfulRevision,
        isFullyExported: isFullyExported,
        searchCIP: searchCIP,
        newVisit: newVisit,
        exportJara: exportJara,
        exportExcel: exportExcel,
        addFollowupOtherDrug: addRelatedDrug,
        getFollowupOtherDrugs: function () { return clone(relatedDrugs); },
        getCurrentVisit: function () { return clone(currentVisit); },
        setCurrentVisitForCheck: function (visit, patient) { currentVisit = visit; currentPatient = patient || (visit ? { cip: visit.cip } : null); },
        DEMO_LINE_BLUEPRINTS: clone(DEMO_LINE_BLUEPRINTS),
        RELATED_CATEGORIES: clone(RELATED_CATEGORIES)
    };

    if (documentRef && documentRef.addEventListener) documentRef.addEventListener('DOMContentLoaded', init);
})();
