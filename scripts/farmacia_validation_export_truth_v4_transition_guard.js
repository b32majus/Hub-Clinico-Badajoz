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

  function buildFirstVisitHref(snapshot) {
    var demo = root.FarmaciaDemo;
    var context = currentContext();
    var patient = context && context.patient;
    var decision = snapshot || canonicalSnapshot();
    var patientId = text(patient && patient.patient_id);
    var lineId = text(decision && decision.produced_line_id);
    if (!demo || typeof demo.makeContextUrl !== 'function' || !patient || !patientId || !isValidatedWithLine(decision) || !lineId) return '';
    return demo.makeContextUrl('farmacia_primera_visita.html', {
      cip: patient.cip,
      patient_id: patientId,
      line_id: lineId,
      servicio: patient.servicioSlug || patient.servicio,
      patologia: patient.patologia,
      entrada: 'primera_visita'
    });
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
      var canContinue = isValidatedWithLine(snapshot) && selectedResult() === 'validated' && !dirty;
      setFirstVisitAccess(canContinue, snapshot);
      var note = ensureNote();
      if (note) {
        var rectifying = isValidatedWithLine(snapshot) && selectedResult() && selectedResult() !== 'validated';
        note.textContent = rectifying
          ? 'Al guardar esta rectificación, se retirará la línea pendiente de inicio y no se podrá continuar a Primera Visita.'
          : '';
        note.classList.toggle('hidden', !rectifying);
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
    root.document.addEventListener('click', prepareFirstVisitNavigation, true);
    root.document.addEventListener('DOMContentLoaded', boot);
  }

  root.FarmaciaValidationTransitionGuardV4 = {
    refresh: refresh,
    canonicalSnapshot: canonicalSnapshot,
    isValidatedWithLine: isValidatedWithLine,
    buildFirstVisitHref: buildFirstVisitHref,
    prepareFirstVisitNavigation: prepareFirstVisitNavigation
  };
})(typeof window !== 'undefined' ? window : globalThis);
