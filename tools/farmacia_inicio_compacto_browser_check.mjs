#!/usr/bin/env node
// tools/farmacia_inicio_compacto_browser_check.mjs
// WO #550 (issue #550) — supported browser QA for the compact `Inicio`
// surface (farmacia_index.html). Synthetic data only. Real Chromium
// (headless) over a local static server, following the repo
// tools/*browser_check.mjs pattern:
//   1. Demo-only Inicio stays compact: resumen with four numeric counts
//      consistent with the published tray-E ∪ tray-G union; zero
//      individual pending cards; no removed boards / quick-access grid /
//      stale copy; future cards show ? + Próxima fase with no navigation;
//      `Ver pendientes` reaches the published #549 surface;
//      console/pageerror = 0.
//   2. Supported synthetic Excel Enfermería import on Inicio updates the
//      Solicitudes summary counts with no card explosion; a hermetic
//      tray-G-only row injected below the seams joins the total only;
//      console/pageerror = 0.
//   3. Preserved behaviour through supported controls: central search
//      (known CIP -> Quick View, unknown CIP -> guided intake), sidebar
//      search navigation, FH-004 demo access, import accessibility;
//      console/pageerror = 0.
// Ejecutar: node tools/farmacia_inicio_compacto_browser_check.mjs

import assert from 'node:assert/strict';
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_inicio_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with a PATH exposing a playwright node_modules.');
}

const { chromium } = loadPlaywrightFromNpx();

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

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'],
  ['.svg', 'image/svg+xml']
]);

const server = createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'farmacia_index.html';
  const file = path.resolve(ROOT, relative);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return response.writeHead(403).end();
  try {
    if (!statSync(file).isFile()) throw new Error('not_file');
    response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
let passed = 0;
const failures = [];
function ok(name) { passed += 1; console.log(`PASS ${name}`); }
function bad(name, detail) { failures.push(name); console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }

async function newPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(String((error && error.message) || error)));
  return { context, page, consoleErrors, pageErrors };
}

function filterRealErrors(consoleErrors) {
  return consoleErrors.filter((text) => text.indexOf('Failed to load resource') === -1);
}

function assertNoPageFailure(pageErrors, consoleErrors) {
  assert.deepEqual(pageErrors, [], 'pageerror');
  assert.deepEqual(filterRealErrors(consoleErrors), [], 'console.error');
}

async function inicioSummary(page) {
  return page.evaluate(() => ({
    total: Number(document.getElementById('inicioTotalCount')?.textContent || '-1'),
    listas: Number(document.getElementById('inicioListasCount')?.textContent || '-1'),
    vigilancia: Number(document.getElementById('inicioVigilanciaCount')?.textContent || '-1'),
    bloqueadas: Number(document.getElementById('inicioBloqueadasCount')?.textContent || '-1'),
    cards: document.querySelectorAll('.pending-validation-card').length
  }));
}

async function expectedUnionLength(page) {
  return page.evaluate(() => {
    const F = window.FarmaciaDemo;
    const keyOf = (p) => {
      const sid = p && p.solicitud_id ? String(p.solicitud_id).trim().toUpperCase() : '';
      return sid ? `SID:${sid}` : `CIP:${String((p && p.cip) || '').trim().toUpperCase()}`;
    };
    const population = F.readAvailablePatientsSync();
    const queueKeys = {};
    F.getEnfermeriaVisiblePatients().forEach((p) => { queueKeys[keyOf(p)] = true; });
    F.readPendingValidationPatientsSync().forEach((p) => { queueKeys[keyOf(p)] = true; });
    return population.filter((p) => queueKeys[keyOf(p)]).length;
  });
}

// ─── 1. Demo-only compact Inicio ─────────────────────────────────────────────

