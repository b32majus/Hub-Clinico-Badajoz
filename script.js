'use strict';

let quickViewMount = null;

const PATHOLOGY_LABELS = {
    espa: 'Espondiloartritis axial',
    aps: 'Artritis psoriásica',
    ar: 'Artritis Reumatoide'
};

function labelForPathology(code) {
    const normalized = (code || '').toString().toLowerCase();
    return PATHOLOGY_LABELS[normalized] || (normalized ? normalized.toUpperCase() : 'Sin diagnóstico');
}

function coalesce(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
    }
    return null;
}

function formatDisplayValue(value) {
    if (value === undefined || value === null || value === '') {
        return '—';
    }
    return value;
}

function formatDisplayDate(value) {
    if (!value) return '';
    if (typeof HubTools?.utils?.formatearFecha === 'function') {
        try {
            const formatted = HubTools.utils.formatearFecha(value);
            if (formatted) return formatted;
        } catch (error) {
            console.warn('formatearFecha (HubTools) falló, se usará valor original.', error);
        }
    }
    return value;
}

function normalizeRecord(record, extra) {
    if (typeof HubTools?.normalizer?.normalizeRecord === 'function') {
        return HubTools.normalizer.normalizeRecord(record, extra);
    }
    return { ...(record || {}), ...(extra || {}) };
}

function getPendingRowsSafe() {
    if (typeof HubTools?.export?.getPendingRows === 'function') {
        return HubTools.export.getPendingRows();
    }
    return [];
}

function createPendingRowsIndicator() {
    const existing = document.getElementById('pendingRowsIndicator');
    if (existing) return existing;
    const indicator = document.createElement('aside');
    indicator.id = 'pendingRowsIndicator';
    indicator.className = 'pending-rows-indicator hidden';
    indicator.innerHTML = '<div class="pending-rows-indicator__summary"><div><div class="pending-rows-indicator__label">Filas pendientes</div><div class="pending-rows-indicator__count" id="pendingRowsCount">0</div></div><div class="pending-rows-indicator__hint" id="pendingRowsHint">Sin pendientes</div></div><div class="pending-rows-indicator__actions"><button type="button" id="pendingRowsCopyBtn" class="pending-rows-btn">Recuperar última</button><button type="button" id="pendingRowsResolveBtn" class="pending-rows-btn pending-rows-btn--secondary">Marcar resuelta</button></div>';
    document.body.appendChild(indicator);
    indicator.querySelector('#pendingRowsCopyBtn')?.addEventListener('click', () => HubTools?.export?.retryPendingRowCopy?.());
    indicator.querySelector('#pendingRowsResolveBtn')?.addEventListener('click', () => HubTools?.export?.resolvePendingRow?.());
    return indicator;
}

function updatePendingRowsIndicator() {
    const indicator = createPendingRowsIndicator();
    const rows = getPendingRowsSafe();
    const countEl = indicator.querySelector('#pendingRowsCount');
    const hintEl = indicator.querySelector('#pendingRowsHint');
    if (countEl) countEl.textContent = String(rows.length);
    if (hintEl) hintEl.textContent = rows.length ? ('Última: ' + rows[0].sheet + ' · ' + ((rows[0].pathology || '').toUpperCase())) : 'Sin pendientes';
    indicator.classList.toggle('hidden', rows.length === 0);
}


function renderQuickViewMetric(label, value) {
    return '<div class="quick-view-metric-card"><div class="quick-view-metric-card__label">' + label + '</div><div class="quick-view-metric-card__value">' + value + '</div></div>';
}

function renderQuickViewEmptyState(id) {
    return '<div class="quick-view-empty-card"><i class="fas fa-search quick-view-empty-card__icon" aria-hidden="true"></i><p class="quick-view-empty-card__text">No se encontraron resultados para el ID proporcionado (' + id + ').</p><p class="quick-view-empty-card__subtext">¿Desea crear una nueva historia clínica para este paciente?</p><a href="primera_visita.html?id=' + id + '" class="action-btn primary-btn quick-view-link-btn"><i class="fas fa-plus-circle quick-view-inline-icon" aria-hidden="true"></i>Crear Nueva Historia Clínica</a></div>';
}

