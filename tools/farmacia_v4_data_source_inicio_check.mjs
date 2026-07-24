#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PATH = path.join(ROOT, 'scripts/farmacia_data_source.js');
const DATASET_PATH = path.join(ROOT, 'data/demo/farmacia/farmacia_v4_runtime_v1.json');

const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));

function makeDocument() {
    const nodes = new Map();
    return {
        readyState: 'complete',
        body: { firstChild: null, insertBefore() {}, appendChild() {} },
        createElement(tag) {
            return {
                tagName: String(tag).toUpperCase(), children: [], attributes: {}, className: '', textContent: '', href: '',
                setAttribute(key, value) { this.attributes[key] = value; },
                getAttribute(key) { return this.attributes[key] || null; },
                appendChild(child) { this.children.push(child); },
                removeChild(child) { this.children = this.children.filter((item) => item !== child); },
                get firstChild() { return this.children[0] || null; }
            };
        },
        getElementById(id) { return nodes.get(id) || null; },
        addEventListener() {},
        dispatchEvent() {},
        _nodes: nodes
    };
}

async function load(payload) {
    const document = makeDocument();
    class MutationObserver { constructor(callback) { this.callback = callback; } observe() {} }
    class CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }
    const window = {};
    const context = vm.createContext({
        window, document, MutationObserver, CustomEvent,
        fetch: async () => ({ ok: true, json: async () => payload }),
        Promise, Error, Object, Array, String, console, setTimeout, clearTimeout
    });
    vm.runInContext(source, context, { filename: 'farmacia_data_source.js' });
    await window.FarmaciaDataSource.ready;
    return { window, document };
}

const loaded = await load(dataset);
const api = loaded.window.FarmaciaDataSource;
assert.equal(api.getPersons().length, 12, 'V4 exposes 12 canonical persons');
assert.equal(api.findPersonByCip('fh-v4-0003').scenario_id, 'S03', 'CIP lookup is case-insensitive');
assert.equal(api.getReadinessByPatientId('fhv4-patient-s01').status, 'BLOQUEADO');
assert.equal(api.getReadinessByPatientId('fhv4-patient-s02').status, 'EN VIGILANCIA');
assert.equal(api.getReadinessByPatientId('fhv4-patient-s03').status, 'OK FARMACIA');
assert.equal(api.getValidationActsByPatientId('fhv4-patient-s05')[0].result, 'pending');
assert.equal(api.getValidationsByPatientId('fhv4-patient-s05')[0].resultado_validacion, 'pendiente');
assert.equal(api.getTreatmentLinesByPatientId('fhv4-patient-s07')[0].estado_linea, 'validated_not_started');
assert.equal(api.getActsByPatientId('fhv4-patient-s09')[0].tipo_acto_fh, 'seguimiento');

const demo = {
    patients: {},
    ready: Promise.resolve(),
    makeContextUrl(base, context) { return `${base}?cip=${context.cip}&entrada=${context.entrada}`; },
    appendIconText(parent, icon, text) { parent.textContent = text; },
    findPatientByCip(cip) {
        const target = String(cip || '').toUpperCase();
        return Object.values(this.patients).find((patient) => String(patient.cip).toUpperCase() === target) || null;
    }
};
loaded.window.FarmaciaDemo = demo;
await loaded.window.FarmaciaDemo.ready;

assert.equal(Object.keys(demo.patients).length, 12, 'adapter replaces the legacy visible dataset');
const s01 = demo.patients['FH-V4-0001'];
const s02 = demo.patients['FH-V4-0002'];
const s03 = demo.patients['FH-V4-0003'];
const s04 = demo.patients['FH-V4-0004'];
assert.equal(s01.estado, 'bloqueado');
assert.equal(s01.source_type, 'ENFERMERIA');
assert.equal(s02.estado, 'en_vigilancia');
assert.equal(s03.estado, 'pending');
assert.equal(s03.estado_prebiologico_enfermeria, 'OK FARMACIA');
assert.equal(s03.dosis, null, 'missing dose remains empty');
assert.equal(s03.via, null, 'missing route remains empty');
assert.equal(s03.pauta, null, 'missing schedule remains empty');
assert.equal(s04.estado, 'pending');
assert.equal(s04.source_type, 'V4_SCENARIO');

const policy = loaded.window.FarmaciaV4Source.actionPolicy;
assert.equal(policy('blocked_prebiologic').route, null, 'S01 has no clinical route');
assert.equal(policy('watching_prebiologic').route, null, 'S02 has no clinical route');
assert.equal(policy('ready_for_pharmacy_validation').route, 'farmacia_validacion.html', 'S03 opens Validation');
assert.equal(policy('general_pending_validation').route, 'farmacia_validacion.html', 'S04 opens Validation');
assert.equal(policy('validated_not_started').route, 'farmacia_primera_visita.html');
assert.equal(policy('active_single_line_followup').route, 'farmacia_seguimiento.html');

for (const patient of [s01, s02, s03, s04]) {
    assert.equal(patient.dosis == null || patient.dosis === '', true);
    assert.equal(patient.via == null || patient.via === '', true);
    assert.equal(patient.pauta == null || patient.pauta === '', true);
}

const invalid = structuredClone(dataset);
invalid.metadata.synthetic = false;
await assert.rejects(() => load(invalid), /No se pudo cargar el dataset sintético V4 de Farmacia/);

console.log('farmacia_v4_data_source_inicio_check: PASS');
