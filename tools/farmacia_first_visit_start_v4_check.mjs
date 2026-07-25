#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'farmacia_primera_visita.html'), 'utf8');
const adapter = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_first_visit_start_v4.js'), 'utf8');
const firstVisit = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_primera_visita.js'), 'utf8');
const guard = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_validation_export_truth_v4_transition_guard.js'), 'utf8');
let passed = 0;

function test(label, operation) {
  operation();
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function contains(source, pattern, message) {
  assert.match(source, pattern, message);
}

function absent(source, pattern, message) {
  assert.doesNotMatch(source, pattern, message);
}

test('First Visit loads canonical multitreatment core', () => contains(html, /scripts\/farmacia_multitreatment_core\.js\?v=20260725-first-visit-start/));
test('First Visit loads the start adapter after the legacy page controller', () => {
  const controller = html.indexOf('scripts/farmacia_primera_visita.js?v=20260725-first-visit-start');
  const adapterIndex = html.indexOf('scripts/farmacia_first_visit_start_v4.js?v=20260725-first-visit-start');
  assert.ok(controller > 0 && adapterIndex > controller);
});
test('visible confirmation block exposes stable UI identifiers', () => {
  for (const id of ['fhPvStartLineId', 'fhPvStartTreatment', 'fhPvStartState', 'fhPvStartDate', 'fhPvStartProfessional', 'fhPvStartMessage', 'fhPvConfirmStart', 'fhPvGoFollowup']) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
});
test('induction starts neutral', () => contains(html, /id="fhPvInduccionRealizada"><option value="">No informado<\/option>/));
test('stratification starts neutral', () => contains(html, /id="fhPvEstratificacion"><option value="">No informada<\/option>/));
test('baseline PROMs start neutral', () => contains(html, /id="fhPvProms"><option value="">No informado<\/option>/));
test('adapter requires patient_id from URL', () => contains(adapter, /params\.get\('patient_id'\)/));
test('adapter requires line_id from URL', () => contains(adapter, /params\.get\('line_id'\)/));
test('adapter resolves exact patient partition and exact line', () => {
  contains(adapter, /state\.patients\s*&&\s*state\.patients\[context\.patient_id\]/);
  contains(adapter, /patient\.lines\s*&&\s*patient\.lines\[context\.line_id\]/);
});
test('adapter rejects a mismatched patient identity', () => contains(adapter, /line\.patient_id\s*!==\s*context\.patient_id/));
test('adapter requires validated-in-Hub provenance', () => contains(adapter, /line\.provenance\s*!==\s*'validated_in_hub'/));
test('adapter requires a positive matching validation act', () => contains(adapter, /act\.result\s*!==\s*'validated'\s*\|\|\s*act\.produced_line_id\s*!==\s*line\.line_id/));
test('adapter calls the canonical start operation', () => contains(adapter, /confirmTreatmentStart\(\{/));
test('clinical start date comes from the explicit date input', () => contains(adapter, /startDate\s*=\s*text\(byId\('fhPvFecha'\)/));
test('technical timestamp is not used as clinical date', () => {
  contains(adapter, /created_at:\s*new Date\(\)\.toISOString\(\)/);
  absent(adapter, /start_date:\s*new Date/);
});
test('writing a date does not call the core', () => contains(adapter, /dateInput\.addEventListener\('input', updateConfirmAvailability\)/));
test('exports remain gated until canonical active state', () => contains(adapter, /setExportGate\(active\)/));
test('follow-up URL propagates patient_id and line_id', () => {
  contains(adapter, /params\.set\('patient_id', context\.patient_id\)/);
  contains(adapter, /params\.set\('line_id', context\.line_id\)/);
});
test('First Visit report consumes canonical line metadata', () => {
  contains(firstVisit, /FarmaciaFirstVisitStartV4/);
  contains(firstVisit, /Estado línea: active/);
  contains(firstVisit, /Fecha real de inicio:/);
});
test('Excel export consumes canonical start date', () => contains(firstVisit, /getCanonicalStartDate/));
test('Validation propagates canonical patient_id and produced line_id', () => {
  contains(guard, /params\.set\('patient_id'/);
  contains(guard, /params\.set\('line_id'/);
  contains(guard, /snapshot\.produced_line_id/);
});
test('Validation blocks pre-start rectification after active state', () => {
  contains(guard, /El tratamiento ya está iniciado\. Los cambios posteriores requieren un movimiento clínico trazable\./);
  contains(guard, /line\.status\s*===\s*'active'/);
});
test('no positional line fallback is introduced', () => {
  absent(adapter, /lines\s*\[\s*0\s*\]/);
  absent(adapter, /Object\.values\([^)]*lines[^)]*\)\s*\[\s*0\s*\]/);
});
test('no drug-name lookup can select the canonical line', () => absent(adapter, /find\([^\n]*(drug_name|farmaco|principio_activo)/i));

console.log(`farmacia_first_visit_start_v4_check: ${passed} assertions passed`);
