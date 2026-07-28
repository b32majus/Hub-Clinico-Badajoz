import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const js = read('scripts/farmacia_seguimiento.js');
const excel = read('scripts/farmacia_excel_row_export.js');
const html = read('farmacia_seguimiento.html');
const css = read('farmacia_style.css');
let passed = 0;
const failures = [];
function check(condition, label) {
  if (condition) { passed += 1; console.log(`✓ ${label}`); }
  else { failures.push(label); console.error(`✗ ${label}`); }
}
const block = (start, end) => (js.match(new RegExp(`function ${start}[\\s\\S]*?function ${end}`)) || [''])[0];
const createVisit = block('createFollowupVisit', 'clearMoriskyControls');
const dispensing = block('isLineDispensed', 'captureEditingLineState');
const deselect = block('toggleBiologicLineSelection', 'createFollowupOtherDrug');
const model = block('buildFollowupVisitExportModel', 'lineControl');
const rows = block('buildFollowupExcelRows', 'csvCell');
const jara = (js.match(/function buildSegLines[\s\S]*?window\.FarmaciaSeguimiento\s*=/) || [''])[0];
const wo8Columns = ((excel.match(/var WO8_COLUMNS = \[([\s\S]*?)\];/) || [])[1] || '').match(/'[^']+'/g) || [];

// State, explicitness, isolation and lifecycle (1-12).
check(html.includes('Dispensado en esta visita') && /id="fhSegDispensado"[^>]*disabled[^>]*><option value="" disabled selected>No aplicable sin línea<\/option>/.test(html), '1 dispensing editor is disabled and empty without an editing line');
check(/value="no">No<\/option><option value="si">Sí/.test(html), '2 fresh dispensing editor retains explicit default No and Sí choice');
check(createVisit.includes('dispensed_line_ids: []'), '3 visit owns a separate dispensed ID list');
check(!/dispensad/i.test((js.match(/line_state: \{\}/) || [''])[0]), '4 line_state has no duplicate dispensing boolean');
check(dispensing.includes("selected_line_ids.indexOf(lineId) < 0") && dispensing.includes("estado_linea === 'active'"), '5 only selected active canonical lines can be dispensed');
check(dispensing.includes('restoreDispensedControl') && dispensing.includes("control.value = editing ? (isLineDispensed(editing) ? 'si' : 'no') : ''"), '6 no editor is empty while editor switches restore exact dispensing by line_id');
check(deselect.includes('isLineDispensed(lineId)') && deselect.includes('window.confirm(LINE_DISCARD_MESSAGE)'), '7 dispensing participates in dirty deselection guard');
check(deselect.includes('renderBiologicLineCards();') && deselect.includes('return false;'), '8 cancelled deselection preserves visit state');
check(deselect.includes('currentFollowupVisit.dispensed_line_ids = currentFollowupVisit.dispensed_line_ids.filter'), '9 confirmed deselection removes dispensed ID');
check(deselect.includes('delete currentFollowupVisit.line_state[lineId]'), '10 confirmed deselection removes line state');
check(js.includes('currentFollowupVisit.dispensed_line_ids = []') && js.includes('createFollowupVisit(requestedCip)'), '11 hydration and CIP reset destroy dispensing state');
check(!/localStorage|sessionStorage|indexedDB/.test(createVisit + model), '12 visit outputs remain ephemeral with no storage');

