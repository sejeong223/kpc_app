# Plan: 작업 메뉴 공통 상단바·상태 연결과 파일 업로드 개선

- Date: 2026-11-04
- Status: done
- Decision: [확정 결정](../decisions/2026-11-04-workspace-shared-header-files.md)
- Source baseline: 1049094
- 실행: 최초 계획 이후 2026-11-04 memory-execute 요청에 따라 전체 구현·검증 완료. 모든 Task를 한 번에 커밋하며 push는 하지 않는다.

## Goal
동료 제작 화면을 유지하면서 AI 분석·파일 업로드·목차·제작 설정·제작·리뷰의 선택 프로젝트와 회차를 일치시킨다. 파일·목차의 기존 데이터를 보존하고, 화면 전체 핀 코멘트를 프로젝트/회차에 저장한다. 공통 상단바의 권한·완성·재작업·이력과 파일 업로드 UX를 연결한다.

완료 기준:
- 6개 경로에서 동일 프로젝트·회차·권한과 이력을 사용하고 메뉴별 헤더가 중복되지 않는다.
- 과거 파일 Blob, 슬라이드 코멘트, 완성본, 기존 production-preview 의견을 유실하지 않는다.
- 신규 화면 핀과 슬라이드 의견을 구분하며, 화면 핀 상태 변경은 작성자·PM·슈퍼 관리자만 가능하다.
- 권한 여러 행은 한 명령/트랜잭션으로 저장하고 완료/재작업은 파일과 의견까지 함께 보존한다.
- 파일 추가 → 탐색기 → 설정 흐름, 웹 기간·우선순위 표시, 브라우저 저장 안내를 제공한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | done | 동일 기능의 데이터 계약부터 UI·검증까지 순차 연결 | [P01](../phases/2026-11-04-workspace-shared-header-files/P01-shared-workspace/phase.md) |

## Tasks and Dependencies
- T01-canvas-state-compatibility: 화면 핀 저장 모델과 기존 데이터 호환. 선행: 없음.
- T02-canvas-commands-rounds: 화면 코멘트 명령·권한·회차 보존. 선행: T01-canvas-state-compatibility.
- T03-header-data-grants: 헤더 조회 모델과 권한 일괄 저장. 선행: T02-canvas-commands-rounds.
- T04-shared-selection-runtime: 공통 공급자와 6개 메뉴 선택 동기화. 선행: T03-header-data-grants.
- T05-colleague-comment-bridge: 동료 핀 UI와 프로젝트 코멘트 연결. 선행: T04-shared-selection-runtime.
- T06-shared-project-header: 6개 메뉴 공통 상단바 적용. 선행: T05-colleague-comment-bridge.
- T07-project-permission-settings: 조회용 기본정보와 권한 저장 화면. 선행: T06-shared-project-header.
- T08-round-history-actions: 완성·재작업·회차 이력 연결. 선행: T07-project-permission-settings.
- T09-file-upload-usability: 파일 선택 흐름과 자료 표시 개선. 선행: T08-round-history-actions.
- T10-integration-validation: 통합 검증과 기획 대응 기록. 선행: T09-file-upload-usability.

