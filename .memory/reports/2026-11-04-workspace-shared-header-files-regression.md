# 작업 메뉴 공통 상단바·파일 업로드 전체 회귀 검증

> 후속 재검증 완료: 실패 50개 재확인, 추가 결함 4건 수정, 전체 653개 테스트·15개 격리 검증 및 최종 빌드 결과는 [최신 전체 구현 감사](./2026-11-04-full-implementation-audit.md)를 따른다. 아래 결과는 최초 검사 당시의 이력이다.

- 일자: 2026-11-04
- 기준: `63f7e3b94a8bfff25f3d616262e58814168c4ab2` 및 이번 수정 작업 트리
- 요청: “잘 구현되었는지 full 회귀 검증해줘”
- 판정: 실제 결함 4건을 재현해 수정했다. 타입·lint·빌드 및 현재 구조로 구성한 도메인/저장소/jsdom 검증은 통과했다. **기존 npm test는 648개 중 50개 실패하므로 전체 테스트가 모두 통과한 상태는 아니다.**
- 수정 파일 5개. 커밋·push 없음.

## 1. 발견한 결함과 수정

### R01. 파일 편집 초안이 상단 정보 재조회 오류로 사라짐 — 수정

- 파일 설정을 열어 내용을 입력한 상태에서 프로젝트 Query만 실패시켰다.
- 기존 FilesWorkspace는 Header의 currentRound/phase를 자식 key에 포함했다. Header가 error가 되면 이 값들이 undefined로 바뀌어 FileProjectWorkspace 및 편집창을 재생성했다.
- key를 명시적인 projectId/snapshotId로 제한했다. 다른 창의 회차 변경도 편집창을 없애지 않으며, 저장은 기존 baseRound/baseRevision 검증으로 거부한다.
- 재현: 수정 전 input이 사라짐. 수정 후 동일 input 노드와 입력값 유지.
- 실제 FilesWorkspace + ProjectHeaderProvider + Query + 격리 IndexedDB에서도 웹 링크 입력 → 조회 실패 → 복구 → 저장까지 통과.
- 파일: `components/workspace/files/FilesWorkspace.tsx:24`

### R02. 프로젝트 선택 실패가 현재 프로젝트와 이후 메뉴까지 계속 차단함 — 수정

- 다른 프로젝트 선택 저장을 실패시키면 mutation.error가 공통 선택 error에 남았다. 현재 프로젝트로 다른 메뉴를 이동해도 이 에러가 계속 노출되어 액션을 막았다.
- 공통 상태는 현재 URL·접근권한·조회 오류만 사용한다. 선택 명령의 실패는 기존 호출부 catch에서 표시한다. 실패한 이동은 기존 선택을 보존한다.
- 현재 프로젝트 유지, 메뉴 이동 후 이용 가능, 다음 선택 성공, 접근 불가/중복 파라미터/없는 snapshot 거부 및 정상 URL 복구를 검증했다.
- 파일: `components/workspace/WorkspaceSelectionProvider.tsx:82`

### R03. 다른 창의 회차 변경으로 열린 설정과 권한 초안이 사라짐 — 수정

- ProjectHeaderContent의 key에 currentRound가 포함되어 있어 상단바가 회차 변경을 받으면 Drawer 전체를 초기화했다.
- key를 projectId/snapshotId로 제한했다. 권한 편집 hook의 기존 stale 검증을 유지하여 초안은 남기고 오래된 revision의 저장을 막는다.
- 원본 커밋의 헤더를 메모리에서 실행한 전후 비교: 기존은 Drawer input 소실, 수정 후 유지.
- 실제 파일 화면의 권한 Drawer에서 체크박스 수정 → 외부 start-round → 체크값 유지/저장 비활성 → 다시 불러오기 취소/폐기 → 배치 저장까지 통과.
- 파일: `components/common/ProjectHeader.tsx:53`

### R04. 저장 완료 후 재조회 실패를 저장 실패로 오인하여 코멘트 중복 제출 가능 — 수정

- 저장소에는 코멘트가 추가되었는데, 후속 조회/다른 창 알림이 실패하면 controller는 저장 실패로 처리하고 새 의견 초안을 남겼다.
- Runtime의 후속 알림 실패가 확정된 저장 결과를 바꾸지 않게 했다. 화면 Query 재조회 오류는 그대로 표시한다.
- 코멘트 adapter는 재조회를 성공 응답의 필수 조건으로 사용하지 않고, 검증된 저장 receipt의 state로 응답한다.
- 실제 IndexedDB commit 직후 production read를 실패시키는 결함 주입으로 확인: 수정 전 `ok:false` + 저장된 의견 + 남은 초안, 수정 후 `ok:true` + 저장된 의견 + 제출 초안 정리.
- 실패한 실제 쓰기·revision 충돌·읽기 전용 검증은 계속 오류로 처리한다.
- 파일: `services/workspace/createWorkspaceRuntime.ts:136`, `hooks/workspace/use-canvas-comments.ts:25`

## 2. 검증 결과

| 검증 | 결과 |
| --- | --- |
| npm run typecheck | 통과 |
| npm run lint | 통과 |
| npm run build | 통과, Next.js 16.0.10 production build |
| git diff --check | 통과 |
| 기존 npm test -- --reporter=dot | 84개 파일 중 78 통과/6 실패, 648개 중 598 통과/50 실패 |
| 현재 구조의 재현 검증 프로그램 9개 | 통과 |

