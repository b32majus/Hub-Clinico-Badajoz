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
radio('hs_hurley', 'I', false); radio('hs_hurley', 'II', false); radio('hs_hurley', 'III', false);
radio('pso_sistemico', 'SÍ', false); radio('pso_sistemico', 'NO', false);
radio('da_ciclosporina', 'SÍ', false); radio('da_ciclosporina', 'NO', false);
radio('vit_facial', 'SÍ', false); radio('vit_facial', 'NO', false);
radio('vit_calcineurina', 'SÍ', false); radio('vit_calcineurina', 'NO', false);
radio('vit_corticoides', 'SÍ', false); radio('vit_corticoides', 'NO', false);
radio('aa_extension', 'SÍ', false); radio('aa_extension', 'NO', false);
radio('aa_duracion', 'SÍ', false); radio('aa_duracion', 'NO', false);
radio('aa_corticoides', 'SÍ', false); radio('aa_corticoides', 'NO', false);
radio('tabaco', 'Activo', false); radio('tabaco', 'Exfumador', false); radio('tabaco', 'No fumador', false);
radio('dm', 'SÍ', false); radio('dm', 'NO', false);
radio('sm', 'SÍ', false); radio('sm', 'NO', false);
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
function legacyPrefix(title, cip, brand, dose, route, pauta, induction, justification, code) {
  return `SOLICITUD DERMATOLOGÍA → FARMACIA - ${title}\n${separator}\n• CIP: ${cip}\n• Marca comercial solicitada: ${brand}\n• Dosis solicitada: ${dose}\n• Vía solicitada: ${route}\n• Pauta: ${pauta}\n• Inducción solicitada: ${induction}\n• Justificación clínica: ${justification}\nPROGRAMA SES\n• Código: ${code}\n• Denominación: ${sesLabels[code]}`;
}
const EXT_MARKER = 'EXTENSIÓN CLÍNICA DERMATOLOGÍA V1';
const EXT_TERMINATOR = 'FIN EXTENSIÓN CLÍNICA DERMATOLOGÍA V1';
// D17_EXT_V1: with only the two required common radios explicit, the
// extension serializes exactly the ANALÍTICA Y VACUNACIÓN section carrying
// them; empty sections (pathology / comorbilidades) are omitted.
function expected(title, cip, brand, dose, route, pauta, induction, justification, code) {
  return legacyPrefix(title, cip, brand, dose, route, pauta, induction, justification, code)
+ `\n${EXT_MARKER}\nANALÍTICA Y VACUNACIÓN\n• Analítica completa <3 meses: SÍ\n• Vacunación completa/revisada: SÍ\n${EXT_TERMINATOR}`;
}
function extensionBlock(sections) {
  return `\n${EXT_MARKER}\n${sections.join('\n')}\n${EXT_TERMINATOR}`;
}
function exportAndRead() { sandbox.exportSolicitud(); return copied.at(-1); }
function setCheck(id, checked) { el(id).checked = checked; }

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
  check(exportAndRead().includes(`• Código: ${code}\n• Denominación: ${sesLabels[code]}\n${EXT_MARKER}`), `${code} exports its exact catalog label ahead of the extension`);
}

fill({ programa_ses: '' }); const beforeSes = copied.length; sandbox.exportSolicitud();
check(alerts.at(-1) === '⚠️ Falta: Programa SES' && copied.length === beforeSes, 'missing Programa SES blocks without export');

