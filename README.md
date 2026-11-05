# TOEIC Yellow · 노랭이 단어 학습 앱

사용자가 제공한 두 Anki 파일(`노랭이.apkg`, `노랭이_예문 기반.apkg`)을 Expo / React Native 학습 앱에 연결한 프로젝트입니다. 학습 흐름은 [HSK Plus Ultra](https://github.com/dh1180/HSK_Plus_Ultra)의 복습 정책과 카드 UI를 참고해 제작했습니다.

## 앱 기능

- 어휘 **5,101개**: 빈출 1,241개, 토익 기초 837개, 800점 2,033개, 900점 990개
- DAY 01~30 및 단어장별 학습, 10/20/30개 학습량 설정
- 복습 우선 큐와 `30분 → 3일 → 7일 → 21일 → 장기 기억` 간격 반복
- `알고 있음`/`다시 학습`, 현재 세션에서 오답 재출제와 중단 후 이어 학습
- 영·한 검색(악센트 없는 `resume` 검색도 지원), 진행률·카테고리별 통계
- 영어 단어/예문 TTS, 로컬 학습 기록 저장, JSON 백업·복원·초기화
- 문맥 예문 출처와 검수 상태 표시; **미검수 초안 기본 가림**

## 예문 콘텐츠 품질 · 중요

| 출처 | 단어 | 비고 |
| --- | ---: | --- |
| 제공 원본 예문 | 1,238개 | 원본 문장 1,481개 보존 |
| 직접 작성한 영문·한국어 예문 초안 | 366개 | 독립 검수 미완료 |
| 다른 카드의 제공 예문 재활용 후보 | 345개 | 뜻·용법 일치 미검수 |
| 규칙 기반 문맥 초안 | 2,973개 | 한국어는 뜻 참고, 문장 번역 아님 |
| 어휘를 인용하는 연습용 문장 | 179개 | **실제 용례 예문이 아님** |

**전체 5,101개의 단어와 한국어 뜻을 검색하고 학습할 수 있지만, 전체 영어 예문 및 번역이 정확하다는 의미는 아닙니다.** 생성 초안 중에는 부자연스럽거나 틀린 예문이 남아 있습니다. 앱은 이들을 기본적으로 숨기고 `검수 전 문장 보기`를 명시적으로 누를 때만 표시합니다. 독립적인 콘텐츠 전수 검수와 원본 자료의 권리 확인 전까지 상용 배포 준비 완료로 보지 않습니다.

자세한 결과와 문제 목록은 [콘텐츠 검수 보고](CONTENT_QA.md), `data/content_audit.json`, `data/structural_audit.json`, `data/example_review_queue.json`을 확인하세요.

## 실행

Node.js 24 권장.

```bash
npm install
npx expo start
```

Expo 터미널에서 `a`(Android), `i`(iOS/macOS), `w`(Web) 입력 또는 Expo Go로 QR코드를 스캔합니다.

```bash
npm test
npm run audit:content
npx expo export --platform web
```

GitHub Actions는 데이터/SRS 테스트 및 Expo 웹 번들 생성을 검사합니다. 웹 빌드가 성공하더라도 모바일 실기기 설치·백업·TTS 테스트를 대신하지 않습니다.

## Android 빌드

```bash
npx eas-cli build --platform android --profile preview
```

내부 테스트용 APK 프로필이 설정되어 있습니다. **production 빌드는 검수 대기가 남았으므로 의도적으로 차단**됩니다(`npm run release:check`). 외부 독립 검수/라이선스 검증 및 실기기 검증 후 배포 요건을 직접 충족시켜야 합니다.

## 데이터 출처와 재생성

원본 사용자가 제공한 학습 덱은 5,101개의 Anki note ID 및 DAY·단어장·한국어 뜻이 포함됩니다. 원본 예문 카드 1,481개는 빈출단어 순번에 따라 연결했습니다. 원본의 오디오 파일 약 83MB는 포함하지 않고 OS TTS를 사용합니다. 자체 작성 문장과 사용자가 제공한 문장은 출처별로 구분합니다.

```bash
python3 scripts/import_anki.py "노랭이.apkg" "노랭이_예문 기반.apkg"
python3 scripts/curate_examples.py
python3 scripts/audit_content.py --write
npm test
```

원본 데이터는 상용·공개 재배포가 허용된 것으로 확인되지 않았으므로 권리를 확인하기 전 재배포 범위를 검토해야 합니다. Anki 카드 ID를 변경하면 기존 학습 이력이 깨질 수 있으므로, 수정 시 `wordOriginal`을 이용해 표기 변경을 추적합니다.

## 프로젝트 구조

```text
App.jsx                         홈, 학습, 검색, 통계, 설정, 백업
src/data/words.json             어휘 5,101개·예문·검수 라벨
src/data/manifest.json          데이터 건수 및 콘텐츠 현황
src/lib/srs.js                  HSK 방식 간격 반복
src/lib/session.js              학습 큐·세션·백업 검증
src/lib/storage.js              기기 저장소
scripts/import_anki.py          Anki APKG 가져오기
scripts/curate_examples.py      예문 초안·출처·검수 대기열 생성
scripts/audit_content.py        전체 구조 감사
scripts/check-release.mjs       배포 검수 게이트
data/editorial_examples.tsv     직접 작성 문장/번역 초안
 data/example_review_queue.json 카드별 검수 대기열
 data/structural_audit.json     구조 검사 결과
 data/original_text_corrections.json  원문 표기 교정 이력
tests/                          기능·콘텐츠 회귀 테스트
.github/workflows/check.yml     GitHub Actions 검증
```

이 앱은 원본 출판사나 TOEIC 주관사의 공식 인증 제품이 아닙니다.
