#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'farmacia_validacion.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_validacion.js'), 'utf8');
let passed = 0;
let failed = 0;
function check(condition, label) {
  console.log('  ' + (condition ? '✓ ' : '✗ ') + label);
  condition ? passed++ : failed++;
}

class FakeClassList {
  constructor(value = '') { this.values = new Set(String(value).split(/\s+/).filter(Boolean)); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) { const next = force === undefined ? !this.contains(value) : force; next ? this.add(value) : this.remove(value); return next; }
}
class FakeElement {
  constructor(id, classes = '') {
    this.id = id; this.value = ''; this.textContent = ''; this.checked = false;
    this.options = [{ value: '', text: 'Seleccionar...', textContent: 'Seleccionar...' }];
    this.selectedIndex = 0; this.classList = new FakeClassList(classes); this.listeners = {};
  }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  querySelector() { return null; }
  setAttribute(name, value) { this[name] = String(value); }
  removeAttribute(name) { delete this[name]; }
}
const elements = Object.create(null);
for (const match of html.matchAll(/<[^>]+id=["']([^"']+)["'][^>]*>/g)) {
  const classes = (match[0].match(/class=["']([^"']*)["']/) || [])[1] || '';
  elements[match[1]] = new FakeElement(match[1], classes);
}
function el(id) { return elements[id] ||= new FakeElement(id); }
function set(id, value) { el(id).value = value; el(id).textContent = value; }
function select(id, value, text = value) { set(id, value); el(id).options = [{ value, text, textContent: text }]; el(id).selectedIndex = 0; }

const sandbox = {
  console, Date, Array, Event: class Event {}, setTimeout: () => 0, clearTimeout: () => {}, alert: () => {}, navigator: {},
  document: {
    getElementById: (id) => el(id), addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [],
    createElement: (tag) => new FakeElement(tag), activeElement: null
  }
};
sandbox.window = sandbox;
sandbox.FarmaciaDemo = { clearChildren() {}, getQueryContext: () => ({}) };
sandbox.FarmaciaCatalog = { getSnapshot: () => null };
sandbox.FarmaciaValidationModel = {};
sandbox.FarmaciaPautasCatalog = {};
vm.createContext(sandbox);
vm.runInContext(js, sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'scripts/farmacia_excel_row_export.js'), 'utf8'), sandbox);
const validation = sandbox.FarmaciaValidacion;
const excel = sandbox.FarmaciaExcelRowExport;

select('fhOrigenEntrada', 'manual_farmacia', 'Entrada manual - Farmacia');
select('fhServicioManual', 'derma', 'Dermatología');
select('fhTipoValidacion', 'inicio_nuevo', 'Inicio de nuevo fármaco');
select('fhValEstado', 'pending', 'Pendiente');
set('fhValFarmaceutico', 'Profesional FH demo');
set('fhManualCip', 'CIP-SINTETICO-DERMA');
const blockMap = {
  'Hidradenitis supurativa': 'formHS', Psoriasis: 'formPsoriasis',
  'Dermatitis atópica': 'formDermatitisAtopica', 'Vitíligo': 'formVitiligo',
  'Alopecia areata': 'formAlopecia'
};
function activate(pathology) {
  select('fhPatologiaManual', pathology, pathology);
  validation.updateDermaPathologyVisibility();
  return validation.buildDermaClinicalSummary();
}
function onlyVisible(expected) {
  return Object.values(blockMap).every((id) => el(id).classList.contains('hidden') === (id !== expected));
}
function commonVisible() { return !el('formDermaComorbilidades').classList.contains('hidden'); }

console.log('\n=== Dermatología multipatología — matriz issue #174 ===');
let summary = activate('Hidradenitis supurativa');
check(onlyVisible('formHS') && commonVisible(), '1. HS visible; otras cuatro ocultas; comorbilidades visibles');
check(summary.summary.includes('Doxiciclina / Clindamicina: No informado') && !summary.summary.includes('Doxiciclina / Clindamicina: No;'), '7. checkbox HS sin marcar = No informado, nunca No');
set('fhHSIhs4', '0'); el('fhHSTtoDoxiClinda').checked = true;
let v2Observations = validation.buildValidationClinicalObservationsV2();
check(v2Observations.some((item) => item.code === 'hs_ihs4' && item.value === '0') && v2Observations.some((item) => item.code === 'hs_previous_doxycycline_clindamycin' && item.value === 'yes'), 'v2 preserva 0 y codifica tratamientos previos como observaciones');
check(v2Observations.every((item) => item.source === 'validation_origin_form' && item.pathology_label === 'Hidradenitis supurativa' && item.value !== 'No informado'), 'v2 omite placeholders y conserva provenance/patología');

