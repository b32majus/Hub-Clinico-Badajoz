import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'previews/caceres-fh');
const SHA = 'ce88818be931b0b008890fede19257530fca10c6';
const VERSION = 'CÁCERES-REVIEW-0.1';
const PROFILE = 'Profesional FH — Entorno de evaluación';
const REVIEW_PROVENANCE = `Generado por: Hub Clínico — Farmacia Hospitalaria · Hospital Universitario de Cáceres · Área de Salud de Cáceres · ${VERSION}`;
const htmlNames = [
  'index.html', 'farmacia_index.html', 'farmacia_validacion.html', 'farmacia_primera_visita.html',
  'farmacia_seguimiento.html', 'farmacia_dashboard_paciente.html', 'farmacia_dashboard_longitudinal.html',
  'farmacia_actividad_servicio.html', 'farmacia_estadisticas.html', 'farmacia_farmacos.html',
  'farmacia_profesionales.html'
];
const scripts = [
  'farmacia_common', 'farmacia_pautas_catalog', 'farmacia_prebiologico', 'farmacia_index',
  'farmacia_validacion_model', 'farmacia_validacion', 'farmacia_tratamiento_common',
  'farmacia_excel_row_export', 'farmacia_primera_visita', 'farmacia_seguimiento',
  'farmacia_longitudinal_normalizer', 'farmacia_dashboard_paciente',
  'farmacia_dashboard_longitudinal', 'farmacia_actividad_servicio', 'farmacia_estadisticas',
  'caceres_review_deployment'
].map((name) => `scripts/${name}.js`);
const expected = new Set([
  ...htmlNames, 'style.css', 'farmacia_style.css', 'favicon.svg', ...scripts,
  'vendor/sheetjs/xlsx.full.min.js',
  'data/demo/farmacia/farmacia_longitudinal_demo_v0_3.json',
  'data/catalogos/farmacia/hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx',
  'deployment-manifest.json'
]);

