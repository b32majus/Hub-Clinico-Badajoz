#!/usr/bin/env node
// Issue #356 R3 — Quick View actions must be fully visible/reachable in the overlay.
// Supported-interaction browser regression: real CIP search, Quick View open,
// action set/destinations preserved, no partial clipping at 1440x1000 at open,
// actions reachable through the Quick View's own scroll at 1366x768 and 390x844,
// no background-document scrolling caused by the overlay, close via button and
// Escape still works, focus behavior preserved, console.error = 0, pageerror = 0.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIP = 'CIP-DEMO-FH-001';
const EXPECTED_ACTIONS = [
  { label: 'Seguimiento', page: 'farmacia_seguimiento.html', entrada: 'seguimiento' },
  { label: 'Dashboard', page: 'farmacia_dashboard_paciente.html', entrada: 'dashboard' }
];
const VIEWPORTS = [
  { name: '1440x1000', width: 1440, height: 1000, desktop: true },
  { name: '1366x768', width: 1366, height: 768, desktop: true },
  { name: '390x844', width: 390, height: 844, desktop: false }
];

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_quickview_actions_layout_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_quickview_actions_layout_browser_check.mjs');
}

const { chromium } = loadPlaywrightFromNpx();

function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  const candidates = readdirSync(cache)
    .filter(entry => entry.startsWith('chromium_headless_shell-'))
    .sort().reverse()
    .map(entry => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
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
const BASE = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });

const consoleErrors = [];
const pageErrors = [];

function actionGeometry() {
  const panel = document.getElementById('fhQuickViewPanel').getBoundingClientRect();
  const buttons = [...document.querySelectorAll('#fhQvActions .btn')];
  return {
    panel: { top: panel.top, bottom: panel.bottom, left: panel.left, right: panel.right },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    actions: buttons.map(button => {
      const rect = button.getBoundingClientRect();
      const center = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return {
        label: button.textContent.trim(),
        href: button.getAttribute('href'),
        top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
        fullyInsidePanel: rect.top >= panel.top - 0.5 && rect.bottom <= panel.bottom + 0.5
          && rect.left >= panel.left - 0.5 && rect.right <= panel.right + 0.5,
        fullyInsideViewport: rect.top >= 0 && rect.bottom <= window.innerHeight
          && rect.left >= 0 && rect.right <= window.innerWidth,
        hitTargetIsAction: !!center && (center === button || button.contains(center))
      };
    })
  };
}

