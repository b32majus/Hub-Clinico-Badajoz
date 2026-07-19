#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'farmacia_validacion.html'), 'utf8');
const validationSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_validacion.js'), 'utf8');
const coreSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_multitreatment_core.js'), 'utf8');
const marker = '    document.addEventListener("DOMContentLoaded", function () {';
const instrumented = validationSource.replace(marker, `    window.FarmaciaValidationHubRegistrationCheck = {
        register: registerValidationInHub,
        recognize: recognizeCurrentHubRegistration,
        requestedInput: requestedRegistrationInput,
        lineInput: lineRegistrationInput,
        contextMatches: catalogSnapshotContextMatches
    };\n\n${marker}`);
const CANONICAL_KEY = 'farmaciaDemo.multitreatment.v1';
const CATALOG_KEY = 'farmacia_drug_snapshot';

let passed = 0;
function test(label, operation) {
    operation();
    passed += 1;
    console.log(`  ✓ ${label}`);
}

function makeStorage(seed) {
    const values = seed || new Map();
    return {
        values,
        operations: [],
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { this.operations.push({ type: 'set', key }); values.set(key, String(value)); },
        removeItem(key) { this.operations.push({ type: 'remove', key }); values.delete(key); },
        canonicalWrites() { return this.operations.filter((item) => item.type === 'set' && item.key === CANONICAL_KEY).length; }
    };
}

function eventTarget(target) {
    const listeners = new Map();
    target.addEventListener = (type, listener) => {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(listener);
    };
    target.dispatchEvent = (event) => {
        const dispatched = typeof event === 'string' ? { type: event } : event;
        if (!dispatched.target) dispatched.target = target;
        if (!dispatched.preventDefault) dispatched.preventDefault = () => {};
        for (const listener of listeners.get(dispatched.type) || []) listener.call(target, dispatched);
        return true;
    };
    target.listenerCount = (type) => (listeners.get(type) || []).length;
    return target;
}

function makeClassList() {
    const values = new Set();
    return {
        add(...tokens) { tokens.forEach((token) => values.add(token)); },
        remove(...tokens) { tokens.forEach((token) => values.delete(token)); },
        contains(token) { return values.has(token); },
        toggle(token, force) {
            const add = force === undefined ? !values.has(token) : !!force;
            if (add) values.add(token); else values.delete(token);
            return add;
        }
    };
}

function makeElement(tag = 'div') {
    const attributes = new Map();
    const element = eventTarget({
        tagName: String(tag).toUpperCase(), id: '', value: '', textContent: '', checked: false,
        disabled: false, options: [], children: [], selectedIndex: 0, classList: makeClassList(),
        appendChild(child) {
            this.children.push(child);
            if (this.tagName === 'SELECT' && child.tagName === 'OPTION') this.options.push(child);
            return child;
        },
        querySelector() { return null; }, querySelectorAll() { return []; }, contains() { return false; },
        setAttribute(name, value) { attributes.set(name, String(value)); },
        getAttribute(name) { return attributes.get(name) || null; },
        removeAttribute(name) { attributes.delete(name); },
        focus() {}, select() {},
        click() { this.dispatchEvent({ type: 'click', target: this, preventDefault() {} }); }
    });
    return element;
}

