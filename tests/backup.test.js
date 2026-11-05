import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {answerSession,emptyData,newSession,validateBackup} from '../src/lib/session.js';
const words=JSON.parse(readFileSync(new URL('../src/data/words.json',import.meta.url),'utf8'));
const valid=new Set(words.map(w=>w.id));
const base=()=>answerSession(newSession(emptyData(),words.slice(0,2),'frequent'),'KNOWN',new Date('2026-11-05T01:00:00Z')).data;
const mut=(fn)=>{const x=JSON.parse(JSON.stringify(base()));fn(x);return JSON.stringify(x);};

test('backup preserves an interrupted quiz and validates dates/counts',()=>{
  const b=base(),value=validateBackup(JSON.stringify(b),valid);
  assert.deepEqual(value,b);
  for(const name of ['lastReviewedAt','nextReviewAt']){
    const json=mut(x=>{x.progress[words[0].id][name]='2026-42-99T01:00:00.000Z';});
    assert.throws(()=>validateBackup(json,valid),/손상|올바르지/);
  }
  assert.throws(()=>validateBackup(mut(x=>{x.progress[words[0].id].knownCount=9}),valid),/손상|올바르지/);
});
test('rejects duplicate, nonmember, malformed sessions',()=>{
  assert.throws(()=>validateBackup(mut(x=>{x.session.queue.push(x.session.queue[0])}),valid),/손상|올바르지/);
  assert.throws(()=>validateBackup(mut(x=>{x.session.originalIds.push('bogus')}),valid),/손상|올바르지/);
  assert.throws(()=>validateBackup(mut(x=>{x.session.known=0}),valid),/손상|올바르지/);
  assert.throws(()=>validateBackup(mut(x=>{x.session.day=31}),valid),/손상|올바르지/);
  assert.throws(()=>validateBackup(mut(x=>{x.session.answeredIds=[]}),valid),/손상|올바르지/);
});
test('rejects forged keys and malformed root records',()=>{
  assert.throws(()=>validateBackup(JSON.stringify({schemaVersion:1,target:20,progress:[],session:null}),valid),/유효하지/);
  assert.throws(()=>validateBackup(mut(x=>{x.progress.evil=x.progress[words[0].id]}),valid),/손상|올바르지/);
  assert.throws(()=>validateBackup(mut(x=>{x.progress[words[0].id].stage='NOT_REAL'}),valid),/손상|올바르지/);
});
test('new sessions reject mixed-day/mixed-deck source entries',()=>{
  assert.throws(()=>newSession(emptyData(),[words.find(w=>w.category==='score900')],'frequent'));
  assert.throws(()=>newSession(emptyData(),words.slice(0,2),'frequent',29));
  assert.ok(newSession(emptyData(),words.slice(0,2),'frequent',1).session);
});

test('restored session metadata must match the actual deck and DAY of every card',()=>{
 const byId=new Map(words.map(w=>[w.id,w]));
 assert.deepEqual(validateBackup(JSON.stringify(base()),valid,byId),base());
 assert.throws(()=>validateBackup(mut(x=>{x.session.category='score900';}),valid,byId),/단어장|DAY/);
 assert.throws(()=>validateBackup(mut(x=>{x.session.day=30;}),valid,byId),/단어장|DAY/);
});
