#!/usr/bin/env node
'use strict';
/**
 * Test harness for the PROMueve Nexus platform seam (F3.1 WU-A).
 *
 * Loads modules/platform/configuration-repository.js unmodified inside a
 * minimal Node `vm` sandbox (no browser DOM needed: the module only requires
 * a global root). Builds Ajv draft-2020 schema validators from
 * schemas/deployment/*.json and builds the packaged manifest + readiness
 * artifacts with the existing deterministic builders, exactly as
 * deployment_manifest_check.mjs does.
 *
 * Everything here is 100% synthetic deployment configuration; no clinical
 * data, patient identifiers or workbooks cross this seam (ADR-002).
 *
 * Usage:
 *   import { loadPlatformFixtures, loadConfiguration } from './platform_test_harness.mjs';
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Ajv = require('ajv/dist/2020.js');

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_FILE = path.join(ROOT, 'modules', 'platform', 'configuration-repository.js');
const SCHEMA_DIR = path.join(ROOT, 'schemas', 'deployment');
const FIXTURE_DIR = path.join(ROOT, 'tools', 'fixtures', 'deployment', 'valid');

const SCHEMA_FILES = {
  registry: 'module-registry.schema.json',
  profile: 'deployment-profile.schema.json',
  manifest: 'deployment-manifest.schema.json',
  readiness: 'module-readiness.schema.json',
};

/**
 * Loads the platform module into a minimal sandbox and returns the
 * PromuevePlatform namespace. The module is never copied or patched.
 */
export function loadPlatformModule() {
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(MODULE_FILE, 'utf8'), sandbox, {
    filename: 'modules/platform/configuration-repository.js',
  });
  return sandbox.PromuevePlatform;
}

/**
 * Builds the schemaValidators map: artifact name -> function(doc) returning
 * formatted error strings (empty array = valid).
 */
export function buildSchemaValidators() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  const validators = {};
  for (const [artifact, schemaFile] of Object.entries(SCHEMA_FILES)) {
    const schema = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, schemaFile), 'utf8'));
    const validate = ajv.compile(schema);
    validators[artifact] = (doc) => {
      if (validate(doc)) return [];
      return (validate.errors || []).map((e) => `${e.instancePath || '/'} ${e.message}`);
    };
  }
  return validators;
}

/**
 * Builds the packaged manifest + readiness artifacts from the valid fixtures
 * with the existing deterministic builders (temp dir, like
 * deployment_manifest_check.mjs), parses all four artifacts and returns the
 * ConfigurationRepository input shape.
 */
export function loadPlatformFixtures() {
  const registryFile = path.join(FIXTURE_DIR, 'module-registry.json');
  const profileFile = path.join(FIXTURE_DIR, 'deployment-profile.json');
  const releasesFile = path.join(FIXTURE_DIR, 'module-releases.json');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-platform-'));
  try {
    const manifestFile = path.join(tmp, 'deployment-manifest.json');
    const readinessFile = path.join(tmp, 'module-readiness.json');
    execFileSync('node', [path.join(ROOT, 'tools', 'deployment_manifest_build.mjs'), registryFile, profileFile, manifestFile], {
      stdio: 'pipe',
    });
    execFileSync('node', [path.join(ROOT, 'tools', 'deployment_readiness_build.mjs'), manifestFile, releasesFile, readinessFile], {
      stdio: 'pipe',
    });
    const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      registry: readJson(registryFile),
      profile: readJson(profileFile),
      manifest: readJson(manifestFile),
      readiness: readJson(readinessFile),
      schemaValidators: buildSchemaValidators(),
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Thin wrapper around ConfigurationRepository.load that never throws: it
 * returns the snapshot on success or the caught error (with its stable
 * `code`) on failure, so checkers can assert exact error codes.
 */
export function loadConfiguration(input) {
  const platform = loadPlatformModule();
  try {
    return { ok: true, snapshot: platform.ConfigurationRepository.load(input), error: null };
  } catch (error) {
    return { ok: false, snapshot: null, error };
  }
}
