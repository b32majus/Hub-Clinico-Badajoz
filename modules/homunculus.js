// Módulo Homunculus - Para visualización interactiva de articulaciones
// Este módulo maneja la interacción con el homúnculo para marcar NAD, NAT y dactilitis
// ACTUALIZACIÓN: Patrón clásico (sin import/export) + corrección de bug recursivo

// =====================================
// CONSTANTES DEL HOMÚNCULO - "JOYA DE LA CORONA" DE LA APLICACIÓN
// =====================================

/**
 * ⚠️ CRÍTICO - NO MODIFICAR SIN VALIDACIÓN EXHAUSTIVA ⚠️
 *
 * Estas constantes definen TODOS los IDs de las regiones interactivas del SVG del homúnculo.
 * El homúnculo interactivo es el componente central de esta aplicación clínica, permitiendo
 * la captura visual de:
 * - NAD (Número de Articulaciones Dolorosas)
 * - NAT (Número de Articulaciones Tumefactas)
 * - Dactilitis (inflamación en dedos)
 *
 * IMPORTANTE:
 * - Cada string debe coincidir EXACTAMENTE con el atributo data-region-id del SVG
 * - Si se elimina o modifica un ID, la articulación NO será clickeable
 * - Si se añade un ID que no existe en el SVG, no causará error pero será inútil
 * - Estas constantes son la FUENTE DE VERDAD para validación de datos
 *
 * USO:
 * - Se utilizan en formController.js para crear mapas de estado de articulaciones
 * - Se utilizan para validar que los datos guardados corresponden a regiones válidas
 * - Se exponen a través de HubTools.utils.createHomunculusMap() para uso compartido
 *
 * MANTENIMIENTO:
 * - Si se actualiza el SVG del homúnculo, actualizar estas constantes en paralelo
 * - Ejecutar pruebas de clickeo en todas las articulaciones después de cambios
 * - Verificar que los datos históricos sigan siendo compatibles
 */

const HOMUNCULUS_ARTICULATIONS = [
    'hombro-derecho', 'hombro-izquierdo', 'codo-derecho', 'codo-izquierdo',
    'muneca-derecha', 'muneca-izquierda', 'cadera-derecha', 'cadera-izquierda',
    'rodilla-derecha', 'rodilla-izquierda', 'tobillo-derecho', 'tobillo-izquierdo',
    'mcf1-derecha', 'mcf2-derecha', 'mcf3-derecha', 'mcf4-derecha', 'mcf5-derecha',
    'mcf1-izquierda', 'mcf2-izquierda', 'mcf3-izquierda', 'mcf4-izquierda', 'mcf5-izquierda',
    'ifp1-derecha', 'ifp2-derecha', 'ifp3-derecha', 'ifp4-derecha', 'ifp5-derecha',
    'ifp1-izquierda', 'ifp2-izquierda', 'ifp3-izquierda', 'ifp4-izquierda', 'ifp5-izquierda',
    // Añadir más articulaciones según el SVG (mantener lista actualizada)
];

const HOMUNCULUS_DACTILITIS = [
    'dactilitis-dedo1-mano-derecha', 'dactilitis-dedo2-mano-derecha', 'dactilitis-dedo3-mano-derecha', 'dactilitis-dedo4-mano-derecha', 'dactilitis-dedo5-mano-derecha',
    'dactilitis-dedo1-mano-izquierda', 'dactilitis-dedo2-mano-izquierda', 'dactilitis-dedo3-mano-izquierda', 'dactilitis-dedo4-mano-izquierda', 'dactilitis-dedo5-mano-izquierda',
    'dactilitis-dedo1-pie-derecho', 'dactilitis-dedo2-pie-derecho', 'dactilitis-dedo3-pie-derecho', 'dactilitis-dedo4-pie-derecho', 'dactilitis-dedo5-pie-derecho',
    'dactilitis-dedo1-pie-izquierda', 'dactilitis-dedo2-pie-izquierda', 'dactilitis-dedo3-pie-izquierda', 'dactilitis-dedo4-pie-izquierda', 'dactilitis-dedo5-pie-izquierda',
    // Añadir más dactilitis según el SVG (mantener lista actualizada)
];

/**
 * Subconjunto de 28 articulaciones para el DAS28 (AR).
 * Excluye caderas y tobillos del recuento general.
 * Hombros(2) + Codos(2) + Muñecas(2) + MCF1-5(10) + IFP1-5(10) + Rodillas(2) = 28
 */