function renderQuickViewNewPatient(id) {
    return '<div class="quick-view-empty-card"><div class="quick-view-empty-card__hero"><i class="fas fa-user-plus quick-view-empty-card__icon quick-view-empty-card__icon--primary" aria-hidden="true"></i><h3 class="quick-view-empty-card__title">Nuevo Paciente</h3><p class="quick-view-empty-card__text quick-view-empty-card__text--tight">Se procederá a crear una nueva historia clínica</p></div><div class="quick-view-patient-chip"><div class="quick-view-patient-chip__row"><i class="fas fa-id-card quick-view-patient-chip__icon" aria-hidden="true"></i><div class="quick-view-patient-chip__content"><div class="quick-view-patient-chip__label">ID del Paciente</div><div class="quick-view-patient-chip__value">' + id + '</div></div></div></div><div class="quick-view-empty-card__actions"><a href="primera_visita.html?id=' + id + '" class="action-btn primary-btn quick-view-link-btn quick-view-link-btn--spaced"><i class="fas fa-plus-circle quick-view-inline-icon" aria-hidden="true"></i>Crear Primera Visita</a><button type="button" class="quick-view-secondary-btn" id="quickViewCancelNewPatient"><i class="fas fa-times-circle quick-view-inline-icon" aria-hidden="true"></i>Cancelar</button></div></div>';
}

function createQuickViewOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'quickViewOverlay';
    overlay.className = 'quick-view-overlay hidden';
    overlay.innerHTML = `
        <div class="quick-view-backdrop" data-quick-view-close></div>
        <section id="searchResults" class="search-results quick-view-panel hidden" aria-live="polite">
            <header class="results-header">
                <div>
                    <h2 id="searchResultsTitle" class="results-title">Resultados de B\u00fasqueda</h2>
                    <p id="searchResultsSubtitle" class="results-subtitle"></p>
                </div>
                <button type="button" class="quick-view-close-btn" id="closeQuickView" data-quick-view-close aria-label="Cerrar vista r\u00e1pida">
                    <i class="fas fa-times"></i>
                </button>
            </header>
            <div id="resultsContent" class="results-content"></div>
        </section>
    `;
    document.body.appendChild(overlay);

    const searchResults = overlay.querySelector('#searchResults');
    const resultsContent = overlay.querySelector('#resultsContent');
    const searchResultsTitle = overlay.querySelector('#searchResultsTitle');
    const searchResultsSubtitle = overlay.querySelector('#searchResultsSubtitle');

    const closeQuickView = () => {
        searchResults.classList.add('hidden');
        overlay.classList.add('hidden');
        document.body.classList.remove('quick-view-open');
    };

    overlay.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-quick-view-close]');
        if (trigger && !overlay.classList.contains('hidden')) {
            closeQuickView();
        }
    });

    if (!window.__hubQuickViewEscBound) {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !overlay.classList.contains('hidden')) {
                closeQuickView();
            }
        });
        window.__hubQuickViewEscBound = true;
    }

    quickViewMount = {
        resultsContent,
        searchResults,
        searchResultsTitle,
        searchResultsSubtitle,
        overlay,
        close: closeQuickView
    };

    return quickViewMount;
}

function ensureQuickViewElements() {
    const resultsContent = document.getElementById('resultsContent');
    const searchResults = document.getElementById('searchResults');
    const searchResultsTitle = document.getElementById('searchResultsTitle');
    const searchResultsSubtitle = document.getElementById('searchResultsSubtitle');

    if (!quickViewMount && resultsContent && searchResults && searchResultsTitle && searchResultsSubtitle) {
        return {
            resultsContent,
            searchResults,
            searchResultsTitle,
            searchResultsSubtitle,
            overlay: document.getElementById('quickViewOverlay'),
            close: () => { }
        };
    }

    if (quickViewMount) {
        return quickViewMount;
    }

    return createQuickViewOverlay();
}

