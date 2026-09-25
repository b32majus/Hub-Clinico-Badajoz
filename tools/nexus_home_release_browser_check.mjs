#!/usr/bin/env node
'use strict';
/**
 * F3.4 Home release ARTIFACT browser qualification (issue #414, parent #409).
 *
 * This checker qualifies the ACTUAL release artifact, not the repository. It
 * first builds the release manifest with tools/home_release_build.mjs from the
 * real packaged inputs, then materializes a fresh artifact directory that
 * contains EXACTLY the declared release unit:
 *   - release.code.files (the frozen Home release code list),
 *   - the four packaged config artifacts (data/platform/home/*.json),
 *   - the release manifest itself (release-manifest.json).
 *
 * A static server exposes ONLY that artifact directory, so any request outside
 * the declared set resolves to 404: this is what enforces artifact
 * self-containment instead of asserting it on the rich repository tree.
 *
 * Scenarios (all must PASS):
 *   A0 Artifact materialization: the temp artifact directory contains exactly
 *      the declared release unit (code.files + config artifacts + manifest),
 *      no more and no less.
 *   A1 Artifact happy path: branding markers from the served deployment
 *      profile, exactly one tile (reuma), zero error elements, zero
 *      anchors/hrefs in #home-root, console.error === 0 and pageerror === 0.
 *   A2 Authorized route (same tab): a real click on the tile navigates to
 *      exactly <origin>/index.html (no query/hash), only one tab is ever
 *      opened. The route-target document is NOT part of the Home release unit
 *      (it is provided by the site deployment / legacy release), so the 404
 *      body is EXPECTED and adjudicated in the output; pageerror stays 0. A
 *      real page.goBack() then re-renders Home with its tile in the same tab.
 *   A3 Artifact self-containment: every observed request is inside the
 *      declared artifact set; the only non-artifact response allowed is the
 *      adjudicated 404 route target. No CDN/vendor/repository leakage.
 *
 * Real Chromium through Playwright; no DOM manipulation is used to fake state
 * (every read is a locator read; no page.evaluate is needed). Supported
 * user-level interactions only: goto, real click, real Back.
 *
 * This is browser QA and stays OUT of the deterministic verify:nexus gate
 * (NEXUS-DEBT-009). Exit code 0 = all scenarios PASS, 1 = at least one FAIL.
 * Usage: node tools/nexus_home_release_browser_check.mjs
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
const BUILDER = path.join(ROOT, 'tools', 'home_release_build.mjs');

// Real packaged inputs consumed by tools/home_release_build.mjs (identical to
// tools/home_release_check.mjs and the F3.3 harness).
const MANIFEST_INPUT = path.join(ROOT, 'data/platform/home/deployment-manifest.json');
const READINESS_INPUT = path.join(ROOT, 'data/platform/home/module-readiness.json');
const RELEASES_INPUT = path.join(ROOT, 'tools/fixtures/home/module-releases.json');

// The four packaged config artifacts the Home page fetches at runtime.
const CONFIG_ARTIFACTS = [
  'data/platform/home/module-registry.json',
  'data/platform/home/deployment-profile.json',
  'data/platform/home/deployment-manifest.json',
  'data/platform/home/module-readiness.json',
];
const PROFILE_ARTIFACT = 'data/platform/home/deployment-profile.json';

// Where the release manifest is placed inside the artifact under test. It is
// part of the release unit but is never fetched by Home at runtime.
const MANIFEST_ARTIFACT = 'release-manifest.json';

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

// The existing browser checkers resolve Playwright from PATH-provided npx
// installs. The global install layout (prefix/lib/node_modules) is added as a
// documented fallback so `node tools/nexus_home_release_browser_check.mjs`
// works without an explicit npx wrapper; no new dependency is introduced.
function loadPlaywrightFromNpx() {
  const tried = [];
  const tryNodeModules = (nodeModules) => {
    const pkg = path.join(nodeModules, 'playwright', 'package.json');
    tried.push(pkg);
    if (existsSync(pkg)) {
      return createRequire(path.join(nodeModules, '__nexus_home_f34_loader.cjs'))('playwright');
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
    '. Run with: npx --yes --package=playwright node tools/nexus_home_release_browser_check.mjs'
  );
}

// Documented Chromium executable fallbacks (identical to the other Nexus
// browser checkers): explicit env override, Playwright bundled path, MS cache.
function chromiumExecutable(chromium) {
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
// Materialize the ACTUAL release artifact from the real packaged inputs.
// ---------------------------------------------------------------------------

function buildReleaseManifest(outFile) {
  execFileSync('node', [BUILDER, MANIFEST_INPUT, READINESS_INPUT, RELEASES_INPUT, outFile], { stdio: 'pipe' });
  return JSON.parse(fs.readFileSync(outFile, 'utf8'));
}

function listFilesRecursive(root, current) {
  const base = current || root;
  const out = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const abs = path.join(base, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(root, abs));
    else if (entry.isFile()) out.push(path.relative(root, abs).split(path.sep).join('/'));
  }
  return out.sort();
}

let playwright;
try {
  playwright = loadPlaywrightFromNpx();
} catch (err) {
  console.error('ENVIRONMENT FAILURE: ' + err.message);
  console.log('\nRESULTADO: 0 OK / 1 FALLIDO');
  console.log('F3.4 Home release artifact browser qualification FAILED');
  process.exit(1);
}
const { chromium } = playwright;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-home-f34-artifact-'));
const artifactDir = path.join(tmpRoot, 'artifact');
let release = null;
let releaseId = 'unbuilt';
let materializeError = '';
const declaredPaths = new Set(['/' + MANIFEST_ARTIFACT]);
let routeTargetPath = '/index.html';

try {
  const manifestOut = path.join(tmpRoot, MANIFEST_ARTIFACT);
  release = buildReleaseManifest(manifestOut);
  releaseId = release.releaseId;

  // Copy exactly the declared release unit into a fresh artifact directory.
  for (const file of release.code.files) {
    const dest = path.join(artifactDir, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), dest);
    declaredPaths.add('/' + file);
  }
  for (const file of CONFIG_ARTIFACTS) {
    const dest = path.join(artifactDir, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), dest);
    declaredPaths.add('/' + file);
  }
  fs.copyFileSync(manifestOut, path.join(artifactDir, MANIFEST_ARTIFACT));

  // Route target derived from the manifest (reuma tile), never hard-coded.
  const reuma = (release.modules || []).find((m) => m.moduleId === 'reuma');
  if (reuma && typeof reuma.route === 'string') routeTargetPath = '/' + reuma.route;
} catch (err) {
  materializeError = err.message;
}

record(
  'A0 artifact materializes the declared release unit from the real packaged inputs',
  Boolean(release) && materializeError === '',
  materializeError || 'release manifest could not be built'
);

let a0Layout = false;
let a0Detail = '';
if (release) {
  const expected = [
    ...release.code.files,
    ...CONFIG_ARTIFACTS,
    MANIFEST_ARTIFACT,
  ].sort();
  const actual = listFilesRecursive(artifactDir);
  a0Layout = JSON.stringify(actual) === JSON.stringify(expected);
  a0Detail = `expected=${expected.length} actual=${actual.length}` +
    (a0Layout ? '' : ` extra/missing=${JSON.stringify(actual.filter((f) => !expected.includes(f)).concat(expected.filter((f) => !actual.includes(f))))}`);
} else {
  a0Detail = materializeError || 'no release manifest';
}
record('A0b artifact directory contains exactly the declared set (no extra files)', a0Layout, a0Detail);

// ---------------------------------------------------------------------------
// Static server over ONLY the artifact directory: anything else is a 404.
// ---------------------------------------------------------------------------

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

const served = [];

const server = createServer((request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.resolve(artifactDir, relative || 'nexus_home.html');
  const inside = file === artifactDir || file.startsWith(artifactDir + path.sep);
  let status = 404;
  let body = 'Not found';
  let ok = false;
  if (inside) {
    try {
      if (!statSync(file).isFile()) throw new Error('not_file');
      ok = true;
      status = 200;
      body = '';
      response.writeHead(200, {
        'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      createReadStream(file).pipe(response);
    } catch {
      ok = false;
    }
  }
  served.push({ pathname, status: ok ? 200 : 404, servedFile: ok ? path.relative(artifactDir, file).split(path.sep).join('/') : null });
  if (!ok) {
    response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    response.end(body);
  }
});

if (!release) {
  console.log('\nRESULTADO: 1 OK / 1 FALLIDO');
  console.log('FALLIDOS:');
  console.log('  - A0 artifact materializes the declared release unit from the real packaged inputs');
  console.log('F3.4 Home release artifact browser qualification FAILED');
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  process.exit(1);
}

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;

let browser;
let chromiumVersion = 'not launched';
try {
  browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable(chromium) });
  chromiumVersion = browser.version();

  // =========================================================================
  // A1 + A2 + A3 — one real Home session in a single tab, on the artifact.
  // =========================================================================
  {
    let a1 = false;
    let a2 = false;
    let a3 = false;
    let a1Detail = '';
    let a2Detail = '';
    let a3Detail = '';
    let context;
    try {
      context = await browser.newContext();
      // Registered before the first page exists so every tab ever opened in
      // this context is counted (a Home-opened tab would add an entry).
      const pagesOpened = [];
      context.on('page', (opened) => pagesOpened.push(opened));
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(`${page.url()}: ${message.text()}`);
      });
      page.on('pageerror', (error) => pageErrors.push({ url: page.url(), message: error.message }));
      const observedRequests = [];
      page.on('request', (request) => observedRequests.push(request.url()));

      const expectedDisplay = JSON.parse(fs.readFileSync(path.join(artifactDir, PROFILE_ARTIFACT), 'utf8')).display;
      const homeUrl = `${origin}/nexus_home.html`;

      // Browser-level origin warm-up. Chromium issues its single implicit
      // browser-level /favicon.ico request on the first document of an origin;
      // that resource is NOT part of the Home release unit (the artifact
      // declares no icon) and is never Home-initiated. Warming the origin on a
      // script-free 404 document, then resetting the buffers, keeps A1's
      // console.error === 0 measuring the Home document itself. The warm-up
      // navigation is outside Home and is not part of the collected A1/A2 set.
      await page.goto(`${origin}/__f34_origin_warmup__`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);
      const warmupConsoleErrors = consoleErrors.slice();
      const warmupServed = served.slice();
      consoleErrors.length = 0;
      pageErrors.length = 0;
      observedRequests.length = 0;

      // --- A1 artifact happy path ---
      await page.goto(homeUrl, { waitUntil: 'domcontentloaded' });
      await page.locator('.nexus-home__tile').first().waitFor({ state: 'visible', timeout: 15000 });
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
      const urlAfterLoad = page.url();
      const homeConsoleErrors = consoleErrors.slice();
      const homePageErrors = pageErrors.slice();
      const faviconWarmup = warmupServed.filter((s) => s.pathname === '/favicon.ico');
      if (faviconWarmup.length > 0) {
        console.log(`  [info] browser-level /favicon.ico is outside the Home release unit; ` +
          `warmed up before A1 with status=${faviconWarmup[faviconWarmup.length - 1].status} ` +
          `(warmup console errors adjudicated: ${JSON.stringify(warmupConsoleErrors.length)})`);
      }
      a1 = productName === expectedDisplay.productName &&
        siteName === expectedDisplay.siteName &&
        tileCount === 1 && tileModuleId === 'reuma' &&
        emptyCount === 0 && errorCount === 0 &&
        anchorCount === 0 && hrefCount === 0 && !homeRootHtml.includes('.html') &&
        homeConsoleErrors.length === 0 && homePageErrors.length === 0 &&
        urlAfterLoad === homeUrl;
      a1Detail = `product=${JSON.stringify(productName)} site=${JSON.stringify(siteName)} ` +
        `tiles=${tileCount} moduleId=${tileModuleId} empty=${emptyCount} error=${errorCount} ` +
        `anchors=${anchorCount} href=${hrefCount} routeStrings=${homeRootHtml.includes('.html')} ` +
        `consoleErrors=${homeConsoleErrors.length}${homeConsoleErrors.length ? ` (${JSON.stringify(homeConsoleErrors)})` : ''} ` +
        `pageErrors=${homePageErrors.length} url=${JSON.stringify(urlAfterLoad)}`;

      // --- A2 authorized route (same tab) + real Back ---
      const consoleBeforeNav = consoleErrors.length;
      await Promise.all([
        page.waitForURL((url) => url.origin === origin && url.pathname === routeTargetPath,
          { waitUntil: 'domcontentloaded', timeout: 30000 }),
        page.locator('.nexus-home__tile').first().click(),
      ]);
      const navigatedUrl = page.url();
      await page.waitForTimeout(500);
      const navigated = new URL(navigatedUrl);
      const sameTab = context.pages().length === 1 && pagesOpened.length === 1;
      const routeTargetServed = served.filter((s) => s.pathname === routeTargetPath);
      const routeTargetStatus = routeTargetServed.length > 0 ? routeTargetServed[routeTargetServed.length - 1].status : null;
      const routeTargetBody = await page.locator('body').innerText().catch(() => '');
      const pageErrorsOnRoute = pageErrors.filter((e) => e.url.includes(routeTargetPath)).length;
      const routeConsoleErrors = consoleErrors.slice(consoleBeforeNav);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.locator('.nexus-home__tile').first().waitFor({ state: 'visible', timeout: 15000 });
      const tilesAfterBack = await page.locator('.nexus-home__tile').count();
      const urlAfterBack = page.url();
      const backConsoleErrors = consoleErrors.slice(consoleBeforeNav + routeConsoleErrors.length);
      const postHomeConsoleErrors = consoleErrors.slice(homeConsoleErrors.length);

      // The route target is NOT part of the Home release unit, so a 404 is the
      // expected, honest boundary. It is adjudicated here, never faked: the
      // 404 document may legitimately log a resource error, and that is the
      // only post-Home console error allowed.
      console.log(`  [info] A2 route target ${routeTargetPath} is outside the Home release unit; ` +
        `served status=${routeTargetStatus} (404 expected), body=${JSON.stringify(routeTargetBody.trim())}`);
      if (routeConsoleErrors.length > 0 || backConsoleErrors.length > 0) {
        console.log(`  [info] A2 console errors adjudicated (route-target 404 document only): ` +
          `${JSON.stringify(routeConsoleErrors.concat(backConsoleErrors))}`);
      }
      const postHomeErrorsAdjudicated = postHomeConsoleErrors.every(
        (message) => message.includes(routeTargetPath) && /404/.test(message)
      );
      a2 = navigatedUrl === `${origin}${routeTargetPath}` &&
        navigated.pathname === '/index.html' &&
        navigated.search === '' && navigated.hash === '' &&
        sameTab && routeTargetStatus === 404 &&
        pageErrors.length === 0 &&
        postHomeErrorsAdjudicated &&
        tilesAfterBack === 1 && urlAfterBack === homeUrl;
      a2Detail = `navigated=${JSON.stringify(navigatedUrl)} expected=${JSON.stringify(`${origin}${routeTargetPath}`)} ` +
        `pathname=${JSON.stringify(navigated.pathname)} search=${JSON.stringify(navigated.search)} hash=${JSON.stringify(navigated.hash)} ` +
        `sameTab=${sameTab} pagesOpened=${pagesOpened.length} tabs=${context.pages().length} ` +
        `routeTargetStatus=${routeTargetStatus} pageErrorsOnRoute=${pageErrorsOnRoute} ` +
        `tilesAfterBack=${tilesAfterBack} urlAfterBack=${JSON.stringify(urlAfterBack)} ` +
        `postHomeConsoleErrors=${postHomeConsoleErrors.length} postHomeErrorsAdjudicated=${postHomeErrorsAdjudicated} ` +
        `pageErrors=${pageErrors.length}`;

      // --- A3 artifact self-containment ---
      const homeRequests = observedRequests.filter((u) => {
        const parsed = new URL(u);
        return parsed.origin === origin;
      });
      const externalRequests = observedRequests.filter((u) => new URL(u).origin !== origin);
      const violations = [];
      const adjudicated = [];
      for (const u of homeRequests) {
        const pathname = new URL(u).pathname;
        if (declaredPaths.has(pathname)) continue;
        if (pathname === routeTargetPath) { adjudicated.push(pathname); continue; }
        violations.push(pathname);
      }
      a3 = externalRequests.length === 0 && violations.length === 0;
      a3Detail = `homeRequests=${homeRequests.length} declaredPaths=${declaredPaths.size} ` +
        `adjudicatedRouteTarget=${JSON.stringify([...new Set(adjudicated)])} ` +
        `violations=${JSON.stringify([...new Set(violations)])} ` +
        `externalRequests=${JSON.stringify(externalRequests)} ` +
        `observed=${JSON.stringify([...new Set(homeRequests.map((u) => new URL(u).pathname))].sort())}`;
    } catch (err) {
      if (!a1Detail) { a1 = false; a1Detail = `session error: ${err.message}`; }
      if (!a2Detail) { a2 = false; a2Detail = `session error: ${err.message}`; }
      if (!a3Detail) { a3 = false; a3Detail = `session error: ${err.message}`; }
    } finally {
      if (context) await context.close();
    }
    record('A1 artifact happy path: branding + exactly one reuma tile + no routes + clean console', a1, a1Detail);
    record('A2 authorized route <origin>/index.html same-tab (404 target adjudicated) + real Back re-render', a2, a2Detail);
    record('A3 artifact self-containment: no request outside the declared release unit (except the 404 route target)', a3, a3Detail);
  }
} catch (err) {
  record('unexpected checker error', false, (err && err.stack) || String(err));
} finally {
  if (browser) await browser.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
}

console.log('\nENVIRONMENT');
console.log('  Playwright: global (loaded from PATH/npx cache)');
console.log(`  Chromium: ${chromiumVersion}`);
console.log('  Headless: true');
console.log(`  Node: ${process.version}`);
console.log(`  Server port: ${port}`);
console.log(`  Release id: ${releaseId}`);
console.log(`  Artifact root: ${artifactDir}`);

const failed = results.filter((r) => !r.pass);
console.log(`\nRESULTADO: ${results.length - failed.length} OK / ${failed.length} FALLIDO`);
if (failed.length > 0) {
  console.log('FALLIDOS:');
  for (const f of failed) console.log(`  - ${f.name}`);
  console.log('F3.4 Home release artifact browser qualification FAILED');
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  process.exit(1);
}
console.log('F3.4 Home release artifact browser qualification PASSED');
fs.rmSync(tmpRoot, { recursive: true, force: true });
