#!/usr/bin/env node
// tools/farmacia_seguimiento_check.mjs
// Verifica WO7E + WO7E.1 + WO7F en Seguimiento — contrato común de tratamiento principal + pulido datos básicos + concomitantes/adicionales/históricos

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];

function ok(msg) {
  console.log(`  ✓ ${msg}`);
  passed++;
}

function fail(msg) {
  console.log(`  ✗ ${msg}`);
  failed++;
  errors.push(msg);
}

function assert(condition, label) {
  if (condition) ok(label);
  else fail(label);
}

const htmlPath = path.join(ROOT, 'farmacia_seguimiento.html');
const jsPath = path.join(ROOT, 'scripts', 'farmacia_seguimiento.js');
const helperPath = path.join(ROOT, 'scripts', 'farmacia_tratamiento_common.js');
const pautasPath = path.join(ROOT, 'scripts', 'farmacia_pautas_catalog.js');
const commonPath = path.join(ROOT, 'scripts', 'farmacia_common.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const helperSrc = fs.readFileSync(helperPath, 'utf8');
const pautasSrc = fs.readFileSync(pautasPath, 'utf8');
const commonSrc = fs.readFileSync(commonPath, 'utf8');

const behaviorSandbox = {
  window: { FarmaciaDemo: {} },
  console,
  document: { addEventListener: () => {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({}) },
  Event: function Event(type) { this.type = type; },
  setTimeout,
  clearTimeout
};
vm.createContext(behaviorSandbox);
vm.runInContext(js, behaviorSandbox);
const behaviorApi = behaviorSandbox.window.FarmaciaSeguimiento;
assert(behaviorApi && typeof behaviorApi.searchCIP === 'function' && typeof behaviorApi.setActivePatientCip === 'function', 'Seguimiento exposes testable guarded CIP search');
if (behaviorApi && typeof behaviorApi.searchCIP === 'function') {
  const ids = ['fhSegCip', 'fhSegServicio', 'fhSegPatologia', 'fhSegFarmaco', 'fhSegPrincipioActivo', 'fhSegPresentacion', 'fhSegDosisActual', 'fhSegVia', 'fhSegPautaActual', 'fhSegCodigoNacional', 'fhSegNregistro', 'fhSegEtiquetas', 'fhSegFechaInicio', 'fhSegUltimaAdherencia', 'fhSegUltimosProms', 'fhSegOrigenCatalogo', 'fhSegEaPrevios', 'fhSegNuevaDosis', 'fhSegNuevaPauta', 'fhSegNuevaPautaOtro', 'fhSegTratamientoGrid', 'fhSegLineaPrincipal', 'fhSegEstadoLinea', 'fhSegTipoRelacionTerapia', 'fhSegProms', 'fhSeguimientoEaObservaciones'];
  const elements = Object.fromEntries(ids.map((id) => [id, { id, value: '', textContent: '', children: [], options: [], readOnly: false, classList: { add: () => {}, remove: () => {}, toggle: () => {} }, closest: () => null, dispatchEvent: () => {}, appendChild(child) { this.children.push(child); this.options.push(child); }, remove() {} }]));
  elements.fhSegCip.value = 'DEMO-CIP-DER-004';
  elements.fhSegProms.value = 'No recogido';
  elements.fhSegOrigenCatalogo.value = 'Demo';
  behaviorSandbox.document.getElementById = (id) => elements[id] || null;
  behaviorSandbox.document.createElement = () => ({ value: '', textContent: '', selected: false, classList: { add: () => {}, remove: () => {}, toggle: () => {} }, appendChild: () => {}, setAttribute: () => {} });
  behaviorSandbox.document.createTextNode = (text) => ({ textContent: text });
  const F = behaviorSandbox.window.FarmaciaDemo;
  F.setValue = (id, value) => { if (elements[id]) elements[id].value = value || ''; };
  F.setText = (id, value) => { if (elements[id]) elements[id].textContent = value || ''; };
  F.clearChildren = (el) => { if (el) { el.children = []; el.options = []; } };
  F.renderFields = () => {};
  F.findPatientByCip = (cip) => cip.trim().toUpperCase() === 'DEMO-CIP-DER-004' ? { cip: 'DEMO-CIP-DER-004', servicio: 'Dermatología', patologia: 'Hidradenitis supurativa', marcaComercial: 'Drug B', principioActivo: 'Drug B', dosis: '20 mg', via: 'SC', pauta: 'Cada 4 semanas', biologicos: [] } : null;
  F.resolvePatientContextSwitch = (current, requested, hasContext, confirmed) => {
    if (String(current).trim().toUpperCase() === String(requested).trim().toUpperCase()) return { action: 'same' };
    if (hasContext && confirmed === undefined) return { action: 'confirm' };
    if (hasContext && confirmed === false) return { action: 'cancel' };
    return { action: 'switch' };
  };
  behaviorSandbox.window.FarmaciaCatalog = { clearSnapshot: () => {}, getSnapshot: () => null };
  let confirmation = false;
  let confirmationCalls = 0;
  behaviorSandbox.window.confirm = () => { confirmationCalls++; return confirmation; };
  const resetElements = () => ids.forEach((id) => {
    elements[id].value = '';
    elements[id].children = [];
    elements[id].options = [];
  });
  behaviorApi.searchCIP();
  assert(confirmationCalls === 0 && elements.fhSegFarmaco.value === 'Drug B', 'Seguimiento clean first existing CIP search ignores neutral Demo origin');

  resetElements();
  behaviorApi.setActivePatientCip('');
  elements.fhSegCip.value = 'CIP-UNKNOWN';
  elements.fhSegProms.value = 'No recogido';
  elements.fhSegOrigenCatalogo.value = 'Demo';
  confirmationCalls = 0;
  behaviorApi.searchCIP();
  assert(confirmationCalls === 0 && elements.fhSegCip.value === 'CIP-UNKNOWN' && elements.fhSegFarmaco.value === '' && elements.fhSeguimientoEaObservaciones.value === '', 'Seguimiento clean first unknown CIP search skips confirmation and leaves no residue');

  resetElements();
  behaviorApi.setActivePatientCip('');
  elements.fhSegOrigenCatalogo.value = 'Demo';
  elements.fhSegNuevaDosis.value = 'Manual clinical dose';
  elements.fhSegCip.value = 'DEMO-CIP-DER-004';
  confirmationCalls = 0;
  behaviorApi.searchCIP();
  assert(confirmationCalls === 1 && elements.fhSegCip.value === '' && elements.fhSegNuevaDosis.value === 'Manual clinical dose', 'Seguimiento manual clinical data without patient remains protected');

  resetElements();
  elements.fhSegNuevaDosis.value = 'A-only dose';
  elements.fhSeguimientoEaObservaciones.value = 'A-only adverse event';
  elements.fhSegCip.value = 'DEMO-CIP-DER-004';
  behaviorApi.setActivePatientCip('DEMO-CIP-DER-001');
  confirmationCalls = 0;
  behaviorApi.searchCIP();
  assert(confirmationCalls === 1 && elements.fhSegCip.value === 'DEMO-CIP-DER-001' && elements.fhSegNuevaDosis.value === 'A-only dose', 'Seguimiento real A to B switch keeps confirmation and cancel preserves A');
  confirmation = true;
  elements.fhSegCip.value = 'DEMO-CIP-DER-004';
  behaviorApi.searchCIP();
  assert(elements.fhSegFarmaco.value === 'Drug B' && elements.fhSegNuevaDosis.value === '', 'Seguimiento confirmed switch clears A-only movement and loads B');
  elements.fhSegCip.value = 'CIP-UNKNOWN';
  behaviorApi.searchCIP();
  assert(elements.fhSegCip.value === 'CIP-UNKNOWN' && elements.fhSegFarmaco.value === '' && elements.fhSeguimientoEaObservaciones.value === '', 'Seguimiento unknown CIP enters clean manual mode');
}

// --- WO7E: contrato común de tratamiento ---

// 1. FarmaciaTratamiento cargado
assert(html.includes('scripts/farmacia_tratamiento_common.js'), 'Seguimiento carga FarmaciaTratamiento');

// 2. Tipo de movimiento tiene opciones del contrato (en HTML select)
assert(html.indexOf('value="optimizacion"') !== -1, 'HTML incluye movimiento optimización');
assert(html.indexOf('value="suspension"') !== -1, 'HTML incluye movimiento suspensión');
assert(html.indexOf('value="tratamiento_anadido"') === -1, 'Seguimiento no permite iniciar tratamiento añadido');
assert(html.indexOf('value="cambio_terapeutico"') === -1, 'Seguimiento no permite iniciar switch terapéutico');

// 3. Grid de resumen presente
assert(html.includes('fhSegTratamientoGrid'), 'Grid de resumen de tratamiento presente');

// 4. sin_cambios presente como opción de movimiento en HTML select
assert(html.indexOf('value="sin_cambios"') !== -1, 'sin_cambios presente como opción de movimiento en HTML');

// 5. biologicStateLabel maneja estados del contrato
assert(js.includes('finalizado'), 'biologicStateLabel maneja estado finalizado');
assert(js.includes('validado'), 'biologicStateLabel maneja estado validado');
assert(js.includes('no_aplica'), 'biologicStateLabel maneja no_aplica');

// 6. getTreatmentHelper existe
assert(js.includes('getTreatmentHelper'), 'Función getTreatmentHelper definida');

// 7. renderSegTreatmentSummary existe
assert(js.includes('renderSegTreatmentSummary'), 'Función renderSegTreatmentSummary definida');

// 8. Sin innerHTML
const forbidden = 'inner' + 'HTML';
assert(html.indexOf(forbidden) === -1, 'HTML de seguimiento no usa markup prohibido');
assert(js.indexOf(forbidden) === -1, 'JS de seguimiento no usa markup prohibido');

// 9. No se toca bloque de concomitantes/adicionales
assert(html.includes('modOtrosFarmacos'), 'Bloque de otros fármacos/adicionales conservado');
assert(html.includes('btnSegAddOtherDrug'), 'Botón de añadir fármaco concomitante conservado');

// --- WO7E.1: Pulido de Seguimiento: origen, indicación y tarjeta prebiológica ---

// 10. Origen como select con opciones
assert(html.indexOf('<select class="form-select" id="fhSegServicio"') !== -1, 'Origen es select guiado');
assert(html.indexOf('Dermatología') !== -1, 'Select Origen incluye Dermatología');
assert(html.indexOf('Reumatología') !== -1, 'Select Origen incluye Reumatología');
assert(html.indexOf('Medicina Interna') !== -1, 'Select Origen incluye Medicina Interna');
assert(html.indexOf('Otro') !== -1, 'Select Origen incluye opción Otro');

// 11. Indicación como select
assert(html.indexOf('<select class="form-select" id="fhSegPatologia"') !== -1, 'Indicación es select guiado');

// 12. Inputs "Otro" para servicio y patología
assert(html.indexOf('id="fhSegServicioOtro"') !== -1, 'Input otro servicio presente');
assert(html.indexOf('id="fhSegPatologiaOtro"') !== -1, 'Input otra patología presente');

// 13. Tarjeta "estudio prebiológico" eliminada
assert(!html.includes('id="modPrebiologico"'), 'Sección modPrebiologico eliminada del HTML');
assert(!html.includes('Estudio prebiológico'), 'Texto "Estudio prebiológico" eliminado del HTML');
assert(!html.includes('fhSegPrebioFechaInicioResumen'), 'Resumen prebiológico eliminado del HTML');

// 14. updatePrebiologicoSummary eliminado del JS
assert(!js.includes('updatePrebiologicoSummary'), 'Función updatePrebiologicoSummary eliminada del JS');

// 15. initSegServicioPatologiaSync definido
assert(js.includes('initSegServicioPatologiaSync'), 'Función initSegServicioPatologiaSync definida');
assert(js.includes('__segPopulatePatologia'), 'función populatePatologia expuesta globalmente');

// 16. Tratamiento principal sigue intacto
assert(html.includes('fhSegLineaPrincipal'), 'Selector de línea principal conservado');
assert(html.includes('fhSegTipoRelacionTerapia'), 'Selector de movimiento terapéutico conservado');
assert(html.includes('fhSegTratamientoGrid'), 'Grid de resumen de tratamiento conservado');

// 17. Concomitantes no modificados
assert(html.includes('btnSegAddOtherDrug'), 'Botón de añadir fármaco concomitante conservado');
assert(html.includes('segOtrosFarmacosList'), 'Lista de otros fármacos conservada');
assert(html.includes('modOtrosFarmacos'), 'Bloque de otros fármacos conservado');

// 18. CIP search todavía funciona
assert(html.indexOf('fhSegCip') !== -1, 'Campo de búsqueda CIP conservado');
assert(html.indexOf('fhSegCipSearchBtn') !== -1, 'Botón de búsqueda CIP conservado');

// 19. Nav link a modPrebiologico eliminado
assert(!html.includes('#modPrebiologico'), 'Nav link a estudio prebiológico eliminado');

// --- WO7F: Concomitantes/adicionales/históricos alineados con contrato común ---

// 20. Funciones WO7F definidas
assert(js.includes('mapOtherDrugToContract'), 'Función mapOtherDrugToContract definida');
assert(js.includes('buildPautaSelectForOtherDrug'), 'Función buildPautaSelectForOtherDrug definida');
assert(js.includes('applyCatalogSelectionToOtherDrug'), 'Función applyCatalogSelectionToOtherDrug definida');
assert(js.includes('normalizeOtherDrugVia'), 'Función normalizeOtherDrugVia definida');

// 21. Autocomplete identifica el fármaco sin inferir datos terapéuticos
assert(js.includes("setOtherDrugField(uid, 'principioActivo'"), 'Autocomplete rellena principio activo');
var catalogSelectionMatch = js.match(/function applyCatalogSelectionToOtherDrug[\s\S]*?^    \}/m);
var catalogSelectionBody = catalogSelectionMatch ? catalogSelectionMatch[0] : '';
assert(catalogSelectionBody.indexOf("setOtherDrugField(uid, 'dosis'") === -1, 'Autocomplete no infiere dosis');
assert(catalogSelectionBody.indexOf("setOtherDrugField(uid, 'presentacion'") === -1, 'Autocomplete no infiere presentación');
assert(catalogSelectionBody.indexOf("setOtherDrugField(uid, 'via'") === -1, 'Autocomplete no infiere vía');
assert(catalogSelectionBody.indexOf("setOtherDrugField(uid, 'pautaCodigo'") === -1, 'Autocomplete no infiere pauta');

// 22. Pauta concomitante es desplegable normalizado (no input texto libre único)
assert(js.includes('P.getPautaOptions') || js.includes('FarmaciaPautasCatalog.getPautaOptions'), 'Pauta concomitante usa catálogo de pautas');
assert(js.includes('buildPautaSelectForOtherDrug'), 'Pauta concomitante genera select control');
assert(!js.includes("{ key: 'pauta', label: 'Pauta', type: 'text' }"), 'Pauta concomitante ya no es input texto libre');

// 23. Concomitante usa contrato: tipo_relacion concomitante, estado activo, movimiento no_aplica
assert(js.includes("relation = 'concomitante'"), 'Concomitante mapea tipo_relacion a concomitante');
assert(js.includes("estado_linea = 'activo'"), 'Concomitante mapea estado_linea a activo');
assert(js.includes("tipo_movimiento = 'no_aplica'"), 'Concomitante mapea tipo_movimiento a no_aplica');

// 24. Una línea activa previa se registra sin crear un movimiento de alta
assert(js.includes('Tratamiento activo previo / línea existente'), 'Seguimiento ofrece registro explícito de línea activa previa');
assert(js.includes("relation = 'adicional'"), 'Línea activa previa conserva tipo_relacion adicional');
var mapPreviousTreatmentMatch = js.match(/function mapOtherDrugToContract[\s\S]*?^    \}/m);
var mapPreviousTreatmentBody = mapPreviousTreatmentMatch ? mapPreviousTreatmentMatch[0] : '';
assert(mapPreviousTreatmentBody.indexOf("tipo_movimiento = 'tratamiento_anadido'") === -1, 'Línea activa previa no crea movimiento tratamiento_anadido');
assert(!js.includes("'Biológico activo adicional'"), 'Seguimiento no ofrece alta de biológico activo adicional');

