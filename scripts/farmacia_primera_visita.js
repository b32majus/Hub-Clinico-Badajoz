'use strict';

(function () {
    const F = window.FarmaciaDemo;
    var P = window.FarmaciaPautasCatalog;
    var pvAutocompleteActiveIndex = -1;

    function isTruthyRobust(value) {
        if (value === true || value === 1 || value === '1') return true;
        if (value === false || value === 0 || value === '0') return false;
        if (value === null || value === undefined || value === '') return false;
        var s = String(value).trim().toUpperCase();
        return s === 'TRUE' || s === 'SI' || s === 'SÍ' || s === 'YES' || s === '1';
    }

    function firstNonEmpty() {
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] == null) continue;
            var value = String(arguments[i]).trim();
            if (value) return value;
        }
        return '';
    }

    function assignObjects(target) {
        target = target || {};
        for (var i = 1; i < arguments.length; i++) {
            var source = arguments[i] || {};
            Object.keys(source).forEach(function (key) {
                target[key] = source[key];
            });
        }
        return target;
    }

    function getTreatmentHelper() {
        return window.FarmaciaTratamiento || null;
    }

    function getCurrentContext() {
        try {
            return F.getQueryContext ? F.getQueryContext() : {};
        } catch (e) {
            return {};
        }
    }

    function getCurrentSnapshot() {
        var catalog = getCatalog();
        if (!catalog) return null;
        return catalog.getSnapshot ? catalog.getSnapshot() : catalog.selectedSnapshot;
    }

    function resolvePrimaryRelation(ctx, snapshot) {
        if ((ctx && ctx.patient) || snapshot) return 'validado';
        return 'principal';
    }

    function buildFallbackTreatment(input) {
        return {
            tratamiento_id: input && input.tratamiento_id || '',
            paciente_cip: input && input.paciente_cip || '',
            farmaco_nombre: input && input.farmaco_nombre || '',
            nombre_comercial: input && input.nombre_comercial || '',
            principio_activo: input && input.principio_activo || '',
            dosis_valor: '',
            dosis_unidad: '',
            dosis_texto: input && input.dosis_texto || '',
            presentacion: input && input.presentacion || '',
            via: input && input.via || '',
            pauta: input && input.pauta || '',
            pauta_codigo: input && input.pauta_codigo || '',
            pauta_label: input && input.pauta_label || '',
            pauta_intervalo_dias: input && input.pauta_intervalo_dias != null ? input.pauta_intervalo_dias : null,
            pauta_unidad: input && input.pauta_unidad || '',
            pauta_otro_texto: input && input.pauta_otro_texto || '',
            tipo_relacion: input && input.tipo_relacion || '',
            estado_linea: input && input.estado_linea || '',
            tipo_movimiento: input && input.tipo_movimiento || '',
            fase_tratamiento: input && input.fase_tratamiento || '',
            fecha_inicio: input && input.fecha_inicio || '',
            fecha_fin: input && input.fecha_fin || '',
            motivo: input && input.motivo || '',
            observaciones: input && input.observaciones || '',
            fuente: input && input.fuente || '',
            source_type: input && input.source_type || '',
            selected_drug_id: input && input.selected_drug_id || '',
            codigo_nacional: input && input.codigo_nacional || '',
            nregistro: input && input.nregistro || '',
            es_principal: !!(input && input.es_principal),
            es_validado_farmacia: !!(input && input.es_validado_farmacia),
            snapshot_origen: input && input.snapshot_origen != null ? input.snapshot_origen : null
        };
    }

    function normalizePrimaryTreatment(input, options) {
        var treatmentHelper = getTreatmentHelper();
        if (treatmentHelper && typeof treatmentHelper.normalizeTreatmentInput === 'function') {
            return treatmentHelper.normalizeTreatmentInput(input || {}, options || {});
        }
        return buildFallbackTreatment(input || {});
    }

    function setTreatmentForm(treatment) {
        F.setValue('fhPvFarmaco', treatment.farmaco_nombre || treatment.nombre_comercial || '');
        F.setValue('fhPvDosis', treatment.dosis_texto || treatment.presentacion || '');
        F.setValue('fhPvVia', treatment.via || '');
        setPautaFromContext(treatment.pauta || treatment.pauta_label || treatment.pauta_otro_texto || '');
    }

    function clearTreatmentForm() {
        F.setValue('fhPvFarmaco', '');
        F.setValue('fhPvDosis', '');
        F.setValue('fhPvVia', '');
        setPautaFromContext('');
    }

    function hasMeaningfulTreatment(treatment) {
        if (!treatment) return false;
        return !!firstNonEmpty(
            treatment.farmaco_nombre,
            treatment.nombre_comercial,
            treatment.principio_activo,
            treatment.dosis_texto,
            treatment.presentacion,
            treatment.pauta,
            treatment.selected_drug_id
        );
    }

    function buildPrimaryTreatmentFromContext(ctx) {
        var sourceCtx = ctx || getCurrentContext() || {};
        var patient = sourceCtx.patient || null;
        var snapshot = getCurrentSnapshot();
        var relation = resolvePrimaryRelation(sourceCtx, snapshot);
        var treatmentHelper = getTreatmentHelper();
        var treatment = normalizePrimaryTreatment({
            paciente_cip: firstNonEmpty(sourceCtx.cip, patient && patient.cip, fv('fhPvCip')),
            farmaco_nombre: patient && patient.farmaco || '',
            nombre_comercial: patient && patient.farmaco || '',
            principio_activo: patient && (patient.principioActivo || patient.farmaco) || '',
            dosis_texto: patient && patient.dosis || '',
            presentacion: patient && patient.dosis || '',
            via: patient && patient.via || '',
            pauta: patient && patient.pauta || '',
            fecha_inicio: fv('fhPvFecha') || '',
            tipo_relacion: relation,
            es_principal: true,
            es_validado_farmacia: relation === 'validado',
            fuente: 'primera_visita',
            snapshot_origen: patient
        }, {
            paciente_cip: firstNonEmpty(sourceCtx.cip, patient && patient.cip, fv('fhPvCip')),
            fuente: 'primera_visita'
        });

        if (snapshot && treatmentHelper && typeof treatmentHelper.buildTreatmentSnapshot === 'function') {
            var snapshotTreatment = treatmentHelper.buildTreatmentSnapshot(snapshot, {
                paciente_cip: treatment.paciente_cip,
                fuente: 'primera_visita'
            });
            treatment = normalizePrimaryTreatment(assignObjects({}, snapshotTreatment, treatment, {
                paciente_cip: treatment.paciente_cip,
                tipo_relacion: relation,
                es_principal: true,
                es_validado_farmacia: relation === 'validado',
                fuente: 'primera_visita',
                principio_activo: firstNonEmpty(treatment.principio_activo, snapshotTreatment.principio_activo),
                dosis_texto: firstNonEmpty(treatment.dosis_texto, snapshotTreatment.dosis_texto),
                presentacion: firstNonEmpty(treatment.presentacion, snapshotTreatment.presentacion),
                via: firstNonEmpty(treatment.via, snapshotTreatment.via),
                pauta: firstNonEmpty(treatment.pauta, snapshotTreatment.pauta)
            }), {
                paciente_cip: treatment.paciente_cip,
                fuente: 'primera_visita'
            });
        }

        return treatment;
    }

    function buildPrimaryTreatmentFromSelection(drug, ctx) {
        var sourceCtx = ctx || getCurrentContext() || {};
        var treatmentHelper = getTreatmentHelper();
        var relation = resolvePrimaryRelation(sourceCtx, sourceCtx.patient ? {} : getCurrentSnapshot());
        var cip = firstNonEmpty(sourceCtx.cip, sourceCtx.patient && sourceCtx.patient.cip, fv('fhPvCip'));
        var base = {
            paciente_cip: cip,
            pauta: getPautaLabelForExport(),
            fecha_inicio: fv('fhPvFecha') || '',
            tipo_relacion: relation,
            es_principal: true,
            es_validado_farmacia: relation === 'validado',
            fuente: 'primera_visita'
        };
        if (treatmentHelper && typeof treatmentHelper.buildTreatmentFromCatalogSelection === 'function') {
            return normalizePrimaryTreatment(assignObjects({}, treatmentHelper.buildTreatmentFromCatalogSelection(drug, base), {
                paciente_cip: cip,
                pauta: firstNonEmpty(base.pauta, sourceCtx.patient && sourceCtx.patient.pauta),
                tipo_relacion: relation,
                es_principal: true,
                es_validado_farmacia: relation === 'validado',
                fuente: 'primera_visita'
            }), {
                paciente_cip: cip,
                fuente: 'primera_visita'
            });
        }
        return normalizePrimaryTreatment(assignObjects({}, base, {
            farmaco_nombre: drug && (drug.display_name || drug.nombre_comercial) || '',
            nombre_comercial: drug && drug.nombre_comercial || '',
            principio_activo: drug && drug.principio_activo || '',
            dosis_texto: drug && (drug.dosis || drug.nombre_presentacion) || '',
            presentacion: drug && drug.nombre_presentacion || '',
            via: drug && drug.via || '',
            source_type: drug && drug.source_type || '',
            selected_drug_id: drug && (drug.drug_id || drug.selected_drug_id) || '',
            codigo_nacional: drug && drug.codigo_nacional || '',
            nregistro: drug && drug.nregistro || '',
            snapshot_origen: drug || null
        }), {
            paciente_cip: cip,
            fuente: 'primera_visita'
        });
    }

    function getCurrentPrimaryTreatment(ctx) {
        var sourceCtx = ctx || getCurrentContext() || {};
        var snapshot = getCurrentSnapshot();
        var relation = resolvePrimaryRelation(sourceCtx, snapshot);
        var treatment = buildPrimaryTreatmentFromContext(sourceCtx);
        if (!hasMeaningfulTreatment(treatment)) {
            treatment = normalizePrimaryTreatment({
                paciente_cip: firstNonEmpty(fv('fhPvCip'), sourceCtx.cip, sourceCtx.patient && sourceCtx.patient.cip),
                tipo_relacion: relation,
                es_principal: true,
                es_validado_farmacia: relation === 'validado',
                fuente: 'primera_visita'
            }, {
                paciente_cip: firstNonEmpty(fv('fhPvCip'), sourceCtx.cip, sourceCtx.patient && sourceCtx.patient.cip),
                fuente: 'primera_visita'
            });
        }
        treatment = normalizePrimaryTreatment(assignObjects({}, treatment, {
            paciente_cip: firstNonEmpty(fv('fhPvCip'), treatment.paciente_cip, sourceCtx.cip, sourceCtx.patient && sourceCtx.patient.cip),
            farmaco_nombre: firstNonEmpty(fv('fhPvFarmaco'), treatment.farmaco_nombre, treatment.nombre_comercial),
            nombre_comercial: firstNonEmpty(fv('fhPvFarmaco'), treatment.nombre_comercial),
            principio_activo: firstNonEmpty(treatment.principio_activo),
            dosis_texto: firstNonEmpty(fv('fhPvDosis'), treatment.dosis_texto, treatment.presentacion),
            presentacion: firstNonEmpty(fv('fhPvDosis'), treatment.presentacion, treatment.dosis_texto),
            via: firstNonEmpty(fv('fhPvVia'), treatment.via),
            pauta: firstNonEmpty(getPautaLabelForExport(), treatment.pauta, treatment.pauta_label),
            tipo_relacion: relation,
            es_principal: true,
            es_validado_farmacia: relation === 'validado',
            fuente: 'primera_visita'
        }), {
            paciente_cip: firstNonEmpty(fv('fhPvCip'), treatment.paciente_cip, sourceCtx.cip, sourceCtx.patient && sourceCtx.patient.cip),
            fuente: 'primera_visita'
        });
        return treatment;
    }

    function applyContext(ctx) {
        F.setValue('fhPvCip', ctx.cip);
        F.setValue('fhPvServicio', ctx.servicio || ctx.patient?.servicio);
        F.setValue('fhPvPatologia', ctx.patologia || ctx.patient?.patologia);
        if (ctx.patient) {
            F.setValue('fhPvFechaValidacion', ctx.patient.fechaSolicitud);
            F.setValue('fhPvInduccionSolicitada', ctx.patient.estado === 'pending' ? 'Pendiente de confirmar' : 'No');
            F.setValue('fhPvAnalitica', ctx.patient.analitica);
            setTreatmentForm(buildPrimaryTreatmentFromContext(ctx));
        } else {
            clearTreatmentForm();
        }
        if (!ctx.cip && !ctx.patient) F.insertNoCipBanner('fhPvNoCipBanner');
    }

    function applyTratamientoValidado(ctx) {
        const container = document.getElementById('fhPvTratamientoGrid');
        if (!container) return;
        const treatmentHelper = getTreatmentHelper();
        const treatment = getCurrentPrimaryTreatment(ctx);
        F.clearChildren(container);
        if (!hasMeaningfulTreatment(treatment)) return;

        const summary = treatmentHelper && typeof treatmentHelper.buildTreatmentSummary === 'function'
            ? treatmentHelper.buildTreatmentSummary(treatment)
            : {
                titulo: treatment.farmaco_nombre || treatment.nombre_comercial || treatment.principio_activo || 'Tratamiento',
                subtitulo: [treatment.principio_activo, treatment.dosis_texto || treatment.presentacion, treatment.via, treatment.pauta].filter(Boolean).join(' · '),
                meta: []
            };

        const origen = treatment.source_type === 'CIMA' ? 'CIMA'
            : treatment.source_type === 'LOCAL' ? 'Local Especial'
            : treatment.source_type === 'LOCAL_PENDIENTE_DEMO' ? 'Demo/local pendiente'
            : (treatment.fuente || '—');
        const codigo = firstNonEmpty(treatment.codigo_nacional, treatment.nregistro, '—');
        const metaFlags = [];
        if (treatment.es_validado_farmacia) metaFlags.push('Validado');
        if (treatment.es_principal) metaFlags.push('Principal');
        if (treatment.selected_drug_id) metaFlags.push('Catálogo');

        const fields = [
            { label: 'Tratamiento principal', value: summary.titulo || '—' },
            { label: 'Principio activo', value: treatment.principio_activo || '—' },
            { label: 'Presentación / dosis', value: treatment.dosis_texto || treatment.presentacion || '—' },
            { label: 'Vía', value: treatment.via || '—' },
            { label: 'Pauta / intervalo', value: treatment.pauta || '—' },
            { label: 'Relación terapéutica', value: treatment.tipo_relacion || '—' },
            { label: 'Origen catálogo', value: origen },
            { label: 'Código nacional / n.º registro', value: codigo },
            { label: 'Resumen', value: summary.subtitulo || '—' },
            { label: 'Estado', value: metaFlags.length ? metaFlags.join(' · ') : '—' }
        ];
        F.renderFields(container, fields);
    }


    function applyContext(ctx) {
        F.setValue('fhPvCip', ctx.cip);
        F.setValue('fhPvServicio', ctx.servicio || ctx.patient?.servicio);
        F.setValue('fhPvPatologia', ctx.patologia || ctx.patient?.patologia);
        if (ctx.patient) {
            F.setValue('fhPvFarmaco', ctx.patient.farmaco);
            F.setValue('fhPvDosis', ctx.patient.dosis);
            setPautaFromContext(ctx.patient.pauta);
            F.setValue('fhPvVia', ctx.patient.via);
            F.setValue('fhPvFechaValidacion', ctx.patient.fechaSolicitud);
            F.setValue('fhPvInduccionSolicitada', ctx.patient.estado === 'pending' ? 'Pendiente de confirmar' : 'No');
            F.setValue('fhPvAnalitica', ctx.patient.analitica);
        }
        if (!ctx.cip && !ctx.patient) F.insertNoCipBanner('fhPvNoCipBanner');
    }

    function applyTratamientoValidado(ctx) {
        const container = document.getElementById('fhPvTratamientoGrid');
        if (!container) return;

        let C = null;
        let snapshot = null;
        try { C = window.FarmaciaCatalog; } catch (e) { /* noop */ }
        if (C) snapshot = C.getSnapshot ? C.getSnapshot() : C.selectedSnapshot;

        const fields = [];

        if (snapshot) {
            const st = (snapshot.source_type || '').toLowerCase();
            const origen = st === 'cima' ? 'CIMA'
                : st === 'local' || st === 'local_especial' ? 'Local Especial'
                : st === 'local_pendiente_demo' ? 'Demo/local pendiente' : '—';
            const codigo = snapshot.codigo_nacional_snapshot || snapshot.nregistro_snapshot || '—';

            const etiquetas = [];
            if (snapshot.etiquetas) {
                if (snapshot.etiquetas.es_hospitalario) etiquetas.push('HOSP');
                if (snapshot.etiquetas.biosimilar) etiquetas.push('BIO');
            }
            if (st === 'local' || st === 'local_especial') etiquetas.push('Local Especial');
            const etiquetasStr = etiquetas.length ? etiquetas.join(' · ') : '—';

            fields.push(
                { label: 'Fármaco / marca comercial', value: snapshot.nombre_snapshot || '—' },
                { label: 'Principio activo', value: snapshot.principio_activo_snapshot || '—' },
                { label: 'Presentación / dosis', value: snapshot.presentacion_snapshot || '—' },
                { label: 'Vía', value: snapshot.via_snapshot || '—' },
                { label: 'Pauta / intervalo', value: (ctx.patient && ctx.patient.pauta) || '—' },
                { label: 'Origen catálogo', value: origen },
                { label: 'Código nacional / n.º registro', value: codigo },
                { label: 'Etiquetas', value: etiquetasStr }
            );
        } else if (ctx.patient) {
            fields.push(
                { label: 'Fármaco / marca comercial', value: ctx.patient.farmaco || '—' },
                { label: 'Principio activo', value: ctx.patient.principioActivo || ctx.patient.farmaco || '—' },
                { label: 'Presentación / dosis', value: ctx.patient.dosis || '—' },
                { label: 'Vía', value: ctx.patient.via || '—' },
                { label: 'Pauta / intervalo', value: ctx.patient.pauta || '—' },
                { label: 'Origen catálogo', value: 'Demo' },
                { label: 'Código nacional / n.º registro', value: '—' },
                { label: 'Etiquetas', value: '—' }
            );
        }

        if (fields.length) F.renderFields(container, fields);
    }

    function fv(id) { const el = document.getElementById(id); return el ? (el.value || '').trim() : ''; }

    function populatePautaSelectPv(id, otroId) {
        var select = document.getElementById(id);
        var otro = document.getElementById(otroId);
        if (!select) return;
        F.clearChildren(select);
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Seleccionar...';
        select.appendChild(placeholder);
        if (P && typeof P.getPautaOptions === 'function') {
            P.getPautaOptions().forEach(function (opt) {
                var option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                select.appendChild(option);
            });
        } else {
            console.warn('[farmacia_primera_visita] FarmaciaPautasCatalog no disponible para poblar pautas.');
        }
        select.addEventListener('change', function () {
            if (otro) {
                otro.classList.toggle('hidden', select.value !== 'OTRO');
                if (select.value !== 'OTRO') otro.value = '';
            }
        });
    }

    function setPautaFromContext(value) {
        var select = document.getElementById('fhPvPauta');
        var otro = document.getElementById('fhPvPautaOtro');
        if (!select) return;
        var pautaObj = P && typeof P.normalizePautaLabel === 'function' ? P.normalizePautaLabel(value) : null;
        if (pautaObj && pautaObj.pauta_codigo) {
            select.value = pautaObj.pauta_codigo;
            if (pautaObj.pauta_codigo === 'OTRO' && otro) {
                otro.value = pautaObj.pauta_otro_texto || '';
                otro.classList.remove('hidden');
            } else if (otro) {
                otro.value = '';
                otro.classList.add('hidden');
            }
        } else {
            select.value = '';
            if (otro) {
                otro.value = '';
                otro.classList.add('hidden');
            }
        }
    }

    function getPautaLabelForExport() {
        var select = document.getElementById('fhPvPauta');
        var otro = document.getElementById('fhPvPautaOtro');
        if (!select || !select.value) return '';
        if (select.value === 'OTRO') return otro ? otro.value.trim() : '';
        var pauta = P && typeof P.getPautaByCodigo === 'function' ? P.getPautaByCodigo(select.value) : null;
        return P && typeof P.getLegacyPautaLabel === 'function' ? P.getLegacyPautaLabel(pauta) : select.value;
    }

    function getPautaObjectForExport() {
        var select = document.getElementById('fhPvPauta');
        var otro = document.getElementById('fhPvPautaOtro');
        if (!select || !select.value) return null;
        if (select.value === 'OTRO') {
            if (!(P && typeof P.getPautaByCodigo === 'function')) return null;
            var otroObj = P.getPautaByCodigo('OTRO');
            if (!otroObj) return null;
            var cloned = JSON.parse(JSON.stringify(otroObj));
            cloned.pauta_otro_texto = otro ? otro.value.trim() : '';
            return cloned;
        }
        return P && typeof P.getPautaByCodigo === 'function' ? P.getPautaByCodigo(select.value) : null;
    }

    // ---- T12: DLQI data and functions ----

    var DLQI_QUESTIONS = [
        { id: 1, text: 'Durante los últimos 7 días, ¿ha tenido la piel irritada, con picor, dolor o escozor?' },
        { id: 2, text: 'Durante los últimos 7 días, ¿se ha sentido incómodo/a o avergonzado/a por tener problemas en la piel?' },
        { id: 3, text: 'Durante los últimos 7 días, ¿han interferido sus problemas de piel en las actividades de compras o de cuidado de su casa o jardín?', sinRelacion: true },
        { id: 4, text: 'Durante los últimos 7 días, ¿han influido sus problemas de piel en la elección de la ropa que lleva?', sinRelacion: true },
        { id: 5, text: 'Durante los últimos 7 días, ¿han afectado sus problemas de piel a sus actividades sociales o de ocio?', sinRelacion: true },
        { id: 6, text: 'Durante los últimos 7 días, ¿le ha sido difícil practicar algún deporte a causa de sus problemas de piel?', sinRelacion: true },
        { id: 7, text: 'Durante los últimos 7 días, ¿sus problemas de piel le han impedido totalmente trabajar o estudiar?', special: true },
        { id: 8, text: 'Durante los últimos 7 días, ¿han interferido sus problemas de piel en su relación con su pareja, amigos o familiares?', sinRelacion: true },
        { id: 9, text: 'Durante los últimos 7 días, ¿le ha resultado difícil ir a la cama o dormir a causa de sus problemas de piel?', sinRelacion: true },
        { id: 10, text: 'Durante los últimos 7 días, ¿el tratamiento para su problemas de piel le ha causado problemas en su casa o le ha resultado molesto?', sinRelacion: true }
    ];

    var DLQI_STANDARD_OPTIONS = [
        { label: 'Mucho', value: 3 },
        { label: 'Bastante', value: 2 },
        { label: 'Un poco', value: 1 },
        { label: 'Nada', value: 0 }
    ];

    var DLQI_OPTIONS_WITH_NR = [
        { label: 'Mucho', value: 3 },
        { label: 'Bastante', value: 2 },
        { label: 'Un poco', value: 1 },
        { label: 'Nada', value: 0 },
        { label: 'Sin relación', value: 0 }
    ];

    var DLQI_Q7_FOLLOWUP = [
        { label: 'Bastante', value: 2 },
        { label: 'Un poco', value: 1 },
        { label: 'Nada', value: 0 },
        { label: 'Sin relación', value: 0 }
    ];

    function getDLQIInterpretation(total) {
        if (total <= 1) return 'Sin efecto sobre la calidad de vida';
        if (total <= 5) return 'Efecto leve sobre la calidad de vida';
        if (total <= 10) return 'Efecto moderado sobre la calidad de vida';
        if (total <= 20) return 'Efecto muy importante sobre la calidad de vida';
        return 'Efecto extremadamente importante sobre la calidad de vida';
    }

    function getDLQIAnswer(q) {
        if (q.special) {
            var aRadio = document.querySelector('input[name="dlqi_q7_a"]:checked');
            if (aRadio) {
                if (aRadio.getAttribute('data-dlqi-val') !== null) {
                    return { score: aRadio.getAttribute('data-dlqi-val'), text: 'Sí' };
                }
                var bRadio = document.querySelector('input[name="dlqi_q7_b"]:checked');
                if (bRadio) {
                    var bLabel = (bRadio.parentElement.textContent || '').trim();
                    return { score: bRadio.getAttribute('data-dlqi-val'), text: 'No — ' + bLabel };
                }
            }
        } else {
            var radio = document.querySelector('input[name="dlqi_q' + q.id + '"]:checked');
            if (radio) {
                var label = (radio.parentElement.textContent || '').trim();
                return { score: radio.getAttribute('data-dlqi-val'), text: label };
            }
        }
        return null;
    }

    function calculateDLQI() {
        var total = 0;
        var answered = 0;
        DLQI_QUESTIONS.forEach(function (q) {
            if (q.special) {
                var aRadio = document.querySelector('input[name="dlqi_q7_a"]:checked');
                if (aRadio) {
                    var val = aRadio.getAttribute('data-dlqi-val');
                    if (val !== null) {
                        total += parseInt(val, 10);
                        answered++;
                    } else {
                        var bRadio = document.querySelector('input[name="dlqi_q7_b"]:checked');
                        if (bRadio && bRadio.getAttribute('data-dlqi-val') !== null) {
                            total += parseInt(bRadio.getAttribute('data-dlqi-val'), 10);
                            answered++;
                        }
                    }
                }
            } else {
                var radio = document.querySelector('input[name="dlqi_q' + q.id + '"]:checked');
                if (radio) {
                    total += parseInt(radio.getAttribute('data-dlqi-val'), 10);
                    answered++;
                }
            }
        });
        var totalEl = document.getElementById('fhPvDlqiTotal');
        var interpEl = document.getElementById('fhPvDlqiInterp');
        if (totalEl) totalEl.textContent = String(total);
        if (interpEl) {
            interpEl.textContent = answered === DLQI_QUESTIONS.length
                ? ' — ' + getDLQIInterpretation(total)
                : ' — (responda todas las preguntas para ver la interpretación)';
        }
        return total;
    }

    function handleDLQIChange(e) {
        if (e.target.hasAttribute('data-dlqi-q7-trigger')) {
            var card = e.target.closest('.dlqi-card');
            if (card) {
                var followUp = card.querySelector('.dlqi-card__followup');
                if (followUp) {
                    followUp.classList.toggle('hidden');
                    if (followUp.classList.contains('hidden')) {
                        var radios = followUp.querySelectorAll('input[type="radio"]');
                        for (var i = 0; i < radios.length; i++) radios[i].checked = false;
                    }
                }
            }
        }
        calculateDLQI();
    }

    function createDLQIOption(qId, suffix, label, value, isQ7Trigger) {
        var wrapper = document.createElement('label');
        wrapper.className = 'dlqi-option';
        var input = document.createElement('input');
        input.type = 'radio';
        input.name = 'dlqi_q' + qId + (suffix ? '_' + suffix : '');
        input.setAttribute('data-dlqi-q', String(qId));
        if (typeof value === 'number') input.setAttribute('data-dlqi-val', String(value));
        if (isQ7Trigger) input.setAttribute('data-dlqi-q7-trigger', '');
        input.addEventListener('change', handleDLQIChange);
        wrapper.appendChild(input);
        wrapper.appendChild(document.createTextNode(' ' + label));
        return wrapper;
    }

    function renderDLQI() {
        var container = document.getElementById('fhPvDlqiQuestions');
        if (!container) return;
        F.clearChildren(container);

        var periodHeader = document.createElement('div');
        periodHeader.className = 'dlqi-period';
        periodHeader.textContent = 'DURANTE LOS ÚLTIMOS 7 DÍAS';
        container.appendChild(periodHeader);

        DLQI_QUESTIONS.forEach(function (q) {
            var card = document.createElement('div');
            card.className = 'dlqi-card';
            var qText = document.createElement('div');
            qText.className = 'dlqi-card__question';
            qText.textContent = q.id + '. ' + q.text;
            card.appendChild(qText);
            var optionsRow = document.createElement('div');
            optionsRow.className = 'dlqi-card__options';
            if (q.special) {
                optionsRow.appendChild(createDLQIOption(7, 'a', 'Sí', 3, false));
                optionsRow.appendChild(createDLQIOption(7, 'a', 'No', null, true));
                card.appendChild(optionsRow);
                var followUp = document.createElement('div');
                followUp.className = 'dlqi-card__followup hidden';
                var fuLabel = document.createElement('span');
                fuLabel.className = 'dlqi-card__followup-label';
                fuLabel.textContent = 'Durante los últimos 7 días, ¿le han molestado sus problemas de piel en su trabajo o en sus estudios?';
                followUp.appendChild(fuLabel);
                var fuOptions = document.createElement('div');
                fuOptions.className = 'dlqi-card__options dlqi-card__options--followup';
                DLQI_Q7_FOLLOWUP.forEach(function (opt) {
                    fuOptions.appendChild(createDLQIOption(7, 'b', opt.label, opt.value, false));
                });
                followUp.appendChild(fuOptions);
                card.appendChild(followUp);
            } else {
                var opts = q.sinRelacion ? DLQI_OPTIONS_WITH_NR : DLQI_STANDARD_OPTIONS;
                opts.forEach(function (opt) {
                    optionsRow.appendChild(createDLQIOption(q.id, null, opt.label, opt.value, false));
                });
                card.appendChild(optionsRow);
            }
            container.appendChild(card);
        });
    }

    function setupEVASliders() {
        var dolorRange = document.getElementById('fhPvEvaDolorRange');
        var dolorValue = document.getElementById('fhPvEvaDolorValue');
        var pruritoRange = document.getElementById('fhPvEvaPruritoRange');
        var pruritoValue = document.getElementById('fhPvEvaPruritoValue');
        if (dolorRange && dolorValue) {
            dolorRange.addEventListener('input', function () {
                dolorValue.textContent = this.value;
            });
        }
        if (pruritoRange && pruritoValue) {
            pruritoRange.addEventListener('input', function () {
                pruritoValue.textContent = this.value;
            });
        }
    }

    function setupPromsToggle() {
        var promsSelect = document.getElementById('fhPvProms');
        var expanded = document.getElementById('fhPvPromsExpanded');
        if (!promsSelect || !expanded) return;
        function toggle() {
            if (promsSelect.value === 'Sí') {
                expanded.classList.remove('hidden');
                calculateDLQI();
            } else {
                expanded.classList.add('hidden');
            }
        }
        promsSelect.addEventListener('change', toggle);
        toggle();
    }

    function getEVADolor() {
        var el = document.getElementById('fhPvEvaDolorValue');
        return el ? el.textContent : '—';
    }

    function getEVAPrurito() {
        var el = document.getElementById('fhPvEvaPruritoValue');
        return el ? el.textContent : '—';
    }

    function getDLQITotal() {
        var el = document.getElementById('fhPvDlqiTotal');
        return el ? el.textContent : '—';
    }

    function isPromsExpandedVisible() {
        var el = document.getElementById('fhPvPromsExpanded');
        return el && !el.classList.contains('hidden');
    }

    function getPromsBasal() {
        return fv('fhPvProms');
    }

    function getPrincipioActivo() {
        return getCurrentPrimaryTreatment().principio_activo || '';
    }

    function buildPVLines() {
        var treatment = getCurrentPrimaryTreatment();
        var pa = treatment.principio_activo || '';

        var lines = [];
        lines.push('=== INFORME DE PRIMERA VISITA FARMACIA ===');
        lines.push('Identificador demo: FH-PV-' + Date.now().toString(36).toUpperCase());
        lines.push('Fecha exportación: ' + new Date().toLocaleDateString('es-ES'));
        lines.push('');
        lines.push('CIP: ' + (fv('fhPvCip') || '—'));
        lines.push('Servicio: ' + (fv('fhPvServicio') || '—'));
        lines.push('Patología: ' + (fv('fhPvPatologia') || '—'));
        lines.push('Tratamiento validado: ' + (treatment.farmaco_nombre || treatment.nombre_comercial || '—'));
        lines.push('Principio activo: ' + (pa || '—'));
        lines.push('Presentación/dosis: ' + (treatment.dosis_texto || treatment.presentacion || '—'));
        lines.push('Vía: ' + (treatment.via || '—'));
        lines.push('Pauta: ' + (treatment.pauta || '—'));
        var meta = getSnapshotMetaForExport();
        if (meta) {
            lines.push('Código nacional: ' + (meta.codigo_nacional || '—'));
            lines.push('N.º registro: ' + (meta.nregistro || '—'));
            lines.push('Origen catálogo: ' + (meta.source_type || '—'));
            lines.push('ID fármaco seleccionado: ' + (meta.selected_drug_id || '—'));
        }
        lines.push('Inducción realizada: ' + (fv('fhPvInduccionRealizada') || '—'));
        lines.push('Fecha primera visita: ' + (fv('fhPvFecha') || '—'));
        lines.push('PROM basal: ' + (fv('fhPvProms') || '—'));
        if (getPromsBasal() === 'Sí' && isPromsExpandedVisible()) {
            lines.push('');
            lines.push('--- PROMs DLQI detallado ---');
            var anyDlqi = false;
            DLQI_QUESTIONS.forEach(function (q) {
                var ans = getDLQIAnswer(q);
                if (ans) {
                    anyDlqi = true;
                    lines.push('DLQI Q' + q.id + ': ' + ans.score + ' (' + ans.text + ')');
                }
            });
            if (!anyDlqi) lines.push('DLQI: sin respuestas registradas');
            lines.push('DLQI total: ' + getDLQITotal() + '/30');
            var interp = (document.getElementById('fhPvDlqiInterp') && document.getElementById('fhPvDlqiInterp').textContent || '').replace(/^ — /, '').trim();
            if (interp) lines.push('DLQI interpretación: ' + interp);
            lines.push('');
            lines.push('--- PROMs EVA ---');
            lines.push('EVA Dolor: ' + getEVADolor() + '/10');
            lines.push('EVA Prurito: ' + getEVAPrurito() + '/10');
        }
        lines.push('Observaciones: ' + (fv('fhPvNotas') || '—'));
        lines.push('');
        lines.push('=== FIN DEL INFORME ===');
        lines.push('Generado por: Hub Clínico Badajoz — Demo Farmacia v0.2');
        lines.push('ATENCIÓN: Datos sintéticos. No usar para decisiones clínicas reales.');
        return lines;
    }

    function searchCIP() {
        var cipInput = document.getElementById('fhPvCip');
        if (!cipInput) return;
        var cip = cipInput.value.trim();
        if (!cip) return;

        var patient = F.findPatientByCip(cip);
        clearCipNotice();

        if (!patient) {
            var fieldsToClear = ['fhPvServicio', 'fhPvPatologia', 'fhPvFechaValidacion', 'fhPvInduccionSolicitada', 'fhPvAnalitica'];
            for (var i = 0; i < fieldsToClear.length; i++) {
                var el = document.getElementById(fieldsToClear[i]);
                if (el) el.value = '';
            }
            clearTreatmentForm();
            var grid = document.getElementById('fhPvTratamientoGrid');
            if (grid) F.clearChildren(grid);
            var drugSearchInput = document.getElementById('fhPvDrugSearch');
            if (drugSearchInput) drugSearchInput.value = '';
            var C2 = getCatalog();
            if (C2 && C2.clearSnapshot) C2.clearSnapshot();
            showDrugAutocomplete();
            showCipNotice('Paciente no encontrado en demo. Puede completar los datos manualmente.', 'warning');
            return;
        }

        applyContext({ cip: patient.cip, patient: patient });

        var C = getCatalog();
        if (C && C.clearSnapshot) C.clearSnapshot();
        applyTratamientoValidado({ patient: patient, cip: patient.cip });

        showDrugAutocomplete();
        clearCipNotice();

        var banner = document.getElementById('fhPvNoCipBanner');
        if (banner) banner.parentNode.removeChild(banner);
    }

    function clearCipNotice() {
        var notice = document.getElementById('fhPvCipSearchNotice');
        if (notice) notice.parentNode.removeChild(notice);
    }

    function showCipNotice(msg, type) {
        var cipInput = document.getElementById('fhPvCip');
        if (!cipInput) return;
        var div = document.createElement('div');
        div.id = 'fhPvCipSearchNotice';
        div.className = 'notice-box notice-box--' + (type === 'warning' ? 'warning' : 'info');
        var icon = document.createElement('i');
        icon.className = type === 'warning' ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle';
        icon.setAttribute('aria-hidden', 'true');
        div.appendChild(icon);
        div.appendChild(document.createTextNode(' ' + msg));
        var fg = cipInput.closest('.form-group');
        if (fg) fg.insertAdjacentElement('afterend', div);
    }

    function showDrugAutocomplete() {
        var block = document.getElementById('fhPvAutocompleteBlock');
        if (block) block.classList.remove('hidden');
    }

    function hideDrugAutocomplete() {
        var block = document.getElementById('fhPvAutocompleteBlock');
        if (block) block.classList.add('hidden');
        clearDrugAutocompleteDropdown();
    }

    function getCatalog() {
        try { return window.FarmaciaCatalog; } catch (e) { return null; }
    }

    function clearDrugAutocompleteDropdown() {
        var dropdown = document.getElementById('fhPvAutocompleteDropdown');
        if (dropdown) {
            F.clearChildren(dropdown);
            dropdown.classList.add('hidden');
        }
        pvAutocompleteActiveIndex = -1;
    }

    function renderDrugAutocompleteDropdown(results) {
        var dropdown = document.getElementById('fhPvAutocompleteDropdown');
        if (!dropdown) return;
        F.clearChildren(dropdown);
        if (!results || results.length === 0) {
            dropdown.classList.add('hidden');
            return;
        }
        var maxResults = Math.min(results.length, 15);
        for (var i = 0; i < maxResults; i++) {
            var drug = results[i];
            var item = document.createElement('div');
            item.className = 'autocomplete-item';
            if (i === pvAutocompleteActiveIndex) item.classList.add('autocomplete-item--active');

            var mainRow = document.createElement('div');
            mainRow.className = 'autocomplete-item-main';

            var nameSpan = document.createElement('span');
            nameSpan.className = 'autocomplete-item-name';
            nameSpan.textContent = drug.display_name || drug.nombre_comercial || '\u2014';
            mainRow.appendChild(nameSpan);

            if (isTruthyRobust(drug.es_hospitalario)) {
                var hospTag = document.createElement('span');
                hospTag.className = 'drug-tag drug-tag--hosp';
                hospTag.textContent = 'HOSP';
                mainRow.appendChild(hospTag);
            }
            if (isTruthyRobust(drug.biosimilar)) {
                var bioTag = document.createElement('span');
                bioTag.className = 'drug-tag drug-tag--bio';
                bioTag.textContent = 'BIO';
                mainRow.appendChild(bioTag);
            }
            var sourceType = (drug.source_type || '').toLowerCase();
            var sourceTag = document.createElement('span');
            sourceTag.className = 'drug-source-tag drug-source-tag--' + (sourceType === 'cima' ? 'cima' : 'local');
            sourceTag.textContent = drug.source_type || '—';
            mainRow.appendChild(sourceTag);

            item.appendChild(mainRow);

            var detailRow = document.createElement('div');
            detailRow.className = 'autocomplete-item-detail';
            var parts = [];
            if (drug.principio_activo) parts.push(drug.principio_activo);
            if (drug.dosis) parts.push(drug.dosis);
            if (drug.via) parts.push(drug.via);
            if (drug.codigo_nacional) parts.push('CN ' + drug.codigo_nacional);
            detailRow.textContent = parts.join(' \u00B7 ');
            item.appendChild(detailRow);

            (function (d) {
                item.addEventListener('click', function () {
                    selectDrugPV(d);
                });
            })(drug);

            dropdown.appendChild(item);
        }
        dropdown.classList.remove('hidden');
        pvAutocompleteActiveIndex = -1;
    }

    function selectDrugPV(drug) {
        var C = getCatalog();
        if (!C || !drug) return;

        C.selectDrug(drug);
        var treatment = buildPrimaryTreatmentFromSelection(drug);
        setTreatmentForm(treatment);
        applyTratamientoValidado(getCurrentContext());

        clearDrugAutocompleteDropdown();
        var searchInput = document.getElementById('fhPvDrugSearch');
        if (searchInput) {
            searchInput.value = drug.display_name || drug.nombre_comercial || '';
        }
    }

    function handleDrugSearchInput() {
        var C = getCatalog();
        if (!C || !C.loaded) return;
        var input = document.getElementById('fhPvDrugSearch');
        if (!input) return;
        var query = input.value.trim();
        if (query.length < 2) {
            clearDrugAutocompleteDropdown();
            return;
        }
        var results = C.search(query);
        renderDrugAutocompleteDropdown(results);
    }

    function initDrugAutocomplete() {
        var input = document.getElementById('fhPvDrugSearch');
        if (!input) return;

        input.addEventListener('input', handleDrugSearchInput);
        input.addEventListener('keydown', function (event) {
            var dropdown = document.getElementById('fhPvAutocompleteDropdown');
            if (!dropdown || dropdown.classList.contains('hidden')) return;
            var items = dropdown.querySelectorAll('.autocomplete-item');
            if (items.length === 0) return;

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                pvAutocompleteActiveIndex = Math.min(pvAutocompleteActiveIndex + 1, items.length - 1);
                for (var k = 0; k < items.length; k++) {
                    items[k].classList.toggle('autocomplete-item--active', k === pvAutocompleteActiveIndex);
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                pvAutocompleteActiveIndex = Math.max(pvAutocompleteActiveIndex - 1, -1);
                for (var j = 0; j < items.length; j++) {
                    items[j].classList.toggle('autocomplete-item--active', j === pvAutocompleteActiveIndex);
                }
            } else if (event.key === 'Enter') {
                if (pvAutocompleteActiveIndex >= 0 && pvAutocompleteActiveIndex < items.length) {
                    event.preventDefault();
                    items[pvAutocompleteActiveIndex].click();
                }
            } else if (event.key === 'Escape') {
                clearDrugAutocompleteDropdown();
            }
        });

        input.addEventListener('blur', function () {
            setTimeout(function () {
                if (!document.activeElement || !document.getElementById('fhPvAutocompleteDropdown').contains(document.activeElement)) {
                    clearDrugAutocompleteDropdown();
                }
            }, 150);
        });

        var catalog = getCatalog();
        if (catalog) {
            catalog.autoLoad();
        }
    }

    function getSnapshotMetaForExport() {
        var treatment = getCurrentPrimaryTreatment();
        if (!treatment || !treatment.selected_drug_id) return null;
        return {
            codigo_nacional: treatment.codigo_nacional || '',
            nregistro: treatment.nregistro || '',
            source_type: treatment.source_type || '',
            selected_drug_id: treatment.selected_drug_id || ''
        };
    }

    function initCipSearch() {
        var cipInput = document.getElementById('fhPvCip');
        if (!cipInput) return;

        cipInput.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            searchCIP();
        });

        var btn = document.getElementById('fhPvCipSearchBtn');
        if (btn) btn.addEventListener('click', searchCIP);
    }

    function initTreatmentFormEvents() {
        ['fhPvFarmaco', 'fhPvDosis', 'fhPvVia', 'fhPvPautaOtro'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', function () {
                    applyTratamientoValidado(getCurrentContext());
                });
            }
        });
        var pautaSelect = document.getElementById('fhPvPauta');
        if (pautaSelect) {
            pautaSelect.addEventListener('change', function () {
                applyTratamientoValidado(getCurrentContext());
            });
        }
    }

    window.FarmaciaPrimeraVisita = {
        buildPrimaryTreatmentFromContext: buildPrimaryTreatmentFromContext,
        buildPrimaryTreatmentFromSelection: buildPrimaryTreatmentFromSelection,
        getCurrentPrimaryTreatment: getCurrentPrimaryTreatment
    };

    document.addEventListener('DOMContentLoaded', () => {
        const ctx = F.getQueryContext();

        if (!ctx.patient) {
            var C = window.FarmaciaCatalog;
            if (C && C.clearSnapshot) C.clearSnapshot();
        }

        populatePautaSelectPv('fhPvPauta', 'fhPvPautaOtro');
        applyContext(ctx);
        applyTratamientoValidado(ctx);
        renderDLQI();
        setupEVASliders();
        setupPromsToggle();
        initCipSearch();
        initDrugAutocomplete();
        initTreatmentFormEvents();

        showDrugAutocomplete();

        const exportTxt = document.getElementById('fhPvExportTxt');
        if (exportTxt) exportTxt.addEventListener('click', () => {
            F.downloadFile('primera_visita_FH_' + new Date().toISOString().slice(0, 10) + '.txt', buildPVLines().join('\n'), 'text/plain;charset=utf-8');
        });

        const exportCsv = document.getElementById('fhPvExportCsv');
        if (exportCsv) exportCsv.addEventListener('click', () => {
            var treatment = getCurrentPrimaryTreatment();
            var dlqiTotalExport = (getPromsBasal() === 'Sí' && isPromsExpandedVisible()) ? getDLQITotal() : '';
            var dlqiInterpExport = (getPromsBasal() === 'Sí' && isPromsExpandedVisible()) ? (document.getElementById('fhPvDlqiInterp') && document.getElementById('fhPvDlqiInterp').textContent || '').replace(/^ — /, '').trim() : '';
            var evaDolorExport = (getPromsBasal() === 'Sí' && isPromsExpandedVisible()) ? getEVADolor() : '';
            var evaPruritoExport = (getPromsBasal() === 'Sí' && isPromsExpandedVisible()) ? getEVAPrurito() : '';
            var meta = getSnapshotMetaForExport();
            var rows = [
                ['ID', 'FechaExportacion', 'CIP', 'Servicio', 'Patologia', 'TratamientoValidado', 'PrincipioActivo', 'PresentacionDosis', 'Pauta', 'PautaCodigo', 'PautaLabel', 'PautaIntervaloDias', 'PautaUnidad', 'PautaOtroTexto', 'Via', 'CodigoNacional', 'NRegistro', 'OrigenCatalogo', 'SelectedDrugId', 'FechaPrimeraVisita', 'InduccionRealizada', 'PROMBasal', 'DLQITotal', 'DLQIInterpretacion', 'EVADolor', 'EVAPrurito', 'Observaciones'],
                ['FH-PV-' + Date.now().toString(36).toUpperCase(), new Date().toLocaleDateString('es-ES'), fv('fhPvCip') || '—', fv('fhPvServicio') || '—', fv('fhPvPatologia') || '—', treatment.farmaco_nombre || treatment.nombre_comercial || '—', treatment.principio_activo || '—', treatment.dosis_texto || treatment.presentacion || '—', treatment.pauta || '—', treatment.pauta_codigo || '—', treatment.pauta_label || '—', treatment.pauta_intervalo_dias != null ? treatment.pauta_intervalo_dias : '—', treatment.pauta_unidad || '—', treatment.pauta_otro_texto || '—', treatment.via || '—', (meta && meta.codigo_nacional) || '—', (meta && meta.nregistro) || '—', (meta && meta.source_type) || '—', (meta && meta.selected_drug_id) || '—', fv('fhPvFecha') || '—', fv('fhPvInduccionRealizada') || '—', fv('fhPvProms') || '—', dlqiTotalExport || '—', dlqiInterpExport || '—', evaDolorExport || '—', evaPruritoExport || '—', fv('fhPvNotas') || '—']
            ];
            const csv = rows.map(function (row) {
                return row.map(function (cell) {
                    return '"' + String(cell).replace(/"/g, '""') + '"';
                }).join(',');
            }).join('\n');
            F.downloadFile('primeras_visitas_FH_' + new Date().toISOString().slice(0, 10) + '.csv', csv, 'text/csv;charset=utf-8');
        });
    });
})();
