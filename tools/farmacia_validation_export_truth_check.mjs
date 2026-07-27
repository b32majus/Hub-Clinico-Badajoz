#!/usr/bin/env node
// Verifica que Validación exporta exclusivamente el estado y tratamiento visibles.

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log('  \u2713 ' + label);
    passed++;
  } else {
    console.log('  \u2717 ' + label);
    failed++;
  }
}

const elements = Object.create(null);
function field(value = '') {
  return { value, textContent: value, options: [], selectedIndex: -1 };
}
function setField(id, value = '') {
  elements[id] = field(value);
  return elements[id];
}
function setPauta(id, value, label) {
  elements[id] = field(value);
  elements[id].options = [{ value, textContent: label, text: label }];
  elements[id].selectedIndex = 0;
}

[
  'fhManualCip', 'fhManualFarmaco', 'fhManualPrincipioActivo', 'fhManualDosis', 'fhManualVia',
  'fhManualPauta', 'fhManualPautaOtro', 'fhValidadoFarmaco', 'fhValidadoPrincipioActivo',
  'fhValidadoDosis', 'fhValidadoVia', 'fhValidadoPauta', 'fhValidadoPautaOtro',
  'fhValidadoPresentacion', 'fhValEstado', 'fhTipoValidacion', 'fhValObservaciones'
].forEach((id) => setField(id));
setField('fhOrigenEntrada', 'manual_farmacia');
setField('fhServicioManual', 'reuma');
setField('fhPatologiaManual', 'AR');
setField('fhValFarmaceutico', 'Profesional FH visible');
setField('fhValMotivo', 'Motivo denegado visible');
setField('fhManualCip', 'CIP-SINTETICO-158');

