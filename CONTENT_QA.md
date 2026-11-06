# TOEIC Yellow 콘텐츠/기능 검수 이력 (2026-11-05)

## 현재 저장소에서 검증한 사실

- 학습 단어 **5,101개**, 중복 Anki note ID 0개, DAY 01~30 및 단어장 분류 유지
- 원본 예문 **1,481개**가 **1,238개** 단어에 연결됨. 원본 발음·악센트 깨짐 5건 복원
- 원본 예문이 없는 **3,863개** 단어 중 기존 PR #2 직접 작성 **391개**, QA 자체 작성 **3,176개**, 원본 예문을 다른 어휘에 재연결한 후보 **296개**, 자동 문맥 초안 **0개**
- 자동 생성한 **어휘를 인용부호로 언급하는 보조 문장 0개** (초기 버전 대비 개선)
- 잘못 표기된 CEO/CFO 약어 2개 교정. 원본은 `wordOriginal`로 기록, 학습 기록의 ID 유지
- 직접 작성 예문과 원본 예문도 **독립적인 전문가 언어 검수·사용 권한 확인은 미완료**
- 예문 재연결 후보는 앱 기본 화면에서 **숨김**. 학습자가 명시적으로 펼쳐 볼 수 있음
- 영어 뜻/품사/한국어 번역/영어 자연스러움에 대해 전체 어휘 개별 확증이 이뤄졌다는 주장은 하지 않음

## 구조 검수와 언어 감수의 차이

`python3 scripts/audit_content.py --check`는 단어 ID·분류·예문 수·빈칸·출처·검수 단계·검수 대기열 정합성을 검사합니다. 이것은 **문장이 자연스러운지, 단어 뜻과 맞는지, 한국어 뜻이 정확한지**를 확인하는 언어 검수가 아닙니다.

`data/content-review-queue.csv`에는 원본 예문이 없던 **3,863개** 항목을 모두 기록합니다. `data/qa-editorial-overrides.json`는 추가 직접 작성 3,176개와 재연결 후보 296개의 출처를 ID 기준으로 추적합니다. `data/word-suspects.csv`에는 의심되는 원본 표제어·관용구 사례가 남아 있습니다.

### 미완료 검증

1. 원본·프로젝트 작성·QA 작성 예문의 영어 예문, 뜻, 쓰임, 품사, 한국어 번역 전문 감수
2. 타 카드 원본 예문 재사용 후보 296개의 핵심 단어 의미 일치 검증
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

## 추가 QA 배치 04 (2026-11-05)

