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
        note.textContent = showNote ? 'Campos específicos de HS no activados para esta patología en la demo.' : '';
        note.classList.toggle('hidden', !showNote);
    }

    function mostrarFormulario(modo) {
        modoActual = modo;
        document.getElementById('formDerma').classList.toggle('hidden', modo !== 'derma');
        document.getElementById('formReuma').classList.toggle('hidden', modo !== 'reuma');
        document.getElementById('validationBlock').classList.remove('hidden');
        document.getElementById('fhModoDerma').className = modo === 'derma' ? 'btn btn-primary' : 'btn btn-secondary';
        document.getElementById('fhModoReuma').className = modo === 'reuma' ? 'btn btn-primary' : 'btn btn-secondary';
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
            const p = context.patient;
            F.setValue('fhDermaFarmaco', p.farmaco);
            F.setValue('fhDermaDosis', p.dosis);
            F.setValue('fhDermaPauta', p.pauta);
            F.setValue('fhDermaAnalitica', p.analitica);
            F.setValue('fhValFarmaco', p.farmaco);
            F.setValue('fhValDosis', p.dosis);
            F.setValue('fhValPauta', p.pauta);
            F.setValue('fhValVia', p.via);
            F.setValue('fhValIndicacion', p.patologia);
            if (p.estado === 'pending') F.setValue('fhValEstado', 'pending');
            if (p.ihs4 !== undefined) F.setValue('fhHSIhs4', p.ihs4);
            if (p.hurley) F.setValue('fhHSHurley', p.hurley);
            if (p.dlqi !== undefined) F.setValue('fhHSDlqi', p.dlqi);
            if (p.localizacion) F.setValue('fhHSLocalizacion', p.localizacion);
            if (p.tratamientosPrevios) F.setValue('fhHSTratamientosPrevios', p.tratamientosPrevios);
            if (p.biologicoPrevio) F.setValue('fhHSBiologicoPrevio', p.biologicoPrevio);
            if (p.motivoClinico) F.setValue('fhHSMotivoClinico', p.motivoClinico);
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

    function buildValidationLines() {
        const lines = [];
        lines.push('=== INFORME DE VALIDACIÓN FARMACOTERAPÉUTICA ===');
        lines.push(`Identificador demo: FH-VAL-${Date.now().toString(36).toUpperCase()}`);
        lines.push(`Fecha: ${new Date().toLocaleDateString('es-ES')}`);
        lines.push('');
        if (modoActual === 'reuma') {
            lines.push('Servicio origen: Reumatología');
            lines.push('CIP: CIP-DEMO-FH-003');
            lines.push('Patología: Artritis Reumatoide (AR)');
            lines.push('Fármaco solicitado: Adalimumab 40 mg');
            lines.push('Dosis: 40 mg');
            lines.push('Pauta: SC / cada 2 semanas');
        } else {
            lines.push('Servicio origen: Dermatología');
            lines.push(`CIP: ${selectedCip()}`);
            lines.push(`Patología: ${selectedPatologia()}`);
            lines.push(`Fármaco solicitado: ${document.getElementById('fhDermaFarmaco').value || '—'}`);
            lines.push(`Dosis: ${document.getElementById('fhDermaDosis').value || '—'}`);
            lines.push(`Pauta: ${document.getElementById('fhDermaPauta').value || '—'}`);
        }
        if (isHSPathology()) {
            lines.push('');
            lines.push('--- Datos específicos Hidradenitis supurativa ---');
            lines.push(`IHS4: ${document.getElementById('fhHSIhs4').value || '—'}`);
            lines.push(`Hurley: ${document.getElementById('fhHSHurley').value || '—'}`);
            lines.push(`DLQI: ${document.getElementById('fhHSDlqi').value || '—'}`);
            lines.push(`Localización principal: ${document.getElementById('fhHSLocalizacion').value || '—'}`);
            lines.push(`Tratamientos previos: ${document.getElementById('fhHSTratamientosPrevios').value || '—'}`);
            lines.push(`Biológico previo: ${document.getElementById('fhHSBiologicoPrevio').value || '—'}`);
            lines.push(`Motivo clínico / línea terapéutica: ${document.getElementById('fhHSMotivoClinico').value || '—'}`);
        }
        lines.push('');
        lines.push(`Estado validación: ${estadoLabel()}`);
        const motivo = document.getElementById('fhValMotivo').value.trim();
        if (motivo) lines.push(`Motivo denegación: ${motivo}`);
        lines.push(`Fármaco validado: ${document.getElementById('fhValFarmaco').value || '—'}`);
        lines.push(`Dosis validada: ${document.getElementById('fhValDosis').value || '—'}`);
        lines.push(`Pauta: ${document.getElementById('fhValPauta').value || '—'}`);
        lines.push(`Vía: ${document.getElementById('fhValVia').value || '—'}`);
        lines.push(`Profesional: ${document.getElementById('fhValFarmaceutico').value || '—'}`);
        const obs = document.getElementById('fhValObservaciones').value.trim();
        if (obs) lines.push(`Observaciones: ${obs}`);
        lines.push('');
        lines.push('=== FIN DEL INFORME ===');
        lines.push('Generado por: Hub Clínico Badajoz — Demo Farmacia v0.1');
        lines.push('ATENCIÓN: Datos sintéticos. No usar para decisiones clínicas reales.');
        return lines;
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('fhModoDerma').addEventListener('click', () => mostrarFormulario('derma'));
        document.getElementById('fhModoReuma').addEventListener('click', () => mostrarFormulario('reuma'));
        document.getElementById('fhValEstado').addEventListener('change', event => {
            document.getElementById('fhValMotivoRow').classList.toggle('hidden', event.target.value !== 'denied');
        });
        document.getElementById('fhDermaPatologia').addEventListener('change', () => {
            toggleHSBlock();
        });
        document.getElementById('fhValGuardar').addEventListener('click', () => {
            if (!modoActual) { window.alert('Seleccione tipo de solicitud.'); return; }
            const estado = document.getElementById('fhValEstado').value;
            if (!estado) { window.alert('Seleccione un estado de validación.'); return; }
            if (estado === 'denied' && !document.getElementById('fhValMotivo').value.trim()) {
                window.alert('El motivo de denegación es obligatorio.');
                return;
            }
            renderResult(`Validación registrada — ${estadoLabel()} | Paciente: ${selectedCip()} | Fecha: ${new Date().toLocaleDateString('es-ES')}`);
        });
        document.getElementById('fhValExportTxt').addEventListener('click', () => {
            F.downloadFile(`validacion_FH_${new Date().toISOString().slice(0, 10)}.txt`, buildValidationLines().join('\n'), 'text/plain;charset=utf-8');
        });
        document.getElementById('fhValExportCsv').addEventListener('click', () => {
            const rows = [
                ['ID', 'Fecha', 'Servicio', 'CIP', 'Patologia', 'Estado', 'FarmacoValidado', 'Profesional'],
                [`FH-${Date.now().toString(36).toUpperCase()}`, new Date().toLocaleDateString('es-ES'), modoActual === 'reuma' ? 'Reumatología' : 'Dermatología', selectedCip(), selectedPatologia(), estadoLabel(), document.getElementById('fhValFarmaco').value || '—', document.getElementById('fhValFarmaceutico').value || '—']
            ];
            const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            F.downloadFile(`validaciones_FH_${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
        });
        applyContext();
    });
})();
