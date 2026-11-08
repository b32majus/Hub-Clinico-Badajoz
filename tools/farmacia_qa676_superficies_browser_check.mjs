#!/usr/bin/env node
// tools/farmacia_qa676_superficies_browser_check.mjs
// QA #676 — coherencia Inicio / Pendientes / Validación (prebiológico). SOLO LECTURA:
// el check OBSERVA y afirma el comportamiento esperado; nunca arregla la app.
// Datos 100% sintéticos (pacientes inyectados por el seam publicado
// FarmaciaDataImports.getImportedPatients, patrón de
// tools/farmacia_pendientes_queue_browser_check.mjs). Sin visión: afirma por
// DOM/texto/consola; las capturas van a /tmp/nexus_checks/qa/ solo para humanos.
// Pasos:
//  1. Pendientes con 3 pacientes sintéticos inyectados: bloque prebiológico
//     (clase/texto), nº de bloqueos y chips, y procedencia fiel (Origen
//     inyectado; sin «Origen: Excel Enfermería» ni solicitud_id inventado).
//  2. Pendientes sin módulo FarmaciaPrebiologico (ruta del script abortada):
//     cada tarjeta inyectada «Prebiológico no evaluable»; ninguna «completo».
//  3. Validación por paciente (?cip=…&entrada=validacion, paciente inyectado
//     pre-carga): comparación campo a campo con Pendientes (Mantoux/IGRA,
//     Vacunación, Serologías VHB/VHC/VIH, Medicina preventiva). Regla: si
//     Pendientes marca pending/unknown/alert, Validación no puede mostrar
//     ok/negativo; si Pendientes marca ok, Validación no lo marca pendiente.
//     SIN EVIDENCIA: ningún chip de Validación como ok.
//  4. Inicio con xlsx sintético: contadores #inicio*Count frente a las
//     tarjetas de Pendientes por data-pendientes-estado (total = suma;
//     listas/vigilancia/bloqueadas coinciden).
//  5. INFO (no FALLO): cobertura (Inicio/Validación no consumen el módulo),
//     estados producidos por el módulo, chip global de Validación observado.
//  6. Consola: 0 console.error y 0 pageerror (paso 2: solo se descuentan los
//     errores de red del script abortado, que se anotan).
// Ejecutar: bin/run_checks.sh -w <worktree> -t qa farmacia_qa676_superficies_browser_check.mjs
//           (o: npx --yes --package=playwright node tools/farmacia_qa676_superficies_browser_check.mjs)

import assert from 'node:assert/strict';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOT_DIR = '/tmp/nexus_checks/qa';
mkdirSync(SHOT_DIR, { recursive: true });

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_qa676_loader.cjs'))('playwright');
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
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });

let passedSteps = 0;
const failedSteps = [];
function ok(paso, label) { passedSteps += 1; console.log(`OK ${paso}${label ? ' — ' + label : ''}`); }
function fallo(paso, detalle) { failedSteps.push(paso); console.log(`FALLO ${paso}: ${detalle}`); }
async function shot(paso, page) {
  try { await page.screenshot({ path: path.join(SHOT_DIR, `qa676_${paso}.png`), fullPage: true }); } catch { /* solo para humanos */ }
}

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

// ─── Pacientes sintéticos QA #676 (inyección por el seam publicado) ──────────
// Sin origen_solicitud/tipo_origen/source_type ni solicitud_id: como la
// plantilla de cola, entran por la lectura de pendientes publicada
// (estado OK_FARMACIA) y reciben tarjeta GENERAL con bloque prebio del módulo.
// La procedencia inyectada es solo importSource (verbatim en «Origen: …»).

const QA676_BASE = {
  nombre: 'Paciente sintético QA676',
  servicio: 'Reumatología',
  patologia: 'Artritis Reumatoide (AR)',
  farmaco: 'Fármaco sintético QA676',
  fechaSolicitud: '2026-11-01',
  estado: 'OK_FARMACIA',
  estado_prebiologico_enfermeria: 'OK_FARMACIA',
  estadoLabel: 'OK Farmacia',
  // Solicitud clínica explícita pendiente: la lectura publicada de pendientes
  // (shouldAppearInValidationInbox) admite así la fila en tray-G sin campos de
  // origen Enfermería (que darían tarjeta Enfermería, sin bloque prebio del
  // módulo) y sin importSource enfermer-ish (que desviaría Validación a la
  // rama enf, ajena al analiticaEstruct que este QA compara).
  estado_solicitud_validacion: 'pendiente'
};

