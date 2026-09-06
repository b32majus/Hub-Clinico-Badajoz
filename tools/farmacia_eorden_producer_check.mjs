#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'docs/plantilla_solicitud_dermatologia.html'), 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
let passed = 0;
let failed = 0;
const alerts = [];
const copied = [];

function check(condition, label) {
  console.log(`  ${condition ? '✓' : '✗'} ${label}`);
  condition ? passed++ : failed++;
}

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
}
class FakeElement {
  constructor(id = '') {
    this.id = id; this.value = ''; this.checked = false; this.textContent = 'Exportar';
    this.style = {}; this.classList = new FakeClassList(); this.options = []; this.selectedIndex = 0;
  }
  focus() { document.activeElement = this; }
  select() {}
}

const elements = Object.create(null);
for (const match of html.matchAll(/<[^>]+id=["']([^"']+)["'][^>]*>/g)) elements[match[1]] = new FakeElement(match[1]);
const radios = Object.create(null);
function el(id) { return elements[id] ||= new FakeElement(id); }
function set(id, value) { el(id).value = value; }
function radio(name, value, checked = true) { (radios[name] ||= []).push({ name, value, checked }); }
radio('analitica_recente', 'SÍ'); radio('analitica_recente', 'NO', false);
radio('vacunacion', 'SÍ'); radio('vacunacion', 'NO', false); radio('vacunacion', 'Pendiente', false);
radio('induccion', 'SÍ'); radio('induccion', 'NO', false);
const button = new FakeElement('export-button');
const body = { appendChild(node) { document.activeElement = node; }, removeChild() {} };
const document = {
  activeElement: null, body,
  getElementById: id => el(id),
  querySelector(selector) {
    const radioMatch = selector.match(/^input\[name="([^"]+)"\]:checked$/);
    if (radioMatch) return (radios[radioMatch[1]] || []).find(item => item.checked) || null;
    if (selector === '.export-button') return button;
    return null;
  },
  querySelectorAll: () => [],
  createElement: tag => {
    const node = new FakeElement(tag);
    node.tagName = tag;
    return node;
  },
  execCommand(command) { if (command === 'copy') copied.push(document.activeElement.value); return true; }
};
const sandbox = { console, document, alert: message => alerts.push(message), setTimeout: () => 0, clearTimeout() {} };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(script, sandbox);

const sesLabels = {
  SES_HS: 'HIDRADENITIS SUPURATIVA', SES_PSOR: 'PSORIASIS', SES_DA: 'DERMATITIS ATOPICA',
  SES_VITI: 'VITILIGO', SES_AA: 'ALOPECIA AREATA'
};
const separator = '═══════════════════════════════════════════════════════';
function setRadio(name, value) { for (const item of radios[name]) item.checked = item.value === value; }
function fill(overrides = {}) {
  set('nombre', 'Paciente Sintético'); set('cip', 'CIP-SINTETICO-HS'); set('patologia', 'hs');
  set('marca_comercial', 'Marca Demo®'); set('dosis_solicitada', '40 mg'); set('via_solicitada', 'SC');
  set('via_otra_espec', ''); set('pauta', 'Cada 14 días'); set('justificacion', 'Justificación sintética');
  set('programa_ses', 'SES_HS'); setRadio('analitica_recente', 'SÍ'); setRadio('vacunacion', 'SÍ'); setRadio('induccion', 'SÍ');
  for (const [id, value] of Object.entries(overrides)) set(id, value);
}
function expected(title, cip, brand, dose, route, pauta, induction, justification, code) {
  return `SOLICITUD DERMATOLOGÍA → FARMACIA - ${title}\n${separator}\n• CIP: ${cip}\n• Marca comercial solicitada: ${brand}\n• Dosis solicitada: ${dose}\n• Vía solicitada: ${route}\n• Pauta: ${pauta}\n• Inducción solicitada: ${induction}\n• Justificación clínica: ${justification}\nPROGRAMA SES\n• Código: ${code}\n• Denominación: ${sesLabels[code]}`;
}
function exportAndRead() { sandbox.exportSolicitud(); return copied.at(-1); }

