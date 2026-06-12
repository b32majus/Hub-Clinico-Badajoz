"use strict";

(function () {
    var NARANJO_SCORES = {
        q1: { si: 1, no: 0, desconocido: 0 },
        q2: { si: 2, no: -1, desconocido: 0 },
        q3: { si: 1, no: 0, desconocido: 0 },
        q4: { si: 2, no: -1, desconocido: 0 },
        q5: { si: -1, no: 2, desconocido: 0 },
        q6: { si: -1, no: 1, desconocido: 0 },
        q7: { si: 1, no: 0, desconocido: 0 },
        q8: { si: 1, no: 0, desconocido: 0 },
        q9: { si: 1, no: 0, desconocido: 0 },
        q10: { si: 1, no: 0, desconocido: 0 }
    };

    function normalizeAnswer(value, fallback) {
        if (value === null || value === undefined || value === "") return fallback;
        return String(value).trim().toLowerCase();
    }

    function calculateNaranjoScore(answers) {
        var source = answers || {};
        var total = 0;
        Object.keys(NARANJO_SCORES).forEach(function (key) {
            var normalized = normalizeAnswer(source[key], "desconocido");
            if (Object.prototype.hasOwnProperty.call(NARANJO_SCORES[key], normalized)) {
                total += NARANJO_SCORES[key][normalized];
            }
        });
        return total;
    }

    function categorizeNaranjo(score) {
        var value = Number(score);
        if (value > 9) return "Definitiva";
        if (value >= 5) return "Probable";
        if (value >= 1) return "Posible";
        return "Dudosa";
    }

    function categorizeKarchLasagna(answers) {
        var source = answers || {};
        var temporal = normalizeAnswer(source.temporal, "no_se_sabe");
        var conocido = normalizeAnswer(source.conocido, "no_se_sabe");
        var alternativa = normalizeAnswer(source.alternativa, "no_se_sabe");
        var mejoraRetirada = normalizeAnswer(source.mejoraRetirada, "no_se_sabe");
        var readministracion = normalizeAnswer(source.readministracion, "no_se_sabe");
        var reaparece = normalizeAnswer(source.reaparece, "no_se_sabe");

        if (temporal === "no") return "Sin relación";
        if (alternativa === "si" && conocido === "no") return "Sin relación";
        if (temporal === "si" && conocido === "si" && alternativa === "no" && mejoraRetirada === "si" && readministracion === "si" && reaparece === "si") {
            return "Definida";
        }
        if (temporal === "si" && conocido === "si" && (alternativa === "no" || alternativa === "no_se_sabe") && (mejoraRetirada === "si" || mejoraRetirada === "no_se_sabe")) {
            return "Probable";
        }
        if (temporal === "si" && (conocido === "si" || conocido === "no_se_sabe")) {
            if (alternativa === "si" || alternativa === "no" || alternativa === "no_se_sabe" || alternativa === "no_aplica") {
                return "Posible";
            }
        }
        if (temporal === "si") return "Condicional";
        if (temporal === "no_aplica" || temporal === "no_se_sabe") return "No clasificable";
        return "No clasificable";
    }

    window.FarmaciaValidationModel = {
        calculateNaranjoScore: calculateNaranjoScore,
        categorizeNaranjo: categorizeNaranjo,
        categorizeKarchLasagna: categorizeKarchLasagna
    };
})();
