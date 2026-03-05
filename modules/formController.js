// ============================================
// HUB CLÍNICO REUMATOLÓGICO - CONTROLADOR DE FORMULARIO
// ============================================
// Módulo centralizado para lógica compartida de formularios
// Contiene funciones comunes entre primera_visita y seguimiento
//
// FUNCIONES CENTRALIZADAS:
// ✅ Utilitarias de gestión CSS
// ✅ Adaptación dinámica del formulario según patología
// ✅ Gestión de secciones colapsables
// ✅ Validación y cálculo de IMC
// ✅ Gestión de tratamientos
// ✅ Exportación y guardado
//
// FECHA DE CREACIÓN: Octubre 2024
// DESARROLLADOR: Kilo Code (AI Assistant)
// ============================================

// =====================================
// FUNCIONES UTILITARIAS PARA GESTIÓN CSS
// =====================================

// Función utilitaria para mostrar elementos con diferentes tipos de display
function showElement(elementId, displayType = 'block') {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = displayType;
        console.log(`✅ Elemento ${elementId} mostrado con display: ${displayType}`);
    } else {
        console.warn(`⚠️ Elemento ${elementId} no encontrado`);
    }
}

// Función utilitaria para ocultar elementos
function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
        console.log(`✅ Elemento ${elementId} ocultado`);
    } else {
        console.warn(`⚠️ Elemento ${elementId} no encontrado`);
    }
}

// Función utilitaria para mostrar elementos por selector CSS
function showElementsBySelector(selector, displayType = 'block') {
    document.querySelectorAll(selector).forEach(el => {
        if (el.classList.contains('toggle-btn')) {
            el.style.display = 'inline-block';
        } else {
            el.style.display = displayType;
        }
    });
    console.log(`✅ Elementos con selector "${selector}" mostrados`);
}

// Función utilitaria para ocultar elementos por selector CSS
function hideElementsBySelector(selector) {
    document.querySelectorAll(selector).forEach(el => {
        el.style.display = 'none';
    });
    console.log(`✅ Elementos con selector "${selector}" ocultados`);
}

// =====================================
// VARIABLES GLOBALES
// =====================================

let currentPathology = ''; // Patología activa actual
let asasInitialized = false; // Control de inicialización ASAS
let casparInitialized = false; // Control de inicialización CASPAR

// =====================================
// FUNCIÓN DE ADAPTACIÓN DEL FORMULARIO (CORREGIDA)
// =====================================

function adaptarFormulario(diagnostico) {
    currentPathology = diagnostico;

    // Ocultar todos los elementos específicos primero
    ocultarTodosElementosEspecificos();

    // Actualizar título y subtítulo
    const patologiaHighlight = document.getElementById('patologiaHighlight');
    const patologiaSubtitle = document.getElementById('patologiaSubtitle');

    switch (diagnostico) {
        case 'espa':
            patologiaHighlight.textContent = 'EspA';
            patologiaSubtitle.textContent = 'Espondiloartritis Axial';
            mostrarElementosEspA();
            break;
        case 'aps':
            patologiaHighlight.textContent = 'APs';
            patologiaSubtitle.textContent = 'Artritis Psoriásica';
            mostrarElementosAPs();
            break;
        case 'ar':
            patologiaHighlight.textContent = 'AR';
            patologiaSubtitle.textContent = 'Artritis Reumatoide';
            mostrarElementosAR();
            break;
        default:
            patologiaHighlight.textContent = 'Reumatología';
            patologiaSubtitle.textContent = 'Seleccione sospecha diagnóstica para adaptar el formulario';
            break;
    }

    // Recalcular alturas de secciones colapsables abiertas
    refreshOpenCollapsibles();
}

function ocultarTodosElementosEspecificos() {
    console.log('🔄 Ocultando todos los elementos específicos de patología');

    // Ocultar todos los elementos con clases específicas de patología
    const selectors = ['.espa-only', '.aps-only', '.espa-aps-only', '.ar-only'];
    selectors.forEach(selector => hideElementsBySelector(selector));

    // Ocultar biomarcadores
    const biomarkers = ['hlaB27Container', 'frContainer', 'apccContainer', 'anaContainer'];
    biomarkers.forEach(id => hideElement(id));

    // Resetear banderas de inicialización de criterios
    asasInitialized = false;
    casparInitialized = false;
    acrEularInitialized = false;

    console.log('✅ Todos los elementos específicos ocultados');
}

function mostrarElementosEspA() {
    console.log('📋 Mostrando elementos específicos de EspA');

    // Biomarcadores: Solo HLA-B27
    showElement('hlaB27Container', 'block');

    // Secciones específicas de EspA
    showElementsBySelector('.espa-only', 'block');

    // Secciones compartidas EspA-APs
    showElementsBySelector('.espa-aps-only', 'block');

    // Mostrar secciones de exploración específicas
    const elementosEspecificos = [
        'dolorAxialSection', 'metrologiaSection', 'entesitisTitle',
        'entesitisSection', 'apofisalgiaCheckbox', 'maniobrasSacroiliacasGroup',
        'comentariosSacroiliacasGroup', 'criteriosASASSection'
    ];

    elementosEspecificos.forEach(id => showElement(id, 'block'));

    // Inicializar funcionalidad ASAS
    setTimeout(() => initializeASAS(), 100);

    console.log('✅ Elementos EspA mostrados correctamente');
}

function mostrarElementosAPs() {
    console.log('📋 Mostrando elementos específicos de APs');

    // Biomarcadores: HLA-B27 + FR + aPCC (clínica mixta)
    const containers = ['hlaB27Container', 'frContainer', 'apccContainer'];
    containers.forEach(id => showElement(id, 'block'));

    // Secciones específicas de APs
    showElementsBySelector('.aps-only', 'block');

    // Secciones compartidas EspA-APs
    showElementsBySelector('.espa-aps-only', 'block');

    // Mostrar secciones específicas
    const elementosAPs = [
        'inicioPsoriasisSection', 'dolorAxialSection', 'clinicaAxialPreguntaSection',
        'afectacionPsoriasisSection', 'tratamientosPsoriasisSection', 'metrologiaSection',
        'entesitisTitle', 'entesitisSection', 'apofisalgiaCheckbox',
        'maniobrasSacroiliacasGroup', 'comentariosSacroiliacasGroup', 'criteriosCASPARSection'
    ];

    elementosAPs.forEach(id => showElement(id, 'block'));

    // Inicializar funcionalidad CASPAR
    setTimeout(() => initializeCASPAR(), 100);

    console.log('✅ Elementos APs mostrados correctamente');
}

var acrEularInitialized = false;

function mostrarElementosAR() {
    console.log('📋 Mostrando elementos específicos de AR');

    // Biomarcadores: FR + Anti-CCP + ANA
    const containers = ['frContainer', 'apccContainer', 'anaContainer'];
    containers.forEach(id => showElement(id, 'block'));

    // Secciones específicas de AR
    showElementsBySelector('.ar-only', 'block');

    // Mostrar secciones específicas
    const elementosAR = [
        'criteriosACREULARSection', 'seccionesClinicasARSection',
        'das28CrpSection', 'das28EsrSection', 'evaMedicoSection',
        'cdaiSection', 'sdaiSection',
        'entesitisTitle', 'entesitisSection',
        'haqSection', 'rapid3Section'
    ];
    elementosAR.forEach(id => showElement(id, 'block'));

    // Ocultar botón dactilitis del homúnculo (AR no usa dactilitis)
    const dactilitisBtn = document.querySelector('[data-mode="dactilitis"]');
    if (dactilitisBtn) dactilitisBtn.style.display = 'none';

    // Inicializar funcionalidad ACR/EULAR
    setTimeout(() => initializeACREULAR(), 100);

    // Toggle nódulos / erosiones
    const nodulosCheck = document.getElementById('nodulosReumatoideos');
    if (nodulosCheck) {
        nodulosCheck.addEventListener('change', function () {
            document.getElementById('nodulosLocalizacion').style.display = this.checked ? 'block' : 'none';
        });
    }
    const erosionesCheck = document.getElementById('erosionesRadiologicas');
    if (erosionesCheck) {
        erosionesCheck.addEventListener('change', function () {
            document.getElementById('erosionesDescripcion').style.display = this.checked ? 'block' : 'none';
        });
    }

    // Seguimiento variants (Seg suffix IDs)
    const nodulosCheckSeg = document.getElementById('nodulosReumatoideosSeg');
    if (nodulosCheckSeg) {
        nodulosCheckSeg.addEventListener('change', function () {
            document.getElementById('nodulosLocalizacionSeg').style.display = this.checked ? 'block' : 'none';
        });
    }
    const erosionesCheckSeg = document.getElementById('erosionesRadiologicasSeg');
    if (erosionesCheckSeg) {
        erosionesCheckSeg.addEventListener('change', function () {
            document.getElementById('erosionesDescripcionSeg').style.display = this.checked ? 'block' : 'none';
        });
    }

    console.log('✅ Elementos AR mostrados correctamente');
}

function initializeACREULAR() {
    if (acrEularInitialized) return;
    acrEularInitialized = true;

    const selects = ['acrArticulaciones', 'acrSerologia', 'acrReactantes', 'acrDuracion'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', recalcularACREULAR);
        }
    });
    recalcularACREULAR();
    console.log('✅ ACR/EULAR 2010 inicializado');
}

function recalcularACREULAR() {
    const a = parseInt(document.getElementById('acrArticulaciones')?.value) || 0;
    const b = parseInt(document.getElementById('acrSerologia')?.value) || 0;
    const c = parseInt(document.getElementById('acrReactantes')?.value) || 0;
    const d = parseInt(document.getElementById('acrDuracion')?.value) || 0;
    const total = a + b + c + d;

    const scoreEl = document.getElementById('puntuacionACREULAR');
    const resultEl = document.getElementById('resultadoACREULAR');
    const boxEl = document.getElementById('acrResultBox');

    if (scoreEl) scoreEl.textContent = total;
    if (resultEl) {
        if (total >= 6) {
            resultEl.textContent = 'Clasifica como AR definida (≥6)';
            resultEl.style.color = '#dc3545';
            if (boxEl) boxEl.style.borderColor = '#dc3545';
        } else {
            resultEl.textContent = 'No clasifica como AR (<6)';
            resultEl.style.color = '#28a745';
            if (boxEl) boxEl.style.borderColor = '#28a745';
        }
    }
}


// =====================================
// SECCIONES COLAPSABLES - CORREGIDO
// =====================================

function inicializarCollapsibles() {
    console.log('🔄 Inicializando secciones colapsables...');

    const collapsibleHeaders = document.getElementsByClassName("collapsible-header");

    for (let i = 0; i < collapsibleHeaders.length; i++) {
        const header = collapsibleHeaders[i];

        // Evitar duplicar event listeners
        if (header.hasAttribute('data-collapsible-initialized')) {
            continue;
        }

        header.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();

            const isActive = this.classList.contains("active");
            const content = this.nextElementSibling;
            const arrow = this.querySelector('.arrow');

            if (isActive) {
                // Colapsar sección
                this.classList.remove("active");
                if (arrow) arrow.classList.remove('fa-chevron-up');
                if (arrow) arrow.classList.add('fa-chevron-down');

                content.style.maxHeight = "0px";
                content.style.opacity = "0";
                content.style.padding = "0 25px";

                // Recalcular altura de secciones padre después del colapso
                setTimeout(() => {
                    refreshCollapsibleHeights();
                }, 300);

            } else {
                // Expandir sección
                this.classList.add("active");
                if (arrow) arrow.classList.remove('fa-chevron-down');
                if (arrow) arrow.classList.add('fa-chevron-up');

                content.style.display = "block";
                content.style.maxHeight = content.scrollHeight + "px";
                content.style.opacity = "1";
                content.style.padding = "15px 25px";

                // Scroll the header into view so content expands downward visually
                setTimeout(() => {
                    this.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);

                // Recalcular altura después de la expansión
                setTimeout(() => {
                    content.style.maxHeight = content.scrollHeight + "px";
                    refreshCollapsibleHeights();
                }, 100);
            }
        });

        header.setAttribute('data-collapsible-initialized', 'true');
    }

    console.log(`✅ Secciones colapsables inicializadas: ${collapsibleHeaders.length}`);
}

