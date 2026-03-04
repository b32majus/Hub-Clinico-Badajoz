/**
 * Script de Estadísticas del Servicio - Dashboard Premium v2.0
 * Hub Clínico Reumatología
 */

// === ESTADO GLOBAL ===
let currentCohort = [];
let filteredCohort = [];
let chartInstances = {};
let currentPage = 1;
const PAGE_SIZE = 10;
let sortColumn = null;
let sortDirection = 'asc';
let activeFilters = {};

// === PALETA DE COLORES UNIFICADA ===
const COLORS = {
    // Estados clínicos
    remission: '#10B981',
    lowActivity: '#3B82F6',
    moderate: '#F59E0B',
    highActivity: '#EF4444',
    // Tratamientos
    biologic: '#8B5CF6',
    fame: '#06B6D4',
    systemic: '#EC4899',
    other: '#6B7280',
    // UI
    primary: '#2563EB',
    secondary: '#64748B',
    border: '#E2E8F0'
};

const applyFiltersAndRefresh = () => {
    updateActiveFiltersDisplay();
    updateDashboard();
};

const debouncedApplyFilters = debounce(applyFiltersAndRefresh, 250);

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Iniciando Dashboard de Estadísticas v2.0...');

    // Configurar Chart.js globalmente
    configureChartDefaults();

    // Inicializar collapsibles usando HubTools
    if (HubTools && HubTools.form && HubTools.form.inicializarCollapsibles) {
        HubTools.form.inicializarCollapsibles();
    }

    initializeFilters();
    initializeFilterTabs();
    initializeDatePresets();
    initializeTableControls();
    addEventListeners();
    bindFiltersPanelResize();

    // Intentar cargar el dashboard inmediatamente
    updateDashboard();
    syncFiltersPanelHeight();

    // También escuchar el evento de base de datos cargada para cuando
    // la inicialización desde sessionStorage ocurra después
    window.addEventListener('databaseLoaded', () => {
        console.log('📊 Evento databaseLoaded recibido, actualizando dashboard...');
        poblarFiltroFarmacos();
        updateDashboard();
        syncFiltersPanelHeight();
    });
});

// === CONFIGURACIÓN GLOBAL DE CHART.JS ===
function configureChartDefaults() {
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#64748B';
    Chart.defaults.plugins.legend.position = 'bottom';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding = 20;
    Chart.defaults.plugins.tooltip.backgroundColor = '#1E293B';
    Chart.defaults.plugins.tooltip.titleColor = '#F8FAFC';
    Chart.defaults.plugins.tooltip.bodyColor = '#E2E8F0';
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.displayColors = true;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
    Chart.defaults.animation.duration = 750;
    Chart.defaults.animation.easing = 'easeOutQuart';
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
}

// === SISTEMA DE TABS DE FILTROS ===
function initializeFilterTabs() {
    const tabs = document.querySelectorAll('.filter-tab');
    const contents = document.querySelectorAll('.filter-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Actualizar tabs
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            // Actualizar contenido
            contents.forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`tab-${targetTab}`).classList.add('active');
            syncFiltersPanelHeight();
        });
    });
}

// === PRESETS DE FECHA ===
function initializeDatePresets() {
    const presetBtns = document.querySelectorAll('.date-preset-btn');
    const dateFrom = document.getElementById('filterDateFrom');
    const dateTo = document.getElementById('filterDateTo');

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            const today = new Date();
            let fromDate = new Date();

            // Remover active de todos
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            switch(preset) {
                case 'month':
                    fromDate.setMonth(today.getMonth() - 1);
                    break;
                case 'quarter':
                    fromDate.setMonth(today.getMonth() - 3);
                    break;
                case 'year':
                    fromDate.setFullYear(today.getFullYear() - 1);
                    break;
                case 'all':
                    fromDate = null;
                    break;
            }

            dateFrom.value = fromDate ? fromDate.toISOString().split('T')[0] : '';
            dateTo.value = today.toISOString().split('T')[0];

            updateActiveFiltersDisplay();
        });
    });
}

