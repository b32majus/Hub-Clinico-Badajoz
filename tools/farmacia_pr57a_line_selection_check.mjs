#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const js = fs.readFileSync(path.join(root, 'scripts/farmacia_seguimiento.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'farmacia_seguimiento.html'), 'utf8');
let failed = 0;
function assert(value, label) {
  console.log(`${value ? '✓' : '✗'} ${label}`);
  if (!value) failed++;
}

const classList = () => ({ add() {}, remove() {}, toggle() {}, contains() { return false; } });
function element(tag = 'div') {
  return {
    tagName: tag.toUpperCase(), className: '', value: '', textContent: '', children: [], options: [], dataset: {},
    classList: classList(), disabled: false, checked: false,
    appendChild(child) { this.children.push(child); if (this.tagName === 'SELECT') this.options.push(child); return child; },
    remove(index) { this.options.splice(index, 1); },
    addEventListener(type, handler) { this[`on${type}`] = handler; },
    setAttribute() {}
  };
}
const ids = [
  'fhSegCip', 'fhSegLineaPrincipal', 'fhSegLineCards', 'fhSegEstadoLinea', 'fhSegTratamientoGrid',
  'fhSegFarmaco', 'fhSegPrincipioActivo', 'fhSegPresentacion', 'fhSegDosisActual', 'fhSegVia',
  'fhSegPautaActual', 'fhSegPautaActualOtro', 'fhSegFechaInicio', 'fhSegCodigoNacional',
  'fhSegNregistro', 'fhSegEtiquetas', 'fhSegOrigenCatalogo', 'fhSegCimaContextPrincipioActivo'
];
const elements = Object.fromEntries(ids.map((id) => [id, element(id === 'fhSegLineaPrincipal' || id === 'fhSegPautaActual' ? 'select' : 'div')]));
const cardInputs = () => elements.fhSegLineCards.children.flatMap((card) => card.children.filter((child) => child.tagName === 'INPUT'));
const document = {
  addEventListener() {},
  getElementById(id) { return elements[id] || null; },
  querySelector() { return null; },
  querySelectorAll(selector) { return selector.includes('fhSegLineCardSelection') ? cardInputs() : []; },
  createElement(tag) { return element(tag); }
};
let lastSummary = null;
const F = {
  clearChildren(el) { if (el) { el.children = []; el.options = []; } },
  renderFields(container, fields) { lastSummary = { container, fields }; },
  setText(id, value) { if (elements[id]) elements[id].textContent = value; }
};
const snapshots = {
  'CIP-DEMO-FH-004|BIO-FH-004-L2': { principio_activo_snapshot: 'Belimumab CIMA', presentacion_snapshot: 'Jeringa L2', codigo_nacional_snapshot: 'CN-L2', nregistro_snapshot: 'NR-L2', source_type: 'CIMA' },
  'CIP-DEMO-FH-004|BIO-FH-004-L3': { principio_activo_snapshot: 'Rituximab CIMA', presentacion_snapshot: 'Vial L3', codigo_nacional_snapshot: 'CN-L3', nregistro_snapshot: 'NR-L3', source_type: 'CIMA' }
};
const sandbox = { window: {
  FarmaciaDemo: F,
  FarmaciaPautasCatalog: { normalizePautaLabel: (value) => ({ pauta_codigo: value }) },
  FarmaciaCatalog: { mapCatalogViaToSelect: (value) => value, getSnapshot: (ctx) => snapshots[`${ctx.cip}|${ctx.linea_id}`] || null }
}, document, console, Event: function Event(type) { this.type = type; }, setTimeout, clearTimeout };
vm.createContext(sandbox);
vm.runInContext(js, sandbox);
const api = sandbox.window.FarmaciaSeguimiento;

const p1 = { cip: 'CIP-DEMO-FH-001', farmaco: 'Secukinumab 300 mg', principioActivo: 'Secukinumab', dosis: '300 mg', via: 'SC', pauta: 'SC / cada 4 semanas' };
const p2 = { cip: 'CIP-DEMO-FH-002', farmaco: 'Tratamiento solicitado' };
const p3 = { cip: 'CIP-DEMO-FH-003', farmaco: 'Adalimumab 40 mg', dosis: '40 mg', via: 'SC', pauta: 'SC / cada 2 semanas' };
const p4 = {
  cip: 'CIP-DEMO-FH-004',
  biologicos: [
    { linea_id: 'BIO-FH-004-L1', nombre_linea: 'Abatacept', nombre_comercial: 'Orencia', principio_activo: 'Abatacept', dosis: '125 mg', via: 'SC', pauta: 'Semanal', fecha_inicio: '2025-09-01', estado_linea: 'historico', tipo_relacion: 'cambio_terapeutico' },
    { linea_id: 'BIO-FH-004-L2', nombre_linea: 'Belimumab', nombre_comercial: 'Benlysta', principio_activo: 'Belimumab', dosis: '200 mg', via: 'SC', pauta: 'Semanal', fecha_inicio: '2026-02-20', estado_linea: 'activo', tipo_relacion: 'base' },
    { linea_id: 'BIO-FH-004-L3', nombre_linea: 'Rituximab', nombre_comercial: 'Rixathon', principio_activo: 'Rituximab', dosis: '1 g', via: 'IV', pauta: 'Cada 6 meses', fecha_inicio: '2026-05-28', estado_linea: 'añadido', tipo_relacion: 'tratamiento_añadido' }
  ]
};

