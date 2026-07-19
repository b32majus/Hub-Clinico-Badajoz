"use strict";

(function () {
    var F = window.FarmaciaDemo;
    var C = window.FarmaciaCatalog;
    var M = window.FarmaciaValidationModel;
    var P = window.FarmaciaPautasCatalog;
    var MT = window.FarmaciaMultitreatmentCore;
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

    function isHSPathology() {
        if (modoActual === "derma" && byId("fhDermaPatologia")) {
            if (byId("fhDermaPatologia").value === "Hidradenitis supurativa") return true;
        }
        if (modoActual === "derma" && byId("fhPatologiaManual")) {
            if (byId("fhPatologiaManual").value === "Hidradenitis supurativa") return true;
        }
        return false;
    }

    function setChecked(id, value) {
        var el = byId(id);
        if (el) el.checked = !!value;
    }

    function selectedCip() {
        if (isManualOrigin()) {
            var manualCip = byId("fhManualCip");
            return manualCip ? manualCip.value.trim() : "";
        }
        if (modoActual === "reuma") {
            return currentPatient && currentPatient.cip ? currentPatient.cip : "";
        }
        return byId("fhDermaCip").value.trim();
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
        var formHs = byId("formHS");
        if (!formHs) return;
        formHs.classList.toggle("hidden", !isHSPathology());
        var note = byId("fhHSOtherNote");
        if (!note) {
            note = createEl("p", "pathology-demo-note");
            note.id = "fhHSOtherNote";
            byId("formDerma").appendChild(note);
        }
        var patologia = isManualOrigin() ? currentManualPatologia() : byId("fhDermaPatologia").value;
        var showNote = modoActual === "derma" && !isManualOrigin() && patologia && patologia !== "Hidradenitis supurativa";
        note.textContent = showNote ? "Demo activa: bloque específico parametrizado para HS. Resto de patologías incluidas en plantilla Dermatología → Farmacia pendiente de parametrización." : "";
        note.classList.toggle("hidden", !showNote);
        toggleBioAdaDetalle();
        toggleBioOtrosDetalle();
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
        if (context.patient && context.patient.cip) {
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
            if (!isEnfPatient) F.setValue('fhDermaVia', p.via);
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

    function explicitValue(value) {
        var normalized = value === null || value === undefined ? "" : String(value).trim();
        if (normalized === "—" || normalized === "Pendiente de completar por Farmacia") return "";
        return normalized;
    }

    function elementValue(id) {
        var el = byId(id);
        return explicitValue(el ? el.value : "");
    }

    function elementText(id) {
        var el = byId(id);
        return explicitValue(el ? el.textContent : "");
    }

    function readExplicitPauta(selectId, otherId) {
        var code = elementValue(selectId);
        var other = code === "OTRO" ? elementValue(otherId) : "";
        var label = "";
        if (code && code !== "OTRO" && P && typeof P.getPautaByCodigo === "function") {
            var pauta = P.getPautaByCodigo(code);
            label = pauta ? explicitValue(pauta.pauta_label || pauta.label) : "";
        }
        return {
            pauta: other || label || code,
            pauta_codigo: code,
            pauta_label: label,
            pauta_otro_texto: other
        };
    }

    function readValidatedTreatmentFields() {
        var pauta = readExplicitPauta("fhValidadoPauta", "fhValidadoPautaOtro");
        return {
            farmaco_nombre: elementValue("fhValidadoFarmaco"),
            principio_activo: elementValue("fhValidadoPrincipioActivo"),
            dosis: elementValue("fhValidadoDosis"),
            presentacion: elementValue("fhValidadoPresentacion"),
            via: elementValue("fhValidadoVia"),
            pauta: pauta.pauta,
            pauta_codigo: pauta.pauta_codigo,
            pauta_label: pauta.pauta_label,
            pauta_otro_texto: pauta.pauta_otro_texto
        };
    }

    function readRequestedTreatmentFields() {
        var ids;
        var textMode = false;
        if (modoActual === "reuma" && !isManualOrigin()) {
            textMode = true;
            ids = { farmaco: "fhReumaFarmaco", dosis: "fhReumaDosis", via: "fhReumaVia", pauta: "fhReumaPauta" };
        } else if (modoActual === "digestivo" && !isManualOrigin()) {
            ids = { farmaco: "fhDigFarmaco", principioActivo: "", dosis: "fhDigDosis", via: "fhDigVia", pauta: "fhDigPauta", pautaOtro: "fhDigPautaOtro" };
        } else {
            ids = requestedFieldIds();
        }
        var pauta = textMode
            ? { pauta: elementText(ids.pauta), pauta_codigo: "", pauta_label: "", pauta_otro_texto: "" }
            : readExplicitPauta(ids.pauta, ids.pautaOtro);
        return {
            farmaco_nombre: textMode ? elementText(ids.farmaco) : elementValue(ids.farmaco),
            principio_activo: textMode ? "" : elementValue(ids.principioActivo),
            dosis: textMode ? elementText(ids.dosis) : elementValue(ids.dosis),
            presentacion: "",
            via: textMode ? elementText(ids.via) : elementValue(ids.via),
            pauta: pauta.pauta,
            pauta_codigo: pauta.pauta_codigo,
            pauta_label: pauta.pauta_label,
            pauta_otro_texto: pauta.pauta_otro_texto
        };
    }

    var HUB_REGISTRATION_DRAFT_ID = "validation_registration_current_v1";
    var HUB_REGISTRATION_MESSAGES = {
        pending: "Solicitud y actuación pendiente registradas. No se ha creado ninguna línea de tratamiento.",
        denied: "Actuación denegada registrada. No se ha creado ninguna línea de tratamiento.",
        validated: "Validación registrada. Línea creada como validada y pendiente de inicio.",
        replay: "Ya registrado en esta sesión",
        unsupported: "Este tipo de validación todavía no tiene registro estructurado habilitado en la demo."
    };

    function normalizedSignatureText(value) {
        return explicitValue(value).toLowerCase().replace(/\s+/g, " ");
    }

    function signatureOf(value) {
        var source = JSON.stringify(value);
        var first = 2166136261;
        var second = 5381;
        for (var i = 0; i < source.length; i++) {
            first ^= source.charCodeAt(i);
            first = Math.imul(first, 16777619);
            second = Math.imul(second, 33) ^ source.charCodeAt(i);
        }
        return "sig_v1_" + (first >>> 0).toString(36) + "_" + (second >>> 0).toString(36) + "_" + source.length.toString(36);
    }

    function setHubRegistrationStatus(message) {
        setText("fhValRegisterHubStatus", message || "");
    }

    function registrationOrigin(value) {
        if (value === "manual_farmacia") return "manual_fh_capture";
        if (value === "excel_enfermeria") return "imported_nursing";
        return "";
    }

    function registrationResult() {
        var value = elementValue("fhValEstado");
        return ["pending", "validated", "denied"].indexOf(value) !== -1 ? value : "";
    }

    function requestedMetadata() {
        if (isManualOrigin()) {
            return {
                requested_at: elementValue("fhManualFecha"),
                justification: elementValue("fhManualJustificacion"),
                observations: elementValue("fhManualObservaciones")
            };
        }
        if (modoActual === "reuma") {
            return {
                requested_at: elementText("fhReumaFecha"),
                justification: "",
                observations: ""
            };
        }
        if (modoActual === "digestivo") {
            return { requested_at: elementValue("fhDigFecha"), justification: "", observations: elementValue("fhDigObservaciones") };
        }
        return {
            requested_at: elementValue("fhDermaFecha"),
            justification: elementValue("fhDermaJustificacion"),
            observations: elementValue("fhDermaObservaciones")
        };
    }

    function joinedObservations(justification, observations) {
        var lines = [];
        if (justification) lines.push("Justificación: " + justification);
        if (observations) lines.push("Observaciones: " + observations);
        return lines.join("\n");
    }

    function readCatalogSnapshotWithoutMutation() {
        if (C && C.selectedSnapshot) return C.selectedSnapshot;
        try {
            var raw = window.sessionStorage && window.sessionStorage.getItem("farmacia_drug_snapshot");
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function catalogValueCompatible(identityValue, explicitValueToCompare) {
        return comparableDrugName(identityValue) === comparableDrugName(explicitValueToCompare);
    }

    function catalogSnapshotContextMatches(context, expected) {
        return ["slot", "paciente_cip", "tratamiento_id", "linea_id"].every(function (key) {
            return explicitValue(context && context[key]) === explicitValue(expected && expected[key]);
        });
    }

    function selectedCatalogIdentity(slot, visibleDrugName, visibleActiveIngredient) {
        var snapshot = readCatalogSnapshotWithoutMutation();
        var context = snapshot && snapshot.context;
        var patientId = selectedCip();
        if (!snapshot || snapshot.snapshot_kind !== "catalog_selection" || snapshot.snapshot_version !== 1 || !context) return null;
        if (!catalogSnapshotContextMatches(context, {
            slot: slot,
            paciente_cip: patientId,
            tratamiento_id: "",
            linea_id: ""
        })) return null;
        var snapshotName = explicitValue(snapshot.nombre_snapshot || snapshot.nombre_comercial || snapshot.display_name);
        if (!snapshotName || comparableDrugName(snapshotName) !== comparableDrugName(visibleDrugName)) return null;
        var snapshotActiveIngredient = explicitValue(snapshot.principio_activo_snapshot || snapshot.principio_activo);
        if (snapshotActiveIngredient && visibleActiveIngredient && !catalogValueCompatible(snapshotActiveIngredient, visibleActiveIngredient)) return null;
        return {
            selected_drug_id: explicitValue(snapshot.selected_drug_id || snapshot.drug_id),
            source_type: explicitValue(snapshot.source_type),
            national_code: explicitValue(snapshot.codigo_nacional_snapshot || snapshot.codigo_nacional),
            registration_number: explicitValue(snapshot.nregistro_snapshot || snapshot.nregistro),
            drug_name: snapshotName,
            active_ingredient: snapshotActiveIngredient
        };
    }

    function emptyCatalogIdentity(drugName, activeIngredient) {
        return {
            selected_drug_id: "",
            source_type: "",
            national_code: "",
            registration_number: "",
            drug_name: explicitValue(drugName),
            active_ingredient: explicitValue(activeIngredient)
        };
    }

    function requestedRegistrationInput(patientId, origin) {
        var fields = readRequestedTreatmentFields();
        var metadata = requestedMetadata();
        var catalog = selectedCatalogIdentity("validacion.solicitado", fields.farmaco_nombre, fields.principio_activo) || emptyCatalogIdentity(fields.farmaco_nombre, fields.principio_activo);
        return {
            patient_id: patientId,
            request_type: "new_start",
            origin: origin,
            requested_at: metadata.requested_at,
            professional_demo_id: "",
            drug: {
                drug_name: fields.farmaco_nombre,
                active_ingredient: fields.principio_activo,
                catalog_identity: catalog,
                catalog_snapshot: catalog
            },
            therapy: {
                dose_text: fields.dosis,
                presentation: fields.presentacion,
                route: fields.via,
                pauta_codigo: fields.pauta_codigo,
                pauta_label: fields.pauta_label,
                pauta_otro_texto: fields.pauta_otro_texto || (!fields.pauta_codigo && !fields.pauta_label ? fields.pauta : "")
            },
            observations: joinedObservations(metadata.justification, metadata.observations)
        };
    }

    function requestComparable(input, omitCatalogIdentity) {
        var drug = input && input.drug ? input.drug : {};
        var therapy = input && input.therapy ? input.therapy : {};
        var comparable = {
            patient_id: normalizedSignatureText(input && input.patient_id),
            request_type: normalizedSignatureText(input && input.request_type),
            origin: normalizedSignatureText(input && input.origin),
            requested_at: normalizedSignatureText(input && input.requested_at),
            drug_name: normalizedSignatureText(drug.drug_name),
            active_ingredient: normalizedSignatureText(drug.active_ingredient),
            therapy: {
                dose_text: normalizedSignatureText(therapy.dose_text),
                presentation: normalizedSignatureText(therapy.presentation),
                route: normalizedSignatureText(therapy.route),
                pauta_codigo: normalizedSignatureText(therapy.pauta_codigo),
                pauta_label: normalizedSignatureText(therapy.pauta_label),
                pauta_otro_texto: normalizedSignatureText(therapy.pauta_otro_texto)
            },
            observations: normalizedSignatureText(input && input.observations)
        };
        if (!omitCatalogIdentity) {
            var catalog = drug.catalog_identity || {};
            comparable.catalog_identity = {
                selected_drug_id: normalizedSignatureText(catalog.selected_drug_id),
                source_type: normalizedSignatureText(catalog.source_type),
                national_code: normalizedSignatureText(catalog.national_code),
                registration_number: normalizedSignatureText(catalog.registration_number),
                drug_name: normalizedSignatureText(catalog.drug_name),
                active_ingredient: normalizedSignatureText(catalog.active_ingredient)
            };
        }
        return comparable;
    }

    function hasExplicitCatalogIdentity(requestInput) {
        var catalog = requestInput && requestInput.drug && requestInput.drug.catalog_identity;
        return !!(catalog && ["selected_drug_id", "source_type", "national_code", "registration_number"].some(function (key) {
            return !!explicitValue(catalog[key]);
        }));
    }

    function catalogIdentityMatchesLine(catalog, drugName, activeIngredient) {
        if (!catalog) return false;
        return catalogValueCompatible(catalog.drug_name, drugName) && catalogValueCompatible(catalog.active_ingredient, activeIngredient);
    }

    function lineRegistrationInput(request) {
        var validated = readValidatedTreatmentFields();
        var requested = readRequestedTreatmentFields();
        function preferred(key) { return explicitValue(validated[key]) || explicitValue(requested[key]); }
        var drugName = preferred("farmaco_nombre");
        var activeIngredient = preferred("principio_activo");
        var catalog = selectedCatalogIdentity("validacion.validado", validated.farmaco_nombre, activeIngredient);
        if (catalog && !catalogIdentityMatchesLine(catalog, drugName, activeIngredient)) catalog = null;
        if (!catalog && catalogIdentityMatchesLine(request.drug.catalog_identity, drugName, activeIngredient)) catalog = request.drug.catalog_identity;
        catalog = catalog || emptyCatalogIdentity(drugName, activeIngredient);
        return {
            relationship: "primary",
            catalog_identity: catalog,
            catalog_snapshot: catalog,
            drug_name: drugName,
            active_ingredient: activeIngredient,
            dose_text: preferred("dosis"),
            presentation: preferred("presentacion"),
            route: preferred("via"),
            pauta_codigo: preferred("pauta_codigo"),
            pauta_label: preferred("pauta_label"),
            pauta_otro_texto: preferred("pauta_otro_texto") || explicitValue(request.therapy.pauta_otro_texto),
            start_date: "",
            end_date: ""
        };
    }

    function validationObservations(result) {
        var observations = elementValue("fhValObservaciones");
        var denialReason = result === "denied" ? elementValue("fhValMotivo") : "";
        if (denialReason) return observations ? observations + "\nMotivo de denegación: " + denialReason : "Motivo de denegación: " + denialReason;
        return observations;
    }

    function actSignature(requestSignature, result, lineInput) {
        var comparable = {
            request_signature: requestSignature,
            result: result,
            observations: normalizedSignatureText(validationObservations(result))
        };
        if (result === "validated") {
            comparable.line = Object.keys(lineInput).reduce(function (out, key) {
                out[key] = normalizedSignatureText(lineInput[key] && typeof lineInput[key] === "object" ? JSON.stringify(lineInput[key]) : lineInput[key]);
                return out;
            }, {});
        }
        return signatureOf(comparable);
    }

    function draftIsExactReplay(patient, draft, requestSignature, lastActSignature, result) {
        if (!draft || draft.patient_id !== selectedCip() || draft.request_signature !== requestSignature || draft.last_act_signature !== lastActSignature || draft.result !== result) return false;
        var request = patient.requests[draft.request_id];
        var act = patient.validation_acts[draft.validation_act_id];
        if (!request || !act || act.request_id !== request.request_id || act.result !== result) return false;
        if (result === "validated") return !!(draft.produced_line_id && patient.lines[draft.produced_line_id] && act.produced_line_id === draft.produced_line_id);
        return !draft.produced_line_id && !act.produced_line_id;
    }

    function findRequestBySignature(patient, requestSignature) {
        var ids = Object.keys(patient.requests || {});
        for (var i = 0; i < ids.length; i++) {
            var request = patient.requests[ids[i]];
            if (signatureOf(requestComparable(request)) === requestSignature) return request;
        }
        return null;
    }

    function findRequestForInput(patient, requestInput, requestSignature) {
        var exact = findRequestBySignature(patient, requestSignature);
        if (exact || hasExplicitCatalogIdentity(requestInput)) return exact;
        var visibleSignature = signatureOf(requestComparable(requestInput, true));
        var draft = patient.drafts[HUB_REGISTRATION_DRAFT_ID];
        if (draft && patient.requests[draft.request_id] && signatureOf(requestComparable(patient.requests[draft.request_id], true)) === visibleSignature) {
            return patient.requests[draft.request_id];
        }
        var matches = Object.keys(patient.requests).map(function (requestId) { return patient.requests[requestId]; }).filter(function (request) {
            return signatureOf(requestComparable(request, true)) === visibleSignature;
        });
        return matches.length === 1 ? matches[0] : null;
    }

    function requestAlreadyProducedLine(patient, requestId) {
        return Object.keys(patient.lines || {}).some(function (lineId) {
            return patient.lines[lineId].source_request_id === requestId;
        });
    }

    function registrationError(message) {
        setHubRegistrationStatus(message);
        return { ok: false, message: message };
    }

    function registerValidationInHub() {
        var originValue = currentOrigenEntradaValue();
        var origin = registrationOrigin(originValue);
        var type = elementValue("fhTipoValidacion");
        var patientId = selectedCip();
        var result = registrationResult();
        if (!originValue) return registrationError("Seleccione un origen de entrada antes de registrar.");
        if (!origin) return registrationError("Este origen todavía no tiene registro estructurado habilitado en la demo.");
        if (!type) return registrationError("Seleccione un tipo de validación antes de registrar.");
        if (type !== "inicio_nuevo") return registrationError(HUB_REGISTRATION_MESSAGES.unsupported);
        if (!patientId) return registrationError("Introduzca o seleccione un CIP demo visible antes de registrar.");
        if (!result) return registrationError("Seleccione un resultado de validación antes de registrar.");
        var requestInput = requestedRegistrationInput(patientId, origin);
        if (!requestInput.drug.drug_name) return registrationError("Complete el fármaco solicitado antes de registrar.");
        if (result === "denied" && !elementValue("fhValMotivo")) return registrationError("Indique el motivo de denegación antes de registrar.");
        if (!MT) return registrationError("El registro estructurado del Hub no está disponible en esta demo.");

        try {
            var store = MT.createSessionStore(window.sessionStorage);
            var state = store.load();
            var patient = store.getPatientState(state, patientId);
            var requestSignature = signatureOf(requestComparable(requestInput));
            var matchingRequest = findRequestForInput(patient, requestInput, requestSignature);
            if (matchingRequest) requestSignature = signatureOf(requestComparable(matchingRequest));
            var provisionalRequest = matchingRequest || MT.createTreatmentRequest(Object.assign({}, requestInput, {
                created_at: new Date().toISOString(), updated_at: new Date().toISOString()
            }));
            var lineInput = lineRegistrationInput(provisionalRequest);
            var lastActSignature = actSignature(requestSignature, result, lineInput);
            var draft = patient.drafts[HUB_REGISTRATION_DRAFT_ID];
            if (draftIsExactReplay(patient, draft, requestSignature, lastActSignature, result)) {
                setHubRegistrationStatus(HUB_REGISTRATION_MESSAGES.replay);
                return { ok: true, replay: true, message: HUB_REGISTRATION_MESSAGES.replay };
            }
            if (matchingRequest && requestAlreadyProducedLine(patient, matchingRequest.request_id)) {
                return registrationError("Esta solicitud ya está cerrada en la demo y no puede producir otra línea.");
            }
            var now = new Date().toISOString();
            var request = matchingRequest || provisionalRequest;
            var next = state;
            if (!matchingRequest) next = store.upsertRequest(next, patientId, request);
            var act = MT.createValidationAct({
                patient_id: patientId,
                request_id: request.request_id,
                produced_line_id: "",
                performed_at: now,
                result: result,
                professional_demo_id: "",
                observations: validationObservations(result),
                origin: origin,
                created_at: now
            });
            next = store.upsertValidationAct(next, patientId, act);
            var producedLineId = "";
            if (result === "validated") {
                lineInput.created_at = now;
                lineInput.updated_at = now;
                var existingLines = Object.keys(patient.lines).map(function (lineId) { return patient.lines[lineId]; });
                var line = MT.createTreatmentLineFromValidatedRequest(request, act, lineInput, { existingLines: existingLines });
                producedLineId = line.line_id;
                next = store.upsertLine(next, patientId, line);
                act.produced_line_id = producedLineId;
                next = store.upsertValidationAct(next, patientId, act);
            }
            next = store.upsertDraft(next, patientId, HUB_REGISTRATION_DRAFT_ID, {
                patient_id: patientId,
                request_signature: requestSignature,
                last_act_signature: lastActSignature,
                request_id: request.request_id,
                validation_act_id: act.validation_act_id,
                produced_line_id: producedLineId,
                result: result,
                saved_at: now
            });
            var finalPatient = store.getPatientState(next, patientId);
            var validation = MT.validatePatientState(finalPatient, patientId);
            if (!validation.valid) throw new Error("invalid final patient state");
            store.save(next);
            setHubRegistrationStatus(HUB_REGISTRATION_MESSAGES[result]);
            return { ok: true, replay: false, message: HUB_REGISTRATION_MESSAGES[result] };
        } catch (error) {
            return registrationError("No se pudo completar el registro estructurado. No se guardaron cambios.");
        }
    }

    function recognizeCurrentHubRegistration() {
        if (!MT) return false;
        var origin = registrationOrigin(currentOrigenEntradaValue());
        var patientId = selectedCip();
        var type = elementValue("fhTipoValidacion");
        var result = registrationResult();
        var requested = readRequestedTreatmentFields();
        if (!origin || !patientId || type !== "inicio_nuevo" || !result || !requested.farmaco_nombre) return false;
        try {
            var store = MT.createSessionStore(window.sessionStorage);
            var state = store.load();
            var patient = store.getPatientState(state, patientId);
            var requestInput = requestedRegistrationInput(patientId, origin);
            var requestSignature = signatureOf(requestComparable(requestInput));
            var request = findRequestForInput(patient, requestInput, requestSignature);
            if (!request) return false;
            requestSignature = signatureOf(requestComparable(request));
            var signature = actSignature(requestSignature, result, lineRegistrationInput(request));
            if (!draftIsExactReplay(patient, patient.drafts[HUB_REGISTRATION_DRAFT_ID], requestSignature, signature, result)) return false;
            setHubRegistrationStatus(HUB_REGISTRATION_MESSAGES.replay);
            return true;
        } catch (error) {
            return false;
        }
    }

    function hasExplicitTreatment(fields) {
        return ["farmaco_nombre", "principio_activo", "dosis", "presentacion", "via", "pauta", "pauta_codigo", "pauta_otro_texto"].some(function (key) {
            return !!explicitValue(fields && fields[key]);
        });
    }

    function comparableDrugName(value) {
        return explicitValue(value).toLowerCase().replace(/\s+/g, " ");
    }

    function readCatalogIdentity(slot, visibleDrugName) {
        if (!C || typeof C.getSnapshot !== "function") return null;
        var snapshot = C.getSnapshot({ slot: slot, paciente_cip: selectedCip(), tratamiento_id: "", linea_id: "" });
        if (!snapshot) return null;
        var snapshotName = explicitValue(snapshot.nombre_snapshot || snapshot.nombre_comercial || snapshot.display_name);
        if (!snapshotName || comparableDrugName(snapshotName) !== comparableDrugName(visibleDrugName)) return null;
        return {
            selected_drug_id: explicitValue(snapshot.selected_drug_id || snapshot.drug_id),
            source_type: explicitValue(snapshot.source_type),
            codigo_nacional: explicitValue(snapshot.codigo_nacional_snapshot || snapshot.codigo_nacional),
            nregistro: explicitValue(snapshot.nregistro_snapshot || snapshot.nregistro)
        };
    }

    function buildExplicitTreatmentSnapshot() {
        var validated = readValidatedTreatmentFields();
        var requested = readRequestedTreatmentFields();
        var fields = null;
        var slot = "";
        if (hasExplicitTreatment(validated)) {
            fields = validated;
            slot = "validacion.validado";
        } else if (hasExplicitTreatment(requested)) {
            fields = requested;
            slot = "validacion.solicitado";
        }
        if (!fields) return null;

        var line = {
            tratamiento_id: "",
            linea_id: "",
            farmaco_nombre: fields.farmaco_nombre,
            nombre_comercial: fields.farmaco_nombre,
            principio_activo: fields.principio_activo,
            dosis: fields.dosis,
            dosis_texto: fields.dosis && fields.presentacion && fields.dosis !== fields.presentacion
                ? fields.dosis + " · " + fields.presentacion
                : (fields.dosis || fields.presentacion),
            presentacion: fields.presentacion,
            via: fields.via,
            pauta: fields.pauta,
            pauta_codigo: fields.pauta_codigo,
            pauta_label: fields.pauta_label,
            pauta_otro_texto: fields.pauta_otro_texto
        };
        var catalogIdentity = readCatalogIdentity(slot, fields.farmaco_nombre);
        if (catalogIdentity) {
            line.selected_drug_id = catalogIdentity.selected_drug_id;
            line.source_type = catalogIdentity.source_type;
            line.codigo_nacional = catalogIdentity.codigo_nacional;
            line.nregistro = catalogIdentity.nregistro;
        }
        return line;
    }

    function selectedValidationResult() {
        var value = elementValue("fhValEstado");
        if (value === "pending") return "pendiente";
        if (value === "validated") return "validado";
        if (value === "denied") return "denegado";
        return "";
    }

    function selectedValidationType() {
        var value = elementValue("fhTipoValidacion");
        if (["inicio_nuevo", "switch_cambio", "addon", "renovacion"].indexOf(value) !== -1) return value;
        return "";
    }

    function buildValidationExportOptions() {
        return {
            tipoActo: "validacion_inicial",
            tipoValidacion: selectedValidationType(),
            resultadoValidacion: selectedValidationResult(),
            lineaActual: buildExplicitTreatmentSnapshot(),
            fechaActo: new Date().toISOString().substring(0, 10),
            profesional: elementText("fhValFarmaceutico"),
            demoFlag: true
        };
    }

    function manualServiceLabelForExport() {
        var service = currentManualService();
        if (service === "derma") return "Dermatología";
        if (service === "reuma") return "Reumatología";
        if (service === "digestivo") return "Digestivo";
        return "";
    }

    function resolveValidationExportPatient(queryContext) {
        var context = queryContext || {};
        if (isManualOrigin()) {
            var cip = elementValue("fhManualCip");
            if (!cip) return null;
            return {
                cip: cip,
                servicio: manualServiceLabelForExport(),
                patologia: explicitValue(currentManualPatologia())
            };
        }
        return context.patient || null;
    }

    function copyValidationExcelRow() {
        var exp = window.FarmaciaExcelRowExport;
        if (!exp) return false;
        var queryContext = F.getQueryContext ? F.getQueryContext() : {};
        var patient = resolveValidationExportPatient(queryContext);
        if (!patient) {
            alert(isManualOrigin()
                ? "Introduzca un CIP explícito antes de copiar la fila Excel FH."
                : "No hay paciente seleccionado.");
            return false;
        }
        var opts = buildValidationExportOptions();
        if (!opts.resultadoValidacion) {
            alert("Seleccione un resultado de validación válido antes de copiar la fila Excel FH.");
            return false;
        }
        var context = exp.buildContextFromValidacion(patient, opts);
        var rowObj = exp.buildExcelRowObject(context);
        var rowArr = exp.buildExcelRowArray(rowObj);
        var sheetName = exp.getServiceSheetName(patient.servicio || "") || "hoja correspondiente";
        return exp.copyTSVRowToClipboard(rowArr, { sheetName: sheetName });
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
            justificacion: valueOrDash(byId(ids.justificacion).value || (!isManualOrigin() ? byId("fhHSMotivoClinico").value : ""))
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
            F.setValue("fhValidadoVia", summary.via);
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
        if (cip) params.push('cip=' + encodeURIComponent(cip));
        params.push('servicio=' + encodeURIComponent(serviceSlugFromMode(isManualOrigin() ? currentManualService() : modoActual)));
        if (patologia && patologia !== '—') params.push('patologia=' + encodeURIComponent(patologia));
        params.push('entrada=' + encodeURIComponent('seguimiento'));
        link.href = 'farmacia_seguimiento.html' + (params.length ? ('?' + params.join('&')) : '');
    }

    function mapViaToSelect(catalogVia) {
        var v = String(catalogVia || "").trim().toLowerCase();
        if (!v) return "";
        if (v.indexOf("subcut") !== -1 || v === "sc" || v === "s.c." || v === "subcutanea" || v === "subcutáneo") return "SC";
        if (v.indexOf("intraven") !== -1 || v === "iv" || v === "i.v." || v === "intravenosa" || v === "intravenoso") return "IV";
        if (v.indexOf("oral") !== -1 || v === "vo" || v === "v.o.") return "Oral";
        if (v.indexOf("intramus") !== -1 || v === "im" || v === "i.m.") return "IM";
        return "Otra";
    }

    function selectDrug(drug) {
        var ids = requestedFieldIds();
        byId(ids.farmaco).value = drug.display_name || drug.nombre_comercial || "";
        byId(ids.principioActivo).value = drug.principio_activo || "";
        // No inferir dosis/vía/pauta desde catálogo: Farmacia debe seleccionar presentación y pauta.
        C.selectDrug(drug, { slot: 'validacion.solicitado', paciente_cip: selectedCip(), tratamiento_id: '', linea_id: '' });
        clearAutocompleteDropdown();
        updateValidationModuleSummaries();
    }

    function selectValidadoDrug(drug) {
        var farmacoEl = byId("fhValidadoFarmaco");
        var princEl = byId("fhValidadoPrincipioActivo");
        if (!drug || !farmacoEl) return;

        var displayName = drug.display_name || drug.nombre || drug.nombre_presentacion || drug.presentacion || drug.principio_activo || drug.principioActivo || drug.pa || farmacoEl.value || "";
        farmacoEl.value = displayName;
        if (princEl) princEl.value = drug.principio_activo || drug.principioActivo || drug.pa || "";
        C.selectDrug(drug, { slot: 'validacion.validado', paciente_cip: selectedCip(), tratamiento_id: '', linea_id: '' });

        [farmacoEl, princEl].forEach(function (el) {
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
        updateValidationModuleSummaries();
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

    function renderAutocompleteDropdown(results) {
        var dropdown = byId("autocompleteDropdown");
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
                item.addEventListener("click", function () { selectDrug(d); });
            })(drug);
            dropdown.appendChild(item);
        }
        dropdown.classList.remove("hidden");
        autocompleteActiveIndex = -1;
    }

    function clearAutocompleteDropdown() {
        var dropdown = byId("autocompleteDropdown");
        F.clearChildren(dropdown);
        dropdown.classList.add("hidden");
        autocompleteActiveIndex = -1;
    }

    function handleAutocompleteInput() {
        if (!C.loaded) return;
        var ids = requestedFieldIds();
        var query = byId(ids.farmaco).value.trim();
        if (query.length < 2) {
            clearAutocompleteDropdown();
            return;
        }
        renderAutocompleteDropdown(C.search(query));
        updateValidationModuleSummaries();
    }

    function enableAutocomplete() {
        var input = byId("fhDermaFarmaco");
        input.disabled = false;
        input.placeholder = "Ej. Cosentyx®, Humira®, Skyrizi®...";
        input.addEventListener("input", handleAutocompleteInput);
        input.addEventListener("keydown", function (event) {
            var dropdown = byId("autocompleteDropdown");
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
                clearAutocompleteDropdown();
            }
        });
        input.addEventListener("blur", function () {
            setTimeout(function () {
                if (!document.activeElement || !byId("autocompleteDropdown").contains(document.activeElement)) clearAutocompleteDropdown();
            }, 150);
        });
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
        C.selectDrug({
            display_name: displayName,
            nombre_comercial: displayName,
            principio_activo: principio || "",
            nombre_presentacion: presentacion || "",
            via: via || "",
            codigo_nacional: "",
            nregistro: "",
            dosis: presentacion || "",
            source_type: "LOCAL_PENDIENTE_DEMO",
            drug_id: "",
            es_hospitalario: "SI",
            biosimilar: ""
        });
        closeLocalDrugModal();
        updateValidationModuleSummaries();
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
            return { value: v, label: v || "Seleccionar..." };
        }), drug.via || "");
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
        var snap = C.getSnapshot();
        var rows = [
            [
                "ID", "Fecha", "Servicio", "CIP", "Patologia", "Estado", "FarmacoSolicitado", "PrincipioActivo", "DosisPresentacion", "Via", "Pauta", "PautaCodigo", "PautaLabel", "PautaIntervaloDias", "PautaUnidad", "PautaOtroTexto", "InduccionSolicitada", "Profesional", "VHB", "VHC", "VIH", "MotivoDenegacion", "SnapshotDrugID", "SnapshotSourceType", "CodigoNacional", "NRegistro",
                "NaranjoScore", "NaranjoCategoria", "KLCategoria", "CausalidadFinalFarmaceutica",
                "NaranjoQ1", "NaranjoQ2", "NaranjoQ3", "NaranjoQ4", "NaranjoQ5", "NaranjoQ6", "NaranjoQ7", "NaranjoQ8", "NaranjoQ9", "NaranjoQ10",
                "KLTemporal", "KLConocido", "KLAlternativa", "KLSuspendido", "KLMejora", "KLReadministracion", "KLReaparece",
                "OtrosFarmacosRelacionados"
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
                otherDrugsLines().join(" || ")
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
        });
        byId("fhDermaPatologia").addEventListener("change", function () {
            toggleHSBlock();
            updateValidationModuleSummaries();
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
        var registerHubBtn = byId("fhValRegisterHubBtn");
        if (registerHubBtn) registerHubBtn.addEventListener("click", registerValidationInHub);
        var btnNoFind = byId("btnNoFindDrug");
        if (btnNoFind) btnNoFind.addEventListener("click", showLocalDrugModal);
    }

    document.addEventListener("DOMContentLoaded", function () {
        F.whenReady(function () {
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
        recognizeCurrentHubRegistration();
        // WO8.1b — Botón Excel FH
        (function initValExcelBtn() {
            var btn = document.getElementById('fhValExcelExportBtn');
            if (!btn) return;
            btn.addEventListener('click', copyValidationExcelRow);
        })();
        });
    });
})();