// === CONTROLES DE TABLA ===
function initializeTableControls() {
    // Búsqueda en tabla
    const searchInput = document.getElementById('tableSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            filterTableBySearch(searchInput.value);
        }, 300));
    }

    // Ordenamiento por columnas
    const headers = document.querySelectorAll('.data-table th[data-sort]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            handleSort(column, header);
        });
    });

    // Paginación
    document.getElementById('prevPageBtn')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTablePage();
        }
    });

    document.getElementById('nextPageBtn')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredCohort.length / PAGE_SIZE);
        if (currentPage < totalPages) {
            currentPage++;
            renderTablePage();
        }
    });
}

// === EVENT LISTENERS ===
function addEventListeners() {
    // Limpiar filtros
    document.getElementById('clearFiltersBtn').addEventListener('click', clearAllFilters);
    document.getElementById('clearAllFiltersBtn')?.addEventListener('click', clearAllFilters);

    // Exportar CSV
    document.getElementById('exportCohortBtn').addEventListener('click', () => {
        if (HubTools && HubTools.exportCohortToCSV) {
            HubTools.exportCohortToCSV(currentCohort);
        } else {
            console.error('HubTools.exportCohortToCSV not found');
        }
    });

    bindAutoApplyFilters();

    // Sliders EVA
    const evaDolorSlider = document.getElementById('filterEVADolor');
    const evaDolorValue = document.getElementById('evaDolorValue');
    evaDolorSlider?.addEventListener('input', () => {
        evaDolorValue.textContent = evaDolorSlider.value;
        debouncedApplyFilters();
    });
    evaDolorSlider?.addEventListener('change', applyFiltersAndRefresh);

    const evaGlobalSlider = document.getElementById('filterEVAGlobal');
    const evaGlobalValue = document.getElementById('evaGlobalValue');
    evaGlobalSlider?.addEventListener('input', () => {
        evaGlobalValue.textContent = evaGlobalSlider.value;
        debouncedApplyFilters();
    });
    evaGlobalSlider?.addEventListener('change', applyFiltersAndRefresh);

    // Selectores de correlación
    document.getElementById('scatterX')?.addEventListener('change', updateDashboard);
    document.getElementById('scatterY')?.addEventListener('change', updateDashboard);
}

// === INICIALIZAR FILTROS ===
function initializeFilters() {
    // Poblar selectores de correlación
    const scatterX = document.getElementById('scatterX');
    const scatterY = document.getElementById('scatterY');
    const options = ['BASDAI', 'ASDAS', 'HAQ', 'PCR', 'VSG', 'EVA Dolor', 'EVA Global'];

    options.forEach((option, index) => {
        const optX = document.createElement('option');
        optX.value = option;
        optX.textContent = option;
        scatterX?.appendChild(optX);

        const optY = document.createElement('option');
        optY.value = option;
        optY.textContent = option;
        if (index === 1) optY.selected = true; // ASDAS por defecto en Y
        scatterY?.appendChild(optY);
    });

    poblarFiltroFarmacos();
}

function bindAutoApplyFilters() {
    const filterInputs = document.querySelectorAll('.filters-panel input, .filters-panel select');
    filterInputs.forEach(input => {
        if (input.type === 'range') {
            return;
        }

        const handler = () => {
            if (input.id === 'filterPathology') {
                syncActivityIndexForPathology();
            }
            applyFiltersAndRefresh();
        };

        if (input.tagName === 'SELECT' || input.type === 'checkbox' || input.type === 'date') {
            input.addEventListener('change', handler);
            return;
        }

        input.addEventListener('input', debouncedApplyFilters);
        input.addEventListener('change', handler);
    });
}

