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
class FakeClassList {
  constructor(value = '') { this.values = new Set(String(value).split(/\s+/).filter(Boolean)); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) { const next = force === undefined ? !this.contains(value) : force; next ? this.add(value) : this.remove(value); return next; }
}
function field(value = '') {
  return { value, textContent: value, checked: false, disabled: false, options: [], selectedIndex: -1, classList: new FakeClassList() };
}
function setField(id, value = '') {
  if (!Object.hasOwn(elements, id)) throw new Error('ID ausente en farmacia_validacion.html: ' + id);
  elements[id] = field(value);
  return elements[id];
}
function setPauta(id, value, label) {
  if (!Object.hasOwn(elements, id)) throw new Error('ID ausente en farmacia_validacion.html: ' + id);
  elements[id] = field(value);
  elements[id].options = [{ value, textContent: label, text: label }];
  elements[id].selectedIndex = 0;
}

const validationHtml = fs.readFileSync(path.join(ROOT, 'farmacia_validacion.html'), 'utf8');
for (const match of validationHtml.matchAll(/<[^>]+id=["']([^"']+)["'][^>]*>/g)) {
  const className = (match[0].match(/class=["']([^"']*)["']/) || [])[1] || '';
  elements[match[1]] = field();
  elements[match[1]].classList = new FakeClassList(className);
}

let absentFieldRejected = false;
let absentPautaRejected = false;
try {
  setField('fhControlDeclaradoAusente', 'no debe crearse');
} catch (error) {
  absentFieldRejected = error.message.includes('ID ausente');
}
try {
  setPauta('fhPautaDeclaradaAusente', 'Q1D', 'Cada día');
} catch (error) {
  absentPautaRejected = error.message.includes('ID ausente');
}
assert(absentFieldRejected && absentPautaRejected && !Object.hasOwn(elements, 'fhControlDeclaradoAusente') && !Object.hasOwn(elements, 'fhPautaDeclaradaAusente'), 'setField y setPauta rechazan IDs ausentes sin recrearlos');

