#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE_REF = process.env.FOLLOWUP_SOURCE_REF || '';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    failed++;
  }
}

function readSource(relativePath) {
  if (!SOURCE_REF) return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  return execFileSync('git', ['show', `${SOURCE_REF}:${relativePath}`], {
    cwd: ROOT,
    encoding: 'utf8'
  });
}

const html = readSource('farmacia_seguimiento.html');
const source = readSource('scripts/farmacia_seguimiento.js');
const exportMarker = '    window.FarmaciaSeguimiento = {';
const testExport = `    window.FarmaciaSeguimientoBoundaryTest = {
        biologicRelationLabel: biologicRelationLabel,
        mapOtherDrugToContract: mapOtherDrugToContract,
        applyCatalogSelectionToOtherDrug: applyCatalogSelectionToOtherDrug,
        getRelevantDrugCandidates: getRelevantDrugCandidates,
        setOtherDrugs: function (drugs) { followupOtherDrugs = drugs; },
        getOtherDrugs: function () { return followupOtherDrugs; }
    };

${exportMarker}`;
const instrumentedSource = source.replace(exportMarker, testExport);

assert(instrumentedSource !== source, 'El harness instrumenta solo en memoria las funciones reales de Seguimiento');

const sandbox = {
  window: { FarmaciaDemo: {} },
  console,
  document: {
    addEventListener: () => {},
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({})
  },
  Event: function Event(type) { this.type = type; },
  setTimeout,
  clearTimeout
};
sandbox.window.FarmaciaDemo.clearChildren = () => {};
vm.createContext(sandbox);
vm.runInContext(instrumentedSource, sandbox);

const api = sandbox.window.FarmaciaSeguimientoBoundaryTest;
assert(api && typeof api.mapOtherDrugToContract === 'function', 'API conductual de test disponible sin export productivo');

assert(!html.includes('value="tratamiento_anadido"'), 'La UI no permite iniciar tratamiento añadido');
assert(!html.includes('value="cambio_terapeutico"'), 'La UI no permite iniciar switch terapéutico');
assert(source.includes('Tratamiento activo previo / línea existente'), 'La UI ofrece registrar una línea activa previa o existente');

const previousLine = {
  uid: 'seg-other-synthetic-previous',
  relationType: 'Tratamiento activo previo / línea existente',
  farmaco: 'Fármaco sintético explícito',
  principioActivo: 'Principio activo sintético',
  dosis: 'Dosis manual conservada',
  presentacion: 'Presentación manual conservada',
  via: 'IV',
  pauta: 'Pauta manual conservada',
  pautaCodigo: 'OTRO',
  pautaOtro: 'Pauta manual conservada',
  sospechosoEa: 'No consta'
};
const previousSnapshot = JSON.stringify(previousLine);
const previousContract = api.mapOtherDrugToContract(previousLine);

assert(previousContract.tipo_relacion === 'adicional', 'Línea previa conserva la relación adicional existente');
assert(previousContract.estado_linea === 'activo', 'Línea previa conserva contexto activo explícito');
assert(previousContract.tipo_movimiento === '', 'Línea previa no genera tratamiento_anadido, switch ni add-on');
assert(!Object.hasOwn(previousContract, 'solicitud') && !Object.hasOwn(previousContract, 'validacion'), 'Payload de línea previa no crea solicitud ni validación');
assert(JSON.stringify(previousLine) === previousSnapshot, 'El mapeo no transforma ni pierde la identidad introducida');

const historicalAdded = 'tratamiento_anadido';
const historicalSwitch = 'cambio_terapeutico';
assert(api.biologicRelationLabel(historicalAdded) === 'Add-on terapéutico', 'Histórico tratamiento_anadido mantiene etiqueta legible');
assert(api.biologicRelationLabel(historicalSwitch) === 'Switch terapéutico', 'Histórico cambio_terapeutico mantiene etiqueta legible');
assert(historicalAdded === 'tratamiento_anadido' && historicalSwitch === 'cambio_terapeutico', 'La lectura histórica no transforma los valores originales');

api.setOtherDrugs([{ ...previousLine }]);
api.applyCatalogSelectionToOtherDrug(previousLine.uid, {
  nombre_comercial: 'Identidad catálogo sintética',
  principio_activo: 'Principio catálogo sintético',
  codigo_nacional: 'SYNTH-CN-001',
  nregistro: 'SYNTH-REG-001',
  source_type: 'CIMA',
  dosis: 'Dosis catálogo no aplicable',
  presentacion: 'Presentación catálogo no aplicable',
  via: 'SC',
  pauta: 'Pauta catálogo no aplicable'
});
const catalogResult = api.getOtherDrugs()[0];
assert(catalogResult.farmaco === 'Identidad catálogo sintética', 'Catálogo actualiza únicamente identidad farmacológica explícita');
assert(catalogResult.dosis === previousLine.dosis, 'Catálogo no sobrescribe dosis manual');
assert(catalogResult.presentacion === previousLine.presentacion, 'Catálogo no sobrescribe presentación manual');
assert(catalogResult.via === previousLine.via, 'Catálogo no sobrescribe vía manual');
assert(catalogResult.pauta === previousLine.pauta && catalogResult.pautaCodigo === previousLine.pautaCodigo, 'Catálogo no sobrescribe pauta manual');

const relevantDrugs = [
  { ...previousLine, uid: 'seg-other-synthetic-active', farmaco: 'Línea previa sintética' },
  { ...previousLine, uid: 'seg-other-synthetic-historical', relationType: 'Biológico previo/histórico', farmaco: 'Histórico sintético' },
  { ...previousLine, uid: 'seg-other-synthetic-concomitant', relationType: 'Concomitante', farmaco: 'Concomitante sintético' },
  { ...previousLine, uid: 'seg-other-synthetic-exposure', relationType: 'Exposición', farmaco: 'Exposición sintética', sospechosoEa: 'Sí' }
];
api.setOtherDrugs(relevantDrugs);
const candidates = api.getRelevantDrugCandidates();
const candidateIds = candidates.map((candidate) => candidate.id);
assert(relevantDrugs.every((drug) => candidateIds.includes(`other:${drug.uid}`)), 'Selector de sospechoso acepta línea previa, histórico, concomitante y exposición');
assert(candidates.some((candidate) => candidate.id === 'other:seg-other-synthetic-historical' && candidate.tipo_relacion === 'historico'), 'Histórico permanece histórico al poblar el selector de sospechoso');
assert(candidates.some((candidate) => candidate.id === 'other:seg-other-synthetic-exposure' && candidate.tipo_relacion === 'sospechoso_ea'), 'Exposición sospechosa permanece seleccionable sin convertirse en línea principal');
assert(api.getOtherDrugs().length === relevantDrugs.length, 'Leer candidatos históricos no provoca altas nuevas');

console.log(`\nFuente probada: ${SOURCE_REF || 'worktree actual'}`);
console.log(`Total: ${passed} passed, ${failed} failed`);

if (failed > 0) process.exit(1);