// Función mejorada para refrescar alturas de secciones colapsables
function refreshCollapsibleHeights() {
    setTimeout(() => {
        document.querySelectorAll('.collapsible-content').forEach(content => {
            const header = content.previousElementSibling;
            if (header && header.classList.contains('active')) {
                // Solo recalcular si la sección está activa (expandida)
                const newHeight = content.scrollHeight;
                const currentMaxHeight = parseInt(content.style.maxHeight) || 0;

                // Solo actualizar si hay diferencia significativa
                if (Math.abs(newHeight - currentMaxHeight) > 10) {
                    content.style.maxHeight = newHeight + "px";
                }
            }
        });
    }, 100);
}

// Función para refrescar alturas de colapsables abiertos (solución robusta)
function refreshOpenCollapsibles() {
    setTimeout(() => {
        document.querySelectorAll('.collapsible-header.active').forEach(header => {
            const content = header.nextElementSibling;
            if (content) {
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
        console.log('Alturas de colapsables abiertos, recalibradas.');
    }, 150); // Delay para esperar el repintado del DOM
}

// =====================================
// VALIDACIÓN Y CÁLCULOS
// =====================================

function validarFormulario() {
    const errores = [];

    if (!document.getElementById('idPaciente').value.trim()) {
        errores.push('ID del Paciente');
    }
    if (!document.getElementById('fechaVisita').value) {
        errores.push('Fecha de la Visita');
    }
    if (!document.getElementById('diagnosticoPrimario').value) {
        errores.push('Diagnóstico Primario');
    }

    const diagnostico = (document.getElementById('diagnosticoPrimario')?.value || '').toLowerCase();
    if (diagnostico === 'ar') {
        errores.push(...validarCamposAR(false));
    }

    return errores;
}

function validarFormularioSeguimiento() {
    const errores = [];

    if (!document.getElementById('idPaciente')?.value?.trim()) {
        errores.push('ID del Paciente');
    }
    if (!document.getElementById('fechaVisita')?.value) {
        errores.push('Fecha de la Visita');
    }
    if (!document.getElementById('diagnosticoPrimario')?.value) {
        errores.push('Diagnóstico Primario');
    }

    const diagnostico = (document.getElementById('diagnosticoPrimario')?.value || '').toLowerCase();
    if (diagnostico === 'ar') {
        errores.push(...validarCamposAR(true));
    }

    return errores;
}

function validarCamposAR(esSeguimiento) {
    const errores = [];
    const suffix = esSeguimiento ? 'Seg' : '';

    const evaMedico = document.getElementById('evaMedico')?.value;
    if (evaMedico === undefined || evaMedico === null || evaMedico === '') {
        errores.push('EVA Médico (AR)');
    }

    const requiredScoreIds = ['das28CrpResult', 'das28EsrResult', 'cdaiResult', 'sdaiResult', 'das28NAD', 'das28NAT'];
    requiredScoreIds.forEach(id => {
        const value = document.getElementById(id)?.value;
        if (value === undefined || value === null || value === '') {
            errores.push(`${id} (AR)`);
        }
    });

    const rigidezAR = document.getElementById(`rigidezMatutinaAR${suffix}`)?.value;
    if (rigidezAR === undefined || rigidezAR === null || rigidezAR === '') {
        errores.push(`Rigidez Matutina AR${esSeguimiento ? ' (seguimiento)' : ''}`);
    }

    const anaBtn = document.querySelector('.ana-btn.active');
    const ana = (anaBtn?.dataset?.value || 'no-analizado').toLowerCase();
    if (ana === 'no-analizado' || ana === 'nd' || ana === '') {
        errores.push('ANA');
    }

    return errores;
}

function normalizarEstado(value, fallback = 'ND') {
    if (value === true) return 'SI';
    if (value === false) return 'NO';
    if (value === undefined || value === null) return fallback;

    const normalized = String(value).trim().toUpperCase();
    if (!normalized) return fallback;
    if (normalized === 'SI' || normalized === 'NO' || normalized === 'ND' || normalized === 'NA') {
        return normalized;
    }
    if (normalized === 'NO-ANALIZADO' || normalized === 'NO ANALIZADO') return 'ND';
    return normalized;
}

function collectTreatmentEntries(primarySelectId, primaryDoseId, extrasContainerId) {
    const entries = [];

    const addEntry = (farmaco, dosis) => {
        const drug = (farmaco || '').trim();
        if (!drug || drug.toLowerCase() === 'no') return;
        entries.push({
            farmaco: drug,
            dosis: (dosis || '').trim()
        });
    };

    const primarySelect = document.getElementById(primarySelectId);
    const primaryDose = document.getElementById(primaryDoseId);
    addEntry(primarySelect?.value, primaryDose?.value);

    const container = extrasContainerId ? document.getElementById(extrasContainerId) : null;
    if (container) {
        container.querySelectorAll('.treatment-extra').forEach(line => {
            const select = line.querySelector('select');
            const dose = line.querySelector('input[type="text"]');
            addEntry(select?.value, dose?.value);
        });
    }

    return entries;
}

function getTreatmentSlot(entries, index) {
    const item = Array.isArray(entries) ? entries[index] : null;
    return item || { farmaco: '', dosis: '' };
}

const HOMUNCULUS_ARTICULATIONS = [
    'hombro-derecho', 'hombro-izquierdo', 'codo-derecho', 'codo-izquierdo',
    'muneca-derecha', 'muneca-izquierda', 'rodilla-derecha', 'rodilla-izquierda',
    'mcf1-derecha', 'mcf2-derecha', 'mcf3-derecha', 'mcf4-derecha', 'mcf5-derecha',
    'mcf1-izquierda', 'mcf2-izquierda', 'mcf3-izquierda', 'mcf4-izquierda', 'mcf5-izquierda',
    'ifp1-derecha', 'ifp2-derecha', 'ifp3-derecha', 'ifp4-derecha', 'ifp5-derecha',
    'ifp1-izquierda', 'ifp2-izquierda', 'ifp3-izquierda', 'ifp4-izquierda', 'ifp5-izquierda'
];

const HOMUNCULUS_DACTILITIS = [
    'dactilitis-dedo1-mano-derecha', 'dactilitis-dedo2-mano-derecha', 'dactilitis-dedo3-mano-derecha',
    'dactilitis-dedo4-mano-derecha', 'dactilitis-dedo5-mano-derecha',
    'dactilitis-dedo1-mano-izquierda', 'dactilitis-dedo2-mano-izquierda', 'dactilitis-dedo3-mano-izquierda',
    'dactilitis-dedo4-mano-izquierda', 'dactilitis-dedo5-mano-izquierda',
    'dactilitis-dedo1-pie-derecho', 'dactilitis-dedo2-pie-derecho', 'dactilitis-dedo3-pie-derecho',
    'dactilitis-dedo4-pie-derecho', 'dactilitis-dedo5-pie-derecho',
    'dactilitis-dedo1-pie-izquierdo', 'dactilitis-dedo2-pie-izquierdo', 'dactilitis-dedo3-pie-izquierdo',
    'dactilitis-dedo4-pie-izquierdo', 'dactilitis-dedo5-pie-izquierdo'
];

function createHomunculusMap(regions, selectedRegions) {
    const active = new Set(Array.isArray(selectedRegions) ? selectedRegions : []);
    const map = {};
    regions.forEach(region => {
        map[region] = active.has(region) ? 'SI' : 'NO';
    });
    return map;
}


// =====================================
// TRATAMIENTOS PREVIOS Y PLAN TERAPÉUTICO
// =====================================

function setupTreatmentControls(selectId, doseId) {
    const selectEl = document.getElementById(selectId);
    const doseEl = document.getElementById(doseId);
    if (!selectEl || !doseEl) return;

    const handler = () => {
        const value = (selectEl.value || '').toLowerCase();
        const inactive = !selectEl.value || value === 'no';

        if (inactive) {
            doseEl.value = '';
            doseEl.disabled = true;
            doseEl.style.background = '#f8fafc';
            doseEl.style.color = '#64748b';
        } else {
            doseEl.disabled = false;
            doseEl.style.background = '#fff';
            doseEl.style.color = '#1e293b';
            // Enfocar automáticamente el campo de dosis para entrada inmediata
            setTimeout(() => {
                doseEl.focus();
            }, 100);
        }
    };

    selectEl.addEventListener('change', handler);
    handler(); // Ejecutar al cargar
}

function inicializarEventosTratamientos() {
    // 1. Activar/Desactivar inputs de dosis según el select
    const treatmentSelects = document.querySelectorAll('.treatment-select, .tratamiento-dropdown');
    treatmentSelects.forEach(select => {
        const container = select.closest('.treatment-controls, .treatment-controls-improved, .treatment-line, .treatment-group');
        if (!container) return;

        const doseInput = container.querySelector('.treatment-dose-input, .treatment-dose-input-improved, .dosis-input');
        if (!doseInput) return;

        const handler = () => {
            const value = (select.value || '').toLowerCase();
            const inactive = !select.value || value === 'no';

            if (inactive) {
                doseInput.value = '';
                doseInput.disabled = true;
                doseInput.style.background = '#f8fafc';
                doseInput.style.color = '#64748b';
            } else {
                doseInput.disabled = false;
                doseInput.style.background = '#fff';
                doseInput.style.color = '#1e293b';
            }
        };

        select.removeEventListener('change', handler);
        select.addEventListener('change', handler);
        handler();
    });

    // 2. Botones de agregar línea de tratamiento (+)
    const addButtons = document.querySelectorAll('.add-treatment-line-btn');
    addButtons.forEach(btn => {
        if (btn.dataset.listenerAttached) return;
        btn.dataset.listenerAttached = 'true';

        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            let containerId = '';
            let options = ['No'];

            if (type === 'sistemico') containerId = 'sistemicosExtras';
            else if (type === 'fame') containerId = 'famesExtras';
            else if (type === 'biologico') containerId = 'biologicosExtras';
            else if (type === 'plan-sistemico') containerId = 'planSistemicosExtras';
            else if (type === 'plan-fame') containerId = 'planFamesExtras';
            else if (type === 'plan-biologico') containerId = 'planBiologicosExtras';
            else if (type === 'cambio-sistemico') containerId = 'cambioSistemicosExtras';
            else if (type === 'cambio-fame') containerId = 'cambioFamesExtras';
            else if (type === 'cambio-biologico') containerId = 'cambioBiologicosExtras';

            let originalSelectId = '';
            if (type === 'sistemico') originalSelectId = 'previoSistemicoSelect';
            else if (type === 'fame') originalSelectId = 'previoFameSelect';
            else if (type === 'biologico') originalSelectId = 'previoBiologicoSelect';
            else if (type === 'plan-sistemico') originalSelectId = 'sistemicoSelect';
            else if (type === 'plan-fame') originalSelectId = 'fameSelect';
            else if (type === 'plan-biologico') originalSelectId = 'biologicoSelect';
            else if (type === 'cambio-sistemico') originalSelectId = 'cambioSistemicoSelect';
            else if (type === 'cambio-fame') originalSelectId = 'cambioFameSelect';
            else if (type === 'cambio-biologico') originalSelectId = 'cambioBiologicoSelect';

            const originalSelect = document.getElementById(originalSelectId);
            if (originalSelect) {
                options = Array.from(originalSelect.options).map(o => o.value);
            }

            const container = document.getElementById(containerId);
            if (container) {
                const newLine = HubTools.form.createTreatmentLine(type, options);
                container.appendChild(newLine);
                inicializarEventosTratamientos();
            }
        });
    });
}


function createTreatmentLine(type, options, improved = false) {
    const line = document.createElement('div');
    line.classList.add(improved ? 'treatment-line-improved' : 'treatment-line', 'treatment-extra');

    const select = document.createElement('select');
    select.classList.add(improved ? 'treatment-select-improved' : 'treatment-select');
    if (improved) select.classList.add('tratamiento-dropdown');
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === 'No') option.selected = true;
        select.appendChild(option);
    });

    const input = document.createElement('input');
    input.type = 'text';
    input.classList.add(improved ? 'treatment-dose-input-improved' : 'treatment-dose-input');
    if (improved) input.classList.add('dosis-input');
    input.placeholder = 'Dosis / frecuencia';
    input.disabled = true;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.classList.add('remove-treatment-line-btn');
    removeBtn.innerHTML = '<i class="fas fa-minus-circle"></i>';
    removeBtn.title = 'Eliminar';

    select.addEventListener('change', function () {
        input.disabled = (this.value === 'No');
        if (this.value === 'No') input.value = '';
    });

    removeBtn.addEventListener('click', function () {
        line.remove();
    });

    const controls = document.createElement('div');
    controls.classList.add(improved ? 'treatment-controls-improved' : 'treatment-controls');
    controls.appendChild(select);
    controls.appendChild(input);
    controls.appendChild(removeBtn);

    line.appendChild(controls);
    return line;
}