- 기초 단어장 DAY 6~10 **73개**, 800점 DAY 4 **39개**, 900점 DAY 4 **20개**, 합계 **132개** 규칙 문맥 초안을 사용 문맥에 맞는 영어 문장과 한국어 전체 번역으로 교체했습니다.
- `seamless(=without trouble)`, `ambiance(=ambience)`는 단어 표제어에 붙은 사전식 주석을 분리해 원래 `wordOriginal`을 남겼습니다. `array`, `in use`, `belong to`, `grocery`, `litter`, `fill with`, `key to success`, `reunion`, `seamless`, `directive`의 의미 누락 또는 부정확한 한국어를 교정했습니다.
- 사전 대조 자료: [Cambridge array](https://dictionary.cambridge.org/dictionary/english/array), [Cambridge litter](https://dictionary.cambridge.org/dictionary/english/litter), [Cambridge directive](https://dictionary.cambridge.org/dictionary/english/directive), [Cambridge grocery](https://dictionary.cambridge.org/dictionary/english/grocery), [Cambridge creditable](https://dictionary.cambridge.org/dictionary/english/creditable). **사전 원문 예문은 재사용하지 않았습니다.**
- 전체 수량: 원본 예문 1,481개, 기존 프로젝트 작성 391개, QA 작성 초안 **816개**, 예문 교차 연결 328개, 규칙 기반 자동 초안 **2,328개**. ID별 오버레이 **1,144개**, 검수 대기열 3,863개를 유지합니다.
- 새 문장의 인력 독립 검수, 원본 재배포·상용 라이선스, 실기기 테스트는 여전히 미완료입니다. Production 차단을 유지합니다.

## 추가 QA 배치 05 (2026-11-05)

- 기초 DAY 11 17개, 800점 DAY 5 28개, 900점 DAY 5 24개, 총 **69개** 자동 예문을 개별 영어 용례·한글 전체 문장 번역으로 교체했습니다.
- `fold in half`, `turn off`, `reach a solution` 표제어 3개와 `brand new`, `board meeting`, `work shift`, `give way to`, `on probation` 뜻 5개 교정; 원문은 보존했습니다.
- 참고: [Cambridge fold](https://dictionary.cambridge.org/dictionary/english/fold), [Cambridge reach](https://dictionary.cambridge.org/dictionary/english/reach), [Cambridge probation](https://dictionary.cambridge.org/dictionary/english/probation). 사전 원문 예문 복제 없이 자체 작성했습니다.
- 현재 5,101개 단어, 원본 예문 1,481개, 기존 프로젝트 직접 작성 391개, 추가 AI 초안 **885개**, 타 카드 원본 재연결 328개, 자동 문맥 **2,259개**, ID별 오버레이 1,213개, 비원본 검수 대기열 3,863개.
- AI 자체 작성과 자체 점검이며 사람의 독립 전문 언어 감수·원본 사용권 검증·실기기 시험은 진행되지 않았습니다. Production 배포 차단을 유지합니다.

## 추가 QA 배치 06 — 재연결 예문 의미 정합성 (2026-11-05)

- 원본 제공 예문을 다른 표제어에 재사용한 328개 후보를 점검하여 **32개에서 뜻·품사·동형이의어 사용 불일치**를 확인하고, 해당 단어 뜻에 맞는 새 영어 예문과 한국어 번역 초안으로 교체했습니다.
- 대표 사례: `second` (찬성하다/두 번째), `spoke` (바퀴살/말했다), `chair` (사회 맡다/의자), `change` (잔돈/변화), `fashion` (방식/의류), `express` (표현하다/특급의).
- 오연결 예문은 삭제하지 않고 `data/qa-batch-06-crosslink-review.json` 및 `replacedCrosslink`에 변경 전 출처·내용을 추적합니다. 기존 원본 Anki 예문 1,481개는 변경하지 않았습니다.
- `designed`, `estimated`의 한국어 뜻 보완. 사전 용법 참고: [Cambridge second](https://dictionary.cambridge.org/dictionary/english/second), [Cambridge chair](https://dictionary.cambridge.org/dictionary/english/chair), [Cambridge offering](https://dictionary.cambridge.org/dictionary/english/offering), [Cambridge fashion](https://dictionary.cambridge.org/dictionary/english/fashion). 사전 예문 복제 없음.
- 현재 학습 단어 5,101개, 원본 예문 1,481개, 기존 프로젝트 직접 작성 391개, QA 자체 작성 초안 **917개**, 재연결 검수 후보 **296개**, 규칙 기반 자동 초안 **2,259개**, 전체 비원본 3,863개. 독립 검수·권리 허가·실기기 검증 미완료로 배포 차단을 유지합니다.

## 추가 QA 배치 07 (2026-11-05)

- 기초 DAY 12~13 **30개**, 900점 DAY 6 **23개**, 합계 53개 자동 문맥 초안을 개별 영어 용례와 한국어 전체 번역으로 교정했습니다.
- `publication company` → `publishing company` (원문은 `wordOriginal`에 보존). `clothing line`, `iron`, `product logo`, `stay tuned`, `excursion`의 한국어 뜻 보완.
- 참고 자료: [Cambridge publishing company](https://dictionary.cambridge.org/dictionary/english/publishing-company), [Cambridge stay](https://dictionary.cambridge.org/dictionary/english/stay). 사전 원문 예문은 재사용하지 않았습니다.
- 5,101개 단어, 원본 1,481개, 기존 프로젝트 직접 작성 391개, QA 초안 **970개**, 교차 연결 검수 대기 296개, 규칙 문맥 초안 **2,206개**. 전체 비원본 검수 대기열 3,863개와 변경 전 PR #13의 교차 연결 원문 32개 추적 보존.
- 독립적인 사람의 영어·한국어 전문 감수, 원본 콘텐츠 재배포 허가, Android/iOS 기기 테스트는 여전히 미완료이며 production 배포 차단 유지.

## 추가 QA 배치 08 — 기존 예문 교차 연결의 한국어 뜻 검수 (2026-11-05)

- 원본 영·한 예문과 재연결 후보 296개 사이에 원본 표제어·영문·한국어 문장의 정확한 연결이 존재하는지 재확인하는 자동 감사 및 회귀 테스트를 추가했습니다.
- 실제 원본 문장은 그대로 유지하며, `supplement`, `repeat`, `developer`, `bring`, `avoid`, `maintenance` 등을 포함한 **16개 표제어의 한국어 뜻**에 원본 문장과 맞는 명사·형용사·숙어 의미를 추가했습니다.
- 각 변경의 ID·원래 뜻·새 뜻·예문 원본·출처·참고 링크는 `data/qa-batch-08-crosslink-senses.json`과 `data/original_text_corrections.json`에 기록했습니다. [Cambridge supplement](https://dictionary.cambridge.org/dictionary/english/supplement), [developer](https://dictionary.cambridge.org/dictionary/english/developer), [repeat customer](https://dictionary.cambridge.org/dictionary/english/repeat-customer)를 확인했습니다.
- 원본 예문 1,481개, QA 초안 970개, 기존 프로젝트 작성 391개, 교차 연결 대기 후보 **296개**, 자동 예문 2,206개, 비원본 검수 대기열 3,863개는 그대로입니다.
- 296개 출처 연결의 **기계적 정합성 검사**는 사람의 언어 감수·저작권 허가를 대체하지 않습니다. 원본 사용 권한, 독립 감수, 기기 시험 및 배포 차단 정책은 계속 유지합니다.

## 추가 QA 배치 09 — 기초 DAY 14 (2026-11-05)

- 기초 DAY 14에 남아 있던 규칙 기반 문장 17개를 문맥별 영어 예문과 한국어 전체 문장 번역으로 교체했습니다. 예를 들어 `span`은 강을 가로지르는 다리, `central`은 항공사 교육의 핵심인 승객 안전, `underwater`는 부두 점검에 쓰이는 수중 카메라를 문맥으로 삼았습니다.
- 새 예문은 ID별 QA 오버레이에서 `ai-authored-contextual-qa-batch09`로 추적합니다. 학습 카드 5,101개와 원본 Anki 예문 1,481개를 보존했습니다.
- 자체 작성 초안은 987개이며 규칙 기반 초안은 2,189개입니다. 새 예문은 독립 전문 감수 대기 상태입니다.

## 추가 QA 배치 10 — 기초 DAY 15~16 및 APKG 원문 대조 (2026-11-05)

- 기초 DAY 15와 16의 규칙 기반 예문을 각각 16개씩 영문 예문과 한국어 전체 문장 번역으로 교체했습니다.
- 제공된 예문 APKG와 앱의 원본 예문 1,481쌍을 카드별로 대조했습니다. 가져오기 스크립트와 같은 HTML·공백 정리 후 1,475쌍이 일치했습니다. 차이 6쌍은 기존 악센트 복원 5건과 기존 문법·번역 교정 1건입니다. 이번 배치는 기존 원본 예문을 그대로 보존했습니다.
- 새 예문은 독립 감수 대기 상태이며 전체 규칙 기반 예문 2,157개가 남아 있습니다.

## 추가 QA 배치 11 — 기초 DAY 17~18

- 기초 DAY 17의 규칙 기반 예문 20개와 DAY 18의 예문 22개를 물류·우편·외식 상황의 새 영어 예문과 한국어 문장 번역으로 교체했습니다.
- 원본 예문과 기존 재연결 예문을 보존했습니다. 규칙 기반 예문은 기초 230개, 800점 1,253개, 900점 632개로 합계 2,115개가 남아 있습니다.

## 추가 QA 배치 12 — 기초 DAY 19~20

- 기초 DAY 19의 규칙 기반 예문 18개와 DAY 20의 예문 19개를 새 영어 예문과 한국어 문장 번역으로 교체했습니다.
- `theme`의 한국어 뜻에서 ‘주체’를 ‘주제’로 바로잡았으며 기존 뜻은 `meaningKoOriginal`에 보존했습니다.
- 원본 예문과 기존 재연결 예문을 보존했습니다. 규칙 기반 예문은 기초 193개, 800점 1,253개, 900점 632개로 합계 2,078개가 남아 있습니다.

## 추가 QA 배치 13 — 기초 DAY 21~30

- 기초 단어장에 남아 있던 규칙 기반 예문 193개를 새 영문 예문과 한국어 전체 문장 번역으로 교체했습니다. 기초 카드 837개에는 규칙 기반 예문이 남아 있지 않습니다.
- `helping`의 음식 분량 뜻을 명확히 하고 `get off`에 교통수단에서 ‘내리다’라는 뜻을 추가했습니다. 이전 뜻은 `meaningKoOriginal`에 보존했습니다.
- 원본 및 재연결 예문을 보존했습니다. 남은 규칙 기반 예문은 800점 1,253개, 900점 632개입니다. 새 예문은 독립 감수 대기 상태입니다.

## 추가 QA 배치 14 — 800점 DAY 6~7

- DAY 6의 규칙 기반 예문 51개와 DAY 7의 예문 58개를 새 영어 예문과 한국어 전체 문장 번역으로 교체했습니다.
- `sport tournament`와 `over the lnternet`의 표기를 교정하고, `artifact`, `flower arrangement`, `sports tournament`, `verify`의 한국어 뜻을 보완했습니다. 이전 표기와 뜻은 해당 카드에 보존했습니다.
- 원본 및 재연결 예문을 보존했습니다. 남은 규칙 기반 예문은 800점 1,144개, 900점 632개입니다. 새 예문은 독립 감수 대기 상태입니다.

## 추가 QA 배치 15 — 800점 DAY 8

- 남아 있던 규칙 기반 예문 49개를 새 영어 예문과 한국어 전체 문장 번역으로 교체했습니다.
- `discounted rate`와 `forwarding address`의 한국어 뜻을 보완했습니다. 이전 뜻은 카드에 보존했습니다.
- 원본 및 재연결 예문을 보존했습니다. 남은 규칙 기반 예문은 800점 1,095개, 900점 632개입니다. 새 예문은 독립 감수 대기 상태입니다.

## 추가 QA 배치 16 — 800점 DAY 5, DAY 9~18

- 11개 DAY에 남아 있던 규칙 기반 예문 526개를 새 영어 예문과 한국어 전체 문장 번역으로 교체했습니다.
- 표제어 4개와 한국어 뜻 9개를 교정했습니다. 이전 표기와 뜻은 카드에 보존했습니다.
- 원본 및 재연결 예문을 보존했습니다. 규칙 기반 예문은 800점 569개와 900점 632개가 남았습니다. 새 예문은 독립 감수 대기 상태입니다.

## 추가 QA 배치 17 — 800점 DAY 19~29 (2026-11-06)

- 규칙 기반 예문 514개를 새 영어 예문과 한국어 전체 문장 번역으로 교체했습니다.
- 표제어 11개와 한국어 뜻 21개를 교정했습니다. 이전 표기와 뜻은 카드에 보존했습니다.
- 원본 및 재연결 예문을 보존했습니다. 규칙 기반 예문은 800점 DAY 30에 55개, 900점 단어장에 632개가 남았습니다. 새 예문은 독립 감수 대기 상태입니다.

## 추가 QA 배치 18 — 800점 DAY 30 및 900점 DAY 5, DAY 7~23 (2026-11-07)

- 800점의 마지막 규칙 기반 예문 55개와 900점의 규칙 기반 예문 457개를 새 영어 예문과 한국어 전체 문장 번역으로 교체했습니다.
- 표제어 4개와 한국어 뜻 35개를 교정했습니다. 이전 표기와 뜻은 해당 카드에 보존했습니다.
- 원본 및 재연결 예문을 보존했습니다. 남은 규칙 기반 예문은 900점 DAY 24~30의 175개입니다. 새 예문은 독립 감수 대기 상태입니다.

## 추가 QA 배치 19 — 900점 DAY 24~30 (2026-11-07)

- 마지막 규칙 기반 예문 175개를 새 영어 예문과 한국어 전체 문장 번역으로 교체했습니다. 전체 학습 카드 5,101개에 규칙 기반 예문은 남아 있지 않습니다.
- 표제어 1개와 한국어 뜻 22개를 교정했습니다. 이전 표기와 뜻은 해당 카드에 보존했습니다.
- 원본 예문 1,481개와 재연결 예문 296개를 보존했습니다. 새 예문은 독립 언어 감수 대기 상태입니다.
