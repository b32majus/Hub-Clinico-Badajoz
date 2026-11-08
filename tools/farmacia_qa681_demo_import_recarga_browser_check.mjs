#!/usr/bin/env node
// tools/farmacia_qa681_demo_import_recarga_browser_check.mjs
// QA #681 (encargo PLAN_EJECUTOR_QA681_20261108): demo → importar → cambiar de
// paciente → recargar, y fallo de almacenamiento.
// QA de SOLO LECTURA: el check OBSERVA y afirma el comportamiento esperado;
// NUNCA arregla la app y no relaja aserciones. Inyección de fallo SOLO en la
// API Storage (setItem lanza QuotaExceededError antes de que corran los
// scripts de la app); el DOM clínico nunca se manipula.
// Sin visión: todas las afirmaciones son DOM/texto/URL/consola; las capturas
// PNG (una por paso) van a /tmp/nexus_checks/qa/qa681_<paso>.png solo para
// humanos y no se abren ni se leen.
// Datos: demo sintética (CIP-DEMO-FH-001/002) + fixture sintético
// tools/fixtures/enfermeria_v6_sintetico_v1.xlsx (5 solicitudes
// SOL-DER-000001..SOL-DIG-000005). Ausencia de dato nunca se convierte en
// valor; sin inferencia clínica.

import fs from 'fs';
import path from 'path';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOT_DIR = '/tmp/nexus_checks/qa';
fs.mkdirSync(SHOT_DIR, { recursive: true });

function loadPlaywrightFromNpx() {
  const roots = [];
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    roots.push(path.resolve(binDirectory, '..'));
    roots.push(path.join(path.resolve(binDirectory, '..'), 'lib', 'node_modules'));
  }
  for (const nodeModules of roots) {
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__qa681_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_qa681_demo_import_recarga_browser_check.mjs');
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
  return candidates.filter(existsSync)[0] || bundled;
}

const FIX_A = path.join(ROOT, 'tools', 'fixtures', 'enfermeria_v6_sintetico_v1.xlsx');
const FIX_B = path.join(ROOT, 'tools', 'fixtures', 'farmacia_reconcil_enfermeria_v6_sintetico_v1.xlsx');
if (!existsSync(FIX_A) || !existsSync(FIX_B)) {
  console.error('FATAL: faltan fixtures sintéticos (enfermería v6).');
  process.exit(1);
}

/* Las 5 solicitudes del fixture enfermeria_v6_sintetico_v1.xlsx (hojas
   DERMATOLOGÍA / REUMATOLOGÍA / DIGESTIVO, unión en orden canónico). */
const EXPECTED_IDS = ['SOL-DER-000001', 'SOL-DER-000002', 'SOL-REU-000003', 'SOL-DIG-000004', 'SOL-DIG-000005'].sort();
const SESSION_KEY = 'promueve.fh.currentPatientSession.v1';

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'],
  ['.svg', 'image/svg+xml'], ['.xlsx', 'application/octet-stream']
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

/* ── Motor de pasos: una línea `OK <paso>` o `FALLO <paso>: <detalle>` ── */
let pasoActual = null;
let totalPasos = 0;
const pasosFallidos = [];
function beginPaso(name) { pasoActual = { name, firstFail: null }; totalPasos += 1; console.log('\n=== ' + name + ' ==='); }
function check(condition, label) {
  if (condition) console.log('  \u2713 ' + label);
  else {
    console.log('  \u2717 ' + label);
    if (!pasoActual.firstFail) pasoActual.firstFail = label;
  }
}
function info(label) { console.log('  INFO ' + label); }
function endPaso() {
  if (!pasoActual.firstFail) console.log('OK ' + pasoActual.name);
  else { pasosFallidos.push(pasoActual.name); console.log('FALLO ' + pasoActual.name + ': ' + pasoActual.firstFail); }
  pasoActual = null;
}
async function shot(page, name) {
  try { await page.screenshot({ path: path.join(SHOT_DIR, 'qa681_' + name + '.png'), fullPage: true }); }
  catch (error) { info('captura qa681_' + name + '.png no generada: ' + error.message); }
}

const consoleErrors = [];
const pageErrors = [];

