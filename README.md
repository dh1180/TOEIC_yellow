# TOEIC Yellow (노랭이)

사용자가 제공한 Anki 단어장 `노랭이.apkg` 및 `노랭이_예문 기반.apkg`을 학습할 수 있게 만든 Expo/React Native 앱입니다. 학습 흐름과 SRS는 [HSK Plus Ultra](https://github.com/dh1180/HSK_Plus_Ultra)의 구조와 규칙을 참고했습니다.

## 포함된 기능

- 빈출단어(1,241개), 토익 기초단어(837개), 800점(2,033개), 900점(990개)별 탐색
- DAY 01~30 단위 학습 또는 단어장 전체 학습
- 단어장별 진도·복습 대기·새 단어·장기 기억 통계
- 한 번에 10/20/30개 학습, 복습 기한 초과 단어 우선
- 영어 단어 → 터치해서 뜻·예문 공개 → `알고 있음` / `다시 학습`
- 30분 → 3일 → 7일 → 21일 → 장기 기억 간격 반복
- 오답은 현재 세션의 뒤로 재출제; 중단한 세션 이어하기
- 영단어·한국어 뜻 통합 검색, 원본 예문 여러 개 넘겨 보기
- 모바일/웹 영어 TTS (`en-US`, 시스템 음성 엔진)
- 로컬 저장, JSON 백업·복원, 확인 후 기록 초기화
- 데이터 출처·작성 문장 출처를 각 카드에서 구분

## 데이터 범위 및 주의 사항

| 구분 | 수량 |
| --- | ---: |
| 어휘 카드 | 5,101 |
| 원본 예문 카드 | 1,481 |
| 원본 예문이 연결된 어휘 | 1,238 |
| 직접 작성한 보조 학습 문장 연결 어휘 | 3,863 |

원본 예문은 Anki 덱의 DAY·어휘 순서 태그로 연결했으며 한 단어의 다의어 예문은 모두 보존합니다. **저장소에 포함된 사용자 제공 자료의 라이선스는 독립적으로 확인해야 합니다.** 상업적 공개·스토어 배포 전에 권리를 확인하세요.

중요: 원본 예문이 없는 3,863개 단어에는 문장이 비어 있지 않도록 **어휘를 언급하는 보조 학습 문장**을 작성해 두었습니다. 이들은 단어의 실제 문맥에서 쓰는 **용례 예문이 아니며**, 앱에서 검수 전 참고용이라고 명확히 표시합니다. 전문적인 문맥 예문으로 완전히 교체·전수 검증하지 않았으므로 이 버전을 *상용 콘텐츠 검수 완료*로 홍보하면 안 됩니다. 원본 Anki 예문도 철자·번역 전수 검수는 별도로 필요합니다.

원본 83MB 음성은 재배포하지 않고 OS의 TTS를 사용합니다. TTS가 없는 기기에서는 발음이 재생되지 않을 수 있습니다.

## 실행

Node.js **24** 환경에서 실행하세요.

```bash
npm install
npx expo start
```

Expo 개발 서버에서 `a`(Android), `i`(iOS/macOS), `w`(Web) 또는 Expo Go QR코드로 접속합니다. `npm test`는 외부 의존성 설치 없이 Node.js 24에서 데이터 및 복습 로직 회귀 테스트를 수행합니다.

```bash
npm test
npx expo export --platform web
```

EAS Android 내부 테스트용 APK 예시는 다음과 같습니다.

```bash
npx eas-cli build --platform android --profile preview
```

Expo/EAS 계정 연결과 실제 기기 검증은 직접 진행해야 합니다.

## 단어 데이터 재생성

원본 Anki 파일을 다시 가져올 필요가 있을 때에만 사용합니다. `zstd` CLI 또는 `pip install zstandard`가 필요합니다.

```bash
python3 scripts/import_anki.py "노랭이.apkg" "노랭이_예문 기반.apkg"
```

이 스크립트는 Anki `collection.anki21b` SQLite 원본을 읽고 `src/data/words.json`, `src/data/manifest.json`을 재생성합니다. 데이터에 사용되는 안정적인 ID는 Anki note ID이며, 원본 음성 파일과 사용자 학습 이력은 포함하지 않습니다. 재생성 시 Anki 노트 ID가 바뀌면 기존 앱 백업의 ID와 호환되지 않을 수 있습니다.

## 프로젝트 구조

```text
App.jsx                   홈·단어장·학습·검색·통계·설정·백업·복원
src/data/words.json       사용자 업로드 데이터 및 출처 표시
src/data/manifest.json    데이터 건수 검증
src/lib/srs.js            HSK 방식 간격 반복 정책
src/lib/session.js        복습 우선 큐·재출제·백업 검사
src/lib/storage.js        기기 저장소 연동
src/styles.js             노란색 테마
scripts/import_anki.py    APKG 추출·연결 및 참고용 문장 생성
assets/icon.png           앱 아이콘
```

## 검수 및 배포

`npm test`는 데이터 연결과 학습 로직을 검사하지만 실제 영어 뜻·예문의 정확성까지 증명하지 않습니다. 실제 휴대전화에서 화면, 발음, 앱 재시작, 백업 복원을 확인해야 합니다. 개인정보·스토어 등록 및 권리 검토 후 배포하세요.
