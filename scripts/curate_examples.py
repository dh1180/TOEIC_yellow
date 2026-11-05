#!/usr/bin/env python3
"""Reproducible source-preserving editorial pass.

Nothing labelled `draft-context` is represented as professionally reviewed.
Edits `generated-prompt` and draft entries only; never overwrites provided examples.
Usage: python3 scripts/curate_examples.py
"""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORDS = ROOT / 'src/data/words.json'
CURATED = ROOT / 'data/editorial_examples.tsv'
QUEUE = ROOT / 'data/example_review_queue.json'
SUMMARY = ROOT / 'data/content_audit.json'
PLACEHOLDER = re.compile(r'\b(?:A|B|sth|sb|somebody|something|someone|one.s)\b|[/\[\]()=<>]|\.{3}',re.I)
STANDALONE_ADV = {'however','nevertheless','nonetheless','therefore','thus','otherwise','moreover','furthermore','instead','meanwhile','consequently','accordingly','also','finally','likewise'}
PERSON_ADJ = {'friendly','qualified','incompetent','experienced','reliable','honest','energetic','enthusiastic','generous','punctual','inexperienced','skilled','knowledgeable','talented','diligent','capable','eligible','competent','creative','professional','productive','innovative'}
OBJECT_ADJ = {'portable','durable','fragile','robust','defective','faulty','reliable','compact','lightweight','heavy','expensive','waterproof','recyclable','rechargeable','flexible','efficient','costly','affordable','sturdy','damaged','electronic','mechanical','automatic','wireless','high-tech'}
NOUN_OVERRIDES={'contestant','applicant','assistant','consultant','attendant','participant','entrant','accountant','enterprise','appraisal','document','process','permit','report','achievement','shipment','product','receptionist','department','management','boarding','funding','meeting','training','booking','planning','marketing','parking','transport','delivery','approval','proposal','revenue','tax','checklist','contractor','clerk','job','role','opponent','appointee','lobby','passenger','driver','administrator'}
ADVERB_ADJ = {'daily','early','elderly','friendly','lively','likely','lovely','monthly','only','quarterly','timely','weekly','yearly','costly','orderly','silly','ugly','holy'}
ADVERB_DEGREE = {'highly':'highly effective','extremely':'extremely busy','relatively':'relatively small','especially':'especially useful','particularly':'particularly useful','slightly':'slightly higher','significantly':'significantly lower','substantially':'substantially higher','moderately':'moderately priced','roughly':'roughly equivalent','approximately':'approximately equal','mostly':'mostly complete','nearly':'nearly finished','barely':'barely visible','largely':'largely responsible','virtually':'virtually complete','entirely':'entirely accurate','fairly':'fairly simple','quite':'quite unusual','very':'very pleased'}


def load_editorial():
    output={}
    for num,line in enumerate(CURATED.read_text().splitlines(),1):
        if not line or line.startswith('#'):continue
        fields=line.split('|')
        if len(fields)!=3:raise ValueError(f'expected three columns in {CURATED}:{num}')
        key,en,ko=map(str.strip,fields)
        if not (en.endswith(('.', '?', '!')) and ko.endswith(('.', '?', '!'))):
            raise ValueError(f'punctuation problem in {CURATED}:{num}')
        if key.lower() in output:raise ValueError(f'duplicate headword in {CURATED}:{num}')
        output[key.lower()]={'en':en,'ko':ko,'source':'editorial-draft'}
    return output


def clean_headword(text):
    # Do not treat parenthetical synonyms / A-B templates as literal English tokens.
    text=text.replace('’',"'").strip()
    text=re.sub(r'\(=.+?\)','',text).strip()
    return text


