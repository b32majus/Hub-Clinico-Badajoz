(function (root, factory) {
    'use strict';
    var api = factory(root || {});
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root && typeof root === 'object') root.FarmaciaFirstVisitIdentityV4 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';

    function text(value) {
        return value === null || value === undefined ? '' : String(value).trim();
    }

    function readIdentity(search) {
        var Params = root.URLSearchParams || (typeof URLSearchParams !== 'undefined' ? URLSearchParams : null);
        if (!Params) return { patient_id: '', line_id: '', cip: '' };
        var params = new Params(search || '');
        return {
            patient_id: text(params.get('patient_id')),
            line_id: text(params.get('line_id')),
            cip: text(params.get('cip'))
        };
    }

    function blocked(code, message, identity) {
        return {
            ok: false,
            code: code,
            message: message,
            patient_id: text(identity && identity.patient_id),
            line_id: text(identity && identity.line_id),
            line: null,
            validation_act: null,
            start_movement: null
        };
    }

    function values(indexed) {
        return indexed && typeof indexed === 'object' ? Object.keys(indexed).map(function (key) { return indexed[key]; }) : [];
    }

    function resolveCanonicalContext(options) {
        var source = options || {};
        var identity = source.identity || {};
        var patientId = text(identity.patient_id);
        var lineId = text(identity.line_id);
        var core = source.core;

        if (!patientId || !lineId) {
            return blocked('MISSING_IDENTITY', 'No se puede abrir Primera Visita: faltan patient_id o line_id en el enlace.', identity);
        }
        if (!core || typeof core.createSessionStore !== 'function') {
            return blocked('CORE_UNAVAILABLE', 'No se puede comprobar el contexto terapéutico canónico.', identity);
        }

        var state;
        try {
            state = core.createSessionStore(source.storage).load();
        } catch (error) {
            return blocked('STORE_UNAVAILABLE', 'No se puede leer el estado terapéutico de la sesión.', identity);
        }

        var patient = state && state.patients && state.patients[patientId];
        if (!patient) return blocked('PATIENT_NOT_FOUND', 'No existe un estado canónico para el paciente indicado.', identity);

        var line = patient.lines && patient.lines[lineId];
        if (!line) return blocked('LINE_NOT_FOUND', 'La línea indicada no pertenece al contexto terapéutico disponible.', identity);
        if (text(line.patient_id) !== patientId) return blocked('PATIENT_MISMATCH', 'La línea no pertenece al paciente indicado.', identity);
        if (line.provenance !== 'validated_in_hub') {
            return blocked('UNSUPPORTED_PROVENANCE', 'La línea no procede de una validación positiva realizada en el Hub.', identity);
        }

        var validationAct = patient.validation_acts && patient.validation_acts[line.source_validation_act_id];
        if (!validationAct || validationAct.result !== 'validated' || text(validationAct.produced_line_id) !== lineId) {
            return blocked('VALIDATION_MISMATCH', 'No existe una validación positiva coherente para esta línea.', identity);
        }

        var starts = values(patient.movements).filter(function (movement) {
            return movement && movement.movement_type === 'start' && text(movement.target_line_id) === lineId;
        });

        if (line.status === 'validated_not_started') {
            if (text(line.start_date) || starts.length) {
                return blocked('PENDING_START_INCONSISTENT', 'La línea pendiente de inicio contiene datos de inicio incoherentes.', identity);
            }
            return {
                ok: true,
                code: 'CANONICAL_CONTEXT_READY',
                message: 'Línea canónica localizada. Tratamiento validado y pendiente de confirmación de inicio.',
                patient_id: patientId,
                line_id: lineId,
                line: line,
                validation_act: validationAct,
                start_movement: null
            };
        }

        if (line.status === 'active') {
            if (!text(line.start_date) || starts.length !== 1) {
                return blocked('ACTIVE_START_INCONSISTENT', 'La línea activa no contiene un único inicio canónico coherente.', identity);
            }
            if (text(starts[0].effective_at) !== text(line.start_date) || text(starts[0].validation_act_id) !== text(line.source_validation_act_id)) {
                return blocked('ACTIVE_START_MISMATCH', 'La fecha o la validación del movimiento de inicio no coinciden con la línea activa.', identity);
            }
            return {
                ok: true,
                code: 'CANONICAL_START_CONFIRMED',
                message: 'Tratamiento activo. Inicio confirmado de forma canónica.',
                patient_id: patientId,
                line_id: lineId,
                line: line,
                validation_act: validationAct,
                start_movement: starts[0]
            };
        }

        return blocked('LINE_NOT_ELIGIBLE', 'La línea no está disponible para confirmación de inicio en Primera Visita.', identity);
    }

    function byId(environment, id) {
        return environment.document ? environment.document.getElementById(id) : null;
    }

    function setText(environment, id, value) {
        var element = byId(environment, id);
        if (element) element.textContent = text(value) || 'No informado';
    }

    function setExportGate(environment, enabled, message) {
        ['fhPvExportTxt', 'fhPvExportCsv', 'fhPvExcelExportBtn'].forEach(function (id) {
            var button = byId(environment, id);
            if (!button) return;
            button.disabled = !enabled;
            button.setAttribute('aria-disabled', enabled ? 'false' : 'true');
            if (!enabled) button.setAttribute('title', message);
            else button.removeAttribute('title');
        });
    }

    function setStartControls(environment, result) {
        var dateInput = byId(environment, 'fhPvFecha');
        var confirmButton = byId(environment, 'fhPvConfirmStart');
        var active = !!(result.ok && result.line && result.line.status === 'active');
        var pending = !!(result.ok && result.line && result.line.status === 'validated_not_started');

        if (dateInput) {
            if (active) dateInput.value = text(result.line.start_date);
            dateInput.readOnly = active || !pending;
            dateInput.setAttribute('aria-readonly', dateInput.readOnly ? 'true' : 'false');
        }

        if (confirmButton) {
            confirmButton.disabled = !pending;
            confirmButton.setAttribute('aria-disabled', pending ? 'false' : 'true');
            confirmButton.classList.toggle('hidden', !pending);
        }
    }

    function buildFollowupHref(environment, result) {
        var env = environment || root;
        var active = !!(result && result.ok && result.line && result.line.status === 'active');
        var Params = env.URLSearchParams || root.URLSearchParams || (typeof URLSearchParams !== 'undefined' ? URLSearchParams : null);
        if (!active || !Params || !text(result.patient_id) || !text(result.line_id)) return '';

        var params = new Params((env.location && env.location.search) || '');
        var cip = text(params.get('cip'));
        var servicio = text(params.get('servicio')) || text(byId(env, 'fhPvServicio') && byId(env, 'fhPvServicio').value);
        var patologia = text(params.get('patologia')) || text(byId(env, 'fhPvPatologia') && byId(env, 'fhPvPatologia').value);

        params.delete('id');
        if (cip) params.set('cip', cip);
        else params.delete('cip');
        params.set('patient_id', result.patient_id);
        params.set('line_id', result.line_id);
        if (servicio) params.set('servicio', servicio);
        else params.delete('servicio');
        if (patologia) params.set('patologia', patologia);
        else params.delete('patologia');
        params.set('entrada', 'seguimiento');
        return 'farmacia_seguimiento.html?' + params.toString();
    }

    function ensureFollowupLink(environment) {
        var env = environment || root;
        var document = env.document;
        if (!document) return null;
        var existing = byId(env, 'fhPvGoFollowup');
        if (existing) return existing;
        var actions = byId(env, 'fhPvConfirmStart');
        actions = actions && actions.parentNode;
        if (!actions) return null;

        var link = document.createElement('a');
        link.id = 'fhPvGoFollowup';
        link.className = 'btn btn-outline hidden';
        link.setAttribute('aria-disabled', 'true');
        link.setAttribute('tabindex', '-1');
        var icon = document.createElement('i');
        icon.className = 'fas fa-arrow-right';
        icon.setAttribute('aria-hidden', 'true');
        link.appendChild(icon);
        link.appendChild(document.createTextNode(' Continuar a Seguimiento'));
        actions.appendChild(link);
        return link;
    }

    function setFollowupAccess(environment, result) {
        var env = environment || root;
        var link = ensureFollowupLink(env);
        if (!link) return '';
        var href = buildFollowupHref(env, result);
        if (!href) {
            link.removeAttribute('href');
            link.classList.add('hidden');
            link.setAttribute('aria-disabled', 'true');
            link.setAttribute('tabindex', '-1');
            return '';
        }
        link.setAttribute('href', href);
        link.classList.remove('hidden');
        link.removeAttribute('aria-disabled');
        link.removeAttribute('tabindex');
        return href;
    }

    function render(environment) {
        var env = environment || root;
        var identity = readIdentity(env.location && env.location.search);
        var result = resolveCanonicalContext({
            identity: identity,
            core: env.FarmaciaMultitreatmentCore,
            storage: env.sessionStorage
        });
        var card = byId(env, 'fhPvCanonicalContext');
        var status = byId(env, 'fhPvCanonicalStatus');
        var active = !!(result.ok && result.line && result.line.status === 'active');

        if (card) {
            card.setAttribute('data-context-state', result.ok ? (active ? 'active' : 'ready') : 'blocked');
            card.setAttribute('data-patient-id', result.patient_id || '');
            card.setAttribute('data-line-id', result.line_id || '');
        }
        if (status) {
            status.textContent = result.message;
            status.setAttribute('data-status-code', result.code);
        }

        setText(env, 'fhPvCanonicalPatientId', result.patient_id);
        setText(env, 'fhPvCanonicalLineId', result.line_id);
        setText(env, 'fhPvCanonicalDrug', result.line && (result.line.drug_name || result.line.active_ingredient));
        setText(env, 'fhPvCanonicalLineStatus', result.line && result.line.status);
        setText(env, 'fhPvCanonicalProfessional', result.start_movement && result.start_movement.declared_by_demo);
        setStartControls(env, result);
        setFollowupAccess(env, result);
        setExportGate(env, result.ok, result.message);

        return result;
    }

    function showStatus(environment, message, code) {
        var status = byId(environment, 'fhPvCanonicalStatus');
        if (!status) return;
        status.textContent = message;
        if (code) status.setAttribute('data-status-code', code);
    }

    function confirmStart(environment) {
        var env = environment || root;
        var current = render(env);
        var button = byId(env, 'fhPvConfirmStart');
        var dateInput = byId(env, 'fhPvFecha');
        var professional = text(byId(env, 'currentProfessional') && byId(env, 'currentProfessional').textContent);
        var startDate = text(dateInput && dateInput.value);

        if (!current.ok || !current.line || current.line.status !== 'validated_not_started') {
            showStatus(env, current.message || 'La línea no está disponible para confirmar inicio.', current.code || 'START_BLOCKED');
            return { ok: false, code: current.code || 'START_BLOCKED' };
        }
        if (!startDate) {
            showStatus(env, 'Indique la fecha real de inicio antes de confirmar.', 'START_DATE_REQUIRED');
            return { ok: false, code: 'START_DATE_REQUIRED' };
        }
        if (!professional) {
            showStatus(env, 'No existe un profesional FH demo visible para confirmar el inicio.', 'PROFESSIONAL_REQUIRED');
            return { ok: false, code: 'PROFESSIONAL_REQUIRED' };
        }
        if (!env.FarmaciaMultitreatmentCore || typeof env.FarmaciaMultitreatmentCore.confirmTreatmentStart !== 'function') {
            showStatus(env, 'No está disponible la operación canónica de inicio.', 'START_CORE_UNAVAILABLE');
            return { ok: false, code: 'START_CORE_UNAVAILABLE' };
        }

        if (button) {
            button.disabled = true;
            button.setAttribute('aria-disabled', 'true');
        }

        try {
            var store = env.FarmaciaMultitreatmentCore.createSessionStore(env.sessionStorage);
            var output = env.FarmaciaMultitreatmentCore.confirmTreatmentStart({
                store: store,
                patient_id: current.patient_id,
                line_id: current.line_id,
                start_date: startDate,
                declared_by_demo: professional,
                created_at: new Date().toISOString()
            });
            var refreshed = render(env);
            showStatus(env, output.idempotent ? 'El inicio ya estaba confirmado.' : 'Tratamiento activo. Inicio confirmado y persistido.', output.idempotent ? 'START_ALREADY_CONFIRMED' : 'START_CONFIRMED');
            return { ok: true, code: output.idempotent ? 'START_ALREADY_CONFIRMED' : 'START_CONFIRMED', output: output, context: refreshed };
        } catch (error) {
            if (button) {
                button.disabled = false;
                button.setAttribute('aria-disabled', 'false');
            }
            showStatus(env, 'No se pudo confirmar el inicio: ' + text(error && error.message), 'START_CONFIRMATION_FAILED');
            return { ok: false, code: 'START_CONFIRMATION_FAILED', error: error };
        }
    }

    function bind(environment) {
        var env = environment || root;
        var button = byId(env, 'fhPvConfirmStart');
        if (!button || button.getAttribute('data-start-bound') === 'true') return;
        button.setAttribute('data-start-bound', 'true');
        button.addEventListener('click', function () { confirmStart(env); });
    }

    function boot(environment) {
        var env = environment || root;
        var demo = env.FarmaciaDemo;
        var ready = demo && demo.ready && typeof demo.ready.then === 'function' ? demo.ready : Promise.resolve();
        return ready.then(function () {
            var result = render(env);
            bind(env);
            return result;
        });
    }

    if (root.document) root.document.addEventListener('DOMContentLoaded', function () { boot(root); });

    return {
        readIdentity: readIdentity,
        resolveCanonicalContext: resolveCanonicalContext,
        buildFollowupHref: buildFollowupHref,
        setFollowupAccess: setFollowupAccess,
        render: render,
        confirmStart: confirmStart,
        boot: boot
    };
});