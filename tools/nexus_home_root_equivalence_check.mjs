#!/usr/bin/env node
'use strict';
/**
 * Deterministic guard for WO-NEXUS-PAGES-CUTOVER-T2 (issue #605, train #606):
 * the repository root (index.html) serves the real NEXus Home as a genuine
 * static document, semantically equivalent to nexus_home.html.
 *
 * Asserts from the live repository tree (no browser, no network):
 *   R1 root-Home equivalence: index.html is byte-identical to nexus_home.html,
 *      so the two entrypoints cannot diverge (same scripts, same css, same
 *      home-root, same bootstrap, same favicon).
 *   R2 both Home documents carry the exact Home contract: the six platform +
 *      Home scripts, nexus_home.css, <element id="home-root">, favicon.svg
 *      and the DOMContentLoaded PromueveHome.Page.start() bootstrap.
 *   R3 neither Home document is a redirect shell: no meta refresh, no
 *      location.replace/assign, no iframe, and no clinical runtime
 *      (script.js / HubTools / dataManager / exportManager).
 *   R4 no absolute origin-root asset paths ("/foo.js") in either document:
 *      everything resolves under the hosted project prefix.
 *   R5 live registry/routes consistency: reuma entryPath is reuma_index.html,
 *      farmacia entryPath is farmacia_index.html, the packaged manifest and
 *      readiness carry the same routes, and the tools fixture registry is
 *      byte-identical to the live registry.
 *   R6 Reuma session/home never resolves to root Home: script.js performs no
 *      navigation to bare index.html (session fallback and logout land on
 *      reuma_index.html), the session exemption covers reuma_index.html and
 *      no longer treats index.html as a Reuma entry.
 *
 * Exit codes: 0 = all cases PASS, 1 = at least one case FAIL.
 * Usage: node tools/nexus_home_root_equivalence_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
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

console.log('Nexus Home T2 — root (index.html) equivalence guard');

const indexHtml = readText('index.html');
const nexusHtml = readText('nexus_home.html');

// --- R1: byte-identical equivalence ---------------------------------------
record('R1 index.html is byte-identical to nexus_home.html (no divergence)',
  indexHtml === nexusHtml,
  `index.html=${indexHtml.length} bytes nexus_home.html=${nexusHtml.length} bytes`);

// --- R2: exact Home contract in both documents -----------------------------
{
  const requiredScripts = [
    'modules/platform/configuration-repository.js',
    'modules/platform/platform-context.js',
    'modules/home/home-schema-validators.generated.js',
    'modules/home/home-bootstrap.js',
    'modules/home/home-renderer.js',
    'modules/home/home-page.js',
  ];
  for (const [label, html] of [['index.html', indexHtml], ['nexus_home.html', nexusHtml]]) {
    const scriptsOk = requiredScripts.every((src) => html.includes(src));
    const cssOk = html.includes('nexus_home.css');
    const rootOk = /id="home-root"/.test(html);
    const faviconOk = html.includes('favicon.svg');
    const bootstrapOk = html.includes('PromueveHome.Page.start()');
    const ok = scriptsOk && cssOk && rootOk && faviconOk && bootstrapOk;
    record(`R2 ${label}: exact Home script set + css + home-root + favicon + bootstrap`, ok,
      `scripts=${scriptsOk} css=${cssOk} root=${rootOk} favicon=${faviconOk} bootstrap=${bootstrapOk}`);
  }
}

// --- R3: genuine document, never a redirect shell or clinical runtime ------
{
  const REDIRECT_RE = /<meta[^>]+http-equiv=["']?refresh["']?|location\s*\.\s*(replace|assign)\s*\(|<iframe/i;
  const CLINICAL_RE = /script\.js|HubTools|dataManager|exportManager/;
  for (const [label, html] of [['index.html', indexHtml], ['nexus_home.html', nexusHtml]]) {
    const noRedirect = !REDIRECT_RE.test(html);
    const noClinical = !CLINICAL_RE.test(html);
    record(`R3 ${label}: genuine static document (no refresh/redirect/iframe, no clinical runtime)`,
      noRedirect && noClinical, `noRedirect=${noRedirect} noClinical=${noClinical}`);
  }
}

// --- R4: no absolute origin-root asset paths --------------------------------
{
  const ORIGIN_ROOT_RE = /(?:src|href)\s*=\s*["']\//;
  for (const [label, html] of [['index.html', indexHtml], ['nexus_home.html', nexusHtml]]) {
    const ok = !ORIGIN_ROOT_RE.test(html);
    record(`R4 ${label}: no absolute origin-root asset paths`, ok,
      ok ? 'all asset paths relative' : 'found src/href="/..."');
  }
}

// --- R5: live registry/routes consistency -----------------------------------
{
  try {
    const registry = JSON.parse(readText('data/platform/home/module-registry.json'));
    const manifest = JSON.parse(readText('data/platform/home/deployment-manifest.json'));
    const readiness = JSON.parse(readText('data/platform/home/module-readiness.json'));
    const byId = (doc, key) => Object.fromEntries(doc.modules.map((m) => [m.moduleId, m[key]]));
    const regRoutes = byId(registry, 'entryPath');
    const manRoutes = byId(manifest, 'entryPath');
    const readRoutes = byId(readiness, 'route');
    const ok =
      regRoutes.reuma === 'reuma_index.html' && regRoutes.farmacia === 'farmacia_index.html' &&
      manRoutes.reuma === 'reuma_index.html' && manRoutes.farmacia === 'farmacia_index.html' &&
      readRoutes.reuma === 'reuma_index.html' && readRoutes.farmacia === 'farmacia_index.html';
    record('R5 live registry/manifest/readiness route reuma_index.html + farmacia_index.html', ok,
      `registry=${JSON.stringify(regRoutes)} manifest=${JSON.stringify(manRoutes)} readiness=${JSON.stringify(readRoutes)}`);
  } catch (err) {
    record('R5 live registry/manifest/readiness route reuma_index.html + farmacia_index.html', false, err.message);
  }
  const fixtureSync = readText('tools/fixtures/home/module-registry.json') === readText('data/platform/home/module-registry.json');
  record('R5b tools fixture registry byte-identical to the live registry', fixtureSync,
    fixtureSync ? 'in sync' : 'fixture diverges from live registry');
}

// --- R6: Reuma session/home never resolves to root index.html ----------------
{
  const script = readText('script.js');
  const noRootFallback = !/window\.location\.href\s*=\s*['"]index\.html['"]/.test(script);
  const reumaFallbacks = (script.match(/window\.location\.href\s*=\s*['"]reuma_index\.html['"]/g) || []).length;
  const exemptionCoversReuma = /currentPage\s*===\s*['"]reuma_index\.html['"]/.test(script);
  const exemptionIgnoresRoot = !/currentPage\s*===\s*['"]index\.html['"]/.test(script);
  const ok = noRootFallback && reumaFallbacks >= 2 && exemptionCoversReuma && exemptionIgnoresRoot;
  record('R6 script.js: session/logout land on reuma_index.html, Home root is not a Reuma entry', ok,
    `noRootFallback=${noRootFallback} reumaFallbacks=${reumaFallbacks} exemptionCoversReuma=${exemptionCoversReuma} exemptionIgnoresRoot=${exemptionIgnoresRoot}`);
  const seguimiento = readText('seguimiento.html');
  const seguimientoOk = !/window\.location\.href\s*=\s*['"]index\.html['"]/.test(seguimiento) &&
    /window\.location\.href\s*=\s*['"]reuma_index\.html['"]/.test(seguimiento);
  record('R6b seguimiento.html return lands on reuma_index.html, never root Home', seguimientoOk,
    seguimientoOk ? 'return=reuma_index.html' : 'root index.html return still present');
}

const failed = results.filter((r) => !r.pass);
console.log(`\nRESULTADO: ${results.length - failed.length} OK / ${failed.length} FALLIDO`);
if (failed.length > 0) {
  console.log('FALLIDOS:');
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exit(1);
}
console.log('Nexus Home T2 root equivalence guard PASSED');
