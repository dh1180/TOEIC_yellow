import { applyAnswer,isDue } from './srs.js';
export const CATEGORIES=['frequent','basic','score800','score900'];
export const CATEGORY_LABELS={frequent:'빈출단어',basic:'토익 기초단어',score800:'800점 어휘',score900:'900점 어휘'};
const STAGES=new Set(['NEW','MIN_30','DAY_3','DAY_7','DAY_21','LONG_TERM']);
const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const nonNegInt=x=>Number.isSafeInteger(x)&&x>=0;
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x)&&!Number.isNaN(Date.parse(x))&&new Date(x).toISOString()===x;
const uniqueIds=(arr,validIds,maximum)=>Array.isArray(arr)&&arr.length<=maximum&&arr.every(id=>typeof id==='string'&&validIds.has(id))&&new Set(arr).size===arr.length;
export function emptyData(){return {schemaVersion:1,target:20,progress:{},session:null};}
export function selectQueue(words,progress,target,now=new Date()){
  if(![10,20,30].includes(target))throw Error('Invalid daily target');
  const due=words.filter(w=>isDue(progress[w.id],now)).sort((a,b)=>progress[a.id].nextReviewAt.localeCompare(progress[b.id].nextReviewAt));
  const fresh=words.filter(w=>!progress[w.id]);
  return [...due,...fresh].slice(0,target);
}
export function newSession(data,words,category,day=null){
  if(data.session)throw Error('Session already running');
  if(!CATEGORIES.includes(category)||!words.length||words.length>30||new Set(words.map(w=>w.id)).size!==words.length||
    (day!==null&&(!Number.isInteger(day)||day<1||day>30))||
    !words.every(w=>w.category===category&&(day===null||w.day===day)))throw Error('Invalid session');
  return {...data,session:{category,day,originalIds:words.map(w=>w.id),queue:words.map(w=>w.id),retryIds:[],answeredIds:[],known:0,relearn:0,longTermAdded:0}};
}
export function answerSession(data,answer,now=new Date()){
  const s=data.session;if(!s||!['KNOWN','RELEARN'].includes(answer))throw Error('No active session or invalid answer');
  const id=s.queue[0];if(!id)throw Error('Empty queue');
  const retry=s.retryIds.includes(id),previous=data.progress[id],updated=applyAnswer(previous,answer,now,retry);
  const queue=s.queue.slice(1),retryIds=s.retryIds.filter(x=>x!==id);
  if(answer==='RELEARN'){queue.push(id);retryIds.push(id);}
  const answeredIds=s.answeredIds.includes(id)?s.answeredIds:[...s.answeredIds,id];
  const result={total:answeredIds.length,known:s.known+(answer==='KNOWN'?1:0),relearn:s.relearn+(answer==='RELEARN'?1:0),longTermAdded:s.longTermAdded+(previous?.stage!=='LONG_TERM'&&updated.stage==='LONG_TERM'?1:0)};
  return {data:{...data,progress:{...data.progress,[id]:updated},session:queue.length?{...s,queue,retryIds,answeredIds,known:result.known,relearn:result.relearn,longTermAdded:result.longTermAdded}:null},result};
}
export function categoryStats(words,progress,now=new Date()){
  return {total:words.length,studied:words.filter(w=>!!progress[w.id]).length,due:words.filter(w=>isDue(progress[w.id],now)).length,longTerm:words.filter(w=>progress[w.id]?.stage==='LONG_TERM').length,new:words.filter(w=>!progress[w.id]).length};
}
export function validateBackup(raw,validIds){
  if(typeof raw!=='string'||raw.length>10_000_000)throw Error('백업 파일 크기 제한을 초과했습니다.');
  const x=JSON.parse(raw);const data=x?.data??x;
  if(x?.app&&x.app!=='TOEIC Yellow')throw Error('다른 앱의 백업 파일입니다.');
  if(!isRecord(data)||data.schemaVersion!==1||![10,20,30].includes(data.target)||!isRecord(data.progress)||Object.keys(data.progress).length>validIds.size||!('session' in data))throw Error('유효하지 않은 백업 형식입니다.');
  // Reject corrupt and forged progress before overwriting on-device history.
  const progress={};
  for(const [id,p] of Object.entries(data.progress)){
    if(!validIds.has(id)||!isRecord(p)||!STAGES.has(p.stage)||
      !nonNegInt(p.seenCount)||!nonNegInt(p.knownCount)||!nonNegInt(p.relearnCount)||
      p.seenCount!==p.knownCount+p.relearnCount||!validDate(p.lastReviewedAt)||
      !(p.nextReviewAt===null||validDate(p.nextReviewAt))||
      (p.stage==='NEW'||p.stage==='LONG_TERM')&&p.nextReviewAt!==null||
      (p.stage!=='NEW'&&p.stage!=='LONG_TERM'&&p.nextReviewAt===null)||
      (p.nextReviewAt!==null&&Date.parse(p.nextReviewAt)<=Date.parse(p.lastReviewedAt)))throw Error('손상된 학습 기록입니다.');
    progress[id]={stage:p.stage,nextReviewAt:p.nextReviewAt,lastReviewedAt:p.lastReviewedAt,seenCount:p.seenCount,knownCount:p.knownCount,relearnCount:p.relearnCount};
  }
  let session=null;
  if(data.session!==null){
    const s=data.session;
    if(!isRecord(s)||!CATEGORIES.includes(s.category)||!(s.day===null||Number.isInteger(s.day)&&s.day>=1&&s.day<=30)||
      !uniqueIds(s.originalIds,validIds,30)||!s.originalIds.length||
      !uniqueIds(s.queue,validIds,30)||!s.queue.length||
      !uniqueIds(s.retryIds,validIds,30)||!uniqueIds(s.answeredIds,validIds,30)||
      !nonNegInt(s.known)||!nonNegInt(s.relearn)||!nonNegInt(s.longTermAdded)||
      s.known!==s.originalIds.length-s.queue.length||
      s.known+s.relearn<s.answeredIds.length||s.longTermAdded>s.known)throw Error('진행 중인 학습 정보가 손상되었습니다.');
    const set=new Set(s.originalIds),queued=new Set(s.queue),answered=new Set(s.answeredIds),retry=new Set(s.retryIds);
    if(![...queued,...answered,...retry].every(id=>set.has(id))||
      ![...retry].every(id=>queued.has(id)&&answered.has(id))||
      !s.originalIds.every(id=>queued.has(id)||answered.has(id))||
      [...queued].some(id=>answered.has(id)&&!retry.has(id))||
      [...answered].some(id=>!progress[id]))throw Error('학습 큐의 연결이 올바르지 않습니다.');
    session={category:s.category,day:s.day,originalIds:[...s.originalIds],queue:[...s.queue],retryIds:[...s.retryIds],answeredIds:[...s.answeredIds],known:s.known,relearn:s.relearn,longTermAdded:s.longTermAdded};
  }
  return {schemaVersion:1,target:data.target,progress,session};
}
export function backupJson(data){return JSON.stringify({app:'TOEIC Yellow',formatVersion:1,exportedAt:new Date().toISOString(),data},null,2);}
