// Ejecuta los checks listados en tools/ci_checks.list (uno por línea), 4 a la vez.
// Sale con 1 si alguno falla e imprime el final de su salida. Solo checks sin navegador.
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const list = readFileSync(new URL('./ci_checks.list', import.meta.url), 'utf8')
  .split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const LIMIT = Number(process.env.CI_RUNNER_CONCURRENCY || 4);
const TIMEOUT_MS = Number(process.env.CI_RUNNER_TIMEOUT_MS || 180000);
const failed = [];
let next = 0;

function run(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['tools/' + file], { cwd: root });
    let out = '';
    const cap = (d) => { out = (out + d).slice(-4000); };
    child.stdout.on('data', cap);
    child.stderr.on('data', cap);
    const timer = setTimeout(() => { out += '\n[tiempo agotado]'; child.kill('SIGKILL'); }, TIMEOUT_MS);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) failed.push({ file, code, out });
      console.log((code === 0 ? 'ok   ' : 'FALLA') + ' ' + file);
      resolve();
    });
  });
}

async function worker() {
  while (next < list.length) await run(list[next++]);
}

await Promise.all(Array.from({ length: LIMIT }, worker));
console.log(`\n${list.length - failed.length}/${list.length} checks correctos`);
for (const f of failed) console.log(`\n--- ${f.file} (rc ${f.code}) ---\n${f.out}`);
process.exit(failed.length ? 1 : 0);
