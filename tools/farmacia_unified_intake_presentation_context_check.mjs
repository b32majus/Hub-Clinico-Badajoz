#!/usr/bin/env node
/**
 * WO-FH-EORDEN-CONTEXT-AUTO-REVEAL-01 (issue #334) — deterministic checks for
 * the pure transient e-Orden presentation-context decision. Synthetic data only.
 *
 * Positive: one structurally recognized Dermatology e-Orden with one safe
 * explicit pathology establishes { service: 'derma', pathology } for each of
 * the five Dermatology pathologies (with or without CIP; PreSalud never
 * invents context).
 *
 * Negative (fail closed, null): PreSalud-only input, malformed e-Orden,
 * SES-blocked e-Orden, title/SES conflicting pathology, two distinct e-Orden
 * pathology units (ambiguous), and empty input.
 */
import assert from 'node:assert/strict';
import { runUnifiedIntake } from '../scripts/fh_intake_pipeline.js';
import { eOrdenPresentationContext } from '../scripts/fh_intake_presentation_context.js';

const SEP = '═'.repeat(55);

function eorden(title, code, label, { cip = 'CIP-SINT-334' } = {}) {
  return ['SOLICITUD DERMATOLOGÍA → FARMACIA - ' + title, SEP,
    '• CIP: ' + cip, '• Marca comercial solicitada: HYRIMOZ',
    '• Dosis solicitada: 40 MG', '• Vía solicitada: SC',
    '• Pauta: CADA 14 DIAS', '• Inducción solicitada: NO',
    '• Justificación clínica: Justificación sintética 334.', 'PROGRAMA SES',
    '• Código: ' + code, '• Denominación: ' + label].join('\n');
}

const CASES = [
  ['HIDRADENITIS SUPURATIVA', 'SES_HS', 'HIDRADENITIS SUPURATIVA', 'Hidradenitis supurativa'],
  ['PSORIASIS', 'SES_PSOR', 'PSORIASIS', 'Psoriasis'],
  ['DERMATITIS ATÓPICA', 'SES_DA', 'DERMATITIS ATOPICA', 'Dermatitis atópica'],
  ['VITÍLIGO', 'SES_VITI', 'VITILIGO', 'Vitíligo'],
  ['ALOPECIA AREATA', 'SES_AA', 'ALOPECIA AREATA', 'Alopecia areata'],
];

let passed = 0;
for (const [title, code, label, expected] of CASES) {
  const result = runUnifiedIntake(eorden(title, code, label));
  const context = eOrdenPresentationContext(result);
  assert.deepEqual(context, { service: 'derma', pathology: expected },
    title + ': recognized e-Orden establishes Dermatology presentation context');
  passed++;
  console.log('PASS context ' + title);
}

{
  // CIP-less e-Orden is still an explicit recognized e-Orden source.
  const result = runUnifiedIntake(eorden('PSORIASIS', 'SES_PSOR', 'PSORIASIS', { cip: '' }).replace('• CIP: \n', ''));
  const context = eOrdenPresentationContext(result);
  assert.deepEqual(context, { service: 'derma', pathology: 'Psoriasis' },
    'CIP-less e-Orden keeps explicit presentation context');
  passed++;
  console.log('PASS context CIP-less e-Orden');
}

{
  // Mixed e-Orden + PreSalud: the explicit e-Orden pathology still establishes
  // the context; PreSalud never invents Dermatology context on its own.
  const mixed = eorden('PSORIASIS', 'SES_PSOR', 'PSORIASIS') + '\n\n' + [
    'INICIO DE TRATAMIENTO BIOLÓGICO - DERMATOLOGÍA',
    'Estado: S',
    'Medicamento: ADALIMUMAB (HYRIMOZ) 80MG PLUMA INYECTABLE',
    'Vía: SC',
    'Dosis: 160 MG',
    'Pauta: A LAS 9H - CADA 14 DIAS',
    'Días: 18 meses y 24 días',
  ].join('\n');
  const context = eOrdenPresentationContext(runUnifiedIntake(mixed));
  assert.deepEqual(context, { service: 'derma', pathology: 'Psoriasis' },
    'mixed input keeps explicit e-Orden context');
  passed++;
  console.log('PASS context mixed e-Orden + PreSalud');
}

const NEGATIVES = [
  ['PreSalud-only', 'Estado: S ; Medicamento: ADALIMUMAB (HYRIMOZ) 80MG PLUMA INYECTABLE ; Vía: SC ; Dosis: 160 MG ; Pauta: A LAS 9H - CADA 14 DIAS ; Días: 18 meses y 24 días'],
  ['malformed e-Orden', 'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n• CIP: CIP-SINT-334\n• Marca comercial solicitada: HYRIMOZ'],
  ['empty input', ''],
  ['unknown input', 'Texto clínico no estructurado sin fuente reconocible.'],
];
for (const [name, raw] of NEGATIVES) {
  assert.equal(eOrdenPresentationContext(runUnifiedIntake(raw)), null,
    name + ': no presentation context');
  passed++;
  console.log('PASS negative ' + name);
}

{
  // SES-blocked e-Orden (unknown/out-of-allowlist program) contributes zero
  // usable values: no presentation context.
  const blocked = eorden('PSORIASIS', 'SES_UCE', 'UCE');
  assert.equal(eOrdenPresentationContext(runUnifiedIntake(blocked)), null,
    'SES-blocked e-Orden: no presentation context');
  passed++;
  console.log('PASS negative SES-blocked');
}

{
  // Conflicting source: D17 header title and explicit SES Denominación name
  // different pathologies → internally conflicting → no context.
  const conflict = eorden('PSORIASIS', 'SES_HS', 'HIDRADENITIS SUPURATIVA');
  assert.equal(eOrdenPresentationContext(runUnifiedIntake(conflict)), null,
    'title/SES conflicting pathology: no presentation context');
  passed++;
  console.log('PASS negative title/SES conflict');
}

{
  // Ambiguous: two independent e-Orden units with different explicit
  // pathologies → REQUIRES_SELECTION, no automatic winner, no context.
  const ambiguous = eorden('PSORIASIS', 'SES_PSOR', 'PSORIASIS') + '\n\n'
    + eorden('VITÍLIGO', 'SES_VITI', 'VITILIGO');
  assert.equal(eOrdenPresentationContext(runUnifiedIntake(ambiguous)), null,
    'two distinct e-Orden pathologies: no presentation context');
  passed++;
  console.log('PASS negative ambiguous dual pathology');
}

console.log(`PRESENTATION_CONTEXT_CHECK PASS ${passed} cases`);