function mostrarModalTexto(texto, titulo, mensaje) {
    const modalHtml = `
    <div id="textoModalContainer" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
        <div style="background:white; padding:20px; border-radius:8px; width:80%; max-width:600px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <h3 style="margin-top:0; color:#1e293b; font-size:18px;">${titulo || 'Texto Estructurado'}</h3>
            <p style="color:#475569; font-size:14px; margin-bottom:15px;">${mensaje || 'Copia el texto manualmente:'}</p>
            <textarea id="textoModalTextarea" style="width:100%; height:300px; padding:10px; border:1px solid #cbd5e1; border-radius:4px; font-family:monospace; font-size:12px; resize:vertical;">${texto}</textarea>
            <div style="margin-top:15px; display:flex; justify-content:flex-end; gap:10px;">
                <button type="button" id="btnCopiarTextoModal" style="background:#0ea5e9; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">Copiar y Cerrar</button>
                <button type="button" id="btnCerrarTextoModal" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:8px 16px; border-radius:4px; cursor:pointer;">Cerrar</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const container = document.getElementById('textoModalContainer');
    const textarea = document.getElementById('textoModalTextarea');
    const btnCopiar = document.getElementById('btnCopiarTextoModal');
    const btnCerrar = document.getElementById('btnCerrarTextoModal');

    textarea.focus();
    textarea.select();

    btnCopiar.addEventListener('click', () => {
        textarea.select();
        try {
            document.execCommand('copy');
            if (typeof HubTools !== 'undefined' && HubTools.utils && HubTools.utils.mostrarNotificacion) {
                HubTools.utils.mostrarNotificacion('Texto copiado al portapapeles', 'success');
            } else {
                alert('Texto copiado al portapapeles');
            }
        } catch (err) {
            console.error('Error al copiar el texto manualmente:', err);
        }
        container.remove();
    });

    btnCerrar.addEventListener('click', () => container.remove());
}

function mostrarContinuar() {
    const btnContinuarTratamiento = document.getElementById('btnContinuarTratamiento');
    const btnCambiarTratamiento = document.getElementById('btnCambiarTratamiento');
    const continuarTratamientoContent = document.getElementById('continuarTratamientoContent');
    const cambiarTratamientoContent = document.getElementById('cambioTratamientoContent');

    if (!continuarTratamientoContent || !cambiarTratamientoContent) return;

    continuarTratamientoContent.classList.remove('conditional-field-hidden');
    continuarTratamientoContent.style.display = 'block';

    cambiarTratamientoContent.classList.add('conditional-field-hidden');
    cambiarTratamientoContent.style.display = 'none';

    if (btnContinuarTratamiento) btnContinuarTratamiento.classList.add('active');
    if (btnCambiarTratamiento) btnCambiarTratamiento.classList.remove('active');

    refreshCollapsibleHeights();
}

function mostrarCambio() {
    const btnContinuarTratamiento = document.getElementById('btnContinuarTratamiento');
    const btnCambiarTratamiento = document.getElementById('btnCambiarTratamiento');
    const continuarTratamientoContent = document.getElementById('continuarTratamientoContent');
    const cambiarTratamientoContent = document.getElementById('cambioTratamientoContent');

    if (!continuarTratamientoContent || !cambiarTratamientoContent) return;

    continuarTratamientoContent.classList.add('conditional-field-hidden');
    continuarTratamientoContent.style.display = 'none';

    cambiarTratamientoContent.classList.remove('conditional-field-hidden');
    cambiarTratamientoContent.style.display = 'block';

    if (btnContinuarTratamiento) btnContinuarTratamiento.classList.remove('active');
    if (btnCambiarTratamiento) btnCambiarTratamiento.classList.add('active');

    refreshCollapsibleHeights();
}

// =====================================
// EXPORTACIÓN Y GUARDADO
// =====================================

function mostrarModalTexto(texto, titulo = 'Contenido Generado', mensaje = '') {
    // Crear modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
        border-top: 3px solid #2c5aa0;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        max-height: 50vh;
        animation: slideUp 0.4s ease;
        display: flex;
        flex-direction: column;
    `;

    modal.innerHTML = `
        <div style="padding: 20px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; color: #2c5aa0;"><i class="fas fa-file-alt"></i> ${titulo}</h3>
            <div>
                <button id="copyToClipboardModalBtn" style="background: #28a745; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 14px; margin-right: 10px;">
                    <i class="fas fa-copy"></i> Copiar al Portapapeles
                </button>
                <button id="closeModalBtn" style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 14px;">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>
        </div>
        <div style="padding: 20px; overflow-y: auto; flex: 1;">
            ${mensaje ? `<p style="margin-bottom: 15px; color: #555;">${mensaje}</p>` : ''}
            <pre id="modalTextContent" style="background: #f8f9fa; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">${texto}</pre>
        </div>
    `;

    document.body.appendChild(modal);

    // Cerrar modal
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        modal.style.animation = 'slideDown 0.4s ease';
        setTimeout(() => modal.remove(), 400);
    });

    // Copiar al portapapeles desde el modal
    document.getElementById('copyToClipboardModalBtn').addEventListener('click', () => {
        const textToCopy = document.getElementById('modalTextContent').textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            if (typeof HubTools !== 'undefined' && HubTools.utils && typeof HubTools.utils.mostrarNotificacion === 'function') {
                HubTools.utils.mostrarNotificacion('Contenido copiado al portapapeles.', 'success');
            } else {
                alert('Contenido copiado al portapapeles.');
            }
        }).catch(err => {
            console.error('Error al copiar desde el modal:', err);
            if (typeof HubTools !== 'undefined' && HubTools.utils && typeof HubTools.utils.mostrarNotificacion === 'function') {
                HubTools.utils.mostrarNotificacion('Error al copiar desde el modal.', 'error');
            } else {
                alert('Error al copiar desde el modal.');
            }
        });
    });
}

// =====================================
// CRITERIOS DIAGNÓSTICOS (PRIMERA VISITA)
// =====================================

function initializeASAS() {
    if (asasInitialized) return;

    const lumbalgia3mesesCheckbox = document.getElementById('lumbalgia3meses');
    const criteriosASASDetail = document.getElementById('criteriosASASDetail');
    const asasCriterios = document.querySelectorAll('.criterio-asas');
    const numCriteriosASAS = document.getElementById('numCriteriosASAS');
    const resultadoASAS = document.getElementById('resultadoASAS');

    if (!lumbalgia3mesesCheckbox || !criteriosASASDetail) return;

    function updateASASLogic() {
        if (lumbalgia3mesesCheckbox.checked) {
            criteriosASASDetail.style.display = 'block';
            void criteriosASASDetail.offsetHeight;
            requestAnimationFrame(() => {
                const contentHeight = criteriosASASDetail.scrollHeight;
                const extraSpace = 100;
                criteriosASASDetail.style.maxHeight = (contentHeight + extraSpace) + "px";
                criteriosASASDetail.style.opacity = '1';
                criteriosASASDetail.style.pointerEvents = 'auto';

                const parentSection = criteriosASASDetail.closest('.collapsible-content');
                if (parentSection && parentSection.style.maxHeight) {
                    requestAnimationFrame(() => {
                        parentSection.style.maxHeight = parentSection.scrollHeight + extraSpace + "px";
                    });
                }
            });
        } else {
            criteriosASASDetail.style.maxHeight = '0px';
            criteriosASASDetail.style.opacity = '0';
            criteriosASASDetail.style.pointerEvents = 'none';
            setTimeout(() => {
                if (criteriosASASDetail.style.maxHeight === '0px') {
                    criteriosASASDetail.style.display = 'none';
                }
            }, 500);
            asasCriterios.forEach(checkbox => checkbox.checked = false);
        }
        updateASASCount();
    }

    function updateASASCount() {
        let checkedCount = 0;
        if (lumbalgia3mesesCheckbox.checked) {
            asasCriterios.forEach(checkbox => {
                if (checkbox.checked) {
                    checkedCount++;
                }
            });
        }
        numCriteriosASAS.textContent = checkedCount;

        if (lumbalgia3mesesCheckbox.checked && checkedCount >= 4) {
            resultadoASAS.textContent = 'Criterios ASAS CUMPLIDOS';
            resultadoASAS.classList.remove('low');
            resultadoASAS.classList.add('high');
        } else if (lumbalgia3mesesCheckbox.checked) {
            resultadoASAS.textContent = 'Criterios ASAS NO CUMPLIDOS (requiere 4)';
            resultadoASAS.classList.remove('high');
            resultadoASAS.classList.add('low');
        } else {
            resultadoASAS.textContent = 'Marcar "¿Lumbalgia > 3 meses?" para evaluar';
            resultadoASAS.classList.remove('high', 'low');
        }
    }

    lumbalgia3mesesCheckbox.addEventListener('change', function () {
        updateASASLogic();
        setTimeout(() => {
            const parentSection = criteriosASASDetail.closest('.collapsible-content');
            if (parentSection && parentSection.style.maxHeight && parentSection.style.maxHeight !== "0px") {
                parentSection.style.maxHeight = parentSection.scrollHeight + "px";
            }
        }, 600);
    });

    asasCriterios.forEach(checkbox => {
        checkbox.addEventListener('change', updateASASCount);
    });

    updateASASCount();
    asasInitialized = true;
}

function initializeCASPAR() {
    if (casparInitialized) return;

    const casparCriterios = document.querySelectorAll('.criterio-caspar');
    const puntuacionCASPAR = document.getElementById('puntuacionCASPAR');
    const resultadoCASPAR = document.getElementById('resultadoCASPAR');

    if (!puntuacionCASPAR || !resultadoCASPAR || casparCriterios.length === 0) return;

    function updateCASPARScore() {
        let totalPuntos = 0;
        casparCriterios.forEach(checkbox => {
            if (checkbox.checked) {
                totalPuntos += parseInt(checkbox.dataset.points);
            }
        });

        puntuacionCASPAR.textContent = totalPuntos;

        if (totalPuntos >= 3) {
            resultadoCASPAR.textContent = 'Criterios CASPAR CUMPLIDOS (≥3 puntos)';
            resultadoCASPAR.classList.remove('low');
            resultadoCASPAR.classList.add('high');
        } else {
            resultadoCASPAR.textContent = 'Criterios CASPAR NO CUMPLIDOS (requiere ≥3 puntos)';
            resultadoCASPAR.classList.remove('high');
            resultadoCASPAR.classList.add('low');
        }

        // Recalcular altura de la sección padre
        setTimeout(() => {
            const parentSection = puntuacionCASPAR.closest('.collapsible-content');
            if (parentSection && parentSection.style.maxHeight && parentSection.style.maxHeight !== "0px") {
                parentSection.style.maxHeight = parentSection.scrollHeight + "px";
            }
        }, 50);
    }

    casparCriterios.forEach(checkbox => {
        checkbox.addEventListener('change', updateCASPARScore);
    });

    updateCASPARScore();
    casparInitialized = true;
}

