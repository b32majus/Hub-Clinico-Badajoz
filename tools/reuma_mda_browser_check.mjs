// Supported-interaction browser QA for T4 #516 (TRAIN-NEXUS-REUMA-SAFETY-WIRING-12).
// Real Chromium, synthetic workbook gate, both pages. Not part of verify:nexus.
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

function loadPlaywright() {
  const tryNM = (nm) => {
    if (fs.existsSync(path.join(nm, 'playwright', 'package.json')))
      return createRequire(path.join(nm, '__loader.cjs'))('playwright');
    return null;
  };
  for (const b of String(process.env.PATH || '').split(path.delimiter)) {
    if (!b) continue;
    const prefix = path.resolve(b, '..');
    for (const nm of [prefix, path.join(prefix, 'lib', 'node_modules')]) { const l = tryNM(nm); if (l) return l; }
  }
  const npx = path.join(process.env.HOME || '', '.npm', '_npx');
  if (fs.existsSync(npx)) for (const e of fs.readdirSync(npx).sort().reverse()) { const l = tryNM(path.join(npx, e, 'node_modules')); if (l) return l; }
  const l = tryNM(path.join(ROOT, 'node_modules')); if (l) return l;
  throw new Error('playwright not found');
}
const { chromium } = loadPlaywright();
function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (fs.existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!fs.existsSync(cache)) return bundled;
  const c = fs.readdirSync(cache).filter(e => e.startsWith('chromium_headless_shell-')).sort().reverse()
    .map(e => path.join(cache, e, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return c.find(fs.existsSync) || bundled;
}
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8'],['.svg','image/svg+xml'],['.xlsx','application/octet-stream']]);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-mda-'));
const workbookPath = path.join(tempDir, 'synthetic.xlsx');
{
  const wb = XLSX.utils.book_new();
  for (const s of ['ESPA','APS','AR','LES','SJOGREN']) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ ID_Paciente: 'SYN-000-000' }]), s);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Nombre_Completo: 'Sintetico Profesional Uno', Cargo: 'Reumatologia' }]), 'Profesionales');
  fs.writeFileSync(workbookPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
const server = createServer((req,res)=>{
  const p = path.join(ROOT, decodeURIComponent((req.url||'/').split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || !fs.statSync(p).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200,{'Content-Type': mime.get(path.extname(p))||'application/octet-stream'});
  fs.createReadStream(p).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, executablePath: chromiumExecutable() });

const results = [];
const log = (...a)=>console.log(...a);
function check(name, pass, detail) {
  results.push(!!pass);
  log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : (detail ? ` -> ${detail}` : '')}`);
}

async function gate() {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}/reuma_index.html`, { waitUntil:'load', timeout:45000 });
  await page.setInputFiles('#gateExcelInput', workbookPath);
  await page.waitForSelector('#gateStepSelect:not(.hidden)', { timeout:20000 });
  const prof = await page.evaluate(()=>{const s=document.getElementById('gateProfessionalSelect');return s?Array.from(s.options).map(o=>o.value).find(Boolean)||'':'';});
  await page.selectOption('#gateProfessionalSelect', prof);
  await page.click('#gateConfirmBtn');
  await page.waitForFunction(()=>document.getElementById('sessionGate').classList.contains('hidden'), null, {timeout:10000});
  await page.close();
  return ctx;
}
async function open(pagePath) {
  const ctx = await gate();
  const page = await ctx.newPage();
  const errs=[]; const perrs=[];
  page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
  page.on('pageerror', e=>perrs.push(String(e)));
  await page.goto(`${baseUrl}/${pagePath}`, { waitUntil:'domcontentloaded' });
  return { ctx, page, errs, perrs };
}
async function isHit(page, sel) {
  return page.evaluate((s)=>{
    const el=document.querySelector(s); if(!el) return {exists:false};
    el.scrollIntoView({block:'center'});
    const r=el.getBoundingClientRect();
    const cs=getComputedStyle(el);
    if(r.width===0||r.height===0) return {exists:true,box:false,disp:cs.display};
    const top=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2);
    return {exists:true,box:true,hit:!!top&&(top===el||el.contains(top)),top: top?(top.tagName):null};
  }, sel);
}
async function openCollapsibles(page, sel) {
  for (let i=0;i<6;i++){
    const info = await isHit(page, sel);
    if (info.hit) return info;
    const headers = page.locator(sel).first().locator('xpath=ancestor::*[contains(@class,"collapsible-section")]/button[contains(@class,"collapsible-header")]');
    const n = await headers.count(); let clicked=false;
    for (let k=0;k<n;k++){ const h=headers.nth(k); if(!(await h.evaluate(e=>e.classList.contains('active')))){ await h.click({timeout:5000}); clicked=true; await page.waitForTimeout(650);} }
    if(!clicked) return info;
  }
  return isHit(page, sel);
}
async function readMDA(page) {
  return page.evaluate(() => {
    const txt = (id) => { const el = document.getElementById(id); return el ? el.textContent.trim() : null; };
    const statuses = [], estados = [];
    for (let i = 1; i <= 7; i++) {
      const el = document.getElementById('mdaStatus' + i);
      statuses.push(el ? el.textContent.trim() : null);
      estados.push(el ? el.getAttribute('data-estado') : null);
    }
    const values = Array.from(document.querySelectorAll('.mda-criterio-valor')).map((el) => el.textContent.trim());
    return { final: txt('mdaResultadoFinal'), cumplidos: txt('mdaCumplidos'), statuses, estados, values };
  });
}
async function fill(page, sel, value) {
  await page.locator(sel).first().fill(value);
  await page.waitForTimeout(120);
}
// Supported interaction: answer six real `.haq-score` categories (re-freeze
// #516 correction: HAQ evidence must be captured, never a static 0.00).
async function answerHAQ(page) {
  await openCollapsibles(page, '.haq-score');
  const total = await page.locator('.haq-score').count();
  for (let i = 0; i < Math.min(6, total); i++) {
    await page.locator('.haq-score').nth(i).selectOption('0');
  }
  await page.waitForTimeout(150);
}
async function markHomunculus(page, mode, region) {
  const btnSel = `.homunculus-mode-btn[data-mode="${mode}"]`;
  await openCollapsibles(page, btnSel);
  await page.locator(btnSel).first().scrollIntoViewIfNeeded();
  await page.locator(btnSel).first().click({ timeout: 8000 });
  await page.waitForTimeout(120);
  const regSel = `[data-region-id="${region}"]`;
  await openCollapsibles(page, regSel);
  await page.locator(regSel).first().click({ timeout: 8000 });
  await page.waitForTimeout(220);
}

