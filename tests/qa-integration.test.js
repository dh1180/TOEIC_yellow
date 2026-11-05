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
  assert.equal(counts['editorial-draft'],1400);
  assert.equal(counts['provided-crosslink'],296);
  assert.equal(counts['generated-context'],1776);
  assert.equal(Object.keys(overrides).length,1696);
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


test('batch 02 DAY 1-3 candidates have linked bilingual contexts with explicit draft status',()=>{
  const text=['qa-batch-02-drafts.psv','qa-batch-02-day3.psv']
    .map(file=>readFileSync(new URL('data/'+file,root),'utf8').trim().split(/\r?\n/).slice(1))
    .flat();
  assert.equal(text.length,229);
  const unique=new Set();
  for(const line of text){
    const [original,en,ko]=line.trim().split('|');
    assert.ok(original&&en&&ko);
    const selected=data.filter(w=>w.examples[0].source==='editorial-draft' &&
      (w.wordOriginal===original || w.word===original) && w.examples[0].method==='ai-authored-contextual-qa-batch02');
    assert.equal(selected.length,1,'Unique entry for '+original);
    const w=selected[0], e=w.examples[0];
    assert.ok(!unique.has(w.id)); unique.add(w.id);
    assert.equal(e.en,en); assert.equal(e.ko,ko);
    assert.equal(e.reviewStatus,'editorial-draft');
    assert.ok(!e.ko.startsWith('핵심 뜻:'));
    assert.ok(en.toLowerCase().includes(w.word.toLowerCase()) ||
      ['send off to','in a strict way(=strictly)'].includes(w.word));
  }
  assert.equal(unique.size,229);
  const idiom=data.find(w=>w.word==='put forward');
  assert.equal(idiom.meaningKoOriginal,'앞당기다');
  assert.ok(idiom.meaningKo.includes('제안하다'));
  for(const spelling of ['dressed in a suit','full-time work']){
    const w=data.find(w=>w.word===spelling);
    assert.ok(w.wordOriginal&&w.wordOriginal!==w.word);
  }
  assert.equal(manifest.independentlyVerifiedExamples,0);
});


test('batch 02 nuanced full-time employment and qualification senses are preserved',()=>{
  const meanings=new Map([
    ['full-time work','전일제 근무, 상근 일자리'],
    ['overqualified','해당 직무에 필요한 수준보다 자격·경력이 높은'],
    ['send a notification','통지하다, 알림을 보내다'],
    ['default','채무불이행; 의무 불이행']
  ]);
  for(const [word,meaning] of meanings){
    const w=data.find(w=>w.word===word);
    assert.equal(w.meaningKo,meaning);
    assert.ok(w.meaningKoOriginal&&w.meaningKoOriginal!==meaning);
  }
  const fullTime=data.find(w=>w.word==='full-time work');
  assert.ok(fullTime.examples[0].ko.includes('전일제'));
  const lag=data.find(w=>w.word==='lag');
  assert.ok(lag.examples[0].en.includes('lags behind'));
});

test('batch 03 preserves 39 new bilingual usage examples, meanings and their provenance',()=>{
 const rows=readFileSync(new URL('data/qa-batch-03-drafts.psv',root),'utf8').trim().split(/\r?\n/).slice(1);
 assert.equal(rows.length,39);
 for(const line of rows){
   const [id,en,ko]=line.split('|'),w=data.find(w=>w.id===id);
   assert.ok(w,'Unknown card '+id);
   assert.equal(w.examples[0].en,en);
   assert.equal(w.examples[0].ko,ko);
   assert.equal(w.examples[0].source,'editorial-draft');
   assert.equal(w.examples[0].reviewStatus,'editorial-draft');
   assert.equal(w.examples[0].method,'ai-authored-contextual-qa-batch03');
   assert.deepEqual(overrides[id].examples,[w.examples[0]]);
   assert.ok(!ko.startsWith('핵심 뜻:'),'Incomplete translation '+id);
 }
 const p=data.find(w=>w.id==='1766527461412');
 assert.equal(p.word,'profitable');assert.equal(p.wordOriginal,'profitable(<->unprofitable)');
 for(const [id,meaning] of Object.entries({
   '1766527461452':'요금을 청구하다; ~에 대한 요금',
   '1766527461438':'하나씩, 부분별로; 조금씩',
   '1766527461439':'비율, 부분, 몫',
   '1766527461445':'~까지; 최대'
 })){
   const w=data.find(w=>w.id===id);
   assert.equal(w.meaningKo,meaning);assert.ok(w.meaningKoOriginal);
 }
});

