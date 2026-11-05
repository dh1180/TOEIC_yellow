# TOEIC Yellow 콘텐츠/기능 검수 이력 (2026-11-05)

## 현재 저장소에서 검증한 사실

- 학습 단어 **5,101개**, 중복 Anki note ID 0개, DAY 01~30 및 단어장 분류 유지
- 원본 예문 **1,481개**가 **1,238개** 단어에 연결됨. 원본 발음·악센트 깨짐 5건 복원
- 원본 예문이 없는 **3,863개** 단어 중 기존 PR #2 직접 작성 **391개**, QA 자체 작성 **684개**, 원본 예문을 다른 어휘에 재연결한 후보 **328개**, 자동 문맥 초안 **2,460개**
- 자동 생성한 **어휘를 인용부호로 언급하는 보조 문장 0개** (초기 버전 대비 개선)
- 잘못 표기된 CEO/CFO 약어 2개 교정. 원본은 `wordOriginal`로 기록, 학습 기록의 ID 유지
- 직접 작성 예문과 원본 예문도 **독립적인 전문가 언어 검수·사용 권한 확인은 미완료**
- 자동 초안과 예문 재연결 후보는 앱 기본 화면에서 **숨김**. 학습자가 명시적으로 펼쳐 볼 수 있음
- 영어 뜻/품사/한국어 번역/영어 자연스러움에 대해 전체 어휘 개별 확증이 이뤄졌다는 주장은 하지 않음

## 구조 검수와 언어 감수의 차이

`python3 scripts/audit_content.py --check`는 단어 ID·분류·예문 수·빈칸·출처·검수 단계·검수 대기열 정합성을 검사합니다. 이것은 **문장이 자연스러운지, 단어 뜻과 맞는지, 한국어 뜻이 정확한지**를 확인하는 언어 검수가 아닙니다.

`data/content-review-queue.csv`에는 원본 예문이 없던 **3,863개** 항목을 모두 기록합니다. `data/qa-editorial-overrides.json`는 추가 직접 작성 684개와 재연결 후보 328개의 출처를 ID 기준으로 추적합니다. `data/word-suspects.csv`에는 의심되는 원본 표제어·관용구 사례가 남아 있습니다.

### 미완료 검증

1. 원본·프로젝트 작성·자동 문맥의 영어 예문, 뜻, 쓰임, 품사, 한국어 번역 전문 감수
2. 타 카드 원본 예문 재사용 328개의 핵심 단어 의미 일치 검증
3. 데이터 원저작권자의 공개·상용 재배포 허가 및 라이선스 기록
4. Android/iOS 설치·TTS·백업/복원·기기 접근성 검증

## 재현 명령

```bash
npm install
npm test
python3 scripts/audit_content.py --check
npx expo export --platform web
```

원본 데이터에서 다시 생성할 때:

```bash
python3 scripts/import_anki.py '노랭이.apkg' '노랭이_예문 기반.apkg'
python3 -m pip install -r requirements-content.txt
python3 scripts/curate_examples.py
python3 scripts/apply_qa_overrides.py
python3 scripts/audit_content.py --write
npm test
```

프로덕션 배포는 전수 언어·권리 검증 전까지 `npm run release:check`가 차단합니다.

## 2차 표제어·전문용어 교정

추가로 잘못된 정형 표현 5개를 교정하고 원문을 `wordOriginal`에 보존했습니다: `in the distant past`, `settle down to work`, `make an outside call`, `until the first of next month`, `arrange items on the shelf`. `toxication`은 단순 철자 오류가 아닌 독성화 관련 전문용어로 확인되어 원문을 보존하고 문장·의미를 수정했습니다. 출처는 `data/original_text_corrections.json`에 기록했습니다. 독립 번역 감수 여부는 변하지 않았습니다.


## 추가 QA 배치 01 (2026-11-05)