function makeHarness({ storage = makeStorage(), failAt = '', queryContext = {} } = {}) {
    const elements = {};
    const tagById = {
        fhOrigenEntrada: 'select', fhTipoValidacion: 'select', fhServicioManual: 'select', fhPatologiaManual: 'select',
        fhManualVia: 'select', fhManualPauta: 'select', fhManualInduccion: 'select', fhDermaPatologia: 'select',
        fhDermaVia: 'select', fhDermaPauta: 'select', fhDermaInduccion: 'select', fhValidadoVia: 'select',
        fhValidadoPauta: 'select', fhValidadoInduccion: 'select', fhValEstado: 'select'
    };
    const ensure = (id) => {
        if (!elements[id]) {
            elements[id] = makeElement(tagById[id] || 'div');
            elements[id].id = id;
        }
        return elements[id];
    };
    const document = eventTarget({
        activeElement: null,
        getElementById(id) { return ensure(id); },
        querySelectorAll(selector) { return selector === '[data-chip-target]' ? [] : []; },
        querySelector() { return null; },
        createElement(tag) { return makeElement(tag); },
        createTextNode(text) { return { tagName: '#TEXT', textContent: text }; },
        execCommand() { return true; },
        body: { appendChild() {} }, head: { appendChild() {} }
    });
    const catalog = {
        loaded: false, selectedSnapshot: null,
        getSnapshot() { return this.selectedSnapshot; },
        search() { return []; }, selectDrug() {}
    };
    const output = { jara: 0, csv: 0, wo8: 0 };
    const F = {
        whenReady(callback) { callback(); },
        clearChildren(element) { element.children = []; element.options = []; },
        getQueryContext() { return queryContext; },
        setValue(id, value) { ensure(id).value = value === undefined || value === null ? '' : String(value); },
        isEnfermeriaPatient(patient) { return !!(patient && patient._isEnfermeria); },
        copyTextToClipboard() { output.jara += 1; return true; },
        downloadFile() { output.csv += 1; return true; }
    };
    const window = {
        sessionStorage: storage,
        FarmaciaDemo: F,
        FarmaciaCatalog: catalog,
        FarmaciaValidationModel: {
            calculateNaranjoScore() { return 0; }, categorizeNaranjo() { return 'Dudosa'; },
            categorizeKarchLasagna() { return 'No clasificable'; }
        },
        FarmaciaPautasCatalog: {
            getPautaOptions() { return [{ value: 'Q7D', label: 'Cada 7 días' }, { value: 'Q14D', label: 'Cada 14 días' }, { value: 'OTRO', label: 'Otra' }]; },
            getPautaByCodigo(code) {
                if (code === 'Q7D') return { pauta_codigo: code, pauta_label: 'Cada 7 días' };
                if (code === 'Q14D') return { pauta_codigo: code, pauta_label: 'Cada 14 días' };
                if (code === 'OTRO') return { pauta_codigo: code, pauta_label: 'Otra' };
                return null;
            },
            getLegacyPautaLabel(pauta) { return pauta ? pauta.pauta_label : ''; },
            normalizePautaLabel(value) { return value ? { pauta_codigo: value, pauta_label: value } : null; }
        },
        FarmaciaExcelRowExport: {
            buildContextFromValidacion(patient, options) { return { patient, options }; },
            buildExcelRowObject() { return {}; }, buildExcelRowArray() { return Array(61).fill(''); },
            getServiceSheetName() { return '02_REUMA'; },
            copyTSVRowToClipboard() { output.wo8 += 1; return true; }
        }
    };
    const sandbox = {
        window, document, navigator: { clipboard: null }, sessionStorage: storage, console,
        crypto: crypto.webcrypto, Uint8Array, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp,
        setTimeout(callback) { if (typeof callback === 'function') callback(); return 1; }, clearTimeout() {},
        Event: class Event { constructor(type) { this.type = type; } },
        CustomEvent: class CustomEvent { constructor(type, options) { this.type = type; this.detail = options && options.detail; } },
        alert() {}
    };
    vm.createContext(sandbox);
    vm.runInContext(coreSource, sandbox, { filename: 'farmacia_multitreatment_core.js' });
    if (failAt) {
        const core = window.FarmaciaMultitreatmentCore;
        const wrapper = Object.create(core);
        if (failAt === 'createTreatmentLineFromValidatedRequest') {
            wrapper[failAt] = function () { throw new Error(`synthetic ${failAt} failure`); };
        } else if (failAt === 'validatePatientState') {
            wrapper.validatePatientState = function () { return { valid: false, errors: ['synthetic'] }; };
        } else {
            wrapper.createSessionStore = function (target) {
                const store = core.createSessionStore(target);
                const storeWrapper = Object.create(store);
                storeWrapper[failAt] = function () { throw new Error(`synthetic ${failAt} failure`); };
                return storeWrapper;
            };
        }
        window.FarmaciaMultitreatmentCore = wrapper;
    }
    vm.runInContext(instrumented, sandbox, { filename: 'farmacia_validacion.js' });

    const set = (id, value) => { ensure(id).value = value; };
    const text = (id, value) => { ensure(id).textContent = value; };
    const state = () => {
        const raw = storage.getItem(CANONICAL_KEY);
        return raw ? JSON.parse(raw) : null;
    };
    const load = () => document.dispatchEvent({ type: 'DOMContentLoaded', target: document });
    const click = (id) => ensure(id).click();
    return { window, document, elements, catalog, storage, output, set, text, state, load, click, api: window.FarmaciaValidationHubRegistrationCheck };
}

