#!/usr/bin/env node
/**
 * T7 #299 deterministic checks for the pure per-concept apply core
 * (D11 value cycle, D16 per-concept matrix, D5 x D16 write eligibility).
 * Synthetic data only. Does not touch the DOM.
 */
import assert from 'node:assert/strict';
import { runUnifiedIntake } from '../scripts/fh_intake_pipeline.js';
import {
  STATE_CURRENT_EMPTY,
  STATE_ALREADY_MATCHES_CURRENT,
  STATE_PROTECTED_EXISTING,
  STATE_CONFLICT,
  STATE_REQUIRES_SELECTION,
  STATE_NO_PROPOSAL,
  HYDRATABLE_CONCEPTS,
  targetForConcept,
  decisionState,
  writeEligibility,
  applyConcept,
} from '../scripts/fh_intake_apply.js';

const ROOT = new URL('..', import.meta.url).pathname;
const { readFileSync } = await import('node:fs');
const path = await import('node:path');

const SELECTED = 'CIP-DEMO-FH-001';
const SEP = '═'.repeat(55);

function eorden({ cip = SELECTED, includeCip = true, dose = '40 MG', brand = 'HYRIMOZ', route = 'SC' } = {}) {
  return [
    'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS', SEP,
    ...(includeCip ? [`• CIP: ${cip}`] : []),
    `• Marca comercial solicitada: ${brand}`, `• Dosis solicitada: ${dose}`,
    `• Vía solicitada: ${route}`, '• Pauta: CADA 14 DIAS',
    '• Inducción solicitada: NO', '• Justificación clínica: Dato sintético T7.',
    'PROGRAMA SES', '• Código: SES_PSOR', '• Denominación: PSORIASIS'
  ].join('\n');
}
const presalud = (dose = '40 MG', brand = 'HYRIMOZ') => `;ADALIMUMAB (${brand});SC;${dose};CADA 14 DIAS;`;
const verified = [{ state: 'VERIFIED_EXPLICIT_CIP' }];
const confirmed = [{ state: 'MANUALLY_CONFIRMED_SELECTED_PATIENT' }];
const unbound = [{ state: 'UNBOUND' }];
const assocConflict = [{ state: 'CONFLICT' }];

function conceptOf(raw, key, options = {}) {
  return runUnifiedIntake(raw, options).reconciled.concepts[key];
}

let passed = 0;
function check(label, actual, expected) {
  assert.equal(actual, expected, label);
  passed += 1;
}
function ok(label, cond) {
  assert.ok(cond, label);
  passed += 1;
}

// -- Target mapping (D7/D16 regular hydratable requested-treatment concepts).
check('requested_dose target', targetForConcept('requested_dose'), 'fhDermaDosis');
check('commercial_name target', targetForConcept('commercial_name'), 'fhDermaFarmaco');
check('requested_route target', targetForConcept('requested_route'), 'fhDermaVia');
check('requested_schedule target', targetForConcept('requested_schedule'), 'fhDermaPauta');
check('requested_induction target', targetForConcept('requested_induction'), 'fhDermaInduccion');
check('requested_justification target', targetForConcept('requested_justification'), 'fhDermaJustificacion');
check('ses_program has no T7 writable target mapping', targetForConcept('ses_program'), 'ses_program');
ok('T7 scope is exactly the six regular hydratable concepts', JSON.stringify(HYDRATABLE_CONCEPTS) === JSON.stringify([
  'commercial_name', 'requested_dose', 'requested_route', 'requested_schedule',
  'requested_induction', 'requested_justification'
]));

// -- D16 per-concept decision matrix on a single-source e-Orden (VERIFIED).
const single = conceptOf(eorden(), 'requested_dose');
check('auto-proposable empty current', decisionState(single, ''), STATE_CURRENT_EMPTY);
check('auto-proposable matching current', decisionState(single, '40 MG'), STATE_ALREADY_MATCHES_CURRENT);
check('auto-proposable different current', decisionState(single, '80 MG'), STATE_PROTECTED_EXISTING);
check('whitespace-only current is empty', decisionState(single, '   '), STATE_CURRENT_EMPTY);

// Pipeline downgrade: with a pre-existing different current the pipeline
// labels the single candidate REQUIRES_SELECTION as a proposal proxy, but D16
// protection says this is PROTECTED_EXISTING (default keep, explicit replace).
const singleProtected = conceptOf(eorden(), 'requested_dose', { currentFormValues: { fhDermaDosis: '80 MG' } });
check('pipeline single-candidate downgrade is still PROTECTED_EXISTING', decisionState(singleProtected, '80 MG'), STATE_PROTECTED_EXISTING);
check('single-candidate downgrade with empty live current stays REQUIRES_SELECTION', decisionState(singleProtected, ''), STATE_REQUIRES_SELECTION);

