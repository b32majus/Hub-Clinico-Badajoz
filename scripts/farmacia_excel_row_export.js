/* scripts/farmacia_excel_row_export.js
 * WO8.1b — Exportador de fila operativa Excel FH
 * Helper común para generar fila TSV compatible con plantilla WO8.
 * Dependencias: F (utility), FarmaciaTratamiento, FarmaciaPautasCatalog
 */

(function () {
  'use strict';

  /* ---- Columnas canónicas WO8 (orden exacto de la plantilla) ---- */
  var WO8_COLUMNS = [
    /* A. Identificación paciente */
    'patient_id',
    'cip_demo_o_hash',
    'nhc_o_codigo_interno',
    'fecha_nacimiento_o_edad',
    'sexo',
    'servicio_origen',
    'patologia_indicacion',
    /* B. Acto farmacéutico */
    'fecha_acto',
    'tipo_acto_fh',
    'visita_id',
    'validacion_id',
    'tratamiento_id',
    'linea_id',
    'profesional_fh',
    'estado_registro',
    /* C. Medicamento / línea terapéutica */
    'marca_comercial',
    'principio_activo',
    'codigo_nacional',
    'numero_registro',
    'source_type',
    'categoria_farmaco',
    'tipo_relacion',
    'estado_linea',
    'tipo_movimiento',
    'es_principal',
    'fecha_inicio',
    'fecha_fin',
    'motivo_inicio_cambio_suspension',
    /* D. Pauta y administración */
    'dosis_presentacion',
    'via',
    'pauta_codigo',
    'pauta_label',
    'pauta_otro_texto',
    /* E. Validación farmacoterapéutica */
    'tipo_validacion',
    'resultado_validacion',
    'requiere_prebiologico',
    'tb_estado',
    'serologias_estado',
    'vacunas_estado',
    'bloqueantes_validacion',
    'observaciones_validacion',
    /* F. Seguimiento */
    'adherencia_morisky',
    'haq',
    'eva_dolor',
    'dlqi',
    'respuesta_clinica',
    'incidencias',
    'observaciones_seguimiento',
    /* G. Seguridad / EA */
    'hay_efecto_adverso',
    'ea_id',
    'ea_descripcion',
    'ea_gravedad',
    'farmaco_sospechoso_id',
    'farmaco_sospechoso_nombre',
    'causalidad_naranjo',
    'causalidad_karch',
    'accion_ea',
    /* H. Trazabilidad */
    'created_at',
    'updated_at',
    'demo_flag',
    'observaciones_generales',
  ];

  /* ---- Mapa de servicio → hoja ---- */
  var SERVICE_SHEET_MAP = {
    dermatologia: '01_DERMA',
    derma: '01_DERMA',
    reumatologia: '02_REUMA',
    reuma: '02_REUMA',
    digestivo: '03_DIGESTIVO',
    gastro: '03_DIGESTIVO',
    eii: '03_DIGESTIVO',
    oncologia: '04_ONCO',
    onco: '04_ONCO',
  };

  /* ---- Limpiar valor para TSV (escapar tabs/saltos de línea) ---- */
  function cleanValue(v) {
    if (v === null || v === undefined) return '';
    var s = String(v);
    // Reemplazar tabuladores y saltos de línea por espacio
    s = s.replace(/\t/g, ' ');
    s = s.replace(/\r?\n/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  function normalizeValidationResult(value) {
    var normalized = cleanValue(value).toLowerCase();
    if (normalized === 'pending' || normalized === 'pendiente') return 'pendiente';
    if (normalized === 'validated' || normalized === 'validado') return 'validado';
    if (normalized === 'denied' || normalized === 'denegado') return 'denegado';
    return '';
  }

  function validationRecordState(result) {
    if (result === 'pendiente') return 'pendiente';
    if (result === 'validado' || result === 'denegado') return 'completado';
    return '';
  }

  function normalizeServiceKey(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  }

  /* ---- Construir objeto de fila desde contexto ---- */
  function buildExcelRowObject(context) {
    if (!context) context = {};
    var p = context.patient || {};
    var now = new Date();
    var isoNow = now.toISOString().replace('T', ' ').substring(0, 19);

    // Detectar servicio para hoja
    var servicio = context.servicio || p.servicio || '';
    var servicioMatch = normalizeServiceKey(servicio);
    var sheetName = SERVICE_SHEET_MAP[servicioMatch] || '';

    // Detectar tipo de acto
    var tipoActo = context.tipoActo || 'otro';

    // La línea debe llegar identificada de forma explícita por la pantalla caller.
    var line = context.lineaActual || null;

    // Datos de validación prebiológica
    var prebio = context.prebiologico || null;

    // EA
    var ea = context.efectoAdverso || null;

    // PROMs / adherencia
    var proms = context.proms || p.proms || null;

    var row = {
      /* A */
      patient_id: cleanValue(context.patientId || p.cip || p.paciente_cip || ''),
      cip_demo_o_hash: cleanValue(context.cip || p.cip || ''),
      nhc_o_codigo_interno: cleanValue(context.nhc || ''),
      fecha_nacimiento_o_edad: cleanValue(context.edad || p.edad || ''),
      sexo: cleanValue(context.sexo || p.sexo || ''),
      servicio_origen: cleanValue(servicio),
      patologia_indicacion: cleanValue(context.patologia || p.patologia || ''),
      /* B */
      fecha_acto: cleanValue(context.fechaActo || isoNow.substring(0, 10)),
      tipo_acto_fh: cleanValue(tipoActo),
      visita_id: cleanValue(context.visitaId || ''),
      validacion_id: cleanValue(context.validacionId || ''),
      tratamiento_id: cleanValue(line ? (line.tratamiento_id || '') : ''),
      linea_id: cleanValue(line ? (line.linea_id || '') : ''),
      profesional_fh: cleanValue(context.profesional || ''),
      estado_registro: cleanValue(context.estadoRegistro || ''),
      /* C */
      marca_comercial: cleanValue(line ? (line.nombre_comercial || line.farmaco_nombre || '') : ''),
      principio_activo: cleanValue(line ? (line.principio_activo || '') : ''),
      codigo_nacional: cleanValue(line ? (line.codigo_nacional || '') : ''),
      numero_registro: cleanValue(line ? (line.nregistro || '') : ''),
      source_type: cleanValue(line ? (line.source_type || '') : ''),
      categoria_farmaco: cleanValue(context.categoriaFarmaco || ''),
      tipo_relacion: cleanValue(line ? (line.tipo_relacion || '') : ''),
      estado_linea: cleanValue(line ? (line.estado_linea || '') : ''),
      tipo_movimiento: cleanValue(line ? (line.tipo_movimiento || '') : ''),
      es_principal: cleanValue(line && Object.prototype.hasOwnProperty.call(line, 'es_principal')
        ? (line.es_principal ? 'TRUE' : 'FALSE')
        : ''),
      fecha_inicio: cleanValue(line ? (line.fecha_inicio || '') : ''),
      fecha_fin: cleanValue(line ? (line.fecha_fin || '') : ''),
      motivo_inicio_cambio_suspension: cleanValue(context.motivo || ''),
      /* D */
      dosis_presentacion: cleanValue(line ? (line.dosis_texto || line.dosis || line.presentacion || '') : ''),
      via: cleanValue(line ? (line.via || '') : ''),
      pauta_codigo: cleanValue(line ? (line.pauta_codigo || '') : ''),
      pauta_label: cleanValue(line ? (line.pauta_label || '') : ''),
      pauta_otro_texto: cleanValue(line
        ? (line.pauta_otro_texto || ((!line.pauta_codigo && !line.pauta_label) ? (line.pauta || '') : ''))
        : ''),
      /* E */
      tipo_validacion: cleanValue(context.tipoValidacion || ''),
      resultado_validacion: normalizeValidationResult(context.resultadoValidacion),
      requiere_prebiologico: cleanValue(prebio ? 'TRUE' : ''),
      tb_estado: cleanValue(prebio ? (prebio.tb || '') : ''),
      serologias_estado: cleanValue(prebio ? (prebio.serologias || '') : ''),
      vacunas_estado: cleanValue(prebio ? (prebio.vacunas || '') : ''),
      bloqueantes_validacion: cleanValue(prebio ? (prebio.bloqueante || '') : ''),
      observaciones_validacion: cleanValue(context.obsValidacion || ''),
      /* F */
      adherencia_morisky: cleanValue(proms ? (proms.morisky_green || proms.morisky || '') : ''),
      haq: cleanValue(proms ? (proms.haq || '') : ''),
      eva_dolor: cleanValue(proms ? (proms.eva_dolor || proms.evaDolor || '') : ''),
      dlqi: cleanValue(proms ? (proms.dlqi || '') : ''),
      respuesta_clinica: cleanValue(context.respuestaClinica || ''),
      incidencias: cleanValue(context.incidencias || ''),
      observaciones_seguimiento: cleanValue(context.obsSeguimiento || ''),
      /* G */
      hay_efecto_adverso: ea ? 'TRUE' : (context.hayEfectoAdverso === false ? 'FALSE' : ''),
      ea_id: cleanValue(ea ? (ea.ea_id || ea.id || '') : ''),
      ea_descripcion: cleanValue(ea ? (ea.descripcion || ea.ea_descripcion || '') : ''),
      ea_gravedad: cleanValue(ea ? (ea.gravedad || ea.ea_gravedad || '') : ''),
      farmaco_sospechoso_id: cleanValue(ea ? (ea.farmaco_sospechoso_id || '') : ''),
      farmaco_sospechoso_nombre: cleanValue(ea ? (ea.farmaco_sospechoso_nombre || '') : ''),
      causalidad_naranjo: cleanValue(ea ? (ea.causalidad_naranjo || '') : ''),
      causalidad_karch: cleanValue(ea ? (ea.causalidad_karch || '') : ''),
      accion_ea: cleanValue(ea ? (ea.accion || '') : ''),
      /* H */
      created_at: cleanValue(isoNow),
      updated_at: cleanValue(isoNow),
      demo_flag: cleanValue(context.demoFlag !== undefined ? (context.demoFlag ? 'TRUE' : 'FALSE') : 'TRUE'),
      observaciones_generales: cleanValue(context.observaciones || ''),
    };

    return row;
  }

  /* ---- Convertir objeto de fila a array (orden WO8_COLUMNS) ---- */
  function buildExcelRowArray(rowObject) {
    if (!rowObject) {
      return WO8_COLUMNS.map(function () { return ''; });
    }
    return WO8_COLUMNS.map(function (col) {
      var val = rowObject[col];
      return val !== null && val !== undefined ? val : '';
    });
  }

  /* ---- Convertir array a TSV (una línea) ---- */
  function toTSVRow(rowArray) {
    if (!Array.isArray(rowArray)) return '';
    return rowArray.join('\t');
  }

  /* ---- Obtener nombre de hoja según servicio ---- */
  function getServiceSheetName(servicio_origen) {
    if (!servicio_origen) return '';
    var key = normalizeServiceKey(servicio_origen);
    return SERVICE_SHEET_MAP[key] || '';
  }

  /* ---- Copiar TSV al portapapeles ---- */
  function copyTSVRowToClipboard(rowArray, opts) {
    opts = opts || {};
    var tsv = toTSVRow(rowArray);
    var sheetName = opts.sheetName || 'la hoja correspondiente';

    if (!tsv) return false;

    // Intentar clipboard API
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(tsv).then(function () {
        showToast('Fila copiada. Pega en la primera fila libre de la hoja ' + sheetName + '.');
      })['catch'](function () {
        fallbackCopy(tsv, sheetName);
      });
    } else {
      fallbackCopy(tsv, sheetName);
    }
    return true;
  }

  /* ---- Fallback: textarea temporal ---- */
  function fallbackCopy(tsv, sheetName) {
    // Buscar o crear textarea temporal
    var ta = document.getElementById('fhExcelRowExportFallback');
    if (!ta) {
      ta = document.createElement('textarea');
      ta.id = 'fhExcelRowExportFallback';
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
      document.body.appendChild(ta);
    }
    ta.value = tsv;
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Fila copiada. Pega en la primera fila libre de la hoja ' + sheetName + '.');
    } catch (e) {
      // Mostrar textarea visible para copia manual
      ta.style.cssText = 'position:fixed;top:50%;left:50%;width:400px;height:100px;opacity:1;z-index:9999;font-size:12px;';
      showToast('No se pudo copiar automáticamente. Selecciona el texto manualmente (Ctrl+C).');
    }
  }

  /* ---- Toast simple ---- */
  function showToast(msg) {
    var el = document.getElementById('fhExcelRowExportToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fhExcelRowExportToast';
      el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#2F5496;color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;z-index:10000;max-width:400px;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.3s;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    el.style.display = 'block';
    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () { el.style.display = 'none'; }, 300);
    }, 4000);
  }

  /* ---- Construir nombre de archivo ---- */
  function buildFilename(context) {
    var prefix = context.prefix || 'fila_fh';
    var cip = (context.cip || context.patientId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    var fecha = new Date().toISOString().substring(0, 10);
    return (prefix + '_' + cip + '_' + fecha + '.tsv').replace(/_{2,}/g, '_').replace(/^_|_$/g, '');
  }

  /* ---- Generar contexto desde una pantalla de validación ---- */
  function buildContextFromValidacion(patient, opts) {
    opts = opts || {};
    var rawResult = opts.resultadoValidacion !== undefined ? opts.resultadoValidacion : opts.resultado;
    var result = normalizeValidationResult(rawResult);
    return {
      patient: patient,
      patientId: patient && patient.cip,
      cip: patient && patient.cip,
      servicio: patient && patient.servicio,
      patologia: patient && patient.patologia,
      edad: patient && patient.edad,
      sexo: patient && patient.sexo,
      tipoActo: opts.tipoActo || 'validacion_inicial',
      tipoValidacion: opts.tipoValidacion !== undefined ? opts.tipoValidacion : '',
      resultadoValidacion: result,
      lineaActual: opts.lineaActual || null,
      prebiologico: opts.prebiologico || null,
      fechaActo: opts.fechaActo || '',
      profesional: opts.profesional || '',
      demoFlag: opts.demoFlag !== undefined ? opts.demoFlag : true,
      estadoRegistro: validationRecordState(result),
    };
  }

  /* ---- Generar contexto desde primera visita ---- */
  function buildContextFromPrimeraVisita(patient, opts) {
    opts = opts || {};
    return {
      patient: patient,
      patientId: patient && patient.cip,
      cip: patient && patient.cip,
      servicio: patient && patient.servicio,
      patologia: patient && patient.patologia,
      edad: patient && patient.edad,
      sexo: patient && patient.sexo,
      tipoActo: 'primera_visita',
      tipoValidacion: 'inicial',
      resultadoValidacion: 'validado',
      visitaId: opts.visitaId || '',
      lineaActual: opts.lineaActual || null,
      fechaActo: opts.fechaActo || '',
      profesional: opts.profesional || '',
      proms: opts.proms || (patient ? patient.proms : null),
      demoFlag: opts.demoFlag !== undefined ? opts.demoFlag : true,
      estadoRegistro: 'completado',
    };
  }

  /* ---- Generar contexto desde seguimiento ---- */
  function buildContextFromSeguimiento(patient, opts) {
    opts = opts || {};
    var ea = opts.efectoAdverso || null;
    return {
      patient: patient,
      patientId: patient && patient.cip,
      cip: patient && patient.cip,
      servicio: patient && patient.servicio,
      patologia: patient && patient.patologia,
      edad: patient && patient.edad,
      sexo: patient && patient.sexo,
      tipoActo: opts.tipoActo || 'seguimiento',
      visitaId: opts.visitaId || '',
      lineaActual: opts.lineaActual || null,
      fechaActo: opts.fechaActo || '',
      profesional: opts.profesional || '',
      efectoAdverso: ea,
      hayEfectoAdverso: ea ? true : (opts.hayEa !== undefined ? opts.hayEa : false),
      proms: opts.proms || (patient ? patient.proms : null),
      respuestaClinica: opts.respuestaClinica || '',
      incidencias: opts.incidencias || '',
      obsSeguimiento: opts.observaciones || '',
      demoFlag: opts.demoFlag !== undefined ? opts.demoFlag : true,
      estadoRegistro: 'completado',
    };
  }

  /* ---- Generar contexto desde dashboard ---- */
  function buildContextFromDashboard(patient, opts) {
    opts = opts || {};
    return {
      patient: patient,
      patientId: patient && patient.cip,
      cip: patient && patient.cip,
      servicio: patient && patient.servicio,
      patologia: patient && patient.patologia,
      edad: patient && patient.edad,
      sexo: patient && patient.sexo,
      tipoActo: 'seguimiento',
      lineaActual: opts.lineaActual || null,
      fechaActo: opts.fechaActo || '',
      profesional: opts.profesional || '',
      efectoAdverso: opts.efectoAdverso || null,
      hayEfectoAdverso: opts.hayEa !== undefined ? opts.hayEa : false,
      proms: opts.proms || (patient ? patient.proms : null),
      demoFlag: opts.demoFlag !== undefined ? opts.demoFlag : true,
      estadoRegistro: 'completado',
    };
  }

  /* ---- API pública ---- */
  window.FarmaciaExcelRowExport = {
    WO8_COLUMNS: WO8_COLUMNS,
    cleanValue: cleanValue,
    normalizeValidationResult: normalizeValidationResult,
    buildExcelRowObject: buildExcelRowObject,
    buildExcelRowArray: buildExcelRowArray,
    toTSVRow: toTSVRow,
    copyTSVRowToClipboard: copyTSVRowToClipboard,
    getServiceSheetName: getServiceSheetName,
    buildFilename: buildFilename,
    buildContextFromValidacion: buildContextFromValidacion,
    buildContextFromPrimeraVisita: buildContextFromPrimeraVisita,
    buildContextFromSeguimiento: buildContextFromSeguimiento,
    buildContextFromDashboard: buildContextFromDashboard,
  };
})();
