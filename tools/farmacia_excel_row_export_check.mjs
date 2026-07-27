#!/usr/bin/env node
// tools/farmacia_excel_row_export_check.mjs
// Verifica WO8.1b — Exportador de fila operativa Excel FH

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];

function ok(msg) { console.log('  \u2713 ' + msg); passed++; }
function fail(msg) { console.log('  \u2717 ' + msg); failed++; errors.push(msg); }
function assert(condition, label) { if (condition) ok(label); else fail(label); }

const jsPath = path.join(ROOT, 'scripts', 'farmacia_excel_row_export.js');
const js = fs.readFileSync(jsPath, 'utf8');
const forbidden = 'inner' + 'HTML';

// 1. WO8_COLUMNS tiene 61 columnas
var colMatch = js.match(/WO8_COLUMNS\s*=\s*\[([\s\S]*?)\];/);
assert(colMatch !== null, 'WO8_COLUMNS definido');
if (colMatch) {
  var colsStr = colMatch[1];
  var colCount = (colsStr.match(/'([^']+)'/g) || []).length;
  assert(colCount === 61, 'WO8_COLUMNS tiene 61 columnas (encontradas ' + colCount + ')');
}

// 2. Columnas P0 en orden canónico
var expectedFirst = ["'patient_id'", "'cip_demo_o_hash'", "'servicio_origen'", "'fecha_acto'",
  "'tipo_acto_fh'", "'marca_comercial'", "'principio_activo'", "'tipo_relacion'", "'estado_linea'"];
