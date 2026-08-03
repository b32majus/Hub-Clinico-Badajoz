/* Farmacia Export v2 First Visit adapter (internal candidate; no public cutover). */
(function (root) {
  'use strict';

  var ADAPTER_VERSION = '1.0.0-draft.1';
  var CORE_VERSION = '2.0.0-draft.1';
  var TOP_LEVEL_FIELDS = ['technical', 'context', 'visit', 'proms', 'lines'];
  var BLOCK_FIELDS = {
    technical: ['eventId', 'sourceEventId', 'firstVisitId', 'patientId', 'occurredAt', 'recordedAt', 'demoFlag', 'eventStatus', 'hospitalCode', 'professionalRef', 'identifierSystem'],
    context: ['identifierValue', 'serviceCode', 'serviceLabel', 'pathologyCode', 'pathologyLabel', 'professionalDisplay'],
    visit: ['firstVisitDate', 'inductionPerformedStatus', 'stratificationLevel', 'baselinePromsCollectionStatus', 'pharmacyVisitNotes']
  };
  var LINE_FIELDS = [
    'rowKey', 'treatmentId', 'lineId', 'lineRole', 'isPrimaryLine', 'lineStatusAtEvent', 'activeAtEvent',
    'drugName', 'activeIngredient', 'presentation', 'doseText', 'route', 'scheduleCode', 'scheduleLabel',
    'scheduleOtherText', 'selectedDrugId', 'catalogSource', 'nationalCode', 'registrationNumber'
  ];
  var PROM_FIELDS = ['instrument', 'value', 'complete', 'answeredCount', 'answers'];
  var DLQI_ANSWER_FIELDS = ['item', 'score', 'response'];
  var PLACEHOLDERS = ['—', 'no informado'];

  function AdapterError(code, message, details) {
    this.name = 'FarmaciaExportV2FirstVisitAdapterError';
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
  function push(errors, code, field, details) {
    var error = { code: code, field: field };
    if (details !== undefined) error.details = details;
    errors.push(error);
  }
  function normalizedKey(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function normalizeTriState(value) {
    var key = normalizedKey(value);
    if (!key || key === 'no informado') return null;
    if (key === 'si' || key === 'yes') return 'yes';
    if (key === 'no') return 'no';
    if (key === 'not_recorded') return 'not_recorded';
    return value;
  }
  function isPlaceholder(value) {
    return typeof value === 'string' && PLACEHOLDERS.indexOf(normalizedKey(value)) !== -1;
  }
  function isIsoDateOnly(value) {
    if (typeof value !== 'string') return false;
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    if (year < 1 || month < 1 || month > 12) return false;
    var leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    var days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day >= 1 && day <= days[month - 1];
  }
  function isIsoDateOrTimestamp(value) {
    if (isIsoDateOnly(value)) return true;
    if (typeof value !== 'string') return false;
    var match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
    if (!match || !isIsoDateOnly(match[1])) return false;
    if (Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59) return false;
    if (match[5] !== 'Z') {
      var offsetHour = Number(match[7]);
      var offsetMinute = Number(match[8]);
      if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) return false;
    }
    return true;
  }
  function validateClosedObject(value, allowed, path, errors) {
    if (!plain(value)) { push(errors, 'INVALID_OBJECT', path); return false; }
    Object.keys(value).forEach(function (key) {
      if (allowed.indexOf(key) === -1) push(errors, 'UNKNOWN_FIELD', path ? path + '.' + key : key);
    });
    return true;
  }
  function validateNullableString(source, field, path, errors) {
    if (!own(source, field)) return;
    var value = source[field];
    if (value !== null && typeof value !== 'string') push(errors, 'INVALID_TYPE', path + '.' + field, { expected: 'string or null' });
    else if (isPlaceholder(value)) push(errors, 'PLACEHOLDER_NOT_ALLOWED', path + '.' + field);
  }
  function validateTriStateString(source, field, path, errors) {
    if (!own(source, field)) return;
    var value = source[field];
    if (value !== null && typeof value !== 'string') push(errors, 'INVALID_TYPE', path + '.' + field, { expected: 'string or null' });
    else if (isPlaceholder(value) && normalizedKey(value) !== 'no informado') push(errors, 'PLACEHOLDER_NOT_ALLOWED', path + '.' + field);
  }
  function validateRequiredString(source, field, path, errors) {
    if (!own(source, field)) { push(errors, 'MISSING_REQUIRED', path + '.' + field); return; }
    if (typeof source[field] !== 'string') push(errors, 'INVALID_TYPE', path + '.' + field, { expected: 'non-empty string' });
    else if (!source[field].trim()) push(errors, 'EMPTY_REQUIRED', path + '.' + field);
    else if (isPlaceholder(source[field])) push(errors, 'PLACEHOLDER_NOT_ALLOWED', path + '.' + field);
  }
  function validateProms(value, errors) {
    if (value === null) return;
    if (!Array.isArray(value)) { push(errors, 'INVALID_ARRAY', 'proms'); return; }
    var seen = Object.create(null);
    value.forEach(function (prom, index) {
      var path = 'proms[' + index + ']';
      if (!validateClosedObject(prom, PROM_FIELDS, path, errors)) return;
      PROM_FIELDS.forEach(function (field) { if (!own(prom, field)) push(errors, 'MISSING_REQUIRED', path + '.' + field); });
      if (['DLQI', 'EVA_DOLOR', 'EVA_PRURITO'].indexOf(prom.instrument) === -1) push(errors, 'INVALID_ENUM', path + '.instrument');
      else if (seen[prom.instrument]) push(errors, 'DUPLICATE_PROM', path + '.instrument');
      else seen[prom.instrument] = true;
      if (typeof prom.value !== 'number' || !Number.isFinite(prom.value)) push(errors, 'INVALID_FINITE_NUMBER', path + '.value');
      if (typeof prom.complete !== 'boolean') push(errors, 'INVALID_TYPE', path + '.complete');
      if (!Number.isInteger(prom.answeredCount) || prom.answeredCount < 0) push(errors, 'INVALID_ANSWERED_COUNT', path + '.answeredCount');
      if (prom.instrument === 'DLQI') {
        if (!Array.isArray(prom.answers)) { push(errors, 'INVALID_ARRAY', path + '.answers'); return; }
        var items = Object.create(null);
        var total = 0;
        var explicitAnswerCount = 0;
        for (var answerIndex = 0; answerIndex < prom.answers.length; answerIndex += 1) {
          var answerPath = path + '.answers[' + answerIndex + ']';
          if (!own(prom.answers, answerIndex)) {
            push(errors, 'SPARSE_DLQI_ANSWERS', answerPath);
            continue;
          }
          var answer = prom.answers[answerIndex];
          if (!validateClosedObject(answer, DLQI_ANSWER_FIELDS, answerPath, errors)) continue;
          explicitAnswerCount += 1;
          DLQI_ANSWER_FIELDS.forEach(function (field) { if (!own(answer, field)) push(errors, 'MISSING_REQUIRED', answerPath + '.' + field); });
          if (!Number.isInteger(answer.item) || answer.item < 1 || answer.item > 10) push(errors, 'INVALID_DLQI_ITEM', answerPath + '.item');
          else if (items[answer.item]) push(errors, 'DUPLICATE_DLQI_ITEM', answerPath + '.item');
          else items[answer.item] = true;
          if (!Number.isInteger(answer.score) || answer.score < 0 || answer.score > 3) push(errors, 'INVALID_DLQI_SCORE', answerPath + '.score');
          else total += answer.score;
          if (typeof answer.response !== 'string' || !answer.response.trim() || isPlaceholder(answer.response)) push(errors, 'INVALID_DLQI_RESPONSE', answerPath + '.response');
        }
        if (explicitAnswerCount < 1) push(errors, 'EMPTY_DLQI_ANSWERS', path + '.answers');
        if (prom.answeredCount !== explicitAnswerCount) push(errors, 'ANSWER_COUNT_MISMATCH', path + '.answeredCount');
        if (prom.complete !== (explicitAnswerCount === 10 && prom.answers.length === 10)) push(errors, 'COMPLETE_MISMATCH', path + '.complete');
        if (typeof prom.value === 'number' && Number.isFinite(prom.value) && prom.value !== total) push(errors, 'PROM_VALUE_MISMATCH', path + '.value');
      } else {
        if (prom.answers !== null) push(errors, 'EVA_ANSWERS_MUST_BE_NULL', path + '.answers');
        if (prom.answeredCount !== 1) push(errors, 'EVA_ANSWER_COUNT', path + '.answeredCount');
        if (prom.complete !== true) push(errors, 'EVA_MUST_BE_COMPLETE', path + '.complete');
        if (typeof prom.value === 'number' && Number.isFinite(prom.value) && (prom.value < 0 || prom.value > 10)) push(errors, 'INVALID_EVA_VALUE', path + '.value');
      }
    });
  }
  function validateLines(value, errors) {
    if (!Array.isArray(value) || value.length < 1) { push(errors, 'EMPTY_LINES', 'lines'); return; }
    var rowKeys = Object.create(null);
    var lineIds = Object.create(null);
    var primaryCount = 0;
    value.forEach(function (line, index) {
      var path = 'lines[' + index + ']';
      if (!validateClosedObject(line, LINE_FIELDS, path, errors)) return;
      ['rowKey', 'treatmentId', 'lineId', 'lineRole', 'lineStatusAtEvent'].forEach(function (field) { validateRequiredString(line, field, path, errors); });
      if (!own(line, 'isPrimaryLine')) push(errors, 'MISSING_REQUIRED', path + '.isPrimaryLine');
      else if (typeof line.isPrimaryLine !== 'boolean') push(errors, 'INVALID_TYPE', path + '.isPrimaryLine');
      else if (line.isPrimaryLine) primaryCount += 1;
      if (!own(line, 'activeAtEvent')) push(errors, 'MISSING_REQUIRED', path + '.activeAtEvent');
      else if (typeof line.activeAtEvent !== 'boolean') push(errors, 'INVALID_TYPE', path + '.activeAtEvent');
      else if (line.activeAtEvent !== true) push(errors, 'FIRST_VISIT_LINE_MUST_BE_ACTIVE', path + '.activeAtEvent');
      if (own(line, 'lineStatusAtEvent') && line.lineStatusAtEvent !== 'active') push(errors, 'FIRST_VISIT_LINE_STATUS', path + '.lineStatusAtEvent');
      LINE_FIELDS.slice(7).forEach(function (field) { validateNullableString(line, field, path, errors); });
      var identifiable = ['drugName', 'activeIngredient'].some(function (field) {
        return own(line, field) && typeof line[field] === 'string' && line[field].trim() && !isPlaceholder(line[field]);
      });
      if (!identifiable) push(errors, 'LINE_NOT_IDENTIFIABLE', path);
      if (typeof line.rowKey === 'string' && line.rowKey.trim()) {
        if (rowKeys[line.rowKey]) push(errors, 'DUPLICATE_ROW_KEY', path + '.rowKey');
        rowKeys[line.rowKey] = true;
      }
      if (typeof line.lineId === 'string' && line.lineId.trim()) {
        if (lineIds[line.lineId]) push(errors, 'DUPLICATE_LINE_ID', path + '.lineId');
        lineIds[line.lineId] = true;
      }
    });
    if (primaryCount !== 1) push(errors, 'PRIMARY_LINE_COUNT', 'lines', { expected: 1, actual: primaryCount });
  }

  function validateFirstVisitInput(input) {
    var errors = [];
    if (!plain(input)) return { valid: false, errors: [{ code: 'INVALID_OBJECT', field: null }] };
    Object.keys(input).forEach(function (key) { if (TOP_LEVEL_FIELDS.indexOf(key) === -1) push(errors, 'UNKNOWN_FIELD', key); });
    TOP_LEVEL_FIELDS.forEach(function (key) { if (!own(input, key)) push(errors, 'MISSING_REQUIRED', key); });
    Object.keys(BLOCK_FIELDS).forEach(function (block) {
      if (!validateClosedObject(input[block], BLOCK_FIELDS[block], block, errors)) return;
      BLOCK_FIELDS[block].forEach(function (field) {
        if (block === 'technical' && field === 'demoFlag') return;
        if (block === 'visit' && (field === 'inductionPerformedStatus' || field === 'baselinePromsCollectionStatus')) {
          validateTriStateString(input[block], field, block, errors);
        } else {
          validateNullableString(input[block], field, block, errors);
        }
      });
    });
    if (plain(input.technical)) {
      ['eventId', 'sourceEventId', 'firstVisitId', 'patientId', 'occurredAt', 'recordedAt', 'eventStatus'].forEach(function (field) { validateRequiredString(input.technical, field, 'technical', errors); });
      if (!own(input.technical, 'demoFlag')) push(errors, 'MISSING_REQUIRED', 'technical.demoFlag');
      else if (typeof input.technical.demoFlag !== 'boolean') push(errors, 'INVALID_TYPE', 'technical.demoFlag');
      ['occurredAt', 'recordedAt'].forEach(function (field) {
        if (own(input.technical, field) && !isIsoDateOrTimestamp(input.technical[field])) push(errors, 'INVALID_ISO_DATE', 'technical.' + field);
      });
    }
    if (plain(input.visit)) {
      validateRequiredString(input.visit, 'firstVisitDate', 'visit', errors);
      if (own(input.visit, 'firstVisitDate') && !isIsoDateOnly(input.visit.firstVisitDate)) push(errors, 'INVALID_FIRST_VISIT_DATE', 'visit.firstVisitDate');
      ['inductionPerformedStatus', 'baselinePromsCollectionStatus'].forEach(function (field) {
        if (!own(input.visit, field)) return;
        var normalized = normalizeTriState(input.visit[field]);
        if (normalized !== null && ['yes', 'no', 'not_recorded'].indexOf(normalized) === -1) push(errors, 'INVALID_ENUM', 'visit.' + field);
      });
    }
    validateProms(input.proms, errors);
    if (plain(input.visit)) {
      var status = own(input.visit, 'baselinePromsCollectionStatus') ? normalizeTriState(input.visit.baselinePromsCollectionStatus) : null;
      if (status === 'yes' && (!Array.isArray(input.proms) || input.proms.length < 1)) push(errors, 'PROMS_REQUIRED', 'proms');
      if (status !== 'yes' && input.proms !== null) push(errors, 'PROMS_MUST_BE_NULL', 'proms');
    }
    validateLines(input.lines, errors);
    return { valid: errors.length === 0, errors: errors };
  }

  function assign(event, source, map, normalizers) {
    if (!plain(source)) return;
    Object.keys(map).forEach(function (key) {
      if (!own(source, key)) return;
      var value = source[key];
      if (normalizers && normalizers[key]) value = normalizers[key](value);
      event[map[key]] = value === undefined || value === '' ? null : value;
    });
  }
  function coreOrFail() {
    var core = root.FarmaciaExportV2Core;
    if (!core || core.EVENT_SCHEMA_VERSION !== CORE_VERSION || core.ROW_SCHEMA_VERSION !== CORE_VERSION) {
      fail('CORE_UNAVAILABLE', 'FarmaciaExportV2Core 2.0.0-draft.1 is required.');
    }
    return core;
  }
  function buildFirstVisitEvent(input) {
    var core = coreOrFail();
    var validation = validateFirstVisitInput(input);
    if (!validation.valid) fail('INVALID_FIRST_VISIT_INPUT', 'First Visit input failed.', validation.errors);
    var t = input.technical;
    var event = {
      event_schema_version: core.EVENT_SCHEMA_VERSION,
      event_id: t.eventId,
      source_event_id: t.sourceEventId,
      event_type: 'pharmacy_first_visit',
      event_status: t.eventStatus,
      occurred_at: t.occurredAt,
      recorded_at: t.recordedAt,
      demo_flag: t.demoFlag,
      patient_id: t.patientId,
      first_visit_id: t.firstVisitId
    };
    assign(event, t, { hospitalCode: 'hospital_code', professionalRef: 'professional_ref', identifierSystem: 'identifier_system' });
    assign(event, input.context, {
      identifierValue: 'identifier_value', serviceCode: 'service_code', serviceLabel: 'service_label', pathologyCode: 'pathology_code',
      pathologyLabel: 'pathology_label', professionalDisplay: 'professional_display'
    });
    assign(event, input.visit, {
      firstVisitDate: 'first_visit_date', inductionPerformedStatus: 'induction_performed_status', stratificationLevel: 'stratification_level',
      baselinePromsCollectionStatus: 'baseline_proms_collection_status', pharmacyVisitNotes: 'pharmacy_visit_notes'
    }, { inductionPerformedStatus: normalizeTriState, baselinePromsCollectionStatus: normalizeTriState });
    event.proms_json = input.proms;
    try { return core.createEventEnvelope(event); }
    catch (error) { fail('CORE_EVENT_REJECTED', 'Core rejected First Visit event.', { code: error.code, details: error.details }); }
  }
  function linePayload(line) {
    return {
      rowKey: line.rowKey,
      treatment_id: line.treatmentId,
      line_id: line.lineId,
      line_role: line.lineRole,
      is_primary_line: line.isPrimaryLine,
      line_status_at_event: line.lineStatusAtEvent,
      active_at_event: line.activeAtEvent,
      line_drug_name: own(line, 'drugName') && line.drugName !== '' ? line.drugName : null,
      line_active_ingredient: own(line, 'activeIngredient') && line.activeIngredient !== '' ? line.activeIngredient : null,
      line_presentation: own(line, 'presentation') && line.presentation !== '' ? line.presentation : null,
      line_dose_text: own(line, 'doseText') && line.doseText !== '' ? line.doseText : null,
      line_route: own(line, 'route') && line.route !== '' ? line.route : null,
      line_schedule_code: own(line, 'scheduleCode') && line.scheduleCode !== '' ? line.scheduleCode : null,
      line_schedule_label: own(line, 'scheduleLabel') && line.scheduleLabel !== '' ? line.scheduleLabel : null,
      line_schedule_other_text: own(line, 'scheduleOtherText') && line.scheduleOtherText !== '' ? line.scheduleOtherText : null,
      line_selected_drug_id: own(line, 'selectedDrugId') && line.selectedDrugId !== '' ? line.selectedDrugId : null,
      line_catalog_source: own(line, 'catalogSource') && line.catalogSource !== '' ? line.catalogSource : null,
      line_national_code: own(line, 'nationalCode') && line.nationalCode !== '' ? line.nationalCode : null,
      line_registration_number: own(line, 'registrationNumber') && line.registrationNumber !== '' ? line.registrationNumber : null
    };
  }
  function buildFirstVisitProjection(input) {
    var core = coreOrFail();
    var event = buildFirstVisitEvent(input);
    var rows;
    try { rows = core.projectEventRows(event, input.lines.map(linePayload)); }
    catch (error) { fail('CORE_PROJECTION_REJECTED', 'Core rejected First Visit projection.', { code: error.code, details: error.details }); }
    return { event: event, rows: rows, tsv: core.serializeRowsToTsv(rows) };
  }

  root.FarmaciaExportV2FirstVisitAdapter = Object.freeze({
    ADAPTER_VERSION: ADAPTER_VERSION,
    buildFirstVisitEvent: buildFirstVisitEvent,
    buildFirstVisitProjection: buildFirstVisitProjection,
    validateFirstVisitInput: validateFirstVisitInput,
    normalizeTriState: normalizeTriState
  });
})(typeof window !== 'undefined' ? window : globalThis);
