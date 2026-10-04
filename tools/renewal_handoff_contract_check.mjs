#!/usr/bin/env node
'use strict';
/**
 * Deterministic checker for the PROMueve Nexus N0 renewal handoff contract
 * (WO-SHAPE-NEXUS-RENEWALS-N0, issue #446).
 *
 * This is a docs/contract shaping unit: there is no runtime. The checker is an
 * independent oracle over the frozen artifacts:
 *   - schemas/renewal/renewal_handoff_fh_to_nursing_v1.schema.json
 *   - schemas/renewal/renewal_handoff_nursing_to_fh_v1.schema.json
 *   - schemas/renewal/renewal_state_machine_v1.json
 *   - tools/fixtures/renewal/** (synthetic positive, planted-invalid, semantic)
 *
 * It must be able to disagree with the contract: planted negatives must be
 * rejected for the EXPECTED reason, the state-machine detector is exercised by
 * a mutation battery, and the window recomputation is recomputed independently.
 *
 * Exit codes: 0 = all cases PASS, 1 = at least one case FAIL.
 * Usage: node tools/renewal_handoff_contract_check.mjs
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
const FH_TO_NURSING_RECORD_TYPE = 'renewal_handoff_fh_to_nursing';
const NURSING_TO_FH_RECORD_TYPE = 'renewal_report_nursing_to_fh';

const FH_TO_NURSING_SCHEMA = 'renewal_handoff_fh_to_nursing_v1.schema.json';
const NURSING_TO_FH_SCHEMA = 'renewal_handoff_nursing_to_fh_v1.schema.json';
const STATE_MACHINE_FILE = 'renewal_state_machine_v1.json';

// --- expected closed vocabularies (single source is the state machine; these
// are asserted against it so the two artifacts cannot drift silently) ---
const EXPECTED_FH_TO_NURSING_KEYS = [
  'comment', 'contract_version', 'demo_flag', 'evaluated_at', 'exported_at',
  'exported_by_role', 'issue_date', 'lifecycle_state', 'line_id', 'patient_id',
  'record_type', 'renewal_id', 'requested_at', 'service_id', 'service_label',
  'treatment', 'treatment_id', 'valid_until', 'valid_until_kind',
  'valid_until_source', 'validity_days', 'warning_window_days', 'window_state'
];
const EXPECTED_NURSING_TO_FH_KEYS = [
  'comment', 'contract_version', 'demo_flag', 'line_id', 'patient_id',
  'record_type', 'renewal_id', 'report_type', 'reported_at', 'reported_by',
  'reported_by_role', 'service_id'
];
const EXPECTED_TREATMENT_KEYS = ['drug_display', 'line_label'];
const EXPECTED_VALID_UNTIL_KINDS = ['confirmed', 'estimated', 'unknown', 'verified'];
const EXPECTED_VALID_UNTIL_SOURCES = [
  'circuit_entry_estimate', 'manual_estimate', 'not_recorded',
  'pharmacy_verified_remaining_period', 'prescription_issue_date_confirmed_duration_confirmed',
  'prescription_issue_date_confirmed_duration_configured', 'prescription_valid_until_confirmed'
];
const EXPECTED_REPORT_TYPES = ['in_progress', 'renewal_reported', 'requested_to_service'];

// Fields a Nursing->FH return must never carry (extra key => forbidden, not a
// generic unknown key). Kept explicit so the reason is auditable.
const FORBIDDEN_RETURN_FIELDS = new Set([
  'valid_until', 'valid_until_kind', 'valid_until_source', 'validity_days', 'issue_date',
  'dose', 'dose_text', 'route', 'schedule', 'schedule_code', 'presentation',
  'induction', 'induction_status', 'causality', 'validation_result',
  'validated_treatment_relation', 'renewed_at', 'renewed_by', 'lifecycle_state',
  'switch', 'add_on', 'active_ingredient', 'drug_name', 'drug_display', 'line_status',
  'commit_id', 'act_id'
]);

const FORBIDDEN_NAME_PATTERNS = [
  /drug/i, /switch/i, /add_?on/i, /absence/i, /silence/i, /elapsed/i, /dose/i,
  /route/i, /schedule/i, /presentation/i, /induction/i, /causality/i
];

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail: detail || '' });
  const mark = pass ? 'OK ' : 'FAIL';
  console.log(`  [${mark}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function buildValidator(schemaFile) {
  const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true, validateFormats: false });
  const schema = loadJson(path.join(SCHEMA_DIR, schemaFile));
  return { validate: ajv.compile(schema), schema };
}

function ajvFormat(errors) {
  return (errors || [])
    .map((e) => `${e.instancePath || '/'} ${e.keyword} ${e.message}`)
    .join('; ');
}

// --- error-code mapping (schema errors -> typed contract codes) ---

function schemaErrorCode(errors, recordType) {
  for (const e of errors || []) {
    if (e.instancePath === '/contract_version') return 'UNSUPPORTED_CONTRACT_VERSION';
    if (e.keyword === 'required' && e.params && e.params.missingProperty) {
      if (e.params.missingProperty === 'contract_version') return 'UNSUPPORTED_CONTRACT_VERSION';
      return 'MISSING_REQUIRED_FIELD';
    }
    if (e.keyword === 'additionalProperties' && e.params && e.params.additionalProperty) {
      const prop = e.params.additionalProperty;
      if (recordType === NURSING_TO_FH_RECORD_TYPE && FORBIDDEN_RETURN_FIELDS.has(prop)) {
        return 'FORBIDDEN_FIELD_IN_RETURN';
      }
      return 'INVALID_FIELD';
    }
  }
  return 'INVALID_FIELD';
}

// --- window recomputation (independent of the exported declaration) ---

function dateDiffDays(validUntil, evaluatedAt) {
  const v = Date.parse(`${validUntil}T00:00:00Z`);
  const e = Date.parse(`${evaluatedAt.slice(0, 10)}T00:00:00Z`);
  return Math.round((v - e) / 86400000);
}

// --- strict runtime calendar validation (authoritative; schema patterns are
// annotation-only here, same stance as FARMACIA_EXPORT_V2_CORE_CONTRACT.md).
// No Date normalisation: impossible dates such as 2026-02-31 are rejected. ---

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(\.\d{1,9})?(Z|[+-](0\d|1[0-3]):[0-5]\d|[+-]14:00)$/;

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y, m) {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

function isValidDate(s) {
  const m = DATE_RE.exec(typeof s === 'string' ? s : '');
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1) return false; // year 0000 rejected, as in the schema pattern
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

function isValidDateTime(s) {
  const m = DATETIME_RE.exec(typeof s === 'string' ? s : '');
  if (!m) return false;
  return isValidDate(`${m[1]}-${m[2]}-${m[3]}`);
}

function semanticDateErrors(doc) {
  const errors = [];
  const checkDate = (field) => {
    const v = doc[field];
    if (v === undefined || v === null) return;
    if (!isValidDate(v)) errors.push(`${field} is not a real calendar date: ${JSON.stringify(v)}`);
  };
  const checkDateTime = (field) => {
    const v = doc[field];
    if (v === undefined || v === null) return;
    if (!isValidDateTime(v)) errors.push(`${field} is not a real calendar date-time: ${JSON.stringify(v)}`);
  };
  if (doc.record_type === FH_TO_NURSING_RECORD_TYPE) {
    checkDateTime('evaluated_at');
    checkDateTime('requested_at');
    checkDateTime('exported_at');
    checkDate('issue_date');
    checkDate('valid_until');
  } else if (doc.record_type === NURSING_TO_FH_RECORD_TYPE) {
    checkDateTime('reported_at');
  }
  return errors;
}

function windowStateErrors(doc) {
  const errors = [];
  if (doc.valid_until_kind === 'unknown') {
    if (doc.valid_until !== null) errors.push('unknown kind must not materialize valid_until');
    if (doc.window_state !== 'not_evaluable') errors.push('unknown kind must be not_evaluable');
    return errors;
  }
  if (typeof doc.valid_until !== 'string') {
    errors.push('non-unknown kind requires a concrete valid_until');
    return errors;
  }
  // dateDiffDays must only run on already-validated real calendar dates:
  // Date.parse would silently normalise impossible dates instead of rejecting.
  if (!isValidDate(doc.valid_until) || !isValidDateTime(doc.evaluated_at)) {
    errors.push('dates are not real calendar values; window not recomputable');
    return errors;
  }
  const days = dateDiffDays(doc.valid_until, doc.evaluated_at);
  let expected;
  if (days < 0) expected = 'expired';
  else if (days <= doc.warning_window_days) expected = 'due_soon';
  else expected = 'outside_window';
  if (doc.window_state !== expected) {
    errors.push(`declared window_state=${doc.window_state} but recomputed ${expected} (days=${days})`);
  }
  return errors;
}

// --- reference reconciliation model (deterministic, synthetic only) ---

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function freshState(seed) {
  const known = {};
  for (const r of seed.known_renewals) {
    known[r.renewal_id] = {
      patient_id: r.patient_id,
      line_id: r.line_id,
      service_id: r.service_id,
      lifecycle_state: r.lifecycle_state,
      line_status: r.line_status,
      applied_returns: []
    };
    if (r.last_applied_return) {
      // A return already applied before the current lifecycle snapshot (used to
      // prove replay/no_op ordering on terminal cycles without inventing a path
      // from nursing to FH_UPDATED). It seeds the per-renewal applied-operation
      // history: every accepted return is remembered, not only the last one.
      known[r.renewal_id].applied_returns.push({
        report_type: r.last_applied_return.report_type,
        reported_at: r.last_applied_return.reported_at,
        payload_hash: stableStringify(r.last_applied_return)
      });
    }
  }
  return { known };
}

function findTransition(machine, fromState, toState, actor) {
  return machine.transitions.find(
    (t) =>
      (t.from === fromState || t.from_any_non_terminal === true) &&
      t.to === toState &&
      Array.isArray(t.actors) &&
      t.actors.includes(actor)
  );
}

// Ruled precedence inside applyReturn (contract §8). Step 2 of the contract
// ordering (schema + calendar validation) is a per-row boundary executed in
// importBatch before reconciling each row; steps 1 and 3 are batch-wide.
//
//   4. UNKNOWN_RENEWAL_ID
//   5. IDENTITY_MISMATCH
//   6. LINE_NOT_ACTIVE
//   7. idempotent replay of ANY operation in the applied-return history
//      (same report_type + reported_at + deep-equal payload) => no_op, even on
//      terminal states
//   8. STATE_CONFLICT (same operation identity present anywhere in the
//      applied-return history with a different payload)
//   9. REPORT_NOT_APPLICABLE (target unreachable, with or without a prior return)
//  10. otherwise apply the permitted transition (successive report)
function applyReturn(state, doc, machine) {
  const rec = state.known[doc.renewal_id];
  if (!rec) return { outcome: 'rejected', error_code: 'UNKNOWN_RENEWAL_ID', applied: false };
  if (
    rec.patient_id !== doc.patient_id ||
    rec.line_id !== doc.line_id ||
    rec.service_id !== doc.service_id
  ) {
    return { outcome: 'rejected', error_code: 'IDENTITY_MISMATCH', applied: false };
  }
  if (rec.line_status !== 'active') {
    return { outcome: 'rejected', error_code: 'LINE_NOT_ACTIVE', applied: false };
  }
  const hash = stableStringify(doc);
  const prior = rec.applied_returns.find(
    (op) => op.report_type === doc.report_type && op.reported_at === doc.reported_at
  );
  if (prior && prior.payload_hash === hash) {
    // Exact replay of ANY already-applied operation, not only the last one:
    // no_op regardless of the current lifecycle, terminal states included.
    // Must precede any terminal or reachability check.
    return { outcome: 'no_op', applied: false, to: rec.lifecycle_state };
  }
  if (prior) {
    // Same operation identity (renewal_id + report_type + reported_at) already
    // applied at any point of the history with a different payload: changed
    // replay, never merged; FH state is preserved.
    return { outcome: 'rejected', error_code: 'STATE_CONFLICT', applied: false };
  }
  const target = machine.report_type_targets[doc.report_type];
  const transition = findTransition(machine, rec.lifecycle_state, target, 'nursing');
  if (!transition) {
    // Unreachable/regressive target (terminal states included), independent of
    // whether a prior return exists.
    return { outcome: 'rejected', error_code: 'REPORT_NOT_APPLICABLE', applied: false };
  }
  rec.lifecycle_state = target;
  rec.applied_returns.push({
    report_type: doc.report_type,
    reported_at: doc.reported_at,
    payload_hash: hash
  });
  return { outcome: 'accepted', applied: true, to: target };
}

function importBatch(records, state, machine, retValidator, opts = {}) {
  // Contract §8 step 1: batch-wide, full-lot rejection.
  for (const r of records) {
    if (r.contract_version !== CONTRACT_VERSION) {
      return { outcome: 'rejected_batch', error_code: 'UNSUPPORTED_CONTRACT_VERSION', applied: 0 };
    }
  }
  // Contract §8 step 3: batch-wide, full-lot rejection.
  const ids = records.map((r) => r.renewal_id);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) {
    return { outcome: 'rejected_batch', error_code: 'DUPLICATE_RENEWAL_ID_IN_BATCH', applied: 0 };
  }
  let applied = 0;
  const rows = [];
  for (const r of records) {
    // Contract §8 step 2 is a PER-ROW parse/validation boundary: schema +
    // calendar validation run BEFORE any reconciliation of this row. A row that
    // fails it is rejected with its typed code, applies nothing, and the rest
    // of the batch continues (per-row atomicity).
    if (!opts.skip_row_validation) {
      const okSchema = retValidator(r);
      const dateErrors = okSchema ? semanticDateErrors(r) : [];
      if (!okSchema || dateErrors.length > 0) {
        rows.push({
          outcome: 'rejected',
          error_code: okSchema
            ? 'INVALID_FIELD'
            : schemaErrorCode(retValidator.errors, NURSING_TO_FH_RECORD_TYPE),
          applied: false
        });
        continue;
      }
    }
    const res = applyReturn(state, r, machine);
    if (res.applied) applied += 1;
    rows.push(res);
  }
  return { outcome: 'processed', applied, rows };
}

// --- state-machine structural invariants ---

function actorKey(t) {
  return JSON.stringify([...(t.actors || [])].sort());
}

function allPaths(machine, start, goal) {
  const found = [];
  const stack = [[start]];
  while (stack.length > 0) {
    const route = stack.pop();
    const last = route[route.length - 1];
    if (last === goal) {
      found.push(route);
      continue;
    }
    for (const t of machine.transitions) {
      const edgeFrom =
        t.from === last ||
        (t.from_any_non_terminal === true && last !== machine.initial_pseudo_state);
      if (!edgeFrom) continue;
      if (route.includes(t.to)) continue;
      stack.push([...route, t.to]);
    }
  }
  return found;
}

function machineInvariantErrors(machine) {
  const errors = [];
  const lifecycle = new Set(machine.lifecycle_states);
  const windowStates = new Set(machine.window_states);
  const terminal = new Set(machine.terminal_states);
  const actors = new Set(machine.actors);
  const forbiddenTriggers = new Set(machine.forbidden_triggers || []);

  for (const s of lifecycle) {
    if (windowStates.has(s)) errors.push(`state "${s}" appears in both lifecycle_states and window_states`);
  }
  if (lifecycle.has(machine.initial_pseudo_state)) {
    errors.push(`initial_pseudo_state "${machine.initial_pseudo_state}" must not be a lifecycle state`);
  }

  const seenIds = new Set();
  for (const t of machine.transitions) {
    if (seenIds.has(t.id)) errors.push(`duplicate transition id "${t.id}"`);
    seenIds.add(t.id);
    if (!lifecycle.has(t.to)) errors.push(`transition "${t.id}" targets unknown lifecycle state "${t.to}"`);
    if (windowStates.has(t.to)) errors.push(`transition "${t.id}" targets a window_state "${t.to}"`);
    if (typeof t.from === 'string') {
      if (!lifecycle.has(t.from) && t.from !== machine.initial_pseudo_state) {
        errors.push(`transition "${t.id}" has unknown source "${t.from}"`);
      }
    } else if (t.from_any_non_terminal !== true) {
      errors.push(`transition "${t.id}" has neither "from" nor "from_any_non_terminal"`);
    }
    if (!Array.isArray(t.actors) || t.actors.length === 0 || t.actors.some((a) => !actors.has(a))) {
      errors.push(`transition "${t.id}" has invalid actors ${JSON.stringify(t.actors)}`);
    }
    if (t.trigger_kind !== 'explicit') errors.push(`transition "${t.id}" is not triggered by explicit input`);
    if (forbiddenTriggers.has(t.trigger)) errors.push(`transition "${t.id}" has forbidden trigger "${t.trigger}"`);
  }

  for (const s of terminal) {
    if (machine.transitions.some((t) => t.from === s)) {
      errors.push(`terminal state "${s}" has an outgoing transition`);
    }
  }

  const incomingFh = machine.transitions.filter((t) => t.to === 'FH_UPDATED');
  if (incomingFh.length === 0) errors.push('FH_UPDATED has no incoming transition');
  for (const t of incomingFh) {
    if (actorKey(t) !== JSON.stringify(['pharmacy'])) {
      errors.push(`transition "${t.id}" into FH_UPDATED must have actors exactly [pharmacy], got ${JSON.stringify(t.actors)}`);
    }
  }

  if (machine.transitions.some((t) => t.from === 'RENEWED_REPORTED' && t.to === 'FH_UPDATED')) {
    errors.push('forbidden direct RENEWED_REPORTED -> FH_UPDATED transition present');
  }

  const paths = allPaths(machine, 'RENEWED_REPORTED', 'FH_UPDATED');
  if (paths.length === 0) errors.push('FH_UPDATED is not reachable from RENEWED_REPORTED');
  for (const route of paths) {
    let gated = false;
    for (let i = 0; i < route.length - 1; i += 1) {
      const edges = machine.transitions.filter((t) => t.from === route[i] && t.to === route[i + 1]);
      if (edges.some((t) => actorKey(t) === JSON.stringify(['pharmacy']))) gated = true;
    }
    if (!gated) errors.push(`path ${route.join(' -> ')} reaches FH_UPDATED without a pharmacy-only edge`);
  }

  const we = machine.window_evaluation || {};
  if (we.produces_lifecycle_transition !== false) {
    errors.push('window_evaluation.produces_lifecycle_transition must be false');
  }
  if (!Array.isArray(we.never_opens_cycle_when_window_state_in) ||
      !we.never_opens_cycle_when_window_state_in.includes('not_evaluable')) {
    errors.push('window_evaluation must never open a cycle for not_evaluable');
  }
  if (we.max_open_cycles_per_line !== 1) {
    errors.push('window_evaluation.max_open_cycles_per_line must be 1');
  }

  for (const f of machine.forbidden_transitions || []) {
    const matches = machine.transitions.filter((t) => t.to === f.to && (f.from === undefined || t.from === f.from));
    if (f.forbidden_actors) {
      for (const t of matches) {
        if (t.actors.some((a) => f.forbidden_actors.includes(a))) {
          errors.push(`declared forbidden transition "${t.id}" (${t.from} -> ${t.to}) is present`);
        }
      }
    } else if (matches.length > 0) {
      errors.push(`declared forbidden transition ${f.from} -> ${f.to} is present as ${matches.map((m) => m.id).join(', ')}`);
    }
  }

  for (const [rt, target] of Object.entries(machine.report_type_targets || {})) {
    if (!lifecycle.has(target)) errors.push(`report_type "${rt}" maps to unknown state "${target}"`);
  }

  return errors;
}

function machineMutationCases(machine) {
  const clone = () => JSON.parse(JSON.stringify(machine));
  const cases = [];

  let m = clone();
  m.transitions.push({ id: 'bad_direct', from: 'RENEWED_REPORTED', to: 'FH_UPDATED', actors: ['pharmacy_module'], trigger: 'explicit_x', trigger_kind: 'explicit', requires_explicit_input: true });
  cases.push(['direct RENEWED_REPORTED -> FH_UPDATED is rejected', machineInvariantErrors(m).length > 0]);

  m = clone();
  m.transitions.find((t) => t.id === 'fh_updated').actors = ['pharmacy', 'nursing'];
  cases.push(['FH_UPDATED edge with a non-pharmacy actor is rejected', machineInvariantErrors(m).some((e) => e.includes('FH_UPDATED'))]);

  m = clone();
  m.transitions.find((t) => t.id === 'report_received_for_fh_review').trigger = 'elapsed';
  cases.push(['a time/elapsed trigger is rejected', machineInvariantErrors(m).some((e) => e.includes('forbidden trigger'))]);

  m = clone();
  m.transitions.push({ id: 'bad_terminal', from: 'FH_UPDATED', to: 'IN_PROGRESS', actors: ['pharmacy'], trigger: 'explicit_x', trigger_kind: 'explicit', requires_explicit_input: true });
  cases.push(['a terminal outgoing edge is rejected', machineInvariantErrors(m).some((e) => e.includes('outgoing'))]);

  m = clone();
  m.transitions.push({ id: 'bad_window', from: 'OPEN', to: 'due_soon', actors: ['pharmacy'], trigger: 'explicit_x', trigger_kind: 'explicit', requires_explicit_input: true });
  cases.push(['a transition into a window_state is rejected', machineInvariantErrors(m).some((e) => e.includes('window_state'))]);

  m = clone();
  m.lifecycle_states = [...m.lifecycle_states, 'due_soon'];
  cases.push(['lifecycle/window overlap is rejected', machineInvariantErrors(m).some((e) => e.includes('both lifecycle_states and window_states'))]);

  m = clone();
  m.window_evaluation.produces_lifecycle_transition = true;
  cases.push(['window recomputation producing a lifecycle transition is rejected', machineInvariantErrors(m).some((e) => e.includes('produces_lifecycle_transition'))]);

  m = clone();
  m.transitions = m.transitions.filter((t) => t.id !== 'fh_updated');
  cases.push(['removing the pharmacy edge into FH_UPDATED is rejected', machineInvariantErrors(m).length > 0]);

  return cases;
}

// --- closed field-set / no-inference guard ---

function sameSet(a, b) {
  const sa = [...a].sort();
  const sb = [...b].sort();
  return JSON.stringify(sa) === JSON.stringify(sb);
}

function closedFieldSetErrors(fhSchema, retSchema, machine) {
  const errors = [];
  const fhKeys = Object.keys(fhSchema.properties || {});
  const retKeys = Object.keys(retSchema.properties || {});

  if (!sameSet(fhKeys, EXPECTED_FH_TO_NURSING_KEYS)) {
    errors.push(`FH->Nursing fields differ from the closed set: ${fhKeys.sort().join(',')}`);
  }
  if (!sameSet(retKeys, EXPECTED_NURSING_TO_FH_KEYS)) {
    errors.push(`Nursing->FH fields differ from the closed set: ${retKeys.sort().join(',')}`);
  }
  const treatment = (fhSchema.properties || {}).treatment || {};
  if (!sameSet(Object.keys(treatment.properties || {}), EXPECTED_TREATMENT_KEYS)) {
    errors.push(`display-only treatment block must contain exactly ${EXPECTED_TREATMENT_KEYS.join(',')}`);
  }
  if (!sameSet(fhSchema.properties.lifecycle_state.enum, machine.lifecycle_states)) {
    errors.push('FH->Nursing lifecycle_state enum must equal the state machine lifecycle_states');
  }
  if (!sameSet(fhSchema.properties.window_state.enum, machine.window_states)) {
    errors.push('FH->Nursing window_state enum must equal the state machine window_states');
  }
  if (!sameSet(fhSchema.properties.valid_until_kind.enum, EXPECTED_VALID_UNTIL_KINDS)) {
    errors.push('valid_until_kind enum drifted from the approved set');
  }
  if (!sameSet(fhSchema.properties.valid_until_source.enum, EXPECTED_VALID_UNTIL_SOURCES)) {
    errors.push('valid_until_source enum drifted from the approved set');
  }
  if (!sameSet(retSchema.properties.report_type.enum, EXPECTED_REPORT_TYPES)) {
    errors.push('report_type enum drifted from the approved set');
  }
  for (const key of retKeys) {
    if (FORBIDDEN_NAME_PATTERNS.some((re) => re.test(key))) {
      errors.push(`Nursing->FH return exposes a derivation-capable field "${key}"`);
    }
  }
  for (const clause of fhSchema.allOf || []) {
    const text = stableStringify(clause);
    if (text.includes('drug_display') || text.includes('line_label') || text.includes('"treatment"')) {
      errors.push('a cross-field rule derives state from the display-only treatment block');
    }
  }
  return errors;
}

// --- date-source hierarchy (contract §4): strict precedence, fail-closed on
// same-level disagreement. Independent of prose: the checker recomputes it. ---

const DATE_SOURCE_PRECEDENCE = [
  'prescription_valid_until_confirmed',
  'prescription_issue_date_confirmed_duration_confirmed',
  'pharmacy_verified_remaining_period',
  'prescription_issue_date_confirmed_duration_configured',
  'circuit_entry_estimate',
  'manual_estimate',
  'not_recorded'
];

// Endpoint-based resolution (contract §4). A candidate is { source, endpoint }
// where endpoint is the resulting valid_until date string, or null for
// not_recorded. AGREEMENT between candidates resolves normally; only a
// disagreement on the RESULTING DATE fails closed:
//   - unknown source => DATE_SOURCE_CONFLICT;
//   - two candidates at the same precedence level with different endpoints =>
//     DATE_SOURCE_CONFLICT;
//   - two candidates at the same level with equal endpoints => resolve (no false
//     conflict);
//   - two `confirmed` sources (levels 1 and 2) with different endpoints =>
//     DATE_SOURCE_CONFLICT;
//   - two `confirmed` sources with equal endpoints => resolve to level 1;
//   - otherwise the highest precedence wins. The result is order-independent.
function resolveDateSource(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { status: 'DATE_SOURCE_CONFLICT', reason: 'no candidate source' };
  }
  const byLevel = new Map();
  for (const c of candidates) {
    const source = c && typeof c === 'object' ? c.source : c;
    if (typeof source !== 'string' || !DATE_SOURCE_PRECEDENCE.includes(source)) {
      return { status: 'DATE_SOURCE_CONFLICT', reason: `unknown source ${JSON.stringify(source)}` };
    }
    const idx = DATE_SOURCE_PRECEDENCE.indexOf(source);
    if (!byLevel.has(idx)) byLevel.set(idx, []);
    const endpoint = c && typeof c === 'object' && c.endpoint !== undefined ? c.endpoint : null;
    byLevel.get(idx).push(endpoint);
  }
  for (const [idx, endpoints] of byLevel) {
    const distinct = new Set(endpoints.map((e) => JSON.stringify(e)));
    if (distinct.size > 1) {
      return {
        status: 'DATE_SOURCE_CONFLICT',
        reason: `same-precedence sources disagree on the resulting date: ${DATE_SOURCE_PRECEDENCE[idx]}`
      };
    }
  }
  if (byLevel.has(0) && byLevel.has(1)) {
    const e1 = byLevel.get(0)[0];
    const e2 = byLevel.get(1)[0];
    if (e1 !== e2) {
      return {
        status: 'DATE_SOURCE_CONFLICT',
        reason: 'two confirmed sources disagree on the resulting date'
      };
    }
  }
  const winner = Math.min(...byLevel.keys());
  return { status: 'RESOLVED', source: DATE_SOURCE_PRECEDENCE[winner] };
}

function runDateSourceHierarchy(fhSchema) {
  console.log('Date-source hierarchy (precedencia de fuentes por endpoint, fallo cerrado):');
  const enumMatches = sameSet(DATE_SOURCE_PRECEDENCE, (fhSchema.properties || {}).valid_until_source?.enum || []);
  record('date-source precedence covers exactly the schema valid_until_source enum', enumMatches,
    enumMatches ? '' : 'precedence list and schema enum drifted apart');

  const L1 = DATE_SOURCE_PRECEDENCE[0];
  const L2 = DATE_SOURCE_PRECEDENCE[1];
  const L3 = DATE_SOURCE_PRECEDENCE[2];
  const L5 = DATE_SOURCE_PRECEDENCE[4];
  const L6 = DATE_SOURCE_PRECEDENCE[5];
  const L7 = DATE_SOURCE_PRECEDENCE[6];

  const r1 = resolveDateSource([{ source: L6, endpoint: '2026-11-01' }, { source: L1, endpoint: '2026-11-15' }]);
  record('higher precedence prevails (prescription_valid_until_confirmed over manual_estimate)',
    r1.status === 'RESOLVED' && r1.source === L1, JSON.stringify(r1));

  const r2 = resolveDateSource([{ source: L5, endpoint: '2026-11-20' }, { source: L3, endpoint: '2026-11-25' }]);
  record('higher precedence prevails (pharmacy_verified_remaining_period over circuit_entry_estimate)',
    r2.status === 'RESOLVED' && r2.source === L3, JSON.stringify(r2));

  const r3 = resolveDateSource([{ source: L7, endpoint: null }]);
  record('single candidate resolves to itself', r3.status === 'RESOLVED' && r3.source === L7, JSON.stringify(r3));

  const r4a = resolveDateSource([{ source: L6, endpoint: '2026-11-01' }, { source: L6, endpoint: '2026-12-01' }]);
  const r4b = resolveDateSource([{ source: L6, endpoint: '2026-12-01' }, { source: L6, endpoint: '2026-11-01' }]);
  record('same-precedence candidates with DIFFERENT endpoints fail closed (DATE_SOURCE_CONFLICT, both input orders)',
    r4a.status === 'DATE_SOURCE_CONFLICT' && r4b.status === 'DATE_SOURCE_CONFLICT',
    `a=${JSON.stringify(r4a)} b=${JSON.stringify(r4b)}`);

  const r5 = resolveDateSource([{ source: L6, endpoint: '2026-11-01' }, { source: L6, endpoint: '2026-11-01' }]);
  record('same-precedence candidates with EQUAL endpoints resolve (no false conflict)',
    r5.status === 'RESOLVED' && r5.source === L6, JSON.stringify(r5));

  const r6a = resolveDateSource([{ source: L1, endpoint: '2026-11-15' }, { source: L2, endpoint: '2026-11-20' }]);
  const r6b = resolveDateSource([{ source: L2, endpoint: '2026-11-20' }, { source: L1, endpoint: '2026-11-15' }]);
  record('two confirmed sources with DIFFERENT endpoints fail closed in both input orders (DATE_SOURCE_CONFLICT)',
    r6a.status === 'DATE_SOURCE_CONFLICT' && r6b.status === 'DATE_SOURCE_CONFLICT',
    `a=${JSON.stringify(r6a)} b=${JSON.stringify(r6b)}`);

  const r7a = resolveDateSource([{ source: L1, endpoint: '2026-11-15' }, { source: L2, endpoint: '2026-11-15' }]);
  const r7b = resolveDateSource([{ source: L2, endpoint: '2026-11-15' }, { source: L1, endpoint: '2026-11-15' }]);
  record('two confirmed sources with EQUAL endpoints resolve to prescription_valid_until_confirmed in both input orders',
    r7a.status === 'RESOLVED' && r7a.source === L1 && r7b.status === 'RESOLVED' && r7b.source === L1,
    `a=${JSON.stringify(r7a)} b=${JSON.stringify(r7b)}`);

  const r8 = resolveDateSource([
    { source: L1, endpoint: '2026-11-15' },
    { source: 'not_a_source', endpoint: '2026-11-15' }
  ]);
  record('unknown candidate source fails closed (DATE_SOURCE_CONFLICT)',
    r8.status === 'DATE_SOURCE_CONFLICT', JSON.stringify(r8));
}

// --- precedence regression checks: plausible stale orderings must disagree
// with the ruled model, so a reordering regression can never pass silently. ---

function runApplyPrecedenceChecks(machine, scenarios, retValidator) {
  console.log('Precedence mutations (stale orderings must be rejected):');
  const load = (rel) => loadJson(path.join(FIXTURE_DIR, rel));

  // Legacy ordering defect (d): terminal-state rejection before the
  // idempotent-replay check.
  const terminalDoc = load('semantic/return_replay_on_terminal_noop.json');
  const currentRes = applyReturn(freshState(scenarios.seed), terminalDoc, machine);
  const legacyState = freshState(scenarios.seed);
  const legacyRec = legacyState.known[terminalDoc.renewal_id];
  const legacyRes = machine.terminal_states.includes(legacyRec.lifecycle_state)
    ? { outcome: 'rejected', error_code: 'REPORT_NOT_APPLICABLE', applied: false }
    : applyReturn(legacyState, terminalDoc, machine);
  record('mutation/terminal-check-before-replay rejects an identical terminal replay (ruled order = no_op)',
    currentRes.outcome === 'no_op' && legacyRes.outcome === 'rejected' && legacyRes.error_code === 'REPORT_NOT_APPLICABLE',
    `current=${JSON.stringify(currentRes)} legacy=${JSON.stringify(legacyRes)}`);

  // Legacy defect: LINE_NOT_ACTIVE guard absent.
  const stoppedDoc = load('semantic/return_line_not_active.json');
  const stoppedState = freshState(scenarios.seed);
  const stoppedRes = applyReturn(stoppedState, stoppedDoc, machine);
  const unguardedRec = { ...stoppedState.known[stoppedDoc.renewal_id], line_status: 'active' };
  const unguardedState = { known: { ...stoppedState.known, [stoppedDoc.renewal_id]: unguardedRec } };
  const unguardedRes = applyReturn(unguardedState, stoppedDoc, machine);
  record('mutation/removing the LINE_NOT_ACTIVE guard accepts a stopped-line return (ruled order rejects)',
    stoppedRes.outcome === 'rejected' && stoppedRes.error_code === 'LINE_NOT_ACTIVE' && unguardedRes.outcome === 'accepted',
    `current=${JSON.stringify(stoppedRes)} unguarded=${JSON.stringify(unguardedRes)}`);

  // Ruled mutation (i): a model that remembers ONLY the last applied operation
  // (single-slot memory) must diverge from the ruled outcome on historical
  // replay: replaying the FIRST of two accepted returns is no_op (ruled) but
  // reaches reachability in the stale model and answers REPORT_NOT_APPLICABLE;
  // a modified historical replay is STATE_CONFLICT (ruled) but
  // REPORT_NOT_APPLICABLE there too.
  const firstDoc = load('valid/nursing_to_fh_requested_to_service.json');
  const interveningDoc = load('semantic/return_in_progress_ren_syn_0001.json');
  const replayIdenticalDoc = load('valid/nursing_to_fh_requested_to_service.json');
  const replayModifiedDoc = load('semantic/return_replay_modified_ren_syn_0001.json');

  const historyState = freshState(scenarios.seed);
  const firstRes = applyReturn(historyState, firstDoc, machine);
  const interveningRes = applyReturn(historyState, interveningDoc, machine);
  const ruledReplayRes = applyReturn(historyState, replayIdenticalDoc, machine);
  const historyState2 = freshState(scenarios.seed);
  applyReturn(historyState2, firstDoc, machine);
  applyReturn(historyState2, interveningDoc, machine);
  const ruledModifiedRes = applyReturn(historyState2, replayModifiedDoc, machine);

  const staleState = freshState(scenarios.seed);
  applyReturn(staleState, firstDoc, machine);
  applyReturn(staleState, interveningDoc, machine);
  // Degrade to last-operation-only memory: keep only the most recent entry of
  // the applied-return history, exactly what a single-slot model retains.
  for (const rec of Object.values(staleState.known)) {
    if (Array.isArray(rec.applied_returns) && rec.applied_returns.length > 1) {
      rec.applied_returns = rec.applied_returns.slice(-1);
    }
  }
  const staleReplayRes = applyReturn(staleState, replayIdenticalDoc, machine);
  const staleState2 = freshState(scenarios.seed);
  applyReturn(staleState2, firstDoc, machine);
  applyReturn(staleState2, interveningDoc, machine);
  for (const rec of Object.values(staleState2.known)) {
    if (Array.isArray(rec.applied_returns) && rec.applied_returns.length > 1) {
      rec.applied_returns = rec.applied_returns.slice(-1);
    }
  }
  const staleModifiedRes = applyReturn(staleState2, replayModifiedDoc, machine);

  record('mutation/last-operation-only memory turns an exact historical replay into REPORT_NOT_APPLICABLE (ruled = no_op)',
    firstRes.outcome === 'accepted' && interveningRes.outcome === 'accepted' &&
    ruledReplayRes.outcome === 'no_op' &&
    staleReplayRes.outcome === 'rejected' && staleReplayRes.error_code === 'REPORT_NOT_APPLICABLE',
    `ruled=${JSON.stringify(ruledReplayRes)} stale=${JSON.stringify(staleReplayRes)}`);
  record('mutation/last-operation-only memory turns a modified historical replay into REPORT_NOT_APPLICABLE (ruled = STATE_CONFLICT)',
    ruledModifiedRes.outcome === 'rejected' && ruledModifiedRes.error_code === 'STATE_CONFLICT' &&
    staleModifiedRes.outcome === 'rejected' && staleModifiedRes.error_code === 'REPORT_NOT_APPLICABLE',
    `ruled=${JSON.stringify(ruledModifiedRes)} stale=${JSON.stringify(staleModifiedRes)}`);

  // Ruled mutation (ii): a batch path that skips the per-row step-2 boundary
  // must accept the forbidden row (divergence detected against the ruled model).
  const batchRows = load('batch/mixed_invalid_row_batch.json');
  const ruledBatch = importBatch(batchRows, freshState(scenarios.seed), machine, retValidator);
  const staleBatch = importBatch(batchRows, freshState(scenarios.seed), machine, retValidator, { skip_row_validation: true });
  record('mutation/batch path skipping per-row step-2 validation accepts the forbidden row (ruled model rejects per row)',
    ruledBatch.applied === 1 &&
    ruledBatch.rows[1].outcome === 'rejected' && ruledBatch.rows[1].error_code === 'FORBIDDEN_FIELD_IN_RETURN' &&
    ruledBatch.rows[2].outcome === 'rejected' && ruledBatch.rows[2].error_code === 'INVALID_FIELD' &&
    staleBatch.rows[1].outcome === 'accepted' && staleBatch.rows[2].outcome === 'accepted',
    `ruled=${JSON.stringify(ruledBatch)} stale=${JSON.stringify(staleBatch)}`);
}

// --- runs ---

function pickSchema(doc, fhValidator, retValidator) {
  if (doc && doc.record_type === FH_TO_NURSING_RECORD_TYPE) return { validator: fhValidator, recordType: FH_TO_NURSING_RECORD_TYPE };
  if (doc && doc.record_type === NURSING_TO_FH_RECORD_TYPE) return { validator: retValidator, recordType: NURSING_TO_FH_RECORD_TYPE };
  // fall back to filename hint handled by caller for malformed docs
  return null;
}

function runPositiveFixtures(fhValidator, retValidator) {
  console.log('Positive fixtures (must validate + coherent window_state):');
  const dir = path.join(FIXTURE_DIR, 'valid');
  for (const file of fs.readdirSync(dir).sort()) {
    const doc = loadJson(path.join(dir, file));
    const picked = pickSchema(doc, fhValidator, retValidator);
    if (!picked) {
      record(`valid/${file}`, false, 'record_type is neither FH->Nursing nor Nursing->FH');
      continue;
    }
    const okSchema = picked.validator(doc);
    const windowErrors = picked.recordType === FH_TO_NURSING_RECORD_TYPE ? windowStateErrors(doc) : [];
    const dateErrors = semanticDateErrors(doc);
    if (okSchema && windowErrors.length === 0 && dateErrors.length === 0) {
      record(`valid/${file}`, true, 'accepted');
    } else {
      record(`valid/${file}`, false, okSchema ? [...windowErrors, ...dateErrors].join(' | ') : ajvFormat(picked.validator.errors));
    }
  }
}

function runInvalidFixtures(fhValidator, retValidator) {
  const cases = [
    { file: 'fh_to_nursing_missing_required.json', schema: 'fh', expect: 'MISSING_REQUIRED_FIELD' },
    { file: 'fh_to_nursing_unknown_with_valid_until.json', schema: 'fh', expect: 'INVALID_FIELD' },
    { file: 'fh_to_nursing_bad_kind_source_mapping.json', schema: 'fh', expect: 'INVALID_FIELD' },
    { file: 'fh_to_nursing_bad_date_format.json', schema: 'fh', expect: 'INVALID_FIELD' },
    { file: 'fh_to_nursing_impossible_date.json', schema: 'fh', expect: 'INVALID_FIELD', semantic: 'dates' },
    { file: 'fh_to_nursing_required_field_null.json', schema: 'fh', expect: 'INVALID_FIELD' },
    { file: 'fh_to_nursing_duration_without_fields.json', schema: 'fh', expect: 'MISSING_REQUIRED_FIELD' },
    { file: 'fh_to_nursing_window_state_mismatch.json', schema: 'fh', expect: 'INVALID_FIELD', semantic: 'window' },
    { file: 'nursing_to_fh_forbidden_valid_until.json', schema: 'ret', expect: 'FORBIDDEN_FIELD_IN_RETURN' },
    { file: 'nursing_to_fh_forbidden_therapeutic.json', schema: 'ret', expect: 'FORBIDDEN_FIELD_IN_RETURN' },
    { file: 'nursing_to_fh_forbidden_line_status.json', schema: 'ret', expect: 'FORBIDDEN_FIELD_IN_RETURN' },
    { file: 'nursing_to_fh_bad_report_type.json', schema: 'ret', expect: 'INVALID_FIELD' },
    { file: 'nursing_to_fh_impossible_datetime.json', schema: 'ret', expect: 'INVALID_FIELD', semantic: 'dates' },
    { file: 'nursing_to_fh_unsupported_version.json', schema: 'ret', expect: 'UNSUPPORTED_CONTRACT_VERSION' }
  ];
  console.log('Planted invalid records (must be rejected for the expected reason):');
  for (const c of cases) {
    const doc = loadJson(path.join(FIXTURE_DIR, 'invalid', c.file));
    const validator = c.schema === 'fh' ? fhValidator : retValidator;
    const recordType = c.schema === 'fh' ? FH_TO_NURSING_RECORD_TYPE : NURSING_TO_FH_RECORD_TYPE;
    const okSchema = validator(doc);
    if (okSchema) {
      if (c.semantic === 'window') {
        const windowErrors = windowStateErrors(doc);
        if (windowErrors.length === 0) {
          record(`invalid/${c.file}`, false, 'was accepted but must be rejected');
        } else {
          record(`invalid/${c.file}`, windowErrors.length > 0, `rejected by window recomputation: ${windowErrors.join(' | ')}`);
        }
      } else if (c.semantic === 'dates') {
        const dateErrors = semanticDateErrors(doc);
        if (dateErrors.length === 0) {
          record(`invalid/${c.file}`, false, 'was accepted but must be rejected');
        } else {
          record(`invalid/${c.file}`, true, `rejected by calendar validation: ${dateErrors.join(' | ')}`);
        }
      } else {
        record(`invalid/${c.file}`, false, 'was accepted but must be rejected');
      }
      continue;
    }
    const code = schemaErrorCode(validator.errors, recordType);
    if (code === c.expect) {
      record(`invalid/${c.file}`, true, `rejected: ${code}`);
    } else {
      record(`invalid/${c.file}`, false, `rejected as ${code}, expected ${c.expect}: ${ajvFormat(validator.errors)}`);
    }
  }
}

function runScenarios(fhValidator, retValidator, machine) {
  console.log('Scenarios (ida / vuelta / idempotencia / conflictos / no aplicable / línea / version):');
  const scenarios = loadJson(path.join(FIXTURE_DIR, 'scenarios_v1.json'));
  if (scenarios.contract_version !== CONTRACT_VERSION) {
    record('scenarios_v1 contract_version', false, `unexpected ${scenarios.contract_version}`);
    return;
  }
  const load = (rel) => loadJson(path.join(FIXTURE_DIR, rel));
  const seedLineStatuses = new Set(['active', 'stopped', 'switched', 'cancelled', 'completed', 'suspended']);
  const badSeed = scenarios.seed.known_renewals.filter((r) => !seedLineStatuses.has(r.line_status));
  record('seed line_status present and from the closed line-event vocabulary', badSeed.length === 0,
    badSeed.length === 0 ? '' : `entries without a closed line_status: ${badSeed.map((r) => r.renewal_id).join(', ')}`);
  for (const sc of scenarios.scenarios) {
    let pass = false;
    let detail = '';
    try {
      if (sc.kind === 'fh_to_nursing_validate') {
        const doc = load(sc.fixture);
        const ok = fhValidator(doc) && windowStateErrors(doc).length === 0;
        pass = ok && sc.expect.outcome === 'accepted';
        detail = ok ? 'accepted' : ajvFormat(fhValidator.errors) || windowStateErrors(doc).join(' | ');
      } else if (sc.kind === 'nursing_to_fh_apply') {
        const doc = load(sc.fixture);
        const state = freshState(scenarios.seed);
        const res = applyReturn(state, doc, machine);
        pass = res.outcome === sc.expect.outcome &&
          (sc.expect.error_code === undefined || res.error_code === sc.expect.error_code) &&
          (sc.expect.to === undefined || res.to === sc.expect.to);
        detail = JSON.stringify(res);
      } else if (sc.kind === 'nursing_to_fh_reimport_identical') {
        const state = freshState(scenarios.seed);
        const first = applyReturn(state, load(sc.first), machine);
        const second = applyReturn(state, load(sc.second), machine);
        pass = first.outcome === 'accepted' && second.outcome === 'no_op' && second.applied === false;
        detail = `first=${JSON.stringify(first)} second=${JSON.stringify(second)}`;
      } else if (sc.kind === 'nursing_to_fh_apply_sequence') {
        const state = freshState(scenarios.seed);
        let last = null;
        for (const f of sc.fixtures) last = applyReturn(state, load(f), machine);
        pass = last !== null &&
          last.outcome === sc.expect.outcome &&
          (sc.expect.error_code === undefined || last.error_code === sc.expect.error_code) &&
          (sc.expect.to === undefined || last.to === sc.expect.to);
        detail = last === null ? 'no fixtures' : JSON.stringify(last);
      } else if (sc.kind === 'nursing_to_fh_replay_terminal_noop') {
        const doc = load(sc.fixture);
        const seedEntry = scenarios.seed.known_renewals.find((r) => r.renewal_id === doc.renewal_id);
        const seeded = seedEntry ? seedEntry.last_applied_return : undefined;
        const identicalSeed = Boolean(seeded) && stableStringify(seeded) === stableStringify(doc);
        const state = freshState(scenarios.seed);
        const res = applyReturn(state, doc, machine);
        pass = identicalSeed &&
          res.outcome === 'no_op' && res.applied === false &&
          state.known[doc.renewal_id].lifecycle_state === 'FH_UPDATED';
        detail = `seeded_identical=${identicalSeed} res=${JSON.stringify(res)}`;
      } else if (sc.kind === 'nursing_to_fh_reimport_conflict') {
        const state = freshState(scenarios.seed);
        const first = applyReturn(state, load(sc.first), machine);
        const before = stableStringify(state.known);
        const second = applyReturn(state, load(sc.second), machine);
        const preserved = stableStringify(state.known) === before;
        pass = first.outcome === 'accepted' && second.outcome === sc.expect.outcome &&
          second.error_code === sc.expect.error_code && preserved === sc.expect.fh_state_preserved;
        detail = `first=${JSON.stringify(first)} second=${JSON.stringify(second)} preserved=${preserved}`;
      } else if (sc.kind === 'batch_import') {
        const docs = load(sc.fixture);
        const state = freshState(scenarios.seed);
        const res = importBatch(docs, state, machine, retValidator);
        pass = res.outcome === sc.expect.outcome && res.error_code === sc.expect.error_code &&
          res.applied === sc.expect.applied;
        const parts = [`result=${JSON.stringify(res)}`];
        if (Array.isArray(sc.expect.rows)) {
          // Per-row expectations: each declared row must match outcome and, when
          // declared, its typed error code.
          const rowsOk = Array.isArray(res.rows) && res.rows.length === sc.expect.rows.length &&
            sc.expect.rows.every((e, i) =>
              res.rows[i].outcome === e.outcome &&
              (e.error_code === undefined || res.rows[i].error_code === e.error_code));
          pass = pass && rowsOk;
          if (!rowsOk) parts.push(`rows=${JSON.stringify(res.rows)}`);
        } else if (res.outcome === sc.expect.outcome && sc.expect.outcome !== 'rejected_batch') {
          // A processed batch without declared row expectations is not allowed:
          // row-level outcomes must always be pinned down.
          pass = false;
          parts.push('missing expect.rows for a processed batch');
        }
        if (pass) {
          // Per-row atomicity: every row rejected inside a processed batch must
          // leave the FH state of its renewal exactly as seeded.
          const pristine = freshState(scenarios.seed);
          const broken = docs
            .map((d, i) => ({ rid: d.renewal_id, row: res.rows[i] }))
            .filter((x) => x.row && x.row.outcome === 'rejected' && x.row.applied === false)
            .filter((x) => pristine.known[x.rid] !== undefined)
            .filter((x) => stableStringify(state.known[x.rid]) !== stableStringify(pristine.known[x.rid]));
          if (broken.length > 0) {
            pass = false;
            parts.push(`fh state mutated for rejected rows: ${broken.map((x) => x.rid).join(', ')}`);
          } else {
            parts.push('rejected rows left FH state preserved');
          }
        }
        detail = parts.join(' ');
      } else {
        detail = `unknown scenario kind ${sc.kind}`;
      }
    } catch (e) {
      detail = `threw: ${e.message}`;
    }
    record(`scenario/${sc.id}`, pass, detail);
  }
}

function runStateMachine(machine) {
  console.log('State machine structural invariants:');
  const errors = machineInvariantErrors(machine);
  record('state machine invariants hold (FH_UPDATED pharmacy-only, no time triggers, terminals closed, disjoint axes)', errors.length === 0, errors.join(' | '));

  const cases = machineMutationCases(machine);
  for (const [name, ok] of cases) record(`mutation/${name}`, ok, ok ? '' : 'detector did not reject the mutation');

  // explicit runtime demonstration that a return can never reach FH_UPDATED:
  // report_type enum carries no FH_UPDATED and the only incoming edge is pharmacy.
  const retSchema = loadJson(path.join(SCHEMA_DIR, NURSING_TO_FH_SCHEMA));
  const noFhTarget = !retSchema.properties.report_type.enum.includes('FH_UPDATED');
  record('Nursing->FH report_type cannot name FH_UPDATED', noFhTarget, noFhTarget ? '' : 'report_type exposes FH_UPDATED');
}

function main() {
  console.log('PROMueve Nexus renewal handoff contract check (N0 #446)');

  let fh, ret, machine;
  try {
    fh = buildValidator(FH_TO_NURSING_SCHEMA);
    ret = buildValidator(NURSING_TO_FH_SCHEMA);
    record('schemas compile (draft 2020-12, additionalProperties:false)', true, '');
  } catch (e) {
    record('schemas compile (draft 2020-12, additionalProperties:false)', false, e.message);
    finish();
    return;
  }
  machine = loadJson(path.join(SCHEMA_DIR, STATE_MACHINE_FILE));

  runPositiveFixtures(fh.validate, ret.validate);
  runInvalidFixtures(fh.validate, ret.validate);
  runScenarios(fh.validate, ret.validate, machine);
  runStateMachine(machine);
  runApplyPrecedenceChecks(machine, loadJson(path.join(FIXTURE_DIR, 'scenarios_v1.json')), ret.validate);

  console.log('Closed field sets / no-inference guard:');
  const drift = closedFieldSetErrors(fh.schema, ret.schema, machine);
  record('closed field sets + disjoint state axes + display-only treatment block', drift.length === 0, drift.join(' | '));

  runDateSourceHierarchy(fh.schema);

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

main();
