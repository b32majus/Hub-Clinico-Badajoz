(function (root) {
  'use strict';

  var current = null;
  var booted = false;

  function text(value) {
    return value === null || value === undefined ? '' : String(value).trim();
  }

  function byId(id) {
    return root.document ? root.document.getElementById(id) : null;
  }

  function setText(id, value) {
    var node = byId(id);
    if (node) node.textContent = text(value) || 'No informado';
  }

  function setHidden(node, hidden) {
    if (node) node.classList.toggle('hidden', !!hidden);
  }

  function setDisabled(node, disabled) {
    if (!node) return;
    node.disabled = !!disabled;
    node.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  }

  function urlContext() {
    var params = new URLSearchParams(root.location ? root.location.search : '');
    return {
      patient_id: text(params.get('patient_id')),
      line_id: text(params.get('line_id')),
      cip: text(params.get('cip')),
      servicio: text(params.get('servicio')),
      patologia: text(params.get('patologia'))
    };
  }

  function values(object) {
    return Object.keys(object || {}).map(function (key) { return object[key]; });
  }

  function resolveCanonical() {
    var context = urlContext();
    var core = root.FarmaciaMultitreatmentCore;
    if (!context.patient_id) return { valid: false, reason: 'Falta patient_id en el acceso a Primera Visita.', context: context };
    if (!context.line_id) return { valid: false, reason: 'Falta line_id en el acceso a Primera Visita.', context: context };
    if (!core || typeof core.createSessionStore !== 'function' || typeof core.confirmTreatmentStart !== 'function') {
      return { valid: false, reason: 'El núcleo canónico de tratamiento no está disponible.', context: context };
    }

    try {
      var store = core.createSessionStore(root.sessionStorage);
      var state = store.load();
      var patient = state.patients && state.patients[context.patient_id];
      if (!patient) return { valid: false, reason: 'No existe un estado canónico para este paciente.', context: context, store: store, state: state };
      var line = patient.lines && patient.lines[context.line_id];
      if (!line) return { valid: false, reason: 'La línea indicada no existe para este paciente.', context: context, store: store, state: state, patient: patient };
      if (line.patient_id !== context.patient_id) return { valid: false, reason: 'La línea no pertenece al paciente indicado.', context: context, store: store, state: state, patient: patient };
      if (line.provenance !== 'validated_in_hub') return { valid: false, reason: 'La línea no procede de una validación explícita del Hub.', context: context, store: store, state: state, patient: patient, line: line };
      if (line.status !== 'validated_not_started' && line.status !== 'active') {
        return { valid: false, reason: 'La línea no está disponible para confirmar el inicio.', context: context, store: store, state: state, patient: patient, line: line };
      }
      var act = patient.validation_acts && patient.validation_acts[line.source_validation_act_id];
      if (!act || act.result !== 'validated' || act.produced_line_id !== line.line_id) {
        return { valid: false, reason: 'No existe una validación positiva coherente para esta línea.', context: context, store: store, state: state, patient: patient, line: line };
      }
      var starts = values(patient.movements).filter(function (movement) {
        return movement.movement_type === 'start' && movement.target_line_id === line.line_id;
      });
      if (line.status === 'active' && starts.length !== 1) {
        return { valid: false, reason: 'El inicio canónico de la línea es incoherente.', context: context, store: store, state: state, patient: patient, line: line, act: act };
      }
      return {
        valid: true,
        context: context,
        core: core,
        store: store,
        state: state,
        patient: patient,
        line: line,
        act: act,
        startMovement: starts[0] || null
      };
    } catch (error) {
      return { valid: false, reason: 'No se pudo restaurar el estado canónico de la línea.', detail: error.message, context: context };
    }
  }

  function professionalVisible() {
    return text(byId('currentProfessional') && byId('currentProfessional').textContent);
  }

  function buildFollowHref(snapshot) {
    var params = new URLSearchParams();
    var context = snapshot.context || {};
    if (context.cip) params.set('cip', context.cip);
    params.set('patient_id', context.patient_id);
    params.set('line_id', context.line_id);
    if (context.servicio) params.set('servicio', context.servicio);
    if (context.patologia) params.set('patologia', context.patologia);
    params.set('entrada', 'seguimiento');
    return 'farmacia_seguimiento.html?' + params.toString();
  }

  function setExportGate(confirmed) {
    ['fhPvExportTxt', 'fhPvExcelExportBtn', 'fhPvExportCsv'].forEach(function (id) {
      setDisabled(byId(id), !confirmed);
    });
  }

  function renderInvalid(snapshot) {
    current = snapshot;
    setText('fhPvStartLineId', snapshot.context && snapshot.context.line_id);
    setText('fhPvStartTreatment', 'No informado');
    setText('fhPvStartState', 'Contexto no disponible');
    setText('fhPvStartDate', 'No informado');
    setText('fhPvStartProfessional', 'No informado');
    setText('fhPvStartMessage', snapshot.reason || 'No se puede confirmar el inicio.');
    setDisabled(byId('fhPvConfirmStart'), true);
    setHidden(byId('fhPvConfirmStart'), false);
    setHidden(byId('fhPvGoFollowup'), true);
    setExportGate(false);
  }

  function updateConfirmAvailability() {
    var button = byId('fhPvConfirmStart');
    if (!current || !current.valid || current.line.status !== 'validated_not_started') {
      setDisabled(button, true);
      return;
    }
    setDisabled(button, !(text(byId('fhPvFecha') && byId('fhPvFecha').value) && professionalVisible()));
  }

  function renderValid(snapshot) {
    current = snapshot;
    var active = snapshot.line.status === 'active';
    var movement = snapshot.startMovement;
    var dateInput = byId('fhPvFecha');
    var treatmentName = text(snapshot.line.drug_name || snapshot.line.active_ingredient);

    setText('fhPvStartLineId', snapshot.line.line_id);
    setText('fhPvStartTreatment', treatmentName);
    setText('fhPvStartState', active ? 'Tratamiento activo' : 'Validado · pendiente de inicio');
    setText('fhPvStartDate', active ? snapshot.line.start_date : 'No informado');
    setText('fhPvStartProfessional', active && movement ? movement.declared_by_demo : professionalVisible());
    setText('fhPvStartMessage', active
      ? 'Inicio confirmado y restaurado desde el estado canónico.'
      : 'Introduzca la fecha real y confirme explícitamente el inicio.');

    if (dateInput) {
      if (active) dateInput.value = snapshot.line.start_date;
      else dateInput.value = '';
      dateInput.readOnly = active;
      dateInput.disabled = active;
    }

    var confirmButton = byId('fhPvConfirmStart');
    setHidden(confirmButton, active);
    setDisabled(confirmButton, active);

    var follow = byId('fhPvGoFollowup');
    if (follow) {
      if (active) follow.setAttribute('href', buildFollowHref(snapshot));
      else follow.removeAttribute('href');
      setHidden(follow, !active);
      follow.setAttribute('aria-disabled', active ? 'false' : 'true');
    }

    setExportGate(active);
    if (!active) updateConfirmAvailability();
  }

  function refresh() {
    var snapshot = resolveCanonical();
    if (snapshot.valid) renderValid(snapshot);
    else renderInvalid(snapshot);
    return snapshot;
  }

  function confirmStart() {
    var snapshot = resolveCanonical();
    if (!snapshot.valid) {
      renderInvalid(snapshot);
      return;
    }
    if (snapshot.line.status === 'active') {
      renderValid(snapshot);
      return;
    }

    var startDate = text(byId('fhPvFecha') && byId('fhPvFecha').value);
    var professional = professionalVisible();
    if (!startDate) {
      setText('fhPvStartMessage', 'Introduzca la fecha real de inicio antes de confirmar.');
      updateConfirmAvailability();
      return;
    }
    if (!professional) {
      setText('fhPvStartMessage', 'No hay un profesional FH demo visible para confirmar el inicio.');
      updateConfirmAvailability();
      return;
    }

    var button = byId('fhPvConfirmStart');
    setDisabled(button, true);
    try {
      snapshot.core.confirmTreatmentStart({
        store: snapshot.store,
        patient_id: snapshot.context.patient_id,
        line_id: snapshot.context.line_id,
        start_date: startDate,
        declared_by_demo: professional,
        created_at: new Date().toISOString()
      });
      refresh();
    } catch (error) {
      setText('fhPvStartMessage', 'No se pudo confirmar el inicio: ' + text(error.message));
      updateConfirmAvailability();
    }
  }

  function blockUnconfirmedExport(event) {
    var target = event.target && event.target.closest ? event.target.closest('#fhPvExportTxt, #fhPvExcelExportBtn, #fhPvExportCsv') : null;
    if (!target) return;
    if (current && current.valid && current.line.status === 'active') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    root.alert('Confirme primero el inicio canónico del tratamiento.');
  }

  function boot() {
    if (booted) return;
    booted = true;
    var demo = root.FarmaciaDemo;
    var ready = demo && demo.ready && typeof demo.ready.then === 'function' ? demo.ready : Promise.resolve();
    ready.then(function () {
      refresh();
      var button = byId('fhPvConfirmStart');
      if (button) button.addEventListener('click', confirmStart);
      var dateInput = byId('fhPvFecha');
      if (dateInput) dateInput.addEventListener('input', updateConfirmAvailability);
    });
  }

  if (root.document) {
    root.document.addEventListener('click', blockUnconfirmedExport, true);
    root.document.addEventListener('DOMContentLoaded', boot);
  }

  root.FarmaciaFirstVisitStartV4 = {
    boot: boot,
    refresh: refresh,
    getCanonicalLine: function () { return current && current.valid ? JSON.parse(JSON.stringify(current.line)) : null; },
    getCanonicalStartDate: function () { return current && current.valid && current.line.status === 'active' ? current.line.start_date : ''; },
    getDeclaredByDemo: function () { return current && current.valid && current.startMovement ? current.startMovement.declared_by_demo : ''; },
    isStartConfirmed: function () { return !!(current && current.valid && current.line.status === 'active'); },
    getContext: function () { return current ? JSON.parse(JSON.stringify(current.context || {})) : urlContext(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