log('T4 #516 MDA supported-interaction browser QA (AFTER)');

for (const pagePath of ['primera_visita.html', 'seguimiento.html']) {
  log(`\n########## ${pagePath} ##########`);
  const { ctx, page, errs, perrs } = await open(pagePath);
  try {
    // --- D: visibility APs-only + no manual controls ----------------------
    await page.selectOption('#diagnosticoPrimario', 'espa');
    await page.waitForTimeout(300);
    const espaDisp = await page.evaluate(() => getComputedStyle(document.getElementById('mdaSection')).display);
    await page.selectOption('#diagnosticoPrimario', 'aps');
    await page.waitForTimeout(300);
    const apsDisp = await page.evaluate(() => getComputedStyle(document.getElementById('mdaSection')).display);
    check(`${pagePath} #mdaSection APs-only (none en EspA, visible en APs)`, espaDisp === 'none' && apsDisp !== 'none', `espa='${espaDisp}', aps='${apsDisp}'`);
    const controls = await page.evaluate(() => document.querySelectorAll('#mdaSection input, #mdaSection select, #mdaSection textarea, #mdaSection button').length);
    check(`${pagePath} #mdaSection sin controles manuales`, controls === 0, `controls=${controls}`);

    await openCollapsibles(page, '#mdaSection');

    // --- (a) no sources -> pending, no fabricated 'not fulfilled' ----------
    const base = await readMDA(page);
    check(`${pagePath} SIN FUENTES: cumplidos '—', sin ALCANZADO, sin filas ✗`,
      base.cumplidos === '—' && !base.final.toUpperCase().includes('ALCANZADO') && !base.statuses.includes('✗'),
      JSON.stringify(base));
    log(`    ${pagePath} SIN FUENTES: final='${base.final}' cumplidos='${base.cumplidos}' statuses=${JSON.stringify(base.statuses)} estados=${JSON.stringify(base.estados)}`);
    check(`${pagePath} fuentes pendientes nombradas en el panel`,
      base.final.toLowerCase().includes('fuentes ausentes') && base.final.includes('EVA Dolor') && base.final.includes('EVA Global'),
      `final='${base.final}'`);
    // Re-freeze #516 correction: the seven COLLECTED value spans (legacy 497
    // columns 186-192) never render '—'; absent source -> ''. #haqTotal empty.
    check(`${pagePath} SIN FUENTES: los 7 spans de valor recogidos quedan '' (nunca '—')`,
      base.values.length === 7 && base.values.every((v) => v === ''), JSON.stringify(base.values));
    check(`${pagePath} #haqTotal arranca vacío (sin HAQ fabricado)`,
      await page.evaluate(() => { const el = document.getElementById('haqTotal'); return !!el && el.textContent.trim() === ''; }));

    // --- page-specific source availability --------------------------------
    const availability = await page.evaluate(() => ({
      pasi: !!document.getElementById('pasiValue'),
      bsa: !!document.getElementById('bsaValue'),
      lei: document.querySelectorAll('.lei-point').length
    }));
    log(`    ${pagePath} disponibilidad: pasi=${availability.pasi} bsa=${availability.bsa} lei-point=${availability.lei}`);

    // --- NAT/NAD via homunculus + EVA sources -----------------------------
    await markHomunculus(page, 'nat', 'hombro-derecho');
    await markHomunculus(page, 'nad', 'hombro-izquierdo');
    await fill(page, '#evaDolor', '1');
    await fill(page, '#evaGlobal', '1');
    const mid = await readMDA(page);
    log(`    ${pagePath} CON NAT/NAD+EVA: final='${mid.final}' cumplidos='${mid.cumplidos}' statuses=${JSON.stringify(mid.statuses)} valores=${JSON.stringify(mid.values)}`);
    // Re-freeze #516 correction: HAQ is never fulfilled without captured
    // answers, and no collected value span ever shows the '—' glyph.
    check(`${pagePath} HAQ sin responder -> criterio HAQ pendiente`,
      mid.estados[6] === 'pendiente' && mid.statuses[6] === '—' && mid.values[6] === '',
      `e7='${mid.estados[6]}', s7='${mid.statuses[6]}', v7='${mid.values[6]}'`);
    check(`${pagePath} ningún span de valor recogido contiene '—'`,
      mid.values.every((v) => !v.includes('—')), JSON.stringify(mid.values));

    if (pagePath === 'seguimiento.html') {
      // --- (b) HAQ: pendiente until actually answered ----------------------
      check('seguimiento psoriasis pendiente antes de BSA', mid.statuses[2] === '—' && mid.estados[2] === 'pendiente', JSON.stringify({ s3: mid.statuses[2], e3: mid.estados[2] }));
      await answerHAQ(page);
      const haqTotal = await page.evaluate(() => { const el = document.getElementById('haqTotal'); return el ? el.textContent.trim() : null; });
      check('seguimiento HAQ respondido (6 selects) -> #haqTotal derivado 0.00', haqTotal === '0.00', `haqTotal='${haqTotal}'`);
      const afterHaq = await readMDA(page);
      check('seguimiento HAQ respondido -> criterio HAQ cumplido', afterHaq.estados[6] === 'cumplido' && afterHaq.statuses[6] === '✓', JSON.stringify({ e7: afterHaq.estados[6], s7: afterHaq.statuses[6] }));

      // --- (c) only PASI > 1 -> psoriasis pendiente, real value visible ----
      await fill(page, '#pasiValue', '1.1');
      const afterPasi = await readMDA(page);
      check('seguimiento sólo PASI 1.1 -> psoriasis pendiente (nunca negativo)',
        afterPasi.estados[2] === 'pendiente' && afterPasi.statuses[2] === '—',
        `e3='${afterPasi.estados[2]}', s3='${afterPasi.statuses[2]}'`);
      check('seguimiento PASI 1.1 presente se muestra como valor real (no \u2014, no vacío)',
        afterPasi.values[2] === 'PASI: 1.1', `v3='${afterPasi.values[2]}'`);

      // --- (d) BSA alone flips the psoriasis row ---------------------------
      await fill(page, '#bsaValue', '3');
      const afterBsa = await readMDA(page);
      check('seguimiento sólo BSA flipa psoriasis a cumplido (nuevo trigger)',
        afterBsa.statuses[2] === '✓' && afterBsa.estados[2] === 'cumplido',
        `s3='${afterBsa.statuses[2]}'(${afterBsa.estados[2]})`);

      // --- full derivation: also set PASI ----------------------------------
      await fill(page, '#pasiValue', '0');
      const full = await readMDA(page);
      check('seguimiento 7/7 -> MDA ALCANZADO ✓',
        full.final === 'MDA ALCANZADO ✓' && full.cumplidos === '7' &&
          full.statuses.every((s) => s === '✓') && full.estados.every((e) => e === 'cumplido'),
        JSON.stringify(full));
      log(`    seguimiento FULL: final='${full.final}' cumplidos='${full.cumplidos}' statuses=${JSON.stringify(full.statuses)} valores=${JSON.stringify(full.values)}`);

      // --- both skin sources present, neither satisfies -> no_cumplido -----
      await fill(page, '#pasiValue', '2');
      await fill(page, '#bsaValue', '5');
      const neg = await readMDA(page);
      check('seguimiento PASI 2 + BSA 5 (ambas presentes, ninguna satisface) -> no_cumplido',
        neg.estados[2] === 'no_cumplido' && neg.statuses[2] === '✗',
        `e3='${neg.estados[2]}', s3='${neg.statuses[2]}'`);

      // --- regression: DAPSA still computes under APs ----------------------
      await fill(page, '#evaDolor', '2');
      await fill(page, '#evaGlobal', '4');
      await fill(page, '#pcrValue', '30');
      await page.selectOption('#pcrUnit', 'mg/L');
      await page.waitForTimeout(150);
      const dapsa = await page.locator('#dapsaResult').inputValue();
      check('seguimiento DAPSA APs intacto (11.0)', dapsa === '11.0', `dapsa='${dapsa}'`);
      const crpAps = await page.locator('#asdasCrpResult').inputValue();
      check('seguimiento ASDAS-CRP vacío en APs (T1 intacto)', crpAps === '', `crp='${crpAps}'`);
    } else {
      // --- (e) primera_visita: PASI/BSA and LEI stay '—' --------------------
      check('primera_visita sin controles PASI/BSA/LEI', availability.pasi === false && availability.bsa === false && availability.lei === 0, JSON.stringify(availability));
      // Re-freeze #516 correction: HAQ is not answered here either, so only
      // criterios 1,2,5,6 resolve; psoriasis/LEI/HAQ stay pendiente.
      const four = [0, 1, 4, 5].every((i) => mid.statuses[i] === '✓');
      check('primera_visita psoriasis, LEI y HAQ pendientes; cuatro resueltos',
        mid.statuses[2] === '—' && mid.statuses[3] === '—' && mid.statuses[6] === '—' &&
          mid.estados[6] === 'pendiente' && four && mid.cumplidos === '—',
        `s3='${mid.statuses[2]}', s4='${mid.statuses[3]}', s7='${mid.statuses[6]}'(e7=${mid.estados[6]}), otros=${JSON.stringify([0,1,4,5].map((i)=>mid.statuses[i]))}, cumplidos='${mid.cumplidos}'`);
      const label4 = await page.evaluate(() => {
        const el = document.getElementById('mdaStatus4');
        return { title: el.getAttribute('title') || '', aria: el.getAttribute('aria-label') || '' };
      });
      check('primera_visita #mdaStatus4 nombra LEI como fuente ausente',
        (label4.title + ' ' + label4.aria).includes('LEI') && mid.final.includes('LEI') && mid.final.includes('PASI o BSA') && mid.final.includes('HAQ') && !mid.final.toUpperCase().includes('ALCANZADO'),
        JSON.stringify({ label4, final: mid.final }));
    }

    check(`${pagePath} console.error=0 pageerror=0`, errs.length === 0 && perrs.length === 0, JSON.stringify([...errs, ...perrs].slice(0, 3)));
  } finally {
    await ctx.close();
  }
}

