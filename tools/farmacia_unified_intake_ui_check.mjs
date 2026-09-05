#!/usr/bin/env node
/** T6 #298 deterministic identity/association gate checks. Synthetic data only. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runUnifiedIntake } from '../scripts/fh_intake_pipeline.js';
import { associationForSource } from '../scripts/fh_intake_review_ui.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELECTED = 'CIP-DEMO-FH-001';
const SEP = '═'.repeat(55);
const PRESALUD_CONFIRM = 'Confirmo que estos datos PreSalud corresponden al paciente seleccionado.';
const EORDEN_CONFIRM = 'Asociar esta e-Orden sin CIP al paciente seleccionado.';

function eorden({ cip = SELECTED, includeCip = true, extraCip = null } = {}) {
  return [
    'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS', SEP,
    ...(includeCip ? [`• CIP: ${cip}`] : []),
    ...(extraCip ? [`• CIP: ${extraCip}`] : []),
    '• Marca comercial solicitada: HYRIMOZ', '• Dosis solicitada: 40 MG',
    '• Vía solicitada: SC', '• Pauta: CADA 14 DIAS',
    '• Inducción solicitada: NO', '• Justificación clínica: Dato sintético.',
    'PROGRAMA SES', '• Código: SES_PSOR', '• Denominación: PSORIASIS'
  ].join('\n');
}
const presalud = ';ADALIMUMAB (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';
function unit(raw, source) {
  return runUnifiedIntake(raw).units.find(candidate => candidate.source === source);
}
function state(raw, source, selected, confirmed = false) {
  return associationForSource(unit(raw, source), selected, confirmed).state;
}

let passed = 0;
function check(label, actual, expected) {
  assert.equal(actual, expected, label);
  passed += 1;
}

check('no selected patient never verifies', state(eorden(), 'e-orden', null), 'UNBOUND');
check('exact CIP verifies', state(eorden(), 'e-orden', SELECTED), 'VERIFIED_EXPLICIT_CIP');
check('symmetric peripheral trim verifies', state(eorden({ cip: `  ${SELECTED}  ` }), 'e-orden', ` ${SELECTED} `), 'VERIFIED_EXPLICIT_CIP');
for (const value of ['CIP-DEMO-FH-002', 'cip-demo-fh-001', 'CIP-DEMO-FH-001X']) {
  check(`non-exact CIP ${value} conflicts`, state(eorden({ cip: value }), 'e-orden', SELECTED), 'CONFLICT');
}
check('multiple CIP conflicts', state(eorden({ extraCip: 'CIP-DEMO-FH-002' }), 'e-orden', SELECTED), 'CONFLICT');
check('whitespace-only CIP conflicts', state(eorden({ cip: '   ' }), 'e-orden', SELECTED), 'CONFLICT');
check('CIP-less e-Orden starts unbound', state(eorden({ includeCip: false }), 'e-orden', SELECTED), 'UNBOUND');
check('CIP-less e-Orden confirms independently', state(eorden({ includeCip: false }), 'e-orden', SELECTED, true), 'MANUALLY_CONFIRMED_SELECTED_PATIENT');
check('PreSalud starts unbound', state(presalud, 'pre-salud', SELECTED), 'UNBOUND');
check('PreSalud confirms independently', state(presalud, 'pre-salud', SELECTED, true), 'MANUALLY_CONFIRMED_SELECTED_PATIENT');

const mixed = runUnifiedIntake(`${eorden({ includeCip: false })}\n${presalud}`);
const eordenUnit = mixed.units.find(candidate => candidate.source === 'e-orden');
const presaludUnit = mixed.units.find(candidate => candidate.source === 'pre-salud');
check('mixed PreSalud confirmation does not confirm e-Orden', associationForSource(eordenUnit, SELECTED, false).state, 'UNBOUND');
check('mixed PreSalud has its own confirmation', associationForSource(presaludUnit, SELECTED, true).state, 'MANUALLY_CONFIRMED_SELECTED_PATIENT');

const html = readFileSync(path.join(ROOT, 'farmacia_validacion.html'), 'utf8');
const ui = readFileSync(path.join(ROOT, 'scripts/fh_intake_review_ui.js'), 'utf8');
assert.match(html, /textarea[^>]+data-fh-intake-source/);
assert.match(html, /data-fh-intake-preview-panel/);
assert.match(html, /data-fh-intake-apply[^>]+disabled/);
assert.ok(html.includes(PRESALUD_CONFIRM) || ui.includes(PRESALUD_CONFIRM));
assert.ok(html.includes(EORDEN_CONFIRM) || ui.includes(EORDEN_CONFIRM));
for (const forbidden of ['localStorage', 'sessionStorage', 'console.', 'navigator.sendBeacon']) {
  assert.ok(!ui.includes(forbidden), `intake review module must not use ${forbidden}`);
}
passed += 7;
process.stdout.write(`T6 UI CHECK PASS ${passed}/${passed}\n`);