function syncActivityIndexForPathology() {
    const pathology = document.getElementById('filterPathology')?.value || '';
    const activityIndex = document.getElementById('filterActivityIndex');
    if (!activityIndex) return;

    const current = activityIndex.value;
    if (pathology === 'APS' && current === 'BASDAI') {
        activityIndex.value = 'HAQ';
    }
    if (pathology === 'ESPA' && current === 'HAQ') {
        activityIndex.value = 'BASDAI';
    }
}

function poblarFiltroFarmacos() {
    const select = document.getElementById('filterTtoSpecific');
    if (!select) return;
    if (select.options.length > 1) return;

    try {
        const farmacosData = HubTools?.data?.getFarmsDataFromState?.() || {};

        const categories = ['Tratamientos_Sistemicos', 'FAMEs', 'Biologicos'];
        categories.forEach(category => {
            if (farmacosData[category]) {
                farmacosData[category].forEach(farmaco => {
                    if (farmaco) {
                        const opt = document.createElement('option');
                        opt.value = farmaco;
                        opt.textContent = farmaco;
                        select.appendChild(opt);
                    }
                });
            }
        });
    } catch (e) {
        console.warn('No se pudieron cargar los fármacos:', e);
    }
}

// === GESTIÓN DE FILTROS ACTIVOS ===
function getActiveFilters() {
    const filters = {
        dateFrom: document.getElementById('filterDateFrom')?.value,
        dateTo: document.getElementById('filterDateTo')?.value,
        pathology: document.getElementById('filterPathology')?.value,
        sex: document.getElementById('filterSex')?.value,
        ageFrom: document.getElementById('filterAgeFrom')?.value,
        ageTo: document.getElementById('filterAgeTo')?.value,
        biomarker: document.getElementById('filterBiomarker')?.value,
        activityIndex: document.getElementById('filterActivityIndex')?.value,
        activityState: document.getElementById('filterActivityState')?.value,
        evaDolor: document.getElementById('filterEVADolor')?.value,
        evaGlobal: document.getElementById('filterEVAGlobal')?.value,
        ttoType: document.getElementById('filterTtoType')?.value,
        ttoSpecific: document.getElementById('filterTtoSpecific')?.value,
        comorbidity: document.getElementById('filterComorbidity')?.value,
        extraArticular: document.getElementById('filterExtraArticular')?.value,
        adverseEffect: document.getElementById('filterAdverseEffect')?.checked,
        scatterX: document.getElementById('scatterX')?.value || 'BASDAI',
        scatterY: document.getElementById('scatterY')?.value || 'ASDAS'
    };

    return filters;
}

