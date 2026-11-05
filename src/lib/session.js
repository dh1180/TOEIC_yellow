import { applyAnswer,isDue } from './srs.js';
export const CATEGORIES=['frequent','basic','score800','score900'];
export const CATEGORY_LABELS={frequent:'빈출단어',basic:'토익 기초단어',score800:'800점 어휘',score900:'900점 어휘'};
const STAGE_KEYS=['NEW','MIN_30','DAY_3','DAY_7','DAY_21','LONG_TERM'];
const isRecord=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const count=v=>Number.isSafeInteger(v)&&v>=0;
const validDate=v=>typeof v==='string'&&v.length===24&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const unique=a=>new Set(a).size===a.length;
export function emptyData(){return {schemaVersion:1,target:20,progress:{},session:null};}
export function selectQueue(words,progress,target,now=new Date()){
  if(![10,20,30].includes(target))throw Error('Invalid daily target');
  const due=words.filter(w=>isDue(progress[w.id],now)).sort((a,b)=>progress[a.id].nextReviewAt.localeCompare(progress[b.id].nextReviewAt));
  const fresh=words.filter(w=>!progress[w.id]);
  return [...due,...fresh].slice(0,target);
}
export function newSession(data,words,category,day=null){
  if(data.session)throw Error('Session already running');
  if(!CATEGORIES.includes(category)||!words.length||words.length>30||!unique(words.map(w=>w.id))||
     (day!==null&&(!Number.isInteger(day)||day<1||day>30))||
     !words.every(w=>w.category===category&&(day===null||w.day===day)))throw Error('Invalid session');
  return {...data,session:{category,day,originalIds:words.map(w=>w.id),queue:words.map(w=>w.id),retryIds:[],answeredIds:[],known:0,relearn:0,longTermAdded:0}};
}
export function sessionCompleted(s){return s?.answeredIds.length||0;}
export function sessionVisibleIndex(s){if(!s)return 0;return Math.min(s.originalIds.length,s.answeredIds.length+(s.answeredIds.includes(s.queue[0])?0:1));}
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
  const x=JSON.parse(raw);
  if(!isRecord(x))throw Error('유효하지 않은 백업입니다.');
  const data=x.data??x;
  if(x.app&&x.app!=='TOEIC Yellow')throw Error('다른 앱의 백업 파일입니다.');
  if(!isRecord(data)||data.schemaVersion!==1||![10,20,30].includes(data.target)||!isRecord(data.progress))throw Error('유효하지 않은 백업 형식입니다.');
  const entries=Object.entries(data.progress);
  if(entries.length>validIds.size)throw Error('학습 단어 수가 어휘 데이터보다 많습니다.');
  const progress={};
  for(const [id,p] of entries){
    if(!validIds.has(id)||!isRecord(p)||!STAGE_KEYS.includes(p.stage)||p.stage==='NEW'||
      !count(p.seenCount)||!count(p.knownCount)||!count(p.relearnCount)||p.knownCount+p.relearnCount!==p.seenCount||
      !validDate(p.lastReviewedAt)||
      (p.stage==='LONG_TERM'?p.nextReviewAt!==null:!validDate(p.nextReviewAt)) )throw Error('손상된 학습 기록입니다.');
    progress[id]={stage:p.stage,nextReviewAt:p.nextReviewAt,lastReviewedAt:p.lastReviewedAt,seenCount:p.seenCount,knownCount:p.knownCount,relearnCount:p.relearnCount};
  }
  let session=null;
  if(data.session!==null){
    const s=data.session;
    if(!isRecord(s)||!CATEGORIES.includes(s.category)||
      (s.day!==null&&(!Number.isInteger(s.day)||s.day<1||s.day>30))||
      !Array.isArray(s.originalIds)||s.originalIds.length<1||s.originalIds.length>30||!unique(s.originalIds)||
      !Array.isArray(s.queue)||s.queue.length<1||s.queue.length>s.originalIds.length||!unique(s.queue)||
      !Array.isArray(s.retryIds)||!unique(s.retryIds)||
      !Array.isArray(s.answeredIds)||!unique(s.answeredIds)||
      ![s.known,s.relearn,s.longTermAdded].every(count)||
      s.known+s.relearn<s.answeredIds.length||s.longTermAdded>s.answeredIds.length||
      !s.originalIds.every(id=>validIds.has(id))||
      !s.queue.every(id=>s.originalIds.includes(id))||
      !s.retryIds.every(id=>s.queue.includes(id)&&s.answeredIds.includes(id))||
      !s.answeredIds.every(id=>s.originalIds.includes(id)&&!!progress[id])||
      !s.originalIds.every(id=>s.queue.includes(id)||s.answeredIds.includes(id))||
      s.queue.some(id=>s.answeredIds.includes(id)&&!s.retryIds.includes(id)))throw Error('진행 중인 학습 정보가 손상되었습니다.');
    session={category:s.category,day:s.day,originalIds:[...s.originalIds],queue:[...s.queue],retryIds:[...s.retryIds],answeredIds:[...s.answeredIds],known:s.known,relearn:s.relearn,longTermAdded:s.longTermAdded};
  }
  return {schemaVersion:1,target:data.target,progress,session};
}
export function backupJson(data){return JSON.stringify({app:'TOEIC Yellow',formatVersion:1,exportedAt:new Date().toISOString(),data},null,2);}
