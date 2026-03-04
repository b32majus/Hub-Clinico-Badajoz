// ============================================
// HUB CLÍNICO REUMATOLÓGICO - UTILIDADES
// ============================================
// Módulo de funciones utilitarias compartidas
//
// FUNCIONES INCLUIDAS:
// ✅ getFormattedDate: Formatea fechas a YYYY-MM-DD
// ✅ calcularIMC: Calcula el índice de masa corporal
// ✅ mostrarNotificacion: Muestra notificaciones temporales
// ✅ formatearFecha: Convierte DD/MM/YYYY a fecha legible
// ✅ calcularEdad: Calcula edad desde fecha de nacimiento
//
// FECHA DE CREACIÓN: Octubre 2024
// DESARROLLADOR: Kilo Code (AI Assistant)
// ACTUALIZACIÓN: Patrón clásico (sin import/export)
// ============================================

// =====================================
// UTILIDADES DE FECHAS
// =====================================

function getFormattedDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha en formato DD/MM/YYYY a un formato legible
 * @param {string} fechaStr - Fecha en formato DD/MM/YYYY o YYYY-MM-DD
 * @returns {string} - Fecha formateada (ej: "15 de septiembre de 2024")
 */
function formatearFecha(fechaStr) {
    if (!fechaStr) return '';

    let date;

    // Detectar formato y convertir a Date
    if (fechaStr.includes('/')) {
        // Formato DD/MM/YYYY
        const [day, month, year] = fechaStr.split('/');
        date = new Date(year, month - 1, day);
    } else if (fechaStr.includes('-')) {
        // Formato YYYY-MM-DD
        date = new Date(fechaStr);
    } else {
        return fechaStr;
    }

    const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const dia = date.getDate();
    const mes = meses[date.getMonth()];
    const año = date.getFullYear();

    return `${dia} de ${mes} de ${año}`;
}

/**
 * Calcula la edad basada en fecha de nacimiento
 * @param {string} fechaNacimiento - Fecha en formato DD/MM/YYYY
 * @returns {number} - Edad en años
 */
function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return null;

    let fechaNac;

    // Detectar formato y convertir a Date
    if (fechaNacimiento.includes('/')) {
        // Formato DD/MM/YYYY
        const [day, month, year] = fechaNacimiento.split('/');
        fechaNac = new Date(year, month - 1, day);
    } else if (fechaNacimiento.includes('-')) {
        // Formato YYYY-MM-DD
        fechaNac = new Date(fechaNacimiento);
    } else {
        return null;
    }

    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();

    // Ajustar si aún no ha cumplido años este año
    const mesActual = hoy.getMonth();
    const mesNacimiento = fechaNac.getMonth();

    if (mesActual < mesNacimiento || (mesActual === mesNacimiento && hoy.getDate() < fechaNac.getDate())) {
        edad--;
    }

    return edad;
}

// =====================================
// UTILIDADES DE CÁLCULOS
// =====================================

function calcularIMC() {
    const pesoInput = document.getElementById('peso');
    const tallaInput = document.getElementById('talla');
    const imcInput = document.getElementById('imc');

    if (!pesoInput || !tallaInput || !imcInput) return;

    const peso = parseFloat(pesoInput.value);
    const tallaCm = parseFloat(tallaInput.value);
    if (!isNaN(peso) && !isNaN(tallaCm) && tallaCm > 0) {
        const tallaM = tallaCm / 100;
        const imc = peso / (tallaM * tallaM);
        imcInput.value = imc.toFixed(2);
    } else {
        imcInput.value = '';
    }
}

// =====================================
// UTILIDADES DE UI
// =====================================

