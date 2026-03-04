'use strict';

// ============================================
// DASHBOARD DE PACIENTE INDIVIDUAL - PREMIUM
// Hub Clínico Reumatología v2.0
// ============================================

window.patientHistory = null;
window.patientSummary = null;
window.currentPathology = null;
window.activityChartInstance = null;
window.proChartInstance = null;

// Variables para la tabla de visitas
let visitsTableState = {
    currentPage: 1,
    pageSize: 5,
    sortColumn: 'fecha',
    sortDirection: 'desc',
    data: []
};

// Colores consistentes con el sistema de diseño
const COLORS = {
    remission: '#10B981',
    lowActivity: '#3B82F6',
    moderate: '#F59E0B',
    highActivity: '#EF4444',
    biologic: '#8B5CF6',
    primary: '#2563EB',
    secondary: '#64748B'
};

document.addEventListener('DOMContentLoaded', () => {
    const patientId = getPatientIdFromURL();
    console.log('📊 Iniciando dashboard premium del paciente', patientId);

    if (!patientId) {
        showEmptyState('Busca un paciente para cargar su cuadro de mando.');
        return;
    }

    const bundle = loadPatientBundle(patientId);
    if (!bundle) {
        showEmptyState(`No se encontró información para el ID ${patientId}.`);
        return;
    }

    window.patientSummary = bundle.summary;
    window.patientHistory = bundle.history;
    window.currentPathology = (window.patientHistory.pathology || window.patientSummary.diagnosticoPrimario || 'espa').toLowerCase();

    populateDashboard();
    attachDashboardActions(patientId);
});

function attachDashboardActions(patientId) {
    // Botón de registrar seguimiento
    const btnSeguimiento = document.getElementById('btnSeguimiento');
    if (btnSeguimiento) {
        const pathology = window.currentPathology || 'espa';
        btnSeguimiento.href = `seguimiento.html?id=${patientId}&patologia=${pathology}`;
    }

    // Botón de exportar visitas
    const exportBtn = document.getElementById('exportVisitsBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportVisitsToCSV);
    }

    // Ordenamiento de tabla
    initTableSorting();
}

function getPatientIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function loadPatientBundle(patientId) {
    // Prioritize HubTools data if available and meaningful
    const hubBundle = loadFromHub(patientId);
    if (hubBundle && hubBundle.history.allVisits.length > 0) {
        console.log('✅ Datos obtenidos desde HubTools / Excel');
        return hubBundle;
    }

    // Fallback to MockPatients
    const mockBundle = loadFromMock(patientId);
    if (mockBundle) {
        console.log('✅ Datos obtenidos desde MockPatients');
        return mockBundle;
    }

    console.warn('⚠️ No se encontraron datos ni en HubTools ni en MockPatients');
    return null;
}

function loadFromHub(patientId) {
    if (typeof HubTools?.data?.findPatientById !== 'function') {
        return null;
    }

    const record = HubTools.data.findPatientById(patientId);
    if (!record) {
        return null;
    }

    let history = null;
    if (typeof HubTools.data.getPatientHistory === 'function') {
        try {
            const fetched = HubTools.data.getPatientHistory(patientId);
            if (fetched && fetched.allVisits && fetched.allVisits.length) {
                history = fetched;
            }
        } catch (error) {
            console.warn('loadFromHub: error recuperando historial', error);
        }
    }

    if (!history || history.allVisits.length === 0) {
        return null;
    }

    const summary = {
        idPaciente: record.ID_Paciente || record.id || '',
        nombre: record.Nombre_Paciente || record.nombre || 'Paciente',
        diagnosticoPrimario: (history.pathology || record.diagnosticoPrimario || '').toLowerCase(),
        diagnostico: record.Diagnostico_Principal || record.diagnostico || '',
        tratamientoActual: record.tratamientoActual || record.Tratamiento_Actual || '',
        fechaInicioTratamiento: record.fechaInicioTratamiento || record.Fecha_Inicio_Tratamiento || '',
        ultimaVisita: getVisitDate(history.latestVisit),
        fechaNacimiento: record.fechaNacimiento || record.Fecha_Nacimiento || ''
    };

    history.pathology = history.pathology || summary.diagnosticoPrimario;

    return { summary, history };
}

function loadFromMock(patientId) {
    if (typeof window.MockPatients?.getById !== 'function') {
        return null;
    }

    const bundle = window.MockPatients.getById(patientId);
    if (!bundle) {
        return null;
    }

    const sortedVisits = [...(bundle.visits || [])].sort((a, b) => new Date(getVisitDate(a)) - new Date(getVisitDate(b)));

    const history = {
        allVisits: sortedVisits,
        latestVisit: sortedVisits[sortedVisits.length - 1] || null,
        firstVisit: sortedVisits[0] || null,
        pathology: bundle.pathology || null,
        treatmentHistory: bundle.treatmentHistory || [],
        keyEvents: bundle.keyEvents || []
    };

    const summary = {
        ...bundle.summary,
        diagnosticoPrimario: (bundle.pathology || bundle.summary.diagnosticoPrimario || history.pathology || '').toLowerCase(),
        diagnostico: bundle.summary.diagnostico || getPathologyLabel(history.pathology)
    };

    return { summary, history };
}

