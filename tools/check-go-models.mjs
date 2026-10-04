#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const required = [
  'opencode-go/mimo-v2.6-flash',
  'opencode-go/muse-spark-1.3-contributor',
  'opencode-go/deepseek-v4.1-flash',
  'nan/qwen3.6',
  'openai/gpt-6-luna'
];

const result = spawnSync('opencode', ['models'], { encoding: 'utf8' });
if (result.error || result.status !== 0) {
  console.error('ATENEA_GO_MODEL_CHECK=FAIL');
  console.error(result.error?.message || result.stderr || 'opencode models failed');
  process.exit(1);
}

const available = new Set(result.stdout.split(/\r?\n/).map((x) => x.trim()).filter(Boolean));
const missing = required.filter((id) => !available.has(id));
if (missing.length) {
  console.error('ATENEA_GO_MODEL_CHECK=FAIL');
  missing.forEach((id) => console.error(`- missing runtime model: ${id}`));
  console.error('STOP: refresh the Go catalog at a clean boundary; do not fall back to another provider/model.');
  process.exit(1);
}

console.log('ATENEA_GO_MODEL_CHECK=PASS');
required.forEach((id) => console.log(`- ${id}`));