async function newPage(label) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(`[${label}] ${message.text()}`); });
  page.on('pageerror', (error) => pageErrors.push(`[${label}] ${error.message}`));
  return { context, page };
}

async function importEnfermeria(page, file) {
  await page.setInputFiles('#inputExcelEnfermeria', file);
}

async function activeSolicitudIds(page) {
  // La fuente activa se lee del snapshot persistido (filas con solicitud_id).
  return page.evaluate(() => {
    const raw = window.sessionStorage.getItem('farmaciaDemo.enfermeriaImport');
    if (!raw) return [];
    const rows = (JSON.parse(raw).rows || []);
    return rows.map((row) => row.solicitud_id).filter(Boolean);
  });
}

async function sessionEnvelopeRaw(page) {
  return page.evaluate((key) => window.sessionStorage.getItem(key), SESSION_KEY);
}

async function readIdentity(page) {
  return page.evaluate(() => ({
    name: (document.getElementById('patientName') || {}).textContent || '',
    badge: (document.getElementById('patientIdBadge') || {}).textContent || '',
    status: (document.getElementById('patientStatusBadge') || {}).textContent || ''
  }));
}

/* Wrapper instalado antes de que corran los scripts de la app. Lecturas y
   borrados delegan en el sessionStorage real; las escrituras lanzan
   QuotaExceededError cuando la bandera de fallo está activa (fallo de cuota
   determinista). El DOM clínico no se toca. (Reutilizado del patrón
   STORAGE_FAULT_SCRIPT de farmacia_import_persistence_browser_check.mjs.) */
const STORAGE_FAULT_SCRIPT = `
  window.__qa681SessionPersistenceFail = false;
  const realStorage = window.sessionStorage;
  const failingStorage = {
    getItem: (k) => realStorage.getItem(k),
    setItem: () => { throw new DOMException('QuotaExceededError', 'QuotaExceededError'); },
    removeItem: (k) => realStorage.removeItem(k),
    clear: () => realStorage.clear(),
    key: (i) => realStorage.key(i),
    get length() { return realStorage.length; }
  };
  Object.defineProperty(window, 'sessionStorage', {
    get: () => (window.__qa681SessionPersistenceFail ? failingStorage : realStorage),
    configurable: true
  });
`;

/* Mismo patrón para localStorage (paso 7d): lecturas delegan, escrituras
   fallan siempre. Solo observación: INFO, no FALLO. */
const LOCAL_STORAGE_FAULT_SCRIPT = `
  const realLocalStorage = window.localStorage;
  const failingLocalStorage = {
    getItem: (k) => realLocalStorage.getItem(k),
    setItem: () => { throw new DOMException('QuotaExceededError', 'QuotaExceededError'); },
    removeItem: (k) => realLocalStorage.removeItem(k),
    clear: () => realLocalStorage.clear(),
    key: (i) => realLocalStorage.key(i),
    get length() { return realLocalStorage.length; }
  };
  Object.defineProperty(window, 'localStorage', {
    get: () => failingLocalStorage,
    configurable: true
  });
`;

function assertNoDemoData(bodyText, label) {
  check(bodyText.indexOf('CIP-DEMO-FH-001') === -1 && bodyText.indexOf('CIP-DEMO-FH-002') === -1,
    label + ': sin CIP del paciente demo (CIP-DEMO-FH-001/002)');
  check(bodyText.indexOf('Paciente Demo FH-00') === -1, label + ': sin nombre del paciente demo');
}

/* ─── Pasos 1-6: un mismo contexto/pestaña (sessionStorage continuidad) ── */
const flujo = await newPage('flujo');
const { page } = flujo;