// --- EspA path regression for segumiento MDA still derives there ----------
{
  const { ctx, page, errs, perrs } = await open('seguimiento.html');
  try {
    await page.selectOption('#diagnosticoPrimario', 'espa');
    await page.waitForTimeout(300);
    const fresh = await page.evaluate(() => {
      const nat = document.getElementById('asdasNAT');
      return { asdasNAT: nat ? nat.value : null, haem: (document.getElementById('haqTotal')||{}).textContent };
    });
    const st = await page.evaluate(() => {
      const el = document.getElementById('mdaStatus1');
      return { disp: getComputedStyle(document.getElementById('mdaSection')).display, s1: el ? el.textContent.trim() : null };
    });
    log(`    seguimiento EspA: asdasNAT='${fresh.asdasNAT}' haqTotal='${fresh.haem}' -> ${JSON.stringify(st)}`);
    check('seguimiento EspA: MDA oculto (APs-only)', st.disp === 'none', JSON.stringify(st));
    check('seguimiento EspA console.error=0 pageerror=0', errs.length === 0 && perrs.length === 0, JSON.stringify([...errs, ...perrs].slice(0, 3)));
  } finally { await ctx.close(); }
}

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
log(failed === 0 ? 'reuma_mda_browser_check PASS' : 'reuma_mda_browser_check FAILED');

await browser.close();
server.close();
fs.rmSync(tempDir, { recursive: true, force: true });
if (failed > 0) process.exit(1);
