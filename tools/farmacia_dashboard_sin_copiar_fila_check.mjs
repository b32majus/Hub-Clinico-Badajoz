#!/usr/bin/env node
// tools/farmacia_dashboard_sin_copiar_fila_check.mjs
// Dashboard del paciente FH: «Copiar fila Excel FH» retirado (Sil, 08-11).
// «Vista completa» se queda (valoración del grupo de trabajo).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'farmacia_dashboard_paciente.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_dashboard_paciente.js'), 'utf8');

let failed = 0;
function check(label, cond) {
  console.log(`  ${cond ? '✓' : '✗'} ${label}`);
  if (!cond) failed++;
}

check('HTML: sin botón #fhDashExcelExportBtn', !html.includes('fhDashExcelExportBtn'));
check('HTML: sin el texto «Copiar fila Excel FH»', !html.includes('Copiar fila Excel FH'));
check('HTML: sin cargar farmacia_excel_row_export.js', !html.includes('farmacia_excel_row_export.js'));
check('HTML: conserva «Registrar seguimiento» (#navToSeguimiento)', html.includes('id="navToSeguimiento"'));
check('HTML: conserva el enlace a Validación', html.includes('href="farmacia_validacion.html"'));
check('HTML: conserva «Vista completa»', html.includes('Vista completa'));
check('JS: sin referencia a fhDashExcelExportBtn', !js.includes('fhDashExcelExportBtn'));
check('JS: sin FarmaciaExcelRowExport', !js.includes('FarmaciaExcelRowExport'));
check('JS: sin initDashExcelBtn', !js.includes('initDashExcelBtn'));

if (failed) {
  console.error(`\n${failed} comprobación(es) fallida(s)`);
  process.exit(1);
}
console.log('\nOK');