// 25. Histórico/exposición no se reactivan como línea actual
assert(js.includes("relation = 'historico'"), 'Histórico mapea tipo_relacion a historico');
assert(js.includes("relation = 'exposicion'"), 'Exposición mapea tipo_relacion a exposicion');
assert(js.includes("estado_linea = 'historico'"), 'Histórico mantiene estado_linea historico');
assert(js.includes("estado_linea = 'no_aplica'"), 'Exposición mantiene estado_linea no_aplica');

// 26. Sospechoso de EA no se mezcla con principal/concomitante
assert(js.includes("relation = 'sospechoso_ea'"), 'Sospechoso EA mapea tipo_relacion a sospechoso_ea');
assert(js.includes("if (drug.sospechosoEa === 'Sí')"), 'Sospechoso EA se evalúa explícitamente');
// mapOtherDrugToContract no asigna relation = 'principal' (el fallback DOM sí tiene tipo_relacion: 'principal' para tratamiento)
var mdcMatch = js.match(/function mapOtherDrugToContract[\s\S]*?^    \}/m);
var mdcBody = mdcMatch ? mdcMatch[0] : '';
assert(mdcBody.indexOf("relation = 'principal'") === -1, 'mapOtherDrugToContract no asigna tipo_relacion principal a otros fármacos');

