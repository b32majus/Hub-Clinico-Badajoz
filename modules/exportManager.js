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

const LEGACY_BASE_COLUMN_COUNT = 220;
const HISTORICAL_EXPORT_COLUMN_COUNT = 321;
const FINAL_V2_EXPORT_COLUMN_COUNT = 497;

const LEGACY_EXTENSION_HEADERS_221_321 = [
    'Trat_Sistemico_2', 'Trat_Sistemico_Dosis_2', 'Trat_Sistemico_3', 'Trat_Sistemico_Dosis_3',
    'Trat_FAME_2', 'Trat_FAME_Dosis_2', 'Trat_FAME_3', 'Trat_FAME_Dosis_3',
    'Trat_Biologico_2', 'Trat_Biologico_Dosis_2', 'Trat_Biologico_3', 'Trat_Biologico_Dosis_3',
    'Cambio_Sistemico_Farmaco_2', 'Cambio_Sistemico_Dosis_2', 'Cambio_Sistemico_Farmaco_3', 'Cambio_Sistemico_Dosis_3',
    'Cambio_FAME_Farmaco_2', 'Cambio_FAME_Dosis_2', 'Cambio_FAME_Farmaco_3', 'Cambio_FAME_Dosis_3',
    'Cambio_Biologico_Farmaco_2', 'Cambio_Biologico_Dosis_2', 'Cambio_Biologico_Farmaco_3', 'Cambio_Biologico_Dosis_3',
    'Previo_Sistemico_1', 'Previo_Sistemico_Dosis_1', 'Previo_Sistemico_2', 'Previo_Sistemico_Dosis_2', 'Previo_Sistemico_3', 'Previo_Sistemico_Dosis_3',
    'Previo_FAME_1', 'Previo_FAME_Dosis_1', 'Previo_FAME_2', 'Previo_FAME_Dosis_2', 'Previo_FAME_3', 'Previo_FAME_Dosis_3',
    'Previo_Biologico_1', 'Previo_Biologico_Dosis_1', 'Previo_Biologico_2', 'Previo_Biologico_Dosis_2', 'Previo_Biologico_3', 'Previo_Biologico_Dosis_3',
    'Psoriasis_Sistemico_1', 'Psoriasis_Sistemico_Dosis_1', 'Psoriasis_Sistemico_2', 'Psoriasis_Sistemico_Dosis_2', 'Psoriasis_Sistemico_3', 'Psoriasis_Sistemico_Dosis_3',
    'ANA', 'NAD28', 'NAT28', 'DAS28_CRP_Result', 'DAS28_ESR_Result', 'CDAI_Result', 'SDAI_Result', 'EVA_Medico',
    'ACR_Articulaciones', 'ACR_Serologia', 'ACR_Reactantes', 'ACR_Duracion', 'ACR_Total', 'ACR_Resultado_Texto',
    'Rigidez_Matutina_AR', 'Nodulos_Reumatoideos', 'Nodulos_Localizacion', 'Erosiones_Radiologicas', 'Erosiones_Descripcion',
    'ExtraAR_Pulmonar_NIU', 'ExtraAR_Pulmonar_NINE', 'ExtraAR_Nodulos_Pulmonares', 'ExtraAR_Derrame_Pleural',
    'ExtraAR_Epiescleritis', 'ExtraAR_Escleritis', 'ExtraAR_Queratitis', 'ExtraAR_Vasculitis', 'ExtraAR_Anemia', 'ExtraAR_Felty',
    'ExtraAR_Neuropatia', 'ExtraAR_Compresion_Medular', 'ExtraAR_Pericarditis', 'ExtraAR_Amiloidosis',
    'Sjogren_Ocular', 'Sjogren_Oral',
    'MDHAQ_A', 'MDHAQ_B', 'MDHAQ_C', 'MDHAQ_D', 'MDHAQ_E', 'MDHAQ_F', 'MDHAQ_G', 'MDHAQ_H', 'MDHAQ_I', 'MDHAQ_J',
    'RAPID3_Categoria',
    'Maniobras_Sacroiliacas', 'Comentarios_Sacroiliacas', 'ASAS_Lumbalgia_3m', 'ASAS_Criterios_Cumplidos', 'ASAS_Resultado',
    'CASPAR_Puntuacion', 'CASPAR_Resultado'
];

const COMMON_V2_HEADERS = [
    'Fecha_Diagnostico',
    'Estado_Prebiologico_Final',
    'Fecha_Validacion_Prebiologico',
    'Profesional_Validador',
    'Decision_Clinica_Manual',
    'Hemograma_Solicitado',
    'Hemograma_Fecha_Solicitud',
    'Hemograma_Recibido',
    'Hemograma_Fecha_Recepcion',
    'Hemograma_Correcto',
    'Hemograma_Observaciones',
    'Bioquimica_Solicitada',
    'Bioquimica_Fecha_Solicitud',
    'Bioquimica_Recibida',
    'Bioquimica_Fecha_Recepcion',
    'Bioquimica_Correcta',
    'Bioquimica_Observaciones',
    'Serologias_Solicitadas',
    'Serologias_Fecha_Solicitud',
    'Serologias_Recibidas',
    'Serologias_Fecha_Recepcion',
    'Serologias_Correctas',
    'Serologias_Observaciones',
    'IGRA_Mantoux_Solicitado',
    'IGRA_Mantoux_Tipo',
    'IGRA_Mantoux_Fecha_Solicitud',
    'IGRA_Mantoux_Recibido',
    'IGRA_Mantoux_Fecha_Recepcion',
    'IGRA_Mantoux_Resultado',
    'IGRA_Mantoux_Observaciones',
    'Rx_Torax_Solicitada',
    'Rx_Torax_Fecha_Solicitud',
    'Rx_Torax_Recibida',
    'Rx_Torax_Fecha_Recepcion',
    'Rx_Torax_Correcta',
    'Rx_Torax_Observaciones',
    'Vacunacion_Revisada',
    'Vacunacion_OK',
    'Medicina_Preventiva_Requiere_Derivacion',
    'Medicina_Preventiva_Derivada',
    'Medicina_Preventiva_Fecha_Derivacion',
    'Vacunas_Pendientes',
    'Vacunacion_Observaciones',
    'Observaciones_Prebiologico'
];

const LES_V2_HEADERS = [
    'SLEDAI', 'SLEDAI_2K', 'SLICC_SDI', 'Dosis_Prednisona', 'Brote_Actual', 'Tipo_Brote',
    'Actividad_Global_Medico', 'Actividad_Global_Paciente',
    'LES_Cutaneo', 'LES_Articular', 'LES_Renal', 'LES_Neurologico', 'LES_Hematologico',
    'LES_Seroso', 'LES_Cardiopulmonar', 'LES_Vascular', 'LES_Ocular', 'LES_Otros',
    'LES_Manifestaciones_Descripcion',
    'ANA_LES', 'Anti_DNA', 'Anti_Sm', 'Anti_Ro', 'Anti_La',
    'C3', 'C4', 'Proteinuria_LES', 'Sedimento_Urinario_LES', 'Creatinina_LES',
    'PCR_LES', 'VSG_LES', 'Hemograma_Alteraciones_LES', 'Otros_Hallazgos_Analitica_LES',
    'EVA_Dolor_LES', 'EVA_Fatiga_LES', 'EVA_Global_LES', 'Calidad_Vida_Comentario_LES',
    'sledaiSeizure', 'sledaiPsychosis', 'sledaiOrganicBrainSyndrome',
    'sledaiVisualDisturbance', 'sledaiCranialNerveDisorder', 'sledaiLupusHeadache',
    'sledaiCVA', 'sledaiVasculitis', 'sledaiArthritis', 'sledaiMyositis',
    'sledaiUrinaryCasts', 'sledaiHematuria', 'sledaiProteinuria', 'sledaiPyuria',
    'sledaiRash', 'sledaiAlopecia', 'sledaiMucosalUlcers', 'sledaiPleurisy',
    'sledaiPericarditis', 'sledaiLowComplement', 'sledaiIncreasedDNABinding',
    'sledaiFever', 'sledaiThrombocytopenia', 'sledaiLeukopenia',
    'sliccOcular', 'sliccNeuropsychiatric', 'sliccRenal', 'sliccPulmonary',
    'sliccCardiovascular', 'sliccPeripheralVascular', 'sliccGastrointestinal',
    'sliccMusculoskeletal', 'sliccSkin', 'sliccEndocrineDiabetes',
    'sliccGonadal', 'sliccMalignancy'
];

const SJOGREN_V2_HEADERS = [
    'ESSPRI_Sequedad', 'ESSPRI_Fatiga', 'ESSPRI_Dolor', 'ESSPRI_Result',
    'ESSDAI_Result',
    'EVA_Sequedad_Oral', 'EVA_Sequedad_Ocular', 'EVA_Fatiga_Sjogren', 'EVA_Dolor_Sjogren', 'EVA_Global_Sjogren',
    'Sjogren_Ocular_Man', 'Sjogren_Oral_Man', 'Sjogren_Glandular', 'Sjogren_Articular_Man', 'Sjogren_Cutaneo',
    'Sjogren_Pulmonar', 'Sjogren_Renal', 'Sjogren_Neurologico', 'Sjogren_Hematologico', 'Sjogren_Linfoma_Riesgo',
    'Sjogren_Manifestaciones_Descripcion',
    'ANA_Sjogren', 'FR_Sjogren', 'Anti_Ro_Sjogren', 'Anti_La_Sjogren',
    'C3_Sjogren', 'C4_Sjogren',
    'Crioglobulinas', 'Proteinograma',
    'Biopsia_Glandula_Salival', 'Test_Schirmer', 'Tincion_Ocular', 'Flujo_Salival', 'Ecografia_Glandular',
    'PCR_Sjogren', 'VSG_Sjogren', 'Otros_Hallazgos_Analitica_Sjogren',
    'Trat_Sintomatico_Sequedad', 'Trat_Sintomatico_Sequedad_Dosis',
    'Trat_Inmunomodulador', 'Trat_Inmunomodulador_Dosis',
    'essdaiConstitutional', 'essdaiLymphadenopathy', 'essdaiGlandular',
    'essdaiArticular', 'essdaiCutaneous', 'essdaiPulmonary', 'essdaiRenal',
    'essdaiMuscular', 'essdaiPeripheralNervousSystem', 'essdaiCentralNervousSystem',
    'essdaiHematological', 'essdaiBiological'
];