// ─── 1) Demo ─────────────────────────────────────────────────────────────────
beginPaso('paso1_demo');
try {
  await page.goto(BASE + 'farmacia_dashboard_paciente.html?cip=CIP-DEMO-FH-001&entrada=dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const badge = document.querySelector('#patientIdBadge');
    return badge && badge.textContent.trim() === 'CIP-DEMO-FH-001';
  }, null, { timeout: 15000 });
  const identity = await readIdentity(page);
  check(identity.name === 'Paciente Demo FH-001', 'nombre demo mostrado: Paciente Demo FH-001');
  check(identity.badge === 'CIP-DEMO-FH-001', 'badge de identidad = CIP-DEMO-FH-001');
  info('identidad demo mostrada: ' + JSON.stringify(identity));
  check(consoleErrors.length === 0 && pageErrors.length === 0, 'consola limpia al cerrar el paso demo');
} catch (error) { check(false, 'excepción: ' + error.message); }
await shot(page, 'paso1_demo');
endPaso();

// ─── 2) Importar el xlsx en farmacia_index.html ──────────────────────────────
beginPaso('paso2_import');
try {
  await page.goto(BASE + 'farmacia_index.html', { waitUntil: 'load' });
  await importEnfermeria(page, FIX_A);
  await page.waitForFunction(() => {
    const el = document.getElementById('estadoCargaEnfermeria');
    return el && (el.textContent || '').includes('cargado · 5 registros');
  }, null, { timeout: 15000 });
  const status = await page.locator('#estadoCargaEnfermeria').textContent();
  check(status.includes('Excel Enfermería cargado · 5 registros'), "afirmación exacta 'Excel Enfermería cargado · 5 registros'");
  const ids = await activeSolicitudIds(page);
  check(JSON.stringify(ids.slice().sort()) === JSON.stringify(EXPECTED_IDS),
    'solicitud_id activas = las 5 del fixture (' + ids.join(', ') + ')');
  info('estado de carga: ' + status.trim());
} catch (error) { check(false, 'excepción: ' + error.message); }
await shot(page, 'paso2_import');
endPaso();

// ─── 3) Aislamiento: abrir paciente importado por ?solicitud_id ─────────────
beginPaso('paso3_solicitud_1');
try {
  await page.goto(BASE + 'farmacia_dashboard_paciente.html?solicitud_id=SOL-DER-000001', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const badge = document.querySelector('#patientIdBadge');
    const status = document.querySelector('#patientStatusBadge');
    return badge && badge.textContent.trim() === 'CIP-DEMO-ENF-001'
      && status && status.textContent.trim() === 'En vigilancia';
  }, null, { timeout: 15000 });
  const identity = await readIdentity(page);
  check(identity.badge === 'CIP-DEMO-ENF-001', 'badge = CIP del registro de SOL-DER-000001 (CIP-DEMO-ENF-001)');
  check(identity.name === 'Paciente Demo ENF-001', 'nombre = Paciente Demo ENF-001 (fila SOL-DER-000001)');
  check(identity.status === 'En vigilancia', 'estado = En vigilancia (dato de la fila SOL-DER-000001)');
  const bodyText = await page.locator('body').innerText();
  check(bodyText.includes('Adalimumab') && !bodyText.includes('Secukinumab'),
    'tratamiento de la fila SOL-DER-000001 (Adalimumab), sin datos de la fila SOL-DER-000002 (Secukinumab)');
  assertNoDemoData(bodyText, 'paso3');
  check((await sessionEnvelopeRaw(page)) === null, 'sin envelope de sesión de paciente residual');
  info('identidad importada mostrada: ' + JSON.stringify(identity) + ' url=' + page.url());
} catch (error) { check(false, 'excepción: ' + error.message); }
await shot(page, 'paso3_solicitud_1');
endPaso();

// ─── 4) Cambiar de paciente: navegación a SOL-DER-000002 ────────────────────
/* Nota del fixture: SOL-DER-000001 y SOL-DER-000002 son DOS solicitudes v6 de
   la MISMA paciente (CIP-DEMO-ENF-001) y por diseño se mantienen
   independientes por identidad (nunca se fusionan). El residuo observable de
   la solicitud anterior es su dato de solicitud: estado ('En vigilancia') y
   fármaco ('Adalimumab'); nombre/CIP compartidos son los de la fila
   SOL-DER-000002, no residuo. */