function configureManual(h, overrides = {}) {
    const values = {
        fhOrigenEntrada: 'manual_farmacia', fhTipoValidacion: 'inicio_nuevo', fhServicioManual: 'reuma',
        fhPatologiaManual: 'AR', fhManualCip: 'DEMO-CIP-WIRE-A', fhManualFecha: '2026-07-19',
        fhManualFarmaco: 'Medicamento solicitado A', fhManualPrincipioActivo: 'Principio solicitado A',
        fhManualDosis: '10 mg explícitos', fhManualVia: 'IV', fhManualPauta: 'Q7D', fhManualPautaOtro: '',
        fhManualJustificacion: 'Justificación solicitante', fhManualObservaciones: 'Observación solicitante',
        fhValidadoFarmaco: '', fhValidadoPrincipioActivo: '', fhValidadoDosis: '', fhValidadoPresentacion: '',
        fhValidadoVia: '', fhValidadoPauta: '', fhValidadoPautaOtro: '', fhValEstado: 'pending',
        fhValMotivo: '', fhValObservaciones: 'Observación farmacoterapéutica'
    };
    Object.assign(values, overrides);
    Object.entries(values).forEach(([id, value]) => h.set(id, value));
}

function patientState(h, patientId = 'DEMO-CIP-WIRE-A') {
    return h.state().patients[patientId];
}

function clickRegister(h) {
    h.click('fhValRegisterHubBtn');
    return h.elements.fhValRegisterHubStatus.textContent;
}

function catalogSnapshot({
    id = 'catalog-A', slot = 'validacion.solicitado', patient = 'DEMO-CIP-WIRE-A', treatment = '', line = '',
    includeTreatment = true, includeLine = true, name = 'Medicamento solicitado A', active = 'Principio solicitado A'
} = {}) {
    const context = { slot, paciente_cip: patient };
    if (includeTreatment) context.tratamiento_id = treatment;
    if (includeLine) context.linea_id = line;
    return {
        snapshot_kind: 'catalog_selection', snapshot_version: 1, context,
        selected_drug_id: id, source_type: 'CIMA', nombre_snapshot: name, principio_activo_snapshot: active,
        codigo_nacional_snapshot: `CN-${id}`, nregistro_snapshot: `NR-${id}`,
        dosis_presentacion: '999 mg no usar', presentacion_snapshot: 'No usar', via_snapshot: 'Oral', pauta: 'No usar'
    };
}

test('HTML conserva módulo, textos, status accesible y orden core → Validación', () => {
    const registration = html.indexOf('id="modRegistroHub"');
    const exportBlock = html.indexOf('id="modExportacion"');
    assert.ok(registration > 0 && registration < exportBlock);
    assert.ok(html.includes('Registro estructurado en el Hub'));
    assert.ok(html.includes('Registra esta actuación en el estado demo del Hub. Validar no equivale a confirmar el inicio del tratamiento.'));
    assert.match(html, /id="fhValRegisterHubStatus"[^>]*role="status"[^>]*aria-live="polite"/);
    assert.ok(html.indexOf('scripts/farmacia_common.js') < html.indexOf('scripts/farmacia_multitreatment_core.js'));
    assert.ok(html.indexOf('scripts/farmacia_multitreatment_core.js') < html.indexOf('scripts/farmacia_validacion.js?v=20260719-validation-registration-01b'));
});

test('DOMContentLoaded/whenReady enlaza el botón real y la carga inicial no escribe', () => {
    const h = makeHarness();
    configureManual(h);
    h.load();
    assert.equal(h.elements.fhValRegisterHubBtn.listenerCount('click'), 1);
    assert.equal(h.storage.canonicalWrites(), 0);
    assert.equal(h.state(), null);
});

test('JARA, WO8 y CSV invocan sus handlers reales sin registro canónico', () => {
    const h = makeHarness();
    configureManual(h);
    h.load();
    h.click('fhValExportTxt');
    h.click('fhValExcelExportBtn');
    h.click('fhValExportCsv');
    assert.deepEqual(h.output, { jara: 1, csv: 1, wo8: 1 });
    assert.equal(h.storage.canonicalWrites(), 0);
    assert.equal(h.state(), null);
});

