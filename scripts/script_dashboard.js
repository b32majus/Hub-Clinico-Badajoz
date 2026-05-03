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

function normalizePathology(value) {
    if (typeof HubTools?.normalizer?.normalizePathology === 'function') {
        return HubTools.normalizer.normalizePathology(value);
    }
    return (value || '').toString().trim().toLowerCase();
}

function normalizeRecord(record, extra) {
    if (typeof HubTools?.normalizer?.normalizeRecord === 'function') {
        return HubTools.normalizer.normalizeRecord(record, extra);
    }
    return { ...(record || {}), ...(extra || {}) };
}

function isARPathology() {
    return (window.currentPathology || '').toLowerCase() === 'ar';
}

function getARPrimaryMetric(visit) {
    const toNumber = (value) => {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const das28Crp = toNumber(getVisitMetric(visit, 'das28Crp'));
    if (das28Crp !== null) return das28Crp;

    const das28Esr = toNumber(getVisitMetric(visit, 'das28Esr'));
    if (das28Esr !== null) return das28Esr;

    const cdai = toNumber(getVisitMetric(visit, 'cdai'));
    if (cdai !== null) return cdai;

    return null;
}

function getARSecondaryMetric(visit) {
    const toNumber = (value) => {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const cdai = toNumber(getVisitMetric(visit, 'cdai'));
    if (cdai !== null) return cdai;

    const sdai = toNumber(getVisitMetric(visit, 'sdai'));
    if (sdai !== null) return sdai;

    return null;
}

function configureDashboardMetricLabels() {
    const primaryKpiLabel = document.getElementById('kpiPrimaryMetricLabel');
    const secondaryKpiLabel = document.getElementById('kpiSecondaryMetricLabel');
    const primaryTableHeader = document.getElementById('visitsTablePrimaryHeader');
    const secondaryTableHeader = document.getElementById('visitsTableSecondaryHeader');

    const isAR = isARPathology();
    const isLES = (window.currentPathology || '').toLowerCase() === 'les';
    const isSJOGREN = (window.currentPathology || '').toLowerCase() === 'sjogren';
    let primaryLabel, secondaryLabel;
    if (isSJOGREN) {
        primaryLabel = 'ESSPRI';
        secondaryLabel = 'ESSDAI';
    } else if (isLES) {
        primaryLabel = 'SLEDAI-2K';
        secondaryLabel = 'SLICC/ACR SDI';
    } else if (isAR) {
        primaryLabel = 'DAS28';
        secondaryLabel = 'CDAI/SDAI';
    } else {
        primaryLabel = 'BASDAI';
        secondaryLabel = 'ASDAS';
    }

    if (primaryKpiLabel) primaryKpiLabel.textContent = primaryLabel;
    if (secondaryKpiLabel) secondaryKpiLabel.textContent = secondaryLabel;
    if (primaryTableHeader) primaryTableHeader.innerHTML = `${primaryLabel} <i class="fas fa-sort"></i>`;
    if (secondaryTableHeader) secondaryTableHeader.innerHTML = `${secondaryLabel} <i class="fas fa-sort"></i>`;
}
document.addEventListener('DOMContentLoaded', () => {
    const patientId = getPatientIdFromURL();
    console.log(' Iniciando dashboard premium del paciente', patientId);

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
        btnSeguimiento.href = `seguimiento.html?id=${encodeURIComponent(patientId)}&patologia=${encodeURIComponent(pathology)}`;
    }

    // Botón de exportar visitas
    const exportBtn = document.getElementById('exportVisitsBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportVisitsToCSV);
    }

    // Botón de Solicitud FH
    const btnSolicitudFH = document.getElementById('btnSolicitudFH');
    if (btnSolicitudFH) {
        btnSolicitudFH.addEventListener('click', function() {
            var summary = window.patientSummary || {};
            var latestVisit = (window.patientHistory && window.patientHistory.latestVisit) ? normalizeRecord(window.patientHistory.latestVisit) : {};

            // Construir objeto datos combinando summary y latestVisit
            var datos = {
                cip: summary.cip || summary.idPaciente || '',
                idPaciente: summary.idPaciente || '',
                nombrePaciente: summary.nombre || summary.nombrePaciente || '',
                fechaVisita: latestVisit.fechaVisita || summary.fechaVisita || '',
                profesional: latestVisit.profesional || summary.profesional || '',
                diagnosticoPrimario: summary.diagnosticoPrimario || window.currentPathology || '',
                diagnosticoSecundario: summary.diagnosticoSecundario || latestVisit.diagnosticoSecundario || '',
                tratamientoActual: summary.tratamientoActual || latestVisit.tratamientoActual || '',
                // Scores de actividad desde latestVisit
                evaGlobal: latestVisit.evaGlobal || '',
                evaDolor: latestVisit.evaDolor || '',
                evaMedico: latestVisit.evaMedico || '',
                basdaiResult: latestVisit.basdaiResult || '',
                asdasCrpResult: latestVisit.asdasCrpResult || '',
                asdasEsrResult: latestVisit.asdasEsrResult || '',
                das28CrpResult: latestVisit.das28CrpResult || '',
                das28EsrResult: latestVisit.das28EsrResult || '',
                cdaiResult: latestVisit.cdaiResult || '',
                sdaiResult: latestVisit.sdaiResult || '',
                rapid3Total: latestVisit.rapid3Total || latestVisit.rapid3Result || '',
                rapid3Categoria: latestVisit.rapid3Categoria || '',
                pcr: latestVisit.pcr || '',
                vsg: latestVisit.vsg || '',
                // Tratamientos (fallback a campos individuales)
                sistemicoSelect: latestVisit.sistemicoSelect || '',
                sistemicoDose: latestVisit.sistemicoDose || '',
                fameSelect: latestVisit.fameSelect || '',
                fameDose: latestVisit.fameDose || '',
                biologicoSelect: latestVisit.biologicoSelect || '',
                biologicoDose: latestVisit.biologicoDose || '',
                planSistemicosEntries: latestVisit.planSistemicosEntries || latestVisit.cambioSistemicosEntries || [],
                planFamesEntries: latestVisit.planFamesEntries || latestVisit.cambioFamesEntries || [],
                planBiologicosEntries: latestVisit.planBiologicosEntries || latestVisit.cambioBiologicosEntries || [],
                decisionTerapeutica: latestVisit.decisionTerapeutica || '',
                tratamientoData: latestVisit.tratamientoData || {},
                estadoPrebiologicoFinal: latestVisit.estadoPrebiologicoFinal || latestVisit.Estado_Prebiologico_Final || '',
                fechaValidacionPrebiologico: latestVisit.fechaValidacionPrebiologico || latestVisit.Fecha_Validacion_Prebiologico || '',
                hemogramaCorrecto: latestVisit.hemogramaCorrecto || latestVisit.Hemograma_Correcto || '',
                bioquimicaCorrecta: latestVisit.bioquimicaCorrecta || latestVisit.Bioquimica_Correcta || '',
                serologiasCorrectas: latestVisit.serologiasCorrectas || latestVisit.Serologias_Correctas || '',
                igraMantouxResultado: latestVisit.igraMantouxResultado || latestVisit.IGRA_Mantoux_Resultado || '',
                rxToraxCorrecta: latestVisit.rxToraxCorrecta || latestVisit.Rx_Torax_Correcta || '',
                vacunacionRevisada: latestVisit.vacunacionRevisada || latestVisit.Vacunacion_Revisada || '',
                vacunacionOK: latestVisit.vacunacionOK || latestVisit.Vacunacion_OK || '',
                medicinaPreventivaDerivada: latestVisit.medicinaPreventivaDerivada || latestVisit.Medicina_Preventiva_Derivada || '',
                vacunasPendientes: latestVisit.vacunasPendientes || latestVisit.Vacunas_Pendientes || '',
                observacionesPrebiologico: latestVisit.observacionesPrebiologico || latestVisit.Observaciones_Prebiologico || ''
            };

            if (typeof HubTools !== 'undefined' && HubTools.pharmacy && typeof HubTools.pharmacy.copyRequestToClipboard === 'function') {
                HubTools.pharmacy.copyRequestToClipboard(datos);
            } else {
                console.error('[Dashboard] HubTools.pharmacy.copyRequestToClipboard no disponible');
                if (typeof HubTools !== 'undefined' && HubTools.utils && typeof HubTools.utils.mostrarNotificacion === 'function') {
                    HubTools.utils.mostrarNotificacion('Módulo de solicitud FH no disponible.', 'error');
                }
            }
        });
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
        console.log(' Datos obtenidos desde HubTools / Excel');
        return hubBundle;
    }

    // Fallback to MockPatients
    const mockBundle = loadFromMock(patientId);
    if (mockBundle) {
        console.log(' Datos obtenidos desde MockPatients');
        return mockBundle;
    }

    console.warn(' No se encontraron datos ni en HubTools ni en MockPatients');
    return null;
}

function loadFromHub(patientId) {
    if (typeof HubTools.data.findPatientById !== 'function') {
        return null;
    }

    const record = HubTools.data.findPatientById(patientId);
    if (!record) {
        return null;
    }
    const normalizedRecord = normalizeRecord(record);

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

    const normalizedVisits = history.allVisits.map(visit => normalizeRecord(visit));
    const latestVisit = history.latestVisit ? normalizeRecord(history.latestVisit) : (normalizedVisits[0] || null);
    const firstVisit = history.firstVisit ? normalizeRecord(history.firstVisit) : (normalizedVisits[normalizedVisits.length - 1] || null);
    const pathology = normalizePathology(history.pathology || normalizedRecord.diagnosticoPrimario);

    const summary = {
        idPaciente: normalizedRecord.idPaciente || patientId,
        nombre: normalizedRecord.nombrePaciente || record.Nombre || record.nombre || 'Paciente',
        sexoPaciente: normalizedRecord.sexoPaciente || latestVisit?.sexoPaciente || '',
        diagnosticoPrimario: pathology,
        diagnostico: record.Diagnostico_Principal || record.diagnostico || getPathologyLabel(pathology),
        tratamientoActual: normalizedRecord.tratamientoActual || latestVisit?.tratamientoActual || '',
        fechaInicioTratamiento: normalizedRecord.fechaInicioTratamiento || '',
        ultimaVisita: getVisitDate(latestVisit || history.latestVisit),
        fechaNacimiento: normalizedRecord.fechaNacimiento || latestVisit?.fechaNacimiento || ''
    };

    history = {
        ...history,
        allVisits: normalizedVisits,
        latestVisit: latestVisit || history.latestVisit,
        firstVisit: firstVisit || history.firstVisit,
        pathology: pathology || history.pathology || ''
    };

    return { summary, history };
}

function loadFromMock(patientId) {
    if (typeof window.MockPatients.getById !== 'function') {
        return null;
    }

    const bundle = window.MockPatients.getById(patientId);
    if (!bundle) {
        return null;
    }

    const sortedVisits = [...(bundle.visits || [])]
        .map(visit => normalizeRecord(visit))
        .sort((a, b) => new Date(getVisitDate(a)) - new Date(getVisitDate(b)));

    const history = {
        allVisits: sortedVisits,
        latestVisit: sortedVisits[sortedVisits.length - 1] || null,
        firstVisit: sortedVisits[0] || null,
        pathology: normalizePathology(bundle.pathology || bundle.summary.diagnosticoPrimario),
        treatmentHistory: bundle.treatmentHistory || [],
        keyEvents: bundle.keyEvents || []
    };

    const summary = {
        ...normalizeRecord(bundle.summary, {
            diagnosticoPrimario: bundle.pathology || bundle.summary.diagnosticoPrimario || history.pathology || ''
        }),
        nombre: bundle.summary.nombre || bundle.summary.nombrePaciente,
        diagnosticoPrimario: normalizePathology(bundle.pathology || bundle.summary.diagnosticoPrimario || history.pathology || ''),
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

    configureDashboardMetricLabels();
    renderPrebiologicBadge(summary.idPaciente || getPatientIdFromURL(), latest);

    // Mostrar contenido, ocultar estado vacío
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('dashboardContent').classList.remove('hidden');

    // ============================================
    // HEADER PREMIUM
    // ============================================
    populatePatientHeader(summary, latest, firstVisit);

    // ============================================
    // KPIs
    // ============================================
    populatePatientKPIs(latest, summary, allVisits);

    // ============================================
    // TARJETAS DE INFORMACIN
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
    filterMetricSelectorsByPathology(window.currentPathology);
    initActivityChart();
    initPROChart();

    // ============================================
    // TABLA DE VISITAS
    // ============================================
    initVisitsTable(allVisits);

    console.log(' Dashboard premium poblado correctamente');
}

function populatePatientHeader(summary, latest, firstVisit) {
    // ID Badge - buscar en mltiples fuentes
    const patientId = summary.idPaciente || latest.idPaciente || firstVisit.idPaciente || getPatientIdFromURL() || '---';
    document.getElementById('patientIdBadge').textContent = patientId;

    // Nombre
    document.getElementById('patientName').textContent = summary.nombre || 'Paciente';

    // Diagnóstico
    document.getElementById('patientDiagnosis').textContent = getPathologyLabel(window.currentPathology);

    // ltima visita
    document.getElementById('patientLastVisit').textContent = formatDate(summary.ultimaVisita || getVisitDate(latest)) || '---';

    // Edad
    const age = summary.fechaNacimiento ? calculateAge(summary.fechaNacimiento) : (latest.fechaNacimiento ? calculateAge(latest.fechaNacimiento) : '---');
    document.getElementById('patientAge').textContent = age;

    // Sexo
    document.getElementById('patientGender').textContent = summary.sexoPaciente || latest.sexoPaciente || '---';

    // Estado clínico (badge)
    const clinicalStatus = calculateClinicalStatus(latest);
    updateStatusBadge(clinicalStatus);
}

function calculateClinicalStatus(visit) {
    if (!visit) return { status: 'unknown', text: 'Sin datos', class: '' };

    if (isARPathology()) {
        const das28 = getARPrimaryMetric(visit);
        if (das28 !== null && !isNaN(das28)) {
            if (das28 < 2.6) return { status: 'remission', text: 'Remisi\u00f3n', class: '' };
            if (das28 < 3.2) return { status: 'low', text: 'Baja Actividad', class: 'patient-status-badge--low' };
            if (das28 <= 5.1) return { status: 'moderate', text: 'Actividad Moderada', class: 'patient-status-badge--moderate' };
            return { status: 'high', text: 'Alta Actividad', class: 'patient-status-badge--active' };
        }

        const cdai = getARSecondaryMetric(visit);
        if (cdai !== null && !isNaN(cdai)) {
            if (cdai <= 2.8) return { status: 'remission', text: 'Remisi\u00f3n', class: '' };
            if (cdai <= 10) return { status: 'low', text: 'Baja Actividad', class: 'patient-status-badge--low' };
            if (cdai <= 22) return { status: 'moderate', text: 'Actividad Moderada', class: 'patient-status-badge--moderate' };
            return { status: 'high', text: 'Alta Actividad', class: 'patient-status-badge--active' };
        }
    }

    const basdai = getVisitMetric(visit, 'basdai');
    const asdas = getVisitMetric(visit, 'asdas');

    if (asdas !== null && !isNaN(asdas)) {
        if (asdas < 1.3) return { status: 'remission', text: 'Enfermedad Inactiva', class: '' };
        if (asdas < 2.1) return { status: 'low', text: 'Baja Actividad', class: 'patient-status-badge--low' };
        if (asdas <= 3.5) return { status: 'moderate', text: 'Actividad Moderada', class: 'patient-status-badge--moderate' };
        return { status: 'high', text: 'Alta Actividad', class: 'patient-status-badge--active' };
    }

    if (basdai !== null && !isNaN(basdai)) {
        if (basdai < 4) return { status: 'remission', text: 'Remisi\u00f3n', class: '' };
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
    const isAR = isARPathology();
    const isLES = (window.currentPathology || '').toLowerCase() === 'les';
    const isSJOGREN = (window.currentPathology || '').toLowerCase() === 'sjogren';

    let primaryMetric, primaryMetricKey, secondaryMetric, secondaryMetricKey;

    if (isSJOGREN) {
        primaryMetric = getVisitMetric(latest, 'esspriResult');
        primaryMetricKey = 'esspri';
        secondaryMetric = getVisitMetric(latest, 'essdaiResult');
        secondaryMetricKey = 'essdai';
    } else if (isLES) {
        primaryMetric = getVisitMetric(latest, 'sledai2kResult');
        primaryMetricKey = 'sledai2k';
        secondaryMetric = getVisitMetric(latest, 'sliccAcrSdi');
        secondaryMetricKey = 'slicc';
    } else if (isAR) {
        primaryMetric = getARPrimaryMetric(latest);
        primaryMetricKey = 'das28';
        secondaryMetric = getARSecondaryMetric(latest);
        secondaryMetricKey = 'cdai';
    } else {
        primaryMetric = getVisitMetric(latest, 'basdai');
        primaryMetricKey = 'basdai';
        secondaryMetric = getVisitMetric(latest, 'asdas');
        secondaryMetricKey = 'asdas';
    }
    const primaryMetricValue = primaryMetric !== null ? Number(primaryMetric).toFixed(1) : '---';
    const primaryStatus = getKPIStatus(primaryMetricKey, primaryMetric);
    document.getElementById('kpiBASDAIValue').textContent = primaryMetricValue;
    document.getElementById('kpiBASDAIStatus').textContent = primaryStatus.text;
    const kpiBASDAIThreshold = document.getElementById('kpiBASDAIThreshold');
    if (kpiBASDAIThreshold) kpiBASDAIThreshold.textContent = primaryStatus.threshold || '';
    updateKPICardClass('kpiBASDAI', primaryStatus.class);

    const secondaryMetricValue = secondaryMetric !== null ? Number(secondaryMetric).toFixed(1) : '---';
    const secondaryStatus = getKPIStatus(secondaryMetricKey, secondaryMetric);
    document.getElementById('kpiASDASValue').textContent = secondaryMetricValue;
    document.getElementById('kpiASDASStatus').textContent = secondaryStatus.text;
    const kpiASDASThreshold = document.getElementById('kpiASDASThreshold');
    if (kpiASDASThreshold) kpiASDASThreshold.textContent = secondaryStatus.threshold || '';
    updateKPICardClass('kpiASDAS', secondaryStatus.class);

    const pcr = getVisitMetric(latest, 'pcr');
    const pcrValue = pcr !== null ? Number(pcr).toFixed(1) : '---';
    const pcrStatus = getKPIStatus('pcr', pcr);
    document.getElementById('kpiPCRValue').textContent = pcrValue;
    document.getElementById('kpiPCRStatus').textContent = pcrStatus.text;
    const kpiPCRThreshold = document.getElementById('kpiPCRThreshold');
    if (kpiPCRThreshold) kpiPCRThreshold.textContent = pcrStatus.threshold || '';
    updateKPICardClass('kpiPCR', pcrStatus.class);

    const activeTreatment = getLastItem(window.patientHistory.treatmentHistory) || {};
    const treatmentName = summary.tratamientoActual || activeTreatment.name || '---';
    const shortTreatmentName = treatmentName.split(' ')[0];
    document.getElementById('kpiTratamientoValue').textContent = shortTreatmentName;
    document.getElementById('kpiTratamientoStatus').textContent = activeTreatment.startDate ? `Desde ${formatDate(activeTreatment.startDate).substring(3)}` : 'Activo';

    const visitCount = allVisits.length;
    document.getElementById('kpiVisitasValue').textContent = visitCount;
    document.getElementById('kpiVisitasStatus').textContent = visitCount === 1 ? 'visita' : 'visitas';
    updateKPICardClass('kpiVisitas', 'kpi-card--info');
}

function getKPIStatus(metric, value) {
    if (value === null || value === undefined || isNaN(value)) {
        return { text: 'Sin datos', class: '', threshold: '' };
    }

    const numValue = Number(value);

    switch (metric) {
        case 'basdai':
            if (numValue < 4) return { text: 'Remisi\u00f3n', class: 'kpi-card--success', threshold: '\u003c4 remisi\u00f3n | \u22654 activo | \u22656 muy activo' };
            if (numValue < 6) return { text: 'Moderado', class: 'kpi-card--warning', threshold: '\u003c4 remisi\u00f3n | \u22654 activo | \u22656 muy activo' };
            return { text: 'Alto', class: 'kpi-card--danger', threshold: '\u003c4 remisi\u00f3n | \u22654 activo | \u22656 muy activo' };

        case 'asdas':
            if (numValue < 1.3) return { text: 'Inactivo', class: 'kpi-card--success', threshold: '\u003c1.3 inactiva | 1.3\u20132.1 baja | 2.1\u20133.5 moderada | \u003e3.5 alta' };
            if (numValue < 2.1) return { text: 'Bajo', class: 'kpi-card--info', threshold: '\u003c1.3 inactiva | 1.3\u20132.1 baja | 2.1\u20133.5 moderada | \u003e3.5 alta' };
            if (numValue <= 3.5) return { text: 'Moderado', class: 'kpi-card--warning', threshold: '\u003c1.3 inactiva | 1.3\u20132.1 baja | 2.1\u20133.5 moderada | \u003e3.5 alta' };
            return { text: 'Alto', class: 'kpi-card--danger', threshold: '\u003c1.3 inactiva | 1.3\u20132.1 baja | 2.1\u20133.5 moderada | \u003e3.5 alta' };

        case 'das28':
            if (numValue < 2.6) return { text: 'Remisi\u00f3n', class: 'kpi-card--success', threshold: '\u003c2.6 remisi\u00f3n | 2.6\u20133.2 baja | 3.2\u20135.1 moderada | \u003e5.1 alta' };
            if (numValue < 3.2) return { text: 'Baja', class: 'kpi-card--info', threshold: '\u003c2.6 remisi\u00f3n | 2.6\u20133.2 baja | 3.2\u20135.1 moderada | \u003e5.1 alta' };
            if (numValue <= 5.1) return { text: 'Moderada', class: 'kpi-card--warning', threshold: '\u003c2.6 remisi\u00f3n | 2.6\u20133.2 baja | 3.2\u20135.1 moderada | \u003e5.1 alta' };
            return { text: 'Alta', class: 'kpi-card--danger', threshold: '\u003c2.6 remisi\u00f3n | 2.6\u20133.2 baja | 3.2\u20135.1 moderada | \u003e5.1 alta' };

        case 'cdai':
            if (numValue <= 2.8) return { text: 'Remisi\u00f3n', class: 'kpi-card--success', threshold: '\u22642.8 remisi\u00f3n | \u226410 baja | \u226422 moderada | \u003e22 alta' };
            if (numValue <= 10) return { text: 'Baja', class: 'kpi-card--info', threshold: '\u22642.8 remisi\u00f3n | \u226410 baja | \u226422 moderada | \u003e22 alta' };
            if (numValue <= 22) return { text: 'Moderada', class: 'kpi-card--warning', threshold: '\u22642.8 remisi\u00f3n | \u226410 baja | \u226422 moderada | \u003e22 alta' };
            return { text: 'Alta', class: 'kpi-card--danger', threshold: '\u22642.8 remisi\u00f3n | \u226410 baja | \u226422 moderada | \u003e22 alta' };

        case 'sdai':
            if (numValue <= 3.3) return { text: 'Remisi\u00f3n', class: 'kpi-card--success', threshold: '\u22643.3 remisi\u00f3n | \u226411 baja | \u226426 moderada | \u003e26 alta' };
            if (numValue <= 11) return { text: 'Baja', class: 'kpi-card--info', threshold: '\u22643.3 remisi\u00f3n | \u226411 baja | \u226426 moderada | \u003e26 alta' };
            if (numValue <= 26) return { text: 'Moderada', class: 'kpi-card--warning', threshold: '\u22643.3 remisi\u00f3n | \u226411 baja | \u226426 moderada | \u003e26 alta' };
            return { text: 'Alta', class: 'kpi-card--danger', threshold: '\u22643.3 remisi\u00f3n | \u226411 baja | \u226426 moderada | \u003e26 alta' };

        case 'pcr':
            if (numValue < 5) return { text: 'Normal', class: 'kpi-card--success', threshold: '\u003c5 normal | 5\u201310 elevado | \u003e10 alto' };
            if (numValue < 10) return { text: 'Elevado', class: 'kpi-card--warning', threshold: '\u003c5 normal | 5\u201310 elevado | \u003e10 alto' };
            return { text: 'Alto', class: 'kpi-card--danger', threshold: '\u003c5 normal | 5\u201310 elevado | \u003e10 alto' };

        case 'sledai2k':
            if (numValue <= 4) return { text: 'Inactivo', class: 'kpi-card--success', threshold: '\u22644 inactivo | 5\u201310 moderado | 11\u201319 alto | \u226520 muy alto' };
            if (numValue <= 10) return { text: 'Moderado', class: 'kpi-card--warning', threshold: '\u22644 inactivo | 5\u201310 moderado | 11\u201319 alto | \u226520 muy alto' };
            if (numValue <= 19) return { text: 'Alto', class: 'kpi-card--danger', threshold: '\u22644 inactivo | 5\u201310 moderado | 11\u201319 alto | \u226520 muy alto' };
            return { text: 'Muy alto', class: 'kpi-card--danger', threshold: '\u22644 inactivo | 5\u201310 moderado | 11\u201319 alto | \u226520 muy alto' };

        case 'slicc':
            if (numValue <= 0) return { text: 'Sin daño', class: 'kpi-card--success', threshold: '0 sin daño | ≥1 daño acumulado' };
            return { text: 'Daño acumulado', class: 'kpi-card--warning', threshold: '0 sin daño | ≥1 daño acumulado' };

        case 'esspri':
            if (numValue < 5) return { text: 'Aceptable', class: 'kpi-card--success', threshold: '<5 aceptable | ≥5 mal control' };
            return { text: 'Mal control', class: 'kpi-card--danger', threshold: '<5 aceptable | ≥5 mal control' };

        case 'essdai':
            if (numValue < 5) return { text: 'Baja actividad', class: 'kpi-card--success', threshold: '<5 baja | 5-13 moderada | ≥14 alta' };
            if (numValue < 14) return { text: 'Moderada', class: 'kpi-card--warning', threshold: '<5 baja | 5-13 moderada | ≥14 alta' };
            return { text: 'Alta', class: 'kpi-card--danger', threshold: '<5 baja | 5-13 moderada | ≥14 alta' };

        default:
            return { text: '', class: '', threshold: '' };
    }
}

function updateKPICardClass(cardId, newClass) {
    const card = document.getElementById(cardId);
    if (!card) return;

    // Remover clases anteriores
    card.classList.remove('kpi-card--success', 'kpi-card--warning', 'kpi-card--danger', 'kpi-card--info', 'kpi-card--biologic');

    // Aadir nueva clase si existe
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

    if (diffDays < 30) return `${diffDays} das`;
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
    const isAR = isARPathology();
    const isSJOGREN = (window.currentPathology || '').toLowerCase() === 'sjogren';
    visitsTableState.data = visits.map(visit => ({
        fecha: getVisitDate(visit),
        basdai: isAR ? getARPrimaryMetric(visit) : (isSJOGREN ? getVisitMetric(visit, 'esspriResult') : getVisitMetric(visit, 'basdai')),
        asdas: isAR ? getARSecondaryMetric(visit) : (isSJOGREN ? getVisitMetric(visit, 'essdaiResult') : getVisitMetric(visit, 'asdas')),
        evaDolor: getVisitMetric(visit, 'evaDolor'),
        pcr: getVisitMetric(visit, 'pcr'),
        tratamiento: visit.tratamientoActual || visit.Tratamiento_Actual || '---'
    }));

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

    // Actualizar info de paginacin
    if (paginationInfo) {
        paginationInfo.textContent = `Mostrando ${startIndex + 1}-${endIndex} de ${totalItems} visitas`;
    }

    // Renderizar controles de paginacin
    if (paginationControls) {
        let controlsHTML = '';

        // Botón anterior
        controlsHTML += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>`;

        // Pginas
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

    const isAR = isARPathology();
    const headers = ['Fecha', isAR ? 'DAS28' : 'BASDAI', isAR ? 'CDAI' : 'ASDAS', 'EVA Dolor', 'PCR', 'Tratamiento'];
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
    link.download = 'historial_visitas_' + (window.patientSummary.idPaciente || 'paciente') + '.csv';
    link.click();
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function populateChartSelectors() {
    const isAR = isARPathology();
    const isLES = (window.currentPathology || '').toLowerCase() === 'les';
    const isSJOGREN = (window.currentPathology || '').toLowerCase() === 'sjogren';

    let activityMetrics;
    if (isLES) {
        activityMetrics = [
            { value: 'sledai2k', text: 'SLEDAI-2K' },
            { value: 'slicc', text: 'SLICC/ACR SDI' },
            { value: 'prednisona', text: 'Prednisona' },
            { value: 'pcr', text: 'PCR' },
            { value: 'vsg', text: 'VSG' }
        ];
    } else if (isSJOGREN) {
        activityMetrics = [
            { value: 'esspri', text: 'ESSPRI' },
            { value: 'essdai', text: 'ESSDAI' },
            { value: 'pcr', text: 'PCR' },
            { value: 'vsg', text: 'VSG' }
        ];
    } else if (isAR) {
        activityMetrics = [
            { value: 'das28Crp', text: 'DAS28-CRP' },
            { value: 'das28Esr', text: 'DAS28-ESR' },
            { value: 'cdai', text: 'CDAI' },
            { value: 'sdai', text: 'SDAI' },
            { value: 'rapid3', text: 'RAPID3' },
            { value: 'haq', text: 'HAQ' },
            { value: 'pcr', text: 'PCR' },
            { value: 'vsg', text: 'VSG' }
        ];
    } else {
        activityMetrics = [
            { value: 'basdai', text: 'BASDAI' },
            { value: 'asdas', text: 'ASDAS' },
            { value: 'basfi', text: 'BASFI' },
            { value: 'haq', text: 'HAQ' },
            { value: 'lei', text: 'LEI' },
            { value: 'rapid3', text: 'RAPID3' },
            { value: 'pcr', text: 'PCR' },
            { value: 'vsg', text: 'VSG' }
        ];
    }

    let proMetrics;
    if (isSJOGREN) {
        proMetrics = [
            { value: 'evaSequedadOral', text: 'EVA Sequedad Oral' },
            { value: 'evaSequedadOcular', text: 'EVA Sequedad Ocular' },
            { value: 'evaFatiga', text: 'EVA Fatiga' },
            { value: 'evaDolor', text: 'EVA Dolor' },
            { value: 'evaGlobal', text: 'EVA Global' }
        ];
    } else {
        proMetrics = [
            { value: 'evaDolor', text: 'EVA Dolor' },
            { value: 'evaGlobal', text: 'EVA Global' }
        ];
    }

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

    if (selectActivityIndex) {
        selectActivityIndex.value = isLES ? 'sledai2k' : (isSJOGREN ? 'esspri' : (isAR ? 'das28Crp' : 'basdai'));
    }
    if (compareActivityIndexSelect) {
        compareActivityIndexSelect.value = isLES ? 'slicc' : (isSJOGREN ? 'essdai' : (isAR ? 'cdai' : 'asdas'));
    }
    if (selectPRO) selectPRO.value = isSJOGREN ? 'evaSequedadOral' : 'evaDolor';
    if (comparePROSelect) comparePROSelect.value = isSJOGREN ? 'evaFatiga' : 'evaGlobal';
}

/**
 * Filtra las opciones de los selectores de métrica según la patología activa.
 * Oculta métricas irrelevantes y ajusta la selección actual si es necesario.
 * @param {string} pathology - Código de patología normalizado (ar, espa, aps, les, sjogren)
 */
function filterMetricSelectorsByPathology(pathology) {
    const normalized = normalizePathology(pathology);

    const metricsByPathology = {
        ar: ['das28Crp', 'das28Esr', 'cdai', 'sdai', 'rapid3', 'haq', 'pcr', 'vsg'],
        espa: ['basdai', 'asdas', 'basfi', 'haq', 'pcr', 'vsg'],
        aps: ['haq', 'lei', 'rapid3', 'pcr', 'vsg'],
        les: ['sledai2k', 'slicc', 'prednisona', 'pcr', 'vsg'],
        sjogren: ['esspri', 'essdai', 'evaSequedadOral', 'evaSequedadOcular', 'evaFatiga', 'evaDolor']
    };

    const allowed = metricsByPathology[normalized] || [];

    const selectors = ['selectActivityIndex', 'compareActivityIndexSelect', 'selectPRO', 'comparePROSelect'];
    selectors.forEach(function(id) {
        const select = document.getElementById(id);
        if (!select) return;

        Array.from(select.options).forEach(function(option) {
            const value = option.value;
            const isCommonPRO = ['evaDolor', 'evaGlobal'].includes(value);
            const isAllowed = allowed.includes(value) || isCommonPRO;
            option.hidden = !isAllowed;
        });

        if (select.selectedOptions[0] && select.selectedOptions[0].hidden) {
            const firstVisible = Array.from(select.options).find(function(o) { return !o.hidden; });
            if (firstVisible) select.value = firstVisible.value;
        }
    });
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
    if ((map.uveitis || '').toUpperCase() === 'SI') labels.add('Uvetis');
    if ((map.psoriasis || '').toUpperCase() === 'SI') labels.add('Psoriasis');
    if ((map.digestiva || '').toUpperCase() === 'SI') labels.add('EII');

    return Array.from(labels);
}

function populateTreatmentHistory() {
    var container = document.getElementById('treatmentHistory');
    if (!container) return;

    var treatments = window.patientHistory.treatmentHistory || [];
    if (!treatments.length) {
        container.innerHTML = '<p class="empty-message">No hay historial de tratamientos previos.</p>';
        return;
    }

    // Ordenar por fecha descendente
    var sorted = treatments.slice().sort(function(a, b) {
        return new Date(b.startDate || 0) - new Date(a.startDate || 0);
    });

    var html = '<div class="treatment-timeline">';

    sorted.forEach(function(treatment) {
        var dateStr = formatDate(treatment.startDate);
        var name = treatment.name || 'Tratamiento no especificado';
        var type = treatment.type || 'otro';
        var typeLabel = {
            'biologico': 'Biológico',
            'biologic': 'Biológico',
            'fame': 'FAME',
            'sistemico': 'Sistémico',
            'sistemic': 'Sistémico',
            'corticoide': 'Corticoide',
            'otro': 'Otro'
        }[type] || type;

        var dose = treatment.dose || '';
        var reason = treatment.reason || '';
        var status = treatment.status || 'activo';
        var statusClass = status === 'suspendido' || status === 'suspended' ? 'status-suspended' : 'status-active';
        var statusLabel = status === 'suspendido' || status === 'suspended' ? 'Suspendido' : 'Activo';

        html += '<div class="treatment-item ' + statusClass + '" style="padding: 10px 0; border-bottom: 1px solid #eee;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: flex-start;">';
        html += '<div>';
        html += '<div style="font-weight: 600; font-size: 14px; color: #2c3e50;">' + escapeHtml(name) + '</div>';
        html += '<div style="font-size: 12px; color: #7f8c8d; margin-top: 3px;">';
        html += '<span class="treatment-type-badge" style="background: #ecf0f1; padding: 2px 6px; border-radius: 3px; font-size: 11px;">' + typeLabel + '</span>';
        if (dose) html += ' · ' + escapeHtml(dose);
        html += '</div>';
        if (reason) {
            html += '<div style="font-size: 11px; color: #95a5a6; margin-top: 3px; font-style: italic;">' + escapeHtml(reason) + '</div>';
        }
        html += '</div>';
        html += '<div style="text-align: right;">';
        html += '<div style="font-size: 12px; color: #7f8c8d;">' + dateStr + '</div>';
        html += '<div style="font-size: 11px; margin-top: 2px;" class="' + statusClass + '">' + statusLabel + '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
    });

    html += '</div>';
    container.innerHTML = html;
}

function populateKeyEvents() {
    var container = document.getElementById('keyEventsTimeline');
    if (!container) return;

    // Intentar usar el pipeline de eventos del módulo treatmentEventsManager (9B.5)
    if (typeof HubTools !== 'undefined' && HubTools.events &&
        typeof HubTools.events.extractTreatmentEvents === 'function' &&
        typeof HubTools.events.renderTreatmentTimeline === 'function') {

        try {
            var patientId = (window.patientSummary && window.patientSummary.idPaciente)
                || getPatientIdFromURL() || '';
            var prebiologicStatus = null;
            if (typeof HubTools.prebiologic !== 'undefined' &&
                typeof HubTools.prebiologic.getStatus === 'function' && patientId) {
                prebiologicStatus = HubTools.prebiologic.getStatus(patientId);
            }

            var allEvents = HubTools.events.extractTreatmentEvents(window.patientHistory, prebiologicStatus);

            // FILTRAR: solo eventos clínicos no puramente farmacológicos
            var clinicalEvents = allEvents.filter(function(e) {
                if (!e) return false;
                // Excluir eventos de tratamiento puro (ya están en Historial de Tratamientos)
                if (e.type === 'treatment_start' || e.type === 'treatment_change' || e.type === 'treatment_suspend') {
                    // PERO mantener si tiene efecto adverso asociado
                    if (e.metadata && e.metadata.hasAdverseEvent) return true;
                    return false;
                }
                // Excluir biológicos puros (ya están en Historial)
                if (e.type === 'biologic_start' || e.type === 'biologic_change') {
                    return false;
                }
                // Mantener: flare, remission, adverse_event, prebiologic_apto
                return true;
            });

            // Guardar en variable global para que los gráficos puedan acceder sin recalcular
            window.currentEvents = clinicalEvents;

            // Renderizar timeline
            HubTools.events.renderTreatmentTimeline(clinicalEvents, 'keyEventsTimeline');
            return;
        } catch (e) {
            console.warn('[Dashboard] Error en pipeline de eventos terapéuticos:', e);
            // Fallback al comportamiento anterior
        }
    }

    // Fallback: comportamiento original con keyEvents del patientHistory
    var events = window.patientHistory.keyEvents || [];
    if (!events.length) {
        container.innerHTML = '<p class="empty-message">No hay eventos clínicos registrados.</p>';
        return;
    }

    container.innerHTML = events.map(function (event) {
        return '<div class="timeline-item event-type-' + event.type + '">' +
            '<div class="timeline-marker"></div>' +
            '<div class="timeline-date">' + formatDate(event.date) + '</div>' +
            '<div class="timeline-content">' +
            '<div class="timeline-title">' + capitalizeFirst(event.type) + '</div>' +
            '<div class="timeline-description">' + event.description + '</div>' +
            '</div></div>';
    }).join('');
}

// ============================================
// EVENTOS TERAPÉUTICOS — Anotaciones en gráficos (9B.6)
// ============================================

/**
 * Obtiene anotaciones de eventos terapéuticos para los gráficos Chart.js.
 * Usa window.currentEvents si ya fue poblado por populateKeyEvents.
 * @param {string[]} chartLabels - Labels del eje X del gráfico
 * @returns {Object} Objeto de anotaciones para merge en plugin annotation
 */
function getEventAnnotations(chartLabels) {
    if (typeof HubTools === 'undefined' || !HubTools.events ||
        typeof HubTools.events.buildChartAnnotationsFromEvents !== 'function') {
        return {};
    }

    // Usar eventos cacheados si están disponibles
    var events = window.currentEvents;
    if (!events || !events.length) {
        // Computar eventos si no están cacheados
        try {
            var patientId = (window.patientSummary && window.patientSummary.idPaciente)
                || getPatientIdFromURL() || '';
            var prebiologicStatus = null;
            if (typeof HubTools.prebiologic !== 'undefined' &&
                typeof HubTools.prebiologic.getStatus === 'function' && patientId) {
                prebiologicStatus = HubTools.prebiologic.getStatus(patientId);
            }
            if (typeof HubTools.events.extractTreatmentEvents === 'function') {
                events = HubTools.events.extractTreatmentEvents(window.patientHistory, prebiologicStatus);
                window.currentEvents = events;
            }
        } catch (e) {
            console.warn('[Dashboard] Error generando anotaciones de eventos:', e);
            return {};
        }
    }

    return HubTools.events.buildChartAnnotationsFromEvents(events || [], chartLabels);
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
    const secondaryMetric = compareCheckbox.checked ? compareSelector.value : null;

    const chartData = prepareChartData(primaryMetric, secondaryMetric);

    if (chartData.datasets[0].data.length < 2) {
        emptyChartMessage.classList.remove('hidden');
        canvas.classList.add('hidden');
        if (window.activityChartInstance) window.activityChartInstance.destroy();
        return;
    }

    emptyChartMessage.classList.add('hidden');
    canvas.classList.remove('hidden');

    const ctx = canvas.getContext('2d');
    if (window.activityChartInstance) {
        window.activityChartInstance.destroy();
    }

    const treatmentAnnotations = (typeof HubTools !== 'undefined' && HubTools.events && HubTools.events.buildTreatmentDrugAnnotations)
        ? HubTools.events.buildTreatmentDrugAnnotations(window.patientHistory.treatmentHistory || [], chartData.labels, { maxVisible: 8 })
        : {};
    const eventAnnotations = getEventAnnotations(chartData.labels);
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
                        ...cutoffAnnotations,
                        ...treatmentAnnotations,
                        ...eventAnnotations
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
                ...(secondaryMetric ? { y1: {
                    position: 'right',
                    beginAtZero: true,
                    title: { display: true, text: secondaryMetric.toUpperCase() },
                    grid: { display: false }
                } } : {})
            },
            animation: {
                duration: 750,
                easing: 'easeOutQuart'
            }
        }
    });

    selector.addEventListener('change', updateActivityChart);
    compareCheckbox.addEventListener('change', () => {
        compareSelector.classList.toggle('hidden', !compareCheckbox.checked);
        updateActivityChart();
    });
    compareSelector.addEventListener('change', updateActivityChart);
}

function updateActivityChart() {
    const selector = document.getElementById('selectActivityIndex');
    const compareCheckbox = document.getElementById('compareActivityCheckbox');
    const compareSelector = document.getElementById('compareActivityIndexSelect');

    const primaryMetric = selector.value || 'basdai';
    const secondaryMetric = compareCheckbox.checked ? compareSelector.value : null;

    const chartData = prepareChartData(primaryMetric, secondaryMetric);

    if (chartData.datasets[0].data.length < 2) {
        document.getElementById('emptyActivityChart').classList.remove('hidden');
        document.getElementById('activityChart').classList.add('hidden');
        if (window.activityChartInstance) window.activityChartInstance.destroy();
        return;
    }

    document.getElementById('emptyActivityChart').classList.add('hidden');
    document.getElementById('activityChart').classList.remove('hidden');

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
        const treatmentAnnotations = (typeof HubTools !== 'undefined' && HubTools.events && HubTools.events.buildTreatmentDrugAnnotations)
            ? HubTools.events.buildTreatmentDrugAnnotations(window.patientHistory.treatmentHistory || [], chartData.labels, { maxVisible: 8 })
            : {};
        const eventAnnotations = getEventAnnotations(chartData.labels);
        const cutoffAnnotations = getCutoffAnnotations(primaryMetric, secondaryMetric, window.currentPathology);
        window.activityChartInstance.options.plugins.annotation.annotations = { ...cutoffAnnotations, ...treatmentAnnotations, ...eventAnnotations };
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
    const secondaryMetric = compareCheckbox.checked ? compareSelector.value : null;

    const chartData = prepareChartData(primaryMetric, secondaryMetric);

    if (chartData.datasets[0].data.length < 2) {
        emptyChartMessage.classList.remove('hidden');
        canvas.classList.add('hidden');
        if (window.proChartInstance) window.proChartInstance.destroy();
        return;
    }

    emptyChartMessage.classList.add('hidden');
    canvas.classList.remove('hidden');

    const ctx = canvas.getContext('2d');
    if (window.proChartInstance) {
        window.proChartInstance.destroy();
    }

    const treatmentAnnotations = (typeof HubTools !== 'undefined' && HubTools.events && HubTools.events.buildTreatmentDrugAnnotations)
        ? HubTools.events.buildTreatmentDrugAnnotations(window.patientHistory.treatmentHistory || [], chartData.labels, { maxVisible: 6 })
        : {};
    const eventAnnotations = getEventAnnotations(chartData.labels);

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
                    annotations: {
                        ...treatmentAnnotations,
                        ...eventAnnotations
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
                    max: 10,
                    title: { display: true, text: primaryMetric === 'evaDolor' ? 'EVA Dolor' : 'EVA Global' },
                    grid: { color: '#E2E8F0' }
                },
                ...(secondaryMetric ? { y1: {
                    position: 'right',
                    beginAtZero: true,
                    max: 10,
                    title: { display: true, text: secondaryMetric === 'evaDolor' ? 'EVA Dolor' : 'EVA Global' },
                    grid: { display: false }
                } } : {})
            },
            animation: {
                duration: 750,
                easing: 'easeOutQuart'
            }
        }
    });

    selector.addEventListener('change', updatePROChart);
    compareCheckbox.addEventListener('change', () => {
        compareSelector.classList.toggle('hidden', !compareCheckbox.checked);
        updatePROChart();
    });
    compareSelector.addEventListener('change', updatePROChart);
}

function updatePROChart() {
    const canvas = document.getElementById('proChart');
    const selector = document.getElementById('selectPRO');
    const compareCheckbox = document.getElementById('comparePROCheckbox');
    const compareSelector = document.getElementById('comparePROSelect');
    const emptyChartMessage = document.getElementById('emptyPROChart');

    const primaryMetric = selector.value || 'evaDolor';
    const secondaryMetric = compareCheckbox.checked ? compareSelector.value : null;

    const chartData = prepareChartData(primaryMetric, secondaryMetric);

    if (chartData.datasets[0].data.length < 2) {
        emptyChartMessage.classList.remove('hidden');
        canvas.classList.add('hidden');
        if (window.proChartInstance) window.proChartInstance.destroy();
        return;
    }

    emptyChartMessage.classList.add('hidden');
    canvas.classList.remove('hidden');

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
        const treatmentAnnotations = (typeof HubTools !== 'undefined' && HubTools.events && HubTools.events.buildTreatmentDrugAnnotations)
            ? HubTools.events.buildTreatmentDrugAnnotations(window.patientHistory.treatmentHistory || [], chartData.labels, { maxVisible: 6 })
            : {};
        const eventAnnotations = getEventAnnotations(chartData.labels);
        window.proChartInstance.options.plugins.annotation.annotations = { ...treatmentAnnotations, ...eventAnnotations };
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
        'rapid3': ['rapid3Result', 'RAPID3', 'RAPID3_Score', 'rapid3Total', 'rapid3'],
        'das28Crp': ['das28CrpResult', 'DAS28_CRP_Result', 'DAS28_CRP', 'das28Crp', 'DAS28-CRP'],
        'das28Esr': ['das28EsrResult', 'DAS28_ESR_Result', 'DAS28_ESR', 'das28Esr', 'DAS28-ESR'],
        'cdai': ['cdaiResult', 'CDAI_Result', 'CDAI', 'cdai'],
        'sdai': ['sdaiResult', 'SDAI_Result', 'SDAI', 'sdai'],
        'pcr': ['pcrResult', 'PCR', 'pcr'],
        'vsg': ['vsgResult', 'VSG', 'vsg'],
        'evaDolor': ['evaDolor', 'EVA_Dolor', 'eva_dolor'],
        'evaGlobal': ['evaGlobal', 'EVA_Global', 'eva_global'],
        'sledai2k': ['sledai2kResult', 'SLEDAI_2K_Result', 'sledai2k', 'SLEDAI_Result', 'sledai'],
        'esspri': ['esspriResult', 'ESSPRI_Result', 'esspri', 'ESSPRI'],
        'essdai': ['essdaiResult', 'ESSDAI_Result', 'essdai', 'ESSDAI'],
        'slicc': ['sliccAcrSdi', 'SLICC_ACR_SDI', 'slicc', 'SLICC', 'SLICC_SDI'],
        'prednisona': ['dosisPrednisona', 'Dosis_Prednisona_Mg_Dia', 'prednisona', 'Prednisona'],
        'evaSequedadOral': ['evaSequedadOral', 'EVA_Sequedad_Oral', 'eva_sequedad_oral'],
        'evaSequedadOcular': ['evaSequedadOcular', 'EVA_Sequedad_Ocular', 'eva_sequedad_ocular'],
        'evaFatiga': ['evaFatiga', 'EVA_Fatiga', 'eva_fatiga']
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
    const visits = Array.isArray(window.patientHistory.allVisits) ? [...window.patientHistory.allVisits] : [];
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
            // Si la fecha es vlida, usar formato ISO; si no, usar la fecha original
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
        das28Crp: 'DAS28-CRP',
        das28Esr: 'DAS28-ESR',
        cdai: 'CDAI',
        sdai: 'SDAI',
        pcr: 'PCR',
        vsg: 'VSG',
        evaDolor: 'EVA Dolor',
        evaGlobal: 'EVA Global',
        sledai2k: 'SLEDAI-2K',
        esspri: 'ESSPRI',
        essdai: 'ESSDAI',
        slicc: 'SLICC/ACR SDI',
        prednisona: 'Prednisona (mg/día)',
        evaSequedadOral: 'EVA Sequedad Oral',
        evaSequedadOcular: 'EVA Sequedad Ocular',
        evaFatiga: 'EVA Fatiga'
    };
    return labels[metric] || metric.toUpperCase();
}

function getCutoffAnnotations(primaryMetric, secondaryMetric, pathology) {
    const annotations = {};
    const cutoffs = HubTools.dashboard.activityCutoffs || {};

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
                    display: true,
                    position: 'start',
                    color: color,
                    font: { size: 10 }
                },
                scaleID: axisID
            };
        }
    };

    const processMetricCutoffs = (metricKey, scaleID) => {
        const cutoffKeyMap = { das28Crp: 'das28', das28Esr: 'das28', cdai: 'cdai', sdai: 'sdai', rapid3: 'rapid3', basdai: 'basdai', asdas: 'asdas', haq: 'haq', sledai2k: 'sledai2k', esspri: 'esspri', essdai: 'essdai' };
        const metricCutoffs = cutoffs[cutoffKeyMap[metricKey] || metricKey];
        if (metricCutoffs) {
            if (metricCutoffs.remission !== undefined) addCutoffLine(metricKey, scaleID, COLORS.remission, metricCutoffs.remission, 'Remisi\u00f3n');
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
                    display: true,
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

    emptyState.classList.remove('hidden');
    dashboardContent.classList.add('hidden');

    const titleEl = document.getElementById('emptyStateTitle');
    const messageEl = document.getElementById('emptyStateSubtitle');
    if (titleEl) titleEl.textContent = 'Sin datos disponibles';
    if (messageEl) messageEl.textContent = message;
}

function getPathologyLabel(code) {
    if (!code) return 'Sin diagnóstico';
    const map = { 
        espa: 'Espondiloartritis Axial', 
        aps: 'Artritis Psoriásica', 
        ar: 'Artritis Reumatoide',
        les: 'Lupus eritematoso sistémico',
        sjogren: 'Síndrome de Sjögren' 
    };
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

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function calculateAge(birthDate) {
    const date = new Date(birthDate);
    if (Number.isNaN(date.getTime())) return '';
    const diff = Date.now() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function calculateDiseaseYears(firstVisitDate) {
    if (!firstVisitDate) return '';
    const start = new Date(firstVisitDate);
    if (Number.isNaN(start.getTime())) return '';
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

function renderPrebiologicBadge(cip, latestVisit) {
    var container = document.getElementById('prebiologicBadgeContainer');
    if (!container) return;

    if (!cip) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    var badgeHTML = '';
    if (
        typeof HubTools !== 'undefined' &&
        HubTools.prebiologic &&
        typeof HubTools.prebiologic.getBadgeHTML === 'function'
    ) {
        badgeHTML = HubTools.prebiologic.getBadgeHTML(cip, latestVisit || {});
    }

    if (badgeHTML) {
        container.innerHTML = badgeHTML;
        container.style.display = '';
    } else {
        container.style.display = 'none';
        container.innerHTML = '';
    }
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
window.escapeHtml = escapeHtml;
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
window.getEventAnnotations = getEventAnnotations;
window.getVisitMetric = getVisitMetric;
window.exportVisitsToCSV = exportVisitsToCSV;

/**
 * Placeholder para resaltar un evento en el gráfico al hacer click en el timeline.
 * Implementación futura: desplazar chart, aplicar highlight visual al punto correspondiente.
 * @param {string} eventId - ID del evento a resaltar
 */
window.highlightChartEvent = function (eventId) {
    console.log('[Dashboard] highlightChartEvent llamado con:', eventId);
    // TODO: Implementar resaltado visual en el gráfico (9B.6 - futuro)
};
















