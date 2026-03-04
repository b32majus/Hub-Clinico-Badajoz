// Módulo Score Calculators - Para cálculos de puntuaciones médicas
// Este archivo contiene la lógica para calcular diferentes puntuaciones médicas
// ACTUALIZACIÓN: Patrón clásico (sin import/export)

// ============================================
// CÁLCULO BASDAI
// ============================================

function calcularBASDAI(datos) {
    const p1 = parseFloat(datos.basdaiP1) || 0;
    const p2 = parseFloat(datos.basdaiP2) || 0;
    const p3 = parseFloat(datos.basdaiP3) || 0;
    const p4 = parseFloat(datos.basdaiP4) || 0;
    const p5 = parseFloat(datos.basdaiP5) || 0;
    const p6 = parseFloat(datos.basdaiP6) || 0;

    // Convertir P6 (horas) a escala 0-10
    // Si P6 es mayor a 2 horas, se considera 10. Si es 0, se considera 0.
    // Escala lineal: P6_scaled = (P6 / 2) * 10, limitado a 10
    let p6Scaled = (p6 / 2) * 10;
    if (p6Scaled > 10) p6Scaled = 10;

    // Fórmula BASDAI: [(P1 + P2 + P3 + P4 + ((P5 + P6_scaled) / 2)) / 5]
    const basdai = (p1 + p2 + p3 + p4 + ((p5 + p6Scaled) / 2)) / 5;

    return basdai.toFixed(2);
}

// ============================================
// CÁLCULO ASDAS-CRP Y ASDAS-ESR
// ============================================

function calcularASDAS(datos) {
    const dolorEspalda = parseFloat(datos.asdasDolorEspalda) || 0;
    const duracionRigidez = parseFloat(datos.asdasDuracionRigidez) || 0;
    const evaGlobal = parseFloat(datos.asdasEvaGlobal) || 0;
    const nad = parseFloat(datos.asdasNAD) || 0;
    const pcr = parseFloat(datos.asdasPCR) || 0;
    const vsg = parseFloat(datos.asdasVSG) || 0;

    // ASDAS-CRP: 0.121×dolor + 0.058×rigidez + 0.110×EVA + 0.073×NAD + 0.579×ln(PCR+1)
    const asdasCRP = (0.121 * dolorEspalda) +
                     (0.058 * duracionRigidez) +
                     (0.110 * evaGlobal) +
                     (0.073 * nad) +
                     (0.579 * Math.log(pcr + 1));

    // ASDAS-ESR: 0.08×dolor + 0.07×rigidez + 0.11×EVA + 0.09×NAD + 0.29×√VSG
    const asdasESR = (0.08 * dolorEspalda) +
                     (0.07 * duracionRigidez) +
                     (0.11 * evaGlobal) +
                     (0.09 * nad) +
                     (0.29 * Math.sqrt(vsg));

    return {
        asdasCRP: asdasCRP.toFixed(2),
        asdasESR: asdasESR.toFixed(2)
    };
}

// ============================================
// HAQ-DI - Health Assessment Questionnaire Disability Index
// ============================================

function calcularHAQ(datos) {
    let suma = 0;
    const numCategorias = 8;

    for (let i = 1; i <= numCategorias; i++) {
        let score = parseFloat(datos[`haqCategoria${i}`]) || 0;

        // Si usa ayudas y score es 0 o 1 → elevar a 2
        const usaAyuda = datos[`haqAyuda${i}`] || false;
        if (usaAyuda && score <= 1) {
            score = 2;
        }

        suma += score;
    }

    const haq = suma / numCategorias;
    return haq;
}

// ============================================
// LEI - Leeds Enthesitis Index
// ============================================

function calcularLEI(datos) {
    const checked = datos.leiPuntos || 0;
    return checked;
}

// ============================================
// RAPID3 - Routine Assessment of Patient Index Data 3
// ============================================

