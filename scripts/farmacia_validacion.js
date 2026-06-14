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
    var REUMA_DEFAULT = {
        cip: "CIP-DEMO-FH-003",
        patologia: "Artritis Reumatoide (AR)",
        farmaco: "Adalimumab 40 mg",
        principioActivo: "Adalimumab",
        dosis: "40 mg",
        via: "SC",
        pauta: "SC / cada 2 semanas",
        induccion: "No aplica",
        justificacion: "Analítica OK; vacunación completa; DAS28 3.2; HAQ 1.1"
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
        return modoActual === "derma" && byId("fhDermaPatologia").value === "Hidradenitis supurativa";
    }

    function setChecked(id, value) {
        var el = byId(id);
        if (el) el.checked = !!value;
    }

    function selectedCip() {
        if (modoActual === "reuma") {
            return currentPatient && currentPatient.cip ? currentPatient.cip : REUMA_DEFAULT.cip;
        }
        return byId("fhDermaCip").value.trim() || "CIP-DEMO-FH-XXX";
    }

    function selectedPatologia() {
        if (modoActual === "reuma") {
            return currentPatient && currentPatient.patologia ? currentPatient.patologia : REUMA_DEFAULT.patologia;
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
        byId("formHS").classList.toggle("hidden", !isHSPathology());
        var note = byId("fhHSOtherNote");
        if (!note) {
            note = createEl("p", "pathology-demo-note");
            note.id = "fhHSOtherNote";
            byId("formDerma").appendChild(note);
        }
        var patologia = byId("fhDermaPatologia").value;
        var showNote = modoActual === "derma" && patologia && patologia !== "Hidradenitis supurativa";
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

    function mostrarFormulario(modo) {
        modoActual = modo;
        byId("formDerma").classList.toggle("hidden", modo !== "derma");
        byId("formReuma").classList.toggle("hidden", modo !== "reuma");
        byId("validationBlock").classList.remove("hidden");
        if (modo === "derma" && !byId("fhDermaFecha").value) {
            byId("fhDermaFecha").value = new Date().toISOString().slice(0, 10);
        }
        toggleHSBlock();
        updateValidationModuleSummaries();
        updateSeguimientoHandoffLink();
        toggleCausalityModules();
    }

    function applyContext() {
        var context = F.getQueryContext();
        currentPatient = context.patient || null;
        if (context.cip) F.setValue("fhDermaCip", context.cip);
        if (context.servicioSlug === "reumatologia" || context.servicio === "reumatologia") mostrarFormulario("reuma");
        else if (context.cip || context.servicio || context.patologia) mostrarFormulario("derma");
        if (context.patologia) F.setValue("fhDermaPatologia", context.patologia);
        if (context.patient) {
            var p = context.patient;
            F.setValue("fhDermaFarmaco", p.farmaco);
            F.setValue("fhDermaDosis", p.dosis);
            if (p.pauta) {
                var pautaObj = P && typeof P.normalizePautaLabel === "function" ? P.normalizePautaLabel(p.pauta) : null;
                F.setValue("fhDermaPauta", pautaObj ? pautaObj.pauta_codigo : "");
                if (pautaObj && pautaObj.pauta_codigo === "OTRO" && pautaObj.pauta_otro_texto) {
                    F.setValue("fhDermaPautaOtro", pautaObj.pauta_otro_texto);
                    byId("fhDermaPautaOtro").classList.remove("hidden");
                } else {
                    F.setValue("fhDermaPautaOtro", "");
                    byId("fhDermaPautaOtro").classList.add("hidden");
                }
            }
            F.setValue("fhDermaVia", p.via);
            F.setValue("fhDermaAnalitica", p.analitica);
            if (p.estado === "pending") F.setValue("fhValEstado", "pending");
            if (p.estado === "validated") F.setValue("fhValEstado", "validated");
            if (p.ihs4 !== undefined) F.setValue("fhHSIhs4", p.ihs4);
            if (p.hurley) F.setValue("fhHSHurley", p.hurley);
            if (p.dlqi !== undefined) F.setValue("fhHSDlqi", p.dlqi);
            if (p.localizacion) F.setValue("fhHSLocalizacion", p.localizacion);
            if (p.tiempoEvolucion) F.setValue("fhHSTiempoEvolucion", p.tiempoEvolucion);
            if (p.tratamientosPrevios) F.setValue("fhHSTratamientosPrevios", p.tratamientosPrevios);
            if (p.motivoClinico) F.setValue("fhHSMotivoClinico", p.motivoClinico);
            if (p.principioActivo) F.setValue("fhDermaPrincipioActivo", p.principioActivo);

            if (p.tratamientosPreviosHS) {
                var hsTto = p.tratamientosPreviosHS;
                setChecked("fhHSTtoDoxiClinda", hsTto.doxiciclinaClindamicina);
                setChecked("fhHSTtoRifClinda", hsTto.rifampicinaClindamicina);
                setChecked("fhHSTtoOtrosAb", hsTto.otrosAtb);
                if (hsTto.otrosAtbTexto) F.setValue("fhHSTtoOtrosAbTxt", hsTto.otrosAtbTexto);
                toggleOtrosAtbDetalle();
            }

            if (p.biologicosPrevios) {
                var hsBio = p.biologicosPrevios;
                setChecked("fhHSBioAda", hsBio.adalimumab);
                if (hsBio.adalimumabDuracion) F.setValue("fhHSBioAdaDuracion", hsBio.adalimumabDuracion);
                if (hsBio.adalimumabMotivo) F.setValue("fhHSBioAdaMotivo", hsBio.adalimumabMotivo);
                setChecked("fhHSBioOtros", hsBio.otrosBiologicos);
                if (hsBio.otrosBiologicosFarmaco) F.setValue("fhHSBioOtrosFarmaco", hsBio.otrosBiologicosFarmaco);
                if (hsBio.otrosBiologicosMotivo) F.setValue("fhHSBioOtrosMotivo", hsBio.otrosBiologicosMotivo);
            }

            if (p.analiticaEstruct) {
                var an = p.analiticaEstruct;
                if (an.fecha) F.setValue("fhAnaliticaFecha", an.fecha);
                if (an.reciente) F.setValue("fhAnaliticaReciente", an.reciente);
                setChecked("fhAnaliticaHemograma", an.hemograma);
                setChecked("fhAnaliticaBioquimica", an.bioquimica);
                if (an.mantoux) F.setValue("fhAnaliticaMantoux", an.mantoux);
                if (an.serologiasVhb) F.setValue("fhAnaliticaSerologiasVhb", an.serologiasVhb);
                if (an.serologiasVhc) F.setValue("fhAnaliticaSerologiasVhc", an.serologiasVhc);
                if (an.serologiasVih) F.setValue("fhAnaliticaSerologiasVih", an.serologiasVih);
                if (!an.serologiasVhb && !an.serologiasVhc && !an.serologiasVih && an.serologias) {
                    F.setValue("fhAnaliticaSerologiasVhb", an.serologias);
                    F.setValue("fhAnaliticaSerologiasVhc", an.serologias);
                    F.setValue("fhAnaliticaSerologiasVih", an.serologias);
                }
                if (an.vacunacion) F.setValue("fhAnaliticaVacunacion", an.vacunacion);
                if (an.observaciones) F.setValue("fhAnaliticaObservaciones", an.observaciones);
            }

            if (p.comorbilidades) {
                var com = p.comorbilidades;
                if (com.imc) F.setValue("fhHSComorbImc", com.imc);
                if (com.tabaquismo) F.setValue("fhHSComorbTabaquismo", com.tabaquismo);
                if (com.paquetesAno) F.setValue("fhHSComorbPaquetes", com.paquetesAno);
                if (com.diabetes) F.setValue("fhHSComorbDiabetes", com.diabetes);
                if (com.hba1c) F.setValue("fhHSComorbHba1c", com.hba1c);
                if (com.sindromeMetabolico) F.setValue("fhHSComorbSdMetabolico", com.sindromeMetabolico);
                if (com.otras) F.setValue("fhHSComorbOtras", com.otras);
            }
        }
        if (modoActual) byId("fhTipoSolicitud").value = modoActual;
        toggleHSBlock();
        updateValidationModuleSummaries();
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
        if (modoActual === "reuma") {
            return {
                farmaco: valueOrDash(currentPatient && currentPatient.farmaco ? currentPatient.farmaco : REUMA_DEFAULT.farmaco),
                principioActivo: valueOrDash(currentPatient && currentPatient.principioActivo ? currentPatient.principioActivo : REUMA_DEFAULT.principioActivo),
                dosis: valueOrDash(currentPatient && currentPatient.dosis ? currentPatient.dosis : REUMA_DEFAULT.dosis),
                via: valueOrDash(currentPatient && currentPatient.via ? currentPatient.via : REUMA_DEFAULT.via),
                pauta: valueOrDash(currentPatient && currentPatient.pauta ? currentPatient.pauta : REUMA_DEFAULT.pauta),
                induccion: valueOrDash(REUMA_DEFAULT.induccion),
                justificacion: valueOrDash(currentPatient && currentPatient.analitica ? currentPatient.analitica : REUMA_DEFAULT.justificacion)
            };
        }
        return {
            farmaco: valueOrDash(byId("fhDermaFarmaco").value),
            principioActivo: valueOrDash(byId("fhDermaPrincipioActivo").value),
            dosis: valueOrDash(byId("fhDermaDosis").value),
            via: valueOrDash(byId("fhDermaVia").value),
            pauta: (function () {
                var select = byId("fhDermaPauta");
                var value = select ? select.value : "";
                if (value === "OTRO") return valueOrDash(byId("fhDermaPautaOtro").value);
                if (P && typeof P.getPautaByCodigo === "function" && typeof P.getLegacyPautaLabel === "function") {
                    var pautaObj = P.getPautaByCodigo(value);
                    return valueOrDash(P.getLegacyPautaLabel(pautaObj));
                }
                return valueOrDash(value);
            })(),
            induccion: byId("fhDermaInduccion").value === "si" ? "Sí" : (byId("fhDermaInduccion").value === "no" ? "No" : "—"),
            justificacion: valueOrDash(byId("fhDermaJustificacion").value || byId("fhHSMotivoClinico").value)
        };
    }

    function updateTreatmentSummary() {
        var summary = currentTreatmentSummary();
        setText("fhResumenFarmaco", summary.farmaco);
        setText("fhResumenPrincipioActivo", summary.principioActivo);
        setText("fhResumenDosis", summary.dosis);
        setText("fhResumenVia", summary.via);
        setText("fhResumenPauta", summary.pauta);
        setText("fhResumenInduccion", summary.induccion);
        setText("fhResumenJustificacion", summary.justificacion);
    }

    function updatePrebiologicoSummary() {
        setText("fhResumenAnaliticaFecha", valueOrDash(byId("fhAnaliticaFecha").value));
        setText("fhResumenAnaliticaReciente", valueOrDash(byId("fhAnaliticaReciente").value));
        setText("fhResumenMantoux", valueOrDash(byId("fhAnaliticaMantoux").value));
        setText("fhResumenVhb", valueOrDash(byId("fhAnaliticaSerologiasVhb").value));
        setText("fhResumenVhc", valueOrDash(byId("fhAnaliticaSerologiasVhc").value));
        setText("fhResumenVih", valueOrDash(byId("fhAnaliticaSerologiasVih").value));
        setText("fhResumenVacunacion", valueOrDash(byId("fhAnaliticaVacunacion").value));
        setText("fhResumenHemograma", byId("fhAnaliticaHemograma").checked ? "Verificado" : "No verificado");
        setText("fhResumenBioquimica", byId("fhAnaliticaBioquimica").checked ? "Verificado" : "No verificado");
        setText("fhResumenVacunacionObs", valueOrDash(byId("fhAnaliticaObservaciones").value));
    }

    function updateValidationModuleSummaries() {
        updateTreatmentSummary();
        updatePrebiologicoSummary();
    }

    function updateSeguimientoHandoffLink() {
        var link = byId('fhGoSeguimientoLink');
        if (!link) return;
        var params = [];
        var cip = selectedCip();
        var patologia = selectedPatologia();
        if (cip && cip !== 'CIP-DEMO-FH-XXX') params.push('cip=' + encodeURIComponent(cip));
        if (modoActual === 'reuma') params.push('servicio=' + encodeURIComponent('reumatologia'));
        else params.push('servicio=' + encodeURIComponent('dermatologia'));
        if (patologia && patologia !== '—') params.push('patologia=' + encodeURIComponent(patologia));
        params.push('entrada=' + encodeURIComponent('seguimiento'));
        link.href = 'farmacia_seguimiento.html' + (params.length ? ('?' + params.join('&')) : '');
    }

    function mapViaToSelect(catalogVia) {
        var v = (catalogVia || "").toLowerCase();
        if (v.indexOf("subcut") !== -1 || v === "sc") return "SC";
        if (v.indexOf("intraven") !== -1 || v === "iv") return "IV";
        if (v.indexOf("oral") !== -1) return "Oral";
        return "Otra";
    }

    function selectDrug(drug) {
        byId("fhDermaFarmaco").value = drug.display_name || drug.nombre_comercial || "";
        byId("fhDermaPrincipioActivo").value = drug.principio_activo || "";
        byId("fhDermaDosis").value = drug.dosis || "";
        var viaValue = mapViaToSelect(drug.via);
        var viaSelect = byId("fhDermaVia");
        var viaOptions = Array.from(viaSelect.options).map(function (opt) { return opt.value; });
        if (viaOptions.indexOf(viaValue) !== -1) viaSelect.value = viaValue;
        else if (viaOptions.indexOf("Otra") !== -1) viaSelect.value = "Otra";
        C.selectDrug(drug);
        clearAutocompleteDropdown();
        updateValidationModuleSummaries();
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
        var query = byId("fhDermaFarmaco").value.trim();
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
        byId("fhDermaFarmaco").value = displayName;
        if (principio) byId("fhDermaPrincipioActivo").value = principio;
        if (presentacion) byId("fhDermaDosis").value = presentacion;
        if (via) {
            var viaValue = mapViaToSelect(via);
            var viaSelect = byId("fhDermaVia");
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
        var summary = currentTreatmentSummary();
        var naranjoAnswers = readNaranjoAnswersFromDom();
        var klAnswers = readKarchLasagnaAnswersFromDom();
        lines.push("=== INFORME DE VALIDACIÓN FARMACOTERAPÉUTICA ===");
        lines.push("Identificador demo: FH-VAL-" + Date.now().toString(36).toUpperCase());
        lines.push("Fecha: " + new Date().toLocaleDateString("es-ES"));
        lines.push("");
        lines.push("Servicio origen: " + (modoActual === "reuma" ? (currentPatient && currentPatient.servicio ? currentPatient.servicio : "Reumatología") : "Dermatología"));
        lines.push("CIP: " + selectedCip());
        lines.push("Patología: " + selectedPatologia());
        if (modoActual !== "reuma") lines.push("Fecha solicitud: " + valueOrDash(byId("fhDermaFecha").value));
        lines.push("Fármaco solicitado: " + summary.farmaco);
        lines.push("Principio activo: " + summary.principioActivo);
        lines.push("Dosis: " + summary.dosis);
        lines.push("Vía: " + summary.via);
        lines.push("Pauta: " + summary.pauta);
        lines.push("Inducción: " + summary.induccion);
        lines.push("Justificación clínica: " + summary.justificacion);

        lines.push("");
        lines.push("OTROS FÁRMACOS / BIOLÓGICOS");
        otherDrugsLines().forEach(function (line) { lines.push(line); });

        lines.push("");
        lines.push("ESTUDIO PREBIOLÓGICO");
        lines.push("Fecha analítica: " + valueOrDash(byId("fhAnaliticaFecha").value));
        lines.push("Analítica <3 meses: " + valueOrDash(byId("fhAnaliticaReciente").value));
        lines.push("Hemograma: " + (byId("fhAnaliticaHemograma").checked ? "Verificado" : "No verificado"));
        lines.push("Bioquímica: " + (byId("fhAnaliticaBioquimica").checked ? "Verificado" : "No verificado"));
        lines.push("Mantoux/IGRA: " + valueOrDash(byId("fhAnaliticaMantoux").value));
        lines.push("VHB: " + valueOrDash(byId("fhAnaliticaSerologiasVhb").value));
        lines.push("VHC: " + valueOrDash(byId("fhAnaliticaSerologiasVhc").value));
        lines.push("VIH: " + valueOrDash(byId("fhAnaliticaSerologiasVih").value));
        lines.push("Vacunación: " + valueOrDash(byId("fhAnaliticaVacunacion").value));
        lines.push("Observaciones vacunación: " + valueOrDash(byId("fhAnaliticaObservaciones").value));

        lines.push("");
        lines.push("EFECTO ADVERSO / RAM");
        lines.push("¿Existe sospecha de RAM?: " + byId("fhEaNotificado").options[byId("fhEaNotificado").selectedIndex].text);

        lines.push("");
        lines.push("ALGORITMO DE NARANJO");
        Object.keys(naranjoAnswers).forEach(function (key) {
            lines.push(key.toUpperCase() + ": " + valueOrDash(naranjoAnswers[key]));
        });
        lines.push("Puntuación total: " + byId("naranjoScore").textContent);
        lines.push("Categoría: " + byId("naranjoCategoria").textContent);

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

        lines.push("");
        lines.push("RESUMEN DE CAUSALIDAD");
        lines.push("Naranjo: " + byId("resumenNaranjo").textContent);
        lines.push("Karch-Lasagna: " + byId("resumenKl").textContent);
        lines.push("Causalidad final farmacéutica: " + byId("fhCausalidadFinal").value);

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
        var summary = currentTreatmentSummary();
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
                modoActual === "reuma" ? (currentPatient && currentPatient.servicio ? currentPatient.servicio : "Reumatología") : "Dermatología",
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
            "fhDermaFarmaco", "fhDermaPrincipioActivo", "fhDermaDosis", "fhDermaVia", "fhDermaPauta", "fhDermaPautaOtro",
            "fhDermaInduccion", "fhDermaJustificacion", "fhHSMotivoClinico", "fhAnaliticaFecha",
            "fhAnaliticaReciente", "fhAnaliticaMantoux", "fhAnaliticaSerologiasVhb", "fhAnaliticaSerologiasVhc",
            "fhAnaliticaSerologiasVih", "fhAnaliticaVacunacion", "fhAnaliticaObservaciones"
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
        byId("fhTipoSolicitud").addEventListener("change", function () {
            if (this.value) mostrarFormulario(this.value);
        });
        byId("fhValEstado").addEventListener("change", function (event) {
            byId("fhValMotivoRow").classList.toggle("hidden", event.target.value !== "denied");
        });
        byId("fhDermaPatologia").addEventListener("change", function () {
            toggleHSBlock();
            updateValidationModuleSummaries();
        });
        byId("fhHSBioAda").addEventListener("change", toggleBioAdaDetalle);
        byId("fhHSBioOtros").addEventListener("change", toggleBioOtrosDetalle);
        byId("fhHSTtoOtrosAb").addEventListener("change", toggleOtrosAtbDetalle);
        byId("btnAddOtherDrug").addEventListener("click", addOtherDrug);
        byId("fhValExportTxt").addEventListener("click", function () {
            F.downloadFile("validacion_FH_" + new Date().toISOString().slice(0, 10) + ".txt", buildValidationLines().join("\n"), "text/plain;charset=utf-8");
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

    document.addEventListener("DOMContentLoaded", function () {
        populatePautaSelect("fhDermaPauta", "fhDermaPautaOtro");
        bindCoreEvents();
        bindSummaryInputs();
        bindCausalityEvents();
        renderOtherDrugs();
        if (C.loaded) {
            enableAutocomplete();
            byId("noFindDrugRow").classList.remove("hidden");
        }
        document.addEventListener("farmacia:catalog-loaded", function () {
            if (!C.loaded) return;
            enableAutocomplete();
            byId("noFindDrugRow").classList.remove("hidden");
        });
        applyContext();
        initAnaliticaChips();
        updateValidationModuleSummaries();
        updateNaranjoScore();
        updateKarchLasagna();
        toggleCausalityModules();
    });
})();
