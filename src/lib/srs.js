// The HSK Plus Ultra spaced repetition policy, maintained as a pure module.
export const STAGES = Object.freeze({NEW:'새 단어',MIN_30:'30분',DAY_3:'3일',DAY_7:'7일',DAY_21:'21일',LONG_TERM:'장기 기억'});
const NEXT_KNOWN={NEW:'LONG_TERM',MIN_30:'DAY_3',DAY_3:'DAY_7',DAY_7:'DAY_21',DAY_21:'LONG_TERM',LONG_TERM:'LONG_TERM'};
const NEXT_RELEARN={NEW:'DAY_3',MIN_30:'MIN_30',DAY_3:'MIN_30',DAY_7:'DAY_3',DAY_21:'DAY_7',LONG_TERM:'DAY_7'};
const DELAYS={MIN_30:30*60*1000,DAY_3:3*86400000,DAY_7:7*86400000,DAY_21:21*86400000};
export function transition(stage,answer){if(!STAGES[stage] || !['KNOWN','RELEARN'].includes(answer))throw Error('Invalid SRS transition');return answer==='KNOWN'?NEXT_KNOWN[stage]:NEXT_RELEARN[stage];}
export function applyAnswer(previous,answer,now=new Date(),retry=false){
  if(retry && answer==='KNOWN' && previous){return {...previous,lastReviewedAt:now.toISOString(),seenCount:previous.seenCount+1,knownCount:previous.knownCount+1};}
  const stage=transition(previous?.stage||'NEW',answer);
  return {stage,nextReviewAt:DELAYS[stage]?new Date(now.getTime()+DELAYS[stage]).toISOString():null,lastReviewedAt:now.toISOString(),seenCount:(previous?.seenCount||0)+1,knownCount:(previous?.knownCount||0)+(answer==='KNOWN'?1:0),relearnCount:(previous?.relearnCount||0)+(answer==='RELEARN'?1:0)};
}
export function isDue(p,now=new Date()){return !!p && p.stage!=='LONG_TERM' && !!p.nextReviewAt && new Date(p.nextReviewAt).getTime()<=now.getTime();}
export function reviewLabel(p){return p?STAGES[p.stage]||'새 단어':'새 단어';}
export function nextLabel(p,answer){return STAGES[transition(p?.stage||'NEW',answer)];}
