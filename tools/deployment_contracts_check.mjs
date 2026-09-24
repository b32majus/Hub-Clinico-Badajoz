#!/usr/bin/env node
'use strict';
/**
 * Deterministic checker for PROMueve Nexus deployment contracts (F2.1 WU-A).
 *
 * Validates module-registry.json and deployment-profile.json fixtures against
 * the JSON Schemas in schemas/deployment/ (Ajv, draft 2020-12) plus the
 * semantic coherence and cross-reference rules that a schema alone cannot
 * express. Planted invalid fixtures must FAIL for the expected reason.
 *
 * Exit codes: 0 = all cases PASS, 1 = at least one case FAIL.
 * Usage: node tools/deployment_contracts_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Ajv = require('ajv/dist/2020.js');

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_DIR = path.join(ROOT, 'schemas', 'deployment');
const FIXTURE_DIR = path.join(ROOT, 'tools', 'fixtures', 'deployment');

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
  const ajv = new Ajv({ allErrors: true, strict: true });
  const schema = loadJson(path.join(SCHEMA_DIR, schemaFile));
  const validate = ajv.compile(schema);
  return { validate, ajv };
}

// --- semantic rules on top of the schemas (fail-closed, no heuristics) ---

function registrySemanticErrors(registry) {
  const errors = [];
  const ids = (registry.modules || []).map((m) => m.moduleId);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length > 0) {
    errors.push(`duplicate moduleId in registry: ${[...new Set(duplicates)].join(', ')}`);
  }
  return errors;
}

const ENABLED_STATES = new Set(['IMPLEMENTED_NOT_QUALIFIED', 'QUALIFIED_FOR_SITE']);
const DISABLED_STATES = new Set(['NOT_IMPLEMENTED', 'DISABLED_BY_DEPLOYMENT']);

function profileSemanticErrors(profile, registry) {
  const errors = [];
  const registered = new Set((registry.modules || []).map((m) => m.moduleId));
  const profileIds = (profile.modules || []).map((m) => m.moduleId);
  const duplicates = profileIds.filter((id, i) => profileIds.indexOf(id) !== i);
  if (duplicates.length > 0) {
    errors.push(`duplicate moduleId in profile: ${[...new Set(duplicates)].join(', ')}`);
  }
  for (const mod of profile.modules || []) {
    if (!registered.has(mod.moduleId)) {
      errors.push(`module "${mod.moduleId}" is not registered in the module registry`);
      continue;
    }
    if (mod.enabled === true && !ENABLED_STATES.has(mod.qualificationState)) {
      errors.push(
        `module "${mod.moduleId}": enabled=true is incoherent with qualificationState=${mod.qualificationState}`
      );
    }
    if (mod.enabled === false && !DISABLED_STATES.has(mod.qualificationState)) {
      errors.push(
        `module "${mod.moduleId}": enabled=false is incoherent with qualificationState=${mod.qualificationState}`
      );
    }
    if (
      mod.qualificationState === 'QUALIFIED_FOR_SITE' &&
      !(typeof mod.qualificationEvidence === 'string' && mod.qualificationEvidence.trim().length >= 4)
    ) {
      errors.push(
        `module "${mod.moduleId}": QUALIFIED_FOR_SITE requires explicit qualificationEvidence; existence of the module is not qualification`
      );
    }
  }
  return errors;
}

function validatePair(registry, profile) {
  const errors = [];
  if (!registryValidate(registry)) {
    errors.push(`registry schema: ${ajvFormat(registryValidate.errors)}`);
  } else {
    errors.push(...registrySemanticErrors(registry));
  }
  if (!profileValidate(profile)) {
    errors.push(`profile schema: ${ajvFormat(profileValidate.errors)}`);
  } else {
    errors.push(...profileSemanticErrors(profile, registry));
  }
  return errors;
}

function ajvFormat(errors) {
  return (errors || [])
    .map((e) => `${e.instancePath || '/'} ${e.message}`)
    .join('; ');
}

// --- cases ---

function runValidFixtures() {
  const validDir = path.join(FIXTURE_DIR, 'valid');
  const registry = loadJson(path.join(validDir, 'module-registry.json'));
  const profile = loadJson(path.join(validDir, 'deployment-profile.json'));
  console.log('Valid fixtures:');
  const errors = validatePair(registry, profile);
  record('valid deployment registry + profile composition', errors.length === 0, errors.join(' | ') || 'unexpected failure');
}

function runInvalidFixtures() {
  const invalidDir = path.join(FIXTURE_DIR, 'invalid');
  const validRegistry = loadJson(path.join(FIXTURE_DIR, 'valid', 'module-registry.json'));
  const validProfile = loadJson(path.join(FIXTURE_DIR, 'valid', 'deployment-profile.json'));
  const cases = [
    {
      file: 'registry-unknown-key.json',
      expect: 'must NOT have additional properties',
    },
    {
      file: 'registry-duplicate-module-id.json',
      expect: 'duplicate moduleId in registry',
    },
    {
      file: 'profile-siteid-missing.json',
      expect: "must have required property 'siteId'",
    },
    {
      file: 'profile-unknown-key.json',
      expect: 'must NOT have additional properties',
    },
    {
      file: 'profile-unknown-module.json',
      expect: 'not registered in the module registry',
    },
    {
      file: 'profile-bad-qualification-state.json',
      expect: 'must be equal to one of the allowed values',
    },
    {
      file: 'profile-incoherent-enabled.json',
      expect: 'incoherent with qualificationState',
    },
    {
      file: 'profile-qualified-without-evidence.json',
      expect: 'requires explicit qualificationEvidence',
    },
    {
      file: 'profile-clinical-property.json',
      expect: 'must NOT have additional properties',
    },
  ];
  console.log('Planted invalid fixtures (must FAIL for the expected reason):');
  for (const c of cases) {
    const doc = loadJson(path.join(invalidDir, c.file));
    // The invalid document replaces the valid one of its own kind.
    const isRegistry = c.file.startsWith('registry-');
    const errors = isRegistry
      ? validatePair(doc, validProfile)
      : validatePair(validRegistry, doc);
    const rejected = errors.length > 0;
    const matched = errors.some((e) => e.includes(c.expect));
    if (!rejected) {
      record(`invalid/${c.file}`, false, 'was accepted but must be rejected');
    } else if (!matched) {
      record(`invalid/${c.file}`, false, `rejected but for an unexpected reason: ${errors.join(' | ')}`);
    } else {
      record(`invalid/${c.file}`, true, 'rejected for the expected reason');
    }
  }
}

function main() {
  console.log('PROMueve Nexus deployment contracts check (F2.1 WU-A)');
  const registrySchema = loadJson(path.join(SCHEMA_DIR, 'module-registry.schema.json'));
  const profileSchema = loadJson(path.join(SCHEMA_DIR, 'deployment-profile.schema.json'));
  const registryAjv = new Ajv({ allErrors: true, strict: true });
  const profileAjv = new Ajv({ allErrors: true, strict: true });
  registryValidate = registryAjv.compile(registrySchema);
  profileValidate = profileAjv.compile(profileSchema);

  runValidFixtures();
  runInvalidFixtures();

  const failed = results.filter((r) => !r.pass);
  console.log('');
  console.log(`RESULTADO: ${results.length - failed.length} OK / ${failed.length} FALLIDO`);
  if (failed.length > 0) {
    console.error('Deployment contracts check FAILED');
    process.exit(1);
  }
  console.log('Deployment contracts check PASSED');
}

let registryValidate;
let profileValidate;

main();
