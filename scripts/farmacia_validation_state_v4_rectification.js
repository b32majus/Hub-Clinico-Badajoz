(function (root) {
  'use strict';

  var model = root.FarmaciaValidationStateV4Model;
  if (!model || typeof model.saveDecision !== 'function') {
    throw new Error('FarmaciaValidationStateV4 rectification dependencies missing');
  }
  if (model.__v4RectificationPatched) return;

  function text(value) {
    return value === null || value === undefined ? '' : String(value).trim();
  }

  function values(object) {
    return Object.keys(object || {}).map(function (key) { return object[key]; });
  }

  function latestValidation(patient) {
    var acts = values(patient && patient.validation_acts);
    acts.sort(function (a, b) {
      return text(a.performed_at || a.created_at).localeCompare(text(b.performed_at || b.created_at));
    });
    return acts.length ? acts[acts.length - 1] : null;
  }

  function lineForAct(patient, validationActId) {
    return values(patient && patient.lines).find(function (line) {
      return line && line.source_validation_act_id === validationActId;
    }) || null;
  }

  function mayRectifyBeforeStart(line) {
    return !!(line && line.status === 'validated_not_started' && !text(line.start_date));
  }

  var originalSaveDecision = model.saveDecision;

  model.saveDecision = function (options) {
    var opts = options || {};
    var result = model.normalizeResult(opts.result);
    if (result === 'denied' && !text(opts.denialReason)) {
      return originalSaveDecision.apply(model, arguments);
    }
    if (result === 'validated' || !result || !opts.store || !text(opts.patientId)) {
      return originalSaveDecision.apply(model, arguments);
    }

    var store = opts.store;
    var patientId = text(opts.patientId);
    var originalState = store.load();
    var patient = store.getPatientState(originalState, patientId);
    var act = latestValidation(patient);
    var line = act ? lineForAct(patient, act.validation_act_id) : null;

    if (!line) return originalSaveDecision.apply(model, arguments);
    if (!mayRectifyBeforeStart(line)) {
      throw new Error('La línea ya se inició o dejó de estar pendiente de inicio. Debe gestionarse desde el circuito posterior, no desde Validación.');
    }

    var preparedState = store.load();
    var preparedPatient = preparedState.patients && preparedState.patients[patientId];
    if (!preparedPatient) return originalSaveDecision.apply(model, arguments);

    delete preparedPatient.lines[line.line_id];
    if (preparedPatient.selected_line_id === line.line_id) preparedPatient.selected_line_id = '';
    if (preparedPatient.validation_acts && preparedPatient.validation_acts[act.validation_act_id]) {
      preparedPatient.validation_acts[act.validation_act_id].produced_line_id = '';
    }

    store.save(preparedState);
    try {
      return originalSaveDecision.apply(model, arguments);
    } catch (error) {
      store.save(originalState);
      throw error;
    }
  };

  model.__v4RectificationPatched = true;
  root.FarmaciaValidationRectificationV4 = {
    mayRectifyBeforeStart: mayRectifyBeforeStart,
    latestValidation: latestValidation,
    lineForAct: lineForAct
  };
})(typeof window !== 'undefined' ? window : globalThis);