def noun_pattern(word,meaning):
    m=meaning.split(';')[0].split(',')[0].strip()
    if re.search(r'공급업체|직원|담당자|관리자|기사|사람|안내원|손님|고객|승객|운전기사|디자이너|지도자|대표|의사|교수|전문가|가수|요리사|사무원|상인|연구원|기술자|작가|주민|발표자|이사|비서|관리인|조력자|감독',m):
        return f'The {word} answered several questions after the meeting.'
    if re.search(r'식당|가게|매장|공항|역|공장|창고|본사|사무실|빵집|시설|병원|박물관|카페|상점|도서관|백화점|전시실|영업소|경기장|지역|주택|구역|시설|지점|지사|분점',m):
        return f'The {word} is located near the city center.'
    if re.search(r'회의|행사|모임|강의|강연|세미나|워크숍|교육|훈련|면접|시상식|기념식|박람회|회의실|공연|대회|파티|결혼식',m):
        return f'The {word} will take place on Friday afternoon.'
    if re.search(r'정전|지진|폭우|폭풍|강풍|홍수|태풍|날씨|눈사태|소나기|낙뢰|호우|강수량',m):
        return f'The {word} delayed deliveries across the region.'
    if re.search(r'기차|버스|항공편|비행기|선박|배|택시|열차|기차역|셔틀',m):
        return f'The {word} arrived shortly before noon.'
    if re.search(r'계약|서류|보고서|청구서|허가증|증명서|이력서|지원서|제안서|안내서|설명서|영수증|양식|서식|문서|이메일|초대장|편지|증빙',m):
        return f'Please send the {word} to our office by Friday.'
    if re.search(r'기계|기기|장치|장비|설비|도구|자동차|차량|엔진|의자|책상|선반|컴퓨터|인쇄기|프린터|품목|제품|재료|화학약품|부품|전선|가구|휴대전화|전화기|센서',m):
        return f'The technician inspected the {word} before it was used.'
    if re.search(r'요금|가격|비용|수입|소득|매출|이익|이윤|급여|임금|세금|예산|할인|계좌|유동성|부채|지출|소비량|수수료|지급|수익|매상',m):
        return f'The finance team reviewed the {word} in its latest report.'
    if re.search(r'자격|성능|품질|효율|만족|안전|성과|속도|능력|정확성|수준|실적|유효성|타당성|가능성|진행|완성도',m):
        return f'The team measured the {word} before making a decision.'
    if re.search(r'배송|발송|운송|운반|교통|항해|물류|노선|배송비|우편|택배',m):
        return f'The manager checked the {word} before the shipment left.'
    if re.search(r'토지|정원|꽃밭|화단|채소|나무|산책로|강변|도로|풍경|풀밭',m):
        return f'Visitors enjoyed the {word} during the tour.'
    if re.search(r'식품|음식|식사|빵|과일|채소|커피|차|음료|식초|소스',m):
        return f'The restaurant purchased fresh {word} for the weekend.'
    if re.search(r'기록|정보|자료|결과|데이터|수치|지표|통계|근거|예측|분석|설명|해석|보고|조사|연구',m):
        return f'The analyst included the {word} in the report.'
    return f'The team discussed the {word} during the planning meeting.'


def adjective_pattern(word,meaning):
    m=meaning.split(';')[0].split(',')[0]
    if word in PERSON_ADJ or re.search(r'용감|친절|능숙|경력이|무능|유능|친근|성실|정직|전문성|열정적',m):
        return f'The new employee seems {word} and ready to help customers.'
    if word in OBJECT_ADJ or re.search(r'튼튼|가벼|무거|견고|재활용|휴대|내구|물에|디지털|자동|고장|결함',m):
        return f'The new equipment is {word} and easy to maintain.'
    if re.search(r'습한|추운|더운|맑은|서늘|따뜻|건조',m):return f'The weather was {word} during our visit.'
    if re.search(r'비싼|저렴|비용|가격',m):return f'The service was {word} compared with other options.'
    if re.search(r'긴|장시간|짧은|긴급|복잡|지루',m):return f'The meeting was {word}, but the team reached an agreement.'
    if re.search(r'불안|긴장|행복|만족|기쁘|감동|놀라|화가|실망',m):return f'The applicant felt {word} after the interview.'
    if re.search(r'우아|맛있|달콤|매운|신선|아름',m):return f"The restaurant's new menu was described as {word}."
    if re.search(r'타당|합리|효과|적절|관련|지속 가능|실용|용이|가능',m):return f'The committee considered the plan {word}.'
    return f'The new proposal was described as {word} during the meeting.'