function populateDashboard() {
    if (!window.patientHistory || !window.patientSummary) {
        showEmptyState('No hay información disponible para este paciente.');
        return;
    }

    const latest = window.patientHistory.latestVisit || {};
    const summary = window.patientSummary;
    const firstVisit = window.patientHistory.firstVisit || latest;
    const allVisits = window.patientHistory.allVisits || [];

    // Mostrar contenido, ocultar estado vacío
    document.getElementById('emptyState')?.classList.add('hidden');
    document.getElementById('dashboardContent')?.classList.remove('hidden');

    // ============================================
    // HEADER PREMIUM
    // ============================================
    populatePatientHeader(summary, latest, firstVisit);

    // ============================================
    // KPIs
    // ============================================
    populatePatientKPIs(latest, summary, allVisits);

    // ============================================
    // TARJETAS DE INFORMACIÓN
    // ============================================

    // Tarjeta 1: Datos Generales
    const age = summary.fechaNacimiento ? calculateAge(summary.fechaNacimiento) : (latest.fechaNacimiento ? calculateAge(latest.fechaNacimiento) : '---');
    document.getElementById('patientGeneralId').textContent = summary.idPaciente || '---';
    document.getElementById('patientGeneralName').textContent = summary.nombre || '---';
    document.getElementById('patientGeneralGender').textContent = summary.sexoPaciente || latest.sexoPaciente || latest.Sexo || '---';
    document.getElementById('patientGeneralAge').textContent = age !== '---' ? `${age} años` : '---';
    document.getElementById('patientGeneralDiagnosis').textContent = getPathologyLabel(window.currentPathology);
    document.getElementById('patientDiseaseYears').textContent = calculateDiseaseYears(getVisitDate(firstVisit)) + ' años';

    // Tarjeta 2: Biomarcadores Clave
    applyBiomarkerStatus('biomarkerHlaB27', pickValue(latest, ['hlaB27', 'HLA_B27', 'hla']));
    applyBiomarkerStatus('biomarkerFr', pickValue(latest, ['fr', 'FR']));
    applyBiomarkerStatus('biomarkerApcc', pickValue(latest, ['apcc', 'APCC']));

    // Tarjeta 3: Resumen Clínico
    const comorbidities = (latest.comorbilidades || '').split(',').filter(Boolean).map(s => `<li>${s.trim()}</li>`).join('') || '<li>Sin comorbilidades registradas</li>';
    document.getElementById('comorbiditiesList').innerHTML = comorbidities;

    const extraArticularManifestations = collectManifestations(latest);
    document.getElementById('extraArticularManifestationsList').innerHTML = extraArticularManifestations.length
        ? extraArticularManifestations.map(item => `<li>${item}</li>`).join('')
        : '<li>Sin manifestaciones registradas</li>';

    // Tarjeta 4: Tratamiento Activo
    const activeTreatment = getLastItem(window.patientHistory.treatmentHistory) || {};
    const treatmentName = summary.tratamientoActual || activeTreatment.name || 'Sin tratamiento asignado';
    const treatmentStartDate = activeTreatment.startDate || summary.fechaInicioTratamiento;
    document.getElementById('activeTreatmentName').textContent = treatmentName;
    document.getElementById('activeTreatmentStartDate').textContent = formatDate(treatmentStartDate) || 'Sin registrar';
    document.getElementById('activeTreatmentDuration').textContent = calculateTreatmentDuration(treatmentStartDate);

    // Tarjeta 5: Historial de Tratamientos
    populateTreatmentHistory();

    // Tarjeta 6: Eventos Clínicos Clave
    populateKeyEvents();

    // ============================================
    // GRÁFICOS
    // ============================================
    populateChartSelectors();
    initActivityChart();
    initPROChart();

    // ============================================
    // TABLA DE VISITAS
    // ============================================
    initVisitsTable(allVisits);

    console.log('✅ Dashboard premium poblado correctamente');
}

function populatePatientHeader(summary, latest, firstVisit) {
    // ID Badge - buscar en múltiples fuentes
    const patientId = summary.idPaciente || summary.ID_Paciente || latest.idPaciente || latest.ID_Paciente || firstVisit?.idPaciente || getPatientIdFromURL() || '---';
    document.getElementById('patientIdBadge').textContent = patientId;

    // Nombre
    document.getElementById('patientName').textContent = summary.nombre || 'Paciente';

    // Diagnóstico
    document.getElementById('patientDiagnosis').textContent = getPathologyLabel(window.currentPathology);

    // Última visita
    document.getElementById('patientLastVisit').textContent = formatDate(summary.ultimaVisita || getVisitDate(latest)) || '---';

    // Edad
    const age = summary.fechaNacimiento ? calculateAge(summary.fechaNacimiento) : (latest.fechaNacimiento ? calculateAge(latest.fechaNacimiento) : '---');
    document.getElementById('patientAge').textContent = age;

    // Sexo
    document.getElementById('patientGender').textContent = summary.sexoPaciente || latest.sexoPaciente || latest.Sexo || '---';

    // Estado clínico (badge)
    const clinicalStatus = calculateClinicalStatus(latest);
    updateStatusBadge(clinicalStatus);
}