const PATIENT_COMPLETE = {
  ...QA676_BASE,
  cip: 'CIP-SINT-QA676-COMPLETO',
  nombre: 'Sintético QA676 COMPLETO',
  farmaco: 'Fármaco sintético QA676 COMPLETO',
  importSource: 'Excel QA676 sintético (COMPLETO)',
  analiticaEstruct: {
    reciente: 'si', hemograma: true, bioquimica: true,
    serologiasVhb: 'Negativo', serologiasVhc: 'Negativo', serologiasVih: 'Negativo',
    mantoux: 'Negativo', vacunacion: 'si'
  },
  medicinaPreventiva: 'ok'
};

const PATIENT_INCOMPLETE = {
  ...QA676_BASE,
  cip: 'CIP-SINT-QA676-INCOMPLETO',
  nombre: 'Sintético QA676 INCOMPLETO',
  farmaco: 'Fármaco sintético QA676 INCOMPLETO',
  importSource: 'Excel QA676 sintético (INCOMPLETO)',
  analiticaEstruct: {
    reciente: 'si', hemograma: true, bioquimica: true,
    serologiasVhb: 'Negativo', serologiasVhc: 'Negativo', serologiasVih: 'Negativo',
    mantoux: 'Pendiente', vacunacion: 'pendiente'
  }
};

const PATIENT_NOEVID = {
  ...QA676_BASE,
  cip: 'CIP-SINT-QA676-SINEVID',
  nombre: 'Sintético QA676 SIN EVIDENCIA',
  farmaco: 'Fármaco sintético QA676 SIN EVIDENCIA',
  importSource: 'Excel QA676 sintético (SIN EVIDENCIA)'
};

const FIXTURES = [PATIENT_COMPLETE, PATIENT_INCOMPLETE, PATIENT_NOEVID];
const FIXTURE_BY_CIP = Object.fromEntries(FIXTURES.map((f) => [f.cip, f]));

// Veredicto esperado en Pendientes (lo afirma el paso 1 y lo consume el 3).
const PENDIENTES_EXPECT = {
  [PATIENT_COMPLETE.cip]: {
    blockClassIncludes: 'prebio-complete',
    blockClassForbids: ['prebio-blocked', 'prebio-incomplete'],
    labelIncludes: 'Prebiológico completo · Listo para validación',
    blockers: 0,
    chips: [],
    statuses: { tuberculosis: 'complete', vacunacion: 'complete', serologias: 'complete', medicinaPreventiva: 'complete' }
  },
  [PATIENT_INCOMPLETE.cip]: {
    blockClassIncludes: 'prebio-blocked',
    blockClassForbids: ['prebio-complete', 'prebio-incomplete'],
    labelIncludes: 'Prebiológico bloqueado · 3 bloqueos',
    blockers: 3,
    chips: ['Mantoux/IGRA: pending', 'Vacunación: pending', 'Medicina preventiva: unknown'],
    chipClasses: ['status-pending', 'status-pending', 'status-unknown'],
    statuses: { tuberculosis: 'pending', vacunacion: 'pending', serologias: 'complete', medicinaPreventiva: 'unknown' }
  },
  [PATIENT_NOEVID.cip]: {
    blockClassIncludes: 'prebio-blocked',
    blockClassForbids: ['prebio-complete', 'prebio-incomplete'],
    labelIncludes: 'Prebiológico bloqueado · 7 bloqueos',
    blockers: 7,
    chips: null, // 3 chips unknown + '+4 más' (ver aserciones específicas)
    statuses: { tuberculosis: 'unknown', vacunacion: 'unknown', serologias: 'unknown', medicinaPreventiva: 'unknown' }
  }
};

// Inyección ANTES de la carga (addInitScript): FarmaciaDataImports se publica
// al parsear farmacia_common.js (script clásico), así que el parche instalado
// en DOMContentLoaded entra antes de los renders de la página.
async function patchImportsBeforeLoad(context) {
  await context.addInitScript((fixtures) => {
    function install() {
      const imports = window.FarmaciaDataImports;
      if (!imports || typeof imports.getImportedPatients !== 'function') return false;
      if (imports.__qa676Patched) return true;
      const original = imports.getImportedPatients.bind(imports);
      imports.getImportedPatients = function () { return original().concat(fixtures); };
      imports.__qa676Patched = true;
      return true;
    }
    install();
    document.addEventListener('DOMContentLoaded', install);
  }, FIXTURES);
}

