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

    root.FarmaciaValidationStateV4Safety = { apply: applySafetyUi };
    if (root.document && typeof root.document.addEventListener === "function") {
        root.document.addEventListener("DOMContentLoaded", applySafetyUi);
    }
})(typeof window !== "undefined" ? window : globalThis);
