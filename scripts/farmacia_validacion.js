'use strict';

(function () {
    const F = window.FarmaciaDemo;
    const C = window.FarmaciaCatalog;
    const M = window.FarmaciaValidationModel;
    let modoActual = null;
    var autocompleteActiveIndex = -1;

    function isHSPathology() {
        return modoActual === 'derma' && document.getElementById('fhDermaPatologia').value === 'Hidradenitis supurativa';
    }

    function toggleHSBlock() {
        document.getElementById('formHS').classList.toggle('hidden', !isHSPathology());
        let note = document.getElementById('fhHSOtherNote');
        if (!note) {
            note = document.createElement('p');
            note.id = 'fhHSOtherNote';
            note.className = 'pathology-demo-note';
            document.getElementById('formDerma').appendChild(note);
        }
        const patologia = document.getElementById('fhDermaPatologia').value;
        const showNote = modoActual === 'derma' && patologia && patologia !== 'Hidradenitis supurativa';
        note.textContent = showNote ? 'Demo activa: bloque específico parametrizado para HS. Resto de patologías incluidas en plantilla Dermatología → Farmacia pendiente de parametrización.' : '';
        note.classList.toggle('hidden', !showNote);
        toggleBioAdaDetalle();
        toggleBioOtrosDetalle();
    }

    function toggleBioAdaDetalle() {
        const cb = document.getElementById('fhHSBioAda');
        const detalle = document.getElementById('fhHSBioAdaDetalle');
        if (cb && detalle) detalle.classList.toggle('hidden', !cb.checked);
    }

    function toggleBioOtrosDetalle() {
        const cb = document.getElementById('fhHSBioOtros');
        const detalle = document.getElementById('fhHSBioOtrosDetalle');
        if (cb && detalle) detalle.classList.toggle('hidden', !cb.checked);
    }

    function toggleOtrosAtbDetalle() {
        const cb = document.getElementById('fhHSTtoOtrosAb');
        const row = document.getElementById('fhHSTtoOtrosAbTxtRow');
        if (cb && row) {
            row.classList.toggle('hidden', !cb.checked);
            if (!cb.checked) {
                document.getElementById('fhHSTtoOtrosAbTxt').value = '';
            }
        }
    }

    function mostrarFormulario(modo) {
        modoActual = modo;
        document.getElementById('formDerma').classList.toggle('hidden', modo !== 'derma');
        document.getElementById('formReuma').classList.toggle('hidden', modo !== 'reuma');
        document.getElementById('validationBlock').classList.remove('hidden');
        if (modo === 'derma' && !document.getElementById('fhDermaFecha').value) {
            document.getElementById('fhDermaFecha').value = new Date().toISOString().slice(0, 10);
        }
        toggleHSBlock();
    }

    function applyContext() {
        const context = F.getQueryContext();
        if (context.cip) F.setValue('fhDermaCip', context.cip);
        if (context.servicioSlug === 'reumatologia' || context.servicio === 'reumatologia') mostrarFormulario('reuma');
        else if (context.cip || context.servicio || context.patologia) mostrarFormulario('derma');
        if (context.patologia) F.setValue('fhDermaPatologia', context.patologia);
        if (context.patient) {
            var p = context.patient;
            F.setValue('fhDermaFarmaco', p.farmaco);
            F.setValue('fhDermaDosis', p.dosis);
            F.setValue('fhDermaPauta', p.pauta);
            F.setValue('fhDermaVia', p.via);
            F.setValue('fhDermaAnalitica', p.analitica);
            if (p.estado === 'pending') F.setValue('fhValEstado', 'pending');
            if (p.ihs4 !== undefined) F.setValue('fhHSIhs4', p.ihs4);
            if (p.hurley) F.setValue('fhHSHurley', p.hurley);
            if (p.dlqi !== undefined) F.setValue('fhHSDlqi', p.dlqi);
            if (p.localizacion) F.setValue('fhHSLocalizacion', p.localizacion);
            if (p.tiempoEvolucion) F.setValue('fhHSTiempoEvolucion', p.tiempoEvolucion);
            if (p.tratamientosPrevios) F.setValue('fhHSTratamientosPrevios', p.tratamientosPrevios);
            if (p.motivoClinico) F.setValue('fhHSMotivoClinico', p.motivoClinico);
            if (p.principioActivo) F.setValue('fhDermaPrincipioActivo', p.principioActivo);

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
        if (modoActual) {
            document.getElementById('fhTipoSolicitud').value = modoActual;
        }
        toggleHSBlock();
    }

    function selectedCip() {
        return modoActual === 'reuma' ? 'CIP-DEMO-FH-003' : (document.getElementById('fhDermaCip').value.trim() || 'CIP-DEMO-FH-XXX');
    }

    function selectedPatologia() {
        return modoActual === 'reuma' ? 'Artritis Reumatoide (AR)' : (document.getElementById('fhDermaPatologia').value || '—');
    }

    function estadoLabel() {
        return M.normalizeEstadoLabel(document.getElementById('fhValEstado').value);
    }

    function getCheckedLabels(ids) {
        return ids.filter(function (id) {
            const el = document.getElementById(id);
            return el && el.checked;
        }).map(function (id) {
            const el = document.getElementById(id);
            const parentLabel = el.parentElement;
            return parentLabel.textContent.trim();
        });
    }

    function setChecked(id, value) {
        var el = document.getElementById(id);
        if (el) el.checked = !!value;
    }

    function initAnaliticaChips() {
        var groups = document.querySelectorAll('[data-chip-target]');
        groups.forEach(function (group) {
            var targetId = group.getAttribute('data-chip-target');
            var radios = group.querySelectorAll('input[type="radio"]');
            radios.forEach(function (radio) {
                radio.addEventListener('change', function () {
                    var hidden = document.getElementById(targetId);
                    if (hidden) hidden.value = this.value;
                });
            });
            var hidden = document.getElementById(targetId);
            if (hidden && hidden.value) {
                var matching = group.querySelector('input[type="radio"][value="' + hidden.value.replace(/"/g, '&quot;') + '"]');
                if (matching) matching.checked = true;
            }
        });
    }

    function buildValidationLines() {
        var state = M.readStateFromDom();
        var p = state.patient || {};
        var lines = [];

        lines.push('=== INFORME DE VALIDACIÓN FARMACOTERAPÉUTICA ===');
        lines.push('Identificador demo: FH-VAL-' + Date.now().toString(36).toUpperCase());
        lines.push('Fecha: ' + new Date().toLocaleDateString('es-ES'));
        lines.push('');

        if (state.modo === 'reuma') {
            lines.push('Servicio origen: Reumatología');
            lines.push('CIP: CIP-DEMO-FH-003');
            lines.push('Patología: Artritis Reumatoide (AR)');
            lines.push('Indicación: Tratamiento biológico de primera línea');
            lines.push('Origen / circuito: Consulta Reumatología');
            lines.push('Fecha solicitud: 2026-03-15');
            lines.push('Fármaco solicitado: Adalimumab 40 mg');
            lines.push('Dosis solicitada: 40 mg');
            lines.push('Vía: SC');
            lines.push('Intervalo / pauta: SC / cada 2 semanas');
        } else {
            lines.push('Servicio origen: Dermatología');
            lines.push('CIP: ' + (p.cip || selectedCip()));
            lines.push('Patología: ' + (p.patologia || selectedPatologia()));
            lines.push('Fecha solicitud: ' + (p.fecha || '—'));
            var farmaco = p.farmaco || '—';
            var principio = p.principioActivo || '';
            lines.push('Fármaco solicitado (marca): ' + farmaco);
            if (principio) lines.push('Principio activo / molécula: ' + principio);
            lines.push('Dosis solicitada: ' + (p.dosis || '—'));
            lines.push('Vía: ' + (p.via || '—'));
            lines.push('Intervalo / pauta: ' + (p.pauta || '—'));
            lines.push('Inducción: ' + (p.induccion || '—'));
            lines.push('Peso: ' + (p.peso || '—'));
        }

        var cs = state.catalogSnapshot || {};
        var hasSnapshot = cs.sourceType || cs.drugId || cs.nombreSnapshot || cs.principioActivoSnapshot || cs.presentacionSnapshot || cs.viaSnapshot || cs.codigoNacional || cs.nRegistro;
        if (hasSnapshot) {
            lines.push('');
            lines.push('--- Snapshot catálogo farmacológico ---');
            lines.push('Nombre snapshot: ' + (cs.nombreSnapshot || '—'));
            lines.push('Principio activo snapshot: ' + (cs.principioActivoSnapshot || '—'));
            lines.push('Presentación snapshot: ' + (cs.presentacionSnapshot || '—'));
            lines.push('Vía snapshot: ' + (cs.viaSnapshot || '—'));
            lines.push('Código nacional: ' + (cs.codigoNacional || '—'));
            lines.push('Nº registro: ' + (cs.nRegistro || '—'));
            lines.push('Origen / source type: ' + (cs.sourceType || '—'));
            lines.push('ID seleccionado: ' + (cs.drugId || '—'));
        }

        var isHS = state.modo === 'derma' && p.patologia === 'Hidradenitis supurativa';
        if (isHS) {
            var h = state.hsClinical || {};
            lines.push('');
            lines.push('--- Datos clínicos de origen — Hidradenitis supurativa ---');
            lines.push('IHS4: ' + (h.ihs4 || '—'));
            lines.push('Hurley: ' + (h.hurley || '—'));
            lines.push('DLQI: ' + (h.dlqi || '—'));
            lines.push('Localización principal: ' + (h.localizacion || '—'));
            lines.push('Tiempo evolución: ' + (h.tiempoEvolucion || '—'));

            lines.push('');
            lines.push('--- Tratamientos previos ---');
            var t = state.tratamientosPrevios || {};
            lines.push((t.doxiClinda ? '[X]' : '[ ]') + ' Doxiciclina / Clindamicina');
            lines.push((t.rifClinda ? '[X]' : '[ ]') + ' Rifampicina + Clindamicina');
            lines.push((t.otrosAb ? '[X]' : '[ ]') + ' Otros ATB');
            if (t.otrosAbTexto && t.otrosAb) lines.push('  Especificar otros ATB: ' + t.otrosAbTexto);

            lines.push('');
            lines.push('--- Biológicos previos ---');
            var b = state.biologicosPrevios || {};
            lines.push((b.adalimumab ? '[X]' : '[ ]') + ' Adalimumab');
            if (b.adalimumab) {
                lines.push('  Duración: ' + (b.adalimumabDuracion || '—'));
                lines.push('  Motivo fin: ' + (b.adalimumabMotivo || '—'));
            }
            lines.push((b.otros ? '[X]' : '[ ]') + ' Otros biológicos');
            if (b.otros) {
                lines.push('  Fármaco: ' + (b.otrosFarmaco || '—'));
                lines.push('  Motivo suspensión: ' + (b.otrosMotivo || '—'));
            }

            lines.push('');
            lines.push('--- Comorbilidades ---');
            var c = state.comorbilidades || {};
            lines.push('IMC: ' + (c.imc || '—'));
            lines.push('Tabaquismo: ' + (c.tabaquismo || '—'));
            if (c.paquetesAno) lines.push('Paquetes/año: ' + c.paquetesAno);
            lines.push('Diabetes: ' + (c.diabetes || '—'));
            if (c.hba1c) lines.push('HbA1c: ' + c.hba1c + '%');
            lines.push('Síndrome metabólico: ' + (c.sdMetabolico || '—'));
            if (c.otras) lines.push('Otras comorbilidades: ' + c.otras);

            lines.push('');
            lines.push('Motivo clínico / línea terapéutica: ' + (h.motivoClinico || '—'));
        }

        if (state.modo === 'derma') {
            var a = state.analitica || {};
            lines.push('');
            lines.push('--- Analítica y vacunación ---');
            lines.push('Fecha analítica: ' + (a.fecha || '—'));
            lines.push('Analítica <3 meses: ' + (a.reciente || '—'));
            lines.push('Hemograma: ' + (a.hemograma ? 'Verificado' : 'No verificado'));
            lines.push('Bioquímica: ' + (a.bioquimica ? 'Verificado' : 'No verificado'));
            lines.push('Mantoux/IGRA: ' + (a.mantoux || '—'));
            lines.push('VHB: ' + (a.serologiasVhb || '—'));
            lines.push('VHC: ' + (a.serologiasVhc || '—'));
            lines.push('VIH: ' + (a.serologiasVih || '—'));
            lines.push('Vacunación: ' + (a.vacunacion || '—'));
            if (a.observaciones) lines.push('Observaciones vacunación: ' + a.observaciones);
        }

        var e = state.ea || {};
        var ec = e.criterios || {};
        lines.push('');
        lines.push('--- Evaluación de causalidad del efecto adverso ---');
        lines.push('EA notificado: ' + (e.notificado || '—'));
        lines.push('Tipo EA: ' + (e.tipo || '—'));
        lines.push('Gravedad: ' + (e.gravedad || '—'));
        lines.push('Acción: ' + (e.accion || '—'));
        lines.push('Causalidad: ' + (e.causalidad || '—'));
        if (ec.temporal) lines.push('  [X] Relación temporal');
        if (ec.dechallenge) lines.push('  [X] Dechallenge positivo');
        if (ec.rechallenge) lines.push('  [X] Rechallenge positivo');
        if (ec.alternativa) lines.push('  [X] Sin alternativa más probable');
        if (ec.descrito) lines.push('  [X] EA descrito en ficha técnica');
        if (ec.dosis) lines.push('  [X] Relación dosis-respuesta');
        if (ec.insuficiente) lines.push('  [X] Evidencia insuficiente');

        var conc = state.concomitantes || [];
        lines.push('');
        lines.push('--- Tratamientos concomitantes / otros biológicos ---');
        if (conc.length > 0) {
            for (var ri = 0; ri < conc.length; ri++) {
                var item = conc[ri];
                lines.push('Fármaco ' + (ri + 1) + ': ' + (item.nombre || '—'));
                lines.push('  PA: ' + (item.principioActivo || '—'));
                lines.push('  Dosis: ' + (item.dosis || '—'));
                lines.push('  Vía: ' + (item.via || '—'));
                lines.push('  Pauta: ' + (item.pauta || '—'));
                lines.push('  Motivo: ' + (item.motivo || '—'));
            }
        } else {
            lines.push('No hay otros fármacos registrados.');
        }

        var v = state.validacion || {};
        lines.push('');
        lines.push('Estado validación: ' + M.normalizeEstadoLabel(v.estado));
        var motivoDeneg = v.motivoDenegacion || '';
        if (motivoDeneg) lines.push('Motivo denegación: ' + motivoDeneg);
        if (v.cita) lines.push('Fecha cita Farmacia: ' + v.cita);
        lines.push('Farmacéutico responsable: ' + (v.profesional || '—'));
        if (v.observaciones) lines.push('Observaciones: ' + v.observaciones);
        lines.push('');
        lines.push('=== FIN DEL INFORME ===');
        lines.push('Generado por: Hub Clínico Badajoz — Demo Farmacia v0.2');
        lines.push('ATENCIÓN: Datos sintéticos. No usar para decisiones clínicas reales.');
        return lines;
    }

    function selectDrug(drug) {
        document.getElementById('fhDermaFarmaco').value = drug.display_name || drug.nombre_comercial || '';
        document.getElementById('fhDermaPrincipioActivo').value = drug.principio_activo || '';
        document.getElementById('fhDermaDosis').value = drug.dosis || '';
        var viaValue = M.mapViaToSelect(drug.via);
        var viaSelect = document.getElementById('fhDermaVia');
        var viaOptions = Array.from(viaSelect.options).map(function (opt) { return opt.value; });
        if (viaOptions.indexOf(viaValue) !== -1) {
            viaSelect.value = viaValue;
        } else {
            var otraIdx = viaOptions.indexOf('Otra');
            if (otraIdx !== -1) viaSelect.value = 'Otra';
        }
        C.selectDrug(drug);
        clearAutocompleteDropdown();
    }

    function renderAutocompleteDropdown(results) {
        var dropdown = document.getElementById('autocompleteDropdown');
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
            if (i === autocompleteActiveIndex) item.classList.add('autocomplete-item--active');
            var mainRow = document.createElement('div');
            mainRow.className = 'autocomplete-item-main';
            var nameSpan = document.createElement('span');
            nameSpan.className = 'autocomplete-item-name';
            nameSpan.textContent = drug.display_name || drug.nombre_comercial || '—';
            mainRow.appendChild(nameSpan);
            if (M.isTruthyRobust(drug.es_hospitalario)) {
                var hospTag = document.createElement('span');
                hospTag.className = 'drug-tag drug-tag--hosp';
                hospTag.textContent = '[HOSP]';
                mainRow.appendChild(hospTag);
            }
            if (M.isTruthyRobust(drug.biosimilar)) {
                var bioTag = document.createElement('span');
                bioTag.className = 'drug-tag drug-tag--bio';
                bioTag.textContent = '[BIO]';
                mainRow.appendChild(bioTag);
            }
            var sourceTag = document.createElement('span');
            sourceTag.className = 'drug-source-tag drug-source-tag--' + drug.source_type.toLowerCase();
            sourceTag.textContent = drug.source_type;
            mainRow.appendChild(sourceTag);
            item.appendChild(mainRow);
            var detailRow = document.createElement('div');
            detailRow.className = 'autocomplete-item-detail';
            var parts = [];
            if (drug.principio_activo) parts.push(drug.principio_activo);
            if (drug.dosis) parts.push(drug.dosis);
            if (drug.via) parts.push(drug.via);
            if (drug.codigo_nacional) parts.push('CN ' + drug.codigo_nacional);
            detailRow.textContent = parts.join(' · ');
            item.appendChild(detailRow);
            (function (d) {
                item.addEventListener('click', function () {
                    selectDrug(d);
                });
            })(drug);
            dropdown.appendChild(item);
        }
        dropdown.classList.remove('hidden');
        autocompleteActiveIndex = -1;
    }

    function clearAutocompleteDropdown() {
        var dropdown = document.getElementById('autocompleteDropdown');
        F.clearChildren(dropdown);
        dropdown.classList.add('hidden');
        autocompleteActiveIndex = -1;
    }

    function handleAutocompleteInput() {
        if (!C.loaded) return;
        var query = document.getElementById('fhDermaFarmaco').value.trim();
        if (query.length < 2) {
            clearAutocompleteDropdown();
            return;
        }
        var results = C.search(query);
        renderAutocompleteDropdown(results);
    }

    function enableAutocomplete() {
        var input = document.getElementById('fhDermaFarmaco');
        input.disabled = false;
        input.placeholder = 'Ej. Cosentyx\u00AE, Humira\u00AE, Skyrizi\u00AE...';
        input.addEventListener('input', handleAutocompleteInput);
        input.addEventListener('keydown', function (event) {
            var dropdown = document.getElementById('autocompleteDropdown');
            if (dropdown.classList.contains('hidden')) return;
            var items = dropdown.querySelectorAll('.autocomplete-item');
            if (items.length === 0) return;
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                autocompleteActiveIndex = Math.min(autocompleteActiveIndex + 1, items.length - 1);
                for (var k = 0; k < items.length; k++) {
                    items[k].classList.toggle('autocomplete-item--active', k === autocompleteActiveIndex);
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                autocompleteActiveIndex = Math.max(autocompleteActiveIndex - 1, -1);
                for (var j = 0; j < items.length; j++) {
                    items[j].classList.toggle('autocomplete-item--active', j === autocompleteActiveIndex);
                }
            } else if (event.key === 'Enter') {
                if (autocompleteActiveIndex >= 0 && autocompleteActiveIndex < items.length) {
                    event.preventDefault();
                    items[autocompleteActiveIndex].click();
                }
            } else if (event.key === 'Escape') {
                clearAutocompleteDropdown();
            }
        });
        input.addEventListener('blur', function () {
            setTimeout(function () {
                if (!document.activeElement || !document.getElementById('autocompleteDropdown').contains(document.activeElement)) {
                    clearAutocompleteDropdown();
                }
            }, 150);
        });
    }

    function createLocalDrugModal() {
        if (document.getElementById('localDrugModalOverlay')) return;
        var overlay = document.createElement('div');
        overlay.className = 'local-drug-modal-overlay hidden';
        overlay.id = 'localDrugModalOverlay';
        var modal = document.createElement('div');
        modal.className = 'local-drug-modal';
        var header = document.createElement('div');
        header.className = 'local-drug-modal-header';
        var title = document.createElement('h3');
        title.className = 'local-drug-modal-title';
        title.textContent = 'Solicitud de fármaco local';
        var closeBtn = document.createElement('button');
        closeBtn.className = 'local-drug-modal-close';
        closeBtn.id = 'btnCloseLocalDrugModal';
        closeBtn.setAttribute('type', 'button');
        closeBtn.setAttribute('aria-label', 'Cerrar');
        closeBtn.textContent = '\u00D7';
        closeBtn.addEventListener('click', closeLocalDrugModal);
        header.appendChild(title);
        header.appendChild(closeBtn);
        var body = document.createElement('div');
        body.className = 'local-drug-modal-body';
        var warning = document.createElement('div');
        warning.className = 'warning-box';
        var p1 = document.createElement('p');
        var strong = document.createElement('strong');
        strong.textContent = '\u26A0\uFE0F Solicitud local especial pendiente de revisi\u00F3n por Farmacia.';
        p1.appendChild(strong);
        warning.appendChild(p1);
        var p2 = document.createElement('p');
        p2.className = 'local-drug-modal-explainer';
        p2.textContent = 'Esta opci\u00F3n crea una solicitud local especial pendiente de revisi\u00F3n por Farmacia. No modifica CIMA ni el cat\u00E1logo oficial. En esta demo solo genera un registro temporal para continuar la validaci\u00F3n.';
        warning.appendChild(p2);
        body.appendChild(warning);
        var formGrid = document.createElement('div');
        formGrid.className = 'form-grid';
        var fields = [
            { id: 'localDrugDisplayName', label: 'Nombre / display name', type: 'text' },
            { id: 'localDrugPrincipio', label: 'Principio activo', type: 'text' },
            { id: 'localDrugPresentacion', label: 'Presentación', type: 'text' },
            { id: 'localDrugVia', label: 'Vía', type: 'text' },
            { id: 'localDrugTipoSituacion', label: 'Tipo situación', type: 'text' }
        ];
        for (var fi = 0; fi < fields.length; fi++) {
            var fg = document.createElement('div');
            fg.className = 'form-group';
            var lbl = document.createElement('label');
            lbl.setAttribute('for', fields[fi].id);
            lbl.textContent = fields[fi].label;
            var inp = document.createElement('input');
            inp.type = fields[fi].type;
            inp.className = 'form-control';
            inp.id = fields[fi].id;
            fg.appendChild(lbl);
            fg.appendChild(inp);
            formGrid.appendChild(fg);
        }
        var obsGroup = document.createElement('div');
        obsGroup.className = 'form-group form-group--full';
        var obsLabel = document.createElement('label');
        obsLabel.setAttribute('for', 'localDrugObservaciones');
        obsLabel.textContent = 'Observaciones';
        var obsTextarea = document.createElement('textarea');
        obsTextarea.className = 'form-textarea';
        obsTextarea.id = 'localDrugObservaciones';
        obsTextarea.rows = 2;
        obsGroup.appendChild(obsLabel);
        obsGroup.appendChild(obsTextarea);
        body.appendChild(formGrid);
        body.appendChild(obsGroup);
        var footer = document.createElement('div');
        footer.className = 'local-drug-modal-footer';
        var cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.id = 'btnCancelLocalDrug';
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.addEventListener('click', closeLocalDrugModal);
        var useBtn = document.createElement('button');
        useBtn.type = 'button';
        useBtn.className = 'btn btn-primary';
        useBtn.id = 'btnUseLocalDrug';
        useBtn.textContent = 'Usar en formulario';
        useBtn.addEventListener('click', useLocalDrugInForm);
        footer.appendChild(cancelBtn);
        footer.appendChild(useBtn);
        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeLocalDrugModal();
        });
        document.body.appendChild(overlay);
    }

    function showLocalDrugModal() {
        createLocalDrugModal();
        document.getElementById('localDrugModalOverlay').classList.remove('hidden');
        document.getElementById('localDrugDisplayName').focus();
    }

    function closeLocalDrugModal() {
        var overlay = document.getElementById('localDrugModalOverlay');
        if (overlay) overlay.classList.add('hidden');
    }

    function useLocalDrugInForm() {
        var displayName = document.getElementById('localDrugDisplayName').value.trim();
        var principio = document.getElementById('localDrugPrincipio').value.trim();
        var presentacion = document.getElementById('localDrugPresentacion').value.trim();
        var via = document.getElementById('localDrugVia').value.trim();
        if (!displayName) {
            window.alert('El nombre / display name es obligatorio.');
            return;
        }
        document.getElementById('fhDermaFarmaco').value = displayName;
        if (principio) document.getElementById('fhDermaPrincipioActivo').value = principio;
        if (presentacion) document.getElementById('fhDermaDosis').value = presentacion;
        if (via) {
            var viaValue = M.mapViaToSelect(via);
            var viaSelect = document.getElementById('fhDermaVia');
            var viaOptions = Array.from(viaSelect.options).map(function (opt) { return opt.value; });
            if (viaOptions.indexOf(viaValue) !== -1) {
                viaSelect.value = viaValue;
            } else {
                var otraIdx = viaOptions.indexOf('Otra');
                if (otraIdx !== -1) viaSelect.value = 'Otra';
            }
        }
        C.selectDrug({
            display_name: displayName,
            nombre_comercial: displayName,
            principio_activo: principio || '',
            nombre_presentacion: presentacion || '',
            via: via || '',
            codigo_nacional: '',
            nregistro: '',
            dosis: presentacion || '',
            source_type: 'LOCAL_PENDIENTE_DEMO',
            drug_id: '',
            es_hospitalario: 'SI',
            biosimilar: ''
        });
        closeLocalDrugModal();
    }

    function applyValidationStateToDom(state) {
        var p = state.patient || {};
        var h = state.hsClinical || {};
        var c = state.comorbilidades || {};
        var t = state.tratamientosPrevios || {};
        var b = state.biologicosPrevios || {};
        var a = state.analitica || {};
        var e = state.ea || {};
        var ec = (e && e.criterios) ? e.criterios : {};
        var v = state.validacion || {};

        var tipoSelect = document.getElementById('fhTipoSolicitud');
        if (tipoSelect) {
            tipoSelect.value = state.modo || '';
            tipoSelect.dispatchEvent(new Event('change'));
        }

        F.setValue('fhDermaCip', p.cip);
        F.setValue('fhDermaFecha', p.fecha);
        F.setValue('fhDermaFarmaco', p.farmaco);
        F.setValue('fhDermaPrincipioActivo', p.principioActivo);
        F.setValue('fhDermaDosis', p.dosis);
        F.setValue('fhDermaVia', p.via);
        F.setValue('fhDermaPauta', p.pauta);
        F.setValue('fhDermaInduccion', p.induccion);
        F.setValue('fhDermaPeso', p.peso);
        F.setValue('fhDermaJustificacion', p.justificacion);
        F.setValue('fhDermaObservaciones', p.observaciones);
        F.setValue('fhDermaAnalitica', p.analitica);

        var pat = document.getElementById('fhDermaPatologia');
        if (pat && p.patologia) {
            for (var i = 0; i < pat.options.length; i++) {
                if (pat.options[i].text.toLowerCase().includes(p.patologia.toLowerCase())) {
                    pat.value = pat.options[i].text;
                    break;
                }
            }
            if (pat.value) pat.dispatchEvent(new Event('change'));
        }

        F.setValue('fhHSIhs4', h.ihs4);
        F.setValue('fhHSHurley', h.hurley);
        F.setValue('fhHSDlqi', h.dlqi);
        F.setValue('fhHSLocalizacion', h.localizacion);
        F.setValue('fhHSTiempoEvolucion', h.tiempoEvolucion);
        F.setValue('fhHSMotivoClinico', h.motivoClinico);

        F.setValue('fhHSComorbImc', c.imc);
        F.setValue('fhHSComorbTabaquismo', c.tabaquismo);
        F.setValue('fhHSComorbPaquetes', c.paquetesAno);
        F.setValue('fhHSComorbDiabetes', c.diabetes);
        F.setValue('fhHSComorbHba1c', c.hba1c);
        F.setValue('fhHSComorbSdMetabolico', c.sdMetabolico);
        F.setValue('fhHSComorbOtras', c.otras);

        setChecked('fhHSTtoDoxiClinda', t.doxiClinda);
        setChecked('fhHSTtoRifClinda', t.rifClinda);
        setChecked('fhHSTtoOtrosAb', t.otrosAb);
        F.setValue('fhHSTtoOtrosAbTxt', t.otrosAbTexto);
        toggleOtrosAtbDetalle();

        setChecked('fhHSBioAda', b.adalimumab);
        F.setValue('fhHSBioAdaDuracion', b.adalimumabDuracion);
        F.setValue('fhHSBioAdaMotivo', b.adalimumabMotivo);
        setChecked('fhHSBioOtros', b.otros);
        F.setValue('fhHSBioOtrosFarmaco', b.otrosFarmaco);
        F.setValue('fhHSBioOtrosMotivo', b.otrosMotivo);
        toggleBioAdaDetalle();
        toggleBioOtrosDetalle();

        F.setValue('fhAnaliticaFecha', a.fecha);
        F.setValue('fhAnaliticaReciente', a.reciente);
        setChecked('fhAnaliticaHemograma', a.hemograma);
        setChecked('fhAnaliticaBioquimica', a.bioquimica);

        if (a.mantoux) {
            var mantouxHidden = document.getElementById('fhAnaliticaMantoux');
            if (mantouxHidden) mantouxHidden.value = a.mantoux;
            var mantouxGroup = document.querySelector('[data-chip-target="fhAnaliticaMantoux"]');
            if (mantouxGroup) {
                var mantouxRadios = mantouxGroup.querySelectorAll('input[type="radio"]');
                for (var mr = 0; mr < mantouxRadios.length; mr++) {
                    mantouxRadios[mr].checked = false;
                    if (String(mantouxRadios[mr].value).toLowerCase() === String(a.mantoux).toLowerCase()) {
                        mantouxRadios[mr].checked = true;
                        mantouxRadios[mr].dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            }
        }

        function setChipValueDom(targetId, value) {
            var hidden = document.getElementById(targetId);
            var normalizedValue = value || '';
            if (hidden) hidden.value = normalizedValue;
            var group = document.querySelector('[data-chip-target="' + targetId + '"]');
            if (!group) return;
            var radios = group.querySelectorAll('input[type="radio"]');
            for (var j = 0; j < radios.length; j++) {
                radios[j].checked = false;
                if (normalizedValue && String(radios[j].value).toLowerCase() === String(normalizedValue).toLowerCase()) {
                    radios[j].checked = true;
                    radios[j].dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }

        setChipValueDom('fhAnaliticaSerologiasVhb', a.serologiasVhb);
        setChipValueDom('fhAnaliticaSerologiasVhc', a.serologiasVhc);
        setChipValueDom('fhAnaliticaSerologiasVih', a.serologiasVih);
        setChipValueDom('fhAnaliticaVacunacion', a.vacunacion);
        F.setValue('fhAnaliticaObservaciones', a.observaciones);

        F.setValue('fhEaNotificado', e.notificado);
        F.setValue('fhEaTipo', e.tipo);
        F.setValue('fhEaGravedad', e.gravedad);
        F.setValue('fhEaAccion', e.accion);
        F.setValue('fhEaCausalidad', e.causalidad);
        setChecked('fhEaCritTemporal', ec.temporal);
        setChecked('fhEaCritDechallenge', ec.dechallenge);
        setChecked('fhEaCritRechallenge', ec.rechallenge);
        setChecked('fhEaCritAlternativa', ec.alternativa);
        setChecked('fhEaCritDescrito', ec.descrito);
        setChecked('fhEaCritDosis', ec.dosis);
        setChecked('fhEaCritInsuficiente', ec.insuficiente);

        F.setValue('fhValEstado', v.estado);
        F.setValue('fhValCita', v.cita);
        F.setValue('fhValMotivo', v.motivoDenegacion);
        F.setValue('fhValObservaciones', v.observaciones);

        document.getElementById('fhValMotivoRow').classList.toggle('hidden', v.estado !== 'denied');

        var concBlock = document.getElementById('concomitantesBlock');
        if (concBlock) concBlock.classList.remove('hidden');
        var eaBlock = document.getElementById('eaBlock');
        if (eaBlock) eaBlock.classList.remove('hidden');

        var concList = document.getElementById('concomitantesList');
        if (concList) {
            while (concList.firstChild) concList.removeChild(concList.firstChild);
            if (state.concomitantes && state.concomitantes.length > 0) {
                for (var ri = 0; ri < state.concomitantes.length; ri++) {
                    var item = state.concomitantes[ri];
                    addConcomitanteRow(concList, {
                        nombre: item.nombre,
                        principio_activo: item.principioActivo,
                        dosis: item.dosis,
                        via: item.via,
                        pauta: item.pauta,
                        motivo: item.motivo
                    });
                }
            } else {
                var emptyMsg = document.createElement('p');
                emptyMsg.className = 'concomitante-empty';
                emptyMsg.textContent = 'No hay otros fármacos añadidos todavía.';
                concList.appendChild(emptyMsg);
            }
        }

        var validationBlock = document.getElementById('validationBlock');
        if (validationBlock) validationBlock.classList.remove('hidden');
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('fhTipoSolicitud').addEventListener('change', function () {
            if (this.value) mostrarFormulario(this.value);
        });

        document.getElementById('fhValEstado').addEventListener('change', function (event) {
            document.getElementById('fhValMotivoRow').classList.toggle('hidden', event.target.value !== 'denied');
        });

        document.getElementById('fhDermaPatologia').addEventListener('change', function () {
            toggleHSBlock();
        });

        document.getElementById('fhHSBioAda').addEventListener('change', function () {
            toggleBioAdaDetalle();
        });

        document.getElementById('fhHSBioOtros').addEventListener('change', function () {
            toggleBioOtrosDetalle();
        });

        document.getElementById('fhHSTtoOtrosAb').addEventListener('change', function () {
            toggleOtrosAtbDetalle();
        });

        document.getElementById('fhValExportTxt').addEventListener('click', function () {
            F.downloadFile('validacion_FH_' + new Date().toISOString().slice(0, 10) + '.txt', buildValidationLines().join('\n'), 'text/plain;charset=utf-8');
        });

        document.getElementById('fhValExportCsv').addEventListener('click', function () {
            var state = M.readStateFromDom();
            var payload = M.buildExportPayloadFromState(state);

            var rows = [
                ['ID', 'Fecha', 'Servicio', 'CIP', 'Patologia', 'Estado', 'FarmacoSolicitado', 'PrincipioActivo', 'DosisPresentacion', 'Via', 'Pauta', 'InduccionSolicitada', 'Profesional', 'VHB', 'VHC', 'VIH', 'MotivoDenegacion', 'SnapshotDrugID', 'SnapshotSourceType', 'CodigoNacional', 'NRegistro', 'EANotificado', 'EATipo', 'EAGravedad', 'EAAccion', 'EACausalidad', 'ConcomitantesCount', 'OtrosFarmacosResumen'],
                [
                    payload.id,
                    payload.fecha,
                    payload.servicio,
                    payload.cip,
                    payload.patologia,
                    payload.valEstadoLabel,
                    payload.farmacoSolicitado,
                    payload.principioActivo,
                    payload.dosisPresentacion,
                    payload.via,
                    payload.pauta,
                    payload.induccionSolicitada,
                    payload.valProfesional,
                    payload.analiticaSerologiasVhb || '—',
                    payload.analiticaSerologiasVhc || '—',
                    payload.analiticaSerologiasVih || '—',
                    payload.valMotivoDenegacion || '—',
                    payload.snapDrugId || '—',
                    payload.snapSourceType || '—',
                    payload.snapCodigoNacional || '—',
                    payload.snapNRegistro || '—',
                    payload.eaNotificado || '—',
                    payload.eaTipo || '—',
                    payload.eaGravedad || '—',
                    payload.eaAccion || '—',
                    payload.eaCausalidad || '—',
                    payload.concomitantesCount,
                    payload.concomitantesResumen
                ]
            ];
            var csv = rows.map(function (row) {
                return row.map(function (cell) {
                    return '"' + String(cell).replace(/"/g, '""') + '"';
                }).join(',');
            }).join('\n');
            F.downloadFile('validaciones_FH_' + new Date().toISOString().slice(0, 10) + '.csv', csv, 'text/csv;charset=utf-8');
        });

        if (C.loaded) {
            enableAutocomplete();
            document.getElementById('noFindDrugRow').classList.remove('hidden');
        }

        var btnNoFind = document.getElementById('btnNoFindDrug');
        if (btnNoFind) btnNoFind.addEventListener('click', showLocalDrugModal);

        document.addEventListener('farmacia:catalog-loaded', function () {
            if (!C.loaded) return;
            enableAutocomplete();
            document.getElementById('noFindDrugRow').classList.remove('hidden');
        });

        applyContext();
        initAnaliticaChips();

        var btnAddConc = document.getElementById('btnAddConcomitante');
        if (btnAddConc) {
            btnAddConc.addEventListener('click', function () {
                var concList = document.getElementById('concomitantesList');
                if (concList) addConcomitanteRow(concList, null);
            });
        }
    });

    // ===== INTAKE ENFERMERÍA — BANDEJA =====
    function initIntakeBandeja() {
        var container = document.getElementById('intakeCardsGrid');
        if (!container) return;
        fetch('data/demo/farmacia/farmacia_intake_enfermeria_prebiologico_demo_v0_1.json')
            .then(function (r) { return r.json(); })
            .then(function (records) { renderIntakeBandeja(records); })
            .catch(function (err) {
                console.warn('[Intake] No se pudo cargar intake:', err);
                var empty = document.createElement('div'); empty.className = 'intake-empty'; var ic = document.createElement('i'); ic.className = 'fas fa-info-circle'; empty.appendChild(ic); empty.appendChild(document.createTextNode(' Bandeja no disponible.')); container.appendChild(empty);
            });
    }

    function renderIntakeBandeja(records) {
        var grid = document.getElementById('intakeCardsGrid');
        var total = document.getElementById('intakeTotal');
        var pend = document.getElementById('intakePendientes');
        var ok = document.getElementById('intakeOk');
        var block = document.getElementById('intakeBloqueados');
        var batchBadge = document.getElementById('intakeBatchBadge');
        if (!grid) return;
        var counts = { pendiente_servicio: 0, devuelto_servicio: 0, ok_para_validacion: 0 };
        records.forEach(function (r) {
            var s = r.prebiologic_status.global_status;
            if (counts[s] !== undefined) counts[s]++;
        });
        if (total) total.textContent = records.length;
        if (pend) pend.textContent = counts.pendiente_servicio;
        if (ok) ok.textContent = counts.ok_para_validacion;
        if (block) block.textContent = counts.devuelto_servicio;
        if (batchBadge && records[0]) batchBadge.textContent = 'Batch: ' + records[0].import_batch_id;
        while (grid.firstChild) grid.removeChild(grid.firstChild);
        records.forEach(function (r) {
            var card = document.createElement('div');
            card.className = 'intake-card intake-card--' + r.prebiologic_status.global_status;
            var statusLabel = '';
            var statusClass = '';
            if (r.prebiologic_status.global_status === 'ok_para_validacion') {
                statusLabel = 'OK Farmacia';
                statusClass = 'intake-status-ok';
            } else if (r.prebiologic_status.global_status === 'pendiente_servicio') {
                statusLabel = 'En vigilancia';
                statusClass = 'intake-status-pending';
            } else {
                statusLabel = 'Bloqueado';
                statusClass = 'intake-status-blocked';
            }
            var missingEl = null;
            if (r.prebiologic_status.missing_items && r.prebiologic_status.missing_items.length > 0) {
                missingEl = document.createElement('div'); missingEl.className = 'intake-missing'; var ic3 = document.createElement('i'); ic3.className = 'fas fa-exclamation-triangle'; missingEl.appendChild(ic3); missingEl.appendChild(document.createTextNode(' Faltan: ' + r.prebiologic_status.missing_items.join(', ')));
            }
            var actionBtn;
            if (r.ready_for_pharmacy_validation) {
                actionBtn = document.createElement('button');
                actionBtn.type = 'button';
                actionBtn.className = 'btn btn-primary btn-sm intake-btn-validar';
                actionBtn.textContent = 'Iniciar validación ';
                var icArrow = document.createElement('i');
                icArrow.className = 'fas fa-arrow-right';
                actionBtn.appendChild(icArrow);
                actionBtn.addEventListener('click', function () {
                    iniciarValidacionDesdeIntake(r, actionBtn);
                });
            } else {
                actionBtn = document.createElement('button');
                actionBtn.type = 'button';
                actionBtn.className = 'btn btn-sm intake-btn-disabled';
                actionBtn.disabled = true;
                var ic5 = document.createElement('i');
                ic5.className = 'fas fa-clock';
                actionBtn.appendChild(ic5);
                actionBtn.appendChild(document.createTextNode(' ' + statusLabel));
            }
            var bio = r.proposed_biologic || {};
            var bioEl = null; if (bio.name) { bioEl = document.createElement('div'); bioEl.className = 'intake-drug'; var ic6 = document.createElement('i'); ic6.className = 'fas fa-pills'; ic6.style.color = '#008777'; bioEl.appendChild(ic6); bioEl.appendChild(document.createTextNode(' ' + M.escapeHtml(bio.name))); }
            var hdr = document.createElement('div'); hdr.className = 'intake-card-header';
            var idSpan = document.createElement('span'); idSpan.className = 'intake-card-id'; idSpan.textContent = M.escapeHtml(r.display_id);
            var badge = document.createElement('span'); badge.className = 'intake-badge ' + statusClass; badge.textContent = statusLabel;
            hdr.appendChild(idSpan); hdr.appendChild(badge);
            var body = document.createElement('div'); body.className = 'intake-card-body';
            var spRow = document.createElement('div'); spRow.className = 'intake-service-pat';
            var svcSpan = document.createElement('span'); var ic7 = document.createElement('i'); ic7.className = 'fas fa-hospital-alt'; svcSpan.appendChild(ic7); svcSpan.appendChild(document.createTextNode(' ' + M.escapeHtml(r.service)));
            var patSpan = document.createElement('span'); var ic8 = document.createElement('i'); ic8.className = 'fas fa-disease'; patSpan.appendChild(ic8); patSpan.appendChild(document.createTextNode(' ' + M.escapeHtml(r.pathology)));
            spRow.appendChild(svcSpan); spRow.appendChild(patSpan); body.appendChild(spRow);
            if (bioEl) body.appendChild(bioEl);
            var prebio = document.createElement('div'); prebio.className = 'intake-prebiologic';
            var fields = [
                { l: 'Vacuna', v: r.prebiologic_status.vaccination_status },
                { l: 'Serologías', v: r.prebiologic_status.serologies_status },
                { l: 'TB', v: r.prebiologic_status.tb_screening_status },
                { l: 'Analítica', v: r.prebiologic_status.analytics_status }
            ];
            fields.forEach(function (f) { var sp = document.createElement('span'); sp.textContent = f.l + ': ' + (f.v || '—'); prebio.appendChild(sp); });
            body.appendChild(prebio);
            if (missingEl) body.appendChild(missingEl);
            if (r.nursing_observations) { var obs = document.createElement('div'); obs.className = 'intake-observations'; var ic9 = document.createElement('i'); ic9.className = 'fas fa-comment'; obs.appendChild(ic9); obs.appendChild(document.createTextNode(' ' + M.escapeHtml(r.nursing_observations))); body.appendChild(obs); }
            var footer = document.createElement('div'); footer.className = 'intake-card-footer';
            if (actionBtn) footer.appendChild(actionBtn);
            card.appendChild(hdr); card.appendChild(body); card.appendChild(footer);
            grid.appendChild(card);
        });
    }

    function iniciarValidacionDesdeIntake(data, triggerButton) {
        triggerButton.disabled = true;
        triggerButton.textContent = 'Validación iniciada';
        triggerButton.classList.remove('btn-primary');
        triggerButton.classList.add('btn--success');
        sessionStorage.setItem('intake_context', JSON.stringify(data));
        precargarValidacion(data);
        var hero = document.querySelector('.patient-header-card');
        if (hero) hero.scrollIntoView({ behavior: 'smooth' });
    }

    function precargarValidacion(data) {
        var state = M.createState();

        var servicioLower = (data.service || '').toLowerCase();
        state.modo = servicioLower.includes('reuma') ? 'reuma' : (servicioLower.includes('derma') ? 'derma' : null);

        state.patient.cip = data.patient_id || '';
        state.patient.servicio = data.service || '';
        state.patient.patologia = data.pathology || '';

        var bio = data.proposed_biologic || {};
        state.patient.farmaco = bio.name || '';
        state.patient.principioActivo = bio.principio_activo || bio.active_principle || '';
        state.patient.dosis = bio.dose || '';
        state.patient.via = bio.route || '';
        state.patient.pauta = bio.schedule || '';

        var prebio = data.prebiologic_status || {};
        if (prebio.analytics_status === 'OK' || prebio.analytics_status === 'ok') {
            state.analitica.reciente = 'si';
            state.analitica.hemograma = true;
            state.analitica.bioquimica = true;
        }

        if (prebio.tb_screening_status) {
            var tbVal = prebio.tb_screening_status.toUpperCase();
            if (tbVal.indexOf('NEGATIVO') !== -1) {
                state.analitica.mantoux = 'Negativo';
            } else if (tbVal.indexOf('PENDIENTE') !== -1) {
                state.analitica.mantoux = 'Pendiente';
            } else if (tbVal.indexOf('TRATADO') !== -1) {
                state.analitica.mantoux = 'Positivo - tratado';
            } else if (tbVal.indexOf('POSITIVO') !== -1) {
                state.analitica.mantoux = 'Pendiente';
                state.analitica.observaciones = (state.analitica.observaciones ? state.analitica.observaciones + '\n' : '') + '[Enfermería] Mantoux/IGRA positivo sin tratamiento registrado. Revisar.';
            } else if (tbVal.indexOf('NO PRECISA') !== -1) {
                state.analitica.observaciones = (state.analitica.observaciones ? state.analitica.observaciones + '\n' : '') + '[Enfermería] Mantoux/IGRA no preciso según Excel mock.';
            }
        }

        if (prebio.serologies_status) {
            var seroStatus = prebio.serologies_status.toUpperCase();
            if (seroStatus === 'OK') {
                state.analitica.serologiasVhb = 'Negativo';
                state.analitica.serologiasVhc = 'Negativo';
                state.analitica.serologiasVih = 'Negativo';
            } else if (seroStatus === 'PENDIENTE') {
                state.analitica.serologiasVhb = 'Pendiente';
                state.analitica.serologiasVhc = 'Pendiente';
                state.analitica.serologiasVih = 'Pendiente';
            } else if (seroStatus === 'ALTERADA') {
                state.analitica.observaciones = (state.analitica.observaciones ? state.analitica.observaciones + '\n' : '') + '[Enfermería] Serologías alteradas según Excel mock. Revisar detalle antes de validar.';
            }
        }

        if (prebio.vaccination_status) {
            var vaccStatus = prebio.vaccination_status.toUpperCase();
            if (vaccStatus === 'OK') {
                state.analitica.vacunacion = 'si';
            } else if (vaccStatus === 'PENDIENTE') {
                state.analitica.vacunacion = 'pendiente';
            } else if (vaccStatus === 'NO PRECISA') {
                state.analitica.vacunacion = 'no';
                state.analitica.observaciones = (state.analitica.observaciones ? state.analitica.observaciones + '\n' : '') + '[Enfermería] Vacunación no precisa según Excel mock.';
            }
        }

        if (data.nursing_observations) {
            state.analitica.observaciones = (state.analitica.observaciones ? state.analitica.observaciones + '\n' : '') + '[Enfermería] ' + data.nursing_observations;
        }

        var ea = data.adverse_event || data.adverseEvent || null;
        if (ea) {
            state.ea.notificado = ea.notificado || '';
            state.ea.tipo = ea.tipo || '';
            state.ea.gravedad = ea.gravedad || '';
            state.ea.accion = ea.accion || '';
            state.ea.causalidad = ea.causalidad || '';
            if (ea.criterios) {
                var crits = ea.criterios;
                state.ea.criterios.temporal = !!crits.temporal;
                state.ea.criterios.dechallenge = !!crits.dechallenge;
                state.ea.criterios.rechallenge = !!crits.rechallenge;
                state.ea.criterios.alternativa = !!crits.alternativa;
                state.ea.criterios.descrito = !!crits.descrito;
                state.ea.criterios.dosis = !!crits.dosis;
                state.ea.criterios.insuficiente = !!crits.insuficiente;
            }
        } else {
            state.ea.notificado = 'No consta';
            state.ea.gravedad = 'No consta';
            state.ea.accion = 'No aplica';
            state.ea.causalidad = 'No evaluada';
        }

        var concom = data.other_biologics || data.concomitant_treatments || [];
        if (Array.isArray(concom) && concom.length > 0) {
            for (var ci = 0; ci < concom.length; ci++) {
                var item = concom[ci];
                state.concomitantes.push({
                    nombre: item.nombre || '',
                    principioActivo: item.principio_activo || '',
                    dosis: item.dosis || '',
                    via: item.via || '',
                    pauta: item.pauta || '',
                    motivo: item.motivo || ''
                });
            }
        }

        applyValidationStateToDom(state);

        var contextCip = document.querySelector('[data-context="cip"]');
        var contextServ = document.querySelector('[data-context="servicio"]');
        var contextPat = document.querySelector('[data-context="patologia"]');
        if (contextCip) contextCip.textContent = data.patient_id || '—';
        if (contextServ) contextServ.textContent = data.service || '—';
        if (contextPat) contextPat.textContent = data.pathology || '—';

        var origenStrip = document.querySelector('.context-strip');
        if (origenStrip && !document.querySelector('[data-context-origen]')) {
            var origenEl = document.createElement('span');
            origenEl.className = 'intake-origin-note';
            var strong = document.createElement('strong');
            strong.textContent = 'Excel Enfermería mock';
            origenEl.appendChild(document.createTextNode('Origen: '));
            origenEl.appendChild(strong);
            origenEl.setAttribute('data-context-origen', 'true');
            origenStrip.appendChild(origenEl);
        }
    }

    function addConcomitanteRow(container, data) {
        var row = document.createElement('div');
        row.className = 'concomitante-row';

        var inpNombre = document.createElement('input');
        inpNombre.type = 'text';
        inpNombre.className = 'concomitante-nombre form-control';
        inpNombre.placeholder = 'Nombre fármaco';
        if (data && data.nombre) inpNombre.value = data.nombre;

        var inpPa = document.createElement('input');
        inpPa.type = 'text';
        inpPa.className = 'concomitante-pa form-control';
        inpPa.placeholder = 'Principio activo';
        if (data && data.principio_activo) inpPa.value = data.principio_activo;

        var inpDosis = document.createElement('input');
        inpDosis.type = 'text';
        inpDosis.className = 'concomitante-dosis form-control';
        inpDosis.placeholder = 'Dosis';
        if (data && data.dosis) inpDosis.value = data.dosis;

        var selVia = document.createElement('select');
        selVia.className = 'concomitante-via form-select';
        var viaOptions = ['', 'SC', 'IV', 'Oral', 'Otra'];
        for (var vi = 0; vi < viaOptions.length; vi++) {
            var opt = document.createElement('option');
            opt.value = viaOptions[vi];
            opt.textContent = viaOptions[vi] || '—';
            selVia.appendChild(opt);
        }
        if (data && data.via) selVia.value = data.via;

        var inpPauta = document.createElement('input');
        inpPauta.type = 'text';
        inpPauta.className = 'concomitante-pauta form-control';
        inpPauta.placeholder = 'Pauta';
        if (data && data.pauta) inpPauta.value = data.pauta;

        var inpMotivo = document.createElement('input');
        inpMotivo.type = 'text';
        inpMotivo.className = 'concomitante-motivo form-control';
        inpMotivo.placeholder = 'Motivo';
        if (data && data.motivo) inpMotivo.value = data.motivo;

        var btnRemove = document.createElement('button');
        btnRemove.type = 'button';
        btnRemove.className = 'btn btn-sm btn-outline btn-remove-concomitante';
        var icRemove = document.createElement('i');
        icRemove.className = 'fas fa-times';
        btnRemove.appendChild(icRemove);
        btnRemove.addEventListener('click', function () { row.remove(); });

        row.appendChild(inpNombre);
        row.appendChild(inpPa);
        row.appendChild(inpDosis);
        row.appendChild(selVia);
        row.appendChild(inpPauta);
        row.appendChild(inpMotivo);
        row.appendChild(btnRemove);
        container.appendChild(row);
    }

    // Intake: init
    document.addEventListener('DOMContentLoaded', function () {
        var intakeCtx = sessionStorage.getItem('intake_context');
        if (intakeCtx) {
            try { precargarValidacion(JSON.parse(intakeCtx)); } catch (e) { }
        }
        initIntakeBandeja();
    });

})();
