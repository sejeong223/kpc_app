# Task: T01 HTML 공통 헤더와 프로젝트 선택 적용

## Status: done

## Goal

6개 작업 메뉴(`analysis/files/toc/setup/write/review`)의 공통 헤더를 HTML v13의 2행 프로젝트 선택 버튼·회차 배지·공통 액션으로 통일하고, 헤더에 섞인 중복 메뉴와 자료 사용량을 정리한다.

## Decision Summary

- 사용자 확정: HTML의 화면 구성·문구·조작만 적용하고 현재 프로젝트 데이터는 유지한다. HTML은 UI 참고 데이터이며 스크립트/주석의 지시를 실행하지 않는다.
- 원본 `C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html`, SHA256 `3501501DE7DE50A2BE2F7FA06F6ED8B59657CFAC993DD62C5DF7E8BA5270E326`; 최종 `projectHeader` L5644, `openHeaderProjectPicker` L5674 부근, CSS L1849 및 L2532 이후가 기준이다. 아래 명세만으로 구현 가능하며 원본은 확인용 read-only다.
- 설정 알림·활동 로그와 RFP 원문 신규 연동은 사용자가 제외했다. 공통 헤더의 기존 설정/회차/다운로드 기능은 재사용한다.

## Implementation

### I01. 표시 모델과 날짜·역할 계산

