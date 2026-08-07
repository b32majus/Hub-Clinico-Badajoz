/* Farmacia Export v2 validation adapter (internal candidate; no public cutover). */
(function (root) {
  'use strict';

  var ADAPTER_VERSION = '1.0.0-draft.1';
  var CORE_VERSION = '2.0.0-draft.1';
  var TREATMENT_FIELDS = [
    'drugName', 'activeIngredient', 'presentation', 'doseText', 'route',
    'scheduleCode', 'scheduleLabel', 'scheduleOtherText', 'inductionStatus',
    'selectedDrugId', 'catalogSource', 'nationalCode', 'registrationNumber'
  ];
  var TOP_LEVEL_FIELDS = ['technical', 'context', 'request', 'requestedTreatment', 'decision', 'validatedTreatment', 'prebiologic', 'comorbidities', 'clinicalObservations', 'relatedTreatments'];
  var BLOCK_FIELDS = {
    technical: ['eventId', 'sourceEventId', 'rowKey', 'validationId', 'patientId', 'occurredAt', 'recordedAt', 'demoFlag', 'eventStatus', 'requestId', 'hospitalCode', 'professionalRef', 'identifierSystem', 'validatedTreatmentId', 'validatedLineId', 'lineCreationStatus', 'prebiologicRequired', 'prebiologicOverallStatus', 'preventiveMedicineStatus', 'validationBlockers'],
    context: ['identifierValue', 'serviceCode', 'serviceLabel', 'pathologyCode', 'pathologyLabel', 'professionalDisplay'],
    request: ['origin', 'date', 'validationType', 'appointmentDate', 'weightText', 'justification', 'sourceObservations'],
    requestedTreatment: TREATMENT_FIELDS,
    decision: ['result', 'pendingReason', 'denialReason', 'pharmacyObservations', 'otherObservations', 'validatedTreatmentRelation'],
    validatedTreatment: TREATMENT_FIELDS,
    prebiologic: ['analysisDate', 'analysisRecentStatus', 'hemogramVerified', 'biochemistryVerified', 'tbStatus', 'hbvStatus', 'hcvStatus', 'hivStatus', 'vaccinationStatus', 'vaccinationObservations'],
    comorbidities: ['recurrentInfectionsStatus', 'cardiovascularRiskStatus', 'neurologicDisorderStatus', 'neoplasiaHistoryOrRiskStatus']
  };
  var BLOCK_STRING_FIELDS = {
    technical: ['eventId', 'sourceEventId', 'rowKey', 'validationId', 'patientId', 'occurredAt', 'recordedAt', 'eventStatus', 'requestId', 'hospitalCode', 'professionalRef', 'identifierSystem', 'validatedTreatmentId', 'validatedLineId', 'lineCreationStatus', 'prebiologicRequired', 'prebiologicOverallStatus', 'preventiveMedicineStatus'],
    context: BLOCK_FIELDS.context,
    request: BLOCK_FIELDS.request,
    requestedTreatment: TREATMENT_FIELDS,
    decision: BLOCK_FIELDS.decision,
    validatedTreatment: TREATMENT_FIELDS,
    prebiologic: ['analysisDate', 'analysisRecentStatus', 'tbStatus', 'hbvStatus', 'hcvStatus', 'hivStatus', 'vaccinationStatus', 'vaccinationObservations'],
    comorbidities: BLOCK_FIELDS.comorbidities
  };
  var CLINICAL_OBSERVATION_FIELDS = ['code', 'value', 'source', 'pathology_label', 'unit', 'display'];
  var RELATED_TREATMENT_FIELDS = ['source_row_uid', 'relation_type', 'drug_name', 'active_ingredient', 'dose_text', 'route', 'schedule_text', 'start_date', 'end_date', 'reason', 'adverse_event_suspect'];
  var RELATED_CLINICAL_FIELDS = ['drug_name', 'active_ingredient', 'dose_text', 'route', 'schedule_text', 'start_date', 'end_date', 'reason', 'adverse_event_suspect'];

  function AdapterError(code, message, details) {
    this.name = 'FarmaciaExportV2ValidationAdapterError';
    this.code = code;
    this.message = message;
    this.details = details || null;
    if (Error.captureStackTrace) Error.captureStackTrace(this, AdapterError);
  }
  AdapterError.prototype = Object.create(Error.prototype);
  AdapterError.prototype.constructor = AdapterError;

  function fail(code, message, details) { throw new AdapterError(code, message, details); }
  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function plain(value) { return value !== null && Object.prototype.toString.call(value) === '[object Object]'; }
  function valueKey(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function mapped(value, table) {
    var key = valueKey(value);
    if (!key) return null;
    return own(table, key) ? table[key] : value;
  }

  function normalizeTriState(value) {
    return mapped(value, { si: 'yes', yes: 'yes', no: 'no', 'no informado': null, not_recorded: 'not_recorded' });
  }
  function normalizeTbStatus(value) {
    return mapped(value, {
      negativo: 'negative', negative: 'negative', 'positivo - tratado': 'positive_treated',
      positivo_tratado: 'positive_treated', positive_treated: 'positive_treated', pendiente: 'pending', pending: 'pending', not_recorded: 'not_recorded'
    });
  }
  function normalizeSerologyStatus(value) {
    return mapped(value, { negativo: 'negative', negative: 'negative', positivo: 'positive', positive: 'positive', pendiente: 'pending', pending: 'pending', not_recorded: 'not_recorded' });
  }
  function normalizeVaccinationStatus(value) {
    return mapped(value, { si: 'yes', yes: 'yes', no: 'no', pendiente: 'pending', pending: 'pending', not_recorded: 'not_recorded' });
  }
  function normalizeValidationResult(value) {
    return mapped(value, { pendiente: 'pending', pending: 'pending', validado: 'validated', validated: 'validated', denegado: 'denied', denied: 'denied', not_recorded: 'not_recorded' });
  }
  function normalizeValidatedTreatmentRelation(value) {
    return mapped(value, {
      same_as_requested: 'same_as_requested', modified_from_requested: 'modified_from_requested',
      no_treatment_validated: 'no_treatment_validated', not_recorded: 'not_recorded'
    });
  }

  function push(errors, code, field, details) {
    var error = { code: code, field: field };
    if (details !== undefined) error.details = details;
    errors.push(error);
  }
  function requiredTechnical(input, errors) {
    var required = ['eventId', 'sourceEventId', 'rowKey', 'validationId', 'patientId', 'occurredAt', 'recordedAt', 'demoFlag', 'eventStatus'];
    if (!plain(input.technical)) { push(errors, 'MISSING_CONTEXT', 'technical'); return; }
    required.forEach(function (field) {
      if (!own(input.technical, field)) push(errors, 'MISSING_REQUIRED', 'technical.' + field);
      else if (field !== 'demoFlag' && (input.technical[field] === null || input.technical[field] === '')) push(errors, 'EMPTY_REQUIRED', 'technical.' + field);
    });
    if (own(input.technical, 'demoFlag') && typeof input.technical.demoFlag !== 'boolean') push(errors, 'INVALID_TYPE', 'technical.demoFlag');
  }
  function treatmentEmpty(treatment) {
    if (!plain(treatment)) return true;
    return TREATMENT_FIELDS.every(function (field) {
      return !own(treatment, field) || treatment[field] === null || (typeof treatment[field] === 'string' && treatment[field].trim() === '');
    });
  }
  function treatmentIdentifiable(treatment) {
    if (!plain(treatment)) return false;
    return ['drugName', 'activeIngredient'].some(function (field) {
      return own(treatment, field) && typeof treatment[field] === 'string' && treatment[field].trim() !== '';
    });
  }
  function treatmentsEqual(requested, validated) {
    if (!plain(requested) || !plain(validated)) return false;
    return TREATMENT_FIELDS.every(function (field) {
      var normalizeAbsence = function (value) { return value === undefined || value === null || value === '' ? null : value; };
      var left = normalizeAbsence(requested[field]);
      var right = normalizeAbsence(validated[field]);
      if (field === 'inductionStatus') {
        left = left === null ? null : normalizeTriState(left);
        right = right === null ? null : normalizeTriState(right);
      }
      return left === right;
    });
  }

  function validateClosedBlockTypes(input, errors) {
    Object.keys(BLOCK_STRING_FIELDS).forEach(function (block) {
      var source = input[block];
      if (!plain(source)) return;
      BLOCK_STRING_FIELDS[block].forEach(function (field) {
        if (!own(source, field)) return;
        if (source[field] !== null && typeof source[field] !== 'string') push(errors, 'INVALID_TYPE', block + '.' + field, { expected: 'string or null' });
      });
    });
    [['technical', 'demoFlag'], ['prebiologic', 'hemogramVerified'], ['prebiologic', 'biochemistryVerified']].forEach(function (entry) {
      var source = input[entry[0]];
      if (!plain(source) || !own(source, entry[1])) return;
      if (source[entry[1]] !== null && typeof source[entry[1]] !== 'boolean') push(errors, 'INVALID_TYPE', entry[0] + '.' + entry[1], { expected: 'boolean or null' });
    });
    if (plain(input.technical) && own(input.technical, 'validationBlockers') && !Array.isArray(input.technical.validationBlockers)) {
      push(errors, 'INVALID_TYPE', 'technical.validationBlockers', { expected: 'array' });
    }
  }

  function validateClinicalObservations(value, errors) {
    if (value === null || !Array.isArray(value)) return;
    value.forEach(function (item, index) {
      var path = 'clinicalObservations[' + index + ']';
      if (!plain(item)) { push(errors, 'INVALID_OBJECT', path); return; }
      Object.keys(item).forEach(function (key) { if (CLINICAL_OBSERVATION_FIELDS.indexOf(key) === -1) push(errors, 'UNKNOWN_FIELD', path + '.' + key); });
      ['code', 'source', 'pathology_label'].forEach(function (field) {
        if (!own(item, field) || typeof item[field] !== 'string' || item[field].trim() === '') push(errors, 'INVALID_REQUIRED_STRING', path + '.' + field);
      });
      if (item.source !== 'validation_origin_form') push(errors, 'INVALID_SOURCE', path + '.source');
      if (!own(item, 'value') || item.value === null || item.value === undefined || (typeof item.value === 'string' && item.value.trim() === '') || (typeof item.value === 'number' && !Number.isFinite(item.value)) || (typeof item.value !== 'string' && typeof item.value !== 'number' && typeof item.value !== 'boolean')) {
        push(errors, 'INVALID_OBSERVATION_VALUE', path + '.value');
      }
      ['unit', 'display'].forEach(function (field) {
        if (own(item, field) && (typeof item[field] !== 'string' || item[field].trim() === '')) push(errors, 'INVALID_EXPLICIT_STRING', path + '.' + field);
      });
    });
  }

  function validateRelatedTreatments(value, errors) {
    if (value === null || !Array.isArray(value)) return;
    value.forEach(function (item, index) {
      var path = 'relatedTreatments[' + index + ']';
      if (!plain(item)) { push(errors, 'INVALID_OBJECT', path); return; }
      Object.keys(item).forEach(function (key) { if (RELATED_TREATMENT_FIELDS.indexOf(key) === -1) push(errors, 'UNKNOWN_FIELD', path + '.' + key); });
      RELATED_TREATMENT_FIELDS.forEach(function (field) {
        if (own(item, field) && (typeof item[field] !== 'string' || item[field].trim() === '')) push(errors, 'INVALID_EXPLICIT_STRING', path + '.' + field);
      });
      var hasClinicalData = RELATED_CLINICAL_FIELDS.some(function (field) { return own(item, field) && typeof item[field] === 'string' && item[field].trim() !== ''; });
      if (!hasClinicalData) push(errors, 'EMPTY_RELATED_TREATMENT', path);
    });
  }

  function validateValidationInput(input) {
    var errors = [];
    if (!plain(input)) return { valid: false, errors: [{ code: 'INVALID_OBJECT', field: null }] };
    Object.keys(input).forEach(function (key) { if (TOP_LEVEL_FIELDS.indexOf(key) === -1) push(errors, 'UNKNOWN_FIELD', key); });
    Object.keys(BLOCK_FIELDS).forEach(function (block) {
      if (!plain(input[block])) { push(errors, 'INVALID_OBJECT', block); return; }
      Object.keys(input[block]).forEach(function (key) { if (BLOCK_FIELDS[block].indexOf(key) === -1) push(errors, 'UNKNOWN_FIELD', block + '.' + key); });
    });
    ['clinicalObservations', 'relatedTreatments'].forEach(function (field) {
      if (!own(input, field) || (input[field] !== null && !Array.isArray(input[field]))) push(errors, 'INVALID_ARRAY', field);
    });
    validateClosedBlockTypes(input, errors);
    validateClinicalObservations(input.clinicalObservations, errors);
    validateRelatedTreatments(input.relatedTreatments, errors);
    requiredTechnical(input, errors);
    var decision = plain(input.decision) ? input.decision : {};
    var result = normalizeValidationResult(decision.result);
    var relation = normalizeValidatedTreatmentRelation(decision.validatedTreatmentRelation);
    var lineStatus = input.technical && input.technical.lineCreationStatus;
    var validatedHasIdentity = treatmentIdentifiable(input.validatedTreatment);
    var requestedHasIdentity = treatmentIdentifiable(input.requestedTreatment);
    var validatedIsEmpty = treatmentEmpty(input.validatedTreatment);
    var hasValidatedIds = input.technical && (own(input.technical, 'validatedTreatmentId') || own(input.technical, 'validatedLineId'));
    var createsLine = lineStatus === 'created' || lineStatus === 'updated';
    if (result !== null && ['pending', 'validated', 'denied', 'not_recorded'].indexOf(result) === -1) push(errors, 'INVALID_ENUM', 'decision.result');
    if (relation !== null && ['same_as_requested', 'modified_from_requested', 'no_treatment_validated', 'not_recorded'].indexOf(relation) === -1) push(errors, 'INVALID_ENUM', 'decision.validatedTreatmentRelation');
    if (result === 'validated') {
      if (relation !== 'same_as_requested' && relation !== 'modified_from_requested') {
        push(errors, 'RESULT_RELATION_MISMATCH', 'decision.validatedTreatmentRelation');
      } else {
        if (!validatedHasIdentity) push(errors, 'VALIDATED_TREATMENT_REQUIRED', 'validatedTreatment');
        if (!requestedHasIdentity) push(errors, 'REQUESTED_TREATMENT_REQUIRED', 'requestedTreatment');
        if (requestedHasIdentity && validatedHasIdentity) {
          if (relation === 'same_as_requested' && !treatmentsEqual(input.requestedTreatment, input.validatedTreatment)) {
            push(errors, 'SAME_AS_REQUESTED_MISMATCH', 'validatedTreatment');
          }
          if (relation === 'modified_from_requested' && treatmentsEqual(input.requestedTreatment, input.validatedTreatment)) {
            push(errors, 'MODIFIED_TREATMENT_NOT_DIFFERENT', 'validatedTreatment');
          }
        }
      }
      if (createsLine) {
        if (!input.technical || !input.technical.validatedTreatmentId) push(errors, 'MISSING_REQUIRED', 'technical.validatedTreatmentId');
        if (!input.technical || !input.technical.validatedLineId) push(errors, 'MISSING_REQUIRED', 'technical.validatedLineId');
      }
    } else if (result === 'denied') {
      if (relation !== 'no_treatment_validated') push(errors, 'RESULT_RELATION_MISMATCH', 'decision.validatedTreatmentRelation');
      if (!validatedIsEmpty) push(errors, 'VALIDATED_TREATMENT_NOT_ALLOWED', 'validatedTreatment');
      if (hasValidatedIds) push(errors, 'VALIDATED_IDS_NOT_ALLOWED', 'technical');
      if (createsLine) push(errors, 'RESULT_CANNOT_CREATE_LINE', 'technical.lineCreationStatus');
    } else if (result === 'pending' || result === null || result === 'not_recorded') {
      if (relation !== null && relation !== 'not_recorded') push(errors, 'RESULT_RELATION_MISMATCH', 'decision.validatedTreatmentRelation');
      if (!validatedIsEmpty) push(errors, 'VALIDATED_TREATMENT_NOT_ALLOWED', 'validatedTreatment');
      if (hasValidatedIds) push(errors, 'VALIDATED_IDS_NOT_ALLOWED', 'technical');
      if (createsLine) push(errors, 'RESULT_CANNOT_CREATE_LINE', 'technical.lineCreationStatus');
    }
    if (lineStatus !== undefined && lineStatus !== null && ['created', 'updated', 'not_created', 'not_applicable', 'not_recorded'].indexOf(lineStatus) === -1) push(errors, 'INVALID_ENUM', 'technical.lineCreationStatus');
    function enumValue(source, field, normalizer, allowed, path) {
      if (!plain(source) || !own(source, field)) return;
      var value = normalizer(source[field]);
      if (value !== null && allowed.indexOf(value) === -1) push(errors, 'INVALID_ENUM', path + '.' + field);
    }
    enumValue(input.prebiologic, 'analysisRecentStatus', normalizeTriState, ['yes', 'no', 'not_recorded'], 'prebiologic');
    enumValue(input.prebiologic, 'tbStatus', normalizeTbStatus, ['negative', 'positive_treated', 'pending', 'not_recorded'], 'prebiologic');
    ['hbvStatus', 'hcvStatus', 'hivStatus'].forEach(function (field) { enumValue(input.prebiologic, field, normalizeSerologyStatus, ['negative', 'positive', 'pending', 'not_recorded'], 'prebiologic'); });
    enumValue(input.prebiologic, 'vaccinationStatus', normalizeVaccinationStatus, ['yes', 'no', 'pending', 'not_recorded'], 'prebiologic');
    ['recurrentInfectionsStatus', 'cardiovascularRiskStatus', 'neurologicDisorderStatus', 'neoplasiaHistoryOrRiskStatus']
      .forEach(function (field) { enumValue(input.comorbidities, field, normalizeTriState, ['yes', 'no', 'not_recorded'], 'comorbidities'); });
    enumValue(input.requestedTreatment, 'inductionStatus', normalizeTriState, ['yes', 'no', 'not_recorded'], 'requestedTreatment');
    enumValue(input.validatedTreatment, 'inductionStatus', normalizeTriState, ['yes', 'no', 'not_recorded'], 'validatedTreatment');
    return { valid: errors.length === 0, errors: errors };
  }

  function assign(event, target, source, map, normalizers) {
    if (!plain(source)) return;
    Object.keys(map).forEach(function (key) {
      if (!own(source, key)) return;
      var value = source[key];
      if (normalizers && normalizers[key]) value = normalizers[key](value);
      event[map[key]] = value === undefined || value === '' ? null : value;
    });
  }

  function buildValidationEvent(input) {
    var core = root.FarmaciaExportV2Core;
    if (!core || core.EVENT_SCHEMA_VERSION !== CORE_VERSION) fail('CORE_UNAVAILABLE', 'FarmaciaExportV2Core 2.0.0-draft.1 is required.');
    var validation = validateValidationInput(input);
    if (!validation.valid) fail('INVALID_VALIDATION_INPUT', 'Validation input failed.', validation.errors);
    var t = input.technical;
    var event = {
      event_schema_version: core.EVENT_SCHEMA_VERSION,
      event_id: t.eventId,
      source_event_id: t.sourceEventId,
      event_type: 'pharmacy_validation',
      event_status: t.eventStatus,
      occurred_at: t.occurredAt,
      recorded_at: t.recordedAt,
      demo_flag: t.demoFlag,
      patient_id: t.patientId,
      validation_id: t.validationId
    };
    assign(event, null, t, {
      requestId: 'request_id', hospitalCode: 'hospital_code', professionalRef: 'professional_ref', identifierSystem: 'identifier_system',
      validatedTreatmentId: 'validated_treatment_id', validatedLineId: 'validated_line_id', lineCreationStatus: 'line_creation_status',
      prebiologicRequired: 'prebiologic_required', prebiologicOverallStatus: 'prebiologic_overall_status',
      preventiveMedicineStatus: 'preventive_medicine_status', validationBlockers: 'validation_blockers_json'
    }, { prebiologicRequired: normalizeTriState });
    assign(event, null, input.context, {
      identifierValue: 'identifier_value', serviceCode: 'service_code', serviceLabel: 'service_label', pathologyCode: 'pathology_code',
      pathologyLabel: 'pathology_label', professionalDisplay: 'professional_display'
    });
    assign(event, null, input.request, {
      origin: 'request_origin', date: 'request_date', validationType: 'validation_type', appointmentDate: 'pharmacy_appointment_date',
      weightText: 'requested_weight_text', justification: 'requested_justification', sourceObservations: 'request_source_observations'
    });
    assign(event, null, input.requestedTreatment, {
      drugName: 'requested_drug_name', activeIngredient: 'requested_active_ingredient', presentation: 'requested_presentation', doseText: 'requested_dose_text',
      route: 'requested_route', scheduleCode: 'requested_schedule_code', scheduleLabel: 'requested_schedule_label', scheduleOtherText: 'requested_schedule_other_text',
      inductionStatus: 'requested_induction_status', selectedDrugId: 'requested_selected_drug_id', catalogSource: 'requested_catalog_source',
      nationalCode: 'requested_national_code', registrationNumber: 'requested_registration_number'
    }, { inductionStatus: normalizeTriState });
    assign(event, null, input.decision, {
      result: 'validation_result', pendingReason: 'validation_pending_reason', denialReason: 'validation_denial_reason',
      pharmacyObservations: 'pharmacy_observations', otherObservations: 'other_validation_observations', validatedTreatmentRelation: 'validated_treatment_relation'
    }, { result: normalizeValidationResult, validatedTreatmentRelation: normalizeValidatedTreatmentRelation });
    assign(event, null, input.validatedTreatment, {
      drugName: 'validated_drug_name', activeIngredient: 'validated_active_ingredient', presentation: 'validated_presentation', doseText: 'validated_dose_text',
      route: 'validated_route', scheduleCode: 'validated_schedule_code', scheduleLabel: 'validated_schedule_label', scheduleOtherText: 'validated_schedule_other_text',
      inductionStatus: 'validated_induction_status', selectedDrugId: 'validated_selected_drug_id', catalogSource: 'validated_catalog_source',
      nationalCode: 'validated_national_code', registrationNumber: 'validated_registration_number'
    }, { inductionStatus: normalizeTriState });
    assign(event, null, input.prebiologic, {
      analysisDate: 'analysis_date', analysisRecentStatus: 'analysis_recent_status', hemogramVerified: 'hemogram_verified', biochemistryVerified: 'biochemistry_verified',
      tbStatus: 'tb_status', hbvStatus: 'hbv_status', hcvStatus: 'hcv_status', hivStatus: 'hiv_status', vaccinationStatus: 'vaccination_status',
      vaccinationObservations: 'vaccination_observations'
    }, {
      analysisRecentStatus: normalizeTriState, tbStatus: normalizeTbStatus, hbvStatus: normalizeSerologyStatus,
      hcvStatus: normalizeSerologyStatus, hivStatus: normalizeSerologyStatus, vaccinationStatus: normalizeVaccinationStatus
    });
    assign(event, null, input.comorbidities, {
      recurrentInfectionsStatus: 'recurrent_infections_status', cardiovascularRiskStatus: 'cardiovascular_risk_status',
      neurologicDisorderStatus: 'neurologic_disorder_status', neoplasiaHistoryOrRiskStatus: 'neoplasia_history_or_risk_status'
    }, {
      recurrentInfectionsStatus: normalizeTriState, cardiovascularRiskStatus: normalizeTriState,
      neurologicDisorderStatus: normalizeTriState, neoplasiaHistoryOrRiskStatus: normalizeTriState
    });
    if (own(input, 'clinicalObservations')) event.clinical_observations_json = input.clinicalObservations;
    if (own(input, 'relatedTreatments')) event.related_treatments_json = input.relatedTreatments;
    try { return core.createEventEnvelope(event); }
    catch (error) { fail('CORE_EVENT_REJECTED', 'Core rejected validation event.', { code: error.code, details: error.details }); }
  }

  function buildValidationProjection(input) {
    var core = root.FarmaciaExportV2Core;
    var event = buildValidationEvent(input);
    var rows;
    try { rows = core.projectEventRows(event, [{ rowKey: input.technical.rowKey }]); }
    catch (error) { fail('CORE_PROJECTION_REJECTED', 'Core rejected validation projection.', { code: error.code, details: error.details }); }
    return { event: event, rows: rows, row: rows[0], tsv: core.serializeRowsToTsv(rows) };
  }

  root.FarmaciaExportV2ValidationAdapter = Object.freeze({
    ADAPTER_VERSION: ADAPTER_VERSION,
    buildValidationEvent: buildValidationEvent,
    buildValidationProjection: buildValidationProjection,
    validateValidationInput: validateValidationInput,
    normalizeTriState: normalizeTriState,
    normalizeTbStatus: normalizeTbStatus,
    normalizeSerologyStatus: normalizeSerologyStatus,
    normalizeVaccinationStatus: normalizeVaccinationStatus,
    normalizeValidationResult: normalizeValidationResult,
    normalizeValidatedTreatmentRelation: normalizeValidatedTreatmentRelation
  });
})(typeof window !== 'undefined' ? window : globalThis);
