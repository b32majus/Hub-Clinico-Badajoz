// /modules/dataManager.js
// ACTUALIZACIï¿½N: Patrï¿½n clï¿½sico (sin import/export) + funciones adicionales para Fase 2
let appState = { isLoaded: false, db: null };

/**
 * Guarda la base de datos en localStorage con manejo inteligente de tamaï¿½o
 * Si la BD es demasiado grande, guarda solo una versiï¿½n limitada
 */
function saveToSessionStorage() {
    /**
     * Intenta guardar con un lÃ­mite de visitas dado.
     * Retorna true si tuvo Ã©xito, false si QuotaExceededError.
     */
    function tryStore(visitLimit) {
        const dbToStore = visitLimit
            ? {
                ...appState.db,
                ESPA: (appState.db?.ESPA || []).slice(-visitLimit),
                APS: (appState.db?.APS || []).slice(-visitLimit),
                AR: (appState.db?.AR || []).slice(-visitLimit)
            }
            : appState.db;

        const json = JSON.stringify(dbToStore);
        localStorage.setItem('hubClinicoDB', json);
        localStorage.setItem('hubClinicoDB_limited', visitLimit ? 'true' : 'false');
        return json;
    }

    try {
        const data = JSON.stringify(appState.db);
        const sizeKB = new Blob([data]).size / 1024;
        const sizeMB = sizeKB / 1024;

        if (sizeKB <= 4096) {
            // Cabe completa
            tryStore(null);
            localStorage.removeItem('hubClinicoDB_limited');
            console.log(`Base de datos completa guardada en localStorage (${sizeKB.toFixed(0)}KB).`);
            return;
        }

        // Fallback en cascada: 100 â†’ 30 visitas
        console.warn(`Base de datos grande (${sizeMB.toFixed(2)}MB). Intentando versiÃ³n limitada.`);

        var stored = false;
        var limits = [100, 30];
        for (var i = 0; i < limits.length; i++) {
            try {
                tryStore(limits[i]);
                console.log('Base de datos limitada guardada (' + limits[i] + ' visitas/patologÃ­a).');
                if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
                    HubTools.utils.mostrarNotificacion(
                        'BD grande. CachÃ© limitado a Ãºltimas ' + limits[i] + ' visitas por patologÃ­a.',
                        'warning'
                    );
                }
                stored = true;
                break;
            } catch (innerErr) {
                if (innerErr.name === 'QuotaExceededError' || innerErr.code === 22) {
                    console.warn('Fallback a ' + limits[i] + ' visitas fallÃ³. Intentando menos...');
                    continue;
                }
                throw innerErr; // Error no relacionado con cuota
            }
        }

        if (!stored) {
            throw new Error('No se pudo guardar ni con 30 visitas por patologÃ­a.');
        }

    } catch (e) {
        console.error('Error al guardar en localStorage:', e);

        localStorage.removeItem('hubClinicoDB');
        localStorage.removeItem('hubClinicoDB_limited');

        if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
            HubTools.utils.mostrarNotificacion(
                'Error: No se pudo guardar la BD en cachÃ©. Funcionalidad limitada entre pÃ¡ginas.',
                'error'
            );
        }
    }
}

/**
 * Cabeceras crÃ­ticas esperadas por hoja clÃ­nica.
 * No se validan TODAS las columnas (188 en ESPA/APS, 321 en AR),
 * solo las que el cÃ³digo JS lee activamente para cÃ¡lculos, dashboards y exportaciÃ³n.
 * Si falta alguna de estas, la app puede fallar silenciosamente.
 */
var CRITICAL_HEADERS = {
    ESPA: [
        'ID_Paciente', 'Nombre_Paciente', 'Sexo', 'Fecha_Visita', 'Tipo_Visita',
        'Diagnostico_Primario', 'HLA-B27', 'FR', 'aPCC',
        'NAD_Total', 'NAT_Total', 'Dactilitis_Total',
        'Peso', 'Talla', 'IMC',
        'EVA_Global', 'EVA_Dolor', 'PCR', 'VSG',
        'BASDAI_Result', 'ASDAS_CRP_Result', 'ASDAS_ESR_Result',
        'Tratamiento_Actual', 'Decision_Terapeutica',
        'Fecha_Inicio_Tratamiento', 'Fecha_Proxima_Revision'
    ],
    APS: [
        'ID_Paciente', 'Nombre_Paciente', 'Sexo', 'Fecha_Visita', 'Tipo_Visita',
        'Diagnostico_Primario', 'HLA-B27', 'FR', 'aPCC',
        'NAD_Total', 'NAT_Total', 'Dactilitis_Total',
        'Peso', 'Talla', 'IMC',
        'EVA_Global', 'EVA_Dolor', 'PCR', 'VSG',
        'BASDAI_Result', 'ASDAS_CRP_Result', 'ASDAS_ESR_Result',
        'Tratamiento_Actual', 'Decision_Terapeutica',
        'Fecha_Inicio_Tratamiento', 'Fecha_Proxima_Revision'
    ],
    AR: [
        'ID_Paciente', 'Nombre_Paciente', 'Sexo', 'Fecha_Visita', 'Tipo_Visita',
        'Diagnostico_Primario', 'HLA_B27', 'FR', 'APCC', 'ANA',
        'NAD_Total', 'NAT_Total', 'NAD28', 'NAT28',
        'Peso', 'Talla', 'IMC',
        'EVA_Global', 'EVA_Dolor', 'EVA_Medico', 'PCR', 'VSG',
        'DAS28_CRP_Result', 'DAS28_ESR_Result', 'CDAI_Result', 'SDAI_Result',
        'BASDAI_Result', 'HAQ_Total', 'RAPID3_Score',
        'Tratamiento_Actual', 'Decision_Terapeutica_PV', 'Decision_Terapeutica_SEG',
        'Fecha_Inicio_Tratamiento', 'Fecha_Proxima_Revision'
    ]
};

/**
 * Valida las cabeceras de una hoja clÃ­nica contra las cabeceras crÃ­ticas esperadas.
 * @param {string} sheetName - Nombre de la hoja (ESPA, APS, AR).
 * @param {Array} sheetData - Datos parseados por SheetJS (array de objetos).
 * @returns {Array} - Lista de cabeceras crÃ­ticas faltantes (vacÃ­a si todo OK).
 */
function validateSheetHeaders(sheetName, sheetData) {
    var expected = CRITICAL_HEADERS[sheetName];
    if (!expected || !sheetData || sheetData.length === 0) return [];

    // SheetJS usa las cabeceras como keys del primer objeto
    var actualHeaders = Object.keys(sheetData[0]);
    var missing = expected.filter(function(h) {
        return actualHeaders.indexOf(h) === -1;
    });

    if (missing.length > 0) {
        console.warn(
            'Hoja ' + sheetName + ': faltan ' + missing.length +
            ' columnas crÃ­ticas: ' + missing.join(', ')
        );
    } else {
        console.log('Hoja ' + sheetName + ': todas las cabeceras crÃ­ticas presentes.');
    }

    return missing;
}

/**
 * Carga un archivo .xlsx, lo procesa con SheetJS y lo guarda en el estado de la aplicaciï¿½n.
 * Es el corazï¿½n del dataManager y la ï¿½nica funciï¿½n que interactï¿½a directamente con el archivo.
 * @param {File} file - El objeto File seleccionado por el usuario desde un <input type="file">.
 * @returns {Promise<boolean>} - Devuelve 'true' si la carga fue exitosa, 'false' si fallï¿½.
 */