function mostrarNotificacion(mensaje, tipo = 'success') {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#28a745' : tipo === 'error' ? '#dc3545' : '#ffc107'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    notif.innerHTML = `<i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${mensaje}`;
    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// =====================================
// SISTEMA DE LOGGING INTELIGENTE
// =====================================

/**
 * Sistema de logging condicional que permite activar/desactivar logs de debug
 * manteniendo siempre activos los logs de info, warn y error.
 *
 * USO:
 * - logger.debug('Mensaje de debug') - Solo se muestra si DEBUG_MODE = true
 * - logger.info('Mensaje informativo') - Siempre se muestra
 * - logger.warn('Advertencia') - Siempre se muestra
 * - logger.error('Error crítico') - Siempre se muestra
 *
 * ACTIVACIÓN/DESACTIVACIÓN:
 * - Desde consola del navegador: HubTools.utils.setDebugMode(true)
 * - Desde consola del navegador: HubTools.utils.setDebugMode(false)
 * - El estado se guarda en localStorage y persiste entre sesiones
 */

// Leer estado de debug mode desde localStorage
const DEBUG_MODE = localStorage.getItem('hubClinico_debugMode') === 'true';

const logger = {
    /**
     * Log de debug - Solo se muestra si DEBUG_MODE está activado
     * Útil para depuración durante desarrollo
     */
    debug: DEBUG_MODE ? console.log.bind(console, '[DEBUG]') : () => {},

    /**
     * Log informativo - Siempre se muestra
     * Para mensajes importantes de flujo de la aplicación
     */
    info: console.info.bind(console, '[INFO]'),

    /**
     * Log de advertencia - Siempre se muestra
     * Para situaciones anómalas que no son errores críticos
     */
    warn: console.warn.bind(console, '[WARN]'),

    /**
     * Log de error - Siempre se muestra
     * Para errores críticos que afectan la funcionalidad
     */
    error: console.error.bind(console, '[ERROR]')
};

/**
 * Activa o desactiva el modo debug
 * @param {boolean} enabled - true para activar, false para desactivar
 */
function setDebugMode(enabled) {
    localStorage.setItem('hubClinico_debugMode', enabled.toString());
    console.log(`🔧 Modo debug ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}. Recarga la página para aplicar cambios.`);
}

// =====================================
// UTILIDADES DE BIOMARCADORES
// =====================================

/**
 * Obtiene el valor de un biomarcador desde botones toggle activos
 * @param {string} className - Clase del grupo de botones ('hla-btn', 'fr-btn', 'apcc-btn')
 * @param {string} defaultValue - Valor por defecto si no hay selección (default: 'no-analizado')
 * @returns {string} Valor del biomarcador seleccionado
 *
 * @example
 * const hlaB27 = getBiomarkerValue('hla-btn'); // Retorna 'positivo', 'negativo' o 'no-analizado'
 * const fr = getBiomarkerValue('fr-btn', 'pendiente'); // Custom default value
 */
function getBiomarkerValue(className, defaultValue = 'no-analizado') {
    // Buscar botón activo de esta clase, excluyendo otros biomarcadores
    const selector = `.${className}.active:not(.hla-btn):not(.fr-btn):not(.apcc-btn), .${className}.active`;
    const activeBtn = document.querySelector(selector);
    return activeBtn ? activeBtn.dataset.value : defaultValue;
}

/**
 * Establece el valor de un biomarcador activando el botón correspondiente
 * @param {string} className - Clase del grupo de botones
 * @param {string} value - Valor a activar ('positivo', 'negativo', 'no-analizado')
 *
 * @example
 * setBiomarkerValue('hla-btn', 'positivo'); // Activa el botón HLA-B27 positivo
 */
function setBiomarkerValue(className, value) {
    // Desactivar todos los botones de este grupo
    document.querySelectorAll(`.${className}`).forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.value === value) {
            btn.classList.add('active');
        }
    });
}

/**
 * Obtiene los valores de todos los biomarcadores de una vez
 * @param {Object} defaults - Valores por defecto opcionales { hla: '...', fr: '...', apcc: '...' }
 * @returns {Object} { hlaB27, fr, apcc }
 *
 * @example
 * const biomarkers = getAllBiomarkers();
 * // Retorna: { hlaB27: 'positivo', fr: 'negativo', apcc: 'no-analizado' }
 */
function getAllBiomarkers(defaults = {}) {
    return {
        hlaB27: getBiomarkerValue('hla-btn', defaults.hla || 'no-analizado'),
        fr: getBiomarkerValue('fr-btn', defaults.fr || 'no-analizado'),
        apcc: getBiomarkerValue('apcc-btn', defaults.apcc || 'no-analizado')
    };
}

// =====================================
// UTILIDADES DE TOGGLE BUTTONS
// =====================================

