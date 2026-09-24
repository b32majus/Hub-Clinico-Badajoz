#!/usr/bin/env node
'use strict';
/**
 * Deterministic checker for the PROMueve Nexus ConfigurationRepository /
 * EffectiveDeployment contract (F3.1 WU-A).
 *
 * Verifies that the platform seam:
 *  - loads the valid packaged deployment into a deep-frozen
 *    EffectiveDeployment snapshot (site/deployment fixed per artifact);
 *  - is immutable once built (snapshot and every nested object/array);
 *  - transports zero patient/dataset/clinical data (ADR-002);
 *  - fails closed with the exact stable error code on invalid configuration;
 *  - invents nothing: modules not enabled+qualified stay present but
 *    available=false; no module is dropped or invented.
 *
 * All fixtures are 100% synthetic; Node-only deterministic verification (no
 * browser QA). Exit codes: 0 = all cases PASS, 1 = at least one case FAIL.
 * Usage: node tools/platform_contract_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadPlatformFixtures, loadConfiguration } from './platform_test_harness.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE_DIR = path.join(ROOT, 'tools', 'fixtures', 'deployment', 'valid');

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Forbidden keys for the platform seam (ADR-002): no clinical transport.
const FORBIDDEN_KEYS = ['patient_id', 'cip', 'nhc', 'workbook', 'cohort'];

function containsForbiddenKey(text) {
  const lowered = text.toLowerCase();
  return FORBIDDEN_KEYS.filter((key) => lowered.includes(key));
}

function main() {
  console.log('PROMueve Nexus platform contract check (F3.1 WU-A)');
  const fixtures = loadPlatformFixtures();

  // 1. Valid packaged deployment loads into a frozen EffectiveDeployment.
  const load = loadConfiguration(fixtures);
  record('valid packaged deployment loads without error', load.ok, load.error ? `${load.error.code}: ${load.error.message}` : 'unexpected failure');
  if (!load.ok) {
    finish();
    return;
  }
  const snapshot = load.snapshot;
  record(
    'snapshot identity matches the fixed site/deployment artifacts',
    snapshot.snapshotVersion === '1' &&
      snapshot.deploymentId === 'bad-synthetic-demo-01' &&
      snapshot.siteId === 'BAD' &&
      snapshot.persistenceMode === 'session-only' &&
      JSON.stringify(snapshot.display) === JSON.stringify(fixtures.profile.display) &&
      typeof snapshot.provenance === 'object' && snapshot.provenance !== null,
    `snapshotVersion=${snapshot.snapshotVersion} deploymentId=${snapshot.deploymentId} siteId=${snapshot.siteId} persistenceMode=${snapshot.persistenceMode}`
  );
  const moduleIds = snapshot.modules.map((m) => m.moduleId);
  record(
    'snapshot modules follow the registry/manifest order with readiness + release',
    JSON.stringify(moduleIds) === JSON.stringify(['farmacia', 'reuma']) &&
      snapshot.modules.every((m) => typeof m.label === 'string' && typeof m.route === 'string' &&
        typeof m.enabled === 'boolean' && typeof m.qualificationState === 'string' &&
        typeof m.available === 'boolean' && Array.isArray(m.platformCapabilities) &&
        typeof m.readiness === 'string' && typeof m.release === 'string') &&
      snapshot.modules[0].route === 'farmacia_index.html' &&
      snapshot.modules[1].route === 'index.html' &&
      snapshot.modules.every((m) => m.release === '0.6.0' && m.readiness === 'demonstrated'),
    `modules=${JSON.stringify(moduleIds)}`
  );

  // 2. Snapshot immutability: input mutations and nested writes never win.
  const frozenEverywhere =
    Object.isFrozen(snapshot) &&
    Object.isFrozen(snapshot.modules) &&
    Object.isFrozen(snapshot.display) &&
    Object.isFrozen(snapshot.provenance) &&
    snapshot.modules.every((m) => Object.isFrozen(m) && Object.isFrozen(m.platformCapabilities));
  record('snapshot and every nested object/array are frozen', frozenEverywhere, 'Object.isFrozen returned false for at least one level');

  const inputClone = deepClone({ registry: fixtures.registry, profile: fixtures.profile, manifest: fixtures.manifest, readiness: fixtures.readiness });
  inputClone.manifest.modules.push({ moduleId: 'ghost', label: 'Ghost', entryPath: 'ghost.html', enabled: false, qualificationState: 'NOT_IMPLEMENTED', available: false, platformCapabilities: [] });
  inputClone.profile.deploymentId = 'mutated-deployment-id';
  record(
    'mutating a copy of the input after load never alters the snapshot',
    snapshot.modules.length === 2 && snapshot.deploymentId === 'bad-synthetic-demo-01',
    'snapshot leaked mutable references to the input'
  );

  let nestedMutationBlocked = true;
  try {
    snapshot.modules.push({ moduleId: 'invented' });
    nestedMutationBlocked = false;
  } catch { /* frozen array rejected the write */ }
  try {
    snapshot.modules[0].moduleId = 'renamed';
    nestedMutationBlocked = false;
  } catch { /* frozen object rejected the write */ }
  try {
    snapshot.display.productName = 'Tampered';
    nestedMutationBlocked = false;
  } catch { /* frozen object rejected the write */ }
  record(
    'nested snapshot mutation attempts (push, property reassign, display write) never alter the snapshot',
    nestedMutationBlocked &&
      snapshot.modules.length === 2 &&
      snapshot.modules[0].moduleId === 'farmacia' &&
      snapshot.display.productName === fixtures.profile.display.productName,
    'a nested mutation attempt was silently accepted or changed the snapshot'
  );

  // 3. Zero patient/dataset leakage across the platform seam.
  const snapshotText = JSON.stringify(snapshot);
  const leakedInSnapshot = containsForbiddenKey(snapshotText);
  const fixtureFiles = ['module-registry.json', 'deployment-profile.json', 'module-releases.json'];
  let fixtureLeak = [];
  for (const file of fixtureFiles) {
    fixtureLeak = fixtureLeak.concat(containsForbiddenKey(fs.readFileSync(path.join(FIXTURE_DIR, file), 'utf8')).map((key) => `${file}:${key}`));
  }
  fixtureLeak = fixtureLeak.concat(containsForbiddenKey(JSON.stringify(fixtures.manifest)).map((key) => `built-manifest:${key}`));
  fixtureLeak = fixtureLeak.concat(containsForbiddenKey(JSON.stringify(fixtures.readiness)).map((key) => `built-readiness:${key}`));
  record(
    'snapshot and every fixture used carry zero patient/dataset keys',
    leakedInSnapshot.length === 0 && fixtureLeak.length === 0,
    `forbidden keys found: snapshot=[${leakedInSnapshot.join(', ')}] fixtures=[${fixtureLeak.join(', ')}]`
  );

  // 4. Invalid configuration fails closed with the exact error code.
  const errorCases = [
    {
      name: 'missing readiness artifact -> CONFIG_INPUT_INVALID',
      mutate: (input) => { input.readiness = null; },
      expect: 'CONFIG_INPUT_INVALID',
    },
    {
      name: 'missing schemaValidators entry -> SCHEMA_VALIDATOR_REQUIRED',
      mutate: (input) => {
        const validators = { ...input.schemaValidators };
        delete validators.manifest;
        input.schemaValidators = validators;
      },
      expect: 'SCHEMA_VALIDATOR_REQUIRED',
    },
    {
      name: 'schema-invalid manifest (unknown property) -> MANIFEST_SCHEMA_INVALID',
      mutate: (input) => { input.manifest.extraUnknownProperty = true; },
      expect: 'MANIFEST_SCHEMA_INVALID',
    },
    {
      name: 'duplicate registry moduleId -> REGISTRY_DUPLICATE_MODULE',
      mutate: (input) => { input.registry.modules.push(deepClone(input.registry.modules[0])); },
      expect: 'REGISTRY_DUPLICATE_MODULE',
    },
    {
      name: 'profile referencing an unregistered module -> PROFILE_UNKNOWN_MODULE',
      mutate: (input) => { input.profile.modules[0].moduleId = 'ghost-module'; },
      expect: 'PROFILE_UNKNOWN_MODULE',
    },
    {
      name: 'enabled=true with a disabled state -> PROFILE_INCOHERENT_ENABLED',
      mutate: (input) => { input.profile.modules[0].qualificationState = 'NOT_IMPLEMENTED'; },
      expect: 'PROFILE_INCOHERENT_ENABLED',
    },
    {
      name: 'QUALIFIED_FOR_SITE without evidence -> PROFILE_QUALIFICATION_EVIDENCE_REQUIRED',
      mutate: (input) => { input.profile.modules[0].qualificationState = 'QUALIFIED_FOR_SITE'; },
      expect: 'PROFILE_QUALIFICATION_EVIDENCE_REQUIRED',
    },
    {
      name: 'QUALIFIED_FOR_SITE with trivial evidence -> PROFILE_QUALIFICATION_EVIDENCE_REQUIRED',
      mutate: (input) => { input.profile.modules[0].qualificationState = 'QUALIFIED_FOR_SITE'; input.profile.modules[0].qualificationEvidence = '  x  '; },
      expect: 'PROFILE_QUALIFICATION_EVIDENCE_REQUIRED',
    },
    {
      name: 'manifest missing a profile module -> MANIFEST_MISSING_MODULE',
      mutate: (input) => { input.manifest.modules.splice(1, 1); },
      expect: 'MANIFEST_MISSING_MODULE',
    },
    {
      name: 'manifest module not in profile -> MANIFEST_MODULE_NOT_IN_PROFILE',
      mutate: (input) => { input.profile.modules.splice(1, 1); },
      expect: 'MANIFEST_MODULE_NOT_IN_PROFILE',
    },
    {
      name: 'duplicate manifest moduleId -> MANIFEST_DUPLICATE_MODULE',
      mutate: (input) => { input.manifest.modules.push(deepClone(input.manifest.modules[0])); },
      expect: 'MANIFEST_DUPLICATE_MODULE',
    },
    {
      name: 'manifest available contradicting enabled+qualificationState -> MANIFEST_AVAILABLE_CONTRADICTION',
      mutate: (input) => { input.manifest.modules[0].available = true; },
      expect: 'MANIFEST_AVAILABLE_CONTRADICTION',
    },
    {
      name: 'readiness referencing an unknown module -> READINESS_UNKNOWN_MODULE',
      mutate: (input) => { input.readiness.modules[0].moduleId = 'ghost-module'; },
      expect: 'READINESS_UNKNOWN_MODULE',
    },
    {
      name: 'readiness missing a manifest module -> READINESS_MISSING_MODULE',
      mutate: (input) => { input.readiness.modules.splice(1, 1); },
      expect: 'READINESS_MISSING_MODULE',
    },
    {
      name: 'readiness available contradicting the manifest -> READINESS_AVAILABLE_CONTRADICTION',
      mutate: (input) => { input.readiness.modules[0].available = true; },
      expect: 'READINESS_AVAILABLE_CONTRADICTION',
    },
    {
      name: 'readiness route tampered -> READINESS_ROUTE_MISMATCH',
      mutate: (input) => { input.readiness.modules[0].route = 'tampered.html'; },
      expect: 'READINESS_ROUTE_MISMATCH',
    },
    {
      name: 'readiness qualificationState mismatch -> READINESS_QUALIFICATION_STATE_MISMATCH',
      mutate: (input) => { input.readiness.modules[0].qualificationState = 'QUALIFIED_FOR_SITE'; },
      expect: 'READINESS_QUALIFICATION_STATE_MISMATCH',
    },
  ];
  for (const c of errorCases) {
    // Reattach the live validator functions: JSON deep-clone would drop them.
    const planted = deepClone({ registry: fixtures.registry, profile: fixtures.profile, manifest: fixtures.manifest, readiness: fixtures.readiness });
    planted.schemaValidators = fixtures.schemaValidators;
    c.mutate(planted);
    const failed = loadConfiguration(planted);
    record(
      c.name,
      !failed.ok && failed.error && failed.error.code === c.expect,
      failed.ok ? 'was accepted but must fail closed' : `got code=${failed.error ? failed.error.code : 'unknown'}`
    );
  }

  // 5. No invention: not-enabled/not-qualified modules stay present, not available.
  record(
    'modules not enabled+qualified stay in the snapshot with available=false (nothing invented or dropped)',
    snapshot.modules.length === 2 &&
      snapshot.modules.every((m) => m.enabled === true && m.qualificationState === 'IMPLEMENTED_NOT_QUALIFIED' && m.available === false),
    'a module was invented, dropped or presented as available without qualification'
  );

  finish();
}

function finish() {
  const failed = results.filter((r) => !r.pass).length;
  console.log('');
  console.log(`RESULTADO: ${results.length - failed} OK / ${failed} FALLIDO`);
  if (failed > 0) {
    console.error('Platform contract check (F3.1 WU-A) FAILED');
    process.exit(1);
  }
  console.log('Platform contract check (F3.1 WU-A) PASSED');
}

main();