function recopilarDatosFormulario() {
    // 1. Leer todos los campos simples del formulario
    const idPaciente = document.getElementById('idPaciente').value;
    const nombrePaciente = document.getElementById('nombrePaciente').value;
    const fechaVisita = document.getElementById('fechaVisita').value;
    const sexoPaciente = document.getElementById('sexoPaciente').value;
    const tipoVisita = document.body.dataset.formType || '';

    const profesional = document.getElementById('currentProfessional')?.textContent || 'No especificado';

    const diagnosticoPrimario = document.getElementById('diagnosticoPrimario').value;
    const diagnosticoSecundario = document.getElementById('diagnosticoSecundario').value;

    const hlaB27Btn = document.querySelector('.hla-btn.active:not(.fr-btn):not(.apcc-btn)');
    const hlaB27 = hlaB27Btn ? hlaB27Btn.dataset.value : 'no-analizado';

    const frBtn = document.querySelector('.fr-btn.active');
    const fr = frBtn ? frBtn.dataset.value : 'no-analizado';

    const apccBtn = document.querySelector('.apcc-btn.active');
    const apcc = apccBtn ? apccBtn.dataset.value : 'no-analizado';

    const inicioSintomas = document.getElementById('inicioSintomas').value;
    const inicioPsoriasis = document.getElementById('inicioPsoriasis') ? document.getElementById('inicioPsoriasis').value : '';
    const dolorAxial = document.getElementById('dolorAxial').value;
    const rigidezMatutina = document.getElementById('rigidezMatutina').value;
    const duracionRigidez = document.getElementById('duracionRigidez').value;
    const irradiacionNalgas = document.getElementById('irradiacionNalgas').value;
    const clinicaAxialPresente = document.getElementById('clinicaAxialPresente') ? document.getElementById('clinicaAxialPresente').value : '';

    const peso = document.getElementById('peso').value;
    const talla = document.getElementById('talla').value;
    const imc = document.getElementById('imc').value;
    const ta = document.getElementById('ta').value;

    const planSistemicosEntries = collectTreatmentEntries('sistemicoSelect', 'sistemicoDose', 'planSistemicosExtras');
    const planFamesEntries = collectTreatmentEntries('fameSelect', 'fameDose', 'planFamesExtras');
    const planBiologicosEntries = collectTreatmentEntries('biologicoSelect', 'biologicoDose', 'planBiologicosExtras');

    const previoSistemicosEntries = collectTreatmentEntries('previoSistemicoSelect', 'previoSistemicoDose', 'sistemicosExtras');
    const previoFamesEntries = collectTreatmentEntries('previoFameSelect', 'previoFameDose', 'famesExtras');
    const previoBiologicosEntries = collectTreatmentEntries('previoBiologicoSelect', 'previoBiologicoDose', 'biologicosExtras');

    const psoriasisSistemicosEntries = collectTreatmentEntries('psoriasisSistemicoSelect', 'psoriasisSistemicoDose', null);

    const sistemicoSlot1 = getTreatmentSlot(planSistemicosEntries, 0);
    const fameSlot1 = getTreatmentSlot(planFamesEntries, 0);
    const biologicoSlot1 = getTreatmentSlot(planBiologicosEntries, 0);

    const sistemicoSelect = sistemicoSlot1.farmaco || 'No';
    const sistemicoDose = sistemicoSlot1.dosis || '';
    const fameSelect = fameSlot1.farmaco || 'No';
    const fameDose = fameSlot1.dosis || '';
    const biologicoSelect = biologicoSlot1.farmaco || 'No';
    const biologicoDose = biologicoSlot1.dosis || '';
    const fechaProximaRevision = document.getElementById('fechaProximaRevision')?.value || '';

    const comentariosAdicionales = document.getElementById('comentariosAdicionales')?.value || '';

    const homunculusData = HubTools.homunculus.getHomunculusData();
    const nad = homunculusData.nad;
    const nat = homunculusData.nat;
    const dactilitis = homunculusData.dactilitis;
    const homunculusNadMap = createHomunculusMap(HOMUNCULUS_ARTICULATIONS, nad);
    const homunculusNatMap = createHomunculusMap(HOMUNCULUS_ARTICULATIONS, nat);
    const dactilitisMap = createHomunculusMap(HOMUNCULUS_DACTILITIS, dactilitis);

    const tratamientoActualEditable = document.getElementById('tratamientoActualEditable')?.value || '';
    const tratamientoActualReadonly = document.getElementById('tratamientoActual')?.value || '';
    const tratamientoActual = tratamientoActualEditable || tratamientoActualReadonly || '';
    const fechaInicioTratamiento = document.getElementById('fechaInicioTratamiento')?.value || '';

    const evaGlobal = document.getElementById('evaGlobal')?.value || '';
    const evaDolor = document.getElementById('evaDolor')?.value || '';
    const evaFatiga = document.getElementById('evaFatiga')?.value || '';
    const rigidezMatutinaMin = document.getElementById('rigidezMatutinaMin')?.value || '';
    const dolorNocturno = document.getElementById('dolorNocturno')?.checked ? 'SI' : 'NO';

    const pcr = document.getElementById('pcrValue')?.value || '';
    const vsg = document.getElementById('vsgValue')?.value || '';
    const otrosHallazgosAnalitica = document.getElementById('otrosHallazgosAnalitica')?.value || '';
    const hallazgosRadiografia = document.getElementById('hallazgosRadiografia')?.value || '';
    const hallazgosRMN = document.getElementById('hallazgosRMN')?.value || '';

    const basdaiP1 = document.getElementById('basdaiP1')?.value || '';
    const basdaiP2 = document.getElementById('basdaiP2')?.value || '';
    const basdaiP3 = document.getElementById('basdaiP3')?.value || '';
    const basdaiP4 = document.getElementById('basdaiP4')?.value || '';
    const basdaiP5 = document.getElementById('basdaiP5')?.value || '';
    const basdaiP6 = document.getElementById('basdaiP6')?.value || '';
    const basdaiResult = document.getElementById('basdaiResult')?.value || '';

    const asdasDolorEspalda = document.getElementById('asdasDolorEspalda')?.value || '';
    const asdasDuracionRigidez = document.getElementById('asdasDuracionRigidez')?.value || '';
    const asdasEvaGlobal = document.getElementById('asdasEvaGlobal')?.value || '';
    const asdasCrpResult = document.getElementById('asdasCrpResult')?.value || '';
    const asdasEsrResult = document.getElementById('asdasEsrResult')?.value || '';

    const schober = document.getElementById('schober')?.value || '';
    const rotacionCervical = document.getElementById('rotacionCervical')?.value || '';
    const distanciaOP = document.getElementById('distanciaOP')?.value || '';
    const distanciaTP = document.getElementById('distanciaTP')?.value || '';
    const expansionToracica = document.getElementById('expansionToracica')?.value || '';
    const distanciaIntermaleolar = document.getElementById('distanciaIntermaleolar')?.value || '';

    const continuarBtn = document.getElementById('btnContinuarTratamiento');
    const cambiarBtn = document.getElementById('btnCambiarTratamiento');
    let decisionTerapeutica = 'continuar';
    if (continuarBtn || cambiarBtn) {
        const continuarActivo = continuarBtn?.classList.contains('active');
        const cambiarActivo = cambiarBtn?.classList.contains('active');
        if (cambiarActivo && !continuarActivo) {
            decisionTerapeutica = 'cambiar';
        }
    }
    const tratamientoData = {
        continuar: {
            adherencia: document.getElementById('adherencia')?.value || '',
            ajusteTerapeutico: document.getElementById('ajusteTerapeutico')?.value || ''
        },
        cambio: {
            motivoCambio: document.getElementById('motivoCambio')?.value || '',
            efectosAdversos: document.getElementById('efectosAdversos')?.checked || false,
            descripcionEfectos: document.getElementById('descripcionEfectos')?.value || '',
            sistemicos: {
                farmaco: document.getElementById('cambioSistemicoSelect')?.value || '',
                dosis: document.getElementById('cambioSistemicoDose')?.value || ''
            },
            fames: {
                farmaco: document.getElementById('cambioFameSelect')?.value || '',
                dosis: document.getElementById('cambioFameDose')?.value || ''
            },
            biologicos: {
                farmaco: document.getElementById('cambioBiologicoSelect')?.value || '',
                dosis: document.getElementById('cambioBiologicoDose')?.value || ''
            }
        }
    };

    const afectacionPsoriasis = {
        'cuero-cabelludo': document.querySelector('.toggle-btn[data-value="cuero-cabelludo"].active') ? 'SI' : 'NO',
        'ungueal': document.querySelector('.toggle-btn[data-value="ungueal"].active') ? 'SI' : 'NO',
        'extensora': document.querySelector('.toggle-btn[data-value="extensora"].active') ? 'SI' : 'NO',
        'pliegues': document.querySelector('.toggle-btn[data-value="pliegues"].active') ? 'SI' : 'NO',
        'palmoplantar': document.querySelector('.toggle-btn[data-value="palmoplantar"].active') ? 'SI' : 'NO'
    };

    const extraArticular = {
        'digestiva': document.querySelector('.toggle-btn[data-value="digestiva"].active') ? 'SI' : 'NO',
        'uveitis': document.querySelector('.toggle-btn[data-value="uveitis"].active') ? 'SI' : 'NO',
        'psoriasis': document.querySelector('.toggle-btn[data-value="psoriasis"].active') ? 'SI' : 'NO'
    };

    const comorbilidad = {
        'hta': document.querySelector('.toggle-btn[data-value="hta"].active') ? 'SI' : 'NO',
        'dm': document.querySelector('.toggle-btn[data-value="dm"].active') ? 'SI' : 'NO',
        'dlp': document.querySelector('.toggle-btn[data-value="dlp"].active') ? 'SI' : 'NO',
        'ecv': document.querySelector('.toggle-btn[data-value="ecv"].active') ? 'SI' : 'NO',
        'gastritis': document.querySelector('.toggle-btn[data-value="gastritis"].active') ? 'SI' : 'NO',
        'obesidad': document.querySelector('.toggle-btn[data-value="obesidad"].active') ? 'SI' : 'NO',
        'osteoporosis': document.querySelector('.toggle-btn[data-value="osteoporosis"].active') ? 'SI' : 'NO',
        'gota': document.querySelector('.toggle-btn[data-value="gota"].active') ? 'SI' : 'NO'
    };

    const antecedentesFamiliares = {
        'psoriasis': document.querySelector('.toggle-btn[data-value="psoriasis"].active') ? 'SI' : 'NO',
        'artritis': document.querySelector('.toggle-btn[data-value="artritis"].active') ? 'SI' : 'NO',
        'eii': document.querySelector('.toggle-btn[data-value="eii"].active') ? 'SI' : 'NO',
        'uveitis': document.querySelector('.toggle-btn[data-value="uveitis"].active') ? 'SI' : 'NO'
    };

    const tabacoCheckbox = document.querySelector('input[name="toxico"][value="tabaco"]');
    const tabacoDesc = document.getElementById('tabacoDesc')?.value || '';
    const alcoholCheckbox = document.querySelector('input[name="toxico"][value="alcohol"]');
    const alcoholDesc = document.getElementById('alcoholDesc')?.value || '';
    const drogasCheckbox = document.querySelector('input[name="toxico"][value="drogas"]');
    const drogasDesc = document.getElementById('drogasDesc')?.value || '';

    const toxicos = {
        'tabaco': tabacoCheckbox?.checked ? 'SI' : 'NO',
        'tabaco_desc': tabacoDesc,
        'alcohol': alcoholCheckbox?.checked ? 'SI' : 'NO',
        'alcohol_desc': alcoholDesc,
        'drogas': drogasCheckbox?.checked ? 'SI' : 'NO',
        'drogas_desc': drogasDesc
    };

    const entesitisOptions = [
        'aquiles-der', 'fascia-der', 'epicondilo-lat-der', 'epicondilo-med-der', 'trocanter-der',
        'aquiles-izq', 'fascia-izq', 'epicondilo-lat-izq', 'epicondilo-med-izq', 'trocanter-izq'
    ];
    const entesitis = {};
    entesitisOptions.forEach(opcion => {
        entesitis[opcion] = document.querySelector(`input[name="entesitis"][value="${opcion}"]`)?.checked ? 'SI' : 'NO';
    });
    const otrasEntesitis = document.getElementById('otrasEntesitis')?.value || '';

    // --- AR-specific data ---
    const anaBtn = document.querySelector('.ana-btn.active');
    const ana = anaBtn ? anaBtn.dataset.value : 'no-analizado';

    const das28CrpResult = document.getElementById('das28CrpResult')?.value || '';
    const das28EsrResult = document.getElementById('das28EsrResult')?.value || '';
    const cdaiResult = document.getElementById('cdaiResult')?.value || '';
    const sdaiResult = document.getElementById('sdaiResult')?.value || '';
    const evaMedico = document.getElementById('evaMedico')?.value || '';

    // ACR/EULAR criteria
    const acrArticulaciones = document.getElementById('acrArticulaciones')?.value || '';
    const acrSerologia = document.getElementById('acrSerologia')?.value || '';
    const acrReactantes = document.getElementById('acrReactantes')?.value || '';
    const acrDuracion = document.getElementById('acrDuracion')?.value || '';
    const acrTotalResult = document.getElementById('acrTotalResult')?.value || '';

    // AR clinical sections
    const rigidezMatutinaAR = document.getElementById('rigidezMatutinaAR')?.value || '';
    const nodulosReumatoideos = document.getElementById('nodulosReumatoideos')?.checked ? 'SI' : 'NO';
    const nodulosLocalizacionTexto = document.getElementById('nodulosLocalizacionTexto')?.value || '';
    const erosionesRadiologicas = document.getElementById('erosionesRadiologicas')?.checked ? 'SI' : 'NO';
    const erosionesDescripcionTexto = document.getElementById('erosionesDescripcionTexto')?.value || '';
    const sequedadOcular = document.getElementById('sequedadOcular')?.checked ? 'SI' : 'NO';
    const sequedadOral = document.getElementById('sequedadOral')?.checked ? 'SI' : 'NO';

    // Manifestaciones extraarticulares AR
    const extraArticularAR = {};
    document.querySelectorAll('.extraarticular-ar').forEach(cb => {
        extraArticularAR[cb.dataset.tipo] = cb.checked ? 'SI' : 'NO';
    });

    // MDHAQ (RAPID3)
    const mdhaqData = {};
    ['mdhaqA', 'mdhaqB', 'mdhaqC', 'mdhaqD', 'mdhaqE', 'mdhaqF', 'mdhaqG', 'mdhaqH', 'mdhaqI', 'mdhaqJ'].forEach(id => {
        mdhaqData[id] = document.getElementById(id)?.value || '0';
    });
    const rapid3Total = document.getElementById('rapid3Total')?.textContent || '';
    const rapid3Categoria = document.getElementById('rapid3Categoria')?.textContent || '';

    const das28NAD = document.getElementById('das28NAD')?.value || '';
    const das28NAT = document.getElementById('das28NAT')?.value || '';

    const pasiScore = document.getElementById('pasiValue')?.value || '';
    const bsaPercentage = document.getElementById('bsaValue')?.value || '';
    const psoriasisDescripcion = document.getElementById('psoriasisDescripcion')?.value || '';

    const haqVestirse = document.querySelector('.haq-score[data-category="1"]')?.value || '';
    const haqLevantarse = document.querySelector('.haq-score[data-category="2"]')?.value || '';
    const haqComer = document.querySelector('.haq-score[data-category="3"]')?.value || '';
    const haqCaminar = document.querySelector('.haq-score[data-category="4"]')?.value || '';
    const haqHigiene = document.querySelector('.haq-score[data-category="5"]')?.value || '';
    const haqAlcanzar = document.querySelector('.haq-score[data-category="6"]')?.value || '';
    const haqAgarrar = document.querySelector('.haq-score[data-category="7"]')?.value || '';
    const haqActividades = document.querySelector('.haq-score[data-category="8"]')?.value || '';
    const haqTotal = document.getElementById('haqTotal')?.textContent || '';

    const leiBySite = {};
    document.querySelectorAll('.lei-point').forEach(cb => {
        const key = cb.dataset.site || cb.value || '';
        if (key) {
            leiBySite[key] = cb.checked ? 'SI' : 'NO';
        }
    });
    const leiEpicondiloLatDer = normalizarEstado(leiBySite['epicondilo-lat-der'], 'NO');
    const leiEpicondiloLatIzq = normalizarEstado(leiBySite['epicondilo-lat-izq'], 'NO');
    const leiEpicondiloMedDer = normalizarEstado(leiBySite['condilo-med-der'], 'NO');
    const leiEpicondiloMedIzq = normalizarEstado(leiBySite['condilo-med-izq'], 'NO');
    const leiAquilesDer = normalizarEstado(leiBySite['aquiles-der'], 'NO');
    const leiAquilesIzq = normalizarEstado(leiBySite['aquiles-izq'], 'NO');
    const leiScore = document.getElementById('leiTotal')?.textContent || '';

    const mdaNAT = document.getElementById('mdaNAT')?.textContent || '';
    const mdaNAD = document.getElementById('mdaNAD')?.textContent || '';
    const mdaPASI = document.getElementById('mdaPsoriasis')?.textContent || '';
    const mdaDolor = document.getElementById('mdaEvaDolor')?.textContent || '';
    const mdaGlobal = document.getElementById('mdaEvaGlobal')?.textContent || '';
    const mdaHAQ = document.getElementById('mdaHAQ')?.textContent || '';
    const mdaEntesitis = document.getElementById('mdaLEI')?.textContent || '';
    const mdaCumple = (document.getElementById('mdaResultadoFinal')?.textContent || '').toUpperCase().includes('ALCANZADO');

    const maniobrasSacroiliacas = document.getElementById('maniobrasSacroiliacas')?.value || '';
    const comentariosSacroiliacas = document.getElementById('comentariosSacroiliacas')?.value || '';
    const asasLumbalgia3Meses = document.getElementById('lumbalgia3meses')?.checked ? 'SI' : 'NO';
    const asasCriteriosCumplidos = document.getElementById('numCriteriosASAS')?.textContent || '';
    const asasResultado = document.getElementById('resultadoASAS')?.textContent || '';
    const casparPuntuacion = document.getElementById('puntuacionCASPAR')?.textContent || '';
    const casparResultado = document.getElementById('resultadoCASPAR')?.textContent || '';
    const acrResultadoTexto = document.getElementById('resultadoACREULAR')?.textContent || '';

    const datosCompletos = {
        idPaciente, nombrePaciente, fechaVisita, sexoPaciente, tipoVisita, profesional,
        diagnosticoPrimario, diagnosticoSecundario,
        hlaB27: normalizarEstado(hlaB27),
        fr: normalizarEstado(fr),
        apcc: normalizarEstado(apcc),
        ana: normalizarEstado(ana),
        inicioSintomas, inicioPsoriasis, dolorAxial, rigidezMatutina, duracionRigidez, irradiacionNalgas, clinicaAxialPresente,
        nad, nat, dactilitis, homunculusNadMap, homunculusNatMap, dactilitisMap,
        peso, talla, imc, ta,
        sistemicoSelect, sistemicoDose, fameSelect, fameDose, biologicoSelect, biologicoDose,
        tratamientoActual, fechaInicioTratamiento, fechaProximaRevision,
        evaGlobal, evaDolor, evaFatiga, rigidezMatutinaMin, dolorNocturno,
        pcr, vsg, otrosHallazgosAnalitica, hallazgosRadiografia, hallazgosRMN,
        basdaiP1, basdaiP2, basdaiP3, basdaiP4, basdaiP5, basdaiP6, basdaiResult,
        asdasDolorEspalda, asdasDuracionRigidez, asdasEvaGlobal, asdasCrpResult, asdasEsrResult,
        das28NAD, das28NAT, das28CrpResult, das28EsrResult, cdaiResult, sdaiResult, evaMedico,
        acrArticulaciones, acrSerologia, acrReactantes, acrDuracion, acrTotalResult, acrResultadoTexto,
        rigidezMatutinaAR, nodulosReumatoideos, nodulosLocalizacionTexto,
        erosionesRadiologicas, erosionesDescripcionTexto,
        sequedadOcular, sequedadOral, extraArticularAR,
        mdhaqData, rapid3Total, rapid3Categoria,
        schober, rotacionCervical, distanciaOP, distanciaTP, expansionToracica, distanciaIntermaleolar,
        decisionTerapeutica, tratamientoData,
        afectacionPsoriasis, extraArticular, comorbilidad, antecedentesFamiliares, toxicos, entesitis, otrasEntesitis,
        pasiScore, bsaPercentage, psoriasisDescripcion,
        haqVestirse, haqLevantarse, haqComer, haqCaminar, haqHigiene, haqAlcanzar, haqAgarrar, haqActividades, haqTotal,
        leiEpicondiloLatIzq, leiEpicondiloLatDer, leiEpicondiloMedIzq, leiEpicondiloMedDer, leiAquilesIzq, leiAquilesDer, leiScore,
        mdaNAT, mdaNAD, mdaPASI, mdaDolor, mdaGlobal, mdaHAQ, mdaEntesitis, mdaCumple,
        planSistemicosEntries, planFamesEntries, planBiologicosEntries,
        previoSistemicosEntries, previoFamesEntries, previoBiologicosEntries,
        psoriasisSistemicosEntries,
        maniobrasSacroiliacas, comentariosSacroiliacas,
        asasLumbalgia3Meses, asasCriteriosCumplidos, asasResultado,
        casparPuntuacion, casparResultado,
        comentariosAdicionales
    };

    return datosCompletos;
}

