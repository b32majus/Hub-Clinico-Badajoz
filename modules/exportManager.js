// Módulo Export Manager - Para exportación de datos
// Este archivo contendrá la lógica para exportar datos en diferentes formatos
// ACTUALIZACIÓN: Patrón clásico (sin import/export) + eliminación de duplicado mostrarNotificacion

/**
 * Funciones helper para expandir datos del homúnculus en columnas individuales
 */
function expandirArticulaciones(array) {
    const ARTICULATIONS = [
        'hombro-derecho', 'hombro-izquierdo', 'codo-derecho', 'codo-izquierdo',
        'muneca-derecha', 'muneca-izquierda', 'rodilla-derecha', 'rodilla-izquierda',
        'mcf1-derecha', 'mcf2-derecha', 'mcf3-derecha', 'mcf4-derecha', 'mcf5-derecha',
        'mcf1-izquierda', 'mcf2-izquierda', 'mcf3-izquierda', 'mcf4-izquierda', 'mcf5-izquierda',
        'ifp1-derecha', 'ifp2-derecha', 'ifp3-derecha', 'ifp4-derecha', 'ifp5-derecha',
        'ifp1-izquierda', 'ifp2-izquierda', 'ifp3-izquierda', 'ifp4-izquierda', 'ifp5-izquierda'
    ];
    return ARTICULATIONS.map(art => (array || []).includes(art) ? 'SI' : 'NO');
}

function expandirDactilitis(array) {
    const DACTILITIS = [
        'dactilitis-dedo1-mano-derecha', 'dactilitis-dedo2-mano-derecha', 'dactilitis-dedo3-mano-derecha',
        'dactilitis-dedo4-mano-derecha', 'dactilitis-dedo5-mano-derecha',
        'dactilitis-dedo1-mano-izquierda', 'dactilitis-dedo2-mano-izquierda', 'dactilitis-dedo3-mano-izquierda',
        'dactilitis-dedo4-mano-izquierda', 'dactilitis-dedo5-mano-izquierda',
        'dactilitis-dedo1-pie-derecho', 'dactilitis-dedo2-pie-derecho', 'dactilitis-dedo3-pie-derecho',
        'dactilitis-dedo4-pie-derecho', 'dactilitis-dedo5-pie-derecho',
        'dactilitis-dedo1-pie-izquierdo', 'dactilitis-dedo2-pie-izquierdo', 'dactilitis-dedo3-pie-izquierdo',
        'dactilitis-dedo4-pie-izquierdo', 'dactilitis-dedo5-pie-izquierdo'
    ];
    return DACTILITIS.map(dedo => (array || []).includes(dedo) ? 'SI' : 'NO');
}

