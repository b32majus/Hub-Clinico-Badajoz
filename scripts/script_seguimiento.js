// =====================================
// Script Seguimiento - Patrón Clásico
// =====================================
// Coordinador que inicializa la página de seguimiento, pre-rellena datos y gestiona eventos.

function getLast(items) {
    return Array.isArray(items) && items.length ? items[items.length - 1] : null;
}

function extractManifestations(visit) {
    if (!visit) return [];
    const output = [];
    if (Array.isArray(visit.manifestacionesExtra)) {
        output.push(...visit.manifestacionesExtra);
    }
    if (visit.manifestacionesExtraarticulares && typeof visit.manifestacionesExtraarticulares === 'object') {
        Object.entries(visit.manifestacionesExtraarticulares).forEach(([key, value]) => {
            if ((value || '').toString().toUpperCase() === 'SI') {
                output.push(key);
            }
        });
    }
    return output;
}

function extractComorbidities(visit) {
    if (!visit) return [];
    if (Array.isArray(visit.comorbilidades)) {
        return [...visit.comorbilidades];
    }
    if (visit.comorbilidades && typeof visit.comorbilidades === 'object') {
        return Object.keys(visit.comorbilidades).filter(key => {
            return (visit.comorbilidades[key] || '').toString().toUpperCase() === 'SI';
        });
    }
    return [];
}

function getMockSeguimientoBundle(patientId) {
    if (typeof window.MockPatients?.getById !== 'function') {
        return null;
    }
    const mock = window.MockPatients.getById(patientId);
    if (!mock) {
        return null;
    }

    const visits = Array.isArray(mock.visits) ? [...mock.visits] : [];
    visits.sort((a, b) => new Date(b.fechaVisita) - new Date(a.fechaVisita));

    return {
        summary: {
            idPaciente: mock.summary.idPaciente,
            nombrePaciente: mock.summary.nombre,
            diagnosticoPrimario: (mock.summary.pathology || mock.summary.diagnosticoPrimario || '').toLowerCase(),
            tratamientoActual: mock.summary.tratamientoActual || '',
            fechaInicioTratamiento: getLast(mock.treatmentHistory)?.startDate || '',
            hlaB27: getLast(visits)?.hlaB27 || 'no-analizado',
            fr: getLast(visits)?.fr || 'no-analizado',
            apcc: getLast(visits)?.apcc || 'no-analizado'
        },
        history: {
            allVisits: visits,
            latestVisit: visits[0] || null,
            firstVisit: visits[visits.length - 1] || null,
            pathology: (mock.pathology || mock.summary.pathology || mock.summary.diagnosticoPrimario || '').toLowerCase(),
            treatmentHistory: Array.isArray(mock.treatmentHistory) ? mock.treatmentHistory.slice() : []
        }
    };
}