// =====================================
// FUNCIÓN: prefillSeguimientoForm
// =====================================
/**
 * Pre-rellena el formulario de seguimiento con datos de visitas anteriores del paciente
 * @param {Object} visitData - Datos de la última visita del paciente desde HubTools.data
 * @param {string} visitData.idPaciente - ID del paciente (e.g. "ESP-2023-001")
 * @param {string} visitData.nombrePaciente - Nombre completo del paciente
 * @param {string} visitData.diagnosticoPrimario - Diagnóstico primario ("espa", "aps")
 * @param {string} visitData.diagnosticoSecundario - Diagnóstico secundario (opcional)
 * @param {string} visitData.hlaB27 - Estado HLA-B27 ("positivo", "negativo", "no-analizado")
 * @param {string} visitData.fr - Factor reumatoide
 * @param {string} visitData.apcc - Anti-CCP
 * @param {Array} visitData.comorbilidades - Array de comorbilidades activas
 * @param {Array} visitData.manifestacionesExtra - Array de manifestaciones extra-articulares
 * @param {string} visitData.tratamientoActual - Descripción del tratamiento actual
 * @param {string} visitData.fechaInicioTratamiento - Fecha de inicio del tratamiento actual
 */
function prefillSeguimientoForm(visitData) {
    if (!visitData) {
        console.warn('⚠️ prefillSeguimientoForm: No se proporcionaron datos para pre-llenar');
        return;
    }

    console.log('🔄 Pre-llenando formulario de seguimiento con datos:', visitData);

    // 1. IDENTIFICACIÓN DEL PACIENTE (campos readonly)
    if (visitData.idPaciente) {
        const idInput = document.getElementById('idPaciente');
        if (idInput) {
            idInput.value = visitData.idPaciente;
            idInput.setAttribute('readonly', 'readonly');
        }
    }

    if (visitData.nombrePaciente) {
        const nombreInput = document.getElementById('nombrePaciente');
        if (nombreInput) {
            nombreInput.value = visitData.nombrePaciente;
            nombreInput.setAttribute('readonly', 'readonly');
        }
    }

    // 2. DIAGNÓSTICO Y ADAPTACIÓN DEL FORMULARIO
    if (visitData.diagnosticoPrimario) {
        const diagnosticoSelect = document.getElementById('diagnosticoPrimario');
        if (diagnosticoSelect) {
            diagnosticoSelect.value = visitData.diagnosticoPrimario;
            // Adaptar formulario según patología
            adaptarFormulario(visitData.diagnosticoPrimario);
        }
    }

    if (visitData.diagnosticoSecundario) {
        const diagSecInput = document.getElementById('diagnosticoSecundario');
        if (diagSecInput) diagSecInput.value = visitData.diagnosticoSecundario;
    }

    // 3. BIOMARCADORES (HLA-B27, FR, Anti-CCP)
    if (visitData.hlaB27) {
        setBiomarkerValue('hla-btn', visitData.hlaB27);
    }
    if (visitData.fr) {
        setBiomarkerValue('fr-btn', visitData.fr);
    }
    if (visitData.apcc) {
        setBiomarkerValue('apcc-btn', visitData.apcc);
    }

    // 4. COMORBILIDADES (toggle buttons)
    if (visitData.comorbilidades && Array.isArray(visitData.comorbilidades)) {
        visitData.comorbilidades.forEach(comorbilidad => {
            const btn = document.querySelector(`.toggle-btn[data-value="${comorbilidad}"]`);
            if (btn) btn.classList.add('active');
        });
    }

    // 5. MANIFESTACIONES EXTRA-ARTICULARES (toggle buttons)
    if (visitData.manifestacionesExtra && Array.isArray(visitData.manifestacionesExtra)) {
        visitData.manifestacionesExtra.forEach(manifestacion => {
            const btn = document.querySelector(`.toggle-btn[data-value="${manifestacion}"]`);
            if (btn) btn.classList.add('active');
        });
    }

    // 6. TRATAMIENTO ACTUAL
    if (visitData.tratamientoActual) {
        const tratamientoInput = document.getElementById('tratamientoActualEditable');
        if (tratamientoInput) tratamientoInput.value = visitData.tratamientoActual;

        const tratamientoDisplay = document.getElementById('tratamientoActual');
        if (tratamientoDisplay) tratamientoDisplay.value = visitData.tratamientoActual;
    }

    if (visitData.fechaInicioTratamiento) {
        const fechaInput = document.getElementById('fechaInicioTratamiento');
        if (fechaInput) fechaInput.value = visitData.fechaInicioTratamiento;
    }

    console.log('✅ Formulario de seguimiento pre-llenado correctamente');
}

