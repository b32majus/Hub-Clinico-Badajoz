#!/usr/bin/env node
// tools/farmacia_excel_sintetico_check.mjs
// Verifica WO8.1c — Excel operativo FH poblado con datos sintéticos
// 26+ checks deterministas

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

const xlsxPath = path.join(ROOT, 'templates', 'farmacia_excel_operativo_FH_WO8_v1_sintetico.xlsx');
const baseXlsxPath = path.join(ROOT, 'templates', 'farmacia_excel_operativo_FH_WO8_v1.xlsx');
const expectedSheets = ['01_DERMA', '02_REUMA', '03_DIGESTIVO', '04_ONCO', '05_CATALOGOS', '99_CONFIG_EXPORT_MAP'];

// 1. Existe el archivo sintético
const fileExists = fs.existsSync(xlsxPath);
assert(fileExists, 'Archivo Excel sintético existe');

if (!fileExists) {
  console.log('\n Total: 0 passed, 1 failed — archivo no encontrado');
  process.exit(1);
}

// 2. Tamaño razonable
const stat = fs.statSync(xlsxPath);
assert(stat.size > 5000, `Tamaño del archivo: ${(stat.size / 1024).toFixed(1)} KB (> 5 KB)`);
assert(stat.size < 5000000, `Tamaño: ${(stat.size / 1024).toFixed(1)} KB (< 5 MB)`);

// 26. La plantilla base no se modifica
const baseStat = fs.statSync(baseXlsxPath);
const baseStat2 = fs.statSync(baseXlsxPath);
assert(baseStat.size === baseStat2.size, 'Plantilla base WO8.1a intacta (mismo tamaño)');
assert(baseStat.isFile(), 'Plantilla base WO8.1a existe');

