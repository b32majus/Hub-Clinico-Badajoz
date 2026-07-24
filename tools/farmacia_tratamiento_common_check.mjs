#!/usr/bin/env node
// tools/farmacia_tratamiento_common_check.mjs
// Verifica el helper comun de tratamiento farmacologico WO7C / WO7C.2

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
assert(!Object.prototype.hasOwnProperty.call(empty, 'snapshot_kind'), 'tratamiento canónico no contiene snapshot_kind');

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
assertEqual(cimaTreatment.dosis_texto, '', 'CIMA no infiere dosis');
assertEqual(cimaTreatment.presentacion, '', 'CIMA no infiere presentación');
assertEqual(cimaTreatment.via, '', 'CIMA no infiere vía');
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
assertEqual(api.normalizeTreatmentInput({ tipo_relacion: 'sin_cambios' }).tipo_relacion, '', 'sin_cambios no se convierte en principal');
assertEqual(api.normalizeTreatmentInput({ tipo_relacion: 'base' }).tipo_relacion, '', 'base no se convierte en principal');

const patientWithoutBiologics = api.buildTreatmentFromPatient({ cip: 'CIP-TEST' });
assert(patientWithoutBiologics && typeof patientWithoutBiologics === 'object', 'buildTreatmentFromPatient no rompe con paciente sin biologicos');
assertEqual(patientWithoutBiologics.paciente_cip, 'CIP-TEST', 'paciente sin biologicos conserva paciente_cip en shape vacio');

const patientWithBiologics = {
    cip: 'DEMO-CIP-REU-001',
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
assertEqual(lines[0].tipo_relacion, 'principal', 'linea es_principal se normaliza como principal');
assertEqual(lines[0].tipo_movimiento, 'sin_cambios', 'base/sin_cambios fija tipo_movimiento');
assertEqual(lines[1].tipo_relacion, 'adicional', 'tratamiento_añadido mapea a adicional');
assertEqual(lines[1].tipo_movimiento, 'tratamiento_anadido', 'tratamiento_añadido fija tipo_movimiento');
assertEqual(lines[2].tipo_relacion, 'historico', 'cambio_terapeutico mapea a historico');
assertEqual(lines[2].tipo_movimiento, 'cambio_terapeutico', 'cambio_terapeutico fija tipo_movimiento');

const unsortedPatient = {
    cip: 'CIP-UNSORTED',
    biologicos: [
        {
            linea_id: 'H1',
            nombre_linea: 'Historico',
            principio_activo: 'Ustekinumab',
            estado_linea: 'historico',
            tipo_relacion: 'historico'
        },
        {
            linea_id: 'P1',
            nombre_linea: 'Principal',
            principio_activo: 'Secukinumab',
            estado_linea: 'activo',
            tipo_relacion: 'base',
            es_principal: true
        },
        {
            linea_id: 'A1',
            nombre_linea: 'Adicional',
            principio_activo: 'Rituximab',
            estado_linea: 'añadido',
            tipo_relacion: 'tratamiento_añadido'
        }
    ]
};
const selectedPrincipal = api.buildTreatmentFromPatient(unsortedPatient);
assertEqual(selectedPrincipal.tratamiento_id, 'P1', 'paciente multibiologico desordenado selecciona la linea principal');
assertEqual(selectedPrincipal.tipo_relacion, 'principal', 'seleccion principal explicita en paciente desordenado');

const snapshot = api.buildTreatmentSnapshot({
    selected_drug_id: 'CIMA-99',
    source_type: 'CIMA',
    nombre_snapshot: 'Secukinumab',
    principio_activo_snapshot: 'Secukinumab',
    presentacion_snapshot: '300 mg pluma',
    via_snapshot: 'SC',
    codigo_nacional_snapshot: '999999',
    nregistro_snapshot: 'EU/1/99/999',
    dosis_presentacion: '300 mg'
});
assertEqual(snapshot.selected_drug_id, 'CIMA-99', 'buildTreatmentSnapshot mapea selectedSnapshot real');
assertEqual(snapshot.codigo_nacional, '999999', 'buildTreatmentSnapshot mapea codigo nacional snapshot');
assertEqual(snapshot.via, '', 'snapshot legacy explícito no infiere vía');
assertEqual(snapshot.dosis_texto, '', 'snapshot legacy explícito no infiere dosis');
assert(!Object.prototype.hasOwnProperty.call(snapshot.snapshot_origen || {}, 'dosis_presentacion'), 'snapshot_origen saneado no conserva dosis de catálogo');

const preservedTherapy = api.buildTreatmentSnapshot({
    snapshot_kind: 'catalog_selection',
    snapshot_version: 1,
    selected_at: '2026-07-18T12:00:00.000Z',
    context: { slot: 'seguimiento.tratamiento', paciente_cip: 'CIP-CTX-01', tratamiento_id: 'T-01', linea_id: 'L-01' },
    selected_drug_id: 'CIMA-CTX-01',
    source_type: 'CIMA',
    nombre_snapshot: 'Identidad de catálogo',
    principio_activo_snapshot: 'Principio de catálogo',
    dosis_presentacion: '15 mg no prescritos',
    presentacion_snapshot: 'Presentación CIMA no prescrita',
    via_snapshot: 'SC'
}, {
    base: { dosis_texto: '30 mg profesional', presentacion: 'Presentación profesional', via: 'Oral', pauta: 'Cada 24 horas', tipo_relacion: 'validado', estado_linea: 'activo' }
});
assertEqual(preservedTherapy.dosis_texto, '30 mg profesional', 'catálogo conserva dosis profesional');
assertEqual(preservedTherapy.presentacion, 'Presentación profesional', 'catálogo conserva presentación profesional');
assertEqual(preservedTherapy.via, 'Oral', 'catálogo conserva vía profesional');
assertEqual(preservedTherapy.tipo_relacion, 'validado', 'catálogo no crea relación');
assertEqual(preservedTherapy.estado_linea, 'activo', 'catálogo no crea estado');
assertEqual(preservedTherapy.snapshot_origen.snapshot_kind, 'catalog_selection', 'snapshot_origen conserva clase saneada');
assertEqual(preservedTherapy.snapshot_origen.context.slot, 'seguimiento.tratamiento', 'snapshot_origen conserva contexto saneado');
assert(!Object.prototype.hasOwnProperty.call(preservedTherapy.snapshot_origen, 'via_snapshot'), 'snapshot_origen no conserva vía de catálogo');

const unknownKind = api.buildTreatmentSnapshot({
    snapshot_kind: 'clinical_treatment',
    dosis_presentacion: '90 mg no autorizados',
    via_snapshot: 'IV',
    nombre_snapshot: 'Identidad sin privilegios'
});
assertEqual(unknownKind.dosis_texto, '', 'clinical_treatment no registrado no obtiene privilegios clínicos');
assertEqual(unknownKind.via, '', 'tipo clínico no registrado no obtiene vía clínica');

const summary = api.buildTreatmentSummary(lines[0]);
assertEqual(summary.titulo, lines[0].farmaco_nombre, 'buildTreatmentSummary construye titulo');
assert(Array.isArray(summary.meta), 'buildTreatmentSummary devuelve meta array');

assertEqual(api.mapViaToSelect('subcutánea'), 'SC', 'mapViaToSelect normaliza SC');
assertEqual(api.mapViaToSelect('intravenosa'), 'IV', 'mapViaToSelect normaliza IV');
assertEqual(api.mapViaToSelect('vía no catalogada'), 'Otra', 'mapViaToSelect degrada a Otra');

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
