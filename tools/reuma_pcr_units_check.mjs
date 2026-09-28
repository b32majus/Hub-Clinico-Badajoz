#!/usr/bin/env node
'use strict';
/**
 * Deterministic oracle for the explicit PCR unit contract (SIL-REV-006 /
 * ticket #443, T1 of TRAIN-NEXUS-CLINICAL-SAFETY-REUMA-06).
 *
 * Loads the real, unmodified `modules/scoreCalculators.js` in a vm sandbox and
 * asserts the frozen unit contract:
 *   1. Physical equivalence mg/L <-> mg/dL in both directions (1 mg/dL == 10 mg/L).
 *   2. The same explicit clinical case expressed in equivalent units produces
 *      the same score (expected values recomputed independently here from the
 *      published formula constants; the oracle can disagree).
 *   3. Unknown/absent unit produces NO silent score (fail-closed per calculator;
 *      no magnitude inference).
 *   4. The original source value/unit is never mutated by a conversion and the
 *      derived value stays distinguishable from the source datum.
 *   5. Calculators without PCR keep their behavior (no regression).
 *
 * Synthetic values only. Exit code 0 = all cases PASS, 1 = at least one FAIL.
 * Usage: node tools/reuma_pcr_units_check.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_FILE = path.join(ROOT, 'modules', 'scoreCalculators.js');

const sandbox = { HubTools: { scores: {} }, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(MODULE_FILE, 'utf8'), sandbox, { filename: 'modules/scoreCalculators.js' });
const S = sandbox.HubTools.scores;

const results = [];
function record(name, fn) {
  try {
    fn();
    results.push(true);
    console.log(`  [OK  ] ${name}`);
  } catch (err) {
    results.push(false);
    console.log(`  [FAIL] ${name} -> ${err.message}`);
  }
}

// Independent recomputation of the published formulas (acceptance oracle).
function expectedASDASCRP(dolor, rigidez, eva, nad, pcrMgL) {
  return (0.121 * dolor) + (0.058 * rigidez) + (0.110 * eva) + (0.073 * nad) + (0.579 * Math.log(pcrMgL + 1));
}
function expectedDAS28CRP(nad28, nat28, eva, pcrMgL) {
  return (0.56 * Math.sqrt(nad28)) + (0.28 * Math.sqrt(nat28)) + (0.36 * Math.log(pcrMgL + 1)) + (0.014 * eva) + 0.96;
}
function expectedDAPSA(nad68, nat66, evaDolor, evaGlobal, pcrMgDl) {
  return nad68 + nat66 + evaDolor + evaGlobal + pcrMgDl;
}
function expectedSDAI(nad28, nat28, evaPaciente, evaMedico, pcrMgDl) {
  return nad28 + nat28 + evaPaciente + evaMedico + pcrMgDl;
}

const resolver = S.resolverPcrParaCalculadora;
const normalizar = S.normalizarUnidadPcr;

console.log('1. Equivalencia física mg/L <-> mg/dL (1 mg/dL == 10 mg/L)');
record('mg/dL -> mg/L: 1 mg/dL es exactamente 10 mg/L', () => {
  const r = resolver('1', 'mg/dL', 'mg/L', 'test');
  assert.equal(r.ok, true);
  assert.equal(r.value, 10);
  assert.equal(r.converted, true);
});
record('mg/L -> mg/dL: 10 mg/L es exactamente 1 mg/dL', () => {
  const r = resolver('10', 'mg/L', 'mg/dL', 'test');
  assert.equal(r.ok, true);
  assert.equal(r.value, 1);
  assert.equal(r.converted, true);
});
record('0.5 mg/dL -> 5 mg/L y 5 mg/L -> 0.5 mg/dL', () => {
  assert.equal(resolver('0.5', 'mg/dL', 'mg/L', 't').value, 5);
  assert.equal(resolver('5', 'mg/L', 'mg/dL', 't').value, 0.5);
});
record('misma unidad: sin conversión, valor intacto', () => {
  const r = resolver('30', 'mg/L', 'mg/L', 't');
  assert.equal(r.ok, true);
  assert.equal(r.value, 30);
  assert.equal(r.converted, false);
});
record('normalización tolerante de unidad (espacios/caso)', () => {
  assert.equal(normalizar(' MG/L '), 'mg/L');
  assert.equal(normalizar('mg/dl'), 'mg/dL');
  assert.equal(normalizar('ug/mL'), null);
  assert.equal(normalizar(''), null);
  assert.equal(normalizar(undefined), null);
  assert.equal(normalizar(null), null);
});

console.log('2. Mismo caso clínico explícito en unidades equivalentes => mismo score');
const casoASDAS = { dolor: 3, rigidez: 2, eva: 4, nad: 5, pcrMgL: 30 };
function asdasDatos(pcr, unit) {
  return {
    asdasDolorEspalda: String(casoASDAS.dolor),
    asdasDuracionRigidez: String(casoASDAS.rigidez),
    asdasEvaGlobal: String(casoASDAS.eva),
    asdasNAD: String(casoASDAS.nad),
    asdasPCR: pcr,
    asdasPCRUnit: unit
  };
}
record('ASDAS-CRP: 30 mg/L y 3 mg/dL producen el mismo score y el esperado', () => {
  const a = S.calcularASDAS(asdasDatos('30', 'mg/L'));
  const b = S.calcularASDAS(asdasDatos('3', 'mg/dL'));
  const esperado = expectedASDASCRP(casoASDAS.dolor, casoASDAS.rigidez, casoASDAS.eva, casoASDAS.nad, 30).toFixed(2);
  assert.equal(a.asdasCRP, esperado);
  assert.equal(b.asdasCRP, esperado);
  assert.equal(a.pcrConversion.converted, false);
  assert.equal(b.pcrConversion.converted, true);
});
record('ASDAS-CRP: 10 mg/L y 1 mg/dL producen el mismo score', () => {
  const a = S.calcularASDAS(asdasDatos('10', 'mg/L'));
  const b = S.calcularASDAS(asdasDatos('1', 'mg/dL'));
  assert.equal(a.asdasCRP, b.asdasCRP);
});
record('DAPSA: 30 mg/L y 3 mg/dL producen el mismo total y el esperado', () => {
  const base = { dapsaNAD68: '4', dapsaNAT66: '3', dapsaEvaDolorPaciente: '2', dapsaEvaGlobalPaciente: '3' };
  const a = S.calcularDAPSA({ ...base, dapsaPCR: '30', dapsaPCRUnit: 'mg/L' });
  const b = S.calcularDAPSA({ ...base, dapsaPCR: '3', dapsaPCRUnit: 'mg/dL' });
  const esperado = expectedDAPSA(4, 3, 2, 3, 3).toFixed(1);
  assert.equal(a.total, esperado);
  assert.equal(b.total, esperado);
});
record('DAS28-CRP: 30 mg/L y 3 mg/dL producen el mismo score y el esperado', () => {
  const base = { nad28: '4', nat28: '3', evaGlobal: '40' };
  const a = S.calcularDAS28({ ...base, pcr: '30', pcrUnit: 'mg/L' });
  const b = S.calcularDAS28({ ...base, pcr: '3', pcrUnit: 'mg/dL' });
  const esperado = expectedDAS28CRP(4, 3, 40, 30).toFixed(2);
  assert.equal(a.das28CRP, esperado);
  assert.equal(b.das28CRP, esperado);
});
record('SDAI: 30 mg/L y 3 mg/dL producen el mismo total y el esperado', () => {
  const base = { nad28: '4', nat28: '3', evaPaciente: '2', evaMedico: '3' };
  const a = S.calcularSDAI({ ...base, pcr: '30', pcrUnit: 'mg/L' });
  const b = S.calcularSDAI({ ...base, pcr: '3', pcrUnit: 'mg/dL' });
  const esperado = expectedSDAI(4, 3, 2, 3, 3).toFixed(1);
  assert.equal(a.total, esperado);
  assert.equal(b.total, esperado);
});

console.log('3. Unidad desconocida/ausente => fallo seguro, sin score silencioso');
record('ASDAS-CRP: PCR sin unidad => score vacío, sin inferencia por magnitud', () => {
  assert.equal(S.calcularASDAS(asdasDatos('30', undefined)).asdasCRP, '');
  assert.equal(S.calcularASDAS(asdasDatos('30', '')).asdasCRP, '');
  assert.equal(S.calcularASDAS(asdasDatos('30', 'ug/mL')).asdasCRP, '');
  // 0.3 "parece mg/dL" pero sin unidad declarada NO puede producir score:
  assert.equal(S.calcularASDAS(asdasDatos('0.3', 'ug/mL')).asdasCRP, '');
  const r = S.calcularASDAS(asdasDatos('30', 'ug/mL'));
  assert.equal(r.pcrConversion.ok, false);
  assert.equal(r.pcrConversion.reason, 'PCR_UNIDAD_ORIGEN_DESCONOCIDA');
});
record('ASDAS-ESR (VSG) no se ve afectado por fallo de unidad PCR', () => {
  const datos = asdasDatos('30', 'ug/mL');
  datos.asdasVSG = '20';
  const r = S.calcularASDAS(datos);
  assert.equal(r.asdasCRP, '');
  assert.notEqual(r.asdasESR, '');
});
record('DAS28-CRP: PCR sin unidad => CRP vacío; DAS28-ESR intacto', () => {
  const base = { nad28: '4', nat28: '3', evaGlobal: '40', vsg: '20' };
  const r = S.calcularDAS28({ ...base, pcr: '30', pcrUnit: 'ug/mL' });
  assert.equal(r.das28CRP, '');
  assert.notEqual(r.das28ESR, '');
  const esperado = (0.56 * Math.sqrt(4)) + (0.28 * Math.sqrt(3)) + (0.70 * Math.log(20)) + (0.014 * 40);
  assert.equal(r.das28ESR, esperado.toFixed(2));
});
record('DAPSA: unidad desconocida/ausente => Incompleto (score totalmente dependiente de PCR)', () => {
  const base = { dapsaNAD68: '4', dapsaNAT66: '3', dapsaEvaDolorPaciente: '2', dapsaEvaGlobalPaciente: '3', dapsaPCR: '30' };
  for (const unit of [undefined, '', 'ug/mL', 'mmol/L']) {
    const r = S.calcularDAPSA({ ...base, dapsaPCRUnit: unit });
    assert.equal(r.total, '');
    assert.equal(r.categoria, 'Incompleto');
    assert.equal(r.pcrConversion.ok, false);
  }
});
record('SDAI: unidad desconocida/ausente => Incompleto', () => {
  const base = { nad28: '4', nat28: '3', evaPaciente: '2', evaMedico: '3', pcr: '30' };
  for (const unit of [undefined, '', 'ug/mL']) {
    const r = S.calcularSDAI({ ...base, pcrUnit: unit });
    assert.equal(r.total, '');
    assert.equal(r.categoria, 'Incompleto');
  }
});
record('la unidad esperada de cada calculadora queda declarada en la trazabilidad', () => {
  assert.equal(S.calcularASDAS(asdasDatos('30', 'mg/L')).pcrConversion.expectedUnit, 'mg/L');
  const d = S.calcularDAPSA({ dapsaNAD68: '4', dapsaNAT66: '3', dapsaEvaDolorPaciente: '2', dapsaEvaGlobalPaciente: '3', dapsaPCR: '30', dapsaPCRUnit: 'mg/L' });
  assert.equal(d.pcrConversion.expectedUnit, 'mg/dL');
  assert.equal(d.pcrConversion.calculatorId, 'DAPSA');
  const s = S.calcularSDAI({ nad28: '4', nat28: '3', evaPaciente: '2', evaMedico: '3', pcr: '30', pcrUnit: 'mg/L' });
  assert.equal(s.pcrConversion.calculatorId, 'SDAI');
  const dd = S.calcularDAS28({ nad28: '4', nat28: '3', evaGlobal: '40', pcr: '3', pcrUnit: 'mg/dL' });
  assert.equal(dd.pcrConversion.calculatorId, 'DAS28-CRP');
  assert.equal(dd.pcrConversion.expectedUnit, 'mg/L');
});

console.log('4. El dato original no se muta; original y derivado son distinguibles');
record('DAPSA: conversión no sobrescribe el dato fuente ni su unidad', () => {
  const datos = {
    dapsaNAD68: '4', dapsaNAT66: '3', dapsaEvaDolorPaciente: '2', dapsaEvaGlobalPaciente: '3',
    dapsaPCR: '30', dapsaPCRUnit: 'mg/L'
  };
  const snapshot = JSON.stringify(datos);
  const r = S.calcularDAPSA(datos);
  assert.equal(JSON.stringify(datos), snapshot, 'los datos de entrada no deben mutarse');
  assert.equal(datos.dapsaPCR, '30');
  assert.equal(datos.dapsaPCRUnit, 'mg/L');
  assert.equal(r.pcr, '30.0', 'el valor fuente se expone intacto');
  assert.equal(r.pcrSourceUnit, 'mg/L');
  assert.equal(r.pcrMgDl, '3.00', 'el derivado es distinto y trazable');
  assert.equal(r.pcrConversion.converted, true);
  assert.equal(r.pcrConversion.sourceUnit, 'mg/L');
  assert.equal(r.pcrConversion.expectedUnit, 'mg/dL');
});
record('SDAI: conversión no sobrescribe el dato fuente', () => {
  const datos = { nad28: '4', nat28: '3', evaPaciente: '2', evaMedico: '3', pcr: '30', pcrUnit: 'mg/L' };
  const snapshot = JSON.stringify(datos);
  const r = S.calcularSDAI(datos);
  assert.equal(JSON.stringify(datos), snapshot);
  assert.equal(datos.pcr, '30');
  assert.equal(r.pcr, '30.0');
  assert.equal(r.pcrSourceUnit, 'mg/L');
  assert.equal(r.pcrMgDl, '3.00');
});
record('ASDAS: fuente mg/dL convertida a mg/L sin mutar el origen', () => {
  const datos = asdasDatos('3', 'mg/dL');
  const snapshot = JSON.stringify(datos);
  const r = S.calcularASDAS(datos);
  assert.equal(JSON.stringify(datos), snapshot);
  assert.equal(datos.asdasPCR, '3');
  assert.equal(r.pcrConversion.converted, true);
  assert.equal(r.pcrConversion.sourceUnit, 'mg/dL');
  assert.equal(r.asdasCRP, expectedASDASCRP(3, 2, 4, 5, 30).toFixed(2));
});

console.log('5. Calculadoras sin PCR: sin regresión');
record('BASDAI sin cambios', () => {
  const datos = { basdaiP1: '2', basdaiP2: '3', basdaiP3: '4', basdaiP4: '5', basdaiP5: '6', basdaiP6: '8' };
  const esperado = ((2 + 3 + 4 + 5 + (6 + Math.min((8 / 2) * 10, 10)) / 2) / 5).toFixed(2);
  assert.equal(S.calcularBASDAI(datos), esperado);
  assert.equal(S.calcularBASDAI({ ...datos, basdaiP3: '' }), '');
});
record('CDAI (sin PCR) sin cambios', () => {
  const r = S.calcularCDAI({ nad28: '4', nat28: '3', evaPaciente: '2', evaMedico: '3' });
  assert.equal(r.total, '12.0');
  assert.equal(r.categoria, 'Actividad Moderada (10-22)');
  assert.equal(S.calcularCDAI({ nad28: '4', nat28: '3', evaPaciente: '2', evaMedico: '' }).total, '');
});
record('HAQ sin cambios (ayuda escala a 2)', () => {
  const datos = { haqCategoria1: '1', haqAyuda1: true };
  for (let i = 2; i <= 8; i++) datos[`haqCategoria${i}`] = '0';
  assert.equal(S.calcularHAQ(datos), (2 + 7 * 0) / 8);
});
record('RAPID3 sin cambios', () => {
  const r = S.calcularRAPID3({ fnRaw: 0, evaDolor: '1', evaGlobal: '2' });
  assert.equal(r.total, '3.0');
  assert.equal(r.categoria, 'Casi Remision (<=3)');
});
record('DAPSA sin PCR => Incompleto (comportamiento previo preservado)', () => {
  const r = S.calcularDAPSA({ dapsaNAD68: '4', dapsaNAT66: '3', dapsaEvaDolorPaciente: '2', dapsaEvaGlobalPaciente: '3', dapsaPCR: '' });
  assert.equal(r.total, '');
  assert.equal(r.categoria, 'Incompleto');
});
record('SDAI sin PCR => Incompleto (comportamiento previo preservado)', () => {
  const r = S.calcularSDAI({ nad28: '4', nat28: '3', evaPaciente: '2', evaMedico: '3', pcr: '' });
  assert.equal(r.total, '');
  assert.equal(r.categoria, 'Incompleto');
});
record('ASDAS/DAS28 sin PCR => sin scores PCR (comportamiento previo preservado)', () => {
  assert.equal(S.calcularASDAS({ asdasDolorEspalda: '3', asdasDuracionRigidez: '2', asdasEvaGlobal: '4', asdasNAD: '5' }).asdasCRP, '');
  assert.equal(S.calcularDAS28({ nad28: '4', nat28: '3', evaGlobal: '40' }).das28CRP, '');
});
record('ESSPRI sin cambios', () => {
  assert.equal(S.calcularESSPRI({ esspriSequedad: '2', esspriDolor: '4', esspriFatiga: '6' }), '4.00');
});

const total = results.length;
const passed = results.filter(Boolean).length;
console.log(`\nRESULTADO: ${passed} OK / ${total - passed} FALLIDO`);
if (passed !== total) {
  console.log('reuma_pcr_units_check FAILED');
  process.exit(1);
}
console.log('reuma_pcr_units_check PASS');
