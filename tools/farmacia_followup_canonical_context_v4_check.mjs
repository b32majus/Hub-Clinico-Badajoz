#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = require(path.join(ROOT, 'scripts/farmacia_multitreatment_core.js'));
const adapter = require(path.join(ROOT, 'scripts/farmacia_followup_context_v4.js'));
const runtime = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/demo/farmacia/farmacia_v4_runtime_v1.json'), 'utf8'));
const sourceText = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_followup_context_v4.js'), 'utf8');
const dataSourceText = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_data_source_v4_core.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'farmacia_seguimiento.html'), 'utf8');

let passed = 0;
function test(name, run) {
    run();
    passed += 1;
    console.log(`ok ${passed} - ${name}`);
}

function memoryStorage(initial) {
    const data = new Map(initial ? [[adapter.STORE_KEY, initial]] : []);
    return {
        getItem(key) { return data.has(key) ? data.get(key) : null; },
        setItem(key, value) { data.set(key, String(value)); },
        removeItem(key) { data.delete(key); }
    };
}

const dataSource = {
    getPersons: () => runtime.persons.slice(),
    findPersonById: (patientId) => runtime.persons.find((person) => person.patient_id === patientId) || null,
    findPersonByCip: (cip) => runtime.persons.find((person) => person.cip.toUpperCase() === String(cip).toUpperCase()) || null,
    getCanonicalLinesByPatientId: (patientId) => runtime.treatment_lines.filter((line) => line.patient_id === patientId)
};

function identity(scenario, lineId = '') {
    const person = runtime.persons.find((item) => item.scenario_id === scenario);
    return { patient_id: person.patient_id, line_id: lineId, cip: person.cip };
}

function sourceResolve(scenario, lineId = '', allowSoleActive = false) {
    return adapter.resolveCanonicalContext({ identity: identity(scenario, lineId), dataSource, core, storage: memoryStorage(), allowSoleActive });
}

let idSeq = 0;
function idFactory(prefix) { idSeq += 1; return `${prefix}followup_check_${idSeq}`; }

function buildHub(active = true) {
    const storage = memoryStorage();
    const store = core.createSessionStore(storage);
    const patientId = 'fhv4-check-hub-patient';
    let state = core.createEmptySessionState();
    const request = core.createTreatmentRequest({
        patient_id: patientId, request_type: 'new_start', origin: 'manual_fh_capture', requested_at: '',
        professional_demo_id: 'Profesional FH-01', drug: { drug_name: 'Fármaco sintético', active_ingredient: '', catalog_identity: {}, catalog_snapshot: {} },
        therapy: {}, observations: '', created_at: '', updated_at: ''
    }, { idFactory });
    state = store.upsertRequest(state, patientId, request);
    const validation = core.createValidationAct({
        patient_id: patientId, request_id: request.request_id, produced_line_id: '', performed_at: '', result: 'validated',
        professional_demo_id: 'Profesional FH-01', observations: '', origin: 'manual_fh_capture', created_at: ''
    }, { idFactory });
    state = store.upsertValidationAct(state, patientId, validation);
    const line = core.createTreatmentLineFromValidatedRequest(request, validation, {
        relationship: 'primary', drug_name: 'Fármaco sintético', active_ingredient: '', dose_text: '', presentation: '', route: '',
        pauta_codigo: '', pauta_label: '', pauta_otro_texto: '', start_date: '', end_date: '', created_at: '', updated_at: ''
    }, { idFactory, existingLines: [] });
    state = store.upsertLine(state, patientId, line);
    state = store.upsertValidationAct(state, patientId, { ...validation, produced_line_id: line.line_id });
    store.save(state);
    if (active) core.confirmTreatmentStart({ store, patient_id: patientId, line_id: line.line_id, start_date: '2026-07-26',
        declared_by_demo: 'Profesional FH-01', created_at: '2026-07-26T08:00:00.000Z' }, { idFactory });
    return { storage, store, patientId, lineId: line.line_id };
}