test('cambios reales de campos no registran ni escriben sin click del botón Hub', () => {
    const h = makeHarness();
    configureManual(h);
    h.load();
    h.set('fhManualFarmaco', 'Edición visible sin registrar');
    h.elements.fhManualFarmaco.dispatchEvent({ type: 'input', target: h.elements.fhManualFarmaco });
    h.set('fhValEstado', 'validated');
    h.elements.fhValEstado.dispatchEvent({ type: 'change', target: h.elements.fhValEstado });
    assert.equal(h.storage.canonicalWrites(), 0);
    assert.equal(h.state(), null);
});

for (const [field, message] of [
    ['fhOrigenEntrada', 'origen'], ['fhTipoValidacion', 'tipo'], ['fhManualCip', 'CIP'],
    ['fhValEstado', 'resultado'], ['fhManualFarmaco', 'fármaco']
]) {
    test(`click real bloquea ${message} ausente sin persistir`, () => {
        const h = makeHarness();
        configureManual(h);
        h.load();
        h.set(field, '');
        clickRegister(h);
        assert.equal(h.storage.canonicalWrites(), 0);
        assert.equal(h.state(), null);
    });
}

test('click real bloquea denied sin motivo', () => {
    const h = makeHarness();
    configureManual(h, { fhValEstado: 'denied', fhValMotivo: '' });
    h.load();
    clickRegister(h);
    assert.equal(h.storage.canonicalWrites(), 0);
});

test('click real bloquea switch, add-on y renovación con mensaje exacto', () => {
    for (const type of ['switch_cambio', 'addon', 'renovacion']) {
        const h = makeHarness();
        configureManual(h);
        h.load();
        h.set('fhTipoValidacion', type);
        assert.equal(clickRegister(h), 'Este tipo de validación todavía no tiene registro estructurado habilitado en la demo.');
        assert.equal(h.storage.canonicalWrites(), 0);
    }
});

test('[review #1 pass-after] pending ignora cambios validados irrelevantes para replay', () => {
    const h = makeHarness();
    configureManual(h);
    h.load();
    assert.equal(clickRegister(h), 'Solicitud y actuación pendiente registradas. No se ha creado ninguna línea de tratamiento.');
    h.set('fhValidadoFarmaco', 'Cambio irrelevante');
    h.set('fhValidadoDosis', '999 mg irrelevantes');
    assert.equal(clickRegister(h), 'Ya registrado en esta sesión');
    assert.equal(h.storage.canonicalWrites(), 1);
    const patient = patientState(h);
    assert.equal(Object.keys(patient.requests).length, 1);
    assert.equal(Object.keys(patient.validation_acts).length, 1);
    assert.equal(Object.keys(patient.lines).length, 0);
    assert.equal(Object.values(patient.validation_acts)[0].result, 'pending');
});

test('[review #1 pass-after] denied ignora cambios validados irrelevantes para replay', () => {
    const h = makeHarness();
    configureManual(h, { fhValEstado: 'denied', fhValMotivo: 'Motivo explícito' });
    h.load();
    assert.equal(clickRegister(h), 'Actuación denegada registrada. No se ha creado ninguna línea de tratamiento.');
    h.set('fhValidadoFarmaco', 'Cambio irrelevante');
    h.set('fhValidadoPauta', 'OTRO');
    h.set('fhValidadoPautaOtro', 'Cambio irrelevante');
    assert.equal(clickRegister(h), 'Ya registrado en esta sesión');
    assert.equal(h.storage.canonicalWrites(), 1);
    const patient = patientState(h);
    assert.equal(Object.keys(patient.validation_acts).length, 1);
    assert.equal(Object.keys(patient.lines).length, 0);
    assert.equal(Object.values(patient.validation_acts)[0].result, 'denied');
    assert.match(Object.values(patient.validation_acts)[0].observations, /Motivo de denegación: Motivo explícito/);
});

