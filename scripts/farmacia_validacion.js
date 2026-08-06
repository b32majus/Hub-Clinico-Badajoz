"use strict";

(function () {
    var F = window.FarmaciaDemo;
    var C = window.FarmaciaCatalog;
    var M = window.FarmaciaValidationModel;
    var P = window.FarmaciaPautasCatalog;
    var modoActual = null;
    var autocompleteActiveIndex = -1;
    var manualRequestedAutocompleteActiveIndex = -1;
    var manualRequestedTransientProposal = null;
    var currentPatient = null;
    var otherDrugs = [];
    var otherDrugRowSeq = 0;

    var RELATION_OPTIONS = [
        'Biológico activo adicional',
        'Biológico previo/histórico',
        'Concomitante',
        'Exposición'
    ];
    var EA_SUSPECT_OPTIONS = ["No consta", "No", "Sí"];
    var VIA_OPTIONS = ["", "SC", "IV", "Oral", "IM", "Otra"];
    var NARANJO_IDS = [
        "naranjoQ1", "naranjoQ2", "naranjoQ3", "naranjoQ4", "naranjoQ5",
        "naranjoQ6", "naranjoQ7", "naranjoQ8", "naranjoQ9", "naranjoQ10"
    ];
    var KL_IDS = [
        "klTemporal", "klConocido", "klAlternativa", "klSuspendido",
        "klMejoraRetirada", "klReadministracion", "klReaparece"
    ];
    var KL_TO_FINAL = {
        "Definida": "Definida",
        "Probable": "Probable",
        "Posible": "Posible",
        "Condicional": "No clasificable",
        "Sin relación": "Dudosa / sin relación",
        "No clasificable": "No clasificable"
    };
    var NARANJO_TO_FINAL = {
        "Definitiva": "Definida",
        "Probable": "Probable",
        "Posible": "Posible",
        "Dudosa": "Dudosa / sin relación"
    };
    var SERVICIO_PATOLOGIAS = {
        derma: ['Hidradenitis supurativa', 'Psoriasis', 'Dermatitis atópica', 'Vitíligo', 'Alopecia areata'],
        reuma: ['AR', 'APs', 'EspAax', 'LES'],
        digestivo: ['Crohn', 'Colitis ulcerosa']
    };
    var REUMA_DEFAULT = {
        cip: "",
        patologia: "",
        farmaco: "",
        principioActivo: "",
        dosis: "",
        via: "",
        pauta: "",
        induccion: "",
        justificacion: ""
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        var el = byId(id);
        if (el) el.textContent = value;
    }

    function valueOrDash(value) {
        return value === null || value === undefined || String(value).trim() === "" ? "—" : String(value).trim();
    }

    function formatMissingForPharmacy(value) {
        if (value === null || value === undefined || String(value).trim() === "") return "Pendiente de completar por Farmacia";
        return String(value).trim();
    }

    function currentOrigenEntradaValue() {
        var el = byId("fhOrigenEntrada");
        return el ? (el.value || "") : "";
    }

    function isManualOrigin() {
        return currentOrigenEntradaValue() === "manual_farmacia";
    }

    function currentManualService() {
        var el = byId("fhServicioManual");
        return el ? (el.value || "") : "";
    }

    function currentManualPatologia() {
        var el = byId("fhPatologiaManual");
        return el ? (el.value || "") : "";
    }

    function manualSelectionReady() {
        return !!(currentManualService() && currentManualPatologia());
    }

    function mapServiceToken(value) {
        var raw = String(value || "").trim().toLowerCase();
        if (raw === "derma" || raw === "dermatologia" || raw === "dermatología") return "derma";
        if (raw === "reuma" || raw === "reumatologia" || raw === "reumatología") return "reuma";
        if (raw === "digestivo") return "digestivo";
        return "";
    }

    function serviceSlugFromMode(mode) {
        if (mode === "reuma") return "reumatologia";
        if (mode === "digestivo") return "digestivo";
        return "dermatologia";
    }

    function serviceLabelFromMode(mode) {
        if (mode === "reuma") return "Reumatología";
        if (mode === "digestivo") return "Digestivo";
        return "Dermatología";
    }

    function requestedFieldIds() {
        if (isManualOrigin()) {
            return {
                cip: "fhManualCip",
                fecha: "fhManualFecha",
                farmaco: "fhManualFarmaco",
                principioActivo: "fhManualPrincipioActivo",
                dosis: "fhManualDosis",
                via: "fhManualVia",
                pauta: "fhManualPauta",
                pautaOtro: "fhManualPautaOtro",
                induccion: "fhManualInduccion",
                peso: "fhManualPeso",
                justificacion: "fhManualJustificacion",
                observaciones: "fhManualObservaciones"
            };
        }
        var mode = modoActual || resolveModoFromOrigen(currentOrigenEntradaValue());
        if (mode === "digestivo") {
            return {
                cip: "fhDigCip",
                fecha: "fhDigFecha",
                farmaco: "fhDigFarmaco",
                principioActivo: "",
                dosis: "fhDigDosis",
                via: "fhDigVia",
                pauta: "fhDigPauta",
                pautaOtro: "fhDigPautaOtro",
                induccion: "",
                peso: "",
                justificacion: "",
                observaciones: "fhDigObservaciones"
            };
        }
        return {
            cip: "fhDermaCip",
            fecha: "fhDermaFecha",
            farmaco: "fhDermaFarmaco",
            principioActivo: "fhDermaPrincipioActivo",
            dosis: "fhDermaDosis",
            via: "fhDermaVia",
            pauta: "fhDermaPauta",
            pautaOtro: "fhDermaPautaOtro",
            induccion: "fhDermaInduccion",
            peso: "fhDermaPeso",
            justificacion: "fhDermaJustificacion",
            observaciones: "fhDermaObservaciones"
        };
    }

    function setManualContextDisplay() {
        var serviceDisplay = byId("fhManualServicioDisplay");
        var patDisplay = byId("fhManualPatologiaDisplay");
        if (serviceDisplay) serviceDisplay.value = currentManualService() ? serviceLabelFromMode(currentManualService()) : "Seleccione servicio arriba";
        if (patDisplay) patDisplay.value = currentManualPatologia() || "Seleccione patología arriba";
    }

    function createEl(tag, className, text) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    }

    function buildSelect(id, className, options, value) {
        var select = createEl("select", className || "form-select");
        if (id) select.id = id;
        options.forEach(function (option) {
            var opt = document.createElement("option");
            if (typeof option === "string") {
                opt.value = option;
                opt.textContent = option;
            } else {
                opt.value = option.value;
                opt.textContent = option.label;
            }
            if (opt.value === value) opt.selected = true;
            select.appendChild(opt);
        });
        return select;
    }

    function populatePautaSelect(id, otroId) {
        var select = byId(id);
        var otro = byId(otroId);
        if (!select) return;
        F.clearChildren(select);
        var placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Seleccionar...";
        select.appendChild(placeholder);
        if (P && typeof P.getPautaOptions === "function") {
            P.getPautaOptions().forEach(function (opt) {
                var option = document.createElement("option");
                option.value = opt.value;
                option.textContent = opt.label;
                select.appendChild(option);
            });
        } else {
            console.warn("[farmacia_validacion] FarmaciaPautasCatalog no disponible para poblar pautas.");
        }
        select.addEventListener("change", function () {
            if (otro) {
                otro.classList.toggle("hidden", select.value !== "OTRO");
                if (select.value !== "OTRO") otro.value = "";
            }
        });
    }

    function activeDermaPathology() {
        if (isManualOrigin()) return currentManualService() === "derma" ? currentManualPatologia() : "";
        if ((modoActual || resolveModoFromOrigen(currentOrigenEntradaValue())) !== "derma") return "";
        var control = byId("fhDermaPatologia");
        return control ? (control.value || "") : "";
    }

    function isHSPathology() {
        return activeDermaPathology() === "Hidradenitis supurativa";
    }

    function setChecked(id, value) {
        var el = byId(id);
        if (el) el.checked = !!value;
    }

    function selectedCip() {
        return visibleCipForExport();
    }

    function selectedPatologia() {
        if (isManualOrigin()) return currentManualPatologia() || "—";
        var mode = modoActual || resolveModoFromOrigen(currentOrigenEntradaValue());
        if (mode === "reuma") {
            return currentPatient && currentPatient.patologia ? currentPatient.patologia : "";
        }
        return valueOrDash(visiblePatologiaForExport());
    }

    function estadoLabel() {
        var estado = byId("fhValEstado").value;
        if (estado === "validated") return "Validado";
        if (estado === "denied") return "Denegado";
        return "Pendiente";
    }

    function toggleHSBlock() {
        var pathology = activeDermaPathology();
        var blocks = {
            "Hidradenitis supurativa": "formHS",
            "Psoriasis": "formPsoriasis",
            "Dermatitis atópica": "formDermatitisAtopica",
            "Vitíligo": "formVitiligo",
            "Alopecia areata": "formAlopecia"
        };
        Object.keys(blocks).forEach(function (name) {
            var block = byId(blocks[name]);
            if (block) block.classList.toggle("hidden", pathology !== name);
        });
        var common = byId("formDermaComorbilidades");
        if (common) common.classList.toggle("hidden", !blocks[pathology]);
        toggleDermaConditionalDetails();
        toggleBioAdaDetalle();
        toggleBioOtrosDetalle();
    }

    function toggleDermaConditionalDetails() {
        [["fhPsSistemicoPrevio", "fhPsSistemicoSiDetalle", "fhPsSistemicoNoDetalle"],
            ["fhDaCiclosporinaPrevia", "fhDaCiclosporinaSiDetalle", "fhDaCiclosporinaNoDetalle"]]
            .forEach(function (ids) {
                var decision = byId(ids[0]);
                var yesRow = byId(ids[1]);
                var noRow = byId(ids[2]);
                if (yesRow) yesRow.classList.toggle("hidden", !decision || decision.value !== "si");
                if (noRow) noRow.classList.toggle("hidden", !decision || decision.value !== "no");
            });
    }

    function dermaValue(id) {
        var el = byId(id);
        var value = el && el.value !== undefined ? String(el.value).trim() : "";
        return value || "No informado";
    }

    function dermaDecision(id) {
        var el = byId(id);
        return el && el.value === "si" ? "Sí" : (el && el.value === "no" ? "No" : "No informado");
    }

    function legacyDecision(id) {
        var el = byId(id);
        return el && el.checked ? "Sí" : "No informado";
    }

    function buildDermaClinicalSummary() {
        var pathology = activeDermaPathology();
        if (!pathology) return { active: false, pathology: "", specific: [], common: [], lines: [], summary: "" };
        var specific = [];
        var add = function (label, value) { specific.push({ label: label, value: value }); };
        if (pathology === "Hidradenitis supurativa") {
            add("IHS4", dermaValue("fhHSIhs4")); add("Hurley", dermaValue("fhHSHurley")); add("DLQI", dermaValue("fhHSDlqi"));
            add("Localización principal", dermaValue("fhHSLocalizacion")); add("Tiempo de evolución", dermaValue("fhHSTiempoEvolucion"));
            var antibiotics = ["Doxiciclina / Clindamicina: " + legacyDecision("fhHSTtoDoxiClinda"), "Rifampicina + Clindamicina: " + legacyDecision("fhHSTtoRifClinda"), "Otros ATB: " + legacyDecision("fhHSTtoOtrosAb")];
            if (legacyDecision("fhHSTtoOtrosAb") === "Sí") antibiotics.push("Detalle otros ATB: " + dermaValue("fhHSTtoOtrosAbTxt"));
            if (dermaValue("fhHSTratamientosPrevios") !== "No informado") antibiotics.push("Detalle previo: " + dermaValue("fhHSTratamientosPrevios"));
            add("Tratamientos antibióticos previos", antibiotics.join("; "));
            var biologics = ["Adalimumab: " + legacyDecision("fhHSBioAda"), "Otros biológicos: " + legacyDecision("fhHSBioOtros")];
            if (legacyDecision("fhHSBioAda") === "Sí") biologics.push("Duración adalimumab: " + dermaValue("fhHSBioAdaDuracion"), "Motivo fin adalimumab: " + dermaValue("fhHSBioAdaMotivo"));
            if (legacyDecision("fhHSBioOtros") === "Sí") biologics.push("Fármaco: " + dermaValue("fhHSBioOtrosFarmaco"), "Motivo suspensión: " + dermaValue("fhHSBioOtrosMotivo"));
            add("Biológicos previos", biologics.join("; ")); add("Motivo clínico / línea terapéutica", dermaValue("fhHSMotivoClinico"));
        } else if (pathology === "Psoriasis") {
            add("PASI", dermaValue("fhPsPasi")); add("BSA", dermaValue("fhPsBsa")); add("DLQI", dermaValue("fhPsDlqi")); add("PGA", dermaValue("fhPsPga"));
            var psDecision = dermaDecision("fhPsSistemicoPrevio"); add("Tratamiento sistémico previo", psDecision);
            if (psDecision === "Sí") { add("Fármaco previo", dermaValue("fhPsSistemicoFarmaco")); add("Duración", dermaValue("fhPsSistemicoDuracion")); add("Motivo de cambio/suspensión", dermaValue("fhPsSistemicoMotivo")); }
            if (psDecision === "No") add("Motivo de no utilización o contraindicación", dermaValue("fhPsSistemicoNoMotivo"));
        } else if (pathology === "Dermatitis atópica") {
            add("EASI", dermaValue("fhDaEasi")); add("SCORAD", dermaValue("fhDaScorad")); add("DLQI o POEM", dermaValue("fhDaDlqiPoem"));
            var daDecision = dermaDecision("fhDaCiclosporinaPrevia"); add("Ciclosporina previa", daDecision);
            if (daDecision === "Sí") { add("Dosis", dermaValue("fhDaCiclosporinaDosis")); add("Duración", dermaValue("fhDaCiclosporinaDuracion")); add("Motivo de suspensión", dermaValue("fhDaCiclosporinaMotivo")); }
            if (daDecision === "No") add("Motivo de no utilización o contraindicación", dermaValue("fhDaCiclosporinaNoMotivo"));
        } else if (pathology === "Vitíligo") {
            add("Extensión afectada", dermaValue("fhVitExtension")); add("Afectación facial", dermaDecision("fhVitFacial")); add("Inhibidor tópico de calcineurina previo", dermaDecision("fhVitCalcineurinaPrevia")); add("Corticoides tópicos previos", dermaDecision("fhVitCorticoidesPrevios")); add("Observaciones clínicas", dermaValue("fhVitObservaciones"));
        } else if (pathology === "Alopecia areata") {
            add("Extensión superior al 50 % del cuero cabelludo", dermaDecision("fhAaExtension50")); add("Episodio actual superior a 6 meses", dermaDecision("fhAaEpisodio6Meses")); add("Corticoesteroides orales sistémicos en monoterapia o con inmunosupresores", dermaDecision("fhAaCorticoidesSistemicos")); add("Observaciones clínicas", dermaValue("fhAaObservaciones"));
        } else return { active: false, pathology: "", specific: [], common: [], lines: [], summary: "" };
        var common = [
            { label: "IMC", value: dermaValue("fhHSComorbImc") }, { label: "Tabaquismo", value: dermaValue("fhHSComorbTabaquismo") },
            { label: "Paquetes/año", value: dermaValue("fhHSComorbPaquetes") }, { label: "Diabetes", value: dermaDecision("fhHSComorbDiabetes") },
            { label: "HbA1c", value: dermaValue("fhHSComorbHba1c") }, { label: "Síndrome metabólico", value: dermaDecision("fhHSComorbSdMetabolico") },
            { label: "Infecciones recurrentes", value: dermaDecision("fhDermaComorbInfeccionesRecurrentes") },
            { label: "Riesgo o antecedentes cardiovasculares", value: dermaDecision("fhDermaComorbRiesgoCardiovascular") },
            { label: "Alteraciones neurológicas", value: dermaDecision("fhDermaComorbAlteracionesNeurologicas") },
            { label: "Antecedentes o riesgo de neoplasia", value: dermaDecision("fhDermaComorbRiesgoNeoplasia") },
            { label: "Otras comorbilidades", value: dermaValue("fhHSComorbOtras") }
        ];
        var lines = ["DATOS CLÍNICOS DE ORIGEN — " + pathology];
        specific.forEach(function (field) { lines.push(field.label + ": " + field.value); });
        lines.push("", "COMORBILIDADES DERMATOLOGÍA");
        common.forEach(function (field) { lines.push(field.label + ": " + field.value); });
        return { active: true, pathology: pathology, specific: specific, common: common, lines: lines, summary: lines.join("\n") };
    }

    function buildExcelGeneralObservations(context, dermaSummary) {
        context = context || {};
        var mode = isManualOrigin() ? currentManualService() : (modoActual || resolveModoFromOrigen(currentOrigenEntradaValue()));
        var sourceId = isManualOrigin() ? "fhManualObservaciones" : (mode === "derma" ? "fhDermaObservaciones" : (mode === "digestivo" ? "fhDigObservaciones" : ""));
        var existing = context.observaciones || (!isManualOrigin() && mode === "reuma" && context.patient && context.patient.observaciones) || "";
        var requestedJustification = requestedJustificationForExport();
        var otrasObservacionesActo = visibleElementValue("fhValObservaciones");
        var values = [
            existing,
            sourceId ? visibleElementValue(sourceId) : "",
            requestedJustification ? "Justificación clínica solicitada: " + requestedJustification : "",
            dermaSummary || "",
            otrasObservacionesActo ? "Otras observaciones del acto de validación: " + otrasObservacionesActo : ""
        ];
        var unique = [];
        values.forEach(function (value) {
            var text = explicitExportValue(value);
            if (text && unique.indexOf(text) === -1) unique.push(text);
        });
        return unique.join("\n\n");
    }

    function toggleBioAdaDetalle() {
        var cb = byId("fhHSBioAda");
        var detalle = byId("fhHSBioAdaDetalle");
        if (cb && detalle) detalle.classList.toggle("hidden", !cb.checked);
    }

    function toggleBioOtrosDetalle() {
        var cb = byId("fhHSBioOtros");
        var detalle = byId("fhHSBioOtrosDetalle");
        if (cb && detalle) detalle.classList.toggle("hidden", !cb.checked);
    }

    function toggleOtrosAtbDetalle() {
        var cb = byId("fhHSTtoOtrosAb");
        var row = byId("fhHSTtoOtrosAbTxtRow");
        if (cb && row) {
            row.classList.toggle("hidden", !cb.checked);
            if (!cb.checked) byId("fhHSTtoOtrosAbTxt").value = "";
        }
    }

    function resolveModoFromOrigen(origen) {
        if (origen === "derma" || origen === "reuma" || origen === "digestivo") return origen;
        if (origen === "excel_enfermeria") return "reuma";
        if (origen === "manual_farmacia") return byId("fhServicioManual") ? byId("fhServicioManual").value || "" : "";
        if (origen === "demo_formacion") return "derma";
        return "derma";
    }

    function formatImportedDate(rawValue) {
        var raw = String(rawValue || "").trim();
        if (!raw) return "";
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            var parts = raw.split("-");
            return parts[2] + "/" + parts[1] + "/" + parts[0];
        }
        if (/^\d+(?:\.\d+)?$/.test(raw)) {
            var serial = Number(raw);
            if (!isNaN(serial) && serial > 0) {
                var utcDays = Math.floor(serial - 25569);
                var utcValue = utcDays * 86400;
                var date = new Date(utcValue * 1000);
                if (!isNaN(date.getTime())) {
                    var day = String(date.getUTCDate()).padStart(2, "0");
                    var month = String(date.getUTCMonth() + 1).padStart(2, "0");
                    return day + "/" + month + "/" + date.getUTCFullYear();
                }
            }
        }
        return raw;
    }

    function setDermaFormReadonly(readonly) {
        var fields = ["fhDermaCip", "fhDermaPatologia", "fhDermaFecha", "fhDermaFarmaco",
            "fhDermaDosis", "fhDermaPrincipioActivo", "fhDermaVia", "fhDermaPauta",
            "fhDermaPautaOtro", "fhDermaInduccion", "fhDermaPeso", "fhDermaJustificacion",
            "fhDermaObservaciones", "fhDermaAnalitica"];
        fields.forEach(function (id) {
            var el = byId(id);
            if (!el) return;
            if (readonly) el.setAttribute("readonly", "readonly");
            else el.removeAttribute("readonly");
        });
        var pat = byId("fhDermaPatologia");
        if (pat) pat.disabled = readonly;
    }

    function mostrarFormulario(modo) {
        var origen = modo || (byId("fhOrigenEntrada") ? byId("fhOrigenEntrada").value : "");
        modoActual = resolveModoFromOrigen(origen);
        var isManual = origen === "manual_farmacia";
        var manualReady = isManual && manualSelectionReady();
        byId("formServicioManual").classList.toggle("hidden", !isManual);
        byId("formManualSolicitud").classList.toggle("hidden", !manualReady);
        byId("validationBlock").classList.toggle("hidden", isManual ? !manualReady : false);
        byId("formDerma").classList.toggle("hidden", isManual || modoActual !== "derma");
        byId("formReuma").classList.toggle("hidden", isManual || modoActual !== "reuma");
        byId("formDigestivo").classList.toggle("hidden", isManual || modoActual !== "digestivo");
        if (isManual && manualReady && !byId("fhManualFecha").value) {
            byId("fhManualFecha").value = new Date().toISOString().slice(0, 10);
        }
        if (!isManual && modoActual === "derma" && !byId("fhDermaFecha").value) {
            byId("fhDermaFecha").value = new Date().toISOString().slice(0, 10);
        }
        if (!isManual && modoActual === "digestivo" && !byId("fhDigFecha").value) {
            byId("fhDigFecha").value = new Date().toISOString().slice(0, 10);
        }
        setDermaFormReadonly(isManual);
        setManualContextDisplay();
        toggleHSBlock();
        updateValidationModuleSummaries();
        updateSeguimientoHandoffLink();
        toggleCausalityModules();
    }

    function explicitRequestedDrug(patient) {
        if (!patient) return "";
        return patient.farmaco_solicitado
            || (patient.solicitud && patient.solicitud.requested_drug_name)
            || (patient.rawImport && patient.rawImport.farmaco_solicitado) || "";
    }

    function hydrateReumaForm(patient) {
        setText("fhReumaCip", patient && patient.cip ? patient.cip : "—");
        setText("fhReumaPatologia", patient && patient.patologia ? patient.patologia : "—");
        setText("fhReumaIndicacion", patient && patient.patologia_indicacion ? patient.patologia_indicacion : "—");
        setText("fhReumaOrigen", patient && patient.origen_solicitud ? "Excel Enfermería" : (patient && patient.tipo_origen ? "Enfermería / Inicio biológico" : "—"));
        setText("fhReumaFecha", patient && patient.fecha_solicitud ? patient.fecha_solicitud : "Pendiente de completar por Farmacia");
        setText("fhReumaFarmaco", explicitRequestedDrug(patient) || "—");
        setText("fhReumaDosis", patient && patient.dosis ? patient.dosis : "Pendiente de completar por Farmacia");
        setText("fhReumaVia", patient && patient.via ? patient.via : "Pendiente de completar por Farmacia");
        setText('fhReumaPauta', patient && patient.pauta ? patient.pauta : 'Pendiente de completar por Farmacia');
    }

    function inferOrigenEntrada(context) {
        if (context.patient && F && typeof F.isEnfermeriaPatient === 'function' && F.isEnfermeriaPatient(context.patient)) {
            return 'excel_enfermeria';
        }
        if (context.patient && context.patient.cip && String(context.patient.cip).indexOf('CIP-DEMO-FH') !== -1) {
            return 'demo_formacion';
        }
        if (context.patient && context.patient.__farmaciaRawPatient) {
            return mapServiceToken(context.servicioSlug || context.servicio) || 'manual_farmacia';
        }
        if (context.cip || context.servicio || context.patologia) {
            return 'manual_farmacia';
        }
        return 'manual_farmacia';
    }

    function setOrigenEntrada(value) {
        var sel = byId('fhOrigenEntrada');
        if (!sel) return;
        sel.value = value;
    }

    function setTipoValidacion(value) {
        var sel = byId('fhTipoValidacion');
        if (!sel) return;
        sel.value = value || 'inicio_nuevo';
    }

    function onServicioManualChange() {
        var serv = byId('fhServicioManual');
        var pat = byId('fhPatologiaManual');
        if (!serv || !pat) return;
        var val = serv.value;
        F.clearChildren(pat);
        var opts = val ? SERVICIO_PATOLOGIAS[val] : null;
        if (!opts) {
            var ph = document.createElement('option');
            ph.value = ''; ph.textContent = 'Seleccionar servicio primero...';
            pat.appendChild(ph);
            setManualContextDisplay();
            mostrarFormulario('manual_farmacia');
            return;
        }
        var def = document.createElement('option');
        def.value = ''; def.textContent = 'Seleccionar patología...';
        pat.appendChild(def);
        opts.forEach(function (p) {
            var o = document.createElement('option');
            o.textContent = p;
            pat.appendChild(o);
        });
        modoActual = val;
        setManualContextDisplay();
        mostrarFormulario('manual_farmacia');
    }

    function onPatologiaManualChange() {
        setManualContextDisplay();
        mostrarFormulario('manual_farmacia');
        toggleHSBlock();
        updateValidationModuleSummaries();
    }

    function applyContext() {
        var context = F.getQueryContext();
        currentPatient = context.patient || null;
        var origen = inferOrigenEntrada(context);
        setOrigenEntrada(origen);
        setTipoValidacion(context.patient && context.patient.tipo_validacion ? context.patient.tipo_validacion : 'inicio_nuevo');
        if (origen === 'manual_farmacia') {
            var mappedService = mapServiceToken(context.servicioSlug || context.servicio);
            if (mappedService && byId('fhServicioManual')) {
                byId('fhServicioManual').value = mappedService;
                onServicioManualChange();
            }
            if (context.patologia && byId('fhPatologiaManual')) {
                var patManual = byId('fhPatologiaManual');
                var foundManual = false;
                for (var mi = 0; mi < patManual.options.length; mi++) {
                    if (patManual.options[mi].value === context.patologia || patManual.options[mi].textContent === context.patologia) {
                        patManual.value = patManual.options[mi].value || context.patologia;
                        foundManual = true;
                        break;
                    }
                }
                if (!foundManual && mappedService) {
                    var extraOpt = document.createElement('option');
                    extraOpt.value = context.patologia;
                    extraOpt.textContent = context.patologia;
                    extraOpt.selected = true;
                    patManual.appendChild(extraOpt);
                }
            }
            if (context.cip) F.setValue('fhManualCip', context.cip);
            setManualContextDisplay();
        }

        if (context.cip) F.setValue('fhDermaCip', context.cip);
        if (context.patologia) F.setValue('fhDermaPatologia', context.patologia);

        var isEnfPatient = currentPatient && F && typeof F.isEnfermeriaPatient === 'function'
            && F.isEnfermeriaPatient(currentPatient);
        if (context.patient) {
            var p = context.patient;
            var rawRequest = p.__farmaciaRawPatient ? (p.solicitud || {}) : null;
            var requestedDrug = rawRequest ? rawRequest.requested_drug_name : p.farmaco;
            var requestedDose = rawRequest ? rawRequest.requested_dose_text : p.dosis;
            var requestedSchedule = rawRequest ? (rawRequest.requested_schedule_label || rawRequest.requested_schedule_other_text) : p.pauta;
            var requestedRoute = rawRequest ? rawRequest.requested_route : p.via;
            if (!isEnfPatient) F.setValue('fhDermaFarmaco', requestedDrug);
            if (!isEnfPatient) F.setValue('fhDermaDosis', requestedDose);
            if (!isEnfPatient && requestedSchedule) {
                var pautaObj = P && typeof P.normalizePautaLabel === 'function' ? P.normalizePautaLabel(requestedSchedule) : null;
                F.setValue('fhDermaPauta', pautaObj ? pautaObj.pauta_codigo : '');
                if (pautaObj && pautaObj.pauta_codigo === 'OTRO' && pautaObj.pauta_otro_texto) {
                    F.setValue('fhDermaPautaOtro', pautaObj.pauta_otro_texto);
                    byId('fhDermaPautaOtro').classList.remove('hidden');
                } else {
                    F.setValue('fhDermaPautaOtro', '');
                    byId('fhDermaPautaOtro').classList.add('hidden');
                }
            }
            if (!isEnfPatient) F.setValue('fhDermaVia', mapViaToSelect(requestedRoute, byId('fhDermaVia')));
            if (rawRequest) {
                F.setValue('fhDermaFecha', rawRequest.request_date);
                F.setValue('fhDermaPrincipioActivo', rawRequest.requested_active_ingredient);
                F.setValue('fhDermaPeso', rawRequest.requested_weight_text);
                F.setValue('fhDermaJustificacion', rawRequest.requested_justification);
                F.setValue('fhDermaObservaciones', rawRequest.request_source_observations);
                F.setValue('fhDermaInduccion', rawRequest.requested_induction_status === 'yes' ? 'si' : (rawRequest.requested_induction_status === 'no' ? 'no' : ''));
            }
            F.setValue('fhDermaAnalitica', p.analitica);
            if (p.estado === 'pending') F.setValue('fhValEstado', 'pending');
            if (p.estado === 'validated') F.setValue('fhValEstado', 'validated');
            if (p.ihs4 !== undefined) F.setValue('fhHSIhs4', p.ihs4);
            if (p.hurley) F.setValue('fhHSHurley', p.hurley);
            if (p.dlqi !== undefined) F.setValue('fhHSDlqi', p.dlqi);
            if (p.localizacion) F.setValue('fhHSLocalizacion', p.localizacion);
            if (p.tiempoEvolucion) F.setValue('fhHSTiempoEvolucion', p.tiempoEvolucion);
            if (p.tratamientosPrevios) F.setValue('fhHSTratamientosPrevios', p.tratamientosPrevios);
            if (p.motivoClinico) F.setValue('fhHSMotivoClinico', p.motivoClinico);
            if (!isEnfPatient && p.principioActivo) F.setValue('fhDermaPrincipioActivo', p.principioActivo);

            if (p.__farmaciaRawPatient && p.validacion) {
                var rawValidation = p.validacion;
                F.setValue('fhValEstado', rawValidation.validation_result === 'validated' ? 'validated' : (rawValidation.validation_result === 'denied' ? 'denied' : (rawValidation.validation_result === 'pending' ? 'pending' : '')));
                F.setValue('fhValPendingReason', rawValidation.validation_pending_reason);
                F.setValue('fhValMotivo', rawValidation.validation_denial_reason);
                F.setValue('fhValidadoFarmaco', rawValidation.validated_drug_name);
                F.setValue('fhValidadoPrincipioActivo', rawValidation.validated_active_ingredient);
                F.setValue('fhValidadoPresentacion', rawValidation.validated_presentation);
                F.setValue('fhValidadoDosis', rawValidation.validated_dose_text);
                F.setValue('fhValidadoVia', mapViaToSelect(rawValidation.validated_route, byId('fhValidadoVia')));
                F.setValue('fhValidadoPauta', rawValidation.validated_schedule_code);
                F.setValue('fhValidadoPautaOtro', rawValidation.validated_schedule_other_text);
                F.setValue('fhValidadoInduccion', rawValidation.validated_induction_status === 'yes' ? 'si' : (rawValidation.validated_induction_status === 'no' ? 'no' : ''));
                F.setValue('fhValidatedTreatmentRelation', rawValidation.validated_treatment_relation);
            }

            if (p.tratamientosPreviosHS) {
                var hsTto = p.tratamientosPreviosHS;
                setChecked('fhHSTtoDoxiClinda', hsTto.doxiciclinaClindamicina);
                setChecked('fhHSTtoRifClinda', hsTto.rifampicinaClindamicina);
                setChecked('fhHSTtoOtrosAb', hsTto.otrosAtb);
                if (hsTto.otrosAtbTexto) F.setValue('fhHSTtoOtrosAbTxt', hsTto.otrosAtbTexto);
                toggleOtrosAtbDetalle();
            }

            if (p.biologicosPrevios) {
                var hsBio = p.biologicosPrevios;
                setChecked('fhHSBioAda', hsBio.adalimumab);
                if (hsBio.adalimumabDuracion) F.setValue('fhHSBioAdaDuracion', hsBio.adalimumabDuracion);
                if (hsBio.adalimumabMotivo) F.setValue('fhHSBioAdaMotivo', hsBio.adalimumabMotivo);
                setChecked('fhHSBioOtros', hsBio.otrosBiologicos);
                if (hsBio.otrosBiologicosFarmaco) F.setValue('fhHSBioOtrosFarmaco', hsBio.otrosBiologicosFarmaco);
                if (hsBio.otrosBiologicosMotivo) F.setValue('fhHSBioOtrosMotivo', hsBio.otrosBiologicosMotivo);
            }

            if (p.analiticaEstruct) {
                var an = p.analiticaEstruct;
                if (an.fecha) F.setValue('fhAnaliticaFecha', an.fecha);
                if (an.reciente) F.setValue('fhAnaliticaReciente', an.reciente);
                setChecked('fhAnaliticaHemograma', an.hemograma);
                setChecked('fhAnaliticaBioquimica', an.bioquimica);
                if (an.mantoux) F.setValue('fhAnaliticaMantoux', an.mantoux);
                if (an.serologiasVhb) F.setValue('fhAnaliticaSerologiasVhb', an.serologiasVhb);
                if (an.serologiasVhc) F.setValue('fhAnaliticaSerologiasVhc', an.serologiasVhc);
                if (an.serologiasVih) F.setValue('fhAnaliticaSerologiasVih', an.serologiasVih);
                if (!an.serologiasVhb && !an.serologiasVhc && !an.serologiasVih && an.serologias) {
                    F.setValue('fhAnaliticaSerologiasVhb', an.serologias);
                    F.setValue('fhAnaliticaSerologiasVhc', an.serologias);
                    F.setValue('fhAnaliticaSerologiasVih', an.serologias);
                }
                if (an.vacunacion) F.setValue('fhAnaliticaVacunacion', an.vacunacion);
                if (an.observaciones) F.setValue('fhAnaliticaObservaciones', an.observaciones);
            }

            if (p.comorbilidades) {
                var com = p.comorbilidades;
                if (com.imc) F.setValue('fhHSComorbImc', com.imc);
                if (com.tabaquismo) F.setValue('fhHSComorbTabaquismo', com.tabaquismo);
                if (com.paquetesAno) F.setValue('fhHSComorbPaquetes', com.paquetesAno);
                if (com.diabetes) F.setValue('fhHSComorbDiabetes', com.diabetes);
                if (com.hba1c) F.setValue('fhHSComorbHba1c', com.hba1c);
                if (com.sindromeMetabolico) F.setValue('fhHSComorbSdMetabolico', com.sindromeMetabolico);
                if (com.otras) F.setValue('fhHSComorbOtras', com.otras);
            }
        }

        mostrarFormulario();
        toggleHSBlock();
        updateValidationModuleSummaries();

        if (isEnfPatient) {
            var enf = currentPatient;
            var enfServicioSlug = enf.servicioSlug || '';
            var enfServicio = enf.servicio || '';
            if (enfServicioSlug === 'reumatologia' || String(enfServicio).toLowerCase().indexOf('reuma') !== -1) {
                mostrarFormulario('reuma');
            } else {
                mostrarFormulario('derma');
            }
            var dermaTitle = document.querySelector('#formDerma h2.section-title');
            if (dermaTitle) {
                var sd = enfServicio || 'Enfermería / Inicio biológico';
                dermaTitle.textContent = '';
                var iconEl = document.createElement('i');
                iconEl.className = 'fas fa-disease';
                iconEl.setAttribute('aria-hidden', 'true');
                dermaTitle.appendChild(iconEl);
                dermaTitle.appendChild(document.createTextNode(' Datos de solicitud — ' + sd));
            }
            var srvInput = byId('fhDermaServicioOrigen');
            if (srvInput) srvInput.value = enfServicio || 'Enfermería / Inicio biológico';
            F.setValue('fhDermaCip', enf.cip || '');
            var enfPat = enf.patologia || enf.patologia_indicacion || '';
            if (enfPat) {
                var patSelect = byId('fhDermaPatologia');
                if (patSelect) {
                    var found = false;
                    for (var pi = 0; pi < patSelect.options.length; pi++) {
                        if (patSelect.options[pi].value === enfPat || patSelect.options[pi].textContent === enfPat) {
                            patSelect.value = enfPat;
                            found = true; break;
                        }
                    }
                    if (!found) {
                        var newOpt = document.createElement('option');
                        newOpt.value = enfPat; newOpt.textContent = enfPat; newOpt.selected = true;
                        patSelect.appendChild(newOpt);
                    }
                }
            }
            var enfFarmaco = explicitRequestedDrug(enf);
            if (enfFarmaco) F.setValue('fhDermaFarmaco', enfFarmaco);
            F.setValue('fhDermaDosis', '');
            F.setValue('fhDermaPeso', '');
            var indSel = byId('fhDermaInduccion');
            if (indSel) indSel.value = '';
            if (typeof applyEnfermeriaPrebioChips === 'function') applyEnfermeriaPrebioChips(enf);
            if (typeof hydrateUpperFormFromEnfermeria === 'function') hydrateUpperFormFromEnfermeria(enf);
            if (modoActual === 'reuma') {
                hydrateReumaForm(enf);
            }
        }
    }

    function normalizePbValue(rawValue, key) {
        var v = String(rawValue || '').trim();
        var upper = v.toUpperCase();
        if (!v || v === '—') return { text: 'No informado', estado: 'no_informado' };

        var isBooleanPositive = function (val) {
            if (val === true || val === 1 || val === '1') return true;
            var s = String(val).trim().toUpperCase();
            return /^(SI|SÍ|OK|COMPLETO|COMPLETADA|COMPLETADO|NEGATIVO|NEGATIVA|NEGATIVOS)$/.test(s);
        };

        if (key === 'analiticaReciente') {
            if (/^(SI|SÍ|OK)$/.test(upper)) return { text: 'OK', estado: 'ok' };
            if (/^NO$/.test(upper)) return { text: 'Pendiente', estado: 'pendiente' };
            return { text: 'No informado', estado: 'no_informado' };
        }
        if (key === 'hemograma' || key === 'bioquimica') {
            if (isBooleanPositive(rawValue)) return { text: 'OK', estado: 'ok' };
            if (rawValue === false || /^(NO|PENDIENTE)$/.test(upper)) return { text: 'Pendiente', estado: 'pendiente' };
            return { text: 'No informado', estado: 'no_informado' };
        }
        if (key === 'mantoux' || key === 'vhb' || key === 'vhc' || key === 'vih') {
            if (upper.indexOf('NEGATIVO') !== -1) return { text: 'Negativo', estado: 'ok' };
            if (/^(POSITIVO|POSITIVA|ALTERADO|ALTERADA|REACTIVO|REACTIVA)$/.test(upper) || upper.indexOf('POSITIV') !== -1) return { text: 'Positivo/alterado', estado: 'alerta' };
            if (upper.indexOf('PENDIENTE') !== -1) return { text: 'Pendiente', estado: 'pendiente' };
            if (/^(NO PRECISA|NO_PRECISA|NO APLICA|N\/A|NA)$/.test(upper)) return { text: 'No precisa', estado: 'no_precisa' };
            return { text: 'No informado', estado: 'no_informado' };
        }
        if (key === 'vacunacion') {
            if (/^(SI|SÍ|OK|COMPLETO|COMPLETADA|COMPLETADO)$/.test(upper)) return { text: 'OK', estado: 'ok' };
            if (/^(NO PRECISA|NO_PRECISA|NO APLICA|N\/A|NA)$/.test(upper)) return { text: 'No precisa', estado: 'no_precisa' };
            if (/^NO$/.test(upper)) return { text: 'No informado', estado: 'no_informado' };
            if (upper.indexOf('PENDIENTE') !== -1) return { text: 'Pendiente', estado: 'pendiente' };
            return { text: 'No informado', estado: 'no_informado' };
        }
        return { text: v, estado: 'no_informado' };
    }

    function setPbChip(chipId, valueObj) {
        var chip = byId(chipId);
        if (!chip) return;
        var statusEl = chip.querySelector('.pb-chip__status') || byId(chipId.replace('pbChip', 'pbStatus').replace('Chip', 'Status'));
        if (!statusEl) statusEl = chip;
        statusEl.textContent = valueObj.text;
        statusEl.setAttribute('data-estado', valueObj.text);
        chip.setAttribute('data-estado', valueObj.text);
    }

    function setUpperPbChip(chipId, valueObj) {
        var chip = byId(chipId);
        if (!chip) return;
        var statusEl = chip.querySelector('.pb-chip__status') || byId(chipId.replace('upperPbChip', 'upperPbStatus'));
        if (!statusEl) statusEl = chip;
        statusEl.textContent = valueObj.text;
        statusEl.setAttribute('data-estado', valueObj.text);
        chip.setAttribute('data-estado', valueObj.text);
    }

    function updatePrebiologicoChips() {
        var p = currentPatient;
        var an = p && p.analiticaEstruct ? p.analiticaEstruct : null;
        var isEnf = p && F && typeof F.isEnfermeriaPatient === 'function' && F.isEnfermeriaPatient(p);
        var enf = isEnf ? p : null;
        setPbChip('pbChipAnaliticaReciente', normalizePbValue(an ? an.reciente : (enf ? enf.analitica_estado : byId('fhAnaliticaReciente').value), 'analiticaReciente'));
        setPbChip('pbChipHemograma', normalizePbValue(an ? an.hemograma : byId('fhAnaliticaHemograma').checked, 'hemograma'));
        setPbChip('pbChipBioquimica', normalizePbValue(an ? an.bioquimica : byId('fhAnaliticaBioquimica').checked, 'bioquimica'));
        setPbChip('pbChipMantoux', normalizePbValue(an ? (an.mantoux || '') : (enf ? enf.mantoux_estado : byId('fhAnaliticaMantoux').value), 'mantoux'));
        setPbChip('pbChipIgra', normalizePbValue(enf ? enf.igra_estado : (an ? (an.mantoux || '') : ''), 'mantoux'));
        setPbChip('pbChipVhb', normalizePbValue(an ? (an.serologiasVhb || '') : (enf ? enf.vhb_estado : byId('fhAnaliticaSerologiasVhb').value), 'vhb'));
        setPbChip('pbChipVhc', normalizePbValue(an ? (an.serologiasVhc || '') : (enf ? enf.vhc_estado : byId('fhAnaliticaSerologiasVhc').value), 'vhc'));
        setPbChip('pbChipVih', normalizePbValue(an ? (an.serologiasVih || '') : (enf ? enf.vih_estado : byId('fhAnaliticaSerologiasVih').value), 'vih'));
        setPbChip('pbChipVacunacion', normalizePbValue(an ? an.vacunacion : (enf ? enf.medicina_preventiva_estado : byId('fhAnaliticaVacunacion').value), 'vacunacion'));
        setPbChip('pbChipMedPreventiva', normalizePbValue(enf ? enf.medicina_preventiva_estado : (an ? an.vacunacion : ''), 'vacunacion'));
        /* Mirror upper section chips */
        var upperChipIds = [
            'upperPbChipAnaliticaReciente', 'upperPbChipMantoux', 'upperPbChipIgra',
            'upperPbChipVhb', 'upperPbChipVhc', 'upperPbChipVih',
            'upperPbChipVacunacion', 'upperPbChipMedPreventiva'
        ];
        var lowerChipIds = [
            'pbChipAnaliticaReciente', 'pbChipMantoux', 'pbChipIgra',
            'pbChipVhb', 'pbChipVhc', 'pbChipVih',
            'pbChipVacunacion', 'pbChipMedPreventiva'
        ];
        for (var ui = 0; ui < upperChipIds.length; ui++) {
            var lowerEl = byId(lowerChipIds[ui]);
            if (!lowerEl) continue;
            var lowerStatus = lowerEl.getAttribute('data-estado') || '';
            var lowerText = (lowerEl.querySelector('.pb-chip__status') || lowerEl).textContent || '';
            setUpperPbChip(upperChipIds[ui], { text: lowerText, estado: lowerStatus });
        }
        var obs = byId('fhPrebiologicoObservaciones');
        if (obs) obs.textContent = valueOrDash(an && an.observaciones ? an.observaciones : (enf ? (enf.observaciones_prebiologico || '') : byId('fhAnaliticaObservaciones').value));
        var gs = byId('fhPrebioGlobalStatus');
        if (gs && enf) {
            var parts = [];
            if (enf.estado_prebiologico_enfermeria) parts.push(enf.estado_prebiologico_enfermeria);
            if (enf.fecha_ok_farmacia) parts.push('Fecha: ' + formatImportedDate(enf.fecha_ok_farmacia));
            gs.textContent = parts.length ? parts.join(' · ') : '-';
        }
        var upperGs = byId('upperPrebioGlobalStatus');
        if (upperGs) {
            var gsParts = [];
            if (enf && enf.estado_prebiologico_enfermeria) gsParts.push(enf.estado_prebiologico_enfermeria);
            if (enf && enf.fecha_ok_farmacia) gsParts.push('Fecha: ' + formatImportedDate(enf.fecha_ok_farmacia));
            upperGs.textContent = gsParts.length ? gsParts.join(' · ') : '-';
        }
    }

    function applyEnfermeriaPrebioChips(enfP) {
        if (!enfP) return;
        var chipMap = [
            { id: 'pbChipAnaliticaReciente', value: enfP.analitica_estado, key: 'analiticaReciente' },
            { id: 'pbChipMantoux', value: enfP.mantoux_estado, key: 'mantoux' },
            { id: 'pbChipIgra', value: enfP.igra_estado, key: 'mantoux' },
            { id: 'pbChipVhb', value: enfP.vhb_estado, key: 'vhb' },
            { id: 'pbChipVhc', value: enfP.vhc_estado, key: 'vhc' },
            { id: 'pbChipVih', value: enfP.vih_estado, key: 'vih' },
            { id: 'pbChipVacunacion', value: enfP.medicina_preventiva_estado, key: 'vacunacion' },
            { id: 'pbChipMedPreventiva', value: enfP.medicina_preventiva_estado, key: 'vacunacion' }
        ];
        chipMap.forEach(function (m) {
            if (!m.value || String(m.value).trim() === '') return;
            setPbChip(m.id, normalizePbValue(m.value, m.key));
        });
        var obs = byId('fhPrebiologicoObservaciones');
        if (obs) obs.textContent = (enfP.observaciones_prebiologico && String(enfP.observaciones_prebiologico).trim()) ? enfP.observaciones_prebiologico : '-';
        var gs = byId('fhPrebioGlobalStatus');
        if (gs) {
            var parts = [];
            if (enfP.estado_prebiologico_enfermeria) parts.push(enfP.estado_prebiologico_enfermeria);
            if (enfP.fecha_ok_farmacia) parts.push('Fecha: ' + formatImportedDate(enfP.fecha_ok_farmacia));
            gs.textContent = parts.length ? parts.join(' · ') : '-';
        }
        /* Mirror upper chips for Enfermería patient */
        chipMap.forEach(function (m) {
            if (!m.value || String(m.value).trim() === '') return;
            var upperId = m.id.replace('pbChip', 'upperPbChip');
            setUpperPbChip(upperId, normalizePbValue(m.value, m.key));
        });
        var upperGs = byId('upperPrebioGlobalStatus');
        if (upperGs) {
            var uparts = [];
            if (enfP.estado_prebiologico_enfermeria) uparts.push(enfP.estado_prebiologico_enfermeria);
            if (enfP.fecha_ok_farmacia) uparts.push('Fecha: ' + formatImportedDate(enfP.fecha_ok_farmacia));
            upperGs.textContent = uparts.length ? uparts.join(' · ') : '-';
        }
    }

    function hydrateUpperFormFromEnfermeria(enfP) {
        if (!enfP) return;
        function setChipVal(targetId, val) {
            if (!val || String(val).trim() === '') return;
            F.setValue(targetId, val);
            var g = document.querySelector('[data-chip-target="' + targetId + '"]');
            if (g) syncRadioGroup(g, val);
        }
        if (enfP.analitica_estado) {
            var au = String(enfP.analitica_estado).toUpperCase();
            if (/^(OK|COMPLETO|COMPLETADA|COMPLETADO|SI|SÍ)$/.test(au)) F.setValue('fhAnaliticaReciente', 'si');
            else if (/^NO$/.test(au)) F.setValue('fhAnaliticaReciente', 'no');
        }
        if (enfP.mantoux_estado) {
            var mu = String(enfP.mantoux_estado).toUpperCase();
            if (mu.indexOf('NEGATIVO') !== -1) setChipVal('fhAnaliticaMantoux', 'Negativo');
            else if (mu.indexOf('POSITIV') !== -1) setChipVal('fhAnaliticaMantoux', 'Positivo - tratado');
            else if (mu.indexOf('PENDIENTE') !== -1) setChipVal('fhAnaliticaMantoux', 'Pendiente');
        }
        function setSerologia(hiddenId, raw) {
            if (!raw) return;
            var ru = String(raw).toUpperCase();
            if (ru.indexOf('NEGATIVO') !== -1) setChipVal(hiddenId, 'Negativo');
            else if (ru.indexOf('POSITIV') !== -1 || ru.indexOf('REACTIV') !== -1) setChipVal(hiddenId, 'Positivo');
            else if (ru.indexOf('PENDIENTE') !== -1) setChipVal(hiddenId, 'Pendiente');
        }
        setSerologia('fhAnaliticaSerologiasVhb', enfP.vhb_estado);
        setSerologia('fhAnaliticaSerologiasVhc', enfP.vhc_estado);
        setSerologia('fhAnaliticaSerologiasVih', enfP.vih_estado);
        if (enfP.medicina_preventiva_estado) {
            var mp = String(enfP.medicina_preventiva_estado).toUpperCase();
            if (/^(OK|COMPLETO|COMPLETADA|COMPLETADO)$/.test(mp)) setChipVal('fhAnaliticaVacunacion', 'si');
            else if (/^NO$/.test(mp)) setChipVal('fhAnaliticaVacunacion', 'no');
            else if (mp.indexOf('PENDIENTE') !== -1) setChipVal('fhAnaliticaVacunacion', 'pendiente');
        }
        if (enfP.observaciones_prebiologico && String(enfP.observaciones_prebiologico).trim()) {
            F.setValue('fhAnaliticaObservaciones', enfP.observaciones_prebiologico);
        }
    }

    function syncRadioGroup(group, value) {
        var radios = group.querySelectorAll('input[type="radio"]');
        radios.forEach(function (radio) {
            radio.checked = radio.value === value;
        });
    }

    function initAnaliticaChips() {
        var groups = document.querySelectorAll("[data-chip-target]");
        groups.forEach(function (group) {
            var targetId = group.getAttribute("data-chip-target");
            var radios = group.querySelectorAll('input[type="radio"]');
            radios.forEach(function (radio) {
                radio.addEventListener("change", function () {
                    var hidden = byId(targetId);
                    if (hidden) hidden.value = this.value;
                    updateValidationModuleSummaries();
                });
            });
            var hidden = byId(targetId);
            if (hidden && hidden.value) syncRadioGroup(group, hidden.value);
        });
    }

    function currentTreatmentSummary() {
        return {
            farmaco: valueOrDash(byId("fhValidadoFarmaco").value),
            principioActivo: valueOrDash(byId("fhValidadoPrincipioActivo").value),
            dosis: valueOrDash(byId("fhValidadoDosis").value),
            via: valueOrDash(byId("fhValidadoVia").value),
            pauta: (function () {
                var select = byId("fhValidadoPauta");
                var value = select ? select.value : "";
                if (value === "OTRO") return valueOrDash(byId("fhValidadoPautaOtro").value);
                if (P && typeof P.getPautaByCodigo === "function" && typeof P.getLegacyPautaLabel === "function") {
                    var pautaObj = P.getPautaByCodigo(value);
                    return valueOrDash(P.getLegacyPautaLabel(pautaObj));
                }
                return valueOrDash(value);
            })(),
            induccion: byId("fhValidadoInduccion").value === "si" ? "Sí" : (byId("fhValidadoInduccion").value === "no" ? "No" : "—"),
            presentacion: valueOrDash(byId("fhValidadoPresentacion").value),
            observacionesFh: valueOrDash(byId("fhValidadoJustificacion").value)
        };
    }

    function requestedTreatmentSummary() {
        var origenVal = currentOrigenEntradaValue();
        var mode = modoActual || resolveModoFromOrigen(origenVal);
        if (currentPatient && origenVal !== 'manual_farmacia' && mode !== 'digestivo') {
            var p = currentPatient;
            return {
                farmaco: valueOrDash(explicitRequestedDrug(p)),
                principioActivo: valueOrDash(p.principioActivo),
                dosis: p.dosis ? valueOrDash(p.dosis) : "Pendiente de completar por Farmacia",
                via: p.via ? valueOrDash(p.via) : "Pendiente de completar por Farmacia",
                pauta: p.pauta ? valueOrDash(p.pauta) : "Pendiente de completar por Farmacia",
                induccion: "—",
                justificacion: valueOrDash(requestedJustificationForExport())
            };
        }
        var ids = requestedFieldIds();
        return {
            farmaco: valueOrDash(visibleElementValue(ids.farmaco)),
            principioActivo: valueOrDash(visibleElementValue(ids.principioActivo)),
            dosis: valueOrDash(visibleElementValue(ids.dosis)),
            via: valueOrDash(visibleElementValue(ids.via)),
            pauta: (function () {
                var select = byId(ids.pauta);
                var value = select ? select.value : "";
                if (value === "OTRO") return valueOrDash(visibleElementValue(ids.pautaOtro));
                if (P && typeof P.getPautaByCodigo === "function" && typeof P.getLegacyPautaLabel === "function") {
                    var pautaObj = P.getPautaByCodigo(value);
                    return valueOrDash(P.getLegacyPautaLabel(pautaObj));
                }
                return valueOrDash(value);
            })(),
            induccion: visibleElementValue(ids.induccion) === "si" ? "Sí" : (visibleElementValue(ids.induccion) === "no" ? "No" : "—"),
            justificacion: valueOrDash(requestedJustificationForExport())
        };
    }

    function requestedJustificationForExport() {
        var ids = requestedFieldIds();
        var explicit = visibleElementValue(ids.justificacion);
        if (explicit) return explicit;
        if (!isManualOrigin() && isHSPathology()) return visibleElementValue("fhHSMotivoClinico");
        return "";
    }

    function updateSolicitadoSummary() {
        var summary = requestedTreatmentSummary();
        setText("fhSolicitadoFarmaco", summary.farmaco);
        setText("fhSolicitadoDosis", summary.dosis);
        setText("fhSolicitadoVia", summary.via);
        setText("fhSolicitadoPauta", summary.pauta);
        setText("fhSolicitadoInduccion", summary.induccion);
        setText("fhSolicitadoPrincipioActivo", summary.principioActivo);
        setText("fhSolicitadoJustificacion", summary.justificacion);
        var indRow = byId("fhSolicitadoInduccionRow");
        if (indRow) indRow.classList.toggle("hidden", !summary.induccion || summary.induccion === "—");
    }

    function updateValidationModuleSummaries() {
        updateSolicitadoSummary();
        updatePrebiologicoChips();
    }

    function updateSeguimientoHandoffLink() {
        var link = byId('fhGoSeguimientoLink');
        if (!link) return;
        if (isManualOrigin() && !manualSelectionReady()) {
            link.removeAttribute('href');
            return;
        }
        if (!isManualOrigin() && !currentPatient) {
            link.removeAttribute('href');
            return;
        }
        var params = [];
        var cip = selectedCip();
        var patologia = selectedPatologia();
        if (cip && cip !== 'CIP-DEMO-FH-XXX') params.push('cip=' + encodeURIComponent(cip));
        params.push('servicio=' + encodeURIComponent(serviceSlugFromMode(isManualOrigin() ? currentManualService() : modoActual)));
        if (patologia && patologia !== '—') params.push('patologia=' + encodeURIComponent(patologia));
        params.push('entrada=' + encodeURIComponent('seguimiento'));
        link.href = 'farmacia_seguimiento.html' + (params.length ? ('?' + params.join('&')) : '');
    }

    function mapViaToSelect(catalogVia, control) {
        var mapped = "";
        if (C && typeof C.mapCatalogViaToSelect === "function") mapped = C.mapCatalogViaToSelect(catalogVia);
        var v = String(catalogVia || "").trim().toLowerCase();
        if (!mapped && v) {
            if (v.indexOf("subcut") !== -1 || v === "sc" || v === "s.c." || v === "subcutanea" || v === "subcutáneo") mapped = "SC";
            else if (v.indexOf("intraven") !== -1 || v === "iv" || v === "i.v." || v === "intravenosa" || v === "intravenoso") mapped = "IV";
            else if (v.indexOf("oral") !== -1 || v === "vo" || v === "v.o.") mapped = "Oral";
            else if (v.indexOf("intramus") !== -1 || v === "im" || v === "i.m.") mapped = "IM";
            else mapped = "Otra";
        }
        if (!control || !control.options || !control.options.length) return mapped;
        var supported = Array.from(control.options).map(function (option) { return option.value || option.text || option.textContent || ""; });
        if (supported.indexOf(mapped) !== -1) return mapped;
        return mapped && supported.indexOf("Otra") !== -1 ? "Otra" : "";
    }

    function catalogContext(slot) {
        return { slot: slot, cip: selectedCip() };
    }

    function explicitExportValue(value) {
        var text = value === null || value === undefined ? "" : String(value).trim();
        if (text === "—" || text === "-" || text === "Pendiente" || text === "No informado" || text === "Pendiente de completar por Farmacia") return "";
        return text;
    }

    function visibleElementValue(id) {
        var el = byId(id);
        if (!el) return "";
        return explicitExportValue(el.value !== undefined ? el.value : el.textContent);
    }

    function visiblePauta(pautaId, pautaOtroId) {
        var select = byId(pautaId);
        var code = select ? explicitExportValue(select.value) : "";
        var label = "";
        if (select && code && select.options && select.selectedIndex >= 0 && select.options[select.selectedIndex]) {
            label = explicitExportValue(select.options[select.selectedIndex].textContent || select.options[select.selectedIndex].text);
        }
        var other = code === "OTRO" ? visibleElementValue(pautaOtroId) : "";
        return { codigo: code, label: code === "OTRO" ? other : label, otro: other };
    }

    function treatmentValuesFromIds(ids) {
        var pauta = visiblePauta(ids.pauta, ids.pautaOtro);
        return {
            farmaco: visibleElementValue(ids.farmaco),
            principioActivo: visibleElementValue(ids.principioActivo),
            dosis: visibleElementValue(ids.dosis),
            via: visibleElementValue(ids.via),
            pautaCodigo: pauta.codigo,
            pautaLabel: pauta.label,
            pautaOtro: pauta.otro,
            presentacion: visibleElementValue(ids.presentacion)
        };
    }

    function requestedTreatmentValuesForExport() {
        if (isManualOrigin()) return treatmentValuesFromIds(requestedFieldIds());
        var mode = modoActual || resolveModoFromOrigen(currentOrigenEntradaValue());
        if (mode === "reuma") {
            var reumaValues = treatmentValuesFromIds({
                farmaco: "fhReumaFarmaco", principioActivo: "", dosis: "fhReumaDosis", via: "fhReumaVia",
                pauta: "", pautaOtro: "", presentacion: ""
            });
            var explicitReumaSchedule = visibleElementValue("fhReumaPauta");
            if (explicitReumaSchedule) {
                var normalizedReumaSchedule = P && typeof P.getPautaByLabel === "function"
                    ? P.getPautaByLabel(explicitReumaSchedule) : null;
                var reumaScheduleCode = normalizedReumaSchedule && normalizedReumaSchedule.pauta_codigo
                    ? normalizedReumaSchedule.pauta_codigo : "OTRO";
                reumaValues.pautaCodigo = reumaScheduleCode;
                reumaValues.pautaOtro = reumaScheduleCode === "OTRO"
                    ? explicitExportValue((normalizedReumaSchedule && normalizedReumaSchedule.pauta_otro_texto) || explicitReumaSchedule) : "";
                reumaValues.pautaLabel = reumaScheduleCode === "OTRO"
                    ? reumaValues.pautaOtro
                    : explicitExportValue(normalizedReumaSchedule.pauta_label);
            }
            return reumaValues;
        }
        if (mode === "digestivo") {
            return treatmentValuesFromIds({
                farmaco: "fhDigFarmaco", principioActivo: "", dosis: "fhDigDosis", via: "fhDigVia",
                pauta: "fhDigPauta", pautaOtro: "fhDigPautaOtro", presentacion: ""
            });
        }
        return treatmentValuesFromIds(requestedFieldIds());
    }

    function exactCatalogSnapshot(slot, cip, visibleName) {
        if (!cip || !visibleName || !C || typeof C.getSnapshot !== "function") return null;
        var snapshot = C.getSnapshot({ slot: slot, cip: cip });
        return sameVisibleDrugName(snapshot, visibleName) ? snapshot : null;
    }

    function treatmentV2FromValues(values, inductionValue, snapshot) {
        return {
            drugName: explicitExportValue(values.farmaco) || null,
            activeIngredient: explicitExportValue(values.principioActivo) || null,
            presentation: explicitExportValue(values.presentacion) || null,
            doseText: explicitExportValue(values.dosis) || null,
            route: explicitExportValue(values.via) || null,
            scheduleCode: explicitExportValue(values.pautaCodigo) || null,
            scheduleLabel: explicitExportValue(values.pautaLabel) || null,
            scheduleOtherText: explicitExportValue(values.pautaOtro) || null,
            inductionStatus: explicitExportValue(inductionValue) || null,
            selectedDrugId: snapshot ? explicitExportValue(snapshot.selected_drug_id || snapshot.drug_id) || null : null,
            catalogSource: snapshot ? explicitExportValue(snapshot.source_type) || null : null,
            nationalCode: snapshot ? explicitExportValue(snapshot.codigo_nacional_snapshot) || null : null,
            registrationNumber: snapshot ? explicitExportValue(snapshot.nregistro_snapshot) || null : null
        };
    }

    function requestedTreatmentV2() {
        var values = requestedTreatmentValuesForExport();
        var cip = visibleCipForExport();
        var snapshot = exactCatalogSnapshot("validacion.solicitado", cip, values.farmaco);
        if (snapshot && !values.presentacion) values.presentacion = explicitExportValue(snapshot.presentacion_snapshot);
        var mode = modoActual || resolveModoFromOrigen(currentOrigenEntradaValue());
        var inductionValue = isManualOrigin()
            ? visibleElementValue("fhManualInduccion")
            : (mode === "derma" ? visibleElementValue("fhDermaInduccion") : "");
        return treatmentV2FromValues(values, inductionValue, snapshot);
    }

    function validatedTreatmentV2() {
        var values = treatmentValuesFromIds({
            farmaco: "fhValidadoFarmaco", principioActivo: "fhValidadoPrincipioActivo", presentacion: "fhValidadoPresentacion",
            dosis: "fhValidadoDosis", via: "fhValidadoVia", pauta: "fhValidadoPauta", pautaOtro: "fhValidadoPautaOtro"
        });
        var snapshot = exactCatalogSnapshot("validacion.validado", visibleCipForExport(), values.farmaco);
        return treatmentV2FromValues(values, visibleElementValue("fhValidadoInduccion"), snapshot);
    }

    function hasV2TreatmentData(treatment) {
        return Object.keys(treatment).some(function (key) { return treatment[key] !== null; });
    }

    function getValidatedTreatmentRelation() {
        return visibleElementValue("fhValidatedTreatmentRelation") || null;
    }

    function applyRequestedAsValidatedExplicitly() {
        var requested = requestedTreatmentV2();
        if (!hasV2TreatmentData(requested)) return false;
        var existing = validatedTreatmentV2();
        var differentExisting = hasV2TreatmentData(existing) && JSON.stringify(existing) !== JSON.stringify(requested);
        if (differentExisting && typeof window.confirm === "function" && !window.confirm("El tratamiento validado contiene datos distintos. ¿Desea sustituirlos por el tratamiento solicitado?")) return false;
        var assignments = {
            fhValidadoFarmaco: requested.drugName,
            fhValidadoPrincipioActivo: requested.activeIngredient,
            fhValidadoPresentacion: requested.presentation,
            fhValidadoDosis: requested.doseText,
            fhValidadoVia: requested.route,
            fhValidadoPauta: requested.scheduleCode,
            fhValidadoPautaOtro: requested.scheduleOtherText,
            fhValidadoInduccion: requested.inductionStatus
        };
        Object.keys(assignments).forEach(function (id) { if (byId(id)) byId(id).value = assignments[id] || ""; });
        if (byId("fhValidadoPautaOtro")) byId("fhValidadoPautaOtro").classList.toggle("hidden", requested.scheduleCode !== "OTRO");
        if (byId("fhValidatedTreatmentRelation")) byId("fhValidatedTreatmentRelation").value = "same_as_requested";
        var requestedSnapshot = exactCatalogSnapshot("validacion.solicitado", visibleCipForExport(), requested.drugName);
        if (requestedSnapshot && C && typeof C.selectDrug === "function") {
            C.selectDrug({
                drug_id: requestedSnapshot.selected_drug_id || requestedSnapshot.drug_id || "",
                source_type: requestedSnapshot.source_type || "",
                nombre_comercial: requestedSnapshot.nombre_snapshot || requestedSnapshot.nombre_comercial || "",
                display_name: requestedSnapshot.nombre_snapshot || requestedSnapshot.nombre_comercial || "",
                principio_activo: requestedSnapshot.principio_activo_snapshot || "",
                nombre_presentacion: requestedSnapshot.presentacion_snapshot || "",
                dosis: requestedSnapshot.dosis_presentacion || "",
                via: requestedSnapshot.via_snapshot || "",
                codigo_nacional: requestedSnapshot.codigo_nacional_snapshot || "",
                nregistro: requestedSnapshot.nregistro_snapshot || ""
            }, { slot: "validacion.validado", cip: visibleCipForExport() }, { proposal_values: Object.assign({}, requestedSnapshot.proposal_values || {}) });
        }
        updateValidationModuleSummaries();
        return true;
    }

    function hasExplicitTherapeuticData(values) {
        return !!(values && [
            values.farmaco, values.principioActivo, values.dosis, values.via,
            values.pautaCodigo, values.pautaLabel, values.pautaOtro, values.presentacion
        ].some(function (value) { return explicitExportValue(value) !== ""; }));
    }

    function sameVisibleDrugName(snapshot, visibleName) {
        var normalize = function (value) { return explicitExportValue(value).toLocaleLowerCase("es"); };
        var name = normalize(visibleName);
        if (!snapshot || !name) return false;
        return [snapshot.nombre_snapshot, snapshot.nombre_comercial]
            .some(function (candidate) { return normalize(candidate) === name; });
    }

    function treatmentLineForExport(values, slot, cip) {
        if (!hasExplicitTherapeuticData(values)) return null;
        var line = {
            farmaco_nombre: values.farmaco,
            principio_activo: values.principioActivo,
            dosis_texto: values.dosis && values.presentacion && values.dosis !== values.presentacion
                ? values.dosis + " · " + values.presentacion
                : (values.dosis || values.presentacion),
            presentacion: values.presentacion,
            via: values.via,
            pauta_codigo: values.pautaCodigo,
            pauta_label: values.pautaLabel,
            pauta_otro_texto: values.pautaOtro
        };
        var snapshot = C && typeof C.getSnapshot === "function" ? C.getSnapshot({ slot: slot, cip: cip }) : null;
        if (sameVisibleDrugName(snapshot, values.farmaco)) {
            line.selected_drug_id = snapshot.selected_drug_id || snapshot.drug_id || "";
            line.source_type = snapshot.source_type || "";
            line.codigo_nacional = snapshot.codigo_nacional_snapshot || "";
            line.nregistro = snapshot.nregistro_snapshot || "";
        }
        return line;
    }

    function visibleCipForExport() {
        if (isManualOrigin()) return visibleElementValue("fhManualCip");
        var mode = modoActual || resolveModoFromOrigen(currentOrigenEntradaValue());
        if (mode === "reuma") return visibleElementValue("fhReumaCip");
        if (mode === "digestivo") return visibleElementValue("fhDigCip");
        return visibleElementValue("fhDermaCip");
    }

    function visibleServiceForExport() {
        if (isManualOrigin()) return currentManualService() ? serviceLabelFromMode(currentManualService()) : "";
        var mode = modoActual || resolveModoFromOrigen(currentOrigenEntradaValue());
        return mode ? serviceLabelFromMode(mode) : "";
    }

    function visiblePatologiaForExport() {
        if (isManualOrigin()) return explicitExportValue(currentManualPatologia());
        var mode = modoActual || resolveModoFromOrigen(currentOrigenEntradaValue());
        if (mode === "reuma") return visibleElementValue("fhReumaPatologia");
        if (mode === "digestivo") return visibleElementValue("fhDigPatologia");
        return visibleElementValue("fhDermaPatologia");
    }

    function visibleRequestedDateForExport() {
        if (isManualOrigin()) return visibleElementValue("fhManualFecha");
        var mode = modoActual || resolveModoFromOrigen(currentOrigenEntradaValue());
        if (mode === "digestivo") return visibleElementValue("fhDigFecha");
        if (mode === "derma") return visibleElementValue("fhDermaFecha");
        return currentPatient ? explicitExportValue(currentPatient.fecha_solicitud) : "";
    }

    function normalizeValidationExportStatus(value) {
        var normalized = explicitExportValue(value).toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (normalized === "pending" || normalized === "pendiente") {
            return { resultadoValidacion: "pendiente", estadoRegistro: "pendiente", canCopy: true };
        }
        if (normalized === "validated" || normalized === "validado") {
            return { resultadoValidacion: "validado", estadoRegistro: "completado", canCopy: true };
        }
        if (normalized === "denied" || normalized === "denegado") {
            return { resultadoValidacion: "denegado", estadoRegistro: "completado", canCopy: true };
        }
        return { resultadoValidacion: "", estadoRegistro: "", canCopy: false };
    }

    function buildValidationExcelExportData() {
        var status = normalizeValidationExportStatus(visibleElementValue("fhValEstado"));
        var cip = visibleCipForExport();
        var validated = treatmentValuesFromIds({
            farmaco: "fhValidadoFarmaco", principioActivo: "fhValidadoPrincipioActivo", dosis: "fhValidadoDosis",
            via: "fhValidadoVia", pauta: "fhValidadoPauta", pautaOtro: "fhValidadoPautaOtro",
            presentacion: "fhValidadoPresentacion"
        });
        var useValidated = hasExplicitTherapeuticData(validated);
        var values = useValidated ? validated : requestedTreatmentValuesForExport();
        var slot = useValidated ? "validacion.validado" : "validacion.solicitado";
        return {
            canCopy: status.canCopy && Boolean(cip),
            resultadoValidacion: status.resultadoValidacion,
            estadoRegistro: status.estadoRegistro,
            cip: cip,
            servicio: visibleServiceForExport(),
            patologia: visiblePatologiaForExport(),
            fechaSolicitud: visibleRequestedDateForExport(),
            tipoValidacion: visibleElementValue("fhTipoValidacion"),
            profesional: visibleElementValue("fhValFarmaceutico"),
            motivo: visibleElementValue("fhValMotivo"),
            obsValidacion: visibleElementValue("fhValidadoJustificacion"),
            otrasObservacionesActo: visibleElementValue("fhValObservaciones"),
            dermaClinicalSummary: buildDermaClinicalSummary().summary,
            slot: slot,
            lineaActual: treatmentLineForExport(values, slot, cip)
        };
    }

    function updateValidationExcelExportAvailability() {
        var cipReady = Boolean(visibleCipForExport());
        var statusReady = normalizeValidationExportStatus(visibleElementValue("fhValEstado")).canCopy;
        var txtBtn = byId("fhValExportTxt");
        var csvBtn = byId("fhValExportCsv");
        var excelBtn = byId("fhValExcelExportBtn");
        if (txtBtn) txtBtn.disabled = !cipReady;
        if (csvBtn) csvBtn.disabled = !cipReady;
        if (excelBtn) excelBtn.disabled = !(cipReady && statusReady);
    }

    function ensureCipForExport() {
        if (visibleCipForExport()) return true;
        alert("Introduce un CIP sintético no vacío antes de exportar.");
        updateValidationExcelExportAvailability();
        return false;
    }

    function reconcileSelection(current, previous, drug, slot) {
        if (C && typeof C.reconcileCatalogSelection === "function") {
            return C.reconcileCatalogSelection(current, previous, drug, slot);
        }
        var helper = window.FarmaciaTratamiento;
        if (helper && typeof helper.reconcileCatalogSelection === "function") {
            return helper.reconcileCatalogSelection(current, previous, drug, slot);
        }
        return { values: current, proposal_values: {} };
    }

    function selectDrug(drug, ids, dropdownId) {
        if (!drug || (C.isConcreteCatalogSelection && !C.isConcreteCatalogSelection(drug))) return;
        ids = ids || requestedFieldIds();
        var context = { slot: "validacion.solicitado", cip: byId(ids.cip) ? byId(ids.cip).value : selectedCip() };
        var contextValid = typeof C.snapshotContextKey !== "function" || Boolean(C.snapshotContextKey(context));
        var previous = contextValid && typeof C.getSnapshot === "function" ? C.getSnapshot(context) : null;
        var reconciled = reconcileSelection({
            farmaco_nombre: byId(ids.farmaco).value,
            principio_activo: byId(ids.principioActivo).value,
            dosis_texto: byId(ids.dosis).value,
            via: byId(ids.via).value
        }, previous, drug, context.slot);
        var requestedViaValue = reconciled.values.via ? mapViaToSelect(reconciled.values.via, byId(ids.via)) : "";
        reconciled.values.via = requestedViaValue;
        if (Object.prototype.hasOwnProperty.call(reconciled.proposal_values, "via")) reconciled.proposal_values.via = requestedViaValue;
        byId(ids.farmaco).value = reconciled.values.farmaco_nombre || "";
        byId(ids.principioActivo).value = reconciled.values.principio_activo || "";
        byId(ids.dosis).value = reconciled.values.dosis_texto || "";
        byId(ids.via).value = requestedViaValue;

        if (contextValid && typeof C.selectDrug === "function") C.selectDrug(drug, context, reconciled);
        clearRequestedAutocompleteDropdown(dropdownId);
        updateSolicitadoSummary();
    }

    function selectValidadoDrug(drug) {
        var farmacoEl = byId("fhValidadoFarmaco");
        var princEl = byId("fhValidadoPrincipioActivo");
        var presEl = byId("fhValidadoPresentacion");
        var dosisEl = byId("fhValidadoDosis");
        var viaEl = byId("fhValidadoVia");
        if (!drug || !farmacoEl || (C.isConcreteCatalogSelection && !C.isConcreteCatalogSelection(drug))) return;
        var context = catalogContext("validacion.validado");
        var contextValid = typeof C.snapshotContextKey !== "function" || Boolean(C.snapshotContextKey(context));
        var previous = contextValid && typeof C.getSnapshot === "function" ? C.getSnapshot(context) : null;
        var reconciled = reconcileSelection({
            farmaco_nombre: farmacoEl.value,
            principio_activo: princEl ? princEl.value : "",
            presentacion: presEl ? presEl.value : "",
            dosis_texto: dosisEl ? dosisEl.value : "",
            via: viaEl ? viaEl.value : ""
        }, previous, drug, context.slot);
        var validatedViaValue = reconciled.values.via ? mapViaToSelect(reconciled.values.via, viaEl) : "";
        reconciled.values.via = validatedViaValue;
        if (Object.prototype.hasOwnProperty.call(reconciled.proposal_values, "via")) reconciled.proposal_values.via = validatedViaValue;
        farmacoEl.value = reconciled.values.farmaco_nombre || "";
        if (princEl) princEl.value = reconciled.values.principio_activo || "";
        if (presEl) presEl.value = reconciled.values.presentacion || "";
        if (dosisEl) dosisEl.value = reconciled.values.dosis_texto || "";
        if (viaEl) viaEl.value = validatedViaValue;
        if (contextValid && typeof C.selectDrug === "function") C.selectDrug(drug, context, reconciled);

        [farmacoEl, princEl, presEl, dosisEl, viaEl].forEach(function (el) {
            if (!el) return;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
        });
        clearValidadoAutocompleteDropdown();
        updateValidationModuleSummaries();
    }

    function renderValidadoAutocompleteDropdown(results) {
        var dropdown = byId("autocompleteValidadoDropdown");
        F.clearChildren(dropdown);
        if (!results || results.length === 0) {
            dropdown.classList.add("hidden");
            return;
        }
        var maxResults = Math.min(results.length, 15);
        for (var i = 0; i < maxResults; i++) {
            var drug = results[i];
            var item = createEl("div", "autocomplete-item");
            if (i === autocompleteActiveIndex) item.classList.add("autocomplete-item--active");
            var mainRow = createEl("div", "autocomplete-item-main");
            var nameSpan = createEl("span", "autocomplete-item-name", drug.display_name || drug.nombre_comercial || "—");
            mainRow.appendChild(nameSpan);
            if (isTruthyRobust(drug.es_hospitalario)) mainRow.appendChild(createEl("span", "drug-tag drug-tag--hosp", "[HOSP]"));
            if (isTruthyRobust(drug.biosimilar)) mainRow.appendChild(createEl("span", "drug-tag drug-tag--bio", "[BIO]"));
            var sourceTag = createEl("span", "drug-source-tag drug-source-tag--" + drug.source_type.toLowerCase(), drug.source_type);
            mainRow.appendChild(sourceTag);
            item.appendChild(mainRow);
            var detailRow = createEl("div", "autocomplete-item-detail");
            var parts = [];
            if (drug.principio_activo) parts.push(drug.principio_activo);
            if (drug.dosis) parts.push(drug.dosis);
            if (drug.via) parts.push(drug.via);
            if (drug.codigo_nacional) parts.push("CN " + drug.codigo_nacional);
            detailRow.textContent = parts.join(" · ");
            item.appendChild(detailRow);
            (function (d) {
                item.addEventListener("click", function () { selectValidadoDrug(d); });
            })(drug);
            dropdown.appendChild(item);
        }
        dropdown.classList.remove("hidden");
        autocompleteActiveIndex = -1;
    }

    function clearValidadoAutocompleteDropdown() {
        var dropdown = byId("autocompleteValidadoDropdown");
        F.clearChildren(dropdown);
        dropdown.classList.add("hidden");
        autocompleteActiveIndex = -1;
    }

    function handleValidadoAutocompleteInput() {
        if (!C.loaded) return;
        var query = byId("fhValidadoFarmaco").value.trim();
        if (query.length < 2) {
            clearValidadoAutocompleteDropdown();
            return;
        }
        renderValidadoAutocompleteDropdown(C.search(query));
    }

    function enableAutocompleteValidado() {
        var input = byId("fhValidadoFarmaco");
        if (!input) return;
        input.placeholder = "Buscar en catálogo...";
        input.addEventListener("input", handleValidadoAutocompleteInput);
        input.addEventListener("keydown", function (event) {
            var dropdown = byId("autocompleteValidadoDropdown");
            if (dropdown.classList.contains("hidden")) return;
            var items = dropdown.querySelectorAll(".autocomplete-item");
            if (items.length === 0) return;
            if (event.key === "ArrowDown") {
                event.preventDefault();
                autocompleteActiveIndex = Math.min(autocompleteActiveIndex + 1, items.length - 1);
                items.forEach(function (item, idx) {
                    item.classList.toggle("autocomplete-item--active", idx === autocompleteActiveIndex);
                });
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                autocompleteActiveIndex = Math.max(autocompleteActiveIndex - 1, -1);
                items.forEach(function (item, idx) {
                    item.classList.toggle("autocomplete-item--active", idx === autocompleteActiveIndex);
                });
            } else if (event.key === "Enter") {
                if (autocompleteActiveIndex >= 0 && autocompleteActiveIndex < items.length) {
                    event.preventDefault();
                    items[autocompleteActiveIndex].click();
                }
            } else if (event.key === "Escape") {
                clearValidadoAutocompleteDropdown();
            }
        });
        input.addEventListener("blur", function () {
            setTimeout(function () {
                if (!document.activeElement || !byId("autocompleteValidadoDropdown").contains(document.activeElement)) clearValidadoAutocompleteDropdown();
            }, 150);
        });
    }

    function selectManualRequestedDrug(drug) {
        var farmacoEl = byId("fhManualFarmaco");
        var princEl = byId("fhManualPrincipioActivo");
        var dosisEl = byId("fhManualDosis");
        var viaEl = byId("fhManualVia");
        var cipEl = byId("fhManualCip");
        if (!drug || !farmacoEl || (C.isConcreteCatalogSelection && !C.isConcreteCatalogSelection(drug))) return;
        var context = { slot: "validacion.solicitado", cip: cipEl ? cipEl.value.trim() : "" };
        var contextValid = Boolean(context.cip) && (typeof C.snapshotContextKey !== "function" || Boolean(C.snapshotContextKey(context)));
        var contextualPrevious = contextValid && typeof C.getSnapshot === "function" ? C.getSnapshot(context) : null;
        var previous = manualRequestedTransientProposal || contextualPrevious;
        var reconciled = reconcileSelection({
            farmaco_nombre: farmacoEl.value,
            principio_activo: princEl ? princEl.value : "",
            dosis_texto: dosisEl ? dosisEl.value : "",
            via: viaEl ? viaEl.value : ""
        }, previous, drug, context.slot);
        var requestedViaValue = reconciled.values.via ? mapViaToSelect(reconciled.values.via, viaEl) : "";
        reconciled.values.via = requestedViaValue;
        if (Object.prototype.hasOwnProperty.call(reconciled.proposal_values, "via")) reconciled.proposal_values.via = requestedViaValue;
        farmacoEl.value = reconciled.values.farmaco_nombre || "";
        if (princEl) princEl.value = reconciled.values.principio_activo || "";
        if (dosisEl) dosisEl.value = reconciled.values.dosis_texto || "";
        if (viaEl) viaEl.value = requestedViaValue;
        if (contextValid && typeof C.selectDrug === "function") C.selectDrug(drug, context, reconciled);
        manualRequestedTransientProposal = {
            proposal_values: Object.assign({}, reconciled.proposal_values)
        };

        [farmacoEl, princEl, dosisEl, viaEl].forEach(function (el) {
            if (!el) return;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
        });
        clearManualRequestedAutocompleteDropdown();
        updateSolicitadoSummary();
    }

    function renderManualRequestedAutocompleteDropdown(results) {
        var dropdown = byId("fhManualAutocompleteDropdown");
        if (!dropdown) return;
        F.clearChildren(dropdown);
        if (!results || results.length === 0) {
            dropdown.classList.add("hidden");
            return;
        }
        var maxResults = Math.min(results.length, 15);
        for (var i = 0; i < maxResults; i++) {
            var drug = results[i];
            var item = createEl("div", "autocomplete-item");
            if (i === manualRequestedAutocompleteActiveIndex) item.classList.add("autocomplete-item--active");
            var mainRow = createEl("div", "autocomplete-item-main");
            var nameSpan = createEl("span", "autocomplete-item-name", drug.display_name || drug.nombre_comercial || "—");
            mainRow.appendChild(nameSpan);
            if (isTruthyRobust(drug.es_hospitalario)) mainRow.appendChild(createEl("span", "drug-tag drug-tag--hosp", "[HOSP]"));
            if (isTruthyRobust(drug.biosimilar)) mainRow.appendChild(createEl("span", "drug-tag drug-tag--bio", "[BIO]"));
            var sourceTag = createEl("span", "drug-source-tag drug-source-tag--" + drug.source_type.toLowerCase(), drug.source_type);
            mainRow.appendChild(sourceTag);
            item.appendChild(mainRow);
            var detailRow = createEl("div", "autocomplete-item-detail");
            var parts = [];
            if (drug.principio_activo) parts.push(drug.principio_activo);
            if (drug.dosis) parts.push(drug.dosis);
            if (drug.via) parts.push(drug.via);
            if (drug.codigo_nacional) parts.push("CN " + drug.codigo_nacional);
            detailRow.textContent = parts.join(" · ");
            item.appendChild(detailRow);
            (function (d) {
                item.addEventListener("click", function () { selectManualRequestedDrug(d); });
            })(drug);
            dropdown.appendChild(item);
        }
        dropdown.classList.remove("hidden");
        manualRequestedAutocompleteActiveIndex = -1;
    }

    function clearManualRequestedAutocompleteDropdown() {
        var dropdown = byId("fhManualAutocompleteDropdown");
        if (!dropdown) return;
        F.clearChildren(dropdown);
        dropdown.classList.add("hidden");
        manualRequestedAutocompleteActiveIndex = -1;
    }

    function handleManualRequestedAutocompleteInput() {
        if (!C.loaded) return;
        var input = byId("fhManualFarmaco");
        if (!input) return;
        var query = input.value.trim();
        if (query.length < 2) {
            clearManualRequestedAutocompleteDropdown();
            return;
        }
        renderManualRequestedAutocompleteDropdown(C.search(query));
    }

    function enableAutocompleteManualRequested() {
        var input = byId("fhManualFarmaco");
        if (!input || input.__farmaciaManualRequestedAutocompleteBound === true) return;
        input.__farmaciaManualRequestedAutocompleteBound = true;
        input.placeholder = "Buscar por marca, principio activo, presentación o código...";
        input.addEventListener("input", handleManualRequestedAutocompleteInput);
        input.addEventListener("keydown", function (event) {
            var dropdown = byId("fhManualAutocompleteDropdown");
            if (!dropdown || dropdown.classList.contains("hidden")) return;
            var items = dropdown.querySelectorAll(".autocomplete-item");
            if (items.length === 0) return;
            if (event.key === "ArrowDown") {
                event.preventDefault();
                manualRequestedAutocompleteActiveIndex = Math.min(manualRequestedAutocompleteActiveIndex + 1, items.length - 1);
                items.forEach(function (item, idx) {
                    item.classList.toggle("autocomplete-item--active", idx === manualRequestedAutocompleteActiveIndex);
                });
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                manualRequestedAutocompleteActiveIndex = Math.max(manualRequestedAutocompleteActiveIndex - 1, -1);
                items.forEach(function (item, idx) {
                    item.classList.toggle("autocomplete-item--active", idx === manualRequestedAutocompleteActiveIndex);
                });
            } else if (event.key === "Enter") {
                if (manualRequestedAutocompleteActiveIndex >= 0 && manualRequestedAutocompleteActiveIndex < items.length) {
                    event.preventDefault();
                    items[manualRequestedAutocompleteActiveIndex].click();
                }
            } else if (event.key === "Escape") {
                clearManualRequestedAutocompleteDropdown();
            }
        });
        input.addEventListener("blur", function () {
            setTimeout(function () {
                var dropdown = byId("fhManualAutocompleteDropdown");
                if (dropdown && (!document.activeElement || !dropdown.contains(document.activeElement))) clearManualRequestedAutocompleteDropdown();
            }, 150);
        });
    }

    function isTruthyRobust(value) {
        if (value === true || value === 1 || value === "1") return true;
        if (value === false || value === 0 || value === "0") return false;
        if (value === null || value === undefined || value === "") return false;
        var s = String(value).trim().toUpperCase();
        return s === "TRUE" || s === "SI" || s === "SÍ" || s === "YES" || s === "1";
    }

    function requestedAutocompleteConfig(inputId) {
        return {
            inputId: inputId,
            dropdownId: "autocompleteDropdown",
            ids: {
                cip: "fhDermaCip", farmaco: "fhDermaFarmaco", principioActivo: "fhDermaPrincipioActivo",
                dosis: "fhDermaDosis", via: "fhDermaVia"
            },
            activeIndex: -1
        };
    }

    function renderRequestedAutocompleteDropdown(config, results) {
        var dropdown = byId(config.dropdownId);
        if (!dropdown) return;
        F.clearChildren(dropdown);
        if (!results || results.length === 0) {
            dropdown.classList.add("hidden");
            return;
        }
        var maxResults = Math.min(results.length, 15);
        for (var i = 0; i < maxResults; i++) {
            var drug = results[i];
            var item = createEl("div", "autocomplete-item");
            if (i === config.activeIndex) item.classList.add("autocomplete-item--active");
            var mainRow = createEl("div", "autocomplete-item-main");
            var nameSpan = createEl("span", "autocomplete-item-name", drug.display_name || drug.nombre_comercial || "—");
            mainRow.appendChild(nameSpan);
            if (isTruthyRobust(drug.es_hospitalario)) mainRow.appendChild(createEl("span", "drug-tag drug-tag--hosp", "[HOSP]"));
            if (isTruthyRobust(drug.biosimilar)) mainRow.appendChild(createEl("span", "drug-tag drug-tag--bio", "[BIO]"));
            var sourceTag = createEl("span", "drug-source-tag drug-source-tag--" + drug.source_type.toLowerCase(), drug.source_type);
            mainRow.appendChild(sourceTag);
            item.appendChild(mainRow);
            var detailRow = createEl("div", "autocomplete-item-detail");
            var parts = [];
            if (drug.principio_activo) parts.push(drug.principio_activo);
            if (drug.dosis) parts.push(drug.dosis);
            if (drug.via) parts.push(drug.via);
            if (drug.codigo_nacional) parts.push("CN " + drug.codigo_nacional);
            detailRow.textContent = parts.join(" · ");
            item.appendChild(detailRow);
            (function (d) {
                item.addEventListener("click", function () { selectDrug(d, config.ids, config.dropdownId); });
            })(drug);
            dropdown.appendChild(item);
        }
        dropdown.classList.remove("hidden");
        config.activeIndex = -1;
    }

    function clearRequestedAutocompleteDropdown(dropdownId) {
        var dropdown = byId(dropdownId || "autocompleteDropdown");
        if (!dropdown) return;
        F.clearChildren(dropdown);
        dropdown.classList.add("hidden");
    }

    function handleRequestedAutocompleteInput(config) {
        if (!C.loaded) return;
        var query = byId(config.inputId).value.trim();
        if (query.length < 2) {
            clearRequestedAutocompleteDropdown(config.dropdownId);
            return;
        }
        renderRequestedAutocompleteDropdown(config, C.search(query));
    }

    function markRequestedAutocompleteBound(input) {
        if (input.dataset && input.dataset.catalogAutocompleteBound === "true") return false;
        if (typeof input.getAttribute === "function" && input.getAttribute("data-catalog-autocomplete-bound") === "true") return false;
        if (input.__farmaciaCatalogAutocompleteBound === true) return false;
        if (input.dataset) input.dataset.catalogAutocompleteBound = "true";
        else if (typeof input.setAttribute === "function") input.setAttribute("data-catalog-autocomplete-bound", "true");
        input.__farmaciaCatalogAutocompleteBound = true;
        return true;
    }

    function enableRequestedAutocomplete(inputId) {
        var config = requestedAutocompleteConfig(inputId);
        var input = byId(config.inputId);
        if (!input || !markRequestedAutocompleteBound(input)) return;
        input.disabled = false;
        input.placeholder = "Ej. Cosentyx®, Humira®, Skyrizi®...";
        input.addEventListener("input", function () { handleRequestedAutocompleteInput(config); });
        input.addEventListener("keydown", function (event) {
            var dropdown = byId(config.dropdownId);
            if (dropdown.classList.contains("hidden")) return;
            var items = dropdown.querySelectorAll(".autocomplete-item");
            if (items.length === 0) return;
            if (event.key === "ArrowDown") {
                event.preventDefault();
                config.activeIndex = Math.min(config.activeIndex + 1, items.length - 1);
                items.forEach(function (item, idx) {
                    item.classList.toggle("autocomplete-item--active", idx === config.activeIndex);
                });
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                config.activeIndex = Math.max(config.activeIndex - 1, -1);
                items.forEach(function (item, idx) {
                    item.classList.toggle("autocomplete-item--active", idx === config.activeIndex);
                });
            } else if (event.key === "Enter") {
                if (config.activeIndex >= 0 && config.activeIndex < items.length) {
                    event.preventDefault();
                    items[config.activeIndex].click();
                }
            } else if (event.key === "Escape") {
                clearRequestedAutocompleteDropdown(config.dropdownId);
            }
        });
        input.addEventListener("blur", function () {
            setTimeout(function () {
                if (!document.activeElement || !byId(config.dropdownId).contains(document.activeElement)) clearRequestedAutocompleteDropdown(config.dropdownId);
            }, 150);
        });
    }

    function enableAutocomplete() {
        enableRequestedAutocomplete("fhDermaFarmaco");
        enableAutocompleteManualRequested();
    }

    function createLocalDrugModal() {
        if (byId("localDrugModalOverlay")) return;
        var overlay = createEl("div", "local-drug-modal-overlay hidden");
        overlay.id = "localDrugModalOverlay";
        var modal = createEl("div", "local-drug-modal");
        var header = createEl("div", "local-drug-modal-header");
        var title = createEl("h3", "local-drug-modal-title", "Solicitud de fármaco local");
        var closeBtn = createEl("button", "local-drug-modal-close", "×");
        closeBtn.id = "btnCloseLocalDrugModal";
        closeBtn.type = "button";
        closeBtn.setAttribute("aria-label", "Cerrar");
        closeBtn.addEventListener("click", closeLocalDrugModal);
        header.appendChild(title);
        header.appendChild(closeBtn);
        var body = createEl("div", "local-drug-modal-body");
        var warning = createEl("div", "warning-box");
        var p1 = createEl("p");
        var strong = createEl("strong", "", "⚠ Solicitud local especial pendiente de revisión por Farmacia.");
        p1.appendChild(strong);
        warning.appendChild(p1);
        warning.appendChild(createEl("p", "local-drug-modal-explainer", "Esta opción crea una solicitud local especial pendiente de revisión por Farmacia. No modifica CIMA ni el catálogo oficial. En esta demo solo genera un registro temporal para continuar la validación."));
        body.appendChild(warning);
        var formGrid = createEl("div", "form-grid");
        [
            { id: "localDrugDisplayName", label: "Nombre / display name" },
            { id: "localDrugPrincipio", label: "Principio activo" },
            { id: "localDrugPresentacion", label: "Presentación" },
            { id: "localDrugVia", label: "Vía" },
            { id: "localDrugTipoSituacion", label: "Tipo situación" }
        ].forEach(function (field) {
            var fg = createEl("div", "form-group");
            var label = createEl("label", "", field.label);
            label.setAttribute("for", field.id);
            var input = createEl("input", "form-control");
            input.type = "text";
            input.id = field.id;
            fg.appendChild(label);
            fg.appendChild(input);
            formGrid.appendChild(fg);
        });
        body.appendChild(formGrid);
        var obsGroup = createEl("div", "form-group form-group--full");
        var obsLabel = createEl("label", "", "Observaciones");
        obsLabel.setAttribute("for", "localDrugObservaciones");
        var obsTextarea = createEl("textarea", "form-textarea");
        obsTextarea.id = "localDrugObservaciones";
        obsTextarea.rows = 2;
        obsGroup.appendChild(obsLabel);
        obsGroup.appendChild(obsTextarea);
        body.appendChild(obsGroup);
        var footer = createEl("div", "local-drug-modal-footer");
        var cancelBtn = createEl("button", "btn btn-secondary", "Cancelar");
        cancelBtn.type = "button";
        cancelBtn.addEventListener("click", closeLocalDrugModal);
        var useBtn = createEl("button", "btn btn-primary", "Usar en formulario");
        useBtn.type = "button";
        useBtn.addEventListener("click", useLocalDrugInForm);
        footer.appendChild(cancelBtn);
        footer.appendChild(useBtn);
        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);
        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) closeLocalDrugModal();
        });
        document.body.appendChild(overlay);
    }

    function showLocalDrugModal() {
        createLocalDrugModal();
        byId("localDrugModalOverlay").classList.remove("hidden");
        byId("localDrugDisplayName").focus();
    }

    function closeLocalDrugModal() {
        var overlay = byId("localDrugModalOverlay");
        if (overlay) overlay.classList.add("hidden");
    }

    function useLocalDrugInForm() {
        var displayName = byId("localDrugDisplayName").value.trim();
        var principio = byId("localDrugPrincipio").value.trim();
        var presentacion = byId("localDrugPresentacion").value.trim();
        var via = byId("localDrugVia").value.trim();
        if (!displayName) {
            window.alert("El nombre / display name es obligatorio.");
            return;
        }
        var ids = requestedFieldIds();
        byId(ids.farmaco).value = displayName;
        if (principio) byId(ids.principioActivo).value = principio;
        if (presentacion) byId(ids.dosis).value = presentacion;
        if (via) {
            var viaValue = mapViaToSelect(via);
            var viaSelect = byId(ids.via);
            var viaOptions = Array.from(viaSelect.options).map(function (opt) { return opt.value; });
            if (viaOptions.indexOf(viaValue) !== -1) viaSelect.value = viaValue;
            else if (viaOptions.indexOf("Otra") !== -1) viaSelect.value = "Otra";
        }
        // This is free professional entry, not selection of a concrete catalog presentation.
        closeLocalDrugModal();
        updateSolicitadoSummary();
    }

    function createOtherDrug() {
        otherDrugRowSeq += 1;
        return {
            uid: "other-drug-" + otherDrugRowSeq,
            relationType: "",
            farmaco: "",
            principioActivo: "",
            dosis: "",
            via: "",
            pauta: "",
            fechaInicio: "",
            fechaFin: "",
            motivo: "",
            sospechosoEa: "No consta"
        };
    }

    function updateOtherDrugsEmptyState() {
        byId("otrosFarmacosEmpty").classList.toggle("hidden", otherDrugs.length > 0);
    }

    function updateOtherDrugField(uid, key, value) {
        otherDrugs = otherDrugs.map(function (drug) {
            if (drug.uid === uid) drug[key] = value;
            return drug;
        });
    }

    function buildOtherDrugField(labelText, control) {
        var wrap = createEl("div", "form-group");
        var label = createEl("label", "", labelText);
        wrap.appendChild(label);
        wrap.appendChild(control);
        return wrap;
    }

    function renderOtherDrugRow(drug) {
        var card = createEl("section", "other-drug-card");
        card.setAttribute("data-other-drug-id", drug.uid);
        var header = createEl("div", "other-drug-card__header");
        header.appendChild(createEl("h4", "other-drug-card__title", "Fármaco relacionado"));
        var removeButton = createEl("button", "btn btn-outline btn-remove-drug", "Eliminar");
        removeButton.type = "button";
        removeButton.addEventListener("click", function () {
            otherDrugs = otherDrugs.filter(function (item) { return item.uid !== drug.uid; });
            renderOtherDrugs();
        });
        header.appendChild(removeButton);
        card.appendChild(header);

        var grid = createEl("div", "form-grid other-drug-card__grid");
        var relationSelect = buildSelect("", "form-select", [{ value: "", label: "Seleccionar…" }].concat(RELATION_OPTIONS.map(function (value) { return { value: value, label: value }; })), drug.relationType);
        relationSelect.addEventListener("change", function () { updateOtherDrugField(drug.uid, "relationType", this.value); });
        grid.appendChild(buildOtherDrugField("Tipo de relación", relationSelect));

        [
            { key: "farmaco", label: "Fármaco", type: "text" },
            { key: "principioActivo", label: "Principio activo", type: "text" },
            { key: "dosis", label: "Dosis", type: "text" },
            { key: "pauta", label: "Pauta", type: "text" },
            { key: "fechaInicio", label: "Fecha inicio", type: "date" },
            { key: "fechaFin", label: "Fecha fin", type: "date" },
            { key: "motivo", label: "Motivo/contexto", type: "text" }
        ].forEach(function (field) {
            var input = createEl("input", "form-control");
            input.type = field.type;
            input.value = drug[field.key] || "";
            input.addEventListener("input", function () { updateOtherDrugField(drug.uid, field.key, this.value); });
            grid.appendChild(buildOtherDrugField(field.label, input));
        });

        var viaSelect = buildSelect("", "form-select", VIA_OPTIONS.map(function (v) {
            return { value: v, label: v || "Seleccionar…" };
        }), mapViaToSelect(drug.via, null));
        viaSelect.addEventListener("change", function () { updateOtherDrugField(drug.uid, "via", this.value); });
        grid.appendChild(buildOtherDrugField("Vía", viaSelect));

        var eaSelect = buildSelect("", "form-select", EA_SUSPECT_OPTIONS, drug.sospechosoEa);
        eaSelect.addEventListener("change", function () { updateOtherDrugField(drug.uid, "sospechosoEa", this.value); });
        grid.appendChild(buildOtherDrugField("Sospechoso de EA", eaSelect));

        card.appendChild(grid);
        return card;
    }

    function renderOtherDrugs() {
        var list = byId("otrosFarmacosList");
        F.clearChildren(list);
        otherDrugs.forEach(function (drug) {
            list.appendChild(renderOtherDrugRow(drug));
        });
        updateOtherDrugsEmptyState();
    }

    function addOtherDrug() {
        otherDrugs.push(createOtherDrug());
        renderOtherDrugs();
    }

    function readNaranjoAnswersFromDom() {
        return {
            q1: byId("naranjoQ1").value,
            q2: byId("naranjoQ2").value,
            q3: byId("naranjoQ3").value,
            q4: byId("naranjoQ4").value,
            q5: byId("naranjoQ5").value,
            q6: byId("naranjoQ6").value,
            q7: byId("naranjoQ7").value,
            q8: byId("naranjoQ8").value,
            q9: byId("naranjoQ9").value,
            q10: byId("naranjoQ10").value
        };
    }

    function updateNaranjoScore() {
        var answers = readNaranjoAnswersFromDom();
        var score = M.calculateNaranjoScore(answers);
        var category = M.categorizeNaranjo(score);
        setText("naranjoScore", String(score));
        setText("naranjoCategoria", category);
        updateResumenCausalidad();
    }

    function readKarchLasagnaAnswersFromDom() {
        return {
            temporal: byId("klTemporal").value,
            conocido: byId("klConocido").value,
            alternativa: byId("klAlternativa").value,
            suspendido: byId("klSuspendido").value,
            mejoraRetirada: byId("klMejoraRetirada").value,
            readministracion: byId("klReadministracion").value,
            reaparece: byId("klReaparece").value
        };
    }

    function updateKarchLasagna() {
        var category = M.categorizeKarchLasagna(readKarchLasagnaAnswersFromDom());
        setText("klCategoria", category);
        updateResumenCausalidad();
    }

    function toggleCausalityModules() {
        ["modEfectoAdverso", "modNaranjo", "modKarchLasagna", "modResumenCausalidad"].forEach(function (id) {
            byId(id).classList.add("hidden");
        });
        if (byId("fhEaActivationNotice")) byId("fhEaActivationNotice").classList.remove("hidden");
        updateResumenCausalidad();
    }

    function updateResumenCausalidad() {
        var naranjoScore = byId("naranjoScore").textContent || "0";
        var naranjoCategoria = byId("naranjoCategoria").textContent || "Dudosa";
        var klCategoria = byId("klCategoria").textContent || "No clasificable";
        setText("resumenNaranjo", naranjoScore + " · " + naranjoCategoria);
        setText("resumenKl", klCategoria);
        if (byId("fhEaNotificado").value !== "si") {
            if (byId("fhCausalidadFinal").value !== "No evaluada") byId("fhCausalidadFinal").value = "No evaluada";
        }
    }

    function applyNaranjoToFinal() {
        var category = byId("naranjoCategoria").textContent;
        if (NARANJO_TO_FINAL[category]) byId("fhCausalidadFinal").value = NARANJO_TO_FINAL[category];
        updateResumenCausalidad();
    }

    function applyKarchLasagnaToFinal() {
        var category = byId("klCategoria").textContent;
        if (KL_TO_FINAL[category]) byId("fhCausalidadFinal").value = KL_TO_FINAL[category];
        updateResumenCausalidad();
    }

    function otherDrugsLines() {
        if (otherDrugs.length === 0) return ["Sin otros fármacos añadidos todavía."];
        return otherDrugs.map(function (drug, index) {
            return [
                (index + 1) + ".",
                "Tipo de relación: " + valueOrDash(drug.relationType),
                "Fármaco: " + valueOrDash(drug.farmaco),
                "Principio activo: " + valueOrDash(drug.principioActivo),
                "Dosis: " + valueOrDash(drug.dosis),
                "Vía: " + valueOrDash(drug.via),
                "Pauta: " + valueOrDash(drug.pauta),
                "Fecha inicio: " + valueOrDash(drug.fechaInicio),
                "Fecha fin: " + valueOrDash(drug.fechaFin),
                "Motivo/contexto: " + valueOrDash(drug.motivo),
                "Sospechoso de EA: " + valueOrDash(drug.sospechosoEa)
            ].join(" | ");
        });
    }

    function buildValidationClinicalObservationsV2() {
        var pathology = activeDermaPathology();
        if (!pathology) return null;
        var observations = [];
        function add(code, id, kind) {
            var el = byId(id);
            if (!el) return;
            var value = kind === "checkbox" ? (el.checked ? "yes" : "") : explicitExportValue(el.value);
            if (value === "") return;
            observations.push({ code: code, value: value, source: "validation_origin_form", pathology_label: pathology });
        }
        if (pathology === "Hidradenitis supurativa") {
            add("hs_ihs4", "fhHSIhs4"); add("hs_hurley", "fhHSHurley"); add("hs_dlqi", "fhHSDlqi");
            add("hs_main_location", "fhHSLocalizacion"); add("hs_evolution_time", "fhHSTiempoEvolucion"); add("hs_clinical_reason", "fhHSMotivoClinico");
            add("hs_previous_doxycycline_clindamycin", "fhHSTtoDoxiClinda", "checkbox");
            add("hs_previous_rifampicin_clindamycin", "fhHSTtoRifClinda", "checkbox");
            add("hs_previous_other_antibiotic", "fhHSTtoOtrosAb", "checkbox");
            if (byId("fhHSTtoOtrosAb") && byId("fhHSTtoOtrosAb").checked) add("hs_previous_other_antibiotic_detail", "fhHSTtoOtrosAbTxt");
            add("hs_previous_adalimumab", "fhHSBioAda", "checkbox");
            if (byId("fhHSBioAda") && byId("fhHSBioAda").checked) { add("hs_previous_adalimumab_duration", "fhHSBioAdaDuracion"); add("hs_previous_adalimumab_end_reason", "fhHSBioAdaMotivo"); }
            add("hs_previous_other_biologic", "fhHSBioOtros", "checkbox");
            if (byId("fhHSBioOtros") && byId("fhHSBioOtros").checked) { add("hs_previous_other_biologic_name", "fhHSBioOtrosFarmaco"); add("hs_previous_other_biologic_end_reason", "fhHSBioOtrosMotivo"); }
            add("hs_previous_treatments_note", "fhHSTratamientosPrevios");
        } else if (pathology === "Psoriasis") {
            add("psoriasis_pasi", "fhPsPasi"); add("psoriasis_bsa", "fhPsBsa"); add("psoriasis_dlqi", "fhPsDlqi"); add("psoriasis_pga", "fhPsPga");
            add("psoriasis_previous_systemic_decision", "fhPsSistemicoPrevio");
            if (visibleElementValue("fhPsSistemicoPrevio") === "si") { add("psoriasis_previous_systemic_name", "fhPsSistemicoFarmaco"); add("psoriasis_previous_systemic_duration", "fhPsSistemicoDuracion"); add("psoriasis_previous_systemic_end_reason", "fhPsSistemicoMotivo"); }
            if (visibleElementValue("fhPsSistemicoPrevio") === "no") add("psoriasis_no_previous_systemic_reason", "fhPsSistemicoNoMotivo");
        } else if (pathology === "Dermatitis atópica") {
            add("atopic_dermatitis_easi", "fhDaEasi"); add("atopic_dermatitis_scorad", "fhDaScorad"); add("atopic_dermatitis_dlqi_poem", "fhDaDlqiPoem");
            add("atopic_dermatitis_previous_ciclosporin_decision", "fhDaCiclosporinaPrevia");
            if (visibleElementValue("fhDaCiclosporinaPrevia") === "si") { add("atopic_dermatitis_ciclosporin_dose", "fhDaCiclosporinaDosis"); add("atopic_dermatitis_ciclosporin_duration", "fhDaCiclosporinaDuracion"); add("atopic_dermatitis_ciclosporin_end_reason", "fhDaCiclosporinaMotivo"); }
            if (visibleElementValue("fhDaCiclosporinaPrevia") === "no") add("atopic_dermatitis_no_ciclosporin_reason", "fhDaCiclosporinaNoMotivo");
        } else if (pathology === "Vitíligo") {
            add("vitiligo_extent", "fhVitExtension"); add("vitiligo_facial_involvement", "fhVitFacial");
            add("vitiligo_previous_calcineurin_inhibitor", "fhVitCalcineurinaPrevia"); add("vitiligo_previous_topical_corticosteroids", "fhVitCorticoidesPrevios");
            add("vitiligo_clinical_observations", "fhVitObservaciones");
        } else if (pathology === "Alopecia areata") {
            add("alopecia_extent_over_50_percent", "fhAaExtension50"); add("alopecia_episode_over_6_months", "fhAaEpisodio6Meses");
            add("alopecia_previous_systemic_corticosteroids", "fhAaCorticoidesSistemicos"); add("alopecia_clinical_observations", "fhAaObservaciones");
        }
        return observations.length ? observations : null;
    }

    function buildValidationRelatedTreatmentsV2() {
        var rows = [];
        otherDrugs.forEach(function (drug) {
            var hasClinicalData = [drug.farmaco, drug.principioActivo, drug.dosis, drug.via, drug.pauta, drug.fechaInicio, drug.fechaFin, drug.motivo]
                .some(function (value) { return explicitExportValue(value) !== ""; }) || (drug.sospechosoEa && drug.sospechosoEa !== "No consta");
            if (!hasClinicalData) return;
            var row = { source_row_uid: drug.uid };
            function put(key, value) { value = explicitExportValue(value); if (value) row[key] = value; }
            put("relation_type", drug.relationType); put("drug_name", drug.farmaco); put("active_ingredient", drug.principioActivo);
            put("dose_text", drug.dosis); put("route", drug.via); put("schedule_text", drug.pauta);
            put("start_date", drug.fechaInicio); put("end_date", drug.fechaFin); put("reason", drug.motivo);
            if (drug.sospechosoEa && drug.sospechosoEa !== "No consta") put("adverse_event_suspect", drug.sospechosoEa);
            rows.push(row);
        });
        return rows.length ? rows : null;
    }

    function buildValidationV2Input(technicalContext) {
        technicalContext = technicalContext || {};
        var activeDermaForV2 = activeDermaPathology();
        var technical = {};
        ["eventId", "sourceEventId", "rowKey", "validationId", "patientId", "occurredAt", "recordedAt", "demoFlag", "eventStatus",
            "requestId", "hospitalCode", "professionalRef", "identifierSystem", "validatedTreatmentId", "validatedLineId", "lineCreationStatus",
            "prebiologicRequired", "prebiologicOverallStatus", "preventiveMedicineStatus", "validationBlockers"].forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(technicalContext, key)) technical[key] = technicalContext[key];
        });
        var result = visibleElementValue("fhValEstado") || null;
        return {
            technical: technical,
            context: {
                identifierValue: visibleCipForExport() || null,
                serviceCode: Object.prototype.hasOwnProperty.call(technicalContext, "serviceCode") ? technicalContext.serviceCode : null,
                serviceLabel: visibleServiceForExport() || null,
                pathologyCode: Object.prototype.hasOwnProperty.call(technicalContext, "pathologyCode") ? technicalContext.pathologyCode : null,
                pathologyLabel: visiblePatologiaForExport() || null,
                professionalDisplay: visibleElementValue("fhValFarmaceutico") || null
            },
            request: {
                origin: currentOrigenEntradaValue() || null,
                date: visibleRequestedDateForExport() || null,
                validationType: visibleElementValue("fhTipoValidacion") || null,
                appointmentDate: visibleElementValue("fhValCita") || null,
                weightText: visibleElementValue(requestedFieldIds().peso) || null,
                justification: requestedJustificationForExport() || null,
                sourceObservations: visibleElementValue(requestedFieldIds().observaciones) || null
            },
            requestedTreatment: requestedTreatmentV2(),
            decision: {
                result: result,
                pendingReason: result === "pending" ? (visibleElementValue("fhValPendingReason") || null) : null,
                denialReason: result === "denied" ? (visibleElementValue("fhValMotivo") || null) : null,
                pharmacyObservations: visibleElementValue("fhValidadoJustificacion") || null,
                otherObservations: visibleElementValue("fhValObservaciones") || null,
                validatedTreatmentRelation: getValidatedTreatmentRelation()
            },
            validatedTreatment: validatedTreatmentV2(),
            prebiologic: {
                analysisDate: visibleElementValue("fhAnaliticaFecha") || null,
                analysisRecentStatus: visibleElementValue("fhAnaliticaReciente") || null,
                hemogramVerified: byId("fhAnaliticaHemograma") && byId("fhAnaliticaHemograma").checked ? true : null,
                biochemistryVerified: byId("fhAnaliticaBioquimica") && byId("fhAnaliticaBioquimica").checked ? true : null,
                tbStatus: visibleElementValue("fhAnaliticaMantoux") || null,
                hbvStatus: visibleElementValue("fhAnaliticaSerologiasVhb") || null,
                hcvStatus: visibleElementValue("fhAnaliticaSerologiasVhc") || null,
                hivStatus: visibleElementValue("fhAnaliticaSerologiasVih") || null,
                vaccinationStatus: visibleElementValue("fhAnaliticaVacunacion") || null,
                vaccinationObservations: visibleElementValue("fhAnaliticaObservaciones") || null
            },
            comorbidities: {
                recurrentInfectionsStatus: activeDermaForV2 ? (visibleElementValue("fhDermaComorbInfeccionesRecurrentes") || null) : null,
                cardiovascularRiskStatus: activeDermaForV2 ? (visibleElementValue("fhDermaComorbRiesgoCardiovascular") || null) : null,
                neurologicDisorderStatus: activeDermaForV2 ? (visibleElementValue("fhDermaComorbAlteracionesNeurologicas") || null) : null,
                neoplasiaHistoryOrRiskStatus: activeDermaForV2 ? (visibleElementValue("fhDermaComorbRiesgoNeoplasia") || null) : null
            },
            clinicalObservations: buildValidationClinicalObservationsV2(),
            relatedTreatments: buildValidationRelatedTreatmentsV2()
        };
    }

    function buildValidationV2Projection(technicalContext) {
        var adapter = window.FarmaciaExportV2ValidationAdapter;
        if (!adapter) throw new ValidationV2ContextError("V2_ADAPTER_UNAVAILABLE", "FarmaciaExportV2ValidationAdapter no disponible.");
        return adapter.buildValidationProjection(buildValidationV2Input(technicalContext));
    }

    function ValidationV2ContextError(code, message, details) {
        this.name = "FarmaciaValidacionV2ContextError";
        this.code = code;
        this.message = message;
        this.details = details || null;
    }
    ValidationV2ContextError.prototype = Object.create(Error.prototype);
    ValidationV2ContextError.prototype.constructor = ValidationV2ContextError;

    function normalizeValidationV2Cip(value) {
        return String(value == null ? "" : value).trim().toUpperCase();
    }

    function getValidationV2TechnicalContext() {
        var visibleCip = selectedCip();
        if (currentPatient && currentPatient.cip && normalizeValidationV2Cip(currentPatient.cip) !== normalizeValidationV2Cip(visibleCip)) {
            throw new ValidationV2ContextError("V2_CONTEXT_STALE", "El CIP visible no coincide con el paciente enlazado en Validación.");
        }
        var provider = window.FarmaciaExportV2TechnicalContext;
        if (!provider || provider.PROVIDER_VERSION !== "1.0.0-draft.1" || typeof provider.getContext !== "function") {
            throw new ValidationV2ContextError("V2_CONTEXT_PROVIDER_UNAVAILABLE", "El proveedor de contexto técnico v2 no está disponible.");
        }
        var context = provider.getContext("validation", visibleCip);
        if (!context) throw new ValidationV2ContextError("V2_CONTEXT_UNAVAILABLE", "No existe contexto técnico sintético de Validación para el CIP visible.");
        var required = ["eventId", "sourceEventId", "rowKey", "validationId", "patientId", "occurredAt", "recordedAt", "demoFlag", "eventStatus"];
        var missing = required.filter(function (field) {
            return !Object.prototype.hasOwnProperty.call(context, field) || (field === "demoFlag" ? context[field] !== true : typeof context[field] !== "string" || !context[field]);
        });
        if (missing.length) throw new ValidationV2ContextError("V2_CONTEXT_INCOMPLETE", "El contexto técnico de Validación está incompleto.", { fields: missing });
        return context;
    }

    function buildValidationV2ProjectionFromCurrentContext() {
        return buildValidationV2Projection(getValidationV2TechnicalContext());
    }

    var validationV2CopyInFlight = false;

    async function copyValidationV2TsvExact(tsv) {
        if (typeof tsv !== "string") throw new Error("La proyección v2 no contiene un TSV válido.");
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
            try {
                await navigator.clipboard.writeText(tsv);
                return;
            } catch (error) {
                // Continue with the local fallback when Clipboard API access is denied.
            }
        }
        var textarea = document.createElement("textarea");
        textarea.value = tsv;
        textarea.setAttribute("readonly", "");
        textarea.setAttribute("aria-hidden", "true");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        var copied = false;
        try {
            copied = typeof document.execCommand === "function" && document.execCommand("copy") === true;
        } catch (error) {
            copied = false;
        } finally {
            document.body.removeChild(textarea);
        }
        if (!copied) throw new Error("No se pudo confirmar la copia local al portapapeles.");
    }

    function updateValidationV2ExportAvailability() {
        var button = byId("fhValExportV2Btn");
        var status = byId("fhValExportV2Status");
        if (!button) return;
        try {
            getValidationV2TechnicalContext();
            button.disabled = validationV2CopyInFlight;
            if (status && status.textContent.indexOf("Export v2 demo no disponible:") === 0) status.textContent = "";
        } catch (error) {
            button.disabled = true;
            if (status) status.textContent = "Export v2 demo no disponible: " + (error.message || "contexto técnico no disponible") + ".";
        }
    }

    async function handleValidationV2Export() {
        if (validationV2CopyInFlight) return;
        var button = byId("fhValExportV2Btn");
        var status = byId("fhValExportV2Status");
        validationV2CopyInFlight = true;
        if (button) button.disabled = true;
        if (status) status.textContent = "Copiando Export v2 demo...";
        try {
            var projection = window.FarmaciaValidacion.buildValidationV2ProjectionFromCurrentContext();
            await copyValidationV2TsvExact(projection.tsv);
            var rowCount = projection.rows.length;
            var success = "Export v2 demo copiado: " + rowCount + " fila(s) × 152 columnas.";
            if (status) {
                status.textContent = success;
                window.setTimeout(function () {
                    if (status.textContent === success) status.textContent = "";
                }, 3000);
            }
        } catch (error) {
            if (status) status.textContent = "No se pudo copiar Export v2 demo: " + (error.message || "error desconocido") + ".";
        } finally {
            validationV2CopyInFlight = false;
            updateValidationV2ExportAvailability();
        }
    }

    function buildValidationLines() {
        var lines = [];
        var validado = currentTreatmentSummary();
        var solicitado = requestedTreatmentSummary();
        var naranjoAnswers = readNaranjoAnswersFromDom();
        var klAnswers = readKarchLasagnaAnswersFromDom();
        var origenLabel = byId("fhOrigenEntrada");
        var tipoValLabel = byId("fhTipoValidacion");
        lines.push("=== INFORME DE VALIDACIÓN FARMACOTERAPÉUTICA ===");
        lines.push("Identificador demo: FH-VAL-" + Date.now().toString(36).toUpperCase());
        lines.push("Fecha: " + new Date().toLocaleDateString("es-ES"));
        lines.push("");
        lines.push("Origen de entrada: " + (origenLabel && origenLabel.options[origenLabel.selectedIndex] ? origenLabel.options[origenLabel.selectedIndex].text : "—"));
        lines.push("Tipo de validación: " + (tipoValLabel && tipoValLabel.options[tipoValLabel.selectedIndex] ? tipoValLabel.options[tipoValLabel.selectedIndex].text : "—"));
        lines.push("Servicio origen: " + valueOrDash(visibleServiceForExport()));
        lines.push("CIP: " + selectedCip());
        lines.push("Patología: " + selectedPatologia());
        lines.push("Fecha solicitud: " + valueOrDash(visibleRequestedDateForExport()));
        var dermaClinical = buildDermaClinicalSummary();
        if (dermaClinical.active) {
            lines.push("");
            dermaClinical.lines.forEach(function (line) { lines.push(line); });
        }

        lines.push("");
        lines.push("TRATAMIENTO SOLICITADO");
        lines.push("Fármaco solicitado: " + solicitado.farmaco);
        lines.push("Principio activo: " + solicitado.principioActivo);
        lines.push("Dosis solicitada: " + solicitado.dosis);
        lines.push("Vía: " + solicitado.via);
        lines.push("Pauta: " + solicitado.pauta);
        lines.push("Inducción: " + solicitado.induccion);
        lines.push("Justificación clínica: " + solicitado.justificacion);

        lines.push("");
        lines.push("TRATAMIENTO VALIDADO POR FARMACIA");
        lines.push("Fármaco validado: " + validado.farmaco);
        lines.push("Principio activo: " + validado.principioActivo);
        lines.push("Dosis prescrita: " + validado.dosis);
        lines.push("Vía: " + validado.via);
        lines.push("Pauta: " + validado.pauta);
        lines.push("Inducción: " + validado.induccion);
        lines.push("Presentación: " + validado.presentacion);
        lines.push("Observaciones de Farmacia Hospitalaria: " + validado.observacionesFh);

        lines.push("");
        lines.push("OTROS FÁRMACOS / BIOLÓGICOS");
        otherDrugsLines().forEach(function (line) { lines.push(line); });

        lines.push("");
        lines.push("ESTUDIO PREBIOLÓGICO");
        lines.push("Fecha analítica: " + valueOrDash(byId("fhAnaliticaFecha").value));
        lines.push("Analítica <3 meses: " + (byId("pbStatusAnaliticaReciente") ? byId("pbStatusAnaliticaReciente").textContent : valueOrDash(byId("fhAnaliticaReciente").value)));
        lines.push("Hemograma: " + (byId("pbStatusHemograma") ? byId("pbStatusHemograma").textContent : (byId("fhAnaliticaHemograma").checked ? "Verificado" : "No verificado")));
        lines.push("Bioquímica: " + (byId("pbStatusBioquimica") ? byId("pbStatusBioquimica").textContent : (byId("fhAnaliticaBioquimica").checked ? "Verificado" : "No verificado")));
        lines.push("Mantoux/IGRA: " + (byId("pbStatusMantoux") ? byId("pbStatusMantoux").textContent : valueOrDash(byId("fhAnaliticaMantoux").value)));
        lines.push("VHB: " + (byId("pbStatusVhb") ? byId("pbStatusVhb").textContent : valueOrDash(byId("fhAnaliticaSerologiasVhb").value)));
        lines.push("VHC: " + (byId("pbStatusVhc") ? byId("pbStatusVhc").textContent : valueOrDash(byId("fhAnaliticaSerologiasVhc").value)));
        lines.push("VIH: " + (byId("pbStatusVih") ? byId("pbStatusVih").textContent : valueOrDash(byId("fhAnaliticaSerologiasVih").value)));
        lines.push("Vacunación: " + (byId("pbStatusVacunacion") ? byId("pbStatusVacunacion").textContent : valueOrDash(byId("fhAnaliticaVacunacion").value)));
        lines.push("Observaciones prebiológico: " + valueOrDash(byId("fhPrebiologicoObservaciones") ? byId("fhPrebiologicoObservaciones").textContent : byId("fhAnaliticaObservaciones").value));

        if (!byId("modEfectoAdverso").classList.contains("hidden")) {
            lines.push("");
            lines.push("EFECTO ADVERSO / RAM");
            lines.push("¿Existe sospecha de RAM?: " + byId("fhEaNotificado").options[byId("fhEaNotificado").selectedIndex].text);
        }

        if (!byId("modNaranjo").classList.contains("hidden")) {
            lines.push("");
            lines.push("ALGORITMO DE NARANJO");
            Object.keys(naranjoAnswers).forEach(function (key) {
                lines.push(key.toUpperCase() + ": " + valueOrDash(naranjoAnswers[key]));
            });
            lines.push("Puntuación total: " + byId("naranjoScore").textContent);
            lines.push("Categoría: " + byId("naranjoCategoria").textContent);
        }

        if (!byId("modKarchLasagna").classList.contains("hidden")) {
            lines.push("");
            lines.push("KARCH-LASAGNA");
            lines.push("Temporalidad: " + valueOrDash(klAnswers.temporal));
            lines.push("Evento conocido: " + valueOrDash(klAnswers.conocido));
            lines.push("Alternativa: " + valueOrDash(klAnswers.alternativa));
            lines.push("Retirada: " + valueOrDash(klAnswers.suspendido));
            lines.push("Mejora: " + valueOrDash(klAnswers.mejoraRetirada));
            lines.push("Readministración: " + valueOrDash(klAnswers.readministracion));
            lines.push("Reaparición: " + valueOrDash(klAnswers.reaparece));
            lines.push("Categoría: " + byId("klCategoria").textContent);
        }

        if (!byId("modResumenCausalidad").classList.contains("hidden")) {
            lines.push("");
            lines.push("RESUMEN DE CAUSALIDAD");
            lines.push("Naranjo: " + byId("resumenNaranjo").textContent);
            lines.push("Karch-Lasagna: " + byId("resumenKl").textContent);
            lines.push("Causalidad final farmacéutica: " + byId("fhCausalidadFinal").value);
        }

        lines.push("");
        lines.push("Estado validación: " + estadoLabel());
        lines.push("Motivo denegación: " + valueOrDash(byId("fhValMotivo").value));
        lines.push("Fecha cita Farmacia: " + valueOrDash(byId("fhValCita").value));
        lines.push("Farmacéutico responsable: " + byId("fhValFarmaceutico").textContent.trim());
        lines.push("Otras observaciones del acto de validación: " + valueOrDash(byId("fhValObservaciones").value));
        lines.push("");
        lines.push("=== FIN DEL INFORME ===");
        lines.push("Generado por: Hub Clínico Badajoz — Demo Farmacia v0.2");
        lines.push("ATENCIÓN: Datos sintéticos. No usar para decisiones clínicas reales.");
        return lines;
    }

    function buildCsvRows() {
        var naranjoAnswers = readNaranjoAnswersFromDom();
        var klAnswers = readKarchLasagnaAnswersFromDom();
        var summary = requestedTreatmentSummary();
        var validatedSummary = currentTreatmentSummary();
        var validatedPauta = visiblePauta("fhValidadoPauta", "fhValidadoPautaOtro");
        var dermaClinical = buildDermaClinicalSummary();
        var commonByLabel = {};
        dermaClinical.common.forEach(function (field) { commonByLabel[field.label] = field.value; });
        var pautaNormalized = (P && typeof P.normalizePautaLabel === "function") ? P.normalizePautaLabel(summary.pauta) : null;
        var snap = C.getSnapshot(catalogContext("validacion.solicitado"));
        var rows = [
            [
                "ID", "Fecha", "Servicio", "CIP", "Patologia", "Estado", "FarmacoSolicitado", "PrincipioActivo", "DosisPresentacion", "Via", "Pauta", "PautaCodigo", "PautaLabel", "PautaIntervaloDias", "PautaUnidad", "PautaOtroTexto", "InduccionSolicitada", "Profesional", "VHB", "VHC", "VIH", "MotivoDenegacion", "SnapshotDrugID", "SnapshotSourceType", "CodigoNacional", "NRegistro",
                "NaranjoScore", "NaranjoCategoria", "KLCategoria", "CausalidadFinalFarmaceutica",
                "NaranjoQ1", "NaranjoQ2", "NaranjoQ3", "NaranjoQ4", "NaranjoQ5", "NaranjoQ6", "NaranjoQ7", "NaranjoQ8", "NaranjoQ9", "NaranjoQ10",
                "KLTemporal", "KLConocido", "KLAlternativa", "KLSuspendido", "KLMejora", "KLReadministracion", "KLReaparece",
                "OtrosFarmacosRelacionados", "FarmacoValidado", "PrincipioActivoValidado", "DosisPresentacionValidada", "ViaValidada",
                "PautaValidada", "PautaValidadaCodigo", "PautaValidadaLabel", "PautaValidadaOtroTexto", "JustificacionClinica",
                "ObservacionesFarmaciaHospitalaria", "OtrasObservacionesActoValidacion", "InfeccionesRecurrentes",
                "RiesgoOAntecedentesCardiovasculares", "AlteracionesNeurologicas", "AntecedentesORiesgoNeoplasia", "ResumenClinicoDermatologia"
            ],
            [
                "FH-" + Date.now().toString(36).toUpperCase(),
                valueOrDash(visibleRequestedDateForExport()),
                valueOrDash(visibleServiceForExport()),
                selectedCip(),
                selectedPatologia(),
                estadoLabel(),
                summary.farmaco,
                summary.principioActivo,
                summary.dosis,
                summary.via,
                summary.pauta,
                pautaNormalized ? pautaNormalized.pauta_codigo : "—",
                pautaNormalized ? pautaNormalized.pauta_label : "—",
                pautaNormalized ? pautaNormalized.pauta_intervalo_dias : "—",
                pautaNormalized ? pautaNormalized.pauta_unidad : "—",
                pautaNormalized ? (pautaNormalized.pauta_otro_texto || "—") : "—",
                summary.induccion,
                byId("fhValFarmaceutico").textContent.trim(),
                valueOrDash(byId("fhAnaliticaSerologiasVhb").value),
                valueOrDash(byId("fhAnaliticaSerologiasVhc").value),
                valueOrDash(byId("fhAnaliticaSerologiasVih").value),
                valueOrDash(byId("fhValMotivo").value),
                snap && snap.drug_id ? snap.drug_id : "—",
                snap && snap.source_type ? snap.source_type : "—",
                snap && snap.codigo_nacional_snapshot ? snap.codigo_nacional_snapshot : "—",
                snap && snap.nregistro_snapshot ? snap.nregistro_snapshot : "—",
                byId("naranjoScore").textContent,
                byId("naranjoCategoria").textContent,
                byId("klCategoria").textContent,
                byId("fhCausalidadFinal").value,
                naranjoAnswers.q1,
                naranjoAnswers.q2,
                naranjoAnswers.q3,
                naranjoAnswers.q4,
                naranjoAnswers.q5,
                naranjoAnswers.q6,
                naranjoAnswers.q7,
                naranjoAnswers.q8,
                naranjoAnswers.q9,
                naranjoAnswers.q10,
                klAnswers.temporal,
                klAnswers.conocido,
                klAnswers.alternativa,
                klAnswers.suspendido,
                klAnswers.mejoraRetirada,
                klAnswers.readministracion,
                klAnswers.reaparece,
                otherDrugsLines().join(" || "),
                validatedSummary.farmaco,
                validatedSummary.principioActivo,
                validatedSummary.dosis,
                validatedSummary.via,
                validatedSummary.pauta,
                validatedPauta.codigo || "—",
                validatedPauta.label || "—",
                validatedPauta.otro || "—",
                summary.justificacion,
                validatedSummary.observacionesFh,
                valueOrDash(byId("fhValObservaciones").value),
                commonByLabel["Infecciones recurrentes"] || "",
                commonByLabel["Riesgo o antecedentes cardiovasculares"] || "",
                commonByLabel["Alteraciones neurológicas"] || "",
                commonByLabel["Antecedentes o riesgo de neoplasia"] || "",
                dermaClinical.summary
            ]
        ];
        return rows;
    }

    function bindSummaryInputs() {
        [
            "fhManualCip", "fhManualFecha", "fhManualFarmaco", "fhManualPrincipioActivo", "fhManualDosis", "fhManualVia", "fhManualPauta", "fhManualPautaOtro",
            "fhManualInduccion", "fhManualPeso", "fhManualJustificacion", "fhManualObservaciones",
            "fhDermaFarmaco", "fhDermaPrincipioActivo", "fhDermaDosis", "fhDermaVia", "fhDermaPauta", "fhDermaPautaOtro",
            "fhDermaInduccion", "fhDermaJustificacion", "fhHSMotivoClinico", "fhAnaliticaFecha",
            "fhDigCip", "fhDigFecha", "fhDigFarmaco", "fhDigDosis", "fhDigVia", "fhDigPauta", "fhDigPautaOtro", "fhDigObservaciones",
            "fhAnaliticaReciente", "fhAnaliticaMantoux", "fhAnaliticaSerologiasVhb", "fhAnaliticaSerologiasVhc",
            "fhAnaliticaSerologiasVih", "fhAnaliticaVacunacion", "fhAnaliticaObservaciones",
            "fhValidadoFarmaco", "fhValidadoPrincipioActivo", "fhValidadoDosis", "fhValidadoVia",
            "fhValidadoPauta", "fhValidadoPautaOtro", "fhValidadoInduccion", "fhValidadoPresentacion", "fhValidadoJustificacion"
        ].forEach(function (id) {
            var el = byId(id);
            if (!el) return;
            el.addEventListener("input", updateValidationModuleSummaries);
            el.addEventListener("change", updateValidationModuleSummaries);
        });
        ["fhAnaliticaHemograma", "fhAnaliticaBioquimica"].forEach(function (id) {
            var el = byId(id);
            if (el) el.addEventListener("change", updateValidationModuleSummaries);
        });
    }

    function bindCausalityEvents() {
        byId("fhEaNotificado").addEventListener("change", toggleCausalityModules);
        NARANJO_IDS.forEach(function (id) {
            byId(id).addEventListener("change", updateNaranjoScore);
        });
        KL_IDS.forEach(function (id) {
            byId(id).addEventListener("change", updateKarchLasagna);
        });
        byId("btnApplyNaranjo").addEventListener("click", applyNaranjoToFinal);
        byId("btnApplyKl").addEventListener("click", applyKarchLasagnaToFinal);
    }

    function bindCoreEvents() {
        var origenSel = byId("fhOrigenEntrada");
        if (origenSel) origenSel.addEventListener("change", function () {
            mostrarFormulario(this.value);
            updateValidationModuleSummaries();
            updateValidationExcelExportAvailability();
        });
        var tipoValSel = byId("fhTipoValidacion");
        if (tipoValSel) tipoValSel.addEventListener("change", function () {
            var notice = byId("fhTipoValidacionNotice");
            if (notice) notice.classList.toggle("hidden", this.value === "inicio_nuevo" || this.value === "");
            updateValidationModuleSummaries();
        });
        byId("fhValEstado").addEventListener("change", function (event) {
            byId("fhValPendingReasonRow").classList.toggle("hidden", event.target.value !== "pending");
            byId("fhValMotivoRow").classList.toggle("hidden", event.target.value !== "denied");
            updateValidationExcelExportAvailability();
        });
        var validateRequestedSame = byId("btnValidateRequestedSame");
        if (validateRequestedSame) validateRequestedSame.addEventListener("click", applyRequestedAsValidatedExplicitly);
        byId("fhDermaPatologia").addEventListener("change", function () {
            toggleHSBlock();
            updateValidationModuleSummaries();
        });
        ["fhPsSistemicoPrevio", "fhDaCiclosporinaPrevia"].forEach(function (id) {
            var decision = byId(id);
            if (decision) decision.addEventListener("change", toggleDermaConditionalDetails);
        });
        var servMan = byId("fhServicioManual");
        if (servMan) servMan.addEventListener("change", function () {
            onServicioManualChange();
            updateSeguimientoHandoffLink();
        });
        var patMan = byId("fhPatologiaManual");
        if (patMan) patMan.addEventListener("change", function () {
            onPatologiaManualChange();
            updateSeguimientoHandoffLink();
        });
        byId("fhHSBioAda").addEventListener("change", toggleBioAdaDetalle);
        byId("fhHSBioOtros").addEventListener("change", toggleBioOtrosDetalle);
        byId("fhHSTtoOtrosAb").addEventListener("change", toggleOtrosAtbDetalle);
        byId("btnAddOtherDrug").addEventListener("click", addOtherDrug);
        ["fhManualCip", "fhDermaCip", "fhDigCip"].forEach(function (id) {
            var cipControl = byId(id);
            if (!cipControl) return;
            cipControl.addEventListener("input", updateValidationExcelExportAvailability);
            cipControl.addEventListener("change", updateValidationExcelExportAvailability);
            cipControl.addEventListener("input", updateValidationV2ExportAvailability);
            cipControl.addEventListener("change", updateValidationV2ExportAvailability);
        });
        byId("fhValExportTxt").addEventListener("click", function () {
            if (!ensureCipForExport()) return;
            F.copyTextToClipboard(buildValidationLines().join("\n"), "Texto JARA copiado al portapapeles.");
        });
        byId("fhValExportCsv").addEventListener("click", function () {
            if (!ensureCipForExport()) return;
            var csv = buildCsvRows().map(function (row) {
                return row.map(function (cell) {
                    return '"' + String(cell).replace(/"/g, '""') + '"';
                }).join(",");
            }).join("\n");
            F.downloadFile("validaciones_FH_" + new Date().toISOString().slice(0, 10) + ".csv", csv, "text/csv;charset=utf-8");
        });
        var btnNoFind = byId("btnNoFindDrug");
        if (btnNoFind) btnNoFind.addEventListener("click", showLocalDrugModal);
    }

    window.FarmaciaValidacion = {
        enableRequestedAutocomplete: enableAutocomplete,
        normalizeValidationExportStatus: normalizeValidationExportStatus,
        buildValidationExcelExportData: buildValidationExcelExportData,
        buildDermaClinicalSummary: buildDermaClinicalSummary,
        buildValidationLines: buildValidationLines,
        buildCsvRows: buildCsvRows,
        buildExcelGeneralObservations: buildExcelGeneralObservations,
        updateValidationExportAvailability: updateValidationExcelExportAvailability,
        updateDermaPathologyVisibility: toggleHSBlock,
        buildValidationV2Input: buildValidationV2Input,
        buildValidationV2Projection: buildValidationV2Projection,
        getValidationV2TechnicalContext: getValidationV2TechnicalContext,
        buildValidationV2ProjectionFromCurrentContext: buildValidationV2ProjectionFromCurrentContext,
        applyRequestedAsValidatedExplicitly: applyRequestedAsValidatedExplicitly,
        buildValidationClinicalObservationsV2: buildValidationClinicalObservationsV2,
        buildValidationRelatedTreatmentsV2: buildValidationRelatedTreatmentsV2,
        getValidatedTreatmentRelation: getValidatedTreatmentRelation
    };

    document.addEventListener("DOMContentLoaded", function () {
        populatePautaSelect("fhManualPauta", "fhManualPautaOtro");
        populatePautaSelect("fhDermaPauta", "fhDermaPautaOtro");
        populatePautaSelect("fhDigPauta", "fhDigPautaOtro");
        populatePautaSelect("fhValidadoPauta", "fhValidadoPautaOtro");
        bindCoreEvents();
        byId("fhValPendingReasonRow").classList.toggle("hidden", byId("fhValEstado").value !== "pending");
        byId("fhValMotivoRow").classList.toggle("hidden", byId("fhValEstado").value !== "denied");
        bindSummaryInputs();
        bindCausalityEvents();
        renderOtherDrugs();
        if (C.loaded) {
            enableAutocomplete();
            enableAutocompleteValidado();
            byId("noFindDrugRow").classList.remove("hidden");
        }
        document.addEventListener("farmacia:catalog-loaded", function () {
            if (!C.loaded) return;
            enableAutocomplete();
            enableAutocompleteValidado();
            byId("noFindDrugRow").classList.remove("hidden");
        });
        applyContext();
        updateValidationV2ExportAvailability();
        var exportV2 = byId("fhValExportV2Btn");
        if (exportV2) exportV2.addEventListener("click", handleValidationV2Export);
        initAnaliticaChips();
        updateValidationModuleSummaries();
        updateNaranjoScore();
        updateKarchLasagna();
        toggleCausalityModules();
        // WO8.1b — Botón Excel FH
        (function initValExcelBtn() {
            var btn = document.getElementById('fhValExcelExportBtn');
            if (!btn) return;
            updateValidationExcelExportAvailability();
            btn.addEventListener('click', function () {
                var exp = window.FarmaciaExcelRowExport;
                if (!exp) return;
                var ctx = F.getQueryContext ? F.getQueryContext() : {};
                var patient = ctx.patient || null;
                var exportData = buildValidationExcelExportData();
                if (!exportData.canCopy) {
                    alert(exportData.cip
                        ? 'Selecciona un resultado de validación antes de copiar la fila Excel FH.'
                        : 'Introduce un CIP sintético no vacío antes de exportar.');
                    return;
                }
                var opts = {
                    patientId: exportData.cip,
                    cip: exportData.cip,
                    servicio: exportData.servicio,
                    patologia: exportData.patologia,
                    tipoActo: 'validacion_inicial',
                    tipoValidacion: exportData.tipoValidacion,
                    resultado: exportData.resultadoValidacion,
                    estadoRegistro: exportData.estadoRegistro,
                    lineaActual: exportData.lineaActual,
                    fechaActo: new Date().toISOString().substring(0, 10),
                    profesional: exportData.profesional,
                    motivo: exportData.motivo,
                    obsValidacion: exportData.obsValidacion,
                    demoFlag: true
                };
                var context = exp.buildContextFromValidacion(patient, opts);
                context.observaciones = buildExcelGeneralObservations(context, exportData.dermaClinicalSummary);
                var rowObj = exp.buildExcelRowObject(context);
                var rowArr = exp.buildExcelRowArray(rowObj);
                var sheetName = exp.getServiceSheetName(exportData.servicio) || 'hoja correspondiente';
                exp.copyTSVRowToClipboard(rowArr, { sheetName: sheetName });
            });
        })();
    });
})();
