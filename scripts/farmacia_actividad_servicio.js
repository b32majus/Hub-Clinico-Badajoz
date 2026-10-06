'use strict';

/* WO #549 (WO-NEXUS-FARMACIA-PENDIENTES-V1-20261005) — superficie `Pendientes`.
 *
 * Cola unica `Solicitudes pendientes`: union sin duplicados de las dos
 * bandejas publicadas en Inicio, leida a traves de los seams sync
 * publicados de F4.3D (nunca via helpers legacy de poblacion directos):
 *   - poblacion publicada: readAvailablePatientsSync (unica pasada);
 *   - tray G publicado: readPendingValidationPatientsSync
 *     (misma poblacion, mismo merge de coexistencia);
 *   - tray E publicado: getEnfermeriaVisiblePatients (solo los tres
 *     campos de origen explicitos; importSource solo nunca admite).
 * La pasada es unica sobre la poblacion publicada y la desduplicacion es
 * por identidad de registro (solicitud_id exacto cuando existe, CIP en
 * caso contrario): la misma CIP con solicitudes distintas no colapsa y
 * una solicitud presente en ambas lecturas se renderiza una sola vez.
 * Frontera Enfermeria en TODA la superficie = pertenencia a tray E
 * (getEnfermeriaVisiblePatients: solo los tres campos de origen
 * explicitos; importSource solo nunca admite). El mismo conjunto de
 * claves tray-E construido para la pertenencia a la cola decide el
 * conteo por categoria y el tipo de tarjeta: el predicado ancho de
 * importSource (admite cualquier importSource con "enfermer") no se
 * usa en esta superficie.
 *
 * Resumen (mapeo congelado WO #549): total = longitud de la cola;
 * `Listas para validacion` = fila tray-E + clasificacion publicada
 * ok_farmacia; `En vigilancia` = tray-E + en_vigilancia; `Bloqueadas`
 * = tray-E + bloqueado. Las filas reconciliadas (listo_para_citar,
 * denegado, conflicto), las sin_clasificar y TODA fila no tray-E
 * (incluida una fila solo tray-G con importSource Enfermeria-ish)
 * cuentan solo en el total. Cero clasificacion clinica nueva.
 *
 * El clasificador local reproduce EXACTAMENTE la precedencia publicada
 * de classifyEnfermeriaState (scripts/farmacia_index.js): la
 * reconciliacion reconciliable gana sobre el estado crudo y
 * estado_prebiologico_enfermeria gana sobre estado. Esa fuente es
 * OUT OF SCOPE, por lo que la duplicacion es inevitable; la paridad
 * determinista la prueba tools/farmacia_pendientes_queue_check.mjs.
 *
 * Tarjetas: patron DOM/clases publicado pending-validation-card de
 * Inicio (cabecera CIP + nombre + badge, meta servicio/patologia/
 * farmaco/fecha/origen, subpanel de detalle expandible, bloque
 * prebiologico con chips de bloqueantes y acciones por estado
 * Abrir validacion / Ver bloqueantes / Ver detalle /
 * Ver pendientes prebiologicos). Tipo de tarjeta por frontera tray-E:
 * filas tray-E = tarjeta Enfermeria (Origen: Excel Enfermeria);
 * resto de la cola = tarjeta general (procedencia fiel F2). Sin accion
 * por tarjeta mas alla de esas: esta superficie no reproduce ningun
 * acceso a paneles de indicadores por tarjeta.
 */

