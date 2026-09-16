#!/usr/bin/env node
// tools/farmacia_reconcil_fixtures_generate.mjs
// Issue #367 (N3 of train #364) — deterministic paired synthetic fixtures:
//  1) Enfermería v6 multisheet workbook (frozen oracle headers) whose
//     solicitud_ids match the frozen oracle n3_cases plus N3 extended cases;
//  2) Farmacia FH operative workbook (01_DERMA / 02_REUMA / 03_DIGESTIVO,
//     62 columns with solicitud_id) with validation acts that reconcile those IDs.
// All data synthetic: no real patients, no real CIPs, no credentials.
// Output (deterministic, idempotent):
//   tools/fixtures/farmacia_reconcil_enfermeria_v6_sintetico_v1.xlsx
//   tools/fixtures/farmacia_reconcil_fh_sintetico_v1.xlsx

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const requireNode = createRequire(import.meta.url);
const XLSX = requireNode(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

// ── Enfermería v6 workbook ────────────────────────────────────────────────
const V6_HEADERS = [
  'CIP', 'Paciente', 'Patología', 'Fármaco', 'Fecha alta', 'Analítica', 'Mantoux', 'IGRA',
  'VHB', 'VHC', 'VIH', 'Med. Preventiva', 'Apto para iniciar desde', 'Estado', 'Fecha OK',
  'Observación prebiológico', 'Servicio', 'solicitud_id'
];

function row(cip, nombre, patologia, farmaco, fechaAlta, estado, fechaOk, observacion, servicio, sid) {
  return [
    cip, nombre, patologia, farmaco, fechaAlta,
    'OK', 'NEGATIVO', 'NO PRECISA', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'OK',
    fechaAlta, estado, fechaOk, observacion, servicio, sid
  ];
}

const derRows = [
  row('CIP-RECON-001', 'Paciente Sintético 001', 'Hidradenitis supurativa', 'Secukinumab', '2026-09-01', 'OK FARMACIA', '2026-09-01', 'Demo N3: sin actos FH', 'Dermatología', 'SOL-DER-000001'),
  row('CIP-RECON-002', 'Paciente Demo 002', 'Psoriasis', 'Adalimumab', '2026-09-02', 'OK FARMACIA', '2026-09-02', 'Demo N3: validación pendiente', 'Dermatología', 'SOL-DER-000002'),
  row('CIP-RECON-003', 'Paciente Demo 003', 'Vitíligo', 'Ixekizumab', '2026-09-03', 'OK FARMACIA', '2026-09-03', 'Demo N3: validado', 'Dermatología', 'SOL-DER-000003'),
  row('CIP-RECON-004', 'Paciente Demo 004', 'Alopecia areata', 'Bimekizumab', '2026-09-04', 'OK FARMACIA', '2026-09-04', 'Demo N3: denegado (alias legacy)', 'Dermatología', 'SOL-DER-000004'),
  row('CIP-RECON-007', 'Paciente Demo 007', 'Vitiligo', 'Risankizumab', '2026-09-07', 'OK FARMACIA', '2026-09-07', 'Demo N3: terminales incompatibles', 'Dermatología', 'SOL-DER-000007'),
  row('CIP-RECON-SHARED', 'Paciente Compartido A', 'Dermatitis atópica', 'Dupilumab', '2026-09-08', 'OK FARMACIA', '2026-09-08', 'Demo N3: misma CIP, solicitud validada', 'Dermatología', 'SOL-DER-000008'),
  row('CIP-RECON-SHARED', 'Paciente Compartido B', 'Dermatitis atópica', 'Tralokinumab', '2026-09-09', 'OK FARMACIA', '2026-09-09', 'Demo N3: misma CIP, solicitud pendiente', 'Dermatología', 'SOL-DER-000009'),
  row('CIP-RECON-010', 'Paciente Demo 010', 'Psoriasis', 'Guselkumab', '2026-09-10', 'OK FARMACIA', '2026-09-10', 'Demo N3: solo actos no validación', 'Dermatología', 'SOL-DER-000010')
];
const reuRows = [
  row('CIP-RECON-005', 'Paciente Demo 005', 'Artritis Reumatoide (AR)', 'Abatacept', '2026-09-05', 'EN VIGILANCIA', '', 'Pendiente serologías demo', 'Reumatología', 'SOL-REU-000005'),
  row('CIP-RECON-REU8', 'Paciente Demo REU8', 'Artritis Psoriásica (APs)', 'Tocilizumab', '2026-09-08', 'EN VIGILANCIA', '', 'Incidencia demo: terminal FH con vigilancia', 'Reumatología', 'SOL-REU-000008')
];
const digRows = [
  row('CIP-RECON-006', 'Paciente Demo 006', 'Enfermedad de Crohn', 'Ustekinumab', '2026-09-06', 'BLOQUEADO', '', 'Espera Mantoux demo', 'Digestivo', 'SOL-DIG-000006')
];

// ── Farmacia FH workbook (legacy operative reading) ──────────────────────
const FH_HEADERS = [
  'patient_id', 'cip_demo_o_hash', 'nhc_o_codigo_interno', 'fecha_nacimiento_o_edad', 'sexo',
  'servicio_origen', 'patologia_indicacion',
  'fecha_acto', 'tipo_acto_fh', 'visita_id', 'validacion_id', 'tratamiento_id', 'linea_id',
  'profesional_fh', 'estado_registro',
  'marca_comercial', 'principio_activo', 'codigo_nacional', 'numero_registro', 'source_type',
  'categoria_farmaco', 'tipo_relacion', 'estado_linea', 'tipo_movimiento', 'es_principal',
  'fecha_inicio', 'fecha_fin', 'motivo_inicio_cambio_suspension',
  'dosis_presentacion', 'via', 'pauta_codigo', 'pauta_label', 'pauta_otro_texto',
  'tipo_validacion', 'resultado_validacion', 'requiere_prebiologico', 'tb_estado',
  'serologias_estado', 'vacunas_estado', 'bloqueantes_validacion', 'observaciones_validacion',
  'adherencia_morisky', 'haq', 'eva_dolor', 'dlqi', 'respuesta_clinica', 'incidencias',
  'observaciones_seguimiento',
  'hay_efecto_adverso', 'ea_id', 'ea_descripcion', 'ea_gravedad', 'farmaco_sospechoso_id',
  'farmaco_sospechoso_nombre', 'causalidad_naranjo', 'causalidad_karch', 'accion_ea',
  'created_at', 'updated_at', 'demo_flag', 'observaciones_generales',
  'solicitud_id'
];

function fhRow(fields) {
  const f = fields;
  const base = {
    cip_demo_o_hash: '', sexo: 'F', servicio_origen: 'Dermatología', patologia_indicacion: '',
    fecha_acto: '2026-09-12', tipo_acto_fh: '', estado_registro: 'completado',
    tipo_relacion: 'principal', estado_linea: 'activo', es_principal: 'TRUE',
    source_type: 'DEMO', categoria_farmaco: 'biológico', demo_flag: 'TRUE'
  };
  const merged = Object.assign(base, f);
  return FH_HEADERS.map((h) => (merged[h] === undefined ? '' : String(merged[h])));
}

const derFH = [
  // Anti-heuristic decoy: explicit validado for the SAME CIP + same drug as
  // SOL-DER-000001 but WITHOUT its solicitud_id → must NOT close the request.
  fhRow({
    patient_id: 'FH-SYN-RECON-001', cip_demo_o_hash: 'CIP-RECON-001',
    patologia_indicacion: 'Hidradenitis supurativa', marca_comercial: 'Cosentyx',
    principio_activo: 'Secukinumab', fecha_acto: '2026-09-20',
    tipo_acto_fh: 'validacion_inicial', tipo_validacion: 'inicial',
    resultado_validacion: 'validado', observaciones_validacion: 'Demo N3: acto sin identidad, no concilia por CIP',
    solicitud_id: ''
  }),
  fhRow({
    patient_id: 'FH-SYN-RECON-002', cip_demo_o_hash: 'CIP-RECON-002',
    patologia_indicacion: 'Psoriasis', marca_comercial: 'Humira',
    fecha_acto: '2026-09-12', tipo_acto_fh: 'validacion_inicial', tipo_validacion: 'inicial',
    resultado_validacion: 'pendiente', estado_registro: 'pendiente_revision',
    observaciones_validacion: 'Pendiente completar estudio prebiológico demo',
    solicitud_id: 'SOL-DER-000002'
  }),
  fhRow({
    patient_id: 'FH-SYN-RECON-003', cip_demo_o_hash: 'CIP-RECON-003',
    patologia_indicacion: 'Psoriasis', marca_comercial: 'Taltz',
    fecha_acto: '2026-09-11', tipo_acto_fh: 'validacion_inicial', tipo_validacion: 'inicial',
    resultado_validacion: 'validado',
    observaciones_validacion: 'Validación inicial completada demo',
    solicitud_id: 'SOL-DER-000003'
  }),
  fhRow({
    patient_id: 'FH-SYN-RECON-004', cip_demo_o_hash: 'CIP-RECON-004',
    patologia_indicacion: 'Alopecia areata', marca_comercial: 'Bimzelx',
    fecha_acto: '2026-09-11', tipo_acto_fh: 'validacion_inicial', tipo_validacion: 'inicial',
    resultado_validacion: 'rechazado',
    observaciones_validacion: 'Alias legacy rechazado → denegado demo',
    solicitud_id: 'SOL-DER-000004'
  }),
  fhRow({
    patient_id: 'FH-SYN-RECON-007A', cip_demo_o_hash: 'CIP-RECON-007',
    patologia_indicacion: 'Vitiligo', marca_comercial: 'Skyrizi',
    fecha_acto: '2026-09-05', tipo_acto_fh: 'validacion_inicial', tipo_validacion: 'inicial',
    resultado_validacion: 'validado',
    observaciones_validacion: 'Conflicto demo: terminal A',
    solicitud_id: 'SOL-DER-000007'
  }),
  fhRow({
    patient_id: 'FH-SYN-RECON-007B', cip_demo_o_hash: 'CIP-RECON-007',
    patologia_indicacion: 'Vitiligo', marca_comercial: 'Skyrizi',
    fecha_acto: '2026-09-06', tipo_acto_fh: 'nueva_validacion_cambio', tipo_validacion: 'cambio',
    resultado_validacion: 'denegado',
    observaciones_validacion: 'Conflicto demo: terminal B incompatible',
    solicitud_id: 'SOL-DER-000007'
  }),
  fhRow({
    patient_id: 'FH-SYN-RECON-008', cip_demo_o_hash: 'CIP-RECON-SHARED',
    patologia_indicacion: 'Dermatitis atópica', marca_comercial: 'Dupixent',
    fecha_acto: '2026-09-12', tipo_acto_fh: 'validacion_inicial', tipo_validacion: 'inicial',
    resultado_validacion: 'validado',
    observaciones_validacion: 'Demo N3: valida SOL-DER-000008, no la 000009',
    solicitud_id: 'SOL-DER-000008'
  }),
  fhRow({
    patient_id: 'FH-SYN-RECON-010A', cip_demo_o_hash: 'CIP-RECON-010',
    patologia_indicacion: 'Psoriasis', marca_comercial: 'Tremfya',
    fecha_acto: '2026-09-14', tipo_acto_fh: 'primera_visita',
    resultado_validacion: 'validado',
    observaciones_validacion: 'Demo N3: acto no validación aunque lleve resultado',
    solicitud_id: 'SOL-DER-000010'
  }),
  fhRow({
    patient_id: 'FH-SYN-RECON-010B', cip_demo_o_hash: 'CIP-RECON-010',
    patologia_indicacion: 'Psoriasis', marca_comercial: 'Tremfya',
    fecha_acto: '2026-09-20', tipo_acto_fh: 'seguimiento',
    observaciones_seguimiento: 'Seguimiento demo',
    solicitud_id: 'SOL-DER-000010'
  })
];
const reuFH = [
  fhRow({
    patient_id: 'FH-SYN-RECON-REU8', cip_demo_o_hash: 'CIP-RECON-REU8',
    servicio_origen: 'Reumatología', patologia_indicacion: 'Artritis Psoriásica (APs)',
    marca_comercial: 'RoActemra', fecha_acto: '2026-09-10',
    tipo_acto_fh: 'validacion_inicial', tipo_validacion: 'inicial',
    resultado_validacion: 'validado',
    observaciones_validacion: 'Incidencia demo: terminal con Enfermería EN VIGILANCIA',
    solicitud_id: 'SOL-REU-000008'
  })
];
const digFH = [
  // No validation act for SOL-DIG-000006 (BLOQUEADO stays blocked).
  fhRow({
    patient_id: 'FH-SYN-RECON-DIGX', cip_demo_o_hash: 'CIP-RECON-006',
    servicio_origen: 'Digestivo', patologia_indicacion: 'Colitis ulcerosa',
    marca_comercial: 'Entyvio', fecha_acto: '2026-09-09',
    tipo_acto_fh: 'seguimiento',
    observaciones_seguimiento: 'Seguimiento demo sin validación',
    solicitud_id: 'SOL-DIG-000006'
  })
];

function writeWorkbook(sheets, filePath) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  });
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  fs.writeFileSync(filePath, Buffer.from(out));
  console.log('written', filePath);
}

writeWorkbook([
  { name: 'DERMATOLOGÍA', rows: [V6_HEADERS].concat(derRows) },
  { name: 'REUMATOLOGÍA', rows: [V6_HEADERS].concat(reuRows) },
  { name: 'DIGESTIVO', rows: [V6_HEADERS].concat(digRows) },
  { name: 'PANEL_ENFERMERIA', rows: [['Panel auxiliar sin datos clínicos']] },
  { name: 'LISTAS', rows: [['Listas auxiliares']] },
  { name: 'INSTRUCCIONES', rows: [['Instrucciones']] }
], path.join(ROOT, 'tools', 'fixtures', 'farmacia_reconcil_enfermeria_v6_sintetico_v1.xlsx'));

writeWorkbook([
  { name: '01_DERMA', rows: [FH_HEADERS].concat(derFH) },
  { name: '02_REUMA', rows: [FH_HEADERS].concat(reuFH) },
  { name: '03_DIGESTIVO', rows: [FH_HEADERS].concat(digFH) }
], path.join(ROOT, 'tools', 'fixtures', 'farmacia_reconcil_fh_sintetico_v1.xlsx'));
