#!/usr/bin/env node
'use strict';
/**
 * Deterministic builder for the PROMueve Nexus deployment manifest (F2.1 WU-B).
 *
 * Reads a module registry and a deployment profile, validates both against the
 * v0 JSON Schemas plus the semantic coherence and cross-reference rules, and
 * emits the resolved composition as canonical JSON. The same inputs always
 * produce byte-identical output: no timestamps, no environment data, input
 * provenance recorded as SHA-256 of the EOL-canonicalized input files
 * (NEXUS-DEBT-001).
 *
 * Fail-closed: unknown properties, invalid combinations, unregistered modules
 * or missing qualification evidence abort with a non-zero exit code.
 *
 * Usage: node tools/deployment_manifest_build.mjs <registry.json> <profile.json> [out.json]
 *        (omitting out.json writes the manifest to stdout)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Ajv = require('ajv/dist/2020.js');

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const SCHEMA_DIR = path.join(ROOT, 'schemas', 'deployment');

const ENABLED_STATES = new Set(['IMPLEMENTED_NOT_QUALIFIED', 'QUALIFIED_FOR_SITE']);
const DISABLED_STATES = new Set(['NOT_IMPLEMENTED', 'DISABLED_BY_DEPLOYMENT']);

function fail(message) {
  console.error(`deployment_manifest_build: FAIL ${message}`);
  process.exit(1);
}

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    fail(`cannot read/parse ${file}: ${err.message}`);
  }
}

function sha256File(file) {
  // Provenance hashes are computed over EOL-canonicalized content (CRLF and
  // lone CR normalized to LF), so identical logical JSON yields identical
  // SHA-256 across LF/CRLF checkouts (NEXUS-DEBT-001).
  const canonical = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function compile(name) {
  const ajv = new Ajv({ allErrors: true, strict: true });
  return ajv.compile(loadJson(path.join(SCHEMA_DIR, name)));
}

function ajvFormat(errors) {
  return (errors || []).map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ');
}

const [registryFile, profileFile, outFile] = process.argv.slice(2);
if (!registryFile || !profileFile) {
  console.error('usage: node tools/deployment_manifest_build.mjs <registry.json> <profile.json> [out.json]');
  process.exit(1);
}

const registry = loadJson(registryFile);
const profile = loadJson(profileFile);

// 1. Schema validation (fail-closed).
const validateRegistry = compile('module-registry.schema.json');
const validateProfile = compile('deployment-profile.schema.json');
if (!validateRegistry(registry)) {
  fail(`registry schema: ${ajvFormat(validateRegistry.errors)}`);
}
if (!validateProfile(profile)) {
  fail(`profile schema: ${ajvFormat(validateProfile.errors)}`);
}

// 2. Registry semantic rules.
const registryIds = registry.modules.map((m) => m.moduleId);
const registryDuplicates = registryIds.filter((id, i) => registryIds.indexOf(id) !== i);
if (registryDuplicates.length > 0) {
  fail(`duplicate moduleId in registry: ${[...new Set(registryDuplicates)].join(', ')}`);
}

// 3. Profile semantic rules and cross-references.
const registered = new Set(registry.modules.map((m) => m.moduleId));
const profileIds = profile.modules.map((m) => m.moduleId);
const profileDuplicates = profileIds.filter((id, i) => profileIds.indexOf(id) !== i);
if (profileDuplicates.length > 0) {
  fail(`duplicate moduleId in profile: ${[...new Set(profileDuplicates)].join(', ')}`);
}
for (const mod of profile.modules) {
  if (!registered.has(mod.moduleId)) {
    fail(`module "${mod.moduleId}" is not registered in the module registry`);
  }
  if (mod.enabled === true && !ENABLED_STATES.has(mod.qualificationState)) {
    fail(`module "${mod.moduleId}": enabled=true is incoherent with qualificationState=${mod.qualificationState}`);
  }
  if (mod.enabled === false && !DISABLED_STATES.has(mod.qualificationState)) {
    fail(`module "${mod.moduleId}": enabled=false is incoherent with qualificationState=${mod.qualificationState}`);
  }
  if (
    mod.qualificationState === 'QUALIFIED_FOR_SITE' &&
    !(typeof mod.qualificationEvidence === 'string' && mod.qualificationEvidence.trim().length >= 4)
  ) {
    fail(`module "${mod.moduleId}": QUALIFIED_FOR_SITE requires explicit qualificationEvidence`);
  }
}

// 4. Resolved composition. Registry order is authoritative (#398 F3.1-D):
//    the manifest lists the profile-selected modules in registry order. The
//    profile only SELECTS which registered modules are deployed; profile
//    order is never display/navigation authority.
const registryByModuleId = new Map(registry.modules.map((m) => [m.moduleId, m]));
const profileByModuleId = new Map(profile.modules.map((m) => [m.moduleId, m]));
const modules = registry.modules
  .filter((entry) => profileByModuleId.has(entry.moduleId))
  .map((entry) => {
    const mod = profileByModuleId.get(entry.moduleId);
    return {
      moduleId: entry.moduleId,
      label: entry.label,
      entryPath: entry.entryPath,
      enabled: mod.enabled,
      qualificationState: mod.qualificationState,
      available: mod.enabled === true && mod.qualificationState === 'QUALIFIED_FOR_SITE',
      platformCapabilities: entry.platformCapabilities,
    };
  });

const manifest = {
  manifestVersion: '1',
  deploymentId: profile.deploymentId,
  siteId: profile.siteId,
  display: profile.display,
  persistenceMode: profile.persistenceMode,
  modules,
  provenance: {
    registryVersion: registry.registryVersion,
    profileVersion: profile.profileVersion,
    registrySha256: sha256File(registryFile),
    profileSha256: sha256File(profileFile),
    generator: 'tools/deployment_manifest_build.mjs v1',
  },
};

// 5. The generated manifest must satisfy its own contract before it leaves the builder.
const validateManifest = compile('deployment-manifest.schema.json');
if (!validateManifest(manifest)) {
  fail(`generated manifest violates its own schema: ${ajvFormat(validateManifest.errors)}`);
}

const output = JSON.stringify(manifest, null, 2) + '\n';
if (outFile) {
  fs.writeFileSync(outFile, output);
  console.log(`deployment_manifest_build: wrote ${outFile}`);
} else {
  process.stdout.write(output);
}
