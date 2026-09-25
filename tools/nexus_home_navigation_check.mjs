#!/usr/bin/env node
'use strict';
/**
 * Independent deterministic checker for PROMueve Nexus Home WU-B
 * (F3.2, issue #403): minimal same-tab navigation + integration boundary.
 *
 * This checker is deliberately separate from the FROZEN WU-A acceptance oracle
 * (tools/nexus_home_check.mjs): it must be able to disagree with the
 * implementation it validates. It loads the REAL Home modules and the REAL
 * packaged data/platform/home corpus in a vm sandbox and asserts, from the
 * observed tree and transport, that:
 *
 *  a. a composed start with the packaged corpus renders exactly one tile
 *     (reuma) and zero farmacia tiles;
 *  b. simulating the reuma tile's click handler calls window.location.assign
 *     EXACTLY ONCE with the EXACT string returned by
 *     PromuevePlatform.PlatformContext.getModuleRoute('reuma') for that
 *     snapshot, which in turn equals the packaged route;
 *  c. navigation is same-tab only: location.assign is used, window.open is
 *     never called and no element carries target="_blank";
 *  d. fail-closed negatives: a handler for an unknown, unavailable or
 *     non-string/empty route performs NO navigation and renders the explicit
 *     nexus-home__error state carrying the platform error code; the
 *     unavailable farmacia module has no tile and no listener; the assigned
 *     route equals the facade value exactly (no prefixing / concatenation /
 *     repair);
 *  e. zero patient/dataset transport: rendered tree, navigation target and
 *     Home sources contain no clinical tokens; no storage, postMessage or
 *     history writes are introduced by Home, and URL/query/hash stay
 *     untouched except the single authorized route;
 *  f. legacy entrypoints (index.html, farmacia_index.html) are intact and do
 *     not reference the new Home entrypoint.
 *
 * Exit codes: 0 = all cases PASS, 1 = at least one case FAIL.
 * Usage: node tools/nexus_home_navigation_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const FILES = {
  entrypoint: 'nexus_home.html',
  css: 'nexus_home.css',
  generatedValidators: 'modules/home/home-schema-validators.generated.js',
  bootstrap: 'modules/home/home-bootstrap.js',
  renderer: 'modules/home/home-renderer.js',
  page: 'modules/home/home-page.js',
  legacyReuma: 'index.html',
  legacyFarmacia: 'farmacia_index.html',
};

const PACKAGED = [
  'module-registry.json',
  'deployment-profile.json',
  'deployment-manifest.json',
  'module-readiness.json',
];

// Home navigation surfaces that own routing. They must never embed a route
// literal, prefix, concatenate or repair the facade-issued route.
const NAV_SOURCES = ['modules/home/home-renderer.js', 'modules/home/home-page.js'];

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
// Minimal DOM stub (children + firstChild/removeChild so the fail-closed
// renderer can replace the mounted view, plus listener capture for click)
// ---------------------------------------------------------------------------

function createDomStub() {
  function makeElement(tag) {
    const listeners = {};
    const element = {
      tagName: String(tag).toUpperCase(),
      children: [],
      attributes: {},
      className: '',
      textContent: '',
      get firstChild() {
        return this.children.length > 0 ? this.children[0] : null;
      },
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      removeChild(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) this.children.splice(index, 1);
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
    };
    Object.defineProperty(element, '__listeners', { value: listeners, enumerable: false });
    return element;
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

function collectClickWiredModuleIds(root) {
  const ids = [];
  walk(root, (el) => {
    if (el.__listeners && typeof el.__listeners.click === 'function') {
      ids.push(el.getAttribute('data-module-id'));
    }
  });
  return ids;
}

// ---------------------------------------------------------------------------
// Sandbox that loads the real Home modules exactly like nexus_home.html
// ---------------------------------------------------------------------------

function loadHomeSandbox(fetchMap) {
  const assignCalls = [];
  const openCalls = [];
  const storageWrites = [];
  const postMessages = [];
  const historyCalls = [];

  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window = sandbox;

  const dom = createDomStub();
  sandbox.document = dom;

  // Same-tab navigation target: an assignable spy. Nothing else about the URL
  // may change, so search/hash start empty and are never assigned.
  sandbox.location = {
    href: 'nexus_home.html',
    search: '',
    hash: '',
    assign(route) {
      assignCalls.push(route);
    },
  };
  sandbox.open = function (...args) {
    openCalls.push(args);
  };
  sandbox.postMessage = function (...args) {
    postMessages.push(args);
  };
  const makeStorage = (label) => ({
    getItem() {
      return null;
    },
    setItem(key, value) {
      storageWrites.push([label, key, value]);
    },
    removeItem(key) {
      storageWrites.push([label + '-remove', key]);
    },
  });
  sandbox.localStorage = makeStorage('local');
  sandbox.sessionStorage = makeStorage('session');
  sandbox.history = {
    pushState(...args) {
      historyCalls.push(['pushState', ...args]);
    },
    replaceState(...args) {
      historyCalls.push(['replaceState', ...args]);
    },
  };

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
  return {
    sandbox,
    dom,
    PromueveHome: sandbox.PromueveHome,
    PromuevePlatform: sandbox.PromuevePlatform,
    assignCalls,
    openCalls,
    storageWrites,
    postMessages,
    historyCalls,
  };
}

function packagedFetchMap() {
  const map = {};
  for (const file of PACKAGED) map[`data/platform/home/${file}`] = readJson(`data/platform/home/${file}`);
  return map;
}

// Renders a synthetic already-trusted-looking context whose route resolution is
// controlled by the caller, then invokes the single tile's click handler.
function invokeSyntheticClick(getModuleRoute) {
  const harness = loadHomeSandbox({});
  const context = {
    getBranding() {
      return { productName: 'Producto', siteName: 'Sitio' };
    },
    getNavigableModules() {
      return [{ moduleId: 'synthetic-module', label: 'Módulo sintético' }];
    },
    getModuleRoute,
  };
  const rootEl = harness.PromueveHome.Renderer.renderHome(context, harness.dom);
  const tile = findAllByClass(rootEl, 'nexus-home__tile')[0];
  const click = tile && tile.__listeners ? tile.__listeners.click : undefined;
  if (typeof click === 'function') click({ type: 'click' });
  const errors = findAllByClass(rootEl, 'nexus-home__error');
  return {
    harness,
    rootEl,
    tile,
    click,
    errors,
    errorText: errors.map((e) => e.textContent || '').join('\n'),
  };
}

const CLINICAL_TOKEN_RE = /\bCIP\b|\bNHC\b|paciente|patient|workbook|cohorte|cohort\b|historia_cl|datos_clinicos/i;
// A route embedded/prefix-repaired in source would show up as a quoted string
// ending in the html extension (e.g. a hard-coded path or a base prefix).
const ROUTE_LITERAL_RE = /['"][^'"\n]*\.html['"]/;

// --- Prerequisite gate: missing files are a clean FAIL, not a crash
{
  const required = [
    ...Object.values(FILES),
    ...PACKAGED.map((f) => `data/platform/home/${f}`),
    'modules/platform/configuration-repository.js',
    'modules/platform/platform-context.js',
  ];
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
console.log('PROMueve Nexus Home F3.2 WU-B — same-tab navigation checker');
// ===========================================================================

// Compose the real start once; every later case reads the resulting tree and
// the same sandbox transport spies.
const packaged = loadHomeSandbox(packagedFetchMap());
let packagedOutcome = null;
try {
  packagedOutcome = await packaged.PromueveHome.Page.start();
} catch (err) {
  packagedOutcome = { ok: false, failure: { code: 'START_THREW', message: err.message } };
}

// --- CASO 1: packaged start -> exactly one navigable tile (reuma), zero farmacia
{
  try {
    const root = packaged.dom.__homeRoot;
    const tiles = findAllByClass(root, 'nexus-home__tile');
    const farmacia = tiles.filter((t) => t.getAttribute('data-module-id') === 'farmacia');
    const reuma = tiles.filter((t) => t.getAttribute('data-module-id') === 'reuma');
    let hrefs = 0;
    let targetBlank = 0;
    let routeStrings = 0;
    walk(root, (el) => {
      if (el.attributes && el.attributes.href) hrefs += 1;
      if (el.attributes && String(el.attributes.target || '').toLowerCase() === '_blank') targetBlank += 1;
      if (/\.html/.test(String(el.textContent || ''))) routeStrings += 1;
      for (const v of Object.values(el.attributes || {})) if (/\.html/.test(String(v))) routeStrings += 1;
    });
    const ok =
      packagedOutcome && packagedOutcome.ok === true &&
      tiles.length === 1 && reuma.length === 1 && farmacia.length === 0 &&
      hrefs === 0 && targetBlank === 0 && routeStrings === 0;
    record('CASO 1 composed start: exactly one reuma tile, zero farmacia tiles, no embedded routes', ok,
      `outcome=${JSON.stringify(packagedOutcome && packagedOutcome.ok)} tiles=${tiles.length} reuma=${reuma.length} farmacia=${farmacia.length} hrefs=${hrefs} targetBlank=${targetBlank} routeStrings=${routeStrings}`);
  } catch (err) {
    record('CASO 1 composed start: exactly one reuma tile, zero farmacia tiles, no embedded routes', false, err.message);
  }
}

// --- CASO 2: reuma click -> assign EXACTLY ONCE with the facade-issued route
{
  try {
    const context = packagedOutcome && packagedOutcome.context;
    let facadeRoute = null;
    let facadeError = null;
    try {
      facadeRoute = context.getModuleRoute('reuma');
    } catch (err) {
      facadeError = err;
    }
    const tile = findAllByClass(packaged.dom.__homeRoot, 'nexus-home__tile')[0];
    const click = tile && tile.__listeners ? tile.__listeners.click : undefined;
    const handlerPresent = typeof click === 'function';
    if (handlerPresent) click({ type: 'click' });
    const calls = packaged.assignCalls;
    const ok =
      facadeError === null && typeof facadeRoute === 'string' &&
      handlerPresent &&
      calls.length === 1 && calls[0] === facadeRoute && facadeRoute === 'index.html';
    record('CASO 2 reuma click: assign called exactly once with the exact facade route', ok,
      `handlerPresent=${handlerPresent} facadeRoute=${JSON.stringify(facadeRoute)} calls=${JSON.stringify(calls)} assignCount=${calls.length}`);
  } catch (err) {
    record('CASO 2 reuma click: assign called exactly once with the exact facade route', false, err.message);
  }
}

// --- CASO 3: same-tab transport only (assign, never open, never target=_blank)
{
  try {
    const root = packaged.dom.__homeRoot;
    let targetBlank = 0;
    walk(root, (el) => {
      if (el.attributes && String(el.attributes.target || '').toLowerCase() === '_blank') targetBlank += 1;
    });
    const ok =
      packaged.assignCalls.length >= 1 &&
      packaged.openCalls.length === 0 &&
      targetBlank === 0 &&
      (packaged.historyCalls || []).length === 0;
    record('CASO 3 same-tab transport: location.assign only, no window.open, no target=_blank', ok,
      `assignCount=${packaged.assignCalls.length} openCalls=${packaged.openCalls.length} targetBlank=${targetBlank} historyCalls=${(packaged.historyCalls || []).length}`);
  } catch (err) {
    record('CASO 3 same-tab transport: location.assign only, no window.open, no target=_blank', false, err.message);
  }
}

// --- CASO 4: unavailable farmacia has no tile and no listener
{
  try {
    const root = packaged.dom.__homeRoot;
    const tiles = findAllByClass(root, 'nexus-home__tile');
    const wired = collectClickWiredModuleIds(root);
    const farmaciaTiles = tiles.filter((t) => t.getAttribute('data-module-id') === 'farmacia');
    const ok =
      farmaciaTiles.length === 0 && wired.length === tiles.length &&
      wired.length === 1 && wired[0] === 'reuma';
    record('CASO 4 unavailable farmacia: no tile and no click listener; only reuma is wired', ok,
      `farmaciaTiles=${farmaciaTiles.length} tiles=${tiles.length} wired=${JSON.stringify(wired)}`);
  } catch (err) {
    record('CASO 4 unavailable farmacia: no tile and no click listener; only reuma is wired', false, err.message);
  }
}

// --- CASO 5: fail-closed negatives -> no navigation + explicit error state
{
  const cases = [
    {
      name: 'MODULE_UNKNOWN',
      make: () => {
        const err = new Error('unknown module');
        err.code = 'MODULE_UNKNOWN';
        throw err;
      },
      expectedCode: 'MODULE_UNKNOWN',
    },
    {
      name: 'MODULE_NOT_AVAILABLE',
      make: () => {
        const err = new Error('module not available');
        err.code = 'MODULE_NOT_AVAILABLE';
        throw err;
      },
      expectedCode: 'MODULE_NOT_AVAILABLE',
    },
    { name: 'empty-string route', make: () => '', expectedCode: 'MODULE_ROUTE_INVALID' },
    { name: 'non-string route', make: () => 42, expectedCode: 'MODULE_ROUTE_INVALID' },
  ];
  for (const c of cases) {
    try {
      const observed = invokeSyntheticClick(c.make);
      const ok =
        typeof observed.click === 'function' &&
        observed.harness.assignCalls.length === 0 &&
        observed.errors.length === 1 &&
        observed.errorText.includes(c.expectedCode);
      record(`CASO 5 fail-closed ${c.name}: no navigation + explicit ${c.expectedCode} error state`, ok,
        `handlerPresent=${typeof observed.click === 'function'} assignCount=${observed.harness.assignCalls.length} errors=${observed.errors.length} errorText=${JSON.stringify(observed.errorText.slice(0, 160))}`);
    } catch (err) {
      record(`CASO 5 fail-closed ${c.name}: no navigation + explicit ${c.expectedCode} error state`, false, err.message);
    }
  }
}

// --- CASO 6: no route concatenation / prefixing / repair
{
  try {
    const route = packaged.assignCalls[0];
    const noPrefix = typeof route === 'string' && !/^[./]/.test(route);
    const noQueryOrFragment = typeof route === 'string' && route.indexOf('?') === -1 && route.indexOf('#') === -1;
    const noEmbeddedLiteral = NAV_SOURCES.every((rel) => !ROUTE_LITERAL_RE.test(readText(rel)));
    let hrefs = 0;
    walk(packaged.dom.__homeRoot, (el) => {
      if (el.attributes && el.attributes.href) hrefs += 1;
    });
    const ok = noPrefix && noQueryOrFragment && noEmbeddedLiteral && hrefs === 0;
    record('CASO 6 no route concatenation/repair: exact facade route, no embedded literal, no href', ok,
      `route=${JSON.stringify(route)} noPrefix=${noPrefix} noQueryOrFragment=${noQueryOrFragment} noEmbeddedLiteral=${noEmbeddedLiteral} hrefs=${hrefs}`);
  } catch (err) {
    record('CASO 6 no route concatenation/repair: exact facade route, no embedded literal, no href', false, err.message);
  }
}

// --- CASO 7: zero patient/dataset transport in tree, target, sources and transport
{
  try {
    const renderedTree = serializeTree(packaged.dom.__homeRoot);
    const navigationTarget = JSON.stringify(packaged.assignCalls);
    const homeSources = [FILES.entrypoint, FILES.css, FILES.renderer, FILES.page].map((rel) => readText(rel));

    const scan = (label, contents) => {
      const hits = [];
      contents.forEach((content, i) => {
        const m = content.match(CLINICAL_TOKEN_RE);
        if (m) hits.push(`${label}[${i}]: ${m[0]}`);
      });
      return hits;
    };
    const treeHits = scan('rendered', [renderedTree]);
    const targetHits = scan('target', [navigationTarget]);
    const sourceHits = scan('source', homeSources);

    const noStorageWrites = packaged.storageWrites.length === 0;
    const noPostMessages = packaged.postMessages.length === 0;
    const noHistoryWrites = (packaged.historyCalls || []).length === 0;
    const urlUntouched =
      packaged.sandbox.location.search === '' && packaged.sandbox.location.hash === '' &&
      packaged.sandbox.location.href === 'nexus_home.html';

    const ok =
      treeHits.length === 0 && targetHits.length === 0 && sourceHits.length === 0 &&
      noStorageWrites && noPostMessages && noHistoryWrites && urlUntouched;
    record('CASO 7 zero patient/dataset transport: tree, target, sources, storage, URL untouched', ok,
      `treeHits=${JSON.stringify(treeHits)} targetHits=${JSON.stringify(targetHits)} sourceHits=${JSON.stringify(sourceHits)} storageWrites=${packaged.storageWrites.length} postMessages=${packaged.postMessages.length} historyWrites=${(packaged.historyCalls || []).length} urlUntouched=${urlUntouched}`);
  } catch (err) {
    record('CASO 7 zero patient/dataset transport: tree, target, sources, storage, URL untouched', false, err.message);
  }
}

// --- CASO 8: legacy entrypoints intact and unaware of the new Home entrypoint
{
  try {
    const legacyReuma = readText(FILES.legacyReuma);
    const legacyFarmacia = readText(FILES.legacyFarmacia);
    const homeEntry = readText(FILES.entrypoint);
    const ok =
      !legacyReuma.includes('nexus_home') && !legacyFarmacia.includes('nexus_home') &&
      /id="home-root"/.test(homeEntry);
    record('CASO 8 legacy entrypoints intact and do not mention nexus_home', ok,
      `reumaMentions=${legacyReuma.includes('nexus_home')} farmaciaMentions=${legacyFarmacia.includes('nexus_home')} homeRoot=${/id="home-root"/.test(homeEntry)}`);
  } catch (err) {
    record('CASO 8 legacy entrypoints intact and do not mention nexus_home', false, err.message);
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
console.log('Nexus Home WU-B navigation checker PASSED');
