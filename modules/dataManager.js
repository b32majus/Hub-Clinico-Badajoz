// /modules/dataManager.js
// ACTUALIZACIN: Patrn clsico (sin import/export) + funciones adicionales para Fase 2
let appState = { isLoaded: false, db: null };

/**
 * Guarda la base de datos en localStorage con manejo inteligente de tamao
 * Si la BD es demasiado grande, guarda solo una versin limitada
 */
function saveToSessionStorage() {
    /**
     * Intenta guardar con un lmite de visitas dado.
     * Retorna true si tuvo xito, false si QuotaExceededError.
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

        // Fallback en cascada: 100  30 visitas
        console.warn(`Base de datos grande (${sizeMB.toFixed(2)}MB). Intentando versin limitada.`);

        var stored = false;
        var limits = [100, 30];
        for (var i = 0; i < limits.length; i++) {
            try {
                tryStore(limits[i]);
                console.log('Base de datos limitada guardada (' + limits[i] + ' visitas/patologa).');
                if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
                    HubTools.utils.mostrarNotificacion(
                        'BD grande. Cach limitado a ltimas ' + limits[i] + ' visitas por patologa.',
                        'warning'
                    );
                }
                stored = true;
                break;
            } catch (innerErr) {
                if (innerErr.name === 'QuotaExceededError' || innerErr.code === 22) {
                    console.warn('Fallback a ' + limits[i] + ' visitas fall. Intentando menos...');
                    continue;
                }
                throw innerErr; // Error no relacionado con cuota
            }
        }

        if (!stored) {
            throw new Error('No se pudo guardar ni con 30 visitas por patologa.');
        }

    } catch (e) {
        console.error('Error al guardar en localStorage:', e);

        localStorage.removeItem('hubClinicoDB');
        localStorage.removeItem('hubClinicoDB_limited');

        if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
            HubTools.utils.mostrarNotificacion(
                'Error: No se pudo guardar la BD en cach. Funcionalidad limitada entre pginas.',
                'error'
            );
        }
    }
}

/**
 * Cabeceras cr?ticas esperadas por hoja cl?nica.
 * No se validan TODAS las columnas, solo las que el c?digo JS lee activamente.
 * La validaci?n acepta aliases heredados cuando el Excel hist?rico y el contrato
 * actual usan nombres distintos para el mismo dato.
 */
function createHeaderRule(label, aliases) {
    return {
        label: label,
        aliases: Array.isArray(aliases) && aliases.length ? aliases : [label]
    };
}

var CRITICAL_HEADERS = {
    ESPA: [
        createHeaderRule('ID_Paciente'),
        createHeaderRule('Nombre_Paciente'),
        createHeaderRule('Sexo'),
        createHeaderRule('Fecha_Visita'),
        createHeaderRule('Tipo_Visita'),
        createHeaderRule('Diagnostico_Primario'),
        createHeaderRule('HLA_B27', ['HLA_B27', 'HLA-B27']),
        createHeaderRule('FR'),
        createHeaderRule('APCC', ['APCC', 'aPCC']),
        createHeaderRule('NAD_Total'),
        createHeaderRule('NAT_Total'),
        createHeaderRule('Dactilitis_Total'),
        createHeaderRule('Peso'),
        createHeaderRule('Talla'),
        createHeaderRule('IMC'),
        createHeaderRule('EVA_Global'),
        createHeaderRule('EVA_Dolor'),
        createHeaderRule('PCR'),
        createHeaderRule('VSG'),
        createHeaderRule('BASDAI_Result'),
        createHeaderRule('ASDAS_CRP_Result'),
        createHeaderRule('ASDAS_ESR_Result'),
        createHeaderRule('Tratamiento_Actual'),
        createHeaderRule('Decision_Terapeutica_PV', ['Decision_Terapeutica_PV', 'Decision_Terapeutica']),
        createHeaderRule('Decision_Terapeutica_SEG', ['Decision_Terapeutica_SEG', 'Decision_Terapeutica']),
        createHeaderRule('Fecha_Inicio_Tratamiento'),
        createHeaderRule('Fecha_Proxima_Revision')
    ],
    APS: [
        createHeaderRule('ID_Paciente'),
        createHeaderRule('Nombre_Paciente'),
        createHeaderRule('Sexo'),
        createHeaderRule('Fecha_Visita'),
        createHeaderRule('Tipo_Visita'),
        createHeaderRule('Diagnostico_Primario'),
        createHeaderRule('HLA_B27', ['HLA_B27', 'HLA-B27']),
        createHeaderRule('FR'),
        createHeaderRule('APCC', ['APCC', 'aPCC']),
        createHeaderRule('NAD_Total'),
        createHeaderRule('NAT_Total'),
        createHeaderRule('Dactilitis_Total'),
        createHeaderRule('Peso'),
        createHeaderRule('Talla'),
        createHeaderRule('IMC'),
        createHeaderRule('EVA_Global'),
        createHeaderRule('EVA_Dolor'),
        createHeaderRule('PCR'),
        createHeaderRule('VSG'),
        createHeaderRule('BASDAI_Result'),
        createHeaderRule('ASDAS_CRP_Result'),
        createHeaderRule('ASDAS_ESR_Result'),
        createHeaderRule('Tratamiento_Actual'),
        createHeaderRule('Decision_Terapeutica_PV', ['Decision_Terapeutica_PV', 'Decision_Terapeutica']),
        createHeaderRule('Decision_Terapeutica_SEG', ['Decision_Terapeutica_SEG', 'Decision_Terapeutica']),
        createHeaderRule('Fecha_Inicio_Tratamiento'),
        createHeaderRule('Fecha_Proxima_Revision')
    ],
    AR: [
        createHeaderRule('ID_Paciente'),
        createHeaderRule('Nombre_Paciente'),
        createHeaderRule('Sexo'),
        createHeaderRule('Fecha_Visita'),
        createHeaderRule('Tipo_Visita'),
        createHeaderRule('Diagnostico_Primario'),
        createHeaderRule('HLA_B27', ['HLA_B27', 'HLA-B27']),
        createHeaderRule('FR'),
        createHeaderRule('APCC', ['APCC', 'aPCC']),
        createHeaderRule('ANA'),
        createHeaderRule('NAD_Total'),
        createHeaderRule('NAT_Total'),
        createHeaderRule('NAD28'),
        createHeaderRule('NAT28'),
        createHeaderRule('Peso'),
        createHeaderRule('Talla'),
        createHeaderRule('IMC'),
        createHeaderRule('EVA_Global'),
        createHeaderRule('EVA_Dolor'),
        createHeaderRule('EVA_Medico'),
        createHeaderRule('PCR'),
        createHeaderRule('VSG'),
        createHeaderRule('DAS28_CRP_Result'),
        createHeaderRule('DAS28_ESR_Result'),
        createHeaderRule('CDAI_Result'),
        createHeaderRule('SDAI_Result'),
        createHeaderRule('BASDAI_Result'),
        createHeaderRule('HAQ_Total'),
        createHeaderRule('RAPID3_Score'),
        createHeaderRule('Tratamiento_Actual'),
        createHeaderRule('Decision_Terapeutica_PV', ['Decision_Terapeutica_PV', 'Decision_Terapeutica']),
        createHeaderRule('Decision_Terapeutica_SEG', ['Decision_Terapeutica_SEG', 'Decision_Terapeutica']),
        createHeaderRule('Fecha_Inicio_Tratamiento'),
        createHeaderRule('Fecha_Proxima_Revision')
    ]
};

/**
 * Valida las cabeceras de una hoja cl?nica contra las cabeceras cr?ticas esperadas.
 * @param {string} sheetName - Nombre de la hoja (ESPA, APS, AR).
 * @param {Array} actualHeaders - Cabeceras reales le?das de la fila 1 del worksheet.
 * @returns {Array} - Lista de cabeceras cr?ticas faltantes (vac?a si todo OK).
 */
function validateSheetHeaders(sheetName, actualHeaders) {
    var expected = CRITICAL_HEADERS[sheetName];
    if (!expected || !actualHeaders || actualHeaders.length === 0) return [];

    var missing = expected
        .filter(function(rule) {
            return !rule.aliases.some(function(alias) {
                return actualHeaders.indexOf(alias) !== -1;
            });
        })
        .map(function(rule) {
            return rule.label;
        });

    if (missing.length > 0) {
        console.warn(
            'Hoja ' + sheetName + ': faltan ' + missing.length +
            ' columnas cr?ticas: ' + missing.join(', ')
        );
    } else {
        console.log('Hoja ' + sheetName + ': todas las cabeceras cr?ticas presentes.');
    }

    return missing;
}

/**
 * Carga un archivo .xlsx, lo procesa con SheetJS y lo guarda en el estado de la aplicacin.
 * Es el corazn del dataManager y la nica funcin que interacta directamente con el archivo.
 * @param {File} file - El objeto File seleccionado por el usuario desde un <input type="file">.
 * @returns {Promise<boolean>} - Devuelve 'true' si la carga fue exitosa, 'false' si fall.
 */
async function loadDatabase(file) {
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);

        const dbData = {};

        // Verificar que las hojas clnicas esperadas existen
        var requiredSheets = ['ESPA', 'APS', 'AR'];
        var missingSheets = requiredSheets.filter(function(s) { return !workbook.Sheets[s]; });
        if (missingSheets.length > 0) {
            console.warn('Hojas faltantes en el Excel: ' + missingSheets.join(', '));
            if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
                HubTools.utils.mostrarNotificacion(
                    'Aviso: El Excel no contiene las hojas: ' + missingSheets.join(', ') + '. Algunos datos no estarn disponibles.',
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

        // 3b. Validar cabeceras crticas de las hojas clnicas
        var allMissing = {};
        ['ESPA', 'APS', 'AR'].forEach(function(sheet) {
            if (workbook.Sheets[sheet]) {
                var headerMatrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1, range: 0, blankrows: false });
                var actualHeaders = Array.isArray(headerMatrix[0]) ? headerMatrix[0].filter(function(value) {
                    return value !== undefined && value !== null && value !== '';
                }) : [];
                var missing = validateSheetHeaders(sheet, actualHeaders);
                if (missing.length > 0) {
                    allMissing[sheet] = missing;
                }
            }
        });

        if (Object.keys(allMissing).length > 0) {
            var warningLines = Object.keys(allMissing).map(function(sheet) {
                return sheet + ': ' + allMissing[sheet].join(', ');
            });
            console.warn('Cabeceras crticas faltantes:\n' + warningLines.join('\n'));

            if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
                HubTools.utils.mostrarNotificacion(
                    'Aviso: Algunas columnas esperadas no se encontraron en el Excel. ' +
                    'Puede haber funcionalidad limitada. Revise la consola para detalles.',
                    'warning'
                );
            }
        }

        // 4. Procesa la hoja 'Frmacos' para crear un objeto anidado.
        // Estructura vaca por defecto (fallback si la hoja no existe o est vaca)
        dbData['Frmacos'] = { Sistemicos: [], FAMEs: [], Biologicos: [] };

        const farmacosSheetKey = Object.keys(workbook.Sheets).find(function(k) {
            return k.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '') === 'farmacos';
        });

        if (farmacosSheetKey && workbook.Sheets[farmacosSheetKey]) {
            const farmacosSheet = workbook.Sheets[farmacosSheetKey];
            const farmacosJSON = XLSX.utils.sheet_to_json(farmacosSheet, { header: 1 });

            if (farmacosJSON.length > 1) {
                for (let i = 1; i < farmacosJSON.length; i++) {
                    const row = farmacosJSON[i];
                    if (row[0]) { // Columna 0: Sistemicos
                        dbData['Frmacos'].Sistemicos.push(row[0]);
                    }
                    if (row[1]) { // Columna 1: FAMEs
                        dbData['Frmacos'].FAMEs.push(row[1]);
                    }
                    if (row[2]) { // Columna 2: Biologicos
                        dbData['Frmacos'].Biologicos.push(row[2]);
                    }
                }
            }
        } else {
            console.warn('Hoja de Frmacos no encontrada en el Excel. Se usar catlogo vaco.');
        }

        // 5. Actualiza el estado global de la aplicacin.
        appState.db = dbData;
        appState.isLoaded = true;

        console.log("Base de datos cargada y procesada con xito:", appState.db);

        // Disparar evento personalizado para notificar que la BD est cargada
        window.dispatchEvent(new CustomEvent('databaseLoaded', { detail: appState.db }));
        console.log('? Evento databaseLoaded disparado');

        // Guardar en localStorage para persistencia entre pginas
        saveToSessionStorage();

        // 6. Devuelve 'true' para indicar que la operacin fue exitosa.
        return true;

    } catch (error) {
        // Si algo falla en cualquier punto, lo capturamos aqu.
        console.error("Error crtico al cargar o procesar la base de datos:", error);

        // Reseteamos el estado para evitar que la aplicacin trabaje con datos corruptos.
        appState.isLoaded = false;
        appState.db = null;

        // 7. Devuelve 'false' para indicar que la operacin fall.
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
 * Devuelve la lista de frmacos para un tipo especfico.
 * @param {string} tipo - El tipo de frmaco (e.g., 'Tratamientos_Sistemicos', 'FAMEs', 'Biologicos').
 * @returns {Array} Array de strings con los nombres de los frmacos.
 */
function getFarmacosPorTipo(tipo) {
    console.log('DEBUG: getFarmacosPorTipo called with tipo:', tipo);
    if (!appState.isLoaded) {
        console.warn('? Base de datos no cargada. No se pueden obtener frmacos.');
        return [];
    }

    // Mapeo para mayor flexibilidad y compatibilidad
    const tipoMapping = {
        'Sistemicos': ['Sistemicos', 'Tratamientos_Sistemicos', 'sistemicos'],
        'FAMEs': ['FAMEs', 'fames'],
        'Biologicos': ['Biologicos', 'biologicos']
    };

    // Intentar encontrar el tipo solicitado en mltiples posibles claves
    const possibleKeys = tipoMapping[tipo] || [tipo];

    for (const key of possibleKeys) {
        if (appState.db?.['Frmacos']?.[key] && Array.isArray(appState.db['Frmacos'][key])) {
            console.log(`? Encontrados ${appState.db['Frmacos'][key].length} frmacos del tipo "${tipo}" (clave: ${key})`);
            console.log('DEBUG: Returning frmacos:', appState.db['Frmacos'][key]);
            return appState.db['Frmacos'][key];
        }
    }
    console.warn(`? No se encontraron frmacos para el tipo: ${tipo} con las claves posibles: ${possibleKeys.join(', ')}`);
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
 * Parsea una fecha de mltiples formatos posibles
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
    console.warn('parseVisitDate: fecha no vlida "' + dateStr + '", usando fecha actual.');
    return new Date();
}

/**
 * Extrae el historial de cambios de tratamiento a partir de las visitas
 * @param {Array} visits - Array de visitas ordenadas cronolgicamente (reciente primero)
 * @returns {Array} - Array de { date, name, reason }
 */
function extractTreatmentHistory(visits) {
    if (visits.length === 0) return [];

    const treatments = [];
    const seenTreatments = new Set();

    // Recorrer visitas en orden cronolgico inverso (antiguo a reciente)
    for (let i = visits.length - 1; i >= 0; i--) {
        const visit = visits[i];

        // Extraer tratamiento actual - usar nombres normalizados y del Excel
                const normalizeRecord = HubTools?.normalizer?.normalizeRecord;
        const normalizedVisit = typeof normalizeRecord === 'function' ? normalizeRecord(visit) : visit;
        let currentTreatment = normalizedVisit.tratamientoActual ||
            normalizedVisit.biologicoSelect || normalizedVisit.fameSelect || normalizedVisit.sistemicoSelect ||
            visit.Biologico || visit.FAME || visit['Sistmico'] || null;

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
 * Extrae eventos clnicos clave a partir de las visitas mediante comparacin de valores
 * @param {Array} visits - Array de visitas ordenadas cronolgicamente (reciente primero)
 * @param {string} pathology - Tipo de patologa ('espa' o 'aps')
 * @returns {Array} - Array de { date, type, description }
 */
function extractKeyEvents(visits, pathology) {
    if (visits.length < 2) return []; // Se necesitan al menos 2 visitas para inferir eventos

    const events = [];
    const cutoffs = HubTools?.dashboard?.activityCutoffs || {};

    // Procesar visitas en orden cronolgico (antiguo a reciente)
    for (let i = visits.length - 1; i >= 0; i--) {
        const currentVisit = visits[i];
        const previousVisit = i > 0 ? visits[i + 1] : null;
        const visitDate = currentVisit.Fecha_Visita || currentVisit.fechaVisita;

        // 1. Registrar cambios explcitos de tratamiento
        if (previousVisit) {
            const currentTx = currentVisit.biologicoSelect || currentVisit.fameSelect ||
                currentVisit.sistemicoSelect || currentVisit.Biologico ||
                currentVisit.FAME || currentVisit['Sistmico'];
            const previousTx = previousVisit.biologicoSelect || previousVisit.fameSelect ||
                previousVisit.sistemicoSelect || previousVisit.Biologico ||
                previousVisit.FAME || previousVisit['Sistmico'];

            if (currentTx && previousTx && currentTx !== previousTx) {
                events.push({
                    date: visitDate,
                    type: 'treatment',
                    description: `Cambio de tratamiento: ${previousTx} ? ${currentTx}`
                });
            }
        }

        // 2. Detectar eventos adversos si estn registrados
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
                    description: `Brote clnico detectado: ${flareReason}`
                });
            }
        }

        // 4. Detectar remisin cuando se alcanzan umbrales bajos
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
                remissionReason = `HAQ en remisin (${haq.toFixed(2)})`;
            }
        }

        if (isRemission && previousVisit) {
            // Solo registrar si la visita anterior NO estaba en remisin
            const prevBASDAI = parseFloat(previousVisit.basdaiResult || previousVisit.BASDAI);
            const prevHAQ = parseFloat(previousVisit.haqResult || previousVisit.HAQ);

            let shouldRecord = false;
            if (pathology === 'espa' && !isNaN(prevBASDAI) && prevBASDAI >= 4) shouldRecord = true;
            if (pathology === 'aps' && !isNaN(prevHAQ) && prevHAQ >= 0.5) shouldRecord = true;

            if (shouldRecord) {
                events.push({
                    date: visitDate,
                    type: 'remission',
                    description: `Remisi\u00f3n cl\u00ednica alcanzada: ${remissionReason}`
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
 * Intenta inicializar la base de datos desde localStorage al cargar la pgina.
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

            // Disparar evento para que otros scripts sepan que los datos estn listos.
            // Usamos un pequeo timeout para asegurar que los listeners de otros scripts ya estn registrados.
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

    if (value < thresholds.remission) return 'Remisi\u00f3n';
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
 * Calcula KPIs segn la patologa seleccionada
 * - ESPA: usa BASDAI como mtrica principal (remisin < 2, alta >= 4)
 * - APS: usa HAQ como mtrica principal (remisin < 0.5, alta >= 2)
 * @param {Array} patients - Array de pacientes filtrados
 * @param {string} pathologyFilter - Patologa seleccionada ('ESPA', 'APS', 'Todos')
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
                if (bucket === 'Remisi\u00f3n') remission += 1;
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
        console.log('?? Valores de mtricas del primer paciente:', {
            BASDAI_Result: patients[0].BASDAI_Result,
            HAQ_Total: patients[0].HAQ_Total,
            ASDAS_CRP_Result: patients[0].ASDAS_CRP_Result,
            pathology: patients[0].pathology
        });
    }

    // =====================
    // GRFICO DE ACTIVIDAD (Donut)
    // =====================
    const activityCounts = { remission: 0, low: 0, moderate: 0, high: 0 };
    let activityLabel = 'BASDAI';

    patients.forEach(p => {
        const patientPathology = p.pathology || '';
        let activityValue = null;

        // Usar la mtrica correcta segn patologa
        if (patientPathology === 'ESPA' || pathologyFilter === 'ESPA') {
            // ESPA: usar BASDAI_Result
            activityValue = parseFloat(p.BASDAI_Result);
            activityLabel = 'BASDAI';

            if (!isNaN(activityValue) && activityValue >= 0) {
                // Umbrales BASDAI: remisin < 2, baja < 4, moderada < 6, alta >= 6
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
                // Umbrales HAQ: remisin < 0.5, baja < 1.5, moderada < 2, alta >= 2
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
                if (bucket === 'Remisi\u00f3n') activityCounts.remission++;
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
    // GRFICO DE TRATAMIENTOS (Barras)
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
    // GRFICO DE COMORBILIDADES (Barras)
    // =====================
    const comorbidityCounts = {};
    const comorbidityLabelsMap = {
        HTA: 'Hipertensin',
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
    // GRFICO DE CORRELACIN (Scatter)
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

    // Si no hay datos, aadir punto placeholder
    if (correlationData.length === 0) {
        correlationData.push({ x: 0, y: 0 });
    }

    return {
        activity: {
            labels: ['Remisi\u00f3n', 'Baja', 'Moderada', 'Alta'],
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
 * Normaliza las columnas y calcula KPIs segn la patologa seleccionada
 */
function getRealPoblationalData(filters = {}) {
    if (!appState.isLoaded || !appState.db) {
        console.warn('?? Base de datos no cargada para estadsticas poblacionales');
        return { filteredCohort: [], kpis: null, chartData: null };
    }

    const pathologyFilter = filters.pathology || 'Todos';
    console.log('?? getRealPoblationalData - Filtro patologa:', pathologyFilter);

    // 1. Obtener pacientes segn filtro de patologa
    let allPatients = [];
    const sheetsToProcess = pathologyFilter === 'Todos' || !pathologyFilter
        ? ['ESPA', 'APS', 'AR']
        : [pathologyFilter];

    sheetsToProcess.forEach(sheetName => {
        if (appState.db?.[sheetName]) {
            console.log(`?? Procesando hoja ${sheetName}: ${appState.db[sheetName].length} registros`);

            appState.db[sheetName].forEach(visit => {
                // Mantener TODAS las columnas originales del Excel + aadir normalizacin
                const normalizedVisit = {
                    ...visit,  // Mantener todas las columnas originales
                    pathology: sheetName,
                    // Normalizar solo para la tabla de pacientes (campos de visualizacin)
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
        console.log('?? Valores de mtricas (primer paciente):', {
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
    console.log(`?? Despus de filtros: ${filteredCohort.length} pacientes`);

    // 3. Calcular KPIs pasando el filtro de patologa
    const kpis = calculateRealKPIs(filteredCohort, pathologyFilter);

    // 4. Generar datos para grficos
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
        // Siempre devolver datos reales si la base est cargada (incluso si filteredCohort est vaco)
        return realData;
    }

    // FALLBACK: Usar mock si est habilitado y la base de datos no est cargada
    if (typeof getMockPoblationalData === 'function') {
        console.log('?? Base de datos no cargada, intentando mock...');
        const mockData = getMockPoblationalData(filters);
        if (mockData && mockData.filteredCohort && mockData.filteredCohort.length > 0) {
            return mockData;
        }
    }

    // Estructura vaca como ltimo recurso
    console.warn('?? No hay datos disponibles para el dashboard de estadsticas');
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
            activity: { labels: ['Remisi\u00f3n', 'Baja', 'Moderada', 'Alta'], datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'] }] },
            treatment: { labels: [], datasets: [{ data: [], backgroundColor: '#6366f1' }] },
            comorbidity: { labels: [], datasets: [{ data: [] }] },
            correlation: { datasets: [] }
        }
    };
}





function getFarmsDataFromState() {
    if (!appState.isLoaded || !appState.db['Frmacos']) {
        return { Tratamientos_Sistemicos: [], FAMEs: [], Biologicos: [] };
    }

    // La estructura de Frmacos ya es { Sistemicos: [...], FAMEs: [...], Biologicos: [...] }
    // Solo necesitamos mapear los nombres correctamente
    return {
        Tratamientos_Sistemicos: appState.db['Frmacos'].Sistemicos || [],
        FAMEs: appState.db['Frmacos'].FAMEs || [],
        Biologicos: appState.db['Frmacos'].Biologicos || []
    };
}

// =====================================

// EXPOSICIN AL NAMESPACE HUBTOOLS

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
        if (!appState.isLoaded || !appState.db['Frmacos']) {
            return { FAMEs: [], Biologicos: [], Sistemicos: [] };
        }
        return appState.db['Frmacos'];
    };

    HubTools.data.loadProfessionalsData = function () {
        if (!appState.isLoaded || !appState.db.Profesionales) {
            return [];
        }
        return appState.db.Profesionales;
    };

    console.log('? Mdulo dataManager cargado');

} else {

    console.error('? Error: HubTools namespace no encontrado. Asegrate de cargar hubTools.js primero.');

}

// Mantener compatibilidad minima con scripts clasicos que leen estado global
if (typeof window !== 'undefined') {
    window.appState = appState;
}

// Autoinicializar desde localStorage al cargar el script
initDatabaseFromStorage();