function getMockPatientBundle(id) {
    if (typeof window.MockPatients?.getById !== 'function') {
        return null;
    }
    const mock = window.MockPatients.getById(id);
    if (!mock) {
        return null;
    }

    const visits = Array.isArray(mock.visits) ? [...mock.visits] : [];
    visits.sort((a, b) => new Date(b.fechaVisita) - new Date(a.fechaVisita));
    const latestVisit = visits[0] || {};
    const firstVisit = visits[visits.length - 1] || null;
    const pathologyCode = (mock.pathology || mock.summary.pathology || mock.summary.diagnosticoPrimario || '').toLowerCase();

    const treatmentHistory = Array.isArray(mock.treatmentHistory) ? mock.treatmentHistory.slice() : [];
    const activeTreatment = treatmentHistory.length ? treatmentHistory[treatmentHistory.length - 1] : null;

    const summary = {
        idPaciente: mock.summary.idPaciente,
        id: mock.summary.idPaciente,
        nombre: mock.summary.nombre,
        diagnostico: labelForPathology(pathologyCode),
        diagnosticoPrimario: pathologyCode,
        tratamientoActual: coalesce(mock.summary.tratamientoActual, latestVisit.biologicoSelect, activeTreatment?.name),
        fechaInicioTratamiento: activeTreatment?.startDate || '',
        ultimaVisita: latestVisit.fechaVisita || mock.summary.ultimaVisita || '',
        evaGlobal: coalesce(latestVisit.evaGlobal, latestVisit.EVA_Global),
        evaDolor: coalesce(latestVisit.evaDolor, latestVisit.EVA_Dolor),
        basdai: coalesce(latestVisit.basdaiResult, latestVisit.basdai),
        asdasCrp: coalesce(latestVisit.asdasCrpResult, latestVisit.asdasCrp)
    };

    return {
        patient: summary,
        history: {
            allVisits: visits,
            latestVisit,
            firstVisit,
            pathology: pathologyCode,
            treatmentHistory,
            keyEvents: Array.isArray(mock.keyEvents) ? mock.keyEvents.slice() : []
        }
    };
}

function mapRecordToPatientSummary(record, history) {
    if (!record) return null;
    const normalizedRecord = normalizeRecord(record);
    const id = normalizedRecord.idPaciente;
    const nombre = normalizedRecord.nombrePaciente || 'Paciente sin nombre';
    const historyData = history && Array.isArray(history.allVisits) && history.allVisits.length > 0 ? history : null;
    const latestVisit = historyData ? normalizeRecord(historyData.latestVisit) : null;
    const treatmentHistory = historyData?.treatmentHistory || [];
    const activeTreatment = treatmentHistory.length ? treatmentHistory[treatmentHistory.length - 1] : null;
    const pathologyCode = (normalizedRecord.pathology || normalizedRecord.diagnosticoPrimario || historyData?.pathology || '').toLowerCase();

    return {
        idPaciente: id,
        id,
        nombre,
        diagnostico: record.Diagnostico_Principal || record.diagnostico || labelForPathology(pathologyCode),
        diagnosticoPrimario: pathologyCode || normalizedRecord.diagnosticoPrimario,
        tratamientoActual: coalesce(normalizedRecord.tratamientoActual, activeTreatment?.name),
        fechaInicioTratamiento: coalesce(normalizedRecord.fechaInicioTratamiento, activeTreatment?.startDate),
        ultimaVisita: coalesce(normalizedRecord.fechaVisita, latestVisit?.fechaVisita),
        evaGlobal: coalesce(normalizedRecord.evaGlobal, latestVisit?.evaGlobal),
        evaDolor: coalesce(normalizedRecord.evaDolor, latestVisit?.evaDolor),
        basdai: coalesce(normalizedRecord.basdaiResult, latestVisit?.basdaiResult),
        asdasCrp: coalesce(normalizedRecord.asdasCrpResult, latestVisit?.asdasCrpResult),
        das28Crp: coalesce(normalizedRecord.das28CrpResult, latestVisit?.das28CrpResult),
        das28Esr: coalesce(normalizedRecord.das28EsrResult, latestVisit?.das28EsrResult),
        cdai: coalesce(normalizedRecord.cdaiResult, latestVisit?.cdaiResult),
        sdai: coalesce(normalizedRecord.sdaiResult, latestVisit?.sdaiResult),
        haq: coalesce(normalizedRecord.haqResult, latestVisit?.haqResult),
        rapid3: coalesce(normalizedRecord.rapid3Result, latestVisit?.rapid3Result)
    };
}

