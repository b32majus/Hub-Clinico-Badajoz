'use strict';

(function () {
    const F = window.FarmaciaDemo;

    function applyContext() {
        const ctx = F.getQueryContext();
        F.setValue('fhPvCip', ctx.cip);
        F.setValue('fhPvServicio', ctx.servicio || ctx.patient?.servicio);
        F.setValue('fhPvPatologia', ctx.patologia || ctx.patient?.patologia);
        if (ctx.patient) {
            F.setValue('fhPvFarmaco', ctx.patient.farmaco);
            F.setValue('fhPvDosis', ctx.patient.dosis);
            F.setValue('fhPvPauta', ctx.patient.pauta);
            F.setValue('fhPvVia', ctx.patient.via);
            F.setValue('fhPvFechaValidacion', ctx.patient.fechaSolicitud);
            F.setValue('fhPvInduccionSolicitada', ctx.patient.estado === 'pending' ? 'Pendiente de confirmar' : 'No');
            F.setValue('fhPvAnalitica', ctx.patient.analitica);
        }
        if (!ctx.cip && !ctx.patient) F.insertNoCipBanner('fhPvNoCipBanner');
    }
    document.addEventListener('DOMContentLoaded', () => {
        applyContext();
        document.getElementById('fhPvGuardar').addEventListener('click', () => {
            const result = document.getElementById('fhPvResultado');
            result.className = 'result-box result-box--success';
            F.clearChildren(result);
            const cip = document.getElementById('fhPvCip').value || 'CIP demo no indicado';
            F.appendIconText(result, 'fa-check-circle', `Primera visita registrada para ${cip}. ${F.DEMO_SESSION_NOTE}`);
        });
    });
})();