test('batch 04 replaces all 132 early-day high-risk templates without changing note identities',()=>{
 const rows=readFileSync(new URL('data/qa-batch-04-drafts.psv',root),'utf8').trim().split(/\r?\n/).slice(1);
 assert.equal(rows.length,132);
 const foundIds=new Set();
 const buckets={};
 for(const line of rows){
   const cells=line.split('|');
   assert.equal(cells.length,3,'Invalid batch-04 PSV record');
   const [id,en,ko]=cells;
   assert.ok(!foundIds.has(id),'Duplicate card '+id);foundIds.add(id);
   const word=data.find(w=>w.id===id);
   assert.ok(word,'Missing card '+id);
   assert.equal(word.examples.length,1);
   const e=word.examples[0];
   assert.equal(e.en,en);assert.equal(e.ko,ko);
   assert.equal(e.source,'editorial-draft');
   assert.equal(e.reviewStatus,'editorial-draft');
   assert.equal(e.method,'ai-authored-contextual-qa-batch04');
   assert.deepEqual(overrides[id].examples,[e]);
   assert.equal(overrides[id].word,word.word);
   assert.ok(/[.?!]$/.test(en),'English sentence missing punctuation for '+id);
   assert.ok(/[.?!]$/.test(ko),'Korean sentence missing punctuation for '+id);
   assert.ok(!ko.startsWith('핵심 뜻:'),'Missing full Korean translation for '+id);
   const key=word.category+'/'+word.day;buckets[key]=(buckets[key]||0)+1;
 }
 assert.deepEqual(buckets,{
   'basic/6':1,'basic/7':16,'basic/8':22,'basic/9':18,'basic/10':16,
   'score800/4':39,'score900/4':20
 });
 assert.ok(!data.some(w=>w.examples[0].source==='generated-context'&&(
   (w.category==='basic'&&w.day>=6&&w.day<=10)||
   ((w.category==='score800'||w.category==='score900')&&w.day===4)
 )));
 assert.equal(data.flatMap(w=>w.examples).filter(e=>e.source==='provided').length,1481);
 assert.equal(manifest.independentlyVerifiedExamples,0);
});
test('batch 04 corrected headwords and Korean senses retain the original Anki values',()=>{
 const heads={
   '1766527460427':['seamless','seamless(=without trouble)'],
   '1766527462312':['ambiance','ambiance(=ambience)']
 };
 for(const [id,[current,original]] of Object.entries(heads)){
   const w=data.find(w=>w.id===id);
   assert.equal(w.word,current);assert.equal(w.wordOriginal,original);
 }
 const senses={
   '1766527458544':'배열, 다양한 종류; 진열',
   '1766527458611':'사용 중인, 쓰이고 있는',
   '1766527458618':'~에 속하다, ~의 소유이다',
   '1766527458762':'식료품점, 식료품의',
   '1766527460379':'쓰레기; 쓰레기를 함부로 버리다',
   '1766527460416':'~으로 채우다; ~으로 가득 차다',
   '1766527460419':'성공의 열쇠, 성공의 핵심 요소',
   '1766527460425':'재회, 동창회, 친목 모임',
   '1766527460427':'끊김 없이 매끄러운, 원활한',
   '1766527462299':'지침, 지시; 지시하는'
 };
 for(const [id,meaning] of Object.entries(senses)){
   const w=data.find(w=>w.id===id);
   assert.equal(w.meaningKo,meaning);
   assert.ok(w.meaningKoOriginal!==meaning);
 }
});

