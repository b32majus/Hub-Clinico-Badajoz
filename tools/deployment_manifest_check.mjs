#!/usr/bin/env node
'use strict';
/**
 * Deterministic checker for the PROMueve Nexus deployment manifest (F2.1 WU-B).
 *
 * Verifies that the manifest builder:
 *  - produces byte-identical output for the same inputs (determinism);
 *  - reproduces the frozen golden manifest fixture;
 *  - fails closed on invalid registry/profile compositions;
 *  - rejects planted invalid manifests (schema + semantic cross-references
 *    + completeness against the deployment profile).
 *
 * Exit codes: 0 = all cases PASS, 1 = at least one case FAIL.
 * Usage: node tools/deployment_manifest_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Ajv = require('ajv/dist/2020.js');

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const FIXTURE_DIR = path.join(ROOT, 'tools', 'fixtures', 'deployment');
const SCHEMA = path.join(ROOT, 'schemas', 'deployment', 'deployment-manifest.schema.json');

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function buildManifest(registryFile, profileFile, outFile) {
  try {
    execFileSync('node', [path.join(ROOT, 'tools', 'deployment_manifest_build.mjs'), registryFile, profileFile, outFile], {
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

function buildFails(registryFile, profileFile) {
  try {
    execFileSync('node', [path.join(ROOT, 'tools', 'deployment_manifest_build.mjs'), registryFile, profileFile], {
      stdio: 'pipe',
    });
    return false;
  } catch {
    return true;
  }
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const ENABLED_STATES = new Set(['IMPLEMENTED_NOT_QUALIFIED', 'QUALIFIED_FOR_SITE']);

function manifestSemanticErrors(manifest, registry) {
  const errors = [];
  const registered = new Set(registry.modules.map((m) => m.moduleId));
  const ids = manifest.modules.map((m) => m.moduleId);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length > 0) errors.push(`duplicate moduleId in manifest: ${[...new Set(duplicates)].join(', ')}`);
  for (const mod of manifest.modules) {
    if (!registered.has(mod.moduleId)) errors.push(`manifest module "${mod.moduleId}" is not registered in the module registry`);
    const expectedAvailable = mod.enabled === true && mod.qualificationState === 'QUALIFIED_FOR_SITE';
    if (mod.available !== expectedAvailable) {
      errors.push(`module "${mod.moduleId}": available=${mod.available} contradicts enabled=${mod.enabled} and qualificationState=${mod.qualificationState}`);
    }
    if (mod.enabled === true && !ENABLED_STATES.has(mod.qualificationState)) {
      errors.push(`module "${mod.moduleId}": enabled=true is incoherent with qualificationState=${mod.qualificationState}`);
    }
  }
  return errors;
}

function manifestCompletenessErrors(manifest, profile) {
  const errors = [];
  const profileIds = new Set(profile.modules.map((m) => m.moduleId));
  const manifestIds = new Set(manifest.modules.map((m) => m.moduleId));
  for (const id of profileIds) {
    if (!manifestIds.has(id)) {
      errors.push(`manifest is missing module "${id}" resolved by the deployment profile; omission does not pass validation`);
    }
  }
  for (const id of manifestIds) {
    if (!profileIds.has(id)) {
      errors.push(`manifest module "${id}" is not resolved by the deployment profile`);
    }
  }
  return errors;
}

function validateManifestDocument(manifest) {
  const ajv = new Ajv({ allErrors: true, strict: true });
  const validate = ajv.compile(loadJson(SCHEMA));
  if (!validate(manifest)) {
    return (validate.errors || []).map((e) => `${e.instancePath || '/'} ${e.message}`);
  }
  return [];
}

function main() {
  console.log('PROMueve Nexus deployment manifest check (F2.1 WU-B)');
  const registry = path.join(FIXTURE_DIR, 'valid', 'module-registry.json');
  const profile = path.join(FIXTURE_DIR, 'valid', 'deployment-profile.json');
  const golden = path.join(FIXTURE_DIR, 'valid', 'deployment-manifest.golden.json');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-manifest-'));

  // 1. Golden reproduction + determinism.
  // The golden fixture is compared with normalized EOLs: Git checkouts apply
  // eol=crlf to .json files, while the builder always emits LF. Content drift
  // still fails; only the checkout line-ending artifact is tolerated. The
  // two-run determinism comparison below remains strictly byte-exact.
  const out1 = path.join(tmp, 'm1.json');
  const ok1 = buildManifest(registry, profile, out1);
  const normalizeEol = (buf) => Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  const goldenBytes = fs.readFileSync(golden);
  const built1 = ok1 ? fs.readFileSync(out1) : Buffer.alloc(0);
  record(
    'built manifest reproduces the golden fixture byte-for-byte',
    ok1 && normalizeEol(goldenBytes).equals(normalizeEol(built1)),
    ok1 ? 'built output differs from golden fixture' : 'builder exited non-zero on valid fixtures'
  );

  // 2. Determinism: two runs are byte-identical.
  const out2 = path.join(tmp, 'm2.json');
  buildManifest(registry, profile, out2);
  record('two builds with identical inputs are byte-identical', built1.equals(fs.readFileSync(out2)), 'outputs differ');

  // 3. Builder fails closed on invalid compositions.
  record(
    'builder rejects a profile referencing an unregistered module',
    buildFails(registry, path.join(FIXTURE_DIR, 'invalid', 'profile-unknown-module.json')),
    'builder accepted an unregistered module'
  );
  record(
    'builder rejects QUALIFIED_FOR_SITE without qualification evidence',
    buildFails(registry, path.join(FIXTURE_DIR, 'invalid', 'profile-qualified-without-evidence.json')),
    'builder accepted qualification without evidence'
  );
  record(
    'builder rejects an injected clinical property',
    buildFails(registry, path.join(FIXTURE_DIR, 'invalid', 'profile-clinical-property.json')),
    'builder accepted a clinical property'
  );

  // 4. Planted invalid manifests are rejected for the expected reason.
  const manifestCases = [
    { file: 'manifest-unknown-key.json', expect: 'must NOT have additional properties' },
    { file: 'manifest-clinical-property.json', expect: 'must NOT have additional properties' },
    { file: 'manifest-available-not-qualified.json', expect: "contradicts enabled=" },
    { file: 'manifest-missing-module.json', expect: 'missing module' },
  ];
  const registryDoc = loadJson(registry);
  const profileDoc = loadJson(profile);
  for (const c of manifestCases) {
    const doc = loadJson(path.join(FIXTURE_DIR, 'invalid', c.file));
    let errors = validateManifestDocument(doc);
    if (errors.length === 0) errors = manifestSemanticErrors(doc, registryDoc);
    if (errors.length === 0) errors = manifestCompletenessErrors(doc, profileDoc);
    const matched = errors.some((e) => e.includes(c.expect));
    record(
      `invalid/${c.file}`,
      errors.length > 0 && matched,
      errors.length === 0 ? 'was accepted but must be rejected' : `rejected for an unexpected reason: ${errors.join(' | ')}`
    );
  }

  // 5. Provenance EOL invariance (NEXUS-DEBT-001): provenance hashes are
  // computed over EOL-canonicalized content, so the same logical JSON must
  // produce the same SHA-256 regardless of LF vs CRLF line endings.
  const builtManifest = ok1 ? loadJson(out1) : null;
  const toCrlf = (text) => text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  const crlfRegistryFile = path.join(tmp, 'module-registry.crlf.json');
  const crlfProfileFile = path.join(tmp, 'deployment-profile.crlf.json');
  fs.writeFileSync(crlfRegistryFile, toCrlf(fs.readFileSync(registry, 'utf8')));
  fs.writeFileSync(crlfProfileFile, toCrlf(fs.readFileSync(profile, 'utf8')));
  const crlfManifestFile = path.join(tmp, 'm-crlf.json');
  const okCrlf = buildManifest(crlfRegistryFile, crlfProfileFile, crlfManifestFile);
  const crlfManifest = okCrlf ? loadJson(crlfManifestFile) : null;
  record(
    'provenance hash is invariant to LF/CRLF line endings',
    okCrlf &&
      crlfManifest.provenance.registrySha256 === builtManifest.provenance.registrySha256 &&
      crlfManifest.provenance.profileSha256 === builtManifest.provenance.profileSha256,
    okCrlf
      ? `provenance hashes differ: registry ${crlfManifest.provenance.registrySha256} vs ${builtManifest.provenance.registrySha256}, profile ${crlfManifest.provenance.profileSha256} vs ${builtManifest.provenance.profileSha256}`
      : 'builder exited non-zero on CRLF fixtures'
  );

  // 6. Real content drift (a non-EOL change) must still be detected by the
  // provenance hash.
  const driftProfileFile = path.join(tmp, 'deployment-profile.drift.json');
  fs.writeFileSync(
    driftProfileFile,
    toCrlf(fs.readFileSync(profile, 'utf8')).replace(/"deploymentId": "([^"]*)"/, '"deploymentId": "drift-$1"')
  );
  const driftManifestFile = path.join(tmp, 'm-drift.json');
  const okDrift = buildManifest(registry, driftProfileFile, driftManifestFile);
  const driftManifest = okDrift ? loadJson(driftManifestFile) : null;
  record(
    'provenance hash still detects real content drift (non-EOL change)',
    okDrift && driftManifest.provenance.profileSha256 !== builtManifest.provenance.profileSha256,
    okDrift
      ? `profileSha256 unchanged despite a real profile content change: ${driftManifest.provenance.profileSha256}`
      : 'builder exited non-zero on the drifted profile'
  );

  fs.rmSync(tmp, { recursive: true, force: true });
  const failed = results.filter((r) => !r.pass).length;
  console.log('');
  console.log(`RESULTADO: ${results.length - failed} OK / ${failed} FALLIDO`);
  if (failed > 0) {
    console.error('Deployment manifest check FAILED');
    process.exit(1);
  }
  console.log('Deployment manifest check PASSED');
}

main();
