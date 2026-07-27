#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'farmacia_seguimiento.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_seguimiento.js'), 'utf8');
let passed = 0;
let failed = 0;
function check(value, label) { console.log(`  ${value ? '✓' : '✗'} ${label}`); value ? passed++ : failed++; }

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
check(new Set(ids).size === ids.length, 'HTML has no duplicate ids');
check(html.includes('id="fhSegLineCards"') && html.includes('Línea que estás editando'), 'explicit line selection and editor UI are present');
check(html.includes('value=""') && html.includes('value="optimization"') && html.includes('value="suspension"'), 'movement UI exposes only empty, optimization and suspension values');
check(html.includes('fhSegObservacionesLinea') && html.includes('fhSegObservacionesGenerales'), 'line and common observations are separate');
check(html.includes('fhSegJaraStatus') && html.includes('fhSegExcelStatus') && html.includes('fhSegNewVisit'), 'export statuses and new visit action are visible');
check(html.includes('Copiar filas Excel FH'), 'Excel action communicates multiline copy');
check(!js.includes('session' + 'Storage') && !js.includes('local' + 'Storage'), 'follow-up uses no browser persistence');
check(!/\blines\s*\[\s*0\s*\]/.test(js) && !/currentBiologicLines\s*\[\s*0\s*\]/.test(js) && !/selected_line_ids\s*\[\s*0\s*\]/.test(js), 'line identity never falls back to first position');
check(!js.includes('tratamiento_id'), 'follow-up identity never uses tratamiento_id');
check(js.includes("root.addEventListener('beforeunload'") && js.includes('!isFullyExported(currentVisit)'), 'beforeunload is limited to incomplete meaningful revisions');
check(js.includes('Esta visita contiene datos que no se han copiado o han cambiado después de la última exportación. Al cambiar de paciente se perderán definitivamente.') && js.includes('Descartar y cambiar'), 'strong patient-switch warning uses the binding copy and explicit choices');
check(js.includes('Al crear una nueva visita se perderán definitivamente.') && js.includes('Descartar y crear nueva visita'), 'strong new-visit warning preserves discard semantics and explicit choices');
check(js.includes('JARA y Excel se copiaron para la revisión actual.') && js.includes('no está guardada ni persistida'), 'light warning names both current-revision copies and never claims persistence');
check(js.includes('buildFollowupVisitModel') && js.includes('buildJaraReport(model)') && js.includes('buildExcelContexts(model)'), 'exports consume the unified visit model');
check(!js.includes('pre-activar') && !js.includes('autoSelected'), 'lines and adverse-event suspect are not implicitly selected');
check(!js.includes("añadido: ACTIVE_STATE") && !js.includes("anadido: ACTIVE_STATE"), 'generic added state is never mapped to active');

const sandbox = {
  window: { document: { addEventListener() {}, getElementById() { return null; } }, FarmaciaDemo: {} },
  document: { addEventListener() {}, getElementById() { return null; } },
  console, Date, Math, JSON, setTimeout, clearTimeout
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(js, sandbox);
const api = sandbox.window.FarmaciaSeguimiento;
check(api && typeof api.searchCIP === 'function' && typeof api.newVisit === 'function', 'guarded CIP search and new visit API are exposed');
check(api && typeof api.buildCsv === 'function', 'CSV is generated from the unified model API');
const adverseVisit = api.createFollowupVisit({ cip: 'CIP-DEMO-FH-001' }, new Date('2026-07-27T10:00:00.000Z'));
api.setLineSelected(adverseVisit, 'BIO-FH-001-L1', true);
api.setAdverseEvent(adverseVisit, { present: 'si', description: 'EA sintético sin sospechoso' });
const adverseValidation = api.validateFollowupVisitModel(api.buildFollowupVisitModel(adverseVisit));
check(!adverseValidation.valid && adverseValidation.errors.some((error) => error.includes('sospechoso')), 'adverse event requires an explicit suspect choice');

console.log(`\n Total: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