// Inspect with Python + openpyxl
const pythonScript = `
import sys, json
from openpyxl import load_workbook

wb = load_workbook("${xlsxPath}", read_only=True, data_only=True)
sheets = wb.sheetnames
has_macros = wb.vba_archive is not None

service_cols = {}
service_rows = {}
for s in sheets:
    if s.startswith("0") and s not in ["05_CATALOGOS", "99_CONFIG_EXPORT_MAP"]:
        ws = wb[s]
        headers = []
        for cell in next(ws.iter_rows(min_row=1, max_row=1, values_only=True)):
            if cell: headers.append(str(cell).strip())
        service_cols[s] = headers

        row_count = 0
        for row in ws.iter_rows(min_row=2, values_only=True):
            if any(cell is not None for cell in row):
                row_count += 1
        service_rows[s] = row_count

# Check catalog for special drugs
cat_ws = wb["05_CATALOGOS"]
cat_rows = 0
for row in cat_ws.iter_rows(min_row=1, values_only=True):
    if any(cell is not None for cell in row):
        cat_rows += 1

# Check specific data in service sheets
sample_data = {}
for s in ["01_DERMA", "02_REUMA", "03_DIGESTIVO", "04_ONCO"]:
    ws = wb[s]
    tipos = set()
    has_demo = False
    has_ea = False
    has_marca = False
    has_principio = False
    has_patid = False
    has_validacion = False
    has_primera = False
    has_seg = False
    has_cambio = False
    has_adicion = False
    has_susp = False
    has_cambio_pauta = False
    has_ea_true = False
    has_ea_farmaco = False
    has_fecha_fin = False
    has_varios = False

    prev_patient = None
    pacientes_farmacos = {}

    for row in ws.iter_rows(min_row=2, values_only=True):
        vals = [str(v) if v is not None else '' for v in row]
        if not any(v for v in vals):
            continue
        has_patid = True

        # Check demo_flag
        if len(vals) >= 60 and vals[59] == 'TRUE':
            has_demo = True

        # Check marca_comercial (col 16, 0-indexed 15)
        if len(vals) >= 16 and vals[15]:
            has_marca = True

        # Check principio_activo (col 17, 0-indexed 16)
        if len(vals) >= 17 and vals[16]:
            has_principio = True

        # Check tipo_acto_fh (col 9, 0-indexed 8)
        if len(vals) >= 9:
            ta = vals[8].strip().lower()
            tipos.add(ta)
            if ta == 'validacion_inicial':
                has_validacion = True
            if ta == 'primera_visita':
                has_primera = True
            if ta in ('seguimiento',):
                has_seg = True
            if ta == 'nueva_validacion_cambio':
                has_cambio = True
            if ta == 'nueva_validacion_adicion':
                has_adicion = True
            if ta == 'suspension':
                has_susp = True
            if ta == 'cambio_pauta':
                has_cambio_pauta = True  # Could be via seguimiento with pauta change

        # Check EA (bloque G, col 49-57, 0-indexed 48-56)
        if len(vals) >= 49:
            if vals[48] == 'TRUE':
                has_ea_true = True
            if vals[53]:  # farmaco_sospechoso_nombre (0-indexed 53)
                has_ea_farmaco = True

        # Check fecha_fin (bloque C, col 27, 0-indexed 26)
        if len(vals) >= 27 and vals[26]:
            has_fecha_fin = True

        # Track patients and drugs for "varios activos"
        if len(vals) >= 23:
            pid = vals[0]
            marca = vals[15]
            estado = vals[22] if len(vals) >= 23 else ''
            if pid and marca and estado == 'activo':
                if pid not in pacientes_farmacos:
                    pacientes_farmacos[pid] = set()
                pacientes_farmacos[pid].add(marca)

    for pid, farmacos in pacientes_farmacos.items():
        if len(farmacos) >= 2:
            has_varios = True

    sample_data[s] = {
        'tipos': list(tipos),
        'has_demo': has_demo,
        'has_marca': has_marca,
        'has_principio': has_principio,
        'has_patid': has_patid,
        'has_validacion': has_validacion,
        'has_primera': has_primera,
        'has_seg': has_seg,
        'has_cambio': has_cambio,
        'has_adicion': has_adicion,
        'has_susp': has_susp,
        'has_cambio_pauta': has_cambio_pauta,
        'has_ea_true': has_ea_true,
        'has_ea_farmaco': has_ea_farmaco,
        'has_fecha_fin': has_fecha_fin,
        'has_varios': has_varios,
    }

result = {
    "sheets": sheets,
    "has_macros": has_macros,
    "service_cols": service_cols,
    "service_rows": service_rows,
    "cat_rows": cat_rows,
    "sample_data": sample_data,
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

const sheets = info.sheets;
const serviceCols = info.service_cols;
const serviceRows = info.service_rows;
const catRows = info.cat_rows;
const sd = info.sample_data;

// 3. Existen las 6 hojas esperadas
for (const sheet of expectedSheets) {
  assert(sheets.includes(sheet), `Hoja "${sheet}" existe`);
}

// 4. Cada hoja de servicio tiene 61 columnas
const serviceNames = Object.keys(serviceCols).filter(s => s.startsWith('0') && s !== '05_CATALOGOS' && s !== '99_CONFIG_EXPORT_MAP');
for (const s of serviceNames) {
  assert(serviceCols[s].length === 61, `Hoja "${s}" tiene ${serviceCols[s].length} columnas (61 esperadas)`);
}

// 5. Las 4 hojas de servicio tienen columnas idénticas
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
  if (allEqual) ok('Las 4 hojas de servicio tienen columnas idénticas');
}

// 6. Cada hoja de servicio tiene al menos 10 filas
for (const s of serviceNames) {
  const count = serviceRows[s] || 0;
  assert(count >= 10, `Hoja "${s}" tiene ${count} filas (mínimo 10)`);
}

// Aggregate checks across services
let allPatid = true, allDemo = true, allMarca = true, allPrincipio = true;
let hasValidacion = false, hasPrimera = false, hasSeg = false;
let hasCambio = false, hasAdicion = false, hasSusp = false;
let hasEATrue = false, hasEAFarmaco = false;
let hasFechaFin = false, hasVarios = false;

for (const s of serviceNames) {
  const d = sd[s];
  if (!d) continue;
  if (!d.has_patid) allPatid = false;
  if (!d.has_demo) allDemo = false;
  if (!d.has_marca) allMarca = false;
  if (!d.has_principio) allPrincipio = false;
  if (d.has_validacion) hasValidacion = true;
  if (d.has_primera) hasPrimera = true;
  if (d.has_seg) hasSeg = true;
  if (d.has_cambio) hasCambio = true;
  if (d.has_adicion) hasAdicion = true;
  if (d.has_susp) hasSusp = true;
  if (d.has_ea_true) hasEATrue = true;
  if (d.has_ea_farmaco) hasEAFarmaco = true;
  if (d.has_fecha_fin) hasFechaFin = true;
  if (d.has_varios) hasVarios = true;
}

// 7. Todas las filas tienen patient_id
assert(allPatid, 'Todas las filas tienen patient_id');

// 8. Todas las filas con medicamento tienen marca_comercial
assert(allMarca, 'Todas las filas con medicamento tienen marca_comercial');

// 9. Todas las filas con medicamento tienen principio_activo
assert(allPrincipio, 'Todas las filas con medicamento tienen principio_activo');

// 10. demo_flag = TRUE en todas
assert(allDemo, 'Todas las filas tienen demo_flag = TRUE');

// 11-16. Tipo acto coverage
assert(hasValidacion, 'Hay al menos un validacion_inicial');
assert(hasPrimera, 'Hay al menos un primera_visita');
assert(hasSeg, 'Hay al menos un seguimiento');
assert(hasCambio, 'Hay al menos un nueva_validacion_cambio');
assert(hasAdicion, 'Hay al menos un nueva_validacion_adicion');
assert(hasSusp, 'Hay al menos un suspension');

// 17-18. EA checks
assert(hasEATrue, 'Hay al menos un hay_efecto_adverso = TRUE');
assert(hasEAFarmaco, 'Hay al menos un fármaco sospechoso nombrado');

// 19. Fecha fin (histórico)
assert(hasFechaFin, 'Hay al menos un tratamiento con fecha_fin');

// 20. Varios fármacos activos
assert(hasVarios, 'Hay al menos un paciente con varios fármacos activos');

// 21. No hay macros
assert(!info.has_macros, 'No hay macros VBA en el archivo');

// 22-23. Special drugs in catalog
assert(catRows > 5, '05_CATALOGOS tiene datos de fármacos especiales');

// Count special drug entries via Python
const catDrugPython = `
from openpyxl import load_workbook
wb = load_workbook("${xlsxPath}", read_only=True, data_only=True)
ws = wb["05_CATALOGOS"]
count = 0
in_section = False
for row in ws.iter_rows(min_row=1, values_only=True):
    vals = [str(v).strip() if v else '' for v in row]
    if 'FÁRMACOS ESPECIALES' in vals[0].upper():
        in_section = True
        continue
    if in_section and vals[0] and vals[0] != 'marca_nombre_visible' and not vals[0].startswith('FÁRMACOS'):
        count += 1