function calcularRAPID3(datos) {
    // Función física: HAQ 0-3 convertido a escala 0-10
    const haq = datos.haq || 0;
    const funcion = haq * 3.33; // HAQ 0-3 → 0-10 aprox

    // EVA Dolor y Global (ya están en escala 0-10)
    const dolor = parseFloat(datos.evaDolor) || 0;
    const global = parseFloat(datos.evaGlobal) || 0;

    const rapid3 = funcion + dolor + global;

    // Categorización: >12=alto, 6-12=moderado, 3-6=bajo, ≤3=remisión
    let categoria = '';
    if (rapid3 > 12) categoria = 'Actividad Alta (>12)';
    else if (rapid3 > 6) categoria = 'Actividad Moderada (6-12)';
    else if (rapid3 > 3) categoria = 'Actividad Baja (3-6)';
    else categoria = 'Remisión (≤3)';

    return {
        funcion: funcion.toFixed(1),
        dolor: dolor.toFixed(1),
        global: global.toFixed(1),
        total: rapid3.toFixed(1),
        categoria: categoria
    };
}

// ============================================
// MDA - Minimal Disease Activity
// ============================================

function calcularMDA(datos) {
    // Los 7 criterios de MDA
    const nat = datos.nat || 0;
    const nad = datos.nad || 0;
    const pasi = parseFloat(datos.pasiValue) || 0;
    const bsa = parseFloat(datos.bsaValue) || 0;
    const lei = datos.lei || 0;
    const evaDolor = parseFloat(datos.evaDolor) || 0;
    const evaGlobal = parseFloat(datos.evaGlobal) || 0;
    const haq = datos.haq || 0;

    // Convertir EVA de escala 0-10 a 0-100 (mm)
    const evaDolorMM = evaDolor * 10;
    const evaGlobalMM = evaGlobal * 10;

    // Evaluar cada criterio
    const criterios = {
        nat: nat <= 1,
        nad: nad <= 1,
        psoriasis: pasi <= 1 || bsa <= 3,
        lei: lei <= 1,
        evaDolor: evaDolorMM <= 15,
        evaGlobal: evaGlobalMM <= 20,
        haq: haq <= 0.5
    };

    // Contar criterios cumplidos
    const criteriosArray = [criterios.nat, criterios.nad, criterios.psoriasis, criterios.lei, criterios.evaDolor, criterios.evaGlobal, criterios.haq];
    const cumplidos = criteriosArray.filter(c => c).length;

    // MDA alcanzado si cumple ≥5 criterios
    const mdaAlcanzado = cumplidos >= 5;

    return {
        nat,
        nad,
        psoriasis: pasi > 0 ? `PASI: ${pasi.toFixed(1)}` : bsa > 0 ? `BSA: ${bsa}%` : '-',
        lei,
        evaDolor: evaDolorMM.toFixed(0),
        evaGlobal: evaGlobalMM.toFixed(0),
        haq: haq.toFixed(2),
        criterios: criteriosArray,
        cumplidos,
        mdaAlcanzado
    };
}

// ============================================
// CATEGORIZACIÓN DE SCORES CLÍNICOS
// ============================================

/**
 * Categoriza un score según umbrales clínicos definidos en hubTools.js
 * @param {number} valor - Valor del score
 * @param {string} scoreType - Tipo de score ('basdai', 'asdas', 'haq', 'lei', 'rapid3', 'evaGlobal', 'evaDolor')
 * @returns {Object} { categoria, color, label, backgroundColor }
 *
 * @example
 * const cat = categorizeScore(6.5, 'basdai');
 * // Retorna: { categoria: 'high', color: '#dc3545', label: 'Actividad Alta', backgroundColor: '#dc354522' }
 */