빌드의 baseline-browser-mapping 데이터 갱신 안내는 기존 비차단 경고이며, 이 검증에서 의존성을 변경하지 않았다.

### 현재 구조의 검증 범위

- 도메인: 작성자/다른 사용자/PM/슈퍼 관리자 권한, 멘션·좌표·ID 검증, stale revision, 원본 불변, complete/unfinished 보관과 미처리 의견 계승.
- 권한: 배치 전체 검증·실패 원자성, PM/슈퍼 관리자 고정 권한, 저장 충돌, Drawer의 명시적 초안 폐기/유지.
- 저장소: 독립 IDBFactory, 구형 v1 읽기 무변경/첫 쓰기 v2 저장, 파일 원본 Blob 보존, 사용자 namespace 분리, 손상 데이터의 자동 seed 대체 방지.
- 이력: snapshot에 기록된 정확한 파일 버전 사용, 누락된 버전 거부, 과거 회차 쓰기 금지, 완성/재작업.
- React/Query: StrictMode 수명주기, 실제 코멘트 저장, 프로젝트 이동 확인의 취소/폐기, 프로젝트 분리, 배경 조회 오류 후 동일 controller와 초안 복구.
- 실제 컴포넌트: FilesWorkspace와 공통 Header, 웹 링크 등록, ProjectSettingsDrawer의 체크박스/재조회/저장.
- 실제 제작 컴포넌트: CommentsWorkspace, 핀 키보드 생성, 한글 조합 Enter 비제출, 의견/답글 등록, 완료/다시 열기, 완성 회차의 본문 읽기 및 쓰기 액션 미노출.
- 파일 선택: 동기 input.click 호출, native cancel 이벤트 처리, 동일 File 재선택, 캡처한 project/round/revision 보존.
- 입력 경계: 허용 확장자 10종, 빈 파일·미지원 확장자·제어문자, 정확히 50MB 허용/초과 거부, 비 HTTP URL·자격증명 포함 URL 거부.

재현 소스와 표준 입력 실행 명령: [검증 재현 코드](./2026-11-04-workspace-regression-checks.md).

## 3. 기존 자동 테스트 실패 50개 분류

기존 테스트를 임의 수정하거나 성공 처리하지 않았다. 실패 위치와 현재 코드를 대조한 분류다. 이 표는 해당 기능 전체가 무결함이라는 판정이 아니다.

| 기존 파일 | 실패 수 | 확인한 원인 |
| --- | ---: | --- |
| tests/config/sidebar.test.ts | 11 | 과거 14개 메뉴와 순서를 기대한다. 현재 리뷰/완료한 제안이 포함된 카탈로그와 불일치 |
| tests/components/admin/dashboard-ux.test.ts | 10 | 과거 4개 탭/공통 상단 카드/라디오 구성을 기대한다. 현재 5개 탭과 이동한 카드 구성에 맞지 않는 조회 |
| tests/app/workspace/screen.test.ts | 5 | 페이지를 Provider 없이 단독 SSR하거나 제거한 h1을 기대한다. 등록은 AuthRuntime, analysis/toc/setup은 HeaderProvider 필요 |
| tests/app/authenticated-layout.test.ts | 1 | next/navigation mock에 useRouter/useSearchParams가 없고, 프로젝트 로드 전부터 코멘트 controller가 존재한다고 가정 |
| tests/lib/comments/shell-ui.test.ts | 3 | 실제 사이드바가 요구하는 ProjectHeaderProvider 없이 렌더링 |
| tests/lib/comments/workspace-ui.test.ts | 20 | useComments mock에 현재 필수 capabilities가 없어 readOnly 접근에서 실패 |
| 합계 | 50 | 기존 검증 fixture/단언의 갱신 필요 |

- 사이드바 카탈로그와 dashboard 소스는 검증 대상 커밋 `63f7e3b`에서 변경되지 않았음을 git diff로 확인했다.
- 새 프로젝트 코멘트는 프로젝트/회차의 비어 있는 저장소에서 출발한다. 과거 전역 seed 코멘트를 기본 데이터로 가정한 테스트를 그대로 새 계약의 통과 근거로 사용할 수 없다.
- 이번에는 현재 Provider·권한·Query 계약에 맞춘 격리 검증을 추가했다. 기존 50개 실패는 남아 있으므로 npm test를 전체 통과로 기록하지 않는다.
- 전체 실행 원문: [최종 Vitest 로그](./2026-11-04-regression-vitest-final.log).

## 4. 범위와 제한

- 기존 사용자 지시대로 실제 브라우저/CUA/E2E/스크린샷/육안 비교/dev server를 실행하지 않았다.
- jsdom은 상태·이벤트 연결 검증이다. 시각적 배치, 실제 파일 선택 OS 창, 네이티브 IME/터치/드래그의 실기기 동작을 확인한 것은 아니다. 제작 UI의 영역 계산에는 고정된 DOM 측정값을 사용했다.
- tests/ 생성·복원·수정 없음. 이미 존재하던 테스트만 실행했다.
- 로컬 독립 IndexedDB를 사용했다. 실제 사용자 저장소·Azure·Cosmos DB 리소스에는 접근하거나 변경하지 않았다.
- Cosmos DB/실제 계정의 공유 데이터·권한 동기화는 이번 로컬 mock 구현의 검증 범위 밖이다.
- 후속 검증 유지보수: 테스트 폴더를 생성·복원하지 않는 사용자 정책 안에서 기존 단언과 fixture를 현재 계약에 맞춰 정리할 필요가 있다.

