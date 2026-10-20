#!/usr/bin/env node
// Witness NX-DEPLOY-PATH-02. Uses the real manifest builder, schemas and
// synthetic fixtures; no source changes, network, credentials or live data.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_FILES = [
  'tools/deployment_manifest_build.mjs',
  'schemas/deployment/module-registry.schema.json',
  'schemas/deployment/deployment-profile.schema.json',
  'schemas/deployment/deployment-manifest.schema.json',
  'tools/fixtures/deployment/valid/module-registry.json',
  'tools/fixtures/deployment/valid/deployment-profile.json',
  'tools/fixtures/deployment/invalid/profile-unknown-module.json',
];

function sandbox(t, leaf) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-deploy-path-witness-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const root = path.join(temp, leaf);
  fs.mkdirSync(root, { recursive: true });
  for (const rel of SOURCE_FILES) {
    const destination = path.join(root, rel);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(REPO, rel), destination);
  }
  // Metis installs npm packages OFFLINE in the clean candidate worktree.
  // Link only the installed deps; execute a real, otherwise independent copy
  // of the candidate builder from the problematic physical path.
  const installed = path.join(REPO, 'node_modules');
  assert.ok(fs.existsSync(path.join(installed, 'ajv', 'dist', '2020.js')),
    'offline npm ci must complete before the witness runs');
  fs.symlinkSync(installed, path.join(root, 'node_modules'), 'dir');
  return root;
}

function invoke(root, fixture = 'valid/deployment-profile.json') {
  const result = spawnSync(process.execPath, [
    path.join(root, 'tools', 'deployment_manifest_build.mjs'),
    path.join(root, 'tools', 'fixtures', 'deployment', 'valid', 'module-registry.json'),
    path.join(root, 'tools', 'fixtures', 'deployment', fixture),
  ], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, NODE_OPTIONS: '' },
  });
  assert.equal(result.error, undefined, 'builder subprocess must run');
  assert.equal(result.signal, null, 'builder subprocess must not time out');
  return result;
}

function expectValid(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const manifest = JSON.parse(result.stdout);
  assert.equal(manifest.deploymentId, 'bad-synthetic-demo-01');
  assert.deepEqual(manifest.modules.map((m) => m.moduleId).sort(), ['farmacia', 'reuma']);
  assert.equal(manifest.modules.length, 2);
  return manifest;
}

test('ordinary ASCII checkout keeps producing a valid manifest', (t) => {
  const root = sandbox(t, 'ordinary-checkout');
  const manifest = expectValid(invoke(root));
  assert.ok(manifest.provenance.registrySha256);
  assert.ok(manifest.provenance.profileSha256);
});

test('checkout directory containing spaces produces a valid manifest', (t) => {
  const root = sandbox(t, 'path with spaces');
  assert.ok(root.includes(' '), 'probe must exercise a path containing spaces');
  expectValid(invoke(root));
});

test('checkout directory containing non-ASCII characters produces a valid manifest', (t) => {
  const root = sandbox(t, 'carpeta con ñ y tilde');
  assert.ok(root.includes('ñ'), 'probe must exercise a Unicode path');
  expectValid(invoke(root));
});

test('invalid profile in a path with spaces fails for its semantic reason', (t) => {
  const root = sandbox(t, 'path with spaces');
  const result = invoke(root, 'invalid/profile-unknown-module.json');
  assert.equal(result.status, 1, 'invalid profile must be rejected');
  assert.match(result.stderr, /not registered in the module registry/,
    'must reject the invalid module, not fail with an encoded schema path ENOENT');
});

test('ordinary checkout preserves the invalid-profile fail-closed rule', (t) => {
  const root = sandbox(t, 'ordinary-checkout');
  const result = invoke(root, 'invalid/profile-unknown-module.json');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not registered in the module registry/);
});
