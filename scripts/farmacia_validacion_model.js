'use strict';

/**
 * FarmaciaValidationModel — Modelo central de datos para la validación farmacoterapéutica.
 *
 * Extrae del DOM el estado de validación y expone normalizadores puros, constructores de payload
 * y el lector `readStateFromDom()` que reemplaza la lógica dispersa actualmente en
 * `scripts/farmacia_validacion.js`.
 *
 * @module FarmaciaValidationModel
 * @version 1.0.0
 * @since   2026-06-11
 *
 * Expuesto como `window.FarmaciaValidationModel`.
 */
(function () {
    /* ========================================================================
     * 1.  Helpers privados
     * ======================================================================== */

    /**
     * Selecciona un elemento por ID.
     * @param {string} id
     * @returns {HTMLElement|null}
     */
    function byId(id) {
        return document.getElementById(id);
    }

    /**
     * Obtiene el valor `.value` de un elemento, o `''` si no existe.
     * @param {string} id
     * @returns {string}
     */
    function getVal(id) {
        var el = byId(id);
        return (el && el.value !== undefined) ? el.value : '';
    }

    /**
     * Obtiene el valor trimmeado de un elemento, o `''` si no existe.
     * @param {string} id
     * @returns {string}
     */
    function getValTrim(id) {
        return getVal(id).trim();
    }

    /**
     * Devuelve `true` si el checkbox con `id` está checked.
     * @param {string} id
     * @returns {boolean}
     */
    function isChecked(id) {
        var el = byId(id);
        return !!el && !!el.checked;
    }

    /**
     * Devuelve el textContent trimmeado, o `''`.
     * @param {string} id
     * @returns {string}
     */
    function getText(id) {
        var el = byId(id);
        return (el && el.textContent) ? el.textContent.trim() : '';
    }

    /* ========================================================================
     * 2.  Normalizadores públicos
     * ======================================================================== */

    /**
     * Normaliza un valor potencialmente booleano desde strings multilingüe.
     *
     * @param {*} value - Valor a evaluar (boolean, number, string, null, undefined).
     * @returns {boolean}
     *
     * @example
     * isTruthyRobust('SI');   // true
     * isTruthyRobust('SÍ');   // true
     * isTruthyRobust('YES');  // true
     * isTruthyRobust('TRUE'); // true
     * isTruthyRobust('1');    // true
     * isTruthyRobust(true);   // true
     * isTruthyRobust(1);      // true
     * isTruthyRobust('NO');   // false
     * isTruthyRobust(null);   // false
     */
    function isTruthyRobust(value) {
        if (value === true || value === 1 || value === '1') return true;
        if (value === false || value === 0 || value === '0') return false;
        if (value === null || value === undefined || value === '') return false;
        var s = String(value).trim().toUpperCase();
        return s === 'TRUE' || s === 'SI' || s === 'S\u00CD' || s === 'YES' || s === '1';
    }

    /**
     * Mapea una vía de catálogo a las opciones del select de vía (SC, IV, Oral, Otra).
     *
     * @param {string} catalogVia - Vía proveniente del catálogo (ej. 'subcutánea', 'intravenosa').
     * @returns {string} Uno de: 'SC', 'IV', 'Oral', 'Otra'.
     */
    function mapViaToSelect(catalogVia) {
        var v = (catalogVia || '').toLowerCase();
        if (v.indexOf('subcut') !== -1 || v === 'sc') return 'SC';
        if (v.indexOf('intraven') !== -1 || v === 'iv') return 'IV';
        if (v.indexOf('oral') !== -1) return 'Oral';
        return 'Otra';
    }

    /**
     * Normaliza la etiqueta de estado de validación.
     *
     * @param {string} estado - Clave de estado ('pending', 'validated', 'denied').
     * @returns {string} Etiqueta legible: 'Pendiente', 'Validado', 'Denegado'.
     */
    function normalizeEstadoLabel(estado) {
        if (estado === 'validated') return 'Validado';
        if (estado === 'denied') return 'Denegado';
        return 'Pendiente';
    }

    /**
     * Escapa caracteres HTML básicos para prevenir XSS.
     *
     * @param {string} text - Texto a escapar.
     * @returns {string} Texto escapado.
     */
    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ========================================================================
     * 3.  Factory de estado inicial
     * ======================================================================== */

    /**
     * Crea y devuelve un objeto de estado inicial para la validación farmacoterapéutica.
     *
     * @returns {Object} Estado inicial completo con todas las secciones.
     */
    function createState() {
        return {
            modo: null,
            patient: {
                cip: '',
                servicio: '',
                patologia: '',
                fecha: '',
                farmaco: '',
                principioActivo: '',
                dosis: '',
                via: '',
                pauta: '',
                induccion: '',
                peso: '',
                justificacion: '',
                observaciones: '',
                analitica: ''
            },
            hsClinical: {
                ihs4: '',
                hurley: '',
                dlqi: '',
                localizacion: '',
                tiempoEvolucion: '',
                motivoClinico: ''
            },
            comorbilidades: {
                imc: '',
                tabaquismo: '',
                paquetesAno: '',
                diabetes: '',
                hba1c: '',
                sdMetabolico: '',
                otras: ''
            },
            tratamientosPrevios: {
                doxiClinda: false,
                rifClinda: false,
                otrosAb: false,
                otrosAbTexto: ''
            },
            biologicosPrevios: {
                adalimumab: false,
                adalimumabDuracion: '',
                adalimumabMotivo: '',
                otros: false,
                otrosFarmaco: '',
                otrosMotivo: ''
            },
            analitica: {
                fecha: '',
                reciente: '',
                hemograma: false,
                bioquimica: false,
                mantoux: '',
                serologiasVhb: '',
                serologiasVhc: '',
                serologiasVih: '',
                vacunacion: '',
                observaciones: ''
            },
            ea: {
                notificado: '',
                tipo: '',
                gravedad: '',
                accion: '',
                causalidad: '',
                criterios: {
                    temporal: false,
                    dechallenge: false,
                    rechallenge: false,
                    alternativa: false,
                    descrito: false,
                    dosis: false,
                    insuficiente: false
                }
            },
            concomitantes: [],
            validacion: {
                estado: '',
                cita: '',
                motivoDenegacion: '',
                observaciones: '',
                profesional: ''
            },
            catalogSnapshot: {
                drugId: '',
                sourceType: '',
                codigoNacional: '',
                nRegistro: '',
                nombreSnapshot: '',
                principioActivoSnapshot: '',
                presentacionSnapshot: '',
                viaSnapshot: ''
            }
        };
    }

    /* ========================================================================
     * 4.  Payload de exportación
     * ======================================================================== */

    /**
     * Construye un objeto plano con todos los campos del estado, listo para serializar
     * en exportaciones TXT/CSV.
     *
     * No genera strings de salida; solo devuelve el objeto estructurado con claves
     * legibles en español.
     *
     * @param {Object} state - Estado generado por `createState()` o `readStateFromDom()`.
     * @returns {Object} Payload plano con todos los campos aplanados.
     */
    function buildExportPayloadFromState(state) {
        if (!state) state = createState();

        var p = state.patient || {};
        var h = state.hsClinical || {};
        var c = state.comorbilidades || {};
        var t = state.tratamientosPrevios || {};
        var b = state.biologicosPrevios || {};
        var a = state.analitica || {};
        var e = state.ea || {};
        var ec = (e && e.criterios) ? e.criterios : {};
        var v = state.validacion || {};
        var cs = state.catalogSnapshot || {};
        var conc = state.concomitantes || [];

        var concomitantesCount = conc.length;
        var concomitantesResumen = '';
        if (conc.length > 0) {
            var parts = [];
            for (var i = 0; i < conc.length; i++) {
                var item = conc[i];
                var fn = item.nombre || '';
                var fpa = item.principioActivo || '';
                var fd = item.dosis || '';
                parts.push('Farmaco: ' + fn + '; PA: ' + fpa + '; Dosis: ' + fd);
            }
            concomitantesResumen = parts.join(' | ');
        }

        return {
            id: 'FH-' + Date.now().toString(36).toUpperCase(),
            fecha: new Date().toLocaleDateString('es-ES'),
            modo: state.modo || '',
            servicio: p.servicio || '',
            cip: p.cip || '',
            patologia: p.patologia || '',
            fechaSolicitud: p.fecha || '',
            farmacoSolicitado: p.farmaco || '',
            principioActivo: p.principioActivo || '',
            dosisPresentacion: p.dosis || '',
            via: p.via || '',
            pauta: p.pauta || '',
            induccionSolicitada: p.induccion || '',
            peso: p.peso || '',
            justificacionClinica: p.justificacion || '',
            observacionesOrigen: p.observaciones || '',
            analiticaCompat: p.analitica || '',

            hsIhs4: h.ihs4 || '',
            hsHurley: h.hurley || '',
            hsDlqi: h.dlqi || '',
            hsLocalizacion: h.localizacion || '',
            hsTiempoEvolucion: h.tiempoEvolucion || '',
            hsMotivoClinico: h.motivoClinico || '',

            comorbImc: c.imc || '',
            comorbTabaquismo: c.tabaquismo || '',
            comorbPaquetesAno: c.paquetesAno || '',
            comorbDiabetes: c.diabetes || '',
            comorbHba1c: c.hba1c || '',
            comorbSdMetabolico: c.sdMetabolico || '',
            comorbOtras: c.otras || '',

            ttoDoxiClinda: t.doxiClinda,
            ttoRifClinda: t.rifClinda,
            ttoOtrosAb: t.otrosAb,
            ttoOtrosAbTexto: t.otrosAbTexto || '',

            bioAda: b.adalimumab,
            bioAdaDuracion: b.adalimumabDuracion || '',
            bioAdaMotivo: b.adalimumabMotivo || '',
            bioOtros: b.otros,
            bioOtrosFarmaco: b.otrosFarmaco || '',
            bioOtrosMotivo: b.otrosMotivo || '',

            analiticaFecha: a.fecha || '',
            analiticaReciente: a.reciente || '',
            analiticaHemograma: a.hemograma,
            analiticaBioquimica: a.bioquimica,
            analiticaMantoux: a.mantoux || '',
            analiticaSerologiasVhb: a.serologiasVhb || '',
            analiticaSerologiasVhc: a.serologiasVhc || '',
            analiticaSerologiasVih: a.serologiasVih || '',
            analiticaVacunacion: a.vacunacion || '',
            analiticaObservaciones: a.observaciones || '',

            eaNotificado: e.notificado || '',
            eaTipo: e.tipo || '',
            eaGravedad: e.gravedad || '',
            eaAccion: e.accion || '',
            eaCausalidad: e.causalidad || '',
            eaCritTemporal: ec.temporal || false,
            eaCritDechallenge: ec.dechallenge || false,
            eaCritRechallenge: ec.rechallenge || false,
            eaCritAlternativa: ec.alternativa || false,
            eaCritDescrito: ec.descrito || false,
            eaCritDosis: ec.dosis || false,
            eaCritInsuficiente: ec.insuficiente || false,

            concomitantesCount: String(concomitantesCount),
            concomitantesResumen: concomitantesResumen,

            valEstado: v.estado || '',
            valEstadoLabel: normalizeEstadoLabel(v.estado),
            valCita: v.cita || '',
            valMotivoDenegacion: v.motivoDenegacion || '',
            valObservaciones: v.observaciones || '',
            valProfesional: v.profesional || '',

            snapDrugId: cs.drugId || '',
            snapSourceType: cs.sourceType || '',
            snapCodigoNacional: cs.codigoNacional || '',
            snapNRegistro: cs.nRegistro || '',
            snapNombre: cs.nombreSnapshot || '',
            snapPrincipioActivo: cs.principioActivoSnapshot || '',
            snapPresentacion: cs.presentacionSnapshot || '',
            snapVia: cs.viaSnapshot || ''
        };
    }

    /* ========================================================================
     * 5.  Lector del DOM
     * ======================================================================== */

    /**
     * Lee el DOM actual y devuelve un objeto de estado completo equivalente al
     * que devuelve `createState()`, pero poblado con los valores del formulario
     * de validación farmacoterapéutica.
     *
     * Usa los IDs ya existentes en `farmacia_validacion.html`.
     *
     * @returns {Object} Estado completo leído del DOM.
     */
    function readStateFromDom() {
        var state = createState();

        /* --- modo --- */
        state.modo = getValTrim('fhTipoSolicitud') || null;

        /* --- patient --- */
        state.patient.cip = getValTrim('fhDermaCip');
        state.patient.servicio = state.modo === 'reuma' ? 'Reumatología' : 'Dermatología';
        state.patient.patologia = state.modo === 'reuma'
            ? 'Artritis Reumatoide (AR)'
            : getValTrim('fhDermaPatologia');
        state.patient.fecha = getValTrim('fhDermaFecha');
        state.patient.farmaco = state.modo === 'reuma'
            ? 'Adalimumab 40 mg'
            : getValTrim('fhDermaFarmaco');
        state.patient.principioActivo = state.modo === 'reuma'
            ? 'Adalimumab'
            : getValTrim('fhDermaPrincipioActivo');
        state.patient.dosis = state.modo === 'reuma'
            ? '40 mg'
            : getValTrim('fhDermaDosis');
        state.patient.via = state.modo === 'reuma'
            ? 'SC'
            : getValTrim('fhDermaVia');
        state.patient.pauta = state.modo === 'reuma'
            ? 'SC / cada 2 semanas'
            : getValTrim('fhDermaPauta');
        state.patient.induccion = getValTrim('fhDermaInduccion');
        state.patient.peso = getValTrim('fhDermaPeso');
        state.patient.justificacion = getValTrim('fhDermaJustificacion');
        state.patient.observaciones = getValTrim('fhDermaObservaciones');
        state.patient.analitica = getValTrim('fhDermaAnalitica');

        /* --- hsClinical --- */
        state.hsClinical.ihs4 = getValTrim('fhHSIhs4');
        state.hsClinical.hurley = getValTrim('fhHSHurley');
        state.hsClinical.dlqi = getValTrim('fhHSDlqi');
        state.hsClinical.localizacion = getValTrim('fhHSLocalizacion');
        state.hsClinical.tiempoEvolucion = getValTrim('fhHSTiempoEvolucion');
        state.hsClinical.motivoClinico = getValTrim('fhHSMotivoClinico');

        /* --- comorbilidades --- */
        state.comorbilidades.imc = getValTrim('fhHSComorbImc');
        state.comorbilidades.tabaquismo = getValTrim('fhHSComorbTabaquismo');
        state.comorbilidades.paquetesAno = getValTrim('fhHSComorbPaquetes');
        state.comorbilidades.diabetes = getValTrim('fhHSComorbDiabetes');
        state.comorbilidades.hba1c = getValTrim('fhHSComorbHba1c');
        state.comorbilidades.sdMetabolico = getValTrim('fhHSComorbSdMetabolico');
        state.comorbilidades.otras = getValTrim('fhHSComorbOtras');

        /* --- tratamientosPrevios --- */
        state.tratamientosPrevios.doxiClinda = isChecked('fhHSTtoDoxiClinda');
        state.tratamientosPrevios.rifClinda = isChecked('fhHSTtoRifClinda');
        state.tratamientosPrevios.otrosAb = isChecked('fhHSTtoOtrosAb');
        state.tratamientosPrevios.otrosAbTexto = getValTrim('fhHSTtoOtrosAbTxt');

        /* --- biologicosPrevios --- */
        state.biologicosPrevios.adalimumab = isChecked('fhHSBioAda');
        state.biologicosPrevios.adalimumabDuracion = getValTrim('fhHSBioAdaDuracion');
        state.biologicosPrevios.adalimumabMotivo = getValTrim('fhHSBioAdaMotivo');
        state.biologicosPrevios.otros = isChecked('fhHSBioOtros');
        state.biologicosPrevios.otrosFarmaco = getValTrim('fhHSBioOtrosFarmaco');
        state.biologicosPrevios.otrosMotivo = getValTrim('fhHSBioOtrosMotivo');

        /* --- analitica --- */
        state.analitica.fecha = getValTrim('fhAnaliticaFecha');
        state.analitica.reciente = getValTrim('fhAnaliticaReciente');
        state.analitica.hemograma = isChecked('fhAnaliticaHemograma');
        state.analitica.bioquimica = isChecked('fhAnaliticaBioquimica');
        state.analitica.mantoux = getValTrim('fhAnaliticaMantoux');
        state.analitica.serologiasVhb = getValTrim('fhAnaliticaSerologiasVhb');
        state.analitica.serologiasVhc = getValTrim('fhAnaliticaSerologiasVhc');
        state.analitica.serologiasVih = getValTrim('fhAnaliticaSerologiasVih');
        state.analitica.vacunacion = getValTrim('fhAnaliticaVacunacion');
        state.analitica.observaciones = getValTrim('fhAnaliticaObservaciones');

        /* --- ea --- */
        state.ea.notificado = getValTrim('fhEaNotificado');
        state.ea.tipo = getValTrim('fhEaTipo');
        state.ea.gravedad = getValTrim('fhEaGravedad');
        state.ea.accion = getValTrim('fhEaAccion');
        state.ea.causalidad = getValTrim('fhEaCausalidad');
        state.ea.criterios.temporal = isChecked('fhEaCritTemporal');
        state.ea.criterios.dechallenge = isChecked('fhEaCritDechallenge');
        state.ea.criterios.rechallenge = isChecked('fhEaCritRechallenge');
        state.ea.criterios.alternativa = isChecked('fhEaCritAlternativa');
        state.ea.criterios.descrito = isChecked('fhEaCritDescrito');
        state.ea.criterios.dosis = isChecked('fhEaCritDosis');
        state.ea.criterios.insuficiente = isChecked('fhEaCritInsuficiente');

        /* --- concomitantes --- */
        var concomRows = document.querySelectorAll('.concomitante-row');
        state.concomitantes = [];
        for (var ri = 0; ri < concomRows.length; ri++) {
            var row = concomRows[ri];
            state.concomitantes.push({
                nombre: (row.querySelector('.concomitante-nombre') || {}).value || '',
                principioActivo: (row.querySelector('.concomitante-pa') || {}).value || '',
                dosis: (row.querySelector('.concomitante-dosis') || {}).value || '',
                via: (row.querySelector('.concomitante-via') || {}).value || '',
                pauta: (row.querySelector('.concomitante-pauta') || {}).value || '',
                motivo: (row.querySelector('.concomitante-motivo') || {}).value || ''
            });
        }

        /* --- validacion --- */
        state.validacion.estado = getValTrim('fhValEstado');
        state.validacion.cita = getValTrim('fhValCita');
        state.validacion.motivoDenegacion = getValTrim('fhValMotivo');
        state.validacion.observaciones = getValTrim('fhValObservaciones');
        state.validacion.profesional = getText('fhValFarmaceutico');

        /* --- catalogSnapshot --- */
        var snap = (typeof window.FarmaciaCatalog !== 'undefined' && window.FarmaciaCatalog.getSnapshot)
            ? window.FarmaciaCatalog.getSnapshot()
            : null;
        if (snap) {
            state.catalogSnapshot.drugId = snap.selected_drug_id || snap.drug_id || '';
            state.catalogSnapshot.sourceType = snap.source_type || '';
            state.catalogSnapshot.codigoNacional = snap.codigo_nacional_snapshot || '';
            state.catalogSnapshot.nRegistro = snap.nregistro_snapshot || '';
            state.catalogSnapshot.nombreSnapshot = snap.nombre_snapshot || '';
            state.catalogSnapshot.principioActivoSnapshot = snap.principio_activo_snapshot || '';
            state.catalogSnapshot.presentacionSnapshot = snap.presentacion_snapshot || '';
            state.catalogSnapshot.viaSnapshot = snap.via_snapshot || '';
        }

        return state;
    }

    /* ========================================================================
     * 6.  Exposición pública
     * ======================================================================== */

    window.FarmaciaValidationModel = {
        createState: createState,
        isTruthyRobust: isTruthyRobust,
        mapViaToSelect: mapViaToSelect,
        normalizeEstadoLabel: normalizeEstadoLabel,
        escapeHtml: escapeHtml,
        buildExportPayloadFromState: buildExportPayloadFromState,
        readStateFromDom: readStateFromDom
    };
})();
