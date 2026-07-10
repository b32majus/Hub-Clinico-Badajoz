#!/usr/bin/env node
// TAREA 3: Export TXT a clipboard + ocultar CSV — contrato estructural
// Ejecutar: node tools/farmacia_export_clipboard_check.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function readFile(rel) {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function extractBlock(src, startMarker, endMarker) {
    const start = src.indexOf(startMarker);
    if (start === -1) return '';
    const end = src.indexOf(endMarker, start + startMarker.length);
    return end === -1 ? src.slice(start) : src.slice(start, end + endMarker.length);
}

let passed = 0;
let failed = 0;
const errors = [];

function check(name, fn) {
    try {
        fn();
        console.log('  ✓ ' + name);
        passed++;
    } catch (e) {
        console.log('  ✗ ' + name);
        console.log('      ' + String(e.message || e));
        failed++;
        errors.push(name + ': ' + String(e.message || e));
    }
}

const common = readFile('scripts/farmacia_common.js');
const valJs = readFile('scripts/farmacia_validacion.js');
const pvJs = readFile('scripts/farmacia_primera_visita.js');
const segJs = readFile('scripts/farmacia_seguimiento.js');
const valHtml = readFile('farmacia_validacion.html');
const pvHtml = readFile('farmacia_primera_visita.html');
const segHtml = readFile('farmacia_seguimiento.html');

console.log('\n[1] Helper común copyTextToClipboard');

check('copyTextToClipboard está declarada en farmacia_common.js', () => {
    assert(/function\s+copyTextToClipboard\s*\(\s*text\s*,\s*successMessage\s*\)/.test(common),
        'No se encontró la declaración copyTextToClipboard(text, successMessage)');
});

check('copyTextToClipboard se expone en window.FarmaciaDemo', () => {
    assert(common.includes('copyTextToClipboard,'),
        'copyTextToClipboard no aparece en el objeto expuesto FarmaciaDemo');
});

check('Helper usa Clipboard API como primera opción', () => {
    assert(common.includes('navigator.clipboard'),
        'No se detecta uso de navigator.clipboard');
});