test('pending → validated reutiliza request y crea línea validated_not_started con precedencia campo a campo', () => {
    const h = makeHarness();
    configureManual(h);
    h.load();
    clickRegister(h);
    configureManual(h, {
        fhValEstado: 'validated', fhValidadoFarmaco: 'Medicamento validado distinto', fhValidadoPrincipioActivo: '',
        fhValidadoDosis: '20 mg validados', fhValidadoPresentacion: 'Presentación validada', fhValidadoVia: '',
        fhValidadoPauta: 'OTRO', fhValidadoPautaOtro: 'Pauta validada explícita'
    });
    assert.equal(clickRegister(h), 'Validación registrada. Línea creada como validada y pendiente de inicio.');
    const patient = patientState(h);
    const line = Object.values(patient.lines)[0];
    const validatedAct = Object.values(patient.validation_acts).find((act) => act.result === 'validated');
    assert.equal(Object.keys(patient.requests).length, 1);
    assert.equal(Object.keys(patient.validation_acts).length, 2);
    assert.equal(line.drug_name, 'Medicamento validado distinto');
    assert.equal(line.active_ingredient, 'Principio solicitado A');
    assert.equal(line.dose_text, '20 mg validados');
    assert.equal(line.presentation, 'Presentación validada');
    assert.equal(line.route, 'IV');
    assert.equal(line.pauta_codigo, 'OTRO');
    assert.equal(line.pauta_label, 'Cada 7 días');
    assert.equal(line.pauta_otro_texto, 'Pauta validada explícita');
    assert.equal(line.relationship, 'primary');
    assert.equal(line.status, 'validated_not_started');
    assert.notEqual(line.status, 'active');
    assert.equal(line.provenance, 'validated_in_hub');
    assert.equal(validatedAct.produced_line_id, line.line_id);
    assert.equal(h.storage.canonicalWrites(), 2);
});

test('pauta parcial validada vacía conserva pauta solicitada explícita sin inferencia', () => {
    const h = makeHarness();
    configureManual(h, { fhValEstado: 'validated', fhValidadoFarmaco: 'Medicamento solicitado A', fhValidadoPauta: '', fhValidadoPautaOtro: '' });
    h.load();
    clickRegister(h);
    const line = Object.values(patientState(h).lines)[0];
    assert.equal(line.pauta_codigo, 'Q7D');
    assert.equal(line.pauta_label, 'Cada 7 días');
    assert.equal(line.pauta_otro_texto, '');
});

test('pauta normalizada validada explícita precede al código solicitado sin texto inventado', () => {
    const h = makeHarness();
    configureManual(h, {
        fhValEstado: 'validated', fhValidadoFarmaco: 'Medicamento solicitado A',
        fhValidadoPauta: 'Q14D', fhValidadoPautaOtro: ''
    });
    h.load();
    clickRegister(h);
    const line = Object.values(patientState(h).lines)[0];
    assert.equal(line.pauta_codigo, 'Q14D');
    assert.equal(line.pauta_label, 'Cada 14 días');
    assert.equal(line.pauta_otro_texto, '');
});

test('[review #2 pass-after] flujo Enfermería real usa CIP importado visible y no persiste metadata oculta', () => {
    const patient = {
        _isEnfermeria: true, cip: 'DEMO-CIP-NURSING', servicio: 'Reumatología', servicioSlug: 'reumatologia',
        patologia: 'AR', farmaco_solicitado: 'Medicamento enfermería visible', dosis: '30 mg visibles',
        via: 'SC', pauta: 'Cada 14 días', fecha_solicitud: '2026-07-18', tipo_validacion: 'inicio_nuevo',
        justificacion: 'OCULTA NO PERSISTIR', observaciones: 'OCULTA NO PERSISTIR',
        rawImport: { justificacion: 'OCULTA RAW', observaciones: 'OCULTA RAW' }
    };
    const h = makeHarness({ queryContext: { patient } });
    h.set('fhValEstado', 'pending');
    h.load();
    assert.equal(h.elements.fhOrigenEntrada.value, 'excel_enfermeria');
    assert.equal(h.elements.fhReumaCip.textContent, 'DEMO-CIP-NURSING');
    assert.equal(clickRegister(h), 'Solicitud y actuación pendiente registradas. No se ha creado ninguna línea de tratamiento.');
    const request = Object.values(patientState(h, 'DEMO-CIP-NURSING').requests)[0];
    assert.equal(request.patient_id, 'DEMO-CIP-NURSING');
    assert.equal(request.origin, 'imported_nursing');
    assert.equal(request.drug.drug_name, 'Medicamento enfermería visible');
    assert.equal(request.observations, '');
    assert.ok(!JSON.stringify(request).includes('OCULTA'));
});

test('contexto exacto con IDs vacíos acepta identidad por la ruta productiva', () => {
    const h = makeHarness();
    configureManual(h);
    h.catalog.selectedSnapshot = catalogSnapshot({ id: 'catalog-context-exact' });
    h.load();
    const input = h.api.requestedInput('DEMO-CIP-WIRE-A', 'manual_fh_capture');
    assert.equal(input.drug.catalog_identity.selected_drug_id, 'catalog-context-exact');
});

