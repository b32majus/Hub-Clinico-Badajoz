#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validationSource = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_validacion.js'), 'utf8');
const exporterSource = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_excel_row_export.js'), 'utf8');
const exportMarker = '    document.addEventListener("DOMContentLoaded", function () {';
const instrumentedValidationSource = validationSource.replace(exportMarker, `    window.FarmaciaValidationExportTruth = {
        selectedValidationResult: selectedValidationResult,
        selectedValidationType: selectedValidationType,
        buildExplicitTreatmentSnapshot: buildExplicitTreatmentSnapshot,
        buildValidationExportOptions: buildValidationExportOptions,
        resolveValidationExportPatient: resolveValidationExportPatient,
        copyValidationExcelRow: copyValidationExcelRow
    };\n\n${exportMarker}`);

let passed = 0;
function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log('  ✓ ' + message);
  passed++;
}

function element(value = '', textContent = '') {
  return { value, textContent, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } };
}

const elements = {};
function setValue(id, value) {
  if (!elements[id]) elements[id] = element();
  elements[id].value = value;
}
function setText(id, value) {
  if (!elements[id]) elements[id] = element();
  elements[id].textContent = value;
}

let catalogSnapshot = null;
let requestedSnapshotContext = null;
let queryContext = {};
let copiedRow = null;
let copiedOptions = null;
const alerts = [];
const window = {
  FarmaciaDemo: { getQueryContext() { return queryContext; } },
  FarmaciaValidationModel: {},
  FarmaciaPautasCatalog: {
    getPautaByCodigo(code) { return code === 'Q7D' ? { pauta_label: 'Cada 7 días' } : null; }
  },
  FarmaciaCatalog: {
    getSnapshot(context) {
      requestedSnapshotContext = context;
      return catalogSnapshot && catalogSnapshot.context.slot === context.slot ? catalogSnapshot : null;
    }
  }
};
const document = {
  getElementById(id) { return elements[id] || null; },
  addEventListener() {},
  querySelectorAll() { return []; }
};
const sandbox = { window, document, navigator: {}, console, setTimeout, clearTimeout, alert(message) { alerts.push(message); }, Event: class Event {} };
vm.createContext(sandbox);
vm.runInContext(exporterSource, sandbox, { filename: 'farmacia_excel_row_export.js' });
assert(instrumentedValidationSource !== validationSource, 'Harness instrumenta únicamente en memoria las funciones reales de Validación');
vm.runInContext(instrumentedValidationSource, sandbox, { filename: 'farmacia_validacion.js' });

setValue('fhOrigenEntrada', 'manual_farmacia');
setValue('fhManualCip', 'SYNTH-CIP-01');
setText('fhValFarmaceutico', 'Profesional explícito');
[
  'fhValidadoFarmaco', 'fhValidadoPrincipioActivo', 'fhValidadoDosis', 'fhValidadoPresentacion', 'fhValidadoVia',
  'fhValidadoPauta', 'fhValidadoPautaOtro', 'fhManualFarmaco', 'fhManualPrincipioActivo', 'fhManualDosis',
  'fhManualVia', 'fhManualPauta', 'fhManualPautaOtro', 'fhValEstado', 'fhTipoValidacion'
].forEach((id) => setValue(id, ''));

const truth = window.FarmaciaValidationExportTruth;
const exporter = window.FarmaciaExcelRowExport;
const originalCopy = exporter.copyTSVRowToClipboard;
exporter.copyTSVRowToClipboard = (row, options) => { copiedRow = row; copiedOptions = options; return true; };
assert(truth && exporter, 'APIs de Validación y exportación disponibles');

for (const token of ['inicio_nuevo', 'switch_cambio', 'addon', 'renovacion']) {
  setValue('fhTipoValidacion', token);
  const typeOptions = truth.buildValidationExportOptions();
  const typeRow = exporter.buildExcelRowObject(exporter.buildContextFromValidacion({ cip: 'SYNTH-CIP-01' }, typeOptions));
  assert(typeOptions.tipoValidacion === token && typeRow.tipo_validacion === token, `Fila emitida conserva token explícito ${token}`);
}
setValue('fhTipoValidacion', '');
let emptyTypeOptions = truth.buildValidationExportOptions();
assert(emptyTypeOptions.tipoValidacion === '' && exporter.buildExcelRowObject(exporter.buildContextFromValidacion({ cip: 'SYNTH-CIP-01' }, emptyTypeOptions)).tipo_validacion === '', 'Tipo de validación ausente permanece vacío en la fila');
setValue('fhTipoValidacion', 'desconocido');
emptyTypeOptions = truth.buildValidationExportOptions();
assert(emptyTypeOptions.tipoValidacion === '' && exporter.buildExcelRowObject(exporter.buildContextFromValidacion({ cip: 'SYNTH-CIP-01' }, emptyTypeOptions)).tipo_validacion === '', 'Tipo de validación desconocido permanece vacío en la fila');
setValue('fhTipoValidacion', 'inicio_nuevo');

