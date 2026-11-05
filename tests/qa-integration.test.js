import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sessionVisibleIndex,sessionCompleted,emptyData,newSession,answerSession} from '../src/lib/session.js';
const root=new URL('../',import.meta.url);
const data=JSON.parse(readFileSync(new URL('src/data/words.json',root),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('src/data/manifest.json',root),'utf8'));
const overrides=JSON.parse(readFileSync(new URL('data/qa-editorial-overrides.json',root),'utf8'));
const counts=Object.fromEntries(['provided','project-authored','editorial-draft','provided-crosslink','generated-context'].map(src=>[src,data.flatMap(w=>w.examples).filter(e=>e.source===src).length]));
test('combines PR2 and QA edits without dropping any Anki examples or note IDs',()=>{
  assert.equal(data.length,5101);
  assert.equal(new Set(data.map(w=>w.id)).size,5101);
  assert.equal(counts.provided,1481);
  assert.equal(counts['project-authored'],391);
  assert.equal(counts['editorial-draft'],315);
  assert.equal(counts['provided-crosslink'],328);
  assert.equal(counts['generated-context'],2829);
  assert.equal(Object.keys(overrides).length,643);
  assert.ok(data.every(w=>w.examples.length>=1));
});
test('no independent or licensed status is claimed for authored and crosslinked candidates',()=>{
  assert.equal(manifest.independentlyVerifiedExamples,0);
  assert.ok(data.flatMap(w=>w.examples).filter(e=>e.source==='editorial-draft').every(e=>e.reviewStatus==='editorial-draft'));
  assert.ok(data.flatMap(w=>w.examples).filter(e=>e.source==='provided-crosslink').every(e=>e.reviewStatus==='crosslink-needs-sense-review'));
  assert.ok(data.flatMap(w=>w.examples).filter(e=>e.source==='generated-context').every(e=>e.reviewStatus==='needs-review' && e.ko.startsWith('핵심 뜻:')));
});
test('abbreviation corrections retain original headwords and unchanged note IDs',()=>{
  const cfo=data.find(w=>w.id==='1766527461470');
  assert.equal(cfo.word,'chief financial officer (CFO)');
  assert.equal(cfo.wordOriginal,'chief financial officer(CEO)');
  const ceo=data.find(w=>w.id==='1766527458672');
  assert.equal(ceo.word,'CEO (chief executive officer)');
  assert.equal(ceo.wordOriginal,'CEO(chief executive officer)');
});
test('retry session UI index follows unique answered cards and not response attempts',()=>{
  const w=data.slice(0,3);let d=newSession(emptyData(),w,'frequent');
  assert.equal(sessionVisibleIndex(d.session),1);
  d=answerSession(d,'RELEARN').data;
  assert.equal(sessionVisibleIndex(d.session),2);
  assert.equal(sessionCompleted(d.session),1);
  d=answerSession(d,'KNOWN').data;
  d=answerSession(d,'KNOWN').data;
  assert.equal(sessionVisibleIndex(d.session),3); // retry reappears; all three unique cards have already been seen
  assert.equal(sessionCompleted(d.session),3);
});
