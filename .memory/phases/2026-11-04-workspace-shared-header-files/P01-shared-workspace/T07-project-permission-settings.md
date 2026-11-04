# Task: T07 조회용 기본정보와 권한 저장 화면

## Status: done

## Goal
공통 설정 Drawer에서 실제 참여자별 다섯 권한을 편집하고 한 번에 저장한다. 기본정보는 읽기 전용, 알림/로그는 미연결 상태로 유지한다.

## Decision Summary
- 선행 T03 set-grants-batch, T06 typed header/settings props를 사용한다.
- PM/슈퍼 관리자만 편집 가능하고 이들의 전체 권한은 고정이다. 부서 관리자 자동승격이나 권한부여 재위임은 없다.
- 화면 초안과 저장 상태를 구분하며, 충돌/실패 시 사용자 입력을 보존한다.

## Implementation

### I01. 초안 모델과 변경 계산
- Related Files:
  - hooks/workspace/use-project-permissions.ts :: useProjectPermissions — new
  - lib/workspace/production/grant-drafts.ts :: createGrantDraft, changedGrantRows — new
  - components/common/ProjectSettingsDrawer.tsx :: 권한 탭 — modify
  - types/workspace-header.ts :: ProjectPermissionDraft — 추가
  - lib/workspace/production/permissions.ts :: canManageProject — reuse
#### Details
~~~typescript
interface ProjectPermissionDraft {
  projectId: string;
  baseRevision: number;
  baseRound: number;
  rows: ProjectGrant[];
}
function createGrantDraft(view: ProjectView): ProjectPermissionDraft;
function changedGrantRows(
  baseline: readonly ProjectGrant[], next: readonly ProjectGrant[]
): ProjectGrant[];
~~~
- Drawer를 열 때 raw view의 projectId/revision/currentRound를 한 번 캡처한다. baseline은 현재 멤버 중 위임 가능한 행의 grants를 사용하고, 부여된 값이 없으면 permissions=[]로 만든다.
- 행 순서는 catalog.members, 권한 열 순서는 outline(목차 구조), assign(담당 지정), setup(제작 설정), complete(완성), rework(재작업). UI 체크 변경은 local rows만 바꾼다.
- PM과 role=super_admin은 고정 행으로 전체 권한을 표시하고 체크박스 편집을 막는다. batch payload에는 포함하지 않는다. 프로젝트 멤버가 아닌 슈퍼 관리자도 관리할 수 있지만 없는 사용자 행을 억지로 추가하지 않는다.
- changedGrantRows는 permissions를 enum 순서로 정규화하여 집합 비교한다. 순서만 달라지면 dirty=false다. baseline에 없는 멤버나 중복 행은 VALIDATION이며 멤버 구성 변경은 다시 불러와 검토한다.
- 변경 행이 없으면 저장하지 않는다. 하나의 useWorkspaceCommand.mutateAsync로 {projectId,expectedRevision:baseRevision,expectedRound:baseRound,operation:{type:"set-grants-batch",grants:changes}}를 보낸다.
- 성공한 경우에만 baseline을 receipt.state로 갱신하고 공통 query를 invalidate한다. isPending으로 연속 저장을 막고, 이전 사용자/프로젝트의 응답은 새 범위에 적용하지 않는다.
- 배경 refetch의 revision/멤버 변경이 dirty draft와 충돌하면 baseline을 자동 재설정하지 않는다. “프로젝트가 변경되었습니다. 다시 불러온 뒤 검토해 주세요.”와 다시 불러오기 경로를 제공한다. 초안을 검토 없이 최신 revision에 붙여 재시도하지 않는다.
- 관리 권한을 잃으면 저장/편집 action을 렌더링하지 않고 명령도 거부한다. 초안은 오류와 함께 유지하다 명시적 폐기에서만 제거하며 다른 프로젝트로 복사하지 않는다.