function navigateToDashboard(patientId, pathology) {
    if (!patientId) return;
    const params = new URLSearchParams({ id: patientId });
    if (pathology) {
        params.set('patologia', pathology);
    }

    if (quickViewMount) {
        try {
            quickViewMount.searchResults?.classList.add('hidden');
            quickViewMount.overlay?.classList.add('hidden');
            document.body.classList.remove('quick-view-open');
        } catch (error) {
            console.warn('navigateToDashboard: error cerrando quick view', error);
        }
    }

    window.location.href = `dashboard_paciente.html?${params.toString()}`;
}

function showPatientResults(id) {
    const quickView = ensureQuickViewElements();
    if (!quickView) {
        console.warn('showPatientResults: elementos de resultados no disponibles');
        return;
    }

    const { resultsContent, searchResults, searchResultsTitle, searchResultsSubtitle, overlay } = quickView;
    const dashboardContent = document.getElementById('dashboardContent');

    const revealQuickView = () => {
        if (dashboardContent) {
            dashboardContent.classList.add('hidden');
        }
        if (overlay) {
            overlay.classList.remove('hidden');
            document.body.classList.add('quick-view-open');
        }
        searchResults.classList.remove('hidden');
    };

    const renderQuickViewLayout = ({ patientName, id, pathologyLabel, lastVisit, treatment, treatmentStart, pathologyCode, evaGlobal, basdai, das28Crp, scoresHTML }) => {
        return `
            <div class="quick-view-stack">
                <div class="patient-summary-card quick-view-summary-card">
                    <div class="quick-view-summary-card__body">
                        <div class="quick-view-eyebrow">Paciente</div>
                        <div class="quick-view-patient-name">${patientName}</div>
                        <div class="quick-view-meta">
                            <span><strong>ID:</strong> ${id}</span>
                            <span><strong>Diagnóstico:</strong> ${pathologyLabel}</span>
                            <span><strong>Última visita:</strong> ${lastVisit}</span>
                        </div>
                    </div>
                    <button id="btnVerDashboardCompleto" class="action-btn purple-btn quick-view-dashboard-btn">
                        <i class="fas fa-chart-line" aria-hidden="true"></i>
                        Ver Dashboard Completo
                    </button>
                </div>

                <div class="quick-view-two-col">
                    <div class="patient-info-card quick-view-panel-card">
                        <h3 class="quick-view-panel-card__title">Resumen Clínico</h3>
                        <div class="quick-view-clinical-list">
                            <div><strong>Tratamiento activo:</strong> ${treatment}</div>
                            <div><strong>Inicio tratamiento:</strong> ${treatmentStart}</div>
                            <div><strong>Evaluación global:</strong> ${formatDisplayValue(evaGlobal)}</div>
                            <div><strong>${pathologyCode === 'ar' ? 'DAS28-CRP' : 'BASDAI'}:</strong> ${formatDisplayValue(pathologyCode === 'ar' ? das28Crp : basdai)}</div>
                        </div>
                    </div>

                    <div class="patient-scores-card quick-view-panel-card">
                        <h3 class="quick-view-panel-card__title">Índices Clínicos</h3>
                        <div class="quick-view-metrics-grid">
                            ${scoresHTML || '<p class="quick-view-empty-metrics">Sin datos registrados.</p>'}
                        </div>
                    </div>
                </div>

                <div class="quick-view-two-col">
                    <div class="patient-actions-card quick-view-panel-card">
                        <h3 class="quick-view-panel-card__title">Acciones rápidas</h3>
                        <div class="quick-view-actions">
                            <a href="seguimiento.html?id=${id}&patologia=${pathologyCode}" class="action-btn green-btn quick-view-action-link">
                                <i class="fas fa-clipboard-list" aria-hidden="true"></i> Registrar Seguimiento
                            </a>
                            <a href="primera_visita.html?id=${id}" class="action-btn turquoise-btn quick-view-action-link">
                                <i class="fas fa-file-alt" aria-hidden="true"></i> Revisar Primera Visita
                            </a>
                        </div>
                    </div>
                    <div class="patient-treatment-card quick-view-panel-card">
                        <h3 class="quick-view-panel-card__title">Notas adicionales</h3>
                        <p class="quick-view-note">Consulta el dashboard completo para revisar eventos clínicos, evolución de índices y periodos terapéuticos.</p>
                    </div>
                </div>
            </div>
        `;
    };

    let patient = null;
    let historyData = null;
    let hasHistory = false;
    let isNewPatient = false;

    if (typeof HubTools?.data?.findPatientById === 'function') {
        const record = HubTools.data.findPatientById(id);
        if (record) {
            if (typeof HubTools.data.getPatientHistory === 'function') {
                const history = HubTools.data.getPatientHistory(id);
                if (history && Array.isArray(history.allVisits) && history.allVisits.length > 0) {
                    historyData = history;
                    hasHistory = true;
                } else if (history && Array.isArray(history)) {
                    historyData = {
                        allVisits: history,
                        latestVisit: history[0],
                        firstVisit: history[history.length - 1],
                        pathology: record.pathology || record.diagnosticoPrimario || ''
                    };
                    hasHistory = history.length > 0;
                } else {
                    historyData = history;
                    hasHistory = false;
                }
            }
            patient = mapRecordToPatientSummary(record, historyData);
            isNewPatient = !hasHistory;
        }
    }

    if (!patient) {
        const mockBundle = getMockPatientBundle(id);
        if (mockBundle) {
            patient = mockBundle.patient;
            historyData = mockBundle.history;
            hasHistory = historyData.allVisits.length > 0;
            isNewPatient = !hasHistory;
        }
    }

    if (!patient) {
        if (searchResultsTitle) searchResultsTitle.textContent = 'Paciente No Encontrado';
        if (searchResultsSubtitle) searchResultsSubtitle.textContent = '';
        resultsContent.innerHTML = renderQuickViewEmptyState(id);
        revealQuickView();
        return;
    }

    const patientName = patient.nombre || 'Paciente sin nombre';
    const pathologyCode = patient.diagnosticoPrimario || historyData?.pathology || '';
    const pathologyLabel = labelForPathology(pathologyCode);
    const lastVisit = formatDisplayDate(patient.ultimaVisita) || 'Sin registros';
    const treatment = formatDisplayValue(patient.tratamientoActual || historyData?.treatmentHistory?.slice(-1)[0]?.name);
    const treatmentStart = formatDisplayDate(patient.fechaInicioTratamiento || historyData?.treatmentHistory?.slice(-1)[0]?.startDate) || 'Sin registrar';

    if (isNewPatient) {
        if (searchResultsTitle) searchResultsTitle.textContent = 'Paciente Nuevo - Iniciar Primera Visita';
        if (searchResultsSubtitle) searchResultsSubtitle.textContent = `Paciente con ID ${id} no tiene visitas registradas. Cree una nueva historia clínica.`;

        resultsContent.innerHTML = renderQuickViewNewPatient(id);
        document.getElementById('quickViewCancelNewPatient')?.addEventListener('click', () => {
            const sidebarSearch = document.getElementById('patientSearch');
            const centralSearch = document.getElementById('patientId');
            if (sidebarSearch) sidebarSearch.value = '';
            if (centralSearch) centralSearch.value = '';
        });
    } else {
        if (searchResultsTitle) searchResultsTitle.textContent = 'Paciente Encontrado - Opciones Disponibles';
        if (searchResultsSubtitle) searchResultsSubtitle.textContent = `Mostrando datos de ${patientName} (ID: ${id})`;

        let scoresHTML = '';
        const addMetric = (label, value) => {
            scoresHTML += renderQuickViewMetric(label, value);
        };

        const evaGlobal = patient.evaGlobal;
        const evaDolor = patient.evaDolor;
        const basdai = patient.basdai;
        const asdasCrp = patient.asdasCrp;
        const das28Crp = patient.das28Crp;
        const das28Esr = patient.das28Esr;
        const cdai = patient.cdai;
        const sdai = patient.sdai;
        const haq = patient.haq;
        const rapid3 = patient.rapid3;

        [
            ['EVA GLOBAL', evaGlobal],
            ['EVA DOLOR', evaDolor],
            ['BASDAI', basdai],
            ['ASDAS-CRP', asdasCrp],
            ['DAS28-CRP', das28Crp],
            ['DAS28-ESR', das28Esr],
            ['CDAI', cdai],
            ['SDAI', sdai],
            ['HAQ-DI', haq],
            ['RAPID3', rapid3]
        ].forEach(([label, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                addMetric(label, value);
            }
        });

        resultsContent.innerHTML = renderQuickViewLayout({
            patientName,
            id,
            pathologyLabel,
            lastVisit,
            treatment,
            treatmentStart,
            pathologyCode,
            evaGlobal,
            basdai,
            das28Crp,
            scoresHTML
        });

        const dashboardBtn = document.getElementById('btnVerDashboardCompleto');
        if (dashboardBtn) {
            dashboardBtn.addEventListener('click', () => navigateToDashboard(id, pathologyCode));
        }
    }

    revealQuickView();
}