function calculateClinicalStatus(visit) {
    if (!visit) return { status: 'unknown', text: 'Sin datos', class: '' };

    const basdai = getVisitMetric(visit, 'basdai');
    const asdas = getVisitMetric(visit, 'asdas');

    // Priorizar ASDAS si está disponible
    if (asdas !== null && !isNaN(asdas)) {
        if (asdas < 1.3) return { status: 'remission', text: 'Enfermedad Inactiva', class: '' };
        if (asdas < 2.1) return { status: 'low', text: 'Baja Actividad', class: 'patient-status-badge--low' };
        if (asdas <= 3.5) return { status: 'moderate', text: 'Actividad Moderada', class: 'patient-status-badge--moderate' };
        return { status: 'high', text: 'Alta Actividad', class: 'patient-status-badge--active' };
    }

    // Usar BASDAI como alternativa
    if (basdai !== null && !isNaN(basdai)) {
        if (basdai < 4) return { status: 'remission', text: 'Remisión', class: '' };
        if (basdai < 6) return { status: 'moderate', text: 'Actividad Moderada', class: 'patient-status-badge--moderate' };
        return { status: 'high', text: 'Alta Actividad', class: 'patient-status-badge--active' };
    }

    return { status: 'unknown', text: 'Sin datos', class: '' };
}

function updateStatusBadge(clinicalStatus) {
    const badge = document.getElementById('patientStatusBadge');
    const statusText = document.getElementById('patientStatusText');

    if (!badge || !statusText) return;

    // Resetear clases
    badge.className = 'patient-status-badge';
    if (clinicalStatus.class) {
        badge.classList.add(clinicalStatus.class);
    }

    statusText.textContent = clinicalStatus.text;
}

function populatePatientKPIs(latest, summary, allVisits) {
    // KPI 1: BASDAI
    const basdai = getVisitMetric(latest, 'basdai');
    const basdaiValue = basdai !== null ? Number(basdai).toFixed(1) : '---';
    const basdaiStatus = getKPIStatus('basdai', basdai);
    document.getElementById('kpiBASDAIValue').textContent = basdaiValue;
    document.getElementById('kpiBASDAIStatus').textContent = basdaiStatus.text;
    updateKPICardClass('kpiBASDAI', basdaiStatus.class);

    // KPI 2: ASDAS
    const asdas = getVisitMetric(latest, 'asdas');
    const asdasValue = asdas !== null ? Number(asdas).toFixed(1) : '---';
    const asdasStatus = getKPIStatus('asdas', asdas);
    document.getElementById('kpiASDASValue').textContent = asdasValue;
    document.getElementById('kpiASDASStatus').textContent = asdasStatus.text;
    updateKPICardClass('kpiASDAS', asdasStatus.class);

    // KPI 3: PCR
    const pcr = getVisitMetric(latest, 'pcr');
    const pcrValue = pcr !== null ? Number(pcr).toFixed(1) : '---';
    const pcrStatus = getKPIStatus('pcr', pcr);
    document.getElementById('kpiPCRValue').textContent = pcrValue;
    document.getElementById('kpiPCRStatus').textContent = pcrStatus.text;
    updateKPICardClass('kpiPCR', pcrStatus.class);

    // KPI 4: Tratamiento
    const activeTreatment = getLastItem(window.patientHistory.treatmentHistory) || {};
    const treatmentName = summary.tratamientoActual || activeTreatment.name || '---';
    const shortTreatmentName = treatmentName.split(' ')[0]; // Solo el nombre del fármaco
    document.getElementById('kpiTratamientoValue').textContent = shortTreatmentName;
    document.getElementById('kpiTratamientoStatus').textContent = activeTreatment.startDate ? `Desde ${formatDate(activeTreatment.startDate).substring(3)}` : 'Activo';

    // KPI 5: Visitas
    const visitCount = allVisits.length;
    document.getElementById('kpiVisitasValue').textContent = visitCount;
    document.getElementById('kpiVisitasStatus').textContent = visitCount === 1 ? 'visita' : 'visitas';
    updateKPICardClass('kpiVisitas', 'kpi-card--info');
}

function getKPIStatus(metric, value) {
    if (value === null || value === undefined || isNaN(value)) {
        return { text: 'Sin datos', class: '' };
    }

    const numValue = Number(value);

    switch (metric) {
        case 'basdai':
            if (numValue < 4) return { text: 'Remisión', class: 'kpi-card--success' };
            if (numValue < 6) return { text: 'Moderado', class: 'kpi-card--warning' };
            return { text: 'Alto', class: 'kpi-card--danger' };

        case 'asdas':
            if (numValue < 1.3) return { text: 'Inactivo', class: 'kpi-card--success' };
            if (numValue < 2.1) return { text: 'Bajo', class: 'kpi-card--info' };
            if (numValue <= 3.5) return { text: 'Moderado', class: 'kpi-card--warning' };
            return { text: 'Alto', class: 'kpi-card--danger' };

        case 'pcr':
            if (numValue < 5) return { text: 'Normal', class: 'kpi-card--success' };
            if (numValue < 10) return { text: 'Elevado', class: 'kpi-card--warning' };
            return { text: 'Alto', class: 'kpi-card--danger' };

        default:
            return { text: '', class: '' };
    }
}

function updateKPICardClass(cardId, newClass) {
    const card = document.getElementById(cardId);
    if (!card) return;

    // Remover clases anteriores
    card.classList.remove('kpi-card--success', 'kpi-card--warning', 'kpi-card--danger', 'kpi-card--info', 'kpi-card--biologic');

    // Añadir nueva clase si existe
    if (newClass) {
        card.classList.add(newClass);
    }
}

