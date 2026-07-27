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
const p3 = { cip: 'CIP-DEMO-FH-003', farmaco: 'Adalimumab 40 mg', principioActivo: 'Adalimumab' };
const p4 = {
  cip: 'CIP-DEMO-FH-004',
  biologicos: [
    { linea_id: 'BIO-FH-004-L1', nombre_linea: 'Abatacept', nombre_comercial: 'Orencia', principio_activo: 'Abatacept', dosis: '125 mg', via: 'SC', pauta: 'Semanal', fecha_inicio: '2025-09-01', estado_linea: 'historico', tipo_relacion: 'cambio_terapeutico' },
    { linea_id: 'BIO-FH-004-L2', nombre_linea: 'Belimumab', nombre_comercial: 'Benlysta', principio_activo: 'Belimumab', dosis: '200 mg', via: 'SC', pauta: 'Semanal', fecha_inicio: '2026-02-20', estado_linea: 'activo', tipo_relacion: 'base' },
    { linea_id: 'BIO-FH-004-L3', nombre_linea: 'Rituximab', nombre_comercial: 'Rixathon', principio_activo: 'Rituximab', dosis: '1 g', via: 'IV', pauta: 'Cada 6 meses', fecha_inicio: '2026-05-28', estado_linea: 'añadido', tipo_relacion: 'tratamiento_añadido' }
  ]
};

const l1 = api.getCanonicalLinesForPatient(p1);
assert(l1.length === 1 && l1[0].linea_id === 'BIO-FH-001-L1' && l1[0].estado_linea === 'active', 'FH-001 tiene una línea activa canónica');
api.syncLinesForPatient(p1);
assert(api.getSelectedLine() === null && elements.fhSegLineaPrincipal.value === '', 'FH-001 no se selecciona inicialmente');

const l2 = api.getCanonicalLinesForPatient(p2);
assert(l2.length === 0, 'FH-002 no expone línea activa o seleccionable');
const l3 = api.getCanonicalLinesForPatient(p3);
assert(l3.length === 1 && l3[0].estado_linea === 'validated_not_started', 'FH-003 queda visible como validada pendiente de inicio');
api.syncLinesForPatient(p3);
assert(cardInputs().some((input) => input.value === 'BIO-FH-003-L1' && input.disabled), 'FH-003 tiene control deshabilitado');

const l4 = api.getCanonicalLinesForPatient(p4);
assert(JSON.stringify(l4.map((line) => [line.linea_id, line.tipo_relacion, line.estado_linea])) === JSON.stringify([
  ['BIO-FH-004-L1', 'primary', 'completed'], ['BIO-FH-004-L2', 'primary', 'active'], ['BIO-FH-004-L3', 'additional', 'active']
]), 'FH-004 conserva las tres relaciones y estados explícitos');
elements.fhSegCip.value = p4.cip;
api.syncLinesForPatient(p4);
const activeOptionIds = elements.fhSegLineaPrincipal.options.slice(1).map((option) => option.value);
assert(activeOptionIds.length === 2 && JSON.stringify(activeOptionIds) === JSON.stringify(['BIO-FH-004-L2', 'BIO-FH-004-L3']), 'selector contiene exactamente L2 y L3 activas');
assert(api.getSelectedLine() === null, 'FH-004 tampoco tiene selección automática');

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
assert(cardInputs().filter((input) => input.checked).length === 1 && cardInputs().find((input) => input.checked).value === 'BIO-FH-004-L3', 'tarjetas actuales mantienen una única selección por line_id');
api.selectLineById('BIO-FH-004-L1');
assert(api.getSelectedLine() === null && elements.fhSegLineaPrincipal.value === '' && elements.fhSegFarmaco.value === '' && cardInputs().every((input) => !input.checked), 'selección no activa se rechaza, limpia y no elige primera línea');

assert(api.canonicalLineStatus('añadido') === 'unknown' && api.canonicalRelationship('tratamiento_añadido') === 'unknown', 'añadido genérico no se traduce como activo o adicional');
assert(api.getCanonicalLinesForPatient({ cip: 'CIP-DESCONOCIDO', farmaco: 'Contexto manual' }).length === 0, 'CIP desconocido no fabrica línea ni identificador');
assert(html.includes('Líneas de tratamiento del paciente') && html.includes('>Línea seleccionada<'), 'la UI presenta el bloque y etiqueta requeridos');

const preserved = [
  ['DLQI', /DLQI/], ['catálogo', /fhSegDrugSearch/], ['Naranjo', /modNaranjo/],
  ['Karch-Lasagna', /modKarchLasagna/], ['relacionados', /modOtrosFarmacos/],
  ['navegación', /navToDashboardPaciente/], ['JARA', /fhSegExportTxt/],
  ['CSV', /fhSegExportCsv/], ['Excel', /fhSegExcelExportBtn/]
];
preserved.forEach(([name, pattern]) => assert(pattern.test(html) || pattern.test(js), `${name} permanece en Seguimiento`));
assert(['modOtrosFarmacos', 'modNaranjo', 'modKarchLasagna', 'modExportacion'].every((id) => new RegExp(`<[^>]+id="${id}"`).test(html)), 'módulos preservados mantienen estructura e IDs navegables');
const selectionRoute = js.slice(js.indexOf('function getCurrentSelectedLine'), js.indexOf('function createFollowupOtherDrug'));
assert(!/lines\s*\[\s*0\s*\]|currentBiologicLines\s*\[\s*0\s*\]/.test(selectionRoute), 'la ruta nueva no usa fallback de primera línea');

if (failed) process.exit(1);
console.log('PASS farmacia_pr57a_line_selection_check');
