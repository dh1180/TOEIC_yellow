import { applyAnswer,isDue } from './srs.js';
export const CATEGORIES=['frequent','basic','score800','score900'];
export const CATEGORY_LABELS={frequent:'빈출단어',basic:'토익 기초단어',score800:'800점 어휘',score900:'900점 어휘'};
export function emptyData(){return {schemaVersion:1,target:20,progress:{},session:null};}
export function selectQueue(words,progress,target,now=new Date()){
  if(![10,20,30].includes(target))throw Error('Invalid daily target');
  const due=words.filter(w=>isDue(progress[w.id],now)).sort((a,b)=>progress[a.id].nextReviewAt.localeCompare(progress[b.id].nextReviewAt));
  const fresh=words.filter(w=>!progress[w.id]);
  return [...due,...fresh].slice(0,target);
}
export function newSession(data,words,category,day=null){
  if(data.session)throw Error('Session already running');
  if(!CATEGORIES.includes(category)||!words.length||words.length>30||new Set(words.map(w=>w.id)).size!==words.length)throw Error('Invalid session');
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
  const x=JSON.parse(raw);const data=x?.data||x;
  if(x?.app && x.app!=='TOEIC Yellow')throw Error('다른 앱의 백업 파일입니다.');
  if(data?.schemaVersion!==1||![10,20,30].includes(data.target)||!data.progress||typeof data.progress!=='object'||Array.isArray(data.progress))throw Error('유효하지 않은 백업 형식입니다.');
  for(const [id,p] of Object.entries(data.progress)){
    if(!validIds.has(id)||!p||!['NEW','MIN_30','DAY_3','DAY_7','DAY_21','LONG_TERM'].includes(p.stage)|| !Number.isInteger(p.seenCount)||p.seenCount<0||!Number.isInteger(p.knownCount)||p.knownCount<0||!Number.isInteger(p.relearnCount)||p.relearnCount<0||typeof p.lastReviewedAt!=='string'||(p.nextReviewAt!==null&&typeof p.nextReviewAt!=='string'))throw Error('손상된 학습 기록입니다.');
  }
  let session=null;
  if(data.session){
    const s=data.session;
    if(!CATEGORIES.includes(s.category)||!Array.isArray(s.originalIds)||s.originalIds.length<1||s.originalIds.length>30||!Array.isArray(s.queue)||!Array.isArray(s.retryIds)||!Array.isArray(s.answeredIds)||!s.originalIds.every(id=>validIds.has(id))||!s.queue.every(id=>s.originalIds.includes(id))||!s.retryIds.every(id=>s.queue.includes(id))||!s.answeredIds.every(id=>s.originalIds.includes(id)))throw Error('진행 중인 학습 정보가 손상되었습니다.');
    session=s;
  }
  return {schemaVersion:1,target:data.target,progress:data.progress,session};
}
export function backupJson(data){return JSON.stringify({app:'TOEIC Yellow',formatVersion:1,exportedAt:new Date().toISOString(),data},null,2);}