function calculateTreatmentDuration(startDate) {
    if (!startDate) return '---';

    const start = new Date(startDate);
    if (isNaN(start.getTime())) return '---';

    const now = new Date();
    const diffMs = now - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 30) return `${diffDays} días`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses`;

    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);

    if (months === 0) return `${years} año${years > 1 ? 's' : ''}`;
    return `${years} año${years > 1 ? 's' : ''} y ${months} mes${months > 1 ? 'es' : ''}`;
}

// ============================================
// TABLA DE VISITAS
// ============================================

function initVisitsTable(visits) {
    visitsTableState.data = visits.map(visit => ({
        fecha: getVisitDate(visit),
        basdai: getVisitMetric(visit, 'basdai'),
        asdas: getVisitMetric(visit, 'asdas'),
        evaDolor: getVisitMetric(visit, 'evaDolor'),
        pcr: getVisitMetric(visit, 'pcr'),
        tratamiento: visit.tratamientoActual || visit.Tratamiento_Actual || '---'
    }));

    // Ordenar por fecha descendente por defecto
    sortVisitsData('fecha', 'desc');
    renderVisitsTable();
}

function initTableSorting() {
    const headers = document.querySelectorAll('.data-table th[data-sort]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            const newDirection = visitsTableState.sortColumn === column && visitsTableState.sortDirection === 'desc' ? 'asc' : 'desc';

            // Actualizar estado
            visitsTableState.sortColumn = column;
            visitsTableState.sortDirection = newDirection;
            visitsTableState.currentPage = 1;

            // Actualizar clases visuales
            headers.forEach(h => {
                h.classList.remove('sort-asc', 'sort-desc');
            });
            header.classList.add(newDirection === 'asc' ? 'sort-asc' : 'sort-desc');

            // Reordenar y renderizar
            sortVisitsData(column, newDirection);
            renderVisitsTable();
        });
    });
}

function sortVisitsData(column, direction) {
    visitsTableState.data.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        // Convertir fechas
        if (column === 'fecha') {
            valA = new Date(valA);
            valB = new Date(valB);
        } else {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
        }

        if (direction === 'asc') {
            return valA > valB ? 1 : -1;
        }
        return valA < valB ? 1 : -1;
    });
}

function renderVisitsTable() {
    const tbody = document.getElementById('visitsTableBody');
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationControls = document.getElementById('paginationControls');

    if (!tbody) return;

    const { data, currentPage, pageSize } = visitsTableState;
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const pageData = data.slice(startIndex, endIndex);

    if (totalItems === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-message">No hay visitas registradas.</td></tr>';
        if (paginationInfo) paginationInfo.textContent = 'Mostrando 0 de 0 visitas';
        if (paginationControls) paginationControls.innerHTML = '';
        return;
    }

    // Renderizar filas
    tbody.innerHTML = pageData.map(visit => `
        <tr>
            <td>${formatDate(visit.fecha)}</td>
            <td>${visit.basdai !== null ? Number(visit.basdai).toFixed(1) : '---'}</td>
            <td>${visit.asdas !== null ? Number(visit.asdas).toFixed(1) : '---'}</td>
            <td>${visit.evaDolor !== null ? Number(visit.evaDolor).toFixed(0) : '---'}</td>
            <td>${visit.pcr !== null ? Number(visit.pcr).toFixed(1) : '---'}</td>
            <td>${visit.tratamiento}</td>
        </tr>
    `).join('');

    // Actualizar info de paginación
    if (paginationInfo) {
        paginationInfo.textContent = `Mostrando ${startIndex + 1}-${endIndex} de ${totalItems} visitas`;
    }

    // Renderizar controles de paginación
    if (paginationControls) {
        let controlsHTML = '';

        // Botón anterior
        controlsHTML += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>`;

        // Páginas
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                controlsHTML += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                controlsHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        // Botón siguiente
        controlsHTML += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>`;

        paginationControls.innerHTML = controlsHTML;
    }
}

function goToPage(page) {
    const totalPages = Math.ceil(visitsTableState.data.length / visitsTableState.pageSize);
    if (page < 1 || page > totalPages) return;

    visitsTableState.currentPage = page;
    renderVisitsTable();
}

function exportVisitsToCSV() {
    const data = visitsTableState.data;
    if (data.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const headers = ['Fecha', 'BASDAI', 'ASDAS', 'EVA Dolor', 'PCR', 'Tratamiento'];
    const rows = data.map(visit => [
        formatDate(visit.fecha),
        visit.basdai !== null ? Number(visit.basdai).toFixed(1) : '',
        visit.asdas !== null ? Number(visit.asdas).toFixed(1) : '',
        visit.evaDolor !== null ? Number(visit.evaDolor).toFixed(0) : '',
        visit.pcr !== null ? Number(visit.pcr).toFixed(1) : '',
        visit.tratamiento
    ]);

    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historial_visitas_${window.patientSummary?.idPaciente || 'paciente'}.csv`;
    link.click();
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function populateChartSelectors() {
    const activityMetrics = [
        { value: 'basdai', text: 'BASDAI' },
        { value: 'asdas', text: 'ASDAS' },
        { value: 'basfi', text: 'BASFI' },
        { value: 'haq', text: 'HAQ' },
        { value: 'lei', text: 'LEI' },
        { value: 'rapid3', text: 'RAPID3' },
        { value: 'pcr', text: 'PCR' },
        { value: 'vsg', text: 'VSG' }
    ];
    const proMetrics = [
        { value: 'evaDolor', text: 'EVA Dolor' },
        { value: 'evaGlobal', text: 'EVA Global' }
    ];

    const selectActivityIndex = document.getElementById('selectActivityIndex');
    const compareActivityIndexSelect = document.getElementById('compareActivityIndexSelect');
    const selectPRO = document.getElementById('selectPRO');
    const comparePROSelect = document.getElementById('comparePROSelect');

    [selectActivityIndex, compareActivityIndexSelect].forEach(select => {
        if (!select) return;
        select.innerHTML = '';
        activityMetrics.forEach(metric => {
            const option = document.createElement('option');
            option.value = metric.value;
            option.textContent = metric.text;
            select.appendChild(option);
        });
    });

    [selectPRO, comparePROSelect].forEach(select => {
        if (!select) return;
        select.innerHTML = '';
        proMetrics.forEach(metric => {
            const option = document.createElement('option');
            option.value = metric.value;
            option.textContent = metric.text;
            select.appendChild(option);
        });
    });

    if (selectActivityIndex) selectActivityIndex.value = 'basdai';
    if (selectPRO) selectPRO.value = 'evaDolor';
}