fill(); const baseBrand = exportAndRead();
fill({ marca_comercial: 'Otra Marca®' }); const changedBrand = exportAndRead();
check(changedBrand.replace('Otra Marca®', 'Marca Demo®') === baseBrand, 'editing brand never alters dose/route/pauta/induction/program (cross-field independence)');
check(baseBrand.includes('• Dosis solicitada: 40 mg') && baseBrand.includes('• Vía solicitada: SC') && baseBrand.includes('• Pauta: Cada 14 días') && baseBrand.includes('• Inducción solicitada: SÍ') && baseBrand.includes('• Código: SES_HS'), 'stable fields survive brand edit unchanged');

    fill(); const copyCountBefore = copied.length; sandbox.exportSolicitud(); sandbox.exportSolicitud();
    check(copied.length === copyCountBefore + 2, 'valid export emits exactly one normative text per invocation (no variants)');

    console.log('\n[T1/#336] D17_EXT_V1 producer extension');
    function clearCommon() {
      set('fecha_analitica', '');
      setCheck('check_hemograma', false); setCheck('check_bioquimica', false);
      setCheck('check_mantoux', false); set('sel_mantoux', 'Negativo');
      setCheck('check_serologias', false); set('sel_serologias', 'Negativo');
      set('vacunacion_obs', '');
      set('imc', ''); set('paquetes_ano', ''); set('hba1c', ''); set('otras_comorbilidades', '');
    }
    function fillCommon() {
      set('fecha_analitica', '2026-09-01');
      setRadio('analitica_recente', 'SÍ');
      setCheck('check_hemograma', true); setCheck('check_bioquimica', true);
      setCheck('check_mantoux', true); set('sel_mantoux', 'Negativo');
      setCheck('check_serologias', true); set('sel_serologias', 'Pendiente');
      setRadio('vacunacion', 'Pendiente'); set('vacunacion_obs', 'Vacuna sintética pendiente');
      set('imc', '27.4'); setRadio('tabaco', 'Activo'); set('paquetes_ano', '10');
      setRadio('dm', 'SÍ'); set('hba1c', '6.8'); setRadio('sm', 'NO');
      set('otras_comorbilidades', 'Comorbilidad sintética');
    }
    const COMMON_SECTIONS = [
      'ANALÍTICA Y VACUNACIÓN',
      '• Fecha analítica: 2026-09-01',
      '• Analítica completa <3 meses: SÍ',
      '• Hemograma verificado: SÍ',
      '• Bioquímica verificada: SÍ',
      '• Mantoux/IGRA: Negativo',
      '• VHB/VHC/VIH: Pendiente',
      '• Vacunación completa/revisada: Pendiente',
      '• Observaciones vacunación: Vacuna sintética pendiente',
      'COMORBILIDADES',
      '• IMC: 27.4',
      '• Tabaquismo: Activo',
      '• Paquetes/año: 10',
      '• Diabetes: SÍ',
      '• HbA1c: 6.8',
      '• Síndrome metabólico: NO',
      '• Otras comorbilidades: Comorbilidad sintética',
    ];
    // Full exact-bytes fixture: HS pathology + explicit common data.
    fill(); fillCommon();
    set('hs_ihs4', '12'); setRadio('hs_hurley', 'II'); set('hs_evolucion', '5 años'); set('hs_localizacion', 'Axila bilateral');
    setCheck('check_dox', true); setCheck('check_rif', false);
    setCheck('check_otros_atb', true); set('otros_atb_texto', 'Tetraciclina tópica');
    setCheck('check_ada', true); set('ada_duracion', '12 meses'); set('ada_motivo', 'Fallo secundario');
    setCheck('check_bio_otros', false); set('bio_otros_texto', 'stale oculto');
    check(exportAndRead() === legacyPrefix('HIDRADENITIS SUPURATIVA', 'CIP-SINTETICO-HS', 'Marca Demo®', '40 mg', 'SC', 'Cada 14 días', 'SÍ', 'Justificación sintética', 'SES_HS') + extensionBlock([
      'DATOS CLÍNICOS — HIDRADENITIS SUPURATIVA',
      '• IHS4: 12',
      '• Hurley: II',
      '• Tiempo evolución: 5 años',
      '• Localización: Axila bilateral',
      '• Doxiciclina / Clindamicina previa: SÍ',
      '• Otros ATB previos: SÍ',
      '• Otros ATB — detalle: Tetraciclina tópica',
      '• Adalimumab previo: SÍ',
      '• Adalimumab — duración: 12 meses',
      '• Adalimumab — motivo fin: Fallo secundario',
      ...COMMON_SECTIONS,
    ]), 'HS D17_EXT_V1 fixture matches exact contract bytes');
    const hsExport = copied.at(-1);
    check(!hsExport.includes('• Rifampicina + Clindamicina previa:'), 'unchecked checkbox is omitted, never NO');
    check(!hsExport.includes('• Otros biológicos'), 'unchecked biologics checkbox and stale hidden detail never leak');
    check(!hsExport.includes('Paciente Sintético'), 'patient name/apellidos are never exported');

    // PSORIASIS: composite detail stays ONE explicit line (never split).
    fill({ patologia: 'pso', cip: 'CIP-SINTETICO-PSO' }); fillCommon();
    set('pso_pasi', '10.5'); set('pso_bsa', '14%'); set('pso_dlqi', '18'); set('pso_pga', '3');
    setRadio('pso_sistemico', 'SÍ'); set('pso_detalle', 'Metotrexato 8 meses, intolerancia'); set('pso_motivo', 'stale motivo oculto');
    let text = exportAndRead();
    check(text.includes('DATOS CLÍNICOS — PSORIASIS\n• PASI: 10.5\n• BSA: 14%\n• DLQI: 18\n• PGA: 3\n• Tratamiento sistémico previo: SÍ\n• Tratamiento sistémico previo — detalle: Metotrexato 8 meses, intolerancia\nANALÍTICA'), 'PSORIASIS pathology section keeps canonical order and composite detail');
    check(!text.includes('Motivo'), 'hidden pso_motivo never leaks when parent is SÍ');

    // DA: composite ciclosporina detail stays ONE explicit line.
    fill({ patologia: 'da', cip: 'CIP-SINTETICO-DA' }); fillCommon();
    set('da_easi', '22'); set('da_scorad', '45'); set('da_dlqi_poem', 'DLQI 16');
    setRadio('da_ciclosporina', 'SÍ'); set('da_detalle', 'Detalle sintético ciclosporina'); set('da_motivo', 'stale motivo oculto');
    text = exportAndRead();
    check(text.includes('DATOS CLÍNICOS — DERMATITIS ATÓPICA\n• EASI: 22\n• SCORAD: 45\n• DLQI / POEM: DLQI 16\n• Ciclosporina previa: SÍ\n• Ciclosporina previa — detalle: Detalle sintético ciclosporina\nANALÍTICA'), 'DA pathology section keeps canonical order and composite detail');

    // PSORIASIS NO branch: motivo serialized, hidden detalle never leaks.
    fill({ patologia: 'pso', cip: 'CIP-SINTETICO-PSO' }); fillCommon();
    set('pso_detalle', 'stale detalle oculto'); set('pso_motivo', 'Contraindicación sintética');
    setRadio('pso_sistemico', 'NO');
    text = exportAndRead();
    check(text.includes('• Tratamiento sistémico previo: NO\n• Motivo no tratamiento sistémico: Contraindicación sintética'), 'NO branch exports its explicit motivo');
    check(!text.includes('stale detalle oculto'), 'hidden pso_detalle never leaks when parent is NO');

    // VITÍLIGO: unselected radio omitted.
    fill({ patologia: 'vit', cip: 'CIP-SINTETICO-VIT' }); fillCommon();
    set('vit_extension', '18%'); setRadio('vit_facial', 'SÍ'); setRadio('vit_calcineurina', 'NO');
    set('vit_observaciones', 'Observación sintética vitíligo');
    text = exportAndRead();
    check(text.includes('DATOS CLÍNICOS — VITÍLIGO\n• Extensión afectada: 18%\n• Afectación facial: SÍ\n• Inhibidor tópico de calcineurina previo: NO\n• Observaciones clínicas: Observación sintética vitíligo'), 'VITÍLIGO pathology section keeps canonical order');
    check(!text.includes('• Corticoides tópicos previos:'), 'unselected vit radio is omitted');

    // ALOPECIA AREATA.
    fill({ patologia: 'aa', cip: 'CIP-SINTETICO-AA' }); fillCommon();
    setRadio('aa_extension', 'SÍ'); setRadio('aa_duracion', 'SÍ'); setRadio('aa_corticoides', 'NO');
    set('aa_observaciones', 'Observación sintética alopecia');
    check(exportAndRead().includes('DATOS CLÍNICOS — ALOPECIA AREATA\n• Extensión >50% cuero cabelludo: SÍ\n• Episodio actual >6 meses: SÍ\n• Corticoesteroides orales sistémicos: NO\n• Observaciones clínicas: Observación sintética alopecia'), 'AA pathology section keeps canonical order');

    // Absence semantics on common data.
    fill(); fillCommon(); clearCommon();
    setRadio('analitica_recente', 'SÍ'); setRadio('vacunacion', 'SÍ');
    set('sel_mantoux', 'Positivo - tratado'); set('sel_serologias', 'Positivo');
    set('paquetes_ano', '12'); set('hba1c', '7.2');
    setRadio('tabaco', 'No fumador'); setRadio('dm', 'NO');
    text = exportAndRead();
    check(text.includes('\n• Analítica completa <3 meses: SÍ\n• Vacunación completa/revisada: SÍ\nCOMORBILIDADES'), 'only explicit common fields serialize; empty analítica fields omitted');
    check(!text.includes('• Fecha analítica:') && !text.includes('• Observaciones vacunación:') && !text.includes('• IMC:') && !text.includes('• Otras comorbilidades:'), 'empty text/date fields are omitted, never fabricated');
    check(!text.includes('• Mantoux/IGRA:') && !text.includes('• VHB/VHC/VIH:'), 'unchecked screening checkboxes stay absent despite selected state');
    check(!text.includes('• Paquetes/año:') && !text.includes('• HbA1c:'), 'conditional details without explicit parent stay absent');
    check(!text.includes('COMORBILIDADES\nFIN'), 'comorbilidades section omitted with no explicit field');

    console.log(`\nTotal: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
