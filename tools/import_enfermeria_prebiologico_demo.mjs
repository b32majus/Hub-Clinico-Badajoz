#!/usr/bin/env node
/**
 * Importador demo: Excel Enfermería → JSON Intake Prebiológico
 *
 * Lee el Excel mock de enfermería, normaliza los registros y genera
 * el JSON que consume la bandeja de validación del Hub Farmacia.
 *
 * Uso:
 *   node tools/import_enfermeria_prebiologico_demo.mjs
 *
 * Dependencias:
 *   - openpyxl (Python) — se invoca como subprocess para leer el XLSX
 *   - json (Node) — nativo
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const EXCEL_PATH = resolve(REPO_ROOT, 'data/import/enfermeria/Excel_Enfermeria_Inicio_Biologico_PROMueve_FHs_v3_panel_servicios_mock.xlsx');
const OUTPUT_PATH = resolve(REPO_ROOT, 'data/demo/farmacia/farmacia_intake_enfermeria_prebiologico_demo_v0_1.json');
const BATCH_ID = `IMPORT-${Date.now()}`;
const IMPORTED_AT = new Date().toISOString().split('T')[0];

// Estados derivados
function classifyStatus(row) {
  const estado = (row[12] || '').toString().trim().toUpperCase();

  switch (estado) {
    case 'OK FARMACIA':
      return 'ok_para_validacion';
    case 'BLOQUEADO':
      return 'devuelto_servicio';
    case 'EN VIGILANCIA':
    default:
      return 'pendiente_servicio';
  }
}

// Determinar si está listo para farmacia
function isReadyForPharmacy(status) {
  return status === 'ok_para_validacion';
}

// Normalizar estado de campo individual
function normalizeField(val) {
  if (!val || val.toString().trim() === '') return '';
  return val.toString().trim();
}

// Componer estado de serologías (VHB+VHC+VIH = OK si todos negativos)
function composeSerologiesStatus(row) {
  const vhb = normalizeField(row[8]);
  const vhc = normalizeField(row[9]);
  const vih = normalizeField(row[10]);
  const all = [vhb, vhc, vih].filter(Boolean);
  if (all.length === 0) return '';
  if (all.every(v => v.toUpperCase() === 'NEGATIVO')) return 'OK';
  if (all.some(v => v.toUpperCase().includes('PENDIENTE'))) return 'PENDIENTE';
  return 'ALTERADA';
}

// Componer screening TB (Mantoux + IGRA)
function composeTbStatus(row) {
  const mantoux = normalizeField(row[6]);
  const igra = normalizeField(row[7]);
  if (mantoux.toUpperCase() === 'NEGATIVO' && igra.toUpperCase() === 'NEGATIVO') return 'NEGATIVO';
  if (mantoux.toUpperCase() === 'NO PRECISA' || igra.toUpperCase() === 'NO PRECISA') return 'NO PRECISA';
  if (mantoux.toUpperCase().includes('POSITIVO') || igra.toUpperCase().includes('POSITIVO')) return 'POSITIVO';
  if (mantoux.toUpperCase() === 'PENDIENTE' || igra.toUpperCase() === 'PENDIENTE') return 'PENDIENTE';
  return `${mantoux} / ${igra}`.replace(/ \/ $/, '');
}

// Determinar items faltantes
function findMissingItems(row) {
  const missing = [];
  const fields = [
    { idx: 5, name: 'Analítica' },
    { idx: 6, name: 'Mantoux' },
    { idx: 7, name: 'IGRA' },
    { idx: 8, name: 'VHB' },
    { idx: 9, name: 'VHC' },
    { idx: 10, name: 'VIH' },
    { idx: 11, name: 'Medicina Preventiva' },
  ];

  for (const f of fields) {
    const val = normalizeField(row[f.idx]);
    if (!val || val.toUpperCase() === 'PENDIENTE') {
      missing.push(f.name);
    } else if (val.toUpperCase().includes('BLOQUEO') || val.toUpperCase().includes('ALTERADA')) {
      missing.push(`${f.name}: ${val}`);
    }
  }
  return missing;
}

// Generar display_id
function generateDisplayId(index) {
  const num = (index + 1).toString().padStart(3, '0');
  return `FH-${num}`;
}

function main() {
  console.log(`[Import] Leyendo Excel: ${EXCEL_PATH}`);

  if (!existsSync(EXCEL_PATH)) {
    console.error(`[ERROR] No se encuentra el Excel en: ${EXCEL_PATH}`);
    console.error('[INFO] Copia el archivo a data/import/enfermeria/');
    process.exit(1);
  }

  // Usar Python + openpyxl para leer el Excel
  const pythonScript = `
import openpyxl, json, sys

path = "${EXCEL_PATH.replace(/\\/g, '\\\\')}"
wb = openpyxl.load_workbook(path, data_only=True)
ws = wb['INICIO_BIOLOGICO']

rows = []
for i, row in enumerate(ws.iter_rows(min_row=5, values_only=True), 1):
    vals = [str(v) if v is not None else '' for v in row[:15]]
    # Skip empty rows
    if vals[0].strip() and vals[0] != 'None':
        rows.append(vals)

print(json.dumps(rows))
wb.close()
`;

  let rawRows;
  try {
    const stdout = execSync(`python3 -c '${pythonScript.replace(/'/g, "'\\''")}'`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
    rawRows = JSON.parse(stdout);
  } catch (err) {
    console.error('[ERROR] Fallo al leer Excel con Python/openpyxl:', err.message);
    process.exit(1);
  }

  console.log(`[Import] ${rawRows.length} registros encontrados en el Excel`);

  // Normalizar registros
  const intakeRecords = rawRows.map((row, index) => {
    const service = normalizeField(row[2]);
    const pathology = normalizeField(row[3]);
    const drug = normalizeField(row[4]);
    const globalStatus = classifyStatus(row);
    const missingItems = findMissingItems(row);
    const serologies = composeSerologiesStatus(row);
    const tbStatus = composeTbStatus(row);

    return {
      intake_id: `INTAKE-FH-${(index + 1).toString().padStart(3, '0')}`,
      patient_id: `CIP-DEMO-${normalizeField(row[0]) || (index + 1).toString().padStart(9, '0')}`,
      display_id: generateDisplayId(index),
      service: service || 'Sin servicio',
      pathology: pathology || 'Sin patología',
      proposed_biologic: {
        name: drug || '',
        principio_activo: '',
        dose: '',
        route: '',
        schedule: '',
      },
      prebiologic_status: {
        global_status: globalStatus,
        vaccination_status: normalizeField(row[11]),
        serologies_status: serologies,
        tb_screening_status: tbStatus,
        analytics_status: normalizeField(row[5]),
        missing_items: missingItems,
      },
      nursing_observations: normalizeField(row[14]),
      ready_for_pharmacy_validation: isReadyForPharmacy(globalStatus),
      validation_status: 'pending',
      source_excel_row_id: `ROW-${index + 1}`,
      import_batch_id: BATCH_ID,
      imported_at: IMPORTED_AT,
      source_type: 'excel_enfermeria_mock',
    };
  });

  // Asegurar directorio de salida
  const outDir = dirname(OUTPUT_PATH);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  // Escribir JSON
  writeFileSync(OUTPUT_PATH, JSON.stringify(intakeRecords, null, 2), 'utf-8');
  console.log(`[Import] JSON generado: ${OUTPUT_PATH}`);
  console.log(`[Import] ${intakeRecords.length} registros importados`);
  console.log(`[Import] Batch ID: ${BATCH_ID}`);

  // Resumen por estado
  const byStatus = {};
  intakeRecords.forEach(r => {
    const s = r.prebiologic_status.global_status;
    byStatus[s] = (byStatus[s] || 0) + 1;
  });
  console.log('[Import] Resumen por estado:');
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  console.log('[Import] Hecho.');
}

main();