check('Helper tiene fallback execCommand con textarea transitorio', () => {
    assert(common.includes('document.execCommand(\'copy\')') || common.includes('document.execCommand("copy")'),
        'No se detecta fallback document.execCommand("copy")');
    assert(/createElement\s*\(\s*['"]textarea['"]\s*\)/.test(common),
        'No se detecta textarea transitorio');
});

check('Helper alerta al usuario si falla el copiado', () => {
    assert(common.includes('alert(') && /No\s+se\s+pudo\s+copiar|fall[oó]|copiar/i.test(common),
        'No se detecta alerta de fallo de copiado');
});

check('downloadFile sigue disponible en FarmaciaDemo', () => {
    assert(common.includes('function downloadFile'),
        'downloadFile fue eliminado de farmacia_common.js');
    assert(common.includes('downloadFile,'),
        'downloadFile no se expone en FarmaciaDemo');
});

console.log('\n[2] Handlers TXT usan clipboard, no downloadFile');

check('Validación: fhValExportTxt llama a F.copyTextToClipboard', () => {
    const block = extractBlock(valJs, 'fhValExportTxt").addEventListener("click"', '});');
    assert(block.includes('F.copyTextToClipboard'),
        'El handler fhValExportTxt no llama a F.copyTextToClipboard');
    assert(block.includes("buildValidationLines().join(\"\\n\")") || block.includes("buildValidationLines().join('\\n')"),
        'El handler no pasa buildValidationLines().join("\\n")');
    assert(block.includes('Texto JARA copiado al portapapeles'),
        'El handler no pasa el mensaje de éxito esperado');
    assert(!/F\.downloadFile\s*\(\s*['"][^'"]*\.txt/.test(block),
        'El handler fhValExportTxt sigue llamando a F.downloadFile para .txt');
});

check('Primera visita: fhPvExportTxt llama a F.copyTextToClipboard', () => {
    const reCopy = /fhPvExportTxt[\s\S]{0,400}F\.copyTextToClipboard/;
    const reTxtDl = /fhPvExportTxt[\s\S]{0,400}F\.downloadFile\s*\(\s*['"][^'"]*\.txt/;
    assert(reCopy.test(pvJs),
        'El handler fhPvExportTxt no llama a F.copyTextToClipboard');
    assert(/buildPVLines\(\)\.join\(['"]\\n['"]\)/.test(pvJs),
        'El handler no pasa buildPVLines().join("\\n")');
    assert(pvJs.includes('Texto JARA copiado al portapapeles'),
        'El handler no pasa el mensaje de éxito esperado');
    assert(!reTxtDl.test(pvJs),
        'El handler fhPvExportTxt sigue llamando a F.downloadFile para .txt');
});

check('Seguimiento: fhSegExportTxt llama a F.copyTextToClipboard', () => {
    const reCopy = /fhSegExportTxt[\s\S]{0,400}F\.copyTextToClipboard/;
    const reTxtDl = /fhSegExportTxt[\s\S]{0,400}F\.downloadFile\s*\(\s*['"][^'"]*\.txt/;
    assert(reCopy.test(segJs),
        'El handler fhSegExportTxt no llama a F.copyTextToClipboard');
    assert(/buildSegLines\(\)\.join\(['"]\\n['"]\)/.test(segJs),
        'El handler no pasa buildSegLines().join("\\n")');
    assert(segJs.includes('Texto JARA copiado al portapapeles'),
        'El handler no pasa el mensaje de éxito esperado');
    assert(!reTxtDl.test(segJs),
        'El handler fhSegExportTxt sigue llamando a F.downloadFile para .txt');
});

console.log('\n[3] CSV handlers se conservan (sin tocar)');

check('Validación: fhValExportCsv sigue usando F.downloadFile', () => {
    const re = /fhValExportCsv[\s\S]{0,1200}F\.downloadFile/;
    assert(re.test(valJs),
        'El handler fhValExportCsv debería seguir usando F.downloadFile');
});

check('Primera visita: fhPvExportCsv sigue usando F.downloadFile', () => {
    const re = /fhPvExportCsv[\s\S]{0,3000}F\.downloadFile/;
    assert(re.test(pvJs),
        'El handler fhPvExportCsv debería seguir usando F.downloadFile');
});

check('Seguimiento: fhSegExportCsv sigue usando F.downloadFile', () => {
    const re = /fhSegExportCsv[\s\S]{0,5000}F\.downloadFile/;
    assert(re.test(segJs),
        'El handler fhSegExportCsv debería seguir usando F.downloadFile');
});

console.log('\n[4] Botones TXT renombrados y CSV ocultos en HTML');

function buttonTag(html, id) {
    const re = new RegExp('<button[^>]*id=["\']' + id + '["\'][^>]*>[\\s\\S]*?<\\/button>', 'i');
    const match = html.match(re);
    return match ? match[0] : '';
}

check('Validación: botón TXT muestra "Copiar texto JARA"', () => {
    const tag = buttonTag(valHtml, 'fhValExportTxt');
    assert(tag.includes('Copiar texto JARA'),
        'El botón fhValExportTxt no muestra "Copiar texto JARA"');
});

check('Validación: botón CSV tiene clase hidden', () => {
    const tag = buttonTag(valHtml, 'fhValExportCsv');
    assert(/\bhidden\b/.test(tag),
        'El botón fhValExportCsv no tiene clase hidden');
});

check('Primera visita: botón TXT muestra "Copiar texto JARA"', () => {
    const tag = buttonTag(pvHtml, 'fhPvExportTxt');
    assert(tag.includes('Copiar texto JARA'),
        'El botón fhPvExportTxt no muestra "Copiar texto JARA"');
});

check('Primera visita: botón CSV tiene clase hidden', () => {
    const tag = buttonTag(pvHtml, 'fhPvExportCsv');
    assert(/\bhidden\b/.test(tag),
        'El botón fhPvExportCsv no tiene clase hidden');
});

check('Seguimiento: botón TXT muestra "Copiar texto JARA"', () => {
    const tag = buttonTag(segHtml, 'fhSegExportTxt');
    assert(tag.includes('Copiar texto JARA'),
        'El botón fhSegExportTxt no muestra "Copiar texto JARA"');
});

check('Seguimiento: botón CSV tiene clase hidden', () => {
    const tag = buttonTag(segHtml, 'fhSegExportCsv');
    assert(/\bhidden\b/.test(tag),
        'El botón fhSegExportCsv no tiene clase hidden');
});

console.log('\n[5] Botones Excel FH permanecen visibles e intactos');

check('Validación: botón Excel FH muestra "Copiar fila Excel FH"', () => {
    const tag = buttonTag(valHtml, 'fhValExcelExportBtn');
    assert(tag.includes('Copiar fila Excel FH'),
        'El botón fhValExcelExportBtn no muestra "Copiar fila Excel FH"');
    assert(!/\bhidden\b/.test(tag),
        'El botón fhValExcelExportBtn no debe tener clase hidden');
});

check('Primera visita: botón Excel FH muestra "Copiar fila Excel FH"', () => {
    const tag = buttonTag(pvHtml, 'fhPvExcelExportBtn');
    assert(tag.includes('Copiar fila Excel FH'),
        'El botón fhPvExcelExportBtn no muestra "Copiar fila Excel FH"');
    assert(!/\bhidden\b/.test(tag),
        'El botón fhPvExcelExportBtn no debe tener clase hidden');
});

check('Seguimiento: botón Excel FH muestra "Copiar fila Excel FH"', () => {
    const tag = buttonTag(segHtml, 'fhSegExcelExportBtn');
    assert(tag.includes('Copiar fila Excel FH'),
        'El botón fhSegExcelExportBtn no muestra "Copiar fila Excel FH"');
    assert(!/\bhidden\b/.test(tag),
        'El botón fhSegExcelExportBtn no debe tener clase hidden');
});

console.log('\n[6] Notices de exportación actualizados');

const expectedNotice = 'Use Copiar texto JARA o Copiar fila Excel FH para generar salidas revisables.';

check('Validación: notice de exportación contiene el nuevo texto', () => {
    assert(valHtml.includes(expectedNotice),
        'farmacia_validacion.html no contiene el notice actualizado');
});

check('Primera visita: notice de exportación contiene el nuevo texto', () => {
    assert(pvHtml.includes(expectedNotice),
        'farmacia_primera_visita.html no contiene el notice actualizado');
});

check('Seguimiento: notice de exportación contiene el nuevo texto', () => {
    assert(segHtml.includes(expectedNotice),
        'farmacia_seguimiento.html no contiene el notice actualizado');
});

console.log('\n' + '═'.repeat(60));
console.log('RESULTADO: ' + passed + ' OK / ' + failed + ' FALLIDO');
if (failed > 0) {
    console.log('✗ Export clipboard check FAILED');
    process.exit(1);
} else {
    console.log('✓ Export clipboard check PASSED');
}