const APS_DAPSA_V2_HEADERS = [
    'DAPSA_Result',
    'DAPSA_NAD68',
    'DAPSA_NAT66',
    'DAPSA_EVA_Dolor_Paciente',
    'DAPSA_EVA_Global_Paciente',
    'DAPSA_PCR'
];

// Cabeceras añadidas a las 220 columnas construidas inline por los generadores legacy.
const FINAL_V2_EXPORT_HEADERS = [
    ...LEGACY_EXTENSION_HEADERS_221_321,
    ...COMMON_V2_HEADERS,
    ...LES_V2_HEADERS,
    ...SJOGREN_V2_HEADERS,
    ...APS_DAPSA_V2_HEADERS
];

const EXTRA_EXPORT_HEADERS = FINAL_V2_EXPORT_HEADERS;

function normalizarEstadoExport(value, fallback = 'ND') {
    if (value === true) return 'SI';
    if (value === false) return 'NO';
    if (value === undefined || value === null) return fallback;
    const normalized = String(value).trim().toUpperCase();
    if (!normalized) return fallback;
    if (normalized === 'SI' || normalized === 'NO' || normalized === 'ND' || normalized === 'NA') return normalized;
    if (normalized === 'NO-ANALIZADO' || normalized === 'NO ANALIZADO') return 'ND';
    return normalized;
}

function normalizePathologyExport(pathology, datos) {
    const raw = pathology || datos?.diagnosticoPrimario || '';
    return String(raw)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function getExportValue(datos, keys, fallback = '') {
    const source = datos || {};
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const key of keyList) {
        const value = source[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return value;
        }
    }
    return fallback;
}

function getExportState(datos, keys, fallback = 'ND') {
    return normalizarEstadoExport(getExportValue(datos, keys, fallback), fallback);
}

function getTreatmentEntriesExport(entries, fallbackFarmaco, fallbackDosis) {
    const output = Array.isArray(entries) ? entries.slice() : [];
    const fallbackDrug = (fallbackFarmaco || '').toString().trim();
    if (output.length === 0 && fallbackDrug && fallbackDrug.toLowerCase() !== 'no') {
        output.push({ farmaco: fallbackDrug, dosis: (fallbackDosis || '').toString().trim() });
    }
    return output;
}

function getTreatmentSlotExport(entries, index) {
    const item = Array.isArray(entries) ? entries[index] : null;
    return item || { farmaco: '', dosis: '' };
}

function buildLegacyExtensionColumns(datos, pathology) {
    const planSistemicos = getTreatmentEntriesExport(datos.planSistemicosEntries, datos.sistemicoSelect, datos.sistemicoDose);
    const planFames = getTreatmentEntriesExport(datos.planFamesEntries, datos.fameSelect, datos.fameDose);
    const planBiologicos = getTreatmentEntriesExport(datos.planBiologicosEntries, datos.biologicoSelect, datos.biologicoDose);

    const cambioSistemicos = getTreatmentEntriesExport(
        datos.cambioSistemicosEntries,
        datos.tratamientoData?.cambio?.sistemicos?.farmaco,
        datos.tratamientoData?.cambio?.sistemicos?.dosis
    );
    const cambioFames = getTreatmentEntriesExport(
        datos.cambioFamesEntries,
        datos.tratamientoData?.cambio?.fames?.farmaco,
        datos.tratamientoData?.cambio?.fames?.dosis
    );
    const cambioBiologicos = getTreatmentEntriesExport(
        datos.cambioBiologicosEntries,
        datos.tratamientoData?.cambio?.biologicos?.farmaco,
        datos.tratamientoData?.cambio?.biologicos?.dosis
    );

    const previoSistemicos = getTreatmentEntriesExport(datos.previoSistemicosEntries);
    const previoFames = getTreatmentEntriesExport(datos.previoFamesEntries);
    const previoBiologicos = getTreatmentEntriesExport(datos.previoBiologicosEntries);
    const psoriasisSistemicos = getTreatmentEntriesExport(datos.psoriasisSistemicosEntries);

    const extra = [];

    [planSistemicos, planFames, planBiologicos].forEach(group => {
        [1, 2].forEach(slot => {
            const item = getTreatmentSlotExport(group, slot);
            extra.push(item.farmaco || '', item.dosis || '');
        });
    });

    [cambioSistemicos, cambioFames, cambioBiologicos].forEach(group => {
        [1, 2].forEach(slot => {
            const item = getTreatmentSlotExport(group, slot);
            extra.push(item.farmaco || '', item.dosis || '');
        });
    });

    [previoSistemicos, previoFames, previoBiologicos].forEach(group => {
        [0, 1, 2].forEach(slot => {
            const item = getTreatmentSlotExport(group, slot);
            extra.push(item.farmaco || '', item.dosis || '');
        });
    });

    [0, 1, 2].forEach(slot => {
        const item = getTreatmentSlotExport(psoriasisSistemicos, slot);
        extra.push(item.farmaco || '', item.dosis || '');
    });

    const isAR = pathology === 'ar';
    const extraArticularAR = datos.extraArticularAR || {};
    const mdhaq = datos.mdhaqData || {};

    const arValues = isAR ? [
        normalizarEstadoExport(datos.ana),
        datos.das28NAD || '',
        datos.das28NAT || '',
        datos.das28CrpResult || '',
        datos.das28EsrResult || '',
        datos.cdaiResult || '',
        datos.sdaiResult || '',
        datos.evaMedico || '',
        datos.acrArticulaciones || '',
        datos.acrSerologia || '',
        datos.acrReactantes || '',
        datos.acrDuracion || '',
        datos.acrTotalResult || '',
        datos.acrResultadoTexto || '',
        datos.rigidezMatutinaAR || '',
        normalizarEstadoExport(datos.nodulosReumatoideos, 'ND'),
        datos.nodulosLocalizacionTexto || '',
        normalizarEstadoExport(datos.erosionesRadiologicas, 'ND'),
        datos.erosionesDescripcionTexto || '',
        normalizarEstadoExport(extraArticularAR['pulmonar-niu'], 'NO'),
        normalizarEstadoExport(extraArticularAR['pulmonar-nine'], 'NO'),
        normalizarEstadoExport(extraArticularAR['nodulos-pulmonares'], 'NO'),
        normalizarEstadoExport(extraArticularAR['derrame-pleural'], 'NO'),
        normalizarEstadoExport(extraArticularAR['epiescleritis'], 'NO'),
        normalizarEstadoExport(extraArticularAR['escleritis'], 'NO'),
        normalizarEstadoExport(extraArticularAR['queratitis'], 'NO'),
        normalizarEstadoExport(extraArticularAR['vasculitis'], 'NO'),
        normalizarEstadoExport(extraArticularAR['anemia'], 'NO'),
        normalizarEstadoExport(extraArticularAR['felty'], 'NO'),
        normalizarEstadoExport(extraArticularAR['neuropatia'], 'NO'),
        normalizarEstadoExport(extraArticularAR['compresion-medular'], 'NO'),
        normalizarEstadoExport(extraArticularAR['pericarditis'], 'NO'),
        normalizarEstadoExport(extraArticularAR['amiloidosis'], 'NO'),
        normalizarEstadoExport(datos.sequedadOcular, 'ND'),
        normalizarEstadoExport(datos.sequedadOral, 'ND'),
        mdhaq.mdhaqA || '', mdhaq.mdhaqB || '', mdhaq.mdhaqC || '', mdhaq.mdhaqD || '', mdhaq.mdhaqE || '',
        mdhaq.mdhaqF || '', mdhaq.mdhaqG || '', mdhaq.mdhaqH || '', mdhaq.mdhaqI || '', mdhaq.mdhaqJ || '',
        datos.rapid3Categoria || '',
        datos.maniobrasSacroiliacas || '',
        datos.comentariosSacroiliacas || '',
        normalizarEstadoExport(datos.asasLumbalgia3Meses, 'ND'),
        datos.asasCriteriosCumplidos || '',
        datos.asasResultado || '',
        datos.casparPuntuacion || '',
        datos.casparResultado || ''
    ] : Array(53).fill('NA');

    extra.push(...arValues);
    return extra;
}

