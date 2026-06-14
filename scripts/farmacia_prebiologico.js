"use strict";

/**
 * FarmaciaPrebiologico — Pure IIFE helper for pre-biologic evaluation.
 * No DOM dependency. No HTML insertion.
 * Exposes: window.FarmaciaPrebiologico.evaluatePatientPrebiologico(patient)
 *
 * Returns:
 *   {
 *     overallStatus: "complete" | "incomplete" | "blocked",
 *     canValidate: boolean,
 *     checks: Array<{category, status, label, detail, blocking}>,
 *     blockers: Array<{category, label, status, detail}>,
 *     blockerLabels: string[],
 *     summaryText: string,
 *     patientNotFound?: boolean,
 *     fallbackLegacy?: boolean
 *   }
 *
 * Categories: analitica, hemograma, bioquimica, serologias, tuberculosis, vacunacion, medicinaPreventiva.
 * Check statuses: complete, pending, missing, unknown, not_applicable, alert.
 *
 * Conservative: missing/unclear data → status = "unknown" and blocking = true.
 * Blocking statuses: unknown, missing, pending, alert.
 * Does NOT modify the input patient object.
 */

(function () {
    // ─── Minimal internal helpers ───

    function normalizeCheckString(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function hasMeaningfulValue(value) {
        return value !== undefined && value !== null && String(value).trim() !== "" && String(value).trim() !== "\u2014";
    }

    function evaluateBooleanLikeCheck(value) {
        if (value === true) return "ok";
        if (value === false) return "pendiente";
        if (!hasMeaningfulValue(value)) return "no_informado";

        var norm = normalizeCheckString(value);
        if (!norm) return "no_informado";
        if (/^(si|s[ií]|ok|correcto|correcta|completo|completa|completado|completada|normal|negativo|negativa|negativos|negativas|apto|apta|al dia|al d[ií]a|revisado|revisada)$/.test(norm)) return "ok";
        if (/pendient|solicit|en curso|por hacer|por revisar|falta/.test(norm)) return "pendiente";
        if (/positivo|positiva|alterad|anormal|reactiv|revisar|alerta|contraindic/.test(norm)) return "alerta";
        if (/^(no aplica|n\/a|na|no procede|no aplicable)$/.test(norm)) return "no_aplica";
        return "no_informado";
    }

    // ─── Category evaluators ───

    function evaluateAnalitica(patient) {
        var est = patient && patient.analiticaEstruct;
        if (est && typeof est === "object") {
            var reciente = evaluateBooleanLikeCheck(est.reciente);
            var hemograma = evaluateBooleanLikeCheck(est.hemograma);
            var bioquimica = evaluateBooleanLikeCheck(est.bioquimica);

            if (reciente === "alerta" || hemograma === "alerta" || bioquimica === "alerta") return "alerta";
            if (reciente === "ok" && hemograma === "ok" && bioquimica === "ok") return "ok";
            if (reciente === "pendiente" || hemograma === "pendiente" || bioquimica === "pendiente") return "pendiente";
        }

        var text = normalizeCheckString(patient && patient.analitica);
        if (!text) return "no_informado";
        if (/(analitica|analitica y vacunacion|prebiologic).*(completa|completo|ok|apto|apta)/.test(text)) return "ok";
        if (/(analitica|prebiologic).*(pendient|solicit|en curso|por revisar|falta)/.test(text)) return "pendiente";
        if (/(analitica|prebiologic).*(alterad|anormal|revisar|alerta)/.test(text)) return "alerta";
        return "no_informado";
    }

    function evaluateHemograma(patient) {
        var est = patient && patient.analiticaEstruct;
        if (est && typeof est === "object" && hasMeaningfulValue(est.hemograma)) {
            return evaluateBooleanLikeCheck(est.hemograma);
        }
        return "no_informado";
    }

    function evaluateBioquimica(patient) {
        var est = patient && patient.analiticaEstruct;
        if (est && typeof est === "object" && hasMeaningfulValue(est.bioquimica)) {
            return evaluateBooleanLikeCheck(est.bioquimica);
        }
        return "no_informado";
    }

    function evaluateSerologias(patient) {
        var est = patient && patient.analiticaEstruct;
        if (est && typeof est === "object") {
            var keys = ["serologiasVhb", "serologiasVhc", "serologiasVih"];
            var values = keys.map(function (k) { return est[k]; }).filter(hasMeaningfulValue);
            if (values.length > 0) {
                var statuses = values.map(evaluateBooleanLikeCheck);
                if (statuses.indexOf("alerta") !== -1) return "alerta";
                if (statuses.indexOf("pendiente") !== -1) return "pendiente";
                if (values.length < keys.length) return "no_informado";
                if (statuses.every(function (s) { return s === "ok" || s === "no_aplica"; })) return "ok";
                return "no_informado";
            }
            if (hasMeaningfulValue(est.serologias)) return evaluateBooleanLikeCheck(est.serologias);
        }

        var text = normalizeCheckString(patient && patient.analitica);
        if (/(serolog|vih|vhb|vhc).*(negativ|ok|apto|apta)/.test(text)) return "ok";
        if (/(serolog|vih|vhb|vhc).*(pendient|solicit|en curso|falta)/.test(text)) return "pendiente";
        if (/(serolog|vih|vhb|vhc).*(positiv|reactiv|revisar|alerta)/.test(text)) return "alerta";
        return "no_informado";
    }

    function evaluateTuberculosis(patient) {
        var est = patient && patient.analiticaEstruct;
        if (est && typeof est === "object") {
            var tbKeys = ["igra", "mantouxIgra", "cribadoTb", "tuberculosis", "tbScreening", "mantoux"];
            var tbStatuses = [];
            for (var i = 0; i < tbKeys.length; i++) {
                var key = tbKeys[i];
                if (hasMeaningfulValue(est[key])) {
                    tbStatuses.push(evaluateBooleanLikeCheck(est[key]));
                }
            }
            if (tbStatuses.length > 0) {
                if (tbStatuses.indexOf("alerta") !== -1) return "alerta";
                if (tbStatuses.indexOf("pendiente") !== -1) return "pendiente";
                if (tbStatuses.indexOf("ok") !== -1) return "ok";
                if (tbStatuses.indexOf("no_aplica") !== -1) return "no_aplica";
                return "no_informado";
            }
        }

        var text = normalizeCheckString(patient && patient.analitica);
        if (/(mantoux|igra|quantiferon|quanti feron|tubercul).*(negativ|ok|apto|apta)/.test(text)) return "ok";
        if (/(mantoux|igra|quantiferon|quanti feron|tubercul).*(pendient|solicit|en curso|falta)/.test(text)) return "pendiente";
        if (/(mantoux|igra|quantiferon|quanti feron|tubercul).*(positiv|revisar|alerta)/.test(text)) return "alerta";
        return "no_informado";
    }

    function evaluateVacunacion(patient) {
        function isExplicitlyOk(value) {
            if (value === true) return true;
            return evaluateBooleanLikeCheck(value) === "ok";
        }
        var est = patient && patient.analiticaEstruct;
        if (est && typeof est === "object" && hasMeaningfulValue(est.vacunacion)) {
            var vacEstruct = est.vacunacion;
            if (typeof vacEstruct === "object") {
                if (hasMeaningfulValue(vacEstruct.observaciones)) {
                    var obs = normalizeCheckString(vacEstruct.observaciones);
                    if (/(alerta|revisar|contraindic)/.test(obs)) return "alerta";
                }
                if (Array.isArray(vacEstruct.pendientes) && vacEstruct.pendientes.length > 0) return "pendiente";
                if (hasMeaningfulValue(vacEstruct.pendientes)) return "pendiente";
                if (isExplicitlyOk(vacEstruct.ok) || isExplicitlyOk(vacEstruct.si) || isExplicitlyOk(vacEstruct.revisada)) return "ok";
                return "no_informado";
            }
            return evaluateBooleanLikeCheck(est.vacunacion);
        }
        if (hasMeaningfulValue(patient && patient.vacunacion)) {
            var vac = patient.vacunacion;
            if (typeof vac === "object") {
                if (hasMeaningfulValue(vac.observaciones)) {
                    var obsVac = normalizeCheckString(vac.observaciones);
                    if (/(alerta|revisar|contraindic)/.test(obsVac)) return "alerta";
                }
                if (Array.isArray(vac.pendientes) && vac.pendientes.length > 0) return "pendiente";
                if (hasMeaningfulValue(vac.pendientes)) return "pendiente";
                if (isExplicitlyOk(vac.ok) || isExplicitlyOk(vac.si) || isExplicitlyOk(vac.revisada)) return "ok";
                return "no_informado";
            }
            return evaluateBooleanLikeCheck(patient.vacunacion);
        }

        var text = normalizeCheckString(patient && patient.analitica);
        if (/vacuna(cion)? .*(completa|completo|al dia|ok|apto|apta)/.test(text)) return "ok";
        if (/vacuna(cion)?.*(pendient|solicit|en curso|falta)/.test(text)) return "pendiente";
        if (/vacuna(cion)?.*(revisar|alerta|contraindic)/.test(text)) return "alerta";
        return "no_informado";
    }

    function evaluateMedicinaPreventiva(patient) {
        var candidates = [
            patient && patient.medicinaPreventiva,
            patient && patient.medicina_preventiva,
            patient && patient.preventiva,
            patient && patient.medicinaPreventivaEstado,
            patient && patient.preventivaEstado
        ];
        for (var i = 0; i < candidates.length; i++) {
            if (hasMeaningfulValue(candidates[i])) return evaluateBooleanLikeCheck(candidates[i]);
        }
        return "no_informado";
    }

    // ─── Status mapping ───

    function mapStatus(internalStatus) {
        switch (internalStatus) {
            case "ok":          return "complete";
            case "pendiente":   return "pending";
            case "alerta":      return "alert";
            case "no_aplica":   return "not_applicable";
            case "no_informado":
            default:            return "unknown";
        }
    }

    function isBlocking(status) {
        return status === "unknown" || status === "missing" || status === "pending" || status === "alert";
    }

    function buildCheck(category, label, internalStatus, detail) {
        var status = mapStatus(internalStatus);
        return {
            category: category,
            status: status,
            label: label,
            detail: detail || "",
            blocking: isBlocking(status)
        };
    }

    function computeOverall(checks) {
        var anyBlocker = checks.some(function (c) { return c.blocking; });
        if (anyBlocker) return "blocked";

        var allCompleteOrNA = checks.every(function (c) {
            return c.status === "complete" || c.status === "not_applicable";
        });
        if (allCompleteOrNA) return "complete";

        return "incomplete";
    }

    function buildSummary(overallStatus, checks, blockerLabels) {
        var labelMap = {
            complete: "Prebiol\u00f3gico completo",
            incomplete: "Prebiol\u00f3gico incompleto",
            blocked: "Prebiol\u00f3gico bloqueado"
        };
        var base = labelMap[overallStatus] || "Prebiol\u00f3gico no evaluable";
        if (overallStatus === "complete") return base + ". Listo para validaci\u00f3n.";
        if (overallStatus === "incomplete") return base + ". Pendiente de datos.";
        var listed = blockerLabels.slice(0, 5).join("; ");
        var extra = blockerLabels.length > 5 ? " (y " + (blockerLabels.length - 5) + " m\u00e1s)" : "";
        return base + ": " + blockerLabels.length + " bloqueo" + (blockerLabels.length === 1 ? "" : "s") + " \u2014 " + listed + extra + ".";
    }

    // ─── Public API ───

    function evaluatePatientPrebiologico(patient) {
        if (patient === undefined || patient === null) {
            return {
                overallStatus: "blocked",
                canValidate: false,
                checks: [],
                blockers: [],
                blockerLabels: [],
                summaryText: "Paciente no proporcionado",
                patientNotFound: true
            };
        }

        if (hasMeaningfulValue(patient.cip) && patient.__explicitCipNotFound === true) {
            return {
                overallStatus: "blocked",
                canValidate: false,
                checks: [],
                blockers: [],
                blockerLabels: [],
                summaryText: "Paciente no encontrado: CIP " + patient.cip,
                patientNotFound: true
            };
        }

        var input = patient;

        var checks = [
            buildCheck("analitica", "Anal\u00edtica reciente", evaluateAnalitica(input), "Evaluaci\u00f3n general de anal\u00edtica"),
            buildCheck("hemograma", "Hemograma", evaluateHemograma(input), "Hemograma"),
            buildCheck("bioquimica", "Bioqu\u00edmica", evaluateBioquimica(input), "Bioqu\u00edmica"),
            buildCheck("serologias", "Serolog\u00edas VHB/VHC/VIH", evaluateSerologias(input), "Serolog\u00edas v\u00edricas"),
            buildCheck("tuberculosis", "Mantoux/IGRA", evaluateTuberculosis(input), "Prueba de tuberculosis latente"),
            buildCheck("vacunacion", "Vacunaci\u00f3n", evaluateVacunacion(input), "Calendario vacunal"),
            buildCheck("medicinaPreventiva", "Medicina preventiva", evaluateMedicinaPreventiva(input), "Medicina preventiva")
        ];

        var blockers = checks
            .filter(function (c) { return c.blocking; })
            .map(function (c) {
                return {
                    category: c.category,
                    label: c.label,
                    status: c.status,
                    detail: c.detail
                };
            });

        var blockerLabels = checks
            .filter(function (c) { return c.blocking; })
            .map(function (c) { return c.label + ": " + c.status; });

        var overallStatus = computeOverall(checks);
        var canValidate = overallStatus === "complete";
        var summaryText = buildSummary(overallStatus, checks, blockerLabels);

        var result = {
            overallStatus: overallStatus,
            canValidate: canValidate,
            checks: checks,
            blockers: blockers,
            blockerLabels: blockerLabels,
            summaryText: summaryText
        };

        if (!hasMeaningfulValue(patient.cip)) {
            result.fallbackLegacy = true;
        }

        return result;
    }

    var publicApi = {
        evaluatePatientPrebiologico: evaluatePatientPrebiologico
    };

    if (typeof window !== "undefined") {
        window.FarmaciaPrebiologico = publicApi;
    }
})();
