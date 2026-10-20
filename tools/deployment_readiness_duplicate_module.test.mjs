#!/usr/bin/env node
/**
 * Independent witness NX-READINESS-DUP-03.
 * Runs the actual readiness builder with synthetic deployment fixtures.
 * All mutations and outputs live in a disposable OS temp directory.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const BUILDER=path.join(ROOT,'tools','deployment_readiness_build.mjs');
const FIXTURES=path.join(ROOT,'tools','fixtures','deployment');
const readFixture=(relative)=>JSON.parse(fs.readFileSync(path.join(FIXTURES,relative),'utf8'));
const validManifest=()=>readFixture('valid/deployment-manifest.golden.json');
const validReleases=()=>readFixture('valid/module-releases.json');
const clone=(value)=>JSON.parse(JSON.stringify(value));

function run(t,manifest=validManifest(),releases=validReleases()) {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-readiness-dup-witness-'));
  t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
  const manifestFile=path.join(tmp,'manifest.json');
  const releasesFile=path.join(tmp,'releases.json');
  const outputFile=path.join(tmp,'readiness.json');
  fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
  fs.writeFileSync(releasesFile,JSON.stringify(releases,null,2)+'\n');
  const result=spawnSync(process.execPath,[BUILDER,manifestFile,releasesFile,outputFile],{
    cwd:ROOT,encoding:'utf8',timeout:30000,env:{...process.env,NODE_OPTIONS:''}
  });
  assert.equal(result.error,undefined,'the real builder must start');
  assert.equal(result.signal,null,'the builder must not time out');
  return {result,outputFile};
}

function expectDuplicateRejected(t,manifest,id) {
  const {result,outputFile}=run(t,manifest);
  assert.equal(result.status,1,'duplicate moduleId must fail with exit code 1');
  assert.match(result.stderr,/duplicate moduleId/i,
    'diagnostic must name the duplicate moduleId instead of accepting ambiguous readiness');
  assert.ok(result.stderr.includes(id),'diagnostic must identify repeated moduleId '+id);
  assert.equal(fs.existsSync(outputFile),false,
    'invalid manifest must not produce a readiness output file');
}

test('valid manifest yields the original golden readiness document',t=>{
  const {result,outputFile}=run(t);
  assert.equal(result.status,0,result.stderr);
  const actual=JSON.parse(fs.readFileSync(outputFile,'utf8'));
  const golden=readFixture('valid/module-readiness.golden.json');
  assert.deepEqual(actual,golden,'valid contents, qualification and routes must not change');
});

test('valid reordered manifest retains its module order',t=>{
  const manifest=validManifest();
  manifest.modules.reverse();
  const {result,outputFile}=run(t,manifest);
  assert.equal(result.status,0,result.stderr);
  const ready=JSON.parse(fs.readFileSync(outputFile,'utf8'));
  assert.deepEqual(ready.modules.map(m=>m.moduleId),manifest.modules.map(m=>m.moduleId),
    'manifest order is authoritative');
  assert.deepEqual(ready.modules.map(m=>m.route),manifest.modules.map(m=>m.entryPath));
});

test('identical duplicate farmacia moduleId is rejected with no output',t=>{
  const manifest=validManifest();
  const mod=manifest.modules.find(m=>m.moduleId==='farmacia');
  assert.ok(mod);
  manifest.modules.push(clone(mod));
  expectDuplicateRejected(t,manifest,'farmacia');
});

test('conflicting duplicate farmacia moduleId is rejected with no output',t=>{
  const manifest=validManifest();
  const mod=clone(manifest.modules.find(m=>m.moduleId==='farmacia'));
  mod.entryPath='wrong_demo.html';
  manifest.modules.push(mod);
  expectDuplicateRejected(t,manifest,'farmacia');
});

test('duplicate reuma moduleId is rejected regardless of position',t=>{
  const manifest=validManifest();
  const mod=clone(manifest.modules.find(m=>m.moduleId==='reuma'));
  manifest.modules.unshift(mod);
  expectDuplicateRejected(t,manifest,'reuma');
});

test('duplicate release-map moduleId keeps its existing rejection message',t=>{
  const releases=validReleases();
  releases.modules.push(clone(releases.modules[0]));
  const {result,outputFile}=run(t,validManifest(),releases);
  assert.equal(result.status,1);
  assert.match(result.stderr,/duplicate moduleId in release map/);
  assert.equal(fs.existsSync(outputFile),false);
});

test('missing deployed module in release map remains rejected fail-closed',t=>{
  const releases=readFixture('invalid/releases-missing-module.json');
  const {result,outputFile}=run(t,validManifest(),releases);
  assert.equal(result.status,1);
  assert.match(result.stderr,/has no release\/readiness entry/);
  assert.equal(fs.existsSync(outputFile),false);
});

test('unknown release-map module remains rejected fail-closed',t=>{
  const releases=readFixture('invalid/releases-unknown-module.json');
  const {result,outputFile}=run(t,validManifest(),releases);
  assert.equal(result.status,1);
  assert.match(result.stderr,/not part of the resolved deployment manifest/);
  assert.equal(fs.existsSync(outputFile),false);
});