def verb_pattern(word,meaning):
    m=meaning.split(';')[0].split(',')[0]
    if re.search(r'인쇄|제출|검토|승인|서명|발행|작성|편집|재작성|확인|수정|번역|기입|기재|첨부|복사|발송|전달|기록|기술|보고',m):
        return f'Please {word} the report before Friday.'
    if re.search(r'응대|연락|통지|설명|안내|상담|방문|맞이|소개|접대|초청',m):
        return f'Please {word} the client before noon.'
    if re.search(r'조립|수리|교체|청소|점검|유지|설치|작동|조정|살균|소독|분해|재조립|수선|충전|기름칠',m):
        return f'The technician will {word} the equipment tomorrow.'
    if re.search(r'배송|배달|발송|운반|운송|추적|하역|포장|보관|회수|수송',m):
        return f'The warehouse team will {word} the shipment tomorrow.'
    if re.search(r'예약|주문|취소|환불|결제|지불|지급|송금|상환|청구|입금',m):
        return f'The clerk will {word} the payment this afternoon.'
    if re.search(r'조사|측정|평가|검사|계산|분석|예측|추정|비교|진단',m):
        return f'The analyst will {word} the results before the meeting.'
    if re.search(r'연기|변경|계획|조직|개선|조율|조정|준비|개편|연장|단축|진행|관리|완료',m):
        return f'The manager plans to {word} the schedule next week.'
    if re.search(r'찾아|검색|모으|획득|얻|구하|수집|회수|찾다|복구|수령',m):
        return f'The staff will {word} the documents before lunch.'
    if re.search(r'방지|막다|줄이다|낮추|예방|피하|최소화|없애',m):
        return f'The new procedure aims to {word} delays during production.'
    if re.search(r'건설|건축|개발|생산|제조|설계|만들|창출|세우',m):
        return f'The company plans to {word} a new facility next year.'
    if re.search(r'증가|확대|향상|높이다|급증|강화|증진|확장',m):
        return f'The new policy should help us {word} sales this quarter.'
    if re.search(r'논의|토론|협상|협의|합의|협조|협력|소통',m):
        return f'The managers will {word} with the suppliers this afternoon.'
    if re.search(r'도착|출발|떠나다|머무|기다리|참여|합류|쉬다|일하다|은퇴|퇴직|지속|경쟁|대응|발생|성장|몰입',m):
        return f'The staff are expected to {word} before the event starts.'
    return f'The team agreed to {word} the matter before the deadline.'


def maybe_adjective(word,meaning):
    m=meaning.split(';')[0].split(',')[0].strip()
    if word in NOUN_OVERRIDES:return False
    if word in ADVERB_ADJ or word in PERSON_ADJ or word in OBJECT_ADJ:return True
    if ' ' in word:return re.search(r'(의|적인|한|된|있는|스러운|없는)$',m) is not None
    if re.search(r'(의|적인|한|된|있는|스러운|없는)$',m):return True
    if re.search(r'(able|ible|ous|ful|less|ive|ary|ical|ic|al|ent|ed|est)$',word) and not re.search(r'(ation|ment|ation)$',word):
        return not re.search(r'(하다|되다|시키다)$',m)
    return False


def maybe_verb(word,meaning):
    m=meaning.split(';')[0].split(',')[0].strip()
    if word in NOUN_OVERRIDES:return False
    if re.search(r'(하다|되다|시키다|걸다|받다|주다|가다|오다|떠나다|나오다|만들다|읽다|쓰다|옮기다|기다리다|나다|얻다|죽다|떨어지다|찾다|앉다|서다|보다|말하다|열다|닫다|있다|없다|놓다|두다|지다|늘다|줄다|쉬다|끄다|켜다|살다|걷다|달리다|떠오르다|사용하다|고치다|도착하다|진행하다|발생하다|맞추다|할당하다|소독하다|승인하다|지급하다)$',m):
        return True
    if re.search(r'(ize|ise|ify)$',word) and not re.search(r'(사업|기업|행사|직업|규모|조직)',m):return True
    if m.endswith('다') and not re.search(r'(좋다|나쁘다|많다|적다|크다|작다|뛰어나다|편하다|불편하다|쉽다|어렵다|춥다|덥다|높다|낮다|길다|짧다|가능하다|불가능하다|필요하다|그렇다|충분하다|부족하다|있는|없다|우수하다)$',m):return True
    return False


