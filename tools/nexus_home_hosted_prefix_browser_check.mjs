#!/usr/bin/env node
'use strict';
/**
 * Hosted project-prefix browser QA for WO-NEXUS-PAGES-CUTOVER-T2 (issue #605,
 * train #606): the real materialized static files served at exactly
 * http://127.0.0.1:<port>/Hub-Clinico-Badajoz/ (project path, not domain
 * root), exercised through supported interactions only.
 *
 * Scenarios (all must PASS):
 *   H1 Project root and explicit index.html both load the real Home: branding
 *      markers, exactly the two available tiles (reuma + farmacia), zero
 *      error, zero anchor/href/route in #home-root, no Reuma session gate.
 *   H2 Direct loads work and survive refresh: nexus_home.html (Home),
 *      reuma_index.html (real Reuma gate, no session) and farmacia_index.html
 *      (Farmacia shell) each load with pageerror 0 and reload cleanly.
 *   H3 Home fetches all four packaged JSON configuration artifacts and its
 *      assets (css + platform/home scripts) with HTTP 200 under the prefix.
 *   H4 Reuma tile click navigates same-tab to exactly
 *      /Hub-Clinico-Badajoz/reuma_index.html (no query/hash, one tab only);
 *      the real professional gate is enforced (negative: no session => gate
 *      visible, no bypass, no navigation away); browser Back restores Home.
 *   H5 Farmacia tile click reaches /Hub-Clinico-Badajoz/farmacia_index.html;
 *      then Informes (supported switcher) -> Cosentyx Q2 and Q4 (six
 *      categories, unique counts never the blind sum, explicit Q4 motive) and
 *      Kisqali Mensual + Historico, each producing a REAL xlsx download (PK
 *      zip container, expected sheets/filenames).
 *   H6 Fail-closed negatives: manifest HTTP 500 and schema-inconsistent
 *      manifest each render the explicit nexus-home__error carrying the
 *      stable code, zero tiles, and never navigate anywhere fabricated.
 *   H7 Hygiene on every positive page: console.error = 0, pageerror = 0, no
 *      unexpected 404, no origin-root asset path, no new external dependency
 *      (only the pages' own pre-existing CDN assets).
 *
 * No DOM tampering, no monkeypatched fixtures, no suppressed console. The
 * Farmacia expectations reuse the hand-derived literals already accepted by
 * tools/farmacia_cosentyx_informe_browser_check.mjs. Synthetic data only.
 *
 * Usage: node tools/nexus_home_hosted_prefix_browser_check.mjs
 * Documented env var: PLAYWRIGHT_CHROMIUM_EXECUTABLE (headless-shell path).
 * Exit code 0 = every case PASS, 1 = at least one FAIL or environment failure.
 */

import { createReadStream, existsSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const PROJECT = '/Hub-Clinico-Badajoz';

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function loadPlaywrightFromNpx() {
  const tryNodeModules = (nodeModules) => {
    const pkg = path.join(nodeModules, 'playwright', 'package.json');
    return existsSync(pkg) ? createRequire(path.join(nodeModules, '__nexus_hosted_prefix_loader.cjs'))('playwright') : null;
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
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/nexus_home_hosted_prefix_browser_check.mjs');
}

let chromium;
try {
  ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
  console.error('ENVIRONMENT FAILURE: ' + err.message);
  console.log('\nRESULTADO: 0 OK / 1 FALLIDO');
  console.log('HOSTED-PREFIX-BROWSER: FAIL 0/0');
  process.exit(1);
}

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
// Static server: the real repository files, exposed ONLY under the project
// path. Anything outside the prefix is a 404 (never a fallback).
// ---------------------------------------------------------------------------

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'],
]);

// full pathname -> { status?, body?, contentType? }
const overrides = new Map();

