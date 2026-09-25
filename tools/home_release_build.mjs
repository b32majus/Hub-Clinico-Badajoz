#!/usr/bin/env node
'use strict';
/**
 * Deterministic builder for the PROMueve Nexus synthetic Home release manifest
 * (F3.4 / ADR-007, issue #414).
 *
 * Composes ONE immutable release manifest out of artifacts that already exist
 * and are already validated: the packaged deployment manifest, the packaged
 * module readiness view, the module release map and the Home release code
 * files. It does not invent a second artifact hierarchy, and it never mutates
 * the sources it reads (previews/, templates/, snapshots and clinical code stay
 * untouched). Synthetic data only.
 *
 * Determinism / canonicalization (mandatory — byte-identical across runs and
 * machines):
 *  - The output is JSON with 2-space indentation, LF line endings and a
 *    trailing newline.
 *  - Every SHA-256 here is computed over EOL-canonicalized bytes (CRLF and lone
 *    CR normalized to LF) so a fresh checkout with CRLF working-tree files
 *    still yields the same hashes (NEXUS-DEBT-001). This applies to both code
 *    file hashes and config file hashes.
 *  - releaseSha256 = SHA-256 of the canonical JSON serialization of the release
 *    object with the `releaseId` and `releaseSha256` fields removed. The
 *    canonical JSON serialization is exactly
 *        JSON.stringify(objectWithoutThoseFields, null, 2) + "\n"
 *    i.e. 2-space indent, insertion order preserved (keys are NEVER sorted and
 *    whitespace is NEVER normalized), LF trailing newline, UTF-8. The builder
 *    fixes the insertion order of the release body to
 *    [homeReleaseVersion, site, modules, code, config, contracts, tooling,
 *    gates, rollback]; the checker recomputes by copying the parsed object
 *    while skipping releaseId/releaseSha256, which preserves that exact order.
 *  - releaseId = "nexus-home-<siteId>-<first 12 hex of releaseSha256>".
 *  - No timestamps, no process.version, no environment data anywhere. The
 *    tooling block is a set of static strings.
 *
 * Fail-closed: unreadable/unparseable inputs, schema-invalid inputs, non-"1"
 * version fields, a missing code file, a manifest module without a release-map
 * entry, or a release-map module outside the manifest abort with a non-zero
 * exit code and write no output. Every check runs before the output is written.
 *
 * Usage:
 *   node tools/home_release_build.mjs <manifest.json> <readiness.json> \
 *       <releases.json> <out-release-manifest.json> [codeRoot]
 *
 * codeRoot defaults to the repository root and is only used to locate the Home
 * release code files; it exists so the checker can point at a temporary tree to
 * plant code-drift negatives. The default behaviour is unchanged.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Ajv = require('ajv/dist/2020.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_DIR = path.join(ROOT, 'schemas', 'deployment');

// Frozen Home release code file list (ADR-007 immutable release unit). It is
// emitted sorted; fail closed if any file is missing under codeRoot.
const CODE_FILES = [
  'nexus_home.html',
  'nexus_home.css',
  'modules/platform/configuration-repository.js',
  'modules/platform/platform-context.js',
  'modules/home/home-bootstrap.js',
  'modules/home/home-renderer.js',
  'modules/home/home-page.js',
  'modules/home/home-schema-validators.generated.js',
];

const SCHEMA_FILES = {
  registry: 'module-registry.schema.json',
  profile: 'deployment-profile.schema.json',
  manifest: 'deployment-manifest.schema.json',
  readiness: 'module-readiness.schema.json',
};

function fail(message) {
  console.error(`home_release_build: FAIL ${message}`);
  process.exit(1);
}

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    fail(`cannot read/parse ${file}: ${err.message}`);
  }
}

// EOL-canonicalized file hash (NEXUS-DEBT-001): CRLF and lone CR become LF
// before hashing, so the same logical content hashes identically across
// LF/CRLF checkouts.
function sha256CanonicalFile(file) {
  const canonical = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256Json(value) {
  return crypto.createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

function schemaId(name) {
  return loadJson(path.join(SCHEMA_DIR, SCHEMA_FILES[name])).$id;
}

function ajvFormat(errors) {
  return (errors || []).map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ');
}

const [manifestFile, readinessFile, releasesFile, outFile, codeRootArg] = process.argv.slice(2);
if (!manifestFile || !readinessFile || !releasesFile || !outFile) {
  console.error(
    'usage: node tools/home_release_build.mjs <manifest.json> <readiness.json> <releases.json> <out-release-manifest.json> [codeRoot]'
  );
  process.exit(1);
}
const codeRoot = path.resolve(codeRootArg || ROOT);

const manifest = loadJson(manifestFile);
const readiness = loadJson(readinessFile);
const releases = loadJson(releasesFile);

// 1. Schema validation (fail-closed, before any output).
const ajv = new Ajv({ allErrors: true, strict: true });
const validateManifest = ajv.compile(loadJson(path.join(SCHEMA_DIR, SCHEMA_FILES.manifest)));
if (!validateManifest(manifest)) {
  fail(`deployment manifest schema: ${ajvFormat(validateManifest.errors)}`);
}
const validateReadiness = ajv.compile(loadJson(path.join(SCHEMA_DIR, SCHEMA_FILES.readiness)));
if (!validateReadiness(readiness)) {
  fail(`module readiness schema: ${ajvFormat(validateReadiness.errors)}`);
}

// 2. Version fields must be "1" (the manifest/readiness schemas already pin
//    them, the release map version is checked explicitly).
if (manifest.manifestVersion !== '1') fail(`unsupported manifestVersion: ${manifest.manifestVersion}`);
if (readiness.readinessVersion !== '1') fail(`unsupported readinessVersion: ${readiness.readinessVersion}`);
if (releases.releaseMapVersion !== '1') fail(`unsupported releaseMapVersion: ${releases.releaseMapVersion}`);

// 3. Release map semantic rules (mirrors the readiness builder: no guesses).
const releaseIds = releases.modules.map((m) => m.moduleId);
const releaseDuplicates = releaseIds.filter((id, i) => releaseIds.indexOf(id) !== i);
if (releaseDuplicates.length > 0) {
  fail(`duplicate moduleId in release map: ${[...new Set(releaseDuplicates)].join(', ')}`);
}
const manifestModuleIds = new Set(manifest.modules.map((m) => m.moduleId));
for (const rel of releases.modules) {
  if (!manifestModuleIds.has(rel.moduleId)) {
    fail(`release map module "${rel.moduleId}" is not part of the deployment manifest`);
  }
}

// 4. Modules: manifest order is authoritative. release/readiness come from the
//    release map; a missing entry is a hard failure, never a guessed value.
const releaseByModuleId = new Map(releases.modules.map((m) => [m.moduleId, m]));
const modules = manifest.modules.map((mod) => {
  const rel = releaseByModuleId.get(mod.moduleId);
  if (!rel) {
    fail(`module "${mod.moduleId}" has no release/readiness entry; the release manifest cannot be guessed`);
  }
  return {
    moduleId: mod.moduleId,
    label: mod.label,
    route: mod.entryPath,
    available: mod.available,
    qualificationState: mod.qualificationState,
    release: rel.release,
    readiness: rel.readiness,
  };
});

// 5. Home release code files: sorted list + per-file hashes; missing = fail.
const files = CODE_FILES.slice().sort();
const filesSha256 = {};
for (const file of files) {
  const abs = path.join(codeRoot, file);
  if (!fs.existsSync(abs)) fail(`required Home release code file is missing: ${file}`);
  filesSha256[file] = sha256CanonicalFile(abs);
}

const site = {
  deploymentId: manifest.deploymentId,
  siteId: manifest.siteId,
  display: manifest.display,
};

const config = {
  registrySha256: manifest.provenance.registrySha256,
  profileSha256: manifest.provenance.profileSha256,
  manifestSha256: sha256CanonicalFile(manifestFile),
  readinessSha256: sha256CanonicalFile(readinessFile),
};

const contracts = {
  registryVersion: manifest.provenance.registryVersion,
  profileVersion: manifest.provenance.profileVersion,
  manifestVersion: manifest.manifestVersion,
  readinessVersion: readiness.readinessVersion,
  schemaIds: {
    registry: schemaId('registry'),
    profile: schemaId('profile'),
    manifest: schemaId('manifest'),
    readiness: schemaId('readiness'),
  },
};

// Static tooling strings only: never process.version and never a timestamp, so
// the release stays byte-identical across runs and machines.
const tooling = {
  generator: 'tools/home_release_build.mjs v1',
  manifestGenerator: 'tools/deployment_manifest_build.mjs v1',
  readinessBuilder: 'tools/deployment_readiness_build.mjs v1',
  validatorsBuilder: 'tools/home_validators_build.mjs v1',
  pinnedRuntime: 'node 20 (.nvmrc)',
};

// Declarative required-gate evidence per ADR-007. Browser-on-artifact
// qualification is a later WU and is declared here, not executed.
const gates = {
  deterministic: ['npm run verify:nexus'],
  browser: {
    suite: 'tools/nexus_home_f33_browser_check.mjs',
    requirement: 'PASS on the release artifact',
  },
};

const rollback = {
  strategy:
    'remove the Home entrypoint (nexus_home.html) and its files; legacy entrypoints index.html and farmacia_index.html remain direct and functional',
  documentedIn: 'docs/engineering/NEXUS_HOME_F3.4.md',
};

// 6. Canonical body (fixed insertion order) -> releaseSha256 -> releaseId.
const body = {
  homeReleaseVersion: '1',
  site,
  modules,
  code: { files, filesSha256 },
  config,
  contracts,
  tooling,
  gates,
  rollback,
};
const releaseSha256 = sha256Json(body);
const releaseId = `nexus-home-${site.siteId}-${releaseSha256.slice(0, 12)}`;

const release = {
  homeReleaseVersion: body.homeReleaseVersion,
  releaseId,
  site: body.site,
  modules: body.modules,
  code: body.code,
  config: body.config,
  contracts: body.contracts,
  tooling: body.tooling,
  gates: body.gates,
  rollback: body.rollback,
  releaseSha256,
};

// 7. Write only after every check passed.
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, canonicalJson(release));
console.log(`home_release_build: wrote ${outFile} (${releaseId})`);
