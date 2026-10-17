#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { repoPath, validateStandardVisualHandoff } from './free-visual-handoff-contract.mjs';

if (process.argv.length !== 3) {
  console.error('Usage: node tools/check-standard-visual-handoff.mjs <repo-local-handoff.md>');
  process.exit(2);
}
const ref = process.argv[2];
if (path.isAbsolute(ref) || ref.split(/[\\/]/).includes('..')) {
  console.error('ATENEA_STANDARD_VISUAL_HANDOFF_CHECK=FAIL\nHandoff must be repo-local.');
  process.exit(2);
}
try {
  const handoff = fs.readFileSync(repoPath(ref, process.cwd(), 'Standard handoff'), 'utf8');
  const route = validateStandardVisualHandoff(handoff, process.cwd());
  console.log('ATENEA_STANDARD_VISUAL_HANDOFF_CHECK=PASS');
  console.log(JSON.stringify(route, null, 2));
} catch (e) {
  console.error('ATENEA_STANDARD_VISUAL_HANDOFF_CHECK=FAIL');
  console.error(String(e.message));
  process.exit(1);
}