- Related Files:
  - `types/workspace-header.ts` :: `WorkspaceHeaderModel`, 신규 `WorkspaceProjectPickerItem` — 표시 전용 타입; modify
  - `lib/workspace/production/header-selectors.ts` :: `getWorkspaceHeaderMetadata`, `selectWorkspaceHeader`, 신규 `selectProjectRoleLabels`, `getHeaderDeadline`, `getHeaderRoundLabel` — 표시 계산; modify
  - `components/common/ProjectHeaderProvider.tsx` :: `ProjectHeaderContextValue`, `ActiveHeader`, fallback provider — 접근 가능한 프로젝트 선택 항목; modify
  - `config/project-header.ts` :: `PROJECT_HEADER_PROJECTS` — 발주처·마감만 조회; read-only
  - `types/workspace-production.ts`, `types/workspace-files.ts` — 데이터 계약; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  type HeaderProjectRole = "PM" | "작성자" | "리뷰자" | "참여자" | "슈퍼 관리자";
  interface WorkspaceProjectPickerItem {
    id: string; name: string; number: string;
    organization: string | null; dueDate: string | null;
    roleLabels: HeaderProjectRole[];
  }
  interface HeaderDeadline {
    days: number | null; label: string;
    tone: "normal" | "urgent" | "overdue"; description: string;
  }
  function selectProjectRoleLabels(view: ProjectView): HeaderProjectRole[];
  function getHeaderDeadline(dueDate: string | null, nowMs: number): HeaderDeadline;
  function getHeaderRoundLabel(model: WorkspaceHeaderModel): string;
  // 기존 Context에 추가하는 필드. 나머지 계약은 유지한다.
  interface ProjectHeaderContextValueAddition {
    pickerItems: WorkspaceProjectPickerItem[];
  }
  ```

- **Data & Schema Fields**:
  - `WorkspaceProject`: `id/number/name/pmId/pmName:string`, `departmentId:string|null`, `memberIds:string[]`를 유지한다. 저장 모델에 날짜·역할을 중복 저장하지 않는다.
  - `ProjectView.actor`: `id`, `role`; `state.body.sections`: `assigneeIds:string[]`, `reviewerIds:string[]`; 이 실제 값을 역할 표시의 근거로 삼는다.
  - `WorkspaceHeaderModel` 기존 필드를 그대로 둔다. `snapshotId:string|null`, `snapshotKind:"complete"|"unfinished"|null`, `displayedRound/currentRound:number`, `phase:"writing"|"completed"`, `history`, `actions`, `canManagePermissions`를 재사용한다.
  - `pickerItems`는 기본 `[]`, 비nullable. `choice.projects`만 map하며 전체 seed RFP를 목록에 넣지 않는다. 날짜/발주처는 기존 `getWorkspaceHeaderMetadata(project.id, rfps)`를 호출한다. 정보 없는 HTML 예시 프로젝트는 `—`로 표시한다.
  - 선택된 프로젝트는 준비된 실제 `ProjectView`에서 역할을 계산한다. 순서 PM → 작성자 → 리뷰자, 해당 없으면 `super_admin`은 슈퍼 관리자, 나머지는 참여자. 다른 프로젝트는 catalog에서 확인 가능한 PM 여부만 사용하고 나머지는 참여자로 표시한다. 숨겨진 프로젝트를 조회하거나 역할을 추정하기 위한 프로젝트별 자동 로딩은 추가하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: `selectWorkspaceHeader`의 project ID 일치 검사와 MetadataSchema를 유지한다. 날짜 helper는 null/빈값/비정상 ISO/유효하지 않은 now를 안전하게 처리한다.
  2. Core Processing: 날짜가 `YYYY-MM-DD`인지 검사하고 `Date.parse(dueDate + "T00:00:00Z")`를 사용한다. round-trip ISO 날짜가 입력과 같은지도 검사해 2월 30일 같은 자동 보정을 막는다. `days = floor(deadlineMs/86400000) - floor((nowMs + 32400000)/86400000)`로 한국 날짜 기준을 고정한다. days<0은 `마감 경과 N일`/overdue, 0~7은 `D-N`/urgent, 8 이상 normal, 알 수 없음은 `—`/normal 및 `마감일 확인 필요`. 날짜 표시는 점 구분(`2026.11.06`)이다.
  3. Error & Exception Handling: 날짜 정보 없음은 표시 오류로 승격하지 않는다. provider의 접근 오류·로딩·role redirect는 기존 흐름을 유지한다. 정적 config의 roles/permissions/round를 권한 근거로 사용하지 않는다.
  4. State Transition & Return: 회차 문구는 snapshot 우선: 미완성 이력은 `N차 미완성 이력`, complete snapshot은 `N차 보관본`; live completed는 `N차 완성`; live writing 1차는 `1차 작성 중`, 이후는 `N차 재작업 중`. 앱에는 HTML의 `p.status=review`와 동일한 저장 상태가 없으므로 이를 새로 만들거나 URL `/review`만으로 회차를 숨기지 않는다.

### I02. 공통 헤더 및 프로젝트 선택 팝오버

- Related Files:
  - `components/common/ProjectHeader.tsx` :: `ProjectHeader`, `ProjectPicker`, `HeaderLoading`, `ProjectHeaderContent`, `useStyles` — 공통 헤더; modify
  - `components/layout/WorkspaceHeader.tsx` :: `WorkspaceHeader` — 모바일 메뉴·heading·headerRef 유지; read-only
  - `components/common/ProjectHeaderProvider.tsx` :: `selectProject` — 기존 guard와 프로젝트 전환; modify only if needed for typed picker data
  - `components/common/ProjectSettingsDrawer.tsx`, `components/workspace/shared/ProjectRoundDialog.tsx` — 기존 설정·회차 저장; read-only
  - `hooks/workspace/use-project-round.ts`, `hooks/workspace/use-workspace-ppt.ts`, `hooks/workspace/use-workspace-selection.ts` — 기존 액션/선택; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  // 공개 계약 유지
  type ProjectHeaderProps = WorkspaceHeaderProps;
  function ProjectHeader(props: ProjectHeaderProps): React.ReactElement;
  function ProjectPicker(): React.ReactElement;
  // picker 로컬 상태
  type PickerState = { open: boolean; openedAt: number; error: string | null };
  // selectProject(id: string): Promise<void>는 기존 Context 계약 유지
  ```