[
  'fhManualCip', 'fhManualFarmaco', 'fhManualPrincipioActivo', 'fhManualDosis', 'fhManualVia',
  'fhManualPauta', 'fhManualPautaOtro', 'fhValidadoFarmaco', 'fhValidadoPrincipioActivo',
  'fhValidadoDosis', 'fhValidadoVia', 'fhValidadoPauta', 'fhValidadoPautaOtro',
  'fhValidadoPresentacion', 'fhValidadoInduccion', 'fhValidadoJustificacion',
  'fhValEstado', 'fhTipoValidacion', 'fhValObservaciones',
  'fhValExportTxt', 'fhValExportCsv', 'fhValExcelExportBtn'
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
vm.runInContext(fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_pautas_catalog.js'), 'utf8'), sandbox);
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
setField('fhValidadoPresentacion', 'Jeringa precargada 20 mg');
setField('fhValidadoVia', 'IV');
setPauta('fhValidadoPauta', 'CADA_3_SEMANAS', 'Cada 3 semanas');
data = validation.buildValidationExcelExportData();
assert(data.slot === 'validacion.validado' && data.lineaActual.farmaco_nombre === 'Validado editado', 'Tratamiento validado explícito prevalece sobre solicitado');
assert(data.lineaActual.pauta_codigo === 'CADA_3_SEMANAS' && data.lineaActual.pauta_label === 'Cada 3 semanas' && data.lineaActual.pauta_otro_texto === '', 'Cada 3 semanas visible prevalece y conserva código/label');
const dosePresentationRow = exporter.buildExcelRowObject(exporter.buildContextFromValidacion(null, {
  lineaActual: data.lineaActual
}));
assert(
  dosePresentationRow.dosis_presentacion === '20 mg · Jeringa precargada 20 mg',
  'dosis_presentacion combina exactamente dosis y presentación visibles'
);

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
setField('fhManualJustificacion', 'Justificación clínica solicitada sintética');
setField('fhManualObservaciones', 'Observación de origen sintética');
setField('fhValidadoJustificacion', 'Observación FH sintética');
setField('fhValObservaciones', 'Otra observación del acto sintética');
setPauta('fhValidadoPauta', 'CADA_3_SEMANAS', 'Cada 3 semanas');
data = validation.buildValidationExcelExportData();
const deniedContext = exporter.buildContextFromValidacion(null, {
  resultado: data.resultadoValidacion,
  motivo: data.motivo,
  obsValidacion: data.obsValidacion
});
const deniedRow = exporter.buildExcelRowObject(deniedContext);
assert(deniedRow.motivo_inicio_cambio_suspension === 'Motivo denegado visible', 'Denegado exporta el motivo visible sin default');
assert(deniedRow.observaciones_validacion === 'Observación FH sintética', 'Observaciones FH se mapean a observaciones_validacion');
const generalObservations = validation.buildExcelGeneralObservations({}, '');
assert(generalObservations === 'Observación de origen sintética\n\nJustificación clínica solicitada: Justificación clínica solicitada sintética\n\nOtras observaciones del acto de validación: Otra observación del acto sintética', 'observación, justificación solicitada y observación del acto quedan etiquetadas/separadas en observaciones_generales');
const realExcelContext = exporter.buildContextFromValidacion(null, { cip: 'CIP-SINTETICO-158', resultado: data.resultadoValidacion, obsValidacion: data.obsValidacion });
realExcelContext.observaciones = validation.buildExcelGeneralObservations(realExcelContext, 'Resumen clínico sintético');
const realExcelRow = exporter.buildExcelRowObject(realExcelContext);
assert(exporter.buildExcelRowArray(realExcelRow).length === 61 && realExcelRow.observaciones_validacion === 'Observación FH sintética' && realExcelRow.observaciones_generales.includes('Justificación clínica solicitada: Justificación clínica solicitada sintética') && realExcelRow.observaciones_generales.includes('Resumen clínico sintético'), 'fila Excel real conserva 61 columnas, FH exclusiva y bloques generales separados');
const csv = validation.buildCsvRows();
const csvHeaders = csv[0];
const csvValues = csv[1];
const validationSource = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_validacion.js'), 'utf8');
assert(validationSource.includes('lines.push("Observaciones de Farmacia Hospitalaria: " + validado.observacionesFh)') && validationSource.includes('lines.push("Otras observaciones del acto de validación: " + valueOrDash(byId("fhValObservaciones").value))'), 'JARA etiqueta por separado observaciones FH y otras observaciones del acto');
assert(validationSource.includes('populatePautaSelect("fhDigPauta", "fhDigPautaOtro")') && validationSource.includes('"fhDigPauta", "fhDigPautaOtro", "fhDigObservaciones"'), 'Digestivo puebla pauta desde catálogo y vincula sus cambios al resumen/export');
assert(csvValues[csvHeaders.indexOf('ObservacionesFarmaciaHospitalaria')] === 'Observación FH sintética' && csvValues[csvHeaders.indexOf('OtrasObservacionesActoValidacion')] === 'Otra observación del acto sintética', 'CSV separa observaciones FH y otras observaciones del acto');
assert(csvValues[csvHeaders.indexOf('PautaValidadaCodigo')] === 'CADA_3_SEMANAS' && csvValues[csvHeaders.indexOf('PautaValidadaLabel')] === 'Cada 3 semanas', 'CSV conserva Cada 3 semanas del tratamiento validado visible');

setField('fhOrigenEntrada', 'digestivo');
setField('fhDigCip', 'CIP-SINTETICO-DIG');
setField('fhDigPatologia', 'Crohn');
setField('fhDigFecha', '2026-07-01');
setField('fhDigFarmaco', 'Tratamiento digestivo sintético');
setField('fhDigDosis', '300 mg');
setField('fhDigVia', 'IV');
setPauta('fhDigPauta', 'CADA_3_SEMANAS', 'Cada 3 semanas');
setField('fhValidadoFarmaco', ''); setField('fhValidadoPrincipioActivo', ''); setField('fhValidadoDosis', '');
setField('fhValidadoVia', ''); setPauta('fhValidadoPauta', '', 'Seleccionar...'); setField('fhValidadoPresentacion', '');
const digestData = validation.buildValidationExcelExportData();
const digestJara = validation.buildValidationLines().join('\n');
const digestCsv = validation.buildCsvRows();
const digestHeaders = digestCsv[0]; const digestValues = digestCsv[1];
const currentIsoDate = new Date().toISOString().substring(0, 10);
const digestContext = exporter.buildContextFromValidacion(null, { cip: digestData.cip, servicio: digestData.servicio, patologia: digestData.patologia, resultado: digestData.resultadoValidacion, lineaActual: digestData.lineaActual, fechaActo: currentIsoDate });
const digestRow = exporter.buildExcelRowObject(digestContext);
assert(digestJara.includes('Servicio origen: Digestivo') && digestJara.includes('Fecha solicitud: 2026-07-01') && digestJara.includes('Fármaco solicitado: Tratamiento digestivo sintético') && digestJara.includes('Pauta: Cada 3 semanas'), 'JARA Digestivo usa servicio, fecha y tratamiento de controles fhDig*');
assert(digestValues[digestHeaders.indexOf('Fecha')] === '2026-07-01' && digestValues[digestHeaders.indexOf('Servicio')] === 'Digestivo' && digestValues[digestHeaders.indexOf('FarmacoSolicitado')] === 'Tratamiento digestivo sintético' && digestValues[digestHeaders.indexOf('PautaCodigo')] === 'CADA_3_SEMANAS', 'CSV Digestivo mantiene paridad con fecha y controles fhDig*');
assert(digestData.fechaSolicitud === '2026-07-01' && digestData.servicio === 'Digestivo' && digestData.patologia === 'Crohn' && digestData.lineaActual.farmaco_nombre === 'Tratamiento digestivo sintético' && digestData.lineaActual.pauta_codigo === 'CADA_3_SEMANAS' && digestRow.fecha_acto === currentIsoDate && digestRow.fecha_acto !== digestData.fechaSolicitud && digestRow.servicio_origen === 'Digestivo' && digestRow.marca_comercial === 'Tratamiento digestivo sintético', 'Excel Digestivo conserva contexto, tratamiento y pauta sin forzar fecha_acto a fecha de solicitud');
assert(validationSource.includes('fechaActo: new Date().toISOString().substring(0, 10)') && !validationSource.includes('fechaActo: exportData.fechaSolicitud ||'), 'exportación Excel usa la fecha ISO actual para fecha_acto');

setField('fhOrigenEntrada', 'manual_farmacia');

setField('fhManualCip', '');
setField('fhValEstado', 'pending');
data = validation.buildValidationExcelExportData();
validation.updateValidationExportAvailability();
assert(data.cip === '' && !data.canCopy, 'CIP vacío no recibe fallback y bloquea datos Excel');
assert(elements.fhValExportTxt.disabled && elements.fhValExportCsv.disabled && elements.fhValExcelExportBtn.disabled, 'CIP vacío deshabilita JARA, CSV y Excel');
setField('fhManualCip', 'CIP-LITERAL-SINTETICO-SIN-FORMATO');
data = validation.buildValidationExcelExportData();
validation.updateValidationExportAvailability();
assert(data.cip === 'CIP-LITERAL-SINTETICO-SIN-FORMATO' && data.canCopy, 'cualquier CIP sintético literal no vacío habilita los datos de exportación');
assert(!elements.fhValExportTxt.disabled && !elements.fhValExportCsv.disabled && !elements.fhValExcelExportBtn.disabled, 'CIP no vacío y estado conocido habilitan JARA, CSV y Excel');
assert(/fhValExportTxt[\s\S]*if \(!ensureCipForExport\(\)\) return;[\s\S]*fhValExportCsv[\s\S]*if \(!ensureCipForExport\(\)\) return;/.test(validationSource), 'handlers JARA y CSV vuelven a validar CIP ante ejecución programática');

setField('fhValEstado', 'desconocido');
data = validation.buildValidationExcelExportData();
assert(!data.canCopy && data.resultadoValidacion === '' && data.estadoRegistro === '', 'datos de exportación desconocidos no aplican fallback validado');

console.log('\n Total: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
