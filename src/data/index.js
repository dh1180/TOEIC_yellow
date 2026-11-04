import words from './words.json';
import manifest from './manifest.json';
export const WORDS=words;
export const MANIFEST=manifest;
export const WORD_BY_ID=new Map(words.map(w=>[w.id,w]));
export const WORD_IDS=new Set(words.map(w=>w.id));
export const WORDS_BY_CATEGORY={
  frequent:words.filter(w=>w.category==='frequent'),
  basic:words.filter(w=>w.category==='basic'),
  score800:words.filter(w=>w.category==='score800'),
  score900:words.filter(w=>w.category==='score900'),
};
export function searchWords(query,category='all',day=null){
  const key=query.normalize('NFKC').trim().toLocaleLowerCase();
  const base=category==='all'?WORDS:(WORDS_BY_CATEGORY[category]||[]);
  return base.filter(w=>(day===null||w.day===day)&&(!key||w.word.toLocaleLowerCase().normalize('NFKC').includes(key)||w.meaningKo.normalize('NFKC').toLocaleLowerCase().includes(key)));
}
