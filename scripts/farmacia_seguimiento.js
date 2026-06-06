'use strict';

(function () {
    const F = window.FarmaciaDemo;
    const correctAnswers = { mg1: 'no', mg2: 'si', mg3: 'no', mg4: 'no' };

    function applyContext() {
        const ctx = F.getQueryContext();
        F.setValue('fhSegCip', ctx.cip);
        F.setValue('fhSegServicio', ctx.servicio || ctx.patient?.servicio);
        F.setValue('fhSegPatologia', ctx.patologia || ctx.patient?.patologia);
        if (ctx.patient) {
            F.setValue('fhSegFarmaco', ctx.patient.farmaco);
            F.setValue('fhSegDosisActual', ctx.patient.dosis);
            F.setValue('fhSegPautaActual', ctx.patient.pauta);
            F.setValue('fhSegVia', ctx.patient.via);
            F.setValue('fhSegFechaInicio', ctx.patient.primeraVisita);
            F.setValue('fhSegUltimaAdherencia', ctx.patient.adherencia);
            F.setValue('fhSegUltimosProms', ctx.patient.proms);
            F.setValue('fhSegEaPrevios', ctx.patient.efectosAdversos);
        }
        const fhSegFecha = document.getElementById('fhSegFecha');
        if (fhSegFecha && !fhSegFecha.value) {
            fhSegFecha.value = new Date().toISOString().slice(0, 10);
        }
        if (!ctx.cip && !ctx.patient) F.insertNoCipBanner('fhSegNoCipBanner');
    }

    function toggleField(fieldId, show) {
        const el = document.getElementById(fieldId);
        if (el) el.closest('.form-group').classList.toggle('hidden', !show);
    }

    function updateMorisky() {
        let incorrectas = 0;
        Object.entries(correctAnswers).forEach(([name, correct]) => {
            const selected = document.querySelector(`input[name="${name}"]:checked`);
            if (selected && selected.value !== correct) incorrectas += 1;
        });
        let text = 'Pendiente de completar';
        if (document.querySelectorAll('input[name^="mg"]:checked').length === 4) {
            if (incorrectas === 0) text = 'Alta adherencia';
            else if (incorrectas <= 2) text = 'Adherencia media / parcial';
            else text = 'Baja adherencia';
        }
        F.setText('fhSegMoriskyResultado', text);
    }

    document.addEventListener('DOMContentLoaded', () => {
        applyContext();
        document.querySelectorAll('input[name^="mg"]').forEach(input => input.addEventListener('change', updateMorisky));
        const cambioFarmaco = document.getElementById('fhSegCambioFarmaco');
        if (cambioFarmaco) cambioFarmaco.addEventListener('input', event => {
            const warning = document.getElementById('fhSegCambioFarmacoWarning');
            if (warning) warning.classList.toggle('hidden', !event.target.value.trim());
        });

        const cambiaNivel = document.getElementById('fhSegCambiaNivel');
        if (cambiaNivel) {
            const applyNivel = () => toggleField('fhSegNuevoNivel', cambiaNivel.value === 'Sí');
            cambiaNivel.addEventListener('change', applyNivel);
            applyNivel();
        }

        const optimiza = document.getElementById('fhSegOptimiza');
        if (optimiza) {
            const applyOptimiza = () => {
                const show = optimiza.value === 'Sí';
                ['fhSegNuevaDosis', 'fhSegNuevaPauta', 'fhSegMotivoOpt'].forEach(id => toggleField(id, show));
            };
            optimiza.addEventListener('change', applyOptimiza);
            applyOptimiza();
        }

        const suspension = document.getElementById('fhSegSuspension');
        if (suspension) {
            const applySusp = () => toggleField('fhSegMotivoSusp', suspension.value === 'Sí');
            suspension.addEventListener('change', applySusp);
            applySusp();
        }
        const segGuardar = document.getElementById('fhSegGuardar');
        if (segGuardar) segGuardar.addEventListener('click', () => {
            const result = document.getElementById('fhSegResultado');
            if (!result) return;
            result.className = 'result-box result-box--success';
            F.clearChildren(result);
            const cipVal = document.getElementById('fhSegCip');
            const moriskyEl = document.getElementById('fhSegMoriskyResultado');
            F.appendIconText(result, 'fa-check-circle', `Seguimiento registrado para ${cipVal ? cipVal.value : 'CIP demo no indicado'}. Morisky: ${moriskyEl ? moriskyEl.textContent : '—'}.`);
            const small = document.createElement('small');
            small.textContent = F.DEMO_SESSION_NOTE;
            result.appendChild(small);
        });
    });
})();
