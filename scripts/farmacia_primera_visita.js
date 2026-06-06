'use strict';

(function () {
    const F = window.FarmaciaDemo;

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
        if (!ctx.cip && !ctx.patient) insertNoCipBanner('fhPvNoCipBanner');
    }
    document.addEventListener('DOMContentLoaded', () => {
        applyContext();
        document.getElementById('fhPvGuardar').addEventListener('click', () => {
            const result = document.getElementById('fhPvResultado');
            result.className = 'result-box result-box--success';
            F.clearChildren(result);
            const cip = document.getElementById('fhPvCip').value || 'CIP demo no indicado';
            F.appendIconText(result, 'fa-check-circle', `Primera visita registrada para ${cip}. Demo en memoria de sesión.`);
        });
    });
})();