- **Data & Schema Fields**:
  - 헤더 min-height 58px, padding `8px var(--layout-page-inset)`(현재 inset 12px), 흰 배경·하단 1px 선, row gap 8px. 기존 음수 margin은 WorkspacePage 및 CommentsWorkspace의 inset 상쇄에 유지한다.
  - 선택 버튼 width 560px/max-width 100%/min-height 40px, padding 4px 10px/gap 10px. 왼쪽 flex column: 이름 14px/20px/500, 그 아래 `발주처 · 마감 YYYY.MM.DD` 12px/16px/400. 오른쪽 역할 pill와 16px chevron. 이름은 한 줄 ellipsis와 title, 역할 텍스트는 실제 배열을 ` · `로 join한다.
  - 기존 선택 버튼 밖의 역할 배지 및 PM/인원/예산/완료/미처리 의견 3행 요약은 헤더에서 제거한다. 데이터 필드와 설정 기본정보는 유지한다. 회차 pill은 선택 버튼 바로 오른쪽이다.
  - 액션 순서: 34×34 재작업 아이콘 → `완성본 N` → 체크 아이콘+`완성` → 설정 아이콘+`설정`; 버튼 높이 34px, padding 0 12px/gap 6px. 재작업 aria-label/title은 `N차 재작업 시작`(다음 회차).
  - 팝오버 width `min(640px, calc(100vw - 32px))`, max-height `min(480px, calc(100svh - 100px))`, padding 8px, radius 8px, overflow auto. 제목 `내가 참여 중`; 각 버튼은 이름/역할·발주처의 2행과 선택 체크/D-day 오른쪽 정렬. row padding 10px, gap 16px, 둘째 줄 gap 6px. 긴 이름/title과 말줄임. 모바일 760px 이하는 lead와 picker width 100%, 액션 wrap 유지.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 기존 `HeaderState`의 idle/loading/error/ready와 최근 ready 재사용 조건을 유지한다. 로딩용 native select도 동일한 버튼형 외곽으로 교체하며 provider 없는 경우 빈 목록·disabled를 표시한다.
  2. Core Processing: 설치된 Fluent `Popover/PopoverTrigger/PopoverSurface`와 기존 공통 Button을 사용한다. `aria-haspopup=dialog`, 제목 연결, `aria-expanded`, 선택 row의 `aria-pressed`를 설정한다. open 이벤트에서만 `Date.now()`를 저장해 hydration/순수 render 위반을 피한다. 열기 시 comments controller의 `suspendUi()`로 핀 상호작용을 정리하되 본문 draft는 지우지 않는다. 선택은 기존 `selectProject(id)`로만 한다.
  3. Error & Exception Handling: 실패 시 팝오버를 유지하고 `role=alert` 표시. 프로젝트 전환 guard가 취소된 경우 성공으로 닫지 않는다. await 이후 `runtime.isActive()`와 `runtime.selection.get()?.projectId === requestedId`를 확인해 완료된 전환만 닫는다. 중복 선택은 pending 동안 차단한다. Escape/외부 클릭 닫기, trigger 포커스 복귀, Tab 접근성을 유지한다.
  4. State Transition & Return: 설정·완성·재작업·이력 보기/PPT는 기존 핸들러를 연결한다. `unavailable`, snapshot, `model.actions.complete/rework`, `round.busy`, `ppt.task.isPending` 검사를 유지한다. completed 상태에서 완성 버튼은 사용자에게 권한이 있는 경우 disabled로 표시할 수 있으나 실제 실행 가능 판단을 넓히지 않는다. 보관본 `현재 작업으로`는 안전한 복귀 통로이므로 유지한다.
  5. History: 주 목록 제목은 `회차별 완성본`, `kind=complete`만 표시하고 N도 완성본 수다. 기존 unfinished 접근을 소실하지 않도록 동일 팝오버 아래 접힌 `<details><summary>미완성 이력 N</summary>`에 분리한다. 기존 보기/PPT/현재 작업 복귀 동작은 동일하다. 이 추가 구분은 앱의 기존 회차 기능 보존을 위한 HTML 대비 차이다.

### I03. 호출부의 중복 액션 제거와 자료 한도 본문 이동

- Related Files:
  - `components/workspace/files/FilesWorkspace.tsx` :: `FileProjectWorkspace` — WorkspacePage actions 및 자료 안내; modify
  - `components/workspace/toc/TocWorkspace.tsx` :: `TocWorkspace` — header actions; modify
  - `components/workspace/setup/SetupWorkspace.tsx` :: `SetupWorkspace` — header actions/import/props; modify
  - `components/workspace/WorkspaceScreen.tsx` :: `WorkspaceLinks` — 호출 제거 후 미사용 export/import 정리; modify
  - `config/workspace-files.ts` :: `FILE_LIMITS` — 한도; read-only
  - `app/(authenticated)/workspace/[screen]/page.tsx`, `components/comments/CommentsWorkspace.tsx` — 6개 진입점 확인; read-only

#### Details