function buildHubGraph(definitions) {
    const storage = memoryStorage();
    const store = core.createSessionStore(storage);
    const patientId = 'fhv4-check-search-hub-patient';
    let state = core.createEmptySessionState();
    const lines = [];
    for (const definition of definitions) {
        const request = core.createTreatmentRequest({
            patient_id: patientId, request_type: 'new_start', origin: 'manual_fh_capture', requested_at: '',
            professional_demo_id: 'Profesional FH-01',
            drug: { drug_name: definition.drug, active_ingredient: '', catalog_identity: {}, catalog_snapshot: {} },
            therapy: {}, observations: '', created_at: '', updated_at: ''
        }, { idFactory });
        state = store.upsertRequest(state, patientId, request);
        const validation = core.createValidationAct({
            patient_id: patientId, request_id: request.request_id, produced_line_id: '', performed_at: '', result: 'validated',
            professional_demo_id: 'Profesional FH-01', observations: '', origin: 'manual_fh_capture', created_at: ''
        }, { idFactory });
        state = store.upsertValidationAct(state, patientId, validation);
        const line = core.createTreatmentLineFromValidatedRequest(request, validation, {
            relationship: definition.relationship, drug_name: definition.drug, active_ingredient: '', dose_text: definition.dose || '',
            presentation: '', route: '', pauta_codigo: '', pauta_label: '', pauta_otro_texto: '', start_date: '', end_date: '',
            created_at: '', updated_at: ''
        }, { idFactory, existingLines: Object.values(state.patients[patientId]?.lines || {}) });
        state = store.upsertLine(state, patientId, line);
        state = store.upsertValidationAct(state, patientId, { ...validation, produced_line_id: line.line_id });
        lines.push({ line, active: definition.active });
    }
    store.save(state);
    for (const item of lines.filter((item) => item.active)) {
        core.confirmTreatmentStart({ store, patient_id: patientId, line_id: item.line.line_id, start_date: '2026-07-26',
            declared_by_demo: 'Profesional FH-01', created_at: '2026-07-26T08:00:00.000Z' }, { idFactory });
    }
    return { storage, store, patientId, lineIds: lines.map((item) => item.line.line_id) };
}

function permissiveCore(storage) {
    return {
        createSessionStore: () => ({ load: () => JSON.parse(storage.getItem(adapter.STORE_KEY)) })
    };
}

test('missing patient_id blocks', () => {
    assert.equal(adapter.resolveCanonicalContext({ identity: {}, dataSource, core, storage: memoryStorage() }).code, 'PATIENT_NOT_FOUND');
});

test('nonexistent patient blocks', () => {
    assert.equal(adapter.resolveCanonicalContext({ identity: { patient_id: 'missing', line_id: 'missing' }, dataSource, core, storage: memoryStorage() }).code, 'PATIENT_NOT_FOUND');
});

test('line belonging to another patient blocks', () => {
    assert.equal(sourceResolve('S09', 'fhv4-line-s10-active').code, 'PATIENT_MISMATCH');
});

test('nonexistent line blocks', () => {
    assert.equal(sourceResolve('S09', 'fhv4-line-does-not-exist').code, 'LINE_NOT_FOUND');
});

test('validated_not_started blocks', () => {
    const hub = buildHub(false);
    assert.equal(adapter.resolveCanonicalContext({ identity: { patient_id: hub.patientId, line_id: hub.lineId }, core, storage: hub.storage, dataSource }).code, 'LINE_NOT_ACTIVE');
});

test('exact historical line remains visible but noneligible', () => {
    const result = sourceResolve('S10', 'fhv4-line-s10-historical');
    assert.equal(result.code, 'LINE_NOT_ACTIVE');
    assert.equal(result.lines.find((line) => line.line_id === 'fhv4-line-s10-historical').status, 'historical');
});

