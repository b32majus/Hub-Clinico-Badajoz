import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {validateFreeVisualHandoff} from './free-visual-handoff-contract.mjs';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atenea-free-visual-'));
try {
  fs.mkdirSync(path.join(root,'docs','mockups'),{recursive:true});
  fs.writeFileSync(path.join(root,'DESIGN.md'),'accepted design-system rules');
  fs.writeFileSync(path.join(root,'docs','mockups','master.png'),Buffer.from('synthetic frozen master pixels'));
  const sha=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'docs','mockups','master.png'))).digest('hex');
  const base=(focus,impact,authority,viewport,witness,risk='volume')=> [
    'Work: bounded synthetic example.',
    'Cost policy: free_only', `Risk class: ${risk}`, `Implementation focus: ${focus}`,
    `UI impact: ${impact}`,`Visual authority: ${authority}`,
    `Visual viewport/state: ${viewport}`,`Visual witness: ${witness}`
  ].join('\n')+'\n';
  const none=base('technical','none','NONE','NONE','NONE');
  const qua=base('mixed','quality','DESIGN.md','screen=lead-form; viewport=1280x760; state=dropdown-open','render=pnpm test:ui:shot; output=artifacts/lead-form-open.png');
  const fid=base('visual','fidelity',`docs/mockups/master.png@sha256:${sha}`,'screen=lead-form; viewport=1280x760; state=populated','render=pnpm test:ui:shot; output=artifacts/lead-form.png','complex');
  const r0=validateFreeVisualHandoff(none,root);
  assert.equal(r0.reviewers.length,2);
  assert.equal(r0.implementer,'atenea-implementer-free');
  assert.equal(r0.max_fresh_corrections,2);
  const r1=validateFreeVisualHandoff(qua,root);
  assert.deepEqual(r1.reviewers,['atenea-review-standards-free','atenea-review-spec-free','atenea-review-visual-free']);
  const r2=validateFreeVisualHandoff(fid,root);
  assert.equal(r2.implementer,'atenea-implementer-free-complex');
  assert.deepEqual(r2.reviewers,['atenea-review-standards-free','atenea-review-spec-free-complex','atenea-review-visual-free']);
  assert.equal(r2.max_fresh_corrections,2);
  let cases=0;
  const bad=(body,pattern)=>{assert.throws(()=>validateFreeVisualHandoff(body,root),pattern);cases++};
  bad(base('visual','none','NONE','NONE','NONE'),/requires UI impact/);
  bad(base('mixed','none','NONE','NONE','NONE'),/requires UI impact/);
  bad(qua.replace('DESIGN.md','NONE'),/requires Visual authority/);
  bad(qua.replace('DESIGN.md','../secret.txt'),/repo-local/);
  bad(qua.replace('DESIGN.md','docs/does-not-exist.md'),/not found/);
  bad(fid.replace(sha,'0'.repeat(64)),/SHA mismatch/);
  bad(fid.replace('.png@sha256:','.html@sha256:'),/not found/);
  bad(fid.replace('viewport=1280x760','viewport=unknown'),/must name screen/);
  bad(fid.replace('output=artifacts/lead-form.png','output=/tmp/lead-form.png'),/relative PNG/);
  bad(none.replace('Visual witness: NONE','Visual witness: future'),/requires Visual witness: NONE/);
  bad(qua+'UI impact: quality\n',/duplicate/);
  bad(none.replace('Risk class: volume','Risk class: critical'),/invalid Risk class/);
  bad(none.replace('Cost policy: free_only','Cost policy: go'),/invalid Cost policy/);
  bad(none.replace('UI impact: none\n',''),/missing handoff field/);
  bad(fid.replace('docs/mockups/master.png@sha256:'+sha,'DESIGN.md'),/must be pinned/);
  console.log(`ATENEA_FREE_VISUAL_HANDOFF_TEST=PASS (3 positive routes, ${cases} fail-closed cases)`);
} finally {
  fs.rmSync(root,{recursive:true,force:true});
}
