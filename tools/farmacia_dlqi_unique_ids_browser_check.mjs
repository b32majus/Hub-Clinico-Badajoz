#!/usr/bin/env node
// Issue #357 R4 — DLQI DOM identity regression (Primera Visita + Seguimiento).
// Supported-interaction browser check: renderDLQI() runs at page init, PROMs block
// expanded through the supported select, answers chosen by clicking rendered radios.
// Covers:
// - zero duplicate DLQI input ids after renderDLQI() in both surfaces;
// - `Nada` and `Sin relación` are distinct options with the same score 0
//   (different ids, same data-dlqi-val);
// - labels keep associating the correct input;
// - radio-group mutual exclusion preserved;
// - selecting `Nada` records score 0 + text `Nada`, `Sin relación` records
//   score 0 + text `Sin relación` (PV contract via buildFirstVisitPromsV2);
// - Q7 + follow-up behavior preserved (`No — Sin relación` response text);
// - DLQI total and interpretation unchanged for a known answer sequence;
// - console.error = 0, pageerror = 0.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPlaywrightFromNpx() {
  const roots = [];
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    roots.push(path.resolve(binDirectory, '..'));
    roots.push(path.join(path.resolve(binDirectory, '..'), 'lib', 'node_modules'));
  }
  for (const nodeModules of roots) {
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_dlqi_unique_ids_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_dlqi_unique_ids_browser_check.mjs');
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

// Known answer sequence: mixed standard / Nada / Sin relación answers.
// Q1=Mucho(3) Q2=Bastante(2) Q3=Sin relación(0) Q4=Un poco(1) Q5=Mucho(3)
// Q6=Nada(0) Q7=No + follow-up Sin relación(0) Q8=Bastante(2) Q9=Nada(0) Q10=Un poco(1)
// Total = 12; interpretation = "Efecto muy importante sobre la calidad de vida".
const EXPECTED_TOTAL = 12;
const EXPECTED_INTERPRETATION = 'Efecto muy importante sobre la calidad de vida';
const ANSWER_IDS = (prefix) => [
  `${prefix}Q1V3`, `${prefix}Q2V2`, `${prefix}Q3V0NR`, `${prefix}Q4V1`, `${prefix}Q5V3`,
  `${prefix}Q6V0`, `${prefix}Q7AVtrigger`, null, `${prefix}Q8V2`, `${prefix}Q9V0`, `${prefix}Q10V1`
];

for (const surface of ['farmacia_primera_visita.html', 'farmacia_seguimiento.html']) {
  const isPv = surface === 'farmacia_primera_visita.html';
  const idPrefix = isPv ? 'fhPvDlqi' : 'fhSegDlqi';
  const containerId = isPv ? 'fhPvDlqiQuestions' : 'fhSegDlqiQuestions';
  const promsSelect = isPv ? '#fhPvProms' : '#fhSegProms';
  const promsValue = isPv ? 'Sí' : 'Sí, recoger DLQI + EVA dolor/prurito';
  const totalId = isPv ? 'fhPvDlqiTotal' : 'fhSegDlqiTotal';
  const interpId = isPv ? 'fhPvDlqiInterp' : 'fhSegDlqiInterp';
  console.log(`\n== ${surface} ==`);

  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`${surface}: ${message.text()}`); });
  page.on('pageerror', error => pageErrors.push(`${surface}: ${String(error)}`));

  await page.goto(`${BASE}${surface}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((cid) => document.querySelectorAll(`#${cid} input[id]`).length > 0, containerId);

  // 1. Zero duplicate DLQI ids after supported rendering.
  const dupReport = await page.evaluate((cid) => {
    const ids = [...document.querySelectorAll(`#${cid} input[id]`)].map(el => el.id);
    const counts = new Map();
    for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
    return {
      total: ids.length,
      duplicates: [...counts.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id}(${n})`)
    };
  }, containerId);
  assert.equal(dupReport.total, 49, `${surface}: 49 DLQI inputs rendered`);
  assert.deepEqual(dupReport.duplicates, [], `${surface}: zero duplicate DLQI ids after renderDLQI()`);
  const docDuplicates = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('input[id]')].map(el => el.id);
    const counts = new Map();
    for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
    return [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id);
  });
  assert.deepEqual(docDuplicates, [], `${surface}: zero duplicate input ids in the whole document`);

  // 2. Nada vs Sin relación: same score 0, distinct ids, per-question and Q7 follow-up.
  const identity = await page.evaluate((cid) => {
    const radios = [...document.querySelectorAll(`#${cid} input[type="radio"]`)];
    const byName = (name) => radios.filter(r => r.name === name);
    const zeroPairs = [];
    for (const group of [...new Set(radios.map(r => r.name))]) {
      const zeros = byName(group).filter(r => r.getAttribute('data-dlqi-val') === '0');
      if (zeros.length > 1) {
        zeroPairs.push({
          group,
          ids: zeros.map(r => r.id),
          labels: zeros.map(r => (r.closest('label') ? r.closest('label').textContent : '').trim())
        });
      }
    }
    return zeroPairs;
  }, containerId);
  assert.equal(identity.length, 8, `${surface}: 8 groups with both Nada and Sin relación (Q3-Q6, Q8-Q10 + Q7 follow-up)`);
  for (const pair of identity) {
    assert.equal(new Set(pair.ids).size, 2, `${surface} ${pair.group}: Nada and Sin relación have distinct ids`);
    assert.equal(new Set(pair.ids).has('') , false, `${surface} ${pair.group}: no empty id`);
  }
  assert.deepEqual(identity[0].labels.sort(), ['Nada', 'Sin relación'], `${surface}: the two score-0 options are Nada and Sin relación`);
  assert.equal(identity[0].ids[0].endsWith('V0'), true, `${surface}: Nada id keeps the existing V0 scheme`);
  assert.equal(identity[0].ids[1].endsWith('V0NR'), true, `${surface}: Sin relación id gets the stable NR token`);
  for (const r of await page.locator(`#${containerId} input[data-dlqi-val="0"]`).all()) {
    assert.equal(await r.getAttribute('data-dlqi-val'), '0', `${surface}: every score-0 input keeps data-dlqi-val="0"`);
  }

  // 3. Labels stay associated with the correct input.
  const labelAssociation = await page.evaluate((cid) => {
    const problems = [];
    for (const wrapper of document.querySelectorAll(`#${cid} label.dlqi-option`)) {
      const input = wrapper.querySelector('input[type="radio"]');
      if (!input) problems.push(`label without input: ${wrapper.textContent.trim()}`);
      const inputText = (input.closest('label') === wrapper) ? null : 'input-not-wrapped';
      if (inputText) problems.push(`${input.id}: ${inputText}`);
    }
    return problems;
  }, containerId);
  assert.deepEqual(labelAssociation, [], `${surface}: each option input stays wrapped by its label`);

  // 4. Expand the PROMs block through the supported select.
  await page.selectOption(promsSelect, promsValue);

  // 5. Mutual exclusion + score 0 semantics on a sinRelacion question (Q3).
  await page.check(`#${idPrefix}Q3V0`);
  assert.equal(await page.isChecked(`#${idPrefix}Q3V0`), true, `${surface}: Nada (Q3) selectable`);
  assert.equal(await page.isChecked(`#${idPrefix}Q3V0NR`), false, `${surface}: Sin relación (Q3) excluded while Nada checked`);
  await page.check(`#${idPrefix}Q3V0NR`);
  assert.equal(await page.isChecked(`#${idPrefix}Q3V0NR`), true, `${surface}: Sin relación (Q3) selectable as distinct option`);
  assert.equal(await page.isChecked(`#${idPrefix}Q3V0`), false, `${surface}: Nada (Q3) excluded while Sin relación checked`);
  assert.equal(await page.getAttribute(`#${idPrefix}Q3V0NR`, 'data-dlqi-val'), '0', `${surface}: Sin relación keeps score 0`);

  // 6. Q7: trigger + follow-up with Sin relación, supported interaction.
  await page.check(`#${idPrefix}Q7AVtrigger`);
  const followupVisible = await page.evaluate((cid) => {
    const card = document.querySelector(`#${cid} .dlqi-card__followup`);
    return card && !card.classList.contains('hidden');
  }, containerId);
  assert.equal(followupVisible, true, `${surface}: Q7 follow-up becomes visible after selecting No`);
  await page.check(`#${idPrefix}Q7BV0NR`);
  assert.equal(await page.isChecked(`#${idPrefix}Q7BV0NR`), true, `${surface}: Sin relación follow-up selectable`);
  assert.equal(await page.getAttribute(`#${idPrefix}Q7BV0NR`, 'data-dlqi-val'), '0', `${surface}: Q7 follow-up Sin relación keeps score 0`);

  // 7. Fill the known sequence and verify total + interpretation are unchanged.
  await page.check(`#${idPrefix}Q1V3`);
  await page.check(`#${idPrefix}Q2V2`);
  await page.check(`#${idPrefix}Q4V1`);
  await page.check(`#${idPrefix}Q5V3`);
  await page.check(`#${idPrefix}Q6V0`);
  await page.check(`#${idPrefix}Q8V2`);
  await page.check(`#${idPrefix}Q9V0`);
  await page.check(`#${idPrefix}Q10V1`);
  assert.equal(await page.textContent(`#${totalId}`), String(EXPECTED_TOTAL), `${surface}: DLQI total unchanged for known sequence`);
  const interp = (await page.textContent(`#${interpId}`)).replace(/^ — /, '').trim();
  assert.equal(interp, EXPECTED_INTERPRETATION, `${surface}: DLQI interpretation unchanged`);

  // 8. PV: answer-text semantics through the supported export projection.
  if (isPv) {
    const proms = await page.evaluate(() => window.FarmaciaPrimeraVisita.buildFirstVisitPromsV2());
    assert.notEqual(proms, null, 'PV: buildFirstVisitPromsV2 available with PROMs Sí');
    const dlqi = proms.find(p => p.instrument === 'DLQI');
    assert.ok(dlqi, 'PV: DLQI instrument present in projection');
    const q3 = dlqi.answers.find(a => a.item === 3);
    const q6 = dlqi.answers.find(a => a.item === 6);
    const q7 = dlqi.answers.find(a => a.item === 7);
    assert.equal(q3.score, 0, 'PV: Q3 score 0');
    assert.equal(q3.response, 'Sin relación', 'PV: Q3 response text `Sin relación`');
    assert.equal(q6.score, 0, 'PV: Q6 score 0');
    assert.equal(q6.response, 'Nada', 'PV: Q6 response text `Nada`');
    assert.equal(q7.score, 0, 'PV: Q7 follow-up score preserved');
    assert.equal(q7.response, 'No — Sin relación', 'PV: Q7 follow-up response text preserved');
    assert.equal(dlqi.value, EXPECTED_TOTAL, 'PV: projection DLQI total unchanged');
    assert.equal(dlqi.complete, true, 'PV: DLQI completeness preserved');
  } else {
    // Seguimiento: observe the checked option and its preserved score/text contract.
    const q3Nada = await page.evaluate(() => {
      const el = document.querySelector('#fhSegDlqiQ3V0NR');
      const label = (el.closest('label') ? el.closest('label').textContent : '').trim();
      return { checked: el.checked, score: el.getAttribute('data-dlqi-val'), label };
    });
    assert.equal(q3Nada.checked, true, 'Seguimiento: Sin relación (Q3) stays selected');
    assert.equal(q3Nada.score, '0', 'Seguimiento: Sin relación keeps score 0');
    assert.equal(q3Nada.label, 'Sin relación', 'Seguimiento: Sin relación label preserved');
    const segLines = await page.evaluate(() => window.FarmaciaSeguimiento.buildSegLines());
    const dlqiLine = segLines.filter(line => String(line).includes('DLQI total:'));
    assert.equal(dlqiLine.length > 0, true, 'Seguimiento: export includes DLQI total line');
    assert.ok(String(dlqiLine[0]).includes(String(EXPECTED_TOTAL)), 'Seguimiento: export DLQI total unchanged');
  }

  await context.close();
}

await browser.close();
server.close();

assert.deepEqual(consoleErrors, [], 'console.error = 0');
assert.deepEqual(pageErrors, [], 'pageerror = 0');

console.log('\nDLQI unique ids browser check: ALL PASS');
