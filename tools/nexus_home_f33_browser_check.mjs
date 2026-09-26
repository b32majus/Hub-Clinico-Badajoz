#!/usr/bin/env node
'use strict';
/**
 * F3.3 Home browser qualification for PROMueve Nexus Home (issue #413, parent #409).
 *
 * Real-browser (Playwright + Chromium) qualification of the F3.2 Home shell over
 * a real HTTP server that serves the repository root, so Home fetches the REAL
 * packaged artifacts from data/platform/home/*.json. Every behavior is proven
 * through supported user-level interaction on a served page: real clicks, real
 * same-tab navigation and real Back. No DOM manipulation is used to fake state;
 * the only page.evaluate calls read observables (storage keys, request metadata,
 * postMessage counter) or seed a synthetic non-clinical draft for S7.
 *
 * Scenarios (all must PASS):
 *   S1 Happy path: branding markers, exactly one tile (reuma), zero error, zero
 *      anchor/href/route in the Home root, console.error === 0, pageerror === 0.
 *   S2 Exact route + same-tab + Back: click the tile, navigation lands exactly on
 *      <origin>/index.html (manifest entryPath, no query/hash), only one tab ever
 *      opened, no pageerror on the legacy page, goBack re-renders Home.
 *   S3 Zero-navigable deployment (built like tools/nexus_home_check.mjs
 *      buildZeroNavigableVariant): explicit empty state, zero tiles, zero error.
 *   S4 Schema-invalid packaged manifest (siteId outside enum): fail closed with a
 *      visible nexus-home__error carrying the stable MANIFEST_SCHEMA_INVALID code.
 *   S5 deployment-manifest.json HTTP 500: explicit error state, zero tiles.
 *   S6 Zero patient/dataset transport: no clinical token in any Home-origin
 *      request URL, no storage keys or cookies added by Home, no postMessage,
 *      no query/hash on the navigation URL.
 *   S7 Dirty-draft non-interference: a seeded synthetic draft key survives the
 *      Home session and Home adds no state keys of its own.
 *   S8 Legacy direct entrypoints: index.html and farmacia_index.html load without
 *      pageerror and contain no script/link reference to nexus_home.
 *
 * This is browser QA and stays OUT of the deterministic verify:nexus gate
 * (NEXUS-DEBT-009). Exit code 0 = all scenarios PASS, 1 = at least one FAIL.
 * Usage: node tools/nexus_home_f33_browser_check.mjs
 */

import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PACKAGED = [
  'module-registry.json',
  'deployment-profile.json',
  'deployment-manifest.json',
  'module-readiness.json',
];

// Case-insensitive patient/clinical transport tokens (ADR-002).
const CLINICAL_URL_TOKEN_RE = /paciente|patient|\bcip\b|\bnhc\b|tratamiento|treatment|validacion/i;

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

// The existing browser checkers resolve Playwright from PATH-provided npx
// installs. The global install layout (prefix/lib/node_modules) is added as a
// documented fallback so `node tools/nexus_home_f33_browser_check.mjs` works
// without an explicit npx wrapper; no new dependency is introduced.
function loadPlaywrightFromNpx() {
  const tried = [];
  const tryNodeModules = (nodeModules) => {
    const pkg = path.join(nodeModules, 'playwright', 'package.json');
    tried.push(pkg);
    if (existsSync(pkg)) {
      return createRequire(path.join(nodeModules, '__nexus_home_f33_loader.cjs'))('playwright');
    }
    return null;
  };
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    if (!binDirectory) continue;
    const prefix = path.resolve(binDirectory, '..');
    for (const nodeModules of [prefix, path.join(prefix, 'lib', 'node_modules')]) {
      const loaded = tryNodeModules(nodeModules);
      if (loaded) return loaded;
    }
  }
  const npxCache = path.join(process.env.HOME || '', '.npm', '_npx');
  if (existsSync(npxCache)) {
    for (const entry of readdirSync(npxCache).sort().reverse()) {
      const loaded = tryNodeModules(path.join(npxCache, entry, 'node_modules'));
      if (loaded) return loaded;
    }
  }
  const loaded = tryNodeModules(path.join(ROOT, 'node_modules'));
  if (loaded) return loaded;
  throw new Error(
    'Playwright not found. Tried: ' + tried.join(', ') +
    '. Run with: npx --yes --package=playwright node tools/nexus_home_f33_browser_check.mjs'
  );
}

