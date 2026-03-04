/**
 * Hub Clínico Reumatológico - Namespace Global
 *
 * Este archivo define el namespace principal que contiene todos los módulos
 * de la aplicación en formato clásico (sin import/export) para compatibilidad
 * con file:// protocol.
 *
 * IMPORTANTE: Este archivo debe cargarse PRIMERO antes que cualquier otro módulo.
 */

// Definir namespace global
window.HubTools = {
    // Utilidades generales
    utils: {},

    // Calculadoras de scores clínicos
    scores: {},

    // Homúnculo interactivo
    homunculus: {},

    // Gestión de datos y base de datos
    data: {},

    // Gestión de exportaciones
    export: {},

    // Control de formularios
    form: {},

    // Dashboard y visualización de pacientes
    dashboard: {
        // Umbrales de interpretación clínica para índices de actividad
        activityCutoffs: {
            // EspA - Espondilitis Anquilosante
            basdai: {
                remission: 4,        // < 4 = baja actividad
                moderate: 6,         // 4-6 = actividad moderada
                high: 10,            // > 6 = actividad alta
                label: 'BASDAI'
            },
            asdas: {
                remission: 1.3,      // < 1.3 = remisión clínica
                lowActivity: 2.1,    // 1.3-2.1 = baja actividad
                moderate: 3.5,       // 2.1-3.5 = actividad moderada
                high: 3.5,           // > 3.5 = actividad alta
                label: 'ASDAS-CRP'
            },
            basfi: {
                good: 4,             // < 4 = buena funcionalidad
                moderate: 6,         // 4-6 = funcionalidad moderada
                poor: 10,            // > 6 = funcionalidad limitada
                label: 'BASFI'
            },

            // APs - Artritis Psoriásica
            haq: {
                remission: 0.5,      // < 0.5 = remisión
                mild: 1.5,           // 0.5-1.5 = actividad leve
                moderate: 2,         // 1.5-2 = actividad moderada
                severe: 3,           // > 2 = actividad severa
                label: 'HAQ'
            },
            lei: {
                remission: 5,        // < 5 = remisión
                mild: 10,            // 5-10 = actividad leve
                moderate: 15,        // 10-15 = actividad moderada
                high: 44,            // > 15 = actividad alta
                label: 'LEI'
            },
            rapid3: {
                remission: 3,        // < 3 = remisión
                lowActivity: 6,      // 3-6 = baja actividad
                moderate: 12,        // 6-12 = actividad moderada
                high: 12,            // > 12 = actividad alta
                label: 'RAPID3'
            },

            // AR - Artritis Reumatoide
            das28: {
                remission: 2.6,      // < 2.6 = remisión
                lowActivity: 3.2,    // 2.6-3.2 = baja actividad
                moderate: 5.1,       // 3.2-5.1 = actividad moderada
                high: 5.1,           // > 5.1 = actividad alta
                label: 'DAS28'
            },
            cdai: {
                remission: 2.8,      // ≤ 2.8 = remisión
                lowActivity: 10,     // 2.8-10 = baja actividad
                moderate: 22,        // 10-22 = actividad moderada
                high: 22,            // > 22 = actividad alta
                label: 'CDAI'
            },
            sdai: {
                remission: 3.3,      // ≤ 3.3 = remisión
                lowActivity: 11,     // 3.3-11 = baja actividad
                moderate: 26,        // 11-26 = actividad moderada
                high: 26,            // > 26 = actividad alta
                label: 'SDAI'
            },

            // Escala Visual Analógica (todas las patologías)
            evaGlobal: {
                remission: 2,        // < 2 = sin síntomas
                mild: 4,             // 2-4 = leve
                moderate: 6,         // 4-6 = moderado
                severe: 10,          // > 6 = severo
                label: 'EVA Global'
            },
            evaDolor: {
                remission: 1,        // < 1 = sin dolor
                mild: 3,             // 1-3 = leve
                moderate: 6,         // 3-6 = moderado
                severe: 10,          // > 6 = severo
                label: 'EVA Dolor'
            }
        }
    }
};

console.log('✅ HubTools namespace inicializado');
