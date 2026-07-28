#!/usr/bin/env python3
from pathlib import Path


def replace_once(path, old, new):
    source = path.read_text(encoding='utf-8')
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:100]!r}')
    path.write_text(source.replace(old, new, 1), encoding='utf-8')

html = Path('farmacia_primera_visita.html')
guard = Path('scripts/farmacia_validation_export_truth_v4_transition_guard.js')

confirmation = '''<section class="dashboard-card" id="fhPvStartCard"><h2 class="section-title"><i class="fas fa-play-circle"></i> Confirmación de inicio</h2>
    <div class="info-grid">
        <div class="info-field"><span class="info-field__label">Línea terapéutica</span><span class="info-field__value" id="fhPvStartLineId">No disponible</span></div>
        <div class="info-field"><span class="info-field__label">Tratamiento validado</span><span class="info-field__value" id="fhPvStartTreatment">No disponible</span></div>
        <div class="info-field"><span class="info-field__label">Estado</span><span class="info-field__value" id="fhPvStartState">Contexto no validado</span></div>
        <div class="info-field"><span class="info-field__label">Fecha real de inicio</span><span class="info-field__value" id="fhPvStartDateValue">No informado</span></div>
        <div class="info-field"><span class="info-field__label">Profesional FH demo</span><span class="info-field__value" id="fhPvStartProfessional">No informado</span></div>
    </div>
    <div id="fhPvStartStatus" class="notice-box notice-box--info" role="status">Comprobando el contexto canónico de la línea…</div>
    <div class="form-actions">
        <button type="button" class="btn btn-primary" id="fhPvConfirmStart" disabled><i class="fas fa-check-circle"></i> Confirmar inicio de tratamiento</button>
        <a class="btn btn-secondary hidden" id="fhPvGoSeguimientoV4" aria-disabled="true"><i class="fas fa-arrow-right"></i> Continuar a Seguimiento</a>
    </div>
</section>
'''
replace_once(html,
    '<section class="dashboard-card"><h2 class="section-title"><i class="fas fa-notes-medical"></i> Registro de primera visita</h2>',
    confirmation + '<section class="dashboard-card"><h2 class="section-title"><i class="fas fa-notes-medical"></i> Registro de primera visita</h2>')

replace_once(html,
    '<div class="form-grid"><div class="form-group"><label for="fhPvFecha">Fecha primera visita / administración</label><input type="date" class="form-control" id="fhPvFecha"></div><div class="form-group"><label for="fhPvInduccionRealizada">¿Se realiza inducción?</label><select class="form-select" id="fhPvInduccionRealizada"><option>Sí</option><option>No</option></select></div><div class="form-group"><label for="fhPvEstratificacion">Estratificación</label><select class="form-select" id="fhPvEstratificacion"><option>Nivel 1</option><option>Nivel 2</option><option>Nivel 3</option></select></div></div>\n    <div class="form-grid"><div class="form-group"><label for="fhPvProms">PROMs basales</label><select class="form-select" id="fhPvProms"><option>No</option><option>Sí</option></select></div></div>',
    '<div class="form-grid"><div class="form-group"><label for="fhPvFecha">Fecha real de inicio</label><input type="date" class="form-control" id="fhPvFecha"></div><div class="form-group"><label for="fhPvInduccionRealizada">¿Se realiza inducción?</label><select class="form-select" id="fhPvInduccionRealizada"><option value="">No informado</option><option value="Sí">Sí</option><option value="No">No</option></select></div><div class="form-group"><label for="fhPvEstratificacion">Estratificación</label><select class="form-select" id="fhPvEstratificacion"><option value="">No informada</option><option value="Nivel 1">Nivel 1</option><option value="Nivel 2">Nivel 2</option><option value="Nivel 3">Nivel 3</option></select></div></div>\n    <div class="form-grid"><div class="form-group"><label for="fhPvProms">PROMs basales</label><select class="form-select" id="fhPvProms"><option value="">No informado</option><option value="Sí">Sí</option><option value="No">No</option></select></div></div>')

