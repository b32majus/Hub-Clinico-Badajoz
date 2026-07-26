(function (root, factory) {
    'use strict';
    var api = factory(root || {});
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root && typeof root === 'object') root.FarmaciaFollowupContextV4 = api;
    if (root && root.document) api.installCapture(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';

    var STORE_KEY = 'farmaciaDemo.multitreatment.v1';
    var SAFETY_MESSAGE = 'Contexto canónico de línea preparado. El registro clínico y las exportaciones de Seguimiento se habilitarán tras su migración por línea.';
    var OUTPUT_IDS = ['fhSegExportTxt', 'fhSegExportCsv', 'fhSegExcelExportBtn'];
    var USABLE_IDS = ['fhSegCip', 'fhSegCipSearchBtn', 'fhSegLineaPrincipal'];
    var renderSequence = 0;

    function text(value) {
        return value === null || value === undefined ? '' : String(value).trim();
    }

    function values(indexed) {
        return indexed && typeof indexed === 'object' ? Object.keys(indexed).map(function (key) { return indexed[key]; }) : [];
    }

    function blocked(code, message, identity, lines, person) {
        return {
            ok: false,
            code: code,
            message: message,
            patient_id: text(identity && identity.patient_id),
            line_id: text(identity && identity.line_id),
            line: null,
            lines: Array.isArray(lines) ? lines : [],
            person: person || null,
            source: ''
        };
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

    function normalizeSourceLine(line) {
        var source = line || {};
        return {
            line_id: text(source.line_id),
            patient_id: text(source.patient_id),
            drug_name: text(source.drug_name),
            active_ingredient: text(source.active_ingredient),
            dose_text: text(source.dose_text),
            presentation: text(source.presentation),
            route: text(source.route),
            pauta_codigo: text(source.pauta_codigo),
            pauta_label: text(source.pauta_label || source.schedule),
            pauta_otro_texto: text(source.pauta_otro_texto),
            start_date: text(source.start_date),
            status: text(source.status),
            relationship: text(source.relationship),
            provenance: text(source.provenance)
        };
    }

    function readHubState(core, storage) {
        if (!core || typeof core.createSessionStore !== 'function') return { ok: true, state: null };
        if (!storage || typeof storage.getItem !== 'function') return { ok: true, state: core.createEmptySessionState ? core.createEmptySessionState() : null };
        var raw;
        try { raw = storage.getItem(STORE_KEY); } catch (error) { return { ok: false, code: 'STORAGE_UNAVAILABLE' }; }
        if (!raw) return { ok: true, state: core.createSessionStore(storage).load() };
        try {
            var parsed = JSON.parse(raw);
            var loaded = core.createSessionStore(storage).load();
            if (JSON.stringify(parsed) !== JSON.stringify(loaded)) return { ok: false, code: 'STORAGE_CORRUPT' };
            return { ok: true, state: loaded };
        } catch (error) {
            return { ok: false, code: 'STORAGE_CORRUPT' };
        }
    }

    function findDemoPatientByCip(demo, cip) {
        if (!text(cip) || !demo || typeof demo.findPatientByCip !== 'function') return null;
        try { return demo.findPatientByCip(text(cip)) || null; } catch (error) { return null; }
    }

    function hubLineResult(patient, patientId, line, expectedLineId) {
        var normalized = normalizeSourceLine(line);
        if (expectedLineId && normalized.line_id !== text(expectedLineId)) {
            return blocked('LINE_MISMATCH', 'La identidad interna de la línea no coincide con la selección.', { patient_id: patientId, line_id: expectedLineId });
        }
        if (normalized.patient_id !== patientId) {
            return blocked('PATIENT_MISMATCH', 'La línea no pertenece al paciente indicado.', { patient_id: patientId, line_id: normalized.line_id });
        }
        if (normalized.status !== 'active') {
            return blocked('LINE_NOT_ACTIVE', 'La línea indicada no está activa y no es elegible para Seguimiento.', { patient_id: patientId, line_id: normalized.line_id });
        }
        if (normalized.provenance !== 'validated_in_hub') {
            return blocked('UNSUPPORTED_PROVENANCE', 'La línea de sesión no procede de una validación positiva en el Hub.', { patient_id: patientId, line_id: normalized.line_id });
        }
        var request = patient.requests && patient.requests[line.source_request_id];
        var act = patient.validation_acts && patient.validation_acts[line.source_validation_act_id];
        if (!request || text(request.request_id) !== text(line.source_request_id) || text(request.patient_id) !== patientId ||
                !act || text(act.validation_act_id) !== text(line.source_validation_act_id) || text(act.patient_id) !== patientId ||
                text(act.request_id) !== text(line.source_request_id) || act.result !== 'validated' || text(act.produced_line_id) !== normalized.line_id) {
            return blocked('HUB_GRAPH_INCOHERENT', 'La solicitud, la validación y la línea canónica no forman un grafo coherente.', { patient_id: patientId, line_id: normalized.line_id });
        }
        var starts = values(patient.movements).filter(function (movement) {
            return movement && movement.movement_type === 'start' && text(movement.target_line_id) === normalized.line_id;
        });
        if (!normalized.start_date || starts.length !== 1 || text(starts[0].patient_id) !== patientId ||
                text(starts[0].target_line_id) !== normalized.line_id || text(starts[0].effective_at) !== normalized.start_date ||
                text(starts[0].validation_act_id) !== text(line.source_validation_act_id)) {
            return blocked('HUB_START_INCOHERENT', 'La línea activa no contiene un único inicio canónico coherente.', { patient_id: patientId, line_id: normalized.line_id });
        }
        return { ok: true, code: 'CANONICAL_ACTIVE_CONTEXT_READY', message: SAFETY_MESSAGE,
            patient_id: patientId, line_id: normalized.line_id, line: normalized, request: request,
            validation_act: act, start_movement: starts[0], source: 'sessionStorage', lines: [], person: null };
    }

    function sourceLines(dataSource, patientId) {
        if (!dataSource || typeof dataSource.getCanonicalLinesByPatientId !== 'function') return [];
        var result = dataSource.getCanonicalLinesByPatientId(patientId);
        return Array.isArray(result) ? result.map(normalizeSourceLine) : [];
    }

    function findForeignSourceLine(dataSource, patientId, lineId) {
        if (!lineId || !dataSource || typeof dataSource.getPersons !== 'function') return null;
        var persons = dataSource.getPersons();
        if (!Array.isArray(persons)) return null;
        var match = null;
        persons.some(function (person) {
            if (!person || person.patient_id === patientId) return false;
            match = sourceLines(dataSource, person.patient_id).find(function (line) { return line.line_id === lineId; }) || null;
            return !!match;
        });
        return match;
    }

    function resolveCanonicalContext(options) {
        var source = options || {};
        var identity = source.identity || {};
        var patientId = text(identity.patient_id);
        var lineId = text(identity.line_id);
        if (!patientId) return blocked('PATIENT_NOT_FOUND', 'Falta patient_id. Busque un CIP sintético para resolver el paciente canónico.', identity);

        var hub = readHubState(source.core, source.storage);
        if (!hub.ok) return blocked(hub.code, 'El almacenamiento canónico de la sesión no es válido; se bloquea Seguimiento.', identity);
        var state = hub.state;
        var patient = state && state.patients && state.patients[patientId];
        if (patient) {
            var hubLines = values(patient.lines).map(normalizeSourceLine);
            var mappedDemoPatient = findDemoPatientByCip(source.demo, identity.cip);
            if (text(identity.cip) && (!mappedDemoPatient || text(mappedDemoPatient.patient_id) !== patientId)) {
                return blocked('PATIENT_MISMATCH', 'El CIP indicado no resuelve al mismo paciente canónico de la sesión.', identity, hubLines, mappedDemoPatient);
            }
            if (lineId && !(patient.lines && patient.lines[lineId])) {
                var foreignHub = null;
                Object.keys(state.patients || {}).some(function (otherPatientId) {
                    if (otherPatientId === patientId) return false;
                    var other = state.patients[otherPatientId];
                    foreignHub = other && other.lines && other.lines[lineId];
                    return !!foreignHub;
                });
                return blocked(foreignHub ? 'PATIENT_MISMATCH' : 'LINE_NOT_FOUND', foreignHub ?
                    'La línea pertenece a otro paciente.' : 'No existe la línea indicada para este paciente.', identity, hubLines);
            }
            if (!lineId) {
                var coherentHub = [];
                var hubFailure = null;
                values(patient.lines).forEach(function (candidate) {
                    if (!candidate || candidate.status !== 'active') return;
                    var checked = hubLineResult(patient, patientId, candidate, candidate.line_id);
                    if (checked.ok) coherentHub.push(candidate);
                    else if (!hubFailure) hubFailure = checked;
                });
                if (source.allowSoleActive && coherentHub.length === 1) {
                    var soleHub = null;
                    coherentHub.forEach(function (candidate) { soleHub = candidate; });
                    var soleResult = hubLineResult(patient, patientId, soleHub, soleHub.line_id);
                    soleResult.lines = hubLines;
                    return soleResult;
                }
                if (!coherentHub.length && hubFailure) { hubFailure.lines = hubLines; return hubFailure; }
                return blocked('SELECTION_REQUIRED', coherentHub.length ? 'Seleccione explícitamente una línea activa.' : 'No existe una línea activa elegible.', identity, hubLines);
            }
            var hubResult = hubLineResult(patient, patientId, patient.lines[lineId], lineId);
            hubResult.lines = hubLines;
            return hubResult;
        }

        var dataSource = source.dataSource;
        var person = dataSource && typeof dataSource.findPersonById === 'function' ? dataSource.findPersonById(patientId) : null;
        if (!person || text(person.patient_id) !== patientId) {
            return blocked('PATIENT_NOT_FOUND', 'No existe el paciente indicado en una fuente canónica soportada.', identity);
        }
        var lines = sourceLines(dataSource, patientId);
        if (text(identity.cip) && text(identity.cip) !== text(person.cip)) {
            return blocked('PATIENT_MISMATCH', 'El CIP indicado no coincide con el paciente canónico.', identity, lines, person);
        }
        var supportedScenario = ['S09', 'S10', 'S11'].indexOf(text(person.scenario_id)) !== -1;
        if (!supportedScenario) {
            var unsupportedLine = lineId ? lines.find(function (line) { return line.line_id === lineId; }) : null;
            return blocked(unsupportedLine && unsupportedLine.status !== 'active' ? 'LINE_NOT_ACTIVE' : 'LINE_NOT_FOUND',
                'Este paciente no dispone de una línea pre-Hub activa elegible para Seguimiento.', identity, lines, person);
        }
        var selected = lineId ? lines.find(function (line) { return line.line_id === lineId; }) : null;
        if (lineId && !selected) {
            var foreignSource = findForeignSourceLine(dataSource, patientId, lineId);
            return blocked(foreignSource ? 'PATIENT_MISMATCH' : 'LINE_NOT_FOUND', foreignSource ?
                'La línea pertenece a otro paciente.' : 'No existe la línea indicada para este paciente.', identity, lines, person);
        }
        if (!lineId) {
            var active = lines.filter(function (line) { return line.status === 'active'; });
            if (source.allowSoleActive && active.length === 1) active.forEach(function (line) { selected = line; });
            else return blocked('SELECTION_REQUIRED', active.length ? 'Seleccione explícitamente una línea activa.' : 'No existe una línea activa elegible.', identity, lines, person);
        }
        if (selected.patient_id !== patientId) return blocked('PATIENT_MISMATCH', 'La línea no pertenece al paciente indicado.', identity, lines, person);
        if (selected.line_id !== text(lineId || selected.line_id)) return blocked('LINE_MISMATCH', 'La identidad interna de la línea no coincide con la selección.', identity, lines, person);
        if (selected.status !== 'active') return blocked('LINE_NOT_ACTIVE', 'La línea histórica o no iniciada es solo visible y no es elegible.',
            { patient_id: patientId, line_id: selected.line_id }, lines, person);
        if (['pre_hub_existing', 'pre_hub_validated'].indexOf(selected.provenance) === -1) {
            return blocked('UNSUPPORTED_PROVENANCE', 'La procedencia de la línea no está soportada para Seguimiento.', identity, lines, person);
        }
        return { ok: true, code: 'CANONICAL_ACTIVE_CONTEXT_READY', message: SAFETY_MESSAGE,
            patient_id: patientId, line_id: selected.line_id, line: selected, lines: lines, person: person,
            source: 'FarmaciaDataSource', request: null, validation_act: null, start_movement: null };
    }

    function byId(environment, id) {
        return environment.document ? environment.document.getElementById(id) : null;
    }

    function setDisplayText(environment, id, value) {
        var element = byId(environment, id);
        if (element) element.textContent = text(value) || 'No informado';
    }

    function setValue(environment, id, value) {
        var element = byId(environment, id);
        if (element) element.value = text(value);
    }

    function setSelectExact(environment, id, value) {
        var select = byId(environment, id);
        if (!select) return;
        var target = text(value);
        select.value = '';
        if (!target) return;
        var exact = Array.prototype.some.call(select.options || [], function (option) { return option.value === target; });
        if (exact) select.value = target;
    }

    function clearProjection(environment) {
        ['fhSegFarmaco', 'fhSegPrincipioActivo', 'fhSegPresentacion', 'fhSegDosisActual', 'fhSegVia',
            'fhSegCodigoNacional', 'fhSegNregistro', 'fhSegEtiquetas', 'fhSegFechaInicio', 'fhSegUltimaAdherencia',
            'fhSegUltimosProms', 'fhSegOrigenCatalogo', 'fhSegEaPrevios', 'fhSegEstadoLinea'].forEach(function (id) { setValue(environment, id, ''); });
        setValue(environment, 'fhSegTipoRelacionTerapia', '');
        setDisplayText(environment, 'fhSegCimaContextPrincipioActivo', '');
        var pauta = byId(environment, 'fhSegPautaActual');
        if (pauta) {
            while (pauta.firstChild) pauta.removeChild(pauta.firstChild);
            var placeholder = environment.document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'No informado';
            pauta.appendChild(placeholder);
        }
        setValue(environment, 'fhSegPautaActualOtro', '');
        var grid = byId(environment, 'fhSegTratamientoGrid');
        if (grid) while (grid.firstChild) grid.removeChild(grid.firstChild);
    }

    function appendSummaryField(environment, grid, label, value) {
        var field = environment.document.createElement('div');
        field.className = 'info-field';
        var key = environment.document.createElement('span');
        key.className = 'info-field__label';
        key.textContent = label;
        var data = environment.document.createElement('span');
        data.className = 'info-field__value';
        data.textContent = text(value) || 'No informado';
        field.appendChild(key);
        field.appendChild(data);
        grid.appendChild(field);
    }

    function projectLine(environment, result) {
        clearProjection(environment);
        if (!result.ok || !result.line) return;
        var line = result.line;
        setValue(environment, 'fhSegFarmaco', line.drug_name);
        setValue(environment, 'fhSegPrincipioActivo', line.active_ingredient);
        setValue(environment, 'fhSegPresentacion', line.presentation);
        setValue(environment, 'fhSegDosisActual', line.dose_text);
        setValue(environment, 'fhSegVia', line.route);
        setValue(environment, 'fhSegFechaInicio', line.start_date);
        setValue(environment, 'fhSegEstadoLinea', line.status);
        setSelectExact(environment, 'fhSegTipoRelacionTerapia', line.relationship);
        var pautaValue = line.pauta_codigo || line.pauta_label || line.pauta_otro_texto;
        var pautaLabel = line.pauta_label || line.pauta_otro_texto || line.pauta_codigo;
        var pauta = byId(environment, 'fhSegPautaActual');
        if (pauta && pautaValue) {
            var option = environment.document.createElement('option');
            option.value = pautaValue;
            option.textContent = pautaLabel;
            pauta.appendChild(option);
            pauta.value = pautaValue;
        }
        var grid = byId(environment, 'fhSegTratamientoGrid');
        if (grid) {
            appendSummaryField(environment, grid, 'Fármaco', line.drug_name);
            appendSummaryField(environment, grid, 'Principio activo', line.active_ingredient);
            appendSummaryField(environment, grid, 'Dosis', line.dose_text);
            appendSummaryField(environment, grid, 'Presentación', line.presentation);
            appendSummaryField(environment, grid, 'Vía', line.route);
            appendSummaryField(environment, grid, 'Pauta', pautaLabel);
            appendSummaryField(environment, grid, 'Fecha de inicio', line.start_date);
        }
    }

    function rebuildSelector(environment, result) {
        var select = byId(environment, 'fhSegLineaPrincipal');
        if (!select) return;
        while (select.firstChild) select.removeChild(select.firstChild);
        var placeholder = environment.document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Seleccione una línea activa…';
        select.appendChild(placeholder);
        (result.lines || []).forEach(function (line) {
            var option = environment.document.createElement('option');
            option.value = line.line_id;
            option.textContent = (line.drug_name || 'No informado') + ' · ' + (line.relationship || 'No informado') + ' · ' + (line.status || 'No informado');
            option.disabled = line.status !== 'active';
            if (option.disabled) option.setAttribute('aria-disabled', 'true');
            select.appendChild(option);
        });
        select.value = result.ok ? result.line_id : '';
        select.disabled = !(result.lines && result.lines.length);
        select.setAttribute('aria-disabled', select.disabled ? 'true' : 'false');
    }

    function applySafetyGate(environment) {
        var document = environment.document;
        if (!document) return;
        OUTPUT_IDS.forEach(function (id) {
            var button = byId(environment, id);
            if (!button) return;
            button.disabled = true;
            button.setAttribute('aria-disabled', 'true');
            button.setAttribute('title', SAFETY_MESSAGE);
        });
        Array.prototype.forEach.call(document.querySelectorAll('main section.dashboard-card'), function (section) {
            if (section.id === 'fhSegCanonicalContext' || section.id === 'modTratamientoPrincipal') return;
            section.inert = true;
            section.setAttribute('aria-disabled', 'true');
            Array.prototype.forEach.call(section.querySelectorAll('input, select, textarea, button'), function (control) {
                control.disabled = true;
                control.setAttribute('aria-disabled', 'true');
            });
        });
        var treatment = byId(environment, 'modTratamientoPrincipal');
        if (treatment) Array.prototype.forEach.call(treatment.querySelectorAll('input, select, textarea, button'), function (control) {
            if (USABLE_IDS.indexOf(control.id) !== -1) return;
            control.disabled = true;
            control.setAttribute('aria-disabled', 'true');
            if ('readOnly' in control) control.readOnly = true;
        });
        USABLE_IDS.forEach(function (id) {
            var control = byId(environment, id);
            if (!control) return;
            if (id !== 'fhSegLineaPrincipal') control.disabled = false;
            control.setAttribute('aria-disabled', control.disabled ? 'true' : 'false');
        });
        var autocomplete = byId(environment, 'fhSegAutocompleteBlock');
        if (autocomplete) {
            autocomplete.classList.add('hidden');
            autocomplete.setAttribute('aria-hidden', 'true');
        }
        var notice = byId(environment, 'fhSegDemoNotice');
        if (notice) notice.textContent = SAFETY_MESSAGE;
    }

    function installOutputGuards(environment) {
        var env = environment || root;
        var existing = env.__farmaciaFollowupOutputGuardV4;
        if (existing && existing.installed) return existing;
        var guard = { installed: true };

        function protect(target, key) {
            if (!target || typeof target[key] !== 'function') return;
            var original = target[key];
            if (original.__farmaciaFollowupBlockedV4) return;
            var replacement = function () { return false; };
            replacement.__farmaciaFollowupBlockedV4 = true;
            target[key] = replacement;
        }

        protect(env.FarmaciaDemo, 'copyTextToClipboard');
        protect(env.FarmaciaDemo, 'downloadFile');
        protect(env.FarmaciaExcelRowExport, 'copyTSVRowToClipboard');
        env.__farmaciaFollowupOutputGuardV4 = guard;
        return guard;
    }

    function applyResult(environment, result) {
        var card = byId(environment, 'fhSegCanonicalContext');
        var status = byId(environment, 'fhSegCanonicalStatus');
        if (card) {
            card.setAttribute('data-context-state', result.ok ? 'ready' : 'blocked');
            card.setAttribute('data-patient-id', result.patient_id || '');
            card.setAttribute('data-line-id', result.line_id || '');
        }
        if (status) {
            status.textContent = result.message;
            status.setAttribute('data-status-code', result.code);
        }
        setDisplayText(environment, 'fhSegCanonicalPatientId', result.patient_id);
        setDisplayText(environment, 'fhSegCanonicalLineId', result.line_id);
        setDisplayText(environment, 'fhSegCanonicalLineStatus', result.line && result.line.status);
        setDisplayText(environment, 'fhSegCanonicalRelationship', result.line && result.line.relationship);
        setDisplayText(environment, 'fhSegCanonicalProvenance', result.line && (result.line.provenance + ' · ' + result.source));
        if (result.person && result.person.cip) setValue(environment, 'fhSegCip', result.person.cip);
        setSelectExact(environment, 'fhSegServicio', result.person && result.person.service);
        setSelectExact(environment, 'fhSegPatologia', result.person && result.person.pathology);
        rebuildSelector(environment, result);
        projectLine(environment, result);
        applySafetyGate(environment);
        environment.__farmaciaFollowupContextV4 = result;
        return result;
    }

    function render(environment, options) {
        var env = environment || root;
        var result = resolveCanonicalContext({
            identity: (options && options.identity) || readIdentity(env.location && env.location.search),
            allowSoleActive: !!(options && options.allowSoleActive),
            core: env.FarmaciaMultitreatmentCore,
            storage: env.sessionStorage,
            dataSource: env.FarmaciaDataSource,
            demo: env.FarmaciaDemo
        });
        return applyResult(env, result);
    }

    function replaceIdentityUrl(environment, identity) {
        var env = environment || root;
        if (!env.history || !env.location || !env.URL) return '';
        var url = new env.URL(env.location.href);
        url.searchParams.delete('id');
        if (identity.cip) url.searchParams.set('cip', identity.cip); else url.searchParams.delete('cip');
        if (identity.patient_id) url.searchParams.set('patient_id', identity.patient_id); else url.searchParams.delete('patient_id');
        if (identity.line_id) url.searchParams.set('line_id', identity.line_id); else url.searchParams.delete('line_id');
        url.searchParams.set('entrada', 'seguimiento');
        env.history.replaceState({}, '', url.toString());
        return url.toString();
    }

    function resolveCipSearch(options) {
        var source = options || {};
        var cip = text(source.cip).toUpperCase();
        var demoPatient = findDemoPatientByCip(source.demo, cip);
        var sourcePerson = source.dataSource && typeof source.dataSource.findPersonByCip === 'function'
            ? source.dataSource.findPersonByCip(cip) : null;
        var demoPatientId = text(demoPatient && demoPatient.patient_id);
        var sourcePatientId = text(sourcePerson && sourcePerson.patient_id);

        if (demoPatientId && sourcePatientId && demoPatientId !== sourcePatientId) {
            return blocked('PATIENT_MISMATCH', 'El CIP resuelve a identidades de paciente incompatibles entre las fuentes soportadas.',
                { cip: cip, patient_id: '', line_id: '' });
        }
        var patientId = demoPatientId || sourcePatientId;
        if (!patientId) {
            return blocked('PATIENT_NOT_FOUND', 'CIP sintético no encontrado. No se crea ningún contexto manual.',
                { cip: cip, patient_id: '', line_id: '' });
        }
        return resolveCanonicalContext({
            identity: { cip: cip, patient_id: patientId, line_id: '' },
            allowSoleActive: true,
            core: source.core,
            storage: source.storage,
            dataSource: source.dataSource,
            demo: source.demo
        });
    }

    function searchCip(environment) {
        var env = environment || root;
        var cip = text(byId(env, 'fhSegCip') && byId(env, 'fhSegCip').value).toUpperCase();
        var dataSource = env.FarmaciaDataSource;
        var demo = env.FarmaciaDemo;
        var dataReady = dataSource && dataSource.ready && typeof dataSource.ready.then === 'function' ? dataSource.ready : Promise.resolve();
        var demoReady = demo && demo.ready && typeof demo.ready.then === 'function' ? demo.ready : Promise.resolve();
        return Promise.all([demoReady, dataReady]).then(function () {
            var resolved = resolveCipSearch({ cip: cip, demo: demo, dataSource: dataSource,
                core: env.FarmaciaMultitreatmentCore, storage: env.sessionStorage });
            var identity = { cip: cip, patient_id: resolved.patient_id, line_id: resolved.ok ? resolved.line_id : '' };
            replaceIdentityUrl(env, identity);
            return applyResult(env, resolved);
        });
    }

    function selectLine(environment, lineId) {
        var env = environment || root;
        var identity = readIdentity(env.location && env.location.search);
        identity.line_id = text(lineId);
        replaceIdentityUrl(env, identity);
        return render(env, { identity: identity, allowSoleActive: false });
    }

    function closest(element, selector) {
        return element && typeof element.closest === 'function' ? element.closest(selector) : null;
    }

    function absorb(event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }

    function installCapture(environment) {
        var env = environment || root;
        var document = env.document;
        if (!document || document.__farmaciaFollowupContextV4Capture) return;
        document.__farmaciaFollowupContextV4Capture = true;
        document.addEventListener('click', function (event) {
            var target = event.target;
            var output = closest(target, '#fhSegExportTxt, #fhSegExportCsv, #fhSegExcelExportBtn');
            if (output) { absorb(event); return; }
            if (closest(target, '#fhSegCipSearchBtn')) { absorb(event); searchCip(env); return; }
            var gated = closest(target, 'main section.dashboard-card');
            if (gated && gated.id !== 'fhSegCanonicalContext' && gated.id !== 'modTratamientoPrincipal') { absorb(event); return; }
            var treatmentControl = closest(target, '#modTratamientoPrincipal input, #modTratamientoPrincipal select, #modTratamientoPrincipal textarea, #modTratamientoPrincipal button');
            if (treatmentControl && USABLE_IDS.indexOf(treatmentControl.id) === -1) absorb(event);
        }, true);
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && event.target && event.target.id === 'fhSegCip') {
                absorb(event);
                searchCip(env);
            }
        }, true);
        document.addEventListener('change', function (event) {
            if (event.target && event.target.id === 'fhSegLineaPrincipal') {
                var lineId = event.target.value;
                absorb(event);
                selectLine(env, lineId);
                return;
            }
            var gated = closest(event.target, 'main section.dashboard-card');
            if (gated && gated.id !== 'fhSegCanonicalContext' && gated.id !== 'modTratamientoPrincipal') absorb(event);
        }, true);
    }

    function boot(environment) {
        var env = environment || root;
        var dataReady = env.FarmaciaDataSource && env.FarmaciaDataSource.ready && typeof env.FarmaciaDataSource.ready.then === 'function' ? env.FarmaciaDataSource.ready : Promise.resolve();
        var demoReady = env.FarmaciaDemo && env.FarmaciaDemo.ready && typeof env.FarmaciaDemo.ready.then === 'function' ? env.FarmaciaDemo.ready : Promise.resolve();
        var sequence = ++renderSequence;
        return Promise.all([dataReady, demoReady]).then(function () {
            if (sequence !== renderSequence) return env.__farmaciaFollowupContextV4;
            installOutputGuards(env);
            var result = render(env);
            [0, 50, 250].forEach(function (delay) {
                env.setTimeout(function () { if (sequence === renderSequence) render(env); }, delay);
            });
            return result;
        });
    }

    if (root.document) {
        if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', function () { boot(root); }, { once: true });
        else boot(root);
    }

    return {
        STORE_KEY: STORE_KEY,
        SAFETY_MESSAGE: SAFETY_MESSAGE,
        readIdentity: readIdentity,
        normalizeSourceLine: normalizeSourceLine,
        readHubState: readHubState,
        resolveCanonicalContext: resolveCanonicalContext,
        resolveCipSearch: resolveCipSearch,
        replaceIdentityUrl: replaceIdentityUrl,
        render: render,
        searchCip: searchCip,
        selectLine: selectLine,
        applySafetyGate: applySafetyGate,
        installOutputGuards: installOutputGuards,
        installCapture: installCapture,
        boot: boot
    };
});