test('campos de IDs ausentes normalizan a vacío y aceptan identidad por la ruta productiva', () => {
    const h = makeHarness();
    configureManual(h);
    h.catalog.selectedSnapshot = catalogSnapshot({
        id: 'catalog-context-missing-ids', includeTreatment: false, includeLine: false
    });
    h.load();
    const input = h.api.requestedInput('DEMO-CIP-WIRE-A', 'manual_fh_capture');
    assert.equal(input.drug.catalog_identity.selected_drug_id, 'catalog-context-missing-ids');
});

for (const [label, context] of [
    ['tratamiento no vacío', { treatment: 'treatment-other' }],
    ['línea no vacía', { line: 'line-other' }],
    ['tratamiento y línea no vacíos', { treatment: 'treatment-other', line: 'line-other' }],
    ['CIP vacío', { patient: '' }],
    ['CIP diferente', { patient: 'DEMO-CIP-OTHER' }],
    ['slot diferente', { slot: 'validacion.validado' }]
]) {
    test(`contexto incompatible (${label}) queda sin identidad por la ruta productiva`, () => {
        const h = makeHarness();
        configureManual(h);
        h.catalog.selectedSnapshot = catalogSnapshot({ id: `catalog-reject-${label}`, ...context });
        h.load();
        const input = h.api.requestedInput('DEMO-CIP-WIRE-A', 'manual_fh_capture');
        assert.equal(input.drug.catalog_identity.selected_drug_id, '');
        assert.equal(input.drug.catalog_identity.drug_name, 'Medicamento solicitado A');
        assert.equal(input.drug.catalog_identity.active_ingredient, 'Principio solicitado A');
    });
}

test('snapshot solicitado incompatible no entra en request, conserva terapia explícita y no muta', () => {
    const h = makeHarness();
    configureManual(h);
    const snapshot = catalogSnapshot({ id: 'catalog-request-incompatible', treatment: 'treatment-other' });
    const before = structuredClone(snapshot);
    h.catalog.selectedSnapshot = snapshot;
    h.load();
    clickRegister(h);
    const request = Object.values(patientState(h).requests)[0];
    assert.equal(request.drug.catalog_identity.selected_drug_id, '');
    assert.equal(request.drug.catalog_identity.drug_name, 'Medicamento solicitado A');
    assert.equal(request.drug.catalog_identity.active_ingredient, 'Principio solicitado A');
    assert.equal(request.therapy.dose_text, '10 mg explícitos');
    assert.equal(request.therapy.presentation, '');
    assert.equal(request.therapy.route, 'IV');
    assert.equal(request.therapy.pauta_codigo, 'Q7D');
    assert.ok(!JSON.stringify(request).includes('999 mg no usar'));
    assert.deepEqual(snapshot, before);
});

test('snapshot validado incompatible no entra en línea y conserva terapia explícita', () => {
    const h = makeHarness();
    configureManual(h, {
        fhValEstado: 'validated', fhValidadoFarmaco: 'Medicamento validado visible',
        fhValidadoPrincipioActivo: 'Principio validado visible', fhValidadoDosis: '20 mg validados',
        fhValidadoPresentacion: 'Presentación validada', fhValidadoVia: 'SC', fhValidadoPauta: 'Q14D'
    });
    const snapshot = catalogSnapshot({
        id: 'catalog-line-incompatible', slot: 'validacion.validado', line: 'line-other',
        name: 'Medicamento validado visible', active: 'Principio validado visible'
    });
    const before = structuredClone(snapshot);
    h.catalog.selectedSnapshot = snapshot;
    h.load();
    clickRegister(h);
    const line = Object.values(patientState(h).lines)[0];
    assert.equal(line.catalog_identity.selected_drug_id, '');
    assert.equal(line.catalog_identity.drug_name, 'Medicamento validado visible');
    assert.equal(line.catalog_identity.active_ingredient, 'Principio validado visible');
    assert.equal(line.dose_text, '20 mg validados');
    assert.equal(line.presentation, 'Presentación validada');
    assert.equal(line.route, 'SC');
    assert.equal(line.pauta_codigo, 'Q14D');
    assert.ok(!JSON.stringify(line).includes('999 mg no usar'));
    assert.deepEqual(snapshot, before);
});

