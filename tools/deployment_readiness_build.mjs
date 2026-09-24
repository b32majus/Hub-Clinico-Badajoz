#!/usr/bin/env node
'use strict';
/**
 * Deterministic builder for the PROMueve Nexus module readiness & navigation
 * view (F2.2). Derives the shell-facing technical view from a validated
 * deployment manifest (F2.1) plus the module release map.
 *
 * Fail-closed rules:
 *  - every readiness moduleId must exist in the manifest (no unknown modules);
 *  - available, qualificationState, label, route and platformCapabilities are
 *    copied from the resolved manifest; a module not enabled and qualified can
 *    never be presented as available;
 *  - route must equal the manifest entryPath (no silent fallback);
 *  - every module requires an explicit release/readiness entry; missing ones
 *    abort instead of being guessed;
 *  - readiness "demonstrated" only with a matching manifest availability
 *    invariant and an explicit release map entry.
 *
 * Usage: node tools/deployment_readiness_build.mjs <manifest.json> <releases.json> [out.json]
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Ajv = require('ajv/dist/2020.js');

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const SCHEMA = path.join(ROOT, 'schemas', 'deployment', 'module-readiness.schema.json');

function fail(message) {
  console.error(`deployment_readiness_build: FAIL ${message}`);
  process.exit(1);
}

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    fail(`cannot read/parse ${file}: ${err.message}`);
  }
}

const [manifestFile, releasesFile, outFile] = process.argv.slice(2);
if (!manifestFile || !releasesFile) {
  console.error('usage: node tools/deployment_readiness_build.mjs <manifest.json> <releases.json> [out.json]');
  process.exit(1);
}

const manifest = loadJson(manifestFile);
const releases = loadJson(releasesFile);

if (releases.releaseMapVersion !== '1') {
  fail(`unsupported releaseMapVersion: ${releases.releaseMapVersion}`);
}

// Release map semantic rules (fail-closed, no guessing).
const releaseIds = releases.modules.map((m) => m.moduleId);
const releaseDuplicates = releaseIds.filter((id, i) => releaseIds.indexOf(id) !== i);
if (releaseDuplicates.length > 0) {
  fail(`duplicate moduleId in release map: ${[...new Set(releaseDuplicates)].join(', ')}`);
}
const manifestModuleIds = new Set(manifest.modules.map((m) => m.moduleId));
for (const rel of releases.modules) {
  if (!manifestModuleIds.has(rel.moduleId)) {
    fail(`release map module "${rel.moduleId}" is not part of the resolved deployment manifest`);
  }
}

// Derived readiness view: manifest order is authoritative.
const releaseByModuleId = new Map(releases.modules.map((m) => [m.moduleId, m]));
const modules = manifest.modules.map((mod) => {
  const rel = releaseByModuleId.get(mod.moduleId);
  if (!rel) {
    fail(`module "${mod.moduleId}" has no release/readiness entry; readiness cannot be guessed`);
  }
  return {
    moduleId: mod.moduleId,
    label: mod.label,
    route: mod.entryPath,
    available: mod.available,
    qualificationState: mod.qualificationState,
    readiness: rel.readiness,
    platformCapabilities: mod.platformCapabilities,
    release: rel.release,
  };
});

const view = {
  readinessVersion: '1',
  deploymentId: manifest.deploymentId,
  siteId: manifest.siteId,
  modules,
};

// The generated view must satisfy its own contract before it leaves the builder.
const ajv = new Ajv({ allErrors: true, strict: true });
const validate = ajv.compile(loadJson(SCHEMA));
if (!validate(view)) {
  fail(`generated readiness view violates its own schema: ${(validate.errors || [])
    .map((e) => `${e.instancePath || '/'} ${e.message}`)
    .join('; ')}`);
}

const output = JSON.stringify(view, null, 2) + '\n';
if (outFile) {
  fs.writeFileSync(outFile, output);
  console.log(`deployment_readiness_build: wrote ${outFile}`);
} else {
  process.stdout.write(output);
}
