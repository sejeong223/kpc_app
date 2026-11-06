# T05 HTML 예시 완성본/PPT 결과

초기 `createHtmlDemoBundle`은 currentRound1/phase=writing 상태에서 snapshots와 pptVersions를 비워 두었다. ProjectHeader는 history가 있을 때만 완성본 버튼을 표시하고, 각 snapshot.pptVersionId에 일치하는 저장된 버전이 있어야 PPT 버튼을 표시한다. 따라서 초기 예시에 보기/PPT가 없었다.

## 구현 결과

- HTML_DEMO_SLIDES와 동일한6장/모든 제목·리딩·항목을 포함한16:9 PPTX를 JSZip으로 생성한다. HTML 예시 전용이며 파일명은 `HTML_예시_1차_완성본.pptx`다. 문서 그래프에는 presentation/master/layout/theme/slide 관계가 포함된다.
- 이력 없는1차 HTML 예시에 원본 예시6장의 complete snapshot과 PPT 버전을 추가한다. 현재 사용자의 본문은 snapshot과 별도로 유지하며 파일/작업 회차를 함께2차로 옮긴다. 본문·목차·댓글 ID·자료·유효한 undo를 보존한다.
- ZIP/해시는 트랜잭션 밖에서 준비하고, 최신 상태를 다시 읽는 하나의 IndexedDB 트랜잭션에서 snapshot/version/Blob/작업/파일을 저장한다. 새로 열린 예시와 기존 브라우저에 저장된 예시 모두 같은 경로를 사용한다.
- 조건을 다시 확인하므로 동시 호출이나 재로드에도 한 번만 추가된다. 일반 프로젝트와 이미 이력이 있는 예시는 변경하지 않는다.
- 기존 헤더 `완성본 1 → 보기 / PPT`와 service.downloadPpt 경로를 그대로 사용한다. 화면 새로고침/프로젝트 재조회 시 반영된다. 참조 Downloads HTML은 변경하지 않았다.

## 검증

- typecheck, 전체 lint, production build, diff --check 통과.
- 파일을 만들지 않는 stdin fake-indexeddb/jsdom 검증13조건: 최초 생성, 동시 호출, 재로드, 실제 service.downloadPpt/해시,6장 모든 원문, XML/전체 관계 target 존재, 헤더/보관본 읽기 전용, 일반 프로젝트 제외, 기존 편집본 보존, 유효 undo 실행, 기존 완성 이력 보존,2차 완성/3차 재작업, 재작업 후1차 PPT 다운로드 유지.
- 기존 readTemplate으로 생성된15,764byte PPTX의6장과16:9 비율을 파싱했다. 실제 다운로드 서비스의 Blob 해시가 저장 버전과 일치했다.
- 브라우저·PowerPoint 시각/마우스 검증 및 tests/ 폴더 생성은 하지 않았다. 빌드의 기존 baseline-browser-mapping 갱신 안내 외 실패 없음.

## 알아야 할 점

완성 이력과 PPT는 별개다. 보관 snapshot만 있어도 보기 기능은 가능하지만, PPT를 다운로드하려면 실제 Blob과 해당 버전 링크가 함께 있어야 한다. 이번 변경은 예시에서 두 데이터를 함께 준비하며 기존 실제 완성 이력을 샘플로 교체하지 않는다.
