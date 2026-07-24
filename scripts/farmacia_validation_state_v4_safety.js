(function (root) {
    "use strict";

    function byId(id) {
        return root.document ? root.document.getElementById(id) : null;
    }

    function text(value) {
        return value === null || value === undefined ? "" : String(value).trim();
    }

    function ensureBlankOption(select) {
        if (!select) return;
        var hasBlank = Array.prototype.some.call(select.options || [], function (option) { return option.value === ""; });
        if (!hasBlank) {
            var option = root.document.createElement("option");
            option.value = "";
            option.textContent = "Seleccionar...";
            select.insertBefore(option, select.firstChild || null);
        }
        if (!select.hasAttribute("data-v4-explicit-selection")) select.value = "";
        select.addEventListener("change", function () {
            select.setAttribute("data-v4-explicit-selection", "true");
        });
    }

    function disableUnsupportedValidationTypes() {
        var select = byId("fhTipoValidacion");
        if (!select) return;
        ["switch_cambio", "addon", "renovacion"].forEach(function (value) {
            var option = Array.prototype.find.call(select.options || [], function (candidate) { return candidate.value === value; });
            if (option) {
                option.disabled = true;
                option.hidden = true;
            }
        });
        if (["switch_cambio", "addon", "renovacion"].indexOf(select.value) !== -1) select.value = "";
    }

    function updateCatalogMessage() {
        var badge = root.document && root.document.querySelector ? root.document.querySelector("#modTratamientoValidado .catalog-note-badge") : null;
        if (!badge) return;
        badge.textContent = "Catálogo: identidad y trazabilidad. Dosis, vía, pauta, presentación e inducción se completan manualmente.";
    }

    function applySafetyUi() {
        if (!root.document) return;
        ["fhValidadoInduccion", "fhManualInduccion", "fhDermaInduccion"].forEach(function (id) {
            ensureBlankOption(byId(id));
        });
        disableUnsupportedValidationTypes();
        updateCatalogMessage();
    }

    function setValue(id, value) {
        var element = byId(id);
        if (element) element.value = text(value);
    }

    function applyCanonicalSnapshot(snapshot) {
        var result = text(snapshot && snapshot.result);
        setValue("fhValEstado", result);
        setValue("fhValMotivo", snapshot && snapshot.denial_reason);
        setValue("fhValObservaciones", snapshot && snapshot.observations);
        setValue("fhValCita", snapshot && snapshot.appointment_date);

        if (snapshot && snapshot.line) {
            setValue("fhValidadoFarmaco", snapshot.line.drug_name);
            setValue("fhValidadoPrincipioActivo", snapshot.line.active_ingredient);
            setValue("fhValidadoDosis", snapshot.line.dose_text);
            setValue("fhValidadoPresentacion", snapshot.line.presentation);
            setValue("fhValidadoVia", snapshot.line.route);
            setValue("fhValidadoPauta", snapshot.line.pauta_codigo);
            setValue("fhValidadoPautaOtro", snapshot.line.pauta_otro_texto);
        }

        var reasonRow = byId("fhValMotivoRow");
        if (reasonRow) reasonRow.classList.toggle("hidden", result !== "denied");

        var firstVisit = byId("fhValGoFirstVisitV4");
        if (firstVisit) firstVisit.classList.toggle("hidden", result !== "validated" || !text(snapshot && snapshot.produced_line_id));

        var status = byId("fhValV4Status");
        if (status) {
            if (!result) status.textContent = "Sin decisión canónica guardada para este paciente.";
            else {
                var labels = { pending: "Pendiente", denied: "Denegado", validated: "Validado · pendiente de inicio" };
                status.textContent = labels[result] + (text(snapshot && snapshot.produced_line_id) ? " · Línea " + snapshot.produced_line_id : " · Sin línea terapéutica");
            }
        }
    }

    function restorePostLoadSafety() {
        var demo = root.FarmaciaDemo;
        var model = root.FarmaciaValidationStateV4Model;
        var core = root.FarmaciaMultitreatmentCore;
        var source = root.FarmaciaDataSource;
        if (!demo || !model || !core || !source || !root.sessionStorage) return;
        Promise.resolve(demo.ready).then(function () {
            var context = demo.getQueryContext ? demo.getQueryContext() : {};
            var patient = context.patient;
            if (!patient || !patient.patient_id) return;
            var scenario = source.getScenarioStateByPatientId ? source.getScenarioStateByPatientId(patient.patient_id) : null;
            if (!scenario) return;
            var store = core.createSessionStore(root.sessionStorage);
            var snapshot = model.restoreDecision({ store: store, patientId: patient.patient_id });

            if (scenario.initial_state === "validation_denied" && snapshot.result === "denied" && !snapshot.denial_reason && snapshot.observations) {
                snapshot.denial_reason = snapshot.observations;
            }
            applyCanonicalSnapshot(snapshot);
        });
    }

    root.FarmaciaValidationStateV4Safety = { apply: applySafetyUi, restorePostLoadSafety: restorePostLoadSafety };
    if (root.document && typeof root.document.addEventListener === "function") {
        root.document.addEventListener("DOMContentLoaded", applySafetyUi);
        root.addEventListener("load", restorePostLoadSafety);
    }
})(typeof window !== "undefined" ? window : globalThis);
