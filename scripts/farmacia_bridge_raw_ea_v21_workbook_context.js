/* FH Bridge raw EA v1 · workbook-declared act identity (D4a-1).
 *
 * Consultar no modifica ni crea nada: la identidad del PACIENTE
 * (`patient_id`, `patientRef`, `demo_flag`, `identifier_system`) se lee tal
 * como la declara el libro. Si falta o se contradice, se bloquea con motivo;
 * nunca se elige, se rellena ni se inventa.
 *
 * Solo el propio acto emite su identidad (`actId`, evento, visita) al
 * crearse; aquí llega como dato a funciones puras (sin reloj ni azar).
 * Los pacientes del registro demo (CIP-DEMO-FH-*) siguen igual.
 *
 * `declaredPatientIdentity` lee la identidad declarada y las líneas
 * declaradas activas en el evento. `buildActContext` combina esa identidad
 * con la del acto. Ninguna función muta su entrada: devuelven copias nuevas.
 * No DOM, storage, clock, network, catálogo ni aleatoriedad.
 *
 * D4b-1: `priorEpisodes` lee los episodios EA ya publicados del paciente de
 * sesión (referencias y estado tal como se declaran); `longitudinalDraft`
 * prepara la ficha en borrador apoyada en la última observación (basis).
 * Ninguna infiere evolución, episodio ni acción ofrecida. */
