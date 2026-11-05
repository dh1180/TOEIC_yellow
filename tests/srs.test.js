import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAnswer,transition,isDue} from '../src/lib/srs.js';
import {emptyData,newSession,answerSession,selectQueue,validateBackup,categoryStats,sessionCompleted,sessionVisibleIndex} from '../src/lib/session.js';
import {readFileSync} from 'node:fs';
const words=JSON.parse(readFileSync(new URL('../src/data/words.json',import.meta.url),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('../src/data/manifest.json',import.meta.url),'utf8'));
const ids=new Set(words.map(w=>w.id));

test('imports all Anki notes and preserves unique card IDs',()=>{
 assert.equal(words.length,5101);assert.equal(ids.size,5101);assert.equal(manifest.exampleCardCount,1481);
 assert.equal(manifest.providedExampleWords+manifest.authoredPromptWords,5101);
 assert.equal(words.reduce((n,w)=>n+w.examples.filter(e=>e.source==='provided').length,0),1481);
 assert.ok(words.every(w=>w.day>=1&&w.day<=30&&w.word.trim()&&w.meaningKo.trim()&&w.examples.length>0));
 const cats=Object.groupBy(words,w=>w.category);assert.equal(cats.frequent.length,1241);assert.equal(cats.basic.length,837);assert.equal(cats.score800.length,2033);assert.equal(cats.score900.length,990);
});
test('review policy matches HSK Plus Ultra stages',()=>{
 assert.equal(transition('NEW','KNOWN'),'LONG_TERM');assert.equal(transition('NEW','RELEARN'),'DAY_3');
 assert.equal(transition('MIN_30','KNOWN'),'DAY_3');assert.equal(transition('DAY_3','KNOWN'),'DAY_7');
 assert.equal(transition('DAY_7','KNOWN'),'DAY_21');assert.equal(transition('DAY_21','KNOWN'),'LONG_TERM');
 assert.equal(transition('LONG_TERM','RELEARN'),'DAY_7');assert.equal(transition('DAY_3','RELEARN'),'MIN_30');
});
test('due time and reappearance after 30min',()=>{
 const now=new Date('2026-11-05T01:00:00.000Z');const p=applyAnswer({stage:'DAY_3',nextReviewAt:null,lastReviewedAt:now.toISOString(),seenCount:1,knownCount:0,relearnCount:1},'RELEARN',now);
 assert.equal(p.stage,'MIN_30');assert.equal(p.nextReviewAt,'2026-11-05T01:30:00.000Z');assert.equal(isDue(p,now),false);assert.equal(isDue(p,new Date('2026-11-05T01:30:00Z')),true);
});
test('retry known does not promote again and relearner is requeued',()=>{
 const ws=words.slice(0,2);let d=newSession(emptyData(),ws,'frequent');
 let one=answerSession(d,'RELEARN',new Date('2026-11-05T01:00:00Z'));d=one.data;
 assert.deepEqual(d.session.queue,[ws[1].id,ws[0].id]);assert.equal(d.progress[ws[0].id].stage,'DAY_3');
 d=answerSession(d,'KNOWN',new Date('2026-11-05T01:01:00Z')).data;
 one=answerSession(d,'KNOWN',new Date('2026-11-05T01:02:00Z'));
 assert.equal(one.data.session,null);assert.equal(one.data.progress[ws[0].id].stage,'DAY_3');assert.equal(one.result.total,2);assert.equal(one.result.known,2);assert.equal(one.result.relearn,1);
});
test('queue prefers overdue reviews then new words',()=>{
 const now=new Date('2026-11-05T01:00:00Z');const p={...emptyData().progress};p[words[2].id]={stage:'DAY_3',nextReviewAt:'2026-11-04T01:00:00Z',lastReviewedAt:'2026-11-01T01:00:00Z',seenCount:1,knownCount:1,relearnCount:0};
 assert.equal(selectQueue(words.slice(0,25),p,10,now)[0].id,words[2].id);assert.equal(selectQueue(words.slice(0,25),p,10,now).length,10);
 assert.equal(categoryStats(words.slice(0,25),p,now).due,1);
});
test('backup reject corrupted keys and retain session',()=>{
 const w=words[0];const d=answerSession(newSession(emptyData(),words.slice(0,2),'frequent'),'KNOWN').data;
 const imported=validateBackup(JSON.stringify({app:'TOEIC Yellow',data:d}),ids);assert.deepEqual(imported,d);
 assert.throws(()=>validateBackup(JSON.stringify({schemaVersion:1,target:20,progress:{'__proto__.bad':{stage:'NEW'}},session:null}),ids));
 assert.throws(()=>validateBackup(JSON.stringify({app:'Other App',data:d}),ids));
});

test('review progress remains within bounds after requeue and resume',()=>{
 const ws=words.slice(0,3);let d=newSession(emptyData(),ws,'frequent');
 assert.equal(sessionVisibleIndex(d.session),1);
 d=answerSession(d,'RELEARN').data;
 assert.equal(sessionCompleted(d.session),1);
 assert.equal(sessionVisibleIndex(d.session),2);
 d=answerSession(d,'KNOWN').data;d=answerSession(d,'KNOWN').data;
 assert.equal(sessionCompleted(d.session),3);
 assert.equal(sessionVisibleIndex(d.session),3);
 assert.equal(d.session.queue[0],ws[0].id);
});
test('corrupt backup with invalid dates, counts, duplicate IDs, and missing originals is rejected',()=>{
 let d=answerSession(newSession(emptyData(),words.slice(0,2),'frequent'),'RELEARN').data;
 const altered=()=>structuredClone(d);
 let broken=altered();broken.progress[words[0].id].lastReviewedAt='not-a-date';
 assert.throws(()=>validateBackup(JSON.stringify(broken),ids));
 broken=altered();broken.progress[words[0].id].seenCount=100;
 assert.throws(()=>validateBackup(JSON.stringify(broken),ids));
 broken=altered();broken.session.queue.push(words[0].id);
 assert.throws(()=>validateBackup(JSON.stringify(broken),ids));
 broken=altered();broken.session.answeredIds=[];
 assert.throws(()=>validateBackup(JSON.stringify(broken),ids));
});
test('new session rejects another category and day, but allows matching words',()=>{
 assert.throws(()=>newSession(emptyData(),words.slice(0,2),'score900'));
 assert.throws(()=>newSession(emptyData(),words.slice(0,2),'frequent',30));
 assert.equal(newSession(emptyData(),words.slice(0,2),'frequent',1).session.queue.length,2);
});
