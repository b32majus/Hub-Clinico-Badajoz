/* FH Bridge raw EA 0..N · Seguimiento follow-up adapter (C2b).
 *
 * Boundary between the editable follow-up act and the published C2a raw
 * transport core. It does NOT reinterpret clinical meaning and does NOT
 * derive identity:
 *
 *  - Act identity (`actId`, `patientRef`) and the event/visit context come
 *    from the explicit demo identity source and are checked against it.
 *    A context that mixes the identity of another act or patient fails closed.
 *  - Every adverse-event ficha must already be incorporated and carry its
 *    original description. Drafts and non-final evaluations reject the WHOLE
 *    act before any row or TSV exists (`EA_NOT_INCORPORATED`,
 *    `EVALUATION_NOT_FINAL`).
 *  - Suspects travel as explicit per-episode references: either the editor's
 *    `suspect_ids` or already declared `suspicions` records. `medicationRef`
 *    is the selected reference verbatim, never a translated drug name.
 *  - Active lines travel from the declared `activeLines` array (0..N). No
 *    dose, schedule, route or exposure is inferred from a drug.
 *
 * The adapter calls `FarmaciaBridgeRawEaV21Core.buildFollowupRows` and
 * `serializeRowsToTsv` unchanged and returns `{ rows, tsv }`. The input is
 * never mutated. No DOM, storage, clock, network or randomness. */