function buildPrefillPayload({ patientId, history, baseRecord, patologiaParam }) {
    const latestVisit = history?.latestVisit || getLast(history?.allVisits);
    const activeTreatment = getLast(history?.treatmentHistory);
    const pathology = (patologiaParam || history?.pathology || baseRecord?.diagnosticoPrimario || baseRecord?.pathology || '').toLowerCase();

    return {
        idPaciente: patientId,
        nombrePaciente: latestVisit?.nombrePaciente || baseRecord?.Nombre_Paciente || baseRecord?.nombrePaciente || baseRecord?.nombre || '',
        diagnosticoPrimario: pathology,
        diagnosticoSecundario: baseRecord?.diagnosticoSecundario || baseRecord?.Diagnostico_Secundario || '',
        hlaB27: latestVisit?.hlaB27 || baseRecord?.hlaB27 || 'no-analizado',
        fr: latestVisit?.fr || baseRecord?.fr || 'no-analizado',
        apcc: latestVisit?.apcc || baseRecord?.apcc || 'no-analizado',
        tratamientoActual: baseRecord?.tratamientoActual || latestVisit?.biologicoSelect || activeTreatment?.name || '',
        fechaInicioTratamiento: baseRecord?.fechaInicioTratamiento || activeTreatment?.startDate || '',
        comorbilidades: extractComorbidities(latestVisit),
        manifestacionesExtra: extractManifestations(latestVisit),
        sexoPaciente: latestVisit?.sexoPaciente || baseRecord?.Sexo || baseRecord?.sexo || baseRecord?.sexoPaciente || '',
        fechaNacimiento: latestVisit?.fechaNacimiento || baseRecord?.Fecha_Nacimiento || baseRecord?.fechaNacimiento || ''
    };
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof HubTools === 'undefined') {
        console.error('❌ HubTools no disponible. Asegúrate de cargar hubTools.js primero.');
        return;
    }

    console.log('✅ Iniciando script de Seguimiento (coordinador)...');

    HubTools.data.initDatabaseFromStorage();
    HubTools.homunculus.initHomunculus();
    HubTools.form.inicializarCollapsibles();

    // --- POBLAR SELECTS DE FÁRMACOS DESDE LA BASE DE DATOS ---
    // Función para poblar selects (se ejecuta cuando BD está lista)
    function populateDrugSelects() {
        console.log('🔄 Iniciando población de selects de fármacos en seguimiento...');
        console.log('📊 Estado de la base de datos:', window.appState);
        
        // Verificar disponibilidad de funciones
        console.log('🔍 Disponibilidad de HubTools.data.getFarmacosPorTipo:', typeof HubTools?.data?.getFarmacosPorTipo);
        console.log('🔍 Disponibilidad de HubTools.form.populateSelectFromDatabase:', typeof HubTools?.form?.populateSelectFromDatabase);
        
        HubTools.form.populateSelectFromDatabase('cambioSistemicoSelect', 'Sistemicos');
        HubTools.form.populateSelectFromDatabase('cambioFameSelect', 'FAMEs');
        HubTools.form.populateSelectFromDatabase('cambioBiologicoSelect', 'Biologicos');
        console.log('✓ Selects de cambio de tratamiento poblados desde la base de datos');
        console.log('Fármacos Sistemicos:', HubTools.data.getFarmacosPorTipo('Sistemicos'));
        console.log('Fármacos FAMEs:', HubTools.data.getFarmacosPorTipo('FAMEs'));
        console.log('Fármacos Biologicos:', HubTools.data.getFarmacosPorTipo('Biologicos'));
    }

    // Poblar inmediatamente si la BD ya está cargada
    if (window.appState?.isLoaded) {
        console.log('📊 Base de datos ya está cargada, poblando selects inmediatamente...');
        populateDrugSelects();
    } else {
        console.log('⏳ Base de datos no cargada, esperando evento databaseLoaded...');
        // Si no está cargada, esperar al evento
        window.addEventListener('databaseLoaded', () => {
            console.log('📊 Evento databaseLoaded recibido, poblando selects de fármacos...');
            populateDrugSelects();
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('id');
    const patologiaParam = (urlParams.get('patologia') || '').toLowerCase();

    if (patientId) {
        console.log(`🔎 Cargando datos de seguimiento para ${patientId}`);

        let baseRecord = null;
        let historyData = null;

        if (typeof HubTools.data?.findPatientById === 'function') {
            baseRecord = HubTools.data.findPatientById(patientId);
        }
        if (typeof HubTools.data?.getPatientHistory === 'function') {
            const history = HubTools.data.getPatientHistory(patientId);
            if (history && Array.isArray(history.allVisits) && history.allVisits.length > 0) {
                historyData = history;
            }
        }

        if (!baseRecord || !historyData) {
            const mockBundle = getMockSeguimientoBundle(patientId);
            if (mockBundle) {
                historyData = historyData || mockBundle.history;
                baseRecord = baseRecord || mockBundle.summary;
            }
        }

        if (!baseRecord && typeof HubTools.data?.findPatientById !== 'function') {
            console.warn(`⚠️ No se encontró información del paciente ${patientId}`);
        }

        const prefillPayload = buildPrefillPayload({
            patientId,
            history: historyData,
            baseRecord,
            patologiaParam
        });

        if (prefillPayload && prefillPayload.idPaciente) {
            HubTools.form.prefillSeguimientoForm(prefillPayload);
            const pathologyForForm = patologiaParam || prefillPayload.diagnosticoPrimario;
            if (pathologyForForm) {
                HubTools.form.adaptarFormulario(pathologyForForm);
            }
        } else {
            console.warn(`⚠️ No se pudo pre-rellenar el formulario para ${patientId}`);
            const idInput = document.getElementById('idPaciente');
            if (idInput) {
                idInput.value = patientId;
            }
            if (patologiaParam) {
                HubTools.form.adaptarFormulario(patologiaParam);
            }
        }
    }

    // --- EVENTOS DE UI ---
    const diagnosticoSelect = document.getElementById('diagnosticoPrimario');
    diagnosticoSelect?.addEventListener('change', () => {
        HubTools.form.adaptarFormulario(diagnosticoSelect.value);
    });

    document.querySelectorAll('.biomarker-badge').forEach(btn => {
        btn.addEventListener('click', function () {
            const group = this.classList.contains('hla-btn') ? '.hla-btn'
                : this.classList.contains('fr-btn') ? '.fr-btn'
                : '.apcc-btn';
            document.querySelectorAll(group).forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            this.classList.toggle('active');
        });
    });

    document.querySelectorAll('.toxic-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const detailsInput = this.closest('.toxic-item').querySelector('.toxic-details');
            if (detailsInput) {
                detailsInput.disabled = !this.checked;
                if (!this.checked) {
                    detailsInput.value = '';
                }
            }
        });
    });

    const pesoInput = document.getElementById('peso');
    const tallaInput = document.getElementById('talla');
    const imcInput = document.getElementById('imc');
    if (pesoInput && tallaInput && imcInput) {
        const calcularIMC = () => {
            const peso = parseFloat(pesoInput.value);
            const talla = parseFloat(tallaInput.value);
            if (peso > 0 && talla > 0) {
                const imc = HubTools.utils.calcularIMC(peso, talla);
                imcInput.value = imc !== null ? imc.toFixed(1) : '';
            } else {
                imcInput.value = '';
            }
        };
        pesoInput.addEventListener('input', calcularIMC);
        tallaInput.addEventListener('input', calcularIMC);
    }

    // ==========================================
    // BOTONES CAMBIAR TRATAMIENTO
    // ==========================================
    const btnContinuarTratamiento = document.getElementById('btnContinuarTratamiento');
    const btnCambiarTratamiento = document.getElementById('btnCambiarTratamiento');

    if (btnContinuarTratamiento && btnCambiarTratamiento) {
        btnContinuarTratamiento.addEventListener('click', function() {
            // Activar botón seleccionado
            btnContinuarTratamiento.classList.add('active');
            btnCambiarTratamiento.classList.remove('active');

            // Mostrar sección correspondiente
            if (HubTools.form.mostrarContinuar) {
                HubTools.form.mostrarContinuar();
            }

            console.log('✓ Modo: Continuar tratamiento');
        });

        btnCambiarTratamiento.addEventListener('click', function() {
            // Activar botón seleccionado
            btnCambiarTratamiento.classList.add('active');
            btnContinuarTratamiento.classList.remove('active');

            // Mostrar sección correspondiente
            if (HubTools.form.mostrarCambio) {
                HubTools.form.mostrarCambio();
            }

            console.log('✓ Modo: Cambiar tratamiento');
        });

        console.log('✓ Event listeners para botones de tratamiento inicializados');
    } else {
        console.warn('⚠ Botones de tratamiento no encontrados');
    }

        const btnExportTxt = document.getElementById('btnExportarTXT');

    

        if (btnExportTxt) {

            btnExportTxt.addEventListener('click', () => {

                console.log('🔄 === INICIANDO EXPORTACIÓN TXT (SEGUIMIENTO) ===');

                console.log('📊 Estado de HubTools:', {

                    disponible: typeof HubTools !== 'undefined',

                    form: typeof HubTools?.form !== 'undefined',

                    export: typeof HubTools?.export !== 'undefined',

                    utils: typeof HubTools?.utils !== 'undefined'

                });

    

                try {

                    const errores = HubTools.form.validarFormularioSeguimiento(); // Use seguimiento validation

                    console.log('📋 Resultado validación (seguimiento):', errores);

    

                    if (errores.length === 0) {

                        console.log('✓ Formulario válido, recopilando datos...');

    

                        if (typeof HubTools?.form?.recopilarDatosFormularioSeguimiento !== 'function') {

                            console.error('❌ HubTools.form.recopilarDatosFormularioSeguimiento no disponible');

                            HubTools.utils?.mostrarNotificacion?.('Error: función de recopilación no disponible', 'error');

                            return;

                        }

    

                        if (typeof HubTools?.export?.exportarTXT !== 'function') {

                            console.error('❌ HubTools.export.exportarTXT no disponible');

                            HubTools.utils?.mostrarNotificacion?.('Error: función de exportación no disponible', 'error');

                            return;

                        }

    

                        const datos = HubTools.form.recopilarDatosFormularioSeguimiento(); // Use seguimiento data collection

                        console.log('📊 Datos recopilados (seguimiento):', datos);

    

                        console.log('📤 Iniciando exportación TXT...');

                        HubTools.export.exportarTXT(datos);

                    } else {

                        console.warn('⚠ Errores de validación (seguimiento):', errores);

                        HubTools.utils?.mostrarNotificacion?.(`Faltan campos obligatorios: ${errores.join(', ')}`, 'error');

                    }

                } catch (error) {

                    console.error('❌ Error capturado en exportación TXT (seguimiento):', error);

                    console.error('Stack trace:', error.stack);

                    HubTools.utils?.mostrarNotificacion?.(`Error al exportar: ${error.message}`, 'error');

                }

            });

        }

    

        // --- EVENTO: Botón Estructurar CSV ---

        const btnExportCsv = document.getElementById('btnEstructurarCSV');

    

        if (btnExportCsv) {

            btnExportCsv.addEventListener('click', () => {

                console.log('🔄 === INICIANDO EXPORTACIÓN CSV (SEGUIMIENTO) ===');

                console.log('📊 Estado de HubTools:', {

                    disponible: typeof HubTools !== 'undefined',

                    form: typeof HubTools?.form !== 'undefined',

                    export: typeof HubTools?.export !== 'undefined',

                    utils: typeof HubTools?.utils !== 'undefined'

                });

    

                try {

                    const errores = HubTools.form.validarFormularioSeguimiento(); // Use seguimiento validation

                    console.log('📋 Resultado validación (seguimiento):', errores);

    

                    if (errores.length === 0) {

                        console.log('✓ Formulario válido, recopilando datos...');

    

                        if (typeof HubTools?.form?.recopilarDatosFormularioSeguimiento !== 'function') {

                            console.error('❌ HubTools.form.recopilarDatosFormularioSeguimiento no disponible');

                            HubTools.utils?.mostrarNotificacion?.('Error: función de recopilación no disponible', 'error');

                            return;

                        }

    

                        if (typeof HubTools?.export?.exportarYCopiarCSV !== 'function') {

                            console.error('❌ HubTools.export.exportarYCopiarCSV no disponible');

                            HubTools.utils?.mostrarNotificacion?.('Error: función de exportación CSV no disponible', 'error');

                            return;

                        }

    

                        const datos = HubTools.form.recopilarDatosFormularioSeguimiento(); // Use seguimiento data collection

                        console.log('📊 Datos recopilados (seguimiento):', datos);

    

                        const diagnostico = document.getElementById('diagnosticoPrimario').value;

                        console.log('🔍 Diagnóstico seleccionado:', diagnostico);

    

                        console.log('📤 Iniciando exportación CSV...');

                        HubTools.export.exportarYCopiarCSV(datos, 'seguimiento', diagnostico); // Pass 'seguimiento'

                    } else {

                        console.warn('⚠ Errores de validación encontrados (seguimiento)');

                        HubTools.utils?.mostrarNotificacion?.(`Faltan campos obligatorios: ${errores.join(', ')}`, 'error');

                    }

                } catch (error) {

                    console.error('❌ Error capturado en exportación CSV (seguimiento):', error);

                    console.error('Stack trace:', error.stack);

                    HubTools.utils?.mostrarNotificacion?.(`Error al exportar CSV: ${error.message}`, 'error');

                }

            });

        }
console.log('✅ Seguimiento inicializado correctamente');
});
