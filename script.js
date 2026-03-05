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
    const id = record.ID_Paciente || record.idPaciente || record.id || record.Id;
    const nombre = record.Nombre_Paciente || record.nombrePaciente || record.Nombre || record.nombre || 'Paciente sin nombre';
    const historyData = history && Array.isArray(history.allVisits) && history.allVisits.length > 0 ? history : null;
    const latestVisit = historyData ? historyData.latestVisit : null;
    const treatmentHistory = historyData?.treatmentHistory || [];
    const activeTreatment = treatmentHistory.length ? treatmentHistory[treatmentHistory.length - 1] : null;
    const pathologyCode = (record.pathology || record.diagnosticoPrimario || historyData?.pathology || '').toLowerCase();

    return {
        idPaciente: id,
        id,
        nombre,
        diagnostico: record.Diagnostico_Principal || record.diagnostico || labelForPathology(pathologyCode),
        diagnosticoPrimario: pathologyCode || (record.diagnosticoPrimario ? record.diagnosticoPrimario.toLowerCase() : ''),
        tratamientoActual: coalesce(record.tratamientoActual, record.Tratamiento_Actual, activeTreatment?.name),
        fechaInicioTratamiento: coalesce(record.fechaInicioTratamiento, record.Fecha_Inicio_Tratamiento, activeTreatment?.startDate),
        ultimaVisita: coalesce(record.ultimaVisita, record.Fecha_Visita, latestVisit?.Fecha_Visita, latestVisit?.fechaVisita),
        evaGlobal: coalesce(record.evaGlobal, latestVisit?.evaGlobal, latestVisit?.EVA_Global),
        evaDolor: coalesce(record.evaDolor, latestVisit?.evaDolor, latestVisit?.EVA_Dolor),
        basdai: coalesce(record.basdai, latestVisit?.basdaiResult, latestVisit?.basdai),
        asdasCrp: coalesce(record.asdasCrp, latestVisit?.asdasCrpResult, latestVisit?.asdasCrp, latestVisit?.ASDAS_CRP),
        das28Crp: coalesce(record.das28Crp, record.DAS28_CRP_Result, record.DAS28_CRP, latestVisit?.das28CrpResult, latestVisit?.DAS28_CRP_Result, latestVisit?.das28Crp, latestVisit?.DAS28_CRP),
        das28Esr: coalesce(record.das28Esr, record.DAS28_ESR_Result, record.DAS28_ESR, latestVisit?.das28EsrResult, latestVisit?.DAS28_ESR_Result, latestVisit?.das28Esr, latestVisit?.DAS28_ESR),
        cdai: coalesce(record.cdai, record.CDAI_Result, record.CDAI, latestVisit?.cdaiResult, latestVisit?.CDAI_Result, latestVisit?.cdai, latestVisit?.CDAI),
        sdai: coalesce(record.sdai, record.SDAI_Result, record.SDAI, latestVisit?.sdaiResult, latestVisit?.SDAI_Result, latestVisit?.sdai, latestVisit?.SDAI),
        haq: coalesce(record.haq, latestVisit?.haqTotal, latestVisit?.haq),
        rapid3: coalesce(record.rapid3, record.RAPID3_Score, record.RAPID3, latestVisit?.rapid3Result, latestVisit?.RAPID3_Score, latestVisit?.rapid3Total, latestVisit?.rapid3, latestVisit?.RAPID3)
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
        resultsContent.innerHTML = `
            <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <i class="fas fa-search" style="font-size: 3rem; color: #d1d5db; margin-bottom: 1rem; display: block;"></i>
                <p style="color: #6b7280; margin-bottom: 1.5rem;">No se encontraron resultados para el ID proporcionado (${id}).</p>
                <p style="color: #9ca3af; font-size: 0.875rem; margin-bottom: 1.5rem;">¿Desea crear una nueva historia clínica para este paciente?</p>
                <a href="primera_visita.html?id=${id}" class="action-btn primary-btn" style="display: inline-block; padding: 1rem 2rem; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
                    <i class="fas fa-plus-circle" style="margin-right: 0.5rem;"></i>
                    Crear Nueva Historia Clínica
                </a>
            </div>
        `;
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

        resultsContent.innerHTML = `
            <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="margin-bottom: 2rem;">
                    <i class="fas fa-user-plus" style="font-size: 3rem; color: #3b82f6; margin-bottom: 1rem; display: block;"></i>
                    <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 600; color: #111827;">Nuevo Paciente</h3>
                    <p style="margin: 0 0 0.5rem 0; color: #6b7280;">Se procederá a crear una nueva historia clínica</p>
                </div>

                <div style="background: #f3f4f6; padding: 1.5rem; border-radius: 6px; margin-bottom: 2rem;">
                    <div style="display: flex; align-items: center; gap: 1rem; justify-content: center; margin-bottom: 1rem;">
                        <i class="fas fa-id-card" style="color: #3b82f6; font-size: 1.5rem;"></i>
                        <div style="text-align: left;">
                            <div style="font-size: 0.875rem; color: #6b7280;">ID del Paciente</div>
                            <div style="font-weight: 600; font-size: 1.125rem;">${id}</div>
                        </div>
                    </div>
                </div>

                <a href="primera_visita.html?id=${id}" class="action-btn primary-btn" style="display: inline-block; padding: 1rem 2rem; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; margin-right: 1rem;">
                    <i class="fas fa-plus-circle" style="margin-right: 0.5rem;"></i>
                    Crear Primera Visita
                </a>
                <button onclick="document.getElementById('patientSearch').value = ''; document.getElementById('patientId').value = '';" style="padding: 1rem 2rem; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; font-weight: 500; cursor: pointer;">
                    <i class="fas fa-times-circle" style="margin-right: 0.5rem;"></i>
                    Cancelar
                </button>
            </div>
        `;
    } else {
        if (searchResultsTitle) searchResultsTitle.textContent = 'Paciente Encontrado - Opciones Disponibles';
        if (searchResultsSubtitle) searchResultsSubtitle.textContent = `Mostrando datos de ${patientName} (ID: ${id})`;

        let scoresHTML = '';
        const evaGlobal = patient.evaGlobal;
        const evaDolor = patient.evaDolor;
        const basdai = patient.basdai;
        const asdasCrp = patient.asdasCrp;

        if (evaGlobal !== null && evaGlobal !== undefined && evaGlobal !== '') {
            scoresHTML += `
                <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 0.5rem;">EVA GLOBAL</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #111827;">${evaGlobal}</div>
                </div>
            `;
        }
        if (evaDolor !== null && evaDolor !== undefined && evaDolor !== '') {
            scoresHTML += `
                <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 0.5rem;">EVA DOLOR</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #111827;">${evaDolor}</div>
                </div>
            `;
        }
        if (basdai !== null && basdai !== undefined && basdai !== '') {
            scoresHTML += `
                <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 0.5rem;">BASDAI</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #111827;">${basdai}</div>
                </div>
            `;
        }
        if (asdasCrp !== null && asdasCrp !== undefined && asdasCrp !== '') {
            scoresHTML += `
                <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 0.5rem;">ASDAS-CRP</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #111827;">${asdasCrp}</div>
                </div>
            `;
        }

        // AR-specific scores
        const das28Crp = patient.das28Crp;
        const das28Esr = patient.das28Esr;
        const cdai = patient.cdai;
        const sdai = patient.sdai;
        const haq = patient.haq;
        const rapid3 = patient.rapid3;

        if (das28Crp !== null && das28Crp !== undefined && das28Crp !== '') {
            scoresHTML += `
                <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 0.5rem;">DAS28-CRP</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #111827;">${das28Crp}</div>
                </div>
            `;
        }
        if (das28Esr !== null && das28Esr !== undefined && das28Esr !== '') {
            scoresHTML += `
                <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 0.5rem;">DAS28-ESR</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #111827;">${das28Esr}</div>
                </div>
            `;
        }
        if (cdai !== null && cdai !== undefined && cdai !== '') {
            scoresHTML += `
                <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 0.5rem;">CDAI</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #111827;">${cdai}</div>
                </div>
            `;
        }
        if (sdai !== null && sdai !== undefined && sdai !== '') {
            scoresHTML += `
                <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 0.5rem;">SDAI</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #111827;">${sdai}</div>
                </div>
            `;
        }
        if (haq !== null && haq !== undefined && haq !== '') {
            scoresHTML += `
                <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 0.5rem;">HAQ-DI</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #111827;">${haq}</div>
                </div>
            `;
        }
        if (rapid3 !== null && rapid3 !== undefined && rapid3 !== '') {
            scoresHTML += `
                <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 0.5rem;">RAPID3</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #111827;">${rapid3}</div>
                </div>
            `;
        }

        const dashboardUrlPathology = pathologyCode ? `&patologia=${encodeURIComponent(pathologyCode)}` : '';
        const dashboardUrl = `dashboard_paciente.html?id=${encodeURIComponent(id)}${dashboardUrlPathology}`;

        resultsContent.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 2rem;">
                <div class="patient-summary-card" style="background: white; padding: 1.75rem; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: grid; grid-template-columns: 1fr auto; gap: 1.5rem; align-items: center;">
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <div style="font-size: 0.85rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em;">Paciente</div>
                        <div style="font-size: 1.4rem; font-weight: 600; color: #1f2937;">${patientName}</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 1rem; color: #4b5563; font-size: 0.95rem;">
                            <span><strong>ID:</strong> ${id}</span>
                            <span><strong>Diagnóstico:</strong> ${pathologyLabel}</span>
                            <span><strong>Última visita:</strong> ${lastVisit}</span>
                        </div>
                    </div>
                    <button id="btnVerDashboardCompleto" class="action-btn purple-btn" style="display: inline-flex; align-items: center; gap: 0.6rem; padding: 0.9rem 1.6rem;">
                        <i class="fas fa-chart-line" aria-hidden="true"></i>
                        Ver Dashboard Completo
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem;">
                    <div class="patient-info-card" style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                        <h3 style="margin: 0 0 1.5rem 0; font-size: 1.1rem; font-weight: 600;">Resumen Clínico</h3>
                        <div style="display: flex; flex-direction: column; gap: 0.8rem; color: #374151;">
                            <div><strong>Tratamiento activo:</strong> ${treatment}</div>
                            <div><strong>Inicio tratamiento:</strong> ${treatmentStart}</div>
                            <div><strong>Evaluación global:</strong> ${formatDisplayValue(evaGlobal)}</div>
                            <div><strong>${pathologyCode === 'ar' ? 'DAS28-CRP' : 'BASDAI'}:</strong> ${formatDisplayValue(pathologyCode === 'ar' ? das28Crp : basdai)}</div>
                        </div>
                    </div>

                    <div class="patient-scores-card" style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                        <h3 style="margin: 0 0 1.5rem 0; font-size: 1.1rem; font-weight: 600;">Índices Clínicos</h3>
                        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem;">
                            ${scoresHTML || '<p style="grid-column: span 2; color: #6b7280;">Sin datos registrados.</p>'}
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem;">
                    <div class="patient-actions-card" style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                        <h3 style="margin: 0 0 1.5rem 0; font-size: 1.1rem; font-weight: 600;">Acciones rápidas</h3>
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <a href="seguimiento.html?id=${id}&patologia=${pathologyCode}" class="action-btn green-btn" style="display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; text-decoration: none;">
                                <i class="fas fa-clipboard-list" aria-hidden="true"></i> Registrar Seguimiento
                            </a>
                            <a href="primera_visita.html?id=${id}" class="action-btn turquoise-btn" style="display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; text-decoration: none;">
                                <i class="fas fa-file-alt" aria-hidden="true"></i> Revisar Primera Visita
                            </a>
                        </div>
                    </div>
                    <div class="patient-treatment-card" style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                        <h3 style="margin: 0 0 1.5rem 0; font-size: 1.1rem; font-weight: 600;">Notas adicionales</h3>
                        <p style="margin: 0; color: #4b5563;">Consulta el dashboard completo para revisar eventos clínicos, evolución de índices y periodos terapéuticos.</p>
                    </div>
                </div>
            </div>
        `;

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

    // On initial load, try to populate from already loaded data (if user reloads hub page)
    if (typeof HubTools !== 'undefined' && typeof HubTools.data !== 'undefined' && typeof HubTools.data.getProfesionales !== 'undefined') {
        const professionals = HubTools.data.getProfesionales();
        if (professionals && professionals.length > 0) {
            populateProfessionalSelect(professionals);
        }
    }

    console.log('✅ Hub Clínico inicializado correctamente');
});

