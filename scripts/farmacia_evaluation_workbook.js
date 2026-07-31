(function () {
    "use strict";

    var WORKBOOK_VERSION = "1.0.0";
    var SHEET_ORDER = [
        "METADATOS",
        "PACIENTES",
        "EVENTOS",
        "VALIDACION",
        "PRIMERA_VISITA",
        "SEGUIMIENTO",
        "CAMPOS_FORMULARIO",
        "DICCIONARIO_CAMPOS",
        "LINEAS_TRATAMIENTO",
        "EFECTOS_ADVERSOS",
        "PAYLOAD_JSON"
    ];

    function clone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function text(value) {
        if (value === null || value === undefined) return "";
        return String(value);
    }

    function safeCell(value) {
        if (value === null || value === undefined) return "";
        if (typeof value === "number" || typeof value === "boolean") return value;
        var stringValue = String(value);
        return /^[=+\-@]/.test(stringValue) ? "'" + stringValue : stringValue;
    }

    function jsonCell(value) {
        if (value === undefined) return "";
        try {
            return safeCell(JSON.stringify(value));
        } catch (error) {
            return safeCell(String(value));
        }
    }

    function commonEventColumns(event) {
        return {
            schema_version: safeCell(event.schema_version),
            event_id: safeCell(event.event_id),
            source_event_id: safeCell(event.source_event_id),
            event_type: safeCell(event.event_type),
            patient_id: safeCell(event.patient_id),
            cip_ficticio: safeCell(event.synthetic_cip),
            occurred_on: safeCell(event.occurred_on),
            recorded_at: safeCell(event.recorded_at),
            created_at: safeCell(event.created_at),
            service_code: safeCell(event.service_code),
            service_label: safeCell(event.service_label),
            pathology_code: safeCell(event.pathology_code),
            pathology_label: safeCell(event.pathology_label),
            visit_id: safeCell(event.visit_id),
            line_ids: safeCell((event.line_ids || []).join(" | ")),
            source_page: safeCell(event.source_page),
            record_status: safeCell(event.record_status)
        };
    }

    function formEntries(event) {
        var state = event && event.payload && Array.isArray(event.payload.form_state)
            ? event.payload.form_state
            : [];
        return state.map(function (entry) { return clone(entry); });
    }

    function formEntryValue(entry) {
        if (!entry) return "";
        if (entry.type === "checkbox") return Boolean(entry.checked);
        if (entry.type === "radio") return entry.checked ? safeCell(entry.value) : "";
        if (Array.isArray(entry.value)) return safeCell(entry.value.join(" | "));
        return safeCell(entry.value);
    }

    function flattenFormState(event) {
        var row = commonEventColumns(event);
        var grouped = {};
        formEntries(event).forEach(function (entry) {
            if (!entry || !entry.key) return;
            if (!grouped[entry.key]) grouped[entry.key] = [];
            grouped[entry.key].push(entry);
        });
        Object.keys(grouped).sort().forEach(function (key) {
            var entries = grouped[key];
            var radio = entries.find(function (entry) { return entry.type === "radio" && entry.checked; });
            if (radio) {
                row[key] = safeCell(radio.value);
                return;
            }
            if (entries.length > 1 && entries.every(function (entry) { return entry.type === "checkbox"; })) {
                row[key] = safeCell(entries.filter(function (entry) { return entry.checked; }).map(function (entry) { return entry.value; }).join(" | "));
                return;
            }
            row[key] = formEntryValue(entries[entries.length - 1]);
        });
        return row;
    }

    function patientRows(events) {
        var groups = {};
        events.forEach(function (event) {
            var key = event.patient_id || event.synthetic_cip || event.event_id;
            if (!groups[key]) {
                groups[key] = {
                    patient_id: safeCell(event.patient_id),
                    cip_ficticio: safeCell(event.synthetic_cip),
                    numero_actos: 0,
                    primera_fecha: "",
                    ultima_fecha: "",
                    servicios: [],
                    patologias: [],
                    tipos_acto: []
                };
            }
            var group = groups[key];
            group.numero_actos += 1;
            var date = text(event.occurred_on || event.recorded_at);
            if (date && (!group.primera_fecha || date < group.primera_fecha)) group.primera_fecha = safeCell(date);
            if (date && (!group.ultima_fecha || date > group.ultima_fecha)) group.ultima_fecha = safeCell(date);
            [event.service_label || event.service_code].forEach(function (value) {
                value = text(value);
                if (value && group.servicios.indexOf(value) === -1) group.servicios.push(value);
            });
            [event.pathology_label || event.pathology_code].forEach(function (value) {
                value = text(value);
                if (value && group.patologias.indexOf(value) === -1) group.patologias.push(value);
            });
            if (event.event_type && group.tipos_acto.indexOf(event.event_type) === -1) group.tipos_acto.push(event.event_type);
        });
        return Object.keys(groups).map(function (key) {
            var group = groups[key];
            return {
                patient_id: group.patient_id,
                cip_ficticio: group.cip_ficticio,
                numero_actos: group.numero_actos,
                primera_fecha: group.primera_fecha,
                ultima_fecha: group.ultima_fecha,
                servicios: safeCell(group.servicios.join(" | ")),
                patologias: safeCell(group.patologias.join(" | ")),
                tipos_acto: safeCell(group.tipos_acto.join(" | "))
            };
        }).sort(function (a, b) {
            return text(a.cip_ficticio).localeCompare(text(b.cip_ficticio));
        });
    }

    function eventRows(events) {
        return events.map(function (event) {
            var row = commonEventColumns(event);
            row.quality_flags = safeCell((event.quality_flags || []).join(" | "));
            row.storage = safeCell(event.provenance && event.provenance.storage);
            row.app_context = safeCell(event.provenance && event.provenance.app_context);
            row.warning = safeCell(event.provenance && event.provenance.warning);
            return row;
        });
    }

    function fieldRows(events) {
        var rows = [];
        events.forEach(function (event) {
            formEntries(event).forEach(function (entry, index) {
                var base = commonEventColumns(event);
                rows.push(Object.assign(base, {
                    orden_campo: index + 1,
                    key_kind: safeCell(entry.key_kind),
                    key: safeCell(entry.key),
                    label: safeCell(entry.label),
                    tag: safeCell(entry.tag),
                    type: safeCell(entry.type),
                    value: Array.isArray(entry.value) ? safeCell(entry.value.join(" | ")) : safeCell(entry.value),
                    checked: entry.checked === undefined ? "" : Boolean(entry.checked),
                    visible: entry.visible === undefined ? "" : Boolean(entry.visible),
                    disabled: entry.disabled === undefined ? "" : Boolean(entry.disabled)
                }));
            });
        });
        return rows;
    }

    function dictionaryRows(events) {
        var dictionary = {};
        events.forEach(function (event) {
            formEntries(event).forEach(function (entry) {
                if (!entry || !entry.key) return;
                if (!dictionary[entry.key]) {
                    dictionary[entry.key] = {
                        key: safeCell(entry.key),
                        key_kind: safeCell(entry.key_kind),
                        label: safeCell(entry.label),
                        tag: safeCell(entry.tag),
                        types: [],
                        pages: [],
                        event_types: []
                    };
                }
                var item = dictionary[entry.key];
                [entry.type].forEach(function (value) {
                    value = text(value);
                    if (value && item.types.indexOf(value) === -1) item.types.push(value);
                });
                [event.source_page].forEach(function (value) {
                    value = text(value);
                    if (value && item.pages.indexOf(value) === -1) item.pages.push(value);
                });
                [event.event_type].forEach(function (value) {
                    value = text(value);
                    if (value && item.event_types.indexOf(value) === -1) item.event_types.push(value);
                });
                if (!item.label && entry.label) item.label = safeCell(entry.label);
            });
        });
        return Object.keys(dictionary).sort().map(function (key) {
            var item = dictionary[key];
            return {
                key: item.key,
                key_kind: item.key_kind,
                label: item.label,
                tag: item.tag,
                types: safeCell(item.types.join(" | ")),
                paginas: safeCell(item.pages.join(" | ")),
                tipos_acto: safeCell(item.event_types.join(" | "))
            };
        });
    }

    function lineRows(events) {
        var rows = [];
        function add(event, role, value, index) {
            if (!value || typeof value !== "object") return;
            rows.push(Object.assign(commonEventColumns(event), {
                source_role: safeCell(role),
                source_index: index === undefined ? "" : index,
                line_id: safeCell(value.line_id || value.id),
                treatment_id: safeCell(value.treatment_id),
                farmaco_nombre: safeCell(value.farmaco_nombre || value.farmaco || value.nombre),
                principio_activo: safeCell(value.principio_activo),
                presentacion: safeCell(value.presentacion || value.nombre_presentacion),
                dosis: safeCell(value.dosis_texto || value.dosis),
                via: safeCell(value.via),
                pauta_codigo: safeCell(value.pauta_codigo),
                pauta_label: safeCell(value.pauta_label || value.pauta),
                estado_linea: safeCell(value.estado_linea || value.estado),
                relacion_terapeutica: safeCell(value.relacion_terapeutica || value.tipo_relacion),
                line_payload_json: jsonCell(value)
            }));
        }
        events.forEach(function (event) {
            var domain = event.payload && event.payload.domain ? event.payload.domain : {};
            add(event, "primary_treatment", domain.primary_treatment);
            add(event, "selected_line", domain.selected_line);
            (domain.canonical_lines || []).forEach(function (line, index) { add(event, "canonical_line", line, index + 1); });
            (domain.related_treatments || []).forEach(function (line, index) { add(event, "related_treatment", line, index + 1); });
            if (domain.validation_export_data && domain.validation_export_data.lineaActual) {
                add(event, "validation_current_line", domain.validation_export_data.lineaActual);
            }
        });
        return rows;
    }

    function adverseEventRows(events) {
        var rows = [];
        events.forEach(function (event) {
            var domain = event.payload && event.payload.domain ? event.payload.domain : {};
            if (!domain.adverse_event) return;
            var adverse = domain.adverse_event;
            rows.push(Object.assign(commonEventColumns(event), {
                ea_id: safeCell(adverse.ea_id || adverse.id),
                presente: adverse.presente === undefined ? "" : safeCell(adverse.presente),
                descripcion: safeCell(adverse.descripcion || adverse.observaciones || adverse.evento),
                fecha_inicio: safeCell(adverse.fecha_inicio || adverse.fecha),
                gravedad: safeCell(adverse.gravedad),
                desenlace: safeCell(adverse.desenlace),
                sospechosos_json: jsonCell(adverse.sospechosos || adverse.suspects || adverse.causality_by_suspect),
                adverse_event_json: jsonCell(adverse)
            }));
        });
        return rows;
    }

    function payloadRows(events) {
        return events.map(function (event) {
            return {
                event_id: safeCell(event.event_id),
                patient_id: safeCell(event.patient_id),
                cip_ficticio: safeCell(event.synthetic_cip),
                event_type: safeCell(event.event_type),
                event_json: jsonCell(event)
            };
        });
    }

    function metadataRows(events, ledger) {
        var now = new Date().toISOString();
        var patients = patientRows(events);
        return [
            { campo: "workbook_version", valor: WORKBOOK_VERSION },
            { campo: "generated_at", valor: now },
            { campo: "ledger_schema_version", valor: safeCell(ledger && ledger.schema_version) },
            { campo: "ledger_type", valor: safeCell(ledger && ledger.ledger_type) },
            { campo: "scope", valor: "Evaluación local con datos exclusivamente ficticios" },
            { campo: "warning", valor: "No usar para asistencia clínica real. No es persistencia productiva ni respaldo." },
            { campo: "event_count", valor: events.length },
            { campo: "patient_count", valor: patients.length },
            { campo: "sheet_order", valor: SHEET_ORDER.join(" | ") },
            { campo: "legacy_61_columns", valor: "No utilizadas como modelo de verdad; el exportador legacy permanece separado" }
        ];
    }

    function rowsForType(events, type) {
        return events.filter(function (event) { return event.event_type === type; }).map(flattenFormState);
    }

    function buildWorkbookModel(events, ledger) {
        var normalizedEvents = Array.isArray(events) ? events.map(clone) : [];
        var normalizedLedger = ledger && typeof ledger === "object" ? clone(ledger) : { schema_version: "", ledger_type: "" };
        return {
            METADATOS: metadataRows(normalizedEvents, normalizedLedger),
            PACIENTES: patientRows(normalizedEvents),
            EVENTOS: eventRows(normalizedEvents),
            VALIDACION: rowsForType(normalizedEvents, "pharmacy_validation"),
            PRIMERA_VISITA: rowsForType(normalizedEvents, "pharmacy_first_visit"),
            SEGUIMIENTO: rowsForType(normalizedEvents, "pharmacy_follow_up"),
            CAMPOS_FORMULARIO: fieldRows(normalizedEvents),
            DICCIONARIO_CAMPOS: dictionaryRows(normalizedEvents),
            LINEAS_TRATAMIENTO: lineRows(normalizedEvents),
            EFECTOS_ADVERSOS: adverseEventRows(normalizedEvents),
            PAYLOAD_JSON: payloadRows(normalizedEvents)
        };
    }

    function sheetRows(rows) {
        return rows && rows.length ? rows : [{ estado: "Sin datos en esta cohorte ficticia" }];
    }

    function setSheetLayout(sheet, rows) {
        if (!sheet || !sheet["!ref"]) return;
        var range = window.XLSX.utils.decode_range(sheet["!ref"]);
        var widths = [];
        var headers = rows.length ? Object.keys(rows[0]) : ["estado"];
        headers.forEach(function (header, columnIndex) {
            var max = Math.max(12, String(header).length + 2);
            rows.slice(0, 200).forEach(function (row) {
                var value = row[header];
                var length = value === null || value === undefined ? 0 : String(value).length;
                max = Math.min(60, Math.max(max, length + 2));
            });
            widths[columnIndex] = { wch: max };
        });
        sheet["!cols"] = widths;
        sheet["!autofilter"] = { ref: window.XLSX.utils.encode_range({ s: range.s, e: { r: range.s.r, c: range.e.c } }) };
    }

    function buildWorkbook(events, ledger) {
        if (!window.XLSX || !window.XLSX.utils) throw new Error("SheetJS no está disponible para generar el libro Excel.");
        var model = buildWorkbookModel(events, ledger);
        var workbook = window.XLSX.utils.book_new();
        SHEET_ORDER.forEach(function (name) {
            var rows = sheetRows(model[name]);
            var sheet = window.XLSX.utils.json_to_sheet(rows);
            setSheetLayout(sheet, rows);
            window.XLSX.utils.book_append_sheet(workbook, sheet, name);
        });
        workbook.Props = {
            Title: "PROMueve FH — Cohorte ficticia local",
            Subject: "Libro acumulado de evaluación",
            Author: "Hub Clínico PROMueve",
            Comments: "Datos exclusivamente ficticios. No usar para asistencia clínica real.",
            CreatedDate: new Date()
        };
        return { workbook: workbook, model: model };
    }

    function filename() {
        return "PROMueve_FH_evaluacion_ficticia_" + new Date().toISOString().slice(0, 10) + ".xlsx";
    }

    function currentLedger() {
        var ledgerApi = window.FarmaciaEvaluationLedger;
        if (!ledgerApi) throw new Error("El registro local de evaluación no está disponible.");
        return ledgerApi.load();
    }

    function download() {
        var ledger = currentLedger();
        var events = ledger.events || [];
        if (!events.length) throw new Error("No hay actos ficticios guardados para exportar.");
        var built = buildWorkbook(events, ledger);
        window.XLSX.writeFile(built.workbook, filename(), { compression: true });
        return { filename: filename(), sheet_names: built.workbook.SheetNames.slice(), event_count: events.length };
    }

    function createButton() {
        var panel = document.getElementById("fhEvaluationLedgerIndex");
        if (!panel || document.getElementById("fhEvaluationWorkbookDownload")) return;
        var header = panel.querySelector(".evaluation-ledger-index__header");
        if (!header) return;
        var wrapper = document.createElement("div");
        wrapper.className = "evaluation-ledger-actions";
        wrapper.setAttribute("data-ledger-ignore", "true");
        var button = document.createElement("button");
        button.type = "button";
        button.id = "fhEvaluationWorkbookDownload";
        button.className = "btn btn-primary";
        button.textContent = "Descargar Excel de cohorte ficticia";
        var status = document.createElement("span");
        status.id = "fhEvaluationWorkbookStatus";
        status.className = "evaluation-ledger-status";
        status.setAttribute("role", "status");
        wrapper.appendChild(button);
        wrapper.appendChild(status);
        header.appendChild(wrapper);

        function refresh() {
            try {
                var ledger = currentLedger();
                button.disabled = !(ledger.events && ledger.events.length) || !window.XLSX;
                status.textContent = ledger.events && ledger.events.length
                    ? ledger.events.length + " actos ficticios listos para exportar."
                    : "Guarda al menos un acto ficticio para generar el libro.";
            } catch (error) {
                button.disabled = true;
                status.textContent = error.message || String(error);
            }
        }

        button.addEventListener("click", function () {
            try {
                var result = download();
                status.textContent = "Libro generado: " + result.filename + " (" + result.event_count + " actos).";
                status.className = "evaluation-ledger-status evaluation-ledger-status--success";
            } catch (error) {
                status.textContent = error.message || String(error);
                status.className = "evaluation-ledger-status evaluation-ledger-status--error";
            }
        });
        refresh();
    }

    function init() {
        if (!/farmacia_index\.html$/.test(location.pathname) && !/\/$/.test(location.pathname)) return;
        createButton();
        window.setTimeout(createButton, 200);
        document.addEventListener("farmacia:evaluation-ledger-changed", function () {
            window.setTimeout(createButton, 0);
        });
    }

    window.FarmaciaEvaluationWorkbook = Object.freeze({
        workbookVersion: WORKBOOK_VERSION,
        sheetOrder: SHEET_ORDER.slice(),
        safeCell: safeCell,
        flattenFormState: flattenFormState,
        buildWorkbookModel: buildWorkbookModel,
        buildWorkbook: buildWorkbook,
        download: download,
        filename: filename
    });

    document.addEventListener("DOMContentLoaded", function () {
        window.setTimeout(init, 150);
    });
})();
