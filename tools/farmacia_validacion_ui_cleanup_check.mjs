#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'farmacia_validacion.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_validacion.js'), 'utf8');

let passed = 0;
let failed = 0;

function check(condition, label) {
  if (condition) {
    console.log('  ✓ ' + label);
    passed++;
  } else {
    console.log('  ✗ ' + label);
    failed++;
  }
}

function tagById(id) {
  const match = html.match(new RegExp('<[^>]+id=["\']' + id + '["\'][^>]*>', 'i'));
  return match ? match[0] : '';
}

function elementById(id) {
  const match = html.match(new RegExp('<([a-z0-9]+)[^>]+id=["\']' + id + '["\'][^>]*>[\\s\\S]*?<\\/\\1>', 'i'));
  return match ? match[0] : '';
}

function optionByValue(value) {
  const match = html.match(new RegExp('<option[^>]+value=["\']' + value + '["\'][^>]*>', 'i'));
  return match ? match[0] : '';
}

console.log('\n=== Validación FH — limpieza funcional mínima ===');

const originSelect = tagById('fhOrigenEntrada');
check(originSelect !== '', 'Control de origen se conserva');
check(/value=["']manual_farmacia["']/.test(html), 'Origen manual Farmacia se conserva');
check(/value=["']excel_enfermeria["']/.test(html), 'Origen contextual de Enfermería se conserva');
check(/hidden|disabled/.test(optionByValue('servicio_clinico_compatible')), 'Origen futuro no se ofrece como opción operativa');
check(/hidden|disabled/.test(optionByValue('demo_formacion')), 'Origen de formación no se ofrece como opción operativa');
check(js.includes('origenSel.addEventListener("change"'), 'Handler de cambio de origen se conserva');
check(js.includes('mostrarFormulario(this.value)'), 'Flujo manual sigue conectado al selector de origen');

check(!/hidden/.test(tagById('modPrebiologico')), 'Bloque prebiológico canónico permanece visible');
check(/hidden/.test(tagById('upperPrebioChips')), 'Duplicado superior de chips queda oculto');
check(/hidden/.test(tagById('upperPrebioGlobalStatus')), 'Resumen prebiológico superior queda oculto');
check(js.includes("replace('pbChip', 'upperPbChip')"), 'Sincronización del duplicado superior se conserva');

check(!html.includes('Profesional FH-01'), 'La pantalla no presenta una identidad profesional nominal');
check(html.includes('Profesional FH demo — identidad no nominal'), 'Responsable se identifica como demo no nominal');
check(html.includes('No constituye firma electrónica ni controla permisos'), 'Responsable aclara ausencia de firma y permisos');

check(elementById('fhValExportTxt').includes('Copiar texto para JARA'), 'Botón JARA comunica copia manual');
check(elementById('fhValExcelExportBtn').includes('Copiar fila Excel FH'), 'Botón Excel conserva copia de fila FH');
check(html.includes('Copia manual; no integración automática'), 'Exportación aclara que no existe integración automática');
check(js.includes('byId("fhValExportTxt").addEventListener("click"'), 'Handler JARA se conserva');
check(/fhValExcelExportBtn["'][\s\S]{0,120}addEventListener\(["']click["']/.test(js), 'Handler Excel se conserva');

check(/fhReumaFarmaco["'], explicitRequestedDrug\(patient\)/.test(js), 'Vista Reuma usa solo fármaco solicitado explícito');
const requestedSummary = js.match(/function requestedTreatmentSummary\(\)[\s\S]*?\n    \}/);
check(Boolean(requestedSummary) && requestedSummary[0].includes('explicitRequestedDrug(p)'), 'Resumen solicitado usa fármaco solicitado explícito');
check(Boolean(requestedSummary) && !/p\.farmaco(?!_solicitado)/.test(requestedSummary[0]), 'Resumen solicitado no usa patient.farmaco genérico');
const explicitRequested = js.match(/function explicitRequestedDrug\(patient\)[\s\S]*?\n    \}/);
check(Boolean(explicitRequested) && explicitRequested[0].includes('rawImport.farmaco_solicitado'), 'Solicitud explícita admite el shape real del importador');
check(Boolean(explicitRequested) && !/patient\.farmaco(?!_solicitado)/.test(explicitRequested[0]), 'Solicitud explícita nunca cae en patient.farmaco genérico');

console.log('\nTotal: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