- 기초 단어장 자동 문맥 초안 **101개**를 각 표제어 뜻과 용법에 맞춰 새 영어 문장 및 한국어 문장 번역으로 교체했습니다. 검수 원장에는 `qa-manually-composed-usage-context`로 구분하며 **독립적인 사람의 검수는 아직 완료되지 않았습니다**.
- 사용자 제공 원본에서 `a move to overseas`처럼 전치사를 잘못 쓴 문장을 `a move overseas`로 고쳤습니다. 원문은 `enOriginal` / `koOriginal`에 보존했고 관련된 원본 1개와 재연결 후보 2개 모두를 함께 정정했습니다.
- 자동 문맥 초안 **2,728개**, 문맥 직접 작성 초안 **416개**, 원본 예문 재연결 후보 **328개**, 기존 자체 작성 **391개**, 원본 예문 **1,481개**를 보존했습니다.
- 이번 배치는 우선순위 높은 기초 단어들에 대한 **AI 자체 검수 및 교정**이며, 원본 전체 영어 예문·한국어 뜻의 독립 언어 감수나 저작권 허가를 의미하지 않습니다. 프로덕션 배포 차단은 유지됩니다.


## 추가 QA 배치 02 (2026-11-05)

- 고난도 단어장 DAY 1~3 자동 문맥 초안 **229개**를 실제 영어 사용 맥락이 있는 새 문장과 한국어 완전 번역으로 교체했습니다. 앞서 준비한 153개와 이번 76개를 합친 수입니다.
- `dressed in a suit`, `full-time work` 표제어와 `put forward`의 제안 의미 누락을 수정하고, 원본 영어·뜻은 그대로 추적합니다.
- 총 문맥 직접 작성 초안 **645개**, 남은 규칙 문맥 초안 **2,499개**, 출처별 원본 예문 **1,481개**, 기존 자체 작성 **391개**, 예문 재연결 후보 **328개**.
- 229개는 **AI 자체 작성·검토 초안**입니다. 독립적인 사람의 전수 언어 검수·원본 사용 허가·실기기 테스트는 여전히 미완료이므로 production 차단을 유지합니다.


### 배치 02 후속 뜻 점검

사전 용례와 대조하여 `full-time work`를 '정규직'이 아닌 '전일제 근무', `overqualified`를 학력만이 아니라 직무에 비해 과도한 자격·경력이 있는 상태로 교정했습니다. `default`의 대출 문맥을 '채무불이행'으로 명확히 하고 `send a notification`에 전자 알림 의미를 반영했습니다. `lag behind`의 예문·번역도 보다 자연스럽게 고쳤습니다. 변경 전 뜻은 `meaningKoOriginal`로 보존했습니다.

사전 참고: [Cambridge full-time](https://dictionary.cambridge.org/dictionary/english/full-time), [Cambridge overqualified](https://dictionary.cambridge.org/dictionary/english/overqualified), [Cambridge put forward](https://dictionary.cambridge.org/dictionary/english/put-forward). 이 대조는 전체 항목의 독립 감수 완료가 아닙니다.

## 추가 QA 배치 03 (2026-11-05)

- 800점 단어장 DAY 19~20의 자동 생성 예문 **39개**를 해당 단어의 품사와 뜻에 맞는 영어 문맥 문장과 한국어 완전 문장 번역으로 교체했습니다. `to that end`, `on the rise`, `file for bankruptcy`, `charge for`의 자동 템플릿 오류를 포함합니다.
- `profitable(<->unprofitable)` 표제어에서 반의어 주석을 제거하고, 네 단어(`charge for`, `piece by piece`, `proportion`, `up to`)의 뜻을 개선했습니다. 원문은 별도로 보존했습니다.
- 현재 합계: 원본 1,481개, 기존 프로젝트 작성 391개, QA 자체 작성 초안 **684개**, 예문 재연결 후보 328개, 규칙 문맥 초안 **2,460개**. 전체 검수 대기열 3,863개는 유지됩니다.
- AI 자체 작성·점검 초안이며 독립적인 사람의 전문 언어 감수, 콘텐츠 사용 권한, Android/iOS 실기기 검증은 완료되지 않았습니다. 프로덕션 배포 차단을 유지합니다.