function applyBiomarkerStatus(elementId, value) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.className = '';
    el.textContent = formatBiomarker(value);

    const normalized = (value || '').toString().toLowerCase();
    if (normalized === 'positivo' || normalized === 'positive') {
        el.classList.add('positive');
    } else if (normalized === 'negativo' || normalized === 'negative') {
        el.classList.add('negative');
    } else {
        el.classList.add('unknown');
    }
}

function collectManifestations(visit) {
    const labels = new Set();
    if (!visit) return [];

    if (Array.isArray(visit.manifestacionesExtra)) {
        visit.manifestacionesExtra.forEach(item => labels.add(capitalizeFirst(item)));
    }

    const map = visit.manifestacionesExtraarticulares || visit.manifestacionesExtraArticulares || {};
    if ((map.uveitis || '').toUpperCase() === 'SI') labels.add('Uveítis');
    if ((map.psoriasis || '').toUpperCase() === 'SI') labels.add('Psoriasis');
    if ((map.digestiva || '').toUpperCase() === 'SI') labels.add('EII');

    return Array.from(labels);
}

function populateTreatmentHistory() {
    const container = document.getElementById('treatmentHistory');
    if (!container) return;

    const treatments = window.patientHistory.treatmentHistory || [];
    if (!treatments.length) {
        container.innerHTML = '<p class="empty-message">No hay historial de tratamientos previos.</p>';
        return;
    }

    container.innerHTML = treatments.map(treatment => `
        <div class="timeline-item event-type-treatment">
            <div class="timeline-marker"></div>
            <div class="timeline-date">${formatDate(treatment.startDate)}</div>
            <div class="timeline-content">
                <div class="timeline-title">${treatment.name}</div>
                <div class="timeline-description">${treatment.reason || 'Tratamiento en seguimiento'}</div>
            </div>
        </div>
    `).join('');
}

function populateKeyEvents() {
    const container = document.getElementById('keyEventsTimeline');
    if (!container) return;

    const events = window.patientHistory.keyEvents || [];
    if (!events.length) {
        container.innerHTML = '<p class="empty-message">No hay eventos clínicos registrados.</p>';
        return;
    }

    container.innerHTML = events.map(event => `
        <div class="timeline-item event-type-${event.type}">
            <div class="timeline-marker"></div>
            <div class="timeline-date">${formatDate(event.date)}</div>
            <div class="timeline-content">
                <div class="timeline-title">${capitalizeFirst(event.type)}</div>
                <div class="timeline-description">${event.description}</div>
            </div>
        </div>
    `).join('');
}

// ============================================
// GRÁFICOS
// ============================================

function initActivityChart() {
    const canvas = document.getElementById('activityChart');
    const selector = document.getElementById('selectActivityIndex');
    const compareCheckbox = document.getElementById('compareActivityCheckbox');
    const compareSelector = document.getElementById('compareActivityIndexSelect');
    const emptyChartMessage = document.getElementById('emptyActivityChart');

    if (!canvas || !selector) return;

    const primaryMetric = selector.value || 'basdai';
    const secondaryMetric = compareCheckbox?.checked ? compareSelector?.value : null;

    const chartData = prepareChartData(primaryMetric, secondaryMetric);

    if (chartData.datasets[0].data.length < 2) {
        emptyChartMessage?.classList.remove('hidden');
        canvas.classList.add('hidden');
        if (window.activityChartInstance) window.activityChartInstance.destroy();
        return;
    }

    emptyChartMessage?.classList.add('hidden');
    canvas.classList.remove('hidden');

    const ctx = canvas.getContext('2d');
    if (window.activityChartInstance) {
        window.activityChartInstance.destroy();
    }

    const annotations = getChartAnnotations(window.patientHistory.treatmentHistory, chartData.labels, window.currentPathology);
    const cutoffAnnotations = getCutoffAnnotations(primaryMetric, secondaryMetric, window.currentPathology);

    window.activityChartInstance = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: '#1E293B',
                    cornerRadius: 8,
                    padding: 12
                },
                annotation: {
                    annotations: {
                        ...annotations,
                        ...cutoffAnnotations
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            day: 'dd/MM/yyyy',
                            week: 'dd/MM/yyyy',
                            month: 'MMM yyyy',
                            quarter: 'MMM yyyy',
                            year: 'yyyy'
                        },
                        tooltipFormat: 'dd/MM/yyyy'
                    },
                    title: { display: true, text: 'Fecha' },
                    grid: { color: '#E2E8F0' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: primaryMetric.toUpperCase() },
                    grid: { color: '#E2E8F0' }
                },
                y1: secondaryMetric ? {
                    position: 'right',
                    beginAtZero: true,
                    title: { display: true, text: secondaryMetric.toUpperCase() },
                    grid: { display: false }
                } : undefined
            },
            animation: {
                duration: 750,
                easing: 'easeOutQuart'
            }
        }
    });

    selector.addEventListener('change', updateActivityChart);
    compareCheckbox?.addEventListener('change', () => {
        compareSelector?.classList.toggle('hidden', !compareCheckbox.checked);
        updateActivityChart();
    });
    compareSelector?.addEventListener('change', updateActivityChart);
}