/**
 * Puebla un select con opciones desde la base de datos de fármacos
 * @param {string} selectId - ID del elemento select
 * @param {string} tipo - Tipo de fármaco ('Sistemicos', 'FAMEs', 'Biologicos')
 * @param {boolean} includeNo - Si incluir opción "No" al inicio (default: true)
 */
function populateSelectFromDatabase(selectId, tipo, includeNo = true) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) {
        console.error(`❌ Select #${selectId} no encontrado`);
        return;
    }

    // Verificar que HubTools está disponible
    if (typeof HubTools === 'undefined' || !HubTools.data || !HubTools.data.getFarmacosPorTipo) {
        console.error('❌ HubTools.data.getFarmacosPorTipo no disponible');
        return;
    }

    // Limpiar opciones existentes
    selectElement.innerHTML = '';

    // Agregar opción "No" si se requiere
    if (includeNo) {
        const optionNo = document.createElement('option');
        optionNo.value = 'No';
        optionNo.textContent = 'No';
        selectElement.appendChild(optionNo);
    }

    // Obtener fármacos de la base de datos
    const farmacos = HubTools.data.getFarmacosPorTipo(tipo);

    if (!farmacos || farmacos.length === 0) {
        console.warn(`⚠ No se encontraron fármacos del tipo "${tipo}"`);

        // Agregar opción indicativa
        const optionEmpty = document.createElement('option');
        optionEmpty.value = '';
        optionEmpty.textContent = '-- Cargue la base de datos primero --';
        optionEmpty.disabled = true;
        selectElement.appendChild(optionEmpty);
        return;
    }

    // Agregar cada fármaco como opción
    farmacos.forEach(farmaco => {
        if (farmaco && farmaco.trim() !== '') {
            const option = document.createElement('option');
            option.value = farmaco;
            option.textContent = farmaco;
            selectElement.appendChild(option);
        }
    });

    console.log(`✓ Select #${selectId} poblado con ${farmacos.length} opciones de tipo "${tipo}"`);
}

function recopilarDatosFormularioSeguimiento() {
    const getValue = (id) => document.getElementById(id)?.value || '';
    const isChecked = (id) => !!document.getElementById(id)?.checked;

    const idPaciente = getValue('idPaciente');
    const nombrePaciente = getValue('nombrePaciente');
    const fechaVisita = getValue('fechaVisita');
    const profesional = document.getElementById('currentProfessional')?.textContent || 'No especificado';

    const diagnosticoPrimario = getValue('diagnosticoPrimario');
    const diagnosticoSecundario = getValue('diagnosticoSecundario');

    const hlaB27 = normalizarEstado(document.querySelector('.hla-btn.active:not(.fr-btn):not(.apcc-btn)')?.dataset?.value || 'no-analizado');
    const fr = normalizarEstado(document.querySelector('.fr-btn.active')?.dataset?.value || 'no-analizado');
    const apcc = normalizarEstado(document.querySelector('.apcc-btn.active')?.dataset?.value || 'no-analizado');
    const ana = normalizarEstado(document.querySelector('.ana-btn.active')?.dataset?.value || 'no-analizado');

    const peso = getValue('peso');
    const talla = getValue('talla');
    const imc = getValue('imc');
    const ta = getValue('ta');

    const homunculusData = HubTools.homunculus.getHomunculusData();
    const nad = homunculusData?.nad || [];
    const nat = homunculusData?.nat || [];
    const dactilitis = homunculusData?.dactilitis || [];

    const cambioSistemicosEntries = collectTreatmentEntries('cambioSistemicoSelect', 'cambioSistemicoDose', 'cambioSistemicosExtras');
    const cambioFamesEntries = collectTreatmentEntries('cambioFameSelect', 'cambioFameDose', 'cambioFamesExtras');
    const cambioBiologicosEntries = collectTreatmentEntries('cambioBiologicoSelect', 'cambioBiologicoDose', 'cambioBiologicosExtras');

    const sistemicoSlot1 = getTreatmentSlot(cambioSistemicosEntries, 0);
    const fameSlot1 = getTreatmentSlot(cambioFamesEntries, 0);
    const biologicoSlot1 = getTreatmentSlot(cambioBiologicosEntries, 0);

    const sistemicoSelect = sistemicoSlot1.farmaco || 'No';
    const sistemicoDose = sistemicoSlot1.dosis || '';
    const fameSelect = fameSlot1.farmaco || 'No';
    const fameDose = fameSlot1.dosis || '';
    const biologicoSelect = biologicoSlot1.farmaco || 'No';
    const biologicoDose = biologicoSlot1.dosis || '';

    const fechaProximaRevision = getValue('fechaProximaRevision');
    const comentariosAdicionales = getValue('comentariosAdicionales');

    const evaGlobal = getValue('evaGlobal');
    const evaDolor = getValue('evaDolor');
    const pcr = getValue('pcrValue');
    const vsg = getValue('vsgValue');

    const basdaiP1 = getValue('basdaiP1');
    const basdaiP2 = getValue('basdaiP2');
    const basdaiP3 = getValue('basdaiP3');
    const basdaiP4 = getValue('basdaiP4');
    const basdaiP5 = getValue('basdaiP5');
    const basdaiP6 = getValue('basdaiP6');
    const basdaiResult = getValue('basdaiResult');

    const asdasDolorEspalda = getValue('asdasDolorEspalda');
    const asdasDuracionRigidez = getValue('asdasDuracionRigidez');
    const asdasEvaGlobal = getValue('asdasEvaGlobal');
    const asdasCrpResult = getValue('asdasCrpResult');
    const asdasEsrResult = getValue('asdasEsrResult');

    const pasiScore = getValue('pasiValue');
    const bsaPercentage = getValue('bsaValue');
    const psoriasisDescripcion = getValue('psoriasisDescripcion');

    const haqVestirse = document.querySelector('.haq-score[data-category="1"]')?.value || '';
    const haqLevantarse = document.querySelector('.haq-score[data-category="2"]')?.value || '';
    const haqComer = document.querySelector('.haq-score[data-category="3"]')?.value || '';
    const haqCaminar = document.querySelector('.haq-score[data-category="4"]')?.value || '';
    const haqHigiene = document.querySelector('.haq-score[data-category="5"]')?.value || '';
    const haqAlcanzar = document.querySelector('.haq-score[data-category="6"]')?.value || '';
    const haqAgarrar = document.querySelector('.haq-score[data-category="7"]')?.value || '';
    const haqActividades = document.querySelector('.haq-score[data-category="8"]')?.value || '';
    const haqTotal = document.getElementById('haqTotal')?.textContent || '';

    const leiBySite = {};
    document.querySelectorAll('.lei-point').forEach(cb => {
        const key = cb.dataset.site || cb.value || '';
        if (key) leiBySite[key] = cb.checked ? 'SI' : 'NO';
    });
    const leiEpicondiloLatDer = normalizarEstado(leiBySite['epicondilo-lat-der'], 'NO');
    const leiEpicondiloLatIzq = normalizarEstado(leiBySite['epicondilo-lat-izq'], 'NO');
    const leiEpicondiloMedDer = normalizarEstado(leiBySite['condilo-med-der'], 'NO');
    const leiEpicondiloMedIzq = normalizarEstado(leiBySite['condilo-med-izq'], 'NO');
    const leiAquilesDer = normalizarEstado(leiBySite['aquiles-der'], 'NO');
    const leiAquilesIzq = normalizarEstado(leiBySite['aquiles-izq'], 'NO');
    const leiScore = document.getElementById('leiTotal')?.textContent || '';

    const mdaNAT = document.getElementById('mdaNAT')?.textContent || '';
    const mdaNAD = document.getElementById('mdaNAD')?.textContent || '';
    const mdaPASI = document.getElementById('mdaPsoriasis')?.textContent || '';
    const mdaDolor = document.getElementById('mdaEvaDolor')?.textContent || '';
    const mdaGlobal = document.getElementById('mdaEvaGlobal')?.textContent || '';
    const mdaHAQ = document.getElementById('mdaHAQ')?.textContent || '';
    const mdaEntesitis = document.getElementById('mdaLEI')?.textContent || '';
    const mdaCumple = (document.getElementById('mdaResultadoFinal')?.textContent || '').toUpperCase().includes('ALCANZADO');

    const das28NAD = getValue('das28NAD');
    const das28NAT = getValue('das28NAT');
    const das28CrpResult = getValue('das28CrpResult');
    const das28EsrResult = getValue('das28EsrResult');
    const cdaiResult = getValue('cdaiResult');
    const sdaiResult = getValue('sdaiResult');
    const evaMedico = getValue('evaMedico');

    const rigidezMatutinaAR = getValue('rigidezMatutinaARSeg');
    const nodulosReumatoideos = isChecked('nodulosReumatoideosSeg') ? 'SI' : 'NO';
    const nodulosLocalizacionTexto = getValue('nodulosLocalizacionTextoSeg');
    const erosionesRadiologicas = isChecked('erosionesRadiologicasSeg') ? 'SI' : 'NO';
    const erosionesDescripcionTexto = getValue('erosionesDescripcionTextoSeg');
    const sequedadOcular = isChecked('sequedadOcularSeg') ? 'SI' : 'NO';
    const sequedadOral = isChecked('sequedadOralSeg') ? 'SI' : 'NO';

    const extraArticularAR = {};
    document.querySelectorAll('.extraarticular-ar-seg').forEach(cb => {
        extraArticularAR[cb.dataset.tipo] = cb.checked ? 'SI' : 'NO';
    });

    const mdhaqData = {};
    ['mdhaqA', 'mdhaqB', 'mdhaqC', 'mdhaqD', 'mdhaqE', 'mdhaqF', 'mdhaqG', 'mdhaqH', 'mdhaqI', 'mdhaqJ'].forEach(id => {
        mdhaqData[id] = getValue(id) || '0';
    });
    const rapid3Total = document.getElementById('rapid3Total')?.textContent || '';
    const rapid3Categoria = document.getElementById('rapid3Categoria')?.textContent || '';

    let decisionTerapeutica = 'continuar';
    if (document.getElementById('btnCambiarTratamiento')?.classList.contains('active')) {
        decisionTerapeutica = 'cambiar';
    }

    const tratamientoData = {
        continuar: {
            adherencia: getValue('adherencia'),
            ajusteTerapeutico: getValue('ajusteTerapeutico')
        },
        cambio: {
            motivoCambio: getValue('motivoCambio'),
            efectosAdversos: isChecked('efectosAdversos'),
            descripcionEfectos: getValue('descripcionEfectos'),
            sistemicos: { farmaco: sistemicoSelect, dosis: sistemicoDose },
            fames: { farmaco: fameSelect, dosis: fameDose },
            biologicos: { farmaco: biologicoSelect, dosis: biologicoDose }
        }
    };

    return {
        idPaciente, nombrePaciente, fechaVisita, profesional,
        diagnosticoPrimario, diagnosticoSecundario,
        hlaB27, fr, apcc, ana,
        peso, talla, imc, ta,
        nad, nat, dactilitis,
        evaGlobal, evaDolor, pcr, vsg,
        basdaiP1, basdaiP2, basdaiP3, basdaiP4, basdaiP5, basdaiP6, basdaiResult,
        asdasDolorEspalda, asdasDuracionRigidez, asdasEvaGlobal, asdasCrpResult, asdasEsrResult,
        pasiScore, bsaPercentage, psoriasisDescripcion,
        haqVestirse, haqLevantarse, haqComer, haqCaminar, haqHigiene, haqAlcanzar, haqAgarrar, haqActividades, haqTotal,
        leiEpicondiloLatIzq, leiEpicondiloLatDer, leiEpicondiloMedIzq, leiEpicondiloMedDer, leiAquilesIzq, leiAquilesDer, leiScore,
        mdaNAT, mdaNAD, mdaPASI, mdaDolor, mdaGlobal, mdaHAQ, mdaEntesitis, mdaCumple,
        das28NAD, das28NAT, das28CrpResult, das28EsrResult, cdaiResult, sdaiResult, evaMedico,
        rigidezMatutinaAR, nodulosReumatoideos, nodulosLocalizacionTexto,
        erosionesRadiologicas, erosionesDescripcionTexto,
        sequedadOcular, sequedadOral, extraArticularAR,
        mdhaqData, rapid3Total, rapid3Categoria,
        sistemicoSelect, sistemicoDose, fameSelect, fameDose, biologicoSelect, biologicoDose,
        cambioSistemicosEntries, cambioFamesEntries, cambioBiologicosEntries,
        tratamientoData, decisionTerapeutica,
        fechaProximaRevision, comentariosAdicionales
    };
}