function buildCommonV2Columns(datos) {
    return [
        getExportValue(datos, ['fechaDiagnostico', 'Fecha_Diagnostico'], 'ND'),
        getExportState(datos, ['estadoPrebiologicoFinal', 'Estado_Prebiologico_Final'], 'ND'),
        getExportValue(datos, ['fechaValidacionPrebiologico', 'Fecha_Validacion_Prebiologico'], 'ND'),
        getExportValue(datos, ['profesionalValidador', 'Profesional_Validador'], ''),
        getExportState(datos, ['decisionClinicaManual', 'Decision_Clinica_Manual'], 'ND'),
        getExportState(datos, ['hemogramaSolicitado', 'Hemograma_Solicitado'], 'ND'),
        getExportValue(datos, ['hemogramaFechaSolicitud', 'Hemograma_Fecha_Solicitud'], 'ND'),
        getExportState(datos, ['hemogramaRecibido', 'Hemograma_Recibido'], 'ND'),
        getExportValue(datos, ['hemogramaFechaRecepcion', 'Hemograma_Fecha_Recepcion'], 'ND'),
        getExportState(datos, ['hemogramaCorrecto', 'Hemograma_Correcto'], 'ND'),
        getExportValue(datos, ['hemogramaObservaciones', 'Hemograma_Observaciones'], ''),
        getExportState(datos, ['bioquimicaSolicitada', 'Bioquimica_Solicitada'], 'ND'),
        getExportValue(datos, ['bioquimicaFechaSolicitud', 'Bioquimica_Fecha_Solicitud'], 'ND'),
        getExportState(datos, ['bioquimicaRecibida', 'Bioquimica_Recibida'], 'ND'),
        getExportValue(datos, ['bioquimicaFechaRecepcion', 'Bioquimica_Fecha_Recepcion'], 'ND'),
        getExportState(datos, ['bioquimicaCorrecta', 'Bioquimica_Correcta'], 'ND'),
        getExportValue(datos, ['bioquimicaObservaciones', 'Bioquimica_Observaciones'], ''),
        getExportState(datos, ['serologiasSolicitadas', 'Serologias_Solicitadas'], 'ND'),
        getExportValue(datos, ['serologiasFechaSolicitud', 'Serologias_Fecha_Solicitud'], 'ND'),
        getExportState(datos, ['serologiasRecibidas', 'Serologias_Recibidas'], 'ND'),
        getExportValue(datos, ['serologiasFechaRecepcion', 'Serologias_Fecha_Recepcion'], 'ND'),
        getExportState(datos, ['serologiasCorrectas', 'Serologias_Correctas'], 'ND'),
        getExportValue(datos, ['serologiasObservaciones', 'Serologias_Observaciones'], ''),
        getExportState(datos, ['igraMantouxSolicitado', 'IGRA_Mantoux_Solicitado'], 'ND'),
        getExportValue(datos, ['igraMantouxTipo', 'IGRA_Mantoux_Tipo'], 'ND'),
        getExportValue(datos, ['igraMantouxFechaSolicitud', 'IGRA_Mantoux_Fecha_Solicitud'], 'ND'),
        getExportState(datos, ['igraMantouxRecibido', 'IGRA_Mantoux_Recibido'], 'ND'),
        getExportValue(datos, ['igraMantouxFechaRecepcion', 'IGRA_Mantoux_Fecha_Recepcion'], 'ND'),
        getExportValue(datos, ['igraMantouxResultado', 'IGRA_Mantoux_Resultado'], 'ND'),
        getExportValue(datos, ['igraMantouxObservaciones', 'IGRA_Mantoux_Observaciones'], ''),
        getExportState(datos, ['rxToraxSolicitada', 'Rx_Torax_Solicitada'], 'ND'),
        getExportValue(datos, ['rxToraxFechaSolicitud', 'Rx_Torax_Fecha_Solicitud'], 'ND'),
        getExportState(datos, ['rxToraxRecibida', 'Rx_Torax_Recibida'], 'ND'),
        getExportValue(datos, ['rxToraxFechaRecepcion', 'Rx_Torax_Fecha_Recepcion'], 'ND'),
        getExportState(datos, ['rxToraxCorrecta', 'Rx_Torax_Correcta'], 'ND'),
        getExportValue(datos, ['rxToraxObservaciones', 'Rx_Torax_Observaciones'], ''),
        getExportState(datos, ['vacunacionRevisada', 'Vacunacion_Revisada'], 'ND'),
        getExportState(datos, ['vacunacionOk', 'vacunacionOK', 'Vacunacion_OK'], 'ND'),
        getExportState(datos, ['medicinaPreventivaRequiereDerivacion', 'Medicina_Preventiva_Requiere_Derivacion'], 'ND'),
        getExportState(datos, ['medicinaPreventivaDerivada', 'Medicina_Preventiva_Derivada'], 'ND'),
        getExportValue(datos, ['medicinaPreventivaFechaDerivacion', 'Medicina_Preventiva_Fecha_Derivacion'], 'ND'),
        getExportValue(datos, ['vacunasPendientes', 'Vacunas_Pendientes'], ''),
        getExportValue(datos, ['vacunacionObservaciones', 'Vacunacion_Observaciones'], ''),
        getExportValue(datos, ['observacionesPrebiologico', 'Observaciones_Prebiologico'], '')
    ];
}

function buildLESV2Columns(datos, pathology) {
    if (pathology !== 'les') {
        return Array(LES_V2_HEADERS.length).fill('NA');
    }

    return [
        getExportValue(datos, ['sledaiResult', 'SLEDAI'], ''),
        getExportValue(datos, ['sledai2kResult', 'SLEDAI_2K', 'SLEDAI_2K_Result'], ''),
        getExportValue(datos, ['sliccAcrSdi', 'SLICC_SDI', 'SLICC_ACR_SDI'], ''),
        getExportValue(datos, ['dosisPrednisona', 'Dosis_Prednisona', 'Dosis_Prednisona_Mg_Dia'], ''),
        getExportValue(datos, ['broteActual', 'Brote_Actual'], 'ND'),
        getExportValue(datos, ['tipoBrote', 'Tipo_Brote'], 'ND'),
        getExportValue(datos, ['actividadGlobalMedico', 'Actividad_Global_Medico'], ''),
        getExportValue(datos, ['actividadGlobalPaciente', 'Actividad_Global_Paciente'], ''),
        getExportState(datos, ['lesCutaneo', 'LES_Cutaneo'], 'NO'),
        getExportState(datos, ['lesArticular', 'LES_Articular'], 'NO'),
        getExportState(datos, ['lesRenal', 'LES_Renal'], 'NO'),
        getExportState(datos, ['lesNeurologico', 'LES_Neurologico'], 'NO'),
        getExportState(datos, ['lesHematologico', 'LES_Hematologico'], 'NO'),
        getExportState(datos, ['lesSeroso', 'LES_Seroso'], 'NO'),
        getExportState(datos, ['lesCardiopulmonar', 'LES_Cardiopulmonar'], 'NO'),
        getExportState(datos, ['lesVascular', 'LES_Vascular'], 'NO'),
        getExportState(datos, ['lesOcular', 'LES_Ocular'], 'NO'),
        getExportState(datos, ['lesOtros', 'LES_Otros'], 'NO'),
        getExportValue(datos, ['lesManifestacionesDescripcion', 'LES_Manifestaciones_Descripcion'], ''),
        getExportValue(datos, ['anaLes', 'ANA_LES'], ''),
        getExportValue(datos, ['antiDnaLes', 'Anti_DNA'], ''),
        getExportValue(datos, ['antiSmLes', 'Anti_Sm'], ''),
        getExportValue(datos, ['antiRoLes', 'Anti_Ro'], ''),
        getExportValue(datos, ['antiLaLes', 'Anti_La'], ''),
        getExportValue(datos, ['complementoC3', 'C3'], ''),
        getExportValue(datos, ['complementoC4', 'C4'], ''),
        getExportValue(datos, ['proteinuriaLes', 'Proteinuria_LES'], ''),
        getExportValue(datos, ['sedimentoUrinarioLes', 'Sedimento_Urinario_LES'], ''),
        getExportValue(datos, ['creatininaLes', 'Creatinina_LES'], ''),
        getExportValue(datos, ['pcrLes', 'PCR_LES'], ''),
        getExportValue(datos, ['vsgLes', 'VSG_LES'], ''),
        getExportValue(datos, ['hemogramaAlteracionesLes', 'Hemograma_Alteraciones_LES'], ''),
        getExportValue(datos, ['otrosHallazgosAnaliticaLes', 'Otros_Hallazgos_Analitica_LES'], ''),
        getExportValue(datos, ['evaDolorLes', 'EVA_Dolor_LES'], ''),
        getExportValue(datos, ['evaFatigaLes', 'EVA_Fatiga_LES'], ''),
        getExportValue(datos, ['evaGlobalLes', 'EVA_Global_LES'], ''),
        getExportValue(datos, ['calidadVidaComentarioLes', 'Calidad_Vida_Comentario_LES'], ''),
        getExportState(datos, ['sledaiSeizure'], 'ND'),
        getExportState(datos, ['sledaiPsychosis'], 'ND'),
        getExportState(datos, ['sledaiOrganicBrainSyndrome'], 'ND'),
        getExportState(datos, ['sledaiVisualDisturbance'], 'ND'),
        getExportState(datos, ['sledaiCranialNerveDisorder'], 'ND'),
        getExportState(datos, ['sledaiLupusHeadache'], 'ND'),
        getExportState(datos, ['sledaiCVA'], 'ND'),
        getExportState(datos, ['sledaiVasculitis'], 'ND'),
        getExportState(datos, ['sledaiArthritis'], 'ND'),
        getExportState(datos, ['sledaiMyositis'], 'ND'),
        getExportState(datos, ['sledaiUrinaryCasts'], 'ND'),
        getExportState(datos, ['sledaiHematuria'], 'ND'),
        getExportState(datos, ['sledaiProteinuria'], 'ND'),
        getExportState(datos, ['sledaiPyuria'], 'ND'),
        getExportState(datos, ['sledaiRash'], 'ND'),
        getExportState(datos, ['sledaiAlopecia'], 'ND'),
        getExportState(datos, ['sledaiMucosalUlcers'], 'ND'),
        getExportState(datos, ['sledaiPleurisy'], 'ND'),
        getExportState(datos, ['sledaiPericarditis'], 'ND'),
        getExportState(datos, ['sledaiLowComplement'], 'ND'),
        getExportState(datos, ['sledaiIncreasedDNABinding'], 'ND'),
        getExportState(datos, ['sledaiFever'], 'ND'),
        getExportState(datos, ['sledaiThrombocytopenia'], 'ND'),
        getExportState(datos, ['sledaiLeukopenia'], 'ND'),
        getExportValue(datos, ['sliccOcular'], 'ND'),
        getExportValue(datos, ['sliccNeuropsychiatric'], 'ND'),
        getExportValue(datos, ['sliccRenal'], 'ND'),
        getExportValue(datos, ['sliccPulmonary'], 'ND'),
        getExportValue(datos, ['sliccCardiovascular'], 'ND'),
        getExportValue(datos, ['sliccPeripheralVascular'], 'ND'),
        getExportValue(datos, ['sliccGastrointestinal'], 'ND'),
        getExportValue(datos, ['sliccMusculoskeletal'], 'ND'),
        getExportValue(datos, ['sliccSkin'], 'ND'),
        getExportValue(datos, ['sliccEndocrineDiabetes'], 'ND'),
        getExportValue(datos, ['sliccGonadal'], 'ND'),
        getExportValue(datos, ['sliccMalignancy'], 'ND')
    ];
}