## Architecture
- 기존 WorkspaceProjectProvider를 인증 레이아웃의 AppShell 위로 올려 사이드바·헤더·본문이 같은 runtime을 사용한다. workspace/layout의 중복 provider를 제거한다.
- 기존 useWorkspaceSelection의 구현을 WorkspaceSelectionProvider 한 곳으로 옮긴다. 공개 훅 이름은 유지하여 소비 코드 변경을 줄인다. 프로젝트 URL 파싱은 6개 대상 화면에서만 수행한다.
- 신규 화면 핀은 RoundBody.canvasComments에 저장한다. 기존 RoundBody.threads는 슬라이드 의견으로 유지한다. 별도 원본 코멘트 DB는 읽기 전용 보관함만 읽는다.
- 작업 레코드 schemaVersion은 2로 올리고 저장 읽기 경계에서 검증한 v1을 v2로 변환한다. IndexedDB object store/index가 바뀌지 않으므로 DB_VERSION은 유지한다. 구버전 실행 코드는 v2 레코드를 엄격한 검증에서 거부하여 새 필드를 덮어쓰지 못한다.
- 기존 CommentController/핀·팝업에 repository bridge와 UI capability를 연결한다. 새 자료 조회·명령은 TanStack Query 경유다. 기존 컨트롤러를 새 API 호출 구현으로 복제하지 않는다.
- 상단바는 표시용 ProjectHeaderData와 별도로 typed shared model을 추가한 뒤 공통 Context를 전환한다. 권한·현재 회차는 동료 mock에서 가져오지 않는다.
- 권한은 set-grants-batch 명령으로 일괄 저장한다. 기존 set-grants도 유지하여 인접 기능을 깨뜨리지 않는다.
- 현재회차/과거이력을 구분한다. 파일은 보관본의 fileEntries로 당시 자료 버전을 선택한다. 현재 쓰기 작업으로 과거 이력을 수정하지 않는다.

## Scope Boundary
포함: 위 10개 Task, 6개 메뉴 상단바·선택·접근 기준, 동료 핀 UI 데이터 연결, 권한 저장, 파일 UI.
후속: AI 분석/리뷰 본문, RFP 등록 자료 자동 연계, 기본정보 수정, 알림 발송/설정 저장, 프로젝트 활동 로그, 실제 Cosmos/파일 서버·공유 저장, 기존 새 제작 편집기 복원.
관리자 메뉴와 RFP 등록의 여백/하단 등록 버튼은 이번 작업으로 변경하지 않는다.

## Validation Policy
- tests/ 생성·복원 금지. 브라우저/CUA/E2E/스크린샷/육안검증/검증용 dev server 사용 금지.
- Task별 npm run typecheck와 관련 lint/정적 검토, 최종 npm run lint/build 및 저장소 인라인 검증을 수행한다.
- 인라인 검증은 기존 node --require tsx/cjs 및 fake-indexeddb의 독립 IDBFactory를 사용한다. 사용자 실제 DB를 열지 않는다. 검증 코드를 tests/나 임시 프로젝트 파일로 만들지 않는다.
- 이 계획 작성 시 자동 검증을 실행하지 않았다. 계획 문서의 링크/필수 항목/변경 범위만 확인한다.

## Commit Policy
계획 시 각 Task에 독립 커밋 메시지를 명시했다. 실행 시 최신 사용자 요청에 따라 모든 Task를 최종 단일 커밋에 포함하며 push는 하지 않는다. 초기 미추적 파일인 이전 비교 보고서와 확정 결정도 출처로 보존한다.

## Risks Fixed in Blueprints
- provider를 두 군데 두면 선택·guard·BroadcastChannel이 갈라진다.
- old comment controller는 생성 명령에 담긴 threadId를 곧바로 선택한다. bridge에서 임의 ID 재발급을 하면 새 팝업이 열리지 않는다.
- 슬라이드 없는 화면 핀을 가짜 slideId로 연결하지 않는다. 과거 슬라이드 의견도 canvas로 재해석하지 않는다.
- 권한 일괄 저장을 mutate 루프로 구현하면 일부 행만 저장되고 revision 충돌이 난다.
- runtime.navigate 내부에서 다시 navigate를 호출하면 guard가 반복된다. 내부 commitSelection과 사용자 진입 choose를 분리한다.
- 과거 파일 회차의 현재 entries와 완성 당시 snapshot.fileEntries는 같다고 가정하지 않는다.
- 계획 도중 새 외부 연동이나 범위 확대가 필요한 문제는 발견하지 않았다. 이미 확인한 후속 사항은 Task에 추가하지 않는다.

## Progress
- done: 10/10
- next: 없음


## Completion
- T01~T10 완료, 다음 Active Task 없음.
- [기획 대응표·최종 검증](../reports/2026-11-04-workspace-shared-header-files-validation.md).
- typecheck, lint, build, diff 및 인메모리 검증 통과. 브라우저 검증 미실행.
