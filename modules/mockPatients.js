(function () {
    'use strict';

    // Flag de configuración: desactivar para producción
    const ENABLE_MOCK_DATA = false;

    if (!ENABLE_MOCK_DATA) {
        console.warn('⚠️ MockPatients desactivado - usando solo datos de base de datos real');
        window.MockPatients = {
            list: () => [],
            getById: (id) => null,
            search: (term) => []
        };
        return;
    }

    function clone(data) {
        return JSON.parse(JSON.stringify(data));
    }

    function normalize(value) {
        return (value || '')
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
    }

    const PATIENTS = {
        'ESP-2023-001': {
            summary: {
                idPaciente: 'ESP-2023-001',
                nombre: 'Elena Torres Martín',
                diagnosticoPrimario: 'espa',
                pathology: 'espa',
                ultimaVisita: '2023-07-10',
                tratamientoActual: 'Secukinumab 150 mg cada 4 semanas'
            },
            pathology: 'espa',
            visits: [
                {
                    idPaciente: 'ESP-2023-001',
                    nombrePaciente: 'Elena Torres Martín',
                    sexoPaciente: 'Mujer',
                    fechaNacimiento: '1975-03-15',
                    diagnosticoPrimario: 'espa',
                    hlaB27: 'positivo',
                    fr: 'negativo',
                    apcc: 'negativo',
                    fechaVisita: '2023-01-15',
                    basdaiResult: 6.2,
                    asdasCrpResult: 3.1,
                    basfiResult: 5.2,
                    evaGlobal: 6,
                    evaDolor: 5,
                    biologicoSelect: 'Naproxeno',
                    manifestacionesExtraarticulares: { uveitis: 'SI', psoriasis: 'NO', digestiva: 'NO' }
                },
                {
                    idPaciente: 'ESP-2023-001',
                    nombrePaciente: 'Elena Torres Martín',
                    sexoPaciente: 'Mujer',
                    fechaNacimiento: '1975-03-15',
                    diagnosticoPrimario: 'espa',
                    hlaB27: 'positivo',
                    fr: 'negativo',
                    apcc: 'negativo',
                    fechaVisita: '2023-07-10',
                    basdaiResult: 3.2,
                    asdasCrpResult: 1.9,
                    basfiResult: 2.8,
                    evaGlobal: 3,
                    evaDolor: 2,
                    biologicoSelect: 'Secukinumab',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'NO', digestiva: 'NO' }
                }
            ],
            treatmentHistory: [
                { startDate: '2023-01-15', endDate: '2023-07-09', name: 'Naproxeno', reason: 'Tratamiento inicial con AINE' },
                { startDate: '2023-07-10', name: 'Secukinumab', reason: 'Escalada biológica por persistencia de actividad' }
            ],
            keyEvents: [
                { date: '2023-01-15', type: 'diagnosis', description: 'Diagnóstico definitivo de Espondiloartritis axial.' },
                { date: '2023-04-02', type: 'flare', description: 'Brote moderado con BASDAI 6.0.' },
                { date: '2023-07-10', type: 'remission', description: 'Respuesta clínica óptima tras iniciar Secukinumab.' }
            ]
        },
        'APS-2023-001': {
            summary: {
                idPaciente: 'APS-2023-001',
                nombre: 'Carlos Ruiz García',
                diagnosticoPrimario: 'aps',
                pathology: 'aps',
                ultimaVisita: '2023-08-15',
                tratamientoActual: 'Adalimumab 40 mg cada 2 semanas'
            },
            pathology: 'aps',
            visits: [
                {
                    idPaciente: 'APS-2023-001',
                    nombrePaciente: 'Carlos Ruiz García',
                    sexoPaciente: 'Hombre',
                    fechaNacimiento: '1980-07-22',
                    diagnosticoPrimario: 'aps',
                    hlaB27: 'negativo',
                    fr: 'positivo',
                    apcc: 'positivo',
                    fechaVisita: '2023-02-20',
                    haqResult: 1.8,
                    leiResult: 15,
                    rapid3Result: 9.5,
                    evaGlobal: 7,
                    evaDolor: 6,
                    biologicoSelect: 'Adalimumab',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'SI', digestiva: 'NO' }
                },
                {
                    idPaciente: 'APS-2023-001',
                    nombrePaciente: 'Carlos Ruiz García',
                    sexoPaciente: 'Hombre',
                    fechaNacimiento: '1980-07-22',
                    diagnosticoPrimario: 'aps',
                    hlaB27: 'negativo',
                    fr: 'positivo',
                    apcc: 'positivo',
                    fechaVisita: '2023-08-15',
                    haqResult: 1.1,
                    leiResult: 8,
                    rapid3Result: 5.2,
                    evaGlobal: 4,
                    evaDolor: 3,
                    biologicoSelect: 'Adalimumab',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'SI', digestiva: 'NO' }
                }
            ],
            treatmentHistory: [
                { startDate: '2023-02-20', name: 'Adalimumab', reason: 'Inicio anti-TNF por APs poliarticular' }
            ],
            keyEvents: [
                { date: '2023-02-20', type: 'diagnosis', description: 'Confirmación de Artritis Psoriásica.' },
                { date: '2023-06-05', type: 'adverse_event', description: 'Brotes cutáneos leves sin suspensión del tratamiento.' }
            ]
        },
        'ESP-2024-007': {
            summary: {
                idPaciente: 'ESP-2024-007',
                nombre: 'Miguel Ángel Fernández López',
                diagnosticoPrimario: 'espa',
                pathology: 'espa',
                ultimaVisita: '2025-03-25', // Updated last visit date
                tratamientoActual: 'Adalimumab 40 mg cada 2 semanas'
            },
            pathology: 'espa',
            visits: [
                {
                    idPaciente: 'ESP-2024-007',
                    nombrePaciente: 'Miguel Ángel Fernández López',
                    sexoPaciente: 'Hombre',
                    fechaNacimiento: '1979-11-08',
                    diagnosticoPrimario: 'espa',
                    hlaB27: 'positivo',
                    fr: 'negativo',
                    apcc: 'negativo',
                    fechaVisita: '2024-01-10',
                    basdaiResult: 7.3,
                    asdasCrpResult: 3.8,
                    basfiResult: 6.5,
                    evaGlobal: 7,
                    evaDolor: 8,
                    pcrResult: 15,
                    vsgResult: 35,
                    biologicoSelect: 'Ibuprofeno',
                    manifestacionesExtraarticulares: { uveitis: 'SI', psoriasis: 'NO', digestiva: 'SI' }
                },
                {
                    idPaciente: 'ESP-2024-007',
                    nombrePaciente: 'Miguel Ángel Fernández López',
                    sexoPaciente: 'Hombre',
                    fechaNacimiento: '1979-11-08',
                    diagnosticoPrimario: 'espa',
                    hlaB27: 'positivo',
                    fr: 'negativo',
                    apcc: 'negativo',
                    fechaVisita: '2024-03-15', // New visit
                    basdaiResult: 6.0,
                    asdasCrpResult: 3.0,
                    basfiResult: 5.8,
                    evaGlobal: 6,
                    evaDolor: 7,
                    pcrResult: 12,
                    vsgResult: 30,
                    biologicoSelect: 'Ibuprofeno',
                    manifestacionesExtraarticulares: { uveitis: 'SI', psoriasis: 'NO', digestiva: 'SI' }
                },
                {
                    idPaciente: 'ESP-2024-007',
                    nombrePaciente: 'Miguel Ángel Fernández López',
                    sexoPaciente: 'Hombre',
                    fechaNacimiento: '1979-11-08',
                    diagnosticoPrimario: 'espa',
                    hlaB27: 'positivo',
                    fr: 'negativo',
                    apcc: 'negativo',
                    fechaVisita: '2024-05-15',
                    basdaiResult: 4.5,
                    asdasCrpResult: 2.2,
                    basfiResult: 3.8,
                    evaGlobal: 4,
                    evaDolor: 4,
                    pcrResult: 8,
                    vsgResult: 20,
                    biologicoSelect: 'Adalimumab',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'NO', digestiva: 'NO' }
                },
                {
                    idPaciente: 'ESP-2024-007',
                    nombrePaciente: 'Miguel Ángel Fernández López',
                    sexoPaciente: 'Hombre',
                    fechaNacimiento: '1979-11-08',
                    diagnosticoPrimario: 'espa',
                    hlaB27: 'positivo',
                    fr: 'negativo',
                    apcc: 'negativo',
                    fechaVisita: '2024-08-20', // New visit
                    basdaiResult: 3.5,
                    asdasCrpResult: 1.8,
                    basfiResult: 3.0,
                    evaGlobal: 3,
                    evaDolor: 3,
                    pcrResult: 5,
                    vsgResult: 15,
                    biologicoSelect: 'Adalimumab',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'NO', digestiva: 'NO' }
                },
                {
                    idPaciente: 'ESP-2024-007',
                    nombrePaciente: 'Miguel Ángel Fernández López',
                    sexoPaciente: 'Hombre',
                    fechaNacimiento: '1979-11-08',
                    diagnosticoPrimario: 'espa',
                    hlaB27: 'positivo',
                    fr: 'negativo',
                    apcc: 'negativo',
                    fechaVisita: '2024-10-20',
                    basdaiResult: 2.8,
                    asdasCrpResult: 1.1,
                    basfiResult: 2.1,
                    evaGlobal: 2,
                    evaDolor: 2,
                    pcrResult: 3,
                    vsgResult: 10,
                    biologicoSelect: 'Adalimumab',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'NO', digestiva: 'NO' }
                },
                {
                    idPaciente: 'ESP-2024-007',
                    nombrePaciente: 'Miguel Ángel Fernández López',
                    sexoPaciente: 'Hombre',
                    fechaNacimiento: '1979-11-08',
                    diagnosticoPrimario: 'espa',
                    hlaB27: 'positivo',
                    fr: 'negativo',
                    apcc: 'negativo',
                    fechaVisita: '2025-03-25', // New visit
                    basdaiResult: 2.5,
                    asdasCrpResult: 1.0,
                    basfiResult: 2.0,
                    evaGlobal: 1,
                    evaDolor: 1,
                    pcrResult: 2,
                    vsgResult: 8,
                    biologicoSelect: 'Adalimumab',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'NO', digestiva: 'NO' }
                }
            ],
            treatmentHistory: [
                { startDate: '2024-01-10', endDate: '2024-02-29', name: 'Ibuprofeno', reason: 'Manejo inicial con AINE' },
                { startDate: '2024-03-01', endDate: '2024-05-14', name: 'Metotrexato', reason: 'Inicio FAME por actividad moderada' },
                { startDate: '2024-05-15', name: 'Adalimumab', reason: 'Cambio a biológico por actividad persistente' }
            ],
            keyEvents: [
                { date: '2024-01-10', type: 'flare', description: 'Brote severo con uveítis activa.' },
                { date: '2024-05-15', type: 'treatment', description: 'Inicio Adalimumab por respuesta insuficiente a AINE.' },
                { date: '2024-10-20', type: 'remission', description: 'Remisión clínica mantenida con BASDAI 2.8.' }
            ]
        },
        'ESP-2024-009': {
            summary: {
                idPaciente: 'ESP-2024-009',
                nombre: 'Sofía Delgado Martín',
                diagnosticoPrimario: 'espa',
                pathology: 'espa',
                ultimaVisita: '2024-09-30',
                tratamientoActual: 'Ixekizumab 80 mg cada 4 semanas'
            },
            pathology: 'espa',
            visits: [
                {
                    idPaciente: 'ESP-2024-009',
                    nombrePaciente: 'Sofía Delgado Martín',
                    sexoPaciente: 'Mujer',
                    fechaNacimiento: '1990-02-18',
                    diagnosticoPrimario: 'espa',
                    hlaB27: 'positivo',
                    fr: 'negativo',
                    apcc: 'negativo',
                    fechaVisita: '2024-03-28',
                    basdaiResult: 6.8,
                    asdasCrpResult: 3.2,
                    basfiResult: 5.6,
                    evaGlobal: 6,
                    evaDolor: 7,
                    biologicoSelect: 'Sulfasalazina',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'SI', digestiva: 'NO' }
                },
                {
                    idPaciente: 'ESP-2024-009',
                    nombrePaciente: 'Sofía Delgado Martín',
                    sexoPaciente: 'Mujer',
                    fechaNacimiento: '1990-02-18',
                    diagnosticoPrimario: 'espa',
                    hlaB27: 'positivo',
                    fr: 'negativo',
                    apcc: 'negativo',
                    fechaVisita: '2024-09-30',
                    basdaiResult: 3.4,
                    asdasCrpResult: 1.6,
                    basfiResult: 2.5,
                    evaGlobal: 3,
                    evaDolor: 3,
                    biologicoSelect: 'Ixekizumab',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'NO', digestiva: 'NO' }
                }
            ],
            treatmentHistory: [
                { startDate: '2024-03-28', endDate: '2024-06-15', name: 'Sulfasalazina', reason: 'FAME inicial' },
                { startDate: '2024-06-16', name: 'Ixekizumab', reason: 'Escalada por actividad persistente y psoriasis' }
            ],
            keyEvents: [
                { date: '2024-06-16', type: 'treatment', description: 'Inicio Ixekizumab por respuesta insuficiente a FAME convencional.' },
                { date: '2024-09-30', type: 'remission', description: 'Remisión clínica con BASDAI 3.4 y control cutáneo.' }
            ]
        },
        'ESP-2024-010': {
            summary: {
                idPaciente: 'ESP-2024-010',
                nombre: 'Andrés Molina Pérez',
                diagnosticoPrimario: 'espa',
                pathology: 'espa',
                ultimaVisita: '2024-11-12',
                tratamientoActual: 'Certolizumab 200 mg cada 2 semanas'
            },
            pathology: 'espa',
            visits: [
                {
                    idPaciente: 'ESP-2024-010',
                    nombrePaciente: 'Andrés Molina Pérez',
                    sexoPaciente: 'Hombre',
                    fechaNacimiento: '1984-08-07',
                    diagnosticoPrimario: 'espa',
                    hlaB27: 'negativo',
                    fr: 'negativo',
                    apcc: 'negativo',
                    fechaVisita: '2024-04-05',
                    basdaiResult: 5.9,
                    asdasCrpResult: 2.9,
                    basfiResult: 4.8,
                    evaGlobal: 6,
                    evaDolor: 6,
                    biologicoSelect: 'Certolizumab',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'NO', digestiva: 'SI' }
                },
                {
                    idPaciente: 'ESP-2024-010',
                    nombrePaciente: 'Andrés Molina Pérez',
                    sexoPaciente: 'Hombre',
                    fechaNacimiento: '1984-08-07',
                    diagnosticoPrimario: 'espa',
                    hlaB27: 'negativo',
                    fr: 'negativo',
                    apcc: 'negativo',
                    fechaVisita: '2024-11-12',
                    basdaiResult: 2.5,
                    asdasCrpResult: 1.4,
                    basfiResult: 2.2,
                    evaGlobal: 2,
                    evaDolor: 2,
                    biologicoSelect: 'Certolizumab',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'NO', digestiva: 'NO' }
                }
            ],
            treatmentHistory: [
                { startDate: '2024-04-05', name: 'Certolizumab', reason: 'Inicio biológico por lumbalgia inflamatoria y EII asociada' }
            ],
            keyEvents: [
                { date: '2024-07-20', type: 'flare', description: 'Reagudización digestiva leve, revisión con digestivo.' },
                { date: '2024-11-12', type: 'remission', description: 'Remisión clínica sostenida bajo Certolizumab.' }
            ]
        },
        'ESP-2024-008': {
            summary: {
                idPaciente: 'ESP-2024-008',
                nombre: 'Ana María Rodríguez Sanz',
                diagnosticoPrimario: 'espa',
                pathology: 'espa',
                ultimaVisita: '2024-08-12',
                tratamientoActual: 'Etanercept 50 mg semanal'
            },
            pathology: 'espa',
            visits: [
                {
                    idPaciente: 'ESP-2024-008',
                    nombrePaciente: 'Ana María Rodríguez Sanz',
                    sexoPaciente: 'Mujer',
                    fechaNacimiento: '1986-04-22',
                    diagnosticoPrimario: 'espa',
                    hlaB27: 'positivo',
                    fr: 'negativo',
                    apcc: 'no-analizado',
                    fechaVisita: '2024-02-05',
                    basdaiResult: 5.1,
                    asdasCrpResult: 2.7,
                    basfiResult: 4.3,
                    evaGlobal: 5,
                    evaDolor: 6,
                    biologicoSelect: 'Etanercept',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'SI', digestiva: 'NO' }
                },
                {
                    idPaciente: 'ESP-2024-008',
                    nombrePaciente: 'Ana María Rodríguez Sanz',
                    sexoPaciente: 'Mujer',
                    fechaNacimiento: '1986-04-22',
                    diagnosticoPrimario: 'espa',
                    hlaB27: 'positivo',
                    fr: 'negativo',
                    apcc: 'no-analizado',
                    fechaVisita: '2024-08-12',
                    basdaiResult: 3.2,
                    asdasCrpResult: 1.8,
                    basfiResult: 2.9,
                    evaGlobal: 3,
                    evaDolor: 3,
                    biologicoSelect: 'Etanercept',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'NO', digestiva: 'NO' }
                }
            ],
            treatmentHistory: [
                { startDate: '2024-02-05', name: 'Etanercept', reason: 'Inicio anti-TNF por actividad moderada y psoriasis' }
            ],
            keyEvents: [
                { date: '2024-02-05', type: 'treatment', description: 'Inicio Etanercept - buena respuesta cutánea.' },
                { date: '2024-08-12', type: 'remission', description: 'Mejoría global con BASDAI 3.2 y remisión cutánea.' }
            ]
        },
        'APS-2024-007': {
            summary: {
                idPaciente: 'APS-2024-007',
                nombre: 'Laura Pérez Domínguez',
                diagnosticoPrimario: 'aps',
                pathology: 'aps',
                ultimaVisita: '2024-09-18',
                tratamientoActual: 'Secukinumab 150 mg mensual'
            },
            pathology: 'aps',
            visits: [
                {
                    idPaciente: 'APS-2024-007',
                    nombrePaciente: 'Laura Pérez Domínguez',
                    sexoPaciente: 'Mujer',
                    fechaNacimiento: '1972-02-11',
                    diagnosticoPrimario: 'aps',
                    hlaB27: 'negativo',
                    fr: 'positivo',
                    apcc: 'positivo',
                    fechaVisita: '2024-03-03',
                    haqResult: 1.6,
                    leiResult: 12,
                    rapid3Result: 7.8,
                    evaGlobal: 6,
                    evaDolor: 6,
                    biologicoSelect: 'Secukinumab',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'SI', digestiva: 'NO' }
                },
                {
                    idPaciente: 'APS-2024-007',
                    nombrePaciente: 'Laura Pérez Domínguez',
                    sexoPaciente: 'Mujer',
                    fechaNacimiento: '1972-02-11',
                    diagnosticoPrimario: 'aps',
                    hlaB27: 'negativo',
                    fr: 'positivo',
                    apcc: 'positivo',
                    fechaVisita: '2024-09-18',
                    haqResult: 0.8,
                    leiResult: 6,
                    rapid3Result: 4.1,
                    evaGlobal: 3,
                    evaDolor: 3,
                    biologicoSelect: 'Secukinumab',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'NO', digestiva: 'NO' }
                }
            ],
            treatmentHistory: [
                { startDate: '2024-03-03', name: 'Secukinumab', reason: 'Inicio anti-IL17 por articulaciones periféricas activas' }
            ],
            keyEvents: [
                { date: '2024-05-22', type: 'flare', description: 'Brotes articulares leves controlados con corticoide oral.' },
                { date: '2024-09-18', type: 'remission', description: 'Remisión funcional y cutánea.' }
            ]
        },
        'APS-2024-008': {
            summary: {
                idPaciente: 'APS-2024-008',
                nombre: 'Javier Martín Castillo',
                diagnosticoPrimario: 'aps',
                pathology: 'aps',
                ultimaVisita: '2024-09-25',
                tratamientoActual: 'Ustekinumab 45 mg cada 12 semanas'
            },
            pathology: 'aps',
            visits: [
                {
                    idPaciente: 'APS-2024-008',
                    nombrePaciente: 'Javier Martín Castillo',
                    sexoPaciente: 'Hombre',
                    fechaNacimiento: '1983-06-18',
                    diagnosticoPrimario: 'aps',
                    hlaB27: 'negativo',
                    fr: 'positivo',
                    apcc: 'positivo',
                    fechaVisita: '2024-04-12',
                    haqResult: 1.5,
                    leiResult: 11,
                    rapid3Result: 8.3,
                    evaGlobal: 6,
                    evaDolor: 5,
                    biologicoSelect: 'Ustekinumab',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'SI', digestiva: 'NO' }
                },
                {
                    idPaciente: 'APS-2024-008',
                    nombrePaciente: 'Javier Martín Castillo',
                    sexoPaciente: 'Hombre',
                    fechaNacimiento: '1983-06-18',
                    diagnosticoPrimario: 'aps',
                    hlaB27: 'negativo',
                    fr: 'positivo',
                    apcc: 'positivo',
                    fechaVisita: '2024-09-25',
                    haqResult: 0.9,
                    leiResult: 5,
                    rapid3Result: 4.7,
                    evaGlobal: 3,
                    evaDolor: 3,
                    biologicoSelect: 'Ustekinumab',
                    manifestacionesExtraarticulares: { uveitis: 'NO', psoriasis: 'NO', digestiva: 'NO' }
                }
            ],
            treatmentHistory: [
                { startDate: '2024-04-12', name: 'Ustekinumab', reason: 'Anti-IL12/23 por psoriasis extensa y dactilitis' }
            ],
            keyEvents: [
                { date: '2024-04-12', type: 'treatment', description: 'Inicio Ustekinumab con monitorización dermatológica.' },
                { date: '2024-09-25', type: 'remission', description: 'Excelente respuesta clínica y cutánea.' }
            ]
        }
    };

    window.MockPatients = {
        list() {
            return Object.values(PATIENTS).map(patient => clone(patient.summary));
        },
        getById(id) {
            const patient = PATIENTS[id];
            return patient ? clone(patient) : null;
        },
        search(term) {
            const query = normalize(term);
            if (!query) return [];
            return Object.values(PATIENTS)
                .map(entry => entry.summary)
                .filter(summary => {
                    const idNormalized = normalize(summary.idPaciente);
                    const nameNormalized = normalize(summary.nombre);
                    return idNormalized.includes(query) || nameNormalized.includes(query);
                })
                .map(clone);
        }
    };

    console.log('✅ MockPatients API disponible (6 pacientes de ejemplo).');
})();
