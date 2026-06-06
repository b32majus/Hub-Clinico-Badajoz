'use strict';

(function () {
    const F = window.FarmaciaDemo;
    let modoActual = null;

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
                if (an.serologias) F.setValue('fhAnaliticaSerologias', an.serologias);
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

    function renderResult(message) {
        const result = document.getElementById('fhValResultado');
        result.className = 'result-box result-box--success';
        F.clearChildren(result);
        const icon = document.createElement('i');
        icon.className = 'fas fa-check-circle';
        icon.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span');
        text.textContent = message;
        const small = document.createElement('small');
        small.textContent = F.DEMO_SESSION_NOTE;
        result.append(icon, text, document.createElement('br'), small);
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
            var otrosAtbTxt = document.getElementById('fhHSTtoOtrosAbTxt').value.trim();
            if (otrosAtbTxt) lines.push('  Especificar otros ATB: ' + otrosAtbTxt);

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
            lines.push('Serologías VHB/VHC/VIH: ' + (document.getElementById('fhAnaliticaSerologias').value || '—'));
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
        lines.push('Generado por: Hub Clínico Badajoz — Demo Farmacia v0.1');
        lines.push('ATENCIÓN: Datos sintéticos. No usar para decisiones clínicas reales.');
        return lines;
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

        document.getElementById('fhValGuardar').addEventListener('click', function () {
            if (!modoActual) { window.alert('Seleccione tipo de solicitud.'); return; }
            const estado = document.getElementById('fhValEstado').value;
            if (!estado) { window.alert('Seleccione un estado de validación.'); return; }
            if (estado === 'denied' && !document.getElementById('fhValMotivo').value.trim()) {
                window.alert('El motivo de denegación es obligatorio.');
                return;
            }
            renderResult('Validación registrada — ' + estadoLabel() + ' | Paciente: ' + selectedCip() + ' | Fecha: ' + new Date().toLocaleDateString('es-ES'));
        });

        document.getElementById('fhValExportTxt').addEventListener('click', function () {
            F.downloadFile('validacion_FH_' + new Date().toISOString().slice(0, 10) + '.txt', buildValidationLines().join('\n'), 'text/plain;charset=utf-8');
        });

        document.getElementById('fhValExportCsv').addEventListener('click', function () {
            const profesional = document.getElementById('fhValFarmaceutico').textContent.trim();
            const rows = [
                ['ID', 'Fecha', 'Servicio', 'CIP', 'Patologia', 'Estado', 'FarmacoSolicitado', 'Profesional'],
                ['FH-' + Date.now().toString(36).toUpperCase(), new Date().toLocaleDateString('es-ES'), modoActual === 'reuma' ? 'Reumatología' : 'Dermatología', selectedCip(), selectedPatologia(), estadoLabel(), (modoActual === 'reuma' ? 'Adalimumab 40 mg' : (document.getElementById('fhDermaFarmaco').value || '—')), profesional]
            ];
            const csv = rows.map(function (row) {
                return row.map(function (cell) {
                    return '"' + String(cell).replace(/"/g, '""') + '"';
                }).join(',');
            }).join('\n');
            F.downloadFile('validaciones_FH_' + new Date().toISOString().slice(0, 10) + '.csv', csv, 'text/csv;charset=utf-8');
        });

        applyContext();
    });
})();