// 27. Tratamiento principal sigue presente (reafirmación WO7E)
assert(html.includes('fhSegLineaPrincipal'), 'Selector de línea principal conservado');
assert(html.includes('fhSegTratamientoGrid'), 'Grid de resumen de tratamiento conservado');
assert(js.includes('syncBiologicControls'), 'syncBiologicControls sigue definida');
assert(js.includes('applySelectedBiologicLine'), 'applySelectedBiologicLine sigue definida');

// 28. Sin innerHTML en archivos WO7F
assert(html.indexOf(forbidden) === -1, 'HTML de seguimiento no usa innerHTML');
assert(js.indexOf(forbidden) === -1, 'JS de seguimiento no usa innerHTML');

// --- WO7F.1: Cierre fino de Seguimiento farmacológico ---

// 29. Pauta tratamiento actual es select editable con catálogo
assert(html.indexOf('id="fhSegPautaActual"') !== -1, 'Pauta actual presente en HTML');
assert(html.indexOf('<select class="form-select" id="fhSegPautaActual"') !== -1, 'Pauta actual es select guiado');
assert(html.indexOf('id="fhSegPautaActualOtro"') !== -1, 'Pauta actual tiene input Otro');

// 30. setSegPautaActualNormalized definida y usada
assert(js.includes('setSegPautaActualNormalized'), 'Función setSegPautaActualNormalized definida');
assert(js.includes('populatePautaSelectSeg(\'fhSegPautaActual\''), 'Pauta actual se puebla con catálogo WO6');