beginPaso('paso4_cambio_solicitud_2');
try {
  await page.goto(BASE + 'farmacia_dashboard_paciente.html?solicitud_id=SOL-DER-000002', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const badge = document.querySelector('#patientIdBadge');
    const status = document.querySelector('#patientStatusBadge');
    return badge && badge.textContent.trim() === 'CIP-DEMO-ENF-001'
      && status && status.textContent.trim() === 'OK Farmacia';
  }, null, { timeout: 15000 });
  const identity = await readIdentity(page);
  check(identity.status === 'OK Farmacia', "sin residuo de la solicitud anterior: estado 'OK Farmacia' (fila 000002), ya no 'En vigilancia' (fila 000001)");
  const bodyText = await page.locator('body').innerText();
  check(bodyText.includes('Secukinumab') && !bodyText.includes('Adalimumab'),
    'sin residuo de la solicitud anterior: tratamiento de la fila 000002 (Secukinumab), sin el de la 000001 (Adalimumab)');
  check(page.url().includes('solicitud_id=SOL-DER-000002'), 'URL conserva solicitud_id=SOL-DER-000002');
  check((await sessionEnvelopeRaw(page)) === null, 'sin envelope de sesión del paciente anterior');
  assertNoDemoData(bodyText, 'paso4');
  info('identidad tras el cambio: ' + JSON.stringify(identity) + ' url=' + page.url());
} catch (error) { check(false, 'excepción: ' + error.message); }
await shot(page, 'paso4_cambio_solicitud_2');
endPaso();

// ─── 5) Recarga (page.reload) en cada paciente abierto ──────────────────────
beginPaso('paso5_recargas');
try {
  // 5a: recarga del paciente de SOL-DER-000002
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const badge = document.querySelector('#patientIdBadge');
    const status = document.querySelector('#patientStatusBadge');
    return badge && badge.textContent.trim() === 'CIP-DEMO-ENF-001'
      && status && status.textContent.trim() === 'OK Farmacia';
  }, null, { timeout: 15000 });
  let identity = await readIdentity(page);
  check(page.url().includes('solicitud_id=SOL-DER-000002'), 'recarga solicitud 2: la solicitud_id de la URL se conserva');
  check(identity.badge === 'CIP-DEMO-ENF-001' && identity.name === 'Paciente Demo ENF-001' && identity.status === 'OK Farmacia',
    'recarga solicitud 2: la identidad mostrada sigue siendo la misma');
  check(identity.badge !== 'CIP-DEMO-FH-001' && identity.name !== 'Paciente Demo FH-001', 'recarga solicitud 2: no vuelve a la demo');
  await shot(page, 'paso5_recarga_solicitud2');

  // 5b: recarga del paciente de SOL-DER-000001
  await page.goto(BASE + 'farmacia_dashboard_paciente.html?solicitud_id=SOL-DER-000001', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const badge = document.querySelector('#patientIdBadge');
    const status = document.querySelector('#patientStatusBadge');
    return badge && badge.textContent.trim() === 'CIP-DEMO-ENF-001'
      && status && status.textContent.trim() === 'En vigilancia';
  }, null, { timeout: 15000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const badge = document.querySelector('#patientIdBadge');
    const status = document.querySelector('#patientStatusBadge');
    return badge && badge.textContent.trim() === 'CIP-DEMO-ENF-001'
      && status && status.textContent.trim() === 'En vigilancia';
  }, null, { timeout: 15000 });
  identity = await readIdentity(page);
  check(page.url().includes('solicitud_id=SOL-DER-000001'), 'recarga solicitud 1: la solicitud_id de la URL se conserva');
  check(identity.badge === 'CIP-DEMO-ENF-001' && identity.name === 'Paciente Demo ENF-001' && identity.status === 'En vigilancia',
    'recarga solicitud 1: la identidad mostrada sigue siendo la misma');
  check(identity.badge !== 'CIP-DEMO-FH-001' && identity.name !== 'Paciente Demo FH-001', 'recarga solicitud 1: no vuelve a la demo');
  await shot(page, 'paso5_recarga_solicitud1');

  // 5c: recarga del paciente demo
  await page.goto(BASE + 'farmacia_dashboard_paciente.html?cip=CIP-DEMO-FH-001&entrada=dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const badge = document.querySelector('#patientIdBadge');
    return badge && badge.textContent.trim() === 'CIP-DEMO-FH-001';
  }, null, { timeout: 15000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const badge = document.querySelector('#patientIdBadge');
    return badge && badge.textContent.trim() === 'CIP-DEMO-FH-001';
  }, null, { timeout: 15000 });
  identity = await readIdentity(page);
  check(identity.badge === 'CIP-DEMO-FH-001' && identity.name === 'Paciente Demo FH-001', 'recarga demo: identidad demo conservada');
  check((await sessionEnvelopeRaw(page)) === null, 'sin envelope de sesión resucitado tras las recargas');
  info('recargas completadas (solicitud 2, solicitud 1, demo)');
  await shot(page, 'paso5_recarga_demo');
} catch (error) { check(false, 'excepción: ' + error.message); }
endPaso();

