// modules/mockDashboardData.js

// Flag de configuración: desactivar para producción
const ENABLE_MOCK_DASHBOARD_DATA = false;

function getMockPoblationalData(filters) {
    if (!ENABLE_MOCK_DASHBOARD_DATA) {
        console.warn('⚠️ MockDashboardData desactivado - usando solo datos de base de datos real');
        return {
            kpis: null,
            chartData: null,
            filteredCohort: []
        };
    }

    console.log("Generating mock dashboard data with filters:", filters);

    // --- Mock KPI Data ---
    const mockKpis = {
        totalPatients: 150,
        remissionPercent: 35.5,
        highActivityPercent: 18.2,
        biologicPercent: 60.0,
        avgBasdai: 3.8
    };

    // Generar datos de correlación dinámicos basados en los selectores
    const scatterX = filters.scatterX || 'BASDAI';
    const scatterY = filters.scatterY || 'EVA Dolor';

    // Generar 20 puntos aleatorios con correlación positiva
    const correlationData = [];
    for (let i = 0; i < 20; i++) {
        const baseX = Math.random() * 8 + 1; // Valores entre 1 y 9
        const noise = (Math.random() - 0.5) * 2; // Ruido de ±1
        const baseY = baseX * 0.8 + noise; // Correlación positiva con ruido
        correlationData.push({
            x: Math.max(0, Math.min(10, baseX)),
            y: Math.max(0, Math.min(10, baseY))
        });
    }

    // --- Mock Chart Data ---
    const mockChartData = {
        activity: {
            labels: ['Remisión', 'Baja Actividad', 'Actividad Moderada', 'Alta Actividad'],
            datasets: [{
                data: [35, 25, 20, 20], // Percentages
                backgroundColor: ['#4CAF50', '#FFEB3B', '#FF9800', '#F44336'],
                hoverOffset: 4
            }]
        },
        treatment: {
            labels: ['AINEs', 'FAMEs', 'Biológicos', 'Otros'],
            datasets: [{
                label: 'Pacientes por Tratamiento',
                data: [20, 30, 60, 10],
                backgroundColor: ['#03A9F4', '#8BC34A', '#9C27B0', '#FFC107'],
                borderColor: ['#03A9F4', '#8BC34A', '#9C27B0', '#FFC107'],
                borderWidth: 1
            }]
        },
        comorbidity: {
            labels: ['HTA', 'Diabetes', 'Dislipidemia', 'Osteoporosis'],
            datasets: [{
                label: 'Prevalencia de Comorbilidades',
                data: [40, 25, 30, 15],
                backgroundColor: ['#FF5722', '#673AB7', '#00BCD4', '#E91E63'],
                borderColor: ['#FF5722', '#673AB7', '#00BCD4', '#E91E63'],
                borderWidth: 1
            }]
        },
        correlation: {
            datasets: [{
                label: `${scatterX} vs ${scatterY}`,
                data: correlationData,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }],
            options: {
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: scatterX
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: scatterY
                        }
                    }
                }
            }
        }
    };

    // --- Mock Filtered Cohort Data (for the table) ---
    const mockFilteredCohort = [
        { ID_Paciente: 'ESP-2023-001', Nombre: 'Elena Torres', pathology: 'ESPA', Fecha_Visita: '2023-07-10', BASDAI: 3.2, Tratamiento_Actual: 'Secukinumab' },
        { ID_Paciente: 'APS-2023-001', Nombre: 'Carlos Ruiz', pathology: 'APS', Fecha_Visita: '2023-08-15', BASDAI: 'N/A', Tratamiento_Actual: 'Adalimumab' },
        { ID_Paciente: 'ESP-2024-007', Nombre: 'Miguel A. F.', pathology: 'ESPA', Fecha_Visita: '2025-03-25', BASDAI: 2.5, Tratamiento_Actual: 'Adalimumab' },
        { ID_Paciente: 'ESP-2024-009', Nombre: 'Sofía Delgado', pathology: 'ESPA', Fecha_Visita: '2024-09-30', BASDAI: 3.4, Tratamiento_Actual: 'Ixekizumab' },
        { ID_Paciente: 'ESP-2024-010', Nombre: 'Andrés Molina', pathology: 'ESPA', Fecha_Visita: '2024-11-12', BASDAI: 2.5, Tratamiento_Actual: 'Certolizumab' },
    ];

    return {
        filteredCohort: mockFilteredCohort,
        kpis: mockKpis,
        chartData: mockChartData
    };
}

// Expose to HubTools.data if HubTools is defined
if (typeof HubTools !== 'undefined' && HubTools.data) {
    HubTools.data.getMockPoblationalData = getMockPoblationalData;
    console.log('✅ Módulo mockDashboardData cargado y expuesto a HubTools.data');
} else {
    console.error('❌ Error: HubTools.data namespace no encontrado. Asegúrate de cargar hubTools.js y dataManager.js primero.');
}

// Expose globally for backward compatibility
if (typeof window !== 'undefined') {
    window.getMockPoblationalData = getMockPoblationalData;
}