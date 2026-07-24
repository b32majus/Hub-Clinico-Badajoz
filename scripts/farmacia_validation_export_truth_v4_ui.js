(function (root) {
  'use strict';
  var S = root.FarmaciaValidationExportTruthV4Shared;
  if (!S) throw new Error('FarmaciaValidationExportTruthV4 outputs missing');
  function chip(id, label, value) { var c = S.el(id); if (!c) return; var l = c.querySelector('.pb-chip__label'), s = c.querySelector('.pb-chip__status'); if (l && l.textContent !== label) l.textContent = label; if (s && s.textContent !== value) s.textContent = value; }
  function missing(id) { var n = S.el(id); if (n && /Pendiente de completar por Farmacia/i.test(S.t(n.textContent))) n.textContent = 'No informado'; }
  function restore(b) { if (!b) return; if (b.draft.induction && S.el('fhValidadoInduccion')) S.el('fhValidadoInduccion').value = b.draft.induction; if (b.draft.pharmacist_justification && S.el('fhValidadoJustificacion')) S.el('fhValidadoJustificacion').value = b.draft.pharmacist_justification; if (b.draft.validation_type && S.el('fhTipoValidacion')) S.el('fhTipoValidacion').value = b.draft.validation_type; }
  S.visible = function () {
    var b = S.bundle(); if (!b) return; var p = S.prebio(b);
    chip('upperPbChipAnaliticaReciente', 'Analítica', p.analitica); chip('pbChipAnaliticaReciente', 'Recencia analítica <3 meses', p.recencia); chip('upperPbChipVacunacion', 'Vacunación', p.vacunacion); chip('pbChipVacunacion', 'Vacunación', p.vacunacion); chip('upperPbChipMedPreventiva', 'Medicina preventiva', p.medicina); chip('pbChipMedPreventiva', 'Medicina preventiva', p.medicina);
    ['fhReumaDosis', 'fhReumaVia', 'fhReumaPauta', 'fhSolicitadoDosis', 'fhSolicitadoVia', 'fhSolicitadoPauta'].forEach(missing);
    var notice = S.el('fhValDemoNotice'), span = notice && notice.querySelector('span'); if (span) span.textContent = 'Demo con persistencia de sesión. Informe y exportaciones solo se generan desde la última decisión canónica guardada.';
  };
  function schedule(doRestore) { [0, 80, 250].forEach(function (ms) { root.setTimeout(function () { S.visible(); if (doRestore) restore(S.bundle()); }, ms); }); }

  S.patchSave();
  if (root.document) {
    root.document.addEventListener('click', S.intercept, true);
    root.document.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('#fhValSaveV4')) schedule(true); }, true);
    root.document.addEventListener('change', function (e) { var r = e.target && e.target.closest ? e.target.closest('[data-chip-target="fhAnaliticaReciente"] input[type="radio"]') : null; if (r && S.el('fhAnaliticaReciente')) { S.el('fhAnaliticaReciente').setAttribute('data-v4-explicit-selection', 'true'); schedule(false); } }, true);
    root.document.addEventListener('DOMContentLoaded', function () {
      var d = root.FarmaciaDemo; if (d && d.ready && d.ready.then) d.ready.then(function () { schedule(true); }); else schedule(true);
      var status = S.el('fhValV4Status'); if (status && root.MutationObserver) new root.MutationObserver(function () { schedule(true); }).observe(status, { childList: true, subtree: true, characterData: true });
      ['modPrebiologico', 'upperPrebioChips'].forEach(function (id) { var n = S.el(id); if (n && root.MutationObserver) new root.MutationObserver(function () { schedule(false); }).observe(n, { childList: true, subtree: true, characterData: true }); });
    });
  }
  root.FarmaciaValidationExportTruthV4 = { bundle: S.bundle, exportable: S.exportable, report: S.report, excelRow: S.excelRow, visible: S.visible };
})(typeof window !== 'undefined' ? window : globalThis);
