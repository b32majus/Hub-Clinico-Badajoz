#!/usr/bin/env node
'use strict';
/**
 * Deterministic checker for the PROMueve Nexus N0 renewal handoff contract
 * (WO-RECOVERY-NEXUS-RENEWALS-N0-REFREEZE-20261004, issue #509).
 *
 * Recovery/refreeze of the rejected candidate d829939 under the HUMAN SHAPING
 * REFREEZE (#446) and #509. No runtime: an independent oracle over the frozen
 * artifacts (2 schemas + state machine + tools/fixtures/renewal/**).
 *
 * It must disagree with the contract: planted negatives are rejected for the
 * EXPECTED reason, the state-machine detector is exercised by a small mutation
 * battery labelled per invariant, and the window + duration-derivation equality
 * are recomputed independently. Exceptions are ALWAYS a FAIL (finding 1):
 * runCase() + top-level try/catch + the executable probe
 * `--probe-exception-fail-closed` (must print a FAIL line and exit non-zero).
 *
 * Exit codes: 0 = all PASS, 1 = at least one FAIL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Ajv = require('ajv/dist/2020.js');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_DIR = path.join(ROOT, 'schemas', 'renewal');
const FIXTURE_DIR = path.join(ROOT, 'tools', 'fixtures', 'renewal');

const CONTRACT_VERSION = 'renewal-handoff/v1';
const FH_RT = 'renewal_handoff_fh_to_nursing';
const RET_RT = 'renewal_report_nursing_to_fh';
const FH_SCHEMA = 'renewal_handoff_fh_to_nursing_v1.schema.json';
const RET_SCHEMA = 'renewal_handoff_nursing_to_fh_v1.schema.json';
const MACHINE_FILE = 'renewal_state_machine_v1.json';

const EXP_FH_KEYS = 'contract_version demo_flag evaluated_at exported_at exported_by_role issue_date line_id patient_id record_type renewal_id service_id service_label treatment treatment_id valid_until valid_until_kind valid_until_source validity_days warning_window_days window_state'.split(' ');
const EXP_RET_KEYS = 'comment contract_version demo_flag line_id patient_id record_type renewal_id report_type reported_at reported_by reported_by_role service_id'.split(' ');
const EXP_TREATMENT_KEYS = ['drug_display', 'line_label'];
const EXP_KINDS = ['confirmed', 'estimated', 'unknown', 'verified'];
const EXP_SOURCES = 'circuit_entry_estimate manual_estimate not_recorded pharmacy_verified_remaining_period prescription_issue_date_confirmed_duration_confirmed prescription_issue_date_confirmed_duration_configured prescription_valid_until_confirmed'.split(' ');
const EXP_REPORT_TYPES = ['SOLICITADA_AL_PRESCRIPTOR', 'RENOVACIÓN_COMUNICADA', 'SUSPENSIÓN_COMUNICADA'];
const EXP_LINE_STATUSES = 'active stopped switched cancelled completed suspended'.split(' ');
const EXP_TERMINALS = ['ACTUALIZADA_POR_FH', 'TRATAMIENTO_SUSPENDIDO'];
const DURATION_SOURCES = new Set([
  'prescription_issue_date_confirmed_duration_confirmed',
  'prescription_issue_date_confirmed_duration_configured'
]);
// Fields a Nursing->FH return must never carry (extra key => forbidden). Kept
// explicit so the reason is auditable; lifecycle_state was deleted in the refreeze.
const FORBIDDEN_RETURN_FIELDS = new Set('valid_until valid_until_kind valid_until_source validity_days issue_date dose dose_text route schedule schedule_code presentation induction induction_status causality validation_result validated_treatment_relation renewed_at renewed_by lifecycle_state window_state switch add_on active_ingredient drug_name drug_display line_status commit_id act_id'.split(' '));
const FORBIDDEN_NAME_PATTERNS = [/drug/i, /switch/i, /add_?on/i, /absence/i, /silence/i, /elapsed/i, /dose/i, /route/i, /schedule/i, /presentation/i, /induction/i, /causality/i];

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass: !!pass, detail: detail || '' });
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
};
// Fail-closed case runner: an exception is ALWAYS a FAIL.
function runCase(fn) {
  try {
    const r = fn();
    return r && typeof r === 'object' && 'pass' in r ? { pass: !!r.pass, detail: r.detail || '' } : { pass: !!r, detail: '' };
  } catch (e) { return { pass: false, detail: `threw: ${e.message}` }; }
}
const loadJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
function buildValidator(schemaFile) {
  const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true, validateFormats: false });
  const schema = loadJson(path.join(SCHEMA_DIR, schemaFile));
  return { validate: ajv.compile(schema), schema };
}
const ajvFormat = (errors) => (errors || []).map((e) => `${e.instancePath || '/'} ${e.keyword} ${e.message}`).join('; ');
const sameSet = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const actorKey = (t) => JSON.stringify([...(t.actors || [])].sort());

function schemaErrorCode(errors, recordType) {
  for (const e of errors || []) {
    if (e.instancePath === '/contract_version') return 'UNSUPPORTED_CONTRACT_VERSION';
    if (e.keyword === 'required' && e.params && e.params.missingProperty) {
      return e.params.missingProperty === 'contract_version' ? 'UNSUPPORTED_CONTRACT_VERSION' : 'MISSING_REQUIRED_FIELD';
    }
    if (e.keyword === 'additionalProperties' && e.params && e.params.additionalProperty) {
      const prop = e.params.additionalProperty;
      return recordType === RET_RT && FORBIDDEN_RETURN_FIELDS.has(prop) ? 'FORBIDDEN_FIELD_IN_RETURN' : 'INVALID_FIELD';
    }
  }
  return 'INVALID_FIELD';
}

// --- strict runtime calendar validation (authoritative; schema patterns are
// annotation-only). No Date normalisation: 2026-02-31 is rejected. ---
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(\.\d{1,9})?(Z|[+-](0\d|1[0-3]):[0-5]\d|[+-]14:00)$/;
const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const daysInMonth = (y, m) => [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
function isValidDate(s) {
  const m = DATE_RE.exec(typeof s === 'string' ? s : '');
  if (!m) return false;
  const y = Number(m[1]);
  const d = Number(m[3]);
  return y >= 1 && Number(m[2]) >= 1 && Number(m[2]) <= 12 && d >= 1 && d <= daysInMonth(y, Number(m[2]));
}
function isValidDateTime(s) {
  const m = DATETIME_RE.exec(typeof s === 'string' ? s : '');
  return !!m && isValidDate(`${m[1]}-${m[2]}-${m[3]}`);
}
function semanticDateErrors(doc) {
  const errors = [];
  const check = (field, fn, label) => {
    const v = doc[field];
    if (v !== undefined && v !== null && !fn(v)) errors.push(`${field} is not a real calendar ${label}: ${JSON.stringify(v)}`);
  };
  if (doc.record_type === FH_RT) {
    check('evaluated_at', isValidDateTime, 'date-time');
    check('exported_at', isValidDateTime, 'date-time');
    check('issue_date', isValidDate, 'date');
    check('valid_until', isValidDate, 'date');
  } else if (doc.record_type === RET_RT) check('reported_at', isValidDateTime, 'date-time');
  return errors;
}

// --- finding 4: a derivation source must derive its endpoint. Pure civil-calendar
// addition over already-validated dates. ---
function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}
function derivationErrors(doc) {
  if (!DURATION_SOURCES.has(doc.valid_until_source)) return [];
  const { valid_until, issue_date, validity_days } = doc;
  if (typeof issue_date !== 'string' || !Number.isInteger(validity_days)) return []; // schema catches
  if (typeof valid_until !== 'string' || !isValidDate(issue_date) || !isValidDate(valid_until)) return [];
  const expected = addDays(issue_date, validity_days);
  return expected === valid_until ? [] : [`valid_until ${valid_until} != issue_date ${issue_date} + ${validity_days}d (${expected})`];
}

function windowStateErrors(doc) {
  if (doc.valid_until_kind === 'unknown') {
    const errors = [];
    if (doc.valid_until !== null) errors.push('unknown kind must not materialize valid_until');
    if (doc.window_state !== 'not_evaluable') errors.push('unknown kind must be not_evaluable');
    return errors;
  }
  if (typeof doc.valid_until !== 'string') return ['non-unknown kind requires a concrete valid_until'];
  if (!isValidDate(doc.valid_until) || !isValidDateTime(doc.evaluated_at)) return ['dates are not real calendar values; window not recomputable'];
  const days = Math.round((Date.parse(`${doc.valid_until}T00:00:00Z`) - Date.parse(`${doc.evaluated_at.slice(0, 10)}T00:00:00Z`)) / 86400000);
  const expected = days < 0 ? 'expired' : days <= doc.warning_window_days ? 'due_soon' : 'outside_window';
  return doc.window_state === expected ? [] : [`declared window_state=${doc.window_state} but recomputed ${expected} (days=${days})`];
}

// --- reference reconciliation model. Idempotency memory = LAST APPLIED OPERATION
// ONLY (multi-operation history / report_id deferred to N3, not frozen here). ---
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}
function freshState(seed) {
  const known = {};
  for (const r of seed.known_renewals) {
    known[r.renewal_id] = { patient_id: r.patient_id, line_id: r.line_id, service_id: r.service_id, lifecycle_state: r.lifecycle_state, line_status: r.line_status, last_applied: null };
  }
  return { known };
}
const findTransition = (machine, from, to, actor) =>
  machine.transitions.find((t) => t.from === from && t.to === to && Array.isArray(t.actors) && t.actors.includes(actor));

// Per-row order: UNKNOWN_RENEWAL_ID -> IDENTITY_MISMATCH -> LINE_NOT_ACTIVE ->
// exact replay of the last applied operation => no_op -> same operation identity
// with a different payload => STATE_CONFLICT -> target unreachable/regressive via
// a nursing edge => REPORT_NOT_APPLICABLE -> otherwise accept the nursing edge.
function applyReturn(state, doc, machine) {
  const rec = state.known[doc.renewal_id];
  if (!rec) return { outcome: 'rejected', error_code: 'UNKNOWN_RENEWAL_ID', applied: false };
  if (rec.patient_id !== doc.patient_id || rec.line_id !== doc.line_id || rec.service_id !== doc.service_id) {
    return { outcome: 'rejected', error_code: 'IDENTITY_MISMATCH', applied: false };
  }
  if (rec.line_status !== 'active') return { outcome: 'rejected', error_code: 'LINE_NOT_ACTIVE', applied: false };
  const hash = stableStringify(doc);
  if (rec.last_applied && rec.last_applied.report_type === doc.report_type && rec.last_applied.reported_at === doc.reported_at) {
    return rec.last_applied.payload_hash === hash
      ? { outcome: 'no_op', applied: false, to: rec.lifecycle_state }
      : { outcome: 'rejected', error_code: 'STATE_CONFLICT', applied: false };
  }
  const target = machine.report_type_targets[doc.report_type];
  if (!findTransition(machine, rec.lifecycle_state, target, 'nursing')) {
    return { outcome: 'rejected', error_code: 'REPORT_NOT_APPLICABLE', applied: false };
  }
  rec.lifecycle_state = target;
  rec.last_applied = { report_type: doc.report_type, reported_at: doc.reported_at, payload_hash: hash };
  return { outcome: 'accepted', applied: true, to: target };
}

// Batch order: (1) version preflight -> whole batch; (2) duplicate renewal_id ->
// whole batch; (3) per-row schema + calendar validation (typed row error, nothing
// applied, rest continues); (4) per-row reconciliation.
function importBatch(records, state, machine, retValidator) {
  for (const r of records) {
    if (r.contract_version !== CONTRACT_VERSION) return { outcome: 'rejected_batch', error_code: 'UNSUPPORTED_CONTRACT_VERSION', applied: 0 };
  }
  const seen = new Set();
  for (const r of records) {
    const id = r.renewal_id;
    if (typeof id === 'string' && id.length > 0) {
      if (seen.has(id)) return { outcome: 'rejected_batch', error_code: 'DUPLICATE_RENEWAL_ID_IN_BATCH', applied: 0 };
      seen.add(id);
    }
  }
  let applied = 0;
  const rows = [];
  for (const r of records) {
    if (!retValidator(r)) {
      rows.push({ outcome: 'rejected', error_code: schemaErrorCode(retValidator.errors, RET_RT), applied: false });
      continue;
    }
    if (semanticDateErrors(r).length > 0) {
      rows.push({ outcome: 'rejected', error_code: 'INVALID_FIELD', applied: false });
      continue;
    }
    const res = applyReturn(state, r, machine);
    if (res.applied) applied += 1;
    rows.push(res);
  }
  return { outcome: 'processed', applied, rows };
}

function allPaths(machine, start, goal) {
  const found = [];
  const stack = [[start]];
  while (stack.length > 0) {
    const route = stack.pop();
    const last = route[route.length - 1];
    if (last === goal) { found.push(route); continue; }
    for (const t of machine.transitions || []) {
      if (t.from === last && !route.includes(t.to)) stack.push([...route, t.to]);
    }
  }
  return found;
}

function machineInvariantErrors(machine) {
  const errors = [];
  const lifecycle = new Set(machine.lifecycle_states || []);
  const windowStates = new Set(machine.window_states || []);
  const terminal = new Set(machine.terminal_states || []);
  const actors = new Set(machine.actors || []);
  const forbiddenTriggers = new Set(machine.forbidden_triggers || []);
  for (const s of lifecycle) if (windowStates.has(s)) errors.push(`state "${s}" appears in both lifecycle_states and window_states`);
  if (lifecycle.has(machine.initial_pseudo_state)) errors.push(`initial_pseudo_state "${machine.initial_pseudo_state}" must not be a lifecycle state`);
  const dc = machine.derived_condition || {};
  if (dc.name !== 'PRÓXIMA_A_RENOVACIÓN') errors.push('derived_condition.name must be PRÓXIMA_A_RENOVACIÓN');
  if (dc.is_lifecycle_state !== false) errors.push('derived_condition.is_lifecycle_state must be false');
  if (lifecycle.has(dc.name)) errors.push('PRÓXIMA_A_RENOVACIÓN must not appear in lifecycle_states');
  if (dc.management_starts_with !== 'ENVIADA_A_ENFERMERÍA') errors.push('derived_condition.management_starts_with must be ENVIADA_A_ENFERMERÍA');
  if (!sameSet(machine.line_status_values || [], EXP_LINE_STATUSES)) errors.push(`line_status_values must be exactly the 6-value closed set; got ${JSON.stringify(machine.line_status_values)}`);
  if (!Array.isArray(machine.circuit_eligible) || JSON.stringify(machine.circuit_eligible) !== JSON.stringify(['active'])) errors.push('circuit_eligible must be exactly ["active"]');

  const seenIds = new Set();
  for (const t of machine.transitions || []) {
    if (seenIds.has(t.id)) errors.push(`duplicate transition id "${t.id}"`);
    seenIds.add(t.id);
    if (!lifecycle.has(t.to)) errors.push(`transition "${t.id}" targets unknown lifecycle state "${t.to}"`);
    if (windowStates.has(t.to)) errors.push(`transition "${t.id}" targets a window_state "${t.to}"`);
    if (typeof t.from !== 'string') errors.push(`transition "${t.id}" must declare an explicit "from"`);
    else if (!lifecycle.has(t.from) && t.from !== machine.initial_pseudo_state) errors.push(`transition "${t.id}" has unknown source "${t.from}"`);
    if (!Array.isArray(t.actors) || t.actors.length === 0 || t.actors.some((a) => !actors.has(a))) errors.push(`transition "${t.id}" has invalid actors ${JSON.stringify(t.actors)}`);
    if (t.trigger_kind !== 'explicit') errors.push(`transition "${t.id}" is not triggered by explicit input`);
    if (forbiddenTriggers.has(t.trigger)) errors.push(`transition "${t.id}" has forbidden trigger "${t.trigger}"`);
    if (t.requires_explicit_input !== true) errors.push(`transition "${t.id}" must require explicit input`);
  }
  // no state before the send act
  if ((machine.transitions || []).some((t) => t.to === machine.initial_pseudo_state)) errors.push('no transition may target the initial pseudo-state (no state exists before the send act)');
  const fromPseudo = (machine.transitions || []).filter((t) => t.from === machine.initial_pseudo_state);
  if (fromPseudo.length !== 1 || actorKey(fromPseudo[0]) !== JSON.stringify(['pharmacy'])) errors.push('the send act (new -> ENVIADA_A_ENFERMERÍA) must be the only pseudo-state edge and pharmacy-only');
  // terminals: closed, incoming exactly pharmacy
  for (const s of terminal) {
    if ((machine.transitions || []).some((t) => t.from === s)) errors.push(`terminal state "${s}" has an outgoing transition`);
    const incoming = (machine.transitions || []).filter((t) => t.to === s);
    if (incoming.length === 0) errors.push(`terminal state "${s}" has no incoming transition`);
    for (const t of incoming) {
      if (actorKey(t) !== JSON.stringify(['pharmacy'])) errors.push(`transition "${t.id}" into terminal "${s}" must have actors exactly [pharmacy], got ${JSON.stringify(t.actors)}`);
    }
  }
  // terminal-bound paths gated by a pharmacy-only edge
  for (const [start, goal] of [['RENOVACIÓN_COMUNICADA', 'ACTUALIZADA_POR_FH'], ['SUSPENSIÓN_COMUNICADA', 'TRATAMIENTO_SUSPENDIDO']]) {
    const paths = allPaths(machine, start, goal);
    if (paths.length === 0) errors.push(`terminal "${goal}" is not reachable from "${start}"`);
    for (const route of paths) {
      const finalEdges = (machine.transitions || []).filter((t) => t.from === route[route.length - 2] && t.to === goal);
      if (!finalEdges.some((t) => actorKey(t) === JSON.stringify(['pharmacy']))) errors.push(`path ${route.join(' -> ')} reaches "${goal}" without a pharmacy-only edge`);
    }
  }
  // every nursing report_type target is reachable ONLY via nursing edges
  for (const [rt, target] of Object.entries(machine.report_type_targets || {})) {
    if (!lifecycle.has(target)) errors.push(`report_type "${rt}" maps to unknown state "${target}"`);
    const incoming = (machine.transitions || []).filter((t) => t.to === target);
    if (incoming.length === 0) errors.push(`report_type target "${target}" has no incoming transition`);
    for (const t of incoming) if (!t.actors.includes('nursing')) errors.push(`report_type target "${target}" must be reachable only via nursing edges; "${t.id}" is not nursing`);
  }
  if ((machine.window_evaluation || {}).produces_lifecycle_transition !== false) errors.push('window_evaluation.produces_lifecycle_transition must be false');
  for (const f of machine.forbidden_transitions || []) {
    const matches = (machine.transitions || []).filter((t) => t.to === f.to && (f.from === undefined || t.from === f.from));
    if (f.forbidden_actors) {
      for (const t of matches) if (t.actors.some((a) => f.forbidden_actors.includes(a))) errors.push(`declared forbidden transition "${t.id}" (${t.from} -> ${t.to}) is present`);
    } else if (matches.length > 0) errors.push(`declared forbidden transition ${f.from} -> ${f.to} is present as ${matches.map((m) => m.id).join(', ')}`);
  }
  return errors;
}

function machineMutationCases(machine) {
  const clone = () => JSON.parse(JSON.stringify(machine));
  const has = (m, needle) => machineInvariantErrors(m).some((e) => e.includes(needle));
  const cases = [];
  let m = clone();
  m.transitions.find((t) => t.id === 'fh_update_validity').actors = ['pharmacy', 'nursing'];
  cases.push(['[invariant: a terminal act is pharmacy-only] adding a nursing actor to a terminal-bound edge is rejected', has(m, 'ACTUALIZADA_POR_FH')]);
  m = clone();
  m.transitions.push({ id: 'bad_direct_terminal', from: 'SOLICITADA_AL_PRESCRIPTOR', to: 'ACTUALIZADA_POR_FH', actors: ['nursing'], trigger: 'explicit_x', trigger_kind: 'explicit', requires_explicit_input: true });
  cases.push(['[invariant: nursing cannot reach a terminal act] a direct nursing edge into a terminal is rejected', has(m, 'ACTUALIZADA_POR_FH')]);
  m = clone();
  m.transitions.find((t) => t.id === 'nursing_requested').trigger = 'time';
  cases.push(['[invariant: no time/silence triggers] a trigger:"time" edge is rejected', has(m, 'forbidden trigger')]);
  m = clone();
  m.transitions.push({ id: 'bad_terminal_out', from: 'TRATAMIENTO_SUSPENDIDO', to: 'SOLICITADA_AL_PRESCRIPTOR', actors: ['pharmacy'], trigger: 'explicit_x', trigger_kind: 'explicit', requires_explicit_input: true });
  cases.push(['[invariant: terminals are closed] an outgoing edge from a terminal is rejected', has(m, 'outgoing')]);
  m = clone();
  m.lifecycle_states.push('PRÓXIMA_A_RENOVACIÓN');
  cases.push(['[invariant: detection is not a lifecycle state] putting PRÓXIMA_A_RENOVACIÓN into lifecycle_states is rejected', has(m, 'PRÓXIMA_A_RENOVACIÓN')]);
  m = clone();
  m.line_status_values = m.line_status_values.filter((s) => s !== 'suspended');
  cases.push(['[invariant: closed line_status vocabulary incl. suspended] dropping suspended is rejected', has(m, 'line_status_values')]);
  return cases;
}

function closedFieldSetErrors(fhSchema, retSchema, machine) {
  const errors = [];
  const fhProps = fhSchema.properties || {};
  const retProps = retSchema.properties || {};
  const fhKeys = Object.keys(fhProps);
  const retKeys = Object.keys(retProps);
  if (!sameSet(fhKeys, EXP_FH_KEYS)) errors.push(`FH->Nursing fields differ from the closed set: ${fhKeys.sort().join(',')}`);
  if (!sameSet(retKeys, EXP_RET_KEYS)) errors.push(`Nursing->FH fields differ from the closed set: ${retKeys.sort().join(',')}`);
  if (fhProps.lifecycle_state) errors.push('FH->Nursing must not transport lifecycle_state (deleted in the refreeze)');
  if (fhProps.requested_at) errors.push('FH->Nursing must not transport requested_at (deleted in the refreeze)');
  if (fhProps.comment) errors.push('FH->Nursing must not transport comment (deleted in the refreeze)');
  if (!sameSet(Object.keys(((fhProps.treatment || {}).properties) || {}), EXP_TREATMENT_KEYS)) errors.push(`display-only treatment block must contain exactly ${EXP_TREATMENT_KEYS.join(',')}`);
  if (!sameSet(fhProps.window_state.enum, machine.window_states)) errors.push('FH->Nursing window_state enum must equal the state machine window_states');
  if (!sameSet(fhProps.valid_until_kind.enum, EXP_KINDS)) errors.push('valid_until_kind enum drifted from the approved set');
  if (!sameSet(fhProps.valid_until_source.enum, EXP_SOURCES)) errors.push('valid_until_source enum drifted from the approved set');
  if (!sameSet(retProps.report_type.enum, EXP_REPORT_TYPES)) errors.push('report_type enum drifted from the refrozen set');
  if (!sameSet(Object.keys(machine.report_type_targets || {}), EXP_REPORT_TYPES)) errors.push('report_type_targets keys must equal the refrozen report types');
  for (const [rt, target] of Object.entries(machine.report_type_targets || {})) if (rt !== target) errors.push(`report_type_targets must be an identity mapping; "${rt}" -> "${target}"`);
  if (fhSchema.additionalProperties !== false) errors.push('FH->Nursing must set additionalProperties:false');
  if (retSchema.additionalProperties !== false) errors.push('Nursing->FH must set additionalProperties:false');
  for (const key of retKeys) if (FORBIDDEN_NAME_PATTERNS.some((re) => re.test(key))) errors.push(`Nursing->FH return exposes a derivation-capable field "${key}"`);
  for (const clause of fhSchema.allOf || []) {
    const text = stableStringify(clause);
    if (text.includes('drug_display') || text.includes('line_label') || text.includes('"treatment"')) errors.push('a cross-field rule derives state from the display-only treatment block');
  }
  return errors;
}

const pickSchema = (doc, fhV, retV) => doc && doc.record_type === FH_RT ? { validator: fhV, recordType: FH_RT }
  : doc && doc.record_type === RET_RT ? { validator: retV, recordType: RET_RT } : null;

function runPositiveFixtures(fhV, retV) {
  console.log('Positive fixtures (must validate + coherent window/calendar/derivation):');
  for (const file of fs.readdirSync(path.join(FIXTURE_DIR, 'valid')).sort()) {
    const r = runCase(() => {
      const doc = loadJson(path.join(FIXTURE_DIR, 'valid', file));
      const picked = pickSchema(doc, fhV, retV);
      if (!picked) return { pass: false, detail: 'record_type is neither FH->Nursing nor Nursing->FH' };
      if (!picked.validator(doc)) return { pass: false, detail: ajvFormat(picked.validator.errors) };
      const all = [...semanticDateErrors(doc), ...derivationErrors(doc), ...(picked.recordType === FH_RT ? windowStateErrors(doc) : [])];
      return { pass: all.length === 0, detail: all.join(' | ') || 'accepted' };
    });
    record(`valid/${file}`, r.pass, r.detail);
  }
}

function runInvalidFixtures(fhV, retV) {
  const cases = [
    { file: 'fh_to_nursing_missing_required.json', schema: 'fh', expect: 'MISSING_REQUIRED_FIELD' },
    { file: 'fh_to_nursing_bad_kind_source_mapping.json', schema: 'fh', expect: 'INVALID_FIELD' },
    { file: 'fh_to_nursing_bad_date_format.json', schema: 'fh', expect: 'INVALID_FIELD' },
    { file: 'fh_to_nursing_impossible_date.json', schema: 'fh', expect: 'INVALID_FIELD', semantic: 'dates' },
    { file: 'fh_to_nursing_duration_derivation_mismatch.json', schema: 'fh', expect: 'INVALID_FIELD', semantic: 'derivation' },
    { file: 'fh_to_nursing_unknown_with_valid_until.json', schema: 'fh', expect: 'INVALID_FIELD' },
    { file: 'fh_to_nursing_window_state_mismatch.json', schema: 'fh', expect: 'INVALID_FIELD', semantic: 'window' },
    { file: 'nursing_to_fh_forbidden_valid_until.json', schema: 'ret', expect: 'FORBIDDEN_FIELD_IN_RETURN' },
    { file: 'nursing_to_fh_forbidden_therapeutic.json', schema: 'ret', expect: 'FORBIDDEN_FIELD_IN_RETURN' },
    { file: 'nursing_to_fh_bad_report_type.json', schema: 'ret', expect: 'INVALID_FIELD' },
    { file: 'nursing_to_fh_impossible_datetime.json', schema: 'ret', expect: 'INVALID_FIELD', semantic: 'dates' },
    { file: 'nursing_to_fh_unsupported_version.json', schema: 'ret', expect: 'UNSUPPORTED_CONTRACT_VERSION' }
  ];
  console.log('Planted invalid records (must be rejected for the expected reason):');
  for (const c of cases) {
    const r = runCase(() => {
      const doc = loadJson(path.join(FIXTURE_DIR, 'invalid', c.file));
      const validator = c.schema === 'fh' ? fhV : retV;
      const recordType = c.schema === 'fh' ? FH_RT : RET_RT;
      if (!validator(doc)) {
        const code = schemaErrorCode(validator.errors, recordType);
        return code === c.expect ? { pass: true, detail: `rejected: ${code}` }
          : { pass: false, detail: `rejected as ${code}, expected ${c.expect}: ${ajvFormat(validator.errors)}` };
      }
      const errors = c.semantic === 'window' ? windowStateErrors(doc) : c.semantic === 'dates' ? semanticDateErrors(doc) : c.semantic === 'derivation' ? derivationErrors(doc) : [];
      return errors.length === 0 ? { pass: false, detail: 'was accepted but must be rejected' } : { pass: true, detail: `rejected semantically: ${errors.join(' | ')}` };
    });
    record(`invalid/${c.file}`, r.pass, r.detail);
  }
}

function resolveDoc(spec) {
  if (spec.record) return JSON.parse(JSON.stringify(spec.record));
  const doc = loadJson(path.join(FIXTURE_DIR, spec.fixture));
  if (spec.overrides) Object.assign(doc, spec.overrides);
  return doc;
}

function runScenarios(fhV, retV, machine) {
  console.log('Scenarios (ida / vuelta / idempotencia / conflictos / no aplicable / linea / lote):');
  const scenarios = loadJson(path.join(FIXTURE_DIR, 'scenarios_v1.json'));
  if (scenarios.contract_version !== CONTRACT_VERSION) { record('scenarios_v1 contract_version', false, `unexpected ${scenarios.contract_version}`); return; }
  const seedStatuses = new Set(EXP_LINE_STATUSES);
  const badSeed = scenarios.seed.known_renewals.filter((r) => !seedStatuses.has(r.line_status));
  record('seed line_status from the closed line-status vocabulary', badSeed.length === 0, badSeed.length === 0 ? '' : `entries without a closed line_status: ${badSeed.map((r) => r.renewal_id).join(', ')}`);
  for (const sc of scenarios.scenarios) {
    const r = runCase(() => {
      if (sc.kind === 'fh_to_nursing_validate') {
        const doc = resolveDoc(sc);
        if (!fhV(doc)) return { pass: false, detail: ajvFormat(fhV.errors) };
        const errors = [...semanticDateErrors(doc), ...derivationErrors(doc), ...windowStateErrors(doc)];
        return { pass: errors.length === 0 && sc.expect.outcome === 'accepted', detail: errors.join(' | ') || 'accepted' };
      }
      if (sc.kind === 'nursing_to_fh_apply') {
        const state = freshState(scenarios.seed);
        const before = stableStringify(state.known);
        const res = applyReturn(state, resolveDoc(sc), machine);
        let pass = res.outcome === sc.expect.outcome && (sc.expect.error_code === undefined || res.error_code === sc.expect.error_code) && (sc.expect.to === undefined || res.to === sc.expect.to);
        if (sc.expect.preserve) pass = pass && stableStringify(state.known) === before;
        return { pass, detail: JSON.stringify(res) };
      }
      if (sc.kind === 'nursing_to_fh_reimport') {
        const state = freshState(scenarios.seed);
        const first = applyReturn(state, resolveDoc(sc.first), machine);
        const afterFirst = stableStringify(state.known);
        const second = applyReturn(state, resolveDoc(sc.second), machine);
        const preserved = stableStringify(state.known) === afterFirst;
        let pass = first.outcome === sc.expect.first_outcome && second.outcome === sc.expect.second_outcome && (sc.expect.error_code === undefined || second.error_code === sc.expect.error_code);
        if (sc.expect.preserved) pass = pass && preserved;
        return { pass, detail: `first=${JSON.stringify(first)} second=${JSON.stringify(second)} preserved=${preserved}` };
      }
      if (sc.kind === 'batch_import') {
        const docs = loadJson(path.join(FIXTURE_DIR, sc.fixture));
        const state = freshState(scenarios.seed);
        const res = importBatch(docs, state, machine, retV);
        let pass = res.outcome === sc.expect.outcome && (sc.expect.error_code === undefined || res.error_code === sc.expect.error_code) && (sc.expect.applied === undefined || res.applied === sc.expect.applied);
        let detail = JSON.stringify(res);
        if (Array.isArray(sc.expect.rows)) {
          const rowsOk = Array.isArray(res.rows) && res.rows.length === sc.expect.rows.length && sc.expect.rows.every((e, i) => res.rows[i].outcome === e.outcome && (e.error_code === undefined || res.rows[i].error_code === e.error_code));
          pass = pass && rowsOk;
          if (!rowsOk) detail += ` rows=${JSON.stringify(res.rows)}`;
        } else if (res.outcome === 'processed') { pass = false; detail += ' missing expect.rows for a processed batch'; }
        if (pass && res.outcome === 'processed') {
          const pristine = freshState(scenarios.seed);
          const broken = docs.map((d, i) => ({ rid: d.renewal_id, row: res.rows[i] }))
            .filter((x) => x.row && x.row.outcome === 'rejected' && x.row.applied === false)
            .filter((x) => pristine.known[x.rid] !== undefined)
            .filter((x) => stableStringify(state.known[x.rid]) !== stableStringify(pristine.known[x.rid]));
          if (broken.length > 0) { pass = false; detail += ` fh state mutated for rejected rows: ${broken.map((x) => x.rid).join(', ')}`; }
          else detail += ' rejected rows left FH state pristine';
        }
        return { pass, detail };
      }
      return { pass: false, detail: `unknown scenario kind ${sc.kind}` };
    });
    record(`scenario/${sc.id}`, r.pass, r.detail);
  }
}

function runStateMachine(machine, retSchema) {
  console.log('State machine structural invariants:');
  const errors = machineInvariantErrors(machine);
  record('state machine invariants hold (pharmacy-only terminals, no time triggers, closed terminals, derived condition not a state)', errors.length === 0, errors.join(' | '));
  for (const [name, ok] of machineMutationCases(machine)) record(`mutation/${name}`, ok, ok ? '' : 'detector did not reject the mutation');
  const enumValues = ((retSchema.properties || {}).report_type || {}).enum || [];
  const noFhTerminal = !enumValues.some((t) => EXP_TERMINALS.includes(t));
  record('Nursing->FH report_type cannot name a FH terminal act (no ACTUALIZADA_POR_FH / TRATAMIENTO_SUSPENDIDO)', noFhTerminal, noFhTerminal ? '' : `report_type exposes ${enumValues.join(', ')}`);
}

function main() {
  console.log('PROMueve Nexus renewal handoff contract check (N0 refreeze #509)');
  // Executable fail-closed probe (finding 1): throws before finish(); the
  // top-level catch records a FAIL and exits non-zero.
  if (process.argv.includes('--probe-exception-fail-closed')) throw new Error('probe: forced exception before finish()');
  let fh, ret, machine;
  try {
    fh = buildValidator(FH_SCHEMA);
    ret = buildValidator(RET_SCHEMA);
    machine = loadJson(path.join(SCHEMA_DIR, MACHINE_FILE));
    record('schemas compile + state machine loads (draft 2020-12, additionalProperties:false)', true, '');
  } catch (e) {
    record('schemas compile + state machine loads (draft 2020-12, additionalProperties:false)', false, e.message);
    finish();
    return;
  }
  const meta = runCase(() => { throw new Error('forced-failure-meta'); });
  record('runCase fails closed when a case body throws', meta.pass === false && /^threw:/.test(meta.detail), JSON.stringify(meta));
  runPositiveFixtures(fh.validate, ret.validate);
  runInvalidFixtures(fh.validate, ret.validate);
  // finding 4: explicit positive + negative proof of duration-derivation equality
  const goodDur = loadJson(path.join(FIXTURE_DIR, 'valid', 'fh_to_nursing_duration_derived.json'));
  const badDur = loadJson(path.join(FIXTURE_DIR, 'invalid', 'fh_to_nursing_duration_derivation_mismatch.json'));
  console.log('Duration-derivation equality (finding 4):');
  record('positive fixture satisfies valid_until == issue_date + validity_days', derivationErrors(goodDur).length === 0, derivationErrors(goodDur).join(' | ') || '2026-06-01 + 365 = 2027-06-01');
  record('mismatch fixture is rejected by derivation equality', derivationErrors(badDur).length > 0, derivationErrors(badDur).join(' | '));
  runScenarios(fh.validate, ret.validate, machine);
  runStateMachine(machine, ret.schema);
  console.log('Closed field sets / no-inference guard:');
  const drift = closedFieldSetErrors(fh.schema, ret.schema, machine);
  record('closed field sets + refrozen vocabularies + display-only treatment block', drift.length === 0, drift.join(' | '));
  finish();
}

function finish() {
  const failed = results.filter((r) => !r.pass);
  console.log('');
  console.log(`RESULTADO: ${results.length - failed.length} OK / ${failed.length} FALLIDO`);
  if (failed.length > 0) {
    console.error('Renewal handoff contract check FAILED');
    process.exit(1);
  }
  console.log('Renewal handoff contract check PASSED');
}

try {
  main();
} catch (e) {
  record('top-level fail-closed', false, `threw: ${e.message}`);
  finish();
}