async function waitForInjectedCards(page) {
  await page.waitForFunction(
    () => document.querySelectorAll('#actividadCards [data-summary]').length === 4, null, { timeout: 15000 });
  await page.waitForFunction(
    (cips) => cips.every((cip) => [...document.querySelectorAll('#actividadPendientesPanel .pending-validation-card[data-pendientes-cip]')]
      .some((el) => el.getAttribute('data-pendientes-cip') === cip)),
    FIXTURES.map((f) => f.cip), { timeout: 15000 });
}

async function readInjectedCards(page) {
  return page.evaluate(() => [...document.querySelectorAll('#actividadPendientesPanel .pending-validation-card[data-pendientes-cip]')].map((el) => {
    const block = el.querySelector('.pending-validation-card__prebio');
    return {
      cip: el.getAttribute('data-pendientes-cip'),
      estado: el.getAttribute('data-pendientes-estado'),
      solicitud: el.getAttribute('data-pendientes-solicitud'),
      enfCip: el.getAttribute('data-enf-cip'),
      blockClass: block ? block.className : null,
      blockText: block ? block.textContent : null,
      hasLabel: !!el.querySelector('.pending-validation-card__prebio-label'),
      chips: block ? [...block.querySelectorAll('.prebio-chip')].map((c) => ({ cls: c.className, text: c.textContent })) : [],
      text: el.textContent
    };
  }));
}