async function loadDatabase(file) {
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);

        const dbData = {};

        // Verificar que las hojas clÃ­nicas esperadas existen
        var requiredSheets = ['ESPA', 'APS', 'AR'];
        var missingSheets = requiredSheets.filter(function(s) { return !workbook.Sheets[s]; });
        if (missingSheets.length > 0) {
            console.warn('Hojas faltantes en el Excel: ' + missingSheets.join(', '));
            if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
                HubTools.utils.mostrarNotificacion(
                    'Aviso: El Excel no contiene las hojas: ' + missingSheets.join(', ') + '. Algunos datos no estarÃ¡n disponibles.',
                    'warning'
                );
            }
        }

        // Itera sobre las hojas de datos de pacientes y profesionales
        ['ESPA', 'APS', 'AR', 'Profesionales'].forEach(sheetName => {
            if (workbook.Sheets[sheetName]) {
                let sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                if (sheetName === 'Profesionales') {
                    sheetData = sheetData.map(row => {
                        // ============================================================
                        // Normalizar columna de CARGO
                        // ============================================================
                        const cargoKey = Object.keys(row).find(key => key.toLowerCase() === 'cargo' || key.toLowerCase() === 'rol');
                        if (cargoKey && row[cargoKey] !== undefined && !row.cargo) {
                            row.cargo = row[cargoKey];
                            if (cargoKey !== 'cargo') { // Only delete if it's not already 'cargo'
                                delete row[cargoKey];
                            }
                        }

                        // ============================================================
                        // Normalizar columna de NOMBRE
                        // ============================================================
                        const nombreKey = Object.keys(row).find(key => {
                            const keyLower = key.toLowerCase();
                            return keyLower.includes('nombre') ||
                                keyLower === 'name' ||
                                keyLower === 'profesional';
                        });

                        if (nombreKey && row[nombreKey] !== undefined && !row.Nombre_Completo) {
                            row.Nombre_Completo = row[nombreKey];
                            // Eliminar la clave original solo si es diferente
                            if (nombreKey !== 'Nombre_Completo') {
                                delete row[nombreKey];
                            }
                        }

                        return row;
                    });
                }
                dbData[sheetName] = sheetData;
            }
        });

        // 3b. Validar cabeceras crÃ­ticas de las hojas clÃ­nicas
        var allMissing = {};
        ['ESPA', 'APS', 'AR'].forEach(function(sheet) {
            if (dbData[sheet] && dbData[sheet].length > 0) {
                var missing = validateSheetHeaders(sheet, dbData[sheet]);
                if (missing.length > 0) {
                    allMissing[sheet] = missing;
                }
            }
        });

        if (Object.keys(allMissing).length > 0) {
            var warningLines = Object.keys(allMissing).map(function(sheet) {
                return sheet + ': ' + allMissing[sheet].join(', ');
            });
            console.warn('Cabeceras crÃ­ticas faltantes:\n' + warningLines.join('\n'));

            if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
                HubTools.utils.mostrarNotificacion(
                    'Aviso: Algunas columnas esperadas no se encontraron en el Excel. ' +
                    'Puede haber funcionalidad limitada. Revise la consola para detalles.',
                    'warning'
                );
            }
        }

        // 4. Procesa la hoja 'FÃ¡rmacos' para crear un objeto anidado.
        // Estructura vacÃ­a por defecto (fallback si la hoja no existe o estÃ¡ vacÃ­a)
        dbData['FÃ¡rmacos'] = { Sistemicos: [], FAMEs: [], Biologicos: [] };

        const farmacosSheetKey = Object.keys(workbook.Sheets).find(function(k) {
            return k.toLowerCase().replace(/Ã¡/g, 'a') === 'farmacos';
        });

        if (farmacosSheetKey && workbook.Sheets[farmacosSheetKey]) {
            const farmacosSheet = workbook.Sheets[farmacosSheetKey];
            const farmacosJSON = XLSX.utils.sheet_to_json(farmacosSheet, { header: 1 });

            if (farmacosJSON.length > 1) {
                for (let i = 1; i < farmacosJSON.length; i++) {
                    const row = farmacosJSON[i];
                    if (row[0]) { // Columna 0: Sistemicos
                        dbData['Fï¿½rmacos'].Sistemicos.push(row[0]);
                    }
                    if (row[1]) { // Columna 1: FAMEs
                        dbData['Fï¿½rmacos'].FAMEs.push(row[1]);
                    }
                    if (row[2]) { // Columna 2: Biologicos
                        dbData['Fï¿½rmacos'].Biologicos.push(row[2]);
                    }
                }
            }
        } else {
            console.warn('Hoja de FÃ¡rmacos no encontrada en el Excel. Se usarÃ¡ catÃ¡logo vacÃ­o.');
        }

        // 5. Actualiza el estado global de la aplicaciÃ³n.
        appState.db = dbData;
        appState.isLoaded = true;

        console.log("Base de datos cargada y procesada con ï¿½xito:", appState.db);

        // Disparar evento personalizado para notificar que la BD estï¿½ cargada
        window.dispatchEvent(new CustomEvent('databaseLoaded', { detail: appState.db }));
        console.log('? Evento databaseLoaded disparado');

        // Guardar en localStorage para persistencia entre pï¿½ginas
        saveToSessionStorage();

        // 6. Devuelve 'true' para indicar que la operaciï¿½n fue exitosa.
        return true;

    } catch (error) {
        // Si algo falla en cualquier punto, lo capturamos aquï¿½.
        console.error("Error crï¿½tico al cargar o procesar la base de datos:", error);

        // Reseteamos el estado para evitar que la aplicaciï¿½n trabaje con datos corruptos.
        appState.isLoaded = false;
        appState.db = null;

        // 7. Devuelve 'false' para indicar que la operaciï¿½n fallï¿½.
        return false;
    }
}

/**
 * Devuelve la lista de profesionales.
 * @returns {Array} Array de objetos de profesionales.
 */
function getProfesionales() {
    if (!appState.isLoaded) return [];
    return appState.db?.Profesionales || [];
}

/**
 * Devuelve la lista de fï¿½rmacos para un tipo especï¿½fico.
 * @param {string} tipo - El tipo de fï¿½rmaco (e.g., 'Tratamientos_Sistemicos', 'FAMEs', 'Biologicos').
 * @returns {Array} Array de strings con los nombres de los fï¿½rmacos.
 */
function getFarmacosPorTipo(tipo) {
    console.log('DEBUG: getFarmacosPorTipo called with tipo:', tipo);
    if (!appState.isLoaded) {
        console.warn('? Base de datos no cargada. No se pueden obtener fï¿½rmacos.');
        return [];
    }

    // Mapeo para mayor flexibilidad y compatibilidad
    const tipoMapping = {
        'Sistemicos': ['Sistemicos', 'Tratamientos_Sistemicos', 'sistemicos'],
        'FAMEs': ['FAMEs', 'fames'],
        'Biologicos': ['Biologicos', 'biologicos']
    };

    // Intentar encontrar el tipo solicitado en mï¿½ltiples posibles claves
    const possibleKeys = tipoMapping[tipo] || [tipo];

    for (const key of possibleKeys) {
        if (appState.db?.['Fï¿½rmacos']?.[key] && Array.isArray(appState.db['Fï¿½rmacos'][key])) {
            console.log(`? Encontrados ${appState.db['Fï¿½rmacos'][key].length} fï¿½rmacos del tipo "${tipo}" (clave: ${key})`);
            console.log('DEBUG: Returning fï¿½rmacos:', appState.db['Fï¿½rmacos'][key]);
            return appState.db['Fï¿½rmacos'][key];
        }
    }
    console.warn(`? No se encontraron fï¿½rmacos para el tipo: ${tipo} con las claves posibles: ${possibleKeys.join(', ')}`);
    return [];
}

/**
 * Devuelve todos los pacientes de todas las hojas
 * @returns {Array} Array de todos los pacientes
 */
function getAllPatients() {
    if (!appState.isLoaded) return [];
    const allPatients = [];
    ['ESPA', 'APS', 'AR'].forEach(sheetName => {
        if (appState.db?.[sheetName]) {
            allPatients.push(...appState.db[sheetName]);
        }
    });
    return allPatients;
}

/**
 * Busca un paciente por ID en todas las hojas
 * @param {string} patientId - ID del paciente (ej: "ESP-2023-001")
 * @returns {Object|null} - Datos del paciente o null si no existe
 */
function findPatientById(patientId) {
    if (!patientId) {
        return null;
    }

    if (appState.isLoaded) {
        const sheets = ['ESPA', 'APS', 'AR'];
        for (const sheetName of sheets) {
            const patients = appState.db?.[sheetName] || [];
            const patient = patients.find(p => p.ID_Paciente === patientId);
            if (patient) {
                const normalizeRecord = HubTools?.normalizer?.normalizeRecord;
                return typeof normalizeRecord === 'function'
                    ? normalizeRecord(patient, { pathology: sheetName.toLowerCase() })
                    : { ...patient, pathology: sheetName.toLowerCase() };
            }
        }
    }

    if (typeof window.MockPatients?.getById === 'function') {
        const mockPatient = window.MockPatients.getById(patientId);
        if (mockPatient) {
            console.log(`findPatientById: Paciente ${patientId} encontrado en MockPatients.`);
            const summary = { ...mockPatient.summary };
            if (!summary.pathology) {
                summary.pathology = mockPatient.pathology || null;
            }
            return summary;
        }
    }

    console.warn(`findPatientById: Paciente ${patientId} no encontrado en base de datos ni en MockPatients.`);
    return null;
}

/**
 * Obtiene todas las visitas de un paciente con estructura mejorada para el dashboard
 * @param {string} patientId - ID del paciente
 * @returns {Object} - Objeto con estructura: { allVisits, latestVisit, firstVisit, pathology, treatmentHistory, keyEvents }
 */