test('S09 sole active is selected only in supported search flow', () => {
    const result = sourceResolve('S09', '', true);
    assert.equal(result.code, 'CANONICAL_ACTIVE_CONTEXT_READY');
    assert.equal(result.line_id, 'fhv4-line-s09');
});

test('S10 historical plus active selects only exact sole active', () => {
    const result = sourceResolve('S10', '', true);
    assert.equal(result.line_id, 'fhv4-line-s10-active');
    assert.equal(result.lines.length, 2);
});

test('S11 never auto-selects without line_id', () => {
    assert.equal(sourceResolve('S11', '', true).code, 'SELECTION_REQUIRED');
});

test('S11 both active lines are explicitly selectable', () => {
    for (const lineId of ['fhv4-line-s11-primary', 'fhv4-line-s11-additional']) {
        const result = sourceResolve('S11', lineId);
        assert.equal(result.ok, true);
        assert.equal(result.line_id, lineId);
    }
});

test('S11 historical line is represented as disabled selector data', () => {
    const result = sourceResolve('S11', 'fhv4-line-s11-historical');
    assert.equal(result.code, 'LINE_NOT_ACTIVE');
    assert.equal(result.lines.find((line) => line.line_id === 'fhv4-line-s11-historical').status, 'historical');
    assert.match(sourceText, /option\.disabled = line\.status !== 'active'/);
});

test('selection contains no first-position, name, primary or DOM decision', () => {
    assert.doesNotMatch(sourceText, /lines\s*\[\s*0\s*\]/);
    assert.doesNotMatch(sourceText, /es_principal|getCurrentSelectedLine|patient\.biologicos|drug_name\s*===/);
    const quickIdentity = dataSourceText.slice(dataSourceText.indexOf('function followupActionIdentity'), dataSourceText.indexOf('function visiblePatient'));
    assert.doesNotMatch(quickIdentity, /\[\s*0\s*\]|relationship|es_principal|drug_name/);
});

test('canonical IDs are preserved unchanged', () => {
    const result = sourceResolve('S11', 'fhv4-line-s11-additional');
    assert.equal(result.patient_id, 'fhv4-patient-s11');
    assert.equal(result.line_id, 'fhv4-line-s11-additional');
});

test('missing therapy remains empty', () => {
    const result = sourceResolve('S09', 'fhv4-line-s09');
    assert.equal(result.line.active_ingredient, '');
    assert.equal(result.line.dose_text, '');
    assert.equal(result.line.presentation, '');
    assert.equal(result.line.route, '');
    assert.equal(result.line.pauta_label, '');
});

test('Hub request-validation-line-start graph resolves coherently', () => {
    const hub = buildHub(true);
    const result = adapter.resolveCanonicalContext({ identity: { patient_id: hub.patientId, line_id: hub.lineId }, core, storage: hub.storage, dataSource });
    assert.equal(result.code, 'CANONICAL_ACTIVE_CONTEXT_READY');
    assert.equal(result.start_movement.effective_at, result.line.start_date);
    assert.equal(result.validation_act.produced_line_id, result.line_id);
});

test('duplicate Hub start blocks', () => {
    const hub = buildHub(true);
    const raw = JSON.parse(hub.storage.getItem(adapter.STORE_KEY));
    const patient = raw.patients[hub.patientId];
    const original = Object.values(patient.movements)[0];
    patient.movements.mov_duplicate = { ...original, movement_id: 'mov_duplicate' };
    hub.storage.setItem(adapter.STORE_KEY, JSON.stringify(raw));
    const result = adapter.resolveCanonicalContext({ identity: { patient_id: hub.patientId, line_id: hub.lineId }, core: permissiveCore(hub.storage), storage: hub.storage });
    assert.equal(result.code, 'HUB_START_INCOHERENT');
});

