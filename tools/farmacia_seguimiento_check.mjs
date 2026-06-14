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

// --- WO7E: contrato común de tratamiento ---

// 1. FarmaciaTratamiento cargado
assert(html.includes('scripts/farmacia_tratamiento_common.js'), 'Seguimiento carga FarmaciaTratamiento');

// 2. Tipo de movimiento tiene opciones del contrato (en HTML select)
assert(html.indexOf('value="optimizacion"') !== -1, 'HTML incluye movimiento optimización');
assert(html.indexOf('value="suspension"') !== -1, 'HTML incluye movimiento suspensión');

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

// 21. Autocomplete rellena principio activo, vía, pauta y dosis
assert(js.includes("setOtherDrugField(uid, 'principioActivo'"), 'Autocomplete rellena principio activo');
assert(js.includes("setOtherDrugField(uid, 'via'"), 'Autocomplete rellena vía');
assert(js.includes("setOtherDrugField(uid, 'pautaCodigo'"), 'Autocomplete rellena pauta');
assert(js.includes("setOtherDrugField(uid, 'dosis'"), 'Autocomplete rellena dosis');

// 22. Pauta concomitante es desplegable normalizado (no input texto libre único)
assert(js.includes('P.getPautaOptions') || js.includes('FarmaciaPautasCatalog.getPautaOptions'), 'Pauta concomitante usa catálogo de pautas');
assert(js.includes('buildPautaSelectForOtherDrug'), 'Pauta concomitante genera select control');
assert(!js.includes("{ key: 'pauta', label: 'Pauta', type: 'text' }"), 'Pauta concomitante ya no es input texto libre');

// 23. Concomitante usa contrato: tipo_relacion concomitante, estado activo, movimiento no_aplica
assert(js.includes("relation = 'concomitante'"), 'Concomitante mapea tipo_relacion a concomitante');
assert(js.includes("estado_linea = 'activo'"), 'Concomitante mapea estado_linea a activo');
assert(js.includes("tipo_movimiento = 'no_aplica'"), 'Concomitante mapea tipo_movimiento a no_aplica');

// 24. Adicional conserva tipo_relacion adicional y movimiento tratamiento_anadido
assert(js.includes("relation = 'adicional'"), 'Adicional mapea tipo_relacion a adicional');
assert(js.includes("tipo_movimiento = 'tratamiento_anadido'"), 'Adicional mapea tipo_movimiento a tratamiento_anadido');

// 25. Histórico/exposición no se reactivan como línea actual
assert(js.includes("relation = 'historico'"), 'Histórico mapea tipo_relacion a historico');
assert(js.includes("relation = 'exposicion'"), 'Exposición mapea tipo_relacion a exposicion');
assert(js.includes("estado_linea = 'historico'"), 'Histórico mantiene estado_linea historico');
assert(js.includes("estado_linea = 'no_aplica'"), 'Exposición mantiene estado_linea no_aplica');

// 26. Sospechoso de EA no se mezcla con principal/concomitante
assert(js.includes("relation = 'sospechoso_ea'"), 'Sospechoso EA mapea tipo_relacion a sospechoso_ea');
assert(js.includes("if (drug.sospechosoEa === 'Sí')"), 'Sospechoso EA se evalúa explícitamente');
assert(!js.includes("tipo_relacion: 'principal'"), 'No se asigna tipo_relacion principal en otros fármacos');

// 27. Tratamiento principal sigue presente (reafirmación WO7E)
assert(html.includes('fhSegLineaPrincipal'), 'Selector de línea principal conservado');
assert(html.includes('fhSegTratamientoGrid'), 'Grid de resumen de tratamiento conservado');
assert(js.includes('syncBiologicControls'), 'syncBiologicControls sigue definida');
assert(js.includes('applySelectedBiologicLine'), 'applySelectedBiologicLine sigue definida');

// 28. Sin innerHTML en archivos WO7F
assert(html.indexOf(forbidden) === -1, 'HTML de seguimiento no usa innerHTML');
assert(js.indexOf(forbidden) === -1, 'JS de seguimiento no usa innerHTML');

console.log(`\n Total: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}`);

if (failed > 0) process.exit(1);
