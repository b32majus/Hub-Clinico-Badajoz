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
      note.textContent = 'La validación ya creó una línea pendiente de inicio. Para rectificarla se necesita una acción explícita de anulación; no puede cambiarse desde este selector.';
      select.parentNode.appendChild(note);
      select.setAttribute('aria-describedby', note.id);
    }
    return note;
  }

  function setResultOptionsLocked(locked) {
    var select = byId('fhValEstado');
    if (!select) return;
    ['pending', 'denied'].forEach(function (value) {
      var option = Array.prototype.find.call(select.options || [], function (item) { return item.value === value; });
      if (option) option.disabled = !!locked;
    });
    var note = ensureNote();
    if (note) note.classList.toggle('hidden', !locked);
  }

  function buildFirstVisitHref() {
    var demo = root.FarmaciaDemo;
    var context = currentContext();
    var patient = context && context.patient;
    if (!demo || !patient || typeof demo.makeContextUrl !== 'function') return '';
    return demo.makeContextUrl('farmacia_primera_visita.html', {
      cip: patient.cip,
      servicio: patient.servicioSlug || patient.servicio,
      patologia: patient.patologia,
      entrada: 'primera_visita'
    });
  }

  function setFirstVisitAccess(allowed) {
    var link = byId('fhValGoFirstVisitV4');
    if (!link) return;
    if (allowed) {
      var href = text(link.getAttribute('data-v4-href')) || buildFirstVisitHref();
      if (href) {
        link.setAttribute('href', href);
        link.setAttribute('data-v4-href', href);
      }
      link.classList.remove('hidden');
      link.removeAttribute('aria-disabled');
      link.removeAttribute('tabindex');
      return;
    }
    var currentHref = text(link.getAttribute('href'));
    if (currentHref) link.setAttribute('data-v4-href', currentHref);
    link.removeAttribute('href');
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

  function refresh(message) {
    if (refreshing) return;
    refreshing = true;
    try {
      var snapshot = canonicalSnapshot();
      var locked = isValidatedWithLine(snapshot);
      setResultOptionsLocked(locked);
      setFirstVisitAccess(locked && !dirty);
      if (message) setStatus(message);
    } finally {
      refreshing = false;
    }
  }

  function relevantEditable(target) {
    if (!target || !target.matches) return false;
    return target.matches([
      '#fhValidadoFarmaco', '#fhValidadoPrincipioActivo', '#fhValidadoDosis', '#fhValidadoPresentacion',
      '#fhValidadoVia', '#fhValidadoPauta', '#fhValidadoPautaOtro', '#fhValidadoInduccion',
      '#fhValidadoJustificacion', '#fhValObservaciones', '#fhValCita', '#fhTipoValidacion'
    ].join(','));
  }

  function handleResultChange(event) {
    var target = event.target;
    if (!target || target.id !== 'fhValEstado') return;
    var snapshot = canonicalSnapshot();
    if (!isValidatedWithLine(snapshot) || target.value === 'validated') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    target.value = 'validated';
    dirty = false;
    var reasonRow = byId('fhValMotivoRow');
    if (reasonRow) reasonRow.classList.add('hidden');
    refresh('La validación ya creó una línea pendiente de inicio. No puede cambiarse directamente a Pendiente o Denegado; requiere una anulación explícita.');
  }

  function handleEdit(event) {
    if (!relevantEditable(event.target)) return;
    if (!isValidatedWithLine(canonicalSnapshot())) return;
    dirty = true;
    refresh('Hay cambios sin guardar. Guarde la validación antes de continuar a Primera Visita.');
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
    root.document.addEventListener('change', handleResultChange, true);
    root.document.addEventListener('input', handleEdit, true);
    root.document.addEventListener('change', handleEdit, true);
    root.document.addEventListener('click', function (event) {
      var link = event.target && event.target.closest ? event.target.closest('#fhValGoFirstVisitV4[aria-disabled="true"]') : null;
      if (link) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    root.document.addEventListener('DOMContentLoaded', boot);
  }

  root.FarmaciaValidationTransitionGuardV4 = {
    refresh: refresh,
    canonicalSnapshot: canonicalSnapshot,
    isValidatedWithLine: isValidatedWithLine
  };
})(typeof window !== 'undefined' ? window : globalThis);
