(function (root) {
  'use strict';
  var S = root.FarmaciaValidationExportTruthV4Shared;
  if (!S) throw new Error('FarmaciaValidationExportTruthV4 state missing');

  S.report = function (b) {
    var q = S.requestView(b), l = S.exportTreatment(b), p = S.prebio(b), dt = S.dateParts(b.act.performed_at || b.act.created_at || b.draft.saved_at), a = [];
    a.push('=== INFORME DE VALIDACIÓN FARMACOTERAPÉUTICA ===', 'Identificador validación: ' + S.shown(b.act.validation_act_id), 'Fecha: ' + dt.human, '',
      'Origen de entrada: ' + S.originLabel(b.draft.origin_entry || b.patient.origen_solicitud), 'Tipo de validación: ' + S.typeLabel(b.draft.validation_type), 'Patient ID: ' + S.shown(b.patient.patient_id), 'CIP: ' + S.shown(b.patient.cip), 'Servicio origen: ' + S.shown(b.patient.servicio), 'Patología: ' + S.shown(b.patient.patologia), 'Fecha solicitud: ' + S.excelDate(q.requestedAt), '',
      'TRATAMIENTO SOLICITADO / DATOS EXPLÍCITOS GUARDADOS', 'Fármaco solicitado: ' + S.shown(q.drug), 'Principio activo: ' + S.shown(q.pa), 'Dosis solicitada: ' + S.shown(q.dose), 'Vía: ' + S.shown(q.route), 'Pauta: ' + S.shown(q.pautaLabel || q.pautaOther), 'Presentación: ' + S.shown(q.presentation), 'Inducción: ' + S.shown(q.induction), '', 'TRATAMIENTO VALIDADO POR FARMACIA');
    if (b.act.result === 'validated') a.push('Línea: ' + S.shown(l.linea_id), 'Estado línea: ' + S.shown(l.estado_linea), 'Fármaco validado: ' + S.shown(l.nombre_comercial), 'Principio activo: ' + S.shown(l.principio_activo), 'Dosis prescrita: ' + S.shown(l.dosis), 'Vía: ' + S.shown(l.via), 'Pauta: ' + S.shown(l.pauta_label || l.pauta_otro_texto), 'Presentación: ' + S.shown(l.presentacion), 'Inducción: ' + S.shown(q.induction), 'Justificación farmacéutica: ' + S.shown(b.draft.pharmacist_justification));
    else a.push('No existe una línea terapéutica validada para este acto.');
    a.push('', 'ESTUDIO PREBIOLÓGICO — DATOS EXPLÍCITOS', 'Analítica: ' + p.analitica, 'Recencia analítica <3 meses: ' + p.recencia, 'Hemograma: ' + p.hemograma, 'Bioquímica: ' + p.bioquimica, 'Mantoux: ' + p.mantoux, 'IGRA: ' + p.igra, 'VHB: ' + p.vhb, 'VHC: ' + p.vhc, 'VIH: ' + p.vih, 'Vacunación: ' + p.vacunacion, 'Medicina preventiva: ' + p.medicina, 'Observaciones prebiológico: ' + S.shown(p.observaciones), '',
      'Estado validación: ' + S.resultLabel(b.act.result), 'Motivo denegación: ' + S.shown(b.draft.denial_reason), 'Fecha cita Farmacia: ' + S.shown(b.draft.appointment_date), 'Farmacéutico responsable: ' + S.shown(b.act.professional_demo_id || S.t(S.el('fhValFarmaceutico') && S.el('fhValFarmaceutico').textContent)), 'Observaciones: ' + S.shown(b.act.observations || b.draft.observations), '', '=== FIN DEL INFORME ===', 'Generado por: Hub Clínico Badajoz — Demo Farmacia V4', 'ATENCIÓN: Datos sintéticos. No usar para decisiones clínicas reales.');
    return a;
  };

  S.excelRow = function (b) {
    var x = root.FarmaciaExcelRowExport;
    if (!x) throw new Error('Exportador Excel FH no disponible.');
    var dt = S.dateParts(b.act.performed_at || b.act.created_at || b.draft.saved_at), p = S.prebio(b), tb = [];
    if (p.mantoux !== 'No informado') tb.push('Mantoux: ' + p.mantoux);
    if (p.igra !== 'No informado') tb.push('IGRA: ' + p.igra);
    var ctx = x.buildContextFromValidacion(b.patient, { tipoActo: 'validacion_inicial', tipoValidacion: S.t(b.draft.validation_type), resultadoValidacion: b.act.result, lineaActual: S.exportTreatment(b), prebiologico: { tb: tb.join(' · '), serologias: 'VHB: ' + p.vhb + ' · VHC: ' + p.vhc + ' · VIH: ' + p.vih, vacunas: p.vacunacion, bloqueante: p.bloqueante }, fechaActo: dt.day, profesional: S.t(b.act.professional_demo_id || (S.el('fhValFarmaceutico') && S.el('fhValFarmaceutico').textContent)), demoFlag: true });
    ctx.patientId = b.patient.patient_id; ctx.validacionId = b.act.validation_act_id; ctx.obsValidacion = S.t(b.act.observations || b.draft.observations);
    var row = x.buildExcelRowObject(ctx);
    row.patient_id = b.patient.patient_id; row.cip_demo_o_hash = b.patient.cip; row.validacion_id = b.act.validation_act_id; row.linea_id = b.act.result === 'validated' && b.line ? b.line.line_id : ''; row.tratamiento_id = '';
    row.fecha_acto = dt.day; row.created_at = dt.stamp; row.updated_at = S.dateParts(b.draft.saved_at || b.act.performed_at).stamp; row.resultado_validacion = b.act.result === 'validated' ? 'validado' : b.act.result === 'denied' ? 'denegado' : 'pendiente'; row.estado_registro = b.act.result === 'pending' ? 'pendiente' : 'completado'; row.tipo_validacion = S.t(b.draft.validation_type);
    if (b.act.result !== 'validated') { row.linea_id = ''; row.tipo_relacion = ''; row.estado_linea = ''; row.tipo_movimiento = ''; row.es_principal = ''; row.fecha_inicio = ''; row.fecha_fin = ''; }
    return row;
  };

  function copyReport(b) { root.FarmaciaDemo.copyTextToClipboard(S.report(b).join('\n'), 'Texto JARA canónico copiado al portapapeles.'); }
  function copyExcel(b) { var x = root.FarmaciaExcelRowExport, arr = x.buildExcelRowArray(S.excelRow(b)); x.copyTSVRowToClipboard(arr, { sheetName: x.getServiceSheetName(b.patient.servicio || '') || 'hoja correspondiente' }); }
  function csv(b) { var row = S.excelRow(b), keys = Object.keys(row), cell = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }; root.FarmaciaDemo.downloadFile('validacion_FH_' + b.patient.cip + '_' + S.dateParts(b.act.performed_at).day + '.csv', keys.map(cell).join(',') + '\n' + keys.map(function (k) { return cell(row[k]); }).join(','), 'text/csv;charset=utf-8'); }
  S.intercept = function (e) {
    var target = e.target && e.target.closest ? e.target.closest('#fhValExportTxt, #fhValExportCsv, #fhValExcelExportBtn') : null;
    if (!target) return;
    e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    var b = S.exportable(); if (!b) return;
    if (target.id === 'fhValExportTxt') copyReport(b); else if (target.id === 'fhValExportCsv') csv(b); else copyExcel(b);
  };
})(typeof window !== 'undefined' ? window : globalThis);
