#!/usr/bin/env node
'use strict';
/**
 * Deterministic checker for the PROMueve Nexus module readiness & navigation
 * contract (F2.2).
 *
 * Verifies that the readiness builder:
 *  - reproduces the frozen golden readiness view byte-for-byte;
 *  - is deterministic across runs;
 *  - fails closed on unknown modules, missing release entries and planted
 *    patient/clinical payloads;
 *  - rejects planted invalid readiness views (schema + cross-reference rules
 *    + completeness against the deployment manifest).
 *
 * Exit codes: 0 = all cases PASS, 1 = at least one case FAIL.
 * Usage: node tools/deployment_readiness_check.mjs
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
const SCHEMA = path.join(ROOT, 'schemas', 'deployment', 'module-readiness.schema.json');

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function build(manifestFile, releasesFile, outFile) {
  try {
    execFileSync('node', [path.join(ROOT, 'tools', 'deployment_readiness_build.mjs'), manifestFile, releasesFile, outFile], {
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

function buildFails(manifestFile, releasesFile) {
  try {
    execFileSync('node', [path.join(ROOT, 'tools', 'deployment_readiness_build.mjs'), manifestFile, releasesFile], {
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

function schemaErrors(doc) {
  const ajv = new Ajv({ allErrors: true, strict: true });
  const validate = ajv.compile(loadJson(SCHEMA));
  if (validate(doc)) return [];
  return (validate.errors || []).map((e) => `${e.instancePath || '/'} ${e.message}`);
}

function viewSemanticErrors(view, manifest) {
  const errors = [];
  const manifestByModuleId = new Map(manifest.modules.map((m) => [m.moduleId, m]));
  for (const mod of view.modules) {
    const resolved = manifestByModuleId.get(mod.moduleId);
    if (!resolved) {
      errors.push(`readiness module "${mod.moduleId}" is not part of the resolved deployment manifest`);
      continue;
    }
    if (mod.available !== resolved.available) {
      errors.push(`module "${mod.moduleId}": available=${mod.available} contradicts the resolved deployment (available=${resolved.available}); a module not enabled/qualified can never be available`);
    }
    if (mod.route !== resolved.entryPath) {
      errors.push(`module "${mod.moduleId}": route "${mod.route}" does not match the manifest entryPath; no silent fallback is allowed`);
    }
    if (mod.qualificationState !== resolved.qualificationState) {
      errors.push(`module "${mod.moduleId}": qualificationState contradicts the resolved deployment manifest`);
    }
  }
  const viewIds = new Set(view.modules.map((m) => m.moduleId));
  for (const mod of manifest.modules) {
    if (!viewIds.has(mod.moduleId)) {
      errors.push(`readiness view is missing module "${mod.moduleId}" required by the deployment manifest`);
    }
  }
  return errors;
}

function main() {
  console.log('PROMueve Nexus module readiness & navigation check (F2.2)');
  const manifest = path.join(FIXTURE_DIR, 'valid', 'deployment-manifest.golden.json');
  const releases = path.join(FIXTURE_DIR, 'valid', 'module-releases.json');
  const golden = path.join(FIXTURE_DIR, 'valid', 'module-readiness.golden.json');
  const manifestDoc = loadJson(manifest);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-readiness-'));

  // 1. Golden reproduction + determinism.
  // The golden fixture is compared with normalized EOLs: Git checkouts apply
  // eol=crlf to .json files, while the builder always emits LF. Content drift
  // still fails; only the checkout line-ending artifact is tolerated. The
  // two-run determinism comparison below remains strictly byte-exact.
  const out1 = path.join(tmp, 'r1.json');
  const ok1 = build(manifest, releases, out1);
  const normalizeEol = (buf) => Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  const goldenBytes = fs.readFileSync(golden);
  const built1 = ok1 ? fs.readFileSync(out1) : Buffer.alloc(0);
  record(
    'built readiness view reproduces the golden fixture byte-for-byte',
    ok1 && normalizeEol(goldenBytes).equals(normalizeEol(built1)),
    ok1 ? 'built output differs from golden fixture' : 'builder exited non-zero on valid inputs'
  );
  const out2 = path.join(tmp, 'r2.json');
  build(manifest, releases, out2);
  record('two builds with identical inputs are byte-identical', built1.equals(fs.readFileSync(out2)), 'outputs differ');

  // 2. Builder fails closed.
  record(
    'builder rejects a release map module outside the resolved deployment',
    buildFails(manifest, path.join(FIXTURE_DIR, 'invalid', 'releases-unknown-module.json')),
    'builder accepted an unknown module'
  );
  record(
    'builder rejects a release map missing a deployed module',
    buildFails(manifest, path.join(FIXTURE_DIR, 'invalid', 'releases-missing-module.json')),
    'builder guessed readiness for a deployed module'
  );

  // 3. Planted invalid readiness views are rejected for the expected reason.
  const viewCases = [
    { file: 'readiness-patient-identifier.json', expect: 'must NOT have additional properties' },
    { file: 'readiness-empty-route.json', expect: 'must match pattern' },
    { file: 'readiness-unknown-module.json', expect: 'not part of the resolved deployment manifest' },
    { file: 'readiness-bad-qualification-state.json', expect: 'must be equal to one of the allowed values' },
    { file: 'readiness-available-not-qualified.json', expect: 'can never be available' },
    { file: 'readiness-missing-module.json', expect: 'missing module' },
  ];
  for (const c of viewCases) {
    const doc = loadJson(path.join(FIXTURE_DIR, 'invalid', c.file));
    let errors = schemaErrors(doc);
    if (errors.length === 0) errors = viewSemanticErrors(doc, manifestDoc);
    const matched = errors.some((e) => e.includes(c.expect));
    record(
      `invalid/${c.file}`,
      errors.length > 0 && matched,
      errors.length === 0 ? 'was accepted but must be rejected' : `rejected for an unexpected reason: ${errors.join(' | ')}`
    );
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  const failed = results.filter((r) => !r.pass).length;
  console.log('');
  console.log(`RESULTADO: ${results.length - failed} OK / ${failed} FALLIDO`);
  if (failed > 0) {
    console.error('Deployment readiness check FAILED');
    process.exit(1);
  }
  console.log('Deployment readiness check PASSED');
}

main();