function updateActiveFiltersDisplay() {
    const filters = getActiveFilters();
    const activeFiltersBar = document.getElementById('activeFiltersBar');
    const chipsContainer = document.getElementById('activeFiltersChips');
    const countBadge = document.getElementById('filtersCountBadge');

    if (!chipsContainer) return;

    chipsContainer.innerHTML = '';
    let activeCount = 0;
    const tabCounts = { periodo: 0, demograficos: 0, clinicos: 0, terapeuticos: 0, historicos: 0 };

    const filterLabels = {
        dateFrom: { label: 'Desde', tab: 'periodo' },
        dateTo: { label: 'Hasta', tab: 'periodo' },
        pathology: { label: 'Patología', tab: 'demograficos', default: 'Todos' },
        sex: { label: 'Sexo', tab: 'demograficos', default: 'Todos' },
        ageFrom: { label: 'Edad desde', tab: 'demograficos' },
        ageTo: { label: 'Edad hasta', tab: 'demograficos' },
        biomarker: { label: 'Biomarcador', tab: 'clinicos', default: 'Todos' },
        activityState: { label: 'Estado', tab: 'clinicos', default: 'Todos' },
        ttoType: { label: 'Tipo Tto', tab: 'terapeuticos', default: 'Todos' },
        ttoSpecific: { label: 'Fármaco', tab: 'terapeuticos', default: 'Todos' },
        comorbidity: { label: 'Comorbilidad', tab: 'historicos', default: 'Todos' },
        extraArticular: { label: 'Extra-articular', tab: 'historicos', default: 'Todos' },
        adverseEffect: { label: 'Efecto adverso', tab: 'historicos' }
    };

    Object.entries(filterLabels).forEach(([key, config]) => {
        const value = filters[key];
        const isActive = value && value !== config.default && value !== '' && value !== false;

        if (isActive) {
            activeCount++;
            tabCounts[config.tab]++;

            const chip = document.createElement('span');
            chip.className = 'filter-chip';
            chip.innerHTML = `
                <span class="filter-chip-label">${config.label}:</span>
                <span class="filter-chip-value">${key === 'adverseEffect' ? 'Sí' : value}</span>
                <button class="filter-chip-remove" data-filter="${key}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            chipsContainer.appendChild(chip);

            // Event para remover chip
            chip.querySelector('.filter-chip-remove').addEventListener('click', () => {
                removeFilter(key);
            });
        }
    });

    // Actualizar badges de tabs
    Object.entries(tabCounts).forEach(([tab, count]) => {
        const badge = document.getElementById(`badge-${tab}`);
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    });

    // Mostrar/ocultar barra de filtros activos
    if (activeFiltersBar) {
        activeFiltersBar.style.display = activeCount > 0 ? 'flex' : 'none';
    }

    // Actualizar badge del header
    if (countBadge) {
        countBadge.textContent = activeCount;
        countBadge.style.display = activeCount > 0 ? 'inline-flex' : 'none';
    }

    syncFiltersPanelHeight();
}

function removeFilter(filterKey) {
    const element = document.getElementById(`filter${filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}`);
    if (!element) return;

    if (element.type === 'checkbox') {
        element.checked = false;
    } else if (element.tagName === 'SELECT') {
        element.selectedIndex = 0;
    } else {
        element.value = '';
    }

    updateActiveFiltersDisplay();
    updateDashboard();
}

function clearAllFilters() {
    // Limpiar todos los campos
    const inputs = document.querySelectorAll('.filters-panel input, .filters-panel select');
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else if (input.tagName === 'SELECT') {
            input.selectedIndex = 0;
        } else if (input.type === 'range') {
            input.value = input.max;
            const rangeTargets = {
                filterEVADolor: 'evaDolorValue',
                filterEVAGlobal: 'evaGlobalValue'
            };
            const valueSpanId = rangeTargets[input.id];
            const valueSpan = valueSpanId ? document.getElementById(valueSpanId) : null;
            if (valueSpan) valueSpan.textContent = input.max;
        } else {
            input.value = '';
        }
    });

    // Limpiar presets activos
    document.querySelectorAll('.date-preset-btn').forEach(btn => btn.classList.remove('active'));

    updateActiveFiltersDisplay();
    updateDashboard();
}

// === ACTUALIZAR DASHBOARD ===
function updateDashboard() {
    console.log('📊 Actualizando dashboard...');
    const filters = getActiveFilters();

    if (HubTools?.data?.getPoblationalData) {
        const data = HubTools.data.getPoblationalData(filters);

        currentCohort = data.filteredCohort || [];
        filteredCohort = [...currentCohort];
        currentPage = 1;

        updateKPIs(data.kpis);
        renderCharts(data.chartData);
        renderTablePage();

        console.log('✅ Dashboard actualizado:', currentCohort.length, 'pacientes');
    } else {
        console.error('❌ HubTools.data.getPoblationalData no disponible');
    }
}

// === ACTUALIZAR KPIs ===
function updateKPIs(kpis) {
    if (!kpis) return;

    console.log('📊 Actualizando KPIs:', kpis);

    document.getElementById('kpiTotalPatients').textContent = kpis.totalPatients || 0;
    document.getElementById('kpiRemissionPercent').textContent = (kpis.remissionPercent || 0).toFixed(1) + '%';
    document.getElementById('kpiHighActivityPercent').textContent = (kpis.highActivityPercent || 0).toFixed(1) + '%';
    document.getElementById('kpiBiologicPercent').textContent = (kpis.biologicPercent || 0).toFixed(1) + '%';

    // Mostrar métrica de actividad con etiqueta correcta (BASDAI o HAQ)
    const avgActivityEl = document.getElementById('kpiAvgActivity') || document.getElementById('kpiAvgBasdai');
    if (avgActivityEl) {
        const avgValue = kpis.avgActivity || kpis.avgBasdai || 0;
        avgActivityEl.textContent = parseFloat(avgValue).toFixed(1);
    }

    // Actualizar etiqueta del KPI según patología (id en HTML es kpiActivityLabel)
    const activityLabel = kpis.activityLabel || 'BASDAI';
    const avgActivityLabelEl = document.getElementById('kpiActivityLabel');
    if (avgActivityLabelEl) {
        avgActivityLabelEl.textContent = `${activityLabel} Medio`;
    }

    // Mostrar métricas adicionales si existen
    if (kpis.metrics) {
        updateMetricsDisplay(kpis.metrics, kpis.activityLabel);
    }
}

// Función auxiliar para mostrar métricas adicionales por patología
function updateMetricsDisplay(metrics, pathologyType) {
    const metricsContainer = document.getElementById('additionalMetrics');
    if (!metricsContainer) return;

    metricsContainer.innerHTML = '';

    // Definir qué métricas mostrar según patología
    let metricsToShow = [];
    if (pathologyType === 'BASDAI') {
        // ESPA: BASDAI, ASDAS, EVA Dolor, EVA Global, PCR, VSG
        metricsToShow = [
            { key: 'BASDAI', label: 'BASDAI', unit: '' },
            { key: 'ASDAS', label: 'ASDAS', unit: '' },
            { key: 'EVA_Dolor', label: 'EVA Dolor', unit: '' },
            { key: 'EVA_Global', label: 'EVA Global', unit: '' },
            { key: 'PCR', label: 'PCR', unit: ' mg/L' },
            { key: 'VSG', label: 'VSG', unit: ' mm/h' }
        ];
    } else if (pathologyType === 'HAQ') {
        // APS: HAQ, ASDAS, RAPID3, EVA Dolor, EVA Global, PASI, LEI, PCR, VSG
        metricsToShow = [
            { key: 'HAQ', label: 'HAQ', unit: '' },
            { key: 'ASDAS', label: 'ASDAS', unit: '' },
            { key: 'RAPID3', label: 'RAPID3', unit: '' },
            { key: 'EVA_Dolor', label: 'EVA Dolor', unit: '' },
            { key: 'PASI', label: 'PASI', unit: '' },
            { key: 'LEI', label: 'LEI', unit: '' }
        ];
    } else {
        // Mixto: mostrar las principales
        metricsToShow = [
            { key: 'BASDAI', label: 'BASDAI', unit: '' },
            { key: 'HAQ', label: 'HAQ', unit: '' },
            { key: 'ASDAS', label: 'ASDAS', unit: '' },
            { key: 'EVA_Dolor', label: 'EVA Dolor', unit: '' }
        ];
    }

    metricsToShow.forEach(metric => {
        const value = metrics[metric.key];
        if (value !== null && value !== undefined) {
            const metricEl = document.createElement('div');
            metricEl.className = 'metric-item';
            metricEl.innerHTML = `
                <span class="metric-label">${metric.label}:</span>
                <span class="metric-value">${parseFloat(value).toFixed(1)}${metric.unit}</span>
            `;
            metricsContainer.appendChild(metricEl);
        }
    });
}

// === RENDERIZAR GRÁFICOS ===
function renderCharts(chartData) {
    console.log('📊 renderCharts llamado con:', chartData);

    if (!chartData) {
        console.warn('⚠️ chartData es null/undefined');
        return;
    }

    console.log('📊 Activity data:', chartData.activity);
    console.log('📊 Treatment data:', chartData.treatment);

    renderActivityDonutChart('activityDonutChart', chartData.activity);
    renderTreatmentBarChart('treatmentDistChart', chartData.treatment);
    renderComorbidityBarChart('comorbidityChart', chartData.comorbidity);
    renderCorrelationScatterChart('correlationScatterChart', chartData.correlation);
}

function renderActivityDonutChart(canvasId, data) {
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    // Usar colores semánticos
    const colors = [COLORS.remission, COLORS.lowActivity, COLORS.moderate, COLORS.highActivity];

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data?.labels || ['Remisión', 'Baja', 'Moderada', 'Alta'],
            datasets: [{
                data: data?.datasets?.[0]?.data || [35, 25, 20, 20],
                backgroundColor: colors,
                borderColor: '#ffffff',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderTreatmentBarChart(canvasId, data) {
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    const colors = data?.datasets?.[0]?.backgroundColor || [COLORS.biologic, COLORS.fame, COLORS.systemic, COLORS.other];

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data?.labels || ['Biológicos', 'FAMEs', 'Sistémicos', 'Otros'],
            datasets: [{
                label: 'Pacientes',
                data: data?.datasets?.[0]?.data || [60, 30, 20, 10],
                backgroundColor: colors,
                borderColor: colors.map(c => c),
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: '#F1F5F9' }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderComorbidityBarChart(canvasId, data) {
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    // Gradiente de color para las barras
    const dataLength = data?.labels?.length || 4;
    const colors = Array(dataLength).fill(COLORS.primary).map((c, i) => {
        const opacity = 1 - (i * 0.1);
        return `rgba(37, 99, 235, ${Math.max(0.4, opacity)})`;
    });

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data?.labels || ['HTA', 'DLP', 'DM', 'Obesidad'],
            datasets: [{
                label: 'Pacientes',
                data: data?.datasets?.[0]?.data || [40, 35, 28, 22],
                backgroundColor: colors,
                borderColor: COLORS.primary,
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: '#F1F5F9' }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderCorrelationScatterChart(canvasId, chartConfig) {
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    const scatterX = document.getElementById('scatterX')?.value || 'BASDAI';
    const scatterY = document.getElementById('scatterY')?.value || 'ASDAS';

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: `${scatterX} vs ${scatterY}`,
                data: chartConfig?.datasets?.[0]?.data || generateMockScatterData(),
                backgroundColor: 'rgba(37, 99, 235, 0.6)',
                borderColor: COLORS.primary,
                borderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            scales: {
                x: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                        display: true,
                        text: scatterX,
                        font: { weight: 'bold' }
                    },
                    grid: { color: '#F1F5F9' }
                },
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                        display: true,
                        text: scatterY,
                        font: { weight: 'bold' }
                    },
                    grid: { color: '#F1F5F9' }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${scatterX}: ${context.parsed.x.toFixed(1)}, ${scatterY}: ${context.parsed.y.toFixed(1)}`;
                        }
                    }
                }
            }
        }
    });
}