const l1 = api.getCanonicalLinesForPatient(p1);
assert(JSON.stringify(l1.map((line) => [line.linea_id, line.estado_linea, line.tipo_relacion])) === JSON.stringify([
  ['BIO-FH-001-L1', 'active', 'primary']
]), 'FH-001 tiene identidad, estado y relación canónicos');
api.syncLinesForPatient(p1);
assert(api.getSelectedLine()?.linea_id === 'BIO-FH-001-L1' && elements.fhSegLineaPrincipal.value === 'BIO-FH-001-L1' && cardInputs().find((input) => input.value === 'BIO-FH-001-L1')?.checked, 'FH-001 autoselecciona por line_id su única línea activa');
assert(cardInputs().every((input) => input.type === 'checkbox'), 'las tarjetas usan checkboxes, no radios');
assert(elements.fhSegFarmaco.value === 'Secukinumab 300 mg' && elements.fhSegPrincipioActivo.value === 'Secukinumab' && elements.fhSegDosisActual.value === '300 mg', 'FH-001 carga el contexto exacto de Secukinumab');

const l2 = api.getCanonicalLinesForPatient(p2);
assert(JSON.stringify(l2) === '[]', 'FH-002 conserva el contrato canónico sin líneas');
api.syncLinesForPatient(p2);
assert(api.getSelectedLine() === null && elements.fhSegLineaPrincipal.value === '' && cardInputs().every((input) => !input.checked), 'FH-002 no se selecciona automáticamente');
const l3 = api.getCanonicalLinesForPatient(p3);
assert(l3.length === 1 && l3[0].linea_id === 'BIO-FH-003-L1' && l3[0].estado_linea === 'validated_not_started' && l3[0].tipo_relacion === 'primary', 'FH-003 conserva identidad, estado y relación canónicos');
assert(l3[0].farmaco_nombre === 'Adalimumab 40 mg' && l3[0].principio_activo === '', 'FH-003 conserva nombre visible sin inferir principio activo');
assert(l3[0].presentacion === '' && l3[0].dosis === '40 mg' && l3[0].via === 'SC' && l3[0].pauta === 'SC / cada 2 semanas', 'FH-003 conserva dosis, vía y pauta sin inferir presentación');
api.syncLinesForPatient(p3);
assert(api.getSelectedLine() === null && elements.fhSegLineaPrincipal.value === '' && cardInputs().some((input) => input.value === 'BIO-FH-003-L1' && input.disabled), 'FH-003 queda sin selección y con control deshabilitado');

const l4 = api.getCanonicalLinesForPatient(p4);
assert(JSON.stringify(l4.map((line) => [line.linea_id, line.tipo_relacion, line.estado_linea])) === JSON.stringify([
  ['BIO-FH-004-L1', 'primary', 'completed'], ['BIO-FH-004-L2', 'primary', 'active'], ['BIO-FH-004-L3', 'additional', 'active']
]), 'FH-004 conserva las tres relaciones y estados explícitos');
elements.fhSegCip.value = p4.cip;
api.syncLinesForPatient(p4);
const activeOptionIds = elements.fhSegLineaPrincipal.options.slice(1).map((option) => option.value);
assert(activeOptionIds.length === 0 && elements.fhSegLineaPrincipal.options.length === 1, 'FH-004 inicia con solo el placeholder del editor');
assert(api.getSelectedLine() === null && cardInputs().filter((input) => input.checked).length === 0, 'FH-004 con dos activas no tiene selección automática');
assert(cardInputs().every((input) => input.type === 'checkbox') && cardInputs().find((input) => input.value === 'BIO-FH-004-L1')?.disabled && cardInputs().filter((input) => !input.disabled).length === 2, 'solo las tarjetas activas son seleccionables mediante checkbox');

