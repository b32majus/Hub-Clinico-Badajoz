#!/usr/bin/env node
/**
 * FROZEN PRINCIPAL ACCEPTANCE ORACLE — T3 delivery-repair (issue #295).
 *
 * Derived SOLELY from the accepted repair authority, in truth order:
 *   reconciled Unified Clinical Intake spec
 *   docs/specs/SPEC_FH_UNIFIED_CLINICAL_INTAKE_V0.md (D3/D5/D7/D17)
 *   + the 5 already-adjudicated residual T3 defects.
 * Where the stale issue #295 body conflicts with that authority, this oracle
 * follows the reconciled spec (Justificación clínica + full PROGRAMA SES block
 * obligatory; exact CIP-less source variant; blank-line prohibition).
 *
 * FROZEN: the implementation worker (builder) RUNS this oracle but must NOT
 * weaken, replace, or edit it. Any material oracle change returns the work to
 * shaping / re-freeze. Builder-added tests may supplement but never replace it.
 *
 * Scope: the 5 residual audited T3 defects ONLY —
 *   (1) Justificación clínica required and preserved.
 *   (2) Exact CIP-less source variant accepted as UNBOUND.
 *   (3) Present-but-empty CIP rejected (never equivalent to CIP-less).
 *   (4) PROGRAMA SES required/coherent.
 *   (5) Internal blank lines must not be silently removed to fabricate D17.
 */
import {
    parseDermaEOrdenRaw,
    UNIT_STATE_RECOGNIZED,
    UNIT_STATE_UNRECOGNIZED,
} from '../scripts/fh_eorden_parser.js';

let passed = 0; let failed = 0;
function check(condition, label) {
    if (condition) { console.log(`  ✓ ${label}`); passed += 1; }
    else { console.log(`  ✗ ${label}`); failed += 1; }
}

const SEP = '═'.repeat(55);
const canonical = (overrides = {}) => {
    const lines = [
        `SOLICITUD DERMATOLOGÍA → FARMACIA - ${overrides.title ?? 'PSORIASIS'}`,
        SEP,
        `• CIP: ${overrides.cip ?? 'CIP-SINT-0001'}`,
        `• Marca comercial solicitada: ${overrides.brand ?? 'HYRIMOZ'}`,
        `• Dosis solicitada: ${overrides.dose ?? '40 MG'}`,
        `• Vía solicitada: ${overrides.route ?? 'SC'}`,
        `• Pauta: ${overrides.schedule ?? 'CADA 14 DIAS'}`,
        `• Inducción solicitada: ${overrides.induction ?? 'NO'}`,
        `• Justificación clínica: ${overrides.justification ?? 'Psoriasis moderada-grave: fracaso de tópico.'}`,
        'PROGRAMA SES',
        `• Código: ${overrides.sesCode ?? 'SES_PSOR'}`,
        `• Denominación: ${overrides.sesLabel ?? 'PSORIASIS'}`,
    ];
    return lines.join('\n');
};
const concept = (result, name) => result.contributions.find((c) => c.concept === name);

console.log('\n[ORACLE-1] Justificación clínica required and preserved');
{
    const raw = canonical(); const r = parseDermaEOrdenRaw(raw);
    check(r.unit_state === UNIT_STATE_RECOGNIZED, 'O1: canonical unit with Justificación is RECOGNIZED');
    const j = concept(r, 'requested_justification');
    check(j?.target === 'fhDermaJustificacion' && j?.proposal_status === 'AUTO_PROPOSABLE',
        'O1: requested_justification targets fhDermaJustificacion as AUTO_PROPOSABLE');
    check(j?.value === 'Psoriasis moderada-grave: fracaso de tópico.' && j?.source_value === j?.value,
        'O1: justification value preserved verbatim as source_value');
    check(r.can_apply === false && r.raw_input === raw, 'O1: gates hold and raw preserved');
}
{
    const raw = canonical().split('\n').filter((l) => !l.startsWith('• Justificación clínica:')).join('\n');
    const r = parseDermaEOrdenRaw(raw);
    check(r.unit_state === UNIT_STATE_UNRECOGNIZED && r.contributions.length === 0 && r.raw_input === raw,
        'O2: unit missing Justificación is NOT recognized with proposals (raw preserved, zero proposals)');
}
{
    const raw = canonical({ justification: 'Hidradenitis supurativa, Hurley II; indicado según programa SES_HS.' });
    const r = parseDermaEOrdenRaw(raw);
    check(concept(r, 'requested_justification')?.value ===
        'Hidradenitis supurativa, Hurley II; indicado según programa SES_HS.',
        'O3: justification free text preserved exactly (no normalization, no truncation)');
}

console.log('\n[ORACLE-2] Exact CIP-less source variant accepted as UNBOUND');
{
    const raw = canonical().split('\n').filter((l) => !l.startsWith('• CIP:')).join('\n');
    const r = parseDermaEOrdenRaw(raw);
    check(r.unit_state === UNIT_STATE_RECOGNIZED, 'O4: exact CIP-less envelope is still recognized');
    const c = concept(r, 'cip');
    check(c?.semantic_status === 'UNBOUND' && c?.value === null && c?.target === 'NONE' &&
        c?.proposal_status === 'NO_PROPOSAL',
        'O4: absent CIP is explicitly UNBOUND (null value, target NONE, NO_PROPOSAL)');
    check(['commercial_name', 'requested_dose', 'requested_route', 'requested_schedule',
        'requested_induction', 'requested_justification', 'ses_program']
        .every((n) => concept(r, n)?.proposal_status === 'AUTO_PROPOSABLE'),
        'O4: safe concepts stay usable in the CIP-less variant');
    check(r.can_apply === false && !r.contributions.some((x) => x.semantic_status === 'VERIFIED_EXPLICIT_CIP'),
        'O5: CIP-less never invents or selects a patient (no verified identity, can_apply false)');
}

