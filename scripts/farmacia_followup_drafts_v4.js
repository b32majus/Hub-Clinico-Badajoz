(function (root, factory) {
    'use strict';
    var api = factory(root || {});
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root && typeof root === 'object') root.FarmaciaFollowupDraftsV4 = api;
    if (root && root.document) api.install(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';

    var STORE_KEY = 'farmaciaDemo.followupDrafts.v4';
    var V3_STORE_KEY = 'farmaciaDemo.followupDrafts.v3';
    var LEGACY_STORE_KEY = 'farmaciaDemo.followupDrafts.v2';
    var V1_STORE_KEY = 'farmaciaDemo.followupDrafts.v1';
    var SCHEMA = STORE_KEY;
    var CHANGE_MESSAGE = 'Hay cambios sin guardar en el borrador de esta línea. Cambiar de paciente o línea descartará esos cambios. El último borrador guardado se conservará. ¿Quieres continuar?';
    var DISCARD_MESSAGE = '¿Quieres descartar el borrador guardado de esta línea?';
    var ANSWERS = ['mg1', 'mg2', 'mg3', 'mg4'];
    var AE_FIELDS = ['ae_present', 'ae_description', 'ae_severity', 'ae_resolution'];
    var PROM_FIELDS = ['proms_collected', 'dlqi_total', 'eva_dolor', 'eva_prurito'];
    var FIELDS = ['draft_id', 'patient_id', 'line_id', 'kind', 'notes', 'mg1', 'mg2', 'mg3', 'mg4', 'ae_present', 'ae_description', 'ae_severity', 'ae_resolution', 'proms_collected', 'dlqi_total', 'eva_dolor', 'eva_prurito', 'saved_at', 'saved_by_demo'];
    var V3_FIELDS = ['draft_id', 'patient_id', 'line_id', 'kind', 'notes', 'mg1', 'mg2', 'mg3', 'mg4', 'ae_present', 'ae_description', 'ae_severity', 'ae_resolution', 'saved_at', 'saved_by_demo'];
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
                if (!lineId || !exactKeys(draft, fields) || !fields.every(function (field) {
                        return PROM_FIELDS.indexOf(field) === -1 ? typeof draft[field] === 'string' :
                            (field === 'proms_collected' ? typeof draft[field] === 'string' : draft[field] === '' || typeof draft[field] === 'number');
                    }) ||
                        draft.kind !== 'followup' || draft.draft_id !== 'followup:' + lineId || draft.patient_id !== patientId || draft.line_id !== lineId ||
                        ((fields === FIELDS || fields === V3_FIELDS || fields === V2_FIELDS) && !ANSWERS.every(function (field) { return ['', 'si', 'no'].indexOf(draft[field]) !== -1; })) ||
                        ((fields === FIELDS || fields === V3_FIELDS) && (['', 'no_consta', 'no', 'si'].indexOf(draft.ae_present) === -1 ||
                            ['', 'leve', 'moderado', 'grave', 'requiere_derivacion'].indexOf(draft.ae_severity) === -1 ||
                            ['', 'no_consta', 'no', 'si', 'en_seguimiento'].indexOf(draft.ae_resolution) === -1 ||
                            (draft.ae_present !== 'si' && (draft.ae_description || draft.ae_severity || draft.ae_resolution)))) ||
                        (fields === FIELDS && (['', 'no_consta', 'no', 'si'].indexOf(draft.proms_collected) === -1 ||
                            !validNumeric(draft.dlqi_total, 30) || !validNumeric(draft.eva_dolor, 10) || !validNumeric(draft.eva_prurito, 10) ||
                            (draft.proms_collected !== 'si' && (draft.dlqi_total !== '' || draft.eva_dolor !== '' || draft.eva_prurito !== ''))))) valid = false;
            });
        });
        return valid ? { ok: true, code: 'DRAFT_STATE_VALID', state: state } : failure('DRAFT_STATE_INVALID');
    }
    function validateState(state) { return validateWith(state, SCHEMA, FIELDS); }
    function validateV3State(state) { return validateWith(state, V3_STORE_KEY, V3_FIELDS); }
    function validateLegacyState(state) { return validateWith(state, LEGACY_STORE_KEY, V2_FIELDS); }
    function validateV1State(state) { return validateWith(state, V1_STORE_KEY, V1_FIELDS); }
    function validNumeric(value, max) { return value === '' || (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max); }
    function migrateLegacy(state, sourceVersion) {
        var migrated = emptyState();
        Object.keys(state.patients).forEach(function (patientId) {
            migrated.patients[patientId] = { lines: {} };
            Object.keys(state.patients[patientId].lines).forEach(function (lineId) {
                var old = state.patients[patientId].lines[lineId];
                migrated.patients[patientId].lines[lineId] = {
                    draft_id: old.draft_id, patient_id: old.patient_id, line_id: old.line_id, kind: old.kind, notes: old.notes,
                    mg1: sourceVersion === 'v1' ? '' : old.mg1, mg2: sourceVersion === 'v1' ? '' : old.mg2,
                    mg3: sourceVersion === 'v1' ? '' : old.mg3, mg4: sourceVersion === 'v1' ? '' : old.mg4,
                    ae_present: sourceVersion === 'v3' ? old.ae_present : '', ae_description: sourceVersion === 'v3' ? old.ae_description : '',
                    ae_severity: sourceVersion === 'v3' ? old.ae_severity : '', ae_resolution: sourceVersion === 'v3' ? old.ae_resolution : '',
                    proms_collected: '', dlqi_total: '', eva_dolor: '', eva_prurito: '', saved_at: old.saved_at, saved_by_demo: old.saved_by_demo
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
                var legacyRaw; var sourceVersion; var validator;
                try { legacyRaw = storage.getItem(V3_STORE_KEY); } catch (error) { return phasedFailure('DRAFT_STORAGE_UNAVAILABLE', 'read'); }
                if (legacyRaw !== null) { sourceVersion = 'v3'; validator = validateV3State; }
                else {
                    try { legacyRaw = storage.getItem(LEGACY_STORE_KEY); } catch (error) { return phasedFailure('DRAFT_STORAGE_UNAVAILABLE', 'read'); }
                    if (legacyRaw !== null) { sourceVersion = 'v2'; validator = validateLegacyState; }
                    else {
                        try { legacyRaw = storage.getItem(V1_STORE_KEY); } catch (error) { return phasedFailure('DRAFT_STORAGE_UNAVAILABLE', 'read'); }
                        if (legacyRaw === null) return { ok: true, code: 'DRAFT_EMPTY', state: emptyState() };
                        sourceVersion = 'v1'; validator = validateV1State;
                    }
                }
                var legacyParsed;
                try { legacyParsed = JSON.parse(legacyRaw); } catch (error) { return phasedFailure('DRAFT_STORAGE_CORRUPT', 'read'); }
                var legacy = validator(legacyParsed);
                if (!legacy.ok) { legacy.phase = 'read'; return legacy; }
                var migrated = migrateLegacy(legacy.state, sourceVersion);
                try { storage.setItem(STORE_KEY, JSON.stringify(migrated)); } catch (error) { return phasedFailure('DRAFT_STORAGE_UNAVAILABLE', 'migration-write'); }
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
                proms: byId(env, 'fhSegDraftProms'), promsStatus: byId(env, 'fhSegDraftPromsStatus'), proms_collected: byId(env, 'fhSegDraftPromsCollected'),
                dlqi_total: byId(env, 'fhSegDraftDlqiTotal'), eva_dolor: byId(env, 'fhSegDraftEvaDolor'), eva_prurito: byId(env, 'fhSegDraftEvaPrurito'),
                save: byId(env, 'fhSegDraftSave'), discard: byId(env, 'fhSegDraftDiscard'), status: byId(env, 'fhSegDraftStatus') };
        }
        function emptyValues() { return { notes: '', mg1: '', mg2: '', mg3: '', mg4: '', ae_present: '', ae_description: '', ae_severity: '', ae_resolution: '', proms_collected: '', dlqi_total: '', eva_dolor: '', eva_prurito: '' }; }
        function valuesFromDraft(draft) {
            var value = emptyValues();
            Object.keys(value).forEach(function (field) { value[field] = draft[field]; });
            return value;
        }
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
            if (ui.proms) { ui.proms.disabled = blocked; ui.proms.setAttribute('aria-disabled', blocked ? 'true' : 'false'); }
            if (ui.proms_collected) { ui.proms_collected.disabled = blocked; ui.proms_collected.setAttribute('aria-disabled', blocked ? 'true' : 'false'); }
            var promsNumericBlocked = blocked || !ui.proms_collected || ui.proms_collected.value !== 'si';
            ['dlqi_total', 'eva_dolor', 'eva_prurito'].forEach(function (field) { if (ui[field]) { ui[field].disabled = promsNumericBlocked; ui[field].setAttribute('aria-disabled', promsNumericBlocked ? 'true' : 'false'); } });
            if (ui.save) { ui.save.disabled = blocked; ui.save.setAttribute('aria-disabled', blocked ? 'true' : 'false'); }
            if (ui.discard) { ui.discard.disabled = blocked; ui.discard.setAttribute('aria-disabled', blocked ? 'true' : 'false'); }
        }
        function numericFromUi(input, max) {
            var raw = input ? String(input.value) : '';
            if (raw === '') return '';
            if (!/^\d+$/.test(raw)) return null;
            var value = Number(raw);
            return Number.isInteger(value) && value >= 0 && value <= max ? value : null;
        }
        function valuesFromUi() {
            var ui = elements();
            return { notes: ui.notes ? ui.notes.value : '', mg1: ui.mg1 ? ui.mg1.value : '', mg2: ui.mg2 ? ui.mg2.value : '',
                mg3: ui.mg3 ? ui.mg3.value : '', mg4: ui.mg4 ? ui.mg4.value : '', ae_present: ui.ae_present ? ui.ae_present.value : '',
                ae_description: ui.ae_description ? ui.ae_description.value : '', ae_severity: ui.ae_severity ? ui.ae_severity.value : '', ae_resolution: ui.ae_resolution ? ui.ae_resolution.value : '',
                proms_collected: ui.proms_collected ? ui.proms_collected.value : '', dlqi_total: numericFromUi(ui.dlqi_total, 30),
                eva_dolor: numericFromUi(ui.eva_dolor, 10), eva_prurito: numericFromUi(ui.eva_prurito, 10) };
        }
        function applyValues(value) {
            var ui = elements();
            ui.notes && (ui.notes.value = value.notes || '');
            ANSWERS.forEach(function (field) { if (ui[field]) ui[field].value = value[field] || ''; });
            AE_FIELDS.forEach(function (field) { if (ui[field]) ui[field].value = value[field] || ''; });
            if (ui.proms_collected) ui.proms_collected.value = value.proms_collected || '';
            ['dlqi_total', 'eva_dolor', 'eva_prurito'].forEach(function (field) { if (ui[field]) ui[field].value = value[field] === '' ? '' : String(value[field]); });
            showAdherenceStatus();
            showAeStatus();
            showPromsStatus();
            refreshControls();
        }
        function sameValues(left, right) { return ['notes'].concat(ANSWERS, AE_FIELDS, PROM_FIELDS).every(function (field) { return left[field] === right[field]; }); }
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
        function showPromsStatus() {
            var ui = elements();
            if (!ui.promsStatus) return;
            var value = valuesFromUi();
            var code = 'PROMS_EMPTY'; var message = 'PROMs sin respuesta.';
            if (value.proms_collected === 'no_consta') { code = 'PROMS_NOT_RECORDED'; message = 'No consta recogida de PROMs en el borrador.'; }
            else if (value.proms_collected === 'no') { code = 'PROMS_NO_COLLECTION'; message = 'No se documenta recogida de PROMs en el borrador.'; }
            else if (value.proms_collected === 'si') {
                var hasNumeric = [value.dlqi_total, value.eva_dolor, value.eva_prurito].some(function (item) { return item !== '' && item !== null; });
                code = hasNumeric ? 'PROMS_RECORDED_UNINTERPRETED' : 'PROMS_RECORDED_INCOMPLETE';
                message = hasNumeric ? 'PROMs documentados en borrador. Interpretación clínica no evaluada en esta versión.' : 'PROMs documentados sin valores numéricos en el borrador.';
            }
            ui.promsStatus.textContent = message; ui.promsStatus.setAttribute('data-status-code', code);
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
        function preserveUiState() {
            var values = valuesFromUi(); var ui = elements();
            ['dlqi_total', 'eva_dolor', 'eva_prurito'].forEach(function (field) { values[field] = ui[field] ? ui[field].value : ''; });
            return { values: values, baseline: baseline, dirty: dirty, restored: restored, hasSaved: hasSaved };
        }
        function showLoadError(result, preserved) {
            if (result.phase !== 'migration-write') { showReadError(result.code); return; }
            baseline = preserved.baseline; dirty = preserved.dirty; restored = preserved.restored; hasSaved = preserved.hasSaved;
            applyValues(preserved.values); showMutationError(result.code);
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
            var preserved = preserveUiState();
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
                    if (!reloaded.ok) { showLoadError(reloaded, preserved); return; }
                    if (reloaded.draft) {
                        baseline = valuesFromDraft(reloaded.draft);
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
                if (!loaded.ok) { showLoadError(loaded, preserved); return; }
                if (loaded.draft) {
                    baseline = valuesFromDraft(loaded.draft);
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
            if (eventField === 'proms_collected' && ui.proms_collected && ui.proms_collected.value !== 'si') {
                ['dlqi_total', 'eva_dolor', 'eva_prurito'].forEach(function (field) { if (ui[field]) ui[field].value = ''; });
            }
            refreshControls();
            dirty = !sameValues(valuesFromUi(), baseline);
            restored = false;
            showAdherenceStatus();
            showAeStatus();
            showPromsStatus();
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
            if ([values.dlqi_total, values.eva_dolor, values.eva_prurito].some(function (value) { return value === null; })) {
                setStatus('Error de borrador: DRAFT_VALUES_INVALID', 'DRAFT_VALUES_INVALID');
                return { ok: false, code: 'DRAFT_VALUES_INVALID' };
            }
            var now = typeof deps.now === 'function' ? deps.now() : new Date().toISOString();
            var professional = typeof deps.professional === 'function' ? deps.professional() : (byId(env, 'currentProfessional') && byId(env, 'currentProfessional').textContent || '');
            var persistedValues = { notes: values.notes, mg1: values.mg1, mg2: values.mg2, mg3: values.mg3, mg4: values.mg4,
                ae_present: values.ae_present, ae_description: values.ae_present === 'si' ? values.ae_description.trim() : '',
                ae_severity: values.ae_present === 'si' ? values.ae_severity : '', ae_resolution: values.ae_present === 'si' ? values.ae_resolution : '',
                proms_collected: values.proms_collected, dlqi_total: values.proms_collected === 'si' ? values.dlqi_total : '',
                eva_dolor: values.proms_collected === 'si' ? values.eva_dolor : '', eva_prurito: values.proms_collected === 'si' ? values.eva_prurito : '' };
            var draft = { draft_id: 'followup:' + current.line_id, patient_id: current.patient_id, line_id: current.line_id,
                kind: 'followup', notes: values.notes, mg1: values.mg1, mg2: values.mg2, mg3: values.mg3, mg4: values.mg4,
                ae_present: persistedValues.ae_present, ae_description: persistedValues.ae_description,
                ae_severity: persistedValues.ae_severity, ae_resolution: persistedValues.ae_resolution,
                proms_collected: persistedValues.proms_collected, dlqi_total: persistedValues.dlqi_total,
                eva_dolor: persistedValues.eva_dolor, eva_prurito: persistedValues.eva_prurito,
                saved_at: String(now), saved_by_demo: String(professional).trim() };
            var result = store.save(draft);
            if (!result.ok) { if (result.phase === 'write' || result.phase === 'migration-write') showMutationError(result.code); else showReadError(result.code); return result; }
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
            if (!result.ok) { if (result.phase === 'write' || result.phase === 'migration-write') showMutationError(result.code); else showReadError(result.code); return result; }
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
        env.document.addEventListener('input', function (event) { if (event.target && event.target.getAttribute && event.target.getAttribute('data-draft-proms-numeric')) controller.onInput(event.target.getAttribute('data-draft-proms-numeric')); });
        env.document.addEventListener('change', function (event) {
            if (!event.target || !event.target.getAttribute) return;
            if (event.target.getAttribute('data-draft-adherence')) controller.onInput();
            var aeField = event.target.getAttribute('data-draft-ae');
            if (aeField) controller.onInput(aeField);
            var promsField = event.target.getAttribute('data-draft-proms');
            if (promsField) controller.onInput(promsField);
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

    return { STORE_KEY: STORE_KEY, V3_STORE_KEY: V3_STORE_KEY, LEGACY_STORE_KEY: LEGACY_STORE_KEY, V1_STORE_KEY: V1_STORE_KEY, SCHEMA: SCHEMA, CHANGE_MESSAGE: CHANGE_MESSAGE, DISCARD_MESSAGE: DISCARD_MESSAGE,
        emptyState: emptyState, validateState: validateState, validateV3State: validateV3State, validateLegacyState: validateLegacyState, validateV1State: validateV1State, migrateLegacy: migrateLegacy, createStore: createStore, createController: createController,
        configure: configure, install: install, beforeContextChange: beforeContextChange };
});
