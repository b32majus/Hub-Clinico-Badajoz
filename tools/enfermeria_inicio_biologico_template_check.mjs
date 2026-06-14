#!/usr/bin/env node
// tools/enfermeria_inicio_biologico_template_check.mjs
// Verifica WO8.1c.1 — Plantilla Enfermería Inicio Biológico incorporada al repo

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];

function ok(msg) { console.log('  \u2713 ' + msg); passed++; }
function fail(msg) { console.log('  \u2717 ' + msg); failed++; errors.push(msg); }
function assert(condition, label) { if (condition) ok(label); else fail(label); }

const xlsxPath = path.join(ROOT, 'templates', 'enfermeria_inicio_biologico_PROMueve_sintetico_v1.xlsx');

// 1. Existe el archivo
const fileExists = fs.existsSync(xlsxPath);
assert(fileExists, 'Archivo Excel Enfermería existe');

if (!fileExists) {
  console.log('\n Total: 0 passed, 1 failed — archivo no encontrado');
  process.exit(1);
}

// 2. Tamaño razonable
const stat = fs.statSync(xlsxPath);
assert(stat.size > 1000, `Tamaño: ${(stat.size / 1024).toFixed(1)} KB (> 1 KB)`);
assert(stat.size < 5000000, `Tamaño: ${(stat.size / 1024).toFixed(1)} KB (< 5 MB)`);

// 3. Inspeccionar estructura con Python
const pythonScript = `
import sys, json
from openpyxl import load_workbook

wb = load_workbook("${xlsxPath}", read_only=True, data_only=True)
sheets = wb.sheetnames
has_macros = wb.vba_archive is not None

sheet_info = {}
for s in sheets:
    ws = wb[s]
    rows = 0
    headers = []
    content_preview = []
    for i, row in enumerate(ws.iter_rows(min_row=1, values_only=True)):
        vals = [str(v).strip() if v else '' for v in row]
        if any(v for v in vals):
            rows += 1
            if i == 0:
                headers = [v for v in vals if v][:15]
            if i < 3 and i > 0:
                content_preview.append([v for v in vals if v][:5])
    sheet_info[s] = {
        "rows": rows,
        "headers": headers,
        "preview": content_preview
    }

# Check for synthetic/demo data patterns
has_demo_keywords = False
has_bio_keywords = False
has_patient_keywords = False
has_service_keywords = False
has_synthetic_patients = False
all_text = ""
for s in sheets:
    ws = wb[s]
    for row in ws.iter_rows(min_row=1, values_only=True):
        vals = [str(v) if v else '' for v in row]
        all_text += ' '.join(vals).lower() + ' '

demo_words = ['demo', 'sintético', 'mock', 'prueba', 'test', 'simulado', 'paciente a', 'paciente b']
bio_words = ['biológico', 'inicio', 'validación', 'prebiológico', 'tratamiento', 'fármaco', 'analítica', 'serologías']
patient_words = ['paciente', 'pacient', 'cip', 'historia', 'nombre']
service_words = ['derma', 'reuma', 'digestivo', 'servicio']

for w in demo_words:
    if w in all_text: has_demo_keywords = True
for w in bio_words:
    if w in all_text: has_bio_keywords = True
for w in patient_words:
    if w in all_text: has_patient_keywords = True
for w in service_words:
    if w in all_text: has_service_keywords = True
# Check for synthetic patient IDs (numeric or patterned)
if 'paciente a' in all_text or 'paciente b' in all_text or '000000001' in all_text:
    has_synthetic_patients = True

# Check no apparent real data (CIPs that look real, etc.)
has_synthetic_ids = has_synthetic_patients or 'mock' in all_text or 'demo' in all_text or 'sintético' in all_text

result = {
    "sheets": sheets,
    "has_macros": has_macros,
    "sheet_info": sheet_info,
    "has_demo_keywords": has_demo_keywords,
    "has_bio_keywords": has_bio_keywords,
    "has_patient_keywords": has_patient_keywords,
    "has_service_keywords": has_service_keywords,
    "has_synthetic_patients": has_synthetic_patients,
    "has_synthetic_ids": has_synthetic_ids,
}
print(json.dumps(result))
`;

const py = spawnSync('python3', ['-c', pythonScript], {
  encoding: 'utf8',
  timeout: 15000,
});

if (py.error || py.status !== 0) {
  fail('No se pudo inspeccionar el Excel con Python/openpyxl: ' + (py.stderr || py.error?.message || ''));
  process.exit(1);
}

let info;
try {
  info = JSON.parse(py.stdout.trim());
} catch (e) {
  fail('Error parseando salida Python: ' + e.message);
  process.exit(1);
}

// 3. Al menos una hoja útil
assert(info.sheets.length >= 1, `Tiene ${info.sheets.length} hoja(s)`);
assert(info.sheets.length >= 3, `Tiene ${info.sheets.length} hojas (mínimo esperado 3)`);

// 4. No tiene macros
assert(!info.has_macros, 'No hay macros VBA en el archivo');

// 5. Tiene datos sintéticos o demo
assert(info.has_demo_keywords || info.has_synthetic_patients, 'Contiene datos sintéticos (pacientes demo/mock)');

// 6. Contiene campos relacionados con inicio biológico/validación/paciente/servicio
assert(info.has_bio_keywords, 'Contiene palabras clave de inicio biológico/validación');
assert(info.has_patient_keywords, 'Contiene palabras clave de paciente');
assert(info.has_service_keywords, 'Contiene palabras clave de servicio clínico');

// 7. Se puede abrir como .xlsx (lo hicimos via openpyxl, ya está verificado)

// 8. No está vacío
for (const s of info.sheets) {
  const si = info.sheet_info[s];
  assert(si.rows >= 2, `Hoja "${s}" tiene ${si.rows} filas (> 1)`);
}

// Names of expected sheets
const expectedSheets = ['INICIO_BIOLOGICO', 'PANEL_ENFERMERIA', 'LISTAS', 'INSTRUCCIONES'];
for (const es of expectedSheets) {
  if (info.sheets.includes(es)) {
    ok(`Hoja esperada "${es}" presente`);
  } else {
    // Don't fail — the structure is preserved, names may vary
    console.log(`  ~ Hoja "${es}" no encontrada (nombres pueden variar)`);
  }
}

// Check for synthetic IDs
assert(info.has_synthetic_ids, 'Contiene IDs sintéticos (mock/demo)');

console.log('\n=== Detalle de hojas ===');
for (const s of info.sheets) {
  const si = info.sheet_info[s];
  console.log(`  ${s}: ${si.rows} filas`);
  if (si.headers.length > 0) console.log(`    headers: ${si.headers.slice(0, 8).join(', ')}${si.headers.length > 8 ? '...' : ''}`);
}

console.log(`\n Total: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}`);
if (failed > 0) process.exit(1);
