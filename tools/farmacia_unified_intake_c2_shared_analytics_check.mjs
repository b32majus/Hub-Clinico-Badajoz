#!/usr/bin/env node
/**
 * C2 (issue #340) deterministic checks — shared analítica/vacunación surface
 * and the 7 safe concept hydrations (Train C, WO-FH-EORDEN-CLINICAL-HYDRATION-C2-01).
 *
 * Principal frozen oracle: the independently frozen C2 browser oracle
 * (oracle-c2-shared-analytics-hydration.mjs). This file adds the exhaustive
 * deterministic mapping/adapter/protection battery the C2 WO requires:
 *   - exactly the 7 safe analítica/vacunación concepts with exact targets and
 *     hydratable membership (39 C1 + 7 C2 = 46 D17_EXT_V1 hydratable);
 *   - the combined derma_viral_serologies concept stays provenance-only: target
 *     NONE, NO_PROPOSAL, never split into VHB/VHC/VIH controls;
 *   - closed destination adapters (exact valid ISO YYYY-MM-DD date, closed
 *     si/no select, explicit checkbox SÍ only, closed Mantoux enum, exact
 *     SÍ/NO/Pendiente vaccination mapping, literal observations text; no
 *     coercion of any kind);
 *   - D16 protection states and D5 write eligibility preserved for C2 concepts
 *     (CURRENT_EMPTY confirm, ALREADY_MATCHES no-rewrite, PROTECTED_EXISTING
 *     explicit replace, cancel/action mismatch zero mutation, UNBOUND blocks,
 *     missing source never clears);
 *   - parser emission unchanged for transport (AUTO_PROPOSABLE only through the
 *     single targetForConcept mapping; combined serology stays NO_PROPOSAL).
 *
 * Synthetic data only. Does not touch the DOM.
 */
import assert from 'node:assert/strict';
import { parseDermaEOrdenRaw } from '../scripts/fh_eorden_parser.js';
import {
  STATE_CURRENT_EMPTY,
  STATE_ALREADY_MATCHES_CURRENT,
  STATE_PROTECTED_EXISTING,
  STATE_NO_PROPOSAL,
  HYDRATABLE_CONCEPTS,
  D17_EXT_HYDRATABLE_CONCEPTS,
  D17_EXT_CHECKBOX_TARGETS,
  adaptD17ExtControlValue,
  targetForConcept,
  decisionState,
  writeEligibility,
  applyConcept,
  ASSOCIATION_TRANSIENT_NEW_REQUEST,
  ASSOCIATION_UNBOUND,
  ASSOCIATION_CONFLICT,
} from '../scripts/fh_intake_apply.js';

let passed = 0;
let failed = 0;
function ok(label, condition) {
  if (condition) { passed += 1; console.log(`  ✓ ${label}`); }
  else { failed += 1; console.log(`  ✗ ${label}`); }
}

const SEP = '═'.repeat(55);
const MARKER = 'EXTENSIÓN CLÍNICA DERMATOLOGÍA V1';
const TERMINATOR = 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1';

const C2_EXPECTED_TARGETS = Object.freeze({
  derma_lab_date: 'fhAnaliticaFecha',
  derma_lab_complete_lt3m: 'fhAnaliticaReciente',
  derma_cbc_verified: 'fhAnaliticaHemograma',
  derma_biochemistry_verified: 'fhAnaliticaBioquimica',
  derma_tb_screening: 'fhAnaliticaMantoux',
  derma_vaccination_review: 'fhAnaliticaVacunacion',
  derma_vaccination_observations: 'fhAnaliticaObservaciones',
});
const C2_CONCEPTS = Object.keys(C2_EXPECTED_TARGETS);

/** Minimal reconciled node fixture in the exact pipeline shape the core consumes. */
function reconciledNode(concept, value, extra = {}) {
  return {
    concept,
    proposal_status: 'AUTO_PROPOSABLE',
    resolution: 'CORROBORATED',
    value,
    contributions: [{
      concept, value, target: targetForConcept(concept), proposal_status: 'AUTO_PROPOSABLE',
      semantic_status: 'RECOGNIZED', unit_index: 0, line_index: 0,
      provenance: { source: 'e-orden' },
    }],
    ...extra,
  };
}

