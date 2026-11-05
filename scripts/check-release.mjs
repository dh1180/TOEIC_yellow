import { readFileSync } from 'node:fs';
const words=JSON.parse(readFileSync(new URL('../src/data/words.json',import.meta.url),'utf8'));
const unreviewed=words.filter(w=>w.examples.some(e=>e.source==='generated-context')).length;
if(unreviewed){
 console.error('Production blocked: '+unreviewed+' vocabulary entries have unreviewed generated example sentences. Confirm copyright permissions and real-device QA before releasing.');
 process.exit(1);
}
console.error('Production remains blocked until an explicit independently verified content and licensing approval process is implemented.');
process.exit(1);
