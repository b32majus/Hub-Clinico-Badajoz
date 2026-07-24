(function (root) {
    "use strict";

    function byId(id) {
        return root.document ? root.document.getElementById(id) : null;
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
        select.value = "";
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

            if (["ready_for_pharmacy_validation", "general_pending_validation"].indexOf(scenario.initial_state) !== -1 && !snapshot.result) {
                var resultSelect = byId("fhValEstado");
                if (resultSelect) resultSelect.value = "";
                var neutralReasonRow = byId("fhValMotivoRow");
                if (neutralReasonRow) neutralReasonRow.classList.add("hidden");
                var status = byId("fhValV4Status");
                if (status) status.textContent = "Sin decisión canónica guardada para este paciente.";
            }

            if (scenario.initial_state === "validation_denied" && snapshot.result === "denied" && !snapshot.denial_reason && snapshot.observations) {
                var reason = byId("fhValMotivo");
                if (reason) reason.value = snapshot.observations;
                var deniedReasonRow = byId("fhValMotivoRow");
                if (deniedReasonRow) deniedReasonRow.classList.remove("hidden");
            }
        });
    }

    root.FarmaciaValidationStateV4Safety = { apply: applySafetyUi, restorePostLoadSafety: restorePostLoadSafety };
    if (root.document && typeof root.document.addEventListener === "function") {
        root.document.addEventListener("DOMContentLoaded", applySafetyUi);
        root.addEventListener("load", restorePostLoadSafety);
    }
})(typeof window !== "undefined" ? window : globalThis);
