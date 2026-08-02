/* Farmacia Export v2 canonical core (candidate; not wired to public outputs). */
(function (root) {
  'use strict';

  var EVENT_SCHEMA_VERSION = '2.0.0-draft.1';
  var ROW_SCHEMA_VERSION = '2.0.0-draft.1';

  var BLOCKS = [
    ['bridge', ['bridge_status', 'bridge_processed_at', 'bridge_error_code', 'bridge_error_detail', 'event_schema_version', 'row_schema_version', 'event_id', 'source_event_id', 'row_id', 'row_role', 'row_index', 'row_count', 'event_type', 'event_status', 'occurred_at', 'recorded_at', 'demo_flag']],
    ['patient_context', ['patient_id', 'identifier_system', 'identifier_value', 'hospital_code', 'service_code', 'service_label', 'pathology_code', 'pathology_label', 'professional_ref', 'professional_display']],
    ['references', ['request_id', 'validation_id', 'first_visit_id', 'visit_id', 'treatment_id', 'line_id', 'adverse_event_id']],
    ['request', ['request_origin', 'request_date', 'validation_type', 'pharmacy_appointment_date', 'requested_drug_name', 'requested_active_ingredient', 'requested_presentation', 'requested_dose_text', 'requested_route', 'requested_schedule_code', 'requested_schedule_label', 'requested_schedule_other_text', 'requested_induction_status', 'requested_weight_text', 'requested_justification', 'request_source_observations', 'requested_selected_drug_id', 'requested_catalog_source', 'requested_national_code', 'requested_registration_number']],
    ['validation', ['validation_result', 'validation_pending_reason', 'validation_denial_reason', 'pharmacy_observations', 'other_validation_observations', 'validated_treatment_relation', 'validated_drug_name', 'validated_active_ingredient', 'validated_presentation', 'validated_dose_text', 'validated_route', 'validated_schedule_code', 'validated_schedule_label', 'validated_schedule_other_text', 'validated_induction_status', 'validated_selected_drug_id', 'validated_catalog_source', 'validated_national_code', 'validated_registration_number', 'validated_treatment_id', 'validated_line_id', 'line_creation_status']],
    ['transversal', ['prebiologic_required', 'prebiologic_overall_status', 'analysis_date', 'analysis_recent_status', 'hemogram_verified', 'biochemistry_verified', 'tb_status', 'hbv_status', 'hcv_status', 'hiv_status', 'vaccination_status', 'vaccination_observations', 'preventive_medicine_status', 'validation_blockers_json', 'recurrent_infections_status', 'cardiovascular_risk_status', 'neurologic_disorder_status', 'neoplasia_history_or_risk_status', 'clinical_observations_json', 'related_treatments_json']],
    ['line_snapshot', ['line_role', 'is_primary_line', 'line_status_at_event', 'active_at_event', 'line_drug_name', 'line_active_ingredient', 'line_presentation', 'line_dose_text', 'line_route', 'line_schedule_code', 'line_schedule_label', 'line_schedule_other_text', 'line_selected_drug_id', 'line_catalog_source', 'line_national_code', 'line_registration_number']],
    ['first_visit', ['first_visit_date', 'induction_performed_status', 'stratification_level', 'baseline_proms_collection_status', 'pharmacy_visit_notes', 'proms_json']],
    ['followup', ['visit_date', 'stratification_review_status', 'previous_stratification_level', 'new_stratification_level', 'stratification_change_reason', 'followup_proms_collection_status', 'visit_general_observations', 'dispensation_status', 'dispensation_observations', 'specific_review_status', 'specific_review_reason', 'therapeutic_movement_type', 'new_dose_text', 'new_schedule_code', 'new_schedule_label', 'new_schedule_other_text', 'new_route', 'movement_reason', 'movement_effective_date', 'suspension_status', 'suspension_reason', 'suspension_effective_date', 'line_observations', 'adherence_collection_status', 'adherence_instrument', 'adherence_result', 'adherence_answers_json', 'adverse_event_status', 'adverse_event_description', 'adverse_event_severity', 'adverse_event_resolution_status', 'adverse_event_action', 'adverse_event_suspects_json', 'causality_assessments_json']]
  ];

  var ROW_COLUMNS = [];
  BLOCKS.forEach(function (entry) { ROW_COLUMNS = ROW_COLUMNS.concat(entry[1]); });

  var ENUMS = {
    bridge_status: ['PENDIENTE', 'PROCESADA', 'ERROR'],
    event_type: ['pharmacy_validation', 'pharmacy_first_visit', 'pharmacy_followup'],
    row_role: ['validation', 'first_visit_line', 'followup_line'],
    validation_result: ['pending', 'validated', 'denied', 'not_recorded'],
    validated_treatment_relation: ['same_as_requested', 'modified_from_requested', 'no_treatment_validated', 'not_recorded'],
    line_creation_status: ['created', 'updated', 'not_created', 'not_applicable', 'not_recorded'],
    dispensation_status: ['dispensed', 'not_dispensed', 'not_recorded'],
    specific_review_status: ['performed', 'not_performed', 'not_recorded'],
    specific_review_reason: ['dose_or_schedule_change', 'suspension', 'adverse_event', 'adherence_review', 'other', 'not_recorded'],
    therapeutic_movement_type: ['no_change_recorded', 'dose_change', 'schedule_change', 'dose_and_schedule_change', 'suspension', 'other', 'not_recorded'],
    adverse_event_status: ['present', 'absent', 'not_recorded'],
    tb_status: ['negative', 'positive_treated', 'pending', 'not_recorded'],
    hbv_status: ['negative', 'positive', 'pending', 'not_recorded'],
    hcv_status: ['negative', 'positive', 'pending', 'not_recorded'],
    hiv_status: ['negative', 'positive', 'pending', 'not_recorded'],
    vaccination_status: ['yes', 'no', 'pending', 'not_recorded']
  };
  var TRISTATE_FIELDS = ['requested_induction_status', 'validated_induction_status', 'prebiologic_required', 'analysis_recent_status', 'recurrent_infections_status', 'cardiovascular_risk_status', 'neurologic_disorder_status', 'neoplasia_history_or_risk_status', 'induction_performed_status', 'baseline_proms_collection_status', 'stratification_review_status', 'followup_proms_collection_status', 'suspension_status', 'adherence_collection_status'];
  TRISTATE_FIELDS.forEach(function (name) { ENUMS[name] = ['yes', 'no', 'not_recorded']; });

  var INTEGER_FIELDS = ['row_index', 'row_count'];
  var BOOLEAN_FIELDS = ['demo_flag', 'hemogram_verified', 'biochemistry_verified', 'is_primary_line', 'active_at_event'];
  var JSON_FIELDS = ['validation_blockers_json', 'clinical_observations_json', 'related_treatments_json', 'proms_json', 'adherence_answers_json', 'adverse_event_suspects_json', 'causality_assessments_json'];
  var REQUIRED_ROW = ['bridge_status', 'event_schema_version', 'row_schema_version', 'event_id', 'source_event_id', 'row_id', 'row_role', 'row_index', 'row_count', 'event_type', 'event_status', 'occurred_at', 'recorded_at', 'demo_flag', 'patient_id'];
  var REQUIRED_EVENT = ['event_schema_version', 'event_id', 'source_event_id', 'event_type', 'event_status', 'occurred_at', 'recorded_at', 'demo_flag', 'patient_id'];
  var EVENT_EXCLUDED = ['bridge_status', 'bridge_processed_at', 'bridge_error_code', 'bridge_error_detail', 'row_schema_version', 'row_id', 'row_role', 'row_index', 'row_count'];
  var EVENT_FIELDS = ROW_COLUMNS.filter(function (name) { return EVENT_EXCLUDED.indexOf(name) === -1; });
  var ROW_ONLY_FIELDS = [
    'rowKey', 'row_role',
    'treatment_id', 'line_id', 'line_role', 'is_primary_line', 'line_status_at_event', 'active_at_event', 'line_drug_name', 'line_active_ingredient', 'line_presentation', 'line_dose_text', 'line_route', 'line_schedule_code', 'line_schedule_label', 'line_schedule_other_text', 'line_selected_drug_id', 'line_catalog_source', 'line_national_code', 'line_registration_number',
    'dispensation_status', 'dispensation_observations', 'specific_review_status', 'specific_review_reason', 'therapeutic_movement_type', 'new_dose_text', 'new_schedule_code', 'new_schedule_label', 'new_schedule_other_text', 'new_route', 'movement_reason', 'movement_effective_date', 'suspension_status', 'suspension_reason', 'suspension_effective_date', 'line_observations', 'adherence_collection_status', 'adherence_instrument', 'adherence_result', 'adherence_answers_json'
  ];
  EVENT_FIELDS = EVENT_FIELDS.filter(function (name) { return ROW_ONLY_FIELDS.indexOf(name) === -1; });

  function definitionFor(name, block) {
    var type = 'string';
    if (INTEGER_FIELDS.indexOf(name) !== -1) type = 'integer';
    if (BOOLEAN_FIELDS.indexOf(name) !== -1) type = 'boolean';
    if (JSON_FIELDS.indexOf(name) !== -1) type = 'json';
    return Object.freeze({ name: name, block: block, type: type, nullable: REQUIRED_ROW.indexOf(name) === -1, enum: ENUMS[name] ? Object.freeze(ENUMS[name].slice()) : null });
  }

  var FIELD_DEFINITIONS = [];
  BLOCKS.forEach(function (entry) { entry[1].forEach(function (name) { FIELD_DEFINITIONS.push(definitionFor(name, entry[0])); }); });
  ROW_COLUMNS = Object.freeze(ROW_COLUMNS.slice());
  FIELD_DEFINITIONS = Object.freeze(FIELD_DEFINITIONS);

  function CoreError(code, message, details) {
    this.name = 'FarmaciaExportV2CoreError';
    this.code = code;
    this.message = message;
    this.details = details || null;
    if (Error.captureStackTrace) Error.captureStackTrace(this, CoreError);
  }
  CoreError.prototype = Object.create(Error.prototype);
  CoreError.prototype.constructor = CoreError;

  function fail(code, message, details) { throw new CoreError(code, message, details); }
  function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
  function isPlainObject(value) { return value !== null && Object.prototype.toString.call(value) === '[object Object]'; }
  function isNonEmptyString(value) { return typeof value === 'string' && value.length > 0; }
  function isIsoDate(value) {
    if (typeof value !== 'string') return false;
    var match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|([+-])(\d{2}):(\d{2})))?$/.exec(value);
    if (!match) return false;
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    if (year < 1 || month < 1 || month > 12) return false;
    var leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    var daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day < 1 || day > daysInMonth[month - 1]) return false;
    if (match[4] === undefined) return true;
    if (Number(match[4]) > 23 || Number(match[5]) > 59 || Number(match[6]) > 59) return false;
    if (match[8] !== 'Z') {
      var offsetHour = Number(match[10]);
      var offsetMinute = Number(match[11]);
      if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) return false;
    }
    return true;
  }

  function stableStringify(value) {
    var seen = [];
    function visit(item, path) {
      var keys;
      if (item === null || typeof item === 'string' || typeof item === 'boolean') return JSON.stringify(item);
      if (typeof item === 'number') {
        if (!Number.isFinite(item)) fail('NON_JSON_VALUE', 'Only finite JSON numbers are supported.', { path: path });
        return JSON.stringify(item);
      }
      if (Array.isArray(item)) {
        if (seen.indexOf(item) !== -1) fail('CYCLIC_VALUE', 'Cyclic values are not supported.', { path: path });
        seen.push(item);
        var arrayResult = '[' + item.map(function (child, index) {
          if (typeof child === 'undefined' || typeof child === 'function' || typeof child === 'symbol') fail('NON_JSON_VALUE', 'Array contains a non-JSON value.', { path: path + '[' + index + ']' });
          return visit(child, path + '[' + index + ']');
        }).join(',') + ']';
        seen.pop();
        return arrayResult;
      }
      if (isPlainObject(item)) {
        if (seen.indexOf(item) !== -1) fail('CYCLIC_VALUE', 'Cyclic values are not supported.', { path: path });
        seen.push(item);
        keys = Object.keys(item).sort();
        var objectResult = '{' + keys.map(function (key) {
          var child = item[key];
          if (typeof child === 'undefined' || typeof child === 'function' || typeof child === 'symbol') fail('NON_JSON_VALUE', 'Object contains a non-JSON value.', { path: path + '.' + key });
          return JSON.stringify(key) + ':' + visit(child, path + '.' + key);
        }).join(',') + '}';
        seen.pop();
        return objectResult;
      }
      fail('NON_JSON_VALUE', 'Unsupported non-JSON value.', { path: path });
    }
    return visit(value, '$');
  }

  function validateValue(name, value, definition, errors) {
    if (value === null) {
      if (!definition.nullable) errors.push({ code: 'NULL_NOT_ALLOWED', field: name });
      return;
    }
    if (definition.type === 'string' && typeof value !== 'string') errors.push({ code: 'INVALID_TYPE', field: name, expected: 'string' });
    if (definition.type === 'integer' && (!Number.isInteger(value))) errors.push({ code: 'INVALID_TYPE', field: name, expected: 'integer' });
    if (definition.type === 'boolean' && typeof value !== 'boolean') errors.push({ code: 'INVALID_TYPE', field: name, expected: 'boolean' });
    if (definition.type === 'json') {
      if (!(Array.isArray(value) || isPlainObject(value))) errors.push({ code: 'INVALID_TYPE', field: name, expected: 'array or object' });
      else {
        try { stableStringify(value); }
        catch (error) { errors.push({ code: error.code || 'NON_JSON_VALUE', field: name }); }
      }
    }
    if (definition.enum && definition.enum.indexOf(value) === -1) errors.push({ code: 'INVALID_ENUM', field: name, allowed: definition.enum.slice() });
    if (['event_id', 'source_event_id', 'row_id', 'patient_id'].indexOf(name) !== -1 && !isNonEmptyString(value)) errors.push({ code: 'EMPTY_ID', field: name });
    if (['occurred_at', 'recorded_at', 'bridge_processed_at', 'request_date', 'pharmacy_appointment_date', 'analysis_date', 'first_visit_date', 'visit_date', 'movement_effective_date', 'suspension_effective_date'].indexOf(name) !== -1 && value !== null && !isIsoDate(value)) errors.push({ code: 'INVALID_ISO_DATE', field: name });
  }

  function validateObject(object, allowedFields, requiredFields) {
    var errors = [];
    if (!isPlainObject(object)) return { valid: false, errors: [{ code: 'INVALID_OBJECT' }] };
    Object.keys(object).forEach(function (name) {
      if (allowedFields.indexOf(name) === -1) errors.push({ code: 'UNKNOWN_FIELD', field: name });
    });
    requiredFields.forEach(function (name) {
      if (!own(object, name)) errors.push({ code: 'MISSING_REQUIRED', field: name });
    });
    FIELD_DEFINITIONS.forEach(function (definition) {
      if (allowedFields.indexOf(definition.name) !== -1 && own(object, definition.name)) validateValue(definition.name, object[definition.name], definition, errors);
    });
    if (own(object, 'event_schema_version') && object.event_schema_version !== EVENT_SCHEMA_VERSION) errors.push({ code: 'INVALID_SCHEMA_VERSION', field: 'event_schema_version' });
    if (own(object, 'row_schema_version') && object.row_schema_version !== ROW_SCHEMA_VERSION) errors.push({ code: 'INVALID_SCHEMA_VERSION', field: 'row_schema_version' });
    return { valid: errors.length === 0, errors: errors };
  }

  function guardedValidation(callback) {
    try { return callback(); }
    catch (error) { return { valid: false, errors: [{ code: error.code || 'VALIDATION_EXCEPTION', field: null }] }; }
  }

  function validateEvent(event) {
    return guardedValidation(function () { return validateObject(event, EVENT_FIELDS, REQUIRED_EVENT); });
  }
  function validateRow(row) {
    return guardedValidation(function () {
      var result = validateObject(row, ROW_COLUMNS, REQUIRED_ROW);
      if (isPlainObject(row)) {
        if (own(row, 'row_index') && row.row_index < 1) result.errors.push({ code: 'INVALID_ROW_INDEX', field: 'row_index' });
        if (own(row, 'row_count') && row.row_count < 1) result.errors.push({ code: 'INVALID_ROW_COUNT', field: 'row_count' });
        if (own(row, 'row_index') && own(row, 'row_count') && row.row_index > row.row_count) result.errors.push({ code: 'ROW_INDEX_OUT_OF_RANGE', field: 'row_index' });
        var expectedRole = { pharmacy_validation: 'validation', pharmacy_first_visit: 'first_visit_line', pharmacy_followup: 'followup_line' }[row.event_type];
        if (expectedRole && row.row_role !== expectedRole) result.errors.push({ code: 'ROW_ROLE_EVENT_MISMATCH', field: 'row_role' });
      }
      result.valid = result.errors.length === 0;
      return result;
    });
  }

  function createEventEnvelope(input) {
    if (!isPlainObject(input)) fail('INVALID_EVENT', 'Event input must be a plain object.');
    var event = {};
    Object.keys(input).forEach(function (key) { event[key] = input[key]; });
    var result = validateEvent(event);
    if (!result.valid) fail('INVALID_EVENT', 'Event validation failed.', result.errors);
    return event;
  }

  function createRow(input) {
    if (!isPlainObject(input)) fail('INVALID_ROW', 'Row input must be a plain object.');
    var unknown = Object.keys(input).filter(function (key) { return ROW_COLUMNS.indexOf(key) === -1; });
    if (unknown.length) fail('INVALID_ROW', 'Row contains unknown fields.', unknown);
    var row = {};
    ROW_COLUMNS.forEach(function (name) { row[name] = own(input, name) ? input[name] : null; });
    var result = validateRow(row);
    if (!result.valid) fail('INVALID_ROW', 'Row validation failed.', result.errors);
    return row;
  }

  function buildRowId(sourceEventId, rowRole, rowKey) {
    if (!isNonEmptyString(sourceEventId) || !isNonEmptyString(rowRole) || !isNonEmptyString(rowKey)) fail('MISSING_ROW_ID_PART', 'sourceEventId, rowRole and explicit rowKey are required.');
    if (ENUMS.row_role.indexOf(rowRole) === -1) fail('INVALID_ROW_ROLE', 'rowRole is not canonical.', { rowRole: rowRole });
    return [sourceEventId, rowRole, rowKey].map(function (part) { return encodeURIComponent(part); }).join('::');
  }

  function validateRowSet(rows) {
    return guardedValidation(function () {
      var errors = [];
      if (!Array.isArray(rows) || rows.length < 1) return { valid: false, errors: [{ code: 'EMPTY_ROW_SET' }] };
      var ids = Object.create(null);
      var lineIds = Object.create(null);
      var first = rows[0];
      var commonFields = EVENT_FIELDS;
      rows.forEach(function (row, index) {
        var result = validateRow(row);
        result.errors.forEach(function (error) { errors.push({ code: error.code, row: index + 1, field: error.field || null }); });
        if (isPlainObject(row)) {
          if (ids[row.row_id]) errors.push({ code: 'DUPLICATE_ROW_ID', row: index + 1, field: 'row_id' });
          ids[row.row_id] = true;
          if (row.row_role !== 'validation') {
            if (!isNonEmptyString(row.line_id)) errors.push({ code: 'MISSING_LINE_ID', row: index + 1, field: 'line_id' });
            else if (lineIds[row.line_id]) errors.push({ code: 'DUPLICATE_LINE_ID', row: index + 1, field: 'line_id' });
            lineIds[row.line_id] = true;
          }
          if (row.row_count !== rows.length) errors.push({ code: 'ROW_COUNT_MISMATCH', row: index + 1, field: 'row_count' });
          if (row.row_index !== index + 1) errors.push({ code: 'ROW_INDEX_SEQUENCE', row: index + 1, field: 'row_index' });
          if (index > 0) commonFields.forEach(function (name) {
            var currentValue = own(row, name) ? row[name] : null;
            var firstValue = own(first, name) ? first[name] : null;
            if (stableStringify(currentValue) !== stableStringify(firstValue)) errors.push({ code: 'COMMON_IDENTITY_MISMATCH', row: index + 1, field: name });
          });
        }
      });
      return { valid: errors.length === 0, errors: errors };
    });
  }

  function projectEventRows(event, rowPayloads) {
    var canonicalEvent = createEventEnvelope(event);
    if (!Array.isArray(rowPayloads) || rowPayloads.length < 1) fail('EMPTY_ROW_PAYLOADS', 'At least one explicit row payload is required.');
    var seenKeys = Object.create(null);
    var role = { pharmacy_validation: 'validation', pharmacy_first_visit: 'first_visit_line', pharmacy_followup: 'followup_line' }[canonicalEvent.event_type];
    var rows = rowPayloads.map(function (payload, index) {
      if (!isPlainObject(payload)) fail('INVALID_ROW_PAYLOAD', 'Every row payload must be a plain object.', { index: index });
      if (!isNonEmptyString(payload.rowKey)) fail('MISSING_ROW_KEY', 'Every row payload requires an explicit stable rowKey.', { index: index });
      if (seenKeys[payload.rowKey]) fail('DUPLICATE_ROW_KEY', 'rowKey must be unique inside an event.', { rowKey: payload.rowKey });
      seenKeys[payload.rowKey] = true;
      if (role !== 'validation' && !isNonEmptyString(payload.line_id)) fail('MISSING_LINE_ID', 'Line projections require an explicit line_id.', { index: index });
      Object.keys(payload).forEach(function (name) {
        if (ROW_ONLY_FIELDS.indexOf(name) === -1) fail('COMMON_FIELD_OVERRIDE', 'Row payload cannot override event fields.', { field: name, index: index });
      });
      if (own(payload, 'row_role') && payload.row_role !== role) fail('ROW_ROLE_EVENT_MISMATCH', 'Explicit row_role does not match event_type.', { index: index });
      var input = {};
      ROW_COLUMNS.forEach(function (name) {
        if (own(canonicalEvent, name)) input[name] = canonicalEvent[name];
        if (own(payload, name)) input[name] = payload[name];
      });
      input.bridge_status = 'PENDIENTE';
      input.row_schema_version = ROW_SCHEMA_VERSION;
      input.row_role = role;
      input.row_index = index + 1;
      input.row_count = rowPayloads.length;
      input.row_id = buildRowId(canonicalEvent.source_event_id, role, payload.rowKey);
      return createRow(input);
    });
    var setResult = validateRowSet(rows);
    if (!setResult.valid) fail('INVALID_ROW_SET', 'Projected rows are inconsistent.', setResult.errors);
    return rows;
  }

  function serializeRowToTsv(row) {
    var result = validateRow(row);
    if (!result.valid) fail('INVALID_ROW', 'Cannot serialize an invalid row.', result.errors);
    return ROW_COLUMNS.map(function (name) {
      var value = own(row, name) ? row[name] : null;
      if (value === null) return '';
      if (value === true) return 'TRUE';
      if (value === false) return 'FALSE';
      return stableStringify(value);
    }).join('\t');
  }
  function serializeRowsToTsv(rows) {
    var result = validateRowSet(rows);
    if (!result.valid) fail('INVALID_ROW_SET', 'Cannot serialize an invalid row set.', result.errors);
    return rows.map(serializeRowToTsv).join('\n');
  }
  function parseTsvRow(tsv) {
    if (typeof tsv !== 'string' || /[\r\n]/.test(tsv)) fail('INVALID_TSV_ROW', 'A TSV row must be exactly one physical line.');
    var cells = tsv.split('\t');
    if (cells.length !== ROW_COLUMNS.length) fail('INVALID_TSV_COLUMN_COUNT', 'Unexpected TSV column count.', { expected: ROW_COLUMNS.length, actual: cells.length });
    var input = {};
    cells.forEach(function (cell, index) {
      if (cell === '') { input[ROW_COLUMNS[index]] = null; return; }
      if (cell === 'TRUE') { input[ROW_COLUMNS[index]] = true; return; }
      if (cell === 'FALSE') { input[ROW_COLUMNS[index]] = false; return; }
      try { input[ROW_COLUMNS[index]] = JSON.parse(cell); }
      catch (error) { fail('INVALID_TSV_CELL', 'TSV cell is not canonical JSON.', { column: ROW_COLUMNS[index], index: index }); }
    });
    return createRow(input);
  }
  function parseTsvRows(tsv) {
    if (typeof tsv !== 'string' || tsv.length === 0 || /\r/.test(tsv)) fail('INVALID_TSV_ROWS', 'TSV row set must be non-empty and use LF separators.');
    var rows = tsv.split('\n').map(parseTsvRow);
    var result = validateRowSet(rows);
    if (!result.valid) fail('INVALID_ROW_SET', 'Parsed rows are inconsistent.', result.errors);
    return rows;
  }

  root.FarmaciaExportV2Core = Object.freeze({
    EVENT_SCHEMA_VERSION: EVENT_SCHEMA_VERSION,
    ROW_SCHEMA_VERSION: ROW_SCHEMA_VERSION,
    ROW_COLUMNS: ROW_COLUMNS,
    FIELD_DEFINITIONS: FIELD_DEFINITIONS,
    createEventEnvelope: createEventEnvelope,
    createRow: createRow,
    projectEventRows: projectEventRows,
    validateEvent: validateEvent,
    validateRow: validateRow,
    validateRowSet: validateRowSet,
    buildRowId: buildRowId,
    stableStringify: stableStringify,
    serializeRowToTsv: serializeRowToTsv,
    serializeRowsToTsv: serializeRowsToTsv,
    parseTsvRow: parseTsvRow,
    parseTsvRows: parseTsvRows
  });
})(typeof window !== 'undefined' ? window : globalThis);
