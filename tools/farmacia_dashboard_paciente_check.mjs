#!/usr/bin/env node
// tools/farmacia_dashboard_paciente_check.mjs
// Verifica WO7G.1 — Dashboard: tratamiento principal y líneas biológicas desde contrato común

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

const htmlPath = path.join(ROOT, 'farmacia_dashboard_paciente.html');
const jsPath = path.join(ROOT, 'scripts', 'farmacia_dashboard_paciente.js');
const helperPath = path.join(ROOT, 'scripts', 'farmacia_tratamiento_common.js');
const pautasPath = path.join(ROOT, 'scripts', 'farmacia_pautas_catalog.js');
const commonPath = path.join(ROOT, 'scripts', 'farmacia_common.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const helperSrc = fs.readFileSync(helperPath, 'utf8');
const pautasSrc = fs.readFileSync(pautasPath, 'utf8');
const commonSrc = fs.readFileSync(commonPath, 'utf8');

const forbidden = 'inner' + 'HTML';

// --- WO7G.1: Dashboard desde contrato común ---

// 1. Carga FarmaciaTratamiento en HTML
assert(html.includes('scripts/farmacia_tratamiento_common.js'), 'Dashboard carga FarmaciaTratamiento');

// 2. JS referencia FarmaciaTratamiento
assert(js.includes('FarmaciaTratamiento'), 'Dashboard JS referencia FarmaciaTratamiento');
assert(js.includes('buildTreatmentFromPatient'), 'Dashboard usa buildTreatmentFromPatient');

// 3. getPatientBiologicLines ya no es lógica paralela pura (primero intenta helper)
assert(js.indexOf('window.FarmaciaTratamiento') !== -1, 'getPatientBiologicLines consulta helper primero');

// 4. Summary no usa join(' + ') para colapsar
assert(!js.includes("join(' + ')"), 'Summary no colapsa multibiológico con join +');
assert(!js.includes('activeLines.map'), 'Summary no usa activeLines.map');

// 5. Summary separa tratamiento principal de otras líneas
assert(js.includes('Tratamiento principal'), 'Summary tiene campo Tratamiento principal');
assert(js.includes('Otras líneas activas'), 'Summary tiene campo Otras líneas activas');

// 6. renderBiologicLines muestra más de una línea si existen
assert(js.includes('getPatientBiologicLines(patient)'), 'renderBiologicLines usa getPatientBiologicLines');
assert(js.includes('lines.forEach'), 'renderBiologicLines itera líneas');

// 7. Estado y relación desde el helper/contrato
assert(js.includes('biologicStateLabel(line.estado_linea)'), 'renderBiologicLines usa estado_linea del contrato');
assert(js.includes('biologicRelationLabel(line.tipo_relacion)'), 'renderBiologicLines usa tipo_relacion del contrato');

// 8. Nota incluye dosis/presentación, vía y pauta
assert(js.includes('line.dosis'), 'renderBiologicLines nota incluye dosis');
assert(js.includes('line.dosis_texto'), 'renderBiologicLines nota incluye dosis_texto');
assert(js.includes('line.via'), 'renderBiologicLines nota incluye vía');
assert(js.includes('line.pauta'), 'renderBiologicLines nota incluye pauta');
assert(js.includes('line.fecha_inicio'), 'renderBiologicLines nota incluye fecha inicio');
assert(js.includes('line.fecha_fin'), 'renderBiologicLines nota incluye fecha fin');

// 9. Sin innerHTML
assert(html.indexOf(forbidden) === -1, 'HTML dashboard no usa innerHTML');
assert(js.indexOf(forbidden) === -1, 'JS dashboard no usa innerHTML');

// 10. Dashboard no escribe tratamiento (solo lectura)
assert(js.includes('renderDashboard'), 'Dashboard renderiza sin mutar datos');
assert(js.includes('F.renderFields'), 'Dashboard usa F.renderFields (solo lectura)');

// 11. Timeline no tocado
assert(js.includes('renderTimelineTratamiento'), 'renderTimelineTratamiento conservada');
assert(js.includes('patient.tratamientos'), 'Código de timeline conservado');

// 12. Biológicos previos no colapsan como activos
assert(js.includes("line.estado_linea !== 'historico'"), 'renderDashboard filtra históricos correctamente');

// --- WO7H.1: Consistencia visual de línea terapéutica ---

// 13. Fallback primaryName usa farmaco_nombre antes de nombre_comercial
var pdPrimaryLineStr = "primaryLine.farmaco_nombre || primaryLine.principio_activo || primaryLine.nombre_comercial";
assert(js.indexOf(pdPrimaryLineStr) !== -1, 'Dashboard primaryName usa farmaco_nombre antes de nombre_comercial');

// 14. Fallback otherNames usa farmaco_nombre antes de nombre_comercial
var pdOtherLineStr = "l.farmaco_nombre || l.principio_activo || l.nombre_comercial";
assert(js.indexOf(pdOtherLineStr) !== -1, 'Dashboard otherNames usa farmaco_nombre antes de nombre_comercial');

// 15. Fallback biologic value usa farmaco_nombre antes de nombre_comercial
var pdBioValueStr = "line.farmaco_nombre || line.principio_activo || line.nombre_comercial";
assert(js.indexOf(pdBioValueStr) !== -1, 'Dashboard renderBiologicLines usa farmaco_nombre antes de nombre_comercial');

// --- WO7G.2: Dashboard timeline terapéutico consistente ---

// 16. renderTimelineTratamiento prioriza nombre_comercial (marca) antes de principio_activo
var tlFunc = js.match(/function renderTimelineTratamiento[\s\S]*?^    \}/m);
var tlBody = tlFunc ? tlFunc[0] : '';
assert(tlBody.includes("t.nombre_comercial || t.principio_activo || t.nombre_linea || t.farmaco_nombre"),
    'Timeline título prioriza nombre_comercial (marca) antes de principio_activo (por biosimilares)');