console.log('\n[T1] D17 e-Orden producer');
check(!html.includes('Principio activo'), 'identity field removed from HTML');
fill();
check(exportAndRead() === expected('HIDRADENITIS SUPURATIVA', 'CIP-SINTETICO-HS', 'Marca Demo®', '40 mg', 'SC', 'Cada 14 días', 'SÍ', 'Justificación sintética', 'SES_HS'), 'HS fixture matches exact D17 bytes');
fill({ patologia: 'pso', cip: 'CIP-SINTETICO-PSO', marca_comercial: 'Marca PSO', dosis_solicitada: '300 mg', via_solicitada: 'Oral', pauta: 'Cada 7 días', induccion: 'NO', justificacion: 'Justificación PSO', programa_ses: 'SES_PSOR' });
setRadio('induccion', 'NO');
check(exportAndRead() === expected('PSORIASIS', 'CIP-SINTETICO-PSO', 'Marca PSO', '300 mg', 'Oral', 'Cada 7 días', 'NO', 'Justificación PSO', 'SES_PSOR'), 'PSORIASIS fixture matches exact D17 bytes');

fill({ marca_comercial: '   ' }); const before = copied.length; sandbox.exportSolicitud();
check(alerts.at(-1) === '⚠️ Falta: Marca comercial del fármaco solicitado' && copied.length === before, 'blank brand blocks without partial export');
fill({ via_solicitada: 'Otra', via_otra_espec: '' }); const beforeOtra = copied.length; sandbox.exportSolicitud();
check(alerts.at(-1) === '⚠️ Otra requiere especificación de vía' && copied.length === beforeOtra, 'Otra without specification blocks without export');
fill({ via_solicitada: 'Otra', via_otra_espec: 'intradérmica' });
check(exportAndRead().includes('• Vía solicitada: Otra — intradérmica'), 'Otra exports em dash and specification');
fill({ dosis_solicitada: 'No informado', via_solicitada: 'No informado' });
check(exportAndRead().includes('• Dosis solicitada: No informado\n• Vía solicitada: No informado'), 'No informado dose and route are exported verbatim');
fill({ justificacion: '   ' }); const beforeJust = copied.length; sandbox.exportSolicitud();
check(alerts.at(-1) === '⚠️ Falta: Justificación clínica' && copied.length === beforeJust, 'blank justificación blocks without export');
fill({ justificacion: 'Justificación libre con acentos y 123' });
check(exportAndRead().includes('• Justificación clínica: Justificación libre con acentos y 123'), 'justificación exported verbatim');

for (const code of Object.keys(sesLabels)) {
  fill({ programa_ses: code });
  check(exportAndRead().endsWith(`• Código: ${code}\n• Denominación: ${sesLabels[code]}`), `${code} exports its exact catalog label`);
}

fill({ programa_ses: '' }); const beforeSes = copied.length; sandbox.exportSolicitud();
check(alerts.at(-1) === '⚠️ Falta: Programa SES' && copied.length === beforeSes, 'missing Programa SES blocks without export');

fill(); const baseBrand = exportAndRead();
fill({ marca_comercial: 'Otra Marca®' }); const changedBrand = exportAndRead();
check(changedBrand.replace('Otra Marca®', 'Marca Demo®') === baseBrand, 'editing brand never alters dose/route/pauta/induction/program (cross-field independence)');
check(baseBrand.includes('• Dosis solicitada: 40 mg') && baseBrand.includes('• Vía solicitada: SC') && baseBrand.includes('• Pauta: Cada 14 días') && baseBrand.includes('• Inducción solicitada: SÍ') && baseBrand.includes('• Código: SES_HS'), 'stable fields survive brand edit unchanged');

fill(); const copyCountBefore = copied.length; sandbox.exportSolicitud(); sandbox.exportSolicitud();
check(copied.length === copyCountBefore + 2, 'valid export emits exactly one normative text per invocation (no variants)');

console.log(`\nTotal: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
