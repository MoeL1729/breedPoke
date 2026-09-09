# v1.3 — 알에서 희귀 미뇽 부화

이 ZIP은 1세대 상대 146종과 타입 상성 패치까지 포함한 전체 소스입니다.

| 항목 | 변경 |
|---|---|
| 부화 확률 | 미뇽 1%, 기존 9종 각각 11% |
| 미뇽 육성 | 레벨 10 시작, 30에 신뇽, 55에 망나뇽. 실제 HGSS 기술과 최대 4칸 유지 |
| 부화 화면 | 확률 안내 변경, 미뇽 부화 시 RARE FRIEND · 1% 표시 |
| 저장 | 기존 저장 유지, 희귀 부화 결과도 즉시 저장, 예전 9마리 저장 형식 호환 |

수정 파일: `engine.js`, `app.js`, `index.html`, `data/pokedex.json`, `scripts/build_snapshot.py`, `tests/engine.test.js`, `README.md`, `CHANGELOG.md`, `package.json`. 미뇽·신뇽·망나뇽의 이미지와 데이터는 이전 1세대 확장판에 이미 포함되어 있습니다.

## GitHub에 반영

GitHub Desktop에서 기존 저장소 열기 → 압축 안 `pokemon-days-dratini-update` 폴더의 내용물을 기존 `index.html`이 있는 폴더에 덮어쓰기 → Commit → Push origin → Pages 배포 완료 후 Ctrl+F5.

이미 직전 1세대 확장판을 올렸다면 위 수정 파일만 같은 경로에 덮어써도 됩니다. ZIP 자체를 올리지는 마세요. 최초 설치라면 전체 폴더 내용물을 올리세요.

기존 포켓몬이 미뇽으로 바뀌지는 않습니다. 미뇽을 새로 만나려면 게임 안내 → 새 알로 시작하기를 사용하세요. 초기화 전 현재 저장을 백업할 수 있습니다. 확률은 매번 독립 1%이며 횟수 보장은 없습니다.

24개 엔진 테스트가 통과했습니다. 브라우저 시각 QA는 수행하지 않았습니다.

---

아래는 이전 버전 변경 내역입니다. 현재 부화 확률과 육성 후보 수는 위 v1.3 안내를 따릅니다.

# v1.2 — 1세대 상대 확장 및 타입 상성 패치

알 부화 업데이트까지 포함한 전체 소스입니다. 파일을 덮어쓰면 바로 적용할 수 있습니다.

## 요청별 변경

1. **상대 146종**: 전국도감 1~151에서 프리져, 썬더, 파이어, 뮤츠, 뮤를 제외했습니다. 9종의 육성 후보는 그대로입니다. 실제 HGSS 기술표·타입·종족값 및 앞/뒤 픽셀 이미지를 포함합니다.
2. **성장 구간**: 상대 레벨은 내 친구보다 0~2 낮게 선택합니다. 미진화형으로 시작해 중간형은 20 이상, 최종형은 36 이상부터 등장합니다. 실제 최소 진화 레벨이 더 높으면 그 레벨을 따릅니다(망나뇽 55). 2단계 계열은 중간형이 없어 36 이상에 최종형으로 넘어갑니다. 1세대 내 진화 없는 종은 20부터, 종족값 합계 450 이상인 종은 30부터 등장합니다. 자세한 종별 범위는 JSON의 `encounter` 필드에 있습니다. 이 범위는 게임 고유의 등장 정책이며 내 포켓몬의 진화 조건은 바꾸지 않았습니다.
3. **타입 데미지**: 기존 계산을 검증하고 복합 타입 배율(0·¼·½·1·2·4배), 같은 타입 기술 1.5배, 물리/특수 능력치 적용을 테스트했습니다. 발버둥이 고스트에게 막히거나 노말 보너스를 받던 예외를 수정했습니다. 전투 버튼에 배율, 상대 카드에 타입, 피해 로그에 계산 보너스를 표시합니다. 고정 피해와 변화 기술에는 일반 데미지 배율을 표시하지 않습니다.

## 바뀐 파일

| 파일 | 내용 |
|---|---|
| engine.js | 등장 후보 선택, 상성 안내, 발버둥 예외, 메타몽 변신 |
| app.js | 상대 타입과 기술 배율 표시, 안내, 버전별 데이터 로딩 |
| index.html | 새 버전 JavaScript/CSS 참조 |
| data/pokedex.json | 전체 149종, 369개 기술, 1,964개 학습 기록, 146종 상대 목록·등장 구간 |
| assets/sprites/ | 전체 데이터 149종의 앞/뒤 이미지 298장 |
| scripts/build_snapshot.py | 확장 데이터와 등장 구간 재생성 |
| scripts/fetch_sprites.py | 이미지 다운로드 재현 스크립트 |
| tests/engine.test.js | 22개 테스트 (기존 16개 + 이번 패치 6개) |
| README.md, package.json | 규칙·출처·사용법·버전 갱신 |

기존 23종의 기술·진화·타입·종족값 데이터와 기존 118개 기술 레코드가 변경되지 않았음을 비교 확인했습니다. 기존 저장은 유지하며 새 전투부터 새 상대 목록이 적용됩니다. 진행 중이던 전투는 기존 상대와 이어집니다. 새 알로 초기화할 필요가 없습니다.

## GitHub 반영 — GitHub Desktop 사용

1. GitHub Desktop에서 기존 게임 저장소를 엽니다. 처음이라면 File → Clone repository로 가져옵니다.
2. 압축 안 `pokemon-days-kanto-update` 폴더의 **내용물**을 저장소 폴더에 복사하고 같은 파일은 덮어씁니다. `index.html`은 저장소 최상위에 있어야 합니다. 압축 ZIP 자체를 올리지 마세요.
3. 변경 목록을 확인하고 Summary에 `Add Kanto opponents and type matchups` 입력 → Commit → Push origin을 누릅니다.
4. 기존 Pages 배포가 완료되면 게임을 새로고침합니다. 이전 화면이면 Ctrl+F5로 새로고침합니다. 브라우저 저장 데이터를 지울 필요는 없습니다.

Pages의 게시 폴더를 `docs/`로 사용 중인 저장소라면 내용물을 `docs/`에 덮어쓰세요. 기존 배포 위치에 맞추면 됩니다. 처음 Pages를 설정한다면 Settings → Pages → Deploy from a branch → main / (root) → Save로 설정합니다.

웹 업로드만 사용하려면 GitHub 저장소의 Add file → Upload files를 사용합니다. 한 번에 100파일 제한이 있으므로 `assets/sprites`는 해당 폴더 안에서 100개 이하씩 나누어 올리고, 마지막에 나머지 코드와 JSON을 올리세요. 전체 파일이 많아 GitHub Desktop이 편합니다.

GitHub 공식 안내:
- https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-and-forking-repositories-from-github-desktop
- https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 검증 및 범위

22개 엔진 테스트로 전 종 등장 가능성, 등장 레벨 경계, 실제 HP 데미지, 면역·STAB·고정 피해, 메타몽 변신, 전투 종료, 기존 알/진화/저장 동작을 확인했습니다. 모든 로컬 이미지 경로와 JS 문법을 확인합니다. 브라우저 시각 QA는 수행하지 않았습니다.

원작 전투 엔진의 완전한 재현은 아닙니다. 기존과 같이 특성·도구·날씨·일부 변화기와 부가 효과는 간소화합니다. 도감·습득 레벨·육성 진화 조건은 HGSS, 한국어 도감 설명은 X 버전 기준입니다. 상세 출처와 규칙은 README.md 및 JSON 메타데이터에 있습니다.