var colNames = colMatch ? (colsStr.match(/'([^']+)'/g) || []) : [];
for (var ci = 0; ci < expectedFirst.length; ci++) {
  var expName = expectedFirst[ci].replace(/'/g, '');
  assert(colNames.indexOf("'" + expName + "'") !== -1, 'Columna "' + expName + '" presente en WO8_COLUMNS');
}

// 3. Últimas columnas esperadas
var expectedLast = ["'demo_flag'", "'observaciones_generales'"];
for (var li = 0; li < expectedLast.length; li++) {
  var expLast = expectedLast[li].replace(/'/g, '');
  assert(colNames.indexOf("'" + expLast + "'") !== -1, 'Columna "' + expLast + '" presente en WO8_COLUMNS');
}

// 4. Funciones clave definidas
assert(js.indexOf('buildExcelRowObject') !== -1, 'buildExcelRowObject definida');
assert(js.indexOf('buildExcelRowArray') !== -1, 'buildExcelRowArray definida');
assert(js.indexOf('toTSVRow') !== -1, 'toTSVRow definida');
assert(js.indexOf('copyTSVRowToClipboard') !== -1, 'copyTSVRowToClipboard definida');
assert(js.indexOf('getServiceSheetName') !== -1, 'getServiceSheetName definida');
assert(js.indexOf('buildFilename') !== -1, 'buildFilename definida');

// 5. Context builders
assert(js.indexOf('buildContextFromValidacion') !== -1, 'buildContextFromValidacion definida');
assert(js.indexOf('buildContextFromPrimeraVisita') !== -1, 'buildContextFromPrimeraVisita definida');
assert(js.indexOf('buildContextFromSeguimiento') !== -1, 'buildContextFromSeguimiento definida');
assert(js.indexOf('buildContextFromDashboard') !== -1, 'buildContextFromDashboard definida');

// 6. API pública expuesta
assert(js.indexOf('window.FarmaciaExcelRowExport') !== -1, 'API expuesta en window.FarmaciaExcelRowExport');

// 7. Mapa de servicio a hoja
assert(js.indexOf("dermatologia: '01_DERMA'") !== -1, 'Dermatologia mapea a 01_DERMA');
assert(js.indexOf("reumatologia: '02_REUMA'") !== -1, 'Reumatologia mapea a 02_REUMA');
assert(js.indexOf("digestivo: '03_DIGESTIVO'") !== -1, 'Digestivo mapea a 03_DIGESTIVO');
assert(js.indexOf("oncologia: '04_ONCO'") !== -1, 'Oncologia mapea a 04_ONCO');

// 8. Marca comercial antes que principio activo
var marcaIdx = js.indexOf("'marca_comercial'");
var principioIdx = js.indexOf("'principio_activo'");
if (marcaIdx > 0 && principioIdx > 0 && colMatch && colNames.length >= 2) {
  var mIdx = colNames.indexOf("'marca_comercial'");
  var pIdx = colNames.indexOf("'principio_activo'");
  assert(mIdx < pIdx, 'marca_comercial (pos ' + mIdx + ') antes que principio_activo (pos ' + pIdx + ')');
}

// 9. TSV genera una sola línea
assert(js.indexOf("rowArray.join('\\t')") !== -1, 'toTSVRow genera una línea con tabuladores');

// 10. Sin innerHTML
assert(js.indexOf(forbidden) === -1, 'JS no usa innerHTML');

// 11. cleanValue con tabs/saltos
assert(js.indexOf('.replace(/\\t/g') !== -1, 'cleanValue limpia tabuladores');
assert(js.indexOf('.replace(/\\r?\\n/g') !== -1, 'cleanValue limpia saltos de línea');

// 12. Servicio a hoja para siglas
assert(js.indexOf("derma: '01_DERMA'") !== -1, 'derma mapea a 01_DERMA');
assert(js.indexOf("reuma: '02_REUMA'") !== -1, 'reuma mapea a 02_REUMA');
assert(js.indexOf("onco: '04_ONCO'") !== -1, 'onco mapea a 04_ONCO');

// 13. getServiceSheetName devuelve nombre
assert(js.indexOf('getServiceSheetName') !== -1, 'getServiceSheetName existente');

// 14. cleanValue con undefined/null
assert(js.indexOf('=== null') !== -1 || js.indexOf('== null') !== -1, 'cleanValue maneja null/undefined');

// 15. fallbackCopy para portapapeles no disponible
assert(js.indexOf('fallbackCopy') !== -1, 'fallbackCopy para portapapeles no disponible');

// 16. Toast UI
assert(js.indexOf('showToast') !== -1, 'showToast definido');

// 17. ISO timestamp en created_at
assert(js.indexOf('.toISOString()') !== -1, 'created_at usa ISO timestamp');

// 18. EA por defecto FALSE cuando no hay
var hasEaDefault = js.indexOf("hay_efecto_adverso: ea ? 'TRUE'") !== -1;
assert(hasEaDefault, 'hay_efecto_adverso = TRUE solo si hay EA explícito');

// 19. buildExcelRowArray con null devuelve array vacío
assert(js.indexOf('return WO8_COLUMNS.map(function ()') !== -1, 'buildExcelRowArray(null) devuelve array vacío');

// 20. demo_flag por defecto TRUE
assert(js.indexOf("demoFlag !== undefined") !== -1, 'demo_flag controlable vía contexto');

// 21. Verificación funcional del contrato WO8 y hojas con tildes
const sandbox = {
  window: {},
  navigator: {},
  document: { getElementById: () => null, createElement: () => ({ style: {} }), body: { appendChild: () => {} } },
  setTimeout: () => 0,
  Date,
  console
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(js, sandbox);
const exp = sandbox.FarmaciaExcelRowExport;
const blankArray = exp.buildExcelRowArray(exp.buildExcelRowObject({ fechaActo: '2026-07-27' }));
assert(blankArray.length === 61, 'fila funcional conserva 61 columnas en orden WO8');
assert(exp.WO8_COLUMNS[0] === 'patient_id' && exp.WO8_COLUMNS[60] === 'observaciones_generales', 'extremos del orden canónico WO8 preservados');
assert(!/[\r\n]/.test(exp.toTSVRow(blankArray)) && exp.toTSVRow(blankArray).split('\t').length === 61, 'TSV funcional es una línea de 61 campos');
assert(exp.getServiceSheetName('Dermatología') === '01_DERMA', 'Dermatología con tilde mapea a 01_DERMA');
assert(exp.getServiceSheetName('Reumatología') === '02_REUMA', 'Reumatología con tilde mapea a 02_REUMA');
assert(exp.getServiceSheetName('Digestivo') === '03_DIGESTIVO', 'Digestivo mapea a 03_DIGESTIVO');
assert(exp.getServiceSheetName('Oncología') === '04_ONCO', 'Oncología con tilde mapea a 04_ONCO');

// 22. Ausencias sin inferencias ni defaults de línea
const patientOnly = exp.buildExcelRowObject({
  patient: { cip: 'CIP-SINTETICO', farmaco: 'No exportar desde paciente', paciente_cip: 'LEGACY-NO-USAR' },
  fechaActo: '2026-07-27'
});
assert(patientOnly.marca_comercial === '' && patientOnly.principio_activo === '', 'sin lineaActual no infiere tratamiento desde paciente');
assert(patientOnly.tratamiento_id === '' && patientOnly.linea_id === '', 'IDs de tratamiento ausentes permanecen vacíos');
assert(patientOnly.source_type === '' && patientOnly.tipo_relacion === '' && patientOnly.estado_linea === '' && patientOnly.tipo_movimiento === '' && patientOnly.es_principal === '', 'línea ausente no recibe defaults DEMO/principal/activo/sin_cambios/TRUE');
assert(js.indexOf('buildTreatmentFromPatient') === -1, 'eliminado fallback buildTreatmentFromPatient(...)[0]');
assert(js.indexOf('p.paciente_cip') === -1, 'patient_id nunca usa paciente_cip');

const explicitLine = exp.buildExcelRowObject({
  fechaActo: '2026-07-27',
  lineaActual: { linea_id: 'LINEA-SINTETICA', farmaco_nombre: 'Marca visible', principio_activo: '' }
});
assert(explicitLine.tratamiento_id === '' && explicitLine.linea_id === 'LINEA-SINTETICA', 'tratamiento_id no reutiliza linea_id');
assert(explicitLine.marca_comercial === 'Marca visible' && explicitLine.principio_activo === '', 'nombre comercial no sustituye principio activo ausente');

// 23. La frontera normaliza resultado y deriva estado sin aceptar contradicciones
[
  ['pending', 'pendiente', 'pendiente'],
  ['pendiente', 'pendiente', 'pendiente'],
  ['validated', 'validado', 'completado'],
  ['validado', 'validado', 'completado'],
  ['denied', 'denegado', 'completado'],
  ['denegado', 'denegado', 'completado'],
  ['', '', ''],
  ['desconocido', '', '']
].forEach(function (sample) {
  const normalizedRow = exp.buildExcelRowObject({
    tipoActo: 'validacion_inicial',
    resultadoValidacion: sample[0],
    estadoRegistro: 'valor_contradictorio',
    fechaActo: '2026-07-27'
  });
  assert(normalizedRow.resultado_validacion === sample[1] && normalizedRow.estado_registro === sample[2], 'normaliza frontera ' + (sample[0] || 'ausente'));
});

const unknownValidationContext = exp.buildContextFromValidacion(null, {
  resultado: 'valor_desconocido',
  estadoRegistro: 'completado'
});
assert(unknownValidationContext.resultadoValidacion === '' && unknownValidationContext.estadoRegistro === '', 'builder de Validación vacía resultado desconocido y estado contradictorio');

// 24. Consumidores no-Validación conservan su estado previo
const syntheticPatient = { cip: 'CIP-SINTETICO-MATRIZ', servicio: 'Reumatología', patologia: 'AR' };
const nonValidationContexts = [
  ['Primera Visita', exp.buildContextFromPrimeraVisita(syntheticPatient, {})],
  ['Seguimiento', exp.buildContextFromSeguimiento(syntheticPatient, {})],
  ['Dashboard', exp.buildContextFromDashboard(syntheticPatient, {})]
];
nonValidationContexts.forEach(function (sample) {
  const nonValidationRow = exp.buildExcelRowObject(sample[1]);
  assert(nonValidationRow.estado_registro === 'completado', sample[0] + ' conserva estado_registro completado');
});
assert(exp.buildExcelRowObject(nonValidationContexts[0][1]).resultado_validacion === 'validado', 'Primera Visita conserva su resultado_validacion previo');
assert(exp.buildExcelRowObject(nonValidationContexts[1][1]).resultado_validacion === '', 'Seguimiento conserva resultado_validacion vacío');
assert(exp.buildExcelRowObject(nonValidationContexts[2][1]).resultado_validacion === '', 'Dashboard conserva resultado_validacion vacío');

console.log('\n Total: ' + passed + ' passed, ' + failed + ' failed' + (errors.length ? ' (' + errors.length + ' errores)' : ''));
if (failed > 0) process.exit(1);