set('fhPsPasi', '14.2'); set('fhPsBsa', '18 %'); set('fhPsDlqi', '16'); set('fhPsPga', '4');
select('fhPsSistemicoPrevio', 'si', 'Sí'); set('fhPsSistemicoFarmaco', 'Fármaco previo sintético'); set('fhPsSistemicoDuracion', '8 meses'); set('fhPsSistemicoMotivo', 'Respuesta insuficiente');
summary = activate('Psoriasis');
check(onlyVisible('formPsoriasis') && commonVisible() && !el('fhPsSistemicoSiDetalle').classList.contains('hidden') && el('fhPsSistemicoNoDetalle').classList.contains('hidden') && ['PASI: 14.2', 'BSA: 18 %', 'DLQI: 16', 'PGA: 4'].every((v) => summary.summary.includes(v)), '2/6. Psoriasis única, exporta PASI/BSA/DLQI/PGA y muestra rama Sí');
select('fhPsSistemicoPrevio', 'no', 'No'); set('fhPsSistemicoNoMotivo', 'Contraindicación sintética');
validation.updateDermaPathologyVisibility(); summary = validation.buildDermaClinicalSummary();
check(el('fhPsSistemicoSiDetalle').classList.contains('hidden') && !el('fhPsSistemicoNoDetalle').classList.contains('hidden') && summary.summary.includes('Tratamiento sistémico previo: No') && summary.summary.includes('Motivo de no utilización o contraindicación: Contraindicación sintética') && !['Fármaco previo:', 'Duración: 8 meses', 'Motivo de cambio/suspensión:'].some((v) => summary.summary.includes(v)), 'Psoriasis Sí → No muestra/exporta solo rama No, sin detalle Sí obsoleto');
select('fhPsSistemicoPrevio', '', 'No informado'); validation.updateDermaPathologyVisibility(); summary = validation.buildDermaClinicalSummary();
check(el('fhPsSistemicoSiDetalle').classList.contains('hidden') && el('fhPsSistemicoNoDetalle').classList.contains('hidden') && summary.summary.includes('Tratamiento sistémico previo: No informado') && !summary.summary.includes('Contraindicación sintética') && !summary.summary.includes('Fármaco previo:'), 'Psoriasis No → No informado oculta/excluye detalles de ambas ramas');

set('fhDaEasi', '22'); set('fhDaScorad', '48'); set('fhDaDlqiPoem', 'POEM 19'); select('fhDaCiclosporinaPrevia', 'si', 'Sí'); set('fhDaCiclosporinaDosis', '3 mg/kg'); set('fhDaCiclosporinaDuracion', '6 meses'); set('fhDaCiclosporinaMotivo', 'Intolerancia sintética');
summary = activate('Dermatitis atópica');
check(onlyVisible('formDermatitisAtopica') && commonVisible() && !el('fhDaCiclosporinaSiDetalle').classList.contains('hidden') && el('fhDaCiclosporinaNoDetalle').classList.contains('hidden') && ['EASI: 22', 'SCORAD: 48', 'DLQI o POEM: POEM 19'].every((v) => summary.summary.includes(v)), '3/6. DA única, exporta EASI/SCORAD/DLQI-POEM y muestra rama Sí');
check(!summary.summary.includes('PASI:') && !summary.summary.includes('14.2'), '8. Psoriasis → DA no filtra valores de Psoriasis');
select('fhDaCiclosporinaPrevia', 'no', 'No'); set('fhDaCiclosporinaNoMotivo', 'Contraindicación DA sintética'); validation.updateDermaPathologyVisibility(); summary = validation.buildDermaClinicalSummary();
check(el('fhDaCiclosporinaSiDetalle').classList.contains('hidden') && !el('fhDaCiclosporinaNoDetalle').classList.contains('hidden') && summary.summary.includes('Ciclosporina previa: No') && summary.summary.includes('Motivo de no utilización o contraindicación: Contraindicación DA sintética') && !['Dosis: 3 mg/kg', 'Duración: 6 meses', 'Motivo de suspensión:'].some((v) => summary.summary.includes(v)), 'DA Sí → No muestra/exporta solo rama No, sin detalle Sí obsoleto');
select('fhDaCiclosporinaPrevia', '', 'No informado'); validation.updateDermaPathologyVisibility(); summary = validation.buildDermaClinicalSummary();
check(el('fhDaCiclosporinaSiDetalle').classList.contains('hidden') && el('fhDaCiclosporinaNoDetalle').classList.contains('hidden') && summary.summary.includes('Ciclosporina previa: No informado') && !summary.summary.includes('Motivo de suspensión:'), '7. DA No → No informado oculta y omite ambas ramas');
check(!summary.summary.includes('Contraindicación DA sintética') && !summary.summary.includes('Dosis: 3 mg/kg'), 'DA No informado excluye detalles de ambas ramas');

