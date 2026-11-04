"""Extract the user's Anki 21b/zstd collections without shipping original audio.

Usage: python scripts/import_anki.py '노랭이.apkg' '노랭이_예문 기반.apkg'
Requires the `zstd` CLI (or python-zstandard) to decompress Anki 21b.
"""
from __future__ import annotations
import json, html, re, sqlite3, subprocess, sys, tempfile, zipfile, pathlib, collections
ROOT = pathlib.Path(__file__).resolve().parents[1]
TAG_DAY = re.compile(r'DAY(\d{2})')
TAG_EXAMPLE_INDEX = re.compile(r'DAY\d{2}::(\d+)::(\d+)')

def db_for(path: str):
    z = zipfile.ZipFile(path)
    if 'collection.anki21b' not in z.namelist():
        raise ValueError(f'{path}: Anki 21b 컬렉션이 없습니다.')
    b = z.read('collection.anki21b')
    try:
        import zstandard as zstd
        raw = zstd.ZstdDecompressor().decompress(b)
    except ImportError:
        raw = subprocess.run(['zstd','-d','-q','--stdout'],input=b,stdout=subprocess.PIPE,check=True).stdout
    if not raw.startswith(b'SQLite format 3'):
        raise ValueError('SQLite 데이터 형식이 아닙니다.')
    tmp = tempfile.NamedTemporaryFile(suffix='.sqlite',delete=False)
    tmp.write(raw);tmp.close()
    return sqlite3.connect(tmp.name), pathlib.Path(tmp.name)

def clean(s: str) -> str:
    s = re.sub(r'\[sound:[^\]]+\]','',s)
    s = re.sub(r'<br\s*/?>',' ',s,flags=re.I)
    s = re.sub(r'<[^>]+>','',s)
    return re.sub(r'\s+',' ',html.unescape(s)).strip()

def category(tags: str):
    if '빈출단어' in tags:return 'frequent'
    if '토익기초단어' in tags:return 'basic'
    if '800점' in tags:return 'score800'
    if '900점' in tags:return 'score900'
    raise ValueError(f'알 수 없는 단어장 분류: {tags}')

def part(tags: str):
    for p in ['LC','PART5,6','PART7']:
        if p in tags:return p
    return 'VOCAB'

def fallback(term, meaning, i):
    """Low-risk *word-awareness* practice, not falsely presented as usage evidence.

    These are flagged as authored prompts so a curator can replace them.
    """
    options = [
      ('Our instructor introduced the expression “{w}” during the lesson.', '강사가 수업 중 “{w}”라는 표현을 소개했습니다.'),
      ('Please check the meaning of “{w}” before the practice test.', '모의시험 전에 “{w}”의 뜻을 확인하세요.'),
      ('The workbook includes a vocabulary note on “{w}”.', '학습 교재에는 “{w}”에 관한 어휘 설명이 있습니다.'),
      ('The student added “{w}” to a personal vocabulary list.', '학생은 개인 단어 목록에 “{w}”를 추가했습니다.'),
    ]
    en,ko=options[i%len(options)]
    return en.format(w=term),ko.format(w=term)

def main(a,b):
    words_db,wt=db_for(a);ex_db,et=db_for(b)
    try:
        words=[]; frequent_by_day=collections.defaultdict(list)
        for note_id, fields, tags in words_db.execute('SELECT id,flds,tags FROM notes ORDER BY id'):
            parts=fields.split('\x1f')
            if len(parts)<2:continue
            term,meaning=clean(parts[0]),clean(parts[1]);day_match=TAG_DAY.search(tags)
            if not term or not meaning or not day_match:raise ValueError(f'누락된 단어·뜻·DAY: {note_id}')
            day=int(day_match.group(1));kind=category(tags)
            obj={'id':str(note_id),'day':day,'category':kind,'part':part(tags),'word':term,'meaningKo':meaning,'examples':[]}
            words.append(obj)
            if kind=='frequent':frequent_by_day[day].append(obj)
        example_cards=0;mapping_errors=[]
        for fields,tags in ex_db.execute('SELECT flds,tags FROM notes ORDER BY id'):
            parts=fields.split('\x1f');m=TAG_EXAMPLE_INDEX.search(tags)
            if len(parts)<3 or not m: mapping_errors.append(tags);continue
            day,index=int(TAG_DAY.search(tags).group(1)),int(m.group(1))
            group=frequent_by_day[day]
            if index<1 or index>len(group):mapping_errors.append(tags);continue
            en,ko=clean(parts[0]),clean(parts[2])
            if not en or not ko:mapping_errors.append(tags);continue
            group[index-1]['examples'].append({'en':en,'ko':ko,'source':'provided'})
            example_cards+=1
        if len(words)!=5101 or example_cards!=1481 or mapping_errors:
            raise ValueError(f'입력 데이터가 예상과 다릅니다. words={len(words)}, examples={example_cards}, mapping_errors={mapping_errors[:4]}')
        provided_words=0
        for i,w in enumerate(words):
            if w['examples']:
                provided_words+=1
            else:
                en,ko=fallback(w['word'],w['meaningKo'],i)
                w['examples'].append({'en':en,'ko':ko,'source':'generated-prompt'})
        metadata={'wordCount':len(words),'exampleCardCount':example_cards,'providedExampleWords':provided_words,'authoredPromptWords':len(words)-provided_words,'scope':'Anki user-provided decks','version':1}
        out=ROOT/'src/data/words.json';out.write_text(json.dumps(words,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
        (ROOT/'src/data/manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print('Imported',metadata,'bytes',out.stat().st_size)
    finally:
        words_db.close();ex_db.close();wt.unlink(missing_ok=True);et.unlink(missing_ok=True)

if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit(__doc__)
    main(sys.argv[1],sys.argv[2])
