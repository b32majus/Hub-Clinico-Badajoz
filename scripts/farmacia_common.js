'use strict';

(function () {
    const qs = (selector, scope = document) => scope.querySelector(selector);
    const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

    const patients = {
        'CIP-DEMO-FH-001': {
            nombre: 'Paciente Demo FH-001', cip: 'CIP-DEMO-FH-001', edad: '48', sexo: 'Mujer', servicio: 'Dermatología', servicioSlug: 'dermatologia',
            patologia: 'Hidradenitis supurativa', farmaco: 'Secukinumab 300 mg', dosis: '300 mg', pauta: 'SC / cada 4 semanas', via: 'SC',
            estado: 'pending', estadoLabel: 'Pendiente', fechaSolicitud: '2026-05-10', ultimaSolicitud: '2026-05-10',
            analitica: 'Analítica pendiente de completar. Vacunación revisada en orden clínica simulada.', scores: 'IHS4 demo: 9; DLQI demo: 14',
            ultimaVisita: '—', adherencia: 'Sin registro', efectosAdversos: 'No registrados', proms: 'Basal pendiente', primeraVisita: 'Pendiente', seguimiento: 'No iniciado'
        },
        'CIP-DEMO-FH-002': {
            nombre: 'Paciente Demo FH-002', cip: 'CIP-DEMO-FH-002', edad: '35', sexo: 'Hombre', servicio: 'Dermatología', servicioSlug: 'dermatologia',
            patologia: 'Hidradenitis supurativa', farmaco: 'Adalimumab 80/40 mg', dosis: '80 mg inducción; 40 mg mantenimiento', pauta: 'SC / semanal según fase', via: 'SC',
            estado: 'pending', estadoLabel: 'Pendiente', fechaSolicitud: '2026-06-06', ultimaSolicitud: '2026-06-06',
            analitica: 'Analítica y cribado infeccioso pendientes de cierre.', scores: 'IHS4 demo: 12; DLQI demo: 16',
            ultimaVisita: '—', adherencia: 'Sin registro', efectosAdversos: 'No registrados', proms: 'Basal pendiente', primeraVisita: 'Pendiente', seguimiento: 'No iniciado'
        },
        'CIP-DEMO-FH-003': {
            nombre: 'Paciente Demo FH-003', cip: 'CIP-DEMO-FH-003', edad: '52', sexo: 'Mujer', servicio: 'Reumatología', servicioSlug: 'reumatologia',
            patologia: 'Artritis Reumatoide (AR)', farmaco: 'Adalimumab 40 mg', dosis: '40 mg', pauta: 'SC / cada 2 semanas', via: 'SC',
            estado: 'followup', estadoLabel: 'En seguimiento', fechaSolicitud: '2026-05-15', ultimaSolicitud: '2026-05-15',
            analitica: 'Prebiológico demo apto. Vacunación VHB y antineumocócica completa.', scores: 'DAS28 demo: 3.2; HAQ demo: 1.1',
            ultimaVisita: '2026-05-20', adherencia: 'Alta', efectosAdversos: 'No activos', proms: 'HAQ 1.1; EVA dolor 4/10', primeraVisita: '2026-05-20', seguimiento: 'Seguimiento abierto'
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

    function statusClass(status) {
        if (status === 'validated' || status === 'followup') return 'status-badge status-badge--validated';
        if (status === 'denied') return 'status-badge status-badge--denied';
        return 'status-badge status-badge--pending';
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
        statusClass
    };
})();