function buildSjogrenV2Columns(datos, pathology) {
    if (pathology !== 'sjogren') {
        return Array(SJOGREN_V2_HEADERS.length).fill('NA');
    }

    return [
        getExportValue(datos, ['esspriSequedad', 'ESSPRI_Sequedad'], ''),
        getExportValue(datos, ['esspriFatiga', 'ESSPRI_Fatiga'], ''),
        getExportValue(datos, ['esspriDolor', 'ESSPRI_Dolor'], ''),
        getExportValue(datos, ['esspriResult', 'ESSPRI_Result'], ''),
        getExportValue(datos, ['essdaiResult', 'ESSDAI_Result'], ''),
        getExportValue(datos, ['evaSequedadOral', 'EVA_Sequedad_Oral'], ''),
        getExportValue(datos, ['evaSequedadOcular', 'EVA_Sequedad_Ocular'], ''),
        getExportValue(datos, ['evaFatigaSjogren', 'EVA_Fatiga_Sjogren'], ''),
        getExportValue(datos, ['evaDolorSjogren', 'EVA_Dolor_Sjogren'], ''),
        getExportValue(datos, ['evaGlobalSjogren', 'EVA_Global_Sjogren'], ''),
        getExportState(datos, ['sjogrenOcular', 'Sjogren_Ocular_Man'], 'NO'),
        getExportState(datos, ['sjogrenOral', 'Sjogren_Oral_Man'], 'NO'),
        getExportState(datos, ['sjogrenGlandular', 'Sjogren_Glandular'], 'NO'),
        getExportState(datos, ['sjogrenArticular', 'Sjogren_Articular_Man'], 'NO'),
        getExportState(datos, ['sjogrenCutaneo', 'Sjogren_Cutaneo'], 'NO'),
        getExportState(datos, ['sjogrenPulmonar', 'Sjogren_Pulmonar'], 'NO'),
        getExportState(datos, ['sjogrenRenal', 'Sjogren_Renal'], 'NO'),
        getExportState(datos, ['sjogrenNeurologico', 'Sjogren_Neurologico'], 'NO'),
        getExportState(datos, ['sjogrenHematologico', 'Sjogren_Hematologico'], 'NO'),
        getExportState(datos, ['sjogrenLinfomaRiesgo', 'Sjogren_Linfoma_Riesgo'], 'NO'),
        getExportValue(datos, ['sjogrenManifestacionesDescripcion', 'Sjogren_Manifestaciones_Descripcion'], ''),
        getExportValue(datos, ['anaSjogren', 'ANA_Sjogren'], ''),
        getExportValue(datos, ['frSjogren', 'FR_Sjogren'], ''),
        getExportValue(datos, ['antiRoSjogren', 'Anti_Ro_Sjogren'], ''),
        getExportValue(datos, ['antiLaSjogren', 'Anti_La_Sjogren'], ''),
        getExportValue(datos, ['complementoC3Sjogren', 'C3_Sjogren'], ''),
        getExportValue(datos, ['complementoC4Sjogren', 'C4_Sjogren'], ''),
        getExportValue(datos, ['crioglobulinasSjogren', 'Crioglobulinas'], ''),
        getExportValue(datos, ['proteinogramaSjogren', 'Proteinograma'], ''),
        getExportValue(datos, ['biopsiaGlandulaSalival', 'Biopsia_Glandula_Salival'], ''),
        getExportValue(datos, ['testSchirmer', 'Test_Schirmer'], ''),
        getExportValue(datos, ['tincionOcular', 'Tincion_Ocular'], ''),
        getExportValue(datos, ['flujoSalival', 'Flujo_Salival'], ''),
        getExportValue(datos, ['ecografiaGlandular', 'Ecografia_Glandular'], ''),
        getExportValue(datos, ['pcrSjogren', 'PCR_Sjogren'], ''),
        getExportValue(datos, ['vsgSjogren', 'VSG_Sjogren'], ''),
        getExportValue(datos, ['otrosHallazgosAnaliticaSjogren', 'Otros_Hallazgos_Analitica_Sjogren'], ''),
        getExportValue(datos, ['tratSintomaticoSequedad', 'Trat_Sintomatico_Sequedad'], ''),
        getExportValue(datos, ['tratSintomaticoSequedadDosis', 'Trat_Sintomatico_Sequedad_Dosis'], ''),
        getExportValue(datos, ['tratInmunomodulador', 'Trat_Inmunomodulador'], ''),
        getExportValue(datos, ['tratInmunomoduladorDosis', 'Trat_Inmunomodulador_Dosis'], ''),
        getExportValue(datos, ['essdaiConstitutional'], 'ND'),
        getExportValue(datos, ['essdaiLymphadenopathy'], 'ND'),
        getExportValue(datos, ['essdaiGlandular'], 'ND'),
        getExportValue(datos, ['essdaiArticular'], 'ND'),
        getExportValue(datos, ['essdaiCutaneous'], 'ND'),
        getExportValue(datos, ['essdaiPulmonary'], 'ND'),
        getExportValue(datos, ['essdaiRenal'], 'ND'),
        getExportValue(datos, ['essdaiMuscular'], 'ND'),
        getExportValue(datos, ['essdaiPeripheralNervousSystem'], 'ND'),
        getExportValue(datos, ['essdaiCentralNervousSystem'], 'ND'),
        getExportValue(datos, ['essdaiHematological'], 'ND'),
        getExportValue(datos, ['essdaiBiological'], 'ND')
    ];
}

function buildAPSDAPSAV2Columns(datos, pathology) {
    if (pathology !== 'aps') {
        return Array(APS_DAPSA_V2_HEADERS.length).fill('NA');
    }

    return [
        getExportValue(datos, ['dapsaResult', 'DAPSA_Result', 'DAPSA'], ''),
        getExportValue(datos, ['dapsaNAD68', 'DAPSA_NAD68'], ''),
        getExportValue(datos, ['dapsaNAT66', 'DAPSA_NAT66'], ''),
        getExportValue(datos, ['dapsaEvaDolorPaciente', 'DAPSA_EVA_Dolor_Paciente'], ''),
        getExportValue(datos, ['dapsaEvaGlobalPaciente', 'DAPSA_EVA_Global_Paciente'], ''),
        getExportValue(datos, ['dapsaPCR', 'DAPSA_PCR'], '')
    ];
}

function validateV2BlockLengths(commonV2, lesV2, sjogrenV2, apsDapsaV2) {
    if (commonV2.length !== COMMON_V2_HEADERS.length) {
        console.warn('Export v2 invalido: bloque comun esperaba ' + COMMON_V2_HEADERS.length + ' columnas y genero ' + commonV2.length);
    }
    if (lesV2.length !== LES_V2_HEADERS.length) {
        console.warn('Export v2 invalido: bloque LES esperaba ' + LES_V2_HEADERS.length + ' columnas y genero ' + lesV2.length);
    }
    if (sjogrenV2.length !== SJOGREN_V2_HEADERS.length) {
        console.warn('Export v2 invalido: bloque Sjogren esperaba ' + SJOGREN_V2_HEADERS.length + ' columnas y genero ' + sjogrenV2.length);
    }
    if (apsDapsaV2.length !== APS_DAPSA_V2_HEADERS.length) {
        console.warn('Export v2 invalido: bloque APs DAPSA esperaba ' + APS_DAPSA_V2_HEADERS.length + ' columnas y genero ' + apsDapsaV2.length);
    }
}

function buildExtendedColumns(datos, pathology) {
    const normalizedPathology = normalizePathologyExport(pathology, datos);
    const legacy = buildLegacyExtensionColumns(datos, normalizedPathology);
    const commonV2 = buildCommonV2Columns(datos);
    const lesV2 = buildLESV2Columns(datos, normalizedPathology);
    const sjogrenV2 = buildSjogrenV2Columns(datos, normalizedPathology);
    const apsDapsaV2 = buildAPSDAPSAV2Columns(datos, normalizedPathology);

    if (legacy.length !== LEGACY_EXTENSION_HEADERS_221_321.length) {
        console.warn('Export v2 invalido: bloque historico extendido esperaba ' + LEGACY_EXTENSION_HEADERS_221_321.length + ' columnas y genero ' + legacy.length);
    }
    validateV2BlockLengths(commonV2, lesV2, sjogrenV2, apsDapsaV2);

    return [
        ...legacy,
        ...commonV2,
        ...lesV2,
        ...sjogrenV2,
        ...apsDapsaV2
    ];
}

function validateExportRowLength(row, pathology, tipoVisita) {
    if (row.length !== FINAL_V2_EXPORT_COLUMN_COUNT) {
        console.warn(
            'Export v2 invalido: se esperaban ' + FINAL_V2_EXPORT_COLUMN_COUNT +
            ' columnas y se generaron ' + row.length +
            ' (patologia=' + (pathology || 'ND') + ', tipoVisita=' + (tipoVisita || 'ND') + ')'
        );
    }
}

