(function (root) {
  'use strict';
  var S = root.FarmaciaValidationExportTruthV4Shared = root.FarmaciaValidationExportTruthV4Shared || {};
  S.DRAFT_ID = 'validation_ui_v4';
  S.BLOCK = 'Guarde primero la decisión de Validación. Las salidas solo pueden generarse desde un acto canónico guardado.';
  S.t = function (v) { return v == null ? '' : String(v).trim(); };
  S.el = function (id) { return root.document ? root.document.getElementById(id) : null; };
  S.vals = function (o) { return Object.keys(o || {}).map(function (k) { return o[k]; }); };
  function pad(v) { return String(v).padStart(2, '0'); }
  S.dateParts = function (v) {
    var d = v ? new Date(v) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    var day = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    return { day: day, stamp: day + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()), human: pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() };
  };
  S.shown = function (v) { return S.t(v) || 'No informado'; };
  S.clinical = function (v) {
    var raw = S.t(v), u = raw.toUpperCase();
    if (!raw || raw === '—') return 'No informado';
    if (/^(OK|SI|SÍ|COMPLETO|COMPLETA|COMPLETADO|COMPLETADA)$/.test(u)) return 'OK';
    if (/^NEGATIV/.test(u)) return 'Negativo';
    if (/^(NO PRECISA|NO_PRECISA|NO APLICA|N\/A|NA)$/.test(u)) return 'No precisa';
    if (u.indexOf('PENDIENT') !== -1) return 'Pendiente';
    if (u.indexOf('BLOQUE') !== -1 || u.indexOf('ALTERAD') !== -1) return 'Bloqueo';
    if (u.indexOf('POSITIV') !== -1 || u.indexOf('REACTIV') !== -1) return 'Positivo/alterado';
    return raw;
  };
  S.recency = function (v) {
    var u = S.t(v).toUpperCase();
    if (/^(OK|SI|SÍ|RECIENTE|< ?3 MESES)$/.test(u)) return 'OK';
    if (/^(NO|NO RECIENTE|> ?3 MESES)$/.test(u)) return 'No';
    return 'No informado';
  };
  S.excelDate = function (v) {
    var raw = S.t(v);
    if (!raw) return 'No informado';
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
    if (/^\d+(?:\.\d+)?$/.test(raw)) {
      var n = Number(raw), d = new Date(Math.floor(n - 25569) * 86400 * 1000);
      if (!isNaN(d.getTime())) return pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear();
    }
    return raw;
  };
  S.resultLabel = function (v) { return v === 'validated' ? 'Validado · pendiente de inicio' : v === 'denied' ? 'Denegado' : v === 'pending' ? 'Pendiente' : 'Sin decisión guardada'; };
  S.typeLabel = function (v) { return ({ inicio_nuevo: 'Inicio de nuevo fármaco', switch_cambio: 'Cambio / switch', addon: 'Adición de tratamiento', renovacion: 'Renovación' })[S.t(v)] || S.shown(v); };
  S.originLabel = function (v) { return ({ excel_enfermeria: 'Solicitud desde Excel Enfermería', manual_farmacia: 'Registro manual de Farmacia', derma: 'Solicitud Dermatología', reuma: 'Solicitud Reumatología', digestivo: 'Solicitud Digestivo' })[S.t(v)] || S.shown(v); };
})(typeof window !== 'undefined' ? window : globalThis);
