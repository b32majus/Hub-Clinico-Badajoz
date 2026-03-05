// /modules/dataManager.js
// ACTUALIZACIÓN: Patrón clásico (sin import/export) + funciones adicionales para Fase 2
let appState = { isLoaded: false, db: null };

/**
 * Guarda la base de datos en localStorage con manejo inteligente de tamaño
 * Si la BD es demasiado grande, guarda solo una versión limitada
 */
function saveToSessionStorage() {
    try {
        const data = JSON.stringify(appState.db);
        const sizeBytes = new Blob([data]).size;
        const sizeKB = sizeBytes / 1024;
        const sizeMB = sizeKB / 1024;

        // Límite conservador de 4MB (localStorage típicamente 5-10MB)
        if (sizeKB > 4096) {
            console.warn(`⚠️ Base de datos muy grande (${sizeMB.toFixed(2)}MB). Guardando versión limitada en localStorage.`);

            // Estrategia: Guardar solo últimas 100 visitas de cada hoja
            const limitedDB = {
                ...appState.db,
                ESPA: (appState.db?.ESPA || []).slice(-100),
                APS: (appState.db?.APS || []).slice(-100)
            };

            localStorage.setItem('hubClinicoDB', JSON.stringify(limitedDB));
            localStorage.setItem('hubClinicoDB_limited', 'true');
            console.log('✓ Base de datos limitada guardada en localStorage (últimas 100 visitas por patología).');

            // Advertir al usuario
            if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
                HubTools.utils.mostrarNotificacion(
                    'BD muy grande. Caché limitado a últimas 100 visitas por patología.',
                    'warning'
                );
            }
        } else {
            localStorage.setItem('hubClinicoDB', data);
            localStorage.removeItem('hubClinicoDB_limited');
            console.log(`✓ Base de datos completa guardada en localStorage (${sizeKB.toFixed(0)}KB).`);
        }
    } catch (e) {
        console.error('❌ Error al guardar la base de datos en localStorage:', e);

        // Si falla incluso con versión limitada, no guardar nada
        localStorage.removeItem('hubClinicoDB');
        localStorage.removeItem('hubClinicoDB_limited');

        // Alertar al usuario
        if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
            HubTools.utils.mostrarNotificacion(
                'Error: BD demasiado grande para caché. Funcionalidad limitada entre páginas.',
                'error'
            );
        } else {
            alert('Error: No se pudo guardar la base de datos en la sesión del navegador. Es posible que sea demasiado grande.');
        }
    }
}

/**
 * Carga un archivo .xlsx, lo procesa con SheetJS y lo guarda en el estado de la aplicación.
 * Es el corazón del dataManager y la única función que interactúa directamente con el archivo.
 * @param {File} file - El objeto File seleccionado por el usuario desde un <input type="file">.
 * @returns {Promise<boolean>} - Devuelve 'true' si la carga fue exitosa, 'false' si falló.
 */