api.toggleLineSelection('BIO-FH-004-L2', true);
assert(JSON.stringify(elements.fhSegLineaPrincipal.options.slice(1).map((option) => option.value)) === JSON.stringify(['BIO-FH-004-L2']), 'al seleccionar L2 el editor ofrece solo L2');
api.toggleLineSelection('BIO-FH-004-L3', true);
assert(JSON.stringify(elements.fhSegLineaPrincipal.options.slice(1).map((option) => option.value)) === JSON.stringify(['BIO-FH-004-L2', 'BIO-FH-004-L3']) && cardInputs().filter((input) => input.checked).length === 2, 'L2 y L3 pueden quedar seleccionadas y son las únicas opciones del editor');
api.selectLineById('BIO-FH-004-L2');
assert(api.getSelectedLine().linea_id === 'BIO-FH-004-L2' && elements.fhSegFarmaco.value === 'Benlysta' && elements.fhSegPrincipioActivo.value === 'Belimumab CIMA', 'seleccionar L2 carga marca y principio snapshot exactos');
assert(elements.fhSegPresentacion.value === 'Jeringa L2' && elements.fhSegDosisActual.value === '200 mg' && elements.fhSegVia.value === 'SC' && elements.fhSegPautaActual.value === 'Semanal', 'L2 carga presentación, dosis, vía y pauta');
assert(elements.fhSegEstadoLinea.value === 'Activo' && elements.fhSegFechaInicio.value === '2026-02-20' && elements.fhSegCodigoNacional.value === 'CN-L2', 'L2 carga estado, fecha e identidad CIMA');
assert(lastSummary?.container === elements.fhSegTratamientoGrid && lastSummary.fields.some((field) => field.value === 'Belimumab'), 'L2 actualiza el destino del resumen terapéutico');
api.selectLineById('BIO-FH-004-L3');
assert(api.getSelectedLine().linea_id === 'BIO-FH-004-L3' && elements.fhSegFarmaco.value === 'Rixathon' && elements.fhSegPrincipioActivo.value === 'Rituximab CIMA', 'seleccionar L3 reemplaza marca y principio de L2');
assert(elements.fhSegPresentacion.value === 'Vial L3' && elements.fhSegDosisActual.value === '1 g' && elements.fhSegVia.value === 'IV' && elements.fhSegPautaActual.value === 'Cada 6 meses', 'L3 reemplaza presentación, dosis, vía y pauta');
assert(elements.fhSegEstadoLinea.value === 'Activo' && elements.fhSegFechaInicio.value === '2026-05-28' && elements.fhSegCodigoNacional.value === 'CN-L3' && elements.fhSegNregistro.value === 'NR-L3', 'L3 reemplaza estado, fecha y códigos sin residuo L2');
assert(elements.fhSegCimaContextPrincipioActivo.textContent === 'Rituximab CIMA' && lastSummary.fields.some((field) => field.value === 'Rituximab'), 'L3 actualiza contexto CIMA y resumen');
api.selectLineById('BIO-FH-004-L2');
assert(api.getSelectedLine().linea_id === 'BIO-FH-004-L2' && elements.fhSegPrincipioActivo.value === 'Belimumab CIMA' && elements.fhSegPresentacion.value === 'Jeringa L2' && elements.fhSegCodigoNacional.value === 'CN-L2' && elements.fhSegNregistro.value === 'NR-L2', 'volver a L2 restaura identidad y catálogo exactos sin datos de L3');
api.selectLineById('BIO-FH-004-L3');
assert(api.getSelectedLine().linea_id === 'BIO-FH-004-L3' && elements.fhSegPrincipioActivo.value === 'Rituximab CIMA' && elements.fhSegPresentacion.value === 'Vial L3' && elements.fhSegCodigoNacional.value === 'CN-L3' && elements.fhSegNregistro.value === 'NR-L3', 'volver a L3 restaura identidad y catálogo exactos sin datos de L2');
api.selectLineById('BIO-FH-004-L1');
assert(api.getSelectedLine() === null && elements.fhSegLineaPrincipal.value === '' && elements.fhSegFarmaco.value === '' && cardInputs().filter((input) => input.checked).length === 2, 'editor no activo se rechaza sin borrar las líneas seleccionadas');
assert(api.toggleLineSelection('BIO-FH-004-L1', true) === false && cardInputs().find((input) => input.value === 'BIO-FH-004-L1')?.disabled && api.getCurrentVisit().selected_line_ids.length === 2, 'la API activa tampoco selecciona L1 completada y el control permanece deshabilitado');

