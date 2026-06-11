'use strict';

(function () {
    const F = window.FarmaciaDemo;
    const C = window.FarmaciaCatalog;
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
        const estado = document.getElementById('fhValEstado').value;
        if (estado === 'validated') return 'Validado';
        if (estado === 'denied') return 'Denegado';
        return 'Pendiente';
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
        var lines = [];
        lines.push('=== INFORME DE VALIDACIÓN FARMACOTERAPÉUTICA ===');
        lines.push('Identificador demo: FH-VAL-' + Date.now().toString(36).toUpperCase());
        lines.push('Fecha: ' + new Date().toLocaleDateString('es-ES'));
        lines.push('');
        if (modoActual === 'reuma') {
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
            lines.push('CIP: ' + selectedCip());
            lines.push('Patología: ' + selectedPatologia());
            lines.push('Fecha solicitud: ' + (document.getElementById('fhDermaFecha').value || '—'));
            var marca = document.getElementById('fhDermaFarmaco').value || '—';
            var principio = document.getElementById('fhDermaPrincipioActivo').value.trim();
            lines.push('Fármaco solicitado (marca): ' + marca);
            if (principio) lines.push('Principio activo / molécula: ' + principio);
            lines.push('Dosis solicitada: ' + (document.getElementById('fhDermaDosis').value || '—'));
            lines.push('Vía: ' + (document.getElementById('fhDermaVia').value || '—'));
            lines.push('Intervalo / pauta: ' + (document.getElementById('fhDermaPauta').value || '—'));
            lines.push('Inducción: ' + (document.getElementById('fhDermaInduccion').value || '—'));
            lines.push('Peso: ' + (document.getElementById('fhDermaPeso').value || '—'));
        }

        var snapshot = C.getSnapshot();
        if (snapshot) {
            lines.push('');
            lines.push('--- Snapshot catálogo farmacológico ---');
            lines.push('Nombre snapshot: ' + (snapshot.nombre_snapshot || '—'));
            lines.push('Principio activo snapshot: ' + (snapshot.principio_activo_snapshot || '—'));
            lines.push('Presentación snapshot: ' + (snapshot.presentacion_snapshot || '—'));
            lines.push('Vía snapshot: ' + (snapshot.via_snapshot || '—'));
            lines.push('Código nacional: ' + (snapshot.codigo_nacional_snapshot || '—'));
            lines.push('Nº registro: ' + (snapshot.nregistro_snapshot || '—'));
            lines.push('Origen / source type: ' + (snapshot.source_type || '—'));
            lines.push('ID seleccionado: ' + (snapshot.selected_drug_id || '—'));
        }

        if (isHSPathology()) {
            lines.push('');
            lines.push('--- Datos clínicos de origen — Hidradenitis supurativa ---');
            lines.push('IHS4: ' + (document.getElementById('fhHSIhs4').value || '—'));
            lines.push('Hurley: ' + (document.getElementById('fhHSHurley').value || '—'));
            lines.push('DLQI: ' + (document.getElementById('fhHSDlqi').value || '—'));
            lines.push('Localización principal: ' + (document.getElementById('fhHSLocalizacion').value || '—'));
            lines.push('Tiempo evolución: ' + (document.getElementById('fhHSTiempoEvolucion').value || '—'));

            lines.push('');
            lines.push('--- Tratamientos previos ---');
            var ttoIds = ['fhHSTtoDoxiClinda', 'fhHSTtoRifClinda', 'fhHSTtoOtrosAb'];
            var ttoNames = ['Doxiciclina / Clindamicina', 'Rifampicina + Clindamicina', 'Otros ATB'];
            for (var ti = 0; ti < ttoIds.length; ti++) {
                var tcb = document.getElementById(ttoIds[ti]);
                lines.push((tcb && tcb.checked ? '[X]' : '[ ]') + ' ' + ttoNames[ti]);
            }
            var otrosAtbCb = document.getElementById('fhHSTtoOtrosAb');
            var otrosAtbTxt = document.getElementById('fhHSTtoOtrosAbTxt').value.trim();
            if (otrosAtbTxt && otrosAtbCb && otrosAtbCb.checked) lines.push('  Especificar otros ATB: ' + otrosAtbTxt);

            lines.push('');
            lines.push('--- Biológicos previos ---');
            var adaCb = document.getElementById('fhHSBioAda');
            lines.push((adaCb && adaCb.checked ? '[X]' : '[ ]') + ' Adalimumab');
            if (adaCb && adaCb.checked) {
                lines.push('  Duración: ' + (document.getElementById('fhHSBioAdaDuracion').value || '—'));
                lines.push('  Motivo fin: ' + (document.getElementById('fhHSBioAdaMotivo').value || '—'));
            }
            var otrosBioCb = document.getElementById('fhHSBioOtros');
            lines.push((otrosBioCb && otrosBioCb.checked ? '[X]' : '[ ]') + ' Otros biológicos');
            if (otrosBioCb && otrosBioCb.checked) {
                lines.push('  Fármaco: ' + (document.getElementById('fhHSBioOtrosFarmaco').value || '—'));
                lines.push('  Motivo suspensión: ' + (document.getElementById('fhHSBioOtrosMotivo').value || '—'));
            }

            lines.push('');
            lines.push('--- Comorbilidades ---');
            lines.push('IMC: ' + (document.getElementById('fhHSComorbImc').value || '—'));
            lines.push('Tabaquismo: ' + (document.getElementById('fhHSComorbTabaquismo').value || '—'));
            var paq = document.getElementById('fhHSComorbPaquetes').value.trim();
            if (paq) lines.push('Paquetes/año: ' + paq);
            lines.push('Diabetes: ' + (document.getElementById('fhHSComorbDiabetes').value || '—'));
            var hba1c = document.getElementById('fhHSComorbHba1c').value.trim();
            if (hba1c) lines.push('HbA1c: ' + hba1c + '%');
            lines.push('Síndrome metabólico: ' + (document.getElementById('fhHSComorbSdMetabolico').value || '—'));
            var otrasCom = document.getElementById('fhHSComorbOtras').value.trim();
            if (otrasCom) lines.push('Otras comorbilidades: ' + otrasCom);

            lines.push('');
            lines.push('Motivo clínico / línea terapéutica: ' + (document.getElementById('fhHSMotivoClinico').value || '—'));
        }

        if (modoActual === 'derma') {
            lines.push('');
            lines.push('--- Analítica y vacunación ---');
            lines.push('Fecha analítica: ' + (document.getElementById('fhAnaliticaFecha').value || '—'));
            lines.push('Analítica <3 meses: ' + (document.getElementById('fhAnaliticaReciente').value || '—'));
            var hemoCb = document.getElementById('fhAnaliticaHemograma');
            lines.push('Hemograma: ' + (hemoCb && hemoCb.checked ? 'Verificado' : 'No verificado'));
            var bioCb = document.getElementById('fhAnaliticaBioquimica');
            lines.push('Bioquímica: ' + (bioCb && bioCb.checked ? 'Verificado' : 'No verificado'));
            lines.push('Mantoux/IGRA: ' + (document.getElementById('fhAnaliticaMantoux').value || '—'));
            lines.push('VHB: ' + (document.getElementById('fhAnaliticaSerologiasVhb').value || '—'));
            lines.push('VHC: ' + (document.getElementById('fhAnaliticaSerologiasVhc').value || '—'));
            lines.push('VIH: ' + (document.getElementById('fhAnaliticaSerologiasVih').value || '—'));
            lines.push('Vacunación: ' + (document.getElementById('fhAnaliticaVacunacion').value || '—'));
            var obsVac = document.getElementById('fhAnaliticaObservaciones').value.trim();
            if (obsVac) lines.push('Observaciones vacunación: ' + obsVac);
        }

        lines.push('');
        lines.push('Estado validación: ' + estadoLabel());
        var motivo = document.getElementById('fhValMotivo').value.trim();
        if (motivo) lines.push('Motivo denegación: ' + motivo);
        var cita = document.getElementById('fhValCita').value;
        if (cita) lines.push('Fecha cita Farmacia: ' + cita);
        var profesional = document.getElementById('fhValFarmaceutico').textContent.trim();
        lines.push('Farmacéutico responsable: ' + profesional);
        var obs = document.getElementById('fhValObservaciones').value.trim();
        if (obs) lines.push('Observaciones: ' + obs);
        lines.push('');
        lines.push('=== FIN DEL INFORME ===');
        lines.push('Generado por: Hub Clínico Badajoz — Demo Farmacia v0.2');
        lines.push('ATENCIÓN: Datos sintéticos. No usar para decisiones clínicas reales.');
        return lines;
    }

    function isTruthyRobust(value) {
        if (value === true || value === 1 || value === '1') return true;
        if (value === false || value === 0 || value === '0') return false;
        if (value === null || value === undefined || value === '') return false;
        var s = String(value).trim().toUpperCase();
        return s === 'TRUE' || s === 'SI' || s === 'SÍ' || s === 'YES' || s === '1';
    }

    function mapViaToSelect(catalogVia) {
        var v = (catalogVia || '').toLowerCase();
        if (v.indexOf('subcut') !== -1 || v === 'sc') return 'SC';
        if (v.indexOf('intraven') !== -1 || v === 'iv') return 'IV';
        if (v.indexOf('oral') !== -1) return 'Oral';
        return 'Otra';
    }

    function selectDrug(drug) {
        document.getElementById('fhDermaFarmaco').value = drug.display_name || drug.nombre_comercial || '';
        document.getElementById('fhDermaPrincipioActivo').value = drug.principio_activo || '';
        document.getElementById('fhDermaDosis').value = drug.dosis || '';
        var viaValue = mapViaToSelect(drug.via);
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
            if (isTruthyRobust(drug.es_hospitalario)) {
                var hospTag = document.createElement('span');
                hospTag.className = 'drug-tag drug-tag--hosp';
                hospTag.textContent = '[HOSP]';
                mainRow.appendChild(hospTag);
            }
            if (isTruthyRobust(drug.biosimilar)) {
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
            var viaValue = mapViaToSelect(via);
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
            const profesional = document.getElementById('fhValFarmaceutico').textContent.trim();
            const seroVhbEl = document.getElementById('fhAnaliticaSerologiasVhb');
            const seroVhcEl = document.getElementById('fhAnaliticaSerologiasVhc');
            const seroVihEl = document.getElementById('fhAnaliticaSerologiasVih');

            function safeVal(id) {
                var el = document.getElementById(id);
                return (el && el.value !== undefined) ? el.value.trim() || '—' : '—';
            }

            var farmaco = modoActual === 'reuma' ? 'Adalimumab 40 mg' : (document.getElementById('fhDermaFarmaco').value || '—');
            var principioActivo = modoActual === 'reuma' ? 'Adalimumab' : safeVal('fhDermaPrincipioActivo');
            var dosisPresentacion = modoActual === 'reuma' ? '40 mg' : safeVal('fhDermaDosis');
            var via = modoActual === 'reuma' ? 'SC' : safeVal('fhDermaVia');
            var pauta = modoActual === 'reuma' ? 'SC / cada 2 semanas' : safeVal('fhDermaPauta');
            var induccion = modoActual === 'reuma' ? '—' : safeVal('fhDermaInduccion');
            var motivoDenegacion = safeVal('fhValMotivo');

            var snap = C.getSnapshot();
            var snapDrugId = (snap && snap.drug_id) ? snap.drug_id : '—';
            var snapSourceType = (snap && snap.source_type) ? snap.source_type : '—';
            var codigoNacional = (snap && snap.codigo_nacional_snapshot) ? snap.codigo_nacional_snapshot : '—';
            var nRegistro = (snap && snap.nregistro_snapshot) ? snap.nregistro_snapshot : '—';

            var seroVhb = seroVhbEl ? (seroVhbEl.value || '—') : '—';
            var seroVhc = seroVhcEl ? (seroVhcEl.value || '—') : '—';
            var seroVih = seroVihEl ? (seroVihEl.value || '—') : '—';

            const rows = [
                ['ID', 'Fecha', 'Servicio', 'CIP', 'Patologia', 'Estado', 'FarmacoSolicitado', 'PrincipioActivo', 'DosisPresentacion', 'Via', 'Pauta', 'InduccionSolicitada', 'Profesional', 'VHB', 'VHC', 'VIH', 'MotivoDenegacion', 'SnapshotDrugID', 'SnapshotSourceType', 'CodigoNacional', 'NRegistro'],
                ['FH-' + Date.now().toString(36).toUpperCase(), new Date().toLocaleDateString('es-ES'), modoActual === 'reuma' ? 'Reumatología' : 'Dermatología', selectedCip(), selectedPatologia(), estadoLabel(), farmaco, principioActivo, dosisPresentacion, via, pauta, induccion, profesional, seroVhb, seroVhc, seroVih, motivoDenegacion, snapDrugId, snapSourceType, codigoNacional, nRegistro]
            ];
            const csv = rows.map(function (row) {
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
    });

// ===== INTAKE ENFERMERÍA — BANDEJA =====
function initIntakeBandeja() {
  var container = document.getElementById('intakeCardsGrid');
  if (!container) return;
  fetch('data/demo/farmacia/farmacia_intake_enfermeria_prebiologico_demo_v0_1.json')
    .then(function(r) { return r.json(); })
    .then(function(records) { renderIntakeBandeja(records); })
    .catch(function(err) {
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
  records.forEach(function(r) {
    var s = r.prebiologic_status.global_status;
    if (counts[s] !== undefined) counts[s]++;
  });
  if (total) total.textContent = records.length;
  if (pend) pend.textContent = counts.pendiente_servicio;
  if (ok) ok.textContent = counts.ok_para_validacion;
  if (block) block.textContent = counts.devuelto_servicio;
  if (batchBadge && records[0]) batchBadge.textContent = 'Batch: ' + records[0].import_batch_id;
  while (grid.firstChild) grid.removeChild(grid.firstChild);
  records.forEach(function(r) {
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
    var missingHtml = '';
    if (r.prebiologic_status.missing_items && r.prebiologic_status.missing_items.length > 0) {
      var missingEl = document.createElement('div'); missingEl.className = 'intake-missing'; var ic3 = document.createElement('i'); ic3.className = 'fas fa-exclamation-triangle'; missingEl.appendChild(ic3); missingEl.appendChild(document.createTextNode(' Faltan: ' + r.prebiologic_status.missing_items.join(', ')));
    }
    var actionHtml = '';
    if (r.ready_for_pharmacy_validation) {
      actionHtml = '<button type="button" class="btn btn-primary btn-sm intake-btn-validar" data-intake=\'' + JSON.stringify(r).replace(/'/g, '&#39;') + '\'>Iniciar validación <i class="fas fa-arrow-right"></i></button>';
    } else {
      actionBtn = document.createElement('button'); actionBtn.type = 'button'; actionBtn.className = 'btn btn-sm intake-btn-disabled'; actionBtn.disabled = true; var ic5 = document.createElement('i'); ic5.className = 'fas fa-clock'; actionBtn.appendChild(ic5); actionBtn.appendChild(document.createTextNode(' ' + statusLabel));
    }
    var bio = r.proposed_biologic || {};
    var bioEl = null; if (bio.name) { bioEl = document.createElement('div'); bioEl.className = 'intake-drug'; var ic6 = document.createElement('i'); ic6.className = 'fas fa-pills'; ic6.style.color = '#008777'; bioEl.appendChild(ic6); bioEl.appendChild(document.createTextNode(' ' + escapeHtml(bio.name))); }
    /* Build card with DOM */
  var hdr = document.createElement('div'); hdr.className = 'intake-card-header';
  var idSpan = document.createElement('span'); idSpan.className = 'intake-card-id'; idSpan.textContent = escapeHtml(r.display_id);
  var badge = document.createElement('span'); badge.className = 'intake-badge ' + statusClass; badge.textContent = statusLabel;
  hdr.appendChild(idSpan); hdr.appendChild(badge);
  var body = document.createElement('div'); body.className = 'intake-card-body';
  var spRow = document.createElement('div'); spRow.className = 'intake-service-pat';
  var svcSpan = document.createElement('span'); var ic7 = document.createElement('i'); ic7.className = 'fas fa-hospital-alt'; svcSpan.appendChild(ic7); svcSpan.appendChild(document.createTextNode(' ' + escapeHtml(r.service)));
  var patSpan = document.createElement('span'); var ic8 = document.createElement('i'); ic8.className = 'fas fa-disease'; patSpan.appendChild(ic8); patSpan.appendChild(document.createTextNode(' ' + escapeHtml(r.pathology)));
  spRow.appendChild(svcSpan); spRow.appendChild(patSpan); body.appendChild(spRow);
  if (bioEl) body.appendChild(bioEl);
  var prebio = document.createElement('div'); prebio.className = 'intake-prebiologic';
  var fields = [
    {l:'Vacuna', v:r.prebiologic_status.vaccination_status},
    {l:'Serologías', v:r.prebiologic_status.serologies_status},
    {l:'TB', v:r.prebiologic_status.tb_screening_status},
    {l:'Analítica', v:r.prebiologic_status.analytics_status}
  ];
  fields.forEach(function(f) { var sp = document.createElement('span'); sp.textContent = f.l + ': ' + (f.v || '—'); prebio.appendChild(sp); });
  body.appendChild(prebio);
  if (typeof missingEl !== 'undefined' && missingEl) body.appendChild(missingEl);
  if (r.nursing_observations) { var obs = document.createElement('div'); obs.className = 'intake-observations'; var ic9 = document.createElement('i'); ic9.className = 'fas fa-comment'; obs.appendChild(ic9); obs.appendChild(document.createTextNode(' ' + escapeHtml(r.nursing_observations))); body.appendChild(obs); }
  var footer = document.createElement('div'); footer.className = 'intake-card-footer';
  if (actionBtn) footer.appendChild(actionBtn);
  card.appendChild(hdr); card.appendChild(body); card.appendChild(footer);
    grid.appendChild(card);
  });
  grid.querySelectorAll('.intake-btn-validar').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var data = JSON.parse(this.getAttribute('data-intake'));
      iniciarValidacionDesdeIntake(data);
    });
  });
}

function iniciarValidacionDesdeIntake(data) {
  sessionStorage.setItem('intake_context', JSON.stringify(data));
  precargarValidacion(data);
  var hero = document.querySelector('.patient-header-card');
  if (hero) hero.scrollIntoView({ behavior: 'smooth' });
  var btn = document.querySelector('.intake-btn-validar[data-intake]');
  if (btn) {
    /* Save and change button */ btn.textContent = '✅ Validación iniciada'; btn.classList.add('btn--success'); var btnOrig = btn.cloneNode(true); setTimeout(function() { btn.textContent = ''; btn.className = btnOrig.className; Array.from(btnOrig.childNodes).forEach(function(n) { btn.appendChild(n.cloneNode(true)); }); }, 2000);
  }
}

function precargarValidacion(data) {
  var tipoSelect = document.getElementById('fhTipoSolicitud');
  if (tipoSelect) {
    var servicioLower = (data.service || '').toLowerCase();
    if (servicioLower.includes('derma')) {
      tipoSelect.value = 'derma';
    } else if (servicioLower.includes('reuma')) {
      tipoSelect.value = 'reuma';
    }
    tipoSelect.dispatchEvent(new Event('change'));
  }
  var contextCip = document.querySelector('[data-context="cip"]');
  var contextServ = document.querySelector('[data-context="servicio"]');
  var contextPat = document.querySelector('[data-context="patologia"]');
  if (contextCip) contextCip.textContent = data.patient_id || '—';
  if (contextServ) contextServ.textContent = data.service || '—';
  if (contextPat) contextPat.textContent = data.pathology || '—';
  setTimeout(function() {
    var cip = document.getElementById('fhDermaCip');
    if (cip) cip.value = data.patient_id || '';
    var pat = document.getElementById('fhDermaPatologia');
    if (pat) {
      for (var i = 0; i < pat.options.length; i++) {
        if (pat.options[i].text.toLowerCase().includes((data.pathology || '').toLowerCase())) {
          pat.value = pat.options[i].text;
          break;
        }
      }
      if (pat.value) pat.dispatchEvent(new Event('change'));
    }
    var farm = document.getElementById('fhDermaFarmaco');
    if (farm && data.proposed_biologic && data.proposed_biologic.name) {
      farm.value = data.proposed_biologic.name;
    }
    var motivo = document.getElementById('fhDermaMotivo');
    if (motivo && data.nursing_observations) {
      var existing = motivo.value || '';
      var prefix = '[Enfermería] ';
      if (existing.indexOf(prefix) === -1) {
        motivo.value = prefix + data.nursing_observations + (existing ? '\n' + existing : '');
      }
    }
    var origenStrip = document.querySelector('.context-strip');
    if (origenStrip && !document.querySelector('[data-context-origen]')) {
      var origenEl = document.createElement('span');
      origenEl.textContent = ''; var strong = document.createElement('strong'); strong.textContent = 'Excel Enfermería mock'; origenEl.appendChild(document.createTextNode('Origen: ')); origenEl.appendChild(strong);
      origenEl.style.color = 'var(--ses-green, #008777)';
      origenEl.style.fontSize = '0.82rem';
      origenEl.setAttribute('data-context-origen', 'true');
      origenStrip.appendChild(origenEl);
    }
  }, 100);
}

function escapeHtml(text) { if (!text) return ''; return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// Intake: init
document.addEventListener('DOMContentLoaded', function() {
  var intakeCtx = sessionStorage.getItem('intake_context');
  if (intakeCtx) {
    try { precargarValidacion(JSON.parse(intakeCtx)); } catch(e) {}
  }
  initIntakeBandeja();
});
})();