function finalizeExportRow(valores, datos, tipoVisita, pathology) {
    const row = Array.isArray(valores) ? valores.slice() : [];

    // Compatibilidad: filas antiguas tienen 219 columnas y faltaba Decision_Terapeutica_SEG (columna 212)
    if (row.length === 219) {
        row.splice(211, 0, '');
    }

    while (row.length < LEGACY_BASE_COLUMN_COUNT) {
        row.push('');
    }

    const extended = buildExtendedColumns(datos || {}, pathology);
    row.push(...extended);
    validateExportRowLength(row, pathology, tipoVisita);

    return row.join('	');
}

function setLegacyColumn(row, columnIndex, value) {
    row[columnIndex - 1] = value === undefined || value === null ? '' : value;
}

function generarFilaCSV_AR_Base(datos, tipoVisita) {
    const row = Array(220).fill('');

    const extraArt = datos.extraArticular || {};
    const comorb = datos.comorbilidad || {};
    const af = datos.antecedentesFamiliares || {};
    const tox = datos.toxicos || {};
    const ent = datos.entesitis || {};

    setLegacyColumn(row, 1, datos.idPaciente || '');
    setLegacyColumn(row, 2, datos.nombrePaciente || '');
    setLegacyColumn(row, 3, datos.sexoPaciente || '');
    setLegacyColumn(row, 4, datos.fechaVisita || '');
    setLegacyColumn(row, 5, tipoVisita === 'primera' ? 'Primera Visita' : 'Seguimiento');
    setLegacyColumn(row, 6, datos.profesional || '');
    setLegacyColumn(row, 7, datos.diagnosticoPrimario || 'ar');
    setLegacyColumn(row, 8, datos.diagnosticoSecundario || '');
    setLegacyColumn(row, 9, normalizarEstadoExport(datos.hlaB27));
    setLegacyColumn(row, 10, normalizarEstadoExport(datos.fr));
    setLegacyColumn(row, 11, normalizarEstadoExport(datos.apcc));

    setLegacyColumn(row, 12, datos.inicioSintomas || '');
    setLegacyColumn(row, 13, datos.inicioPsoriasis || '');
    setLegacyColumn(row, 14, datos.dolorAxial || '');
    setLegacyColumn(row, 15, datos.rigidezMatutina || '');
    setLegacyColumn(row, 16, datos.duracionRigidez || '');
    setLegacyColumn(row, 17, datos.irradiacionNalgas || '');
    setLegacyColumn(row, 18, datos.clinicaAxialPresente || '');

    const nadCols = expandirArticulaciones(datos.nad);
    const natCols = expandirArticulaciones(datos.nat);
    const dactCols = expandirDactilitis(datos.dactilitis);
    nadCols.forEach((v, i) => setLegacyColumn(row, 19 + i, v));
    natCols.forEach((v, i) => setLegacyColumn(row, 47 + i, v));
    dactCols.forEach((v, i) => setLegacyColumn(row, 75 + i, v));

    setLegacyColumn(row, 95, (datos.nad || []).length || 0);
    setLegacyColumn(row, 96, (datos.nat || []).length || 0);
    setLegacyColumn(row, 97, (datos.dactilitis || []).length || 0);

    setLegacyColumn(row, 98, datos.peso || '');
    setLegacyColumn(row, 99, datos.talla || '');
    setLegacyColumn(row, 100, datos.imc || '');
    setLegacyColumn(row, 101, datos.ta || '');

    setLegacyColumn(row, 102, datos.evaGlobal || '');
    setLegacyColumn(row, 103, datos.evaDolor || '');
    setLegacyColumn(row, 104, datos.evaFatiga || '');
    setLegacyColumn(row, 105, datos.rigidezMatutinaMin || '');
    setLegacyColumn(row, 106, normalizarEstadoExport(datos.dolorNocturno, 'NO'));

    setLegacyColumn(row, 107, normalizarEstadoExport(datos.afectacionPsoriasis?.['cuero-cabelludo'], 'NA'));
    setLegacyColumn(row, 108, normalizarEstadoExport(datos.afectacionPsoriasis?.['ungueal'], 'NA'));
    setLegacyColumn(row, 109, normalizarEstadoExport(datos.afectacionPsoriasis?.['extensora'], 'NA'));
    setLegacyColumn(row, 110, normalizarEstadoExport(datos.afectacionPsoriasis?.['pliegues'], 'NA'));
    setLegacyColumn(row, 111, normalizarEstadoExport(datos.afectacionPsoriasis?.['palmoplantar'], 'NA'));

    setLegacyColumn(row, 112, normalizarEstadoExport(extraArt['digestiva'], 'ND'));
    setLegacyColumn(row, 113, normalizarEstadoExport(extraArt['uveitis'], 'ND'));
    setLegacyColumn(row, 114, normalizarEstadoExport(extraArt['psoriasis'], 'ND'));

    setLegacyColumn(row, 115, normalizarEstadoExport(comorb['hta'], 'ND'));
    setLegacyColumn(row, 116, normalizarEstadoExport(comorb['dm'], 'ND'));
    setLegacyColumn(row, 117, normalizarEstadoExport(comorb['dlp'], 'ND'));
    setLegacyColumn(row, 118, normalizarEstadoExport(comorb['ecv'], 'ND'));
    setLegacyColumn(row, 119, normalizarEstadoExport(comorb['gastritis'], 'ND'));
    setLegacyColumn(row, 120, normalizarEstadoExport(comorb['obesidad'], 'ND'));
    setLegacyColumn(row, 121, normalizarEstadoExport(comorb['osteoporosis'], 'ND'));
    setLegacyColumn(row, 122, normalizarEstadoExport(comorb['gota'], 'ND'));

    setLegacyColumn(row, 123, normalizarEstadoExport(af['psoriasis'], 'ND'));
    setLegacyColumn(row, 124, normalizarEstadoExport(af['artritis'], 'ND'));
    setLegacyColumn(row, 125, normalizarEstadoExport(af['eii'], 'ND'));
    setLegacyColumn(row, 126, normalizarEstadoExport(af['uveitis'], 'ND'));

    setLegacyColumn(row, 127, normalizarEstadoExport(tox['tabaco'], 'ND'));
    setLegacyColumn(row, 128, tox['tabaco_desc'] || '');
    setLegacyColumn(row, 129, normalizarEstadoExport(tox['alcohol'], 'ND'));
    setLegacyColumn(row, 130, tox['alcohol_desc'] || '');
    setLegacyColumn(row, 131, normalizarEstadoExport(tox['drogas'], 'ND'));
    setLegacyColumn(row, 132, tox['drogas_desc'] || '');

    setLegacyColumn(row, 133, normalizarEstadoExport(ent['aquiles-der'], 'ND'));
    setLegacyColumn(row, 134, normalizarEstadoExport(ent['fascia-der'], 'ND'));
    setLegacyColumn(row, 135, normalizarEstadoExport(ent['epicondilo-lat-der'], 'ND'));
    setLegacyColumn(row, 136, normalizarEstadoExport(ent['epicondilo-med-der'], 'ND'));
    setLegacyColumn(row, 137, normalizarEstadoExport(ent['trocanter-der'], 'ND'));
    setLegacyColumn(row, 138, normalizarEstadoExport(ent['aquiles-izq'], 'ND'));
    setLegacyColumn(row, 139, normalizarEstadoExport(ent['fascia-izq'], 'ND'));
    setLegacyColumn(row, 140, normalizarEstadoExport(ent['epicondilo-lat-izq'], 'ND'));
    setLegacyColumn(row, 141, normalizarEstadoExport(ent['epicondilo-med-izq'], 'ND'));
    setLegacyColumn(row, 142, normalizarEstadoExport(ent['trocanter-izq'], 'ND'));
    setLegacyColumn(row, 143, datos.otrasEntesitis || '');

    setLegacyColumn(row, 144, datos.pcr || '');
    setLegacyColumn(row, 145, datos.vsg || '');
    setLegacyColumn(row, 146, datos.otrosHallazgosAnalitica || '');
    setLegacyColumn(row, 147, datos.hallazgosRadiografia || '');
    setLegacyColumn(row, 148, datos.hallazgosRMN || '');

    setLegacyColumn(row, 149, datos.basdaiP1 || '');
    setLegacyColumn(row, 150, datos.basdaiP2 || '');
    setLegacyColumn(row, 151, datos.basdaiP3 || '');
    setLegacyColumn(row, 152, datos.basdaiP4 || '');
    setLegacyColumn(row, 153, datos.basdaiP5 || '');
    setLegacyColumn(row, 154, datos.basdaiP6 || '');
    setLegacyColumn(row, 155, datos.basdaiResult || '');

    const isAR = (datos.diagnosticoPrimario || '').toLowerCase() === 'ar';
    setLegacyColumn(row, 156, isAR ? 'NA' : (datos.asdasDolorEspalda || ''));
    setLegacyColumn(row, 157, isAR ? 'NA' : (datos.asdasDuracionRigidez || ''));
    setLegacyColumn(row, 158, isAR ? 'NA' : (datos.asdasEvaGlobal || ''));
    setLegacyColumn(row, 159, isAR ? 'NA' : (datos.asdasCrpResult || ''));
    setLegacyColumn(row, 160, isAR ? 'NA' : (datos.asdasEsrResult || ''));

    setLegacyColumn(row, 161, datos.schober || '');
    setLegacyColumn(row, 162, datos.rotacionCervical || '');
    setLegacyColumn(row, 163, datos.distanciaOP || '');
    setLegacyColumn(row, 164, datos.distanciaTP || '');
    setLegacyColumn(row, 165, datos.expansionToracica || '');
    setLegacyColumn(row, 166, datos.distanciaIntermaleolar || '');

    setLegacyColumn(row, 167, datos.pasiScore || '');
    setLegacyColumn(row, 168, datos.bsaPercentage || '');
    setLegacyColumn(row, 169, datos.psoriasisDescripcion || '');

    setLegacyColumn(row, 170, datos.haqVestirse || '');
    setLegacyColumn(row, 171, datos.haqLevantarse || '');
    setLegacyColumn(row, 172, datos.haqComer || '');
    setLegacyColumn(row, 173, datos.haqCaminar || '');
    setLegacyColumn(row, 174, datos.haqHigiene || '');
    setLegacyColumn(row, 175, datos.haqAlcanzar || '');
    setLegacyColumn(row, 176, datos.haqAgarrar || '');
    setLegacyColumn(row, 177, datos.haqActividades || '');
    setLegacyColumn(row, 178, datos.haqTotal || '');

    setLegacyColumn(row, 179, datos.leiEpicondiloLatIzq || '');
    setLegacyColumn(row, 180, datos.leiEpicondiloLatDer || '');
    setLegacyColumn(row, 181, datos.leiEpicondiloMedIzq || '');
    setLegacyColumn(row, 182, datos.leiEpicondiloMedDer || '');
    setLegacyColumn(row, 183, datos.leiAquilesIzq || '');
    setLegacyColumn(row, 184, datos.leiAquilesDer || '');
    setLegacyColumn(row, 185, datos.leiScore || '');

    setLegacyColumn(row, 186, datos.mdaNAT || '');
    setLegacyColumn(row, 187, datos.mdaNAD || '');
    setLegacyColumn(row, 188, datos.mdaPASI || '');
    setLegacyColumn(row, 189, datos.mdaDolor || '');
    setLegacyColumn(row, 190, datos.mdaGlobal || '');
    setLegacyColumn(row, 191, datos.mdaHAQ || '');
    setLegacyColumn(row, 192, datos.mdaEntesitis || '');
    setLegacyColumn(row, 193, datos.mdaCumple ? 'SI' : 'NO');

    setLegacyColumn(row, 194, datos.rapid3Funcion || '');
    setLegacyColumn(row, 195, datos.rapid3Dolor || '');
    setLegacyColumn(row, 196, datos.rapid3Global || '');
    setLegacyColumn(row, 197, datos.rapid3Total || datos.rapid3Score || '');

    const txS = getTreatmentSlotExport(getTreatmentEntriesExport(datos.planSistemicosEntries, datos.sistemicoSelect, datos.sistemicoDose), 0);
    const txF = getTreatmentSlotExport(getTreatmentEntriesExport(datos.planFamesEntries, datos.fameSelect, datos.fameDose), 0);
    const txB = getTreatmentSlotExport(getTreatmentEntriesExport(datos.planBiologicosEntries, datos.biologicoSelect, datos.biologicoDose), 0);

    const cambio = datos.tratamientoData?.cambio || {};
    const continuar = datos.tratamientoData?.continuar || {};
    const cambioS = cambio.sistemicos || {};
    const cambioF = cambio.fames || {};
    const cambioB = cambio.biologicos || {};

    setLegacyColumn(row, 198, datos.tratamientoActual || '');
    setLegacyColumn(row, 199, datos.fechaInicioTratamiento || '');
    setLegacyColumn(row, 200, tipoVisita === 'primera' ? (datos.decisionTerapeutica || '') : '');
    setLegacyColumn(row, 201, continuar.adherencia || '');
    setLegacyColumn(row, 202, continuar.ajusteTerapeutico || '');
    setLegacyColumn(row, 203, cambio.motivoCambio || '');
    setLegacyColumn(row, 204, cambio.efectosAdversos ? 'SI' : 'NO');
    setLegacyColumn(row, 205, cambio.descripcionEfectos || '');
    setLegacyColumn(row, 206, cambioS.farmaco || '');
    setLegacyColumn(row, 207, cambioS.dosis || '');
    setLegacyColumn(row, 208, cambioF.farmaco || '');
    setLegacyColumn(row, 209, cambioF.dosis || '');
    setLegacyColumn(row, 210, cambioB.farmaco || '');
    setLegacyColumn(row, 211, cambioB.dosis || '');
    setLegacyColumn(row, 212, tipoVisita === 'seguimiento' ? (datos.decisionTerapeutica || '') : '');
    setLegacyColumn(row, 213, txS.farmaco || '');
    setLegacyColumn(row, 214, txS.dosis || '');
    setLegacyColumn(row, 215, txF.farmaco || '');
    setLegacyColumn(row, 216, txF.dosis || '');
    setLegacyColumn(row, 217, txB.farmaco || '');
    setLegacyColumn(row, 218, txB.dosis || '');
    setLegacyColumn(row, 219, datos.fechaProximaRevision || '');
    setLegacyColumn(row, 220, datos.comentariosAdicionales || '');

    return row;
}