function noWrites(concept, current, associations, action) {
  const written = [];
  const result = applyConcept({
    reconciled: reconciledNode(concept, C2_SOURCE_VALUES[concept] ?? 'SÍ'),
    currentValue: current,
    associationStates: associations,
    action,
    write: (target, value) => written.push({ target, value }),
  });
  return { result, written };
}

// ─── 1. Exact C2 mapping and hydratable membership ──────────────────────────
console.log('[C2] Exact shared analytics/vaccination mapping (issue #340)');
ok('frozen C2 mapping count is exactly 7', C2_CONCEPTS.length === 7);
for (const [concept, target] of Object.entries(C2_EXPECTED_TARGETS)) {
  ok(`${concept}: exact target ${target} + hydratable`,
    targetForConcept(concept) === target && HYDRATABLE_CONCEPTS.includes(concept));
}
ok('D17_EXT_HYDRATABLE_CONCEPTS is exactly 39 C1 + 7 C2 = 46', D17_EXT_HYDRATABLE_CONCEPTS.length === 46);
ok('the 7 C2 concepts are inside D17_EXT_HYDRATABLE_CONCEPTS',
  C2_CONCEPTS.every((concept) => D17_EXT_HYDRATABLE_CONCEPTS.includes(concept)));
ok('C2 checkbox targets are declared (explicit SÍ only, never unchecks)',
  D17_EXT_CHECKBOX_TARGETS.includes('fhAnaliticaHemograma') && D17_EXT_CHECKBOX_TARGETS.includes('fhAnaliticaBioquimica'));

// ─── 2. Combined serology: provenance-only, never split ─────────────────────
console.log('\n[C2] derma_viral_serologies stays provenance-only (NO VHB/VHC/VIH split)');
ok('derma_viral_serologies: target NONE', targetForConcept('derma_viral_serologies') === 'NONE');
ok('derma_viral_serologies: not hydratable', !HYDRATABLE_CONCEPTS.includes('derma_viral_serologies'));
ok('no C2 concept targets the three separate serology controls',
  [...HYDRATABLE_CONCEPTS].every((concept) =>
    !['fhAnaliticaSerologiasVhb', 'fhAnaliticaSerologiasVhc', 'fhAnaliticaSerologiasVih'].includes(targetForConcept(concept))));

// ─── 3. Closed destination adapters ──────────────────────────────────────────
console.log('\n[C2] Closed destination adapters (no coercion)');
{
  const dateCases = {
    '2026-09-01': true, '2024-02-29': true, '2025-12-31': true,
    '07/09/2026': false, '2026-02-30': false, '2026-13-01': false, '2026-9-1': false,
    '2026-09-1': false, '2026/09/01': false, '2026-02-29': false, '': false, '20260901': false,
  };
  for (const [value, valid] of Object.entries(dateCases)) {
    const adapted = adaptD17ExtControlValue('derma_lab_date', value);
    ok(`date ${JSON.stringify(value)} -> ${valid ? 'accepted' : 'rejected'}`, adapted.ok === valid);
  }
  ok('date adapter preserves the exact ISO text', adaptD17ExtControlValue('derma_lab_date', '2026-09-01').text === '2026-09-01');
}
{
  const recienteCases = { 'SÍ': 'si', 'NO': 'no' };
  for (const [value, expected] of Object.entries(recienteCases)) {
    ok(`reciente ${value} -> ${expected}`, adaptD17ExtControlValue('derma_lab_complete_lt3m', value).text === expected);
  }
  for (const bad of ['Pendiente', 'SI', 'Sí', 'checked', 'SÍ ']) {
    if (bad === 'SÍ ') { continue; } // peripheral trim is the authorized normalization
    ok(`reciente rejects ${JSON.stringify(bad)}`, adaptD17ExtControlValue('derma_lab_complete_lt3m', bad).ok === false);
  }
}
{
  for (const good of ['SÍ']) {
    ok(`hemograma accepts ${good}`, adaptD17ExtControlValue('derma_cbc_verified', good).text === 'SÍ');
    ok(`bioquimica accepts ${good}`, adaptD17ExtControlValue('derma_biochemistry_verified', good).text === 'SÍ');
  }
  for (const bad of ['NO', 'checked', 'true', '']) {
    ok(`hemograma rejects ${JSON.stringify(bad)}`, adaptD17ExtControlValue('derma_cbc_verified', bad).ok === false);
    ok(`bioquimica rejects ${JSON.stringify(bad)}`, adaptD17ExtControlValue('derma_biochemistry_verified', bad).ok === false);
  }
}
{
  for (const good of ['Negativo', 'Positivo - tratado', 'Pendiente']) {
    ok(`mantoux accepts verbatim ${JSON.stringify(good)}`, adaptD17ExtControlValue('derma_tb_screening', good).text === good);
  }
  for (const bad of ['Positivo', 'POSITIVO - TRATADO', 'negativo', '']) {
    ok(`mantoux rejects ${JSON.stringify(bad)}`, adaptD17ExtControlValue('derma_tb_screening', bad).ok === false);
  }
}
{
  const vaccinationCases = { 'SÍ': 'si', 'NO': 'no', 'Pendiente': 'pendiente' };
  for (const [value, expected] of Object.entries(vaccinationCases)) {
    ok(`vaccination review ${value} -> ${expected}`, adaptD17ExtControlValue('derma_vaccination_review', value).text === expected);
  }
  for (const bad of ['Sí', 'si', 'pendiente', 'No informado', '']) {
    ok(`vaccination review rejects ${JSON.stringify(bad)}`, adaptD17ExtControlValue('derma_vaccination_review', bad).ok === false);
  }
}
{
  ok('observations accept literal text verbatim', adaptD17ExtControlValue('derma_vaccination_observations', 'Vacunación sintética pendiente').text === 'Vacunación sintética pendiente');
  ok('observations reject empty', adaptD17ExtControlValue('derma_vaccination_observations', '').ok === false);
}

