(function (root, factory) {
    'use strict';
    var api = factory(root || {});
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root && typeof root === 'object') root.FarmaciaFollowupConfirmedVisitV4 = api;
    if (root && root.document) api.install(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';

    var STORE_KEY = 'farmaciaDemo.followupConfirmedVisits.v1';
    var DRAFT_STORE_KEY = 'farmaciaDemo.followupDrafts.v4';
    var SCHEMA = STORE_KEY;
    var RECORD_FIELDS = ['record_id', 'patient_id', 'line_id', 'visit_date', 'confirmed_at', 'confirmed_by_demo',
        'source_draft_saved_at', 'source_draft_saved_by_demo', 'notes', 'mg1', 'mg2', 'mg3', 'mg4', 'ae_present',
        'ae_description', 'ae_severity', 'ae_resolution', 'proms_collected', 'dlqi_total', 'eva_dolor', 'eva_prurito'];
    var COPY_FIELDS = ['notes', 'mg1', 'mg2', 'mg3', 'mg4', 'ae_present', 'ae_description', 'ae_severity',
        'ae_resolution', 'proms_collected', 'dlqi_total', 'eva_dolor', 'eva_prurito'];
    var AUDIT_IDS = { record_id: 'fhSegVisitConfirmRecordId', visit_date: 'fhSegVisitConfirmAuditDate',
        confirmed_at: 'fhSegVisitConfirmConfirmedAt', confirmed_by_demo: 'fhSegVisitConfirmConfirmedBy',
        source_draft_saved_at: 'fhSegVisitConfirmSourceSavedAt', source_draft_saved_by_demo: 'fhSegVisitConfirmSourceSavedBy' };
    var READY_TEXT = 'Borrador persistido y limpio. Introduzca la fecha de visita para confirmar la instantánea de demo.';
    var DIRTY_TEXT = 'Hay cambios sin guardar. Guarde o descarte esos cambios antes de confirmar la visita.';
    var CONFIRMED_TEXT = 'Visita de seguimiento confirmada como instantánea inmutable de demo.';
    var UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    var installed = false;

    function ownObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
    function exactKeys(value, expected) {
        if (!ownObject(value)) return false;
        var actual = Object.keys(value).sort(); var wanted = expected.slice().sort();
        return actual.length === wanted.length && actual.every(function (key, index) { return key === wanted[index]; });
    }
    function validInteger(value, max) { return value === '' || (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max); }
    function validDate(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        var parsed = new Date(value + 'T00:00:00.000Z');
        return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }
    function validIso(value) {
        if (typeof value !== 'string' || !value) return false;
        var parsed = new Date(value);
        return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
    }
    function validOpaqueId(value) { return typeof value === 'string' && UUID_V4_PATTERN.test(value); }
    function safeRecordMap() { return Object.create(null); }
    function validRecord(record, key) {
        if (!exactKeys(record, RECORD_FIELDS) || !validOpaqueId(key) || record.record_id !== key) return false;
        var strings = RECORD_FIELDS.filter(function (field) { return ['dlqi_total', 'eva_dolor', 'eva_prurito'].indexOf(field) === -1; });
        if (!strings.every(function (field) { return typeof record[field] === 'string'; })) return false;
        if (!record.record_id || !record.patient_id || !record.line_id || !validDate(record.visit_date) || !validIso(record.confirmed_at) ||
                !record.confirmed_by_demo.trim() || !record.source_draft_saved_at || !record.source_draft_saved_by_demo.trim()) return false;
        if (!['', 'si', 'no'].includes(record.mg1) || !['', 'si', 'no'].includes(record.mg2) || !['', 'si', 'no'].includes(record.mg3) || !['', 'si', 'no'].includes(record.mg4)) return false;
        if (!['', 'no_consta', 'no', 'si'].includes(record.ae_present) || !['', 'leve', 'moderado', 'grave', 'requiere_derivacion'].includes(record.ae_severity) ||
                !['', 'no_consta', 'no', 'si', 'en_seguimiento'].includes(record.ae_resolution) ||
                (record.ae_present !== 'si' && (record.ae_description || record.ae_severity || record.ae_resolution))) return false;
        if (!['', 'no_consta', 'no', 'si'].includes(record.proms_collected) || !validInteger(record.dlqi_total, 30) ||
                !validInteger(record.eva_dolor, 10) || !validInteger(record.eva_prurito, 10) ||
                (record.proms_collected !== 'si' && (record.dlqi_total !== '' || record.eva_dolor !== '' || record.eva_prurito !== ''))) return false;
        return true;
    }
    function emptyState() { return { schema: SCHEMA, records: safeRecordMap() }; }
    function validateState(state) {
        if (!exactKeys(state, ['schema', 'records']) || state.schema !== SCHEMA || !ownObject(state.records)) return { ok: false, code: 'VISIT_CONFIRM_STORAGE_ERROR' };
        var keys = Object.keys(state.records);
        if (!keys.every(function (key) { return validRecord(state.records[key], key); })) return { ok: false, code: 'VISIT_CONFIRM_STORAGE_ERROR' };
        var dedupe = safeRecordMap(); var confirmedTimes = safeRecordMap();
        if (!keys.every(function (key) {
            var record = state.records[key];
            var identity = record.patient_id + '\u0000' + record.line_id + '\u0000' + record.source_draft_saved_at;
            var confirmedIdentity = record.patient_id + '\u0000' + record.line_id + '\u0000' + record.confirmed_at;
            if (dedupe[identity] || confirmedTimes[confirmedIdentity]) return false;
            dedupe[identity] = true; confirmedTimes[confirmedIdentity] = true; return true;
        })) return { ok: false, code: 'VISIT_CONFIRM_STORAGE_ERROR' };
        return { ok: true, code: 'VISIT_CONFIRM_STORE_VALID', state: state };
    }
    function createStore(storage) {
        function read() {
            if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') return { ok: false, code: 'VISIT_CONFIRM_STORAGE_ERROR' };
            var raw; try { raw = storage.getItem(STORE_KEY); } catch (error) { return { ok: false, code: 'VISIT_CONFIRM_STORAGE_ERROR' }; }
            if (raw === null) return { ok: true, code: 'VISIT_CONFIRM_EMPTY', state: emptyState(), raw: null };
            var parsed; try { parsed = JSON.parse(raw); } catch (error) { return { ok: false, code: 'VISIT_CONFIRM_STORAGE_ERROR' }; }
            var checked = validateState(parsed); if (!checked.ok) return checked;
            return { ok: true, code: 'VISIT_CONFIRM_STORE_VALID', state: checked.state, raw: raw };
        }
        function append(record) {
            if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') return { ok: false, code: 'VISIT_CONFIRM_STORAGE_ERROR', restored: false };
            var loaded = read(); if (!loaded.ok || !validRecord(record, record && record.record_id)) return { ok: false, code: 'VISIT_CONFIRM_STORAGE_ERROR' };
            var records = loaded.state.records; var duplicate = Object.keys(records).find(function (key) { var item = records[key]; return item.patient_id === record.patient_id && item.line_id === record.line_id && item.source_draft_saved_at === record.source_draft_saved_at; });
            if (duplicate) return { ok: false, code: 'VISIT_CONFIRM_ALREADY_CONFIRMED', record: records[duplicate] };
            if (Object.prototype.hasOwnProperty.call(records, record.record_id)) return { ok: false, code: 'VISIT_CONFIRM_STORAGE_ERROR' };
            var tied = Object.keys(records).some(function (key) { var item = records[key]; return item.patient_id === record.patient_id && item.line_id === record.line_id && item.confirmed_at === record.confirmed_at; });
            if (tied) return { ok: false, code: 'VISIT_CONFIRM_STORAGE_ERROR' };
            var next = { schema: SCHEMA, records: safeRecordMap() };
            Object.keys(records).forEach(function (key) { next.records[key] = records[key]; }); next.records[record.record_id] = record;
            function restorePrior() {
                try { if (loaded.raw === null) storage.removeItem(STORE_KEY); else storage.setItem(STORE_KEY, loaded.raw); } catch (error) { return false; }
                try { return storage.getItem(STORE_KEY) === loaded.raw; } catch (error) { return false; }
            }
            var bytes = JSON.stringify(next);
            try { storage.setItem(STORE_KEY, bytes); } catch (error) { return { ok: false, code: 'VISIT_CONFIRM_STORAGE_ERROR', restored: restorePrior() }; }
            var verify; try { verify = storage.getItem(STORE_KEY); } catch (error) { return { ok: false, code: 'VISIT_CONFIRM_STORAGE_ERROR', restored: restorePrior() }; }
            if (verify !== bytes) return { ok: false, code: 'VISIT_CONFIRM_STORAGE_ERROR', restored: restorePrior() };
            return { ok: true, code: 'VISIT_CONFIRMED', state: next, record: record };
        }
        return { read: read, append: append };
    }
    function readDraft(environment, patientId, lineId) {
        var env = environment || root; var drafts = env.FarmaciaFollowupDraftsV4;
        if (!env.sessionStorage || typeof env.sessionStorage.getItem !== 'function' || !drafts || typeof drafts.validateState !== 'function') return { ok: false };
        var raw; try { raw = env.sessionStorage.getItem(DRAFT_STORE_KEY); } catch (error) { return { ok: false }; }
        if (raw === null) return { ok: true, draft: null };
        var parsed; try { parsed = JSON.parse(raw); } catch (error) { return { ok: false }; }
        var checked = drafts.validateState(parsed); if (!checked || !checked.ok) return { ok: false };
        var patient = checked.state.patients[patientId]; return { ok: true, draft: patient && patient.lines[lineId] || null, raw: raw };
    }
    function latestFor(records, patientId, lineId) {
        return Object.keys(records || {}).map(function (key) { return records[key]; }).filter(function (record) { return record.patient_id === patientId && record.line_id === lineId; })
            .sort(function (left, right) { return right.confirmed_at.localeCompare(left.confirmed_at); })[0] || null;
    }
    function confirmedSource(records, patientId, lineId, savedAt) {
        return Object.keys(records || {}).map(function (key) { return records[key]; }).find(function (record) { return record.patient_id === patientId && record.line_id === lineId && record.source_draft_saved_at === savedAt; }) || null;
    }
    function opaqueId(cryptoObject) {
        if (!cryptoObject) return '';
        if (typeof cryptoObject.randomUUID === 'function') { var uuid = cryptoObject.randomUUID(); return validOpaqueId(uuid) ? uuid : ''; }
        if (typeof cryptoObject.getRandomValues !== 'function') return '';
        var bytes = new Uint8Array(16); cryptoObject.getRandomValues(bytes); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
        var generated = Array.prototype.map.call(bytes, function (byte, index) { return ([4, 6, 8, 10].includes(index) ? '-' : '') + byte.toString(16).padStart(2, '0'); }).join('');
        return validOpaqueId(generated) ? generated : '';
    }
    function coherent(detail, context) {
        return !!(detail && detail.ready === true && !detail.storage_error && detail.patient_id && detail.line_id && context && context.ok === true &&
            context.code === 'CANONICAL_ACTIVE_CONTEXT_READY' && context.patient_id === detail.patient_id && context.line_id === detail.line_id &&
            context.line && context.line.status === 'active');
    }
    function createController(environment, injected) {
        var env = environment || root; var deps = injected || {}; var store = createStore(deps.storage !== undefined ? deps.storage : env.sessionStorage);
        var eventState = null; var identity = ''; var justConfirmed = '';
        function byId(id) { return env.document && env.document.getElementById(id); }
        function professional() { return String(byId('currentProfessional') && byId('currentProfessional').textContent || '').trim(); }
        function setStatus(code, text) { var status = byId('fhSegVisitConfirmStatus'); if (status) { status.textContent = text; status.setAttribute('data-status-code', code); } var card = byId('fhSegVisitConfirmCard'); if (card) card.setAttribute('data-confirm-state', code); }
        function clearAudit() { Object.keys(AUDIT_IDS).forEach(function (field) { var element = byId(AUDIT_IDS[field]); if (element) element.textContent = 'No informado'; }); }
        function showAudit(record) { clearAudit(); if (!record) return; Object.keys(AUDIT_IDS).forEach(function (field) { var element = byId(AUDIT_IDS[field]); if (element) element.textContent = record[field] || 'No informado'; }); }
        function controls(enabled) { var button = byId('fhSegVisitConfirmButton'); if (button) { button.disabled = !enabled; button.setAttribute('aria-disabled', enabled ? 'false' : 'true'); } }
        function refresh(options) {
            var source = options || {}; var detail = eventState || {}; var nextIdentity = String(detail.patient_id || '') + '\u0000' + String(detail.line_id || '');
            if (identity && identity !== nextIdentity) { var date = byId('fhSegVisitConfirmDate'); if (date) date.value = ''; justConfirmed = ''; }
            identity = nextIdentity; var shownProfessional = byId('fhSegVisitConfirmProfessional'); if (shownProfessional) shownProfessional.textContent = professional() || 'No informado';
            clearAudit(); controls(false);
            var loaded = store.read(); if (!loaded.ok) { setStatus('VISIT_CONFIRM_STORAGE_ERROR', 'No se puede leer el historial de visitas confirmadas de demo.'); return { code: 'VISIT_CONFIRM_STORAGE_ERROR' }; }
            var context = env.__farmaciaFollowupContextV4;
            if (!coherent(detail, context)) { setStatus('VISIT_CONFIRM_CONTEXT_BLOCKED', 'Confirmación bloqueada: no hay un contexto canónico activo elegible.'); return { code: 'VISIT_CONFIRM_CONTEXT_BLOCKED' }; }
            var latest = latestFor(loaded.state.records, detail.patient_id, detail.line_id); showAudit(latest);
            var draftResult = readDraft(env, detail.patient_id, detail.line_id);
            if (!draftResult.ok || detail.storage_error) { clearAudit(); setStatus('VISIT_CONFIRM_STORAGE_ERROR', 'No se puede leer el borrador persistido de forma segura.'); return { code: 'VISIT_CONFIRM_STORAGE_ERROR' }; }
            if (!draftResult.draft || !draftResult.draft.saved_at) { setStatus('VISIT_CONFIRM_EMPTY', 'No hay un borrador persistido y guardado para confirmar.'); return { code: 'VISIT_CONFIRM_EMPTY', latest: latest }; }
            if (detail.dirty === true) { setStatus('VISIT_CONFIRM_UNSAVED_CHANGES', DIRTY_TEXT); return { code: 'VISIT_CONFIRM_UNSAVED_CHANGES', draft: draftResult.draft, latest: latest }; }
            var previous = confirmedSource(loaded.state.records, detail.patient_id, detail.line_id, draftResult.draft.saved_at);
            if (previous) { showAudit(latest); var successKey = detail.patient_id + '\u0000' + detail.line_id + '\u0000' + draftResult.draft.saved_at; if (justConfirmed === successKey && !source.forceAlready) { setStatus('VISIT_CONFIRMED', CONFIRMED_TEXT); return { code: 'VISIT_CONFIRMED', draft: draftResult.draft, latest: latest }; } setStatus('VISIT_CONFIRM_ALREADY_CONFIRMED', 'Este borrador guardado ya tiene una visita de demo confirmada.'); return { code: 'VISIT_CONFIRM_ALREADY_CONFIRMED', draft: draftResult.draft, latest: latest }; }
            controls(true); setStatus('VISIT_CONFIRM_READY', READY_TEXT); return { code: 'VISIT_CONFIRM_READY', draft: draftResult.draft, latest: latest, raw: draftResult.raw };
        }
        function confirm() {
            var ready = refresh(); if (ready.code !== 'VISIT_CONFIRM_READY') return { ok: false, code: ready.code };
            var date = String(byId('fhSegVisitConfirmDate') && byId('fhSegVisitConfirmDate').value || '');
            if (!date || !validDate(date)) { setStatus('VISIT_CONFIRM_DATE_REQUIRED', 'Introduzca explícitamente una fecha de visita válida.'); return { ok: false, code: 'VISIT_CONFIRM_DATE_REQUIRED' }; }
            var actor = professional(); if (!actor) { setStatus('VISIT_CONFIRM_PROFESSIONAL_REQUIRED', 'No hay un profesional FH de demo visible para confirmar.'); return { ok: false, code: 'VISIT_CONFIRM_PROFESSIONAL_REQUIRED' }; }
            var id = opaqueId(deps.crypto || env.crypto); if (!id) { setStatus('VISIT_CONFIRM_STORAGE_ERROR', 'No se puede generar un identificador criptográfico para la visita.'); return { ok: false, code: 'VISIT_CONFIRM_STORAGE_ERROR' }; }
            var draft = ready.draft; var record = { record_id: id, patient_id: draft.patient_id, line_id: draft.line_id, visit_date: date,
                confirmed_at: String(typeof deps.now === 'function' ? deps.now() : new Date().toISOString()), confirmed_by_demo: actor,
                source_draft_saved_at: draft.saved_at, source_draft_saved_by_demo: draft.saved_by_demo };
            COPY_FIELDS.forEach(function (field) { record[field] = draft[field]; });
            if (!validRecord(record, id)) { setStatus('VISIT_CONFIRM_STORAGE_ERROR', 'La instantánea no cumple el contrato exacto y no se ha guardado.'); return { ok: false, code: 'VISIT_CONFIRM_STORAGE_ERROR' }; }
            var result = store.append(record); if (!result.ok) {
                if (result.code === 'VISIT_CONFIRM_ALREADY_CONFIRMED') refresh({ forceAlready: true });
                else { controls(false); setStatus('VISIT_CONFIRM_STORAGE_ERROR', 'No se pudo guardar la visita; no se confirma ningún cambio.'); }
                return result;
            }
            justConfirmed = record.patient_id + '\u0000' + record.line_id + '\u0000' + record.source_draft_saved_at; showAudit(record); controls(false); setStatus('VISIT_CONFIRMED', CONFIRMED_TEXT);
            return result;
        }
        function applyDraftState(detail) { eventState = detail && typeof detail === 'object' ? detail : {}; return refresh(); }
        return { applyDraftState: applyDraftState, refresh: refresh, confirm: confirm, store: store };
    }
    function install(environment) {
        var env = environment || root; if (!env.document || installed) return null; installed = true;
        var controller = createController(env); controller.refresh();
        env.document.addEventListener('farmacia:followup-draft-state-v4', function (event) { controller.applyDraftState(event.detail || {}); });
        env.document.addEventListener('input', function (event) { if (event.target && event.target.id === 'fhSegVisitConfirmDate') controller.refresh(); });
        env.document.addEventListener('click', function (event) { if (event.target && event.target.closest && event.target.closest('#fhSegVisitConfirmButton')) { event.preventDefault(); controller.confirm(); } });
        return controller;
    }
    return { STORE_KEY: STORE_KEY, DRAFT_STORE_KEY: DRAFT_STORE_KEY, SCHEMA: SCHEMA, RECORD_FIELDS: RECORD_FIELDS, COPY_FIELDS: COPY_FIELDS,
        AUDIT_IDS: AUDIT_IDS, READY_TEXT: READY_TEXT, DIRTY_TEXT: DIRTY_TEXT, CONFIRMED_TEXT: CONFIRMED_TEXT, validOpaqueId: validOpaqueId, validRecord: validRecord,
        validateState: validateState, emptyState: emptyState, createStore: createStore, readDraft: readDraft, latestFor: latestFor,
        confirmedSource: confirmedSource, opaqueId: opaqueId, coherent: coherent, createController: createController, install: install };
});