try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`${viewport.name}: ${message.text()}`); });
    page.on('pageerror', error => pageErrors.push(`${viewport.name}: ${error.message}`));

    await page.goto(`${BASE}farmacia_index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.FarmaciaPatientFlowRuntime);

    // Supported interaction: real CIP search opens the Quick View.
    await page.locator('#fhCipInput').fill(CIP);
    await page.locator('#fhSearchBtn').click();
    await page.waitForFunction(expected => {
      const overlay = document.querySelector('#fhQuickViewOverlay');
      return overlay && !overlay.classList.contains('hidden')
        && document.querySelector('#fhSubtitle')?.textContent === expected;
    }, CIP);
    await page.waitForTimeout(350); // let the panel fade-in animation settle

    // Same action set as before the fix, derived from patient state.
    const geometryAtOpen = await page.evaluate(actionGeometry);
    assert.deepEqual(geometryAtOpen.actions.map(action => action.label), EXPECTED_ACTIONS.map(action => action.label),
      `${viewport.name}: action set must stay exactly Seguimiento + Dashboard`);
    for (const [index, expected] of EXPECTED_ACTIONS.entries()) {
      const href = geometryAtOpen.actions[index].href;
      assert.ok(href.startsWith(`${expected.page}?`), `${viewport.name}: ${expected.label} must target ${expected.page}, got ${href}`);
      const params = new URL(href, 'http://127.0.0.1').searchParams;
      assert.equal(params.get('cip'), CIP, `${viewport.name}: ${expected.label} must keep the CIP context`);
      assert.equal(params.get('entrada'), expected.entrada, `${viewport.name}: ${expected.label} must keep the entrada context`);
    }

    if (viewport.desktop) {
      // Requirement: at open every action is fully visible, not partially clipped.
      for (const action of geometryAtOpen.actions) {
        assert.ok(action.fullyInsidePanel, `${viewport.name}: ${action.label} is clipped by the panel edge at open`);
        assert.ok(action.fullyInsideViewport, `${viewport.name}: ${action.label} is outside the viewport at open`);
        assert.ok(action.hitTargetIsAction, `${viewport.name}: ${action.label} is not clickable at open`);
      }
    }

    // Requirement: actions are reachable through the Quick View's own scroll
    // (never by scrolling the background document).
    await page.evaluate(() => {
      const content = document.getElementById('fhContent');
      const panel = document.getElementById('fhQuickViewPanel');
      const scrollables = [content, panel].filter(element => {
        const overflowY = getComputedStyle(element).overflowY;
        return (overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight;
      });
      if (scrollables.length === 0) throw new Error('the Quick View must have its own scroll area');
      scrollables.forEach(element => { element.scrollTop = element.scrollHeight; });
    });
    await page.waitForTimeout(100);
    const geometryAfterScroll = await page.evaluate(actionGeometry);
    for (const action of geometryAfterScroll.actions) {
      assert.ok(action.fullyInsidePanel, `${viewport.name}: ${action.label} is not fully reachable inside the Quick View after its own scroll`);
      assert.ok(action.fullyInsideViewport, `${viewport.name}: ${action.label} is not fully visible after the Quick View's own scroll`);
      assert.ok(action.hitTargetIsAction, `${viewport.name}: ${action.label} is not clickable after the Quick View's own scroll`);
    }

    // Requirement: interacting with the overlay must not scroll the background document.
    const scrollBeforeWheel = await page.evaluate(() => ({
      scrollY: window.scrollY,
      docScrollTop: document.scrollingElement.scrollTop
    }));
    const panelBox = await page.locator('#fhQuickViewPanel').boundingBox();
    await page.mouse.move(panelBox.x + panelBox.width / 2, panelBox.y + panelBox.height / 2);
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(150);
    const scrollAfterWheel = await page.evaluate(() => ({
      scrollY: window.scrollY,
      docScrollTop: document.scrollingElement.scrollTop
    }));
    assert.equal(scrollAfterWheel.scrollY, scrollBeforeWheel.scrollY,
      `${viewport.name}: the Quick View must not scroll the background document`);
    assert.equal(scrollAfterWheel.docScrollTop, scrollBeforeWheel.docScrollTop,
      `${viewport.name}: the Quick View must not scroll the background document element`);

    // Close via the close button; supported focus behavior is preserved.
    const focusOnOpen = await page.evaluate(() => document.activeElement?.className || '');
    assert.ok(focusOnOpen.includes('quick-view-close-btn'),
      `${viewport.name}: the overlay close button must receive focus on open`);
    await page.locator('button[data-fh-qv-close]').click();
    await page.waitForFunction(() => document.querySelector('#fhQuickViewOverlay')?.classList.contains('hidden'));
    const focusAfterClose = await page.evaluate(() => document.activeElement?.id || '');
    assert.equal(focusAfterClose, 'fhSearchBtn', `${viewport.name}: focus must return to the search trigger after close`);

    // Reopen and close via Escape.
    await page.locator('#fhSearchBtn').click();
    await page.waitForFunction(() => !document.querySelector('#fhQuickViewOverlay')?.classList.contains('hidden'));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('#fhQuickViewOverlay')?.classList.contains('hidden'));

    // Reopen and close via the backdrop.
    await page.locator('#fhSearchBtn').click();
    await page.waitForFunction(() => !document.querySelector('#fhQuickViewOverlay')?.classList.contains('hidden'));
    await page.locator('#fhQuickViewOverlay .quick-view-backdrop').click({ position: { x: 5, y: 5 } });
    await page.waitForFunction(() => document.querySelector('#fhQuickViewOverlay')?.classList.contains('hidden'));

    await context.close();
  }

  assert.deepEqual(consoleErrors, [], `console.error must be 0: ${consoleErrors.join(' | ')}`);
  assert.deepEqual(pageErrors, [], `pageerror must be 0: ${pageErrors.join(' | ')}`);
  console.log('farmacia_quickview_actions_layout_browser_check: PASS');
  console.log('QA Chromium: CIP search/Quick View open/actions set+context preserved/no clipping at open 1440x1000+1366x768/reachable via own scroll 1366x768+390x844/no background scroll/close button+Escape/focus preserved; console.error=0 pageerror=0');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
