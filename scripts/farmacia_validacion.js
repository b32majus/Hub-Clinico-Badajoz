"use strict";

(function () {
    var F = window.FarmaciaDemo;
    var C = window.FarmaciaCatalog;
    var M = window.FarmaciaValidationModel;
    var P = window.FarmaciaPautasCatalog;
    var modoActual = null;
    var autocompleteActiveIndex = -1;
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
        if (isManualOrigin()) {
            var manualCip = byId("fhManualCip");
            return manualCip ? (manualCip.value.trim() || "CIP-DEMO-FH-XXX") : "CIP-DEMO-FH-XXX";
        }
        if (modoActual === "reuma") {
            return currentPatient && currentPatient.cip ? currentPatient.cip : "";
        }
        return byId("fhDermaCip").value.trim() || "CIP-DEMO-FH-XXX";
    }

    function selectedPatologia() {
        if (isManualOrigin()) return currentManualPatologia() || "—";
        if (modoActual === "reuma") {
            return currentPatient && currentPatient.patologia ? currentPatient.patologia : "";
        }
        return byId("fhDermaPatologia").value || "—";
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
        var values = [existing, sourceId ? visibleElementValue(sourceId) : "", dermaSummary || ""];
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
        setDermaFormReadonly(isManual);
        setManualContextDisplay();
        toggleHSBlock();
        updateValidationModuleSummaries();
        updateSeguimientoHandoffLink();
        toggleCausalityModules();
    }

    function explicitRequestedDrug(patient) {
        if (!patient) return "";
        return patient.farmaco_solicitado || (patient.rawImport && patient.rawImport.farmaco_solicitado) || "";
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
            if (!isEnfPatient) F.setValue('fhDermaFarmaco', p.farmaco);
            if (!isEnfPatient) F.setValue('fhDermaDosis', p.dosis);
            if (!isEnfPatient && p.pauta) {
                var pautaObj = P && typeof P.normalizePautaLabel === 'function' ? P.normalizePautaLabel(p.pauta) : null;
                F.setValue('fhDermaPauta', pautaObj ? pautaObj.pauta_codigo : '');
                if (pautaObj && pautaObj.pauta_codigo === 'OTRO' && pautaObj.pauta_otro_texto) {
                    F.setValue('fhDermaPautaOtro', pautaObj.pauta_otro_texto);
                    byId('fhDermaPautaOtro').classList.remove('hidden');
                } else {
                    F.setValue('fhDermaPautaOtro', '');
                    byId('fhDermaPautaOtro').classList.add('hidden');
                }
            }
            if (!isEnfPatient) F.setValue('fhDermaVia', mapViaToSelect(p.via, byId('fhDermaVia')));
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
            justificacion: valueOrDash(byId("fhValidadoJustificacion").value)
        };
    }

    function requestedTreatmentSummary() {
        var origenVal = currentOrigenEntradaValue();
        if (currentPatient && origenVal !== 'manual_farmacia') {
            var p = currentPatient;
            return {
                farmaco: valueOrDash(explicitRequestedDrug(p)),
                principioActivo: valueOrDash(p.principioActivo),
                dosis: p.dosis ? valueOrDash(p.dosis) : "Pendiente de completar por Farmacia",
                via: p.via ? valueOrDash(p.via) : "Pendiente de completar por Farmacia",
                pauta: p.pauta ? valueOrDash(p.pauta) : "Pendiente de completar por Farmacia",
                induccion: "—",
                justificacion: "—"
            };
        }
        var ids = requestedFieldIds();
        return {
            farmaco: valueOrDash(byId(ids.farmaco).value),
            principioActivo: valueOrDash(byId(ids.principioActivo).value),
            dosis: valueOrDash(byId(ids.dosis).value),
            via: valueOrDash(byId(ids.via).value),
            pauta: (function () {
                var select = byId(ids.pauta);
                var value = select ? select.value : "";
                if (value === "OTRO") return valueOrDash(byId(ids.pautaOtro).value);
                if (P && typeof P.getPautaByCodigo === "function" && typeof P.getLegacyPautaLabel === "function") {
                    var pautaObj = P.getPautaByCodigo(value);
                    return valueOrDash(P.getLegacyPautaLabel(pautaObj));
                }
                return valueOrDash(value);
            })(),
            induccion: byId(ids.induccion).value === "si" ? "Sí" : (byId(ids.induccion).value === "no" ? "No" : "—"),
            justificacion: valueOrDash(byId(ids.justificacion).value || (!isManualOrigin() && isHSPathology() ? byId("fhHSMotivoClinico").value : ""))
        };
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

    function updateValidadoSummary() {
        var summary = currentTreatmentSummary();
        var validadoFarmaco = byId("fhValidadoFarmaco");
        if (validadoFarmaco && !validadoFarmaco.value && summary.farmaco !== "—") {
            F.setValue("fhValidadoFarmaco", summary.farmaco);
            F.setValue("fhValidadoPrincipioActivo", summary.principioActivo);
            F.setValue("fhValidadoDosis", summary.dosis);
            F.setValue("fhValidadoVia", mapViaToSelect(summary.via, byId("fhValidadoVia")));
            F.setValue("fhValidadoPresentacion", summary.presentacion);
        }
    }

    function updateValidationModuleSummaries() {
        updateSolicitadoSummary();
        updatePrebiologicoChips();
        updateValidadoSummary();
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
        if (text === "—" || text === "-" || text === "Pendiente de completar por Farmacia") return "";
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
        if (modoActual === "reuma") {
            var reumaValues = treatmentValuesFromIds({
                farmaco: "fhReumaFarmaco", principioActivo: "", dosis: "fhReumaDosis", via: "fhReumaVia",
                pauta: "", pautaOtro: "", presentacion: ""
            });
            reumaValues.pautaLabel = visibleElementValue("fhReumaPauta");
            return reumaValues;
        }
        if (modoActual === "digestivo") {
            return treatmentValuesFromIds({
                farmaco: "fhDigFarmaco", principioActivo: "", dosis: "fhDigDosis", via: "fhDigVia",
                pauta: "fhDigPauta", pautaOtro: "fhDigPautaOtro", presentacion: ""
            });
        }
        return treatmentValuesFromIds(requestedFieldIds());
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
        if (modoActual === "reuma") return visibleElementValue("fhReumaCip");
        if (modoActual === "digestivo") return visibleElementValue("fhDigCip");
        return visibleElementValue("fhDermaCip");
    }

    function visibleServiceForExport() {
        if (isManualOrigin()) return currentManualService() ? serviceLabelFromMode(currentManualService()) : "";
        return modoActual ? serviceLabelFromMode(modoActual) : "";
    }

    function visiblePatologiaForExport() {
        if (isManualOrigin()) return explicitExportValue(currentManualPatologia());
        if (modoActual === "reuma") return visibleElementValue("fhReumaPatologia");
        if (modoActual === "digestivo") return visibleElementValue("fhDigPatologia");
        return visibleElementValue("fhDermaPatologia");
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
            canCopy: status.canCopy,
            resultadoValidacion: status.resultadoValidacion,
            estadoRegistro: status.estadoRegistro,
            cip: cip,
            servicio: visibleServiceForExport(),
            patologia: visiblePatologiaForExport(),
            tipoValidacion: visibleElementValue("fhTipoValidacion"),
            profesional: visibleElementValue("fhValFarmaceutico"),
            motivo: visibleElementValue("fhValMotivo"),
            obsValidacion: visibleElementValue("fhValObservaciones"),
            dermaClinicalSummary: buildDermaClinicalSummary().summary,
            slot: slot,
            lineaActual: treatmentLineForExport(values, slot, cip)
        };
    }

    function updateValidationExcelExportAvailability() {
        var btn = byId("fhValExcelExportBtn");
        if (btn) btn.disabled = !normalizeValidationExportStatus(visibleElementValue("fhValEstado")).canCopy;
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

    function isTruthyRobust(value) {
        if (value === true || value === 1 || value === "1") return true;
        if (value === false || value === 0 || value === "0") return false;
        if (value === null || value === undefined || value === "") return false;
        var s = String(value).trim().toUpperCase();
        return s === "TRUE" || s === "SI" || s === "SÍ" || s === "YES" || s === "1";
    }

    function requestedAutocompleteConfig(inputId) {
        var manual = inputId === "fhManualFarmaco";
        return {
            inputId: inputId,
            dropdownId: manual ? "fhManualAutocompleteDropdown" : "autocompleteDropdown",
            ids: manual ? {
                cip: "fhManualCip", farmaco: "fhManualFarmaco", principioActivo: "fhManualPrincipioActivo",
                dosis: "fhManualDosis", via: "fhManualVia"
            } : {
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
        enableRequestedAutocomplete("fhManualFarmaco");
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
            relationType: RELATION_OPTIONS[0],
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
        var relationSelect = buildSelect("", "form-select", RELATION_OPTIONS, drug.relationType);
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
        lines.push("Servicio origen: " + (isManualOrigin() ? serviceLabelFromMode(currentManualService()) : (modoActual === "reuma" ? (currentPatient && currentPatient.servicio ? currentPatient.servicio : "—") : "Dermatología")));
        lines.push("CIP: " + selectedCip());
        lines.push("Patología: " + selectedPatologia());
        lines.push("Fecha solicitud: " + valueOrDash(isManualOrigin() ? byId("fhManualFecha").value : (modoActual !== "reuma" ? byId("fhDermaFecha").value : "")));
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
        lines.push("Justificación farmacéutica: " + validado.justificacion);

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
        lines.push("Observaciones: " + valueOrDash(byId("fhValObservaciones").value));
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
        var pautaNormalized = (P && typeof P.normalizePautaLabel === "function") ? P.normalizePautaLabel(summary.pauta) : null;
        var snap = C.getSnapshot(catalogContext("validacion.solicitado"));
        var rows = [
            [
                "ID", "Fecha", "Servicio", "CIP", "Patologia", "Estado", "FarmacoSolicitado", "PrincipioActivo", "DosisPresentacion", "Via", "Pauta", "PautaCodigo", "PautaLabel", "PautaIntervaloDias", "PautaUnidad", "PautaOtroTexto", "InduccionSolicitada", "Profesional", "VHB", "VHC", "VIH", "MotivoDenegacion", "SnapshotDrugID", "SnapshotSourceType", "CodigoNacional", "NRegistro",
                "NaranjoScore", "NaranjoCategoria", "KLCategoria", "CausalidadFinalFarmaceutica",
                "NaranjoQ1", "NaranjoQ2", "NaranjoQ3", "NaranjoQ4", "NaranjoQ5", "NaranjoQ6", "NaranjoQ7", "NaranjoQ8", "NaranjoQ9", "NaranjoQ10",
                "KLTemporal", "KLConocido", "KLAlternativa", "KLSuspendido", "KLMejora", "KLReadministracion", "KLReaparece",
                "OtrosFarmacosRelacionados", "ResumenClinicoDermatologia"
            ],
            [
                "FH-" + Date.now().toString(36).toUpperCase(),
                new Date().toLocaleDateString("es-ES"),
                isManualOrigin() ? serviceLabelFromMode(currentManualService()) : (modoActual === "reuma" ? (currentPatient && currentPatient.servicio ? currentPatient.servicio : "—") : "Dermatología"),
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
                buildDermaClinicalSummary().summary
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
        });
        var tipoValSel = byId("fhTipoValidacion");
        if (tipoValSel) tipoValSel.addEventListener("change", function () {
            var notice = byId("fhTipoValidacionNotice");
            if (notice) notice.classList.toggle("hidden", this.value === "inicio_nuevo" || this.value === "");
            updateValidationModuleSummaries();
        });
        byId("fhValEstado").addEventListener("change", function (event) {
            byId("fhValMotivoRow").classList.toggle("hidden", event.target.value !== "denied");
            updateValidationExcelExportAvailability();
        });
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
        byId("fhValExportTxt").addEventListener("click", function () {
            F.copyTextToClipboard(buildValidationLines().join("\n"), "Texto JARA copiado al portapapeles.");
        });
        byId("fhValExportCsv").addEventListener("click", function () {
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
        updateDermaPathologyVisibility: toggleHSBlock
    };

    document.addEventListener("DOMContentLoaded", function () {
        populatePautaSelect("fhManualPauta", "fhManualPautaOtro");
        populatePautaSelect("fhDermaPauta", "fhDermaPautaOtro");
        populatePautaSelect("fhValidadoPauta", "fhValidadoPautaOtro");
        bindCoreEvents();
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
                    alert('Selecciona un resultado de validación antes de copiar la fila Excel FH.');
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