def contextual(word,meaning):
    w=clean_headword(word)
    lo=w.lower()
    # Reject impossible-to-inflect placeholders rather than inventing deceptive use.
    if PLACEHOLDER.search(w):return None
    if w.count(' ')>8 or not re.search(r'[A-Za-z]',w):return None
    # Patterned grammatical connectors, multiword phrases and phrasal verbs.
    if lo.startswith('be '):
        if re.search(r'(to|for|with|of|on|at|in|by|from)$',lo):
            obj='the project' if lo.endswith(('of','on','with')) else 'the new regulations' if lo.endswith('to') else 'the delay'
            return f'The company may {w} {obj}.'
        return f'Our employees want to {w} throughout the project.'
    if lo.startswith('have '):return f'Employees may {w} during the conference.'
    if lo.startswith(('get ','take ','make ','set ','put ','turn ','look ','come ','go ','move ','bring ','keep ','follow ','carry ','work ','stand ','run ','deal ','pay ','hold ','fill ','pick ','call ','hand ','cut ','check ','pass ','sort ','break ','step ','send ','start ','reach ','give ')):
        if re.search(r'(to|for|with|of|on|at|in|by|from|into|over|up|off|out)$',lo):
            if lo.endswith(('to','for','with','of','from','into','over')):return f'The staff agreed to {w} the customer request.'
            return f'The staff agreed to {w} before lunch.'
        return f'The employees were asked to {w} before the meeting.'
    if lo.startswith(('in ','at ','on ','by ','for ','under ','with ','without ','within ','beyond ','through ','throughout ','after ','before ','during ','since ','until ','despite ','rather than ','instead of ','according to ','owing to ','due to ','thanks to ','in spite of ','regardless of ','out of ','ahead of ')):
        if lo.startswith(('out of ',)):
            return f'The office is {w} at the moment.'
        if lo.endswith(('to','for','with','of','on','at','in','by','from','into','over')):
            return f'The policy was updated {w} the latest report.'
        if lo.startswith(('in a moment','at once','in the meantime','as soon as','in advance','for the time being')):
            return f'The manager will contact the supplier {w}.'
        if lo.startswith(('under ','during ','after ','before ','despite ','in spite of ','due to ','thanks to ')):
            return f'The project continued {w}.'
        return f'The new procedures will be introduced {w}.'
    if lo.startswith(('as ','so ','even if','even though','unless ','once ','although ','whereas ','unlike ','provided that','given that')):
        if lo.endswith(('to','for','with','of')):return None
        return f'{w.capitalize()}, the team adjusted its schedule.' if lo.startswith(('although ','whereas ')) else f'The new process was approved {w}.'
    if lo in STANDALONE_ADV:return f'The deadline was tight; {w}, the team completed the task on time.'
    if lo.endswith('ly') and lo not in ADVERB_ADJ:
        if lo in ADVERB_DEGREE:
            full=ADVERB_DEGREE[lo]
            return f'The new proposal was {full} for the department.'
        if lo in {'originally','formerly','previously','initially'}:
            return f'The facility was {w} used as a warehouse.'
        return f'The manager responded {w} to the request.'
    if re.search(r'(\bto\b|\bfor\b|\bwith\b|\bof\b|\bfrom\b)$',lo) and ' ' in w:
        return f'The new plan is {w} our main goals.'
    if maybe_adjective(w,meaning):return adjective_pattern(w,meaning)
    if maybe_verb(w,meaning):
        if ' ' in w:return f'The staff agreed to {w} before the deadline.'
        return verb_pattern(w,meaning)
    return noun_pattern(w,meaning)


def contains_usage(expr,sentence):
    # Inflected `be`/`have` examples are allowed when the remainder is present.
    key=clean_headword(expr)
    if key.startswith('be '):key=key[3:]
    if key.startswith('have '):key=key[5:]
    if key.startswith('cover one\'s shift'):key='shift'
    if key.startswith('be '):key=key[3:]
    return key.casefold() in sentence.casefold()