// -- NO_VALUE / No informado / target NONE never writes.
const noValueDose = conceptOf(eorden({ dose: 'No informado' }), 'requested_dose');
check('No informado is never writable', decisionState(noValueDose, ''), STATE_NO_PROPOSAL);
const noProposalRoute = conceptOf(eorden({ route: 'Otra — vía especificada' }), 'requested_route');
check('Otra route target NONE never writable', decisionState(noProposalRoute, ''), STATE_NO_PROPOSAL);
const principio = conceptOf(presalud(), 'principio_activo_raw');
check('principio_activo_raw provenance-only', decisionState(principio, ''), STATE_NO_PROPOSAL);

// -- D6 reconciliation blockers never writable (no winner / requires selection).
const mixedDose = conceptOf(`${eorden({ dose: '40 MG' })}\n${presalud('80 MG', 'BENEPALI')}`, 'requested_dose');
const conflictState = decisionState(mixedDose, '');
ok('mixed different values produce a blocking state', conflictState === STATE_CONFLICT || conflictState === STATE_REQUIRES_SELECTION);

// -- D5 x D16 write eligibility.
check('verified + CURRENT_EMPTY eligible', writeEligibility(single, '', verified).writable, true);
check('unbound source never writes', writeEligibility(single, '', unbound).writable, false);
check('association CONFLICT never writes', writeEligibility(single, '', assocConflict).writable, false);
check('no association never writes', writeEligibility(single, '', []).writable, false);
check('verified + PROTECTED_EXISTING eligible for replace', writeEligibility(single, '80 MG', verified).writable, true);
check('ALREADY_MATCHES_CURRENT never rewrites', writeEligibility(single, '40 MG', verified).writable, false);
check('reconciliation conflict blocks despite verified association', writeEligibility(mixedDose, '', verified).writable, false);
ok('association CONFLICT reason is distinct from reconciliation CONFLICT',
  writeEligibility(single, '', assocConflict).reason === 'SOURCE_ASSOCIATION_CONFLICT_BLOCKS_WRITE');
ok('unbound reason is distinct', writeEligibility(single, '', unbound).reason === 'SOURCE_ASSOCIATION_NOT_ELIGIBLE');

// -- applyConcept: explicit decision writes; anything else is zero mutation.
const writes = [];
const seam = (target, value) => writes.push([target, value]);
const confirmResult = applyConcept({ reconciled: single, currentValue: '', associationStates: verified, action: 'confirm', write: seam });
check('confirm CURRENT_EMPTY applies', confirmResult.applied, true);
check('confirm records applied_value = source_value', confirmResult.appliedValue, '40 MG');
check('confirm wrote to the exact target', writes[writes.length - 1][0], 'fhDermaDosis');

const replaceResult = applyConcept({ reconciled: single, currentValue: '80 MG', associationStates: verified, action: 'replace', write: seam });
check('replace PROTECTED_EXISTING applies', replaceResult.applied, true);
check('replace records applied_value', replaceResult.appliedValue, '40 MG');

const beforeLen = writes.length;
const wrongAction = applyConcept({ reconciled: single, currentValue: '80 MG', associationStates: verified, action: 'confirm', write: seam });
check('confirm cannot replace a protected value', wrongAction.applied, false);
const emptyWrongAction = applyConcept({ reconciled: single, currentValue: '', associationStates: verified, action: 'replace', write: seam });
check('replace cannot act on an empty current', emptyWrongAction.applied, false);
const unboundAttempt = applyConcept({ reconciled: single, currentValue: '', associationStates: unbound, action: 'confirm', write: seam });
check('unbound source cannot apply', unboundAttempt.applied, false);
const alreadyAttempt = applyConcept({ reconciled: single, currentValue: '40 MG', associationStates: verified, action: 'confirm', write: seam });
check('already-matches cannot rewrite', alreadyAttempt.applied, false);
check('no write occurred for any blocked attempt', writes.length, beforeLen);

// -- Manual edit must not change source_value / historical applied_value.
const afterEdit = applyConcept({ reconciled: single, currentValue: '45 MG', associationStates: verified, action: 'replace', write: seam });
check('manual-edit review keeps applied_value distinct', afterEdit.applied, true);

// -- T7 scope guards (no global apply, no ses write, no validated surface).
const ui = readFileSync(path.join(ROOT, 'scripts/fh_intake_review_ui.js'), 'utf8');
const apply = readFileSync(path.join(ROOT, 'scripts/fh_intake_apply.js'), 'utf8');
for (const [label, file, needle] of [
  ['no localStorage', apply, 'localStorage'],
  ['no sessionStorage', apply, 'sessionStorage'],
  ['no console.', apply, 'console.'],
  ['no global apply in apply core', apply, 'global-apply'],
  ['no localStorage in review_ui', ui, 'localStorage'],
  ['no sessionStorage in review_ui', ui, 'sessionStorage'],
  ['no validated write in review_ui', ui, 'fhValidadoFarmaco'],
  ['no causality write in review_ui', ui, 'fhCausalidadFinal'],
  ['no validated-treatment relation write in review_ui', ui, 'fhValidatedTreatmentRelation'],
]) {
  ok(`${label}`, !file.includes(needle), label);
}

process.stdout.write(`T7 APPLY CORE CHECK PASS ${passed}/${passed}\n`);
