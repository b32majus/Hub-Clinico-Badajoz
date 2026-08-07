import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'previews/caceres-fh');
const SOURCE_SHA = '8bfceaaa956199610be9c0e6df40740a04b73699';
const LAST_FUNCTIONAL_SHA = 'fb7b70c50c991baf6a375b42112048d190fe0178';
const SOURCE_BRANCH = 'recovery/farmacia-pr-replay-20260727';
const VERSION = 'CÁCERES-REVIEW-0.4';
const PROFILE = 'Profesional FH — Entorno de evaluación';
const SOURCE_PROVENANCE = 'Generado por: Hub Clínico Badajoz — Demo Farmacia v0.2';
const REVIEW_PROVENANCE = `Generado por: Hub Clínico — Farmacia Hospitalaria · Hospital Universitario de Cáceres · Área de Salud de Cáceres · ${VERSION}`;
const provenanceScripts = ['scripts/farmacia_validacion.js', 'scripts/farmacia_primera_visita.js', 'scripts/farmacia_seguimiento.js'];

const htmlFiles = [
  'farmacia_index.html', 'farmacia_validacion.html', 'farmacia_primera_visita.html',
  'farmacia_seguimiento.html', 'farmacia_dashboard_paciente.html',
  'farmacia_dashboard_longitudinal.html', 'farmacia_actividad_servicio.html',
  'farmacia_estadisticas.html', 'farmacia_farmacos.html', 'farmacia_profesionales.html'
];
const scriptFiles = [
  'farmacia_pautas_catalog',
  'farmacia_export_v2_core',
  'farmacia_bridge_v2_reader',
  'farmacia_bridge_v2_patient_selectors',
  'farmacia_application_data_port',
  'farmacia_raw_excel_data_source',
  'farmacia_current_patient_session',
  'farmacia_patient_flow_runtime',
  'farmacia_common',
  'farmacia_statistics_cohort',
  'farmacia_statistics_handoff',
  'farmacia_prebiologico',
  'farmacia_index',
  'farmacia_validacion_model',
  'farmacia_excel_row_export',
  'farmacia_export_v2_validation_adapter',
  'farmacia_export_v2_context',
  'farmacia_validacion',
  'farmacia_tratamiento_common',
  'farmacia_export_v2_first_visit_adapter',
  'farmacia_primera_visita',
  'farmacia_export_v2_followup_active_lines_adapter',
  'farmacia_seguimiento',
  'farmacia_longitudinal_normalizer',
  'farmacia_dashboard_paciente',
  'farmacia_longitudinal_raw_adapter',
  'farmacia_dashboard_longitudinal',
  'farmacia_actividad_servicio',
  'farmacia_estadisticas'
].map((name) => `scripts/${name}.js`);
const dynamicAssets = [
  'data/demo/farmacia/farmacia_longitudinal_demo_v0_3.json',
  'data/catalogos/farmacia/hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx'
];
const allowlist = [
  ...htmlFiles, 'style.css', 'farmacia_style.css', 'favicon.svg',
  'vendor/sheetjs/xlsx.full.min.js',
  ...scriptFiles,
  ...dynamicAssets
];

const identityStyle = `<style id="caceres-review-style">
.caceres-review-identity{position:relative;background:#173f56;color:#fff;padding:10px 18px;font:600 14px/1.45 system-ui,sans-serif;box-shadow:0 2px 8px #0003}
.caceres-review-identity__meta{display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center}
.caceres-review-identity__warning{margin-top:6px;padding:6px 10px;background:#fff3cd;color:#5f4600;border:2px solid #e0a800;border-radius:4px}
</style>`;
const identity = `<section class="caceres-review-identity" aria-label="Identidad del entorno de evaluación">
  <div class="caceres-review-identity__meta"><strong>Hub Clínico — Farmacia Hospitalaria</strong><span>Hospital Universitario de Cáceres</span><span>Área de Salud de Cáceres</span><span>FH · EVALUACIÓN</span><span>${PROFILE}</span><span>${VERSION}</span></div>
  <div class="caceres-review-identity__warning" role="alert"><strong>Datos exclusivamente sintéticos.</strong> No usar para asistencia clínica real.</div>
</section>`;
const layer = `(() => {
  'use strict';
  const PROFILE = '${PROFILE}';
  const applyProfile = () => {
    ['currentProfessional', 'fhValFarmaceutico'].forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.textContent = PROFILE;
    });
  };
  applyProfile();
  document.addEventListener('DOMContentLoaded', applyProfile);
  window.CACERES_FH_REVIEW = Object.freeze({
    deploymentId: 'caceres-fh-review', sourceSha: '${SOURCE_SHA}',
    lastFunctionalSha: '${LAST_FUNCTIONAL_SHA}', version: '${VERSION}', profile: PROFILE
  });
})();
`;