// ============================================
// WIRING DE AUTO-CÁLCULO DE SCORES
// ============================================

/**
 * Inicializa todos los event listeners para auto-calcular scores.
 * Debe llamarse desde script_seguimiento.js y script_primera_visita.js
 * después de que el DOM esté listo.
 *
 * Wiring implementado:
 * 1. PCR/VSG (Pruebas Complementarias) → campos readonly en ASDAS
 * 2. BASDAI P1-P6 → basdaiResult
 * 3. ASDAS inputs → asdasCrpResult / asdasEsrResult
 * 4. HAQ selects + aids → haqTotal
 * 5. LEI checkboxes → leiTotal (si se añade en futuro)
 * 6. MDA (auto desde NAD/NAT/EVA/HAQ/PASI/BSA/LEI)
 * 7. RAPID3 (auto desde HAQ + EVA)
 */
function initScoreWiring() {
    console.log('🔧 Inicializando wiring de scores...');

    // --- 1. SYNC PCR / VSG → ASDAS readonly ---
    const pcrInput = document.getElementById('pcrValue');
    const vsgInput = document.getElementById('vsgValue');
    const asdasPCRField = document.getElementById('asdasPCR');
    const asdasVSGField = document.getElementById('asdasVSG');

    if (pcrInput && asdasPCRField) {
        pcrInput.addEventListener('input', function () {
            asdasPCRField.value = this.value;
            recalcularASDAS();
            recalcularMDA();
        });
        console.log('  ✓ PCR → asdasPCR sync');
    }
    if (vsgInput && asdasVSGField) {
        vsgInput.addEventListener('input', function () {
            asdasVSGField.value = this.value;
            recalcularASDAS();
        });
        console.log('  ✓ VSG → asdasVSG sync');
    }

    // --- 2. AUTO-CÁLCULO BASDAI ---
    const basdaiFields = ['basdaiP1', 'basdaiP2', 'basdaiP3', 'basdaiP4', 'basdaiP5', 'basdaiP6'];
    const basdaiResult = document.getElementById('basdaiResult');

    basdaiFields.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', recalcularBASDAI);
        }
    });

    function recalcularBASDAI() {
        if (!basdaiResult || typeof HubTools.scores.calcularBASDAI !== 'function') return;
        var datos = {};
        basdaiFields.forEach(function (id) {
            datos[id] = document.getElementById(id)?.value || '0';
        });
        var resultado = HubTools.scores.calcularBASDAI(datos);
        basdaiResult.value = resultado;
        // Categorizar
        var cat = HubTools.scores.categorizeScore(parseFloat(resultado), 'basdai');
        basdaiResult.style.backgroundColor = cat.backgroundColor;
        basdaiResult.style.color = cat.color;
        basdaiResult.title = cat.label;
        var basdaiCatEl = document.getElementById('basdaiCategoria');
        if (basdaiCatEl) {
            basdaiCatEl.textContent = cat.label;
            basdaiCatEl.style.color = cat.color;
            basdaiCatEl.style.fontWeight = '700';
        }
        console.log('  📊 BASDAI recalculado:', resultado, cat.label);
    }
    if (basdaiResult) console.log('  ✓ BASDAI wiring');

    // --- 3. AUTO-CÁLCULO ASDAS ---
    var asdasInputIds = ['asdasDolorEspalda', 'asdasDuracionRigidez', 'asdasEvaGlobal', 'asdasNAD'];
    asdasInputIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', recalcularASDAS);
        }
    });
    // asdasPCR y asdasVSG son readonly, se actualizan desde el sync de arriba

    function recalcularASDAS() {
        if (typeof HubTools.scores.calcularASDAS !== 'function') return;
        var datos = {
            asdasDolorEspalda: document.getElementById('asdasDolorEspalda')?.value || '0',
            asdasDuracionRigidez: document.getElementById('asdasDuracionRigidez')?.value || '0',
            asdasEvaGlobal: document.getElementById('asdasEvaGlobal')?.value || '0',
            asdasNAD: document.getElementById('asdasNAD')?.value || '0',
            asdasPCR: document.getElementById('asdasPCR')?.value || '0',
            asdasVSG: document.getElementById('asdasVSG')?.value || '0'
        };
        var result = HubTools.scores.calcularASDAS(datos);

        var crpField = document.getElementById('asdasCrpResult');
        var esrField = document.getElementById('asdasEsrResult');

        if (crpField) {
            crpField.value = result.asdasCRP;
            var catCRP = HubTools.scores.categorizeScore(parseFloat(result.asdasCRP), 'asdas');
            crpField.style.backgroundColor = catCRP.backgroundColor;
            crpField.style.color = catCRP.color;
            crpField.title = catCRP.label;
            var crpCatEl = document.getElementById('asdasCrpCategoria');
            if (crpCatEl) {
                crpCatEl.textContent = catCRP.label;
                crpCatEl.style.color = catCRP.color;
                crpCatEl.style.fontWeight = '700';
            }
        }
        if (esrField) {
            esrField.value = result.asdasESR;
            var catESR = HubTools.scores.categorizeScore(parseFloat(result.asdasESR), 'asdas');
            esrField.style.backgroundColor = catESR.backgroundColor;
            esrField.style.color = catESR.color;
            esrField.title = catESR.label;
            var esrCatEl = document.getElementById('asdasEsrCategoria');
            if (esrCatEl) {
                esrCatEl.textContent = catESR.label;
                esrCatEl.style.color = catESR.color;
                esrCatEl.style.fontWeight = '700';
            }
        }
        console.log('  📊 ASDAS recalculado: CRP=' + result.asdasCRP + ', ESR=' + result.asdasESR);
    }

    // Exponer para homunculus.js
    window.calcularASDASLocal = recalcularASDAS;
    console.log('  ✓ ASDAS wiring + calcularASDASLocal');

    // --- 4. AUTO-CÁLCULO HAQ-DI ---
    var haqScoreSelects = document.querySelectorAll('.haq-score');
    var haqAidCheckboxes = document.querySelectorAll('.haq-aid');
    var haqTotalEl = document.getElementById('haqTotal');

    function recalcularHAQ() {
        if (!haqTotalEl || typeof HubTools.scores.calcularHAQ !== 'function') return;
        var datos = {};
        for (var i = 1; i <= 8; i++) {
            var sel = document.querySelector('.haq-score[data-category="' + i + '"]');
            var aid = document.querySelector('.haq-aid[data-category="' + i + '"]');
            datos['haqCategoria' + i] = sel ? sel.value : '0';
            datos['haqAyuda' + i] = aid ? aid.checked : false;
        }
        var haqValue = HubTools.scores.calcularHAQ(datos);
        haqTotalEl.textContent = haqValue.toFixed(2);
        // Categorizar
        var cat = HubTools.scores.categorizeScore(haqValue, 'haq');
        haqTotalEl.style.color = cat.color;
        var haqCatEl = document.getElementById('haqCategoria');
        if (haqCatEl) {
            haqCatEl.textContent = cat.label;
            haqCatEl.style.color = cat.color;
            haqCatEl.style.fontWeight = '700';
        }

        // Cascada: HAQ afecta RAPID3 y MDA
        recalcularRAPID3();
        recalcularMDA();
        console.log('  📊 HAQ-DI recalculado:', haqValue.toFixed(2), cat.label);
    }

    haqScoreSelects.forEach(function (sel) {
        sel.addEventListener('change', recalcularHAQ);
    });
    haqAidCheckboxes.forEach(function (cb) {
        cb.addEventListener('change', recalcularHAQ);
    });
    if (haqTotalEl) console.log('  ✓ HAQ-DI wiring');

    // --- 5. AUTO-CÁLCULO LEI ---
    var leiCheckboxes = document.querySelectorAll('.lei-point');

    function recalcularLEI() {
        var count = 0;
        leiCheckboxes.forEach(function (cb) {
            if (cb.checked) count++;
        });
        var leiTotalEl = document.getElementById('leiTotal');
        if (leiTotalEl) leiTotalEl.textContent = count;
        // Cascada: LEI afecta MDA
        recalcularMDA();
        return count;
    }

    leiCheckboxes.forEach(function (cb) {
        cb.addEventListener('change', recalcularLEI);
    });
    if (leiCheckboxes.length > 0) console.log('  ✓ LEI wiring');

    // --- 6. EVA inputs → cascada a MDA y RAPID3 ---
    var evaGlobalInput = document.getElementById('evaGlobal');
    var evaDolorInput = document.getElementById('evaDolor');

    if (evaGlobalInput) {
        evaGlobalInput.addEventListener('input', function () {
            recalcularMDA();
            recalcularRAPID3();
        });
    }
    if (evaDolorInput) {
        evaDolorInput.addEventListener('input', function () {
            recalcularMDA();
            recalcularRAPID3();
        });
    }
    if (evaGlobalInput || evaDolorInput) console.log('  ✓ EVA → MDA/RAPID3 wiring');

    // --- 7. AUTO-CÁLCULO MDA ---
    function recalcularMDA() {
        if (typeof HubTools.scores.calcularMDA !== 'function') return;

        var haqVal = parseFloat(document.getElementById('haqTotal')?.textContent) || 0;
        var leiCheckboxesNow = document.querySelectorAll('.lei-point:checked');
        var leiVal = leiCheckboxesNow.length;

        var datos = {
            nat: parseInt(document.getElementById('asdasNAT')?.value) || 0,
            nad: parseInt(document.getElementById('asdasNAD')?.value) || 0,
            pasiValue: document.getElementById('pasiValue')?.value || '0',
            bsaValue: document.getElementById('bsaValue')?.value || '0',
            lei: leiVal,
            evaDolor: document.getElementById('evaDolor')?.value || '0',
            evaGlobal: document.getElementById('evaGlobal')?.value || '0',
            haq: haqVal
        };

        var result = HubTools.scores.calcularMDA(datos);

        // Actualizar UI del MDA
        var mdaNATEl = document.getElementById('mdaNAT');
        var mdaNADEl = document.getElementById('mdaNAD');
        var mdaEvaDEl = document.getElementById('mdaEvaDolor');
        var mdaEvaGEl = document.getElementById('mdaEvaGlobal');
        var mdaHAQEl = document.getElementById('mdaHAQ');
        var mdaLEIEl = document.getElementById('mdaLEI');
        var mdaPsoriasisEl = document.getElementById('mdaPsoriasis');
        var mdaCumplidosEl = document.getElementById('mdaCumplidos');
        var mdaResultEl = document.getElementById('mdaResultadoFinal');

        if (mdaNATEl) mdaNATEl.textContent = result.nat;
        if (mdaNADEl) mdaNADEl.textContent = result.nad;
        if (mdaEvaDEl) mdaEvaDEl.textContent = result.evaDolor;
        if (mdaEvaGEl) mdaEvaGEl.textContent = result.evaGlobal;
        if (mdaHAQEl) mdaHAQEl.textContent = result.haq;
        if (mdaLEIEl) mdaLEIEl.textContent = result.lei;
        if (mdaPsoriasisEl) mdaPsoriasisEl.textContent = result.psoriasis;
        if (mdaCumplidosEl) mdaCumplidosEl.textContent = result.cumplidos;

        // Actualizar status de cada criterio
        for (var ci = 0; ci < result.criterios.length; ci++) {
            var statusEl = document.getElementById('mdaStatus' + (ci + 1));
            var criterioEl = document.getElementById('mdaCriterio' + (ci + 1));
            if (statusEl) {
                statusEl.textContent = result.criterios[ci] ? '✓' : '✗';
                statusEl.style.color = result.criterios[ci] ? '#28a745' : '#dc3545';
            }
            if (criterioEl) {
                criterioEl.style.backgroundColor = result.criterios[ci] ? '#28a74522' : '';
            }
        }

        if (mdaResultEl) {
            if (result.mdaAlcanzado) {
                mdaResultEl.textContent = 'MDA ALCANZADO ✓';
                mdaResultEl.style.color = '#28a745';
                mdaResultEl.style.fontWeight = 'bold';
            } else {
                mdaResultEl.textContent = 'MDA NO ALCANZADO';
                mdaResultEl.style.color = '#dc3545';
                mdaResultEl.style.fontWeight = 'normal';
            }
        }
    }

    // Exponer para homunculus.js
    window.calcularMDALocal = recalcularMDA;
    console.log('  ✓ MDA wiring + calcularMDALocal');

    // --- 8. AUTO-CÁLCULO RAPID3 (MDHAQ 10 preguntas) ---
    function recalcularRAPID3() {
        if (typeof HubTools.scores.calcularRAPID3 !== 'function') return;

        // Suma de las 10 preguntas MDHAQ (a-j)
        const mdhaqIds = ['mdhaqA', 'mdhaqB', 'mdhaqC', 'mdhaqD', 'mdhaqE', 'mdhaqF', 'mdhaqG', 'mdhaqH', 'mdhaqI', 'mdhaqJ'];
        let fnRaw = 0;
        mdhaqIds.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) fnRaw += parseInt(el.value) || 0;
        });

        var datos = {
            fnRaw: fnRaw,
            evaDolor: document.getElementById('evaDolor')?.value || '0',
            evaGlobal: document.getElementById('evaGlobal')?.value || '0'
        };

        var result = HubTools.scores.calcularRAPID3(datos);

        // Actualizar UI
        var fnRawEl = document.getElementById('rapid3FnRaw');
        var funcionEl = document.getElementById('rapid3Funcion');
        var dolorEl = document.getElementById('rapid3Dolor');
        var globalEl = document.getElementById('rapid3Global');
        var totalEl = document.getElementById('rapid3Total');
        var catEl = document.getElementById('rapid3Categoria');

        if (fnRawEl) fnRawEl.textContent = result.fnRaw;
        if (funcionEl) funcionEl.textContent = result.funcion;
        if (dolorEl) dolorEl.textContent = result.dolor;
        if (globalEl) globalEl.textContent = result.global;
        if (totalEl) totalEl.textContent = result.total;
        if (catEl) catEl.textContent = result.categoria;

        // Colorear según categoría
        var cat = HubTools.scores.categorizeScore(parseFloat(result.total), 'rapid3');
        if (totalEl) totalEl.style.color = cat.color;
        if (catEl) { catEl.style.color = cat.color; catEl.style.fontWeight = 'bold'; }
    }

    // Event listeners para las 10 preguntas MDHAQ
    ['mdhaqA', 'mdhaqB', 'mdhaqC', 'mdhaqD', 'mdhaqE', 'mdhaqF', 'mdhaqG', 'mdhaqH', 'mdhaqI', 'mdhaqJ'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', recalcularRAPID3);
    });

    console.log('  ✓ RAPID3 wiring (MDHAQ)');

    // --- 9. AUTO-CÁLCULO DAS28 (AR) ---
    function recalcularDAS28() {
        if (typeof HubTools.scores.calcularDAS28 !== 'function') return;

        var datos = {
            nad28: document.getElementById('das28NAD')?.value || '0',
            nat28: document.getElementById('das28NAT')?.value || '0',
            pcr: document.getElementById('das28PCR')?.value || '0',
            vsg: document.getElementById('das28VSG')?.value || '0',
            evaGlobal: document.getElementById('das28EVA')?.value || '0'
        };
        var result = HubTools.scores.calcularDAS28(datos);

        var crpField = document.getElementById('das28CrpResult');
        var esrField = document.getElementById('das28EsrResult');
        var crpCatEl = document.getElementById('das28CrpCategoria');
        var esrCatEl = document.getElementById('das28EsrCategoria');

        if (crpField) {
            crpField.value = result.das28CRP;
            var catCRP = HubTools.scores.categorizeScore(parseFloat(result.das28CRP), 'das28');
            crpField.style.backgroundColor = catCRP.backgroundColor;
            crpField.style.color = catCRP.color;
            crpField.title = catCRP.label;
            if (crpCatEl) {
                crpCatEl.textContent = catCRP.label;
                crpCatEl.style.color = catCRP.color;
                crpCatEl.style.fontWeight = '700';
            }
        }
        if (esrField) {
            esrField.value = result.das28ESR;
            var catESR = HubTools.scores.categorizeScore(parseFloat(result.das28ESR), 'das28');
            esrField.style.backgroundColor = catESR.backgroundColor;
            esrField.style.color = catESR.color;
            esrField.title = catESR.label;
            if (esrCatEl) {
                esrCatEl.textContent = catESR.label;
                esrCatEl.style.color = catESR.color;
                esrCatEl.style.fontWeight = '700';
            }
        }
        // También recalcular CDAI y SDAI ya que comparten NAD28/NAT28
        recalcularCDAI();
        recalcularSDAI();

        console.log('  📊 DAS28 recalculado: CRP=' + result.das28CRP + ', ESR=' + result.das28ESR);
    }

    // Exponer para homunculus.js
    window.calcularDAS28Local = recalcularDAS28;
    console.log('  ✓ DAS28 wiring + calcularDAS28Local');

    // --- 10. AUTO-CÁLCULO CDAI (AR) ---
    var evaMedicoInput = document.getElementById('evaMedico');
    if (evaMedicoInput) {
        evaMedicoInput.addEventListener('input', function () {
            recalcularCDAI();
            recalcularSDAI();
        });
    }

    function recalcularCDAI() {
        if (typeof HubTools.scores.calcularCDAI !== 'function') return;
        var datos = {
            nad28: document.getElementById('das28NAD')?.value || '0',
            nat28: document.getElementById('das28NAT')?.value || '0',
            evaPaciente: document.getElementById('evaGlobal')?.value || '0',
            evaMedico: document.getElementById('evaMedico')?.value || '0'
        };
        var result = HubTools.scores.calcularCDAI(datos);
        var cdaiField = document.getElementById('cdaiResult');
        var cdaiCatEl = document.getElementById('cdaiCategoria');

        if (cdaiField) {
            cdaiField.value = result.total + ' - ' + result.categoria;
            var cat = HubTools.scores.categorizeScore(parseFloat(result.total), 'cdai');
            cdaiField.style.backgroundColor = cat.backgroundColor;
            cdaiField.style.color = cat.color;
            if (cdaiCatEl) {
                cdaiCatEl.textContent = cat.label;
                cdaiCatEl.style.color = cat.color;
                cdaiCatEl.style.fontWeight = '700';
            }
        }
    }
    console.log('  ✓ CDAI wiring');

    // --- 11. AUTO-CÁLCULO SDAI (AR) ---
    function recalcularSDAI() {
        if (typeof HubTools.scores.calcularSDAI !== 'function') return;
        var datos = {
            nad28: document.getElementById('das28NAD')?.value || '0',
            nat28: document.getElementById('das28NAT')?.value || '0',
            evaPaciente: document.getElementById('evaGlobal')?.value || '0',
            evaMedico: document.getElementById('evaMedico')?.value || '0',
            pcr: document.getElementById('das28PCR')?.value || '0'
        };
        var result = HubTools.scores.calcularSDAI(datos);
        var sdaiField = document.getElementById('sdaiResult');
        var sdaiCatEl = document.getElementById('sdaiCategoria');

        if (sdaiField) {
            sdaiField.value = result.total + ' - ' + result.categoria;
            var cat = HubTools.scores.categorizeScore(parseFloat(result.total), 'sdai');
            sdaiField.style.backgroundColor = cat.backgroundColor;
            sdaiField.style.color = cat.color;
            if (sdaiCatEl) {
                sdaiCatEl.textContent = cat.label;
                sdaiCatEl.style.color = cat.color;
                sdaiCatEl.style.fontWeight = '700';
            }
        }
    }
    console.log('  ✓ SDAI wiring');

    // --- 12. SYNC PCR/VSG/EVA → DAS28 (AR) ---
    if (pcrInput) {
        pcrInput.addEventListener('input', function () {
            var das28PCRField = document.getElementById('das28PCR');
            if (das28PCRField) {
                das28PCRField.value = this.value;
                recalcularDAS28();
            }
        });
    }
    if (vsgInput) {
        vsgInput.addEventListener('input', function () {
            var das28VSGField = document.getElementById('das28VSG');
            if (das28VSGField) {
                das28VSGField.value = this.value;
                recalcularDAS28();
            }
        });
    }
    // EVA Global → DAS28 + CDAI
    var evaGlobalInput = document.getElementById('evaGlobal');
    if (evaGlobalInput) {
        evaGlobalInput.addEventListener('input', function () {
            var das28EVAField = document.getElementById('das28EVA');
            if (das28EVAField) {
                das28EVAField.value = this.value;
                recalcularDAS28();
            }
            recalcularCDAI();
            recalcularSDAI();
            recalcularRAPID3();
        });
    }
    console.log('  ✓ PCR/VSG/EVA → DAS28/CDAI/SDAI sync');

    console.log('✅ Score wiring completado');
}