test('batch 05: 69 bilingual examples, correct IDs and original correction trail',()=>{
 const rows=readFileSync(new URL('data/qa-batch-05-drafts.psv',root),'utf8').trim().split(/\r?\n/).slice(1);
 assert.equal(rows.length,69);
 const ids=new Set();
 for(const line of rows){
  const [id,en,ko,...extra]=line.split('|');assert.equal(extra.length,0);
  assert.ok(!ids.has(id));ids.add(id);
  const w=data.find(w=>w.id===id);assert.ok(w,id);
  const e=w.examples[0];
  assert.equal(e.en,en);assert.equal(e.ko,ko);
  assert.equal(e.source,'editorial-draft');
  assert.equal(e.reviewStatus,'editorial-draft');
  assert.equal(e.method,'ai-authored-contextual-qa-batch05');
  assert.deepEqual(overrides[id].examples,[e]);assert.equal(overrides[id].word,w.word);
  assert.ok(/[.!?]$/.test(en));assert.ok(/[.!?]$/.test(ko));
  assert.ok(!ko.startsWith('핵심 뜻:'));
 }
 for(const [id,current,original] of [
  ['1766527458821','turn off','turn off(↔turn on)'],
  ['1766527460440','fold in half','flod in half'],
  ['1766527462326','reach a solution','reach the solution']
 ]){const w=data.find(w=>w.id===id);assert.equal(w.word,current);assert.equal(w.wordOriginal,original);}
 for(const [id,meaning] of Object.entries({
  '1766527458811':'완전히 새로운, 새것인',
  '1766527460435':'이사회 회의',
  '1766527460466':'교대 근무, 근무 시간대',
  '1766527462323':'~에게 양보하다; ~로 대체되다',
  '1766527462345':'수습 기간 중인; 보호 관찰 중인'
 })){const w=data.find(w=>w.id===id);assert.equal(w.meaningKo,meaning);assert.ok(w.meaningKoOriginal);}
 assert.equal(manifest.independentlyVerifiedExamples,0);
});

test('batch 06: 32 reused-source semantic mismatches are replaced, and original source evidence is retained',()=>{
 const records=JSON.parse(readFileSync(new URL('data/qa-batch-06-crosslink-review.json',root),'utf8'));
 assert.equal(records.length,32);
 const originalPairs=new Set(data.flatMap(w=>w.examples.filter(e=>e.source==='provided').map(e=>JSON.stringify([e.en,e.ko]))));
 const ids=new Set();
 for(const r of records){
  assert.ok(!ids.has(r.id));ids.add(r.id);
  assert.ok(['sense','part-of-speech','homograph'].includes(r.issue));
  const w=data.find(w=>w.id===r.id);
  assert.ok(w,'No vocab note for '+r.id);
  assert.equal(w.word,r.word);
  const e=w.examples[0];
  assert.equal(e.source,'editorial-draft');
  assert.equal(e.reviewStatus,'editorial-draft');
  assert.equal(e.method,'ai-authored-contextual-qa-batch06-crosslink');
  assert.equal(e.en,r.replacement.en);
  assert.equal(e.ko,r.replacement.ko);
  assert.deepEqual(overrides[r.id].examples,[e]);
  assert.deepEqual(overrides[r.id].replacedCrosslink,r.priorCrosslink);
  assert.ok(originalPairs.has(JSON.stringify([r.priorCrosslink.en,r.priorCrosslink.ko])),'Original provenance must remain resolvable '+r.id);
 }
 for(const w of data.filter(w=>w.examples[0].source==='provided-crosslink')){
  const e=w.examples[0];
  assert.ok(originalPairs.has(JSON.stringify([e.en,e.ko])),'Unresolved source link: '+w.id);
 }
 for(const [id,sense] of Object.entries({
  '1766527460864':'설계된, 계획된; 의도적인',
  '1766527462803':'추정된, 예상된; 견적상의'
 })){const w=data.find(w=>w.id===id);assert.equal(w.meaningKo,sense);assert.ok(w.meaningKoOriginal);}
 assert.equal(manifest.providedCrosslinkedExamples,296);
 assert.equal(manifest.independentlyVerifiedExamples,0);
});

