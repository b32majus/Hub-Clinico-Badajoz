#!/usr/bin/env node
/**
 * cima_catalog_update_check.mjs — contract of the monthly CIMA catalogue update
 * (deuda CDC-001, buscador tramo 5).
 *
 * Decisions (Sil, 12-11-2026):
 *  - GitHub Actions, monthly + manual; direct commit to promueve/nexus-v4.
 *  - Rewrites ONLY the CATALOGO_CIMA sheet of the published catalogue; the
 *    manual CATALOGO_LOCAL_ESPECIAL sheet is copied verbatim.
 *  - NO hospital ('H') filter (it dropped the systemic drugs); only
 *    commercialised medicines (`comerc === true`).
 *  - codigo_nacional stays empty (the medicamentos listing does not give it).
 *  - Same file name, overwritten.
 *  - Safety: fewer than MIN_COMERCIALIZADOS rows or any API error => fail,
 *    nothing written.
 *
 * Synthetic API fixtures only; the fake fetch never touches the network.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));
const SCRIPT = path.join(ROOT, 'tools', 'update_cima_catalog.mjs');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'update-cima-catalog.yml');
const CATALOG_REL = 'data/catalogos/farmacia/hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx';
const CATALOG_FILE = path.join(ROOT, CATALOG_REL);

let passed = 0;
let failed = 0;
async function test(name, fn) {
    try {
        await fn();
        passed++;
        console.log(`  ok  ${name}`);
    } catch (err) {
        failed++;
        console.log(`  FAIL ${name}\n       ${err && err.message ? err.message.split('\n').join('\n       ') : err}`);
    }
}

const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const hashBefore = fs.existsSync(CATALOG_FILE) ? sha(CATALOG_FILE) : null;

let mod = null;
let importError = null;
try {
    mod = await import(pathToFileURL(SCRIPT).href);
} catch (err) {
    importError = err;
}

const FECHA = '2026-12-01 03:00:00 UTC';

function med(overrides) {
    return Object.assign({
        nregistro: '90001',
        nombre: 'FARMACO PRUEBA 10 MG COMPRIMIDOS',
        labtitular: 'Laboratorio Sintetico S.A.',
        labcomercializador: 'Otro Lab S.L.',
        cpresc: 'Medicamento Sujeto A Prescripción Médica',
        comerc: true,
        receta: true,
        biosimilar: false,
        psum: false,
        docs: [
            { tipo: 1, url: 'https://cima.aemps.es/cima/pdfs/ft/90001/FT_90001.pdf' },
            { tipo: 2, url: 'https://cima.aemps.es/cima/pdfs/p/90001/P_90001.pdf' }
        ],
        viasAdministracion: [{ id: 48, nombre: 'VÍA ORAL' }],
        formaFarmaceutica: { id: 40, nombre: 'COMPRIMIDO' },
        vtm: { id: 1, nombre: 'farmacoprueba' },
        dosis: '10 mg'
    }, overrides || {});
}

function currentWorkbook() {
    return XLSX.read(fs.readFileSync(CATALOG_FILE));
}

console.log('cima_catalog_update_check');

await test('1. tools/update_cima_catalog.mjs exists and imports without side effects', () => {
    assert.ok(fs.existsSync(SCRIPT), 'falta tools/update_cima_catalog.mjs');
    assert.equal(importError, null, `import falla: ${importError && importError.message}`);
    for (const name of ['CIMA_COLUMNS', 'MIN_COMERCIALIZADOS', 'CATALOG_PATH', 'mapMedicamento', 'buildCimaRows',
        'assertEnough', 'fetchAllMedicamentos', 'buildWorkbook', 'writeWorkbookFile', 'sameCatalogIgnoringDate']) {
        assert.ok(name in mod, `falta export ${name}`);
    }
    assert.equal(sha(CATALOG_FILE), hashBefore, 'importar el módulo no debe escribir el catálogo');
});

await test('2. CIMA_COLUMNS = header of the current CATALOGO_CIMA sheet, same order; CATALOG_PATH = same file', () => {
    const header = XLSX.utils.sheet_to_json(currentWorkbook().Sheets.CATALOGO_CIMA, { header: 1 })[0];
    assert.deepEqual([...mod.CIMA_COLUMNS], header);
    assert.equal(mod.CATALOG_PATH, CATALOG_REL);
});

await test('3. mapMedicamento: exact row from a listing record (strings only, codigo_nacional empty)', () => {
    const row = mod.mapMedicamento(med(), FECHA);
    assert.deepEqual(Object.keys(row), [...mod.CIMA_COLUMNS]);
    assert.deepEqual(row, {
        drug_source_id: '90001',
        codigo_nacional: '',
        nregistro: '90001',
        nombre_presentacion: 'FARMACO PRUEBA 10 MG COMPRIMIDOS',
        nombre_comercial: 'FARMACO PRUEBA 10 MG COMPRIMIDOS',
        principio_activo: 'FARMACOPRUEBA',
        forma_farmaceutica: 'COMPRIMIDO',
        dosis_presentacion: '10 mg',
        via: 'VÍA ORAL',
        laboratorio: 'Laboratorio Sintetico S.A.',
        comercializado: 'True',
        receta: 'True',
        cpresc_raw: 'Medicamento Sujeto A Prescripción Médica',
        es_hospitalario_derivado: 'FALSE',
        criterio_hospitalario: '',
        biosimilar: 'False',
        problema_suministro: '',
        url_ficha_tecnica: 'https://cima.aemps.es/cima/pdfs/ft/90001/FT_90001.pdf',
        url_prospecto: 'https://cima.aemps.es/cima/pdfs/p/90001/P_90001.pdf',
        fecha_extraccion: FECHA,
        observaciones_import: ''
    });
});

await test('4. principio_activo: vtm upper-cased, " + " -> ", "; no vtm -> empty (never inferred from the name)', () => {
    assert.equal(mod.mapMedicamento(med({ vtm: { id: 2, nombre: 'ácido prueba + otra prueba' } }), FECHA).principio_activo,
        'ÁCIDO PRUEBA, OTRA PRUEBA');
    const noVtm = med();
    delete noVtm.vtm;
    assert.equal(mod.mapMedicamento(noVtm, FECHA).principio_activo, '');
});

await test('5. hospital flag is informative: H -> TRUE, non-H biosimilar -> revisar, rest -> FALSE', () => {
    const h = mod.mapMedicamento(med({ cpresc: 'Uso Hospitalario. Estupefacientes' }), FECHA);
    assert.equal(h.es_hospitalario_derivado, 'TRUE');
    assert.equal(h.criterio_hospitalario, "Contiene 'H' en condiciones de prescripción");
    const dh = mod.mapMedicamento(med({ cpresc: 'Diagnóstico Hospitalario', biosimilar: true }), FECHA);
    assert.equal(dh.es_hospitalario_derivado, 'TRUE');
    assert.equal(dh.biosimilar, 'True');
    const bio = mod.mapMedicamento(med({ biosimilar: true }), FECHA);
    assert.equal(bio.es_hospitalario_derivado, 'revisar');
    assert.equal(bio.criterio_hospitalario, 'Biosimilar - requiere revisión manual');
    const plain = mod.mapMedicamento(med({ cpresc: '' }), FECHA);
    assert.equal(plain.es_hospitalario_derivado, 'FALSE');
    assert.equal(plain.criterio_hospitalario, '');
});

await test('6. missing / multiple fields: vías joined with ", ", no docs -> empty urls, psum -> True, receta false -> False', () => {
    const row = mod.mapMedicamento(med({
        viasAdministracion: [{ id: 58, nombre: 'VÍA SUBCUTÁNEA' }, { id: 31, nombre: 'VÍA INTRAVENOSA' }],
        docs: [], psum: true, receta: false, dosis: undefined, formaFarmaceutica: undefined, labtitular: undefined
    }), FECHA);
    assert.equal(row.via, 'VÍA SUBCUTÁNEA, VÍA INTRAVENOSA');
    assert.equal(row.url_ficha_tecnica, '');
    assert.equal(row.url_prospecto, '');
    assert.equal(row.problema_suministro, 'True');
    assert.equal(row.receta, 'False');
    assert.equal(row.dosis_presentacion, '');
    assert.equal(row.forma_farmaceutica, '');
    assert.equal(row.laboratorio, '');
    for (const v of Object.values(row)) assert.equal(typeof v, 'string');
});

await test('7. buildCimaRows: only comerc===true, NO hospital filter, dedupe by nregistro, sorted by name', () => {
    const rows = mod.buildCimaRows([
        med({ nregistro: '3', nombre: 'ZETA PRUEBA 5 MG COMPRIMIDOS', cpresc: 'Uso Hospitalario' }),
        med({ nregistro: '1', nombre: 'ALFA PRUEBA 5 MG COMPRIMIDOS', cpresc: 'Medicamento Sujeto A Prescripción Médica' }),
        med({ nregistro: '2', nombre: 'BETA PRUEBA 5 MG COMPRIMIDOS', comerc: false }),
        med({ nregistro: '1', nombre: 'ALFA PRUEBA 5 MG COMPRIMIDOS' }),
        med({ nregistro: '4', nombre: 'ÁBACO PRUEBA 1 MG COMPRIMIDOS', comerc: 'true' })
    ], FECHA);
    assert.deepEqual(rows.map((r) => r.nregistro), ['1', '3'],
        'fuera no comercializados (comerc estrictamente true) y duplicados; dentro los no hospitalarios');
    assert.ok(rows.every((r) => r.codigo_nacional === ''));
});

await test('8. assertEnough: MIN_COMERCIALIZADOS = 10000; fewer rows throws', () => {
    assert.equal(mod.MIN_COMERCIALIZADOS, 10000);
    assert.throws(() => mod.assertEnough(new Array(9999).fill({}), mod.MIN_COMERCIALIZADOS));
    assert.doesNotThrow(() => mod.assertEnough(new Array(10000).fill({}), mod.MIN_COMERCIALIZADOS));
});

await test('9. fetchAllMedicamentos: paginates ?pagina=N until an empty page; errors throw', async () => {
    const pages = { 1: [med({ nregistro: 'a' })], 2: [med({ nregistro: 'b' })], 3: [] };
    const urls = [];
    const fakeFetch = async (url) => {
        urls.push(String(url));
        const n = Number(new URL(String(url)).searchParams.get('pagina'));
        return { ok: true, status: 200, json: async () => ({ totalFilas: 2, pagina: n, tamanioPagina: 1, resultados: pages[n] || [] }) };
    };
    const all = await mod.fetchAllMedicamentos(fakeFetch, { pageDelayMs: 0 });
    assert.deepEqual(all.map((m) => m.nregistro), ['a', 'b']);
    assert.ok(urls.every((u) => u.startsWith('https://cima.aemps.es/cima/rest/medicamentos?')), urls.join(' '));
    assert.equal(new URL(urls[0]).searchParams.get('pagina'), '1');

    await assert.rejects(mod.fetchAllMedicamentos(async () => ({ ok: false, status: 503, json: async () => ({}) }), { pageDelayMs: 0 }));
    await assert.rejects(mod.fetchAllMedicamentos(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } }), { pageDelayMs: 0 }));
    await assert.rejects(mod.fetchAllMedicamentos(async () => ({ ok: true, status: 200, json: async () => ({ nada: 1 }) }), { pageDelayMs: 0 }));
});

await test('10. buildWorkbook: two sheets in order; CATALOGO_LOCAL_ESPECIAL copied verbatim from the current file', () => {
    const current = currentWorkbook();
    const rows = mod.buildCimaRows([med()], FECHA);
    const wb = mod.buildWorkbook(XLSX, rows, current.Sheets.CATALOGO_LOCAL_ESPECIAL);
    assert.deepEqual(wb.SheetNames, ['CATALOGO_CIMA', 'CATALOGO_LOCAL_ESPECIAL']);
    const roundTrip = XLSX.read(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    assert.deepEqual(
        XLSX.utils.sheet_to_json(roundTrip.Sheets.CATALOGO_LOCAL_ESPECIAL, { header: 1, defval: '' }),
        XLSX.utils.sheet_to_json(current.Sheets.CATALOGO_LOCAL_ESPECIAL, { header: 1, defval: '' }));
    const cima = XLSX.utils.sheet_to_json(roundTrip.Sheets.CATALOGO_CIMA, { header: 1, defval: '' });
    assert.deepEqual(cima[0], [...mod.CIMA_COLUMNS]);
    assert.equal(cima.length, 2);
    assert.equal(cima[1][mod.CIMA_COLUMNS.indexOf('nregistro')], '90001');
});

await test('11. sameCatalogIgnoringDate: only fecha_extraccion differs -> true; any other change -> false', () => {
    const a = mod.buildCimaRows([med()], FECHA);
    const b = mod.buildCimaRows([med()], '2027-01-01 03:00:00 UTC');
    const c = mod.buildCimaRows([med({ dosis: '20 mg' })], FECHA);
    assert.equal(mod.sameCatalogIgnoringDate(a, b), true);
    assert.equal(mod.sameCatalogIgnoringDate(a, c), false);
    assert.equal(mod.sameCatalogIgnoringDate(a, a.concat(c)), false);
});

await test('12. script: only node: built-ins and vendor/sheetjs; main guarded; no innerHTML', () => {
    const src = fs.readFileSync(SCRIPT, 'utf8');
    const imports = [...src.matchAll(/(?:^|\n)\s*import\s+[^'"]*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const spec of imports) assert.ok(spec.startsWith('node:'), `import no permitido: ${spec}`);
    assert.ok(/vendor[\\/'", ]+sheetjs|vendor\/sheetjs/.test(src), 'debe usar vendor/sheetjs');
    assert.ok(/import\.meta\.url/.test(src) && /process\.argv\[1\]/.test(src), 'main solo al ejecutarse directamente');
    assert.ok(!/innerHTML/.test(src));
});

await test('13. workflow: monthly + manual, contents:write, regenerate, checks BEFORE push, direct push to promueve/nexus-v4', () => {
    assert.ok(fs.existsSync(WORKFLOW), 'falta .github/workflows/update-cima-catalog.yml');
    const yml = fs.readFileSync(WORKFLOW, 'utf8');
    assert.ok(/^\s*workflow_dispatch:/m.test(yml), 'falta workflow_dispatch');
    assert.ok(/^\s*schedule:/m.test(yml) && /cron:\s*['"][^'"]+\s\d+\s\*\s\*['"]/.test(yml), 'falta schedule mensual (cron con día del mes fijo)');
    assert.ok(/contents:\s*write/.test(yml), 'falta permissions contents: write');
    assert.ok(/concurrency:/.test(yml), 'falta concurrency');
    assert.ok(/ref:\s*promueve\/nexus-v4/.test(yml), 'checkout debe ir a promueve/nexus-v4');
    const iGen = yml.indexOf('node tools/update_cima_catalog.mjs');
    const iPush = yml.indexOf('git push');
    assert.ok(iGen > 0, 'debe ejecutar node tools/update_cima_catalog.mjs');
    assert.ok(iPush > iGen, 'git push después de generar');
    for (const check of ['tools/cima_catalog_update_check.mjs', 'tools/reuma_drug_catalog_check.mjs', 'tools/reuma_drug_category_check.mjs', 'tools/farmacia_common_check.mjs']) {
        const i = yml.indexOf(`node ${check}`);
        assert.ok(i > iGen && i < iPush, `${check} debe correr entre la generación y el push`);
    }
    assert.ok(yml.includes(`git add ${CATALOG_REL}`), 'git add solo del catálogo');
    assert.ok(!/git add (-A|\.|--all)/.test(yml), 'nada de git add global');
    assert.ok(/git diff --cached --quiet/.test(yml), 'sin cambios no debe commitear');
    assert.ok(/git push origin HEAD:promueve\/nexus-v4/.test(yml), 'push directo a promueve/nexus-v4');
    assert.ok(!/--force|-f\s/.test(yml.slice(iPush, iPush + 120)), 'nunca force-push');
    assert.ok(!/create-pull-request|gh pr create/.test(yml), 'decisión (b): sin PR');
    assert.ok(!/npm (ci|install)/.test(yml), 'sin dependencias npm');
});

await test('14. writeWorkbookFile writes a readable .xlsx to disk (temp dir only)', () => {
    assert.equal(typeof mod.writeWorkbookFile, 'function', 'falta export writeWorkbookFile');
    const current = currentWorkbook();
    const wb = mod.buildWorkbook(XLSX, mod.buildCimaRows([med()], FECHA), current.Sheets.CATALOGO_LOCAL_ESPECIAL);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cima-catalog-'));
    const out = path.join(dir, 'catalogo.xlsx');
    try {
        mod.writeWorkbookFile(XLSX, wb, out);
        const back = XLSX.read(fs.readFileSync(out));
        assert.deepEqual(back.SheetNames, ['CATALOGO_CIMA', 'CATALOGO_LOCAL_ESPECIAL']);
        assert.equal(XLSX.utils.sheet_to_json(back.Sheets.CATALOGO_CIMA, { defval: '' })[0].nregistro, '90001');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

await test('15. writeWorkbookFile compresses with node:zlib: <= 45% of SheetJS built-in deflate, entries intact', () => {
    const many = [];
    for (let i = 0; i < 3000; i++) {
        many.push(med({
            nregistro: String(700000 + i),
            nombre: `FARMACO SINTETICO ${i} ${(i % 7) * 5 + 5} MG ${i % 2 ? 'COMPRIMIDOS RECUBIERTOS' : 'SOLUCION INYECTABLE EN JERINGA PRECARGADA'}`,
            vtm: { id: i, nombre: `sintetico ${i % 300}` },
            docs: [
                { tipo: 1, url: `https://cima.aemps.es/cima/pdfs/ft/${700000 + i}/FT_${700000 + i}.pdf` },
                { tipo: 2, url: `https://cima.aemps.es/cima/pdfs/p/${700000 + i}/P_${700000 + i}.pdf` }
            ]
        }));
    }
    const current = currentWorkbook();
    const rows = mod.buildCimaRows(many, FECHA);
    const wb = mod.buildWorkbook(XLSX, rows, current.Sheets.CATALOGO_LOCAL_ESPECIAL);
    const builtin = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true }).length;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cima-catalog-'));
    const out = path.join(dir, 'catalogo.xlsx');
    try {
        mod.writeWorkbookFile(XLSX, wb, out);
        const bytes = fs.readFileSync(out);
        assert.ok(bytes.length <= builtin * 0.45, `${bytes.length} bytes > 45% de ${builtin} (deflate de SheetJS)`);
        const back = XLSX.read(bytes);
        assert.deepEqual(back.SheetNames, ['CATALOGO_CIMA', 'CATALOGO_LOCAL_ESPECIAL']);
        const backRows = XLSX.utils.sheet_to_json(back.Sheets.CATALOGO_CIMA, { defval: '' });
        assert.equal(backRows.length, 3000);
        assert.equal(mod.sameCatalogIgnoringDate(backRows, rows), true, 'el contenido debe sobrevivir intacto');
        assert.deepEqual(
            XLSX.utils.sheet_to_json(back.Sheets.CATALOGO_LOCAL_ESPECIAL, { header: 1, defval: '' }),
            XLSX.utils.sheet_to_json(current.Sheets.CATALOGO_LOCAL_ESPECIAL, { header: 1, defval: '' }));
        // ZIP must be a standard one: SheetJS's own container reader lists every part.
        const names = XLSX.CFB.read(bytes, { type: 'buffer' }).FullPaths.join(' ');
        for (const part of ['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']) {
            assert.ok(names.includes(part), `falta ${part} en el zip`);
        }
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

await test('16. the check itself left the published catalogue untouched', () => {
    assert.equal(sha(CATALOG_FILE), hashBefore);
});

console.log(`\n${passed} ok, ${failed} fail`);
process.exit(failed ? 1 : 0);
