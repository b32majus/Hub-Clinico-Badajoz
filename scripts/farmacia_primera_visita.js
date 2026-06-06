'use strict';

(function () {
    const F = window.FarmaciaDemo;

    function applyContext(ctx) {
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

    document.addEventListener('DOMContentLoaded', () => {
        const ctx = F.getQueryContext();
        applyContext(ctx);
        applyTratamientoValidado(ctx);
        const guardar = document.getElementById('fhPvGuardar');
        if (guardar) guardar.addEventListener('click', () => {
            const result = document.getElementById('fhPvResultado');
            if (!result) return;
            result.className = 'result-box result-box--success';
            F.clearChildren(result);
            const cip = document.getElementById('fhPvCip').value || 'CIP demo no indicado';
            F.appendIconText(result, 'fa-check-circle', `Primera visita registrada para ${cip}. ${F.DEMO_SESSION_NOTE}`);
        });
    });
})();