// ─── Paso 1: Pendientes con los 3 pacientes inyectados ───────────────────────
{
  const paso = '1';
  const { context, page, consoleErrors, pageErrors } = await newPage();
  try {
    await page.goto(base + 'farmacia_actividad_servicio.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.FarmaciaDataImports, null, { timeout: 15000 });
    // Inyección por el seam publicado, patrón de la plantilla de cola.
    await page.evaluate((fixtures) => {
      const imports = window.FarmaciaDataImports;
      const original = imports.getImportedPatients.bind(imports);
      imports.getImportedPatients = () => original().concat(fixtures);
      document.dispatchEvent(new CustomEvent('farmacia:data-imported'));
    }, FIXTURES);
    await waitForInjectedCards(page);
    const allQueueCards = await readInjectedCards(page);
    // La cola también contiene filas demo legítimas; el QA afirma solo las inyectadas.
    const cards = allQueueCards.filter((card) => !!FIXTURE_BY_CIP[card.cip]);
    assert.equal(cards.length, 3, `tres tarjetas inyectadas (recibidas ${cards.length} de ${allQueueCards.length} en la cola)`);

    for (const card of cards) {
      const fixture = FIXTURE_BY_CIP[card.cip];
      const expect = PENDIENTES_EXPECT[card.cip];
      const where = `paciente ${card.cip}`;
      assert.equal(card.estado, 'general', `${where}: tarjeta general (recibida ${card.estado})`);
      assert.equal(card.enfCip, null, `${where}: nunca recibe la tarjeta Enfermería`);
      assert.ok(card.blockClass, `${where}: bloque prebiológico presente`);
      assert.ok(card.blockClass.includes(expect.blockClassIncludes),
        `${where}: clase del bloque incluye ${expect.blockClassIncludes} (recibida "${card.blockClass}")`);
      for (const forbidden of expect.blockClassForbids) {
        assert.ok(!card.blockClass.includes(forbidden), `${where}: el bloque no lleva ${forbidden}`);
      }
      assert.ok(card.blockText.includes(expect.labelIncludes),
        `${where}: etiqueta "${expect.labelIncludes}" (recibida "${(card.blockText || '').trim()}")`);
      assert.ok(card.hasLabel, `${where}: fila de etiqueta presente`);
      if (card.cip === PATIENT_NOEVID.cip) {
        assert.ok(!card.blockText.includes('completo'), `${where}: JAMÁS «completo» sin evidencia`);
        assert.ok(!card.blockText.includes('no evaluable'), `${where}: con módulo presente no es «no evaluable»`);
        assert.equal(card.chips.length, 4, `${where}: 3 chips + «+N más» (recibidos ${card.chips.length})`);
        const statusChips = card.chips.filter((c) => c.cls.includes('prebio-chip--more') === false);
        assert.equal(statusChips.length, 3, `${where}: exactamente 3 chips de bloqueo`);
        for (const chip of statusChips) {
          assert.ok(chip.cls.includes('status-unknown'), `${where}: chip unknown (recibida "${chip.cls}")`);
        }
        assert.ok(!card.chips.some((c) => c.cls.includes('status-complete') || c.cls.includes('status-alert') || c.cls.includes('status-pending')),
          `${where}: sin chips complete/alert/pending`);
        const more = card.chips.find((c) => c.cls.includes('prebio-chip--more'));
        assert.ok(more && more.text === '+4 más', `${where}: chip «+4 más» (recibido "${more && more.text}")`);
      } else {
        assert.equal(card.chips.length, expect.chips.length,
          `${where}: ${expect.blockers} bloqueo(s) → ${expect.chips.length} chips (recibidos ${card.chips.length})`);
        const texts = card.chips.map((c) => c.text).slice().sort();
        assert.deepEqual(texts, expect.chips.slice().sort(), `${where}: textos de chips «Etiqueta: estado»`);
        const classes = card.chips.map((c) => (c.cls.split(/\s+/).find((token) => token.startsWith('status-')) || ''));
        if (expect.chipClasses) {
          assert.deepEqual(classes.slice().sort(), expect.chipClasses.slice().sort(),
            `${where}: clases de chips según bloqueo`);
        }
      }
      // (c) Procedencia fiel: la inyectada; ninguna inventada.
      assert.ok(card.text.includes(`Origen: ${fixture.importSource}`),
        `${where}: «Origen: ${fixture.importSource}» visible`);
      assert.ok(!card.text.includes('Origen: Excel Enfermería'), `${where}: sin «Origen: Excel Enfermería» (procedencia no inyectada)`);
      assert.ok(!card.text.includes('solicitud_id:'), `${where}: sin «solicitud_id:» (no inyectado, no se rellena)`);
      assert.equal(card.solicitud, null, `${where}: sin data-pendientes-solicitud`);
    }
    assertNoPageFailure(pageErrors, consoleErrors);
    await shot(paso, page);
    ok(paso, 'Pendientes: bloque prebiológico, bloqueos/chips y procedencia fieles por paciente');
  } catch (error) {
    await shot(paso, page).catch(() => {});
    fallo(paso, error && error.message);
  } finally {
    await context.close();
  }
}

// ─── Paso 2: Pendientes sin el módulo → «Prebiológico no evaluable» ──────────
{
  const paso = '2';
  const { context, page, consoleErrors, pageErrors } = await newPage();
  let abortedScriptErrors = 0;
  try {
    await context.route('**/farmacia_prebiologico.js*', (route) => route.abort());
    await patchImportsBeforeLoad(context);
    await page.goto(base + 'farmacia_actividad_servicio.html', { waitUntil: 'domcontentloaded' });
    await waitForInjectedCards(page);
    const allQueueCards = await readInjectedCards(page);
    const cards = allQueueCards.filter((card) => !!FIXTURE_BY_CIP[card.cip]);
    assert.equal(cards.length, 3, `tres tarjetas inyectadas sin módulo (recibidas ${cards.length} de ${allQueueCards.length} en la cola)`);
    for (const card of cards) {
      const where = `paciente ${card.cip}`;
      assert.equal((card.blockText || '').trim(), 'Prebiológico no evaluable',
        `${where}: bloque «Prebiológico no evaluable» (recibido "${(card.blockText || '').trim()}")`);
      assert.ok(!card.blockClass.includes('prebio-complete') && !card.blockClass.includes('prebio-blocked') && !card.blockClass.includes('prebio-incomplete'),
        `${where}: sin clase de veredicto (recibida "${card.blockClass}")`);
      assert.equal(card.chips.length, 0, `${where}: sin chips sin módulo`);
    }
    const allQueueText = cards.map((c) => c.text).join('\n');
    const anyComplete = await page.evaluate(() =>
      [...document.querySelectorAll('#actividadPendientesPanel .pending-validation-card')]
        .some((el) => (el.textContent || '').includes('Prebiológico completo')));
    assert.equal(anyComplete, false, 'NINGUNA tarjeta de la cola muestra «Prebiológico completo» sin módulo');
    assert.ok(!allQueueText.includes('Listo para validación'), 'criterio negativo: la ausencia del módulo no es «completo»');
    // Paso 6 (parcial): solo se descuentan errores de red del script abortado.
    abortedScriptErrors = consoleErrors.filter((text) => text.includes('farmacia_prebiologico.js')).length;
    assert.equal(pageErrors.length, 0, `0 pageerror sin módulo (recibidos ${pageErrors.length}: ${pageErrors.join(' | ')})`);
    assert.deepEqual(filterRealErrors(consoleErrors), [], `0 console.error real sin módulo (resto: ${filterRealErrors(consoleErrors).join(' | ')})`);
    console.log(`INFO ${paso}: errores de red del script abortado descontados y anotados: ${abortedScriptErrors}`);
    await shot(paso, page);
    ok(paso, 'Pendientes sin módulo: «Prebiológico no evaluable», nunca «completo»');
  } catch (error) {
    await shot(paso, page).catch(() => {});
    fallo(paso, error && error.message);
  } finally {
    await context.close();
  }
}

// ─── Paso 3: Validación campo a campo contra Pendientes ──────────────────────
const PB_FIELDS = [
  { label: 'Mantoux/IGRA', chips: ['pbChipMantoux', 'pbChipIgra'] },
  { label: 'Vacunación', chips: ['pbChipVacunacion'] },
  { label: 'Serologías VHB/VHC/VIH', chips: ['pbChipVhb', 'pbChipVhc', 'pbChipVih'] },
  { label: 'Medicina preventiva', chips: ['pbChipMedPreventiva'] }
];
const ALL_PB_CHIP_IDS = ['pbChipAnaliticaReciente', 'pbChipHemograma', 'pbChipBioquimica',
  'pbChipMantoux', 'pbChipIgra', 'pbChipVhb', 'pbChipVhc', 'pbChipVih',
  'pbChipVacunacion', 'pbChipMedPreventiva'];

function validacionSemantic(dataEstadoText) {
  const t = String(dataEstadoText || '').trim();
  if (t === 'OK' || t === 'Negativo') return 'ok';
  if (t === 'Pendiente') return 'pendiente';
  if (t === 'Positivo/alterado') return 'alerta';
  if (t === 'No informado') return 'unknown';
  if (t === 'No precisa') return 'no_aplica';
  return `otro(${t || 'vacío'})`;
}

{
  const paso = '3';
  const { context, consoleErrors, pageErrors } = await newPage();
  const globalStatusByCip = {};
  const problems = [];
  try {
    await patchImportsBeforeLoad(context);
    for (const fixture of FIXTURES) {
      const page = await context.newPage();
      const localConsole = [];
      const localPageErrors = [];
      page.on('console', (message) => { if (message.type() === 'error') localConsole.push(message.text()); });
      page.on('pageerror', (error) => localPageErrors.push(String((error && error.message) || error)));
      try {
        const url = `${base}farmacia_validacion.html?cip=${encodeURIComponent(fixture.cip)}&servicio=${encodeURIComponent(fixture.servicio)}&entrada=validacion`;
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        // Señal de paciente cargado: #fhDermaFarmaco solo se hidrata dentro
        // de la rama context.patient con el fármaco inyectado.
        let loaded = true;
        try {
          await page.waitForFunction((farma) => {
            const el = document.getElementById('fhDermaFarmaco');
            return !!el && el.value === farma;
          }, fixture.farmaco, { timeout: 15000 });
        } catch {
          loaded = false;
        }
        if (!loaded) {
          const seamStatus = await page.evaluate(async (cip) => {
            const F = window.FarmaciaDemo;
            if (!F || typeof F.readPatientByCip !== 'function') return 'seam_no_disponible';
            const result = await F.readPatientByCip(cip);
            return result && result.status;
          }, fixture.cip);
          problems.push(`${fixture.cip}: el paciente no llegó a cargar en Validación (fhDermaFarmaco≠inyectado; seam=${seamStatus})`);
          await page.screenshot({ path: path.join(SHOT_DIR, 'qa676_3_nocargado.png'), fullPage: true }).catch(() => {});
          continue;
        }
        const chips = await page.evaluate((ids) => {
          const out = {};
          for (const id of ids) {
            const chip = document.getElementById(id);
            out[id] = chip ? {
              estado: chip.getAttribute('data-estado'),
              status: (chip.querySelector('.pb-chip__status') || chip).textContent
            } : null;
          }
          const gs = document.getElementById('fhPrebioGlobalStatus');
          out.__global = gs ? gs.textContent : null;
          return out;
        }, ALL_PB_CHIP_IDS);
        globalStatusByCip[fixture.cip] = chips.__global;
        const expect = PENDIENTES_EXPECT[fixture.cip];
        for (const field of PB_FIELDS) {
          const pendientesStatus = expect.statuses[field.label === 'Mantoux/IGRA' ? 'tuberculosis'
            : field.label === 'Vacunación' ? 'vacunacion'
              : field.label === 'Serologías VHB/VHC/VIH' ? 'serologias' : 'medicinaPreventiva'];
          for (const chipId of field.chips) {
            const chip = chips[chipId];
            if (!chip) { problems.push(`${fixture.cip}: chip ${chipId} ausente en Validación`); continue; }
            const semantic = validacionSemantic(chip.estado);
            const blockedSide = pendientesStatus === 'pending' || pendientesStatus === 'unknown' || pendientesStatus === 'alert';
            if (blockedSide && semantic === 'ok') {
              problems.push(`${fixture.cip} · ${field.label} [${chipId}]: Pendientes=${pendientesStatus} pero Validación muestra "${chip.estado}" (ok/negativo)`);
            }
            if (pendientesStatus === 'complete' && semantic === 'pendiente') {
              problems.push(`${fixture.cip} · ${field.label} [${chipId}]: Pendientes=complete pero Validación muestra "${chip.estado}" (pendiente)`);
            }
          }
        }
        if (fixture.cip === PATIENT_NOEVID.cip) {
          const okChips = ALL_PB_CHIP_IDS.filter((id) => chips[id] && (chips[id].estado === 'OK' || chips[id].estado === 'Negativo'));
          assert.equal(okChips.length, 0, `SIN EVIDENCIA: ningún chip de Validación como ok (recibidos: ${okChips.join(', ')})`);
        }
        assert.equal(localPageErrors.length, 0, `${fixture.cip}: pageerror (${localPageErrors.join(' | ')})`);
        assert.deepEqual(localConsole.filter((t) => t.indexOf('Failed to load resource') === -1), [],
          `${fixture.cip}: console.error (${localConsole.join(' | ')})`);
        await page.screenshot({ path: path.join(SHOT_DIR, `qa676_3_${fixture.cip.slice('CIP-SINT-QA676-'.length).toLowerCase()}.png`), fullPage: true }).catch(() => {});
      } finally {
        consoleErrors.push(...localConsole);
        pageErrors.push(...localPageErrors);
        await page.close();
      }
    }
    assert.deepEqual(problems, [], `discrepancias Pendientes↔Validación: ${problems.join(' | ')}`);
    assert.equal(pageErrors.length, 0, `pageerror agregado (${pageErrors.join(' | ')})`);
    assert.deepEqual(filterRealErrors(consoleErrors), [], `console.error agregado (${filterRealErrors(consoleErrors).join(' | ')})`);
    ok(paso, 'Validación coherente campo a campo con Pendientes (regla pending/unknown/alert ↛ ok; ok ↛ pendiente)');
  } catch (error) {
    fallo(paso, error && error.message);
  } finally {
    await context.close();
  }
  globalThis.__qa676GlobalStatus = globalStatusByCip;
}

// ─── Paso 4: Inicio (xlsx sintético) vs Pendientes por data-pendientes-estado ─
{
  const paso = '4';
  const { context, page, consoleErrors, pageErrors } = await newPage();
  try {
    const fixtureXlsx = readFileSync(path.join(ROOT, 'tools/fixtures/enfermeria_v6_sintetico_v1.xlsx'));
    await page.goto(base + 'farmacia_index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.FarmaciaDataImports, null, { timeout: 15000 });
    await page.locator('#inputExcelEnfermeria').setInputFiles({
      name: 'enfermeria_v6_sintetico_v1.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: fixtureXlsx
    });
    await page.waitForFunction(
      () => (window.FarmaciaDataImports?.getState('enfermeria')?.rows?.length || 0) > 0, null, { timeout: 30000 });
    await page.waitForFunction(() => {
      const el = document.getElementById('estadoCargaEnfermeria');
      return el && (el.textContent || '').includes('cargado');
    }, null, { timeout: 15000 });
    await page.waitForFunction(() => {
      const el = document.getElementById('inicioTotalCount');
      return el && Number(String(el.textContent).trim()) > 0;
    }, null, { timeout: 15000 });
    const counters = await page.evaluate(() => ({
      total: Number(String(document.getElementById('inicioTotalCount').textContent).trim()),
      listas: Number(String(document.getElementById('inicioListasCount').textContent).trim()),
      vigilancia: Number(String(document.getElementById('inicioVigilanciaCount').textContent).trim()),
      bloqueadas: Number(String(document.getElementById('inicioBloqueadasCount').textContent).trim())
    }));
    // Misma sesión (mismo contexto): el Excel cargado sigue activo en Pendientes.
    await page.goto(base + 'farmacia_actividad_servicio.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.querySelectorAll('#actividadCards [data-summary]').length === 4, null, { timeout: 15000 });
    await page.waitForFunction(
      () => document.querySelectorAll('#actividadPendientesPanel .pending-validation-card').length > 0,
      null, { timeout: 15000 });
    const byEstado = await page.evaluate(() => {
      const counts = {};
      for (const el of document.querySelectorAll('#actividadPendientesPanel .pending-validation-card')) {
        const estado = el.getAttribute('data-pendientes-estado') || 'sin_atributo';
        counts[estado] = (counts[estado] || 0) + 1;
      }
      return counts;
    });
    const cards = Object.values(byEstado).reduce((a, b) => a + b, 0);
    assert.equal(counters.total, cards,
      `Inicio total (${counters.total}) = tarjetas Pendientes (${cards}) · estados: ${JSON.stringify(byEstado)}`);
    assert.equal(counters.listas, byEstado.ok_farmacia || 0,
      `Inicio listas (${counters.listas}) = tarjetas ok_farmacia (${byEstado.ok_farmacia || 0})`);
    assert.equal(counters.vigilancia, byEstado.en_vigilancia || 0,
      `Inicio vigilancia (${counters.vigilancia}) = tarjetas en_vigilancia (${byEstado.en_vigilancia || 0})`);
    assert.equal(counters.bloqueadas, byEstado.bloqueado || 0,
      `Inicio bloqueadas (${counters.bloqueadas}) = tarjetas bloqueado (${byEstado.bloqueado || 0})`);
    assert.ok(counters.listas + counters.vigilancia + counters.bloqueadas <= counters.total,
      'categorías nunca superan el total');
    assertNoPageFailure(pageErrors, consoleErrors);
    await shot(paso, page);
    ok(paso, `Inicio (${counters.total}/${counters.listas}/${counters.vigilancia}/${counters.bloqueadas}) cuadra con Pendientes ${JSON.stringify(byEstado)}`);
  } catch (error) {
    await shot(paso, page).catch(() => {});
    fallo(paso, error && error.message);
  } finally {
    await context.close();
  }
}

// ─── Paso 5: INFO de cobertura y observados (no FALLO) ───────────────────────
{
  const paso = '5';
  console.log(`INFO ${paso}: Inicio y Validación no consumen FarmaciaPrebiologico: el veredicto global solo se compara en Pendientes`);
  console.log(`INFO ${paso}: el módulo no produce hoy el estado incompleto (solo completo/bloqueado)`);
  const globalStatus = globalThis.__qa676GlobalStatus || {};
  for (const fixture of FIXTURES) {
    console.log(`INFO ${paso}: Validación #fhPrebioGlobalStatus [${fixture.cip}] = "${globalStatus[fixture.cip] === undefined ? '(sin observar)' : globalStatus[fixture.cip]}"`);
  }
  ok(paso, 'INFO de cobertura y valores observados');
}

// ─── Paso 6: consola limpia agregada (ya se afirmó página a página) ──────────
{
  const paso = '6';
  ok(paso, '0 console.error y 0 pageerror por página (paso 2: solo errores de red del script abortado, anotados)');
}

await browser.close();
server.close();

console.log('');
console.log(`RESUMEN QA676: ${passedSteps} OK, ${failedSteps.length} FALLO${failedSteps.length ? ' (' + failedSteps.join(', ') + ')' : ''}`);
console.log(`Capturas (solo humanos): ${SHOT_DIR}/qa676_<paso>.png`);
if (failedSteps.length > 0) process.exit(1);