(function (root) {
  'use strict';

  var ADAPTER_VERSION = '1.0.0-draft.1';
  var CORE_VERSION = '2.1.0-draft.1';
  var DEMO_PROVIDER_VERSION = '1.0.0-draft.1';
  var INPUT_FIELDS = ['context', 'present', 'adverseEvents', 'history', 'selections'];
  var IDENTITY_FIELDS = ['actId', 'patientRef', 'eventId', 'sourceEventId', 'visitId',
    'patientId', 'visitDate', 'identifierValue'];
  var CONTEXT_REQUIRED_STRINGS = ['identifierValue', 'actId', 'patientRef', 'eventId',
    'sourceEventId', 'visitId', 'patientId', 'occurredAt', 'recordedAt', 'visitDate',
    'eventStatus'];
  var LINE_FIELDS = ['rowKey', 'treatmentId', 'lineId', 'lineRole', 'isPrimaryLine',
    'lineStatusAtEvent', 'activeAtEvent', 'drugName', 'activeIngredient', 'presentation',
    'doseText', 'route', 'scheduleCode', 'scheduleLabel', 'scheduleOtherText',
    'selectedDrugId', 'catalogSource', 'nationalCode', 'registrationNumber'];
  var LINE_MAP = {
    rowKey: 'rowKey',
    treatmentId: 'treatment_id',
    lineId: 'line_id',
    lineRole: 'line_role',
    isPrimaryLine: 'is_primary_line',
    lineStatusAtEvent: 'line_status_at_event',
    activeAtEvent: 'active_at_event',
    drugName: 'line_drug_name',
    activeIngredient: 'line_active_ingredient',
    presentation: 'line_presentation',
    doseText: 'line_dose_text',
    route: 'line_route',
    scheduleCode: 'line_schedule_code',
    scheduleLabel: 'line_schedule_label',
    scheduleOtherText: 'line_schedule_other_text',
    selectedDrugId: 'line_selected_drug_id',
    catalogSource: 'line_catalog_source',
    nationalCode: 'line_national_code',
    registrationNumber: 'line_registration_number'
  };
  var LINE_ROLE_VALUES = ['principal', 'additional'];
  var EA_FIELDS = ['patientRef', 'actId', 'episode_id', 'observation_id', 'status',
    'description', 'evolution', 'severity', 'basis', 'relatedEpisodeId', 'review',
    'suspicions', 'suspect_ids', 'evaluations', 'expanded'];
  var EA_PASSTHROUGH_FIELDS = ['evolution', 'severity', 'basis', 'relatedEpisodeId', 'review'];
  var PLACEHOLDERS = ['—', 'no informado'];

  function AdapterError(code, message, details) {
    this.name = 'FarmaciaBridgeRawEaV21FollowupAdapterError';
    this.code = code;
    this.message = code + ': ' + message;
    this.details = details || null;
    if (Error.captureStackTrace) Error.captureStackTrace(this, AdapterError);
  }
  AdapterError.prototype = Object.create(Error.prototype);
  AdapterError.prototype.constructor = AdapterError;

  function fail(code, message, details) {
    throw new AdapterError(code, message, details);
  }
  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }
  function plain(value) {
    return value !== null && Object.prototype.toString.call(value) === '[object Object]';
  }
  function text(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }
  function normalizedKey(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function isPlaceholder(value) {
    return typeof value === 'string' && PLACEHOLDERS.indexOf(normalizedKey(value)) !== -1;
  }
  function coreOrFail() {
    var core = root.FarmaciaBridgeRawEaV21Core;
    if (!core || core.VERSION !== CORE_VERSION || typeof core.buildFollowupRows !== 'function' ||
        typeof core.serializeRowsToTsv !== 'function') {
      fail('CORE_UNAVAILABLE', 'Published Bridge raw C2a core ' + CORE_VERSION + ' is required.');
    }
    return core;
  }

  function identityOf(context) {
    var identity = {};
    IDENTITY_FIELDS.forEach(function (field) {
      identity[field] = context[field];
    });
    return identity;
  }

  function assertDeclaredContext(context) {
    if (!plain(context)) fail('INVALID_CONTEXT', 'The act context must be an explicit record.');
    CONTEXT_REQUIRED_STRINGS.forEach(function (field) {
      if (!text(context[field])) fail('INVALID_CONTEXT', 'The act context requires an explicit ' + field + '.', { field: field });
    });
    if (context.demoFlag !== true) fail('DEMO_IDENTITY_REQUIRED', 'Only explicitly labelled demo identity is accepted.');
    if (!Array.isArray(context.activeLines)) fail('INVALID_ACTIVE_LINES', 'activeLines must be an explicit array (0..N).');
    var provider = root.FarmaciaBridgeRawEaV21DemoContext;
    if (!provider || provider.PROVIDER_VERSION !== DEMO_PROVIDER_VERSION ||
        typeof provider.getContext !== 'function') {
      fail('DEMO_PROVIDER_UNAVAILABLE', 'The declared demo identity source is not available.');
    }
    var canonical = provider.getContext('followupAct', context.identifierValue);
    if (!canonical) {
      fail('IDENTITY_UNAVAILABLE', 'No declared act identity exists for this patient.');
    }
    var declared = identityOf(context);
    var expected = identityOf(canonical);
    IDENTITY_FIELDS.forEach(function (field) {
      if (declared[field] !== expected[field]) {
        fail('IDENTITY_MISMATCH', 'The act context does not match the declared identity for this act and patient.', {
          field: field
        });
      }
    });
    return canonical;
  }

  function lineValue(line, field) {
    if (!own(line, field) || line[field] === undefined) return null;
    var value = line[field];
    if (value === null) return null;
    if (field === 'isPrimaryLine' || field === 'activeAtEvent') return value;
    if (typeof value === 'string') return value;
    fail('INVALID_LINE_FIELD', 'Line field ' + field + ' must be a string or null.', { field: field });
  }

  function validateLine(line, index) {
    var path = 'activeLines[' + index + ']';
    if (!plain(line)) fail('INVALID_LINE', 'Each active line must be an explicit record.', { path: path });
    Object.keys(line).forEach(function (key) {
      if (LINE_FIELDS.indexOf(key) === -1) {
        fail('UNKNOWN_LINE_FIELD', 'Unexpected line field ' + key + '.', { path: path + '.' + key });
      }
    });
    ['rowKey', 'treatmentId', 'lineId', 'lineRole'].forEach(function (field) {
      if (!text(line[field])) fail('INVALID_LINE', 'Line requires an explicit ' + field + '.', { path: path + '.' + field });
      if (isPlaceholder(line[field])) fail('PLACEHOLDER_NOT_ALLOWED', 'Line ' + field + ' cannot be a placeholder.', { path: path + '.' + field });
    });
    if (typeof line.isPrimaryLine !== 'boolean') fail('INVALID_LINE', 'Line requires an explicit isPrimaryLine boolean.', { path: path + '.isPrimaryLine' });
    if (typeof line.activeAtEvent !== 'boolean') fail('INVALID_LINE', 'Line requires an explicit activeAtEvent boolean.', { path: path + '.activeAtEvent' });
    if (line.activeAtEvent !== true) {
      fail('LINE_NOT_ACTIVE', 'Only lines active at the event may travel in the act.', { path: path + '.activeAtEvent' });
    }
    if (line.lineStatusAtEvent !== 'active') {
      fail('LINE_NOT_ACTIVE', 'Only lines with explicit active status may travel in the act.', { path: path + '.lineStatusAtEvent' });
    }
    if (LINE_ROLE_VALUES.indexOf(line.lineRole) === -1) {
      fail('INVALID_LINE_ROLE', 'Line role must be principal or additional.', { path: path + '.lineRole' });
    }
    if ((line.lineRole === 'principal') !== line.isPrimaryLine) {
      fail('INVALID_PRIMARY_COHERENCE', 'Line role and primary flag must be coherent.', { path: path });
    }
    var identifiable = ['drugName', 'activeIngredient'].some(function (field) {
      return text(line[field]) && !isPlaceholder(line[field]);
    });
    if (!identifiable) fail('LINE_NOT_IDENTIFIABLE', 'A line requires an explicit drug name or active ingredient.', { path: path });
    var mapped = {};
    LINE_FIELDS.forEach(function (field) {
      mapped[LINE_MAP[field]] = lineValue(line, field);
    });
    return mapped;
  }

  function assertEventIdentity(event, context) {
    if (own(event, 'patientRef') && event.patientRef !== context.patientRef) {
      fail('IDENTITY_MISMATCH', 'An adverse event belongs to another patient.', { field: 'patientRef' });
    }
    if (own(event, 'actId') && event.actId !== context.actId) {
      fail('IDENTITY_MISMATCH', 'An adverse event belongs to another act.', { field: 'actId' });
    }
  }

  function suspicionRecords(event, context) {
    var hasSuspicions = own(event, 'suspicions') && event.suspicions !== undefined;
    var hasSuspectIds = own(event, 'suspect_ids') && event.suspect_ids !== undefined;
    if (hasSuspicions && hasSuspectIds) {
      fail('AMBIGUOUS_EA_SUSPICIONS', 'Declare suspects once: suspicions or suspect_ids, never both.');
    }
    if (hasSuspicions && !Array.isArray(event.suspicions)) {
      // A non-array sentinel is preserved verbatim: it authorizes no
      // association rows and is never expanded into suspects.
      return { value: event.suspicions };
    }
    var source = hasSuspicions ? event.suspicions : (hasSuspectIds ? event.suspect_ids : null);
    if (source === null) return { value: undefined };
    if (!Array.isArray(source)) fail('INVALID_EA_SUSPICIONS', 'suspect_ids must be an explicit array.');
    var records = source.map(function (entry) {
      if (typeof entry === 'string') {
        if (!text(entry)) fail('INVALID_SUSPECT_REF', 'A selected suspect reference cannot be empty.');
        return { patientRef: context.patientRef, episode_id: event.episode_id, medicationRef: entry };
      }
      if (!plain(entry)) fail('INVALID_SUSPECT_REF', 'Each suspicion must be an explicit record or reference.');
      if (!text(entry.medicationRef)) fail('INVALID_SUSPECT_REF', 'Each suspicion requires an explicit medicationRef.');
      if (own(entry, 'patientRef') && entry.patientRef !== context.patientRef) {
        fail('IDENTITY_MISMATCH', 'A suspicion belongs to another patient.', { field: 'patientRef' });
      }
      if (own(entry, 'episode_id') && entry.episode_id !== event.episode_id) {
        fail('IDENTITY_MISMATCH', 'A suspicion belongs to another episode.', { field: 'episode_id' });
      }
      var record = {};
      Object.keys(entry).forEach(function (key) {
        record[key] = entry[key];
      });
      if (!own(record, 'patientRef')) record.patientRef = context.patientRef;
      if (!own(record, 'episode_id')) record.episode_id = event.episode_id;
      return record;
    });
    return { value: records };
  }

  function evaluationRecords(event, context) {
    if (!own(event, 'evaluations') || event.evaluations === undefined) return { value: undefined };
    if (!Array.isArray(event.evaluations)) {
      return { value: event.evaluations };
    }
    var records = event.evaluations.map(function (entry) {
      if (!plain(entry)) fail('INVALID_EVALUATION', 'Each evaluation must be an explicit record.');
      ['evaluation_id', 'medicationRef', 'method'].forEach(function (field) {
        if (!text(entry[field])) fail('INVALID_EVALUATION', 'Each evaluation requires an explicit ' + field + '.', { field: field });
      });
      if (own(entry, 'patientRef') && entry.patientRef !== context.patientRef) {
        fail('IDENTITY_MISMATCH', 'An evaluation belongs to another patient.', { field: 'patientRef' });
      }
      if (own(entry, 'episode_id') && entry.episode_id !== event.episode_id) {
        fail('IDENTITY_MISMATCH', 'An evaluation belongs to another episode.', { field: 'episode_id' });
      }
      if (own(entry, 'actId') && entry.actId !== context.actId) {
        fail('IDENTITY_MISMATCH', 'An evaluation belongs to another act.', { field: 'actId' });
      }
      if (own(entry, 'status') && entry.status !== 'completado') {
        fail('EVALUATION_NOT_FINAL', 'Only explicitly completed evaluations may travel in the act.');
      }
      var record = {};
      Object.keys(entry).forEach(function (key) {
        record[key] = entry[key];
      });
      if (!own(record, 'patientRef')) record.patientRef = context.patientRef;
      if (!own(record, 'episode_id')) record.episode_id = event.episode_id;
      if (!own(record, 'actId')) record.actId = context.actId;
      return record;
    });
    return { value: records };
  }

  function buildObservation(event, context, index) {
    if (!plain(event)) fail('INVALID_EA', 'Each adverse event must be an explicit record.', { index: index });
    Object.keys(event).forEach(function (key) {
      if (EA_FIELDS.indexOf(key) === -1) {
        fail('UNSUPPORTED_EA_FIELD', 'Adverse event field ' + key + ' is not representable.', { field: key });
      }
    });
    if (event.status !== 'incorporated') {
      fail('EA_NOT_INCORPORATED', 'Draft adverse events cannot become incorporated act data.');
    }
    if (!text(event.description)) {
      fail('EA_NOT_INCORPORATED', 'An incorporated adverse event requires its original description.');
    }
    if (!text(event.episode_id)) fail('INVALID_EPISODE_ID', 'An adverse event requires an explicit episode_id.');
    if (!text(event.observation_id)) fail('INVALID_OBSERVATION_ID', 'An adverse event requires an explicit observation_id.');
    assertEventIdentity(event, context);
    var observation = {
      patientRef: context.patientRef,
      actId: context.actId,
      episode_id: event.episode_id,
      observation_id: event.observation_id,
      status: 'incorporated',
      description: event.description
    };
    EA_PASSTHROUGH_FIELDS.forEach(function (field) {
      if (own(event, field)) observation[field] = event[field];
    });
    var suspicions = suspicionRecords(event, context);
    if (suspicions.value !== undefined) observation.suspicions = suspicions.value;
    var evaluations = evaluationRecords(event, context);
    if (evaluations.value !== undefined) observation.evaluations = evaluations.value;
    return observation;
  }

  function buildEvent(context) {
    var event = {
      event_id: context.eventId,
      source_event_id: context.sourceEventId,
      event_type: 'pharmacy_followup',
      event_status: context.eventStatus,
      occurred_at: context.occurredAt,
      recorded_at: context.recordedAt,
      demo_flag: context.demoFlag,
      patient_id: context.patientId,
      visit_id: context.visitId,
      identifier_value: context.identifierValue,
      visit_date: context.visitDate
    };
    ['identifier_system', 'hospital_code', 'service_code', 'service_label', 'pathology_code',
      'pathology_label', 'professional_ref', 'professional_display'].forEach(function (field) {
      if (own(context, field) && context[field] !== undefined) event[field] = context[field];
    });
    return event;
  }

  function buildFollowupRawProjection(input) {
    if (!plain(input)) fail('INVALID_REQUEST', 'The projection request must be an explicit record.');
    Object.keys(input).forEach(function (key) {
      if (INPUT_FIELDS.indexOf(key) === -1) fail('UNKNOWN_INPUT', 'Unexpected projection input ' + key + '.');
    });
    INPUT_FIELDS.forEach(function (key) {
      if (!own(input, key)) fail('MISSING_INPUT', 'Explicit projection input ' + key + ' is mandatory.');
    });
    var context = assertDeclaredContext(input.context);
    if (input.present !== 'si' && input.present !== 'no' && input.present !== 'no_consta') {
      fail('INVALID_PRESENT', 'present must be exactly si, no or no_consta.');
    }
    if (!Array.isArray(input.adverseEvents)) fail('INVALID_ADVERSE_EVENTS', 'adverseEvents must be an explicit array.');
    if (!Array.isArray(input.history)) fail('INVALID_HISTORY', 'history must be an explicit array.');
    if (!Array.isArray(input.selections)) fail('INVALID_SELECTIONS', 'selections must be an explicit array.');
    var core = coreOrFail();
    var lines = input.context.activeLines.map(validateLine);
    var adverseEvents = input.adverseEvents.map(function (event, index) {
      return buildObservation(event, input.context, index);
    });
    var request = {
      event: buildEvent(input.context),
      actId: input.context.actId,
      patientRef: input.context.patientRef,
      present: input.present,
      activeLines: lines,
      adverse_events: adverseEvents,
      history: input.history,
      selections: input.selections
    };
    var rows;
    try {
      rows = core.buildFollowupRows(request);
    } catch (error) {
      if (error && error.code) throw error;
      fail('CORE_REJECTED', 'The Bridge raw core rejected the act.');
    }
    var tsv;
    try {
      tsv = core.serializeRowsToTsv(rows);
    } catch (error) {
      if (error && error.code) throw error;
      fail('SERIALIZATION_REJECTED', 'The Bridge raw TSV could not be produced.');
    }
    return { rows: rows, tsv: tsv };
  }

  root.FarmaciaBridgeRawEaV21FollowupAdapter = Object.freeze({
    ADAPTER_VERSION: ADAPTER_VERSION,
    buildFollowupRawProjection: buildFollowupRawProjection
  });
})(typeof window !== 'undefined' ? window : globalThis);