test('batch 07: all 53 example rewrites are complete bilingual contexts and preserve PR13 crosslink fixes',()=>{
 const records=readFileSync(new URL('data/qa-batch-07-drafts.psv',root),'utf8').trim().split(/\r?\n/).slice(1);
 assert.equal(records.length,53);
 const ids=new Set();const byDay={};
 for(const record of records){
  const [id,en,ko,...extra]=record.split('|');assert.equal(extra.length,0);
  assert.ok(!ids.has(id));ids.add(id);
  const w=data.find(w=>w.id===id);assert.ok(w,id);
  const e=w.examples[0];
  assert.equal(e.en,en);assert.equal(e.ko,ko);assert.equal(e.source,'editorial-draft');
  assert.equal(e.reviewStatus,'editorial-draft');assert.equal(e.method,'ai-authored-contextual-qa-batch07');
  assert.deepEqual(overrides[id].examples,[e]);assert.equal(overrides[id].word,w.word);
  assert.ok(/[.!?]$/.test(en));assert.ok(/[.!?]$/.test(ko));assert.ok(!ko.startsWith('핵심 뜻:'));
  const key=w.category+'/'+w.day;byDay[key]=(byDay[key]||0)+1;
 }
 assert.deepEqual(byDay,{'basic/12':16,'basic/13':14,'score900/6':23});
 for(const w of data.filter(w=>w.category==='basic'&&[12,13].includes(w.day)||w.category==='score900'&&w.day===6))
  assert.notEqual(w.examples[0].source,'generated-context','Leftover unreviewed template '+w.id);
 const publishing=data.find(w=>w.id==='1766527458892');
 assert.equal(publishing.word,'publishing company');
 assert.equal(publishing.wordOriginal,'publication company');
 for(const [id,meaning] of Object.entries({
  '1766527458880':'의류 제품군, 의류 컬렉션',
  '1766527458886':'철; 다림질하다',
  '1766527458959':'제품 로고',
  '1766527462356':'계속 시청·청취하다; 후속 소식을 기다리다',
  '1766527462363':'소풍, 짧은 여행, 견학'
 })){const w=data.find(w=>w.id===id);assert.equal(w.meaningKo,meaning);assert.ok(w.meaningKoOriginal);}
 assert.equal(Object.values(overrides).filter(r=>r.replacedCrosslink).length,32);
 assert.equal(manifest.providedCrosslinkedExamples,296);
 assert.equal(manifest.independentlyVerifiedExamples,0);
});

test('crosslinked source examples preserve an exact provided-source origin and headword token',()=>{
 const originals=data.flatMap(w=>w.examples.filter(e=>e.source==='provided').map(e=>({
  word:w.word,en:e.en,ko:e.ko
 })));
 const sourceKeys=new Set(originals.map(e=>JSON.stringify([e.word,e.en,e.ko])));
 const cross=data.filter(w=>w.examples[0].source==='provided-crosslink');
 assert.equal(cross.length,296);
 const norm=v=>v.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 for(const w of cross){
  const e=w.examples[0];
  assert.ok(sourceKeys.has(JSON.stringify([e.sourceWord,e.en,e.ko])),'Source mismatch '+w.id);
  assert.ok((' '+norm(e.en)+' ').includes(' '+norm(w.word)+' '),'Target absent from sentence '+w.id);
  assert.equal(e.reviewStatus,'crosslink-needs-sense-review');
 }
});
test('batch 08 preserves 16 source crosslinks and corrects their Korean glosses without rewriting original sentences',()=>{
 const list=JSON.parse(readFileSync(new URL('data/qa-batch-08-crosslink-senses.json',root),'utf8'));
 assert.equal(list.length,16);
 const seen=new Set();
 for(const correction of list){
  assert.ok(!seen.has(correction.id));seen.add(correction.id);
  const w=data.find(w=>w.id===correction.id);
  assert.ok(w);
  assert.equal(w.meaningKo,correction.meaningKo);
  assert.equal(w.meaningKoOriginal,correction.originalMeaningKo);
  assert.equal(w.examples[0].source,'provided-crosslink');
  assert.equal(w.examples[0].sourceWord,correction.sourceWord);
  assert.equal(w.examples[0].en,correction.linkedExampleEn);
  assert.equal(w.examples[0].ko,correction.linkedExampleKo);
  assert.equal(correction.humanReviewed,false);
 }
 assert.equal(manifest.independentlyVerifiedExamples,0);
});