// --- Navigation & Dirty Form Check ---
window.isFormDirty = window.isFormDirty || false;
window.markFormDirty = window.markFormDirty || function () { window.isFormDirty = true; };
window.resetFormDirty = window.resetFormDirty || function () { window.isFormDirty = false; };

function attemptNavigation(targetUrl) {
    if (!targetUrl) return;
    const proceed = !window.isFormDirty || window.confirm('¿Desea salir sin guardar los cambios?');
    if (proceed) {
        window.location.href = targetUrl;
    }
}

window.addEventListener('beforeunload', event => {
    if (window.isFormDirty) {
        event.preventDefault();
        event.returnValue = '';
    }
});

// --- Initialization on DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando Hub Clínico...');


    // --- DOM Elements ---
    const csvBtn = document.getElementById('csvBtn');
    const csvFileInput = document.getElementById('csvFileInput');
    const csvMessage = document.getElementById('csvMessage');
    const csvError = document.getElementById('csvError');
    const professionalSelect = document.getElementById('professionalSelect');
    const currentProfessionalLabel = document.getElementById('currentProfessional');
    const professionalInput = document.getElementById('professional');
    const changeProfessionalBtn = document.getElementById('changeProfessionalBtn');
    const professionalSelector = document.getElementById('professionalSelector');
    const confirmProfessionalBtn = document.getElementById('confirmProfessionalBtn');
    const cancelProfessionalBtn = document.getElementById('cancelProfessionalBtn');
    const patientSearchInput = document.getElementById('patientSearch');
    const patientIdInput = document.getElementById('patientId');

    // --- UI Feedback ---
    function clearMessages() {
        csvMessage?.classList.add('hidden');
        if (csvMessage) csvMessage.textContent = '';
        csvError?.classList.add('hidden');
        if (csvError) csvError.textContent = '';
    }

    function showCsvError(message) {
        if (!csvError) return;
        csvError.textContent = message;
        csvError.classList.remove('hidden');
        csvMessage?.classList.add('hidden');
    }

    function showCsvSuccess(patientCount, professionalCount) {
        if (!csvMessage) return;
        const timestamp = new Date();
        const formatted = timestamp.toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        csvMessage.innerHTML = `
            <i class="fas fa-check-circle" aria-hidden="true"></i>
            <span>Base de datos cargada (${professionalCount} profesionales)</span>
            <time datetime="${timestamp.toISOString()}">Última carga: ${formatted}</time>
        `;
        csvMessage.classList.remove('hidden');
        csvError?.classList.add('hidden');
    }

    // --- Database Loading ---
    async function handleFileSelection(file) {
        if (!file) return;

        // Verificar que loadDatabase esté disponible
        if (typeof HubTools === 'undefined' || typeof HubTools.data === 'undefined' || typeof HubTools.data.loadDatabase === 'undefined') {
            showCsvError('Error: módulo dataManager no cargado. Recargue la página.');
            console.error('HubTools.data.loadDatabase no está definida. Asegúrese de que dataManager.js se cargó correctamente.');
            console.error('typeof HubTools:', typeof HubTools);
            console.error('typeof HubTools.data:', typeof HubTools !== 'undefined' ? typeof HubTools.data : 'N/A');
            return;
        }

        try {
            clearMessages();
            const success = await HubTools.data.loadDatabase(file);
            if (success) {
                document.dispatchEvent(new CustomEvent('databaseLoaded'));
                alert('Base de datos cargada y lista para usar en toda la aplicación.');
                const professionals = HubTools.data.getProfesionales();
                populateProfessionalSelect(professionals);
                showCsvSuccess(0, professionals.length); // Patient count needs implementation
            } else {
                showCsvError('Error al cargar el archivo Excel. Verifique el formato y la consola.');
            }
        } catch (error) {
            console.error("Error crítico al procesar el archivo:", error);
            showCsvError('Error crítico al procesar el archivo.');
        }
    }

    // --- Professional Selection ---
    function populateProfessionalSelect(professionals) {
        if (!professionalSelect) return;
        professionalSelect.innerHTML = '<option value="" disabled selected>Seleccionar...</option>';
        professionals.forEach(prof => {
            const option = document.createElement('option');
            option.value = prof.Nombre_Completo;
            option.textContent = prof.Nombre_Completo;
            professionalSelect.appendChild(option);
        });
    }

    // --- Patient Search Datalist Population ---
    function populatePatientDatalist() {
        const datalist = document.getElementById('patientIds');
        if (!datalist) return;

        datalist.innerHTML = '';
        const seenIds = new Set();

        const appendOption = (id, label) => {
            if (!id || seenIds.has(id)) return;
            const option = document.createElement('option');
            option.value = id;
            if (label) {
                option.label = label;
            }
            datalist.appendChild(option);
            seenIds.add(id);
        };

        if (typeof window.MockPatients?.list === 'function') {
            window.MockPatients.list().forEach(summary => {
                appendOption(summary.idPaciente, `${summary.idPaciente} · ${summary.nombre}`);
            });
        }

        if (typeof HubTools?.data?.getAllPatients === 'function') {
            const dbPatients = HubTools.data.getAllPatients();
            dbPatients.forEach(patient => {
                const patientId = patient.ID_Paciente || patient.ID || patient.id || patient.Id;
                const name = patient.Nombre_Paciente || patient.nombrePaciente || patient.Nombre || patient.nombre;
                appendOption(patientId, name ? `${patientId} · ${name}` : null);
            });
        }

        console.log(`✅ Datalist poblado con ${datalist.children.length} pacientes`);
    }

    function updateCurrentProfessional(name) {
        if (currentProfessionalLabel) currentProfessionalLabel.textContent = name;
        if (professionalInput) professionalInput.value = name;
        localStorage.setItem('hubSelectedProfessional', name);
    }

    function loadProfessionalFromStorage() {
        const stored = localStorage.getItem('hubSelectedProfessional');
        if (stored) {
            updateCurrentProfessional(stored);
        }
    }

    function toggleProfessionalSelector(shouldShow) {
        professionalSelector?.classList.toggle('hidden', !shouldShow);
    }

    // --- Event Listeners: Navigation Links ---
    document.querySelectorAll('[data-nav-link]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            attemptNavigation(link.getAttribute('href'));
        });
    });

    // --- Event Listeners: CSV/Database Loading ---
    if (csvBtn && csvFileInput) {
        csvBtn.addEventListener('click', () => csvFileInput.click());
        csvFileInput.addEventListener('change', () => {
            const file = csvFileInput.files && csvFileInput.files[0];
            handleFileSelection(file);
        });
    }

    // --- Event Listeners: Professional Selection ---
    // Función helper para abrir el selector
    function openProfessionalSelector() {
        if (typeof HubTools === 'undefined' || typeof HubTools.data === 'undefined' || typeof HubTools.data.getProfesionales === 'undefined') {
            showCsvError('Cargue la base de datos primero.');
            return;
        }
        const professionals = HubTools.data.getProfesionales();
        if (!professionals || professionals.length === 0) {
            showCsvError('Cargue la base de datos para seleccionar un profesional.');
            return;
        }
        toggleProfessionalSelector(true);
    }

    // Click en botón del sidebar
    changeProfessionalBtn?.addEventListener('click', openProfessionalSelector);

    // Click en el input central de profesional
    professionalInput?.addEventListener('click', openProfessionalSelector);

    // Click en el wrapper del input central (incluyendo el ícono)
    const professionalInputWrapper = professionalInput?.parentElement;
    professionalInputWrapper?.addEventListener('click', (e) => {
        // Prevenir que se dispare dos veces si se hace click directamente en el input
        if (e.target !== professionalInput) {
            openProfessionalSelector();
        }
    });

    confirmProfessionalBtn?.addEventListener('click', () => {
        const selected = professionalSelect?.value;
        if (selected) {
            updateCurrentProfessional(selected);
            toggleProfessionalSelector(false);
        }
    });

    cancelProfessionalBtn?.addEventListener('click', () => {
        toggleProfessionalSelector(false);
    });

    // Listen for the global event to populate professionals if data is loaded on another page
    document.addEventListener('databaseLoaded', () => {
        if (typeof HubTools !== 'undefined' && typeof HubTools.data !== 'undefined' && typeof HubTools.data.getProfesionales !== 'undefined') {
            const professionals = HubTools.data.getProfesionales();
            populateProfessionalSelect(professionals);
        }
        // Also refresh patient datalist with database patients
        populatePatientDatalist();
    });

    // --- Event Listeners: Navigation Buttons ---
    document.getElementById('btnNuevaVisita')?.addEventListener('click', () => attemptNavigation('primera_visita.html'));
    document.getElementById('btnSeguimiento')?.addEventListener('click', () => attemptNavigation('seguimiento.html'));
    document.getElementById('btnDashboardPaciente')?.addEventListener('click', () => attemptNavigation('dashboard_search.html'));
    document.getElementById('btnDashboardServicio')?.addEventListener('click', () => attemptNavigation('estadisticas.html'));

    // --- Event Listeners: Patient Search ---
    // Sidebar search input
    if (patientSearchInput) {
        patientSearchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const patientId = patientSearchInput.value.trim();
                if (patientId) {
                    showPatientResults(patientId);
                }
            }
        });
    }

    // Central search input
    if (patientIdInput) {
        patientIdInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const patientId = patientIdInput.value.trim();
                if (patientId) {
                    showPatientResults(patientId);
                }
            }
        });
    }

    // --- Initial Load ---
    clearMessages();
    loadProfessionalFromStorage();

    // Populate patient datalist with hardcoded test patients
    populatePatientDatalist();

    updatePendingRowsIndicator();
    window.addEventListener('pendingRowsUpdated', updatePendingRowsIndicator);

    // On initial load, try to populate from already loaded data (if user reloads hub page)
    if (typeof HubTools !== 'undefined' && typeof HubTools.data !== 'undefined' && typeof HubTools.data.getProfesionales !== 'undefined') {
        const professionals = HubTools.data.getProfesionales();
        if (professionals && professionals.length > 0) {
            populateProfessionalSelect(professionals);
        }
    }

    console.log('✅ Hub Clínico inicializado correctamente');
});

