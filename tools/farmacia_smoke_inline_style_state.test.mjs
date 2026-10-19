#!/usr/bin/env node
// Testigo externo Metis NX-SMOKE-INLINE-01. Sin red ni escritura en el checkout.
// Demuestra la precisión del recuento de líneas style= al reutilizar el smoke
// real en una maqueta sintética temporal con los mismos archivos obligatorios.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED = [
  'farmacia_index.html',
  'farmacia_validacion.html',
  'farmacia_primera_visita.html',
  'farmacia_seguimiento.html',
  'farmacia_dashboard_paciente.html',
  'farmacia_estadisticas.html',
  'farmacia_farmacos.html',
  'farmacia_profesionales.html',
  'farmacia_style.css',
  'style.css',
  'scripts/farmacia_common.js',
  'scripts/farmacia_index.js',
  'scripts/farmacia_validacion.js',
  'scripts/farmacia_primera_visita.js',
  'scripts/farmacia_seguimiento.js',
  'scripts/farmacia_dashboard_paciente.js',
  'tools/farmacia_smoke_check.mjs',
];

function withSandbox(run) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-inline-smoke-'));
  try {
    for (const rel of REQUIRED) {
      const out = path.join(temp, rel);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(path.join(ROOT, rel), out);
    }
    run(temp);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function injectFixture(root, fixtureLines) {
  const filename = path.join(root, 'farmacia_farmacos.html');
  const html = fs.readFileSync(filename, 'utf8');
  const anchor = '        <body>';
  assert.equal(html.split(anchor).length, 2, 'known supported fixture insertion point');
  fs.writeFileSync(filename, html.replace(anchor, fixtureLines.join('\n') + '\n' + anchor));
}

function smoke(root) {
  const result = spawnSync(process.execPath, [path.join(root, 'tools/farmacia_smoke_check.mjs')], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, NODE_OPTIONS: '' },
  });
  assert.equal(result.error, undefined, 'smoke subprocess executes without infrastructure failure');
  assert.equal(result.signal, null, 'smoke subprocess does not time out');
  return result;
}

test('fixture baseline: no inline styles must pass smoke', () => {
  withSandbox((root) => {
    const result = smoke(root);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /Smoke check PASSED/);
  });
});

test('two adjacent inline-style lines are both reported, regardless of match positions', () => {
  withSandbox((root) => {
    injectFixture(root, [
      ' '.repeat(180) + '<div style="padding:1px">Synthetic A</div>',
      '<span style="display:none">Synthetic B</span>',
    ]);
    const result = smoke(root);
    assert.equal(result.status, 1, 'two forbidden inline styles must reject fixture');
    assert.match(result.stdout, /style= inline en farmacia_farmacos\.html/);
    const count = result.stdout.match(/style= inline en farmacia_farmacos\.html \((\d+) líneas\)/);
    assert.ok(count, 'real smoke reports the exact number of affected lines');
    assert.equal(Number(count[1]), 2,
      'smoke must count both lines: the second occurrence must not inherit the regex cursor from the first');
  });
});

test('a line with several style attributes counts once', () => {
  withSandbox((root) => {
    injectFixture(root, ['<div style="margin:0"><span style="color:red">Synthetic</span></div>']);
    const result = smoke(root);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /style= inline en farmacia_farmacos\.html \(1 líneas\)/);
  });
});

test('a standalone inline-style line is rejected', () => {
  withSandbox((root) => {
    injectFixture(root, ['<span style="display:none">Synthetic A</span>']);
    const result = smoke(root);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /style= inline en farmacia_farmacos\.html \(1 líneas\)/);
  });
});

test('a full-line HTML comment is still ignored by the smoke rule', () => {
  withSandbox((root) => {
    injectFixture(root, ['<!-- <span style="display:none">Synthetic comment</span> -->']);
    const result = smoke(root);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout, /style= inline en farmacia_farmacos\.html/);
  });
});
