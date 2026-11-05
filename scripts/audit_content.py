#!/usr/bin/env python3
"""Deterministic, dependency-free integrity checks for imported TOEIC cards.

This script does not certify Korean meanings, English usage, or copyright status.
"""
from __future__ import annotations
import collections, csv, hashlib, json, pathlib, re, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
words=json.loads((ROOT/'src/data/words.json').read_text(encoding='utf-8'))
manifest=json.loads((ROOT/'src/data/manifest.json').read_text(encoding='utf-8'))
expected={'frequent':1241,'basic':837,'score800':2033,'score900':990}
errors=[];warnings=[];counts=collections.Counter()
ids=set();source_counts=collections.Counter();qa_status=collections.Counter();source_pairs=set();suspicious=[]
for i,w in enumerate(words):
    id_=w.get('id')
    if not isinstance(id_,str) or not id_.isdigit() or id_ in ids:errors.append(f'bad/duplicate ID at index {i}: {id_}')
    ids.add(id_)
    if w.get('category') not in expected:errors.append(f'unknown category at {id_}')
    else:counts[w['category']]+=1
    if not isinstance(w.get('day'),int) or not 1<=w['day']<=30:errors.append(f'invalid day {id_}')
    if not isinstance(w.get('word'),str) or not w['word'].strip():errors.append(f'missing word {id_}')
    if not isinstance(w.get('meaningKo'),str) or not w['meaningKo'].strip():errors.append(f'missing translation {id_}')
    if not isinstance(w.get('examples'),list) or not w['examples']:errors.append(f'missing examples {id_}');continue
    if w['category']!='frequent' and any(e['source']=='provided' for e in w['examples']):errors.append(f'provided example linked to non-frequent {id_}')
    for e in w['examples']:
        en=e.get('en');ko=e.get('ko');source=e.get('source');status=e.get('reviewStatus')
        if source not in ('provided','project-authored','editorial-draft','provided-crosslink','generated-context'):errors.append(f'unknown source at {id_}: {source}')
        source_counts[source]+=1;qa_status[status]+=1
        if not isinstance(en,str) or not en.strip() or not isinstance(ko,str) or not ko.strip():errors.append(f'missing content {id_}');continue
        if any(c in en for c in ('“','”','«','»','r?sum?','caf?')):errors.append(f'unresolved quotes or broken character {id_}')
        if not re.search(r'[A-Za-z]',en) or not en.rstrip().endswith(('.', '?','!')):errors.append(f'incomplete English sentence {id_}')
        if len(en.split())<4:errors.append(f'English too short {id_}')
        if source=='generated-context' and not (status=='needs-review' and ko.startswith('핵심 뜻:')):errors.append(f'generated example incorrectly verified/translated {id_}')
        if source=='project-authored' and (ko.startswith('핵심 뜻:') or status!='project-reviewed'):errors.append(f'authored example metadata mismatch {id_}')
        if source=='provided' and status!='provided-unverified':errors.append(f'provided source represented as reviewed {id_}')
        if source=='editorial-draft' and status!='editorial-draft':errors.append(f'editorial draft labeled as verified {id_}')
        if source=='provided-crosslink' and status!='crosslink-needs-sense-review':errors.append(f'crosslink marked as reviewed {id_}')
        if source!='provided' and re.search(r'\b(?:A|B|sb|sth)\b|one\x27s|oneself|\s-ing\b',en):suspicious.append({'id':id_,'word':w['word'],'en':en,'reason':'possible unresolved pattern'})
        if source=='provided':source_pairs.add((id_,en,ko))

for cat,total in expected.items():
    if counts[cat]!=total:errors.append(f'category total {cat} {counts[cat]} != {total}')
if len(words)!=5101 or len(ids)!=5101:errors.append(f'word counts {len(words)} IDs {len(ids)}')
if source_counts['provided']!=1481:errors.append(f'provided count {source_counts["provided"]} != 1481')
if sum(n for s,n in source_counts.items() if s!='provided')!=3863:errors.append('non-provided example total != 3863')
if manifest.get('wordCount')!=5101 or manifest.get('exampleCardCount')!=1481:errors.append('manifest counts incorrect')
if manifest.get('projectReviewedExamples')!=source_counts['project-authored']:errors.append('manifest authored mismatch')
if manifest.get('generatedContextExamples')!=source_counts['generated-context']:errors.append('manifest generated mismatch')
if manifest.get('editorialDraftExamples')!=source_counts['editorial-draft']:errors.append('manifest editorial-draft mismatch')
if manifest.get('providedCrosslinkedExamples')!=source_counts['provided-crosslink']:errors.append('manifest crosslink mismatch')
if manifest.get('independentlyVerifiedExamples')!=0:errors.append('independent QA verification must not be implied')
if manifest.get('quotedTokenPromptExamples')!=0:errors.append('manifest quoted prompts must be 0')
# File must track every still-unreviewed generated sentence and any author notes
with (ROOT/'data/content-review-queue.csv').open(encoding='utf-8-sig',newline='') as f:
    rows=list(csv.DictReader(f))
if len({r['id'] for r in rows})!=len(rows):errors.append('duplicate review ID')
if len(rows)!=3863:errors.append('review queue must cover all non-provided words')
if {w['id'] for w in words if w['examples'][0]['source']!='provided'}!={r['id'] for r in rows}:errors.append('review queue IDs must exactly match all non-provided words')
raw=json.dumps([(w['id'],w['word'],w['meaningKo'],w['day'],w['category']) for w in words],ensure_ascii=False,separators=(',',':')).encode()
summary={'status':'failed' if errors else 'integrity-passed', 'scope':'structural/metadata tests only, NOT language certification',
    'wordCount':len(words),'uniqueIds':len(ids),'categoryCounts':counts,'sourceCounts':source_counts,
    'reviewStatusCounts':qa_status,'reviewQueue':len(rows),'suspiciousPatternCount':len(suspicious),
    'identityDigestSHA256':hashlib.sha256(raw).hexdigest(),'errors':errors[:500],
    'warnings':['Automatic English contexts and Korean meaning hints are not professionally reviewed.',
                'Provided Anki examples have not been independently verified for grammar or rights.',
                'Suspect original terms/collocations listed in word-suspects.csv.']}
if '--write' in sys.argv:
    (ROOT/'data/content-audit.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2,default=lambda x:dict(x)))
if errors:sys.exit(1)
