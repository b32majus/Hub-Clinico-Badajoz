#!/usr/bin/env node
'use strict';
/**
 * Deterministic checker for the PROMueve Nexus synthetic Home release manifest
 * (F3.4 / ADR-007, issue #414).
 *
 * The builder composes a release manifest from the packaged deployment
 * manifest, the packaged module readiness view and the module release map, and
 * freezes the Home release code files by SHA-256. This checker verifies that:
 *  - the builder is reproducible (two builds are byte-identical);
 *  - the release carries every ADR-007 field and stays self-consistent
 *    (releaseId <-> releaseSha256, config/code coverage, contract/schema
 *    versions, static tooling, gates/evidence, rollback reference);
 *  - every declared code file and config artifact re-hashes cleanly against the
 *    working tree (drift detection);
 *  - planted negatives fail closed: code drift, schema-invalid manifest, a
 *    schema-valid tampered manifest, a release map missing a deployed module,
 *    and a tampered/unknown tooling field;
 *  - the Home sources and the release manifest transport zero patient/clinical
 *    tokens (same source-level guarantee as tools/nexus_home_check.mjs CASO 9).
 *
 * Node-only deterministic verification (no browser QA; browser-on-artifact
 * qualification is F3.4 WU Q5b and is explicitly NOT executed here). Exit
 * codes: 0 = all cases PASS, 1 = at least one case FAIL.
 * Usage: node tools/home_release_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILDER = path.join(ROOT, 'tools', 'home_release_build.mjs');
const MANIFEST_INPUT = path.join(ROOT, 'data/platform/home/deployment-manifest.json');
const READINESS_INPUT = path.join(ROOT, 'data/platform/home/module-readiness.json');
const RELEASES_INPUT = path.join(ROOT, 'tools/fixtures/home/module-releases.json');
const INVALID_MANIFEST = path.join(ROOT, 'tools/fixtures/deployment', 'invalid', 'manifest-unknown-key.json');
const SCHEMA_DIR = path.join(ROOT, 'schemas', 'deployment');

const SCHEMA_FILES = {
  registry: 'module-registry.schema.json',
  profile: 'deployment-profile.schema.json',
  manifest: 'deployment-manifest.schema.json',
  readiness: 'module-readiness.schema.json',
};

// Must stay in sync with tools/home_release_build.mjs.
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

// Token scope mirrors tools/nexus_home_check.mjs CASO 9: the guarantee is
// asserted over the Home-owned sources plus the release manifest. The two
// platform seam files are integrity-hashed above but are not part of that
// oracle scope, because they intentionally carry the ADR-002 "no patient"
// negation statement in a boundary comment.
const HOME_TOKEN_SOURCES = [
  'nexus_home.html',
  'nexus_home.css',
  'modules/home/home-bootstrap.js',
  'modules/home/home-renderer.js',
  'modules/home/home-page.js',
  'modules/home/home-schema-validators.generated.js',
];

const CLINICAL_TOKEN_RE = /\bCIP\b|\bNHC\b|paciente|patient|workbook|cohorte|cohort\b|historia_cl|datos_clinicos|tratamiento|treatment/i;

const EXPECTED_TOOLING = {
  generator: 'tools/home_release_build.mjs v1',
  manifestGenerator: 'tools/deployment_manifest_build.mjs v1',
  readinessBuilder: 'tools/deployment_readiness_build.mjs v1',
  validatorsBuilder: 'tools/home_validators_build.mjs v1',
  pinnedRuntime: 'node 20 (.nvmrc)',
};

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

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

function isHex64(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function runBuilder(args) {
  try {
    const stdout = execFileSync('node', [BUILDER, ...args], { stdio: 'pipe' });
    return { ok: true, output: stdout.toString('utf8') };
  } catch (err) {
    const out = `${err.stdout ? err.stdout.toString('utf8') : ''}${err.stderr ? err.stderr.toString('utf8') : ''}`;
    return { ok: false, output: out };
  }
}

// Structural validation of the ADR-007 release shape. Returns [] when the
// release carries every required field, covers the deployed modules and stays
// self-consistent; otherwise returns one message per violation.
function structuralErrors(release, manifestDoc) {
  const errors = [];
  const check = (cond, msg) => {
    if (!cond) errors.push(msg);
  };
  if (!release || typeof release !== 'object' || Array.isArray(release)) {
    return ['release must be an object'];
  }

  check(release.homeReleaseVersion === '1', 'homeReleaseVersion must be "1"');

  // releaseId <-> releaseSha256 consistency (recompute over the object minus
  // releaseId/releaseSha256; copying keys preserves the canonical order).
  check(isHex64(release.releaseSha256), 'releaseSha256 must be a 64-hex sha256');
  const body = {};
  for (const key of Object.keys(release)) {
    if (key === 'releaseId' || key === 'releaseSha256') continue;
    body[key] = release[key];
  }
  const recomputed = sha256Json(body);
  check(release.releaseSha256 === recomputed, `releaseSha256 mismatch: declared ${release.releaseSha256} recomputed ${recomputed}`);

  const site = release.site && typeof release.site === 'object' ? release.site : {};
  const display = site.display && typeof site.display === 'object' ? site.display : {};
  check(typeof site.deploymentId === 'string' && site.deploymentId.length > 0, 'site.deploymentId must be non-empty');
  check(typeof site.siteId === 'string' && site.siteId.length > 0, 'site.siteId must be non-empty');
  check(typeof display.productName === 'string' && display.productName.length > 0, 'site.display.productName must be non-empty');
  check(typeof display.siteName === 'string' && display.siteName.length > 0, 'site.display.siteName must be non-empty');

  check(typeof release.releaseId === 'string' && release.releaseId.length > 0, 'releaseId must be a non-empty string');
  check(
    release.releaseId === `nexus-home-${site.siteId}-${String(release.releaseSha256).slice(0, 12)}`,
    `releaseId is inconsistent with siteId/releaseSha256: ${release.releaseId}`
  );

  // Modules: one per manifest module, route === entryPath, release/readiness present.
  const manifestById = new Map((manifestDoc.modules || []).map((m) => [m.moduleId, m]));
  check(
    Array.isArray(release.modules) && release.modules.length === (manifestDoc.modules || []).length,
    'modules must cover every module of the deployment manifest'
  );
  for (const mod of release.modules || []) {
    const src = manifestById.get(mod.moduleId);
    check(Boolean(src), `module "${mod.moduleId}" is not part of the deployment manifest`);
    if (src) {
      check(mod.route === src.entryPath, `module "${mod.moduleId}": route "${mod.route}" must equal entryPath "${src.entryPath}"`);
      check(mod.label === src.label, `module "${mod.moduleId}": label must be copied from the manifest`);
      check(mod.available === src.available, `module "${mod.moduleId}": available must be copied from the manifest`);
      check(mod.qualificationState === src.qualificationState, `module "${mod.moduleId}": qualificationState must be copied from the manifest`);
    }
    check(typeof mod.release === 'string' && mod.release.length > 0, `module "${mod.moduleId}": release must be non-empty`);
    check(typeof mod.readiness === 'string' && mod.readiness.length > 0, `module "${mod.moduleId}": readiness must be non-empty`);
  }

  // Code coverage + hashes.
  const code = release.code && typeof release.code === 'object' ? release.code : {};
  const files = Array.isArray(code.files) ? code.files : [];
  check(files.length > 0, 'code.files must be a non-empty array');
  check(JSON.stringify(files) === JSON.stringify(files.slice().sort()), 'code.files must be sorted');
  check(new Set(files).size === files.length, 'code.files must not contain duplicates');
  check(files.includes('nexus_home.html'), 'code.files must include the Home entrypoint');
  const fileMap = code.filesSha256 && typeof code.filesSha256 === 'object' && !Array.isArray(code.filesSha256) ? code.filesSha256 : {};
  check(
    JSON.stringify(Object.keys(fileMap).sort()) === JSON.stringify(files.slice().sort()),
    'code.filesSha256 must cover exactly code.files'
  );
  for (const [file, hash] of Object.entries(fileMap)) {
    check(isHex64(hash), `code.filesSha256["${file}"] must be a 64-hex sha256`);
  }

  // Config hashes.
  const config = release.config && typeof release.config === 'object' ? release.config : {};
  for (const key of ['registrySha256', 'profileSha256', 'manifestSha256', 'readinessSha256']) {
    check(isHex64(config[key]), `config.${key} must be a 64-hex sha256`);
  }
  const provenance = manifestDoc.provenance || {};
  check(config.registrySha256 === provenance.registrySha256, 'config.registrySha256 must be copied from the manifest provenance');
  check(config.profileSha256 === provenance.profileSha256, 'config.profileSha256 must be copied from the manifest provenance');

  // Contracts / schema versions.
  const contracts = release.contracts && typeof release.contracts === 'object' ? release.contracts : {};
  check(contracts.registryVersion === '1', 'contracts.registryVersion must be "1"');
  check(contracts.profileVersion === '1', 'contracts.profileVersion must be "1"');
  check(contracts.manifestVersion === '1', 'contracts.manifestVersion must be "1"');
  check(contracts.readinessVersion === '1', 'contracts.readinessVersion must be "1"');
  const ids = contracts.schemaIds && typeof contracts.schemaIds === 'object' ? contracts.schemaIds : {};
  for (const name of ['registry', 'profile', 'manifest', 'readiness']) {
    check(ids[name] === schemaId(name), `contracts.schemaIds.${name} must equal the schema $id`);
  }

  // Static tooling (no process.version, no timestamps).
  const tooling = release.tooling && typeof release.tooling === 'object' ? release.tooling : {};
  for (const [key, value] of Object.entries(EXPECTED_TOOLING)) {
    check(tooling[key] === value, `tooling.${key} must be exactly "${value}"`);
  }
  check(
    JSON.stringify(Object.keys(tooling).sort()) === JSON.stringify(Object.keys(EXPECTED_TOOLING).sort()),
    'tooling must contain exactly the static tooling fields'
  );

  // Gates / evidence.
  const gates = release.gates && typeof release.gates === 'object' ? release.gates : {};
  check(
    Array.isArray(gates.deterministic) && gates.deterministic.includes('npm run verify:nexus'),
    "gates.deterministic must include 'npm run verify:nexus'"
  );
  const browser = gates.browser && typeof gates.browser === 'object' ? gates.browser : {};
  check(browser.suite === 'tools/nexus_home_f33_browser_check.mjs', 'gates.browser.suite must be the F3.3 browser checker');
  check(typeof browser.requirement === 'string' && browser.requirement.length > 0, 'gates.browser.requirement must be non-empty');

  // Rollback reference.
  const rollback = release.rollback && typeof release.rollback === 'object' ? release.rollback : {};
  check(typeof rollback.strategy === 'string' && rollback.strategy.length > 0, 'rollback.strategy must be non-empty');
  check(typeof rollback.documentedIn === 'string' && rollback.documentedIn.length > 0, 'rollback.documentedIn must be non-empty');

  return errors;
}

// Recomputes every declared code file (under codeRoot) and config artifact from
// disk and compares against the release manifest. Any mismatch is drift.
function integrityErrors(release, codeRoot) {
  const errors = [];
  const map = release.code && release.code.filesSha256 ? release.code.filesSha256 : {};
  for (const file of (release.code && release.code.files) || []) {
    const abs = path.join(codeRoot, file);
    if (!fs.existsSync(abs)) {
      errors.push(`code file missing on disk: ${file}`);
      continue;
    }
    const actual = sha256CanonicalFile(abs);
    if (map[file] !== actual) {
      errors.push(`code drift detected: ${file} declared ${map[file]} actual ${actual}`);
    }
  }
  const manifestHash = sha256CanonicalFile(MANIFEST_INPUT);
  if (release.config.manifestSha256 !== manifestHash) {
    errors.push(`config drift detected: deployment manifest declared ${release.config.manifestSha256} actual ${manifestHash}`);
  }
  const readinessHash = sha256CanonicalFile(READINESS_INPUT);
  if (release.config.readinessSha256 !== readinessHash) {
    errors.push(`config drift detected: readiness view declared ${release.config.readinessSha256} actual ${readinessHash}`);
  }
  const registryHash = sha256CanonicalFile(path.join(ROOT, 'tools', 'fixtures', 'home', 'module-registry.json'));
  if (release.config.registrySha256 !== registryHash) {
    errors.push(`config drift detected: module registry declared ${release.config.registrySha256} actual ${registryHash}`);
  }
  const profileHash = sha256CanonicalFile(path.join(ROOT, 'tools', 'fixtures', 'home', 'deployment-profile.json'));
  if (release.config.profileSha256 !== profileHash) {
    errors.push(`config drift detected: deployment profile declared ${release.config.profileSha256} actual ${profileHash}`);
  }
  return errors;
}

function copyCodeTree(destRoot) {
  for (const file of CODE_FILES) {
    const dest = path.join(destRoot, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), dest);
  }
}

function tamperOneByte(file) {
  const buf = fs.readFileSync(file);
  const idx = buf.findIndex((b) => (b >= 65 && b <= 90) || (b >= 97 && b <= 122));
  if (idx < 0) throw new Error(`no alphabetic byte to tamper in ${file}`);
  buf[idx] = buf[idx] === 97 ? 98 : 97; // 'a' <-> 'b'; never a newline
  fs.writeFileSync(file, buf);
}

function main() {
  console.log('PROMueve Nexus synthetic Home release check (F3.4 / ADR-007)');

  // Prerequisite gate: missing files are a clean FAIL, not a crash.
  const required = [BUILDER, MANIFEST_INPUT, READINESS_INPUT, RELEASES_INPUT, INVALID_MANIFEST, ...CODE_FILES.map((f) => path.join(ROOT, f))];
  const missing = required.filter((abs) => !fs.existsSync(abs));
  if (missing.length > 0) {
    console.log(`  [FAIL] prerequisite files present -> missing: ${missing.map((p) => path.relative(ROOT, p)).join(', ')}`);
    console.log('\nRESULTADO: 0 OK / 1 FALLIDO');
    console.log('FALLIDOS:');
    console.log('  - prerequisite files present');
    process.exit(1);
  }

  const manifestDoc = loadJson(MANIFEST_INPUT);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-home-release-'));

  // 1. Reproducible build.
  const out1 = path.join(tmp, 'release-1.json');
  const out2 = path.join(tmp, 'release-2.json');
  const b1 = runBuilder([MANIFEST_INPUT, READINESS_INPUT, RELEASES_INPUT, out1]);
  const b2 = runBuilder([MANIFEST_INPUT, READINESS_INPUT, RELEASES_INPUT, out2]);
  const release = b1.ok ? loadJson(out1) : null;
  const bytes1 = b1.ok ? fs.readFileSync(out1) : Buffer.alloc(0);
  record('builder composes the release from the packaged artifacts (real inputs)', b1.ok && b2.ok, `exit=${b1.ok ? 0 : 1} output=${b1.output.trim()}`);

  const reproducible = b1.ok && b2.ok && bytes1.equals(fs.readFileSync(out2));
  record('two builds are byte-identical (reproducibility)', reproducible, reproducible ? '' : 'outputs differ');

  const canonicalOutput = b1.ok && bytes1[bytes1.length - 1] === 0x0a && !bytes1.includes(0x0d) && bytes1.toString('utf8') === canonicalJson(release);
  record('release JSON is canonical (2-space, LF, trailing newline)', canonicalOutput, 'output is not canonical JSON');

  // EOL invariance: the release must be byte-identical when the working tree
  // checks out the code files as CRLF (determinism across machines/checkouts).
  const crlfRoot = path.join(tmp, 'code-crlf');
  copyCodeTree(crlfRoot);
  for (const file of CODE_FILES) {
    const abs = path.join(crlfRoot, file);
    const text = fs.readFileSync(abs, 'utf8');
    fs.writeFileSync(abs, text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'));
  }
  const crlfOut = path.join(tmp, 'release-crlf.json');
  const bCrlf = runBuilder([MANIFEST_INPUT, READINESS_INPUT, RELEASES_INPUT, crlfOut, crlfRoot]);
  record(
    'release is invariant to CRLF code files (determinism across checkouts)',
    bCrlf.ok && fs.readFileSync(crlfOut).equals(bytes1),
    `builderOk=${bCrlf.ok} output=${bCrlf.output.trim()}`
  );

  // 2. Structural validation.
  const structErrs = release ? structuralErrors(release, manifestDoc) : ['no release built'];
  record('release carries every ADR-007 field and stays self-consistent', structErrs.length === 0, structErrs.join(' | '));

  // 3. Integrity baseline (drift detection against the working tree).
  const integErrs = release ? integrityErrors(release, ROOT) : ['no release built'];
  record('integrity: declared code/config hashes match the working tree', integErrs.length === 0, integErrs.join(' | '));

  // 4a. Planted code drift (builder pointed at a tampered temporary tree).
  const driftRoot = path.join(tmp, 'code-drift');
  copyCodeTree(driftRoot);
  const driftCss = path.join(driftRoot, 'nexus_home.css');
  tamperOneByte(driftCss);
  const driftOut = path.join(tmp, 'release-drift.json');
  const bDrift = runBuilder([MANIFEST_INPUT, READINESS_INPUT, RELEASES_INPUT, driftOut, driftRoot]);
  const driftRelease = bDrift.ok ? loadJson(driftOut) : null;
  const codeRootHonored = Boolean(driftRelease) && driftRelease.code.filesSha256['nexus_home.css'] === sha256CanonicalFile(driftCss);
  const driftErrs = driftRelease ? integrityErrors(driftRelease, ROOT) : [];
  record(
    'planted code drift is detected and names the tampered file',
    bDrift.ok && codeRootHonored && driftErrs.some((e) => e.includes('nexus_home.css')),
    `builderOk=${bDrift.ok} codeRootHonored=${codeRootHonored} errs=${JSON.stringify(driftErrs)}`
  );

  // 4a'. Missing code file fails closed with no artifact.
  const missingRoot = path.join(tmp, 'code-missing');
  copyCodeTree(missingRoot);
  fs.rmSync(path.join(missingRoot, 'modules/home/home-page.js'));
  const missingOut = path.join(tmp, 'release-missing-code.json');
  const bMissing = runBuilder([MANIFEST_INPUT, READINESS_INPUT, RELEASES_INPUT, missingOut, missingRoot]);
  record(
    'missing code file fails closed and writes no artifact',
    !bMissing.ok && !fs.existsSync(missingOut),
    `exit=${bMissing.ok ? 0 : 1} artifact=${fs.existsSync(missingOut)} output=${bMissing.output.trim()}`
  );

  // 4b. Schema-invalid manifest fails closed with no artifact.
  const badOut = path.join(tmp, 'release-invalid-manifest.json');
  const bBad = runBuilder([INVALID_MANIFEST, READINESS_INPUT, RELEASES_INPUT, badOut]);
  record(
    'schema-invalid manifest fails closed and writes no artifact',
    !bBad.ok && !fs.existsSync(badOut),
    `exit=${bBad.ok ? 0 : 1} artifact=${fs.existsSync(badOut)} output=${bBad.output.trim()}`
  );

  // 4b'. Schema-valid config drift changes the config hash and the release hash.
  const tamperedManifestPath = path.join(tmp, 'manifest-tampered.json');
  const tamperedManifest = JSON.parse(JSON.stringify(manifestDoc));
  tamperedManifest.modules[tamperedManifest.modules.length - 1].label += ' (tampered)';
  fs.writeFileSync(tamperedManifestPath, canonicalJson(tamperedManifest));
  const tamperOut = path.join(tmp, 'release-tampered-config.json');
  const bTamper = runBuilder([tamperedManifestPath, READINESS_INPUT, RELEASES_INPUT, tamperOut]);
  const tamperRelease = bTamper.ok ? loadJson(tamperOut) : null;
  record(
    'schema-valid config drift changes manifestSha256 and releaseSha256',
    bTamper.ok &&
      Boolean(tamperRelease) &&
      Boolean(release) &&
      tamperRelease.config.manifestSha256 !== release.config.manifestSha256 &&
      tamperRelease.releaseSha256 !== release.releaseSha256,
    `builderOk=${bTamper.ok} manifestHashChanged=${Boolean(tamperRelease && release && tamperRelease.config.manifestSha256 !== release.config.manifestSha256)}`
  );

  // 4c. Release map missing a deployed module fails closed with no artifact.
  const missingModuleReleases = path.join(tmp, 'releases-missing-reuma.json');
  const releasesDoc = loadJson(RELEASES_INPUT);
  releasesDoc.modules = releasesDoc.modules.filter((m) => m.moduleId !== 'reuma');
  fs.writeFileSync(missingModuleReleases, canonicalJson(releasesDoc));
  const missingModuleOut = path.join(tmp, 'release-missing-module.json');
  const bMissingModule = runBuilder([MANIFEST_INPUT, READINESS_INPUT, missingModuleReleases, missingModuleOut]);
  record(
    'release map missing a deployed module fails closed and names it',
    !bMissingModule.ok && !fs.existsSync(missingModuleOut) && /reuma/.test(bMissingModule.output),
    `exit=${bMissingModule.ok ? 0 : 1} artifact=${fs.existsSync(missingModuleOut)} output=${bMissingModule.output.trim()}`
  );

  // 4d. Tampered / unknown tooling field is caught by structural validation.
  const toolingTamper = JSON.parse(JSON.stringify(release));
  toolingTamper.tooling.generator = 'evil/generator v0';
  const toolingErrs = structuralErrors(toolingTamper, manifestDoc);
  const unknownTooling = JSON.parse(JSON.stringify(release));
  unknownTooling.tooling.builtAt = '2026-01-01T00:00:00Z';
  const unknownToolingErrs = structuralErrors(unknownTooling, manifestDoc);
  record(
    'tampered generator and unknown tooling field are rejected by structural validation',
    toolingErrs.some((e) => e.includes('tooling.generator')) && unknownToolingErrs.length > 0,
    `generatorErrs=${JSON.stringify(toolingErrs)} unknownFieldErrs=${JSON.stringify(unknownToolingErrs)}`
  );

  // 5. Zero patient/clinical scan (Home sources + release manifest output).
  const scanTargets = HOME_TOKEN_SOURCES.map((rel) => ({ label: rel, text: fs.readFileSync(path.join(ROOT, rel), 'utf8') }));
  scanTargets.push({ label: '<release-manifest>', text: canonicalJson(release) });
  const scanHits = [];
  for (const { label, text } of scanTargets) {
    const match = text.match(CLINICAL_TOKEN_RE);
    if (match) scanHits.push(`${label}: ${match[0]}`);
  }
  record('zero patient/clinical tokens in Home sources and release manifest', scanHits.length === 0, JSON.stringify(scanHits));

  fs.rmSync(tmp, { recursive: true, force: true });

  const failed = results.filter((r) => !r.pass).length;
  console.log('');
  console.log(`RESULTADO: ${results.length - failed} OK / ${failed} FALLIDO`);
  if (failed > 0) {
    console.log('FALLIDOS:');
    for (const f of results.filter((r) => !r.pass)) console.log(`  - ${f.name}`);
    console.error('Home release check FAILED');
    process.exit(1);
  }
  console.log('Home release check (F3.4 / ADR-007) PASSED');
}

main();
