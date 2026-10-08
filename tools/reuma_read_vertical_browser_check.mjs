#!/usr/bin/env node
'use strict';
/**
 * WU-B oracle 1 (ticket #429): browser QA for the Reuma search -> dashboard/history
 * vertical migrated onto the WU-A Reuma Read Port (`scripts/reuma_patient_read_port.js`).
 *
 * Every patient assertion runs through supported user-level interaction on a served
 * repository root: the real session gate on reuma_index.html (file input -> professional
 * select -> confirm), the real search form and the real same-tab navigation. The
 * only `page.addInitScript` use defines the delayed read-port double required by the
 * frozen stale-response probe; it never edits the product pages and never writes a
 * storage key the product does not own.
 *
 * Fixtures are synthetic only: `tools/fixtures/reuma_read/corpus_v1.json` (ids SYN-*)
 * is materialized into a temporary XLSX outside the repository. A synthetic
 * `Profesionales` row is added to that temporary workbook because the supported
 * session gate on reuma_index.html only offers professionals present in the loaded Excel;
 * it is fixture data for the gate, never a product hook.
 *
 * Frozen expectations (PART 5): search page gains `#searchStatusMsg`
 * (aria-live="polite") for pending text; outcomes keep the legacy copies and add the
 * two fail-closed copies; the dashboard distinguishes `unavailable` from `not_found`;
 * a superseded late response renders nothing and does not navigate; the two migrated
 * consumers reference no `HubTools.data.<getAllPatients|findPatientById|getPatientHistory>`.
 *
 * The pages are not migrated yet, so a RED result is the expected state today.
 * Runtime dependency: the CDN scripts (XLSX on reuma_index.html, Chart.js on
 * dashboard_paciente.html) must be reachable; the probe recorded them reachable here.
 *
 * Usage: node tools/reuma_read_vertical_browser_check.mjs
 * Documented env var: PLAYWRIGHT_CHROMIUM_EXECUTABLE (headless-shell path).
 * Exit code 0 = every case PASS, 1 = at least one FAIL or an environment failure.
 */

import { createReadStream, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const CORPUS_FILE = path.join(ROOT, 'tools', 'fixtures', 'reuma_read', 'corpus_v1.json');
const SEARCH_PAGE = 'dashboard_search.html';
const DASHBOARD_PAGE = 'dashboard_paciente.html';
const PORT_SCRIPT = 'scripts/reuma_patient_read_port.js';
const SEARCH_CONSUMER = 'scripts/script_dashboard_search.js';
const DASHBOARD_CONSUMER = 'scripts/script_dashboard.js';
const CONSUMER_OPS = ['getAllPatients', 'findPatientById', 'getPatientHistory'];

const FAIL_CLOSED_UNAVAILABLE = 'No hay datos cargados. Carga el Excel para consultar pacientes.';
const FAIL_CLOSED_ERROR = 'No se pudo consultar los pacientes. Inténtalo de nuevo.';
const PENDING_LISTING = 'Cargando pacientes…';
const PENDING_SUBMIT = 'Buscando paciente…';

const corpus = JSON.parse(fs.readFileSync(CORPUS_FILE, 'utf8'));
const CORPUS_IDS = [...new Set(Object.values(corpus.sheets).flat().map((row) => row.ID_Paciente))].sort();
const KNOWN_ID = 'SYN-ESPA-001';
const KNOWN_EXPECTED_VISITS = corpus.sheets.ESPA.filter((row) => row.ID_Paciente === KNOWN_ID).length;
const ABSENT_ID_SHAPED = 'ESP-2099-999';

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

// Same documented Playwright resolution as the other browser checkers: PATH-provided
// installs first, npx cache and the repository node_modules as fallbacks.
function loadPlaywrightFromNpx() {
  const tryNodeModules = (nodeModules) => {
    const pkg = path.join(nodeModules, 'playwright', 'package.json');
    return existsSync(pkg) ? createRequire(path.join(nodeModules, '__reuma_vertical_loader.cjs'))('playwright') : null;
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
    for (const entry of fs.readdirSync(npxCache).sort().reverse()) {
      const loaded = tryNodeModules(path.join(npxCache, entry, 'node_modules'));
      if (loaded) return loaded;
    }
  }
  const loaded = tryNodeModules(path.join(ROOT, 'node_modules'));
  if (loaded) return loaded;
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/reuma_read_vertical_browser_check.mjs');
}

let chromium;
try {
  ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
  console.error('ENVIRONMENT FAILURE: ' + err.message);
  console.log(`\nREUMA-READ-VERTICAL: FAIL 0/0`);
  process.exit(1);
}

function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  const candidates = fs.readdirSync(cache)
    .filter((entry) => entry.startsWith('chromium_headless_shell-'))
    .sort().reverse()
    .map((entry) => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return candidates.find(existsSync) || bundled;
}

// ---------------------------------------------------------------------------
// Synthetic workbook (temporary, outside the repository) + repo-root HTTP server.
// ---------------------------------------------------------------------------

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'reuma-read-vertical-'));
const workbookPath = path.join(tempDir, 'reuma_vertical_synthetic.xlsx');
{
  const workbook = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(corpus.sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
  }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { Nombre_Completo: 'Sintetico Profesional Uno', Cargo: 'Reumatologia' },
  ]), 'Profesionales');
  fs.writeFileSync(workbookPath, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);
