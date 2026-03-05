/**
 * Hub ClÃ­nico ReumatolÃ³gico - Namespace Global
 *
 * Este archivo define el namespace principal que contiene todos los mÃ³dulos
 * de la aplicaciÃ³n en formato clÃ¡sico (sin import/export) para compatibilidad
 * con file:// protocol.
 *
 * IMPORTANTE: Este archivo debe cargarse PRIMERO antes que cualquier otro mÃ³dulo.
 */

// Definir namespace global
window.HubTools = {
    // Utilidades generales
    utils: {},

    // Calculadoras de scores clÃ­nicos
    scores: {},

    // HomÃºnculo interactivo
    homunculus: {},

    // GestiÃ³n de datos y base de datos
    data: {},

    // NormalizaciÃ³n canÃ³nica de campos
    normalizer: {},

    // GestiÃ³n de exportaciones
    export: {},

    // Control de formularios
    form: {},

    // Dashboard y visualizaciÃ³n de pacientes
    dashboard: {
        // Umbrales de interpretaciÃ³n clÃ­nica para Ã­ndices de actividad
        activityCutoffs: {
            // EspA - Espondilitis Anquilosante
            basdai: {
                remission: 4,        // < 4 = baja actividad
                moderate: 6,         // 4-6 = actividad moderada
                high: 10,            // > 6 = actividad alta
                label: 'BASDAI'
            },
            asdas: {
                remission: 1.3,      // < 1.3 = remisiÃ³n clÃ­nica
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

            // APs - Artritis PsoriÃ¡sica
            haq: {
                remission: 0.5,      // < 0.5 = remisiÃ³n
                mild: 1.5,           // 0.5-1.5 = actividad leve
                moderate: 2,         // 1.5-2 = actividad moderada
                severe: 3,           // > 2 = actividad severa
                label: 'HAQ'
            },
            lei: {
                remission: 5,        // < 5 = remisiÃ³n
                mild: 10,            // 5-10 = actividad leve
                moderate: 15,        // 10-15 = actividad moderada
                high: 44,            // > 15 = actividad alta
                label: 'LEI'
            },
            rapid3: {
                remission: 3,        // < 3 = remisiÃ³n
                lowActivity: 6,      // 3-6 = baja actividad
                moderate: 12,        // 6-12 = actividad moderada
                high: 12,            // > 12 = actividad alta
                label: 'RAPID3'
            },

            // AR - Artritis Reumatoide
            das28: {
                remission: 2.6,      // < 2.6 = remisiÃ³n
                lowActivity: 3.2,    // 2.6-3.2 = baja actividad
                moderate: 5.1,       // 3.2-5.1 = actividad moderada
                high: 5.1,           // > 5.1 = actividad alta
                label: 'DAS28'
            },
            cdai: {
                remission: 2.8,      // â‰¤ 2.8 = remisiÃ³n
                lowActivity: 10,     // 2.8-10 = baja actividad
                moderate: 22,        // 10-22 = actividad moderada
                high: 22,            // > 22 = actividad alta
                label: 'CDAI'
            },
            sdai: {
                remission: 3.3,      // â‰¤ 3.3 = remisiÃ³n
                lowActivity: 11,     // 3.3-11 = baja actividad
                moderate: 26,        // 11-26 = actividad moderada
                high: 26,            // > 26 = actividad alta
                label: 'SDAI'
            },

            // Escala Visual AnalÃ³gica (todas las patologÃ­as)
            evaGlobal: {
                remission: 2,        // < 2 = sin sÃ­ntomas
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

console.log('âœ… HubTools namespace inicializado');