// ─── 4. Parser emission: transport unchanged, mapping via targetForConcept ──
console.log('\n[C2] Parser emission for the shared analítica/vacunación section');
{
  const raw = [
    'SOLICITUD DERMATOLOGÍA → FARMACIA - HIDRADENITIS SUPURATIVA', SEP,
    '• CIP: CIP-SINT-C2',
    '• Marca comercial solicitada: HYRIMOZ', '• Dosis solicitada: 40 MG',
    '• Vía solicitada: SC', '• Pauta: CADA 14 DIAS', '• Inducción solicitada: NO',
    '• Justificación clínica: Justificación sintética C2.',
    'PROGRAMA SES', '• Código: SES_HS', '• Denominación: HIDRADENITIS SUPURATIVA',
    MARKER,
    'DATOS CLÍNICOS — HIDRADENITIS SUPURATIVA',
    '• IHS4: 12',
    'ANALÍTICA Y VACUNACIÓN',
    '• Fecha analítica: 2026-09-01',
    '• Analítica completa <3 meses: SÍ',
    '• Hemograma verificado: SÍ',
    '• Bioquímica verificada: SÍ',
    '• Mantoux/IGRA: Negativo',
    '• VHB/VHC/VIH: Positivo',
    '• Vacunación completa/revisada: Pendiente',
    '• Observaciones vacunación: Vacunación sintética pendiente',
    'COMORBILIDADES',
    '• IMC: 27.4',
    TERMINATOR,
  ].join('\n');
  const result = parseDermaEOrdenRaw(raw);
  ok('extension unit stays RECOGNIZED with transport intact', result.unit_state === 'RECOGNIZED' && result.raw_input === raw);
  for (const concept of C2_CONCEPTS) {
    const contribution = result.contributions.find((item) => item.concept === concept);
    ok(`${concept}: emitted once, target ${C2_EXPECTED_TARGETS[concept]} + AUTO_PROPOSAL`,
      contribution && result.contributions.filter((item) => item.concept === concept).length === 1
      && contribution.target === C2_EXPECTED_TARGETS[concept]
      && contribution.proposal_status === 'AUTO_PROPOSABLE'
      && contribution.semantic_status === 'RECOGNIZED');
  }
  const serology = result.contributions.filter((item) => item.concept === 'derma_viral_serologies');
  ok('derma_viral_serologies: emitted once as provenance only (NONE + NO_PROPOSAL)',
    serology.length === 1 && serology[0].target === 'NONE' && serology[0].proposal_status === 'NO_PROPOSAL'
    && serology[0].semantic_status === 'RECOGNIZED' && serology[0].value === 'Positivo');
}

