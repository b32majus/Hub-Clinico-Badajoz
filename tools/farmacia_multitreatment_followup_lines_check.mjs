#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_seguimiento.js'), 'utf8');
const sandbox = {
  window: { document: { addEventListener() {}, getElementById() { return null; } }, FarmaciaDemo: {} },
  document: { addEventListener() {}, getElementById() { return null; } },
  console, Date, Math, JSON, setTimeout, clearTimeout
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const A = sandbox.window.FarmaciaSeguimiento;
let pass = 0;
let fail = 0;
function check(value, label) { console.log(`  ${value ? '✓' : '✗'} ${label}`); value ? pass++ : fail++; }
function patient(cip) { return { cip, servicio: 'Reumatología', patologia: 'LES / Síndrome de Sjögren' }; }

const fh1 = A.hydrateCanonicalLines(patient('CIP-DEMO-FH-001'));
const fh2 = A.hydrateCanonicalLines(patient('CIP-DEMO-FH-002'));
const fh3 = A.hydrateCanonicalLines(patient('CIP-DEMO-FH-003'));
const fh4 = A.hydrateCanonicalLines(patient('CIP-DEMO-FH-004'));
check(fh1.length === 1 && fh1[0].state === 'active' && fh1[0].relation === 'primary', '1. FH001 has one primary active line');
check(fh2.length === 0, '2. FH002 has no active or invented line');
check(fh3.length === 1 && fh3[0].state === 'validated_not_started', '3. FH003 validated-not-started line stays non-active');
check(fh4.map((line) => `${line.drug}:${line.state}:${line.relation}`).join('|') === 'Abatacept:completed:primary|Belimumab:active:primary|Rituximab:active:additional', '4. FH004 explicit three-line hydration is canonical');

const supportedRawLines = [
  { linea_id: 'S1', estado_linea: 'active', tipo_relacion: 'primary' },
  { linea_id: 'S2', estado_linea: 'activo', tipo_relacion: 'principal' },
  { linea_id: 'S3', estado_linea: 'suspended', tipo_relacion: 'additional' },
  { linea_id: 'S4', estado_linea: 'suspendido', tipo_relacion: 'adicional' },
  { linea_id: 'S5', estado_linea: 'completed', tipo_relacion: 'unknown' },
  { linea_id: 'S6', estado_linea: 'finalizado', tipo_relacion: 'desconocido' },
  { linea_id: 'S7', estado_linea: 'validated_not_started', tipo_relacion: 'primary' },
  { linea_id: 'S8', estado_linea: 'validado_pendiente_inicio', tipo_relacion: 'principal' },
  { linea_id: 'S9', estado_linea: 'unknown', tipo_relacion: 'unknown' },
  { linea_id: 'S10', estado_linea: 'desconocido', tipo_relacion: 'desconocido' }
];
const supported = A.hydrateCanonicalLines({ cip: 'CIP-NON-DEMO-SUPPORTED', biologicos: supportedRawLines });
check(supported.map((line) => line.state).join('|') === 'active|active|suspended|suspended|completed|completed|validated_not_started|validated_not_started|unknown|unknown', '4a. direct supported state translations are exact');
check(supported.map((line) => line.relation).join('|') === 'primary|primary|additional|additional|unknown|unknown|primary|primary|unknown|unknown', '4b. direct supported relation translations are exact');
const unsupportedValues = ['añadido', 'historical', 'histórico', 'base', 'sin_cambios', 'tratamiento_añadido', 'cambio_terapeutico'];
const unsupported = A.hydrateCanonicalLines({ cip: 'CIP-NON-DEMO-UNSUPPORTED', biologicos: unsupportedValues.map((raw, index) => ({ linea_id: `U${index}`, estado_linea: raw, tipo_relacion: raw, es_principal: true })) });
check(unsupported.every((line) => line.state === 'unknown' && line.relation === 'unknown'), '4c. unsupported added/historical/base values remain unknown and never become active truth');

const visit = A.createFollowupVisit(patient('CIP-DEMO-FH-004'), new Date('2026-07-27T10:00:00.000Z'));
check(visit.selected_line_ids.length === 0 && visit.editing_line_id === '', '5. no line is implicitly selected');
check(A.setLineSelected(visit, 'BIO-FH-004-L1', true) === false && visit.selected_line_ids.length === 0, '6. completed line is visible but not selectable');
A.setLineSelected(visit, 'BIO-FH-004-L2', true);
A.setLineSelected(visit, 'BIO-FH-004-L3', true);
check(visit.selected_line_ids.join('|') === 'BIO-FH-004-L2|BIO-FH-004-L3', '7. selected_line_ids contains only explicit active choices');
visit.editing_line_id = 'BIO-FH-004-L2';
A.setLineSelected(visit, 'BIO-FH-004-L2', false);
check(visit.editing_line_id === '' && visit.selected_line_ids.join('|') === 'BIO-FH-004-L3', '7a. deselecting the edited line clears editor identity without first-position inference');
A.setLineSelected(visit, 'BIO-FH-004-L2', true);
visit.editing_line_id = 'BIO-FH-004-L2';

A.setCommonDraft(visit, { professional: 'FH sintético', dlqi: '8', eva_pain: '3', eva_itch: '2', observations: 'Común' });
A.saveLineDraft(visit, 'BIO-FH-004-L2', { morisky: { mg1: 'no', mg2: 'si', mg3: 'no', mg4: 'no' }, observations: 'Solo L2' });
A.saveLineDraft(visit, 'BIO-FH-004-L3', { morisky: { mg1: 'si', mg2: 'no', mg3: 'si', mg4: 'si' }, observations: 'Solo L3' });
let model = A.buildFollowupVisitModel(visit);
check(model.lines.length === 2 && model.lines.every((line) => line.visit_id === model.visit_id) && new Set(model.lines.map((line) => line.line_id)).size === 2, '8. rows share visit_id and keep distinct line identities');
check(model.common.dlqi === '8' && model.common.eva_pain === '3' && model.common.eva_itch === '2', '9. PROMs are common visit data');
let modelL2 = model.lines.find((line) => line.line_id === 'BIO-FH-004-L2');
let modelL3 = model.lines.find((line) => line.line_id === 'BIO-FH-004-L3');
check(modelL2.morisky.result === 'high' && modelL3.morisky.result === 'low' && modelL2.observations !== modelL3.observations, '10. Morisky and notes remain isolated per editor line');

A.saveLineDraft(visit, 'BIO-FH-004-L2', { movement: 'optimization', new_dose: '', new_schedule: '', optimization_reason: '' });
model = A.buildFollowupVisitModel(visit);
modelL2 = model.lines.find((line) => line.line_id === 'BIO-FH-004-L2');
check(!A.validateFollowupVisitModel(model).valid && modelL2.resulting_state === 'active', '11. optimization requires dose/schedule and reason, and results active');
A.saveLineDraft(visit, 'BIO-FH-004-L2', { new_schedule: 'Cada 2 semanas', optimization_reason: 'Respuesta adecuada' });
A.saveLineDraft(visit, 'BIO-FH-004-L3', { movement: 'suspension', suspension_reason: '' });
model = A.buildFollowupVisitModel(visit);
modelL3 = model.lines.find((line) => line.line_id === 'BIO-FH-004-L3');
check(!A.validateFollowupVisitModel(model).valid && modelL3.resulting_state === 'suspended', '12. suspension requires reason and results suspended');
A.saveLineDraft(visit, 'BIO-FH-004-L3', { suspension_reason: 'Decisión clínica' });
check(A.validateFollowupVisitModel(A.buildFollowupVisitModel(visit)).valid, '13. valid line movements pass after required reasons');

A.setAdverseEvent(visit, { present: 'si', description: 'EA sintético' });
check(!A.validateFollowupVisitModel(A.buildFollowupVisitModel(visit)).valid && !!visit.adverse_event.ea_id, '14. one stable EA id is created but export blocks without explicit suspect');
A.setAdverseEvent(visit, { suspect_id: 'line:BIO-FH-004-L3', suspect_kind: 'canonical_line', suspect_name: 'L3 · Rituximab' });
model = A.buildFollowupVisitModel(visit);
check(A.validateFollowupVisitModel(model).valid && model.adverse_event.suspect_id === 'line:BIO-FH-004-L3', '15. explicit concrete suspect enables causal export');

const report = A.buildJaraReport(model);
check((report.match(/=== INFORME DE SEGUIMIENTO FARMACIA ===/g) || []).length === 1 && report.includes('Línea BIO-FH-004-L2') && report.includes('Línea BIO-FH-004-L3') && report.includes(model.adverse_event.ea_id), '16. JARA has one common header, N line sections and common EA');
const contexts = A.buildExcelContexts(model);
check(contexts.length === 2 && contexts.every((ctx) => ctx.visitaId === model.visit_id && ctx.proms.dlqi === '8' && ctx.efectoAdverso.ea_id === model.adverse_event.ea_id && ctx.timestamp === model.created_at), '17. Excel contexts share common visit, PROM, EA and timestamp data');
check(contexts.every((ctx) => !Object.hasOwn(ctx.lineaActual, 'tratamiento_id')), '18. follow-up export never invents tratamiento_id');
check(A.hasMeaningfulRevision(visit) && !A.isFullyExported(visit), '19. meaningful changed revision is incomplete until both exports match');
visit.jara_export_revision = visit.revision;
visit.excel_export_revision = visit.revision;
check(A.isFullyExported(visit) && (() => { A.setCommonDraft(visit, { observations: 'Cambio posterior' }); return !A.isFullyExported(visit); })(), '20. both exports complete a revision and any significant mutation invalidates both');

const unknown = A.createFollowupVisit({ cip: 'CIP-MANUAL', manual: true }, new Date('2026-07-27T10:00:00.000Z'));
check(unknown.canonical_lines.length === 0 && !A.validateFollowupVisitModel(A.buildFollowupVisitModel(unknown)).valid, '21. unknown CIP has no invented line and cannot export');
const fresh = A.createFollowupVisit(patient('CIP-DEMO-FH-004'), new Date('2026-07-27T11:00:00.000Z'));
check(fresh.visit_id !== visit.visit_id && fresh.cip === visit.cip && fresh.selected_line_ids.length === 0, '22. new in-memory visit preserves patient lines but receives a new visit_id');

console.log(`\n Total: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
