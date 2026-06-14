#!/usr/bin/env node
// tools/farmacia_excel_operativo_template_check.mjs
// Verifica WO8.1a — Plantilla Excel operativa FH

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

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

// Try to load openpyxl via Python to inspect the file
import { spawnSync } from 'child_process';

const xlsxPath = path.join(ROOT, 'templates', 'farmacia_excel_operativo_FH_WO8_v1.xlsx');
const expectedSheets = ['01_DERMA', '02_REUMA', '03_DIGESTIVO', '04_ONCO', '05_CATALOGOS', '99_CONFIG_EXPORT_MAP'];

// 1. Existe el archivo
const fileExists = fs.existsSync(xlsxPath);
assert(fileExists, 'Archivo Excel existe');

if (!fileExists) {
  console.log('\n Total: 0 passed, 1 failed — archivo no encontrado');
  process.exit(1);
}

// 2. Tamaño razonable (más de 5 KB)
const stat = fs.statSync(xlsxPath);
assert(stat.size > 5000, `Tamaño del archivo: ${(stat.size / 1024).toFixed(1)} KB (> 5 KB)`);
assert(stat.size < 5000000, `Tamaño del archivo: ${(stat.size / 1024).toFixed(1)} KB (< 5 MB)`);

// 3-6: leer estructura con Python openpyxl
const pythonScript = `
import sys, json
sys.path.insert(0, '${ROOT}')
from openpyxl import load_workbook
wb = load_workbook('${xlsxPath}', read_only=True, data_only=True)
sheets = wb.sheetnames
result = {
    "sheets": sheets,
    "has_macros": wb.vba_archive is not None,
}
# For each service sheet, get headers
service_cols = {}
for s in sheets:
    if s.startswith("0") and s not in ["05_CATALOGOS", "99_CONFIG_EXPORT_MAP"]:
        ws = wb[s]
        headers = []
        for cell in next(ws.iter_rows(min_row=1, max_row=1, values_only=True)):
            if cell: headers.append(str(cell).strip())
        service_cols[s] = headers
result["service_cols"] = service_cols
print(json.dumps(result))
`;

const py = spawnSync('python3', ['-c', pythonScript], {
  encoding: 'utf8',
  timeout: 10000,
});

if (py.error || py.status !== 0) {
  fail('No se pudo inspeccionar el Excel con Python/openpyxl: ' + (py.stderr || py.error?.message || ''));
  process.exit(1);
}

let info;
try {
  info = JSON.parse(py.stdout.trim());
} catch (e) {
  fail('Error parseando salida de Python: ' + e.message);
  process.exit(1);
}

const sheets = info.sheets;
const serviceCols = info.service_cols;

// 3. Existen las 6 hojas esperadas
for (const sheet of expectedSheets) {
  assert(sheets.includes(sheet), `Hoja "${sheet}" existe`);
}

// 4. No hay hojas adicionales inesperadas (permitir alguna extra temporal)
const unexpected = sheets.filter(s => !expectedSheets.includes(s));
if (unexpected.length === 0) ok('No hay hojas adicionales inesperadas');
else fail(`Hojas adicionales inesperadas: ${unexpected.join(', ')}`);

// 5. No hay macros
assert(!info.has_macros, 'No hay macros VBA en el archivo');

// 6. Las 4 hojas de servicio tienen idénticas columnas
const serviceNames = Object.keys(serviceCols).filter(s => s.startsWith('0') && s !== '05_CATALOGOS' && s !== '99_CONFIG_EXPORT_MAP');
assert(serviceNames.length === 4, `4 hojas de servicio encontradas: ${serviceNames.join(', ')}`);

if (serviceNames.length >= 2) {
  const firstHeaders = serviceCols[serviceNames[0]];
  let allEqual = true;
  for (let i = 1; i < serviceNames.length; i++) {
    const h = serviceCols[serviceNames[i]];
    if (JSON.stringify(h) !== JSON.stringify(firstHeaders)) {
      allEqual = false;
      fail(`Columnas de ${serviceNames[i]} no coinciden con ${serviceNames[0]}`);
    }
  }
  if (allEqual) ok('Las 4 hojas de servicio tienen idénticas columnas');
}

// 7. Columnas P0 existen
const p0Cols = [
  'patient_id', 'cip_demo_o_hash', 'servicio_origen', 'fecha_acto',
  'tipo_acto_fh', 'profesional_fh', 'marca_comercial', 'principio_activo',
  'tipo_relacion', 'estado_linea', 'es_principal', 'fecha_inicio',
  'dosis_presentacion', 'via', 'hay_efecto_adverso', 'demo_flag', 'created_at',
];

if (serviceNames.length > 0) {
  const refHeaders = serviceCols[serviceNames[0]] || [];
  for (const col of p0Cols) {
    assert(refHeaders.includes(col), `Columna P0 "${col}" presente en hojas de servicio`);
  }
}

// 8. Columnas críticas presentes
const criticalCols = ['servicio_origen', 'marca_comercial', 'principio_activo', 'tipo_acto_fh', 'demo_flag'];
if (serviceNames.length > 0) {
  const refHeaders = serviceCols[serviceNames[0]] || [];
  for (const col of criticalCols) {
    assert(refHeaders.includes(col), `Columna crítica "${col}" presente`);
  }
}

// 9. Total columnas esperado (> 50 para bloques A-H)
if (serviceNames.length > 0) {
  const refHeaders = serviceCols[serviceNames[0]] || [];
  assert(refHeaders.length > 50, `Hojas de servicio tienen ${refHeaders.length} columnas (> 50)`);
}

console.log(`\n Total: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}`);
if (failed > 0) process.exit(1);
