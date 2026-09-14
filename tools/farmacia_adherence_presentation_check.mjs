#!/usr/bin/env node
// tools/farmacia_adherence_presentation_check.mjs
// WO-FH-ADHERENCIA-HUMAN-READABLE-R2-20260914 (issue #355) — deterministic regression
// for the presentation-only human rendering of structured adherence values.
// Surfaces covered: Dashboard Longitudinal summary + historical adherence list,
// Dashboard Paciente summary (static wiring checks; browser QA is separate evidence).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await import('../scripts/farmacia_adherence_presentation.js');
const presentation = globalThis.FarmaciaAdherencePresentation;

const DEMO_RECORD = {
  id: 'ADH-FH-001',
  cip: 'CIP-DEMO-FH-001',
  fecha: '2026-06-01',
  escala: 'Morisky-Green',
  resultado: '4/4',
  interpretacion: 'Alta adherencia',
  fuente: 'Farmacia'
};

// --- A. Structured adherence renders human text without raw JSON -------------

const structured = presentation.adherenceDisplayText([DEMO_RECORD]);
assert.equal(
  structured,
  'Fecha: 2026-06-01 · Escala: Morisky-Green · Resultado: 4/4 · Interpretación: Alta adherencia · Fuente: Farmacia'
);
assert.doesNotMatch(structured, /\{|\}|"/, 'no raw JSON braces or quotes are exposed');
assert.doesNotMatch(structured, /ADH-|cip/, 'technical identifiers stay out of the visible text');

// Single object (non-array) value renders the same record presentation.
assert.equal(presentation.adherenceDisplayText(DEMO_RECORD), structured);

// Explicit-only rendering: fields absent from the record never appear.
const partial = presentation.adherenceDisplayText([{ resultado: '4/4', escala: 'Morisky-Green' }]);
assert.equal(partial, 'Escala: Morisky-Green · Resultado: 4/4');
assert.doesNotMatch(partial, /Fecha|Interpretación|Fuente|No registrado/, 'absent fields stay absent');

// No clinical inference: an uninterpreted result never gains a category.
const uninterpreted = presentation.adherenceDisplayText([{ escala: 'Morisky-Green', resultado: '2/4' }]);
assert.doesNotMatch(uninterpreted, /alta|media|baja|adherente/i, 'no derived adherence category');
assert.doesNotMatch(uninterpreted, /Interpretación/, 'no interpretation is manufactured');

// A stored interpretation is shown as-is, never transformed.
assert.match(
  presentation.adherenceDisplayText([{ resultado: '0', interpretacion: 'Pendiente de revisión' }]),
  /Interpretación: Pendiente de revisión/
);

// Raw-path alias shape (longitudinal historial records) renders the same fields.
assert.equal(
  presentation.adherenceDisplayText([{ visit_date: '2026-03-10', instrument: 'Escala sintética', result: false }]),
  'Fecha: 2026-03-10 · Escala: Escala sintética · Resultado: false'
);

// --- B. No mutation ----------------------------------------------------------

function deepFreeze(value) {
  if (value !== null && typeof value === 'object') {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

const mutationProbe = deepFreeze([{ ...DEMO_RECORD }]);
const beforeMutation = JSON.stringify(mutationProbe);
presentation.adherenceDisplayText(mutationProbe);
presentation.adherenceDisplayText(mutationProbe[0]);
presentation.adherenceFieldText(mutationProbe[0].resultado);
assert.equal(JSON.stringify(mutationProbe), beforeMutation, 'source adherence data is structurally identical after rendering');
assert.equal(Object.isFrozen(mutationProbe), true, 'deep-frozen source stays intact through rendering');

// --- C. Missing / unknown stays neutral --------------------------------------

assert.equal(presentation.adherenceDisplayText(undefined), null);
assert.equal(presentation.adherenceDisplayText(null), null);
assert.equal(presentation.adherenceDisplayText(''), null);
assert.equal(presentation.adherenceDisplayText([]), null, 'empty array is neutral');
assert.equal(presentation.adherenceDisplayText([{}]), null, 'record without explicit fields is neutral');
assert.equal(presentation.adherenceDisplayText([null]), null, 'null record is neutral');

// Structured sub-values without a supported human form never become JSON.
assert.equal(
  presentation.adherenceDisplayText([{ escala: 'Morisky-Green', resultado: { score: 2 } }]),
  'Escala: Morisky-Green',
  'object result value stays neutral instead of leaking JSON'
);
assert.equal(presentation.adherenceFieldText({ structured: true }), null, 'object field value is neutral');
assert.doesNotMatch(
  JSON.stringify(presentation.adherenceDisplayText([{ resultado: { nested: ['a', 'b'] } }])),
  /nested/,
  'no technical property names leak through structured sub-values'
);

// --- D. Legacy strings keep rendering unchanged -------------------------------

assert.equal(presentation.adherenceDisplayText('Alta (Morisky-Green: 4/4)'), 'Alta (Morisky-Green: 4/4)');
assert.equal(presentation.adherenceDisplayText('Sin registro'), 'Sin registro');
assert.equal(presentation.adherenceDisplayText('0'), '0');
assert.equal(presentation.adherenceDisplayText(false), 'false', 'explicit boolean result stays explicit');
assert.equal(presentation.adherenceFieldText('Escala sintética'), 'Escala sintética');
assert.equal(presentation.adherenceFieldText(false), 'false');
assert.equal(presentation.adherenceFieldText(null), null);
assert.equal(presentation.adherenceFieldText(''), null);

// --- E. Dashboard surfaces are wired through the helper ----------------------

const longitudinalSource = readFileSync(path.join(ROOT, 'scripts/farmacia_dashboard_longitudinal.js'), 'utf8');
const pacienteSource = readFileSync(path.join(ROOT, 'scripts/farmacia_dashboard_paciente.js'), 'utf8');
const longitudinalHtml = readFileSync(path.join(ROOT, 'farmacia_dashboard_longitudinal.html'), 'utf8');
const pacienteHtml = readFileSync(path.join(ROOT, 'farmacia_dashboard_paciente.html'), 'utf8');

assert.match(longitudinalSource, /FarmaciaAdherencePresentation\.adherenceDisplayText\(patient\.adherencia\)/,
  'longitudinal summary renders patient.adherencia through the presentation helper');
assert.match(longitudinalSource, /adherenceFieldText\(record\.instrument\)/,
  'longitudinal historical instrument renders through the presentation helper');
assert.match(longitudinalSource, /adherenceFieldText\(record\.result\)/,
  'longitudinal historical result renders through the presentation helper');
assert.doesNotMatch(longitudinalSource, /explicitText\(patient\.adherencia\)/,
  'longitudinal no longer stringifies patient.adherencia generically');

assert.match(pacienteSource, /FarmaciaAdherencePresentation\.adherenceDisplayText\(patient\.adherencia\)/,
  'dashboard paciente summary renders patient.adherencia through the presentation helper');
assert.doesNotMatch(pacienteSource, /explicitText\(patient\.adherencia\)/,
  'dashboard paciente no longer stringifies patient.adherencia generically');

const scriptTag = /<script src="scripts\/farmacia_adherence_presentation\.js\?[^"]*"><\/script>/;
for (const [name, html, dashboardScript] of [
  ['longitudinal', longitudinalHtml, 'farmacia_dashboard_longitudinal.js'],
  ['paciente', pacienteHtml, 'farmacia_dashboard_paciente.js']
]) {
  const helperIndex = html.search(scriptTag);
  const dashboardIndex = html.indexOf(dashboardScript);
  assert.notEqual(helperIndex, -1, `${name} html loads the adherence presentation helper`);
  assert.notEqual(dashboardIndex, -1, `${name} html keeps its dashboard script`);
  assert.ok(helperIndex < dashboardIndex, `${name} html loads the helper before the dashboard script`);
}

console.log('farmacia_adherence_presentation_check: PASS');