test('reload con snapshot almacenado incompatible no lo reutiliza, no escribe y reconoce replay canónico', () => {
    const first = makeHarness();
    configureManual(first);
    first.catalog.selectedSnapshot = catalogSnapshot({ id: 'catalog-canonical-replay' });
    first.load();
    clickRegister(first);

    const incompatible = catalogSnapshot({ id: 'catalog-stale-reload', treatment: 'treatment-other' });
    const serializedIncompatible = JSON.stringify(incompatible);
    first.storage.values.set(CATALOG_KEY, serializedIncompatible);
    const reload = makeHarness({ storage: makeStorage(first.storage.values) });
    configureManual(reload);
    reload.load();

    assert.equal(reload.elements.fhValRegisterHubStatus.textContent, 'Ya registrado en esta sesión');
    assert.equal(reload.storage.operations.length, 0);
    assert.equal(Object.keys(patientState(reload).requests).length, 1);
    assert.equal(Object.values(patientState(reload).requests)[0].drug.catalog_identity.selected_drug_id, 'catalog-canonical-replay');
    assert.equal(reload.storage.getItem(CATALOG_KEY), serializedIncompatible);
    assert.equal(clickRegister(reload), 'Ya registrado en esta sesión');
    assert.equal(reload.storage.operations.length, 0);
});

test('[review #3 pass-after] cambio solo de identidad de catálogo crea una request nueva', () => {
    const h = makeHarness();
    configureManual(h);
    h.catalog.selectedSnapshot = catalogSnapshot({ id: 'catalog-A' });
    h.load();
    clickRegister(h);
    h.catalog.selectedSnapshot = catalogSnapshot({ id: 'catalog-B' });
    clickRegister(h);
    const patient = patientState(h);
    assert.equal(Object.keys(patient.requests).length, 2);
    assert.equal(Object.keys(patient.validation_acts).length, 2);
    assert.deepEqual(new Set(Object.values(patient.requests).map((request) => request.drug.catalog_identity.selected_drug_id)), new Set(['catalog-A', 'catalog-B']));
    assert.equal(h.storage.canonicalWrites(), 2);
});

test('[review #4 pass-after] reload lee snapshot compatible sin mutar y reconoce replay por ruta DOMContentLoaded', () => {
    const first = makeHarness();
    configureManual(first);
    const snapshot = catalogSnapshot({ id: 'catalog-reload' });
    first.catalog.selectedSnapshot = snapshot;
    first.storage.values.set(CATALOG_KEY, JSON.stringify(snapshot));
    first.load();
    clickRegister(first);
    const reloadStorage = makeStorage(first.storage.values);
    const reload = makeHarness({ storage: reloadStorage });
    configureManual(reload);
    reload.catalog.selectedSnapshot = null;
    reload.load();
    assert.equal(reload.elements.fhValRegisterHubStatus.textContent, 'Ya registrado en esta sesión');
    assert.equal(reload.storage.operations.length, 0);
    clickRegister(reload);
    assert.equal(reload.storage.operations.length, 0);
    assert.equal(Object.values(patientState(reload).requests)[0].drug.catalog_identity.selected_drug_id, 'catalog-reload');
});

test('reload sin snapshot en memoria/storage conserva identidad canónica del request para replay', () => {
    const first = makeHarness();
    configureManual(first);
    first.catalog.selectedSnapshot = catalogSnapshot({ id: 'catalog-canonical' });
    first.load();
    clickRegister(first);
    first.storage.values.delete(CATALOG_KEY);
    const reload = makeHarness({ storage: makeStorage(first.storage.values) });
    configureManual(reload);
    reload.load();
    assert.equal(reload.elements.fhValRegisterHubStatus.textContent, 'Ya registrado en esta sesión');
    assert.equal(reload.storage.operations.length, 0);
});

test('[review #4 pass-after] identidad contradictoria no se reutiliza en línea validada', () => {
    const h = makeHarness();
    configureManual(h, {
        fhValEstado: 'validated', fhValidadoFarmaco: 'Medicamento solicitado A',
        fhValidadoPrincipioActivo: 'Principio validado distinto'
    });
    h.catalog.selectedSnapshot = catalogSnapshot({
        id: 'catalog-conflict', slot: 'validacion.validado', active: 'Principio catálogo contradictorio'
    });
    h.load();
    clickRegister(h);
    const line = Object.values(patientState(h).lines)[0];
    assert.equal(line.active_ingredient, 'Principio validado distinto');
    assert.equal(line.catalog_identity.selected_drug_id, '');
    assert.equal(line.catalog_identity.drug_name, 'Medicamento solicitado A');
    assert.equal(line.catalog_identity.active_ingredient, 'Principio validado distinto');
});