(function (root) {
  'use strict';

  var VERSION = '1.0.0-draft.1';
  var ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
  var ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

  function WorkbookContextError(code, message) {
    this.name = 'FarmaciaBridgeRawEaV21WorkbookContextError';
    this.code = code;
    this.message = code + ': ' + message;
    if (Error.captureStackTrace) Error.captureStackTrace(this, WorkbookContextError);
  }
  WorkbookContextError.prototype = Object.create(Error.prototype);
  WorkbookContextError.prototype.constructor = WorkbookContextError;

  function fail(code, message) {
    throw new WorkbookContextError(code, message);
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
  function copyValue(value) {
    if (Array.isArray(value)) return value.map(copyValue);
    if (plain(value)) {
      var copy = {};
      Object.keys(value).forEach(function (key) {
        Object.defineProperty(copy, key, {
          value: copyValue(value[key]),
          enumerable: true,
          writable: true,
          configurable: true
        });
      });
      return copy;
    }
    return value;
  }
  // Missing or undefined is a declared absence: null, never a filled value.
  function declared(value) {
    return value === undefined ? null : value;
  }

  // Canonical rows of the events declared for one patient, in workbook order.
  function canonicalRows(events) {
    var rows = [];
    (Array.isArray(events) ? events : []).forEach(function (event) {
      var declared_rows = event && Array.isArray(event.rows) ? event.rows : [];
      declared_rows.forEach(function (row) {
        if (plain(row) && plain(row.canonical_row)) rows.push(row.canonical_row);
      });
    });
    return rows;
  }

  function declarablePatientRef(envelope) {
    if (!plain(envelope)) return { failure: { status: 'unavailable' } };
    if (envelope.outcome === 'unavailable') return { failure: { status: 'unavailable' } };
    if (envelope.outcome === 'not_found') {
      return { failure: { status: 'blocked', reason: 'PATIENT_REF_UNDECLARED' } };
    }
    if (envelope.outcome !== 'ok') return { failure: { status: 'error' } };
    var value = plain(envelope.value) ? envelope.value : null;
    if (!value || !text(value.patientRef)) return { failure: { status: 'error' } };
    return { patientRef: value.patientRef };
  }

  function declarableDemoFlag(rows) {
    var flags = [];
    for (var index = 0; index < rows.length; index += 1) {
      var row = rows[index];
      if (!own(row, 'demo_flag')) continue;
      var value = row.demo_flag;
      if (value === null || value === undefined) continue;
      if (typeof value !== 'boolean') return { failure: { status: 'blocked', reason: 'DEMO_FLAG_CONFLICT' } };
      if (flags.indexOf(value) === -1) flags.push(value);
    }
    if (flags.length === 0) return { failure: { status: 'blocked', reason: 'DEMO_FLAG_UNDECLARED' } };
    if (flags.length > 1) return { failure: { status: 'blocked', reason: 'DEMO_FLAG_CONFLICT' } };
    return { demoFlag: flags[0] };
  }

  function declarableIdentifierSystem(rows) {
    var systems = [];
    rows.forEach(function (row) {
      var value = own(row, 'identifier_system') ? row.identifier_system : null;
      if (!text(value)) return;
      var normalized = value.trim();
      if (systems.indexOf(normalized) === -1) systems.push(normalized);
    });
    if (systems.length > 1) return { failure: { status: 'blocked', reason: 'IDENTIFIER_SYSTEM_CONFLICT' } };
    return { identifierSystem: systems.length === 0 ? null : systems[0] };
  }

  // Only lines declared active at the event travel; the rest are not dragged.
  function declarableActiveLines(lines) {
    var active = [];
    (Array.isArray(lines) ? lines : []).forEach(function (entry) {
      if (!plain(entry)) return;
      var snapshot = plain(entry.snapshot) ? entry.snapshot : {};
      var current = plain(entry.current_line) ? entry.current_line : null;
      if (snapshot.active_at_event !== true) return;
      if (snapshot.line_status_at_event !== 'active') return;
      active.push({
        treatmentId: declared(entry.treatment_id),
        lineId: declared(entry.line_id),
        lineRole: declared(snapshot.line_role),
        isPrimaryLine: declared(snapshot.is_primary_line),
        lineStatusAtEvent: declared(snapshot.line_status_at_event),
        activeAtEvent: declared(snapshot.active_at_event),
        drugName: declared(snapshot.line_drug_name),
        activeIngredient: declared(snapshot.line_active_ingredient),
        presentation: declared(snapshot.line_presentation),
        // #877: la fila 166 de la visita siguiente declara el tratamiento
        // vigente (lo optimizado en `line_*`), no la foto cruda anterior.
        doseText: declared(current ? current.dose_text : snapshot.line_dose_text),
        route: declared(snapshot.line_route),
        scheduleCode: declared(current ? current.schedule_code : snapshot.line_schedule_code),
        scheduleLabel: declared(current ? current.schedule_label : snapshot.line_schedule_label),
        scheduleOtherText: declared(current ? current.schedule_other_text : snapshot.line_schedule_other_text),
        selectedDrugId: declared(snapshot.line_selected_drug_id),
        catalogSource: declared(snapshot.line_catalog_source),
        nationalCode: declared(snapshot.line_national_code),
        registrationNumber: declared(snapshot.line_registration_number)
      });
    });
    return active;
  }

  function declaredPatientIdentity(input) {
    if (!plain(input)) return { status: 'blocked', reason: 'PATIENT_NOT_DECLARED' };
    if (!text(input.patientId) || !text(input.identifierValue)) {
      return { status: 'blocked', reason: 'PATIENT_NOT_DECLARED' };
    }
    var ref = declarablePatientRef(input.eaEnvelope);
    if (ref.failure) return ref.failure;
    var rows = canonicalRows(input.events);
    var demo = declarableDemoFlag(rows);
    if (demo.failure) return demo.failure;
    var system = declarableIdentifierSystem(rows);
    if (system.failure) return system.failure;
    return {
      status: 'ok',
      patientId: input.patientId.trim(),
      identifierValue: input.identifierValue.trim(),
      identifierSystem: system.identifierSystem,
      patientRef: ref.patientRef,
      demoFlag: demo.demoFlag,
      activeLines: declarableActiveLines(input.lines)
    };
  }

  function isDate(value) {
    if (typeof value !== 'string') return false;
    var match = ISO_DATE.exec(value);
    if (!match) return false;
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    if (month < 1 || month > 12) return false;
    if (day < 1) return false;
    var leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    var monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day <= monthDays[month - 1];
  }

  function isDateTime(value) {
    if (typeof value !== 'string' || !ISO_DATE_TIME.test(value)) return false;
    if (!isFinite(Date.parse(value))) return false;
    return isDate(value.slice(0, 10));
  }

  function buildActContext(identity, act, selectedLineIds) {
    if (!plain(identity) || identity.status !== 'ok') {
      fail('IDENTITY_NOT_DECLARED', 'The act requires a declared patient identity.');
    }
    var declaredAct = plain(act) ? act : {};
    ['actId', 'eventId', 'sourceEventId', 'visitId'].forEach(function (field) {
      if (!text(declaredAct[field])) fail('INVALID_ACT', 'The act requires an explicit ' + field + '.');
    });
    if (!isDate(declaredAct.visitDate)) fail('INVALID_ACT_DATE', 'The act requires an explicit YYYY-MM-DD visitDate.');
    if (!isDateTime(declaredAct.recordedAt)) {
      fail('INVALID_ACT_DATE', 'The act requires an explicit ISO date-time recordedAt with Z or offset.');
    }
    [declaredAct.eventId, declaredAct.sourceEventId, declaredAct.visitId, identity.patientId].forEach(function (other) {
      if (declaredAct.actId === other) {
        fail('ACT_ID_NOT_DISTINCT', 'The act identity must not reuse an event, visit or patient identifier.');
      }
    });
    if (!Array.isArray(selectedLineIds)) fail('LINE_NOT_DECLARED', 'selectedLineIds must be an explicit array.');
    var declaredLines = Array.isArray(identity.activeLines) ? identity.activeLines : [];
    var declaredIds = declaredLines.map(function (line) { return line.lineId; });
    var undeclared = selectedLineIds.filter(function (lineId) {
      return declaredIds.indexOf(lineId) === -1;
    });
    if (undeclared.length > 0) {
      fail('LINE_NOT_DECLARED', 'Only lines declared active for this patient may travel in the act.');
    }
    // Cada línea seleccionada viaja una sola vez, en el orden declarado.
    var chosen = declaredLines.filter(function (line) {
      return selectedLineIds.indexOf(line.lineId) !== -1;
    });

    var context = {
      identitySource: 'workbook',
      identifierValue: identity.identifierValue
    };
    if (identity.identifierSystem !== null && identity.identifierSystem !== undefined) {
      context.identifier_system = identity.identifierSystem;
    }
    context.actId = declaredAct.actId;
    context.patientRef = identity.patientRef;
    context.eventId = declaredAct.eventId;
    context.sourceEventId = declaredAct.sourceEventId;
    context.visitId = declaredAct.visitId;
    context.patientId = identity.patientId;
    context.occurredAt = declaredAct.visitDate;
    context.recordedAt = declaredAct.recordedAt;
    context.visitDate = declaredAct.visitDate;
    context.eventStatus = 'recorded';
    context.demoFlag = identity.demoFlag;
    context.activeLines = chosen.map(function (line) {
      return Object.assign({ rowKey: declaredAct.actId + ':' + line.lineId }, copyValue(line));
    });
    return context;
  }

  // D4b-1: episodios EA del paciente de sesión, tal como los publica el libro.
  // Sin datos utilizables no hay historia ni botones; nunca parcialmente.
  var ACTIONS_CONTINUATION_RESOLUTION = ['continuation', 'resolution'];
  var ACTIONS_RECURRENCE = ['recurrence'];
  var ACTIONS_UNDETERMINED = [];

  function unavailableHistory(reason) {
    return { status: 'unavailable', reason: reason, history: [], episodes: [] };
  }

  function blockedHistory(reason) {
    return { status: 'blocked', reason: reason, history: [], episodes: [] };
  }

  // Un episodio sin observaciones utilizables no sostiene ninguna ficha.
  function usableObservations(episode) {
    var observations = Array.isArray(episode.observations) ? episode.observations : null;
    if (!observations || observations.length === 0) return null;
    for (var index = 0; index < observations.length; index += 1) {
      var observation = observations[index];
      if (!plain(observation)) return null;
      if (!text(observation.observation_id) || !text(observation.actId)) return null;
    }
    return observations;
  }

  function observationReference(patientRef, episodeId, observation) {
    return {
      patientRef: patientRef,
      actId: observation.actId,
      episode_id: episodeId,
      observation_id: observation.observation_id,
      status: 'incorporated'
    };
  }

  function observationBasis(patientRef, episodeId, observation) {
    return {
      patientRef: patientRef,
      actId: observation.actId,
      episode_id: episodeId,
      observation_id: observation.observation_id
    };
  }

  function offeredActions(closed, ambiguous) {
    if (ambiguous) return ACTIONS_UNDETERMINED.slice();
    if (closed) return ACTIONS_RECURRENCE.slice();
    return ACTIONS_CONTINUATION_RESOLUTION.slice();
  }

  function priorEpisodes(identity, sessionEpisodes) {
    if (!plain(identity) || identity.status !== 'ok') {
      fail('IDENTITY_NOT_DECLARED', 'The prior history requires a declared patient identity.');
    }
    if (!plain(sessionEpisodes)) return unavailableHistory('missing');
    if (sessionEpisodes.status !== 'ok') {
      return unavailableHistory(text(sessionEpisodes.status) ? sessionEpisodes.status : 'missing');
    }
    if (!plain(sessionEpisodes.model)) return unavailableHistory('missing');
    var model = sessionEpisodes.model;
    if (model.patientRef !== identity.patientRef) {
      return blockedHistory('HISTORY_PATIENT_MISMATCH');
    }
    var declaredEpisodes = Array.isArray(model.episodes) ? model.episodes : null;
    if (!declaredEpisodes) return unavailableHistory('missing');

    // Toda la historia se valida antes de publicar nada: nada parcial.
    var inspected = [];
    for (var index = 0; index < declaredEpisodes.length; index += 1) {
      var episode = declaredEpisodes[index];
      if (!plain(episode) || !text(episode.episode_id)) return blockedHistory('INVALID_HISTORY');
      var observations = usableObservations(episode);
      if (!observations) return blockedHistory('INVALID_HISTORY');
      inspected.push({ episode: episode, observations: observations });
    }

    var history = [];
    var episodes = [];
    inspected.forEach(function (entry) {
      entry.observations.forEach(function (observation) {
        history.push(observationReference(model.patientRef, entry.episode.episode_id, observation));
      });
      var closed = entry.episode.closed === true;
      var ambiguous = entry.episode.ambiguous === true;
      episodes.push({
        episode_id: entry.episode.episode_id,
        description: entry.episode.description,
        statusText: entry.episode.statusText,
        lastDate: entry.episode.lastDate,
        closed: closed,
        ambiguous: ambiguous,
        actions: offeredActions(closed, ambiguous),
        basis: observationBasis(
          model.patientRef,
          entry.episode.episode_id,
          entry.observations[entry.observations.length - 1]
        )
      });
    });
    return { status: 'ok', reason: null, history: history, episodes: episodes };
  }

  // Ficha en borrador: sólo la acción ofrecida por el episodio. El clínico
  // escribe la descripción; aquí no se infiere evolución, episodio ni datos.
  function longitudinalDraft(prior, action, ids) {
    var offered = plain(prior) && Array.isArray(prior.actions) ? prior.actions : null;
    if (!offered || offered.indexOf(action) === -1) {
      fail('ACTION_NOT_OFFERED', 'The draft requires an action offered by the episode.');
    }
    var declaredIds = plain(ids) ? ids : {};
    if (!text(declaredIds.observationId)) {
      fail('MISSING_OBSERVATION_ID', 'The draft requires an explicit observation_id.');
    }
    var episodeId = prior.episode_id;
    if (action === 'recurrence') {
      if (!text(declaredIds.episodeId)) {
        fail('MISSING_EPISODE_ID', 'A recurrence requires an explicit new episode_id.');
      }
      episodeId = declaredIds.episodeId;
    }
    return {
      episode_id: episodeId,
      observation_id: declaredIds.observationId,
      status: 'draft',
      description: '',
      evolution: action,
      basis: copyValue(prior.basis)
    };
  }

  root.FarmaciaBridgeRawEaV21WorkbookContext = Object.freeze({
    VERSION: VERSION,
    declaredPatientIdentity: declaredPatientIdentity,
    buildActContext: buildActContext,
    priorEpisodes: priorEpisodes,
    longitudinalDraft: longitudinalDraft
  });
})(typeof window !== 'undefined' ? window : globalThis);
