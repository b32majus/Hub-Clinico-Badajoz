#!/usr/bin/env python3
from pathlib import Path
import hashlib

EXPECTED = {
    'farmacia_primera_visita.html': '7442cb2732a807bcd2e5ff96bed47598fb55a960',
    'scripts/farmacia_primera_visita.js': '99cd74f95cf13ff79bf90db834bf2f793b2be3a4',
    'scripts/farmacia_validation_export_truth_v4_transition_guard.js': '3d418024ecbb79c8eb6b99f0aad5a6ae37a2327e',
}


def blob_sha(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def read(path: str) -> str:
    raw = Path(path).read_bytes()
    actual = blob_sha(raw)
    if actual != EXPECTED[path]:
        raise SystemExit(f'unexpected input blob for {path}: {actual}')
    return raw.decode('utf-8').replace('\r\n', '\n')


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return source.replace(old, new, 1)


html_path = 'farmacia_primera_visita.html'
html = read(html_path)
html = replace_once(
    html,
    '<section class="dashboard-card"><h2 class="section-title"><i class="fas fa-notes-medical"></i> Registro de primera visita</h2>',
    '''<section class="dashboard-card" id="fhPvStartConfirmationCard"><h2 class="section-title"><i class="fas fa-play-circle"></i> Confirmación de inicio</h2>
    <div class="info-grid">
        <div class="info-field"><span class="info-field__label">Línea</span><span class="info-field__value" id="fhPvStartLineId">No informado</span></div>
        <div class="info-field"><span class="info-field__label">Tratamiento validado</span><span class="info-field__value" id="fhPvStartTreatment">No informado</span></div>
        <div class="info-field"><span class="info-field__label">Estado</span><span class="info-field__value" id="fhPvStartState">Contexto no disponible</span></div>
        <div class="info-field"><span class="info-field__label">Fecha real de inicio</span><span class="info-field__value" id="fhPvStartDate">No informado</span></div>
        <div class="info-field"><span class="info-field__label">Profesional FH demo</span><span class="info-field__value" id="fhPvStartProfessional">No informado</span></div>
    </div>
    <p class="validation-note-block__value" id="fhPvStartMessage" role="status">Cargando estado canónico…</p>
    <div class="form-actions">
        <button type="button" class="btn btn-primary" id="fhPvConfirmStart" disabled><i class="fas fa-check"></i> Confirmar inicio de tratamiento</button>
        <a class="btn btn-primary hidden" id="fhPvGoFollowup" aria-disabled="true"><i class="fas fa-arrow-right"></i> Continuar a Seguimiento</a>
    </div>
</section>
<section class="dashboard-card"><h2 class="section-title"><i class="fas fa-notes-medical"></i> Registro de primera visita</h2>''',
    'insert confirmation block'
)
html = replace_once(
    html,
    '<select class="form-select" id="fhPvInduccionRealizada"><option>Sí</option><option>No</option></select>',
    '<select class="form-select" id="fhPvInduccionRealizada"><option value="">No informado</option><option>Sí</option><option>No</option></select>',
    'neutral induction'
)
html = replace_once(
    html,
    '<select class="form-select" id="fhPvEstratificacion"><option>Nivel 1</option><option>Nivel 2</option><option>Nivel 3</option></select>',
    '<select class="form-select" id="fhPvEstratificacion"><option value="">No informada</option><option>Nivel 1</option><option>Nivel 2</option><option>Nivel 3</option></select>',
    'neutral stratification'
)
html = replace_once(
    html,
    '<select class="form-select" id="fhPvProms"><option>No</option><option>Sí</option></select>',
    '<select class="form-select" id="fhPvProms"><option value="">No informado</option><option>Sí</option><option>No</option></select>',
    'neutral proms'
)
html = replace_once(
    html,
    '''            <script src="scripts/farmacia_pautas_catalog.js?v=20260614-wo6-b"></script>''',
    '''            <script src="scripts/farmacia_multitreatment_core.js?v=20260725-first-visit-start"></script>
            <script src="scripts/farmacia_pautas_catalog.js?v=20260614-wo6-b"></script>''',
    'load core'
)
html = replace_once(
    html,
    '''    <script src="scripts/farmacia_primera_visita.js?v=20260614-wo7d"></script>''',
    '''    <script src="scripts/farmacia_primera_visita.js?v=20260725-first-visit-start"></script>
    <script src="scripts/farmacia_first_visit_start_v4.js?v=20260725-first-visit-start"></script>''',
    'load adapter'
)
Path(html_path).write_text(html, encoding='utf-8')


js_path = 'scripts/farmacia_primera_visita.js'
js = read(js_path)
js = replace_once(
    js,
    '''        lines.push('Inducción realizada: ' + (fv('fhPvInduccionRealizada') || '—'));
        lines.push('Fecha primera visita: ' + (fv('fhPvFecha') || '—'));''',
    '''        var startApi = window.FarmaciaFirstVisitStartV4;
        var canonicalLine = startApi && typeof startApi.getCanonicalLine === 'function' ? startApi.getCanonicalLine() : null;
        if (canonicalLine && canonicalLine.status === 'active') {
            lines.push('Línea: ' + canonicalLine.line_id);
            lines.push('Estado línea: active');
            lines.push('Fecha real de inicio: ' + canonicalLine.start_date);
            lines.push('Profesional demo de inicio: ' + (startApi.getDeclaredByDemo() || '—'));
        }
        lines.push('Inducción realizada: ' + (fv('fhPvInduccionRealizada') || 'No informado'));
        lines.push('Fecha primera visita: ' + (canonicalLine && canonicalLine.status === 'active' ? canonicalLine.start_date : '—'));''',
    'canonical report metadata'
)
js = replace_once(
    js,
    '''                var treatment = typeof getCurrentPrimaryTreatment === 'function' ? getCurrentPrimaryTreatment() : {};
                var opts = {
                    tipoActo: 'primera_visita', visitaId: 'PV-' + Date.now().toString(36).toUpperCase(),
                    lineaActual: treatment, fechaActo: new Date().toISOString().substring(0, 10),''',
    '''                var startApi = window.FarmaciaFirstVisitStartV4;
                var canonicalLine = startApi && typeof startApi.getCanonicalLine === 'function' ? startApi.getCanonicalLine() : null;
                var canonicalStartDate = startApi && typeof startApi.getCanonicalStartDate === 'function' ? startApi.getCanonicalStartDate() : '';
                if (!canonicalLine || canonicalLine.status !== 'active' || !canonicalStartDate) {
                    alert('Confirme primero el inicio canónico del tratamiento.');
                    return;
                }
                var treatment = typeof getCurrentPrimaryTreatment === 'function' ? getCurrentPrimaryTreatment() : {};
                treatment.linea_id = canonicalLine.line_id;
                treatment.estado_linea = canonicalLine.status;
                treatment.fecha_inicio = canonicalStartDate;
                var opts = {
                    tipoActo: 'primera_visita', visitaId: 'PV-' + Date.now().toString(36).toUpperCase(),
                    lineaActual: treatment, fechaActo: canonicalStartDate,''',
    'canonical Excel export'
)
Path(js_path).write_text(js, encoding='utf-8')


guard_path = 'scripts/farmacia_validation_export_truth_v4_transition_guard.js'
guard = read(guard_path)
guard = replace_once(
    guard,
    '''  function unlockResultOptions() {
    var select = byId('fhValEstado');
    if (!select) return;
    Array.prototype.forEach.call(select.options || [], function (option) {
      option.disabled = false;
    });
  }''',
    '''  function setResultOptionsForStartState(active) {
    var select = byId('fhValEstado');
    if (!select) return;
    Array.prototype.forEach.call(select.options || [], function (option) {
      option.disabled = !!(active && option.value && option.value !== 'validated');
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
  }''',
    'active result options'
)
guard = replace_once(
    guard,
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
    '''  function buildFirstVisitHref(snapshot) {
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
  }''',
    'identified First Visit href'
)
guard = replace_once(
    guard,
    '''  function setFirstVisitAccess(allowed) {
    var link = byId('fhValGoFirstVisitV4');
    if (!link) return;
    if (allowed) {
      var href = text(link.getAttribute('data-v4-href')) || buildFirstVisitHref();''',
    '''  function setFirstVisitAccess(allowed, snapshot) {
    var link = byId('fhValGoFirstVisitV4');
    if (!link) return;
    if (allowed) {
      var href = buildFirstVisitHref(snapshot) || text(link.getAttribute('data-v4-href'));''',
    'pass snapshot to href'
)
guard = replace_once(
    guard,
    '''    try {
      unlockResultOptions();
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
      }
      if (message) setStatus(message);''',
    '''    try {
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
      else if (message) setStatus(message);''',
    'refresh active guard'
)
guard = replace_once(
    guard,
    '''    var snapshot = canonicalSnapshot();
    if (!isValidatedWithLine(snapshot)) return;
    dirty = true;''',
    '''    var snapshot = canonicalSnapshot();
    if (!isValidatedWithLine(snapshot)) return;
    if (isActiveLine(snapshot)) {
      if (event.target.id === 'fhValEstado') event.target.value = 'validated';
      dirty = false;
      refresh('El tratamiento ya está iniciado. Los cambios posteriores requieren un movimiento clínico trazable.');
      return;
    }
    dirty = true;''',
    'block active edits'
)
guard = replace_once(
    guard,
    '''    root.document.addEventListener('click', function (event) {
      var link = event.target && event.target.closest ? event.target.closest('#fhValGoFirstVisitV4[aria-disabled="true"]') : null;
      if (link) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);''',
    '''    root.document.addEventListener('click', function (event) {
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
    }, true);''',
    'block active save'
)
Path(guard_path).write_text(guard, encoding='utf-8')

for path in EXPECTED:
    print(path, blob_sha(Path(path).read_bytes()))