const notFoundPaths = [];

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
  if (pathname !== PROJECT && !pathname.startsWith(`${PROJECT}/`)) {
    notFoundPaths.push(pathname);
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  let relative = decodeURIComponent(pathname.slice(PROJECT.length)).replace(/^\/+/, '');
  if (relative === '') relative = 'index.html';
  const file = path.resolve(ROOT, relative);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return response.writeHead(403).end();
  try {
    if (!fs.statSync(file).isFile()) throw new Error('not_file');
    response.writeHead(200, {
      'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(response);
  } catch {
    notFoundPaths.push(pathname);
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const origin = `http://127.0.0.1:${server.address().port}`;
const BASE = `${origin}${PROJECT}/`;
const serverPort = server.address().port;

// Accepted hand-derived literals (same as
// tools/farmacia_cosentyx_informe_browser_check.mjs): six Cosentyx categories
// with unique counts (never the blind sum) and the explicit Q4 motive.
const CATEGORY_LABELS = [
  'PsO — nuevos inicios', 'PsA — nuevos inicios',
  'HS — nuevos inicios q2w', 'HS — intensificaciones q4w → q2w',
  'HS — reducción de frecuencia q2w → q4w', 'HS — discontinuaciones q2w',
];
const Q2_COUNTS = [2, 2, 3, 2, 2, 0];
const Q2_UNIQUE = 8;
const Q4_COUNTS = [0, 0, 0, 0, 0, 1];
const Q4_UNIQUE = 1;
const Q4_MOTIVE = 'Decisión clínica documentada';

const consoleErrors = [];
const pageErrors = [];
const responses = [];

function trackPage(page) {
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`${page.url()} :: ${message.text()}`);
  });
  page.on('pageerror', (error) => pageErrors.push(`${page.url()} :: ${error.message}`));
  page.on('response', (response) => {
    responses.push({ url: response.url(), status: response.status() });
  });
  return page;
}

function normRow(row) {
  const copy = row.map((cell) => (cell === undefined ? '' : cell));
  while (copy.length && copy[copy.length - 1] === '') copy.pop();
  return copy;
}

function readResumenCounts(workbook) {
  const resumen = XLSX.utils.sheet_to_json(workbook.Sheets['Resumen'], { header: 1, defval: '' }).map(normRow);
  const headerIndex = resumen.findIndex((row) => row[0] === 'Categoría' && row[1] === 'Pacientes');
  if (headerIndex === -1) throw new Error('Resumen lacks the Categoría/Pacientes table');
  const categoryRows = resumen.slice(headerIndex + 1, headerIndex + 7);
  const uniqueRow = resumen.find((row) => row[0] === 'Total pacientes únicos incluidos');
  if (!uniqueRow) throw new Error('Resumen lacks the unique-total row');
  return { categoryRows, unique: uniqueRow[1], resumen };
}

async function downloadWorkbook(page, buttonSelector, expectedFilename) {
  const downloadPromise = page.waitForEvent('download');
  await page.locator(buttonSelector).click();
  const download = await downloadPromise;
  const name = download.suggestedFilename();
  if (!expectedFilename.test(name)) throw new Error(`unexpected filename ${JSON.stringify(name)}`);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);
  if (buffer.subarray(0, 2).toString('latin1') !== 'PK') throw new Error('download is not a real xlsx zip container');
  return XLSX.read(new Uint8Array(buffer), { type: 'array' });
}