function updateActivityChart() {
    const selector = document.getElementById('selectActivityIndex');
    const compareCheckbox = document.getElementById('compareActivityCheckbox');
    const compareSelector = document.getElementById('compareActivityIndexSelect');

    const primaryMetric = selector?.value || 'basdai';
    const secondaryMetric = compareCheckbox?.checked ? compareSelector?.value : null;

    const chartData = prepareChartData(primaryMetric, secondaryMetric);

    if (chartData.datasets[0].data.length < 2) {
        document.getElementById('emptyActivityChart')?.classList.remove('hidden');
        document.getElementById('activityChart')?.classList.add('hidden');
        if (window.activityChartInstance) window.activityChartInstance.destroy();
        return;
    }

    document.getElementById('emptyActivityChart')?.classList.add('hidden');
    document.getElementById('activityChart')?.classList.remove('hidden');

    if (window.activityChartInstance) {
        window.activityChartInstance.data = chartData;
        window.activityChartInstance.options.scales.y.title.text = primaryMetric.toUpperCase();
        if (secondaryMetric) {
            window.activityChartInstance.options.scales.y1 = {
                position: 'right',
                beginAtZero: true,
                title: { display: true, text: secondaryMetric.toUpperCase() },
                grid: { display: false }
            };
        } else if (window.activityChartInstance.options.scales.y1) {
            delete window.activityChartInstance.options.scales.y1;
        }
        const annotations = getChartAnnotations(window.patientHistory.treatmentHistory, chartData.labels, window.currentPathology);
        const cutoffAnnotations = getCutoffAnnotations(primaryMetric, secondaryMetric, window.currentPathology);
        window.activityChartInstance.options.plugins.annotation.annotations = { ...annotations, ...cutoffAnnotations };
        window.activityChartInstance.update();
    } else {
        initActivityChart();
    }
}

function initPROChart() {
    const canvas = document.getElementById('proChart');
    const selector = document.getElementById('selectPRO');
    const compareCheckbox = document.getElementById('comparePROCheckbox');
    const compareSelector = document.getElementById('comparePROSelect');
    const emptyChartMessage = document.getElementById('emptyPROChart');

    if (!canvas || !selector) return;

    const primaryMetric = selector.value || 'evaDolor';
    const secondaryMetric = compareCheckbox?.checked ? compareSelector?.value : null;

    const chartData = prepareChartData(primaryMetric, secondaryMetric);

    if (chartData.datasets[0].data.length < 2) {
        emptyChartMessage?.classList.remove('hidden');
        canvas.classList.add('hidden');
        if (window.proChartInstance) window.proChartInstance.destroy();
        return;
    }

    emptyChartMessage?.classList.add('hidden');
    canvas.classList.remove('hidden');

    const ctx = canvas.getContext('2d');
    if (window.proChartInstance) {
        window.proChartInstance.destroy();
    }

    const annotations = getChartAnnotations(window.patientHistory.treatmentHistory, chartData.labels, window.currentPathology);

    window.proChartInstance = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: '#1E293B',
                    cornerRadius: 8,
                    padding: 12
                },
                annotation: {
                    annotations: annotations
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            day: 'dd/MM/yyyy',
                            week: 'dd/MM/yyyy',
                            month: 'MMM yyyy',
                            quarter: 'MMM yyyy',
                            year: 'yyyy'
                        },
                        tooltipFormat: 'dd/MM/yyyy'
                    },
                    title: { display: true, text: 'Fecha' },
                    grid: { color: '#E2E8F0' }
                },
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: { display: true, text: primaryMetric === 'evaDolor' ? 'EVA Dolor' : 'EVA Global' },
                    grid: { color: '#E2E8F0' }
                },
                y1: secondaryMetric ? {
                    position: 'right',
                    beginAtZero: true,
                    max: 10,
                    title: { display: true, text: secondaryMetric === 'evaDolor' ? 'EVA Dolor' : 'EVA Global' },
                    grid: { display: false }
                } : undefined
            },
            animation: {
                duration: 750,
                easing: 'easeOutQuart'
            }
        }
    });

    selector.addEventListener('change', updatePROChart);
    compareCheckbox?.addEventListener('change', () => {
        compareSelector?.classList.toggle('hidden', !compareCheckbox.checked);
        updatePROChart();
    });
    compareSelector?.addEventListener('change', updatePROChart);
}