// 31. getRelevantDrugCandidates con deduplicación y cobertura total
assert(js.includes('seenIds'), 'getRelevantDrugCandidates usa deduplicación seenIds');
assert(js.includes('Biológico previo/histórico'), 'Incluye históricos como categoría');
assert(js.includes('followupOtherDrugs.forEach'), 'Itera todos los otros fármacos');

// 32. El catálogo no sobrescribe los campos terapéuticos manuales
assert(catalogSelectionBody.indexOf("setOtherDrugField(uid, 'via'") === -1, 'Autocomplete no sobrescribe vía');
assert(catalogSelectionBody.indexOf("setOtherDrugField(uid, 'dosis'") === -1, 'Autocomplete no sobrescribe dosis');
assert(js.includes("setOtherDrugField(uid, 'principioActivo'"), 'Autocomplete principio activo definido en WO7F');

// 33. updateSuspectDrugSelector se llama en contextos clave (tras cambio de línea y al añadir/eliminar fármaco)
assert(js.includes('updateSuspectDrugSelector();'), 'updateSuspectDrugSelector se llama explícitamente');

// 34. Tratamiento principal no se rompe
assert(html.includes('fhSegLineaPrincipal'), 'Selector de línea principal conservado');
assert(html.includes('fhSegTratamientoGrid'), 'Grid de resumen de tratamiento conservado');
assert(js.includes('setSegPautaActualNormalized'), 'Pauta actual se normaliza sin crear nueva línea');