set('fhVitExtension', '12 %'); select('fhVitFacial', 'si', 'Sí'); select('fhVitCalcineurinaPrevia', 'no', 'No'); select('fhVitCorticoidesPrevios', '', 'No informado'); set('fhVitObservaciones', 'Observación sintética vitíligo');
summary = activate('Vitíligo');
check(onlyVisible('formVitiligo') && commonVisible() && ['Extensión afectada: 12 %', 'Afectación facial: Sí', 'Inhibidor tópico de calcineurina previo: No', 'Corticoides tópicos previos: No informado', 'Observaciones clínicas: Observación sintética vitíligo'].every((v) => summary.summary.includes(v)), '4/6. Vitíligo único exporta cuatro campos, observaciones y comunes');

select('fhAaExtension50', 'si', 'Sí'); select('fhAaEpisodio6Meses', 'no', 'No'); select('fhAaCorticoidesSistemicos', '', 'No informado'); set('fhAaObservaciones', 'Observación sintética alopecia');
summary = activate('Alopecia areata');
check(onlyVisible('formAlopecia') && commonVisible() && ['Extensión superior al 50 % del cuero cabelludo: Sí', 'Episodio actual superior a 6 meses: No', 'Corticoesteroides orales sistémicos en monoterapia o con inmunosupresores: No informado', 'Observaciones clínicas: Observación sintética alopecia'].every((v) => summary.summary.includes(v)), '5/6. Alopecia única exporta tres decisiones, observaciones y comunes');

set('fhHSComorbImc', '24.1'); set('fhHSComorbTabaquismo', 'No fumador'); set('fhHSComorbPaquetes', '0'); select('fhHSComorbDiabetes', 'no', 'No'); set('fhHSComorbHba1c', '5.2 %'); select('fhHSComorbSdMetabolico', '', 'No informado'); set('fhHSComorbOtras', 'Ninguna informada');
select('fhDermaComorbInfeccionesRecurrentes', 'si', 'Sí'); select('fhDermaComorbRiesgoCardiovascular', 'no', 'No');
select('fhDermaComorbAlteracionesNeurologicas', '', 'No informado'); select('fhDermaComorbRiesgoNeoplasia', 'si', 'Sí');
summary = validation.buildDermaClinicalSummary();
const jara = validation.buildValidationLines().join('\n');
const csvRows = validation.buildCsvRows();
const csvSummary = csvRows[1][csvRows[0].indexOf('ResumenClinicoDermatologia')];
const context = excel.buildContextFromValidacion(null, { servicio: 'Dermatología', patologia: 'Alopecia areata', resultado: 'pendiente', estadoRegistro: 'pendiente' });
context.observaciones = summary.summary;
const row = excel.buildExcelRowObject(context);
check(jara.includes(summary.summary) && csvSummary === summary.summary && row.observaciones_generales.replace(/\s+/g, ' ') === summary.summary.replace(/\s+/g, ' '), '9. JARA, CSV y Excel consumen el mismo resumen');
check(['Infecciones recurrentes: Sí', 'Riesgo o antecedentes cardiovasculares: No', 'Alteraciones neurológicas: No informado', 'Antecedentes o riesgo de neoplasia: Sí'].every((value) => summary.summary.includes(value)), 'cuatro comorbilidades trivalentes entran en el resumen común');
check(csvRows[1][csvRows[0].indexOf('InfeccionesRecurrentes')] === 'Sí' && csvRows[1][csvRows[0].indexOf('RiesgoOAntecedentesCardiovasculares')] === 'No' && csvRows[1][csvRows[0].indexOf('AlteracionesNeurologicas')] === 'No informado' && csvRows[1][csvRows[0].indexOf('AntecedentesORiesgoNeoplasia')] === 'Sí', 'CSV conserva valores trivalentes de las cuatro comorbilidades');
check(csvRows[0].at(-1) === 'ResumenClinicoDermatologia' && csvRows.length === 2 && csvRows[0].length === csvRows[1].length, 'CSV añade exactamente una columna final y conserva una fila');
check(excel.WO8_COLUMNS.length === 61 && excel.buildExcelRowArray(row).length === 61 && row.observaciones_generales.includes('Infecciones recurrentes: Sí') && !row.observaciones_validacion, '10. Excel conserva 61 columnas y usa observaciones_generales para el resumen común');

