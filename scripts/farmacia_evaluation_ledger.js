(function () {
    "use strict";

    var STORAGE_KEY = "promueve.fh.synthetic-evaluation-ledger.v1";
    var SCHEMA_VERSION = "1.0.0";
    var MAX_STORAGE_CHARS = 4500000;
    var memoryLedger = null;
    var restoredEvent = null;
    var activeSourceEventId = "";
    var activePatientId = "";

    function clone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function emptyLedger() {
        return {
            schema_version: SCHEMA_VERSION,
            ledger_type: "synthetic_local_evaluation",
            updated_at: "",
            events: []
        };
    }

    function normalizeLedger(value) {
        var source = value && typeof value === "object" ? value : {};
        var events = Array.isArray(source.events) ? source.events.filter(function (event) {
            return event && typeof event === "object" && event.event_id && event.patient_id;
        }) : [];
        return {
            schema_version: SCHEMA_VERSION,
            ledger_type: "synthetic_local_evaluation",
            updated_at: String(source.updated_at || ""),
            events: events
        };
    }

    function safeStorage() {
        try {
            if (!window.localStorage) return null;
            var probe = STORAGE_KEY + ".probe";
            window.localStorage.setItem(probe, "1");
            window.localStorage.removeItem(probe);
            return window.localStorage;
        } catch (error) {
            return null;
        }
    }

    function loadLedger() {
        var storage = safeStorage();
        if (!storage) return normalizeLedger(memoryLedger || emptyLedger());
        try {
            var raw = storage.getItem(STORAGE_KEY);
            return normalizeLedger(raw ? JSON.parse(raw) : emptyLedger());
        } catch (error) {
            return emptyLedger();
        }
    }

    function persistLedger(ledger) {
        var normalized = normalizeLedger(ledger);
        normalized.updated_at = new Date().toISOString();
        var serialized = JSON.stringify(normalized);
        if (serialized.length > MAX_STORAGE_CHARS) {
            throw new Error("El registro local ha alcanzado su límite. Descarga el libro de evaluación y elimina actos antiguos antes de continuar.");
        }
        var storage = safeStorage();
        if (storage) storage.setItem(STORAGE_KEY, serialized);
        else memoryLedger = clone(normalized);
        document.dispatchEvent(new CustomEvent("farmacia:evaluation-ledger-changed", {
            detail: { event_count: normalized.events.length, persistent: Boolean(storage) }
        }));
        return clone(normalized);
    }

    function text(value) {
        return value === null || value === undefined ? "" : String(value).trim();
    }

    function normalizeCip(value) {
        return text(value).replace(/\s+/g, " ").toUpperCase();
    }

    function hashSyntheticCip(value) {
        var input = normalizeCip(value);
        var hash = 2166136261;
        for (var index = 0; index < input.length; index += 1) {
            hash ^= input.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
    }

    function patientIdForCip(cip) {
        var normalized = normalizeCip(cip);
        return normalized ? "SYN-PAT-" + hashSyntheticCip(normalized) : "";
    }

    function randomId(prefix) {
        var id = "";
        try {
            if (window.crypto && typeof window.crypto.randomUUID === "function") id = window.crypto.randomUUID();
        } catch (error) { id = ""; }
        if (!id) id = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
        return prefix + "-" + id.toUpperCase();
    }

    function eventSort(a, b) {
        return String(b.recorded_at || "").localeCompare(String(a.recorded_at || ""));
    }

    function listEvents(filters) {
        var options = filters || {};
        return loadLedger().events.filter(function (event) {
            if (options.patient_id && event.patient_id !== options.patient_id) return false;
            if (options.synthetic_cip && normalizeCip(event.synthetic_cip) !== normalizeCip(options.synthetic_cip)) return false;
            if (options.event_type && event.event_type !== options.event_type) return false;
            return true;
        }).sort(eventSort).map(clone);
    }

    function getEvent(eventId) {
        var id = text(eventId);
        var found = loadLedger().events.find(function (event) { return event.event_id === id; });
        return found ? clone(found) : null;
    }

    function saveEvent(input) {
        var data = input && typeof input === "object" ? input : {};
        var cip = normalizeCip(data.synthetic_cip);
        if (!data.synthetic_acknowledged) throw new Error("Confirma que el registro contiene exclusivamente datos ficticios.");
        if (!cip) throw new Error("Introduce un CIP ficticio no vacío antes de guardar el acto.");
        var patientId = data.patient_id || patientIdForCip(cip);
        var eventType = text(data.event_type);
        if (!eventType) throw new Error("No se ha definido el tipo de acto a guardar.");
        var now = new Date().toISOString();
        var sourceEventId = text(data.source_event_id) || [eventType, patientId, text(data.occurred_on || now.slice(0, 10))].join(":");
        var ledger = loadLedger();
        var existingIndex = ledger.events.findIndex(function (event) { return event.source_event_id === sourceEventId; });
        var existing = existingIndex >= 0 ? ledger.events[existingIndex] : null;
        var event = {
            schema_version: SCHEMA_VERSION,
            event_id: existing ? existing.event_id : randomId("SYN-EVT"),
            source_event_id: sourceEventId,
            event_type: eventType,
            patient_id: patientId,
            synthetic_cip: cip,
            occurred_on: text(data.occurred_on) || now.slice(0, 10),
            recorded_at: now,
            created_at: existing ? existing.created_at : now,
            service_code: text(data.service_code),
            service_label: text(data.service_label),
            pathology_code: text(data.pathology_code),
            pathology_label: text(data.pathology_label),
            visit_id: text(data.visit_id) || (existing ? existing.visit_id : randomId("SYN-VIS")),
            line_ids: Array.isArray(data.line_ids) ? data.line_ids.map(text).filter(Boolean) : [],
            source_page: text(data.source_page),
            record_status: text(data.record_status) || "draft",
            payload: clone(data.payload || {}),
            provenance: {
                mode: "synthetic_local_evaluation",
                storage: safeStorage() ? "browser_local_storage" : "memory_fallback",
                app_context: text(data.app_context),
                warning: "Datos exclusivamente ficticios. No usar para asistencia clínica real."
            },
            quality_flags: Array.isArray(data.quality_flags) ? data.quality_flags.map(text).filter(Boolean) : []
        };
        if (existingIndex >= 0) ledger.events[existingIndex] = event;
        else ledger.events.push(event);
        persistLedger(ledger);
        return { event: clone(event), created: existingIndex < 0 };
    }

    function removeEvent(eventId) {
        var ledger = loadLedger();
        var before = ledger.events.length;
        ledger.events = ledger.events.filter(function (event) { return event.event_id !== eventId; });
        if (ledger.events.length !== before) persistLedger(ledger);
        return ledger.events.length !== before;
    }

    function removePatient(patientId) {
        var ledger = loadLedger();
        var before = ledger.events.length;
        ledger.events = ledger.events.filter(function (event) { return event.patient_id !== patientId; });
        if (ledger.events.length !== before) persistLedger(ledger);
        return before - ledger.events.length;
    }

    function clearAll() {
        var storage = safeStorage();
        if (storage) storage.removeItem(STORAGE_KEY);
        memoryLedger = emptyLedger();
        document.dispatchEvent(new CustomEvent("farmacia:evaluation-ledger-changed", {
            detail: { event_count: 0, persistent: Boolean(storage) }
        }));
    }

    function controlKey(control) {
        if (control.id) return { kind: "id", value: control.id };
        if (control.name) return { kind: "name", value: control.name };
        return null;
    }

    function captureFormState(root) {
        var scope = root || document.querySelector("main.main-content") || document;
        var controls = Array.from(scope.querySelectorAll("input, select, textarea"));
        return controls.filter(function (control) {
            var type = String(control.type || "").toLowerCase();
            return controlKey(control) && type !== "file" && type !== "button" && type !== "submit" && type !== "reset" && !control.closest("[data-ledger-ignore]");
        }).map(function (control) {
            var key = controlKey(control);
            var type = String(control.type || "").toLowerCase();
            var entry = {
                key_kind: key.kind,
                key: key.value,
                tag: control.tagName,
                type: type,
                disabled: Boolean(control.disabled),
                visible: !Boolean(control.closest(".hidden"))
            };
            if (type === "checkbox" || type === "radio") {
                entry.value = control.value;
                entry.checked = Boolean(control.checked);
            } else if (control.multiple) {
                entry.value = Array.from(control.selectedOptions || []).map(function (option) { return option.value; });
            } else {
                entry.value = control.value;
            }
            return entry;
        });
    }

    function controlsForEntry(entry, root) {
        var scope = root || document;
        if (entry.key_kind === "id") {
            var byId = document.getElementById(entry.key);
            return byId ? [byId] : [];
        }
        return Array.from(scope.querySelectorAll("[name]")).filter(function (control) {
            if (control.name !== entry.key) return false;
            var type = String(control.type || "").toLowerCase();
            if ((type === "checkbox" || type === "radio") && entry.value !== undefined) return String(control.value) === String(entry.value);
            return true;
        });
    }

    function applyEntry(entry, root) {
        controlsForEntry(entry, root).forEach(function (control) {
            var type = String(control.type || "").toLowerCase();
            if (type === "checkbox" || type === "radio") {
                if (entry.key_kind === "name" && entry.value !== undefined) control.checked = Boolean(entry.checked) && String(control.value) === String(entry.value);
                else control.checked = Boolean(entry.checked);
            } else if (control.multiple && Array.isArray(entry.value)) {
                Array.from(control.options || []).forEach(function (option) { option.selected = entry.value.indexOf(option.value) !== -1; });
            } else if (entry.value !== undefined && entry.value !== null) {
                control.value = entry.value;
            }
            control.dispatchEvent(new Event("input", { bubbles: true }));
            control.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }

    function restoreFormState(entries, root) {
        var state = Array.isArray(entries) ? entries : [];
        var priorityIds = ["fhOrigenEntrada", "fhServicioManual", "fhPatologiaManual", "fhPvServicio", "fhPvPatologia", "fhSegServicio", "fhSegPatologia"];
        var priority = state.filter(function (entry) { return entry.key_kind === "id" && priorityIds.indexOf(entry.key) !== -1; });
        var rest = state.filter(function (entry) { return priority.indexOf(entry) === -1; });
        priority.forEach(function (entry) { applyEntry(entry, root); });
        return new Promise(function (resolve) {
            window.setTimeout(function () {
                rest.forEach(function (entry) { applyEntry(entry, root); });
                window.setTimeout(resolve, 50);
            }, 50);
        });
    }

    function firstControl(selectors) {
        var fallback = null;
        for (var index = 0; index < selectors.length; index += 1) {
            var control = document.querySelector(selectors[index]);
            if (!control || !text(control.value || control.textContent)) continue;
            if (!control.closest(".hidden")) return control;
            if (!fallback) fallback = control;
        }
        return fallback;
    }

    function valueAndLabel(selectors) {
        var control = firstControl(selectors);
        if (!control) return { value: "", label: "" };
        var value = text(control.value || control.textContent);
        var label = value;
        if (control.options && control.selectedIndex >= 0 && control.options[control.selectedIndex]) {
            label = text(control.options[control.selectedIndex].textContent || control.options[control.selectedIndex].text) || value;
        }
        return { value: value, label: label };
    }

    function safeCall(fn, fallback) {
        try { return typeof fn === "function" ? clone(fn()) : clone(fallback); }
        catch (error) { return clone(fallback); }
    }

    function pageConfig() {
        var page = location.pathname.split("/").pop() || "farmacia_index.html";
        if (page === "farmacia_validacion.html") return {
            event_type: "pharmacy_validation",
            cip: ["#fhManualCip", "#fhDermaCip", "#fhDigCip", "#fhReumaCip"],
            service: ["#fhServicioManual", "#fhDermaServicioOrigen", "#fhDigServicioOrigen"],
            pathology: ["#fhPatologiaManual", "#fhDermaPatologia", "#fhDigPatologia", "#fhReumaPatologia"],
            occurred: ["#fhManualFecha", "#fhDermaFecha", "#fhDigFecha", "#fhReumaFecha"],
            notice: "#fhValDemoNotice"
        };
        if (page === "farmacia_primera_visita.html") return {
            event_type: "pharmacy_first_visit",
            cip: ["#fhPvCip"], service: ["#fhPvServicio"], pathology: ["#fhPvPatologia"], occurred: ["#fhPvFecha"], notice: "#fhPvDemoNotice"
        };
        if (page === "farmacia_seguimiento.html") return {
            event_type: "pharmacy_follow_up",
            cip: ["#fhSegCip"], service: ["#fhSegServicio"], pathology: ["#fhSegPatologia"], occurred: ["#fhSegFecha"], notice: "#fhSegDemoNotice"
        };
        if (page === "farmacia_index.html" || page === "index.html" || page === "") return { event_type: "index" };
        return null;
    }

    function collectDomainPayload(config, cip) {
        if (config.event_type === "pharmacy_validation") {
            var validation = window.FarmaciaValidacion || {};
            return {
                validation_export_data: safeCall(validation.buildValidationExcelExportData, {}),
                derma_clinical_summary: safeCall(validation.buildDermaClinicalSummary, {}),
                jara_lines: safeCall(validation.buildValidationLines, [])
            };
        }
        if (config.event_type === "pharmacy_first_visit") {
            var firstVisit = window.FarmaciaPrimeraVisita || {};
            return { primary_treatment: safeCall(firstVisit.getCurrentPrimaryTreatment, {}) };
        }
        if (config.event_type === "pharmacy_follow_up") {
            var followUp = window.FarmaciaSeguimiento || {};
            return {
                current_visit: safeCall(followUp.getCurrentVisit, null),
                selected_line: safeCall(followUp.getSelectedLine, null),
                canonical_lines: safeCall(function () { return followUp.getCanonicalLinesForPatient ? followUp.getCanonicalLinesForPatient({ cip: cip }) : []; }, []),
                related_treatments: safeCall(followUp.getFollowupOtherDrugs, []),
                adverse_event: safeCall(followUp.captureCommonAdverseEvent, null)
            };
        }
        return {};
    }

    function extractLineIds(domain) {
        var result = [];
        function add(value) { var normalized = text(value); if (normalized && result.indexOf(normalized) === -1) result.push(normalized); }
        if (domain && domain.primary_treatment) add(domain.primary_treatment.line_id);
        if (domain && domain.selected_line) add(domain.selected_line.line_id || domain.selected_line.id);
        if (domain && Array.isArray(domain.canonical_lines)) domain.canonical_lines.forEach(function (line) { add(line && (line.line_id || line.id)); });
        return result;
    }

    function recordStatus(config, domain) {
        if (config.event_type === "pharmacy_validation") {
            var status = domain && domain.validation_export_data ? domain.validation_export_data.estadoRegistro : "";
            return text(status) || "draft";
        }
        return "recorded";
    }

    function sourceEventId(config, patientId, occurredOn, domain) {
        var suffix = occurredOn;
        if (domain && domain.current_visit && domain.current_visit.visit_id) suffix = domain.current_visit.visit_id;
        return [config.event_type, patientId, suffix || "undated"].join(":");
    }

    function eventPage(event) {
        if (event.event_type === "pharmacy_validation") return "farmacia_validacion.html";
        if (event.event_type === "pharmacy_first_visit") return "farmacia_primera_visita.html";
        return "farmacia_seguimiento.html";
    }

    function eventUrl(event) {
        var query = new URLSearchParams();
        query.set("ledger_event_id", event.event_id);
        query.set("cip", event.synthetic_cip || "");
        if (event.service_code) query.set("servicio", event.service_code);
        if (event.pathology_code) query.set("patologia", event.pathology_code);
        query.set("entrada", "ledger");
        return eventPage(event) + "?" + query.toString();
    }

    function createElement(tag, className, content) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (content !== undefined) node.textContent = content;
        return node;
    }

    function setStatus(node, message, kind) {
        node.textContent = message;
        node.className = "evaluation-ledger-status" + (kind ? " evaluation-ledger-status--" + kind : "");
    }

    function injectWorkflowPanel(config) {
        var main = document.querySelector("main.main-content");
        if (!main || document.getElementById("fhEvaluationLedgerPanel")) return;
        var panel = createElement("section", "dashboard-card evaluation-ledger-card");
        panel.id = "fhEvaluationLedgerPanel";
        panel.setAttribute("data-ledger-ignore", "true");
        panel.appendChild(createElement("h2", "section-title", "Registro local de evaluación ficticia"));
        panel.appendChild(createElement("p", "hero-description", "Guarda este acto en este navegador para recuperarlo después. No se sincroniza, no es persistencia clínica y puede perderse al borrar los datos del navegador."));
        var consentLabel = createElement("label", "evaluation-ledger-consent");
        var consent = document.createElement("input");
        consent.type = "checkbox";
        consent.id = "fhEvaluationLedgerSyntheticConfirm";
        consentLabel.appendChild(consent);
        consentLabel.appendChild(document.createTextNode(" Confirmo que este registro contiene exclusivamente datos ficticios."));
        panel.appendChild(consentLabel);
        var actions = createElement("div", "evaluation-ledger-actions");
        var save = createElement("button", "btn btn-primary", "Guardar acto ficticio");
        save.type = "button";
        save.id = "fhEvaluationLedgerSave";
        save.disabled = true;
        actions.appendChild(save);
        var back = createElement("a", "btn btn-outline", "Ver cohorte ficticia local");
        back.href = "farmacia_index.html#fhEvaluationLedgerIndex";
        actions.appendChild(back);
        panel.appendChild(actions);
        var persistentStorage = Boolean(safeStorage());
        var status = createElement("p", "evaluation-ledger-status", persistentStorage
            ? "Pendiente de confirmación."
            : "Este navegador bloquea el almacenamiento local; no es posible conservar actos entre páginas.");
        status.id = "fhEvaluationLedgerStatus";
        status.setAttribute("role", "status");
        if (!persistentStorage) status.classList.add("evaluation-ledger-status--error");
        panel.appendChild(status);
        var hero = main.querySelector(".patient-header-card");
        if (hero && hero.parentNode) hero.parentNode.insertBefore(panel, hero.nextSibling);
        else main.appendChild(panel);

        function refreshAvailability() {
            var cipControl = firstControl(config.cip);
            save.disabled = !persistentStorage || !consent.checked || !cipControl || !normalizeCip(cipControl.value);
        }
        consent.addEventListener("change", refreshAvailability);
        main.addEventListener("input", refreshAvailability);
        main.addEventListener("change", refreshAvailability);
        refreshAvailability();

        save.addEventListener("click", function () {
            try {
                var cipPair = valueAndLabel(config.cip);
                var service = valueAndLabel(config.service);
                var pathology = valueAndLabel(config.pathology);
                var occurred = valueAndLabel(config.occurred);
                var patientId = patientIdForCip(cipPair.value);
                var domain = collectDomainPayload(config, cipPair.value);
                var sourceId = restoredEvent && restoredEvent.event_type === config.event_type && normalizeCip(restoredEvent.synthetic_cip) === normalizeCip(cipPair.value)
                    ? restoredEvent.source_event_id
                    : (activePatientId === patientId ? activeSourceEventId : "");
                if (!sourceId) sourceId = [config.event_type, patientId, randomId("SYN-SRC")].join(":");
                activeSourceEventId = sourceId;
                activePatientId = patientId;
                var result = saveEvent({
                    synthetic_acknowledged: consent.checked,
                    event_type: config.event_type,
                    patient_id: patientId,
                    synthetic_cip: cipPair.value,
                    occurred_on: occurred.value,
                    service_code: service.value,
                    service_label: service.label,
                    pathology_code: pathology.value,
                    pathology_label: pathology.label,
                    visit_id: domain && domain.current_visit ? domain.current_visit.visit_id : "",
                    line_ids: extractLineIds(domain),
                    source_event_id: sourceId,
                    source_page: location.pathname.split("/").pop(),
                    record_status: recordStatus(config, domain),
                    app_context: document.querySelector(".sidebar-footer") ? document.querySelector(".sidebar-footer").textContent : "",
                    payload: { form_state: captureFormState(main), domain: domain }
                });
                setStatus(status, result.created ? "Acto ficticio guardado en este navegador." : "Acto ficticio actualizado sin crear un duplicado.", "success");
            } catch (error) {
                setStatus(status, error.message || String(error), "error");
            }
        });
    }

    function patientGroups() {
        var groups = {};
        listEvents().forEach(function (event) {
            if (!groups[event.patient_id]) groups[event.patient_id] = { patient_id: event.patient_id, synthetic_cip: event.synthetic_cip, events: [] };
            groups[event.patient_id].events.push(event);
        });
        return Object.keys(groups).map(function (key) {
            groups[key].events.sort(eventSort);
            groups[key].last = groups[key].events[0];
            return groups[key];
        }).sort(function (a, b) { return eventSort(a.last, b.last); });
    }

    function eventTypeLabel(type) {
        if (type === "pharmacy_validation") return "Validación";
        if (type === "pharmacy_first_visit") return "Primera Visita";
        return "Seguimiento";
    }

    function recordedLabel(value) {
        var normalized = text(value);
        return normalized ? normalized.replace("T", " ").slice(0, 16) : "sin fecha";
    }

    function renderIndexPanel() {
        var main = document.querySelector("main.main-content");
        if (!main) return;
        var panel = document.getElementById("fhEvaluationLedgerIndex");
        if (!panel) {
            panel = createElement("section", "dashboard-card evaluation-ledger-index");
            panel.id = "fhEvaluationLedgerIndex";
            panel.setAttribute("data-ledger-ignore", "true");
            var searchCard = main.querySelector(".search-card");
            if (searchCard && searchCard.parentNode) searchCard.parentNode.insertBefore(panel, searchCard.nextSibling);
            else main.appendChild(panel);
        }
        while (panel.firstChild) panel.removeChild(panel.firstChild);
        var header = createElement("div", "evaluation-ledger-index__header");
        var titleWrap = createElement("div");
        titleWrap.appendChild(createElement("h2", "section-title", "Cohorte ficticia local"));
        titleWrap.appendChild(createElement("p", "hero-description", "Actos guardados únicamente en este navegador. No usar datos reales ni interpretar esta lista como historia clínica."));
        header.appendChild(titleWrap);
        var clear = createElement("button", "btn btn-outline", "Vaciar cohorte ficticia");
        clear.type = "button";
        clear.id = "fhEvaluationLedgerClearAll";
        clear.addEventListener("click", function () {
            if (!window.confirm("¿Eliminar todos los actos ficticios guardados en este navegador?")) return;
            clearAll();
            renderIndexPanel();
        });
        header.appendChild(clear);
        panel.appendChild(header);
        var groups = patientGroups();
        var summary = createElement("p", "evaluation-ledger-summary", groups.length + " pacientes ficticios · " + listEvents().length + " actos guardados");
        panel.appendChild(summary);
        if (!groups.length) {
            panel.appendChild(createElement("div", "empty-state", "Todavía no hay actos ficticios guardados en este navegador."));
            clear.disabled = true;
            return;
        }
        var list = createElement("div", "evaluation-ledger-patients");
        groups.forEach(function (group) {
            var card = createElement("article", "evaluation-ledger-patient");
            var cardHeader = createElement("div", "evaluation-ledger-patient__header");
            var identity = createElement("div");
            identity.appendChild(createElement("strong", "evaluation-ledger-patient__cip", group.synthetic_cip));
            identity.appendChild(createElement("span", "evaluation-ledger-patient__meta", group.patient_id + " · " + group.events.length + " actos · última actualización: " + recordedLabel(group.last.recorded_at)));
            cardHeader.appendChild(identity);
            var actions = createElement("div", "evaluation-ledger-actions");
            var open = createElement("a", "btn btn-sm btn-primary", "Abrir último acto");
            open.href = eventUrl(group.last);
            actions.appendChild(open);
            var remove = createElement("button", "btn btn-sm btn-outline", "Eliminar paciente ficticio");
            remove.type = "button";
            remove.addEventListener("click", function () {
                if (!window.confirm("¿Eliminar los actos ficticios de " + group.synthetic_cip + "?")) return;
                removePatient(group.patient_id);
                renderIndexPanel();
            });
            actions.appendChild(remove);
            cardHeader.appendChild(actions);
            card.appendChild(cardHeader);
            var events = createElement("ul", "evaluation-ledger-events");
            group.events.forEach(function (event) {
                var item = createElement("li", "evaluation-ledger-event");
                var link = createElement("a", "evaluation-ledger-event__link", eventTypeLabel(event.event_type) + " · " + (event.occurred_on || "sin fecha") + " · " + (event.record_status || "draft"));
                link.href = eventUrl(event);
                item.appendChild(link);
                events.appendChild(item);
            });
            card.appendChild(events);
            list.appendChild(card);
        });
        panel.appendChild(list);
    }

    function restoreRequestedEvent(config) {
        var eventId = new URLSearchParams(location.search).get("ledger_event_id");
        if (!eventId) return;
        var event = getEvent(eventId);
        var status = document.getElementById("fhEvaluationLedgerStatus");
        if (!event || event.event_type !== config.event_type) {
            if (status) setStatus(status, "No se ha encontrado un acto compatible para restaurar.", "error");
            return;
        }
        restoredEvent = event;
        activeSourceEventId = event.source_event_id;
        activePatientId = event.patient_id;
        restoreFormState(event.payload && event.payload.form_state, document.querySelector("main.main-content")).then(function () {
            if (status) setStatus(status, "Acto ficticio restaurado. Revisa los campos antes de guardar una actualización.", "success");
        });
    }

    function init() {
        var config = pageConfig();
        if (!config) return;
        if (config.event_type === "index") {
            renderIndexPanel();
            document.addEventListener("farmacia:evaluation-ledger-changed", renderIndexPanel);
            return;
        }
        injectWorkflowPanel(config);
        restoreRequestedEvent(config);
    }

    window.FarmaciaEvaluationLedger = Object.freeze({
        storageKey: STORAGE_KEY,
        schemaVersion: SCHEMA_VERSION,
        load: loadLedger,
        saveEvent: saveEvent,
        listEvents: listEvents,
        getEvent: getEvent,
        removeEvent: removeEvent,
        removePatient: removePatient,
        clearAll: clearAll,
        patientIdForCip: patientIdForCip,
        captureFormState: captureFormState,
        restoreFormState: restoreFormState,
        eventUrl: eventUrl
    });

    document.addEventListener("DOMContentLoaded", function () { window.setTimeout(init, 100); });
})();
