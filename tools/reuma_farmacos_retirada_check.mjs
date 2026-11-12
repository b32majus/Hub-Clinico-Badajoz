/**
 * Tramo 4 (retirada de la hoja «Frmacos», K6): comprobación estática.
 * La hoja, su editor (manage_drugs) y las funciones que la leían ya no existen;
 * el filtro de Estadísticas lee los fármacos de las visitas (ver
 * reuma_estadisticas_read_seam_check.mjs para el comportamiento).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const results = [];
function record(name, pass, detail) {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

const htmlPages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

record('manage_drugs.html y scripts/script_manage_drugs.js ya no existen',
    !exists('manage_drugs.html') && !exists('scripts/script_manage_drugs.js'),
    `html=${exists('manage_drugs.html')} js=${exists('scripts/script_manage_drugs.js')}`);

const linking = htmlPages.filter((f) => /manage_drugs/.test(read(f)));
record('ninguna página HTML enlaza a manage_drugs', linking.length === 0, linking.join(', '));

const dm = read('modules/dataManager.js');
const leftovers = ['Frmacos', 'getFarmacosPorTipo', 'getFarmsDataFromState', 'loadDrugsData']
    .filter((name) => dm.includes(name));
record('dataManager.js ya no menciona la hoja ni sus funciones', leftovers.length === 0, leftovers.join(', '));
record('dataManager.js expone getTreatmentFilterOptions',
    /HubTools\.data\.getTreatmentFilterOptions\s*=\s*getTreatmentFilterOptions/.test(dm), 'falta la exposición');

record('formController.js ya no define populateSelectFromDatabase',
    !/populateSelectFromDatabase/.test(read('modules/formController.js')), 'sigue presente');
record('exportManager.js ya no define copyDrugsListToClipboard',
    !/copyDrugsListToClipboard/.test(read('modules/exportManager.js')), 'sigue presente');

const port = read('scripts/reuma_population_read_port.js');
record('el puerto de lectura ya no usa getFarmsDataFromState ni categories',
    !/getFarmsDataFromState|emptyDrugCategories|categories/.test(port), 'quedan restos');

const consumer = read('scripts/script_estadisticas.js');
record('Estadísticas rellena el filtro con read.options, sin categorías de la hoja',
    /read\.options/.test(consumer) && !/Tratamientos_Sistemicos|read\.categories/.test(consumer), 'consumidor sin migrar');

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} OK`);
process.exit(failed.length ? 1 : 0);