let snapshot = null;
let snapshotContext = null;
const sandbox = {
  console,
  Date,
  Event: class Event {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  alert: () => {},
  navigator: {},
  document: {
    getElementById: (id) => elements[id] || null,
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  }
};
sandbox.window = sandbox;
sandbox.FarmaciaDemo = {};
sandbox.FarmaciaCatalog = {
  getSnapshot(context) {
    snapshotContext = context;
    return snapshot;
  }
};
sandbox.FarmaciaValidationModel = {};
sandbox.FarmaciaPautasCatalog = {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_validacion.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_excel_row_export.js'), 'utf8'), sandbox);

const validation = sandbox.FarmaciaValidacion;
const exporter = sandbox.FarmaciaExcelRowExport;

const pending = validation.normalizeValidationExportStatus('pending');
const validated = validation.normalizeValidationExportStatus('validado');
const denied = validation.normalizeValidationExportStatus('denied');
const unknown = validation.normalizeValidationExportStatus('desconocido');
const absent = validation.normalizeValidationExportStatus('');
assert(pending.resultadoValidacion === 'pendiente' && pending.estadoRegistro === 'pendiente' && pending.canCopy, 'pending -> pendiente/pendiente y permite copia');
assert(validated.resultadoValidacion === 'validado' && validated.estadoRegistro === 'completado' && validated.canCopy, 'validado -> validado/completado');
assert(denied.resultadoValidacion === 'denegado' && denied.estadoRegistro === 'completado' && denied.canCopy, 'denied -> denegado/completado');
assert(unknown.resultadoValidacion === '' && unknown.estadoRegistro === '' && !unknown.canCopy, 'resultado desconocido queda vacío y bloquea copia');
assert(absent.resultadoValidacion === '' && absent.estadoRegistro === '' && !absent.canCopy, 'resultado ausente queda vacío y bloquea copia');

[
  [validated, 'validado', 'completado'],
  [denied, 'denegado', 'completado']
].forEach(([status, result, recordState]) => {
  const statusRow = exporter.buildExcelRowObject(exporter.buildContextFromValidacion(null, {
    resultado: status.resultadoValidacion,
    estadoRegistro: status.estadoRegistro,
    fechaActo: '2026-07-27'
  }));
  assert(statusRow.resultado_validacion === result && statusRow.estado_registro === recordState, 'fila conserva ' + result + '/' + recordState);
});

setField('fhValEstado', 'pending');
setField('fhTipoValidacion', 'switch_cambio');
setField('fhManualFarmaco', 'Solicitado visible');
setField('fhManualPrincipioActivo', 'PA solicitado visible');
setField('fhManualDosis', '10 mg');
setField('fhManualVia', 'SC');
setPauta('fhManualPauta', 'Q14D', 'Cada 14 días');
let data = validation.buildValidationExcelExportData();
assert(data.slot === 'validacion.solicitado' && data.lineaActual.farmaco_nombre === 'Solicitado visible', 'usa Tratamiento solicitado cuando Tratamiento validado está vacío');
assert(data.lineaActual.pauta_codigo === 'Q14D' && data.lineaActual.pauta_label === 'Cada 14 días', 'la pauta procede de la selección visible');

setField('fhValidadoFarmaco', 'Validado editado');
setField('fhValidadoPrincipioActivo', 'PA validado editado');
setField('fhValidadoDosis', '20 mg');
setField('fhValidadoVia', 'IV');
setPauta('fhValidadoPauta', 'OTRO', 'Otra pauta');
setField('fhValidadoPautaOtro', 'Pauta profesional visible');
data = validation.buildValidationExcelExportData();
assert(data.slot === 'validacion.validado' && data.lineaActual.farmaco_nombre === 'Validado editado', 'Tratamiento validado explícito prevalece sobre solicitado');
assert(data.lineaActual.pauta_otro_texto === 'Pauta profesional visible', 'edición profesional visible de pauta prevalece');

snapshot = {
  selected_drug_id: 'CAT-SINTETICO-1', source_type: 'CIMA', nombre_snapshot: 'Validado editado',
  codigo_nacional_snapshot: 'CN-SINTETICO', nregistro_snapshot: 'NR-SINTETICO'
};
data = validation.buildValidationExcelExportData();
assert(snapshotContext && Object.keys(snapshotContext).sort().join(',') === 'cip,slot' && snapshotContext.cip === 'CIP-SINTETICO-158', 'snapshot usa contexto actual exacto {slot,cip}');
assert(data.lineaActual.source_type === 'CIMA' && data.lineaActual.codigo_nacional === 'CN-SINTETICO', 'identidad de catálogo acompaña al mismo nombre visible');

setField('fhValidadoFarmaco', 'Nombre profesional distinto');
data = validation.buildValidationExcelExportData();
assert(!data.lineaActual.source_type && !data.lineaActual.codigo_nacional && !data.lineaActual.nregistro, 'identidad de catálogo no acompaña a un nombre visible distinto');

function clearTreatment() {
  [
    'fhManualFarmaco', 'fhManualPrincipioActivo', 'fhManualDosis', 'fhManualVia', 'fhManualPauta',
    'fhManualPautaOtro', 'fhValidadoFarmaco', 'fhValidadoPrincipioActivo', 'fhValidadoDosis',
    'fhValidadoVia', 'fhValidadoPauta', 'fhValidadoPautaOtro', 'fhValidadoPresentacion'
  ].forEach((id) => setField(id));
}
clearTreatment();
snapshot = null;
data = validation.buildValidationExcelExportData();
assert(data.lineaActual === null, 'ambos bloques terapéuticos vacíos producen tratamiento vacío');

const context = exporter.buildContextFromValidacion(null, {
  patientId: data.cip,
  cip: data.cip,
  servicio: data.servicio,
  patologia: data.patologia,
  resultado: data.resultadoValidacion,
  estadoRegistro: data.estadoRegistro,
  lineaActual: data.lineaActual,
  profesional: data.profesional
});
const row = exporter.buildExcelRowObject(context);
const lineFields = ['tratamiento_id', 'linea_id', 'marca_comercial', 'principio_activo', 'source_type', 'tipo_relacion', 'estado_linea', 'tipo_movimiento', 'es_principal', 'fecha_inicio'];
assert(lineFields.every((name) => row[name] === ''), 'campos de línea ausentes permanecen vacíos sin defaults');
assert(row.resultado_validacion === 'pendiente' && row.estado_registro === 'pendiente', 'fila conserva el resultado pendiente visible');

setField('fhValEstado', 'denied');
setField('fhValObservaciones', 'Observación visible sintética');
data = validation.buildValidationExcelExportData();
const deniedContext = exporter.buildContextFromValidacion(null, {
  resultado: data.resultadoValidacion,
  motivo: data.motivo,
  obsValidacion: data.obsValidacion
});
const deniedRow = exporter.buildExcelRowObject(deniedContext);
assert(deniedRow.motivo_inicio_cambio_suspension === 'Motivo denegado visible', 'Denegado exporta el motivo visible sin default');
assert(deniedRow.observaciones_validacion === 'Observación visible sintética', 'observaciones visibles permanecen en observaciones_validacion');

setField('fhValEstado', 'desconocido');
data = validation.buildValidationExcelExportData();
assert(!data.canCopy && data.resultadoValidacion === '' && data.estadoRegistro === '', 'datos de exportación desconocidos no aplican fallback validado');

console.log('\n Total: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
