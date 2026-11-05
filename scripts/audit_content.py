#!/usr/bin/env python3
"""Data integrity audit, not an English-language meaning accuracy certificate."""
import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

BASE=Path(__file__).resolve().parents[1]
WORDS=BASE/'src/data/words.json'
MANIFEST=BASE/'src/data/manifest.json'
REPORT=BASE/'data/structural_audit.json'
VALID_CATS={'frequent':1241,'basic':837,'score800':2033,'score900':990}
VALID_SOURCES={'provided','provided-crosslink','editorial-draft','draft-context','study-prompt'}


def run():
    words=json.loads(WORDS.read_text())
    manifest=json.loads(MANIFEST.read_text())
    problems=[];suspicious=[];ids=set();cats=Counter();source=Counter();days=defaultdict(Counter)
    for i,w in enumerate(words):
        label=f"#{i+1} {w.get('word', '?')}"
        wid=w.get('id')
        if not isinstance(wid,str) or wid in ids:problems.append(label+': invalid/duplicate ID')
        ids.add(wid)
        if w.get('category') not in VALID_CATS:problems.append(label+': category')
        else:cats[w['category']]+=1;days[w['category']][w.get('day')]+=1
        if not isinstance(w.get('day'),int) or not 1<=w['day']<=30:problems.append(label+': day')
        if not isinstance(w.get('word'),str) or not w['word'].strip():problems.append(label+': word')
        if not isinstance(w.get('meaningKo'),str) or not re.search('[가-힣]',w['meaningKo']):problems.append(label+': Korean meaning')
        if '�' in w.get('word','') or '�' in w.get('meaningKo',''):problems.append(label+': replacement glyph')
        es=w.get('examples')
        if not isinstance(es,list) or not es:problems.append(label+': missing example');continue
        for e in es:
            source[e.get('source')]+=1
            if e.get('source') not in VALID_SOURCES:problems.append(label+': invalid example source')
            if not isinstance(e.get('en'),str) or not e['en'].strip():problems.append(label+': missing example English')
            if not isinstance(e.get('ko'),str) or not e['ko'].strip():problems.append(label+': missing Korean example/gloss')
            en=e.get('en','')
            if len(en)>430:problems.append(label+': sentence length')
            if not re.search(r'[.?!][”\"\']?$',en):problems.append(label+': sentence punctuation')
            if '�' in en or 'r?sum?' in en or 'caf?' in en:problems.append(label+': damaged source encoding')
            if e.get('source') in ('draft-context','study-prompt') and e.get('translationStatus')!='gloss-only':problems.append(label+': auto draft translation wrongly labelled')
            if e.get('source')=='provided-crosslink' and not e.get('sourceWord'):problems.append(label+': crosslink provenance missing')
            if e.get('source')=='editorial-draft' and e.get('ko','').startswith('핵심 뜻:'):problems.append(label+': editorial translation not supplied')
            if e.get('source')=='draft-context':
                if any(q in en for q in [' the in ',' the it\'s ',' the include ',' responded blood supply ','the contestant']):
                    suspicious.append({'id':wid,'word':w['word'],'sentence':en,'flag':'template grammar'})
                if en.startswith(('The team agreed to ','The new proposal was described as ','The manager responded ')):
                    suspicious.append({'id':wid,'word':w['word'],'sentence':en,'flag':'generic template: manual syntax/sense review required'})
    if len(words)!=5101:problems.append('Wrong word count')
    if cats!=Counter(VALID_CATS):problems.append('Category distribution differs from source')
    if any(not set(values).issubset(set(range(1,31))) for values in days.values()):problems.append('Day distribution invalid')
    if source['provided']!=1481:problems.append('Original example cards lost')
    if sum(source.values())!=len(words)+1481-1238:problems.append('Total sentence count mismatch')
    for key,value in [('wordCount',5101),('providedExampleWords',1238),('exampleCardCount',1481)]:
        if manifest.get(key)!=value:problems.append('Manifest mismatch '+key)
    # Every original word must be either a single draft, or have all its original supplied examples.
    report={'originalVocabularyCount':len(words),'originalExampleCards':source['provided'],
            'sourceCounts':dict(source),'categoryCounts':dict(cats),
            'dayCounts':{cat:dict(days[cat]) for cat in VALID_CATS},
            'structuralErrors':problems,'suspiciousTemplateSamples':suspicious[:100],
            'suspiciousTemplateCount':len(suspicious),'semanticValidation':'not performed by structural audit'}
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');args=p.parse_args()
    report=run()
    if args.write:REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({key:report[key] for key in ['originalVocabularyCount','originalExampleCards','sourceCounts','categoryCounts','suspiciousTemplateCount','structuralErrors']},ensure_ascii=False,indent=2))
    if report['structuralErrors']:raise SystemExit(1)