function generarFilaCSV_EspA_PrimeraVisita(datos) {
    // Contrato de Datos Definitivo - Cada opción múltiple en su propia columna
    const valores = [
        datos.idPaciente || '',
        datos.nombrePaciente || '',
        datos.sexoPaciente || '',
        datos.fechaVisita || '',
        'Primera Visita', // Tipo_Visita
        datos.profesional || '',
        datos.diagnosticoPrimario || '',
        datos.diagnosticoSecundario || '',
        datos.hlaB27 || '',
        '', // FR vacío para EspA
        '', // aPCC vacío para EspA
        datos.inicioSintomas || '',
        '', // inicioPsoriasis vacío para EspA
        datos.dolorAxial || '',
        datos.rigidezMatutina || '',
        datos.duracionRigidez || '',
        datos.irradiacionNalgas || '',
        '', // clinicaAxialPresente vacío para EspA
        // Articulaciones NAD expandidas (30)
        ...expandirArticulaciones(datos.nad),
        // Articulaciones NAT expandidas (30)
        ...expandirArticulaciones(datos.nat),
        // Dactilitis expandida (20)
        ...expandirDactilitis(datos.dactilitis),
        // Totales
        datos.nad?.length || 0,
        datos.nat?.length || 0,
        datos.dactilitis?.length || 0,
        datos.peso || '',
        datos.talla || '',
        datos.imc || '',
        datos.ta || '',
        // PROs (5 campos vacíos para primera visita)
        '', '', '', '', '',
        // Afectación de Psoriasis (expandido) - todos NO para EspA
        'NO', 'NO', 'NO', 'NO', 'NO',
        // Clínica Extra-articular (expandido)
        datos.extraArticular ? datos.extraArticular['digestiva'] || 'NO' : 'NO',
        datos.extraArticular ? datos.extraArticular['uveitis'] || 'NO' : 'NO',
        'NO', // psoriasis siempre NO para EspA
        // Comorbilidades (expandido)
        datos.comorbilidad ? datos.comorbilidad['hta'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['dm'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['dlp'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['ecv'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['gastritis'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['obesidad'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['osteoporosis'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['gota'] || 'NO' : 'NO',
        // Antecedentes Familiares (expandido)
        datos.antecedentesFamiliares ? datos.antecedentesFamiliares['psoriasis'] || 'NO' : 'NO',
        datos.antecedentesFamiliares ? datos.antecedentesFamiliares['artritis'] || 'NO' : 'NO',
        datos.antecedentesFamiliares ? datos.antecedentesFamiliares['eii'] || 'NO' : 'NO',
        datos.antecedentesFamiliares ? datos.antecedentesFamiliares['uveitis'] || 'NO' : 'NO',
        // Tóxicos (expandido)
        datos.toxicos ? datos.toxicos['tabaco'] || 'NO' : 'NO',
        datos.toxicos ? datos.toxicos['tabaco_desc'] || '' : '',
        datos.toxicos ? datos.toxicos['alcohol'] || 'NO' : 'NO',
        datos.toxicos ? datos.toxicos['alcohol_desc'] || '' : '',
        datos.toxicos ? datos.toxicos['drogas'] || 'NO' : 'NO',
        datos.toxicos ? datos.toxicos['drogas_desc'] || '' : '',
        // Entesitis (expandido)
        datos.entesitis ? datos.entesitis['aquiles-der'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['fascia-der'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['epicondilo-lat-der'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['epicondilo-med-der'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['trocanter-der'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['aquiles-izq'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['fascia-izq'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['epicondilo-lat-izq'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['epicondilo-med-izq'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['trocanter-izq'] || 'NO' : 'NO',
        datos.otrasEntesitis || '',
        // Pruebas complementarias (5 campos vacíos)
        '', '', '', '', '',
        // BASDAI (7 campos vacíos)
        '', '', '', '', '', '', '',
        // ASDAS (5 campos vacíos)
        '', '', '', '', '',
        // Metrología (6 campos vacíos)
        '', '', '', '', '', '',
        // Evaluación Psoriasis (3 campos vacíos)
        '', '', '',
        // HAQ-DI (9 campos vacíos)
        '', '', '', '', '', '', '', '', '',
        // LEI (7 campos vacíos)
        '', '', '', '', '', '', '',
        // MDA (8 campos vacíos)
        '', '', '', '', '', '', '', '',
        // RAPID3 (4 campos vacíos)
        '', '', '', '',
        // Tratamiento Actual (3 campos)
        'Primera Visita', // Tratamiento_Actual como tipo visita para referencia
        '', // Fecha_Inicio_Tratamiento (vacío)
        '', // Decision_Terapeutica (vacío)
        // Continuar Tratamiento (2 campos vacíos)
        '', '',
        // Cambio Tratamiento (9 campos vacíos - se usan 9 de 12 en el conteo original)
        '', '', '', '', '', '', '', '', '',
        // Tratamientos iniciales
        datos.sistemicoSelect || '',
        datos.sistemicoDose || '',
        datos.fameSelect || '',
        datos.fameDose || '',
        datos.biologicoSelect || '',
        datos.biologicoDose || '',
        datos.fechaProximaRevision || '',
        datos.comentariosAdicionales || ''
    ];

    return valores.join('\t');
}

/**
 * Función especializada para generar fila CSV de primera visita para APs
 */
function generarFilaCSV_APs_PrimeraVisita(datos) {
    // Contrato de Datos Definitivo - Cada opción múltiple en su propia columna
    const valores = [
        datos.idPaciente || '',
        datos.nombrePaciente || '',
        datos.sexoPaciente || '',
        datos.fechaVisita || '',
        'Primera Visita', // Tipo_Visita
        datos.profesional || '',
        datos.diagnosticoPrimario || '',
        datos.diagnosticoSecundario || '',
        datos.hlaB27 || '',
        datos.fr || '',
        datos.apcc || '',
        datos.inicioSintomas || '',
        datos.inicioPsoriasis || '',
        datos.dolorAxial || '',
        datos.rigidezMatutina || '',
        datos.duracionRigidez || '',
        datos.irradiacionNalgas || '',
        datos.clinicaAxialPresente || '',
        // Articulaciones NAD expandidas (30)
        ...expandirArticulaciones(datos.nad),
        // Articulaciones NAT expandidas (30)
        ...expandirArticulaciones(datos.nat),
        // Dactilitis expandida (20)
        ...expandirDactilitis(datos.dactilitis),
        // Totales
        datos.nad?.length || 0,
        datos.nat?.length || 0,
        datos.dactilitis?.length || 0,
        datos.peso || '',
        datos.talla || '',
        datos.imc || '',
        datos.ta || '',
        // PROs (5 campos vacíos para primera visita)
        '', '', '', '', '',
        // Afectación de Psoriasis (expandido)
        datos.afectacionPsoriasis ? datos.afectacionPsoriasis['cuero-cabelludo'] || 'NO' : 'NO',
        datos.afectacionPsoriasis ? datos.afectacionPsoriasis['ungueal'] || 'NO' : 'NO',
        datos.afectacionPsoriasis ? datos.afectacionPsoriasis['extensora'] || 'NO' : 'NO',
        datos.afectacionPsoriasis ? datos.afectacionPsoriasis['pliegues'] || 'NO' : 'NO',
        datos.afectacionPsoriasis ? datos.afectacionPsoriasis['palmoplantar'] || 'NO' : 'NO',
        // Clínica Extra-articular (expandido)
        datos.extraArticular ? datos.extraArticular['digestiva'] || 'NO' : 'NO',
        datos.extraArticular ? datos.extraArticular['uveitis'] || 'NO' : 'NO',
        datos.extraArticular ? datos.extraArticular['psoriasis'] || 'NO' : 'NO',
        // Comorbilidades (expandido)
        datos.comorbilidad ? datos.comorbilidad['hta'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['dm'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['dlp'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['ecv'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['gastritis'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['obesidad'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['osteoporosis'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['gota'] || 'NO' : 'NO',
        // Antecedentes Familiares (expandido)
        datos.antecedentesFamiliares ? datos.antecedentesFamiliares['psoriasis'] || 'NO' : 'NO',
        datos.antecedentesFamiliares ? datos.antecedentesFamiliares['artritis'] || 'NO' : 'NO',
        datos.antecedentesFamiliares ? datos.antecedentesFamiliares['eii'] || 'NO' : 'NO',
        datos.antecedentesFamiliares ? datos.antecedentesFamiliares['uveitis'] || 'NO' : 'NO',
        // Tóxicos (expandido)
        datos.toxicos ? datos.toxicos['tabaco'] || 'NO' : 'NO',
        datos.toxicos ? datos.toxicos['tabaco_desc'] || '' : '',
        datos.toxicos ? datos.toxicos['alcohol'] || 'NO' : 'NO',
        datos.toxicos ? datos.toxicos['alcohol_desc'] || '' : '',
        datos.toxicos ? datos.toxicos['drogas'] || 'NO' : 'NO',
        datos.toxicos ? datos.toxicos['drogas_desc'] || '' : '',
        // Entesitis (expandido)
        datos.entesitis ? datos.entesitis['aquiles-der'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['fascia-der'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['epicondilo-lat-der'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['epicondilo-med-der'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['trocanter-der'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['aquiles-izq'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['fascia-izq'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['epicondilo-lat-izq'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['epicondilo-med-izq'] || 'NO' : 'NO',
        datos.entesitis ? datos.entesitis['trocanter-izq'] || 'NO' : 'NO',
        datos.otrasEntesitis || '',
        // Pruebas complementarias (5 campos vacíos)
        '', '', '', '', '',
        // BASDAI (7 campos vacíos)
        '', '', '', '', '', '', '',
        // ASDAS (5 campos vacíos)
        '', '', '', '', '',
        // Metrología (6 campos vacíos)
        '', '', '', '', '', '',
        // Evaluación Psoriasis (3 campos vacíos)
        '', '', '',
        // HAQ-DI (9 campos vacíos)
        '', '', '', '', '', '', '', '', '',
        // LEI (7 campos vacíos)
        '', '', '', '', '', '', '',
        // MDA (8 campos vacíos)
        '', '', '', '', '', '', '', '',
        // RAPID3 (4 campos vacíos)
        '', '', '', '',
        // Tratamiento Actual (3 campos)
        'Primera Visita', // Tratamiento_Actual como tipo visita para referencia
        '', // Fecha_Inicio_Tratamiento (vacío)
        '', // Decision_Terapeutica (vacío)
        // Continuar Tratamiento (2 campos vacíos)
        '', '',
        // Cambio Tratamiento (9 campos vacíos)
        '', '', '', '', '', '', '', '', '',
        // Tratamientos iniciales
        datos.sistemicoSelect || '',
        datos.sistemicoDose || '',
        datos.fameSelect || '',
        datos.fameDose || '',
        datos.biologicoSelect || '',
        datos.biologicoDose || '',
        datos.fechaProximaRevision || '',
        datos.comentariosAdicionales || ''
    ];

    return valores.join('\t');
}

/**
 * Función especializada para generar fila CSV de seguimiento para EspA
 */
function generarFilaCSV_EspA_Seguimiento(datos) {
    // Contrato de Datos Definitivo - Cada opción múltiple en su propia columna
    const valores = [
        datos.idPaciente || '',
        datos.nombrePaciente || '',
        datos.sexoPaciente || '',
        datos.fechaVisita || '',
        'Seguimiento', // Tipo_Visita
        datos.profesional || '',
        datos.diagnosticoPrimario || '',
        datos.diagnosticoSecundario || '',
        '', // HLA_B27 vacío para seguimiento
        '', // FR vacío para EspA
        '', // aPCC vacío para EspA
        // Anamnesis inicial (7 campos vacíos para seguimiento)
        '', '', '', '', '', '', '',
        // Articulaciones NAD expandidas (30)
        ...expandirArticulaciones(datos.nad),
        // Articulaciones NAT expandidas (30)
        ...expandirArticulaciones(datos.nat),
        // Dactilitis expandida (20)
        ...expandirDactilitis(datos.dactilitis),
        // Totales
        datos.nad?.length || 0,
        datos.nat?.length || 0,
        datos.dactilitis?.length || 0,
        datos.peso || '',
        datos.talla || '',
        datos.imc || '',
        datos.ta || '',
        // PROs - Patient Reported Outcomes (5 campos)
        datos.evaGlobal || '',
        datos.evaDolor || '',
        datos.evaFatiga || '',
        datos.rigidezMatutinaMin || '',
        datos.dolorNocturno ? 'SI' : 'NO',
        // Afectación de Psoriasis (5 campos vacíos para seguimiento EspA)
        '', '', '', '', '',
        // Manifestaciones Extraarticulares (expandido)
        datos.manifestacionesExtraarticulares ? datos.manifestacionesExtraarticulares['digestiva'] || 'NO' : 'NO',
        datos.manifestacionesExtraarticulares ? datos.manifestacionesExtraarticulares['uveitis'] || 'NO' : 'NO',
        'NO', // psoriasis siempre NO para EspA
        // Comorbilidades (expandido)
        datos.comorbilidad ? datos.comorbilidad['hta'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['dm'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['dlp'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['ecv'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['gastritis'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['obesidad'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['osteoporosis'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['gota'] || 'NO' : 'NO',
        // Antecedentes Familiares (4 campos vacíos para seguimiento)
        '', '', '', '',
        // Tóxicos (6 campos vacíos para seguimiento)
        '', '', '', '', '', '',
        // Entesitis (11 campos vacíos para seguimiento)
        '', '', '', '', '', '', '', '', '', '', '',
        // Pruebas complementarias
        datos.pcr || '',
        datos.vsg || '',
        datos.otrosHallazgosAnalitica || '',
        datos.hallazgosRadiografia || '',
        datos.hallazgosRMN || '',
        // BASDAI
        datos.basdaiP1 || '',
        datos.basdaiP2 || '',
        datos.basdaiP3 || '',
        datos.basdaiP4 || '',
        datos.basdaiP5 || '',
        datos.basdaiP6 || '',
        datos.basdaiResult || '',
        // ASDAS
        datos.asdasDolorEspalda || '',
        datos.asdasDuracionRigidez || '',
        datos.asdasEvaGlobal || '',
        datos.asdasCrpResult || '',
        datos.asdasEsrResult || '',
        // Metrología
        datos.schober || '',
        datos.rotacionCervical || '',
        datos.distanciaOP || '',
        datos.distanciaTP || '',
        datos.expansionToracica || '',
        datos.distanciaIntermaleolar || '',
        // Evaluación Psoriasis (3 campos vacíos)
        '', '', '',
        // HAQ-DI (9 campos vacíos)
        '', '', '', '', '', '', '', '', '',
        // LEI (7 campos vacíos)
        '', '', '', '', '', '', '',
        // MDA (8 campos vacíos)
        '', '', '', '', '', '', '', '',
        // RAPID3 (4 campos vacíos)
        '', '', '', '',
        // Tratamiento Actual (3 campos)
        datos.tratamientoActual || '',
        datos.fechaInicioTratamiento || '',
        datos.decisionTerapeutica || '',
        // Tratamiento (continuar)
        datos.decisionTerapeutica === 'continuar' ? (datos.tratamientoData?.continuar?.adherencia || '') : '',
        datos.decisionTerapeutica === 'continuar' ? (datos.tratamientoData?.continuar?.ajusteTerapeutico || '') : '',
        // Tratamiento (cambio)
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.motivoCambio || '') : '',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.efectosAdversos ? 'SI' : 'NO') : 'NO',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.descripcionEfectos || '') : '',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.sistemicos?.farmaco || '') : '',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.sistemicos?.dosis || '') : '',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.fames?.farmaco || '') : '',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.fames?.dosis || '') : '',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.biologicos?.farmaco || '') : '',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.biologicos?.dosis || '') : '',
        // Tratamientos iniciales (6 campos vacíos para seguimiento)
        '', '', '', '', '', '',
        // Fechas y comentarios
        datos.fechaProximaRevision || '',
        datos.comentariosAdicionales || ''
    ];

    return valores.join('\t');
}

/**
 * Función especializada para generar fila CSV de seguimiento para APs
 */
function generarFilaCSV_APs_Seguimiento(datos) {
    // Contrato de Datos Definitivo - Cada opción múltiple en su propia columna
    const valores = [
        datos.idPaciente || '',
        datos.nombrePaciente || '',
        datos.sexoPaciente || '',
        datos.fechaVisita || '',
        'Seguimiento', // Tipo_Visita
        datos.profesional || '',
        datos.diagnosticoPrimario || '',
        datos.diagnosticoSecundario || '',
        '', // HLA_B27 vacío para seguimiento
        datos.fr || '',
        datos.apcc || '',
        // Anamnesis inicial (7 campos vacíos para seguimiento)
        '', '', '', '', '', '', '',
        // Articulaciones NAD expandidas (30)
        ...expandirArticulaciones(datos.nad),
        // Articulaciones NAT expandidas (30)
        ...expandirArticulaciones(datos.nat),
        // Dactilitis expandida (20)
        ...expandirDactilitis(datos.dactilitis),
        // Totales
        datos.nad?.length || 0,
        datos.nat?.length || 0,
        datos.dactilitis?.length || 0,
        datos.peso || '',
        datos.talla || '',
        datos.imc || '',
        datos.ta || '',
        // PROs - Patient Reported Outcomes (5 campos)
        datos.evaGlobal || '',
        datos.evaDolor || '',
        datos.evaFatiga || '',
        datos.rigidezMatutinaMin || '',
        datos.dolorNocturno ? 'SI' : 'NO',
        // Afectación de Psoriasis (5 campos vacíos para seguimiento APs)
        '', '', '', '', '',
        // Manifestaciones Extraarticulares (expandido)
        datos.manifestacionesExtraarticulares ? datos.manifestacionesExtraarticulares['digestiva'] || 'NO' : 'NO',
        datos.manifestacionesExtraarticulares ? datos.manifestacionesExtraarticulares['uveitis'] || 'NO' : 'NO',
        datos.manifestacionesExtraarticulares ? datos.manifestacionesExtraarticulares['psoriasis'] || 'NO' : 'NO',
        // Comorbilidades (expandido)
        datos.comorbilidad ? datos.comorbilidad['hta'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['dm'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['dlp'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['ecv'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['gastritis'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['obesidad'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['osteoporosis'] || 'NO' : 'NO',
        datos.comorbilidad ? datos.comorbilidad['gota'] || 'NO' : 'NO',
        // Antecedentes Familiares (4 campos vacíos para seguimiento)
        '', '', '', '',
        // Tóxicos (6 campos vacíos para seguimiento)
        '', '', '', '', '', '',
        // Entesitis (11 campos vacíos para seguimiento)
        '', '', '', '', '', '', '', '', '', '', '',
        // Pruebas complementarias
        datos.pcr || '',
        datos.vsg || '',
        datos.otrosHallazgosAnalitica || '',
        datos.hallazgosRadiografia || '',
        datos.hallazgosRMN || '',
        // BASDAI (7 campos vacíos para APs)
        '', '', '', '', '', '', '',
        // ASDAS
        datos.asdasDolorEspalda || '',
        datos.asdasDuracionRigidez || '',
        datos.asdasEvaGlobal || '',
        datos.asdasCrpResult || '',
        datos.asdasEsrResult || '',
        // Metrología (6 campos vacíos para APs)
        '', '', '', '', '', '',
        // Evaluación Psoriasis (3 campos)
        datos.pasiScore || '',
        datos.bsaPercentage || '',
        datos.psoriasisDescripcion || '',
        // HAQ-DI (9 campos)
        datos.haqVestirse || '',
        datos.haqLevantarse || '',
        datos.haqComer || '',
        datos.haqCaminar || '',
        datos.haqHigiene || '',
        datos.haqAlcanzar || '',
        datos.haqAgarrar || '',
        datos.haqActividades || '',
        datos.haqTotal || '',
        // LEI (7 campos)
        datos.leiEpicondiloLatIzq || '',
        datos.leiEpicondiloLatDer || '',
        datos.leiEpicondiloMedIzq || '',
        datos.leiEpicondiloMedDer || '',
        datos.leiAquilesIzq || '',
        datos.leiAquilesDer || '',
        datos.leiScore || '',
        // MDA (8 campos)
        datos.mdaNAT || '',
        datos.mdaNAD || '',
        datos.mdaPASI || '',
        datos.mdaDolor || '',
        datos.mdaGlobal || '',
        datos.mdaHAQ || '',
        datos.mdaEntesitis || '',
        datos.mdaCumple ? 'SI' : 'NO',
        // RAPID3 (4 campos)
        datos.rapid3Funcion || '',
        datos.rapid3Dolor || '',
        datos.rapid3Global || '',
        datos.rapid3Score || '',
        // Tratamiento Actual (3 campos)
        datos.tratamientoActual || '',
        datos.fechaInicioTratamiento || '',
        datos.decisionTerapeutica || '',
        // Tratamiento (continuar)
        datos.decisionTerapeutica === 'continuar' ? (datos.tratamientoData?.continuar?.adherencia || '') : '',
        datos.decisionTerapeutica === 'continuar' ? (datos.tratamientoData?.continuar?.ajusteTerapeutico || '') : '',
        // Tratamiento (cambio)
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.motivoCambio || '') : '',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.efectosAdversos ? 'SI' : 'NO') : 'NO',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.descripcionEfectos || '') : '',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.sistemicos?.farmaco || '') : '',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.sistemicos?.dosis || '') : '',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.fames?.farmaco || '') : '',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.fames?.dosis || '') : '',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.biologicos?.farmaco || '') : '',
        datos.decisionTerapeutica === 'cambiar' ? (datos.tratamientoData?.cambio?.biologicos?.dosis || '') : '',
        // Tratamientos iniciales (6 campos vacíos para seguimiento)
        '', '', '', '', '', '',
        // Fechas y comentarios
        datos.fechaProximaRevision || '',
        datos.comentariosAdicionales || ''
    ];

    return valores.join('\t');
}

/**
 * Función orquestadora para exportar y copiar datos CSV al portapapeles
 * @param {Object} datos - Datos del formulario
 * @param {string} tipoVisita - Tipo de visita ('primera' o 'seguimiento')
 * @param {string} diagnostico - Diagnóstico principal ('espa', 'aps')
 */
function exportarYCopiarCSV(datos, tipoVisita, diagnostico) {
    console.log('📊 Iniciando exportación CSV:', { tipoVisita, diagnostico });
    
    try {
        // Validar parámetros
        if (!datos || typeof datos !== 'object') {
            throw new Error('Datos de formulario inválidos');
        }
        
        if (!tipoVisita || !diagnostico) {
            throw new Error('Faltan parámetros requeridos: tipoVisita y diagnostico');
        }
        
        let csvData = '';
        let hojaExcel = '';
        
        // Determinar qué función especializada usar según el tipo de visita y diagnóstico
        if (tipoVisita === 'primera') {
            switch (diagnostico) {
                case 'espa':
                    csvData = generarFilaCSV_EspA_PrimeraVisita(datos);
                    hojaExcel = 'ESPA';
                    break;
                case 'aps':
                    csvData = generarFilaCSV_APs_PrimeraVisita(datos);
                    hojaExcel = 'APS';
                    break;
                default:
                    throw new Error(`Diagnóstico no reconocido para primera visita: ${diagnostico}`);
            }
        } else if (tipoVisita === 'seguimiento') {
            switch (diagnostico) {
                case 'espa':
                    csvData = generarFilaCSV_EspA_Seguimiento(datos);
                    hojaExcel = 'ESPA';
                    break;
                case 'aps':
                    csvData = generarFilaCSV_APs_Seguimiento(datos);
                    hojaExcel = 'APS';
                    break;
                default:
                    throw new Error(`Diagnóstico no reconocido para seguimiento: ${diagnostico}`);
            }
        } else {
            throw new Error(`Tipo de visita no reconocido: ${tipoVisita}`);
        }
        
        if (!csvData || csvData.trim() === '') {
            throw new Error('No se pudieron generar datos CSV');
        }
        
        console.log(`📋 CSV generado para hoja: ${hojaExcel}`);
        
        // Copiar al portapapeles con manejo de errores mejorado
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
            throw new Error('API de portapapeles no disponible en este navegador');
        }
        
        navigator.clipboard.writeText(csvData).then(() => {
            console.log('✓ Datos copiados al portapapeles');
            
            // Mostrar notificación dinámica de éxito
            if (typeof HubTools !== 'undefined' && HubTools.utils && HubTools.utils.mostrarNotificacion) {
                HubTools.utils.mostrarNotificacion(`Datos copiados al portapapeles. Pega en la hoja: ${hojaExcel}`, 'success');
            } else {
                alert(`Datos copiados al portapapeles. Pega en la hoja: ${hojaExcel}`);
            }
        }).catch(err => {
            console.error('❌ Error al copiar al portapapeles:', err);
            if (typeof HubTools !== 'undefined' && HubTools.utils && typeof HubTools.utils.mostrarNotificacion === 'function') {
                HubTools.utils.mostrarNotificacion('Error al copiar los datos al portapapeles.', 'error');
            } else {
                alert('Error al copiar los datos al portapapeles.');
            }
        });
        
    } catch (error) {
        console.error('❌ Error en exportarYCopiarCSV:', error);
        
        // Intentar mostrar notificación de error
        if (typeof HubTools !== 'undefined' && HubTools.utils && typeof HubTools.utils.mostrarNotificacion === 'function') {
            HubTools.utils.mostrarNotificacion(`Error al exportar CSV: ${error.message}`, 'error');
        } else {
            alert(`Error al exportar CSV: ${error.message}`);
        }
        return false;
    }
}

/**
 * Genera el texto de la nota clínica formateada
 * @param {Object} datos - Datos del formulario
 * @returns {string} - Nota clínica formateada
 */
function generarNotaClinica(datos) {
    let texto = '═══════════════════════════════════════════════════\n';
    texto += '        HISTORIA CLÍNICA REUMATOLÓGICA\n';
    texto += '═══════════════════════════════════════════════════\n\n';

    // DATOS DEL PACIENTE
    texto += '▓▓▓ DATOS DEL PACIENTE ▓▓▓\n';
    texto += `ID Paciente: ${datos.idPaciente || 'N/A'}\n`;
    texto += `Nombre: ${datos.nombrePaciente || 'N/A'}\n`;
    texto += `Fecha de Visita: ${datos.fechaVisita || 'N/A'}\n`;
    texto += `Profesional: ${datos.profesional || 'N/A'}\n\n`;

    // DIAGNÓSTICO
    texto += '▓▓▓ DIAGNÓSTICO ▓▓▓\n';
    texto += `Diagnóstico Primario: ${datos.diagnosticoPrimario || 'N/A'}\n`;
    if (datos.diagnosticoSecundario) {
        texto += `Diagnóstico Secundario: ${datos.diagnosticoSecundario}\n`;
    }
    texto += '\n';

    // EVALUACIÓN DE ACTIVIDAD (si existe)
    if (datos.evaGlobal || datos.evaDolor || datos.basdai || datos.asdasCrp) {
        texto += '▓▓▓ EVALUACIÓN DE ACTIVIDAD ▓▓▓\n';
        if (datos.evaGlobal) texto += `EVA Global: ${datos.evaGlobal}\n`;
        if (datos.evaDolor) texto += `EVA Dolor: ${datos.evaDolor}\n`;
        if (datos.basdai) texto += `BASDAI: ${datos.basdai}\n`;
        if (datos.asdasCrp) texto += `ASDAS-CRP: ${datos.asdasCrp}\n`;
        texto += '\n';
    }

    // TRATAMIENTO (si existe)
    if (datos.tratamientoActual) {
        texto += '▓▓▓ TRATAMIENTO ▓▓▓\n';
        texto += `Tratamiento Actual: ${datos.tratamientoActual}\n`;
        if (datos.fechaInicioTratamiento) {
            texto += `Fecha de Inicio: ${datos.fechaInicioTratamiento}\n`;
        }
        texto += '\n';
    }

    // COMENTARIOS (si existen)
    if (datos.comentariosAdicionales) {
        texto += '▓▓▓ COMENTARIOS ADICIONALES ▓▓▓\n';
        texto += `${datos.comentariosAdicionales}\n\n`;
    }

    texto += '═══════════════════════════════════════════════════\n';
    texto += `Generado el ${new Date().toLocaleString('es-ES')}\n`;
    texto += '═══════════════════════════════════════════════════\n';

    return texto;
}

/**
 * Genera y gestiona la exportación de una nota clínica en formato texto.
 * Intenta copiar el texto al portapapeles automáticamente. Si falla,
 * abre un modal para permitir la copia manual. Si el modal no está disponible,
 * ofrece la descarga del texto como un archivo .txt.
 * @param {Object} datos - Datos recopilados del formulario
 */
function exportarTXT(datos) {
    console.log('📄 === INICIANDO EXPORTAR TXT ===');
    console.log('📊 Datos recibidos:', datos);
    
    try {
        // Validar datos de entrada
        if (!datos || typeof datos !== 'object') {
            throw new Error('Datos de formulario inválidos');
        }
        
        // Generar el texto formateado
        const texto = generarNotaClinica(datos);
        console.log('📝 Texto generado:', texto.substring(0, 100) + '...');
        
        if (!texto || texto.trim() === '') {
            throw new Error('No se pudo generar el texto de la historia clínica');
        }
        
        // Intentar copiar al portapapeles automáticamente
        navigator.clipboard.writeText(texto).then(() => {
            console.log('✓ Historia clínica copiada al portapapeles.');
            if (typeof HubTools !== 'undefined' && HubTools.utils && typeof HubTools.utils.mostrarNotificacion === 'function') {
                HubTools.utils.mostrarNotificacion('Historia clínica copiada al portapapeles.', 'success');
            } else {
                alert('Historia clínica copiada al portapapeles.');
            }
        }).catch(err => {
            console.error('❌ Error al copiar al portapapeles automáticamente:', err);
            
            // Fallback: Mostrar en modal para copia manual
            if (typeof HubTools !== 'undefined' && HubTools.form && typeof HubTools.form.mostrarModalTexto === 'function') {
                console.warn('⚠ Fallo en copia automática. Mostrando en modal para copia manual.');
                const tituloModal = "Historia Clínica Generada - Copia Manual";
                const mensajeModal = "No se pudo copiar automáticamente al portapapeles. Puedes copiar el texto manualmente desde aquí:";
                HubTools.form.mostrarModalTexto(texto, tituloModal, mensajeModal);
                
                if (typeof HubTools.utils.mostrarNotificacion === 'function') {
                    HubTools.utils.mostrarNotificacion('No se pudo copiar automáticamente. Puedes copiarla manualmente desde el modal.', 'info');
                }
            } else {
                // Fallback robusto final: descargar como archivo .txt si el modal tampoco está disponible
                console.warn('⚠ Ni copia automática ni modal disponibles. Usando fallback de descarga...');
                if (typeof HubTools !== 'undefined' && HubTools.utils && typeof HubTools.utils.mostrarNotificacion === 'function') {
                    HubTools.utils.mostrarNotificacion('Error al copiar. Se descargará la historia clínica.', 'error');
                } else {
                    alert('Error al copiar. Se descargará la historia clínica.');
                }
                
                const timestamp = new Date().getTime();
                const filename = `historia_clinica_${datos.idPaciente || 'paciente'}_${timestamp}.txt`;
                
                const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                setTimeout(() => URL.revokeObjectURL(url), 100);
            }
        });
    } catch (error) {
        console.error('❌ Error en exportarTXT (generación de texto):', error);
        
        // Intentar mostrar notificación de error
        if (typeof HubTools !== 'undefined' && HubTools.utils && typeof HubTools.utils.mostrarNotificacion === 'function') {
            HubTools.utils.mostrarNotificacion(`Error al generar o exportar historia clínica: ${error.message}`, 'error');
        } else {
            alert(`Error al generar o exportar historia clínica: ${error.message}`);
        }
    }
}



function exportCohortToCSV(cohortData) {

    if (!cohortData || cohortData.length === 0) {

        HubTools.utils.mostrarNotificacion('No hay datos en la cohorte para exportar.', 'warning');

        return;

    }



    // 1. Definir las cabeceras del CSV

    const headers = [

        'ID_Paciente', 'Patologia', 'Sexo', 'Edad', 'Fecha_Visita',

        'BASDAI', 'ASDAS', 'HAQ', 'Tratamiento_Actual'

    ];

    const csvRows = [headers.join(',')];



    // 2. Iterar sobre la cohorte para crear cada fila del CSV

    cohortData.forEach(patient => {

        const row = [

            patient.ID_Paciente,

            patient.pathology,

            patient.Sexo,

            HubTools.utils.calcularEdad(patient.Fecha_Nacimiento),

            patient.Fecha_Visita,

            patient.BASDAI || '',

            patient.ASDAS || '',

            patient.HAQ || '',

            `"${patient.Tratamiento_Actual || ''}"`

        ];

        csvRows.push(row.join(','));

    });



    // 3. Crear el Blob y la URL de descarga

    const csvString = csvRows.join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.setAttribute('href', url);

    link.setAttribute('download', 'cohorte_exportada.csv');

    link.style.visibility = 'hidden';

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

}



// =====================================

// EXPOSICIÓN AL NAMESPACE HUBTOOLS

// =====================================



// Exponer funciones al namespace global HubTools

if (typeof HubTools !== 'undefined') {

    HubTools.export.generarFilaCSV_EspA_PrimeraVisita = generarFilaCSV_EspA_PrimeraVisita;

    HubTools.export.generarFilaCSV_APs_PrimeraVisita = generarFilaCSV_APs_PrimeraVisita;

    HubTools.export.generarFilaCSV_EspA_Seguimiento = generarFilaCSV_EspA_Seguimiento;

    HubTools.export.generarFilaCSV_APs_Seguimiento = generarFilaCSV_APs_Seguimiento;

    HubTools.export.exportarYCopiarCSV = exportarYCopiarCSV;

    HubTools.export.exportarTXT = exportarTXT;

    HubTools.export.generarNotaClinica = generarNotaClinica;

    HubTools.export.exportCohortToCSV = exportCohortToCSV;

    HubTools.export.copyDrugsListToClipboard = function(drugsData) {
        const headers = ['Tratamientos_Sistemicos', 'FAMEs', 'Biologicos'];
        const maxLength = Math.max(
            drugsData.Sistemicos?.length || 0,
            drugsData.FAMEs?.length || 0,
            drugsData.Biologicos?.length || 0
        );

        let csvString = headers.join(',') + '\n';

        for (let i = 0; i < maxLength; i++) {
            const row = [
                drugsData.Sistemicos?.[i] || '',
                drugsData.FAMEs?.[i] || '',
                drugsData.Biologicos?.[i] || ''
            ];
            csvString += row.join(',') + '\n';
        }

        navigator.clipboard.writeText(csvString).then(() => {
            HubTools.utils.mostrarNotificacion('¡Copiado al portapapeles! Pega en Excel.', 'success');
        }).catch(err => {
            console.error('Error al copiar al portapapeles:', err);
            HubTools.utils.mostrarNotificacion('Error al copiar la lista de fármacos.', 'error');
        });
    };

    HubTools.export.copyProfessionalsListToClipboard = function(professionalsData) {
        const headers = ['Nombre_Completo', 'Cargo'];
        let csvString = headers.join(',') + '\n';

        professionalsData.forEach(prof => {
            const row = [`"${prof.Nombre_Completo || ''}"`, `"${prof.cargo || ''}"`];
            csvString += row.join(',') + '\n';
        });

        navigator.clipboard.writeText(csvString).then(() => {
            HubTools.utils.mostrarNotificacion('¡Copiado al portapapeles! Pega en Excel.', 'success');
        }).catch(err => {
            console.error('Error al copiar al portapapeles:', err);
            HubTools.utils.mostrarNotificacion('Error al copiar la lista de profesionales.', 'error');
        });
    };

    console.log('✅ Módulo exportManager cargado');

} else {

    console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js primero.');

}