/**
 * Obtiene el estado de múltiples toggle buttons de una vez
 * @param {string[]} values - Array de valores data-value a buscar
 * @param {string} prefix - Prefijo opcional para la clase (ej: 'extra-articular-toggle')
 * @returns {Object} Objeto con claves = values, valores = 'SI' | 'NO'
 *
 * @example
 * const comorbilidades = getToggleButtonsState(['hta', 'dm', 'dlp']);
 * // Retorna: { hta: 'SI', dm: 'NO', dlp: 'SI' }
 *
 * @example
 * const extraArticular = getToggleButtonsState(['uveitis', 'psoriasis'], 'extra-articular');
 * // Busca botones con clase .extra-articular-toggle
 */
function getToggleButtonsState(values, prefix = '') {
    const state = {};
    values.forEach(val => {
        const selector = prefix
            ? `.toggle-btn.${prefix}[data-value="${val}"].active`
            : `.toggle-btn[data-value="${val}"].active`;
        state[val] = document.querySelector(selector) ? 'SI' : 'NO';
    });
    return state;
}

/**
 * Establece el estado de múltiples toggle buttons a la vez
 * @param {Object} states - Objeto con { valor: 'SI'|'NO' }
 * @param {string} prefix - Prefijo opcional para la clase
 *
 * @example
 * setToggleButtonsState({ hta: 'SI', dm: 'NO', dlp: 'SI' });
 * // Activa HTA y DLP, desactiva DM
 */
function setToggleButtonsState(states, prefix = '') {
    Object.entries(states).forEach(([val, estado]) => {
        const selector = prefix
            ? `.toggle-btn.${prefix}[data-value="${val}"]`
            : `.toggle-btn[data-value="${val}"]`;
        const btn = document.querySelector(selector);
        if (btn) {
            if (estado === 'SI') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
}

// =====================================
// VALIDACIÓN DE FORMULARIOS
// =====================================

/**
 * Campos requeridos por tipo de formulario
 */
const REQUIRED_FIELDS = {
    primera_visita: ['idPaciente', 'fechaVisita', 'diagnosticoPrimario'],
    seguimiento: ['idPaciente', 'fechaVisita']
};

/**
 * Rangos numéricos válidos para campos
 */
const NUMERIC_RANGES = {
    'evaGlobal': { min: 0, max: 10, label: 'EVA Global' },
    'evaDolor': { min: 0, max: 10, label: 'EVA Dolor' },
    'peso': { min: 20, max: 300, label: 'Peso (kg)' },
    'talla': { min: 100, max: 250, label: 'Talla (cm)' },
    'basdaiP1': { min: 0, max: 10, label: 'BASDAI P1' },
    'basdaiP2': { min: 0, max: 10, label: 'BASDAI P2' },
    'basdaiP3': { min: 0, max: 10, label: 'BASDAI P3' },
    'basdaiP4': { min: 0, max: 10, label: 'BASDAI P4' },
    'basdaiP5': { min: 0, max: 10, label: 'BASDAI P5' },
    'basdaiP6': { min: 0, max: 24, label: 'BASDAI P6 (horas)' },
    'asdasDolorEspalda': { min: 0, max: 10, label: 'ASDAS Dolor Espalda' },
    'asdasDuracionRigidez': { min: 0, max: 120, label: 'ASDAS Duración Rigidez (min)' },
    'asdasEvaGlobal': { min: 0, max: 10, label: 'ASDAS EVA Global' },
    'asdasNAD': { min: 0, max: 100, label: 'NAD' },
    'asdasPCR': { min: 0, max: 500, label: 'PCR (mg/L)' },
    'asdasVSG': { min: 0, max: 200, label: 'VSG (mm/h)' }
};

/**
 * Valida campos requeridos y aplica estilos visuales
 * @param {string} tipoFormulario - 'primera_visita' o 'seguimiento'
 * @returns {string[]} Array de IDs de campos faltantes
 */
function validarCamposRequeridos(tipoFormulario) {
    const requeridos = REQUIRED_FIELDS[tipoFormulario] || [];
    const errores = [];

    requeridos.forEach(id => {
        const elem = document.getElementById(id);
        if (!elem || !elem.value?.trim()) {
            errores.push(id);
            if (elem) {
                elem.style.borderColor = '#dc3545';
                elem.style.borderWidth = '2px';
            }
        } else if (elem) {
            elem.style.borderColor = '';
            elem.style.borderWidth = '';
        }
    });

    return errores;
}

/**
 * Valida rangos numéricos y aplica estilos visuales
 * @returns {string[]} Array de mensajes de error
 */
function validarRangosNumericos() {
    const errores = [];

    Object.entries(NUMERIC_RANGES).forEach(([id, range]) => {
        const elem = document.getElementById(id);
        if (elem && elem.value) {
            const valor = parseFloat(elem.value);
            if (isNaN(valor) || valor < range.min || valor > range.max) {
                errores.push(`${range.label} debe estar entre ${range.min} y ${range.max}`);
                elem.style.borderColor = '#ffc107'; // Amarillo warning
                elem.style.borderWidth = '2px';
            } else {
                elem.style.borderColor = '';
                elem.style.borderWidth = '';
            }
        }
    });

    return errores;
}

/**
 * Limpia estilos de validación de todos los campos
 */
function limpiarEstilosValidacion() {
    // Limpiar campos requeridos
    Object.values(REQUIRED_FIELDS).flat().forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.style.borderColor = '';
            elem.style.borderWidth = '';
        }
    });

    // Limpiar campos numéricos
    Object.keys(NUMERIC_RANGES).forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.style.borderColor = '';
            elem.style.borderWidth = '';
        }
    });
}