// Verificar que HubTools existe antes de asignar funciones
if (typeof HubTools !== 'undefined' && HubTools.form) {
    HubTools.form.showElement = showElement;
    HubTools.form.hideElement = hideElement;
    HubTools.form.showElementsBySelector = showElementsBySelector;
    HubTools.form.hideElementsBySelector = hideElementsBySelector;
    HubTools.form.adaptarFormulario = adaptarFormulario;
    HubTools.form.inicializarCollapsibles = inicializarCollapsibles;
    HubTools.form.validarFormulario = validarFormulario;
    HubTools.form.validarFormularioSeguimiento = validarFormularioSeguimiento;
    HubTools.form.setupTreatmentControls = setupTreatmentControls;
    HubTools.form.createTreatmentLine = createTreatmentLine;
    HubTools.form.inicializarEventosTratamientos = inicializarEventosTratamientos;
    HubTools.form.mostrarContinuar = mostrarContinuar;
    HubTools.form.mostrarCambio = mostrarCambio;
    HubTools.form.mostrarModalTexto = mostrarModalTexto;
    HubTools.form.recopilarDatosFormulario = recopilarDatosFormulario;
    HubTools.form.recopilarDatosFormularioSeguimiento = recopilarDatosFormularioSeguimiento;
    HubTools.form.prefillSeguimientoForm = prefillSeguimientoForm;
    HubTools.form.populateSelectFromDatabase = populateSelectFromDatabase;
    HubTools.form.initScoreWiring = initScoreWiring;

    console.log('✅ Módulo formController cargado');
} else {
    console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js primero.');
}







