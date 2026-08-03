/* Farmacia Export v2 Followup active-lines adapter (internal candidate; no public cutover). */
(function (root) {
  'use strict';

  var ADAPTER_VERSION = '1.0.0-draft.1';
  var CORE_VERSION = '2.0.0-draft.1';
  var TOP_LEVEL_FIELDS = ['technical', 'context', 'visit', 'activeLines'];
  var BLOCK_FIELDS = {
    technical: ['eventId', 'sourceEventId', 'visitId', 'patientId', 'occurredAt', 'recordedAt', 'demoFlag', 'eventStatus', 'hospitalCode', 'professionalRef', 'identifierSystem'],
    context: ['identifierValue', 'serviceCode', 'serviceLabel', 'pathologyCode', 'pathologyLabel', 'professionalDisplay'],
    visit: ['visitDate']
  };
  var LINE_FIELDS = [
    'rowKey', 'treatmentId', 'lineId', 'lineRole', 'isPrimaryLine', 'lineStatusAtEvent', 'activeAtEvent',
    'drugName', 'activeIngredient', 'presentation', 'doseText', 'route', 'scheduleCode', 'scheduleLabel',
    'scheduleOtherText', 'selectedDrugId', 'catalogSource', 'nationalCode', 'registrationNumber'
  ];
  var LINE_ROLE_VALUES = ['principal', 'additional'];
  var PLACEHOLDERS = ['—', 'no informado'];

  function AdapterError(code, message, details) {
    this.name = 'FarmaciaExportV2FollowupActiveLinesAdapterError';
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
  function isPlaceholder(value) {
    return typeof value === 'string' && PLACEHOLDERS.indexOf(normalizedKey(value)) !== -1;
  }
  function isEmptyOrWhitespace(value) {
    return typeof value === 'string' && value.trim() === '';
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
  function validateRequiredString(source, field, path, errors) {
    if (!own(source, field)) { push(errors, 'MISSING_REQUIRED', path + '.' + field); return; }
    if (typeof source[field] !== 'string') push(errors, 'INVALID_TYPE', path + '.' + field, { expected: 'non-empty string' });
    else if (isEmptyOrWhitespace(source[field])) push(errors, 'EMPTY_REQUIRED', path + '.' + field);
    else if (isPlaceholder(source[field])) push(errors, 'PLACEHOLDER_NOT_ALLOWED', path + '.' + field);
  }
  function validateActiveLines(value, errors) {
    if (!Array.isArray(value) || value.length < 1) { push(errors, 'EMPTY_ACTIVE_LINES', 'activeLines'); return; }
    var rowKeys = Object.create(null);
    var lineIds = Object.create(null);
    var primaryCount = 0;
    value.forEach(function (line, index) {
      var path = 'activeLines[' + index + ']';
      if (!validateClosedObject(line, LINE_FIELDS, path, errors)) return;
      ['rowKey', 'treatmentId', 'lineId', 'lineRole', 'lineStatusAtEvent'].forEach(function (field) { validateRequiredString(line, field, path, errors); });
      if (!own(line, 'isPrimaryLine')) push(errors, 'MISSING_REQUIRED', path + '.isPrimaryLine');
      else if (typeof line.isPrimaryLine !== 'boolean') push(errors, 'INVALID_TYPE', path + '.isPrimaryLine');
      else if (line.isPrimaryLine) primaryCount += 1;
      if (!own(line, 'activeAtEvent')) push(errors, 'MISSING_REQUIRED', path + '.activeAtEvent');
      else if (typeof line.activeAtEvent !== 'boolean') push(errors, 'INVALID_TYPE', path + '.activeAtEvent');
      else if (line.activeAtEvent !== true) push(errors, 'FOLLOWUP_LINE_MUST_BE_ACTIVE', path + '.activeAtEvent');
      if (own(line, 'lineStatusAtEvent') && line.lineStatusAtEvent !== 'active') push(errors, 'FOLLOWUP_LINE_STATUS', path + '.lineStatusAtEvent');
      if (typeof line.isPrimaryLine === 'boolean' && own(line, 'lineRole')) {
        if (LINE_ROLE_VALUES.indexOf(line.lineRole) === -1) push(errors, 'INVALID_LINE_ROLE', path + '.lineRole', { allowed: LINE_ROLE_VALUES.slice() });
        else if ((line.lineRole === 'principal') !== line.isPrimaryLine) push(errors, 'INVALID_PRIMARY_COHERENCE', path);
      }
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
    if (primaryCount > 1) push(errors, 'MULTIPLE_PRIMARY_LINES', 'activeLines', { max: 1, actual: primaryCount });
  }

  function validateFollowupInput(input) {
    var errors = [];
    if (!plain(input)) return { valid: false, errors: [{ code: 'INVALID_OBJECT', field: null }] };
    Object.keys(input).forEach(function (key) { if (TOP_LEVEL_FIELDS.indexOf(key) === -1) push(errors, 'UNKNOWN_FIELD', key); });
    TOP_LEVEL_FIELDS.forEach(function (key) { if (!own(input, key)) push(errors, 'MISSING_REQUIRED', key); });
    Object.keys(BLOCK_FIELDS).forEach(function (block) {
      if (!validateClosedObject(input[block], BLOCK_FIELDS[block], block, errors)) return;
      BLOCK_FIELDS[block].forEach(function (field) {
        if (block === 'technical' && field === 'demoFlag') return;
        validateNullableString(input[block], field, block, errors);
      });
    });
    if (plain(input.technical)) {
      ['eventId', 'sourceEventId', 'visitId', 'patientId', 'occurredAt', 'recordedAt', 'eventStatus'].forEach(function (field) { validateRequiredString(input.technical, field, 'technical', errors); });
      if (!own(input.technical, 'demoFlag')) push(errors, 'MISSING_REQUIRED', 'technical.demoFlag');
      else if (typeof input.technical.demoFlag !== 'boolean') push(errors, 'INVALID_TYPE', 'technical.demoFlag');
      ['occurredAt', 'recordedAt'].forEach(function (field) {
        if (own(input.technical, field) && !isIsoDateOrTimestamp(input.technical[field])) push(errors, 'INVALID_ISO_DATE', 'technical.' + field);
      });
    }
    if (plain(input.visit)) {
      validateRequiredString(input.visit, 'visitDate', 'visit', errors);
      if (own(input.visit, 'visitDate') && !isIsoDateOnly(input.visit.visitDate)) push(errors, 'INVALID_VISIT_DATE', 'visit.visitDate');
    }
    validateActiveLines(input.activeLines, errors);
    return { valid: errors.length === 0, errors: errors };
  }

  function assign(event, source, map) {
    if (!plain(source)) return;
    Object.keys(map).forEach(function (key) {
      if (!own(source, key)) return;
      var value = source[key];
      if (typeof value === 'string' && value.trim() === '') value = null;
      event[map[key]] = value === undefined ? null : value;
    });
  }
  function toNullableString(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    return value;
  }
  function coreOrFail() {
    var core = root.FarmaciaExportV2Core;
    if (!core || core.EVENT_SCHEMA_VERSION !== CORE_VERSION || core.ROW_SCHEMA_VERSION !== CORE_VERSION) {
      fail('CORE_UNAVAILABLE', 'FarmaciaExportV2Core 2.0.0-draft.1 is required.');
    }
    return core;
  }
  function buildFollowupEvent(input) {
    var core = coreOrFail();
    var validation = validateFollowupInput(input);
    if (!validation.valid) fail('INVALID_FOLLOWUP_INPUT', 'Followup input failed.', validation.errors);
    var t = input.technical;
    var event = {
      event_schema_version: core.EVENT_SCHEMA_VERSION,
      event_id: t.eventId,
      source_event_id: t.sourceEventId,
      event_type: 'pharmacy_followup',
      event_status: t.eventStatus,
      occurred_at: t.occurredAt,
      recorded_at: t.recordedAt,
      demo_flag: t.demoFlag,
      patient_id: t.patientId,
      visit_id: t.visitId
    };
    assign(event, t, { hospitalCode: 'hospital_code', professionalRef: 'professional_ref', identifierSystem: 'identifier_system' });
    assign(event, input.context, {
      identifierValue: 'identifier_value', serviceCode: 'service_code', serviceLabel: 'service_label', pathologyCode: 'pathology_code',
      pathologyLabel: 'pathology_label', professionalDisplay: 'professional_display'
    });
    assign(event, input.visit, { visitDate: 'visit_date' });
    try { return core.createEventEnvelope(event); }
    catch (error) { fail('CORE_EVENT_REJECTED', 'Core rejected Followup event.', { code: error.code, details: error.details }); }
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
      line_drug_name: toNullableString(line.drugName),
      line_active_ingredient: toNullableString(line.activeIngredient),
      line_presentation: toNullableString(line.presentation),
      line_dose_text: toNullableString(line.doseText),
      line_route: toNullableString(line.route),
      line_schedule_code: toNullableString(line.scheduleCode),
      line_schedule_label: toNullableString(line.scheduleLabel),
      line_schedule_other_text: toNullableString(line.scheduleOtherText),
      line_selected_drug_id: toNullableString(line.selectedDrugId),
      line_catalog_source: toNullableString(line.catalogSource),
      line_national_code: toNullableString(line.nationalCode),
      line_registration_number: toNullableString(line.registrationNumber)
    };
  }
  function buildFollowupProjection(input) {
    var core = coreOrFail();
    var event = buildFollowupEvent(input);
    var rows;
    try { rows = core.projectEventRows(event, input.activeLines.map(linePayload)); }
    catch (error) { fail('CORE_PROJECTION_REJECTED', 'Core rejected Followup projection.', { code: error.code, details: error.details }); }
    return { event: event, rows: rows, tsv: core.serializeRowsToTsv(rows) };
  }

  root.FarmaciaExportV2FollowupActiveLinesAdapter = Object.freeze({
    ADAPTER_VERSION: ADAPTER_VERSION,
    buildFollowupEvent: buildFollowupEvent,
    buildFollowupProjection: buildFollowupProjection,
    validateFollowupInput: validateFollowupInput
  });
})(typeof window !== 'undefined' ? window : globalThis);