function categorizeScore(valor, scoreType) {
    const cutoffs = HubTools?.dashboard?.activityCutoffs?.[scoreType];
    if (!cutoffs) return { categoria: 'unknown', color: '#6c757d', label: 'N/A', backgroundColor: '#6c757d22' };

    let categoria, color, label;

    switch (scoreType) {
        case 'basdai':
            if (valor < cutoffs.remission) {
                categoria = 'low';
                color = '#28a745';
                label = 'Baja Actividad';
            } else if (valor < cutoffs.high) {
                categoria = 'moderate';
                color = '#ffc107';
                label = 'Actividad Moderada';
            } else {
                categoria = 'high';
                color = '#dc3545';
                label = 'Actividad Alta';
            }
            break;

        case 'asdas':
            if (valor < cutoffs.remission) {
                categoria = 'remission';
                color = '#28a745';
                label = 'Remisión';
            } else if (valor < cutoffs.lowActivity) {
                categoria = 'low';
                color = '#90ee90';
                label = 'Baja Actividad';
            } else if (valor < cutoffs.moderate) {
                categoria = 'moderate';
                color = '#ffc107';
                label = 'Actividad Moderada';
            } else {
                categoria = 'high';
                color = '#dc3545';
                label = 'Actividad Alta';
            }
            break;

        case 'haq':
            if (valor < cutoffs.remission) {
                categoria = 'remission';
                color = '#28a745';
                label = 'Remisión';
            } else if (valor < cutoffs.mild) {
                categoria = 'mild';
                color = '#90ee90';
                label = 'Leve';
            } else if (valor < cutoffs.moderate) {
                categoria = 'moderate';
                color = '#ffc107';
                label = 'Moderado';
            } else {
                categoria = 'severe';
                color = '#dc3545';
                label = 'Severo';
            }
            break;

        case 'lei':
            if (valor <= 1) {
                categoria = 'remission';
                color = '#28a745';
                label = 'Sin Entesitis';
            } else if (valor <= 3) {
                categoria = 'mild';
                color = '#90ee90';
                label = 'Leve';
            } else if (valor <= 5) {
                categoria = 'moderate';
                color = '#ffc107';
                label = 'Moderado';
            } else {
                categoria = 'high';
                color = '#dc3545';
                label = 'Alto';
            }
            break;

        case 'rapid3':
            if (valor <= cutoffs.remission) {
                categoria = 'remission';
                color = '#28a745';
                label = 'Remisión';
            } else if (valor <= cutoffs.lowActivity) {
                categoria = 'low';
                color = '#90ee90';
                label = 'Baja Actividad';
            } else if (valor <= cutoffs.moderate) {
                categoria = 'moderate';
                color = '#ffc107';
                label = 'Actividad Moderada';
            } else {
                categoria = 'high';
                color = '#dc3545';
                label = 'Actividad Alta';
            }
            break;

        case 'evaGlobal':
        case 'evaDolor':
            if (valor < cutoffs.remission) {
                categoria = 'minimal';
                color = '#28a745';
                label = 'Mínimo';
            } else if (valor < cutoffs.mild) {
                categoria = 'mild';
                color = '#90ee90';
                label = 'Leve';
            } else if (valor < cutoffs.moderate) {
                categoria = 'moderate';
                color = '#ffc107';
                label = 'Moderado';
            } else {
                categoria = 'severe';
                color = '#dc3545';
                label = 'Severo';
            }
            break;

        default:
            categoria = 'unknown';
            color = '#6c757d';
            label = 'N/A';
    }

    return {
        categoria,
        color,
        label,
        backgroundColor: color + '22' // Agrega transparencia
    };
}

// ============================================
// EXPOSICIÓN AL NAMESPACE HUBTOOLS
// ============================================

// Exponer funciones al namespace global HubTools
if (typeof HubTools !== 'undefined') {
    HubTools.scores.calcularBASDAI = calcularBASDAI;
    HubTools.scores.calcularASDAS = calcularASDAS;
    HubTools.scores.calcularHAQ = calcularHAQ;
    HubTools.scores.calcularLEI = calcularLEI;
    HubTools.scores.calcularRAPID3 = calcularRAPID3;
    HubTools.scores.calcularMDA = calcularMDA;
    HubTools.scores.categorizeScore = categorizeScore;

    console.log('✅ Módulo scoreCalculators cargado');
} else {
    console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js primero.');
}