(function (root, factory) {
    "use strict";
    var api = factory(root || {});
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    if (root && typeof root === "object") {
        root.FarmaciaTratamiento = api;
    }
    if (typeof window !== "undefined" && window && typeof window === "object") {
        window.FarmaciaTratamiento = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
    "use strict";

    var EMPTY_TREATMENT = {
        tratamiento_id: "",
        paciente_cip: "",
        farmaco_nombre: "",
        nombre_comercial: "",
        principio_activo: "",
        dosis_valor: "",
        dosis_unidad: "",
        dosis_texto: "",
        presentacion: "",
        via: "",
        pauta: "",
        pauta_codigo: "",
        pauta_label: "",
        pauta_intervalo_dias: null,
        pauta_unidad: "",
        pauta_otro_texto: "",
        tipo_relacion: "",
        estado_linea: "",
        tipo_movimiento: "",
        fase_tratamiento: "",
        fecha_inicio: "",
        fecha_fin: "",
        motivo: "",
        observaciones: "",
        fuente: "",
        source_type: "",
        selected_drug_id: "",
        codigo_nacional: "",
        nregistro: "",
        es_principal: false,
        es_validado_farmacia: false,
        snapshot_origen: null
    };

    var TIPO_RELACION_VALUES = ["principal", "validado", "adicional", "concomitante", "historico", "exposicion", "sospechoso_ea"];
    var ESTADO_LINEA_VALUES = ["propuesto", "validado", "activo", "añadido", "suspendido", "historico", "finalizado", "no_aplica"];
    var TIPO_MOVIMIENTO_VALUES = ["sin_cambios", "optimizacion", "tratamiento_anadido", "cambio_terapeutico", "suspension", "revision_linea", "no_aplica"];
    var FASE_VALUES = ["induccion", "mantenimiento", "segun_fase", "no_aplica", "desconocida"];
    var FUENTE_VALUES = ["demo", "excel", "cima", "local_especial", "validacion", "primera_visita", "seguimiento", "dashboard_adapter"];
    var SOURCE_TYPE_VALUES = ["CIMA", "LOCAL", "LOCAL_PENDIENTE_DEMO", "DEMO", "EXCEL", "MANUAL"];

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function stringValue(value) {
        if (value == null) return "";
        return String(value).trim();
    }

    function boolValue(value) {
        return value === true || value === 1 || value === "1";
    }

    function firstNonEmpty() {
        for (var i = 0; i < arguments.length; i++) {
            var value = stringValue(arguments[i]);
            if (value) return value;
        }
        return "";
    }

    function normalizeKey(value) {
        return stringValue(value)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    function getPautasApi(options) {
        if (options && Object.prototype.hasOwnProperty.call(options, "pautasApi")) return options.pautasApi;
        if (root && root.FarmaciaPautasCatalog) return root.FarmaciaPautasCatalog;
        if (root && root.window && root.window.FarmaciaPautasCatalog) return root.window.FarmaciaPautasCatalog;
        if (typeof window !== "undefined" && window && window.FarmaciaPautasCatalog) return window.FarmaciaPautasCatalog;
        return null;
    }

    function baseTreatment() {
        return clone(EMPTY_TREATMENT);
    }

    function normalizeTipoRelacion(value, context) {
        var key = normalizeKey(value);
        if (!key) return "";
        if (key === "principal") return "principal";
        if (key === "validado") return "validado";
        if (key === "adicional") return "adicional";
        if (key === "concomitante") return "concomitante";
        if (key === "historico") return "historico";
        if (key === "exposicion") return "exposicion";
        if (key === "sospechoso_ea") return "sospechoso_ea";
        if (key === "sin_cambios" || key === "base") return "";
        if (key === "tratamiento_anadido" || key === "tratamiento_añadido") return "adicional";
        if (key === "cambio_terapeutico") return "historico";
        return "";
    }

    function normalizeEstadoLinea(value) {
        var key = normalizeKey(value);
        if (!key) return "";
        if (key === "anadido") return "añadido";
        if (key === "no_aplica") return "no_aplica";
        var restored = key.replace(/_/g, "_");
        if (restored === "propuesto") return "propuesto";
        if (restored === "validado") return "validado";
        if (restored === "activo") return "activo";
        if (restored === "suspendido") return "suspendido";
        if (restored === "historico") return "historico";
        if (restored === "finalizado") return "finalizado";
        return "";
    }

    function normalizeTipoMovimiento(value) {
        var key = normalizeKey(value);
        if (!key) return "";
        if (key === "tratamiento_añadido") key = "tratamiento_anadido";
        if (TIPO_MOVIMIENTO_VALUES.indexOf(key) !== -1) return key;
        return "";
    }

    function normalizeFaseTratamiento(value) {
        var key = normalizeKey(value);
        if (!key) return "";
        if (key === "segun_fase") return "segun_fase";
        if (FASE_VALUES.indexOf(key) !== -1) return key;
        return "";
    }

    function normalizeFuente(value) {
        var key = normalizeKey(value);
        if (!key) return "";
        if (key === "local") return "local_especial";
        if (FUENTE_VALUES.indexOf(key) !== -1) return key;
        return "";
    }

    function normalizeSourceType(value) {
        var source = stringValue(value).toUpperCase();
        if (!source) return "";
        if (SOURCE_TYPE_VALUES.indexOf(source) !== -1) return source;
        return "";
    }

    function normalizeVia(value) {
        var key = normalizeKey(value);
        if (!key) return "";
        if (key === "sc" || key === "subcutanea" || key === "subcutanea_subcutanea") return "SC";
        if (key === "iv" || key === "intravenosa") return "IV";
        if (key === "oral" || key === "vo" || key === "v_o") return "Oral";
        if (key === "im" || key === "intramuscular") return "IM";
        return stringValue(value);
    }

    function mapViaToSelect(value) {
        var via = normalizeVia(value);
        if (via === "SC" || via === "IV" || via === "Oral" || via === "IM") return via;
        return via ? "Otra" : "";
    }

    function applyPautaNormalization(input, options) {
        var pautaValue = firstNonEmpty(
            input && input.pauta,
            input && input.pauta_label,
            input && input.pauta_otro_texto
        );
        var empty = {
            pauta: pautaValue,
            pauta_codigo: "",
            pauta_label: "",
            pauta_intervalo_dias: null,
            pauta_unidad: "",
            pauta_otro_texto: ""
        };
        if (!pautaValue) return empty;
        var pautasApi = getPautasApi(options);
        if (!pautasApi || typeof pautasApi.normalizePautaLabel !== "function") {
            return empty;
        }
        var normalized = pautasApi.normalizePautaLabel(pautaValue);
        if (!normalized || typeof normalized !== "object") return empty;
        var legacyPauta = typeof pautasApi.getLegacyPautaLabel === "function"
            ? pautasApi.getLegacyPautaLabel(normalized)
            : (normalized.pauta_codigo === "OTRO" ? stringValue(normalized.pauta_otro_texto) : stringValue(normalized.pauta_label));
        return {
            pauta: stringValue(legacyPauta || pautaValue),
            pauta_codigo: stringValue(normalized.pauta_codigo),
            pauta_label: stringValue(normalized.pauta_label),
            pauta_intervalo_dias: typeof normalized.pauta_intervalo_dias === "number" ? normalized.pauta_intervalo_dias : null,
            pauta_unidad: stringValue(normalized.pauta_unidad),
            pauta_otro_texto: stringValue(normalized.pauta_otro_texto)
        };
    }

    function buildTreatmentFromCatalogSelection(drug, base) {
        var treatment = normalizeTreatmentInput(base || {}, base || {});
        if (!drug || typeof drug !== "object") return treatment;
        treatment.farmaco_nombre = firstNonEmpty(drug.display_name, drug.nombre_comercial, drug.principio_activo, treatment.farmaco_nombre);
        treatment.nombre_comercial = firstNonEmpty(drug.nombre_comercial, treatment.nombre_comercial);
        treatment.principio_activo = firstNonEmpty(drug.principio_activo, treatment.principio_activo);
        treatment.presentacion = firstNonEmpty(drug.nombre_presentacion, treatment.presentacion);
        treatment.dosis_texto = firstNonEmpty(drug.dosis, drug.nombre_presentacion, treatment.dosis_texto);
        treatment.via = normalizeVia(firstNonEmpty(drug.via, treatment.via));
        treatment.codigo_nacional = firstNonEmpty(drug.codigo_nacional, treatment.codigo_nacional);
        treatment.nregistro = firstNonEmpty(drug.nregistro, treatment.nregistro);
        treatment.selected_drug_id = firstNonEmpty(drug.drug_id, drug.selected_drug_id, treatment.selected_drug_id);
        treatment.source_type = normalizeSourceType(firstNonEmpty(drug.source_type, treatment.source_type));
        if (!treatment.fuente) {
            if (treatment.source_type === "CIMA") treatment.fuente = "cima";
            else if (treatment.source_type === "LOCAL") treatment.fuente = "local_especial";
        }
        treatment.snapshot_origen = clone(drug);
        return treatment;
    }

    function normalizeLegacyMovement(treatment, original) {
        var originalRelation = normalizeKey(original && original.tipo_relacion);
        if (!treatment.tipo_movimiento) {
            if (originalRelation === "sin_cambios" || originalRelation === "base") {
                treatment.tipo_movimiento = "sin_cambios";
            } else if (originalRelation === "tratamiento_anadido" || originalRelation === "tratamiento_añadido") {
                treatment.tipo_movimiento = "tratamiento_anadido";
            } else if (originalRelation === "cambio_terapeutico") {
                treatment.tipo_movimiento = "cambio_terapeutico";
            }
        }
    }

    function normalizeTreatmentInput(input, options) {
        var source = input && typeof input === "object" ? input : {};
        var treatment = baseTreatment();
        treatment.tratamiento_id = firstNonEmpty(source.tratamiento_id, source.linea_id, source.id, options && options.tratamiento_id);
        treatment.paciente_cip = firstNonEmpty(source.paciente_cip, source.cip, options && options.paciente_cip);
        treatment.farmaco_nombre = firstNonEmpty(source.farmaco_nombre, source.farmaco, source.display_name, source.nombre_snapshot, source.nombre_linea);
        treatment.nombre_comercial = firstNonEmpty(source.nombre_comercial, source.nombre_snapshot, source.farmaco);
        treatment.principio_activo = firstNonEmpty(source.principio_activo, source.principioActivo, source.principio_activo_snapshot);
        treatment.dosis_valor = firstNonEmpty(source.dosis_valor);
        treatment.dosis_unidad = firstNonEmpty(source.dosis_unidad);
        treatment.dosis_texto = firstNonEmpty(source.dosis_texto, source.dosis_presentacion, source.dosis, source.presentacion_dosis);
        treatment.presentacion = firstNonEmpty(source.presentacion, source.presentacion_snapshot, source.nombre_presentacion, source.presentacion_dosis, source.dosis);
        treatment.via = normalizeVia(firstNonEmpty(source.via, source.via_snapshot));
        treatment.fecha_inicio = firstNonEmpty(source.fecha_inicio, source.primeraVisita);
        treatment.fecha_fin = firstNonEmpty(source.fecha_fin);
        treatment.motivo = firstNonEmpty(source.motivo);
        treatment.observaciones = firstNonEmpty(source.observaciones, source.notas);
        treatment.fuente = normalizeFuente(firstNonEmpty(source.fuente, options && options.fuente));
        treatment.source_type = normalizeSourceType(firstNonEmpty(source.source_type, options && options.source_type));
        treatment.selected_drug_id = firstNonEmpty(source.selected_drug_id, source.drug_id);
        treatment.codigo_nacional = firstNonEmpty(source.codigo_nacional, source.codigo_nacional_snapshot);
        treatment.nregistro = firstNonEmpty(source.nregistro, source.nregistro_snapshot);
        treatment.es_principal = boolValue(source.es_principal) || normalizeTipoRelacion(source.tipo_relacion, source) === "principal";
        treatment.es_validado_farmacia = boolValue(source.es_validado_farmacia);
        treatment.snapshot_origen = source.snapshot_origen != null ? source.snapshot_origen : clone(source);

        var relationContext = {
            es_principal: treatment.es_principal,
            estado_linea: firstNonEmpty(source.estado_linea)
        };
        treatment.tipo_relacion = normalizeTipoRelacion(firstNonEmpty(source.tipo_relacion, options && options.tipo_relacion), relationContext);
        treatment.estado_linea = normalizeEstadoLinea(firstNonEmpty(source.estado_linea, options && options.estado_linea));
        treatment.tipo_movimiento = normalizeTipoMovimiento(firstNonEmpty(source.tipo_movimiento, options && options.tipo_movimiento));
        treatment.fase_tratamiento = normalizeFaseTratamiento(firstNonEmpty(source.fase_tratamiento, options && options.fase_tratamiento));

        if (!treatment.estado_linea && treatment.tipo_relacion === "historico") treatment.estado_linea = "historico";
        if (!treatment.estado_linea && treatment.tipo_relacion === "exposicion") treatment.estado_linea = "no_aplica";
        if (!treatment.estado_linea && treatment.tipo_relacion === "sospechoso_ea") treatment.estado_linea = "no_aplica";
        if (!treatment.estado_linea && treatment.es_principal) treatment.estado_linea = "activo";
        if (!treatment.tipo_relacion && treatment.es_principal) treatment.tipo_relacion = "principal";
        if (!treatment.tipo_movimiento && treatment.es_principal) treatment.tipo_movimiento = "sin_cambios";

        normalizeLegacyMovement(treatment, source);

        if (treatment.tipo_relacion === "sospechoso_ea") {
            treatment.es_principal = false;
            if (!treatment.estado_linea) treatment.estado_linea = "no_aplica";
        }
        if (treatment.tipo_relacion === "historico" || treatment.tipo_relacion === "exposicion") {
            if (!treatment.estado_linea) treatment.estado_linea = treatment.tipo_relacion === "historico" ? "historico" : "no_aplica";
        }

        var pautaNormalized = applyPautaNormalization(source, options);
        treatment.pauta = pautaNormalized.pauta;
        treatment.pauta_codigo = pautaNormalized.pauta_codigo;
        treatment.pauta_label = pautaNormalized.pauta_label;
        treatment.pauta_intervalo_dias = pautaNormalized.pauta_intervalo_dias;
        treatment.pauta_unidad = pautaNormalized.pauta_unidad;
        treatment.pauta_otro_texto = pautaNormalized.pauta_otro_texto;

        return treatment;
    }

    function buildTreatmentSnapshot(input, options) {
        var source = input && typeof input === "object" ? input : {};
        if (source.selected_drug_id || source.drug_id || source.source_type || source.nombre_presentacion || source.principio_activo_snapshot || source.presentacion_snapshot) {
            if (source.principio_activo_snapshot || source.presentacion_snapshot || source.codigo_nacional_snapshot || source.nregistro_snapshot) {
                return normalizeTreatmentInput({
                    tratamiento_id: source.tratamiento_id || source.linea_id || "",
                    paciente_cip: source.paciente_cip || source.cip || "",
                    farmaco_nombre: source.nombre_snapshot || "",
                    nombre_comercial: source.nombre_comercial || source.nombre_snapshot || "",
                    principio_activo: source.principio_activo_snapshot || "",
                    dosis_texto: source.dosis_presentacion || "",
                    presentacion: source.presentacion_snapshot || "",
                    via: source.via_snapshot || "",
                    pauta: source.pauta || "",
                    fuente: options && options.fuente,
                    source_type: source.source_type || "",
                    selected_drug_id: source.selected_drug_id || source.drug_id || "",
                    codigo_nacional: source.codigo_nacional_snapshot || "",
                    nregistro: source.nregistro_snapshot || "",
                    snapshot_origen: source
                }, options);
            }
            return buildTreatmentFromCatalogSelection(source, options || {});
        }
        return normalizeTreatmentInput(source, options || {});
    }

    function buildTreatmentFromPatient(patient, options) {
        var source = patient && typeof patient === "object" ? patient : {};
        var opts = options || {};
        var snapshot = opts.snapshot || null;
        var lines = [];

        if (Array.isArray(source.biologicos) && source.biologicos.length) {
            lines = source.biologicos.map(function (line) {
                return normalizeTreatmentInput({
                    tratamiento_id: line.tratamiento_id_principal || line.linea_id || line.id || "",
                    paciente_cip: source.cip || "",
                    farmaco_nombre: line.nombre_linea || line.nombre_comercial || line.principio_activo || "",
                    nombre_comercial: line.nombre_comercial || source.farmaco || "",
                    principio_activo: line.principio_activo || source.principioActivo || "",
                    dosis_texto: line.dosis || line.presentacion || line.presentacion_dosis || source.dosis || "",
                    presentacion: line.presentacion || line.presentacion_dosis || line.dosis || "",
                    via: line.via || source.via || "",
                    pauta: line.pauta || source.pauta || "",
                    tipo_relacion: line.tipo_relacion || "",
                    estado_linea: line.estado_linea || (line.activo ? "activo" : ""),
                    tipo_movimiento: line.tipo_movimiento || "",
                    fecha_inicio: line.fecha_inicio || source.primeraVisita || "",
                    fecha_fin: line.fecha_fin || "",
                    es_principal: line.es_principal,
                    fuente: opts.fuente || "",
                    source_type: opts.source_type || "",
                    snapshot_origen: line
                }, opts);
            });
        } else if (source.farmaco || source.principioActivo) {
            lines = [normalizeTreatmentInput({
                tratamiento_id: opts.tratamiento_id || "",
                paciente_cip: source.cip || "",
                farmaco_nombre: source.farmaco || source.principioActivo || "",
                nombre_comercial: source.farmaco || "",
                principio_activo: source.principioActivo || source.farmaco || "",
                dosis_texto: source.dosis || "",
                presentacion: source.presentacion || source.dosis || "",
                via: source.via || "",
                pauta: source.pauta || "",
                tipo_relacion: "principal",
                estado_linea: "activo",
                tipo_movimiento: "sin_cambios",
                fecha_inicio: source.primeraVisita || "",
                es_principal: true,
                fuente: opts.fuente || "",
                source_type: opts.source_type || "",
                snapshot_origen: source
            }, opts)];
        }

        if (snapshot && lines.length) {
            lines = lines.map(function (line, index) {
                if (index > 0) return line;
                var merged = clone(line);
                var snapTreatment = buildTreatmentSnapshot(snapshot, opts);
                if (!merged.selected_drug_id) merged.selected_drug_id = snapTreatment.selected_drug_id;
                if (!merged.codigo_nacional) merged.codigo_nacional = snapTreatment.codigo_nacional;
                if (!merged.nregistro) merged.nregistro = snapTreatment.nregistro;
                if (!merged.source_type) merged.source_type = snapTreatment.source_type;
                if (!merged.fuente) merged.fuente = snapTreatment.fuente;
                if (!merged.presentacion) merged.presentacion = snapTreatment.presentacion;
                if (!merged.dosis_texto) merged.dosis_texto = snapTreatment.dosis_texto;
                if (!merged.via) merged.via = snapTreatment.via;
                merged.snapshot_origen = {
                    patient: clone(line.snapshot_origen),
                    snapshot: clone(snapshot)
                };
                return merged;
            });
        }

        if (opts.returnArray) return lines;
        if (!lines.length) {
            return normalizeTreatmentInput({
                paciente_cip: source.cip || ""
            }, opts);
        }
        var principalLine = lines.find(function (line) {
            return line.es_principal === true;
        });
        if (principalLine) return principalLine;
        principalLine = lines.find(function (line) {
            return line.tipo_relacion === "principal";
        });
        if (principalLine) return principalLine;
        principalLine = lines.find(function (line) {
            return line.tipo_relacion === "validado" && (line.estado_linea === "activo" || line.estado_linea === "validado");
        });
        if (principalLine) return principalLine;
        var activeLines = lines.filter(function (line) {
            return line.estado_linea === "activo";
        });
        if (activeLines.length === 1) return activeLines[0];
        return lines[0];
    }

    function buildTreatmentCsvFields(treatment, prefix) {
        var normalized = normalizeTreatmentInput(treatment || {}, {});
        var pfx = stringValue(prefix);
        var out = {};
        Object.keys(EMPTY_TREATMENT).forEach(function (key) {
            if (key === "snapshot_origen") return;
            out[pfx + key] = normalized[key];
        });
        return out;
    }

    function buildTreatmentSummary(treatment) {
        var normalized = normalizeTreatmentInput(treatment || {}, {});
        var title = firstNonEmpty(normalized.farmaco_nombre, normalized.nombre_comercial, normalized.principio_activo, "Tratamiento");
        var subtitle = [
            normalized.principio_activo,
            normalized.dosis_texto || normalized.presentacion,
            normalized.via,
            normalized.pauta
        ].filter(Boolean).join(" · ");
        var meta = [];
        if (normalized.tipo_relacion) meta.push(normalized.tipo_relacion);
        if (normalized.estado_linea) meta.push(normalized.estado_linea);
        if (normalized.fuente) meta.push(normalized.fuente);
        if (normalized.codigo_nacional) meta.push("CN " + normalized.codigo_nacional);
        return {
            titulo: title,
            subtitulo: subtitle,
            meta: meta
        };
    }

    return {
        EMPTY_TREATMENT: clone(EMPTY_TREATMENT),
        normalizeTreatmentInput: normalizeTreatmentInput,
        buildTreatmentSnapshot: buildTreatmentSnapshot,
        buildTreatmentFromCatalogSelection: buildTreatmentFromCatalogSelection,
        buildTreatmentFromPatient: buildTreatmentFromPatient,
        normalizeTipoRelacion: normalizeTipoRelacion,
        normalizeEstadoLinea: normalizeEstadoLinea,
        normalizeTipoMovimiento: normalizeTipoMovimiento,
        normalizeFaseTratamiento: normalizeFaseTratamiento,
        normalizeFuente: normalizeFuente,
        normalizeSourceType: normalizeSourceType,
        normalizeVia: normalizeVia,
        mapViaToSelect: mapViaToSelect,
        applyPautaNormalization: applyPautaNormalization,
        buildTreatmentCsvFields: buildTreatmentCsvFields,
        buildTreatmentSummary: buildTreatmentSummary
    };
});
