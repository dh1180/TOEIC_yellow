import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const words=JSON.parse(readFileSync(new URL('../src/data/words.json',import.meta.url),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('../src/data/manifest.json',import.meta.url),'utf8'));

test('all 5,101 words retain their original identity and have examples',()=>{
  assert.equal(words.length,5101);
  assert.equal(new Set(words.map(w=>w.id)).size,5101);
  assert.ok(words.every(w=>/^[0-9]+$/.test(w.id)&&w.day>=1&&w.day<=30&&w.word?.trim()&&w.meaningKo?.trim()&&w.examples.length));
  assert.deepEqual(Object.fromEntries(['frequent','basic','score800','score900'].map(c=>[c,words.filter(w=>w.category===c).length])),{frequent:1241,basic:837,score800:2033,score900:990});
});
test('provided and self-authored examples preserve explicit provenance',()=>{
  const examples=words.flatMap(w=>w.examples);
  assert.equal(examples.length,1481+3863);
  assert.equal(examples.filter(e=>e.source==='provided').length,1481);
  assert.equal(examples.filter(e=>e.source==='project-authored').length,manifest.projectReviewedExamples);
  assert.equal(examples.filter(e=>e.source==='generated-context').length,manifest.generatedContextExamples);
  assert.equal(examples.filter(e=>e.source==='editorial-draft').length,manifest.editorialDraftExamples);
  assert.equal(examples.filter(e=>e.source==='provided-crosslink').length,manifest.providedCrosslinkedExamples);
  assert.equal(examples.filter(e=>e.source==='generated-prompt').length,0);
  assert.ok(examples.every(e=>typeof e.en==='string'&&e.en.length>15&&typeof e.ko==='string'&&e.ko.length>3));
});
test('unreviewed generated contexts are never labeled as certified translations',()=>{
  assert.ok(words.flatMap(w=>w.examples).filter(e=>e.source==='generated-context').every(e=>e.reviewStatus==='needs-review'&&e.ko.startsWith('핵심 뜻:')));
  assert.ok(words.flatMap(w=>w.examples).filter(e=>e.source==='provided').every(e=>e.reviewStatus==='provided-unverified'));
  assert.ok(words.flatMap(w=>w.examples).filter(e=>e.source==='editorial-draft').every(e=>e.reviewStatus==='editorial-draft'));
  assert.ok(words.flatMap(w=>w.examples).filter(e=>e.source==='provided-crosslink').every(e=>e.reviewStatus==='crosslink-needs-sense-review'));
  assert.equal(manifest.independentlyVerifiedExamples,0);
  assert.equal(words.flatMap(w=>w.examples).filter(e=>/r\?sum\?|caf\?/.test(e.en)).length,0);
});