// ─── 6) Solicitud inexistente: fail closed ───────────────────────────────────
beginPaso('paso6_solicitud_inexistente');
try {
  await page.goto(BASE + 'farmacia_dashboard_paciente.html?solicitud_id=NO-EXISTE', { waitUntil: 'load' });
  await page.waitForTimeout(1200); // margen para que la resolución async concluya (fail closed = no render)
  const identity = await readIdentity(page);
  check(identity.badge.trim() === '—', 'sin identidad de paciente: badge permanece vacío ("—"), nunca un CIP');
  check(!identity.name.startsWith('Paciente Demo FH') && !identity.name.startsWith('Paciente Demo ENF'),
    'sin nombre de ningún paciente (demo ni importado)');
  const summaryChildren = await page.locator('#dashboardSummaryGrid > *').count();
  check(summaryChildren === 0, 'sin datos de resumen (panel de resumen vacío)');
  const bodyText = await page.locator('body').innerText();
  assertNoDemoData(bodyText, 'paso6');
  check(bodyText.indexOf('CIP-DEMO-ENF-00') === -1 && bodyText.indexOf('SOL-DER-') === -1
    && bodyText.indexOf('SOL-REU-') === -1 && bodyText.indexOf('SOL-DIG-') === -1,
    'sin datos de solicitudes importadas ni resolución por CIP');
  check((await sessionEnvelopeRaw(page)) === null, 'sin envelope de sesión fabricado');
  info('pantalla fail closed: sin paciente mostrado, sin caída a la demo, sin resolución por CIP');
} catch (error) { check(false, 'excepción: ' + error.message); }
await shot(page, 'paso6_solicitud_inexistente');
endPaso();

await flujo.context.close();

/* ─── Paso 7: fallo de almacenamiento ── */

// ─── 7a) sessionStorage.setItem falla desde el inicio, sin fuente previa ────
beginPaso('paso7a_fallo_sesion_sin_previa');
const ctx7a = await newPage('7a-fallo-sessionStorage');
try {
  await ctx7a.context.addInitScript(STORAGE_FAULT_SCRIPT);
  await ctx7a.context.addInitScript(() => { window.__qa681SessionPersistenceFail = true; });
  await ctx7a.page.goto(BASE + 'farmacia_index.html', { waitUntil: 'load' });
  await importEnfermeria(ctx7a.page, FIX_A);
  await ctx7a.page.waitForFunction(() => {
    const el = document.getElementById('estadoCargaEnfermeria');
    return el && (el.textContent || '').indexOf('no pudo conservar') !== -1;
  }, null, { timeout: 15000 });
  const status = await ctx7a.page.locator('#estadoCargaEnfermeria').textContent();
  check(status.includes('Error al cargar Excel de Enfermería'), 'aviso de rechazo visible (Error al cargar Excel de Enfermería)');
  check(status.includes('almacenamiento de sesión'), 'el aviso explica el almacenamiento de sesión');
  check(status.includes('no se ha activado ningún Excel nuevo'), 'el aviso declara que no se activó ningún Excel nuevo');
  check(!status.includes('guardado'), "el aviso no dice 'guardado'");
  check(!/Excel Enfermería cargado ·/.test(status), "sin afirmación de éxito 'Excel Enfermería cargado · N registros'");
  const ids = await activeSolicitudIds(ctx7a.page);
  check(ids.length === 0, 'estado previo conservado: cero solicitudes activas (nada se activó)');
  check((await ctx7a.page.evaluate(() => window.sessionStorage.getItem('farmaciaDemo.enfermeriaImport'))) === null,
    'sin snapshot a medias en sessionStorage');
  const dbTime = await ctx7a.page.locator('#dbStatusTime').textContent().catch(() => '');
  check(!(dbTime || '').includes('Enfermería cargada'), 'indicador DB no reclama Enfermería cargada');
  info('aviso neutro (texto): ' + status.trim());
} catch (error) { check(false, 'excepción: ' + error.message); }
await shot(ctx7a.page, 'paso7a_fallo_sesion');
endPaso();

