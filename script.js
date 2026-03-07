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

function inferPathologyFromPatientId(id) {
    var normalized = (id || '').toString().trim().toLowerCase();
    if (normalized.startsWith('esp')) return 'espa';
    if (normalized.startsWith('aps')) return 'aps';
    if (normalized.startsWith('ar')) return 'ar';
    return '';
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

// === Indicador de estado de BD en sidebar ===

function ensureExcelFileInput() {
    var input = document.getElementById('excelFileInput') || document.getElementById('csvFileInput');
    if (input && input.id !== 'excelFileInput') {
        input.id = 'excelFileInput';
    }
    if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'excelFileInput';
        input.accept = '.xlsx';
        input.hidden = true;
        document.body.appendChild(input);
    }
    return input;
}

async function loadDatabaseFromFile(file, hooks) {
    if (!file) return false;
    if (typeof HubTools === 'undefined' || !HubTools.data || !HubTools.data.loadDatabase) {
        hooks?.onError?.('Error: módulo dataManager no cargado. Recargue la página.');
        return false;
    }

    try {
        hooks?.onStart?.();
        var success = await HubTools.data.loadDatabase(file);
        if (!success) {
            hooks?.onError?.('Error al cargar el archivo Excel. Verifique el formato y la consola.');
            return false;
        }

        document.dispatchEvent(new CustomEvent('databaseLoaded'));
        hooks?.onSuccess?.(HubTools.data.getProfesionales().length);
        updateDbStatus();
        return true;
    } catch (error) {
        console.error('Error crítico al procesar el archivo:', error);
        hooks?.onError?.('Error crítico al procesar el archivo.');
        return false;
    }
}

function formatRelativeTime(timestamp) {
    var parsed = parseInt(timestamp, 10);
    if (!parsed) return '';
    var diffMs = Math.max(0, Date.now() - parsed);
    var diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 60) return 'hace ' + diffMinutes + ' min';
    var diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return 'hace ' + diffHours + 'h';
    var diffDays = Math.floor(diffHours / 24);
    return 'hace ' + diffDays + ' días';
}

var HUB_DB_STALE_AFTER_MINUTES = 180;
var HUB_DB_LONG_SESSION_AFTER_MINUTES = 360;

function getDbStatusSnapshot() {
    var hasDb = !!sessionStorage.getItem('hubClinicoDB');
    var timestamp = parseInt(sessionStorage.getItem('hubClinicoDB_loadTime') || '', 10);
    var hasTimestamp = !isNaN(timestamp) && timestamp > 0;
    var isLimited = sessionStorage.getItem('hubClinicoDB_limited') === 'true';

    if (!hasDb) {
        return {
            state: 'empty',
            modifier: 'db-status-indicator--empty',
            icon: 'fa-database',
            label: 'BD no cargada',
            time: '',
            title: 'No hay base de datos cargada en esta sesión. Clic para cargar o recargar el Excel.'
        };
    }

    if (!hasTimestamp) {
        return {
            state: 'stale',
            modifier: 'db-status-indicator--stale',
            icon: 'fa-exclamation-triangle',
            label: 'BD en caché sin fecha',
            time: '· recargue la BD',
            title: 'Hay datos en caché, pero falta la hora de carga. Recargue el Excel para sincronizar la sesión.'
        };
    }

    var elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    var ageText = formatRelativeTime(timestamp);
    var reasons = [];

    if (isLimited) {
        reasons.push('caché limitada');
    }

    if (elapsedMinutes >= HUB_DB_LONG_SESSION_AFTER_MINUTES) {
        reasons.push('sesión larga');
    }

    if (elapsedMinutes >= HUB_DB_STALE_AFTER_MINUTES || isLimited) {
        var staleTimeParts = [];
        if (ageText) staleTimeParts.push(ageText);
        staleTimeParts.push.apply(staleTimeParts, reasons);

        return {
            state: 'stale',
            modifier: 'db-status-indicator--stale',
            icon: 'fa-exclamation-triangle',
            label: 'BD potencialmente desactualizada',
            time: staleTimeParts.length ? '· ' + staleTimeParts.join(' · ') : '',
            title: 'La base de datos fue cargada ' + (ageText || 'en una sesión anterior') + '. Recárguela si el Excel cambió fuera de esta sesión.'
                + (isLimited ? ' La caché actual es limitada y puede no incluir todo el histórico.' : '')
        };
    }

    return {
        state: 'loaded',
        modifier: 'db-status-indicator--loaded',
        icon: 'fa-check-circle',
        label: 'BD cargada',
        time: ageText ? '· ' + ageText : '',
        title: 'Base de datos cargada ' + (ageText || 'en esta sesión') + '. Clic para recargar si hubo cambios externos en el Excel.'
    };
}