test('batch 09 replaces the remaining basic DAY 14 templates with bilingual drafts', () => {
  const day = data.filter(word => word.category === 'basic' && word.day === 14);
  assert.ok(day.every(word => word.examples[0].source !== 'generated-context'));
  const edited = data.filter(word => word.examples[0].method === 'ai-authored-contextual-qa-batch09');
  assert.equal(edited.length, 17);
  for (const word of edited) {
    assert.ok(day.includes(word), word.id);
    assert.deepEqual(word.examples, overrides[word.id].examples);
    const example = word.examples[0];
    assert.equal(example.source, 'editorial-draft');
    assert.match(example.en, /[.!?]$/);
    assert.match(example.ko, /[.!?]$/);
    assert.doesNotMatch(example.ko, /^핵심 뜻:/);
  }
});

test('batch 10 replaces the remaining basic DAY 15 and 16 templates', () => {
  for (const day of [15, 16]) {
    const words = data.filter(word => word.category === 'basic' && word.day === day);
    assert.ok(words.every(word => word.examples[0].source !== 'generated-context'));
    const edited = words.filter(word => word.examples[0].method === 'ai-authored-contextual-qa-batch10');
    assert.equal(edited.length, 16);
    for (const word of edited) {
      assert.deepEqual(word.examples, overrides[word.id].examples);
      assert.equal(word.examples[0].source, 'editorial-draft');
      assert.match(word.examples[0].ko, /[가-힣].*[.!?]$/u);
    }
  }
});

test('batch 11 replaces the remaining basic DAY 17 and 18 templates', () => {
  for (const [day, expected] of [[17, 20], [18, 22]]) {
    const words = data.filter(word => word.category === 'basic' && word.day === day);
    assert.ok(words.every(word => word.examples[0].source !== 'generated-context'));
    const edited = words.filter(word => word.examples[0].method === 'ai-authored-contextual-qa-batch11');
    assert.equal(edited.length, expected);
    for (const word of edited) {
      assert.deepEqual(word.examples, overrides[word.id].examples);
      assert.match(word.examples[0].ko, /[가-힣].*[.!?]$/u);
    }
  }
});

test('batch 12 replaces the remaining basic DAY 19 and 20 templates', () => {
  for (const [day, expected] of [[19, 18], [20, 19]]) {
    const words = data.filter(word => word.category === 'basic' && word.day === day);
    assert.ok(words.every(word => word.examples[0].source !== 'generated-context'));
    const edited = words.filter(word => word.examples[0].method === 'ai-authored-contextual-qa-batch12');
    assert.equal(edited.length, expected);
    for (const word of edited) {
      assert.deepEqual(word.examples, overrides[word.id].examples);
      assert.match(word.examples[0].ko, /[가-힣].*[.!?]$/u);
    }
  }
  const theme = data.find(word => word.id === '1766527459462');
  assert.equal(theme.meaningKo, '주제, 테마');
  assert.equal(theme.meaningKoOriginal, '주체, 테마');
});

test('batch 13 removes the remaining generated templates from the basic deck', () => {
  const basic = data.filter(word => word.category === 'basic');
  assert.equal(basic.length, 837);
  assert.ok(basic.every(word => word.examples[0].source !== 'generated-context'));
  const edited = data.filter(word => word.examples[0].method === 'ai-authored-contextual-qa-batch13');
  assert.equal(edited.length, 193);
  assert.deepEqual([...new Set(edited.map(word => word.day))], [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
  for (const word of edited) {
    assert.equal(word.category, 'basic');
    assert.equal(word.examples[0].source, 'editorial-draft');
    assert.deepEqual(word.examples, overrides[word.id].examples);
    assert.match(word.examples[0].ko, /[가-힣].*[.!?]$/u);
  }
});

test('batch 14 removes the remaining 800-score DAY 6 and 7 templates', () => {
  for (const [day, expected] of [[6, 51], [7, 58]]) {
    const words = data.filter(word => word.category === 'score800' && word.day === day);
    assert.ok(words.every(word => word.examples[0].source !== 'generated-context'));
    const edited = words.filter(word => word.examples[0].method === 'ai-authored-contextual-qa-batch14');
    assert.equal(edited.length, expected);
    for (const word of edited) {
      assert.equal(word.examples[0].source, 'editorial-draft');
      assert.deepEqual(word.examples, overrides[word.id].examples);
      assert.match(word.examples[0].ko, /[가-힣].*[.!?]$/u);
    }
  }
  const internet = data.find(word => word.id === '1766527460582');
  assert.equal(internet.word, 'over the Internet');
  assert.equal(internet.wordOriginal, 'over the lnternet');
});
