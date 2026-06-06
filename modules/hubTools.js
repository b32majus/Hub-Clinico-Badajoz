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

    // Normalización canónica de campos
    normalizer: {},

    // Gestión de exportaciones
    export: {},

    // Control de formularios
    form: {},

    // Módulo prebiológico (v2)
    prebiologic: {},

    // Solicitudes a Farmacia Hospitalaria (v2)
    pharmacy: {},

    // Eventos terapéuticos y clínicos (v2)
    events: {},

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
            dapsa: {
                remission: 4,
                lowActivity: 14,
                moderate: 28,
                high: 28,
                label: 'DAPSA'
            },
            haq: {
                remission: 0.5,      // < 0.5 = remisión
                mild: 1.5,           // 0.5-1.5 = actividad leve
                moderate: 2,         // 1.5-2 = actividad moderada
                severe: 3,           // > 2 = actividad severa
                label: 'HAQ'
            },
            lei: {
                remission: 1,        // <= 1 = sin/mínima entesitis
                mild: 3,             // <= 3 = entesitis leve
                moderate: 5,         // <= 5 = entesitis moderada
                high: 6,             // > 5 = entesitis alta
                label: 'LEI'
            },
            pasi: {
                remission: 1,
                lowActivity: 3,
                moderate: 10,
                high: 10,
                label: 'PASI'
            },
            bsa: {
                remission: 3,
                moderate: 10,
                high: 10,
                label: 'BSA'
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

            // LES - Lupus Eritematoso Sistémico
            sledai2k: {
                remission: 2,
                lowActivity: 6,
                moderate: 12,
                high: 12,
                label: 'SLEDAI-2K'
            },

            // Síndrome de Sjögren
            essdai: {
                remission: 5,
                moderate: 14,
                high: 14,
                label: 'ESSDAI'
            },
            esspri: {
                remission: 3,
                lowActivity: 5,
                moderate: 7,
                high: 7,
                label: 'ESSPRI'
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
