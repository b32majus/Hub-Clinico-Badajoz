import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const required = [
  'Cost policy', 'Risk class', 'Implementation focus', 'UI impact',
  'Visual authority', 'Visual viewport/state', 'Visual witness'
];
const values = {
  'Cost policy': ['free_only', 'standard', 'openai_experimental'],
  'Risk class': ['volume', 'complex'],
  'Implementation focus': ['technical', 'visual', 'mixed'],
  'UI impact': ['none', 'quality', 'fidelity']
};

const error = (message) => { throw new Error(message); };
function repoPath(raw, root, label) {
  const reference = raw.trim();
  if (!reference || reference === '.' || path.isAbsolute(reference) ||
      reference.includes('\\') || reference.split('/').includes('..') ||
      /^(https?:|file:|~)/i.test(reference) || reference.includes('\0')) {
    error(`${label} must be a child-readable repo-local relative path: ${reference}`);
  }
  const resolved = path.resolve(root, reference);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) error(`${label} escapes repository`);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) error(`${label} not found: ${reference}`);
  // Do not permit symlinks to send reviewer outside its project worktree.
  if (!fs.realpathSync(resolved).startsWith(fs.realpathSync(root) + path.sep)) error(`${label} resolves outside repository`);
  return resolved;
}
function parseFields(markdown) {
  const data = {};
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:[-*]\s*)?(Cost policy|Risk class|Implementation focus|UI impact|Visual authority|Visual viewport\/state|Visual witness):\s*(.*?)\s*$/i);
    if (!match) continue;
    const name = required.find(field => field.toLowerCase() === match[1].toLowerCase());
    if (Object.hasOwn(data, name)) error(`duplicate handoff field: ${name}`);
    data[name] = match[2].trim();
  }
  for (const key of required) {
    if (!data[key]) error(`missing handoff field: ${key}`);
    if (values[key] && !values[key].includes(data[key])) {
      error(`invalid ${key} value: ${data[key]}; expected ${values[key].join('|')}`);
    }
  }
  return data;
}
function validateVisualHandoff(markdown, repoRoot, costPolicy) {
  if (!['free_only', 'standard', 'openai_experimental'].includes(costPolicy)) error('unsupported visual handoff cost policy');

  const root = path.resolve(repoRoot);
  const fields = parseFields(markdown);
  if (fields['Cost policy'] !== costPolicy) {
    error(`invalid Cost policy value: ${fields['Cost policy']}; expected ${costPolicy}`);
  }
  const focus = fields['Implementation focus'];
  const impact = fields['UI impact'];
  if (['visual','mixed'].includes(focus) && impact === 'none') {
    error('visual/mixed focus requires UI impact quality|fidelity; material UI work cannot silently skip review');
  }
  if (impact === 'none') {
    for (const key of ['Visual authority','Visual viewport/state','Visual witness']) {
      if (fields[key] !== 'NONE') error(`UI impact none requires ${key}: NONE`);
    }
  } else {
    for (const key of ['Visual authority','Visual viewport/state','Visual witness']) {
      if (fields[key] === 'NONE') error(`UI impact ${impact} requires ${key}`);
    }
    const viewport = fields['Visual viewport/state'];
    const capture = fields['Visual witness'];
    if (!/\bscreen=[a-zA-Z0-9_.-]+\b/.test(viewport) ||
        !/\bviewport=\d{3,4}x\d{3,4}\b/.test(viewport) ||
        !/\bstate=[a-zA-Z0-9_.-]+\b/.test(viewport)) {
      error('Visual viewport/state must name screen, viewport=WxH and state');
    }
    if (!/\brender=[^;\n]+/.test(capture) || !/\boutput=[^;\s]+\.png\b/.test(capture)) {
      error('Visual witness must name a bounded render recipe and an expected PNG output path');
    }
    const output = capture.match(/\boutput=([^;\s]+)/)[1];
    // Output is a promised future artifact; existence is not required before execution.
    if (path.isAbsolute(output) || output.includes('..') || output.includes('\\')) {
      error('Visual witness output must be a repo-local relative PNG path');
    }
    if (impact === 'quality') {
      repoPath(fields['Visual authority'], root, 'Accepted visual-system authority');
    } else {
      const refs = fields['Visual authority'].split(',').map(x => x.trim()).filter(Boolean);
      if (!refs.length) error('fidelity requires frozen approved screenshot');
      let hasPng = false;
      for (const ref of refs) {
        const match = ref.match(/^(.+)@sha256:([a-f0-9]{64})$/i);
        if (!match) error('fidelity master must be pinned to exact sha256: path@sha256:<64hex>');
        const full = repoPath(match[1], root, 'Frozen visual master');
        const actual = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
        if (actual !== match[2].toLowerCase()) error(`fidelity master SHA mismatch: ${match[1]}`);
        if (/\.png$/i.test(match[1])) hasPng = true;
      }
      if (!hasPng) error('fidelity requires a frozen approved PNG rendering (HTML alone is insufficient)');
    }
  }
  const complex = fields['Risk class'] === 'complex';
  const routesByPolicy = {
    free_only: {
      implementer: complex ? 'atenea-implementer-free-complex' : 'atenea-implementer-free',
      standards: 'atenea-review-standards-free',
      spec: complex ? 'atenea-review-spec-free-complex' : 'atenea-review-spec-free',
      visual: 'atenea-review-visual-free',
      corrector: complex ? 'atenea-corrector-free-complex' : 'atenea-corrector-free-volume'
    },
    standard: {
      implementer: complex ? 'atenea-implementer-complex' : 'atenea-implementer-volume',
      standards: 'atenea-review-standards',
      spec: complex ? 'atenea-review-spec-complex' : 'atenea-review-spec-volume',
      visual: 'atenea-review-visual-standard',
      corrector: complex ? 'atenea-corrector-complex' : 'atenea-corrector-volume'
    },
    openai_experimental: {
      implementer: complex ? 'atenea-implementer-openai-frontier' : 'atenea-implementer-openai-sprint',
      standards: complex ? 'atenea-review-standards-openai-frontier' : 'atenea-review-standards-openai-sprint',
      spec: complex ? 'atenea-review-spec-openai-frontier' : 'atenea-review-spec-openai-sprint',
      visual: complex ? 'atenea-review-visual-openai-frontier' : 'atenea-review-visual-openai-sprint',
      corrector: 'atenea-corrector-openai'
    }
  };
  const routes = routesByPolicy[costPolicy];
  return {
    schema: { free_only: 'atenea.free.visual-handoff/v1',
      standard: 'atenea.standard.visual-handoff/v1',
      openai_experimental: 'atenea.openai-experimental.visual-handoff/v1' }[costPolicy],
    implementation_focus: focus,
    ui_impact: impact,
    implementer: routes.implementer,
    reviewers: [routes.standards, routes.spec, ...(impact === 'none' ? [] : [routes.visual])],
    corrector: routes.corrector,
    max_fresh_corrections: 2,
    requires_visual_pixels: impact !== 'none',
    visual_authority: fields['Visual authority']
  };
}
function validateFreeVisualHandoff(markdown, repoRoot) {
  return validateVisualHandoff(markdown, repoRoot, 'free_only');
}
function validateStandardVisualHandoff(markdown, repoRoot) {
  return validateVisualHandoff(markdown, repoRoot, 'standard');
}
function validateExperimentalOpenAIVisualHandoff(markdown, repoRoot) {
  return validateVisualHandoff(markdown, repoRoot, 'openai_experimental');
}
export { parseFields, repoPath, validateFreeVisualHandoff, validateStandardVisualHandoff, validateExperimentalOpenAIVisualHandoff };
