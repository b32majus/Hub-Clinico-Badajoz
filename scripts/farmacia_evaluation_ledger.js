(function () {
    "use strict";

    var STORAGE_KEY = "promueve.fh.synthetic-evaluation-ledger.v1";
    var SCHEMA_VERSION = "1.0.0";
    var MAX_STORAGE_CHARS = 4500000;
    var memoryLedger = null;
    var memoryFallbackActive = false;
    var lastPersistenceMode = "uninitialized";
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
        if (memoryFallbackActive) {
            lastPersistenceMode = "memory_fallback";
            return normalizeLedger(memoryLedger || emptyLedger());
        }
        var storage = safeStorage();
        if (!storage) {
            memoryFallbackActive = true;
            lastPersistenceMode = "memory_fallback";
            return normalizeLedger(memoryLedger || emptyLedger());
        }
        try {
            var raw = storage.getItem(STORAGE_KEY);
            lastPersistenceMode = "browser_local_storage";
            return normalizeLedger(raw ? JSON.parse(raw) : emptyLedger());
        } catch (error) {
            memoryFallbackActive = true;
            lastPersistenceMode = "memory_fallback";
            return normalizeLedger(memoryLedger || emptyLedger());
        }
    }

    function persistLedger(ledger) {
        var normalized = normalizeLedger(ledger);
        normalized.updated_at = new Date().toISOString();
        var serialized = JSON.stringify(normalized);
        if (serialized.length > MAX_STORAGE_CHARS) {
            throw new Error("El almacenamiento local ha alcanzado su límite. Este acto no podrá conservarse al recargar.");
        }
        var storage = memoryFallbackActive ? null : safeStorage();
        var persistent = false;
        if (storage) {
            try {
                storage.setItem(STORAGE_KEY, serialized);
                persistent = true;
                lastPersistenceMode = "browser_local_storage";
            } catch (error) {
                memoryFallbackActive = true;
                memoryLedger = clone(normalized);
                lastPersistenceMode = "memory_fallback";
            }
        } else {
            memoryFallbackActive = true;
            memoryLedger = clone(normalized);
            lastPersistenceMode = "memory_fallback";
        }
        document.dispatchEvent(new CustomEvent("farmacia:evaluation-ledger-changed", {
            detail: { event_count: normalized.events.length, persistent: persistent, persistence_mode: lastPersistenceMode }
        }));
        return { ledger: clone(normalized), persistent: persistent, persistence_mode: lastPersistenceMode };
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
        var persistence = persistLedger(ledger);
        event.provenance.storage = persistence.persistence_mode;
        if (!persistence.persistent && memoryLedger) {
            var memoryEvent = memoryLedger.events.find(function (item) { return item.event_id === event.event_id; });
            if (memoryEvent && memoryEvent.provenance) memoryEvent.provenance.storage = persistence.persistence_mode;
        }
        return {
            event: clone(event),
            created: existingIndex < 0,
            persistent: persistence.persistent,
            persistence_mode: persistence.persistence_mode
        };
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

    function controlLabel(control) {
        if (!control) return "";
        var label = null;
        if (control.id) {
            label = Array.from(document.querySelectorAll("label[for]")).find(function (candidate) {
                return candidate.getAttribute("for") === control.id;
            }) || null;
        }
        if (!label && control.closest) {
            var group = control.closest(".form-group");
            if (group) label = group.querySelector("label");
        }
        return text(label ? label.textContent : "");
    }

    function captureFormState(root) {
        var scope = root || document.querySelector("main.main-content") || document;
        var controls = Array.from(scope.querySelectorAll("input, select, textarea")).filter(function (control) {
            var type = String(control.type || "").toLowerCase();
            return controlKey(control) && type !== "file" && type !== "button" && type !== "submit" && type !== "reset" && !control.closest("[data-ledger-ignore]");
        });
        var nameOrdinals = {};
        return controls.map(function (control) {
            var key = controlKey(control);
            var type = String(control.type || "").toLowerCase();
            var entry = {
                key_kind: key.kind,
                key: key.value,
                tag: control.tagName,
                type: type,
                label: controlLabel(control),
                disabled: Boolean(control.disabled),
                visible: !Boolean(control.closest(".hidden"))
            };
            if (key.kind === "name") {
                entry.name_index = nameOrdinals[key.value] || 0;
                nameOrdinals[key.value] = entry.name_index + 1;
            }
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
        var namedControls = Array.from(scope.querySelectorAll("[name]")).filter(function (control) {
            return control.name === entry.key;
        });
        if (Number.isInteger(entry.name_index) && entry.name_index >= 0 && namedControls[entry.name_index]) {
            return [namedControls[entry.name_index]];
        }
        return namedControls.filter(function (control) {
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
            notice: "#fhValDemoNotice",
            outputs: ["fhValExportTxt", "fhValExcelExportBtn"]
        };
        if (page === "farmacia_primera_visita.html") return {
            event_type: "pharmacy_first_visit", cip: ["#fhPvCip"], service: ["#fhPvServicio"], pathology: ["#fhPvPatologia"],
            occurred: ["#fhPvFecha"], notice: "#fhPvDemoNotice", outputs: ["fhPvExportTxt", "fhPvExcelExportBtn"]
        };
        if (page === "farmacia_seguimiento.html") return {
            event_type: "pharmacy_follow_up", cip: ["#fhSegCip"], service: ["#fhSegServicio"], pathology: ["#fhSegPatologia"],
            occurred: ["#fhSegFecha"], notice: "#fhSegDemoNotice", outputs: ["fhSegExportTxt", "fhSegExportCsv", "fhSegExcelExportBtn"]
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
                canonical_lines: safeCall(function () {
                    if (followUp.getCurrentCanonicalLines) return followUp.getCurrentCanonicalLines();
                    return followUp.getCanonicalLinesForPatient ? followUp.getCanonicalLinesForPatient({ cip: cip }) : [];
                }, []),
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
        if (domain && domain.selected_line) add(domain.selected_line.linea_id || domain.selected_line.line_id || domain.selected_line.id);
        if (domain && Array.isArray(domain.canonical_lines)) domain.canonical_lines.forEach(function (line) { add(line && (line.linea_id || line.line_id || line.id)); });
        return result;
    }

    function recordStatus(config, domain) {
        if (config.event_type === "pharmacy_validation") {
            var status = domain && domain.validation_export_data ? domain.validation_export_data.estadoRegistro : "";
            return text(status) || "draft";
        }
        return "recorded";
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
        if (!node) return;
        node.textContent = message;
        node.className = "evaluation-ledger-status" + (kind ? " evaluation-ledger-status--" + kind : "");
    }

    function ensureFeedbackArea(config) {
        var main = document.querySelector("main.main-content");
        if (!main) return null;
        var existing = document.getElementById("fhEvaluationLedgerFeedback");
        if (existing) return existing;
        var feedback = createElement("div", "evaluation-ledger-feedback");
        feedback.id = "fhEvaluationLedgerFeedback";
        feedback.setAttribute("data-ledger-ignore", "true");
        var status = createElement("p", "evaluation-ledger-status", "");
        status.id = "fhEvaluationLedgerStatus";
        status.setAttribute("role", "status");
        feedback.appendChild(status);
        var notice = document.querySelector(config.notice);
        if (notice && notice.parentNode) notice.parentNode.insertBefore(feedback, notice.nextSibling);
        else main.appendChild(feedback);
        return feedback;
    }

    function replaceEventIdInUrl(event) {
        if (!event || !window.history || typeof window.history.replaceState !== "function") return;
        var url = new URL(window.location.href);
        url.searchParams.set("ledger_event_id", event.event_id);
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }

    function isVisibleEnabled(control) {
        if (!control || control.disabled || control.hidden || control.getAttribute("aria-hidden") === "true" || control.closest(".hidden")) return false;
        if (typeof window.getComputedStyle !== "function") return true;
        var style = window.getComputedStyle(control);
        return style.display !== "none" && style.visibility !== "hidden";
    }

    function buildCurrentEvent(config) {
        var main = document.querySelector("main.main-content");
        var cipPair = valueAndLabel(config.cip);
        var patientId = patientIdForCip(cipPair.value);
        if (!patientId) throw new Error("No se ha conservado el acto local porque no hay un CIP disponible.");
        var service = valueAndLabel(config.service);
        var pathology = valueAndLabel(config.pathology);
        var occurred = valueAndLabel(config.occurred);
        var domain = collectDomainPayload(config, cipPair.value);
        var sourceId = restoredEvent && restoredEvent.event_type === config.event_type && normalizeCip(restoredEvent.synthetic_cip) === normalizeCip(cipPair.value)
            ? restoredEvent.source_event_id
            : (activePatientId === patientId ? activeSourceEventId : "");
        if (!sourceId) sourceId = [config.event_type, patientId, randomId("SYN-SRC")].join(":");
        activeSourceEventId = sourceId;
        activePatientId = patientId;
        return {
            synthetic_acknowledged: true,
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
        };
    }

    function persistAfterNormalOutput(config) {
        var status = document.getElementById("fhEvaluationLedgerStatus");
        try {
            var result = saveEvent(buildCurrentEvent(config));
            restoredEvent = result.event;
            if (result.persistent) replaceEventIdInUrl(result.event);
            setStatus(status, result.persistent
                ? "Acto conservado localmente en este navegador."
                : "Retención temporal en memoria; el acto no se conservará al recargar.", result.persistent ? "success" : "error");
        } catch (error) {
            setStatus(status, "No se ha retenido el acto localmente. La salida normal ha continuado.", "error");
        }
    }

    function restoreDomainState(event) {
        if (!event || event.event_type !== "pharmacy_follow_up") return;
        var api = window.FarmaciaSeguimiento;
        var domain = event.payload && event.payload.domain;
        if (api && typeof api.restoreEvaluationState === "function") api.restoreEvaluationState(domain || {});
    }

    function restoreSpecificEvent(config, event, restoredMessage) {
        var status = document.getElementById("fhEvaluationLedgerStatus");
        if (!event || event.event_type !== config.event_type) {
            setStatus(status, "No se ha encontrado un acto compatible para restaurar.", "error");
            return Promise.resolve(false);
        }
        restoredEvent = event;
        activeSourceEventId = event.source_event_id;
        activePatientId = event.patient_id;
        return restoreFormState(event.payload && event.payload.form_state, document.querySelector("main.main-content")).then(function () {
            restoreDomainState(event);
            replaceEventIdInUrl(event);
            setStatus(status, restoredMessage || "Acto local restaurado. Revise los datos antes de volver a exportar.", "success");
            return true;
        });
    }

    function restoreRequestedEvent(config) {
        var eventId = new URLSearchParams(location.search).get("ledger_event_id");
        if (!eventId) return false;
        restoreSpecificEvent(config, getEvent(eventId));
        return true;
    }

    function bindNormalOutputs(config) {
        (config.outputs || []).forEach(function (id) {
            var control = document.getElementById(id);
            if (!control) return;
            control.addEventListener("click", function () {
                var eligibleAtActivation = isVisibleEnabled(control);
                if (!eligibleAtActivation) return;
                persistAfterNormalOutput(config);
            }, true);
        });
    }

    function initPreviousActPrompt(config) {
        if (new URLSearchParams(location.search).has("ledger_event_id")) return;
        var main = document.querySelector("main.main-content");
        var feedback = document.getElementById("fhEvaluationLedgerFeedback");
        if (!main || !feedback) return;
        var promptedEventId = "";
        var dismissedPatientKey = "";
        var timer = null;

        function removePrompt() {
            var current = document.getElementById("fhEvaluationLedgerPrevious");
            if (current && current.parentNode) current.parentNode.removeChild(current);
        }

        function evaluateCurrentPatient() {
            timer = null;
            if (new URLSearchParams(location.search).has("ledger_event_id")) { removePrompt(); return; }
            var cip = valueAndLabel(config.cip).value;
            var patientId = patientIdForCip(cip);
            var patientKey = config.event_type + ":" + patientId;
            if (!patientId || patientKey === dismissedPatientKey) { removePrompt(); return; }
            var latest = listEvents({ patient_id: patientId, event_type: config.event_type })[0];
            if (!latest) { promptedEventId = ""; removePrompt(); return; }
            if (promptedEventId === latest.event_id && document.getElementById("fhEvaluationLedgerPrevious")) return;
            promptedEventId = latest.event_id;
            removePrompt();
            var notice = createElement("div", "evaluation-ledger-previous-notice");
            notice.id = "fhEvaluationLedgerPrevious";
            notice.setAttribute("data-ledger-ignore", "true");
            notice.appendChild(createElement("p", "", "Existe un acto local anterior de este tipo para este paciente."));
            var actions = createElement("div", "evaluation-ledger-actions");
            var recover = createElement("button", "btn btn-sm btn-outline", "Recuperar último acto");
            recover.type = "button";
            recover.id = "fhEvaluationLedgerRecoverLatest";
            recover.addEventListener("click", function () {
                removePrompt();
                restoreSpecificEvent(config, latest);
            });
            var continueNew = createElement("button", "btn btn-sm btn-outline", "Continuar con un acto nuevo");
            continueNew.type = "button";
            continueNew.id = "fhEvaluationLedgerContinueNew";
            continueNew.addEventListener("click", function () {
                dismissedPatientKey = patientKey;
                restoredEvent = null;
                activeSourceEventId = "";
                activePatientId = "";
                removePrompt();
            });
            actions.appendChild(recover);
            actions.appendChild(continueNew);
            notice.appendChild(actions);
            feedback.appendChild(notice);
        }

        function scheduleEvaluation() {
            if (timer) window.clearTimeout(timer);
            timer = window.setTimeout(evaluateCurrentPatient, 80);
        }
        main.addEventListener("input", scheduleEvaluation);
        main.addEventListener("change", scheduleEvaluation);
        if (typeof window.MutationObserver === "function") {
            new window.MutationObserver(scheduleEvaluation).observe(main, { childList: true, subtree: true, characterData: true });
        }
        [150, 500, 1200, 2500].forEach(function (delay) { window.setTimeout(scheduleEvaluation, delay); });
    }

    function init() {
        var config = pageConfig();
        if (!config || config.event_type === "index") return;
        ensureFeedbackArea(config);
        bindNormalOutputs(config);
        if (!restoreRequestedEvent(config)) initPreviousActPrompt(config);
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