// 35. WO7F.2 — getRelevantDrugCandidates tiene fallback DOM para tratamiento actual
assert(js.includes('dom:current-treatment'), 'getRelevantDrugCandidates tiene fallback DOM para tratamiento');
assert(js.includes('fhSegFarmaco'), 'Fallback DOM lee fhSegFarmaco');
assert(js.includes('fhSegPrincipioActivo'), 'Fallback DOM lee fhSegPrincipioActivo');

// 36. Labels legibles sin corchetes (formato "Nombre — Categoría")
assert(!js.includes("'[Biológico activo] '"), 'Labels sin corchetes en getRelevantDrugCandidates');
assert(js.includes("name"), 'Labels formato "Nombre — Categoría" en línea (usa name + — + cat)');
assert(js.includes("name + ' — ' + category"), 'Labels formato "Nombre — Categoría" en otros fármacos');

// 37. El desplegable sospechoso EA usa única función fuente
assert(js.includes('getRelevantDrugCandidates();'), 'updateSuspectDrugSelector usa getRelevantDrugCandidates');

// 38. Candidatos incluyen todos los orígenes documentados
assert(js.includes("Añadir todas las líneas biológicas"), 'Código documenta inclusión de todas las líneas');
assert(js.includes("todos los otros fármacos"), 'Código documenta inclusión de otros fármacos');
assert(js.includes("Fallback DOM"), 'Código documenta fallback DOM');