def main():
    entries=json.loads(WORDS.read_text())
    # Fix a demonstrable CFO/CEO label mix-up while preserving Anki IDs and source.
    headword_fixes={
        'chief financial officer(CEO)':'chief financial officer (CFO)',
        'CEO(chief executive officer)':'CEO (chief executive officer)',
    }
    for item in entries:
        if item['word'] in headword_fixes:
            item.setdefault('wordOriginal',item['word'])
            item['word']=headword_fixes[item['word']]
    curated=load_editorial()
    source_count=Counter();used=set();review=[]
    supplied=[(w['word'],e) for w in entries for e in w['examples'] if e['source']=='provided']
    def find_crosslink(term):
        # Only use exact alphabetic headwords with safe boundaries. Multiword
        # preposition senses often diverge (e.g. 'thanks to'), so don't infer.
        if len(term)<5 or not re.fullmatch(r"[A-Za-z][A-Za-z'-]*",term):return None
        if term.casefold() in {'right','like','just','case','since','still','only','date','kind','line','live','fair','fine','order','party','state','place','form','watch','clear','firm','present','post','light','apply','matter','draft','model','level','board','bill','draft','serve','term','scale','issue','bank','turn','point','staff','power','check','spring','last','daily','chief','chiefly','even','head','hard','close','sound','lead','base','court','grant','claim','class','cover','file','plant'}:return None
        regex=re.compile(r'(?<![A-Za-z-])'+re.escape(term)+r'(?![A-Za-z-])',re.I)
        matches=[]
        for source_word,e in supplied:
            if not regex.search(e['en']):continue
            found=regex.search(e['en'])
            matched=e['en'][found.start():found.end()]
            # Mid-sentence capitalized names/months are not ordinary-word usage.
            if found.start()>0 and matched[0].isupper():continue
            matches.append((source_word,e))
        if not matches:return None
        # Sentence selection is deterministic and prefers simpler, shorter clauses.
        source_word, e=min(matches,key=lambda s:(len(s[1]['en'])>170,len(s[1]['en'])))
        return {'en':e['en'],'ko':e['ko'],'source':'provided-crosslink','sourceWord':source_word,'translationStatus':'provided-unverified-for-crosslink'}

    for item in entries:
        samples=item['examples']
        for s in samples:
            if s['source']=='provided':
                s['en']=re.sub(r'r\?sum\?', 'résumé',s['en'],flags=re.I)
                s['en']=re.sub(r'caf\?', 'café',s['en'],flags=re.I)
        if any(s['source']=='provided' for s in samples):
            source_count['provided_words']+=1
            continue
        key=item['word'].casefold()
        if key in curated:
            candidate=curated[key].copy();used.add(key)
            kind='editorial-draft'
        else:
            crosslink=find_crosslink(item['word'])
            if crosslink:
                candidate=crosslink
                kind='provided-crosslink'
            else:
                en=contextual(item['word'],item['meaningKo'])
                if en and contains_usage(item['word'],en):
                    candidate={'en':en,'ko':f"핵심 뜻: {item['meaningKo']}",'source':'draft-context','translationStatus':'gloss-only'}
                    kind='draft-context'
                else:
                    candidate={'en':f'The training material contains the expression “{item["word"]}”.',
                               'ko':f'핵심 뜻: {item["meaningKo"]}',
                               'source':'study-prompt','translationStatus':'gloss-only'}
                    kind='study-prompt'
        item['examples']=[candidate]
        source_count[kind]+=1
        if kind!='editorial-draft':
            review.append({'id':item['id'],'category':item['category'],'day':item['day'],
                           'word':item['word'],'meaningKo':item['meaningKo'],
                           'draftEnglish':candidate['en'],'source':kind,
                           'needsReview':(['sense alignment','translation for this headword'] if kind=='provided-crosslink' else ['English grammar','sense alignment','naturalness','full Korean translation'])})
        else:
            # This is a one-author draft; don't mistake it for independently reviewed content.
            review.append({'id':item['id'],'category':item['category'],'day':item['day'],
                           'word':item['word'],'meaningKo':item['meaningKo'],
                           'draftEnglish':candidate['en'],'source':kind,
                           'needsReview':['independent language review']})
    unused=sorted(set(curated)-used)
    summary={'wordCount':len(entries),'providedExampleWords':source_count['provided_words'],
             'providedExampleCards':sum(len(w['examples']) for w in entries if w['examples'][0]['source']=='provided'),
             'editorialDrafts':source_count['editorial-draft'],
             'crosslinkedSourceExamples':source_count['provided-crosslink'],
             'generatedContextDrafts':source_count['draft-context'],
             'studyPromptsNotExamples':source_count['study-prompt'],
             'pendingProfessionalReview':len(review),
             'unusedEditorialKeys':unused,
             'meaningAndUsageFullyCertified':False}
    assert len(entries)==5101 and source_count['provided_words']==1238
    assert sum(source_count[k] for k in ['editorial-draft','provided-crosslink','draft-context','study-prompt'])==3863
    WORDS.write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
    original_manifest=json.loads((ROOT/'src/data/manifest.json').read_text())
    original_manifest.update({'version':2,'noOriginalExampleWords':3863,
                             'editorialDrafts':source_count['editorial-draft'],
                             'crosslinkedSourceExamples':source_count['provided-crosslink'],
                             'generatedContextDrafts':source_count['draft-context'],
                             'studyPromptsNotExamples':source_count['study-prompt'],
                             'pendingProfessionalReview':len(review)})
    (ROOT/'src/data/manifest.json').write_text(json.dumps(original_manifest,ensure_ascii=False,indent=2)+'\n')
    QUEUE.write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n')
    SUMMARY.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(summary,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
