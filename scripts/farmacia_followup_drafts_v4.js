(function (root, factory) {
    'use strict';
    var api = factory(root || {});
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root && typeof root === 'object') root.FarmaciaFollowupDraftsV4 = api;
    if (root && root.document) api.install(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';

    var STORE_KEY = 'farmaciaDemo.followupDrafts.v1';
    var SCHEMA = STORE_KEY;
    var CHANGE_MESSAGE = 'Hay cambios sin guardar en el borrador de esta línea. Cambiar de paciente o línea descartará esos cambios. El último borrador guardado se conservará. ¿Quieres continuar?';
    var DISCARD_MESSAGE = '¿Quieres descartar el borrador guardado de esta línea?';
    var FIELDS = ['draft_id', 'patient_id', 'line_id', 'kind', 'notes', 'saved_at', 'saved_by_demo'];
    var controller = null;
    var dependencies = {};

    function ownKeys(value) { return value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : []; }
    function exactKeys(value, expected) {
        var actual = ownKeys(value).sort();
        var wanted = expected.slice().sort();
        return actual.length === wanted.length && actual.every(function (key, index) { return key === wanted[index]; });
    }
    function emptyState() { return { schema: SCHEMA, patients: {} }; }
    function failure(code) { return { ok: false, code: code, state: null }; }

    function validateState(state) {
        if (!state || typeof state !== 'object' || Array.isArray(state)) return failure('DRAFT_STATE_INVALID');
        if (state.schema !== SCHEMA) return failure('DRAFT_SCHEMA_MISMATCH');
        if (!exactKeys(state, ['schema', 'patients']) || !state.patients || typeof state.patients !== 'object' || Array.isArray(state.patients)) {
            return failure('DRAFT_STATE_INVALID');
        }
        var valid = true;
        Object.keys(state.patients).forEach(function (patientId) {
            var patient = state.patients[patientId];
            if (!patientId || !exactKeys(patient, ['lines']) || !patient.lines || typeof patient.lines !== 'object' || Array.isArray(patient.lines)) { valid = false; return; }
            Object.keys(patient.lines).forEach(function (lineId) {
                var draft = patient.lines[lineId];
                if (!lineId || !exactKeys(draft, FIELDS) || !FIELDS.every(function (field) { return typeof draft[field] === 'string'; }) ||
                        draft.kind !== 'followup' || draft.draft_id !== 'followup:' + lineId || draft.patient_id !== patientId || draft.line_id !== lineId) valid = false;
            });
        });
        return valid ? { ok: true, code: 'DRAFT_STATE_VALID', state: state } : failure('DRAFT_STATE_INVALID');
    }

    function createStore(storage) {
        function read() {
            if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') return failure('DRAFT_STORAGE_UNAVAILABLE');
            var raw;
            try { raw = storage.getItem(STORE_KEY); } catch (error) { return failure('DRAFT_STORAGE_UNAVAILABLE'); }
            if (raw === null) return { ok: true, code: 'DRAFT_EMPTY', state: emptyState() };
            var parsed;
            try { parsed = JSON.parse(raw); } catch (error) { return failure('DRAFT_STORAGE_CORRUPT'); }
            return validateState(parsed);
        }
        function write(state) {
            var checked = validateState(state);
            if (!checked.ok) return checked;
            if (!storage || typeof storage.setItem !== 'function') return failure('DRAFT_STORAGE_UNAVAILABLE');
            try { storage.setItem(STORE_KEY, JSON.stringify(state)); } catch (error) { return failure('DRAFT_STORAGE_UNAVAILABLE'); }
            return { ok: true, code: 'DRAFT_SAVED', state: state };
        }
        function get(patientId, lineId) {
            var loaded = read();
            if (!loaded.ok) return loaded;
            var patient = loaded.state.patients[patientId];
            return { ok: true, code: 'DRAFT_LOADED', state: loaded.state, draft: patient && patient.lines[lineId] || null };
        }
        function save(draft) {
            var loaded = read();
            if (!loaded.ok) return loaded;
            var state = loaded.state;
            if (!state.patients[draft.patient_id]) state.patients[draft.patient_id] = { lines: {} };
            state.patients[draft.patient_id].lines[draft.line_id] = draft;
            return write(state);
        }
        function discard(patientId, lineId) {
            var loaded = read();
            if (!loaded.ok) return loaded;
            var patient = loaded.state.patients[patientId];
            if (patient && Object.prototype.hasOwnProperty.call(patient.lines, lineId)) delete patient.lines[lineId];
            return write(loaded.state);
        }
        return { read: read, get: get, save: save, discard: discard };
    }

    function byId(env, id) { return env.document && env.document.getElementById(id); }
    function identityOf(value) { return { patient_id: String(value && value.patient_id || ''), line_id: String(value && value.line_id || '') }; }
    function sameIdentity(left, right) {
        left = identityOf(left); right = identityOf(right);
        return left.patient_id === right.patient_id && left.line_id === right.line_id;
    }

    function createController(environment, injected) {
        var env = environment || root;
        var deps = injected || {};
        var store = createStore(deps.storage !== undefined ? deps.storage : env.sessionStorage);
        var current = { patient_id: '', line_id: '' };
        var ready = false;
        var baseline = '';
        var dirty = false;
        var storageError = '';
        var restored = false;
        var hasSaved = false;

        function elements() {
            return { notes: byId(env, 'fhSegDraftNotes'), save: byId(env, 'fhSegDraftSave'), discard: byId(env, 'fhSegDraftDiscard'), status: byId(env, 'fhSegDraftStatus') };
        }
        function setStatus(value, code) {
            var status = elements().status;
            if (status) { status.textContent = value; status.setAttribute('data-status-code', code || ''); }
        }
        function refreshControls() {
            var ui = elements();
            var blocked = !ready || !!storageError;
            if (ui.notes) { ui.notes.disabled = blocked; ui.notes.setAttribute('aria-disabled', blocked ? 'true' : 'false'); }
            if (ui.save) { ui.save.disabled = blocked; ui.save.setAttribute('aria-disabled', blocked ? 'true' : 'false'); }
            if (ui.discard) { ui.discard.disabled = blocked; ui.discard.setAttribute('aria-disabled', blocked ? 'true' : 'false'); }
        }
        function showError(code) {
            storageError = code;
            ready = false;
            setStatus('Error de borrador: ' + code, code);
            refreshControls();
        }
        function showWorkingStatus(preferRestored) {
            if (storageError) return showError(storageError);
            if (dirty) setStatus('Cambios sin guardar', 'DRAFT_DIRTY');
            else if (preferRestored || restored) setStatus('Borrador restaurado', 'DRAFT_RESTORED');
            else if (hasSaved) setStatus('Borrador guardado', 'DRAFT_SAVED');
            else setStatus('Sin borrador guardado', 'DRAFT_EMPTY');
        }
        function applyContext(detail) {
            var next = identityOf(detail);
            var nextReady = !!(detail && detail.ok && detail.code === 'CANONICAL_ACTIVE_CONTEXT_READY' && next.patient_id && next.line_id);
            if (sameIdentity(current, next)) {
                ready = nextReady;
                refreshControls();
                if (!ready && !storageError) setStatus('Sin borrador guardado', 'DRAFT_EMPTY');
                else showWorkingStatus(false);
                return;
            }
            current = next;
            ready = nextReady;
            baseline = '';
            dirty = false;
            restored = false;
            hasSaved = false;
            storageError = '';
            var ui = elements();
            if (ui.notes) ui.notes.value = '';
            if (ready) {
                var loaded = store.get(current.patient_id, current.line_id);
                if (!loaded.ok) { showError(loaded.code); return; }
                if (loaded.draft) {
                    baseline = loaded.draft.notes;
                    restored = true;
                    hasSaved = true;
                    if (ui.notes) ui.notes.value = baseline;
                }
            }
            refreshControls();
            showWorkingStatus(restored);
        }
        function onInput() {
            var notes = elements().notes;
            dirty = !!notes && notes.value !== baseline;
            restored = false;
            showWorkingStatus(false);
        }
        function save() {
            var context = env.__farmaciaFollowupContextV4;
            if (!ready || !context || !context.ok || context.code !== 'CANONICAL_ACTIVE_CONTEXT_READY' || !sameIdentity(context, current)) {
                setStatus('Error de borrador: DRAFT_ACTIVE_CONTEXT_REQUIRED', 'DRAFT_ACTIVE_CONTEXT_REQUIRED');
                return { ok: false, code: 'DRAFT_ACTIVE_CONTEXT_REQUIRED' };
            }
            var notes = elements().notes;
            var now = typeof deps.now === 'function' ? deps.now() : new Date().toISOString();
            var professional = typeof deps.professional === 'function' ? deps.professional() : (byId(env, 'currentProfessional') && byId(env, 'currentProfessional').textContent || '');
            var draft = { draft_id: 'followup:' + current.line_id, patient_id: current.patient_id, line_id: current.line_id,
                kind: 'followup', notes: notes ? notes.value : '', saved_at: String(now), saved_by_demo: String(professional).trim() };
            var result = store.save(draft);
            if (!result.ok) { showError(result.code); return result; }
            baseline = draft.notes;
            dirty = false;
            restored = false;
            hasSaved = true;
            setStatus('Borrador guardado', 'DRAFT_SAVED');
            return { ok: true, code: 'DRAFT_SAVED', draft: draft };
        }
        function discard() {
            if (!ready || storageError) return { ok: false, code: storageError || 'DRAFT_ACTIVE_CONTEXT_REQUIRED' };
            var ask = deps.confirm || env.confirm;
            if (typeof ask === 'function' && !ask(DISCARD_MESSAGE)) return { ok: false, code: 'DRAFT_DISCARD_CANCELLED' };
            var result = store.discard(current.patient_id, current.line_id);
            if (!result.ok) { showError(result.code); return result; }
            baseline = ''; dirty = false; restored = false; hasSaved = false;
            if (elements().notes) elements().notes.value = '';
            setStatus('Sin borrador guardado', 'DRAFT_EMPTY');
            return { ok: true, code: 'DRAFT_DISCARDED' };
        }
        function beforeContextChange(change) {
            var next = identityOf(change && change.next);
            if (sameIdentity(current, next)) return 'same';
            if (dirty) {
                var ask = deps.confirm || env.confirm;
                if (typeof ask !== 'function' || !ask(CHANGE_MESSAGE)) return 'cancel';
                dirty = false;
                if (elements().notes) elements().notes.value = baseline;
            }
            return 'proceed';
        }
        function state() { return { current: identityOf(current), ready: ready, baseline: baseline, dirty: dirty, storageError: storageError }; }
        return { applyContext: applyContext, onInput: onInput, save: save, discard: discard, beforeContextChange: beforeContextChange, state: state, store: store };
    }

    function install(environment, injected) {
        var env = environment || root;
        if (!env.document) return null;
        if (controller) return controller;
        controller = createController(env, injected || dependencies);
        env.document.addEventListener('farmacia:followup-context-applied-v4', function (event) { controller.applyContext(event.detail || {}); });
        env.document.addEventListener('input', function (event) { if (event.target && event.target.id === 'fhSegDraftNotes') controller.onInput(); });
        env.document.addEventListener('click', function (event) {
            if (!event.target || typeof event.target.closest !== 'function') return;
            if (event.target.closest('#fhSegDraftSave')) { event.preventDefault(); controller.save(); }
            if (event.target.closest('#fhSegDraftDiscard')) { event.preventDefault(); controller.discard(); }
        });
        return controller;
    }
    function beforeContextChange(change) { return controller ? controller.beforeContextChange(change) : 'proceed'; }
    function configure(next) { dependencies = next || {}; }

    return { STORE_KEY: STORE_KEY, SCHEMA: SCHEMA, CHANGE_MESSAGE: CHANGE_MESSAGE, DISCARD_MESSAGE: DISCARD_MESSAGE,
        emptyState: emptyState, validateState: validateState, createStore: createStore, createController: createController,
        configure: configure, install: install, beforeContextChange: beforeContextChange };
});