const p5 = { cip: 'CIP-SYN-METADATA', biologicos: [
  { linea_id: 'SYN-META-A', farmaco_nombre: 'Producto sintético A', dosis: '80 mg', codigo_nacional: 'CN-SYN-A', nregistro: 'NR-SYN-A', source_type: 'SYNTHETIC_SOURCE', selected_drug_id: 'DRUG-SYN-A', etiquetas: ['Sintético'], presentacion: 'Envase sintético', estado_linea: 'activo', tipo_relacion: 'base' },
  { linea_id: 'SYN-META-B', farmaco_nombre: 'Producto sintético B', dosis: '20 mg', estado_linea: 'activo', tipo_relacion: 'adicional' }
] };
elements.fhSegCip.value = p5.cip;
api.syncLinesForPatient(p5);
api.toggleLineSelection('SYN-META-A', true);
api.toggleLineSelection('SYN-META-B', true);
api.selectLineById('SYN-META-A');
assert(api.getSelectedLine().selected_drug_id === 'DRUG-SYN-A' && elements.fhSegCodigoNacional.value === 'CN-SYN-A' && elements.fhSegNregistro.value === 'NR-SYN-A', 'línea explícita conserva selección, CN y registro sin snapshot');
assert(elements.fhSegOrigenCatalogo.value === 'SYNTHETIC_SOURCE' && elements.fhSegOrigenCatalogo.value !== 'Demo' && elements.fhSegEtiquetas.value === 'Sintético', 'línea explícita conserva origen no Demo y etiquetas');
api.selectLineById('SYN-META-B');
assert(elements.fhSegPresentacion.value === '' && elements.fhSegDosisActual.value === '20 mg', 'línea con dosis sin presentación mantiene presentación vacía');
assert(elements.fhSegCodigoNacional.value === '' && elements.fhSegNregistro.value === '' && elements.fhSegEtiquetas.value === '' && elements.fhSegOrigenCatalogo.value === 'Demo' && api.getSelectedLine().selected_drug_id === '', 'cambiar a línea sin metadatos limpia identidad, etiquetas, presentación y contexto previo');

assert(api.canonicalLineStatus('añadido') === 'unknown' && api.canonicalRelationship('tratamiento_añadido') === 'unknown', 'añadido genérico no se traduce como activo o adicional');
assert(api.getCanonicalLinesForPatient({ cip: 'CIP-DESCONOCIDO', farmaco: 'Contexto manual' }).length === 0, 'CIP desconocido no fabrica línea ni identificador');
['completed', 'suspended', 'validated_not_started', 'unknown'].forEach((status) => {
  api.syncLinesForPatient({ cip: `CIP-SYN-${status}`, biologicos: [{ linea_id: `SYN-${status}`, estado_linea: status }] });
  assert(api.getSelectedLine() === null && elements.fhSegLineaPrincipal.value === '' && cardInputs().some((input) => input.value === `SYN-${status}` && input.disabled && input.type === 'checkbox'), `una línea ${status} permanece visible, deshabilitada y sin autoselección`);
});
assert(html.includes('Líneas de tratamiento del paciente') && /<label for="fhSegLineaPrincipal">Línea que estás editando<\/label>/.test(html), 'la UI presenta el bloque y la etiqueta exacta del editor');

const strictIdentityPatient = { cip: 'CIP-SYN-STRICT', biologicos: [
  { linea_id: 'SYN-STRICT-A', farmaco_nombre: 'Marca fallback', principio_activo: 'Ingrediente fallback', tratamiento_id_principal: 'TRAT-FALLBACK', estado_linea: 'active', tipo_relacion: 'primary' },
  { linea_id: 'SYN-STRICT-B', farmaco_nombre: 'Otra marca', estado_linea: 'active', tipo_relacion: 'additional' }
] };
api.syncLinesForPatient(strictIdentityPatient);
[0, 'first', 'principal', 'Marca fallback', 'Ingrediente fallback', 'TRAT-FALLBACK'].forEach((fallback) => {
  assert(api.toggleLineSelection(fallback, true) === false && api.selectLineById(fallback) === null && api.getCurrentVisit().selected_line_ids.length === 0, `identidad no acepta fallback ${fallback}`);
});
assert(api.toggleLineSelection('SYN-STRICT-B', true) === true && api.selectLineById('SYN-STRICT-B')?.linea_id === 'SYN-STRICT-B', 'la misma ruta acepta únicamente el line_id exacto');

const preserved = [
  ['DLQI', /DLQI/], ['catálogo', /fhSegDrugSearch/], ['Naranjo', /modNaranjo/],
  ['Karch-Lasagna', /modKarchLasagna/], ['relacionados', /modOtrosFarmacos/],
  ['navegación', /navToDashboardPaciente/], ['JARA', /fhSegExportTxt/],
  ['CSV', /fhSegExportCsv/], ['Excel', /fhSegExcelExportBtn/]
];
preserved.forEach(([name, pattern]) => assert(pattern.test(html) || pattern.test(js), `${name} permanece en Seguimiento`));
assert(['modOtrosFarmacos', 'modNaranjo', 'modKarchLasagna', 'modExportacion'].every((id) => new RegExp(`<[^>]+id="${id}"`).test(html)), 'módulos preservados mantienen estructura e IDs navegables');

if (failed) process.exit(1);
console.log('PASS farmacia_pr57a_line_selection_check');