function getPatientHistory(patientId) {
    const emptyHistory = { allVisits: [], latestVisit: null, firstVisit: null, pathology: null, treatmentHistory: [], keyEvents: [] };

    if (appState.isLoaded) {
        const sheets = ['ESPA', 'APS', 'AR'];
        const visits = [];
        let pathology = null;

        sheets.forEach(sheetName => {
            const patients = appState.db?.[sheetName] || [];
            const patientVisits = patients.filter(p => p.ID_Paciente === patientId);
            patientVisits.forEach(visit => {
                const normalizeRecord = HubTools?.normalizer?.normalizeRecord;
                const normalizedVisit = typeof normalizeRecord === 'function'
                    ? normalizeRecord(visit, { pathology: sheetName.toLowerCase() })
                    : {
                        ...visit,
                        pathology: sheetName.toLowerCase(),
                        basdaiResult: visit.BASDAI_Result ?? visit.basdaiResult ?? visit.BASDAI,
                        asdasCrpResult: visit.ASDAS_CRP_Result ?? visit.asdasCrpResult ?? visit.ASDAS,
                        haqResult: visit.HAQ_Total ?? visit.haqResult ?? visit.HAQ,
                        basfiResult: visit.BASFI_Result ?? visit.basfiResult ?? visit.BASFI,
                        das28CrpResult: visit.DAS28_CRP_Result ?? visit.DAS28_CRP ?? visit.das28CrpResult ?? visit.das28Crp,
                        das28EsrResult: visit.DAS28_ESR_Result ?? visit.DAS28_ESR ?? visit.das28EsrResult ?? visit.das28Esr,
                        cdaiResult: visit.CDAI_Result ?? visit.CDAI ?? visit.cdaiResult ?? visit.cdai,
                        sdaiResult: visit.SDAI_Result ?? visit.SDAI ?? visit.sdaiResult ?? visit.sdai,
                        rapid3Result: visit.RAPID3_Score ?? visit.RAPID3 ?? visit.rapid3Result ?? visit.rapid3Total,
                        ana: visit.ANA ?? visit.ana,
                        fr: visit.FR ?? visit.fr,
                        apcc: visit.APCC ?? visit.aPCC ?? visit.apcc,
                        pcr: visit.PCR ?? visit.pcrResult,
                        vsg: visit.VSG ?? visit.vsgResult,
                        evaGlobal: visit.EVA_Global ?? visit.evaGlobal,
                        evaDolor: visit.EVA_Dolor ?? visit.evaDolor,
                        fechaVisita: visit.Fecha_Visita ?? visit.fechaVisita,
                        tratamientoActual: visit.Tratamiento_Actual ?? visit.tratamientoActual,
                        nombrePaciente: visit.Nombre_Paciente ?? visit.nombrePaciente ?? visit.Nombre,
                        sexoPaciente: visit.Sexo ?? visit.sexoPaciente,
                        tipoVisita: visit.Tipo_Visita ?? visit.tipoVisita
                    };
                visits.push(normalizedVisit);
                if (!pathology) pathology = sheetName.toLowerCase();
            });
        });

        if (visits.length > 0) {
            visits.sort((a, b) => {
                try {
                    const dateA = parseVisitDate(a.Fecha_Visita || a.fechaVisita);
                    const dateB = parseVisitDate(b.Fecha_Visita || b.fechaVisita);
                    return dateB - dateA;
                } catch (e) {
                    console.warn('Error al ordenar fechas:', e);
                    return 0;
                }
            });

            const treatmentHistory = extractTreatmentHistory(visits);
            const keyEvents = extractKeyEvents(visits, pathology);

            return {
                allVisits: visits,
                latestVisit: visits[0],
                firstVisit: visits[visits.length - 1],
                pathology: pathology,
                treatmentHistory: treatmentHistory,
                keyEvents: keyEvents
            };
        }
    }

    // Fallback to MockPatients
    if (typeof window.MockPatients?.getById === 'function') {
        const mockPatient = window.MockPatients.getById(patientId);
        if (mockPatient) {
            console.log(`getPatientHistory: Paciente ${patientId} encontrado en MockPatients.`);
            // The mock data is already sorted chronologically
            const sortedVisits = [...mockPatient.visits].sort((a, b) => new Date(b.fechaVisita) - new Date(a.fechaVisita));
            return {
                allVisits: sortedVisits,
                latestVisit: sortedVisits[0],
                firstVisit: sortedVisits[sortedVisits.length - 1],
                pathology: mockPatient.pathology,
                treatmentHistory: mockPatient.treatmentHistory || [],
                keyEvents: mockPatient.keyEvents || []
            };
        }
    }

    console.warn('Base de datos no cargada y sin fallback de mock para el historial.');
    return emptyHistory;
}

/**
 * Parsea una fecha de mï¿½ltiples formatos posibles
 * @param {string|Date} dateStr - Fecha en formato DD/MM/YYYY, YYYY-MM-DD, o ya Date
 * @returns {Date} - Objeto Date
 */
function parseVisitDate(dateStr) {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? new Date() : dateStr;

    var str = String(dateStr).trim();

    // Intentar formato DD/MM/YYYY
    if (str.includes('/')) {
        var parts = str.split('/');
        var parsed = new Date(parts[2], parts[1] - 1, parts[0]);
        if (!isNaN(parsed.getTime())) return parsed;
    }

    // Intentar formato YYYY-MM-DD u otros formatos nativos
    var fallback = new Date(str);
    if (!isNaN(fallback.getTime())) return fallback;

    // Si nada funciona, retornar fecha actual con warning
    console.warn('parseVisitDate: fecha no vÃ¡lida "' + dateStr + '", usando fecha actual.');
    return new Date();
}

/**
 * Extrae el historial de cambios de tratamiento a partir de las visitas
 * @param {Array} visits - Array de visitas ordenadas cronolï¿½gicamente (reciente primero)
 * @returns {Array} - Array de { date, name, reason }
 */
function extractTreatmentHistory(visits) {
    if (visits.length === 0) return [];

    const treatments = [];
    const seenTreatments = new Set();

    // Recorrer visitas en orden cronolï¿½gico inverso (antiguo a reciente)
    for (let i = visits.length - 1; i >= 0; i--) {
        const visit = visits[i];

        // Extraer tratamiento actual - usar nombres normalizados y del Excel
                const normalizeRecord = HubTools?.normalizer?.normalizeRecord;
        const normalizedVisit = typeof normalizeRecord === 'function' ? normalizeRecord(visit) : visit;
        let currentTreatment = normalizedVisit.tratamientoActual ||
            normalizedVisit.biologicoSelect || normalizedVisit.fameSelect || normalizedVisit.sistemicoSelect ||
            visit.Biologico || visit.FAME || visit['Sistï¿½mico'] || null;

        // Si encontramos un tratamiento nuevo (diferente al anterior), registrarlo
        if (currentTreatment && !seenTreatments.has(currentTreatment)) {
            seenTreatments.add(currentTreatment);
            treatments.push({
                startDate: normalizedVisit.fechaVisita || visit.Fecha_Visita || new Date(),
                name: currentTreatment,
                reason: normalizedVisit.motivoCambio || normalizedVisit.comentariosAdicionales || 'Tratamiento activo'
            });
        }
    }

    return treatments;
}

/**
 * Extrae eventos clï¿½nicos clave a partir de las visitas mediante comparaciï¿½n de valores
 * @param {Array} visits - Array de visitas ordenadas cronolï¿½gicamente (reciente primero)
 * @param {string} pathology - Tipo de patologï¿½a ('espa' o 'aps')
 * @returns {Array} - Array de { date, type, description }
 */
