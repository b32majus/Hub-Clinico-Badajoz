#!/usr/bin/env node
// QA #674 — Primera visita: pauta vacía sin inferir (QA de solo lectura).
// El check OBSERVA y afirma; nunca arregla la app. Sin visión: todo por
// DOM/texto/portapapeles/consola. Las capturas van a /tmp/nexus_checks/qa/
// solo para humanos. Solo datos sintéticos. Ausencia != valor.
// Lanzar: bin/run_checks.sh -w <worktree> -t qa farmacia_qa674_pauta_vacia_browser_check.mjs

import { existsSync, mkdirSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEMO_CIP = 'CIP-DEMO-FH-001';
const SID = 'SOL-DER-000001';
const FIXTURE = path.join(ROOT, 'tools', 'fixtures', 'enfermeria_v6_sintetico_v1.xlsx');
const PAGINA = 'farmacia_primera_visita.html';
const FARMACO = 'Farmaco Sintetico QA674';
const DOSIS = '300 mg jeringa precargada demo';
const VIA = 'SC';
const FECHA = '2026-11-08';
const SHOTS = '/tmp/nexus_checks/qa';

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        for (const candidate of [nodeModules, path.join(nodeModules, 'lib', 'node_modules')]) {
            if (existsSync(path.join(candidate, 'playwright', 'package.json'))) {
                return createRequire(path.join(candidate, '__fh_qa674_loader.cjs'))('playwright');
            }
        }
    }
    throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_qa674_pauta_vacia_browser_check.mjs');
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
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const base = `http://127.0.0.1:${server.address().port}/`;

mkdirSync(SHOTS, { recursive: true });

let okCount = 0;
const fallos = [];
let ruta = '';
let pageActual = null;
let v2Disponible = false;

