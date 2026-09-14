# POkegotchi v1.6 — 게임 화면 디자인

POKÉ DAYS의 표시 이름을 POkegotchi(포켓+다마고치)로 변경했습니다.

## 변경

- 메인 기술 4칸, 전투 선택, 새 기술, 기술 교체 화면에 실제 HGSS 타입 이미지와 17타입 색상 적용.
- 슬롯 번호와 물리/특수/변화, 위력, PP, 전투 상성 배율 표시.
- 휴대용 게임기처럼 보이는 화면 테두리와 눌리는 버튼 디자인.
- 작은 화면에서는 한 열로 배치하고 기술명/타입 이름을 함께 표시.
- 타이틀, 로고, 모달, 설명 문서와 데이터 제목 변경.

## 파일

`index.html`, `style.css`, `app.js`, `data/pokedex.json`(표시 제목만), `assets/types/`(17개 실제 타입 이미지), `scripts/fetch_type_images.py`, `scripts/build_snapshot.py`, README.md, CHANGELOG.md, package.json.

게임 엔진과 저장 키는 그대로입니다. 새 알 확률 27종, 미뇽/이브이 각5%, 7레벨 시작, 놓아주기, 진화 및 기술4칸 등 직전 기능은 유지됩니다.

## GitHub 업로드

압축 안 pokegotchi-ui-update 폴더의 내용물을 기존 index.html 위치에 덮어씁니다. **assets/types 폴더도 포함**하세요. GitHub Desktop에서 Commit → Push origin 후 Pages 배포가 완료되면 Ctrl+F5.

기존 사이트 주소를 그대로 사용하면 저장된 포켓몬을 이어서 키웁니다. 이번 업데이트를 적용하기 위해 새 알로 초기화할 필요가 없습니다.

JS 문법, 17개 PNG와 참조 경로 및 engine.js가 이전 버전과 동일함을 확인했습니다. 브라우저 시각 QA는 수행하지 않았습니다.
