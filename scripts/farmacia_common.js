'use strict';

(function () {
    const qs = (selector, scope = document) => scope.querySelector(selector);
    const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

    const patients = {
        'CIP-DEMO-FH-001': {
            nombre: 'Paciente Demo FH-001', cip: 'CIP-DEMO-FH-001', edad: '48', sexo: 'Mujer', servicio: 'Dermatología', servicioSlug: 'dermatologia',
            patologia: 'Hidradenitis supurativa', farmaco: 'Secukinumab 300 mg', dosis: '300 mg', pauta: 'SC / cada 4 semanas', via: 'SC',
            estado: 'followup', estadoLabel: 'En seguimiento', fechaSolicitud: '2026-05-10', ultimaSolicitud: '2026-05-10',
            analitica: 'Analítica y vacunación completas según protocolo prebiológico demo.', scores: 'IHS4 demo: 9 → 5 (mejoría); DLQI demo: 14 → 8',
            ultimaVisita: '2026-06-01', adherencia: 'Alta (Morisky-Green: 4/4)', efectosAdversos: 'Reacción cutánea leve (2026-05-25, resuelta)', proms: 'DLQI 8; EVA picor 3/10', primeraVisita: '2026-05-12', seguimiento: 'Seguimiento abierto',
            ihs4: 9,
            hurley: 'Hurley II',
            dlqi: 14,
            localizacion: 'Axilar bilateral',
            tiempoEvolucion: '3 años',
            tratamientosPreviosHS: {
                doxiciclinaClindamicina: true,
                rifampicinaClindamicina: true,
                otrosAtb: true,
                otrosAtbTexto: 'Minociclina 6 meses'
            },
            biologicosPrevios: {
                adalimumab: true,
                adalimumabDuracion: '6 meses',
                adalimumabMotivo: 'Fallo secundario',
                otrosBiologicos: false,
                otrosBiologicosFarmaco: '',
                otrosBiologicosMotivo: ''
            },
            analiticaEstruct: {
                fecha: '2026-05-01',
                reciente: 'si',
                hemograma: true,
                bioquimica: true,
                mantoux: 'Negativo',
                serologias: 'Negativo',
                vacunacion: 'si',
                observaciones: 'Vacunas al día antes del inicio.'
            },
            comorbilidades: {
                imc: '30.2',
                tabaquismo: 'Exfumador',
                paquetesAno: '',
                diabetes: 'no',
                hba1c: '',
                sindromeMetabolico: 'si',
                otras: 'Obesidad grado I.'
            },
            motivoClinico: 'HS Hurley II refractaria a antibioterapia oral, candidata a biológico.',
            principioActivo: 'Secukinumab'
        },
        'CIP-DEMO-FH-002': {
            nombre: 'Paciente Demo FH-002', cip: 'CIP-DEMO-FH-002', edad: '35', sexo: 'Hombre', servicio: 'Dermatología', servicioSlug: 'dermatologia',
            patologia: 'Hidradenitis supurativa', farmaco: 'Adalimumab 80/40 mg', dosis: '80 mg inducción; 40 mg mantenimiento', pauta: 'SC / semanal según fase', via: 'SC',
            estado: 'pending', estadoLabel: 'Pendiente', fechaSolicitud: '2026-06-06', ultimaSolicitud: '2026-06-06',
            analitica: 'Analítica y cribado infeccioso pendientes de cierre.', scores: 'IHS4 demo: 12; DLQI demo: 16',
            ultimaVisita: '—', adherencia: 'Sin registro', efectosAdversos: 'No registrados', proms: 'Basal pendiente', primeraVisita: 'Pendiente', seguimiento: 'No iniciado',
            ihs4: 12,
            hurley: 'Hurley III',
            dlqi: 16,
            localizacion: 'Inguinal bilateral y axilar',
            tiempoEvolucion: '5 años',
            tratamientosPreviosHS: {
                doxiciclinaClindamicina: true,
                rifampicinaClindamicina: true,
                otrosAtb: false,
                otrosAtbTexto: ''
            },
            biologicosPrevios: {
                adalimumab: false,
                adalimumabDuracion: '',
                adalimumabMotivo: '',
                otrosBiologicos: false,
                otrosBiologicosFarmaco: '',
                otrosBiologicosMotivo: ''
            },
            analiticaEstruct: {
                fecha: '2026-06-01',
                reciente: 'si',
                hemograma: true,
                bioquimica: true,
                mantoux: 'Pendiente',
                serologias: 'Pendiente',
                vacunacion: 'pendiente',
                observaciones: ''
            },
            comorbilidades: {
                imc: '28.5',
                tabaquismo: 'Activo',
                paquetesAno: '15',
                diabetes: 'no',
                hba1c: '',
                sindromeMetabolico: 'no',
                otras: ''
            },
            motivoClinico: 'HS Hurley III refractaria a múltiples líneas de antibióticos. Candidata a adalimumab.',
            principioActivo: 'Adalimumab'
        },
        'CIP-DEMO-FH-003': {
            nombre: 'Paciente Demo FH-003', cip: 'CIP-DEMO-FH-003', edad: '52', sexo: 'Mujer', servicio: 'Reumatología', servicioSlug: 'reumatologia',
            patologia: 'Artritis Reumatoide (AR)', farmaco: 'Adalimumab 40 mg', dosis: '40 mg', pauta: 'SC / cada 2 semanas', via: 'SC',
            estado: 'validated', estadoLabel: 'Validado', fechaSolicitud: '2026-03-15', ultimaSolicitud: '2026-03-15',
            analitica: 'Prebiológico demo apto. Vacunación VHB y antineumocócica completa.', scores: 'DAS28 demo: 3.2; HAQ demo: 1.1',
            ultimaVisita: '—', adherencia: 'Sin registro (primera visita pendiente)', efectosAdversos: 'No registrados', proms: 'HAQ 1.1 (basal); EVA dolor 4/10', primeraVisita: 'Pendiente', seguimiento: 'No iniciado'
        }
    };

    const profesionales = [
        { id: 'PRO-FH-01', nombre: 'Profesional FH-01', rol: 'Farmacéutico/a Hospitalario/a', especialidad: 'Dermatología; Reumatología', estado: 'Activo' },
        { id: 'PRO-FH-02', nombre: 'Profesional FH-02', rol: 'Farmacéutico/a Hospitalario/a', especialidad: 'Digestivo; Oncología', estado: 'Activo' },
        { id: 'PRO-FH-03', nombre: 'Profesional FH-03', rol: 'Residente Farmacia', especialidad: 'Rotación Farmacia Hospitalaria', estado: 'Activo' },
        { id: 'PRO-FH-04', nombre: 'Profesional FH-04', rol: 'Farmacéutico/a Hospitalario/a', especialidad: 'Hematología; soporte demo', estado: 'Activo' }
    ];

    const patologiaPorServicio = {
        dermatologia: ['Hidradenitis supurativa', 'Psoriasis', 'Dermatitis atópica', 'Vitíligo', 'Alopecia areata'],
        reumatologia: ['Artritis Reumatoide (AR)', 'Espondiloartritis (EspA)', 'Artritis Psoriásica (APs)', 'LES', 'Síndrome de Sjögren'],
        digestivo: ['Enfermedad de Crohn', 'Colitis ulcerosa', 'Otro'],
        oncologia: ['Indicación oncológica demo', 'Otro'],
        otro: ['Especificar en observaciones']
    };

    function getQueryContext() {
        const params = new URLSearchParams(window.location.search);
        const cip = (params.get('cip') || params.get('id') || '').trim();
        const patient = patients[cip] || null;
        return {
            cip,
            servicio: params.get('servicio') || patient?.servicio || '',
            servicioSlug: params.get('servicio') || patient?.servicioSlug || '',
            patologia: params.get('patologia') || patient?.patologia || '',
            entrada: params.get('entrada') || '',
            patient
        };
    }

    function makeContextUrl(base, context = {}) {
        const params = new URLSearchParams();
        if (context.cip) params.set('cip', context.cip);
        if (context.servicio) params.set('servicio', context.servicio);
        if (context.patologia) params.set('patologia', context.patologia);
        if (context.entrada) params.set('entrada', context.entrada);
        const query = params.toString();
        return query ? `${base}?${query}` : base;
    }

    function setText(id, value) {
        const el = typeof id === 'string' ? document.getElementById(id) : id;
        if (el) el.textContent = value || '—';
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el && value !== undefined && value !== null && value !== '') el.value = value;
    }

    function clearChildren(el) {
        while (el && el.firstChild) el.removeChild(el.firstChild);
    }

    function createField(label, value) {
        const field = document.createElement('div');
        field.className = 'info-field';
        const labelEl = document.createElement('span');
        labelEl.className = 'info-field__label';
        labelEl.textContent = label;
        const valueEl = document.createElement('span');
        valueEl.className = 'info-field__value';
        valueEl.textContent = value || '—';
        field.append(labelEl, valueEl);
        return field;
    }

    function renderFields(container, fields) {
        clearChildren(container);
        fields.forEach(field => container.appendChild(createField(field.label, field.value)));
    }

    function appendIconText(parent, iconClass, text) {
        const icon = document.createElement('i');
        icon.className = `fas ${iconClass}`;
        icon.setAttribute('aria-hidden', 'true');
        parent.appendChild(icon);
        parent.appendChild(document.createTextNode(` ${text}`));
    }

    function populateSelect(select, options, placeholder) {
        clearChildren(select);
        const first = document.createElement('option');
        first.value = '';
        first.textContent = placeholder || 'Seleccionar...';
        select.appendChild(first);
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            select.appendChild(opt);
        });
    }

    const STATES = {
        PENDING: 'pending',
        VALIDATED: 'validated',
        FOLLOWUP: 'followup',
        DENIED: 'denied'
    };

    const DEMO_SESSION_NOTE = 'Demo — los datos se almacenan en memoria de sesión.';

    function statusClass(status) {
        if (status === STATES.VALIDATED) return 'status-badge status-badge--validated';
        if (status === STATES.FOLLOWUP) return 'status-badge status-badge--followup';
        if (status === STATES.DENIED) return 'status-badge status-badge--denied';
        return 'status-badge status-badge--pending';
    }

    function downloadFile(name, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
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

    function initSidebarSearch() {
        const input = qs('#patientSearch');
        if (!input) return;
        input.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            const cip = input.value.trim();
            if (cip) window.location.href = makeContextUrl('farmacia_index.html', { cip });
        });
        const clearBtn = qs('#clearPatientSearch');
        if (clearBtn) {
            input.addEventListener('input', () => clearBtn.classList.toggle('hidden', !input.value));
            clearBtn.addEventListener('click', () => { input.value = ''; clearBtn.classList.add('hidden'); input.focus(); });
        }
    }

    function initContextSummary() {
        const context = getQueryContext();
        qsa('[data-context="cip"]').forEach(el => { el.textContent = context.cip || 'CIP no indicado'; });
        qsa('[data-context="servicio"]').forEach(el => { el.textContent = context.servicio || 'Servicio no indicado'; });
        qsa('[data-context="patologia"]').forEach(el => { el.textContent = context.patologia || 'Patología no indicada'; });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initSidebarSearch();
        initContextSummary();
    });

    window.FarmaciaDemo = {
        patients,
        profesionales,
        patologiaPorServicio,
        qs,
        qsa,
        getQueryContext,
        makeContextUrl,
        setText,
        setValue,
        clearChildren,
        createField,
        renderFields,
        appendIconText,
        populateSelect,
        statusClass,
        STATES,
        DEMO_SESSION_NOTE,
        downloadFile,
        insertNoCipBanner
    };
})();