// ─── 7c) Sesión de paciente falla cerrada con SESSION_STORAGE_UNAVAILABLE ───
beginPaso('paso7c_sesion_paciente_fail_closed');
try {
  const probe = await ctx7a.page.evaluate(() => {
    const out = { threw: false, code: null };
    try {
      /* Almacén sin setItem: la sesión debe rechazarse al crearse
         (SESSION_STORAGE_UNAVAILABLE), nunca degradarse a memoria. */
      const partialStorage = { getItem: () => null, removeItem: () => {} };
      window.FarmaciaCurrentPatientSession.create({ sessionStorage: partialStorage });
      out.threw = false;
    } catch (error) {
      out.threw = true;
      out.code = error && error.code ? error.code : null;
    }
    return out;
  });
  check(probe.threw === true && probe.code === 'SESSION_STORAGE_UNAVAILABLE',
    'sesión de paciente falla cerrada con SESSION_STORAGE_UNAVAILABLE');
  info('sesión de paciente: create sin almacenamiento completo lanza ' + JSON.stringify(probe));
} catch (error) { check(false, 'excepción: ' + error.message); }
endPaso();

// ─── 7b) sessionStorage falla con fuente previa válida: estado previo ───────
beginPaso('paso7b_fallo_sesion_estado_previo');
const ctx7b = await newPage('7b-estado-previo');
try {
  await ctx7b.context.addInitScript(STORAGE_FAULT_SCRIPT);
  await ctx7b.page.goto(BASE + 'farmacia_index.html', { waitUntil: 'load' });
  await importEnfermeria(ctx7b.page, FIX_A);
  await ctx7b.page.waitForFunction(() => {
    const el = document.getElementById('estadoCargaEnfermeria');
    return el && (el.textContent || '').includes('cargado · 5 registros');
  }, null, { timeout: 15000 });
  check((await activeSolicitudIds(ctx7b.page)).length === 5, 'estado previo válido: fuente A activa con 5 solicitudes');

  await ctx7b.page.evaluate(() => { window.__qa681SessionPersistenceFail = true; }); // fallo solo desde ahora
  await importEnfermeria(ctx7b.page, FIX_B);
  await ctx7b.page.waitForFunction(() => {
    const el = document.getElementById('estadoCargaEnfermeria');
    return el && (el.textContent || '').indexOf('Nuevo archivo rechazado') !== -1;
  }, null, { timeout: 15000 });
  const status = await ctx7b.page.locator('#estadoCargaEnfermeria').textContent();
  check(status.includes('Nuevo archivo rechazado'), 'aviso neutro visible (Nuevo archivo rechazado)');
  check(status.includes('Sigue activo el Excel anterior'), 'el aviso declara la fuente anterior activa');
  check(status.includes('enfermeria_v6_sintetico_v1.xlsx'), 'el aviso nombra el Excel anterior (A)');
  check(!status.includes('guardado'), "el aviso no dice 'guardado'");
  check(!/Excel Enfermería cargado ·/.test(status), "sin afirmación de éxito 'Excel Enfermería cargado · N registros'");
  const ids = await activeSolicitudIds(ctx7b.page);
  check(JSON.stringify(ids.slice().sort()) === JSON.stringify(EXPECTED_IDS),
    'estado previo conservado: las 5 solicitudes de A siguen activas');
  check(ids.indexOf('SOL-DER-000007') === -1 && ids.indexOf('SOL-REU-000008') === -1,
    'ninguna solicitud del archivo rechazado (B)');
  const raw = await ctx7b.page.evaluate(() => window.sessionStorage.getItem('farmaciaDemo.enfermeriaImport'));
  check(!!raw && JSON.parse(raw).fileName === 'enfermeria_v6_sintetico_v1.xlsx' && JSON.parse(raw).rowCount === 5,
    'snapshot persistido de A intacto (fileName + rowCount)');
  const dbTime = await ctx7b.page.locator('#dbStatusTime').textContent().catch(() => '');
  check((dbTime || '').includes('Enfermería cargada'), 'indicador DB sigue reflejando la fuente A (estado previo)');
  info('aviso neutro (texto): ' + status.trim());
} catch (error) { check(false, 'excepción: ' + error.message); }
await shot(ctx7b.page, 'paso7b_fallo_sesion_estado_previo');
endPaso();
await ctx7a.context.close();
await ctx7b.context.close();

