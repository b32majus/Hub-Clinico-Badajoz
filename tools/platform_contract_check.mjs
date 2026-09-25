#!/usr/bin/env node
'use strict';
/**
 * Deterministic checker for the PROMueve Nexus ConfigurationRepository /
 * EffectiveDeployment contract (F3.1 WU-A) and the PlatformContext query
 * facade over that snapshot (F3.1 WU-B).
 *
 * Verifies that the platform seam:
 *  - loads the valid packaged deployment into a deep-frozen
 *    EffectiveDeployment snapshot (site/deployment fixed per artifact);
 *  - is immutable once built (snapshot and every nested object/array);
 *  - transports zero patient/dataset/clinical data (ADR-002);
 *  - fails closed with the exact stable error code on invalid configuration;
 *  - invents nothing: modules not enabled+qualified stay present but
 *    available=false; no module is dropped or invented (WU-A);
 *  - exposes the frozen snapshot only through read-only PlatformContext
 *    queries that fail closed on unknown/unavailable modules and on
 *    non-conforming snapshots (WU-B, ADR-002/ADR-003);
 *  - accepts only repository-issued EffectiveDeployment snapshots
 *    (F3.1-E trust boundary, NEXUS-DEBT-006): fabricated frozen lookalikes
 *    fail with SNAPSHOT_UNTRUSTED_ORIGIN, and mutating the SAME original
 *    load() input after load returns never alters the issued snapshot.
 *
 * All fixtures are 100% synthetic; Node-only deterministic verification (no
 * browser QA). Exit codes: 0 = all cases PASS, 1 = at least one case FAIL.
 * Usage: node tools/platform_contract_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
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

// Loads configuration-repository.js + platform-context.js unmodified into
// ONE minimal Node vm sandbox. Since F3.1-E the facade verifies snapshot
// origin against the repository's issuance registry, which lives on the
// shared PromuevePlatform namespace — exactly like the browser, where both
// classic scripts attach to the same window.PromuevePlatform. Snapshots
// issued by this sandbox's repository are the only ones the facade accepts.
const REPOSITORY_FILE = path.join(ROOT, 'modules', 'platform', 'configuration-repository.js');
const PLATFORM_CONTEXT_FILE = path.join(ROOT, 'modules', 'platform', 'platform-context.js');

function loadSharedPlatform() {
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(REPOSITORY_FILE, 'utf8'), sandbox, {
    filename: 'modules/platform/configuration-repository.js',
  });
  vm.runInContext(fs.readFileSync(PLATFORM_CONTEXT_FILE, 'utf8'), sandbox, {
    filename: 'modules/platform/platform-context.js',
  });
  return sandbox.PromuevePlatform;
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.keys(value).forEach((key) => deepFreeze(value[key]));
  }
  return value;
}

// Captures a thrown error without letting the checker itself fail: returns
// the error or null when the call succeeded.
function captureError(fn) {
  try {
    fn();
    return null;
  } catch (error) {
    return error;
  }
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

  // Shared namespace sandbox: the repository and the PlatformContext under
  // test live in the same PromuevePlatform namespace, so every snapshot
  // issued below is verifiable by the facade (F3.1-E trust boundary).
  // Repository-only error cases further down still use the per-call harness
  // loader; they never touch the facade.
  const sharedPlatform = loadSharedPlatform();
  function sharedLoadConfiguration(input) {
    try {
      return { ok: true, snapshot: sharedPlatform.ConfigurationRepository.load(input), error: null };
    } catch (error) {
      return { ok: false, snapshot: null, error };
    }
  }

  // 1. Valid packaged deployment loads into a frozen EffectiveDeployment.
  const load = sharedLoadConfiguration(fixtures);
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
  inputClone.schemaValidators = fixtures.schemaValidators;
  const isolationLoad = sharedLoadConfiguration(inputClone);
  const isolationBefore = isolationLoad.ok ? JSON.stringify(isolationLoad.snapshot) : null;
  // True input isolation proof (F3.1-E): mutate the SAME original input
  // objects that were passed to load(), AFTER load returned, and assert the
  // issued snapshot is byte-unchanged. The snapshot is a deep copy and
  // shares no mutable reference with the input.
  inputClone.registry.modules[0].label = 'Farmacia Hospitalaria MUTATED';
  inputClone.profile.modules[0].qualificationState = 'QUALIFIED_FOR_SITE';
  inputClone.profile.modules[0].qualificationEvidence = 'synthetic post-load evidence';
  inputClone.manifest.modules.push({ moduleId: 'ghost', label: 'Ghost', entryPath: 'ghost.html', enabled: false, qualificationState: 'NOT_IMPLEMENTED', available: false, platformCapabilities: [] });
  inputClone.manifest.display.siteName = 'Sitio mutado tras load';
  inputClone.profile.display.siteName = 'Sitio mutado tras load';
  inputClone.profile.deploymentId = 'mutated-deployment-id';
  record(
    'mutating the SAME original load() input after load never alters the issued snapshot',
    isolationLoad.ok &&
      isolationBefore !== null &&
      JSON.stringify(isolationLoad.snapshot) === isolationBefore &&
      isolationLoad.snapshot.deploymentId === 'bad-synthetic-demo-01' &&
      isolationLoad.snapshot.modules.length === 2 &&
      isolationLoad.snapshot.display.siteName === fixtures.profile.display.siteName,
    'the issued snapshot leaked mutable references to the load() input'
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

  // 6. PlatformContext facade (F3.1 WU-B): read-only queries over the
  // ALREADY-VALIDATED snapshot; unknown/unavailable ids fail closed.
  console.log('');
  console.log('PlatformContext facade (F3.1 WU-B)');
  const platform = sharedPlatform;
  const context = platform.PlatformContext.fromSnapshot(snapshot);

  record(
    'facade exposes expected deploymentId/siteId/persistenceMode/branding/provenance from the snapshot',
    context.getDeploymentId() === snapshot.deploymentId &&
      context.getSiteId() === snapshot.siteId &&
      context.getPersistenceMode() === snapshot.persistenceMode &&
      JSON.stringify(context.getBranding()) === JSON.stringify(snapshot.display) &&
      JSON.stringify(context.getProvenance()) === JSON.stringify(snapshot.provenance),
    'a facade query returned a value that does not match the snapshot'
  );

  const modulesFromFacade = context.getModules();
  record(
    'facade getModules lists all snapshot modules in order and getModule returns the exact descriptors',
    modulesFromFacade === snapshot.modules &&
      JSON.stringify(modulesFromFacade.map((m) => m.moduleId)) === JSON.stringify(['farmacia', 'reuma']) &&
      context.getModule('farmacia') === snapshot.modules[0] &&
      context.getModule('reuma') === snapshot.modules[1] &&
      context.getModule('farmacia').available === false &&
      context.getModule('reuma').available === false,
    'facade modules/descriptors diverge from the snapshot authority'
  );

  // Synthetic fixture has no available module; a navigable-module scenario
  // must be exercised through a REAL repository load: with the F3.1-E trust
  // boundary, fabricated snapshot literals are rejected
  // (SNAPSHOT_UNTRUSTED_ORIGIN), so this in-memory variant of the four
  // packaged artifacts (deep copies of the valid fixtures, with reuma
  // enabled + qualified and the manifest/readiness variants updated
  // coherently) goes through the real schema validators and uses the
  // ISSUED snapshot to assert the navigable view.
  const availableArtifacts = deepClone({ registry: fixtures.registry, profile: fixtures.profile, manifest: fixtures.manifest, readiness: fixtures.readiness });
  availableArtifacts.schemaValidators = fixtures.schemaValidators;
  const reumaProfile = availableArtifacts.profile.modules.find((m) => m.moduleId === 'reuma');
  reumaProfile.enabled = true;
  reumaProfile.qualificationState = 'QUALIFIED_FOR_SITE';
  reumaProfile.qualificationEvidence = 'synthetic qualification evidence for the contract check';
  const reumaManifest = availableArtifacts.manifest.modules.find((m) => m.moduleId === 'reuma');
  reumaManifest.enabled = true;
  reumaManifest.qualificationState = 'QUALIFIED_FOR_SITE';
  reumaManifest.available = true;
  const reumaReadiness = availableArtifacts.readiness.modules.find((m) => m.moduleId === 'reuma');
  reumaReadiness.available = true;
  reumaReadiness.qualificationState = 'QUALIFIED_FOR_SITE';
  const availableLoad = sharedLoadConfiguration(availableArtifacts);
  const availableContext = availableLoad.ok ? platform.PlatformContext.fromSnapshot(availableLoad.snapshot) : null;
  record(
    'facade getNavigableModules is empty with no available module and returns only available modules in order otherwise',
    context.getNavigableModules().length === 0 &&
      availableLoad.ok && availableContext !== null &&
      JSON.stringify(availableContext.getNavigableModules().map((m) => m.moduleId)) === JSON.stringify(['reuma']) &&
      availableContext.getModuleRoute('reuma') === 'index.html',
    'navigable list included unqualified/disabled modules or invented/dropped entries'
  );

  const unknownQueries = [
    ['getModule', () => context.getModule('ghost')],
    ['isModuleAvailable', () => context.isModuleAvailable('ghost')],
    ['getModuleRoute', () => context.getModuleRoute('ghost')],
    ['getModuleReadiness', () => context.getModuleReadiness('ghost')],
  ];
  const unknownFailures = unknownQueries
    .map(([name, fn]) => ({ name, error: captureError(fn) }))
    .filter((r) => !r.error || r.error.name !== 'PlatformContextError' || r.error.code !== 'MODULE_UNKNOWN');
  record(
    'MODULE_UNKNOWN: getModule/isModuleAvailable/getModuleRoute/getModuleReadiness with an unknown id all throw code MODULE_UNKNOWN',
    unknownFailures.length === 0,
    unknownFailures.length === 0 ? 'unexpected' : `non-conforming failures: ${unknownFailures.map((f) => f.name).join(', ')}`
  );

  const routeUnavailableError = captureError(() => context.getModuleRoute('farmacia'));
  record(
    'MODULE_NOT_AVAILABLE: getModuleRoute for a known but unavailable module throws MODULE_NOT_AVAILABLE while getModuleReadiness succeeds',
    routeUnavailableError && routeUnavailableError.name === 'PlatformContextError' && routeUnavailableError.code === 'MODULE_NOT_AVAILABLE' &&
      context.getModuleReadiness('farmacia') === snapshot.modules[0].readiness,
    routeUnavailableError ? `got ${routeUnavailableError.code}` : 'getModuleRoute was accepted but must fail closed'
  );

  const snapshotVersionTwo = deepFreeze({ ...deepClone(snapshot), snapshotVersion: '2' });
  const notFrozenSnapshot = deepClone(snapshot);
  const invalidInputs = [
    ['fromSnapshot(null)', null],
    ['fromSnapshot({})', {}],
    ['fromSnapshot with snapshotVersion "2"', snapshotVersionTwo],
    ['fromSnapshot with a non-frozen object', notFrozenSnapshot],
  ];
  const invalidFailures = invalidInputs
    .map(([name, input]) => ({ name, error: captureError(() => platform.PlatformContext.fromSnapshot(input)) }))
    .filter((r) => !r.error || r.error.name !== 'PlatformContextError' || r.error.code !== 'SNAPSHOT_INVALID');
  record(
    'SNAPSHOT_INVALID: null, empty object, snapshotVersion "2" and non-frozen snapshots all throw SNAPSHOT_INVALID',
    invalidFailures.length === 0,
    invalidFailures.length === 0 ? 'unexpected' : `non-conforming failures: ${invalidFailures.map((f) => f.name).join(', ')}`
  );

  // Facade immutability: frozen snapshot rejects writes; the frozen facade
  // rejects redefinition and carries no writable state-bearing property.
  let snapshotMutationBlocked = true;
  try { snapshot.deploymentId = 'mutated-deployment-id'; snapshotMutationBlocked = false; } catch { /* frozen */ }
  try { snapshot.modules.push({ moduleId: 'invented' }); snapshotMutationBlocked = false; } catch { /* frozen */ }
  let facadeRedefinitionBlocked = true;
  try { context.getDeploymentId = () => 'fake-deployment-id'; facadeRedefinitionBlocked = false; } catch { /* frozen facade */ }
  try { Object.defineProperty(context, 'getModule', { value: () => null }); facadeRedefinitionBlocked = false; } catch { /* frozen facade */ }
  const expectedQueryNames = [
    'getDeploymentId', 'getSiteId', 'getPersistenceMode', 'getBranding', 'getProvenance',
    'getModules', 'getModule', 'isModuleAvailable', 'getNavigableModules',
    'getModuleRoute', 'getModuleReadiness',
  ];
  const facadeDescriptors = expectedQueryNames.map((name) => Object.getOwnPropertyDescriptor(context, name));
  const facadePropertiesClean =
    JSON.stringify(Object.getOwnPropertyNames(context).sort()) === JSON.stringify([...expectedQueryNames].sort()) &&
    facadeDescriptors.every((d) => d && typeof d.value === 'function' && d.writable === false && d.configurable === false);
  record(
    'facade immutability: snapshot and facade mutations/redefinitions are rejected and the facade has only read-only query properties',
    snapshotMutationBlocked && facadeRedefinitionBlocked && facadePropertiesClean &&
      context.getDeploymentId() === snapshot.deploymentId &&
      context.getModules().length === 2 &&
      typeof context.getModule === 'function',
    'a mutation or redefinition attempt was accepted, or the facade carries writable state'
  );

  // Zero patient/dataset keys across every facade query output (ADR-002).
  const facadeOutputs = {
    deploymentId: context.getDeploymentId(),
    siteId: context.getSiteId(),
    persistenceMode: context.getPersistenceMode(),
    branding: context.getBranding(),
    provenance: context.getProvenance(),
    modules: context.getModules(),
    navigableModules: context.getNavigableModules(),
    routes: ['farmacia', 'reuma', 'ghost'].map((id) => {
      let outcome;
      try {
        outcome = context.getModuleRoute(id);
      } catch (error) {
        outcome = error.code;
      }
      return outcome;
    }),
    readiness: ['farmacia', 'reuma'].map((id) => context.getModuleReadiness(id)),
    availableIssued: {
      deploymentId: availableContext.getDeploymentId(),
      siteId: availableContext.getSiteId(),
      persistenceMode: availableContext.getPersistenceMode(),
      branding: availableContext.getBranding(),
      provenance: availableContext.getProvenance(),
      modules: availableContext.getModules(),
      navigableModules: availableContext.getNavigableModules(),
      routes: ['farmacia', 'reuma'].map((id) => {
        let outcome;
        try {
          outcome = availableContext.getModuleRoute(id);
        } catch (error) {
          outcome = error.code;
        }
        return outcome;
      }),
      readiness: ['farmacia', 'reuma'].map((id) => availableContext.getModuleReadiness(id)),
    },
  };
  const leakedInFacade = containsForbiddenKey(JSON.stringify(facadeOutputs));
  record(
    'facade query outputs carry zero patient/dataset keys',
    leakedInFacade.length === 0,
    leakedInFacade.length === 0 ? 'unexpected' : `forbidden keys found: ${leakedInFacade.join(', ')}`
  );

  // 6b. Snapshot trust boundary (#398 F3.1-E, NEXUS-DEBT-006):
  // PlatformContext.fromSnapshot consumes ONLY EffectiveDeployment snapshots
  // issued by ConfigurationRepository.load in the same namespace.
  console.log('');
  console.log('Snapshot trust boundary (F3.1-E, NEXUS-DEBT-006)');

  // (a) A deep-frozen structurally-identical lookalike of a real issued
  // snapshot satisfies the shape check but was never issued: rejected.
  const lookalike = deepFreeze(deepClone(snapshot));
  const lookalikeError = captureError(() => platform.PlatformContext.fromSnapshot(lookalike));
  record(
    'SNAPSHOT_UNTRUSTED_ORIGIN: a deep-frozen structurally-identical lookalike of a real issued snapshot is rejected',
    lookalikeError !== null && lookalikeError.name === 'PlatformContextError' && lookalikeError.code === 'SNAPSHOT_UNTRUSTED_ORIGIN',
    lookalikeError ? `got ${lookalikeError.code}` : 'the lookalike was accepted but must fail closed'
  );

  // (b) A well-formed frozen object that satisfies the shape but was never
  // issued by the repository: rejected.
  const fabricated = deepFreeze({
    snapshotVersion: '1',
    deploymentId: 'fabricated-synthetic-01',
    siteId: 'BAD',
    display: { productName: 'Fabricated Hub', siteName: 'BAD synthetic' },
    persistenceMode: 'session-only',
    provenance: { generator: 'platform_contract_check', generatedAt: '2026-01-01T00:00:00Z' },
    modules: [
      { moduleId: 'farmacia', label: 'Farmacia Hospitalaria', route: 'farmacia_index.html', enabled: true, qualificationState: 'QUALIFIED_FOR_SITE', available: true, platformCapabilities: [], readiness: 'demonstrated', release: '0.6.0' },
    ],
  });
  const fabricatedError = captureError(() => platform.PlatformContext.fromSnapshot(fabricated));
  record(
    'SNAPSHOT_UNTRUSTED_ORIGIN: a well-formed frozen snapshot-shaped object never issued by the repository is rejected',
    fabricatedError !== null && fabricatedError.name === 'PlatformContextError' && fabricatedError.code === 'SNAPSHOT_UNTRUSTED_ORIGIN',
    fabricatedError ? `got ${fabricatedError.code}` : 'the fabricated snapshot was accepted but must fail closed'
  );

  // (c) A genuinely malformed object: the shape check fails FIRST, so the
  // code is SNAPSHOT_INVALID, never the origin code (check order contract).
  const malformed = deepFreeze({ snapshotVersion: '1', deploymentId: 'malformed-synthetic' });
  const malformedError = captureError(() => platform.PlatformContext.fromSnapshot(malformed));
  record(
    'check order: a genuinely malformed frozen object fails with SNAPSHOT_INVALID (shape before origin)',
    malformedError !== null && malformedError.name === 'PlatformContextError' && malformedError.code === 'SNAPSHOT_INVALID',
    malformedError ? `got ${malformedError.code}` : 'the malformed object was accepted but must fail closed'
  );

  // (d) The real issued snapshot still loads a working facade.
  let issuedFacadeWorks = true;
  try {
    const issuedContext = platform.PlatformContext.fromSnapshot(snapshot);
    issuedFacadeWorks =
      issuedContext.getDeploymentId() === snapshot.deploymentId &&
      issuedContext.getSiteId() === snapshot.siteId &&
      issuedContext.getPersistenceMode() === snapshot.persistenceMode &&
      issuedContext.getModules() === snapshot.modules &&
      issuedContext.getNavigableModules().length === 0;
  } catch (error) {
    issuedFacadeWorks = false;
  }
  record(
    'the real issued snapshot still loads a working facade',
    issuedFacadeWorks,
    'the repository-issued snapshot was rejected by the facade'
  );

  // (e) The issuance registry is internal and non-enumerable: it does not
  // leak through Object.keys(PromuevePlatform).
  const internalRegistryKey = '__issuedEffectiveDeployments';
  const namespaceKeys = Object.keys(platform);
  const internalDescriptor = Object.getOwnPropertyDescriptor(platform, internalRegistryKey);
  const expectedNamespaceKeys = ['ConfigurationRepository', 'PlatformConfigurationError', 'PlatformContext', 'PlatformContextError'].sort();
  record(
    'the issuance registry does not leak: PromuevePlatform enumerable keys are unchanged and the WeakSet is non-enumerable',
    !namespaceKeys.includes(internalRegistryKey) &&
      JSON.stringify([...namespaceKeys].sort()) === JSON.stringify(expectedNamespaceKeys) &&
      internalDescriptor !== undefined &&
      internalDescriptor.enumerable === false &&
      // Realm-independent WeakSet tag check: the registry is created inside
      // the sandbox realm, so `instanceof WeakSet` from the Node outer realm
      // would be a false negative for a correct implementation.
      Object.prototype.toString.call(internalDescriptor.value) === '[object WeakSet]',
    'the internal issuance registry leaked onto the enumerable namespace surface'
  );

  // 7. Cross-artifact authority hardening (#398-C): the manifest transports
  // availability but never decides it. Planted in-memory mutations of the
  // valid packaged artifacts must fail closed with the exact stable code.
  console.log('');
  console.log('Cross-artifact authority hardening (#398-C)');
  const hardeningCases = [
    {
      name: 'manifest enabled-only elevation vs the profile -> MANIFEST_PROFILE_ENABLED_MISMATCH',
      mutate: (input) => {
        input.profile.modules[0].enabled = false;
        input.profile.modules[0].qualificationState = 'NOT_IMPLEMENTED';
      },
      expect: 'MANIFEST_PROFILE_ENABLED_MISMATCH',
    },
    {
      name: 'manifest qualificationState-only elevation vs the profile -> MANIFEST_PROFILE_QUALIFICATION_MISMATCH',
      mutate: (input) => {
        input.manifest.modules[0].qualificationState = 'QUALIFIED_FOR_SITE';
        input.manifest.modules[0].available = true;
      },
      expect: 'MANIFEST_PROFILE_QUALIFICATION_MISMATCH',
    },
    {
      name: 'manifest deploymentId mismatch vs the profile -> MANIFEST_PROFILE_DEPLOYMENT_ID_MISMATCH',
      mutate: (input) => { input.manifest.deploymentId = 'cac-synthetic-demo-02'; },
      expect: 'MANIFEST_PROFILE_DEPLOYMENT_ID_MISMATCH',
    },
    {
      name: 'manifest siteId mismatch vs the profile -> MANIFEST_PROFILE_SITE_ID_MISMATCH',
      mutate: (input) => { input.manifest.siteId = 'CAC'; },
      expect: 'MANIFEST_PROFILE_SITE_ID_MISMATCH',
    },
    {
      name: 'manifest persistenceMode mismatch vs the profile -> MANIFEST_PROFILE_PERSISTENCE_MODE_MISMATCH',
      mutate: (input) => { input.manifest.persistenceMode = 'none'; },
      expect: 'MANIFEST_PROFILE_PERSISTENCE_MODE_MISMATCH',
    },
    {
      name: 'readiness deploymentId mismatch vs the manifest -> READINESS_DEPLOYMENT_ID_MISMATCH',
      mutate: (input) => { input.readiness.deploymentId = 'cac-synthetic-demo-02'; },
      expect: 'READINESS_DEPLOYMENT_ID_MISMATCH',
    },
    {
      name: 'readiness siteId mismatch vs the manifest -> READINESS_SITE_ID_MISMATCH',
      mutate: (input) => { input.readiness.siteId = 'CAC'; },
      expect: 'READINESS_SITE_ID_MISMATCH',
    },
    {
      name: 'manifest label tampered vs the registry -> MANIFEST_REGISTRY_LABEL_MISMATCH',
      mutate: (input) => { input.manifest.modules[0].label = 'Farmacia Tampered'; },
      expect: 'MANIFEST_REGISTRY_LABEL_MISMATCH',
    },
    {
      name: 'manifest entryPath tampered vs the registry -> MANIFEST_REGISTRY_ENTRY_PATH_MISMATCH',
      mutate: (input) => { input.manifest.modules[0].entryPath = 'tampered.html'; },
      expect: 'MANIFEST_REGISTRY_ENTRY_PATH_MISMATCH',
    },
    {
      name: 'manifest platformCapabilities tampered vs the registry -> MANIFEST_REGISTRY_CAPABILITIES_MISMATCH',
      mutate: (input) => { input.manifest.modules[0].platformCapabilities = ['static-delivery']; },
      expect: 'MANIFEST_REGISTRY_CAPABILITIES_MISMATCH',
    },
    {
      name: 'manifest moduleId absent from the registry -> MANIFEST_REGISTRY_MODULE_UNKNOWN',
      mutate: (input) => {
        input.registry.modules.splice(1, 1);
        input.profile.modules.splice(1, 1);
      },
      expect: 'MANIFEST_REGISTRY_MODULE_UNKNOWN',
    },
  ];
  for (const c of hardeningCases) {
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

  const hardeningLoad = loadConfiguration(fixtures);
  record(
    '#398-C: the valid packaged deployment still loads after the cross-artifact hardening',
    hardeningLoad.ok,
    hardeningLoad.ok ? 'unexpected' : `${hardeningLoad.error.code}: ${hardeningLoad.error.message}`
  );
  const profileDerivedAvailability = fixtures.profile.modules.map((m) => m.enabled === true && m.qualificationState === 'QUALIFIED_FOR_SITE');
  record(
    '#398-C no-elevation invariant: snapshot availability equals the profile-derived value (false/false), never a manifest-only elevation',
    hardeningLoad.ok &&
      JSON.stringify(hardeningLoad.snapshot.modules.map((m) => m.available)) === JSON.stringify(profileDerivedAvailability) &&
      JSON.stringify(profileDerivedAvailability) === JSON.stringify([false, false]) &&
      hardeningLoad.snapshot.modules.every((m) => m.qualificationState === 'IMPLEMENTED_NOT_QUALIFIED'),
    `snapshot=[${hardeningLoad.ok ? hardeningLoad.snapshot.modules.map((m) => m.available) : 'n/a'}] profile-derived=[${profileDerivedAvailability}]`
  );

  // 8. F3.1-D invariant closure (#398): display/order/route authority sits
  // with the profile and registry, the load input is closed, duplicates are
  // rejected before per-module resolution, lookups are prototype-safe and
  // capability equality is set semantics. Planted in-memory mutations must
  // fail closed with the exact stable code.
  console.log('');
  console.log('F3.1-D invariant closure');

  function plantF31D() {
    // Reattach the live validator functions: JSON deep-clone would drop them.
    const planted = deepClone({ registry: fixtures.registry, profile: fixtures.profile, manifest: fixtures.manifest, readiness: fixtures.readiness });
    planted.schemaValidators = fixtures.schemaValidators;
    return planted;
  }

  const f31dCases = [
    {
      name: 'manifest display siteName tampered vs the profile -> MANIFEST_PROFILE_DISPLAY_MISMATCH',
      mutate: (input) => { input.manifest.display.siteName = 'Sitio manipulado'; },
      expect: 'MANIFEST_PROFILE_DISPLAY_MISMATCH',
    },
    {
      name: 'duplicate profile moduleId -> PROFILE_DUPLICATE_MODULE',
      mutate: (input) => { input.profile.modules.push(deepClone(input.profile.modules[0])); },
      expect: 'PROFILE_DUPLICATE_MODULE',
    },
    {
      name: 'duplicate readiness moduleId with conflicting readiness value -> READINESS_DUPLICATE_MODULE',
      mutate: (input) => {
        const duplicate = deepClone(input.readiness.modules[0]);
        duplicate.readiness = 'code';
        input.readiness.modules.push(duplicate);
      },
      expect: 'READINESS_DUPLICATE_MODULE',
    },
    {
      name: 'readiness label tampered vs the manifest/registry -> READINESS_LABEL_MISMATCH',
      mutate: (input) => { input.readiness.modules[0].label = 'Farmacia manipulada'; },
      expect: 'READINESS_LABEL_MISMATCH',
    },
    {
      name: 'readiness platformCapabilities content tampered -> READINESS_CAPABILITIES_MISMATCH',
      mutate: (input) => { input.readiness.modules[0].platformCapabilities = ['static-delivery']; },
      expect: 'READINESS_CAPABILITIES_MISMATCH',
    },
    {
      name: 'two registry modules sharing entryPath -> REGISTRY_DUPLICATE_ENTRY_PATH',
      mutate: (input) => { input.registry.modules[1].entryPath = input.registry.modules[0].entryPath; },
      expect: 'REGISTRY_DUPLICATE_ENTRY_PATH',
    },
    {
      name: 'manifest modules reordered vs the canonical registry order -> MANIFEST_MODULE_ORDER_MISMATCH',
      mutate: (input) => {
        const first = input.manifest.modules[0];
        input.manifest.modules[0] = input.manifest.modules[1];
        input.manifest.modules[1] = first;
      },
      expect: 'MANIFEST_MODULE_ORDER_MISMATCH',
    },
    {
      name: 'extra top-level load input key -> CONFIG_INPUT_UNKNOWN_KEY',
      mutate: (input) => { input.deploymentNote = { note: 'unknown extra key' }; },
      expect: 'CONFIG_INPUT_UNKNOWN_KEY',
    },
    {
      name: "profile module with inherited-key id 'constructor' while the registry lacks it -> PROFILE_UNKNOWN_MODULE",
      mutate: (input) => { input.profile.modules[0].moduleId = 'constructor'; },
      expect: 'PROFILE_UNKNOWN_MODULE',
    },
  ];
  for (const c of f31dCases) {
    const planted = plantF31D();
    c.mutate(planted);
    const failed = loadConfiguration(planted);
    record(
      c.name,
      !failed.ok && failed.error && failed.error.code === c.expect,
      failed.ok ? 'was accepted but must fail closed' : `got code=${failed.error ? failed.error.code : 'unknown'}`
    );
  }

  // Route safety at the registry authority. The repo JSON schemas already
  // reject most unsafe paths at schema-validation time; the repository must
  // enforce route safety itself (defense in depth), so these cases plant
  // permissive validators to reach the registry semantics check.
  const permissiveValidators = { registry: () => [], profile: () => [], manifest: () => [], readiness: () => [] };
  const unsafeEntryPaths = ['/abs.html', 'http://x/y.html', 'a.html?q=1', 'a.html#f', 'a/../b.html', '.', '..', ''];
  for (const unsafe of unsafeEntryPaths) {
    const planted = plantF31D();
    planted.schemaValidators = permissiveValidators;
    planted.registry.modules[0].entryPath = unsafe;
    const failed = loadConfiguration(planted);
    record(
      `unsafe registry entryPath ${JSON.stringify(unsafe)} -> REGISTRY_UNSAFE_ENTRY_PATH`,
      !failed.ok && failed.error && failed.error.code === 'REGISTRY_UNSAFE_ENTRY_PATH',
      failed.ok ? 'was accepted but must fail closed' : `got code=${failed.error ? failed.error.code : 'unknown'}`
    );
  }

  // D21 positive control: a legitimately named 'constructor' module cannot
  // rely on (nor be satisfied by) inherited prototype keys; it loads fine
  // when explicitly present in all four artifacts.
  const constructorInput = plantF31D();
  constructorInput.registry.modules.push({ moduleId: 'constructor', label: 'Constructor Control', entryPath: 'constructor.html', platformCapabilities: [] });
  constructorInput.profile.modules.push({ moduleId: 'constructor', enabled: false, qualificationState: 'NOT_IMPLEMENTED' });
  constructorInput.manifest.modules.push({ moduleId: 'constructor', label: 'Constructor Control', entryPath: 'constructor.html', enabled: false, qualificationState: 'NOT_IMPLEMENTED', available: false, platformCapabilities: [] });
  constructorInput.readiness.modules.push({ moduleId: 'constructor', label: 'Constructor Control', route: 'constructor.html', available: false, qualificationState: 'NOT_IMPLEMENTED', readiness: 'code', platformCapabilities: [], release: '0.6.0' });
  const constructorLoad = loadConfiguration(constructorInput);
  record(
    "registry/profile/manifest/readiness legitimately containing moduleId 'constructor' load fine (prototype keys never satisfy lookups)",
    constructorLoad.ok,
    constructorLoad.ok ? 'unexpected' : `${constructorLoad.error.code}: ${constructorLoad.error.message}`
  );

  // D14 set semantics positive control: capability ARRAY ORDER is not
  // authority; only content is. Reordering the manifest capabilities (with
  // the readiness view still in the original order) must still load.
  const reorderedCapsInput = plantF31D();
  reorderedCapsInput.manifest.modules[0].platformCapabilities = [...reorderedCapsInput.manifest.modules[0].platformCapabilities].reverse();
  const reorderedCapsLoad = loadConfiguration(reorderedCapsInput);
  record(
    'manifest platformCapabilities reordered (same content) still load (set semantics, order never authority)',
    reorderedCapsLoad.ok,
    reorderedCapsLoad.ok ? 'unexpected' : `${reorderedCapsLoad.error.code}: ${reorderedCapsLoad.error.message}`
  );

  // Snapshot authority controls: display comes from the PROFILE, module order
  // from the registry, readiness/release carried through unchanged.
  const authorityLoad = loadConfiguration(fixtures);
  record(
    'snapshot display equals profile.display, modules follow registry order, readiness/release carried through unchanged',
    authorityLoad.ok &&
      JSON.stringify(authorityLoad.snapshot.display) === JSON.stringify(fixtures.profile.display) &&
      JSON.stringify(authorityLoad.snapshot.modules.map((m) => m.moduleId)) ===
        JSON.stringify(fixtures.registry.modules.map((m) => m.moduleId)) &&
      JSON.stringify(authorityLoad.snapshot.modules.map((m) => [m.readiness, m.release])) ===
        JSON.stringify(fixtures.readiness.modules.map((m) => [m.readiness, m.release])),
    authorityLoad.ok ? 'snapshot diverges from the profile/registry/readiness authority' : `${authorityLoad.error.code}: ${authorityLoad.error.message}`
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
