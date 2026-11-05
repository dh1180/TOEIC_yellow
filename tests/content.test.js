import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const words=load('../src/data/words.json'),manifest=load('../src/data/manifest.json');
const report=load('../data/content_audit.json');
const sourceCount={};
for(const w of words)for(const e of w.examples)sourceCount[e.source]=(sourceCount[e.source]||0)+1;

test('all imported words are present with stable identifiers and day classification',()=>{
 assert.equal(words.length,5101);
 assert.equal(new Set(words.map(w=>w.id)).size,5101);
 assert.equal(manifest.wordCount,5101);
 assert.ok(words.every(w=>Number.isInteger(w.day)&&w.day>=1&&w.day<=30));
 for(const [category,n] of Object.entries({frequent:1241,basic:837,score800:2033,score900:990}))
   assert.equal(words.filter(w=>w.category===category).length,n);
});
test('source examples are preserved, accents normalized, and provenance is explicit',()=>{
 assert.equal(sourceCount.provided,1481);
 assert.equal(sourceCount['editorial-draft'],manifest.editorialDrafts);
 assert.equal(sourceCount['provided-crosslink'],manifest.crosslinkedSourceExamples);
 assert.equal(sourceCount['draft-context'],manifest.generatedContextDrafts);
 assert.equal(sourceCount['study-prompt'],manifest.studyPromptsNotExamples);
 assert.ok(!sourceCount['generated-prompt']);
 assert.ok(!words.some(w=>w.examples.some(e=>/r\?sum\?|caf\?|�/.test(e.en))));
 assert.equal(words.filter(w=>w.examples[0].source==='provided').length,1238);
 assert.ok(words.every(w=>w.examples.length&&w.examples.every(e=>e.en.trim()&&e.ko.trim()&&e.source)));
});
test('non-reviewed generated examples never impersonate validated translations',()=>{
 for(const w of words)for(const e of w.examples){
  if(['draft-context','study-prompt'].includes(e.source)){
    assert.equal(e.translationStatus,'gloss-only');assert.ok(e.ko.startsWith('핵심 뜻:'));
  }
  if(e.source==='provided-crosslink')assert.ok(e.sourceWord);
 }
 assert.equal(report.pendingProfessionalReview,3863);
 assert.equal(report.meaningAndUsageFullyCertified,false);
});
test('financial officer abbreviation is corrected without changing Anki note identity',()=>{
 const w=words.find(w=>w.wordOriginal==='chief financial officer(CEO)');
 assert.ok(w);assert.equal(w.word,'chief financial officer (CFO)');
 assert.equal(w.examples[0].source,'editorial-draft');
});