function updatePROChart() {
    const canvas = document.getElementById('proChart');
    const selector = document.getElementById('selectPRO');
    const compareCheckbox = document.getElementById('comparePROCheckbox');
    const compareSelector = document.getElementById('comparePROSelect');
    const emptyChartMessage = document.getElementById('emptyPROChart');

    const primaryMetric = selector?.value || 'evaDolor';
    const secondaryMetric = compareCheckbox?.checked ? compareSelector?.value : null;

    const chartData = prepareChartData(primaryMetric, secondaryMetric);

    if (chartData.datasets[0].data.length < 2) {
        emptyChartMessage?.classList.remove('hidden');
        canvas?.classList.add('hidden');
        if (window.proChartInstance) window.proChartInstance.destroy();
        return;
    }

    emptyChartMessage?.classList.add('hidden');
    canvas?.classList.remove('hidden');

    if (window.proChartInstance) {
        window.proChartInstance.data = chartData;
        window.proChartInstance.options.scales.y.title.text = primaryMetric === 'evaDolor' ? 'EVA Dolor' : 'EVA Global';
        if (secondaryMetric) {
            window.proChartInstance.options.scales.y1 = {
                position: 'right',
                beginAtZero: true,
                max: 10,
                title: { display: true, text: secondaryMetric === 'evaDolor' ? 'EVA Dolor' : 'EVA Global' },
                grid: { display: false }
            };
        } else if (window.proChartInstance.options.scales.y1) {
            delete window.proChartInstance.options.scales.y1;
        }
        const annotations = getChartAnnotations(window.patientHistory.treatmentHistory, chartData.labels, window.currentPathology);
        window.proChartInstance.options.plugins.annotation.annotations = annotations;
        window.proChartInstance.update();
    } else {
        initPROChart();
    }
}

function getVisitMetric(visit, metric) {
    const fieldMap = {
        'basdai': ['basdaiResult', 'BASDAI', 'basdai'],
        'asdas': ['asdasCrpResult', 'ASDAS', 'asdas'],
        'basfi': ['basfiResult', 'BASFI', 'basfi'],
        'haq': ['haqResult', 'HAQ', 'haq'],
        'lei': ['leiResult', 'LEI', 'lei'],
        'rapid3': ['rapid3Result', 'RAPID3', 'rapid3'],
        'pcr': ['pcrResult', 'PCR', 'pcr'],
        'vsg': ['vsgResult', 'VSG', 'vsg'],
        'evaDolor': ['evaDolor', 'EVA_Dolor', 'eva_dolor'],
        'evaGlobal': ['evaGlobal', 'EVA_Global', 'eva_global']
    };

    const possibleFields = fieldMap[metric] || [metric];

    for (const field of possibleFields) {
        if (visit[field] !== null && visit[field] !== undefined && visit[field] !== '') {
            return visit[field];
        }
    }

    return null;
}

function prepareChartData(primaryMetric, secondaryMetric = null) {
    const visits = Array.isArray(window.patientHistory?.allVisits) ? [...window.patientHistory.allVisits] : [];
    visits.sort((a, b) => new Date(getVisitDate(a)) - new Date(getVisitDate(b)));

    const labels = [];
    const primaryValues = [];
    const secondaryValues = [];

    visits.forEach(visit => {
        const primaryValue = getVisitMetric(visit, primaryMetric);
        if (primaryValue !== null && primaryValue !== undefined && primaryValue !== '') {
            // Usar formato ISO para que Chart.js pueda parsear correctamente con escala de tiempo
            const visitDate = getVisitDate(visit);
            const dateObj = new Date(visitDate);
            // Si la fecha es válida, usar formato ISO; si no, usar la fecha original
            const isoDate = !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : visitDate;
            labels.push(isoDate);
            primaryValues.push(Number(primaryValue));

            if (secondaryMetric && secondaryMetric !== primaryMetric) {
                const secondaryValue = getVisitMetric(visit, secondaryMetric);
                secondaryValues.push(secondaryValue !== null && secondaryValue !== undefined && secondaryValue !== '' ? Number(secondaryValue) : null);
            }
        }
    });

    while (secondaryMetric && secondaryValues.length < labels.length) {
        secondaryValues.push(null);
    }

    const datasets = [
        {
            label: getMetricLabel(primaryMetric),
            data: primaryValues,
            borderColor: COLORS.primary,
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: COLORS.primary,
            yAxisID: 'y'
        }
    ];

    if (secondaryMetric && secondaryMetric !== primaryMetric) {
        datasets.push({
            label: getMetricLabel(secondaryMetric),
            data: secondaryValues,
            borderColor: COLORS.highActivity,
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: false,
            tension: 0.3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: COLORS.highActivity,
            yAxisID: 'y1'
        });
    }

    return { labels, datasets };
}

function getMetricLabel(metric) {
    const labels = {
        basdai: 'BASDAI',
        asdas: 'ASDAS-CRP',
        basfi: 'BASFI',
        haq: 'HAQ',
        lei: 'LEI',
        rapid3: 'RAPID3',
        pcr: 'PCR',
        vsg: 'VSG',
        evaDolor: 'EVA Dolor',
        evaGlobal: 'EVA Global'
    };
    return labels[metric] || metric.toUpperCase();
}