function generarFilaCSV_AR_PrimeraVisita(datos) {
    const valores = generarFilaCSV_AR_Base(datos, 'primera');
    return finalizeExportRow(valores, datos, 'primera', 'ar');
}

function generarFilaCSV_AR_Seguimiento(datos) {
    const valores = generarFilaCSV_AR_Base(datos, 'seguimiento');
    return finalizeExportRow(valores, datos, 'seguimiento', 'ar');
}

function generarFilaCSV_LES_PrimeraVisita(datos) {
    const datosLES = { ...(datos || {}), diagnosticoPrimario: datos?.diagnosticoPrimario || 'les' };
    const valores = generarFilaCSV_AR_Base(datosLES, 'primera');
    return finalizeExportRow(valores, datosLES, 'primera', 'les');
}

function generarFilaCSV_LES_Seguimiento(datos) {
    const datosLES = { ...(datos || {}), diagnosticoPrimario: datos?.diagnosticoPrimario || 'les' };
    const valores = generarFilaCSV_AR_Base(datosLES, 'seguimiento');
    return finalizeExportRow(valores, datosLES, 'seguimiento', 'les');
}

function generarFilaCSV_SJOGREN_PrimeraVisita(datos) {
    const datosSjogren = { ...(datos || {}), diagnosticoPrimario: datos?.diagnosticoPrimario || 'sjogren' };
    const valores = generarFilaCSV_AR_Base(datosSjogren, 'primera');
    return finalizeExportRow(valores, datosSjogren, 'primera', 'sjogren');
}

function generarFilaCSV_SJOGREN_Seguimiento(datos) {
    const datosSjogren = { ...(datos || {}), diagnosticoPrimario: datos?.diagnosticoPrimario || 'sjogren' };
    const valores = generarFilaCSV_AR_Base(datosSjogren, 'seguimiento');
    return finalizeExportRow(valores, datosSjogren, 'seguimiento', 'sjogren');
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

    return finalizeExportRow(valores, datos, 'primera', 'espa');
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

    return finalizeExportRow(valores, datos, 'primera', 'aps');
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

    return finalizeExportRow(valores, datos, 'seguimiento', 'espa');
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

    return finalizeExportRow(valores, datos, 'seguimiento', 'aps');
}

const PENDING_ROWS_KEY = 'hubPendingRows';
const PENDING_ROWS_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PENDING_ROWS_LIMIT = 20;

function readPendingRows() {
    try {
        const raw = localStorage.getItem(PENDING_ROWS_KEY);
        const rows = raw ? JSON.parse(raw) : [];
        return Array.isArray(rows) ? rows : [];
    } catch (error) {
        console.warn('No se pudieron leer las filas pendientes:', error);
        return [];
    }
}

function persistPendingRows(rows) {
    try {
        localStorage.setItem(PENDING_ROWS_KEY, JSON.stringify(rows));
    } catch (error) {
        console.warn('No se pudieron guardar las filas pendientes:', error);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pendingRowsUpdated', { detail: rows }));
    }
}

function prunePendingRows(rows) {
    const now = Date.now();
    return (Array.isArray(rows) ? rows : []).filter(item => item && item.createdAt && (now - item.createdAt) <= PENDING_ROWS_MAX_AGE_MS).slice(0, PENDING_ROWS_LIMIT);
}

function getPendingRows() {
    const pruned = prunePendingRows(readPendingRows());
    persistPendingRows(pruned);
    return pruned;
}

function addPendingRow(payload) {
    const next = prunePendingRows([payload, ...readPendingRows()]);
    persistPendingRows(next);
    return payload;
}

function resolvePendingRow(rowId) {
    const rows = prunePendingRows(readPendingRows());
    const next = rowId ? rows.filter(item => item.id !== rowId) : rows.slice(1);
    persistPendingRows(next);
    return next;
}

function getLatestPendingRow() {
    const rows = getPendingRows();
    return rows.length ? rows[0] : null;
}

function openManualCopyModal(texto, titulo, mensaje) {
    if (typeof HubTools?.form?.mostrarModalTexto === 'function') {
        HubTools.form.mostrarModalTexto(texto, titulo, mensaje);
        return true;
    }
    return false;
}

function copyTextWithFallback(textToCopy, options) {
    const config = options || {};
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        return Promise.reject(new Error('API de portapapeles no disponible'));
    }
    return navigator.clipboard.writeText(textToCopy).catch(error => {
        const manualOpened = openManualCopyModal(config.manualText || textToCopy, config.modalTitle, config.modalMessage);
        if (!manualOpened) {
            throw error;
        }
        if (typeof HubTools?.utils?.mostrarNotificacion === 'function' && config.manualNotification) {
            HubTools.utils.mostrarNotificacion(config.manualNotification, 'info');
        }
        return false;
    });
}

