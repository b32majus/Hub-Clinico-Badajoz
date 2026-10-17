#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const required = [
  'opencode/mimo-v2.6-flash-free',
  'opencode/space-bunny-free',
  'nan/qwen3.6'
];

const result = spawnSync('opencode', ['models'], { encoding: 'utf8' });
if (result.error || result.status !== 0) {
  console.error('ATENEA_FREE_MODEL_CHECK=FAIL');
  console.error(result.error?.message || result.stderr || 'opencode models failed');
  process.exit(1);
}

const available = new Set(result.stdout.split(/\r?\n/).map((x) => x.trim()).filter(Boolean));
const missing = required.filter((id) => !available.has(id));
if (missing.length) {
  console.error('ATENEA_FREE_MODEL_CHECK=FAIL');
  missing.forEach((id) => console.error(`- missing runtime model: ${id}`));
  console.error('STOP: refresh the Free catalog at a clean boundary; do not fall back to paid routing.');
  process.exit(1);
}

console.log('ATENEA_FREE_MODEL_CHECK=PASS');
required.forEach((id) => console.log(`- ${id}`));