test('Hub start date mismatch blocks', () => {
    const hub = buildHub(true);
    const raw = JSON.parse(hub.storage.getItem(adapter.STORE_KEY));
    Object.values(raw.patients[hub.patientId].movements)[0].effective_at = '2026-07-25';
    hub.storage.setItem(adapter.STORE_KEY, JSON.stringify(raw));
    const result = adapter.resolveCanonicalContext({ identity: { patient_id: hub.patientId, line_id: hub.lineId }, core: permissiveCore(hub.storage), storage: hub.storage });
    assert.equal(result.code, 'HUB_START_INCOHERENT');
});

test('selector writes exact patient_id and line_id URL', () => {
    const environment = {
        URL, location: { href: 'http://example.test/farmacia_seguimiento.html?cip=FH-V4-0011' },
        history: { replaceState(_state, _title, href) { environment.location.href = href; } }
    };
    adapter.replaceIdentityUrl(environment, identity('S11', 'fhv4-line-s11-additional'));
    const url = new URL(environment.location.href);
    assert.equal(url.searchParams.get('patient_id'), 'fhv4-patient-s11');
    assert.equal(url.searchParams.get('line_id'), 'fhv4-line-s11-additional');
});

test('multi-active CIP flow requires explicit selection', () => {
    assert.equal(sourceResolve('S11', '', true).code, 'SELECTION_REQUIRED');
});

test('unknown CIP remains neutral and cannot create context', () => {
    assert.equal(dataSource.findPersonByCip('UNKNOWN-CIP'), null);
    assert.match(sourceText, /No se crea ningún contexto manual/);
});

