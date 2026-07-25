(function (root, factory) {
    'use strict';
    var api = factory(root || {});
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root && typeof root === 'object') root.FarmaciaFirstVisitExportsV4 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';

    var PENDING_MESSAGE = 'Confirme el inicio de tratamiento antes de generar salidas de Primera Visita.';
    var CSV_COLUMNS = ['patient_id', 'cip_demo_o_hash', 'line_id', 'validation_act_id', 'request_id', 'line_status', 'relationship', 'drug_name', 'active_ingredient', 'dose_text', 'presentation', 'route', 'pauta_codigo', 'pauta_label', 'pauta_otro_texto', 'start_date', 'start_declared_by_demo', 'induccion_realizada', 'estratificacion', 'proms_basales', 'notas', 'generated_at', 'demo_flag'];
    var TARGET_IDS = { fhPvExportTxt: 'jara', fhPvExportCsv: 'csv', fhPvExcelExportBtn: 'excel' };

    function text(value) { return value === null || value === undefined ? '' : String(value).trim(); }
    function shown(value) { return text(value) || 'No informado'; }
    function doseAndPresentation(dose, presentation) {
        var explicitDose = text(dose);
        var explicitPresentation = text(presentation);
        if (explicitDose && explicitPresentation && explicitDose !== explicitPresentation) return explicitDose + ' · ' + explicitPresentation;
        return explicitDose || explicitPresentation;
    }
    function byId(env, id) { return env.document && env.document.getElementById(id); }
    function domValue(env, id) { var node = byId(env, id); return text(node && node.value); }
    function params(env) { return new (env.URLSearchParams || URLSearchParams)((env.location && env.location.search) || ''); }
    function catalog(line) {
        var identity = line.catalog_identity || {};
        var snapshot = line.catalog_snapshot || {};
        var result = {};
        ['selected_drug_id', 'source_type', 'national_code', 'registration_number', 'drug_name', 'active_ingredient'].forEach(function (field) {
            result[field] = text(identity[field]) || text(snapshot[field]);
        });
        return result;
    }

    function resolveActiveContext(environment) {
        var env = environment || root;
        var identityApi = env.FarmaciaFirstVisitIdentityV4;
        if (!identityApi || typeof identityApi.resolveCanonicalContext !== 'function') return { ok: false, code: 'IDENTITY_ADAPTER_UNAVAILABLE', message: PENDING_MESSAGE };
        var result = identityApi.resolveCanonicalContext({
            identity: identityApi.readIdentity((env.location && env.location.search) || ''),
            core: env.FarmaciaMultitreatmentCore,
            storage: env.sessionStorage
        });
        if (!result.ok || !result.line || result.line.status !== 'active' || !result.start_movement) {
            return { ok: false, code: result.code || 'START_REQUIRED', message: PENDING_MESSAGE, context: result };
        }
        return { ok: true, code: 'EXPORT_CONTEXT_READY', message: '', context: result };
    }

    function markPromInteraction(event) {
        var target = event && event.target;
        if (!target || !target.id && !target.name) return;
        if (/^fhPvEva(Dolor|Prurito)Range$/.test(target.id || '') || /^dlqi_q/.test(target.name || '')) {
            target.setAttribute('data-fh-pv-completed', 'true');
        }
    }

    function buildProms(environment) {
        var env = environment || root;
        var choice = domValue(env, 'fhPvProms');
        if (choice !== 'Sí') return choice;
        var details = [];
        if (env.document && env.document.querySelectorAll) {
            var answered = env.document.querySelectorAll('#fhPvDlqiQuestions input[type="radio"]:checked');
            var dlqiDetails = {};
            Array.prototype.forEach.call(answered, function (input) {
                var question = text(input.getAttribute('data-dlqi-q'));
                var value = input.getAttribute('data-dlqi-val');
                if (!question || value === null || value === '') return;
                if (!Object.prototype.hasOwnProperty.call(dlqiDetails, question)) dlqiDetails[question] = 'DLQI Q' + question + ': ' + text(value);
            });
            Object.keys(dlqiDetails).forEach(function (question) { details.push(dlqiDetails[question]); });
        }
        [['fhPvEvaDolorRange', 'EVA dolor'], ['fhPvEvaPruritoRange', 'EVA prurito']].forEach(function (entry) {
            var input = byId(env, entry[0]);
            if (input && input.getAttribute('data-fh-pv-completed') === 'true') details.push(entry[1] + ': ' + text(input.value));
        });
        return details.length ? 'Sí · ' + details.join(' · ') : 'Sí · Sin controles PROM completados';
    }

    function captureExcelProms(environment) {
        var env = environment || root;
        if (domValue(env, 'fhPvProms') !== 'Sí') return {};
        var captured = {};
        var dolor = byId(env, 'fhPvEvaDolorRange');
        if (dolor && dolor.getAttribute('data-fh-pv-completed') === 'true') captured.eva_dolor = text(dolor.value);

        if (env.document && env.document.querySelectorAll) {
            var answers = env.document.querySelectorAll('#fhPvDlqiQuestions input[type="radio"]:checked');
            var scores = {};
            Array.prototype.forEach.call(answers, function (input) {
                if (input.getAttribute('data-fh-pv-completed') !== 'true') return;
                var question = text(input.getAttribute('data-dlqi-q'));
                var value = input.getAttribute('data-dlqi-val');
                if (question && value !== null && value !== '' && !Object.prototype.hasOwnProperty.call(scores, question)) {
                    scores[question] = Number(value);
                }
            });
            if (Object.keys(scores).length === 10) {
                captured.dlqi = String(Object.keys(scores).reduce(function (total, question) { return total + scores[question]; }, 0));
            }
        }
        return captured;
    }

    function buildCanonicalRecord(context, environment, generatedAt) {
        var env = environment || root;
        var result = context.context || context;
        var line = result.line;
        var act = result.validation_act;
        var movement = result.start_movement;
        var query = params(env);
        return {
            patient_id: text(result.patient_id), cip_demo_o_hash: text(query.get('cip')) || domValue(env, 'fhPvCip'), line_id: text(result.line_id),
            validation_act_id: text(act.validation_act_id), request_id: text(line.source_request_id || act.request_id),
            line_status: text(line.status), relationship: text(line.relationship), drug_name: text(line.drug_name),
            active_ingredient: text(line.active_ingredient), dose_text: text(line.dose_text), presentation: text(line.presentation),
            route: text(line.route), pauta_codigo: text(line.pauta_codigo), pauta_label: text(line.pauta_label),
            pauta_otro_texto: text(line.pauta_otro_texto), start_date: text(line.start_date),
            start_declared_by_demo: text(movement.declared_by_demo), induccion_realizada: domValue(env, 'fhPvInduccionRealizada'),
            estratificacion: domValue(env, 'fhPvEstratificacion'), proms_basales: buildProms(env), notas: domValue(env, 'fhPvNotas'),
            generated_at: generatedAt || new Date().toISOString(), demo_flag: 'TRUE', provenance: text(line.provenance), catalog_identity: catalog(line),
            start_movement_id: text(movement.movement_id), start_movement_type: text(movement.movement_type)
        };
    }

    function buildJaraText(record) {
        var cat = record.catalog_identity || {};
        return [
            '=== INFORME DE PRIMERA VISITA FARMACIA ===', 'DATOS SINTÉTICOS / DEMO — NO USAR PARA DECISIONES CLÍNICAS',
            'Fecha/hora de generación: ' + shown(record.generated_at), 'Patient ID: ' + shown(record.patient_id),
            'CIP demo/hash: ' + shown(record.cip_demo_o_hash), 'Line ID: ' + shown(record.line_id),
            'Validation ID: ' + shown(record.validation_act_id), 'Request ID: ' + shown(record.request_id),
            'Estado de línea: ' + shown(record.line_status), 'Relación: ' + shown(record.relationship),
            'Procedencia: ' + shown(record.provenance), 'Identidad de catálogo: ' + shown(cat.selected_drug_id),
            'Origen de catálogo: ' + shown(cat.source_type), 'Código nacional: ' + shown(cat.national_code),
            'Número de registro: ' + shown(cat.registration_number), 'Fármaco: ' + shown(record.drug_name),
            'Principio activo: ' + shown(record.active_ingredient), 'Presentación: ' + shown(record.presentation),
            'Dosis: ' + shown(record.dose_text), 'Vía: ' + shown(record.route),
            'Pauta código: ' + shown(record.pauta_codigo), 'Pauta: ' + shown(record.pauta_label),
            'Otra pauta: ' + shown(record.pauta_otro_texto), 'Fecha canónica de inicio: ' + shown(record.start_date),
            'Movimiento de inicio: ' + shown(record.start_movement_type), 'Movement ID: ' + shown(record.start_movement_id),
            'Profesional que confirma inicio: ' + shown(record.start_declared_by_demo),
            'Inducción realizada: ' + shown(record.induccion_realizada), 'Estratificación: ' + shown(record.estratificacion),
            'PROMs basales: ' + shown(record.proms_basales), 'Notas: ' + shown(record.notas), '=== FIN DEL INFORME ==='
        ].join('\n');
    }

    function csvCell(value) { return '"' + text(value).replace(/"/g, '""') + '"'; }
    function buildCsv(record) { return CSV_COLUMNS.map(csvCell).join(',') + '\n' + CSV_COLUMNS.map(function (key) { return csvCell(record[key]); }).join(','); }

    function buildExcel(record, context, environment) {
        var env = environment || root;
        var exp = env.FarmaciaExcelRowExport;
        if (!exp || typeof exp.buildExcelRowObject !== 'function' || typeof exp.buildExcelRowArray !== 'function') throw new Error('Excel helper unavailable');
        var line = context.context ? context.context.line : context.line;
        var cat = record.catalog_identity || {};
        var mappedLine = {
            tratamiento_id: '', linea_id: record.line_id, nombre_comercial: record.drug_name, principio_activo: record.active_ingredient,
            codigo_nacional: text(cat.national_code), nregistro: text(cat.registration_number), source_type: text(cat.source_type),
            tipo_relacion: record.relationship, estado_linea: 'active', tipo_movimiento: 'start',
            es_principal: record.relationship === 'primary', fecha_inicio: record.start_date, fecha_fin: text(line.end_date),
            dosis_texto: doseAndPresentation(line.dose_text, line.presentation), presentacion: text(line.presentation), via: record.route,
            pauta_codigo: record.pauta_codigo, pauta_label: record.pauta_label, pauta_otro_texto: record.pauta_otro_texto
        };
        var query = params(env);
        var rowObject = exp.buildExcelRowObject({
            patient: {}, patientId: record.patient_id, cip: record.cip_demo_o_hash,
            servicio: text(query.get('servicio')), patologia: text(query.get('patologia')), tipoActo: 'primera_visita',
            visitaId: '', validacionId: record.validation_act_id, lineaActual: mappedLine, fechaActo: record.start_date,
            profesional: record.start_declared_by_demo, estadoRegistro: 'completado', resultadoValidacion: 'validated',
            proms: captureExcelProms(env), demoFlag: true, observaciones: record.notas
        });
        var rowArray = exp.buildExcelRowArray(rowObject);
        return { rowObject: rowObject, rowArray: rowArray };
    }

    function setBlockedStatus(env) {
        var status = byId(env, 'fhPvCanonicalStatus');
        if (status) { status.textContent = PENDING_MESSAGE; status.setAttribute('data-status-code', 'EXPORT_START_REQUIRED'); }
        ['fhPvExportTxt', 'fhPvExportCsv', 'fhPvExcelExportBtn'].forEach(function (id) {
            var button = byId(env, id); if (!button) return; button.disabled = true; button.setAttribute('aria-disabled', 'true'); button.setAttribute('title', PENDING_MESSAGE);
        });
    }

    function execute(kind, environment) {
        var env = environment || root;
        var resolved = resolveActiveContext(env);
        if (!resolved.ok) { setBlockedStatus(env); return { ok: false, code: resolved.code, message: PENDING_MESSAGE }; }
        var record = buildCanonicalRecord(resolved, env);
        if (kind === 'jara') {
            var jara = buildJaraText(record); env.FarmaciaDemo.copyTextToClipboard(jara, 'Texto JARA copiado al portapapeles.');
            return { ok: true, kind: kind, record: record, output: jara };
        }
        if (kind === 'csv') {
            var csv = buildCsv(record); env.FarmaciaDemo.downloadFile('primera_visita_FH_' + record.start_date + '.csv', csv, 'text/csv;charset=utf-8');
            return { ok: true, kind: kind, record: record, output: csv };
        }
        var excel = buildExcel(record, resolved, env);
        if (excel.rowArray.length !== 61) throw new Error('Excel row must preserve 61 columns');
        env.FarmaciaExcelRowExport.copyTSVRowToClipboard(excel.rowArray, { sheetName: env.FarmaciaExcelRowExport.getServiceSheetName(params(env).get('servicio')) || 'hoja correspondiente' });
        return { ok: true, kind: kind, record: record, output: excel };
    }

    function captureClick(event, environment) {
        var env = environment || root;
        var target = event && event.target;
        var button = target && target.closest ? target.closest('#fhPvExportTxt, #fhPvExportCsv, #fhPvExcelExportBtn') : target;
        var kind = button && TARGET_IDS[button.id];
        if (!kind) return;
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        execute(kind, env);
    }

    function boot(environment) {
        var env = environment || root;
        if (!env.document || env.document.documentElement.getAttribute('data-fh-pv-exports-v4') === 'true') return;
        env.document.documentElement.setAttribute('data-fh-pv-exports-v4', 'true');
        env.document.addEventListener('click', function (event) { captureClick(event, env); }, true);
        env.document.addEventListener('input', markPromInteraction, true);
        env.document.addEventListener('change', markPromInteraction, true);
        var resolved = resolveActiveContext(env);
        if (!resolved.ok) setBlockedStatus(env);
    }

    if (root.document) root.document.addEventListener('DOMContentLoaded', function () { boot(root); });
    return { PENDING_MESSAGE: PENDING_MESSAGE, CSV_COLUMNS: CSV_COLUMNS, resolveActiveContext: resolveActiveContext, buildProms: buildProms, captureExcelProms: captureExcelProms, buildCanonicalRecord: buildCanonicalRecord, buildJaraText: buildJaraText, buildCsv: buildCsv, buildExcel: buildExcel, execute: execute, captureClick: captureClick, boot: boot };
});