for (const [uiValue, expected] of [['pending', 'pendiente'], ['denied', 'denegado'], ['validated', 'validado']]) {
  setValue('fhValEstado', uiValue);
  const opts = truth.buildValidationExportOptions();
  const context = exporter.buildContextFromValidacion({ cip: 'SYNTH-CIP-01' }, opts);
  const row = exporter.buildExcelRowObject(context);
  assert(row.resultado_validacion === expected, `Resultado ${uiValue} exporta ${expected}`);
  assert(row.estado_registro === (expected === 'pendiente' ? 'pendiente' : 'completado'), `Estado de registro coherente para ${expected}`);
}

setValue('fhValEstado', '');
assert(truth.buildValidationExportOptions().resultadoValidacion === '', 'Ausencia de resultado no cae a validado');
setValue('fhValEstado', 'desconocido');
assert(truth.buildValidationExportOptions().resultadoValidacion === '', 'Resultado desconocido falla de forma segura');

setValue('fhManualFarmaco', 'Solicitado visible');
setValue('fhManualDosis', '10 mg solicitados');
setValue('fhManualVia', 'IV');
setValue('fhManualPauta', 'Q7D');
setValue('fhValidadoFarmaco', 'Validado visible');
setValue('fhValidadoDosis', '20 mg validados');
setValue('fhValidadoPresentacion', 'Presentación explícita');
setValue('fhValidadoVia', 'SC');
setValue('fhValidadoPauta', 'OTRO');
setValue('fhValidadoPautaOtro', 'Pauta manual explícita');
let line = truth.buildExplicitTreatmentSnapshot();
assert(line.farmaco_nombre === 'Validado visible' && line.via === 'SC', 'Tratamiento validado explícito precede al solicitado');
assert(line.dosis_texto === '20 mg validados · Presentación explícita', 'Dosis y presentación visibles se conservan');
setValue('fhValEstado', 'validated');
let finalContext = exporter.buildContextFromValidacion({ cip: 'SYNTH-CIP-01', servicio: 'Dermatología' }, truth.buildValidationExportOptions());
let finalRow = exporter.buildExcelRowObject(finalContext);
let finalArray = exporter.buildExcelRowArray(finalRow);
assert(finalArray.length === 61 && finalArray[exporter.WO8_COLUMNS.indexOf('dosis_presentacion')] === '20 mg validados · Presentación explícita', 'Fila final emitida conserva dosis y presentación explícitas en las 61 columnas');
assert(finalRow.pauta_otro_texto === 'Pauta manual explícita', 'Pauta OTRO conserva únicamente su texto libre explícito');

['fhValidadoFarmaco', 'fhValidadoPrincipioActivo', 'fhValidadoDosis', 'fhValidadoPresentacion', 'fhValidadoVia', 'fhValidadoPauta', 'fhValidadoPautaOtro'].forEach((id) => setValue(id, ''));
line = truth.buildExplicitTreatmentSnapshot();
assert(line.farmaco_nombre === 'Solicitado visible' && line.dosis === '10 mg solicitados', 'Bloque solicitado visible se usa si validado está vacío');

catalogSnapshot = {
  context: { slot: 'validacion.solicitado' }, selected_drug_id: 'DRUG-SYNTH-1', source_type: 'CIMA',
  nombre_snapshot: 'Solicitado visible',
  codigo_nacional_snapshot: 'CN-SYNTH', nregistro_snapshot: 'NR-SYNTH',
  dosis_presentacion: '999 mg inferidos', presentacion_snapshot: 'No debe copiarse', via_snapshot: 'Oral'
};
line = truth.buildExplicitTreatmentSnapshot();
assert(requestedSnapshotContext.slot === 'validacion.solicitado', 'Snapshot de catálogo se consulta para el bloque elegido');
assert(line.selected_drug_id === 'DRUG-SYNTH-1' && line.codigo_nacional === 'CN-SYNTH', 'Catálogo aporta solo identidad explícita');
assert(line.dosis === '10 mg solicitados' && line.via === 'IV' && line.pauta === 'Cada 7 días' && line.presentacion === '', 'Catálogo no sobrescribe dosis, presentación, vía o pauta');
assert(line.tratamiento_id === '' && line.linea_id === '', 'No se inventan tratamiento_id ni linea_id');