function generateMockScatterData() {
    const data = [];
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * 8 + 1;
        const y = x * 0.7 + (Math.random() - 0.5) * 3;
        data.push({ x: Math.min(10, Math.max(0, x)), y: Math.min(10, Math.max(0, y)) });
    }
    return data;
}

// === TABLA CON PAGINACIÓN, ORDENAMIENTO Y BÚSQUEDA ===
function renderTablePage() {
    const tbody = document.getElementById('cohortTableBody');
    if (!tbody) return;

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageData = filteredCohort.slice(start, end);

    tbody.innerHTML = '';

    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state" style="text-align: center; padding: 40px;">
                    <i class="fas fa-search" style="font-size: 2rem; color: #94A3B8; margin-bottom: 10px; display: block;"></i>
                    <span style="color: #64748B;">No se encontraron pacientes con los filtros seleccionados</span>
                </td>
            </tr>
        `;
    } else {
        pageData.forEach(patient => {
            // Usar nombres EXACTOS del Excel con fallback a campos normalizados
            const id = patient.ID_Paciente || patient._id || '-';
            const nombre = patient.Nombre_Paciente || patient._nombre || '-';
            const pathology = patient.pathology || '-';
            const fecha = patient.Fecha_Visita || patient._fecha || '';
            const tratamiento = patient.Tratamiento_Actual || patient._tratamiento || 'Sin tratamiento';

            // Mostrar métrica según patología
            let metricValue = 'N/A';
            let metricLabel = 'BASDAI';
            if (pathology === 'ESPA') {
                const basdai = parseFloat(patient.BASDAI_Result);
                metricValue = !isNaN(basdai) ? basdai.toFixed(1) : 'N/A';
                metricLabel = 'BASDAI';
            } else if (pathology === 'APS') {
                const haq = parseFloat(patient.HAQ_Total);
                metricValue = !isNaN(haq) ? haq.toFixed(2) : 'N/A';
                metricLabel = 'HAQ';
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${id}</strong></td>
                <td>${nombre}</td>
                <td><span class="pathology-badge pathology-${pathology.toLowerCase()}">${pathology}</span></td>
                <td>${formatDate(fecha)}</td>
                <td title="${metricLabel}">${metricValue}</td>
                <td>${tratamiento}</td>
            `;
            tbody.appendChild(row);
        });
    }

    updatePaginationInfo();
}