const DAS28_ARTICULATIONS = [
    'hombro-derecho', 'hombro-izquierdo',
    'codo-derecho', 'codo-izquierdo',
    'muneca-derecha', 'muneca-izquierda',
    'rodilla-derecha', 'rodilla-izquierda',
    'mcf1-derecha', 'mcf2-derecha', 'mcf3-derecha', 'mcf4-derecha', 'mcf5-derecha',
    'mcf1-izquierda', 'mcf2-izquierda', 'mcf3-izquierda', 'mcf4-izquierda', 'mcf5-izquierda',
    'ifp1-derecha', 'ifp2-derecha', 'ifp3-derecha', 'ifp4-derecha', 'ifp5-derecha',
    'ifp1-izquierda', 'ifp2-izquierda', 'ifp3-izquierda', 'ifp4-izquierda', 'ifp5-izquierda',
];

// =====================================
// VARIABLES GLOBALES DEL HOMÚNCULO
// =====================================

let homunculusModeBtns;
let humanBodySvg;
let bodyRegions;
let clearHomunculusBtn;
let activeMode = 'nad';
let markedRegions = {
    nad: new Set(),
    nat: new Set(),
    dactilitis: new Set()
};
let scoreElements;

// =====================================
// FUNCIONES DEL HOMÚNCULO
// =====================================

function updateScores() {
    for (const mode in markedRegions) {
        scoreElements[mode].textContent = markedRegions[mode].size;
    }

    const doubleMarked = [...markedRegions.nad].filter(regionId => markedRegions.nat.has(regionId));
    const doubleMarkCount = doubleMarked.length;
    const doubleMarkInfo = document.getElementById('doubleMarkInfo');
    const doubleMarkCountSpan = document.getElementById('doubleMarkCount');

    if (doubleMarkCount > 0) {
        doubleMarkCountSpan.textContent = doubleMarkCount;
        doubleMarkInfo.style.display = 'block';
    } else {
        doubleMarkInfo.style.display = 'none';
    }

    const parentSection = doubleMarkInfo.closest('.collapsible-content');
    if (parentSection && parentSection.style.maxHeight && parentSection.style.maxHeight !== "0px") {
        setTimeout(() => {
            parentSection.style.maxHeight = parentSection.scrollHeight + "px";
        }, 10);
    }

    // ACTUALIZAR VALORES EN ASDAS (EspA/APs)
    updateASDASFromHomunculus();

    // ACTUALIZAR MDA si estamos en modo APs
    updateMDAFromHomunculus();

    // ACTUALIZAR DAS28 si estamos en modo AR
    updateDAS28FromHomunculus();
}

// Función para actualizar ASDAS desde el homúnculo (solo en seguimiento)
function updateASDASFromHomunculus() {
    const asdasNAD = document.getElementById('asdasNAD');
    const asdasNAT = document.getElementById('asdasNAT');

    if (asdasNAD && asdasNAT) {
        asdasNAD.value = markedRegions.nad.size;
        asdasNAT.value = markedRegions.nat.size;

        // Intentar llamar a calcularASDAS si existe (solo en seguimiento)
        if (typeof window.calcularASDASLocal === 'function') {
            window.calcularASDASLocal();
        }
    }
}

// Función para actualizar MDA desde el homúnculo
function updateMDAFromHomunculus() {
    if (typeof window.calcularMDALocal === 'function') {
        window.calcularMDALocal();
    }
}

/**
 * Devuelve recuentos NAD y NAT filtrados a las 28 articulaciones DAS28.
 * Excluye caderas y tobillos.
 */
function getDAS28JointCounts() {
    const nad28 = [...markedRegions.nad].filter(id => DAS28_ARTICULATIONS.includes(id)).length;
    const nat28 = [...markedRegions.nat].filter(id => DAS28_ARTICULATIONS.includes(id)).length;
    return { nad28, nat28 };
}

// Función para actualizar DAS28 desde el homúnculo (solo AR)
function updateDAS28FromHomunculus() {
    const das28NAD = document.getElementById('das28NAD');
    const das28NAT = document.getElementById('das28NAT');

    if (das28NAD && das28NAT) {
        const { nad28, nat28 } = getDAS28JointCounts();
        das28NAD.value = nad28;
        das28NAT.value = nat28;

        // Recalcular DAS28/CDAI/SDAI si existe la función
        if (typeof window.calcularDAS28Local === 'function') {
            window.calcularDAS28Local();
        }
    }
}