function updateDbStatus() {
    var indicator = document.getElementById('dbStatusIndicator');
    var icon = document.getElementById('dbStatusIcon');
    var label = document.getElementById('dbStatusLabel');
    var time = document.getElementById('dbStatusTime');
    if (!indicator || !icon || !label || !time) return;

    var snapshot = getDbStatusSnapshot();

    indicator.classList.remove('db-status-indicator--loaded', 'db-status-indicator--stale', 'db-status-indicator--empty');
    indicator.classList.add(snapshot.modifier);
    indicator.dataset.dbState = snapshot.state;
    indicator.title = snapshot.title;
    indicator.setAttribute('aria-label', snapshot.label + (snapshot.time ? '. ' + snapshot.time.replace(/^·\s*/, '') : ''));
    icon.className = 'fas ' + snapshot.icon + ' db-status-indicator__icon';
    label.textContent = snapshot.label;
    time.textContent = snapshot.time;
}

// === Sidebar unificado ===

function initSidebar() {
    // Detectar p\u00e1gina actual y marcar nav-link activo
    var currentPage = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('.nav-link').forEach(function(link) {
        var href = (link.getAttribute('href') || '').toLowerCase();
        link.classList.toggle('active', href === currentPage);
    });

    // Cargar profesional desde localStorage
    var stored = localStorage.getItem('hubSelectedProfessional');
    var label = document.getElementById('currentProfessional');
    if (label && stored) label.textContent = stored;

    // Inicializar indicador de BD
    initDbStatusIndicator();
}

// === Sesi\u00f3n de profesional ===

function checkProfessionalSession() {
    var currentPage = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (currentPage === 'index.html') return;
    if (!localStorage.getItem('hubSelectedProfessional')) {
        window.location.href = 'index.html';
    }
}

function initSessionGate() {
    var gate = document.getElementById('sessionGate');
    if (!gate) return;

    // Si ya hay profesional, ocultar overlay y continuar
    if (localStorage.getItem('hubSelectedProfessional')) {
        gate.classList.add('hidden');
        return;
    }

    // Mostrar el overlay (arranca oculto por defecto en el HTML)
    gate.classList.remove('hidden');

    var stepLoad   = document.getElementById('gateStepLoad');
    var stepSelect = document.getElementById('gateStepSelect');
    var gateLoadBtn    = document.getElementById('gateLoadBtn');
    var gateExcelInput = document.getElementById('gateExcelInput');
    var gateError      = document.getElementById('gateLoadError');
    var gateProfSelect = document.getElementById('gateProfessionalSelect');
    var gateConfirmBtn = document.getElementById('gateConfirmBtn');

    function populateGateSelect() {
        if (!gateProfSelect || typeof HubTools === 'undefined') return;
        var pros = HubTools.data.getProfesionales() || [];
        gateProfSelect.innerHTML = '<option value="" disabled selected>Seleccionar profesional...</option>';
        pros.forEach(function(p) {
            var opt = document.createElement('option');
            opt.value = p.Nombre_Completo;
            opt.textContent = p.Nombre_Completo;
            gateProfSelect.appendChild(opt);
        });
    }

    function showSelectStep() {
        if (stepLoad) stepLoad.classList.add('hidden');
        if (stepSelect) stepSelect.classList.remove('hidden');
        populateGateSelect();
    }

    // Si la BD ya está en caché de esta pestaña, ir directamente al paso de selección
    if (sessionStorage.getItem('hubClinicoDB')) {
        showSelectStep();
    }

    if (gateLoadBtn && gateExcelInput) {
        gateLoadBtn.addEventListener('click', function() {
            gateExcelInput.value = '';
            gateExcelInput.click();
        });
        gateExcelInput.addEventListener('change', function() {
            var file = gateExcelInput.files && gateExcelInput.files[0];
            if (!file) return;
            loadDatabaseFromFile(file, {
                onStart: function() {
                    if (gateError) gateError.classList.add('hidden');
                },
                onSuccess: function() {
                    showSelectStep();
                },
                onError: function(message) {
                    if (gateError) { gateError.textContent = message; gateError.classList.remove('hidden'); }
                }
            });
            gateExcelInput.value = '';
        });
    }

    if (gateProfSelect) {
        gateProfSelect.addEventListener('change', function() {
            if (gateConfirmBtn) gateConfirmBtn.disabled = !gateProfSelect.value;
        });
    }

    if (gateConfirmBtn) {
        gateConfirmBtn.addEventListener('click', function() {
            var sel = gateProfSelect ? gateProfSelect.value : '';
            if (!sel) return;
            localStorage.setItem('hubSelectedProfessional', sel);
            var label = document.getElementById('currentProfessional');
            if (label) label.textContent = sel;
            gate.classList.add('hidden');
        });
    }
}