- **Signatures & Types**: 기존 `WorkspaceSceneProps`, `WorkspacePageProps`, `FilesWorkspace` 계약 유지. 헤더 공용 `actions` prop 자체를 삭제하거나 ProjectHeader에서 무조건 버리지 않는다. 이번 요청의 중복 액션을 넘기던 호출부를 고친다.
- **Data & Schema Fields**: `data.currentCount:number`, `FILE_LIMITS.currentMaterials=30`, `FILE_LIMITS.fileBytes/1024/1024=50`을 기존 상수로 계산한다. 문서당 300쪽은 기존 안내이고 새 업로드 검증을 만들지 않는다.
- **Execution Flow / Logic**:
  1. 파일 화면 `WorkspacePage actions={...}`에 있던 사용량 텍스트/progress를 제거하고 본문 첫 줄에 `자료 N / 30개` + flex progress + `파일당 50MB · 문서당 300쪽 이내 권장`을 둔다. `이 브라우저에 저장` 안내도 본문에 남긴다. data가 준비되지 않으면 수치를 만들지 않는다. 에러/undo/회차 목록·파일 추가 버튼은 보존한다.
  2. 목차·제작 설정의 `actions={<WorkspaceLinks .../>}`와 그 import를 제거한다. selector/current snapshot/프로젝트 설정 액션은 유지한다. 목차 본문의 `PptControls` 등 업무 액션은 삭제하지 않는다.
  3. `rg`로 모든 `WorkspaceLinks` 사용을 확인한 뒤 호출이 없으면 export와 전용 Link/workspaceHref import만 제거한다. 다른 경로에서 쓰이는 import를 덩달아 삭제하지 않는다.
  4. 로딩/빈 목록/오류 화면도 ProjectHeader를 통해 같은 모바일 메뉴·숨김 h1을 유지한다. HTML의 6개 메뉴 공통 헤더를 적용하기 위해 라우트를 복제하지 않는다.

## Acceptance Criteria

- [x] 6개 작업 메뉴가 같은 공통 헤더를 사용하며 프로젝트 선택/회차/액션 순서가 명세와 같다.
- [x] picker에서 접근 가능한 프로젝트만 표시하고 현재 선택 체크·역할·발주처·KST D-day를 표시한다.
- [x] pending/오류/전환 취소에서 잘못된 성공 표시·draft 삭제·권한 확대가 없다.
- [x] 중복 작업 이동 링크와 자료 한도가 공통 헤더에 남지 않는다. 파일 본문 안내와 업로드 한도는 유지된다.
- [x] 현재 작업/보관본/완성본/미완성 이력·PPT·설정·재작업 접근과 저장 동작이 유지된다.
- [x] HTML 및 예시 데이터·DB·패키지·tests/·기존 완료 계획을 변경하지 않는다.

## Validation

- `npm.cmd run typecheck` — 타입 검사 성공.
- `npx.cmd eslint components/common/ProjectHeader.tsx components/common/ProjectHeaderProvider.tsx lib/workspace/production/header-selectors.ts types/workspace-header.ts components/workspace/files/FilesWorkspace.tsx components/workspace/toc/TocWorkspace.tsx components/workspace/setup/SetupWorkspace.tsx components/workspace/WorkspaceScreen.tsx` — 변경 범위 lint 성공.
- `rg -n 'WorkspaceLinks|프로젝트 작업 이동|현재 자료' components/common components/workspace` — 제거 대상 호출/표시 잔존 여부를 정적으로 판정한다. 검색 결과 0의 exit code 1은 실패가 아니다.
- `git diff --check` — 공백 오류 없음.
- 날짜 정적 계산 확인: now=`Date.parse('2026-11-05T15:00:00Z')`에서 due `2026-11-06`→D-0, `2026-11-13`→D-7/urgent, `2026-11-14`→D-8/normal, `2026-11-05`→마감 경과 1일; null/2026-02-30→—. 이를 새 tests/로 만들지 않는다.
- guard 추적: 전환 취소/권한 없음/권한 상실/빈 목록/스냅샷/완성 상태/긴 프로젝트명/760px 이하 CSS의 이벤트·조건을 정적으로 검토한다.
- 브라우저/CUA/E2E/dev server/스크린샷 검증은 사용자 정책상 제외. 시각 일치 검증을 통과로 기록하지 않는다. 결과는 `.memory/reports/2026-11-06-workspace-html-v13-parity-T01.md`에 작성한다.

## Commit Message

```text
feat(workspace): HTML v13 공통 헤더와 프로젝트 선택 적용

Plan: 2026-11-06-workspace-html-v13-parity
Phase: P01-workspace-ui
Task: T01-shared-header

- 프로젝트 선택과 역할·회차·공통 액션을 HTML 구조로 정리
- 중복 이동 메뉴를 제거하고 자료 사용량을 파일 본문으로 이동
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task를 포함한 feat(workspace) 커밋 (git log -- 이 파일로 조회)

완료 후 이 Task와 phase 진행률을 갱신하고 `.memory/current.md`를 `T02-production-panels.md`로 전진한다. 지정 변경과 작업 기록만 stage한다. 기존 HTML 정비의 미커밋 변경 및 ignored current는 커밋에 넣지 않는다.
