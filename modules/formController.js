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
    const selectors = ['.espa-only', '.aps-only', '.espa-aps-only'];
    selectors.forEach(selector => hideElementsBySelector(selector));

    // Ocultar biomarcadores
    const biomarkers = ['hlaB27Container', 'frContainer', 'apccContainer'];
    biomarkers.forEach(id => hideElement(id));

    // Resetear banderas de inicialización de criterios
    asasInitialized = false;
    casparInitialized = false;

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

                // Recalcular altura después de la expansión
                setTimeout(() => {
                    content.style.maxHeight = content.scrollHeight + "px";
                    refreshCollapsibleHeights();
                }, 50);
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

    return errores;
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

    const sistemicoSelect = document.getElementById('sistemicoSelect')?.value || 'No';
    const sistemicoDose = document.getElementById('sistemicoDose')?.value || '';
    const fameSelect = document.getElementById('fameSelect')?.value || 'No';
    const fameDose = document.getElementById('fameDose')?.value || '';
    const biologicoSelect = document.getElementById('biologicoSelect')?.value || 'No';
    const biologicoDose = document.getElementById('biologicoDose')?.value || '';
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

    const pcr = document.getElementById('pcr')?.value || '';
    const vsg = document.getElementById('vsg')?.value || '';
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

    const datosCompletos = {
        idPaciente, nombrePaciente, fechaVisita, sexoPaciente, tipoVisita, profesional,
        diagnosticoPrimario, diagnosticoSecundario,
        hlaB27, fr, apcc,
        inicioSintomas, inicioPsoriasis, dolorAxial, rigidezMatutina, duracionRigidez, irradiacionNalgas, clinicaAxialPresente,
        nad, nat, dactilitis, homunculusNadMap, homunculusNatMap, dactilitisMap,
        peso, talla, imc, ta,
        sistemicoSelect, sistemicoDose, fameSelect, fameDose, biologicoSelect, biologicoDose,
        tratamientoActual, fechaInicioTratamiento, fechaProximaRevision,
        evaGlobal, evaDolor, evaFatiga, rigidezMatutinaMin, dolorNocturno,
        pcr, vsg, otrosHallazgosAnalitica, hallazgosRadiografia, hallazgosRMN,
        basdaiP1, basdaiP2, basdaiP3, basdaiP4, basdaiP5, basdaiP6, basdaiResult,
        asdasDolorEspalda, asdasDuracionRigidez, asdasEvaGlobal, asdasCrpResult, asdasEsrResult,
        schober, rotacionCervical, distanciaOP, distanciaTP, expansionToracica, distanciaIntermaleolar,
        decisionTerapeutica, tratamientoData,
        afectacionPsoriasis, extraArticular, comorbilidad, antecedentesFamiliares, toxicos, entesitis, otrasEntesitis,
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
    // 1. Leer todos los campos simples del formulario de seguimiento
    const idPaciente = document.getElementById('idPaciente').value;
    const nombrePaciente = document.getElementById('nombrePaciente').value;
    const fechaVisita = document.getElementById('fechaVisita').value;

    // Capturar nombre del profesional desde el DOM
    const profesional = document.getElementById('currentProfessional')?.textContent || 'No especificado';

    const diagnosticoPrimario = document.getElementById('diagnosticoPrimario').value;
    const diagnosticoSecundario = document.getElementById('diagnosticoSecundario').value;

    // Biomarcadores
    const hlaB27Btn = document.querySelector('.hla-btn.active:not(.fr-btn):not(.apcc-btn)');
    const hlaB27 = hlaB27Btn ? hlaB27Btn.dataset.value : 'no-analizado';

    const frBtn = document.querySelector('.fr-btn.active');
    const fr = frBtn ? frBtn.dataset.value : 'no-analizado';

    const apccBtn = document.querySelector('.apcc-btn.active');
    const apcc = apccBtn ? apccBtn.dataset.value : 'no-analizado';

    // Signos vitales
    const peso = document.getElementById('peso').value;
    const talla = document.getElementById('talla').value;
    const imc = document.getElementById('imc').value;
    const ta = document.getElementById('ta').value;

    // Plan terapéutico
    const sistemicoSelect = document.getElementById('cambioSistemicoSelect')?.value || 'No';
    const sistemicoDose = document.getElementById('cambioSistemicoDose')?.value || '';
    const fameSelect = document.getElementById('cambioFameSelect')?.value || 'No';
    const fameDose = document.getElementById('cambioFameDose')?.value || '';
    const biologicoSelect = document.getElementById('cambioBiologicoSelect')?.value || 'No';
    const biologicoDose = document.getElementById('cambioBiologicoDose')?.value || '';
    const fechaProximaRevision = document.getElementById('fechaProximaRevision')?.value || '';

    // Comentarios
    const comentariosAdicionales = document.getElementById('comentariosAdicionales')?.value || '';

    // 2. Llamar a HubTools.homunculus.getHomunculusData() y procesar su resultado para generar las columnas SI/NO
    const homunculusData = HubTools.homunculus.getHomunculusData();
    const nad = homunculusData.nad;
    const nat = homunculusData.nat;
    const dactilitis = homunculusData.dactilitis;

    // Construir el objeto datosCompletos
    const datosCompletos = {
        idPaciente, nombrePaciente, fechaVisita, profesional,
        diagnosticoPrimario, diagnosticoSecundario,
        hlaB27, fr, apcc,
        nad, nat, dactilitis,
        peso, talla, imc, ta,
        sistemicoSelect, sistemicoDose, fameSelect, fameDose, biologicoSelect, biologicoDose, fechaProximaRevision,
        comentariosAdicionales
    };

    return datosCompletos;
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
        }
        if (esrField) {
            esrField.value = result.asdasESR;
            var catESR = HubTools.scores.categorizeScore(parseFloat(result.asdasESR), 'asdas');
            esrField.style.backgroundColor = catESR.backgroundColor;
            esrField.style.color = catESR.color;
            esrField.title = catESR.label;
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

    // --- 8. AUTO-CÁLCULO RAPID3 ---
    function recalcularRAPID3() {
        if (typeof HubTools.scores.calcularRAPID3 !== 'function') return;

        var haqVal = parseFloat(document.getElementById('haqTotal')?.textContent) || 0;

        var datos = {
            haq: haqVal,
            evaDolor: document.getElementById('evaDolor')?.value || '0',
            evaGlobal: document.getElementById('evaGlobal')?.value || '0'
        };

        var result = HubTools.scores.calcularRAPID3(datos);

        var funcionEl = document.getElementById('rapid3Funcion');
        var dolorEl = document.getElementById('rapid3Dolor');
        var globalEl = document.getElementById('rapid3Global');
        var totalEl = document.getElementById('rapid3Total');
        var catEl = document.getElementById('rapid3Categoria');

        if (funcionEl) funcionEl.textContent = result.funcion;
        if (dolorEl) dolorEl.textContent = result.dolor;
        if (globalEl) globalEl.textContent = result.global;
        if (totalEl) totalEl.textContent = result.total;
        if (catEl) catEl.textContent = result.categoria;

        // Colorear
        var cat = HubTools.scores.categorizeScore(parseFloat(result.total), 'rapid3');
        if (totalEl) totalEl.style.color = cat.color;
    }
    console.log('  ✓ RAPID3 wiring');

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
    HubTools.form.setupTreatmentControls = setupTreatmentControls;
    HubTools.form.createTreatmentLine = createTreatmentLine;
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

