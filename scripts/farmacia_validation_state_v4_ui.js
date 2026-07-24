(function (root) {
    "use strict";

    function text(value) {
        return value === null || value === undefined ? "" : String(value).trim();
    }

    function byId(id) {
        return root.document ? root.document.getElementById(id) : null;
    }

    function ensureUi() {
        if (!root.document) return;
        if (!byId("fhValV4Persistence")) {
            var section = root.document.createElement("section");
            section.id = "fhValV4Persistence";
            section.className = "validation-module";

            var heading = root.document.createElement("h3");
            heading.className = "card-title";
            var icon = root.document.createElement("i");
            icon.className = "fas fa-save";
            icon.setAttribute("aria-hidden", "true");
            heading.appendChild(icon);
            heading.appendChild(root.document.createTextNode(" Guardar decisión de Validación"));

            var status = root.document.createElement("p");
            status.id = "fhValV4Status";
            status.className = "validation-note-block__value";
            status.setAttribute("role", "status");
            status.textContent = "Sin decisión canónica guardada para este paciente.";

            var actions = root.document.createElement("div");
            actions.className = "form-actions";
            var save = root.document.createElement("button");
            save.type = "button";
            save.id = "fhValSaveV4";
            save.className = "btn btn-primary";
            var saveIcon = root.document.createElement("i");
            saveIcon.className = "fas fa-save";
            saveIcon.setAttribute("aria-hidden", "true");
            save.appendChild(saveIcon);
            save.appendChild(root.document.createTextNode(" Guardar validación"));

            var firstVisit = root.document.createElement("a");
            firstVisit.id = "fhValGoFirstVisitV4";
            firstVisit.className = "btn btn-outline hidden";
            var nextIcon = root.document.createElement("i");
            nextIcon.className = "fas fa-arrow-right";
            nextIcon.setAttribute("aria-hidden", "true");
            firstVisit.appendChild(nextIcon);
            firstVisit.appendChild(root.document.createTextNode(" Continuar a Primera Visita"));

            actions.appendChild(save);
            actions.appendChild(firstVisit);
            section.appendChild(heading);
            section.appendChild(status);
            section.appendChild(actions);

            var exportSection = byId("modExportacion");
            if (exportSection && exportSection.parentNode) exportSection.parentNode.insertBefore(section, exportSection);
            else {
                var block = byId("validationBlock");
                if (block) block.appendChild(section);
            }
        }
        var notice = byId("fhValDemoNotice");
        if (notice) {
            var span = notice.querySelector ? notice.querySelector("span") : null;
            if (span) span.textContent = "Demo con persistencia de sesión para la decisión de Validación. No existe backend, firma electrónica ni integración automática.";
        }
    }

    function domValue(id) {
        var element = byId(id);
        return text(element && element.value);
    }

    function domText(id) {
        var element = byId(id);
        return text(element && element.textContent);
    }

    function readPauta() {
        var select = byId("fhValidadoPauta");
        var code = domValue("fhValidadoPauta");
        var selected = select && select.selectedOptions && select.selectedOptions[0];
        return {
            pauta_codigo: code,
            pauta_label: code && code !== "OTRO" ? text(selected && selected.textContent) : "",
            pauta_otro_texto: code === "OTRO" ? domValue("fhValidadoPautaOtro") : ""
        };
    }

    function readCatalogSnapshot(model, slot, cip, visibleDrugName) {
        var catalog = root.FarmaciaCatalog;
        if (!catalog || typeof catalog.getSnapshot !== "function") return null;
        var snapshot = catalog.getSnapshot({ slot: slot, paciente_cip: cip, tratamiento_id: "", linea_id: "" });
        if (!snapshot) return null;
        var identity = model.catalogIdentityFromSnapshot(snapshot);
        if (identity.drug_name && text(visibleDrugName).toLowerCase() !== identity.drug_name.toLowerCase()) return null;
        return identity;
    }

    function readExplicitDom(model, patient) {
        var validatedDrug = domValue("fhValidadoFarmaco");
        var requestedDrug = patient ? text(patient.farmaco_solicitado || patient.farmaco || patient.marcaComercial || patient.principioActivo) : "";
        var drugName = validatedDrug || requestedDrug;
        var activeIngredient = domValue("fhValidadoPrincipioActivo") || (patient ? text(patient.principioActivo) : "");
        var pauta = readPauta();
        var catalogIdentity = readCatalogSnapshot(model, validatedDrug ? "validacion.validado" : "validacion.solicitado", patient && patient.cip, drugName) || model.emptyCatalogIdentity();
        var therapy = {
            dose_text: domValue("fhValidadoDosis"),
            presentation: domValue("fhValidadoPresentacion"),
            route: domValue("fhValidadoVia"),
            pauta_codigo: pauta.pauta_codigo,
            pauta_label: pauta.pauta_label,
            pauta_otro_texto: pauta.pauta_otro_texto
        };
        return {
            saved_at: new Date().toISOString(),
            drug: { drug_name: drugName, active_ingredient: activeIngredient, catalog_identity: catalogIdentity, catalog_snapshot: catalogIdentity },
            therapy: therapy,
            line: {
                relationship: "primary",
                drug_name: drugName,
                active_ingredient: activeIngredient,
                dose_text: therapy.dose_text,
                presentation: therapy.presentation,
                route: therapy.route,
                pauta_codigo: therapy.pauta_codigo,
                pauta_label: therapy.pauta_label,
                pauta_otro_texto: therapy.pauta_otro_texto,
                catalog_identity: catalogIdentity,
                catalog_snapshot: catalogIdentity,
                start_date: "",
                end_date: ""
            }
        };
    }

    function setValue(id, value) {
        var element = byId(id);
        if (element) element.value = text(value);
    }

    function renderStatus(snapshot, message) {
        var status = byId("fhValV4Status");
        if (!status) return;
        if (message) status.textContent = message;
        else if (!snapshot || !snapshot.result) status.textContent = "Sin decisión canónica guardada para este paciente.";
        else {
            var labels = { pending: "Pendiente", denied: "Denegado", validated: "Validado · pendiente de inicio" };
            status.textContent = labels[snapshot.result] + (snapshot.produced_line_id ? " · Línea " + snapshot.produced_line_id : " · Sin línea terapéutica");
        }
        var firstVisit = byId("fhValGoFirstVisitV4");
        if (firstVisit && snapshot) firstVisit.classList.toggle("hidden", snapshot.result !== "validated" || !snapshot.produced_line_id);
    }

    function applySnapshotToDom(snapshot) {
        if (!snapshot) return;
        setValue("fhValEstado", snapshot.result);
        setValue("fhValMotivo", snapshot.denial_reason);
        setValue("fhValObservaciones", snapshot.observations);
        setValue("fhValCita", snapshot.appointment_date);
        if (snapshot.line) {
            setValue("fhValidadoFarmaco", snapshot.line.drug_name);
            setValue("fhValidadoPrincipioActivo", snapshot.line.active_ingredient);
            setValue("fhValidadoDosis", snapshot.line.dose_text);
            setValue("fhValidadoPresentacion", snapshot.line.presentation);
            setValue("fhValidadoVia", snapshot.line.route);
            setValue("fhValidadoPauta", snapshot.line.pauta_codigo);
            setValue("fhValidadoPautaOtro", snapshot.line.pauta_otro_texto);
        }
        var reasonRow = byId("fhValMotivoRow");
        if (reasonRow) reasonRow.classList.toggle("hidden", snapshot.result !== "denied");
        renderStatus(snapshot);
    }

    function boot() {
        ensureUi();
        var model = root.FarmaciaValidationStateV4Model;
        if (!root.document || !model || !root.FarmaciaMultitreatmentCore || !root.FarmaciaDataSource || !root.FarmaciaDemo) {
            renderStatus(null, "No se pudo inicializar la persistencia canónica de Validación.");
            return;
        }
        var core = root.FarmaciaMultitreatmentCore;
        var store = core.createSessionStore(root.sessionStorage);
        root.FarmaciaDemo.whenReady(function () {
            var context = root.FarmaciaDemo.getQueryContext();
            var patient = context.patient;
            if (!patient || !patient.patient_id) {
                renderStatus(null, "Seleccione una solicitud existente para guardar una validación canónica.");
                return;
            }
            var patientId = patient.patient_id;
            model.seedPatientState({ core: core, store: store, dataSource: root.FarmaciaDataSource, patientId: patientId });
            applySnapshotToDom(model.restoreDecision({ store: store, patientId: patientId }));

            var firstVisit = byId("fhValGoFirstVisitV4");
            if (firstVisit) {
                firstVisit.href = root.FarmaciaDemo.makeContextUrl("farmacia_primera_visita.html", {
                    cip: patient.cip,
                    servicio: patient.servicioSlug || patient.servicio,
                    patologia: patient.patologia,
                    entrada: "primera_visita"
                });
            }

            var button = byId("fhValSaveV4");
            if (!button) return;
            button.addEventListener("click", function () {
                try {
                    var saved = model.saveDecision({
                        core: core,
                        store: store,
                        patientId: patientId,
                        result: domValue("fhValEstado"),
                        denialReason: domValue("fhValMotivo"),
                        observations: domValue("fhValObservaciones"),
                        appointmentDate: domValue("fhValCita"),
                        professionalDemoId: domText("fhValFarmaceutico"),
                        explicit: readExplicitDom(model, patient),
                        performedAt: new Date().toISOString()
                    });
                    var snapshot = model.restoreDecision({ store: store, patientId: patientId });
                    applySnapshotToDom(snapshot);
                    patient.estado = snapshot.result === "validated" ? "validated" : (snapshot.result === "denied" ? "denied" : "pending");
                    patient.estadoLabel = snapshot.result === "validated" ? "Validado · pendiente de inicio" : (snapshot.result === "denied" ? "Denegado" : "Pendiente");
                    renderStatus(snapshot, "Validación guardada en la sesión demo: " + patient.estadoLabel + (saved.line ? " · Línea " + saved.line.line_id : " · Sin línea terapéutica"));
                } catch (error) {
                    renderStatus(null, "No se pudo guardar: " + error.message);
                }
            });
        });
    }

    root.FarmaciaValidationStateV4 = { boot: boot };
    if (root.document && typeof root.document.addEventListener === "function") root.document.addEventListener("DOMContentLoaded", boot);
})(typeof window !== "undefined" ? window : globalThis);
