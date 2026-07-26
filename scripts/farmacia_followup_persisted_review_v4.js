(function (root, factory) {
    'use strict';
    var api = factory(root || {});
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root && typeof root === 'object') root.FarmaciaFollowupPersistedReviewV4 = api;
    if (root && root.document) api.install(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';

    var STORE_KEY = 'farmaciaDemo.followupDrafts.v4';
    var MISSING = 'No informado';
    var READY_TEXT = 'Último borrador persistido listo para revisión. Sin interpretación clínica ni salida asistencial.';
    var STALE_TEXT = 'Hay cambios sin guardar. Esta revisión muestra únicamente el último borrador persistido.';
    var FIELD_IDS = {
        patient_id: 'fhSegPersistedReviewPatientId', line_id: 'fhSegPersistedReviewLineId', saved_at: 'fhSegPersistedReviewSavedAt',
        saved_by_demo: 'fhSegPersistedReviewSavedBy', notes: 'fhSegPersistedReviewNotes',
        mg1: 'fhSegPersistedReviewMg1', mg2: 'fhSegPersistedReviewMg2', mg3: 'fhSegPersistedReviewMg3', mg4: 'fhSegPersistedReviewMg4',
        ae_present: 'fhSegPersistedReviewAePresent', ae_description: 'fhSegPersistedReviewAeDescription',
        ae_severity: 'fhSegPersistedReviewAeSeverity', ae_resolution: 'fhSegPersistedReviewAeResolution',
        proms_collected: 'fhSegPersistedReviewPromsCollected', dlqi_total: 'fhSegPersistedReviewDlqiTotal',
        eva_dolor: 'fhSegPersistedReviewEvaDolor', eva_prurito: 'fhSegPersistedReviewEvaPrurito'
    };
    var LABELS = {
        si: 'Sí', no: 'No', no_consta: 'No consta', leve: 'Leve', moderado: 'Moderado', grave: 'Grave',
        requiere_derivacion: 'Requiere derivación', en_seguimiento: 'En seguimiento'
    };
    var installed = false;

    function textValue(value, mapped) {
        if (value === '' || value === null || value === undefined) return MISSING;
        var valueText = String(value);
        return mapped && Object.prototype.hasOwnProperty.call(LABELS, valueText) ? LABELS[valueText] : valueText;
    }

    function readExact(environment, patientId, lineId) {
        var env = environment || root;
        var drafts = env.FarmaciaFollowupDraftsV4;
        if (!env.sessionStorage || typeof env.sessionStorage.getItem !== 'function' || !drafts || typeof drafts.validateState !== 'function') {
            return { ok: false, draft: null };
        }
        var raw;
        try { raw = env.sessionStorage.getItem(STORE_KEY); } catch (error) { return { ok: false, draft: null }; }
        if (raw === null) return { ok: true, draft: null };
        var parsed;
        try { parsed = JSON.parse(raw); } catch (error) { return { ok: false, draft: null }; }
        var checked = drafts.validateState(parsed);
        if (!checked || !checked.ok) return { ok: false, draft: null };
        var patient = checked.state.patients[patientId];
        return { ok: true, draft: patient && patient.lines[lineId] || null };
    }

    function createRenderer(environment) {
        var env = environment || root;
        function byId(id) { return env.document && env.document.getElementById(id); }
        function setStatus(code, message) {
            var status = byId('fhSegPersistedReviewStatus');
            if (status) { status.textContent = message; status.setAttribute('data-status-code', code); }
            var card = byId('fhSegPersistedReviewCard');
            if (card) card.setAttribute('data-review-state', code);
        }
        function clear() {
            Object.keys(FIELD_IDS).forEach(function (field) {
                var element = byId(FIELD_IDS[field]);
                if (element) element.textContent = MISSING;
            });
        }
        function show(draft) {
            Object.keys(FIELD_IDS).forEach(function (field) {
                var element = byId(FIELD_IDS[field]);
                if (element) element.textContent = textValue(draft[field], ['mg1', 'mg2', 'mg3', 'mg4', 'ae_present', 'ae_severity', 'ae_resolution', 'proms_collected'].indexOf(field) !== -1);
            });
        }
        function render(detail) {
            var state = detail && typeof detail === 'object' ? detail : {};
            clear();
            if (state.storage_error) {
                setStatus('REVIEW_STORAGE_ERROR', 'No se puede leer el borrador persistido. La revisión se ha vaciado.');
                return { code: 'REVIEW_STORAGE_ERROR', draft: null };
            }
            if (state.ready !== true || !state.patient_id || !state.line_id) {
                setStatus('REVIEW_CONTEXT_BLOCKED', 'Revisión bloqueada: no hay un contexto canónico activo elegible.');
                return { code: 'REVIEW_CONTEXT_BLOCKED', draft: null };
            }
            var loaded = readExact(env, String(state.patient_id), String(state.line_id));
            if (!loaded.ok) {
                setStatus('REVIEW_STORAGE_ERROR', 'No se puede leer el borrador persistido. La revisión se ha vaciado.');
                return { code: 'REVIEW_STORAGE_ERROR', draft: null };
            }
            if (loaded.draft) show(loaded.draft);
            if (!loaded.draft) {
                setStatus('REVIEW_EMPTY', 'No hay un borrador persistido para revisar.');
                return { code: 'REVIEW_EMPTY', draft: null };
            }
            if (state.dirty === true) {
                setStatus('REVIEW_STALE_UNSAVED_CHANGES', STALE_TEXT);
                return { code: 'REVIEW_STALE_UNSAVED_CHANGES', draft: loaded.draft };
            }
            setStatus('REVIEW_READY', READY_TEXT);
            return { code: 'REVIEW_READY', draft: loaded.draft };
        }
        return { render: render, clear: clear };
    }

    function install(environment) {
        var env = environment || root;
        if (!env.document || installed) return null;
        installed = true;
        var renderer = createRenderer(env);
        renderer.clear();
        env.document.addEventListener('farmacia:followup-draft-state-v4', function (event) { renderer.render(event.detail || {}); });
        return renderer;
    }

    return { STORE_KEY: STORE_KEY, MISSING: MISSING, READY_TEXT: READY_TEXT, STALE_TEXT: STALE_TEXT,
        FIELD_IDS: FIELD_IDS, LABELS: LABELS, readExact: readExact, createRenderer: createRenderer, install: install };
});
