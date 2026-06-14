#!/usr/bin/env node
// tools/farmacia_storage_policy_check.mjs
// Verifica que no queden escrituras a localStorage para datos de importación

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = path.resolve(__dirname, '..');
const FARMACIA_COMMON = path.join(TARGET_DIR, 'scripts', 'farmacia_common.js');

function main() {
  let exitCode = 0;
  const issues = [];

  if (!fs.existsSync(FARMACIA_COMMON)) {
    issues.push('ERROR: No existe farmacia_common.js');
    exitCode = 1;
  } else {
    const content = fs.readFileSync(FARMACIA_COMMON, 'utf-8');
    // Verificar que existen funciones de sessionStorage
    if (!content.includes('safeGetSessionStorage')) issues.push('ERROR: Falta safeGetSessionStorage');
    if (!content.includes('safeSetSessionStorage')) issues.push('ERROR: Falta safeSetSessionStorage');
    if (!content.includes('safeRemoveSessionStorage')) issues.push('ERROR: Falta safeRemoveSessionStorage');
    // Verificar que no hay lecturas directas a localStorage para import
    if (content.includes('safeGetLocalStorage(IMPORT_STORAGE_KEYS')) issues.push('ERROR: Aun se usa safeGetLocalStorage con IMPORT_STORAGE_KEYS');
    // Verificar que readImportedDataset usa sessionStorage
    if (!content.includes('safeGetSessionStorage(IMPORT_STORAGE_KEYS')) issues.push('ERROR: readImportedDataset no usa sessionStorage');
    // Verificar que readImportedDataset lee fallback memoria
    if (!content.includes('SESSION_STORAGE_FALLBACK[kind]')) issues.push('ERROR: readImportedDataset no lee SESSION_STORAGE_FALLBACK[kind]');
    // Verificar fallback memoria declarado
    if (!content.includes('SESSION_STORAGE_FALLBACK')) issues.push('ERROR: Falta fallback en memoria');

    // Verificacion de normalizacion de pautas
    if (!content.includes('normalizePautaString')) issues.push('ERROR: Falta normalizePautaString en farmacia_common.js');
    if (!content.includes('pauta_estructurada')) issues.push('ERROR: Falta pauta_estructurada en farmacia_common.js');

    // Verificar que buildImportedPatientCandidate usa normalizePautaString
    var buildFnMatch = content.match(/function\s+buildImportedPatientCandidate\s*\(/);
    if (buildFnMatch) {
      var fnStart = buildFnMatch.index;
      // Extraer el cuerpo de la funcion hasta el siguiente function de nivel superior
      var fnBody = content.slice(fnStart);
      var nextFnMatch = fnBody.slice('function buildImportedPatientCandidate'.length).match(/\n\s*function\s+\w+\s*\(/);
      var fnBodyOnly = nextFnMatch
        ? fnBody.slice(0, 'function buildImportedPatientCandidate'.length + (nextFnMatch.index || 0))
        : fnBody;
      if (!fnBodyOnly.includes('normalizePautaString')) {
        issues.push('ERROR: buildImportedPatientCandidate no usa normalizePautaString');
      }
    } else {
      issues.push('ERROR: No se encuentra buildImportedPatientCandidate en farmacia_common.js');
    }
  }

  if (issues.length === 0) {
    console.log('storage_policy_check: PASSED');
  } else {
    issues.forEach(i => console.log(i));
    exitCode = 1;
  }
  process.exit(exitCode);
}

main();
