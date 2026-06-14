#!/usr/bin/env node
// tools/farmacia_tratamiento_common_check.mjs
// Verifica el helper comun de tratamiento farmacologico WO7C

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];

function ok(msg) {
    console.log(`  ✓ ${msg}`);
    passed++;
}

function fail(msg) {
    console.log(`  ✗ ${msg}`);
    failed++;
    errors.push(msg);
}

function assert(condition, label) {
    if (condition) ok(label);
    else fail(label);
}

function assertEqual(actual, expected, label) {
    if (actual === expected) ok(`${label}: ${JSON.stringify(expected)}`);
    else fail(`${label}: esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`);
}

const catalogPath = path.join(ROOT, 'scripts', 'farmacia_pautas_catalog.js');
const helperPath = path.join(ROOT, 'scripts', 'farmacia_tratamiento_common.js');

if (!fs.existsSync(catalogPath)) {
    console.error('FATAL: scripts/farmacia_pautas_catalog.js no encontrado');
    process.exit(1);
}
if (!fs.existsSync(helperPath)) {
    console.error('FATAL: scripts/farmacia_tratamiento_common.js no encontrado');
    process.exit(1);
}

const catalogSrc = fs.readFileSync(catalogPath, 'utf8');
const helperSrc = fs.readFileSync(helperPath, 'utf8');

const sandbox = {
    window: {},
    console: console,
    module: { exports: {} },
    exports: {}
};
vm.createContext(sandbox);
vm.runInContext(catalogSrc, sandbox);
vm.runInContext(helperSrc, sandbox);

const api = sandbox.window.FarmaciaTratamiento || sandbox.module.exports;
if (!api || typeof api.normalizeTreatmentInput !== 'function') {
    console.error('FATAL: FarmaciaTratamiento no disponible');
    process.exit(1);
}

console.log('  ✓ Catalogo de pautas + helper WO7C cargados en VM sandbox');

const empty = api.normalizeTreatmentInput({});
const emptyKeys = [
    'tratamiento_id', 'paciente_cip', 'farmaco_nombre', 'nombre_comercial', 'principio_activo',
    'dosis_valor', 'dosis_unidad', 'dosis_texto', 'presentacion', 'via', 'pauta', 'pauta_codigo',
    'pauta_label', 'pauta_intervalo_dias', 'pauta_unidad', 'pauta_otro_texto', 'tipo_relacion',
    'estado_linea', 'tipo_movimiento', 'fase_tratamiento', 'fecha_inicio', 'fecha_fin', 'motivo',
    'observaciones', 'fuente', 'source_type', 'selected_drug_id', 'codigo_nacional', 'nregistro',
    'es_principal', 'es_validado_farmacia', 'snapshot_origen'
];
assert(emptyKeys.every(function (key) { return Object.prototype.hasOwnProperty.call(empty, key); }), 'objeto vacio devuelve shape completo');

const cimaDrug = {
    nombre_comercial: 'Secukinumab',
    principio_activo: 'Secukinumab',
    nombre_presentacion: '300 mg pluma precargada',
    codigo_nacional: '123456',
    nregistro: 'EU/1/01/123',
    dosis: '300 mg',
    via: 'subcutánea',
    drug_id: 'CIMA-1',
    source_type: 'CIMA',
    display_name: 'Secukinumab 300 mg'
};
const cimaTreatment = api.buildTreatmentFromCatalogSelection(cimaDrug, {});
assertEqual(cimaTreatment.farmaco_nombre, 'Secukinumab 300 mg', 'CIMA mapea nombre');
assertEqual(cimaTreatment.principio_activo, 'Secukinumab', 'CIMA mapea principio activo');
assertEqual(cimaTreatment.dosis_texto, '300 mg', 'CIMA mapea dosis');
assertEqual(cimaTreatment.via, 'SC', 'CIMA mapea via');
assertEqual(cimaTreatment.codigo_nacional, '123456', 'CIMA mapea codigo nacional');
assertEqual(cimaTreatment.nregistro, 'EU/1/01/123', 'CIMA mapea nregistro');
assertEqual(cimaTreatment.selected_drug_id, 'CIMA-1', 'CIMA mapea selected_drug_id');
assertEqual(cimaTreatment.source_type, 'CIMA', 'CIMA conserva source_type');

const localDrug = {
    nombre_comercial: 'Belimumab local',
    principio_activo: 'Belimumab',
    nombre_presentacion: '200 mg jeringa',
    dosis: '200 mg',
    via: 'SC',
    drug_id: 'LOCAL-1',
    source_type: 'LOCAL',
    display_name: 'Belimumab 200 mg'
};
const localTreatment = api.buildTreatmentFromCatalogSelection(localDrug, {});
assertEqual(localTreatment.source_type, 'LOCAL', 'LOCAL conserva source_type');
assertEqual(localTreatment.fuente, 'local_especial', 'LOCAL fija fuente local_especial');