async function loadDatabase(file) {
    // Usamos un bloque try...catch para manejar cualquier posible error durante la lectura o parseo del archivo.
    try {
        // 1. Lee el archivo como un ArrayBuffer, que es el formato que SheetJS necesita.
        const data = await file.arrayBuffer();

        // 2. SheetJS lee los datos binarios y crea un objeto "workbook" (libro de trabajo).
        const workbook = XLSX.read(data);

        const dbData = {};

        // 3. Itera sobre las hojas de datos de pacientes y profesionales, que tienen una estructura estándar.
        ['ESPA', 'APS', 'Profesionales'].forEach(sheetName => {
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

        // 4. Procesa de forma ESPECIAL la hoja 'Fármacos' para crear un objeto anidado.
        if (workbook.Sheets['Fármacos']) {
            const farmacosSheet = workbook.Sheets['Fármacos'];
            // Leemos la hoja como un array de arrays (filas y columnas) para tener control total.
            const farmacosJSON = XLSX.utils.sheet_to_json(farmacosSheet, { header: 1 });
            console.log('DEBUG: farmacosJSON (Fármacos sheet raw data):', farmacosJSON);

            // Inicializamos el objeto que contendrá las listas de fármacos.
            dbData['Fármacos'] = {
                Sistemicos: [],
                FAMEs: [],
                Biologicos: []
            };

            // Recorremos las filas de datos (a partir de la segunda fila, índice 1)
            // y extraemos los valores de cada columna para rellenar nuestras listas.
            if (farmacosJSON.length > 1) {
                for (let i = 1; i < farmacosJSON.length; i++) {
                    const row = farmacosJSON[i];
                    console.log('DEBUG: Processing Fármacos row:', i, row);
                    if (row[0]) { // Columna 0: Sistemicos
                        dbData['Fármacos'].Sistemicos.push(row[0]);
                    }
                    if (row[1]) { // Columna 1: FAMEs
                        dbData['Fármacos'].FAMEs.push(row[1]);
                    }
                    if (row[2]) { // Columna 2: Biologicos
                        dbData['Fármacos'].Biologicos.push(row[2]);
                    }
                }
            }
        }

        // 5. Actualiza el estado global de la aplicación.
        appState.db = dbData;
        appState.isLoaded = true;

        console.log("Base de datos cargada y procesada con éxito:", appState.db);

        // Disparar evento personalizado para notificar que la BD está cargada
        window.dispatchEvent(new CustomEvent('databaseLoaded', { detail: appState.db }));
        console.log('✓ Evento databaseLoaded disparado');

        // Guardar en localStorage para persistencia entre páginas
        saveToSessionStorage();

        // 6. Devuelve 'true' para indicar que la operación fue exitosa.
        return true;

    } catch (error) {
        // Si algo falla en cualquier punto, lo capturamos aquí.
        console.error("Error crítico al cargar o procesar la base de datos:", error);

        // Reseteamos el estado para evitar que la aplicación trabaje con datos corruptos.
        appState.isLoaded = false;
        appState.db = null;

        // 7. Devuelve 'false' para indicar que la operación falló.
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
 * Devuelve la lista de fármacos para un tipo específico.
 * @param {string} tipo - El tipo de fármaco (e.g., 'Tratamientos_Sistemicos', 'FAMEs', 'Biologicos').
 * @returns {Array} Array de strings con los nombres de los fármacos.
 */
function getFarmacosPorTipo(tipo) {
    console.log('DEBUG: getFarmacosPorTipo called with tipo:', tipo);
    if (!appState.isLoaded) {
        console.warn('⚠ Base de datos no cargada. No se pueden obtener fármacos.');
        return [];
    }

    // Mapeo para mayor flexibilidad y compatibilidad
    const tipoMapping = {
        'Sistemicos': ['Sistemicos', 'Tratamientos_Sistemicos', 'sistemicos'],
        'FAMEs': ['FAMEs', 'fames'],
        'Biologicos': ['Biologicos', 'biologicos']
    };

    // Intentar encontrar el tipo solicitado en múltiples posibles claves
    const possibleKeys = tipoMapping[tipo] || [tipo];

    for (const key of possibleKeys) {
        if (appState.db?.Fármacos?.[key] && Array.isArray(appState.db.Fármacos[key])) {
            console.log(`✓ Encontrados ${appState.db.Fármacos[key].length} fármacos del tipo "${tipo}" (clave: ${key})`);
            console.log('DEBUG: Returning fármacos:', appState.db.Fármacos[key]);
            return appState.db.Fármacos[key];
        }
    }
    console.warn(`⚠ No se encontraron fármacos para el tipo: ${tipo} con las claves posibles: ${possibleKeys.join(', ')}`);
    return [];
}

/**
 * Devuelve todos los pacientes de todas las hojas
 * @returns {Array} Array de todos los pacientes
 */
function getAllPatients() {
    if (!appState.isLoaded) return [];
    const allPatients = [];
    ['ESPA', 'APS'].forEach(sheetName => {
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
        const sheets = ['ESPA', 'APS'];
        for (const sheetName of sheets) {
            const patients = appState.db?.[sheetName] || [];
            const patient = patients.find(p => p.ID_Paciente === patientId);
            if (patient) {
                return { ...patient, pathology: sheetName.toLowerCase() };
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
        const sheets = ['ESPA', 'APS'];
        const visits = [];
        let pathology = null;

        sheets.forEach(sheetName => {
            const patients = appState.db?.[sheetName] || [];
            const patientVisits = patients.filter(p => p.ID_Paciente === patientId);
            patientVisits.forEach(visit => {
                // Normalizar nombres de columnas del Excel al formato esperado por el código
                const normalizedVisit = {
                    ...visit,
                    pathology: sheetName.toLowerCase(),
                    // Normalizar métricas clínicas (Excel → código)
                    basdaiResult: visit.BASDAI_Result ?? visit.basdaiResult ?? visit.BASDAI,
                    asdasCrpResult: visit.ASDAS_CRP_Result ?? visit.asdasCrpResult ?? visit.ASDAS,
                    haqResult: visit.HAQ_Total ?? visit.haqResult ?? visit.HAQ,
                    basfiResult: visit.BASFI_Result ?? visit.basfiResult ?? visit.BASFI,
                    pcrResult: visit.PCR ?? visit.pcrResult,
                    vsgResult: visit.VSG ?? visit.vsgResult,
                    // Normalizar EVAs
                    evaGlobal: visit.EVA_Global ?? visit.evaGlobal,
                    evaDolor: visit.EVA_Dolor ?? visit.evaDolor,
                    // Normalizar fechas
                    fechaVisita: visit.Fecha_Visita ?? visit.fechaVisita,
                    // Normalizar tratamiento
                    tratamientoActual: visit.Tratamiento_Actual ?? visit.tratamientoActual,
                    // Normalizar identificación
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
 * Parsea una fecha de múltiples formatos posibles
 * @param {string|Date} dateStr - Fecha en formato DD/MM/YYYY, YYYY-MM-DD, o ya Date
 * @returns {Date} - Objeto Date
 */
function parseVisitDate(dateStr) {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;

    // Intentar formato DD/MM/YYYY
    if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
    }

    // Intentar formato YYYY-MM-DD
    return new Date(dateStr);
}

/**
 * Extrae el historial de cambios de tratamiento a partir de las visitas
 * @param {Array} visits - Array de visitas ordenadas cronológicamente (reciente primero)
 * @returns {Array} - Array de { date, name, reason }
 */
function extractTreatmentHistory(visits) {
    if (visits.length === 0) return [];

    const treatments = [];
    const seenTreatments = new Set();

    // Recorrer visitas en orden cronológico inverso (antiguo a reciente)
    for (let i = visits.length - 1; i >= 0; i--) {
        const visit = visits[i];

        // Extraer tratamiento actual - usar nombres normalizados y del Excel
        let currentTreatment = visit.tratamientoActual || visit.Tratamiento_Actual ||
            visit.biologicoSelect || visit.fameSelect || visit.sistemicoSelect ||
            visit.Biologico || visit.FAME || visit.Sistémico || null;

        // Si encontramos un tratamiento nuevo (diferente al anterior), registrarlo
        if (currentTreatment && !seenTreatments.has(currentTreatment)) {
            seenTreatments.add(currentTreatment);
            treatments.push({
                startDate: visit.fechaVisita || visit.Fecha_Visita || new Date(),
                name: currentTreatment,
                reason: visit.motivoCambio || visit.comentariosAdicionales || 'Tratamiento activo'
            });
        }
    }

    return treatments;
}

/**
 * Extrae eventos clínicos clave a partir de las visitas mediante comparación de valores
 * @param {Array} visits - Array de visitas ordenadas cronológicamente (reciente primero)
 * @param {string} pathology - Tipo de patología ('espa' o 'aps')
 * @returns {Array} - Array de { date, type, description }
 */
function extractKeyEvents(visits, pathology) {
    if (visits.length < 2) return []; // Se necesitan al menos 2 visitas para inferir eventos

    const events = [];
    const cutoffs = HubTools?.dashboard?.activityCutoffs || {};

    // Procesar visitas en orden cronológico (antiguo a reciente)
    for (let i = visits.length - 1; i >= 0; i--) {
        const currentVisit = visits[i];
        const previousVisit = i > 0 ? visits[i + 1] : null;
        const visitDate = currentVisit.Fecha_Visita || currentVisit.fechaVisita;

        // 1. Registrar cambios explícitos de tratamiento
        if (previousVisit) {
            const currentTx = currentVisit.biologicoSelect || currentVisit.fameSelect ||
                currentVisit.sistemicoSelect || currentVisit.Biologico ||
                currentVisit.FAME || currentVisit.Sistémico;
            const previousTx = previousVisit.biologicoSelect || previousVisit.fameSelect ||
                previousVisit.sistemicoSelect || previousVisit.Biologico ||
                previousVisit.FAME || previousVisit.Sistémico;

            if (currentTx && previousTx && currentTx !== previousTx) {
                events.push({
                    date: visitDate,
                    type: 'treatment',
                    description: `Cambio de tratamiento: ${previousTx} → ${currentTx}`
                });
            }
        }

        // 2. Detectar eventos adversos si están registrados
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
                    flareReason = `BASDAI ↑ (${prevBASDAI.toFixed(1)} → ${currBASDAI.toFixed(1)})`;
                }

                // Comparar ASDAS-CRP
                if (!isFlare) {
                    const currASDAS = parseFloat(currentVisit.asdasCrpResult || currentVisit.ASDAS);
                    const prevASDAS = parseFloat(previousVisit.asdasCrpResult || previousVisit.ASDAS);

                    if (!isNaN(currASDAS) && !isNaN(prevASDAS) && currASDAS > prevASDAS + 0.8) {
                        isFlare = true;
                        flareReason = `ASDAS ↑ (${prevASDAS.toFixed(2)} → ${currASDAS.toFixed(2)})`;
                    }
                }
            } else if (pathology === 'aps' || pathology === 'APS') {
                // Comparar HAQ
                const currHAQ = parseFloat(currentVisit.haqResult || currentVisit.HAQ);
                const prevHAQ = parseFloat(previousVisit.haqResult || previousVisit.HAQ);

                if (!isNaN(currHAQ) && !isNaN(prevHAQ) && currHAQ > prevHAQ + 0.5) {
                    isFlare = true;
                    flareReason = `HAQ ↑ (${prevHAQ.toFixed(2)} → ${currHAQ.toFixed(2)})`;
                }

                // Comparar RAPID3
                if (!isFlare) {
                    const currRAPID3 = parseFloat(currentVisit.rapid3Result || currentVisit.RAPID3);
                    const prevRAPID3 = parseFloat(previousVisit.rapid3Result || previousVisit.RAPID3);

                    if (!isNaN(currRAPID3) && !isNaN(prevRAPID3) && currRAPID3 > prevRAPID3 + 2) {
                        isFlare = true;
                        flareReason = `RAPID3 ↑ (${prevRAPID3.toFixed(1)} → ${currRAPID3.toFixed(1)})`;
                    }
                }
            }

            if (isFlare) {
                events.push({
                    date: visitDate,
                    type: 'flare',
                    description: `Brote clínico detectado: ${flareReason}`
                });
            }
        }

        // 4. Detectar remisión cuando se alcanzan umbrales bajos
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
                remissionReason = `HAQ en remisión (${haq.toFixed(2)})`;
            }
        }

        if (isRemission && previousVisit) {
            // Solo registrar si la visita anterior NO estaba en remisión
            const prevBASDAI = parseFloat(previousVisit.basdaiResult || previousVisit.BASDAI);
            const prevHAQ = parseFloat(previousVisit.haqResult || previousVisit.HAQ);

            let shouldRecord = false;
            if (pathology === 'espa' && !isNaN(prevBASDAI) && prevBASDAI >= 4) shouldRecord = true;
            if (pathology === 'aps' && !isNaN(prevHAQ) && prevHAQ >= 0.5) shouldRecord = true;

            if (shouldRecord) {
                events.push({
                    date: visitDate,
                    type: 'remission',
                    description: `Remisión clínica alcanzada: ${remissionReason}`
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
 * Intenta inicializar la base de datos desde localStorage al cargar la página.
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
            console.log('✓ Base de datos cargada desde localStorage.');

            // Disparar evento para que otros scripts sepan que los datos están listos.
            // Usamos un pequeño timeout para asegurar que los listeners de otros scripts ya estén registrados.
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('databaseLoaded', { detail: appState.db }));
                console.log('✓ Evento databaseLoaded disparado desde localStorage.');
            }, 100);

            return true;
        }
    } catch (e) {
        console.error('❌ Error al cargar la base de datos desde localStorage:', e);
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
    DAS28_CRP: ['DAS28_CRP', 'das28Crp'],
    DAS28_ESR: ['DAS28_ESR', 'das28Esr'],
    CDAI: ['CDAI', 'cdai'],
    SDAI: ['SDAI', 'sdai'],
    RAPID3: ['RAPID3_Score', 'RAPID3', 'rapid3Total', 'rapid3'],
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
 * Calcula KPIs según la patología seleccionada
 * - ESPA: usa BASDAI como métrica principal (remisión < 2, alta >= 4)
 * - APS: usa HAQ como métrica principal (remisión < 0.5, alta >= 2)
 * @param {Array} patients - Array de pacientes filtrados
 * @param {string} pathologyFilter - Patología seleccionada ('ESPA', 'APS', 'Todos')
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
            // Métricas adicionales por patología
            metrics: {}
        };
    }

    let remission = 0, highActivity = 0, biologicCount = 0;
    let activitySum = 0, activityCount = 0;
    let activityLabel = 'BASDAI';

    // Acumuladores para métricas específicas por patología
    const metricsAcc = {
        BASDAI: { sum: 0, count: 0 },
        ASDAS: { sum: 0, count: 0 },
        HAQ: { sum: 0, count: 0 },
        RAPID3: { sum: 0, count: 0 },
        EVA_Dolor: { sum: 0, count: 0 },
        EVA_Global: { sum: 0, count: 0 },
        PCR: { sum: 0, count: 0 },
        VSG: { sum: 0, count: 0 },
        PASI: { sum: 0, count: 0 },
        LEI: { sum: 0, count: 0 }
    };

    patients.forEach(p => {
        const patientPathology = p.pathology || '';

        const basdai = parseFloat(p.BASDAI_Result) || null;
        const asdas = parseFloat(p.ASDAS_CRP_Result) || null;
        const haq = parseFloat(p.HAQ_Total) || null;
        const rapid3 = parseFloat(p.RAPID3_Score) || parseFloat(p.RAPID3) || null;
        const das28Crp = parseFloat(p.DAS28_CRP) || parseFloat(p.das28Crp) || null;
        const das28Esr = parseFloat(p.DAS28_ESR) || parseFloat(p.das28Esr) || null;
        const cdai = parseFloat(p.CDAI) || parseFloat(p.cdai) || null;
        const sdai = parseFloat(p.SDAI) || parseFloat(p.sdai) || null;
        const evaDolor = parseFloat(p.EVA_Dolor) || null;
        const evaGlobal = parseFloat(p.EVA_Global) || null;
        const pcr = parseFloat(p.PCR) || null;
        const vsg = parseFloat(p.VSG) || null;
        const pasi = parseFloat(p.PASI_Score) || null;
        const lei = parseFloat(p.LEI_Score) || null;

        // Acumular métricas para promedios
        if (basdai !== null && !isNaN(basdai)) { metricsAcc.BASDAI.sum += basdai; metricsAcc.BASDAI.count++; }
        if (asdas !== null && !isNaN(asdas)) { metricsAcc.ASDAS.sum += asdas; metricsAcc.ASDAS.count++; }
        if (haq !== null && !isNaN(haq)) { metricsAcc.HAQ.sum += haq; metricsAcc.HAQ.count++; }
        if (rapid3 !== null && !isNaN(rapid3)) { metricsAcc.RAPID3.sum += rapid3; metricsAcc.RAPID3.count++; }
        if (evaDolor !== null && !isNaN(evaDolor)) { metricsAcc.EVA_Dolor.sum += evaDolor; metricsAcc.EVA_Dolor.count++; }
        if (evaGlobal !== null && !isNaN(evaGlobal)) { metricsAcc.EVA_Global.sum += evaGlobal; metricsAcc.EVA_Global.count++; }
        if (pcr !== null && !isNaN(pcr)) { metricsAcc.PCR.sum += pcr; metricsAcc.PCR.count++; }
        if (vsg !== null && !isNaN(vsg)) { metricsAcc.VSG.sum += vsg; metricsAcc.VSG.count++; }
        if (pasi !== null && !isNaN(pasi)) { metricsAcc.PASI.sum += pasi; metricsAcc.PASI.count++; }
        if (lei !== null && !isNaN(lei)) { metricsAcc.LEI.sum += lei; metricsAcc.LEI.count++; }

        // Determinar métrica principal según patología del paciente
        let activityValue = null;
        if (patientPathology === 'ESPA') {
            activityValue = basdai;
            activityLabel = 'BASDAI';
        } else if (patientPathology === 'APS') {
            activityValue = haq;
            activityLabel = 'HAQ';
        } else if (patientPathology === 'AR') {
            activityValue = das28Crp !== null ? das28Crp : (das28Esr !== null ? das28Esr : (cdai !== null ? cdai : rapid3));
            activityLabel = das28Crp !== null ? 'DAS28-CRP' : (das28Esr !== null ? 'DAS28-ESR' : (cdai !== null ? 'CDAI' : 'RAPID3'));
        }

        // Si el filtro es específico, usar la métrica correspondiente
        if (pathologyFilter === 'ESPA') {
            activityValue = basdai;
            activityLabel = 'BASDAI';
        } else if (pathologyFilter === 'APS') {
            activityValue = haq;
            activityLabel = 'HAQ';
        } else if (pathologyFilter === 'AR') {
            activityValue = das28Crp !== null ? das28Crp : (das28Esr !== null ? das28Esr : (cdai !== null ? cdai : rapid3));
            activityLabel = das28Crp !== null ? 'DAS28-CRP' : (das28Esr !== null ? 'DAS28-ESR' : (cdai !== null ? 'CDAI' : 'RAPID3'));
        }

        if (activityValue !== null && !isNaN(activityValue)) {
            activitySum += activityValue;
            activityCount++;

            // Umbrales según patología del paciente
            if (patientPathology === 'ESPA') {
                // BASDAI: remisión < 2, alta >= 4
                if (basdai !== null && basdai < 2) remission++;
                if (basdai !== null && basdai >= 4) highActivity++;
            } else if (patientPathology === 'APS') {
                // HAQ: remisión < 0.5, alta >= 2
                if (haq !== null && haq < 0.5) remission++;
                if (haq !== null && haq >= 2) highActivity++;
            } else if (patientPathology === 'AR') {
                const bucket = getActivityBucket(activityLabel, activityValue);
                if (bucket === 'Remision') remission++;
                if (bucket === 'Alta Actividad') highActivity++;
            }
        }

        // Detectar biológico - usar Tratamiento_Actual del Excel
        const tto = (p.Tratamiento_Actual || '').toLowerCase();
        if (tto.includes('biolog') || tto.includes('anti-tnf') || tto.includes('secukinumab') ||
            tto.includes('adalimumab') || tto.includes('etanercept') || tto.includes('infliximab') ||
            tto.includes('golimumab') || tto.includes('certolizumab') || tto.includes('ustekinumab') ||
            tto.includes('ixekizumab') || tto.includes('guselkumab') || tto.includes('risankizumab') ||
            tto.includes('tofacitinib') || tto.includes('upadacitinib')) {
            biologicCount++;
        }
    });

    // Calcular promedios de métricas
    const metrics = {};
    Object.entries(metricsAcc).forEach(([key, acc]) => {
        metrics[key] = acc.count > 0 ? (acc.sum / acc.count).toFixed(2) : null;
    });

    console.log('📊 KPIs calculados:', {
        total, activityCount, remission, highActivity, biologicCount,
        activityLabel, avgActivity: activityCount > 0 ? (activitySum / activityCount).toFixed(1) : 0
    });

    return {
        totalPatients: total,
        remissionPercent: activityCount > 0 ? Math.round((remission / activityCount) * 100) : 0,
        highActivityPercent: activityCount > 0 ? Math.round((highActivity / activityCount) * 100) : 0,
        biologicPercent: Math.round((biologicCount / total) * 100),
        avgActivity: activityCount > 0 ? parseFloat((activitySum / activityCount).toFixed(1)) : 0,
        activityLabel: activityLabel,
        metrics: metrics
    };
}

/**
 * Genera datos para gráficos según la patología
 * - Donut de actividad: usa BASDAI (ESPA) o HAQ (APS)
 * - Barras de tratamiento: top 10 tratamientos
 * - Barras de comorbilidades: cuenta de cada comorbilidad
 * - Scatter de correlación: según ejes seleccionados
 */
function generateRealChartData(patients, filters = {}) {
    const pathologyFilter = filters.pathology || 'Todos';

    // Debug: mostrar columnas disponibles en primer paciente
    if (patients.length > 0) {
        console.log('📊 Columnas del primer paciente:', Object.keys(patients[0]).slice(0, 20));
        console.log('📊 Valores de métricas del primer paciente:', {
            BASDAI_Result: patients[0].BASDAI_Result,
            HAQ_Total: patients[0].HAQ_Total,
            ASDAS_CRP_Result: patients[0].ASDAS_CRP_Result,
            pathology: patients[0].pathology
        });
    }

    // =====================
    // GRÁFICO DE ACTIVIDAD (Donut)
    // =====================
    const activityCounts = { remission: 0, low: 0, moderate: 0, high: 0 };
    let activityLabel = 'BASDAI';

    patients.forEach(p => {
        const patientPathology = p.pathology || '';
        let activityValue = null;

        // Usar la métrica correcta según patología
        if (patientPathology === 'ESPA' || pathologyFilter === 'ESPA') {
            // ESPA: usar BASDAI_Result
            activityValue = parseFloat(p.BASDAI_Result);
            activityLabel = 'BASDAI';

            if (!isNaN(activityValue) && activityValue >= 0) {
                // Umbrales BASDAI: remisión < 2, baja < 4, moderada < 6, alta >= 6
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
                // Umbrales HAQ: remisión < 0.5, baja < 1.5, moderada < 2, alta >= 2
                if (activityValue < 0.5) activityCounts.remission++;
                else if (activityValue < 1.5) activityCounts.low++;
                else if (activityValue < 2) activityCounts.moderate++;
                else activityCounts.high++;
            }
        } else if (patientPathology === 'AR' || pathologyFilter === 'AR') {
            // AR: intentar DAS28-CRP -> DAS28-ESR -> CDAI -> RAPID3
            activityValue = parseFloat(p.DAS28_CRP) || parseFloat(p.das28Crp);
            activityLabel = 'DAS28-CRP';
            if (isNaN(activityValue)) {
                activityValue = parseFloat(p.DAS28_ESR) || parseFloat(p.das28Esr);
                activityLabel = 'DAS28-ESR';
            }
            if (isNaN(activityValue)) {
                activityValue = parseFloat(p.CDAI) || parseFloat(p.cdai);
                activityLabel = 'CDAI';
            }
            if (isNaN(activityValue)) {
                activityValue = parseFloat(p.RAPID3_Score) || parseFloat(p.RAPID3);
                activityLabel = 'RAPID3';
            }

            if (!isNaN(activityValue) && activityValue >= 0) {
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
                    activityValue = parseFloat(p.DAS28_CRP);
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

    console.log('📊 Activity counts (donut):', activityCounts, 'usando', activityLabel);

    // =====================
    // GRÁFICO DE TRATAMIENTOS (Barras)
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

    console.log('📊 Treatment counts (barras):', treatmentLabels.length, 'tratamientos');

    // =====================
    // GRÁFICO DE COMORBILIDADES (Barras)
    // =====================
    const comorbidityCounts = {};
    const comorbidityLabelsMap = {
        HTA: 'Hipertensión',
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

    console.log('📊 Comorbidity counts:', comorbidityLabels.length, 'comorbilidades');

    // =====================
    // GRÁFICO DE CORRELACIÓN (Scatter)
    // =====================
    const scatterX = filters.scatterX || 'BASDAI';
    const scatterY = filters.scatterY || 'ASDAS';

    // Mapeo de nombres a columnas Excel exactas
    const metricColumnMap = {
        'BASDAI': 'BASDAI_Result',
        'ASDAS': 'ASDAS_CRP_Result',
        'HAQ': 'HAQ_Total',
        'RAPID3': 'RAPID3_Score',
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

    console.log('📊 Correlation data:', correlationData.length, 'puntos para', scatterX, 'vs', scatterY);

    // Si no hay datos, añadir punto placeholder
    if (correlationData.length === 0) {
        correlationData.push({ x: 0, y: 0 });
    }

    return {
        activity: {
            labels: ['Remisión', 'Baja', 'Moderada', 'Alta'],
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
 * Normaliza las columnas y calcula KPIs según la patología seleccionada
 */
function getRealPoblationalData(filters = {}) {
    if (!appState.isLoaded || !appState.db) {
        console.warn('⚠️ Base de datos no cargada para estadísticas poblacionales');
        return { filteredCohort: [], kpis: null, chartData: null };
    }

    const pathologyFilter = filters.pathology || 'Todos';
    console.log('📊 getRealPoblationalData - Filtro patología:', pathologyFilter);

    // 1. Obtener pacientes según filtro de patología
    let allPatients = [];
    const sheetsToProcess = pathologyFilter === 'Todos' || !pathologyFilter
        ? ['ESPA', 'APS', 'AR']
        : [pathologyFilter];

    sheetsToProcess.forEach(sheetName => {
        if (appState.db?.[sheetName]) {
            console.log(`📊 Procesando hoja ${sheetName}: ${appState.db[sheetName].length} registros`);

            appState.db[sheetName].forEach(visit => {
                // Mantener TODAS las columnas originales del Excel + añadir normalización
                const normalizedVisit = {
                    ...visit,  // Mantener todas las columnas originales
                    pathology: sheetName,
                    // Normalizar solo para la tabla de pacientes (campos de visualización)
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

    console.log(`📊 Total pacientes cargados: ${allPatients.length}`);

    // Debug: mostrar columnas del primer paciente
    if (allPatients.length > 0) {
        const firstPatient = allPatients[0];
        console.log('📊 Columnas disponibles:', Object.keys(firstPatient).slice(0, 15));
        console.log('📊 Valores de métricas (primer paciente):', {
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
    console.log(`📊 Después de filtros: ${filteredCohort.length} pacientes`);

    // 3. Calcular KPIs pasando el filtro de patología
    const kpis = calculateRealKPIs(filteredCohort, pathologyFilter);

    // 4. Generar datos para gráficos
    const chartData = generateRealChartData(filteredCohort, filters);

    // Debug: verificar datos para tabla
    console.log('📊 Datos para tabla:', {
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
    console.log('📊 getPoblationalData llamado con filtros:', JSON.stringify(filters));

    // PRIMERO: Intentar usar datos reales del Excel cargado
    if (appState.isLoaded && appState.db) {
        console.log('📊 Base de datos cargada, obteniendo datos reales...');
        const realData = getRealPoblationalData(filters);
        console.log('📊 Datos reales obtenidos:', realData.filteredCohort.length, 'registros');
        // Siempre devolver datos reales si la base está cargada (incluso si filteredCohort está vacío)
        return realData;
    }

    // FALLBACK: Usar mock si está habilitado y la base de datos no está cargada
    if (typeof getMockPoblationalData === 'function') {
        console.log('📊 Base de datos no cargada, intentando mock...');
        const mockData = getMockPoblationalData(filters);
        if (mockData && mockData.filteredCohort && mockData.filteredCohort.length > 0) {
            return mockData;
        }
    }

    // Estructura vacía como último recurso
    console.warn('⚠️ No hay datos disponibles para el dashboard de estadísticas');
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
            activity: { labels: ['Remisión', 'Baja', 'Moderada', 'Alta'], datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'] }] },
            treatment: { labels: [], datasets: [{ data: [], backgroundColor: '#6366f1' }] },
            comorbidity: { labels: [], datasets: [{ data: [] }] },
            correlation: { datasets: [] }
        }
    };
}





function getFarmsDataFromState() {
    if (!appState.isLoaded || !appState.db.Fármacos) {
        return { Tratamientos_Sistemicos: [], FAMEs: [], Biologicos: [] };
    }

    // La estructura de Fármacos ya es { Sistemicos: [...], FAMEs: [...], Biologicos: [...] }
    // Solo necesitamos mapear los nombres correctamente
    return {
        Tratamientos_Sistemicos: appState.db.Fármacos.Sistemicos || [],
        FAMEs: appState.db.Fármacos.FAMEs || [],
        Biologicos: appState.db.Fármacos.Biologicos || []
    };
}

// =====================================

// EXPOSICIÓN AL NAMESPACE HUBTOOLS

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
        if (!appState.isLoaded || !appState.db.Fármacos) {
            return { FAMEs: [], Biologicos: [], Sistemicos: [] };
        }
        return appState.db.Fármacos;
    };

    HubTools.data.loadProfessionalsData = function () {
        if (!appState.isLoaded || !appState.db.Profesionales) {
            return [];
        }
        return appState.db.Profesionales;
    };

    console.log('✅ Módulo dataManager cargado');

} else {

    console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js primero.');

}

// Mantener compatibilidad con scripts clasicos que esperan funciones globales

if (typeof window !== 'undefined') {
    window.appState = appState;
    window.loadDatabase = loadDatabase;

    window.getProfesionales = getProfesionales;

    window.getFarmacosPorTipo = getFarmacosPorTipo;

    window.getAllPatients = getAllPatients;

    window.findPatientById = findPatientById;

    window.getPatientHistory = getPatientHistory;

    window.getPoblationalData = getPoblationalData;

}

// Autoinicializar desde localStorage al cargar el script
initDatabaseFromStorage();



