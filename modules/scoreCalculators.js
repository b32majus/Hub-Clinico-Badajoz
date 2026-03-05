// Modulo Score Calculators - Para calculos de puntuaciones medicas
// Compatible con el patron clasico HubTools.

function parseNumberInRange(value, min, max, options) {
    const config = options || {};
    const fallback = Object.prototype.hasOwnProperty.call(config, 'fallback') ? config.fallback : null;
    const integer = config.integer === true;

    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const parsed = integer ? parseInt(value, 10) : parseFloat(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    if (min !== undefined && parsed < min) {
        return fallback;
    }
    if (max !== undefined && parsed > max) {
        return fallback;
    }
    return parsed;
}

function formatFixed(value, digits) {
    return Number.isFinite(value) ? value.toFixed(digits) : '';
}

function hasAnyValue(values) {
    return values.some(value => value !== undefined && value !== null && value !== '');
}

function calculateMean(values) {
    if (!Array.isArray(values) || values.length === 0) return null;
    const sum = values.reduce((acc, value) => acc + value, 0);
    return sum / values.length;
}

function calcularBASDAI(datos) {
    const rawValues = [datos?.basdaiP1, datos?.basdaiP2, datos?.basdaiP3, datos?.basdaiP4, datos?.basdaiP5, datos?.basdaiP6];
    if (!hasAnyValue(rawValues)) return '';

    const p1 = parseNumberInRange(datos.basdaiP1, 0, 10, { fallback: 0 });
    const p2 = parseNumberInRange(datos.basdaiP2, 0, 10, { fallback: 0 });
    const p3 = parseNumberInRange(datos.basdaiP3, 0, 10, { fallback: 0 });
    const p4 = parseNumberInRange(datos.basdaiP4, 0, 10, { fallback: 0 });
    const p5 = parseNumberInRange(datos.basdaiP5, 0, 10, { fallback: 0 });
    const p6 = parseNumberInRange(datos.basdaiP6, 0, 24, { fallback: 0 });

    const p6Scaled = Math.min((p6 / 2) * 10, 10);
    const basdai = calculateMean([p1, p2, p3, p4, (p5 + p6Scaled) / 2]);
    return formatFixed(basdai, 2);
}

function calcularASDAS(datos) {
    const rawValues = [datos?.asdasDolorEspalda, datos?.asdasDuracionRigidez, datos?.asdasEvaGlobal, datos?.asdasNAD, datos?.asdasPCR, datos?.asdasVSG];
    if (!hasAnyValue(rawValues)) {
        return { asdasCRP: '', asdasESR: '' };
    }

    const dolorEspalda = parseNumberInRange(datos.asdasDolorEspalda, 0, 10, { fallback: 0 });
    const duracionRigidez = parseNumberInRange(datos.asdasDuracionRigidez, 0, 10, { fallback: 0 });
    const evaGlobal = parseNumberInRange(datos.asdasEvaGlobal, 0, 10, { fallback: 0 });
    const nad = parseNumberInRange(datos.asdasNAD, 0, 28, { fallback: 0, integer: true });
    const pcr = parseNumberInRange(datos.asdasPCR, 0, 500, { fallback: 0 });
    const vsg = parseNumberInRange(datos.asdasVSG, 0, 200, { fallback: 0 });

    const asdasCRP = (0.121 * dolorEspalda) + (0.058 * duracionRigidez) + (0.110 * evaGlobal) + (0.073 * nad) + (0.579 * Math.log(pcr + 1));
    const asdasESR = (0.08 * dolorEspalda) + (0.07 * duracionRigidez) + (0.11 * evaGlobal) + (0.09 * nad) + (0.29 * Math.sqrt(vsg));

    return {
        asdasCRP: formatFixed(asdasCRP, 2),
        asdasESR: formatFixed(asdasESR, 2)
    };
}

function calcularHAQ(datos) {
    let suma = 0;
    let hasInput = false;

    for (let i = 1; i <= 8; i++) {
        let score = parseNumberInRange(datos[`haqCategoria${i}`], 0, 3, { fallback: 0, integer: true });
        const usaAyuda = Boolean(datos[`haqAyuda${i}`]);
        if (datos[`haqCategoria${i}`] !== undefined && datos[`haqCategoria${i}`] !== null && datos[`haqCategoria${i}`] !== '') {
            hasInput = true;
        }
        if (usaAyuda && score <= 1) {
            score = 2;
        }
        suma += score;
    }

    return hasInput ? (suma / 8) : 0;
}

function calcularLEI(datos) {
    return parseNumberInRange(datos?.leiPuntos, 0, 6, { fallback: 0, integer: true });
}

function calcularRAPID3(datos) {
    const rawValues = [datos?.fnRaw, datos?.evaDolor, datos?.evaGlobal];
    if (!hasAnyValue(rawValues)) {
        return { fnRaw: '', funcion: '', dolor: '', global: '', total: '', categoria: 'N/A' };
    }

    const MDHAQ_CONVERSION = [0, 0.3, 0.7, 1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 4.3, 4.7, 5.0, 5.3, 5.7, 6.0, 6.3, 6.7, 7.0, 7.3, 7.7, 8.0, 8.3, 8.7, 9.0, 9.3, 9.7, 10.0];
    const fnRaw = parseNumberInRange(datos.fnRaw, 0, 30, { fallback: 0, integer: true });
    const dolor = parseNumberInRange(datos.evaDolor, 0, 10, { fallback: 0 });
    const global = parseNumberInRange(datos.evaGlobal, 0, 10, { fallback: 0 });
    const funcion = MDHAQ_CONVERSION[fnRaw] ?? 0;
    const rapid3 = funcion + dolor + global;

    let categoria = 'Casi Remision (<=3)';
    if (rapid3 > 12) categoria = 'Actividad Alta (>12)';
    else if (rapid3 > 6) categoria = 'Actividad Moderada (6.1-12)';
    else if (rapid3 > 3) categoria = 'Actividad Baja (3.1-6)';

    return {
        fnRaw,
        funcion: formatFixed(funcion, 1),
        dolor: formatFixed(dolor, 1),
        global: formatFixed(global, 1),
        total: formatFixed(rapid3, 1),
        categoria
    };
}

function calcularMDA(datos) {
    const rawValues = [datos?.nat, datos?.nad, datos?.pasiValue, datos?.bsaValue, datos?.lei, datos?.evaDolor, datos?.evaGlobal, datos?.haq];
    const nat = parseNumberInRange(datos?.nat, 0, 66, { fallback: 0, integer: true });
    const nad = parseNumberInRange(datos?.nad, 0, 68, { fallback: 0, integer: true });
    const pasi = parseNumberInRange(datos?.pasiValue, 0, 72, { fallback: 0 });
    const bsa = parseNumberInRange(datos?.bsaValue, 0, 100, { fallback: 0 });
    const lei = parseNumberInRange(datos?.lei, 0, 6, { fallback: 0, integer: true });
    const evaDolor = parseNumberInRange(datos?.evaDolor, 0, 10, { fallback: 0 });
    const evaGlobal = parseNumberInRange(datos?.evaGlobal, 0, 10, { fallback: 0 });
    const haq = parseNumberInRange(datos?.haq, 0, 3, { fallback: 0 });

    const evaDolorMM = evaDolor * 10;
    const evaGlobalMM = evaGlobal * 10;
    const criterios = {
        nat: nat <= 1,
        nad: nad <= 1,
        psoriasis: pasi <= 1 || bsa <= 3,
        lei: lei <= 1,
        evaDolor: evaDolorMM <= 15,
        evaGlobal: evaGlobalMM <= 20,
        haq: haq <= 0.5
    };
    const criteriosArray = [criterios.nat, criterios.nad, criterios.psoriasis, criterios.lei, criterios.evaDolor, criterios.evaGlobal, criterios.haq];
    const cumplidos = criteriosArray.filter(Boolean).length;
    const hasInput = hasAnyValue(rawValues);

    return {
        nat: hasInput ? nat : '',
        nad: hasInput ? nad : '',
        psoriasis: hasInput ? (pasi > 0 ? `PASI: ${pasi.toFixed(1)}` : (bsa > 0 ? `BSA: ${bsa}%` : '-')) : '-',
        lei: hasInput ? lei : '',
        evaDolor: hasInput ? evaDolorMM.toFixed(0) : '',
        evaGlobal: hasInput ? evaGlobalMM.toFixed(0) : '',
        haq: hasInput ? haq.toFixed(2) : '',
        criterios: hasInput ? criteriosArray : [false, false, false, false, false, false, false],
        cumplidos: hasInput ? cumplidos : 0,
        mdaAlcanzado: hasInput ? cumplidos >= 5 : false
    };
}

function calcularDAS28(datos) {
    const rawValues = [datos?.nad28, datos?.nat28, datos?.pcr, datos?.vsg, datos?.evaGlobal];
    if (!hasAnyValue(rawValues)) {
        return { das28CRP: '', das28ESR: '' };
    }

    const nad28 = parseNumberInRange(datos.nad28, 0, 28, { fallback: 0, integer: true });
    const nat28 = parseNumberInRange(datos.nat28, 0, 28, { fallback: 0, integer: true });
    const pcr = parseNumberInRange(datos.pcr, 0, 500, { fallback: 0 });
    const vsg = parseNumberInRange(datos.vsg, 0, 200, { fallback: 1 });
    let eva = parseNumberInRange(datos.evaGlobal, 0, 100, { fallback: 0 });
    if (eva > 0 && eva <= 10) eva = eva * 10;

    const das28CRP = (0.56 * Math.sqrt(nad28)) + (0.28 * Math.sqrt(nat28)) + (0.36 * Math.log(pcr + 1)) + (0.014 * eva) + 0.96;
    const das28ESR = (0.56 * Math.sqrt(nad28)) + (0.28 * Math.sqrt(nat28)) + (0.70 * Math.log(Math.max(vsg, 1))) + (0.014 * eva);

    return {
        das28CRP: formatFixed(das28CRP, 2),
        das28ESR: formatFixed(das28ESR, 2)
    };
}

function calcularCDAI(datos) {
    const rawValues = [datos?.nad28, datos?.nat28, datos?.evaPaciente, datos?.evaMedico];
    if (!hasAnyValue(rawValues)) {
        return { total: '', categoria: 'N/A' };
    }

    const nad28 = parseNumberInRange(datos.nad28, 0, 28, { fallback: 0, integer: true });
    const nat28 = parseNumberInRange(datos.nat28, 0, 28, { fallback: 0, integer: true });
    const evaPaciente = parseNumberInRange(datos.evaPaciente, 0, 10, { fallback: 0 });
    const evaMedico = parseNumberInRange(datos.evaMedico, 0, 10, { fallback: 0 });
    const cdai = nad28 + nat28 + evaPaciente + evaMedico;

    let categoria = 'Remision (<=2.8)';
    if (cdai > 22) categoria = 'Actividad Alta (>22)';
    else if (cdai > 10) categoria = 'Actividad Moderada (10-22)';
    else if (cdai > 2.8) categoria = 'Actividad Baja (2.8-10)';

    return { total: formatFixed(cdai, 1), categoria };
}

function calcularSDAI(datos) {
    const rawValues = [datos?.nad28, datos?.nat28, datos?.evaPaciente, datos?.evaMedico, datos?.pcr];
    if (!hasAnyValue(rawValues)) {
        return { total: '', categoria: 'N/A' };
    }

    const nad28 = parseNumberInRange(datos.nad28, 0, 28, { fallback: 0, integer: true });
    const nat28 = parseNumberInRange(datos.nat28, 0, 28, { fallback: 0, integer: true });
    const evaPaciente = parseNumberInRange(datos.evaPaciente, 0, 10, { fallback: 0 });
    const evaMedico = parseNumberInRange(datos.evaMedico, 0, 10, { fallback: 0 });
    let pcr = parseNumberInRange(datos.pcr, 0, 500, { fallback: 0 });
    if (pcr > 10) pcr = pcr / 10;
    const sdai = nad28 + nat28 + evaPaciente + evaMedico + pcr;

    let categoria = 'Remision (<=3.3)';
    if (sdai > 26) categoria = 'Actividad Alta (>26)';
    else if (sdai > 11) categoria = 'Actividad Moderada (11-26)';
    else if (sdai > 3.3) categoria = 'Actividad Baja (3.3-11)';

    return { total: formatFixed(sdai, 1), categoria };
}

function categorizeScore(valor, scoreType) {
    if (!Number.isFinite(valor)) {
        return { categoria: 'unknown', color: '#6c757d', label: 'N/A', backgroundColor: '#6c757d22' };
    }

    const cutoffs = HubTools?.dashboard?.activityCutoffs?.[scoreType];
    if (!cutoffs) return { categoria: 'unknown', color: '#6c757d', label: 'N/A', backgroundColor: '#6c757d22' };

    let categoria, color, label;
    switch (scoreType) {
        case 'basdai':
            if (valor < cutoffs.remission) {
                categoria = 'low'; color = '#28a745'; label = 'Baja Actividad';
            } else if (valor < cutoffs.high) {
                categoria = 'moderate'; color = '#ffc107'; label = 'Actividad Moderada';
            } else {
                categoria = 'high'; color = '#dc3545'; label = 'Actividad Alta';
            }
            break;
        case 'asdas':
        case 'das28':
        case 'cdai':
        case 'sdai':
        case 'rapid3':
            if (valor < cutoffs.remission) {
                categoria = 'remission'; color = '#28a745'; label = 'Remisión';
            } else if (valor < cutoffs.lowActivity) {
                categoria = 'low'; color = '#90ee90'; label = 'Baja Actividad';
            } else if (valor < cutoffs.moderate) {
                categoria = 'moderate'; color = '#ffc107'; label = 'Actividad Moderada';
            } else {
                categoria = 'high'; color = '#dc3545'; label = 'Actividad Alta';
            }
            break;
        case 'haq':
            if (valor < cutoffs.remission) {
                categoria = 'remission'; color = '#28a745'; label = 'Remisión';
            } else if (valor < cutoffs.mild) {
                categoria = 'mild'; color = '#90ee90'; label = 'Leve';
            } else if (valor < cutoffs.moderate) {
                categoria = 'moderate'; color = '#ffc107'; label = 'Moderado';
            } else {
                categoria = 'severe'; color = '#dc3545'; label = 'Severo';
            }
            break;
        case 'lei':
            if (valor <= 1) {
                categoria = 'remission'; color = '#28a745'; label = 'Sin Entesitis';
            } else if (valor <= 3) {
                categoria = 'mild'; color = '#90ee90'; label = 'Leve';
            } else if (valor <= 5) {
                categoria = 'moderate'; color = '#ffc107'; label = 'Moderado';
            } else {
                categoria = 'high'; color = '#dc3545'; label = 'Alto';
            }
            break;
        case 'evaGlobal':
        case 'evaDolor':
            if (valor < cutoffs.remission) {
                categoria = 'minimal'; color = '#28a745'; label = 'Mínimo';
            } else if (valor < cutoffs.mild) {
                categoria = 'mild'; color = '#90ee90'; label = 'Leve';
            } else if (valor < cutoffs.moderate) {
                categoria = 'moderate'; color = '#ffc107'; label = 'Moderado';
            } else {
                categoria = 'severe'; color = '#dc3545'; label = 'Severo';
            }
            break;
        default:
            categoria = 'unknown'; color = '#6c757d'; label = 'N/A';
    }

    return { categoria, color, label, backgroundColor: color + '22' };
}

if (typeof HubTools !== 'undefined') {
    HubTools.scores.calcularBASDAI = calcularBASDAI;
    HubTools.scores.calcularASDAS = calcularASDAS;
    HubTools.scores.calcularHAQ = calcularHAQ;
    HubTools.scores.calcularLEI = calcularLEI;
    HubTools.scores.calcularRAPID3 = calcularRAPID3;
    HubTools.scores.calcularMDA = calcularMDA;
    HubTools.scores.calcularDAS28 = calcularDAS28;
    HubTools.scores.calcularCDAI = calcularCDAI;
    HubTools.scores.calcularSDAI = calcularSDAI;
    HubTools.scores.categorizeScore = categorizeScore;
}