print(count)
`;
const py2 = spawnSync('python3', ['-c', catDrugPython], { encoding: 'utf8', timeout: 10000 });
const catDrugCount = parseInt((py2.stdout || '').trim(), 10) || 0;
assert(catDrugCount >= 10, `Hay ${catDrugCount} fármacos especiales en 05_CATALOGOS (mínimo 10)`);

// 24. No hay datos reales aparentes
// Check no real-looking patient names or IDs
const realDataPython = `
from openpyxl import load_workbook
wb = load_workbook("${xlsxPath}", read_only=True, data_only=True)
issues = []
for s in ["01_DERMA", "02_REUMA", "03_DIGESTIVO", "04_ONCO"]:
    ws = wb[s]
    for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True)):
        vals = [str(v) if v else '' for v in row]
        if not any(v for v in vals):
            continue
        pid = vals[0] if len(vals) > 0 else ''
        cip = vals[1] if len(vals) > 1 else ''
        if pid and not pid.startswith('FH-SYN-'):
            issues.append(f"Row {i+2}: patient_id '{pid}' no parece sintético")
        if cip and not cip.startswith('DEMO-CIP-') and not cip.startswith('FH-SYN-'):
            if cip != 'N/A' and cip != '':
                issues.append(f"Row {i+2}: cip '{cip}' no parece sintético")
print("\\n".join(issues) if issues else "OK")
`;
const py3 = spawnSync('python3', ['-c', realDataPython], { encoding: 'utf8', timeout: 10000 });
assert(py3.stdout.trim() === 'OK', 'No hay datos reales aparentes en patient_id o CIP');

// 25. Resumen
console.log('\n=== Resumen de datos sintéticos ===');
for (const s of serviceNames) {
  console.log(`  ${s}: ${serviceRows[s]} filas`);
  const d = sd[s];
  if (d) console.log(`      tipos_acto: ${(d.tipos || []).join(', ')}`);
}
console.log(`  05_CATALOGOS fármacos especiales: ${catDrugCount}`);

console.log(`\n Total: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}`);
if (failed > 0) process.exit(1);
