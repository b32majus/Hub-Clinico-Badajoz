(function (root) {
  'use strict';

  function text(value) {
    return value === null || value === undefined ? '' : String(value).trim();
  }

  function byId(id) {
    return root.document ? root.document.getElementById(id) : null;
  }

  function currentContext() {
    var demo = root.FarmaciaDemo;
    return demo && typeof demo.getQueryContext === 'function' ? demo.getQueryContext() : null;
  }

  function canonicalSnapshot() {
    try {
      var context = currentContext();
      var patient = context && context.patient;
      var core = root.FarmaciaMultitreatmentCore;
      var model = root.FarmaciaValidationStateV4Model;
      if (!patient || !patient.patient_id || !core || !model) return null;
      var store = core.createSessionStore(root.sessionStorage);
      return model.restoreDecision({ store: store, patientId: patient.patient_id });
    } catch (error) {
      return null;
    }
  }

  function isValidatedWithLine(snapshot) {
    return !!(snapshot && snapshot.result === 'validated' && text(snapshot.produced_line_id));
  }

  var POSTSTART_NOTE = 'El tratamiento ya está iniciado. Los cambios posteriores requieren un movimiento clínico trazable.';

  function isCoherentPoststart(snapshot) {
    return !!(
      snapshot &&
      snapshot.result === 'validated' &&
      snapshot.line &&
      text(snapshot.line.line_id) &&
      snapshot.line.line_id === snapshot.produced_line_id &&
      snapshot.line.status === 'active' &&
      text(snapshot.line.start_date)
    );
  }

  function ensureNote() {
    var select = byId('fhValEstado');
    if (!select || !select.parentNode) return null;
    var note = byId('fhValTransitionGuardNote');
    if (!note) {
      note = root.document.createElement('p');
      note.id = 'fhValTransitionGuardNote';
      note.className = 'validation-note-block__value hidden';
      note.setAttribute('role', 'note');
      select.parentNode.appendChild(note);
      select.setAttribute('aria-describedby', note.id);
    }
    return note;
  }

  function unlockResultOptions() {
    var select = byId('fhValEstado');
    if (!select) return;
    Array.prototype.forEach.call(select.options || [], function (option) {
      option.disabled = false;
    });
  }

  function setPoststartControls(locked) {
    var select = byId('fhValEstado');
    var save = byId('fhValSaveV4');
    if (select) {
      if (locked) select.value = 'validated';
      Array.prototype.forEach.call(select.options || [], function (option) {
        option.disabled = !!(locked && (option.value === 'pending' || option.value === 'denied'));
      });
    }
    if (!save) return;
    if (locked) {
      save.disabled = true;
      save.setAttribute('aria-disabled', 'true');
      save.setAttribute('title', POSTSTART_NOTE);
      save.setAttribute('data-fh-v4-poststart-guard', 'true');
    } else if (save.getAttribute('data-fh-v4-poststart-guard') === 'true') {
      save.disabled = false;
      save.removeAttribute('aria-disabled');
      save.removeAttribute('title');
      save.removeAttribute('data-fh-v4-poststart-guard');
    }
  }

  function buildFirstVisitHref(snapshot) {
    var context = currentContext();
    var patient = context && context.patient;
    var decision = snapshot || canonicalSnapshot();
    var patientId = text(patient && patient.patient_id);
    var lineId = text(decision && decision.produced_line_id);
    var Params = root.URLSearchParams || (typeof URLSearchParams !== 'undefined' ? URLSearchParams : null);
    if (!patient || !patientId || !isValidatedWithLine(decision) || !lineId || !Params) return '';
    var params = new Params();
    if (patient.cip) params.set('cip', patient.cip);
    params.set('patient_id', patientId);
    params.set('line_id', lineId);
    if (patient.servicioSlug || patient.servicio) params.set('servicio', patient.servicioSlug || patient.servicio);
    if (patient.patologia) params.set('patologia', patient.patologia);
    params.set('entrada', 'primera_visita');
    return 'farmacia_primera_visita.html?' + params.toString();
  }

  function setFirstVisitAccess(allowed, snapshot) {
    var link = byId('fhValGoFirstVisitV4');
    if (!link) return;
    if (allowed) {
      var href = buildFirstVisitHref(snapshot);
      if (href) {
        link.setAttribute('href', href);
        link.setAttribute('data-v4-href', href);
        link.classList.remove('hidden');
        link.removeAttribute('aria-disabled');
        link.removeAttribute('tabindex');
        return;
      }
    }
    link.removeAttribute('href');
    link.removeAttribute('data-v4-href');
    link.classList.add('hidden');
    link.setAttribute('aria-disabled', 'true');
    link.setAttribute('tabindex', '-1');
  }

  function setStatus(message) {
    var status = byId('fhValV4Status');
    if (status && message) status.textContent = message;
  }

  var dirty = false;
  var refreshing = false;

  function selectedResult() {
    var select = byId('fhValEstado');
    return text(select && select.value);
  }

  function refresh(message) {
    if (refreshing) return;
    refreshing = true;
    try {
      unlockResultOptions();
      var snapshot = canonicalSnapshot();
      var poststart = isCoherentPoststart(snapshot);
      setPoststartControls(poststart);
      var canContinue = isValidatedWithLine(snapshot) && selectedResult() === 'validated' && !dirty;
      setFirstVisitAccess(canContinue, snapshot);
      var note = ensureNote();
      if (note) {
        var rectifying = !poststart && isValidatedWithLine(snapshot) && selectedResult() && selectedResult() !== 'validated';
        note.textContent = poststart
          ? POSTSTART_NOTE
          : (rectifying ? 'Al guardar esta rectificación, se retirará la línea pendiente de inicio y no se podrá continuar a Primera Visita.' : '');
        note.classList.toggle('hidden', !poststart && !rectifying);
      }
      if (message) setStatus(message);
    } finally {
      refreshing = false;
    }
  }

  function relevantEditable(target) {
    if (!target || !target.matches) return false;
    return target.matches([
      '#fhValEstado', '#fhValidadoFarmaco', '#fhValidadoPrincipioActivo', '#fhValidadoDosis', '#fhValidadoPresentacion',
      '#fhValidadoVia', '#fhValidadoPauta', '#fhValidadoPautaOtro', '#fhValidadoInduccion',
      '#fhValidadoJustificacion', '#fhValObservaciones', '#fhValCita', '#fhTipoValidacion', '#fhValMotivo'
    ].join(','));
  }

  function handleEdit(event) {
    if (!relevantEditable(event.target)) return;
    var snapshot = canonicalSnapshot();
    if (!isValidatedWithLine(snapshot)) return;
    if (isCoherentPoststart(snapshot) && event.target.id === 'fhValEstado') {
      event.preventDefault();
      event.stopImmediatePropagation();
      refresh();
      return;
    }
    dirty = true;
    if (event.target.id === 'fhValEstado' && text(event.target.value) !== 'validated') {
      refresh('Rectificación sin guardar. Guarde el nuevo estado para retirar la línea pendiente de inicio.');
    } else {
      refresh('Hay cambios sin guardar. Guarde la validación antes de continuar a Primera Visita.');
    }
  }

  function observeStatus() {
    var status = byId('fhValV4Status');
    if (!status || !root.MutationObserver) return;
    new root.MutationObserver(function () {
      var value = text(status.textContent);
      if (/Validación guardada en la sesión demo/i.test(value)) {
        dirty = false;
        root.setTimeout(function () { refresh(); }, 0);
      }
    }).observe(status, { childList: true, subtree: true, characterData: true });
  }

  function prepareFirstVisitNavigation(event) {
    var link = event.target && event.target.closest ? event.target.closest('#fhValGoFirstVisitV4') : null;
    if (!link) return;
    var snapshot = canonicalSnapshot();
    var allowed = isValidatedWithLine(snapshot) && selectedResult() === 'validated' && !dirty;
    var href = allowed ? buildFirstVisitHref(snapshot) : '';
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!href) {
      setFirstVisitAccess(false, snapshot);
      return;
    }
    link.setAttribute('href', href);
    link.setAttribute('data-v4-href', href);
    if (root.location && typeof root.location.assign === 'function') root.location.assign(href);
    else if (root.location) root.location.href = href;
  }

  function preventPoststartSave(event) {
    var save = event.target && event.target.closest ? event.target.closest('#fhValSaveV4') : null;
    if (!save || !isCoherentPoststart(canonicalSnapshot())) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    refresh();
  }

  function boot() {
    var demo = root.FarmaciaDemo;
    var ready = demo && demo.ready && typeof demo.ready.then === 'function' ? demo.ready : Promise.resolve();
    ready.then(function () {
      ensureNote();
      observeStatus();
      refresh();
    });
  }

  if (root.document) {
    root.document.addEventListener('input', handleEdit, true);
    root.document.addEventListener('change', handleEdit, true);
    root.document.addEventListener('click', preventPoststartSave, true);
    root.document.addEventListener('click', prepareFirstVisitNavigation, true);
    root.document.addEventListener('DOMContentLoaded', boot);
  }

  root.FarmaciaValidationTransitionGuardV4 = {
    refresh: refresh,
    canonicalSnapshot: canonicalSnapshot,
    isValidatedWithLine: isValidatedWithLine,
    isCoherentPoststart: isCoherentPoststart,
    buildFirstVisitHref: buildFirstVisitHref,
    prepareFirstVisitNavigation: prepareFirstVisitNavigation,
    preventPoststartSave: preventPoststartSave
  };
})(typeof window !== 'undefined' ? window : globalThis);