// ─── 7d) Mismo fallo replicado para localStorage (segundo contexto) ─────────
beginPaso('paso7d_fallo_localstorage');
const ctx7d = await newPage('7d-fallo-localStorage');
try {
  await ctx7d.context.addInitScript(LOCAL_STORAGE_FAULT_SCRIPT);
  await ctx7d.page.goto(BASE + 'farmacia_index.html', { waitUntil: 'load' });
  await importEnfermeria(ctx7d.page, FIX_A);
  await ctx7d.page.waitForFunction(() => {
    const el = document.getElementById('estadoCargaEnfermeria');
    return el && (el.textContent || '').trim() !== 'No se ha cargado Excel de Enfermería';
  }, null, { timeout: 15000 }).catch(() => {});
  const status = (await ctx7d.page.locator('#estadoCargaEnfermeria').textContent().catch(() => '')) || '';
  const ids = await activeSolicitudIds(ctx7d.page);
  if (status.includes('cargado · 5 registros')) {
    info('fallo de localStorage: la importación continúa (' + status.trim() + ', solicitudes activas ' + ids.length + ') y NO hay aviso: la ruta de import persiste en sessionStorage; localStorage no interviene en esta ruta (sin error silencioso observable). INFO según encargo, no FALLO.');
  } else if (status.trim() && status.trim() !== 'No se ha cargado Excel de Enfermería') {
    info('fallo de localStorage: la UI informa con un aviso (texto): ' + status.trim());
  } else {
    info('fallo de localStorage: sin aviso visible y sin cambio de estado tras la importación (anotado como INFO según encargo; no FALLO si no hay aviso).');
  }
} catch (error) { check(false, 'excepción: ' + error.message); }
await shot(ctx7d.page, 'paso7d_fallo_localstorage');
endPaso();
await ctx7d.context.close();

// ─── 8) Consola: 0 console.error y 0 pageerror en todo el recorrido ─────────
beginPaso('paso8_consola');
try {
  const errors7d = consoleErrors.filter((e) => e.indexOf('[7d-fallo-localStorage]') === 0);
  const otherConsole = consoleErrors.filter((e) => e.indexOf('[7d-fallo-localStorage]') !== 0);
  errors7d.forEach((e) => info('console.error del contexto localStorage (paso 7, anotado): ' + e));
  check(otherConsole.length === 0, '0 console.error en todo el recorrido' + (errors7d.length ? ' (salvo los del paso 7d, anotados)' : ''));
  check(pageErrors.length === 0, '0 pageerror en todo el recorrido');
} catch (error) { check(false, 'excepción: ' + error.message); }
endPaso();

await browser.close();
server.close();

console.log('\nRESUMEN: pasos OK=' + (totalPasos - pasosFallidos.length) + '/' + totalPasos + ' FALLO=' + pasosFallidos.length +
  (pasosFallidos.length ? ' -> ' + pasosFallidos.join(', ') : ''));
console.log('CONSOLE_ERRORS=' + consoleErrors.length);
console.log('PAGE_ERRORS=' + pageErrors.length);
console.log('Capturas (solo para humanos): ' + SHOT_DIR + '/qa681_*.png');
if (pasosFallidos.length > 0 || consoleErrors.some((e) => e.indexOf('[7d-fallo-localStorage]') !== 0) || pageErrors.length > 0) process.exit(1);