// =====================================
// UTILIDADES DEL HOMÚNCULO
// =====================================

/**
 * Crea un mapa de homúnculo a partir de una lista de todas las regiones posibles
 * y las regiones que están marcadas.
 *
 * Esta función es CRÍTICA para el funcionamiento del homúnculo interactivo,
 * que es la "joya de la corona" de esta aplicación.
 *
 * @param {string[]} allRegions - Array de todos los IDs de las regiones posibles.
 * @param {string[]} markedRegionsArray - Array de los IDs de las regiones marcadas.
 * @returns {Object.<string, boolean>} Un objeto donde la clave es el ID de la región
 *                                      y el valor es true si está marcada, false si no.
 *
 * @example
 * const map = createHomunculusMap(
 *     ['hombro-derecho', 'hombro-izquierdo', 'codo-derecho'],
 *     ['hombro-derecho']
 * );
 * // Retorna: { 'hombro-derecho': true, 'hombro-izquierdo': false, 'codo-derecho': false }
 */
function createHomunculusMap(allRegions, markedRegionsArray) {
    const map = {};
    const markedSet = new Set(markedRegionsArray);
    for (const regionId of allRegions) {
        map[regionId] = markedSet.has(regionId);
    }
    return map;
}

// =====================================
// EXPOSICIÓN AL NAMESPACE HUBTOOLS
// =====================================

// Exponer funciones al namespace global HubTools
if (typeof HubTools !== 'undefined') {
    // Utilidades de fechas
    HubTools.utils.getFormattedDate = getFormattedDate;
    HubTools.utils.formatearFecha = formatearFecha;
    HubTools.utils.calcularEdad = calcularEdad;

    // Utilidades de cálculos
    HubTools.utils.calcularIMC = calcularIMC;

    // Utilidades de UI
    HubTools.utils.mostrarNotificacion = mostrarNotificacion;

    // Sistema de logging
    HubTools.utils.logger = logger;
    HubTools.utils.setDebugMode = setDebugMode;

    // Utilidades de biomarcadores
    HubTools.utils.getBiomarkerValue = getBiomarkerValue;
    HubTools.utils.setBiomarkerValue = setBiomarkerValue;
    HubTools.utils.getAllBiomarkers = getAllBiomarkers;

    // Utilidades de toggle buttons
    HubTools.utils.getToggleButtonsState = getToggleButtonsState;
    HubTools.utils.setToggleButtonsState = setToggleButtonsState;

    // Validación de formularios
    HubTools.utils.validarCamposRequeridos = validarCamposRequeridos;
    HubTools.utils.validarRangosNumericos = validarRangosNumericos;
    HubTools.utils.limpiarEstilosValidacion = limpiarEstilosValidacion;
    HubTools.utils.REQUIRED_FIELDS = REQUIRED_FIELDS;
    HubTools.utils.NUMERIC_RANGES = NUMERIC_RANGES;

    // Utilidades del homúnculo
    HubTools.utils.createHomunculusMap = createHomunculusMap;

    console.log('✅ Módulo utils cargado');
} else {
    console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js primero.');
}