const knownPauta = api.normalizeTreatmentInput({ pauta: 'SC / cada 4 semanas' });
assertEqual(knownPauta.pauta_codigo, 'CADA_4_SEMANAS', 'reutiliza normalizacion WO6 si disponible');

const unknownPauta = api.normalizeTreatmentInput({ pauta: 'texto libre inventado' }, { pautasApi: null });
assertEqual(unknownPauta.pauta, 'texto libre inventado', 'pauta desconocida conserva texto');
assertEqual(unknownPauta.pauta_codigo, '', 'pauta desconocida no inventa codigo');

assertEqual(api.normalizeTreatmentInput({ tipo_relacion: 'concomitante' }).tipo_relacion, 'concomitante', 'tipo_relacion concomitante se conserva');
assertEqual(api.normalizeTreatmentInput({ tipo_relacion: 'adicional' }).tipo_relacion, 'adicional', 'tipo_relacion adicional se conserva');
assertEqual(api.normalizeTreatmentInput({ tipo_relacion: 'historico' }).estado_linea, 'historico', 'historico no pasa a activo por defecto');
assertEqual(api.normalizeTreatmentInput({ tipo_relacion: 'exposicion' }).estado_linea, 'no_aplica', 'exposicion no pasa a activo por defecto');
assertEqual(api.normalizeTreatmentInput({ tipo_relacion: 'sospechoso_ea', es_principal: true }).es_principal, false, 'sospechoso_ea no pasa a principal');

const patientWithoutBiologics = api.buildTreatmentFromPatient({ cip: 'CIP-TEST' });
assert(patientWithoutBiologics && typeof patientWithoutBiologics === 'object', 'buildTreatmentFromPatient no rompe con paciente sin biologicos');
assertEqual(patientWithoutBiologics.paciente_cip, '', 'paciente sin tratamiento devuelve shape vacio');

const patientWithBiologics = {
    cip: 'CIP-DEMO-FH-004',
    principioActivo: 'Belimumab + Rituximab',
    via: 'SC / IV',
    biologicos: [
        {
            linea_id: 'L1',
            nombre_linea: 'Belimumab',
            principio_activo: 'Belimumab',
            presentacion: '200 mg',
            via: 'SC',
            pauta: 'SC / semanal',
            estado_linea: 'activo',
            tipo_relacion: 'base',
            es_principal: true
        },
        {
            linea_id: 'L2',
            nombre_linea: 'Rituximab',
            principio_activo: 'Rituximab',
            presentacion: '1 g',
            via: 'IV',
            pauta: 'Semestral',
            estado_linea: 'añadido',
            tipo_relacion: 'tratamiento_añadido'
        },
        {
            linea_id: 'L0',
            nombre_linea: 'Adalimumab',
            principio_activo: 'Adalimumab',
            presentacion: '40 mg',
            via: 'SC',
            pauta: 'Cada 2 semanas',
            estado_linea: 'historico',
            tipo_relacion: 'cambio_terapeutico'
        }
    ]
};
const lines = api.buildTreatmentFromPatient(patientWithBiologics, { returnArray: true });
assertEqual(lines.length, 3, 'buildTreatmentFromPatient returnArray devuelve todas las lineas');
assertEqual(lines[0].tipo_relacion, 'principal', 'base/sin_cambios mapea a principal');
assertEqual(lines[0].tipo_movimiento, 'sin_cambios', 'base/sin_cambios fija tipo_movimiento');
assertEqual(lines[1].tipo_relacion, 'adicional', 'tratamiento_añadido mapea a adicional');
assertEqual(lines[1].tipo_movimiento, 'tratamiento_anadido', 'tratamiento_añadido fija tipo_movimiento');
assertEqual(lines[2].tipo_relacion, 'historico', 'cambio_terapeutico mapea a historico');
assertEqual(lines[2].tipo_movimiento, 'cambio_terapeutico', 'cambio_terapeutico fija tipo_movimiento');

const csv = api.buildTreatmentCsvFields(lines[0], 'seg_');
assertEqual(csv.seg_farmaco_nombre, lines[0].farmaco_nombre, 'buildTreatmentCsvFields devuelve campos planos con prefijo');
assert(Object.prototype.hasOwnProperty.call(csv, 'seg_pauta_codigo'), 'buildTreatmentCsvFields incluye pauta_codigo');

const forbiddenInnerHtml = 'inner' + 'HTML';
assert(helperSrc.indexOf(forbiddenInnerHtml) === -1, 'no hay uso prohibido de markup en el helper');

console.log(`\n┌──────────────────────────────────────────────┐`);
console.log(`│ Resultados: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}   │`);
console.log(`└──────────────────────────────────────────────┘`);

if (failed > 0) {
    process.exit(1);
}