function getCutoffAnnotations(primaryMetric, secondaryMetric, pathology) {
    const annotations = {};
    const cutoffs = HubTools?.dashboard?.activityCutoffs || {};

    const addCutoffLine = (metric, axisID, color, value, label) => {
        if (value !== undefined) {
            annotations[`${metric}-${label}`] = {
                type: 'line',
                yMin: value,
                yMax: value,
                borderColor: color,
                borderWidth: 1,
                borderDash: [5, 5],
                label: {
                    content: label,
                    enabled: true,
                    position: 'start',
                    color: color,
                    font: { size: 10 }
                },
                scaleID: axisID
            };
        }
    };

    const processMetricCutoffs = (metricKey, scaleID) => {
        const metricCutoffs = cutoffs[metricKey];
        if (metricCutoffs) {
            if (metricCutoffs.remission !== undefined) addCutoffLine(metricKey, scaleID, COLORS.remission, metricCutoffs.remission, 'Remisión');
            if (metricCutoffs.lowActivity !== undefined) addCutoffLine(metricKey, scaleID, COLORS.lowActivity, metricCutoffs.lowActivity, 'Baja Actividad');
            if (metricCutoffs.moderate !== undefined) addCutoffLine(metricKey, scaleID, COLORS.moderate, metricCutoffs.moderate, 'Actividad Moderada');
            if (metricCutoffs.high !== undefined) addCutoffLine(metricKey, scaleID, COLORS.highActivity, metricCutoffs.high, 'Alta Actividad');
        }
    };

    processMetricCutoffs(primaryMetric, 'y');
    if (secondaryMetric) {
        processMetricCutoffs(secondaryMetric, 'y1');
    }

    return annotations;
}

function getChartAnnotations(treatmentHistory, chartLabels, pathology) {
    const annotations = {};
    let annotationIndex = 0;

    treatmentHistory.forEach(treatment => {
        const startDate = new Date(treatment.startDate);
        const endDate = treatment.endDate ? new Date(treatment.endDate) : new Date();

        let startIndex = -1;
        let endIndex = -1;

        for (let i = 0; i < chartLabels.length; i++) {
            const chartDate = new Date(chartLabels[i]);
            if (chartDate >= startDate && (startIndex === -1 || chartDate < new Date(chartLabels[startIndex]))) {
                startIndex = i;
            }
            if (chartDate <= endDate && (endIndex === -1 || chartDate > new Date(chartLabels[endIndex]))) {
                endIndex = i;
            }
        }

        if (startIndex !== -1) {
            annotations[`treatment-${annotationIndex++}`] = {
                type: 'box',
                xMin: chartLabels[startIndex],
                xMax: endIndex !== -1 ? chartLabels[endIndex] : chartLabels[chartLabels.length - 1],
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderColor: 'rgba(139, 92, 246, 0.5)',
                borderWidth: 1,
                label: {
                    content: treatment.name,
                    enabled: true,
                    position: 'start',
                    color: COLORS.biologic,
                    font: { size: 10 }
                }
            };
        }
    });

    return annotations;
}

function showEmptyState(message = 'Busca un paciente para ver su dashboard.') {
    const emptyState = document.getElementById('emptyState');
    const dashboardContent = document.getElementById('dashboardContent');

    emptyState?.classList.remove('hidden');
    dashboardContent?.classList.add('hidden');

    const titleEl = document.getElementById('emptyStateTitle');
    const messageEl = document.getElementById('emptyStateSubtitle');
    if (titleEl) titleEl.textContent = 'Sin datos disponibles';
    if (messageEl) messageEl.textContent = message;
}

function getPathologyLabel(code) {
    if (!code) return 'Sin diagnóstico';
    const map = { espa: 'Espondiloartritis Axial', aps: 'Artritis Psoriásica' };
    return map[code.toLowerCase()] || code.toUpperCase();
}

function getVisitDate(visit) {
    if (!visit) return '';
    return visit.fechaVisita || visit.Fecha_Visita || visit.date || '';
}

function pickValue(source, keys) {
    if (!source) return undefined;
    for (const key of keys) {
        if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
            return source[key];
        }
    }
    return undefined;
}

function formatBiomarker(value) {
    if (!value) return 'No analizado';
    const normalized = value.toString().toLowerCase();
    if (normalized === 'positivo' || normalized === 'positive') return 'Positivo';
    if (normalized === 'negativo' || normalized === 'negative') return 'Negativo';
    return capitalizeFirst(value);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function calculateAge(birthDate) {
    const date = new Date(birthDate);
    if (Number.isNaN(date.getTime())) return '—';
    const diff = Date.now() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function calculateDiseaseYears(firstVisitDate) {
    if (!firstVisitDate) return '—';
    const start = new Date(firstVisitDate);
    if (Number.isNaN(start.getTime())) return '—';
    const diff = Date.now() - start.getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24 * 365.25)));
}

function capitalizeFirst(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function getLastItem(list) {
    if (!Array.isArray(list) || !list.length) return null;
    return list[list.length - 1];
}

// ============================================
// EXPONER FUNCIONES GLOBALES
// ============================================
window.goToPage = goToPage;
window.getPatientIdFromURL = getPatientIdFromURL;
window.loadPatientBundle = loadPatientBundle;
window.populateDashboard = populateDashboard;
window.populateTreatmentHistory = populateTreatmentHistory;
window.populateKeyEvents = populateKeyEvents;
window.showEmptyState = showEmptyState;
window.formatBiomarker = formatBiomarker;
window.formatDate = formatDate;
window.calculateAge = calculateAge;
window.calculateDiseaseYears = calculateDiseaseYears;
window.capitalizeFirst = capitalizeFirst;
window.initActivityChart = initActivityChart;
window.updateActivityChart = updateActivityChart;
window.initPROChart = initPROChart;
window.updatePROChart = updatePROChart;
window.prepareChartData = prepareChartData;
window.getChartAnnotations = getChartAnnotations;
window.getCutoffAnnotations = getCutoffAnnotations;
window.getVisitMetric = getVisitMetric;
window.exportVisitsToCSV = exportVisitsToCSV;
