#!/usr/bin/env node
// #680 — la columna adherencia_morisky del export a Excel usa solo los valores de la plantilla
// (Alta / Media / Baja / No evaluada); vacío sigue vacío; un valor desconocido no se inventa.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const js = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_excel_row_export.js'), 'utf8');
const template = fs.readFileSync(path.join(ROOT, 'scripts', 'build_excel_template.py'), 'utf8');

let failed = 0;
function check(cond, label) { if (cond) console.log('  ✓ ' + label); else { console.log('  ✗ ' + label); failed++; } }

const sandbox = { window: {}, navigator: {}, document: { getElementById: () => null, createElement: () => ({ style: {} }), body: { appendChild: () => {} } }, setTimeout: () => 0, Date, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(js, sandbox);
const exp = sandbox.FarmaciaExcelRowExport;
const morisky = (value, key) => exp.buildExcelRowObject({ fechaActo: '2026-11-08', proms: { [key || 'morisky_green']: value } }).adherencia_morisky;

// Los valores que acepta la plantilla (fuente: build_excel_template.py)
const listMatch = template.match(/"adherencia_morisky":\s*\[([^\]]*)\]/);
const allowed = listMatch ? (listMatch[1].match(/"([^"]+)"/g) || []).map((s) => s.replace(/"/g, '')) : [];
check(allowed.join('|') === 'Alta|Media|Baja|No evaluada', 'plantilla acepta Alta|Media|Baja|No evaluada (' + allowed.join('|') + ')');

// Etiquetas que produce Seguimiento (moriskyResultFromAnswers)
check(morisky('alta adherencia') === 'Alta', 'alta adherencia -> Alta');
check(morisky('adherencia media / parcial') === 'Media', 'adherencia media / parcial -> Media');
check(morisky('baja adherencia') === 'Baja', 'baja adherencia -> Baja');
check(morisky('pendiente de completar') === 'No evaluada', 'pendiente de completar -> No evaluada');

// Ya normalizados: idempotente, sin importar mayúsculas ni espacios
check(morisky('Alta') === 'Alta' && morisky('Media') === 'Media' && morisky('Baja') === 'Baja' && morisky('No evaluada') === 'No evaluada', 'valores de plantilla se conservan');
check(morisky('  ALTA ADHERENCIA ') === 'Alta', 'mayúsculas y espacios no cambian el resultado');

// Ausencia no se convierte en nada
check(morisky('') === '', 'vacío sigue vacío (no se marca No evaluada)');
check(exp.buildExcelRowObject({ fechaActo: '2026-11-08' }).adherencia_morisky === '', 'sin proms sigue vacío');

// Un valor desconocido no se inventa ni se fuerza a una categoría
check(morisky('texto raro') === 'texto raro', 'valor desconocido se conserva literal');

// Clave alternativa heredada
check(morisky('baja adherencia', 'morisky') === 'Baja', 'clave heredada proms.morisky también se normaliza');

// Toda salida normalizada pertenece a la lista de la plantilla
for (const v of ['alta adherencia', 'adherencia media / parcial', 'baja adherencia', 'pendiente de completar']) {
  check(allowed.includes(morisky(v)), 'salida de «' + v + '» pertenece a la plantilla');
}

if (failed) { console.log('FALLO: ' + failed); process.exit(1); }
console.log('PASS');
