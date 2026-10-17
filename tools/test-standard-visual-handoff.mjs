import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateFreeVisualHandoff, validateStandardVisualHandoff } from './free-visual-handoff-contract.mjs';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'atenea-standard-visual-'));
try {
  fs.mkdirSync(path.join(root,'docs','mockups'),{recursive:true});
  fs.writeFileSync(path.join(root,'DESIGN.md'),'Existing accepted UI system');
  const png=path.join(root,'docs','mockups','approved.png');
  fs.writeFileSync(png,Buffer.from('synthetic only, hash verification fixture'));
  const sha=crypto.createHash('sha256').update(fs.readFileSync(png)).digest('hex');
  const form=(risk,focus,impact,authority='NONE',viewport='NONE',witness='NONE',policy='standard')=>[
    'Work: isolated synthetic route fixture.',
    'Cost policy: '+policy,
    'Risk class: '+risk,
    'Implementation focus: '+focus,
    'UI impact: '+impact,
    'Visual authority: '+authority,
    'Visual viewport/state: '+viewport,
    'Visual witness: '+witness
  ].join('\n')+'\n';
  const vp='screen=dashboard; viewport=1280x760; state=populated';
  const shot='render=pnpm test:screen; output=artifacts/screen.png';
  const master='docs/mockups/approved.png@sha256:'+sha;
  const nvol=form('volume','technical','none');
  const ncpx=form('complex','technical','none');
  const qvol=form('volume','mixed','quality','DESIGN.md',vp,shot);
  const qtech=form('complex','technical','quality','DESIGN.md',vp,shot);
  const fcpx=form('complex','visual','fidelity',master,vp,shot);
  const fvol=form('volume','visual','fidelity',master,vp,shot);
  const avol=validateStandardVisualHandoff(nvol,root);
  assert.deepEqual(avol.reviewers,['atenea-review-standards','atenea-review-spec-volume']);
  assert.equal(avol.implementer,'atenea-implementer-volume');
  assert.equal(avol.corrector,'atenea-corrector-volume');
  assert.equal(avol.schema,'atenea.standard.visual-handoff/v1');
  const acpx=validateStandardVisualHandoff(ncpx,root);
  assert.equal(acpx.implementer,'atenea-implementer-complex');
  assert.deepEqual(acpx.reviewers,['atenea-review-standards','atenea-review-spec-complex']);
  for(const inp of [qvol,qtech]){
    const result=validateStandardVisualHandoff(inp,root);
    assert.equal(result.reviewers.length,3);
    assert.equal(result.reviewers[2],'atenea-review-visual-standard');
    assert.equal(result.ui_impact,'quality');
    assert.equal(result.max_fresh_corrections,2);
  }
  for(const [input,expected] of [[fcpx,'atenea-implementer-complex'],[fvol,'atenea-implementer-volume']]){
    const result=validateStandardVisualHandoff(input,root);
    assert.equal(result.implementer,expected);
    assert.equal(result.reviewers[2],'atenea-review-visual-standard');
    assert.equal(result.ui_impact,'fidelity');
    assert.equal(result.max_fresh_corrections,2);
    assert.equal(result.requires_visual_pixels,true);
  }
  let negative=0;
  const bad=(input,regex)=>{assert.throws(()=>validateStandardVisualHandoff(input,root),regex);negative++};
  bad(form('volume','technical','none','NONE','NONE','NONE','free_only'),/invalid Cost policy/);
  bad(form('volume','visual','none'),/requires UI impact/);
  bad(form('complex','mixed','none'),/requires UI impact/);
  bad(nvol.replace('Visual witness: NONE','Visual witness: screenshot.png'),/requires Visual witness: NONE/);
  bad(qvol.replace('DESIGN.md','NONE'),/requires Visual authority/);
  bad(qvol.replace('DESIGN.md','../outside'),/repo-local/);
  bad(qvol.replace('DESIGN.md','missing.md'),/not found/);
  bad(qvol.replace('viewport=1280x760','viewport=unknown'),/must name screen/);
  bad(qvol.replace('output=artifacts/screen.png','output=/tmp/wrong.png'),/relative PNG/);
  bad(fcpx.replace(sha,'0'.repeat(64)),/SHA mismatch/);
  bad(fcpx.replace('.png@sha256:', '.html@sha256:'),/not found/);
  bad(fcpx.replace(master,'DESIGN.md'),/must be pinned/);
  bad(fcpx.replace('UI impact: fidelity\n',''),/missing handoff field/);
  bad(qvol+'UI impact: quality\n',/duplicate/);
  bad(qvol.replace('Risk class: volume','Risk class: frontier'),/invalid Risk class/);
  bad(qvol.replace('Cost policy: standard','Cost policy: go'),/invalid Cost policy/);
  // Free must fail closed on accidentally ported Standard handoffs, despite shared parser.
  assert.throws(()=>validateFreeVisualHandoff(qvol,root),/invalid Cost policy/);
  console.log('ATENEA_STANDARD_VISUAL_HANDOFF_TEST=PASS (6 positive Standard routes, '+negative+' negative cases, 1 Free segregation case)');
} finally {
  fs.rmSync(root,{recursive:true,force:true});
}
