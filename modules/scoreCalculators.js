// Modulo Score Calculators - Para calculos de puntuaciones medicas
// Compatible con el patron clasico HubTools.

function parseNumberInRange(value, min, max, options) {
    const config = options || {};
    const fallback = Object.prototype.hasOwnProperty.call(config, 'fallback') ? config.fallback : null;
    const integer = config.integer === true;

    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const raw = typeof value === 'string' ? value.trim().replace(',', '.') : value;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || (integer && !Number.isInteger(parsed))) {
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

function hasAllValues(values) {
    return values.every(value => value !== undefined && value !== null && value !== '');
}

function countPresentValues(values) {
    return values.filter(value => value !== undefined && value !== null && value !== '').length;
}

function calculateMean(values) {
    if (!Array.isArray(values) || values.length === 0) return null;
    const sum = values.reduce((acc, value) => acc + value, 0);
    return sum / values.length;
}

function allFinite(values) {
    return Array.isArray(values) && values.every(Number.isFinite);
}

function calcularBASDAI(datos) {
    const rawValues = [datos?.basdaiP1, datos?.basdaiP2, datos?.basdaiP3, datos?.basdaiP4, datos?.basdaiP5, datos?.basdaiP6];
    if (!hasAllValues(rawValues)) return '';

    const p1 = parseNumberInRange(datos.basdaiP1, 0, 10);
    const p2 = parseNumberInRange(datos.basdaiP2, 0, 10);
    const p3 = parseNumberInRange(datos.basdaiP3, 0, 10);
    const p4 = parseNumberInRange(datos.basdaiP4, 0, 10);
    const p5 = parseNumberInRange(datos.basdaiP5, 0, 10);
    const p6 = parseNumberInRange(datos.basdaiP6, 0, 24, { integer: true });
    if (!allFinite([p1, p2, p3, p4, p5, p6])) return '';

    const p6Scaled = Math.min((p6 / 2) * 10, 10);
    const basdai = calculateMean([p1, p2, p3, p4, (p5 + p6Scaled) / 2]);
    return formatFixed(basdai, 2);
}

function calcularASDAS(datos) {
    const common = [datos?.asdasDolorEspalda, datos?.asdasDuracionRigidez, datos?.asdasEvaGlobal, datos?.asdasNAD];
    if (!hasAllValues(common)) {
        return { asdasCRP: '', asdasESR: '' };
    }

    const dolorEspalda = parseNumberInRange(datos.asdasDolorEspalda, 0, 10);
    const duracionRigidez = parseNumberInRange(datos.asdasDuracionRigidez, 0, 10);
    const evaGlobal = parseNumberInRange(datos.asdasEvaGlobal, 0, 10);
    const nad = parseNumberInRange(datos.asdasNAD, 0, 28, { integer: true });
    if (!allFinite([dolorEspalda, duracionRigidez, evaGlobal, nad])) {
        return { asdasCRP: '', asdasESR: '' };
    }

    let asdasCRP = '';
    let asdasESR = '';

    if (datos?.asdasPCR !== undefined && datos?.asdasPCR !== null && datos?.asdasPCR !== '') {
        // ASDAS-CRP uses CRP/PCR in mg/L. Do not convert to mg/dL.
        const pcr = parseNumberInRange(datos.asdasPCR, 0, 500);
        if (Number.isFinite(pcr)) {
            asdasCRP = formatFixed(
                (0.121 * dolorEspalda) + (0.058 * duracionRigidez) + (0.110 * evaGlobal) + (0.073 * nad) + (0.579 * Math.log(pcr + 1)),
                2
            );
        }
    }

    if (datos?.asdasVSG !== undefined && datos?.asdasVSG !== null && datos?.asdasVSG !== '') {
        const vsg = parseNumberInRange(datos.asdasVSG, 0, 200);
        if (Number.isFinite(vsg)) {
            asdasESR = formatFixed(
                (0.08 * dolorEspalda) + (0.07 * duracionRigidez) + (0.11 * evaGlobal) + (0.09 * nad) + (0.29 * Math.sqrt(vsg)),
                2
            );
        }
    }

    return { asdasCRP, asdasESR };
}

function calcularHAQ(datos) {
    const categorias = [];
    for (let i = 1; i <= 8; i++) {
        categorias.push(datos?.[`haqCategoria${i}`]);
    }
    if (countPresentValues(categorias) < 6) return '';

    let suma = 0;
    let contestadas = 0;
    for (let i = 1; i <= 8; i++) {
        let score = parseNumberInRange(datos[`haqCategoria${i}`], 0, 3, { fallback: null, integer: true });
        if (!Number.isFinite(score)) continue;
        const usaAyuda = Boolean(datos[`haqAyuda${i}`]);
        if (usaAyuda && score <= 1) {
            score = 2;
        }
        suma += score;
        contestadas += 1;
    }

    return contestadas >= 6 ? suma / contestadas : '';
}

function calcularLEI(datos) {
    if (datos?.leiPuntos === undefined || datos?.leiPuntos === null || datos?.leiPuntos === '') return '';
    return parseNumberInRange(datos.leiPuntos, 0, 6, { integer: true });
}

function calcularRAPID3(datos) {
    const rawValues = [datos?.fnRaw, datos?.evaDolor, datos?.evaGlobal];
    if (!hasAllValues(rawValues)) {
        return { fnRaw: '', funcion: '', dolor: '', global: '', total: '', categoria: 'Incompleto' };
    }

    const MDHAQ_CONVERSION = [0, 0.3, 0.7, 1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 4.3, 4.7, 5.0, 5.3, 5.7, 6.0, 6.3, 6.7, 7.0, 7.3, 7.7, 8.0, 8.3, 8.7, 9.0, 9.3, 9.7, 10.0];
    const fnRaw = parseNumberInRange(datos.fnRaw, 0, 30, { integer: true });
    const dolor = parseNumberInRange(datos.evaDolor, 0, 10);
    const global = parseNumberInRange(datos.evaGlobal, 0, 10);
    if (!allFinite([fnRaw, dolor, global])) {
        return { fnRaw: '', funcion: '', dolor: '', global: '', total: '', categoria: 'Incompleto' };
    }
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
    const incompleteResult = {
        nat: '',
        nad: '',
        psoriasis: '',
        lei: '',
        evaDolor: '',
        evaGlobal: '',
        haq: '',
        criterios: [],
        cumplidos: 0,
        mdaAlcanzado: false,
        evaluable: false,
        categoria: 'Incompleto'
    };

    const nat = parseNumberInRange(datos?.nat, 0, 66, { fallback: null, integer: true });
    const nad = parseNumberInRange(datos?.nad, 0, 68, { fallback: null, integer: true });
    const pasi = parseNumberInRange(datos?.pasiValue, 0, 72, { fallback: null });
    const bsa = parseNumberInRange(datos?.bsaValue, 0, 100, { fallback: null });
    const lei = parseNumberInRange(datos?.lei, 0, 6, { fallback: null, integer: true });
    const evaDolor = parseNumberInRange(datos?.evaDolor, 0, 10, { fallback: null });
    const evaGlobal = parseNumberInRange(datos?.evaGlobal, 0, 10, { fallback: null });
    const haq = parseNumberInRange(datos?.haq, 0, 3, { fallback: null });

    const hasJointCounts = allFinite([nat, nad]);
    const hasSkin = Number.isFinite(pasi) || Number.isFinite(bsa);
    const hasEnthesitis = Number.isFinite(lei);
    const hasPROs = allFinite([evaDolor, evaGlobal]);
    const hasFunction = Number.isFinite(haq);
    const evaluable = hasJointCounts && hasSkin && hasEnthesitis && hasPROs && hasFunction;
    if (!evaluable) return incompleteResult;

    const evaDolorMM = evaDolor * 10;
    const evaGlobalMM = evaGlobal * 10;
    const psoriasisCriterion = [
        Number.isFinite(pasi) ? pasi <= 1 : false,
        Number.isFinite(bsa) ? bsa <= 3 : false
    ].some(Boolean);
    const criterios = {
        nat: nat <= 1,
        nad: nad <= 1,
        psoriasis: psoriasisCriterion,
        lei: lei <= 1,
        evaDolor: evaDolorMM <= 15,
        evaGlobal: evaGlobalMM <= 20,
        haq: haq <= 0.5
    };
    const criteriosArray = [criterios.nat, criterios.nad, criterios.psoriasis, criterios.lei, criterios.evaDolor, criterios.evaGlobal, criterios.haq];
    const cumplidos = criteriosArray.filter(Boolean).length;
    const mdaAlcanzado = cumplidos >= 5;

    return {
        nat,
        nad,
        psoriasis: Number.isFinite(pasi) ? `PASI: ${pasi.toFixed(1)}` : `BSA: ${bsa}%`,
        lei,
        evaDolor: evaDolorMM.toFixed(0),
        evaGlobal: evaGlobalMM.toFixed(0),
        haq: haq.toFixed(2),
        criterios: criteriosArray,
        cumplidos,
        mdaAlcanzado,
        evaluable: true,
        categoria: mdaAlcanzado ? 'MDA alcanzado' : 'MDA no alcanzado'
    };
}

function calcularDAPSA(datos) {
    const rawValues = [
        datos?.dapsaNAD68,
        datos?.dapsaNAT66,
        datos?.dapsaEvaDolorPaciente,
        datos?.dapsaEvaGlobalPaciente,
        datos?.dapsaPCR
    ];
    if (!hasAllValues(rawValues)) {
        return { total: '', categoria: 'Incompleto' };
    }

    const nad68 = parseNumberInRange(datos.dapsaNAD68, 0, 68, { integer: true });
    const nat66 = parseNumberInRange(datos.dapsaNAT66, 0, 66, { integer: true });
    const evaDolor = parseNumberInRange(datos.dapsaEvaDolorPaciente, 0, 10);
    const evaGlobal = parseNumberInRange(datos.dapsaEvaGlobalPaciente, 0, 10);
    const pcrMgL = parseNumberInRange(datos.dapsaPCR, 0, 500);
    if (!allFinite([nad68, nat66, evaDolor, evaGlobal, pcrMgL])) {
        return { total: '', categoria: 'Incompleto' };
    }

    // DAPSA uses CRP/PCR in mg/dL. Hub captures, stores and displays PCR as mg/L, therefore divide by 10.
    const pcrMgDl = pcrMgL / 10;
    const dapsa = nad68 + nat66 + evaDolor + evaGlobal + pcrMgDl;

    let categoria = 'Remision (<=4)';
    if (dapsa > 28) categoria = 'Actividad Alta (>28)';
    else if (dapsa > 14) categoria = 'Actividad Moderada (14.1-28)';
    else if (dapsa > 4) categoria = 'Actividad Baja (4.1-14)';

    return {
        total: formatFixed(dapsa, 1),
        categoria,
        nad68,
        nat66,
        evaDolor: formatFixed(evaDolor, 1),
        evaGlobal: formatFixed(evaGlobal, 1),
        pcr: formatFixed(pcrMgL, 1),
        pcrMgDl: formatFixed(pcrMgDl, 2)
    };
}

function calcularDAS28(datos) {
    const core = [datos?.nad28, datos?.nat28, datos?.evaGlobal];
    if (!hasAllValues(core)) {
        return { das28CRP: '', das28ESR: '' };
    }

    const nad28 = parseNumberInRange(datos.nad28, 0, 28, { integer: true });
    const nat28 = parseNumberInRange(datos.nat28, 0, 28, { integer: true });
    let eva = parseNumberInRange(datos.evaGlobal, 0, 100);
    if (!allFinite([nad28, nat28, eva])) {
        return { das28CRP: '', das28ESR: '' };
    }
    if (eva > 0 && eva <= 10) eva = eva * 10;

    let das28CRP = '';
    let das28ESR = '';

    if (datos?.pcr !== undefined && datos?.pcr !== null && datos?.pcr !== '') {
        // DAS28-CRP uses CRP/PCR in mg/L. Do not convert to mg/dL.
        const pcr = parseNumberInRange(datos.pcr, 0, 500);
        if (Number.isFinite(pcr)) {
            das28CRP = formatFixed(
                (0.56 * Math.sqrt(nad28)) + (0.28 * Math.sqrt(nat28)) + (0.36 * Math.log(pcr + 1)) + (0.014 * eva) + 0.96,
                2
            );
        }
    }

    if (datos?.vsg !== undefined && datos?.vsg !== null && datos?.vsg !== '') {
        const vsg = parseNumberInRange(datos.vsg, 0, 200);
        if (Number.isFinite(vsg)) {
            das28ESR = formatFixed(
                (0.56 * Math.sqrt(nad28)) + (0.28 * Math.sqrt(nat28)) + (0.70 * Math.log(Math.max(vsg, 1))) + (0.014 * eva),
                2
            );
        }
    }

    return { das28CRP, das28ESR };
}

function calcularCDAI(datos) {
    const rawValues = [datos?.nad28, datos?.nat28, datos?.evaPaciente, datos?.evaMedico];
    if (!hasAllValues(rawValues)) {
        return { total: '', categoria: 'Incompleto' };
    }

    const nad28 = parseNumberInRange(datos.nad28, 0, 28, { integer: true });
    const nat28 = parseNumberInRange(datos.nat28, 0, 28, { integer: true });
    const evaPaciente = parseNumberInRange(datos.evaPaciente, 0, 10);
    const evaMedico = parseNumberInRange(datos.evaMedico, 0, 10);
    if (!allFinite([nad28, nat28, evaPaciente, evaMedico])) {
        return { total: '', categoria: 'Incompleto' };
    }
    const cdai = nad28 + nat28 + evaPaciente + evaMedico;

    let categoria = 'Remision (<=2.8)';
    if (cdai > 22) categoria = 'Actividad Alta (>22)';
    else if (cdai > 10) categoria = 'Actividad Moderada (10-22)';
    else if (cdai > 2.8) categoria = 'Actividad Baja (2.8-10)';

    return { total: formatFixed(cdai, 1), categoria };
}

function calcularSDAI(datos) {
    const rawValues = [datos?.nad28, datos?.nat28, datos?.evaPaciente, datos?.evaMedico, datos?.pcr];
    if (!hasAllValues(rawValues)) {
        return { total: '', categoria: 'Incompleto' };
    }

    const nad28 = parseNumberInRange(datos.nad28, 0, 28, { integer: true });
    const nat28 = parseNumberInRange(datos.nat28, 0, 28, { integer: true });
    const evaPaciente = parseNumberInRange(datos.evaPaciente, 0, 10);
    const evaMedico = parseNumberInRange(datos.evaMedico, 0, 10);
    const pcrMgL = parseNumberInRange(datos.pcr, 0, 500);
    if (!allFinite([nad28, nat28, evaPaciente, evaMedico, pcrMgL])) {
        return { total: '', categoria: 'Incompleto' };
    }
    // SDAI uses CRP/PCR in mg/dL. Hub captures, stores and displays PCR as mg/L, therefore divide by 10.
    const pcrMgDl = pcrMgL / 10;
    const sdai = nad28 + nat28 + evaPaciente + evaMedico + pcrMgDl;

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

    const normalizedScoreType = String(scoreType || '').toLowerCase().replace(/[-_\s]/g, '');
    const cutoffKeyMap = {
        sledai2k: 'sledai2k',
        essdai: 'essdai',
        esspri: 'esspri',
        dapsa: 'dapsa',
        pasi: 'pasi',
        bsa: 'bsa'
    };
    const cutoffKey = HubTools?.dashboard?.activityCutoffs?.[scoreType] ? scoreType : (cutoffKeyMap[normalizedScoreType] || scoreType);
    const cutoffs = HubTools?.dashboard?.activityCutoffs?.[cutoffKey];
    if (!cutoffs) return { categoria: 'unknown', color: '#6c757d', label: 'N/A', backgroundColor: '#6c757d22' };

    let categoria, color, label;
    switch (cutoffKey) {
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
        case 'dapsa':
        case 'sledai2k':
        case 'esspri':
            if (valor <= cutoffs.remission) {
                categoria = 'remission'; color = '#28a745'; label = 'Remisión';
            } else if (valor <= cutoffs.lowActivity) {
                categoria = 'low'; color = '#90ee90'; label = 'Baja Actividad';
            } else if (valor <= cutoffs.moderate) {
                categoria = 'moderate'; color = '#ffc107'; label = 'Actividad Moderada';
            } else {
                categoria = 'high'; color = '#dc3545'; label = 'Actividad Alta';
            }
            break;
        case 'essdai':
            if (valor < cutoffs.remission) {
                categoria = 'low'; color = '#28a745'; label = 'Baja Actividad';
            } else if (valor < cutoffs.moderate) {
                categoria = 'moderate'; color = '#ffc107'; label = 'Actividad Moderada';
            } else {
                categoria = 'high'; color = '#dc3545'; label = 'Actividad Alta';
            }
            break;
        case 'pasi':
        case 'bsa':
            if (valor < cutoffs.remission) {
                categoria = 'remission'; color = '#28a745'; label = 'Remisión';
            } else if (cutoffs.lowActivity !== undefined && valor < cutoffs.lowActivity) {
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

// ============================================================
// SLEDAI-2K (Systemic Lupus Erythematosus Disease Activity Index 2000)
// 24 ítems con pesos 8/4/2/1. Suma ponderada.
// ============================================================
function calcularSLEDAI2K(datos) {
    const items = [
        ['sledaiSeizure', 8],
        ['sledaiPsychosis', 8],
        ['sledaiOrganicBrainSyndrome', 8],
        ['sledaiVisualDisturbance', 8],
        ['sledaiCranialNerveDisorder', 8],
        ['sledaiLupusHeadache', 8],
        ['sledaiCVA', 8],
        ['sledaiVasculitis', 8],
        ['sledaiArthritis', 4],
        ['sledaiMyositis', 4],
        ['sledaiUrinaryCasts', 4],
        ['sledaiHematuria', 4],
        ['sledaiProteinuria', 4],
        ['sledaiPyuria', 4],
        ['sledaiRash', 2],
        ['sledaiAlopecia', 2],
        ['sledaiMucosalUlcers', 2],
        ['sledaiPleurisy', 2],
        ['sledaiPericarditis', 2],
        ['sledaiLowComplement', 2],
        ['sledaiIncreasedDNABinding', 2],
        ['sledaiFever', 1],
        ['sledaiThrombocytopenia', 1],
        ['sledaiLeukopenia', 1]
    ];

    let hasAny = false;
    const total = items.reduce(function (sum, item) {
        const key = item[0];
        const weight = item[1];
        const active = datos && (
            datos[key] === true ||
            datos[key] === 'true' ||
            datos[key] === 'SI' ||
            datos[key] === 'Sí' ||
            datos[key] === 'si' ||
            datos[key] === '1' ||
            datos[key] === 1
        );
        if (active) hasAny = true;
        return sum + (active ? weight : 0);
    }, 0);

    return hasAny ? total : '';
}

// ============================================================
// SLICC/ACR SDI (Systemic Lupus International Collaborating Clinics Damage Index)
// Entrada estructurada por dominios/subtotales (no checklist individual).
// ============================================================
function calcularSLICCSDI(datos) {
    const domains = [
        ['sliccOcular', 0, 2],
        ['sliccNeuropsychiatric', 0, 6],
        ['sliccRenal', 0, 3],
        ['sliccPulmonary', 0, 5],
        ['sliccCardiovascular', 0, 6],
        ['sliccPeripheralVascular', 0, 5],
        ['sliccGastrointestinal', 0, 6],
        ['sliccMusculoskeletal', 0, 7],
        ['sliccSkin', 0, 3],
        ['sliccEndocrineDiabetes', 0, 1],
        ['sliccGonadal', 0, 1],
        ['sliccMalignancy', 0, 2]
    ];

    let hasAny = false;
    const total = domains.reduce(function (sum, domain) {
        const key = domain[0];
        const min = domain[1];
        const max = domain[2];
        const value = parseNumberInRange(datos?.[key], min, max, { fallback: null, integer: true });
        if (value !== null) hasAny = true;
        return sum + (value || 0);
    }, 0);

    return hasAny ? total : '';
}

// ============================================================
// ESSPRI (EULAR Sjögren's Syndrome Patient Reported Index)
// PROM: media de sequedad, dolor y fatiga (0-10).
// ============================================================
function calcularESSPRI(datos) {
    const rawValues = [datos?.esspriSequedad, datos?.esspriDolor, datos?.esspriFatiga];
    if (!hasAllValues(rawValues)) return '';

    const sequedad = parseNumberInRange(datos.esspriSequedad, 0, 10);
    const dolor = parseNumberInRange(datos.esspriDolor, 0, 10);
    const fatiga = parseNumberInRange(datos.esspriFatiga, 0, 10);
    if (!allFinite([sequedad, dolor, fatiga])) return '';

    return formatFixed(calculateMean([sequedad, dolor, fatiga]), 2);
}

// ============================================================
// ESSDAI (EULAR Sjögren's Syndrome Disease Activity Index)
// 12 dominios con niveles 0-3 y pesos específicos.
// ============================================================
function calcularESSDAI(datos) {
    const domains = [
        ['essdaiConstitutional', 3],
        ['essdaiLymphadenopathy', 4],
        ['essdaiGlandular', 2],
        ['essdaiArticular', 2],
        ['essdaiCutaneous', 3],
        ['essdaiPulmonary', 5],
        ['essdaiRenal', 5],
        ['essdaiMuscular', 6],
        ['essdaiPeripheralNervousSystem', 5],
        ['essdaiCentralNervousSystem', 5],
        ['essdaiHematological', 2],
        ['essdaiBiological', 1]
    ];

    let hasAny = false;
    const total = domains.reduce(function (sum, domain) {
        const key = domain[0];
        const weight = domain[1];
        const level = parseNumberInRange(datos?.[key], 0, 3, { fallback: null, integer: true });

        if (level !== null) hasAny = true;
        return sum + ((level || 0) * weight);
    }, 0);

    return hasAny ? total : '';
}

if (typeof HubTools !== 'undefined') {
    HubTools.scores.calcularBASDAI = calcularBASDAI;
    HubTools.scores.calcularASDAS = calcularASDAS;
    HubTools.scores.calcularHAQ = calcularHAQ;
    HubTools.scores.calcularLEI = calcularLEI;
    HubTools.scores.calcularRAPID3 = calcularRAPID3;
    HubTools.scores.calcularMDA = calcularMDA;
    HubTools.scores.calcularDAPSA = calcularDAPSA;
    HubTools.scores.calcularDAS28 = calcularDAS28;
    HubTools.scores.calcularCDAI = calcularCDAI;
    HubTools.scores.calcularSDAI = calcularSDAI;
    HubTools.scores.calcularSLEDAI2K = calcularSLEDAI2K;
    HubTools.scores.calcularSLICCSDI = calcularSLICCSDI;
    HubTools.scores.calcularESSPRI = calcularESSPRI;
    HubTools.scores.calcularESSDAI = calcularESSDAI;
    HubTools.scores.categorizeScore = categorizeScore;
}
