# TOEIC Yellow 콘텐츠/기능 검수 이력 (2026-11-05)

## 현재 저장소에서 검증한 사실

- 학습 단어 **5,101개**, 중복 Anki note ID 0개, DAY 01~30 및 단어장 분류 유지
- 원본 예문 **1,481개**가 **1,238개** 단어에 연결됨. 원본 발음·악센트 깨짐 5건 복원
- 원본 예문이 없는 **3,863개** 단어 중 기존 PR #2 직접 작성 **391개**, 추가 직접 작성 **315개**, 원본 예문을 다른 어휘에 재연결한 후보 **328개**, 자동 문맥 초안 **2,829개**
- 자동 생성한 **어휘를 인용부호로 언급하는 보조 문장 0개** (초기 버전 대비 개선)
- 잘못 표기된 CEO/CFO 약어 2개 교정. 원본은 `wordOriginal`로 기록, 학습 기록의 ID 유지
- 직접 작성 예문과 원본 예문도 **독립적인 전문가 언어 검수·사용 권한 확인은 미완료**
- 자동 초안과 예문 재연결 후보는 앱 기본 화면에서 **숨김**. 학습자가 명시적으로 펼쳐 볼 수 있음
- 영어 뜻/품사/한국어 번역/영어 자연스러움에 대해 전체 어휘 개별 확증이 이뤄졌다는 주장은 하지 않음

## 구조 검수와 언어 감수의 차이

`python3 scripts/audit_content.py --check`는 단어 ID·분류·예문 수·빈칸·출처·검수 단계·검수 대기열 정합성을 검사합니다. 이것은 **문장이 자연스러운지, 단어 뜻과 맞는지, 한국어 뜻이 정확한지**를 확인하는 언어 검수가 아닙니다.

`data/content-review-queue.csv`에는 원본 예문이 없던 **3,863개** 항목을 모두 기록합니다. `data/qa-editorial-overrides.json`는 추가 직접 작성 315개와 재연결 후보 328개의 출처를 ID 기준으로 추적합니다. `data/word-suspects.csv`에는 의심되는 원본 표제어·관용구 사례가 남아 있습니다.

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
