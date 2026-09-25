#!/usr/bin/env node
'use strict';
/**
 * Independent deterministic hardening checker for the offline Home schema
 * validator build gate (NEXUS-DEBT-010, issue #411, parent #409).
 *
 * The generated browser validators
 * (modules/home/home-schema-validators.generated.js) are a deterministic
 * function of schemas/deployment/*.json interpreted by a small, hand-written
 * draft 2020-12 subset interpreter. That coupling is only safe if a keyword the
 * interpreter does not implement can never reach the accepted schemas silently.
 * This checker is deliberately separate from the frozen WU-A oracle
 * (tools/nexus_home_check.mjs): it must be able to disagree with the builder.
 *
 * Verified contracts:
 *  N1. tools/home_validators_build.mjs fails closed (non-zero exit, no output
 *      file, stderr naming the offending schema file and keyword) when a schema
 *      copy under --schema-dir contains an unsupported validation keyword.
 *  N2. An annotation keyword (e.g. examples) is accepted by the gate and is
 *      stripped from the generated artifact.
 *  N3. minLength/maxLength count Unicode code points, not UTF-16 code units:
 *      an 80-astral-code-point label is accepted, 81 is rejected and a single
 *      astral character satisfies minLength 1.
 *  N4. Exhaustiveness sweep: every key of every JSON Schema node across the four
 *      committed schemas is a recognized annotation or a supported keyword, so
 *      the accepted schemas contain no silently-ignored keyword.
 *
 * Node-only, dependency-free, deterministic (no network). Exit codes:
 * 0 = all cases PASS, 1 = at least one case FAIL.
 * Usage: node tools/nexus_home_validator_hardening_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_DIR = path.join(ROOT, 'schemas', 'deployment');
const BUILD_TOOL = path.join(ROOT, 'tools', 'home_validators_build.mjs');
const GENERATED_REL = 'modules/home/home-schema-validators.generated.js';
const GENERATED = path.join(ROOT, GENERATED_REL);

const SCHEMA_FILES = [
  'module-registry.schema.json',
  'deployment-profile.schema.json',
  'deployment-manifest.schema.json',
  'module-readiness.schema.json',
];

// Must stay in sync with the build gate. Annotations are documentation-only;
// SUPPORTED_KEYWORDS is exactly what the generated interpreter implements plus
// the two schema-container keywords.
const ANNOTATION_KEYS = new Set([
  '$schema', '$id', 'title', 'description', '$comment', 'default', 'examples',
  'deprecated', 'readOnly', 'writeOnly',
]);
const SUPPORTED_KEYWORDS = new Set([
  'type', 'const', 'enum', 'pattern', 'minLength', 'maxLength', 'minItems',
  'maxItems', 'uniqueItems', 'items', 'properties', 'required',
  'additionalProperties', '$ref', '$defs', 'definitions',
]);

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Runs the build tool and captures its exit status without throwing on failure.
function runBuild(schemaDir, outPath) {
  try {
    const stdout = execFileSync('node', [BUILD_TOOL, '--schema-dir', schemaDir, '--out', outPath], {
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return { status: 0, stdout: String(stdout), stderr: '' };
  } catch (err) {
    return {
      status: typeof err.status === 'number' ? err.status : -1,
      stdout: err.stdout ? String(err.stdout) : '',
      stderr: err.stderr ? String(err.stderr) : '',
    };
  }
}

function makeSchemaCopyDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `nexus-home-validators-${label}-`));
  for (const file of SCHEMA_FILES) {
    fs.copyFileSync(path.join(SCHEMA_DIR, file), path.join(dir, file));
  }
  return dir;
}

function mutateSchema(schemaDir, file, mutate) {
  const full = path.join(schemaDir, file);
  const schema = JSON.parse(fs.readFileSync(full, 'utf8'));
  mutate(schema);
  fs.writeFileSync(full, JSON.stringify(schema, null, 2) + '\n');
}

// --- Prerequisite gate: missing inputs are a clean FAIL, not a crash
{
  const required = [BUILD_TOOL, GENERATED, ...SCHEMA_FILES.map((f) => path.join(SCHEMA_DIR, f))];
  const missing = required.filter((p) => !fs.existsSync(p));
  if (missing.length > 0) {
    console.log('  [FAIL] prerequisite files present -> missing: ' + missing.join(', '));
    console.log('\nRESULTADO: 0 OK / 1 FALLIDO');
    console.log('FALLIDOS:');
    console.log('  - prerequisite files present');
    process.exit(1);
  }
}

// ===========================================================================
console.log('PROMueve Nexus Home validator hardening — NEXUS-DEBT-010 checker');
// ===========================================================================

// --- N1: unsupported keyword -> fail closed, no artifact, names file + keyword
{
  const dir = makeSchemaCopyDir('n1');
  const controlOut = path.join(dir, 'control.js');
  const injectedOut = path.join(dir, 'injected.js');
  const targetFile = 'module-registry.schema.json';
  try {
    const control = runBuild(dir, controlOut);
    record('N1 control: pristine schema copy builds successfully',
      control.status === 0 && fs.existsSync(controlOut),
      `status=${control.status} exists=${fs.existsSync(controlOut)} stderr=${JSON.stringify(control.stderr.slice(0, 200))}`);

    mutateSchema(dir, targetFile, (schema) => {
      schema.$defs.moduleEntry.properties.label.minimum = 3;
    });

    const injected = runBuild(dir, injectedOut);
    const noArtifact = !fs.existsSync(injectedOut);
    const namesKeyword = injected.stderr.includes('minimum');
    const namesFile = injected.stderr.includes(targetFile);

    record('N1 build fails closed on unsupported validation keyword "minimum"',
      injected.status !== 0,
      `status=${injected.status} stderr=${JSON.stringify(injected.stderr.slice(0, 300))}`);
    record('N1 unsupported keyword leaves no output artifact',
      noArtifact,
      `exists=${fs.existsSync(injectedOut)} status=${injected.status}`);
    record('N1 failure message names the offending schema file and keyword',
      namesKeyword && namesFile,
      `keyword=${namesKeyword} file=${namesFile} stderr=${JSON.stringify(injected.stderr.slice(0, 300))}`);
  } catch (err) {
    record('N1 unsupported keyword build gate', false, err.message);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// --- N2: annotation keyword accepted by the gate and stripped from the artifact
{
  const dir = makeSchemaCopyDir('n2');
  const outPath = path.join(dir, 'out.js');
  const targetFile = 'module-registry.schema.json';
  try {
    mutateSchema(dir, targetFile, (schema) => {
      schema.$defs.moduleEntry.properties.label.examples = [];
      schema.$defs.moduleEntry.properties.label.$comment = 'annotation accepted';
    });

    const built = runBuild(dir, outPath);
    const succeeds = built.status === 0 && fs.existsSync(outPath);
    record('N2 annotation keyword "examples"/"$comment" accepted by the gate (build succeeds)',
      succeeds,
      `status=${built.status} exists=${fs.existsSync(outPath)} stderr=${JSON.stringify(built.stderr.slice(0, 300))}`);

    const source = succeeds ? fs.readFileSync(outPath, 'utf8') : '';
    const stripped = succeeds && !source.includes('"examples"') && !source.includes('"$comment"');
    record('N2 annotation keyword stripped from the generated artifact',
      stripped,
      `hasExamples=${source.includes('"examples"')} hasComment=${source.includes('"$comment"')}`);
  } catch (err) {
    record('N2 annotation keyword accepted', false, err.message);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// --- N3: Unicode code-point length semantics in the generated validators
{
  const ASTRAL = '\u{1D54F}'; // 𝕏: one code point, two UTF-16 units
  const astral = (n) => ASTRAL.repeat(n);
  const registryDoc = (label) => ({
    registryVersion: '1',
    modules: [{
      moduleId: 'reuma',
      label,
      entryPath: 'index.html',
      platformCapabilities: ['static-delivery'],
    }],
  });
  try {
    const sandbox = { console: { log() {}, warn() {}, error() {} } };
    sandbox.globalThis = sandbox;
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(readText(GENERATED_REL), sandbox, { filename: GENERATED_REL });
    const validators = sandbox.PromueveHome && sandbox.PromueveHome.SchemaValidators;
    const hasRegistry = Boolean(validators) && typeof validators.registry === 'function';
    record('N3 generated validators expose the registry validator', hasRegistry,
      `registry=${typeof (validators && validators.registry)}`);

    const sample = astral(80);
    record('N3 astral sample is 80 code points / 160 UTF-16 units',
      sample.length === 160 && Array.from(sample).length === 80,
      `utf16=${sample.length} codePoints=${Array.from(sample).length}`);

    const accept80 = hasRegistry ? validators.registry(registryDoc(astral(80))) : null;
    record('N3 80 astral code points accepted against label maxLength 80',
      Array.isArray(accept80) && accept80.length === 0,
      `errors=${JSON.stringify(accept80)}`);

    const reject81 = hasRegistry ? validators.registry(registryDoc(astral(81))) : null;
    record('N3 81 astral code points rejected against label maxLength 80',
      Array.isArray(reject81) && reject81.length > 0,
      `errors=${JSON.stringify(reject81)}`);

    const accept1 = hasRegistry ? validators.registry(registryDoc(astral(1))) : null;
    record('N3 a single astral character satisfies label minLength 1',
      Array.isArray(accept1) && accept1.length === 0,
      `errors=${JSON.stringify(accept1)}`);
  } catch (err) {
    record('N3 Unicode code-point semantics', false, err.message);
  }
}

// --- N4: exhaustiveness sweep over the four committed schemas
{
  const keys = new Set();
  const stats = { nodes: 0 };
  const collect = (node) => {
    if (typeof node === 'boolean') { stats.nodes += 1; return; }
    if (!isPlainObject(node)) return;
    stats.nodes += 1;
    for (const key of Object.keys(node)) {
      keys.add(key);
      const value = node[key];
      if (ANNOTATION_KEYS.has(key)) continue;
      if (key === '$defs' || key === 'definitions') {
        if (isPlainObject(value)) for (const name of Object.keys(value)) collect(value[name]);
        continue;
      }
      if (key === 'properties') {
        if (isPlainObject(value)) for (const name of Object.keys(value)) collect(value[name]);
        continue;
      }
      if (key === 'additionalProperties') {
        if (isPlainObject(value)) collect(value);
        continue;
      }
      if (key === 'items') {
        if (Array.isArray(value)) value.forEach((item) => collect(item));
        else collect(value);
        continue;
      }
    }
  };
  try {
    for (const file of SCHEMA_FILES) {
      collect(JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf8')));
    }
    const unsupported = [...keys].filter((key) => !ANNOTATION_KEYS.has(key) && !SUPPORTED_KEYWORDS.has(key));
    record('N4 exhaustiveness sweep: every committed schema keyword is annotation or supported',
      unsupported.length === 0,
      `unsupported=${JSON.stringify(unsupported)} keys=${JSON.stringify([...keys].sort())}`);
    record('N4 sweep is non-vacuous (visited many schema nodes and keywords)',
      stats.nodes >= 40 && keys.size >= 15,
      `nodes=${stats.nodes} keyCount=${keys.size}`);
  } catch (err) {
    record('N4 exhaustiveness sweep', false, err.message);
  }
}

// --- Reproducibility: the gate does not disturb deterministic generation
{
  const tmpA = path.join(os.tmpdir(), `nexus-home-gen-a-${process.pid}.js`);
  const tmpB = path.join(os.tmpdir(), `nexus-home-gen-b-${process.pid}.js`);
  try {
    const runA = runBuild(SCHEMA_DIR, tmpA);
    const runB = runBuild(SCHEMA_DIR, tmpB);
    const contentA = runA.status === 0 && fs.existsSync(tmpA) ? fs.readFileSync(tmpA, 'utf8') : '';
    const contentB = runB.status === 0 && fs.existsSync(tmpB) ? fs.readFileSync(tmpB, 'utf8') : '';
    const committed = readText(GENERATED_REL);
    record('A4 generated validators byte-identical on double rebuild and match the committed file',
      runA.status === 0 && runB.status === 0 && contentA === contentB && contentA === committed,
      `statusA=${runA.status} statusB=${runB.status} identical=${contentA === contentB} matchesCommitted=${contentA === committed}`);
  } catch (err) {
    record('A4 generated validators reproducible', false, err.message);
  } finally {
    fs.rmSync(tmpA, { force: true });
    fs.rmSync(tmpB, { force: true });
  }
}

// ===========================================================================
const failed = results.filter((r) => !r.pass);
console.log(`\nRESULTADO: ${results.length - failed.length} OK / ${failed.length} FALLIDO`);
if (failed.length > 0) {
  console.log('FALLIDOS:');
  for (const f of failed) console.log(`  - ${f.name}`);
  console.log('NEXUS-DEBT-010 validator hardening checker FAILED');
  process.exit(1);
}
console.log('NEXUS-DEBT-010 validator hardening checker PASSED');