// 17. Timeline usa tName consistente para fecha_inicio y fecha_fin
assert(tlBody.includes('title: tName'), 'Timeline usa variable tName unificada para título');

// 18. Timeline incluye indicación de estado activo
assert(tlBody.includes("' — Activo'") && tlBody.includes("isActive"),
    'Timeline añade indicación " — Activo" cuando línea está activa');

// 19. Timeline incluye indicación de estado histórico en fecha_fin
assert(tlBody.includes("' — Histórico'"), 'Timeline añade indicación " — Histórico" en fecha_fin');

// 20. badgeLabels incluye 'activo'
assert(js.includes("activo: 'Activo'"), 'badgeLabels incluye entrada para estado Activo');

// 21. No desaparecen eventos de patient.tratamientos
assert(tlBody.includes('patient.tratamientos || []'), 'Timeline conserva tratamientos como fuente');

// 22. No desaparecen eventos de patient.cambios_pauta
assert(tlBody.includes('patient.cambios_pauta || []'), 'Timeline conserva cambios_pauta como fuente');

// 23. Sin innerHTML en dashboard
assert(html.indexOf(forbidden) === -1, 'HTML dashboard no usa innerHTML');
assert(js.indexOf(forbidden) === -1, 'JS dashboard no usa innerHTML');

// --- WO-FH-DASHBOARD-PROMS-SHAPE-P1-01 (Issue #288 / F-01-F-04) ---
// Contrato de forma: ARRAY estructurado intacto; STRING legacy solo contexto demo.

// 24. F-01: el resumen no invoca .map sobre una forma string/desconocida
assert(!js.includes('(patient.proms || []).map('), 'Summary no hace .map directo sobre patient.proms');

// 25. Normalización de acceso a proms por forma (no muta string a array)
assert(js.includes('function getStructuredProms(patient)'), 'Existe helper getStructuredProms');
assert(js.includes('function getLegacyPromsText(patient)'), 'Existe helper getLegacyPromsText (string legacy literal)');
assert(js.includes('Array.isArray(patient.proms)'), 'El acceso a proms estructuradas valida Array.isArray');
assert(js.includes('typeof proms === \'string\''), 'La forma legacy se reconoce solo como string');

// 26. F-04: renderProms no itera una string como colección de PROMs
var renderPromsBody = js.match(/function renderProms[\s\S]*?^    \}/m);
assert(!!renderPromsBody, 'renderProms presente');
assert(renderPromsBody[0].includes("!Array.isArray(patient.proms)"),
    'renderProms deriva strings/desconocidos al branch legacy seguro antes de iterar');
assert(renderPromsBody[0].includes('renderLegacyPromsText'),
    'renderProms usa renderLegacyPromsText para la forma string');

// 27. F-01/F-04: renderExtendedBlocks no colapsa string a array vacío (fin del undefined tile)
assert(!/patient\.proms = Array\.isArray\(patient\.proms\) \? patient\.proms : \[\]/.test(js),
    'renderExtendedBlocks ya no normaliza string legacy a array vacío');
// 27b. El fallback cuando el dataset longitudinal existe sin array de proms
//      conserva el valor ORIGINAL de patient.proms (string/null/desconocido intactos).
assert(js.includes('var originalProms = patient.proms;'),
    'renderExtendedBlocks captura patient.proms original antes de fusionar');
assert(js.includes('Array.isArray(extData.proms) ? extData.proms : originalProms'),
    'Fusión longitudinal conserva el valor original (string/null/desconocido) cuando el dataset no aporta array');
assert(!js.includes('extData.proms : structuredProms'),
    'El fallback de fusión no reemplaza string/null por array vacío (getStructuredProms)');

// 28. El renderer estructurado actual se conserva para arrays raw
assert(renderPromsBody[0].includes('proms-card-grid'), 'renderProms conserva el grid estructurado');
assert(renderPromsBody[0].includes('grouped[pt].push(pItem)'), 'renderProms conserva el agrupado por tipo');
assert(renderPromsBody[0].includes('prom-card__status--registered'), 'renderProms conserva tarjetas de valor registrado');

// 29. Longitudinales: acceso a proms estructuradas a través del helper (sin .map sobre string)
assert(js.includes('var promItems = getStructuredProms(patient);'), 'populateLongSelectors usa getStructuredProms');
assert(js.includes('promKey ? getStructuredProms(patient).filter'), 'renderLongDataSeries usa getStructuredProms');

// 30. F-01: ausente/null/string derivan a 'No registrado' o texto legacy explícito
assert(js.includes("return 'No registrado';"), 'getDashboardSummaryPromsText fallback a No registrado');
assert(js.includes("'PROMs demo (contexto): ' + legacy"), 'getDashboardSummaryPromsText etiqueta el texto legacy como contexto demo');

console.log(`\n Total: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}`);

if (failed > 0) process.exit(1);