const server = createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'index.html';
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

// ---------------------------------------------------------------------------
// Shared console/pageerror bookkeeping: every created page is tracked so the final
// case can assert a clean console throughout the whole vertical.
// ---------------------------------------------------------------------------

const consoleErrors = [];
const pageErrors = [];

function trackPage(page) {
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`${page.url()} :: ${message.text()}`);
  });
  page.on('pageerror', (error) => pageErrors.push(`${page.url()} :: ${error.message}`));
  return page;
}

async function openPage(context) {
  return trackPage(await context.newPage());
}

// Supported session gate on reuma_index.html: real file input -> real professional select
// -> real confirm button. Establishes localStorage.hubSelectedProfessional and the
// sessionStorage corpus cache in the returned tab, without touching any storage key.
async function passSupportedGate(context) {
  const page = await openPage(context);
  await page.goto(`${origin}/reuma_index.html`, { waitUntil: 'load', timeout: 45000 });
  await page.setInputFiles('#gateExcelInput', workbookPath);
  await page.waitForSelector('#gateStepSelect:not(.hidden)', { timeout: 20000 });
  const professional = await page.evaluate(() => {
    const select = document.getElementById('gateProfessionalSelect');
    return select ? Array.from(select.options).map((option) => option.value).find(Boolean) || '' : '';
  });
  await page.selectOption('#gateProfessionalSelect', professional);
  await page.click('#gateConfirmBtn');
  await page.waitForFunction(() => document.getElementById('sessionGate').classList.contains('hidden'), null, { timeout: 10000 });
  return { page, professional };
}

// Frozen stale-response double. The port script (when present) assigns
// globalThis.ReumaPatientReadPort at parse time; the accessor below keeps the
// delayed double authoritative without ever touching the product page.
const RACE_DOUBLE = () => {
  const patients = [{ id: 'SYN-ESPA-001', nombre: 'Sintetico Espa Uno' }];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const port = {
    listPatients: async () => { await wait(300); return { status: 'ok', patients }; },
    resolvePatient: async (term) => {
      if (term === 'SYN-LATE-001') {
        await wait(1500);
        return { status: 'ok', patient: { id: 'SYN-LATE-001', nombre: 'Sintetico Late' } };
      }
      return { status: 'not_found', reason: 'no_match' };
    },
    readPatientBundle: async () => ({ status: 'not_found', reason: 'unknown_id' }),
  };
  const double = { getPort: () => port, create: () => port, PORT_VERSION: 'race-double' };
  Object.defineProperty(window, 'ReumaPatientReadPort', {
    configurable: true,
    get: () => double,
    set: () => {},
  });
};

const errorText = (page) => page.evaluate(() => (document.getElementById('searchErrorMsg')?.textContent || '').trim());