replace_once(html,
    '            <script src="scripts/farmacia_pautas_catalog.js?v=20260614-wo6-b"></script>',
    '            <script src="scripts/farmacia_multitreatment_core.js?v=20260725-start-core"></script>\n            <script src="scripts/farmacia_pautas_catalog.js?v=20260614-wo6-b"></script>')
replace_once(html,
    '    <script src="scripts/farmacia_primera_visita.js?v=20260614-wo7d"></script>',
    '    <script src="scripts/farmacia_primera_visita.js?v=20260614-wo7d"></script>\n    <script src="scripts/farmacia_first_visit_start_v4.js?v=20260725-s08"></script>')

replace_once(guard,
'''  function unlockResultOptions() {
    var select = byId('fhValEstado');
    if (!select) return;
    Array.prototype.forEach.call(select.options || [], function (option) {
      option.disabled = false;
    });
  }''',
'''  function unlockResultOptions(activeLine) {
    var select = byId('fhValEstado');
    if (!select) return;
    Array.prototype.forEach.call(select.options || [], function (option) {
      option.disabled = !!activeLine && (option.value === 'pending' || option.value === 'denied');
    });
  }''')

replace_once(guard,
'''  function buildFirstVisitHref() {
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
  }''',
'''  function canonicalLine(snapshot) {
    try {
      var context = currentContext();
      var patient = context && context.patient;
      var core = root.FarmaciaMultitreatmentCore;
      if (!patient || !patient.patient_id || !core || !snapshot || !snapshot.produced_line_id) return null;
      var state = core.createSessionStore(root.sessionStorage).load();
      return state && state.patients && state.patients[patient.patient_id]
        && state.patients[patient.patient_id].lines[snapshot.produced_line_id] || null;
    } catch (error) {
      return null;
    }
  }

  function buildFirstVisitHref() {
    var context = currentContext();
    var patient = context && context.patient;
    var snapshot = canonicalSnapshot();
    if (!patient || !patient.patient_id || !snapshot || !snapshot.produced_line_id) return '';
    var params = new URLSearchParams();
    params.set('cip', patient.cip || '');
    params.set('patient_id', patient.patient_id);
    params.set('line_id', snapshot.produced_line_id);
    params.set('servicio', patient.servicioSlug || patient.servicio || '');
    params.set('patologia', patient.patologia || '');
    params.set('entrada', 'primera_visita');
    return 'farmacia_primera_visita.html?' + params.toString();
  }''')

replace_once(guard,
'''      unlockResultOptions();
      var snapshot = canonicalSnapshot();
      var canContinue = isValidatedWithLine(snapshot) && selectedResult() === 'validated' && !dirty;
      setFirstVisitAccess(canContinue);
      var note = ensureNote();
      if (note) {
        var rectifying = isValidatedWithLine(snapshot) && selectedResult() && selectedResult() !== 'validated';
        note.textContent = rectifying
          ? 'Al guardar esta rectificación, se retirará la línea pendiente de inicio y no se podrá continuar a Primera Visita.'
          : '';
        note.classList.toggle('hidden', !rectifying);
      }''',
'''      var snapshot = canonicalSnapshot();
      var line = canonicalLine(snapshot);
      var activeLine = !!(line && line.status === 'active');
      unlockResultOptions(activeLine);
      var canContinue = isValidatedWithLine(snapshot) && line && line.status === 'validated_not_started'
        && selectedResult() === 'validated' && !dirty;
      setFirstVisitAccess(canContinue);
      var note = ensureNote();
      if (note) {
        var rectifying = !activeLine && isValidatedWithLine(snapshot) && selectedResult() && selectedResult() !== 'validated';
        note.textContent = activeLine
          ? 'El tratamiento ya está iniciado. Los cambios posteriores requieren un movimiento clínico trazable.'
          : (rectifying ? 'Al guardar esta rectificación, se retirará la línea pendiente de inicio y no se podrá continuar a Primera Visita.' : '');
        note.classList.toggle('hidden', !activeLine && !rectifying);
      }''')

print('patched First Visit S08 HTML and Validation transition guard')