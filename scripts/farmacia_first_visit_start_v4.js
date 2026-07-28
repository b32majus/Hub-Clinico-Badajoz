(function (root, factory) {
  'use strict';
  var api = factory(root || {});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && typeof root === 'object') root.FarmaciaFirstVisitStartV4 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  function text(value) {
    return value === null || value === undefined ? '' : String(value).trim();
  }

  function parseIdentity(search) {
    var params = new URLSearchParams(search || '');
    return {
      cip: text(params.get('cip')),
      patient_id: text(params.get('patient_id')),
      line_id: text(params.get('line_id')),
      servicio: text(params.get('servicio')),
      patologia: text(params.get('patologia'))
    };
  }

  function resolveCanonicalContext(state, identity) {
    var source = identity || {};
    if (!source.patient_id) return { valid: false, code: 'MISSING_PATIENT_ID', message: 'Falta el identificador canónico del paciente.' };
    if (!source.line_id) return { valid: false, code: 'MISSING_LINE_ID', message: 'Falta el identificador de la línea terapéutica.' };
    var patient = state && state.patients && state.patients[source.patient_id];
    if (!patient) return { valid: false, code: 'PATIENT_NOT_FOUND', message: 'No se encuentra el paciente en la sesión clínica.' };
    var line = patient.lines && patient.lines[source.line_id];
    if (!line) return { valid: false, code: 'LINE_NOT_FOUND', message: 'No se encuentra la línea terapéutica indicada.' };
    if (line.patient_id !== source.patient_id) return { valid: false, code: 'PATIENT_LINE_MISMATCH', message: 'La línea terapéutica no pertenece al paciente indicado.' };
    if (line.provenance !== 'validated_in_hub') return { valid: false, code: 'INVALID_PROVENANCE', message: 'La línea no procede de una validación canónica del Hub.' };
    if (line.status !== 'validated_not_started' && line.status !== 'active') return { valid: false, code: 'INVALID_STATUS', message: 'La línea no está disponible para confirmar el inicio.' };
    var act = patient.validation_acts && patient.validation_acts[line.source_validation_act_id];
    if (!act || act.result !== 'validated' || act.produced_line_id !== line.line_id) {
      return { valid: false, code: 'VALIDATION_MISMATCH', message: 'No existe una validación positiva coherente para esta línea.' };
    }
    var starts = Object.values(patient.movements || {}).filter(function (movement) {
      return movement.movement_type === 'start' && movement.target_line_id === line.line_id;
    });
    if (line.status === 'validated_not_started' && (line.start_date || starts.length)) {
      return { valid: false, code: 'PENDING_START_INCOHERENT', message: 'La línea pendiente de inicio contiene datos de inicio incoherentes.' };
    }
    if (line.status === 'active' && (!line.start_date || starts.length !== 1)) {
      return { valid: false, code: 'ACTIVE_START_INCOHERENT', message: 'La línea activa no contiene un inicio canónico completo.' };
    }
    return { valid: true, patient: patient, line: line, validation: act, movement: starts[0] || null };
  }

  function buildContextUrl(base, identity, entrada) {
    var params = new URLSearchParams();
    ['cip', 'patient_id', 'line_id', 'servicio', 'patologia'].forEach(function (key) {
      if (text(identity && identity[key])) params.set(key, text(identity[key]));
    });
    if (entrada) params.set('entrada', entrada);
    return base + '?' + params.toString();
  }

  function byId(id) {
    return root.document ? root.document.getElementById(id) : null;
  }

  function setText(id, value) {
    var el = byId(id);
    if (el) el.textContent = text(value) || 'No informado';
  }

  function setDisabled(id, disabled) {
    var el = byId(id);
    if (!el) return;
    el.disabled = !!disabled;
    el.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  }

  function currentProfessional() {
    return text(byId('currentProfessional') && byId('currentProfessional').textContent);
  }

  function treatmentLabel(line) {
    return text(line && (line.drug_name || line.active_ingredient || (line.catalog_snapshot && line.catalog_snapshot.display_name))) || 'No informado';
  }

  var runtime = {
    identity: null,
    store: null,
    resolved: null,
    busy: false
  };

  function setStatus(message, kind) {
    var el = byId('fhPvStartStatus');
    if (!el) return;
    el.textContent = message;
    el.className = 'notice-box notice-box--' + (kind === 'error' ? 'warning' : 'info');
  }

  function renderInvalid(result) {
    runtime.resolved = result;
    setText('fhPvStartLineId', 'No disponible');
    setText('fhPvStartTreatment', 'No disponible');
    setText('fhPvStartState', 'Contexto no válido');
    setText('fhPvStartDateValue', 'No informado');
    setText('fhPvStartProfessional', 'No informado');
    setDisabled('fhPvConfirmStart', true);
    setDisabled('fhPvExportTxt', true);
    setDisabled('fhPvExcelExportBtn', true);
    var followup = byId('fhPvGoSeguimientoV4');
    if (followup) {
      followup.classList.add('hidden');
      followup.removeAttribute('href');
    }
    setStatus(result.message || 'No se puede confirmar el inicio con este contexto.', 'error');
  }

  function renderResolved(result) {
    runtime.resolved = result;
    var active = result.line.status === 'active';
    var dateInput = byId('fhPvFecha');
    setText('fhPvStartLineId', result.line.line_id);
    setText('fhPvStartTreatment', treatmentLabel(result.line));
    setText('fhPvStartState', active ? 'Tratamiento activo' : 'Validado · pendiente de inicio');
    setText('fhPvStartDateValue', active ? result.line.start_date : 'No informado');
    setText('fhPvStartProfessional', active && result.movement ? result.movement.declared_by_demo : currentProfessional());
    if (dateInput) {
      dateInput.value = active ? result.line.start_date : '';
      dateInput.readOnly = active;
      dateInput.disabled = active;
    }
    setDisabled('fhPvConfirmStart', active);
    setDisabled('fhPvExportTxt', !active);
    setDisabled('fhPvExcelExportBtn', !active);
    var followup = byId('fhPvGoSeguimientoV4');
    if (followup) {
      if (active) {
        followup.href = buildContextUrl('farmacia_seguimiento.html', runtime.identity, 'seguimiento');
        followup.classList.remove('hidden');
        followup.removeAttribute('aria-disabled');
      } else {
        followup.classList.add('hidden');
        followup.removeAttribute('href');
        followup.setAttribute('aria-disabled', 'true');
      }
    }
    setStatus(active
      ? 'Inicio confirmado y persistido. La línea terapéutica está activa.'
      : 'Introduzca la fecha real y confirme explícitamente el inicio. Escribir la fecha no activa el tratamiento.', 'info');
  }

  function refresh() {
    try {
      var state = runtime.store.load();
      var result = resolveCanonicalContext(state, runtime.identity);
      if (!result.valid) return renderInvalid(result);
      renderResolved(result);
    } catch (error) {
      renderInvalid({ valid: false, code: 'LOAD_FAILED', message: 'No se pudo restaurar el estado canónico de la sesión.' });
    }
  }

  function confirmStart() {
    if (runtime.busy || !runtime.resolved || !runtime.resolved.valid) return;
    var dateInput = byId('fhPvFecha');
    var startDate = text(dateInput && dateInput.value);
    var professional = currentProfessional();
    if (!startDate) return setStatus('Indique la fecha real de inicio antes de confirmar.', 'error');
    if (!professional) return setStatus('No hay un profesional FH demo visible para registrar la confirmación.', 'error');
    runtime.busy = true;
    setDisabled('fhPvConfirmStart', true);
    try {
      root.FarmaciaMultitreatmentCore.confirmTreatmentStart({
        store: runtime.store,
        patient_id: runtime.identity.patient_id,
        line_id: runtime.identity.line_id,
        start_date: startDate,
        declared_by_demo: professional,
        created_at: new Date().toISOString()
      });
      refresh();
    } catch (error) {
      setStatus('No se pudo confirmar el inicio: ' + text(error && error.message), 'error');
      setDisabled('fhPvConfirmStart', false);
    } finally {
      runtime.busy = false;
    }
  }

  function canonicalReport() {
    var result = runtime.resolved;
    if (!result || !result.valid || result.line.status !== 'active') return '';
    var line = result.line;
    return [
      '=== INFORME DE PRIMERA VISITA FARMACIA ===',
      'CIP: ' + (runtime.identity.cip || 'No informado'),
      'Patient ID: ' + runtime.identity.patient_id,
      'Línea: ' + line.line_id,
      'Estado línea: active',
      'Tratamiento validado: ' + treatmentLabel(line),
      'Principio activo: ' + (text(line.active_ingredient) || 'No informado'),
      'Presentación/dosis: ' + (text(line.dose_text || line.presentation) || 'No informado'),
      'Vía: ' + (text(line.route) || 'No informado'),
      'Pauta: ' + (text(line.pauta_label || line.pauta_otro_texto) || 'No informado'),
      'Fecha real de inicio: ' + line.start_date,
      'Profesional FH demo: ' + (result.movement ? result.movement.declared_by_demo : 'No informado'),
      'Inducción realizada: ' + (text(byId('fhPvInduccionRealizada') && byId('fhPvInduccionRealizada').value) || 'No informado'),
      'Estratificación: ' + (text(byId('fhPvEstratificacion') && byId('fhPvEstratificacion').value) || 'No informado'),
      'PROMs basales: ' + (text(byId('fhPvProms') && byId('fhPvProms').value) || 'No informado'),
      'Observaciones: ' + (text(byId('fhPvNotas') && byId('fhPvNotas').value) || 'No informado'),
      '',
      'ATENCIÓN: Datos sintéticos. No usar para decisiones clínicas reales.'
    ].join('\n');
  }

  function exportText() {
    var report = canonicalReport();
    if (!report) return setStatus('Debe confirmar el inicio canónico antes de exportar.', 'error');
    var demo = root.FarmaciaDemo;
    if (demo && typeof demo.copyTextToClipboard === 'function') {
      demo.copyTextToClipboard(report, 'Texto JARA copiado al portapapeles.');
    }
  }

  function exportExcel() {
    var result = runtime.resolved;
    if (!result || !result.valid || result.line.status !== 'active') {
      return setStatus('Debe confirmar el inicio canónico antes de exportar.', 'error');
    }
    var exp = root.FarmaciaExcelRowExport;
    var demo = root.FarmaciaDemo;
    var queryContext = demo && typeof demo.getQueryContext === 'function' ? demo.getQueryContext() : null;
    var patient = queryContext && queryContext.patient;
    if (!exp || !patient) return setStatus('No se puede construir la fila Excel con el contexto actual.', 'error');
    var line = result.line;
    var treatment = {
      line_id: line.line_id,
      tratamiento_id: line.line_id,
      paciente_cip: runtime.identity.cip,
      farmaco_nombre: treatmentLabel(line),
      nombre_comercial: line.drug_name || '',
      principio_activo: line.active_ingredient || '',
      dosis_texto: line.dose_text || '',
      presentacion: line.presentation || '',
      via: line.route || '',
      pauta_codigo: line.pauta_codigo || '',
      pauta_label: line.pauta_label || '',
      pauta_otro_texto: line.pauta_otro_texto || '',
      fecha_inicio: line.start_date,
      estado_linea: 'active',
      tipo_relacion: line.relationship || '',
      fuente: 'primera_visita_v4'
    };
    var context = exp.buildContextFromPrimeraVisita(patient, {
      tipoActo: 'primera_visita',
      visitaId: 'PV-' + Date.now().toString(36).toUpperCase(),
      lineaActual: treatment,
      fechaActo: line.start_date,
      proms: { morisky_green: '', haq: '', eva_dolor: '', dlqi: '' },
      demoFlag: true
    });
    var row = exp.buildExcelRowArray(exp.buildExcelRowObject(context));
    exp.copyTSVRowToClipboard(row, { sheetName: exp.getServiceSheetName(patient.servicio || '') || 'hoja correspondiente' });
  }

  function bindCapture(id, handler) {
    var el = byId(id);
    if (!el) return;
    el.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      handler();
    }, true);
  }

  function boot() {
    if (!root.document || !root.FarmaciaMultitreatmentCore) return;
    runtime.identity = parseIdentity(root.location && root.location.search);
    runtime.store = root.FarmaciaMultitreatmentCore.createSessionStore(root.sessionStorage);
    var confirm = byId('fhPvConfirmStart');
    if (confirm) confirm.addEventListener('click', confirmStart);
    bindCapture('fhPvExportTxt', exportText);
    bindCapture('fhPvExcelExportBtn', exportExcel);
    refresh();
  }

  if (root.document) root.document.addEventListener('DOMContentLoaded', function () {
    var demo = root.FarmaciaDemo;
    var ready = demo && demo.ready && typeof demo.ready.then === 'function' ? demo.ready : Promise.resolve();
    ready.then(boot);
  });

  return {
    parseIdentity: parseIdentity,
    resolveCanonicalContext: resolveCanonicalContext,
    buildContextUrl: buildContextUrl,
    boot: boot,
    refresh: refresh,
    getCanonicalLine: function () { return runtime.resolved && runtime.resolved.valid ? runtime.resolved.line : null; },
    getCanonicalStartDate: function () { var line = this.getCanonicalLine(); return line && line.status === 'active' ? line.start_date : ''; },
    isStartConfirmed: function () { var line = this.getCanonicalLine(); return !!(line && line.status === 'active'); }
  };
});