let chromium;
try {
  ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
  console.error('ENVIRONMENT FAILURE: ' + err.message);
  console.log('\nRESULTADO: 0 OK / 1 FALLIDO');
  console.log('F3.3 Home browser qualification FAILED');
  process.exit(1);
}

// Documented Chromium executable fallbacks (identical to the Farmacia browser
// checkers): explicit env override, Playwright bundled path, MS Playwright cache.
function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  const candidates = readdirSync(cache)
    .filter((entry) => entry.startsWith('chromium_headless_shell-'))
    .sort().reverse()
    .map((entry) => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return candidates.find(existsSync) || bundled;
}

// ---------------------------------------------------------------------------
// Local HTTP server over the repository root, with per-scenario route overrides.
// ---------------------------------------------------------------------------

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

// pathname -> { status?, body?, contentType? }
const overrides = new Map();

const server = createServer((request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  if (overrides.has(pathname)) {
    const override = overrides.get(pathname);
    response.writeHead(override.status || 200, {
      'content-type': override.contentType || 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(override.body != null ? override.body : '');
    return;
  }
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(ROOT, relative);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return response.writeHead(403).end();
  try {
    if (!statSync(file).isFile()) throw new Error('not_file');
    response.writeHead(200, {
      'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const origin = `http://127.0.0.1:${server.address().port}`;
const serverPort = server.address().port;
const BASE = `${origin}/`;

// Replicates tools/nexus_home_check.mjs buildZeroNavigableVariant(): same temp
// dir and deterministic builders, every registered module non-qualified.
function buildZeroNavigableOverrides() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-home-f33-zero-'));
  try {
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
    execFileSync('node', [
      path.join(ROOT, 'tools', 'deployment_manifest_build.mjs'),
      path.join(tmp, 'module-registry.json'), path.join(tmp, 'deployment-profile.json'),
      path.join(tmp, 'deployment-manifest.json'),
    ], { stdio: 'pipe' });
    execFileSync('node', [
      path.join(ROOT, 'tools', 'deployment_readiness_build.mjs'),
      path.join(tmp, 'deployment-manifest.json'), path.join(tmp, 'module-releases.json'),
      path.join(tmp, 'module-readiness.json'),
    ], { stdio: 'pipe' });
    const out = new Map();
    for (const file of PACKAGED) {
      out.set(`/data/platform/home/${file}`, fs.readFileSync(path.join(tmp, file), 'utf8'));
    }
    return out;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const storageSnapshot = () => ({
  ls: Object.keys(localStorage).sort(),
  ss: Object.keys(sessionStorage).sort(),
});

const postMessageInit = () => {
  window.__f33PostMessageCalls = 0;
  if (typeof window.postMessage === 'function') {
    const original = window.postMessage;
    window.postMessage = function (...args) {
      window.__f33PostMessageCalls += 1;
      return original.apply(this, args);
    };
  }
};

let browser;
let chromiumVersion = 'not launched';
try {
  browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
  chromiumVersion = browser.version();

  // =========================================================================
  // S1 + S2 + S6 — one real Home session in a single tab.
  // =========================================================================
  {
    let s1 = false;
    let s2 = false;
    let s6 = false;
    let s1Detail = '';
    let s2Detail = '';
    let s6Detail = '';
    let context;
    try {
      overrides.clear();
      context = await browser.newContext();
      await context.addInitScript(postMessageInit);
      // Registered before the first page exists so every tab ever opened in this
      // context is counted (a Home-opened tab would push a second entry).
      const pagesOpened = [];
      context.on('page', (opened) => pagesOpened.push(opened));
      const page = await context.newPage();
      const homeConsoleErrors = [];
      const legacyConsoleErrors = [];
      const pageErrors = [];
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const current = page.url();
        (current.includes('nexus_home.html') ? homeConsoleErrors : legacyConsoleErrors)
          .push(`${current}: ${message.text()}`);
      });
      page.on('pageerror', (error) => pageErrors.push({ url: page.url(), message: error.message }));
      const observedRequests = [];
      page.on('request', (request) => {
        let frameUrl = '';
        try { frameUrl = request.frame().url(); } catch { frameUrl = ''; }
        observedRequests.push({ url: request.url(), frameUrl });
      });

      // Same-origin, script-free 404 document gives an observed "before" storage
      // baseline on the exact tab Home will use (sessionStorage is per-tab).
      await page.goto(`${origin}/__f33_storage_baseline__`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);
      const storageBaseline = await page.evaluate(storageSnapshot);
      // The baseline document is not part of the Home session: reset buffers.
      homeConsoleErrors.length = 0;
      legacyConsoleErrors.length = 0;
      pageErrors.length = 0;
      observedRequests.length = 0;
      const cookiesBefore = await context.cookies();

      // --- S1 happy path ---
      await page.goto(`${origin}/nexus_home.html`, { waitUntil: 'domcontentloaded' });
      await page.locator('.nexus-home__tile').first().waitFor({ state: 'visible', timeout: 15000 });
      const expectedDisplay = readJson('data/platform/home/deployment-profile.json').display;
      const productName = await page.locator('.nexus-home__product-name').innerText();
      const siteName = await page.locator('.nexus-home__site-name').innerText();
      const tileCount = await page.locator('.nexus-home__tile').count();
      const tileModuleId = tileCount === 1
        ? await page.locator('.nexus-home__tile').first().getAttribute('data-module-id')
        : null;
      const emptyCount = await page.locator('.nexus-home__empty').count();
      const errorCount = await page.locator('.nexus-home__error').count();
      const anchorCount = await page.locator('#home-root a').count();
      const hrefCount = await page.locator('#home-root [href]').count();
      const homeRootHtml = await page.locator('#home-root').innerHTML();
      const storageAtHomeLoad = await page.evaluate(storageSnapshot);
      const s1ConsoleErrors = homeConsoleErrors.slice();
      const s1PageErrors = pageErrors.slice();
      const homeUrl = page.url();
      s1 = productName === expectedDisplay.productName &&
        siteName === expectedDisplay.siteName &&
        tileCount === 1 && tileModuleId === 'reuma' &&
        emptyCount === 0 && errorCount === 0 &&
        anchorCount === 0 && hrefCount === 0 && !homeRootHtml.includes('.html') &&
        s1ConsoleErrors.length === 0 && s1PageErrors.length === 0 &&
        homeUrl === `${origin}/nexus_home.html`;
      s1Detail = `product=${JSON.stringify(productName)} site=${JSON.stringify(siteName)} ` +
        `tiles=${tileCount} moduleId=${tileModuleId} empty=${emptyCount} error=${errorCount} ` +
        `anchors=${anchorCount} href=${hrefCount} routeStrings=${homeRootHtml.includes('.html')} ` +
        `consoleErrors=${s1ConsoleErrors.length} pageErrors=${s1PageErrors.length}`;

      // --- S2 exact route + same-tab + Back ---
      await Promise.all([
        page.waitForURL((url) => url.origin === origin && url.pathname === '/index.html',
          { waitUntil: 'domcontentloaded', timeout: 30000 }),
        page.locator('.nexus-home__tile').first().click(),
      ]);
      const navigatedUrl = page.url();
      await page.waitForTimeout(800);
      const sameTab = context.pages().length === 1 && pagesOpened.length === 1;
      const legacyPageErrors = pageErrors.filter((e) => e.url.includes('/index.html'));
      const legacyStorage = await page.evaluate(storageSnapshot);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.locator('.nexus-home__tile').first().waitFor({ state: 'visible', timeout: 15000 });
      const tilesAfterBack = await page.locator('.nexus-home__tile').count();
      const homeReturnStorage = await page.evaluate(storageSnapshot);
      const expectedNavUrl = `${origin}/index.html`;
      s2 = navigatedUrl === expectedNavUrl &&
        sameTab &&
        legacyPageErrors.length === 0 &&
        tilesAfterBack === 1 &&
        homeConsoleErrors.length === 0;
      s2Detail = `navigated=${JSON.stringify(navigatedUrl)} expected=${JSON.stringify(expectedNavUrl)} ` +
        `sameTab=${sameTab} pagesOpened=${pagesOpened.length} tabs=${context.pages().length} ` +
        `legacyPageErrors=${legacyPageErrors.length} tilesAfterBack=${tilesAfterBack} ` +
        `homeConsoleErrors=${homeConsoleErrors.length}`;

      // --- S6 zero patient/dataset transport ---
      const isHomeRequest = (r) => r.frameUrl === '' || r.frameUrl === 'about:blank' ||
        r.frameUrl.includes('nexus_home.html');
      const homeRequests = observedRequests.filter(isHomeRequest);
      const homeTokenHits = homeRequests
        .filter((r) => CLINICAL_URL_TOKEN_RE.test(r.url)).map((r) => r.url);
      const legacyTokenHits = observedRequests
        .filter((r) => !isHomeRequest(r) && CLINICAL_URL_TOKEN_RE.test(r.url)).map((r) => r.url);
      const cookiesAfter = await context.cookies();
      const postMessageCalls = await page.evaluate(() => window.__f33PostMessageCalls);
      const navUrl = new URL(navigatedUrl);
      const storageHomeCleanOnLoad = JSON.stringify(storageAtHomeLoad) === JSON.stringify(storageBaseline);
      const storageHomeCleanOnReturn = JSON.stringify(homeReturnStorage) === JSON.stringify(legacyStorage);
      s6 = homeTokenHits.length === 0 &&
        storageHomeCleanOnLoad && storageHomeCleanOnReturn &&
        cookiesAfter.length === cookiesBefore.length &&
        postMessageCalls === 0 &&
        navUrl.search === '' && navUrl.hash === '';
      s6Detail = `homeRequests=${homeRequests.length} homeTokenHits=${JSON.stringify(homeTokenHits)} ` +
        `legacyTokenHits=${JSON.stringify(legacyTokenHits)} ` +
        `baseline=${JSON.stringify(storageBaseline)} atHomeLoad=${JSON.stringify(storageAtHomeLoad)} ` +
        `legacy=${JSON.stringify(legacyStorage)} afterReturn=${JSON.stringify(homeReturnStorage)} ` +
        `cookiesBefore=${cookiesBefore.length} cookiesAfter=${cookiesAfter.length} ` +
        `postMessage=${postMessageCalls} navSearch=${JSON.stringify(navUrl.search)} navHash=${JSON.stringify(navUrl.hash)}`;

      if (legacyTokenHits.length > 0) {
        console.log(`  [info] S6 legacy-page (not Home) token-bearing requests adjudicated: ${JSON.stringify(legacyTokenHits)}`);
      }
      if (legacyConsoleErrors.length > 0) {
        console.log(`  [info] S2 legacy-page console noise adjudicated: ${legacyConsoleErrors.join(' | ')}`);
      }
    } catch (err) {
      if (!s1Detail) { s1 = false; s1Detail = `session error: ${err.message}`; }
      if (!s2Detail) { s2 = false; s2Detail = `session error: ${err.message}`; }
      if (!s6Detail) { s6 = false; s6Detail = `session error: ${err.message}`; }
    } finally {
      if (context) await context.close();
    }
    record('S1 happy path: branding + only-qualified reuma tile + no routes + clean console', s1, s1Detail);
    record('S2 exact <origin>/index.html same-tab navigation + Back re-render', s2, s2Detail);
    record('S6 zero patient/dataset transport (requests, storage, cookies, postMessage)', s6, s6Detail);
  }

  // =========================================================================
  // S3 zero-navigable deployment -> explicit empty state.
  // =========================================================================
  {
    let pass = false;
    let detail = '';
    let context;
    try {
      overrides.clear();
      for (const [key, body] of buildZeroNavigableOverrides()) {
        overrides.set(key, { body, contentType: 'application/json; charset=utf-8' });
      }
      context = await browser.newContext();
      const page = await context.newPage();
      const pageErrors = [];
      const consoleErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      await page.goto(`${origin}/nexus_home.html`, { waitUntil: 'domcontentloaded' });
      await page.locator('.nexus-home__empty').first().waitFor({ state: 'visible', timeout: 15000 });
      const tiles = await page.locator('.nexus-home__tile').count();
      const empty = await page.locator('.nexus-home__empty').count();
      const errors = await page.locator('.nexus-home__error').count();
      pass = tiles === 0 && empty === 1 && errors === 0 &&
        pageErrors.length === 0 && consoleErrors.length === 0;
      detail = `tiles=${tiles} empty=${empty} errors=${errors} ` +
        `pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length}`;
    } catch (err) {
      pass = false;
      detail = `threw: ${err.message}`;
    } finally {
      if (context) await context.close();
    }
    const name = 'S3 zero-navigable deployment: explicit empty state, zero tiles, zero error';
    record(name, pass, detail);
  }

  // =========================================================================
  // S4 schema-invalid packaged manifest (siteId outside enum) -> fail closed.
  // =========================================================================
  {
    let pass = false;
    let detail = '';
    let context;
    try {
      overrides.clear();
      const tampered = readJson('data/platform/home/deployment-manifest.json');
      tampered.siteId = 'XYZ';
      overrides.set('/data/platform/home/deployment-manifest.json',
        { body: JSON.stringify(tampered, null, 2) + '\n', contentType: 'application/json; charset=utf-8' });
      context = await browser.newContext();
      const page = await context.newPage();
      const pageErrors = [];
      const consoleErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      await page.goto(`${origin}/nexus_home.html`, { waitUntil: 'domcontentloaded' });
      await page.locator('.nexus-home__error').first().waitFor({ state: 'visible', timeout: 15000 });
      const tiles = await page.locator('.nexus-home__tile').count();
      const errors = await page.locator('.nexus-home__error').count();
      const errorText = await page.locator('.nexus-home__error').first().innerText();
      pass = tiles === 0 && errors === 1 &&
        errorText.includes('MANIFEST_SCHEMA_INVALID') &&
        pageErrors.length === 0 && consoleErrors.length === 0;
      detail = `tiles=${tiles} errors=${errors} errorText=${JSON.stringify(errorText)} ` +
        `pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length}`;
      if (consoleErrors.length > 0) {
        console.log(`  [info] S4 console noise adjudicated: ${JSON.stringify(consoleErrors)}`);
      }
    } catch (err) {
      pass = false;
      detail = `threw: ${err.message}`;
    } finally {
      if (context) await context.close();
    }
    const name = 'S4 schema-invalid manifest (siteId enum): fail closed with MANIFEST_SCHEMA_INVALID, zero tiles';
    record(name, pass, detail);
  }

  // =========================================================================
  // S5 deployment-manifest.json HTTP 500 -> explicit error state.
  // =========================================================================
  {
    let pass = false;
    let detail = '';
    let context;
    try {
      overrides.clear();
      overrides.set('/data/platform/home/deployment-manifest.json',
        { status: 500, body: 'internal error', contentType: 'text/plain; charset=utf-8' });
      context = await browser.newContext();
      const page = await context.newPage();
      const pageErrors = [];
      const consoleErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      await page.goto(`${origin}/nexus_home.html`, { waitUntil: 'domcontentloaded' });
      await page.locator('.nexus-home__error').first().waitFor({ state: 'visible', timeout: 15000 });
      const tiles = await page.locator('.nexus-home__tile').count();
      const errors = await page.locator('.nexus-home__error').count();
      const errorText = await page.locator('.nexus-home__error').first().innerText();
      pass = tiles === 0 && errors === 1 &&
        errorText.includes('HOME_ARTIFACT_FETCH_FAILED') && pageErrors.length === 0;
      detail = `tiles=${tiles} errors=${errors} errorText=${JSON.stringify(errorText)} ` +
        `pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length}`;
      if (consoleErrors.length > 0) {
        console.log(`  [info] S5 500-response console noise adjudicated: ${JSON.stringify(consoleErrors)}`);
      }
    } catch (err) {
      pass = false;
      detail = `threw: ${err.message}`;
    } finally {
      if (context) await context.close();
    }
    const name = 'S5 deployment-manifest 500: explicit error state, zero tiles';
    record(name, pass, detail);
  }

  // =========================================================================
  // S7 dirty-draft non-interference.
  // =========================================================================
  {
    let pass = false;
    let detail = '';
    let context;
    try {
      overrides.clear();
      context = await browser.newContext();
      await context.addInitScript(postMessageInit);
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(`${page.url()}: ${error.message}`));

      // Seed a synthetic non-clinical draft on the origin BEFORE Home loads.
      await page.goto(`${origin}/index.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(300);
      await page.evaluate(() => {
        sessionStorage.setItem('fh_synthetic_draft', 'draft-v1');
        localStorage.setItem('fh_synthetic_draft', 'draft-v1');
      });
      const seeded = await page.evaluate(storageSnapshot);

      // Complete the S1/S2 flow from a Home entry after the draft exists.
      await page.goto(`${origin}/nexus_home.html`, { waitUntil: 'domcontentloaded' });
      await page.locator('.nexus-home__tile').first().waitFor({ state: 'visible', timeout: 15000 });
      const tileAtEntry = await page.locator('.nexus-home__tile').count();
      await Promise.all([
        page.waitForURL((url) => url.origin === origin && url.pathname === '/index.html',
          { waitUntil: 'domcontentloaded', timeout: 30000 }),
        page.locator('.nexus-home__tile').first().click(),
      ]);
      await page.waitForTimeout(500);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.locator('.nexus-home__tile').first().waitFor({ state: 'visible', timeout: 15000 });

      const after = await page.evaluate(() => ({
        ls: Object.keys(localStorage).sort(),
        ss: Object.keys(sessionStorage).sort(),
        draftSession: sessionStorage.getItem('fh_synthetic_draft'),
        draftLocal: localStorage.getItem('fh_synthetic_draft'),
      }));
      const draftPreserved = after.draftSession === 'draft-v1' && after.draftLocal === 'draft-v1';
      const noHomeKeys = JSON.stringify({ ls: after.ls, ss: after.ss }) ===
        JSON.stringify({ ls: seeded.ls, ss: seeded.ss });
      pass = tileAtEntry === 1 && draftPreserved && noHomeKeys && pageErrors.length === 0;
      detail = `tileAtEntry=${tileAtEntry} draftSession=${JSON.stringify(after.draftSession)} ` +
        `draftLocal=${JSON.stringify(after.draftLocal)} seeded=${JSON.stringify(seeded)} ` +
        `after=${JSON.stringify({ ls: after.ls, ss: after.ss })} ` +
        `draftPreserved=${draftPreserved} noHomeKeys=${noHomeKeys} pageErrors=${pageErrors.length}`;
    } catch (err) {
      pass = false;
      detail = `threw: ${err.message}`;
    } finally {
      if (context) await context.close();
    }
    const name = 'S7 synthetic draft survives Home session; Home adds no state keys';
    record(name, pass, detail);
  }

  // =========================================================================
  // S8 legacy direct entrypoints stay direct and do not reference Home.
  // =========================================================================
  {
    let pass = false;
    let detail = '';
    let context;
    try {
      overrides.clear();
      context = await browser.newContext();
      const page = await context.newPage();
      const pageErrors = [];
      const consoleNoise = [];
      page.on('pageerror', (error) => pageErrors.push(`${page.url()}: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') consoleNoise.push(`${page.url()}: ${message.text()}`);
      });
      const perPage = [];
      for (const file of ['index.html', 'farmacia_index.html']) {
        await page.goto(`${origin}/${file}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(800);
        const refs = await page.evaluate(() => Array.from(document.querySelectorAll('script[src], link[href]'))
          .map((el) => el.getAttribute('src') || el.getAttribute('href') || '')
          .filter(Boolean));
        const nexusRefs = refs.filter((ref) => ref.includes('nexus_home'));
        perPage.push({ file, url: page.url(), nexusRefs });
      }
      console.log(`  [info] S8 legacy console noise adjudicated: ${consoleNoise.length ? JSON.stringify(consoleNoise) : 'none'}`);
      pass = pageErrors.length === 0 && perPage.every((p) => p.nexusRefs.length === 0);
      detail = pageErrors.length === 0
        ? perPage.map((p) => `${p.file}: nexusRefs=${JSON.stringify(p.nexusRefs)}`).join('; ')
        : `pageErrors=${JSON.stringify(pageErrors)}; ${perPage.map((p) => `${p.file}: nexusRefs=${JSON.stringify(p.nexusRefs)}`).join('; ')}`;
    } catch (err) {
      pass = false;
      detail = `threw: ${err.message}`;
    } finally {
      if (context) await context.close();
    }
    const name = 'S8 legacy entrypoints load directly without pageerror and never reference nexus_home';
    record(name, pass, detail);
  }
} catch (err) {
  record('unexpected checker error', false, (err && err.stack) || String(err));
} finally {
  if (browser) await browser.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
}

console.log('\nENVIRONMENT');
console.log(`  Playwright: global (loaded from PATH/npx cache)`);
console.log(`  Chromium: ${chromiumVersion}`);
console.log(`  Headless: true`);
console.log(`  Node: ${process.version}`);
console.log(`  Server origin: ${origin}`);
console.log(`  Server port: ${serverPort}`);

const failed = results.filter((r) => !r.pass);
console.log(`\nRESULTADO: ${results.length - failed.length} OK / ${failed.length} FALLIDO`);
if (failed.length > 0) {
  console.log('FALLIDOS:');
  for (const f of failed) console.log(`  - ${f.name}`);
  console.log('F3.3 Home browser qualification FAILED');
  process.exit(1);
}
console.log('F3.3 Home browser qualification PASSED');