function ok(paso) { okCount += 1; console.log(`OK ${paso}`); }
function fallo(paso, detalle) { fallos.push(`${paso}: ${detalle}`); console.log(`FALLO ${paso}: ${detalle}`); }
async function paso(name, fn) {
    try { await fn(); ok(name); }
    catch (error) { fallo(name, String(error && error.message ? error.message : error).slice(0, 400)); }
    const page = pageActual;
    if (page) { try { await page.screenshot({ path: `${SHOTS}/qa674_${name}.png` }); } catch { /* solo para humanos */ } }
}

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await context.newPage();
pageActual = page;
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
const pageErrors = [];
page.on('console', (message) => {
    if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(String(error)));

async function esperarCatalogo() {
    await page.waitForFunction(() => window.FarmaciaCatalog && window.FarmaciaCatalog.loaded, null, { timeout: 20000 });
}

/* Carga la primera visita con el paciente indicado y confirma que el CIP
   visible resuelve a UN paciente (applyContext escribió el CIP). */
async function cargarPrimeraVisita(query, cipEsperado) {
    await page.goto(`${base}${PAGINA}${query}`, { waitUntil: 'load' });
    await esperarCatalogo();
    await page.waitForFunction((cip) => {
        const el = document.getElementById('fhPvCip');
        return el && String(el.value || '').trim().toUpperCase() === String(cip).toUpperCase();
    }, cipEsperado, { timeout: 15000 });
    ruta = `${query} (cip=${cipEsperado})`;
}

async function leerPortapapeles(predicado, ms) {
    const limite = Date.now() + (ms || 6000);
    let texto = '';
    for (;;) {
        try { texto = await page.evaluate(() => navigator.clipboard.readText()); } catch (error) { texto = ''; }
        if (predicado(texto)) return texto;
        if (Date.now() > limite) return texto;
        await page.waitForTimeout(150);
    }
}

async function copiarInforme(marcador) {
    await page.click('#fhPvExportTxt');
    return leerPortapapeles((texto) => typeof texto === 'string' && texto.indexOf(marcador) !== -1);
}

async function copiarSalidaV2(marcador) {
    await page.click('#fhPvExportV2Btn');
    return leerPortapapeles((texto) => typeof texto === 'string' && texto.indexOf(marcador) !== -1);
}

function lineaPauta(informe) {
    return informe.split('\n').filter((linea) => linea.indexOf('Pauta:') === 0);
}

async function pautasCatalogo() {
    return page.evaluate(() => window.FarmaciaPautasCatalog.PAUTAS_CATALOG.map((p) => ({
        codigo: String(p.pauta_codigo),
        label: String(p.pauta_label)
    })));
}

const LINE_CONTEXT_QA674 = {
    rowKey: 'row-qa674-l1', treatmentId: 'treatment-qa674-l1', lineId: 'L-QA674-L1',
    lineRole: 'principal', isPrimaryLine: true, lineStatusAtEvent: 'active', activeAtEvent: true
};

/* ─── Paso 1: carga del paciente sintético y relleno sintético ─── */
await paso('1_carga_paciente_y_relleno', async () => {
    try {
        await cargarPrimeraVisita(`?cip=${DEMO_CIP}`, DEMO_CIP);
    } catch (errorDemo) {
        if (!existsSync(FIXTURE)) throw new Error(`ruta demo falló (${errorDemo.message}) y no hay fixture sintético`);
        await page.goto(`${base}farmacia_index.html`, { waitUntil: 'load' });
        await page.setInputFiles('#inputExcelEnfermeria', FIXTURE);
        await page.waitForFunction(() => {
            const el = document.getElementById('estadoCargaEnfermeria');
            return el && (el.textContent || '').includes('cargado · 5 registros');
        }, null, { timeout: 15000 });
        await cargarPrimeraVisita(`?solicitud_id=${SID}`, 'CIP-DEMO-ENF-001');
    }
    await page.fill('#fhPvFarmaco', FARMACO);
    await page.fill('#fhPvDosis', DOSIS);
    await page.selectOption('#fhPvVia', VIA);
    await page.fill('#fhPvFecha', FECHA);
    await page.selectOption('#fhPvPauta', '');
    const otroVisible = await page.isVisible('#fhPvPautaOtro');
    if (otroVisible) await page.fill('#fhPvPautaOtro', '');
    v2Disponible = await page.$eval('#fhPvExportV2Btn', (el) => !el.disabled);
});

/* ─── Paso 2: pauta vacía en el estado del formulario ─── */
await paso('2_pauta_vacia_en_formulario', async () => {
    const estado = await page.evaluate(() => {
        const pauta = document.getElementById('fhPvPauta');
        const otro = document.getElementById('fhPvPautaOtro');
        return { pauta: pauta ? pauta.value : null, otroOculto: otro ? otro.classList.contains('hidden') : null, otroValor: otro ? otro.value : null };
    });
    if (estado.pauta !== '') throw new Error('#fhPvPauta.value sigue siendo ' + JSON.stringify(estado.pauta) + ' (se forzó "")');
    if (estado.otroOculto !== true) throw new Error('#fhPvPautaOtro no tiene la clase hidden');
    if (estado.otroValor !== '') throw new Error('#fhPvPautaOtro.value = ' + JSON.stringify(estado.otroValor));
});

/* ─── Paso 3: informe de texto sin pauta inferida ─── */
await paso('3_informe_sin_pauta_inferida', async () => {
    const informe = await copiarInforme('Pauta: —');
    if (!informe || informe.indexOf('=== INFORME DE PRIMERA VISITA FARMACIA ===') === -1) {
        throw new Error('el informe no llegó al portapapeles; contenido: ' + JSON.stringify((informe || '').slice(0, 200)));
    }
    const lineas = lineaPauta(informe);
    if (lineas.length !== 1 || lineas[0] !== 'Pauta: —') {
        throw new Error('líneas de pauta: ' + JSON.stringify(lineas));
    }
    const prohibidas = await pautasCatalogo();
    const informeMinus = informe.toLowerCase();
    for (const p of prohibidas) {
        if (informeMinus.indexOf(p.codigo.toLowerCase()) !== -1) throw new Error(`el informe contiene el código de pauta ${p.codigo}`);
        if (informeMinus.indexOf(p.label.toLowerCase()) !== -1) throw new Error(`el informe contiene la etiqueta de pauta "${p.label}"`);
    }
});

/* ─── Paso 4: salida V2 sin pauta inferida (script l.1306-1322 + TSV real) ─── */
await paso('4_salida_v2_sin_pauta_inferida', async () => {
    const lineas = await page.evaluate((lineContext) => window.FarmaciaPrimeraVisita.buildFirstVisitVisibleLineV2(lineContext), LINE_CONTEXT_QA674);
    if (lineas.drugName !== FARMACO) throw new Error('la línea visible no es el fármaco escrito: ' + JSON.stringify(lineas.drugName));
    if (lineas.scheduleCode !== null || lineas.scheduleLabel !== null || lineas.scheduleOtherText !== null) {
        throw new Error('schedule con pauta vacía: code=' + JSON.stringify(lineas.scheduleCode) + ' label=' + JSON.stringify(lineas.scheduleLabel) + ' other=' + JSON.stringify(lineas.scheduleOtherText));
    }
    if (!v2Disponible) throw new Error('botón V2 deshabilitado; solo línea visible (l.1306-1322) verificada');
    const tsv = await copiarSalidaV2('"' + FARMACO + '"');
    const columnas = await page.evaluate(() => window.FarmaciaExportV2Core.ROW_COLUMNS);
    const tsvLineas = tsv.split('\n').filter((l) => l.length > 0);
    if (tsvLineas.length !== 1) throw new Error('TSV con ' + tsvLineas.length + ' filas');
    const celdas = tsvLineas[0].split('\t');
    if (celdas.length !== columnas.length) throw new Error(`TSV con ${celdas.length} columnas, se esperaban ${columnas.length}`);
    const fila = {}; columnas.forEach((nombre, i) => { fila[nombre] = celdas[i]; });
    const ceroObliga = [
        'line_schedule_code', 'line_schedule_label', 'line_schedule_other_text',
        'requested_schedule_code', 'requested_schedule_label', 'requested_schedule_other_text',
        'validated_schedule_code', 'validated_schedule_label', 'validated_schedule_other_text'
    ];
    for (const nombre of ceroObliga) {
        if (fila[nombre] !== '') throw new Error(`columna ${nombre} = ${JSON.stringify(fila[nombre])} con pauta vacía (pauta inferida)`);
    }
    if (fila.line_drug_name !== JSON.stringify(FARMACO)) throw new Error('la fila V2 no es la línea visible: line_drug_name=' + fila.line_drug_name);
});

/* ─── Paso 5: ni 'START' ni validación implícita a causa de la pauta vacía ─── */
await paso('5_sin_start_ni_validacion_implicita', async () => {
    const informe = await copiarInforme('Pauta: —');
    if (/start/i.test(informe)) throw new Error("el informe contiene 'START'");
    const conValidad = informe.split('\n').filter((linea) => /validad/i.test(linea));
    const ajenas = conValidad.filter((linea) => !/^Tratamiento validado: /.test(linea));
    if (ajenas.length) throw new Error("líneas con 'validad' fuera de la etiqueta fija 'Tratamiento validado:': " + JSON.stringify(ajenas));
    const pauta = lineaPauta(informe);
    if (pauta.length !== 1 || pauta[0] !== 'Pauta: —') throw new Error('líneas de pauta: ' + JSON.stringify(pauta));
    if (!v2Disponible) return;
    // El informe copiado encima sustituyó el portapapeles: se vuelve a copiar
    // la salida V2 con el botón antes de examinarla.
    const tsv = await copiarSalidaV2('"' + FARMACO + '"');
    if (!tsv) throw new Error('no se pudo leer la salida V2 del portapapeles');
    if (/start/i.test(tsv)) throw new Error("la salida V2 contiene 'START'");
    if (/validad/i.test(tsv)) throw new Error("la salida V2 contiene 'validad'");
});

/* ─── Paso 6: control positivo con una pauta real del catálogo ─── */
await paso('6_control_positivo_pauta_catalogo', async () => {
    const tieneOpcion = await page.$eval('#fhPvPauta', (select) => !!select.querySelector('option[value="SEMANAL"]'));
    if (!tieneOpcion) throw new Error('el select #fhPvPauta no tiene la opción SEMANAL del catálogo');
    await page.selectOption('#fhPvPauta', 'SEMANAL');
    const informe = await copiarInforme('Pauta: Semanal');
    if (!lineaPauta(informe).includes('Pauta: Semanal')) throw new Error('el informe no contiene "Pauta: Semanal": ' + JSON.stringify(lineaPauta(informe)));
    if (!v2Disponible) throw new Error('botón V2 deshabilitado; control positivo incompleto en salida');
    const tsv = await copiarSalidaV2('"SEMANAL"');
    const columnas = await page.evaluate(() => window.FarmaciaExportV2Core.ROW_COLUMNS);
    const celdas = tsv.split('\n').filter((l) => l.length > 0)[0].split('\t');
    if (celdas.length !== columnas.length) throw new Error('TSV con número inesperado de columnas');
    const fila = {}; columnas.forEach((nombre, i) => { fila[nombre] = celdas[i]; });
    if (fila.line_schedule_code !== JSON.stringify('SEMANAL')) throw new Error('line_schedule_code = ' + fila.line_schedule_code);
    if (fila.line_schedule_label !== JSON.stringify('Semanal')) throw new Error('line_schedule_label = ' + fila.line_schedule_label);
    try { await page.selectOption('#fhPvPauta', ''); } catch (error) { /* restore de estado */ }
    if ((await page.$eval('#fhPvPauta', (el) => el.value)) !== '') throw new Error('no se pudo restaurar la pauta vacía tras el control');
});

/* ─── Paso 7: inducción solicitada vs realizada por separado ─── */
await paso('7_induccion_solicitada_vs_realizada', async () => {
    const solicitadaExiste = await page.evaluate(() => !!document.getElementById('fhPvInduccionSolicitada'));
    if (!solicitadaExiste) {
        // La página no tiene el campo solicitado por el encargo; se reporta y
        // se verifica la mitad observable: la realizada no se infiere ni se
        // cruza con ninguna pauta/inducción "solicitada" en la salida.
        console.log('NOTA 7: #fhPvInduccionSolicitada no existe en farmacia_primera_visita.html; se verifica solo la parte realizada.');
    }
    await page.selectOption('#fhPvInduccionRealizada', 'No');
    const informe = await copiarInforme('Inducción realizada: No');
    if (!informe.includes('Inducción realizada: No')) throw new Error('el informe no contiene "Inducción realizada: No"');
    if (/Inducción realizada: Sí/.test(informe)) throw new Error('la salida copia un valor de inducción no realizada');
    if (informe.includes('Inducción solicitada')) throw new Error('el informe no debe llevar línea de inducción solicitada');
    const pauta = lineaPauta(informe);
    if (pauta.length !== 1 || pauta[0] !== 'Pauta: —') throw new Error('estado de pauta inesperado: ' + JSON.stringify(pauta));
    if (!v2Disponible) throw new Error('botón V2 deshabilitado; no se puede verificar la salida v2');
    const tsv = await copiarSalidaV2('"no"');
    const columnas = await page.evaluate(() => window.FarmaciaExportV2Core.ROW_COLUMNS);
    const celdas = tsv.split('\n').filter((l) => l.length > 0)[0].split('\t');
    if (celdas.length !== columnas.length) throw new Error('TSV con número inesperado de columnas');
    const fila = {}; columnas.forEach((nombre, i) => { fila[nombre] = celdas[i]; });
    if (fila.induction_performed_status !== JSON.stringify('no')) throw new Error('induction_performed_status = ' + JSON.stringify(fila.induction_performed_status));
    if (fila.requested_induction_status !== '') throw new Error('requested_induction_status = ' + JSON.stringify(fila.requested_induction_status) + ' (copia no permitida)');
    if (fila.validated_induction_status !== '') throw new Error('validated_induction_status = ' + JSON.stringify(fila.validated_induction_status) + ' (copia no permitida)');
    await page.selectOption('#fhPvInduccionRealizada', '');
});

/* ─── Paso 8: consola limpia ─── */
await paso('8_consola_limpia', async () => {
    if (consoleErrors.length) throw new Error('console.error: ' + JSON.stringify(consoleErrors));
    if (pageErrors.length) throw new Error('pageerror: ' + JSON.stringify(pageErrors));
});

await browser.close();
server.close();

console.log('');
console.log(`RESUMEN qa674: ${okCount} OK, ${fallos.length} FALLO${fallos.length ? ' [' + fallos.join(' | ') + ']' : ''}`);
console.log(`RUTA=${ruta || 'sin paciente'}`);
console.log(`V2_BOTON=${v2Disponible ? 'activo' : 'inactivo'}`);
console.log(`CONSOLE_ERRORS=${consoleErrors.length}`);
console.log(`PAGE_ERRORS=${pageErrors.length}`);
process.exit(fallos.length > 0 || consoleErrors.length > 0 || pageErrors.length > 0 ? 1 : 0);