function extractKeyEvents(visits, pathology) {
    if (visits.length < 2) return []; // Se necesitan al menos 2 visitas para inferir eventos

    const events = [];
    const cutoffs = HubTools?.dashboard?.activityCutoffs || {};

    // Procesar visitas en orden cronolï¿½gico (antiguo a reciente)
    for (let i = visits.length - 1; i >= 0; i--) {
        const currentVisit = visits[i];
        const previousVisit = i > 0 ? visits[i + 1] : null;
        const visitDate = currentVisit.Fecha_Visita || currentVisit.fechaVisita;

        // 1. Registrar cambios explï¿½citos de tratamiento
        if (previousVisit) {
            const currentTx = currentVisit.biologicoSelect || currentVisit.fameSelect ||
                currentVisit.sistemicoSelect || currentVisit.Biologico ||
                currentVisit.FAME || currentVisit['Sistï¿½mico'];
            const previousTx = previousVisit.biologicoSelect || previousVisit.fameSelect ||
                previousVisit.sistemicoSelect || previousVisit.Biologico ||
                previousVisit.FAME || previousVisit['Sistï¿½mico'];

            if (currentTx && previousTx && currentTx !== previousTx) {
                events.push({
                    date: visitDate,
                    type: 'treatment',
                    description: `Cambio de tratamiento: ${previousTx} ? ${currentTx}`
                });
            }
        }

        // 2. Detectar eventos adversos si estï¿½n registrados
        if (currentVisit.efectosAdversos || currentVisit.adverseEvents) {
            events.push({
                date: visitDate,
                type: 'adverse',
                description: currentVisit.efectosAdversos || currentVisit.adverseEvents
            });
        }

        // 3. Detectar flares comparando puntuaciones
        if (previousVisit) {
            let isFlare = false;
            let flareReason = '';

            if (pathology === 'espa' || pathology === 'ESPA') {
                // Comparar BASDAI
                const currBASDAI = parseFloat(currentVisit.basdaiResult || currentVisit.BASDAI);
                const prevBASDAI = parseFloat(previousVisit.basdaiResult || previousVisit.BASDAI);

                if (!isNaN(currBASDAI) && !isNaN(prevBASDAI) && currBASDAI > prevBASDAI + 2) {
                    isFlare = true;
                    flareReason = `BASDAI ? (${prevBASDAI.toFixed(1)} ? ${currBASDAI.toFixed(1)})`;
                }

                // Comparar ASDAS-CRP
                if (!isFlare) {
                    const currASDAS = parseFloat(currentVisit.asdasCrpResult || currentVisit.ASDAS);
                    const prevASDAS = parseFloat(previousVisit.asdasCrpResult || previousVisit.ASDAS);

                    if (!isNaN(currASDAS) && !isNaN(prevASDAS) && currASDAS > prevASDAS + 0.8) {
                        isFlare = true;
                        flareReason = `ASDAS ? (${prevASDAS.toFixed(2)} ? ${currASDAS.toFixed(2)})`;
                    }
                }
            } else if (pathology === 'aps' || pathology === 'APS') {
                // Comparar HAQ
                const currHAQ = parseFloat(currentVisit.haqResult || currentVisit.HAQ);
                const prevHAQ = parseFloat(previousVisit.haqResult || previousVisit.HAQ);

                if (!isNaN(currHAQ) && !isNaN(prevHAQ) && currHAQ > prevHAQ + 0.5) {
                    isFlare = true;
                    flareReason = `HAQ ? (${prevHAQ.toFixed(2)} ? ${currHAQ.toFixed(2)})`;
                }

                // Comparar RAPID3
                if (!isFlare) {
                    const currRAPID3 = parseFloat(currentVisit.rapid3Result || currentVisit.RAPID3);
                    const prevRAPID3 = parseFloat(previousVisit.rapid3Result || previousVisit.RAPID3);

                    if (!isNaN(currRAPID3) && !isNaN(prevRAPID3) && currRAPID3 > prevRAPID3 + 2) {
                        isFlare = true;
                        flareReason = `RAPID3 ? (${prevRAPID3.toFixed(1)} ? ${currRAPID3.toFixed(1)})`;
                    }
                }
            }

            if (isFlare) {
                events.push({
                    date: visitDate,
                    type: 'flare',
                    description: `Brote clï¿½nico detectado: ${flareReason}`
                });
            }
        }

        // 4. Detectar remisiï¿½n cuando se alcanzan umbrales bajos
        let isRemission = false;
        let remissionReason = '';

        if (pathology === 'espa' || pathology === 'ESPA') {
            const basdai = parseFloat(currentVisit.basdaiResult || currentVisit.BASDAI);
            if (!isNaN(basdai) && basdai < (cutoffs.basdai?.remission || 4)) {
                isRemission = true;
                remissionReason = `BASDAI baja (${basdai.toFixed(1)})`;
            }
        } else if (pathology === 'aps' || pathology === 'APS') {
            const haq = parseFloat(currentVisit.haqResult || currentVisit.HAQ);
            if (!isNaN(haq) && haq < (cutoffs.haq?.remission || 0.5)) {
                isRemission = true;
                remissionReason = `HAQ en remisiï¿½n (${haq.toFixed(2)})`;
            }
        }

        if (isRemission && previousVisit) {
            // Solo registrar si la visita anterior NO estaba en remisiï¿½n
            const prevBASDAI = parseFloat(previousVisit.basdaiResult || previousVisit.BASDAI);
            const prevHAQ = parseFloat(previousVisit.haqResult || previousVisit.HAQ);

            let shouldRecord = false;
            if (pathology === 'espa' && !isNaN(prevBASDAI) && prevBASDAI >= 4) shouldRecord = true;
            if (pathology === 'aps' && !isNaN(prevHAQ) && prevHAQ >= 0.5) shouldRecord = true;

            if (shouldRecord) {
                events.push({
                    date: visitDate,
                    type: 'remission',
                    description: `Remisiï¿½n clï¿½nica alcanzada: ${remissionReason}`
                });
            }
        }
    }

    // Ordenar eventos por fecha (ascendente)
    events.sort((a, b) => {
        const dateA = parseVisitDate(a.date);
        const dateB = parseVisitDate(b.date);
        return dateA - dateB;
    });

    return events;
}

/**
 * Intenta inicializar la base de datos desde localStorage al cargar la pï¿½gina.
 * @returns {boolean} - Devuelve 'true' si la carga fue exitosa, 'false' si no.
 */
function initDatabaseFromStorage() {
    if (appState.isLoaded) {
        console.log('DB ya cargada, omitiendo carga desde localStorage.');
        return true;
    }

    try {
        const storedDb = localStorage.getItem('hubClinicoDB');
        if (storedDb) {
            const dbData = JSON.parse(storedDb);
            appState.db = dbData;
            appState.isLoaded = true;
            console.log('? Base de datos cargada desde localStorage.');

            // Disparar evento para que otros scripts sepan que los datos estï¿½n listos.
            // Usamos un pequeï¿½o timeout para asegurar que los listeners de otros scripts ya estï¿½n registrados.
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('databaseLoaded', { detail: appState.db }));
                console.log('? Evento databaseLoaded disparado desde localStorage.');
            }, 100);

            return true;
        }
    } catch (e) {
        console.error('? Error al cargar la base de datos desde localStorage:', e);
        localStorage.removeItem('hubClinicoDB'); // Limpiar datos corruptos
    }

    return false;
}


// =====================================
// FUNCIONES PARA DATOS REALES DEL EXCEL
// =====================================

function normalizeString(value) {
    if (value === undefined || value === null) return '';
    return value.toString().trim().toLowerCase();
}

function getFieldValue(record, keys) {
    for (const key of keys) {
        if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
            return record[key];
        }
    }
    return null;
}

function getNumericFieldValue(record, keys) {
    const value = getFieldValue(record, keys);
    if (value === null) return null;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
}