console.log('\n[ORACLE-3] Present-but-empty CIP rejected');
{
    const raw = canonical().replace('• CIP: CIP-SINT-0001', '• CIP:');
    const r = parseDermaEOrdenRaw(raw);
    check(r.unit_state === UNIT_STATE_UNRECOGNIZED && r.contributions.length === 0 && r.raw_input === raw,
        'O6: present-but-empty CIP line is rejected (never CIP-less, zero proposals, raw preserved)');
    check(!r.contributions.some((x) => x.semantic_status === 'UNBOUND'),
        'O6: empty CIP is not marked UNBOUND');
}
{
    const raw = canonical().replace('• CIP: CIP-SINT-0001', '• CIP:    ');
    const r = parseDermaEOrdenRaw(raw);
    check(r.unit_state === UNIT_STATE_UNRECOGNIZED && r.contributions.length === 0,
        'O7: whitespace-only CIP value is rejected like empty CIP');
}

console.log('\n[ORACLE-4] PROGRAMA SES required/coherent');
{
    const raw = canonical().split('\n').filter((l) =>
        l !== 'PROGRAMA SES' && !l.startsWith('• Código:') && !l.startsWith('• Denominación:')).join('\n');
    const r = parseDermaEOrdenRaw(raw);
    check(r.unit_state === UNIT_STATE_UNRECOGNIZED && r.contributions.length === 0 && r.raw_input === raw,
        'O8: unit missing the whole SES block is NOT recognized with proposals');
}
{
    const raw = canonical({ sesCode: 'SES_HS', sesLabel: 'HIDRADENITIS SUPURATIVA' });
    const r = parseDermaEOrdenRaw(raw);
    const s = concept(r, 'ses_program');
    check(s?.proposal_status === 'AUTO_PROPOSABLE' && s?.value?.code === 'SES_HS' &&
        s?.value?.label === 'HIDRADENITIS SUPURATIVA',
        'O9: coherent allowlist pair yields complete ses_program (code+label together)');
}
{
    const raw = canonical({ sesCode: 'SES_UCE', sesLabel: 'URTICARIA' });
    const r = parseDermaEOrdenRaw(raw);
    const s = concept(r, 'ses_program');
    check(s?.blocking === true && s?.target === 'NONE' && s?.proposal_status === 'NO_PROPOSAL' &&
        s?.reason?.code === 'SES_OUT_OF_ALLOWLIST',
        'O10: out-of-allowlist code is deterministically blocked (no mapping, no fallback)');
    check(concept(r, 'commercial_name')?.proposal_status === 'AUTO_PROPOSABLE',
        'O10: SES block does not take down safe siblings of the same unit');
}
{
    const raw = canonical().split('\n').filter((l) => !l.startsWith('• Denominación:')).join('\n');
    const r = parseDermaEOrdenRaw(raw);
    check(concept(r, 'ses_program')?.reason?.code === 'SES_CODE_WITHOUT_LABEL' &&
        concept(r, 'ses_program')?.blocking === true,
        'O11: code without label is blocked as incomplete pair');
}

console.log('\n[ORACLE-5] Internal blank lines never fabricate canonical D17');
{
    const lines = canonical().split('\n');
    const raw = [...lines.slice(0, 5), '', ...lines.slice(5)].join('\n');
    const r = parseDermaEOrdenRaw(raw);
    check(r.unit_state === UNIT_STATE_UNRECOGNIZED && r.contributions.length === 0 && r.raw_input === raw,
        'O12: blank line between fields is rejected (not silently dropped to fabricate D17)');
}
{
    const lines = canonical().split('\n');
    const sesIdx = lines.indexOf('PROGRAMA SES');
    const raw = [...lines.slice(0, sesIdx + 1), '   ', ...lines.slice(sesIdx + 1)].join('\n');
    const r = parseDermaEOrdenRaw(raw);
    check(r.unit_state === UNIT_STATE_UNRECOGNIZED && r.contributions.length === 0,
        'O13: whitespace-only line inside the SES block is rejected');
}
{
    const raw = `\n\n${canonical()}\n\n`;
    const r = parseDermaEOrdenRaw(raw);
    check(r.unit_state === UNIT_STATE_RECOGNIZED &&
        concept(r, 'requested_justification')?.proposal_status === 'AUTO_PROPOSABLE',
        'O14: leading/trailing blank lines are authorized peripheral transport (still RECOGNIZED)');
}

console.log('\n[ORACLE-R] Regression guard: exact-label discipline survives the repair');
{
    const raw = canonical().replace('Vía solicitada:', 'Via solicitada:');
    const r = parseDermaEOrdenRaw(raw);
    check(r.unit_state === UNIT_STATE_UNRECOGNIZED && r.contributions.length === 0,
        'O15: missing accent in label still rejects (no accent folding introduced by repair)');
}

console.log(`\nORACLE RESULT: ${passed} OK / ${failed} FAILED`);
console.log(failed === 0 ? '✓ ACCEPTANCE ORACLE PASSED' : '✗ ACCEPTANCE ORACLE FAILED');
process.exitCode = failed === 0 ? 0 : 1;