// === Cierre de sesi\u00f3n ===

function initLogoutBtn() {
    var btn = document.getElementById('logoutBtn');
    if (!btn) return;
    btn.addEventListener('click', function() {
        localStorage.removeItem('hubSelectedProfessional');
        window.location.href = 'index.html';
    });
}

function initDbStatusIndicator() {
    var indicator = document.getElementById('dbStatusIndicator');
    if (!indicator) return;

    if (!indicator.dataset.bound) {
        indicator.addEventListener('click', function() {
            var input = ensureExcelFileInput();
            input.value = '';
            input.click();
        });
        indicator.dataset.bound = 'true';
    }

    var input = ensureExcelFileInput();
    if (!input.dataset.boundDbLoader) {
        input.addEventListener('change', function() {
            var file = input.files && input.files[0];
            if (!file) return;
            loadDatabaseFromFile(file, {
                onSuccess: function(professionalCount) {
                    if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
                        HubTools.utils.mostrarNotificacion(
                            'Base de datos cargada (' + professionalCount + ' profesionales).',
                            'success'
                        );
                    }
                },
                onError: function(message) {
                    if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
                        HubTools.utils.mostrarNotificacion(message, 'error');
                    }
                }
            });
            input.value = '';
        });
        input.dataset.boundDbLoader = 'true';
    }

    if (!window.__hubDbStatusListenersBound) {
        window.addEventListener('databaseLoaded', updateDbStatus);
        document.addEventListener('databaseLoaded', updateDbStatus);
        window.addEventListener('focus', updateDbStatus);
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                updateDbStatus();
            }
        });
        window.__hubDbStatusListenersBound = true;
    }

    if (window.__hubDbStatusInterval) clearInterval(window.__hubDbStatusInterval);
    window.__hubDbStatusInterval = setInterval(updateDbStatus, 60000);
    updateDbStatus();
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