select('fhOrigenEntrada', 'demo_formacion', 'Demo / Formación'); select('fhDermaPatologia', 'Vitíligo', 'Vitíligo'); set('fhDermaCip', 'CIP-SINTETICO-NONMANUAL');
validation.updateDermaPathologyVisibility();
const nonmanualSummary = validation.buildDermaClinicalSummary();
const nonmanualJara = validation.buildValidationLines().join('\n');
const nonmanualCsv = validation.buildCsvRows();
const nonmanualData = validation.buildValidationExcelExportData();
const nonmanualContext = excel.buildContextFromValidacion(null, { servicio: 'Dermatología', patologia: 'Vitíligo', resultado: 'pendiente' });
nonmanualContext.observaciones = validation.buildExcelGeneralObservations(nonmanualContext, nonmanualData.dermaClinicalSummary);
const nonmanualRow = excel.buildExcelRowObject(nonmanualContext);
check(onlyVisible('formVitiligo') && commonVisible() && nonmanualSummary.pathology === 'Vitíligo', 'No manual Dermatología resuelve fhDermaPatologia y muestra un bloque/comunes');
check(nonmanualJara.includes(nonmanualSummary.summary) && nonmanualCsv[1].at(-1) === nonmanualSummary.summary && nonmanualRow.observaciones_generales.replace(/\s+/g, ' ') === nonmanualSummary.summary.replace(/\s+/g, ' '), 'No manual mantiene paridad active-only JARA/CSV/Excel');

select('fhOrigenEntrada', 'manual_farmacia', 'Entrada manual - Farmacia'); select('fhServicioManual', 'derma', 'Dermatología');
set('fhManualFarmaco', 'Tratamiento sintético no clínico'); set('fhPsPasi', '');
summary = activate('Psoriasis');
check(summary.summary.includes('PASI: No informado') && !summary.summary.includes('Tratamiento sintético no clínico'), '12. no hay inferencia desde tratamiento o catálogo');
set('fhManualObservaciones', 'Observación origen manual explícita');
const mergedManual = validation.buildExcelGeneralObservations({ observaciones: '' }, summary.summary);
const mergedManualRow = excel.buildExcelRowObject({ observaciones: mergedManual });
check(mergedManual.includes('Observación origen manual explícita') && mergedManual.includes(summary.summary) && mergedManual.indexOf('Observación origen manual explícita') === mergedManual.lastIndexOf('Observación origen manual explícita') && mergedManualRow.observaciones_generales, 'Excel manual Dermatología preserva observación explícita y resumen sin duplicar');
const activeDermaV2 = validation.buildValidationV2Input({});
check(activeDermaV2.comorbidities.recurrentInfectionsStatus === 'si' && activeDermaV2.comorbidities.cardiovascularRiskStatus === 'no' && activeDermaV2.comorbidities.neurologicDisorderStatus === null && activeDermaV2.comorbidities.neoplasiaHistoryOrRiskStatus === 'si', 'v2 incluye comorbilidades comunes solo con patología Dermatología activa');

for (const service of ['reuma', 'digestivo']) {
  select('fhServicioManual', service, service); select('fhPatologiaManual', service === 'reuma' ? 'AR' : 'Crohn');
  validation.updateDermaPathologyVisibility();
  const data = validation.buildValidationExcelExportData();
  const rows = validation.buildCsvRows();
  check(validation.buildDermaClinicalSummary().summary === '' && validation.buildValidationClinicalObservationsV2() === null && data.dermaClinicalSummary === '' && rows[1].at(-1) === '' && el('formDermaComorbilidades').classList.contains('hidden'), '11. ' + service + ' queda sin observaciones/resumen Dermatología y oculta comunes');
  const nonDermaV2 = validation.buildValidationV2Input({});
  check(Object.values(nonDermaV2.comorbidities).every((value) => value === null), 'v2 ' + service + ' no filtra comorbilidades Dermatología residuales ocultas');
}
select('fhOrigenEntrada', 'digestivo', 'Digestivo'); set('fhDigObservaciones', 'Observación Digestivo explícita');
let general = validation.buildExcelGeneralObservations({ observaciones: '' }, '');
check(general === 'Observación Digestivo explícita' && excel.buildExcelRowObject({ observaciones: general }).observaciones_generales === general, 'Excel no manual Digestivo preserva observación explícita sin resumen Derm');
set('fhDigObservaciones', ''); general = validation.buildExcelGeneralObservations({ observaciones: '' }, '');
check(general === '' && excel.buildExcelRowObject({ observaciones: general }).observaciones_generales === '', 'Excel no Derm vacío permanece vacío');
select('fhOrigenEntrada', 'reuma', 'Reumatología'); general = validation.buildExcelGeneralObservations({ patient: { observaciones: 'Observación Reuma existente' } }, '');
check(general === 'Observación Reuma existente', 'Excel Reuma preserva observación existente del contexto/paciente sin inventar');
check(/var context = exp\.buildContextFromValidacion\(patient, opts\);\s*context\.observaciones = buildExcelGeneralObservations\(context, exportData\.dermaClinicalSummary\);\s*var rowObj = exp\.buildExcelRowObject\(context\);/.test(js), 'Excel resuelve observaciones generales antes de construir fila');
check(!js.includes('context.observaciones_validacion = exportData.dermaClinicalSummary'), 'resumen clínico nunca se inyecta en observaciones_validacion');

console.log(`\nTotal: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
