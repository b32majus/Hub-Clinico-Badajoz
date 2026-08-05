'use strict';

(function () {
    const F = window.FarmaciaDemo;
    let farmaciaOverlayMount = null;
    let bridgeModeActive = false;
    let bridgeSelectors = null;
    const bridgeHandoffSessions = [];

    function removeBridgeSession(session) {
        var index = bridgeHandoffSessions.indexOf(session);
        if (index !== -1) bridgeHandoffSessions.splice(index, 1);
    }

    function showBridgeHandoffNotice(message) {
        setBridgeStatus(message);
    }

    function openBridgeDashboard(quickView, searchContext, trigger) {
        var handoff = window.FarmaciaBridgeV2DashboardHandoff;
        if (!handoff) {
            showBridgeHandoffNotice('El protocolo Bridge no está disponible.');
            return;
        }
        var nonce;
        try {
            nonce = handoff.generateNonce();
        } catch (error) {
            showBridgeHandoffNotice('No se pudo generar una sesión Bridge segura.');
            return;
        }
        var session = { nonce: nonce, childWindow: null, payload: { search_context: searchContext, quick_view: quickView }, expiresAt: Date.now() + handoff.sessionTtlMs, sent: false };
        var url = 'farmacia_dashboard_paciente.html' + handoff.buildFragment(nonce);
        session.childWindow = window.open(url, '_blank');
        if (!session.childWindow) {
            showBridgeHandoffNotice('El navegador bloqueó la ventana Bridge. El paciente seleccionado sigue activo; permita ventanas emergentes y vuelva a intentarlo.');
            return;
        }
        bridgeHandoffSessions.push(session);
        window.setTimeout(function () {
            if (bridgeHandoffSessions.indexOf(session) !== -1 && Date.now() >= session.expiresAt) removeBridgeSession(session);
        }, handoff.sessionTtlMs + 1000);
        if (trigger) trigger.focus();
    }

    function bindBridgeHandoffMessages() {
        window.addEventListener('message', function (event) {
            var handoff = window.FarmaciaBridgeV2DashboardHandoff;
            if (!handoff || event.origin !== window.location.origin) return;
            var session = bridgeHandoffSessions.find(function (candidate) {
                return candidate.childWindow === event.source && Date.now() < candidate.expiresAt;
            });
            if (!session || !handoff.validateEnvelope(event.data, handoff.readyType, session.nonce) || session.sent) return;
            var envelope = handoff.createPayload(session.nonce, session.payload);
            session.sent = true;
            event.source.postMessage(envelope, window.location.origin);
            removeBridgeSession(session);
        });
    }

    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'fhQuickViewOverlay';
        overlay.className = 'quick-view-overlay hidden';
        var backdrop = document.createElement('div');
        backdrop.className = 'quick-view-backdrop';
        backdrop.setAttribute('data-fh-qv-close', '');

        var panel = document.createElement('section');
        panel.id = 'fhQuickViewPanel';
        panel.className = 'search-results quick-view-panel hidden';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-labelledby', 'fhTitle');
        panel.setAttribute('aria-live', 'polite');

        var header = document.createElement('header');
        header.className = 'results-header';

        var headerInner = document.createElement('div');
        var title = document.createElement('h2');
        title.className = 'results-title';
        title.id = 'fhTitle';
        title.textContent = 'Quick View Farmacia';
        var subtitle = document.createElement('p');
        subtitle.className = 'results-subtitle';
        subtitle.id = 'fhSubtitle';
        headerInner.append(title, subtitle);

        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'quick-view-close-btn';
        closeBtn.setAttribute('data-fh-qv-close', '');
        closeBtn.setAttribute('aria-label', 'Cerrar vista r\u00e1pida');
        var closeIcon = document.createElement('i');
        closeIcon.className = 'fas fa-times';
        closeIcon.setAttribute('aria-hidden', 'true');
        closeBtn.appendChild(closeIcon);

        header.append(headerInner, closeBtn);

        var content = document.createElement('div');
        content.id = 'fhContent';
        content.className = 'results-content';

        panel.append(header, content);
        overlay.append(backdrop, panel);
        document.body.appendChild(overlay);

        var _triggerEl = null;
        var close = function () {
            panel.classList.add('hidden');
            overlay.classList.add('hidden');
            document.body.classList.remove('quick-view-open');
            if (_triggerEl) { _triggerEl.focus(); _triggerEl = null; }
        };

        overlay.addEventListener('click', function (e) {
            if (e.target.closest('[data-fh-qv-close]') && !overlay.classList.contains('hidden')) close();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !overlay.classList.contains('hidden')) close();
        });

        var open = function (triggerEl) {
            _triggerEl = triggerEl || null;
            panel.classList.remove('hidden');
            overlay.classList.remove('hidden');
            document.body.classList.add('quick-view-open');
            closeBtn.focus();
        };
        farmaciaOverlayMount = { overlay: overlay, panel: panel, content: content, title: title, subtitle: subtitle, close: close, open: open };
        return farmaciaOverlayMount;
    }

    function ensureOverlay() {
        return farmaciaOverlayMount || createOverlay();
    }

    function contextFromPatient(patient, entrada) {
        return {
            cip: patient.cip,
            servicio: patient.servicioSlug || patient.servicio,
            patologia: patient.patologia,
            entrada: entrada || ''
        };
    }

    function actionDefinitions(patient) {
        if (patient.estado === 'pending') {
            return [
                { label: 'Validaci\u00f3n', icon: 'fa-check-double', href: 'farmacia_validacion.html', entrada: 'validacion', cls: 'btn-primary' },
                { label: 'Dashboard', icon: 'fa-user-circle', href: 'farmacia_dashboard_paciente.html', entrada: 'dashboard', cls: 'btn-secondary' }
            ];
        }
        if (patient.estado === 'validated') {
            return [
                { label: 'Primera Visita', icon: 'fa-plus-circle', href: 'farmacia_primera_visita.html', entrada: 'primera_visita', cls: 'btn-primary' },
                { label: 'Dashboard', icon: 'fa-user-circle', href: 'farmacia_dashboard_paciente.html', entrada: 'dashboard', cls: 'btn-secondary' }
            ];
        }
        return [
            { label: 'Seguimiento', icon: 'fa-clipboard-list', href: 'farmacia_seguimiento.html', entrada: 'seguimiento', cls: 'btn-primary' },
            { label: 'Dashboard', icon: 'fa-user-circle', href: 'farmacia_dashboard_paciente.html', entrada: 'dashboard', cls: 'btn-secondary' }
        ];
    }

    function renderActions(patient, container) {
        F.clearChildren(container);
        actionDefinitions(patient).forEach(function (action) {
            var link = document.createElement('a');
            link.className = 'btn ' + action.cls;
            link.href = F.makeContextUrl(action.href, contextFromPatient(patient, action.entrada));
            F.appendIconText(link, action.icon, action.label);
            container.appendChild(link);
        });
    }

    /* ─── Quick View visual field helpers ─── */

    var SCORE_INTERPRETATIONS = {
        IHS4: function (v) { return v <= 10 ? 'Leve' : v <= 25 ? 'Moderado' : 'Grave'; },
        DLQI: function (v) { return v <= 1 ? 'Sin efecto' : v <= 5 ? 'Leve' : v <= 10 ? 'Moderado' : v <= 20 ? 'Muy grave' : 'Extremadamente grave'; },
        DAS28: function (v) { return v <= 2.6 ? 'Remisi\u00f3n' : v <= 3.2 ? 'Baja' : v <= 5.1 ? 'Moderada' : 'Alta'; },
        HAQ: function (v) { return v <= 1 ? 'Leve' : v <= 2 ? 'Moderado' : 'Grave'; }
    };

    function knownScoreInterpretation(name, val) {
        var num = parseFloat(val);
        if (isNaN(num)) return '';
        var fn = SCORE_INTERPRETATIONS[name];
        return fn ? fn(num) : '';
    }

    function parseScores(str) {
        var out = [];
        if (!str || str === '\u2014') return out;
        var known = ['IHS4', 'DLQI', 'DAS28', 'HAQ'];
        for (var ki = 0; ki < known.length; ki++) {
            var name = known[ki];
            var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            var re = new RegExp(escaped + '\\s*(?:demo)?:?\\s*(\\d+(?:\\.\\d+)?)(?:\\s*\u2192\\s*(\\d+(?:\\.\\d+)?))?', 'i');
            var m = str.match(re);
            if (m) {
                var val = m[2] || m[1];
                var interp = knownScoreInterpretation(name, val);
                out.push({ name: name, value: val, interpretation: interp });
            }
        }
        return out;
    }

    function parseAdherencia(str) {
        if (!str || str === '\u2014') return { value: '\u2014', interpretation: 'Sin registro' };
        var morisky = str.match(/Morisky[^:]*:\s*(\d+\/\d+)/i);
        if (morisky) return { value: morisky[1], interpretation: 'Alta' };
        if (/alta/i.test(str)) return { value: str, interpretation: 'Alta' };
        if (/media/i.test(str)) return { value: str, interpretation: 'Media' };
        if (/baja/i.test(str)) return { value: str, interpretation: 'Baja' };
        if (/sin registro/i.test(str)) return { value: '\u2014', interpretation: 'Sin registro' };
        return { value: str, interpretation: '' };
    }

    function parseProms(str) {
        var out = [];
        if (!str || str === '\u2014') return out;
        if (/basal pendiente/i.test(str) || /sin registro/i.test(str)) {
            out.push({ name: 'PROMs demo / último valor', value: 'Basal pendiente', interpretation: 'No disponible' });
            return out;
        }
        var dlqi = str.match(/DLQI\s*(\d+)/i);
        if (dlqi) {
            out.push({ name: 'DLQI demo / último valor', value: dlqi[1], interpretation: knownScoreInterpretation('DLQI', dlqi[1]) });
        }
        var eva = str.match(/EVA\s*(picor|dolor)?\s*(\d+)\/10/i);
        if (eva) {
            var evaVal = parseInt(eva[2]);
            var evaName = 'EVA' + (eva[1] ? ' ' + eva[1] : '');
            var evaInterp = isNaN(evaVal) ? '' : evaVal <= 3 ? 'Leve' : evaVal <= 6 ? 'Moderado' : 'Grave';
            out.push({ name: evaName, value: eva[2] + '/10', interpretation: evaInterp });
        }
        var haq = str.match(/HAQ\s*(\d+(?:\.\d+)?)/i);
        if (haq) {
            out.push({ name: 'HAQ', value: haq[1], interpretation: knownScoreInterpretation('HAQ', haq[1]) });
        }
        return out;
    }

    function createScoreChip(score) {
        var chip = document.createElement('div');
        chip.className = 'fh-qv-score-chip';
        var nameEl = document.createElement('span');
        nameEl.className = 'fh-qv-score-chip__name';
        nameEl.textContent = score.name;
        var valueEl = document.createElement('span');
        valueEl.className = 'fh-qv-score-chip__value';
        valueEl.textContent = score.value;
        chip.append(nameEl, valueEl);
        if (score.interpretation) {
            var interpEl = document.createElement('span');
            interpEl.className = 'fh-qv-score-chip__interp';
            interpEl.textContent = score.interpretation;
            chip.appendChild(interpEl);
        }
        return chip;
    }

    function createAdherenciaChip(adh) {
        var chip = document.createElement('div');
        chip.className = 'fh-qv-score-chip';
        var nameEl = document.createElement('span');
        nameEl.className = 'fh-qv-score-chip__name';
        nameEl.textContent = 'Adherencia';
        var valueEl = document.createElement('span');
        valueEl.className = 'fh-qv-score-chip__value';
        valueEl.textContent = adh.value;
        chip.append(nameEl, valueEl);
        if (adh.interpretation) {
            var interpEl = document.createElement('span');
            interpEl.className = 'fh-qv-score-chip__interp';
            interpEl.textContent = adh.interpretation;
            chip.appendChild(interpEl);
        }
        return chip;
    }

    function createPromCard(prom) {
        var card = document.createElement('div');
        card.className = 'fh-qv-score-chip';
        var nameEl = document.createElement('span');
        nameEl.className = 'fh-qv-score-chip__name';
        nameEl.textContent = prom.name;
        var valueEl = document.createElement('span');
        valueEl.className = 'fh-qv-score-chip__value';
        valueEl.textContent = prom.value;
        card.append(nameEl, valueEl);
        if (prom.interpretation) {
            var interpEl = document.createElement('span');
            interpEl.className = 'fh-qv-score-chip__interp';
            interpEl.textContent = prom.interpretation;
            card.appendChild(interpEl);
        }
        return card;
    }

    function createFarmacoGroup(patient) {
        var wrapper = document.createElement('div');
        wrapper.className = 'fh-qv-farmaco-field fh-qv-span-full';
        var label = document.createElement('span');
        label.className = 'info-field__label';
        label.textContent = 'F\u00e1rmaco / Dosis / Pauta';
        wrapper.appendChild(label);
        var group = document.createElement('div');
        group.className = 'fh-qv-farmaco-group';
        function miniCard(lbl, val) {
            var c = document.createElement('div');
            c.className = 'fh-qv-farmaco-chip';
            var l = document.createElement('span');
            l.className = 'fh-qv-farmaco-chip__label';
            l.textContent = lbl;
            var v = document.createElement('span');
            v.className = 'fh-qv-farmaco-chip__value';
            v.textContent = val || '\u2014';
            c.append(l, v);
            return c;
        }
        group.appendChild(miniCard('F\u00e1rmaco', patient.farmaco));
        group.appendChild(miniCard('Dosis', patient.dosis));
        group.appendChild(miniCard('Pauta', patient.pauta));
        wrapper.appendChild(group);
        return wrapper;
    }

    function createAnaliticaChecklist(patient) {
        var wrapper = document.createElement('div');
        wrapper.className = 'info-field fh-qv-span-full';
        var label = document.createElement('span');
        label.className = 'info-field__label';
        label.textContent = 'Estado anal\u00edtica / vacunaci\u00f3n';
        wrapper.appendChild(label);
        var list = document.createElement('div');
        list.className = 'fh-qv-checklist';
        function item(iconCls, text, stateCls) {
            var it = document.createElement('div');
            it.className = 'fh-qv-checklist__item ' + stateCls;
            var ic = document.createElement('i');
            ic.className = 'fas ' + iconCls;
            ic.setAttribute('aria-hidden', 'true');
            var sp = document.createElement('span');
            sp.textContent = text;
            it.append(ic, sp);
            return it;
        }
        var at = patient.analitica.toLowerCase();
        var aOk = /completa|apto/i.test(at);
        var aPend = /pendiente/i.test(at);
        var vOk = /vacuna/i.test(at) && /completa|apto/i.test(at);
        list.appendChild(item(
            aOk ? 'fa-check-circle' : aPend ? 'fa-clock' : 'fa-exclamation-circle',
            'Anal\u00edtica: ' + (aOk ? 'OK' : aPend ? 'Pendiente' : 'Revisar'),
            aOk ? 'fh-qv-checklist__item--ok' : aPend ? 'fh-qv-checklist__item--pending' : 'fh-qv-checklist__item--review'
        ));
        list.appendChild(item(
            vOk ? 'fa-check-circle' : 'fa-clock',
            'Vacunaci\u00f3n: ' + (vOk ? 'OK' : 'Pendiente'),
            vOk ? 'fh-qv-checklist__item--ok' : 'fh-qv-checklist__item--pending'
        ));
        wrapper.appendChild(list);
        return wrapper;
    }

    function renderFhQuickViewFields(grid, patient) {
        F.clearChildren(grid);
        grid.appendChild(F.createField('\u00daltima solicitud FH', patient.ultimaSolicitud));
        grid.appendChild(createFarmacoGroup(patient));
        grid.appendChild(createAnaliticaChecklist(patient));
        var scores = parseScores(patient.scores);
        for (var si = 0; si < scores.length; si++) {
            grid.appendChild(createScoreChip(scores[si]));
        }
        grid.appendChild(createAdherenciaChip(parseAdherencia(patient.adherencia)));
        grid.appendChild(F.createField('Efectos adversos activos', patient.efectosAdversos));
        var proms = parseProms(patient.proms);
        for (var pi = 0; pi < proms.length; pi++) {
            grid.appendChild(createPromCard(proms[pi]));
        }
    }

    function bridgeDisplayValue(value) {
        if (value === null || value === undefined) return 'No registrado';
        if (value === '') return 'Texto vacío registrado';
        if (value === true) return 'Sí';
        if (value === false) return 'No';
        if (typeof value === 'object') return JSON.stringify(value, null, 2);
        return String(value);
    }

    function createBridgeField(label, value) {
        var field = document.createElement('div');
        field.className = 'info-field';
        var labelEl = document.createElement('span');
        labelEl.className = 'info-field__label';
        labelEl.textContent = label;
        var valueEl = document.createElement(typeof value === 'object' && value !== null ? 'pre' : 'span');
        valueEl.className = 'info-field__value';
        valueEl.textContent = bridgeDisplayValue(value);
        if (valueEl.tagName === 'PRE') valueEl.style.whiteSpace = 'pre-wrap';
        field.append(labelEl, valueEl);
        return field;
    }

    function createBridgeSection(title) {
        var section = document.createElement('section');
        section.className = 'fh-overlay-card';
        var heading = document.createElement('h3');
        heading.className = 'section-title';
        heading.textContent = title;
        section.appendChild(heading);
        return section;
    }

    function appendBridgeObjectSection(container, title, object, fields) {
        var section = createBridgeSection(title);
        var grid = document.createElement('div');
        grid.className = 'info-grid';
        var keys = fields || Object.keys(object || {});
        if (!object) {
            grid.appendChild(createBridgeField('Estado', null));
        } else {
            keys.forEach(function (key) {
                grid.appendChild(createBridgeField(key, Object.prototype.hasOwnProperty.call(object, key) ? object[key] : null));
            });
        }
        section.appendChild(grid);
        container.appendChild(section);
    }

    function bridgeEventDate(event, field) {
        if (!event || !event.rows || !event.rows.length) return null;
        return event.rows[0].canonical_row[field];
    }

    function appendBridgeEventSection(container, title, event, fieldPrefixes) {
        var section = createBridgeSection(title);
        if (!event) {
            section.appendChild(createBridgeField('Estado', null));
            container.appendChild(section);
            return;
        }
        var eventGrid = document.createElement('div');
        eventGrid.className = 'info-grid';
        eventGrid.appendChild(createBridgeField('source_event_id', event.source_event_id));
        eventGrid.appendChild(createBridgeField('event_id', event.event_id));
        eventGrid.appendChild(createBridgeField('occurred_at', bridgeEventDate(event, 'occurred_at')));
        eventGrid.appendChild(createBridgeField('recorded_at', bridgeEventDate(event, 'recorded_at')));
        eventGrid.appendChild(createBridgeField('Filas del acto', event.rows.length));
        section.appendChild(eventGrid);
        event.rows.forEach(function (physicalRow) {
            var explicit = {};
            Object.keys(physicalRow.canonical_row).forEach(function (key) {
                if (!fieldPrefixes.some(function (prefix) { return key === prefix || key.indexOf(prefix) === 0; })) return;
                explicit[key] = physicalRow.canonical_row[key];
            });
            var rowTitle = document.createElement('h4');
            rowTitle.textContent = 'Fila ' + bridgeDisplayValue(physicalRow.canonical_row.row_index);
            section.appendChild(rowTitle);
            section.appendChild(createBridgeField('Campos explícitos del bloque', explicit));
        });
        container.appendChild(section);
    }

    function appendBridgeRecordsSection(container, title, records) {
        var section = createBridgeSection(title);
        if (!records || !records.length) {
            section.appendChild(createBridgeField('Estado', null));
        } else {
            records.forEach(function (record) {
                var grid = document.createElement('div');
                grid.className = 'info-grid';
                grid.appendChild(createBridgeField('source_event_id', record.source_event_id));
                grid.appendChild(createBridgeField('row_index', record.row_index));
                grid.appendChild(createBridgeField('Valores explícitos', record.values));
                section.appendChild(grid);
            });
        }
        container.appendChild(section);
    }

    function renderBridgePatientView(quickView, searchContext) {
        var mount = ensureOverlay();
        F.clearChildren(mount.content);
        mount.title.textContent = 'Vista Bridge v2';
        mount.subtitle.textContent = searchContext.identifier_system + ' · ' + searchContext.identifier_value;

        var notice = document.createElement('div');
        notice.className = 'validation-note-block';
        var noticeLabel = document.createElement('span');
        noticeLabel.className = 'validation-note-block__label';
        noticeLabel.textContent = 'Lectura Bridge';
        var noticeText = document.createElement('p');
        noticeText.className = 'validation-note-block__value';
        noticeText.textContent = 'Datos sintéticos/demo. Solo memoria de esta página; tras recargar deberá volver a seleccionar el Excel.';
        notice.append(noticeLabel, noticeText);
        mount.content.appendChild(notice);

        var summary = {
            'Nombre': null,
            'Edad': null,
            'Sexo': null,
            'Nombre de fichero': quickView.workbook.file_name,
            'Sistema de identificador': searchContext.identifier_system,
            'Valor del identificador': searchContext.identifier_value,
            'ID técnico (patient_id)': quickView.patient_id,
            'Servicios': quickView.services,
            'Patologías': quickView.pathologies,
            'Actos válidos': quickView.valid_event_count,
            'Warnings': quickView.warnings.length,
            'Errores source': quickView.source_error_count,
            'Actos excluidos': quickView.excluded_event_count,
            'Importado': quickView.workbook.imported_at,
            'Filas del workbook': quickView.workbook.row_count,
            'Pacientes del workbook': quickView.workbook.patient_count,
            'Versión read model': quickView.workbook.read_model_version,
            'Almacenamiento': quickView.workbook.storage
        };
        appendBridgeObjectSection(mount.content, 'Paciente y workbook', summary);
        appendBridgeObjectSection(mount.content, 'Warnings atribuibles', { warnings: quickView.warnings });

        var timelineSection = createBridgeSection('Timeline de actos válidos');
        if (!quickView.timeline.length) timelineSection.appendChild(createBridgeField('Estado', null));
        quickView.timeline.forEach(function (event) {
            var grid = document.createElement('div');
            grid.className = 'info-grid';
            grid.appendChild(createBridgeField('Tipo de acto', event.event_type));
            grid.appendChild(createBridgeField('source_event_id', event.source_event_id));
            grid.appendChild(createBridgeField('event_id', event.event_id));
            grid.appendChild(createBridgeField('occurred_at', bridgeEventDate(event, 'occurred_at')));
            grid.appendChild(createBridgeField('recorded_at', bridgeEventDate(event, 'recorded_at')));
            grid.appendChild(createBridgeField('Hoja', event.source_sheet));
            grid.appendChild(createBridgeField('Filas / cardinalidad original', event.rows.length));
            grid.appendChild(createBridgeField('Filas físicas', event.physical_row_numbers));
            timelineSection.appendChild(grid);
        });
        mount.content.appendChild(timelineSection);

        appendBridgeObjectSection(mount.content, 'Última solicitud', quickView.latest_request);
        appendBridgeObjectSection(mount.content, 'Última validación', quickView.latest_validation);
        appendBridgeEventSection(mount.content, 'Última Primera Visita', quickView.latest_first_visit, ['first_visit_', 'induction_', 'stratification_', 'baseline_proms_', 'pharmacy_visit_notes', 'proms_json']);
        appendBridgeEventSection(mount.content, 'Último Seguimiento', quickView.latest_followup, ['visit_', 'stratification_', 'previous_', 'new_stratification_', 'followup_', 'dispensation_', 'specific_review_', 'therapeutic_', 'new_', 'movement_', 'suspension_', 'line_observations']);

        var linesSection = createBridgeSection('Líneas explícitas: último snapshot por line_id');
        if (!quickView.lines.length) linesSection.appendChild(createBridgeField('Estado', null));
        quickView.lines.forEach(function (line) {
            var snapshot = line.snapshot;
            var grid = document.createElement('div');
            grid.className = 'info-grid';
            [
                ['line_id', line.line_id], ['treatment_id', line.treatment_id],
                ['source_event_id', line.source_event_id], ['event_type', line.event_type],
                ['active_at_event', snapshot.active_at_event], ['line_role', snapshot.line_role],
                ['is_primary_line', snapshot.is_primary_line], ['line_status_at_event', snapshot.line_status_at_event],
                ['line_drug_name', snapshot.line_drug_name], ['line_active_ingredient', snapshot.line_active_ingredient],
                ['line_presentation', snapshot.line_presentation], ['line_dose_text', snapshot.line_dose_text],
                ['line_route', snapshot.line_route], ['line_schedule_code', snapshot.line_schedule_code],
                ['line_schedule_label', snapshot.line_schedule_label], ['line_schedule_other_text', snapshot.line_schedule_other_text],
                ['line_selected_drug_id', snapshot.line_selected_drug_id], ['line_catalog_source', snapshot.line_catalog_source],
                ['line_national_code', snapshot.line_national_code], ['line_registration_number', snapshot.line_registration_number]
            ].forEach(function (entry) { grid.appendChild(createBridgeField(entry[0], entry[1])); });
            linesSection.appendChild(grid);
        });
        mount.content.appendChild(linesSection);

        appendBridgeRecordsSection(mount.content, 'PROMs estructurados, sin interpretación', quickView.structured_proms);
        appendBridgeRecordsSection(mount.content, 'Adherencia explícita, sin interpretación', quickView.adherence);
        appendBridgeRecordsSection(mount.content, 'Efectos adversos explícitos', quickView.adverse_events);
        appendBridgeRecordsSection(mount.content, 'Causalidad explícita', quickView.causality_assessments);

        var pendingNotice = document.createElement('div');
        pendingNotice.className = 'validation-note-block';
        var pendingLabel = document.createElement('span');
        pendingLabel.className = 'validation-note-block__label';
        pendingLabel.textContent = 'Consumidores pendientes';
        var pendingText = document.createElement('p');
        pendingText.className = 'validation-note-block__value';
         pendingText.textContent = 'El dashboard Bridge está disponible como lectura temporal en una nueva ventana. Validación, Primera Visita, Seguimiento y el resto de consumidores todavía no están conectados al workbook Bridge. No persiste, no transporta el workbook completo y no habilita acciones clínicas.';
        pendingNotice.append(pendingLabel, pendingText);
         mount.content.appendChild(pendingNotice);

         var dashboardButton = document.createElement('button');
         dashboardButton.type = 'button';
         dashboardButton.className = 'btn btn-primary';
         dashboardButton.textContent = 'Abrir dashboard Bridge';
         dashboardButton.addEventListener('click', function () {
             openBridgeDashboard(quickView, {
                 identifier_system: searchContext.identifier_system,
                 identifier_value: searchContext.identifier_value
             }, dashboardButton);
         });
         var dashboardActions = document.createElement('div');
         dashboardActions.className = 'fh-overlay-card__actions';
         dashboardActions.appendChild(dashboardButton);
         mount.content.appendChild(dashboardActions);

         mount.open(document.getElementById('fhBridgeSearchBtn'));
    }

    function renderPatientView(patient) {
        var mount = ensureOverlay();
        F.clearChildren(mount.content);

        var card = document.createElement('div');
        card.className = 'fh-overlay-card';

        var summary = document.createElement('div');
        summary.className = 'fh-overlay-card__summary';

        var avatar = document.createElement('div');
        avatar.className = 'patient-avatar';
        var avatarIcon = document.createElement('i');
        avatarIcon.className = 'fas fa-user';
        avatarIcon.setAttribute('aria-hidden', 'true');
        avatar.appendChild(avatarIcon);

        var info = document.createElement('div');
        info.className = 'fh-overlay-card__info';

        var idBadge = document.createElement('div');
        idBadge.className = 'patient-id-badge';
        idBadge.textContent = 'Paciente demo';

        var nameEl = document.createElement('h3');
        nameEl.className = 'patient-name';
        nameEl.textContent = patient.nombre;

        var meta = document.createElement('div');
        meta.className = 'patient-meta';

        function metaSpan(iconClass, text) {
            var span = document.createElement('span');
            var icon = document.createElement('i');
            icon.className = 'fas ' + iconClass;
            icon.setAttribute('aria-hidden', 'true');
            span.appendChild(icon);
            span.appendChild(document.createTextNode(' ' + text));
            return span;
        }
        meta.appendChild(metaSpan('fa-stethoscope', patient.patologia));
        meta.appendChild(metaSpan('fa-hospital', patient.servicio));
        meta.appendChild(metaSpan('fa-calendar-alt', '\u00daltima visita cl\u00ednica: ' + patient.ultimaVisita));
        meta.appendChild(metaSpan('fa-birthday-cake', patient.edad + ' a\u00f1os'));
        meta.appendChild(metaSpan('fa-venus-mars', patient.sexo));

        info.append(idBadge, nameEl, meta);

        var statusSpan = document.createElement('span');
        statusSpan.className = F.statusClass(patient.estado);
        statusSpan.textContent = patient.estadoLabel;

        summary.append(avatar, info, statusSpan);
        card.appendChild(summary);
        mount.content.appendChild(card);

        var grid = document.createElement('div');
        grid.className = 'info-grid';
        grid.id = 'fhQvGrid';
        mount.content.appendChild(grid);

        var actionsDiv = document.createElement('div');
        actionsDiv.id = 'fhQvActions';
        actionsDiv.className = 'fh-overlay-card__actions';
        mount.content.appendChild(actionsDiv);

        mount.title.textContent = 'Quick View Farmacia';
        mount.subtitle.textContent = patient.cip;

        renderFhQuickViewFields(document.getElementById('fhQvGrid'), patient);
        renderActions(patient, document.getElementById('fhQvActions'));

        var guidedPanel = document.getElementById('guidedIntakePanel');
        if (guidedPanel) guidedPanel.classList.add('hidden');
        var mainEl = document.querySelector('main.main-content');
        if (mainEl) mainEl.classList.remove('fh-intake-active');
        var trigger = document.getElementById('fhSearchBtn');
        mount.open(trigger);
    }

    function showGuidedIntake(cip) {
        if (farmaciaOverlayMount) {
            farmaciaOverlayMount.close();
        }
        F.setText('guidedCip', cip);
        document.getElementById('guidedIntakePanel').classList.remove('hidden');
        var mainEl = document.querySelector('main.main-content');
        if (mainEl) mainEl.classList.add('fh-intake-active');
    }

    function setBridgeStatus(message) {
        var status = document.getElementById('fhBridgeStatus');
        if (status) status.textContent = message;
    }

    function setBridgeElementVisible(id, visible) {
        var element = document.getElementById(id);
        if (element) element.classList.toggle('hidden', !visible);
    }

    function syncBridgeMode() {
        var readModel = window.FarmaciaDataImports && typeof window.FarmaciaDataImports.getBridgeReadModel === 'function'
            ? window.FarmaciaDataImports.getBridgeReadModel()
            : null;
        bridgeModeActive = !!readModel;
        bridgeSelectors = null;

        setBridgeElementVisible('fhBridgeModePanel', bridgeModeActive);
        setBridgeElementVisible('fhLegacySearchPanel', !bridgeModeActive);
        setBridgeElementVisible('demoCaseFh004', !bridgeModeActive);
        setBridgeElementVisible('pendingValidationBoard', !bridgeModeActive);
        setBridgeElementVisible('fhBridgeBoardNotice', bridgeModeActive);
        setBridgeElementVisible('fhBridgeNavigationNotice', bridgeModeActive);

        var sidebarSearch = document.getElementById('patientSearch');
        if (sidebarSearch) {
            sidebarSearch.disabled = bridgeModeActive;
            sidebarSearch.placeholder = bridgeModeActive ? 'Use el buscador Bridge de esta página' : 'Buscar paciente por CIP...';
            sidebarSearch.setAttribute('aria-label', bridgeModeActive ? 'Buscador legacy desactivado mientras Bridge v2 está activo' : 'Buscar paciente por CIP');
        }
        var heroDescription = document.querySelector('.module-hero .hero-description');
        if (heroDescription) {
            heroDescription.textContent = bridgeModeActive
                ? 'Búsqueda por sistema y valor explícitos dentro del workbook Bridge activo.'
                : 'Entrada única por CIP para abrir Quick View o alta guiada.';
        }
        if (!bridgeModeActive) {
            setBridgeStatus('Seleccione un sistema e introduzca el valor exacto.');
            return;
        }

        var guidedPanel = document.getElementById('guidedIntakePanel');
        if (guidedPanel) guidedPanel.classList.add('hidden');
        var mainEl = document.querySelector('main.main-content');
        if (mainEl) mainEl.classList.remove('fh-intake-active');

        if (!window.FarmaciaBridgeV2PatientSelectors || typeof window.FarmaciaBridgeV2PatientSelectors.create !== 'function') {
            setBridgeStatus('No se pudo activar el selector Bridge v2.');
            return;
        }
        try {
            bridgeSelectors = window.FarmaciaBridgeV2PatientSelectors.create(readModel);
            var systems = [];
            bridgeSelectors.listPatientSummaries().forEach(function (patient) {
                patient.identifiers.forEach(function (identifier) {
                    if (systems.indexOf(identifier.identifier_system) === -1) systems.push(identifier.identifier_system);
                });
            });
            systems.sort();
            var select = document.getElementById('fhBridgeIdentifierSystem');
            if (select) {
                var previous = select.value;
                F.clearChildren(select);
                var placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = 'Seleccionar sistema...';
                select.appendChild(placeholder);
                systems.forEach(function (system) {
                    var option = document.createElement('option');
                    option.value = system;
                    option.textContent = system;
                    select.appendChild(option);
                });
                if (systems.indexOf(previous) !== -1) select.value = previous;
            }
            setBridgeStatus('Bridge v2 activo: ' + readModel.metadata.patient_count + ' pacientes y ' + systems.length + ' sistemas disponibles.');
        } catch (error) {
            setBridgeStatus('Read model Bridge v2 no compatible: ' + (error.message || error));
        }
    }

    function searchBridge() {
        var system = document.getElementById('fhBridgeIdentifierSystem').value.trim();
        var value = document.getElementById('fhBridgeIdentifierValue').value.trim();
        if (!system) {
            setBridgeStatus('Seleccione un sistema de identificador.');
            return;
        }
        if (!value) {
            setBridgeStatus('Introduzca el valor del identificador.');
            return;
        }
        var readModel = window.FarmaciaDataImports && window.FarmaciaDataImports.getBridgeReadModel
            ? window.FarmaciaDataImports.getBridgeReadModel()
            : null;
        if (!readModel || !window.FarmaciaBridgeV2PatientSelectors) {
            syncBridgeMode();
            setBridgeStatus('El workbook Bridge ya no está activo. Vuelva a seleccionar el Excel.');
            return;
        }
        try {
            bridgeSelectors = window.FarmaciaBridgeV2PatientSelectors.create(readModel);
        } catch (error) {
            setBridgeStatus('Read model Bridge v2 no compatible: ' + (error.message || error));
            return;
        }
        var patient = bridgeSelectors.findByIdentifier(system, value);
        if (!patient) {
            setBridgeStatus('No encontrado en el workbook Bridge activo.');
            return;
        }
        var quickView = bridgeSelectors.getPatientQuickView(patient.patient_id);
        setBridgeStatus('Paciente encontrado en el workbook Bridge activo.');
        renderBridgePatientView(quickView, { identifier_system: system, identifier_value: value });
    }

    function searchLegacy() {
        var cip = document.getElementById('fhCipInput').value.trim();
        if (!cip) return;
        var patient = F.findPatientByCip(cip);
        if (patient) renderPatientView(patient);
        else showGuidedIntake(cip);
    }

    function search() {
        if (bridgeModeActive) {
            searchBridge();
            return;
        }
        searchLegacy();
    }

    function initGuidedIntake() {
        var servicio = document.getElementById('fhAltaServicio');
        var patologia = document.getElementById('fhAltaPatologia');
        servicio.addEventListener('change', function () {
            F.populateSelect(patologia, F.patologiaPorServicio[servicio.value] || [], 'Seleccionar...');
            patologia.disabled = !servicio.value;
        });
        document.getElementById('fhAltaCancelar').addEventListener('click', function () {
            document.getElementById('guidedIntakePanel').classList.add('hidden');
            var mainEl = document.querySelector('main.main-content');
            if (mainEl) mainEl.classList.remove('fh-intake-active');
        });
        document.getElementById('fhAltaAcceder').addEventListener('click', function (event) {
            event.preventDefault();
            var punto = document.getElementById('fhAltaPuntoEntrada').value;
            var cip = document.getElementById('guidedCip').textContent.trim();
            var servicioOption = servicio.selectedOptions && servicio.selectedOptions[0];
            var servicioLabel = servicioOption ? servicioOption.textContent.trim() : '';
            var destinos = {
                validacion: 'farmacia_validacion.html',
                primera_visita: 'farmacia_primera_visita.html',
                seguimiento: 'farmacia_seguimiento.html'
            };
            if (!punto || !destinos[punto]) {
                window.alert('Seleccione un circuito de entrada para continuar.');
                return;
            }
            if (!cip || !servicio.value || !patologia.value) {
                window.alert('Complete CIP, servicio origen y patolog\u00eda/indicaci\u00f3n para continuar.');
                return;
            }
            var currentParams = new URLSearchParams(window.location.search);
            var url = F.makeContextUrl(destinos[punto], {
                cip: cip,
                servicio: servicioLabel,
                patologia: patologia.value,
                entrada: currentParams.get('entrada') || punto
            });
            window.location.href = url + (url.indexOf('?') === -1 ? '?' : '&') + 'destino=' + encodeURIComponent(punto);
        });
    }


    function textOrDash(value) {
        return value === null || value === undefined || String(value).trim() === '' ? '—' : String(value).trim();
    }

    function buildPendingMeta(iconClass, text) {
        var row = document.createElement('div');
        row.className = 'pending-validation-card__meta';
        var icon = document.createElement('i');
        icon.className = 'fas ' + iconClass;
        icon.setAttribute('aria-hidden', 'true');
        row.appendChild(icon);
        row.appendChild(document.createTextNode(' ' + text));
        return row;
    }

    function pendingSourceLabel(patient) {
        var source = String((patient && patient.importSource) || 'demo');
        if (source.toLowerCase().indexOf('farmacia') !== -1) return 'Excel Farmacia';
        if (source.toLowerCase().indexOf('enfermer') !== -1) return 'Excel Enfermería';
        return 'demo';
    }

    function renderPendingValidationBoard() {
        var board = document.getElementById('pendingValidationBoard');
        var cards = document.getElementById('pendingValidationCards');
        var empty = document.getElementById('pendingValidationEmpty');
        var count = document.getElementById('pendingValidationBoardCount');
        if (!board || !cards || !empty || !count || !F.getPendingValidationPatients || !F.isEnfermeriaPatient) return;
        F.clearChildren(cards);
        var patients = F.getPendingValidationPatients();

        // Detectar si hay datos importados desde Excel (Enfermería o Farmacia)
        var hasImportedData = false;
        if (window.FarmaciaDataImports && typeof window.FarmaciaDataImports.getImportedPatients === 'function') {
            var importedPats = window.FarmaciaDataImports.getImportedPatients();
            hasImportedData = importedPats && importedPats.length > 0;
        }

        var filtered = patients.filter(function (p) {
            if (F.isEnfermeriaPatient(p)) return false;
            // Si hay datos importados, ocultar fallback demo
            if (hasImportedData) {
                var src = String(p.importSource || '').toLowerCase();
                if (src === 'demo' || src === '') return false;
            }
            return true;
        });
        count.textContent = String(filtered.length);
        empty.classList.toggle('hidden', filtered.length > 0);
        if (!filtered.length) return;

        filtered.forEach(function (patient) {
            var card = document.createElement('article');
            card.className = 'pending-validation-card';

            var header = document.createElement('div');
            header.className = 'pending-validation-card__header';
            var titleWrap = document.createElement('div');
            titleWrap.className = 'pending-validation-card__title-wrap';
            var title = document.createElement('h3');
            title.className = 'pending-validation-card__title';
            title.textContent = textOrDash(patient.cip);
            var subtitle = document.createElement('p');
            subtitle.className = 'pending-validation-card__subtitle';
            subtitle.textContent = textOrDash(patient.nombre);
            titleWrap.append(title, subtitle);
            var badge = document.createElement('span');
            badge.className = 'status-badge status-badge--pending';
            badge.textContent = 'Pendiente de validación';
            header.append(titleWrap, badge);
            card.appendChild(header);

            var body = document.createElement('div');
            body.className = 'pending-validation-card__body';
            body.appendChild(buildPendingMeta('fa-hospital', 'Servicio origen: ' + textOrDash(patient.servicio)));
            body.appendChild(buildPendingMeta('fa-stethoscope', 'Patología / indicación: ' + textOrDash(patient.patologia || patient.motivoClinico)));
            body.appendChild(buildPendingMeta('fa-pills', 'Fármaco / tratamiento: ' + textOrDash(patient.farmaco || patient.principioActivo)));
            body.appendChild(buildPendingMeta('fa-calendar-alt', 'Fecha solicitud: ' + textOrDash(patient.fechaSolicitud || patient.ultimaSolicitud)));
            body.appendChild(buildPendingMeta('fa-database', 'Origen de datos: ' + pendingSourceLabel(patient)));
            card.appendChild(body);

            card.appendChild(renderPrebioBlock(patient));

            var actions = document.createElement('div');
            actions.className = 'pending-validation-card__actions';
            var link = document.createElement('a');
            link.className = 'btn btn-primary';
            link.href = F.makeContextUrl('farmacia_validacion.html', {
                cip: patient.cip,
                servicio: patient.servicioSlug || patient.servicio,
                patologia: patient.patologia,
                entrada: 'validacion'
            });
            F.appendIconText(link, 'fa-check-double', 'Abrir validación');
            actions.appendChild(link);
            card.appendChild(actions);

            cards.appendChild(card);
        });
    }

    function renderPrebioBlock(patient) {
        var block = document.createElement('div');
        block.className = 'pending-validation-card__prebio';

        if (!patient) {
            block.textContent = 'Prebiológico no evaluable';
            return block;
        }

        if (!window.FarmaciaPrebiologico) {
            console.warn('[Farmacia] FarmaciaPrebiologico no disponible');
            block.textContent = 'Prebiológico no evaluable';
            return block;
        }

        if (typeof window.FarmaciaPrebiologico.evaluatePatientPrebiologico !== 'function') {
            block.textContent = 'Prebiológico no evaluable';
            return block;
        }

        var result = window.FarmaciaPrebiologico.evaluatePatientPrebiologico(patient);

        if (!result || !result.overallStatus) {
            block.textContent = 'Prebiológico no evaluable';
            return block;
        }

        var overallStatus = result.overallStatus;
        var blockers = result.blockers || [];

        var labelRow = document.createElement('div');
        labelRow.className = 'pending-validation-card__prebio-label';
        var icon = document.createElement('i');
        icon.setAttribute('aria-hidden', 'true');
        var text = document.createElement('span');

        if (overallStatus === 'complete') {
            block.className = 'pending-validation-card__prebio prebio-complete pending-validation-card__prebio--ok';
            icon.className = 'fas fa-check-circle';
            text.textContent = 'Prebiológico completo · Listo para validación';
            labelRow.appendChild(icon);
            labelRow.appendChild(text);
            block.appendChild(labelRow);
            return block;
        }

        if (overallStatus === 'blocked' || overallStatus === 'incomplete') {
            var statusClass = overallStatus === 'blocked' ? 'prebio-blocked pending-validation-card__prebio--alerta' : 'prebio-incomplete pending-validation-card__prebio--pending';
            block.className = 'pending-validation-card__prebio ' + statusClass;

            if (overallStatus === 'blocked') {
                icon.className = 'fas fa-exclamation-triangle';
                text.textContent = 'Prebiológico bloqueado · ' + blockers.length + ' bloqueo' + (blockers.length === 1 ? '' : 's');
            } else {
                icon.className = 'fas fa-hourglass-half';
                text.textContent = 'Prebiológico incompleto · ' + blockers.length + ' bloqueo' + (blockers.length === 1 ? '' : 's');
            }

            labelRow.appendChild(icon);
            labelRow.appendChild(text);
            block.appendChild(labelRow);

            if (blockers.length > 0) {
                var priority = { alert: 0, pending: 1, unknown: 2, missing: 3 };
                var sorted = blockers.slice().sort(function (a, b) {
                    var pa = priority[a.status] !== undefined ? priority[a.status] : 99;
                    var pb = priority[b.status] !== undefined ? priority[b.status] : 99;
                    return pa - pb;
                });

                var chipsContainer = document.createElement('div');
                chipsContainer.className = 'pending-validation-card__prebio-chips';
                var maxShown = 3;
                var shown = sorted.slice(0, maxShown);
                var extra = sorted.length - maxShown;

                for (var i = 0; i < shown.length; i++) {
                    var item = shown[i];
                    var chip = document.createElement('span');
                    chip.className = 'prebio-chip status-' + item.status;
                    chip.textContent = item.label + ': ' + item.status;
                    if (item.detail) {
                        chip.setAttribute('title', item.detail);
                    }
                    chipsContainer.appendChild(chip);
                }

                if (extra > 0) {
                    var moreChip = document.createElement('span');
                    moreChip.className = 'prebio-chip prebio-chip--more';
                    moreChip.textContent = '+' + extra + ' más';
                    chipsContainer.appendChild(moreChip);
                }

                block.appendChild(chipsContainer);
            }

            return block;
        }

        block.textContent = 'Prebiológico no evaluable';
        return block;
    }

    /* ── Board de solicitudes Enfermería WO8.1c.8 ────────────────── */

    var ENFERMERIA_GROUP_CONFIG = {
        ok_farmacia: { label: 'Listos para validación', icon: 'fa-check-circle', cls: 'enf-group--ok' },
        en_vigilancia: { label: 'En vigilancia prebiológica', icon: 'fa-hourglass-half', cls: 'enf-group--vigilance' },
        bloqueado: { label: 'Bloqueados', icon: 'fa-exclamation-triangle', cls: 'enf-group--blocked' },
        sin_clasificar: { label: 'Estado pendiente de clasificación', icon: 'fa-question-circle', cls: '' }
    };

    function classifyEnfermeriaState(patient) {
        var hasPrebiologicoState = patient && Object.prototype.hasOwnProperty.call(patient, 'estado_prebiologico_enfermeria');
        var explicitState = hasPrebiologicoState ? patient.estado_prebiologico_enfermeria : (patient && patient.estado);
        var normalized = String(explicitState || '').trim().toUpperCase().replace(/\s+/g, '_');
        if (normalized === 'OK_FARMACIA') return 'ok_farmacia';
        if (normalized === 'EN_VIGILANCIA') return 'en_vigilancia';
        if (normalized === 'BLOQUEADO') return 'bloqueado';
        return 'sin_clasificar';
    }

    /**
     * Construye una tarjeta clínica para Enfermería reutilizando el
     * patrón DOM/clases de pending-validation-card (tarjeta bonita existente).
     */
    function renderEnfermeriaAsPendingCard(patient, groupKey) {
        var card = document.createElement('article');
        card.className = 'pending-validation-card';
        card.setAttribute('data-enf-cip', patient.cip);
        card.setAttribute('data-enf-estado', groupKey);

        // Header: CIP + nombre + badge estado
        var header = document.createElement('div');
        header.className = 'pending-validation-card__header';
        var titleWrap = document.createElement('div');
        titleWrap.className = 'pending-validation-card__title-wrap';
        var title = document.createElement('h3');
        title.className = 'pending-validation-card__title';
        title.textContent = textOrDash(patient.cip);
        var subtitle = document.createElement('p');
        subtitle.className = 'pending-validation-card__subtitle';
        subtitle.textContent = textOrDash(patient.nombre || patient.paciente_nombre);
        titleWrap.append(title, subtitle);
        var badge = document.createElement('span');
        badge.className = 'status-badge status-badge--' + (groupKey === 'ok_farmacia' ? 'ok' : groupKey === 'bloqueado' ? 'blocked' : groupKey === 'en_vigilancia' ? 'vigilance' : 'pending');
        badge.textContent = groupKey === 'sin_clasificar'
            ? ENFERMERIA_GROUP_CONFIG.sin_clasificar.label
            : (patient.estadoLabel || patient.estado_prebiologico_enfermeria || '—');
        header.append(titleWrap, badge);
        card.appendChild(header);

        // Body: meta rows con iconos
        var body = document.createElement('div');
        body.className = 'pending-validation-card__body';
        body.appendChild(buildPendingMeta('fa-hospital', 'Servicio: ' + textOrDash(patient.servicio || patient.servicio_origen)));
        body.appendChild(buildPendingMeta('fa-stethoscope', 'Patología: ' + textOrDash(patient.patologia || patient.patologia_indicacion)));
        body.appendChild(buildPendingMeta('fa-pills', 'Fármaco: ' + textOrDash(patient.farmaco || patient.farmaco_solicitado)));
        body.appendChild(buildPendingMeta('fa-database', 'Origen: Excel Enfermería'));
        if (patient.fecha_ok_farmacia) {
            body.appendChild(buildPendingMeta('fa-calendar-check', 'Fecha OK Farmacia: ' + patient.fecha_ok_farmacia));
        }
        card.appendChild(body);

        // Badges prebiológicos
        var badges = F.getEnfermeriaBadges(patient);
        if (badges.length > 0) {
            var badgesContainer = document.createElement('div');
            badgesContainer.className = 'pending-validation-card__prebio-chips';
            for (var bi = 0; bi < badges.length; bi++) {
                var chip = document.createElement('span');
                chip.className = 'prebio-chip status-' + badges[bi].status;
                chip.textContent = badges[bi].label + ': ' + badges[bi].display;
                badgesContainer.appendChild(chip);
            }
            card.appendChild(badgesContainer);
        }

        // Observación
        if (patient.observaciones_prebiologico) {
            var obsRow = document.createElement('div');
            obsRow.className = 'pending-validation-card__meta';
            obsRow.style.fontStyle = 'italic';
            obsRow.textContent = 'Observación: ' + patient.observaciones_prebiologico;
            card.appendChild(obsRow);
        }

        // ── Detail panel: todos los ítems prebiológicos ────────────
        var detailPanel = document.createElement('div');
        detailPanel.className = 'enfermeria-detail-panel';
        detailPanel.id = 'enfDetail_' + (patient.cip || '0');

        var detailTitle = document.createElement('h4');
        detailTitle.className = 'enfermeria-detail-panel__title';
        detailTitle.textContent = 'Detalle prebiológico Enfermería';
        detailPanel.appendChild(detailTitle);

        var detailGrid = document.createElement('div');
        detailGrid.className = 'enfermeria-detail-panel__grid';

        var enfFields = [
            { key: 'analitica_estado', label: 'Analítica' },
            { key: 'mantoux_estado', label: 'Mantoux' },
            { key: 'igra_estado', label: 'IGRA' },
            { key: 'vhb_estado', label: 'VHB' },
            { key: 'vhc_estado', label: 'VHC' },
            { key: 'vih_estado', label: 'VIH' },
            { key: 'medicina_preventiva_estado', label: 'Med. Preventiva' }
        ];
        for (var fi = 0; fi < enfFields.length; fi++) {
            var rawVal = patient[enfFields[fi].key];
            var displayVal = rawVal ? String(rawVal).trim() : '—';
            var normalized = F.normalizeEnfermeriaFieldValue ? F.normalizeEnfermeriaFieldValue(rawVal) : displayVal;
            var item = document.createElement('div');
            item.className = 'enfermeria-detail-panel__item';
            var labelSpan = document.createElement('span');
            labelSpan.className = 'enfermeria-detail-panel__item-label';
            labelSpan.textContent = enfFields[fi].label;
            var valueSpan = document.createElement('span');
            valueSpan.className = 'enfermeria-detail-panel__item-value';
            valueSpan.textContent = normalized;
            item.append(labelSpan, valueSpan);
            detailGrid.appendChild(item);
        }
        detailPanel.appendChild(detailGrid);
        card.appendChild(detailPanel);

        // ── Actions ───────────────────────────────────────────────
        var actions = document.createElement('div');
        actions.className = 'pending-validation-card__actions';
        if (groupKey === 'ok_farmacia') {
            var link = document.createElement('a');
            link.className = 'btn btn-primary';
            link.href = F.makeContextUrl('farmacia_validacion.html', {
                cip: patient.cip,
                servicio: patient.servicioSlug || patient.servicio || patient.servicio_origen,
                patologia: patient.patologia || patient.patologia_indicacion,
                entrada: 'validacion'
            });
            F.appendIconText(link, 'fa-check-double', 'Abrir validación');
            link.setAttribute('data-enf-action', 'validar');
            actions.appendChild(link);
        } else {
            var toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'btn btn-secondary';
            toggleBtn.style.cursor = 'pointer';
            toggleBtn.setAttribute('data-enf-toggle', patient.cip || '');
            if (groupKey === 'bloqueado') {
                F.appendIconText(toggleBtn, 'fa-exclamation-triangle', 'Ver bloqueantes');
            } else if (groupKey === 'sin_clasificar') {
                F.appendIconText(toggleBtn, 'fa-info-circle', 'Ver detalle');
            } else {
                F.appendIconText(toggleBtn, 'fa-hourglass-half', 'Ver pendientes prebiológicos');
            }
            toggleBtn.addEventListener('click', function (cip, panel) {
                return function () {
                    panel.classList.toggle('open');
                    var isOpen = panel.classList.contains('open');
                    var btnText = groupKey === 'bloqueado'
                        ? (isOpen ? 'Ocultar bloqueantes' : 'Ver bloqueantes')
                        : (groupKey === 'sin_clasificar'
                            ? (isOpen ? 'Ocultar detalle' : 'Ver detalle')
                            : (isOpen ? 'Ocultar detalle prebiológico' : 'Ver pendientes prebiológicos'));
                    // Update button text keeping icon
                    var icon = this.querySelector('i');
                    F.clearChildren(this);
                    if (icon) this.appendChild(icon);
                    this.appendChild(document.createTextNode(' ' + btnText));
                };
            }(patient.cip, detailPanel));
            actions.appendChild(toggleBtn);
        }
        // Dashboard siempre disponible
        var dashLink = document.createElement('a');
        dashLink.className = 'btn btn-secondary';
        dashLink.href = F.makeContextUrl('farmacia_dashboard_paciente.html', {
            cip: patient.cip,
            entrada: 'dashboard'
        });
        F.appendIconText(dashLink, 'fa-user-circle', 'Dashboard');
        actions.appendChild(dashLink);
        card.appendChild(actions);

        return card;
    }

    function renderEnfermeriaBoard() {
        if (!F.getEnfermeriaVisiblePatients || !F.getEnfermeriaBadges) return;
        var board = document.getElementById('enfermeriaBoard');
        var cards = document.getElementById('enfermeriaBoardCards');
        var empty = document.getElementById('enfermeriaBoardEmpty');
        var count = document.getElementById('enfermeriaBoardCount');
        if (!board || !cards || !empty || !count) return;

        var patients = F.getEnfermeriaVisiblePatients();
        F.clearChildren(cards);
        count.textContent = String(patients.length);
        empty.classList.toggle('hidden', patients.length > 0);
        if (!patients.length) return;

        var groups = { ok_farmacia: [], en_vigilancia: [], bloqueado: [], sin_clasificar: [] };
        patients.forEach(function (p) {
            groups[classifyEnfermeriaState(p)].push(p);
        });

        var order = ['ok_farmacia', 'en_vigilancia', 'bloqueado', 'sin_clasificar'];
        for (var gi = 0; gi < order.length; gi++) {
            var gk = order[gi];
            var g = groups[gk];
            if (!g || !g.length) continue;
            var cfg = ENFERMERIA_GROUP_CONFIG[gk] || { label: gk, icon: 'fa-question-circle', cls: '' };

            var groupHeader = document.createElement('h3');
            groupHeader.className = 'enfermeria-group__header ' + (cfg.cls || '');
            var gIcon = document.createElement('i');
            gIcon.className = 'fas ' + cfg.icon;
            gIcon.setAttribute('aria-hidden', 'true');
            groupHeader.appendChild(gIcon);
            groupHeader.appendChild(document.createTextNode(' ' + cfg.label + ' (' + g.length + ')'));
            cards.appendChild(groupHeader);

            // Grid responsive para las tarjetas
            var grid = document.createElement('div');
            grid.className = 'enfermeria-card-grid';

            for (var pi = 0; pi < g.length; pi++) {
                var card = renderEnfermeriaAsPendingCard(g[pi], gk);
                grid.appendChild(card);
            }

            cards.appendChild(grid);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
         ensureOverlay();
        bindBridgeHandoffMessages();
        var searchBtn = document.getElementById('fhSearchBtn');
        var cipInput = document.getElementById('fhCipInput');
        if (searchBtn) searchBtn.addEventListener('click', search);
        if (cipInput) cipInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                search();
            }
        });
        var bridgeSearchBtn = document.getElementById('fhBridgeSearchBtn');
        var bridgeIdentifierValue = document.getElementById('fhBridgeIdentifierValue');
        if (bridgeSearchBtn) bridgeSearchBtn.addEventListener('click', search);
        if (bridgeIdentifierValue) bridgeIdentifierValue.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                search();
            }
        });
        initGuidedIntake();
        syncBridgeMode();
        renderEnfermeriaBoard();
        renderPendingValidationBoard();
        document.addEventListener('farmacia:data-imported', function () {
            syncBridgeMode();
            renderEnfermeriaBoard();
            renderPendingValidationBoard();
        });
        var context = F.getQueryContext();
        if (context.cip && cipInput) {
            cipInput.value = context.cip;
            search();
        }
    });
})();
