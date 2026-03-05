// Módulo Field Normalizer - Normalización canónica de campos

const FIELD_ALIASES = {
    idPaciente: ['ID_Paciente', 'idPaciente', 'ID', 'id', 'Id'],
    nombrePaciente: ['Nombre_Paciente', 'nombrePaciente', 'Nombre', 'nombre'],
    sexoPaciente: ['Sexo', 'sexoPaciente', 'sexo'],
    fechaNacimiento: ['Fecha_Nacimiento', 'fechaNacimiento'],
    fechaVisita: ['Fecha_Visita', 'fechaVisita'],
    tipoVisita: ['Tipo_Visita', 'tipoVisita'],
    diagnosticoPrimario: ['Diagnostico_Principal', 'diagnosticoPrimario', 'pathology'],
    diagnosticoSecundario: ['Diagnostico_Secundario', 'diagnosticoSecundario'],
    tratamientoActual: ['Tratamiento_Actual', 'tratamientoActual', 'Biologico', 'FAME', 'Sistemico', 'Sistémico', 'biologicoSelect', 'fameSelect', 'sistemicoSelect'],
    fechaInicioTratamiento: ['Fecha_Inicio_Tratamiento', 'fechaInicioTratamiento'],
    hlaB27: ['HLA_B27', 'hlaB27'],
    ana: ['ANA', 'ana'],
    fr: ['FR', 'fr'],
    apcc: ['APCC', 'aPCC', 'apcc'],
    peso: ['Peso', 'peso'],
    talla: ['Talla', 'talla'],
    imc: ['IMC', 'imc'],
    pcr: ['PCR', 'pcr', 'pcrResult'],
    vsg: ['VSG', 'vsg', 'vsgResult'],
    evaGlobal: ['EVA_Global', 'evaGlobal'],
    evaDolor: ['EVA_Dolor', 'evaDolor'],
    basdaiResult: ['BASDAI_Result', 'basdaiResult', 'BASDAI', 'basdai'],
    asdasCrpResult: ['ASDAS_CRP_Result', 'asdasCrpResult', 'ASDAS_CRP', 'ASDAS', 'asdasCrp'],
    haqResult: ['HAQ_Total', 'haqResult', 'HAQ', 'haq', 'haqTotal'],
    das28CrpResult: ['DAS28_CRP_Result', 'DAS28_CRP', 'das28CrpResult', 'das28Crp'],
    das28EsrResult: ['DAS28_ESR_Result', 'DAS28_ESR', 'das28EsrResult', 'das28Esr'],
    cdaiResult: ['CDAI_Result', 'CDAI', 'cdaiResult', 'cdai'],
    sdaiResult: ['SDAI_Result', 'SDAI', 'sdaiResult', 'sdai'],
    rapid3Result: ['RAPID3_Score', 'RAPID3', 'rapid3Result', 'rapid3Total', 'rapid3'],
    motivoCambio: ['motivoCambio', 'Motivo_Cambio'],
    comentariosAdicionales: ['comentariosAdicionales', 'Comentarios_Adicionales']
};

function getCanonicalField(record, fieldName, fallback = null) {
    if (!record || typeof record !== 'object') return fallback;
    const aliases = FIELD_ALIASES[fieldName] || [fieldName];
    for (const key of aliases) {
        if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
            return record[key];
        }
    }
    return fallback;
}

function normalizePathology(value) {
    const normalized = (value || '').toString().trim().toLowerCase();
    if (!normalized) return '';
    if (normalized === 'espa' || normalized === 'espa axial') return 'espa';
    if (normalized === 'aps' || normalized === 'apsoriatica' || normalized === 'artritis psoriasica') return 'aps';
    if (normalized === 'ar' || normalized === 'artritis reumatoide') return 'ar';
    return normalized;
}

function normalizeRecord(record, extra) {
    const normalized = {
        ...record,
        idPaciente: getCanonicalField(record, 'idPaciente', ''),
        nombrePaciente: getCanonicalField(record, 'nombrePaciente', ''),
        sexoPaciente: getCanonicalField(record, 'sexoPaciente', ''),
        fechaNacimiento: getCanonicalField(record, 'fechaNacimiento', ''),
        fechaVisita: getCanonicalField(record, 'fechaVisita', ''),
        tipoVisita: getCanonicalField(record, 'tipoVisita', ''),
        diagnosticoPrimario: normalizePathology(getCanonicalField(record, 'diagnosticoPrimario', '')),
        diagnosticoSecundario: getCanonicalField(record, 'diagnosticoSecundario', ''),
        tratamientoActual: getCanonicalField(record, 'tratamientoActual', ''),
        fechaInicioTratamiento: getCanonicalField(record, 'fechaInicioTratamiento', ''),
        hlaB27: getCanonicalField(record, 'hlaB27', ''),
        ana: getCanonicalField(record, 'ana', ''),
        fr: getCanonicalField(record, 'fr', ''),
        apcc: getCanonicalField(record, 'apcc', ''),
        peso: getCanonicalField(record, 'peso', ''),
        talla: getCanonicalField(record, 'talla', ''),
        imc: getCanonicalField(record, 'imc', ''),
        pcr: getCanonicalField(record, 'pcr', ''),
        vsg: getCanonicalField(record, 'vsg', ''),
        evaGlobal: getCanonicalField(record, 'evaGlobal', ''),
        evaDolor: getCanonicalField(record, 'evaDolor', ''),
        basdaiResult: getCanonicalField(record, 'basdaiResult', ''),
        asdasCrpResult: getCanonicalField(record, 'asdasCrpResult', ''),
        haqResult: getCanonicalField(record, 'haqResult', ''),
        das28CrpResult: getCanonicalField(record, 'das28CrpResult', ''),
        das28EsrResult: getCanonicalField(record, 'das28EsrResult', ''),
        cdaiResult: getCanonicalField(record, 'cdaiResult', ''),
        sdaiResult: getCanonicalField(record, 'sdaiResult', ''),
        rapid3Result: getCanonicalField(record, 'rapid3Result', ''),
        motivoCambio: getCanonicalField(record, 'motivoCambio', ''),
        comentariosAdicionales: getCanonicalField(record, 'comentariosAdicionales', '')
    };
    return { ...normalized, ...(extra || {}) };
}

if (typeof HubTools !== 'undefined') {
    HubTools.normalizer.FIELD_ALIASES = FIELD_ALIASES;
    HubTools.normalizer.getCanonicalField = getCanonicalField;
    HubTools.normalizer.normalizePathology = normalizePathology;
    HubTools.normalizer.normalizeRecord = normalizeRecord;
}