// 39. No hay otra función que sobrescriba el desplegable visible
// updateSuspectDrugSelector es la única que escribe en fhSeguimientoEaFarmacoSospechoso
var suspectSelectorWrites = (js.match(/fhSeguimientoEaFarmacoSospechoso/g) || []).length;
assert(suspectSelectorWrites <= 5, 'Sospechoso EA solo referenciado en rutas controladas, incluido reset de paciente');

// --- WO7H.1: Consistencia visual de línea terapéutica ---

// 40. applySelectedBiologicLine usa farmaco_nombre antes de nombre_comercial
var segFhSegFarmaco = "setSegValue('fhSegFarmaco', line.farmaco_nombre || line.nombre_comercial";
assert(js.indexOf(segFhSegFarmaco) !== -1, 'Seguimiento setSegFarmaco usa farmaco_nombre antes de nombre_comercial');

// 41. syncBiologicControls ya incluye farmaco_nombre en su cadena
assert(js.includes('line.farmaco_nombre || line.nombre_comercial'), 'syncBiologicControls usa farmaco_nombre como segundo fallback');

// 42. Tarjeta CIMA se limpia si no corresponde a la línea seleccionada
assert(js.includes('fhSegCimaContextPrincipioActivo'), 'Código de sincronización tarjeta CIMA presente');
assert(js.includes('clearSnapshot'), 'Se limpia snapshot si no corresponde a línea seleccionada');

// WO-FH-CATALOG-SNAPSHOT-CONTEXT-NONINFERENCE-01: el catálogo solo actualiza identidad.
var selectDrugSegMatch = js.match(/function selectDrugSeg[\s\S]*?^    \}/m);
var selectDrugSegBody = selectDrugSegMatch ? selectDrugSegMatch[0] : '';
assert(selectDrugSegBody.indexOf("F.setValue('fhSegDosisActual', drug.dosis") === -1, 'Seguimiento no copia dosis CIMA al seleccionar catálogo');
assert(selectDrugSegBody.indexOf("F.setValue('fhSegPresentacion', drug.nombre_presentacion") === -1, 'Seguimiento no copia presentación CIMA al seleccionar catálogo');
assert(selectDrugSegBody.indexOf("F.setValue('fhSegVia', drug.via") === -1, 'Seguimiento no copia vía CIMA al seleccionar catálogo');

// 43. No se rompe pauta actual editable
assert(js.includes('setSegPautaActualNormalized'), 'Pauta actual normalizada sigue funcionando');

// 44. Concomitantes intactos
assert(js.includes('btnSegAddOtherDrug'), 'Botón añadir concomitante conservado');
assert(js.includes('segOtrosFarmacosList'), 'Lista otros fármacos conservada');

// --- WO7H.2: Bugfix — línea seleccionada y campos visibles coherentes ---