function updatePaginationInfo() {
    const total = filteredCohort.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const start = total > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
    const end = Math.min(currentPage * PAGE_SIZE, total);

    document.getElementById('paginationInfo').textContent =
        `Mostrando ${start}-${end} de ${total} pacientes`;

    // Actualizar botones
    document.getElementById('prevPageBtn').disabled = currentPage <= 1;
    document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;

    // Generar números de página
    const pageNumbersContainer = document.getElementById('pageNumbers');
    if (pageNumbersContainer) {
        pageNumbersContainer.innerHTML = '';

        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('button');
            btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.addEventListener('click', () => {
                currentPage = i;
                renderTablePage();
            });
            pageNumbersContainer.appendChild(btn);
        }
    }
}

function handleSort(column, header) {
    // Actualizar dirección
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }

    // Actualizar iconos
    document.querySelectorAll('.data-table th i').forEach(icon => {
        icon.className = 'fas fa-sort';
    });
    header.querySelector('i').className = `fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`;

    // Ordenar datos
    filteredCohort.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        // Manejar valores nulos
        if (valA == null) return 1;
        if (valB == null) return -1;

        // Comparar según tipo
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB?.toLowerCase() || '';
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    currentPage = 1;
    renderTablePage();
}

function filterTableBySearch(searchTerm) {
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
        filteredCohort = [...currentCohort];
    } else {
        filteredCohort = currentCohort.filter(patient => {
            // Usar nombres EXACTOS del Excel con fallbacks
            const id = (patient.ID_Paciente || patient._id || '').toLowerCase();
            const nombre = (patient.Nombre_Paciente || patient._nombre || '').toLowerCase();
            const pathology = (patient.pathology || '').toLowerCase();
            const tratamiento = (patient.Tratamiento_Actual || patient._tratamiento || '').toLowerCase();

            return (
                id.includes(term) ||
                nombre.includes(term) ||
                pathology.includes(term) ||
                tratamiento.includes(term)
            );
        });
    }

    currentPage = 1;
    renderTablePage();
}

// === UTILIDADES ===
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return dateString;
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function syncFiltersPanelHeight() {
    const header = document.getElementById('filtersHeader');
    const content = document.querySelector('.filters-panel .collapsible-content');
    if (!header || !content) return;
    if (!header.classList.contains('active')) return;

    requestAnimationFrame(() => {
        content.style.maxHeight = `${content.scrollHeight}px`;
    });
}

function bindFiltersPanelResize() {
    const header = document.getElementById('filtersHeader');
    if (header) {
        header.addEventListener('click', () => {
            setTimeout(syncFiltersPanelHeight, 60);
        });
    }

    window.addEventListener('resize', debounce(syncFiltersPanelHeight, 150));
}
