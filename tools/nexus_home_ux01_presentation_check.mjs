#!/usr/bin/env node
'use strict';
/**
 * Focused UX-01 presentation checker for PROMueve Nexus Home (NEXUS_HOME_UX_01).
 *
 * Proves the visual-fidelity presentation and the frozen human shaping that
 * the historical oracles do not cover:
 *  - hero carries exactly one primary instruction and no subtitle/pill;
 *  - visible brand is the approved full NEXus lockup served as a declared
 *    local file (never a data URI); the product wordmark stays as a
 *    visually-hidden semantic h1 so no visible "NEXus" duplicates the lockup;
 *  - Home-only aliases (ReumaNEXus / FarmaNEXus) plus the human-approved
 *    PRESENTATION-ONLY future card (DermaNEXus / "Próximamente") that is never
 *    registered, never availability-checked, never routed and never
 *    interactive;
 *  - available card: "Disponible" + native keyboard-operable Entrar button;
 *  - unavailable card: visible, muted, "No disponible en este entorno", with
 *    no tile, no listener, no href, and getModuleRoute never called for it;
 *  - NEXus favicon derived from the approved isotipo (old app-icon bytes
 *    gone) and explicitly linked from nexus_home.html;
 *  - zero-navigable state keeps unavailable cards visible beside the empty
 *    state;
 *  - getModules() fallback shape for synthetic doubles without getModules().
 *
 * Node-only deterministic verification (no browser QA). Exit codes:
 * 0 = all cases PASS, 1 = at least one case FAIL.
 * Usage: node tools/nexus_home_ux01_presentation_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

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

// Minimal DOM stub: the frozen renderer API surface only.
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

function loadRendererSandbox() {
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  const assignCalls = [];
  sandbox.location = {
    href: 'nexus_home.html',
    assign(route) {
      assignCalls.push(route);
    },
  };
  const dom = createDomStub();
  sandbox.document = dom;
  vm.createContext(sandbox);
  vm.runInContext(readText('modules/home/home-renderer.js'), sandbox, {
    filename: 'modules/home/home-renderer.js',
  });
  return { sandbox, dom, Renderer: sandbox.PromueveHome.Renderer, assignCalls };
}

function packagedFetchMap() {
  const map = {};
  for (const file of [
    'module-registry.json',
    'deployment-profile.json',
    'deployment-manifest.json',
    'module-readiness.json',
  ]) {
    map[`data/platform/home/${file}`] = readJson(`data/platform/home/${file}`);
  }
  return map;
}

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
  for (const rel of [
    'modules/platform/configuration-repository.js',
    'modules/platform/platform-context.js',
    'modules/home/home-schema-validators.generated.js',
    'modules/home/home-bootstrap.js',
    'modules/home/home-renderer.js',
    'modules/home/home-page.js',
  ]) {
    vm.runInContext(readText(rel), sandbox, { filename: rel });
  }
  return { sandbox, dom, PromueveHome: sandbox.PromueveHome };
}

// --- Prerequisite gate
{
  const required = [
    'modules/home/home-renderer.js',
    'nexus_home.html',
    'nexus_home.css',
    'assets/branding/nexus-home-lockup.png',
    'favicon.svg',
    'assets/branding/farmanexus-app-icon-64.png',
    'data/platform/home/deployment-profile.json',
  ];
  const missing = required.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));
  if (missing.length > 0) {
    console.log('  [FAIL] prerequisite files present -> missing: ' + missing.join(', '));
    console.log('\nRESULTADO: 0 OK / 1 FALLIDO');
    process.exit(1);
  }
}

console.log('PROMueve Nexus Home UX-01 — focused presentation checker');

// Render the packaged deployment through the real composed stack.
const { dom, PromueveHome } = loadHomeSandbox(packagedFetchMap());
const outcome = await PromueveHome.Page.start();
const root = dom.__homeRoot;
const tree = serializeTree(root);

// --- P1: composed start stays ok and branding comes from the profile
{
  const display = readJson('data/platform/home/deployment-profile.json').display;
  const products = findAllByClass(root, 'nexus-home__product-name');
  const sites = findAllByClass(root, 'nexus-home__site-name');
  const ok =
    outcome && outcome.ok === true &&
    display.productName === 'NEXus' &&
    display.siteName === 'Entorno de demostración' &&
    products.length === 1 && products[0].textContent === 'NEXus' &&
    products[0].className.split(/\s+/).includes('nexus-home__visually-hidden') &&
    sites.length === 1 && sites[0].textContent === 'Entorno de demostración';
  record('P1 branding from profile: NEXus semantic wordmark (visually hidden) + discreet demo context', ok,
    `products=${products.length} sites=${sites.length}`);
}

// --- P2: hero has exactly one instruction, no subtitle/pill/descriptions
{
  const instructions = findAllByClass(root, 'nexus-home__instruction');
  const instructionOk = instructions.length === 1 &&
    instructions[0].textContent === 'Selecciona tu espacio de trabajo';
  const banned = ['Plataforma asistencial', 'Espacio de trabajo de'];
  const bannedHits = banned.filter((s) => tree.includes(s));
  const ok = instructionOk && bannedHits.length === 0;
  record('P2 hero: exactly one instruction, no subtitle/pill/descriptions', ok,
    `instructions=${instructions.length} bannedHits=${JSON.stringify(bannedHits)}`);
}

// --- P3: visible brand is the approved full lockup served as a declared local
// file (byte-exact oracle by SHA-256); the renderer embeds zero data URIs.
{
  const APPROVED_LOCKUP_DERIVATIVE_SHA256 =
    '54141a7a57d339953d73e81cb31ce3962e498d9a8e200999b49804c43852943f';
  const LOCKUP_SRC = 'assets/branding/nexus-home-lockup.png';
  const products = findAllByClass(root, 'nexus-home__product-name');
  let nestedImg = 0;
  walk(products[0], (el) => {
    if (el !== products[0] && el.tagName === 'IMG') nestedImg += 1;
  });
  const lockups = findAllByClass(root, 'nexus-home__brand-lockup');
  const lockupSrc = lockups.length === 1 ? String(lockups[0].getAttribute('src') || '') : '';
  const lockupAlt = lockups.length === 1 ? String(lockups[0].getAttribute('alt') || '') : '';
  const lockupOk = lockups.length === 1 && lockups[0].tagName === 'IMG' &&
    lockupSrc === LOCKUP_SRC && lockupAlt === 'NEXus';
  const rendererSource = readText('modules/home/home-renderer.js');
  const noDataUri = !rendererSource.includes('data:image');
  const derivativeBytes = fs.readFileSync(path.join(ROOT, LOCKUP_SRC));
  const derivativeSha = crypto.createHash('sha256').update(derivativeBytes).digest('hex');
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const derivativeOk = derivativeBytes.subarray(0, 8).equals(pngSignature) &&
    derivativeSha === APPROVED_LOCKUP_DERIVATIVE_SHA256;
  const ok = products.length === 1 && nestedImg === 0 && lockupOk && noDataUri && derivativeOk;
  record('P3 brand: approved full lockup as declared file (no data URI) + hidden semantic wordmark', ok,
    `nestedImg=${nestedImg} lockups=${lockups.length} src=${JSON.stringify(lockupSrc)} dataUriFree=${noDataUri} sha256=${derivativeSha}`);
}

// --- P4: aliases — ReumaNEXus / FarmaNEXus registered cards plus the
// PRESENTATION-ONLY future DermaNEXus card ("Próximamente"): explicit future
// marker (never data-module-id="derma"), no tile, no listener, no href, no
// button action, never "Disponible"/"No disponible en este entorno".
{
  const names = findAllByClass(root, 'nexus-home__module-name').map((el) => el.textContent);
  const cards = findAllByClass(root, 'nexus-home__module-card');
  const futureCards = cards.filter((c) => c.getAttribute('data-future-module') === 'derma');
  const registeredDerma = cards.filter((c) => c.getAttribute('data-module-id') === 'derma');
  let futureTiles = 0;
  let futureListeners = 0;
  let futureHrefs = 0;
  let futureButtons = 0;
  let futureState = '';
  walk(futureCards[0], (el) => {
    if (typeof el.className === 'string') {
      const classes = el.className.split(/\s+/);
      if (classes.includes('nexus-home__tile')) futureTiles += 1;
      if (classes.includes('nexus-home__module-state--future')) futureState = el.textContent;
    }
    if (el.__listeners && (el.__listeners.click || el.__listeners.keydown)) futureListeners += 1;
    if (el.attributes && el.attributes.href) futureHrefs += 1;
    if (el !== futureCards[0] && (el.tagName === 'BUTTON' || el.tagName === 'A')) futureButtons += 1;
  });
  const futureClassOk = futureCards.length === 1 &&
    String(futureCards[0].className || '').split(/\s+/).includes('nexus-home__module-card--future');
  const ok = names.length === 3 &&
    names.includes('ReumaNEXus') && names.includes('FarmaNEXus') && names.includes('DermaNEXus') &&
    futureCards.length === 1 && futureClassOk && registeredDerma.length === 0 &&
    futureTiles === 0 && futureListeners === 0 && futureHrefs === 0 && futureButtons === 0 &&
    futureState === 'Próximamente';
  record('P4 aliases + future card: Reuma/Farma registered, DermaNEXus future-only "Próximamente", non-interactive', ok,
    `names=${JSON.stringify(names)} future=${futureCards.length} regDerma=${registeredDerma.length} tiles=${futureTiles} listeners=${futureListeners} hrefs=${futureHrefs} buttons=${futureButtons} state=${JSON.stringify(futureState)}`);
}

// --- P5: available card — Disponible + native Entrar button, exactly one tile
{
  const cards = findAllByClass(root, 'nexus-home__module-card');
  const tiles = findAllByClass(root, 'nexus-home__tile');
  const reumaCards = cards.filter((c) => c.getAttribute('data-module-id') === 'reuma');
  const reumaTile = tiles.filter((t) => t.getAttribute('data-module-id') === 'reuma');
  let stateText = '';
  walk(reumaCards[0], (el) => {
    if (typeof el.className === 'string' && el.className.split(/\s+/).includes('nexus-home__module-state')) {
      stateText = el.textContent;
    }
  });
  const button = reumaTile[0];
  const ok = cards.length === 3 && reumaCards.length === 1 && tiles.length === 1 && reumaTile.length === 1 &&
    stateText === 'Disponible' &&
    button && button.tagName === 'BUTTON' && button.textContent === 'Entrar' &&
    typeof (button.__listeners && button.__listeners.click) === 'function';
  record('P5 available card: Disponible + native Entrar button (sole tile, 3 cards total)', ok,
    `cards=${cards.length} tiles=${tiles.length} state=${JSON.stringify(stateText)} tag=${button && button.tagName}`);
}

// --- P6: unavailable card — visible, muted, no tile/listener/href, no route call
{
  const { Renderer, assignCalls } = loadRendererSandbox();
  const routeCalls = [];
  const availabilityCalls = [];
  const context = {
    getBranding() {
      return { productName: 'NEXus', siteName: 'Entorno de demostración' };
    },
    getModules() {
      return [
        { moduleId: 'reuma', label: 'Hub Clínico Reuma' },
        { moduleId: 'farmacia', label: 'Farmacia Hospitalaria' },
      ];
    },
    isModuleAvailable(id) {
      availabilityCalls.push(id);
      return id === 'reuma';
    },
    getNavigableModules() {
      return [{ moduleId: 'reuma', label: 'Hub Clínico Reuma' }];
    },
    getModuleRoute(id) {
      routeCalls.push(id);
      return 'route-for-' + id;
    },
  };
  const stub = createDomStub();
  const view = Renderer.renderHome(context, stub);
  const cards = findAllByClass(view, 'nexus-home__module-card');
  const farma = cards.filter((c) => c.getAttribute('data-module-id') === 'farmacia');
  let farmaTiles = 0;
  let farmaListeners = 0;
  let farmaHrefs = 0;
  let farmaState = '';
  walk(farma[0], (el) => {
    if (typeof el.className === 'string') {
      const classes = el.className.split(/\s+/);
      if (classes.includes('nexus-home__tile')) farmaTiles += 1;
      if (classes.includes('nexus-home__module-state')) farmaState = el.textContent;
    }
    if (el.__listeners && el.__listeners.click) farmaListeners += 1;
    if (el.attributes && el.attributes.href) farmaHrefs += 1;
  });
  // Activate the available module: only its route may be resolved. The future
  // Derma card must never consult the facade: no isModuleAvailable("derma"),
  // no getModuleRoute("derma").
  const tiles = findAllByClass(view, 'nexus-home__tile');
  const click = tiles[0] && tiles[0].__listeners ? tiles[0].__listeners.click : undefined;
  if (typeof click === 'function') click({ type: 'click' });
  const ok = farma.length === 1 && farmaTiles === 0 && farmaListeners === 0 && farmaHrefs === 0 &&
    farmaState === 'No disponible en este entorno' &&
    JSON.stringify(routeCalls) === JSON.stringify(['reuma']) &&
    JSON.stringify(assignCalls) === JSON.stringify(['route-for-reuma']) &&
    !availabilityCalls.includes('derma') && !routeCalls.includes('derma');
  record('P6 unavailable card: visible + muted, no tile/listener/href, no route call, Derma never consults the facade', ok,
    `farmaTiles=${farmaTiles} listeners=${farmaListeners} hrefs=${farmaHrefs} state=${JSON.stringify(farmaState)} routeCalls=${JSON.stringify(routeCalls)} assign=${JSON.stringify(assignCalls)} availabilityCalls=${JSON.stringify(availabilityCalls)}`);
}

// --- P7: native button semantics — no custom key handlers, no tabindex hacks
{
  const tiles = findAllByClass(root, 'nexus-home__tile');
  let keyHandlers = 0;
  let tabindex = 0;
  walk(root, (el) => {
    const listeners = el.__listeners || {};
    for (const type of ['keydown', 'keypress', 'keyup']) {
      if (typeof listeners[type] === 'function') keyHandlers += 1;
    }
    if (el.attributes && Object.prototype.hasOwnProperty.call(el.attributes, 'tabindex')) tabindex += 1;
  });
  const css = readText('nexus_home.css');
  const focusVisible = css.includes(':focus-visible');
  const ok = tiles.length === 1 && tiles[0].tagName === 'BUTTON' &&
    keyHandlers === 0 && tabindex === 0 && focusVisible;
  record('P7 keyboard: native button, no key handlers/tabindex hacks, visible focus', ok,
    `keyHandlers=${keyHandlers} tabindex=${tabindex} focusVisible=${focusVisible}`);
}

// --- P8: zero-navigable keeps unavailable cards visible beside the empty state
{
  const { Renderer } = loadRendererSandbox();
  const context = {
    getBranding() {
      return { productName: 'NEXus', siteName: 'Entorno de demostración' };
    },
    getModules() {
      return [
        { moduleId: 'reuma', label: 'Hub Clínico Reuma' },
        { moduleId: 'farmacia', label: 'Farmacia Hospitalaria' },
      ];
    },
    isModuleAvailable() {
      return false;
    },
    getNavigableModules() {
      return [];
    },
    getModuleRoute(id) {
      const err = new Error('not available');
      err.code = 'MODULE_NOT_AVAILABLE';
      throw err;
    },
  };
  const stub = createDomStub();
  const view = Renderer.renderHome(context, stub);
  const tiles = findAllByClass(view, 'nexus-home__tile');
  const empty = findAllByClass(view, 'nexus-home__empty');
  const errors = findAllByClass(view, 'nexus-home__error');
  const cards = findAllByClass(view, 'nexus-home__module-card');
  const ok = tiles.length === 0 && empty.length === 1 && errors.length === 0 && cards.length === 3;
  record('P8 zero-navigable: empty state + unavailable cards visible + future Derma card, zero tiles', ok,
    `tiles=${tiles.length} empty=${empty.length} errors=${errors.length} cards=${cards.length}`);
}

// --- P9: alias fallback + conditional derma alias on synthetic doubles
{
  const { Renderer } = loadRendererSandbox();
  const context = {
    getBranding() {
      return { productName: 'NEXus', siteName: 'Entorno de demostración' };
    },
    getModules() {
      return [
        { moduleId: 'fisio', label: 'Fisioterapia' },
        { moduleId: 'derma', label: 'Dermatología' },
      ];
    },
    isModuleAvailable() {
      return true;
    },
    getNavigableModules() {
      return this.getModules();
    },
    getModuleRoute(id) {
      return 'route-for-' + id;
    },
  };
  const stub = createDomStub();
  const view = Renderer.renderHome(context, stub);
  const names = findAllByClass(view, 'nexus-home__module-name').map((el) => el.textContent);
  const ok = names.includes('Fisioterapia') && names.includes('DermaNEXus');
  record('P9 aliases: unaliased module falls back to label, derma alias is conditional', ok,
    `names=${JSON.stringify(names)}`);
}

// --- P10: getModules()-less doubles fall back to the navigable set
{
  const { Renderer } = loadRendererSandbox();
  const context = {
    getBranding() {
      return { productName: 'Producto', siteName: 'Sitio' };
    },
    getNavigableModules() {
      return [{ moduleId: 'synthetic-module', label: 'Módulo sintético' }];
    },
    getModuleRoute(id) {
      return 'route-for-' + id;
    },
  };
  const stub = createDomStub();
  const view = Renderer.renderHome(context, stub);
  const names = findAllByClass(view, 'nexus-home__module-name').map((el) => el.textContent);
  const tiles = findAllByClass(view, 'nexus-home__tile');
  const future = findAllByClass(view, 'nexus-home__module-card--future');
  const ok = names.includes('Módulo sintético') && names.includes('DermaNEXus') &&
    future.length === 1 && tiles.length === 1 && tiles[0].tagName === 'BUTTON';
  record('P10 compatibility fallback without getModules() renders the navigable set + future Derma card', ok,
    `names=${JSON.stringify(names)} tiles=${tiles.length} future=${future.length}`);
}

// --- P11: packaged tree hygiene — zero anchors, zero hrefs, no route strings
{
  let anchors = 0;
  let hrefs = 0;
  let routeStrings = 0;
  walk(root, (el) => {
    if (el.tagName === 'A') anchors += 1;
    if (el.attributes && el.attributes.href) hrefs += 1;
    if (/\.html/.test(String(el.textContent || ''))) routeStrings += 1;
    for (const v of Object.values(el.attributes || {})) {
      if (/\.html/.test(String(v))) routeStrings += 1;
    }
  });
  const ok = anchors === 0 && hrefs === 0 && routeStrings === 0;
  record('P11 tree hygiene: zero anchors, zero hrefs, no route strings', ok,
    `anchors=${anchors} hrefs=${hrefs} routeStrings=${routeStrings}`);
}

// --- P12: NEXus favicon — explicitly linked from Home, derived from the
// approved isotipo; the obsolete app-icon bytes are gone. The embedded raster
// is a square transparent (RGBA) canvas with no white square and no wordmark.
{
  const OLD_APP_ICON_SHA256 =
    '02bb2e0e1fb9d3b6d2712e1b834bbebcbe3d92cd0ee92347e7fabb51c8d8b301';
  const html = readText('nexus_home.html');
  const linkOk = html.includes('<link rel="icon" href="favicon.svg" type="image/svg+xml">');
  const svgText = readText('favicon.svg');
  const svgBytes = fs.readFileSync(path.join(ROOT, 'favicon.svg'));
  const dataUriMatch = svgText.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
  const embedded = dataUriMatch ? Buffer.from(dataUriMatch[1], 'base64') : Buffer.alloc(0);
  const embeddedSha = embedded.length > 0
    ? crypto.createHash('sha256').update(embedded).digest('hex')
    : '';
  // Minimal IHDR parse: 8-byte signature + width/height/colour-type.
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const width = embedded.length >= 24 ? embedded.readUInt32BE(16) : 0;
  const height = embedded.length >= 24 ? embedded.readUInt32BE(20) : 0;
  const colourType = embedded.length >= 26 ? embedded[25] : -1;
  const canvasOk = embedded.subarray(0, 8).equals(pngSig) && width === 64 && height === 64 && colourType === 6;
  const ok = linkOk &&
    svgText.includes('<svg') && svgText.includes('viewBox="0 0 64 64"') &&
    !svgText.includes('<rect') && !svgText.includes('<text') &&
    !/white|#fff/i.test(svgText) &&
    embeddedSha !== '' && embeddedSha !== OLD_APP_ICON_SHA256 &&
    !svgBytes.includes(Buffer.from(OLD_APP_ICON_SHA256, 'utf8')) &&
    canvasOk;
  record('P12 favicon: linked from Home, approved-isotipo bytes, square transparent canvas, old app-icon gone', ok,
    `link=${linkOk} embeddedSha=${embeddedSha} canvas=${width}x${height} colourType=${colourType}`);
}

const failed = results.filter((r) => !r.pass);
console.log(`\nRESULTADO: ${results.length - failed.length} OK / ${failed.length} FALLIDO`);
if (failed.length > 0) {
  console.log('FALLIDOS:');
  for (const f of failed) console.log(`  - ${f.name}`);
  console.log('Nexus Home UX-01 presentation checker FAILED');
  process.exit(1);
}
console.log('Nexus Home UX-01 presentation checker PASSED');