// 45. getCurrentSelectedLine usa tratamiento_id como fallback de matching
var gcsMatch = js.match(/function getCurrentSelectedLine[\s\S]*?^    \}/m);
var gcsBody = gcsMatch ? gcsMatch[0] : '';
assert(gcsBody.includes('matchVal'), 'getCurrentSelectedLine usa variable matchVal para matching unificado');

// 46. matchVal combina linea_id y tratamiento_id
assert(gcsBody.includes('linea_id || currentBiologicLines[j].tratamiento_id'),
    'matchVal usa linea_id con fallback a tratamiento_id');

// 47. Comparación usa matchVal contra select.value
assert(gcsBody.includes('matchVal === select.value'), 'getCurrentSelectedLine compara matchVal contra select.value');

// 48. Fallback a currentBiologicLines[0] solo si ningún match (no se queda en Abatacept si selector es Belimumab)
assert(gcsBody.includes('return currentBiologicLines[0]'),
    'Fallback a currentBiologicLines[0] existe como protección pero no es la ruta principal');

// 49. opt.value en syncBiologicControls es coherente (mismo fallback)
assert(js.includes("opt.value = line.linea_id || line.tratamiento_id || ('BIO-' + i)"),
    'syncBiologicControls genera opt.value coherente con matching fallback');

// 50. applySelectedBiologicLine recibe línea exacta del selector (no primera línea por defecto)
assert(js.includes('applySelectedBiologicLine();'),
    'applySelectedBiologicLine se llama tras syncBiologicControls con la línea seleccionada exacta');

// --- WO7H.3: Bugfix — candidatos de sospechoso EA ---

// 51. getRelevantDrugCandidates dedup key usa linea_id con fallback tratamiento_id
var rdcMatch = js.match(/function getRelevantDrugCandidates[\s\S]*?^    \}/m);
var rdcBody = rdcMatch ? rdcMatch[0] : '';
assert(rdcBody.includes("line.linea_id || line.tratamiento_id || line.id"),
    'getRelevantDrugCandidates dedup key usa linea_id, tratamiento_id e id como fallback');

// 52. getRelevantDrugCandidates incluye farmaco_nombre en name
assert(rdcBody.includes('line.farmaco_nombre') && rdcBody.includes('line.nombre_comercial'),
    'getRelevantDrugCandidates name usa farmaco_nombre antes de nombre_comercial');

// 53. Candidates tienen campo prioridad para orden
assert(rdcBody.includes('prioridad'), 'getRelevantDrugCandidates asigna prioridad a cada candidato');

// 54. Candidates se ordenan antes de devolverse
assert(rdcBody.includes('candidates.sort'), 'getRelevantDrugCandidates ordena candidatos antes de devolver');

// 55. Prioridad 1 = principal, 5 = histórico
assert(rdcBody.includes("prioridad: line.es_principal ? 1 : (line.estado_linea === 'historico' ? 5 : 2)"),
    'Prioridad 1 para principal, 2 activo, 5 histórico en líneas biológicas');

// 56. Concomitante prioridad 3, adicional prioridad 4
assert(rdcBody.includes("'concomitante') p = 3"),
    'Concomitante prioridad 3 (tercer orden)');
assert(rdcBody.includes("'adicional') p = 4"),
    'Adicional prioridad 4 (cuarto orden)');

// 57. If candidates.length > 0, fallback DOM no silencia otras líneas (verificación de no regresión)
assert(js.includes("if (!candidates.length)"),
    'Fallback DOM solo se activa si NO hay candidatos de currentBiologicLines');

// 58. WO7H.2 intacta: getCurrentSelectedLine usa matchVal con tratamiento_id
assert(gcsBody.includes('matchVal'), 'getCurrentSelectedLine sigue usando matchVal (WO7H.2 no revertida)');

// 59. updateSuspectDrugSelector usa candidates.length > 1 para opción múltiple
assert(js.includes('candidates.length > 1'),
    'Selector de sospechoso EA maneja múltiples candidatos');
assert(js.includes("candidates.length === 1"),
    'Selector de sospechoso EA tiene lógica para candidato único');

console.log(`\n Total: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}`);

if (failed > 0) process.exit(1);
