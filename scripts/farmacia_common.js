'use strict';

(function () {
    const qs = (selector, scope = document) => scope.querySelector(selector);
    const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

    const patients = {
        'CIP-DEMO-FH-001': {
            nombre: 'Paciente Demo FH-001', cip: 'CIP-DEMO-FH-001', edad: '48', sexo: 'Mujer', servicio: 'Dermatología', servicioSlug: 'dermatologia',
            patologia: 'Hidradenitis supurativa', farmaco: 'Secukinumab 300 mg', dosis: '300 mg', pauta: 'SC / cada 4 semanas', via: 'SC',
            estado: 'followup', estadoLabel: 'En seguimiento', fechaSolicitud: '2026-05-10', ultimaSolicitud: '2026-05-10',
            analitica: 'Analítica y vacunación completas según protocolo prebiológico demo.', scores: 'IHS4 demo: 9 → 5 (mejoría); DLQI demo: 14 → 8',
            ultimaVisita: '2026-06-01', adherencia: 'Alta (Morisky-Green: 4/4)', efectosAdversos: 'Reacción cutánea leve (2026-05-25, resuelta)', proms: 'DLQI 8; EVA picor 3/10', primeraVisita: '2026-05-12', seguimiento: 'Seguimiento abierto',
            ihs4: 9,
            hurley: 'Hurley II',
            dlqi: 14,
            localizacion: 'Axilar bilateral',
            tiempoEvolucion: '3 años',
            tratamientosPreviosHS: {
                doxiciclinaClindamicina: true,
                rifampicinaClindamicina: true,
                otrosAtb: true,
                otrosAtbTexto: 'Minociclina 6 meses'
            },
            biologicosPrevios: {
                adalimumab: true,
                adalimumabDuracion: '6 meses',
                adalimumabMotivo: 'Fallo secundario',
                otrosBiologicos: false,
                otrosBiologicosFarmaco: '',
                otrosBiologicosMotivo: ''
            },
            analiticaEstruct: {
                fecha: '2026-05-01',
                reciente: 'si',
                hemograma: true,
                bioquimica: true,
                mantoux: 'Negativo',
                serologias: 'Negativo',
                vacunacion: 'si',
                observaciones: 'Vacunas al día antes del inicio.'
            },
            comorbilidades: {
                imc: '30.2',
                tabaquismo: 'Exfumador',
                paquetesAno: '',
                diabetes: 'no',
                hba1c: '',
                sindromeMetabolico: 'si',
                otras: 'Obesidad grado I.'
            },
            motivoClinico: 'HS Hurley II refractaria a antibioterapia oral, candidata a biológico.',
            principioActivo: 'Secukinumab'
        },
        'CIP-DEMO-FH-002': {
            nombre: 'Paciente Demo FH-002', cip: 'CIP-DEMO-FH-002', edad: '35', sexo: 'Hombre', servicio: 'Dermatología', servicioSlug: 'dermatologia',
            patologia: 'Hidradenitis supurativa', farmaco: 'Adalimumab 80/40 mg', dosis: '80 mg inducción; 40 mg mantenimiento', pauta: 'SC / semanal según fase', via: 'SC',
            estado: 'pending', estadoLabel: 'Pendiente', fechaSolicitud: '2026-06-06', ultimaSolicitud: '2026-06-06',
            analitica: 'Analítica y cribado infeccioso pendientes de cierre.', scores: 'IHS4 demo: 12; DLQI demo: 16',
            ultimaVisita: '—', adherencia: 'Sin registro', efectosAdversos: 'No registrados', proms: 'Basal pendiente', primeraVisita: 'Pendiente', seguimiento: 'No iniciado',
            ihs4: 12,
            hurley: 'Hurley III',
            dlqi: 16,
            localizacion: 'Inguinal bilateral y axilar',
            tiempoEvolucion: '5 años',
            tratamientosPreviosHS: {
                doxiciclinaClindamicina: true,
                rifampicinaClindamicina: true,
                otrosAtb: false,
                otrosAtbTexto: ''
            },
            biologicosPrevios: {
                adalimumab: false,
                adalimumabDuracion: '',
                adalimumabMotivo: '',
                otrosBiologicos: false,
                otrosBiologicosFarmaco: '',
                otrosBiologicosMotivo: ''
            },
            analiticaEstruct: {
                fecha: '2026-06-01',
                reciente: 'si',
                hemograma: true,
                bioquimica: true,
                mantoux: 'Pendiente',
                serologias: 'Pendiente',
                serologiasVhb: 'Negativo',
                serologiasVhc: 'Negativo',
                serologiasVih: 'Negativo',
                vacunacion: 'pendiente',
                observaciones: ''
            },
            comorbilidades: {
                imc: '28.5',
                tabaquismo: 'Activo',
                paquetesAno: '15',
                diabetes: 'no',
                hba1c: '',
                sindromeMetabolico: 'no',
                otras: ''
            },
            motivoClinico: 'HS Hurley III refractaria a múltiples líneas de antibióticos. Candidata a adalimumab.',
            principioActivo: 'Adalimumab'
        },
        'CIP-DEMO-FH-003': {
            nombre: 'Paciente Demo FH-003', cip: 'CIP-DEMO-FH-003', edad: '52', sexo: 'Mujer', servicio: 'Reumatología', servicioSlug: 'reumatologia',
            patologia: 'Artritis Reumatoide (AR)', farmaco: 'Adalimumab 40 mg', dosis: '40 mg', pauta: 'SC / cada 2 semanas', via: 'SC',
            estado: 'validated', estadoLabel: 'Validado', fechaSolicitud: '2026-03-15', ultimaSolicitud: '2026-03-15',
            analitica: 'Prebiológico demo apto. Vacunación VHB y antineumocócica completa.', scores: 'DAS28 demo: 3.2; HAQ demo: 1.1',
            ultimaVisita: '—', adherencia: 'Sin registro (primera visita pendiente)', efectosAdversos: 'No registrados', proms: 'HAQ 1.1 (basal); EVA dolor 4/10', primeraVisita: 'Pendiente', seguimiento: 'No iniciado'
        },
        'CIP-DEMO-FH-004': {
            nombre: 'Paciente Demo FH-004', cip: 'CIP-DEMO-FH-004', edad: '44', sexo: 'Mujer', servicio: 'Reumatología', servicioSlug: 'reumatologia',
            patologia: 'LES / Síndrome de Sjögren', farmaco: 'Belimumab + Rituximab (demo multibiológico)', dosis: 'Belimumab 200 mg SC semanal + Rituximab 1 g IV semestral', pauta: 'L2 semanal + L3 semestral', via: 'SC / IV',
            estado: 'followup', estadoLabel: 'En seguimiento', fechaSolicitud: '2026-02-14', ultimaSolicitud: '2026-05-28',
            analitica: 'Seguimiento analítico activo. Caso sintético multibiológico para validación exploratoria.', scores: 'SLEDAI demo: 12 → 6; EVA dolor 6 → 3',
            ultimaVisita: '2026-06-09', adherencia: 'Alta (Morisky-Green: 4/4)', efectosAdversos: 'Infección respiratoria leve-moderada en evaluación causal', proms: 'HAQ 0.9; EVA dolor 3/10', primeraVisita: '2026-02-20', seguimiento: 'Seguimiento multibiológico abierto',
            principioActivo: 'Belimumab + Rituximab',
            biologicos: [
                {
                    linea_id: 'BIO-FH-004-L1',
                    orden: 1,
                    nombre_linea: 'Abatacept',
                    nombre_comercial: 'Orencia',
                    principio_activo: 'Abatacept',
                    dosis: '125 mg',
                    via: 'SC',
                    pauta: 'Semanal',
                    fecha_inicio: '2025-09-01',
                    fecha_fin: '2026-02-10',
                    estado_linea: 'historico',
                    tipo_relacion: 'cambio_terapeutico',
                    es_principal: false,
                    tratamiento_id_principal: 'TRAT-FH-004-A'
                },
                {
                    linea_id: 'BIO-FH-004-L2',
                    orden: 2,
                    nombre_linea: 'Belimumab',
                    nombre_comercial: 'Benlysta',
                    principio_activo: 'Belimumab',
                    dosis: '200 mg',
                    via: 'SC',
                    pauta: 'Semanal',
                    fecha_inicio: '2026-02-20',
                    fecha_fin: '',
                    estado_linea: 'activo',
                    tipo_relacion: 'base',
                    es_principal: true,
                    tratamiento_id_principal: 'TRAT-FH-004-B'
                },
                {
                    linea_id: 'BIO-FH-004-L3',
                    orden: 3,
                    nombre_linea: 'Rituximab',
                    nombre_comercial: 'Rixathon',
                    principio_activo: 'Rituximab',
                    dosis: '1 g',
                    via: 'IV',
                    pauta: 'Dias 1 y 15 cada 6 meses',
                    fecha_inicio: '2026-05-28',
                    fecha_fin: '',
                    estado_linea: 'añadido',
                    tipo_relacion: 'tratamiento_añadido',
                    es_principal: false,
                    tratamiento_id_principal: 'TRAT-FH-004-C'
                }
            ]
        }
    };

    const profesionales = [
        { id: 'PRO-FH-01', nombre: 'Profesional FH-01', rol: 'Farmacéutico/a Hospitalario/a', especialidad: 'Dermatología; Reumatología', estado: 'Activo' },
        { id: 'PRO-FH-02', nombre: 'Profesional FH-02', rol: 'Farmacéutico/a Hospitalario/a', especialidad: 'Digestivo; Oncología', estado: 'Activo' },
        { id: 'PRO-FH-03', nombre: 'Profesional FH-03', rol: 'Residente Farmacia', especialidad: 'Rotación Farmacia Hospitalaria', estado: 'Activo' },
        { id: 'PRO-FH-04', nombre: 'Profesional FH-04', rol: 'Farmacéutico/a Hospitalario/a', especialidad: 'Hematología; soporte demo', estado: 'Activo' }
    ];

    const patologiaPorServicio = {
        dermatologia: ['Hidradenitis supurativa', 'Psoriasis', 'Dermatitis atópica', 'Vitíligo', 'Alopecia areata'],
        reumatologia: ['Artritis Reumatoide (AR)', 'Espondiloartritis (EspA)', 'Artritis Psoriásica (APs)', 'LES', 'Síndrome de Sjögren'],
        digestivo: ['Enfermedad de Crohn', 'Colitis ulcerosa', 'Otro'],
        oncologia: ['Indicación oncológica demo', 'Otro'],
        otro: ['Especificar en observaciones']
    };


    const IMPORT_STORAGE_KEYS = {
        enfermeria: 'farmaciaDemo.enfermeriaImport',
        farmacia: 'farmaciaDemo.farmaciaImport'
    };

    const IMPORT_FIELD_ALIASES = {
        cip: ['cip', 'codigo paciente', 'codigo_paciente', 'id paciente', 'id_paciente', 'paciente id', 'patient id', 'patient_id'],
        nombre: ['nombre', 'nombre paciente', 'paciente', 'patient', 'apellidos y nombre'],
        servicio: ['servicio', 'unidad', 'especialidad', 'servicio origen', 'origen'],
        patologia: ['patologia', 'patología', 'diagnostico', 'diagnóstico', 'indicacion', 'indicación', 'proceso'],
        farmaco: ['farmaco', 'fármaco', 'medicamento', 'tratamiento', 'biologico', 'biológico', 'nombre comercial'],
        principioActivo: ['principio activo', 'principio_activo', 'molecula', 'molécula', 'pa'],
        dosis: ['dosis', 'dose'],
        via: ['via', 'vía', 'route'],
        pauta: ['pauta', 'intervalo', 'frecuencia', 'posologia', 'posología'],
        fecha: ['fecha', 'fecha visita', 'fecha_visita', 'fecha solicitud', 'fecha_solicitud', 'fecha seguimiento', 'fecha_seguimiento'],
        analiticaTexto: ['analitica', 'analítica', 'analiticaGlobal', 'analitica_global'],
        analiticaReciente: ['analiticaReciente', 'analitica_reciente', 'analítica reciente', 'analitica reciente'],
        fechaAnalitica: ['fechaAnalitica', 'fecha_analitica', 'analiticaFecha', 'analitica_fecha'],
        observacionesAnalitica: ['observacionesAnalitica', 'observaciones_analitica', 'observaciones analitica', 'observaciones analítica'],
        hemograma: ['hemograma', 'hemogramaSolicitado', 'hemograma_solicitado', 'hemogramaRecibido', 'hemograma_recibido', 'hemogramaCorrecto', 'hemograma_correcto', 'hemogramaOK', 'hemograma_ok', 'hemogramaFechaSolicitud', 'hemograma_fecha_solicitud', 'hemogramaFechaRecepcion', 'hemograma_fecha_recepcion', 'hemogramaObservaciones', 'hemograma_observaciones'],
        bioquimica: ['bioquimica', 'bioquímica', 'bioquimicaSolicitada', 'bioquimica_solicitada', 'bioquimicaRecibida', 'bioquimica_recibida', 'bioquimicaCorrecta', 'bioquimica_correcta', 'bioquimicaOK', 'bioquimica_ok', 'bioquimicaFechaSolicitud', 'bioquimica_fecha_solicitud', 'bioquimicaFechaRecepcion', 'bioquimica_fecha_recepcion', 'bioquimicaObservaciones', 'bioquimica_observaciones'],
        serologias: ['serologias', 'serologías', 'serologiasSolicitadas', 'serologias_solicitadas', 'serologiasRecibidas', 'serologias_recibidas', 'serologiasCorrectas', 'serologias_correctas', 'serologiasOK', 'serologias_ok', 'serologiasFechaSolicitud', 'serologias_fecha_solicitud', 'serologiasFechaRecepcion', 'serologias_fecha_recepcion', 'serologiasObservaciones', 'serologias_observaciones'],
        serologiaVhb: ['serologiaVHB', 'serologia_vhb', 'serologiasVhb', 'vhb', 'hepatitisB', 'hepatitis_b'],
        serologiaVhc: ['serologiaVHC', 'serologia_vhc', 'serologiasVhc', 'vhc', 'hepatitisC', 'hepatitis_c'],
        serologiaVih: ['serologiaVIH', 'serologia_vih', 'serologiasVih', 'vih', 'hiv'],
        mantoux: ['mantoux', 'mantouxSolicitado', 'mantoux_solicitado', 'mantouxRecibido', 'mantoux_recibido', 'mantouxResultado', 'mantoux_resultado', 'igra', 'IGRA', 'quantiferon', 'quantiFERON', 'quantiferonResultado', 'quantiferon_resultado', 'tuberculosis', 'cribadoTuberculosis', 'cribado_tuberculosis'],
        vacunacion: ['vacunacion', 'vacunación', 'vacunacionRevisada', 'vacunacion_revisada', 'vacunacionOK', 'vacunacion_ok', 'vacunasPendientes', 'vacunas_pendientes', 'vacunacionObservaciones', 'vacunacion_observaciones', 'cartillaVacunal', 'cartilla_vacunal', 'estadoVacunal', 'estado_vacunal'],
        medicinaPreventiva: ['medicinaPreventiva', 'medicina_preventiva', 'preventiva', 'medicinaPreventivaEstado', 'medicina_preventiva_estado', 'preventivaEstado', 'preventiva_estado', 'derivadoPreventiva', 'derivado_preventiva', 'interconsultaPreventiva', 'interconsulta_preventiva'],
        // FH Excel operativo (WO8) — columnas de acto farmacéutico
        tipoActoFH: ['tipo_acto_fh', 'tipo acto fh', 'tipoActoFh', 'tipo acto'],
        resultadoValidacion: ['resultado_validacion', 'resultado validacion', 'resultadoValidacion'],
        estadoRegistro: ['estado_registro', 'estado registro', 'estadoRegistro'],
        estadoLinea: ['estado_linea', 'estado linea', 'estadoLinea'],
        tipoRelacion: ['tipo_relacion', 'tipo relacion', 'tipoRelacion'],
        marcaComercial: ['marca_comercial', 'marca comercial', 'marcaComercial', 'nombre comercial', 'nombre_comercial'],
    };

    function safeGetLocalStorage(key) {
        try { return window.localStorage.getItem(key); } catch (err) { return null; }
    }

    function safeSetLocalStorage(key, value) {
        try { window.localStorage.setItem(key, value); return true; } catch (err) { return false; }
    }

    function safeGetSessionStorage(key) {
        try { return window.sessionStorage.getItem(key); } catch (err) { return null; }
    }

    function safeSetSessionStorage(key, value) {
        try { window.sessionStorage.setItem(key, value); return true; } catch (err) { return false; }
    }

    function safeRemoveSessionStorage(key) {
        try { window.sessionStorage.removeItem(key); return true; } catch (err) { return false; }
    }

    var SESSION_STORAGE_FALLBACK = {};

    function safeParseJson(raw) {
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (err) { return null; }
    }

    function normalizeHeaderToken(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    function slugifyService(value) {
        var token = normalizeHeaderToken(value);
        if (!token) return '';
        if (token.indexOf('dermat') !== -1) return 'dermatologia';
        if (token.indexOf('reumat') !== -1) return 'reumatologia';
        if (token.indexOf('digest') !== -1) return 'digestivo';
        if (token.indexOf('onco') !== -1 || token.indexOf('hemato') !== -1) return 'oncologia';
        return token.replace(/\s+/g, '_');
    }

    function inferFieldMapping(headers) {
        var mapping = {};
        var matchedHeaders = {};
        var headerList = Array.isArray(headers) ? headers.slice() : [];

        Object.keys(IMPORT_FIELD_ALIASES).forEach(function (field) {
            var aliases = IMPORT_FIELD_ALIASES[field];
            var matchedHeader = '';
            for (var i = 0; i < headerList.length; i++) {
                var header = headerList[i];
                var normalized = normalizeHeaderToken(header);
                for (var j = 0; j < aliases.length; j++) {
                    var alias = normalizeHeaderToken(aliases[j]);
                    if (normalized === alias || normalized.indexOf(alias) !== -1 || alias.indexOf(normalized) !== -1) {
                        matchedHeader = header;
                        break;
                    }
                }
                if (matchedHeader) break;
            }
            mapping[field] = matchedHeader;
            if (matchedHeader) matchedHeaders[matchedHeader] = true;
        });

        return {
            mapping: mapping,
            unrecognizedHeaders: headerList.filter(function (header) { return !matchedHeaders[header]; })
        };
    }

    function getFirstValue(row, aliases) {
        if (!row || !Array.isArray(aliases)) return undefined;
        for (var i = 0; i < aliases.length; i++) {
            var alias = aliases[i];
            // Try exact key match first
            if (row.hasOwnProperty(alias) && row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== "") {
                return row[alias];
            }
        }
        // Fallback: normalized match
        var normalizedRow = {};
        Object.keys(row).forEach(function(key) {
            normalizedRow[normalizeHeaderToken(key)] = row[key];
        });
        for (var j = 0; j < aliases.length; j++) {
            var normAlias = normalizeHeaderToken(aliases[j]);
            if (normalizedRow.hasOwnProperty(normAlias) && normalizedRow[normAlias] !== undefined && normalizedRow[normAlias] !== null && String(normalizedRow[normAlias]).trim() !== "") {
                return normalizedRow[normAlias];
            }
        }
        return undefined;
    }

    function normalizeBooleanLike(value) {
        if (value === true) return "ok";
        if (value === false) return "pendiente";
        if (value === undefined || value === null) return "no_informado";
        var s = String(value).trim();
        if (s === "" || s === "—") return "no_informado";
        var n = s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
        if (/^(si|sí|ok|correcto|correcta|completo|completa|completado|completada|revisado|revisada|negativo|negativa|negativos|negativas)$/.test(n)) return "ok";
        if (/^(pendiente|solicitado|solicitada|en curso|por revisar|falta)$/.test(n)) return "pendiente";
        if (/^(positivo|positiva|alterado|alterada|reactivo|reactiva|contraindicado|contraindicada|alerta)$/.test(n)) return "alerta";
        if (/^(no aplica|n\/a|na|no procede|no aplicable)$/.test(n)) return "no_aplica";
        // Texto libre no claro: conservar como texto
        return s;
    }

    function normalizePautaString(pautaString) {
        var catalog = (typeof window !== 'undefined' && window.FarmaciaPautasCatalog) ? window.FarmaciaPautasCatalog : null;
        if (catalog && typeof catalog.normalizePautaLabel === 'function') {
            return catalog.normalizePautaLabel(String(pautaString || ''));
        }
        return null;
    }

    function buildAnaliticaEstructFromImport(row, mapping) {
        if (!row || !mapping) return null;
        var hasAny = false;
        var result = {};

        // Fecha analítica — solo de grupo fechaAnalitica
        var fechaVal = getFirstValue(row, mapping.fechaAnalitica ? IMPORT_FIELD_ALIASES.fechaAnalitica : []);
        if (fechaVal !== undefined) { result.fecha = String(fechaVal).trim(); hasAny = true; }

        // Reciente — solo de grupo analiticaReciente
        var recienteVal = getFirstValue(row, mapping.analiticaReciente ? IMPORT_FIELD_ALIASES.analiticaReciente : []);
        if (recienteVal !== undefined) { result.reciente = normalizeBooleanLike(recienteVal); hasAny = true; }

        // Observaciones — solo de grupo observacionesAnalitica
        var obsVal = getFirstValue(row, mapping.observacionesAnalitica ? IMPORT_FIELD_ALIASES.observacionesAnalitica : []);
        if (obsVal !== undefined && typeof obsVal === "string" && obsVal.trim().length > 0) {
            var trimmed = obsVal.trim();
            if (trimmed.length > 5) {
                result.observaciones = trimmed;
                hasAny = true;
            }
        }

        // Hemograma
        var hemogramaVal = getFirstValue(row, mapping.hemograma ? IMPORT_FIELD_ALIASES.hemograma : []);
        if (hemogramaVal !== undefined) { result.hemograma = normalizeBooleanLike(hemogramaVal); hasAny = true; }

        // Bioquímica
        var bioquimicaVal = getFirstValue(row, mapping.bioquimica ? IMPORT_FIELD_ALIASES.bioquimica : []);
        if (bioquimicaVal !== undefined) { result.bioquimica = normalizeBooleanLike(bioquimicaVal); hasAny = true; }

        // Serologías individuales
        var vhbVal = getFirstValue(row, mapping.serologiaVhb ? IMPORT_FIELD_ALIASES.serologiaVhb : []);
        if (vhbVal !== undefined) { result.serologiasVhb = normalizeBooleanLike(vhbVal); hasAny = true; }

        var vhcVal = getFirstValue(row, mapping.serologiaVhc ? IMPORT_FIELD_ALIASES.serologiaVhc : []);
        if (vhcVal !== undefined) { result.serologiasVhc = normalizeBooleanLike(vhcVal); hasAny = true; }

        var vihVal = getFirstValue(row, mapping.serologiaVih ? IMPORT_FIELD_ALIASES.serologiaVih : []);
        if (vihVal !== undefined) { result.serologiasVih = normalizeBooleanLike(vihVal); hasAny = true; }

        // Serologías global (solo si no hay individuales)
        if (vhbVal === undefined && vhcVal === undefined && vihVal === undefined) {
            var seroGlobal = getFirstValue(row, mapping.serologias ? IMPORT_FIELD_ALIASES.serologias : []);
            if (seroGlobal !== undefined) { result.serologias = normalizeBooleanLike(seroGlobal); hasAny = true; }
        }

        // Mantoux / IGRA
        var mantouxVal = getFirstValue(row, mapping.mantoux ? IMPORT_FIELD_ALIASES.mantoux : []);
        if (mantouxVal !== undefined) { result.mantoux = normalizeBooleanLike(mantouxVal); hasAny = true; }

        // Vacunación
        var vacunacionVal = getFirstValue(row, mapping.vacunacion ? IMPORT_FIELD_ALIASES.vacunacion : []);
        if (vacunacionVal !== undefined) { result.vacunacion = normalizeBooleanLike(vacunacionVal); hasAny = true; }

        if (!hasAny) return null;

        // reciente: solo si hay columna explícita (analiticaReciente, analitica_reciente, etc.)
        // No inferir desde hemograma+bioquimica — recencia requiere fecha o campo explícito.

        return result;
    }

    /* ── Helpers de clasificación de importación WO8.1c.2 ─────────────────── */

    /**
     * Determina si un paciente/registro importado representa un acto farmacéutico
     * ya registrado/completado por Farmacia (no una solicitud pendiente).
     */
    function isPharmacyAct(patient) {
        if (!patient) return false;
        var source = String(patient.importSource || '').toLowerCase();
        return source.indexOf('farmacia') !== -1;
    }

    /**
     * Determina si un registro importado es una solicitud de validación genuina
     * (Enfermería / solicitud clínica explícita).
     */
    function isValidationRequest(patient) {
        if (!patient) return false;
        var source = String(patient.importSource || '').toLowerCase();
        if (source.indexOf('enfermer') !== -1) return true;
        // Explícitamente marcado como solicitud
        if (patient.estado_solicitud_validacion === 'pendiente') return true;
        if (patient.origen_solicitud === 'enfermeria') return true;
        return false;
    }

    /**
     * Decide si un registro debe aparecer en la bandeja de pendientes de validación.
     * - Actos farmacéuticos de Farmacia NO aparecen por defecto.
     * - Solicitudes de Enfermería SÍ aparecen.
     * - Excepción: fila de Farmacia marcada explícitamente como pendiente.
     */
    function shouldAppearInValidationInbox(patient) {
        if (!patient) return false;

        // Si es solicitud de Enfermería → evaluar por estado prebiológico
        if (isValidationRequest(patient)) {
            // Solo aplicar filtro de estado si es específicamente de Enfermería
            var source = String(patient.importSource || '').toLowerCase();
            if (source.indexOf('enfermer') !== -1) {
                return shouldEnfermeriaRowAppearInValidationInbox(patient);
            }
            // Solicitud clínica explícita (no de Enfermería) → sí aparece
            if (patient.estado_solicitud_validacion === 'pendiente') return true;
            if (patient.origen_solicitud === 'enfermeria') return shouldEnfermeriaRowAppearInValidationInbox(patient);
            if (patient.tipo_origen === 'enfermeria_inicio_biologico') return shouldEnfermeriaRowAppearInValidationInbox(patient);
            return true; // legacy: otras solicitudes aparecen como pendientes
        }

        // Si es acto de Farmacia → solo si está explícitamente pendiente
        if (isPharmacyAct(patient)) {
            var valResult = String(patient.resultado_validacion || '').trim().toLowerCase();
            var estReg = String(patient.estado_registro || '').trim().toLowerCase();
            if (valResult === 'pendiente' && estReg === 'pendiente_revision') return true;
            return false;
        }

        // Fallback: comportamiento legacy para otros orígenes
        if (patient.estado === 'pending') return true;
        return false;
    }

    /* ── Helpers Enfermería / Inicio Biológico WO8.1c.3 ─────────────── */

    /**
     * Determina si un registro de Enfermería debe aparecer en la bandeja
     * de validación farmacoterapéutica según su estado prebiológico.
     * Solo Estado = OK FARMACIA genera pendiente de validación.
     */
    function shouldEnfermeriaRowAppearInValidationInbox(row) {
        if (!row) return false;
        var estado = String(row.estado_prebiologico_enfermeria || row.estado || '').trim().toUpperCase();
        // Solo OK FARMACIA → pendiente de validación farmacoterapéutica
        return estado === 'OK FARMACIA' || estado === 'OK_FARMACIA';
    }

    /**
     * Determina si un workbook tiene estructura de Enfermería / Inicio Biológico.
     */
    function isEnfermeriaInicioBiologicoWorkbook(workbook) {
        if (!workbook || !workbook.SheetNames) return false;
        for (var i = 0; i < workbook.SheetNames.length; i++) {
            var name = String(workbook.SheetNames[i] || '').trim().toUpperCase();
            if (name === 'INICIO_BIOLOGICO') return true;
        }
        return false;
    }

    /**
     * Encuentra la fila de cabecera real en la hoja INICIO_BIOLOGICO,
     * buscando la primera fila que contenga "CIP".
     */
    function findEnfermeriaHeaderRow(rows) {
        if (!Array.isArray(rows)) return -1;
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            if (!Array.isArray(row)) continue;
            for (var j = 0; j < row.length; j++) {
                var cell = String(row[j] || '').trim().toUpperCase();
                if (cell === 'CIP') return i;
            }
        }
        return -1;
    }

    /**
     * Convierte una fila de la hoja INICIO_BIOLOGICO (formato array)
     * en un objeto con campos mapeados según la cabecera.
     */
    function normalizeEnfermeriaInicioBiologicoRow(cells, headerMap) {
        if (!Array.isArray(cells) || !headerMap) return null;
        var cip = String(cells[headerMap.cip] || '').trim();
        if (!cip) return null;

        return {
            cip_demo_o_hash: cip,
            paciente_nombre: headerMap.paciente !== undefined ? String(cells[headerMap.paciente] || '').trim() : '',
            servicio_origen: headerMap.servicio !== undefined ? String(cells[headerMap.servicio] || '').trim() : '',
            patologia_indicacion: headerMap.patologia !== undefined ? String(cells[headerMap.patologia] || '').trim() : '',
            farmaco_solicitado: headerMap.farmaco !== undefined ? String(cells[headerMap.farmaco] || '').trim() : '',
            analitica_estado: headerMap.analitica !== undefined ? String(cells[headerMap.analitica] || '').trim() : '',
            mantoux_estado: headerMap.mantoux !== undefined ? String(cells[headerMap.mantoux] || '').trim() : '',
            igra_estado: headerMap.igra !== undefined ? String(cells[headerMap.igra] || '').trim() : '',
            vhb_estado: headerMap.vhb !== undefined ? String(cells[headerMap.vhb] || '').trim() : '',
            vhc_estado: headerMap.vhc !== undefined ? String(cells[headerMap.vhc] || '').trim() : '',
            vih_estado: headerMap.vih !== undefined ? String(cells[headerMap.vih] || '').trim() : '',
            medicina_preventiva_estado: headerMap.medPreventiva !== undefined ? String(cells[headerMap.medPreventiva] || '').trim() : '',
            estado_prebiologico_enfermeria: headerMap.estado !== undefined ? String(cells[headerMap.estado] || '').trim() : '',
            fecha_ok_farmacia: headerMap.fechaOk !== undefined ? String(cells[headerMap.fechaOk] || '').trim() : '',
            observaciones_prebiologico: headerMap.observacion !== undefined ? String(cells[headerMap.observacion] || '').trim() : '',
            estado: headerMap.estado !== undefined ? String(cells[headerMap.estado] || '').trim() : 'EN VIGILANCIA',
            source_type: 'ENFERMERIA',
            origen_solicitud: 'enfermeria',
            tipo_origen: 'enfermeria_inicio_biologico'
        };
    }

    /**
     * Construye un header map (índice de columna por nombre) desde la fila de cabecera.
     */
    function buildEnfermeriaHeaderMap(headerRow) {
        if (!Array.isArray(headerRow)) return null;
        var map = {};
        for (var i = 0; i < headerRow.length; i++) {
            var h = String(headerRow[i] || '').trim().toUpperCase();
            if (h === 'CIP') map.cip = i;
            else if (h === 'PACIENTE') map.paciente = i;
            else if (h === 'SERVICIO') map.servicio = i;
            else if (h === 'PATOLOGÍA' || h === 'PATOLOGIA') map.patologia = i;
            else if (h === 'FÁRMACO' || h === 'FARMACO') map.farmaco = i;
            else if (h === 'ANALÍTICA' || h === 'ANALITICA') map.analitica = i;
            else if (h === 'MANTOUX') map.mantoux = i;
            else if (h === 'IGRA') map.igra = i;
            else if (h === 'VHB') map.vhb = i;
            else if (h === 'VHC') map.vhc = i;
            else if (h === 'VIH') map.vih = i;
            else if (h === 'MED. PREVENTIVA' || h === 'MEDICINA PREVENTIVA' || h === 'MED_PREVENTIVA') map.medPreventiva = i;
            else if (h === 'ESTADO') map.estado = i;
            else if (h === 'FECHA OK') map.fechaOk = i;
            else if (h === 'OBSERVACIÓN PREBIOLÓGICO' || h === 'OBSERVACION PREBIOLOGICO' || h.indexOf('OBSERV') !== -1) map.observacion = i;
        }
        // CIP is mandatory
        if (map.cip === undefined) return null;
        return map;
    }

    /**
     * Parsea todas las filas de la hoja INICIO_BIOLOGICO.
     * Ignora filas antes de la cabecera, filas vacías y hojas no clínicas.
     */
    function parseEnfermeriaInicioBiologicoSheet(rows, sheetName) {
        var sheetNameUpper = String(sheetName || '').trim().toUpperCase();
        // Solo procesar INICIO_BIOLOGICO
        if (sheetNameUpper !== 'INICIO_BIOLOGICO') return [];

        var headerIdx = findEnfermeriaHeaderRow(rows);
        if (headerIdx < 0) return [];

        var headerRow = rows[headerIdx];
        var headerMap = buildEnfermeriaHeaderMap(headerRow);
        if (!headerMap) return [];

        var result = [];
        for (var i = headerIdx + 1; i < rows.length; i++) {
            var cells = rows[i];
            if (!Array.isArray(cells)) continue;
            // Skip empty rows
            var hasData = false;
            for (var j = 0; j < cells.length; j++) {
                if (String(cells[j] || '').trim()) { hasData = true; break; }
            }
            if (!hasData) continue;

            var normalized = normalizeEnfermeriaInicioBiologicoRow(cells, headerMap);
            if (normalized) result.push(normalized);
        }
        return result;
    }

    function buildImportedPatientCandidate(row, mapping, sourceLabel, rowIndex) {
        if (!row || !mapping || !mapping.cip) return null;
        var cip = String(row[mapping.cip] || '').trim();
        if (!cip) return null;
        var servicioRaw = mapping.servicio ? String(row[mapping.servicio] || '').trim() : '';
        var servicioSlug = slugifyService(servicioRaw);
        var candidate = {
            nombre: mapping.nombre ? String(row[mapping.nombre] || '').trim() || ('Paciente importado ' + cip) : ('Paciente importado ' + cip),
            cip: cip,
            edad: '',
            sexo: '',
            servicio: servicioRaw || sourceLabel,
            servicioSlug: servicioSlug,
            patologia: mapping.patologia ? String(row[mapping.patologia] || '').trim() : '',
            farmaco: mapping.farmaco ? String(row[mapping.farmaco] || '').trim() : '',
            dosis: mapping.dosis ? String(row[mapping.dosis] || '').trim() : '',
            pauta: mapping.pauta ? String(row[mapping.pauta] || '').trim() : '',
            via: mapping.via ? String(row[mapping.via] || '').trim() : '',
            estado: 'pending',
            estadoLabel: 'Pendiente',
            fechaSolicitud: mapping.fecha ? String(row[mapping.fecha] || '').trim() : '',
            ultimaSolicitud: mapping.fecha ? String(row[mapping.fecha] || '').trim() : '',
            analitica: 'Datos importados desde Excel ' + sourceLabel + '. Pendiente de mapeo clínico detallado.',
            scores: 'Pendiente de mapeo desde Excel importado.',
            ultimaVisita: '—',
            adherencia: 'Sin registro',
            efectosAdversos: 'Sin registro',
            proms: 'Sin registro',
            primeraVisita: '',
            seguimiento: 'Pendiente de revisión',
            motivoClinico: mapping.patologia ? String(row[mapping.patologia] || '').trim() : '',
            principioActivo: mapping.principioActivo ? String(row[mapping.principioActivo] || '').trim() : '',
            importSource: sourceLabel === 'Enfermería' ? 'Excel Enfermería' : (sourceLabel === 'Farmacia' ? 'Excel Farmacia' : sourceLabel),
            importRowIndex: rowIndex
        };

        // Determinar estado del registro según origen y campos FH
        var sourceStr = String(sourceLabel || '').toLowerCase();
        var esFarmacia = sourceStr === 'farmacia';
        var esEnfermeria = sourceStr === 'enfermería' || sourceStr === 'enfermeria';
        var tipoActo = mapping.tipoActoFH ? String(row[mapping.tipoActoFH] || '').trim().toLowerCase() : '';
        var valResultado = mapping.resultadoValidacion ? String(row[mapping.resultadoValidacion] || '').trim().toLowerCase() : '';
        var estReg = mapping.estadoRegistro ? String(row[mapping.estadoRegistro] || '').trim().toLowerCase() : '';
        var estLinea = mapping.estadoLinea ? String(row[mapping.estadoLinea] || '').trim().toLowerCase() : '';
        var tipoRel = mapping.tipoRelacion ? String(row[mapping.tipoRelacion] || '').trim().toLowerCase() : '';

        if (esFarmacia) {
            // Acto farmacéutico de Farmacia: NO es pendiente por defecto
            // Solo marcar como pendiente si explícitamente indicado
            if (valResultado === 'pendiente' && estReg === 'pendiente_revision') {
                candidate.estado = 'pending';
                candidate.estadoLabel = 'Pendiente de revisión';
            } else {
                candidate.estado = 'completado';
                candidate.estadoLabel = 'Acto Farmacia';
                // Añadir matiz según tipo_acto_fh
                if (tipoActo === 'validacion_inicial') {
                    candidate.estadoLabel = 'Validación registrada';
                } else if (tipoActo === 'primera_visita') {
                    candidate.estadoLabel = 'Primera visita';
                } else if (tipoActo === 'seguimiento') {
                    candidate.estadoLabel = 'Seguimiento';
                } else if (tipoActo === 'suspension') {
                    candidate.estadoLabel = 'Suspensión';
                } else if (tipoActo === 'nueva_validacion_cambio' || tipoActo === 'nueva_validacion_adicion') {
                    candidate.estadoLabel = 'Nueva validación tramitada';
                }
            }
            // Marcar tipo_acto_fh en el paciente si fue reconocido
            if (tipoActo) candidate.tipo_acto_fh = tipoActo;
            if (valResultado) candidate.resultado_validacion = valResultado;
            if (estReg) candidate.estado_registro = estReg;
            if (estLinea) candidate.estado_linea = estLinea;
            if (tipoRel) candidate.tipo_relacion = tipoRel;
            // Históricos/concomitantes nunca son pendientes
            if (estLinea === 'historico' || estLinea === 'suspendido' || estLinea === 'finalizado') {
                candidate.estado = 'completado';
                candidate.estadoLabel = 'Histórico';
            }
            if (tipoRel === 'concomitante') {
                candidate.estado = 'completado';
                candidate.estadoLabel = 'Concomitante';
            }
        } else if (esEnfermeria) {
            // Enfermería: conservar estado prebiológico del adaptador
            // El adaptador ya estableció estado (OK FARMACIA, EN VIGILANCIA, BLOQUEADO)
            var estadoEnfermeria = String(row.estado || '').trim().toUpperCase();
            var estadoLabelEnfermeria = estadoEnfermeria;
            if (estadoEnfermeria === 'OK FARMACIA' || estadoEnfermeria === 'OK_FARMACIA') {
                candidate.estado = 'ok_farmacia';
                candidate.estadoLabel = 'OK Farmacia';
            } else if (estadoEnfermeria === 'EN VIGILANCIA' || estadoEnfermeria === 'EN_VIGILANCIA') {
                candidate.estado = 'en_vigilancia';
                candidate.estadoLabel = 'En vigilancia';
            } else if (estadoEnfermeria === 'BLOQUEADO') {
                candidate.estado = 'bloqueado';
                candidate.estadoLabel = 'Bloqueado';
            } else {
                candidate.estado = 'pending';
                candidate.estadoLabel = 'Pendiente';
            }
            // Preservar campos enriquecidos del adaptador
            candidate.source_type = 'ENFERMERIA';
            candidate.origen_solicitud = 'enfermeria';
            candidate.tipo_origen = 'enfermeria_inicio_biologico';
            // Mapear campos prebiológicos si el adaptador los cargó
            if (row.analitica_estado) candidate.analitica_estado = row.analitica_estado;
            if (row.mantoux_estado) candidate.mantoux_estado = row.mantoux_estado;
            if (row.igra_estado) candidate.igra_estado = row.igra_estado;
            if (row.vhb_estado) candidate.vhb_estado = row.vhb_estado;
            if (row.vhc_estado) candidate.vhc_estado = row.vhc_estado;
            if (row.vih_estado) candidate.vih_estado = row.vih_estado;
            if (row.medicina_preventiva_estado) candidate.medicina_preventiva_estado = row.medicina_preventiva_estado;
            if (row.estado_prebiologico_enfermeria) candidate.estado_prebiologico_enfermeria = row.estado_prebiologico_enfermeria;
            if (row.fecha_ok_farmacia) candidate.fecha_ok_farmacia = row.fecha_ok_farmacia;
            if (row.observaciones_prebiologico) candidate.observaciones_prebiologico = row.observaciones_prebiologico;
        } else {
            // Enfermería u otro origen: comportamiento legacy (pending por defecto)
            candidate.estado = 'pending';
            candidate.estadoLabel = 'Pendiente';
        }

        // Conservar marca_comercial y principio_activo reconocidos
        if (mapping.marcaComercial) {
            candidate.marca_comercial = String(row[mapping.marcaComercial] || '').trim();
        }
        if (mapping.principioActivo) {
            candidate.principio_activo_import = String(row[mapping.principioActivo] || '').trim();
        }

        // Normalizar pauta importada manteniendo compatibilidad legacy
        var rawPauta = candidate.pauta;
        var pautaEstruct = normalizePautaString(rawPauta);
        if (pautaEstruct) {
            if (pautaEstruct.pauta_codigo === 'OTRO' && pautaEstruct.pauta_otro_texto) {
                candidate.pauta = pautaEstruct.pauta_otro_texto;
            } else {
                candidate.pauta = pautaEstruct.pauta_label || rawPauta;
            }
            candidate.pauta_estructurada = pautaEstruct;
            candidate.pauta_codigo = pautaEstruct.pauta_codigo;
            candidate.pauta_label = pautaEstruct.pauta_label;
            candidate.pauta_intervalo_dias = pautaEstruct.pauta_intervalo_dias;
            candidate.pauta_unidad = pautaEstruct.pauta_unidad;
            candidate.pauta_otro_texto = pautaEstruct.pauta_otro_texto;
        }

        // Enriquecer con datos prebiológicos estructurados
        var analiticaEstruct = buildAnaliticaEstructFromImport(row, mapping);
        if (analiticaEstruct) {
            candidate.analiticaEstruct = analiticaEstruct;
        }

        // Vacunación estructurada (si hay datos específicos)
        if (mapping.vacunacion) {
            var vacRev = getFirstValue(row, ["vacunacionRevisada", "vacunacion_revisada"]);
            var vacOK = getFirstValue(row, ["vacunacionOK", "vacunacion_ok"]);
            var vacPend = getFirstValue(row, ["vacunasPendientes", "vacunas_pendientes"]);
            var vacObs = getFirstValue(row, ["vacunacionObservaciones", "vacunacion_observaciones"]);
            if (vacRev !== undefined || vacOK !== undefined || vacPend !== undefined || vacObs !== undefined) {
                candidate.vacunacion = {};
                if (vacRev !== undefined) candidate.vacunacion.revisada = normalizeBooleanLike(vacRev);
                if (vacOK !== undefined) candidate.vacunacion.ok = normalizeBooleanLike(vacOK);
                if (vacPend !== undefined) candidate.vacunacion.pendientes = String(vacPend).trim();
                if (vacObs !== undefined) candidate.vacunacion.observaciones = String(vacObs).trim();
            }
        }

        // Medicina preventiva
        if (mapping.medicinaPreventiva) {
            var medPrev = getFirstValue(row, IMPORT_FIELD_ALIASES.medicinaPreventiva);
            if (medPrev !== undefined) {
                candidate.medicinaPreventiva = normalizeBooleanLike(medPrev);
            }
        }

        // Conservar rawImport
        candidate.rawImport = Object.assign({}, row);

        return candidate;
    }

    function readImportedDataset(kind) {
        var raw = safeGetSessionStorage(IMPORT_STORAGE_KEYS[kind]);
        var dataset;
        if (!raw) {
            var fallback = SESSION_STORAGE_FALLBACK[kind];
            if (fallback) dataset = fallback;
        } else {
            dataset = safeParseJson(raw);
        }
        if (raw) safeRemoveSessionStorage(IMPORT_STORAGE_KEYS[kind]);
        if (kind === 'farmacia' && dataset && dataset.format === 'farmacia_bridge_v2_raw') {
            delete SESSION_STORAGE_FALLBACK[kind];
            return null;
        }
        return dataset || null;
    }

    function getImportedPatientByCip(cip) {
        if (!cip) return null;
        var normalizedTarget = String(cip).trim().toUpperCase();
        var kinds = Object.keys(IMPORT_STORAGE_KEYS);
        for (var i = 0; i < kinds.length; i++) {
            var dataset = readImportedDataset(kinds[i]);
            if (!dataset || !Array.isArray(dataset.rows)) continue;
            for (var j = 0; j < dataset.rows.length; j++) {
                var candidate = buildImportedPatientCandidate(dataset.rows[j], dataset.mappedFields || {}, dataset.sourceLabel || kinds[i], j);
                if (candidate && String(candidate.cip).trim().toUpperCase() === normalizedTarget) return candidate;
            }
        }
        return null;
    }


    function patientSourcePriority(patient) {
        var source = String((patient && patient.importSource) || 'demo').toLowerCase();
        if (source.indexOf('farmacia') !== -1) return 3;
        if (source.indexOf('enfermer') !== -1) return 2;
        return 1;
    }

    function isBlankValue(value) {
        return value === null || value === undefined || String(value).trim() === '' || String(value).trim() == '—';
    }

    function mergePatientRecord(basePatient, overlayPatient) {
        var merged = Object.assign({}, basePatient || {});
        Object.keys(overlayPatient || {}).forEach(function (key) {
            var overlayValue = overlayPatient[key];
            if (!isBlankValue(overlayValue)) {
                merged[key] = overlayValue;
            } else if (!(key in merged)) {
                merged[key] = overlayValue;
            }
        });
        if (!merged.importSource) merged.importSource = 'demo';
        if (!merged.estado) merged.estado = 'pending';
        if (!merged.estadoLabel) {
            merged.estadoLabel = merged.estado === 'pending' ? 'Pendiente' : (merged.estado === 'validated' ? 'Validado' : (merged.estado === 'followup' ? 'En seguimiento' : 'Pendiente'));
        }

        // Normalizar/preservar pauta estructurada y su representación legacy
        var pautasCatalog = (typeof window !== 'undefined' && window.FarmaciaPautasCatalog) ? window.FarmaciaPautasCatalog : null;
        if (merged.pauta_estructurada) {
            if (pautasCatalog && typeof pautasCatalog.getLegacyPautaLabel === 'function') {
                merged.pauta = pautasCatalog.getLegacyPautaLabel(merged.pauta_estructurada);
            }
        } else if (merged.pauta) {
            var derivedPautaEstruct = normalizePautaString(merged.pauta);
            if (derivedPautaEstruct) {
                merged.pauta_estructurada = derivedPautaEstruct;
                if (pautasCatalog && typeof pautasCatalog.getLegacyPautaLabel === 'function') {
                    merged.pauta = pautasCatalog.getLegacyPautaLabel(derivedPautaEstruct);
                }
            }
        }

        return merged;
    }

    function getAvailablePatients() {
        var mergedByCip = {};
        var ordered = [];

        Object.keys(patients).forEach(function (cip) {
            var base = mergePatientRecord({}, Object.assign({ importSource: 'demo' }, patients[cip]));
            mergedByCip[cip] = base;
            ordered.push(base);
        });

        var importedPatients = [];
        if (window.FarmaciaDataImports && window.FarmaciaDataImports.getImportedPatients) {
            importedPatients = window.FarmaciaDataImports.getImportedPatients();
        }

        importedPatients.forEach(function (patient) {
            if (!patient || !patient.cip) return;
            var cip = String(patient.cip).trim();
            var normalized = mergePatientRecord({}, patient);
            var existing = mergedByCip[cip];
            if (!existing) {
                mergedByCip[cip] = normalized;
                ordered.push(normalized);
                return;
            }
            if (patientSourcePriority(normalized) >= patientSourcePriority(existing)) {
                mergedByCip[cip] = mergePatientRecord(existing, normalized);
            } else {
                mergedByCip[cip] = mergePatientRecord(normalized, existing);
            }
        });

        var runtimePatient = window.FarmaciaPatientFlowRuntime
            && typeof window.FarmaciaPatientFlowRuntime.getCurrentPatient === 'function'
            ? window.FarmaciaPatientFlowRuntime.getCurrentPatient() : null;
        if (runtimePatient && runtimePatient.cip) {
            var runtimeCip = String(runtimePatient.cip).trim();
            var runtimeExisting = mergedByCip[runtimeCip];
            var runtimeRecord = mergePatientRecord({}, runtimePatient);
            if (!runtimeExisting) {
                mergedByCip[runtimeCip] = runtimeRecord;
                ordered.push(runtimeRecord);
            } else {
                mergedByCip[runtimeCip] = mergePatientRecord(runtimeExisting, runtimeRecord);
            }
        }

        return ordered.map(function (patient) {
            return mergedByCip[String(patient.cip).trim()] || patient;
        }).filter(function (patient, index, list) {
            return patient && patient.cip && list.findIndex(function (candidate) {
                return candidate && String(candidate.cip).trim() === String(patient.cip).trim();
            }) === index;
        });
    }

    function isPendingValidationPatient(patient) {
        if (!patient) return false;
        // Usar el clasificador semántico WO8.1c.2
        if (typeof shouldAppearInValidationInbox === 'function') {
            return shouldAppearInValidationInbox(patient);
        }
        // Fallback legacy si el helper no está disponible
        var estado = String(patient.estado || '').trim().toLowerCase();
        var estadoLabel = String(patient.estadoLabel || '').trim().toLowerCase();
        var validacion = String(patient.estado_validacion_farmacia || '').trim().toLowerCase();
        if (estado === 'pending') return true;
        if (estadoLabel.indexOf('pend') !== -1) return true;
        if (validacion === 'pendiente') return true;
        return false;
    }

    function getPendingValidationPatients() {
        return getAvailablePatients().filter(isPendingValidationPatient);
    }

    function getPrebiologicoStatus(patient) {
        // Adaptador: delega en FarmaciaPrebiologico.evaluatePatientPrebiologico
        // Sin lógica clínica duplicada. Solo adaptación de formato.
        if (
            typeof window !== 'undefined' &&
            window.FarmaciaPrebiologico &&
            typeof window.FarmaciaPrebiologico.evaluatePatientPrebiologico === 'function'
        ) {
            try {
                var result = window.FarmaciaPrebiologico.evaluatePatientPrebiologico(patient);
                return adaptPrebiologicoResult(result);
            } catch (e) {
                console.warn('[Farmacia] getPrebiologicoStatus: fallo en delegación', e);
            }
        }
        return buildPrebiologicoUnavailableResult();
    }

    function adaptPrebiologicoResult(result) {
        if (!result || !result.overallStatus) {
            return buildPrebiologicoUnavailableResult();
        }

        var checks = result.checks || [];

        // Mapa de estados nuevo → legacy
        var statusMap = {
            complete: 'ok',
            pending: 'pendiente',
            alert: 'alerta',
            not_applicable: 'no_aplica',
            unknown: 'no_informado',
            missing: 'no_informado'
        };

        // Mapa de categorías: tuberculosis → mantouxIgra
        var categoryKeyMap = {
            tuberculosis: 'mantouxIgra'
        };

        var items = {};
        var statusSet = {};
        for (var i = 0; i < checks.length; i++) {
            var check = checks[i];
            var cat = categoryKeyMap[check.category] || check.category;
            var itemStatus = statusMap[check.status] || 'no_informado';
            items[cat] = {
                status: itemStatus,
                label: check.label
            };
            statusSet[itemStatus] = true;
        }

        // Overall con prioridad: alerta > pendiente > no_informado > incompleto > ok
        var overall;
        if (result.overallStatus === 'complete') {
            overall = 'ok';
        } else if (statusSet['alerta']) {
            overall = 'alerta';
        } else if (statusSet['pendiente']) {
            overall = 'pendiente';
        } else if (statusSet['no_informado'] && !statusSet['ok'] && !statusSet['no_aplica']) {
            overall = 'no_informado';
        } else if (statusSet['no_informado']) {
            overall = 'incompleto';
        } else if (!statusSet['ok'] && !statusSet['no_aplica']) {
            overall = 'no_informado';
        } else {
            overall = 'ok';
        }

        // Label
        var labelMap = {
            ok: 'Prebiológico completo',
            alerta: 'Prebiológico con alertas',
            pendiente: 'Prebiológico pendiente',
            incompleto: 'Prebiológico incompleto',
            no_informado: 'Prebiológico no informado'
        };
        var label = result.summaryText || labelMap[overall] || 'Prebiológico no informado';

        // Missing: items cuyo status no es ok ni no_aplica
        var missing = [];
        for (var key in items) {
            if (items.hasOwnProperty(key) && items[key].status !== 'ok' && items[key].status !== 'no_aplica') {
                missing.push(items[key].label);
            }
        }

        // Blocking: canValidate === false
        var blocking = !result.canValidate;

        return {
            overall: overall,
            label: label,
            items: items,
            missing: missing,
            blocking: blocking
        };
    }

    function buildPrebiologicoUnavailableResult() {
        return {
            overall: 'no_informado',
            label: 'Prebiológico no informado',
            items: {},
            missing: ['Prebiológico no informado'],
            blocking: true
        };
    }

    function findAvailablePatientByCip(cip) {
        if (!cip) return null;
        var available = getAvailablePatients();
        var target = String(cip).trim().toUpperCase();
        for (var i = 0; i < available.length; i++) {
            if (String(available[i].cip || '').trim().toUpperCase() === target) return available[i];
        }
        return null;
    }

    function getQueryContext() {
        var params = new URLSearchParams(window.location.search);
        var runtime = window.FarmaciaPatientFlowRuntime;
        var runtimePatient = runtime && typeof runtime.getCurrentPatient === 'function' ? runtime.getCurrentPatient() : null;
        var restarted = runtime && typeof runtime.getResolutionStatus === 'function' && runtime.getResolutionStatus() === 'restarted';
        var cip = (restarted ? '' : (params.get('cip') || params.get('id') || (runtimePatient && runtimePatient.cip) || '')).trim();
        var hasExplicitCip = !!cip;
        var patient = cip ? findAvailablePatientByCip(cip) : null;
        var patientFound = !!patient;
        return {
            cip: cip,
            servicio: restarted ? '' : (params.get('servicio') || (patientFound ? patient.servicio : '') || ''),
            servicioSlug: restarted ? '' : (params.get('servicio') || (patientFound ? patient.servicioSlug : '') || ''),
            patologia: restarted ? '' : (params.get('patologia') || (patientFound ? patient.patologia : '') || ''),
            entrada: restarted ? '' : (params.get('entrada') || ''),
            patient: patient,
            hasExplicitCip: hasExplicitCip,
            patientNotFound: hasExplicitCip && !patientFound,
            status: patientFound ? 'loaded' : (hasExplicitCip ? 'not_found' : 'no_cip')
        };
    }

    function makeContextUrl(base, context = {}) {
        if (window.FarmaciaPatientFlowRuntime && typeof window.FarmaciaPatientFlowRuntime.makeContextUrl === 'function') {
            return window.FarmaciaPatientFlowRuntime.makeContextUrl(base, context);
        }
        const params = new URLSearchParams();
        if (context.cip) params.set('cip', context.cip);
        if (context.servicio) params.set('servicio', context.servicio);
        if (context.patologia) params.set('patologia', context.patologia);
        if (context.entrada) params.set('entrada', context.entrada);
        const query = params.toString();
        return query ? `${base}?${query}` : base;
    }

    function setText(id, value) {
        const el = typeof id === 'string' ? document.getElementById(id) : id;
        if (el) el.textContent = value || '—';
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el && value !== undefined && value !== null && value !== '') el.value = value;
    }

    function clearChildren(el) {
        while (el && el.firstChild) el.removeChild(el.firstChild);
    }

    function createField(label, value) {
        const field = document.createElement('div');
        field.className = 'info-field';
        const labelEl = document.createElement('span');
        labelEl.className = 'info-field__label';
        labelEl.textContent = label;
        const valueEl = document.createElement('span');
        valueEl.className = 'info-field__value';
        valueEl.textContent = value || '—';
        field.append(labelEl, valueEl);
        return field;
    }

    function renderFields(container, fields) {
        clearChildren(container);
        fields.forEach(field => container.appendChild(createField(field.label, field.value)));
    }

    function appendIconText(parent, iconClass, text) {
        const icon = document.createElement('i');
        icon.className = `fas ${iconClass}`;
        icon.setAttribute('aria-hidden', 'true');
        parent.appendChild(icon);
        parent.appendChild(document.createTextNode(` ${text}`));
    }

    function populateSelect(select, options, placeholder) {
        clearChildren(select);
        const first = document.createElement('option');
        first.value = '';
        first.textContent = placeholder || 'Seleccionar...';
        select.appendChild(first);
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            select.appendChild(opt);
        });
    }

    const STATES = {
        PENDING: 'pending',
        VALIDATED: 'validated',
        FOLLOWUP: 'followup',
        DENIED: 'denied'
    };

    const DEMO_SESSION_NOTE = 'Demo — los datos se almacenan en memoria de sesión.';

    function statusClass(status) {
        if (status === STATES.VALIDATED) return 'status-badge status-badge--validated';
        if (status === STATES.FOLLOWUP) return 'status-badge status-badge--followup';
        if (status === STATES.DENIED) return 'status-badge status-badge--denied';
        return 'status-badge status-badge--pending';
    }

    function downloadFile(name, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function copyTextToClipboard(text, successMessage) {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(text)
                .then(function () { alert(successMessage || 'Copiado al portapapeles.'); })
                .catch(function () { alert('No se pudo copiar al portapapeles. Copia manualmente.'); });
            return;
        }
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
            var ok = document.execCommand('copy');
            document.body.removeChild(ta);
            if (ok) alert(successMessage || 'Copiado al portapapeles.');
            else alert('No se pudo copiar al portapapeles. Copia manualmente.');
        } catch (e) {
            document.body.removeChild(ta);
            alert('No se pudo copiar al portapapeles. Copia manualmente.');
        }
    }

    function insertNoCipBanner(bannerId) {
        if (document.getElementById(bannerId)) return;
        var banner = document.createElement('div');
        banner.id = bannerId;
        banner.className = 'no-cip-banner';
        var icon = document.createElement('i');
        icon.className = 'fas fa-info-circle';
        icon.setAttribute('aria-hidden', 'true');
        var msg = document.createElement('span');
        msg.textContent = ' Busca primero un paciente por CIP o accede desde el Quick View para precargar datos.';
        var link = document.createElement('a');
        link.href = 'farmacia_index.html';
        link.className = 'btn btn-secondary no-cip-banner__link';
        var linkIcon = document.createElement('i');
        linkIcon.className = 'fas fa-search';
        linkIcon.setAttribute('aria-hidden', 'true');
        link.appendChild(linkIcon);
        link.appendChild(document.createTextNode(' Ir al buscador de Farmacia'));
        banner.append(icon, msg, link);
        var firstCard = document.querySelector('section.dashboard-card');
        if (firstCard) firstCard.parentNode.insertBefore(banner, firstCard);
    }

    function initSidebarSearch() {
        const input = qs('#patientSearch');
        if (!input) return;
        input.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            const cip = input.value.trim();
            if (cip) window.location.href = makeContextUrl('farmacia_index.html', { cip });
        });
        const clearBtn = qs('#clearPatientSearch');
        if (clearBtn) {
            input.addEventListener('input', () => clearBtn.classList.toggle('hidden', !input.value));
            clearBtn.addEventListener('click', () => { input.value = ''; clearBtn.classList.add('hidden'); input.focus(); });
        }
    }

    function initContextSummary() {
        const context = getQueryContext();
        qsa('[data-context="cip"]').forEach(el => { el.textContent = context.cip || 'CIP no indicado'; });
        qsa('[data-context="servicio"]').forEach(el => { el.textContent = context.servicio || 'Servicio no indicado'; });
        qsa('[data-context="patologia"]').forEach(el => { el.textContent = context.patologia || 'Patología no indicada'; });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initSidebarSearch();
        initContextSummary();
    });

    window.FarmaciaCatalog = (function () {
        var drugs = [];
        var loaded = false;
        var loading = false;
        var totalCount = 0;
        var cimaCount = 0;
        var localCount = 0;
        var snapshotRegistry = null;
        var FARMACIA_DRUG_SNAPSHOT_KEY = 'farmacia_drug_snapshot';
        var FARMACIA_DRUG_SNAPSHOT_REGISTRY_KEY = 'farmacia_drug_snapshot_registry_v2';
        var SNAPSHOT_REGISTRY_VERSION = 2;
        var CATALOG_XLSX_PATH = 'data/catalogos/farmacia/hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx';
        var catalogStatus = { state: 'idle', message: 'Catálogo farmacológico: pendiente de carga automática' };

        function updateCatalogStatusUi() {
            var statusNodes = document.querySelectorAll('[data-catalog-status]');
            statusNodes.forEach(function (node) {
                node.textContent = catalogStatus.message;
                node.className = 'catalog-sidebar-status';
                if (catalogStatus.state === 'loaded') {
                    node.classList.add('catalog-status--loaded');
                } else if (catalogStatus.state === 'missing') {
                    node.classList.add('catalog-status--manual');
                } else if (catalogStatus.state === 'error') {
                    node.classList.add('catalog-status--error');
                }
            });
            var noteEl = document.getElementById('catalogSidebarNote');
            if (noteEl && typeof cimaCount !== 'undefined' && typeof localCount !== 'undefined') {
                noteEl.textContent = 'CIMA ' + cimaCount + ' + locales ' + localCount;
            }
        }

        function setCatalogStatus(state, message) {
            catalogStatus = { state: state, message: message };
            updateCatalogStatusUi();
        }

        function isTruthyRobust(value) {
            if (value === true || value === 1 || value === '1') return true;
            if (value === false || value === 0 || value === '0') return false;
            if (value === null || value === undefined || value === '') return false;
            var s = String(value).trim().toUpperCase();
            return s === 'TRUE' || s === 'SI' || s === 'SÍ' || s === 'YES' || s === '1';
        }

        function buildSearchableText(drug) {
            return [
                drug.nombre_comercial || '',
                drug.principio_activo || '',
                drug.nombre_presentacion || '',
                drug.display_name || '',
                drug.codigo_nacional || '',
                drug.nregistro || '',
                drug.drug_id || ''
            ].join(' ').toLowerCase();
        }

        function buildStableCatalogId(sourceType, nativeId, metadataParts) {
            var preferred = nativeId == null ? '' : String(nativeId).trim();
            if (preferred) return preferred;
            var canonical = (metadataParts || []).map(function (value) {
                return value == null ? '' : String(value).trim().toLowerCase();
            }).join('\u001f');
            if (!canonical.replace(/\u001f/g, '')) return '';
            var hash = 2166136261;
            for (var i = 0; i < canonical.length; i++) {
                hash ^= canonical.charCodeAt(i);
                hash = Math.imul(hash, 16777619);
            }
            return String(sourceType || 'CATALOG').toUpperCase() + '-AUTO-' + (hash >>> 0).toString(16).padStart(8, '0') + '-' + canonical.length;
        }

        function normalizeCIMA(row) {
            var cn = row.codigo_nacional != null ? String(row.codigo_nacional) : '';
            var nr = row.nregistro != null ? String(row.nregistro) : '';
            var nc = row.nombre_comercial || '';
            var pa = row.principio_activo || '';
            var np = row.nombre_presentacion || '';
            var dose = row.dosis_presentacion || '';
            var via = row.via || '';
            var forma = row.forma_farmaceutica || '';
            return {
                nombre_comercial: nc,
                principio_activo: pa,
                nombre_presentacion: np,
                codigo_nacional: cn,
                nregistro: nr,
                dosis: dose,
                via: via,
                es_hospitalario: row.es_hospitalario_derivado || '',
                biosimilar: row.biosimilar || '',
                drug_id: buildStableCatalogId('CIMA', row.drug_source_id, [cn, nr, nc, pa, np, dose, via, forma]),
                source_type: 'CIMA',
                display_name: nc || np || '',
                forma_farmaceutica: forma,
                _searchable: ''
            };
        }

        function normalizeLOCAL(row) {
            var dn = row.display_name || '';
            var ncs = row.nombre_comercial_si_existe || '';
            var pam = row.principio_activo_o_molecula || '';
            var pt = row.presentacion_texto || '';
            var dose = row.dosis_texto || '';
            var via = row.via || '';
            var forma = row.forma_farmaceutica || '';
            return {
                nombre_comercial: ncs || dn || '',
                principio_activo: pam,
                nombre_presentacion: pt,
                codigo_nacional: '',
                nregistro: '',
                dosis: dose,
                via: via,
                es_hospitalario: 'SI',
                biosimilar: '',
                drug_id: buildStableCatalogId('LOCAL', row.local_drug_id, [dn, ncs, pam, pt, dose, via, forma, row.tipo_situacion]),
                source_type: 'LOCAL',
                display_name: dn || '',
                forma_farmaceutica: forma,
                tipo_situacion: row.tipo_situacion || '',
                activo_en_catalogo: row.activo_en_catalogo || '',
                _searchable: ''
            };
        }

        function loadFromExcel(arrayBuffer) {
            if (typeof XLSX === 'undefined') {
                throw new Error('SheetJS (XLSX) no está disponible. Cargue vendor/sheetjs/xlsx.full.min.js antes.');
            }
            var workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
            var cimaSheet = workbook.Sheets['CATALOGO_CIMA'];
            var localSheet = workbook.Sheets['CATALOGO_LOCAL_ESPECIAL'];
            if (!cimaSheet || !localSheet) {
                throw new Error('El Excel no contiene las hojas esperadas: CATALOGO_CIMA y CATALOGO_LOCAL_ESPECIAL.');
            }
            var cimaData = XLSX.utils.sheet_to_json(cimaSheet, { defval: '' });
            var localData = XLSX.utils.sheet_to_json(localSheet, { defval: '' });
            var cimaNormalized = cimaData.map(normalizeCIMA);
            var localNormalized = localData.map(normalizeLOCAL);
            drugs = cimaNormalized.concat(localNormalized);
            for (var i = 0; i < drugs.length; i++) {
                drugs[i]._searchable = buildSearchableText(drugs[i]);
            }
            cimaCount = cimaNormalized.length;
            localCount = localNormalized.length;
            totalCount = drugs.length;
            loaded = true;
            return { totalCount: totalCount, cimaCount: cimaCount, localCount: localCount, loaded: loaded };
        }

        function search(query) {
            if (!loaded || !query || String(query).trim().length < 2) return [];
            var q = String(query).trim().toLowerCase();
            var results = [];
            for (var i = 0; i < drugs.length; i++) {
                if (drugs[i]._searchable && drugs[i]._searchable.indexOf(q) !== -1) {
                    results.push(drugs[i]);
                    if (results.length >= 15) break;
                }
            }
            return results;
        }

        function normalizeSnapshotContext(context) {
            if (!context || typeof context !== 'object') return null;
            var normalized = {
                slot: String(context.slot || '').trim().toLowerCase(),
                cip: String(context.cip || '').trim().toUpperCase(),
                tratamiento_id: String(context.tratamiento_id || '').trim(),
                linea_id: String(context.linea_id || '').trim()
            };
            var approvedFixedSlot = normalized.slot === 'validacion.solicitado'
                || normalized.slot === 'validacion.validado'
                || normalized.slot === 'primera_visita.tratamiento'
                || normalized.slot === 'seguimiento.tratamiento';
            var approvedRelatedSlot = /^seguimiento\.relacionado:[a-z0-9][a-z0-9._-]*$/.test(normalized.slot);
            if ((!approvedFixedSlot && !approvedRelatedSlot) || !normalized.cip) return null;
            return normalized;
        }

        function snapshotContextKey(context) {
            var normalized = normalizeSnapshotContext(context);
            if (!normalized) return '';
            return [normalized.slot, normalized.cip, normalized.tratamiento_id, normalized.linea_id]
                .map(function (part) { return encodeURIComponent(part); }).join('|');
        }

        function emptySnapshotRegistry() {
            return { version: SNAPSHOT_REGISTRY_VERSION, snapshots: {} };
        }

        function persistSnapshotRegistry() {
            try {
                sessionStorage.setItem(FARMACIA_DRUG_SNAPSHOT_REGISTRY_KEY, JSON.stringify(snapshotRegistry || emptySnapshotRegistry()));
            } catch (e) { /* sessionStorage unavailable */ }
        }

        function loadSnapshotRegistry() {
            if (snapshotRegistry) return snapshotRegistry;
            snapshotRegistry = emptySnapshotRegistry();
            try {
                // The historical singleton has no slot/CIP context and is never reusable safely.
                sessionStorage.removeItem(FARMACIA_DRUG_SNAPSHOT_KEY);
                var raw = sessionStorage.getItem(FARMACIA_DRUG_SNAPSHOT_REGISTRY_KEY);
                if (!raw) return snapshotRegistry;
                var parsed = JSON.parse(raw);
                if (parsed && parsed.version === SNAPSHOT_REGISTRY_VERSION && parsed.snapshots && typeof parsed.snapshots === 'object' && !Array.isArray(parsed.snapshots)) {
                    snapshotRegistry = parsed;
                    var sanitized = false;
                    Object.keys(snapshotRegistry.snapshots).forEach(function (key) {
                        var snapshot = snapshotRegistry.snapshots[key];
                        var context = snapshot && snapshot.context;
                        if (!isValidStoredSnapshot(snapshot, context) || snapshotContextKey(context) !== key) {
                            delete snapshotRegistry.snapshots[key];
                            sanitized = true;
                        }
                    });
                    if (sanitized) persistSnapshotRegistry();
                } else {
                    sessionStorage.removeItem(FARMACIA_DRUG_SNAPSHOT_REGISTRY_KEY);
                }
            } catch (e) {
                snapshotRegistry = emptySnapshotRegistry();
                try { sessionStorage.removeItem(FARMACIA_DRUG_SNAPSHOT_REGISTRY_KEY); } catch (ignore) { /* unavailable */ }
            }
            return snapshotRegistry;
        }

        function isValidStoredSnapshot(snapshot, context) {
            if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return false;
            var storedContext = normalizeSnapshotContext(snapshot.context);
            if (!storedContext || snapshotContextKey(storedContext) !== snapshotContextKey(context)) return false;
            if (!snapshot.selected_drug_id || !snapshot.source_type) return false;
            return snapshot.source_type === 'CIMA' || snapshot.source_type === 'LOCAL';
        }

        function isConcreteCatalogSelection(drug) {
            return !!(drug && drug.drug_id && (drug.source_type === 'CIMA' || drug.source_type === 'LOCAL') && (drug.nombre_presentacion || drug.dosis));
        }

        function catalogStringValue(value) {
            return value == null ? '' : String(value).trim();
        }

        function normalizeCatalogVia(value) {
            var raw = catalogStringValue(value);
            var key = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
            if (!key) return '';
            if (key.indexOf('via_de_administracion_') === 0) key = key.slice('via_de_administracion_'.length);
            else if (key.indexOf('via_') === 0) key = key.slice('via_'.length);
            else if (key.indexOf('administracion_') === 0) key = key.slice('administracion_'.length);
            if (key === 'sc' || key === 'subcutanea' || key === 'subcutanea_subcutanea') return 'SC';
            if (key === 'iv' || key === 'intravenosa') return 'IV';
            if (key === 'oral' || key === 'vo' || key === 'v_o') return 'Oral';
            if (key === 'im' || key === 'intramuscular') return 'IM';
            return raw;
        }

        function mapCatalogViaToSelect(value) {
            var via = normalizeCatalogVia(value);
            if (via === 'SC' || via === 'IV' || via === 'Oral' || via === 'IM') return via;
            return via ? 'Otra' : '';
        }

        function firstCatalogValue() {
            for (var i = 0; i < arguments.length; i++) {
                var value = catalogStringValue(arguments[i]);
                if (value) return value;
            }
            return '';
        }

        function shouldApplyCatalogProposal(currentValue, previousValue) {
            var current = catalogStringValue(currentValue);
            return !current || current === '—' || current === 'Pendiente de completar por Farmacia' || current === catalogStringValue(previousValue);
        }

        function buildCatalogProposalForSlot(slot, drug) {
            var selected = drug && typeof drug === 'object' ? drug : {};
            var normalizedSlot = String(slot || '').trim().toLowerCase();
            var presentation = catalogStringValue(selected.nombre_presentacion);
            var dose = catalogStringValue(selected.dosis);
            var route = mapCatalogViaToSelect(selected.via);
            if (normalizedSlot === 'validacion.solicitado') {
                return { dosis_texto: dose, via: route };
            }
            if (normalizedSlot === 'primera_visita.tratamiento') {
                return { dosis_texto: firstCatalogValue(presentation, dose), via: route };
            }
            return {
                presentacion: presentation,
                dosis_texto: dose,
                via: route
            };
        }

        function reconcileCatalogSelection(current, previousSnapshot, drug, slot) {
            var existing = current && typeof current === 'object' ? current : {};
            var selected = drug && typeof drug === 'object' ? drug : {};
            var previous = previousSnapshot && previousSnapshot.proposal_values && typeof previousSnapshot.proposal_values === 'object'
                ? previousSnapshot.proposal_values : {};
            var contextualSlot = slot || (previousSnapshot && previousSnapshot.context && previousSnapshot.context.slot) || '';
            var values = Object.assign({}, existing);
            values.farmaco_nombre = firstCatalogValue(selected.display_name, selected.nombre_comercial, selected.principio_activo);
            values.nombre_comercial = catalogStringValue(selected.nombre_comercial);
            values.principio_activo = catalogStringValue(selected.principio_activo);
            values.codigo_nacional = catalogStringValue(selected.codigo_nacional);
            values.nregistro = catalogStringValue(selected.nregistro);
            values.selected_drug_id = firstCatalogValue(selected.drug_id, selected.selected_drug_id);
            values.source_type = selected.source_type === 'CIMA' || selected.source_type === 'LOCAL' ? selected.source_type : '';
            values.fuente = values.source_type === 'CIMA' ? 'cima' : (values.source_type === 'LOCAL' ? 'local_especial' : '');
            var proposed = buildCatalogProposalForSlot(contextualSlot, selected);
            var nextProposalValues = {};
            Object.keys(proposed).forEach(function (field) {
                if (shouldApplyCatalogProposal(existing[field], previous[field])) {
                    values[field] = proposed[field];
                    if (proposed[field]) nextProposalValues[field] = proposed[field];
                }
            });
            return { values: values, proposal_values: nextProposalValues };
        }

        function selectDrug(drug, context, metadata) {
            var normalizedContext = normalizeSnapshotContext(context);
            var key = snapshotContextKey(normalizedContext);
            if (!key || !isConcreteCatalogSelection(drug)) return null;
            var selectedSnapshot = {
                version: SNAPSHOT_REGISTRY_VERSION,
                context: normalizedContext,
                drug_id: drug.drug_id || '',
                selected_drug_id: drug.drug_id || '',
                source_type: drug.source_type || '',
                nombre_snapshot: drug.nombre_comercial || drug.display_name || '',
                principio_activo_snapshot: drug.principio_activo || '',
                presentacion_snapshot: drug.nombre_presentacion || '',
                via_snapshot: drug.via || '',
                codigo_nacional_snapshot: drug.codigo_nacional || '',
                nregistro_snapshot: drug.nregistro || '',
                nombre_comercial: drug.nombre_comercial || '',
                dosis_presentacion: drug.dosis || '',
                etiquetas: {
                    es_hospitalario: isTruthyRobust(drug.es_hospitalario),
                    biosimilar: isTruthyRobust(drug.biosimilar)
                },
                proposal_values: metadata && metadata.proposal_values && typeof metadata.proposal_values === 'object'
                    ? Object.assign({}, metadata.proposal_values) : {},
                selected_at: new Date().toISOString()
            };
            var registry = loadSnapshotRegistry();
            registry.snapshots[key] = selectedSnapshot;
            persistSnapshotRegistry();
            return selectedSnapshot;
        }

        function getSnapshot(context) {
            var key = snapshotContextKey(context);
            if (!key) {
                try { sessionStorage.removeItem(FARMACIA_DRUG_SNAPSHOT_KEY); } catch (e) { /* unavailable */ }
                return null;
            }
            var registry = loadSnapshotRegistry();
            var snapshot = registry.snapshots[key];
            if (!isValidStoredSnapshot(snapshot, context)) {
                if (snapshot !== undefined) {
                    delete registry.snapshots[key];
                    persistSnapshotRegistry();
                }
                return null;
            }
            return snapshot;
        }

        function clearSnapshot(context) {
            var key = snapshotContextKey(context);
            if (!key) return false;
            var registry = loadSnapshotRegistry();
            if (registry.snapshots[key] === undefined) return false;
            delete registry.snapshots[key];
            persistSnapshotRegistry();
            return true;
        }

        function getStatusText() {
            if (!loaded) return 'Catálogo no cargado';
            return totalCount + ' fármacos (CIMA: ' + cimaCount + ' + Locales: ' + localCount + ')';
        }

        function ensureXLSX(callback, onError) {
            if (typeof XLSX !== 'undefined') { callback(); return; }
            var script = document.createElement('script');
            script.src = 'vendor/sheetjs/xlsx.full.min.js';
            script.onload = callback;
            script.onerror = function () {
                if (typeof onError === 'function') onError('No se pudo cargar la librería SheetJS desde vendor/sheetjs/xlsx.full.min.js.');
            };
            document.head.appendChild(script);
        }

        function autoLoad() {
            if (loaded || loading) return;
            loading = true;
            setCatalogStatus('loading', 'Catálogo farmacológico: cargando automáticamente…');
            ensureXLSX(function () {
                fetch(CATALOG_XLSX_PATH)
                    .then(function (response) {
                        if (response.ok) return response.arrayBuffer();
                        throw new Error('fetch_failed');
                    })
                    .then(function (arrayBuffer) {
                        var result = loadFromExcel(arrayBuffer);
                        setCatalogStatus('loaded', 'Catálogo CIMA cargado · ' + totalCount + ' Fx');
                        loading = false;
                        document.dispatchEvent(new CustomEvent('farmacia:catalog-loaded', { detail: result }));
                    })
                    .catch(function (error) {
                        loading = false;
                        setCatalogStatus('missing', 'Catálogo farmacológico: no disponible en esta demo. CIMA pendiente de integración automática real.');
                        document.dispatchEvent(new CustomEvent('farmacia:catalog-missing', { detail: { error: error ? error.message || String(error) : 'missing' } }));
                    });
            }, function (errMsg) {
                loading = false;
                setCatalogStatus('error', errMsg);
            });
        }

        function initSidebarCatalog() {
            autoLoad();
            var btnLoad = document.getElementById('sidebarLoadCatalog');
            if (btnLoad) btnLoad.classList.add('hidden');
            var fileInput = document.getElementById('sidebarFileCatalog');
            if (fileInput) fileInput.classList.add('hidden');
            updateCatalogStatusUi();
        }

        document.addEventListener('DOMContentLoaded', function () {
            initSidebarCatalog();
        });

        return {
            get drugs() { return drugs; },
            get loaded() { return loaded; },
            get totalCount() { return totalCount; },
            get cimaCount() { return cimaCount; },
            get localCount() { return localCount; },
            get selectedSnapshot() { return null; },
            loadFromExcel: loadFromExcel,
            search: search,
            selectDrug: selectDrug,
            getSnapshot: getSnapshot,
            clearSnapshot: clearSnapshot,
            normalizeSnapshotContext: normalizeSnapshotContext,
            snapshotContextKey: snapshotContextKey,
            isConcreteCatalogSelection: isConcreteCatalogSelection,
            buildCatalogProposalForSlot: buildCatalogProposalForSlot,
            reconcileCatalogSelection: reconcileCatalogSelection,
            mapCatalogViaToSelect: mapCatalogViaToSelect,
            getStatusText: getStatusText,
            autoLoad: autoLoad,
            getStatus: function () { return Object.assign({}, catalogStatus); },
            ensureXLSX: ensureXLSX
        };
    })();

    window.FarmaciaDataImports = (function () {
        var importStates = {
            enfermeria: readImportedDataset('enfermeria'),
            farmacia: readImportedDataset('farmacia')
        };

        function emitImportEvent(kind, detail) {
            document.dispatchEvent(new CustomEvent('farmacia:data-imported', {
                detail: Object.assign({ kind: kind }, detail || {})
            }));
        }

        function getKindLabel(kind) {
            return kind === 'enfermeria' ? 'Enfermería' : 'Farmacia';
        }

        function formatImportStatus(kind) {
            var state = importStates[kind];
            if (state && state.format === 'farmacia_bridge_v2_raw' && state.bridgeReadModel) {
                return 'Excel Farmacia cargado · ' + state.rowCount + ' filas · ' + state.eventCount + ' actos · ' + state.patientCount + ' pacientes';
            }
            if (!state || !Array.isArray(state.rows) || !state.rows.length) {
                return 'No se ha cargado Excel de ' + getKindLabel(kind);
            }
            return 'Excel ' + getKindLabel(kind) + ' cargado · ' + state.rows.length + ' registros';
        }

        function hasImportData(kind) {
            var state = importStates[kind];
            return !!(state && ((Array.isArray(state.rows) && state.rows.length) || (state.format === 'farmacia_bridge_v2_raw' && state.bridgeReadModel)));
        }

        function updateDbStatusIndicator() {
            var indicator = document.getElementById('dbStatusIndicator');
            if (!indicator) return;
            var labelEl = document.getElementById('dbStatusLabel');
            var timeEl = document.getElementById('dbStatusTime');
            var hasEnfermeria = hasImportData('enfermeria');
            var hasFarmacia = hasImportData('farmacia');
            if (labelEl) labelEl.textContent = 'Datos FH cargados';
            if (timeEl) {
                if (hasEnfermeria && hasFarmacia) {
                    timeEl.textContent = 'Enfermería + Farmacia';
                } else if (hasEnfermeria) {
                    timeEl.textContent = 'Enfermería cargada';
                } else if (hasFarmacia) {
                    timeEl.textContent = 'Farmacia cargada';
                }
            }
            if (hasEnfermeria || hasFarmacia) {
                indicator.classList.add('db-status-indicator--loaded');
            }
        }

        function updateImportUi(kind) {
            var statusEl = document.getElementById(kind === 'enfermeria' ? 'estadoCargaEnfermeria' : 'estadoCargaFarmacia');
            var detailsEl = document.getElementById(kind === 'enfermeria' ? 'detalleCargaEnfermeria' : 'detalleCargaFarmacia');
            var state = importStates[kind];
            if (statusEl) statusEl.textContent = formatImportStatus(kind);
            if (detailsEl) {
                if (!hasImportData(kind)) {
                    detailsEl.textContent = 'Sin importación local almacenada.';
                } else if (state.format === 'farmacia_bridge_v2_raw') {
                    detailsEl.textContent = 'Read model disponible en esta página. Al recargar deberá volver a seleccionar el Excel.';
                } else {
                    detailsEl.textContent = '';
                }
            }
            updateDbStatusIndicator();
        }

        function updateAllImportUi() {
            updateImportUi('enfermeria');
            updateImportUi('farmacia');
        }

        function parseWorkbook(kind, workbook, fileName) {
            if (kind === 'enfermeria' && window.FarmaciaDemo && typeof window.FarmaciaDemo.isEnfermeriaInicioBiologicoWorkbook === 'function'
                && window.FarmaciaDemo.isEnfermeriaInicioBiologicoWorkbook(workbook)) {
                // Enfermería: usar adaptador específico
                var sheetNames = workbook.SheetNames;
                var allCandidates = [];
                var sheetNameUsed = '';
                for (var si = 0; si < sheetNames.length; si++) {
                    var sn = sheetNames[si];
                    var sheet = workbook.Sheets[sn];
                    var rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                    var candidates = window.FarmaciaDemo.parseEnfermeriaInicioBiologicoSheet(rawRows, sn);
                    if (candidates.length > 0) {
                        allCandidates = allCandidates.concat(candidates);
                        if (!sheetNameUsed) sheetNameUsed = sn;
                    }
                }
                var mappedFields = {
                    cip: 'cip_demo_o_hash',
                    nombre: 'paciente_nombre',
                    servicio: 'servicio_origen',
                    patologia: 'patologia_indicacion',
                    farmaco: 'farmaco_solicitado'
                };
                var state = {
                    kind: kind,
                    sourceLabel: 'Enfermería',
                    fileName: fileName || '',
                    importedAt: new Date().toISOString(),
                    sheetName: sheetNameUsed || (sheetNames.length > 0 ? sheetNames[0] : ''),
                    rowCount: allCandidates.length,
                    headers: allCandidates.length ? Object.keys(allCandidates[0]) : [],
                    mappedFields: mappedFields,
                    unrecognizedHeaders: [],
                    rows: allCandidates
                };
                importStates[kind] = state;
                safeRemoveSessionStorage(IMPORT_STORAGE_KEYS[kind]);
                SESSION_STORAGE_FALLBACK[kind] = state;
                state.storage = 'memory_only';
                updateAllImportUi();
                emitImportEvent(kind, { state: state });
                return state;
            }

            if (kind === 'farmacia') {
                if (!window.FarmaciaBridgeV2Reader || typeof window.FarmaciaBridgeV2Reader.readWorkbook !== 'function') {
                    throw new Error('FarmaciaBridgeV2Reader no está disponible.');
                }
                var importedAt = new Date().toISOString();
                var bridgeReadModel = window.FarmaciaBridgeV2Reader.readWorkbook(workbook, {
                    fileName: fileName || '',
                    importedAt: importedAt
                });
                if (bridgeReadModel) {
                    var dataPort = null;
                    if (window.FarmaciaRawExcelDataSource && typeof window.FarmaciaRawExcelDataSource.create === 'function'
                        && window.FarmaciaPatientFlowRuntime && typeof window.FarmaciaPatientFlowRuntime.setDataPort === 'function') {
                        dataPort = window.FarmaciaRawExcelDataSource.create(bridgeReadModel);
                        window.FarmaciaPatientFlowRuntime.setDataPort(dataPort);
                    }
                    var bridgeState = {
                        kind: 'farmacia',
                        format: 'farmacia_bridge_v2_raw',
                        sourceLabel: 'Farmacia',
                        fileName: fileName || '',
                        importedAt: importedAt,
                        rowCount: bridgeReadModel.metadata.row_count,
                        eventCount: bridgeReadModel.metadata.event_count,
                        patientCount: bridgeReadModel.metadata.patient_count,
                        bridgeReadModel: bridgeReadModel,
                        dataPort: dataPort,
                        storage: 'runtime_memory'
                    };
                    safeRemoveSessionStorage(IMPORT_STORAGE_KEYS[kind]);
                    importStates[kind] = bridgeState;
                    updateAllImportUi();
                    emitImportEvent(kind, { format: bridgeState.format, state: bridgeState });
                    return bridgeState;
                }
            }

            // Generic import (Farmacia u otros)
            var firstSheetName = workbook.SheetNames[0];
            var sheet = workbook.Sheets[firstSheetName];
            var rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            var headers = rows.length ? Object.keys(rows[0]) : [];
            var inferred = inferFieldMapping(headers);
            var state = {
                kind: kind,
                sourceLabel: getKindLabel(kind),
                fileName: fileName || '',
                importedAt: new Date().toISOString(),
                sheetName: firstSheetName || '',
                rowCount: rows.length,
                headers: headers,
                mappedFields: inferred.mapping,
                unrecognizedHeaders: inferred.unrecognizedHeaders,
                rows: rows
            };
            importStates[kind] = state;
            safeRemoveSessionStorage(IMPORT_STORAGE_KEYS[kind]);
            SESSION_STORAGE_FALLBACK[kind] = state;
            state.storage = 'memory_only';
            updateAllImportUi();
            emitImportEvent(kind, { state: state });
            return state;
        }

        function importFile(kind, file) {
            return new Promise(function (resolve, reject) {
                if (!file) {
                    reject(new Error('No se ha seleccionado archivo.'));
                    return;
                }
                var catalog = window.FarmaciaCatalog;
                catalog.ensureXLSX(function () {
                    var reader = new FileReader();
                    reader.onload = function (event) {
                        try {
                            var workbook = XLSX.read(new Uint8Array(event.target.result), { type: 'array' });
                            resolve(parseWorkbook(kind, workbook, file.name));
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.onerror = function () {
                        reject(new Error('Error al leer el archivo.'));
                    };
                    reader.readAsArrayBuffer(file);
                }, function (errMsg) {
                    reject(new Error(errMsg));
                });
            });
        }

        function initImportPanel() {
            var wiring = [
                { kind: 'enfermeria', buttonId: 'btnCargarExcelEnfermeria', inputId: 'inputExcelEnfermeria' },
                { kind: 'farmacia', buttonId: 'btnCargarExcelFarmacia', inputId: 'inputExcelFarmacia' }
            ];
            wiring.forEach(function (item) {
                var button = document.getElementById(item.buttonId);
                var input = document.getElementById(item.inputId);
                if (!button || !input) return;
                button.addEventListener('click', function () {
                    input.click();
                });
                input.addEventListener('change', function (event) {
                    var file = event.target.files && event.target.files[0];
                    if (!file) return;
                    var previousState = importStates[item.kind];
                    importFile(item.kind, file)
                        .then(function () {
                            input.value = '';
                        })
                        .catch(function (err) {
                            var statusEl = document.getElementById(item.kind === 'enfermeria' ? 'estadoCargaEnfermeria' : 'estadoCargaFarmacia');
                            var errorMessage = err.message || err;
                            if (statusEl && previousState) {
                                var separator = /[.!?]$/.test(String(errorMessage)) ? ' ' : '. ';
                                statusEl.textContent = 'Nuevo archivo rechazado: ' + errorMessage + separator + 'Sigue activo el Excel anterior: ' + (previousState.fileName || 'archivo previamente cargado') + '.';
                            } else if (statusEl) {
                                statusEl.textContent = 'Error al cargar Excel de ' + getKindLabel(item.kind) + ': ' + errorMessage;
                            }
                            input.value = '';
                        });
                });
            });
            updateAllImportUi();
        }

        function getImportedPatients() {
            var items = [];
            Object.keys(importStates).forEach(function (kind) {
                var state = importStates[kind];
                if (state && state.format === 'farmacia_bridge_v2_raw') return;
                if (!state || !Array.isArray(state.rows)) return;
                state.rows.forEach(function (row, index) {
                    var candidate = buildImportedPatientCandidate(row, state.mappedFields || {}, state.sourceLabel || getKindLabel(kind), index);
                    if (candidate) items.push(candidate);
                });
            });
            return items;
        }

        function findImportedPatientByCip(cip) {
            var patients = getImportedPatients();
            var target = String(cip || '').trim().toUpperCase();
            for (var i = 0; i < patients.length; i++) {
                if (String(patients[i].cip || '').trim().toUpperCase() === target) return patients[i];
            }
            return null;
        }

        function getBridgeReadModel() {
            var state = importStates.farmacia;
            return state && state.format === 'farmacia_bridge_v2_raw' ? state.bridgeReadModel || null : null;
        }

        function clearTransientPatientImports() {
            importStates.enfermeria = null;
            delete SESSION_STORAGE_FALLBACK.enfermeria;
            safeRemoveSessionStorage(IMPORT_STORAGE_KEYS.enfermeria);
            updateAllImportUi();
        }

        document.addEventListener('DOMContentLoaded', function () {
            initImportPanel();
            if (window.FarmaciaPatientFlowRuntime && typeof window.FarmaciaPatientFlowRuntime.decorateLinks === 'function') {
                window.FarmaciaPatientFlowRuntime.decorateLinks(document);
            }
        });

        return {
            getState: function (kind) { return importStates[kind] || null; },
            getImportedPatients: getImportedPatients,
            getBridgeReadModel: getBridgeReadModel,
            clearTransientPatientImports: clearTransientPatientImports,
            findImportedPatientByCip: findImportedPatientByCip,
            importFile: importFile,
            formatImportStatus: formatImportStatus
        };
    })();


    /* ── Visibilidad Enfermería WO8.1c.5 ─────────────────────────────── */

    /**
     * Normaliza un valor de campo prebiológico de Enfermería a etiqueta legible en español.
     */
    function normalizeEnfermeriaFieldValue(value) {
        var v = String(value || '').trim().toUpperCase();
        if (!v || v === '—' || v === '') return 'No informado';
        if (v === 'OK' || v === 'COMPLETO' || v === 'COMPLETADA' || v === 'COMPLETADO') return 'Completo';
        if (v === 'NEGATIVO' || v === 'NEGATIVA' || v === 'NEGATIVOS') return 'Completo';
        if (v === 'NO PRECISA' || v === 'NO_PRECISA' || v === 'NO APLICA' || v === 'N/A' || v === 'NA') return 'No precisa';
        if (v.indexOf('PENDIENT') !== -1) return 'Pendiente';
        if (v.indexOf('BLOQUEO') !== -1 || v.indexOf('ALTERADA') !== -1) return 'Bloqueo';
        if (v.indexOf('POSITIV') !== -1) return 'Positivo';
        return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
    }

    /**
     * Determina el campo de estado individual de un badge prebiológico.
     * 'completo' y 'no_precisa' cuentan como OK (no bloqueo).
     * 'pendiente' y 'bloqueo' cuentan como pendiente/bloqueo.
     */
    function getEnfermeriaFieldStatus(value) {
        var v = String(value || '').trim().toUpperCase();
        if (!v || v === '—') return 'no_informado';
        if (v === 'OK' || v === 'COMPLETO' || v === 'COMPLETADA' || v === 'COMPLETADO') return 'completo';
        if (v === 'NEGATIVO' || v === 'NEGATIVOS' || v === 'NEGATIVA') return 'completo';
        if (v === 'NO PRECISA' || v === 'NO_PRECISA') return 'no_aplica';
        if (v.indexOf('PENDIENT') !== -1) return 'pendiente';
        if (v.indexOf('BLOQUEO') !== -1 || v.indexOf('ALTERADA') !== -1) return 'bloqueo';
        if (v.indexOf('POSITIV') !== -1) return 'alerta';
        return 'no_informado';
    }

    /**
     * Obtiene los badges de estado prebiológico para un paciente de Enfermería.
     * Solo incluye campos con datos (ignora vacíos).
     * No incluye Hemograma, Bioquímica ni Analítica reciente (no existen en plantilla Enfermería).
     */
    function getEnfermeriaBadges(patient) {
        if (!patient) return [];
        var badges = [];
        var fields = [
            { key: 'analitica_estado', label: 'Analítica' },
            { key: 'mantoux_estado', label: 'Mantoux' },
            { key: 'igra_estado', label: 'IGRA' },
            { key: 'vhb_estado', label: 'VHB' },
            { key: 'vhc_estado', label: 'VHC' },
            { key: 'vih_estado', label: 'VIH' },
            { key: 'medicina_preventiva_estado', label: 'Med. Preventiva' }
        ];
        for (var i = 0; i < fields.length; i++) {
            var val = patient[fields[i].key];
            if (!val || String(val).trim() === '') continue;
            var display = normalizeEnfermeriaFieldValue(val);
            var status = getEnfermeriaFieldStatus(val);
            if (status === 'completo' || status === 'no_aplica') continue; // OK items no se muestran como badge
            badges.push({ label: fields[i].label, value: val, display: display, status: status });
        }
        return badges;
    }

    /**
     * Retorna todos los pacientes de Enfermería visibles en el Hub.
     * No filtra por estado de validación — todos los casos prebiológicos se muestran.
     */
    function getEnfermeriaVisiblePatients() {
        var all = getAvailablePatients();
        return all.filter(function (patient) {
            if (!patient) return false;
            if (patient.origen_solicitud === 'enfermeria') return true;
            if (patient.tipo_origen === 'enfermeria_inicio_biologico') return true;
            if (patient.source_type === 'ENFERMERIA') return true;
            return false;
        });
    }

    /**
     * Determina si un paciente proviene del circuito Enfermería / Inicio Biológico.
     */
    function isEnfermeriaPatient(patient) {
        if (!patient) return false;
        if (patient.origen_solicitud === 'enfermeria') return true;
        if (patient.tipo_origen === 'enfermeria_inicio_biologico') return true;
        if (patient.source_type === 'ENFERMERIA') return true;
        var source = String(patient.importSource || '').toLowerCase();
        if (source.indexOf('enfermer') !== -1) return true;
        return false;
    }

    function resolvePatientContextSwitch(currentCip, requestedCip, hasContext, confirmed) {
        var current = String(currentCip || '').trim().toUpperCase();
        var requested = String(requestedCip || '').trim().toUpperCase();
        if (current && current === requested) return { action: 'same', cip: currentCip };
        if (hasContext && confirmed === undefined) return { action: 'confirm', cip: requestedCip };
        if (hasContext && confirmed === false) return { action: 'cancel', cip: currentCip };
        return { action: 'switch', cip: requestedCip };
    }

    window.FarmaciaDemo = {
        patients,
        profesionales,
        patologiaPorServicio,
        qs,
        qsa,
        getQueryContext,
        makeContextUrl,
        setText,
        setValue,
        clearChildren,
        createField,
        renderFields,
        appendIconText,
        populateSelect,
        statusClass,
        STATES,
        DEMO_SESSION_NOTE,
        downloadFile,
        copyTextToClipboard,
        insertNoCipBanner,
        getAvailablePatients,
        getPendingValidationPatients,
        getPrebiologicoStatus,
        normalizePautaString: normalizePautaString,
        buildImportedPatientCandidate: buildImportedPatientCandidate,
        isPharmacyAct: isPharmacyAct,
        isValidationRequest: isValidationRequest,
        shouldAppearInValidationInbox: shouldAppearInValidationInbox,
        /* Enfermería / Inicio Biológico WO8.1c.3 */
        isEnfermeriaInicioBiologicoWorkbook: isEnfermeriaInicioBiologicoWorkbook,
        findEnfermeriaHeaderRow: findEnfermeriaHeaderRow,
        normalizeEnfermeriaInicioBiologicoRow: normalizeEnfermeriaInicioBiologicoRow,
        parseEnfermeriaInicioBiologicoSheet: parseEnfermeriaInicioBiologicoSheet,
        buildEnfermeriaHeaderMap: buildEnfermeriaHeaderMap,
        shouldEnfermeriaRowAppearInValidationInbox: shouldEnfermeriaRowAppearInValidationInbox,
        /* Visibilidad Enfermería WO8.1c.5 */
        normalizeEnfermeriaFieldValue: normalizeEnfermeriaFieldValue,
        getEnfermeriaFieldStatus: getEnfermeriaFieldStatus,
        getEnfermeriaBadges: getEnfermeriaBadges,
        getEnfermeriaVisiblePatients: getEnfermeriaVisiblePatients,
        isEnfermeriaPatient: isEnfermeriaPatient,
        resolvePatientContextSwitch: resolvePatientContextSwitch,
        findPatientByCip: function (cip) {
            return findAvailablePatientByCip(cip);
        }
    };
})();
