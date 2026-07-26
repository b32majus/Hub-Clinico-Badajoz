(function (root, factory) {
    'use strict';
    var api = factory(root || {});
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root && typeof root === 'object') root.FarmaciaFollowupDraftsV4 = api;
    if (root && root.document) api.install(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';

    var STORE_KEY = 'farmaciaDemo.followupDrafts.v3';
    var LEGACY_STORE_KEY = 'farmaciaDemo.followupDrafts.v2';
    var V1_STORE_KEY = 'farmaciaDemo.followupDrafts.v1';
    var SCHEMA = STORE_KEY;
    var CHANGE_MESSAGE = 'Hay cambios sin guardar en el borrador de esta línea. Cambiar de paciente o línea descartará esos cambios. El último borrador guardado se conservará. ¿Quieres continuar?';
    var DISCARD_MESSAGE = '¿Quieres descartar el borrador guardado de esta línea?';
    var ANSWERS = ['mg1', 'mg2', 'mg3', 'mg4'];
    var AE_FIELDS = ['ae_present', 'ae_description', 'ae_severity', 'ae_resolution'];
    var FIELDS = ['draft_id', 'patient_id', 'line_id', 'kind', 'notes', 'mg1', 'mg2', 'mg3', 'mg4', 'ae_present', 'ae_description', 'ae_severity', 'ae_resolution', 'saved_at', 'saved_by_demo'];
    var V2_FIELDS = ['draft_id', 'patient_id', 'line_id', 'kind', 'notes', 'mg1', 'mg2', 'mg3', 'mg4', 'saved_at', 'saved_by_demo'];
    var V1_FIELDS = ['draft_id', 'patient_id', 'line_id', 'kind', 'notes', 'saved_at', 'saved_by_demo'];
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
    function phasedFailure(code, phase) { var result = failure(code); result.phase = phase; return result; }

    function validateWith(state, schema, fields) {
        if (!state || typeof state !== 'object' || Array.isArray(state)) return failure('DRAFT_STATE_INVALID');
        if (state.schema !== schema) return failure('DRAFT_SCHEMA_MISMATCH');
        if (!exactKeys(state, ['schema', 'patients']) || !state.patients || typeof state.patients !== 'object' || Array.isArray(state.patients)) {
            return failure('DRAFT_STATE_INVALID');
        }
        var valid = true;
        Object.keys(state.patients).forEach(function (patientId) {
            var patient = state.patients[patientId];
            if (!patientId || !exactKeys(patient, ['lines']) || !patient.lines || typeof patient.lines !== 'object' || Array.isArray(patient.lines)) { valid = false; return; }
            Object.keys(patient.lines).forEach(function (lineId) {
                var draft = patient.lines[lineId];
                if (!lineId || !exactKeys(draft, fields) || !fields.every(function (field) { return typeof draft[field] === 'string'; }) ||
                        draft.kind !== 'followup' || draft.draft_id !== 'followup:' + lineId || draft.patient_id !== patientId || draft.line_id !== lineId ||
                        ((fields === FIELDS || fields === V2_FIELDS) && !ANSWERS.every(function (field) { return ['', 'si', 'no'].indexOf(draft[field]) !== -1; })) ||
                        (fields === FIELDS && (['', 'no_consta', 'no', 'si'].indexOf(draft.ae_present) === -1 ||
                            ['', 'leve', 'moderado', 'grave', 'requiere_derivacion'].indexOf(draft.ae_severity) === -1 ||
                            ['', 'no_consta', 'no', 'si', 'en_seguimiento'].indexOf(draft.ae_resolution) === -1 ||
                            (draft.ae_present !== 'si' && (draft.ae_description || draft.ae_severity || draft.ae_resolution))))) valid = false;
            });
        });
        return valid ? { ok: true, code: 'DRAFT_STATE_VALID', state: state } : failure('DRAFT_STATE_INVALID');
    }
    function validateState(state) { return validateWith(state, SCHEMA, FIELDS); }
    function validateLegacyState(state) { return validateWith(state, LEGACY_STORE_KEY, V2_FIELDS); }
    function validateV1State(state) { return validateWith(state, V1_STORE_KEY, V1_FIELDS); }
    function migrateLegacy(state, fromV1) {
        var migrated = emptyState();
        Object.keys(state.patients).forEach(function (patientId) {
            migrated.patients[patientId] = { lines: {} };
            Object.keys(state.patients[patientId].lines).forEach(function (lineId) {
                var old = state.patients[patientId].lines[lineId];
                migrated.patients[patientId].lines[lineId] = {
                    draft_id: old.draft_id, patient_id: old.patient_id, line_id: old.line_id, kind: old.kind, notes: old.notes,
                    mg1: fromV1 ? '' : old.mg1, mg2: fromV1 ? '' : old.mg2, mg3: fromV1 ? '' : old.mg3, mg4: fromV1 ? '' : old.mg4,
                    ae_present: '', ae_description: '', ae_severity: '', ae_resolution: '', saved_at: old.saved_at, saved_by_demo: old.saved_by_demo
                };
            });
        });
        return migrated;
    }

    function createStore(storage) {
        function read() {
            if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') return phasedFailure('DRAFT_STORAGE_UNAVAILABLE', 'read');
            var raw;
            try { raw = storage.getItem(STORE_KEY); } catch (error) { return phasedFailure('DRAFT_STORAGE_UNAVAILABLE', 'read'); }
            if (raw === null) {
                var legacyRaw;
                try { legacyRaw = storage.getItem(LEGACY_STORE_KEY); } catch (error) { return phasedFailure('DRAFT_STORAGE_UNAVAILABLE', 'read'); }
                var fromV1 = false;
                if (legacyRaw === null) {
                    try { legacyRaw = storage.getItem(V1_STORE_KEY); } catch (error) { return phasedFailure('DRAFT_STORAGE_UNAVAILABLE', 'read'); }
                    if (legacyRaw === null) return { ok: true, code: 'DRAFT_EMPTY', state: emptyState() };
                    fromV1 = true;
                }
                var legacyParsed;
                try { legacyParsed = JSON.parse(legacyRaw); } catch (error) { return phasedFailure('DRAFT_STORAGE_CORRUPT', 'read'); }
                var legacy = fromV1 ? validateV1State(legacyParsed) : validateLegacyState(legacyParsed);
                if (!legacy.ok) { legacy.phase = 'read'; return legacy; }
                var migrated = migrateLegacy(legacy.state, fromV1);
                try { storage.setItem(STORE_KEY, JSON.stringify(migrated)); } catch (error) { return phasedFailure('DRAFT_STORAGE_UNAVAILABLE', 'read'); }
                return { ok: true, code: 'DRAFT_MIGRATED', state: migrated };
            }
            var parsed;
            try { parsed = JSON.parse(raw); } catch (error) { return phasedFailure('DRAFT_STORAGE_CORRUPT', 'read'); }
            var result = validateState(parsed);
            if (!result.ok) result.phase = 'read';
            return result;
        }
        function write(state) {
            var checked = validateState(state);
            if (!checked.ok) { checked.phase = 'write'; return checked; }
            if (!storage || typeof storage.setItem !== 'function') return phasedFailure('DRAFT_STORAGE_UNAVAILABLE', 'write');
            try { storage.setItem(STORE_KEY, JSON.stringify(state)); } catch (error) { return phasedFailure('DRAFT_STORAGE_UNAVAILABLE', 'write'); }
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

    function hasConsistentActiveStatus(value) {
        if (!value || typeof value !== 'object') return false;
        var statuses = [];
        if (Object.prototype.hasOwnProperty.call(value, 'status')) statuses.push(value.status);
        if (value.line && typeof value.line === 'object' && Object.prototype.hasOwnProperty.call(value.line, 'status')) {
            statuses.push(value.line.status);
        }
        return statuses.length > 0 && statuses.every(function (status) { return String(status || '').trim() === 'active'; });
    }

    function createController(environment, injected) {
        var env = environment || root;
        var deps = injected || {};
        var store = createStore(deps.storage !== undefined ? deps.storage : env.sessionStorage);
        var current = { patient_id: '', line_id: '' };
        var ready = false;
        var baseline = emptyValues();
        var dirty = false;
        var storageError = '';
        var restored = false;
        var hasSaved = false;
        var pendingAcceptedContextDiscard = false;

        function elements() {
            return { notes: byId(env, 'fhSegDraftNotes'), adherence: byId(env, 'fhSegDraftAdherence'), adherenceStatus: byId(env, 'fhSegDraftAdherenceStatus'),
                mg1: byId(env, 'fhSegDraftMg1'), mg2: byId(env, 'fhSegDraftMg2'), mg3: byId(env, 'fhSegDraftMg3'), mg4: byId(env, 'fhSegDraftMg4'),
                ae: byId(env, 'fhSegDraftAe'), aeStatus: byId(env, 'fhSegDraftAeStatus'), ae_present: byId(env, 'fhSegDraftAePresent'),
                ae_description: byId(env, 'fhSegDraftAeDescription'), ae_severity: byId(env, 'fhSegDraftAeSeverity'), ae_resolution: byId(env, 'fhSegDraftAeResolution'),
                save: byId(env, 'fhSegDraftSave'), discard: byId(env, 'fhSegDraftDiscard'), status: byId(env, 'fhSegDraftStatus') };
        }
        function emptyValues() { return { notes: '', mg1: '', mg2: '', mg3: '', mg4: '', ae_present: '', ae_description: '', ae_severity: '', ae_resolution: '' }; }
        function setStatus(value, code) {
            var status = elements().status;
            if (status) { status.textContent = value; status.setAttribute('data-status-code', code || ''); }
        }
        function refreshControls() {
            var ui = elements();
            var blocked = !ready || !!storageError;
            if (ui.notes) { ui.notes.disabled = blocked; ui.notes.setAttribute('aria-disabled', blocked ? 'true' : 'false'); }
            if (ui.adherence) { ui.adherence.disabled = blocked; ui.adherence.setAttribute('aria-disabled', blocked ? 'true' : 'false'); }
            ANSWERS.forEach(function (field) { if (ui[field]) { ui[field].disabled = blocked; ui[field].setAttribute('aria-disabled', blocked ? 'true' : 'false'); } });
            if (ui.ae) { ui.ae.disabled = blocked; ui.ae.setAttribute('aria-disabled', blocked ? 'true' : 'false'); }
            if (ui.ae_present) { ui.ae_present.disabled = blocked; ui.ae_present.setAttribute('aria-disabled', blocked ? 'true' : 'false'); }
            var detailsBlocked = blocked || !ui.ae_present || ui.ae_present.value !== 'si';
            ['ae_description', 'ae_severity', 'ae_resolution'].forEach(function (field) { if (ui[field]) { ui[field].disabled = detailsBlocked; ui[field].setAttribute('aria-disabled', detailsBlocked ? 'true' : 'false'); } });
            if (ui.save) { ui.save.disabled = blocked; ui.save.setAttribute('aria-disabled', blocked ? 'true' : 'false'); }
            if (ui.discard) { ui.discard.disabled = blocked; ui.discard.setAttribute('aria-disabled', blocked ? 'true' : 'false'); }
        }
        function valuesFromUi() {
            var ui = elements();
            return { notes: ui.notes ? ui.notes.value : '', mg1: ui.mg1 ? ui.mg1.value : '', mg2: ui.mg2 ? ui.mg2.value : '',
                mg3: ui.mg3 ? ui.mg3.value : '', mg4: ui.mg4 ? ui.mg4.value : '', ae_present: ui.ae_present ? ui.ae_present.value : '',
                ae_description: ui.ae_description ? ui.ae_description.value : '', ae_severity: ui.ae_severity ? ui.ae_severity.value : '', ae_resolution: ui.ae_resolution ? ui.ae_resolution.value : '' };
        }
        function applyValues(value) {
            var ui = elements();
            ui.notes && (ui.notes.value = value.notes || '');
            ANSWERS.forEach(function (field) { if (ui[field]) ui[field].value = value[field] || ''; });
            AE_FIELDS.forEach(function (field) { if (ui[field]) ui[field].value = value[field] || ''; });
            showAdherenceStatus();
            showAeStatus();
            refreshControls();
        }
        function sameValues(left, right) { return ['notes'].concat(ANSWERS, AE_FIELDS).every(function (field) { return left[field] === right[field]; }); }
        function showAdherenceStatus() {
            var status = elements().adherenceStatus;
            if (!status) return;
            var count = ANSWERS.filter(function (field) { return !!valuesFromUi()[field]; }).length;
            var code = count === 0 ? 'ADHERENCE_EMPTY' : count === ANSWERS.length ? 'ADHERENCE_COMPLETE_UNINTERPRETED' : 'ADHERENCE_PARTIAL';
            var message = count === 0 ? 'Cuestionario de adherencia sin respuestas.' : count === ANSWERS.length ?
                'Cuestionario de adherencia completo. Interpretación clínica no habilitada en esta versión.' : 'Cuestionario de adherencia parcialmente completado.';
            status.textContent = message; status.setAttribute('data-status-code', code);
        }
        function showAeStatus() {
            var ui = elements();
            if (!ui.aeStatus) return;
            var value = valuesFromUi();
            var code = 'AE_EMPTY';
            var message = 'Efectos adversos sin respuesta.';
            if (value.ae_present === 'no_consta') { code = 'AE_NOT_RECORDED'; message = 'No consta información sobre efectos adversos en el borrador.'; }
            else if (value.ae_present === 'no') { code = 'AE_NO_EVENT'; message = 'No se documenta efecto adverso en el borrador.'; }
            else if (value.ae_present === 'si') {
                if (value.ae_description.trim() && value.ae_severity && value.ae_resolution) {
                    code = 'AE_PRESENT_COMPLETE_UNINTERPRETED';
                    message = 'Efecto adverso documentado en borrador. Causalidad clínica no evaluada en esta versión.';
                } else { code = 'AE_PRESENT_INCOMPLETE'; message = 'Efecto adverso presente con datos incompletos en el borrador.'; }
            }
            ui.aeStatus.textContent = message;
            ui.aeStatus.setAttribute('data-status-code', code);
        }
        function showReadError(code) {
            storageError = code;
            ready = false;
            baseline = emptyValues();
            dirty = false;
            restored = false;
            hasSaved = false;
            applyValues(baseline);
            setStatus('Error de borrador: ' + code, code);
            refreshControls();
        }
        function showMutationError(code) {
            storageError = code;
            ready = false;
            setStatus('Error de borrador: ' + code, code);
            refreshControls();
        }
        function showWorkingStatus(preferRestored) {
            if (storageError) {
                setStatus('Error de borrador: ' + storageError, storageError);
                refreshControls();
                return;
            }
            if (dirty) setStatus('Cambios sin guardar', 'DRAFT_DIRTY');
            else if (preferRestored || restored) setStatus('Borrador restaurado', 'DRAFT_RESTORED');
            else if (hasSaved) setStatus('Borrador guardado', 'DRAFT_SAVED');
            else setStatus('Sin borrador guardado', 'DRAFT_EMPTY');
        }
        function applyContext(detail) {
            var next = identityOf(detail);
            var nextReady = !!(detail && detail.ok && detail.code === 'CANONICAL_ACTIVE_CONTEXT_READY' &&
                hasConsistentActiveStatus(detail) && next.patient_id && next.line_id);
            if (sameIdentity(current, next)) {
                var wasReady = ready;
                if (storageError) { ready = false; showWorkingStatus(false); return; }
                if (wasReady && !nextReady) {
                    var droppedUnsaved = dirty || pendingAcceptedContextDiscard;
                    pendingAcceptedContextDiscard = false;
                    ready = false;
                    baseline = emptyValues(); dirty = false; restored = false; hasSaved = false;
                    applyValues(baseline);
                    if (droppedUnsaved) {
                        setStatus('Cambios sin guardar no persistidos: el contexto dejó de ser elegible.', 'DRAFT_UNSAVED_NOT_PERSISTED_CONTEXT_INELIGIBLE');
                    } else setStatus('Captura bloqueada: contexto no elegible.', 'DRAFT_CONTEXT_INELIGIBLE');
                    refreshControls();
                    return;
                }
                if (!wasReady && nextReady) {
                    pendingAcceptedContextDiscard = false;
                    ready = true;
                    baseline = emptyValues(); dirty = false; restored = false; hasSaved = false;
                    applyValues(baseline);
                    var reloaded = store.get(current.patient_id, current.line_id);
                    if (!reloaded.ok) { showReadError(reloaded.code); return; }
                    if (reloaded.draft) {
                        baseline = { notes: reloaded.draft.notes, mg1: reloaded.draft.mg1, mg2: reloaded.draft.mg2, mg3: reloaded.draft.mg3, mg4: reloaded.draft.mg4,
                            ae_present: reloaded.draft.ae_present, ae_description: reloaded.draft.ae_description, ae_severity: reloaded.draft.ae_severity, ae_resolution: reloaded.draft.ae_resolution };
                        restored = true; hasSaved = true; applyValues(baseline);
                    }
                    refreshControls(); showWorkingStatus(restored); return;
                }
                ready = nextReady;
                refreshControls();
                if (ready) showWorkingStatus(false);
                return;
            }
            current = next;
            pendingAcceptedContextDiscard = false;
            ready = nextReady;
            baseline = emptyValues();
            dirty = false;
            restored = false;
            hasSaved = false;
            storageError = '';
            applyValues(baseline);
            if (ready) {
                var loaded = store.get(current.patient_id, current.line_id);
                if (!loaded.ok) { showReadError(loaded.code); return; }
                if (loaded.draft) {
                    baseline = { notes: loaded.draft.notes, mg1: loaded.draft.mg1, mg2: loaded.draft.mg2, mg3: loaded.draft.mg3, mg4: loaded.draft.mg4,
                        ae_present: loaded.draft.ae_present, ae_description: loaded.draft.ae_description, ae_severity: loaded.draft.ae_severity, ae_resolution: loaded.draft.ae_resolution };
                    restored = true;
                    hasSaved = true;
                    applyValues(baseline);
                }
            }
            refreshControls();
            showWorkingStatus(restored);
        }
        function onInput(eventField) {
            var ui = elements();
            if (eventField === 'ae_present' && ui.ae_present && ui.ae_present.value !== 'si') {
                ['ae_description', 'ae_severity', 'ae_resolution'].forEach(function (field) { if (ui[field]) ui[field].value = ''; });
            }
            refreshControls();
            dirty = !sameValues(valuesFromUi(), baseline);
            restored = false;
            showAdherenceStatus();
            showAeStatus();
            showWorkingStatus(false);
        }
        function save() {
            var context = env.__farmaciaFollowupContextV4;
            if (!ready || !context || !context.ok || context.code !== 'CANONICAL_ACTIVE_CONTEXT_READY' ||
                    !hasConsistentActiveStatus(context) || !sameIdentity(context, current)) {
                setStatus('Error de borrador: DRAFT_ACTIVE_CONTEXT_REQUIRED', 'DRAFT_ACTIVE_CONTEXT_REQUIRED');
                return { ok: false, code: 'DRAFT_ACTIVE_CONTEXT_REQUIRED' };
            }
            var values = valuesFromUi();
            var now = typeof deps.now === 'function' ? deps.now() : new Date().toISOString();
            var professional = typeof deps.professional === 'function' ? deps.professional() : (byId(env, 'currentProfessional') && byId(env, 'currentProfessional').textContent || '');
            var persistedValues = { notes: values.notes, mg1: values.mg1, mg2: values.mg2, mg3: values.mg3, mg4: values.mg4,
                ae_present: values.ae_present, ae_description: values.ae_present === 'si' ? values.ae_description.trim() : '',
                ae_severity: values.ae_present === 'si' ? values.ae_severity : '', ae_resolution: values.ae_present === 'si' ? values.ae_resolution : '' };
            var draft = { draft_id: 'followup:' + current.line_id, patient_id: current.patient_id, line_id: current.line_id,
                kind: 'followup', notes: values.notes, mg1: values.mg1, mg2: values.mg2, mg3: values.mg3, mg4: values.mg4,
                ae_present: persistedValues.ae_present, ae_description: persistedValues.ae_description,
                ae_severity: persistedValues.ae_severity, ae_resolution: persistedValues.ae_resolution,
                saved_at: String(now), saved_by_demo: String(professional).trim() };
            var result = store.save(draft);
            if (!result.ok) { if (result.phase === 'write') showMutationError(result.code); else showReadError(result.code); return result; }
            baseline = persistedValues;
            dirty = false;
            restored = false;
            hasSaved = true;
            applyValues(baseline);
            setStatus('Borrador guardado', 'DRAFT_SAVED');
            return { ok: true, code: 'DRAFT_SAVED', draft: draft };
        }
        function discard() {
            if (!ready || storageError) return { ok: false, code: storageError || 'DRAFT_ACTIVE_CONTEXT_REQUIRED' };
            var ask = deps.confirm || env.confirm;
            if (typeof ask === 'function' && !ask(DISCARD_MESSAGE)) return { ok: false, code: 'DRAFT_DISCARD_CANCELLED' };
            var result = store.discard(current.patient_id, current.line_id);
            if (!result.ok) { if (result.phase === 'write') showMutationError(result.code); else showReadError(result.code); return result; }
            baseline = emptyValues(); dirty = false; restored = false; hasSaved = false;
            applyValues(baseline);
            setStatus('Sin borrador guardado', 'DRAFT_EMPTY');
            return { ok: true, code: 'DRAFT_DISCARDED' };
        }
        function beforeContextChange(change) {
            var next = identityOf(change && change.next);
            if (sameIdentity(current, next)) return 'same';
            if (dirty) {
                var ask = deps.confirm || env.confirm;
                if (typeof ask !== 'function' || !ask(CHANGE_MESSAGE)) { pendingAcceptedContextDiscard = false; return 'cancel'; }
                pendingAcceptedContextDiscard = true;
                dirty = false;
                applyValues(baseline);
            } else pendingAcceptedContextDiscard = false;
            return 'proceed';
        }
        function state() { return { current: identityOf(current), ready: ready, baseline: baseline, dirty: dirty, storageError: storageError, restored: restored, hasSaved: hasSaved, pendingAcceptedContextDiscard: pendingAcceptedContextDiscard }; }
        return { applyContext: applyContext, onInput: onInput, save: save, discard: discard, beforeContextChange: beforeContextChange, state: state, store: store };
    }

    function install(environment, injected) {
        var env = environment || root;
        if (!env.document) return null;
        if (controller) return controller;
        controller = createController(env, injected || dependencies);
        env.document.addEventListener('farmacia:followup-context-applied-v4', function (event) { controller.applyContext(event.detail || {}); });
        env.document.addEventListener('input', function (event) { if (event.target && event.target.id === 'fhSegDraftNotes') controller.onInput(); });
        env.document.addEventListener('input', function (event) { if (event.target && event.target.getAttribute && event.target.getAttribute('data-draft-ae') === 'ae_description') controller.onInput('ae_description'); });
        env.document.addEventListener('change', function (event) {
            if (!event.target || !event.target.getAttribute) return;
            if (event.target.getAttribute('data-draft-adherence')) controller.onInput();
            var aeField = event.target.getAttribute('data-draft-ae');
            if (aeField) controller.onInput(aeField);
        });
        env.document.addEventListener('click', function (event) {
            if (!event.target || typeof event.target.closest !== 'function') return;
            if (event.target.closest('#fhSegDraftSave')) { event.preventDefault(); controller.save(); }
            if (event.target.closest('#fhSegDraftDiscard')) { event.preventDefault(); controller.discard(); }
        });
        return controller;
    }
    function beforeContextChange(change) { return controller ? controller.beforeContextChange(change) : 'proceed'; }
    function configure(next) { dependencies = next || {}; }

    return { STORE_KEY: STORE_KEY, LEGACY_STORE_KEY: LEGACY_STORE_KEY, V1_STORE_KEY: V1_STORE_KEY, SCHEMA: SCHEMA, CHANGE_MESSAGE: CHANGE_MESSAGE, DISCARD_MESSAGE: DISCARD_MESSAGE,
        emptyState: emptyState, validateState: validateState, validateLegacyState: validateLegacyState, validateV1State: validateV1State, migrateLegacy: migrateLegacy, createStore: createStore, createController: createController,
        configure: configure, install: install, beforeContextChange: beforeContextChange };
});
