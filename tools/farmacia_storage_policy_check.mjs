#!/usr/bin/env node
// tools/farmacia_storage_policy_check.mjs
// Verifica que no queden escrituras a localStorage para datos de importación

import fs from 'fs';
import path from 'path';

const TARGET_DIR = '/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo';
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
    // Verificar que no hay escrituras directas a localStorage para import
    if (content.includes('safeSetLocalStorage(IMPORT_STORAGE_KEYS')) issues.push('ERROR: Aun se usa safeSetLocalStorage con IMPORT_STORAGE_KEYS');
    // Verificar que readImportedDataset usa sessionStorage
    if (!content.includes('safeGetSessionStorage(IMPORT_STORAGE_KEYS')) issues.push('ERROR: readImportedDataset no usa sessionStorage');
    // Verificar fallback memoria
    if (!content.includes('SESSION_STORAGE_FALLBACK')) issues.push('ERROR: Falta fallback en memoria');
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