// Snapshot model and deterministic ordering (13-22).
check(model.includes('captureEditingLineState();') && model.includes('captureCommonAdverseEvent();') && model.includes('captureCausalityEditor();'), '13 export captures only the three currently visible editors');
check(!/setEditingLine|setCausalityEditor|dispatchEvent|click\(/.test(model), '14 model build never traverses editors or manipulates DOM across lines');
check(['common_visit', 'evaluated_lines', 'dispensed_lines', 'related_treatments', 'adverse_event', 'causalities'].every((key) => model.includes(key)), '15 model exposes all required visit sections');
check(model.includes("line.estado_linea === 'active'") && model.includes('selectedLookup[line.linea_id]'), '16 evaluated IDs are selected, canonical and active only');
check(model.includes('if (selectedLookup[id] && activeById[id]) dispensedLookup[id] = true'), '17 invalid/unselected dispensed IDs are rejected');
check(model.includes('currentFollowupVisit.selected_line_ids = selectedIds.slice()') && model.includes('currentFollowupVisit.dispensed_line_ids = dispensedIds.slice()'), '18 stale visit IDs are cleaned safely');
check((model.match(/currentBiologicLines\.filter/g) || []).length >= 2, '19 evaluated and dispensed lines use canonical line order');
check(model.includes('followupOtherDrugs.map'), '20 related treatments retain registration order');
check(model.includes('adverse.suspect_ids.map'), '21 causalities retain suspect_ids order');
check(model.includes('morisky_result: moriskyResultFromAnswers') && model.includes('proms_selection'), '22 own Morisky and common PROMs are modeled separately');

// JARA and interlocks (23-29).
check(js.includes('if (jara) jara.disabled = count < 1'), '23 JARA is enabled for one or more evaluated lines');
check(js.includes('button.disabled = dispensedCount < 1'), '24 CSV and Excel are blocked at zero dispensed lines');
check(html.includes('Marque al menos una línea como dispensada en esta visita para generar filas CSV o Excel.'), '25 exact zero-dispense notice is visible in product markup');
check((jara.match(/lines\.push\('LÍNEAS EVALUADAS EN LA VISITA'\);/g) || []).length === 1 && jara.indexOf("lines.push('LÍNEAS EVALUADAS EN LA VISITA');") < jara.indexOf('model.evaluated_lines.forEach') && jara.includes("item.dispensed ? 'Sí' : 'No'"), '26 JARA heads and emits every evaluated line with explicit dispensing');
check((jara.match(/lines\.push\('--- Tratamientos relacionados ---'\);/g) || []).length === 1 && (jara.match(/model\.related_treatments\.forEach/g) || []).length === 1, '27 JARA emits exactly one related-treatment section');
check((jara.match(/VISITA DE SEGUIMIENTO — EFECTOS ADVERSOS/g) || []).length === 1 && (jara.match(/model\.causalities\.forEach/g) || []).length === 1 && (jara.match(/--- PROMs de la visita ---/g) || []).length === 1 && (jara.match(/model\.common_visit\.proms_selection/g) || []).length === 1 && jara.indexOf('model.causalities.forEach') < jara.indexOf('--- PROMs de la visita ---'), '28 JARA emits common EA once, ordered causalities and PROMs once');
check(!html.includes('fhSegMultilineExportWarning') && !html.includes('fhSegMultiSuspectExportWarning'), '29 obsolete export warnings are removed');

// WO8 rows, aggregation and parity (30-42).
check(rows.includes('return model.dispensed_lines.map'), '30 one row is generated per explicitly dispensed line');
check(rows.includes("tipoActo: 'seguimiento'") && excel.includes("tipoActo: opts.tipoActo || 'seguimiento'"), '31 every row is tipo_acto_fh seguimiento');
check(rows.includes('visitaId: model.common_visit.visit_id') && rows.includes('lineaActual: line'), '32 rows share visit_id and retain distinct canonical lines');
check(rows.includes('morisky_green: item.morisky_result') && rows.includes('dlqi: model.common_visit.dlqi'), '33 rows combine own Morisky with common PROMs');
check(js.includes("present === 'si' ? true : (model.adverse_event.present === 'no' ? false : null)"), '34 EA tri-state maps si/no/no_consta to true/false/empty');
check(excel.includes("ea ? 'TRUE' : (context.hayEfectoAdverso === false ? 'FALSE' : '')"), '35 WO8 serializes EA tri-state as TRUE/FALSE/empty');
check(js.includes("map(function (item) { return item.suspect_id; }).join(' | ')") && js.includes("map(function (item) { return item.suspect_label; }).join(' | ')"), '36 suspect IDs and labels aggregate deterministically');
check(js.includes("item.suspect_id + ': ' + item.naranjo_score + ' · ' + item.naranjo_category") && js.includes("item.suspect_id + ': ' + item.karch_category"), '37 Naranjo and Karch use required deterministic formats');
check(js.includes('accion: model.adverse_event.corrected'), '38 accion_ea comes from the explicit common action');
check(js.includes("'Valoración final ' + item.suspect_id + ': ' + item.final_assessment") && js.includes('Tratamientos relacionados:'), '39 final assessments and related context reach general observations');
check(!rows.includes('related_treatments.map') && !rows.includes('causalities.map(function (item) { return exp.build'), '40 related treatments and suspects never create rows');
check(wo8Columns.length === 61 && wo8Columns[0] === "'patient_id'" && wo8Columns[60] === "'observaciones_generales'", '41 exact canonical 61-column WO8 order remains present');
check(js.includes('return [exp.WO8_COLUMNS].concat(buildFollowupExcelRows(model))'), '42 CSV uses the same WO8 columns and exact row builder as Excel');

// Clipboard compatibility and preservation (43-48).
check(excel.includes('function copyTSVRowsToClipboard') && excel.includes(".join('\\n')"), '43 plural clipboard creates N TSV lines');
check((excel.match(/navigator\.clipboard\.writeText\(tsv\)/g) || []).length === 2, '44 singular and plural APIs each use one clipboard operation');
check(excel.includes("count + ' filas copiadas"), '45 plural operation has a plural toast');
check(excel.includes('copyTSVRowToClipboard: copyTSVRowToClipboard') && excel.includes('copyTSVRowsToClipboard: copyTSVRowsToClipboard'), '46 legacy singular API remains compatible beside plural API');
check(html.includes('fhSegExportTxt') && html.includes('fhSegExportCsv') && html.includes('fhSegExcelExportBtn'), '47 all three follow-up output controls remain');
check(['DLQI_QUESTIONS', 'FarmaciaCatalog', 'navToDashboardPaciente', 'other:', 'LINE_CONTROL_IDS'].every((anchor) => js.includes(anchor)), '48 PR57A/B/C, PROM, catalog and dashboard preservation anchors remain');

console.log(`\nPR57D visit outputs: ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