function applyRegionClasses() {
    bodyRegions.forEach(region => {
        const regionId = region.dataset.regionId;

        region.classList.remove('marked-nad', 'marked-nat', 'marked-dactilitis', 'other-mode-marked', 'double-marked-nad-nat');

        let markedInActiveMode = false;
        let markedInOtherModes = [];

        for (const mode in markedRegions) {
            if (markedRegions[mode].has(regionId)) {
                if (mode === activeMode) {
                    markedInActiveMode = true;
                } else {
                    markedInOtherModes.push(mode);
                }
            }
        }

        const isMarkedNAD = markedRegions.nad.has(regionId);
        const isMarkedNAT = markedRegions.nat.has(regionId);

        if (isMarkedNAD && isMarkedNAT) {
            region.classList.add('double-marked-nad-nat');
            region.classList.add(`marked-${activeMode}`);
        }
        else if (markedInActiveMode) {
            region.classList.add(`marked-${activeMode}`);
        }
        else if (markedInOtherModes.length > 0) {
            region.classList.add('other-mode-marked');
            region.classList.add(`marked-${markedInOtherModes[0]}`);
        }
    });
}

function setActiveMode(mode) {
    activeMode = mode;

    homunculusModeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    applyRegionClasses();
}

function clearHomunculusInternal() {
    for (const mode in markedRegions) {
        markedRegions[mode].clear();
    }
    applyRegionClasses();
    updateScores();
}

// =====================================
// INICIALIZACIÓN DEL HOMÚNCULO
// =====================================

function setupEventListeners() {
    // Event listeners para los botones de modo
    homunculusModeBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            setActiveMode(this.dataset.mode);
        });
    });

    // Event listeners para las regiones del cuerpo
    bodyRegions.forEach(region => {
        region.addEventListener('click', function () {
            const regionId = this.dataset.regionId;
            const regionType = this.dataset.type;

            if (activeMode === 'dactilitis' && regionType !== 'dactylitis') return;
            if ((activeMode === 'nad' || activeMode === 'nat') && regionType !== 'articulation') return;

            if (markedRegions[activeMode].has(regionId)) {
                markedRegions[activeMode].delete(regionId);
            } else {
                markedRegions[activeMode].add(regionId);
            }

            applyRegionClasses();
            updateScores();
        });
    });

    // Botón para limpiar todas las marcas
    clearHomunculusBtn.addEventListener('click', clearHomunculusInternal);
}

// =====================================
// INTERFAZ DEL MÓDULO (FUNCIONES EXPORTABLES)
// =====================================

function initHomunculus() {
    // Obtener referencias a los elementos del DOM
    homunculusModeBtns = document.querySelectorAll('.homunculus-mode-btn');
    humanBodySvg = document.getElementById('humanBodySvg');
    bodyRegions = humanBodySvg.querySelectorAll('.body-region');
    clearHomunculusBtn = document.getElementById('clearHomunculusBtn');

    // Referencias a los elementos de contadores en el DOM
    scoreElements = {
        nad: document.getElementById('nadScore'),
        nat: document.getElementById('natScore'),
        dactilitis: document.getElementById('dactilitisScore')
    };

    // Configurar event listeners
    setupEventListeners();

    // Inicializar estado
    setActiveMode('nad');
    updateScores();
}

function getHomunculusData() {
    return {
        nad: Array.from(markedRegions.nad),
        nat: Array.from(markedRegions.nat),
        dactilitis: Array.from(markedRegions.dactilitis)
    };
}

/**
 * Limpia todas las articulaciones marcadas (NAD, NAT, dactilitis)
 * NOTA: Esta función reemplaza la versión anterior que tenía un bug de recursión infinita
 */
function clearHomunculus() {
    clearHomunculusInternal();
}

function setHomunculusData(data) {
    if (data.nad) {
        markedRegions.nad = new Set(data.nad);
    }
    if (data.nat) {
        markedRegions.nat = new Set(data.nat);
    }
    if (data.dactilitis) {
        markedRegions.dactilitis = new Set(data.dactilitis);
    }

    applyRegionClasses();
    updateScores();
}

// =====================================
// EXPOSICIÓN AL NAMESPACE HUBTOOLS
// =====================================

// Exponer funciones al namespace global HubTools
if (typeof HubTools !== 'undefined') {
    HubTools.homunculus.initHomunculus = initHomunculus;
    HubTools.homunculus.getHomunculusData = getHomunculusData;
    HubTools.homunculus.clearHomunculus = clearHomunculus;
    HubTools.homunculus.setHomunculusData = setHomunculusData;

    // Exponer constantes críticas para validación y uso externo
    HubTools.homunculus.ARTICULATIONS = HOMUNCULUS_ARTICULATIONS;
    HubTools.homunculus.DACTILITIS = HOMUNCULUS_DACTILITIS;
    HubTools.homunculus.DAS28_ARTICULATIONS = DAS28_ARTICULATIONS;
    HubTools.homunculus.getDAS28JointCounts = getDAS28JointCounts;

    console.log('✅ Módulo homunculus cargado (bug línea 203 corregido)');
} else {
    console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js primero.');
}