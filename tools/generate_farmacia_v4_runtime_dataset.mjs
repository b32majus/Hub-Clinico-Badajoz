#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = 'data/demo/farmacia/farmacia_v4_scenario_manifest.json';
const OUTPUT = 'data/demo/farmacia/farmacia_v4_runtime_v1.json';

function valueOrNull(value) {
  return value === undefined || value === '' ? null : value;
}

function requireUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (!value || seen.has(value)) throw new Error(`${label} must be non-empty and unique: ${value}`);
    seen.add(value);
  }
}

function loadManifest() {
  const bytes = fs.readFileSync(path.join(ROOT, MANIFEST));
  const manifest = JSON.parse(bytes.toString('utf8'));
  if (manifest.schema !== 'promueve.farmacia.v4.scenario_manifest') throw new Error('Unexpected manifest schema');
  if (manifest.synthetic !== true) throw new Error('Manifest must be explicitly synthetic');
  if (!Array.isArray(manifest.scenarios) || manifest.scenarios.length !== 12) throw new Error('Manifest must contain 12 scenarios');
  requireUnique(manifest.scenarios.map((item) => item.scenario_id), 'scenario_id');
  requireUnique(manifest.scenarios.map((item) => item.patient_id), 'patient_id');
  requireUnique(manifest.scenarios.map((item) => item.synthetic_cip), 'synthetic_cip');
  return { manifest, bytes };
}

function normalizeLine(patientId, scenarioId, line) {
  return {
    patient_id: patientId,
    scenario_id: scenarioId,
    line_id: valueOrNull(line.line_id),
    relationship: valueOrNull(line.relationship),
    status: valueOrNull(line.status),
    provenance: valueOrNull(line.provenance),
    drug_name: valueOrNull(line.drug_name),
    active_ingredient: valueOrNull(line.active_ingredient),
    dose_text: valueOrNull(line.dose_text),
    route: valueOrNull(line.route),
    schedule: valueOrNull(line.schedule),
    presentation: valueOrNull(line.presentation),
    induction: valueOrNull(line.induction),
    start_date: valueOrNull(line.start_date),
    end_date: valueOrNull(line.end_date)
  };
}

export function buildRuntime(manifest, manifestBytes) {
  const scenarioStates = manifest.scenarios.map((scenario) => ({
    scenario_id: scenario.scenario_id,
    patient_id: scenario.patient_id,
    initial_state: scenario.initial_state,
    source: scenario.source
  }));

  const persons = manifest.scenarios.map((scenario) => ({
    patient_id: scenario.patient_id,
    scenario_id: scenario.scenario_id,
    cip: scenario.synthetic_cip,
    service: valueOrNull(scenario.service),
    pathology: valueOrNull(scenario.pathology),
    source: valueOrNull(scenario.source)
  }));

  const readiness = manifest.scenarios
    .filter((scenario) => scenario.explicit_facts && scenario.explicit_facts.nursing_readiness)
    .map((scenario) => ({
      patient_id: scenario.patient_id,
      scenario_id: scenario.scenario_id,
      status: scenario.explicit_facts.nursing_readiness,
      readiness_date: valueOrNull(scenario.explicit_facts.readiness_date),
      blocking_item: valueOrNull(scenario.explicit_facts.blocking_item),
      pending_item: valueOrNull(scenario.explicit_facts.pending_item),
      prebiologic_complete: valueOrNull(scenario.explicit_facts.prebiologic_complete)
    }));

  const treatmentRequests = manifest.scenarios.flatMap((scenario) =>
    (scenario.treatment_requests || []).map((request) => ({
      patient_id: scenario.patient_id,
      scenario_id: scenario.scenario_id,
      request_id: valueOrNull(request.request_id),
      request_type: valueOrNull(request.request_type),
      origin: valueOrNull(request.origin),
      status: valueOrNull(request.status),
      requested_drug_name: valueOrNull(scenario.explicit_facts && scenario.explicit_facts.requested_drug_name),
      dose_text: null,
      route: null,
      schedule: null,
      presentation: null,
      induction: null
    }))
  );

  const validationActs = manifest.scenarios.flatMap((scenario) =>
    (scenario.validation_acts || []).map((act) => ({
      patient_id: scenario.patient_id,
      scenario_id: scenario.scenario_id,
      validation_act_id: valueOrNull(act.validation_act_id),
      request_id: valueOrNull(
        scenario.treatment_requests && scenario.treatment_requests[0] && scenario.treatment_requests[0].request_id
      ),
      result: valueOrNull(act.result),
      produced_line_id: valueOrNull(act.produced_line_id),
      observation: valueOrNull(
        act.observation ||
        (scenario.explicit_facts && (
          scenario.explicit_facts.validation_observation ||
          scenario.explicit_facts.denial_reason
        ))
      )
    }))
  );

  const treatmentLines = manifest.scenarios.flatMap((scenario) =>
    (scenario.treatment_lines || []).map((line) => normalizeLine(scenario.patient_id, scenario.scenario_id, line))
  );

  return {
    metadata: {
      schema: 'promueve.farmacia.v4.runtime',
      schema_version: '1.0.0',
      source_manifest: MANIFEST,
      source_manifest_blob_sha: crypto.createHash('sha1').update(`blob ${manifestBytes.length}\0`).update(manifestBytes).digest('hex'),
      source_contract: manifest.source_contract,
      synthetic: true,
      generated_at: manifest.created_at,
      status: 'generated_not_wired',
      base_commit: '35a2cdd58a43f588a94882824bf1de9444521ad6'
    },
    scenario_states: scenarioStates,
    persons,
    readiness,
    treatment_requests: treatmentRequests,
    validation_acts: validationActs,
    treatment_lines: treatmentLines,
    visits: [],
    followups: [],
    adverse_events: []
  };
}

const { manifest, bytes } = loadManifest();
const runtime = buildRuntime(manifest, bytes);
const serialized = `${JSON.stringify(runtime)}\n`;

if (process.argv.includes('--stdout')) {
  process.stdout.write(serialized);
} else {
  const outputPath = path.join(ROOT, OUTPUT);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized, 'utf8');
  console.log(`${OUTPUT}: ${runtime.persons.length} persons, ${runtime.treatment_requests.length} requests, ${runtime.validation_acts.length} validations, ${runtime.treatment_lines.length} lines`);
}