function parseFilterDate(value) {
    if (!value) return null;
    const parsed = parseVisitDate(value.toString());
    if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function getVisitDateValue(record) {
    const dateValue = getFieldValue(record, ['Fecha_Visita', 'fechaVisita']);
    if (!dateValue) return null;
    const parsed = parseVisitDate(dateValue.toString());
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function normalizeYesNo(value) {
    const normalized = normalizeString(value);
    if (!normalized) return null;

    if (['si', 's', 'true', '1', 'positivo', 'positive', 'pos'].includes(normalized)) {
        return true;
    }
    if (['no', 'false', '0', 'negativo', 'negative', 'neg'].includes(normalized)) {
        return false;
    }

    return null;
}

function getAgeValue(record) {
    const directAge = getNumericFieldValue(record, ['Edad', 'edad']);
    if (directAge !== null) return directAge;

    const birthDate = getFieldValue(record, [
        'Fecha_Nacimiento', 'fechaNacimiento', 'fecha_nacimiento', 'Nacimiento'
    ]);
    if (!birthDate) return null;

    if (typeof HubTools?.utils?.calcularEdad === 'function') {
        const age = HubTools.utils.calcularEdad(birthDate.toString());
        return typeof age === 'number' && !Number.isNaN(age) ? age : null;
    }

    const parsedBirth = parseVisitDate(birthDate.toString());
    if (Number.isNaN(parsedBirth.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - parsedBirth.getFullYear();
    const monthDiff = today.getMonth() - parsedBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsedBirth.getDate())) {
        age -= 1;
    }
    return age;
}

const METRIC_FIELDS = {
    BASDAI: ['BASDAI_Result', 'BASDAI', 'basdaiResult', 'basdai'],
    ASDAS: ['ASDAS_CRP_Result', 'ASDAS', 'asdasCrpResult', 'asdas'],
    DAS28_CRP: ['DAS28_CRP_Result', 'DAS28_CRP', 'das28CrpResult', 'das28Crp'],
    DAS28_ESR: ['DAS28_ESR_Result', 'DAS28_ESR', 'das28EsrResult', 'das28Esr'],
    CDAI: ['CDAI_Result', 'CDAI', 'cdaiResult', 'cdai'],
    SDAI: ['SDAI_Result', 'SDAI', 'sdaiResult', 'sdai'],
    RAPID3: ['RAPID3_Score', 'RAPID3', 'rapid3Result', 'rapid3Total', 'rapid3'],
    HAQ: ['HAQ_Total', 'HAQ', 'haqResult', 'haq'],
    PCR: ['PCR', 'pcrResult', 'pcr'],
    VSG: ['VSG', 'vsgResult', 'vsg'],
    EVA_DOLOR: ['EVA_Dolor', 'evaDolor', 'eva_dolor'],
    EVA_GLOBAL: ['EVA_Global', 'evaGlobal', 'eva_global']
};

function resolveMetricKey(metricLabel) {
    const normalized = normalizeString(metricLabel).replace(/\s+/g, '');
    if (normalized === 'basdai') return 'BASDAI';
    if (normalized === 'asdas') return 'ASDAS';
    if (normalized.includes('das28') && normalized.includes('crp')) return 'DAS28_CRP';
    if (normalized.includes('das28') && (normalized.includes('esr') || normalized.includes('vsg'))) return 'DAS28_ESR';
    if (normalized.startsWith('das28')) return 'DAS28_CRP';
    if (normalized === 'cdai') return 'CDAI';
    if (normalized === 'sdai') return 'SDAI';
    if (normalized === 'rapid3') return 'RAPID3';
    if (normalized === 'haq') return 'HAQ';
    if (normalized === 'pcr') return 'PCR';
    if (normalized === 'vsg') return 'VSG';
    if (normalized === 'evadolor') return 'EVA_DOLOR';
    if (normalized === 'evaglobal') return 'EVA_GLOBAL';
    return null;
}

function getMetricValue(record, metricLabel) {
    const key = resolveMetricKey(metricLabel);
    if (!key || !METRIC_FIELDS[key]) return null;
    return getNumericFieldValue(record, METRIC_FIELDS[key]);
}

const ACTIVITY_THRESHOLDS = {
    BASDAI: { remission: 2, low: 4, moderate: 6 },
    ASDAS: { remission: 1.3, low: 2.1, moderate: 3.5 },
    DAS28_CRP: { remission: 2.6, low: 3.2, moderate: 5.1 },
    DAS28_ESR: { remission: 2.6, low: 3.2, moderate: 5.1 },
    CDAI: { remission: 2.8, low: 10, moderate: 22 },
    SDAI: { remission: 3.3, low: 11, moderate: 26 },
    RAPID3: { remission: 3, low: 6, moderate: 12 },
    HAQ: { remission: 0.5, low: 1.5, moderate: 2 },
    PCR: { remission: 5, low: 10, moderate: 20 },
    VSG: { remission: 20, low: 40, moderate: 60 }
};

function getActivityBucket(metricLabel, value) {
    const metricKey = resolveMetricKey(metricLabel);
    if (!metricKey || value === null || value === undefined) return null;

    const thresholds = ACTIVITY_THRESHOLDS[metricKey];
    if (!thresholds) return null;

    if (value < thresholds.remission) return 'Remision';
    if (value < thresholds.low) return 'Baja Actividad';
    if (value < thresholds.moderate) return 'Moderada Actividad';
    return 'Alta Actividad';
}

function getBiomarkerStatus(record, markerKey) {
    const markerMap = {
        hla: ['HLA_B27', 'HLA-B27', 'hlaB27', 'hla'],
        fr: ['FR', 'fr'],
        apcc: ['APCC', 'aPCC', 'apcc']
    };
    const value = getFieldValue(record, markerMap[markerKey] || []);
    return normalizeYesNo(value);
}

function getTreatmentText(record) {
    return normalizeString(record.Tratamiento_Actual || record.tratamientoActual || '');
}

function getTreatmentCategory(record) {
    const text = getTreatmentText(record);
    if (!text) return 'other';

    const biologicKeys = [
        'biolog', 'anti-tnf', 'adalimumab', 'etanercept', 'infliximab',
        'golimumab', 'certolizumab', 'secukinumab', 'ixekizumab',
        'ustekinumab', 'guselkumab', 'risankizumab', 'tofacitinib', 'upadacitinib'
    ];
    if (biologicKeys.some(key => text.includes(key))) return 'biologic';

    const fameKeys = ['fame', 'metotrexato', 'leflunomida', 'sulfasalazina', 'ciclosporina', 'azatioprina'];
    if (fameKeys.some(key => text.includes(key))) return 'fame';

    const systemicKeys = ['sistemic', 'aine', 'ibuprofeno', 'naproxeno', 'diclofenaco', 'indometacina', 'etoricoxib'];
    if (systemicKeys.some(key => text.includes(key))) return 'systemic';

    return 'other';
}

const COMORBIDITY_FIELDS = {
    HTA: ['Comorbilidad_HTA', 'comorbilidad_hta'],
    DM: ['Comorbilidad_DM', 'comorbilidad_dm'],
    DLP: ['Comorbilidad_DLP', 'comorbilidad_dlp'],
    ECV: ['Comorbilidad_ECV', 'comorbilidad_ecv'],
    GASTRITIS: ['Comorbilidad_Gastritis', 'comorbilidad_gastritis'],
    OBESIDAD: ['Comorbilidad_Obesidad', 'comorbilidad_obesidad'],
    OSTEOPOROSIS: ['Comorbilidad_Osteoporosis', 'comorbilidad_osteoporosis'],
    GOTA: ['Comorbilidad_Gota', 'comorbilidad_gota']
};

const EXTRA_ARTICULAR_FIELDS = {
    DIGESTIVA: ['ExtraArticular_Digestiva', 'extraArticularDigestiva'],
    UVEITIS: ['ExtraArticular_Uveitis', 'extraArticularUveitis'],
    PSORIASIS: ['ExtraArticular_Psoriasis', 'extraArticularPsoriasis']
};

function isFieldPositive(record, fieldKeys) {
    return normalizeYesNo(getFieldValue(record, fieldKeys)) === true;
}

function hasAdverseEffect(record) {
    const effect = normalizeYesNo(getFieldValue(record, ['Cambio_Efectos_Adversos', 'efectosAdversos', 'adverseEvents']));
    if (effect === true) return true;

    const description = getFieldValue(record, ['Cambio_Descripcion_Efectos', 'descripcionEfectos']);
    return normalizeString(description) !== '';
}

function applyFiltersToPatients(patients, filters) {
    console.log('?? Aplicando filtros a', patients.length, 'pacientes');
    console.log('?? Filtros activos:', filters);

    const normalizedPathology = normalizeString(filters.pathology);
    const normalizedSex = normalizeString(filters.sex);
    const dateFrom = parseFilterDate(filters.dateFrom);
    const dateTo = parseFilterDate(filters.dateTo);
    if (dateFrom) dateFrom.setHours(0, 0, 0, 0);
    if (dateTo) dateTo.setHours(23, 59, 59, 999);

    const ageFrom = parseInt(filters.ageFrom, 10);
    const ageTo = parseInt(filters.ageTo, 10);
    const applyAgeFrom = !Number.isNaN(ageFrom);
    const applyAgeTo = !Number.isNaN(ageTo);

    const activityState = filters.activityState && filters.activityState !== 'Todos' ? filters.activityState : null;
    const activityIndex = filters.activityIndex || 'BASDAI';
    const evaDolorLimit = parseFloat(filters.evaDolor);
    const evaGlobalLimit = parseFloat(filters.evaGlobal);
    const applyEvaDolor = !Number.isNaN(evaDolorLimit) && evaDolorLimit < 10;
    const applyEvaGlobal = !Number.isNaN(evaGlobalLimit) && evaGlobalLimit < 10;

    const biomarkerFilter = filters.biomarker || '';
    const ttoTypeFilter = normalizeString(filters.ttoType);
    const ttoSpecificFilter = normalizeString(filters.ttoSpecific);
    const comorbidityFilter = (filters.comorbidity || '').toString().trim().toUpperCase();
    const extraArticularFilter = (filters.extraArticular || '').toString().trim().toUpperCase();
    const adverseEffectOnly = !!filters.adverseEffect;

    const result = patients.filter(p => {
        if (normalizedPathology && !['all', 'todos'].includes(normalizedPathology)) {
            const pathologyValue = normalizeString(p.pathology || p.Diagnostico_Primario || p.diagnosticoPrimario);
            if (!pathologyValue || pathologyValue !== normalizedPathology) return false;
        }

        if (dateFrom || dateTo) {
            const visitDate = getVisitDateValue(p);
            if (!visitDate) return false;
            if (dateFrom && visitDate < dateFrom) return false;
            if (dateTo && visitDate > dateTo) return false;
        }

        if (normalizedSex && !['all', 'todos'].includes(normalizedSex)) {
            const sexValue = normalizeString(p.Sexo || p.sexoPaciente || p.sexo);
            if (!sexValue || sexValue !== normalizedSex) return false;
        }

        if (applyAgeFrom || applyAgeTo) {
            const ageValue = getAgeValue(p);
            if (ageValue === null) return false;
            if (applyAgeFrom && ageValue < ageFrom) return false;
            if (applyAgeTo && ageValue > ageTo) return false;
        }

        if (biomarkerFilter && biomarkerFilter !== 'Todos') {
            const parts = biomarkerFilter.split('_');
            const markerRaw = parts[0] || '';
            const stateRaw = parts[1] || '';
            const markerKey = normalizeString(markerRaw).replace(/[^a-z0-9]/g, '');
            const expectedPositive = normalizeString(stateRaw).includes('positive');
            let status = null;

            if (markerKey.includes('hlab27') || markerKey === 'hla') {
                status = getBiomarkerStatus(p, 'hla');
            } else if (markerKey === 'fr') {
                status = getBiomarkerStatus(p, 'fr');
            } else if (markerKey === 'apcc') {
                status = getBiomarkerStatus(p, 'apcc');
            }

            if (status === null || status !== expectedPositive) return false;
        }

        if (activityState) {
            const metricValue = getMetricValue(p, activityIndex);
            const bucket = getActivityBucket(activityIndex, metricValue);
            if (!bucket || bucket !== activityState) return false;
        }

        if (applyEvaDolor) {
            const evaDolorValue = getMetricValue(p, 'EVA Dolor');
            if (evaDolorValue === null || evaDolorValue > evaDolorLimit) return false;
        }
        if (applyEvaGlobal) {
            const evaGlobalValue = getMetricValue(p, 'EVA Global');
            if (evaGlobalValue === null || evaGlobalValue > evaGlobalLimit) return false;
        }

        if (ttoTypeFilter && ttoTypeFilter !== 'todos') {
            const typeMap = { fames: 'fame', biologicos: 'biologic', sistemicos: 'systemic' };
            const expectedCategory = typeMap[ttoTypeFilter];
            const category = getTreatmentCategory(p);
            if (expectedCategory && category !== expectedCategory) return false;
        }

        if (ttoSpecificFilter && ttoSpecificFilter !== 'todos') {
            const treatmentText = getTreatmentText(p);
            if (!treatmentText || !treatmentText.includes(ttoSpecificFilter)) return false;
        }

        if (comorbidityFilter && comorbidityFilter !== 'TODOS') {
            const fieldKeys = COMORBIDITY_FIELDS[comorbidityFilter];
            if (!fieldKeys || !isFieldPositive(p, fieldKeys)) return false;
        }

        if (extraArticularFilter && extraArticularFilter !== 'TODOS') {
            const fieldKeys = EXTRA_ARTICULAR_FIELDS[extraArticularFilter];
            if (!fieldKeys || !isFieldPositive(p, fieldKeys)) return false;
        }

        if (adverseEffectOnly && !hasAdverseEffect(p)) return false;

        return true;
    });

    console.log('?? Despues de filtros:', result.length, 'pacientes');
    return result;
}

/**
 * Calcula KPIs segï¿½n la patologï¿½a seleccionada
 * - ESPA: usa BASDAI como mï¿½trica principal (remisiï¿½n < 2, alta >= 4)
 * - APS: usa HAQ como mï¿½trica principal (remisiï¿½n < 0.5, alta >= 2)
 * @param {Array} patients - Array de pacientes filtrados
 * @param {string} pathologyFilter - Patologï¿½a seleccionada ('ESPA', 'APS', 'Todos')
 */
function calculateRealKPIs(patients, pathologyFilter = 'Todos') {
    const total = patients.length;
    if (total === 0) {
        return {
            totalPatients: 0,
            remissionPercent: 0,
            highActivityPercent: 0,
            biologicPercent: 0,
            avgActivity: 0,
            activityLabel: 'BASDAI',
            metrics: {}
        };
    }

    const selectedPathology = pathologyFilter && pathologyFilter !== 'Todos'
        ? pathologyFilter.toString().toUpperCase()
        : '';

    let remission = 0;
    let highActivity = 0;
    let biologicCount = 0;
    let activitySum = 0;
    let activityCount = 0;
    let activityLabel = selectedPathology === 'APS' ? 'HAQ' : (selectedPathology === 'AR' ? 'DAS28_CRP' : 'BASDAI');

    const metricsAcc = {
        BASDAI: { sum: 0, count: 0 },
        ASDAS: { sum: 0, count: 0 },
        HAQ: { sum: 0, count: 0 },
        RAPID3: { sum: 0, count: 0 },
        DAS28_CRP: { sum: 0, count: 0 },
        DAS28_ESR: { sum: 0, count: 0 },
        CDAI: { sum: 0, count: 0 },
        SDAI: { sum: 0, count: 0 },
        EVA_Dolor: { sum: 0, count: 0 },
        EVA_Global: { sum: 0, count: 0 },
        EVA_Medico: { sum: 0, count: 0 },
        PCR: { sum: 0, count: 0 },
        VSG: { sum: 0, count: 0 },
        PASI: { sum: 0, count: 0 },
        LEI: { sum: 0, count: 0 }
    };

    const pushMetric = (key, value) => {
        if (value !== null && !Number.isNaN(value)) {
            metricsAcc[key].sum += value;
            metricsAcc[key].count += 1;
        }
    };

    patients.forEach(p => {
        const patientPathology = (p.pathology || p.Diagnostico_Primario || p.diagnosticoPrimario || '').toString().toUpperCase();
        const effectivePathology = selectedPathology || patientPathology;

        const basdai = getMetricValue(p, 'BASDAI');
        const asdas = getMetricValue(p, 'ASDAS');
        const haq = getMetricValue(p, 'HAQ');
        const rapid3 = getMetricValue(p, 'RAPID3');
        const das28Crp = getMetricValue(p, 'DAS28_CRP');
        const das28Esr = getMetricValue(p, 'DAS28_ESR');
        const cdai = getMetricValue(p, 'CDAI');
        const sdai = getMetricValue(p, 'SDAI');
        const evaDolor = getMetricValue(p, 'EVA_DOLOR');
        const evaGlobal = getMetricValue(p, 'EVA_GLOBAL');
        const evaMedico = getNumericFieldValue(p, ['EVA_Medico', 'evaMedico']);
        const pcr = getMetricValue(p, 'PCR');
        const vsg = getMetricValue(p, 'VSG');
        const pasi = getNumericFieldValue(p, ['PASI_Score', 'pasiScore', 'PASI']);
        const lei = getNumericFieldValue(p, ['LEI_Score', 'leiScore', 'LEI']);

        pushMetric('BASDAI', basdai);
        pushMetric('ASDAS', asdas);
        pushMetric('HAQ', haq);
        pushMetric('RAPID3', rapid3);
        pushMetric('DAS28_CRP', das28Crp);
        pushMetric('DAS28_ESR', das28Esr);
        pushMetric('CDAI', cdai);
        pushMetric('SDAI', sdai);
        pushMetric('EVA_Dolor', evaDolor);
        pushMetric('EVA_Global', evaGlobal);
        pushMetric('EVA_Medico', evaMedico);
        pushMetric('PCR', pcr);
        pushMetric('VSG', vsg);
        pushMetric('PASI', pasi);
        pushMetric('LEI', lei);

        let activityValue = null;
        if (effectivePathology === 'ESPA') {
            activityValue = basdai;
            activityLabel = 'BASDAI';
        } else if (effectivePathology === 'APS') {
            activityValue = haq;
            activityLabel = 'HAQ';
        } else if (effectivePathology === 'AR') {
            if (das28Crp !== null && !Number.isNaN(das28Crp)) {
                activityValue = das28Crp;
                activityLabel = 'DAS28_CRP';
            } else if (das28Esr !== null && !Number.isNaN(das28Esr)) {
                activityValue = das28Esr;
                activityLabel = 'DAS28_ESR';
            } else if (cdai !== null && !Number.isNaN(cdai)) {
                activityValue = cdai;
                activityLabel = 'CDAI';
            } else if (sdai !== null && !Number.isNaN(sdai)) {
                activityValue = sdai;
                activityLabel = 'SDAI';
            } else {
                activityValue = rapid3;
                activityLabel = 'RAPID3';
            }
        }

        if (activityValue !== null && !Number.isNaN(activityValue)) {
            activitySum += activityValue;
            activityCount += 1;

            if (effectivePathology === 'ESPA') {
                if (basdai !== null && basdai < 2) remission += 1;
                if (basdai !== null && basdai >= 4) highActivity += 1;
            } else if (effectivePathology === 'APS') {
                if (haq !== null && haq < 0.5) remission += 1;
                if (haq !== null && haq >= 2) highActivity += 1;
            } else if (effectivePathology === 'AR') {
                const bucket = getActivityBucket(activityLabel, activityValue);
                if (bucket === 'Remision') remission += 1;
                if (bucket === 'Alta Actividad') highActivity += 1;
            }
        }

        if (getTreatmentCategory(p) === 'biologic') {
            biologicCount += 1;
        }
    });

    const metrics = {};
    Object.entries(metricsAcc).forEach(([key, acc]) => {
        metrics[key] = acc.count > 0 ? parseFloat((acc.sum / acc.count).toFixed(2)) : null;
    });

    return {
        totalPatients: total,
        remissionPercent: activityCount > 0 ? Math.round((remission / activityCount) * 100) : 0,
        highActivityPercent: activityCount > 0 ? Math.round((highActivity / activityCount) * 100) : 0,
        biologicPercent: Math.round((biologicCount / total) * 100),
        avgActivity: activityCount > 0 ? parseFloat((activitySum / activityCount).toFixed(1)) : 0,
        activityLabel,
        metrics
    };
}

function generateRealChartData(patients, filters = {}) {
    const pathologyFilter = filters.pathology || 'Todos';

    // Debug: mostrar columnas disponibles en primer paciente
    if (patients.length > 0) {
        console.log('?? Columnas del primer paciente:', Object.keys(patients[0]).slice(0, 20));
        console.log('?? Valores de mï¿½tricas del primer paciente:', {
            BASDAI_Result: patients[0].BASDAI_Result,
            HAQ_Total: patients[0].HAQ_Total,
            ASDAS_CRP_Result: patients[0].ASDAS_CRP_Result,
            pathology: patients[0].pathology
        });
    }

    // =====================
    // GRï¿½FICO DE ACTIVIDAD (Donut)
    // =====================
    const activityCounts = { remission: 0, low: 0, moderate: 0, high: 0 };
    let activityLabel = 'BASDAI';

    patients.forEach(p => {
        const patientPathology = p.pathology || '';
        let activityValue = null;

        // Usar la mï¿½trica correcta segï¿½n patologï¿½a
        if (patientPathology === 'ESPA' || pathologyFilter === 'ESPA') {
            // ESPA: usar BASDAI_Result
            activityValue = parseFloat(p.BASDAI_Result);
            activityLabel = 'BASDAI';

            if (!isNaN(activityValue) && activityValue >= 0) {
                // Umbrales BASDAI: remisiï¿½n < 2, baja < 4, moderada < 6, alta >= 6
                if (activityValue < 2) activityCounts.remission++;
                else if (activityValue < 4) activityCounts.low++;
                else if (activityValue < 6) activityCounts.moderate++;
                else activityCounts.high++;
            }
        } else if (patientPathology === 'APS' || pathologyFilter === 'APS') {
            // APS: usar HAQ_Total
            activityValue = parseFloat(p.HAQ_Total);
            activityLabel = 'HAQ';

            if (!isNaN(activityValue) && activityValue >= 0) {
                // Umbrales HAQ: remisiï¿½n < 0.5, baja < 1.5, moderada < 2, alta >= 2
                if (activityValue < 0.5) activityCounts.remission++;
                else if (activityValue < 1.5) activityCounts.low++;
                else if (activityValue < 2) activityCounts.moderate++;
                else activityCounts.high++;
            }
        } else if (patientPathology === 'AR' || pathologyFilter === 'AR') {
            // AR: intentar DAS28_CRP -> DAS28_ESR -> CDAI -> SDAI -> RAPID3
            const das28Crp = getMetricValue(p, 'DAS28_CRP');
            const das28Esr = getMetricValue(p, 'DAS28_ESR');
            const cdai = getMetricValue(p, 'CDAI');
            const sdai = getMetricValue(p, 'SDAI');
            const rapid3 = getMetricValue(p, 'RAPID3');

            if (das28Crp !== null && !Number.isNaN(das28Crp)) {
                activityValue = das28Crp;
                activityLabel = 'DAS28_CRP';
            } else if (das28Esr !== null && !Number.isNaN(das28Esr)) {
                activityValue = das28Esr;
                activityLabel = 'DAS28_ESR';
            } else if (cdai !== null && !Number.isNaN(cdai)) {
                activityValue = cdai;
                activityLabel = 'CDAI';
            } else if (sdai !== null && !Number.isNaN(sdai)) {
                activityValue = sdai;
                activityLabel = 'SDAI';
            } else {
                activityValue = rapid3;
                activityLabel = 'RAPID3';
            }

            if (activityValue !== null && !Number.isNaN(activityValue) && activityValue >= 0) {
                const bucket = getActivityBucket(activityLabel, activityValue);
                if (bucket === 'Remision') activityCounts.remission++;
                else if (bucket === 'Baja Actividad') activityCounts.low++;
                else if (bucket === 'Moderada Actividad') activityCounts.moderate++;
                else if (bucket === 'Alta Actividad') activityCounts.high++;
            }
        } else {
            // Mixto: intentar BASDAI primero, luego HAQ, luego DAS28
            activityValue = parseFloat(p.BASDAI_Result);
            if (!isNaN(activityValue) && activityValue >= 0) {
                if (activityValue < 2) activityCounts.remission++;
                else if (activityValue < 4) activityCounts.low++;
                else if (activityValue < 6) activityCounts.moderate++;
                else activityCounts.high++;
            } else {
                activityValue = parseFloat(p.HAQ_Total);
                if (!isNaN(activityValue) && activityValue >= 0) {
                    if (activityValue < 0.5) activityCounts.remission++;
                    else if (activityValue < 1.5) activityCounts.low++;
                    else if (activityValue < 2) activityCounts.moderate++;
                    else activityCounts.high++;
                } else {
                    activityValue = getMetricValue(p, 'DAS28_CRP');
                    if (!isNaN(activityValue) && activityValue >= 0) {
                        const thresholds = ACTIVITY_THRESHOLDS['DAS28_CRP'];
                        if (activityValue < thresholds.remission) activityCounts.remission++;
                        else if (activityValue < thresholds.low) activityCounts.low++;
                        else if (activityValue < thresholds.moderate) activityCounts.moderate++;
                        else activityCounts.high++;
                    }
                }
            }
        }
    });

    console.log('?? Activity counts (donut):', activityCounts, 'usando', activityLabel);

    // =====================
    // GRï¿½FICO DE TRATAMIENTOS (Barras)
    // =====================
    const treatmentCounts = {};
    patients.forEach(p => {
        let tto = p.Tratamiento_Actual || 'Sin tratamiento';
        if (typeof tto === 'string' && tto.length > 25) tto = tto.substring(0, 22) + '...';
        treatmentCounts[tto] = (treatmentCounts[tto] || 0) + 1;
    });

    const sortedTreatments = Object.entries(treatmentCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    let treatmentLabels = sortedTreatments.map(t => t[0]);
    let treatmentValues = sortedTreatments.map(t => t[1]);
    let treatmentColors = sortedTreatments.map((_, i) => {
        const opacity = 1 - (i * 0.08);
        return `rgba(99, 102, 241, ${Math.max(0.3, opacity)})`;
    });

    if (!treatmentLabels.length) {
        treatmentLabels = ['Sin datos'];
        treatmentValues = [0];
        treatmentColors = ['#94a3b8'];
    }

    console.log('?? Treatment counts (barras):', treatmentLabels.length, 'tratamientos');

    // =====================
    // GRï¿½FICO DE COMORBILIDADES (Barras)
    // =====================
    const comorbidityCounts = {};
    const comorbidityLabelsMap = {
        HTA: 'Hipertensiï¿½n',
        DM: 'Diabetes',
        DLP: 'Dislipidemia',
        ECV: 'Enf. Cardiovascular',
        GASTRITIS: 'Gastritis',
        OBESIDAD: 'Obesidad',
        OSTEOPOROSIS: 'Osteoporosis',
        GOTA: 'Gota'
    };

    Object.keys(COMORBIDITY_FIELDS).forEach(key => {
        comorbidityCounts[key] = 0;
    });

    patients.forEach(p => {
        Object.entries(COMORBIDITY_FIELDS).forEach(([label, fields]) => {
            if (isFieldPositive(p, fields)) {
                comorbidityCounts[label] += 1;
            }
        });
    });

    const comorbiditySorted = Object.entries(comorbidityCounts)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    const comorbidityLabels = comorbiditySorted.length
        ? comorbiditySorted.map(item => comorbidityLabelsMap[item[0]] || item[0])
        : ['Sin datos'];
    const comorbidityValues = comorbiditySorted.length
        ? comorbiditySorted.map(item => item[1])
        : [0];

    const comorbidityColors = comorbiditySorted.map((_, i) => {
        const opacity = 1 - (i * 0.1);
        return `rgba(139, 92, 246, ${Math.max(0.3, opacity)})`;
    });

    console.log('?? Comorbidity counts:', comorbidityLabels.length, 'comorbilidades');

    // =====================
    // GRï¿½FICO DE CORRELACIï¿½N (Scatter)
    // =====================
    const scatterX = filters.scatterX || 'BASDAI';
    const scatterY = filters.scatterY || 'ASDAS';

    // Mapeo de nombres a columnas Excel exactas
    const metricColumnMap = {
        'BASDAI': 'BASDAI_Result',
        'ASDAS': 'ASDAS_CRP_Result',
        'HAQ': 'HAQ_Total',
        'RAPID3': 'RAPID3_Score',
        'DAS28_CRP': 'DAS28_CRP_Result',
        'DAS28_ESR': 'DAS28_ESR_Result',
        'CDAI': 'CDAI_Result',
        'SDAI': 'SDAI_Result',
        'EVA_Medico': 'EVA_Medico',
        'EVA Dolor': 'EVA_Dolor',
        'EVA_Dolor': 'EVA_Dolor',
        'EVA Global': 'EVA_Global',
        'EVA_Global': 'EVA_Global',
        'PCR': 'PCR',
        'VSG': 'VSG',
        'PASI': 'PASI_Score',
        'LEI': 'LEI_Score'
    };

    const xColumn = metricColumnMap[scatterX] || scatterX;
    const yColumn = metricColumnMap[scatterY] || scatterY;

    const correlationData = patients
        .map(p => {
            const xValue = parseFloat(p[xColumn]);
            const yValue = parseFloat(p[yColumn]);
            if (isNaN(xValue) || isNaN(yValue)) return null;
            if (xValue === 0 && yValue === 0) return null; // Excluir puntos 0,0
            return { x: xValue, y: yValue };
        })
        .filter(Boolean)
        .slice(0, 100);

    console.log('?? Correlation data:', correlationData.length, 'puntos para', scatterX, 'vs', scatterY);

    // Si no hay datos, aï¿½adir punto placeholder
    if (correlationData.length === 0) {
        correlationData.push({ x: 0, y: 0 });
    }

    return {
        activity: {
            labels: ['Remisiï¿½n', 'Baja', 'Moderada', 'Alta'],
            datasets: [{
                data: [activityCounts.remission, activityCounts.low, activityCounts.moderate, activityCounts.high],
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
            }],
            activityLabel: activityLabel
        },
        treatment: {
            labels: treatmentLabels,
            datasets: [{
                data: treatmentValues,
                backgroundColor: treatmentColors
            }]
        },
        comorbidity: {
            labels: comorbidityLabels,
            datasets: [{
                data: comorbidityValues,
                backgroundColor: comorbidityColors
            }]
        },
        correlation: {
            datasets: [{
                data: correlationData,
                label: `${scatterX} vs ${scatterY}`
            }],
            xLabel: scatterX,
            yLabel: scatterY
        }
    };
}

/**
 * Obtiene datos poblacionales reales del Excel
 * Normaliza las columnas y calcula KPIs segï¿½n la patologï¿½a seleccionada
 */
function getRealPoblationalData(filters = {}) {
    if (!appState.isLoaded || !appState.db) {
        console.warn('?? Base de datos no cargada para estadï¿½sticas poblacionales');
        return { filteredCohort: [], kpis: null, chartData: null };
    }

    const pathologyFilter = filters.pathology || 'Todos';
    console.log('?? getRealPoblationalData - Filtro patologï¿½a:', pathologyFilter);

    // 1. Obtener pacientes segï¿½n filtro de patologï¿½a
    let allPatients = [];
    const sheetsToProcess = pathologyFilter === 'Todos' || !pathologyFilter
        ? ['ESPA', 'APS', 'AR']
        : [pathologyFilter];

    sheetsToProcess.forEach(sheetName => {
        if (appState.db?.[sheetName]) {
            console.log(`?? Procesando hoja ${sheetName}: ${appState.db[sheetName].length} registros`);

            appState.db[sheetName].forEach(visit => {
                // Mantener TODAS las columnas originales del Excel + aï¿½adir normalizaciï¿½n
                const normalizedVisit = {
                    ...visit,  // Mantener todas las columnas originales
                    pathology: sheetName,
                    // Normalizar solo para la tabla de pacientes (campos de visualizaciï¿½n)
                    _id: visit.ID_Paciente || '',
                    _nombre: visit.Nombre_Paciente || '',
                    _sexo: visit.Sexo || '',
                    _fecha: visit.Fecha_Visita || '',
                    _tratamiento: visit.Tratamiento_Actual || 'Sin tratamiento'
                };
                allPatients.push(normalizedVisit);
            });
        }
    });

    console.log(`?? Total pacientes cargados: ${allPatients.length}`);

    // Debug: mostrar columnas del primer paciente
    if (allPatients.length > 0) {
        const firstPatient = allPatients[0];
        console.log('?? Columnas disponibles:', Object.keys(firstPatient).slice(0, 15));
        console.log('?? Valores de mï¿½tricas (primer paciente):', {
            BASDAI_Result: firstPatient.BASDAI_Result,
            ASDAS_CRP_Result: firstPatient.ASDAS_CRP_Result,
            HAQ_Total: firstPatient.HAQ_Total,
            EVA_Dolor: firstPatient.EVA_Dolor,
            Tratamiento_Actual: firstPatient.Tratamiento_Actual,
            pathology: firstPatient.pathology
        });
    }

    // 2. Aplicar filtros
    let filteredCohort = applyFiltersToPatients(allPatients, filters);
    console.log(`?? Despuï¿½s de filtros: ${filteredCohort.length} pacientes`);

    // 3. Calcular KPIs pasando el filtro de patologï¿½a
    const kpis = calculateRealKPIs(filteredCohort, pathologyFilter);

    // 4. Generar datos para grï¿½ficos
    const chartData = generateRealChartData(filteredCohort, filters);

    // Debug: verificar datos para tabla
    console.log('?? Datos para tabla:', {
        total: filteredCohort.length,
        primero: filteredCohort[0] ? {
            ID_Paciente: filteredCohort[0].ID_Paciente || filteredCohort[0]._id,
            Nombre: filteredCohort[0].Nombre_Paciente || filteredCohort[0]._nombre,
            pathology: filteredCohort[0].pathology,
            BASDAI_Result: filteredCohort[0].BASDAI_Result,
            HAQ_Total: filteredCohort[0].HAQ_Total
        } : null
    });

    return { filteredCohort, kpis, chartData };
}

function getPoblationalData(filters = {}) {
    console.log('?? getPoblationalData llamado con filtros:', JSON.stringify(filters));

    // PRIMERO: Intentar usar datos reales del Excel cargado
    if (appState.isLoaded && appState.db) {
        console.log('?? Base de datos cargada, obteniendo datos reales...');
        const realData = getRealPoblationalData(filters);
        console.log('?? Datos reales obtenidos:', realData.filteredCohort.length, 'registros');
        // Siempre devolver datos reales si la base estï¿½ cargada (incluso si filteredCohort estï¿½ vacï¿½o)
        return realData;
    }

    // FALLBACK: Usar mock si estï¿½ habilitado y la base de datos no estï¿½ cargada
    if (typeof getMockPoblationalData === 'function') {
        console.log('?? Base de datos no cargada, intentando mock...');
        const mockData = getMockPoblationalData(filters);
        if (mockData && mockData.filteredCohort && mockData.filteredCohort.length > 0) {
            return mockData;
        }
    }

    // Estructura vacï¿½a como ï¿½ltimo recurso
    console.warn('?? No hay datos disponibles para el dashboard de estadï¿½sticas');
    return {
        filteredCohort: [],
        kpis: {
            totalPatients: 0,
            remissionPercent: 0,
            highActivityPercent: 0,
            biologicPercent: 0,
            avgBasdai: 0
        },
        chartData: {
            activity: { labels: ['Remisiï¿½n', 'Baja', 'Moderada', 'Alta'], datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'] }] },
            treatment: { labels: [], datasets: [{ data: [], backgroundColor: '#6366f1' }] },
            comorbidity: { labels: [], datasets: [{ data: [] }] },
            correlation: { datasets: [] }
        }
    };
}





function getFarmsDataFromState() {
    if (!appState.isLoaded || !appState.db['Fï¿½rmacos']) {
        return { Tratamientos_Sistemicos: [], FAMEs: [], Biologicos: [] };
    }

    // La estructura de Fï¿½rmacos ya es { Sistemicos: [...], FAMEs: [...], Biologicos: [...] }
    // Solo necesitamos mapear los nombres correctamente
    return {
        Tratamientos_Sistemicos: appState.db['Fï¿½rmacos'].Sistemicos || [],
        FAMEs: appState.db['Fï¿½rmacos'].FAMEs || [],
        Biologicos: appState.db['Fï¿½rmacos'].Biologicos || []
    };
}

// =====================================

// EXPOSICIï¿½N AL NAMESPACE HUBTOOLS

// =====================================



// Exponer funciones al namespace global HubTools

if (typeof HubTools !== 'undefined') {

    HubTools.data.initDatabaseFromStorage = initDatabaseFromStorage;
    HubTools.data.loadDatabase = loadDatabase;

    HubTools.data.getProfesionales = getProfesionales;

    HubTools.data.getFarmacosPorTipo = getFarmacosPorTipo;

    HubTools.data.getAllPatients = getAllPatients;

    HubTools.data.findPatientById = findPatientById;

    HubTools.data.getPatientHistory = getPatientHistory;

    HubTools.data.getPoblationalData = getPoblationalData;

    HubTools.data.getFarmsDataFromState = getFarmsDataFromState;

    HubTools.data.loadDrugsData = function () {
        if (!appState.isLoaded || !appState.db['Fï¿½rmacos']) {
            return { FAMEs: [], Biologicos: [], Sistemicos: [] };
        }
        return appState.db['Fï¿½rmacos'];
    };

    HubTools.data.loadProfessionalsData = function () {
        if (!appState.isLoaded || !appState.db.Profesionales) {
            return [];
        }
        return appState.db.Profesionales;
    };

    console.log('? Mï¿½dulo dataManager cargado');

} else {

    console.error('? Error: HubTools namespace no encontrado. Asegï¿½rate de cargar hubTools.js primero.');

}

// Mantener compatibilidad minima con scripts clasicos que leen estado global
if (typeof window !== 'undefined') {
    window.appState = appState;
}

// Autoinicializar desde localStorage al cargar el script
initDatabaseFromStorage();