let browser;
let origin = '';
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;

  // =========================================================================
  // C1/C2 — static wiring of the two migrated consumers.
  // =========================================================================
  {
    const searchHtml = fs.readFileSync(path.join(ROOT, SEARCH_PAGE), 'utf8');
    const dashboardHtml = fs.readFileSync(path.join(ROOT, DASHBOARD_PAGE), 'utf8');
    const portBefore = (html, consumer) => html.includes(`${PORT_SCRIPT}?v=`) &&
      html.indexOf(PORT_SCRIPT) !== -1 && html.indexOf(PORT_SCRIPT) < html.indexOf(consumer);
    const searchWired = portBefore(searchHtml, SEARCH_CONSUMER);
    const dashboardWired = portBefore(dashboardHtml, DASHBOARD_CONSUMER);
    record('C1 both migrated pages load the read port before their page script with a fresh ?v= token',
      searchWired && dashboardWired,
      `searchWired=${searchWired} dashboardWired=${dashboardWired} ` +
      `searchTag=${JSON.stringify(`${PORT_SCRIPT}?v=`)} present=${searchHtml.includes(`${PORT_SCRIPT}?v=`)} ` +
      `dashboardTagPresent=${dashboardHtml.includes(`${PORT_SCRIPT}?v=`)}`);
  }
  {
    const hits = [];
    for (const file of [SEARCH_CONSUMER, DASHBOARD_CONSUMER]) {
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      for (const op of CONSUMER_OPS) {
        if (new RegExp(`HubTools\\s*\\.\\s*data\\s*\\.\\s*${op}\\b`).test(text)) hits.push(`${file}:${op}`);
      }
    }
    record('C2 migrated consumers reference no HubTools.data covered read operation',
      hits.length === 0,
      `direct references=${JSON.stringify(hits)}`);
  }

  browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
  const chromiumVersion = browser.version();

  // =========================================================================
  // Corpus context — supported gate, then the search -> dashboard happy path.
  // =========================================================================
  {
    const context = await browser.newContext();
    try {
      const { page } = await passSupportedGate(context);

      await page.goto(`${origin}/${SEARCH_PAGE}`, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(900);
      const redirected = new URL(page.url()).pathname.endsWith(`/${SEARCH_PAGE}`) === false;
      const hasPort = await page.evaluate(() => typeof globalThis.ReumaPatientReadPort?.getPort === 'function');
      const ariaLive = await page.evaluate(() => document.getElementById('searchStatusMsg')?.getAttribute('aria-live') || null);
      record('C3 search page exposes the port global and #searchStatusMsg[aria-live=polite]',
        !redirected && hasPort && ariaLive === 'polite',
        `url=${page.url()} port=${hasPort} ariaLive=${JSON.stringify(ariaLive)}`);

      const options = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#patientIds option')).map((option) => option.value).sort());
      record('C4 search datalist hydrates through listPatients with every synthetic id',
        JSON.stringify(options) === JSON.stringify(CORPUS_IDS),
        `options=${JSON.stringify(options)} expected=${JSON.stringify(CORPUS_IDS)}`);

      // Unknown but ID-shaped term keeps today's exact not_found copy.
      await page.fill('#dashboardSearchInput', ABSENT_ID_SHAPED);
      await page.click('#dashboardSearchButton');
      await page.waitForFunction((expected) =>
        (document.getElementById('searchErrorMsg')?.textContent || '').includes(expected),
      ABSENT_ID_SHAPED, { timeout: 5000 }).catch(() => {});
      const unknownCopy = await errorText(page);
      record('C5 unknown id-shaped term keeps the legacy not_found copy',
        unknownCopy === `No se encontró el paciente ${ABSENT_ID_SHAPED}. Verifica el ID.`,
        `copy=${JSON.stringify(unknownCopy)}`);

      // Happy path: submit -> navigation -> rendered patient and history.
      await page.fill('#dashboardSearchInput', KNOWN_ID);
      await Promise.all([
        page.waitForURL((url) => url.pathname.endsWith(`/${DASHBOARD_PAGE}`), { waitUntil: 'load', timeout: 20000 }).catch(() => null),
        page.click('#dashboardSearchButton'),
      ]);
      await page.waitForTimeout(1500);
      const navUrl = new URL(page.url());
      const navId = navUrl.searchParams.get('id');
      const patientName = await page.evaluate(() => document.getElementById('patientName')?.textContent || '');
      const visitRows = await page.evaluate(() => document.querySelectorAll('#visitsTableBody tr').length);
      const globals = await page.evaluate(() => ({
        summary: !!window.patientSummary,
        history: !!window.patientHistory,
      }));
      record('C6 supported submit navigates with id param and renders patient + visit history',
        navUrl.pathname.endsWith(`/${DASHBOARD_PAGE}`) && navId === KNOWN_ID &&
        patientName.includes('Sintetico Espa Uno') && visitRows === KNOWN_EXPECTED_VISITS && globals.summary && globals.history,
        `url=${page.url()} id=${navId} name=${JSON.stringify(patientName)} visits=${visitRows}/${KNOWN_EXPECTED_VISITS} globals=${JSON.stringify(globals)}`);

      // Dashboard unknown id (corpus loaded): legacy empty-state copy is preserved.
      await page.goto(`${origin}/${DASHBOARD_PAGE}?id=${ABSENT_ID_SHAPED}`, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(1600);
      const emptyCopy = await page.evaluate(() => (document.getElementById('emptyState')?.textContent || '').replace(/\s+/g, ' ').trim());
      record('C7 dashboard unknown id keeps the legacy empty-state copy',
        emptyCopy.includes(`No se encontró información para el ID ${ABSENT_ID_SHAPED}.`),
        `empty=${JSON.stringify(emptyCopy)}`);
    } finally {
      await context.close();
    }
  }

  // =========================================================================
  // No-corpus context — a second tab shares the professional session but has no
  // sessionStorage corpus cache, so the vertical must fail closed.
  // =========================================================================
  {
    const context = await browser.newContext();
    try {
      await passSupportedGate(context);
      const page = await openPage(context);
      await page.goto(`${origin}/${SEARCH_PAGE}`, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(900);
      const noCache = await page.evaluate(() => !sessionStorage.getItem('hubClinicoDB'));
      await page.fill('#dashboardSearchInput', KNOWN_ID);
      await page.click('#dashboardSearchButton');
      await page.waitForTimeout(1200);
      const searchCopy = await errorText(page);
      record('C8 search without corpus shows the fail-closed unavailable copy and never mocks',
        noCache && searchCopy === FAIL_CLOSED_UNAVAILABLE,
        `corpuslessTab=${noCache} copy=${JSON.stringify(searchCopy)}`);

      await page.goto(`${origin}/${DASHBOARD_PAGE}?id=${KNOWN_ID}`, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(1600);
      const emptyCopy = await page.evaluate(() => (document.getElementById('emptyState')?.textContent || '').replace(/\s+/g, ' ').trim());
      const failedClosed = emptyCopy.includes(FAIL_CLOSED_UNAVAILABLE) || emptyCopy.includes(FAIL_CLOSED_ERROR);
      const noPatientRender = await page.evaluate(() => (document.getElementById('patientName')?.textContent || '') === 'Nombre del Paciente');
      record('C9 dashboard without corpus shows a fail-closed copy instead of the unknown-id copy',
        failedClosed && noPatientRender,
        `empty=${JSON.stringify(emptyCopy)} noPatientRender=${noPatientRender}`);
    } finally {
      await context.close();
    }
  }

  // =========================================================================
  // Race context — delayed read-port double: pending state + stale supersession.
  // =========================================================================
  {
    const context = await browser.newContext();
    try {
      await passSupportedGate(context);
      const page = await openPage(context);
      await page.addInitScript(RACE_DOUBLE);
      await page.goto(`${origin}/${SEARCH_PAGE}`, { waitUntil: 'domcontentloaded', timeout: 45000 });

      let pendingListing = false;
      try {
        await page.waitForFunction((text) => (document.getElementById('searchStatusMsg')?.textContent || '').trim() === text,
          PENDING_LISTING, { timeout: 4000 });
        pendingListing = true;
      } catch { /* pending listing not implemented today */ }
      await page.waitForTimeout(700);

      await page.fill('#dashboardSearchInput', 'SYN-LATE-001');
      await page.click('#dashboardSearchButton');
      let pendingSubmit = false;
      try {
        await page.waitForFunction((text) => (document.getElementById('searchStatusMsg')?.textContent || '').trim() === text,
          PENDING_SUBMIT, { timeout: 4000 });
        pendingSubmit = true;
      } catch { /* pending submit not implemented today */ }
      const disabled = await page.evaluate(() => document.getElementById('dashboardSearchButton')?.disabled === true);

      // Supersede the slow submit with an immediate not_found term.
      await page.fill('#dashboardSearchInput', KNOWN_ID);
      await page.click('#dashboardSearchButton');
      await page.waitForTimeout(2200);
      const lateIgnored = new URL(page.url()).pathname.endsWith(`/${SEARCH_PAGE}`);
      const settledCopy = await errorText(page);
      record('C10 pending state renders and the superseded late response neither renders nor navigates',
        pendingListing && pendingSubmit && disabled && lateIgnored && settledCopy.includes('No hay coincidencias'),
        `pendingListing=${pendingListing} pendingSubmit=${pendingSubmit} buttonDisabled=${disabled} ` +
        `lateIgnored=${lateIgnored} url=${page.url()} copy=${JSON.stringify(settledCopy)}`);
    } finally {
      await context.close();
    }
  }

  // =========================================================================
  // C11 — clean console across the whole vertical.
  // =========================================================================
  record('C11 console.error === 0 and pageerror === 0 throughout the vertical',
    consoleErrors.length === 0 && pageErrors.length === 0,
    `consoleErrors=${JSON.stringify(consoleErrors.slice(0, 5))} pageErrors=${JSON.stringify(pageErrors.slice(0, 5))}`);

  console.log('\nENVIRONMENT');
  console.log(`  Chromium: ${chromiumVersion}`);
  console.log(`  Headless: true`);
  console.log(`  Node: ${process.version}`);
  console.log(`  Server origin: ${origin}`);
} catch (err) {
  record('unexpected checker error', false, (err && err.stack) || String(err));
} finally {
  if (browser) await browser.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  rmSync(tempDir, { recursive: true, force: true });
}

const failed = results.filter((result) => !result.pass);
if (failed.length > 0) {
  console.log('FAILED CASES:');
  for (const item of failed) console.log(`  - ${item.name}`);
}
console.log(`\nREUMA-READ-VERTICAL: ${failed.length === 0 ? 'PASS' : 'FAIL'} ${results.length - failed.length}/${results.length} cases`);
process.exit(failed.length === 0 ? 0 : 1);