{
  const { context, page, consoleErrors, pageErrors } = await newPage();
  try {
    await page.goto(base + 'farmacia_index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.FarmaciaDemo, null, { timeout: 15000 });
    await page.waitForFunction(() => {
      const el = document.getElementById('inicioTotalCount');
      return el && /^\d+$/.test(el.textContent || '');
    }, null, { timeout: 15000 });
    const summary = await inicioSummary(page);
    assert.ok(Number.isInteger(summary.total) && summary.total >= 0, `numeric total rendered: ${summary.total}`);
    assert.equal(summary.total, await expectedUnionLength(page), 'total matches the published union');
    assert.ok(summary.listas + summary.vigilancia + summary.bloqueadas <= summary.total,
      'category counters never exceed the total');
    assert.equal(summary.cards, 0, 'no individual pending cards grow on Inicio');
    const absent = await page.evaluate(() => ({
      enfBoard: !!document.getElementById('enfermeriaBoard'),
      genBoard: !!document.getElementById('pendingValidationBoard'),
      quickGrid: document.querySelectorAll('.action-grid').length
    }));
    assert.equal(absent.enfBoard, false, 'removed Enfermería board absent');
    assert.equal(absent.genBoard, false, 'removed general board absent');
    assert.equal(absent.quickGrid, 0, 'redundant quick-access grid absent');
    const bodyText = await page.locator('body').innerText();
    for (const removed of ['Accesos rápidos', 'Actividad del servicio', 'Indicadores operativos']) {
      assert.ok(!bodyText.includes(removed), `stale copy absent: ${removed}`);
    }
    // Future cards: visible, ? + Próxima fase, no navigation.
    for (const cardId of ['#inicioRenovacionesCard', '#inicioRecogidasCard']) {
      const card = page.locator(cardId);
      await card.waitFor({ timeout: 10000 });
      const text = await card.innerText();
      assert.ok(text.includes('?'), `${cardId} shows ? instead of fabricated data`);
      assert.ok(text.includes('Próxima fase'), `${cardId} declares its future state`);
      assert.equal(await card.locator('a, button').count(), 0, `${cardId} exposes no navigation`);
    }
    const urlBefore = page.url();
    await page.locator('#inicioRenovacionesCard').click();
    await page.locator('#inicioRecogidasCard').click();
    assert.equal(page.url(), urlBefore, 'future cards cannot navigate');
    // CTA reaches the published #549 surface through a real click.
    const cta = page.locator('#inicioVerPendientes');
    assert.equal(await cta.getAttribute('href'), 'farmacia_actividad_servicio.html', 'CTA destination');
    await Promise.all([page.waitForLoadState('domcontentloaded'), cta.click()]);
    assert.ok(page.url().endsWith('farmacia_actividad_servicio.html'), `landed on Pendientes: ${page.url()}`);
    await page.waitForFunction(
      () => document.querySelectorAll('#actividadCards [data-summary]').length === 4, null, { timeout: 15000 });
    assertNoPageFailure(pageErrors, consoleErrors);
    ok('demo-only Inicio stays compact with a consistent resumen and a working Ver pendientes');
  } catch (error) {
    bad('demo-only Inicio stays compact with a consistent resumen and a working Ver pendientes', error && error.message);
  } finally {
    await context.close();
  }
}

// ─── 2. Supported import updates counts, never grows cards ───────────────────

const BROAD_ONLY_CIP = 'CIP-SINT-INICIO-001';

{
  const { context, page, consoleErrors, pageErrors } = await newPage();
  try {
    const fixture = readFileSync(path.join(ROOT, 'tools/fixtures/enfermeria_v6_sintetico_v1.xlsx'));
    await page.goto(base + 'farmacia_index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.FarmaciaDataImports, null, { timeout: 15000 });
    await page.waitForFunction(() => {
      const el = document.getElementById('inicioTotalCount');
      return el && /^\d+$/.test(el.textContent || '');
    }, null, { timeout: 15000 });
    const before = await inicioSummary(page);
    await page.locator('#inputExcelEnfermeria').setInputFiles({
      name: 'enfermeria_v6_sintetico_v1.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: fixture
    });
    await page.waitForFunction(
      () => (window.FarmaciaDataImports?.getState('enfermeria')?.rows?.length || 0) > 0, null, { timeout: 30000 });
    await page.waitForFunction((previous) => {
      const el = document.getElementById('inicioTotalCount');
      return el && el.textContent !== String(previous);
    }, before.total, { timeout: 15000 });
    const after = await inicioSummary(page);
    assert.equal(after.total, await expectedUnionLength(page), 'imported total matches the published union');
    assert.ok(after.listas + after.vigilancia + after.bloqueadas <= after.total,
      'category counters never exceed the total with import');
    assert.equal(after.cards, 0, 'supported import grows counts, never individual cards');
    // Hermetic tray-G-only row below the seams: total + 1, categories frozen.
    await page.evaluate((cip) => {
      const imports = window.FarmaciaDataImports;
      const original = imports.getImportedPatients.bind(imports);
      imports.getImportedPatients = () => original().concat([{
        cip,
        nombre: 'Paciente sintético solo importSource',
        servicio: 'Reumatología',
        patologia: 'Artritis Reumatoide (AR)',
        farmaco: 'Fármaco sintético',
        fechaSolicitud: '2026-10-01',
        importSource: 'Enfermería externa (solo importSource)',
        estado: 'OK_FARMACIA',
        estado_prebiologico_enfermeria: 'OK_FARMACIA',
        estadoLabel: 'OK Farmacia'
      }]);
      document.dispatchEvent(new CustomEvent('farmacia:data-imported'));
    }, BROAD_ONLY_CIP);
    await page.waitForFunction((previous) => {
      const el = document.getElementById('inicioTotalCount');
      return el && Number(el.textContent) === previous + 1;
    }, after.total, { timeout: 15000 });
    const hermetic = await inicioSummary(page);
    assert.equal(hermetic.listas, after.listas, 'tray-G-only row never feeds Listas');
    assert.equal(hermetic.vigilancia, after.vigilancia, 'tray-G-only row never feeds En vigilancia');
    assert.equal(hermetic.bloqueadas, after.bloqueadas, 'tray-G-only row never feeds Bloqueadas');
    assert.equal(hermetic.cards, 0, 'hermetic row grows the total, never a card');
    assertNoPageFailure(pageErrors, consoleErrors);
    ok('supported import updates the Solicitudes summary counts with no card explosion');
  } catch (error) {
    bad('supported import updates the Solicitudes summary counts with no card explosion', error && error.message);
  } finally {
    await context.close();
  }
}

// ─── 3. Preserved behaviour through supported controls ───────────────────────

{
  const { context, page, consoleErrors, pageErrors } = await newPage();
  try {
    await page.goto(base + 'farmacia_index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.FarmaciaDemo, null, { timeout: 15000 });
    // Central search, known CIP -> Quick View.
    await page.locator('#fhCipInput').fill('CIP-DEMO-FH-002');
    await page.locator('#fhSearchBtn').click();
    await page.waitForFunction(
      () => !document.getElementById('fhQuickViewOverlay')?.classList.contains('hidden'),
      null, { timeout: 15000 });
    const overlayText = await page.locator('#fhQuickViewPanel').innerText();
    assert.ok(overlayText.includes('CIP-DEMO-FH-002') || overlayText.length > 0, 'Quick View opens for a known CIP');
    await page.keyboard.press('Escape');
    // Central search, unknown CIP -> guided intake.
    await page.locator('#fhCipInput').fill('CIP-SINT-NUEVO-999');
    await page.locator('#fhSearchBtn').click();
    await page.waitForFunction(
      () => !document.getElementById('guidedIntakePanel')?.classList.contains('hidden'),
      null, { timeout: 15000 });
    // Sidebar search input preserved and navigates with context.
    const sidebar = page.locator('#patientSearch');
    await sidebar.waitFor({ timeout: 10000 });
    await sidebar.fill('CIP-DEMO-FH-001');
    await Promise.all([page.waitForLoadState('domcontentloaded'), sidebar.press('Enter')]);
    assert.ok(page.url().includes('farmacia_index.html') && page.url().includes('cip='),
      `sidebar search navigates with CIP context: ${page.url()}`);
    // FH-004 demo access + import accessibility on the landed page.
    assert.ok(await page.locator('#demoCaseFh004 a[href*="CIP-DEMO-FH-004"]').first().count() >= 1,
      'FH-004 demo access preserved');
    assert.ok(await page.locator('#btnCargarExcelEnfermeria').count() >= 1
      && await page.locator('#btnCargarExcelFarmacia').count() >= 1,
      'Excel import stays accessible');
    assertNoPageFailure(pageErrors, consoleErrors);
    ok('central/sidebar search, guided intake, FH-004 and import stay preserved');
  } catch (error) {
    bad('central/sidebar search, guided intake, FH-004 and import stay preserved', error && error.message);
  } finally {
    await context.close();
  }
}

// ─── 4. Attention block visual composition (desktop row / narrow stack) ──────

async function attentionProbe(width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(String((error && error.message) || error)));
  await page.goto(base + 'farmacia_index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.FarmaciaDemo, null, { timeout: 15000 });
  await page.waitForFunction(() => {
    const el = document.getElementById('inicioTotalCount');
    return el && /^\d+$/.test(el.textContent || '');
  }, null, { timeout: 15000 });
  await page.locator('#inicioResumen').scrollIntoViewIfNeeded();
  const probe = await page.evaluate(() => {
    const computed = (element) => getComputedStyle(element);
    const cardIds = ['inicioSolicitudesCard', 'inicioRenovacionesCard', 'inicioRecogidasCard'];
    const cardRects = cardIds.map((id) => {
      const node = document.getElementById(id);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width) };
    });
    const statusList = document.querySelector('.inicio-status-list');
    const rows = [...document.querySelectorAll('.inicio-status-row')].map((row) => {
      const labelNode = row.querySelector('.inicio-status-row__label');
      const valueNode = row.querySelector('.inicio-status-row__value');
      return {
        label: labelNode.textContent.trim(),
        value: valueNode.textContent.trim(),
        modifier: [...row.classList].find((name) => name.startsWith('inicio-status-row--')) || '',
        paint: `${computed(row).backgroundColor}|${computed(row).borderTopColor}`,
        gap: Math.round(valueNode.getBoundingClientRect().left - labelNode.getBoundingClientRect().right)
      };
    });
    const future = document.querySelector('#inicioRenovacionesCard');
    const total = document.getElementById('inicioTotalCount');
    const grid = document.querySelector('.inicio-resumen__grid');
    const card = document.querySelector('.inicio-resumen-card');
    const section = document.getElementById('inicioResumen');
    return {
      heading: document.getElementById('inicioResumenTitle')?.textContent.trim() || '',
      copy: document.querySelector('.inicio-resumen__copy')?.textContent.trim() || '',
      cardRects,
      gridColumns: grid ? computed(grid).gridTemplateColumns.split(' ').length : 0,
      gridGap: grid ? parseFloat(computed(grid).gap) : 0,
      listStyleType: statusList ? computed(statusList).listStyleType : '',
      rows,
      totalText: total?.textContent.trim() || '',
      totalFontSize: total ? parseFloat(computed(total).fontSize) : 0,
      outerRadius: section ? parseFloat(computed(section).borderTopLeftRadius) : 0,
      innerRadius: card ? parseFloat(computed(card).borderTopLeftRadius) : 0,
      innerPadding: card ? parseFloat(computed(card).paddingLeft) : 0,
      innerMinHeight: card ? parseFloat(computed(card).minHeight) : 0,
      futureBorderStyle: future ? computed(future).borderTopStyle : '',
      futureBackground: future ? computed(future).backgroundColor : '',
      futureInteractive: document.querySelectorAll(
        '#inicioRenovacionesCard a, #inicioRenovacionesCard button, #inicioRecogidasCard a, #inicioRecogidasCard button').length,
      documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      innerWidth: window.innerWidth
    };
  });
  return { context, page, consoleErrors, pageErrors, probe };
}

{
  let context = null;
  try {
    const result = await attentionProbe(1366, 768);
    context = result.context;
    const { page, consoleErrors, pageErrors, probe } = result;
    assert.equal(probe.heading, 'Requiere atención', 'outer attention heading');
    assert.equal(probe.copy, 'Resumen mínimo de las colas operativas. El trabajo detallado vive fuera de Inicio.', 'helper copy');
    assert.equal(probe.cardRects.length, 3, 'three attention cards');
    assert.equal(probe.gridColumns, 3, 'three cards in one row at desktop width');
    const [first, second, third] = probe.cardRects;
    assert.ok(Math.abs(first.y - second.y) <= 2 && Math.abs(first.y - third.y) <= 2,
      `cards share one row: ${JSON.stringify(probe.cardRects.map((rect) => rect.y))}`);
    assert.ok(second.x > first.x && third.x > second.x, 'cards laid out left to right');
    assert.equal(probe.listStyleType, 'none', 'status list carries no native bullets');
    assert.equal(probe.rows.length, 3, 'three status rows');
    for (const row of probe.rows) {
      assert.ok(/^\d+$/.test(row.value), `status value is a bare number: ${row.value}`);
      assert.ok(row.gap >= 8, `count never visually concatenates with label "${row.label}" (gap ${row.gap})`);
    }
    assert.equal(new Set(probe.rows.map((row) => row.modifier)).size, 3, 'each status row has a distinct semantic modifier');
    assert.equal(new Set(probe.rows.map((row) => row.paint)).size, 3, 'status rows are visually distinct');
    assert.ok(/^\d+$/.test(probe.totalText), `prominent total is numeric: ${probe.totalText}`);
    assert.ok(probe.totalFontSize >= 30 && probe.totalFontSize <= 34, `total prominent ~30-34px: ${probe.totalFontSize}`);
    assert.ok(probe.outerRadius >= 20 && probe.outerRadius <= 26, `outer radius ~22px: ${probe.outerRadius}`);
    assert.ok(probe.innerRadius >= 16 && probe.innerRadius <= 22, `inner radius ~17-20px: ${probe.innerRadius}`);
    assert.ok(probe.gridGap >= 12 && probe.gridGap <= 18, `inner grid gap ~14px: ${probe.gridGap}`);
    assert.ok(probe.innerPadding >= 16 && probe.innerPadding <= 24, `inner padding ~18px: ${probe.innerPadding}`);
    assert.ok(probe.innerMinHeight >= 220, `inner card min-height ~235px: ${probe.innerMinHeight}`);
    assert.equal(probe.futureBorderStyle, 'dashed', 'future cards are dashed');
    assert.notEqual(probe.futureBackground, 'rgb(255, 255, 255)', 'future cards are muted');
    assert.equal(probe.futureInteractive, 0, 'future cards stay non-interactive');
    assert.equal(probe.documentOverflow, false, 'desktop has no horizontal overflow');
    assertNoPageFailure(pageErrors, consoleErrors);
    ok('attention block renders the accepted compact desktop composition');
  } catch (error) {
    bad('attention block renders the accepted compact desktop composition', error && error.message);
  } finally {
    if (context) await context.close();
  }
}

{
  let context = null;
  try {
    const result = await attentionProbe(390, 844);
    context = result.context;
    const { page, consoleErrors, pageErrors, probe } = result;
    assert.equal(probe.gridColumns, 1, 'narrow viewport stacks the attention cards');
    assert.equal(new Set(probe.cardRects.map((rect) => rect.x)).size, 1, 'stacked cards share one column');
    const ys = probe.cardRects.map((rect) => rect.y);
    assert.ok(ys[0] < ys[1] && ys[1] < ys[2], `cards stack in order: ${JSON.stringify(ys)}`);
    assert.ok(probe.cardRects.every((rect) => rect.x >= 0 && rect.x + rect.w <= probe.innerWidth + 1),
      'cards stay inside the viewport');
    assert.equal(probe.documentOverflow, false, 'narrow viewport has no horizontal overflow');
    assert.equal(probe.listStyleType, 'none', 'status list carries no native bullets when stacked');
    assertNoPageFailure(pageErrors, consoleErrors);
    ok('attention block stacks cleanly on a narrow viewport');
  } catch (error) {
    bad('attention block stacks cleanly on a narrow viewport', error && error.message);
  } finally {
    if (context) await context.close();
  }
}

await browser.close();
server.close();

console.log(`\nFARMACIA-INICIO-COMPACTO-BROWSER: ${failures.length === 0 ? 'PASS' : 'FAIL'} ${passed} scenarios`);
if (failures.length > 0) process.exit(1);
