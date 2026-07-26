(function (root, factory) {
    'use strict';
    var api = factory(root || {});
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root && typeof root === 'object') root.FarmaciaFollowupOutputsV4 = api;
    if (root && root.document) api.install(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';

    var STORE_KEY = 'farmaciaDemo.followupConfirmedVisits.v1';
    var CSV_COLUMNS = ['record_id', 'patient_id', 'cip_demo_o_hash', 'service', 'pathology', 'line_id', 'visit_date',
        'confirmed_at', 'confirmed_by_demo', 'source_draft_saved_at', 'source_draft_saved_by_demo', 'context_source',
        'line_status', 'relationship', 'provenance', 'drug_name', 'active_ingredient', 'dose_text', 'presentation', 'route',
        'pauta_codigo', 'pauta_label', 'pauta_otro_texto', 'start_date', 'request_id', 'validation_act_id',
        'start_movement_id', 'notes', 'mg1', 'mg2', 'mg3', 'mg4', 'ae_present', 'ae_description', 'ae_severity',
        'ae_resolution', 'proms_collected', 'dlqi_total', 'eva_dolor', 'eva_prurito', 'generated_at', 'demo_flag'];
    var TARGETS = { fhSegExportTxt: 'txt', fhSegExportCsv: 'csv', fhSegExcelExportBtn: 'excel' };
    var AUDIT_IDS = { record_id: 'fhSegOutputRecordId', visit_date: 'fhSegOutputVisitDate', confirmed_at: 'fhSegOutputConfirmedAt',
        confirmed_by_demo: 'fhSegOutputConfirmedBy', line_id: 'fhSegOutputLineId' };
    var TEXTS = {
        FOLLOWUP_OUTPUT_CONTEXT_BLOCKED: 'Salidas bloqueadas: no hay un contexto canónico activo elegible.',
        FOLLOWUP_OUTPUT_EMPTY: 'No existe una visita confirmada de demo para esta línea. Confirme una visita antes de generar salidas.',
        FOLLOWUP_OUTPUT_STORAGE_ERROR: 'No se puede leer de forma segura el historial de visitas confirmadas de demo.',
        FOLLOWUP_OUTPUT_HELPER_ERROR: 'No están disponibles los helpers necesarios para generar las salidas de forma segura.',
        FOLLOWUP_OUTPUT_READY: 'Salidas preparadas desde la última visita confirmada exacta de esta línea.',
        FOLLOWUP_OUTPUT_READY_WITH_UNSAVED_CHANGES: 'Hay cambios sin guardar. Las salidas usarán exclusivamente la última visita confirmada y no esos cambios.',
        FOLLOWUP_OUTPUT_GENERATED: 'Salida generada desde la última visita confirmada exacta de esta línea.'
    };

    function text(value) { return value === null || value === undefined ? '' : String(value).trim(); }
    function shown(value) { var valueText = text(value); return valueText === '' ? 'No informado' : valueText; }
    function byId(env, id) { return env.document && env.document.getElementById(id); }
    function params(env) { var Params = env.URLSearchParams || (typeof URLSearchParams !== 'undefined' ? URLSearchParams : null); return Params ? new Params(env.location && env.location.search || '') : null; }
    function exactContext(environment) {
        var env = environment || root; var contextApi = env.FarmaciaFollowupContextV4;
        if (!contextApi || typeof contextApi.resolveCanonicalContext !== 'function' || typeof contextApi.readIdentity !== 'function') return { ok: false, code: 'FOLLOWUP_OUTPUT_CONTEXT_BLOCKED' };
        var context = contextApi.resolveCanonicalContext({ identity: contextApi.readIdentity(env.location && env.location.search || ''), allowSoleActive: false,
            core: env.FarmaciaMultitreatmentCore, storage: env.sessionStorage, dataSource: env.FarmaciaDataSource, demo: env.FarmaciaDemo });
        if (!context || context.ok !== true || context.code !== 'CANONICAL_ACTIVE_CONTEXT_READY' || !context.line || context.line.status !== 'active' ||
                context.patient_id !== context.line.patient_id || context.line_id !== context.line.line_id) return { ok: false, code: 'FOLLOWUP_OUTPUT_CONTEXT_BLOCKED', context: context };
        return { ok: true, context: context };
    }
    function readLatest(environment, patientId, lineId) {
        var env = environment || root; var visits = env.FarmaciaFollowupConfirmedVisitV4;
        if (!visits || visits.STORE_KEY !== STORE_KEY || typeof visits.createStore !== 'function' || typeof visits.latestFor !== 'function') return { ok: false, code: 'FOLLOWUP_OUTPUT_STORAGE_ERROR' };
        var loaded = visits.createStore(env.sessionStorage).read();
        if (!loaded || !loaded.ok) return { ok: false, code: 'FOLLOWUP_OUTPUT_STORAGE_ERROR' };
        var record = visits.latestFor(loaded.state.records, patientId, lineId);
        return record ? { ok: true, record: record } : { ok: false, code: 'FOLLOWUP_OUTPUT_EMPTY' };
    }
    function helpersReady(environment) {
        var env = environment || root; var demo = env.FarmaciaDemo; var excel = env.FarmaciaExcelRowExport; var clipboard = env.navigator && env.navigator.clipboard;
        return !!(demo && typeof demo.downloadFile === 'function' && clipboard && typeof clipboard.writeText === 'function' && excel &&
            typeof excel.buildExcelRowObject === 'function' && typeof excel.buildExcelRowArray === 'function' &&
            typeof excel.toTSVRow === 'function' && typeof excel.getServiceSheetName === 'function');
    }
    async function writeClipboard(environment, value) {
        var env = environment || root; var clipboard = env.navigator && env.navigator.clipboard;
        if (!clipboard || typeof clipboard.writeText !== 'function' || typeof value !== 'string' || value === '') throw new Error('FOLLOWUP_OUTPUT_HELPER_ERROR');
        var pending = clipboard.writeText(value);
        if (!pending || typeof pending.then !== 'function') throw new Error('FOLLOWUP_OUTPUT_HELPER_ERROR');
        await pending;
    }
    function canonicalProjection(context, visit, environment, generatedAt) {
        var env = environment || root; var query = params(env); var person = context.person || {}; var line = context.line || {};
        var cip = text(query && query.get('cip')) || text(person.cip);
        return {
            record_id: text(visit.record_id), patient_id: text(visit.patient_id), cip_demo_o_hash: cip,
            service: text(person.service), pathology: text(person.pathology), line_id: text(visit.line_id), visit_date: text(visit.visit_date),
            confirmed_at: text(visit.confirmed_at), confirmed_by_demo: text(visit.confirmed_by_demo),
            source_draft_saved_at: text(visit.source_draft_saved_at), source_draft_saved_by_demo: text(visit.source_draft_saved_by_demo),
            context_source: text(context.source), line_status: text(line.status), relationship: text(line.relationship), provenance: text(line.provenance),
            drug_name: text(line.drug_name), active_ingredient: text(line.active_ingredient), dose_text: text(line.dose_text),
            presentation: text(line.presentation), route: text(line.route), pauta_codigo: text(line.pauta_codigo), pauta_label: text(line.pauta_label),
            pauta_otro_texto: text(line.pauta_otro_texto), start_date: text(line.start_date),
            request_id: text(context.request && context.request.request_id), validation_act_id: text(context.validation_act && context.validation_act.validation_act_id),
            start_movement_id: text(context.start_movement && context.start_movement.movement_id), notes: text(visit.notes),
            mg1: text(visit.mg1), mg2: text(visit.mg2), mg3: text(visit.mg3), mg4: text(visit.mg4), ae_present: text(visit.ae_present),
            ae_description: text(visit.ae_description), ae_severity: text(visit.ae_severity), ae_resolution: text(visit.ae_resolution),
            proms_collected: text(visit.proms_collected), dlqi_total: visit.dlqi_total === '' ? '' : visit.dlqi_total,
            eva_dolor: visit.eva_dolor === '' ? '' : visit.eva_dolor, eva_prurito: visit.eva_prurito === '' ? '' : visit.eva_prurito,
            generated_at: generatedAt || new Date().toISOString(), demo_flag: 'TRUE'
        };
    }
    function resolveProjection(environment, generatedAt) {
        var current = exactContext(environment); if (!current.ok) return current;
        var latest = readLatest(environment, current.context.patient_id, current.context.line_id); if (!latest.ok) return latest;
        if (latest.record.patient_id !== current.context.patient_id || latest.record.line_id !== current.context.line_id) return { ok: false, code: 'FOLLOWUP_OUTPUT_STORAGE_ERROR' };
        return { ok: true, code: 'FOLLOWUP_OUTPUT_READY', context: current.context, visit: latest.record,
            record: canonicalProjection(current.context, latest.record, environment, generatedAt) };
    }
    function buildTxt(record) {
        return ['DATOS SINTÉTICOS / DEMO — TEXTO PARA REVISIÓN, SIN INTEGRACIÓN JARA', '=== SEGUIMIENTO FARMACIA ===',
            'Record ID: ' + shown(record.record_id), 'Patient ID: ' + shown(record.patient_id), 'CIP demo/hash: ' + shown(record.cip_demo_o_hash),
            'Line ID: ' + shown(record.line_id), 'Fecha de visita confirmada: ' + shown(record.visit_date), 'Confirmada en: ' + shown(record.confirmed_at),
            'Profesional FH demo: ' + shown(record.confirmed_by_demo), 'Servicio: ' + shown(record.service), 'Patología: ' + shown(record.pathology),
            'Estado de línea: ' + shown(record.line_status), 'Relación: ' + shown(record.relationship), 'Procedencia: ' + shown(record.provenance),
            'Fármaco: ' + shown(record.drug_name), 'Principio activo: ' + shown(record.active_ingredient), 'Dosis: ' + shown(record.dose_text),
            'Presentación: ' + shown(record.presentation), 'Vía: ' + shown(record.route), 'Pauta código: ' + shown(record.pauta_codigo),
            'Pauta: ' + shown(record.pauta_label), 'Otra pauta: ' + shown(record.pauta_otro_texto), 'Fecha de inicio: ' + shown(record.start_date),
            'MG1 (respuesta cruda): ' + shown(record.mg1), 'MG2 (respuesta cruda): ' + shown(record.mg2),
            'MG3 (respuesta cruda): ' + shown(record.mg3), 'MG4 (respuesta cruda): ' + shown(record.mg4),
            'EA presente: ' + shown(record.ae_present), 'EA descripción: ' + shown(record.ae_description), 'EA gravedad: ' + shown(record.ae_severity),
            'EA resolución documentada: ' + shown(record.ae_resolution), 'PROMs recogidos: ' + shown(record.proms_collected),
            'DLQI total manual: ' + shown(record.dlqi_total), 'EVA dolor manual: ' + shown(record.eva_dolor),
            'EVA prurito manual: ' + shown(record.eva_prurito), 'Observaciones: ' + shown(record.notes), '=== FIN DEL TEXTO PARA REVISIÓN ==='].join('\n');
    }
    function csvCell(value) { var raw = value === null || value === undefined ? '' : String(value); return '"' + raw.replace(/"/g, '""') + '"'; }
    function buildCsv(record) { return CSV_COLUMNS.map(csvCell).join(',') + '\n' + CSV_COLUMNS.map(function (field) { return csvCell(record[field]); }).join(','); }
    function rawMg(record) { return ['mg1=' + text(record.mg1), 'mg2=' + text(record.mg2), 'mg3=' + text(record.mg3), 'mg4=' + text(record.mg4)].join(' | '); }
    function doseAndPresentation(record) { if (record.dose_text && record.presentation && record.dose_text !== record.presentation) return record.dose_text + ' · ' + record.presentation; return record.dose_text || record.presentation; }
    function auditObservations(record) { return ['source_draft_saved_at=' + text(record.source_draft_saved_at),
        'source_draft_saved_by_demo=' + text(record.source_draft_saved_by_demo), 'proms_collected=' + text(record.proms_collected),
        'eva_prurito=' + (record.eva_prurito === '' ? '' : String(record.eva_prurito)), 'ae_resolution=' + text(record.ae_resolution)].join(' | '); }
    function buildExcel(record, environment) {
        var env = environment || root; var helper = env.FarmaciaExcelRowExport;
        if (!helpersReady(env)) throw new Error('FOLLOWUP_OUTPUT_HELPER_ERROR');
        var line = { tratamiento_id: '', linea_id: record.line_id, nombre_comercial: record.drug_name, principio_activo: record.active_ingredient,
            codigo_nacional: '', nregistro: '', source_type: '', tipo_relacion: record.relationship, estado_linea: record.line_status,
            tipo_movimiento: '', fecha_inicio: record.start_date, fecha_fin: '',
            dosis_texto: doseAndPresentation(record), presentacion: record.presentation, via: record.route, pauta_codigo: record.pauta_codigo,
            pauta_label: record.pauta_label, pauta_otro_texto: record.pauta_otro_texto };
        var row = helper.buildExcelRowObject({ patient: {}, patientId: record.patient_id, cip: record.cip_demo_o_hash, servicio: record.service,
            patologia: record.pathology, tipoActo: 'seguimiento', visitaId: record.record_id, validacionId: record.validation_act_id,
            lineaActual: line, fechaActo: record.visit_date, profesional: record.confirmed_by_demo, estadoRegistro: 'confirmado_demo',
            demoFlag: true, obsSeguimiento: record.notes, observaciones: auditObservations(record) });
        row.tipo_movimiento = ''; row.motivo_inicio_cambio_suspension = ''; row.respuesta_clinica = ''; row.incidencias = '';
        row.adherencia_morisky = rawMg(record); row.eva_dolor = record.eva_dolor === '' ? '' : String(record.eva_dolor);
        row.dlqi = record.dlqi_total === '' ? '' : String(record.dlqi_total); row.observaciones_seguimiento = text(record.notes);
        row.hay_efecto_adverso = text(record.ae_present); row.ea_id = ''; row.ea_descripcion = text(record.ae_description); row.ea_gravedad = text(record.ae_severity);
        row.farmaco_sospechoso_id = ''; row.farmaco_sospechoso_nombre = ''; row.causalidad_naranjo = ''; row.causalidad_karch = ''; row.accion_ea = '';
        row.created_at = record.generated_at; row.updated_at = record.generated_at; row.demo_flag = 'TRUE'; row.observaciones_generales = auditObservations(record);
        var array = helper.buildExcelRowArray(row); if (!Array.isArray(array) || array.length !== 61) throw new Error('FOLLOWUP_OUTPUT_HELPER_ERROR');
        return { rowObject: row, rowArray: array };
    }
    function safeFilename(record) { return 'seguimiento_' + text(record.visit_date).replace(/[^0-9-]/g, '') + '_' + text(record.record_id).replace(/[^a-zA-Z0-9-]/g, '') + '.csv'; }
    function createController(environment, injected) {
        var env = environment || root; var deps = injected || {}; var dirty = false; var currentCode = 'FOLLOWUP_OUTPUT_CONTEXT_BLOCKED'; var inFlight = null; var generation = 0;
        function setAudit(record) { Object.keys(AUDIT_IDS).forEach(function (field) { var node = byId(env, AUDIT_IDS[field]); if (node) node.textContent = record && text(record[field]) ? text(record[field]) : 'No informado'; }); }
        function setButtons(enabled) { Object.keys(TARGETS).forEach(function (id) { var button = byId(env, id); if (button) { button.disabled = !enabled; button.setAttribute('aria-disabled', enabled ? 'false' : 'true'); } }); }
        function setStatus(code) { currentCode = code; var status = byId(env, 'fhSegOutputStatus'); if (status) { status.textContent = TEXTS[code]; status.setAttribute('data-status-code', code); }
            var section = byId(env, 'modExportacion'); if (section) { section.inert = false; section.removeAttribute && section.removeAttribute('aria-disabled'); } }
        function refreshCurrent() {
            setButtons(false); setAudit(null);
            var resolved = resolveProjection(env, typeof deps.now === 'function' ? deps.now() : undefined);
            if (!resolved.ok) { setStatus(resolved.code); return resolved; }
            if (!helpersReady(env)) { setStatus('FOLLOWUP_OUTPUT_HELPER_ERROR'); return { ok: false, code: 'FOLLOWUP_OUTPUT_HELPER_ERROR' }; }
            setAudit(resolved.record); var code = dirty ? 'FOLLOWUP_OUTPUT_READY_WITH_UNSAVED_CHANGES' : 'FOLLOWUP_OUTPUT_READY'; setStatus(code); setButtons(!inFlight);
            return { ok: true, code: code, record: resolved.record, context: resolved.context };
        }
        function refresh() { generation += 1; return refreshCurrent(); }
        function applyDraftState(detail) { dirty = !!(detail && detail.dirty === true); return refresh(); }
        function identityOf(resolved) { var visit = resolved.visit || resolved.record; return [resolved.context.patient_id, resolved.context.line_id, visit.record_id,
            visit.confirmed_at, visit.source_draft_saved_at].map(text).join('\u001f'); }
        function invalidatedResult() { var current = refreshCurrent(); return { ok: false, code: current.code }; }
        function execute(kind) {
            if (inFlight) return inFlight;
            var token = generation; var operation = run(kind, token); inFlight = operation;
            operation.then(function (result) { if (inFlight !== operation) return; inFlight = null; var current = refreshCurrent();
                if (result && result.ok && result.code === 'FOLLOWUP_OUTPUT_GENERATED' && current.ok && result.identity === identityOf(current)) {
                    setAudit(current.record); setStatus('FOLLOWUP_OUTPUT_GENERATED'); setButtons(true);
                } else if (result && result.code === 'FOLLOWUP_OUTPUT_HELPER_ERROR') { setStatus('FOLLOWUP_OUTPUT_HELPER_ERROR'); setButtons(false); }
            }, function () { if (inFlight === operation) { inFlight = null; refreshCurrent(); } });
            return operation;
        }
        async function run(kind, token) {
            var resolved = resolveProjection(env, typeof deps.now === 'function' ? deps.now() : undefined);
            if (!resolved.ok) { setButtons(false); setAudit(null); setStatus(resolved.code); return resolved; }
            if (!helpersReady(env)) { setButtons(false); setStatus('FOLLOWUP_OUTPUT_HELPER_ERROR'); return { ok: false, code: 'FOLLOWUP_OUTPUT_HELPER_ERROR' }; }
            setButtons(false); var record = resolved.record; var identity = identityOf(resolved); var output;
            try {
                if (kind === 'txt') { output = buildTxt(record); await writeClipboard(env, output); }
                else if (kind === 'csv') { output = buildCsv(record); if (env.FarmaciaDemo.downloadFile(safeFilename(record), output, 'text/csv;charset=utf-8') === false) throw new Error('helper'); }
                else if (kind === 'excel') { output = buildExcel(record, env); await writeClipboard(env, env.FarmaciaExcelRowExport.toTSVRow(output.rowArray)); }
                else return { ok: false, code: 'FOLLOWUP_OUTPUT_CONTEXT_BLOCKED' };
            } catch (error) {
                var afterFailure = resolveProjection(env, typeof deps.now === 'function' ? deps.now() : undefined);
                if (token !== generation || !afterFailure.ok || identityOf(afterFailure) !== identity) return invalidatedResult();
                setButtons(false); setStatus('FOLLOWUP_OUTPUT_HELPER_ERROR'); return { ok: false, code: 'FOLLOWUP_OUTPUT_HELPER_ERROR' };
            }
            var after = resolveProjection(env, typeof deps.now === 'function' ? deps.now() : undefined);
            if (token !== generation || !after.ok || identityOf(after) !== identity) return invalidatedResult();
            setAudit(after.record); setStatus('FOLLOWUP_OUTPUT_GENERATED'); setButtons(false); return { ok: true, code: 'FOLLOWUP_OUTPUT_GENERATED', kind: kind,
                identity: identity, record: after.record, output: output };
        }
        return { refresh: refresh, applyDraftState: applyDraftState, execute: execute, state: function () { return { code: currentCode, dirty: dirty, inFlight: !!inFlight }; } };
    }
    function absorb(event) { event.preventDefault(); event.stopPropagation(); if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation(); }
    function install(environment) {
        var env = environment || root; if (!env.document || env.__farmaciaFollowupOutputsV4Installed === true) return env.__farmaciaFollowupOutputsV4Controller || null;
        env.__farmaciaFollowupOutputsV4Installed = true; var controller = createController(env); var lastClick = { id: '', at: 0 }; env.__farmaciaFollowupOutputsV4Controller = controller;
        env.document.addEventListener('click', async function (event) { var button = event.target && event.target.closest ? event.target.closest('#fhSegExportTxt, #fhSegExportCsv, #fhSegExcelExportBtn') : null;
            if (!button) return; absorb(event); var now = Date.now(); if (lastClick.id === button.id && now - lastClick.at < 400) return; lastClick = { id: button.id, at: now };
            if (!button.disabled) await controller.execute(TARGETS[button.id]); }, true);
        env.document.addEventListener('farmacia:followup-context-applied-v4', function () { controller.refresh(); });
        env.document.addEventListener('farmacia:followup-draft-state-v4', function (event) { controller.applyDraftState(event.detail || {}); });
        env.document.addEventListener('farmacia:followup-confirmed-visit-v1', function () { controller.refresh(); });
        controller.refresh(); return controller;
    }
    return { STORE_KEY: STORE_KEY, CSV_COLUMNS: CSV_COLUMNS, TARGETS: TARGETS, AUDIT_IDS: AUDIT_IDS, TEXTS: TEXTS,
        exactContext: exactContext, readLatest: readLatest, helpersReady: helpersReady, canonicalProjection: canonicalProjection,
        resolveProjection: resolveProjection, buildTxt: buildTxt, buildCsv: buildCsv, buildExcel: buildExcel, safeFilename: safeFilename,
        createController: createController, install: install };
});
