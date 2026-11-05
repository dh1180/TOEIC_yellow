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
  assert.equal(counts['editorial-draft'],416);
  assert.equal(counts['provided-crosslink'],328);
  assert.equal(counts['generated-context'],2728);
  assert.equal(Object.keys(overrides).length,744);
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

test('suspect idioms and specialist toxication meaning are corrected with source identity retained',()=>{
  const expected=new Map([
    ['1766527461936','in the distant past'],
    ['1766527462263','settle down to work'],
    ['1766527462290','make an outside call'],
    ['1766527461879','until the first of next month'],
    ['1766527462256','arrange items on the shelf']
  ]);
  for(const [id,correct] of expected){
    const w=data.find(w=>w.id===id);
    assert.equal(w.word,correct);
    assert.notEqual(w.wordOriginal,w.word);
  }
  const rare=data.find(w=>w.id==='1766527463149');
  assert.equal(rare.word,'toxication');
  assert.ok(rare.meaningKo.includes('독성화'));
  assert.ok(rare.examples[0].en.includes('toxication'));
  assert.equal(rare.meaningKoOriginal,'중독');
});

test('batch 01 example corrections preserve target phrases, full translations and source provenance',()=>{
  const touched=["1766527458121","1766527458123","1766527458124","1766527458126","1766527458127","1766527458128","1766527458129","1766527458130","1766527458132","1766527458134","1766527458135","1766527458136","1766527458137","1766527458138","1766527458141","1766527458143","1766527458144","1766527458146","1766527458148","1766527458189","1766527458191","1766527458192","1766527458193","1766527458196","1766527458198","1766527458199","1766527458200","1766527458201","1766527458208","1766527458209","1766527458210","1766527458212","1766527458213","1766527458214","1766527458215","1766527458258","1766527458259","1766527458260","1766527458261","1766527458262","1766527458265","1766527458269","1766527458270","1766527458271","1766527458273","1766527458275","1766527458276","1766527458282","1766527458329","1766527458331","1766527458332","1766527458333","1766527458334","1766527458337","1766527458338","1766527458339","1766527458340","1766527458343","1766527458344","1766527458345","1766527458346","1766527458347","1766527458348","1766527458352","1766527458353","1766527458355","1766527458398","1766527458399","1766527458402","1766527458403","1766527458404","1766527458405","1766527458407","1766527458408","1766527458409","1766527458410","1766527458411","1766527458413","1766527458416","1766527458418","1766527458419","1766527458420","1766527458422","1766527458423","1766527458424","1766527458467","1766527458468","1766527458469","1766527458470","1766527458471","1766527458472","1766527458475","1766527458478","1766527458479","1766527458480","1766527458484","1766527458485","1766527458488","1766527458489","1766527458491","1766527458492"];
  assert.equal(touched.length,101);
  for(const id of touched){
    const w=data.find(w=>w.id===id);
    assert.ok(w);
    assert.equal(w.examples[0].source,'editorial-draft');
    assert.equal(w.examples[0].reviewStatus,'editorial-draft');
    assert.ok(!w.examples[0].ko.startsWith('핵심 뜻:'));
    assert.ok(w.examples[0].en.toLowerCase().includes(w.word.toLowerCase()));
  }
  const sourceMove=data.find(w=>w.id==='1766527459131');
  assert.ok(sourceMove.examples.some(e=>e.en.includes('a move overseas')&&e.enOriginal?.includes('to overseas')));
  for(const id of ['1766527458122','1766527460344']){
    const e=data.find(w=>w.id===id).examples[0];
    assert.ok(e.en.includes('a move overseas'));
    assert.equal(e.source,'provided-crosslink');
  }
});