// ─── 5. D16 protection states + D5 eligibility for the 7 ────────────────────
console.log('\n[C2] D16/D5 protections for the shared concepts');
const TRANSIENT = [{ state: ASSOCIATION_TRANSIENT_NEW_REQUEST, reason: 'EXPLICIT_CIP_NEW_REQUEST' }];
/** Source value as the producer/parser emits it (proposal space input). */
const C2_SOURCE_VALUES = Object.freeze({
  derma_lab_date: '2026-09-01',
  derma_lab_complete_lt3m: 'SÍ',
  derma_cbc_verified: 'SÍ',
  derma_biochemistry_verified: 'SÍ',
  derma_tb_screening: 'Negativo',
  derma_vaccination_review: 'Pendiente',
  derma_vaccination_observations: 'Vacunación sintética pendiente',
});
/** Adapted control-space text the closed adapter produces (written value). */
const C2_ADAPTED_VALUES = Object.freeze({
  derma_lab_date: '2026-09-01',
  derma_lab_complete_lt3m: 'si',
  derma_cbc_verified: 'SÍ',
  derma_biochemistry_verified: 'SÍ',
  derma_tb_screening: 'Negativo',
  derma_vaccination_review: 'pendiente',
  derma_vaccination_observations: 'Vacunación sintética pendiente',
});
for (const concept of C2_CONCEPTS) {
  const sourceText = C2_SOURCE_VALUES[concept];
  const adaptedText = C2_ADAPTED_VALUES[concept];
  const node = reconciledNode(concept, sourceText);
  ok(`${concept}: empty current -> CURRENT_EMPTY`, decisionState(node, '') === STATE_CURRENT_EMPTY);
  ok(`${concept}: CURRENT_EMPTY + transient -> confirm writable`, writeEligibility(node, '', TRANSIENT).writable === true);
  ok(`${concept}: CURRENT_EMPTY + unbound -> blocked`, writeEligibility(node, '', [{ state: ASSOCIATION_UNBOUND, reason: 'X' }]).writable === false);
  ok(`${concept}: matching adapted current -> ALREADY_MATCHES_CURRENT (no rewrite)`,
    decisionState(node, adaptedText) === STATE_ALREADY_MATCHES_CURRENT
    && writeEligibility(node, adaptedText, TRANSIENT).reason === 'ALREADY_MATCHES_CURRENT_NO_REWRITE');
  ok(`${concept}: different current -> PROTECTED_EXISTING (needs explicit replace)`,
    decisionState(node, 'valor local protegido') === STATE_PROTECTED_EXISTING
    && writeEligibility(node, 'valor local protegido', TRANSIENT).writable === true);
  ok(`${concept}: confirm action on PROTECTED_EXISTING -> zero mutation`,
    noWrites(concept, 'valor local protegido', TRANSIENT, 'confirm').written.length === 0);
  ok(`${concept}: association conflict blocks`, writeEligibility(node, '', [{ state: ASSOCIATION_CONFLICT, reason: 'CIP_DOES_NOT_MATCH_SELECTED_PATIENT' }]).writable === false);
  ok(`${concept}: missing source (null value) -> NO_PROPOSAL, never clears`,
    decisionState(reconciledNode(concept, null), 'algo') === STATE_NO_PROPOSAL
    && noWrites(concept, '', [], 'confirm').written.length === 0);
  {
    const written = [];
    const result = applyConcept({
      reconciled: node, currentValue: '', associationStates: TRANSIENT, action: 'confirm',
      write: (target, value) => written.push({ target, value }),
    });
    ok(`${concept}: confirm on empty writes exact adapted value to the exact target`,
      result.applied === true && written.length === 1 && written[0].target === C2_EXPECTED_TARGETS[concept]
      && written[0].value === adaptedText);
  }
}
{
  // Adapter-rejected values are never proposals: the date boundary closes before D16.
  const badDate = reconciledNode('derma_lab_date', '07/09/2026');
  ok('non-ISO date proposal -> NO_PROPOSAL (fail closed)', decisionState(badDate, '') === STATE_NO_PROPOSAL);
  ok('non-ISO date never writes even on confirm',
    applyConcept({ reconciled: badDate, currentValue: '', associationStates: TRANSIENT, action: 'confirm', write: () => { throw new Error('must not write'); } }).applied === false);
}

console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
console.log(failed === 0 ? '✓ C2 shared analytics/vaccination fixture battery PASSED' : '✗ C2 shared analytics/vaccination fixture battery FAILED');
process.exitCode = failed === 0 ? 0 : 1;
