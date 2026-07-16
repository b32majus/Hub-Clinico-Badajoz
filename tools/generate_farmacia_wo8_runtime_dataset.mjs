#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const XLSX = require('../vendor/sheetjs/xlsx.full.min.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'templates/farmacia_excel_operativo_FH_WO8_v1_sintetico.xlsx';
const OUTPUT = 'data/demo/farmacia/farmacia_wo8_runtime_v1.json';
const CLINICAL_SHEETS = ['01_DERMA', '02_REUMA', '03_DIGESTIVO', '04_ONCO'];

const PERSON_FIELDS = [
  'patient_id', 'cip_demo_o_hash', 'nhc_o_codigo_interno', 'fecha_nacimiento_o_edad',
  'sexo', 'servicio_origen', 'patologia_indicacion'
];
const ACT_FIELDS = [
  'patient_id', 'fecha_acto', 'tipo_acto_fh', 'visita_id', 'validacion_id', 'tratamiento_id',
  'linea_id', 'profesional_fh', 'estado_registro', 'source_type', 'created_at', 'updated_at',
  'demo_flag', 'observaciones_generales'
];
const VALIDATION_FIELDS = [
  'patient_id', 'validacion_id', 'fecha_acto', 'tipo_validacion', 'resultado_validacion',
  'requiere_prebiologico', 'tb_estado', 'serologias_estado', 'vacunas_estado',
  'bloqueantes_validacion', 'observaciones_validacion'
];
const TREATMENT_FIELDS = [
  'patient_id', 'tratamiento_id', 'linea_id', 'marca_comercial', 'principio_activo',
  'codigo_nacional', 'numero_registro', 'categoria_farmaco', 'tipo_relacion', 'estado_linea',
  'tipo_movimiento', 'es_principal', 'fecha_inicio', 'fecha_fin',
  'motivo_inicio_cambio_suspension', 'dosis_presentacion', 'via', 'pauta_codigo',
  'pauta_label', 'pauta_otro_texto'
];
const VISIT_FIELDS = ['patient_id', 'visita_id', 'fecha_acto', 'tipo_acto_fh', 'profesional_fh'];
const FOLLOWUP_FIELDS = [
  'patient_id', 'visita_id', 'fecha_acto', 'adherencia_morisky', 'haq', 'eva_dolor', 'dlqi',
  'respuesta_clinica', 'incidencias', 'observaciones_seguimiento'
];
const ADVERSE_EVENT_FIELDS = [
  'patient_id', 'ea_id', 'fecha_acto', 'hay_efecto_adverso', 'ea_descripcion', 'ea_gravedad',
  'farmaco_sospechoso_id', 'farmaco_sospechoso_nombre', 'causalidad_naranjo',
  'causalidad_karch', 'accion_ea'
];

function normalize(value) {
  return value === '' || value === undefined ? null : value;
}

function select(row, fields) {
  return Object.fromEntries(fields.map((field) => [field, normalize(row[field])]));
}

function hasValue(record, fields) {
  return fields.some((field) => record[field] !== null);
}

const sourcePath = path.join(ROOT, SOURCE);
const sourceBytes = fs.readFileSync(sourcePath);
const sourceHash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
const workbook = XLSX.read(sourceBytes, { type: 'buffer', raw: false, cellDates: false });

for (const sheet of CLINICAL_SHEETS) {
  if (!workbook.Sheets[sheet]) throw new Error(`Missing clinical sheet: ${sheet}`);
}

const rows = CLINICAL_SHEETS.flatMap((sheet) =>
  XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: null, raw: false })
);
const personsById = new Map();
for (const row of rows) {
  const person = select(row, PERSON_FIELDS);
  if (!personsById.has(person.patient_id)) personsById.set(person.patient_id, person);
}

const dataset = {
  metadata: {
    schema: 'farmacia_wo8_runtime_v1',
    source: SOURCE,
    hash: sourceHash,
    synthetic: true
  },
  persons: Array.from(personsById.values()).map((person) => ({
    patient_id: person.patient_id,
    cip: person.cip_demo_o_hash,
    internal_code: person.nhc_o_codigo_interno,
    birth_or_age: person.fecha_nacimiento_o_edad,
    sex: person.sexo,
    service: person.servicio_origen,
    pathology: person.patologia_indicacion
  })),
  acts: rows.map((row) => select(row, ACT_FIELDS)),
  validations: rows.map((row) => select(row, VALIDATION_FIELDS))
    .filter((item) => hasValue(item, VALIDATION_FIELDS.slice(3))),
  treatment_lines: rows.map((row) => select(row, TREATMENT_FIELDS))
    .filter((item) => hasValue(item, TREATMENT_FIELDS.slice(1))),
  visits: rows.map((row) => select(row, VISIT_FIELDS)).filter((item) => item.visita_id !== null),
  followups: rows.map((row) => select(row, FOLLOWUP_FIELDS))
    .filter((item) => hasValue(item, FOLLOWUP_FIELDS.slice(3))),
  adverse_events: rows.map((row) => select(row, ADVERSE_EVENT_FIELDS))
    .filter((item) => item.ea_id !== null)
};

const outputPath = path.join(ROOT, OUTPUT);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
console.log(`${OUTPUT}: ${dataset.persons.length} persons, ${dataset.acts.length} acts, source sha256=${sourceHash}`);
