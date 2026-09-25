#!/usr/bin/env node
'use strict';
/**
 * FROZEN principal acceptance oracle for PROMueve Nexus Home (F3.2 WU-A, issue #403).
 *
 * This checker is the frozen acceptance package: it was authored from the accepted
 * authority (issue #403 + docs/engineering/PLATFORM_CONTEXT_API.md + ADR-002/003)
 * BEFORE the implementation context received write authority. The implementation
 * may run it but must never weaken or replace it (CODING_STANDARDS.md #13).
 *
 * Frozen implementation contracts verified here:
 *  - modules/home/home-schema-validators.generated.js attaches
 *    PromueveHome.SchemaValidators = { registry, profile, manifest, readiness }
 *    where each value is a function(doc) -> array of error strings ([] = valid).
 *    It is generated offline at build time from schemas/deployment/*.json by
 *    tools/home_validators_build.mjs (no CDN, no no-op validators, no hand-copied
 *    schema logic). Running the build script must reproduce the committed file
 *    byte-identically.
 *  - modules/home/home-bootstrap.js attaches PromueveHome.Bootstrap.bootstrap(input)
 *    with a CLOSED input { registry, profile, manifest, readiness, schemaValidators }.
 *    It never throws; it returns { ok: true, context } where context is a trusted
 *    PlatformContext issued by the shared PromuevePlatform seam
 *    (ConfigurationRepository.load + PlatformContext.fromSnapshot), or
 *    { ok: false, failure: { code, message } } with the exact stable platform error
 *    code. Bootstrap never reconstructs deployment truth and never falls back.
 *  - modules/home/home-renderer.js attaches:
 *      PromueveHome.Renderer.renderHome(context, document) -> root element
 *      PromueveHome.Renderer.renderError(failure, document) -> root element
 *    Frozen DOM markers:
 *      nexus-home__product-name  textContent = branding.productName (from context)
 *      nexus-home__site-name     textContent = branding.siteName   (from context)
 *      nexus-home__tile          one per getNavigableModules() entry, attribute
 *                                data-module-id = moduleId; WU-A tiles carry NO
 *                                href/route: routes arrive only in WU-B via
 *                                PlatformContext.getModuleRoute(moduleId).
 *      nexus-home__empty         explicit empty state when zero navigable modules
 *      nexus-home__error         explicit fail-closed error state; textContent
 *                                includes failure.code. Never a fallback to a
 *                                legacy entrypoint.
 *  - modules/home/home-page.js attaches PromueveHome.Page.start() -> Promise:
 *    fetches the four packaged artifacts from data/platform/home/ (module-registry,
 *    deployment-profile, deployment-manifest, module-readiness .json), runs
 *    Bootstrap then Renderer into document.getElementById('home-root'); on any
 *    failure renders the explicit error state and returns
 *    { ok: false, failure: { code, message } }. start() never throws.
 *  - nexus_home.html is a NEW distinct entrypoint: it loads exactly the platform
 *    seam scripts, the generated validators, the three Home modules and
 *    nexus_home.css, and provides <element id="home-root">. It never replaces or
 *    mutates the legacy entrypoints (index.html, farmacia_index.html).
 *  - Home transports zero patient/clinical data (ADR-002) and never imports the
 *    clinical runtime (HubTools / dataManager / exportManager).
 *
 * Fixtures: tools/fixtures/home/ (sources) and data/platform/home/ (packaged,
 * built with the existing deterministic builders) are 100% synthetic; the packaged
 * files must be byte-identical to a fresh deterministic rebuild.
 *
 * Node-only deterministic verification (no browser QA; browser qualification is
 * F3.3 and is explicitly NOT claimed here). Exit codes: 0 = all cases PASS,
 * 1 = at least one case FAIL. Usage: node tools/nexus_home_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const FILES = {
  entrypoint: 'nexus_home.html',
  css: 'nexus_home.css',
  generatedValidators: 'modules/home/home-schema-validators.generated.js',
  bootstrap: 'modules/home/home-bootstrap.js',
  renderer: 'modules/home/home-renderer.js',
  page: 'modules/home/home-page.js',
  validatorsBuild: 'tools/home_validators_build.mjs',
  legacyReuma: 'index.html',
  legacyFarmacia: 'farmacia_index.html',
};

const PACKAGED = [
  'module-registry.json',
  'deployment-profile.json',
  'deployment-manifest.json',
  'module-readiness.json',
];

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(readText(rel));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Minimal DOM stub (frozen contract used by Renderer/Page cases)
// ---------------------------------------------------------------------------

function createDomStub() {
  function makeElement(tag) {
    const listeners = {};
    return {
      tagName: String(tag).toUpperCase(),
      children: [],
      attributes: {},
      className: '',
      textContent: '',
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      setAttribute(name, value) {
        this.attributes[String(name)] = String(value);
      },
      getAttribute(name) {
        return Object.prototype.hasOwnProperty.call(this.attributes, String(name))
          ? this.attributes[String(name)]
          : null;
      },
      addEventListener(type, handler) {
        listeners[String(type)] = handler;
      },
      __listeners: listeners,
    };
  }
  const homeRoot = makeElement('div');
  homeRoot.setAttribute('id', 'home-root');
  return {
    createElement: (tag) => makeElement(tag),
    getElementById: (id) => (id === 'home-root' ? homeRoot : null),
    __homeRoot: homeRoot,
  };
}

function walk(element, visit) {
  if (!element || typeof element !== 'object') return;
  visit(element);
  for (const child of element.children || []) walk(child, visit);
}

function findAllByClass(root, className) {
  const found = [];
  walk(root, (el) => {
    if (typeof el.className === 'string' && el.className.split(/\s+/).includes(className)) {
      found.push(el);
    }
  });
  return found;
}

function serializeTree(root) {
  const parts = [];
  walk(root, (el) => {
    parts.push(String(el.tagName || ''), String(el.className || ''), String(el.textContent || ''));
    for (const [k, v] of Object.entries(el.attributes || {})) parts.push(`${k}=${v}`);
  });
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Sandbox that loads the real Home modules exactly like the browser entrypoint
// ---------------------------------------------------------------------------

function loadHomeSandbox(fetchMap) {
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  const dom = createDomStub();
  sandbox.document = dom;
  sandbox.fetch = (url) => {
    const key = String(url).replace(/^\.\//, '').replace(/^\/+/, '');
    if (Object.prototype.hasOwnProperty.call(fetchMap, key)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(deepClone(fetchMap[key])),
      });
    }
    return Promise.reject(new Error(`sandbox fetch: missing artifact ${key}`));
  };
  vm.createContext(sandbox);
  const scripts = [
    'modules/platform/configuration-repository.js',
    'modules/platform/platform-context.js',
    FILES.generatedValidators,
    FILES.bootstrap,
    FILES.renderer,
    FILES.page,
  ];
  for (const rel of scripts) {
    vm.runInContext(readText(rel), sandbox, { filename: rel });
  }
  return { sandbox, dom, PromueveHome: sandbox.PromueveHome, PromuevePlatform: sandbox.PromuevePlatform };
}

function packagedFetchMap() {
  const map = {};
  for (const file of PACKAGED) map[`data/platform/home/${file}`] = readJson(`data/platform/home/${file}`);
  return map;
}

// Builds the zero-navigable variant corpus in a temp dir with the existing
// deterministic builders (every module registered but none qualified).
function buildZeroNavigableVariant() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-home-zero-'));
  const registry = readJson('data/platform/home/module-registry.json');
  const profile = readJson('data/platform/home/deployment-profile.json');
  for (const mod of profile.modules) {
    mod.qualificationState = 'IMPLEMENTED_NOT_QUALIFIED';
    delete mod.qualificationEvidence;
  }
  fs.writeFileSync(path.join(tmp, 'module-registry.json'), JSON.stringify(registry, null, 2) + '\n');
  fs.writeFileSync(path.join(tmp, 'deployment-profile.json'), JSON.stringify(profile, null, 2) + '\n');
  fs.writeFileSync(
    path.join(tmp, 'module-releases.json'),
    JSON.stringify(readJson('tools/fixtures/home/module-releases.json'), null, 2) + '\n'
  );
  execFileSync('node', [path.join(ROOT, 'tools', 'deployment_manifest_build.mjs'),
    path.join(tmp, 'module-registry.json'), path.join(tmp, 'deployment-profile.json'),
    path.join(tmp, 'deployment-manifest.json')], { stdio: 'pipe' });
  execFileSync('node', [path.join(ROOT, 'tools', 'deployment_readiness_build.mjs'),
    path.join(tmp, 'deployment-manifest.json'), path.join(tmp, 'module-releases.json'),
    path.join(tmp, 'module-readiness.json')], { stdio: 'pipe' });
  const map = {};
  for (const file of PACKAGED) map[`data/platform/home/${file}`] = JSON.parse(fs.readFileSync(path.join(tmp, file), 'utf8'));
  fs.rmSync(tmp, { recursive: true, force: true });
  return map;
}

const CLINICAL_TOKEN_RE = /\bCIP\b|\bNHC\b|paciente|patient|workbook|cohorte|cohort\b|historia_cl|datos_clinicos/i;
const FORBIDDEN_RUNTIME_RE = /\bHubTools\b|\bdataManager\b|\bexportManager\b/;

// --- Prerequisite gate: missing implementation files are a clean FAIL, not a crash
{
  const required = [...Object.values(FILES), 'tools/fixtures/home/module-releases.json', ...PACKAGED.map((f) => `data/platform/home/${f}`)];
  const missing = required.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));
  if (missing.length > 0) {
    console.log('  [FAIL] prerequisite files present -> missing: ' + missing.join(', '));
    console.log('\nRESULTADO: 0 OK / 1 FALLIDO');
    console.log('FALLIDOS:');
    console.log('  - prerequisite files present');
    process.exit(1);
  }
}

// ===========================================================================
console.log('PROMueve Nexus Home F3.2 WU-A — frozen acceptance oracle');
// ===========================================================================

// --- CASO 1: valid packaged start -> branding + filtering, zero fabricated routes
{
  const { dom, PromueveHome } = loadHomeSandbox(packagedFetchMap());
  try {
    const outcome = await PromueveHome.Page.start();
    const branding = JSON.parse(readText('data/platform/home/deployment-profile.json')).display;
    const root = dom.__homeRoot;
    const products = findAllByClass(root, 'nexus-home__product-name');
    const sites = findAllByClass(root, 'nexus-home__site-name');
    const tiles = findAllByClass(root, 'nexus-home__tile');
    const farmaciaTiles = tiles.filter((t) => t.getAttribute('data-module-id') === 'farmacia');
    const reumaTiles = tiles.filter((t) => t.getAttribute('data-module-id') === 'reuma');
    let hrefs = 0;
    let routeStrings = 0;
    walk(root, (el) => {
      if (el.attributes && el.attributes.href) hrefs += 1;
      const text = `${el.textContent || ''}`;
      if (/\.html/.test(text)) routeStrings += 1;
      for (const v of Object.values(el.attributes || {})) if (/\.html/.test(String(v))) routeStrings += 1;
    });
    const ok =
      outcome && outcome.ok === true &&
      products.length === 1 && products[0].textContent === branding.productName &&
      sites.length === 1 && sites[0].textContent === branding.siteName &&
      tiles.length === 1 && reumaTiles.length === 1 && farmaciaTiles.length === 0 &&
      hrefs === 0 && routeStrings === 0 &&
      findAllByClass(root, 'nexus-home__error').length === 0 &&
      findAllByClass(root, 'nexus-home__empty').length === 0;
    record('CASO 1 valid start: branding + only-qualified tile + no routes/links', ok,
      `outcome=${JSON.stringify(outcome && outcome.ok)} products=${products.length} sites=${sites.length} tiles=${tiles.length} hrefs=${hrefs} routeStrings=${routeStrings}`);
  } catch (err) {
    record('CASO 1 valid start: branding + only-qualified tile + no routes/links', false, err.message);
  }
}

// --- CASO 2: zero-navigable deployment -> explicit empty state, zero tiles
{
  const { dom, PromueveHome } = loadHomeSandbox(buildZeroNavigableVariant());
  try {
    const outcome = await PromueveHome.Page.start();
    const root = dom.__homeRoot;
    const tiles = findAllByClass(root, 'nexus-home__tile');
    const empty = findAllByClass(root, 'nexus-home__empty');
    const errors = findAllByClass(root, 'nexus-home__error');
    const ok = outcome && outcome.ok === true && tiles.length === 0 && empty.length === 1 && errors.length === 0;
    record('CASO 2 zero-navigable deployment: explicit empty state, zero tiles', ok,
      `outcome=${JSON.stringify(outcome && outcome.ok)} tiles=${tiles.length} empty=${empty.length} errors=${errors.length}`);
  } catch (err) {
    record('CASO 2 zero-navigable deployment: explicit empty state, zero tiles', false, err.message);
  }
}

// --- helper: start with a mutated artifact map, expect exact fail-closed code
async function expectFailureCase(caseName, mutate, expectedCode) {
  const map = packagedFetchMap();
  mutate(map);
  const { dom, PromueveHome } = loadHomeSandbox(map);
  try {
    const outcome = await PromueveHome.Page.start();
    const root = dom.__homeRoot;
    const tiles = findAllByClass(root, 'nexus-home__tile');
    const errors = findAllByClass(root, 'nexus-home__error');
    const errorText = errors.map((e) => e.textContent || '').join('\n');
    const ok = outcome && outcome.ok === false &&
      outcome.failure && typeof outcome.failure.code === 'string' &&
      outcome.failure.code === expectedCode &&
      tiles.length === 0 && errors.length === 1 &&
      errorText.includes(expectedCode);
    record(caseName, ok,
      `outcome=${JSON.stringify(outcome)} tiles=${tiles.length} errors=${errors.length} errorText=${JSON.stringify(errorText.slice(0, 200))}`);
  } catch (err) {
    record(caseName, false, `start() threw: ${err.message}`);
  }
}

// --- CASO 3: schema-valid but cross-artifact incoherent manifest -> fail closed
await expectFailureCase(
  'CASO 3 cross-artifact incoherent manifest fails closed (MANIFEST_REGISTRY_LABEL_MISMATCH)',
  (map) => { map['data/platform/home/deployment-manifest.json'].modules[1].label = 'Reuma Manipulado'; },
  'MANIFEST_REGISTRY_LABEL_MISMATCH'
);

// --- CASO 4: schema-invalid registry -> fail closed (validators cannot be bypassed)
await expectFailureCase(
  'CASO 4 schema-invalid registry fails closed (REGISTRY_SCHEMA_INVALID)',
  (map) => { map['data/platform/home/module-registry.json'].modules[0].moduleId = 'BAD_ID_UPPER'; },
  'REGISTRY_SCHEMA_INVALID'
);

// --- CASO 5: bootstrap rejects a missing validator directly (no no-op validation)
// --- CASO 5b: bootstrap input is closed (unknown key rejected by the F3.1 seam)
{
  try {
    const { PromueveHome } = loadHomeSandbox(packagedFetchMap());
    const artifacts = packagedFetchMap();
    const input = {
      registry: artifacts['data/platform/home/module-registry.json'],
      profile: artifacts['data/platform/home/deployment-profile.json'],
      manifest: artifacts['data/platform/home/deployment-manifest.json'],
      readiness: artifacts['data/platform/home/module-readiness.json'],
      schemaValidators: PromueveHome.SchemaValidators,
    };
    const missingValidator = deepClone(input);
    missingValidator.schemaValidators = { ...PromueveHome.SchemaValidators };
    delete missingValidator.schemaValidators.registry;
    const r1 = PromueveHome.Bootstrap.bootstrap(missingValidator);
    const okMissing = r1 && r1.ok === false && r1.failure && r1.failure.code === 'SCHEMA_VALIDATOR_REQUIRED';

    const extraKey = deepClone(input);
    extraKey.snapshot = {}; // attempt to bypass the seam with a prebuilt snapshot
    const r2 = PromueveHome.Bootstrap.bootstrap(extraKey);
    const okClosed = r2 && r2.ok === false && r2.failure && r2.failure.code === 'CONFIG_INPUT_UNKNOWN_KEY';
    record('CASO 5 bootstrap: missing validator (SCHEMA_VALIDATOR_REQUIRED) + closed input (CONFIG_INPUT_UNKNOWN_KEY)',
      okMissing && okClosed,
      `missing=${JSON.stringify(r1)} closed=${JSON.stringify(r2)}`);
  } catch (err) {
    record('CASO 5 bootstrap: missing validator (SCHEMA_VALIDATOR_REQUIRED) + closed input (CONFIG_INPUT_UNKNOWN_KEY)',
      false, `bootstrap() threw: ${err.message}`);
  }
}

// --- CASO 6: fetch failure -> explicit fail-closed error state, never a fallback
{
  const { dom, PromueveHome } = loadHomeSandbox({});
  try {
    const outcome = await PromueveHome.Page.start();
    const root = dom.__homeRoot;
    const tiles = findAllByClass(root, 'nexus-home__tile');
    const errors = findAllByClass(root, 'nexus-home__error');
    const ok = outcome && outcome.ok === false && outcome.failure &&
      typeof outcome.failure.code === 'string' && outcome.failure.code.length > 0 &&
      tiles.length === 0 && errors.length === 1;
    record('CASO 6 fetch failure: explicit error state, no tiles, no legacy fallback', ok,
      `outcome=${JSON.stringify(outcome)} tiles=${tiles.length} errors=${errors.length}`);
  } catch (err) {
    record('CASO 6 fetch failure: explicit error state, no tiles, no legacy fallback', false, `start() threw: ${err.message}`);
  }
}

// --- CASO 7: generated validators expose the frozen contract; build is reproducible
{
  try {
    const genSource = readText(FILES.generatedValidators);
    const sandbox = { console: { log() {}, warn() {}, error() {} } };
    sandbox.globalThis = sandbox;
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(genSource, sandbox, { filename: FILES.generatedValidators });
    const sv = sandbox.PromueveHome && sandbox.PromueveHome.SchemaValidators;
    const names = ['registry', 'profile', 'manifest', 'readiness'];
    const allFns = sv && names.every((n) => typeof sv[n] === 'function');
    const validRegistry = readJson('data/platform/home/module-registry.json');
    const accepts = allFns && Array.isArray(sv.registry(validRegistry)) && sv.registry(validRegistry).length === 0;
    const invalid = sv.registry({ registryVersion: '1', modules: [{ moduleId: 'X' }] });
    const rejects = Array.isArray(invalid) && invalid.length > 0;
    const tmpOut = path.join(os.tmpdir(), `nexus-home-gen-${Date.now()}.js`);
    execFileSync('node', [path.join(ROOT, FILES.validatorsBuild), '--out', tmpOut], { stdio: 'pipe' });
    const regenerated = fs.readFileSync(tmpOut, 'utf8');
    fs.rmSync(tmpOut, { force: true });
    const reproducible = regenerated === genSource;
    const ok = allFns && accepts && rejects && reproducible;
    record('CASO 7 generated validators: contract + accept/reject + byte-identical rebuild', ok,
      `allFns=${allFns} accepts=${accepts} rejects=${rejects} reproducible=${reproducible}`);
  } catch (err) {
    record('CASO 7 generated validators: contract + accept/reject + byte-identical rebuild', false, err.message);
  }
}

// --- CASO 8: packaged artifacts byte-identical to a deterministic rebuild
{
  try {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-home-pack-'));
    execFileSync('node', [path.join(ROOT, 'tools', 'deployment_manifest_build.mjs'),
      path.join(ROOT, 'tools/fixtures/home/module-registry.json'),
      path.join(ROOT, 'tools/fixtures/home/deployment-profile.json'),
      path.join(tmp, 'deployment-manifest.json')], { stdio: 'pipe' });
    execFileSync('node', [path.join(ROOT, 'tools', 'deployment_readiness_build.mjs'),
      path.join(tmp, 'deployment-manifest.json'),
      path.join(ROOT, 'tools/fixtures/home/module-releases.json'),
      path.join(tmp, 'module-readiness.json')], { stdio: 'pipe' });
    const manifestOk = fs.readFileSync(path.join(tmp, 'deployment-manifest.json'), 'utf8') === readText('data/platform/home/deployment-manifest.json');
    const readinessOk = fs.readFileSync(path.join(tmp, 'module-readiness.json'), 'utf8') === readText('data/platform/home/module-readiness.json');
    const registryOk = readText('tools/fixtures/home/module-registry.json') === readText('data/platform/home/module-registry.json');
    const profileOk = readText('tools/fixtures/home/deployment-profile.json') === readText('data/platform/home/deployment-profile.json');
    fs.rmSync(tmp, { recursive: true, force: true });
    const ok = manifestOk && readinessOk && registryOk && profileOk;
    record('CASO 8 packaged artifacts byte-identical to deterministic rebuild', ok,
      `manifest=${manifestOk} readiness=${readinessOk} registry=${registryOk} profile=${profileOk}`);
  } catch (err) {
    record('CASO 8 packaged artifacts byte-identical to deterministic rebuild', false, err.message);
  }
}

// --- CASO 9: zero patient/clinical transport in Home sources, fixtures and output
{
  try {
    const homeSources = [FILES.entrypoint, FILES.css, FILES.bootstrap, FILES.renderer, FILES.page]
      .map((rel) => readText(rel));
    const fixtureFiles = [];
    const walkDir = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkDir(full);
        else if (entry.name.endsWith('.json')) fixtureFiles.push(full);
      }
    };
    walkDir(path.join(ROOT, 'tools/fixtures/home'));
    walkDir(path.join(ROOT, 'data/platform/home'));
    const fixtureContents = fixtureFiles.map((f) => fs.readFileSync(f, 'utf8'));
    const renderedTrees = [];
    for (const map of [packagedFetchMap(), buildZeroNavigableVariant()]) {
      const { dom, PromueveHome } = loadHomeSandbox(map);
      await PromueveHome.Page.start();
      renderedTrees.push(serializeTree(dom.__homeRoot));
    }
    const scan = (label, contents) => {
      const hits = [];
      contents.forEach((content, i) => {
        const m = content.match(CLINICAL_TOKEN_RE);
        if (m) hits.push(`${label}[${i}]: ${m[0]}`);
      });
      return hits;
    };
    const srcHits = scan('home-source', homeSources);
    const fixHits = scan('home-fixture', fixtureContents);
    const outHits = scan('rendered-output', renderedTrees);
    const ok = srcHits.length === 0 && fixHits.length === 0 && outHits.length === 0;
    record('CASO 9 zero patient/clinical transport (sources, fixtures, rendered output)', ok,
      `srcHits=${JSON.stringify(srcHits)} fixHits=${JSON.stringify(fixHits)} outHits=${JSON.stringify(outHits)}`);
  } catch (err) {
    record('CASO 9 zero patient/clinical transport (sources, fixtures, rendered output)', false, err.message);
  }
}

// --- CASO 10: namespace hygiene — Home never imports the clinical runtime
{
  try {
    const homeSources = [FILES.entrypoint, FILES.bootstrap, FILES.renderer, FILES.page, FILES.generatedValidators]
      .map((rel) => `${rel}\n${readText(rel)}`);
    const hits = homeSources.filter((s) => FORBIDDEN_RUNTIME_RE.test(s));
    const ok = hits.length === 0;
    record('CASO 10 no clinical runtime references (HubTools/dataManager/exportManager)', ok,
      `hits=${JSON.stringify(hits.map((h) => h.split('\n')[0]))}`);
  } catch (err) {
    record('CASO 10 no clinical runtime references (HubTools/dataManager/exportManager)', false, err.message);
  }
}

// --- CASO 11: entrypoint distinctness + required script set + legacy untouched
{
  try {
    let html = '';
    try { html = readText(FILES.entrypoint); } catch { html = ''; }
    const requiredScripts = [
      'modules/platform/configuration-repository.js',
      'modules/platform/platform-context.js',
      FILES.generatedValidators,
      FILES.bootstrap,
      FILES.renderer,
      FILES.page,
    ];
    const scriptsOk = requiredScripts.every((src) => html.includes(src));
    const cssOk = html.includes(FILES.css);
    const rootOk = /id="home-root"/.test(html);
    const forbiddenScripts = ['script.js', 'modules/dataManager.js', 'modules/exportManager.js', 'scripts/farmacia_index.js'];
    const noClinicalScripts = forbiddenScripts.every((src) => !html.includes(src));
    const legacyReuma = readText(FILES.legacyReuma);
    const legacyFarmacia = readText(FILES.legacyFarmacia);
    const legacyUntouched = !legacyReuma.includes('nexus_home') && !legacyFarmacia.includes('nexus_home');
    const ok = scriptsOk && cssOk && rootOk && noClinicalScripts && legacyUntouched;
    record('CASO 11 entrypoint distinct: exact script set, css, home-root, legacy untouched', ok,
      `scriptsOk=${scriptsOk} cssOk=${cssOk} rootOk=${rootOk} noClinicalScripts=${noClinicalScripts} legacyUntouched=${legacyUntouched}`);
  } catch (err) {
    record('CASO 11 entrypoint distinct: exact script set, css, home-root, legacy untouched', false, err.message);
  }
}

// ===========================================================================
const failed = results.filter((r) => !r.pass);
console.log(`\nRESULTADO: ${results.length - failed.length} OK / ${failed.length} FALLIDO`);
if (failed.length > 0) {
  console.log('FALLIDOS:');
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exit(1);
}
console.log('Nexus Home WU-A acceptance oracle PASSED');
