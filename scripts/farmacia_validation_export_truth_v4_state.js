(function (root) {
  'use strict';
  var S = root.FarmaciaValidationExportTruthV4Shared;
  if (!S) throw new Error('FarmaciaValidationExportTruthV4 helpers missing');
  function current() {
    var d = root.FarmaciaDemo;
    if (!d || typeof d.getQueryContext !== 'function') return null;
    var c = d.getQueryContext();
    return c && c.patient ? { context: c, patient: c.patient } : null;
  }
  S.bundle = function () {
    var cur = current(), core = root.FarmaciaMultitreatmentCore;
    if (!cur || !core || !root.sessionStorage || !cur.patient.patient_id) return null;
    var store = core.createSessionStore(root.sessionStorage), state = store.load(), ps = store.getPatientState(state, cur.patient.patient_id);
    var acts = S.vals(ps.validation_acts).sort(function (a, b) { return S.t(a.performed_at || a.created_at).localeCompare(S.t(b.performed_at || b.created_at)); });
    var act = acts[acts.length - 1] || null, requests = S.vals(ps.requests);
    return { patient: cur.patient, context: cur.context, store: store, state: state, ps: ps, act: act, request: act && ps.requests[act.request_id] ? ps.requests[act.request_id] : (requests[0] || null), line: act && act.produced_line_id ? (ps.lines[act.produced_line_id] || null) : null, draft: ps.drafts && ps.drafts[S.DRAFT_ID] ? ps.drafts[S.DRAFT_ID] : {} };
  };
  S.exportable = function () {
    var b = S.bundle();
    if (!b || !b.patient) { root.alert('No hay un paciente seleccionado para exportar.'); return null; }
    if (!b.act || !b.act.result) { root.alert(S.BLOCK); return null; }
    if (b.act.result === 'validated' && (!b.line || b.line.status !== 'validated_not_started')) { root.alert('La decisión guardada no tiene una línea validada pendiente de inicio coherente. Exportación bloqueada.'); return null; }
    if (b.act.result !== 'validated' && (b.act.produced_line_id || b.line)) { root.alert('Pendiente o denegado no pueden contener una línea terapéutica. Exportación bloqueada.'); return null; }
    return b;
  };
  S.patchSave = function () {
    var m = root.FarmaciaValidationStateV4Model;
    if (!m || m.__exportTruthV4Patched || typeof m.saveDecision !== 'function') return;
    var original = m.saveDecision;
    m.saveDecision = function (options) {
      var out = original(options), store = options && options.store, pid = S.t(options && options.patientId);
      if (!store || !pid) return out;
      var ps = store.getPatientState(out.state, pid), old = ps.drafts[S.DRAFT_ID] || {}, recent = S.el('fhAnaliticaReciente');
      var draft = Object.assign({}, old, {
        patient_id: pid,
        validation_type: S.t(S.el('fhTipoValidacion') && S.el('fhTipoValidacion').value),
        origin_entry: S.t(S.el('fhOrigenEntrada') && S.el('fhOrigenEntrada').value),
        induction: S.t(S.el('fhValidadoInduccion') && S.el('fhValidadoInduccion').value),
        pharmacist_justification: S.t(S.el('fhValidadoJustificacion') && S.el('fhValidadoJustificacion').value),
        analitica_reciente_explicit: recent && recent.getAttribute('data-v4-explicit-selection') === 'true' ? S.t(recent.value) : S.t(old.analitica_reciente_explicit),
        saved_at: S.t(old.saved_at || options.performedAt || new Date().toISOString())
      });
      out.state = store.upsertDraft(out.state, pid, S.DRAFT_ID, draft);
      store.save(out.state);
      out.patient = store.getPatientState(out.state, pid);
      return out;
    };
    m.__exportTruthV4Patched = true;
  };
  S.prebio = function (b) {
    var p = b.patient || {}, d = b.draft || {}, recent = d.analitica_reciente_explicit;
    if (!recent && p.analiticaEstruct && Object.prototype.hasOwnProperty.call(p.analiticaEstruct, 'reciente')) recent = p.analiticaEstruct.reciente;
    return {
      analitica: S.clinical(p.analitica_estado || ''), recencia: S.recency(recent), hemograma: S.clinical(p.hemograma_estado || ''), bioquimica: S.clinical(p.bioquimica_estado || ''),
      mantoux: S.clinical(p.mantoux_estado || ''), igra: S.clinical(p.igra_estado || ''), vhb: S.clinical(p.vhb_estado || ''), vhc: S.clinical(p.vhc_estado || ''), vih: S.clinical(p.vih_estado || ''),
      vacunacion: S.clinical(p.vacunacion_estado || p.estado_vacunal || p.vacunacion || ''), medicina: S.clinical(p.medicina_preventiva_estado || ''), observaciones: S.t(p.observaciones_prebiologico),
      bloqueante: /BLOQUE/i.test(S.t(p.estado_prebiologico_enfermeria || p.estado)) ? S.t(p.observaciones_prebiologico) : ''
    };
  };
  S.requestView = function (b) {
    var r = b.request || {}, drug = r.drug || {}, th = r.therapy || {}, cat = drug.catalog_identity || drug.catalog_snapshot || {};
    return { requestedAt: S.t(r.requested_at), drug: S.t(drug.drug_name || b.patient.farmaco_solicitado || b.patient.farmaco || b.patient.marcaComercial), pa: S.t(drug.active_ingredient || b.patient.principioActivo || b.patient.principio_activo_import), dose: S.t(th.dose_text), presentation: S.t(th.presentation), route: S.t(th.route), pautaCode: S.t(th.pauta_codigo), pautaLabel: S.t(th.pauta_label), pautaOther: S.t(th.pauta_otro_texto), induction: S.t(b.draft.induction || th.induction), cat: cat };
  };
  S.exportTreatment = function (b) {
    var q = S.requestView(b), l = b.line || {}, cat = l.catalog_identity || l.catalog_snapshot || q.cat || {}, dose = S.t(l.dose_text || q.dose), pres = S.t(l.presentation || q.presentation), validated = b.act.result === 'validated';
    return {
      tratamiento_id: '', linea_id: validated ? S.t(l.line_id) : '', nombre_comercial: S.t(l.drug_name || q.drug), farmaco_nombre: S.t(l.drug_name || q.drug), principio_activo: S.t(l.active_ingredient || q.pa),
      codigo_nacional: S.t(cat.national_code || cat.codigo_nacional), nregistro: S.t(cat.registration_number || cat.nregistro), source_type: S.t(cat.source_type),
      tipo_relacion: validated ? S.t(l.relationship) : '', estado_linea: validated ? S.t(l.status) : '', tipo_movimiento: '', es_principal: validated && l.relationship === 'primary', fecha_inicio: validated ? S.t(l.start_date) : '', fecha_fin: validated ? S.t(l.end_date) : '',
      dosis: dose, dosis_texto: dose && pres && dose !== pres ? dose + ' · ' + pres : (dose || pres), presentacion: pres, via: S.t(l.route || q.route), pauta_codigo: S.t(l.pauta_codigo || q.pautaCode), pauta_label: S.t(l.pauta_label || q.pautaLabel), pauta_otro_texto: S.t(l.pauta_otro_texto || q.pautaOther), pauta: S.t(l.pauta_label || l.pauta_otro_texto || q.pautaLabel || q.pautaOther)
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