test('outputs stay blocked even when canonical context is ready', () => {
    for (const id of ['fhSegExportTxt', 'fhSegExportCsv', 'fhSegExcelExportBtn']) {
        assert.match(sourceText, new RegExp(id));
    }
    assert.match(sourceText, /button\.disabled = true/);
    assert.match(sourceText, /document\.addEventListener\('click'[\s\S]*#fhSegExportTxt, #fhSegExportCsv, #fhSegExcelExportBtn/);
    assert.match(html, new RegExp(adapter.SAFETY_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('all clinical write modules are inert while CIP and selector remain usable', () => {
    assert.match(sourceText, /section\.inert = true/);
    assert.match(sourceText, /USABLE_IDS = \['fhSegCip', 'fhSegCipSearchBtn', 'fhSegLineaPrincipal'\]/);
    assert.match(sourceText, /control\.disabled = true/);
});

test('reload of exact URL restores exact active identity', () => {
    const parsed = adapter.readIdentity('?cip=FH-V4-0011&patient_id=fhv4-patient-s11&line_id=fhv4-line-s11-additional');
    const result = adapter.resolveCanonicalContext({ identity: parsed, dataSource, core, storage: memoryStorage() });
    assert.equal(result.code, 'CANONICAL_ACTIVE_CONTEXT_READY');
    assert.equal(result.patient_id, parsed.patient_id);
    assert.equal(result.line_id, parsed.line_id);
});

test('pre-Hub supplied CIP must exactly match canonical person', () => {
    const result = adapter.resolveCanonicalContext({
        identity: { patient_id: 'fhv4-patient-s09', line_id: 'fhv4-line-s09', cip: 'FH-V4-0010' },
        dataSource, core, storage: memoryStorage()
    });
    assert.equal(result.code, 'PATIENT_MISMATCH');
});

test('Hub supplied CIP blocks when demo resolves it to another patient', () => {
    const hub = buildHub(true);
    const result = adapter.resolveCanonicalContext({
        identity: { patient_id: hub.patientId, line_id: hub.lineId, cip: 'IMPORTED-CIP' }, core, storage: hub.storage,
        demo: { findPatientByCip: () => ({ patient_id: 'another-patient', cip: 'IMPORTED-CIP' }) }
    });
    assert.equal(result.code, 'PATIENT_MISMATCH');
});

test('Hub supplied CIP preserves supported imported mapping for same patient', () => {
    const hub = buildHub(true);
    const result = adapter.resolveCanonicalContext({
        identity: { patient_id: hub.patientId, line_id: hub.lineId, cip: 'IMPORTED-CIP' }, core, storage: hub.storage,
        demo: { findPatientByCip: () => ({ patient_id: hub.patientId, cip: 'IMPORTED-CIP' }) }
    });
    assert.equal(result.code, 'CANONICAL_ACTIVE_CONTEXT_READY');
});

test('Hub supplied unknown CIP fails closed', () => {
    const hub = buildHub(true);
    const result = adapter.resolveCanonicalContext({
        identity: { patient_id: hub.patientId, line_id: hub.lineId, cip: 'UNKNOWN-HUB-CIP' }, core, storage: hub.storage,
        demo: { findPatientByCip: () => null }
    });
    assert.equal(result.code, 'PATIENT_MISMATCH');
});

test('page-local output gate is idempotent and preserves global helper identities', () => {
    const effects = { copy: 0, download: 0, excel: 0 };
    const environment = {
        FarmaciaDemo: {
            copyTextToClipboard() { effects.copy += 1; },
            downloadFile() { effects.download += 1; }
        },
        FarmaciaExcelRowExport: { copyTSVRowToClipboard() { effects.excel += 1; } }
    };
    const first = adapter.installOutputGuards(environment);
    const originalCopy = environment.FarmaciaDemo.copyTextToClipboard;
    const originalDownload = environment.FarmaciaDemo.downloadFile;
    const originalExcel = environment.FarmaciaExcelRowExport.copyTSVRowToClipboard;
    const second = adapter.installOutputGuards(environment);
    assert.equal(first, second);
    assert.equal(environment.FarmaciaDemo.copyTextToClipboard, originalCopy);
    assert.equal(environment.FarmaciaDemo.downloadFile, originalDownload);
    assert.equal(environment.FarmaciaExcelRowExport.copyTSVRowToClipboard, originalExcel);
    assert.deepEqual(effects, { copy: 0, download: 0, excel: 0 });
    assert.equal(first.helpersPreserved, true);
    assert.equal(adapter.restoreOutputGuards, undefined);
    assert.equal(sourceText.includes('restoreOutputGuards'), false);
});

test('started Hub patient CIP search returns the same canonical patient and line', () => {
    const hub = buildHubGraph([{ relationship: 'primary', drug: 'Canonical Hub drug', active: true }]);
    const result = adapter.resolveCipSearch({
        cip: 'HUB-SEARCH-CIP', core, storage: hub.storage, dataSource,
        demo: { findPatientByCip: () => ({ patient_id: hub.patientId, cip: 'HUB-SEARCH-CIP' }) }
    });
    assert.equal(result.code, 'CANONICAL_ACTIVE_CONTEXT_READY');
    assert.equal(result.patient_id, hub.patientId);
    assert.equal(result.line_id, hub.lineIds[0]);
});

test('CIP identity search never consumes poison therapy from FarmaciaDemo', () => {
    const hub = buildHubGraph([{ relationship: 'primary', drug: 'Canonical Hub drug', dose: 'Canonical dose', active: true }]);
    const result = adapter.resolveCipSearch({
        cip: 'HUB-POISON-CIP', core, storage: hub.storage, dataSource,
        demo: { findPatientByCip: () => ({ patient_id: hub.patientId, cip: 'HUB-POISON-CIP', marcaComercial: 'POISON',
            dosis: 'POISON', via: 'POISON', pauta: 'POISON', presentation: 'POISON', biologicos: [{ drug_name: 'POISON' }] }) }
    });
    assert.equal(result.line.drug_name, 'Canonical Hub drug');
    assert.equal(result.line.dose_text, 'Canonical dose');
    assert.notEqual(result.line.drug_name, 'POISON');
});

test('Demo and DataSource conflicting CIP identities fail closed with cleared canonical IDs', () => {
    const result = adapter.resolveCipSearch({
        cip: 'CONFLICT-CIP', core, storage: memoryStorage(),
        demo: { findPatientByCip: () => ({ patient_id: 'demo-patient' }) },
        dataSource: { findPersonByCip: () => ({ patient_id: 'source-patient' }) }
    });
    assert.equal(result.code, 'PATIENT_MISMATCH');
    assert.equal(result.patient_id, '');
    assert.equal(result.line_id, '');
    const environment = {
        URL, location: { href: 'http://example.test/farmacia_seguimiento.html?patient_id=stale&line_id=stale' },
        history: { replaceState(_state, _title, href) { environment.location.href = href; } }
    };
    adapter.replaceIdentityUrl(environment, { cip: 'CONFLICT-CIP', patient_id: result.patient_id, line_id: result.line_id });
    const replaced = new URL(environment.location.href);
    assert.equal(replaced.searchParams.has('patient_id'), false);
    assert.equal(replaced.searchParams.has('line_id'), false);
});

test('Hub CIP search resolves exactly one coherent active line', () => {
    const hub = buildHubGraph([{ relationship: 'primary', drug: 'Only active', active: true }]);
    const result = adapter.resolveCipSearch({ cip: 'ONE-ACTIVE-CIP', core, storage: hub.storage, dataSource,
        demo: { findPatientByCip: () => ({ patient_id: hub.patientId }) } });
    assert.equal(result.code, 'CANONICAL_ACTIVE_CONTEXT_READY');
    assert.equal(result.line_id, hub.lineIds[0]);
});

test('Hub CIP search with two coherent active lines requires selection', () => {
    const hub = buildHubGraph([
        { relationship: 'primary', drug: 'Primary active', active: true },
        { relationship: 'additional', drug: 'Additional active', active: true }
    ]);
    const result = adapter.resolveCipSearch({ cip: 'TWO-ACTIVE-CIP', core, storage: hub.storage, dataSource,
        demo: { findPatientByCip: () => ({ patient_id: hub.patientId }) } });
    assert.equal(result.code, 'SELECTION_REQUIRED');
    assert.equal(result.patient_id, hub.patientId);
    assert.equal(result.line_id, '');
});

test('Hub CIP search with nonactive lines remains blocked', () => {
    const hub = buildHubGraph([{ relationship: 'primary', drug: 'Not started', active: false }]);
    const result = adapter.resolveCipSearch({ cip: 'NONACTIVE-CIP', core, storage: hub.storage, dataSource,
        demo: { findPatientByCip: () => ({ patient_id: hub.patientId }) } });
    assert.equal(result.code, 'SELECTION_REQUIRED');
    assert.equal(result.ok, false);
});

test('pure CIP identity search keeps unknown CIP neutral', () => {
    const result = adapter.resolveCipSearch({ cip: 'UNKNOWN-CIP', core, storage: memoryStorage(),
        demo: { findPatientByCip: () => null }, dataSource: { findPersonByCip: () => null } });
    assert.equal(result.code, 'PATIENT_NOT_FOUND');
    assert.equal(result.patient_id, '');
    assert.equal(result.line_id, '');
});

assert.equal(passed, 35);
assert.match(html, /id="fhSegCanonicalContext"/);
assert.ok(html.indexOf('scripts/farmacia_multitreatment_core.js?v=20260726-followup-context-v4-01') < html.indexOf('scripts/farmacia_seguimiento.js?v=20260726-followup-context-v4-legacy'));
assert.ok(html.indexOf('scripts/farmacia_seguimiento.js?v=20260726-followup-context-v4-legacy') < html.indexOf('scripts/farmacia_followup_context_v4.js?v=20260726-followup-context-v4-01'));
assert.match(dataSourceText, /patient_id=' \+ encodeURIComponent\(followupIdentity\.patient_id\)/);
assert.match(dataSourceText, /if \(followupIdentity\.line_id\) expectedHref \+= '&line_id='/);
console.log('farmacia_followup_canonical_context_v4_check: PASSED_35_CANONICAL_IDENTITY_SEARCH_CONTEXT_GATE_AND_HELPER_IDENTITY_CASES');