test('catálogo conserva solo identidad y nunca sobrescribe terapia explícita', () => {
    const h = makeHarness();
    configureManual(h);
    h.catalog.selectedSnapshot = catalogSnapshot({ id: 'catalog-therapy' });
    h.load();
    clickRegister(h);
    const request = Object.values(patientState(h).requests)[0];
    assert.equal(request.drug.catalog_identity.selected_drug_id, 'catalog-therapy');
    assert.equal(request.therapy.dose_text, '10 mg explícitos');
    assert.equal(request.therapy.presentation, '');
    assert.equal(request.therapy.route, 'IV');
    assert.equal(request.therapy.pauta_label, 'Cada 7 días');
});

test('request validada queda cerrada salvo replay exacto y cambio real solicitado crea otra', () => {
    const h = makeHarness();
    configureManual(h, { fhValEstado: 'validated' });
    h.load();
    clickRegister(h);
    const before = h.storage.canonicalWrites();
    h.set('fhValObservaciones', 'Actuación diferente');
    assert.match(clickRegister(h), /cerrada/);
    assert.equal(h.storage.canonicalWrites(), before);
    h.set('fhManualFarmaco', 'Medicamento solicitado B');
    h.set('fhManualPrincipioActivo', 'Principio solicitado B');
    clickRegister(h);
    assert.equal(Object.keys(patientState(h).requests).length, 2);
    assert.equal(Object.keys(patientState(h).lines).length, 2);
});

test('partición por CIP manual prevalece sobre contexto obsoleto', () => {
    const stale = { cip: 'DEMO-CIP-STALE', servicio: 'Dermatología', farmaco: 'Stale' };
    const h = makeHarness({ queryContext: { patient: stale, cip: 'DEMO-CIP-STALE' } });
    configureManual(h, { fhManualCip: 'DEMO-CIP-MANUAL', fhManualFarmaco: 'Medicamento manual' });
    h.load();
    h.set('fhOrigenEntrada', 'manual_farmacia');
    h.set('fhManualCip', 'DEMO-CIP-MANUAL');
    clickRegister(h);
    assert.ok(h.state().patients['DEMO-CIP-MANUAL']);
    assert.equal(h.state().patients['DEMO-CIP-STALE'], undefined);
});

test('draft mantiene binding permitido e IDs opacos', () => {
    const h = makeHarness();
    configureManual(h);
    h.load();
    clickRegister(h);
    const draft = patientState(h).drafts.validation_registration_current_v1;
    assert.deepEqual(Object.keys(draft).sort(), [
        'last_act_signature', 'patient_id', 'produced_line_id', 'request_id', 'request_signature',
        'result', 'saved_at', 'validation_act_id'
    ]);
    assert.match(draft.request_id, /^req_/);
    assert.match(draft.validation_act_id, /^val_/);
    assert.match(draft.request_signature, /^sig_v1_/);
});

for (const failAt of ['createTreatmentLineFromValidatedRequest', 'upsertValidationAct', 'upsertLine', 'upsertDraft', 'validatePatientState', 'save']) {
    test(`[atomicity] fallo ${failAt} con estado previo no altera storage`, () => {
        const seed = makeHarness();
        configureManual(seed);
        seed.load();
        clickRegister(seed);
        const shared = makeStorage(seed.storage.values);
        const before = shared.getItem(CANONICAL_KEY);
        const h = makeHarness({ storage: shared, failAt });
        configureManual(h, { fhValEstado: 'validated' });
        h.load();
        clickRegister(h);
        assert.equal(shared.getItem(CANONICAL_KEY), before);
        assert.equal(shared.canonicalWrites(), 0);
        assert.match(h.elements.fhValRegisterHubStatus.textContent, /No se guardaron cambios/);
    });
}

test('cada éxito realiza exactamente un save canónico final', () => {
    const h = makeHarness();
    configureManual(h);
    h.load();
    clickRegister(h);
    assert.equal(h.storage.canonicalWrites(), 1);
    h.set('fhValEstado', 'validated');
    clickRegister(h);
    assert.equal(h.storage.canonicalWrites(), 2);
});

console.log(`\nTotal: ${passed} passed, 0 failed`);