function renderQuickViewLayout(viewModel) {
    return `
        <div class="quick-view-stack">
            <div class="patient-summary-card quick-view-summary-card">
                <div class="quick-view-summary-card__body">
                    <div class="quick-view-eyebrow">Paciente</div>
                    <div class="quick-view-patient-name">${viewModel.patientName}</div>
                    <div class="quick-view-meta">
                        <span><strong>ID:</strong> ${viewModel.id}</span>
                        <span><strong>Diagnóstico:</strong> ${viewModel.pathologyLabel}</span>
                        <span><strong>Última visita:</strong> ${viewModel.lastVisit}</span>
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
                        <div><strong>Tratamiento activo:</strong> ${viewModel.treatment}</div>
                        <div><strong>Inicio tratamiento:</strong> ${viewModel.treatmentStart}</div>
                        <div><strong>Evaluación global:</strong> ${formatDisplayValue(viewModel.evaGlobal)}</div>
                        <div><strong>${viewModel.pathologyCode === 'ar' ? 'DAS28-CRP' : 'BASDAI'}:</strong> ${formatDisplayValue(viewModel.pathologyCode === 'ar' ? viewModel.das28Crp : viewModel.basdai)}</div>
                    </div>
                </div>

                <div class="patient-scores-card quick-view-panel-card">
                    <h3 class="quick-view-panel-card__title">Índices Clínicos</h3>
                    <div class="quick-view-metrics-grid">
                        ${viewModel.scoresHTML || '<p class="quick-view-empty-metrics">Sin datos registrados.</p>'}
                    </div>
                </div>
            </div>

            <div class="quick-view-two-col">
                <div class="patient-actions-card quick-view-panel-card">
                    <h3 class="quick-view-panel-card__title">Acciones rápidas</h3>
                    <div class="quick-view-actions">
                        <a href="seguimiento.html?id=${viewModel.id}&patologia=${viewModel.pathologyCode}" class="action-btn green-btn quick-view-action-link">
                            <i class="fas fa-clipboard-list" aria-hidden="true"></i> Registrar Seguimiento
                        </a>
                        <a href="primera_visita.html?id=${viewModel.id}" class="action-btn turquoise-btn quick-view-action-link">
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
}

function resolveQuickViewPatient(id) {
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

    return { patient, historyData, hasHistory, isNewPatient };
}

function buildQuickViewScores(patient) {
    return [
        ['EVA GLOBAL', patient.evaGlobal],
        ['EVA DOLOR', patient.evaDolor],
        ['BASDAI', patient.basdai],
        ['ASDAS-CRP', patient.asdasCrp],
        ['DAS28-CRP', patient.das28Crp],
        ['DAS28-ESR', patient.das28Esr],
        ['CDAI', patient.cdai],
        ['SDAI', patient.sdai],
        ['HAQ-DI', patient.haq],
        ['RAPID3', patient.rapid3]
    ]
        .filter(function(metric) {
            return metric[1] !== null && metric[1] !== undefined && metric[1] !== '';
        })
        .map(function(metric) {
            return renderQuickViewMetric(metric[0], metric[1]);
        })
        .join('');
}

function buildQuickViewModel(id, patient, historyData) {
    const pathologyCode = patient.diagnosticoPrimario || historyData?.pathology || '';

    return {
        patientName: patient.nombre || 'Paciente sin nombre',
        id: id,
        pathologyCode: pathologyCode,
        pathologyLabel: labelForPathology(pathologyCode),
        lastVisit: formatDisplayDate(patient.ultimaVisita) || 'Sin registros',
        treatment: formatDisplayValue(patient.tratamientoActual || historyData?.treatmentHistory?.slice(-1)[0]?.name),
        treatmentStart: formatDisplayDate(patient.fechaInicioTratamiento || historyData?.treatmentHistory?.slice(-1)[0]?.startDate) || 'Sin registrar',
        evaGlobal: patient.evaGlobal,
        basdai: patient.basdai,
        das28Crp: patient.das28Crp,
        scoresHTML: buildQuickViewScores(patient)
    };
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
    const resolvedPatient = resolveQuickViewPatient(id);
    let patient = resolvedPatient.patient;
    let historyData = resolvedPatient.historyData;
    let isNewPatient = resolvedPatient.isNewPatient;

    if (!patient) {
        if (searchResultsTitle) searchResultsTitle.textContent = 'Paciente No Encontrado';
        if (searchResultsSubtitle) searchResultsSubtitle.textContent = '';
        resultsContent.innerHTML = renderQuickViewEmptyState(id);
        revealQuickView();
        return;
    }

    const patientName = patient.nombre || 'Paciente sin nombre';
    const pathologyCode = patient.diagnosticoPrimario || historyData?.pathology || '';

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
        resultsContent.innerHTML = renderQuickViewLayout(buildQuickViewModel(id, patient, historyData));

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

// === Autocomplete de pacientes ===

function PatientAutocomplete(inputEl, opts) {
    var self = this;
    var options = opts || {};
    var onSelect = options.onSelect || function() {};
    var isMain = !!options.mainTheme;
    var MAX = 8;
    var MIN_CHARS = 2;
    var debounceTimer = null;
    var highlighted = -1;
    var currentResults = [];

    var dropdown = document.createElement('div');
    dropdown.className = 'patient-autocomplete' + (isMain ? ' patient-autocomplete--main' : '');
    dropdown.setAttribute('role', 'listbox');
    inputEl.parentElement.style.position = inputEl.parentElement.style.position || 'relative';
    inputEl.parentElement.appendChild(dropdown);

    function norm(str) {
        return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\- ]/g, '');
    }

    function badgeInfo(path) {
        var p = (path || '').toLowerCase();
        if (p === 'espa') return { label: 'EspA', cls: 'espa' };
        if (p === 'aps')  return { label: 'APs',  cls: 'aps' };
        if (p === 'ar')   return { label: 'AR',   cls: 'ar' };
        return { label: '', cls: 'unknown' };
    }

    function gatherAll() {
        var list = []; var seen = {};
        if (typeof HubTools !== 'undefined' && typeof HubTools.data !== 'undefined' && typeof HubTools.data.getAllPatients === 'function') {
            HubTools.data.getAllPatients().forEach(function(p) {
                var id = p.ID_Paciente || p.idPaciente || p.ID;
                if (!id || seen[id]) return;
                seen[id] = true;
                list.push({ id: id, name: p.Nombre_Paciente || p.nombrePaciente || p.Nombre || '', pathology: (p.pathology || p.diagnosticoPrimario || p.Diagnostico_Principal || '').toLowerCase() });
            });
        }
        if (typeof window.MockPatients !== 'undefined' && typeof window.MockPatients.list === 'function') {
            window.MockPatients.list().forEach(function(m) {
                if (!m.idPaciente || seen[m.idPaciente]) return;
                seen[m.idPaciente] = true;
                list.push({ id: m.idPaciente, name: m.nombre || '', pathology: (m.pathology || m.diagnosticoPrimario || '').toLowerCase() });
            });
        }
        return list;
    }

    function search(term) {
        var t = norm(term);
        if (!t || t.length < MIN_CHARS) return [];
        return gatherAll().filter(function(p) {
            return norm(p.id).indexOf(t) === 0 || norm(p.name).indexOf(t) !== -1;
        });
    }

    function escHtml(s) { var d = document.createElement('div'); d.appendChild(document.createTextNode(s)); return d.innerHTML; }

    function render(matches, total) {
        dropdown.innerHTML = '';
        highlighted = -1;
        currentResults = matches;
        if (!matches.length) { dropdown.classList.remove('open'); return; }
        matches.forEach(function(p, i) {
            var b = badgeInfo(p.pathology);
            var item = document.createElement('div');
            item.className = 'patient-autocomplete__item';
            item.setAttribute('role', 'option');
            item.innerHTML =
                '<span class="patient-autocomplete__id">' + escHtml(p.id) + '</span>' +
                '<span class="patient-autocomplete__name">' + escHtml(p.name) + '</span>' +
                (b.label ? '<span class="patient-autocomplete__badge patient-autocomplete__badge--' + b.cls + '">' + b.label + '</span>' : '');
            item.addEventListener('click', (function(pat) { return function() { select(pat); }; })(p));
            dropdown.appendChild(item);
        });
        if (total > MAX) {
            var more = document.createElement('div');
            more.className = 'patient-autocomplete__more';
            more.textContent = '... y ' + (total - MAX) + ' resultados m\u00e1s';
            dropdown.appendChild(more);
        }
        dropdown.classList.add('open');
    }

    function select(patient) {
        inputEl.value = patient.id;
        close();
        onSelect(patient.id);
    }

    function close() {
        dropdown.classList.remove('open');
        dropdown.innerHTML = '';
        currentResults = [];
        highlighted = -1;
    }

    function updateHighlight() {
        var items = dropdown.querySelectorAll('.patient-autocomplete__item');
        items.forEach(function(el, i) { el.classList.toggle('highlighted', i === highlighted); });
        if (highlighted >= 0 && items[highlighted]) items[highlighted].scrollIntoView({ block: 'nearest' });
    }

    inputEl.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
            var term = inputEl.value.trim();
            if (term.length < MIN_CHARS) { close(); return; }
            var all = search(term);
            render(all.slice(0, MAX), all.length);
        }, 200);
    });

    inputEl.addEventListener('keydown', function(e) {
        if (!dropdown.classList.contains('open')) {
            if (e.key === 'Enter') { e.preventDefault(); var v = inputEl.value.trim(); if (v) onSelect(v); }
            return;
        }
        if (e.key === 'ArrowDown') { e.preventDefault(); highlighted = Math.min(highlighted + 1, currentResults.length - 1); updateHighlight(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); highlighted = Math.max(highlighted - 1, 0); updateHighlight(); }
        else if (e.key === 'Enter') { e.preventDefault(); if (highlighted >= 0 && currentResults[highlighted]) select(currentResults[highlighted]); else { var v = inputEl.value.trim(); if (v) { close(); onSelect(v); } } }
        else if (e.key === 'Escape') close();
    });

    document.addEventListener('click', function(e) {
        if (!inputEl.contains(e.target) && !dropdown.contains(e.target)) close();
    });

    self.close = close;
}

// --- Initialization on DOM Ready ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('\uD83D\uDE80 Iniciando Hub Cl\u00ednico...');

    // Guardia de sesi\u00f3n: redirige a index.html si no hay profesional seleccionado
    checkProfessionalSession();

    // Inicializar sidebar (active link + profesional + BD status)
    initSidebar();

    // Inicializar logout
    initLogoutBtn();

    // Session gate (solo en index.html)
    initSessionGate();

    // --- DOM Elements ---
    var csvBtn = document.getElementById('csvBtn');
    var csvFileInput = ensureExcelFileInput();
    var csvMessage = document.getElementById('csvMessage');
    var csvError = document.getElementById('csvError');

    // --- UI Feedback ---
    function clearMessages() {
        if (csvMessage) { csvMessage.classList.add('hidden'); csvMessage.textContent = ''; }
        if (csvError) { csvError.classList.add('hidden'); csvError.textContent = ''; }
    }

    function showCsvError(message) {
        if (!csvError) return;
        csvError.textContent = message;
        csvError.classList.remove('hidden');
        if (csvMessage) csvMessage.classList.add('hidden');
    }

    function showCsvSuccess(professionalCount) {
        if (!csvMessage) return;
        var ts = new Date();
        var formatted = ts.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        csvMessage.innerHTML =
            '<i class="fas fa-check-circle" aria-hidden="true"></i>' +
            '<span>Base de datos cargada (' + professionalCount + ' profesionales)</span>' +
            '<time datetime="' + ts.toISOString() + '">\u00daltima carga: ' + formatted + '</time>';
        csvMessage.classList.remove('hidden');
        if (csvError) csvError.classList.add('hidden');
    }

    // --- Database Loading ---
    async function handleFileSelection(file) {
        await loadDatabaseFromFile(file, {
            onStart: clearMessages,
            onSuccess: showCsvSuccess,
            onError: showCsvError
        });
    }

    // --- Event Listeners: Navigation Links ---
    document.querySelectorAll('[data-nav-link]').forEach(function(link) {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            attemptNavigation(link.getAttribute('href'));
        });
    });

    // --- Event Listeners: CSV/Database Loading (bot\u00f3n de carga manual en index.html) ---
    if (csvBtn && csvFileInput) {
        csvBtn.addEventListener('click', function() {
            csvFileInput.value = '';
            csvFileInput.click();
        });
        csvFileInput.addEventListener('change', function() {
            var file = csvFileInput.files && csvFileInput.files[0];
            handleFileSelection(file);
            csvFileInput.value = '';
        });
    }

    // --- databaseLoaded: actualizar BD status ---
    document.addEventListener('databaseLoaded', function() {
        updateDbStatus();
    });

    // --- Event Listeners: Navigation Buttons ---
    var btnNueva = document.getElementById('btnNuevaVisita');
    var btnSeg   = document.getElementById('btnSeguimiento');
    var btnDash  = document.getElementById('btnDashboardPaciente');
    var btnStats = document.getElementById('btnDashboardServicio');
    if (btnNueva) btnNueva.addEventListener('click', function() { attemptNavigation('primera_visita.html'); });
    if (btnSeg)   btnSeg.addEventListener('click', function() { attemptNavigation('seguimiento.html'); });
    if (btnDash)  btnDash.addEventListener('click', function() { attemptNavigation('dashboard_search.html'); });
    if (btnStats) btnStats.addEventListener('click', function() { attemptNavigation('estadisticas.html'); });

    // --- Autocomplete: b\u00fasqueda de pacientes ---
    var sidebarSearch = document.getElementById('patientSearch');
    if (sidebarSearch) {
        new PatientAutocomplete(sidebarSearch, { onSelect: function(id) { showPatientResults(id); } });
    }
    var centralSearch = document.getElementById('patientId');
    if (centralSearch) {
        new PatientAutocomplete(centralSearch, { mainTheme: true, onSelect: function(id) { showPatientResults(id); } });
    }

    // --- Pending rows indicator ---
    updatePendingRowsIndicator();
    window.addEventListener('pendingRowsUpdated', updatePendingRowsIndicator);

    console.log('\u2705 Hub Cl\u00ednico inicializado correctamente');
});

