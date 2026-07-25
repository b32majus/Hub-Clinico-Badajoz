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
            validation_act: null
        };
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
        if (line.status !== 'validated_not_started' || text(line.start_date)) {
            return blocked('LINE_NOT_PENDING_START', 'La línea no está en estado Validado · pendiente de inicio.', identity);
        }

        var validationAct = patient.validation_acts && patient.validation_acts[line.source_validation_act_id];
        if (!validationAct || validationAct.result !== 'validated' || text(validationAct.produced_line_id) !== lineId) {
            return blocked('VALIDATION_MISMATCH', 'No existe una validación positiva coherente para esta línea.', identity);
        }

        return {
            ok: true,
            code: 'CANONICAL_CONTEXT_READY',
            message: 'Línea canónica localizada. Tratamiento validado y pendiente de confirmación de inicio.',
            patient_id: patientId,
            line_id: lineId,
            line: line,
            validation_act: validationAct
        };
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

        if (card) {
            card.setAttribute('data-context-state', result.ok ? 'ready' : 'blocked');
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
        setExportGate(env, result.ok, result.message);

        return result;
    }

    function boot(environment) {
        var env = environment || root;
        var demo = env.FarmaciaDemo;
        var ready = demo && demo.ready && typeof demo.ready.then === 'function' ? demo.ready : Promise.resolve();
        return ready.then(function () { return render(env); });
    }

    if (root.document) root.document.addEventListener('DOMContentLoaded', function () { boot(root); });

    return {
        readIdentity: readIdentity,
        resolveCanonicalContext: resolveCanonicalContext,
        render: render,
        boot: boot
    };
});