function localReferences(html) {
  return [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => match[1])
    .filter((ref) => !/^(?:https?:|data:|mailto:|tel:|#)/.test(ref));
}

function normalizeTextEol(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
}

function transformHtml(source) {
  let html = source.replace(
    /\s*<div class="nav-section">\s*<h3 class="nav-title">Módulos<\/h3>[\s\S]*?<\/ul>\s*<\/div>/g,
    ''
  );
  html = html.replace(/Profesional FH(?: demo|-\d+)/g, PROFILE);
  html = html.replace(/<span class="profile-badge">FH<\/span>/g, '<span class="profile-badge">FH · EVALUACIÓN</span>');
  html = html.replace(/<div class="sidebar-footer">[\s\S]*?<\/div>/g, `<div class="sidebar-footer">${VERSION}</div>`);
  html = html.replace('</head>', `${identityStyle}\n</head>`).replace(/<body>/, `<body>\n${identity}`);
  html = html.replace('</body>', '    <script src="scripts/caceres_review_deployment.js"></script>\n</body>');
  return html;
}

function transformProvenance(source, file) {
  const transformed = source.replace(SOURCE_PROVENANCE, REVIEW_PROVENANCE);
  if (transformed === source || transformed.includes(SOURCE_PROVENANCE)) throw new Error(`Expected deployment provenance not transformed in ${file}`);
  return transformed;
}

function assertSafeSnapshot(files) {
  const textFiles = files.filter((file) => /\.(?:html|js|css|json|svg)$/.test(file));
  const forbidden = /sessionGate|gateExcelInput|gateProfessionalSelect|(?:^|["'/])script\.js(?:[?"']|$)/;
  for (const file of textFiles) {
    const text = execFileSync(process.execPath, ['-e', `process.stdout.write(require('fs').readFileSync(${JSON.stringify(path.join(OUT, file))},'utf8'))`], { encoding: 'utf8' });
    if (forbidden.test(text)) throw new Error(`Forbidden Reuma runtime/gate leakage in ${file}`);
    if (/href="index\.html"[^>]*>[\s\S]{0,160}Reumatolog/i.test(text)) throw new Error(`Visible Reuma navigation leakage in ${file}`);
  }
}

async function sha256(file) {
  return createHash('sha256').update(await readFile(path.join(OUT, file))).digest('hex');
}

function assertGitQuiet(args, errorCode) {
  try {
    execFileSync('git', args, { cwd: ROOT, stdio: 'ignore' });
  } catch {
    throw new Error(errorCode);
  }
}

function assertSourceProvenance() {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  assertGitQuiet(['merge-base', '--is-ancestor', SOURCE_SHA, head], 'SOURCE_PROVENANCE_ANCESTRY_MISMATCH');
  const sourceInputPaths = ['--', ...allowlist];
  assertGitQuiet(['diff', '--quiet', SOURCE_SHA, head, ...sourceInputPaths], 'SOURCE_INPUT_COMMITTED_DRIFT');
  assertGitQuiet(['diff', '--quiet', head, ...sourceInputPaths], 'SOURCE_INPUT_WORKTREE_DRIFT');
  assertGitQuiet(['diff', '--cached', '--quiet', head, ...sourceInputPaths], 'SOURCE_INPUT_WORKTREE_DRIFT');
}

async function main() {
  assertSourceProvenance();
  for (const file of allowlist) await readFile(path.join(ROOT, file));
  const generatedFiles = new Set([...allowlist, 'scripts/caceres_review_deployment.js', 'index.html']);
  for (const file of htmlFiles) {
    const transformed = transformHtml(await readFile(path.join(ROOT, file), 'utf8'));
    for (const ref of localReferences(transformed)) {
      const target = decodeURIComponent(ref.split(/[?#]/)[0]);
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), target));
      if (!target || !generatedFiles.has(resolved)) throw new Error(`${file}: local dependency outside fixed allowlist: ${ref}`);
    }
  }
  await rm(OUT, { recursive: true, force: true });
  for (const file of allowlist) {
    const destination = path.join(OUT, file);
    await mkdir(path.dirname(destination), { recursive: true });
    if (htmlFiles.includes(file)) await writeFile(destination, normalizeTextEol(transformHtml(await readFile(path.join(ROOT, file), 'utf8'))));
    else if (provenanceScripts.includes(file)) await writeFile(destination, normalizeTextEol(transformProvenance(await readFile(path.join(ROOT, file), 'utf8'), file)));
    else await cp(path.join(ROOT, file), destination);
  }
  const commonPath = path.join(OUT, 'scripts/farmacia_common.js');
  const common = (await readFile(commonPath, 'utf8')).replace(/Profesional FH-\d+/g, PROFILE);
  await writeFile(commonPath, normalizeTextEol(common));
  await writeFile(path.join(OUT, 'scripts/caceres_review_deployment.js'), normalizeTextEol(layer));
  await writeFile(path.join(OUT, 'index.html'), normalizeTextEol(await readFile(path.join(OUT, 'farmacia_index.html'), 'utf8')));

  const inventory = [...allowlist, 'scripts/caceres_review_deployment.js', 'index.html'];
  assertSafeSnapshot(inventory);
  const hashes = Object.fromEntries(await Promise.all(inventory.sort().map(async (file) => [file, await sha256(file)])));
  const manifest = {
    deployment_id: 'caceres-fh-review', source_branch: SOURCE_BRANCH, source_sha: SOURCE_SHA,
    last_functional_sha: LAST_FUNCTIONAL_SHA, version: VERSION,
    built_at: execFileSync('git', ['show', '-s', '--format=%cI', SOURCE_SHA], { cwd: ROOT, encoding: 'utf8' }).trim(),
    allowlist: allowlist.sort(), hashes
  };
  await writeFile(path.join(OUT, 'deployment-manifest.json'), normalizeTextEol(`${JSON.stringify(manifest, null, 2)}\n`));
  console.log(`Built ${OUT} from ${SOURCE_SHA} (${inventory.length + 1} files).`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