function retryPendingRowCopy(rowId) {
    const row = rowId ? getPendingRows().find(item => item.id === rowId) : getLatestPendingRow();
    if (!row) {
        if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
            HubTools.utils.mostrarNotificacion('No hay filas pendientes para recuperar.', 'info');
        }
        return Promise.resolve(false);
    }

    const clipboardText = row.includeBom ? ('\uFEFF' + row.content) : row.content;
    return copyTextWithFallback(clipboardText, {
        manualText: row.content,
        modalTitle: 'Fila CSV pendiente - copia manual',
        modalMessage: `No se pudo copiar automáticamente. Pegue esta fila en la hoja ${row.sheet}.`,
        manualNotification: 'No se pudo copiar automáticamente. La fila pendiente queda disponible para copia manual.'
    }).then(result => {
        if (result !== false && typeof HubTools?.utils?.mostrarNotificacion === 'function') {
            HubTools.utils.mostrarNotificacion(`Fila pendiente copiada. Pegue en la hoja: ${row.sheet}`, 'success');
        }
        return true;
    }).catch(error => {
        console.error('Error al recuperar la fila pendiente:', error);
        if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
            HubTools.utils.mostrarNotificacion('No se pudo recuperar la fila pendiente.', 'error');
        }
        return false;
    });
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
        const diagnosticoNormalizado = normalizePathologyExport(diagnostico, datos);
        
        // Determinar qué función especializada usar según el tipo de visita y diagnóstico
        if (tipoVisita === 'primera') {
            switch (diagnosticoNormalizado) {
                case 'espa':
                    csvData = generarFilaCSV_EspA_PrimeraVisita(datos);
                    hojaExcel = 'ESPA';
                    break;
                case 'aps':
                    csvData = generarFilaCSV_APs_PrimeraVisita(datos);
                    hojaExcel = 'APS';
                    break;
                case 'ar':
                    csvData = generarFilaCSV_AR_PrimeraVisita(datos);
                    hojaExcel = 'AR';
                    break;
                case 'les':
                    csvData = generarFilaCSV_LES_PrimeraVisita(datos);
                    hojaExcel = 'LES';
                    break;
                case 'sjogren':
                    csvData = generarFilaCSV_SJOGREN_PrimeraVisita(datos);
                    hojaExcel = 'SJOGREN';
                    break;
                default:
                    throw new Error(`Diagnóstico no reconocido para primera visita: ${diagnostico}`);
            }
        } else if (tipoVisita === 'seguimiento') {
            switch (diagnosticoNormalizado) {
                case 'espa':
                    csvData = generarFilaCSV_EspA_Seguimiento(datos);
                    hojaExcel = 'ESPA';
                    break;
                case 'aps':
                    csvData = generarFilaCSV_APs_Seguimiento(datos);
                    hojaExcel = 'APS';
                    break;
                case 'ar':
                    csvData = generarFilaCSV_AR_Seguimiento(datos);
                    hojaExcel = 'AR';
                    break;
                case 'les':
                    csvData = generarFilaCSV_LES_Seguimiento(datos);
                    hojaExcel = 'LES';
                    break;
                case 'sjogren':
                    csvData = generarFilaCSV_SJOGREN_Seguimiento(datos);
                    hojaExcel = 'SJOGREN';
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
        
        // Guardar como fila pendiente por si falla el portapapeles
        addPendingRow({
            content: csvData,
            sheet: hojaExcel,
            pathology: diagnosticoNormalizado,
            type: tipoVisita,
            includeBom: false
        });

        // Copiar al portapapeles con fallback a modal de copia manual
        copyTextWithFallback(csvData, {
            manualText: csvData,
            modalTitle: 'Copia manual de CSV',
            modalMessage: 'No se pudo copiar autom\u00e1ticamente. Copie el texto y p\u00e9guelo en la hoja ' + hojaExcel + '.',
            manualNotification: 'No se pudo copiar autom\u00e1ticamente. Use la ventana de copia manual.'
        }).then(function(result) {
            console.log('\u2713 Datos copiados al portapapeles');
            if (typeof HubTools !== 'undefined' && HubTools.utils && HubTools.utils.mostrarNotificacion) {
                HubTools.utils.mostrarNotificacion('Datos copiados al portapapeles. Pega en la hoja: ' + hojaExcel, 'success');
            }
            mostrarChecklistPostExport(hojaExcel);
        }).catch(function(err) {
            console.error('\u274c Error al copiar al portapapeles:', err);
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
    texto += `CIP: ${datos.cip || datos.idPaciente || 'N/A'}\n`;
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
    const isARTXT = (datos.diagnosticoPrimario || '').toLowerCase() === 'ar';
    const isLESTXT = (datos.diagnosticoPrimario || '').toLowerCase() === 'les';
    if (datos.evaGlobal || datos.evaDolor || datos.basdai || (!isARTXT && datos.asdasCrp)) {
        texto += '▓▓▓ EVALUACIÓN DE ACTIVIDAD ▓▓▓\n';
        if (datos.evaGlobal) texto += `EVA Global: ${datos.evaGlobal}\n`;
        if (datos.evaDolor) texto += `EVA Dolor: ${datos.evaDolor}\n`;
        if (datos.basdai) texto += `BASDAI: ${datos.basdai}\n`;
        if (!isARTXT && datos.asdasCrp) texto += `ASDAS-CRP: ${datos.asdasCrp}\n`;
        texto += '\n';
    }

    // BLOQUE LES
    if (isLESTXT) {
        texto += '▓▓▓ EVALUACIÓN ACTIVIDAD LES ▓▓▓\n';
        if (datos.sledaiResult) texto += `SLEDAI: ${datos.sledaiResult}\n`;
        if (datos.sledai2kResult) texto += `SLEDAI-2K: ${datos.sledai2kResult}\n`;
        if (datos.sliccAcrSdi) texto += `SLICC/ACR SDI: ${datos.sliccAcrSdi}\n`;
        if (datos.dosisPrednisona) texto += `Prednisona: ${datos.dosisPrednisona} mg/día\n`;
        if (datos.broteActual) {
            texto += `Brote actual: ${datos.broteActual}`;
            if (datos.tipoBrote) texto += ` (${datos.tipoBrote})`;
            texto += '\n';
        }
        if (datos.actividadGlobalMedico) texto += `Actividad global médico: ${datos.actividadGlobalMedico}\n`;
        if (datos.actividadGlobalPaciente) texto += `Actividad global paciente: ${datos.actividadGlobalPaciente}\n`;
        texto += '\n';

        // Manifestaciones LES
        const manifestaciones = [];
        if (datos.lesCutaneo === 'SI') manifestaciones.push('Cutáneo');
        if (datos.lesArticular === 'SI') manifestaciones.push('Articular');
        if (datos.lesRenal === 'SI') manifestaciones.push('Renal');
        if (datos.lesNeurologico === 'SI') manifestaciones.push('Neurológico');
        if (datos.lesHematologico === 'SI') manifestaciones.push('Hematológico');
        if (datos.lesSeroso === 'SI') manifestaciones.push('Seroso');
        if (datos.lesCardiopulmonar === 'SI') manifestaciones.push('Cardiopulmonar');
        if (datos.lesVascular === 'SI') manifestaciones.push('Vascular');
        if (datos.lesOcular === 'SI') manifestaciones.push('Ocular');
        if (datos.lesOtros === 'SI') manifestaciones.push('Otros');
        if (manifestaciones.length > 0) {
            texto += '▓▓▓ MANIFESTACIONES ▓▓▓\n';
            texto += manifestaciones.join(', ') + '\n';
            if (datos.lesManifestacionesDescripcion) texto += `Descripción: ${datos.lesManifestacionesDescripcion}\n`;
            texto += '\n';
        }

        // Inmunología LES
        const inmunoFields = [];
        if (datos.anaLes) inmunoFields.push(`ANA: ${datos.anaLes}`);
        if (datos.antiDnaLes) inmunoFields.push(`Anti-DNA: ${datos.antiDnaLes}`);
        if (datos.antiSmLes) inmunoFields.push(`Anti-Sm: ${datos.antiSmLes}`);
        if (datos.antiRoLes) inmunoFields.push(`Anti-Ro: ${datos.antiRoLes}`);
        if (datos.antiLaLes) inmunoFields.push(`Anti-La: ${datos.antiLaLes}`);
        if (datos.complementoC3) inmunoFields.push(`C3: ${datos.complementoC3}`);
        if (datos.complementoC4) inmunoFields.push(`C4: ${datos.complementoC4}`);
        if (datos.proteinuriaLes) inmunoFields.push(`Proteinuria: ${datos.proteinuriaLes}`);
        if (datos.sedimentoUrinarioLes) inmunoFields.push(`Sedimento urinario: ${datos.sedimentoUrinarioLes}`);
        if (datos.creatininaLes) inmunoFields.push(`Creatinina: ${datos.creatininaLes}`);
        if (datos.pcrLes) inmunoFields.push(`PCR: ${datos.pcrLes}`);
        if (datos.vsgLes) inmunoFields.push(`VSG: ${datos.vsgLes}`);
        if (datos.hemogramaAlteracionesLes) inmunoFields.push(`Hemograma: ${datos.hemogramaAlteracionesLes}`);
        if (datos.otrosHallazgosAnaliticaLes) inmunoFields.push(`Otros: ${datos.otrosHallazgosAnaliticaLes}`);
        if (inmunoFields.length > 0) {
            texto += '▓▓▓ INMUNOLOGÍA ▓▓▓\n';
            inmunoFields.forEach(f => { texto += f + '\n'; });
            texto += '\n';
        }

        // PROs LES
        if (datos.evaDolorLes || datos.evaFatigaLes || datos.evaGlobalLes || datos.calidadVidaComentarioLes) {
            texto += '▓▓▓ PROs / IMPACTO LES ▓▓▓\n';
            if (datos.evaDolorLes) texto += `EVA Dolor: ${datos.evaDolorLes}\n`;
            if (datos.evaFatigaLes) texto += `EVA Fatiga: ${datos.evaFatigaLes}\n`;
            if (datos.evaGlobalLes) texto += `EVA Global: ${datos.evaGlobalLes}\n`;
            if (datos.calidadVidaComentarioLes) texto += `Calidad de vida: ${datos.calidadVidaComentarioLes}\n`;
            texto += '\n';
        }
    }
    // BLOQUE SJÖGREN
    const isSJOGRENTXT = (datos.diagnosticoPrimario || '').toLowerCase() === 'sjogren';
    if (isSJOGRENTXT) {
        texto += '▓▓▓ EVALUACIÓN ACTIVIDAD SJÖGREN ▓▓▓\n';
        if (datos.esspriResult) texto += `ESSPRI: ${datos.esspriResult} (Sequedad: ${datos.esspriSequedad || '-'}, Fatiga: ${datos.esspriFatiga || '-'}, Dolor: ${datos.esspriDolor || '-'})\n`;
        if (datos.essdaiResult) texto += `ESSDAI: ${datos.essdaiResult}\n`;
        texto += `EVA Sequedad oral: ${datos.evaSequedadOral || '-'}\n`;
        texto += `EVA Sequedad ocular: ${datos.evaSequedadOcular || '-'}\n`;
        if (datos.evaFatigaSjogren) texto += `EVA Fatiga: ${datos.evaFatigaSjogren}\n`;
        if (datos.evaDolorSjogren) texto += `EVA Dolor: ${datos.evaDolorSjogren}\n`;
        if (datos.evaGlobalSjogren) texto += `EVA Global: ${datos.evaGlobalSjogren}\n`;
        texto += '\n';

        // Manifestaciones Sjögren
        const manifSjogren = [];
        if (datos.sjogrenOcular === 'SI') manifSjogren.push('Ocular');
        if (datos.sjogrenOral === 'SI') manifSjogren.push('Oral');
        if (datos.sjogrenGlandular === 'SI') manifSjogren.push('Glandular');
        if (datos.sjogrenArticular === 'SI') manifSjogren.push('Articular');
        if (datos.sjogrenCutaneo === 'SI') manifSjogren.push('Cutáneo');
        if (datos.sjogrenPulmonar === 'SI') manifSjogren.push('Pulmonar');
        if (datos.sjogrenRenal === 'SI') manifSjogren.push('Renal');
        if (datos.sjogrenNeurologico === 'SI') manifSjogren.push('Neurológico');
        if (datos.sjogrenHematologico === 'SI') manifSjogren.push('Hematológico');
        if (datos.sjogrenLinfomaRiesgo === 'SI') manifSjogren.push('Riesgo Linfoma');
        if (manifSjogren.length > 0) {
            texto += '▓▓▓ MANIFESTACIONES ▓▓▓\n';
            texto += manifSjogren.join(', ') + '\n';
            if (datos.sjogrenManifestacionesDescripcion) texto += `Descripción: ${datos.sjogrenManifestacionesDescripcion}\n`;
            texto += '\n';
        }

        // Pruebas / Inmunología Sjögren
        const inmunoSjogren = [];
        if (datos.anaSjogren) inmunoSjogren.push(`ANA: ${datos.anaSjogren}`);
        if (datos.frSjogren) inmunoSjogren.push(`FR: ${datos.frSjogren}`);
        if (datos.antiRoSjogren) inmunoSjogren.push(`Anti-Ro: ${datos.antiRoSjogren}`);
        if (datos.antiLaSjogren) inmunoSjogren.push(`Anti-La: ${datos.antiLaSjogren}`);
        if (datos.complementoC3Sjogren) inmunoSjogren.push(`C3: ${datos.complementoC3Sjogren}`);
        if (datos.complementoC4Sjogren) inmunoSjogren.push(`C4: ${datos.complementoC4Sjogren}`);
        if (datos.crioglobulinasSjogren) inmunoSjogren.push(`Crioglobulinas: ${datos.crioglobulinasSjogren}`);
        if (datos.proteinogramaSjogren) inmunoSjogren.push(`Proteinograma: ${datos.proteinogramaSjogren}`);
        if (datos.biopsiaGlandulaSalival) inmunoSjogren.push(`Biopsia glándula salival: ${datos.biopsiaGlandulaSalival}`);
        if (datos.testSchirmer) inmunoSjogren.push(`Test Schirmer: ${datos.testSchirmer}`);
        if (datos.tincionOcular) inmunoSjogren.push(`Tinción ocular: ${datos.tincionOcular}`);
        if (datos.flujoSalival) inmunoSjogren.push(`Flujo salival: ${datos.flujoSalival}`);
        if (datos.ecografiaGlandular) inmunoSjogren.push(`Ecografía glandular: ${datos.ecografiaGlandular}`);
        if (datos.pcrSjogren) inmunoSjogren.push(`PCR: ${datos.pcrSjogren}`);
        if (datos.vsgSjogren) inmunoSjogren.push(`VSG: ${datos.vsgSjogren}`);
        if (datos.otrosHallazgosAnaliticaSjogren) inmunoSjogren.push(`Otros: ${datos.otrosHallazgosAnaliticaSjogren}`);
        if (inmunoSjogren.length > 0) {
            texto += '▓▓▓ PRUEBAS / INMUNOLOGÍA ▓▓▓\n';
            inmunoSjogren.forEach(f => { texto += f + '\n'; });
            texto += '\n';
        }

        // Tratamiento Sjögren
        if (datos.tratSintomaticoSequedad || datos.tratInmunomodulador) {
            texto += '▓▓▓ TRATAMIENTO SJÖGREN ▓▓▓\n';
            if (datos.tratSintomaticoSequedad) texto += `Tratamiento sintomático sequedad: ${datos.tratSintomaticoSequedad} ${datos.tratSintomaticoSequedadDosis || ''}\n`;
            if (datos.tratInmunomodulador) texto += `Inmunomodulador: ${datos.tratInmunomodulador} ${datos.tratInmunomoduladorDosis || ''}\n`;
            texto += '\n';
        }
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

    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });

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



/**
 * Muestra checklist de pasos post-exportación tras copiar CSV al portapapeles
 */
function mostrarChecklistPostExport(hojaExcel) {
    var prev = document.getElementById('postExportChecklist');
    if (prev) prev.remove();
    var el = document.createElement('div');
    el.id = 'postExportChecklist';
    el.className = 'post-export-checklist';
    el.setAttribute('role', 'status');
    el.innerHTML =
        '<div class="post-export-checklist__header">' +
            '<i class="fas fa-check-circle"></i> CSV copiado al portapapeles' +
        '</div>' +
        '<div class="post-export-checklist__body">' +
            '<p class="post-export-checklist__subtitle">Pasos siguientes:</p>' +
            '<ol class="post-export-checklist__steps">' +
                '<li>Pega en la hoja <strong>' + hojaExcel + '</strong> del Excel</li>' +
                '<li>Guarda el archivo Excel</li>' +
                '<li>Recarga la BD en la app si otros profesionales han a\u00f1adido datos</li>' +
            '</ol>' +
        '</div>' +
        '<button type="button" class="post-export-checklist__dismiss">Entendido <i class="fas fa-check"></i></button>';
    document.body.appendChild(el);
    var dismiss = function() {
        el.style.animation = 'slideOut 0.3s ease';
        setTimeout(function() { el.remove(); }, 300);
    };
    el.querySelector('.post-export-checklist__dismiss').addEventListener('click', dismiss);
    setTimeout(dismiss, 15000);
}

// Exponer funciones al namespace global HubTools

if (typeof HubTools !== 'undefined') {

    HubTools.export.generarFilaCSV_EspA_PrimeraVisita = generarFilaCSV_EspA_PrimeraVisita;

    HubTools.export.generarFilaCSV_APs_PrimeraVisita = generarFilaCSV_APs_PrimeraVisita;

    HubTools.export.generarFilaCSV_EspA_Seguimiento = generarFilaCSV_EspA_Seguimiento;

    HubTools.export.generarFilaCSV_APs_Seguimiento = generarFilaCSV_APs_Seguimiento;

    HubTools.export.generarFilaCSV_AR_PrimeraVisita = generarFilaCSV_AR_PrimeraVisita;

    HubTools.export.generarFilaCSV_AR_Seguimiento = generarFilaCSV_AR_Seguimiento;

    HubTools.export.generarFilaCSV_LES_PrimeraVisita = generarFilaCSV_LES_PrimeraVisita;

    HubTools.export.generarFilaCSV_LES_Seguimiento = generarFilaCSV_LES_Seguimiento;

    HubTools.export.generarFilaCSV_SJOGREN_PrimeraVisita = generarFilaCSV_SJOGREN_PrimeraVisita;

    HubTools.export.generarFilaCSV_SJOGREN_Seguimiento = generarFilaCSV_SJOGREN_Seguimiento;

    HubTools.export.exportarYCopiarCSV = exportarYCopiarCSV;

    HubTools.export.mostrarChecklistPostExport = mostrarChecklistPostExport;

    HubTools.export.exportarTXT = exportarTXT;

    HubTools.export.generarNotaClinica = generarNotaClinica;

    HubTools.export.exportCohortToCSV = exportCohortToCSV;

    HubTools.export.EXTRA_EXPORT_HEADERS = EXTRA_EXPORT_HEADERS;
    HubTools.export.LEGACY_EXTENSION_HEADERS_221_321 = LEGACY_EXTENSION_HEADERS_221_321;
    HubTools.export.COMMON_V2_HEADERS = COMMON_V2_HEADERS;
    HubTools.export.LES_V2_HEADERS = LES_V2_HEADERS;
    HubTools.export.SJOGREN_V2_HEADERS = SJOGREN_V2_HEADERS;
    HubTools.export.APS_DAPSA_V2_HEADERS = APS_DAPSA_V2_HEADERS;
    HubTools.export.FINAL_V2_EXPORT_HEADERS = FINAL_V2_EXPORT_HEADERS;
    HubTools.export.FINAL_V2_EXPORT_COLUMN_COUNT = FINAL_V2_EXPORT_COLUMN_COUNT;
    HubTools.export.validateExportRowLength = validateExportRowLength;
    HubTools.export.getPendingRows = getPendingRows;
    HubTools.export.getLatestPendingRow = getLatestPendingRow;
    HubTools.export.resolvePendingRow = resolvePendingRow;
    HubTools.export.retryPendingRowCopy = retryPendingRowCopy;

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
