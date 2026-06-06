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
        if (!document.getElementById('fhSegFecha').value) {
            document.getElementById('fhSegFecha').value = new Date().toISOString().slice(0, 10);
        }
        if (!ctx.cip && !ctx.patient) insertNoCipBanner('fhSegNoCipBanner');
    }

    function toggleField(fieldId, show) {
        const el = document.getElementById(fieldId);
        if (el) el.closest('.form-group').classList.toggle('hidden', !show);
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
        document.getElementById('fhSegCambioFarmaco').addEventListener('input', event => {
            document.getElementById('fhSegCambioFarmacoWarning').classList.toggle('hidden', !event.target.value.trim());
        });

        const cambiaNivel = document.getElementById('fhSegCambiaNivel');
        const applyNivel = () => toggleField('fhSegNuevoNivel', cambiaNivel.value === 'Sí');
        cambiaNivel.addEventListener('change', applyNivel);
        applyNivel();

        const optimiza = document.getElementById('fhSegOptimiza');
        const applyOptimiza = () => {
            const show = optimiza.value === 'Sí';
            ['fhSegNuevaDosis', 'fhSegNuevaPauta', 'fhSegMotivoOpt'].forEach(id => toggleField(id, show));
        };
        optimiza.addEventListener('change', applyOptimiza);
        applyOptimiza();

        const suspension = document.getElementById('fhSegSuspension');
        const applySusp = () => toggleField('fhSegMotivoSusp', suspension.value === 'Sí');
        suspension.addEventListener('change', applySusp);
        applySusp();
        document.getElementById('fhSegGuardar').addEventListener('click', () => {
            const result = document.getElementById('fhSegResultado');
            result.className = 'result-box result-box--success';
            F.clearChildren(result);
            F.appendIconText(result, 'fa-check-circle', `Seguimiento registrado para ${document.getElementById('fhSegCip').value || 'CIP demo no indicado'}. Morisky: ${document.getElementById('fhSegMoriskyResultado').textContent}.`);
            const small = document.createElement('small');
            small.textContent = 'Demo — los datos se almacenan en memoria de sesión.';
            result.appendChild(small);
        });
    });
})();