let browser;
let chromiumVersion = 'not launched';
try {
  browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
  chromiumVersion = browser.version();
  const expectedDisplay = readJson('data/platform/home/deployment-profile.json').display;

  async function assertHomeDocument(page, label) {
    await page.locator('.nexus-home__tile').first().waitFor({ state: 'visible', timeout: 15000 });
    const productName = await page.locator('.nexus-home__product-name').innerText();
    const siteName = await page.locator('.nexus-home__site-name').innerText();
    const tiles = await page.locator('.nexus-home__tile').count();
    const reuma = await page.locator('.nexus-home__tile[data-module-id="reuma"]').count();
    const farmacia = await page.locator('.nexus-home__tile[data-module-id="farmacia"]').count();
    const errors = await page.locator('.nexus-home__error').count();
    const anchors = await page.locator('#home-root a').count();
    const hrefs = await page.locator('#home-root [href]').count();
    const gate = await page.evaluate(() => !!document.getElementById('sessionGate'));
    const homeRootHtml = await page.locator('#home-root').innerHTML();
    const ok = productName === expectedDisplay.productName && siteName === expectedDisplay.siteName &&
      tiles === 2 && reuma === 1 && farmacia === 1 && errors === 0 &&
      anchors === 0 && hrefs === 0 && !homeRootHtml.includes('.html') && gate === false;
    return {
      ok,
      detail: `${label}: product=${JSON.stringify(productName)} site=${JSON.stringify(siteName)} ` +
        `tiles=${tiles} reuma=${reuma} farmacia=${farmacia} errors=${errors} anchors=${anchors} ` +
        `hrefs=${hrefs} routeStrings=${homeRootHtml.includes('.html')} sessionGate=${gate}`,
    };
  }

  // =========================================================================
  // H1 project root + explicit index.html are the real Home.
  // =========================================================================
  {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = trackPage(await context.newPage());
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    const rootResult = await assertHomeDocument(page, 'root');
    record('H1a project root loads the real Home (reuma + farmacia tiles, no gate)', rootResult.ok, rootResult.detail);
    const rootUrl = page.url();
    record('H1b project root URL stays on the project path', rootUrl === BASE, `url=${rootUrl}`);
    await page.goto(`${BASE}index.html`, { waitUntil: 'domcontentloaded' });
    const explicitResult = await assertHomeDocument(page, 'index.html');
    record('H1c explicit index.html loads the same real Home', explicitResult.ok, explicitResult.detail);
    await context.close();
  }

  // =========================================================================
  // H2 direct loads + refresh: nexus_home / reuma_index / farmacia_index.
  // =========================================================================
  {
    const context = await browser.newContext();
    const page = trackPage(await context.newPage());
    await page.goto(`${BASE}nexus_home.html`, { waitUntil: 'domcontentloaded' });
    const alt = await assertHomeDocument(page, 'nexus_home.html');
    record('H2a nexus_home.html alternate Home entrypoint loads', alt.ok, alt.detail);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const altReload = await assertHomeDocument(page, 'nexus_home.html@reload');
    record('H2b nexus_home.html survives refresh', altReload.ok, altReload.detail);

    await page.goto(`${BASE}reuma_index.html`, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(800);
    const reumaGate = await page.evaluate(() => {
      const gate = document.getElementById('sessionGate');
      return { present: !!gate, hidden: gate ? gate.classList.contains('hidden') : null, title: document.title };
    });
    record('H2c reuma_index.html direct-load enforces the professional gate (no session)',
      page.url() === `${BASE}reuma_index.html` && reumaGate.present && reumaGate.hidden === false,
      `url=${page.url()} gate=${JSON.stringify(reumaGate)}`);
    await page.reload({ waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(800);
    const reumaGateReload = await page.evaluate(() => {
      const gate = document.getElementById('sessionGate');
      return { present: !!gate, hidden: gate ? gate.classList.contains('hidden') : null };
    });
    record('H2d reuma_index.html gate survives refresh without bypass',
      page.url() === `${BASE}reuma_index.html` && reumaGateReload.present && reumaGateReload.hidden === false,
      `url=${page.url()} gate=${JSON.stringify(reumaGateReload)}`);

    await page.goto(`${BASE}farmacia_index.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(800);
    const farmaciaMarker = await page.evaluate(() => ({
      statsLink: !!document.querySelector('a.nav-link[href="farmacia_estadisticas.html"]'),
      reumaBack: (() => {
        const links = Array.from(document.querySelectorAll('a.nav-link'));
        const hit = links.find((a) => /reumatolog/i.test(a.textContent || ''));
        return hit ? hit.getAttribute('href') : null;
      })(),
    }));
    record('H2e farmacia_index.html direct-load renders the Farmacia shell',
      page.url() === `${BASE}farmacia_index.html` && farmaciaMarker.statsLink === true &&
      farmaciaMarker.reumaBack === 'reuma_index.html',
      `url=${page.url()} marker=${JSON.stringify(farmaciaMarker)}`);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(800);
    const farmaciaReload = await page.evaluate(() =>
      !!document.querySelector('a.nav-link[href="farmacia_estadisticas.html"]'));
    record('H2f farmacia_index.html survives refresh', page.url() === `${BASE}farmacia_index.html` && farmaciaReload,
      `url=${page.url()} statsLink=${farmaciaReload}`);
    await context.close();
  }

  // =========================================================================
  // H3 packaged artifacts + assets are HTTP 200 under the prefix.
  // =========================================================================
  {
    const wanted = [
      'data/platform/home/module-registry.json',
      'data/platform/home/deployment-profile.json',
      'data/platform/home/deployment-manifest.json',
      'data/platform/home/module-readiness.json',
      'nexus_home.css',
      'modules/platform/configuration-repository.js',
      'modules/platform/platform-context.js',
      'modules/home/home-schema-validators.generated.js',
      'modules/home/home-bootstrap.js',
      'modules/home/home-renderer.js',
      'modules/home/home-page.js',
    ];
    const missing = [];
    for (const file of wanted) {
      const hit = responses.find((r) => r.url === `${BASE}${file}`);
      if (!hit) missing.push(`${file}: not requested`);
      else if (hit.status !== 200) missing.push(`${file}: HTTP ${hit.status}`);
    }
    record('H3 Home fetches all four packaged JSON artifacts + assets with HTTP 200',
      missing.length === 0, missing.length === 0 ? `${wanted.length} artifacts/assets 200` : missing.join('; '));
  }

  // =========================================================================
  // H4 Reuma tile: same-tab route, gate enforced, Back restores Home.
  // =========================================================================
  {
    const context = await browser.newContext();
    const pagesOpened = [];
    context.on('page', (opened) => pagesOpened.push(opened));
    const page = trackPage(await context.newPage());
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.locator('.nexus-home__tile').first().waitFor({ state: 'visible', timeout: 15000 });
    await Promise.all([
      page.waitForURL((url) => url.origin === origin && url.pathname === `${PROJECT}/reuma_index.html`,
        { waitUntil: 'load', timeout: 30000 }),
      page.locator('.nexus-home__tile[data-module-id="reuma"]').click(),
    ]);
    const navigatedUrl = page.url();
    const navigatedParsed = new URL(navigatedUrl);
    await page.waitForTimeout(800);
    const gate = await page.evaluate(() => {
      const el = document.getElementById('sessionGate');
      return { present: !!el, hidden: el ? el.classList.contains('hidden') : null };
    });
    const stored = await page.evaluate(() => localStorage.getItem('hubSelectedProfessional'));
    record('H4a Reuma tile navigates same-tab to exactly /Hub-Clinico-Badajoz/reuma_index.html',
      navigatedUrl === `${BASE}reuma_index.html` && navigatedParsed.search === '' && navigatedParsed.hash === '' &&
      context.pages().length === 1 && pagesOpened.length === 1,
      `url=${navigatedUrl} tabs=${context.pages().length} opened=${pagesOpened.length}`);
    record('H4b professional gate enforced on the renamed entry (no session => gate, no bypass)',
      gate.present && gate.hidden === false && stored === null,
      `gate=${JSON.stringify(gate)} stored=${JSON.stringify(stored)} url=${page.url()}`);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.locator('.nexus-home__tile').first().waitFor({ state: 'visible', timeout: 15000 });
    const backTiles = await page.locator('.nexus-home__tile').count();
    record('H4c browser Back restores Home with both tiles', page.url() === BASE && backTiles === 2,
      `url=${page.url()} tiles=${backTiles}`);
    await context.close();
  }

  // =========================================================================
  // H5 Farmacia tile -> Informes: Cosentyx Q2/Q4 + Kisqali Mensual/Historico
  // real XLSX downloads.
  // =========================================================================
  {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = trackPage(await context.newPage());
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.locator('.nexus-home__tile').first().waitFor({ state: 'visible', timeout: 15000 });
    await Promise.all([
      page.waitForURL((url) => url.origin === origin && url.pathname === `${PROJECT}/farmacia_index.html`,
        { waitUntil: 'domcontentloaded', timeout: 30000 }),
      page.locator('.nexus-home__tile[data-module-id="farmacia"]').click(),
    ]);
    const farmaciaUrl = page.url();
    record('H5a Farmacia tile reaches /Hub-Clinico-Badajoz/farmacia_index.html',
      farmaciaUrl === `${BASE}farmacia_index.html`, `url=${farmaciaUrl}`);

    await Promise.all([
      page.waitForURL((url) => url.pathname === `${PROJECT}/farmacia_estadisticas.html`,
        { waitUntil: 'domcontentloaded', timeout: 30000 }),
      page.locator('a.nav-link[href="farmacia_estadisticas.html"]').click(),
    ]);
    await page.waitForFunction(() => {
      const state = window.FarmaciaStatisticsDashboard?.getState();
      return state?.source_mode === 'demo' && state?.patient_count === 3;
    }, null, { timeout: 30000 });
    await page.locator('#informes-view-btn').click();
    await page.waitForFunction(() =>
      document.querySelector('main.main-content').classList.contains('farmacia-informes-mode'));

    // --- Cosentyx Q4 (default latest fixture period) ---
    await page.locator('#informes-drug-select').selectOption('cosentyx');
    await page.locator('#informes-report-select').selectOption('cosentyx');
    await page.locator('#informes-view-report').click();
    await page.waitForFunction(() => !document.getElementById('informes-cosentyx-panel').hidden, null, { timeout: 15000 });
    const q4Workbook = await downloadWorkbook(page, '#informes-download-xlsx', /^informe_trimestral_cosentyx_2026-Q4\.xlsx$/);
    {
      const sheetsOk = JSON.stringify(q4Workbook.SheetNames) === JSON.stringify(['Resumen', 'Detalle']);
      const { categoryRows, unique } = readResumenCounts(q4Workbook);
      const countsOk = JSON.stringify(categoryRows.map((r) => [r[0], r[1]])) ===
        JSON.stringify(CATEGORY_LABELS.map((label, i) => [label, Q4_COUNTS[i]]));
      const detalle = XLSX.utils.sheet_to_json(q4Workbook.Sheets['Detalle'], { header: 1, defval: '' }).map(normRow);
      const motiveOk = detalle.slice(1).some((row) => row.includes(Q4_MOTIVE));
      record('H5b Cosentyx Q4 real XLSX: six categories, unique 1 (not a sum), explicit motive',
        sheetsOk && countsOk && unique === Q4_UNIQUE && motiveOk && detalle.length - 1 === 1,
        `sheets=${JSON.stringify(q4Workbook.SheetNames)} unique=${unique} motive=${motiveOk} rows=${detalle.length - 1}`);
    }

    // --- Cosentyx Q2 ---
    await page.locator('#informes-quarter-select').selectOption('2026-Q2');
    await page.waitForFunction(() =>
      document.getElementById('informes-period').textContent.trim() === '2026-Q2', null, { timeout: 15000 });
    const q2Workbook = await downloadWorkbook(page, '#informes-download-xlsx', /^informe_trimestral_cosentyx_2026-Q2\.xlsx$/);
    {
      const sheetsOk = JSON.stringify(q2Workbook.SheetNames) === JSON.stringify(['Resumen', 'Detalle']);
      const { categoryRows, unique } = readResumenCounts(q2Workbook);
      const countsOk = JSON.stringify(categoryRows.map((r) => [r[0], r[1]])) ===
        JSON.stringify(CATEGORY_LABELS.map((label, i) => [label, Q2_COUNTS[i]]));
      const detalle = XLSX.utils.sheet_to_json(q2Workbook.Sheets['Detalle'], { header: 1, defval: '' }).map(normRow);
      record('H5c Cosentyx Q2 real XLSX: six categories, unique 8 across 11 rows (not the blind sum 11)',
        sheetsOk && countsOk && unique === Q2_UNIQUE && detalle.length - 1 === 11,
        `unique=${unique} rows=${detalle.length - 1} counts=${JSON.stringify(categoryRows.map((r) => r[1]))}`);
    }

    // --- Kisqali Mensual (latest fixture month) + Historico ---
    await page.locator('#informes-drug-select').selectOption('kisqali');
    await page.locator('#informes-report-select').selectOption('kisqali');
    await page.locator('#informes-view-report').click();
    await page.waitForFunction(() => !document.getElementById('informes-kisqali-panel').hidden, null, { timeout: 15000 });
    const mensualWorkbook = await downloadWorkbook(page, '#kisqali-download-xlsx', /^informe_kisqali_utilizacion_dosis_mensual_2026-06\.xlsx$/);
    {
      const sheetsOk = JSON.stringify(mensualWorkbook.SheetNames) === JSON.stringify(['Resumen', 'Pacientes', 'Ciclos']);
      const pacientes = XLSX.utils.sheet_to_json(mensualWorkbook.Sheets['Pacientes'], { header: 1, defval: '' });
      record('H5d Kisqali Mensual real XLSX (Resumen/Pacientes/Ciclos, 3 observed patients)',
        sheetsOk && pacientes.length - 1 === 3,
        `sheets=${JSON.stringify(mensualWorkbook.SheetNames)} pacientes=${pacientes.length - 1}`);
    }
    await page.locator('#kisqali-mode-select').selectOption('historico');
    await page.waitForFunction(() => document.getElementById('kisqali-period-select').hidden, null, { timeout: 15000 });
    const historicoWorkbook = await downloadWorkbook(page, '#kisqali-download-xlsx', /^informe_kisqali_utilizacion_dosis_historico\.xlsx$/);
    {
      const sheetsOk = JSON.stringify(historicoWorkbook.SheetNames) === JSON.stringify(['Resumen', 'Pacientes', 'Ciclos']);
      const pacientes = XLSX.utils.sheet_to_json(historicoWorkbook.Sheets['Pacientes'], { header: 1, defval: '' });
      const ciclos = XLSX.utils.sheet_to_json(historicoWorkbook.Sheets['Ciclos'], { header: 1, defval: '' });
      record('H5e Kisqali Historico real XLSX (7 patients, every explicit cycle = 22)',
        sheetsOk && pacientes.length - 1 === 7 && ciclos.length - 1 === 22,
        `pacientes=${pacientes.length - 1} ciclos=${ciclos.length - 1}`);
    }
    await context.close();
  }

  // =========================================================================
  // H6 fail-closed negatives: manifest 500 + schema-inconsistent manifest.
  // Negative-scenario console/pageerror/response noise is fenced off from the
  // H7 positive-flow hygiene below.
  // =========================================================================
  const hygieneCutoff = { console: consoleErrors.length, page: pageErrors.length, responses: responses.length };
  async function assertHomeError(label, setupOverride, expectedCode) {
    overrides.clear();
    overrides.set(`${PROJECT}/data/platform/home/deployment-manifest.json`, setupOverride);
    const context = await browser.newContext();
    const page = trackPage(await context.newPage());
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.locator('.nexus-home__error').first().waitFor({ state: 'visible', timeout: 15000 });
    const tiles = await page.locator('.nexus-home__tile').count();
    const errors = await page.locator('.nexus-home__error').count();
    const errorText = await page.locator('.nexus-home__error').first().innerText();
    const navigated = page.url() !== BASE;
    record(label, tiles === 0 && errors === 1 && errorText.includes(expectedCode) && !navigated,
      `tiles=${tiles} errors=${errors} code=${JSON.stringify(errorText.slice(0, 120))} navigated=${navigated}`);
    await context.close();
    overrides.clear();
  }
  await assertHomeError('H6a manifest HTTP 500: explicit error, zero tiles, no fabricated navigation',
    { status: 500, body: 'internal error', contentType: 'text/plain; charset=utf-8' }, 'HOME_ARTIFACT_FETCH_FAILED');
  {
    const tampered = readJson('data/platform/home/deployment-manifest.json');
    tampered.siteId = 'XYZ';
    await assertHomeError('H6b schema-inconsistent manifest: fail closed with MANIFEST_SCHEMA_INVALID',
      { body: `${JSON.stringify(tampered, null, 2)}\n` }, 'MANIFEST_SCHEMA_INVALID');
  }

  // =========================================================================
  // H7 hygiene across the positive flows.
  // =========================================================================
  {
    const positiveConsole = consoleErrors.slice(0, hygieneCutoff.console);
    const positivePages = pageErrors.slice(0, hygieneCutoff.page);
    const positiveResponses = responses.slice(0, hygieneCutoff.responses);
    const failing = positiveResponses.filter((r) => r.status >= 400);
    const failingAdjudicated = failing.filter((r) => {
      const url = new URL(r.url);
      if (url.origin !== origin) return true;
      return false;
    });
    const unexpected404 = failing.filter((r) => new URL(r.url).origin === origin);
    const originRootHits = positiveResponses
      .map((r) => new URL(r.url))
      .filter((u) => u.origin === origin && u.pathname !== PROJECT && !u.pathname.startsWith(`${PROJECT}/`))
      .map((u) => u.pathname);
    const externalHosts = [...new Set(positiveResponses
      .map((r) => new URL(r.url).host)
      .filter((host) => host !== new URL(origin).host))];
    // Pre-existing external surface only: the pages' own CDN scripts
    // (cdnjs) and the long-standing style.css Google-Fonts @import, both
    // untouched by T2. Anything beyond that would be a newly added
    // dependency and fails.
    const allowedExternal = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
    const newExternal = externalHosts.filter((host) => !allowedExternal.includes(host));
    record('H7a console.error = 0 on every positive page', positiveConsole.length === 0,
      positiveConsole.length === 0 ? 'clean' : JSON.stringify(positiveConsole.slice(0, 5)));
    record('H7b pageerror = 0 on every positive page', positivePages.length === 0,
      positivePages.length === 0 ? 'clean' : JSON.stringify(positivePages.slice(0, 5)));
    record('H7c no unexpected same-origin 404', unexpected404.length === 0,
      unexpected404.length === 0 ? 'none' : JSON.stringify(unexpected404.slice(0, 10)));
    if (failingAdjudicated.length > 0) {
      console.log(`  [info] H7 external failing responses adjudicated: ${JSON.stringify(failingAdjudicated.slice(0, 5))}`);
    }
    record('H7d no origin-root asset path requested', originRootHits.length === 0,
      originRootHits.length === 0 ? 'everything under the project prefix' : JSON.stringify(originRootHits));
    record('H7e no new external dependency (only the pre-existing CDN + fonts)', newExternal.length === 0,
      `external=${JSON.stringify(externalHosts)}`);
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
console.log(`  Server origin: ${origin}`);
console.log(`  Server port: ${serverPort}`);
console.log(`  Project prefix: ${PROJECT}/`);

const failed = results.filter((r) => !r.pass);
console.log(`\nRESULTADO: ${results.length - failed.length} OK / ${failed.length} FALLIDO`);
if (failed.length > 0) {
  console.log('FALLIDOS:');
  for (const f of failed) console.log(`  - ${f.name}`);
  console.log('HOSTED-PREFIX-BROWSER: FAIL');
  process.exit(1);
}
console.log('HOSTED-PREFIX-BROWSER: PASS');