(function () {
    var F = window.FarmaciaDemo || null;

    var SUMMARY_CARDS = [
        { key: 'total', title: 'Solicitudes pendientes', icon: 'fa-tasks' },
        { key: 'listas', title: 'Listas para validación', icon: 'fa-check-circle' },
        { key: 'vigilancia', title: 'En vigilancia', icon: 'fa-hourglass-half' },
        { key: 'bloqueadas', title: 'Bloqueadas', icon: 'fa-exclamation-triangle' }
    ];

    var QUEUE_TITLE = 'Solicitudes pendientes';
    var QUEUE_EMPTY_TEXT = 'No hay solicitudes pendientes.';

    function textOrDash(v) {
        return (v !== null && v !== undefined && String(v).trim() !== '') ? String(v) : '—';
    }

    /* Identidad de registro para desduplicar la union: solicitud exacta
       cuando existe (misma CIP con solicitudes distintas no colapsa),
       CIP normalizado en caso contrario. */
    function recordIdentityKey(patient) {
        var sid = patient && patient.solicitud_id ? String(patient.solicitud_id).trim().toUpperCase() : '';
        if (sid) return 'SID:' + sid;
        return 'CIP:' + String((patient && patient.cip) || '').trim().toUpperCase();
    }

    /* Reproduccion exacta de la precedencia publicada de
       classifyEnfermeriaState (scripts/farmacia_index.js, OUT OF SCOPE).
       Cualquier cambio aqui debe re-probarse contra el oraculo de
       paridad tools/farmacia_pendientes_queue_check.mjs. */
    function classifyPendienteState(patient) {
        var rec = patient && patient.reconciliacion_fh;
        if (rec && rec.reconciliable) {
            if (rec.estado === 'READY_TO_CITE') return 'listo_para_citar';
            if (rec.estado === 'DENIED_DO_NOT_CITE') return 'denegado';
            if (rec.estado === 'RECONCILIATION_CONFLICT') return 'conflicto';
        }
        var hasPrebiologicoState = patient && Object.prototype.hasOwnProperty.call(patient, 'estado_prebiologico_enfermeria');
        var explicitState = hasPrebiologicoState ? patient.estado_prebiologico_enfermeria : (patient && patient.estado);
        var normalized = String(explicitState || '').trim().toUpperCase().replace(/\s+/g, '_');
        if (normalized === 'OK_FARMACIA') return 'ok_farmacia';
        if (normalized === 'EN_VIGILANCIA') return 'en_vigilancia';
        if (normalized === 'BLOQUEADO') return 'bloqueado';
        return 'sin_clasificar';
    }

    function isQueueRow(patient, queueKeys) {
        if (!patient) return false;
        return !!queueKeys[recordIdentityKey(patient)];
    }

    /* Conjunto de claves tray-E (frontera unica Enfermeria de esta
       superficie): identidades de getEnfermeriaVisiblePatients, la
       misma pasada que alimenta la pertenencia a la cola. El conteo
       por categoria y el tipo de tarjeta consumen este mismo conjunto;
       una sola frontera, una sola ruta de codigo. */
    function buildTrayEKeys() {
        var trayEnfermeria = F.getEnfermeriaVisiblePatients() || [];
        var keys = {};
        for (var i = 0; i < trayEnfermeria.length; i++) {
            keys[recordIdentityKey(trayEnfermeria[i])] = true;
        }
        return keys;
    }

    function isTrayERow(patient, trayEKeys) {
        if (!patient || !trayEKeys) return false;
        return !!trayEKeys[recordIdentityKey(patient)];
    }

    function readSolicitudesQueue() {
        if (!F || typeof F.readAvailablePatientsSync !== 'function' ||
            typeof F.readPendingValidationPatientsSync !== 'function' ||
            typeof F.getEnfermeriaVisiblePatients !== 'function') {
            return { queue: [], trayEKeys: {} };
        }
        var population = F.readAvailablePatientsSync() || [];
        /* F1: la cola es EXACTAMENTE tray E ∪ tray G — conjuntos de
           identidades de las dos exportaciones publicadas. Solo
           importSource nunca admite una fila. */
        var trayEKeys = buildTrayEKeys();
        var trayPending = F.readPendingValidationPatientsSync() || [];
        var queueKeys = {};
        for (var key in trayEKeys) {
            if (Object.prototype.hasOwnProperty.call(trayEKeys, key)) queueKeys[key] = true;
        }
        for (var k = 0; k < trayPending.length; k++) {
            queueKeys[recordIdentityKey(trayPending[k])] = true;
        }
        var queue = [];
        for (var j = 0; j < population.length; j++) {
            if (isQueueRow(population[j], queueKeys)) queue.push(population[j]);
        }
        return { queue: queue, trayEKeys: trayEKeys };
    }

    function countSummary(queue, trayEKeys) {
        var summary = { total: queue.length, listas: 0, vigilancia: 0, bloqueadas: 0 };
        for (var i = 0; i < queue.length; i++) {
            /* Frontera tray-E en el conteo: solo una fila tray-E
               alimenta las tres categorias. Cualquier otra fila de la
               cola (p. ej. solo tray-G con importSource Enfermeria-ish)
               cuenta solo en el total, sea cual sea su estado. */
            if (!isTrayERow(queue[i], trayEKeys)) continue;
            var group = classifyPendienteState(queue[i]);
            if (group === 'ok_farmacia') summary.listas += 1;
            else if (group === 'en_vigilancia') summary.vigilancia += 1;
            else if (group === 'bloqueado') summary.bloqueadas += 1;
        }
        return summary;
    }

    function buildSummaryCard(def, value) {
        var card = document.createElement('div');
        card.className = 'dashboard-card';
        card.setAttribute('data-summary', def.key);

        var heading = document.createElement('h2');
        heading.className = 'card-title';
        var icon = document.createElement('i');
        icon.className = 'fas ' + def.icon;
        icon.setAttribute('aria-hidden', 'true');
        heading.appendChild(icon);
        heading.appendChild(document.createTextNode(' ' + def.title));
        card.appendChild(heading);

        var count = document.createElement('p');
        count.className = 'patient-name';
        count.textContent = String(value);
        card.appendChild(count);

        return card;
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

    /* F2: procedencia fiel en la tarjeta general — importSource crudo
       verbatim cuando existe; sin linea de origen cuando falta. Nunca se
       reetiqueta un origen desconocido a 'demo' ni se inventa un origen. */
    function hasProvenanceSource(patient) {
        return !!(patient && patient.importSource && String(patient.importSource).trim() !== '');
    }

    function buildPrebioBlock(patient) {
        var block = document.createElement('div');
        block.className = 'pending-validation-card__prebio';

        if (!patient) {
            block.textContent = 'Prebiológico no evaluable';
            return block;
        }

        if (!window.FarmaciaPrebiologico) {
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

    function buildValidationLink(patient, extraContext) {
        var link = document.createElement('a');
        link.className = 'btn btn-primary';
        var context = {
            cip: patient.cip,
            servicio: patient.servicioSlug || patient.servicio || patient.servicio_origen,
            patologia: patient.patologia || patient.patologia_indicacion || patient.motivoClinico,
            entrada: 'validacion',
            solicitud_id: patient.solicitud_id || ''
        };
        if (extraContext) {
            for (var key in extraContext) {
                if (Object.prototype.hasOwnProperty.call(extraContext, key)) context[key] = extraContext[key];
            }
        }
        link.href = F.makeContextUrl('farmacia_validacion.html', context);
        F.appendIconText(link, 'fa-check-double', 'Abrir validación');
        return link;
    }

    function toggleDetail(panel, button, collapsedLabel, expandedLabel) {
        panel.classList.toggle('open');
        var isOpen = panel.classList.contains('open');
        button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        var icon = button.querySelector('i');
        F.clearChildren(button);
        if (icon) button.appendChild(icon);
        button.appendChild(document.createTextNode(' ' + (isOpen ? expandedLabel : collapsedLabel)));
    }

    function buildDetailToggle(patient, panel, groupKey) {
        var toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'btn btn-secondary';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-controls', panel.id);
        toggleBtn.setAttribute('data-pendientes-toggle', patient.cip || '');
        var collapsed;
        var expanded;
        if (groupKey === 'bloqueado') {
            F.appendIconText(toggleBtn, 'fa-exclamation-triangle', 'Ver bloqueantes');
            collapsed = 'Ver bloqueantes';
            expanded = 'Ocultar bloqueantes';
        } else if (groupKey === 'en_vigilancia') {
            F.appendIconText(toggleBtn, 'fa-hourglass-half', 'Ver pendientes prebiológicos');
            collapsed = 'Ver pendientes prebiológicos';
            expanded = 'Ocultar detalle prebiológico';
        } else {
            F.appendIconText(toggleBtn, 'fa-info-circle', 'Ver detalle');
            collapsed = 'Ver detalle';
            expanded = 'Ocultar detalle';
        }
        toggleBtn.addEventListener('click', function () {
            toggleDetail(panel, toggleBtn, collapsed, expanded);
        });
        return toggleBtn;
    }

    function buildEnfermeriaDetailPanel(patient, detailId) {
        var detailPanel = document.createElement('div');
        detailPanel.className = 'enfermeria-detail-panel';
        detailPanel.id = detailId;

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
            item.appendChild(labelSpan);
            item.appendChild(valueSpan);
            detailGrid.appendChild(item);
        }
        detailPanel.appendChild(detailGrid);
        return detailPanel;
    }

    var ENFERMERIA_GROUP_LABELS = {
        listo_para_citar: 'Listo para citar',
        denegado: 'Validación denegada · No citar',
        conflicto: 'Conflicto de reconciliación',
        sin_clasificar: 'Estado pendiente de clasificación'
    };

    function buildEnfermeriaCard(patient, groupKey, detailId) {
        var card = document.createElement('article');
        card.className = 'pending-validation-card';
        card.setAttribute('data-enf-cip', patient.cip);
        card.setAttribute('data-enf-estado', groupKey);
        card.setAttribute('data-pendientes-estado', groupKey);
        if (patient.solicitud_id) {
            card.setAttribute('data-pendientes-solicitud', patient.solicitud_id);
        }

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
        titleWrap.appendChild(title);
        titleWrap.appendChild(subtitle);
        var resolvedBadge = groupKey === 'listo_para_citar'
            ? { cls: 'ok', text: ENFERMERIA_GROUP_LABELS.listo_para_citar }
            : groupKey === 'denegado'
                ? { cls: 'blocked', text: ENFERMERIA_GROUP_LABELS.denegado }
                : groupKey === 'conflicto'
                    ? { cls: 'blocked', text: ENFERMERIA_GROUP_LABELS.conflicto }
                    : null;
        var badge = document.createElement('span');
        badge.className = 'status-badge status-badge--' + (resolvedBadge ? resolvedBadge.cls : (groupKey === 'ok_farmacia' ? 'ok' : groupKey === 'bloqueado' ? 'blocked' : groupKey === 'en_vigilancia' ? 'vigilance' : 'pending'));
        badge.textContent = resolvedBadge ? resolvedBadge.text : (groupKey === 'sin_clasificar'
            ? ENFERMERIA_GROUP_LABELS.sin_clasificar
            : (patient.estadoLabel || patient.estado_prebiologico_enfermeria || '—'));
        header.appendChild(titleWrap);
        header.appendChild(badge);
        card.appendChild(header);

        var body = document.createElement('div');
        body.className = 'pending-validation-card__body';
        body.appendChild(buildPendingMeta('fa-hospital', 'Servicio: ' + textOrDash(patient.servicio || patient.servicio_origen)));
        body.appendChild(buildPendingMeta('fa-stethoscope', 'Patología: ' + textOrDash(patient.patologia || patient.patologia_indicacion)));
        body.appendChild(buildPendingMeta('fa-pills', 'Fármaco: ' + textOrDash(patient.farmaco || patient.farmaco_solicitado)));
        body.appendChild(buildPendingMeta('fa-database', 'Origen: Excel Enfermería'));
        if (patient.fecha_ok_farmacia) {
            body.appendChild(buildPendingMeta('fa-calendar-check', 'Fecha OK Farmacia: ' + patient.fecha_ok_farmacia));
        }
        if (patient.solicitud_id) {
            body.appendChild(buildPendingMeta('fa-fingerprint', 'solicitud_id: ' + patient.solicitud_id));
        }
        var rec = patient.reconciliacion_fh;
        if (rec && rec.reconciliable && rec.estado === 'READY_TO_CITE') {
            body.appendChild(buildPendingMeta('fa-check-double', 'Validación FH: ' + rec.terminales.join(' + ') + ' · ' + rec.solicitud_id));
        } else if (rec && rec.reconciliable && rec.estado === 'DENIED_DO_NOT_CITE') {
            body.appendChild(buildPendingMeta('fa-ban', 'Validación FH denegada · No citar · ' + rec.solicitud_id));
        } else if (rec && rec.reconciliable && rec.estado === 'RECONCILIATION_CONFLICT') {
            body.appendChild(buildPendingMeta('fa-exclamation-circle', 'Terminales incompatibles: ' + rec.terminales.join(' + ') + ' · ' + rec.solicitud_id + ' · No accionable'));
        }
        if (rec && rec.inconsistencia) {
            body.appendChild(buildPendingMeta('fa-exclamation-triangle', 'Incidencia de reconciliación: validación FH terminal con Enfermería no OK FARMACIA · No accionable'));
        }
        card.appendChild(body);

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

        if (patient.observaciones_prebiologico) {
            var obsRow = document.createElement('div');
            obsRow.className = 'pending-validation-card__meta';
            obsRow.style.fontStyle = 'italic';
            obsRow.textContent = 'Observación: ' + patient.observaciones_prebiologico;
            card.appendChild(obsRow);
        }

        var detailPanel = buildEnfermeriaDetailPanel(patient, detailId);
        card.appendChild(detailPanel);

        var actions = document.createElement('div');
        actions.className = 'pending-validation-card__actions';
        if (groupKey === 'ok_farmacia') {
            var link = buildValidationLink(patient);
            link.setAttribute('data-enf-action', 'validar');
            actions.appendChild(link);
        } else {
            actions.appendChild(buildDetailToggle(patient, detailPanel, groupKey));
        }
        card.appendChild(actions);

        return card;
    }

    function buildGeneralCard(patient) {
        var card = document.createElement('article');
        card.className = 'pending-validation-card';
        card.setAttribute('data-pendientes-estado', 'general');
        card.setAttribute('data-pendientes-cip', patient.cip || '');

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
        titleWrap.appendChild(title);
        titleWrap.appendChild(subtitle);
        var badge = document.createElement('span');
        badge.className = 'status-badge status-badge--pending';
        badge.textContent = 'Pendiente de validación';
        header.appendChild(titleWrap);
        header.appendChild(badge);
        card.appendChild(header);

        var body = document.createElement('div');
        body.className = 'pending-validation-card__body';
        body.appendChild(buildPendingMeta('fa-hospital', 'Servicio origen: ' + textOrDash(patient.servicio)));
        body.appendChild(buildPendingMeta('fa-stethoscope', 'Patología / indicación: ' + textOrDash(patient.patologia || patient.motivoClinico)));
        body.appendChild(buildPendingMeta('fa-pills', 'Fármaco / tratamiento: ' + textOrDash(patient.farmaco || patient.principioActivo)));
        body.appendChild(buildPendingMeta('fa-calendar-alt', 'Fecha solicitud: ' + textOrDash(patient.fechaSolicitud || patient.ultimaSolicitud)));
        if (hasProvenanceSource(patient)) {
            body.appendChild(buildPendingMeta('fa-database', 'Origen: ' + String(patient.importSource)));
        }
        card.appendChild(body);

        card.appendChild(buildPrebioBlock(patient));

        var actions = document.createElement('div');
        actions.className = 'pending-validation-card__actions';
        actions.appendChild(buildValidationLink(patient));
        card.appendChild(actions);

        return card;
    }

    function renderSummary(mount, summary) {
        F.clearChildren(mount);
        var values = { total: summary.total, listas: summary.listas, vigilancia: summary.vigilancia, bloqueadas: summary.bloqueadas };
        for (var i = 0; i < SUMMARY_CARDS.length; i++) {
            mount.appendChild(buildSummaryCard(SUMMARY_CARDS[i], values[SUMMARY_CARDS[i].key]));
        }
    }

    function renderQueue(panel, queue, trayEKeys) {
        F.clearChildren(panel);

        if (!queue.length) {
            var emptyMsg = document.createElement('p');
            emptyMsg.className = 'actividad-panel__empty';
            emptyMsg.textContent = QUEUE_EMPTY_TEXT;
            panel.appendChild(emptyMsg);
            return;
        }

        var grid = document.createElement('div');
        grid.className = 'enfermeria-card-grid';
        grid.setAttribute('data-pendientes-grid', 'solicitudes');

        for (var i = 0; i < queue.length; i++) {
            var patient = queue[i];
            /* Frontera tray-E en el tipo de tarjeta: filas tray-E =
               tarjeta Enfermeria; resto de la cola = tarjeta general
               (una fila solo tray-G con importSource Enfermeria-ish
               nunca recibe la tarjeta Enfermeria ni su Origen
               hardcodeado). */
            if (isTrayERow(patient, trayEKeys)) {
                grid.appendChild(buildEnfermeriaCard(patient, classifyPendienteState(patient), 'pendientesDetalle_' + i));
            } else {
                grid.appendChild(buildGeneralCard(patient));
            }
        }

        panel.appendChild(grid);
    }

    function renderAll() {
        var summaryMount = document.getElementById('actividadCards');
        var panel = document.getElementById('actividadPendientesPanel');
        if (!summaryMount || !panel || !F) return;
        var queue = readSolicitudesQueue();
        renderSummary(summaryMount, countSummary(queue.queue, queue.trayEKeys));
        renderQueue(panel, queue.queue, queue.trayEKeys);
    }

    document.addEventListener('DOMContentLoaded', function () {
        renderAll();
        document.addEventListener('farmacia:data-imported', renderAll);
    });
})();
