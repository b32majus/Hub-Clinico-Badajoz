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

  function setResultOptionsForStartState(active) {
    var select = byId('fhValEstado');
    if (!select) return;
    Array.prototype.forEach.call(select.options || [], function (option) {
      option.disabled = false;
      if (active && option.value && option.value !== 'validated') option.disabled = true;
    });
    if (active) select.value = 'validated';
  }

  function isActiveLine(snapshot) {
    return !!(snapshot && snapshot.line && snapshot.line.status === 'active' && text(snapshot.line.start_date));
  }

  function setSaveBlocked(active) {
    var save = byId('fhValSaveV4');
    if (!save) return;
    save.disabled = !!active;
    save.setAttribute('aria-disabled', active ? 'true' : 'false');
  }

  function buildFirstVisitHref(snapshot) {
    var context = currentContext();
    var patient = context && context.patient;
    if (!patient || !patient.patient_id || !snapshot || !text(snapshot.produced_line_id)) return '';
    var params = new URLSearchParams();
    if (patient.cip) params.set('cip', patient.cip);
    params.set('patient_id', patient.patient_id);
    params.set('line_id', snapshot.produced_line_id);
    if (patient.servicioSlug || patient.servicio) params.set('servicio', patient.servicioSlug || patient.servicio);
    if (patient.patologia) params.set('patologia', patient.patologia);
    params.set('entrada', 'primera_visita');
    return 'farmacia_primera_visita.html?' + params.toString();
  }

  function setFirstVisitAccess(allowed, snapshot) {
    var link = byId('fhValGoFirstVisitV4');
    if (!link) return;
    if (allowed) {
      var href = buildFirstVisitHref(snapshot) || text(link.getAttribute('data-v4-href'));
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

  function selectedResult() {
    var select = byId('fhValEstado');
    return text(select && select.value);
  }

  function refresh(message) {
    if (refreshing) return;
    refreshing = true;
    try {
      var snapshot = canonicalSnapshot();
      var active = isActiveLine(snapshot);
      setResultOptionsForStartState(active);
      setSaveBlocked(active);
      var canContinue = isValidatedWithLine(snapshot) && selectedResult() === 'validated' && !dirty;
      setFirstVisitAccess(canContinue, snapshot);
      var note = ensureNote();
      if (note) {
        var rectifying = !active && isValidatedWithLine(snapshot) && selectedResult() && selectedResult() !== 'validated';
        note.textContent = active
          ? 'El tratamiento ya está iniciado. Los cambios posteriores requieren un movimiento clínico trazable.'
          : (rectifying ? 'Al guardar esta rectificación, se retirará la línea pendiente de inicio y no se podrá continuar a Primera Visita.' : '');
        note.classList.toggle('hidden', !(active || rectifying));
      }
      if (active) setStatus('Tratamiento activo. La rectificación preinicio ya no está disponible.');
      else if (message) setStatus(message);
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
    if (isActiveLine(snapshot)) {
      if (event.target.id === 'fhValEstado') event.target.value = 'validated';
      dirty = false;
      refresh('El tratamiento ya está iniciado. Los cambios posteriores requieren un movimiento clínico trazable.');
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
    root.document.addEventListener('click', function (event) {
      var save = event.target && event.target.closest ? event.target.closest('#fhValSaveV4') : null;
      if (save && isActiveLine(canonicalSnapshot())) {
        event.preventDefault();
        event.stopImmediatePropagation();
        refresh('El tratamiento ya está iniciado. Los cambios posteriores requieren un movimiento clínico trazable.');
        return;
      }
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