### I02. 설정 패널·닫기·기존 권한 진입 통일
- Related Files:
  - components/common/ProjectSettingsDrawer.tsx :: info/permission/notification/log tabs — modify
  - components/workspace/toc/ProjectPermissionDialog.tsx :: 기존 권한 UI — 삭제/재사용 정리
  - components/workspace/toc/TocWorkspace.tsx :: 권한 진입 — 중복 제거 확인
  - components/common/ProjectHeader.tsx :: drawer open/close callbacks — modify
  - hooks/workspace/use-workspace-draft-guard.ts, components/workspace/files/FileDiscardDialog.tsx — reuse
  - components/ui/DadamControls.tsx, lib/ui/dadam-theme.ts — read-only/reuse
#### Details
- 기본정보는 프로젝트명/번호/PM/멤버/발주처/마감/예산을 text/dl로 표시한다. 저장할 수 없는 입력 필드를 만들지 않는다.
- 권한 탭은 실제 체크 변경과 저장/다시 불러오기를 제공한다. 읽기 전용 사용자에게 편집 action을 노출하지 않는다. PM/super에는 “전체 권한 · 고정”을 함께 표시한다.
- 알림/활동 로그 탭은 “아직 연결되지 않았습니다.”와 읽기 전용 빈 상태로 둔다. 가짜 알림 체크, 다른 프로젝트 시연 로그, 가짜 저장 성공 toast를 제거한다.
- useWorkspaceDraftGuard({dirty,busy,onDiscard,onSave})를 등록한다. X/Escape/backdrop 및 초안을 없애는 탭 이동은 같은 request로 보호한다. 탭 이동 후 초안이 유지되면 불필요한 경고는 추가하지 않는다. 외부 project/round/menu 이동은 runtime guard를 사용한다.
- 저장 실패 시 Drawer를 닫지 않는다. 편집 계속은 체크 유지, 변경 버리고 이동은 초안 폐기 후 이동, 저장 후 이동은 저장 성공 이후에만 수행한다.
- 기존 ProjectPermissionDialog가 남으면 동일 hook/table을 재사용하거나 중복 진입을 제거한다. 여러 멤버를 single set-grants 반복 호출로 저장하지 않는다.
- 기존 Dadam checkbox/button/ModalFrame 및 공통 간격을 사용한다. 새 스타일 라이브러리나 페이지별 색상·여백 상수는 추가하지 않는다.

## Acceptance Criteria
- [x] 5개 업무권한만 표시하고 PM/super는 편집불가 전체권한이다.
- [x] 사용자 여러명의 변경을 한 명령으로 저장하며 하나가 잘못되면 전부 유지된다.
- [x] 충돌·실패·배경갱신 시 체크 초안이 보존된다.
- [x] 닫기/메뉴이동/프로젝트전환은 미저장 변경을 보호한다.
- [x] 기본정보·알림·로그는 실제 저장된 것처럼 동작하지 않는다.

## Validation
- npm run typecheck
- npx eslint components/common/ProjectSettingsDrawer.tsx components/common/ProjectHeader.tsx hooks/workspace/use-project-permissions.ts lib/workspace/production/grant-drafts.ts types/workspace-header.ts components/workspace/toc
- git diff --check
- node --require tsx/cjs - stdin에서 createGrantDraft/changedGrantRows를 검증한다: 빈변경=[], 순서만다름=[], 2명변경=2행, 빈권한은명시해제행, 중복/없는멤버거부.
- 정적검토: mutateAsync 호출1회, 성공에만baseline갱신, error시초안유지, 모든닫기경로guard, PM/super행payload제외.

## Commit Message
~~~text
feat(workspace): 프로젝트 권한 초안과 원자적 저장 화면 연결

Plan: 2026-11-04-workspace-shared-header-files
Phase: P01-shared-workspace
Task: T07-project-permission-settings

- 조회용 기본정보와 권한 저장 화면
- 공통 조회 계약과 권한 검증 재사용
~~~

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 전체 T01~T10 최종 단일 커밋에 포함 (본 파일의 Git 이력 참조)


## Execution Result
- typecheck/lint/diff 및 grant draft 인라인 검증 통과. 두 명 변경/명시 해제/순서 정규화/중복·미등록 멤버 거부 확인. 단일 batch 저장·오류 초안 유지·닫기 guard 정적 검토.
- 사용자 요청으로 개별 커밋 보류. 전체 완료 후 단일 커밋.