async function filesBelow(dir, prefix = '') {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await filesBelow(path.join(dir, entry.name), relative));
    else result.push(relative);
  }
  return result;
}
const read = (file) => readFile(path.join(OUT, file), 'utf8');
const sha256 = async (file) => createHash('sha256').update(await readFile(path.join(OUT, file))).digest('hex');
function localReferences(html) {
  return [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => match[1])
    .filter((ref) => !/^(?:https?:|data:|mailto:|tel:|#)/.test(ref));
}
function pass(number, message) { console.log(`ok ${number} - ${message}`); }

async function main() {
  const inventory = (await filesBelow(OUT)).sort();
  assert.deepEqual(inventory, [...expected].sort(), 'snapshot inventory differs from fixed allowlist');
  const html = Object.fromEntries(await Promise.all(htmlNames.map(async (name) => [name, await read(name)])));
  const allTextNames = inventory.filter((name) => /\.(?:html|js|css|json|svg)$/.test(name));
  const allText = (await Promise.all(allTextNames.map(read))).join('\n');

  assert.equal(html['index.html'], html['farmacia_index.html']);
  assert.match(html['index.html'], /Inicio Farmacia/);
  assert.doesNotMatch(html['index.html'], /http-equiv=["']refresh|location\.(?:href|replace)/i);
  pass(1, 'index.html directly contains the FH entry');

  assert.doesNotMatch(allText, /sessionGate|gateExcelInput|gateProfessionalSelect|(?:^|["'/])script\.js(?:[?"']|$)/m);
  assert.doesNotMatch(allText, /Hub Clínico Badajoz/);
  pass(2, 'Reuma runtime and gate IDs are absent');

  for (const page of Object.values(html)) assert.doesNotMatch(page, /<a\b[^>]*>[\s\S]{0,180}Reumatolog/i);
  pass(3, 'visible Reuma navigation is absent');

  for (const [name, page] of Object.entries(html)) {
    for (const ref of localReferences(page)) {
      const target = decodeURIComponent(ref.split(/[?#]/)[0]);
      assert.ok(target && expected.has(path.posix.normalize(path.posix.join(path.posix.dirname(name), target))), `${name}: unresolved ${ref}`);
    }
  }
  pass(4, 'all local page references resolve inside the snapshot');

  for (const page of Object.values(html)) {
    for (const text of ['Hub Clínico — Farmacia Hospitalaria', 'Hospital Universitario de Cáceres', 'Área de Salud de Cáceres', 'FH · EVALUACIÓN', VERSION]) assert.ok(page.includes(text), `missing ${text}`);
  }
  pass(5, 'all pages carry the Cáceres FH identity and version');

  for (const page of Object.values(html)) assert.ok(page.includes(PROFILE), 'shared profile missing');
  assert.doesNotMatch(allText, /Profesional FH(?: demo|-\d+)/);
  pass(6, 'all pages and copied sources use the exact shared profile');

  for (const page of Object.values(html)) {
    assert.ok(page.includes('Datos exclusivamente sintéticos'));
    assert.ok(page.includes('No usar para asistencia clínica real'));
    assert.match(page, /caceres-review-identity__warning/);
  }
  pass(7, 'permanent synthetic-data warning is present on every page');

  const manifest = JSON.parse(await read('deployment-manifest.json'));
  assert.equal(manifest.deployment_id, 'caceres-fh-review');
  assert.equal(manifest.source_branch, 'recovery/farmacia-pr-replay-20260727');
  assert.equal(manifest.source_sha, SHA);
  assert.equal(manifest.version, VERSION);
  assert.ok(!Number.isNaN(Date.parse(manifest.built_at)));
  for (const [file, hash] of Object.entries(manifest.hashes)) assert.equal(await sha256(file), hash, `hash mismatch: ${file}`);
  pass(8, 'manifest provenance and hashes are exact');

  const validation = html['farmacia_validacion.html'];
  for (const pathology of ['Hidradenitis supurativa', 'Psoriasis', 'Dermatitis atópica', 'Vitíligo', 'Alopecia areata']) assert.ok(validation.includes(pathology), pathology);
  for (const form of ['formHS', 'formPsoriasis', 'formDermatitisAtopica', 'formVitiligo', 'formAlopecia']) assert.ok(validation.includes(`id="${form}"`), form);
  pass(9, 'five Dermatology pathology routes remain present');

  const model = await read('scripts/farmacia_validacion_model.js');
  assert.match(model, /calculateNaranjoScore/);
  assert.match(await read('scripts/farmacia_validacion.js'), /"Alopecia areata": "formAlopecia"/);
  pass(10, 'validation model and multipathology wiring are included');

  const normalizer = await read('scripts/farmacia_longitudinal_normalizer.js');
  assert.match(normalizer, /visit_id/); assert.match(normalizer, /line_id/);
  for (const dashboard of ['scripts/farmacia_dashboard_paciente.js', 'scripts/farmacia_dashboard_longitudinal.js']) assert.ok((await read(dashboard)).includes('farmacia_longitudinal_demo_v0_3.json'));
  pass(11, 'dashboard visit_id/line_id normalizer and dataset wiring are preserved');

  for (const dependency of ['vendor/sheetjs/xlsx.full.min.js', 'data/demo/farmacia/farmacia_longitudinal_demo_v0_3.json', 'data/catalogos/farmacia/hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx']) assert.ok((await stat(path.join(OUT, dependency))).size > 0);
  pass(12, 'critical local SheetJS, longitudinal data, and drug catalog exist');

  for (const marker of ['Copiar texto JARA', 'Copiar fila Excel FH']) assert.ok(allText.includes(marker));
  for (const behavior of ['fhSegExportCsv', 'fhSeguimientoEaFarmacoSospechoso', 'btnCargarExcelEnfermeria', 'btnCargarExcelFarmacia']) assert.ok(allText.includes(behavior), behavior);
  for (const script of ['scripts/farmacia_validacion.js', 'scripts/farmacia_primera_visita.js', 'scripts/farmacia_seguimiento.js']) assert.ok((await read(script)).includes(REVIEW_PROVENANCE), `${script}: Cáceres provenance missing`);
  pass(13, 'JARA/CSV/Excel, causality, and optional import surfaces remain');

  assert.ok(!inventory.some((name) => /(^|\/)\.env(?:\.|$)|\.(?:pem|key|p12)$/i.test(name)));
  assert.doesNotMatch(allText, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAKIA[0-9A-Z]{16}\b|(?:api[_-]?key|password|secret)\s*[:=]\s*["'][^"']{8,}["']/i);
  assert.match(await read('data/demo/farmacia/farmacia_longitudinal_demo_v0_3.json'), /DEMO|sint[eé]tic/i);
  pass(14, 'obvious real-data, .env, and secret artifacts are absent');
  console.log(`PASS: ${inventory.length} fixed-allowlist files; 14/14 assertions.`);
}

main().catch((error) => { console.error(`FAIL: ${error.message}`); process.exitCode = 1; });