setValue('fhManualFarmaco', 'Edición manual posterior');
line = truth.buildExplicitTreatmentSnapshot();
assert(line.selected_drug_id === undefined && line.codigo_nacional === undefined && line.source_type === undefined, 'Identidad de catálogo se omite tras editar el nombre visible');
setValue('fhManualFarmaco', 'Solicitado visible');

const normalizedPautaRow = exporter.buildExcelRowObject({ lineaActual: { pauta: 'Cada 7 días', pauta_codigo: 'Q7D', pauta_label: 'Cada 7 días' } });
assert(normalizedPautaRow.pauta_otro_texto === '', 'Pauta normalizada no se duplica como texto libre');
const legacyPautaRow = exporter.buildExcelRowObject({ lineaActual: { pauta: 'Texto libre histórico' } });
assert(legacyPautaRow.pauta_otro_texto === 'Texto libre histórico', 'Pauta libre legacy permanece compatible sin código ni etiqueta');

queryContext = { patient: { cip: 'STALE-LOADED-CIP', servicio: 'Dermatología', patologia: 'Patología previa' } };
setValue('fhServicioManual', 'reuma');
setValue('fhPatologiaManual', 'AR');
setValue('fhManualCip', 'SYNTH-MANUAL-02');
const manualPatient = truth.resolveValidationExportPatient(queryContext);
assert(manualPatient.cip === 'SYNTH-MANUAL-02' && manualPatient.servicio === 'Reumatología' && manualPatient.patologia === 'AR', 'Entrada manual prevalece sobre paciente cargado y resuelve CIP, servicio y patología visibles');
copiedRow = null;
alerts.length = 0;
assert(truth.copyValidationExcelRow() === true && copiedRow && copiedRow.length === 61, 'Click manual ignora paciente de query obsoleto y copia la fila con CIP explícito');
assert(copiedRow[exporter.WO8_COLUMNS.indexOf('patient_id')] === 'SYNTH-MANUAL-02' && copiedOptions.sheetName === '02_REUMA', 'Fila manual emitida conserva CIP y hoja del servicio explícitos');
assert(copiedRow[exporter.WO8_COLUMNS.indexOf('patologia_indicacion')] === 'AR' && !copiedRow.includes('STALE-LOADED-CIP'), 'Fila manual no exporta identidad del paciente cargado previamente');

setValue('fhManualCip', '');
copiedRow = null;
alerts.length = 0;
assert(truth.copyValidationExcelRow() === false && copiedRow === null && alerts[0].includes('CIP explícito'), 'Click manual bloquea honestamente si falta CIP explícito');
setValue('fhManualCip', 'SYNTH-MANUAL-02');
setValue('fhValEstado', 'desconocido');
alerts.length = 0;
assert(truth.copyValidationExcelRow() === false && alerts[0].includes('resultado de validación válido'), 'Click bloquea resultado ausente o desconocido sin default');
setValue('fhValEstado', 'validated');

catalogSnapshot = null;
['fhManualFarmaco', 'fhManualPrincipioActivo', 'fhManualDosis', 'fhManualVia', 'fhManualPauta', 'fhManualPautaOtro'].forEach((id) => setValue(id, ''));
assert(truth.buildExplicitTreatmentSnapshot() === null, 'Ambos bloques vacíos no crean tratamiento');

const multiPatient = {
  cip: 'SYNTH-MULTI',
  biologicos: [
    { linea_id: 'LINE-1', tratamiento_id: 'TREAT-1', farmaco: 'Primera línea histórica' },
    { linea_id: 'LINE-2', tratamiento_id: 'TREAT-2', farmaco: 'Segunda línea histórica' }
  ]
};
const noLineContext = exporter.buildContextFromValidacion(multiPatient, { resultadoValidacion: 'pendiente', lineaActual: null });
const noLineRow = exporter.buildExcelRowObject(noLineContext);
assert(noLineRow.marca_comercial === '' && noLineRow.linea_id === '' && noLineRow.tratamiento_id === '', 'Paciente multilínea no provoca selección implícita de la primera línea');
assert(noLineRow.estado_linea === '' && noLineRow.tipo_relacion === '' && noLineRow.tipo_movimiento === '' && noLineRow.es_principal === '', 'No se inventan defaults de línea');
const nameOnlyRow = exporter.buildExcelRowObject({ lineaActual: { farmaco_nombre: 'Nombre visible sin principio explícito' } });
assert(nameOnlyRow.principio_activo === '', 'Nombre de fármaco no se reutiliza como principio activo');

exporter.copyTSVRowToClipboard = originalCopy;

console.log(`\n Total: ${passed} passed, 0 failed`);
